import { Config } from "../Config";
import * as Discord from "discord.js";
import * as Util from "../Util";

export class Lists {
	private readonly names: Config.Names;
	private options: Lists.Options;

	private static format(names?: Util.Map<Config.Id, Config.Names.Name>, { delimiter = Lists.Options.Defaults.delimiter, format: { pattern, variableOrder } = Lists.Options.Defaults.format }: Partial<Lists.Options> = Lists.Options.Defaults): string {
		if (names === undefined || names.size === 0)
			return "";
		const argOrder: Array<number> = this.getVariableOrder(variableOrder);
		let i: number = 1;

		return names.reduce<string>((result: string, name: Config.Names.Name, id: Config.Id): string => {
			result += delimiter + Util.Node.format(pattern, ...argOrder.map<number | string>((arg: number): number | string => [i, name.name, id][arg]));
			i++;
			return result;
		}, "").slice(delimiter.length);
	}

	private static getVariableOrder(order: Util.Set<Lists.Options.Variables>): Array<number> {
		return order.reduce<Array<number>>((result: Array<number>, variable: Lists.Options.Variables): Array<number> => {
			switch (variable) {
				case "number": result.push(0); break;
				case "name": result.push(1); break;
				case "id": result.push(2); break;
				default: throw new TypeError("Invalid value passed as variableOrder.");
			}
			return result;
		}, new Array<number>());
	}

	constructor(names: Config.Names, options?: Partial<Lists.Options>);
	constructor(objects: Config.Objects, options?: Partial<Lists.Options>);
	constructor(config: Config, client: Discord.Client, options?: Partial<Lists.Options>);
	constructor(namesOrObjectsOrConfig: Config.Names | Config.Objects | Config, optionsOrClient?: Partial<Lists.Options> | Discord.Client, options?: Partial<Lists.Options>) {
		if (namesOrObjectsOrConfig instanceof Config.Names)
			this.names = namesOrObjectsOrConfig;
		else if (namesOrObjectsOrConfig instanceof Config.Objects)
			this.names = new Config.Names(namesOrObjectsOrConfig);
		else if (namesOrObjectsOrConfig instanceof Config && optionsOrClient instanceof Discord.Client)
			this.names = new Config.Names(namesOrObjectsOrConfig, optionsOrClient);
		else
			throw new Error("Config.Lists object instantiated without a valid Config.Names, Config.Objects, or Config object.");

		if (!(optionsOrClient instanceof Discord.Client))
			options = optionsOrClient;
		this.setOptions(options);
	}

	public get admins(): Promise<string> { return this.getAdmins(); }
	public get channels(): Util.Map<Config.GuildId, string> { return this.names.channels.map<string>((channels: Util.Map<Config.ChannelId, Config.Names.Name>, guild: Config.GuildId): string => this.getChannels(guild)); }
	public get guilds(): string { return this.getGuilds(); }

	public async getAdmins(options: Partial<Lists.Options> = this.options): Promise<string> { return Lists.format(await this.names.admins, options); }
	public getChannels(guild: Config.GuildId, options: Partial<Lists.Options> = this.options): string { return Lists.format(this.names.getChannels(guild), options); }
	public getGuilds(options: Partial<Lists.Options> = this.options): string { return Lists.format(this.names.guilds, options); }

	public setOptions({ delimiter = Lists.Options.Defaults.delimiter, format = Lists.Options.Defaults.format }: Partial<Lists.Options> = Lists.Options.Defaults): this {
		this.options = { delimiter, format };
		return this;
	}
}

export namespace Lists {
	export interface Options {
		delimiter: string;
		format: Format.Options;
	}

	export namespace Format {
		export interface Options {
			pattern: string;
			variableOrder: Util.Set<Options.Variables>;
		}
	}

	export namespace Options {
		export type Variables = "number" | "name" | "id";
		export type VariableTypes = [number, string, string];

		export namespace Defaults {
			export const delimiter: string = "\n";
			export const format: Format.Options = { pattern: "%i. %s [%s]", variableOrder: Util.Set.of<Variables>("number", "name", "id") };
		}
	}
}