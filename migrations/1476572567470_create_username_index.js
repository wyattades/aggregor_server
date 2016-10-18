exports.up = function(pgm) {
  let sql =`
    CREATE INDEX username_idx ON users ((lower(username)));
  `;
  pgm.sql(sql);
};

exports.down = function(pgm) {
  let sql =`
    DROP INDEX username_idx;
  `;
  pgm.sql(sql);
};
