import { Subcommand, Context, SlashCommandContext, Options } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Timeslot, TimeslotAutocompleteInterceptor, TimeslotDto } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';
import { Team } from 'src/schema/team.schema';
import { EmbedBuilder } from 'discord.js';
import { ConsoleLogger, UseInterceptors } from '@nestjs/common';

@RushEvalCommandDecorator()
export class RushEvalInfoCommand {
  private readonly logger = new ConsoleLogger(RushEvalInfoCommand.name);
  constructor(
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @UseInterceptors(TimeslotAutocompleteInterceptor)
  @Subcommand({
    name: 'info',
    description: 'Get current info about rush eval',
  })
  public async onCommandCall(@Context() [interaction]: SlashCommandContext, @Options() { timeslot }: TimeslotDto) {
    this.logger.log(`Info command called by ${interaction.user.username} arg(${timeslot})`);
    try {
      const embed = timeslot
        ? await this.createTimeslotInfoEmbed(timeslot)
        : await this.createTimeslotOverviewEmbed();

      embed.setColor('#00FFFF');
      return interaction.reply({embeds: [embed], ephemeral: true});
    } catch (error) {
      return interaction.reply({content: error.message, ephemeral: true});
    }
  }

  private async createTimeslotOverviewEmbed(): Promise<EmbedBuilder> {
    const timeslots = await this.timeslotModel.find().exec();
    const convertToMap = (arr: {timeslot: string, count: number}[]) => {
      const map = new Map(timeslots.map(({ timeslot }) => [timeslot, 0]));

      arr.forEach(({ timeslot, count }) => map.set(timeslot, count));
      return map;
    };
    const tableOpened = convertToMap(await this.evaluatorModel.aggregate([
      { $unwind: '$timeslots' },
      { $group: { _id: '$timeslots.timeslot', count: { $sum: 1 } } },
      { $project: { _id: 0, timeslot: '$_id', count: "$count" } }
    ]));
    const tableTaken = convertToMap(await this.teamModel.aggregate([
      { $unwind: '$timeslot' },
      { $group: { _id: '$timeslot.timeslot', count: { $sum: 1 } } },
      { $project: { _id: 0, timeslot: '$_id', count: "$count" } }
    ]));
    const timeslotsData = timeslots.map(({timeslot}) => {
      const opened = tableOpened.get(timeslot);
      const taken = tableTaken.get(timeslot);
      const available = opened - taken;

      return {
        name: `__${timeslot}__ (${available > 0 ? `+${available}` : available})`,
        value: `${taken ? `**${taken}** taken` : "None"} / ${opened ? `**${opened}** opened` : "None"}`,
      };
    });
    const embed = new EmbedBuilder()
      .setTitle('Rush Eval Timeslot Overview')
      .addFields(...timeslotsData);

    return embed;
  }

  private async createTimeslotInfoEmbed(timeslot: string): Promise<EmbedBuilder> {
    const timeslots = await this.timeslotModel.find().exec();

    if (timeslots.some(({ timeslot: t }) => t === timeslot) === false) {
      throw new Error(`Timeslot ${timeslot} doesn't exist`);
    }
    const evaluators = await this.evaluatorModel.find({ 'timeslots.timeslot': timeslot }).exec();
    const teams = await this.teamModel.find({ 'timeslot.timeslot': timeslot }).exec();

    let evaluatorsValue = evaluators.map((evaluator) => `${evaluator.student.intraName} (**x${evaluator.timeslots.length}**)`).join('\n');
    evaluatorsValue = evaluatorsValue == '' ? 'None' : evaluatorsValue;

    let teamsValue = teams.map((team) => team.teamLeader.intraName).join('\n');
    teamsValue = teamsValue == '' ? 'None' : teamsValue;

    const embed = new EmbedBuilder()
      .setTitle(`Rush Eval ${timeslot} Details`)
      .addFields(
        { name: 'Evaluators', value: evaluatorsValue },
        { name: 'Teams (Leaders)', value: teamsValue },
      );

    return embed;
  }
}