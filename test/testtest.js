'use strict';

exports['awesome'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'no args': function(test) {
    test.expect(1);
    // tests here
    test.equal('awesome', 'awesome', 'should be awesome.');
    test.done();
  },
};