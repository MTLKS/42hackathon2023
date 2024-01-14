import { HttpService } from "@nestjs/axios";
import { HttpStatus, Logger } from "@nestjs/common";
import { Model } from "mongoose";
import { firstValueFrom } from "rxjs";
import { Student } from "./schema/student.schema";
import { Team } from "./schema/team.schema";
import axios, { AxiosError } from "axios";

export type ProjectIdentifier = string | number;

export enum ProjectStatus {
  Finished = 'finished',
  WaitingForCorrection = 'waiting_for_correction',
  InProgress = 'in_progress',
  SearchingAGroup = 'searching_a_group',
  CreatingGroup = 'creating_group'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ApiManager {
  /* left hardcoded as such
    since it doesn't make sense for a single instance to deal with multiple campuses rush evaluations
  */
  public static readonly CAMPUS_ID = 34; // 42 Kuala Lumpur
  private static defaultInstance: ApiManager;

  public constructor (
    private accessToken: string,
    private readonly httpService = new HttpService(),
    private readonly logger = new Logger(ApiManager.name),
  ) { }

  public static async initDefaultInstance() {
    if (this.defaultInstance !== undefined) {
      return ;
    }
    this.defaultInstance = new ApiManager(await this.getAccessToken());
  }

  public static getDefaultInstance() {
    if (this.defaultInstance === undefined) {
      throw new Error('Default instance not initialized');
    }
    return this.defaultInstance;
  }

  public static async getAccessToken(code?: string): Promise<string> {
    const params = {
      grant_type: 'client_credentials',
      client_id: process.env.API_UID,
      client_secret: process.env.API_SECRET,
      code: code,
      redirect_uri: undefined
    }

    if (code !== undefined) {
      params.grant_type = 'authorization_code';

      let redirect_uri = process.env.BOT_HOST;
      if (process.env.BOT_PORT !== undefined) {
        redirect_uri += `:${process.env.BOT_PORT}`;
      }
      params.redirect_uri = redirect_uri;
    }

    try {
      const { data } = await axios.post('https://api.intra.42.fr/oauth/token',
        undefined,
        { params: params }
      );

      return data.access_token;
    } catch (e) {
      const error = e as AxiosError;

      if (error.response?.status !== HttpStatus.TOO_MANY_REQUESTS) {
        throw error;
      }
      const waitTime = parseInt(error.response.headers['retry-after']) * 1000;

      await sleep(waitTime);
      return await this.getAccessToken(code);
    }
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
      return { student: student, leader: user.leader };
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

  public getUser(intraIdOrLogin: string | number) {
    return this.get(`users/${intraIdOrLogin}`);
  }

  public async getUserInCampus(intraIdOrLogin: string | number) {
    const filterField = (typeof intraIdOrLogin === 'string' ? 'login' : 'id');
    const params = {};

    params[`filter[${filterField}]`] = intraIdOrLogin;
    console.log('params in getUserInCampus', params);
    const response: any[] = await this.get(`campus/${ApiManager.CAMPUS_ID}/users`, params);

    if (response.length === 0) {
      return null;
    } else if (response.length > 1) {
      this.logger.warn(`Multiple users found for ${intraIdOrLogin}`);
    }
    return response[0];
  }

  public async getCoalitionRole(intraIdOrLogin: string): Promise<string> {
    const response = await this.get(`users/${intraIdOrLogin}/coalitions`);
    return response.data[0].name;
  }

  public getProjectUsers(projectSlugOrId: string | number, intraId: number): Promise<Array<any>> {
    return this.get(`projects/${projectSlugOrId}/projects_users`, {
      'filter[user_id]': intraId,
      'filter[campus]': ApiManager.CAMPUS_ID
    });
  }

  public getProjectTeams(projectSlugOrId: string | number, params?: any): Promise<Array<any>> {
    if (params === undefined) {
      params = {};
    }
    params['page[size]'] = params['page[size]'] ?? 100;
    params['filter[campus]'] = ApiManager.CAMPUS_ID;
    return this.get(`projects/${projectSlugOrId}/teams`, params);
  }

  public getTeam(teamId: number, params?: any) {
    return this.get(`teams/${teamId}`, params);
  }

  public async getUserTeam(intraIdOrLogin: number | string, projectSlugOrId: string | number) {
    const response = await this.get(`users/${intraIdOrLogin}/projects/${projectSlugOrId}/teams`);

    if (response.length === 0) {
      return null;
    } else if (response.length > 1) {
      this.logger.warn(`User ${intraIdOrLogin} has more than one team in project ${projectSlugOrId}`);
    }
    return response[0];
  }

  public async get(url: string, params?: any) {
    while (true) {
      try {
        const { data } = await firstValueFrom(this.httpService.get("https://api.intra.42.fr/v2/" + url, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          params: params,
        }));
        return data;
      } catch (error) {
        if (error.response.status === HttpStatus.TOO_MANY_REQUESTS) {
          const waitTime = parseInt(error.response.headers['retry-after']) * 1000;
          await sleep(waitTime);
        } else if (error.response.status === HttpStatus.UNAUTHORIZED) {
          this.accessToken = await ApiManager.getAccessToken();
        } else {
          this.logger.error(`Failed to get ${url}: ${error.message}`);
          throw error;
        }
      }
    }
  }
}
