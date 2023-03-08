const { Toolkit } = require('actions-toolkit')

// Run your GitHub Action!
Toolkit.run(async tools => {
  require("action-guard")("pull_request.closed")

  const payload = tools.context.payload;
  if (!payload.pull_request.merged) {
    tools.log.warn("Pull request was closed without merge, skipping");
    return;
  }
  // tools.github.paginate() is a method provided by the @octokit/rest library
  // to automatically retrieve all pages of data from a paginated API endpoint.
  // In this case, we're using it to retrieve all pages of pull requests from the API.
  // tools.github.pulls.list -  is the API endpoint we want to paginate
  // It retrieves a list of pull requests for a repository.
  let pulls = await tools.github.paginate(
      tools.github.pulls.list,
      {
        // This syntax uses the spread operator to create a new object
        // that includes all the properties of the tools.context.repo object.
        // The syntax is equivalent to: {owner: tools.context.repo.owner,
        // repo: tools.context.repo.repo}
        ...tools.context.repo,
        'state': 'closed',
        per_page: 100
      },
      response => response.data
  );

    const expectedAuthor = payload.pull_request.user.login;
    pulls = pulls.filter((pull) => {
        if (!pull.merged_at) {
            return false;
        }
        return pull.user.login === expectedAuthor;
    });

    const pullCount = pulls.length;
    tools.log.debug(`There are ${pullCount} Pull Requests`);

    const message = tools.inputs[`merged_${pullCount}`];
    if (!message) {
        tools.log.info("No action required");
        return;
    }

    tools.log.pending(`Adding comment`);

    await tools.github.issues.createComment({
        ...tools.context.issue,
        body: message,
    });
    tools.log.complete(`Added comment: ${message}`);

    tools.log.pending(`Adding labels`);
    const labels = [`merge-milestone`, `merge-milestone:${pullCount}`];
    await tools.github.issues.addLabels({
        ...tools.context.issue,
        labels,
    });
    tools.log.complete(`Added labels:`, labels);
})


