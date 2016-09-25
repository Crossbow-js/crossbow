const assert = require('chai').assert;
const utils = require("../../utils");
const TaskRunModes = require("../../../dist/task.resolve").TaskRunModes;

describe('task.resolve object literal in long-hand', function () {
    it('adaptor + command keys', function () {
        const runner = utils.getRunner(['js', 'js2'], {
            tasks: {
                js: {
                    adaptor: 'npm',
                    command: 'sleep 1',
                    env: {
                        DOCKER_IP: 'another'
                    }
                },
                js2: {
                    input: '@npm sleep 2'
                }
            }
        });
        assert.equal(runner.tasks.valid[0].tasks[0].baseTaskName, '@npm sleep 1');
        assert.equal(runner.tasks.valid[1].tasks[0].baseTaskName, '@npm sleep 2');
        assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.series);
    });
    it('adaptor + command keys + @ adaptor symbol', function () {
        const runner = utils.getRunner(['js', 'js2'], {
            tasks: {
                js: {
                    adaptor: '@npm',
                    command: 'sleep 1',
                    env: {
                        DOCKER_IP: 'another'
                    }
                },
                js2: {
                    input: '@npm sleep 2'
                }
            }
        });
        assert.equal(runner.tasks.valid[0].tasks[0].baseTaskName, '@npm sleep 1');
        assert.equal(runner.tasks.valid[1].tasks[0].baseTaskName, '@npm sleep 2');
        assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.series);
    });
    it('using only input key', function () {
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: {
                    input: '@npm sleep 1',
                    env: {
                        DOCKER_IP: '0.0.0.0'
                    }
                }
            }
        });
        assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.series);
        assert.equal(runner.tasks.valid[0].tasks[0].env.DOCKER_IP, '0.0.0.0');
    });
    it('using only input key in array', function () {
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: [{
                    input: '@npm sleep 1',
                    env: {
                        DOCKER_IP: '0.0.0.0'
                    }
                }]
            }
        });
        assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.series);
        assert.equal(runner.tasks.valid[0].tasks[0].env.DOCKER_IP, '0.0.0.0');
    });
    it('Gives good errors when input is invalid', function () {
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: {
                    env: {
                        DOCKER_IP: '0.0.0.0'
                    }
                }
            }
        });
        assert.equal(runner.tasks.invalid.length, 1);
    });
});
