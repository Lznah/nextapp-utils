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
    var baseUrl = 'https%3A//nextapp.cz/export/overview%3FexportListFilter%5Bexport_branch%5D%5Bvalue%5D%3D0%26exportListFilter%5Bexport_team%5D%5Bvalue%5D%3D0%26exportListFilter%5Bexport_broker%5D%5Bvalue%5D%3D0%26exportListFilter%5Bexport_request%5D%5Bvalues%5D%5B%5D%3D10%26exportListFilter%5Bexport_request%5D%5Bvalues%5D%5B%5D%3D15%26exportListFilter%5Bexport_result%5D%5Bvalues%5D%5B%5D%3D0%26exportListFilter%5Bexport_result%5D%5Bvalues%5D%5B%5D%3D10%26exportListFilter%5Bexport_result%5D%5Bvalues%5D%5B%5D%3D20%26exportListFilter%5Bexport_advert_status%5D%5Bvalues%5D%5B%5D%3D20%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D550%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D50%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D120%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D255%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D620%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D30%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D110%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D261%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D1%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D350%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D570%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D640%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D560%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D160%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D280%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D240%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D270%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D3002%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D170%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D150%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D600%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D250%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D180%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D10%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D11%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D220%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D20%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D580%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D3001%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D610%26exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B%5D%3D400%26filter_submit%3DPou%u017E%EDt+filtr%23';

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
