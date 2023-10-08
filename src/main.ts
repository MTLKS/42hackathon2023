import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { Api42Service } from './api42/api42.service';
import axios from 'axios'
import { exit } from 'process';
import { writeFile, writeFileSync } from 'fs';
import { DateTime } from 'luxon';

async function initAccessToken()
{
  const UID = process.env.API_UID;
  const SECRET = process.env.API_SECRET;

  if (!UID) {
    throw new Error('API_UID environment variable not set');
  }
  if (!SECRET) {
    throw new Error('API_SECRET environment variable not set');
  }

  const headers = { 'Content-type': 'application/json' };
  return axios.post(`${Api42Service.API_URL}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: UID,
      client_secret: SECRET
    }, { headers })
}


async function api42_use_example() {
  const throwerr = (err) => { if (err) throw err }
  let service: Api42Service

  try {
    service = new Api42Service((await initAccessToken()).data.access_token)
  } catch (error) {
    console.error(error)
    exit(1)
  }
  try {
    /** fetching user with login */
    // {
    //   const login: string  = 'hqixeo'
  
    //   let info = await service.getUserInfo(login)
    
    //   // console.log(info)
    //   // console.log(typeof info)
    //   // console.log(typeof info.data)
    //   writeFile(`${login}.json`, JSON.stringify(info.data, null, '\t'), throwerr)
    // }
    // /** fetching project with slug */
    // {
    //   const ID_42KL = 34;
    //   const project_id = 'c-piscine-rush-01'
    //   const now = DateTime.now().toFormat('yyyy-MM-dd');
    //   const start = DateTime.now().minus({ weeks: 4 }).toFormat('yyyy-MM-dd');
    //   let   info = await service.getProjectTeams(project_id,
    //     `filter[campus]=${ID_42KL}`,
    //     `range[created_at]=${start},${now}`)

    //   writeFile(`${ID_42KL} ${project_id}.json`, JSON.stringify(info.data, null, '\t'), throwerr)
    // }
    /** fetching ongoing rush and filter data */
    {
      const ID_42WOLFSBURG = 44;
      const project_id = 'c-piscine-rush-02'
      const info = await service.getProjectTeams(project_id,
          'filter[status]=in_progress,waiting_for_evaluation',
          `filter[campus]=${ID_42WOLFSBURG}`
        )
      const arr = JSON.parse(JSON.stringify(info.data)).map(group => {
          const data  = {
            id: group['id'],
            name: group['name'],
            users: group['users'].map(user => { return user['login'] }),
            leader: group['users'].find(user => { return (user['leader']) })['login']
          }

          return (data)
        })

      writeFile(`${ID_42WOLFSBURG} ${project_id}.json`, JSON.stringify(arr, null, '\t'), throwerr)
    }
  } catch (error) {
    console.error(error)
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  await app.listen(process.env.PORT || 3000);
  // api42_use_example()
}

bootstrap();
