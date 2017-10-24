const path = require('path');
const post = require('../models/post');
const fs = require('fs');


module.exports = (app, tokenVerify, originalPath) => {

    setInterval(() => {
        post.find({}, '_id', (err, posts) => { //fetch all posts
            if (err) {
                console.log(err);
                return;
            }
            posts = posts.map(post=>post._id+'.jpeg'); //remove everything except title in posts
            let filesPath = path.join(originalPath, 'public/img/posts');
            fs.readdir(filesPath, (err, files) => { //get all filenames
                if (files.length)
                    files.forEach(file => {
                        if(!~posts.indexOf(file)) //if filename doesn't exist in posts - it's wrong
                        fs.unlink(path.join(filesPath, file), err => {
                            if (err) console.log(err);
                            else console.log('successful deleting of excess file');
                        });
                    });
                else {
                    console.log('no files');
                    return;
                }
            });
        });
    }, 1000*60*45);

  app.post('/api/posts/new', tokenVerify, (req, res) => {
      const description = req.body.description;
      const title = req.body.title || `${description.split(' ')[0]} - ${req.decoded.username}`;

      post.create({
          description,
          creatorId: req.decoded.id,
          creator: req.decoded.username,
          title
      }, (err, post) => {
            if (err) return res.send(err);
            else if (!req.files) return res.json(post);
            else {
                let file = req.files.file;
                file.mv(originalPath+'/public/img/posts/'+post._id+'.jpeg', function(err) {
                    if (err) return res.status(500).send(err);
                    else return res.json(post);
                });
            }
      });
  });

  app.get('/api/posts', (req, res) => {
    post.find({}, (err, posts) => {
        if (err) return res.send(err);
        return res.json(posts);
    });
  });

  app.delete('/api/posts/:id', tokenVerify, (req, res) => {
    if(req.headers['x-user-username']==req.decoded.username || req.decoded.superAdmin)
        post.remove({_id: req.params.id}, (err, user) => {
            if (err) return res.send(err);
            return res.end();
        });
    else return res.status(403).json({ success: false, message: 'This user has no rights to delete this post.'});
  });

  app.patch('/api/posts/:id', tokenVerify, (req, res) => {
      const set = JSON.parse(req.body);

      if(set.creator==req.decoded.username || req.decoded.superAdmin)
        post.findById(req.params.id, (err, post) => {
            if (err) return res.send(err);
            post.description = set.description;
            post.save((err, updatedPost) => {
                if (err) return res.send(err);
                return res.end();
            });
        });
     else return res.status(403).json({ success: false, message: 'This user has no rights to edit this post.'});

  });

};
