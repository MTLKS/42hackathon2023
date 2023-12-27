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
        const groupName = team.teamLeader.intraName + "'s group";
        const button = new ButtonBuilder()
          .setCustomId('feedback-team-select-button')
          .setLabel(groupName)
          .setStyle(ButtonStyle.Secondary)
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
    const getOverviewInput = (student: Student) => {
      const login = student.intraName;
      const input = new TextInputBuilder()
        .setStyle(TextInputStyle.Paragraph)
        .setCustomId(login)
        .setLabel(`Overview of ${login}`)
        ;
      /** Commented out due to 100 characters limitation for placeholder */
      //         .setPlaceholder(`Example:
      // <Name> <background and coding experience>.
      // <impression>
      // <contribution to the projects>
      // <actions during evaluation>
      // <something to keep in mind about said student? (if there's any)>
      // `)

      return input;
    };

    const membersInputs = [getOverviewInput(team.teamLeader)]
      .concat(team.teamMembers.map(getOverviewInput))
      ;

    const notes = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('notes')
      .setLabel('Notes')
      ;

    const components: any[] = [
      ...membersInputs.map(member => new ActionRowBuilder().addComponents(member)),
      new ActionRowBuilder().addComponents(notes)
    ];

    const modal = new ModalBuilder()
      .setCustomId('feedback')
      .setTitle(`Evaluation notes for ${team.teamLeader.intraName}'s group`)
      ;
    modal.addComponents(components);
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

    console.log(interaction.fields.fields)

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
