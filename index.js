const core = require('@actions/core');
const github = require('@actions/github');

const octokit = github.getOctokit(
  process.env.GITHUB_TOKEN
);

const contributors = async (owner, repo) => {
  let list = await octokit.rest.repos.listContributors({
    owner: owner,
    repo: repo
  });
  return await list;
};

const teams = async (org) => {
  let teams = await octokit.rest.teams.list({
    org
  });
  return await teams;
};

const getTeam = async (org, team) => {
  let team = octokit.rest.teams.getByName({
    owner,
    team
  });
  return await team;
};

const run = async () => {
  // Get project context
  const repo = github.context.payload.repository.name;
  const owner = github.context.payload.repository.owner.login;
  const teams = teams(owner);
  for(let team of teams) {
    console.log(team);
    console.log(getTeam(owner, teams));
  }
};

run();

