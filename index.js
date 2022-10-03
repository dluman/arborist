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
  return list;
};

const teamnames = async (owner, repo) => {
  let list = await octokit.rest.repos.listTeams({
    owner: owner,
    repo: repo
  });
  return list;
};

const run = async () => {
  const repo = github.context.payload.repository.name;
  const owner = github.context.payload.repository.owner.login;
  const teams = await teamnames(owner, repo);
  console.log(teams);
};

run();

