import { Injectable } from '@nestjs/common';
import { SlashCommand, SlashCommandContext, Context } from 'necord';

@Injectable()
export class LoginCommand {
  @SlashCommand({
    name: 'login',
    description: 'Login to 42 API',
  })
  public async onLogin(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: `Please go to http://hack.mtlks.com:${process.env.PORT}/login/${interaction.user.id}`, ephemeral: true });
  }
}
