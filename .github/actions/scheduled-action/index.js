const { Toolkit } = require('actions-toolkit')
const { parse, toSeconds } = require('iso8601-duration')
// Run your GitHub Action!
Toolkit.run(async tools => {

  // What time frame are we looking at?
    try {
      var duration = toSeconds(parse(tools.inputs.since));
    } catch (e) {
        tools.exit.failure('Invalid duration: ' + tools.inputs.since);
        return;
    }
    const earliest = Math.floor(Date.now() / 1000) - duration;

    // Pagination can be stopped early by returning `false` from the callback
    // In a naive solution, we would get all pages, and only then filter
    // the PRs that are older than the specified time frame, i.e.:
    //pulls = pulls.filter((pull) => {
    //    if (pull.data.updated_at < earliest) {
    //        return false;
    //    }
    //});
    // Using callbacks, we can stop paginating as soon as we find a PR that
    // is too old.
    let pulls = await tools.github.paginate(
        tools.github.pulls.list,
        {
            ...tools.context.repo, // repo + owner
            'state': 'closed',
            "per_page": 100,
            "sort": "updated",
        },
        (response, done) => {
            // `response` is a single page of results
            // `done` is a function that can be called to stop pagination
            for (let pull of response.data) {
                const pullUpdatedAt = Math.floor(new Date(pull.updated_at) / 1000);
                if (pull.updated_at < earliest) {
                    done();
                    return false;
                }
            }
            return true;
        }
    )
    // Filter PRs that do not have the right labels
    pulls = pulls.filter((pull) => {
        return pull.labels.find((label) => {
            return label.name === "merge-milestone";
        });
    });

    tools.exit.success('We did it!')
})
