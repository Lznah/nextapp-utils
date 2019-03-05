var mongoose = require('mongoose');
var _ = require('lodash');
var $ = require("cheerio");
var fs = require("fs");
var path = require("path");
var nextapp = require("../utils/utils");

var ExportQueueItemSchema = new mongoose.Schema({
  idOfMeasuring: {
    type: Number,
    required: true
  },
  realID: {
    type: String,
    required: true,
    trim: true,
    minlength: 1
  },
  fakeID:{
    type: String,
    required: true,
    trim: true,
    minlength: 1
  },
  exported: {
    type: Boolean,
    required: false,
    default: false
  },
  dateOfImport: {
    type: Date,
    required: false,
    default: Date.now()
  },
  dateOfExport: {
    type: Date,
    required: false
  },
  servers: [{
    id: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true
    },
    export: {
      type: Boolean,
      required: true
    }
  }]
});

var ExportQueueItem = mongoose.model('ExportQueueItem', ExportQueueItemSchema);

var reexport = async(record, servers) => {
  return new Promise( async (resolve, reject) => {
    var formData = [];
    var flag = false;
    var serversWithAdditionalInfo = [30, 250, 20, 10];
    for(var i=0; i<servers.length; i++) {
      var index = record.servers.findIndex((element) => element.id == servers[i]);
      if(record.servers[index].export) {
        if( !flag && serversWithAdditionalInfo.find((element) => element == servers[i]) ) flag = true;
        formData[servers[i]] = {export_actions: 10};
      }
    }
    if(flag) {
      var $ = await nextapp.loadExportPage(record);
      $(".export-nastaveni").each((i, elem) => {
        var conf = $(elem).find('input[type="radio"]:checked');
        if(conf.length > 0) {
          var name = conf.attr("name");
          var value = conf.val();
          var b = name.match(/service\[([0-9]{1,})\]\[([a-z_]{1,})\]/);
          var id = b[1];
          var service = b[2];
          if(typeof formData[id] != "undefined") {
            formData[id][service] = value;
          }
        }
      });
      if(typeof formData[30] != "undefined") {
        formData[30]["custom_id"] = $("#fieldset-hiddenItems input").val();
      }
    }
    await nextapp.sendForm("https://nextapp.cz/listing/"+record.realID+"/edit/exports", {"service":formData});
    resolve();
  });
}

ExportQueueItem.reexportAll = (records, servers, obj) => {
  return new Promise( async (resolve, reject) => {
    for(var i=0; i<records.length; i++) {
      await reexport(records[i], servers);
      ExportQueueItem.findByIdAndUpdate(records[i]._id, {exported: true, dateOfExport: Date.now()}, (err, docs) => {
        if(err) {
          reject("Can not update the document");
        }
      });
      obj.progress = Math.round(100*i/records.length);
    }
    resolve();
  });
}

ExportQueueItem.scrapeAndSave = async (lock) => {
  return new Promise((resolve, reject) => {
    ExportQueueItem.scrapeExportPages(lock)
    .then(async (table) => {
      return ExportQueueItem.saveTable(table)
    }).then((log) => {
      resolve();
    }).catch((err) => {
      reject(err);
    });
  });
}

