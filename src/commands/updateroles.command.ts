import { Injectable } from '@nestjs/common';
import { SlashCommand, SlashCommandContext, Context } from 'necord';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../schema/student.schema';

@Injectable()
export class UpdateRolesCommand {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>
  ) { }

  @SlashCommand({
    name: 'updateroles',
    description: 'Update user roles!',
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext) {
    const getRole = (role: string) => interaction.guild.roles.cache.find((r) => r.name === role);
    const pisciner = getRole('PISCINER');
    const floaty = getRole('FLOATY');
    const cadet = getRole('CADET');
    const specialization = getRole('SPECIALIZATION');

    await interaction.deferReply({ ephemeral: true });

    const members = await interaction.guild.members.fetch();

    members.forEach(async(member) => {
      const student = await this.studentModel.findOne({ discordId: member.id });
      console.log(student);
      if (student != null) {
        if (student.progressRole == 'PISCINER') {
          await member.roles.add(pisciner);
        } else if (student.progressRole == 'FLOATY') {
          await member.roles.add(floaty);
        } else if (student.progressRole == 'CADET') {
          await member.roles.add(cadet);
        } else if (student.progressRole == 'SPECIALIZATION') {
          await member.roles.add(specialization);
        }
      }
    });
    return interaction.editReply({ content: 'Pong!' });
  }
}
