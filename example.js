const Right = (x) => ({
    chain: f => f(x),
    map: f => Right(f(x)),
    fold: (f, g) => g(x),
    inspect: () => `Right(${x})`
});

const Left = (x) => ({
    chain: f => Left(x),
    map: f => Left(x),
    fold: (f, g) => f(x),
    inspect: () => `Left(${x})`
});

const tryCatch = f => {
    try {
        return Right(f())
    } catch(e) {
        return Left(e)
    }
};

const fs   = require('fs');
const yaml = require('js-yaml');

const parseYaml = string =>
    tryCatch(() => yaml.safeLoad(string))
        .fold(e => Left({type: 'YAML_ERROR', error: e}),
              x => Right(x));

const readFromDisk = path =>
    tryCatch(() => fs.readFileSync(path))
        .fold(e => Left({type: 'FS_ERROR', errors: [e]}),
              x => Right(x));

const createResults = obj =>
    ({errors: [], inputs: [obj]});

const errors = error =>
    ({errors: [error], inputs: []});

const readYaml = path =>
    readFromDisk(path)
        .chain(x => parseYaml(x))
        .map(x => createResults(x))
        .fold(e => errors(e), x => x);

console.log(readYaml('crosssbow.yaml'));
console.log(readYaml('crossbow.yaml'));
console.log(readYaml('error.yaml'));