const assert = require('chai').assert;
const reports = require('../../../dist/reporter.resolve');
const utils = require('../../utils');

describe('command.watchers', function () {
    it("reports watchers", function () {
        const runner = utils.run({
            input: ['watchers']
        }, {
            watch: {
                default: {
                    patterns: ['*.json', 'core/css/*.{js,css}'],
                    tasks:    ['build', 'other']
                }
            },
            tasks: {
                build: utils.task(100),
                other: utils.task(100)
            }
        });

        runner
            .output
            .filter(x => x.origin === 'WatcherNames')
            .map(x => x.data.join('\n'))
            .subscribe(function (data) {
                assert.include(data, '    {bold:Name}:     default');
                assert.include(data, '    {bold:Patterns}: *.json, core/css/*.\\{js,css\\}');
                assert.include(data, '    {bold:Tasks}:    build, other');
            });
    });
    it("reports when no watchers available", function () {
        const runner = utils.run({
            input: ['watchers']
        }, {
            tasks: {
                build: utils.task(100),
                other: utils.task(100)
            }
        });

        runner
            .output
            .filter(x => x.origin === 'NoWatchersAvailable')
            .map(x => x.data.join('\n'))
            .subscribe(function (data) {
                assert.include(data, '{red:-} {bold:Error Type:}  NoWatchersAvailable');
            });
    });
});

