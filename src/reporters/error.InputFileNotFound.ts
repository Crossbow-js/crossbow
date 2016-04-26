import {ExternalFileInput, InputFileNotFoundError} from "../task.utils";

module.exports = (error: InputFileNotFoundError, input: ExternalFileInput) => {
    return `{red:-} {bold:Description}: {cyan:'${input.resolved}'} not found.
  Did you make a {bold:typo?}`;
};
