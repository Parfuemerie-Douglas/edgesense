var expect    = require("chai").expect;
var Transcoder = require("../Ingest/transcoder");

describe("Transcoder", function() {

  var transcoder = new Transcoder();

  describe("Map URL to Id", function() {    
    it("delivers correct CSV", function() {
        var logObject = {
            "id": "1100",
            "reqid": "39b297ac",
            "guid": "34d612021b339b297ac",
            "type": "Raw",
            "cp": "344739",
            "start": "1583164435474",
            "processedTime": "1583164444200",
            "message": {
                "cliIP": "1.2.3.4",
                "reqMethod": "GET",
                "bytes": "768",
                "reqHost": "www.domain.com",
                "UA": "Mozilla/5.0 (iPad; CPU OS 5_1_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9B206 Safari/7534.48.3",
                "reqPath": "/my/long/url",
                "status": "200"
            },
            "reqHdr": {
                "referer": "https://www.domain.com/my/long/url2"
            },
            "netPerf": {
                "downloadTime": "6"
            },
            "cache": {
                "cacheHit": "1"
            }
        }

        expect(transcoder.encode(logObject)).to.equal('2020-03-02\t15:53:55\t1.2.3.4\tGET\t/my/long/url\t200\t768\t6\t"https://www.domain.com/my/long/url2"\t"Mozilla/5.0 (iPad; CPU OS 5_1_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9B206 Safari/7534.48.3"\t"-"\t"-"\twww.domain.com\t1\n');
    });

    it("can deal with objects missing cache info", function() {

        var logObject_without_cache = {
            "id": "1100",
            "reqid": "39b297ac",
            "guid": "34d612021b339b297ac",
            "type": "Raw",
            "cp": "344739",
            "start": "1583164435474",
            "processedTime": "1583164444200",
            "message": {
                "cliIP": "1.2.3.4",
                "reqMethod": "GET",
                "bytes": "768",
                "reqHost": "www.domain.com",
                "UA": "Mozilla/5.0 (iPad; CPU OS 5_1_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9B206 Safari/7534.48.3",
                "reqPath": "/my/long/url",
                "status": "200"
            },
            "reqHdr": {
                "referer": "https://www.domain.com/my/long/url2"
            },
            "netPerf": {
                "downloadTime": "6"
            }
        };

        expect(transcoder.encode(logObject_without_cache)).to.equal('2020-03-02\t15:53:55\t1.2.3.4\tGET\t/my/long/url\t200\t768\t6\t"https://www.domain.com/my/long/url2"\t"Mozilla/5.0 (iPad; CPU OS 5_1_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9B206 Safari/7534.48.3"\t"-"\t"-"\twww.domain.com\t0\n');
    });
  });
});