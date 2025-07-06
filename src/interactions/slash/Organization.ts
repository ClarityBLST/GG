import {
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord-api-types/v10";

export default {
  name: "organization",
  description: "Create a new organization with an admin",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "name",
      description: "Organization Name.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "admin",
      description: "Organization admin.",
      type:
        ApplicationCommandOptionType.User ||
        ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ] as APIApplicationCommandOption[],
  dm_permission: false,
} as APIApplicationCommand;
