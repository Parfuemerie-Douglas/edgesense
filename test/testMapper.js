var expect    = require("chai").expect;
var Mapper = require("../Preprocessor/handler").Mapper;

describe("Preprocessor", function() {

  var mapper;

  before(function(done){
    mapper = new Mapper();
    mapper.mappingRules.push( { "id": "Productbrand", regex: new RegExp("(.*)productbrand_(.*).html(.*)") });
    mapper.mappingRules.push( { "id": "Category", regex: new RegExp("(.*)\/index_(.*).html") });
    mapper.mappingRules.push( { "id": "Search", regex: new RegExp("\/search.html(.*)") });
    mapper.mappingRules.push( { "id": "Json", regex: new RegExp("^\/json\/(.*)") });
    mapper.mappingRules.push( { "id": "JS", regex: new RegExp("^\/js\/(.*)") });
    mapper.mappingRules.push( { "id": "Homepage", regex: new RegExp("^\/$|^\/index.html$") });
    mapper.mappingRules.push( { "id": "AppleAppSiteAssociation", regex: new RegExp("\/.well-known\/apple-app-site-association") });
    mapper.mappingRules.push( { "id": "Media", regex: new RegExp("^\/media\/(.*)|^\/medias\/(.*)") });
    mapper.mappingRules.push( { "id": "Unknown", regex: new RegExp("(.*)") });
    done();        
  });

  describe("Map URL to Id", function() {
    it("maps URLs according to rules", function() {
      expect(mapper.mapUrlToId("/index_abc.html")).to.equal("Category");
      expect(mapper.mapUrlToId("/Lots-of-SEO-test-and-brand-123-content-before_productbrand_123456.html")).to.equal("Productbrand");
      expect(mapper.mapUrlToId("/search.html")).to.equal("Search");
      expect(mapper.mapUrlToId("/js/deep/path/script.js")).to.equal("JS");
      expect(mapper.mapUrlToId("/")).to.equal("Homepage");
      expect(mapper.mapUrlToId("/index.html")).to.equal("Homepage");
      expect(mapper.mapUrlToId("/index.htmla")).to.equal("Unknown");
      expect(mapper.mapUrlToId("/.well-known/apple-app-site-association")).to.equal("AppleAppSiteAssociation");
      expect(mapper.mapUrlToId("/media/abc/de")).to.equal("Media");
      expect(mapper.mapUrlToId("/medias/abc/de")).to.equal("Media");
      expect(mapper.mapUrlToId("")).to.equal("Unknown");
    });
  });

  describe("Log line parsing", function() {
    it("parses well-formed log lines", function() {
      expect(mapper.mapLogLine("2018-09-21\t07:59:03\t1.2.3.4\tGET\t/Mots-of-SEO-test-and-brand-123-content-before_productbrand_123456.html" + 
        "\t200\t28201\t1185\t\"https://www.example.abc/referer.html\"\t" + 
        "\"Mozilla/5.0" +
        "\"\t\"-\"\t\"-\"\twww.example.abc")).to.contain("\tProductbrand");
    });

    it("deals with tab characters in logs", function() {
      expect(mapper.mapLogLine("2018-09-21\t07:59:03\t1.2.3.4\tGET\t/Mots-of-SEO-test-and-brand-123-\\tcontent-before_productbrand_123456.html" + 
      "\t200\t28201\t1185\t\"https://www.example.abc/referer.html\"\t" + 
      "\"Mozilla/5.0" +
      "\"\t\"-\"\t\"-\"\twww.example.abc")).to.contain("\tProductbrand");
    });

    it("throws error for too short lines", function() {
      expect(() => mapper.mapLogLine("2018-09-21\t07:59:03\t1.2.3.4\tGET\t")).to.throw();
    });

    it("deals gracefully with empty URLs", function() {
      expect(mapper.mapLogLine("2018-09-21\t07:59:03\t1.2.3.4\tGET\t\t\t\t\t\t\t\t")).to.contain("\tUnknown");
    });
  });
});