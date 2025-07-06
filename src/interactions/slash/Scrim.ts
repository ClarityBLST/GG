import {
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord-api-types/v10";

export default {
  name: "register",
  description: "Register your team for the current BloodStrike scrim",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "name",
      description: "Scrim name/title (e.g., 'Tournament Weekly')",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: "date",
      description: "Scrim date (DD/MM/YYYY)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
        name: "max_teams",
        description: "Maximum teams (default: 18, max: 26)",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 1,
        max_value: 26,
    }
  ] as APIApplicationCommandOption[],
  dm_permission: false,
} as APIApplicationCommand;