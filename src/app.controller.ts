import { Controller, Get, HttpStatus, Req, Res, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  async getCode(@Req() request: Request): Promise<string> {
    return this.appService.getCode(request);
  }

  @Get('login/:code')
  async getId(@Param('code') code: string, @Res() response: Response): Promise<void> {
    const url = `https://api.intra.42.fr/oauth/authorize?client_id=${process.env.THILA_BOT_API_UID}&redirect_uri=${process.env.THILA_BOT_URL}&response_type=code`;

    response.cookie('code', code);
    response.redirect(HttpStatus.FOUND, url);
  }
}
