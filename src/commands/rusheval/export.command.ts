import { Context, Options, SlashCommandContext, Subcommand, BooleanOption } from "necord";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { RushEvalCommandDecorator } from "./rusheval.command";
import { Team } from "src/schema/team.schema";
import puppeteer from "puppeteer";
import { EmbedBuilder } from "discord.js";
import { unlink, writeFile } from "fs";
import { ConsoleLogger } from "@nestjs/common";
import { RushEval, getRushName } from "src/schema/rusheval.schema";
import { ForceDto, monthNameToNumber } from "src/utils";

interface EvaluatorTeamsAggregation {
  evaluator: string,
  teams: {
    name: string,
    timeslot: string,
    feedbackAt: Date,
  }[]
}

function createTeamNoFeedbackEmbed(teamNoFeedback: EvaluatorTeamsAggregation[]) {
  const embed = new EmbedBuilder()
    .setTitle("Teams without feedback")
    .setFields(teamNoFeedback.map(t => ({
      name: t.evaluator ?? "Unknown",
      value: t.teams.map(t => `${t.name} (${t.timeslot})`).join("\n"),
    })))
    .setColor("#00FFFF")
    ;

  return embed;
}

@RushEvalCommandDecorator()
export class RushEvalExportFeedbackCommand {
  private readonly logger = new ConsoleLogger("RushEvalExportFeedbackCommand", {timestamp: true});
  constructor(
    @InjectModel(RushEval.name) private readonly rushEvalModel: Model<RushEval>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @Subcommand({
    name: "export",
    description: "Export feedbacks",
  })
  public async onCommandCall(@Context() [interaction]: SlashCommandContext, @Options() { force }: ForceDto) {
    await interaction.deferReply({ephemeral: true});
    this.logger.log(`Export command called by ${interaction.user.username}${force ? " with force" : ""}`);
    const rushEval = await this.rushEvalModel.findOne().exec();

    if (rushEval === null) {
      return interaction.editReply("No ongoing rush evaluation");
    }
    if (force !== true) {
      const teamNoFeedback: EvaluatorTeamsAggregation[] = await this.teamModel.aggregate([
        { $match: { feedback: undefined } },
        { $group: { _id: "$evaluator.intraName", teams: { $push: { name: "$name", timeslot: "$timeslot.timeslot", feedbackAt: "$feedbackAt" } } } },
        { $project: { evaluator: "$_id", teams: "$teams", _id: 0 } },
      ]);

      if (teamNoFeedback.length !== 0) {
        this.logger.log(`Teams without feedback: ${teamNoFeedback.map(t => t.evaluator).join(", ")}`);
        return interaction.editReply({
          content: `Below teams don't have feedbacks:`,
          embeds: [createTeamNoFeedbackEmbed(teamNoFeedback)]
        });
      }
    }
    const teams = await this.teamModel.find().exec();
    const month = monthNameToNumber(rushEval.poolMonth).toString().padStart(2, "0");
    const outfile = `${rushEval.poolYear}-${month} ${getRushName(rushEval.project)}.pdf`;
    
    const reply = (force !== true)
      ? `Exported ${teams.length} teams`
      : `Exported ${teams.filter(t => t.feedback).length}/${teams.length} teams with feedbacks`;

    return this.exportFeedbacks(outfile, rushEval, teams).then(() => {
      this.logger.log(reply);
      return interaction.editReply({content: reply, files: [outfile]});
    }).catch((err) => {
      this.logger.error(err);
      console.error(err);
      return interaction.editReply({content: "Failed to export feedbacks"});
    }).finally(() => unlink(outfile, () => {}));
  }

  private async createNavHTML() {
    const navTeams = await this.teamModel.aggregate([
      {$group: {_id: "$timeslot.timeslot", teams: {$push: {name: "$name", evaluator: "$evaluator.intraName"} }}},
      {$project: {time: "$_id", teams: "$teams", _id: 0}},
      {$sort: {time: 1}}, // bug prone, sorted lexicographically
    ]).exec();

    return navTeams.map(({time, teams}) => `
    <h4>${time}</h4>
${teams.map(team => `    <a class="nav" href="#${team.name}">${team.name}: <small>${team.evaluator}</small></a>`).join("<br>\n")}
`).join("\n<br>\n<br>\n");
  }

  private async exportFeedbacks(filename: string, rushEval: RushEval, teams: Team[]) {
    const timeout = 3 * 60_000;

    this.logger.log(`Lauching headless browser`);
    const browser = await puppeteer.launch({headless: "new", timeout: timeout});

    this.logger.log(`Opening new page`);
    const page = await browser.newPage();

    this.logger.log(`Setting content`);
    teams.sort((a, b) => a.timeslot?.timeslot.localeCompare(b.timeslot?.timeslot));
    const title = `Rush${rushEval.project.substr(-2)} Evaluations - ${rushEval.poolMonth} Piscine ${rushEval.poolYear}`;

    await page.setContent(`
<!DOCTYPE html>
<html lang="en">
<head>
  <title>${title}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background-color: #222222;
      color: #FFFFFF;
      text-align: center;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 2.2vw;
      margin: 2vw;
    }

    .nav {
      text-decoration: none;
      color: #AAFFFF;
      display: inline-block;
      margin: .5vw;
    }

    h3, h4 {
      margin-bottom: 0;
      margin-top: .5vw;
    }

    hr {
      border: 1px solid;
      border-radius: 4px;
    }

    .essay {
      font-size: 2vw;
      text-align: left;
      font-family: Calibri;
    }

    .page-break {
      page-break-after: always;
    }

    .hr-team {
      border: 2px solid;
    }

    .evaluator {
      margin: 2vw;
    }

  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>This document is generated by THILA Bot at ${new Date().toLocaleString()}</p>
  <nav>
${await this.createNavHTML()}
  </nav>
${teams.map(team => `
  <div class="page-break"></div>
  <h2 id="${team.name}">${team.name}</h2>
  <hr class="hr-team">
  <h3 class="evaluator">${team.evaluator?.intraName ?? ''}: ${team.timeslot?.timeslot ?? ''}</h3>
  <h3>Members Overview</h3>
  <hr>
  <p class="essay">${team.feedback?.get(team.name).replaceAll("\n", "<br>\n") ?? ''}</p>
  <h3>Notes</h3>
  <hr>
  <p class="essay">${team.feedback?.get("notes").replaceAll("\n", "<br>\n") ?? ''}</p>
`).join("")}
</body>
</html>
`);
    // writeFile("debug.html", await page.content(), () => {});
    this.logger.log(`Exporting to ${filename}`);
    await page.pdf({path: filename, printBackground: true, format: "A4", timeout: timeout});
    browser.close().catch((err) => {this.logger.error(err, "Close Browser");});
  }
}
