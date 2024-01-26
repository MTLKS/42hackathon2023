import { Injectable } from '@nestjs/common';
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AutocompleteInteraction } from 'discord.js';
import { HydratedDocument, Model } from 'mongoose';
import { AutocompleteInterceptor, StringOption } from 'necord';

export type TimeslotDocument = HydratedDocument<Timeslot>;

@Schema()
export class Timeslot {
  @Prop()
  timeslot: string;

}

@Injectable()
export class TimeslotAutoCompleteInterceptor extends AutocompleteInterceptor {
  constructor(
    @InjectModel(Timeslot.name) private readonly timeslotModel: Model<Timeslot>,
  ) {
    super();
  }

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    const choices = (await this.timeslotModel.find().exec()).map(({timeslot}) => timeslot);

    return interaction.respond(choices
      .filter(choice => choice.startsWith(focused.value.toString()))
      .map(choice => ({ name: choice, value: choice }))
    );
  }
}

export class TimeslotDto {
  @StringOption({
    name: 'timeslot',
    description: 'Query for a specific timeslot evaluators and teams',
    autocomplete: true,
    required: false
  })
  timeslot: string;
}

export const TimeslotSchema = SchemaFactory.createForClass(Timeslot);