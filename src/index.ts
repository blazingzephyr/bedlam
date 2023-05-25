
import { fileURLToPath } from "url";
import { Worker, isMainThread, parentPort } from "worker_threads";
import { Client } from "@notionhq/client";
import { DiscordManager } from "./discord_manager.js";
import { NotionCallback, NotionManager } from "./notion_manager.js";
import { sendEmbed } from "./embed.js";
import { NotionSearchObject } from "./utility.js";
import * as config from "./config.json" assert { type: "json" };

// Executes if this is the main thread.
// Used for Discord message processing.
if (isMainThread)
{
	// Create the Notion thread from the same file.
	const file = fileURLToPath(import.meta.url);
	const notionThread = new Worker(file);

	// Discord onKilled event.
	// Terminates the Notion thread when the Discord client shuts down.
	const killed = async () => { await notionThread.terminate(); };

	// Initialize the manager.
	// @ts-expect-error is used because of an error of the TypeScript analyser.
	const manager = new DiscordManager(config.default.discord, [killed]);
	const log = await manager.initialize();

	// Listen to the Notion updates.
	notionThread.on("message", async value =>
	{
		if (value["type"] == "updated")
		{
			sendEmbed(log,
				value["updated"] as NotionSearchObject[],
				value["objects"] as NotionSearchObject[],
				value["client"] as Client);
		}
	});
}
// Executes if this is the second thread.
// Used for Notion watching.
else
{
	// Notion onUpdated event.
	// Transfers data to the Discord thread.
	const updated: NotionCallback<"updated"> = async (updated, objects, client) =>
	{
		parentPort!.postMessage({ type: "updated", updated: updated, objects: objects, client: client });
	}

	// Initialize the manager and watch.
	// @ts-expect-error is used because of an error of the TypeScript analyser.
	const manager = new NotionManager(config.default.notion, [], [updated]);
	await manager.watch();
}