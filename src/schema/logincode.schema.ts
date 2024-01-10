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
}

export const LoginCodeSchema = SchemaFactory.createForClass(LoginCode);
