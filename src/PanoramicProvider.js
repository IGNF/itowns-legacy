/**
 * Creates a provider for panoramic images
 * @class Manage the panoramic provider (url, request)
 * @author alexandre devaux IGN
 * @requires ThreeJS
 * 
 */ 
 define (['three', 'Utils', 'Config', 'jquery', 'lib/when'], function ( THREE, Utils, Config, $, when) {
    
        
    var _urlMetaDataProviderPos = "",
        _urlMetaDataProviderName = "",
        _urlImageFile = "",
        _urlMetaProviderSensor = "",
        _currentMetaData = null,
        _localModeProviderPos = false,
        _localImages = false,
        _localPanoramicsMetaData = null,
        _localModeProviderSensor = false;
    
    
    var PanoramicProvider =  {

        init: function(dataURL){
            
            _urlMetaDataProviderPos  = dataURL.urlMetaDataProviderPos  ||  Config.dataURL.defaultUrlMetaDataProviderPos;
            _urlMetaDataProviderName = dataURL.urlMetaDataProviderName ||  Config.dataURL.defaultUrlMetaDataProviderName;
            _urlImageFile            = dataURL.urlImageFile            ||  Config.dataURL.defaultUrlImageFile;
            _urlMetaProviderSensor   = dataURL.urlMetaProviderSensor   ||  Config.dataURL.defaultUrlMetaProviderSensor;
            
            _localModeProviderPos    = _urlMetaDataProviderPos.indexOf("php") < 0;
            _localImages             = _urlImageFile.indexOf("www") < 0;
            _localModeProviderSensor = _urlMetaProviderSensor.indexOf("php") < 0;
        },
        
 
        
        getMetaDataPHPFromPosRequest: function(easting, northing, distance){
            
            return _urlMetaDataProviderPos + "easting=" + easting +
                     "&northing=" + northing + "&distneighbours=" + distance;
             
        },
        
        
        getMetaDataPHPFromPosJSON: function(easting, northing, distance){
            
            var request = this.getMetaDataPHPFromPosRequest(easting, northing, distance);
            $.getJSON( request, function( data ) {
                _currentMetaData = data[0];  // We get the first (and only pano)
                return _currentMetaData;
            });
           
        },
        
        
        
        
        getMetaDataFromPos: function(easting, northing, distance){
            
            if(!_localModeProviderPos){
                var requestURL = this.getMetaDataPHPFromPosRequest(easting, northing, distance);

                return new Promise(function(resolve, reject) {

                  var req = new XMLHttpRequest();
                  req.open('GET', requestURL);

                  req.onload = function() {

                        if (req.status === 200) {
                          resolve(JSON.parse(req.response));//req.response);
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
            }
            else{
                  
                if(_localPanoramicsMetaData === null){      // Local mode and not yet loaded
                  
                    var requestURL = _urlMetaDataProviderPos;    // local file/JSON
                    return new Promise(function(resolve, reject) {

                      var req = new XMLHttpRequest();
                      req.open('GET', requestURL);

                      req.onload = function() {

                            if (req.status === 200) {
                                
                                _localPanoramicsMetaData = JSON.parse(req.response);
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
                
            }
        },
        
        // USING MEMORISED TAB or JSON ORI
        getClosestPanoInMemory: function(easting, northing, distance){
            
            var indiceClosest = 0;
            var distMin = 99999;
            for (var i=0; i< _localPanoramicsMetaData.length; ++i){
                
                var p = _localPanoramicsMetaData[i];
                var dist = Math.sqrt( (p.easting - easting) * (p.easting - easting) + (p.northing - northing) * (p.northing - northing) );
                if(dist< distMin) {indiceClosest = i; distMin = dist;}
            }
            return [_localPanoramicsMetaData[indiceClosest]];
        },
        
        
        getUrlImageFile: function(){
            
            return _urlImageFile;
        },
        
        getImageLocal: function(){
          
            return _localImages;
        },
        
        // Return the full request depending if local mode or Database
        getMetaDataSensorURL: function(idChantier){
            
            var urlRequest = ""
            if(_localModeProviderSensor)
                urlRequest = _urlMetaProviderSensor;
            else
                urlRequest = _urlMetaProviderSensor+"?idChantier="+idChantier;
            
            return urlRequest;
        },
        
        getLocalModeProviderSensor: function(){
            
            return _localModeProviderSensor;
        }
        
    };
    return PanoramicProvider;

});
