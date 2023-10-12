import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { privateDecrypt } from 'crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Model } from 'mongoose';
import { SlashCommand, SlashCommandContext, Context, Button } from 'necord';
import { Evaluator } from 'src/schema/evaluator.schema';
import { Specialslot } from 'src/schema/specialslot.schema';
import { SpecRequest } from 'src/schema/specrequest.schema';
import { Student } from 'src/schema/student.schema';
import { Team } from 'src/schema/team.schema';
import { Timeslot } from 'src/schema/timeslot.schema';

@Injectable()
export class TestCommand {
  constructor(
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Specialslot.name) private readonly specialslotModel: Model<Specialslot>,
    @InjectModel(SpecRequest.name) private readonly specRequestModel: Model<SpecRequest>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) {}

  @SlashCommand({
    name: 'test',
    description: 'test data',
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext) {
    const clearButton = new ButtonBuilder()
      .setCustomId('clear')
      .setLabel('Clear')
      .setStyle(ButtonStyle.Danger);

    const generateButton = new ButtonBuilder()
      .setCustomId('generate')
      .setLabel('Generate')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(clearButton, generateButton);


    return interaction.reply({ content: '', components: [row] });
  }

  @Button('clear')
  public async onClear(@Context() [interaction]: SlashCommandContext) {
    await this.studentModel.deleteMany({});
    await this.evaluatorModel.deleteMany({});
    await this.specialslotModel.updateMany({}, { $unset: { evaluators: 1 } });
    await this.teamModel.deleteMany({});
    await this.specRequestModel.deleteMany({});

    const plau = new this.studentModel({
      intraId: '111868',
      intraName: 'plau',
      discordId: '707984796789506119',
      progressRole: 'CADET',
      coalitionRole: 'Segmentation Slayers',
      intraImageLink: 'https://cdn.intra.42.fr/users/916cfc96b5854c71b7beac4539ea6aeb/plau.jpg'
    });

    const hqixeo = new this.studentModel({
      intraId: '111882',
      intraName: 'hqixeo',
      discordId: '387502639350284288',
      progressRole: 'CADET',
      coalitionRole: 'Segmentation Slayers',
      intraImageLink: 'https://cdn.intra.42.fr/users/bf9767b1aa6a9b40f78f3e526a84f293/hqixeo.jpg'
    });

    const zah = new this.studentModel({
      intraId: '111870',
      intraName: 'zah',
      discordId: '123455',
      progressRole: 'CADET',
      coalitionRole: 'Segmentation Slayers',
    });

    const maliew = new this.studentModel({
      intraId: '111871',
      intraName: 'maliew',
      discordId: '182443506181210112',
      progressRole: 'CADET',
      coalitionRole: 'Segmentation Slayers',
      intraImageLink: 'https://cdn.intra.42.fr/users/4c045628be8e839b752099b6daf59769/maliew.jpg'
    });

    plau.save();
    hqixeo.save();
    zah.save();
    maliew.save();

    return interaction.reply({ content: 'Clear', ephemeral: true });
  }

  @Button('generate')
  public async onGenerate(@Context() [interaction]: SlashCommandContext) {
    const cadets = ['schuah', 'jng', 'weng', 'wting']
    const pisciners = ['sting', 'wikee', 'ateh', 'hsim', 'zgoh', 'jetan', 'yetan', 'honglim', 'sbalchin', 'mho', 'jyap', 'long']

    cadets.forEach(async (cadet) => {
      const student = new this.studentModel({
        intraId: '123',
        intraName: cadet,
        discordId: '123456789',
        progressRole: 'CADET',
      });
      student.save();

      const timeslot = await this.timeslotModel.findOne({ timeslot: "2:00PM" });
      const evaluator = new this.evaluatorModel({
        student: student,
        timeslots: [timeslot],
      });
      evaluator.save();
    });

    pisciners.forEach(async (pisciner) => {
      const student = new this.studentModel({
        intraId: '123',
        intraName: pisciner,
        discordId: '123456789',
        progressRole: 'PISCINER',
      });
      student.save();
    });

    for (let i = 0; i < 4; i++) {
      const team = new this.teamModel({
        teamLeader: await this.studentModel.findOne({ intraName: pisciners[i] }),
        teamMembers: [
          await this.studentModel.findOne({ intraName: pisciners[i + 4] }),
          await this.studentModel.findOne({ intraName: pisciners[i + 8] })
        ],
        timeslot: await this.timeslotModel.findOne({ timeslot: "2:00PM" }),
      });
      team.save();
    }

    const testteam = new this.teamModel({
      teamLeader: await this.studentModel.findOne({ intraName: 'plau' }),
      teamMembers: [
        await this.studentModel.findOne({ intraName: 'hqixeo' }),
        await this.studentModel.findOne({ intraName: 'zah' })
      ],
    });
    testteam.save();

    return interaction.reply({ content: 'Generate', ephemeral: true });
  }
}
