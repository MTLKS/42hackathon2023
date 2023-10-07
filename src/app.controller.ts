import { Controller, Get, Request } from '@nestjs/common';
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
  getId(@Param() param: any, @Response() response: any): void {
    response.cookie('id', param.id);
    response.redirect(302, process.env.CLIENT_REDIRECT);
  }
}
