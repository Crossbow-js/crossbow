import {RunCommandTrigger} from "../command.run";
import {CrossbowConfiguration} from "../config";
import {Task} from "../task.resolve";

const spawn        = require('child_process').spawn;
const EventEmitter = require('events').EventEmitter;
const debug        = require('debug')('cb:npm');
const assign       = require('object-assign');

import {transformStrings} from '../task.utils';
import {join} from "path";

var sh             = 'sh';
var shFlag         = '-c';

interface CrossbowSpawnError extends Error {
    code: string
    errno: string
    syscall: string
    file: string
}

if (process.platform === 'win32') {
    sh = process.env.comspec || 'cmd';
    shFlag = '/d /s /c';
}

function runCommand(args, options) {
    var raw = spawn(sh, args, options);
    var cooked = new EventEmitter();

    raw.on('error', function (er) {
        er.file = [sh, args].join(' ');
        cooked.emit('error', er);
    }).on('close', function (code, signal) {
        if (code === 127) {
            var er = <CrossbowSpawnError>new Error('spawn ENOENT');
            er.code = 'ENOENT';
            er.errno = 'ENOENT';
            er.syscall = 'spawn';
            er.file = [sh, args].join(' ');
            cooked.emit('error', er);
        } else {
            cooked.emit('close', code, signal);
        }
    });

    cooked.stdin = raw.stdin;
    cooked.stdout = raw.stdout;
    cooked.stderr = raw.stderr;
    cooked.kill = function (sig) {
        return raw.kill(sig);
    };

    return cooked;
}

/**
 * Add the local ./node_modules/.bin directory to the beginning
 * of the users PATH - this will allow it to find local scripts
 * @param {process.env} env
 * @param {Immutable.Map} config
 * @returns {object}
 */
function getEnv (env: any, config: CrossbowConfiguration) {
    const localEnv  = assign({}, env);
    const envpath   = join(config.cwd, 'node_modules', '.bin');
    localEnv.PATH   = [envpath].concat(localEnv.PATH).join(':');
    return localEnv;
}

/**
 * Get the env & cmd needed to run a shell script
 * @param input
 * @param config
 * @param item
 * @param env
 * @returns {{stringInput: (*|Object), env: (Object|*), cmd: Array.<*>}}
 */
export interface CommandArgs {
    stringInput: string
    cmd: string[]
}

function getArgs (task: Task, input: RunCommandTrigger) : CommandArgs {
    const stringInput = transformStrings(task.rawInput, input.config);
    return {
        stringInput: stringInput,
        cmd: [shFlag].concat(stringInput)
    };
}

/**
 * The main export is the function this will be run in the sequence
 * @returns {Function}
 */
module.exports = function (task: Task, input: RunCommandTrigger) {

    return (obs) => {

        const commandArgs = getArgs(task, input); // todo: allow user to set env vars from config
        const env = getEnv(process.env, input.config);

        debug(`running %s`, commandArgs.cmd);

        const emitter = runCommand(commandArgs.cmd, {
            cwd: input.config.cwd,
            env: env,
            stdio: [0, 1, 2]
        });

        emitter.on('close', function (code) {
            if (input.config.exitOnError) {
                if (code !== 0) {
                    const e = new Error(`Command ${commandArgs.cmd.join(' ')} failed with exit code ${code}`);
                    return obs.onError(e);
                }
            }
            obs.done();
        }).on('error', function (err) {
            obs.onError(err);
        });
    };
};

module.exports.runCommand = runCommand;
module.exports.getEnv = getEnv;
module.exports.getArgs = getArgs;
