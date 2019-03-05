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
          message: 'Can not log in'
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

async function login(username, password) {
  return new Promise((resolve, reject) => {
    request({
      method: 'POST',
      url: 'https://nextapp.cz/login-check',
      followAllRedirects: true,
      formData: {
        user_login: username,
        user_password: password,
        login_submit: 'Přihlásit se!'
      }
    }, function(error, response, body) {
      if(error) {
        return reject(error);
      }
      if( $('title', body).text() === 'Přihlášení / NEXTapp' || response.statusCode !== 200 ) {
        return resolve(false);
      } else {
        return resolve(true);
      }
    });
  });
}

async function authenticate2(username, password) {
  return new Promise(async (resolve, reject) => {
    var logged = await login(username, password);
    if(logged) return resolve();
    var logged = await login(username, password);
    if(logged) return resolve();
    var logged = await login(username, password);
    if(logged) return resolve();
    reject();
  });
}

module.exports = {authenticate,authenticate2};
