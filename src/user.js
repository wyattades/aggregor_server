const crypto = require('crypto');

// TODO: dont use usernames, make email and password the priority
// TODO: allow logging in with Facebook or Google

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

const respond = (response, data) => {
  const responseData = {
    code: 200,
    msg: "OK",
    data: data
  };

  response.writeHead(200);
  response.write(JSON.stringify(responseData));
  response.end();
};

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
          } else if (res.rowCount === 0) {
            reject(responses.unauthorized("User not found with username: " + username));
          } else if (res.rowCount > 1) {
            reject(responses.internalError("Multiple users with the same username"));
          } else {
            resolve(res.rows[0]);
          }
        });
      }
    });
  });
}

// Return data of the user
exports.getAuthedUser = function(token) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to connect to database"));
      } else {
        validateAuthToken(client, token).then((userId) => {
          client.query('SELECT * FROM users WHERE id = $1', [userId], (err, res) => {
            done();
            if (err) {
              reject(responses.internalError("Failed to validate auth token"));
            } else if (res.rowCount === 0) {
              reject(responses.internalError("User not found for matched token"));
            } else if (res.rowCount > 1) {
              reject(responses.internalError("Multiple users with the same id"));
            } else {
              resolve(res.rows[0]);
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
    generateSalt().then( (salt) => {
      Promise.all([generateId(), generatePasswordHash(data.password, salt)]).then( (vals) => {
        const [id, hash] = vals;

        pg.pool().connect((err, client, done) => {
          if (err) {
            responses.internalError("Failed to connect to database");
          } else {
            client.query('INSERT INTO users VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (username) DO NOTHING', [
                id,
                data.username,
                data.email,
                data.first_name || '',
                data.last_name || '',
                salt,
                hash,
                (new Date(Date.now())).toISOString()
              ],
              (err, res) => {
                done();
                if (err) {
                  reject(responses.internalError(err));
                } else if (res.rowCount === 0) {
                  reject(responses.conflict('This username is already taken'));
                } else if (res.rowCount > 1) {
                  reject(responses.internalError('Duplicate matching usernames'));
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
  });
};

// TODO: this function and many others open more than one pg.pool.connect
exports.loginUser = function(data) {
  return new Promise( (resolve, reject) => {
    getUserByUsername(data.username).then( (user) => {
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

exports.fetchUser = (userData, response) => {
  respond(response, {
    email: userData.email,
    username: userData.username,
    created_on: userData.created_on,
    first_name: userData.first_name,
    last_name: userData.last_name,
  });
  return Promise.resolve({ handled: true });
};

exports.updateUser = (userData, data) => new Promise((resolve, reject) => {
  const newData = Object.assign({}, userData, data);

  generateSalt()
  .then(salt => generatePasswordHash(newData.password, salt)
  .then(hash => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to connect to database"));
      } else {

        client.query('UPDATE users SET username=$1,email=$2,first_name=$3,last_name=$4,password_salt=$5,password_hash=$6 WHERE id = $7', [
          newData.username,
          newData.email,
          newData.first_name,
          newData.last_name,
          salt,
          hash,
          userData.id,
        ], (err, res) => {
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
      }
    });
  }));
});

//NOTE: require username and password?
exports.deleteUser = function(authInfo, data) {
  return new Promise((resolve, reject) => {
    const { password_salt, password_hash, id } = authInfo.user;

    generatePasswordHash(data.password, password_salt).then((hash) => {
      if(crypto.timingSafeEqual(Buffer.from(password_hash), Buffer.from(hash))) {
        pg.pool().connect((err, client, done) => {
          if (err) {
            reject(responses.internalError("Failed to connect to database"));
          } else {
            deleteAuthToken(client, authInfo.token).then(() => {
              client.query('DELETE FROM users WHERE id = $1', [id], (err, res) => {
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
  });
};

exports.init = function(_pg) {
  pg = _pg;
};
