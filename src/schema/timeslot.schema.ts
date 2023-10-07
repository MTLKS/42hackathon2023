import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TimeslotDocument = HydratedDocument<Timeslot>;

@Schema()
export class Timeslot {
  @Prop()
  timeslot: string;

}

export const TimeslotSchema = SchemaFactory.createForClass(Timeslot);