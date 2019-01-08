'use strict';

const RandomData = require('./randomData');

const zlib = require('zlib');
const aws = require('aws-sdk');

var s3 = new aws.S3({ region: process.env.REGION});

var bucketName = process.env.BUCKET;

function generateData()
{
    const randomData = new RandomData();
    var data = "";
    for (var i = 0; i < 500; i++)
        data = data + randomData.generateRecord() + "\n";
    return data;
}

function sendPacket(callback)
{
    var data = generateData();
    zlib.gzip(data, (err, result) => {

        var objectName = "de/record_" + (new Date().toISOString()) + ".log.gz";
        console.log("Writing object '" + objectName + "' to bucket '" + bucketName + "'");
        var params = {
            Body: result,
            Bucket: bucketName, 
            Key: objectName
        };
        s3.putObject(params, callback);
        
    });   
}

function sendForever()
{
    sendPacket();
    setTimeout(sendForever, 2000);
}

module.exports.process = (event, context, callback) => {

    sendPacket(function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response

        callback(err, data);
    });
}