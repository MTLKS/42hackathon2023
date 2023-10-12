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
  coalitionRole?: string;

  @Prop({ required: false })
  intraImageLink?: string;

}

export const StudentSchema = SchemaFactory.createForClass(Student);