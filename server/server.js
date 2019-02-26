require('./config/config');

const express = require("express");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const $ = require("cheerio");
const nextapp = require("./utils/utils.js");
var {mongoose} = require("./db/mongoose");
var {ExportQueueItem} = require("./models/ExportQueueItem");
var request = require('request').defaults({
  jar: true,
  headers: {
    agentOptions: {
      ca: fs.readFileSync(path.join( __dirname, 'certs', 'nextappcz.cer' ))
    }
  }
});
var {authenticate, authenticate2} = require('./middleware/authenticate');
var Property = require('./models/property');
var app = express();
const port = process.env.PORT || 8000;
app.use(cors({origin: '*'}));

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

app.get('/exports/pobocky', authenticate2, (req, res) => {
  ExportQueueItem.scrapeAndSave()
  .then((idOfMeasuring) => {
    res.send({idOfMeasuring});
  }).catch((error) => {
    console.log(error);
    res.status(500).send("Error occured");
  });
});

app.get('/exports/partneri', authenticate, (req, res) => {
  ExportQueueItem.scrapeAndSave()
  .then((idOfMeasuring) => {
    res.send({idOfMeasuring});
  }).catch((error) => {
    console.log(error);
    res.status(500).send("Error occured");
  });
});

app.listen(port, () => {
  console.log("Server is running");
});
