import { InjectModel } from "@nestjs/mongoose";
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Model } from "mongoose";
import { Student } from "./schema/student.schema";
import { Modal, ModalContext } from "necord";
import { ApiManager } from "./ApiManager";
import { Evaluator } from "./schema/evaluator.schema";
import { ConsoleLogger } from "@nestjs/common";

export function newEvaluatorModal(): ModalBuilder {
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
    .setCustomId('new-evaluator-modal')
    .setTitle('New Evaluator detected')
    .addComponents(component)
    ;
  return modal;
}

/* Foresighting a ticket for reconfiguring intra */
export class StudentService {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>
    ) { }

  @Modal('new-evaluator-modal')
  public async onNewEvaluator([interaction]: ModalContext) {
    const login = interaction.fields.getField('login').value;
    let intraData;

    try {
      intraData = await ApiManager.getUser(login);
    } catch (error) {
      const status = error.response.status;

      if (status === 401) {
        return interaction.reply({ content: `Internal server authentication error, please notify the maintainer for this issue.`, ephemeral: true });
      } else {
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
      const logger = new ConsoleLogger("StudentService");
      logger.error(`Unable to determine role for ${login} with roles ${roles}`);
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
      const unique_student = await this.studentModel.findOne(student).exec();
      await this.evaluatorModel.create({student: unique_student});
      return interaction.reply({ content: `Added ${login} as new evaluator`, ephemeral: true });
    } catch (error) {
      const logger = new ConsoleLogger("StudentService");
      logger.error(`Failed to add ${login} as new evaluator: ${error}`);
      return interaction.reply({ content: `Failed to add ${login} as new evaluator. Please contact the maintainer for this.`, ephemeral: true });
    }
  }
}
