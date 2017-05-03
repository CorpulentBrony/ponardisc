import { ArchiveBot } from "./ArchiveBot";
import { Config } from "./Config";
import * as Process from "process";

Process.on("uncaughtException", console.error);

let bot: ArchiveBot;
let config: Config;

async function load(): Promise<void> {
	config = await Config.load();
	bot = new ArchiveBot(config);
	bot.configureClient().login();
}

load().catch(console.error);

/*{
	"admins": ["81203047132307456"],
	"guilds": [
		{
			"guild": "160954418093752321",
			"channels": ["282739844130537482"]
		}
	],
	"secretsFile": ".secret_bot.json"
}*/

/*{
	"admins": ["81203047132307456"],
	"guilds": [
		"160954418093752321": ["282739844130537482"]
	]
}*/

