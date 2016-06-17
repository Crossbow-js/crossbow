import {ReporterFileNotFoundError} from "../reporter.resolve";

module.exports = (error: ReporterFileNotFoundError) => {
    return `{red:-} {bold:Description}: {cyan:'${error.file.resolved}'} not found.
  Did you make a {bold:typo?}`;
};
