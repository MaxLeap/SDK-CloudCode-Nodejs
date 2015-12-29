var ML = require('../index.js');
var expect = require('expect.js');

ML.initialize('56273907169e7d0001bd5c92', 'TXV4MFB2SFFQdVpPSjJKYnFtSVdlUQ');
ML.useCNServer();

var GameScore = ML.Object.extend('GameScore');
var Post = ML.Object.extend('Post');
var Comment = ML.Object.extend('Comment');
var Person = ML.Object.extend('Person');
var query = new ML.Query(GameScore);

describe('Queries',function(){
  describe('#Basic Queries',function(){
    it('should return Class Array',function(done){
      query = new ML.Query(GameScore);
      query.limit(10);
      query.ascending("score");
      query.exists("name");

      query.find().then(function(results){
        expect(results).to.be.an('array');
        done();
      }).catch(done);
    });

    it('should return an object',function(done){
      query = new ML.Query(GameScore);
      query.first().then(function(result){
        expect(result).to.be.ok();
        done();
      }).catch(done);
    });

    it('should return count',function(done){
      query = new ML.Query(GameScore);
      query.count().then(function(result){
        expect(result).to.be.an('number');
        done();
      }).catch(done);
    });

    it('select && fetch', function(done){
      query = new ML.Query(GameScore);
      query.select('name', 'score');
      query.first().then(function(result){
        result.fetch().then(function(obj){
          expect(obj).to.be.ok();
          done();
        });
      }).catch(done);
    });
  });

});
