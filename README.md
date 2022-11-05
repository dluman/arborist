# The Arborist

![Arborist logo](https://raw.githubusercontent.com/term-world/arborist/media/media/CMPSC%20-%20arborist.png)

The automated GitHub branch protector!

## Description

A tool incorporating:

* automatic branch protection on `main`
* required reviewer count
* disallowal of review process bypass
* ... and eventually more!

The Arborist is intended for the classroom, but is available for anyone who wants automated branch protection for GitHub repositories.
Given that this tool is in early-phase testing, options aren't so configurable. But, they _will be_ once we assess its value as an 
automated tool.

Like many other tools with humble beginnings, it's somewhat purpose-specific. However, with more open configuration, we aspire to make
it useful for all educators who want to use branch protection automatically _and_, potentially, industry folks who find it convenient.

## Setup

The Arborist requires a [GitHub Personal Access Token (PAT)](https://github.com/settings/tokens) set as an organization-level secret. 
This token must have the following permissions:

* `admin:org`
* `repo`
* `workflow`

Currently, this is a hard-coded secret created with the name `arborist`. Future releases will allow for configuration.
