/**
 * Imports.
 */
import { Client, TextBasedChannel } from 'discord.js';

/**
 * Discord API client initialization options.
 */
type DiscordOptions =
{
    /**
     * Bearer token used to log into Discord.
     */
    token: string,

    /**
     * Resolvable client intents.
     * Determined by the configuration. Defaults to all.
     */
    intents: number,

    /**
     * Log channel ID.
     */
    log: string
}

/**
 * Initialize a Discord client.
 * @param options Initialization options.
 * @returns Client and the log channel.
 */
export async function initialize(options: DiscordOptions)
{
    const client = new Client({ intents: options.intents });
    await client.login(options.token);
    
    const log = await client.channels.fetch(options.log) as TextBasedChannel;
    return { client, log };
}