import { Subcommand, Context, SlashCommandContext, StringSelectContext, SelectedStrings, StringSelect, Button, ButtonContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SelectMenuComponentOptionData } from 'discord.js';
import { ConsoleLogger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';
import { Specialslot } from 'src/schema/specialslot.schema';
import { getRole } from '../updateroles.command';
import { LoginCommand } from '../login.command';
import { LoginCode } from 'src/schema/logincode.schema';

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
    .filter(([_, evaluators]) => evaluators.length < 3)
    .map(([time, _]) => time)
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
    logger.log(`Cadet command called by ${interaction.user.username}`);
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
      .setTitle("For those who are able to volunteer for tomorrow's rush-01 evaluations, please choose your slots. You will be getting eval points / blackholes ya!")
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
    @InjectModel(LoginCode.name) private readonly loginCodeModel: Model<LoginCode>,
  ) { }

  @Button('cadet-fetch-slot')
  public async onExecute(@Context() [interaction]: ButtonContext) {
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    if (student === null) {
      return interaction.reply(await LoginCommand.getLoginReply(
        interaction.user,
        this.loginCodeModel,
        'New student detected'
      ));
    }
    this.logger.log(`${student.intraName} fetched for available slot`);
    const timeslots = await this.timeslotModel.find().exec();
    const evaluator = await this.evaluatorModel.findOne({ student: student }).exec()
      ?? await this.evaluatorModel.create({ student: student });
    const slotStatus = new Map<string, object>(
      (await this.evaluatorModel.aggregate([
        {$unwind: "$timeslots"},
        {$group: {_id: "$timeslots.timeslot", count: {$sum: 1}}},
        {$project: {time: "$_id", openedCount: "$count", _id: 0}},
      ]).exec())
      .map(({time, openedCount}) => [time, openedCount])
    );

    const availableOptions = timeslots.map(({timeslot: time}): SelectMenuComponentOptionData => ({
        label: time,
        value: time,
        description: `${slotStatus.get(time) ?? 0} Opened`,
        emoji: evaluator.timeslots.find(({timeslot: t}) => t === time) ? '✅' : undefined,
      })
    );
    const selectedOptions = evaluator.timeslots.map(t => t.timeslot);
    const stringSelect = new StringSelectMenuBuilder()
      .setCustomId('cadet-session-select')
      .setPlaceholder(`Selected: ${selectedOptions.length ? selectedOptions : 'None'}`)
      .setMinValues(0)
      .setMaxValues(2)
      .setOptions(availableOptions)
      ;
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(stringSelect)
      ;

    return interaction.reply({
      content: 'Please select your timeslot for the next rush-01 defense.',
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
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    if (student === null) {
      return interaction.update({ content: 'Please try fetching slots and register yourself as new student again.', components: [] });
    }
    this.logger.log(`${student.intraName} Selected: ${selected}`);
    const timeslots = await this.timeslotModel.find().exec();
    const selectedTimeslots = timeslots.filter(timeslot => selected.includes(timeslot.timeslot));
    const evaluator = await this.evaluatorModel.findOne({ student: student }).exec()
      ?? await this.evaluatorModel.create({ student: student });

    evaluator.timeslots = selectedTimeslots;
    evaluator.lastCreatedTimeslotsAt = new Date();
    await evaluator.save();
    this.logger.log(`${student.intraName} Selected timeslots: ${selectedTimeslots.map(t => t.timeslot)}`);
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
  ) { }

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
