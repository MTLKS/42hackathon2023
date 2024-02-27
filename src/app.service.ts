import { Injectable, Logger, Req } from '@nestjs/common';
import { Once, Context, ContextOf } from 'necord';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Student } from './schema/student.schema';
import { Model } from 'mongoose';
import { ActivityType } from 'discord.js';
import { LoginCode } from './schema/logincode.schema';
import { ApiManager } from './ApiManager';
import { Request } from 'express';

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

function thilaBotResponse(body: string): string {
  return `
<html>
<head>
<title>THILA Bot</title>
<style>
  body {
    background-color: #222222;
    color: #FFFFFF;
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

  img {
    margin: 1vw;
    border-radius: 10px;
  }
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

@Injectable()
export class AppService {
  constructor(
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

  async getCode(@Req() request: Request): Promise<string> {
    const hiBestieGif = "https://i.pinimg.com/originals/49/b7/93/49b793ae912e181461e1fe87530f1818.gif";
    const chairFallGif = "https://media1.tenor.com/m/L4OqCI0rthEAAAAd/hatsune-miku-chair.gif";
    const swingGif = "https://media1.tenor.com/m/QONGo5d2GdIAAAAd/hatsune-miku-miku-hatsune.gif";

    if (request.query?.error) {
      return thilaBotResponse(`<h1>Access Denied</h1>
      <div class="break"></div>
      <img src="${chairFallGif}" height="200px">
      `);
    }
    const code = request.cookies['code'];
    if (!code) {
      return thilaBotResponse(`<img src="${hiBestieGif}" height="200px">`);
    }
    const loginCode = await this.loginCodeModel.findOne({ code: code });

    if (loginCode === null) {
      return thilaBotResponse(`<h1>The link has either expired or is invalid</h1>
      <div class="break"></div>
      <img src="${chairFallGif}" height="200px">
      `);
    }
    this.logger.log(`${loginCode.discordUsername} attempted to login`);
    if (loginCode.intraCode !== undefined) {
      const student = await this.studentModel.findOne({ discordId: loginCode.discordId });
      return thilaBotResponse(`
      <h1>Hi ${student.discordName} | ${student.intraName}</h1>
      <div class="break"></div>
      <img src="${hiBestieGif}" height="200px">
      <img src="${loginCode.discordAvatarUrl}" height="200px">
      `);
    }
    loginCode.intraCode = request.query.code as string;
    await loginCode.save();
    const access_token = await ApiManager.getAccessToken(loginCode.intraCode).catch((error) => {
      this.logger.error(`${loginCode.discordUsername}: ${error.data.error_description}`);
      return null;
    });
    if (access_token === null) {
      this.logger.debug(`${loginCode.discordUsername}'s code expired, presumably before the loginCode timeout (5min)`);
      return thilaBotResponse(`<h1>Code expired. Please try creating a new link.</h1>
      <div class="break"></div>
      <img src="${swingGif}" height="200px">
    `);
    }
    const api = new ApiManager(access_token);
    const intraUserData = await api.get('me');
    const intraId = intraUserData.id;
    const role = getCursusRole(intraUserData.cursus_users)

    let coalition = '';
    if (role === 'SPECIALIZATION' || role === 'CADET') {
      const coalitionResponse = await api.get(`users/${intraId}/coalitions`);
      coalition = coalitionResponse[0].name;
    }
    const student = await this.studentModel.findOne({ intraId: intraId })
      ?? new this.studentModel({
        intraId: intraId,
        intraName: intraUserData.login,
      });

    student.poolYear = intraUserData.pool_year;
    student.poolMonth = intraUserData.pool_month;
    student.discordId = loginCode.discordId;
    student.discordName = loginCode.discordUsername;
    student.progressRole = role;
    student.coalitionRole = coalition;
    student.intraImageLink = intraUserData.image.link;
    await student.save();
    this.logger.log(`Registered ${loginCode.discordUsername} as ${student.intraName}`);
    return thilaBotResponse(`
  <h1>You are now logged in to THILA Bot</h1>
  <div class="break"></div>
  <img src="https://64.media.tumblr.com/58a920b1da6459ad18274328dfe55784/tumblr_n2ykjx27uE1tqptlzo1_r1_500.gif" height="200px">
  <div class="break"></div>
  <img src="${loginCode.discordAvatarUrl}" height="200px" padding="20px">
  <img src="${intraUserData.image.versions.medium}" height="200px" padding="20px">
`);
  }
}
