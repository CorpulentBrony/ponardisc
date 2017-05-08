import { Buffer } from "buffer";
import * as Discord from "discord.js";
import * as Fs from "fs";
import * as Stream from "stream";

export type GenericCollection<K extends string, V = K> = { [id in K]: Array<V> };

export function arrayToObject<V extends { [index: string]: V[keyof V] }>(array: { [index: number]: V[keyof V] }, argumentList: V): V {
	return Object.keys(argumentList).reduce<V>((object: V, key: string, index: number): V => {
		if (array[index] !== undefined)
			object[key] = array[index];
		return object;
	}, Object.create(null));
}

export function mapToObject<K extends string, OV, V = OV>(map: Map<K, OV>, valueMapFn: (value: OV) => V = (value: OV): V => { return <V>(<any>value); }): { [key in K]: V } {
	return Array.from(map).reduce<{ [key in K]: V }>((object: { [key in K]: V }, [key, value]: [K, OV]): { [key in K]: V } => {
		object[key] = valueMapFn(value);
		return object;
	}, Object.create(null));
}

export function objectToMap<K extends string, OV, V = OV>(object: { [key in K]: OV }, valueMapFn: (value: OV) => V = (value: OV): V => { return <V>(<any>value); }): Map<K, V> {
	return Object.getOwnPropertyNames(object).reduce<Map<K, V>>((map: Map<K, V>, key: K): Map<K, V> => map.set(key, valueMapFn(object[key])), new Map<K, V>());
}

namespace DiscordUtil {
	export function isCollectionOf<W extends V, K = any, V = any>(collection: Discord.Collection<K, V>, checkFunction: (item: V) => item is W): collection is Discord.Collection<K, W> {
		return collection.every((item: V): item is W => checkFunction(item));
	}

	export function isTextChannel(channel: Discord.Channel): channel is Discord.TextChannel { return channel.type === "text"; }
}

export { DiscordUtil as Discord };

export namespace File {
	export class FileError extends Error {};
	export class FileReadError extends FileError {};
	export class FileWriteError extends FileError {};

	export async function access(file: string, mode: number = Fs.constants.F_OK): Promise<boolean> {
		return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void): void => Fs.access(file, mode, (err: Error): void => resolve(!Boolean(err))));
	}

	export namespace Read {
		export async function buffer(file: string): Promise<Buffer> {
			const readStream: Fs.ReadStream = await stream(file);
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

		export async function stream(file: string): Promise<Fs.ReadStream> {
			if (!(await access(file, Fs.constants.F_OK | Fs.constants.R_OK)))
				throw new FileReadError(`File ${file} does not exist.`);
			return Fs.createReadStream(file);
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
		const secrets: Secrets = await File.Read.json<Secrets>(secretsFile, 20);
		return <string>cache.set(secretsFile, secrets.token).get(secretsFile);
	}
}

export namespace Typing {
	export function isPromise<T = any>(object: T | Promise<T>): object is Promise<T> { return Promise.resolve<T>(object) === object; }

	export function isMapNotOfPromise<K, V = any>(map: Map<K, V | Promise<V>>): map is Map<K, V> { return !isMapOfPromise<K, V>(map); }

	export function isMapOfPromise<K, V = any>(map: Map<K, V | Promise<V>>): map is Map<K, Promise<V>> {
		for (const [key, value] of map)
			if (isPromise<V>(value))
				return true;
		return false;
	}
}

export { Queue } from "./Util/Queue";
export { Stack } from "./Util/Stack";

import * as NodeUtil from "util";

export { NodeUtil as Node };

// export namespace Node {
// 	export import Util = NodeUtil;
// }