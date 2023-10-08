import { Subcommand, Context, SlashCommandContext, SelectedStrings, StringSelect, StringSelectContext, ButtonContext, Button, ModalContext, Modal } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import { ButtonBuilder, ButtonStyle, CommandInteractionOptionResolver, TextInputStyle } from 'discord.js';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team } from 'src/schema/team.schema';

@RushEvalCommandDecorator()
export class RushEvalFeedbackCommand {
  @Subcommand({
    name: 'feedback',
    description: 'Get feedback from rush evaluators',
  })
  
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    const button = new ButtonBuilder()
      .setCustomId('feedback-button')
      .setStyle(ButtonStyle.Primary)
      .setLabel('Rush feedback')
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button)

    return interaction.reply({
        content: `Rush evaluator feedback`,
        components: [row]
      });
  }
}

@Injectable()
export class RushEvalFeedbackFormCommand {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) {}

  @Button('feedback-button')
  public async onClick(@Context() [interaction]: ButtonContext) {
    // const team = await this.teamModel.findOne({'evaluator.discordId': interaction.user.id})

    // if (team === null) {
    //   return interaction.reply({
    //     content: 'You do not have permission do write feedback',
    //     ephemeral: true
    //   })
    // }
    // console.log(team)
    /** Q: what to do if multiple choice? (cadet with multiple slots)
     * prompt options?
     * fetch evaluator name and it's associate group from database,
     * verify it's identity as one of the registered rush evaluators,
     * construct a modal with CustomId=Your impression of {login}
     */
    const modal = new ModalBuilder()
      .setCustomId('feedback')
      .setTitle('Evaluation notes for {team name}');
    ;

    const general = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('general')
      .setLabel('General impression')
    ;

    // for each member in team
    const member1 = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('student {login1}')
      .setLabel('An introduction of {login1}')
    ;
    const member2 = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('student {login2}')
      .setLabel('An introduction of {login2}')
    ;
      /** Commented out due to 100 characters limitation for placeholder */
      //     .setPlaceholder(`Example:
  // <Name> <background and coding experience>.
  // <impression>
  // <contribution to the projects>
  // <actions during evaluation>
  // <something to keep in mind about said student? (if there's any)>
  // `)
  
    const notes = new TextInputBuilder()
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId('notes')
      .setLabel('Additional notes and thoughts')
    ;

    const components: any[] = [
      new ActionRowBuilder().addComponents(general),
      new ActionRowBuilder().addComponents(member1),
      new ActionRowBuilder().addComponents(member2),
      new ActionRowBuilder().addComponents(notes)
    ]

    modal.addComponents(components);
    return interaction.showModal(modal)
  }

  @Modal('feedback')
  public async onSubmit(@Context() [interaction]: ModalContext) {
    /** Post data to database
     * Under the case which is given the Post access to 42 api,
     * should be able to post it there directly?
     * 
     * After post, send a ephemeral response to the user,
     * saying that the feedback has been successfully recorded,
     * or a markdown of written feedback?
     */
    console.log(interaction.fields.fields)
    return interaction.reply({
      content: 'submission completed',
      ephemeral: true
    })
  }
}
