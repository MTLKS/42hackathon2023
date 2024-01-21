import { Subcommand, Context, SlashCommandContext, Button, ButtonContext, StringSelect, StringSelectContext, SelectedStrings, Modal, ModalContext } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';
import { ButtonBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import { ConsoleLogger, Injectable } from '@nestjs/common';
import { Team } from 'src/schema/team.schema';
import { getRole } from '../updateroles.command';
import { SpecRequest } from 'src/schema/specrequest.schema';
import { Specialslot } from 'src/schema/specialslot.schema';
import { ApiManager, ProjectStatus } from 'src/ApiManager';
import { AxiosError } from 'axios';
import { StudentService } from 'src/StudentService';
import { LoginCommand } from '../login.command';
import { LoginCode } from 'src/schema/logincode.schema';

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
    const logger = new ConsoleLogger('RushEvalPiscinersCommand');
    logger.log(`Pisciners command called by ${interaction.user.username}`);
    const button = new ButtonBuilder()
      .setCustomId('piscinersButton')
      .setLabel('Get timeslots')
      .setStyle(ButtonStyle.Primary)
      ;

    // const specialButton = new ButtonBuilder()
    //   .setCustomId('piscinersSpecialButton')
    //   .setLabel('Request for special timeslot')
    //   .setStyle(ButtonStyle.Danger)
    // ;

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button,
        // specialButton
      )
      ;

    const embed = new EmbedBuilder()
      .setTitle("Please select your timeslot for the rush01 defense")
      .setColor('#00FFFF')
      ;

    const projectSlug = 'c-piscine-rush-01';
    await interaction.reply({ content: `Fetching ongoing ${projectSlug} teams...`, ephemeral: true });

    await this.fetchOngoingRush(projectSlug).then(newTeams => {
      if (newTeams.length) {
        logger.log(`Found ${newTeams.length} ongoing ${projectSlug} teams`);
        interaction.editReply(`Found ${newTeams.length} ongoing ${projectSlug} teams`);
      } else {
        logger.log(`All ongoing ${projectSlug} teams are already registered`);
        interaction.editReply(`All ongoing ${projectSlug} teams are already registered`);
      }
    }).catch(error => {
      logger.warn(error.message);
      interaction.editReply(error.message);
    });

    return interaction.channel.send(
      {
        content: `Dear ${getRole(interaction.guild, "PISCINER")}s`,
        embeds: [embed],
        components: [row],
      }
    );
  }

  private async fetchOngoingRush(projectSlugOrId: string | number) {
    const intraRushTeams = await ApiManager.getDefaultInstance().getProjectTeams(projectSlugOrId, {
      'filter[status]': [ProjectStatus.InProgress, ProjectStatus.WaitingForCorrection],
    });
    if (intraRushTeams.length === 0) {
      throw new Error(`This attempt will be assumed as testing since there is no ongoing \`\`${projectSlugOrId}\`\` team that is waiting for correction.`);
    }
    const allRushTeams = await Promise.all(intraRushTeams.map(team => ApiManager.intraTeamToTeam(team, this.studentModel)));
    const localTeams = await this.teamModel.find().exec();

    return await Promise.all(allRushTeams
      .filter(intra => !localTeams.find(local => local.intraId === intra.intraId))
      .map(intra => this.teamModel.create(intra))
    );
  }
}

@Injectable()
export class RushEvalPiscinersButtonComponent {
  private readonly logger = new ConsoleLogger("piscinerButton");
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(LoginCode.name) private readonly loginCodeModel: Model<LoginCode>,
  ) { }

  private async fetchIntraGroup(projectSlugOrId: string | number, intraIdOrLogin: string | number) {
    this.logger.warn(`Fetching intra group ${intraIdOrLogin} for ${projectSlugOrId}`);
    const intraTeam = await ApiManager.getDefaultInstance().getUserTeam(intraIdOrLogin, projectSlugOrId);

    if (intraTeam === null) {
      return null;
    }
    const team = await ApiManager.intraTeamToTeam(intraTeam, this.studentModel);
    return await this.teamModel.create(team);
  }

  @Button('piscinersButton')
  public async onButton(@Context() [interaction]: ButtonContext) {
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();

    /* if student not found, prompt student intra login */
    if (student === null) {
      return interaction.reply(await LoginCommand.getLoginReply(
        interaction.user,
        this.loginCodeModel,
        'New student detected'
      ));
    } else if (student.discordId === undefined) {
      await StudentService.setStudentDiscordData(interaction.guild, interaction.user, student)
        .then(() => student.save());
    }
    this.logger.log(`${student.intraName} is fetching for timeslot`);
    const projectSlug = 'c-piscine-rush-01';
    await interaction.deferReply({ ephemeral: true });
    interaction.editReply(`Looking for ${student.intraName} team...`);
    /* if recognise student, look for their team */
    const team: Team = await this.teamModel.findOne({
      $or: [
        { "teamLeader.intraName": student.intraName },
        { "teamMembers.intraName": { $in: [student.intraName] } }]
    }).exec()
      /* if team not found, fetch from intra */
      ?? await this.fetchIntraGroup(projectSlug, student.intraName).catch((error: AxiosError) => {
        if (error.response?.status !== 404) {
          this.logger.error(error.message);
        }
        return null;
      });

    /* if team not found in intra, reply error */
    if (team === null) {
      const content = `Did not find your record of \`\`${projectSlug}\`\`.
If you're certain you've signed up for this project, please contact BOCAL for it.
`;

      this.logger.log(`Did not find ${student.intraName} record of ${projectSlug}`);
      return interaction.editReply(content);
    }
    interaction.editReply('Looking for available timeslot...');
    let reply = '';
    const leader = team.teamLeader;
    if (student.intraName !== leader.intraName) {
      reply += `**Unless your leader(${leader.intraName}) is unresponsive, please leave it to them to choose the timeslot.**\n`;
    }
    /* Return available session */
    const timeslotOptions = await this.getTimeslotOptions(team.name);
    if (timeslotOptions.length === 0) {
      /* Should notify the admin that there is no available session for pisciner */
      this.logger.error(`No available session`);
      reply += 'There\'s no available session at the moment. Please try again later.';
      return interaction.editReply(reply);
    }
    const stringSelect = new StringSelectMenuBuilder()
      .setCustomId('piscinersStringSelect')
      .setPlaceholder(`Selected: ${team.timeslot?.timeslot ?? 'None'}`)
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions(timeslotOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(stringSelect);
    this.logger.log(`${student.intraName} (leader: ${student.intraName === leader.intraName}) got ${timeslotOptions.map(t => t.value)} as options`);
    reply += 'Please select your timeslot for the next rush-01 defense';
    return interaction.editReply({
      content: reply,
      components: [row]
    });
  }

  private async getTimeslotOptions(teamName: string) {
    const timeslots = await this.timeslotModel.find().exec();
    const availableCount = await this.evaluatorModel.aggregate([
      { $unwind: '$timeslots' },
      { $group: { _id: '$timeslots.timeslot', count: { $sum: 1 } } },
      { $project: { _id: 0, timeslot: '$_id', count: 1 } }
    ]);
    const unavailableCount = await this.teamModel.aggregate([
      { $match: { name: { $ne: teamName } } },
      { $unwind: '$timeslot' },
      { $group: { _id: '$timeslot.timeslot', count: { $sum: 1 } } },
      { $project: { _id: 0, timeslot: '$_id', count: 1 } }
    ]);

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

    return timeslotOptions;
  }
}

