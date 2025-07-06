import type {
    ChatInputCommandInteraction,
    User as DiscordUser,
} from 'discord.js';
import type { Collection, OptionalId } from 'mongodb';
import type BaseClient from '#lib/BaseClient.js';
import { Database } from '#lib/Database.js';
import { Db as Configuration } from '#lib/Configuration.js';
import { randomBytes } from 'crypto';
import Command from '#lib/structures/Command.js';
import { EmbedBuilder } from '@discordjs/builders';

const db = await Database.getInstance(Configuration).connect();

export default class extends Command {
    protected admin: string = '1336144139397365831';
    protected collection: Collection<Organization>;

    public constructor(client: BaseClient) {
        super(client, {
            name: 'create-organization',
            description: 'Create a new organization with an admin',
            memberPermissions: ['Administrator']
        });
        this.collection = db.collection<Organization>('organizations');
    }

    public async execute(interaction: ChatInputCommandInteraction<'cached' | 'raw'>) {
        const isMainAdmin = interaction.user.id === this.admin;
        const name = interaction.options.getString('name', true);
        const adminUser = interaction.options.getUser('admin', true); 
        
        const adminId = adminUser.id;
        const creatorId = interaction.user.id;

        if (!isMainAdmin) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription('❌ **Error de permisos**\nSolo el admin principal puede crear organizaciones.')
                ],
                ephemeral: true
            });
        }

        try {
            const orgExists = await this.collection.findOne({ name });
            if (orgExists) {
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setDescription(`⚠️ La organización **${name}** ya existe.`)
                    .addFields([
                        { name: 'Administrador', value: `<@${orgExists.adminId}>`, inline: true },
                        { name: 'Creada por', value: `<@${orgExists.createdBy}>`, inline: true },
                        { name: 'Fecha', value: orgExists.createdAt.toLocaleDateString(), inline: true }
                    ]);

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const key = randomBytes(4).toString('hex').toUpperCase();

            const orgData: Organization = {
                name,
                adminId,
                key,
                createdAt: new Date(),
                createdBy: creatorId
            };

            await this.collection.insertOne(orgData as OptionalId<Organization>);

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Organización Creada')
                .setDescription(`La organización **${name}** ha sido registrada.`)
                .setColor(0x2ecc71)
                .addFields([
                    { name: 'Administrador', value: `<@${adminId}>`, inline: true },
                    { name: 'Creada por', value: `<@${creatorId}>`, inline: true },
                    { name: 'Llave de acceso', value: `\`${key}\``, inline: true }
                ])
                .setFooter({ text: 'Esta llave será necesaria para gestionar la organización' })
                .setTimestamp();

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`🔑 Llave de Acceso - ${name}`)
                    .setDescription(`Has sido asignado como administrador de **${name}**`)
                    .setColor(0x3498db)
                    .addFields([
                        { name: 'Tu Llave', value: `\`${key}\`` },
                        { name: 'Instrucciones', value: 'Usa esta llave con comandos como `/registrar-partida <key> ...`' },
                        { name: 'Creada por', value: `<@${creatorId}>` }
                    ])
                    .setFooter({ text: 'Guarda esta llave en un lugar seguro' })
                    .setTimestamp();

                await adminUser.send({
                    content: '🚀 Aquí tienes los detalles de tu nueva organización:',
                    embeds: [dmEmbed]
                });

                await interaction.reply({
                    embeds: [successEmbed],
                    content: `📨 Se ha enviado la información de acceso a <@${adminId}> por MD.`
                });

            } catch (dmError) {
                console.error('Error al enviar MD:', dmError);
                await interaction.reply({
                    content: `⚠️ No se pudo enviar el MD a <@${adminId}>.\n\n🔑 **Llave para ${name}**: \`${key}\``,
                    embeds: [successEmbed],
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Error al crear organización:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription('❌ Error inesperado al crear la organización. Intenta nuevamente.')
                ],
                ephemeral: true
            });
        }
    }
}