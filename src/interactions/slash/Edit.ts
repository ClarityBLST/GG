import {
  type APIApplicationCommand,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord-api-types/v10";

export default {
  name: "org",
  description: "Manage your organizations",
  type: ApplicationCommandType.ChatInput,
                  options: [
                {
                    name: "action",
                    description: "Action to perform",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        { name: "Add member", value: "add" },
                        { name: "Remove member", value: "remove" },
                        { name: "Transfer ownership", value: "transfer" },
                        { name: "Rename", value: "rename" },
                        { name: "View info", value: "info" }
                    ]
                },
                {
                    name: "user",
                    description: "User to add/remove/transfer",
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: "new_name",
                    description: "New organization name",
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]as APIApplicationCommandOption[],
  dm_permission: false,
} as APIApplicationCommand;