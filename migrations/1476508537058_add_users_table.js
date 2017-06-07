exports.up = function(pgm) {
  let sql = `CREATE TABLE users (
    id char(8) PRIMARY KEY,
    username varchar(32) UNIQUE NOT NULL,
    email varchar(50),
    first_name varchar(32) NOT NULL,
    last_name varchar(32) NOT NULL,
    password_salt char(32) NOT NULL,
    password_hash char(128) NOT NULL
  );`;

  pgm.sql(sql);
};

exports.down = function(pgm) {
  let sql = `DROP TABLE users;`;

  pgm.sql(sql);
};
