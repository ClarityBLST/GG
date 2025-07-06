import {
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord-api-types/v10";

export default {
  name: "create_scrim_excel_template",
  description: "Create a template for scrim matches in Excel format.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "matches_count",
      description: "Quantity of matches to play in the scrim.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "players_per_team",
      description: "Number of players per team in the scrim.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "teams",
      description: "Number of teams in the scrim.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  dm_permission: false,
} as APIApplicationCommand;