@Injectable()
export class RushEvalPiscinersStringSelectComponent {
  private readonly logger = new ConsoleLogger("piscinerStringSelect");
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @StringSelect('piscinersStringSelect')
  public async onStringSelect(@Context() [interaction]: StringSelectContext, @SelectedStrings() selected: string[]) {
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    if (student === null) {
      return interaction.reply({ content: 'Please try fetching slots and register yourself as new student again.', ephemeral: true });
    }
    this.logger.log(`${student.intraName} selected timeslot: ${selected}`);
    const availableCount = await this.evaluatorModel.aggregate([{ $unwind: '$timeslots' }, { $group: { _id: '$timeslots.timeslot', count: { $sum: 1 } } }, { $project: { _id: 0, timeslot: '$_id', count: 1 } }]);
    const unavailableCount = await this.teamModel.aggregate([{ $unwind: '$timeslot' }, { $group: { _id: '$timeslot.timeslot', count: { $sum: 1 } } }, { $project: { _id: 0, timeslot: '$_id', count: 1 } }]);
    let currentAvailable = availableCount.find((timeslot) => timeslot.timeslot === selected[0]);
    let currentUnavailable = unavailableCount.find((timeslot) => timeslot.timeslot === selected[0]);

    let finalCount = 0;
    if (currentAvailable && currentUnavailable) {
      finalCount = currentAvailable.count - currentUnavailable.count;
    } else if (currentAvailable && !currentUnavailable) {
      finalCount = currentAvailable.count;
    }

    if (finalCount == 0) {
      this.logger.log(`${student.intraName} Selected timeslots: ${selected} is full`);
      return interaction.update({ content: `Sorry, timeslot ${selected[0]} is full, please try again.`, components: [] });
    }

    const selectedTimeslot = await this.timeslotModel.findOne({ timeslot: selected[0] }).exec();
    const team = await this.teamModel.findOne({
      $or: [
        { "teamLeader.intraName": student.intraName },
        { "teamMembers.intraName": { $in: [student.intraName] } }]
    }).exec();
    // const team = await this.teamModel.findOne({ teamLeader: student }).exec();

    team.timeslot = selectedTimeslot;
    team.chosenTimeslotAt = new Date();
    team.chosenTimeslotBy = student;
    await team.save();
    return interaction.reply({ content: `You have selected ${selected}`, components: [], ephemeral: true });
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

    interaction.guild.channels.fetch('1161720663401304155').then(async (channel) => {
      if (channel.isTextBased()) {
        const message = await channel.send({ content: `<@&1158623712136921098>`, embeds: [embed], components: [row] });
        const newSpecRequest = new this.specRequestModel({ messageId: message.id, student: student });
        newSpecRequest.save();
        console.log(message.id);
        interaction.reply({ content: 'Your request has been sent to the admins, please wait for their response.', ephemeral: true, components: [] });
      } else {
        interaction.reply({ content: 'Hmm, something went wrong, please contact the BOCALs.', ephemeral: true, components: [] });
      }
    }).catch(error => {
      interaction.reply({ content: 'Hmm, something went wrong, please contact the BOCALs.', ephemeral: true, components: [] });
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
    interaction.guild.members.fetch(student.discordId).then(async (member) => {
      const specialslots = await this.specialslotModel.aggregate([{ $unwind: '$evaluators' }, { $group: { _id: '$timeslot', count: { $sum: 1 } } }, { $project: { _id: 0, timeslot: '$_id', count: 1 } }])
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
    interaction.update({ content: 'You have approved the request.', components: [] });
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