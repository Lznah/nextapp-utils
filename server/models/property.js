const fs = require("fs");
const path = require('path');
var request = require('request').defaults({
  jar: true,
  headers: {
    agentOptions: {
      ca: fs.readFileSync(process.env.NEXTAPP_CERTIFICATE)
    }
  }
});
const $ = require('cheerio');

class Property{
  constructor(id) {
    this.fakeID = id;
    this.loadCodelist();
  }

  loadCodelist() {
    let codelistPath = path.join(__dirname, '..', 'codelist', 'listings.json');
    this.codelist = JSON.parse(fs.readFileSync(codelistPath), 'utf8');
  };

  run() {
    return new Promise( (resolve, reject) => {
      this.getTrueID()
      .then( async (trueID) => {
        let promises = [
          this.crawlBasicInfoPage(),
          this.crawlBrokerPage(),
          this.crawlPricePage()
        ];
        var array = await Promise.all(promises);
        let compoundObject = Object.assign(array[0], array[1], array[2]);
        console.log(compoundObject);
        resolve(compoundObject);
      }).catch((status) => {
        reject(status);
      });
    });
  }

  crawlByCodelist(page, html) {
    let object = {};
    for(let [key, element] of Object.entries(this.codelist[page])) {
      let ebranaName = element.ebrana.name;
      let nextappName = element.nextapp.name;
      let value = $(`[name='${nextappName}']`, html).val();
      if(typeof element.codes !== "undefined") {
        value = element.codes[value].in_ebrana;
      }
      object[ebranaName] = value;
    };
    return object;
  }

  crawlBasicInfoPage() {
    return new Promise((resolve, reject) => {
      this.downloadPropertyPage('basic-info')
      .then((html) => {
        let formHtml = $('#listing', html);
        let inputs = this.crawlByCodelist("basic-info", formHtml);
        inputs['name_en'] = `${this.fakeID} ${inputs['name_en']}`;
        resolve(inputs);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  crawlBrokerPage() {
    return new Promise((resolve, reject) => {
      this.downloadPropertyPage('broker')
      .then((html) => {
        let formHtml = $('#brokerCanvas', html);
        console.log($(".fl li strong:contains('Vlastník:')", formHtml)
                      .text());
        let inputs = {
          users_text: $(".fl li strong:contains('Vlastník:')", formHtml)
                        .parent()
                        .text()
                        .replace("Vlastník:", "")
                        .trim()
        };
        resolve(inputs);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  crawlPricePage() {
    return new Promise((resolve, reject) => {
      this.downloadPropertyPage('price')
      .then((html) => {
        let formHtml = $('#listing', html);
        let inputs = this.crawlByCodelist("price", formHtml);
        resolve(inputs);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  downloadPropertyPage(pageName) {
    return new Promise( (resolve, reject) => {
      request({
        url: `https://nextapp.cz/listing/${this.trueID}/edit/${pageName}`,
        method: 'GET'
      }, (error, response, html) => {
        if(error) {
          reject({
            status: 500,
            text: `Could not download page: ${pageName} Error: ${error}`
          });
        }
        if(response.statusCode != 200) {
          reject({
            status: 500,
            text: `Server responded with unsupported status code: ${response.statusCode}`
          });
        }
        resolve(html);
      });
    });
  }

  getTrueID() {
    return new Promise((resolve, reject) => {
      request({
        url: 'https://nextapp.cz/search',
        method: 'GET',
        followAllRedirects: true,
        qs: {
          'search-input': this.fakeID
        }
      }, (error, response, body) => {
        let pattern = /https:\/\/nextapp.cz\/listing\/([0-9]*)\/show/;
        if( !pattern.test(response.request.uri.href) ) {
          reject({
            text: `Could not find ID '${this.fakeID}'`,
            status: 404
          });
        } else {
          let trueID = response.request.uri.href.match(pattern)[1];
          this.trueID = trueID;
          console.log(trueID);
          resolve(trueID);
        }
      });
    });
  }

  fieldDecode({fieldName, fieldText}) {
    for(let [code, codeInfo] of Object.entries(this.codelist[fieldName].codes)) {
      if(codeInfo.nextappTitle === fieldText) {
        return code;
      }
    }
    throw "Code not found";
  }
}

module.exports = Property;
