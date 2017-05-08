import * as Discord from "discord.js";
import * as Events from "events";
import { Names } from "./Config/Names";
import { Objects } from "./Config/Objects";
import * as Process from "process";
import * as Util from "./Util";

const CONFIG_FILE: string = Process.env.npm_package_config_file;

export class Config extends Events implements Config.Interface, Config.Object {
	private _admins: Set<Config.UserId>;
	private _guilds: Map<Config.GuildId, Set<Config.ChannelId>>;
	private _names: Names;
	private _objects: Objects;
	private _secretsFile: string;
	private readonly cache: Partial<Config.Object>;
	private readonly hasChanged: Partial<Record<keyof Config.Object, boolean>>;

	public static async load(): Promise<Config> {
		const config: Config.Object = await Util.File.Read.json<Config.Object>(CONFIG_FILE);
		return new this(config);
	}

	constructor({ admins, guilds, secretsFile }: Config.Object) {
		super();
		[this._admins, this._secretsFile, this.cache, this.hasChanged] = [new Set<Config.UserId>(admins), secretsFile, {}, { admins: true, guilds: true }];
		this._guilds = Util.objectToMap<Config.GuildId, Array<Config.ChannelId>, Set<Config.ChannelId>>(guilds, (array: Array<Config.ChannelId>): Set<Config.ChannelId> => new Set<Config.ChannelId>(array));
		this.emit("ready", this);
	}

	public get admins(): Array<Config.UserId> { return this.getCache<Array<Config.UserId>>("admins", (): Array<Config.UserId> => Array.from(this._admins)); }

	public get guilds(): Config.GuildMap {
		return this.getCache<Config.GuildMap>("guilds", (): Config.GuildMap =>
			Util.mapToObject<Config.GuildId, Set<Config.ChannelId>, Array<Config.ChannelId>>(this._guilds, (set: Set<Config.ChannelId>): Array<Config.ChannelId> => Array.from(set)));
	}

	public get secretsFile(): string { return this._secretsFile; }
	
	public addAdmin(admin: Config.UserId): this {
		if (this._admins.size !== this._admins.add(admin).size) {
			this.hasChanged.admins = true;
			this.save();
			this.emit("adminAdded", admin);
		}
		return this;
	}

	public addChannel(guild: Config.GuildId, channel: Config.ChannelId): this {
		const channels: Set<Config.ChannelId> | undefined = this._guilds.get(guild);

		if (channels === undefined)
			return this.addGuild(guild, Array.of(channel));
		else if (channels.size !== channels.add(channel).size) {
			this.hasChanged.guilds = true;
			this.save();
			this.emit("channelAdded", guild, channel);
		}
		return this;
	}

	public addGuild(guild: Config.GuildId, channels?: Array<Config.ChannelId>): this {
		this.deleteGuild(guild);
		this._guilds.set(guild, new Set<Config.ChannelId>(channels));
		this.hasChanged.guilds = true;
		this.save();
		this.emit("guildAdded", guild, channels);
		return this;
	}

	public deleteAdmin(admin: Config.UserId): this {
		if (this._admins.delete(admin)) {
			this.hasChanged.admins = true;
			this.save();
			this.emit("adminDeleted", admin);
		}
		return this;
	}

	public deleteChannel(guild: Config.GuildId, channel: Config.ChannelId): this {
		const channels: Set<Config.ChannelId> | undefined = this._guilds.get(guild);

		if (channels !== undefined && channels.delete(channel)) {
			this.hasChanged.guilds = true;
			this.save();
			this.emit("channelDeleted", guild, channel);
		}
		return this;
	}

	public deleteGuild(guild: Config.GuildId): this {
		const channels: Set<Config.ChannelId> | undefined = this._guilds.get(guild);

		if (this._guilds.delete(guild)) {
			this.hasChanged.guilds = true;
			this.save();
			this.emit("guildDeleted", guild);
		}
		return this;
	}

