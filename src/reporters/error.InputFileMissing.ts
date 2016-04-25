import {ExternalFileInput, InputFileMissingError} from "../task.utils";

module.exports = (error: InputFileMissingError, input: ExternalFileInput) => {
    return `{red:-} {bold:Description}: {cyan:'${input.resolved}'} not found.
  Did you make a {bold:typo?}`;
};
