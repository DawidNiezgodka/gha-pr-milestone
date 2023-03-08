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

    let pulls = await tools.github.paginate(
        tools.github.pulls.list,
        {
            ...tools.context.repo, // repo + owner
            'state': 'closed',
            "per_page": 100,
            "sort": "updated",
        },
        (response) => response.data
    )

    // Filter out PRs that are too old
    pulls = pulls.filter((pull) => {
      if (pull.data.updated_at < earliest) {
        return false;
      }
    }

    tools.exit.success('We did it!')
})
