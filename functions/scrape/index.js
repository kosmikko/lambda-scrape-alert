const aws = require('aws-sdk');
const λ = require('apex.js');
const lib = require('../../lib');
const config = require('../../config');

const ses = new aws.SES({region: config.aws_region});
const s3 = new aws.S3({region: config.aws_region});

function saveToS3(currentState) {
  return s3
    .putObject({
      Bucket: config.s3_bucket,
      Key: config.filename,
      Body: JSON.stringify(currentState)
    })
    .promise();
}

function loadFromS3() {
  return s3
    .getObject({Bucket: config.s3_bucket, Key: config.filename})
    .promise()
    .then(data => {
      return Promise.resolve(JSON.parse(data.Body));
    })
    .catch(err => {
      if (err.code === 'NoSuchKey') {
        return Promise.resolve({});
      }
      return Promise.reject();
    });
}

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
  return ses.sendEmail(params).promise();
}

function sendEmailIfNotSent(priceData) {
  return loadFromS3().then(currentState => {
    var id = priceData.id;
    if (currentState[id] != priceData.price) {
      return sendEmail(priceData).then(() => {
        currentState[id] = priceData.price;
        return saveToS3(currentState);
      });
    }
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
        return fns.concat(sendEmailIfNotSent(priceData));
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
