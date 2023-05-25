
import { Client } from "@notionhq/client";
import { AttachmentBuilder, TextBasedChannel } from "discord.js";
import { NotionSearchObject } from "./utility";

/**
 * 
 * @param channel
 * @param updated
 * @param objects
 * @param client
 */
export async function sendEmbed(channel: TextBasedChannel, updated: NotionSearchObject[], objects: NotionSearchObject[], client: Client)
{
	const text = JSON.stringify({ ch: channel, u: updated, o: objects, cl: client }, null, 2);
	const buffer = Buffer.from(text);
	const attachment = new AttachmentBuilder(buffer, { name: "content.json" });
	await channel.send({ files: [attachment] })
}