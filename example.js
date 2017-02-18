const utils = require('./dist/task.utils');
const pkg = require('./package.json');

console.log(utils.envifyObject(pkg, 'npm', 'package'));