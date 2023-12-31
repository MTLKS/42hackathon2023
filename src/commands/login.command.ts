import { ConsoleLogger, Injectable } from '@nestjs/common';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SlashCommand, SlashCommandContext, Context, Button, ButtonContext } from 'necord';
import { EmbedBuilder } from 'discord.js';

@Injectable()
export class LoginCommand {
  @SlashCommand({
    name: 'login',
    description: 'Login to 42 intra',
  })
  public async onLogin(@Context() [interaction]: SlashCommandContext) {
    try {
      const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setLabel('Login')
        .setCustomId('login')
        ;
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);
      await interaction.deferReply({ ephemeral: true });
      await interaction.deleteReply();
      return interaction.channel.send({
        content: 'Click on the button below to generate link to connect to 42 intra',
        components: [row]
      });
    } catch (error) {
      const logger = new ConsoleLogger("LoginButton");
      
      logger.error(error);
      if (interaction.replied === true) {
        logger.debug('Premature reply going on?');
      }
      else if (interaction.deferred === true) {
        return interaction.editReply({
          content: 'An error occured generating login button'
        });
      }
    }
  }

  @Button('login')
  public async onLoginButton(@Context() [interaction]: ButtonContext) {
    const port = (process.env.BOT_PORT !== undefined) ? `:${process.env.BOT_PORT}`: "";
    const url = `${process.env.BOT_HOST}${port}/login/${interaction.user.id}`

    try {
      const newEmbed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('Login to 42 intra')
        .setDescription('Click on the button below to login to 42 intra')
        .setURL(url)
        ;

      const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('Login')
        .setURL(url)
        ;
      
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

      return interaction.reply({
          ephemeral: true,
          embeds: [newEmbed],
          components: [row]
        });
    } catch (error) {
      const logger = new ConsoleLogger("onLoginButtonClick");

      logger.error(error);
      return interaction.reply({
        ephemeral: true,
        content: 'An error occured while trying to login to 42 intra'
      });
    }
  }
}
