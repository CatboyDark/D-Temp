import { Events, Team } from 'discord.js';
import { createMsg, readConfig } from '../helper.js';

export default {
	name: Events.InteractionCreate,

	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			try {
				const command = interaction.client.sc.get(interaction.commandName);
				await command.execute(interaction);
			}
			catch (e) {
				console.error(e);
				const config = readConfig();
				const channel = await interaction.client.channels.fetch(config.logsChannel);
				const app = await interaction.client.application.fetch();

				await channel.send({
					content: `<@${app.owner instanceof Team ? app.owner.ownerId : app.owner.id}>`,
					embeds: [createMsg({
						color: 'Red',
						title: 'A Silly Has Occured!',
						desc: `\`${e.message}\`\n\n-# If you believe this is a bug, please contact <@622326625530544128>.`
					})]
				});

				const userError = createMsg({ embeds: [createMsg({
					color: 'Red',
					title: 'Oops!',
					desc: 'That wasn\'t supposed to happen. Staff has been notified.'
				})] });

				if (interaction.replied || interaction.deferred) {
					return interaction.followUp({ embeds: [userError] });
				}
				return interaction.reply({ embeds: [userError] });
			}
		}
	}
};
