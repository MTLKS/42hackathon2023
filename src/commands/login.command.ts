import { Injectable } from '@nestjs/common';
import { SlashCommand, SlashCommandContext, Context } from 'necord';

@Injectable()
export class LoginCommand {
  private createId(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }
  
  @SlashCommand({
    name: 'login',
    description: 'Login to 42 API',
  })
  public async onLogin(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    const loginId = this.createId(8);

    return interaction.editReply({ content: `Please go to http://hack.mtlks.com:${process.env.PORT}/login/${loginId}` });
  }
}
