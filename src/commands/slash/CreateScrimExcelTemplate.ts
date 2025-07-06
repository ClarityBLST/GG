import type BaseClient from "#lib/BaseClient.js";
import Command from "#lib/structures/Command.js";
import type { ChatInputCommandInteraction } from "discord.js";

export default class extends Command {
  public constructor(client: BaseClient) {
    super(client, {
      name: "create_scrim_excel_template",
      description: "Create a template for scrim matches in Excel format.",
      memberPermissions: ["Administrator"],
    });
  }

  public execute(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    const matchesCount = interaction.options.getString("matches_count", true);
    const playersPerTeam = interaction.options.getString(
      "players_per_team",
      true
    );
    const teamsQuantity = interaction.options.getString("teams", true);

    return interaction.reply(
      "Matches Count: " +
        matchesCount +
        "\nPlayers Per Team: " +
        playersPerTeam +
        "\nTeams Quantity: " +
        teamsQuantity
    );
  }
}
