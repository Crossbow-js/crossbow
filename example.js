const traverse = require('traverse');
/**
 * Convert a JS object into ENV vars
 * eg:
 *    var obj = {
 *      options: {
 *        docker: {
 *          port: 8000
 *        }
 *      }
 *    }
 * ->
 *    envifyObject(obj, 'CB', 'OPTIONS')
 * ->
 *    CB_OPTIONS_DOCKER_PORT=8000
 */
const blacklist = ['scheduler'];
function envifyObject(object, prefix, objectKeyName) {
    return traverse(object)
        .reduce(function (acc, x) {
            if (this.level >= 3) {
                this.remove(true);
                return acc;
            }
            if (this.circular) {
                this.remove(true);
                return acc;
            }
            if (this.isLeaf) {
                acc[[prefix, objectKeyName, ...this.path].join('_').toUpperCase()] = String(this.node);
            }
        return acc;
    }, {});
}

const input = {
    docker: {
        port: 8000
    },
    scheduler: {
        subscribe: {
            num: 1,
            person: {
                name: 'shane'
            }
        }
    }
};

console.log(envifyObject(input, 'CB', 'OPTIONS'));
console.log(input);