import { Controller, Get, HttpStatus, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { Param, Response } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getCode(@Request() request: any): Promise<string> {
    return this.appService.getCode(request);
  }

  @Get('login/:id')
  async getId(@Param() param: any, @Response() response: any): Promise<void> {
    response.cookie('id', param.id);
    if (process.env.CLIENT_REDIRECT == undefined) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send('No redirect url provided');
    } else {
      response.redirect(302, process.env.CLIENT_REDIRECT);
    }
  }
}
