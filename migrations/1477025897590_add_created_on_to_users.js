exports.up = function(pgm) {
  let sql = `
    ALTER TABLE users ADD COLUMN created_on timestamp;
  `;
  pgm.sql(sql);
};

exports.down = function(pgm) {
  let sql = `
    ALTER TABLE users DROP COLUMN created_on;
  `;
  pgm.sql(sql);
};
