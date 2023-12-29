import { HttpService } from "@nestjs/axios";
import { Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

export class ApiManager {
  private static accessToken: string;
  private static readonly httpService = new HttpService();
  private static readonly logger = new Logger(ApiManager.name);

  private constructor () { }

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

  public static getUser(intraIdOrLogin: string) {
    return this.get42Api(`https://api.intra.42.fr/v2/users/${intraIdOrLogin}`);
  }

  public static async getCoalitionRole(intraIdOrLogin: string): Promise<string> {
    const response = await this.get42Api(`https://api.intra.42.fr/v2/users/${intraIdOrLogin}/coalitions`);
    return response.data[0].name;
  }

  /* TODO: This kinda don't belong to this class */
  public static getDiscordUserData(id: string) {
    return this.getDiscordApi(`https://discord.com/api/v10/users/${id}`);
  }

  public static async get42Api(url: string) {
    if (this.accessToken === undefined) {
      try {
        this.accessToken = await this.getAccessToken();
      } catch (error) {
        this.logger.fatal(`Failed to get access token from 42 API: ${error.response.data.error_description}`);
        return ;
      }
    }
    return await this.get(url, `Bearer ${this.accessToken}`);
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
