Edgesense: Serverless logs-to-metrics service using AWS Lambda, Kinesis and CloudWatch, optimized for processing Akamai DataStream logs
=======================================================================================================================================

- [Description](#description)
- [Deployment](#deployment)
- [Test Drive](#testdrive)
- [FAQ](#faq)
- [License](#license)

## Description
<a name="description"/>

Edgesense is a real-time streaming service that is designed to:
1. Process data delivered from Akamai (or other data sources) to an S3 bucket
2. Parse the data and additional processing, such as matching URLs to groups through regular expressions
3. Calculate metrics such as the number of total requests, number of requests by HTTP status code and URL pattern etc.
4. Send metric data to CloudWatch for alerting or visualizing

Edgesense scales well - it has been used to process up to 100 million log lines per day. It allows real-time analysis of data as well as visualizing historic data (through CloudWatch) and reasonably quick analysis of historic data (through Athena). 

Edgesense uses a number of AWS Services and resources:
* AWS Kinesis Firehose - streams
* AWS Kinesis Analytics - application
* AWS Lambda - functions
* AWS S3 - ingestion of log files, and storage of aggregated data
* AWS CloudWatch - store and retrieve metrics
* AWS Athena - ad-hoc querying on 
* AWS DynamoDb - configuring mapping rules
* AWS CloudFormation - deployment of the solution
* AWS IAM - roles

![Solution Architecture](.github/Architecture.png)

## Deployment
<a name="deployment"/>

Prerequisites:
* NPM needs to be installed
* AWS CLI needs to be installed and configured
* Serverless framework (https://serverless.com/)

Steps to deploy
1. Resolve NPM dependencies
```npm install```
2. To customize your S3 bucket names, create a file "config.dev.yml" in the root directory, and add the following lines, replacing "IDENTIFIER" with a unique string:
```
s3ingestbucketname: edgesense-ingest-dev-IDENTIFIER
s3storebucketname: edgesense-store-dev-IDENTIFIER
```
3. Deploy resources on AWS 
```sls deploy```
4. Invoke the Init function to write test configuration and start the Kinesis analytics application 
```sls invoke --function Init```

This creates a CloudFormation stack with all necessary resources in your AWS account. To un-deploy, simply delete the stack.

## Test Drive
<a name="testdrive"/>

1. Generate random test data. This simulates delivery of log data from Akamai DataStream
```node generate.js edgesense-ingest-dev-IDENTIFIER```
Note: replace IDENTIFIER with the unique string chosen for the ingestion S3 bucket above.
2. In CloudWatch, check the generated metrics in the "edgesense-dev" namespace that will start arriving after a couple of minutes
3. Create Athena tables and partitions, and use SQL to run queries on the log data (see [Athena readme](athena/README.md))
4. Customize the regular expressions used for URL pattern detection through DynamoDb, or use the import script:
```
cd Init
node importdata.js REGION DYNAMODB_TABLENAME CSVFILENAME
```

## Scalability limits

* The CloudWatch publishing function will eventually encounter rate-limiting issues in CloudWatch calls. Exponential back-off should be handled by AWS SDK; AWS support will need to be requested to raise rate limits if the rate of incoming data (and combinations of url pattern / response codes) is too high.

## Known issues and missing features

* Setup and Init
  * Give option to not create the S3 buckets in CloudFormation - most of the time, the buckets will have a longer lifecycle than the solution
* Ingest
  * Increase size of Kinesis records in PutRecordBatch to just below 5kb - Kinesis billing is based on the assumption that each record is equal to 5kb, using full 5kb would yield further cost savings
  * "WAFInfo" field needs to be configured in DataStream and passed through the pipe (not necessarily to collect metrics, rather to be able to run queries on it)
  * Tabs in URLs can still break parsing and lead to invalid values for certain fields
* Kinesis Analytics
  * Calculate anomaly scores (random forest cut trees)
* Monitoring
  * Automate creation of the a CloudWatch dashboard for monitoring of edgesense metrics
  * Automate creation of an example dashboard for generated metrics
  * Create SNS topic and alarms for errors in Lambda functions

## FAQ
<a name="faq"/>

When data is not arriving or arriving incorrectly / partially, this is what you can try:

1. Akamai DataStream: Check Akamai streaming configuration (unfortunately, there are no operational metrics yet; activate DataStream delivery to S3 in order to debug)
2. Ingestion: Check Lambda invocation metrics for the Ingest function (is the function being called?). Check CloudWatch logs to see if there are errors being logged. Check deliveries made by Firehose to the destination S3 bucket to check format and contents of data being delivered.
3. Kinesis Analytics: Check Kinesis operational metrics (CloudWatch). Go to Kinesis Analytics and check for real-time data coming in / out. Check the outbound Firehose stream  delivery metrics, and the destination S3 bucket for insight into data output.
4. Lambda preprocessing function: Check invocation metrics (CloudWatch) and logs (CloudWatch logs)
5. Delivery to CloudWatch: Check invocation metrics (CloudWatch) and logs (CloudWatch logs)

## License

See [License](LICENSE)