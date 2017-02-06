import {BinDirectoryLookup} from "../reporter.resolve";
module.exports = function (error: {type: string}, other: BinDirectoryLookup, shane) {
    return `{red:-} {bold:Description}: {yellow.bold:${other.input}} is not a directory

  You tried to use the {yellow:bin} option, but the path you provided 
  {underline:is not a directory}! Did you make a typo?
  
  {red:Your input:}    {yellow:${other.input}}
  {red:Resolved Path:} {yellow:${other.resolved}}
`;
};