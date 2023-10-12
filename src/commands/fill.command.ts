import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { assert } from "console";
import { randomInt } from "crypto";
import { EmbedBuilder } from "discord.js";
import { Model } from "mongoose";
import { Context, SlashCommand, SlashCommandContext, Subcommand } from "necord";
import { Evaluator } from "src/schema/evaluator.schema";
import { Student } from "src/schema/student.schema";
import { Timeslot } from "src/schema/timeslot.schema";

type ProgressRole = 'CADET' | 'PISCINER';

class GarbageGenerator {
  public static rand(len: number, set: string) {
    let res = '';

    for (let i = 0; i < len; i++) {
      res += set[randomInt(set.length)];
    }
    return res;
  }

  public static randStudent(role?: ProgressRole) {
    const login = this.rand(6, 'abcdefghijklmnopqrstuvwxyz') + '39';
    const id = this.rand(6, '0123456789') + '39';
    const discordId = this.rand(2, '0123456789') + '39';
    const progressRole = role ? role : ['CADET', 'PISCINER'][randomInt(2)];
    const coalitionRole = (progressRole === 'CADET'
      ? ['ss', 'kk', 'bb', 'uu'][randomInt(4)]
      : null);
    const student: Student = {
      intraName: login,
      intraId: id,
      discordId: discordId,
      progressRole: progressRole,
      coalitionRole: coalitionRole
    };

    return student;
  }

  public static randEvaluator(slots: Timeslot[] = this.randTimeslots(randomInt(6))) {
    const evaluator: Evaluator = {
      student: this.randStudent('CADET'),
      timeslots: slots
    };

    return evaluator;
  }

  public static randTimeslots(amount: number): Timeslot[] {
    let set = [
      '10:00AM',
      '11:00AM',
      '2:00PM',
      '3:00PM',
      '4:00PM',
      '5:00PM'
    ];
    let res = [];

    assert(amount <= set.length);
    while (set.length && amount--) {
      const i = randomInt(set.length);

      res.push(set[i]);
      set.splice(i, 1);
    }
    const compare_time = (a: string, b: string) => {
      const toInt = (time: string) => {
        const n = parseInt(time.substring(0, time.indexOf(':')));

        return (time.substring(time.length - 2) === 'PM') ? n + 12 : n;
      };

      return toInt(a) - toInt(b);
    };
    return res.sort(compare_time).map(slot => {return {timeslot: slot}});
  }
}

@Injectable()
export class FillGarbageCommand {
  constructor(
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
  ) {}

  @SlashCommand({
    name: 'fill',
    description: 'generate and insert a fake data for experimental purpose'
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    const student = GarbageGenerator.randEvaluator();

    this.evaluatorModel.insertMany([student]);
    const embed = new EmbedBuilder()
      .addFields({
          name: student.student.intraName,
          value: ['intraId', 'discordId', 'progressRole', 'coalitionRole', 'timeslots'].map(s => `**${s}**`).join('\n'),
          inline: true
        },
        {
          name: 'data',
          value: [
            student.student.intraId,
            student.student.discordId,
            student.student.progressRole,
            student.student.coalitionRole,
            student.timeslots.map(s => s.timeslot).join(', ') || 'N/A'
          ].join('\n'),
          inline: true
        })
    ;
    return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
  }
}
