const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
  // Auth
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  // Get project context
  const repo = github.context.payload.repository.name;
  const owner = github.context.payload.repository.owner.login;
  // Get list of collaborators/teams on repository
  const collabs = await octokit.rest.repos.listCollaborators({
    owner,
    repo
  });
  console.log(collabs);
  // Update branch protection
};

run();

