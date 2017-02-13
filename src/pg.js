const pg = require('pg');

const responses = require('./responses');

var PG_POOL;

exports.init = function(config) {
  PG_POOL = new pg.Pool(config);

  PG_POOL.on('error', (err, client) => {
    console.error('idle client error', err.message, err.stack);
  });

  // PG_POOL.on('connect', (client) => {
  //   console.log("connect");
  // });
};

exports.pool = function() {
  return PG_POOL;
};
