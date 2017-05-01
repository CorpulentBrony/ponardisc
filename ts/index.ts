import { Buffer } from "buffer";
import * as Discord from "discord.js";
import * as Fs from "fs";
import * as Stream from "stream";

const CONFIG_FILE: string = "config.json";

class Admins {
	private admins: Array<Discord.User>;
	private readonly client: Discord.Client;
	private readonly config: Config;
	private dmChannels: Array<Discord.DMChannel>;

	constructor(client: Discord.Client, config: Config) {
		[this.client, this.config] = [client, config];
		this.getAdmins().catch(console.error);
	}

	private async createDmChannels(): Promise<void> {

	}

	private async getAdmins(): Promise<void> {
		if (this.admins)
			return;
		const admins: Array<Promise<Discord.User>> = new Array<Promise<Discord.User>>();
		this.config.admins.forEach((admin: Discord.Snowflake): void => { admins.push(this.client.fetchUser(admin)); });
		this.admins = await Promise.all(admins);
	}
}

class ArchiveBot {
	private admins: Admins;
	private readonly client: Discord.Client;
	private readonly config: Config;

	constructor(config: Config) { [this.client, this.config] = [new Discord.Client({ disabledEvents: ["TYPING_START"] }), config]; }

	public configureClient(): this {
		this.client.on("ready", (): void => this.onReady());
		this.client.on("reconnecting", this.onReconnecting);
		return this;
	}

	public async login(): Promise<void> {
		this.client.login(await ArchiveUtil.Token.get(this.config.secretsFile));
	}

	private onReady(): void {
		this.admins = new Admins(this.client, this.config);
		console.log("ready");
	}

	private onReconnecting(): void {
		console.log("reconnecting...");
	}
}

class Config implements Config.Interface {
	private _admins: Array<Discord.Snowflake>;
	private _guilds: Array<Config.Guild>;
	private _secretsFile: string;
	private readonly cache: Partial<Config.Interface>;
	private readonly hasChanged: Partial<Record<keyof Config.Interface, boolean>>;

	public static async load(): Promise<Config> {
		const config: Config.Interface = await ArchiveUtil.File.Read.json<Config.Interface>(CONFIG_FILE);
		return new this(config);
	}

	constructor({ admins, guilds, secretsFile }: Config.Interface) {
		[this._admins, this._guilds, this._secretsFile, this.cache, this.hasChanged] = [admins, guilds, secretsFile, {}, { admins: true, guilds: true }];
	}

	public get admins(): Array<Discord.Snowflake> { return this.getCache<Array<Discord.Snowflake>>("admins", (): Array<Discord.Snowflake> => JSON.parse(JSON.stringify(this._admins))); }
	public get guilds(): Array<Config.Guild> { return this.getCache<Array<Config.Guild>>("guilds", (): Array<Config.Guild> => JSON.parse(JSON.stringify(this._guilds))); }
	public get secretsFile(): string { return this._secretsFile; }
	
	public addAdmin(admin: Discord.Snowflake): this {
		this._admins.push(admin);
		this.hasChanged.admins = true;
		ArchiveUtil.File.Write.json<Config.Interface>(CONFIG_FILE, this).catch(console.error);
		return this;
	}

	public addChannel(channel: Discord.Snowflake, guild: Discord.Snowflake): this {return this;}
	public addGuild(guild: Discord.Snowflake): this {return this;}

	private getCache<K extends Config.Interface[keyof Config.Interface]>(property: keyof Config.Interface, generator: () => K): K {
		if (this.hasChanged[property]) {
			this.cache[property] = generator.call(this);
			this.hasChanged[property] = false;
		}
		return <K>this.cache[property];
	}

	public toJSON(): Config.Interface { return { admins: this._admins, guilds: this._guilds, secretsFile: this._secretsFile }; }
}

namespace ArchiveUtil {
	export function deepFreeze<T>(obj: T): T {
		Object.getOwnPropertyNames(obj).forEach(<K extends keyof T>(propertyName: K): void => {
			const property: T[K] = obj[propertyName];

			if (typeof property === "object" && property !== null)
				deepFreeze<T[K]>(property);
		});
		return Object.freeze(obj);
	}

