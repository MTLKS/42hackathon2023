import { Controller, Get, HttpStatus, Req, Res, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getCode(@Req() request: Request): Promise<string> {
    return this.appService.getCode(request);
  }

  @Get('login/:id')
  async getId(@Param('id') id: string, @Res() response: Response): Promise<void> {
    response.cookie('id', id);

    if (process.env.CLIENT_REDIRECT === undefined) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send('No redirect url provided');
    } else {
      response.redirect(HttpStatus.FOUND, process.env.CLIENT_REDIRECT);
    }
  }
}
