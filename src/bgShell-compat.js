const npm = require('./npm-compat');
const utils = require('./utils');

const children = [];

module.exports = function (input, config, item) {

    return function (obs) {

        const stringInput = utils.transformStrings(item.rawInput, input.config);
        const env         = require('./npm-compat').getEnv(process.env, config);
        const cmd         = ['-c'].concat(stringInput);

        obs.log.info('Running {yellow:%s}', stringInput);

        const child = npm.runCommand(cmd, {
            cwd: config.get('cwd'),
            env: env,
            stdio: [0, 1, 2]
        });

        obs.done();
        child.wasClosed = () => obs.log.debug('Closed: {yellow:%s}', stringInput);
        child.cmd = stringInput;
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

