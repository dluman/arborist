/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 321:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 887:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 81:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 17:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const path = __nccwpck_require__(17);
const util = __nccwpck_require__(837);
//const async = require('async');

const github = __nccwpck_require__(887);
const core = __nccwpck_require__(321);

const exec = util.promisify((__nccwpck_require__(81).exec));

const octokit = github.getOctokit(
  process.env.GITHUB_TOKEN
);

// Gets

const getContributors = async (owner, repo) => {
  let list = await octokit.rest.repos.listContributors({
    owner: owner,
    repo: repo
  });
  return list;
};


const getRepositoryTeams = async (owner, repo) => {
  let list = await octokit.rest.repos.listTeams({
    owner: owner,
    repo: repo
  });
  console.log(list);
  return list;
};

const getTeamNames = async (owner, repo) => {
  let slugs = [];
  let list = await octokit.rest.repos.listTeams({
    owner: owner,
    repo: repo
  });
  let teams = list.data;
  async.map(teams, (value, fn) => {
    fn(null, value.slug);
  }, (err, res) => {
    for(let item in res){
      slugs.push(res[item]);
    }
  });
  return slugs;
};

const getRepoInfo = async (owner, repo) => {
  let info = octokit.rest.repos.get({
    owner: owner,
    repo: repo
  });
  return info;
};

const getRepoTemplate = async (info) => {
  let templateInfo;
  if (info.template_repository) {
    let template = info.template_repository;
    templateInfo = {
      owner: template.owner.login,
      repo: template.name,
      clone: template.clone_url
    }
  }
  return templateInfo;
};

const getBranches = async(owner, repo) => {
  let info = await octokit.rest.repos.listBranches({
    owner,
    repo,
    protected: false
  });
  return info;
};

const getCommits = async(owner, repo) => {
  let info = await octokit.rest.repos.listCommits({
    owner: owner,
    repo: repo
  });
  return info;
};

// Set

const setBranchProtection = async (owner, repo, teams) => {
  let branches = JSON.parse(core.getInput('branches'));
  let override = core.getInput('enforce-admins');
  let approvals = parseInt(core.getInput('min-approvals'));
  branches = branches.map((branch) => {
    return {
      name: branch,
      restrictions: null,
      approvals: approvals
    }
  });
  for (let branch of branches) {
    try {
        octokit.rest.repos.updateBranchProtection({
          owner: owner,
          repo: repo,
          branch: branch.name,
          required_status_checks: null,
          enforce_admins: override == 'true' ? true : null,
          restrictions: branch.restrictions,
          required_pull_request_reviews: {
            required_approving_review_count: branch.approvals,
            dismiss_stale_reviews: true,
          }
        });
    } catch(err) {
        console.log(`ERROR PROTECTING ${branch}...`);
    }
  }
}

const setTeamRepoPermissions = async (owner, repo, teams) => {
  for(let team in teams){
    octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
      org: owner,
      team_slug: teams[team],
      owner: owner,
      repo: repo,
      permission: 'push'
    });
  }
}

const setGit = async() => {
  await execRun(`git config --global user.name "github-classroom[bot]"`);
  await execRun(`git config --global user.email "github-classroom[bot]@users.noreply.github.com"`);
}

const setRemote = async(template) => {
  let info = await getBranches(template.owner, template.repo);
  let branches = info.data;
  info = await setGit();
  let response = await execRun(`git remote add template ${template.clone}`);
  response = await(execRun(`git fetch template`));
  for (let branch of branches) {
    try {
        response = await execRun(`git checkout -b ${branch.name} template/${branch.name}`)
        response = await execRun(`git push origin ${branch.name}`);
        response = await execRun(`git checkout main`);
    } catch (err)  {
        console.log(`ERROR SETTING REMOTE FOR ${branch}...`);
    }
  }
  response = await execRun(`git branch`);
}

// Runner

const execRun = async(cmd) => {
  let { stdout, stderr } = await exec(`${cmd}`);
  return {
    stdout: stdout,
    strerr: stderr
  }
}

const run = async () => {

  // Constants
  const repo = github.context.payload.repository.name;
  const owner = github.context.payload.repository.owner.login;

  // Properties
  const info = await getRepoInfo(owner, repo);
  const teams = await getTeamNames(owner, repo);

  // Facts
  const template = await getRepoTemplate(info.data);
  const commits = await getCommits(owner, repo);
  const lastAuthor = commits.data[0].author;

  // Check for forced branch protection
  let force = (core.getInput('force-protect') === 'true');

  // Set protections
  if (template || force) setBranchProtection(owner, repo, teams);
  if (template) setTeamRepoPermissions(owner, repo, teams);

  // If repo has a template and this is the last bot commit
  if (template && lastAuthor == 'github-classroom[bot]') setRemote(template);

  // If repo is not a template and not an assignment
  if (!template && lastAuthor != 'github-classroom[bot]' && !force) console.log("MAIN TEMPLATE: No action taken.");

};

run();

})();

module.exports = __webpack_exports__;
/******/ })()
;