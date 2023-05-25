
import { Client, NotionClientError, isNotionClientError } from "@notionhq/client";
import { SearchParameters } from "@notionhq/client/build/src/api-endpoints";
import
{
	Callback,
	NotionSearchObject,
	callAll
} from "./utility.js";

/**
 * The Search endpoint error.
 */
export type NotionSearchError =
	{
		isNotionError: true, error: NotionClientError;
	} |
	{
		isNotionError: false, error: unknown;
	};

/**
 * The Search endpoint response.
 */
export type NotionSearchResponse =
	{
		isError: true, error: NotionSearchError;
	} |
	{
		isError: false, list: NotionSearchObject[];
	};

/**
 * NotionManager events.
 */
export interface NotionEvents
{
	/**
	 * Occurs when the Notion API client is ready.
	 */
	ready: [objects: NotionSearchObject[], client: Client],

	/**
	 * Occurs when a Notion resource gets updated.
	 */
	updated: [updated: NotionSearchObject[], objects: NotionSearchObject[], client: Client],

	/**
	 * Occurs when an error is thrown.
	 */
	error: [error: NotionSearchError, client: Client];
}

/**
 * Encapsulates a NotionManager event.
 */
export type NotionCallback<T extends keyof NotionEvents> = Callback<NotionEvents[T]>;

/**
 * NotionManager options.
 */
export type NotionOptions =
	{
		/**
		 * Notion integration token.
		 * Required for the usage of API.
		 */
		integration_token: string,

		/**
		 * Interval in milliseconds between Notion API requests.
		 */
		interval: number;
	};

/**
 * Notion API client wrapper.
 */
export class NotionManager
{
	/**
	 * Create a new NotionManager.
	 * @param options Manager initialization options.
	 * @param onReady Callbacks called when the Notion API client is ready.
	 * @param onUpdated Callbacks called when a Notion resource gets updated.
	 * @param onError Callbacks called when an error occurs.
	 */
	constructor(
		private readonly options: NotionOptions,
		public onReady: NotionCallback<"ready">[],
		public onUpdated: NotionCallback<"updated">[],
		public onError: NotionCallback<"error">[]
	)
	{
		this.client = new Client({ auth: options.integration_token });
	}

	/**
	 * Continuously watch for resource changes on Notion.
	 */
	public async watch(): Promise<void>
	{
		const current = new Map<string, string>();
		const searchResponse = await this.search();

		if (searchResponse.isError)
		{
			callAll(this.onError, searchResponse.error, this.client);
			return;
		}

		for (const entry of searchResponse.list)
		{
			current.set(entry.id, entry.last_edited_time);
		}

		callAll(this.onReady, searchResponse.list, this.client);

		setInterval
			(
				async () =>
				{
					let updated: NotionSearchObject[] = [];
					const searchResponse = await this.search();

					if (searchResponse.isError)
					{
						callAll(this.onError, searchResponse.error, this.client);
						return;
					}

					for (const entry of searchResponse.list)
					{
						const object = entry as NotionSearchObject;
						const requiresUpdate = !current.has(object.id) || object.last_edited_time !== current.get(object.id);

						if (requiresUpdate)
						{
							current.set(object.id, object.last_edited_time);
							updated.push(object);
						}
					}

					if (updated.length > 0)
					{
						callAll(this.onUpdated, updated, searchResponse.list, this.client);
					}
				},
				this.options.interval
			);
	}

	/**
	 * Search all pages or databases that has been shared with the integration.
	 * @returns Notion response.
	 */
	private async search(): Promise<NotionSearchResponse>
	{
		try
		{
			let searchParameters: SearchParameters = { sort: { direction: "descending", timestamp: "last_edited_time" } };
			let searchObjects: NotionSearchObject[] = [];
			let hasMore = true;

			while (hasMore)
			{
				const response = await this.client.search(searchParameters);
				const results = response.results as NotionSearchObject[];
				searchObjects.push(...results);

				hasMore = response.has_more;
				searchParameters.start_cursor = response.next_cursor ?? "";
			}

			return { isError: false, list: searchObjects };
		}
		catch (error: unknown)
		{
			if (isNotionClientError(error))
			{
				return { isError: true, error: { isNotionError: true, error } };
			}
			else
			{
				return { isError: true, error: { isNotionError: false, error } };
			}
		}
	}

	/**
	 * Notion API client.
	 */
	private client: Client;
}