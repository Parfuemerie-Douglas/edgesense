'use strict';

const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.REGION,
});

var dynamodb = new AWS.DynamoDB();
var kinesisanalytics = new AWS.KinesisAnalytics();

var kinesisanalytics_name = process.env.KINESIS_ANALYTICS_NAME;
var dynamodb_table_name = process.env.DYNAMODB_TABLE_NAME;

var sample_regex = [
    { id: "Productbrand", regex: "(.*)productbrand_(.*).html(.*)" },
    { id: "Category", regex: "(.*)index_c(.*).html" },
    { id: "Product", regex: "(.*)_product_(.*)" },
    { id: "ProductOverview", regex: "^/product-overview/(.*)" },
    { id: "Api", regex: "/json/(.*)" },    
];

function writeToDynamoDb(entry)
{
    var params = {
        Item: {
         "Id": {
           S: entry.id
          }, 
         "Regex": {
           S: entry.regex
          }, 
        }, 
        ReturnConsumedCapacity: "TOTAL", 
        TableName: dynamodb_table_name
    };
    dynamodb.putItem(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log("Successfully wrote entry: " + entry.id);           // successful response
    });
}

module.exports.process = (event, context, callback) => {

    // Add Dynamodb example data
    sample_regex.forEach((entry) => { writeToDynamoDb(entry) });

    // start Kinesis Analytics Applications
    var params = {
        ApplicationName: kinesisanalytics_name,
        InputConfigurations: [ 
            {
                Id: '1.1', 
                InputStartingPositionConfiguration: {
                    InputStartingPosition: "LAST_STOPPED_POINT"
                }
            },
        ]
    };
    kinesisanalytics.startApplication(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(err);
        }
        else
        {
            console.log(data);           // successful response
            callback(null, "Success"); 
        }
    });    
}
