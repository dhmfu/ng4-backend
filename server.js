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
const nodeID3 = require('node-id3');
const _ = require('underscore');

const mongoose = require('./app/mongoose');
const config = require('./config');
const userModel = require('./app/models/user').User;

let app = express();
app.use(fileUpload());

app.set('port', config.get('port'));
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

app.set('secret', config.get('secret'));
app.get('/songs', (req, res, next) => {
    let filesPath = path.join(__dirname, 'public/mp3');
    fs.readdir(filesPath, (err, files) => { //get all filenames
        if (files.length) {
            let songs = [];
            files.forEach(file => {
                let read = nodeID3.read(path.join(filesPath, file));
                read = _.omit(read, 'image', 'encodedBy', 'comment');
                songs.push(read);
            });
            return res.json(songs);
        }
        else {
            console.log('no files');
            return res.send('no files');
        }
    });
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
