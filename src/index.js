require('dotenv').config();

var express = require('express');
var app = express();

var mongoose = require('mongoose');
console.log('Connecting to db: ' + process.env.DB_HOST);
mongoose.connect(process.env.DB_HOST);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {

  var apiRouter = require('./api_routes').apiRouter;

  app.set('port', (process.env.PORT || 5000));

  app.get('/', function(req, resp, next) {
    resp.json({body: 'hello, world!'});
  });

  app.use('/api', apiRouter);

  app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });
});