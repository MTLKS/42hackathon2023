import { Subcommand, Context, SlashCommandContext, StringSelectContext, SelectedStrings, StringSelect } from 'necord';
import { RushEvalCommandDecorator } from './rusheval.command';
import { StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { Injectable } from '@nestjs/common';

@RushEvalCommandDecorator()
export class RushEvalCadetCommand {
  @Subcommand({
    name: 'cadet',
    description: 'Get cadets to create timeslots',
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext) {
    const stringSelect = new StringSelectMenuBuilder()
      .setCustomId('cadet')
      .setPlaceholder('Select your timeslot')
      .setMinValues(1)
      .setMaxValues(6)
      .setOptions([
        { label: '10:00AM', value: '10:00AM' },
        { label: '11:00AM', value: '11:00AM' },
        { label: '2:00PM', value: '2:00PM' },
        { label: '3:00PM', value: '3:00PM' },
        { label: '4:00PM', value: '4:00PM' },
        { label: '5:00PM', value: '5:00PM' },
      ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(stringSelect);

    return interaction.reply(
      {
        content: 'Pong!',
        ephemeral: true,
        components: [row],
      }
    );
  }
}

@Injectable()
export class RushEvalCadetStringSelectComponent {
  @StringSelect('cadet')
  public onStringSelect(@Context() [interaction]: StringSelectContext, @SelectedStrings() selected: string[]) {
    return interaction.reply({ content: `Selected ${selected}`, ephemeral: true });
  }
}