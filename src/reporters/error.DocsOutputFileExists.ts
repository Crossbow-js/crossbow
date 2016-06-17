import {DocsOutputFileExistsError} from "../command.docs";

module.exports = (error: DocsOutputFileExistsError) => {
    return `{red:-} {bold:Description}: {cyan:'${error.file.resolved}'} already exists!
  When you use the {yellow:--output} flag, Crossbow tries to {bold.underline:create a new file}
  with {bold:just} your documentation in it, but {cyan:${error.file.relative}} already 
  exists in this directory. 
  
  Perhaps you wanted the {yellow:--file} flag instead?`
};
