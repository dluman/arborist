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
  let list = await octokit.rest.teams.list({
    org
  });
  return await list;
};

const getTeam = async (owner, name) => {
  let team = octokit.rest.teams.getByName({
    owner,
    name
  });
  return await team;
};

const run = async () => {
  const repo = github.context.payload.repository.name;
  const owner = github.context.payload.repository.owner.login;
  const orgteams = teams(owner);
  console.log(orgteams)
  /*for(let team of orgteams) {
    console.log(team);
    console.log(getTeam(owner, teams));
  }*/
};

run();

