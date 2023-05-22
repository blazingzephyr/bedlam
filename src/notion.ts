/**
 * Imports.
 */
import { Client } from '@notionhq/client';
import { FullObjectResponse, ObjectUpdatedEventHandler } from './objectUpdated.js'
import { SearchParameters } from '@notionhq/client/build/src/api-endpoints.js';

/**
 * Notion API client initialization options.
 */
type NotionOptions =
{
    /**
     * Notion integration token.
     */
    integrationToken: string,

    /**
     * Interval between Notion API requests (in ms).
     */
    interval: number
}

/**
 * Run /search on Notion and return the results.
 * @param client Notion API client used for the search.
 * @returns Search results.
 */
async function search(client: Client)
{
    const searchParameters: SearchParameters = { sort: { direction: "descending", timestamp: "last_edited_time" } };
    const entries: FullObjectResponse[] = [];
    let hasMore = true;

    while (hasMore)
    {
        const response = await client.search(searchParameters);
        const results = response.results as FullObjectResponse[];
        entries.push(...results);

        hasMore = response.has_more;
        searchParameters.start_cursor = response.next_cursor ?? "";
    }

    return entries;
}

/**
 * Initialize Notion client.
 * Then continuously watch for object updates and raise an event when it happens.
 * @param objectUpdated Event raised when an object gets updated.
 * @param options Initialization options.
 */
export async function watch(objectUpdated: ObjectUpdatedEventHandler, options: NotionOptions)
{
    const current = new Map<string, string>();
    const updated: FullObjectResponse[] = [];

    const client = new Client({ auth: options.integrationToken });
    const list = await search(client);

    for (const entry of list)
    {
        current.set(entry.id, entry.last_edited_time);
    }

    setInterval
    (
        async () =>
        {
            const list = await search(client);
            for (const entry of list)
            {
                const object = entry as FullObjectResponse;
                const requiresUpdate = !current.has(object.id) || object.last_edited_time !== current.get(object.id);

                if (requiresUpdate)
                {
                    current.set(object.id, object.last_edited_time);
                    updated.push(object);
                }
            }

            for (const entry of updated)
            {
                objectUpdated({ object: entry, list: list, client: client });
            }

            updated.length = 0;
        },
        options.interval
    )
}