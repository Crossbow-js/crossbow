import {CommandTrigger} from "../command.run";
import {getArgs, runCommand, teardown, getEnv, getStdio} from './@npm';
import {Task} from "../task.resolve";
import {envifyObject, getCBEnv} from "../task.utils";
const debug = require('debug')('cb:@bg');
const merge = require('../../lodash.custom').merge;

module.exports = function (task: Task, trigger: CommandTrigger) {

    return function (opts, ctx, done) {

        const args   = getArgs(task.command);
        const npmEnv = getEnv(process, trigger.config);
        const cbEnv  = getCBEnv(trigger);
        const env    = merge({}, process.env, npmEnv, cbEnv, task.env, trigger.config.env);
        const stdio  = getStdio(trigger);

        debug(`running %s`, args.cmd);

        const emitter = runCommand(args.cmd, {
            cwd: trigger.config.cwd,
            env: env,
            stdio: stdio
        });

        emitter.on('close', function (code) {
            teardown(emitter);
        }).on('error', function (err) {
            done(err);
        });

        done(null, function tearDownBgAdaptor() {
            teardown(emitter);
        });
    };
};
