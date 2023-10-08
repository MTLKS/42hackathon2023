import { Injectable, Logger, Request } from '@nestjs/common';
import { Once, Context, ContextOf } from 'necord';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Student } from './schema/student.schema';
import { Model } from 'mongoose';

@Injectable()
export class AppService {
  constructor(private httpService: HttpService, @InjectModel(Student.name) private readonly studentModel: Model<Student>) {}
  private readonly logger = new Logger(AppService.name);

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  async getCode(@Request() request: any): Promise<string> {
    if (request.query.code == null) {
      return 'No code provided';
    }

    let { data } = await firstValueFrom(this.httpService.post('https://api.intra.42.fr/oauth/token', {
      'grant_type': 'authorization_code',
      'client_id': process.env.API_UID,
      'client_secret': process.env.API_SECRET,
      'code': request.query.code,
      'redirect_uri': 'http://hack.mtlks.com:3000'
    }));
    let userResponse = await firstValueFrom(this.httpService.get('https://api.intra.42.fr/v2/me', { headers: { Authorization: `Bearer ${data.access_token}` } }));
    let student = await this.studentModel.findOne({ intraId: userResponse.data.id });
    let role = '';
    if (userResponse.data.cursus_users.length == 1) {
      if (new Date(userResponse.data.cursus_users[0].end_at).getTime() < Date.now())
        role = 'FLOATY';
      else
        role = 'PISCINER';
    }
    else if (userResponse.data.cursus_users[1].grade == 'Member') {
      role = 'SPECIALIZATION';
    } else if (userResponse.data.cursus_users[1].grade == 'Learner') {
      if (new Date(userResponse.data.cursus_users[1].blackholed_at).getTime() < Date.now())
        role = 'BLACKHOLED';
      else if (new Date(userResponse.data.cursus_users[1].begin_at).getTime() < Date.now())
        role = 'CADET';
      else
        role = 'RESERVISTS';
    }

    let coalition = '';
    if (role == 'SPECIALIZATION' || role == 'CADET') {
      let coalitionResponse = await firstValueFrom(this.httpService.get(`https://api.intra.42.fr/v2/users/${userResponse.data.id}/coalitions`, { headers: { Authorization: `Bearer ${data.access_token}` } }));
      coalition = coalitionResponse.data[0].name;
    }

    if (student == null) {
      student = new this.studentModel({
        intraId: userResponse.data.id,
        intraName: userResponse.data.login,
        discordId: request.cookies['id'],
        progressRole: role,
        coalitionRole: coalition
      });
      await student.save();
    } else {
      student.discordId = request.cookies['id'];
      student.progressRole = role;
      student.coalitionRole = coalition;
      await student.save();
    }

    return 'All set!';
  }
}
