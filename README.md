<style>
  * {
    font-size: 1.5vw;
  }
  img {
    height: 50%;
    width: 50%;
  }
</style>

# THILA Bot

**THILA Bot** - __Task Helper Intra Linked Automater__, named after out beloved bocal Thila, is a discord bot designed to automate the rush evaluation process.

Before the introduction of **THILA Bot**, the bocal has always been the one manually managing the rush evaluation,
like creating google docs and form for matching the pisciner and cadet, and collecting the internal feedback afterward.

With **THILA Bot**, most of it's tedious works are automated.

Now, instead of creating google docs and form for matching the pisciner and cadet, they could now just run a few **commands** to get the job done.


## Setup
For more info about bot creation, please refer to [Bot Creation](BotCreation.md). (WIP)

For more info about intra application creation, please refer to [Intra Application Creation](IntraApplicationCreation.md). (WIP)


## Prerequisites
The application uses npm and python3, along with mongodb as it's database.
These are the version info.

npm: 10.2.0
python3: 3.10.13
mongod: 7.0.2


## Installation
To install the project dependencies, simply run ``./scripts/setup``.


## Environmental Variable
These environmental variables are required for the bot.

- THILA_BOT_DISCORD_TOKEN
	The discord bot's token.
	<!-- Discord bot token image with pointer -->

- THILA_BOT_API_UID
	The intra application uid.
	<!-- Intra application page with pointer -->

- THILA_BOT_API_SECRET
	The intra application secret.
	<!-- Intra application page with pointer -->

- THILA_BOT_URL
	The url which the bot will receive the login request.
	This url **NEEDS** to be the **SAME** as the **Redirect URI** filled in the intra application.
	<!-- Intra application setting page with pointer -->
	Ex: ``http://localhost:8080``

- THILA_BOT_DATABASE_URL
	The url to the database.
	Ex: ``mongodb://localhost:27017/nest``


## Deploy
To deploy the bot, simply run ``./scripts/deploy``.
The script includes the utility of setting up the environment, and piping the program output to a log file.


## Slash Commands
They are how you as a bocal, interact with the bot.

To invoke any of them, begin your message with ``/``.
![Command Overview](<doc-assets/command-overview.png>)

There are two types of command, they are **ANNOUNCE** and **EPHEMERAL**.

**ANNOUNCE** command are designed in a way that, when the command is invoked, it will announce it's arrival (ping related role) in expectation of gathering students attention to participate in the rush evaluation.
During the duration of command execution, they will likely also include an ephemeral message to update you their status.

**EPHEMERAL** command on the other hand, is a command designed only for administrator. They serves purposes like exporting the result of rush evaluations and confirming the details during rush evaluation.
Their response is temporary, only last for the current session (cleared on application closed/webpage reload), and private to the person invoked the command.


After the invocation of any command, a response is expected from the bot.
The time it takes for the command to finish it's task could vary, therefore they are specified individually under their own section.

