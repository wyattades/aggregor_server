const exec = require('child_process').exec;

const DB_URI = require('../config').DB_URI;

exec(`export DATABASE_URL=${DB_URI} && ./node_modules/.bin/pg-migrate up`, (err, stdout, stderr) => {
  if(err) {
    console.log("Failed to run migrations!");
    console.log(stderr);
    console.log(stdout);
  } else {
    console.log(stdout);
  }
});
