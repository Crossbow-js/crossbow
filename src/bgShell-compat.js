const spawn = require('child_process').spawn;
const utils = require('./utils');

module.exports = function (input, config, item) {

    return function (obs) {
        const stringInput = utils.transformStrings(item.rawInput, input.config);
        const segs        = stringInput.split(' ').map(x => x.trim()).filter(x => x.length);
        obs.log.info('Running {yellow:%s}', stringInput);
        spawn(segs[0], segs.slice(1), {
            cwd: process.cwd,
            env: process.env,
            stdio: ['pipe', process.stdout, process.stderr]
        }).on('close', function () {
            //console.log('DONE bgShell');
        });
        obs.done();
    };
};
