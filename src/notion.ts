/**
 * Imports.
 */
import { Client } from '@notionhq/client';
import { SearchParameters } from '@notionhq/client/build/src/api-endpoints.js';
import { ObjectResponse, ObjectUpdatedEventHandler } from './objectUpdated.js'

/**
 * Notion API client.
 */
let client: Client;

/**
 * Search query options.
 */
let searchParameters: SearchParameters;

/**
 * Collection of page last update timestamps.
 */
let lastUpdated: Map<string, string>;

/**
 * Initializes Notion client with the given environmental variables.
 * @param authToken Notion integration token.
 */
export async function initializeNotion(authToken: string)
{
    lastUpdated = new Map<string, string>();
    client = new Client({ auth: authToken });
    searchParameters = {};

    const list = await client.search(searchParameters);
    for (const entry of list.results)
    {
        const object = entry as ObjectResponse;
        lastUpdated.set(object.id, object.last_edited_time);
    }
}

/**
 * Continuously watch for object updates and raise an event when it happens.
 * @param objectUpdated Event raised on an object update. 
 * @param interval Interval between Notion API requests (in ms).
 */
export async function watch(objectUpdated: ObjectUpdatedEventHandler, interval: number)
{
    setInterval
    (
        async () =>
        {
            const list = await client.search(searchParameters);
            for (const entry of list.results)
            {
                const object = entry as ObjectResponse;
                const requiresUpdate = !lastUpdated.has(object.id) || object.last_edited_time !== lastUpdated.get(object.id);

                if (requiresUpdate)
                {
                    lastUpdated.set(object.id, object.last_edited_time);
                    objectUpdated(object, list, client);
                }
            }
        },
        interval
    )
}