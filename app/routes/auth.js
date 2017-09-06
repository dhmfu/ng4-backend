var path = require('path');

module.exports = function (app, jwt, User, tokenVerify, superAdminRights) {

  app.post("/api/login", function(req, res) {
    var name, password;
    if (typeof req.body == 'object') {
        name = req.body.name;
        password = req.body.password;
    } else {
        var body = JSON.parse(req.body);
        name = body.name;
        password = body.password;
    }

    if(!name){
      res.status(401).json({message: "No login provided", token: null});
    } else if (!password) {
        res.status(401).json({message: "No password provided", token: null});
    }
    else{
      User.findOne({ username: name }, function (err, user) {
        if (err) {
          console.log(err);
          res.status(500).json({message:"Server Error", err: err});
          return;
        }
        if(!user){
          console.log(user);
          res.status(401).json({message:"No such user found"});
          return;
        }
        if(!user.checkPassword(password)){
          res.status(401).json({message:"Incorrect password"});
          return;
        }
        var payload = {id: user.id, superAdmin: user.superAdmin, username: user.username};
        var token = jwt.sign(payload, app.get('secret'), {expiresIn: '2 days'});
        user.token = token;
        user.save(function (err, updatedUser) {
          if (err) res.send(err);
          res.json({message: "ok", token: token});
        });
      });
    }
  });

  // // route to test if the user is logged in or not
  app.get('/api/loggedin', tokenVerify, superAdminRights, function(req, res) {
    res.json({ success: true, message: 'User is authenticated.' });
  });

  // route to log out
  app.post('/api/logout', tokenVerify, function(req, res){
    User.findById(req.decoded.id, function (err, user) {
      if (err) res.send(err);
      user.token = '';
      user.save(function (err, updatedUser) {
        if (err) res.send(err);
        res.json({message: "ok"});
      });
    });
  });
  //==================================================================

  app.get('/', function (req, res) {
    res.sendFile('/public/index.html');
  });

};
