import type BaseClient from "#lib/BaseClient.js";
import Command from "#lib/structures/Command.js";
import { leerResultadosScrimExcel } from "#lib/utils/Tablas/ReadResultsFromExcel.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type { AutocompleteInteraction } from "discord.js";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import type { Collection } from "mongodb";
import { ObjectId } from "mongodb";

const db = await Database.getInstance(Configuration).connect();

export default class extends Command {
  protected scrimCollection: Collection<Scrim>;
  protected scrimCollectionTeamsResult: Collection<ScrimTeamsResult>;

  public constructor(client: BaseClient) {
    super(client, {
      name: "upload_scrim_results",
      description: "Upload scrim results from an Excel file",
      memberPermissions: ["Administrator"],
    });

    this.scrimCollection = db.collection<Scrim>("scrims");
    this.scrimCollectionTeamsResult =
      db.collection<ScrimTeamsResult>("scrimTeamsResult");
  }

  public async execute(
    interaction: ChatInputCommandInteraction<"cached" | "raw">
  ) {
    const scrim = interaction.options.getString("scrim", true);

    if (!scrim) {
      return interaction.reply({
        content: "❌ You must select a scrim.",
        ephemeral: true,
      });
    }

    // Check if the scrim exists in the database
    console.log(`Scrim selected: ${scrim}`);

    if (!ObjectId.isValid(scrim)) {
      throw new Error("ID inválido");
    }

    const scrimData = await this.scrimCollection.findOne({
      _id: new ObjectId(scrim),
    });

    if (!scrimData) {
      return interaction.reply({
        content: "❌ The selected scrim does not exist.",
        ephemeral: true,
      });
    }

    const matchesCount = scrimData.matchesCount || 3; // Default value, can be changed later
    const playersPerTeam = scrimData.maxTeamSize || 4; // Default value, can be changed later
    const teamsQuantity = scrimData.maxTeams || 18; // Default value, can be changed later
    const fileAttachment = interaction.options.getAttachment("file", true); // ✅ asegúrate que es requerido

    if (
      !fileAttachment.contentType?.includes("spreadsheet") &&
      !fileAttachment.name.endsWith(".xlsx")
    ) {
      return interaction.reply({
        content: "❌ El archivo debe ser un Excel (.xlsx)",
        ephemeral: true,
      });
    }

    // ✅ Download the file as an ArrayBuffer
    const arrayBuffer = await fetch(fileAttachment.url).then((res) =>
      res.arrayBuffer()
    );

    const resultsJson = await leerResultadosScrimExcel({
      buffer: arrayBuffer,
      numPartidas: matchesCount,
      jugadoresPorEquipo: playersPerTeam,
      equipos: teamsQuantity,
    });

    const teamsResultsData: ScrimTeamsResult = {
      _id: new ObjectId(),
      scrimId: new ObjectId(scrim),
      teams: resultsJson,
    };

    // Save the results to the database
    const findExisting = await this.scrimCollectionTeamsResult.findOne({
      scrimId: new ObjectId(scrim),
    });

    if (findExisting) {
      await this.scrimCollectionTeamsResult.updateOne(
        { scrimId: new ObjectId(scrim) },
        { $set: teamsResultsData }
      );
    } else {
      await this.scrimCollectionTeamsResult.insertOne(teamsResultsData);
    }

    await interaction.reply({
      content:
        "✅ Data from the scrim analyzed and saved correctly:" +
        `\n\n📊 Matches: ${matchesCount}` +
        `\n👥 Players per team: ${playersPerTeam}` +
        `\n🛡️ Teams: ${teamsQuantity}`,
      files: [
        {
          attachment: Buffer.from(JSON.stringify(resultsJson, null, 2)),
          name: "results.json",
        },
      ],
    });
  }

  override async autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);
    const userId = interaction.user.id;

    if (focusedOption.name !== "scrim") return;

    const scrims = await this.scrimCollection
      .find({
        name: { $regex: focusedOption.value, $options: "i" },
        "organization.adminId": userId,
      })
      .limit(25)
      .toArray();

    const choices = scrims.map((scrim) => ({
      name: scrim.name.slice(0, 100), // texto visible
      value: scrim._id.toString().slice(0, 100), // valor enviado al bot
    }));

    await interaction.respond(choices);
  }
}
