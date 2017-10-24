const mongoose = require('../mongoose');

const schema = mongoose.Schema({
  artist: {
      type: String,
      default: ''
  },
  title: {
      type: String,
      default: ''
  },
  track: {
      type: String,
      default: ''
  },
  album: {
      type: String,
      default: ''
  },
  year: {
      type: String,
      default: ''
  },
  genre: {
      type: String,
      default: ''
  },
  filename: {
      type: String,
      required: true
  },
  lyrics: {
      type: String,
      default: ''
  }
});

module.exports = mongoose.model('song', schema);
