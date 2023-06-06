
import clone from "clone";
import { Client } from "@notionhq/client";
import * as config from "./config.json" assert { type: "json" };

import
	{
		PartialUserObjectResponse,
		RichTextItemResponse,
		UserObjectResponse
	} from "@notionhq/client/build/src/api-endpoints";

import
	{
		APIEmbed,
		APIEmbedField,
		EmbedBuilder,
		TextBasedChannel
	} from "discord.js";

import
	{
		NotionError,
		NotionSearchObject,
        processError
	} from "./core/utility.js";

// Notion API utilities.
type EmptyObject = Record<string, never>;

type AnyUserObjectResponse = EmptyObject | PartialUserObjectResponse | UserObjectResponse;

type SelectColor = "default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
type NumberFormat = "number" | "number_with_commas" | "percent" | "dollar" | "canadian_dollar" | "singapore_dollar" | "euro" | "pound" | "yen" | "ruble" | "rupee" | "won" | "yuan" | "real" | "lira" | "rupiah" | "franc" | "hong_kong_dollar" | "new_zealand_dollar" | "krona" | "norwegian_krone" | "mexican_peso" | "rand" | "new_taiwan_dollar" | "danish_krone" | "zloty" | "baht" | "forint" | "koruna" | "shekel" | "chilean_peso" | "philippine_peso" | "dirham" | "colombian_peso" | "riyal" | "ringgit" | "leu" | "argentine_peso" | "uruguayan_peso" | "peruvian_sol";

type SelectPropertyResponse =
	{
		id: string,
		name: string,
		color: SelectColor;
	} | null;

type DateResponse =
	{
		start: string,
		end: string | null,
		time_zone?: string | null;
	};

type Relation = { id: string; };

/**
 * Convert a Notion number response to a string.
 * @param number Number response.
 * @returns String representation of the number.
 */
function getNumber(number: number | { format: NumberFormat; } | null)
{
	if (number)
	{
		if (typeof (number) == "object")
		{
			const format = number.format;
			return format[0]!.toUpperCase() + format.slice(1);
		}
		else
		{
			return number.toString();
		}
	}

	return "Empty";
}

/**
 * Convert a Notion date to a string.
 * @param date Date response or an empty object.
 * @returns String representation of the date.
 */
function getDate(date: DateResponse | null | EmptyObject)
{
	const start = date?.start;
	const end = date?.end;

	if (start)
	{
		if (end)
		{
			return `<t:${Date.parse(start)}>\n<t:${Date.parse(end)}>`;
		}
		else
		{
			return `<t:${Date.parse(start)}>`;
		}
	}

	return "Empty";
}

/**
 * Get Notion users' usernames.
 * @param client Client, used for retrieving the user.
 * @param users User responses to acquire ids from.
 * @returns String representation of the users, if exists; otherwise, empty.
 */
async function getUsername(client: Client, users: EmptyObject | AnyUserObjectResponse[])
{
	if (Array.isArray(users))
	{
		const names: string[] = [];
		for (const user of users)
		{
			const person = await client.users.retrieve({ user_id: user.id });
			names.push(person.name ?? "Empty");
		}

		return names.length > 0 ? names.join(", ") : "Empty";
	}

	return "Empty";
}

/**
 * Convert Notion rich text to a string.
 * @param rich_text Rich text or an empty object.
 * @returns Plain text string, if exists; otherwise, empty.
 */
function getRichText(rich_text: EmptyObject | RichTextItemResponse[])
{
	if (Array.isArray(rich_text))
	{
		const text: string[] = [];
		for (const entry of rich_text)
		{
			text.push(entry.plain_text);
		}

		return text.length > 0 ? text.join("") : "Empty";
	}

	return "Empty";
};

/**
 * Convert Notion a Notion select or multi-select to a string.
 * @param multiSelect The select property.
 * @returns String representation of the select property, if exists; otherwise, empty.
 */
