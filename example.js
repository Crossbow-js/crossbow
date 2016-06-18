// console.log(process.argv);
const sliced = process.argv.slice(2);
const command = sliced[0];
const args = sliced.slice(1);

const isFlag = (incoming) => incoming.slice(0, 2) === '--' || incoming[0] === '-';

const flags = args.reduce((acc, item, i) => {
    if (isFlag(item)) {
        return acc.concat([args.slice(i)]);
    }
    return acc;
}, [])
    .map(function (flag) {
        const slicePoint = flag.slice(1)
            .reduce(function (acc, item, i) {
                if (acc === -1) {
                    // not set
                    if (isFlag(item)) return i + 1;
                }
                return acc;
            }, -1);
        if (slicePoint === -1) {
            return flag;
        }
        return flag.slice(0, slicePoint);
    });

console.log(flags);


// const doubleflags = args.filter(x => x.slice(0, 2) === '--');
// const singleFlags = args.filter(x => x.slice(0, 2) === '--');
// console.log('doubleflags', doubleflags);
