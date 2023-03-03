async function action() {
    const { stripIndent } = require('common-tags');
    const core = require('@actions/core');
    const github = require('@actions/github');

    console.log(process);
    const event = process.env.GITHUB_EVENT_NAME;
    const payload = require(process.env.GITHUB_EVENT_PATH);

    if (event !== "pull_request" || payload.action !== "closed") {
        core.setFailed(
            stripIndent`This action only runs on pull_request.closed events
            Found: ${event}.${payload.action}`
        );
        return; // finish writing everything before exiting gracefully
    }

    if (!payload.pull_request.merged) {
        core.warning("Pull request was closed without merging");
        return;
    }
}

// This code checks whether the current module is the same object
// as the main module and calling the action function if it is.
// This is a common pattern in Node.js modules to allow the module
// to be used either as a standalone program or as a library
// that can be imported into other programs.
// By using the require.main property, the module can detect
// whether it is being run as the main program
// and take appropriate actions based on that.
if (require.main === module) {
    action();
}

module.exports = action;
