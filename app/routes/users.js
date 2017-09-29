const path = require('path');
const post = require('../models/post');


module.exports = (app, User, tokenVerify, superAdminRights) => {

  app.post('/api/users/new', tokenVerify, superAdminRights, (req, res) => {
    let recieved = req.body;
    if(typeof recieved == 'string') recieved = JSON.parse(recieved);

    if(!recieved.password) return res.status(400).json({message: "No password provided"});
    User.create({
      username: recieved.username,
      password: recieved.password,
      superAdmin: recieved.superAdmin
    }, (err, user) => {
      if (err) return res.send(err);
      return res.json(user._id);
    });
  });

  app.get('/api/users', tokenVerify, superAdminRights, (req, res) => {
    User.find({}, (err, users) => {
        if (err) return res.send(err);
        return res.json(users);
    });
  });

  app.delete('/api/users/:id', tokenVerify, superAdminRights, (req, res) => {
    User.remove({_id: req.params.id},
    (err, user) => {
      if (err) return res.send(err);
      return res.end();
    });
  });

  app.patch('/api/users/:id', tokenVerify, superAdminRights, (req, res) => {
    const set = req.body;
    User.findById(req.params.id, (err, user) => {
      if (err) return res.send(err);
      user.username = set.username ? set.username : user.username;
      user.password = set.password ? set.password : user.password;
      user.superAdmin = set.superAdmin;
      user.save((err, updatedUser) => {
        if (err) return res.send(err);
        return res.json(updatedUser);
      });
    });
  });

};
