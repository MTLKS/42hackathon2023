import { Context, Options, SlashCommandContext, Subcommand, BooleanOption } from "necord";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { RushEvalCommandDecorator } from "./rusheval.command";
import { Team } from "src/schema/team.schema";
import puppeteer from "puppeteer";
import { EmbedBuilder } from "discord.js";
import { unlink } from "fs";
import { ConsoleLogger } from "@nestjs/common";

class ForceDto {
  @BooleanOption({
    name: 'force',
    description: "Export feedback regardless there's teams without feedbacks",
    required: false
  })
  force: boolean;
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
  private readonly logger = new ConsoleLogger("RushEvalExportFeedbackCommand", {timestamp: true});
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) { }

  @Subcommand({
    name: "export",
    description: "Export feedbacks",
  })
  public async onExecute(@Context() [interaction]: SlashCommandContext, @Options() { force }: ForceDto) {
    this.logger.log(`Export command called by ${interaction.user.username}${force ? " with force" : ""}`);
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
        this.logger.log(`Teams without feedback: ${teamNoFeedback.map(t => t.evaluator).join(", ")}`);
        return interaction.reply({content: `Below teams don't have feedbacks:`, embeds: [embed], ephemeral: true});
      }
    }
    interaction.deferReply({ephemeral: true});
    const teams = await this.teamModel.find().exec();
    const outfile = "feedbacks.pdf";
    try {
      await this.exportFeedbacks(outfile, teams);
    } catch (error) {
      this.logger.error(error);
      console.error(error);
      return interaction.editReply({content: "Failed to export feedbacks"});
    }
    const getReplyContent = () => {
      if (force !== true) {
        return `Exported ${teams.length} teams with feedbacks`;
      } else {
        const teamWithFeedbackCount = teams.reduce((acc, e) => acc + Number(e.feedbackAt !== undefined), 0);
        return `Exported ${teamWithFeedbackCount}/${teams.length} teams with feedbacks`;
      }
    }
    return interaction.editReply({
      content: getReplyContent(),
      files: [outfile]
    }).finally(() => unlink(outfile, () => {}));
  }

  private async exportFeedbacks(filename: string, teams: Team[]) {
    this.logger.log(`Lauching headless browser`);
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--autoplay-policy=user-gesture-required',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-dev-shm-usage',
        '--disable-domain-reliability',
        '--disable-extensions',
        '--disable-features=AudioServiceOutOfProcess',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-notifications',
        '--disable-offer-store-unmasked-wallet-cards',
        '--disable-popup-blocking',
        '--disable-print-preview',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-setuid-sandbox',
        '--disable-speech-api',
        '--disable-sync',
        '--hide-scrollbars',
        '--ignore-gpu-blacklist',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-first-run',
        '--no-pings',
        '--no-sandbox',
        '--no-zygote',
        '--password-store=basic',
        '--use-gl=swiftshader',
        '--use-mock-keychain',
      ]
    });
    this.logger.log(`Opening new page`);
    const page = await browser.newPage();
    const content = `
  <html>
  <head>
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
      background-color: #AAAAAAA;
    }

    h3 {
      margin-bottom: 0;
    }

    .essay {
      font-size: 2vw;
      text-align: left;
      font-family: Calibri;
    }

  </style>
  </head>
  <body>
    <h1>2024 Jan rush00 Internal Feedbacks</h1>
    <p>This document is generated by THILA Bot at ${new Date().toLocaleString()}</p>
    ${teams.map(team => `<a class="nav" href="#${team.name}">${team.name}</a>`).join("\n<br>\n<br>\n")}
  ${teams.map(team => `
    <div style="page-break-after:always;"></div>
    <h2 id="${team.name}">${team.name}</h2>
    <hr style="border: 2px solid; border-radius: 4px;">
    <h3>${team.evaluator?.intraName ?? ''}: ${team.timeslot?.timeslot ?? ''}</h3>
    <h3>Members Overview</h3>
    <hr>
    <p class="essay">${team.feedback?.get(team.name).replaceAll("\n", "<br>\n") ?? ''}</p>
    <h3>Notes</h3>
    <hr>
    <p class="essay">${team.feedback?.get("notes").replaceAll("\n", "<br>\n") ?? ''}</p>
  `).join("")}
  </body>
  </html>
  `
    this.logger.log(`Setting content`);
    await page.setContent(content);
    this.logger.log(`Exporting to ${filename}`)
    await page.pdf({path: filename, printBackground: true, format: "A4"});
    this.logger.log(`Closing browser`);
    await browser.close();
  }
}
