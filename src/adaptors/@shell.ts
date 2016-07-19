import {CommandTrigger} from "../command.run";
import {getArgs, runCommand, teardown, getStdio, handleExit} from './@npm';
import {Task} from "../task.resolve";
import {getCBEnv} from "../task.utils";
const merge = require('../../lodash.custom').merge;
const debug = require('debug')('cb:@shell');

module.exports = function (task: Task, trigger: CommandTrigger) {

    return function (opts, ctx, done) {

        const args  = getArgs(task, trigger);
        const stdio = getStdio(trigger);
        
        const cbEnv = getCBEnv(trigger);
        const env = merge({}, cbEnv, task.env, process.env, trigger.config.env);

        debug(`running %s`, args.cmd);

        const emitter = runCommand(args.cmd, {
            cwd: trigger.config.cwd,
            env: env,
            stdio: stdio
        });

        handleExit(emitter, done);

        return function tearDownShellAdaptor () {
            teardown(emitter);
        };
    };
};
