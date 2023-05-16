/**
 * Imports.
 */
import { config } from 'dotenv';
import { initializeDiscord, sendDiscordEmbed } from './discord.js';
import { initializeNotion, watch } from './notion.js';

/**
 * Loads environmental variables.
 */
config();

/**
 * Initializes Notion API client.
 */
initializeNotion(process.env.NOTION_INTEGRATION_TOKEN!);

/**
 * Initializes Discord client.
 */
initializeDiscord
(
    process.env.DISCORD_TOKEN!,
    process.env.DISCORD_SERVER!,
    process.env.DISCORD_CHANNEL!,
    process.env.DISCORD_STARTUP_MESSAGE!,
    parseInt(process.env.DISCORD_EMBED_COLOR!),
    process.env.DISCORD_PARENT_HEADER!,
    process.env.DISCORD_PROGRESS_HEADER!
);

/**
 * Continuously watch for page updates and send a Discord message when it happens.
 */
watch(sendDiscordEmbed, parseInt(process.env.INTERVAL!));