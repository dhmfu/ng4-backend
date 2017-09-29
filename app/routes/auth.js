const path = require('path');

module.exports = (app, jwt, User, tokenVerify, superAdminRights) => {

  app.post("/api/login", (req, res) => {
    let name, password, body;
    if (typeof req.body == 'object') {
        name = req.body.name;
        password = req.body.password;
    } else {
        body = JSON.parse(req.body);
        name = body.name;
        password = body.password;
    }

    if(!name) res.status(401).json({message: "No login provided", token: null});
     else if (!password) res.status(401).json({message: "No password provided", token: null});
    else {
      User.findOne({ username: name }, (err, user) => {
        if (err) {
          console.log(err);
          return res.status(500).json({message:"Server Error", err: err});
        }
        if(!user){
          console.log(user);
          return res.status(401).json({message:"No such user found"});
        }
        if(!user.checkPassword(password))
          return res.status(401).json({message:"Incorrect password"});

        const payload = {id: user.id, superAdmin: user.superAdmin, username: user.username};
        const token = jwt.sign(payload, app.get('secret'), {expiresIn: '2 days'});
        user.token = token;
        user.save((err, updatedUser) => {
          if (err) return res.send(err);
          return res.json({message: "ok", token: token});
        });
      });
    }
  });

  // // route to test if the user is logged in or not
  app.get('/api/loggedin', tokenVerify, superAdminRights,
  (req, res) => res.json({ success: true, message: 'User is authenticated.' }));

  // route to log out
  app.post('/api/logout', tokenVerify, (req, res) => {
    User.findById(req.decoded.id, (err, user) => {
      if (err) return res.send(err);
      user.token = '';
      user.save((err, updatedUser) => {
        if (err) return res.send(err);
        return res.json({message: "ok"});
      });
    });
  });

  app.get('/', (req, res) => res.sendFile('/public/index.html'));

};
