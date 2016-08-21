import {ExternalFileInput} from "../file.utils";

interface IYamlError {
    mark: {
        buffer: string
        position: number
        line: number
        column: number
    }
    message: string
}

module.exports = (error: {error: IYamlError}, input: ExternalFileInput) => {

    return `{red:-} {bold:Description}: Could not parse YAML
    
  {yellow.bold:File:}    {cyan:${input.relative}}
  {yellow.bold:Line:}    {cyan:${error.error.mark.line}}
  {yellow.bold:Column:}  {cyan:${error.error.mark.column}}
  
  {yellow.bold:Error:}
  
    ${error.error.message}
`;
};
