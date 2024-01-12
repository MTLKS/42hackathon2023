import { InteractionReplyOptions } from 'discord.js';
import { createCommandGroupDecorator } from 'necord';

export const RushEvalCommandDecorator = createCommandGroupDecorator({
  name: 'rusheval',
  description: 'Rush Eval',
  dmPermission: false,
});
