
import { fileURLToPath } from "url";
import { Worker, isMainThread, parentPort } from "worker_threads";
import { Client } from "@notionhq/client";
import { DiscordManager } from "./core/discord_manager.js";
import { NotionCallback, NotionManager } from "./core/notion_manager.js";
import { sendEmbed, sendError } from "./embed.js";
import { NotionError, NotionSearchObject } from "./core/utility.js";
import * as config from "./config.json" assert { type: "json" };

/**
 * Data transfered from the Notion thread to the main one.
 */
type NotionData =
	{
		/**
		* Type of the message.
		*/
		type: "updated",

		/**
		* Notion resources that have been updated.
		*/
		updated: NotionSearchObject[],

		/**
		* All Notion Search resources.
		*/
		objects: NotionSearchObject[];
	} |
	{
		/**
		* Type of the message.
		*/
		type: "error",

		/**
		* Notion Search endpoint error.
		*/
		error: NotionError
	};

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
	const discord = new DiscordManager(config.default.discord, [killed]);
	const log = await discord.initialize();

	// Declare the secondary Notion client used on embed events.
	// @ts-expect-error is used because of an error of the TypeScript analyser.
	const secondary = new Client({ auth: config.default.notion.integration_token });

	// Listen to the Notion updates.
	notionThread.on("message", async (value: NotionData) =>
	{
		if (value.type == "updated")
		{
			sendEmbed(log, discord, value.updated, value.objects, secondary);
		}
		else if (value.type == "error")
		{
			sendError(log, discord, value.error)
		}
	});
}
// Executes if this is the second thread.
// Used for Notion watching.
else
{
	// Notion onUpdated event.
	// Transfers data to the Discord thread.
	const updated: NotionCallback<"updated"> = async (updated, objects) =>
	{
		parentPort!.postMessage({ type: "updated", updated, objects });
	};

	// Notion onError event.
	const error: NotionCallback<"error"> = async (error) =>
	{
		parentPort!.postMessage({ type: "error", error });
	};

	// Initialize the manager and watch.
	// @ts-expect-error is used because of an error of the TypeScript analyser.
	const notion = new NotionManager(config.default.notion, [], [updated], [error]);
	await notion.watch();
}