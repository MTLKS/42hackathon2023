import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Timeslot } from './timeslot.schema';
import { Student } from './student.schema';

export type TeamDocument = HydratedDocument<Team>;

@Schema()
export class Team {
  @Prop()
  teamLeader: Student;

  @Prop()
  teamMembers: Student[];

  @Prop()
  timeslot: Timeslot;

  @Prop()
  evaluator: Student;
}

export const TeamSchema = SchemaFactory.createForClass(Team);