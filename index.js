const core = require('@actions/core');
const github = require('@actions/github');

const octokit = github.getOctokit(
  process.env.GITHUB_TOKEN
);

const collaborators = async (owner, repo) => {
  let list = await octokit.rest.repos.listCollaborators({
    owner: owner,
    repo: repo
  });
  return list;
}

const run = async () => {
  // Get project context
  const repo = github.context.payload.repository.name;
  const owner = github.context.payload.repository.owner.login;
  console.log(await collaborators(owner, repo));
};

run();

