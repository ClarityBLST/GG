import {
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord-api-types/v10";

export default {
  name: "scrim",
  description: "Create a new Clarity scrim (Organization admins only)",
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
    },
    {
      name: "max_players_per_team",
      description: "Maximum players per team (default: 4, max: 6)",
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 1,
      max_value: 6,
    },
    {
      name: "matches_count",
      description: "Quantity of Matches to be played in the scrim",
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 1,
    },
  ] as APIApplicationCommandOption[],
  dm_permission: false,
} as APIApplicationCommand;
