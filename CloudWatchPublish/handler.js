'use strict';
const async = require('async');
const AWS = require('aws-sdk');

AWS.config.update({retryDelayOptions: {base: 300}});

var CloudWatch = new AWS.CloudWatch({maxRetries: 5, retryDelayOptions: {base: 300} });


function noUndefined(value)
{
  if (typeof value == 'undefined')
    return 'undefined';
  else
    if (value == null)
      return 'undefined'
    else
      if (value.toString() == '')
        return 'undefined';
      else
        return value;
}

/*
   Expects the following input datastructure:

  {
    METRICNAME
    HOST
    URLPATTERNID
    NAMESPACE
    EVENTTIMESTAMP
    RESPONSECODE
    UNIT
    UNITVALUE
  }
*/
function cloudWatchPublish(record, callback)
{
    //console.log("CloudWatchPublish: metric name " + record.METRICNAME);
    var params = null;
    try
    {
      params = {
        MetricData: [ 
          {
            MetricName: record.METRICNAME, 
            Dimensions: [
              {
                Name: 'ResponseCode', 
                Value: noUndefined(record.RESPONSECODE.toString())
              },
              {
                Name: 'Host', 
                Value: noUndefined(record.HOST.toString())
              },            
              {
                Name: 'UrlPatternId', 
                Value: record.URLPATTERNID || noUndefined(record.URLPATTERNID)
              }
            ],
            Timestamp: new Date(record.EVENTTIMESTAMP), 
            Unit: record.UNIT,     
            Value: record.UNITVALUE
          }
          // 
        ],
        Namespace: record.NAMESPACE 
      };
    }
    catch(e)
    {
      /* Kinesis will resend records that were reported as not processed correctly; however with invalid data records (e.g. RESPONSECODE==null),
          this will lead to a loop of resending and partially processing data. Instead, we choose to catch any exceptions and accept that they
          will be missing in result data, rather than causing incorrect data from processing resent inputs multiple times. */         
          console.log("Exception while processing input record: ", e);          
    }      
      //console.log("Put metric: " + JSON.stringify(params));

    if (params != null)
      CloudWatch.putMetricData(params, callback);
    else
      callback(null, null);
}

function pushToCloudWatch(record, callback)
{
    var payload = new Buffer(record.data, 'base64').toString('ascii');
    //console.log('New version - Decoded payload:', payload);
    var payloadObject = JSON.parse(payload);
    cloudWatchPublish( payloadObject, function(err, data) {
        if (err)
        {  
           console.log("Error during CloudWatch metrics delivery: " + err, err.stack); 
           callback(err, {
                      recordId: record.recordId,
                      result: 'DeliveryFailed',
                  });         
        }
        else
        {
           callback(null, {
                      recordId: record.recordId,
                      result: 'Ok',
                  });
        }
    });    
}
           
module.exports.CloudWatchPublish = (event, context, callback) => {
  console.log("CloudWatchPublish called with " + event.records.length + " records.");
    
  async.mapLimit(event.records, 5, pushToCloudWatch, (err, result) => {
      const errorCount = result.filter((item) => { item.result == 'DeliveryFailed' }).length;
      console.log("Mapping records complete, " + errorCount + " errors.");   
      callback(null, { records: result } );
    }
  );           
};
