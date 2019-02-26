const path = require('path');
var fs = require('fs');

var request = require('request').defaults({
  jar: true,
  headers: {
    agentOptions: {
      ca: fs.readFileSync(path.join( __dirname, '..', 'certs', 'nextappcz.cer' ))
    }
  }
});
const $ = require('cheerio');

function authenticate(req, res, next) {
  if(typeof authenticate.attempts === 'undefined') {
    authenticate.attempts = 3;
  }
  request({
    method: 'POST',
    url: 'https://nextapp.cz/login-check',
    followAllRedirects: true,
    formData: {
      user_login: process.env.NEXTAPP_USERNAME,
      user_password: process.env.NEXTAPP_PASSWORD,
      login_submit: 'Přihlásit se!'
    }
  }, function(error, response, body) {
    if(error) {
      throw error;
    }
    if( $('title', body).text() === 'Přihlášení / NEXTapp' || response.statusCode !== 200 ) {
      if( authenticate.attempts <= 0) {
        authenticate.attempts = 3;
        res.status(401).send({
          text: 'Can not log in'
        });
        return;
      }
      authenticate.attempts--;
      authenticate(req, res, next);
      return;
    }
    next();
  });
}

function authenticate2(req, res, next) {
  if(typeof authenticate2.attempts === 'undefined') {
    authenticate2.attempts = 3;
  }
  request({
    method: 'POST',
    url: 'https://nextapp.cz/login-check',
    followAllRedirects: true,
    formData: {
      user_login: process.env.NEXTAPP_USERNAME2,
      user_password: process.env.NEXTAPP_PASSWORD2,
      login_submit: 'Přihlásit se!'
    }
  }, function(error, response, body) {
    if(error) {
      throw error;
    }
    if( $('title', body).text() === 'Přihlášení / NEXTapp' || response.statusCode !== 200 ) {
      if( authenticate2.attempts <= 0) {
        authenticate2.attempts = 3;
        res.status(401).send({
          text: 'Can not log in2'
        });
        return;
      }
      authenticate2.attempts--;
      authenticate2(req, res, next);
      return;
    }
    next();
  });
}

function authenticate2(req, res, next) {
  if(typeof authenticate2.attempts === 'undefined') {
    authenticate2.attempts = 3;
  }
  request({
    method: 'POST',
    url: 'https://nextapp.cz/login-check',
    followAllRedirects: true,
    formData: {
      user_login: process.env.NEXTAPP_USERNAME2,
      user_password: process.env.NEXTAPP_PASSWORD2,
      login_submit: 'Přihlásit se!'
    }
  }, function(error, response, body) {
    if(error) {
      throw error;
    }
    if( $('title', body).text() === 'Přihlášení / NEXTapp' || response.statusCode !== 200 ) {
      if( authenticate2.attempts <= 0) {
        authenticate2.attempts = 3;
        res.status(401).send({
          text: 'Can not log in2'
        });
        return;
      }
      authenticate2.attempts--;
      authenticate2(req, res, next);
      return;
    }
    next();
  });
}

module.exports = {authenticate,authenticate2};
