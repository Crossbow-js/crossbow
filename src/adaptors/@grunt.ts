import {RunCommandTrigger} from "../command.run";
import {Task} from "../task.resolve";
import {AdaptorTask} from "../task.resolve";
import {resolve} from 'path';

module.exports = function (task: AdaptorTask, trigger: RunCommandTrigger) {

    return function (obs) {

        const grunt = require('grunt');
        const taskList = task.command.split(' ');

        grunt.tasks(taskList, {
            gruntfile: resolve(trigger.config.cwd, trigger.input.gruntfile),
            base: trigger.config.cwd,
            tasks: [],
            npm: []
        }, function (err) {
            if (err) {
                return obs.onError(err);
            }
            obs.onCompleted();
        });
    };
};