	public emit(event: string | symbol, ...args: Array<any>): boolean {
		let result: boolean = super.emit(event, ...args);

		if (typeof event === "string" && (event.startsWith("admin") || event.startsWith("channel") || event.startsWith("guild")) && (event.endsWith("Added") || event.endsWith("Deleted"))) {
			const action: "added" | "deleted" = event.endsWith("Added") ? "added" : "deleted";

			switch (event) {
				case "adminAdded":
				case "adminDeleted":
					result = super.emit("adminsModified", action, ...args) || result;
					break;
				case "channelAdded":
				case "channelDeleted":
					result = super.emit("channelsModified", action, ...args) || result;
					args[1] = Array.of(args[1]);
				case "guildAdded":
				case "guildDeleted":
					result = super.emit("guildsModified", action, ...args) || result;

					if (!event.startsWith("channel") && args[1] !== undefined) {
						const channelEvent: "channelAdded" | "channelDeleted" = <"channelAdded" | "channelDeleted">("channel" + action.charAt(0).toUpperCase + action.slice(1));
						args[1].forEach((channel: Config.ChannelId): void => {
							result = super.emit(channelEvent, args[0], channel) || result;
							result = super.emit("channelsModified", args[0], channel) || result;
						});
					}
			}
		}
		return result;
	}

	private getCache<K extends Config.Object[keyof Config.Object]>(property: keyof Config.Object, generator: () => K): K {
		if (this.hasChanged[property]) {
			this.cache[property] = generator.call(this);
			this.hasChanged[property] = false;
		}
		return <K>this.cache[property];
	}

	public getNames(client: Discord.Client): Names {
		if (this._names !== undefined)
			return this._names;
		return this._names = new Names(this.getObjects(client));
	}

	public getObjects(client: Discord.Client): Objects {
		if (this._objects !== undefined)
			return this._objects;
		return this._objects = new Objects(this, client);
	}

	public hasAdmin(admin: Config.UserId): boolean { return this._admins.has(admin); }
	public hasChannel(guild: Config.GuildId, channel: Config.ChannelId): boolean { return this.hasGuild(guild) && this._guilds.get(guild)!.has(channel); }
	public hasGuild(guild: Config.GuildId): boolean { return this._guilds.has(guild); }

	private save(): this {
		Util.File.Write.json<Config.Object>(CONFIG_FILE, this).catch<void>((err: any): void | Promise<void> => { this.emit(err); });
		this.emit("saved");
		return this;
	}

	public toJSON(): Config.Object { return { admins: this.admins, guilds: this.guilds, secretsFile: this.secretsFile }; }
}

export namespace Config {
	export type ChannelId = Id;
	export type GuildId = Id;
	export type GuildMap = Util.GenericCollection<GuildId>;
	export type Id = Discord.Snowflake;
	export type UserId = Id;

	export interface Interface {
		on(event: "adminAdded", listener: (admin: UserId) => void): this;
		on(event: "adminDeleted", listener: (admin: UserId) => void): this;
		on(event: "adminsModified", listener: (admin: UserId, action: "added" | "deleted") => void): this;
		on(event: "channelAdded", listener: (guild: GuildId, channel: ChannelId) => void): this;
		on(event: "channelDeleted", listener: (guild: GuildId, channel: ChannelId) => void): this;
		on(event: "guildAdded", listener: (guild: GuildId, channels?: Array<ChannelId>) => void): this;
		on(event: "guildDeleted", listener: (guild: GuildId, channels?: Array<ChannelId>) => void): this;
		on(event: "guildsModified", listener: (guild: GuildId, action: "added" | "deleted", channels?: Array<ChannelId>) => void): this;
		on(event: "ready", listener: (config: Config) => void): this;
		on(event: "saved", listener: () => void): this;
	}

	export interface Object {
		admins: Array<UserId>;
		guilds: GuildMap;
		secretsFile: string;
	}
}

// import children into parent
import * as ConfigNames from "./Config/Names";
import * as ConfigObjects from "./Config/Objects";

export namespace Config {
	export import Names = ConfigNames.Names;
	export import Objects = ConfigObjects.Objects;
}