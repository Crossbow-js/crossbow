var spawn = require('child_process').spawn;
var EventEmitter = require('events').EventEmitter;
const utils = require('./utils');
//const debug = require('debug')('npm-compat');
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
        // Create ENOENT error because Node.js v0.8 will not emit
        // an `error` event if the command could not be found.
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

function getEnv (env, config) {
    const localEnv  = require('object-assign')({}, env);
    const envpath   = require('path').join(config.get('cwd'), 'node_modules', '.bin');
    localEnv.PATH   = [envpath].concat(localEnv.PATH).join(':');
    return localEnv;
}

function getArgs (input, config, item, env) {
    const stringInput = utils.transformStrings(item.rawInput, input.config);
    return {
        stringInput: stringInput,
        env: require('./npm-compat').getEnv(env, config),
        cmd: [shFlag].concat(stringInput)
    };
}

module.exports = function (input, config, item) {

    const i = getArgs(input, config, item, process.env);

    return (obs) => {

        var emitter = runCommand(i.cmd, {
            cwd: config.get('cwd'),
            env: i.env,
            stdio: [0, 1, 2]
        });

        emitter.on('close', function () {
            obs.done();
        }).on('error', function (err) {
            obs.onError(err);
        });
    };
};

module.exports.runCommand = runCommand;
module.exports.getEnv = getEnv;