function getSelect(multiSelect: SelectPropertyResponse[] | null)
{
	if (multiSelect)
	{
		const value: string[] = [];
		for (const select of multiSelect)
		{
			value.push(select ? select.name : "Empty");
		}

		return value.length > 0 ? value.join(", ") : "Empty";
	}

	return "Empty";
}

/**
 * Gets a title of a Notion Search resource.
 * @param object A Notion Search resource.
 * @returns Title of the resource, if exists; otherwise, empty.
 */
function getTitle(object: NotionSearchObject)
{
	if (object.object == "database")
	{
		return getRichText(object.title);
	}
	else
	{
		const keys = Object.keys(object.properties);
		const titleKey = keys.find(p => p.toLowerCase() == "title" || p.toLowerCase() == "name")!;

		const titleProperty = object.properties[titleKey] ?? { type: null };
		if (titleProperty.type == "title")
		{
			return getRichText(titleProperty.title);
		}
	}

	return "Empty";
}

/**
 * Convert Notion relations to a string.
 * @param objects Notion Search objects.
 * @param relations Relation IDs.
 * @returns String representation of the relations.
 */
function getRelations(objects: NotionSearchObject[], relations: Relation[])
{
	const links: string[] = [];
	for (const relation of relations)
	{
		const object = objects.find(p => p.id == relation.id)!;
		const title = getTitle(object);		

		links.push(`${title} \u2014 ${object.url}`);
	}

	return links.length > 0 ? links.join("\n") : "Empty";
}

/**
 * Send an embed with a Notion resource to a text channel.
 * @param channel Channel to send the embed to.
 * @param updated Notion resources that have been updated.
 * @param objects All Notion Search resources.
 * @param client Notion API client for additional calls.
 */
