import { Config } from "./Config";
import * as Discord from "discord.js";
import * as Events from "events";
import * as Timers from "timers";
import * as Util from "./Util";

/* Admin Commands: 
list admins [with id], add admin [id], delete admin [id]
list guilds [with id], add guild [id] [channel ids], delete guild [id]
list channels [in guild [id]] [with id], add channel [id] [from guild [id]], delete channel [id] [from guild [id]]

[list, add, delete, help]
list

BOT: admins, guilds, channels
EXPECTING: original list or admins, guilds, or channels _or_ cancel/exit/quit?
if anything but 
*/

type ListParameterType = ["list", "admins" | "guilds", "with id"] | ["list", "channels", "in guild", Discord.Snowflake, "with id"];

class Parameter<T, N> {
	public isOptional: boolean;
	public next: Parameter<N, any> | Array<Parameter<N, any>> | undefined;
	public value: T | undefined;

	public static of<T, N>(value?: T, next?: Parameter<N, any> | Array<Parameter<N, any>>, isOptional: boolean = false): Parameter<T, N> { return new this(value, next, isOptional); }

	constructor(value?: T, next?: Parameter<N, any> | Array<Parameter<N, any>>, isOptional: boolean = false) { [this.isOptional, this.next, this.value] = [isOptional, next, value]; }

	public setNext<U, V>(value?: U, next?: Parameter<V, any> | Array<Parameter<V, any>>, isOptional: boolean = false): Parameter<U, V> { return Parameter.of<U, V>(value, next, isOptional); }
}

const Parameters = {
	list: {
		admins: {
			"with id": false
		},
		channels: {
			"in guild": {
				"id": {
					"with id": false
				}
			},
			"with id": false
		},
		guilds: {
			"with id": false
		}
	},
	add: {
		admin: {
			id: false
		},
		channel: {
			id: {
				"from guild": {
					id: false
				}
			}
		},
		guild: {
			id: ["channel ids"]
		}
	},
	delete: {
		admin: {
			id: false
		},
		channel: {
			id: {
				"from guild": {
					id: false
				}
			}
		},
		guild: {
			id: ["channel ids"]
		}
	}
}

Parameter.of<"list", "admins" | "channels" | "guilds">("list", Parameter.of<"admins", "with id">("admins", Parameter.of<"with id", undefined>("with id", undefined, true)));

// abstract class Parameters {
// 	public parameters: Array<Parameter<any, any>>;
// }

abstract class Command {
	protected abstract parameters: Array<string>;
}

namespace Command {
	

	class List extends Command {
		protected parameters: ListParameterType;

		constructor() {
			super();
			// this.parameters = new Array<ListParameterType>();
		}
	}
}

class AdminCommands {
	private readonly admins: Admins;
	private readonly client: Discord.Client;
	private readonly collector: AdminMessageCollector;
	private readonly config: Config;
	private readonly sessions: Map<Discord.Snowflake, "list" | "add" | "delete">

	constructor(client: Discord.Client, admins: Admins, config: Config) {
		[this.admins, this.client, this.config] = [admins, client, config];
		this.collector = new AdminMessageCollector(this.client, this.admins);
		this.collector.on("message", (message: Discord.Message): void => this.onMessage(message));
	}

	public onMessage(message: Discord.Message): void {
		this.send(message.author.id, `I heard you said:\n${message.content}`);
	}

	private async list(message: Discord.Message): Promise<void> {

	}

	public async send(recipient: Discord.Snowflake, content: Discord.StringResolvable): Promise<Discord.Message | Array<Discord.Message>>;
	public async send(content: Discord.StringResolvable): Promise<Set<Promise<Discord.Message | Array<Discord.Message>>>>;
	public async send(recipientOrContent?: Discord.Snowflake | Discord.StringResolvable, content?: Discord.StringResolvable): Promise<Discord.Message | Array<Discord.Message> | Set<Promise<Discord.Message | Array<Discord.Message>>>> {
		const admins: Map<Discord.Snowflake, Promise<Discord.User>> = await this.admins.map;

		if (admins.size === 0)
			throw new Error("Cannot send message.  No admins are defined.");

		if (content) {
			const resolved: Discord.User | undefined = await admins.get(recipientOrContent);

			if (resolved === undefined)
				throw new Error(`Cannot send message.  User snowflake ${recipientOrContent} is either not valid or the user is not an admin.`);
			else
				return resolved.send(content);
		}
		const messages: Set<Promise<Discord.Message | Array<Discord.Message>>> = new Set<Promise<Discord.Message | Array<Discord.Message>>>();
		admins.forEach(async (admin: Promise<Discord.User>): Promise<void> => {
			const resolved: Discord.User = await admin;
			messages.add(resolved.send(recipientOrContent));
		});
		return messages;
	}
}

class AdminMessageCollector extends Events {
	private readonly admins: Admins;
	private readonly client: Discord.Client;

	constructor(client: Discord.Client, admins: Admins) {
		super();
		[this.admins, this.client] = [admins, client];
		this.client.on("message", (message: Discord.Message): void => { this.onMessage(message).catch((reason: any): void | PromiseLike<void> => { this.emit("error", reason); }); });
	}

	private async onMessage(message: Discord.Message): Promise<void> {
		const admins: Map<Discord.Snowflake, Promise<Discord.User>> = await this.admins.map;

		if (!message.author.equals(this.client.user) && message.channel.type === "dm" && admins.has(message.author.id))
			this.emit("message", message);
	}
}

export class Admins {
	private readonly _map: Map<Discord.Snowflake, Promise<Discord.User>>;
	private readonly client: Discord.Client;
	public readonly commands: AdminCommands;
	private readonly config: Config;
	
	constructor(client: Discord.Client, config: Config) {
		[this._map, this.client, this.config] = [new Map<Discord.Snowflake, Promise<Discord.User>>(), client, config];
		this.config.on("adminsModified", (admin: Discord.Snowflake, action: "added" | "deleted"): void => { this.loadMap(); })
		this.commands = new AdminCommands(this.client, this, this.config);
		this.commands.send("Logged in successfully, awaiting your command.").catch(console.error);
	}

	public get map(): Promise<Map<Discord.Snowflake, Promise<Discord.User>>> {
		if (this._map.size > 0)
			return Promise.resolve(this._map);
		return this.loadMap();
	}

	private async loadMap(): Promise<Map<Discord.Snowflake, Promise<Discord.User>>> {
		this._map.clear();
		this.config.admins.forEach((admin: Discord.Snowflake): void => { this._map.set(admin, this.client.fetchUser(admin)); });
		return this._map;
	}
}