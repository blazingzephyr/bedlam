
import { DiscordManager } from "./core/discord_manager.js";
import { NotionCallback, NotionManager } from "./core/notion_manager.js";
import { sendEmbed, sendError } from "./embed.js";
import * as config from "./config.json" assert { type: "json" };

// Discord onKilled event.
// Terminates the Notion thread when the Discord client shuts down.
const killed = async () => process.kill(process.pid);

// Initialize the manager.
// @ts-expect-error is used because of an error of the TypeScript analyser.
const discord = new DiscordManager(config.default.discord, [killed]);
const log = await discord.initialize();

// Notion onUpdated event.
const updated: NotionCallback<"updated"> = async (updated, objects, client) => sendEmbed(log, updated, objects, client);

// Notion onError event.
const error: NotionCallback<"error"> = async error => sendError(log, error);

// Initialize the manager and watch.
// @ts-expect-error is used because of an error of the TypeScript analyser.
const notion = new NotionManager(config.default.notion, [], [updated], [error]);
await notion.watch();