import {FileTypeNotSupportedError} from "../task.errors";

module.exports = (error: FileTypeNotSupportedError, task) =>
    `{red:-} {bold:Description}: {cyan:'${error.externalFile.relative}'} Not Supported
  Crossbow does not {bold:currently} support files with the extension {yellow.bold:${error.externalFile.parsed.ext}}
  So running {yellow:${task.rawInput}} will not work I'm afraid :(
  If you would like support for this file type added, please contact us`;
