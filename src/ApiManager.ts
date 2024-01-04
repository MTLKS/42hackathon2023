import { HttpService } from "@nestjs/axios";
import { ConsoleLogger, Logger } from "@nestjs/common";
import { Model } from "mongoose";
import { firstValueFrom } from "rxjs";
import { Student } from "./schema/student.schema";
import { Team } from "./schema/team.schema";

export enum ProjectStatus {
  Finished = 'finished',
  WaitingForCorrection = 'waiting_for_correction',
  InProgress = 'in_progress',
  SearchingAGroup = 'searching_a_group',
  CreatingGroup = 'creating_group'
}

export class ApiManager {
  public static readonly CAMPUS_ID = 34; // 42 Kuala Lumpur
  private static accessToken: string;
  private static readonly httpService = new HttpService();
  private static readonly logger = new Logger(ApiManager.name);

  private constructor () { }

  public static async init() {
    this.accessToken = await this.getAccessToken();
  }

  public static async getAccessToken(code?: string): Promise<string> {
    let redirect_uri = process.env.HOST;
    if (process.env.PORT !== undefined) {
      redirect_uri += `:${process.env.PORT}`;
    }

    const url = `https://api.intra.42.fr/oauth/token?grant_type=client_credentials&client_id=${process.env.API_UID}&client_secret=${process.env.API_SECRET}`;
    const { data } = await firstValueFrom(ApiManager.httpService.post(url));
    // let { data } = await firstValueFrom(ApiManager.httpService.post('https://api.intra.42.fr/oauth/token', {
    //   'grant_type': 'authorization_code',
    //   'client_id': process.env.API_UID,
    //   'client_secret': process.env.API_SECRET,
    //   'code': code,
    //   'redirect_uri': redirect_uri
    // }));

    return data.access_token;
  }

  public static getUser(intraIdOrLogin: string | number) {
    return this.get42Api(`users/${intraIdOrLogin}`);
  }

  public static async getUserInCampus(intraIdOrLogin: string | number) {
    const filterField = (typeof intraIdOrLogin === 'string' ? 'login' : 'id');
    const response: any[] = await this.get42Api(`campus/${this.CAMPUS_ID}/users`,
      `filter[${filterField}]=${intraIdOrLogin}`
    );

    if (response.length === 0) {
      return null;
    } else if (response.length > 1) {
      this.logger.warn(`Multiple users found for ${intraIdOrLogin}`);
    }
    return response[0];
  }

  public static async getCoalitionRole(intraIdOrLogin: string): Promise<string> {
    const response = await this.get42Api(`users/${intraIdOrLogin}/coalitions`);
    return response.data[0].name;
  }

  public static getProjectUsers(projectSlugOrId: string | number, intraId: number): Promise<Array<any>> {
    return this.get42Api(`projects/${projectSlugOrId}/projects_users`,
      `filter[user_id]=${intraId}`,
      `filter[campus]=${this.CAMPUS_ID}`
    );
  }

  public static getProjectTeams(projectSlugOrId: string | number, ...fields: string[]): Promise<Array<any>> {
    return this.get42Api(`projects/${projectSlugOrId}/teams`,
      ...fields.concat([`page[size]=100`, `filter[campus]=${this.CAMPUS_ID}`])
    );
  }

  public static getTeam(teamId: number, ...fields: string[]) {
    return this.get42Api(`teams/${teamId}`);
  }

  public static async getUserTeam(intraIdOrLogin: number | string, projectSlugOrId: string | number) {
    const response = await this.get42Api(`users/${intraIdOrLogin}/projects/${projectSlugOrId}/teams`);

    if (response.length === 0) {
      return null;
    } else if (response.length > 1) {
      this.logger.warn(`User ${intraIdOrLogin} has more than one team in project ${projectSlugOrId}`);
    }
    return response[0];
  }

  public static async intraTeamToTeam(intraTeam, studentModel: Model<Student>) {
    const users: any[] = intraTeam.users;
    const promises = users.map(async (user) => {
      let student = await studentModel.findOne({ intraId: user.id }).exec();

      if (student === null) {
        const c: Student = {
          intraId: user.id,
          intraName: user.login,
        };

        student = await studentModel.create(c);
      }
      return {student: student, leader: user.leader};
    });
    const members = await Promise.all(promises);
    const team: Team = {
      intraId: intraTeam.id,
      name: intraTeam.name,
      teamLeader: members.find((m) => m.leader).student,
      teamMembers: members.filter((m) => !m.leader).map((m) => m.student),
    };

    return team;
  }

  public static async get42Api(url: string, ...fields: string[]) {
    if (this.accessToken === undefined) {
      this.accessToken = await this.getAccessToken();
    }
    return await this.get("https://api.intra.42.fr/v2/" + url + `?${fields.join('&')}`, `Bearer ${this.accessToken}`);
  }

  /* TODO: This kinda don't belong to this class */
  public static getDiscordUserData(id: string) {
    return this.getDiscordApi(`https://discord.com/api/v10/users/${id}`);
  }

  private static async get(url: string, authorization: string) {
    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        headers: { Authorization: authorization }
      }));
    return data;
  }

  private static getDiscordApi(url: string) {
    return this.get(url, `Bot ${process.env.DISCORD_TOKEN}`);
  }
}
