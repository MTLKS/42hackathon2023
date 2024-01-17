import { Context, Options, SlashCommandContext, Subcommand, BooleanOption } from "necord";
import { EmbedBuilder } from "discord.js";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { RushEvalCommandDecorator } from "./rusheval.command";
import { Team } from "src/schema/team.schema";
import { writeFile } from "fs";

class ForceDto {
  @BooleanOption({
    name: 'force',
    description: "Export feedback regardless there's teams without feedbacks",
    required: false
  })
  force: boolean;
}

function exportFeedbacks(filename: string, teams: Team[]) {
  const feedbackFormatter = (team: Team) => {
    return {
      members: team.feedback?.get(team.name) ?? null,
      notes: team.feedback?.get("notes") ?? null,
    }
  };

  const data = JSON.stringify(teams.map(t => ({
    name: t.name,
    time: t.timeslot.timeslot,
    evaluator: t.evaluator.intraName,
    feedback: feedbackFormatter(t),
  })), null, 2);
  writeFile(filename, data, (err) => {
    if (err) {
      console.log(err);
    }
  });
}

interface EvaluatorTeamsAggregation {
  evaluator: string,
  teams: {
    name: string,
    timeslot: string,
    feedbackAt: Date,
  }[]
}

@RushEvalCommandDecorator()
export class RushEvalExportFeedbackCommand {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @Subcommand({
    name: "export",
    description: "Export feedbacks",
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext, @Options() { force }: ForceDto) {
    if (force !== true) {
      const teamNoFeedback: EvaluatorTeamsAggregation[] = await this.teamModel.aggregate([
        { $match: { feedback: undefined } },
        { $group: { _id: "$evaluator.intraName", teams: { $push: { name: "$name", timeslot: "$timeslot.timeslot", feedbackAt: "$feedbackAt" } } } },
        { $project: { evaluator: "$_id", teams: "$teams", _id: 0 } },
      ]);

      if (teamNoFeedback.length !== 0) {
        const embed = new EmbedBuilder()
          .setTitle("Teams without feedback")
          .setFields(teamNoFeedback.map(t => ({
            name: t.evaluator,
            value: t.teams.map(t => `${t.name} (${t.timeslot})`).join("\n"),
          })))
          .setColor("#00FFFF")
          ;

        return interaction.reply({content: `Below teams don't have feedbacks:`, embeds: [embed], ephemeral: true});
      }
    }
    const teams = await this.teamModel.find().exec();
    exportFeedbacks("feedbacks.json", teams);

    if (force === true) {
      const teamWithFeedbackCount = teams.reduce((acc, e) => acc + Number(e.feedbackAt !== undefined), 0);

      return interaction.reply({content: `Exported ${teamWithFeedbackCount}/${teams.length} teams with feedbacks`, ephemeral: true});
    } else {
      return interaction.reply({content: `Exported ${teams.length} teams with feedbacks`, ephemeral: true});
    }
  }
}