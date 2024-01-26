import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { APIApplicationCommandOptionChoice, AutocompleteInteraction, CacheType } from 'discord.js';
import { HydratedDocument } from 'mongoose';
import { AutocompleteInterceptor, StringOption } from 'necord';

export type RushEvalDocument = HydratedDocument<RushEval>;

export const rushProjectSlugs = ["c-piscine-rush-00", "c-piscine-rush-01", "c-piscine-rush-02"];
export type RushProjectSlug = typeof rushProjectSlugs[number];

export class RushProjectSlugDto {
  @StringOption({
    name: 'project',
    description: 'The rush project to evaluate',
    required: true,
    autocomplete: true,
    // choices: rushProjectSlugs.map((slug): APIApplicationCommandOptionChoice => ({ name: slug, value: slug })) as []
  })
  project: RushProjectSlug;
}

export class RushProjectSlugAutocompleteInterceptor extends AutocompleteInterceptor {
  constructor() {
    super();
  }

  public transformOptions(interaction: AutocompleteInteraction<CacheType>) {
    const focused = interaction.options.getFocused(true);

    return interaction.respond(rushProjectSlugs
      .filter(slug => slug.startsWith(focused.value.toString()))
      .map(slug => ({ name: slug, value: slug }))
    );
  }
}

export function getRushName(project: RushProjectSlug) {
  switch (project) {
    case "c-piscine-rush-00": return "Rush 00";
    case "c-piscine-rush-01": return "Rush 01";
    case "c-piscine-rush-02": return "Rush 02";
    default: return project;
  }
}

@Schema()
export class RushEval {
  @Prop()
  poolYear: string;

  @Prop()
  poolMonth: string;

  @Prop()
  project: RushProjectSlug;
}

export const RushEvalSchema = SchemaFactory.createForClass(RushEval);
