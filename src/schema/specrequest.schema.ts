import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Student } from './student.schema';

export type SpecRequestDocument = HydratedDocument<SpecRequest>;

@Schema()
export class SpecRequest {
  @Prop()
  messageId: string;

  @Prop()
  student: Student;

}

export const SpecRequestSchema = SchemaFactory.createForClass(SpecRequest);