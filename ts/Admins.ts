import { Config } from "./Config";
import * as Discord from "discord.js";
import * as Events from "events";
import * as Timers from "timers";

class AdminMessageCollector extends Events {
	private readonly admins: Admins;
	private readonly client: Discord.Client;

	constructor(admins: Admins, client: Discord.Client) {
		super();
		[this.admins, this.client] = [admins, client];
		this.client.on("message", (message: Discord.Message): void => this.onMessage(message));
	}

	private onMessage(message: Discord.Message): void {
		if (message.channel.type === "dm" && this.admins.map.has(message.author.id))
			this.emit("message", message);
	}
}

export class Admins {
	private readonly client: Discord.Client;
	private readonly collector: AdminMessageCollector;
	private readonly config: Config;
	public readonly map: Map<Discord.Snowflake, Promise<Discord.User>>;

	constructor(client: Discord.Client, config: Config) {
		[this.client, this.config, this.map] = [client, config, new Map<Discord.Snowflake, Promise<Discord.User>>()];
		this.config.on("adminsModified", (admin: Discord.Snowflake, action: "added" | "deleted"): void => { this.loadMap(); })
		this.collector = new AdminMessageCollector(this, this.client);
		this.collector.on("message", console.log);
		this.send("Logged in successfully, awaiting your command.").catch(console.error);
	}

	private async getMap(): Promise<Map<Discord.Snowflake, Promise<Discord.User>>> {
		if (this.map.size > 0)
			return this.map;
		return this.loadMap();
	}

	private async loadMap(): Promise<Map<Discord.Snowflake, Promise<Discord.User>>> {
		this.map.clear();
		this.config.admins.forEach((admin: Discord.Snowflake): void => { this.map.set(admin, this.client.fetchUser(admin)); });
		return this.map;
	}

	public async send(recipient: Discord.Snowflake, content: Discord.StringResolvable): Promise<Discord.Message | Array<Discord.Message>>;
	public async send(content: Discord.StringResolvable): Promise<Set<Promise<Discord.Message | Array<Discord.Message>>>>;
	public async send(recipientOrContent?: Discord.Snowflake | Discord.StringResolvable, content?: Discord.StringResolvable): Promise<Discord.Message | Array<Discord.Message> | Set<Promise<Discord.Message | Array<Discord.Message>>>> {
		const admins: Map<Discord.Snowflake, Promise<Discord.User>> = await this.getMap();

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