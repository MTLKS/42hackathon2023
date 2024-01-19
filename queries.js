db = connect('mongodb://localhost:27017/nest')

/* This script is meant to be loaded in mongosh ( load("queries.js") ), providing the function to aggregate data */

// show the teams sizes
function countTeamSizes() {
  const teams = db.teams.aggregate([
    { $project: { _id: 0, name: 1, teamLeader: 1, teamMembers: 1 } },
  ]);
  const teamMembers = teams.map(team => ({ name: team.name, len: team.teamMembers.length + 1 }));

  return teamMembers;
}

// group and show team by feedbacked and no feedback
function showFeedbackGroup() {
  const aggregation = (matchFeedback) => [
    { $match: { feedback: matchFeedback } },
    { $group: { _id: "$evaluator.intraName", teams: { $push: { name: "$name", timeslot: "$timeslot.timeslot", feedbackAt: "$feedbackAt" } } } },
    { $project: { evaluator: "$_id", teams: "$teams", _id: 0 } },
  ];
  const hasFeedback = db.teams.aggregate(aggregation({ $ne: undefined }));
  const noFeedback = db.teams.aggregate(aggregation(undefined));

  return { hasFeedback: hasFeedback.toArray(), noFeedback: noFeedback.toArray() };
}

// show teams that has a member to chose the timeslot instead of leader
function showNonLeaderTimeslot() {
  const feedback = db.teams.aggregate([
    { $match: { $expr: { $ne: ["$teamLeader", "$chosenTimeslotBy"] } } },
    { $project: { _id: 0, name: 1, evaluator: "$evaluator.intraName", timeslot: "$timeslot.timeslot", feedbackAt: 1, chosenTimeslotBy: "$chosenTimeslotBy.intraName" } },
  ]);

  return feedback;
}
