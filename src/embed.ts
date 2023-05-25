
import { Client } from "@notionhq/client";
import { AttachmentBuilder, TextBasedChannel } from "discord.js";
import { NotionSearchObject } from "./core/utility";
import { NotionSearchError } from "./core/notion_manager";

/**
 * 
 * @param channel
 * @param updated
 * @param objects
 * @param client
 */
export async function sendEmbed(channel: TextBasedChannel, updated: NotionSearchObject[], objects: NotionSearchObject[], client: Client)
{
	const text = JSON.stringify({ channel, updated, objects, client }, null, 2);
	const buffer = Buffer.from(text);
	const attachment = new AttachmentBuilder(buffer, { name: "content.json" });
	await channel.send({ files: [attachment] });
}

/**
 * 
 * @param channel
 * @param error
 */
export async function sendError(channel: TextBasedChannel, error: NotionSearchError)
{
	const text = JSON.stringify({ error }, null, 2);
	const buffer = Buffer.from(text);
	const attachment = new AttachmentBuilder(buffer, { name: "content.json" });
	await channel.send({ content: "An error has occured!", files: [attachment] });
}