import { InjectModel } from "@nestjs/mongoose";
import { ActionRowBuilder, Guild, ModalBuilder, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { Model } from "mongoose";
import { Student } from "./schema/student.schema";
import { Modal, ModalContext } from "necord";
import { ApiManager } from "./ApiManager";
import { ConsoleLogger } from "@nestjs/common";
import { Evaluator } from "./schema/evaluator.schema";
import { AxiosError } from "axios";

export function newStudentModal(): ModalBuilder {
  /* TODO: add trace of where we left off so that after modal finish could automatically track back? */
  const login = new TextInputBuilder()
    .setStyle(TextInputStyle.Short)
    .setCustomId('login')
    .setLabel('Intra Login')
    .setPlaceholder('maliew')
    ;
  const component = new ActionRowBuilder<TextInputBuilder>()
    .addComponents(login)
    ;
  const modal = new ModalBuilder()
    .setCustomId('new-student-modal')
    .setTitle('New Student detected')
    .addComponents(component)
    ;
  return modal;
}

/* Foresighting a ticket for reconfiguring intra */
export class StudentService {
  private readonly logger = new ConsoleLogger("StudentService");
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>
    ) { }

  private static temporaryGetRole(roles: string[]) {
    const knownRoles = ['SPECIALIZATION', 'CADET', 'PISCINER', 'BLACKHOLED', 'FLOATY', 'ALUMNI'];

    return knownRoles.find(r => roles.includes(r))
  }

  public static async setStudentDiscordData(guild: Guild, user: User, student: Student) {
    const discordData = await guild.members.fetch({ user: user.id });
    const discordRoles = discordData.roles.cache.map(role => role.name);

    student.discordId = discordData.id;
    student.discordName = user.username;
    student.discordServerName = discordData.displayName;
    student.discordServerRoles = discordRoles;
    student.discordServerJoinedAt = discordData.joinedAt;
    student.progressRole = StudentService.temporaryGetRole(discordRoles);
    return student;
  }

  @Modal('new-student-modal')
  public async onNewStudent([interaction]: ModalContext) {
    const login = interaction.fields.getField('login').value;
    let intraData;

    try {
      intraData = await ApiManager.getUser(login);
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response.status;

      if (status === 401) {
        return interaction.reply({ content: `Internal server authentication error, please notify the maintainer for this issue.`, ephemeral: true });
      } else {
        if (status !== 404) {
          this.logger.warn(`Failed to fetch ${login} from intra: ${status} ${axiosError.response.statusText}`);
        }
        return interaction.reply({ content: `${login} not found (${status})`, ephemeral: true });
      }
    }
    const discordData = await interaction.guild.members.fetch({ user: interaction.user.id });
    const discordRoles = discordData.roles.cache.map(role => role.name);
    const student: Student = {
      intraId: intraData.id,
      intraName: login,
      discordId: discordData.id,
      discordName: interaction.user.username,
      discordServerName: discordData.displayName,
      discordServerRoles: discordRoles,
      discordServerJoinedAt: discordData.joinedAt,
      progressRole: StudentService.temporaryGetRole(discordRoles),
    };
    if (student.progressRole === null) {
      this.logger.error(`Unable to determine role for ${login} with roles ${discordRoles}`);
    }
    return await this.studentModel.create(student).then(() => {
      this.logger.log(`Added ${login} as new student`);
      return interaction.reply({ content: `Added ${login} as new student`, ephemeral: true });
    }).catch(error => {
      this.logger.warn(`Failed to add ${login} as new student: ${error}`);
      return interaction.reply({ content: `Failed to add ${login} as new student. Please contact the maintainer for this.`, ephemeral: true });
    });
  }
}
