const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const repo = core.getInput('GITHUB_REPOSITORY');
  console.log(repo);
};

run();

