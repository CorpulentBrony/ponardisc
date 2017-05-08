import { Config } from "../Config";
import * as Discord from "discord.js";
import * as Events from "events";
import * as Util from "../Util";

export class Objects extends Events implements Objects.Interface {
	private readonly cache: Cache.InstanceType;
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

		if (Cache.instances.has({ client: this.client, config: this.config }))
			this.cache = Cache.instances.get({ client: this.client, config: this.config })!;
		else
			Cache.instances.set({ client: this.client, config: this.config }, this.cache = {});
		this.emit("ready", this);
	}

	public get admins(): Map<Config.UserId, Promise<Discord.User>> {
		if (this.cache.admins !== undefined)
			return this.cache.admins;
		return this.cache.admins = this.config.admins.reduce<Map<Config.UserId, Promise<Discord.User>>>((map: Map<Config.UserId, Promise<Discord.User>>, admin: Config.UserId): Map<Config.UserId, Promise<Discord.User>> => {
			return map.set(admin, this.client.fetchUser(admin));
		}, new Map<Config.UserId, Promise<Discord.User>>());
	}

	public get guilds(): Discord.Collection<Config.GuildId, Discord.Guild> {
		if (this.cache.guilds !== undefined)
			return this.cache.guilds;
		return this.cache.guilds = this.client.guilds.filter((guild: Discord.Guild, id: Config.GuildId): boolean => this.config.hasGuild(id));
	}

	private channelUpdate(channel: Discord.Channel): void {
		if (Util.Discord.isTextChannel(channel) && channel.guild.available && this.config.hasChannel(channel.guild.id, channel.id))
			this.clearCache("channels");
	}

	private clearCache(type: keyof Cache.InstanceType): void {
		this.cache[type] = undefined;
		this.emit(type + "Modified");
	}

	public getChannels(guild: Config.GuildId): Discord.Collection<Config.GuildId, Discord.TextChannel> {
		if (this.cache.channels !== undefined && this.cache.channels.has(guild))
			return this.cache.channels.get(guild)!;
		else if (this.cache.channels === undefined)
			this.cache.channels = new Map<Config.GuildId, Discord.Collection<Config.ChannelId, Discord.TextChannel>>();
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
			return this.cache.channels.set(guild, result).get(guild)!;
		throw new Error("This is highly unexpected, the channels returned by the Discord client are not all TextChannels.");
	}

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

namespace Cache {
	type InstanceLookupType = { client: Discord.Client, config: Config };
	export type InstanceType = {
		admins?: Map<Config.UserId, Promise<Discord.User>>,
		channels?: Map<Config.GuildId, Discord.Collection<Config.ChannelId, Discord.TextChannel>>,
		guilds?: Discord.Collection<Config.GuildId, Discord.Guild>
	};

	export const instances: Map<InstanceLookupType, InstanceType> = new Map<InstanceLookupType, InstanceType>();
}

/*
{ discriminator: '8909',
  tag: 'Corpulent Brony#8909',
  username: 'Corpulent Brony',
  toString: '<@81203047132307456>' }
*/