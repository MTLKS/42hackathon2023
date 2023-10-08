import { Subcommand, Context, SlashCommandContext, StringOption, Options } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';
import { Team } from 'src/schema/team.schema';
import { EmbedBuilder } from 'discord.js';

export class TimeslotDto {
  @StringOption({
      name: 'timeslot',
      description: 'Timeslot to query',
      required: false
  })
  timeslot: string;
}

@RushEvalCommandDecorator()
export class RushEvalInfoCommand {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>, 
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @Subcommand({
    name: 'info',
    description: 'Get current info about rush eval',
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext, @Options() { timeslot }: TimeslotDto) {
    console.log(timeslot);
    console.log(timeslot == '10:00AM');
    if (['10:00AM', '11:00AM', '2:00PM', '3:00PM', '4:00PM', '5:00PM'].includes(timeslot)) {
      console.log('Entered timeslot');
      const evaluators = await this.evaluatorModel.find({ 'timeslots.timeslot': timeslot }).exec();
      const teams = await this.teamModel.find({ 'timeslot.timeslot': timeslot }).exec();

      console.log(evaluators);
      console.log(teams);

      let evaluatorsValue = evaluators.map((evaluator) => evaluator.student.intraName).join('\n');
      evaluatorsValue = evaluatorsValue == '' ? 'None' : evaluatorsValue;

      let teamsValue = teams.map((team) => team.teamLeader.intraName).join('\n');
      teamsValue = teamsValue == '' ? 'None' : teamsValue;


      const newEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Rush eval info')
        .setDescription('Current rush eval info')
        .addFields(
          { name: 'Evaluators', value: evaluatorsValue },
          { name: 'Teams (Leaders)', value: teamsValue },
        );

      return interaction.reply({ content: '', ephemeral: true, embeds: [newEmbed] });
    } else {
      const timeslots = await this.timeslotModel.find().exec();
      const openCount = await this.evaluatorModel.aggregate([{$unwind: '$timeslots'},{$group: {_id: '$timeslots.timeslot',count: { $sum: 1 }}},{$project: {_id: 0,timeslot: '$_id',count: 1}}]);
      const takenCount = await this.teamModel.aggregate([{$unwind: '$timeslot'},{$group: {_id: '$timeslot.timeslot',count: { $sum: 1 }}},{$project: {_id: 0,timeslot: '$_id',count: 1}}]);
      var timeslotsData = [];
      timeslots.forEach(timeslot => {
        let currentOpen = openCount.find((timeslotCount) => timeslotCount.timeslot === timeslot.timeslot);
        let currentClosed = takenCount.find((timeslotCount) => timeslotCount.timeslot === timeslot.timeslot);

        let currentOpenCount = 0;
        let currentClosedCount = 0;
        let finalCount = 0;
        if (currentOpen && currentClosed) {
          currentOpenCount = currentOpen.count;
          currentClosedCount = currentClosed.count;
          finalCount = currentOpen.count - currentClosed.count;
        } else if (currentOpen && !currentClosed) {
          currentOpenCount = currentOpen.count;
          currentClosedCount = 0;
          finalCount = currentOpen.count;
        }
        
        timeslotsData.push({ name: timeslot.timeslot, value: `Opened: ${currentOpenCount}\nTaken: ${currentClosedCount}\nAvailable: ${finalCount}`, inline: true });
      });

      const newEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Rush eval info')
        .setDescription('Current rush eval info')
        .addFields(
          ...timeslotsData,
        );

      return interaction.reply({ content: '', ephemeral: true, embeds: [newEmbed] });
    }
  }
}