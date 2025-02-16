import { ActivityType, Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
import fs from 'fs';
import auth from '../../auth.json' with { type: 'json' };
import config from '../../config.json' with { type: 'json' };
import { createMsg, createSlash } from '../helper.js';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildPresences
	]
});

client.pc = new Collection();
client.sc = new Collection();

async function initEmojis(client) {
	try {
		const app = await client.application.fetch();
		const emojis = await app.emojis.fetch();
		const emojiFiles = fs.readdirSync('./assets/emojis').filter((file) => file.endsWith('.png'));

		const map = new Map(emojis.map(emoji => [emoji.name, emoji]));

		for (const [name, emoji] of map) {
			if (!emojiFiles.includes(`${name}.png`)) {
				await emoji.delete().catch(console.error);
			}
		}

		for (const emojiFile of emojiFiles) {
			const emojiName = emojiFile.split('.')[0];

			if (map.has(emojiName)) {
				const emoji = map.get(emojiName);
				await emoji.edit({ attachment: `./assets/emojis/${emojiFile}` }).catch(console.error);
			}
			else {
				await app.emojis.create({ attachment: `./assets/emojis/${emojiFile}`, name: emojiName }).catch(console.error);
			}
		}
	}
	catch (e) {
		console.error(`Emoji Error: ${e.message}`);
	}
}

async function discord() { // Credits: Kathund

	// Commands
	const slashDir = fs.readdirSync('./src/discord/commands/slash').filter((file) => file.endsWith('.js'));
	const slashCommands = [];
	for (const slashFile of slashDir) {
		const slashCommand = (await import(`./commands/slash/${slashFile}`)).default;
		const slashCmd = createSlash(slashCommand);
		client.sc.set(slashCmd.data.name, slashCmd);
		slashCommands.push(slashCmd.data.toJSON());
	}

	const rest = new REST({ version: '10' }).setToken(auth.token);
	await rest.put(Routes.applicationCommands(Buffer.from(auth.token.split('.')[0], 'base64').toString('ascii')), { body: slashCommands });

	const plainDir = fs.readdirSync('./src/discord/commands/plain').filter(file => file.endsWith('.js'));
	for (const plainFile of plainDir) {
		const plainCmd = (await import(`./commands/plain/${plainFile}`)).default;
		client.pc.set(plainCmd.name, plainCmd);
	};

	// Events
	const eventDir = fs.readdirSync('./src/discord/events').filter(file => file.endsWith('.js'));
	for (const eventFile of eventDir) {
		const event = (await import(`./events/${eventFile}`)).default;
		client.on(event.name, (...args) => event.execute(...args));
	};

	// Login
	client.login(auth.token);

	client.on('ready', async () => {
		await initEmojis(client);

		if (config.logsChannel) {
			const channel = client.channels.cache.get(config.logsChannel);
			channel.send({ embeds: [createMsg({ desc: '**Bot is Online!**' })] });
		}
		if (config.guild) {
			client.user.setActivity(config.guild, {
				type: ActivityType.Watching
			});
		}
		else {
			if (config.logsChannel) {
				const channel = client.channels.cache.get(config.logsChannel);
				client.user.setActivity(channel.guild.name, {
					type: ActivityType.Watching
				});
			}
		}
		console.log('Bot is online!');
	});
}

export { client, discord };
