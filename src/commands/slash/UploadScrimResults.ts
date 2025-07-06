import type BaseClient from "#lib/BaseClient.js";
import Command from "#lib/structures/Command.js";
import { leerResultadosScrimExcel } from "#lib/utils/Tablas/ReadResultsFromExcel.js";
import type { ChatInputCommandInteraction } from "discord.js";

export default class extends Command {
  public constructor(client: BaseClient) {
    super(client, {
      name: "upload_scrim_results",
      description: "Upload scrim results from an Excel file",
      memberPermissions: ["Administrator"],
    });
  }

  public async execute(
    interaction: ChatInputCommandInteraction<"cached" | "raw">
  ) {
    const matchesCount = interaction.options.getString("matches_count", true);
    const playersPerTeam = interaction.options.getString(
      "players_per_team",
      true
    );
    const teamsQuantity = interaction.options.getString("teams", true);
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
      numPartidas: parseInt(matchesCount, 10),
      jugadoresPorEquipo: parseInt(playersPerTeam, 10),
      equipos: parseInt(teamsQuantity, 10),
    });

    await interaction.reply({
      content:
        "✅ Data from the scrim analyzed correctly:" +
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
}
