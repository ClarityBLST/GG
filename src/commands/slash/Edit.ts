import type { ChatInputCommandInteraction, User as DiscordUser } from "discord.js";
import type { Collection } from "mongodb";
import type BaseClient from "#lib/BaseClient.js";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import Command from "#lib/structures/Command.js";
import { EmbedBuilder } from "@discordjs/builders";
import { ApplicationCommandOptionType } from "discord.js";

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

        const action = interaction.options.getString("action", true);
        const user = interaction.options.getUser("user");
        const newName = interaction.options.getString("new_name");

        try {
            const organization = await this.collection.findOne({ 
                adminId: interaction.user.id 
            });

            if (!organization) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFFA500)
                            .setDescription("⚠️ You don't have an organization yet")
                    ]
                });
            }

            if (!organization.members) {
                organization.members = [];
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
                    return this.showOrganizationInfo(interaction, organization);
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
        organization: Organization
    ) {
        const members = organization.members || [];
        const membersList = members.length > 0 ? 
            members.map(id => `<@${id}>`).join(", ") : 
            "No members yet";

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`🏢 Organization: ${organization.name}`)
            .addFields([
                { name: "🛡️ Owner", value: `<@${organization.adminId}>`, inline: true },
                { name: "👥 Members", value: members.length.toString(), inline: true },
                { name: "📅 Created", value: organization.createdAt.toLocaleDateString(), inline: true },
                { name: "Member List", value: membersList, inline: false }
            ])
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