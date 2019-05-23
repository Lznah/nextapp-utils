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
const rp = require('request-promise');
const nodemailer = require('nodemailer');

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
var CronJob = require('cron').CronJob;
var Property = require('./models/property');

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

function notifyMe(message, text = "") {
  let transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
  });
  transporter.sendMail({
    from: 'util@nextreality.cz',
    to: 'petr.hanzl@nextreality.cz, hanzlpe@icloud.com',
    subject: 'Error: '+message,
    text: text
  }, (err) => {
    if(err) {
      console.log(err);
    }
  });
}

new CronJob('0 * * * * *', function() {
  rp('http://nextimmo.cz/irest-exporty/api.php')
    .then( (html) => {
      try{
        let data = JSON.parse(html);
        let y = new Date(); // yesterday
        y.setDate(y.getDate()-1);

        let dby = new Date(); // dayBeforeYesterday
        dby.setDate(dby.getDate()-2);

        yString = y.toISOString().replace(/T[0-9:.]*Z/,''); // in format YYYY-mm-dd
        dbyString = dby.toISOString().replace(/T[0-9:.]*Z/,'');
        if( _.isUndefined(data[yString]) || _.isUndefined(data[dbyString])) {
          throw 'data were not measured';
        }

        var sub = [];
        var text = "problems with: ";
        var flag = false;
        _.forOwn(data[yString],(val, key) => {
          sub[key] = val;
        });
        _.forOwn(data[dbyString],(val, key) => {
          sub[key] = Math.abs(sub[key]-val)/sub[key];
          if(sub[key] > 0.25) {
            text += (flag?', ':'');
            text += key;
            flag = true;
          }
        });
        if(flag) {
          throw text;
        }
        return;
      } catch(err) {
        return Promise.reject(err);
      };
    })
    .catch( (err) => {
      notifyMe("statistiky NEXT IMMO", err);
    });
}, null, true, 'Europe/Prague');

app.get('/properties/:id', (req, res) => {
  nextapp.authenticate(process.env.NEXTAPP_USERNAME2, process.env.NEXTAPP_PASSWORD2)
  .then(() => {
    var property = new Property(req.params.id);
    return property.run()
  })
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
  nextapp.authenticate(process.env.NEXTAPP_USERNAME2, process.env.NEXTAPP_PASSWORD2)
  .then(() => {
    res.send("Logged");
    return ExportQueueItem.listById(req.params.id);
  })
  .then((records) => {
    return ExportQueueItem.reexportAll(records, req.query.servers, lock);
  })
  .then(() => {
    lock.lock = false;
    lock.progress = 0;
    exportJobId = false;
  })
  .catch((error) => {
    exportJobId = false;
    lock.lock = false;
    lock.progress = 0;
    console.log(error);
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

app.get('/scrapeExports/:type', (req, res) => {
  if(lock.lock) {
    return res.status(500).send("Another job ("+exportJobId+") is running");
  }
  lock.lock = true;
  lock.progress = 0;
  exportJobId = "Stahování informací o partnerech";
  var username = process.env.NEXTAPP_USERNAME;
  var password = process.env.NEXTAPP_PASSWORD;
  if(req.params.type == "pobocky") {
    username = process.env.NEXTAPP_USERNAME2;
    password = process.env.NEXTAPP_PASSWORD2;
  }
  nextapp.authenticate(username, password)
  .then(() => {
    res.send("Logged");
    return ExportQueueItem.scrapeAndSave(lock);
  })
  .then((idOfMeasuring) => {
    lock.lock = false;
    lock.progress = 0;
  })
  .catch((err) => {
    lock.lock = false;
    lock.progress = 0;
    console.log(err);
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
