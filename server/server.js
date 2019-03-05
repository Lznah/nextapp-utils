require('./config/config');

const express = require("express");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const $ = require("cheerio");
const exphbs = require('express-handlebars');
const hbs = require('hbs');
const bodyParser = require('body-parser');

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

//app.set('view engine', 'hbs');
const port = process.env.PORT || 8000;
const serverLogPath = path.join(__dirname,'server.log')

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
hbs.registerPartials(path.join(__dirname + '/views/partials'));

app.use( (req, res, next) => {
  var now = new Date().toString();
  var log = `${now}: ${req.method} ${req.url}`;
  console.log(log);
  fs.appendFile( serverLogPath , log + '\n', (err) => {
    if(err) {
      console.log('Unable to append to server.log');
    }
  });
  next();
});

app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  extname: 'hbs',
  layoutsDir: path.join(__dirname, 'views/layouts')
}));

app.use(express.static(path.join(__dirname, '/public')));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors({origin: '*'}));
var lock = {lock: false, progress: 0};
var exportJobId;

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

app.get("/reexport/:id", (req, res) => {
  if(lock.lock) {
    return res.status(500).send("Another job ("+exportJobId+") is running");
  }
  if(typeof req.query.servers != "object" || req.query.servers.length == 0) {
    return res.status(500).send("No server selected");
  }
  lock.lock = true;
  exportJobId = req.params.id;
  authenticate2(process.env.NEXTAPP_USERNAME2, process.env.NEXTAPP_PASSWORD2)
  .then(() => {
    res.send("OK");
    return ExportQueueItem.listById(req.params.id);
  })
  .then((records) => {
    return ExportQueueItem.reexportAll(records, req.query.servers, lock);
  })
  .then(() => {
    lock.lock = false;
    exportJobId = false;
  })
  .catch((error) => {
    exportJobId = false;
    lock.lock = false;
    res.status(500).send(error)
  })
});

app.get("/exports", (req, res) => {
  ExportQueueItem.list().then((docs) => {
    res.send(docs);
  }).catch((err) => {
    res.status(500).send(err);
  })
});

app.delete("/exports/:id", (req, res) => {
  if(exportJobId == req.params.id) {
    return res.status(102).send("Cannot delete this measuring. It is being exported at this moment.");
  }
  ExportQueueItem.deleteMeasuring(req.params.id).then((rows) => {
    res.send({
      message: "Measurings have been successfully deleted"
    });
  }).catch((err) => {
    res.status(500).send(err);
  })
});

app.get("/servers/:id", (req, res) => {
  ExportQueueItem.listServersForMeasuring(req.params.id).then((servers) => {
    res.send({servers});
  }).catch((err) => {
    res.status(500).send(err);
  })
});

app.get('/scrapeExports/lock', (req, res) => {
  res.send(lock);
});

app.get('/scrapeExports/pobocky', (req, res) => {
  if(lock.lock) {
    return res.status(500).send("Another job ("+exportJobId+") is running");
  }
  lock.lock = true;
  lock.progress = 0;
  exportJobId = "Stahování informací o pobočkách";
  authenticate2(process.env.NEXTAPP_USERNAME2, process.env.NEXTAPP_PASSWORD2)
  .then(() => {
    res.end();
    return ExportQueueItem.scrapeAndSave(lock);
  })
  .then((idOfMeasuring) => {
    lock.lock = false;
  })
  .catch((err) => {
    lock.lock = false;
    res.status(500).send(err);
  });
});

app.get('/scrapeExports/partneri', authenticate, (req, res) => {
  if(lock.lock) {
    return res.status(500).send("Another job ("+exportJobId+") is running");
  }
  lock.lock = true;
  lock.progress = 0;
  exportJobId = "Stahování informací o partnerech";
  console.log("a");
  authenticate2(process.env.NEXTAPP_USERNAME, process.env.NEXTAPP_PASSWORD)
  .then(() => {
    console.log("b");
    return ExportQueueItem.scrapeAndSave(lock);
  })
  .then((idOfMeasuring) => {
    console.log("c");
    lock.lock = false;
  })
  .catch((err) => {
    lock.lock = false;
    console.log(err);
    res.status(500).send(err);
  });
});

app.get('/', (req, res) => {
  ExportQueueItem.list().then((measurings) => {
    res.render('home',{measurings});
  }).catch((err) => {
    res.status(500).send(err);
  })
});

app.listen(port, () => {
  console.log("Server is running");
});
