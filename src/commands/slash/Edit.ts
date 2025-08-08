import type { ChatInputCommandInteraction, User as DiscordUser, AutocompleteInteraction } from "discord.js";
import type { Collection } from "mongodb";
import type BaseClient from "#lib/BaseClient.js";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import Command from "#lib/structures/Command.js";
import { EmbedBuilder } from "@discordjs/builders";
import { ApplicationCommandOptionType } from "discord.js";
import { ObjectId } from "mongodb";

const db = await Database.getInstance(Configuration).connect();

export default class extends Command {
    protected collection: Collection<Organization>;

    public constructor(client: BaseClient) {
        super(client, {
            name: "org",
            description: "Manage your personal organization"
        });
        this.collection = db.collection<Organization>("organizations");
    }

    public async execute(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
        await interaction.deferReply({ ephemeral: true });

        const organizationId = interaction.options.getString("organization", true);
        const action = interaction.options.getString("action", true);
        const user = interaction.options.getUser("user");
        const newName = interaction.options.getString("new_name");

        try {
            // Buscar la organización donde el usuario sea admin o miembro
            const organization = await this.collection.findOne({ 
                _id: new ObjectId(organizationId),
                $or: [
                    { adminId: interaction.user.id },
                    { members: interaction.user.id }
                ]
            });

            if (!organization) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFFA500)
                            .setDescription("⚠️ You don't have access to this organization or it doesn't exist")
                    ]
                });
            }

            if (!organization.members) {
                organization.members = [];
            }

            // Verificar si el usuario es admin o miembro
            const isAdmin = organization.adminId === interaction.user.id;
            const isMember = organization.members.includes(interaction.user.id);

            // Solo permitir "info" para miembros, todas las acciones para admins
            if (!isAdmin && action !== "info") {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setDescription("🔒 Only organization admins can perform this action\n" +
                                          "Members can only view organization info")
                    ]
                });
            }

            switch (action) {
                case "add":
                    if (!user) return this.replyMissingUser(interaction);
                    return this.handleAddMember(interaction, organization, user);
                case "remove":
                    if (!user) return this.replyMissingUser(interaction);
                    return this.handleRemoveMember(interaction, organization, user);
                case "transfer":
                    if (!user) return this.replyMissingUser(interaction);
                    return this.handleTransferOwnership(interaction, organization, user);
                case "rename":
                    if (!newName) return this.replyMissingNewName(interaction);
                    return this.handleRename(interaction, organization, newName);
                case "info":
                    return this.showOrganizationInfo(interaction, organization, isAdmin);
                default:
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setDescription("❌ Invalid action selected")
                        ]
                    });
            }
        } catch (error) {
            console.error("Error managing organization:", error);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription("❌ An error occurred while managing your organization")
                ]
            });
        }
    }

    // #MARK: Autocomplete
    override async autocomplete(interaction: AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);
        const userId = interaction.user.id;

        if (focusedOption.name === "organization") {
            try {
                // Buscar todas las organizaciones donde el usuario sea admin o miembro
                const organizations = await this.collection
                    .find({
                        $or: [
                            { adminId: userId },
                            { members: userId }
                        ]
                    })
                    .limit(25)
                    .toArray();

                // Filtrar por el texto que está escribiendo el usuario
                const filtered = organizations.filter(org => 
                    org.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                );

                // Crear las opciones para el autocompletado
                const choices = filtered.map(org => ({
                    name: `${org.name} ${org.adminId === userId ? '(Admin)' : '(Member)'}`,
                    value: org._id.toString()
                }));

                await interaction.respond(choices.slice(0, 25));
            } catch (error) {
                console.error("Error in organization autocomplete:", error);
                await interaction.respond([]);
            }
        }
    }

    private async handleAddMember(
        interaction: ChatInputCommandInteraction,
        organization: Organization,
        user: DiscordUser
    ) {
        if (user.id === organization.adminId) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setDescription("⚠️ You can't add yourself as you're already the owner")
                ]
            });
        }

        if (organization.members.includes(user.id)) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setDescription(`⚠️ <@${user.id}> is already a member`)
                ]
            });
        }

        await this.collection.updateOne(
            { _id: organization._id },
            { $push: { members: user.id } }
        );

        const currentMembers = organization.members || [];
        const newMemberCount = currentMembers.length + 1;

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("✅ Member Added")
            .setDescription(`<@${user.id}> has been added to your organization`)
            .addFields([
                { name: "Organization", value: organization.name, inline: true },
                { name: "Total Members", value: newMemberCount.toString(), inline: true }
            ])
            .setTimestamp();

        try {
            await user.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x3498DB)
                        .setTitle(`📢 You've been added to ${organization.name}`)
                        .setDescription(`You now have access to organization features.`)
                        .addFields([
                            { name: "Admin/Owner", value: `<@${organization.adminId}>`, inline: true }
                        ])
                        .setTimestamp()
                ]
            });
        } catch (dmError) {
            console.log("Could not send DM to user:", dmError);
            embed.addFields([{ name: "Note", value: "Could not notify user via DM", inline: false }]);
        }

        return interaction.editReply({ embeds: [embed] });
    }

    private async handleRemoveMember(
        interaction: ChatInputCommandInteraction,
        organization: Organization,
        user: DiscordUser
    ) {
        if (!organization.members || !organization.members.includes(user.id)) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setDescription(`⚠️ <@${user.id}> is not a member`)
                ]
            });
        }

        await this.collection.updateOne(
            { _id: organization._id },
            { $pull: { members: user.id } }
        );

        const currentMembers = organization.members || [];
        const newMemberCount = Math.max(currentMembers.length - 1, 0);

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("✅ Member Removed")
            .setDescription(`<@${user.id}> has been removed from your organization`)
            .addFields([
                { name: "Organization", value: organization.name, inline: true },
                { name: "Total Members", value: newMemberCount.toString(), inline: true }
            ])
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    private async handleTransferOwnership(
        interaction: ChatInputCommandInteraction,
        organization: Organization,
        newAdmin: DiscordUser
    ) {
        if (newAdmin.id === interaction.user.id) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setDescription("⚠️ You already own this organization")
                ]
            });
        }

        const currentMembers = organization.members || [];

        await this.collection.updateOne(
            { _id: organization._id },
            { 
                $set: { adminId: newAdmin.id },
                $pull: { members: newAdmin.id }
            }
        );

        const wasMember = currentMembers.includes(newAdmin.id);

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("✅ Ownership Transferred")
            .setDescription(`You've transferred ownership to <@${newAdmin.id}>`)
            .addFields([
                { name: "New Owner", value: `<@${newAdmin.id}>`, inline: true },
                { name: "Previous Role", value: wasMember ? "Member" : "Not a member", inline: true }
            ])
            .setTimestamp();

        try {
            await newAdmin.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x3498DB)
                        .setTitle(`🛡️ You are now the owner of ${organization.name}`)
                        .setDescription(`You have received ownership of this organization.`)
                        .addFields([
                            { name: "Previous Owner", value: `<@${interaction.user.id}>`, inline: true }
                        ])
                        .setTimestamp()
                ]
            });
        } catch (dmError) {
            console.log("Could not send DM to new owner:", dmError);
            embed.addFields([{ 
                name: "Important", 
                value: `Please inform <@${newAdmin.id}> manually.`,
                inline: false 
            }]);
        }

        return interaction.editReply({ embeds: [embed] });
    }

    private async handleRename(
        interaction: ChatInputCommandInteraction,
        organization: Organization,
        newName: string
    ) {
        if (newName.length < 3 || newName.length > 32) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription("❌ Name must be 3-32 characters")
                ]
            });
        }

        const nameExists = await this.collection.findOne({ name: newName });
        if (nameExists) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription(`❌ Name "${newName}" is already taken`)
                ]
            });
        }

        const oldName = organization.name;
        await this.collection.updateOne(
            { _id: organization._id },
            { $set: { name: newName } }
        );

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("✅ Organization Renamed")
            .addFields([
                { name: "Old Name", value: oldName, inline: true },
                { name: "New Name", value: newName, inline: true }
            ])
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    private async showOrganizationInfo(
        interaction: ChatInputCommandInteraction,
        organization: Organization,
        isAdmin: boolean
    ) {
        const members = organization.members || [];
        
        // Crear lista de miembros con roles
        let membersList = "";
        
        // Agregar el admin primero
        membersList += `👑 <@${organization.adminId}> (Admin)\n`;
        
        // Agregar los miembros
        if (members.length > 0) {
            members.forEach(memberId => {
                membersList += `👤 <@${memberId}> (Member)\n`;
            });
        } else {
            membersList += "No members yet";
        }

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`🏢 Organization: ${organization.name}`)
            .addFields([
                { name: "👑 Owner/Admin", value: `<@${organization.adminId}>`, inline: true },
                { name: "👥 Total Members", value: members.length.toString(), inline: true },
                { name: "📅 Created", value: organization.createdAt.toLocaleDateString(), inline: true },
                { name: "📋 Member List", value: membersList, inline: false }
            ])
            .setFooter({ 
                text: isAdmin ? "You are the admin of this organization" : "You are a member of this organization"
            })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    private replyMissingUser(interaction: ChatInputCommandInteraction) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription("❌ Please specify a user")
            ]
        });
    }

    private replyMissingNewName(interaction: ChatInputCommandInteraction) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription("❌ Please specify a new name")
            ]
        });
    }
}