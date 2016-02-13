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
    
    
    var _panoGlobale = new THREE.Object3D(),
    _url = "",
    _initiated = false,
    _visibility = true,
    _panoInfo = {
        pano:'',
        easting:0,
        northing:0,
        altitude:0,
        heading:0,
        pitch:0,
        roll:0,
        date:new Date()
    },
    _dataURL = null,
    _decalageUTC = 15;

       
    // EVENT MANAGEMENT
    var _events = {
        MOVE : function (){
            MeshManager.updateDataFromRGE();
        }
    };
    
    
    var Panoramic =  {
  
        init: function(pos, dataURL){
            
            _dataURL = dataURL;
            PanoramicProvider.init(_dataURL);
            var that = this;
            // Get info for initPosition from Data base
            PanoramicProvider.getMetaDataFromPos(pos.x, pos.z, 50).then(
                        function(response){
                            that.setInfos('',response[0]);
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
                 MeshManager.init(_panoInfo, _dataURL);
                 
            }
            else {
                 console.log("Panoramic module is initiated");
                 setTimeout(Panoramic.testInitOri, 300);  // !! scope
            }
        },
        
        
        setInfos: function(url,infos){
            _url = url || '';
            _panoInfo.pano = infos.pano || '';
            _panoInfo.easting = parseFloat(infos.easting) || 0;
            _panoInfo.northing = parseFloat(infos.northing) || 0;                            
            _panoInfo.altitude = parseFloat(infos.altitude) || 0;
            _panoInfo.heading = parseFloat(infos.heading)  ||  0;
            _panoInfo.pitch = parseFloat(infos.pitch)  || 0;
            _panoInfo.roll = parseFloat(infos.roll) ||  0;
            _panoInfo.date = new Date(infos.date); 
        },
     

        isInitiated: function(){
            return _initiated;
        },
        
        // Update Pano textures and position/rotation
        updateGlobalPano: function(url,name,position,rotation,infos) {
            this.setInfos(url,infos);
            this.updatePanoTextures(url, name);
            this.updatePanoCoord(position, rotation);
        },
        

        updatePanoCoord: function(position, rotation) {
            _panoGlobale.position = position;
            _panoGlobale.rotation = rotation;
        },

        initInfo: function(url,name){
            _url = url;
            _panoInfo.filename = name;
        },
        


        loadName: function (name){
            _name = name;
            this.loadUrl("http://www.itowns.fr/cgi-bin/iipsrv.fcgi?FIF=/iipimages3/"+name+".jp2");
        },


        removeFromScene: function(){
            scene.remove(this.panoGlobale);
        },

        setNameForCamera: function(numCam){
            //"http://www.itowns.fr/cgi-bin/iipsrv.fcgi?FIF=/iipimages/Paris_12-080422_0687-00-00001_0001319.jp2"
            var pat=new RegExp("-[0-9][0-9]-");
            //	this.url = this.url.replace(pat,"-"+numCam+"-");
            //console.log("set Name: "+ this.url);
            return _url.replace(pat,"-"+numCam+"-");
        },

        // Rotate image on camera using canvas rotation
        rotateImage: function(cameraName,angle){

            var tt = this.getTileTexture(cameraName);
            tt.rotate(angle);
        },


        getPanoGlobale: function(){

            return _panoGlobale;
        },

        getPanoInfos: function(){
            return _panoInfo;
        },

        getPanoPos: function(){
            return new THREE.Vector3(_panoInfo.easting,
                                     _panoInfo.altitude,
                                     _panoInfo.northing);
        },
         
        setURLWithPos: function(){
            
            var params= {};
            var tmp= window.location.search.substr(1).split("&");  // Adresse ex: http://www.itowns.fr/viewer/laserADVIewer.html?date=2008_05_05&hour=14&seconds=350&easting=655550.2&northing=6866565.3
            for (i=0; i<tmp.length; i++)
            {
                data=tmp[i].split("=");
                params[data[0].toLowerCase()]=data[1];		
            }
            
            params.panoname = params.panoname || "TerMob2-130116_0923-00-00002_0000623";
            params.easting = params.easting; // easting=655081.6&northing=6423576.62
            params.northing = params.northing;
            params.heading = params.heading || 0;
            params.duree = params.duree || "25";
            params.particlesize = params.particlesize || "0.01";
            params.mobile = params.mobile =="true" || false;
            params.nc = params.nc =="true" || false;   // nodecontroller to control camera from phone accelerometer
            
          //  console.log("params.mobileparams.mobile" ,params.mobile);
            if (typeof (params.debug) === "undefined" || params.debug !== "true") {
                params.debug = false;
            }
            else {
                params.debug = true;
            }
            
            var urlLocal = "?easting="+_panoInfo.easting+"&northing="+_panoInfo.northing+"&mobile="+params.mobile+"&nc="+params.nc;
            window.history.pushState("string test", "titre", urlLocal);
        },
                
        // Toulouse-131010_0729-00-00002_0000501
        // -> n= -1 will return Toulouse-131010_0729-00-00002_0000500
        getPanoNameAtIndice: function(n){
            
            var name = _panoInfo.filename;
            var numberInc = (parseInt(name.substr(name.length-5)) + n).toString();
            while(numberInc.length <5){
                numberInc= '0'+numberInc;
            }           
            return name.substr(0,name.length-5) + numberInc;
        },

        getPanoUrl: function(){
            return _url;
        },
        
        getVisibility: function(){
            return _visibility;
        },
        
        getPanoDate: function(){
            return _panoInfo.date;
        },

        getYYMMDD: function(){
            var d =  _panoInfo.date;
            return (""+d.getUTCFullYear()).slice(-2) + ("0"+(d.getUTCMonth()+1)).slice(-2) + ("0" + d.getUTCDate()).slice(-2);
        },

        getPanoHours: function(){
            return _panoInfo.date.getUTCHours();
        },

        getPanoSecondsInHour: function(){
            return _panoInfo.date.getUTCMinutes()*60+_panoInfo.date.getUTCSeconds();
        },
        
        getDecalageUTC: function(){
            
            return _decalageUTC;
        },
        
        setDecalageUTC: function(decalageUTC){
            _decalageUTC = decalageUTC;
        },

        setPanoInfos: function(panoInfos){
            _panoInfo = panoInfos;
        },
        
        setPosition: function(pos){
            _panoInfo.easting = pos.x;
            _panoInfo.northing = pos.z;
            _panoInfo.altitude = pos.y;
        },

        setVisibility: function(b){
            console.log('panoramic visibility: ',b)
            if (b == null) b = true;
            _visibility = b;
            MeshManager.setVisibility(b);
            
        },
        
        
        tweenGeneralOpacityUp: function(){
            MeshManager.tweenGeneralOpacityUp();
        },


        /*********** Name functions, Date...  *************************************/
        // Jump nb panoramics, acquired in the same 'Chantier' using filename
        jumpTo:function(nbImagetoJump){

            var numberPos = _url.search(".jp2");
            var numberInc = (parseInt(_url.substr(numberPos-5,5),10) +nbImagetoJump).toString();
            while(numberInc.length <4){
                numberInc= '0'+numberInc;
            }
            var pat=new RegExp("_000.*.jp2");
            _name = _url.replace(pat,"_000"+numberInc);

            var pos = _name.lastIndexOf("Paris");
            _name = _name.substr(pos);

            return _name;
        },
        
        processEvent : function(event){
            if (_events[event]){
                _events[event]();
            }
        }


    }

    return Panoramic;

});
