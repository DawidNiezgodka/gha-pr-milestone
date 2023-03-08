const { Toolkit } = require('actions-toolkit')
const nock = require('nock')
nock.disableNetConnect()

process.env.GITHUB_REPOSITORY = 'DawidNiezgodka/gha-pr-milestone'
process.env.GITHUB_ACTION = 'add-label-action'
process.env.GITHUB_WORKFLOW = 'test-workflow'
process.env.GITHUB_ACTOR = 'DawidNiezgodka'
process.env.GITHUB_WORKSPACE = '/tmp/github/workspace'
process.env.GITHUB_SHA = '1234567890abcdef1234567890abcdef12345678'
process.env.MERGED_MILESTONE_LABEL = 'merge-milestone'

describe('add-label-action', () => {
  let action, tools

  // Mock Toolkit.run to define `action` so we can call it
  Toolkit.run = jest.fn((actionFn) => { action = actionFn })
  // Load up our entrypoint file
  require('.')

  beforeEach(() => {
    jest.resetModules();
    // If there was no mockEvent() call before, the test will fail with the following error:
    // `TypeError: Cannot read properties of undefined (reading 'github')`
    // If one does not want to use the mockEvent() function, one can use the following code:
    // tools = new Toolkit()
  })

  it('Should get all pull requests', async () => {
    // Without this, the test will fail with the following error:
    // ⚠  warning There are environment variables missing from this runtime, but would be present on GitHub.
    // - GITHUB_EVENT_NAME
    // - GITHUB_EVENT_PATH
    tools = mockEvent('default_event', {});
    const getPrMock = nock('https://api.github.com')
        .get('/repos/DawidNiezgodka/gha-pr-milestone/pulls?state=closed&per_page=100')
        .reply(200, [
          { "merged_at": "2020-03-01T21:00:01", "user": {"login": "DawidNiezgodka"}, "number": 1 },
          {"merged_at": "2020-03-01T21:00:02", "user": {"login": "random"}, "number": 2},
          {"merged_at": "2020-03-01T21:00:03", "user": {"login": "DawidNiezgodka"}, "number": 3}
        ]);


    const pullAddLabelMock = nock('https://api.github.com')
        .post(/repos\/DawidNiezgodka\/gha-pr-milestone\/issues\/([0-9]+)\/labels/)
        .twice()
        .reply(200, {
            message: 'Labels added successfully'
        });

    tools.log.info = jest.fn();
    tools.log.complete = jest.fn();
    await action(tools)
    expect(tools.log.info).toHaveBeenCalledWith("There are 3 pull requests in this repo");
    expect(tools.log.complete).toHaveBeenCalledWith("Added label to pull request 1")
  });


  it("Should add label to odd pull requests", async () => {

  });

  function mockEvent(name, mockPayload) {
    // A function that creates a mock implementation of a module.
    // In this case, it is used to mock the contents of the JSON file that
    // contains the event data.
    // The first argument to jest.mock() is the path to the module to mock
    // (in this case, /github/workspace/event.json),
    // and the second argument is a function that returns the mock event payload.
    jest.mock(
        "/github/workspace/event.json",
        () => {
          return mockPayload
        },
        // This tells Jest to create a "virtual" module for the specified file path,
        // rather than attempting to load the file from disk.
        // This is useful for mocking files that are created dynamically during the test.
        {
          virtual: true,
        }
    );
    process.env.GITHUB_EVENT_NAME = name
    process.env.GITHUB_EVENT_PATH = "/github/workspace/event.json"
    return new Toolkit();
  }
})
