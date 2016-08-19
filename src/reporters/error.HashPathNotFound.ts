import {HashDirError} from "../file.utils";

module.exports = (error: HashDirError, cwd: string) => {
    return `{red:-} {bold:Description}: {yellow.bold:${error.path}} could not be found
    
    {bold:CWD:}  {yellow:${cwd}}
    {bold:Path:} {red:${error.path}}
`;
};
