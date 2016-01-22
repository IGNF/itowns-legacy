/* 
 * Interface for main function. Initialize map, set position, orientation, layers...
 * The canvas to integrate the API is called containerITOWNS
 *  !!!!!! TEMP, the API should be composed of different module, map, events... ex API.events, API.maps,
 */


define("API",['jquery', 'GraphicEngine', 'Navigation', 'Panoramic', 'LaserCloud', 'Measure', 'Dispatcher', 'Cartography', 'Cartography3D', 'Config'],
        function($, gfxEngine, Navigation,   Panoramic,   LaserCloud,   Measure,   Dispatcher, Cartography, Cartography3D, Config){
    

         API = function(options){
             
            this.dataURL = options.dataURL || Config.dataURL;  // Specify if using local files or distant : "local", "distant"
           // Config.init("stereopolis");
            
            this.positionInit = options.positionInit || {x:651182.91,y:39.6,z:6861343.03};
            gfxEngine.setZero(this.positionInit);
            
            Panoramic.init(this.positionInit, this.dataURL);   // By default
            Dispatcher.register("MOVE", Panoramic);

            if(options.usingBati3D) {
                this.addLayer("3DBuilding",this.dataURL);
            }
            
            if(options.usingLaserCloud) {
                this.addLayer("pointCloud",this.dataURL);
            }

            this.version = 0.1;
            Dispatcher.register('MOVE', API);
            Dispatcher.register('ZOOM', API);
            Dispatcher.register('ORIENTATION', API);
            Dispatcher.register('MEASURE', API);
            this.initialized = true;
        };
        
        
        // EVENT MANAGEMENT
        
         var _events = {
            MOVE : function (){
                //console.log("move pos");
            },
            ZOOM : function (){
                //console.log("FOV changed");
            },
            ORIENTATION : function (){
                //console.log("ori changed");
            },
            MEASURE : function (){
                console.log(Measure.getLastMeasure());
                //console.log("ori changed");
            }
        };
        
        API.processEvent = function(event){

            if (_events[event]){
                _events[event]();
            }
        };


/*
        API.prototype.initialize = function() {

            console.log('initializing API');

            var mapOptions = {
              center: { easting: 651473, northing: 6862600}, 
              zoom: 8
            };

        };
 */       
        API.prototype.setInitialized = function(b){
            
            this.initialized = b;
        };
        
        API.prototype.isInitialized = function(){
            
            return this.initialized;
        };
        
        
        

        // PANORAMIC **************************************************************************
        
        // Set position to go usin object {x,y,z} or 3 parameters 
        API.prototype.setPanoramicPosition = function(pos) {
            
            console.log("setPanoramicPosition to", pos);
            Navigation.goToClosestPosition(pos);  // !! scopeNavigation.goToClosestPosition(pos);

        };
        
        // Get current pos
        API.prototype.getPanoramicPosition = function() {
           
            var v = Panoramic.getPanoPos();
            return {easting:v.x, northing:v.z, hauteur:v.y};
            // Send signal to linked object
        };
        
        // Set where to look at just in plani, One angle from north, heading (same as yaw)
        API.prototype.setPanoramicOrientation = function(heading) {
            gfxEngine.cameraLookAtHeading(0,0,0, heading);  // !! scopeNavigation.goToClosestPosition(pos);
        };
        
        // Set where to look  with yaw (same as heading) and pitch
        API.prototype.setPanoramicOrientationYawPitch = function(yaw,pitch) {
            gfxEngine.cameraLookAtYawPitch(0,0,0, yaw,pitch);  // !! scopeNavigation.goToClosestPosition(pos);
        };
        // get cam yaw (same as heading) and pitch
        API.prototype.getPanoramicOrientationgetCameraYawPitch = function(){
            return gfxEngine.getCameraYawPitch();
        };
        // Set camera field of view in degree
        API.prototype.setCameraFOV = function(fov){
            gfxEngine.setCameraFov(fov);
        };
        // Get camera field of view in degree
        API.prototype.getCameraFOV = function(){
            return gfxEngine.getCameraFov();
        };
        // Get last 3D measure ({x,y,z})
        API.prototype.getLastMeasure = function(){
            return Measure.getLastMeasure();
        };
        
        API.prototype.addMeasure = function(pt){
            Measure.drawMeasure(pt);
        };
             
        API.prototype.setPanoramicVisible= function(bool){
            Panoramic.setVisibility(bool);
        };
        
        API.prototype.setLowResolution = function(bool){
            gfxEngine.setLowReso(bool);
        };
        
        // Layers **************************************************************************
        
        API.prototype.addLayer = function(layerName, dataURL){
            
           // console.log("addLayer", layerName);
            
            if(layerName == "pointCloud"){
                
                if(Panoramic.isInitiated()){  // PointCloud depends on pano info (time)
                
                    if (!LaserCloud.initiated) {
                            Measure.init();
                            LaserCloud.init(gfxEngine.getZero(), dataURL); //Init itself and its shaders
                            gfxEngine.addToScene(LaserCloud.laserCloudMaster);
                            LaserCloud.launchLaserAroundCurrentTime(10, 11);
                            //LaserCloud.setVisibility(true);
                        }
                        else {
                            if (LaserCloud.getNotLoaded() && !LaserCloud.getLocalMode())
                                LaserCloud.launchLaserAroundCurrentTime(10, 11);
                        }

                        LaserCloud.setVisibility(true);
                        LaserCloud.btnSwitchPoint = true;
                 }else{
                    setTimeout(function(){API.prototype.addLayer("pointCloud",dataURL);}, 150);
                }
            }

            if(layerName == "3DBuilding"){
                    if (!Cartography3D.isCartoInitialized()) {
                                Cartography3D.initCarto3D(dataURL);
                                Panoramic.setVisibility(false);
                    }
            }   
            
            /*
            if(layerName == "TerrestrialImages"){
                Panoramic.init();
            }
            */
        };
        
        
         API.prototype.removeLayer = function(layerName){
             
             console.log("removeLayer", layerName);
             //Change setvitibility to remove ???
             if(layerName == "pointCloud"){
                LaserCloud.setVisibility(false);
             }
             
             if(layerName == "3DBuilding"){
                Cartography3D.removeAllDalles();
             }
             
         };
        

        API.prototype.setLayerVisibility = function(layerName, b){
             
             console.log("removeLayer", layerName);
             if(layerName == "pointCloud"){
                LaserCloud.setVisibility(b);
             }
             
             if(layerName == "3DBuilding"){
                Cartography3D.setVisibility(b);
             }
             
         };

            
            
    
         // Events **************************************************************************
        
        
        /**
         * 
         * @param {type} obj
         * @param {type} att
         * @param {type} call
         * @returns {undefined}
         */
        API.prototype.addListener = function(obj,att,call){
            
            // Static test for juste move function
            if(att=="MOVE")
                _events.MOVE = call;//function(){console.log("waoooooooooooooooo");};
            else
                if(att=="ZOOM")
                    _events.ZOOM = call;//function(){console.log("waoooooooooooooooo");};
            else
                if(att=="ORIENTATION")
                    _events.ORIENTATION = call;
            else
                if(att=="MEASURE")
                    _events.MEASURE = call;
            
        };
        
        
        
        // INPUTS DIV **************************************************************
         API.prototype.createSearchInput = function(){
                         
            $containerSE = $(gfxEngine.getContainerID());
            //$container = $('#containerITOWNS');
            $containerSE.append('<div id="divSearchInput"> <input  name="myfieldname" id="searchInput" value="Adresse, Ville..." style="background-color: rgba(0,0,0,0.5); position:absolute;  right: 50px; width: 250px; top:50px;  z-index: 99;" /> </div>');
            $('#divSearchInput').mousedown(this.textInputClick);
            $('#divSearchInput').mouseup(this.textInputClick);
            $('#divSearchInput').mousemove(this.textInputClick);
            $('#divSearchInput').click(this.textInputClick);
            $('#divSearchInput').keyup(this.textInputChange);
        };
        
        API.prototype.textInputClick = function(e){
            console.log("click");
            e.stopPropagation();
          //  e.originalEvent.preventDefault();
        };
        
        API.prototype.textInputChange = function(e){
            
               if (e.keyCode == 13) {  // Enter key

                    var p = $("#searchInput").val();
                    if (parseFloat(p.substring(3, 4)) >= 0.0) {  // Coordinate
                        var tabCoord = p.split(" ");
                        Navigation.goToClosestPosition({x: tabCoord[0], y: 0, z: tabCoord[1]}, {distance: 250});
                    } else
                    if (p.indexOf('_') > 0) {
                        Navigation.loadPanoFromNameAndLookAtIntersection(p);
                    }    // Pano name
                    else
                        Cartography.sendOLSRequest(p, false);  // Address

                    }
        };
        // LASER    
   
        return API;
    
});