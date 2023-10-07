import { Injectable, Logger, Request } from '@nestjs/common';
import { Once, Context, ContextOf } from 'necord';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(private httpService: HttpService) {}
  private readonly logger = new Logger(AppService.name);

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  getHello() {
    return 'Hi!'
  }

  async getCode(@Request() request: any): Promise<string> {
    if (request.query.code == null) {
      return 'No code provided';
    }

    console.log(request.query.code);
    console.log(request.cookies['id']);
    let { data } = await firstValueFrom(this.httpService.post('https://api.intra.42.fr/oauth/token', {
      'grant_type': 'authorization_code',
      'client_id': process.env.API_UID,
      'client_secret': process.env.API_SECRET,
      'code': request.query.code,
      'redirect_uri': 'http://hack.mtlks.com:3000'
    }));
    console.log(data.access_token);
    let userResponse = await firstValueFrom(this.httpService.get('https://api.intra.42.fr/v2/me', { headers: { Authorization: `Bearer ${data.access_token}` } }));
    console.log(userResponse.data.id);
    let coalitionResponse = await firstValueFrom(this.httpService.get(`https://api.intra.42.fr/v2/users/${userResponse.data.id}/coalitions`, { headers: { Authorization: `Bearer ${data.access_token}` } }));
    console.log(coalitionResponse.data[0].name);
    // this.server.emit('addRole', {
    //   'id': request.cookies['id'],
    //   'coalition': coalitionResponse.data[0].name
    // });
    return 'All set!';
  }
}
