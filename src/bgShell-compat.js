const spawn = require('child_process').spawn;
const utils = require('./utils');
const children = [];

module.exports = function (input, config, item) {

    return function (obs) {

        const stringInput = utils.transformStrings(item.rawInput, input.config);
        const segs        = stringInput.split(' ').map(x => x.trim()).filter(x => x.length);

        obs.log.info('Running {yellow:%s}', stringInput);

        const child = spawn(segs[0], segs.slice(1), {
            cwd: process.cwd,
            env: process.env,
            stdio: ['pipe', process.stdout, process.stderr]
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

