var dbm = global.dbm || require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.createTable('users', {
    username: { type: 'string', primaryKey: true },
    full_name: 'string'
  }, callback);
};

exports.down = function(db, callback) {
  callback();
};
