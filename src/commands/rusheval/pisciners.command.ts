import { Subcommand, Context, SlashCommandContext, Button, ButtonContext, StringSelect, StringSelectContext, SelectedStrings } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';
import { ButtonBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { Injectable } from '@nestjs/common';

@RushEvalCommandDecorator()
export class RushEvalPiscinersCommand {
  @Subcommand({
    name: 'pisciners',
    description: 'Get pisciners to choose timeslots',
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext) {
    const button = new ButtonBuilder()
      .setCustomId('piscinersButton')
      .setLabel('Get timeslots')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);

    return interaction.reply(
      {
        content: '<@&1160129648437493800> Please select your timeslot for the next rush defense',
        ephemeral: true, 
        components: [row],
      }
    );
  }
}

@Injectable()
export class RushEvalPiscinersButtonComponent {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>, 
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>
  ) { }

  @Button('piscinersButton')
  public async onButton(@Context() [interaction]: ButtonContext) {
    const timeslots = await this.timeslotModel.find().exec();
    var timeslotOptions = [];
    timeslots.forEach(timeslot => {
      timeslotOptions.push({ label: timeslot.timeslot, value: timeslot.timeslot });
    });

    const stringSelect = new StringSelectMenuBuilder()
      .setCustomId('piscinersStringSelect')
      .setPlaceholder('Select your timeslot')
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions(timeslotOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(stringSelect);

    return interaction.reply(
      {
        content: 'Please select your timeslot for the next rush defense',
        ephemeral: true,
        components: [row],
      }
    );
  }
}

@Injectable()
export class RushEvalPiscinersStringSelectComponent {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>, 
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>
  ) { }

  @StringSelect('piscinersStringSelect')
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