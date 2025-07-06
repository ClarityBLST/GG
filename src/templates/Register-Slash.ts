import {
  type APIApplicationCommand,
  ApplicationCommandType,
} from "discord-api-types/v10";

export default {
  name: "example-command",
  description: "example-command",
  type: ApplicationCommandType.ChatInput,
  dm_permission: true, // esto cambialo depende mucho si quieres que el comando se ejecute en dm o no
} as APIApplicationCommand; /*
    options: [
        {
            name: 'name', Esto ya es los parametros que le pases al comando ej, equipos, etc...
            description: '',
            type: ApplicationCommandOptionType.User || ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: 'admin',
            description: '',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ] as APIApplicationCommandOption[],
    dm_permission: false
*/
