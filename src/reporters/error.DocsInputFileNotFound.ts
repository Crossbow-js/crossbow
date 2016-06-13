import {DocsInputFileNotFoundError} from "../command.docs";

module.exports = (error: DocsInputFileNotFoundError) => {
    return `{red:-} {bold:Description}: {cyan:'${error.file.resolved}'} not found.
  Did you make a {bold:typo?}`;
};
