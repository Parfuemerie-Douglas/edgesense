'use strict';

const RandomData = require('./randomData');

const zlib = require('zlib');
const aws = require('aws-sdk');

var s3 = new aws.S3({ region: 'eu-west-1'});

var bucketName = "edgesense-ingest-dev.eu-west-1.dglecom.net";


function generateData()
{
    const randomData = new RandomData();
    var data = "";
    for (var i = 0; i < 500; i++)
        data = data + randomData.generateRecord() + "\n";
    console.log(data);
    return data;
}

function sendPacket()
{
    var data = generateData();
    zlib.gzip(data, (err, result) => {

        var objectName = "akamai/de/record_" + (new Date().toISOString()) + ".log.gz";
        console.log("Writing object '" + objectName + "' to bucket '" + bucketName + "'");
        var params = {
            Body: result,
            Bucket: bucketName, 
            Key: objectName
        };
        s3.putObject(params, function(err, data) {
             if (err) console.log(err, err.stack); // an error occurred
             else     console.log(data);           // successful response
             /*
             data = {
              ETag: "\"6805f2cfc46c0f04559748bb039d69ae\"", 
              VersionId: "Bvq0EDKxOcXLJXNo_Lkz37eM3R4pfzyQ"
             }
             */
           });
        
    });   
}

function sendForever()
{
    sendPacket();
    setTimeout(sendForever, 2000);
}

sendForever();