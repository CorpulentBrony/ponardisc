import * as Discord from "discord.js";
import * as Process from "process";
import * as Util from "./Util";

const CONFIG_FILE: string = Process.env.npm_package_config_file;

export class Config implements Config.Interface {
	private _admins: Set<Discord.Snowflake>;
	private _guilds: Map<Discord.Snowflake, Set<Discord.Snowflake>>;
	private _secretsFile: string;
	private readonly cache: Partial<Config.Interface>;
	private readonly hasChanged: Partial<Record<keyof Config.Interface, boolean>>;

	public static async load(): Promise<Config> {
		const config: Config.Interface = await Util.File.Read.json<Config.Interface>(CONFIG_FILE);
		return new this(config);
	}

	constructor({ admins, guilds, secretsFile }: Config.Interface) {
		[this._admins, this._secretsFile, this.cache, this.hasChanged] = [new Set<Discord.Snowflake>(admins), secretsFile, {}, { admins: true, guilds: true }];
		this._guilds = Util.objectToMap<Discord.Snowflake, Array<Discord.Snowflake>, Set<Discord.Snowflake>>(guilds, (array: Array<Discord.Snowflake>): Set<Discord.Snowflake> => new Set<Discord.Snowflake>(array));
	}

	public get admins(): Array<Discord.Snowflake> { return this.getCache<Array<Discord.Snowflake>>("admins", (): Array<Discord.Snowflake> => Array.from(this._admins)); }

	public get guilds(): Config.GuildMap {
		return this.getCache<Config.GuildMap>("guilds", (): Config.GuildMap =>
			Util.mapToObject<Discord.Snowflake, Set<Discord.Snowflake>, Array<Discord.Snowflake>>(this._guilds, (set: Set<Discord.Snowflake>): Array<Discord.Snowflake> => Array.from(set)));
	}

	public get secretsFile(): string { return this._secretsFile; }
	
	public addAdmin(admin: Discord.Snowflake): this {
		this._admins.add(admin);
		this.hasChanged.admins = true;
		return this.save();
	}

	public addChannel(guild: Discord.Snowflake, channel: Discord.Snowflake): this {
		if (this._guilds.has(guild))
			this._guilds.get(guild)!.add(channel);
		else
			this._guilds.set(guild, new Set<Discord.Snowflake>(Array.of(channel)));
		this.hasChanged.guilds = true;
		return this.save();
	}

	public addGuild(guild: Discord.Snowflake, channels?: Array<Discord.Snowflake>): this {
		this._guilds.set(guild, new Set<Discord.Snowflake>(channels));
		this.hasChanged.guilds = true;
		return this.save();
	}

	public deleteAdmin(admin: Discord.Snowflake): this {
		if (this._admins.delete(admin))
			this.hasChanged.admins = true;
		return this;
	}

	public deleteChannel(guild: Discord.Snowflake, channel: Discord.Snowflake): this {
		if (this.hasGuild(guild) && this._guilds.get(guild)!.delete(channel))
			this.hasChanged.guilds = true;
		return this;
	}

	public deleteGuild(guild: Discord.Snowflake): this {
		if (this._guilds.delete(guild))
			this.hasChanged.guilds = true;
		return this;
	}

	private getCache<K extends Config.Interface[keyof Config.Interface]>(property: keyof Config.Interface, generator: () => K): K {
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
		Util.File.Write.json<Config.Interface>(CONFIG_FILE, this).catch(console.error);
		return this;
	}

	public toJSON(): Config.Interface { return { admins: this.admins, guilds: this.guilds, secretsFile: this.secretsFile }; }
}

export namespace Config {
	export type GuildMap = Util.GenericCollection<Discord.Snowflake>;

	export interface Interface {
		admins: Array<Discord.Snowflake>;
		guilds: GuildMap;
		secretsFile: string;
	}
}