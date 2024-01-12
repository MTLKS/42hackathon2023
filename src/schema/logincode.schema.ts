import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LoginCodeDocument = HydratedDocument<LoginCode>;

@Schema()
export class LoginCode {
  @Prop()
  code: string;

  @Prop()
  discordId: string;

  @Prop()
  discordUsername: string;

  @Prop()
  discordAvatarUrl: string;

  @Prop()
  createdAt: Date;

  @Prop() /* This is defined if the code has been used, DO NOT INITIALISE THIS */
  /* Ikr, like seriously leaving a DO NOT comment instead of making it not possible in the first place
    Duh, this isn't python dataclass I can't just init=False.
  */
  intraCode?: string;
}

export const LoginCodeSchema = SchemaFactory.createForClass(LoginCode);
