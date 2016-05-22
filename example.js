var dtect = require('./p');

var globa = dtect(`
module.exports = function () {
    console.log('Kittie');
}

exports = [function(){}];
`);


function getTopLevel (nodes) {
    return nodes.filter(x => {
        return x.name === 'exports' || x.name === 'module';
    })
}

const top = getTopLevel(globa);

function getModuleDotExports (nodes) {
    return nodes.filter(x => {
        if (x.name !== 'module') return false;
        return x.nodes[0].parents.filter(function (node) {
            return node.type === 'AssignmentExpression';
        }).length;
    });
}


console.log(getModuleDotExports(top));


// console.log(globa[1].nodes[0].parents);
