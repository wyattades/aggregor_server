const crypto = require('crypto');

const {
  generateSalt,
  generatePasswordHash,
  newAuthToken
} = require('./auth');
const responses = require('./responses');

// 4 bytes in hex is 8 chars
const ID_SIZE = 4;

var pg;

function generateId() {
  return new Promise( (resolve, reject) => {
    var client = undefined,
        done = undefined;

    function generate() {
      crypto.randomBytes(ID_SIZE, (err, buf) => {
        let id = buf.toString('hex');
        if(!client) {
          pg.pool().connect((err, _client, _done) => {
            if(err) {
              reject("Internal server error: failed to fetch DB client");
              _done();
              return;
            } else {
              client = _client;
              done = _done;
              validate(id);
            }
          });
        } else {
          validate(id);
        }
      });
    }

    function validate(id) {
      client.query('SELECT id FROM users WHERE id = $1::text', [id], (err, res) => {
        if(!res.rows.length) {
          resolve(id);
          done();
        } else {
          generate();
        }
      });
    }

    generate();
  });
}

function getUserByUsername(username) {
  return new Promise( (resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      client.query('SELECT * FROM users WHERE username = $1::text', [username], (err, res) => {
        done();
        if(err) {
          reject(responses.internalError(err));
        } else {
          const user = res.rows.length ? res.rows[0] : undefined;
          if(!user) {
            reject(responses.badRequest("User not found with username: " + username));
          } else {
            resolve(user);
          }
        }
      });
    });
  });
}

exports.newUser = function(data) {
  return new Promise( (resolve, reject) => {
    var userInfo;
    try {
      userInfo = JSON.parse(data);
    } catch(e) {
      reject(responses.badRequest('Invalid JSON in request'));
    }

    if(userInfo) {
      const requiredInfo = ['last_name', 'first_name', 'username', 'password'],
            keys = Reflect.ownKeys(userInfo);
      var missing;
      requiredInfo.forEach((i) => {
        if(!keys.includes(i) && !requiredInfo[i].length)
          missing = i;
      });

      if(missing) {
        reject(responses.badRequest(`Missing required value ${missing}`));
        return;
      }

      generateSalt().then( (salt) => {
        Promise.all([generateId(), generatePasswordHash(userInfo.password, salt)]).then( (vals) => {
          const [id, hash] = vals;

          pg.pool().connect((err, client, done) => {
            client.query('INSERT INTO users VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [
                id,
                userInfo.username,
                userInfo.email || '',
                userInfo.first_name,
                userInfo.last_name,
                salt,
                hash,
                (new Date(Date.now())).toISOString()
              ],
              (err, res) => {
                done();
                if(err) {
                  reject(responses.internalError(err));
                } else {
                  newAuthToken(id).then(
                    (token) => resolve({data: token}),
                    (err) => reject(responses.internalError(err))
                  );
                }
              }
            );
          });
        });
      });
    }
  });
}

exports.loginUser = function(data) {
  return new Promise( (resolve, reject) => {
    let loginData;
    try {
      loginData = JSON.parse(data);
    } catch(err) {
      reject(responses.badRequest("Bad input data for login"));
    }

    if(loginData) {
      const username = loginData.username;
      getUserByUsername(username).then( (user) => {
        const passwordHash = user.password_hash,
              passwordSalt = user.password_salt,
              submittedPassword = loginData.password;

        generatePasswordHash(submittedPassword, passwordSalt).then( (hash) => {
          if(crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(hash))) {
            newAuthToken(user.id).then(
              (token) => resolve({data: token}),
              (err) => reject(responses.internalError(err))
            );
          } else {
            reject(responses.unauthorized("Bad login information"));
          }
        });
      }, (err) => {
        reject(err);
      });
    }
  });
}

exports.init = function(_pg) {
  pg = _pg;
}
