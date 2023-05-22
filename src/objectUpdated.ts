/**
 * Imports.
 */
import { Client } from '@notionhq/client';
import { DatabaseObjectResponse, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';

/**
 * Page or Database Notion object response.
 */
export type FullObjectResponse = PageObjectResponse | DatabaseObjectResponse;

/**
 * Event args for the ObjectUpdated event.
 */
export type ObjectUpdatedEventArgs =
{
    /**
     * The updated object.
     */
    object: FullObjectResponse,

    /**
     * Collection of all updated objects.
     */
    list: FullObjectResponse[],

    /**
     * Notion API client.
     */
    client: Client
};

/**
 * Event handler for the ObjectUpdated event.
 */
export type ObjectUpdatedEventHandler = (args: ObjectUpdatedEventArgs) => void;