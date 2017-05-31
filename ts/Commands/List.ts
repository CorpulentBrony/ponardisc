import { AbstractCommand } from "./AbstractCommand";
import { ArchiveBot } from "../ArchiveBot";
import { ArgsArray } from "./ArgsArray";
import { Command } from "../Command";
import { Config } from "../Config";
import * as Discord from "discord.js";
import * as Message from "../Message";
import "reflect-metadata";
import * as Util from "../Util";

/*
list admins, add admin [id], delete admin [id]
list guilds, add guild [id] [channel ids], delete guild [id]
list channels [in guild [id]], add channel [id] [from guild [id]], delete channel [id] [from guild [id]]
*/

@AbstractCommand.ImplementsStatic
export class List extends AbstractCommand {
	public static commandArgs: ArgsArray = ArgsArray.of(Util.Set.of<string>("admins", "guilds", "channels"));
	public static commandName: "list" = "list";

	public readonly keyword: typeof List.commandName;

	constructor(bot: ArchiveBot) { super(bot); }

	public async list(command: Command, message: Discord.Message, relay: Message.UserCommandRelay): Promise<void> {
		switch (command.args[0]) {
			case "admins":
				message.channel.send("**ADMINS**\n" + await this.bot.config.getLists().admins);
				break;
			case "guilds":
				message.channel.send("**GUILDS**\n" + this.bot.config.getLists().guilds);
				break;
			case "channels":
				message.channel.send("you want to get a list of channels");
				break;
			default:
				message.channel.send("wtf do you want a list of?");
		}
	}

	protected onObject = (command: Command, message: Discord.Message, relay: Message.UserCommandRelay): void => {
		command.set("list " + message.content);
		this.list(command, message, relay);
		this.removeObjectListeners(relay);
	}

	protected onTrigger(command: Command, message: Discord.Message, relay: Message.UserCommandRelay): void {
		if (command.args[0] === undefined) {
			message.channel.send("Would you like to list `admins`, `guilds`, or `channels`?");
			this.removeObjectListeners(relay);
			relay.on("admins", this.onObject).on("guilds", this.onObject).on("channels", this.onObject);
		} else if (!this.static.commandArgs.has(command.args[0]))
			message.channel.send("Can only list admins, guilds, or channels.");
		else
			this.list(command, message, relay);
	}

	private removeObjectListeners(relay: Message.UserCommandRelay): void { relay.removeAllListeners("admins").removeAllListeners("guilds").removeAllListeners("channels"); }
}