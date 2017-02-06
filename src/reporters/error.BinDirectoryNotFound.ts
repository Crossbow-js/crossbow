import {BinDirectoryLookup} from "../reporter.resolve";
module.exports = function (error: {type: string}, other: BinDirectoryLookup, shane) {
    return `{red:-} {bold:Description}: {yellow.bold:${other.input}} was not found

  You tried to use the {yellow:bin} option, but the directory you provided 
  {underline:does not exist}! Did you make a typo?
  
  {red:Your input:}    {yellow:${other.input}}
  {red:Resolved Path:} {yellow:${other.resolved}}
`;
};