import { Subcommand, Context, SlashCommandContext, Button, ButtonContext, StringSelect, StringSelectContext, SelectedStrings, Options } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../../schema/student.schema';
import { Timeslot } from 'src/schema/timeslot.schema';
import { Evaluator } from 'src/schema/evaluator.schema';
import { ButtonBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { ConsoleLogger, Injectable, UseInterceptors } from '@nestjs/common';
import { Team } from 'src/schema/team.schema';
import { getRole } from '../updateroles.command';
import { ApiManager, ProjectStatus } from 'src/ApiManager';
import { AxiosError } from 'axios';
import { StudentService } from 'src/StudentService';
import { LoginCommand } from '../login.command';
import { LoginCode } from 'src/schema/logincode.schema';
import { RushEval, RushProjectSlugDto, RushProjectSlug, RushProjectSlugAutocompleteInterceptor, getRushName } from 'src/schema/rusheval.schema';

@RushEvalCommandDecorator()
export class RushEvalPiscinersCommand {
  constructor(
    @InjectModel(RushEval.name) private readonly rushEvalModel: Model<RushEval>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @UseInterceptors(RushProjectSlugAutocompleteInterceptor)
  @Subcommand({
    name: 'pisciners',
    description: 'Get pisciners to choose timeslots',
  })
  public async onCommandCall(@Context() [interaction]: SlashCommandContext, @Options() { project }: RushProjectSlugDto) {
    const logger = new ConsoleLogger('RushEvalPiscinersCommand');

    logger.log(`Pisciners command called by ${interaction.user.username}`);
    const button = new ButtonBuilder()
      .setCustomId('pisciner-session-fetch')
      .setLabel('Get timeslots')
      .setStyle(ButtonStyle.Primary)
      ;
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);
    const rushName = getRushName(project);

    if (rushName === project) {
      return interaction.reply({ content: `Unknown rush project slug ${project}`, ephemeral: true });
    }
    const embed = new EmbedBuilder()
      .setTitle(`Please select a session for your ${rushName} defense`)
      .setColor('#00FFFF')
      ;
    const rushEval = await this.rushEvalModel.findOne().exec()
      ?? new this.rushEvalModel();
    const now = new Date();

    rushEval.project = project;
    rushEval.poolYear = String(now.getFullYear());
    rushEval.poolMonth = now.toLocaleDateString(undefined, { month: 'long' });
    const batch = `batch ${rushEval.poolMonth} ${rushEval.poolYear}`;

    await interaction.reply({ content: `Fetching ongoing ${project} teams in ${batch}...`, ephemeral: true });
    const prevTeamCount = await this.teamModel.countDocuments().exec();
    return await this.fetchOngoingRush(project).then((nowTeamCount) => {
      const reply = (() => {
        if (nowTeamCount === 0) {
          return `This attempt will be assumed as testing since there is no ongoing \`\`${project}\`\` team that is waiting for correction.`;
        } else if (prevTeamCount === nowTeamCount) {
          return `All ongoing ${project} teams are already registered in ${batch}`;
        } else {
          return `Found ${nowTeamCount - prevTeamCount} new ${project} team`;
        }
      })();

      logger.log(reply);
      interaction.editReply(reply);
      rushEval.save();
      return interaction.channel.send({
        content: `Dear ${getRole(interaction.guild, "PISCINER")}s`,
        embeds: [embed],
        components: [row],
      });
    }).catch(error => {
      logger.warn(error.message);
      interaction.editReply(error.message);
    });
  }

  private async fetchOngoingRush(project: RushProjectSlug) {
    const intraRushTeams = await ApiManager.getDefaultInstance().getProjectTeams(project, {
      'filter[status]': ProjectStatus.InProgress,
    });

    if (intraRushTeams.length === 0) {
      return 0;
    }
    const allRushTeams = await Promise.all(intraRushTeams.map(team => ApiManager.intraTeamToTeam(team, this.studentModel)));
    const localTeams = await this.teamModel.find().exec();

    await Promise.all(allRushTeams
      .filter(intra => !localTeams.find(local => local.intraId === intra.intraId))
      .map(intra => this.teamModel.create(intra))
    );
    return allRushTeams.length;
  }
}

@Injectable()
export class RushEvalPiscinersButtonComponent {
  private readonly logger = new ConsoleLogger("pisciner-session-fetch");
  constructor(
    @InjectModel(RushEval.name) private readonly rushEvalModel: Model<RushEval>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(LoginCode.name) private readonly loginCodeModel: Model<LoginCode>,
  ) { }

  private async fetchIntraGroup(project: RushProjectSlug, intraIdOrLogin: string | number) {
    this.logger.warn(`Fetching intra group ${intraIdOrLogin} for ${project}`);
    const intraTeam = await ApiManager.getDefaultInstance().getUserTeam(intraIdOrLogin, project);

    if (intraTeam === null) {
      return null;
    }
    const team = await ApiManager.intraTeamToTeam(intraTeam, this.studentModel);
    return await this.teamModel.create(team);
  }

  @Button('pisciner-session-fetch')
  public async onFetchSession(@Context() [interaction]: ButtonContext) {
    const project = (await this.rushEvalModel.findOne().exec())?.project;
    if (project === undefined) {
      return interaction.reply({ content: `There's no ongoing rush at the moment`, ephemeral: true });
    }
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
    await interaction.deferReply({ ephemeral: true });
    interaction.editReply(`Looking for ${student.intraName} team...`);
    /* if recognise student, look for their team */
    const team: Team = await this.teamModel.findOne({
      $or: [
        { "teamLeader.intraName": student.intraName },
        { "teamMembers.intraName": { $in: [student.intraName] } }]
    }).exec()
      /* if team not found, fetch from intra */
      ?? await this.fetchIntraGroup(project, student.intraName).catch((error: AxiosError) => {
        if (error.response?.status !== 404) {
          this.logger.error(error.message);
        }
        return null;
      });

    /* if team not found in intra, reply error */
    if (team === null) {
      const content = `Did not find your record of \`\`${project}\`\`.
If you're certain you've signed up for this project, please contact BOCAL for it.
`;

      this.logger.log(`Did not find ${student.intraName} record of ${project}`);
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
      .setCustomId('pisciner-session-choose')
      .setPlaceholder(`Selected: ${team.timeslot?.timeslot ?? 'None'}`)
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions(timeslotOptions);
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(stringSelect);

    this.logger.log(`${student.intraName} (leader: ${student.intraName === leader.intraName}) got ${timeslotOptions.map(t => t.value)} as options`);
    reply += `Please select a session for ${getRushName(project)} defense`;
    return interaction.editReply({ content: reply, components: [row] });
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
  private readonly logger = new ConsoleLogger("pisciner-session-choose");
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @StringSelect('pisciner-session-choose')
  public async onChooseSession(@Context() [interaction]: StringSelectContext, @SelectedStrings() selected: string[]) {
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
