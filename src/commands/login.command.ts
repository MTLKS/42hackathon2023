import { Injectable } from '@nestjs/common';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SlashCommand, SlashCommandContext, Context } from 'necord';
import { Embed, EmbedBuilder, embedLength } from 'discord.js';

@Injectable()
export class LoginCommand {
  @SlashCommand({
    name: 'login',
    description: 'Login to 42 intra',
  })
  public async onLogin(@Context() [interaction]: SlashCommandContext) {
    
    const newEmbed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('Login to 42 intra')
      .setDescription('Click on the button below to login to 42 intra')
      .setURL(`http://hack.mtlks.com:${process.env.PORT}/login/${interaction.user.id}`)
    ;

    const button = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Login')
      .setURL(`http://hack.mtlks.com:${process.env.PORT}/login/${interaction.user.id}`);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);

    return interaction.reply({
      ephemeral: true,
      embeds: [newEmbed],
      components: [row] });
  }
}
