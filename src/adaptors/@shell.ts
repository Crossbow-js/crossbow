import {RunCommandTrigger} from "../command.run";
import {AdaptorTask} from "../task.resolve";
import {getArgs, runCommand} from './@npm';
const debug = require('debug')('cb:@shell');

module.exports = function (task: AdaptorTask, trigger: RunCommandTrigger) {

    return function (obs) {

        const args = getArgs(task, trigger);

        debug(`running %s`, args.cmd);

        const emitter = runCommand(args.cmd, {
            cwd: trigger.config.cwd,
            env: process.env,
            stdio: [0, 1, 2]
        });

        emitter.on('close', function (code) {
            if (trigger.config.exitOnError) {
                if (code !== 0) {
                    const e = new Error(`Command ${args.cmd.join(' ')} failed with exit code ${code}`);
                    return obs.onError(e);
                }
            }
            obs.done();
        }).on('error', function (err) {
            obs.onError(err);
        });
    };
};
