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
    var baseUrl = 'https://nextapp.cz/export/overview?exportListFilter[export_branch][value]=0&exportListFilter[export_team][value]=0&exportListFilter[export_broker][value]=0&exportListFilter[export_request][values][0]=10&exportListFilter[export_request][values][1]=15&exportListFilter[export_result][values][0]=0&exportListFilter[export_result][values][1]=10&exportListFilter[export_result][values][2]=20&exportListFilter[export_advert_status][values][0]=20&exportListFilter[export_type][values][0]=550&exportListFilter[export_type][values][1]=50&exportListFilter[export_type][values][2]=120&exportListFilter[export_type][values][3]=255&exportListFilter[export_type][values][4]=620&exportListFilter[export_type][values][5]=30&exportListFilter[export_type][values][6]=110&exportListFilter[export_type][values][7]=261&exportListFilter[export_type][values][8]=1&exportListFilter[export_type][values][9]=350&exportListFilter[export_type][values][10]=570&exportListFilter[export_type][values][11]=560&exportListFilter[export_type][values][12]=160&exportListFilter[export_type][values][13]=280&exportListFilter[export_type][values][14]=240&exportListFilter[export_type][values][15]=270&exportListFilter[export_type][values][16]=3002&exportListFilter[export_type][values][17]=170&exportListFilter[export_type][values][18]=150&exportListFilter[export_type][values][19]=600&exportListFilter[export_type][values][20]=250&exportListFilter[export_type][values][21]=180&exportListFilter[export_type][values][22]=10&exportListFilter[export_type][values][23]=11&exportListFilter[export_type][values][24]=220&exportListFilter[export_type][values][25]=20&exportListFilter[export_type][values][26]=580&exportListFilter[export_type][values][27]=3001&exportListFilter[export_type][values][28]=610&exportListFilter[export_type][values][29]=400&exportListFilter[export_type][values][30]=640';

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
