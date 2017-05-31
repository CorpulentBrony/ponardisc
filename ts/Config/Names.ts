import { Config } from "../Config";
import * as Discord from "discord.js";
import * as Events from "events";
import * as Util from "../Util";

export class Names extends Events implements Names.Interface {
	private _admins: Promise<Util.Map<Config.UserId, Names.Name>> | undefined;
	private _channels: Util.Map<Config.GuildId, Util.Map<Config.ChannelId, Names.Name>> | undefined;
	private _guilds: Util.Map<Config.GuildId, Names.Name> | undefined;
	private readonly objects: Config.Objects;

	public static list(names: Util.Map<Config.Id, Names.Name>, options?: Names.List.Options): string;
	public static list(names: Util.Map<Config.Id, Promise<Names.Name>>, options?: Names.List.Options): Promise<string>;
	public static list(names: Util.Map<Config.Id, Names.Name | Promise<Names.Name>>, options: Names.List.Options = Names.List.Defaults): string | Promise<string> {
		if (Util.Typing.isMapOfPromise<Config.Id, Names.Name>(names))
			return this.listAsync(names, options);
		else if (Util.Typing.isMapNotOfPromise<Config.Id, Names.Name>(names))
			return Names.List.format(names, options);
		return "";
	}

	private static async listAsync(names: Util.Map<Config.Id, Promise<Names.Name>>, options: Names.List.Options = Names.List.Defaults): Promise<string> {
		const resolvedNames = new Util.Map<Config.Id, Names.Name>();
		await names.forEach(async (value: Promise<Names.Name>, id: Config.Id): Promise<void> => { resolvedNames.set(id, await value); });
		return Names.List.format(resolvedNames, options);
	}

	constructor(objects: Config.Objects);
	constructor(config: Config, client: Discord.Client);
	constructor(objectsOrConfig: Config.Objects | Config, client?: Discord.Client) {
		super();

		if (objectsOrConfig instanceof Config.Objects)
			this.objects = objectsOrConfig;
		else if (objectsOrConfig instanceof Config && client !== undefined)
			this.objects = new Config.Objects(objectsOrConfig, client);
		else
			throw new Error("Config.Names object instantiated without a valid Config.Objects or Config object.");
		this.objects.on("adminsModified", (): void => this.clearCache("admins"));
		this.objects.on("guildsModified", (): void => this.clearCache("guilds"));
		this.emit("ready", this);
	}

	public get admins(): Promise<Util.Map<Config.UserId, Names.Name>> { return this.getAdmins(); }

	public get channels(): Util.Map<Config.GuildId, Util.Map<Config.ChannelId, Names.Name>> {
		if (this._channels !== undefined)
			return this._channels;
		return this._channels = new Util.Map<Config.GuildId, Util.Map<Config.ChannelId, Names.Name>>();
	}

	public get guilds(): Util.Map<Config.GuildId, Names.Name> {
		if (this._guilds !== undefined)
			return this._guilds;
		return this._guilds = this.objects.guilds.reduce<Util.Map<Config.GuildId, Names.Name>>((map: Util.Map<Config.GuildId, Names.Name>, guild: Discord.Guild, id: Config.GuildId): Util.Map<Config.GuildId, Names.Name> => {
			return map.set(id, { mention: guild.toString(), name: guild.name });
		}, new Util.Map<Config.GuildId, Names.Name>());
	}

	private clearCache(type: "admins" | "channels" | "guilds"): void {
		(<any>this)["_" + type] = undefined;
		this.emit(type + "Modified");
	}

	public async getAdmins(): Promise<Util.Map<Config.UserId, Names.Name>> {
		if (this._admins !== undefined)
			return this._admins;
		return this._admins = this.objects.admins.reduce<Promise<Util.Map<Config.UserId, Names.Name>>>(async (map: Promise<Util.Map<Config.UserId, Names.Name>>, user: Promise<Discord.User>, id: Config.UserId): Promise<Util.Map<Config.UserId, Names.Name>> => {
			const resolvedMap: Util.Map<Config.UserId, Names.Name> = await map;
			const resolvedUser: Discord.User = await user;
			return resolvedMap.set(id, { mention: resolvedUser.toString(), name: resolvedUser.username });
		}, Promise.resolve(new Util.Map<Config.UserId, Names.Name>()))
	}

	public getChannels(guild: Config.GuildId): Util.Map<Config.ChannelId, Names.Name> {
		if (this.channels.has(guild))
			return this.channels.get(guild)!;
		const result: Util.Map<Config.ChannelId, Names.Name> = this.objects.getChannels(guild).reduce<Util.Map<Config.ChannelId, Names.Name>>((result: Util.Map<Config.ChannelId, Names.Name>, channel: Discord.TextChannel, id: Config.ChannelId): Util.Map<Config.ChannelId, Names.Name> => {
			return result.set(id, { mention: channel.toString(), name: channel.name });
		}, new Util.Map<Config.ChannelId, Names.Name>());
		this.channels.set(guild, result);
		return result;
	}

	public getGuilds(): Util.Map<Config.GuildId, Names.Name> { return this.guilds; }
}

export namespace Names {
	export type Name = { mention: string, name: string };

	export interface Interface {
		on(event: "adminsModified", listener: () => void): this;
		on(event: "channelsModified", listener: () => void): this;
		on(event: "guildsModified", listener: () => void): this;
		on(event: "ready", listener: (names: Names) => void): this;
	}

	export namespace List {
		export type Variables = "number" | "name" | "id";
		type VariableTypes = [number, string, string];

		export interface Options {
			delimiter?: string;
			format?: OptionsFormat;
		}

		export interface OptionsFormat {
			pattern: string;
			variableOrder: Set<Variables>;
		}

		export namespace Defaults {
			export const delimiter: string = "\n";
			export const format: OptionsFormat = { pattern: "%i. %s [%s]", variableOrder: new Set<Variables>(["number", "name", "id"]) };
		}

		export function format(names: Util.Map<Config.Id, Names.Name>, { delimiter = Defaults.delimiter, format: { pattern, variableOrder } = Defaults.format }: Options = Defaults): string {
			const argOrder = new Array<number>();

			for (const variable of variableOrder)
				switch (variable) {
					case "number": argOrder.push(0); break;
					case "name": argOrder.push(1); break;
					case "id": argOrder.push(2); break;
					default: throw new TypeError("Invalid value passed as variableOrder.");
				}
			let i: number = 1;
			let result: string = "";

			for (const [key, value] of names) {
				result += delimiter + Util.Node.format(pattern, ...argOrder.map<number | string>((arg: number): number | string => [i, value.name, key][arg]));
				i++;
			}
			return result.slice(delimiter.length);
		}
	}
}