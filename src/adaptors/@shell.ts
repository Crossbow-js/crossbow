import {CommandTrigger} from "../command.run";
import {getArgs, runCommand, teardown} from './@npm';
import {Task} from "../task.resolve.d";
import {CrossbowError} from "../reporters/defaultReporter";
import {getCBEnv} from "../task.utils";
const merge = require('../../lodash.custom').merge;
const debug = require('debug')('cb:@shell');

module.exports = function (task: Task, trigger: CommandTrigger) {

    return function (opts, ctx, done) {

        const args  = getArgs(task, trigger);
        const stdio = trigger.config.suppressOutput
            ? ['pipe', 'pipe', 'pipe']
            : 'inherit';
        
        const cbEnv = getCBEnv(trigger);
        const env = merge({}, cbEnv, task.env, process.env);

        debug(`running %s`, args.cmd);

        const emitter = runCommand(args.cmd, {
            cwd: trigger.config.cwd,
            env: env,
            stdio: stdio
        });

        emitter.on('close', function (code) {
            if (code !== 0) {
                const err: CrossbowError = new Error(`Previous command failed with exit code ${code}`);
                err.stack = `Previous command failed with exit code ${code}`;
                err._cbError = true;
                return done(err);
            }
            done();
        }).on('error', function (err) {
            done(err);
        });

        return function tearDownShellAdaptor () {
            teardown(emitter);
        };
    };
};
