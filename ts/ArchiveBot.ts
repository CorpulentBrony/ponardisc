import { Admins } from "./Admins";
import { Config } from "./Config";
import * as Discord from "discord.js";
import * as Util from "./Util";

export class ArchiveBot {
	private admins: Admins;
	private readonly client: Discord.Client;
	private readonly config: Config;

	constructor(config: Config) { [this.client, this.config] = [new Discord.Client({ disabledEvents: ["TYPING_START"] }), config]; }

	public configureClient(): this {
		this.client.on("ready", (): void => this.onReady());
		this.client.on("reconnecting", this.onReconnecting);
		return this;
	}

	public async login(): Promise<void> {
		this.client.login(await Util.Token.get(this.config.secretsFile));
	}

	private onReady(): void {
		console.log("ready");
		this.admins = new Admins(this.config, this.client);
	}

	private onReconnecting(): void {
		console.log("reconnecting...");
	}
}