	export namespace File {
		class FileError extends Error {};
		class FileReadError extends FileError {};
		class FileWriteError extends FileError {};

		export async function access(file: string, mode: number = Fs.constants.F_OK): Promise<boolean> {
			return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void): void => Fs.access(file, mode, (err: Error): void => resolve(!Boolean(err))));
		}

		export namespace Read {
			export async function buffer(file: string): Promise<Buffer> {
				if (!(await access(file, Fs.constants.F_OK | Fs.constants.R_OK)))
					throw new FileReadError(`File ${file} does not exist.`);
				const readStream: Fs.ReadStream = Fs.createReadStream(file);
				const readBuffers: Array<Buffer> = new Array<Buffer>();
				readStream.on("data", (chunk: Buffer): void => { readBuffers.push(chunk); });
				return new Promise<Buffer>((resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: any) => void): void => { readStream.on("end", (): void => resolve(Buffer.concat(readBuffers, readStream.bytesRead))); });
			}

			export async function json<T>(file: string, minLength: number = 0): Promise<T> {
				const unparsed: string = await string(file);
				let parsed: T;

				if (minLength > 0 && unparsed.length < minLength)
					throw new FileReadError(`File ${file} is not configured properly; expected a file at least ${minLength} characters long but file is actually ${unparsed.length} characters.`);

				try {
					parsed = JSON.parse(unparsed);
				} catch (err) {
					throw new FileReadError(`File ${file} is in unknown format; unable to parse JSON.`);
				}
				return parsed;
			}

			export async function string(file: string): Promise<string> {
				const result: Buffer = await buffer(file);
				return result.toString("utf8");
			}
		}

		export namespace Write {
			class ReadableBuffer extends Stream.Readable {
				private buffer: Buffer;
				private length: number;
				private offset: number;

				constructor(buffer: Buffer, options?: Stream.ReadableOptions) {
					super(options);

					if (!Buffer.isBuffer(buffer))
						throw new TypeError("Buffer parameter must be a buffer.");
					[this.buffer, this.length, this.offset] = [buffer, buffer.length, 0];
				}

				public _read(size: number): void {
					if (this.offset < this.length) {
						this.push(this.buffer.slice(this.offset, this.offset + size));
						this.offset += size;
					} else if (this.offset >= this.length)
						this.push(null);
				}
			}

			export async function buffer(file: string, contents: Buffer): Promise<void> { stream(file, new ReadableBuffer(contents)); }
			export async function json<T>(file: string, contents: T): Promise<void> { string(file, JSON.stringify(contents)); }

			export async function stream(file: string, readStream: Stream.Readable): Promise<void> {
				if (!(await access(file, Fs.constants.F_OK | Fs.constants.W_OK)))
					throw new FileWriteError(`File ${file} does not exist or you do not have permissions to write to it.`);
				const writeStream: Fs.WriteStream = Fs.createWriteStream(file, <any>{ defaultEncoding: "binary" });
				return new Promise<void>((resolve: () => void, reject: (reason?: any) => void): void => { readStream.pipe<Fs.WriteStream>(writeStream).on("finish", (): void => resolve()); });
			}

			export async function string(file: string, contents: string): Promise<void> { buffer(file, Buffer.from(contents, "utf8")); }
		}
	}

	export namespace Token {
		let cache: Map<string, string> = new Map<string, string>();

		interface Secrets {
			id: string;
			secret: string;
			token: string;
		}

		export async function get(secretsFile: string): Promise<string> {
			if (cache.has(secretsFile))
				return <string>cache.get(secretsFile);
			const secrets: Secrets = await ArchiveUtil.File.Read.json<Secrets>(secretsFile, 20);
			return <string>cache.set(secretsFile, secrets.token).get(secretsFile);
		}
	}
}

namespace Config {
	export interface Guild {
		guild: Discord.Snowflake;
		channels: Array<Discord.Snowflake>;
	}

	export interface Interface {
		admins: Array<Discord.Snowflake>;
		guilds: Array<Guild>;
		secretsFile: string;
	}
}

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