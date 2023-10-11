import { Injectable } from '@nestjs/common';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SlashCommand, SlashCommandContext, Context } from 'necord';

@Injectable()
export class LoginCommand {
  @SlashCommand({
    name: 'login',
    description: 'Login to 42 intra',
  })
  public async onLogin(@Context() [interaction]: SlashCommandContext) {
    const button = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Login')
      .setURL(`http://hack.mtlks.com:${process.env.PORT}/login/${interaction.user.id}`);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);

    return interaction.reply({ content: `Please login to 42 intra`, ephemeral: true, components: [row] });
  }
}
