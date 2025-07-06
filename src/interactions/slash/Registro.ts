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
      name: "team_name",
      description: "Your team's name (3-20 characters)",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: false,
    },
    {
      name: "player_ids",
      description: "Comma-separated BloodStrike player IDs (e.g., 586016075134,587654321098)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
        name: "discord_players",
        description: "Discord mentions for team members (e.g., @Player1, @Player2)",
        type: ApplicationCommandOptionType.User || ApplicationCommandOptionType.Mentionable || ApplicationCommandOptionType.String,
        required: true,
        autocomplete: true,
    }
  ] as APIApplicationCommandOption[],
  dm_permission: false,
} as APIApplicationCommand;