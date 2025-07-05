import type { PermissionsString } from 'discord.js';
import pkg from '../../package.json' assert { type: 'json' };

export const Client = {
	token: process.env.DISCORD_TOKEN as string,
	version: (process.env.CLIENT_VERSION ??= pkg.version),
	owners: process.env.CLIENT_OWNERS?.split(',').filter((item) => item.length) as string[],
	debug: process.env.DEBUG_MODE === 'true',
	defaultPermissions: ['SendMessages', 'ViewChannel'] as PermissionsString[]
};

export const Db = {
	url: process.env.DATABASE_URL as string,
	name: process.env.DATABASE_NAME as string
};

export const Config = {
	Devs: '@Diferent | @CrisKop' as string
};