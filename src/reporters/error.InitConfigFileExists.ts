import {InitConfigFileExistsError} from "../command.init";

module.exports = (error: InitConfigFileExistsError, task) =>
    `{red:-} {bold:Description}: {cyan:'${error.file.parsed.base}'} already exists in this directory!
    
  Overwriting existing files is not {bold:currently} supported, 
  but can use the {yellow.bold:--type} flag to generate a different
  type of configuration file if you need to.
  
  examples:
  
    $ crossbow init {bold:--type js}
    $ crossbow init {bold:--type json}
    $ crossbow init {bold:--type cbfile}
    $ crossbow init {bold:--type yaml}
`;
