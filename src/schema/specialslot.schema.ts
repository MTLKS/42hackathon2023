import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Student } from './student.schema';

export type SpecialslotDocument = HydratedDocument<Specialslot>;

@Schema()
export class Specialslot {
  @Prop()
  timeslot: string;

  @Prop()
  evaluators: Student[];

}

export const SpecialslotSchema = SchemaFactory.createForClass(Specialslot);