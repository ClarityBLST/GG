import type BaseClient from "#lib/BaseClient.js";
import Command from "#lib/structures/Command.js";
import { generarPlantillaScrimExcel } from "#lib/utils/Tablas/GenerateExcelTemplate.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type { AutocompleteInteraction } from "discord.js";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import type { Collection } from "mongodb";
import { ObjectId } from "mongodb";

const db = await Database.getInstance(Configuration).connect();

export default class extends Command {
  protected scrimCollection: Collection<Scrim>;

  public constructor(client: BaseClient) {
    super(client, {
      name: "create_scrim_excel_template",
      description: "Create a template for scrim matches in Excel format.",
      memberPermissions: ["Administrator"],
    });

    this.scrimCollection = db.collection<Scrim>("scrims");
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

    const matchesCount = 3; // Default value, can be changed later
    const playersPerTeam = 4; // Default value, can be changed later
    const teamsQuantity = scrimData.maxTeams;

    const file = await generarPlantillaScrimExcel({
      numPartidas: matchesCount,
      jugadoresPorEquipo: playersPerTeam,
      equipos: teamsQuantity,
    });

    await interaction.reply({
      content:
        "✅ Here is your template for the scrim:" +
        `\n\n📊 Matches: ${matchesCount}` +
        `\n👥 Players per team: ${playersPerTeam}` +
        `\n🛡️ Teams: ${teamsQuantity}`,
      files: [{ attachment: file, name: "template.xlsx" }],
    });
  }

  override async autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name !== "scrim") return;

    const scrims = await this.scrimCollection
      .find({ name: { $regex: focusedOption.value, $options: "i" } })
      .limit(25)
      .toArray();

    const choices = scrims.map((scrim) => ({
      name: scrim.name.slice(0, 100), // texto visible
      value: scrim._id.toString().slice(0, 100), // valor enviado al bot
    }));

    await interaction.respond(choices);
  }
}
