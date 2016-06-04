
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}

var express = require('express');
var app = express();

var pg = require('pg');
console.log('Attempting to connect to db...');
pg.connect(process.env.DB_URI, function(err, client, done) {
  console.assert(!err, "Failed to generate pg client pool!");
});


var apiRouter = require('./api_routes').apiRouter;

app.set('port', (process.env.LISTEN_PORT || 5000));

app.get('/', function(req, resp, next) {
  resp.json({body: 'hello, world!'});
});

app.use('/api', apiRouter);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
