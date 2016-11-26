exports.up = function(pgm) {
  let sql = `CREATE TABLE feeds (
    id SERIAL PRIMARY KEY,
    user_id char(8) REFERENCES users ON DELETE CASCADE,
    name char(32) NOT NULL
  );

  CREATE UNIQUE INDEX user_id_name_idx ON feeds (user_id, name);
  CREATE INDEX feed_user_id_idx ON feeds (user_id);`;


  pgm.sql(sql);
};

exports.down = function(pgm) {
   let sql = `DROP INDEX user_id_name_idx; DROP INDEX feed_user_id_idx; DROP TABLE feeds;`;
   pgm.sql(sql);
};
