import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class Api42Service {
  API_URL = 'https://api.intra.42.fr';
  API_UID = process.env.API_UID;
  API_SECRET = process.env.API_SECRET;
  ACCESS_TOKEN = '';

  constructor(private readonly httpService: HttpService) {
    this.httpService.post(`${this.API_URL}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: this.API_UID,
      client_secret: this.API_SECRET,
    }).subscribe(response => {
      this.ACCESS_TOKEN = response.data.access_token;
    });
  }
}
