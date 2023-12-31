import { Subcommand, Context, SlashCommandContext, Button, ButtonContext, StringSelect, StringSelectContext, SelectedStrings, Modal, ModalContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';
import { ButtonBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import { Team } from 'src/schema/team.schema';
import { getRole } from '../updateroles.command';
import { SpecRequest } from 'src/schema/specrequest.schema';
import { Specialslot } from 'src/schema/specialslot.schema';
import { time } from 'console';

@RushEvalCommandDecorator()
export class RushEvalPiscinersCommand {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @Subcommand({
    name: 'pisciners',
    description: 'Get pisciners to choose timeslots',
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext) {
    // // Hardcoded new team
    // const tryTeam = await this.teamModel.findOne({ 'teamLeader.intraName': 'hqixeo' }).exec();
    // if (tryTeam == null) {
    //   console.log('Creating new team')
    //   const teamLeader = await this.studentModel.findOne({ intraName: 'plau' }).exec();
    //   const teamMember = await this.studentModel.findOne({ intraName: 'hqixeo' }).exec();
    //   const newTeam = new this.teamModel({ teamLeader: teamLeader, teamMembers: [teamMember] });
    //   await newTeam.save();
    // }

    const button = new ButtonBuilder()
      .setCustomId('piscinersButton')
      .setLabel('Get timeslots')
      .setStyle(ButtonStyle.Primary)
    ;

    const specialButton = new ButtonBuilder()
      .setCustomId('piscinersSpecialButton')
      .setLabel('Request for special timeslot')
      .setStyle(ButtonStyle.Danger)
    ;

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button, specialButton)
    ;

    const embed = new EmbedBuilder()
      .setTitle("Please select your timeslot for the next rush defense")
      .setColor('#00FFFF')
    ;

    await interaction.deferReply({ephemeral: true});
    await interaction.deleteReply();
    return interaction.channel.send(
      {
        content: `Dear ${getRole(interaction.guild, "PISCINER")}s`,
        embeds: [embed],
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

    if (timeslotOptions.length === 0) {
      /* Should notify the admin that there is no available session for pisciner */
      const logger = new ConsoleLogger(interaction.customId);
      logger.error(`No available session`);
      return interaction.reply({ content: 'There are no available session at the moment.', ephemeral: true });
    }
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
        components: [row]
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

@Injectable()
export class RushEvalPiscinersSpecialButtonComponent {
  @Button('piscinersSpecialButton')
  public async onButton(@Context() [interaction]: ButtonContext) {

    const modal = new ModalBuilder()
      .setCustomId('special-request-modal')
      .setTitle('Request for special timeslot')
    ;

    const reasonInput = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('special-request-modal-reason')
      .setLabel('You must provide me a really solid reason')
      .setPlaceholder('Enter your reason here')
      .setRequired(true)
    ;

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
    
    return interaction.showModal(modal);
  }
}

@Injectable()
export class RushEvalPiscinersSpecialModalComponent {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>, 
    @InjectModel(SpecRequest.name) private readonly specRequestModel: Model<SpecRequest>,
  ) { }

  @Modal('special-request-modal')
  public async onModal(@Context() [interaction]: ModalContext) {
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Special timeslot request')
      .setAuthor({ name: student.intraName, iconURL: student.intraImageLink })
      .addFields(
        { name: 'Reason', value: interaction.fields.getTextInputValue('special-request-modal-reason') },
      );

    const approvedButton = new ButtonBuilder()
        .setCustomId('special-request-modal-approved')
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(approvedButton);

    interaction.guild.channels.fetch('1161720663401304155').then(async(channel) => {
      if (channel.isTextBased()) {
        const message = await channel.send({ content: `<@&1158623712136921098>`, embeds: [embed], components: [row] });
        const newSpecRequest = new this.specRequestModel({ messageId: message.id, student: student });
        newSpecRequest.save();
        console.log(message.id);
        interaction.reply({ content: 'Your request has been sent to the admins, please wait for their response.', ephemeral: true, components: [] });
      } else {
        interaction.reply({ content: 'Hmm, something went wrong, please contact the BOCALs.', ephemeral: true , components: [] });
      }
    }).catch(error => {
      interaction.reply({ content: 'Hmm, something went wrong, please contact the BOCALs.', ephemeral: true , components: [] });
    });
  }
}

@Injectable()
export class RushEvalPiscinersSpecialApproveButtonComponent {
  constructor(
    @InjectModel(SpecRequest.name) private readonly specRequestModel: Model<SpecRequest>,
    @InjectModel(Specialslot.name) private readonly specialslotModel: Model<Specialslot>,
  ) { }

  @Button('special-request-modal-approved')
  public async onButton(@Context() [interaction]: ButtonContext) {
    const specRequest = await this.specRequestModel.findOne({ messageId: interaction.message.id }).exec();
    const student = specRequest.student;
    interaction.guild.members.fetch(student.discordId).then(async(member) => {
      const specialslots = await this.specialslotModel.aggregate([{$unwind: '$evaluators'},{$group: {_id: '$timeslot',count: { $sum: 1 }}},{$project: {_id: 0,timeslot: '$_id',count: 1}}])
      console.log(specialslots);
      let timeslotOptions = [];
      specialslots.forEach(specialslot => {
        if (specialslot.count > 0)
          timeslotOptions.push({ label: specialslot.timeslot, value: specialslot.timeslot });
      });
      console.log(timeslotOptions);
      const stringSelect = new StringSelectMenuBuilder()
        .setCustomId('special-modal-timeslot')
        .setPlaceholder('Select your timeslot')
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(timeslotOptions);

      member.send({ content: "Hi, the BOCALs have approved your request, please pick one below", components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(stringSelect)] });
    });
    console.log(interaction.message.id);
    interaction.update({ content: 'You have approved the request.',  components: [] });
  }
}

@Injectable()
export class RushEvalPiscinersSpecialStringSelectComponent {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>, 
    @InjectModel(Specialslot.name) private readonly specialslotModel: Model<Specialslot>,
  ) { }

  @StringSelect('special-modal-timeslot')
  public async onStringSelect(@Context() [interaction]: StringSelectContext, @SelectedStrings() selected: string[]) {
    return interaction.update({ content: `You have selected ${selected}`, components: [] });
  }
}