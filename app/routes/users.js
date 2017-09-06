var path = require('path');
var post = require('../models/post');


module.exports = function (app, User, tokenVerify, superAdminRights) {

  app.post('/api/users/new', tokenVerify, superAdminRights, function (req, res) {
    var recieved = req.body;
    if(typeof recieved == 'string') recieved = JSON.parse(recieved);
    console.log(recieved);
    if(!recieved.password) return res.status(400).json({message: "No password provided"});
    User.create({
      username: recieved.username,
      password: recieved.password,
      superAdmin: recieved.superAdmin
    }, function (err, user) {
      if (err) res.send(err);
      res.json(user._id);
    });
  });

  app.get('/api/users', tokenVerify, superAdminRights, function (req, res) {
    User.find({}, function (err, users) {
        if (err) res.send(err);
        res.json(users);
    });
  });

  app.delete('/api/users/:id', tokenVerify, superAdminRights, function (req, res) {
    User.remove({_id: req.params.id},
    function (err, user) {
      if (err) res.send(err);
      res.end();
    });
  });

  app.patch('/api/users/:id', tokenVerify, superAdminRights, function (req, res) {
    var set = req.body;
    User.findById(req.params.id, function (err, user) {
      if (err) res.send(err);
      user.username = set.username ? set.username : user.username;
      user.password = set.password ? set.password : user.password;
      user.superAdmin = set.superAdmin;
      user.save(function (err, updatedUser) {
        if (err) res.send(err);
        res.json(updatedUser);
      });
    });
  });

};
