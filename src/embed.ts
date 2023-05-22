/**
 * Imports.
 */
import { AttachmentBuilder, EmbedBuilder, TextBasedChannel } from 'discord.js';
import { FullObjectResponse, ObjectUpdatedEventArgs } from './objectUpdated.js';
import { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints.js';

/**
 * 
 */
type EmbedOptions =
{
    /**
     * 
     */
    color: number
}

/**
 * 
 * @param object 
 * @returns 
 */
function getTitle(object: FullObjectResponse)
{
    const nameProperty = object.properties["Name"]!;
    const titleProperty = object.object == "database" ? object.title : nameProperty.type == "title" ? nameProperty.title as RichTextItemResponse[] : [];
    return titleProperty[0]?.plain_text ?? "";
}

/**
 * 
 * @param channel 
 * @param objectUpdated 
 */
export async function sendEmbed(channel: TextBasedChannel, objectUpdated: ObjectUpdatedEventArgs, options: EmbedOptions)
{
    await channel.sendTyping();

    const client = objectUpdated.client;
    const object = objectUpdated.object;
    const list = objectUpdated.list;

    const author = await client.users.retrieve({ user_id: object.last_edited_by.id });
    const title = getTitle(object);

    const embed = new EmbedBuilder
    (
        {
            author: { name: author.name!, iconURL: author.avatar_url! },
            title: title,
            url: object.url,
            timestamp: object.last_edited_time,
            color: options.color
        }
    );

    await channel.send({ embeds: [ embed ] });

    /*const buffer = Buffer.from(JSON.stringify(objectUpdated, null, 2));
    const attachment = new AttachmentBuilder(buffer, { name: 'content.json' });
    await channel.send({ files: [attachment] });*/
}

/*

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
            const parent_id = top.properties["Parent task"];

            if (parent_id && parent_id.type == "relation")
            {
                let relation = (parent_id.relation as { id: string; }[])[0];
                if (relation)
                {
                    const parent = searchResponse.results.find(r => r.id == relation?.id);
                    if (parent)
                    {
                        const object = parent as ObjectResponse;
                        hierarcy.push(object);
                        titles.push(getTitle(object));
                        continue;
                    }
                }
            }
            
            topmost = true;
        }

        await channel.send(' ```json\n ' + `${JSON.stringify(titles)}` + ' ``` ');

        const pr = object.properties["Progress"];
        if (pr?.type == "formula" && pr.formula.type == "number")
        {
            const percentage = (pr.formula.number ?? 0) * 100 + "%";
            embedBuild.addFields({ name: progress, value: percentage })
        }
    }
*/