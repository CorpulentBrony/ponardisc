import { AbstractCommand } from "./AbstractCommand";
import { ArchiveBot } from "../ArchiveBot";
import { Command } from "../Command";
import * as Discord from "discord.js";
import * as Message from "../Message";

/*
list admins, add admin [id], delete admin [id]
list guilds, add guild [id] [channel ids], delete guild [id]
list channels [in guild [id]], add channel [id] [from guild [id]], delete channel [id] [from guild [id]]
*/

const COMMAND_NAME: "list" = "list";
const LIST_OBJECTS: Array<string> = Array.of<string>("admins", "guilds", "channels");

export class List extends AbstractCommand {
	public readonly keyword: typeof COMMAND_NAME;

	constructor(bot: ArchiveBot) { super(bot, COMMAND_NAME); }

	public list(command: Command, message: Discord.Message, relay: Message.UserCommandRelay): void {
		if (command.name !== COMMAND_NAME)
			command = new Command("list " + message.content);

		switch (command.args[0]) {
			case "admins":
				message.channel.send("you want to get a list of admins");
				break;
			case "guilds":
				message.channel.send("you want to get a list of guilds");
				break;
			case "channels":
				message.channel.send("you want to get a list of channels");
				break;
			default:
				message.channel.send("wtf do you want a list of?");
		}
	}

	protected onTrigger(command: Command, message: Discord.Message, relay: Message.UserCommandRelay): void {
		if (command.args[0] === undefined || !LIST_OBJECTS.includes(command.args[0])) {
			message.channel.send("Would you like to list admins, guilds, or channels?");
		}
		else if (!LIST_OBJECTS.includes(command.args[0]))
			message.channel.send("well, you gotta choose admins, guilds, or channels");
		else
			this.list(command, message, relay);
	}
}