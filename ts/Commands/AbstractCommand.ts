import { ArchiveBot } from "../ArchiveBot";
import { ArgsArray } from "./ArgsArray";
import { Command } from "../Command";
import * as Discord from "discord.js";
import * as Message from "../Message";
import * as Util from "../Util";

export abstract class AbstractCommand implements AbstractCommand.Dynamic {
	protected readonly bot: ArchiveBot;
	public readonly abstract keyword: string;
	protected readonly ["static"]: AbstractCommand.Static;

	constructor(bot: ArchiveBot) {
		this.static = <any>this.constructor;
		[this.bot, this.keyword] = [bot, this.static.commandName];
		bot.adminMessageCollectors.forEach((relay: Message.UserCommandRelay): void => { relay.on(this.keyword, this.onTrigger.bind(this)); });
	}

	protected abstract onTrigger(command: Command, message: Discord.Message, relay: Message.UserCommandRelay): void;
}

export namespace AbstractCommand {
	interface InstantiableAbstractCommand {
		new(bot: ArchiveBot): Dynamic;
	}

	export interface Dynamic {
		readonly keyword: string;
	}

	export interface Static extends InstantiableAbstractCommand {
		commandArgs: ArgsArray;
		commandName: string;
		prototype: Dynamic;
	}

	export function ImplementsStatic(constructor: AbstractCommand.Static) { /* Tests that constructor implements Static side of AbstractCommand */ }
}