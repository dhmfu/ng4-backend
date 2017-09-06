var path = require('path');
var post = require('../models/post');


module.exports = function (app, tokenVerify, originalPath) {

  // app.post('/api/posts/new', tokenVerify, function(req, res) {
  //     var set = JSON.parse(req.body);
  //     post.create({
  //         description: set.description,
  //         creatorId: req.decoded.id,
  //         creator: req.decoded.username
  //     }, function (err, post) {
  //         if (err) res.send(err);
  //         res.json(post);
  //     });
  // });

  app.post('/api/posts/new', tokenVerify, function(req, res) {
      let createPost = newPost => {
          post.create({
              description: newPost.description,
              creatorId: req.decoded.id,
              creator: req.decoded.username,
              title: newPost.title
          }, function (err, post) {
                if (err) return res.send(err);
                // res.send('File uploaded!');
                return res.json(post);
          });
      };

      let description = req.body.description;
      let title = req.body.title || `${description.split(' ')[0]} - ${req.decoded.username}`

      if (!req.files)
          return createPost({description: description, title: title})
      else {
          let file = req.files.file;
          file.mv(originalPath+'/public/img/posts/'+file.name, function(err) {
              if (err) return res.status(500).send(err);
              return createPost({description: description, title: title});
          });
      }
  });

  app.get('/api/posts', function (req, res) {
    post.find({}, function (err, posts) {
        if (err) res.send(err);
        res.json(posts);
    });
  });

  app.delete('/api/posts/:id', tokenVerify,function (req, res) {
    if(req.headers['x-user-username']==req.decoded.username || req.decoded.superAdmin)
        post.remove({_id: req.params.id}, function (err, user) {
            if (err) res.send(err);
            res.end();
        });
    else return res.status(403).json({ success: false, message: 'This user has no rights to delete this post.'});
  });

  app.patch('/api/posts/:id', tokenVerify, function (req, res) {
      var set = JSON.parse(req.body);

      if(set.creator==req.decoded.username || req.decoded.superAdmin)
        post.findById(req.params.id, function (err, post) {
            if (err) res.send(err);
            post.description = set.description;
            post.save(function (err, updatedPost) {
                if (err) res.send(err);
                console.log(updatedPost);
                res.end();
            });
        });
     else return res.status(403).json({ success: false, message: 'This user has no rights to edit this post.'});

  });

};
