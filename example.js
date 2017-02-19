require('source-map-support').install();
const utils = require('./dist/setup.envFile');
const bin = require('./dist/setup.bin');
const file = require('./dist/file.utils');
const pkg = require('./package.json');

// console.log(utils.envifyObject(pkg, 'npm', 'package'));

const envfiles = utils.getEnvFiles([
    'test/fixtures/env_file/package.json',
    'test/fixtures/env_file/.env',
], process.cwd());

envfiles.fold(e => {
    console.log('xx-->', e)
}, x => {
    console.log('-->', x.valid);
});

// const bins = bin.getBinLookups('test/fixtures/.bin', process.cwd());

// console.log(bins);
