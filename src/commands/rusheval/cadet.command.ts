import { Subcommand, Context, SlashCommandContext, StringSelectContext, SelectedStrings, StringSelect, Button, ButtonContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';


/**
 * Has to do what has to be done because we couldn't refactor the code in time confidently
 */
function rearrange_timeslot(timeslots: Array<Timeslot>, evaluators: Array<Evaluator>) {
  let table = new Map<string, Student[]>();

  timeslots.forEach(timeslot =>
    table.set(timeslot.timeslot, []));
  evaluators.forEach(evaluator => {
      evaluator.timeslots.forEach(slot =>
        table.get(slot.timeslot).push(evaluator['student']));
    });
  return table;
}


@RushEvalCommandDecorator()
export class RushEvalCadetCommand {
  @Subcommand({
    name: 'cadet',
    description: 'Get cadets to create timeslots',
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext) {
    const button = new ButtonBuilder()
      .setCustomId('cadet-fetch-slot')
      .setLabel('Fetch available slots')
      .setStyle(ButtonStyle.Primary)
    ;
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button)
    ;
    
    return interaction.reply({
        content: "Rush eval slots",
        components: [row]
      });
  }
}

@Injectable()
export class RushEvalCadetFetchSlotsComponent { 
  constructor(
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
  ) {}

  @Button('cadet-fetch-slot')
  public async onExecute(@Context() [interaction]: ButtonContext) {
    const timeslots = await this.timeslotModel.find().exec();
    const evaluators = await this.evaluatorModel.find().exec();
    const time_table = rearrange_timeslot(timeslots, evaluators);
    const underbooked_session = [...time_table.entries()]
      .filter(([time, evaluators]) => evaluators.length < 3)
      .map(([time, evaluators]) => time)
    ;
    const selectMap = (time: string) => {
      return { label: time, value: time };
    }
    const availableOptions = (underbooked_session.length
        ? underbooked_session.map(selectMap)
        : timeslots.map(timeslot => selectMap(timeslot.timeslot)))
    ;
    const stringSelect = new StringSelectMenuBuilder()
      .setCustomId('cadet')
      .setPlaceholder('Select your timeslot')
      .setMinValues(0)
      .setMaxValues(6)
      .setOptions(availableOptions)
    ;
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(stringSelect)
    ;

    return interaction.reply({
        content: 'Please select your timeslot for the next rush defense',
        ephemeral: true,
        components: [row],
      });
  }
}

@Injectable()
export class RushEvalCadetStringSelectComponent {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
  ) { }

  @StringSelect('cadet')
  public async onStringSelect(@Context() [interaction]: StringSelectContext, @SelectedStrings() selected: string[]) {
    const timeslots = await this.timeslotModel.find().exec();
    const selectedTimeslots: any[] = timeslots.filter(timeslot => selected.includes(timeslot.timeslot));
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
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
