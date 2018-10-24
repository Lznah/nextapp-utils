require('./config/config');

const express = require("express");
const fs = require("fs");
const path = require("path");
var request = require('request').defaults({
  jar: true,
  headers: {
    agentOptions: {
      ca: fs.readFileSync(path.join( __dirname, 'certs', 'nextappcz.cer' ))
    }
  }
});
const $ = require('cheerio');
var {authenticate} = require('./middleware/authenticate');
var Property = require('./models/property');
var app = express();
const port = process.env.PORT || 8000;
//
 app.get('/', (req, res) => {
  res.send("hi");
});
//
// app.get('/properties/:id', authenticate, (req, res) => {
//   var property = new Property(req.params.id);
//   property.run()
//   .then((json) => {
//     res.send(`${JSON.stringify(json)}`);
//   })
//   .catch((err) => {
//     if(typeof err.status !== "undefined") {
//       return res.status(err.status).send(`${JSON.stringify(err)}`);
//     }
//     res.status(400).send(`${JSON.stringify(err)}`);
//   });
// });

app.listen(port, () => {
  console.log("Server is running");
});
