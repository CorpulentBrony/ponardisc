import { Config } from "../Config";
import * as Discord from "discord.js";
import * as Events from "events";
import * as Util from "../Util";

export class Objects extends Events implements Objects.Interface {
	private _admins: Util.Map<Config.UserId, Promise<Discord.User>> | undefined;
	private _channels: Util.Map<Config.GuildId, Discord.Collection<Config.ChannelId, Discord.TextChannel>> | undefined;
	private _guilds: Discord.Collection<Config.GuildId, Discord.Guild> | undefined;
	private readonly client: Discord.Client;
	private readonly config: Config;

	constructor(config: Config, client: Discord.Client) {
		super();
		[this.client, this.config] = [client, config];
		this.config.on("adminsModified", (): void => this.clearCache("admins"));
		this.config.on("guildsModified", (): void => {
			this.clearCache("guilds");
			this.clearCache("channels");
		});
		this.client.on("channelUpdate", (oldChannel: Discord.Channel, newChannel: Discord.Channel): void => this.channelUpdate(newChannel));
		this.client.on("guildUpdate", (oldGuild: Discord.Guild, newGuild: Discord.Guild): void => this.guildUpdate(newGuild));
		this.emit("ready", this);
	}

	public get admins(): Util.Map<Config.UserId, Promise<Discord.User>> {
		if (this._admins !== undefined)
			return this._admins;
		return this._admins = this.config.admins.reduce<Util.Map<Config.UserId, Promise<Discord.User>>>((map: Util.Map<Config.UserId, Promise<Discord.User>>, admin: Config.UserId): Util.Map<Config.UserId, Promise<Discord.User>> => {
			return map.set(admin, this.client.fetchUser(admin));
		}, new Util.Map<Config.UserId, Promise<Discord.User>>());
	}

	public get channels(): Util.Map<Config.GuildId, Discord.Collection<Config.ChannelId, Discord.TextChannel>> {
		if (this._channels !== undefined)
			return this._channels;
		return this._channels = new Util.Map<Config.GuildId, Discord.Collection<Config.ChannelId, Discord.TextChannel>>();
	}

	public get guilds(): Discord.Collection<Config.GuildId, Discord.Guild> {
		if (this._guilds !== undefined)
			return this._guilds;
		return this._guilds = this.client.guilds.filter((guild: Discord.Guild, id: Config.GuildId): boolean => this.config.hasGuild(id));
	}

	private channelUpdate(channel: Discord.Channel): void {
		if (Util.Discord.isTextChannel(channel) && channel.guild.available && this.config.hasChannel(channel.guild.id, channel.id))
			this.clearCache("channels");
	}

	private clearCache(type: "admins" | "channels" | "guilds"): void {
		(<any>this)["_" + type] = undefined;
		this.emit(type + "Modified");
	}

	public getAdmins(): Util.Map<Config.UserId, Promise<Discord.User>> { return this.admins; }

	public getChannels(guild: Config.GuildId): Discord.Collection<Config.GuildId, Discord.TextChannel> {
		if (this.channels.has(guild))
			return this.channels.get(guild)!;
		let result: Discord.Collection<Config.ChannelId, Discord.Channel> | undefined = undefined;

		if (this.guilds.has(guild)) {
			const guildObject: Discord.Guild | undefined = this.guilds.get(guild);

			if (guildObject !== undefined)
				result = guildObject.channels.filter((channel: Discord.Channel, id: Config.ChannelId): boolean => this.config.hasChannel(guild, id));
		} 

		if (result === undefined) {
			const emptyChannelCollection: Discord.Collection<Config.ChannelId, Discord.Channel> = this.client.channels.clone();
			emptyChannelCollection.clear();
			result = emptyChannelCollection;
		}

		if (Util.Discord.isCollectionOf<Discord.TextChannel, Config.ChannelId, Discord.Channel>(result, Util.Discord.isTextChannel))
			return this.channels.set(guild, result).get(guild)!;
		throw new Error("This is highly unexpected, the channels returned by the Discord client are not all TextChannels.");
	}

	public getGuilds(): Discord.Collection<Config.GuildId, Discord.Guild> { return this.guilds; }

	private guildUpdate(guild: Discord.Guild): void {
		if (guild.available && this.config.hasGuild(guild.id))
			this.clearCache("guilds");
	}
}

export namespace Objects {
	export interface Interface {
		on(event: "adminsModified", listener: () => void): this;
		on(event: "channelsModified", listener: () => void): this;
		on(event: "guildsModified", listener: () => void): this;
		on(event: "ready", listener: (objects: Objects) => void): this;
	}
}