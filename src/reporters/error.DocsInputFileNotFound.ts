import {DocsInputFileNotFoundError} from "../command.docs";

module.exports = (error: DocsInputFileNotFoundError) => {
    return `{red:-} {bold:Description}: {cyan:'${error.file.resolved}'} not found.
  When you use the {yellow:--file} flag, Crossbow tries to add documentation to an 
  {bold:existing} file, and in this case {cyan:${error.file.parsed.base}} was not found!
  Did you make a typo?`;
};
