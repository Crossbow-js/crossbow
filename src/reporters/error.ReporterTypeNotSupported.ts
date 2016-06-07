import {ReporterTypeNotSupportedError} from "../reporter.resolve";

module.exports = (error: ReporterTypeNotSupportedError) => {
    return `{red:-} {bold:Description}: 
    
  You tried to use a custom reporter, but Crossbow only supports the following types:
  
  - {yellow:function} when using the api, you can pass a function directly
  - {yellow:string} file paths to external modules
   
  eg: 
  
     $ crossbow run my-task {bold:--reporters myreporter.js}
    
   where {bold:myreporter.js} contains:
    
     {yellow:module.exports = function() {...\\}}
  `;
};
