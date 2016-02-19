/**
 * Creates a provider for panoramic images
 * @class Manage the panoramic provider (url, request)
 * @author alexandre devaux IGN
 * @requires ThreeJS
 * 
 */ 
 define (['three', 'Utils', 'jquery', 'lib/when'], function ( THREE, Utils, $, when) {
    
        
    var _urlPano = "",
        _urlImage = "",
        _urlCam = "",
        _panoramicsMetaData;
    
    
    var PanoramicProvider =  {

        init: function(options){
            
            _urlPano  = options.pano;
            _urlImage = options.url;
            _urlCam   = options.cam;
        },
        
        getMetaDataFromPos: function(easting, northing, distance){
                if(!_panoramicsMetaData){
                  
                    var requestURL = _urlPano;    // TODO : string_format
                    return new Promise(function(resolve, reject) {

                      var req = new XMLHttpRequest();
                      req.open('GET', requestURL);

                      req.onload = function() {

                            if (req.status === 200) {
                                
                                _panoramicsMetaData = JSON.parse(req.response);
                                var closestPano = PanoramicProvider.getClosestPanoInMemory(easting, northing, distance);
                                resolve(closestPano);
                            }
                            else {
                              reject(Error(req.statusText));
                            }
                      };

                      req.onerror = function() {
                            reject(Error("Network Error"));
                      };

                      req.send();
                    });
                    
                    }else{          // Trajectory file already loaded
                        
                         var closestPano = PanoramicProvider.getClosestPanoInMemory(easting, northing, distance);
                         return new Promise(function(resolve, reject) {resolve(closestPano);});
                    }
        },
        
        // USING MEMORISED TAB or JSON ORI
        getClosestPanoInMemory: function(easting, northing, distance){
            
            var indiceClosest = 0;
            var distMin = 99999;
            for (var i=0; i< _panoramicsMetaData.length; ++i){
                
                var p = _panoramicsMetaData[i];
                var dist = Math.sqrt( (p.easting - easting) * (p.easting - easting) + (p.northing - northing) * (p.northing - northing) );
                if(dist< distMin) {indiceClosest = i; distMin = dist;}
            }
            return [_panoramicsMetaData[indiceClosest]];
        },
        
        getUrlImageFile: function(){
            return _urlImage;
        },
        
        getMetaDataSensorURL: function(){
            return _urlCam;
        }
        
    };
    return PanoramicProvider;

});
