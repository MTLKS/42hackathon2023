import { Injectable, Logger } from '@nestjs/common';
import { Once, Context, ContextOf } from 'necord';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

	@Once('ready')
	public onReady(@Context() [client]: ContextOf<'ready'>) {
		this.logger.log(`Bot logged in as ${client.user.username}`);
	}

  getHello() {
    return 'Hi!'
  }
}
