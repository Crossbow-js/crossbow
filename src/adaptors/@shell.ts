import {RunCommandTrigger} from "../command.run";
import {getArgs, runCommand} from './@npm';
import {Task} from "../task.resolve.d";
import {CrossbowError} from "../reporters/defaultReporter";
const debug = require('debug')('cb:@shell');

module.exports = function (task: Task, trigger: RunCommandTrigger) {

    return function (opts, ctx, observer) {

        const args = getArgs(task, trigger);
        const stdio = trigger.config.suppressOutput
            ? ['pipe', 'pipe', 'pipe']
            : 'inherit';

        debug(`running %s`, args.cmd);

        const emitter = runCommand(args.cmd, {
            cwd: trigger.config.cwd,
            env: process.env,
            stdio: stdio
        });

        emitter.on('close', function (code) {
            if (code !== 0) {
                const e: CrossbowError = new Error(`Previous command failed with exit code ${code}`);
                e._cbError = true;
                return observer.onError(e);
            }
            observer.done();
        }).on('error', function (err) {
            observer.onError(err);
        });
    };
};
