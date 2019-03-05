const fs = require("fs");
const path = require("path");
const $ = require('cheerio');

var request = require('request').defaults({
  jar: true,
  headers: {
    agentOptions: {
      ca: fs.readFileSync(path.join( __dirname, '..', 'certs', 'nextappcz.cer' ))
    }
  }
});

const cheerio = require("cheerio");

module.exports.sendForm = (url, formData) => {
  return new Promise((resolve, reject) => {
    request({
      url: url,
      method: 'POST',
      form: formData
    }, (error, response, html) => {
      if(error) {
        return reject({
          status: 500,
          text: `Could send export page.`
        });
      }
      if(response.statusCode != 302) {
        return reject({
          status: 500,
          text: `Server responded with unsupported status code: ${response.statusCode}`
        });
      }
      resolve();
    });
  });
}

module.exports.loadExportPage = (record) => {
  return new Promise( (resolve, reject) => {
    request({
      url: "https://nextapp.cz/listing/"+record.realID+"/edit/exports",
      method: 'GET',
    }, (error, response, html) => {
      if(error) {
        return reject({
          status: 500,
          text: `Could not download page: ${pageName} Error: ${error}`
        });
      }
      if(response.statusCode != 200) {
        return reject({
          status: 500,
          text: `Server responded with unsupported status code: ${response.statusCode}`
        });
      }
      resolve(cheerio.load(html));
    });
  });
}

module.exports.loadTable = async (url, columns, idColumn, obj) => {
  return new Promise( async (resolve, reject) => {
    try{
      var $ = await loadPage(url+"&page="+1);
      const pageCount = getNumberOfPages($);
      if(pageCount == 0) reject("No records");
      var data = getTable($, columns, idColumn);
      obj.progress = Math.round(100/pageCount);
      for(var i=2; i<=pageCount; i++) {
        var $ = await loadPage(url+"&page="+i);
        var table = getTable($, columns, idColumn);
        data["rows"] = [...data["rows"], ...table["rows"]];
        obj.progress = Math.round(100*i/pageCount);
      }
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
}

var loadPage = async (url) => {
  return new Promise(function(resolve, reject) {
    request({
      url: url,
      method: 'GET'
    }, (error, response, html) => {
      if(error) {
        return reject({
          status: 500,
          text: `Could not download page: ${pageName} Error: ${error}`
        });
      }
      if(response.statusCode != 200) {
        return reject({
          status: 500,
          text: `Server responded with unsupported status code: ${response.statusCode}`
        });
      }
      resolve(cheerio.load(html));
    });
  });
}

var getNumberOfPages = ($) => {
  var span = $("#inpage .pager-vypis span").not(".padding-right");
  if(span.length == 1) {
    return span.text().replace("z ","")
  } else {
    return 0;
  }
}

var getTable = ($, whichColumns, idColumn) => {
  var table = $("#inpage table.vypis");
  data = {
    "thead":[],
    "rows":[]
  }
  $(table).find("thead th").each(function(i, elem) {
    if(typeof whichColumns != "undefined" && whichColumns[i] == false) return true;
    data["thead"][i] = $(elem).text().trim();
  });
  $(table).find("tbody tr").each(function(indexRow, row) {
    data["rows"][indexRow] = {};
    $(row).find("td").each(function(indexCell, cell) {
      if(typeof whichColumns != "undefined" && whichColumns[indexCell] == false) return true;
      var func = (index, input) => $(input).text().trim();
      if(typeof whichColumns != "undefined" && typeof whichColumns[indexCell] == "function") {
        func = whichColumns[indexCell];
      }
      let columnName = data["thead"][indexCell];

      if(typeof idColumn != "undefined" && indexCell == idColumn) {
        let link = $(cell).find("a");
        data["rows"][indexRow]["fakeID"] = $(link).text().trim();
        data["rows"][indexRow]["realID"] = $(link).attr("href").match(/\/listing\/([0-9]*)\/edit/)[1];
      } else {
        data["rows"][indexRow][columnName] = func(indexCell, cell);
      }
    });
  });
  return data;
}
