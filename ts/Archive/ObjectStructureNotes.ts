
/*
This is the object structure of what needs to be archived.
*/

import * as Discord from "discord.js";
import * as Util from "./Util";

namespace ArchiveObjects {
	type Snowflake = Discord.Snowflake;
	type SnowflakeCollection = Util.GenericCollection<Snowflake, Snowflake>;

	interface Emoticon {
		id: Snowflake;
		identifier: string;
		name: string;
		url: string;
	}

	interface Guild {
		emoticons: SnowflakeCollection; // Emoticon
		id: Snowflake;
		iconURL?: string;
		memberCount: number;
		name: string;
		region: string;
		splashURL?: string;
	}

	interface Member {
		colorRole?: Snowflake; // Role
		displayColor: number;
		displayHexColor: string;
		displayName: string;
		highestRole: Snowflake; // Role
		hoistRole?: Snowflake; // Role
		id: Snowflake;
		nickname?: string;
		user: Snowflake; // User
	}

	interface Message {
		attachments: SnowflakeCollection; // MessageAttachment
		author: Snowflake; // User
		channel: Snowflake // TextChannel | DMChannel | GroupDMChannel
		cleanContent: string;
		content: string;
		createdAt: Date;
		createdTimestamp: number;
		editedAt?: Date;
		editedTimestamp?: number;
		edits: Array<Message>; // contains cached historic versions of the message, shouldn't create a loop
		embeds: Array<MessageEmbed>;
		guild: Snowflake; // Guild
		id: Snowflake;
		member?: Snowflake; // Member
		mentions: MessageMentions;
		pinned: boolean;
		reactions: SnowflakeCollection; // MessageReaction
		system: boolean;
		type: string;
		webhookID?: Snowflake; // Webhook
	}

	interface MessageAttachment {
		filename: string;
		filesize: number;
		height?: number;
		id: Snowflake;
		message: Snowflake; // Message
		proxyURL: string;
		url: string;
		width?: number;
	}

	interface MessageEmbed {
		author?: MessageEmbedAuthor;
		color: number;
		createdAt: Date;
		createdTimestamp: number;
		description?: string;
		fields: Array<MessageEmbedField>;
		footer?: MessageEmbedFooter;
		hexColor: string;
		image: MessageEmbedImage;
		message: Snowflake; // Message
		provider?: MessageEmbedProvider;
		thumbnail?: MessageEmbedThumbnail;
		title?: string;
		type: string;
		url: string;
		video?: MessageEmbedVideo;
	}

	interface MessageEmbedAuthor {
		iconURL: string;
		name: string;
		url: string;
	}

	interface MessageEmbedField {
		inline: boolean;
		name: string;
		value: string;
	}

	interface MessageEmbedFooter {
		iconURL: string;
		proxyIconUrl: string;
		text: string;
	}

	interface MessageEmbedImage {
		height: number;
		proxyURL: string;
		url: string;
		width: number;
	}

	interface MessageEmbedProvider {
		name: string;
		url: string;
	}

	interface MessageEmbedThumbnail {
		height: number;
		proxyURL: string;
		url: string;
		width: number;
	}

	interface MessageEmbedVideo {
		height: number;
		url: string;
		width: number;
	}

	interface MessageMentions {
		channels: SnowflakeCollection; // GuildChannel
		everyone: boolean;
		members: SnowflakeCollection; // Member
		roles: SnowflakeCollection; // Role
		users: SnowflakeCollection; // User
	}

	interface MessageReaction {
		count: number;
		emoticon: Snowflake; // Emoticon | ReactionEmoticon
		message: Snowflake; // Message
		users: SnowflakeCollection; // User
	}

	interface Role {
		color: number;
		guild: Snowflake; // Guild
		hexColor: string;
		id: Snowflake;
		members: SnowflakeCollection; // Member
		name: string;
	}

	interface TextChannel {
		guild: Snowflake; // Guild
		id: Snowflake;
		members: SnowflakeCollection; // Member
		messages: SnowflakeCollection; // Message
		name: string;
		nsfw: boolean;
		topic?: string;
	}

	interface ReactionEmoticon {
		id: Snowflake;
		identifier: string;
		name: string;
	}

	interface User {
		avatarURL?: string;
		bot: boolean;
		defaultAvatarURL: string;
		displayAvatarURL: string;
		id: Snowflake;
		tag: string;
		username: string;
	}

	interface Webhook {
		avatar: string;
		channelID: Snowflake; // Channel
		guildID: Snowflake; // Guild
		name: string;
		owner: Snowflake | Object; // User
		token: string;
	}
}

interface File {
	 
}