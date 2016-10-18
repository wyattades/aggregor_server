const exec = require('child_process').exec;

const DB_URI = require('../config').DB_URI,
      NAME = process.argv[2];

exec(`DATABASE_URL=${DB_URI} ./node_modules/.bin/pg-migrate create ${NAME}`, (err, stdout, stderr) => {
  if(err) {
    console.log("Failed to create migration!");
    console.log(stderr);
  } else {
    console.log(stdout);
  }
});
