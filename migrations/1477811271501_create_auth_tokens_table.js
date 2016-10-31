exports.up = function(pgm) {
  let sql = `CREATE TABLE auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id char(8) REFERENCES users ON DELETE CASCADE,
    token char(300) NOT NULL,
    secret char(32) NOT NULL,
    generated_on timestamp NOT NULL
  );

  CREATE INDEX auth_tokens_user_id_idx ON auth_tokens (user_id);`;
  pgm.sql(sql);
};

exports.down = function(pgm) {
  let sql = `DROP INDEX auth_tokens_user_id_idx; DROP TABLE auth_tokens;`;
  pgm.sql(sql);
};
