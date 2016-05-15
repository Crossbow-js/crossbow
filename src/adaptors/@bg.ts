import {CommandTrigger} from "../command.run";
import {getArgs, runCommand, teardown, getEnv, getMergedEnv} from './@npm';
import {Task} from "../task.resolve.d";
const debug = require('debug')('cb:@bg');

module.exports = function (task: Task, trigger: CommandTrigger) {

    return function (opts, ctx, done) {

        const args = getArgs(task, trigger);
        const env = getMergedEnv(process, task, trigger);
        const stdio = trigger.config.suppressOutput
            ? ['pipe', 'pipe', 'pipe']
            : 'inherit';

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
