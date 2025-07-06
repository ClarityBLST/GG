import type BaseClient from "#lib/BaseClient.js";
import Command from "#lib/structures/Command.js";
import type { ChatInputCommandInteraction } from "discord.js";

export default class extends Command {
  public constructor(client: BaseClient) {
    super(client, {
      name: "example-command",
      description: "example",
      memberPermissions: ["Administrator"],
    });
  }

  public execute(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    const matchesCount = interaction.options.getString("Matches Count", true);
    const playersPerTeam = interaction.options.getUser(
      "Players Per Team",
      true
    );
    const teamsQuantity = interaction.options.getString("Teams", true);

    return interaction.reply("Command!");
  }
}
