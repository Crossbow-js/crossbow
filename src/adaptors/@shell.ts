import {CommandTrigger} from "../command.run";
import {getArgs, runCommand, teardown, getStdio, handleExit, CommandArgs} from './@npm';
import {Task, TaskOriginTypes} from "../task.resolve";
import {getCBEnv} from "../task.utils";
import * as file from "../file.utils";
const merge = require('../../lodash.custom').merge;
const debug = require('debug')('cb:@shell');

module.exports = function (task: Task, trigger: CommandTrigger) {

    return function (opts, ctx, done) {

        const args = (function (): CommandArgs {
            if (task.origin === TaskOriginTypes.FileSystem) {
                try {
                    const contentFromDisk = file.readFileContent(task.externalTasks[0]);
                    return getArgs(contentFromDisk);
                } catch (e) {
                    return {
                        errors: [e]
                    };
                }
            }
            return getArgs(task.command);
        })();


        if (args.errors.length) {
            done(args.errors[0]);
            return;
        }

        const stdio = getStdio(trigger);
        const cbEnv = getCBEnv(trigger);
        const env    = merge({}, cbEnv, task.env, process.env, trigger.config.env);

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
