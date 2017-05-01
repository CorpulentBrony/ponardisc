import { Buffer } from "buffer";
import * as Discord from "discord.js";
import * as Fs from "fs";

const SECRETS_FILE: string = ".secret_bot.json";

class ArchiveBot {
	public readonly client: Discord.Client;

	constructor() { this.client = new Discord.Client({ disabledEvents: ["TYPING_START"] }); }

	public configureClient(): this {
		this.client.on("ready", this.onReady);
		this.client.on("reconnecting", this.onReconnecting);
		return this;
	}

	public async login(): Promise<void> {
		this.client.login(await Token.getToken());
	}

	private onReady(): void {
		console.log("ready");
	}

	private onReconnecting(): void {
		console.log("reconnecting...");
	}
}

namespace Token {
	let token: string;

	interface Secrets {
		id: string;
		token: string;
	}

	async function access(mode: number = Fs.constants.F_OK): Promise<boolean> {
		return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void): void => Fs.access(SECRETS_FILE, mode, (err: Error): void => resolve(!Boolean(err))));
	}

	export async function getToken(): Promise<string> {
		if (token)
			return token;
		const error = class BotSecretsError extends Error {};

		if (!(await access(Fs.constants.F_OK | Fs.constants.R_OK)))
			throw new error("Bot secrets file does not exist.");
		const readStream: Fs.ReadStream = Fs.createReadStream(SECRETS_FILE);
		const readSecrets: Array<Buffer> = new Array<Buffer>();
		readStream.on("data", (chunk: Buffer): void => { readSecrets.push(chunk); });
		return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: any) => void): void => {
			readStream.on("end", (): void => {
				const secretsUnparsed: string = Buffer.concat(readSecrets, readStream.bytesRead).toString("utf8");
				let secrets: Secrets;

				if (secretsUnparsed.length < 20)
					reject(new error("Bot secrets file is not configured properly; unexpected length."));

				try {
					secrets = JSON.parse(secretsUnparsed);
				} catch (err) {
					reject(new error("Bot secrets file in unknown format; unable to parse."));
				}
				resolve(token = secrets.token);
			});
		});
	}
}

const bot: ArchiveBot = new ArchiveBot();
bot.configureClient().login().catch(console.error);