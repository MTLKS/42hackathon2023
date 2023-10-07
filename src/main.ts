import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

import { HttpService } from '@nestjs/axios';
import { Api42Service } from './api42/api42.service';

import axios, { Axios, AxiosError } from 'axios'
import { exit } from 'process';
import { writeFile } from 'fs';
const { DateTime } = require('luxon');

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
  let service: Api42Service;
  const CAMPUS_ID = 34;

  try {
    service = new Api42Service((await initAccessToken()).data.access_token)
  } catch (error) {
    console.error(error)
    exit(1)
  }
  const logerr = function(err) {
    if (err) {
      return console.error(err)
    }
    else {
      console.log('ok')
    }
  }
  try {
    {
      const login: string  = 'hqixeo'
  
      let info = await service.getUserInfo(login)
    
      // console.log(info)
      // console.log(typeof info)
      // console.log(typeof info.data)
      writeFile(`${login}.json`, JSON.stringify(info.data, null, '\t'), logerr)
    }
    {
      const project_id = 'c-piscine-rush-01'
      const now = DateTime.now().toFormat('yyyy-MM-dd');
      const start = DateTime.now().minus({ weeks: 4 }).toFormat('yyyy-MM-dd');
      let   info = await service.getProjectTeams(project_id,
        `filter[campus]=${CAMPUS_ID}`,
        `range[created_at]=${start},${now}`)
  
      writeFile(`${project_id}.json`, JSON.stringify(info.data, null, '\t'), logerr)
    }
  } catch (error) {
    console.log(typeof error)
    console.error(error)
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  await app.listen(3001);
  api42_use_example()
}

bootstrap();
