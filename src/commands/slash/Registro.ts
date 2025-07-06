import type { ChatInputCommandInteraction } from "discord.js";
import type { Collection } from "mongodb";
import type BaseClient from "#lib/BaseClient.js";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import Command from "#lib/structures/Command.js";
import { EmbedBuilder } from "@discordjs/builders";
import axios from "axios";

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
            description: "Register your team for the current BloodStrike scrim using player IDs",
        });
        this.collection = db.collection<Scrim>("scrims");
    }

    public async execute(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
        if (!interaction.guild) {
            return this.replyError(interaction, "❌ This command must be used in a server");
        }

        const teamName = interaction.options.getString("team_name", true);
        const playerIdsInput = interaction.options.getString("player_ids", true);

        if (teamName.length < 3 || teamName.length > 20) {
            return this.replyError(interaction, "Team name must be between 3-20 characters");
        }

        const playerIds = playerIdsInput.split(",").map(id => id.trim());
        
        if (playerIds.length < 1 || playerIds.length > 5) {
            return this.replyError(interaction, "Teams must have between 1-5 players");
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

            const teamData = {
                slot: nextSlot,
                name: teamName,
                players: playerIds,
                roleId: role.id,
                registeredAt: new Date(),
                registeredBy: interaction.user.id
            };

            await this.collection.updateOne(
                { _id: scrim._id },
                { $push: { teams: teamData } }
            );


            const embed = new EmbedBuilder()
                .setTitle(`✅ Successfully Registered for ${scrim.name}`)
                .setDescription(`**${teamName}** is now registered in slot ${nextSlot}`)
                .setColor(0x00FF00)
                .addFields([
                    { 
                        name: "📅 Scrim Date", 
                        value: `${scrim.date} at ${scrim.time} GMT`, 
                        inline: true 
                    },
                    { 
                        name: "👥 Players", 
                        value: playersInfo.map(p => `${p.nickname} (ID: ${p.id})`).join("\n"), 
                        inline: true 
                    },
                    { 
                        name: "🔢 Your Slot", 
                        value: nextSlot, 
                        inline: true 
                    },
                    {
                        name: "🌍 Regional Times",
                        value: this.getRegionalTimes(scrim.time),
                        inline: false
                    }
                ])
                .setFooter({ text: "The team role will be automatically removed after the scrim" })
                .setTimestamp();

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ 
                        content: `🎉 Team **${teamName}** registration successful!`,
                        embeds: [embed] 
                    });
                } else {
                    await interaction.reply({ 
                        content: `🎉 Team **${teamName}** registration successful!`,
                        embeds: [embed] 
                    });
                }
            } catch (err) {
                if ((err as any).code === 10062) {
                    console.warn("Interaction expired before reply could be sent.");
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
                        nickname: response.data.nickname || `Player ${playerId}`,
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

    private getRegionalTimes(gmtTime: string): string {
        const [hoursRaw, minutesRaw] = gmtTime.split(":");
        const hours = Number(hoursRaw);
        const minutes = Number(minutesRaw);
        const safeMinutes = isNaN(minutes) ? 0 : minutes;
        return [
            `🇧🇷 Brazil: ${(hours + 3) % 24}:${safeMinutes.toString().padStart(2, '0')}`,
            `🇦🇷 Argentina: ${(hours + 3) % 24}:${safeMinutes.toString().padStart(2, '0')}`,
            `🇺🇸 US (ET): ${(hours - 5 + 24) % 24}:${safeMinutes.toString().padStart(2, '0')}`,
            `🇻🇪 Venezuela: ${(hours - 4 + 24) % 24}:${safeMinutes.toString().padStart(2, '0')}`,
            `🇨🇴 Colombia: ${(hours - 5 + 24) % 24}:${safeMinutes.toString().padStart(2, '0')}`,
            `🇲🇽 Mexico: ${(hours - 6 + 24) % 24}:${safeMinutes.toString().padStart(2, '0')}`
        ].join("\n");
    }

    private async replyError(
        interaction: ChatInputCommandInteraction, 
        message: string
    ) {
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