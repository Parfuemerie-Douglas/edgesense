'use strict';

const domain = "www.example.abc";

const returnCodes = [
    { value: "200", probability: 0.8 },
    { value: "301", probability: 0.05 },
    { value: "401", probability: 0.05 },
    { value: "404", probability: 0.08 },
    { value: "500", probability: 0.01 },
    { value: "503", probability: 0.01 },
];

const URLPrefixes = [
    { value: "/test_product_123456.html", probability: 0.3 },
    { value: "/test_index_c123456.html", probability: 0.3 },
    { value: "/test_productbrand_3001050747.html", probability: 0.1 },
    { value: "/json/checkout/api.js", probability: 0.3 },    
]

class RandomData {
    constructor() {
    }

    probability(n) {
        return !!n && Math.random() <= n;
    }
    
    // Takes an array of entries of the form { value: object, probability: 0.5 }. The sum of probabilities needs to be 1 or lower.
    probably(matrix)
    {
        const random = Math.random();
        var threshold = 0;
        for(var i = 0; i < matrix.length; i++)
        {
            const entry = matrix[i];            
            threshold += entry.probability;            
            if (random < threshold)
            {
                return entry.value;
            }
        }
        return null;
    }

    randomHexString(numCharacters) {
        var text = "";
        var possible = "abcdef0123456789";
      
        for (var i = 0; i < numCharacters; i++)
          text += possible.charAt(Math.floor(Math.random() * possible.length));
      
        return text;
    }

    randomNumber(max) {
        return Math.trunc(Math.random() * max);
    }

    returnCode()
    {
        return this.probably(returnCodes);
    }

    URL()
    {
        return this.probably(URLPrefixes);
    }
    
    generateRecord()
    {
        const timestamp = new Date().getTime();
        
        const entry = {
            "type": "Raw",
            "id":"362",
            "start": timestamp,
            "cp":"341213",
            "reqid": this.randomHexString(8),
            "guid": this.randomHexString(18),
            "netPerf": {
                "downloadTime": this.randomNumber(3000).toString()
            },
            "message": {
                "status": this.returnCode(),
                "cliIP": this.randomNumber(256) + "." + this.randomNumber(256) + "." + this.randomNumber(256) + "." + this.randomNumber(256),
                "reqHost": domain,
                "reqMethod": "GET",
                "reqPath": this.URL(),
                "bytes": this.randomNumber(40000).toString(),
                "UA": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0.1 Safari/605.1.15"
            },
            "reqHdr": {
                "referer":"https://" + domain + this.URL()
            },
            "respHdr":{}
        }


        return JSON.stringify(entry);
        
        /*'{"type":"Raw","id":"362","start":' + timestamp + ',"cp":"341213","reqid":"179caf74","guid":"740100237d179caf74",' + 
        '"netPerf":{"downloadTime":"2679"},"message":{"status":"' + status + '","cliIP":"2003:f4:63f5:eaf5:41ec:e799:5de6:bae0",' + 
        '"reqHost":"' + domain + '","reqMethod":"GET","reqPath":"/test_productbrand_3001050747.html",' + 
        '"bytes":"35965","UA":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0.1 Safari/605.1.15"},' + 
        '"reqHdr":{"referer":"https://' + domain + '/test_productbrand_3001050747.html"},' + 
        '"respHdr":{}}\n';*/
    }
}

module.exports = RandomData;