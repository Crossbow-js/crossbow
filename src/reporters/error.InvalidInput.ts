import {ExternalFileInput} from "../file.utils";
import {InputErrorTypes} from "../task.utils";

module.exports = (error: {error: Error, type: InputErrorTypes}, input: ExternalFileInput) => {
    const toStrip = input.resolved.replace(input.relative, "");
    return `{red:-} {bold:Description}: Could not parse this input
    
    
    {yellow.bold:File:}    {cyan:${input.relative}}
    {yellow.bold:Error:}
  
      ${error.error.toString().replace(toStrip, "")}
`;
};
