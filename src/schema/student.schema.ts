import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StudentDocument = HydratedDocument<Student>;

// type CopilotAfterITypedSegmentation = 'Segmentation Fault' | 'Bus Error' | 'Floating Point Exception' | 'Stack Smashing Detected' | 'Memory Leak' | 'Null Pointer Dereference' | 'Resource Leak' | 'Time Out' | 'Killed' | 'Abort' | 'Out of Memory' | 'Illegal Instruction' | 'Broken Pipe';
// type CoalitionRoleCopilot = 'Memory Master' | 'Resource Reaper' | 'Illegal Instructor';

export type ProgressRole = 'Cadet' | 'Pisciner'| 'Specialisation';
export type CoalitionRole = 'Segmentation Slayer' | 'Bug Buster'| 'Unix Unicorn'| 'Kernel Kamikaze';

@Schema()
export class Student {
  @Prop()
  intraId: number;

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