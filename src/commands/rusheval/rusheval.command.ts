import { createCommandGroupDecorator } from 'necord';

export const RushEvalCommandDecorator = createCommandGroupDecorator({
  name: 'rusheval',
  description: 'Rush Eval',
  dmPermission: false,
});
