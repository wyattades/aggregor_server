exports.up = function(pgm) {
  // let sql = `CREATE TABLE entries (
  //   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  //   plugin_id uuid REFERENCES plugins ON DELETE CASCADE,
  //   data jsonb
  // );

  // CREATE INDEX entry_plugin_id_idx ON entries (plugin_id);`;

  // pgm.sql(sql);
};

exports.down = function(pgm) {
  // let sql = `DROP INDEX entry_plugin_id_idx;
  //   DROP TABLE entries;`;

  // pgm.sql(sql);
};
