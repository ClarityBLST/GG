import type BaseClient from "#lib/BaseClient.js";
import type { PermissionsString } from "discord.js";
import type { EventEmitter } from "node:events";
import { ObjectId } from "mongodb";

declare global {
  interface DatabaseOptions {
    url: Readonly<string>;
    name: Readonly<string>;
  }

  interface ClientOptions {
    token: any;
    version: string;
    owners: string[];
    debug: boolean;
    defaultPermissions: PermissionsString[];
  }

  interface CommandOptions {
    name: string;
    description?: string;
    memberPermissions?: PermissionsString[];
    clientPermissions?: PermissionsString[];
    disabled?: boolean;
    context?: boolean;
    guildOnly?: boolean;
    ownerOnly?: boolean;
  }

  interface EventOptions {
    name: string;
    once?: boolean;
    emitter?: keyof BaseClient | EventEmitter;
  }

  interface IUser {
    id: string;
    username: string;
    isAdmin: boolean;
  }

  interface Organization {
    _id: ObjectId;
    name: string;
    adminId: string;
    key: string;
    members: string[];
    scrimsCreated: number;
    createdAt: Date;
    createdBy: string;
  }

  interface ReadScrimOptions {
    numPartidas: number;
    jugadoresPorEquipo: number;
    equipos?: number;
  }

  interface PlayerInfo {
    id: string;
    nickname: string;
    avatar: string;
  }

  interface Scrim {
    _id: ObjectId;
    name: string;
    date: string; // DD/MM/YYYY
    time: string; // HH:MM (GMT)
    status: "scheduled" | "registration" | "active" | "completed";
    maxTeams: number;
    organization: {
        id: ObjectId;
        name: string;
        adminId: string;
    };
    fixedTimes: {
        GMT: string;
        BR_AR: string;
        US_VE: string;
        CO: string;
        MX: string;
    };
teams: {
      slot: string; // A-Z
      name: string;
      players: string[];
      roleId?: string;
      voiceChannelId?: string;
      registeredAt: Date;
      registeredBy: string;
      stats?: {
        kills: number;
        position?: number;
        banned?: boolean;
      };
    }[];
    createdAt: Date;
    createdBy: string;
    guildId: string;
    regionalTimes: Record<string, string>;
    results?: {
      completedAt: Date;
      topTeams: string[];
      totalKills: number;
    };
  }
}
