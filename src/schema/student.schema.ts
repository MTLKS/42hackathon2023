import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StudentDocument = HydratedDocument<Student>;

@Schema()
export class Student {
  @Prop()
  intraId: string;

  @Prop()
  discordId: string;

  @Prop()
  role: string;

}

export const StudentSchema = SchemaFactory.createForClass(Student);