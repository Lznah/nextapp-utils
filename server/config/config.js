var env = process.env.NODE_ENV || 'development';

if (env === 'development' || env === 'test') {
  var config = require('./config.json');

  Object.keys(config).forEach((key) => {
    process.env[key] = config[key];
});
