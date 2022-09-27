const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
  // Establish constants
  const repo = github.context.payload.repository.owner.login
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  // Get list of collaborators/teams on repository
  const collab = await octokit.rest.repos.listCollaborators({
    owner,
    repo
  });
  console.log(collabs);
  // Update branch protection
};

run();

