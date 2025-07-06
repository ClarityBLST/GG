import { type ChatInputCommandInteraction, type GuildMember, type Role, ChannelType } from "discord.js";
import type { Collection } from "mongodb";
import type BaseClient from "#lib/BaseClient.js";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import Command from "#lib/structures/Command.js";
import { EmbedBuilder } from "@discordjs/builders";
import axios from "axios";
import { ObjectId } from "mongodb";

const db = await Database.getInstance(Configuration).connect();

export default class extends Command {
    protected collection: Collection<Scrim>;
    private readonly API_URL = "https://id-game-checker.p.rapidapi.com/blood-strike";
    private readonly API_HEADERS = {
        "x-rapidapi-key": "4cc97f841cmshecf607bd9286e73p1e8676jsna23184082bd9",
        "x-rapidapi-host": "id-game-checker.p.rapidapi.com"
    };

    public constructor(client: BaseClient) {
        super(client, {
            name: "register",
            description: "Register your team for the current BloodStrike scrim"
        });
        this.collection = db.collection<Scrim>("scrims");
    }

    public async execute(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
        if (!interaction.guild) {
            return this.replyError(interaction, "❌ This command must be used in a server");
        }

        await interaction.deferReply({ ephemeral: true }); 

        const teamName = interaction.options.getString("team_name", true);
        const playerIdsInput = interaction.options.getString("player_ids", true);
        const mentions = interaction.options.getUser("discord_players", true);

        if (teamName.length < 3 || teamName.length > 20) {
            return this.replyError(interaction, "Team name must be between 3-20 characters");
        }

        const playerIds = playerIdsInput.split(",").map(id => id.trim());
        if (playerIds.length < 1 || playerIds.length > 5) {
            return this.replyError(interaction, "Teams must have between 1-5 players");
        }

        let discordUserIds: string[] = [];
        if (Array.isArray(mentions)) {
            discordUserIds = mentions.map(m => (m as { id: string }).id);
        } else if (mentions && typeof (mentions as { id?: string }).id === "string") {
            discordUserIds = [(mentions as { id: string }).id];
        }
        
        if (discordUserIds.length !== playerIds.length) {
            return this.replyError(interaction, 
                "Number of Discord mentions must match number of player IDs");
        }

        try {
            const scrim = await this.collection.findOne({
            guildId: interaction.guild.id,
            status: "registration"
            });

            if (!scrim) {
            return this.replyError(interaction, 
                "No scrim is currently accepting registrations. Please check for upcoming scrims.");
            }

            if (scrim.teams.some(t => t.name.toLowerCase() === teamName.toLowerCase())) {
            return this.replyError(interaction, 
                "Team name already taken. Please choose another name");
            }

            if (scrim.teams.length >= scrim.maxTeams) {
            return this.replyError(interaction, 
                `This scrim is full (maximum ${scrim.maxTeams} teams reached)`);
            }

            const playersInfo = await this.validatePlayerIds(playerIds);
            if (!playersInfo) {
            return this.replyError(interaction, 
                "One or more player IDs are invalid. Please verify your BloodStrike IDs.");
            }

            const existingPlayer = scrim.teams.find(t => 
            t.players.some(p => playerIds.includes(p))
            );
            
            if (existingPlayer) {
            const existingPlayerInfo = existingPlayer.players.find(p => 
                playerIds.includes(p)
            );
            
            return this.replyError(interaction, 
                `Player ${existingPlayerInfo} is already registered with team ${existingPlayer.name}`);
            }

            const usedSlots = scrim.teams.map(t => t.slot);
            const nextSlot = this.findNextAvailableSlot(usedSlots, scrim.maxTeams);

            if (!nextSlot) {
            return this.replyError(interaction, 
                "No available slots. Please contact an admin");
            }

            const role = await interaction.guild.roles.create({
            name: `BS ${nextSlot}: ${teamName}`,
            color: "Random",
            hoist: true,
            mentionable: true,
            reason: `BloodStrike team role for ${teamName}`
            });

            const categoryName = "test";
            const category = interaction.guild.channels.cache.find(
                c => c.type === ChannelType.GuildCategory && c.name === categoryName
            );

            if (!category) {
                return this.replyError(interaction, `Not Found "${categoryName}" to create voice channel.`);
            }

            const voiceChannel = await interaction.guild.channels.create({
                name: `Team ${nextSlot} - ${teamName}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ["ViewChannel", "Connect"]
                    },
                    {
                        id: role.id,
                        allow: ["ViewChannel", "Connect", "Speak", "Stream"]
                    },
                    {
                        id: interaction.client.user?.id || "",
                        allow: ["ViewChannel", "Connect", "Speak", "Stream", "ManageChannels"]
                    }
                ]
            });

            for (const userId of discordUserIds) {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member) {
                await member.roles.add(role);
            }
            }

            const teamData = {
            slot: nextSlot,
            name: teamName,
            players: playerIds,
            roleId: role.id,
            voiceChannelId: voiceChannel.id,
            registeredAt: new Date(),
            registeredBy: interaction.user.id,
            stats: {
                kills: 0
            }
            };

            await this.collection.updateOne(
            { _id: scrim._id },
            { $push: { teams: teamData } }
            );

            this.scheduleCleanup(interaction.guild.id, scrim._id, teamData.slot, 4);

            const embed = new EmbedBuilder()
            .setTitle(`✅ Successfully Registered for ${scrim.name}`)
            .setDescription(`**${teamName}** is now registered in slot ${nextSlot}`)
            .setColor(0x00FF00)
            .addFields([
                { 
                name: "📅 Scrim Date", 
                value: scrim.date, 
                inline: true 
                },
                { 
                name: "🕒 Scrim Time", 
                value: `GMT: ${scrim.time}\n${Object.entries(scrim.fixedTimes)
                    .map(([region, time]) => `${region}: ${time}`)
                    .join("\n")}`,
                inline: true 
                },
                { 
                name: "👥 Players", 
                value: playersInfo.map(p => 
                    `${p.nickname !== `Player ${p.id}` ? p.nickname : p.id}`
                ).join("\n"), 
                inline: true 
                },
                { 
                name: "🔢 Your Slot", 
                value: nextSlot, 
                inline: true 
                },
                {
                name: "🔊 Voice Channel",
                value: voiceChannel.toString(),
                inline: true
                },
                {
                name: "🎽 Team Role",
                value: role.toString(),
                inline: true
                }
            ])
            .setFooter({ text: "The team role will be automatically removed after the scrim" })
            .setTimestamp();

            if (playersInfo.length === playerIds.length) {
            embed.spliceFields(1, 1, {
                name: "👥 Players",
                value: playersInfo.map(p => 
                `${p.nickname !== `Player ${p.id}` ? p.nickname : p.id}${p.nickname !== `Player ${p.id}` ? ` (ID: ${p.id})` : ""}`
                ).join("\n"),
                inline: true
            });
            }

            try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                content: `🎉 Team **${teamName}** registration successful!`,
                embeds: [embed]
                });
            } else {
                await interaction.editReply({ 
                content: `🎉 Team **${teamName}** registration successful!`,
                embeds: [embed] 
                });
            }
            } catch (err) {
            if ((err as any).code === 10062) {
                console.warn("Interaction expired before reply could be sent.");
                try {
                await interaction.user.send({
                    content: `🎉 Team **${teamName}** registration successful!`,
                    embeds: [embed]
                });
                } catch (dmError) {
                console.warn("Failed to send DM to user after interaction expired.", dmError);
                }
            } else if ((err as any).message?.includes("Invalid Form Body")) {
                await interaction.followUp({
                content: "There was an error displaying player nicknames. Please check your player IDs.",
                ephemeral: true
                });
            } else {
                throw err;
            }
            }

        } catch (error) {
            console.error("Error registering team:", error);
            return this.replyError(interaction, 
            "An error occurred while registering your team. Please try again.");
        }
    }

    private async validatePlayerIds(playerIds: string[]): Promise<PlayerInfo[] | null> {
        try {
            const playersInfo: PlayerInfo[] = [];
            
            for (const playerId of playerIds) {
                const response = await axios.get(`${this.API_URL}/${playerId}`, {
                    headers: this.API_HEADERS
                });
                
                if (response.status === 200 && response.data) {
                    playersInfo.push({
                        id: playerId,
                        nickname: response.data.username || `Player ${playerId}`,
                        avatar: response.data.avatar || ""
                    });
                } else {
                    return null;
                }
            }
            
            return playersInfo;
        } catch (error) {
            console.error("API validation error:", error);
            return null;
        }
    }

    private findNextAvailableSlot(usedSlots: string[], maxTeams: number): string | null {
        const allSlots = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        const availableSlots = allSlots.slice(0, maxTeams);
        return availableSlots.find(s => !usedSlots.includes(s)) || null;
    }

    private async scheduleCleanup(guildId: string, scrimId: ObjectId, slot: string, hours: number) {
        setTimeout(async () => {
            try {
                const guild = this.client.guilds.cache.get(guildId);
                if (!guild) return;

                const scrim = await this.collection.findOne({ _id: scrimId });
                if (!scrim) return;

                const team = scrim.teams.find(t => t.slot === slot);
                if (!team) return;

                if (team.voiceChannelId) {
                    const channel = guild.channels.cache.get(team.voiceChannelId);
                    if (channel) await channel.delete().catch(console.error);
                }

                if (team.roleId) {
                    const role = guild.roles.cache.get(team.roleId);
                    if (role) await role.delete().catch(console.error);
                }

                await this.collection.updateOne(
                    { _id: scrimId, "teams.slot": slot },
                    { 
                        $unset: { 
                            "teams.$.roleId": "",
                            "teams.$.voiceChannelId": "" 
                        } 
                    }
                );

            } catch (error) {
                console.error("Error during cleanup:", error);
            }
        }, hours * 60 * 60 * 1000);
    }

    private async replyError(
        interaction: ChatInputCommandInteraction, 
        message: string
    ) {
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription(`❌ ${message}`)
                ],
                ephemeral: true
            });
        } else {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription(`❌ ${message}`)
                ],
                ephemeral: true
            });
        }
    }
}