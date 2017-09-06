const path = require('path');
const post = require('../models/post');
const fs = require('fs');


module.exports = function (app, tokenVerify, originalPath) {

    setInterval(function() {
        post.find({}, 'title', function (err, posts) { //fetch all posts
            if (err) res.send(err);
            posts = posts.map(post=>post.title+'.jpg'); //remove everything except title in posts
            let filesPath = path.join(originalPath, 'public/img/posts');
            fs.readdir(filesPath, (err, files) => { //get all filenames
                if (files.length)
                    files.forEach(file => {
                        if(!~posts.indexOf(file)) //if filename doesn't exist in posts - it's wrong
                        fs.unlink(filesPath+'/'+file, err => {
                            if (err) console.log(err);
                            else console.log('success');
                        });
                    });
                else {
                    console.log('no files');
                }
            });
        });
    },1000*2);

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
          console.log(file);
          file.mv(originalPath+'/public/img/posts/'+title+'.jpg', function(err) {
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
