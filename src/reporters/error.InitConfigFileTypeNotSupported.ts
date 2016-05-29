import {InitConfigFileTypeNotSupported} from "../command.init";

module.exports = (error: InitConfigFileTypeNotSupported, task) =>
    `{red:-} {bold:Description}: type {cyan:'${error.providedType}'} is not currently supported.
    
  Supported types:
  
      {bold:yaml}  ->  crossbow.yaml
        {bold:js}  ->  crossbow.js
      {bold:json}  ->  crossbow.json
    {bold:cbfile}  ->  cbfile.js
    
  Usage examples:
  
    $ crossbow init {bold:--type yaml}
    $ crossbow init {bold:--type js}
    $ crossbow init {bold:--type json}
    $ crossbow init {bold:--type cbfile}
`;
