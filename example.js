const path = require('path');
process.chdir('../');
console.log(path.resolve(process.cwd(), 'node_modules', 'crossbow-sass'))
// console.log(require.resolve(path.resolve(process.cwd, 'node_modules', 'crossbow-sass')));