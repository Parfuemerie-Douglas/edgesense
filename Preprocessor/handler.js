'use strict';
const zlib = require('zlib');
const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.REGION,
});

var dynamodb = new AWS.DynamoDB();

// Allow content of Regexp objects to be logged as JSON 
Object.defineProperty(RegExp.prototype, "toJSON", {
    value: RegExp.prototype.toString
});

class Mapper {
    constructor() {
        this.mappingRules = [];
        this.cache = {
            data: null,
            expiration: null,
        };
        this.tableName = process.env.DYNAMODB_TABLE_NAME;
    }

    loadMappingRules(callback)
    {
        if (this.cache.expiration && (new Date().getTime() < this.cache.expiration))
        {
            //console.log("Using mapping rules from cache");
            callback(null, this.cache.data);
        }
        else
        {
            console.log("Loading mapping rules from DynamoDb table " + this.tableName);
            var params = {
                TableName: this.tableName
            };
            this.mappingRules = [];
            var self = this;
            dynamodb.scan(params, function(err, data) {
                //console.log("Loaded mapping rules from DynamoDb");
                if (err)
                {
                    console.log("Error fetching mapping rules: " + err);
                    callback(err, null);
                }
                else
                {
                    data.Items.forEach((record) => { 
                        try
                        {
                            self.mappingRules.push( { "id": record.Id.S, regex: new RegExp(record.Regex.S), rank: record.Rank.N });
                        }
                        catch(err)
                        {
                            console.log("Could not load rule: " + err);
                        }
                        
                    });
                    self.mappingRules.sort((a, b) => { return a.rank - b.rank; });
                    console.log(JSON.stringify(self.mappingRules));
                    self.cache.data = self.mappingRules;
                    self.cache.expiration = new Date().getTime() + 10 * 60 * 1000; // 10 minutes TTL                
                    callback(null, self.mappingRules);
                }
            });        
        }
    }

    mapUrlToId(url)
    {
        var returnId = null;
        var matched = this.mappingRules.some((rule) => {
            returnId = rule.id;
            if (url.match(rule.regex) != null)
                return true;
            else
                return false;
        });

        if (matched)
            return returnId;
        else
            return null;
    }

    mapLogLine(stringData)
    {
        //console.log("Input: '" + stringData + "'");
        // 1 Logdate 2 Logtime 3 client_ip 4 method 5 path 6 status 7 bytes 8 time_taken 9 referer 10 user_agent 11 cookie 12 wafinfo 13 host 14 cache
        const matches = stringData.match(/([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)/);
        if (!matches || matches.length < 10)
        {
            console.log("Invalid input format: URI Encoded string - " + encodeURI(stringData));
            throw "Invalid input format";
        }

        const url = matches[5];
        //console.log("URL: " + url);
        //console.log("Mapping result: " +  this.mapUrlToId(url));
        const result = (stringData.substring(0, stringData.length - 1) + "\t" + this.mapUrlToId(url) + "\n");
        //console.log("Output: '" + result + "'");        
        return result;
    }
}

var mapper = new Mapper();

module.exports.process = (event, context, callback) => {
    let success = 0; // Number of valid entries found
    let failure = 0; // Number of invalid entries found
    //console.log("Function starting");
    mapper.loadMappingRules((err, mappingRules) => {
        //console.log("Mapping rules loaded, starting processing");
        /* Process the list of records */
        const output = event.records.map((record) => {
            try {
                /* Data is base64-encoded, so decode here */
                //console.log("Raw input: " + record.data);
                const stringData = Buffer.from(record.data, 'base64').toString();
                const result = mapper.mapLogLine(stringData);
                success++;
                return {
                    recordId: record.recordId,
                    result: 'Ok',
                    // add mapUrlToId result to data set
                    data: Buffer.from(result, 'utf8').toString('base64'),
                };
            } catch (err) {
                console.log("Error: " + err);
                failure++;
                return {
                    recordId: record.recordId,
                    result: 'ProcessingFailed',
                    data: record.data,
                };
            }
        });
        console.log("Processing completed.  Successful records " + success + ", Failed records " + failure);
        //console.log("Return object: " + JSON.stringify(output));
        return callback(null, {
            records: output,
        });
    });
};

module.exports.Mapper = Mapper;