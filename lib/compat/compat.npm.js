const spawn = require('child_process').spawn;
const EventEmitter = require('events').EventEmitter;
const utils = require('./../utils');
const debug = require('debug')('compat.npm');
var sh = 'sh';
var shFlag = '-c';

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
            var er = new Error('spawn ENOENT');
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
function getEnv (env, config) {
    const localEnv  = require('object-assign')({}, env);
    const envpath   = require('path').join(config.get('cwd'), 'node_modules', '.bin');
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
function getArgs (input, config, item) {
    const stringInput = utils.transformStrings(item.rawInput, input.config);
    return {
        stringInput: stringInput,
        cmd: [shFlag].concat(stringInput)
    };
}

/**
 * The main export is the function this will be run in the sequence
 * @param input
 * @param config
 * @param item
 * @returns {Function}
 */
module.exports = function (input, config, item) {

    return (obs) => {

        const i   = getArgs(input, config, item); // todo: allow user to set env vars from config
        const env = getEnv(process.env, config);

        debug(`running %s`, i.cmd);

        const emitter = runCommand(i.cmd, {
            cwd: config.get('cwd'),
            env: env,
            stdio: [0, 1, 2]
        });

        emitter.on('close', function (code, signal) {
            if (config.get('exitOnError')) {
                if (code !== 0) {
                    const e = new Error(`Command ${i.cmd.join(' ')} failed with exit code ${code}`);
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
