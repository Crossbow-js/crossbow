import {RunCommandTrigger} from "../command.run";
import {CrossbowConfiguration} from "../config";
import {Task} from "../task.resolve";

const spawn        = require('child_process').spawn;
const EventEmitter = require('events').EventEmitter;
const debug        = require('debug')('cb:adaptors.npm');
const assign       = require('object-assign');

import {transformStrings} from '../task.utils';
import {join} from "path";
import {CrossbowError} from "../reporters/defaultReporter";

var sh             = 'sh';
var shFlag         = '-c';

if (process.platform === 'win32') {
    sh = process.env.comspec || 'cmd';
    shFlag = '/d /s /c';
}

export interface CommandOptions {
    cwd: string,
    env: any,
    stdio: any
}

interface CrossbowSpawnError extends Error {
    code: string
    errno: string
    syscall: string
    file: string
}

function runCommand(args: string[], options: CommandOptions) {
    const raw    = spawn(sh, args, options);
    const cooked = new EventEmitter();

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

    cooked.stdin  = raw.stdin;
    cooked.stdout = raw.stdout;
    cooked.stderr = raw.stderr;
    cooked.raw    = raw;
    cooked.kill   = function (sig) {
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

export interface CommandArgs {
    stringInput: string
    cmd: string[]
}

function getArgs (task: Task, trigger: RunCommandTrigger) : CommandArgs {
    const stringInput = transformStrings(task.command, trigger.config);
    return {
        stringInput: stringInput,
        cmd: [shFlag].concat(stringInput)
    };
}

/**
 * The main export is the function this will be run in the sequence
 * @returns {Function}
 */
export default function (task: Task, trigger: RunCommandTrigger) {

    return (opts, ctx, observer) => {

        const commandArgs = getArgs(task, trigger); // todo: allow user to set env vars from config
        const env = getEnv(process.env, trigger.config);
        const stdio = trigger.config.suppressOutput
            ? ['pipe', 'pipe', 'pipe']
            : 'inherit';

        debug(`+ running '%s %s'`, sh, commandArgs.cmd.join(' '));

        // todo close all child tasks following the exit of the main process

        const emitter = runCommand(commandArgs.cmd, {
            cwd: trigger.config.cwd,
            env: env,
            stdio: stdio // [process.stdin, process.stdout, process.stderr]
        });

        emitter.on('close', function (code) {
            // todo: Make pretty errors that originate from child processes
            if (code !== 0) {
                const e: CrossbowError = new Error(`Command '${commandArgs.cmd.slice(1).join(' ')}' failed with exit code ${code}`);
                e._cbError = true;
                return observer.onError(e);
            }
            observer.done();
        }).on('error', function (err) {
            observer.onError(err);
        });

        return {
            type: 'child_process',
            child: emitter
        };
    };
};

export {runCommand, getArgs, getEnv};
