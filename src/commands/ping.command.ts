import { ConsoleLogger, Injectable } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';
import { SlashCommand, SlashCommandContext, Context } from 'necord';

@Injectable()
export class PingCommand {
  private readonly logger = new ConsoleLogger(PingCommand.name);
  @SlashCommand({
    name: 'ping',
    description: 'Ping!',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {

    // Create a MessageEmbed for your response
    const newEmbed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle(':ping_pong:   Pong!')

    this.logger.debug(`${interaction.user.username} Pinged!`);
    return interaction.reply({ content: '', ephemeral: true, embeds: [newEmbed] });
  }
}
