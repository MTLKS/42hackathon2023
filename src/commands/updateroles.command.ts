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
    defaultMemberPermissions: ['Administrator']
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext) {
    const getRole = (role: string) => interaction.guild.roles.cache.find((r) => r.name === role);
    const pisciner = getRole('PISCINER');
    const floaty = getRole('FLOATY');
    const cadet = getRole('CADET');
    const specialization = getRole('SPECIALIZATION');

    const ss = interaction.guild.roles.cache.find((r) => r.name === 'Segmentation Slayers');
    const bb = interaction.guild.roles.cache.find((r) => r.name === 'Bug Busters');
    const kk = interaction.guild.roles.cache.find((r) => r.name === 'Kernel Kamikazes');
    const uu = interaction.guild.roles.cache.find((r) => r.name === 'Unix Unicorns');

    await interaction.deferReply({ ephemeral: true });

    interaction.guild.members.fetch().then(members => {
      members.forEach(async(member) => {
        const student = await this.studentModel.findOne({ discordId: member.id });
        if (student != null) {
          await member.roles.remove([pisciner, floaty, cadet, specialization, ss, bb, kk, uu])
            .then(async() => {
              if (student.progressRole == 'PISCINER') {
                await member.roles.add(pisciner);
              } else if (student.progressRole == 'FLOATY') {
                await member.roles.add(floaty);
              } else if (student.progressRole == 'CADET') {
                await member.roles.add(cadet);
              } else if (student.progressRole == 'SPECIALIZATION') {
                await member.roles.add([cadet, specialization]);
              }
              if (student.coalitionRole == 'Segmentation Slayers') {
                await member.roles.add(ss);
              } else if (student.coalitionRole == 'Bug Busters') {
                await member.roles.add(bb);
              } else if (student.coalitionRole == 'Kernel Kamikazes') {
                await member.roles.add(kk);
              } else if (student.coalitionRole == 'Unix Unicorns') {
                await member.roles.add(uu);
              }
            });
        }
      })
      return interaction.editReply({ content: 'All member roles have been updated!' });
    })
    .catch(err => {
      return interaction.editReply({ content: 'Something went wrong!' });
    });
  }
}
