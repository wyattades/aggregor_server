exports.up = function(pgm) {
  let sql = `CREATE TABLE plugins (
    id SERIAL PRIMARY KEY,
    feed_id integer REFERENCES feeds ON DELETE CASCADE,
    type varchar(64) NOT NULL,
    data jsonb
  );

  CREATE INDEX plugin_feed_id_idx ON plugins (feed_id);`;

  pgm.sql(sql);
};

exports.down = function(pgm) {
  let sql = `DROP INDEX plugin_feed_id_idx; DROP TABLE plugins;`;
  pgm.sql(sql);
};
