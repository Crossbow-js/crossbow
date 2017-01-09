const assert = require('chai').assert;
const reports = require('../../../dist/reporter.resolve');
const utils = require('../../utils');

const input1 = {
    tasks: {
        'other': function() {
            console.log('ere');
        },
        'other2': function() {
            console.log('ere');
        },
        '(docker)': {
            exec: ['@npm sleep 1']
        },
        '(sh)': {
            'build': ['@npm auto prefxier', '@sh s3 deploy assets'],
            css: function cssTask() {},
            js: function jsTask() {},
            other: {
                description: 'My description bro',
                tasks: ['@npm sleep 1']
            }
        }
    }
};

describe('command.tasks', function () {
    it("resolves default tasks", function () {
        const setup = utils.getGenericSetup({
            input: ['tasks']
        }, {
            tasks: {
                docker: '@sh docker ps'
            }
        });

        // console.log(setup);
        assert.equal(setup.errors.length, 0);
        assert.equal(setup.groups[0].title, 'Default Tasks');
        assert.equal(setup.groups[0].tasks.valid.length, 1);
    });
    it("resolves all default + Parent tasks", function () {
        const setup = utils.getGenericSetup({
            input: ['tasks']
        }, input1);

        assert.equal(setup.errors.length, 0);
        assert.equal(setup.groups.length, 3, 'should be 1 default + 2 parents');
        assert.equal(setup.groups[0].title, 'Default Tasks');
        assert.equal(setup.groups[1].title, 'docker');
        assert.equal(setup.groups[2].title, 'sh');

        assert.equal(setup.groups[0].tasks.valid.length, 2);
        assert.equal(setup.groups[1].tasks.valid.length, 1);
        assert.equal(setup.groups[2].tasks.valid.length, 4);
    });
    it("resolves tasks default selected", function () {
        const setup = utils.getGenericSetup({
            input: ['tasks', 'other', 'other2']
        }, input1);

        assert.equal(setup.groups.length, 1);
        assert.equal(setup.groups[0].title, 'Default Tasks');
        assert.equal(setup.groups[0].tasks.valid.length, 2);
    });
    it("resolves tasks with parent selected", function () {
        const setup = utils.getGenericSetup({
            input: ['tasks', 'docker']
        }, input1);

        assert.equal(setup.groups.length, 1);
        assert.equal(setup.groups[0].title, 'docker');
        assert.equal(setup.groups[0].tasks.valid.length, 1);
    });
    it("resolves tasks with a mix of default & parent selections", function () {
        const setup = utils.getGenericSetup({
            input: ['tasks', 'docker', 'other']
        }, input1);

        assert.equal(setup.groups.length, 2);
        assert.equal(setup.groups[0].title, 'Default Tasks');
        assert.equal(setup.groups[1].title, 'docker');

        assert.equal(setup.groups[0].tasks.valid.length, 1);
        assert.equal(setup.groups[1].tasks.valid.length, 1);
    });
    it("resolves with no groups if input empty", function () {
        const setup = utils.getGenericSetup({
            input: ['tasks']
        }, {});
        assert.deepEqual(setup, { groups: [], tasks: [], errors: [] })
    });
});

