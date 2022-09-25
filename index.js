const core = require('@actions/core');
const github = require('@actions/github');

const repoName = (repo) => {
  data = repo.split("/");
  return data.at(-1);
}

const run = async () => {
  // Establish constants
  const repo = repoName(process.env.GITHUB_REPOSITORY);
  const owner = process.env.GITHUB_REPOSITORY_OWNER
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  // Get list of collaborators/teams on repository
  const collabs = octokit.rest.repos.listCollaborators({
    owner,
    repo
  });
  console.log(collabs);
  // Update branch protection
};

run();

