import * as Discord from "discord.js";
import * as Events from "events";
import * as Process from "process";
import * as Util from "./Util";

const CONFIG_FILE: string = Process.env.npm_package_config_file;

class DebugEmitter extends Events {
	public emit(event: string | symbol, ...args: Array<any>): boolean {
		console.log(`DebugEmitter: event "${event}" emitted with args:\n${JSON.stringify(args)}`);
		return super.emit(event, ...args);
	}
}

export class Config extends DebugEmitter implements Config.Interface, Config.Object {
	private _admins: Set<Discord.Snowflake>;
	private _guilds: Map<Discord.Snowflake, Set<Discord.Snowflake>>;
	private _secretsFile: string;
	private readonly cache: Partial<Config.Object>;
	private readonly hasChanged: Partial<Record<keyof Config.Object, boolean>>;

	public static async load(): Promise<Config> {
		const config: Config.Object = await Util.File.Read.json<Config.Object>(CONFIG_FILE);
		return new this(config);
	}

	constructor({ admins, guilds, secretsFile }: Config.Object) {
		super();
		[this._admins, this._secretsFile, this.cache, this.hasChanged] = [new Set<Discord.Snowflake>(admins), secretsFile, {}, { admins: true, guilds: true }];
		this._guilds = Util.objectToMap<Discord.Snowflake, Array<Discord.Snowflake>, Set<Discord.Snowflake>>(guilds, (array: Array<Discord.Snowflake>): Set<Discord.Snowflake> => new Set<Discord.Snowflake>(array));
		this.emit("ready", this);
	}

	public get admins(): Array<Discord.Snowflake> { return this.getCache<Array<Discord.Snowflake>>("admins", (): Array<Discord.Snowflake> => Array.from(this._admins)); }

	public get guilds(): Config.GuildMap {
		return this.getCache<Config.GuildMap>("guilds", (): Config.GuildMap =>
			Util.mapToObject<Discord.Snowflake, Set<Discord.Snowflake>, Array<Discord.Snowflake>>(this._guilds, (set: Set<Discord.Snowflake>): Array<Discord.Snowflake> => Array.from(set)));
	}

	public get secretsFile(): string { return this._secretsFile; }
	
	public addAdmin(admin: Discord.Snowflake): this {
		if (this._admins.size !== this._admins.add(admin).size) {
			this.hasChanged.admins = true;
			this.save();
			this.emit("adminAdded", admin);
		}
		return this;
	}

	public addChannel(guild: Discord.Snowflake, channel: Discord.Snowflake): this {
		const channels: Set<Discord.Snowflake> | undefined = this._guilds.get(guild);

		if (channels === undefined)
			return this.addGuild(guild, Array.of(channel));
		else if (channels.size !== channels.add(channel).size) {
			this.hasChanged.guilds = true;
			this.save();
			this.emit("channelAdded", guild, channel);
		}
		return this;
	}

	public addGuild(guild: Discord.Snowflake, channels?: Array<Discord.Snowflake>): this {
		this.deleteGuild(guild);
		this._guilds.set(guild, new Set<Discord.Snowflake>(channels));
		this.hasChanged.guilds = true;
		this.save();
		this.emit("guildAdded", guild, channels);
		return this;
	}

	public deleteAdmin(admin: Discord.Snowflake): this {
		if (this._admins.delete(admin)) {
			this.hasChanged.admins = true;
			this.save();
			this.emit("adminDeleted", admin);
		}
		return this;
	}

	public deleteChannel(guild: Discord.Snowflake, channel: Discord.Snowflake): this {
		const channels: Set<Discord.Snowflake> | undefined = this._guilds.get(guild);

		if (channels !== undefined && channels.delete(channel)) {
			this.hasChanged.guilds = true;
			this.save();
			this.emit("channelDeleted", guild, channel);
		}
		return this;
	}

	public deleteGuild(guild: Discord.Snowflake): this {
		const channels: Set<Discord.Snowflake> | undefined = this._guilds.get(guild);

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
						args[1].forEach((channel: Discord.Snowflake): void => {
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

	public hasAdmin(admin: Discord.Snowflake): boolean { return this._admins.has(admin); }
	public hasChannel(guild: Discord.Snowflake, channel: Discord.Snowflake): boolean { return this.hasGuild(guild) && this._guilds.get(guild)!.has(channel); }
	public hasGuild(guild: Discord.Snowflake): boolean { return this._guilds.has(guild); }

	private save(): this {
		Util.File.Write.json<Config.Object>(CONFIG_FILE, this).catch<void>((err: any): void | Promise<void> => { this.emit(err); });
		this.emit("saved");
		return this;
	}

	public toJSON(): Config.Object { return { admins: this.admins, guilds: this.guilds, secretsFile: this.secretsFile }; }
}

export namespace Config {
	export type GuildMap = Util.GenericCollection<Discord.Snowflake>;

	export interface Interface {
		on(event: "adminAdded", listener: (admin: Discord.Snowflake) => void): this;
		on(event: "adminDeleted", listener: (admin: Discord.Snowflake) => void): this;
		on(event: "adminsModified", listener: (admin: Discord.Snowflake, action: "added" | "deleted") => void): this;
		on(event: "channelAdded", listener: (guild: Discord.Snowflake, channel: Discord.Snowflake) => void): this;
		on(event: "channelDeleted", listener: (guild: Discord.Snowflake, channel: Discord.Snowflake) => void): this;
		on(event: "guildAdded", listener: (guild: Discord.Snowflake, channels?: Array<Discord.Snowflake>) => void): this;
		on(event: "guildDeleted", listener: (guild: Discord.Snowflake, channels?: Array<Discord.Snowflake>) => void): this;
		on(event: "guildsModified", listener: (guild: Discord.Snowflake, action: "added" | "deleted", channels?: Array<Discord.Snowflake>) => void): this;
		on(event: "ready", listener: (config: Config) => void): this;
		on(event: "saved", listener: () => void): this;
	}

	export interface Object {
		admins: Array<Discord.Snowflake>;
		guilds: GuildMap;
		secretsFile: string;
	}
}