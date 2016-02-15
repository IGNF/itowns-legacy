define (['Cartography', 'Cartography3D', 'Navigation', 'GraphicEngine', 'LaserCloud','jquery', 'three', 'Draw',
        'MeshManager','Ori','Measure','Panoramic','lib/postprocessing/WeatherEffects',
        'Utils','SphericalPanoramic', 'Dispatcher'],
    function (Carto, Cartography3D, Navigation, gfxEngine, LaserCloud , $, THREE, Draw, MeshManager,Ori,
    Measure, Panoramic, WeatherEffects,  Utils, SphericalPanoramic, Dispatcher)
    {


        /**PRIVATE MEMBERS****************************************************************************************/

        // ATTRIBUTES

        //mouse properties

        var _mouseButtons = {
            0 : false,   //left
            1 : false,   //middle
            2 : false   //right
        };


        var _mouseLastXDown = null,
        _mouseLastYDown = null,
        _mouseSensitivity = null,
        _mouseX = null,
        _mouseY = null,
        _mouse3D = null,    // 3D position on mouse using raycasting
        _ClickAndGoActivated = true,
        _intersects = null,
        _keepMoving = false,
        _keepMovingFirstLaunched = false,
        _draging = false,
        _moveSpeed = 0.03,
        _pointLine1 = null,
        _pointLine2 = null,
        _lastPointLine2 = null,
        _tabPointsMesureX = [],
        _zero       = null,
        _textOpt    = {style :{fontSize:76}, delimiter :',', name :"geoLocation"},
        _light = new THREE.Vector3(0,0,0);

        var startSelection = null;
        var endSelection = null;
        var _screenshot = null;
        var _SELECTED = null;
        var _removeDrop = {68: false, 16: false};
        var _indice = null;
      

        function onDocumentMouseDown(event) {
            //event.stopPropagation();
           // event.originalEvent.preventDefault(); // hack to  remove text selection mouse cursor
            _mouseButtons[event.button] = true;

                _mouseX = event.clientX ;
                _mouseY = event.clientY ;

                _mouseLastXDown = event.clientX;
                _mouseLastYDown = event.clientY;

                onPointerDownPointerX = event.clientX;
                onPointerDownPointerY = event.clientY;

		var bDroit = (_mouseButtons[2] == true);
               // console.log("bDroit",bDroit);
                if(!event.ctrlKey &&(LaserCloud.btnSwitchPoint && event.button === 2) || (LaserCloud.btnSwitchPoint && event.shiftKey) ){

                    if(/*!$("#chbxSnappON").prop("checked")*/true) {
                            var zero = gfxEngine.getZero();
                            var pointLineMesureX = LaserCloud.getXYZFromClick2D(_mouseX,_mouseY,10);
                               _tabPointsMesureX.push(pointLineMesureX);
                            var id= Draw.drawSphereAt(pointLineMesureX,0.04,0xFAE361,true);  // Useradded = true
                            var realx = pointLineMesureX.x + parseFloat(zero.x),
                                realy = pointLineMesureX.y + parseFloat(zero.y),
                                realz = pointLineMesureX.z + parseFloat(zero.z);
                            var text = "E:"  +   realx.toFixed(2)  + ","
                                     + "N:"  +   realz.toFixed(2)  + ","
                                     + "h:"  +   realy.toFixed(2)  + ","
                                     + "id:" +  id;
                            var position = {x:pointLineMesureX.x,y:pointLineMesureX.y + 0.25,z:pointLineMesureX.z};
                                Draw.addTextPanel(text,position,_textOpt);

                                
                                Measure.setLastMeasure({x:realx,y:realy,z:realz});
                                Dispatcher.send("MEASURE");

                                  
                    }else{
                                LaserCloud.fitLineToNeighboursPointFromClick(_mouseX,_mouseY);
                    }
                }

                if((LaserCloud.btnSwitchLine && event.button === 2 && !event.shiftKey)
                                        ||(LaserCloud.btnSwitchLine && (event.button === 0) && event.shiftKey) ){    // Distance measurement
                        _pointLine1 = LaserCloud.getXYZFromClick2D(_mouseX,_mouseY);
                }


                if (!event.altKey){
                    // Draw boundingbox for 3D extraction
                    if(event.ctrlKey && event.button === 2){

                        if(!LaserCloud.btnSwitchVolume)
                             LaserCloud.estimateWidth(_mouseX,_mouseY,"Move");
                     }else

                     if(LaserCloud.btnSwitchVolume && (event.button === 2 || event.shiftKey)) {

                            if(Draw.tabBoundingBox.length == 0){
                                _pointLine1 = LaserCloud.getXYZFromClick2D(_mouseX,_mouseY);
                                //console.log(_pointLine1);
                                Draw.tabBoundingBox.push(_pointLine1);
                            }
                            else if (Draw.tabBoundingBox.length == 2 && !Draw.drawBB){  // We begin the width knowing the base and keeping parallelism
                                Draw.drawBB = true;
                            }
                            else if (Draw.drawBB == true){
                                Draw.drawBB2 = true;
                            }
                     }



                }
        }

        function onDocumentMouseUp(event) {
            
            //event.stopPropagation();
           // event.originalEvent.preventDefault();
            var bDroit = (_mouseButtons[2] == true);
            _mouseButtons[event.button] = false;

            if(Draw.drawBB2){
                Draw.BBCreated = false;
                Draw.drawBB2 = false;
                Draw.drawBB = false;
                Draw.tabBoundingBox = [];
                LaserCloud.checkAllPointsInBB(Draw.ptAtemp,Draw.ptBtemp,Draw.ptCtemp,Draw.ptDtemp,Draw.alphaBB,Draw.heightBB);  // Compute pointSelection within the bounding box
                Draw.ptAtemp.add(gfxEngine.getZeroAsVec3D());
                Draw.ptBtemp.add(gfxEngine.getZeroAsVec3D());
                Draw.ptCtemp.add(gfxEngine.getZeroAsVec3D());
                Draw.ptDtemp.add(gfxEngine.getZeroAsVec3D());
                if (false/*$("#connected").length==1*/)    // SAVE BB TO DB
                    LaserCloud.saveBBInputs(Draw.ptAtemp,Draw.ptBtemp,Draw.ptCtemp,Draw.ptDtemp, Draw.heightBB);
            }
            else{

                // If we are measuring in 3D and want to keep values drawn on screen
                if(LaserCloud.btnSwitchLine && !event.ctrlKey){
                    if(_pointLine1 !== null && _pointLine2 !== null){
                        if(_pointLine2.y !==-1 && _pointLine1.y!==-1 && _pointLine2.y && _pointLine1.y){  // Test de cohérence si point laser trouve
                            var dist = _pointLine1.distanceTo(_pointLine2).toFixed(2);
                            if(dist < 80){
                                Draw.drawOneMoreLine(_pointLine1,_pointLine2);
                                var pente = 100* Math.abs(_pointLine2.y - _pointLine1.y)/ Math.sqrt((_pointLine2.x - _pointLine1.x) * (_pointLine2.x - _pointLine1.x)
                                                                                                    +(_pointLine2.z - _pointLine1.z) * (_pointLine2.z - _pointLine1.z));
                                if(pente>200) pente = 200;
                                // We compute the distance between the 2 vertex
                                Draw.showTextAtPos3D(dist+"m "+pente.toFixed(1)+"%",_pointLine2/*gfxEngine.getPositionCloserToCam(pointLineMesure2,0.1)*/,40);

                                //draw on map
                                var zero = gfxEngine.getZero();
                                var p1 = new THREE.Vector3(_pointLine1.x + parseFloat(zero.x),
                                                           _pointLine1.y + parseFloat(zero.y),
                                                           _pointLine1.z + parseFloat(zero.z));
                                var p2 = new THREE.Vector3(_pointLine2.x + parseFloat(zero.x),
                                                           _pointLine2.y + parseFloat(zero.y),
                                                           _pointLine2.z + parseFloat(zero.z));

                                Carto.showLineMeasureOnMap(p1,p2,Carto.getLaserLayer(),"EPSG:2154",{ strokeWidth: 1.5,strokeColor: "#aaff0f" });
                                if (false/*$("#connected").length==1*/)    // SAVE LINE TO DB
                                    LaserCloud.saveLineInputs(_pointLine1.clone().add(gfxEngine.getZeroAsVec3D()),
                                                              _pointLine2.clone().add(gfxEngine.getZeroAsVec3D()));

                           }
                        }
                        _pointLine1 = null;
                        _pointLine2 = null;
                    }
                }

                mouseXOnMouseUp = event.clientX;
                mouseYOnMouseUp = event.clientY;

                
                if( MeshManager.getCurrentObject().name =="RGE" && !bDroit && mouseXOnMouseUp == _mouseX && mouseYOnMouseUp == _mouseY && !event.shiftKey){
                    
                 //   clickAndGo(Draw.getSurfaceType());  //clickAndGo("SkyToGround"); 
                    if(!Panoramic.getVisibility() /*&& !$("#checkbox2").prop("checked") && !$("#checkbox1").prop("checked")*/) {  // From aerial to terrestrial
                        if(Draw.getSurfaceType() == "Circle")
                             clickAndGo("SkyToGround"); 
                         else
                             clickAndGo(Draw.getSurfaceType()); 
                        gfxEngine.setBase3DGlasses(6);
                       /* $("#checkbox2").prop("checked", true);*/
                        Panoramic.tweenGeneralOpacityUp();
                        Panoramic.setVisibility(true);
                        MeshManager.setSkyBoxVisibility(false);
						Cartography3D.setVisibility(false);
                    }else
                        clickAndGo(Draw.getSurfaceType()); 
                    //setTimeout(Panoramic.setVisibility, 1000);
                }
            }

                if(event.ctrlKey && event.button === 2 && !LaserCloud.btnSwitchVolume){

                        //TEMP PMR
                        //LaserCloud.estimateSlope(_mouseX,_mouseY);
                        LaserCloud.estimateWidth(mouseXOnMouseUp,mouseYOnMouseUp,"Stay");
                    }

            _draging = false;
        }

        function onDocumentMouseWheel( event ) {
     
            event.preventDefault();  // **Not mandatory here **
            console.log(event.originalEvent.wheelDelta, event.originalEvent.detail );
            var wheelData = event.originalEvent.wheelDelta/120;
            var isFireFox = (navigator.userAgent.indexOf('Firefox') != -1); 
            if(isFireFox) wheelData = - event.originalEvent.detail /3;
            gfxEngine.cameraZoom(-5*wheelData);
            
            Dispatcher.send("ZOOM");
            Draw.setSurfaceScaleAndOpacity(gfxEngine.getCameraFov()/120); //10-160
            // Draw.drawSurface(_mouse3D,_intersects[0].face.normal);

            // if there is a seleted object & shift is pressed, then resize object
            if (_SELECTED !== null && event.shiftKey) {

            	var border = 0.12; // inner css plane border
            	var wheel = event.originalEvent.wheelDeltaX/12000;

            	_SELECTED.fontPlane.scale.x += wheel;
            	_SELECTED.fontPlane.scale.y += wheel;

            	_SELECTED.cssPlane.scale.x += wheel - (wheel*border);
            	_SELECTED.cssPlane.scale.y += wheel - (wheel*border);

            }
        }


        function onDocumentMouseMove(event) {

            var _mouseX = event.clientX ;
            var _mouseY = event.clientY ;
            

            if ((_mouseButtons[0] === true) && !event.shiftKey) { //left mouse button pressed

                _draging = true;
                if(event.altKey){

                    //@todo Clean it
                    var difX =  (_mouseX - _mouseLastXDown)*_moveSpeed; // movespeed to set
                    var difY = -(_mouseY - _mouseLastYDown)*_moveSpeed;

                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(1,0,0),difX);		// On translate ds le repere camera
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(0,0,1),difY);
                    var translatX = gfxEngine.getCamera().position.x;					// On recup les nouvelles positions
                    var translatZ = gfxEngine.getCamera().position.z;
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(1,0,0),-difX);		// On remet en position initiale pour pouvoir tweener.
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(0,0,1),-difY);

                    gfxEngine.translateCameraSmoothly( translatX,gfxEngine.getTranslatCam().y,translatZ);
                }
                else {     // camera ROTATION

                   // var longitudeRot = ( _mouseLastXDown - event.clientX ) * _mouseSensitivity;
                    var angleCameraLat = gfxEngine.getAngleCameraLat();
                    var angleCameraLon = gfxEngine.getAngleCameraLon();

                    var angleCamLat = angleCameraLat + ( _mouseLastYDown - event.clientY ) * _mouseSensitivity;
                    var angleCamLon = angleCameraLon + ( _mouseLastXDown - event.clientX ) * _mouseSensitivity;
                    if (angleCamLat > -1.57 && angleCamLat < 1.57) angleCameraLat = angleCamLat;   // To avoid gumball effects
                    angleCameraLon = angleCamLon;

                    gfxEngine.setCameraLonLatAngle(angleCameraLon,angleCameraLat);

                    var targetDist = gfxEngine.getTargetDist();

                    var x = -targetDist * Math.sin(angleCameraLon);
                    var z = -targetDist * Math.cos(angleCameraLon);
                    var y =  targetDist * Math.tan(angleCameraLat);


                    gfxEngine.setWantedCamRotation(x,y,z);
                    // Send event
                    Dispatcher.send("ORIENTATION");

                    _mouseLastXDown = event.clientX;
                    _mouseLastYDown = event.clientY;

                   // Carto.rotatePositionMarker(angleCameraLon);
                }
            }else{

                

                //   ******   *CLICK & GO  ***** Test mouse over mesh bati for google style effect over facades and roads********
                if(  MeshManager.getCurrentObject().name =="RGE" && _ClickAndGoActivated && !event.ctrlKey){

                    //var mB = MeshManager.getCurrentObject();  // Get rge mesh or at least a road plane
                    var mB = MeshManager.getCurrentMeshForClickAndGo();
                    var mFES = MeshManager.getMeshFES();
                    var objects = [];
                    if (mB) objects.push(mB);
                    if (mFES) objects.push(mFES);
                    _intersects = gfxEngine.getIntersected(event.clientX,event.clientY, objects);//gfxEngine.getScene().children);
                    if(_intersects[0]){
                        _mouse3D = new THREE.Vector3(_intersects[0].point.x,_intersects[0].point.y,_intersects[0].point.z);   // y+0.05 to put over mesh RGE to see clean
                        Draw.drawSurface(_mouse3D,_intersects[0].face.normal);                   //CLICKANDGO
                    }
                }
            }

            //laser measure
            if((LaserCloud.btnSwitchLine && event.button === 2 && !event.shiftKey)
                          || (LaserCloud.btnSwitchLine && (event.button === 0) && event.shiftKey) ){
                    _pointLine2 = LaserCloud.getXYZFromClick2D(_mouseX,_mouseY);

                    if(_pointLine2.y !==-1 && _pointLine1.y!==-1 && _pointLine2.y && _pointLine1.y){  // Test de coherence si point laser trouve
                            var dist = _pointLine1.distanceTo(_pointLine2).toFixed(2);
                            if(dist < 80){

                                  Draw.drawLine(_pointLine1,_pointLine2);
                                  // Pente in %
                                  var pente = 100 * Math.abs(_pointLine2.y - _pointLine1.y)/ Math.sqrt((_pointLine2.x - _pointLine1.x) * (_pointLine2.x - _pointLine1.x)
                                                                                                    +(_pointLine2.z - _pointLine1.z) * (_pointLine2.z - _pointLine1.z));
                                  if(pente>200) pente = 200;
                                    // We compute the distance between the 2 vertex
                                  Draw.showTextAtPos3DSameMesure(dist+"m "+pente.toFixed(1)+"%",_pointLine2/*gfxEngine.getPositionCloserToCam(pointLineMesure2,0.1)*/,40);
                                  _lastPointLine2 = _pointLine2;
                            }

                    } else{
                           if(_lastPointLine2!=null) _pointLine2 = _lastPointLine2;
                    }

             }

              //TEMP PMR
              if(event.ctrlKey && event.button === 2 && !LaserCloud.btnSwitchVolume){

                     //LaserCloud.estimateSlope(_mouseX,_mouseY);
                     LaserCloud.estimateWidth(_mouseX,_mouseY,"Move");
              }

             if((LaserCloud.btnSwitchVolume && event.button === 2) || (LaserCloud.btnSwitchVolume && event.shiftKey) )
             {
                    if(!Draw.drawBB){
                        if(Draw.tabBoundingBox.length == 1 ){
                            Draw.tabBoundingBox.push( LaserCloud.getXYZFromClick2D(_mouseX,_mouseY));
                        }else  if(Draw.tabBoundingBox.length == 2){
                            Draw.tabBoundingBox[1] = LaserCloud.getXYZFromClick2D(_mouseX,_mouseY);
                            Draw.drawBBTemp(Draw.tabBoundingBox[0],Draw.tabBoundingBox[1],Draw.tabBoundingBox[0],Draw.tabBoundingBox[1],0);
                        }
                        Draw.alphaBB = Math.atan2(Draw.tabBoundingBox[1].z - Draw.tabBoundingBox[0].z, Draw.tabBoundingBox[1].x - Draw.tabBoundingBox[0].x);
                    }
                    else if (!Draw.drawBB2) {
                        var d = (_mouseX - onPointerDownPointerX)/10;

                        var ptA = Draw.tabBoundingBox[0];
                        var ptB = Draw.tabBoundingBox[1];

                        var xc = ptA.x + Math.cos(Draw.alphaBB+1.57) * d;
                        var zc = ptA.z + Math.sin(Draw.alphaBB+1.57) * d;
                        var yc = ptA.y;
                        var ptC = new THREE.Vector3(xc,yc,zc);

                        var xd = ptB.x + Math.cos(Draw.alphaBB+1.57) * d;
                        var zd = ptB.z + Math.sin(Draw.alphaBB+1.57) * d;
                        var yd = ptB.y;
                        var ptD = new THREE.Vector3(xd,yd,zd);

                        Draw.ptAtemp = ptA;
                        Draw.ptBtemp = ptB;
                        Draw.ptCtemp = ptC;
                        Draw.ptDtemp = ptD;

                        Draw.drawBBTemp(ptA,ptB,ptC,ptD,0);
                    }
                    else
                    {
                        Draw.heightBB = (onPointerDownPointerY - _mouseY)/10;
                        Draw.drawBBTemp(Draw.ptAtemp,Draw.ptBtemp,Draw.ptCtemp,Draw.ptDtemp,Draw.heightBB);
                    }
              }

           

            // TRANSLATE ON RIGHT MOUSE
            if(!event.ctrlKey && !event.altKey && event.button === 2 && !LaserCloud.btnSwitchVolume && ! LaserCloud.btnSwitchLine ){

                    //@todo Clean it
                    var difX =  -(_mouseX - _mouseLastXDown)*_moveSpeed *2* gfxEngine.getCamera().position.y/10; // movespeed to set
                    var difY =   (_mouseY - _mouseLastYDown)*_moveSpeed *6* gfxEngine.getCamera().position.y/10;

                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(1,0,0),difX);		// On translate ds le repere camera
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(0,0,1),difY);
                    var translatX = gfxEngine.getCamera().position.x;					// On recup les nouvelles positions
                    var translatZ = gfxEngine.getCamera().position.z;
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(1,0,0),-difX);		// On remet en position initiale pour pouvoir tweener.
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(0,0,1),-difY);

                    gfxEngine.translateCameraSmoothly( translatX,gfxEngine.getTranslatCam().y,translatZ);
            }


        };


        function OnDocumentKeyDown(event) {
            
            console.log("key Down");
            
            switch (event.keyCode){
                
                case 38: gfxEngine.getTranslatCam().y += 1 * _moveSpeed*33; break;
                case 40: gfxEngine.getTranslatCam().y -= 1 * _moveSpeed*33; break;
                //case 37: Navigation.loadNextPanoByName(Panoramic.getPanoNameAtIndice(1));
                //case 39: Navigation.loadNextPanoByName(Panoramic.getPanoNameAtIndice(-1));
            }
                        
        };

        //@TODO Move to navigation
        function clickAndGo(surfaceType){

        	// if css object loaded, start to detect their distances
        	// fontPlane needed to be activated on computing distance
        	

    		var posWantedLamb93 = _mouse3D.clone().add(gfxEngine.getZeroAsVec3D());
       		Navigation.goToClosestPosition(posWantedLamb93,{intersectionToLook:_mouse3D.clone(),surfaceType:surfaceType, distance:30});

        };



        /*********************************************************************************************************/

        /**
     * Manages mouse and keyboard event
     * @export Events
     */
        var Events = {
            init : function (initialInfo, initialPano, mouseSensitivity, moveSpeed) {


                //console.log('************ initializing event module');
                var $viewerContainer = $(gfxEngine.getContainerID());
                
                $($viewerContainer).mousedown(onDocumentMouseDown);
                $($viewerContainer).mousemove(onDocumentMouseMove);
                $($viewerContainer).mouseup(onDocumentMouseUp);
                $($viewerContainer).bind('mousewheel onwheel DOMMouseScroll ',onDocumentMouseWheel);
                $($viewerContainer).bind("contextmenu",function(e){
                        return false;
                });

                //$($viewerContainer).keyup(OnDocumentKeyUp);
                 $($viewerContainer).keydown(OnDocumentKeyDown);

                _mouseSensitivity = mouseSensitivity || 0.002;
                _moveSpeed = moveSpeed || _moveSpeed;

                _zero = gfxEngine.getZero();


                // SOCKET IO *********************************************************************
                // *******************************************************************************
                if(gfxEngine.getNodeControllerOn()){

                    _socketIO = io.connect("http://labuat.homepc.it:8088");
                    _socketIO.on('user message', message);
                }
                  function message (from, msg) {

                        /*var LR = eventData.gamma;
                          var FB = eventData.beta;
                          var DIR = eventData.alpha;*/
                     if(!_keepMovingFirstLaunched){_keepMovingFirstLaunched = true; Events.moveTowardDirection();}
                     Events.deviceOrientationHandler(msg.LR,msg.FB, msg.DIR);
                  }


              // Added for mobile
              if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {

                    console.log("You're on a mobile");
                  if (window.DeviceOrientationEvent) {
                      console.log("DeviceOrientation is supported");
                      window.addEventListener('deviceorientation', function(eventData) {
                                    var LR = eventData.gamma;
                                    var FB = eventData.beta;
                                    var DIR = eventData.alpha;
                                    Events.deviceOrientationHandlerSAVE(LR, FB, DIR);
                            }, false);
                    }
                }
            },


             deviceOrientationHandler: function(LR, FB, DIR){

					//console.log(LR,FB);

                 	// Check orientation, portrait/ landscape
		            /*        if(window.innerWidth > window.innerHeight && window.innerWidth<1200){   // to filter tablet with ortho accero compare to mobile
		                       var tempLR = LR;
		                       LR = FB;
		                       FB = - tempLR ;
		                   }
		            */

		            if(LR !=777){  //ROTATION

                                if(Math.abs(LR)<5) LR = 0;  // STABILIZE
                                if(Math.abs((FB))<5) FB = 0;


                                // var longitudeRot = ( _mouseLastXDown - event.clientX ) * _mouseSensitivity;
                                var angleCameraLat = gfxEngine.getAngleCameraLat();
                                var angleCameraLon = gfxEngine.getAngleCameraLon();

                                var angleCamLat = angleCameraLat - ( (FB)/180 * Math.PI *2 ) * _mouseSensitivity *27;
                                var angleCamLon = angleCameraLon + ( (LR)/360 * Math.PI *2)  * _mouseSensitivity*75;
                                if (angleCamLat > -1.57 && angleCamLat < 1.57) angleCameraLat = angleCamLat;   // To avoid gumball effects
                                angleCameraLon = angleCamLon;

                                gfxEngine.setCameraLonLatAngle(angleCameraLon,angleCameraLat);

                                var targetDist = gfxEngine.getTargetDist();

                                var x = -targetDist * Math.sin(angleCameraLon);
                                var z = -targetDist * Math.cos(angleCameraLon);
                                var y =  targetDist * Math.tan(angleCameraLat);


                                gfxEngine.setWantedCamRotation(x,y,z);
                                //gfxEngine.tiltCamera(angleCamLat);

                                //_mouseLastXDown = event.clientX;
                                //_mouseLastYDown = event.clientY;

                                Carto.rotatePositionMarker(angleCameraLon);

                                _keepMoving = DIR;



		            }
                  
            },

           moveTowardDirection: function(){

               if(_keepMoving){
                    var speed = 14;
                    var difX =  0;//-(_mouseX - _mouseLastXDown)*_moveSpeed *8; // movespeed to set
                    var difY =  speed;//(_mouseY - _mouseLastYDown)*_moveSpeed *6;
                    var difYY = speed;

                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(1,0,0),difX);		// On translate ds le repere camera
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(0,0,1),difY);
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(0,1,0),difYY);
                    var translatX = gfxEngine.getCamera().position.x;					// On recup les nouvelles positions
                    var translatZ = gfxEngine.getCamera().position.z;
                    var translatY = gfxEngine.getCamera().position.y;
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(1,0,0),-difX);		// On remet en position initiale pour pouvoir tweener.
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(0,0,1),-difY);
                    gfxEngine.getCamera().translateOnAxis(new THREE.Vector3(0,1,0),-difYY);

                    gfxEngine.translateCameraSmoothly( translatX,translatY,translatZ);

                }

                requestAnimSelectionAlpha(this.moveTowardDirection.bind(this));
           },

           deviceOrientationHandlerSAVE: function(LR, FB, DIR){

                 // Check orientation, portrait/ landscape
                    if(window.innerWidth > window.innerHeight && window.innerWidth<1200){   // to filter tablet with ortho accero compare to mobile
                       var tempLR = LR;
                       LR = FB;
                       FB = - tempLR ;
                   }

                    if(Math.abs(LR+4) <5) LR = -4;
                    if(Math.abs((54-FB))<5) FB = 54;


                 // var longitudeRot = ( _mouseLastXDown - event.clientX ) * _mouseSensitivity;
                    var angleCameraLat = gfxEngine.getAngleCameraLat();
                    var angleCameraLon = gfxEngine.getAngleCameraLon();

                    var angleCamLat = angleCameraLat + ( (54-FB)/180 * Math.PI *2 ) * _mouseSensitivity *18;
                    var angleCamLon = angleCameraLon + ( (LR+4)/360 * Math.PI *2) * _mouseSensitivity*50;
                    if (angleCamLat > -1.57 && angleCamLat < 1.57) angleCameraLat = angleCamLat;   // To avoid gumball effects
                    angleCameraLon = angleCamLon;

                    gfxEngine.setCameraLonLatAngle(angleCameraLon,angleCameraLat);

                    var targetDist = gfxEngine.getTargetDist();

                    var x = -targetDist * Math.sin(angleCameraLon);
                    var z = -targetDist * Math.cos(angleCameraLon);
                    var y =  targetDist * Math.tan(angleCameraLat);


                    gfxEngine.setWantedCamRotation(x,y,z);

                    _mouseLastXDown = event.clientX;
                    _mouseLastYDown = event.clientY;

                    Carto.rotatePositionMarker(angleCameraLon);
            },

            setSensitivy : function (sensitivity){
                _mouseSensitivity = sensitivity;
            },

            setMoveSpeed : function (speed){
                _moveSpeed = speed;
            },

            setPointLineMesure : function(pt1,pt2){
                 _pointLine1 = pt1;
                 _pointLine2 = pt2;
            },
/*
            hideMenuAll: function(){

                var hidden = $("#sidebar")[0].hidden;
                $("#sidebar")[0].hidden = !hidden;
                $("#search")[0].hidden = !hidden;
                $("#localisation")[0].hidden = !hidden;
                $("#sponsors")[0].hidden = !hidden;
                $("#up")[0].hidden = !hidden;
            },
           */ 
            playWithLight: function(){
               
                if(_light.x <1){
                    _light.x +=0.01;
                    _light.z +=0.02;}
                else {
                    _light.x =0;
                    _light.z =0;
                }
             //   _light.x +=0.01;
            //    _light.z +=0.01;
                
                require("Cartography3D").setLightPosition( _light);//.normalize());
                requestAnimSelectionAlpha(this.playWithLight.bind(this));
            }

        }

        return Events;
    });
