import { InteractionReplyOptions } from 'discord.js';
import { createCommandGroupDecorator } from 'necord';

export const RushEvalCommandDecorator = createCommandGroupDecorator({
  name: 'rusheval',
  description: 'Rush Eval',
});

export const LOGIN_REDIRECT_REPLY: InteractionReplyOptions = {
  content: 'Please identify yourself by clicking on login button fist.',
  ephemeral: true
};



