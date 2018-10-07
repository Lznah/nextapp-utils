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
});
