const Right = (x) => ({
    chain: f => f(x),
    map: f => Right(f(x)),
    fold: (f, g) => g(x),
    do: f => {
        f();
        return Right(x)
    },
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
const parse   = require('path').parse;
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

const errors = (error, path) =>
    ({errors: [error], inputs: [], userInput: path});

const parsePath = (path) => Right(parse(path));

const readYaml = path =>
    parsePath(path)
        .do(x => console.log(x))
        .map(parsed => readFromDisk(parsed))
        .chain(x => parseYaml(x))
        .map(x => createResults(x))
        .fold(e => errors(e, path), x => x);

console.log(readYaml('crosssbow.yaml'));
console.log(readYaml('crossbow.yaml'));
console.log(readYaml('error.yaml'));