import type { ChatInputCommandInteraction } from "discord.js";
import { ObjectId, type Collection, type OptionalId } from "mongodb";
import type BaseClient from "#lib/BaseClient.js";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import Command from "#lib/structures/Command.js";
import { EmbedBuilder } from "@discordjs/builders";
import { Config } from "#lib/Configuration.js";

const db = await Database.getInstance(Configuration).connect();

export default class extends Command {
  protected scrimCollection: Collection<Scrim>;
  protected orgCollection: Collection<Organization>;

  public constructor(client: BaseClient) {
    super(client, {
      name: "scrim",
      description: "Create a new Clarity scrim (Organization admins only)",
    });
    this.scrimCollection = db.collection<Scrim>("scrims");
    this.orgCollection = db.collection<Organization>("organizations");
  }

  public async execute(
    interaction: ChatInputCommandInteraction<"cached" | "raw">
  ) {
    if (!interaction.guild) {
      return this.replyError(
        interaction,
        "❌ This command must be used in a server"
      );
    }

    const organization = await this.orgCollection.findOne({
      $or: [
        { adminId: interaction.user.id },
        // { members: interaction.user.id }
      ],
    });

    if (!organization) {
      return this.replyError(
        interaction,
        "🚫 You must be part of an organization to create scrims\n" +
          "Please contact your organization admin to create one."
      );
    }

    if (organization.adminId !== interaction.user.id) {
      return this.replyError(
        interaction,
        `🔒 Only organization admins can create scrims\n` +
          `Current admin: <@${organization.adminId}>`
      );
    }

    const name = interaction.options.getString("name", true);
    const date = interaction.options.getString("date", true);
    const maxTeams = interaction.options.getInteger("max_teams") || 18;
    const playersPerTeam =
      interaction.options.getInteger("players_per_team") || 4;
    const matchesCount = interaction.options.getInteger("matches_count") || 3;

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      return this.replyError(
        interaction,
        "📅 Invalid date format. Please use DD/MM/YYYY"
      );
    }

    try {
      const existingScrim = await this.scrimCollection.findOne({
        "organization.id": organization._id,
        date,
        status: { $in: ["scheduled", "registration"] },
      });

      if (existingScrim) {
        return this.replyError(
          interaction,
          `⏳ Your organization already has a scrim on ${date}\n` +
            `**${existingScrim.name}** (Status: ${existingScrim.status})`
        );
      }

      const fixedTimes = {
        GMT: "02:00",
        BR_AR: "23:00",
        US_VE: "22:00",
        CO: "21:00",
        MX: "20:00",
      };

      const scrimData: Scrim = {
        name,
        date,
        status: "registration",
        organization: {
          id: organization._id,
          name: organization.name,
          adminId: organization.adminId,
        },
        fixedTimes,
        maxTeams,
        maxTeamSize: playersPerTeam,
        matchesCount,
        teams: [],
        createdAt: new Date(),
        createdBy: interaction.user.id,
        time: fixedTimes.GMT,
        guildId: interaction.guildId,
        regionalTimes: fixedTimes,
        _id: new ObjectId(),
      };

      const result = await this.scrimCollection.insertOne(scrimData);

      await this.orgCollection.updateOne(
        { _id: organization._id },
        { $inc: { scrimsCreated: 1 } }
      );

      const embed = new EmbedBuilder()
        .setTitle(`✅ Scrim Created - ${name}`)
        .setDescription(
          `**${organization.name}** has scheduled a new BloodStrike scrim`
        )
        .setColor(0x2ecc71)
        .addFields([
          { name: "📅 Date", value: date, inline: true },
          { name: "🔢 Max Teams", value: maxTeams.toString(), inline: true },
          {
            name: "🆔 Scrim ID",
            value: result.insertedId.toString(),
            inline: true,
          },
          {
            name: "⏰ Regional Times",
            value: [
              `🇧🇷🇦🇷 Brazil/Argentina: ${fixedTimes.BR_AR}`,
              `🇺🇸🇻🇪 US (ET)/Venezuela: ${fixedTimes.US_VE}`,
              `🇨🇴 Colombia: ${fixedTimes.CO}`,
              `🇲🇽 Mexico: ${fixedTimes.MX}`,
              `🌍 GMT: ${fixedTimes.GMT}`,
            ].join("\n"),
            inline: false,
          },
        ])
        .setFooter({
          text: "Use /open_registration when ready to accept teams",
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      await this.logToOrganizationChannel(interaction, scrimData);
    } catch (error) {
      console.error("Error creating scrim:", error);
      return this.replyError(
        interaction,
        "❌ An unexpected error occurred. Please try again later."
      );
    }
  }

  private async logToOrganizationChannel(
    interaction: ChatInputCommandInteraction,
    scrim: Scrim
  ) {
    try {
      const orgChannelId = Config.LogsChannel;
      const channel = await interaction.guild?.channels.fetch(orgChannelId);

      if (channel && channel.type === 0) {
        const logEmbed = new EmbedBuilder()
          .setTitle("📝 New Scrim Scheduled")
          .setColor(0x3498db)
          .setDescription(
            `**${scrim.name}** created by <@${interaction.user.id}>`
          )
          .addFields([
            { name: "Date", value: scrim.date, inline: true },
            {
              name: "Max Teams",
              value: scrim.maxTeams.toString(),
              inline: true,
            },
          ])
          .setTimestamp();

        await (channel as any).send({
          content: `@everyone New scrim scheduled!`,
          embeds: [logEmbed],
        });
      }
    } catch (error) {
      console.error("Error logging to org channel:", error);
    }
  }

  private async replyError(
    interaction: ChatInputCommandInteraction,
    message: string
  ) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(message)],
      ephemeral: true,
    });
  }
}
