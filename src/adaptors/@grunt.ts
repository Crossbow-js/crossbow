import {RunCommandTrigger} from "../command.run";
import {Task} from "../task.resolve.d";
import {resolve} from 'path';

module.exports = function (task: Task, trigger: RunCommandTrigger) {

    return function (opts, ctx, observer) {

        const grunt = require('grunt');
        const taskList = task.command.split(' ');

        grunt.tasks(taskList, {
            gruntfile: resolve(trigger.config.cwd, trigger.input.gruntfile),
            base: trigger.config.cwd,
            tasks: [],
            npm: []
        }, function (err) {
            if (err) {
                return observer.onError(err);
            }
            observer.onCompleted();
        });
    };
};
