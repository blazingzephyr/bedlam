
import { DatabaseObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

/**
 * A Notion resource returned by the Search endpoint.
 * A parent or child page or a database that has been shared with an integration.
 */
export type NotionSearchObject = PageObjectResponse | DatabaseObjectResponse;

/**
 * Encapsulates an asynchronous method that has any amount of parameters and returns a value of the type specified by the TResult constraint.
 */
export type Callback<T = [], TResult = void> = T extends any[] ? (...args: T) => Promise<TResult> : (arg: T) => Promise<TResult>;

/**
 * Invoke an array of callbacks with one or more provided arguments.
 * @param callbacks An array of callbacks.
 * @param args Passed arguments.
 * @returns Results of the callbacks.
 */
export async function callAll<T extends any[] = [], TResult = void>(
	...params: T extends any[] ? [callbacks: Callback<T, TResult>[], ...args: T] :
								 [callbacks: Callback<T, TResult>[], arg: T]
): Promise<TResult[]>
{
	let results: TResult[] = [];
	for (const callback of params[0])
	{
		const result = await callback(params[1]);
		results.push(result);
	}

	return results;
}