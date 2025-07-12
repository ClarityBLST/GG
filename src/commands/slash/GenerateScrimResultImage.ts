import type BaseClient from "#lib/BaseClient.js";
import Command from "#lib/structures/Command.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type { AutocompleteInteraction } from "discord.js";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import type { Collection } from "mongodb";
import { ObjectId } from "mongodb";
import { loadImage } from "canvas";
import path from "path";
import { drawLeaderboardTable } from "#lib/utils/Tablas/drawLeaderboardTable.js";
import { leerResultadosScrimExcel } from "#lib/utils/Excel/ReadResultsFromExcel.js";
import { fileURLToPath } from "url";
import { calculateLeaderboard } from "#lib/utils/Tablas/calculateLeaderboard.js";

const db = await Database.getInstance(Configuration).connect();

export default class extends Command {
  protected scrimCollection: Collection<Scrim>;
  protected scrimPartialResultCollection: Collection<ScrimPartialResult>;

  public constructor(client: BaseClient) {
    super(client, {
      name: "scrim_result",
      description: "Generate a scrim result image",
      memberPermissions: ["Administrator"],
    });

    this.scrimCollection = db.collection<Scrim>("scrims");
    this.scrimPartialResultCollection =
      db.collection<ScrimPartialResult>("ScrimPartialResult");
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
    // #MARK: File analysis
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

    const teamsResultsData: ScrimPartialResult = {
      _id: new ObjectId(),
      scrimId: new ObjectId(scrim),
      teams: resultsJson,
    };

    // #MARK: Save the results to the database
    const findExisting = await this.scrimPartialResultCollection.findOne({
      scrimId: new ObjectId(scrim),
    });

    if (findExisting) {
      const { _id, scrimId: _, ...dataToSet } = teamsResultsData;

      await this.scrimPartialResultCollection.updateOne(
        { scrimId: new ObjectId(scrim) },
        { $set: dataToSet }
      );
    } else {
      await this.scrimPartialResultCollection.insertOne(teamsResultsData);
    }

    // #MARK: 🟥 Función: Generar la imagen del leaderboard

    const date: Date = new Date();
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    const dateString = `${day}/${month}/${year}`;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const rootPath = path.resolve(__dirname, "../../../src/"); // desde /dist o donde esté el .js compilado
    const imagePath = path.join(rootPath, "assets/ClarityScrimBackground.png");

    try {
      const calculatedResults = await calculateLeaderboard(resultsJson);
      const background = await loadImage(imagePath);

      const [
        leaderboardBuffer,
        // topPlayersBuffer
      ] = await Promise.all([
        drawLeaderboardTable(calculatedResults, dateString, background),
        //drawTopPlayers(clans, dateString, background),
      ]);

      await sendLeaderboardImages(
        interaction,
        leaderboardBuffer
        //topPlayersBuffer
      );
    } catch (error) {
      console.error("Error generating the leaderboard:", error);
      await interaction.reply("Hubo un error al generar el leaderboard.");
    }

    // #MARK:🟥 Función: Enviar imágenes al canal
    async function sendLeaderboardImages(
      interaction: ChatInputCommandInteraction,
      leaderboardBuffer: Buffer
      // topPlayersBuffer?: Buffer
    ): Promise<void> {
      await interaction.reply({
        content:
          "✅ Data from the scrim analyzed and saved correctly:" +
          `\n\n📊 Matches: ${matchesCount}` +
          `\n👥 Players per team: ${playersPerTeam}` +
          `\n🛡️ Teams: ${teamsQuantity}`,
        files: [
          {
            attachment: leaderboardBuffer,
            name: "leaderboard.png",
          },
          // Puedes habilitar esto si quieres enviar la imagen de top players también
          // {
          //   attachment: topPlayersBuffer,
          //   name: "top_players.png",
          // },
        ],
      });
    }
  }

  // #MARK: Autocomplete
  override async autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);
    const userId = interaction.user.id;

    if (focusedOption.name !== "scrim") return;

    // Buscar solo para el administrador de la organización
    /*
    const scrims = await this.scrimCollection
      .find({
        name: { $regex: focusedOption.value, $options: "i" },
        "organization.adminId": userId,
      })
      .limit(25)
      .toArray();
      */

    // Buscar scrims para admins y miembros de la organización
    const scrims = await this.scrimCollection
      .aggregate([
        {
          $match: {
            name: { $regex: focusedOption.value, $options: "i" },
          },
        },
        {
          $lookup: {
            from: "organizations", // nombre real de la colección
            localField: "organization.id",
            foreignField: "_id",
            as: "organizationData",
          },
        },
        {
          $unwind: "$organizationData",
        },
        {
          $match: {
            $or: [
              { "organizationData.adminId": userId },
              { "organizationData.members": userId }, // esto busca en el array de strings
            ],
          },
        },
        { $limit: 25 },
      ])
      .toArray();

    const choices = scrims.map((scrim) => ({
      name: scrim.name.slice(0, 100), // texto visible
      value: scrim._id.toString().slice(0, 100), // valor enviado al bot
    }));

    await interaction.respond(choices);
  }
}
