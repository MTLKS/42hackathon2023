import axios from 'axios';

export class Api42Service {
  static readonly API_URL = 'https://api.intra.42.fr';
  static readonly API_UID = process.env.API_UID;
  static readonly API_SECRET = process.env.API_SECRET;

  constructor(private readonly access_token: string) {
  }

  async getUserInfo(login: string, ...args: string[]) {
    args.push(`access_token=${this.access_token}`)
    const url = `${Api42Service.API_URL}/v2/users/${login}?${args.join('&')}`
    return axios.get(url)
  }

  async getProjectTeams(project_id: string | number, ...args: string[]) {
    args.push(`access_token=${this.access_token}`)
    const url = `${Api42Service.API_URL}/v2/projects/${project_id}/teams?${args.join('&')}`
    return axios.get(url)
  }

}
