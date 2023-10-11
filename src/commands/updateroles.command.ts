import { Injectable } from '@nestjs/common';
import { SlashCommand, SlashCommandContext, Context } from 'necord';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../schema/student.schema';
import { Role } from 'discord.js';

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
    const getRole = (role: string) =>
      interaction.guild.roles.cache.find((r) => r.name === role);
    const role_map = new Map<string, Role>([
        'PISCINER',
        'FLOATY',
        'CADET',
        'SPECIALIZATION'
      ].map(value => [value, getRole(value)])
    );
    const coalition_map = new Map<string, Role>([
        'Segmentation Slayers',
        'Bug Busters',
        'Kernel Kamikazes',
        'Unix Unicorns'
      ].map(value => [value, getRole(value)])
    );
    const everyRoles = [...role_map.values(), ...coalition_map.values()];

    await interaction.deferReply({ ephemeral: true });
    const members = await interaction.guild.members.fetch();
    const getMemberRoles = (student: Student) => {
      let roles_add: Role[] = [];

      if (student.progressRole === 'SPECIALIZATION') {
        roles_add.push(role_map.get('CADET'));
      } 
      if (role_map.has(student.progressRole)) {
        roles_add.push(role_map.get(student.progressRole));
      }
      if (coalition_map.has(student.coalitionRole)) {
        roles_add.push(coalition_map.get(student.coalitionRole));
      }
      return roles_add;
    };

    /** This edit the roles in sequence
     * An alternative approach if performance is a concern:
     * await Promise.all(members.map(async() => ...))
     */
    for (let [id, member] of members) {
      const student = await this.studentModel.findOne({ discordId: id });
      if (student === null)
        continue ;
      const roles = getMemberRoles(student);

      // interaction.editReply({ content: `Assigning ${member} as ${roles}` });
      await member.roles.remove(everyRoles);
      await member.roles.add(roles);
    }
    return interaction.editReply({ content: 'All member roles have been updated!' });
  }
}
