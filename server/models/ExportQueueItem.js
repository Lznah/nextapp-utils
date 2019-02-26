var mongoose = require('mongoose');
var _ = require('lodash');
var $ = require("cheerio");
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

ExportQueueItem.scrapeAndSave = async () => {
  return new Promise((resolve, reject) => {
    ExportQueueItem
    .findOne({})
    .sort('-idOfMeasuring')
    .exec((err, exportqueueitem) => {
      var idOfMeasuring = 1;
      if( ! _.isNil(exportqueueitem)) {
        idOfMeasuring = exportqueueitem.idOfMeasuring+1;
      }
      ExportQueueItem.scrapeExportPages(idOfMeasuring).then(async (table) => {
        ExportQueueItem.saveTable(table,idOfMeasuring);
        resolve(idOfMeasuring);
      }).catch((err) => {
        reject(err);
      });
    });
  });
}

ExportQueueItem.scrapeExportPages = async (idOfMeasuring) => {
  return new Promise((resolve, reject) => {
    var baseUrl = "https://nextapp.cz/export/overview?exportListFilter%5Bexport_branch%5D%5Bvalue%5D=0&exportListFilter%5Bexport_team%5D%5Bvalue%5D=0&exportListFilter%5Bexport_broker%5D%5Bvalue%5D=0&exportListFilter%5Bexport_request%5D%5Bvalues%5D%5B0%5D=10&exportListFilter%5Bexport_request%5D%5Bvalues%5D%5B1%5D=15&exportListFilter%5Bexport_result%5D%5Bvalues%5D%5B0%5D=0&exportListFilter%5Bexport_result%5D%5Bvalues%5D%5B1%5D=10&exportListFilter%5Bexport_result%5D%5Bvalues%5D%5B2%5D=20&exportListFilter%5Bexport_advert_status%5D%5Bvalues%5D%5B0%5D=20&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B0%5D=550&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B1%5D=50&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B2%5D=120&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B3%5D=255&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B4%5D=620&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B5%5D=30&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B6%5D=110&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B7%5D=261&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B8%5D=1&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B9%5D=350&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B10%5D=570&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B11%5D=560&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B12%5D=160&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B13%5D=280&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B14%5D=240&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B15%5D=270&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B16%5D=3002&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B17%5D=170&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B18%5D=150&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B19%5D=600&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B20%5D=250&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B21%5D=180&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B22%5D=10&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B23%5D=11&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B24%5D=220&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B25%5D=20&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B26%5D=580&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B27%5D=3001&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B28%5D=610&exportListFilter%5Bexport_type%5D%5Bvalues%5D%5B29%5D=400&filter_submit=Použ%C3%ADt+filtr";
    var fnc = (indexCell, input) => {
      const serverListIds = [550, 50, 120, 255, 620, 30, 110, 261, 1, 350, 570, 560, 160, 280, 240, 270, 3002, 170, 150, 600, 250, 180, 10, 11, 220, 20, 580, 3001, 610, 400];
      const exportedText = $(input).find("dd:first-child").text().trim();
      const exported = (exportedText == "Exportovat" || exportedText == "Vyexportováno, ověřit");
      const dayOfLastExport = $(input).find("dd:last-child").text().trim();
      const id = serverListIds[indexCell-2]; // servers starts from 3nd column, thats why indexCell is shift by -2
      return {export:exported,dayOfLastExport,id};
    }
    var columns = [false,true,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc,fnc];
    nextapp.loadTable(baseUrl, columns, 1)
    .then((table) => {
      resolve(table);
    }).catch((error) => {
      reject(error);
    });
  });
}

ExportQueueItem.saveTable = async(table, idOfMeasuring) => {
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
  ExportQueueItem.insertMany(toDatabase);
}

module.exports = {ExportQueueItem}
