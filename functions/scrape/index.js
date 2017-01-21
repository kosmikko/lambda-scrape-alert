const aws = require('aws-sdk');
const λ = require('apex.js');
const lib = require('../../lib');
const config = require('../../config');

const ses = new aws.SES({region: config.aws_region});

function sendEmail(data) {
  const subject = `Alert: ${data.title}`;
  const params = {
    Destination: {ToAddresses: [config.email_to]},
    Message: {
      Body: {Text: {Data: JSON.stringify(data)}},
      Subject: {Data: subject}
    },
    Source: config.email_from
  };
  console.log('sending email...', params);
  return new Promise(function(resolve, reject) {
    ses.sendEmail(params, function(err, sendresult) {
      if (err) return reject(err);
      return resolve(sendresult);
    });
  });
}

exports.default = λ(e => {
  console.log('check alerts', config.checks, e);
  const checks = config.checks.map(check => {
    return lib.getPrice(check.id).then(priceData => {
      console.log('got price %j', priceData);
      const shouldAlert = priceData.price <= check.limit;
      priceData.shouldAlert = shouldAlert;
      return priceData;
    });
  });
  return Promise.all(checks).then(results => {
    const sends = results.reduce(
      (fns, priceData) => {
        if (!priceData.shouldAlert) {
          return fns;
        }
        return fns.concat(sendEmail(priceData));
      },
      []
    );
    if (sends.length === 0) {
      console.log('nothing to alert');
      return Promise.resolve({result: 'nothing to alert', priceData: results});
    }
    return Promise.all(sends);
  });
});
