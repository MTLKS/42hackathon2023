import { ButtonBuilder } from "@discordjs/builders";
import { ConsoleLogger, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ActionRowBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Model } from "mongoose";
import { Button, ButtonContext, Context, SlashCommand, SlashCommandContext } from "necord";
import { Evaluator } from "src/schema/evaluator.schema";
import { RushEval } from "src/schema/rusheval.schema";
import { Student } from "src/schema/student.schema";
import { Team } from "src/schema/team.schema";

export class CleanCommand {

  @SlashCommand({
    name: 'clean',
    description: 'Clean the database',
    dmPermission: false,
  })
  public async onClean(@Context() [interaction]: SlashCommandContext) {
    const logger = new ConsoleLogger("CleanCommand");

    logger.warn(`Clean Command called by ${interaction.user.username}`);
    const newEmbed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('This will clear every data in the database. Are you sure?')
      ;
    const yes = new ButtonBuilder()
      .setCustomId('clean-database-confirmed')
      .setLabel('Yes')
      .setStyle(ButtonStyle.Danger)
      ;
    const no = new ButtonBuilder()
      .setCustomId('clean-database-rejected')
      .setLabel('No')
      .setStyle(ButtonStyle.Success)
      ;
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents([yes, no]);

    return interaction.reply({
      components: [row],
      embeds: [newEmbed],
      ephemeral: true,
    });
  }
}

@Injectable()
export class CleanDatabase {
  private readonly logger = new ConsoleLogger("CleanDatabase");
  constructor(
    @InjectModel(RushEval.name) private readonly rushEvalModel: Model<RushEval>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
  ) { }

  @Button('clean-database-confirmed')
  public async onComfirmation(@Context() [interaction]: ButtonContext) {
    this.logger.warn(`${interaction.user.username} confirmed to clean databse`);
    const teamPromise = this.teamModel.deleteMany({});
    const evaluatorPromise = this.evaluatorModel.deleteMany({});
    const embed = new EmbedBuilder()
      .setTitle("Clear Report")
      .addFields({
        name: 'Collection Name',
        value: ['team', 'evaluator'].join('\n'),
        inline: true
      }, {
        name: 'Amount Cleared',
        value: [(await teamPromise).deletedCount ?? 0, (await evaluatorPromise).deletedCount ?? 0].join("\n"),
        inline: true
      });

    this.rushEvalModel.deleteOne({});
    return interaction.update({
      content: 'Database Cleared',
      embeds: [embed],
      components: []
    });
  }

  @Button('clean-database-rejected')
  public async onRejection(@Context() [interaction]: ButtonContext) {
    return interaction.update({
      content: "Cleaning Aborted",
      embeds: [],
      components: []
    });
  }

}