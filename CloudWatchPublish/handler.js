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

var putMetricQueue;
var namespace;

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
function enqueue(record, callback)
{
    var payload = new Buffer(record.data, 'base64').toString('ascii');
    //console.log('New version - Decoded payload:', payload);
    var payloadObject = JSON.parse(payload);

    var dataPoint;    
    try
    {
      /* FIXME: This is definitely a hack; it assumes that all records belong to the same namespace, which is clearly a dangerous assumption.
        What should happen here instead is that namespace-record pairs are saved to a data structure and collated by namespace
        before sending via CloudWatch putMetric. 
      */
      namespace = payloadObject.NAMESPACE;
      dataPoint = {
        MetricName: payloadObject.METRICNAME, 
        Dimensions: [
          {
            Name: 'ResponseCode', 
            Value: noUndefined(payloadObject.RESPONSECODE.toString())
          },
          {
            Name: 'Host', 
            Value: noUndefined(payloadObject.HOST.toString())
          },            
          {
            Name: 'UrlPatternId', 
            Value: payloadObject.URLPATTERNID || noUndefined(payloadObject.URLPATTERNID)
          }
        ],
        Timestamp: new Date(payloadObject.EVENTTIMESTAMP), 
        Unit: payloadObject.UNIT,     
        Value: payloadObject.UNITVALUE
      };
    }
    catch(e)
    {
      console.log("Dropped input record due to data conversion error: ", e);          
    }      

    putMetricQueue.push(dataPoint);

    /* We will accept the risk that CloudWatch.putMetric fails later and confirm every record as processed.
       Previously, the function would return "DeliveryFailed" for records not published to CloudWatch,
       but that causes them to be retried by Kinesis and if the original error was caused by CloudWatch
       API throttling, then the retries will only make matters worse. */
    callback(null, {
      recordId: record.recordId,
      result: 'Ok',
    });
}

function sendBufferToCloudWatch(namespace, buffer, callback)
{
  var params = {
    MetricData: buffer,
    Namespace: namespace
  };
  console.log("Send to CloudWatch: namespace " + namespace + ", " + buffer.length + " data points");
  CloudWatch.putMetricData(params, callback);  
}

module.exports.CloudWatchPublish = (event, context, callback) => {
  console.log("CloudWatchPublish called with " + event.records.length + " records.");

  const BUFFER_SIZE = 20;
  var putMetricBuffer = [];
  
  /* This queue will buffer metric points and batch them for transfer to CloudWatch - there is an API request limit for putMetricData */
  putMetricQueue = async.queue((task, callback) => {
    putMetricBuffer.push(task);
    if(putMetricBuffer.length >= BUFFER_SIZE)
    {
      var transferBuffer = putMetricBuffer;
      putMetricBuffer = [];
      sendBufferToCloudWatch(namespace, transferBuffer, callback());
    }
    else
      callback();
  }, 1);

  // When the queue has been processed, we will send the last buffer and return the overall state to Kinesis
  putMetricQueue.drain = function() {
    console.log("Draining send buffer");
    if( putMetricBuffer.length > 0)
    {
      sendBufferToCloudWatch(namespace, putMetricBuffer, () => {
        console.log("Send buffer emptied");      
      });
    }
    else 
      console.log("Send buffer is empty");
  };
  
  // Write all incoming records to the queue
  async.mapLimit(event.records, 5, enqueue, (err, result) => {
      console.log(event.records.length + " records pushed to send queue, returning " + result.length + " results to Kinesis.");   
      callback(null, { records: result });
    }
  );           
};
