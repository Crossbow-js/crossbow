//"use strict";
//var inquirer = require("inquirer");
//
//var choices = Array.apply(0, new Array(26)).map(function(x,y) {
//    return String.fromCharCode(y + 65);
//});
//choices.push("Multiline option \n  super cool feature");
//choices.push({
//    name: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium.",
//    value: "foo",
//    short: "The long option"
//});
//
//inquirer.prompt([
//    {
//        type      : "list",
//        name      : "letter",
//        message   : "What's your favorite letter?",
//        paginated : true,
//        choices   : choices
//    },
//    {
//        type      : "checkbox",
//        name      : "name",
//        message   : "Select the letter contained in your name:",
//        paginated : true,
//        choices   : choices
//    }
//], function( answers ) {
//    console.log( JSON.stringify(answers, null, "  ") );
//});


/**
 * Checkbox list examples
 */

"use strict";
var inquirer = require("inquirer");

const taskSelect = {
    type: "checkbox",
    message: "Select Tasks to run (space bar to select, enter to finish)",
    name: "tasks",
    choices: [
        new inquirer.Separator("From Npm scripts"),
        {
            name: "lint"
        },
        {
            name: "test"
        },
        {
            name: "mocha test"
        },
        new inquirer.Separator("From crossbow.yaml config"),
        {
            name: "Mozzarella"
        },
        {
            name: "Cheddar"
        },
        {
            name: "Parmesan"
        }
    ],
    validate: function( answer ) {
        if ( answer.length < 1 ) {
            return "You must choose at least one topping.";
        }
        return true;
    }
};

"use strict";

var inquirer = require("inquirer");

inquirer.prompt(taskSelect, function( answers ) {

    console.log(answers);

    inquirer.prompt({
        type: "list",
        name: "runMode",
        message: "Would you like to run tasks these in order (series), or let them race (parallel)?",
        choices: [
            {
                key: "y",
                name: "Series (in order)",
                value: "series"
            },
            {
                key: "x",
                name: "Parallel (race)",
                value: "parallel"
            }
        ]
    }, function (answers) {

        console.log(answers);

    });
});