If the bot did not respond anywhere near in the expected response time, the bot may very likely has crashed.
Following that will be troubleshooting and rebooting. [Administration](#administration)

[rusheval cadet](#rusheval-cadet)
[rusheval pisciner](#rusheval-pisciner)
[rusheval info](#rusheval-info)
[rusheval match](#rusheval-match)
[rusheval feedback](#rusheval-feedback)
[rusheval export](#rusheval-export)
[clean](#clean)


### rusheval cadet
**``ANNOUNCE``** ``< 1s``

Generate a button for cadet to create session.
![Cadet Button](<doc-assets/cadet-button.png>)

The session cadet is allowed to create is based on the **timeslots collection** in the database.
More details will be covered in [Administration](#administration)

Each cadet can open maximum 2 sessions.
![Cadet Select Two Session](<doc-assets/cadet-select-two-sessions.png>)

On successful registration, the bot will response with the created sessions.
![Cadet Create Session](<doc-assets/cadet-create-session.png>)


### rusheval pisciner
**Parameter: [project]**
**``ANNOUNCE``** ``< 2s``

Generate a button for pisciner to register an available session.
![Pisciner Button](<doc-assets/pisciner-button.png>)

After the command has been invoked with given project as argument, the bot will fetch for **ongoing** project, and add the teams into the database.
![Pisciner Found](<doc-assets/pisciner-found.png>)
If the bot does not found any **ongoing** teams from the given project, it will secretly report to you that this attempt will be assumed as testing, the bot will not behaves differently in any way however.
![Pisciner Test](<doc-assets/pisciner-test.png>)
This command should be invoked when the rush is **ongoing**, failure to do so will result in the bot not able to notify any teams that did not choose a session during matching.

The options pisciner received is based on the sessions cadets created, excluding what other teams has taken.
In the event where a team member is fetching for available session, instead of their leader, a **bolded** warning message will be included.
![Pisciner Fetch Session](<doc-assets/pisciner-fetch-session.png>)

On successful registration, the bot will response with the selected sessions.
![Pisciner Select Session](<doc-assets/pisciner-select-session.png>)


### rusheval info
**Parameter: [timeslot?]**
**``EPHEMERAL``** ``< 2s``

Report the overview of sessions info.
![Rush Info Overview](<doc-assets/info-overview.png>)

With timeslot parameter specified, it will respond with the evaluators and teams who signed up for that specific timeslot.
![Rush Info Details](<doc-assets/info-details.png>)


### rusheval match
**Parameter: [force?]**
**``ANNOUNCE``** ``< 5s``

This command will match the teams with evaluators in their corresponding chosen sessions.

In the event where there's rush team with missing evaluator, the bot will abort the matching and report the teams with missing evaluator.
![Match Failed](<doc-assets/match-failed.png>)
This feature can be disabled by invoking the command with ``force: True``, in which it will pretend like nothing is wrong with it.

This command could be reinvoked as many time in a **private** channel prior announcing it in a public channel, to confirm that the algorithm is working as intended.
Once a result is announced, it is still strongly advised against rematch, as it could break promises and screw with people planned schedules.

The bot will always follow the latest generated result.
Here's a successful example for 2024 January rush-00.
![Match Result](<doc-assets/match-result.png>)

The order of which cadet will be prioritize during matching depends on the rush project that was given in pisciner command.
- If the project is ``c-piscine-rush-00``, junior cadet will be prioritized.
- If the project is ``c-piscine-rush-01`` or ``c-piscine-rush-02``, senior cadet will be prioritized.


### rusheval feedback
**``ANNOUNCE``** ``< 1s``

Generate a button for cadet who signed up for rush evaluation to submit their internal feedback.
![Feedback Button](<doc-assets/feedback-button.png>)


### rusheval export
**Parameter: [force?]**
**``EPHEMERAL``** ``< ?s``

Export the result of rush evaluation and respond with a pdf attachment.
![Export Command](<doc-assets/export-command.png>)

This command response time could vary based on the server's performance, worst it could get up to 5m, but should be less than 10s on average device.

It will abort the export if there's any team still missing feedback, this feature can be disabled by invoking the command with ``force: True``.
![Export Failed](<doc-assets/export-failed.png>)


### clean
**``EPHEMERAL``** ``< 1s``

On the command invocation, the bot will respond asking for confirmation.
![Clean Command](<doc-assets/clean-command.png>)

On action confirmation, clear the teams and **evaluators collections** in the database.
![Clean Confirmed](<doc-assets/clean-confirmed.png>)


## Administration
Uh oh, something unexpected happened and you're reading this section, I'm sorry for you.

When it comes to administration, it's pretty much all about navigating through the database and making changes.
For simple operation, **mongodb compass** simplifies the process of navigating and viewing the database, but **mongosh** is still needed for invoking script.


### Adding timeslot
Let's start with something simple.
In this case where cadets wanna participate in rush evaluation, but the existing timeslot does not meet their schedule, additional options of timeslot may be preferable.

To do this, we could insert a new document into the **timeslots collection**.

Since it's a simple operation, let's add ``9:00PM`` directly through mongosh:
```bash
mongosh
use nest
db.timeslots.insertOne({timeslot: "9:00PM"})
db.timeslots.find() # show the updated collection
```


### cadsubst (Cadet substitution)
In the event where an evaluator notified you that they could not attend their session, a substitution needs to be arranged.

The first step should be finding a candidate, starting with confirming it with those who did not get chosen in the match result, asking in rush eval discord channel, or anything you could think of.
(Once again, even if there's already suitable candidate in the database, it is strongly recommend against matching again.)

After the candidate has been decided, they first needs to be added in the database.
This can be done by simply letting them click on the cadet button and authorize their data if they haven't already.

Next, fetch for the candidate document in the **students collection**, and use the ``updateOne`` function to find and update the **teams collection**.

Here's a function in a script demonstrating the process.
```js
db = connect("mongodb://localhost:27017/nest");

function cadsubst(teamLeaderIntraName, evaluatorIntraName) {
    evaluator = db.students.findOne({intraName: evaluatorIntraName});
    if (evaluator === null) {
        console.log(`Error: ${evaluatorIntraName} not found`);
        return ;
    }
    stats = db.teams.updateOne(
        {'teamLeader.intraName': teamLeaderIntraName},
        {$set: {evaluator: evaluator}}
    );
    console.log(`Updated team ${teamLeaderIntraName} with evaluator: ${evaluator.intraName}`);
    console.log(stats);
}
```

With this, if you're in the mongosh, you could ``load("cadsubst.js")`` to load and call the function.
```
load("cadsubst.js")
cadsubst("teamLeaderIntraName", "evaluatorIntraName")

db.teams.find({"teamLeader.intraName": "teamLeaderIntraName"})
```

Alternatively, if you're actively making changes to the script, or preparing for a large changes, it may be more convenient to either inline the function call or create a new script, and invoke the script with ``mongosh scriptname.js``.

Here's an example of creating a new script.
```js
load(__dirname + "/cadsubst.js");

cadsubst(teamLeaderIntraName, evaluatorIntraName);
console.log(db.teams.findOne({"teamLeader.intraName": teamLeaderIntraName}));
```

For more info about mongodb:
- [official scripting documentation](https://www.mongodb.com/docs/mongodb-shell/write-scripts/)
- [official operator set documentation](https://www.mongodb.com/docs/manual/reference/operator/update/set/)

For more details on collections and document schema, you could view the schema source codes in ``src/schema/`` or the collections directly in database.


## Notes
The bot does not verify anyone's identity beyond just the data authorization.

If a command is intended for cadet is exposed to pisciner, the database may very likely be corrupted with pisciner "pretending" to be cadet, and vise versa.


## Bugs
Due to the initial tight time constraint and badly planned out workflow, this project has left out a lot of bugs.

The silver lining is that there shouldn't be much left when interacting through the bot in it's dedicated interface (discord).


### Timeslot Order
Currently, the order of timeslots are sorted based on the document order in database.

Let's say this is the order of the timeslot collection:
![Bad Timeslot Collection](<doc-assets/bad-timeslot-collection.png>)

This is how the match result will look like.
![Bad Timeslot Match](<doc-assets/bad-timeslot-match.png>)

This order also affects the order of the timeslots cadet fetched, pisciner received, info display, and the export link, assuming I didn't miss any.


### Match Algorithm
As of now, it's still missing the absolute prioritization for junior cadet.

Meaning that in the case where there's still junior cadet available for ``c-piscine-rush-00``, it should not take any chances to have a senior cadet taking that place instead regardless of the sample sizes and proportion.


## Contact
For any support, issue, and feedback, DM me [(Qixeo)](https://discord.com/users/387502639350284288) on discord.
