/**
 * Imports.
 */
import * as config from './config.json' assert { type: 'json' };
import { initialize as initializeDiscord } from './discord.js';
import { watch as watchNotion } from './notion.js'
import { sendEmbed } from './embed.js'

/**
 * Log in to Discord.
 */
const channel = await initializeDiscord(config.default.discord);

/**
 * Send the startup message.
 */
if (config.default.startup)
{
    await channel.log.send(config.default.startup);
}

/**
 * Watch Notion updates.
 */
watchNotion(args => sendEmbed(channel.log, args, config.default.embed), config.default.notion);