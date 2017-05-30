import { ArchiveBot } from "../ArchiveBot";
import { Command } from "../Command";
import { Config } from "../Config";
import * as Discord from "discord.js";
import * as Events from "events";

export class UserCommandRelay extends Events implements UserCommandRelay.EventsInterface {
	constructor(bot: ArchiveBot, userId: Config.UserId) {
		super();
		bot.globalMessageEmitter.on(userId, this.onMessage.bind(this));
		this.emit("ready", this);
	}

	public on(event: string, listener: (...args: Array<any>) => void): this {
		super.on(event, listener);
		return this;
	}

	private onMessage(message: Discord.Message): void {
		this.emit("message", message, this);
		const command: Command = new Command(message.content);

		if (!this.emit(command.name, command, message, this))
			if (!this.emit("uncaught", command, message, this))
				this.onUncaught(command, message);
	}

	private onUncaught(command: Command, message: Discord.Message): void { message.channel.send(`Unknown command: \`${command.name}\``); }
}

export namespace UserCommandRelay {
	export interface EventsInterface {
		addListener(event: "message", listener: (message: Discord.Message, userCommandRelay: this) => void): this;
		addListener(event: "ready", listener: (userCommandRelay: this) => void): this;
		addListener(event: "uncaught", listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		addListener(event: string, listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		emit(event: "message", message: Discord.Message, userCommandRelay: this): boolean;
		emit(event: "ready", userCommandRelay: this): boolean;
		emit(event: "uncaught", command: Command, message: Discord.Message, userCommandRelay: this): boolean;
		emit(event: string, command: Command, message: Discord.Message, userCommandRelay: this): boolean;
		on(event: "message", listener: (message: Discord.Message, userCommandRelay: this) => void): this;
		on(event: "ready", listener: (userCommandRelay: this) => void): this;
		on(event: "uncaught", listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		on(event: string, listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		once(event: "message", listener: (message: Discord.Message, userCommandRelay: this) => void): this;
		once(event: "ready", listener: (userCommandRelay: this) => void): this;
		once(event: "uncaught", listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		once(event: string, listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		prependListener(event: "message", listener: (message: Discord.Message, userCommandRelay: this) => void): this;
		prependListener(event: "ready", listener: (userCommandRelay: this) => void): this;
		prependListener(event: "uncaught", listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		prependListener(event: string, listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		prependOnceListener(event: "message", listener: (message: Discord.Message, userCommandRelay: this) => void): this;
		prependOnceListener(event: "ready", listener: (userCommandRelay: this) => void): this;
		prependOnceListener(event: "uncaught", listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		prependOnceListener(event: string, listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		removeListener(event: "message", listener: (message: Discord.Message, userCommandRelay: this) => void): this;
		removeListener(event: "ready", listener: (userCommandRelay: this) => void): this;
		removeListener(event: "uncaught", listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
		removeListener(event: string, listener: (command: Command, message: Discord.Message, userCommandRelay: this) => void): this;
	}
}