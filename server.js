var express = require('express');
var cors = require('cors');
var errorhandler = require('errorhandler')
var http = require('http');
var morgan = require('morgan');
var path = require('path');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var jwtModule = require('jsonwebtoken');
var fileUpload = require('express-fileupload');

var mongoose = require('./app/mongoose');
var config = require('./config');
var userModel = require('./app/models/user').User;

var app = express();
app.use(fileUpload());

app.set('port', config.get('port'));
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

app.set('secret', config.get('secret'));

app.use(morgan('dev'));
app.use(cors());

app.use(bodyParser.urlencoded({'extended': 'false'}));
app.use(bodyParser.json());
app.use(bodyParser.json({type: 'application/vnd.api+json'}));
app.use(bodyParser.json({type: 'application/x-www-form-urlencoded'}));
app.use(bodyParser.text());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(function(err, req, res, next) {
  if (app.get('env') == 'development') {
    errorhandler(err, req, res, next);
  } else {
    res.send(500);
  }
});

var tokenVerify = function(req, res, next) {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  var jwt = jwtModule, User = userModel;
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, app.get('secret'), function(err, decoded) {
      if (err) {
        return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        User.findById(decoded.id, function (err, user) {
          if (err) res.send(err);
          if (user.token==token) {
            next();
          } else {
            return res.status(401).json({ success: false, message: 'Invalid token.' });
          }
        });
      }
    });
  } else {
    // if there is no token
    // return an error
    console.log('THERE WAS AN ERROR');
    return res.status(401).send({
      success: false,
      message: 'No token provided.'
    });
  }
};

var superAdminRights = function (req, res, next) {
  if (req.query.forLogin == 'true') return next();
  if (!req.decoded.superAdmin) return res.status(403).json({ success: false, message: 'This user is not Super-Admin.'});
  else next();
};

app.use(express.static(path.join(__dirname, 'public/img/posts')));

require('./app/routes/auth.js')(app, jwtModule, userModel, tokenVerify, superAdminRights);
require('./app/routes/users.js')(app, userModel, tokenVerify, superAdminRights);
require('./app/routes/posts.js')(app, tokenVerify, __dirname);
