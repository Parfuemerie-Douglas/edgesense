Source format: date time cs-ip cs-method cs-uri sc-status sc-bytes time-taken cs(Referer) cs(User-Agent) cs(Cookie) x-wafinfo

## Create the database

CREATE DATABASE edgesense

## Creating a partitioned table:

Raw logs:

```
CREATE EXTERNAL TABLE `edgesense.raw`(
  `logdate` date, 
  `logtime` string, 
  `clientip` string, 
  `method` string, 
  `uri` string, 
  `status` string, 
  `bytes` int, 
  `time_taken` int, 
  `referer` string, 
  `user_agent` string, 
  `cookie` string, 
  `wafinfo` string, 
  `host` string,
  `cache` int)
PARTITIONED BY ( 
  `month` string)
ROW FORMAT DELIMITED 
  FIELDS TERMINATED BY '\t' 
LOCATION
  's3://[[Bucketname]]/http-logs/'
TBLPROPERTIES (
  'has_encrypted_data'='false')
```

Aggregated logs:
```
CREATE EXTERNAL TABLE `edgesense.aggregated`(
  `logtime` timestamp, 
  `namespace` string, 
  `metricname` string, 
  `host` string, 
  `responsecode` int, 
  `urlpatternid` string, 
  `unit` string, 
  `value` int)
PARTITIONED BY ( 
  `month` string)
ROW FORMAT DELIMITED 
  FIELDS TERMINATED BY ',' 
LOCATION
  's3://[[bucketname]]/http-logs-aggregated'
TBLPROPERTIES (
  'has_encrypted_data'='false')
```

## Loading partitions

Needs to be done manually for each month, but enables us to keep query costs down by only reading through data from individual months.

```  
ALTER TABLE edgesense.raw ADD IF NOT EXISTS
  PARTITION (MONTH="2018/04") location 's3://[Bucketname]/http-logs/2018/04/'
  PARTITION (MONTH="2018/05") location 's3://[Bucketname]/http-logs/2018/05/'
  PARTITION (MONTH="2018/06") location 's3://[Bucketname]/http-logs/2018/06/'
  PARTITION (MONTH="2018/07") location 's3://[Bucketname]/http-logs/2018/07/'
  PARTITION (MONTH="2018/08") location 's3://[Bucketname]/http-logs/2018/08/'
  PARTITION (MONTH="2018/09") location 's3://[Bucketname]/http-logs/2018/09/'
  PARTITION (MONTH="2018/10") location 's3://[Bucketname]/http-logs/2018/10/'
  PARTITION (MONTH="2018/11") location 's3://[Bucketname]/http-logs/2018/11/'
  PARTITION (MONTH="2018/12") location 's3://[Bucketname]/http-logs/2018/12/'
```

```
ALTER TABLE edgesense.aggregated ADD IF NOT EXISTS
  PARTITION (MONTH="2018/04") location 's3://[Bucketname]/http-logs-aggregated/2018/04/'
  PARTITION (MONTH="2018/05") location 's3://[Bucketname]/http-logs-aggregated/2018/05/'
  PARTITION (MONTH="2018/06") location 's3://[Bucketname]/http-logs-aggregated/2018/06/'
  PARTITION (MONTH="2018/07") location 's3://[Bucketname]/http-logs-aggregated/2018/07/'
  PARTITION (MONTH="2018/08") location 's3://[Bucketname]/http-logs-aggregated/2018/08/'
  PARTITION (MONTH="2018/09") location 's3://[Bucketname]/http-logs-aggregated/2018/09/'
  PARTITION (MONTH="2018/10") location 's3://[Bucketname]/http-logs-aggregated/2018/10/'
  PARTITION (MONTH="2018/11") location 's3://[Bucketname]/http-logs-aggregated/2018/11/'
  PARTITION (MONTH="2018/12") location 's3://[Bucketname]/http-logs-aggregated/2018/12/'
```

# Example queries

Top client IPs
```SELECT CLIENTIP, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/04' GROUP BY CLIENTIP ORDER BY SUM_REQUESTS DESC```

