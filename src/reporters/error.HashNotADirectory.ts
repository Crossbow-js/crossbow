import {HashDirError} from "../file.utils";

module.exports = (error: HashDirError) => {
    return `{red:-} {bold:Description}: {yellow.bold:${error.path}} is not something that can be hashed`;
};
