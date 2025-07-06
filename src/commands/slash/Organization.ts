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
import { Config } from '#lib/Configuration.js';

const db = await Database.getInstance(Configuration).connect();

export default class extends Command {
    protected admin: string = '1336144139397365831';
    protected collection: Collection<Organization>;

    public constructor(client: BaseClient) {
        super(client, {
            name: 'organization',
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
                        .setDescription('❌ **Permission Error**\nOnly the main admin can create organizations.')
                ],
                ephemeral: true
            });
        }

        try {
            const orgExists = await this.collection.findOne({ name });
            if (orgExists) {
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setDescription(`⚠️ The organization **${name}** already exists.`)
                    .addFields([
                        { name: 'Admin', value: `<@${orgExists.adminId}>`, inline: true },
                        { name: 'Created by', value: `<@${orgExists.createdBy}>`, inline: true },
                        { name: 'Date', value: orgExists.createdAt.toLocaleDateString(), inline: true }
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
                .setTitle('✅ Organization Created')
                .setDescription(`The organization **${name}** has been registered.`)
                .setColor(0x2ecc71)
                .addFields([
                    { name: 'Admin', value: `<@${adminId}>`, inline: true },
                    { name: 'Created by', value: `<@${creatorId}>`, inline: true },
                    { name: 'Access Key', value: `\`${key}\``, inline: true }
                ])
                .setFooter({ text: 'This key will be needed to manage the organization' })
                .setTimestamp();

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`🔑 Access Key - ${name}`)
                    .setDescription(`You have been assigned as admin of **${name}**`)
                    .setColor(0x3498db)
                    .addFields([
                        { name: 'Your Key', value: `\`${key}\`` },
                        { name: 'Instructions', value: 'Use this key with commands like `/register-match <key> ...`' },
                        { name: 'Created by', value: `<@${creatorId}>` }
                    ])
                    .setFooter({ text: 'Keep this key in a safe place' })
                    .setTimestamp();

                await adminUser.send({
                    content: '🚀 Here are the details of your new organization:',
                    embeds: [dmEmbed]
                });

                await interaction.reply({
                    embeds: [successEmbed],
                    content: `📨 The access information has been sent to <@${adminId}> via DM.`
                });

                await this.sendLogToChannel(interaction, {
                    name,
                    adminId,
                    creatorId,
                    key
                });

            } catch (dmError) {
                console.error('Error sending DM:', dmError);
                await interaction.reply({
                    content: `⚠️ Could not send DM to <@${adminId}>.\n\n🔑 **Key for ${name}**: \`${key}\``,
                    embeds: [successEmbed],
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Error creating organization:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription('❌ Unexpected error while creating the organization. Please try again.')
                ],
                ephemeral: true
            });
        }
    }

    private async sendLogToChannel(
        interaction: ChatInputCommandInteraction,
        data: { name: string; adminId: string; creatorId: string; key: string }
    ) {
        try {
            const logChannelId = Config.LogsChannel;
            if (!logChannelId) return;

            const logChannel = await this.client.channels.fetch(logChannelId);
            if (!logChannel?.isTextBased()) return;

            if (
                logChannel.isTextBased() &&
                'send' in logChannel &&
                typeof logChannel.send === 'function'
            ) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📝 **New Organization Created**')
                    .setColor(0x00FF00)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields([
                        { name: '🏢 Organization', value: data.name },
                        { name: '👤 Created by', value: `<@${data.creatorId}> (\`${data.creatorId}\`)` },
                        { name: '🛡️ Admin', value: `<@${data.adminId}> (\`${data.adminId}\`)` },
                        { name: '🔑 Access Key', value: `\`${data.key}\`` },
                        { name: '📅 Date', value: new Date().toLocaleString() }
                    ])
                    .setFooter({ text: `Command ID: ${interaction.id}` })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Error sending logs:', error);
        }
    }
}