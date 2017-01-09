import {ExternalFileInput} from "../file.utils";
import {__e} from "../task.utils";

// interface IJsonError {
//     mark: {
//         buffer: string
//         position: number
//         line: number
//         column: number
//     }
//     message: string
// }

module.exports = (error) => {

    return `{red:-} {bold:Description}: Could not parse JSON
    
  {yellow.bold:Error:}
  
    {red:${__e(error.error.message)}}
`;
};
