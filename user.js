const crypto = require('crypto');

const responses = require('./responses');
var pg;

const SALT_SIZE = 16,
      HASH_SIZE = 64,
      HASH_ITTRS = 10000;

// 4 bytes in hex is 8 chars
const ID_SIZE = 4;

var USERS = [];

function generateSalt() {
  return new Promise( (resolve, reject) => {
    crypto.randomBytes(SALT_SIZE, (err, buf) => {
      resolve(buf.toString('hex'));
    });
  });
}

function generatePasswordHash(raw, salt) {
  return new Promise( (resolve, reject) => {
    crypto.pbkdf2(raw, salt, HASH_ITTRS, HASH_SIZE, 'sha512', (err, key) => {
      resolve(key.toString('hex'));
    });
  });
}

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
              validate(id, client, done);
            }
          });
        } else {
          validate(id, client, done);
        }
      });
    }

    function validate(id, client, done) {
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
    let user = USERS.find((user) => user.username === username);
    if(!user) {
      reject(responses.badRequest("User not found with username: " + username));
    } else {
      resolve(user);
    }
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
          const id = vals[0],
                hash = vals[1];

          USERS.push({
            id,
            username: userInfo.username.toLowerCase(),
            email: userInfo.email || '',
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            password_salt: salt,
            password_hash: hash
          });
          resolve({data: USERS[USERS.length - 1]});
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
          let authed = crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(hash));
          resolve({data: authed});
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
