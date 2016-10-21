const crypto = require('crypto'),
      jwt = require('jsonwebtoken');

var pg;

const SALT_SIZE = 16,
      HASH_SIZE = 64,
      HASH_ITTRS = 10000;

exports.generateSalt = function() {
  return new Promise( (resolve, reject) => {
    crypto.randomBytes(SALT_SIZE, (err, buf) => {
      resolve(buf.toString('hex'));
    });
  });
}

exports.generatePasswordHash = function(raw, salt) {
  return new Promise( (resolve, reject) => {
    crypto.pbkdf2(raw, salt, HASH_ITTRS, HASH_SIZE, 'sha512', (err, key) => {
      resolve(key.toString('hex'));
    });
  });
}

exports.generateAuthToken = function() {
  return new Promise( (resolve, reject) => {
    
  });
}
