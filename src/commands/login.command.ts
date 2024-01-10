import { ConsoleLogger, Injectable } from '@nestjs/common';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionReplyOptions, User } from 'discord.js';
import { SlashCommand, SlashCommandContext, Context, Button, ButtonContext } from 'necord';
import { EmbedBuilder } from 'discord.js';
import { InjectModel } from '@nestjs/mongoose';
import { LoginCode } from 'src/schema/logincode.schema';
import { Model } from 'mongoose';

@Injectable()
export class LoginCommand {
  private readonly logger = new ConsoleLogger("LoginCommand");
  constructor(
    @InjectModel(LoginCode.name) private readonly loginCodeModel: Model<LoginCode>
  ) {}

  @SlashCommand({
    name: 'login',
    description: 'Login to 42 intra',
    dmPermission: false,
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

  public static async getLoginReply(discordUser: User, loginCodeModel: Model<LoginCode>, content?: string) {
    const logger = new ConsoleLogger("getLoginReply");
    const codeGenerator = async () => {
      let code = Math.floor(Math.random() * 100000000000000000).toString();

      while (await loginCodeModel.exists({ code: code })) {
        code = Math.floor(Math.random() * 100000000000000000).toString();
      }
      return code;
    }
    const port = (process.env.BOT_PORT !== undefined) ? `:${process.env.BOT_PORT}`: "";
    const existingLoginCode = await loginCodeModel.findOne({ discordId: discordUser.id });

    if (existingLoginCode !== null) {
      logger.log(`Refreshing login code for ${discordUser.username}`);
      existingLoginCode.deleteOne();
    } else {
      logger.log(`Creating login code for ${discordUser.username}`)
    }
    const loginCode = await loginCodeModel.create({
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatarUrl: discordUser.avatarURL(),
        code: await codeGenerator(),
        createdAt: new Date(),
      } satisfies LoginCode);
    logger.log(`Generated login code (${loginCode.code}) for ${discordUser.username}`);
    setTimeout(() => {
      loginCode.deleteOne();
      logger.log(`Deleted login code (${loginCode.code}) for ${discordUser.username}`);
    }, 5 * 60 * 1000);
      // }, 5 * 1000);
    const url = `${process.env.BOT_HOST}${port}/login/${loginCode.code}`;

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

    const reply: InteractionReplyOptions = {
      content: content,
      embeds: [newEmbed],
      components: [row],
      ephemeral: true,
    };
    return reply;
  }

  @Button('login')
  public async onLoginButton(@Context() [interaction]: ButtonContext) {
    return interaction.reply(await LoginCommand.getLoginReply(
      interaction.user,
      this.loginCodeModel
    )).catch((error) => {
      const logger = new ConsoleLogger("onLoginButtonClick");

      logger.error(error);
      return interaction.reply({
        ephemeral: true,
        content: 'An error occured while trying to login to 42 intra'
      });
    });
  }
}
