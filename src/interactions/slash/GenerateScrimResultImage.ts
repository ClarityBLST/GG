import {
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord-api-types/v10";

export default {
  name: "scrim_result",
  description: "Generate a scrim result image",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "scrim",
      description: "Choose a scrim",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true, // <- ¡clave!
    },
    {
      name: "file",
      description: "Excel file with the scrim data.",
      type: ApplicationCommandOptionType.Attachment,
      required: true,
    },
  ],
  dm_permission: false,
} as APIApplicationCommand;
