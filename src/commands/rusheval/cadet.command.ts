import { Subcommand, Context, SlashCommandContext, StringSelectContext, SelectedStrings, StringSelect } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';

@RushEvalCommandDecorator()
export class RushEvalCadetCommand {
  constructor(@InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>) { }

  @Subcommand({
    name: 'cadet',
    description: 'Get cadets to create timeslots',
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext) {
    const timeslots = await this.timeslotModel.find().exec();
    var timeslotOptions = [];
    timeslots.forEach(timeslot => {
      timeslotOptions.push({ label: timeslot.timeslot, value: timeslot.timeslot });
    });

    const stringSelect = new StringSelectMenuBuilder()
      .setCustomId('cadet')
      .setPlaceholder('Select your timeslot')
      .setMinValues(0)
      .setMaxValues(6)
      .setOptions(timeslotOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(stringSelect);

    return interaction.reply(
      {
        content: '<@&1160129265115873321> Please select your timeslot for the next rush defense',
        ephemeral: false,
        components: [row],
      }
    );
  }
}

@Injectable()
export class RushEvalCadetStringSelectComponent {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>, 
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>
  ) { }

  @StringSelect('cadet')
  public async onStringSelect(@Context() [interaction]: StringSelectContext, @SelectedStrings() selected: string[]) {
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    const timeslots = await this.timeslotModel.find().exec();
    var selectedTimeslots = [];
    timeslots.forEach(timeslot => {
      if (selected.includes(timeslot.timeslot)) {
        selectedTimeslots.push(timeslot);
      }
    });
    const evaluator = await this.evaluatorModel.findOne({ student: student }).exec();
    if (evaluator) {
      evaluator.timeslots = <[Timeslot]>selectedTimeslots;
      await evaluator.save();
    } else {
      const newEvaluator = new this.evaluatorModel({ student: student, timeslots: selectedTimeslots });
      await newEvaluator.save();
    }

    if (selected.length == 0) {
      return interaction.reply({ content: 'You have not selected any timeslots', ephemeral: true });
    }
    return interaction.reply({ content: `You have selected ${selected}`, ephemeral: true });
  }
}