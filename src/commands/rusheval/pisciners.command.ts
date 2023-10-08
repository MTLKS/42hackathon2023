import { Subcommand, Context, SlashCommandContext, Button, ButtonContext, StringSelect, StringSelectContext, SelectedStrings } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';
import { ButtonBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { Injectable } from '@nestjs/common';
import { Team } from 'src/schema/team.schema';

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
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @Button('piscinersButton')
  public async onButton(@Context() [interaction]: ButtonContext) {
    const timeslots = await this.timeslotModel.find().exec();
    const availableCount = await this.evaluatorModel.aggregate([{$unwind: '$timeslots'},{$group: {_id: '$timeslots.timeslot',count: { $sum: 1 }}},{$project: {_id: 0,timeslot: '$_id',count: 1}}]);
    const unavailableCount = await this.teamModel.aggregate([{$unwind: '$timeslot'},{$group: {_id: '$timeslot.timeslot',count: { $sum: 1 }}},{$project: {_id: 0,timeslot: '$_id',count: 1}}]);
    var timeslotOptions = [];
    timeslots.forEach(timeslot => {
      let currentAvailable = availableCount.find((timeslotCount) => timeslotCount.timeslot === timeslot.timeslot);
      let currentUnavailable = unavailableCount.find((timeslotCount) => timeslotCount.timeslot === timeslot.timeslot);

      let finalCount = 0;
      if (currentAvailable && currentUnavailable) {
        finalCount = currentAvailable.count - currentUnavailable.count;
      } else if (currentAvailable && !currentUnavailable) {
        finalCount = currentAvailable.count;
      }

      if (finalCount > 0)
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
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @StringSelect('piscinersStringSelect')
  public async onStringSelect(@Context() [interaction]: StringSelectContext, @SelectedStrings() selected: string[]) {
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    const availableCount = await this.evaluatorModel.aggregate([{$unwind: '$timeslots'},{$group: {_id: '$timeslots.timeslot',count: { $sum: 1 }}},{$project: {_id: 0,timeslot: '$_id',count: 1}}]);
    const unavailableCount = await this.teamModel.aggregate([{$unwind: '$timeslot'},{$group: {_id: '$timeslot.timeslot',count: { $sum: 1 }}},{$project: {_id: 0,timeslot: '$_id',count: 1}}]);
    let currentAvailable = availableCount.find((timeslot) => timeslot.timeslot === selected[0]);
    let currentUnavailable = unavailableCount.find((timeslot) => timeslot.timeslot === selected[0]);

    let finalCount = 0;
    if (currentAvailable && currentUnavailable) {
      finalCount = currentAvailable.count - currentUnavailable.count;
    } else if (currentAvailable && !currentUnavailable) {
      finalCount = currentAvailable.count;
    }

    if (finalCount == 0) {
      return interaction.update({ content: `Sorry, timeslot ${selected[0]} is full, please try again.`, components: [] });
    }

    const selectedTimeslot = await this.timeslotModel.findOne({ timeslot: selected[0] }).exec();
    const team = await this.teamModel.findOne({ teamLeader: student }).exec();

    if (team) {
      team.timeslot = selectedTimeslot;
      await team.save();
    } else {
      const newTeam = new this.teamModel({ teamLeader: student, timeslot: selectedTimeslot });
      await newTeam.save();
    }
    
    return interaction.update({ content: `You have selected ${selected}`, components: [] });
  }
}