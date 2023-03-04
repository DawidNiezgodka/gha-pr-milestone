async function action() {
    const { stripIndent } = require('common-tags');
    const core = require('@actions/core');
    const github = require('@actions/github');

    const event = process.env.GITHUB_EVENT_NAME;
    // process.env.GITHUB_EVENT_PATH is an environment variable
    // that contains the path to the file
    // that contains information about the event that triggered the workflow.
    // The GITHUB_EVENT_PATH environment variable is set by GitHub Actions and points to a file
    // that contains a JSON payload with information about the event.
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

    // Creates an authenticated client object that can be used to perform various actions
    // on behalf of the GitHub account that owns the PAT,
    // such as creating issues, commenting on pull requests, etc.
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
    // const {data: pulls} uses object destructuring to extract the data property\
    // from the response object returned by the octokit.pulls.list() method
    // and assign it to the pulls variable.
    // The data property contains an array of pull requests returned by the API.
    let {data: pulls} = await octokit.rest.pulls.list({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        state: "closed"
    });

    const expectedAuthor = payload.pull_request.user.login;
    console.log(`Looking for merged pull requests from ${expectedAuthor}`);
    pulls = pulls.filter((pull) => {
        console.log(`Pull with id ${pull.id} was merged at ${pull.merged_at}`);
        if (!pull.merged_at) {
            console.log(`Pull with id ${pull.id} was not merged.`);
            return false;
        }
        console.log(`Pull with id ${pull.id} was merged by ${pull.user.login}`);
        return pull.user.login === expectedAuthor;
    })

    const pullCount = pulls.length;
    console.log(`Found ${pullCount} merged pull requests from ${expectedAuthor}`);


    const msg = core.getInput(`message-${pullCount}`, {required: false});
    if(!msg) {
        console.log(`No message found for ${pullCount} merged pull requests`);
        return;
    }

    await octokit.rest.issues.createComment({
        owner: github.context.repo.owner,
        issue_number: github.context.issue.number,
        repo: github.context.repo.repo,
        body: msg
    });

    await octokit.rest.issues.addLabels({
        owner: github.context.repo.owner,
        issue_number: github.context.issue.number,
        repo: github.context.repo.repo,
        labels: ["merge-milestone", "merge-milestone-${pullCount}"]
    });



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
