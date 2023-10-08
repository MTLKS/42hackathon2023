
require('dotenv').config();

const { Client, IntentsBitField, InteractionCollector } = require('discord.js');

const client = new Client({
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent,
		// Guilds in discord means server
	]
})

client.on('ready', (c) => {
	console.log(`🤗${c.user.tag} is online`);
});

// Define an async function to handle role changes
async function handleRoleChanges(message) {
	const currentRole = message.guild.roles.cache.find((r) => r.name === 'PISCINER');
	const amendedRole = message.guild.roles.cache.find((r) => r.name === 'FLOATY');

	if (!currentRole || !amendedRole) {
		message.channel.send('Roles not found. Make sure the role names are correct.');
		return;
	}

	const membersWithCurrentRole = await message.guild.members.fetch();

	membersWithCurrentRole.forEach((member) => {
		if (member.roles.cache.has(currentRole.id)) {
			member.roles
				.remove(currentRole)
				.then(() => member.roles.add(amendedRole))
				.catch((error) => {
					console.error('Error moving member:', error);
				});
		}
	});

	message.channel.send(`The "${currentRole.name}" role has been changed to "${amendedRole.name}" for all members with that role.`);
}

client.on('messageCreate', (message) => {
	if (message.author.bot) {
		return;
	}
	if (message.content == 'plau') {
		message.reply('Pei Yun Lau');
	}
	if (message.content === '!movemembers') {
		const allowedRole = ['PY', 'susu'];
		if (message.member.roles.cache.some(role => allowedRole.includes(role.name))) {
			handleRoleChanges(message);
		} else {
			message.reply('Opps, you have no permission to do this 🙃')
		}
	}
});

client.on('interactionCreate', (interation) => {
	if (!interation.isChatInputCommand()) return ;

	if (interation.commandName == 'hello') {
		interation.reply('world')
	}
	if (interation.commandName == 'ping') {
		interation.reply('pong')
	}
	if (interation.commandName == 'mikuu') {
		interation.reply('is gay')
	}
	if (interation.commandName == 'intraid') {
		interation.reply('Lau Pei Yun [full name]\nCadet [role]\nSegmentation Slayer [coalition]')
	}
	console.log(interation);
})

client.login(process.env.TOKEN);
