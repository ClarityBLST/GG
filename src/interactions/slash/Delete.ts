
import {
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord-api-types/v10";

export default {
  name: "delete",
  description: "Delete a scrim",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "confirmation",
      description: `Type Confirmation to proceed`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "organization_only",
      description: "Only delete scrims from your organization",
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: "status_filter",
      description: "Only delete scrims with this status",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "Scheduled", value: "scheduled" },
        { name: "Registration", value: "registration" },
        { name: "Active", value: "active" },
        { name: "Completed", value: "completed" }
      ],
      autocomplete: true,
    },
  ] as APIApplicationCommandOption[],
  dm_permission: false,
} as APIApplicationCommand;
