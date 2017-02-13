const crypto = require('crypto'),
      jwt = require('jsonwebtoken'),
      responses = require('./responses');

var pg;

const SALT_SIZE = 16,
      HASH_SIZE = 64,
      HASH_ITTRS = 10000,
      TOKEN_PAYLOAD_SIZE = 8,
      TOKEN_SECRET_SIZE = 16;

function randomBytes(size) {
  return new Promise( (resolve, reject) => {
    crypto.randomBytes(size, (err, buf) => {
      if(err) {
        reject(err);
      } else {
        resolve(buf.toString('hex'));
      }
    });
  });
}

exports.generateSalt = function() {
  return new Promise( (resolve, reject) => {
    randomBytes(SALT_SIZE).then( (bytes) => resolve(bytes), (err) => reject(err) );
  });
};

exports.generatePasswordHash = function(raw, salt) {
  return new Promise( (resolve, reject) => {
    crypto.pbkdf2(raw, salt, HASH_ITTRS, HASH_SIZE, 'sha512', (err, key) => {
      resolve(key.toString('hex'));
    });
  });
};

function generateAuthToken() {
  return new Promise( (resolve, reject) => {
    Promise.all([ randomBytes(TOKEN_PAYLOAD_SIZE), randomBytes(TOKEN_SECRET_SIZE)]).then(
      (values) => {
        let [payload, secret] = values,
            token = jwt.sign({ data: payload }, secret);

        resolve({token, secret});
      },
      (err) => {
        reject(responses.internalError(err));
      }
    );
  });
}

exports.newAuthToken = function(userId) {
  return new Promise( (resolve, reject) => {
    generateAuthToken().then(
      (tokenInfo) => {
        pg.pool().connect((err, client, done) => {
          client.query('INSERT INTO auth_tokens VALUES (DEFAULT, $1, $2, $3, $4)', [
              userId,
              tokenInfo.token,
              tokenInfo.secret,
              (new Date(Date.now())).toISOString()
            ],
            (err, res) => {
              if(err) {
                reject(responses.internalError(err));
              } else {
                resolve(tokenInfo.token);
              }
            }
          );
        });
      },
      (err) => {
        reject(responses.internalError(err));
      }
    );
  });
};

exports.deleteAuthToken = function(client, tokenText) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      client.query('DELETE FROM auth_tokens WHERE token = $1', [tokenText], (err, res) => {
        done();
        if (err) {
          reject(responses.internalError(err));
        } else if (res.rowCount === 0) {
          reject(responses.badRequest("Given logout token is not valid"));
        } else if (res.rowCount > 1) {
          reject(responses.internalError("Duplicate matching tokens in logout"));
        } else {
          resolve();
        }
      });
    });
  });
};

exports.validateAuthToken = function(client, token) {
  return new Promise((resolve, reject) => {
    client.query('SELECT * FROM auth_tokens WHERE token = $1', [token], (err, res) => {
      if (err) {
        reject(responses.internalError(err));
      } else if (res.rowCount === 0) {
        reject(responses.unauthorized());
      } else if (res.rowCount > 1) {
        reject(responses.internalError("Multiple matching auth tokens!"));
      } else {
        resolve(res.rows[0].user_id);
      }
    });
  });
};

exports.init = function(_pg) {
  pg = _pg;
};
