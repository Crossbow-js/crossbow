const input = '(@npm my script) (lint) (unit)';

console.log(input.match(/\(.+?([^\\]\))/g));

//console.log(/(^|[^\\])\)/.test( 'should be true ).' ));        // true
//console.log(/(^|[^\\])\)/.test( 'should be not true \\).' ));  // false
