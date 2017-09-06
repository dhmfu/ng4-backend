var post = require('./app/models/post');


for(var i = 0; i<10; i++){
  var test = new post({
    description: 'Article '+i,
    createdAt: Date.now(),
    creator: 'Vasya',
    creatorId: '597cac8d3a743a101119b0c1'
  });
  test.save(function (err, test, affected) {
    console.log(test.description);
  });
}

for(var i = 10; i<190; i++){
  var test = new post({
    description: 'Article '+i,
    createdAt: Date.now(),
    creator: 'admin',
    creatorId: '597cac8d3a743a101119b0c3'
  });
  test.save(function (err, test, affected) {
    console.log(test.description);
  });
}
