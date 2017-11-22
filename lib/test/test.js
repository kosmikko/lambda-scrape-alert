const test = require('blue-tape').test;
const lib = require('../index');
const unformat = lib.unformat;
const getPrice = lib.getPrice;

test('number parsing', function(t) {
  const testCases = [
    { input: '325,33 \u20AC', expected: 325.33 },
    { input: '123', expected: 123 }
  ];
  testCases.forEach(function(tc) {
    t.equal(unformat(tc.input), tc.expected);
  });
  t.end();
});

test('getPrice', function(t) {
  return getPrice('2927419').then(priceData => {
    console.log(priceData);
  });
});
