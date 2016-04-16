var express = require('express');
var app = express();
var uuid = require('node-uuid');
var mongoose = require('mongoose');

app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
  res.status(200).json({text: 'hello, world!'});
});

// Add validation that the logged in user can view the content
// app.use(function() {
   
// });

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


var Schema = mongoose.schema;
mongoose.connect('mongodb://heroku_nhh85smw:qied5ud6mac0hfvatgkbpk4l2m@ds011241.mlab.com:11241/heroku_nhh85smw');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

var userSchema = Schema({
  name:  String,
  id: String
});
var User = mongoose.model('User', userSchema);

//TEMP:

var testUser = new User({ name: 'FooBarMcGee', id: 'Poo' });
console.log(testUser.name);


