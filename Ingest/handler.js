'use strict';

const AWS = require('aws-sdk');
const zlib = require('zlib');
const async = require('async');
const moment = require('moment');
const Transcoder = require('./transcoder');

const config = {
    firehoseStream: process.env.FIREHOSE_STREAM,
};

AWS.config.update({
    region: process.env.REGION,
});

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const firehose = new AWS.Firehose({ apiVersion: '2015-08-04' });

class FirehoseOutput {
    constructor() {
        this.firehoseRecordsSent = 0;
        this.firehoseRecordsFailures = 0;

        var self = this;
        this.firehoseQueue = async.queue((task, callback) => {
            var params = {
                Records: task.Data,
                DeliveryStreamName: task.Stream
            };

            firehose.putRecordBatch(params, function (err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else {
                    self.firehoseRecordsSent += params.Records.length;
                    self.firehoseRecordsFailures += data.FailedPutCount;
                    console.log("Sent " + self.firehoseRecordsSent + " records with " + self.firehoseRecordsFailures + " failures ..");
                    // TODO: Need to resend records that were flagged with an error
                    callback();           // successful response
                }
            });
        }, 10);
        this.firehoseQueue.drain = () => {
            console.log("Records sent to Firehose: " + self.firehoseRecordsSent);
        }
    }
}

const firehoseOutput = new FirehoseOutput();

console.log("Config: " + JSON.stringify(config));

module.exports.read = (event, context, callback) => {

    // Objects in S3 are gzip encoded; it consists of individual lines separated with \n (LF)
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key,
    };
    s3.getObject(params, (err, data) => {
        if (err) {
            console.log(err);
            const message = `Error getting object ${key} from bucket ${bucket}. Make it exists and your bucket is in the same region as this function.`;
            console.log(message);
            callback(message);
        } else {
            console.log(`Retrieved object: LastModified="${data.LastModified}" ContentLength=${data.ContentLength}`);
            const payload = data.Body;

            zlib.gunzip(payload, (err, result) => {
                if (err) {
                    console.log(err);
                    callback(err);
                } else {
                    try {
                        const parsed = result.toString('ascii');
                        const logEvents = parsed.split('\n');
                        let count = 0;
                        let time;

                        if (logEvents) {
                            var buffer = [];
                            const transcoder = new Transcoder();
                            logEvents.forEach((logEntry) => {
                                if (logEntry) {
                                    var logObject;
                                    try {
                                        logObject = JSON.parse(logEntry);
                                    }
                                    catch (e) {
                                        console.log("Encountered invalid JSON oject: " + logEntry);
                                    }

                                    if (logObject) {
                                        buffer.push({ Data: transcoder.encode(logObject) });
                                        if (buffer.length == 400) {
                                            firehoseOutput.firehoseQueue.push({ Stream: config.firehoseStream, Data: buffer });
                                            buffer = [];
                                        }
                                        count += 1;
                                    }
                                }
                            });
                            console.log(`Processed ${count} log entries`);
                        }
                        // flush remaining buffer
                        if (buffer.length > 0)
                            firehoseOutput.firehoseQueue.push({ Stream: config.firehoseStream, Data: buffer });
                        callback(null, count); // Echo number of events forwarded
                    }
                    catch (err) {
                        console.log("Caught exception");
                        console.log(err);
                        callback(err);
                    }
                }
            });
        }
    });
};