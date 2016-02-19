/**
 * Creates a new Panoramic object [ It s actually a Panoramic Layer ]
 * @class Manage the panoramics
 * @author alexandre devaux IGN
 * @requires ThreeJS
 * 
 * Panoramic abstract module 
 * stereopolis uses projective texturing (a mesh (geometry) and a texture (projectiveTexturing))
 * Other can use one texture equirectangular on a sphere
 * 
 */ 
 
define (['three', 'Ori','MeshManager', 'PanoramicProvider', 'lib/when', 'Navigation'], function ( THREE, Ori, MeshManager, PanoramicProvider, when, Navigation) {
    
    
    var _initiated = false,
    _visibility = true,
    _options = {};
       
    // EVENT MANAGEMENT
    var _events = {
        MOVE : function (){
            MeshManager.updateDataFromRGE();
        }
    };
    
    
    var Panoramic =  {
  
        init: function(pos, options){
            _options = options;
            PanoramicProvider.init(_options);
            var that = this;
            // Get info for initPosition from Data base
            PanoramicProvider.getMetaDataFromPos(pos.x, pos.z, 50).then(
                        function(response){
                            that.setInfos(response[0]);
                            _initiated = true;
                           // Init orientation module (used for intrinseque and extraseque parameters)
                            Ori.init();
                        }
                    );
            
            // Needs to have ori initiated
            this.testInitOri(); // Generate Mesh with projective images and building geometry
        },
        
            
       testInitOri: function() {

            if (Ori.initiated){
                 MeshManager.init(_options);
            }
            else {
                 console.log("Waiting for Ori module initiation");
                 setTimeout(Panoramic.testInitOri, 300);  // !! scope
            }
        },
        
        
        setInfos: function(infos){
            _options.pano  = infos
        },
     

        isInitiated: function(){
            return _initiated;
        },
        
        removeFromScene: function(){
            scene.remove(this.panoGlobale);
        },

        // Rotate image on camera using canvas rotation
        rotateImage: function(cameraName,angle){

            var tt = this.getTileTexture(cameraName);
            tt.rotate(angle);
        },

        getInfos: function(){
            return _options;
        },

        getPosition: function(){
            return new THREE.Vector3(_options.pano.easting,
                                     _options.pano.altitude,
                                     _options.pano.northing);
        },
        
        getVisibility: function(){
            return _visibility;
        },
        
        getDate: function(){
            return _options.pano.date;
        },
        
        setPosition: function(pos){
            _options.pano.easting = pos.x;
            _options.pano.northing = pos.z;
            _options.pano.altitude = pos.y;
        },

        setVisibility: function(b){
			b = !!b;
            console.log('panoramic visibility: ',b)
            _visibility = b;
            MeshManager.setVisibility(b);
            
        },
        
        tweenGeneralOpacityUp: function(){
            MeshManager.tweenGeneralOpacityUp();
        },
        
        processEvent : function(event){
            if (_events[event]){
                _events[event]();
            }
        }


    }

    return Panoramic;

});
