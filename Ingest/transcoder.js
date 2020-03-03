const moment = require('moment');

/*
    Parses JSON objects from the CDN and delivers them in a W3C log format (TSV).
    Example data: see the test data generation scripts
*/
class Transcoder {
    constructor() {
    }
    
    safeDecodeURIComponent(s)
    {
        try
        {
            return decodeURIComponent(s);
        }
        catch(e)
        {
            return s;
        }
    }

    tsvEscape(s)
    {
        // TSV disallows tabs in field values, choosing to replace with space here
        return s.replace(/\t/g, ' ');
    }

    tsvQuotedEscape(s)
    {
        return s.replace(/\t/g, '\\t').replace(/"/g, '\\\"');
    }

    encode(record)
    {
        try
        {
            // date time cs-ip cs-method cs-uri sc-status sc-bytes time-taken cs(Referer) cs(User-Agent) cs(Cookie) x-wafinfo
            // assume "start" time is delivered as Unix Timestamp with fractional seconds (milliseconds)
            var requestDate = moment(Number(record.start)).utc();
            var result =  requestDate.format('YYYY-MM-DD') + "\t";
            result = result + requestDate.format('HH:mm:ss') + "\t";
            result = result + this.tsvEscape(record.message.cliIP) + "\t";
            result = result + this.tsvEscape(record.message.reqMethod) + "\t";
            result = result + this.tsvEscape(this.safeDecodeURIComponent(record.message.reqPath)) + "\t";
            result = result + this.tsvEscape(record.message.status) + "\t";
            result = result + this.tsvEscape(record.message.bytes) + "\t";
            // Seems that netPerf can be delivered empty
            if ((typeof record.netPerf != 'undefined') && (typeof record.netPerf.downloadTime != 'undefined'))
                result = result + this.tsvEscape(record.netPerf.downloadTime) + "\t";
            else
                result = result + "0\t";                
            if( (typeof record.reqHdr != 'undefined') && (typeof record.reqHdr.referer != 'undefined')) 
                result = result + "\"" + this.tsvQuotedEscape(this.safeDecodeURIComponent(record.reqHdr.referer)) + "\"\t";
            else
                result = result + "\"-\"\t";
            if( typeof record.message.UA != 'undefined')
                result = result + "\"" + this.tsvQuotedEscape(this.safeDecodeURIComponent(record.message.UA)) + "\"\t";
            else
                result = result + "\"-\"\t";
            // Cookie
            result = result + "\"-\"\t";
            // Wafinfo
            result = result + "\"-\"\t"; 
            // Host
            result = result + this.tsvEscape(record.message.reqHost) + "\t";  
            // Cache hit
            if((typeof record.cache != 'undefined') && (typeof record.cache.cacheHit != 'undefined'))
                result = result + this.tsvEscape(record.cache.cacheHit) + "\n";
            else
                result = result + "0\n";
            return result; 
        }
        catch(err)
        {
            console.log("Error in parsing log line: " + err + ". Offending line:\n" + JSON.stringify(record, null, 2));
            throw err;
        }
    }
}

module.exports = Transcoder;