const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
  const token = core.getInput('GITHUB_TOKEN');
  const octokit = github.getOctokit(token);
  const repo = core.getInput('GITHUB_REPOSITORY');
  console.log(repo);
};

run();

