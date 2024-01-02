import { InjectModel } from "@nestjs/mongoose";
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
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
          this.logger.error(`Failed to fetch ${login} from intra: ${status} ${axiosError.response.statusText}`);
        }
        return interaction.reply({ content: `${login} not found (${status})`, ephemeral: true });
      }
    }
    const discordData = await interaction.guild.members.fetch({ user: interaction.user.id });
    const discordRoles = discordData.roles.cache.map(role => role.name);
    const temporaryGetRole = (roles: string[]) => {
      if (roles.includes('SPECIALIZATION')) return 'SPECIALIZATION';
      if (roles.includes('CADET')) return 'CADET';
      if (roles.includes('PISCINER')) return 'PISCINER';
      if (roles.includes('BLACKHOLED')) return 'BLACKHOLED'; 
      if (roles.includes('FLOATY')) return 'FLOATY';
      if (roles.includes('ALUMNI')) return 'ALUMNI';
      this.logger.error(`Unable to determine role for ${login} with roles ${roles}`);
      return null;
    }
    const student: Student = {
      intraId: intraData.id,
      intraName: login,
      discordId: discordData.id,
      discordName: interaction.user.username,
      discordServerName: discordData.displayName,
      discordServerRoles: discordRoles,
      discordServerJoinedAt: discordData.joinedAt,
      progressRole: temporaryGetRole(discordRoles),
    };
    try {
      await this.studentModel.create(student);
      return interaction.reply({ content: `Added ${login} as new student`, ephemeral: true });
    } catch (error) {
      this.logger.error(`Failed to add ${login} as new student: ${error}`);
      return interaction.reply({ content: `Failed to add ${login} as new student. Please contact the maintainer for this.`, ephemeral: true });
    }
  }
}
