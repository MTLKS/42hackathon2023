import { Subcommand, Context, SlashCommandContext, ButtonContext, Button, ModalContext, Modal, ModalParam, ComponentParam } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import { ButtonBuilder, ButtonStyle, TextInputStyle } from 'discord.js';
import { ConsoleLogger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team } from 'src/schema/team.schema';
import { Student } from 'src/schema/student.schema';
import { EmbedBuilder } from 'discord.js';
import { getRole } from '../updateroles.command';

@RushEvalCommandDecorator()
export class RushEvalFeedbackCommand {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>
  ) { }

  @Subcommand({
    name: 'feedback',
    description: 'Get feedback from rush evaluators',
  })
  public async onCommandCall(@Context() [interaction]: SlashCommandContext) {
    const logger = new ConsoleLogger('RushEvalFeedbackCommand');
    logger.log(`Feedback command called by ${interaction.user.username}`);
    const button = new ButtonBuilder()
      .setCustomId('feedback-fetch-team')
      .setStyle(ButtonStyle.Primary)
      .setLabel('Rush feedback')
      ;
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button)
      ;
    // const teams = await this.teamModel.find().exec();
    // const evaluatorsDiscordId = teams.map(team => team.evaluator.discordId);
    // const evaluatorsDc = await interaction.guild.members.fetch({ user: evaluatorsDiscordId });
    const newEmbed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('Please provide your feedback here')
      ;

    await interaction.deferReply();
    await interaction.deleteReply();
    return interaction.channel.send({
      content: `Rush Feedback ${getRole(interaction.guild, 'CADET')}`,
      components: [row],
      embeds: [newEmbed],
    });
  }
}

@Injectable()
export class RushEvalFeedbackTeamSelectButton {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
  ) { }

  @Button('feedback-fetch-team')
  public async onFetchTeam(@Context() [interaction]: ButtonContext) {
    const logger = new ConsoleLogger('feedback-fetch-team');
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    const teams = await this.teamModel.find({ evaluator: student }).exec();

    if (student === null) {
      logger.log(`${interaction.user.username} is not registered`);
      return interaction.reply({
        content: `Trying funny thing?`,
        ephemeral: true
      });
    }
    logger.log(`${student.intraName} fetched for their teams to feedback`);
    if (teams.length === 0) {
      return interaction.reply({
        content: 'There are no teams assigned to you.',
        ephemeral: true
      });
    }
    const buttons = teams.map(team => {
      const button = new ButtonBuilder()
        .setCustomId(`feedback-team-select-button/${team.name}`)
        .setLabel(team.name)
        .setStyle(team.feedbackAt ? ButtonStyle.Success : ButtonStyle.Secondary)
        ;

      return button;
    });
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(buttons)
      ;

    return interaction.reply({
      content: 'Select team',
      components: [row],
      ephemeral: true
    });
  }
}

@Injectable()
export class RushEvalFeedbackForm {
  private readonly logger = new ConsoleLogger('RushEvalFeedbackForm');
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
  ) { }

  @Button('feedback-team-select-button/:teamName')
  public async onSelectTeam(@Context() [interaction]: ButtonContext, @ComponentParam('teamName') teamName: string) {
    const cadet = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();

    if (cadet === null) {
      this.logger.warn(`${interaction.user.username} is not registered`);
      return interaction.reply({
        content: `Something must have went wrong if you're seeing this. Please contact an admin.`,
        ephemeral: true
      });
    }
    this.logger.log(`${cadet.intraName} chose ${teamName} to feedback`);
    const teamMembersInput = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId(teamName)
      .setLabel(`Overview of team members`)
      ;
    const notesInput = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('notes')
      .setLabel('Notes')
      ;

    const team = await this.teamModel.findOne({ name: teamName }).exec();
    if (team.feedbackAt) {
      teamMembersInput.setValue(team.feedback.get(teamName));
      notesInput.setValue(team.feedback.get('notes'));
    } else {
      /* For any future maintainer, placeholder has 100 chars limit (last update at 10/1/2024) */
      teamMembersInput.setPlaceholder('Including their backgrounds, contributions to the team, and any other impressions.');
      notesInput.setPlaceholder('How did the evaluation went overall?');
    }
    const components = [teamMembersInput, notesInput]
      .map(input => new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    const modal = new ModalBuilder()
      .setCustomId(`feedback/${teamName}`)
      .setTitle(`Evaluation notes for ${teamName}`)
      .addComponents(components)
      ;
    return interaction.showModal(modal);
  }

  @Modal('feedback/:teamName')
  public async onSubmit(@Context() [interaction]: ModalContext, @ModalParam('teamName') teamName: string) {
    /** Post data to database
     * 
     * After post, send a ephemeral response to the user,
     * saying that the feedback has been successfully recorded,
     * or a markdown of written feedback?
    */
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    try {
      const team = await this.teamModel.findOne({ name: teamName }).exec();
      this.logger.log(`${student.intraName} submitted feedback for ${teamName}`);

      team.feedback = new Map(interaction.fields.fields.map((value, key) => [key, value.value]));
      team.feedbackAt = new Date();
      await team.save();
    } catch (error) {
      this.logger.log(`Something went wrong saving ${teamName} feedback by ${student.intraName}`);
      console.error(error);
      return interaction.reply({
        content: 'Something went wrong. Please try again.',
        ephemeral: true
      });
    }
    /**
     * Convert data to csv - Not using for now
     */
    // const { convertArrayToCSV } = require('convert-array-to-csv');
    // const fs = require('fs');

    // const header = ['Name', 'Feedback'];
    // const dataArr = [
    //   ['Overview of Team Member', interaction.fields.fields.get('plau')['value'] + '\n'],
    //   ['Notes', interaction.fields.fields.get('notes')['value'] + '\n'],
    // ];

    // const csvFromArrayOfArrays = convertArrayToCSV(dataArr, {
    //   header,
    //   separator: ';'
    // });

    // fs.appendFile('feedback.csv', csvFromArrayOfArrays, (err) => {
    //   if (err) throw err;
    //   console.log('The file has been saved!');
    // });
    return interaction.reply({
      content: `Your feedback for ${teamName} has been recorded.`,
      ephemeral: true
    });
  }
}
