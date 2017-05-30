import { ArchiveBot } from "../ArchiveBot";
import { Config } from "../Config";
import { UserCommandRelay } from "./UserCommandRelay";
import * as Util from "../Util";

export class AdminCollectors extends Util.Set<UserCommandRelay> {
	constructor(bot: ArchiveBot) {
		super();
		bot.config.admins.forEach((userId: Config.UserId): void => { super.add(new UserCommandRelay(bot, userId)); });
	}
}