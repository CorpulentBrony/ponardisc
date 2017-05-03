import { Config } from "./Config";
import * as Discord from "discord.js";

export class Admins {
	private admins: Array<Discord.User>;
	private readonly client: Discord.Client;
	private readonly config: Config;
	private dmChannels: Array<Discord.DMChannel>;

	constructor(client: Discord.Client, config: Config) {
		[this.client, this.config] = [client, config];
		this.getAdmins().catch(console.error);
	}

	private async createDmChannels(): Promise<void> {

	}

	private async getAdmins(): Promise<void> {
		if (this.admins)
			return;
		const admins: Array<Promise<Discord.User>> = new Array<Promise<Discord.User>>();
		this.config.admins.forEach((admin: Discord.Snowflake): void => { admins.push(this.client.fetchUser(admin)); });
		this.admins = await Promise.all(admins);
	}
}