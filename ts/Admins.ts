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

/*
<command> ::= <list> | <add> | <delete> | <help>
<id> ::= <snowflake>
<snowflake> ::= <number>
<number> ::= <digit> <number>
<digit> ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

<help> ::= "help"

<list> ::= "list " <list-arguments>
<list-arguments> ::= <list-parent> [<list-parent-options>] | <list-child> [<list-child-options>]
<list-parent> ::= " admins" | " guilds"
<list-parent-options> ::= " with id"
<list-child> ::= " channels"
<list-child-options> ::= [<list-child-options-guild>] [<list-parent-options>]
<list-child-options-guild> ::= " in guild" [" " <id>]
*/



class AdminCommands {
	private readonly admins: Admins;
	private readonly client: Discord.Client;
	private readonly collector: AdminMessageCollector;
	private readonly config: Config;
	private readonly configNames: Config.Names;
	private readonly sessions: Map<Discord.Snowflake, "list" | "add" | "delete">

	// if this survives, cache by message.id
	private static getMessageContent(message: Discord.Message): Array<string> { return message.content.toLowerCase().replace(/[^\S ]/g, " ").replace(/\s{2,}/g, " ").trim().split(" "); }

	constructor(client: Discord.Client, admins: Admins, config: Config) {
		[this.admins, this.client, this.config] = [admins, client, config];
		this.collector = new AdminMessageCollector(this.client, this.admins);
		this.addTopMenu();
		this.configNames = config.getNames(this.client);
	}

	private addTopMenu(): void { this.collector.on("message", (message: Discord.Message): void => this.topMenu(message)); }
	private removeTopMenu(): void { this.collector.removeListener("message", (message: Discord.Message): void => this.topMenu(message)); }

	private topMenu(message: Discord.Message): void {
		const content: Array<string> = AdminCommands.getMessageContent(message);
		const command: string = content[0];
		const args: Array<string> = content.slice(1);

		if (command === "list")
			this.list(message, args);
		else
			this.send(message.author.id, `I'm sorry, I don't understand this jibber jabber:\n\`\`\`${message.content}\`\`\``);
	}

	//list admins [with id], list guilds [with id], list channels [in guild [id]] [with id]
	private list(message: Discord.Message, args: Array<string>): void {
		if (args.length === 0)
			this.listPromptNoObject(message.author.id);
		else if (args.length === 1)
			if (args[0] === "channels")
				this.listPromptNoGuild(message.author.id);
	}

	private listCommand(object: "admins" | "guilds", includeId: boolean): string;
	private listCommand(object: "channels", guild: Config.GuildId, includeId: boolean): string;
	private listCommand(object: "admins" | "guilds" | "channels", includeIdOrGuild: boolean | Config.GuildId, includeId?: boolean): string {
		return "";
	}

	private listNoObject(message: Discord.Message): void {
		const content: Array<string> = AdminCommands.getMessageContent(message);
		const numericSelection: number = Number.parseInt(content[0]);
		let selection: "admins" | "guilds" | "channels" | undefined;
		const validSelections: Array<typeof selection> = Array.of<typeof selection>("admins", "guilds", "channels");

		if (Number.isInteger(numericSelection) && numericSelection > 0 && numericSelection <= 3)
			selection = validSelections[numericSelection];
		else if (validSelections.some((value: typeof selection): boolean => value === content[0]))
			selection = <typeof selection>content[0];

		if (selection === undefined)
			return;
		this.list(message, Array.of<string>(selection));
	}

	private listPromptNoGuild(user: Config.UserId): void {
		this.send(user, "In which guild would you like to list channels?  Please choose from the following:");
		this.send(user, Config.Names.list(this.configNames.guilds));
	}

	private listPromptNoObject(user: Config.UserId): void {
		this.removeTopMenu();
		this.collector.once("message", (message: Discord.Message): void => { this.listNoObject(message); this.addTopMenu(); });
		this.send(user, "What would you like to list?  Please choose from the following: 1) admins, 2) guilds, 3) channels");
	}

	public async send(recipient: Config.UserId, content: Discord.StringResolvable): Promise<Discord.Message | Array<Discord.Message>>;
	public async send(content: Discord.StringResolvable): Promise<Set<Promise<Discord.Message | Array<Discord.Message>>>>;
	public async send(recipientOrContent?: Config.UserId | Discord.StringResolvable, content?: Discord.StringResolvable): Promise<Discord.Message | Array<Discord.Message> | Set<Promise<Discord.Message | Array<Discord.Message>>>> {
		const admins: Map<Config.UserId, Promise<Discord.User>> = this.admins.map;

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
		this.client.on("message", (message: Discord.Message): void => this.onMessage(message));
	}

	private onMessage(message: Discord.Message): void {
		const admins: Map<Config.UserId, Promise<Discord.User>> = this.admins.map;

		if (!message.author.equals(this.client.user) && message.channel.type === "dm" && admins.has(message.author.id))
			this.emit("message", message);
	}
}

export class Admins {
	private readonly _map: Map<Config.UserId, Promise<Discord.User>>;
	private readonly client: Discord.Client;
	public readonly commands: AdminCommands;
	private readonly config: Config;
	private readonly configObjects: Config.Objects;
	
	constructor(config: Config, client: Discord.Client) {
		[this._map, this.client, this.config] = [new Map<Config.UserId, Promise<Discord.User>>(), client, config];
		// this.config.on("adminsModified", (admin: Config.UserId, action: "added" | "deleted"): void => { this.loadMap(); })
		this.configObjects = new Config.Objects(this.config, this.client);
		this.commands = new AdminCommands(this.client, this, this.config);
		this.commands.send("Logged in successfully, awaiting your command.").catch(console.error);
	}

	public get map(): Map<Config.UserId, Promise<Discord.User>> {
		return this.configObjects.admins;
		// if (this._map.size > 0)
		// 	return Promise.resolve(this._map);
		// return this.loadMap();
	}

	// private async loadMap(): Promise<Map<Config.UserId, Promise<Discord.User>>> {
	// 	this._map.clear();
	// 	this.config.admins.forEach((admin: Config.UserId): void => { this._map.set(admin, this.client.fetchUser(admin)); });
	// 	return this._map;
	// }
}