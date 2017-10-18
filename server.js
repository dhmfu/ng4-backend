const express = require('express');
const cors = require('cors');
const errorhandler = require('errorhandler')
const http = require('http');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const jwtModule = require('jsonwebtoken');
const fileUpload = require('express-fileupload');

const mongoose = require('./app/mongoose');
const config = require('./config');
const userModel = require('./app/models/user').User;

let app = express();
app.use(fileUpload());

var Watcher = require('file-watcher');

var watcher = new Watcher({
    root: path.join(__dirname, '/public/mp3')
});

app.set('port', config.get('port'));
let server = http.createServer(app);
let io = require('socket.io')(server);

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(app.get('port'), () => {
    console.log('Express server listening on port ' + app.get('port'));

    watcher.watch();
    watcher.on('create', function(event) {
        console.log(event.newPath);
    });
    watcher.on('delete', function(event) {
        console.log(event.oldPath);
    });
});

app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
});

app.set('secret', config.get('secret'));

app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
});



app.use(morgan('dev'));
app.use(cors());

app.use(bodyParser.urlencoded({'extended': 'false'}));
app.use(bodyParser.json());
app.use(bodyParser.json({type: 'application/vnd.api+json'}));
app.use(bodyParser.json({type: 'application/x-www-form-urlencoded'}));
app.use(bodyParser.text());
app.use(methodOverride('X-HTTP-Method-Override'));

let tokenVerify = (req, res, next) => {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  var jwt = jwtModule, User = userModel;
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, app.get('secret'), (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        User.findById(decoded.id, (err, user) => {
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

let superAdminRights = (req, res, next) => {
  if (req.query.forLogin == 'true') return next();
  if (!req.decoded.superAdmin) return res.status(403).json({ success: false, message: 'This user is not Super-Admin.'});
  else next();
};

app.use(express.static(path.join(__dirname, 'public/img/posts')));

require('./app/routes/auth.js')(app, jwtModule, userModel, tokenVerify, superAdminRights);
require('./app/routes/users.js')(app, userModel, tokenVerify, superAdminRights);
require('./app/routes/posts.js')(app, tokenVerify, __dirname);
require('./app/routes/songs.js')(app, __dirname);
