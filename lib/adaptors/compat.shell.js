const npm   = require('./compat.npm');
const debug = require('debug')('compat.shell');

module.exports = function (input, config, item) {

    return function (obs) {

        const i   = npm.getArgs(input, config, item); // todo: allow user to set env vars from config

        debug(`running %s`, i.cmd);

        const emitter = npm.runCommand(i.cmd, {
            cwd: config.get('cwd'),
            env: process.env,
            stdio: [0, 1, 2]
        });

        emitter.on('close', function (code) {
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