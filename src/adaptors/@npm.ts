import {CommandTrigger} from "../command.run";
import {CrossbowConfiguration} from "../config";
import {Task} from "../task.resolve";

import {EventEmitter} from 'events';
import {spawn} from 'child_process';
const debug = require('debug')('cb:adaptors.npm');
const _ = require('../../lodash.custom');

import {join} from "path";
import {CrossbowError} from "../reporters/defaultReporter";
import {getCBEnv} from "../task.utils";

var sh = 'sh';
var shFlag = '-c';

if (process.platform === 'win32') {
    sh = process.env.comspec || 'cmd';
    shFlag = '/d /s /c';
}

export interface CommandOptions {
    cwd: string,
    env: any,
    stdio: any
}

export interface CrossbowSpawnError extends Error {
    code: string
    errno: string
    syscall: string
    file: string
}

export interface CBEmitter extends EventEmitter {
    stdin: any
    stdout: any
    stderr: any
    raw: any
    kill: any
}

function runCommand(args: string[], options: CommandOptions) {
    const raw = spawn(sh, args, options);
    const cooked = <CBEmitter>new EventEmitter();

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
    cooked.kill   =  function (sig) {
        return raw.kill(sig);
    };

    return cooked;
}

/**
 * Add the local ./node_modules/.bin directory to the beginning
 * of the users PATH - this will allow it to find local scripts
 * @param {process.env} process
 * @param {Immutable.Map} config
 * @returns {object}
 */
function getEnv(process: any, config: CrossbowConfiguration) {
    const localEnv = <any>{};
    const envpath = join(config.cwd, 'node_modules', '.bin');
    localEnv.PATH = [envpath].concat(process.env.PATH).join(':');
    return localEnv;
}

export interface CommandArgs {
    stringInput: string
    cmd: string[]
}

function getArgs(task: Task, trigger: CommandTrigger): CommandArgs {
    return {
        stringInput: task.command,
        cmd: [shFlag].concat(task.command)
    };
}

export function teardown (emitter) {
    if ((typeof emitter.raw.exitCode) !== 'number') {
        debug('tearing down a child_process because exitCode is missing');
        emitter.removeAllListeners('close');
        emitter.kill('SIGINT');
        emitter.on('close', function () {
            debug('close method on child encountered');
            // todo - async teardown for sequential
        });
    } else {
        debug('child process already completed, not disposing');
    }
}

export function getStdio (trigger: CommandTrigger) {
    // todo - prefixed logging
    // if (trigger.config.outputOnly) {
    //     return ['pipe', 'pipe', 'pipe'];
    // }
    return [process.stdin, process.stdout, 'pipe'];
}

export function handleExit (emitter, done) {
    const stderr = [];

    emitter.stderr.on('data', function (data) {
        stderr.push(data);
    });

    emitter.on('close', function (code) {

        // todo: Make pretty errors that originate from child processes
        if (code !== 0) {
            const err: CrossbowError = new Error(`Previous command failed with exit code ${code}`);
            if (stderr.length) {
                err.stack = stderr.map(String).join('');
            } else {
                err.stack = `Previous command failed with exit code ${code}`
            }
            
            err._cbError    = true;
            err._cbExitCode = code;
            
            return done(err);
        }
        done();
    }).on('error', function (err) {
        done(err);
    });
}

/**
 * The main export is the function this will be run in the sequence
 * @returns {Function}
 */
export default function (task: Task, trigger: CommandTrigger) {

    return (opts, ctx, done) => {

        const commandArgs = getArgs(task, trigger); // todo: allow user to set env vars from config
        const npmEnv = getEnv(process, trigger.config);
        const cbEnv = getCBEnv(trigger);
        const env = _.merge({}, process.env, npmEnv, cbEnv, task.env, trigger.config.env);
        const stdio = getStdio(trigger);

        debug(`+ running '%s %s'`, sh, commandArgs.cmd.join(' '));
        // todo close all child tasks following the exit of the main process

        const emitter = runCommand(commandArgs.cmd, {
            cwd: trigger.config.cwd,
            env: env,
            stdio: stdio // [process.stdin, process.stdout, process.stderr]
        });

        handleExit(emitter, done);

        return function tearDownNpmAdaptor () {
            teardown(emitter);
        };
    };
};

export {runCommand, getArgs, getEnv};
