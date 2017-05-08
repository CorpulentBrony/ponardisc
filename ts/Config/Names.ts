import { Config } from "../Config";
import * as Discord from "discord.js";
import * as Events from "events";
import { Objects } from "./Objects";
import * as Util from "../Util";

export class Names extends Events implements Names.Interface {
	private readonly cache: Cache.InstanceType;
	private readonly objects: Objects;

	public static list(names: Map<Config.Id, Names.Name>, options?: Names.List.Options): string;
	public static list(names: Map<Config.Id, Promise<Names.Name>>, options?: Names.List.Options): Promise<string>;
	public static list(names: Map<Config.Id, Names.Name | Promise<Names.Name>>, options: Names.List.Options = Names.List.Defaults): string | Promise<string> {
		if (Util.Typing.isMapOfPromise<Config.Id, Names.Name>(names))
			return this.listAsync(names, options);
		else if (Util.Typing.isMapNotOfPromise<Config.Id, Names.Name>(names))
			return Names.List.format(names, options);
		return "";
	}

	private static async listAsync(names: Map<Config.Id, Promise<Names.Name>>, options: Names.List.Options = Names.List.Defaults): Promise<string> {
		const resolvedNames: Map<Config.Id, Names.Name> = new Map<Config.Id, Names.Name>();
		await names.forEach(async (value: Promise<Names.Name>, id: Config.Id): Promise<void> => { resolvedNames.set(id, await value); });
		return Names.List.format(resolvedNames, options);
	}

	constructor(objects: Objects);
	constructor(config: Config, client: Discord.Client);
	constructor(objectsOrConfig: Objects | Config, client?: Discord.Client) {
		super();

		if (objectsOrConfig instanceof Objects)
			this.objects = objectsOrConfig;
		else if (objectsOrConfig instanceof Config && client !== undefined)
			this.objects = new Objects(objectsOrConfig, client);
		else
			throw new Error("Config.Names object instantiated without a valid Objects or Config object.");
		this.objects.on("adminsModified", (): void => this.clearCache("admins"));
		this.objects.on("guildsModified", (): void => this.clearCache("guilds"));

		if (Cache.instances.has(this.objects))
			this.cache = Cache.instances.get(this.objects)!;
		else
			Cache.instances.set(this.objects, this.cache = {});
		this.emit("ready", this);
	}

	public get admins(): Map<Config.UserId, Promise<Names.Name>> {
		if (this.cache.admins !== undefined)
			return this.cache.admins;
		const result: Map<Config.UserId, Promise<Names.Name>> = new Map<Config.UserId, Promise<Names.Name>>();

		for (const [id, user] of this.objects.admins) {
			const name: Promise<Names.Name> = user.then<Names.Name>((user: Discord.User): Names.Name | PromiseLike<Names.Name> => {
				return { mention: user.toString(), name: user.username };
			});
			result.set(id, name);
		}
		return this.cache.admins = result;
	}

	public get guilds(): Map<Config.GuildId, Names.Name> {
		if (this.cache.guilds !== undefined)
			return this.cache.guilds;
		return this.cache.guilds = this.objects.guilds.reduce<Map<Config.GuildId, Names.Name>>((map: Map<Config.GuildId, Names.Name>, guild: Discord.Guild, id: Config.GuildId): Map<Config.GuildId, Names.Name> => {
			return map.set(id, { mention: guild.toString(), name: guild.name });
		}, new Map<Config.GuildId, Names.Name>());
	}

	private clearCache(type: keyof Cache.InstanceType): void {
		this.cache[type] = undefined;
		this.emit(type + "Modified");
	}

	public getChannels(guild: Config.GuildId): Map<Config.ChannelId, Names.Name> {
		if (this.cache.channels !== undefined && this.cache.channels.has(guild))
			return this.cache.channels.get(guild)!;
		else if (this.cache.channels === undefined)
			this.cache.channels = new Map<Config.GuildId, Map<Config.ChannelId, Names.Name>>();
		const result: Map<Config.ChannelId, Names.Name> = this.objects.getChannels(guild).reduce<Map<Config.ChannelId, Names.Name>>((result: Map<Config.ChannelId, Names.Name>, channel: Discord.TextChannel, id: Config.ChannelId): Map<Config.ChannelId, Names.Name> => {
			return result.set(id, { mention: channel.toString(), name: channel.name });
		}, new Map<Config.ChannelId, Names.Name>());
		this.cache.channels.set(guild, result);
		return result;
	}
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

		export function format(names: Map<Config.Id, Names.Name>, { delimiter = Defaults.delimiter, format: { pattern, variableOrder } = Defaults.format }: Options = Defaults): string {
			const argOrder: Array<number> = new Array<number>();

			for (const variable of variableOrder)
				switch (variable) {
					case "number": argOrder.push(0); break;
					case "name": argOrder.push(1); break;
					case "id": argOrder.push(2);
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

namespace Cache {
	export type InstanceType = { admins?: Map<Config.UserId, Promise<Names.Name>>, channels?: Map<Config.GuildId, Map<Config.ChannelId, Names.Name>>, guilds?: Map<Config.GuildId, Names.Name> }

	export const instances: Map<Objects, InstanceType> = new Map<Objects, InstanceType>();
}