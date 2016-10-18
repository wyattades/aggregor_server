const pg = require('pg');

const responses = require('./responses');

var PG_POOL;

exports.init = function(config) {
  PG_POOL = new pg.Pool(config);
}

exports.pool = function() {
  return PG_POOL;
}
