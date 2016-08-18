import {HashDirError} from "../file.utils";

module.exports = (error: HashDirError) => {
    return `{red:-} {bold:Description}: {yellow.bold:${error.path}} could not be found`;
};
