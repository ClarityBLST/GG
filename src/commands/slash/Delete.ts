import type { ChatInputCommandInteraction } from "discord.js";
import type { Collection } from "mongodb";
import type BaseClient from "#lib/BaseClient.js";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import Command from "#lib/structures/Command.js";
import { EmbedBuilder } from "@discordjs/builders";

const db = await Database.getInstance(Configuration).connect();

export default class extends Command {
    protected scrimCollection: Collection<Scrim>;
    protected orgCollection: Collection<Organization>;
    private readonly REQUIRED_CONFIRMATION = "DELETE_ALL";
    private readonly admins = [
        "1336144139397365831",
        "791715638254108693" 
    ];

    public constructor(client: BaseClient) {
        super(client, {
            name: "nuke_scrims",
            description: "[ADMIN] Completely remove all scrims data",
        });
        this.scrimCollection = db.collection<Scrim>("scrims");
        this.orgCollection = db.collection<Organization>("organizations");
    }

    public async execute(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
        const isSuperAdmin = this.admins.includes(interaction.user.id);
        const organization = await this.orgCollection.findOne({ 
            adminId: interaction.user.id 
        });

        if (!isSuperAdmin && !organization) {
            return this.replyError(interaction,
                "❌ You must be either:\n" +
                "- Registered superadmin\n" +
                "- Organization administrator");
        }

        const confirmation = interaction.options.getString("confirmation", true);
        const organizationOnly = interaction.options.getBoolean("organization_only") || false;
        const statusFilter = interaction.options.getString("status_filter");

        if (confirmation !== this.REQUIRED_CONFIRMATION) {
            return this.replyError(interaction,
                `⚠️ Safety lock: Type ${this.REQUIRED_CONFIRMATION} in all caps to proceed`);
        }

        try {
            let filter: any = {};

            if (organizationOnly && organization) {
                filter["organization.id"] = organization._id;
            }

            if (statusFilter) {
                filter.status = statusFilter;
            }

            const scrimCount = await this.scrimCollection.countDocuments(filter);
            const sampleScrims = await this.scrimCollection.find(filter)
                .sort({ createdAt: -1 })
                .limit(3)
                .toArray();

            if (scrimCount === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFFA500)
                            .setDescription("🔍 No scrims found matching your filters")
                    ],
                    ephemeral: true
                });
            }

            const result = await this.scrimCollection.deleteMany(filter);

            const embed = new EmbedBuilder()
                .setTitle("💥 Scrim Nuclear Option")
                .setColor(0xE74C3C)
                .setDescription(`Deleted ${result.deletedCount} scrims`)
                .addFields([
                    {
                        name: "Scope",
                        value: organizationOnly ? 
                            `Organization: ${organization?.name || "N/A"}` : 
                            "ALL ORGANIZATIONS",
                        inline: true
                    },
                    {
                        name: "Status Filter",
                        value: statusFilter || "None",
                        inline: true
                    },
                    {
                        name: "Sample Deleted",
                        value: sampleScrims.length > 0 ?
                            sampleScrims.map(s => `• ${s.name} (${s.status})`).join("\n") :
                            "No samples",
                        inline: false
                    }
                ])
                .setFooter({ text: `Executed by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            await this.logDestruction(interaction, {
                count: result.deletedCount,
                organizationOnly,
                statusFilter: statusFilter ?? "",
                sampleScrims
            });

        } catch (error) {
            console.error("[NUKE ERROR]", error);
            return this.replyError(interaction,
                "💢 Critical error during scrim deletion. Operation aborted.");
        }
    }

    private async logDestruction(
        interaction: ChatInputCommandInteraction,
        data: {
            count: number;
            organizationOnly: boolean;
            statusFilter?: string;
            sampleScrims: Scrim[];
        }
    ) {
        try {
            const logChannel = await interaction.guild?.channels.fetch("YOUR_LOG_CHANNEL_ID");
            if (!logChannel?.isTextBased()) return;

            const logEmbed = new EmbedBuilder()
                .setTitle("🚨 Scrim Nuclear Option Used")
                .setColor(0xFF0000)
                .setDescription(`${data.count} scrims obliterated`)
                .addFields([
                    {
                        name: "Executor",
                        value: `${interaction.user.tag} (${interaction.user.id})`,
                        inline: false
                    },
                    {
                        name: "Parameters",
                        value: [
                            `Organization Only: ${data.organizationOnly}`,
                            `Status Filter: ${data.statusFilter || "None"}`
                        ].join("\n"),
                        inline: true
                    },
                    {
                        name: "Sample Affected",
                        value: data.sampleScrims.length > 0 ?
                            data.sampleScrims.map(s => `• ${s.name} (${new Date(s.createdAt).toLocaleDateString()})`).join("\n") :
                            "No samples",
                        inline: true
                    }
                ])
                .setTimestamp();

            await logChannel.send({ 
                content: "@here", 
                embeds: [logEmbed] 
            });
        } catch (error) {
            console.error("Failed to log destruction:", error);
        }
    }

    private async replyError(
        interaction: ChatInputCommandInteraction, 
        message: string
    ) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription(message)
            ],
            ephemeral: true
        });
    }
}