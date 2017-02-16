const embed = require('../src/parse/embed');

const tests = [
    'http://imgur.com/kV318yk'
];

tests.forEach((test) => {
    embed(test).then((result) => {
        console.log(test + ' -> ', result.html);
    }, (err) => {
        console.log(test + ' -> ERROR: ', err);
    });
});