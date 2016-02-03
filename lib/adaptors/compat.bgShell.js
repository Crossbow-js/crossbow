const npm = require('./compat.npm');
const children = [];

module.exports = function (input, config, item) {

    return function (obs) {

        const env = npm.getEnv(process.env, config);
        const i   = npm.getArgs(input, config, item); // todo: allow user to set env vars from config

        obs.log.info('Running {yellow:%s}', i.stringInput);

        const child = npm.runCommand(i.cmd, {
            cwd: config.get('cwd'),
            env: env,
            stdio: [0, 1, 2]
        });

        obs.done();
        child.wasClosed = () => obs.log.debug('Closed: {yellow:%s}', i.stringInput);
        child.cmd = i.stringInput;
        children.push(child);
    };
};

process.on('SIGINT', function (code) {

    var closed = 0, opened = 0;

    children.forEach(function (child) {
        if (!child.exitCode) {
            opened++;
            child.removeAllListeners('close');
            child.kill('SIGINT');
            child.on('close', function() {
                child.wasClosed();
                closed++;
                if (opened == closed) {
                    process.exit(code);
                }
            });
        }
    });

    if (opened == closed) {process.exit(code);}
});

