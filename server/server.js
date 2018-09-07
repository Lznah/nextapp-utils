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
var Property = require('./models/property');
var app = express();

app.listen(3000, () => {
  console.log("Server is running");
});

app.get('/properties/:id', authenticate, (req, res) => {
  var property = new Property(req.params.id);
  property.run()
  .then((json) => {
    res.send(`${JSON.stringify(json)}`);
  })
  .catch((err) => {
    if(typeof err.status !== "undefined") {
      return res.status(err.status).send(`${JSON.stringify(err)}`);
    }
    res.status(400).send(`${JSON.stringify(err)}`);
  });
  // request({
  //   url: 'https://nextapp.cz/search',
  //   method: 'GET',
  //   followAllRedirects: true,
  //   qs: {
  //     'search-input': req.params.id
  //   }
  // }, (error, response, body) => {
  //   let pattern = /https:\/\/nextapp.cz\/listing\/([0-9]*)\/show/;
  //   if( !pattern.test(response.request.uri.href) ) {
  //     res.status(404).send({
  //       text: 'Property not found'
  //     });
  //     return;
  //   }
  //   let trueID = response.request.uri.href.match(pattern)[1];
  //   var inputArray = {'basic-info': {}, 'broker': {}, 'price': {}};
  //   Object.keys(inputArray).forEach((page) => {
  //     request({
  //       url: `https://nextapp.cz/listing/${trueID}/edit/${page}`,
  //       method: 'GET'
  //     }, (error, response, body) => {
  //       console.log(response.statusCode, `https://nextapp.cz/listing/${trueID}/edit/${page}`);
  //       if(error) {
  //         console.log(error);
  //         return;
  //       }
  //       if(response.statusCode != 200) {
  //         console.log('Error: ', response.statusCode, `https://nextapp.cz/listing/${trueID}/edit/${page}`);
  //         return;
  //       }
  //       let form = $('#listing', body);
  //       $('input, textarea, select', form).each(function(key, val) {
  //         inputArray[page][$(this).attr('name')] = $(this).val();
  //       });
  //       console.log(inputArray);
  //     });
  //   });
  //   res.send('hi');
  // });
});
