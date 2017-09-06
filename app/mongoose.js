var mongoose = require('mongoose');
var config = require('../config');
mongoose.connect(config.get('db:connection'));

module.exports = mongoose;
