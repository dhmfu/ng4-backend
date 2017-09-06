var mongoose = require('../mongoose');

var schema = mongoose.Schema({
  description: String,
  title: {
      type: String,
      unique: true,
      required: true
  },
  createdAt: {
      type: Date,
      default: Date.now
  },
  creatorId: {
      type: String,
      required: true
  },
  creator: {
      type: String,
      required: true
  }
});

var post = mongoose.model('post', schema);

module.exports = post;
