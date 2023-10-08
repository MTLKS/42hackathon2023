
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.on('ready', (c) => {
	console.log(`🍀${c.user.tag} is online. Pika`);
});

// Define an async function to handle the "!updatemember" command
async function handleUpdateMember(message) {
  try {
    // Fetch data from the API (replace with your API URL)
    const response = await axios.get('https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-6f09c402e23f4d718eaacc5998e150377843750bdeb2939df6a2b1e87cb8f7ac&redirect_uri=https%3A%2F%2Fgithub.com%2Fnuyiep&response_type=code');
    const data = response.data;

    const currentRole = message.guild.roles.cache.find((r) => r.name === 'FLOATY');
    const amendedRole = message.guild.roles.cache.find((r) => r.name === 'CADET');

    if (!currentRole || !amendedRole) {
      message.channel.send('Roles not found. Make sure the role names are correct.');
      return;
    }

	console.log("here")
	console.log(data)
	// console.log(data.some((cadetData) => cadetData.id))

    // Iterate through members with FLOATY role and update to CADET role if they are cadets
    message.guild.members.cache.forEach((member) => {
      if (member.roles.cache.has(currentRole.id) && data.some((cadetData) => cadetData.id === member.id)) {
        member.roles
          .remove(currentRole)
          .then(() => member.roles.add(amendedRole))
          .catch((error) => {
            console.error('Error updating member:', error);
          });
      }
    });

    message.channel.send(`FLOATY members have been updated to CADET role based on API data.`);
  } catch (error) {
    console.error('Error fetching data from API:', error);
    message.channel.send('An error occurred while fetching data from the API.');
  }
}

// Add event listener for the "!updatemember" command
client.on('messageCreate', (message) => {
  if (message.author.bot) {
    return;
  }
  if (message.content === '!updatemember') {
    const allowedRole = ['PY', 'susu']; // Adjust as needed
    if (message.member.roles.cache.some((role) => allowedRole.includes(role.name))) {
      handleUpdateMember(message);
    } else {
      message.reply('Oops, you have no permission to do this 🙃');
    }
  }
});

client.login(process.env.TOKEN);
