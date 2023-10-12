import { Injectable } from '@nestjs/common';
import { SlashCommand, SlashCommandContext, Context } from 'necord';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from '../schema/student.schema';
import { Guild, Role } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

export function getRole(guild: Guild, roleName: string) {
  return guild.roles.cache.find((r) => r.name === roleName);
}

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
    const roleMap = new Map<string, Role>([
        'PISCINER',
        'FLOATY',
        'CADET',
        'SPECIALIZATION'
      ].map(value => [value, getRole(interaction.guild, value)])
    );
    const coalitionMap = new Map<string, Role>([
        'Segmentation Slayers',
        'Bug Busters',
        'Kernel Kamikazes',
        'Unix Unicorns'
      ].map(value => [value, getRole(interaction.guild, value)])
    );
    const everyRoles = [...roleMap.values(), ...coalitionMap.values()];

    await interaction.deferReply({ ephemeral: true });
    const members = await interaction.guild.members.fetch();
    const getMemberRoles = (student: Student) => {
      let rolesAdd: Role[] = [];

      if (student.progressRole === 'SPECIALIZATION') {
        rolesAdd.push(roleMap.get('CADET'));
      } 
      if (roleMap.has(student.progressRole)) {
        rolesAdd.push(roleMap.get(student.progressRole));
      }
      if (coalitionMap.has(student.coalitionRole)) {
        rolesAdd.push(coalitionMap.get(student.coalitionRole));
      }
      return rolesAdd;
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

    const newEmbed = new EmbedBuilder()
    .setColor('#00FFFF')
    .setTitle('All member roles have been updated!');

    return interaction.editReply({ content: '', embeds: [newEmbed] });
  }
}
