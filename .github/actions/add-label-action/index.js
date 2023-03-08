const { Toolkit } = require('actions-toolkit')


// Run your GitHub Action!
Toolkit.run(async tools => {
    // Step 1: Get all pulls from a repo
    let pulls = await tools.github.paginate(
        tools.github.pulls.list,
        {
            ...tools.context.repo, // repo + owner
            'state': 'closed',
            per_page: 100
        },
        response => response.data
    );
    tools.log.info("There are " + pulls.length + " pull requests in this repo");
    // Step 2: Filter pulls by the odd issue number
    pulls = pulls.filter((pull) => {
        return pull.number % 2 === 1;
    });
    tools.log.info("There are " + pulls.length + " odd pull requests in this repo");
    // Step 3: Add a label to each odd pull request
    for (let pull of pulls) {
        tools.log.info("Adding label to pull request " + pull.number);
        await tools.github.issues.addLabels({
            ...tools.context.repo,
            issue_number: pull.number,
            labels: ["merge-milestone"]
        });
        tools.log.complete("Added label to pull request " + pull.number)
    }
})
