/**
 * Imports.
 */
import { Client } from '@notionhq/client';
import { DatabaseObjectResponse, PageObjectResponse, SearchResponse } from '@notionhq/client/build/src/api-endpoints.js';

/**
 * Page or Database Notion object response
 */
export type ObjectResponse = PageObjectResponse | DatabaseObjectResponse;

/**
 * Event handler for the ObjectUpdated event.
 */
export type ObjectUpdatedEventHandler = (object: ObjectResponse, searchResponse: SearchResponse, client: Client) => void;