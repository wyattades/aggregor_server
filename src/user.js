const crypto = require('crypto');

const {
  generateSalt,
  generatePasswordHash,
  newAuthToken,
  deleteAuthToken,
  validateAuthToken
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
      if (err) {
        reject(responses.internalError("Failed to connect to database"));
      } else {
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
      }
    });
  });
}

// Return a minimal form of the user
exports.getAuthedUser = function(token) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to connect to database"));
      } else {
        validateAuthToken(client, token).then((userId) => {
          client.query('SELECT id, username, email, first_name, last_name, created_on FROM users WHERE id = $1', [userId], (err, res) => {
            done();
            if (err) {
              reject(responses.internalError("Failed to validate auth token"));
            } else if (res.rowCount === 0) {
              reject(responses.internalError("User not found for matched token"));
            } else if (res.rowCount > 1) {
              reject(responses.internalError("Multiple users with the same id!"));
            } else {
              const user = res.rows[0];
              resolve(user);
            }
          });  
        }, (err) => {
          done();
          reject(err);
        });
      }
    });
  });
};

exports.newUser = function(data) {
  return new Promise( (resolve, reject) => {
    var userInfo;
    try {
      userInfo = JSON.parse(data);
    } catch(e) {
      return reject(responses.badRequest('Invalid JSON in request'));
    }

    if(userInfo) {
      const requiredInfo = {
        'last_name': [10, 32],
        'first_name': [10, 32],
        'username': [1, 32],
        'password': [8, 120],
      },
        keys = Reflect.ownKeys(userInfo),
        requiredKeys = Reflect.ownKeys(requiredInfo);

      var missing = [];
      requiredKeys.forEach((i) => {
        let key = keys.find((k) => k === i);
        if(!key || !userInfo[key].trim().length)
          missing.push(i);
      });

      if(missing.length) {
        return reject(responses.badRequest(`Missing required value${missing.length > 1 ? 's' : ''}: ${missing.join(", ")}`));
      }

      // TODO: finish checking lengths of data
      keys.forEach((k) => {
      });

      generateSalt().then( (salt) => {
        Promise.all([generateId(), generatePasswordHash(userInfo.password, salt)]).then( (vals) => {
          const [id, hash] = vals;

          pg.pool().connect((err, client, done) => {
            if (err) {
              responses.internalError("Failed to connect to database");
            } else {
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
                      (token) => resolve({data: {token}}),
                      (err) => reject(responses.internalError(err))
                    );
                  }
                }
              );
            }
          });
        });
      });
    }
  });
};

// TODO: this function and many others open more than one pg.pool.connect
exports.loginUser = function(data) {
  return new Promise( (resolve, reject) => {

    try {
      data = JSON.parse(data);
    } catch(err) {
      reject(responses.badRequest("Bad input data for login"));
    }

    if(data && data.username && data.password) {
      const username = data.username;
      getUserByUsername(username).then( (user) => {
        const passwordHash = user.password_hash,
              passwordSalt = user.password_salt,
              submittedPassword = data.password;

        generatePasswordHash(submittedPassword, passwordSalt).then( (hash) => {
          if(crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(hash))) {
            newAuthToken(user.id).then(
              (token) => resolve({data: {token}}),
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
};

exports.logoutUser = function(authInfo) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to connect to database"));
      } else {
        deleteAuthToken(client, authInfo.token).then(() => {
          done();
          resolve({data: {}});
        }, (err) => {
          done();
          reject(err);
        });
      }
    });
  });
};

//NOTE: require username and password or just auth token?
exports.deleteUser = function(authInfo, data) {
  return new Promise((resolve, reject) => {

    try {
      data = JSON.parse(data);
    } catch(e) {
      return reject(responses.badRequest("Bad request data in deleting user"));
    }

    if (data && data.username && data.password) {
      const username = data.username;
      getUserByUsername(username).then((user) => {
        const passwordHash = user.password_hash,
              passwordSalt = user.password_salt,
              submittedPassword = data.password;

        generatePasswordHash(submittedPassword, passwordSalt).then((hash) => {
          if(crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(hash))) {
            pg.pool().connect((err, client, done) => {
              if (err) {
                reject(responses.internalError("Failed to connect to database"));
              } else {
                deleteAuthToken(client, authInfo.token).then(() => {
                  client.query('DELETE FROM users WHERE id = $1', [user.id], (err, res) => {
                    done();
                    if (err) {
                      reject(responses.internalError("Failed to connect to database"));
                    } else if (res.rowCount === 0) {
                      reject(responses.badRequest("No user exists with given id"));
                    } else if (res.rowCount > 1) {
                      reject(responses.internalError("Multiple users with the same id"));
                    } else {
                      resolve({data:{}});
                    }
                  });
                }, (err) => {
                  done();
                  reject(err);
                });
              }
            });
          } else {
            reject(responses.unauthorized("Bad login information"));
          }
        });
      }, (err) => {
        reject(err);
      });
    } else {
      reject(responses.badRequest("Invalid request data in deleting user"));
    }
  });
};

exports.init = function(_pg) {
  pg = _pg;
};
