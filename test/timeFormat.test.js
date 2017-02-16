const timeFormat = require('../src/parse/timeFormat');

const tests = [
    'this happened about 10 seconds ago',
    'a year ago',
    '67 months ago',
    'an hour ago',
    'posted right now',
    'just recently',
    '10/20/2014',
    '1997-07-16T19:20:30.45+01:00'
];

const expected = [

];

tests.forEach((test, index) => {
    timeFormat(test).then((result) => {
        console.log(test + ' -> ' + result);
    }, (err) => {
        console.log(test + ' -> FAILED');
    });
});