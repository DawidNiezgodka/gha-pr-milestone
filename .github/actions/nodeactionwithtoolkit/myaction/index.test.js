const { Toolkit } = require('actions-toolkit')
const nock = require('nock')
nock.disableNetConnect()


process.env.GITHUB_REPOSITORY = 'DawidNiezgodka/gha-pr-milestone'
process.env.GITHUB_ACTION = 'my-toolkit-gen-action'
process.env.GITHUB_WORKFLOW = 'test-workflow'
process.env.GITHUB_ACTOR = 'DawidNiezgodka'
process.env.GITHUB_WORKSPACE = '/tmp/github/workspace'
process.env.GITHUB_SHA = '1234567890abcdef1234567890abcdef12345678'
process.env.INPUT_MERGED_3 = 'm3'


describe('my-toolkit-gen-action', () => {
    let action, tools

    // Mock Toolkit.run to define `action` so we can call it
    Toolkit.run = jest.fn((actionFn) => {
        action = actionFn
    })
    // Load up our entrypoint file
    require('.')
    beforeEach(() => {
        jest.resetModules();
    })

    it('Should fail when triggered by a wrong event', () => {
        tools = mockEvent('issues', {})
        expect(action(tools)).rejects.toThrow(
            new Error("Invalid event. Expected 'pull_request', got 'issues'")
        )
    });

    it('Should fail when triggered by the correct even but wrong action', () => {
        const payload = {
            "action": "opened"
        }
        tools = mockEvent('pull_request', payload)
        expect(action(tools)).rejects.toThrow(
            new Error("Invalid event. Expected 'pull_request.closed', got 'pull_request.opened'")
        )
    });

    it("Should exit when a PR is not merged", async () => {
        const payload = {
            "action": "closed",
            "pull_request": {
                "number": 1,
                "merged": false,
                "user": {
                    "login": "DawidNiezgodka"
                }
            }
        }
        tools = mockEvent('pull_request', payload);
        // The toHaveBeenCalledWith() matcher can only be used with mock or spy functions
        // that have been created using Jest's jest.fn() or jest.spyOn() functions.
        // If any other value is passed to toHaveBeenCalledWith(), an error will be thrown.
        tools.log.warn = jest.fn();
        await action(tools);
        // .toHaveBeenCalledWith() is a Jest matcher that checks if the function was called with specific arguments.
        // In this case, we use it to check if the tools.log.warn() function was called
        // with the given string
        expect(tools.log.warn).toHaveBeenCalledWith("Pull request was closed without merge, skipping");
    });

    it("Should exit when no action is required", async () => {
        tools = mockEvent('pull_request', {
            "action": "closed",
            "pull_request": {
                "merged": true,
                "user": {"login": "DawidNiezgodka"}
            }
        })

        tools.log.debug = jest.fn();
        tools.log.info = jest.fn();

        const getPrMock = nock('https://api.github.com')
            .get('/repos/DawidNiezgodka/gha-pr-milestone/pulls?state=closed&per_page=100')
            .reply(200, [
                { "merged_at": "2020-03-01T21:00:01", "user": {"login": "DawidNiezgodka"} },
                {"merged_at": "2020-03-01T21:00:02", "user": {"login": "random"}},
                {"merged_at": "2020-03-01T21:00:03", "user": {"login": "DawidNiezgodka"}},
                {"merged_at": "2020-03-01T21:00:04", "user": {"login": "random"}},
                {"merged_at": null, "user": {"login": "DawidNiezgodka"}}
            ]);

        await action(tools);

        expect(tools.log.debug).toHaveBeenCalledWith("There are 2 Pull Requests");
        expect(tools.log.info).toHaveBeenCalledWith("No action required");
    })

    it("Should add comment to PR", async () => {
        tools = mockEvent('pull_request', {
            "action": "closed",
            "pull_request": {
                "merged": true,
                "number": 1,
                "user": {"login": "DawidNiezgodka"}
            }
        })


        tools.log.debug = jest.fn();
        tools.log.info = jest.fn();

        const getPrMock = nock('https://api.github.com')
            .get('/repos/DawidNiezgodka/gha-pr-milestone/pulls?state=closed&per_page=100')
            .reply(200, [
                { "merged_at": "2020-03-01T21:00:01", "user": {"login": "DawidNiezgodka"} },
                {"merged_at": "2020-03-01T21:00:02", "user": {"login": "DawidNiezgodka"}},
                {"merged_at": "2020-03-01T21:00:03", "user": {"login": "DawidNiezgodka"}}
            ]);

        const addCommentMock = nock('https://api.github.com')
            .post('/repos/DawidNiezgodka/gha-pr-milestone/issues/1/comments', {
                body: "m3"
            })
            .reply(200);

        const addLabelMock = nock('https://api.github.com')
            .post('/repos/DawidNiezgodka/gha-pr-milestone/issues/1/labels', {
                labels: ["merge-milestone", "merge-milestone:3"]
            })
            .reply(200);

        await action(tools);
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
});
