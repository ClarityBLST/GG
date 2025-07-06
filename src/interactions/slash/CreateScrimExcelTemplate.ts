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
      name: "scrim",
      description: "Choose a scrim",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true, // <- ¡clave!
    },
  ],
  dm_permission: false,
} as APIApplicationCommand;
