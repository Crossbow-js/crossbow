import {CommandTrigger} from "../command.run";
import {CrossbowConfiguration} from "../config";
import {Task} from "../task.resolve";
import Immutable = require("immutable");

import {EventEmitter} from "events";
import {spawn} from "child_process";
const debug = require("debug")("cb:adaptors.npm");
const _ = require("../../lodash.custom");

import {join} from "path";
import {CrossbowError} from "../reporters/defaultReporter";
import {getCBEnv, getContextEnv} from "../task.utils";

let sh = "sh";
let shFlag = "-c";

if (process.platform === "win32") {
    // todo test in windows env to ensure this hasn't broken anything
    // sh = process.env.comspec || 'cmd';
    sh = "cmd";
    shFlag = "/d /s /c";
}

export interface CommandOptions {
    cwd: string;
    env: any;
    stdio: any;
}

export interface CrossbowSpawnError extends Error {
    code: string;
    errno: string;
    syscall: string;
    file: string;
}

export interface CBEmitter extends EventEmitter {
    stdin: any;
    stdout: any;
    stderr: any;
    raw: any;
    kill: any;
}

function runCommand(args: string[], options: CommandOptions) {
    const raw = spawn(sh, args, options);
    const cooked = <CBEmitter>new EventEmitter();

    raw.on("error", function (er) {
        er.file = [sh, args].join(" ");
        cooked.emit("error", er);
    }).on("close", function (code, signal) {
        if (code === 127) {
            let er = <CrossbowSpawnError>new Error("spawn ENOENT");
            er.code = "ENOENT";
            er.errno = "ENOENT";
            er.syscall = "spawn";
            er.file = [sh, args].join(" ");
            cooked.emit("error", er);
        } else {
            cooked.emit("close", code, signal);
        }
    });

    cooked.stdin = raw.stdin;
    cooked.stdout = raw.stdout;
    cooked.stderr = raw.stderr;
    cooked.raw = raw;
    cooked.kill = function (sig) {
        return raw.kill(sig);
    };

    return cooked;
}

/**
 * Add the local ./node_modules/.bin directory to the beginning
 * of the users PATH - this will allow it to find local scripts
 * @param {process.env} process
 * @param {Immutable.Map} config
 * @param paths
 * @returns {object}
 */
function getEnv(process: any, config: CrossbowConfiguration, paths?: string[]) {
    const binDirs  = Immutable.Set([...config.binDirectories.map(x => x.resolved), ...paths]);
    const PATH     = binDirs.add(process.env.PATH).join(":");
    return {PATH};
}

export interface CommandArgs {
    stringInput?: string;
    cmd?: string[];
    errors: Error[];
}

function getArgs(command: string): CommandArgs {
    return {
        stringInput: command,
        cmd: [shFlag].concat(command),
        errors: []
    };
}

export function teardown(emitter, task: Task) {
    if ((typeof emitter.raw.exitCode) !== "number") {
        debug("tearing down a child_process because exitCode is missing");
        emitter.removeAllListeners("close");
        emitter.kill("SIGINT");
        emitter.on("close", function () {
            debug("close method on child encountered");
            // todo - async teardown for sequential
        });
    } else {
        debug("child process already completed, not disposing");
    }
}

export function getStdio(trigger: CommandTrigger) {
    // todo - prefixed logging for child processes
    if (trigger.config.suppressOutput) {
        return ["pipe", "pipe", "pipe"];
    }

    // process.stdin, process.stdout, process.stderr
    return [process.stdin, process.stdout, "pipe"];
}

export function handleExit(emitter, done) {
    const stderr = [];

    emitter.stderr.on("data", function (data) {
        stderr.push(data);
    });

    emitter.on("close", function (code) {

        // todo: Make pretty errors that originate from child processes
        if (code !== 0) {
            const err: CrossbowError = new Error(`Previous command failed with exit code ${code}`);
            if (stderr.length) {
                err.stack = stderr.map(String).join("");
            } else {
                err.stack = `Previous command failed with exit code ${code}`;
            }

            err._cbError = true;
            err._cbExitCode = code;

            return done(err);
        }
        done();
    }).on("error", function (err) {
        done(err);
    });
}

/**
 * The main export is the function this will be run in the sequence
 * @returns {Function}
 */
export default function (task: Task, trigger: CommandTrigger) {

    return (opts, ctx, done) => {

        const commandArgs = getArgs(task.command);
        const npmEnv      = getEnv(process, trigger.config, [join(trigger.config.cwd, "node_modules", ".bin")]);
        const cbEnv       = getCBEnv(trigger);
        const ctxEnv      = getContextEnv(trigger, ctx);
        const env         = _.merge({}, process.env, npmEnv, cbEnv, task.env, trigger.config.env, ctxEnv);
        const stdio       = getStdio(trigger);

        debug(`+ running '%s %s'`, sh, commandArgs.cmd.join(" "));

        const emitter = runCommand(commandArgs.cmd, {
            cwd: trigger.config.cwd,
            env: env,
            stdio: stdio // [process.stdin, process.stdout, process.stderr]
        });

        handleExit(emitter, done);

        return function tearDownNpmAdaptor() {
            teardown(emitter, task);
        };
    };
};

export {runCommand, getArgs, getEnv};