ExportQueueItem.scrapeExportPages = async (lock) => {
  return new Promise((resolve, reject) => {
    var baseUrl = "https://nextapp.cz/export/overview?exportListFilter%5Bexport_branch%5D%5Bvalue%5D=0&exportListFilter%5Bexport_team%5D%5Bvalue%5D=0&exportListFilter%5Bexport_broker%5D%5Bvalue%5D=0&exportListFilter%5Bexport_request%5D%5Bvalues%5D%5B0%5D=10&exportListFilter%5Bexport_request%5D%5Bvalues%5D%5B1%5D=15&exportListFilter%5Bexport_result%5D%5Bvalues%5D%5B0%5D=0&exportListFilter%5Bexport_result%5D%5Bvalues%5D%5B1%5D=10&exportListFilter%5Bexport_result%5D%5Bvalues%5D%5B2%5D=20&exportListFilter%5Bexport_advert_status%5D%5Bvalues%5D%5B0%5D=20&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B0%5D=550&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B1%5D=50&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B2%5D=120&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B3%5D=255&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B4%5D=620&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B5%5D=30&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B6%5D=110&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B7%5D=261&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B8%5D=1&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B9%5D=350&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B10%5D=570&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B11%5D=560&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B12%5D=160&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B13%5D=280&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B14%5D=240&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B15%5D=270&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B16%5D=3002&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B17%5D=170&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B18%5D=150&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B19%5D=600&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B20%5D=250&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B21%5D=180&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B22%5D=10&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B23%5D=11&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B24%5D=220&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B25%5D=20&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B26%5D=580&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B27%5D=3001&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B28%5D=610&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B29%5D=400&filter_submit=Použ%C3%ADt+filtr";

    var data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'codelist', 'servers.json')));
    var fnc = (indexCell, input) => {
      const exportedText = $(input).find("dd:first-child").text().trim();
      const exported = (exportedText == "Exportovat" || exportedText == "Vyexportováno, ověřit");
      const dayOfLastExport = $(input).find("dd:last-child").text().trim();
      const id = fnc.servers[indexCell-2].id; // servers starts from 3nd column, thats why indexCell is shift by -2
      return {export:exported,dayOfLastExport,id};
    }
    fnc.servers = data["servers"];
    var columns = [false,true,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc];
    nextapp.loadTable(baseUrl, columns, 1, lock)
    .then((table) => {
      resolve(table);
    }).catch((error) => {
      reject(error);
    });
  });
}

ExportQueueItem.saveTable = async(table) => {
  return new Promise((resolve, reject) => {
    ExportQueueItem
    .findOne({})
    .sort('-idOfMeasuring')
    .exec((err, exportqueueitem) => {
      var idOfMeasuring = 1;
      if( ! _.isNil(exportqueueitem)) {
        idOfMeasuring = exportqueueitem.idOfMeasuring+1;
      }
      var toDatabase = [];
      _.forEach(table["rows"], (row) => {
        var newRow = {idOfMeasuring,servers:[]}
        _.forEach(row, (value, key) => {
          if(_.isObject(value)) {
            newRow.servers.push({
              name: key,
              id: value.id,
              export:value.export
            });
          } else {
            newRow[key] = value;
          }
        });
        toDatabase.push(newRow);
      });
      ExportQueueItem.insertMany(toDatabase).then(() => {
        resolve();
      }).catch((err) =>{
        reject(err);
      });
    });

  });
}

ExportQueueItem.listById = async(id) => {
  return new Promise(async (resolve, reject) => {
    await ExportQueueItem.find({idOfMeasuring: id, exported: false}, function(err, records) {
      if(err) {
        return reject(err);
      }
      resolve(records);
    });
  });
}


ExportQueueItem.list = () => {
  return new Promise( async (resolve, reject) => {
    const agg = [
      { $match: {
            exported: false
        },
      },
      { $group: {
          _id: "$idOfMeasuring",
          count: {$sum: 1},
          date: {$max: "$dateOfImport"}
        }
      }
    ];
    return await ExportQueueItem.aggregate(agg, function(err, logs) {
      if(err) {
        return reject(err);
      }
      resolve(logs);
    });
  });
}

ExportQueueItem.listServersForMeasuring = async(id) => {
  return new Promise((resolve, reject) => {
    const agg = [
      {$match: {
        idOfMeasuring: parseInt(id),
        exported: false
        }
      },
      {$unwind: "$servers"},
      {$match: {
        'servers.export': true
        }
      },
      {$group: {
        _id: '$servers.id',
        name : { $first: '$servers.name' },
        count: {$sum: 1}
        }
      }
    ];
    ExportQueueItem.aggregate(agg, function(err, servers) {
      if(err) {
        return reject(err);
      }
      resolve(servers);
    });
  });
}

ExportQueueItem.deleteMeasuring = async(id) => {
  return new Promise((resolve, reject) => {
    ExportQueueItem.deleteMany({idOfMeasuring: id}, function(err, logs) {
      if(err) {
        return reject(err);
      }
      resolve(logs);
    });
  });
}

module.exports = {ExportQueueItem}
