var express = require('express');
var apiRouter = express.Router();

apiRouter.use(function(req, resp, next) {
  next(); // Remove this line to enable security!
  
  var token = req.get('X-Auth-Token');
  var username = req.get('X-User-Name');
  if (token && username) {
    //var userCursor = db.users.find({ name: username, auth_token: token})
    //var user = userCursor.hasNext() ? userCursor.next() : null
    //if(user) {
    //  req.user = user
    //  next();  
    //} else {
    //  resp.status(404)
    //}
  }
});

apiRouter.get('/', function(req, res) {
  res.status(200).json({text: 'hello, world!'});
});

module.exports.apiRouter = apiRouter;
