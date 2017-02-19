import {EnvFile} from "../config";
import {__e} from "../task.utils";
module.exports = function (error: {type: string}, envFile: EnvFile) {
    return `{red:-} {bold:Description}: JSON could not be parsed!
    
    You tried to use the {yellow:envFile} option with a JSON file, 
    but the file could not be parsed.

    {yellow.bold:File:} ${envFile.file.rawInput}
    {yellow.bold:Error:}

    {red:${__e(error.error.message)}}
`;
};