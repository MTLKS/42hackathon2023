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
  private static readonly logger = new ConsoleLogger("StudentService");
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(Evaluator.name) private readonly evaluatorModel: Model<Evaluator>
    ) { }

  public static getCursusRole(cursus_users: any[]) {
    console.log(cursus_users);
    if (cursus_users.length === 0) {
      return undefined;
    } else if (cursus_users.length === 1) {
      const piscine = cursus_users[0];
      const piscineEnded = new Date(piscine.end_at).getTime() < Date.now();

      if (piscineEnded === false) {
        return 'PISCINER';
      } else {
        return 'FLOATY';
      }
    } else if (cursus_users.length !== 2){
      this.logger.warn('Unknown cursus_users length: ' + cursus_users.length);
    }
    const core = cursus_users[1];

    if (core.grade === 'Member') {
      return 'SPECIALIZATION';
    } else if (core.grade !== 'Learner') {
      this.logger.warn('Unknown grade: ' + core.grade);
    }
    if (new Date(core.blackholed_at).getTime() < Date.now())
      return 'BLACKHOLED';
    else if (new Date(core.begin_at).getTime() < Date.now())
      return 'CADET';
    else
      return 'RESERVISTS';
  }
    
  public static async setStudentDiscordData(guild: Guild, user: User, student: Student) {
    const discordData = await guild.members.fetch({ user: user.id });

    student.discordId = discordData.id;
    student.discordName = user.username;
    student.discordServerName = discordData.displayName;
    return student;
  }

  @Modal('new-student-modal')
  public async onNewStudent([interaction]: ModalContext) {
    const login = interaction.fields.getField('login').value;
    const studentAlreadyExist = await this.studentModel.findOne({ intraName: login }).exec()
      .then(student => student !== null);
    if (studentAlreadyExist) {
      return interaction.reply({ content: `${login} has been registered, pleace contact the admin **IMMEDIATELY** if this is your intra login.`, ephemeral: true });
    }
    let intraData;

    try {
      intraData = await ApiManager.getUser(login);
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response.status;

      if (status === 401) {
        return interaction.reply({ content: `Internal server authentication error, please notify the maintainer for this issue.`, ephemeral: true });
      } else if (status === 404) {
        return interaction.reply({ content: `${login} not found`, ephemeral: true });
      }
      StudentService.logger.warn(`Failed to fetch ${login} from intra: ${status} ${axiosError.response.statusText}`);
      return interaction.reply({ content: `Internal server error. (${status})`, ephemeral: true });
    }
    if (intraData.campus_users[0].campus_id !== ApiManager.CAMPUS_ID) {
      return interaction.reply({ content: `${login} is not local student.`, ephemeral: true });
    }
    const student: Student = {
      intraId: intraData.id,
      intraName: login,
      poolYear: intraData.pool_year,
      poolMonth: intraData.pool_month,
      progressRole: StudentService.getCursusRole(intraData.cursus_users),
    };

    if (student.progressRole === undefined) {
      StudentService.logger.error(`Unable to determine progressRole for ${login}`);
    }
    await StudentService.setStudentDiscordData(interaction.guild, interaction.user, student);
    return await this.studentModel.create(student).then(() => {
      StudentService.logger.log(`Added ${login} as new student`);
      return interaction.reply({ content: `Added ${login} as new student`, ephemeral: true });
    }).catch(error => {
      StudentService.logger.warn(`Failed to add ${login} as new student: ${error}`);
      return interaction.reply({ content: `Failed to add ${login} as new student. Please contact the maintainer for this.`, ephemeral: true });
    });
  }
}
