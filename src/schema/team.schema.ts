import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Timeslot } from './timeslot.schema';
import { Student } from './student.schema';

export type TeamDocument = HydratedDocument<Team>;

@Schema()
export class Team {
  @Prop()
  intraId: number;

  @Prop()
  name: string;

  @Prop()
  teamLeader: Student;

  @Prop()
  teamMembers: Student[];

  @Prop()
  timeslot?: Timeslot;

  @Prop()
  evaluator?: Student;

  @Prop()
  chosenTimeslotAt?: Date;

  @Prop()
  chosenTimeslotBy?: Student;

  @Prop()
  feedback?: Map<string, string>;

  @Prop()
  feedbackAt?: Date;
}

export const TeamSchema = SchemaFactory.createForClass(Team);