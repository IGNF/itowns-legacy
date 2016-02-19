/* 
 * Interface for main function. Initialize map, set position, orientation, layers...
 * The canvas to integrate the API is called containerITOWNS
 *  !!!!!! TEMP, the API should be composed of different module, map, events... ex API.events, API.maps,
 */


define("API",['jquery', 'GraphicEngine', 'Navigation', 'MeshManager', 'Panoramic', 'LaserCloud', 'Measure', 'Dispatcher', 'Cartography3D'],
        function($, gfxEngine, Navigation, MeshManager, Panoramic,   LaserCloud,   Measure,   Dispatcher, Cartography3D){

         API = function(options){
			 
            gfxEngine.setZero(options.position);

            this.addLayer("images",options.images);
            this.addLayer("buildings",options.buildings);
            this.addLayer("pointCloud",options.pointCloud);

            this.version = 0.1;
            Dispatcher.register('MOVE', Panoramic);
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
            return {easting:v.x, northing:v.z, height:v.y};
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
            Cartography3D.setVisibility(!bool);
            Cartography3D.setOpacity(bool ? 0 : 1);
            MeshManager.setSkyBoxVisibility(!bool);
            if(bool)
				gfxEngine.translateCameraSmoothly(0,0,0);   // Translate to 100 meters up
			else
				gfxEngine.translateCameraSmoothly(-10001,100,0);   // Translate to 100 meters up
        };

        API.prototype.getPanoramicVisible= function(){
            return Panoramic.getVisibility();
        };
        
        API.prototype.setLowResolution = function(bool){
            gfxEngine.setLowReso(bool);
        };
        
        // Layers **************************************************************************
        
        API.prototype.addLayer = function(layerName, options){
			if(!options) return;
			            
            if(layerName == "pointCloud"){
                
                if(Panoramic.isInitiated()){  // PointCloud depends on pano info (time)
					
                    if (LaserCloud.initiated) {
                        LaserCloud.launchLaserAroundCurrentTime(10, 11);
                        
                    } else if (LaserCloud.getNotLoaded()) {
                        Measure.init();
                        LaserCloud.init(gfxEngine.getZero(), options);
                        gfxEngine.addToScene(LaserCloud.laserCloudMaster);
                        LaserCloud.launchLaserAroundCurrentTime(10, 11);
                    }

                    LaserCloud.setVisibility(options.visible);
                    LaserCloud.btnSwitchPoint = true;
                } else {
                    setTimeout(function(){API.prototype.addLayer(layerName,options);}, 150);
                }
            }

            if(layerName == "buildings"){
                    if (!Cartography3D.isCartoInitialized()) {
                        Cartography3D.initCarto3D(options);
						Cartography3D.setVisibility(options.visible);
                    }
            }
            
            if(layerName == "images"){
				Panoramic.init(gfxEngine.getZero(), options);
                Panoramic.setVisibility(options.visible);
            }
        };
        
        
         API.prototype.removeLayer = function(layerName){
             
             if(layerName == "pointCloud"){
                LaserCloud.setVisibility(false);
             }
             
             if(layerName == "buildings"){
                Cartography3D.removeAllDalles();
             }
             
         };
        

        API.prototype.setLayerVisibility = function(layerName, b){
			
             if(layerName == "pointCloud"){
                LaserCloud.setVisibility(b);
             }
             
             if(layerName == "buildings"){
                Cartography3D.setVisibility(b);
             }
             
         };
    
         // Events **************************************************************************
        
        API.prototype.addListener = function(call){
            
            // Static test for juste move function
            if(att=="MOVE")
                _events.MOVE = call;
            else
                if(att=="ZOOM")
                    _events.ZOOM = call;
            else
                if(att=="ORIENTATION")
                    _events.ORIENTATION = call;
            else
                if(att=="MEASURE")
                    _events.MEASURE = call;
            
        };
        
        return API;
    
});
