import type BaseClient from '#lib/BaseClient.js';
import Event from '#lib/structures/Event.js';
import { expireDate } from '#lib/utils/Services.js';
import { redBright, underline } from 'colorette';
import { ActivityType } from 'discord.js';

export default class extends Event {
	public constructor(client: BaseClient) {
		super(client, {
			name: 'ready',
			once: true
		});
	}

	public run() {
		setInterval(() => expireDate(), 30000);
		this.client.user.setPresence({
			activities: [{ name: `lxv`, type: ActivityType.Streaming, url: 'https://twitch.tv/xqc' }],
			status: 'idle'
		});

		console.log(`Logged in as ${redBright(underline(`${this.client.user.tag}`))}`);
		console.log(`Loaded ${this.client.commands.size} commands & ${this.client.events.size} events!`);
	}
}