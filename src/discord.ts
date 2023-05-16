/**
 * Imports.
 */
import { Client as NotionClient, isFullDatabase, isFullPage } from '@notionhq/client';
import { DatabaseObjectResponse, RichTextItemResponse, SearchResponse, UserObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { Client, Guild, TextBasedChannel, EmbedBuilder, APIEmbedField } from 'discord.js';
import { ObjectResponse } from './objectUpdated.js';

/**
 * Discord API client.
 * Uses all GatewayIntents.
 */
let discord: Client;

/**
 * Log server ID
 */
let guild: Guild;

/**
 * Log channnel ID
 */
let channel: TextBasedChannel;

/**
 * Message embed builder
 */
let embedBuild: EmbedBuilder;

/**
 * 'Parent' embed header string.
 */
let parent: string;

/**
 * 'Progress' embed header string.
 */
let progress: string;

/**
 * Initializes Discord client and logs into Discord using Bearer token.
 * @param token Bearer token
 * @param server Server ID
 * @param channel Channel ID
 * @param message Startup message
 * @param color Embed color
 * @param parentHeader 'Parent' embed header string
 * @param progressHeader 'Progress' embed header string
 * 
 */
export async function initializeDiscord(token: string, guildId: string, channelId: string, message: string, color: number, parentHeader: string, progressHeader: string)
{
    discord = new Client({ intents: 524287 });
    await discord.login(token);

    guild = await discord.guilds.fetch(guildId);
    channel = await guild.channels.fetch(channelId) as TextBasedChannel;
    await channel.send(message);

    embedBuild = new EmbedBuilder({ color: color });
    parent = parentHeader;
    progress = progressHeader;
}

/**
 * 
 * @param object 
 * @returns 
 */
function getTitle(object: ObjectResponse)
{
    const nameProperty = object.properties["Name"]!;
    const titleProperty = object.object == "database" ? object.title : nameProperty.type == "title" ? nameProperty.title as RichTextItemResponse[] : [];
    return titleProperty[0]?.plain_text ?? "";
}

/**
 * 
 * Send a Discord embed.
 * @param object Object passed on the ObjectUpdated.
 * @param searchResponse Notion API response.
 */
export async function sendDiscordEmbed(object: ObjectResponse, searchResponse: SearchResponse, notionClient: NotionClient)
{
    await channel.sendTyping();
    
    const title = getTitle(object);
    const author = await notionClient.users.retrieve({ user_id: object.last_edited_by.id });

    embedBuild
        .setAuthor({ name: author.name!, iconURL: author.avatar_url! })
        .setTitle(title)
        .setURL(object.url)
        .setTimestamp(Date.parse(object.last_edited_time))
        .setFields([]);

    if (object.icon && object.icon.type != "emoji")
    {
        embedBuild.setThumbnail(object.icon.type == "external" ? object.icon.external.url : object.icon.file.url);
    }

    if (object.cover)
    {
        embedBuild.setImage(object.cover.type == "external" ? object.cover.external.url : object.cover.file.url);
    }

    if (object.object == "page")
    {
        let topmost = false;
        let titles: string[] = [];
        let hierarcy: ObjectResponse[] = [ object ];

        while(!topmost)
        {
            const top = hierarcy[hierarcy.length - 1]!;
            const parent = searchResponse.results.find
            (
                r =>
                {
                    console.log(getTitle(top));
                    console.log(top.parent.type);
                    switch (top.parent.type)
                    {
                        case "database_id":
                            return r.id == top.parent.database_id;
                        
                        case "page_id":
                            return r.id == top.parent.page_id;

                        default:
                            return false;
                    }
                }
            );

            if (parent)
            {
                const object = parent as ObjectResponse;
                hierarcy.push(object);
                titles.push(getTitle(object));

            }
            else
            {
                topmost = true;
            }
        }

        await channel.send(' ```json\n ' + `${JSON.stringify(titles)}` + ' ``` ');

        const pr = object.properties["Progress"];
        if (pr?.type == "formula" && pr.formula.type == "number")
        {
            const percentage = (pr.formula.number ?? 0) * 100 + "%";
            embedBuild.addFields({ name: progress, value: percentage })
        }
    }

    await channel.send({ embeds: [embedBuild] });
}