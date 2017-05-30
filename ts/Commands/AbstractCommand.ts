import { ArchiveBot } from "../ArchiveBot";
import { Command } from "../Command";
import * as Discord from "discord.js";
import * as Message from "../Message";

export abstract class AbstractCommand {
	private readonly bot: ArchiveBot;
	public readonly abstract keyword: string;

	constructor(bot: ArchiveBot, keyword: string) {
		[this.bot, this.keyword] = [bot, keyword];
		bot.adminMessageCollectors.forEach((relay: Message.UserCommandRelay): void => { relay.on("list", this.onTrigger.bind(this)); });
	}

	protected abstract onTrigger(command: Command, message: Discord.Message, relay: Message.UserCommandRelay): void;
}