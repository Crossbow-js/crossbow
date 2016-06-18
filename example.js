'use strict';
// const incoming = process.argv.slice(2);
const incoming = tokenize('run shane kittie');
const args = incoming.slice();
const isFlag = (incoming) => incoming.slice(0, 2) === '--' || incoming[0] === '-';
let input = args.slice(0, firstFlagPos(args));

const hasSetter = (incoming) => {
    let equals = incoming.indexOf('=');
    if (equals === -1) return false;
    if (incoming.length > equals + 1) return true;
    return false;
}

const flags = args.reduce((acc, item, i) => {
        if (isFlag(item)) {
            return acc.concat([args.slice(i)]);
        }
        return acc;
    }, [])
    .map(function (flag) {
        // console.log(flag);
        const slicePoint = flag.slice(1)
            .reduce(function (acc, item, i) {
                if (acc === -1) {
                    // not set
                    if (isFlag(item)) return i + 1;
                }
                return acc;
            }, -1);
        if (slicePoint === -1) {
            if (isFlag(flag[0])) {
                // is Everything to the right of this point an input?
                input = input.concat(flag.slice(1));
                return flag.slice(0, 1);
            }
            return flag;
        }
        const outgoing = flag.slice(0, slicePoint);
        if (hasSetter(outgoing[0])) {
            input = input.concat(outgoing.slice(1));
            return [outgoing[0]];
        }
        return flag.slice(0, slicePoint);
    }).map(function (item) {
        if (item.length === 1) {
            return item[0].split(/=/);
        }
        return item;
    }).reduce(function (acc, item) {
        if (item.length === 1) {

            // Double flag
            if (item[0].slice(0, 2) === '--') {
                const name = item[0].slice(2);
                return acc.concat([[`--${name}`]]);
            }

            //Single flag
            const current = item[0].slice(1);
            return acc.concat(current.split('').map(x => [`-${x}`]));
        }
        return acc.concat([item]);
    }, [])
    .map(function stripDash(x) {
        return {[propName(x[0])]: x.slice(1)};
    });

function propName(incoming) {
    return incoming.replace(/^--?/, '');
}

console.log('input:');
console.log(input);
console.log('---');
console.log('flags:');
console.log(transformed);

// console.log(_.merge({}, {name: ['one']}, {name: ['two']}))

function firstFlagPos(items) {
    let i = 0;
    items.some((x, index) => {
        if (isFlag(x)) {
            i = index;
            return true;
        }
    });
    return i;
}


// With thanks to yargs parser
function tokenize(argString) {
    if (Array.isArray(argString)) return argString;

    var i = 0;
    var c = null;
    var opening = null;
    var args = [];

    for (var ii = 0; ii < argString.length; ii++) {
        c = argString.charAt(ii);

        // split on spaces unless we're in quotes.
        if (c === ' ' && !opening) {
            i++;
            continue
        }

        // don't split the string if we're in matching
        // opening or closing single and double quotes.
        if (c === opening) {
            opening = null;
            continue;
        } else if ((c === "'" || c === '"') && !opening) {
            opening = c;
            continue;
        }

        if (!args[i]) args[i] = '';
        args[i] += c;
    }

    return args;
}
