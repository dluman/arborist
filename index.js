const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
  // Auth
  const token = core.getInput('GITHUB_TOKEN');
  const octokit = github.getOctokit(token);
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

