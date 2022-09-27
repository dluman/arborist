const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
  // Establish constants
  const repo = github.context.payload.repository.name;
  const owner = github.context.payload.repository.owner.login;
  const octokit = github.getOctokit(GITHUB_TOKEN);
  // Get list of collaborators/teams on repository
  const collabs = await octokit.rest.repos.listCollaborators({
    owner,
    repo
  });
  console.log(collabs);
  // Update branch protection
};

run();

