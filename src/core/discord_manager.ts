
import { Callback, callAll } from "./utility.js";
import
	{
		APIEmbed,
		BitFieldResolvable,
		Client, GatewayIntentsString,
		InteractionReplyOptions,
		LocalizationMap,
		MessageCreateOptions,
		REST,
		Routes,
		SlashCommandBuilder,
		TextBasedChannel
	} from "discord.js";

/**
 * Slash command initialization options.
 */
export type SlashCommandOptions =
	{
		/**
		 * The name of the command.
		 */
		name: string,

		/**
		 * The name localizations of the command.
		 */
		name_localizations: LocalizationMap | null,

		/**
		 * The description of the command.
		 */
		description: string,

		/**
		 * The description localizations of the command.
		 */
		description_localizations: LocalizationMap | null,

		/**
		 * The set of permissions represented as a bit set for the command.
		 */
		default_member_permissions: string | bigint | number | null;

		/**
		 * Indicates whether the command is available in direct messages with the application.
		 */
		dm_permission?: boolean | null,

		/**
		 * Whether the command is NSFW.
		 */
		nsfw: boolean | undefined;
	};

/**
 * DiscordManager options.
 */
export type DiscordOptions =
	{
		/**
		 * API client ID.
		 */
		client_id: string,

		/**
		 * Token used to log into Discord.
		 */
		token: string,

		/**
		 * API intents.
		 */
		intents: BitFieldResolvable<GatewayIntentsString, number>,

		/**
		 * Owner ID.
		 */
		owner: string,

		/**
		 * Log channel ID.
		 */
		log: string,

		/**
		 * Startup message.
		 */
		startup?: MessageCreateOptions | null,

		/**
		 * '/kill' slash command options.
		 */
		kill: SlashCommandOptions,

		/**
		 * '/kill' denial options.
		 */
		kill_denied: InteractionReplyOptions;

		/**
		 * '/kill' reply.
		 */
		kill_reply: InteractionReplyOptions;
	};

/**
 * Discord API client wrapper.
 */
export class DiscordManager
{
	/**
	 * Create a new Discord manager.
	 * @param options Manager initialization options.
	 * @param onKilled Callbacks called when when the '/kill' interaction is requested.
	 */
	constructor(
		public readonly options: DiscordOptions,
		onKilled: Callback<Client>[]
	)
	{
		this.client = new Client({ intents: options.intents });
		this.rest = new REST().setToken(options.token);

		const killOptions = options.kill;
		this.kill = new SlashCommandBuilder()
			.setName(killOptions.name)
			.setNameLocalizations(killOptions.name_localizations)
			.setDescription(killOptions.description)
			.setDescriptionLocalizations(killOptions.description_localizations)
			.setDMPermission(killOptions.dm_permission)
			.setDefaultMemberPermissions(killOptions.default_member_permissions)
			.setNSFW(killOptions.nsfw);

		this.client.on("interactionCreate", async interaction =>
		{
			if (interaction.isCommand() && interaction.commandName == killOptions.name)
			{
				if (interaction.user.id != options.owner)
				{
					const reply = options.kill_denied;
					if (reply.embeds && reply.embeds.length > 0)
					{
						const owner = await this.client.users.fetch(options.owner);
						const embed = reply.embeds[0] as APIEmbed;
						embed.author = { name: owner.tag, icon_url: owner.displayAvatarURL() }
					}

					await interaction.reply(reply);
				}
				else
				{
					await interaction.reply(options.kill_reply);
					this.client.destroy();
					callAll(onKilled, this.client);
				}
			}
		});
	}

	/**
	 * Log into Discord, update the slash commands and fetch the channel.
	 * @returns Log channel.
	 */
	async initialize(): Promise<TextBasedChannel>
	{
		await this.client.login(this.options.token);
		const channel = await this.client.channels.fetch(this.options.log);
		const textChannel = channel as TextBasedChannel;

		await this.rest.put(Routes.applicationCommands(this.options.client_id), { body: [this.kill] });

		if (this.options.startup)
		{
			await textChannel.send(this.options.startup);
		}

		return textChannel;
	}

	/**
	 * Underlying Discord API client.
	 */
	get apiClient(): Client
	{
		return this.client;
	}

	/**
	 * Discord API client.
	 */
	private client: Client;

	/**
	 * REST API client.
	 */
	private rest: REST;

	/**
	 * '/kill' slash command.
	 */
	private kill: SlashCommandBuilder;
}