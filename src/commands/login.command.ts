import { Injectable } from '@nestjs/common';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SlashCommand, SlashCommandContext, Context } from 'necord';
import { EmbedBuilder } from 'discord.js';

@Injectable()
export class LoginCommand {
  @SlashCommand({
    name: 'login',
    description: 'Login to 42 intra',
  })
  public async onLogin(@Context() [interaction]: SlashCommandContext) {
    const port = (process.env.PORT !== undefined) ? `:${process.env.PORT}`: "";
    const url = `${process.env.HOST}${port}/login/${interaction.user.id}`

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
      console.error(error);
      return interaction.reply({
        ephemeral: true,
        content: 'An error occured while trying to login to 42 intra'
      });
    }
  }
}
