exports.up = function(pgm) {
  let sql = `CREATE TABLE plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id integer REFERENCES feeds ON DELETE CASCADE,
    type varchar(64) NOT NULL,
    priority real DEFAULT 0.5::real,
    data jsonb NOT NULL,
    last_entry jsonb DEFAULT '{}'
  );

  CREATE INDEX plugin_feed_id_idx ON plugins (feed_id);`;

  pgm.sql(sql);
};

exports.down = function(pgm) {
  let sql = `DROP INDEX plugin_feed_id_idx; 
    DROP TABLE plugins;`;

  pgm.sql(sql);
};
