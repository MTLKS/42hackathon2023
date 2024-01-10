import { Injectable, Logger, Request } from '@nestjs/common';
import { Once, Context, ContextOf } from 'necord';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Student } from './schema/student.schema';
import { Model } from 'mongoose';
import { ActivityType } from 'discord.js';
import { LoginCode } from './schema/logincode.schema';

function getCursusRole(cursus_users) {
  if (cursus_users.length == 1) {
    if (new Date(cursus_users[0].end_at).getTime() < Date.now())
      return 'FLOATY';
    else
      return 'PISCINER';
  }
  else if (cursus_users[1].grade == 'Member') {
    return 'SPECIALIZATION';
  } else if (cursus_users[1].grade == 'Learner') {
    if (new Date(cursus_users[1].blackholed_at).getTime() < Date.now())
      return 'BLACKHOLED';
    else if (new Date(cursus_users[1].begin_at).getTime() < Date.now())
      return 'CADET';
    else
      return 'RESERVISTS';
  }
}

@Injectable()
export class AppService {
  constructor(
    private httpService: HttpService,
    @InjectModel(Student.name) private readonly studentModel: Model<Student>,
    @InjectModel(LoginCode.name) private readonly loginCodeModel: Model<LoginCode>,
  ) {
    this.loginCodeModel.deleteMany();
  }
  private readonly logger = new Logger(AppService.name);

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
    client.user.setPresence({
      activities: [
        {
          name: 'all cadets',
          type: ActivityType.Watching,
        },
      ]
    });
  }

  async getCode(@Request() request: any): Promise<string> {
    const loginCode = await this.loginCodeModel.findOne({ code: request.cookies['code'] });

    if (loginCode === null) {
      return 'The link has either expired or is invalid';
    }
    if (request.query.code === null) {
      return 'No code provided';
    }
    let redirect_uri = process.env.BOT_HOST;
    if (process.env.BOT_PORT != undefined) {
      redirect_uri += `:${process.env.BOT_PORT}`;
    }

    let { data } = await firstValueFrom(this.httpService.post('https://api.intra.42.fr/oauth/token', {
      'grant_type': 'authorization_code',
      'client_id': process.env.API_UID,
      'client_secret': process.env.API_SECRET,
      'code': request.query.code,
      'redirect_uri': redirect_uri
    }));

    const intraUserData = await firstValueFrom(this.httpService.get('https://api.intra.42.fr/v2/me', { headers: { Authorization: `Bearer ${data.access_token}` } }));
    const intraId = intraUserData.data.id;
    let student = await this.studentModel.findOne({ intraId: intraId });
    const role = getCursusRole(intraUserData.data.cursus_users)

    let coalition = '';
    if (role == 'SPECIALIZATION' || role == 'CADET') {
      let coalitionResponse = await firstValueFrom(this.httpService.get(`https://api.intra.42.fr/v2/users/${intraId}/coalitions`, { headers: { Authorization: `Bearer ${data.access_token}` } }));
      coalition = coalitionResponse.data[0].name;
    }

    if (student == null) {
      student = new this.studentModel({
        intraId: intraId,
        intraName: intraUserData.data.login,
        poolYear: intraUserData.data.pool_year,
        poolMonth: intraUserData.data.pool_month,
      });
    }
    const discordUserData = await firstValueFrom(this.httpService.get(`https://discord.com/api/v10/users/${loginCode.discordId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      },
    }));
    student.discordId = loginCode.discordId;
    student.discordName = discordUserData.data.username;
    student.progressRole = role;
    student.coalitionRole = coalition;
    student.intraImageLink = intraUserData.data.image.link;

    await student.save();

    return `
      <html>
        <head>
          <title>THILA Bot</title>
        </head>
        <body>
        <style>
          body {
            background-color: #222222;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            align-content: center;
            font-family: Arial, Helvetica, sans-serif;
          }
          .break {
            flex-basis: 100%;
            height: 0;
          }
        </style>
          <h1 style="color: #FFFFFF">You are now logged in to THILA Bot</h1>
          <div class="break"></div>
          <img src="https://64.media.tumblr.com/58a920b1da6459ad18274328dfe55784/tumblr_n2ykjx27uE1tqptlzo1_r1_500.gif" height="200px"></img>
          <div class="break"></div>
          <img src="https://cdn.discordapp.com/avatars/${discordUserData.data.id}/${discordUserData.data.avatar}.png" height="200px" padding="20px"></img>
          <img src="${intraUserData.data.image.link}" height="200px" padding="20px"></img>
        </body>
      </html>
      `;
  }
}
