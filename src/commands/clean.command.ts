import { ButtonBuilder } from "@discordjs/builders";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ActionRowBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Model } from "mongoose";
import { Button, ButtonContext, Context, SlashCommand, SlashCommandContext } from "necord";
import { Evaluator } from "src/schema/evaluator.schema";
import { Specialslot } from "src/schema/specialslot.schema";
import { Student } from "src/schema/student.schema";
import { Team } from "src/schema/team.schema";

export class CleanCommand {

  @SlashCommand({
    name: 'clean',
    description: 'Clean the database'
  })
  public async onClean(@Context() [interaction]: SlashCommandContext) {
      const newEmbed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('This will clear every data in the database. Are you sure?')
        ;
      const yes = new ButtonBuilder()
        .setCustomId('clean-database-confirmed')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Danger)
        ;
      const no = new ButtonBuilder()
        .setCustomId('clean-database-rejected')
        .setLabel('No')
        .setStyle(ButtonStyle.Success)
        ;
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents([yes, no]);
  
      return interaction.reply({
        components: [row],
        embeds: [newEmbed],
        ephemeral: true,
      });
  }
}

@Injectable()
export class CleanDatabase {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Specialslot.name) private readonly specialslotModel: Model<Specialslot>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
  ){}

  @Button('clean-database-confirmed')
  public async onComfirmation(@Context() [interaction]: ButtonContext) {
    const promises = [
      this.teamModel.deleteMany({}),
      this.evaluatorModel.deleteMany({}),
      this.studentModel.deleteMany({})
    ];
    let specialSlots = await this.specialslotModel.find().exec();

    specialSlots.forEach(s => {
        s.evaluators = [];
        s.save();
      });
    const cleared = await Promise.all(promises);
    const embed = new EmbedBuilder()
      .setTitle("Clear Report")
      .addFields({
          name: 'Collection Name',
          value: ['team', 'evaluator', 'student'].join('\n'),
          inline: true
        }, {
          name: 'Amount Cleared',
          value: cleared.map(c => c.deletedCount).join('\n'),
          inline: true
        }
      );

    return interaction.update({
      content: 'Database Cleared',
      embeds: [embed],
      components: []
    });
  }

  @Button('clean-database-rejected')
  public async onRejection(@Context() [interaction]: ButtonContext) {
    return interaction.update({
      content: "Cleaning Aborted",
      components: []
    });
  }

}