import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StudentDocument = HydratedDocument<Student>;

@Schema()
export class Student {
  @Prop()
  intraId: string;

  @Prop()
  intraName: string;

  @Prop()
  discordId: string;

  @Prop()
  progressRole: string;

  @Prop()
  coalitionRole: string;

}

export const StudentSchema = SchemaFactory.createForClass(Student);