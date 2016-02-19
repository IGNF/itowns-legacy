define (['three', 'GraphicEngine', 'Utils',  'Panoramic', 'PanoramicProvider', 'Dispatcher','ProjectiveTexturing','MeshManager', 'Ori', 'Draw', 'Cartography3D', 'lib/when'],
function(THREE, gfxEngine,  Utils, Panoramic, PanoramicProvider, Dispatcher, ProjectiveTexturing, MeshManager,  Ori, Draw, Cartography3D, when)
{

    //***************************** PRIVATE MEMBERS OF MODULE ************************************************/

    //ATTRIBUTES
    var _navigationGroup = null,    //Object grouping the navigation arrows into one 3D object
    _arrows = {},                   //Navigation arrows, containing Arrows.
                                    //Properties identifier are the id of the mesh associated to arrow
    _texArrow = null,
    _texSelectedArrow = null,
    _arrowMaterial = null,
    _arrowGeometry = null,
    _roadPlane = null,              //The road plane used for click & go
    _currentPanoInfo = null,        //Current displayed panoramic infos
    _initialPositionInfos = null,

    _step = null,                   //Wanted distance between each jump from one panoramic to another
    _distThreshold = null,          //Threshold allowed between the wanted step and the available panoramic
    _minAngle = null,               //Min angle (in radian) required between navigation arrow to avoid overlap

    _intersectedArrow = null,       //Current intersected 3D navigation arrow at the mouse position (picking)
    _initialized = false,           //Indicate if this has been initalised
    _lookNextPano = false,
    DEBUG = false,
    _indiceCurrentPosIti = 0,


    _arrZebra = [];  // TEMP will move to PMR
    _barycentre = {x: 0.025244939999999993, y: 0.8656037999999999, z: -0.14644352};
    _count = 0;
    _preIntersectionToLook = null;

   
    var _next = 0;
    var _theta = 200;
 

    //METHODS
    function registerEvents() {

      /*  $(document).mouseup(function(e) {
            if (Navigation.isOnArrow()){
                Navigation.move();
            }
        });
        */
    }


    /*********************************************************************************************************/


    /**
     * Manages the navigation interface enabling user to navigate throw panoramic images and laser cloud
     * @export Navigation
     */
    var Navigation = {

        BATI_DISTANCE : 200,
        ROAD_DISTANCE : 10000,
        ROAD_HEIGHT : -2.5,
        intersectionToLook:{},
        clickAndGoActivated: false,
        autoPlay:false, // For itinerary

        /**
         * Creates a new Navigation object.
         * @author Mathieu Benard IGN
         * @class The navigation user interface, allowing the user to navigate through the 3D world
         * @param {Number} step The wanted distance (in meter) between each "jump"
         * @param {Panoramic} initialPano The first Panoramic loaded
         */
        init: function(initialInfos) {

            _initialPositionInfos = initialInfos;
            _currentPanoInfo = Panoramic.getPanoInfos();
            _distThreshold = 2;
            _minAngle = 0.52;

        },


        // option intersection to look {x1, y1, z1, x2, y2, z2, headingCorrection}
        // Projective Texturing
        moveWithTransition: function(targetPanoInfo, intersectionToLook, surfaceType, altiOption) {

            //console.log('moveWithTransition ************************************');
            if (typeof (targetPanoInfo) !== "undefined") {

            	altiOption = altiOption || 0;

                // TEST IF WE GO FAR FROM INITIALIZATION POINT WE NEED TO CHANGE PIVOT
                if( Math.abs(parseFloat(targetPanoInfo.easting)  - gfxEngine.getZero().x) >20000 ||
                    Math.abs(parseFloat(targetPanoInfo.northing) - gfxEngine.getZero().z) >20000 )
                {
                    gfxEngine.setZero({x:parseFloat(targetPanoInfo.easting),y:parseFloat(targetPanoInfo.altitude),z:parseFloat(targetPanoInfo.northing)});
                    Dispatcher.send("CHANGEPIVOT");
                }

                //  targetPanoInfo.easting = 354881.41; targetPanoInfo.northing = 6689609.56;
                Panoramic.setInfos(targetPanoInfo.url,targetPanoInfo);

                var posWithPivot = new THREE.Vector4(parseFloat(targetPanoInfo.easting)  - gfxEngine.getZeroAsVec3D().x,
                                                     parseFloat(targetPanoInfo.altitude) - gfxEngine.getZeroAsVec3D().y,
                                                     parseFloat(targetPanoInfo.northing) - gfxEngine.getZeroAsVec3D().z,
                                                     1);

             /*************************** Projection ******************************************************************/
                var matRotation = Ori.computeMatOriFromHeadingPitchRoll(
                                        targetPanoInfo.heading,
                                        targetPanoInfo.pitch,
                                        targetPanoInfo.roll
                                    );

                _barycentre = Ori.getPosition();
                
                _barycentre.applyMatrix3(matRotation);

                gfxEngine.translateCameraSmoothly(posWithPivot.x + _barycentre.x, posWithPivot.y +_barycentre.y + altiOption, posWithPivot.z+ _barycentre.z);

                var panoWithDirName = this.getDirectoryFromPanoName(targetPanoInfo.filename);
                
                if(ProjectiveTexturing.isInitiated()) ProjectiveTexturing.changePanoTextureAfterloading(targetPanoInfo,posWithPivot,matRotation);


            /************************************************************************************************************/
            
                if(surfaceType=="SkyToGround"){   // From aerial to terrastrial when clicked on road, needs to look horizontal after transition
                    gfxEngine.setSpeedTurnCam(0.04);
                    gfxEngine.cameraLookHorizontally(); console.log("looook horizontally");
                    
                }else
                    
                if(intersectionToLook != null && surfaceType=="Rectangle"){// Useful for Photogrammetry automatic targeting

                    gfxEngine.cameraLookAtPosition( intersectionToLook.x,
                                                    intersectionToLook.y ,
                                                    intersectionToLook.z,
                                                    posWithPivot.x,
                                                    posWithPivot.y + altiOption,
                                                    posWithPivot.z);
                    gfxEngine.setSpeedTurnCam(0.04);
                }

                Dispatcher.send("MOVE");
            }
            else {
                throw TypeError("Can't move to undefined panoramic");
            }
        },



        // Load a series of panoramic using a 'tab' of positions
        moveWithTransitionTablePositions: function(targetPanoInfo,tab, intersectionToLook, surfaceType) {

            if (typeof (targetPanoInfo) !== "undefined") {

                var posWithPivot = new THREE.Vector4(parseFloat(targetPanoInfo.easting) - _initialPositionInfos['easting'],
                                                     parseFloat(targetPanoInfo.altitude) - _initialPositionInfos['altitude'],
                                                     parseFloat(targetPanoInfo.northing) - _initialPositionInfos['northing'],
                                                     1);

                gfxEngine.translateCameraSmoothly(posWithPivot.x, posWithPivot.y , posWithPivot.z);
              //ProjectiveTexturing.tweenGeneralOpacity();

               Panoramic.setInfos(targetPanoInfo.url,targetPanoInfo);
             /*************************** Projection ******************************************************************/
                // rotation from heading TODO real 3D Rotation with pitch and roll
                var teta = parseFloat(targetPanoInfo.heading)/ 180 * Math.PI;  // Deg to Rad
                var cosTeta = Math.cos(teta);
                var sinTeta = Math.sin(teta);
                var matRotation = new THREE.Matrix4().set(cosTeta,0,-sinTeta,0,
                                                       0,        1,0,      0,
                                                       sinTeta,0,cosTeta,0,
                                                       0,0,0,1);

                ProjectiveTexturing.changePanoTextureAfterloading(targetPanoInfo,posWithPivot,matRotation);
             //   ProjectiveTexturing.changePanoTextureAfterloading(targetPanoInfo.filename,1024,75,posWithPivot,matRotation);
            /************************************************************************************************************/

                if(intersectionToLook != null && surfaceType=="Rectangle"){// Useful for Photogrammetry automatic targeting

                    gfxEngine.cameraLookAtPosition( intersectionToLook.x,
                                                    intersectionToLook.y,
                                                    intersectionToLook.z,
                                                    posWithPivot.x,
                                                    posWithPivot.y,
                                                    posWithPivot.z);
                    gfxEngine.setSpeedTurnCam(0.04);
                }


                    setTimeout(function(){Navigation.loadTablePositions(tab);},1000);
                //this.loadTablePositions(tab);

                Dispatcher.send("MOVE");
            }
            else {
                throw TypeError("Can't move to undefined panoramic");
            }
        },


        // Load a series of panoramic using a 'tab' of pano infos. For itineraries
        moveWithTransitionTablePanos: function(targetPanoInfo, tab) {

            if (typeof (targetPanoInfo) !== "undefined") {

                // TEST IF WE GO FAR FROM INITIALIZATION POINT WE NEED TO CHANGE PIVOT
                if( Math.abs(parseFloat(targetPanoInfo.easting)  - gfxEngine.getZero().x) >20000 ||
                    Math.abs(parseFloat(targetPanoInfo.northing) - gfxEngine.getZero().z) >20000 )
                {
                    gfxEngine.setZero({x:parseFloat(targetPanoInfo.easting),y:parseFloat(targetPanoInfo.altitude),z:parseFloat(targetPanoInfo.northing)});
                    Dispatcher.send("CHANGEPIVOT");
                }

               //  targetPanoInfo.easting = 354881.41; targetPanoInfo.northing = 6689609.56;
                Panoramic.setInfos(targetPanoInfo.url,targetPanoInfo);

                var posWithPivot = new THREE.Vector4(parseFloat(targetPanoInfo.easting)  - gfxEngine.getZeroAsVec3D().x,
                                                     parseFloat(targetPanoInfo.altitude) - gfxEngine.getZeroAsVec3D().y,
                                                     parseFloat(targetPanoInfo.northing) - gfxEngine.getZeroAsVec3D().z,
                                                     1);

             /*************************** Projection ******************************************************************/
                // rotation from heading TODO real 3D Rotation with pitch and roll
                var matRotation = Ori.computeMatOriFromHeadingPitchRoll(
                                        targetPanoInfo.heading,
                                        targetPanoInfo.pitch,
                                        targetPanoInfo.roll
                                    );


                var cameraVersion = this.getCameraVersionFromPanoName(targetPanoInfo.filename);
                if (cameraVersion == 2)
                    _barycentre = Ori.getBarycentreV2();
                else
                    _barycentre = Ori.getBarycentreV1();  // For Paris.. and Terramob (old chantiers)

                _barycentre.applyMatrix3(matRotation);

                gfxEngine.translateCameraSmoothly(posWithPivot.x + _barycentre.x, posWithPivot.y +_barycentre.y, posWithPivot.z+ _barycentre.z);

                var panoWithDirName = this.getDirectoryFromPanoName(targetPanoInfo.filename);
               
                if(ProjectiveTexturing.isInitiated()) ProjectiveTexturing.changePanoTextureAfterloading(targetPanoInfo,posWithPivot,matRotation);


               if(tab.length>0 && _lookNextPano){ // Then we look at the next pos
                        var intersectionToLook = new THREE.Vector3(tab[0].easting  - gfxEngine.getZeroAsVec3D().x,//_initialPositionInfos['easting'],
                                                                   tab[0].altitude - gfxEngine.getZeroAsVec3D().y,
                                                                   tab[0].northing - gfxEngine.getZeroAsVec3D().z);

                        gfxEngine.cameraLookAtPosition( intersectionToLook.x,
                                                        intersectionToLook.y,
                                                        intersectionToLook.z,
                                                        posWithPivot.x,
                                                        posWithPivot.y,
                                                        posWithPivot.z);
                        gfxEngine.setSpeedTurnCam(0.04);
                 }

                if(this.autoPlay)
                    setTimeout(function(){Navigation.loadTablePanos(tab);},1200);
                //this.loadTablePositions(tab);

                Dispatcher.send("MOVE");
            }
            else {
                throw TypeError("Can't move to undefined panoramic");
            }
        },



        // Load a series of panoramic using a 'tab' of pano infos. For itineraries
        moveWithTransitionTablePanosAERIAL: function(targetPanoInfo, tab) {

            if (typeof (targetPanoInfo) !== "undefined") {

                // TEST IF WE GO FAR FROM INITIALIZATION POINT WE NEED TO CHANGE PIVOT
                if( Math.abs(parseFloat(targetPanoInfo.easting)  - gfxEngine.getZero().x) >20000 ||
                    Math.abs(parseFloat(targetPanoInfo.northing) - gfxEngine.getZero().z) >20000 )
                {
                    gfxEngine.setZero({x:parseFloat(targetPanoInfo.easting),y:parseFloat(targetPanoInfo.altitude),z:parseFloat(targetPanoInfo.northing)});
                    Dispatcher.send("CHANGEPIVOT");
                }

               //  targetPanoInfo.easting = 354881.41; targetPanoInfo.northing = 6689609.56;
                Panoramic.setInfos(targetPanoInfo.url,targetPanoInfo);

                var posWithPivot = new THREE.Vector4(parseFloat(targetPanoInfo.easting)  - gfxEngine.getZeroAsVec3D().x,
                                                     parseFloat(targetPanoInfo.altitude) - gfxEngine.getZeroAsVec3D().y,
                                                     parseFloat(targetPanoInfo.northing) - gfxEngine.getZeroAsVec3D().z,
                                                     1);

             /*************************** Projection ******************************************************************/
                // rotation from heading TODO real 3D Rotation with pitch and roll
                var matRotation = Ori.computeMatOriFromHeadingPitchRoll(
                                        targetPanoInfo.heading,
                                        targetPanoInfo.pitch,
                                        targetPanoInfo.roll
                                    );


                _barycentre = Ori.getPosition();  // For Paris.. and Terramob (old chantiers)

                _barycentre.applyMatrix3(matRotation);

                gfxEngine.translateCameraSmoothly(posWithPivot.x + _barycentre.x, posWithPivot.y +_barycentre.y, posWithPivot.z+ _barycentre.z);

                var panoWithDirName = this.getDirectoryFromPanoName(targetPanoInfo.filename);
               
               if(ProjectiveTexturing.isInitiated()) ProjectiveTexturing.changePanoTextureAfterloading(targetPanoInfo,posWithPivot,matRotation);


               if(tab.length>0 && _lookNextPano){ // Then we look at the next pos
                        var intersectionToLook = new THREE.Vector3(tab[0].easting  - gfxEngine.getZeroAsVec3D().x,//_initialPositionInfos['easting'],
                                                                   tab[0].altitude - gfxEngine.getZeroAsVec3D().y,
                                                                   tab[0].northing - gfxEngine.getZeroAsVec3D().z);

                        gfxEngine.cameraLookAtPosition( intersectionToLook.x,
                                                        intersectionToLook.y,
                                                        intersectionToLook.z,
                                                        posWithPivot.x,
                                                        posWithPivot.y,
                                                        posWithPivot.z);
                        gfxEngine.setSpeedTurnCam(0.04);
                 }

                if(this.autoPlay)
                    setTimeout(function(){Navigation.loadTablePanos(tab);},1200);
                //this.loadTablePositions(tab);

                Dispatcher.send("MOVE");
            }
            else {
                throw TypeError("Can't move to undefined panoramic");
            }
        },




        // Function to move the cam to any 3D position (not a pano)
        // TODO Link to quadtree DTM and his friends
        moveWithTransitionAerial: function(pos, intersectionToLook) {

              // TEST IF WE GO FAR FROM INITIALIZATION POINT WE NEED TO CHANGE PIVOT
                if( Math.abs(pos.x - gfxEngine.getZero().x) > 20000 ||
                    Math.abs(pos.z - gfxEngine.getZero().z) > 20000 )
                {
                    gfxEngine.setZero({x:pos.x,y:pos.y,z:pos.z});
                    Dispatcher.send("CHANGEPIVOT");
                }

                var zero = gfxEngine.getZeroAsVec3D();
                var posWithPivot = new THREE.Vector4(pos.x - zero.x,
                                                     pos.y - zero.y,
                                                     pos.z - zero.z,
                                                     1);

               Panoramic.setPosition(pos);           // TEMP keep the position in Panoramic
               MeshManager.setRoadOn(false);

               if(Math.abs(pos.x - 651463) > 5000)   // Show ortho if not in paris (shown by default)
                   MeshManager.setOrthoPhotoOn(true);



               gfxEngine.translateCameraSmoothly(posWithPivot.x , posWithPivot.y + 200 , posWithPivot.z); // 200 meters up cause map click is at alti 0
               console.log('intersectionToLook',intersectionToLook);
               if(intersectionToLook != null){// Useful for Photogrammetry automatic targeting


                    gfxEngine.cameraLookAtPosition( intersectionToLook.x - zero.x-30,
                                                    intersectionToLook.y - zero.y,
                                                    intersectionToLook.z - zero.z,
                                                    posWithPivot.x,
                                                    posWithPivot.y+200,
                                                    posWithPivot.z);
                    gfxEngine.setSpeedTurnCam(0.01);
                    gfxEngine.setSpeedTransCam(0.03);
                }

                 Dispatcher.send("MOVE");


                 setTimeout(function(){
                    gfxEngine.setSpeedTransCam(0.04);
                    gfxEngine.setSpeedTurnCam(0.1);
                },4500);

        },


        getCameraVersionFromPanoName: function(name){

            var version = 2;
            //if(name.charAt(0) == 'P' || (name.charAt(0) == 'T' && name.charAt(1) == 'e'))
            //if(name.substr(0, 6) == 'Paris_' || name.substr(0, 2) == 'Te')
            //    version = 1;

            return version;
        },

        // @param name ex: Halage-130711_0968-304-00003_0002110.jp2
        // -> 130711/Halage-130711_0968-304-00003_0002110.jp2
        getDirectoryFromPanoName: function(name){

             var dirName = name;
             //var datee = name.substr(name.indexOf('-')+1,6);
             //dirName = datee + "/" + name;

             return dirName;
         },


        loadPanoFromNameAndLookAtIntersection: function(name,intersectionToLook){

            this.intersectionToLook = intersectionToLook;
            var request = PanoramicProvider.getMetaDataPHPFromNameRequest(name);

             RequestManager.sendCommand(request, function(panoInfo) {

                     panoInfo = panoInfo[0];  // We get the first (and only pano)
                     if(panoInfo)
                         Navigation.moveWithTransition(panoInfo);
                     else Utils.noPanoramic();
                 },true
            );
        },


        // To move fast in same session using the keyboard crosses left and right
        loadNextPanoByName: function(name){

            var request = PanoramicProvider.getMetaDataPHPFromNameRequest(name);
            
            RequestManager.sendCommand(request, function(panoInfo) {

                     panoInfo = panoInfo[0];  // We get the first (and only pano)
                     if(panoInfo)
                         Navigation.moveWithTransition(panoInfo);
                     else Utils.noPanoramic();
                 },true
            );
        },



        // Important function to move to a 3D pos (to the closest pos in pano)
        goToClosestPosition: function(pos, options){

            options = options || {};
            options.distance = options.distance || 50;
            options.alti = options.alti || 0;

           
            PanoramicProvider.getMetaDataFromPos(pos.x, pos.z, options.distance).then(
                        function(response){
                            var panoInfo = response[0];
                            if(panoInfo)
                                Navigation.moveWithTransition(panoInfo,options.intersectionToLook, options.surfaceType, options.alti);
                        }
                    );

        },


        // Load positions continuously, looking for closest pano. For itineraries
        loadTablePositions: function(tabPos){

            if(tabPos.length>0){
                var pos = tabPos.shift();
                var request = "php/getInfosFromPos.php?easting=" + pos.x +
                         "&northing=" + pos.z + "&distneighbours=15";

                RequestManager.sendCommand(request, function(panoInfo) {

                         panoInfo = panoInfo[0];  // We get the first (and only pano)
                         if(panoInfo)
                             Navigation.moveWithTransitionTablePositions(panoInfo,tabPos);
                         else Utils.noPanoramic();
                     },true
                );
            }
        },



        // Load pano continuously using tab of panoInfos
        loadTablePanos: function(tabPanos){

            if(tabPanos.length>0){
                var pano = tabPanos.shift();
                Navigation.moveWithTransitionTablePanos(pano,tabPanos);
            }else{
                setTimeout(function(){     // Itinerary is done so we set back to moderate speed
                    gfxEngine.setSpeedTransCam(0.04);
                    gfxEngine.setSpeedTurnCam(0.1);
                },2000);
                $( "#b1" ).animate({height: "0px"}, 2000);   // Set cinematic effect off
                $( "#b2" ).animate({height: "0px"}, 2000);
            }

        },


        // Load positions continuously, looking for closest pano. For itineraries   FUTUR EN SEINE AERIAL
        // ** Navigate throught trajecto  *****  ******** FES **************************
        loadTablePositions2: function(tabPos){
            var alti = 80;  // alti camera while in scene repere


            if(_indiceCurrentPosIti < tabPos.length){
                 var pos = tabPos[_indiceCurrentPosIti];//tabPos.shift();
                 _indiceCurrentPosIti++;
            	 var posWithPivot = new THREE.Vector4( parseFloat(pos.x) - gfxEngine.getZeroAsVec3D().x,
                                                       alti,//parseFloat(pos.y) - gfxEngine.getZeroAsVec3D().y,
                                                       parseFloat(pos.z) - gfxEngine.getZeroAsVec3D().z,
                                                     1);

              	  gfxEngine.translateCameraSmoothly(posWithPivot.x, posWithPivot.y , posWithPivot.z);


              	if(_indiceCurrentPosIti < tabPos.length -2 ){ // Then we look at the next pos
                        var intersectionToLook = new THREE.Vector3(tabPos[_indiceCurrentPosIti+2].x - gfxEngine.getZeroAsVec3D().x,
                                                                   tabPos[_indiceCurrentPosIti+2].y - gfxEngine.getZeroAsVec3D().y + 50,
                                                                   tabPos[_indiceCurrentPosIti+2].z - gfxEngine.getZeroAsVec3D().z);

/*                        var nextIntersection = new THREE.Vector3(tabPos[_indiceCurrentPosIti+3].x - gfxEngine.getZeroAsVec3D().x,
                                                                   tabPos[_indiceCurrentPosIti+3].y - gfxEngine.getZeroAsVec3D().y + 50,
                                                                   tabPos[_indiceCurrentPosIti+3].z - gfxEngine.getZeroAsVec3D().z);*/
/*                        console.log("============================");
                        console.log(intersectionToLook);
                        console.log(posWithPivot);*/
                        if (intersectionToLook.x !== posWithPivot.x && intersectionToLook.z !== posWithPivot.z) {
	                        gfxEngine.cameraLookAtPosition( intersectionToLook.x,
                                intersectionToLook.y,
                                intersectionToLook.z,
                                posWithPivot.x,
                                posWithPivot.y,
                                posWithPivot.z);
	                        _preIntersectionToLook = intersectionToLook;
/*	                        ++_count;
							console.log(_count);*/
    		//console.log(_currentCSSObjects);

							

/*				    		if ( (_next < _currCSSObjs.length) && (nextDistance < _theta) ) {
			    				console.log("==> displaying ", _next);
			    				_dropObjectManager.displayPOI(_currCSSObjs[_next]);
			    				_next = _next + 1;
				    		}*/
                        } else {
                        	console.log("Conflict, skip this point");
                        }

              	}
              	 if(this.autoPlay)
                    setTimeout(function(){Navigation.loadTablePositions2(tabPos);}, 1200);



            }else{
            	console.log("Done");
            	_count = 0;
                _indiceCurrentPosIti = 0;
	             setTimeout(function(){     // Itinerary is done so we set back to moderate speed
	                    gfxEngine.setSpeedTransCam(0.04);
	                    gfxEngine.setSpeedTurnCam(0.1);
	                },2000);
	             //require('GUI').setViewModeOn(false);
            }
        },



        initialized: function() {
            return _initialized;
        },

        isOnArrow : function() {
            for (var arrow in _arrows) {
                if (_arrows[arrow].intersected) return true;
            }
            return false;
        },

        rotateArrows : function (angle){
            gfxEngine.rotateY(angle, _navigationGroup);
        },

        getDistanceToRoadPlane : function (x,y){
            var intersections = gfxEngine.getIntersected(x, y, [_roadPlane]);

            if (intersections.length !== 0){
                var px = intersections[0].point.x, pz = intersections[0].point.z,
                camX = gfxEngine.getCameraPosition().x, camZ = gfxEngine.getCameraPosition().z;

                return Math.sqrt((camX-px)*(camX-px) + (camZ-pz)*(camZ-pz));
            }
            else {
                return -1;
            }
        },

        moveOnRoad : function (x,y){
            var intersections = gfxEngine.getIntersected(x, y, [_roadPlane]);

            if (intersections.length === 0){
                Utils.noPanoramic();
            }
            else {
                var intersectedPoint = intersections[0].point;
                console.log('intersectedPoint: ',intersectedPoint);
                if( THREE.REVISION === '52' ) { //@TODO : remove for release
                    intersectedPoint.addSelf(gfxEngine.getZeroAsVec3D());
                }
                else {
                    intersectedPoint.add(gfxEngine.getZeroAsVec3D());
                }


                var command = "php/getNeighboursAsText.php?easting=" + intersectedPoint.x +
                    "&northing=" + intersectedPoint.z + "&distneighbours=10";

                RequestManager.sendCommand(command, function (array){
                    if (array.length > 2){
                        var panoInfo = RequestManager.getPanoInfo(array, 1)[0];
                        Navigation.move(panoInfo);
                    }
                    else {
                        Utils.noPanoramic();
                    }
                });
            }
        },

        toggleRoadPlane : function (){ _roadPlane.visible =  !_roadPlane.visible;} //for debug purpose

    };

    return Navigation;

});

