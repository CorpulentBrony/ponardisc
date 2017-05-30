import * as Commands from "./Commands";
import { Config } from "./Config";
import * as Discord from "discord.js";
import * as Message from "./Message";
import * as Util from "./Util";

export class ArchiveBot {
	public readonly adminMessageCollectors: Message.AdminCollectors;
	public readonly client: Discord.Client;
	public readonly config: Config;
	public readonly globalMessageEmitter: Message.GlobalEmitter;
	private readonly list: Commands.List;

	constructor(config: Config) {
		[this.client, this.config] = [new Discord.Client({ disabledEvents: ["TYPING_START"] }), config];
		this.config.setClient(this.client);
		this.globalMessageEmitter = new Message.GlobalEmitter(this);
		this.adminMessageCollectors = new Message.AdminCollectors(this);
		this.list = new Commands.List(this);
	}

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
	}

	private onReconnecting(): void {
		console.log("reconnecting...");
	}
}