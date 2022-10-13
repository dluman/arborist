const core = require('@actions/core');
const github = require('@actions/github');

const octokit = github.getOctokit(
  process.env.GITHUB_TOKEN
);

// Get

const getContributors = async (owner, repo) => {
  let list = await octokit.rest.repos.listContributors({
    owner: owner,
    repo: repo
  });
  return list;
};

const getTeamNames = async (owner, repo) => {
  let list = await octokit.rest.repos.listTeams({
    owner: owner,
    repo: repo
  });
  let teams = Object
    .keys(list)
    .filter(team, idx, self) => {
      return team.parent == "students";
    });
  return list;
};

const getRepoInfo = async (owner, repo) => {
  let info = octokit.rest.repos.get({
    owner: owner,
    repo: repo
  });
  return info;
};

const getRepoTemplate = async (info) => {
  return info.template_repository.clone_url;
};

// Set

const setBranchProtection = async (owner, repo) => {

}

const run = async () => {
  // Constants
  const repo = github.context.payload.repository.name;
  const owner = github.context.payload.repository.owner.login;
  // Properties
  const info = await getRepoInfo(owner, repo);
  const teams = await getTeamNames(owner, repo);
  // Facts
  const template = getRepoTemplate(info);
};

run();
