import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Student } from './student.schema';
import { Timeslot } from './timeslot.schema';

export type EvaluatorDocument = HydratedDocument<Evaluator>;

@Schema()
export class Evaluator {
  @Prop()
  student: Student;

  @Prop()
  timeslots: Timeslot[];

  @Prop()
  lastCreatedTimeslotsAt?: Date;
}

export const EvaluatorSchema = SchemaFactory.createForClass(Evaluator);