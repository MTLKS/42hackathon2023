import { Subcommand, Context, SlashCommandContext, SelectedStrings, StringSelect, StringSelectContext, ButtonContext, Button, ModalContext, Modal } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import { ButtonBuilder, ButtonStyle, TextInputStyle } from 'discord.js';
import { Injectable } from '@nestjs/common';
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
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    const button = new ButtonBuilder()
      .setCustomId('feedback-button')
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

  @Button('feedback-button')
  public async onPress(@Context() [interaction]: ButtonContext) {
    const student = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    const team = await this.teamModel.find({ evaluator: student }).exec();

    if (team.length === 0) {
      return interaction.reply({
        content: 'There are no teams assigned to you.',
        ephemeral: true
      });
    }
    const buttons = team.map(team => {
      const button = new ButtonBuilder()
        .setCustomId('feedback-team-select-button')
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
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
  ) { }

  @Button('feedback-team-select-button')
  public async onSelection(@Context() [interaction]: ButtonContext) {
    // const tryTeam = await this.teamModel.findOne({})
    // const evaluator = await this.studentModel.findOne({ intraName: 'maliew' }).exec();
    // tryTeam.evaluator = evaluator;
    // await tryTeam.save();

    const cadet = await this.studentModel.findOne({ discordId: interaction.user.id }).exec();
    const team = await this.teamModel.findOne({ evaluator: cadet }).exec();
    const teamMembersInput = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId(team.name)
      .setLabel(`Overview of team members`)
      ;
    const notesInput = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('notes')
      .setLabel('Notes')
      ;

    if (team.feedbackAt) {
      teamMembersInput.setValue(team.feedback.get(team.name));
      notesInput.setValue(team.feedback.get('notes'));
    }
    const components = [teamMembersInput, notesInput]
      .map(member => new ActionRowBuilder<TextInputBuilder>().addComponents(member));

    const modal = new ModalBuilder()
      .setCustomId('feedback')
      .setTitle(`Evaluation notes for ${team.name}`)
      .addComponents(components)
      ;
    return interaction.showModal(modal);
  }

  @Modal('feedback')
  public async onSubmit(@Context() [interaction]: ModalContext) {
    /** Post data to database
     * 
     * After post, send a ephemeral response to the user,
     * saying that the feedback has been successfully recorded,
     * or a markdown of written feedback?
     */
    try {
      const teamName = interaction.fields.fields.first().customId;
      const team = await this.teamModel.findOne({ name: teamName }).exec();

      team.feedback = new Map(interaction.fields.fields.map((value, key) => [key, value.value]));
      team.feedbackAt = new Date();
      await team.save();
    } catch (error) {
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
      content: 'Thanks for submitting your feedback!',
      ephemeral: true
    });
  }
}
