const axios = require('axios');
const { DateTime } = require('luxon');

const CAMPUS_ID = 34;
const DOMAIN = 'https://api.intra.42.fr';

let ACCESS_TOKEN;

function request(uri, ...args) {
  return axios.get(`${DOMAIN}${uri}?access_token=${ACCESS_TOKEN}&${args.join('&')}`)
    .then(response => {
      return response.data;
    })
    .catch(error => {
      throw error;
    });
}

function initAccessToken() {
  const UID = process.env.APP_UID;
  const SECRET = process.env.APP_SECRET;

  if (!UID) {
    throw new Error('APP_UID environment variable not set');
  }
  if (!SECRET) {
    throw new Error('APP_SECRET environment variable not set');
  }

  const headers = { 'Content-type': 'application/json' };
  return axios.post(`${DOMAIN}/oauth/token?grant_type=client_credentials&client_id=${UID}&client_secret=${SECRET}`, {}, { headers })
    .then(response => {
      ACCESS_TOKEN = response.data.access_token;
    })
    .catch(error => {
      throw error;
    });
}

async function getTeams(projectId) {
  const now = DateTime.now().toFormat('yyyy-MM-dd');
  const start = DateTime.now().minus({ weeks: 4 }).toFormat('yyyy-MM-dd');
  const users = await request(`/v2/projects/${projectId}/projects_users`,
    `filter[campus]=${CAMPUS_ID}`,
    //  `filter[status]=waiting_for_correction,in_progress`, // data unavailable at the moment
    `range[created_at]=${start},${now}`
  );

  const teams = {};
  users.forEach(user => {
    if (user.teams.length > 0) {
      teams[user.teams[0].name] = user.teams[0];
    }
  });
  return teams;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(`Usage: node ${process.argv[1]} <project_id>`);
    process.exit(1);
  } else if (args.length !== 1) {
    console.error('Too many arguments');
    process.exit(1);
  } else {
    try {
      initAccessToken()
        .then(() => {
          const projectId = args[0];
          console.error(`Getting teams for project ${projectId}`);
          getTeams(projectId)
            .then(teams => {
              console.log(JSON.stringify(teams, null, '\t'));
              process.exit(0);
            })
            .catch(error => {
              console.error(error);
              process.exit(1);
            });
        })
        .catch(error => {
          console.error(error);
          process.exit(1);
        });
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}
