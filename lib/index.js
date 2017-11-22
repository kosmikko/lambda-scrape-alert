const got = require('got');
const cheerio = require('cheerio');
const numberRx = new RegExp('[^0-9-,.]', ['g']);
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36';

const unformat = (exports.unformat = function(value) {
  return parseFloat(value.replace(numberRx, '').replace(',', '.'));
});

const getPrice = (exports.getPrice = function(id) {
  const url = `http://hintaseuranta.fi/tuote/${id}`;
  const reqOpts = { headers: { 'user-agent': UA } };
  const parseOpts = { withDomLvl1: true, decodeEntities: true };
  console.log('fetching url', url);
  return got(url, reqOpts)
    .then(resp => {
      $ = cheerio.load(resp.body, parseOpts);
      var title = $('title').text();
      var price = unformat(
        $('.product-summary-price')
          .text()
          .replace(/\s+/g, '')
          .split('€')[0]
      );
      return { price: price, title: title, url: url, id: id };
    })
    .catch(err => {
      console.log('failed to fetch %s \n %s', url, err.response.body);
      return Promise.reject(err);
    });
});
