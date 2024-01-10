import { Subcommand, Context, SlashCommandContext, StringSelectContext, SelectedStrings, StringSelect, Button, ButtonContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { ConsoleLogger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';
import { Specialslot } from 'src/schema/specialslot.schema';
import { getRole } from '../updateroles.command';
import { newStudentModal } from 'src/StudentService';
import { LoginCommand } from '../login.command';

function rearrangeTimeslot(timeslots: Array<Timeslot>, evaluators: Array<Evaluator>) {
  let table = new Map<string, Student[]>();

  timeslots.forEach(timeslot => table.set(timeslot.timeslot, []));
  evaluators.forEach(evaluator => {
      evaluator.timeslots.forEach(slot =>
        table.get(slot.timeslot).push(evaluator['student']));
    });
  return table;
}

function getUnderBookedSessions(timeslots: Timeslot[], evaluators: Evaluator[]) {
  const timeTable = rearrangeTimeslot(timeslots, evaluators);
  const underBookedSessions = [...timeTable.entries()]
    .filter(([time, evaluators]) => evaluators.length < 3)
    .map(([time, evaluators]) => time)
  ;

  return underBookedSessions;
}

@RushEvalCommandDecorator()
export class RushEvalCadetCommand {
  @Subcommand({
    name: 'cadet',
    description: 'Get cadets to create timeslots',
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext) {
    const logger = new ConsoleLogger('RushEvalCadetCommand');
    logger.log(`Cadet command called by ${interaction.user.id}`);
    const slotsButton = new ButtonBuilder()
      .setCustomId('cadet-fetch-slot')
      .setLabel('Open slots')
      .setStyle(ButtonStyle.Success)
      ;

    // const specialButton = new ButtonBuilder()
    //   .setCustomId('cadet-fetch-special')
    //   .setLabel('Open special slots')
    //   .setStyle(ButtonStyle.Primary)
    //   ;

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents([
        slotsButton,
        // specialButton
      ])
      ;

    const embed = new EmbedBuilder()
      .setTitle("For those who are able to volunteer for tomorrow's RUSH00 evaluations, please choose your slots. You will be getting eval points / blackholes ya!")
      .setColor('#00FFFF')
      ;

    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();
    return interaction.channel.send({
        content: `Dear ${getRole(interaction.guild, "CADET")}s`,
        embeds: [embed],
        components: [row]
      });
  }
}

@Injectable()
export class RushEvalCadetFetchSlotsComponent { 
  private readonly logger = new ConsoleLogger('RushEvalCadetFetchSlots');
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
  ) {}

  @Button('cadet-fetch-slot')
  public async onExecute(@Context() [interaction]: ButtonContext) {
    this.logger.log(`Cadet fetch slots called by ${interaction.user.id}`);
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    if (student === null) {
      return interaction.reply(LoginCommand.getLoginReply(interaction.user.id, 'New student detected'));
    }
    const timeslots = await this.timeslotModel.find().exec();
    const evaluators = await this.evaluatorModel.find().exec();
    const underBookedSessions = getUnderBookedSessions(timeslots, evaluators);
    const evaluator = await this.evaluatorModel.findOne({student: student}).exec()
      ?? await this.evaluatorModel.create({ student: student });
    const selectMap = (time: string) => ({label: time, value: time});
    const availableOptions = (underBookedSessions.length
        ? underBookedSessions.map(selectMap)
        : timeslots.map(timeslot => selectMap(timeslot.timeslot)))
      ;
    const selectedOptions = evaluator.timeslots.map(t => t.timeslot);
    const stringSelect = new StringSelectMenuBuilder()
      .setCustomId('cadet-session-select')
      .setPlaceholder(`Selected: ${selectedOptions.length ? selectedOptions : 'None'}`)
      .setMinValues(0)
      .setMaxValues(Math.min(availableOptions.length, 2))
      .setOptions(availableOptions)
      ;
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(stringSelect)
      ;

    return interaction.reply({
        content: 'Please select your timeslot for the next rush defense.',
        ephemeral: true,
        components: [row],
      });
  }
}

@Injectable()
export class RushEvalCadetStringSelectComponent {
  private readonly logger = new ConsoleLogger('cadet-session-select')
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
  ) { }

  @StringSelect('cadet-session-select')
  public async onStringSelect(@Context() [interaction]: StringSelectContext, @SelectedStrings() selected: string[]) {
    this.logger.log(interaction.user.id);
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    if (student === null) {
      return interaction.update({content: 'Please try fetching slots and register yourself as new student again.', components: []});
    }
    const timeslots = await this.timeslotModel.find().exec();
    const evaluators = await this.evaluatorModel.find().exec();
    const underBookedSessions = getUnderBookedSessions(timeslots, evaluators);

    if (underBookedSessions.length) {
      /** Check if the chosen slots contain any overbooked sessions */
      const overBooked = selected.filter(session => !underBookedSessions.includes(session));
      if (overBooked.length) {
        this.logger.log(`${interaction.user.id} Overbooked sessions: ${overBooked}`);
        return interaction.update({
            content: `**${overBooked}** are currently filled.
Please regenerate your selection by clicking on the \`Open slots\` button one more time`,
            components: []
          });
      }
    }

    const selectedTimeslots = timeslots.filter(timeslot => selected.includes(timeslot.timeslot));
    const evaluator = await this.evaluatorModel.findOne({ student: student }).exec()
      ?? await this.evaluatorModel.create({ student: student });

    evaluator.timeslots = selectedTimeslots;
    evaluator.lastCreatedTimeslotsAt = new Date();
    await evaluator.save();
    this.logger.log(`${interaction.user.id} Selected timeslots: ${selectedTimeslots.map(t => t.timeslot)}`);
    return interaction.reply({
        content: ((selectedTimeslots.length === 0)
            ? 'You have canceled your timeslots'
            : `You have selected ${selectedTimeslots.map(t => t.timeslot)}`),
        ephemeral: true
      });
  }
}

@Injectable()
export class RushEvalCadetFetchSpecialSlotsComponent {
  constructor(
    @InjectModel(Specialslot.name) private readonly specialslotModel: Model<Specialslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
  ) {}

  @Button('cadet-fetch-special')
  public async onExecute(@Context() [interaction]: ButtonContext) {
    const timeslots = await this.specialslotModel.find().exec();
    const availableOptions = timeslots.map(timeslot => ({ label: timeslot.timeslot, value: timeslot.timeslot }));

    const stringSelect = new StringSelectMenuBuilder()
      .setCustomId('cadet-session-select-special')
      .setPlaceholder('Select your timeslots')
      .setMinValues(0)
      .setMaxValues(availableOptions.length)
      .setOptions(availableOptions)
    ;

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(stringSelect)
    ;

    return interaction.reply({
        content: 'Please select your special timeslot for the next rush defense, keep in mind that this is only for special cases.',
        ephemeral: true,
        components: [row],
      });
  }
}

@Injectable()
export class RushEvalCadetSpecialStringSelectComponent {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Specialslot.name) private readonly specialslotModel: Model<Specialslot>,
  ) { }

  @StringSelect('cadet-session-select-special')
  public async onStringSelect(@Context() [interaction]: StringSelectContext, @SelectedStrings() selected: string[]) {
    const timeslots = await this.specialslotModel.find().exec();
    const selectedTimeslots = timeslots.filter(timeslot => selected.includes(timeslot.timeslot));
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();

    for (let timeslot of timeslots) {
      timeslot.evaluators = timeslot.evaluators.filter((evaluator) => evaluator.discordId !== student.discordId);
      if (selectedTimeslots.includes(timeslot)) {
        timeslot.evaluators.push(student);
      }
      await timeslot.save();
    }
    return interaction.reply({
        content: ((selected.length === 0)
            ? 'You have not selected any timeslots'
            : `You have selected ${selected}`),
        ephemeral: true
      });
  }
}
