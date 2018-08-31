require('./config/config');

const express = require("express");
const fs = require("fs");
var request = require('request').defaults({
  jar: true,
  headers: {
    agentOptions: {
      ca: fs.readFileSync(process.env.NEXTAPP_CERTIFICATE)
    }
  }
});
const $ = require('cheerio');
var {authenticate} = require('./middleware/authenticate');
var app = express();

app.listen(3000, () => {
  console.log("Server is running");
});

app.get('/properties/:id', authenticate, (req, res) => {

  request({
    url: 'https://nextapp.cz/search',
    method: 'GET',
    followAllRedirects: true,
    qs: {
      'search-input': req.params.id
    }
  }, (error, response, body) => {
    let pattern = /https:\/\/nextapp.cz\/listing\/([0-9]*)\/show/;
    if( !pattern.test(response.request.uri.href) ) {
      res.status(404).send({
        text: 'Property not found'
      });
      return;
    }
    let trueID = response.request.uri.href.match(pattern)[1];
    var inputArray = {};
    request({
      url: `https://nextapp.cz/listing/${trueID}/edit`,
      method: 'GET'
    }, (error, response, body) => {
      let form = $('#listing', body);
      //let inputs = $('input, textarea, select', form);
      $('input, textarea, select', form).each(function(key, val) {
        console.log($(this).attr('name'),': ',$(this).val());
      });
      res.send('hi');
    });
  });
});

app.get('/aha', authenticate, (req, res) => {
  request({
    method: 'GET',
    url: 'https://nextapp.cz/users'
  }, (error, response, body) => {
    res.send(body);
  });
});
