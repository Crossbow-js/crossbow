import {EnvFile} from "../config";
module.exports = function (error: {type: string}, envFile: EnvFile) {
    return `{red:-} {bold:Description}: {yellow.bold:${envFile.input}} was not found

  You tried to use the {yellow:envFile} option, but the path you provided 
  {underline:does not exist}! Did you make a typo?
  
  {red:Your input:}    {yellow:${envFile.input}}
  {red:Resolved Path:} {yellow:${envFile.file.resolved}}
`;
};