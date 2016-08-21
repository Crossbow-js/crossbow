import {InputFileNotFoundError} from "../task.utils";
import {ExternalFileInput} from "../file.utils";

module.exports = (error: InputFileNotFoundError, input: ExternalFileInput) => {
    return `{red:-} {bold:Description}: {cyan.bold:${input.parsed.base}} not found, did you make a {bold:typo?}
    
    {yellow:CWD:}   {cyan:${input.resolved.replace(input.relative, '')}}
    {yellow:File:}  {cyan:${input.relative}} {red:x}
`;
};
