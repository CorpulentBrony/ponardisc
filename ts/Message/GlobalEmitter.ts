import { ArchiveBot } from "../ArchiveBot";
import { Config } from "../Config";
import * as Discord from "discord.js";
import * as Events from "events";
import * as Util from "../Util";

export class GlobalEmitter extends Events implements GlobalEmitter.EventsInterface {
	private readonly bot: ArchiveBot;

	constructor(bot: ArchiveBot) {
		super();
		this.bot = bot;
		this.bot.client.on("message", this.onMessage.bind(this));
		this.emit("ready", this);
	}

	private onMessage(message: Discord.Message): void {
		if (!message.author.equals(this.bot.client.user) && Util.Discord.isDmChannel(message.channel) && this.bot.config.admins.has(message.author.id))
			this.emit(message.author.id, message);
	}
}

export namespace GlobalEmitter {
	export interface EventsInterface {
		addListener(event: Config.UserId, listener: (message: Discord.Message) => void): this;
		addListener(event: "ready", listener: (globalMessageEmitter: this) => void): this;
		emit(event: Config.UserId, message: Discord.Message): boolean;
		emit(event: "ready", globalMessageEmitter: this): boolean;
		on(event: Config.UserId, listener: (message: Discord.Message) => void): this;
		on(event: "ready", listener: (globalMessageEmitter: this) => void): this;
		once(event: Config.UserId, listener: (message: Discord.Message) => void): this;
		once(event: "ready", listener: (globalMessageEmitter: this) => void): this;
		prependListener(event: Config.UserId, listener: (message: Discord.Message) => void): this;
		prependListener(event: "ready", listener: (globalMessageEmitter: this) => void): this;
		prependOnceListener(event: Config.UserId, listener: (message: Discord.Message) => void): this;
		prependOnceListener(event: "ready", listener: (globalMessageEmitter: this) => void): this;
		removeListener(event: Config.UserId, listener: (message: Discord.Message) => void): this;
		removeListener(event: "ready", listener: (globalMessageEmitter: this) => void): this;
	}
}