Requests by status
```SELECT STATUS, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/04' GROUP BY STATUS ORDER BY SUM_REQUESTS DESC```

Top 404 URLs
```SELECT URI, REFERER, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/04' AND STATUS='404' GROUP BY URI, REFERER ORDER BY SUM_REQUESTS DESC```

Top internal broken links
```SELECT URI, REFERER, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/04' AND STATUS='404' AND REFERER<>'"-"' GROUP BY URI, REFERER ORDER BY SUM_REQUESTS DESC```

Top redirects to "/error/notFound"
```
SELECT URI, REFERER, STATUS, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/04' AND URI='/error/notFound' 
AND REFERER<>'"-"' GROUP BY URI, REFERER, STATUS ORDER BY SUM_REQUESTS DESC
```

Top redirects to "/index.html"
```
SELECT URI, REFERER, STATUS, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/04' AND URI LIKE '/index.html%' 
AND REFERER<>'"-"' GROUP BY URI, REFERER, STATUS ORDER BY SUM_REQUESTS DESC
```

Top hosts (subdomains)
```
SELECT HOST, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/04' GROUP BY HOST ORDER BY SUM_REQUESTS DESC
```

Top user agents
```
SELECT user_agent, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/04' GROUP BY user_agent ORDER BY SUM_REQUESTS DESC
```

Visits per day by user agents claiming to be GoogleBot
```
SELECT user_agent, logdate, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH" IN ('2018/04', '2018/05') AND user_agent LIKE '%http://www.google.com/bot.html%' GROUP BY user_agent, logdate ORDER BY logdate ASC
```

Pages last crawled by user agents claiming to be GoogleBot
```
SELECT host, uri, MAX(to_iso8601(logdate) || ' ' || logtime) AS last_crawled, COUNT(*) AS sum_requests from edgesense.raw WHERE "MONTH" IN ('2018/04', '2018/05') AND user_agent LIKE '%http://www.google.com/bot.html%' AND host!='' GROUP BY host, uri ORDER BY host, uri
```

Crawl activity by hour of the day
```
SELECT logdate, SUBSTRING(logtime,1, 2) AS hour, user_agent, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH" IN ('2018/05') AND user_agent LIKE '%http://www.google.com/bot.html%' AND logdate>=DATE('2018-05-11') GROUP BY logdate, SUBSTRING(logtime,1, 2), user_agent ORDER BY logdate, hour, user_agent ASC
```

CSS requests that resulted in errors, by HTTP status
```
SELECT URI, STATUS, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/05' AND URI LIKE '%css' AND STATUS>='400' GROUP BY URI, STATUS ORDER BY SUM_REQUESTS DESC
```

Requests for mobile links to be "redirect"
```
SELECT URI, HOST, STATUS, COUNT(*) AS SUM_REQUESTS FROM edgesense.raw WHERE "MONTH"='2018/05' AND URI='/abc.html' GROUP BY URI, HOST, STATUS ORDER BY SUM_REQUESTS DESC
```

Request statistics by domain and status code
```
SELECT month, host, status, count(*)
FROM edgesense.raw 
WHERE "MONTH" IN ('2018/08') 
GROUP by month, host, status
ORDER BY month, host, status
```

Request statistics - errors by page type
```
select month, urlpatternid, sum(value) as num from edgesense.aggregated
where month='2018/08'
and metricname='ResponseCountTotal'
and responsecode>=500
group by month, urlpatternid
order by month, urlpatternid
```

Request statistics - total counts by hour
```
select date_trunc('hour',logtime) as log_hour, metricname, sum(value) as num from edgesense.aggregated
where month='2018/09'
group by date_trunc('hour',logtime), metricname
order by log_hour
```

Requests to a specific URL per hour
```
select substring(logtime,1,2) as log_hour, uri, count(*) as num from edgesense.raw
where month='2018/09'
and uri = '/abc'
group by substring(logtime,1,2), uri
order by log_hour
```