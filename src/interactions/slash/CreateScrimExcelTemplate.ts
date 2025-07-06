import {
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord-api-types/v10";

export default {
  name: "CreateScrimExcelTemplate",
  description: "Create a template for scrim matches in Excel format.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "Matches Count",
      description: "Quantity of matches to play in the scrim.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "Players Per Team",
      description: "Number of players per team in the scrim.",
      type:
        ApplicationCommandOptionType.User ||
        ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: "Teams",
      description: "Number of teams in the scrim.",
      type:
        ApplicationCommandOptionType.User ||
        ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ] as APIApplicationCommandOption[],
  dm_permission: false,
} as APIApplicationCommand;
