const _ = require('../lodash.custom');

export default function parse(input, opts?) {
    opts = opts || {};
    return parseArray(tokenize(input), opts)
}

function parseArray (incoming: string[], opts) {

    const command   = incoming[0];
    const args      = incoming.slice(1);
    const firstFlag = firstFlagPos(args);

    /**
     * Input is args directly after the command, or at the end
     * eg:
     *     $ crossbow run task1 task2 -p 8000
     * ->
     *      ['task1', 'task2']
     * eg:
     *     $ crossbow run task1 task2 -p 8000 -- task3 task4
     * ->
     *      ['task1', 'task2', 'task3', 'task4']
     */
    let input = (function () {
        // no flags given
        if (firstFlag === -1) return args.slice();
        // flag given at first position, so no input
        if (firstFlag === 0) return [];
        // flag at later point, so slice items upto it
        return args.slice(0, firstFlag);
    })();

    // console.log('firstFlagPos(args)', firstFlag);
    // console.log(input);

    const flags = args
        /**
         * Look at each item, discard none-flags & and trim to the right
         * for every one. This is what will allow the multi options later
         * eg:
         *    'task1 -p --before task2 task3 -pc
         *  ->
         *      [
         *          ['-p', '--before', 'task2', 'task3', '-pc],
         *          ['--before', 'task2', 'task3', '-pc'],
         *          ['-pc']
         *      ]
         */
        .reduce(function groupRight(acc, item, i) {
            if (isFlag(item)) {
                return acc.concat([args.slice(i)]);
            }
            return acc;
        }, [])
        /**
         * Now try to slice out a section that applies to this flag only
         * eg:
         *    ['-p', '--before', 'task2', 'task3', '-pc']
         * -> (slice 0, 1)
         *    ['-p']
         * eg:
         *    ['--before', 'task2', 'task3', '-pc']
         * -> (slice  0, 3)
         *    ['--before', 'task2', 'task3']
         * eg:
         *    ['-pc]
         * -> (slice -1)
         *    ['-pc']
         */
        .map(function getSubSection(flag) {
            /**
             * Get the slice index (if followed by another flag at some point
             */
            const slicePoint = (function () {
                return flag.slice(1)
                    .reduce(function (acc, item, i) {
                        if (acc === -1) {
                            // not set
                            if (isFlag(item)) return i + 1;
                        }
                        return acc;
                    }, -1);
            })();

            /**
             * If no flag followed, check if the first item is itself a flag.
             * Situations that would lead us here include:
             * eg:
             *   [ '-pc' ]
             */
            if (slicePoint === -1) {
                if (isFlag(flag[0])) {
                    if (hasSetter(flag[0])) {
                        /**
                         * Slice everything to the end and add to the input array
                         */
                        input = input.concat(flag.slice(1));
                        return flag.slice(0, 1);
                    }
                }
                /**
                 * At this point, there was NO FLAG FOLLOWING this flag, so any items
                 * after it are considered to be belong to this item.
                 * eg:
                 *
                 *      'run -p 8000 -v $(pwd):/var/www --before task1 task2
                 *
                 * -> task1 & task2 are values of --before & not program inputs
                 */
                return flag;
            }
            /**
             * Outgoing array is the sliced subsection,
             * eg:
             *     [ '--before', 'task2', 'task3' ]
             */
            const outgoing = flag.slice(0, slicePoint);

            /**
             * A final check if the first item was a setter (ie, it contained an equals = sign).
             * If so, we only want that item and again shove the other items into the input
             * eg:
             *
             *   [ '--beep=boop', 'task1', 'task2' ]
             *
             * -> task1 & task2 go to the input and --beep=boop used separately
             */
            if (hasSetter(outgoing[0])) {
                input = input.concat(outgoing.slice(1));
                return [outgoing[0]];
            }

            /**
             * Standard use-case when we reach here, like
             * [ '-p' ]
             * [ '--before', 'task2', 'task3' ]
             * [ '-pc', 'another' ]
             * etc
             */
            return flag.slice(0, slicePoint);
        })
        /**
         * If a single item made it through with a setter, split on the equals
         *
         * eg:
         *      ['--boop=boop']
         *
         * ->
         *      ['--boop', 'boop']
         */
        .map(function splitSetters(item) {
            if (item.length === 1) {
                return item[0].split(/=/);
            }
            return item;
        })
        /**
         * If multiple-single-booleans were given, treat at individual
         *
         * eg:
         *      ['-abc']
         * ->
         *      ['-a', '-b', '-c']
         */
        .reduce(function normalizeFormat(acc, item) {
            if (item.length === 1) {

                // Double flag
                if (item[0].slice(0, 2) === '--') {
                    return acc.concat([item]);
                }

                //Single flag
                const current = item[0].slice(1);
                return acc.concat(current.split('').map(x => [`-${x}`]));
            }

            /**
             * If -- encountered at the end, push items onto input
             */
            if (item[0] === '--') {
                input = input.concat(item.slice(1));
                return acc;
            }
            return acc.concat([item]);
        }, [])
        /**
         * Now create an object for each option.
         * This is done to allow merging of objects separately later.
         * If we created a single obj here now, it would mean having to handle the merge.
         * Each object has a single property (the name) and a collection of values.
         *
         *  eg: 'crossbow run -p 8000 -v --before task-1 task-3 -d'
         *
         * ->
         *   [
         *      {
         *          p: [ '8000' ]
         *      },
         *      {
         *          v: []
         *      },
         *      {
         *          before: ['task-1', 'task-3']
         *      },
         *      {
         *          d: []
         *      }
         *   ]
         */
        .map(function createObject(x) {
            return [propName(x[0]), ...x.slice(1)];
        });

    return {
        command,
        input: input,
        rawFlags: flags,
        flagValues: resolveValues(flags, opts),
        flags: {}
    }
}

function resolveValues(flags, opts) {

    const keys = Object.keys(opts);

    /**
     * Create a matching object as given options, but with
     * 'values' array
     */
    const output = keys.reduce(function (obj, key) {
    	obj[key] = _.assign({}, opts[key], {values: []});
        return obj;
    }, {});

    function addValuesToKey(key:string, values: any[]) {
        const current = output[key];

        // add 'true' where there's no value
        const valuesToAdd = (function () {
            if (values.length === 0) return [true];
            return values;
        })();

        // new
        if (current === undefined) {
            output[key] = {values: valuesToAdd};
            return;
        }
        // existing
        current.values.push.apply(current.values, valuesToAdd);
    }

    flags.forEach(function (flag) {
        const key = flag[0];
        const match = opts[key];

        // key === p
        const aliasMatch = keys.filter(x => opts[x].alias === key);
        const keyToAdd = (function () {
        	if (aliasMatch.length) return aliasMatch[0];
            return key;
        })();

        if (flag.length === 1) {
            addValuesToKey(keyToAdd, []);
            return;
        }

        // Here the current flag was not specified
        // in the options, so just add it
        addValuesToKey(keyToAdd, flag.slice(1));
    });

    return output;
}

function isFlag (incoming: string): boolean {
    return incoming.slice(0, 2) === '--' || incoming[0] === '-';
}

// With thanks to yargs parser
function tokenize (argString: any): string[] {
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

function firstFlagPos (items: string[]): number {
    let i = -1;
    items.some((x, index) => {
        if (isFlag(x)) {
            i = index;
            return true;
        }
    });
    return i;
}

function hasSetter (incoming:string): boolean {
    let equals = incoming.indexOf('=');
    if (equals === -1) return false;
    if (incoming.length > equals + 1) return true;
    return false;
}

function propName (incoming) {
    return incoming.replace(/^--?/, '');
}