export async function sendEmbed(channel: TextBasedChannel, updated: NotionSearchObject[], objects: NotionSearchObject[], client: Client)
{
	const resources = objects;
	for (const resource of updated)
	{
		try
		{
			await channel.sendTyping();

			const embeds: APIEmbed[] = [];
			const keys = Object.keys(resource.properties);

			do
			{
				// @ts-expect-error is used because of an error of the TypeScript analyser.
				const embed: APIEmbed = clone(config.default.embed);
				embed.fields = [];
				embed.timestamp = resource.last_edited_time;

				for (let i = 0; i < 25 && keys.length > 0; i++)
				{
					const key = keys.shift()!;
					const property = resource.properties[key]!;
					const field: APIEmbedField = { name: key, value: "Empty" };

					switch (property.type)
					{
						case "checkbox": field.value = property.checkbox.toString(); break;
						case "created_by": field.value = await getUsername(client, [property.created_by]); break;
						case "created_time": field.value = property.created_time.toString(); break;
						case "date": field.value = getDate(property.date); break;
						case "email": field.value = property.email?.toString() ?? "Empty"; break;
						case "last_edited_by": field.value = await getUsername(client, [property.last_edited_by]); break;
						case "last_edited_time": field.value = property.last_edited_time.toString(); break;
						case "multi_select": field.value = getSelect(property.multi_select as SelectPropertyResponse[]); break;
						case "number": field.value = getNumber(property.number); break;
						case "people": field.value = await getUsername(client, property.people); break;
						case "phone_number": field.value = property.phone_number?.toString() ?? "Empty"; break;
						case "relation": field.value = getRelations(resources, Array.isArray(property.relation) ? property.relation : []); break;
						case "rich_text": field.value = getRichText(property.rich_text); break;
						case "select": field.value = getSelect([property.select as SelectPropertyResponse | null]); break;
						case "status": field.value = getSelect([property.status as SelectPropertyResponse | null]); break;
						case "title": field.value = getRichText(property.title); break;
						case "url": field.value = property.url?.toString() ?? "Empty"; break;

						case "files":
							{
								if (Array.isArray(property.files))
								{
									const urls: string[] = [];
									for (const file of property.files)
									{
										switch (file.type)
										{
											case "external": urls.push(file.external.url); break;
											case "file": urls.push(file.file.url); break;
											default: break;
										}
									}

									field.value = urls.join("\n");
								}

								break;
							}

						case "formula":
							{
								const formula = property.formula as {
									type: "string";
									string: string | null;
								} | {
									type: "date";
									date: {
										start: string;
										end: string | null;
									} | null;
								} | {
									type: "number";
									number: number | null;
								} | {
									type: "boolean";
									boolean: boolean | null;
								};

								switch (formula.type)
								{
									case "string": field.value = formula.string ?? "Empty"; break;
									case "date": field.value = getDate(formula.date); break;
									case "number": field.value = getNumber(formula.number); break;
									case "boolean": field.value = formula.boolean?.toString() ?? "Empty"; break;
								}

								break;
							}

						case "rollup":
							{
								if (property.rollup)
								{
									const rollup = property.rollup as {
										type: "number";
										number: number | null;
										function: string;
									} | {
										type: "date";
										date: DateResponse | null;
										function: string;
									} | {
										type: "array";
										array: ({
											type: "title";
											title: RichTextItemResponse[];
										} | {
											type: "rich_text";
											rich_text: RichTextItemResponse[];
										} | {
											type: "people";
											people: AnyUserObjectResponse[];
										} | {
											type: "relation";
											relation: { id: string; }[];
										})[];
										function: string;
									};

									switch (rollup.type)
									{
										case "number": field.value = getNumber(rollup.number); break;
										case "date": field.value = getDate(rollup.date); break;

										case "array":
											{
												const text: string[] = [];
												for (const entry of rollup.array)
												{
													switch (entry.type)
													{
														case "title": text.push(getRichText(entry.title)); break;
														case "rich_text": text.push(getRichText(entry.rich_text)); break;
														case "people": text.push(await getUsername(client, entry.people)); break;
														case "relation": text.push(getRelations(resources, entry.relation)); break;
													}
												}

												field.value = text.join("\n");
												break;
											}
									}
								}

								break;
							}
					}

					embed.fields.push(field);
				}

				embeds.push(embed);
			}
			while (keys.length > 0);

			const author = await client.users.retrieve({ user_id: resource.last_edited_by.id });
			const icon = resource.icon;
			const cover = resource.cover;

			embeds[0]!.author = { name: author.name ?? "Empty" };
			embeds[0]!.title = getTitle(resource);
			embeds[0]!.url = resource.url;

			if (author.avatar_url)
			{
				embeds[0]!.author.icon_url = author.avatar_url;
			}

			if (icon)
			{
				switch (icon.type)
				{
					case "file": embeds[0]!.thumbnail = { url: icon.file.url }; break;
					case "external": embeds[0]!.thumbnail = { url: icon.external.url }; break;

					case "emoji":
						{
							const hex = icon.emoji.codePointAt(0)!.toString(16);
							const url = `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${hex}.png`;
							embeds[0]!.thumbnail = { url, proxy_url: url, width: 72, height: 72 };
							break;
						}
				}
			}

			if (cover)
			{
				switch (cover.type)
				{
					case "file": embeds[0]!.image = { url: cover.file.url }; break;
					case "external": embeds[0]!.image = { url: cover.external.url }; break;
				}
			}

			await channel.send({ embeds });
		}
		catch (error: unknown)
		{
			sendError(channel, processError(error));
		}		
	}
}

/**
 * Propagates a notification about an error.
 * @param channel Channel to send the error to.
 * @param error An error.
 */
export async function sendError(channel: TextBasedChannel, error: NotionError)
{
	// @ts-expect-error is used because of an error of the TypeScript analyser.
	const embed: APIEmbed = config.default.error.embed;
	embed.timestamp = new Date().toISOString();
	embed.fields = [
		// @ts-expect-error is used because of an error of the TypeScript analyser.
		{ name: config.default.error.isNotion, value: error.isNotionError.toString() },

	// @ts-expect-error is used because of an error of the TypeScript analyser.
		{ name: config.default.error.message, value: error.isNotionError ? error.error.message : "```" + JSON.stringify(error.error) + "```" }
	];

	await channel.send({ embeds: [embed] });
}