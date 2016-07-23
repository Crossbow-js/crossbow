const s = require('fs').readFileSync('text.txt', 'utf8');
const split = s.split(/\n/g);
const begins = /^[ \t]+\{\{|^\{\{/;
const ends = /}}[ \t]+$|}}$/;
const noEmitIndexes = []; // lines that should never emit anything other that tags

const marked = split.forEach((x, i) => {
    if (begins.test(x) && ends.test(x)) {
        noEmitIndexes.push(i);
    }
});

var len = s.length;
var count = 0;
var c;

var TEXT = 0,
    OPEN1 = 1,
    OPEN2 = 2,
    INSIDE_NAME = 3,
    INSIDE_PARAM = 3.1
    INSIDE_PARAM_LEFT  = 3.2,
    INSIDE_PARAM_EQUAL = 3.3,
    INSIDE_PARAM_RIGHT = 3.4,
    INSIDE_QUOTE_PARAM = 3.5,
    CLOSE1 = 4,
    CLOSE2 = 5;

var line = 0;
var col = 0;
var pos       = 0;
var state     = 0;
var emit      = true;
var stack     = [];
var buffer    = '';
var tagBuffer = '';
var STATE = TEXT;
var inTag = false;

while (pos < len) {
    c    = s.charAt(pos);
    emit = !isTagOnlyLine(line);
    
    // debug
    // if (emit) {
    //     console.log('emit', pos, line, [c]);
    // } else {
    //     console.log('no emit', pos, line, [c]);
    // }

    switch (STATE) {
        case OPEN1 :
            if (c === '{') {
                STATE = INSIDE_NAME;
                buffer = ''; // empty the text bufffer
            }
            break;
        case TEXT : 
            if (c === "{") {
                STATE = OPEN1;
                stack.push({type: 'text', content: buffer});
                buffer = "";
            } else {
                if (emit) {
                    buffer += c;
                }
            }
            break;
        case INSIDE_NAME :
            if (c === ' ') {
                stack.push({type: 'tag-name', content: tagBuffer});
                tagBuffer = '';
                STATE = INSIDE_TEXT;
            } else {
                tagBuffer += c;
            }
            break;
        case INSIDE_TEXT:
            if (c === '=') {
                stack.push({type: 'param-name', content: tagBuffer});
                tagBuffer = '';
                if (s.charAt(c+1) === '"') {
                    STATE = INSIDE_QUOTE_PARAM
                } else {
                    STATE = INSIDE_PARAM;
                }
            } else {
                if (c === "}") {
                    STATE = CLOSE1;
                }
            }
            break;
        case INSIDE_PARAM:

            break;
        case INSIDE_QUOTE_PARAM:
            if (c === '"') {
                stack.push({type: 'quote-param', content: tagBuffer});
            } else {
                tagBuffer += c;
            }
            break;
        case CLOSE1 :
            if (c === "}") {
                STATE = TEXT;
                stack.push({type: 'tag', content: tagBuffer});
                tagBuffer = '';
            }
    }

    // if (isWs(c) && emit) {
    //     buffer += c;
    // }

    if (isNewline(c)) {
        line++;
    }

    pos++;
}

if (buffer !== '') {
    stack.push({type: 'text', content: buffer});
}

console.log(stack);
console.log(stack.filter(x => x.type === 'text').map(x => x.content).join(''));

function isNewline (c) {
    return /\n/.test(c);
}

function isTagOnlyLine(line) {
    return noEmitIndexes.indexOf(line) > -1;
}

function isWs(char) {
    return char === ' ' || char === '\t';
}
// const output = marked.map(function (item) {
//
// });
// const joined =

/*
<ul>
    <li>{{this.name}}</li>
</ul>
 */