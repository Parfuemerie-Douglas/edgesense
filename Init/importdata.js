'use strict';

const fs = require('fs');
const parse = require('csv-parse');
const async = require('async');
const AWS = require('aws-sdk');

var args = process.argv.slice(2);
if (args.length < 3)
{
    console.log("Usage: node importdata.js REGION DYNAMODB_TABLENAME CSVFILENAME");
    return;
}

AWS.config.update({
    region: args[0],
});

var dynamodb = new AWS.DynamoDB();
var dynamodb_table_name = args[1];

const rs = fs.createReadStream(args[2]);

const csvParams = {
    columns : true,
    delimiter : ','
};
const parser = parse(csvParams, function(err, data) {
    console.log(JSON.stringify(data));
    var split_arrays = [], size = 25;

    while (data.length > 0) {
        let cur25 = data.splice(0, size);
        let item_data = [];

        cur25.forEach((item) => {
          item_data.push({
            "PutRequest" : {
              "Item": {
                // your column names here will vary, but you'll need do define the type
                "Id": {
                  "S": item.Id
                },
                "Regex": {
                  "S": item.Regex
                },
              }
            }
          });
        });
        split_arrays.push(item_data);
    }    

    var data_imported = false;
    var chunk_no = 1;

    async.each(split_arrays, function(item_data, callback) {        
        const params = {
            RequestItems: {}
        };
        params.RequestItems[dynamodb_table_name] = item_data;
        console.log(JSON.stringify(params));
        dynamodb.batchWriteItem(params, function(err, res, cap) {
            if (err == null) {
                console.log('Success chunk #' + chunk_no);
                data_imported = true;
            } else {
                console.log(err);
                console.log('Fail chunk #' + chunk_no);
                data_imported = false;
            }
            chunk_no++;
            callback();
        });        
    }, function() {
        console.log('all data imported....');
    });

});
rs.pipe(parser);