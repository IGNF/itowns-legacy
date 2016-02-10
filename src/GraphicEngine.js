define(['lib/three', 'jquery', 'Utils', 'lib/postprocessing/EffectComposer'], function(THREE, $, Utils, EffectComposer) {

    //PRIVATE MEMBERS*****************************************************************************************
    //********************************************************************************************************

    // ATTRIBUTES
    //*************************************

    //Camera properties
    var     _camera = null,
            _view_angle = null,
            _aspect = null,
            _near = null,
            _far = 10000,
            _farFog = 250,
            _yaw = 0,
            _pitch = 0,
            _effectFog = null,
            _toneMapping= null,
            _scaleGlobal = 1,  // TO render faster on mobile for ex use scale subsamp
            _mobileVersion = false,   // Optimize rendering for low power gpu and change texture for bati3d to jpeg
            _effectFogIntensity = 0,
            _speedTurnCam = 0.01,
            _speedTransCam = 0.04, //0.04,
            _cameraHelper = null,
            _orbitCameraOn = false,
            _nodeControllerOn = false,
            _centerOrbit = null,
            _oldCamPos = null,
            _oldTarget = null,
            _camDraw = null,
            _currentTargetPos = null,
            _wantedTargetPos = null,
            _targetDist = null,
            _angleCameraLon = null,
            _angleCameraLat = null,
            // Added for smooth moves
            _translatCam = {x: 0, y: 0.6, z: 0},
            _trip = {x: 0}, // Current distance to do while translating
            _containerId = "#",
            _winWidth = null,
            _winHeight = null,
            _scene = null,
            _axisHelper = null,
            _renderer = null,
            _zero = null,
            _initialized = false,
            // POST PROCESSING
            _lensFlare = null,
            _sunLight = null,
            depthMaterial = null, composer = null,
            depthPassPlugin = null, depthTarget = null, colorTarget = null, material_depth = null,
            _postprocessing = { enabled  : false, guiBool: true},
            _effects = {climate:false, sharpen:false, brightness:false, hdr:false},
            _anaglyph = null,
            _Base3DGlasses = 200,
            _arrEffects = [],
            _msWater = null,
            _renderPass,
    _textPanels = [],
            _grid = null,
			raycaster = new THREE.Raycaster(); // create once
    // METHODS
    //*************************************


    _states = {
        ON_GIZMO: false,
        MESH_MANIPULATION: false,
        MULTIMEDIA_MANIPULATION: false
    },
    _statesHandler = {
        MESH_MANIPULATION: function(val) { //display axis
            if (val !== _states["MESH_MANIPULATION"]) {
                _currentGizmo.toggleAxis(val);
                if (val === true) {
                    _currentGizmo.toggleDisplay(false);
                }
                else {
                    GraphicEngine.setGizmoToMesh(_currentGizmo.selectedMesh);
                }
            }
        }
    };

    /*
     * 
     * @returns {undefined}
     */
    function initCamera() {

        _aspect = _winWidth / _winHeight;
        _view_angle = 80;
        _near = 0.2;
        _far = 10000;   // 10000 meters max distance visible (useful for laser buffer)
        _speedTurnCam = 0.1;
        _wantedTargetPos = new THREE.Vector3(0, 0, -100000);
        _currentTargetPos = new THREE.Vector3(0, 0, 0);

        _camera = new THREE.PerspectiveCamera(_view_angle, _aspect, _near, _far);
        _camera.lookAt(new THREE.Vector3(0, 0, 0));
        _camera.position.x = 0;       
        _camera.position.y = 0.6;
        _camera.position.z = 0;  
        _camera.scale = new THREE.Vector3(1, 1, -1);     // -1 for the z to go from user to inside the screen (north)
        _angleCameraLat = 0;
        _angleCameraLon = 0;
        _targetDist = 100000;
    }

    /*
     * 
     * @param {type} geom
     * @param {type} name
     * @returns {GraphicEngine_L1.addGeometry.mesh|GraphicEngine_L1.THREE.Mesh}
     */
    function addGeometry(geom, name) {
        var material = new THREE.MeshPhongMaterial({
            ambient: 0xcccccc
        });
        var mesh = new THREE.Mesh(geom, material);
        mesh.name = name;
        mesh.position = new THREE.Vector3(_camera.position.x, _camera.position.y - 0.6, _camera.position.z + 0.7);
        GraphicEngine.rotateY(_angleCameraLon, mesh);
        _scene.add(mesh);
        return mesh;
    }



    // SHIM
    //*************************************
    // @see http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    window.requestAnimFrame = (function() {
        return  window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback, element) {
                    window.setTimeout(callback, 1000 / 60);
                };
    })();

    //END OF PRIVATE MEMBERS**********************************************************************************
    //********************************************************************************************************

    var GraphicEngine = {
        
        init: function(containerId) {

            _winWidth = window.innerWidth;
            _winHeight = window.innerHeight;

            initCamera();

            _scene = new THREE.Scene();
            _scene.add(_camera);

            // LIGHT
            _scene.add(new THREE.AmbientLight(0xcccccc));

            //render init
            _renderer = new THREE.WebGLRenderer({
            	preserveDrawingBuffer: true,   // required to support .toDataURL()
            	antialias: true,
            	alpha: true
            });
            _renderer.setSize(_winWidth/_scaleGlobal, _winHeight/_scaleGlobal);
            _renderer.setClearColor(new THREE.Color(0x000000, 1.)); // opacity?
            _containerId += containerId;
            $container = $(_containerId);
            $container.append(_renderer.domElement);

            var canvas = _renderer.domElement;
            canvas.id ="canvasWEBGL";
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            canvas.style.zIndex = "-1";

            //grid
            _grid = new THREE.Mesh(
                    new THREE.PlaneGeometry(1000, 1000, 100, 100),
                    new THREE.MeshBasicMaterial({
                        wireframe: true,
                        color: 0xcccccc,
                        side: THREE.DoubleSide
                    }));
            _grid.rotation.x = -Math.PI * 0.5;
            _grid.position.y = -50;

            //manage window resize
            $(window).resize(function() {
                _camera.aspect = window.innerWidth / window.innerHeight;
                _camera.updateProjectionMatrix();
                _winWidth = window.innerWidth/_scaleGlobal;
                _winHeight = window.innerHeight/_scaleGlobal;
                _renderer.setSize(_winWidth, _winHeight);
                var canvas = _renderer.domElement;//document.getElementsByTagName('canvas')[0];
                canvas.style.width = window.innerWidth + 'px';
                canvas.style.height = window.innerHeight + 'px';
            });

            // TEST POSTPROCESSING*********************************
            //if (postprocessing.enabled)
            this.initPostprocessing();

            _initialized = true;
        },

        initPostprocessing: function() {

            composer = new THREE.EffectComposer(_renderer);

            // Depth material
            material_depth = new THREE.MeshDepthMaterial();
            //  material_depth.blending = THREE.NormalBlending;//.NoBlending;
            material_depth.side = THREE.DoubleSide;  // ! important

            // First classic pass not needed here cause in render function we write color to color texture already
            _renderPass = new THREE.RenderPass( _scene, _camera );


            // We create the 2 rendertargets. One for the color and the other for the depth

            var pars = {minFilter: THREE.LinearMipMapLinear, magFilter: THREE.LinearMipMapLinear, format: THREE.RGBAFormat, antialias: true };
                _postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget( _winWidth, _winHeight, pars );
                _postprocessing.rtTextureColor = new THREE.WebGLRenderTarget( _winWidth, _winHeight, pars );


            // Fog Effect
                _effectFog = new THREE.ShaderPass( THREE.ItownsDepthShader); // Our special shader (fog effect initially)
                _effectFog.uniforms[ 'maxblur' ].value = 100.;
                _effectFog.uniforms[ 'tColor' ].value = _postprocessing.rtTextureColor;   // we set the value of color texture to the good render target
                _effectFog.uniforms[ 'tDepth' ].value = _postprocessing.rtTextureDepth;   // here for depth
                _effectFog.uniforms['effectIntensity'].value = _effectFogIntensity;
                _effectFog.uniforms['indice_time'].value = 0.;
                _effectFog.enabled = false;
                _effectFog.renderToScreen = false;
                _arrEffects.push(_effectFog);

                

                 var hueSaturation = new THREE.ShaderPass(THREE.HueSaturationShader);
                 hueSaturation.enabled = false;
                 hueSaturation.renderToScreen = false;
                 _arrEffects.push(hueSaturation);
                 
                
                 composer.addPass( _renderPass );  // Not needed for fog effect cause it uses postprocessing.rtTextureColor from scene global rendering
                 composer.addPass( _effectFog );
                 
                 composer.addPass( hueSaturation );
                

         // Test HDR (ToneMapping)  **************************************************************
                 
                _postprocessing.textureOriginal = new THREE.WebGLRenderTarget( _winWidth, _winHeight, pars );
                _postprocessing.textureBlurred  = new THREE.WebGLRenderTarget( _winWidth, _winHeight, pars );
            
                 var blurOnX = new THREE.ShaderPass(THREE.blurTriangleX);
                 blurOnX.uniforms[ 'radius' ].value = 50.;
                 blurOnX.uniforms[ 'resolutionW' ].value = _winWidth;
                 blurOnX.enabled = false;
                 blurOnX.renderToScreen = false;
                 _arrEffects.push(blurOnX);
                 
                 var blurOnY = new THREE.ShaderPass(THREE.blurTriangleY);
                 blurOnY.uniforms[ 'radius' ].value = 50.;
                 blurOnY.uniforms[ 'resolutionH' ].value = _winHeight;
                 blurOnY.enabled = false;
                 blurOnY.renderToScreen = false;
                 _arrEffects.push(blurOnY);
                 
                 composer.addPass( blurOnX );
                 composer.addPass( blurOnY );
                 //_arrEffects.push(blurOnX); 
                 
                 _toneMapping = new THREE.ShaderPass(THREE.ItownsToneMapping);
                 _toneMapping.uniforms[ 'tColor' ].value = _postprocessing.textureOriginal;
                 _toneMapping.enabled = false;
                 _toneMapping.renderToScreen = false;
                 _arrEffects.push(_toneMapping);
                 composer.addPass(_toneMapping );
                 
                 // moved at the end to sharpen final image
                 var sharpenEffect = new THREE.ShaderPass(THREE.ItownsSharpening);
                 sharpenEffect.enabled = false;
                 sharpenEffect.renderToScreen = false;
                 _arrEffects.push(sharpenEffect);
                 composer.addPass( sharpenEffect );   

         /*
                // UNSHARP MASKING DEPTH BUFFER
             var renderPass = new THREE.RenderPass( _scene, _camera );

             var blurEffectXDepth = new THREE.ShaderPass( THREE.blurTriangleXDepth);
                blurEffectXDepth.uniforms[ 'tDepth' ].value = _postprocessing.rtTextureDepth;
             blurEffectXDepth.uniforms[ 'radius' ].value = 50.;
             blurEffectXDepth.uniforms[ 'resolutionW' ].value = _winWidth;

             var blurEffectY = new THREE.ShaderPass( THREE.blurTriangleY);
         //     blurEffectY.uniforms[ 'textureIn' ].value = _postprocessing.rtTextureColor;
             blurEffectY.uniforms[ 'radius' ].value = 50.;
             blurEffectY.uniforms[ 'resolutionH' ].value = _winHeight;


             var unSharpMaskingEffect = new THREE.ShaderPass( THREE.unsharpMasking);
                unSharpMaskingEffect.uniforms[ 'tDepth' ].value = _postprocessing.rtTextureDepth;
             //  unSharpMaskingEffect.uniforms[ 'tBlur' ].value = 5.;  // Actually the blur is passed in as tDiffuse
                unSharpMaskingEffect.uniforms[ 'textureIn' ].value = _postprocessing.rtTextureColor;

             var blurEffectX2 = new THREE.ShaderPass( THREE.blurTriangleX);
             blurEffectX2.uniforms[ 'radius' ].value = 5.;
             blurEffectX2.uniforms[ 'resolutionW' ].value = _winWidth;

             var blurEffectY2 = new THREE.ShaderPass( THREE.blurTriangleY);
             blurEffectY2.uniforms[ 'radius' ].value = 5.;
             blurEffectY2.uniforms[ 'resolutionH' ].value = _winHeight;

             var itownsMask = new THREE.ShaderPass( THREE.itownsMask);
                itownsMask.uniforms[ 'textureIn' ].value = _postprocessing.rtTextureColor;


             //composer.addPass( renderPass );
             //   composer.addPass( renderPass );
            //    composer.addPass( _effectFog );

             // UNSHARP MASKING DEPTHBUFFER

             composer.addPass( blurEffectXDepth );
             composer.addPass( blurEffectY );
             composer.addPass( unSharpMaskingEffect );
             composer.addPass( blurEffectX2 );
             composer.addPass( blurEffectY2 );
             composer.addPass( itownsMask);

             //blurEffectY2.renderToScreen = true;
             itownsMask.renderToScreen = true;
             //unSharpMaskingEffect.renderToScreen = true;
             // blurEffectY.renderToScreen = true;
             */
        },
        addFogEffect: function(){

             _effectFog.enabled = true;

            /* _effectFog.renderToScreen = true;
             composer.addPass( _effectFog );
             _arrEffects.push(_effectFog);
             _previousEffectRenderedToScreen.renderToScreen  = false;
             _previousEffectRenderedToScreen = _effectFog;
            */
             //_currentEffectRenderedToScreen = _effectFog;
             this.updateEffectRenderToScene();
             _postprocessing.enabled = this.updateEffectRenderToScene();
        },

        removeFogEffect: function(){

            _effectFog.enabled = false;
           // _previousEffectRenderedToScreen.renderToScreen  = false;
           _postprocessing.enabled = this.updateEffectRenderToScene();

        },


        setPostProcessingOn: function(b){
            _postprocessing.enabled = b;
            _postprocessing.guiBool = b;
        },

        addPostProcess: function(){

           _arrEffects[5].enabled = true;
           _postprocessing.enabled = this.updateEffectRenderToScene();
        },


        setAnaglyphOnOff: function(){

            if(_anaglyph == null){
                _anaglyph = new THREE.AnaglyphEffect(_renderer,_Base3DGlasses);
                _anaglyph.setSize(window.innerWidth, window.innerHeight);
            }else{
                _anaglyph = null;
            }
            _postprocessing.enabled = this.updateEffectRenderToScene();
        },


        switch3DGlasses: function(){

            if(_anaglyph)
               _anaglyph.switchMaterial();
        },

        setBase3DGlasses: function(v){
             _Base3DGlasses = v;
             if(_anaglyph)
                _anaglyph.setFocalLength(v,_camera);
        },


        // If no index then remove last postprocess
        removePostProcess: function(index){

           _arrEffects[5].enabled = false;
           _postprocessing.enabled = this.updateEffectRenderToScene();
        },

        addHueSaturation : function(){
            _arrEffects[1].enabled = true;
           _postprocessing.enabled = this.updateEffectRenderToScene();
        },

        removeHueSaturation: function(){
           _arrEffects[1].enabled = false;
           _postprocessing.enabled = this.updateEffectRenderToScene();
        },

        setSaturationValue : function(value){
            if(!_arrEffects[1].enabled) this.addHueSaturation();
            _arrEffects[1].uniforms[ 'saturation' ].value = (value - 100.) /100.;
        },

        setHueValue : function(value){
            if(!_arrEffects[1].enabled) this.addHueSaturation();
            _arrEffects[1].uniforms[ 'hue' ].value = (value -100.) /100.;
        },

        setContrastValue : function(value){
            if(!_arrEffects[1].enabled) this.addHueSaturation();
            _arrEffects[1].uniforms[ 'contrast' ].value = value /100.;
        },

        setBrightnessValue : function(value){
            if(!_arrEffects[1].enabled) this.addHueSaturation();
            _arrEffects[1].uniforms[ 'brightness' ].value = value /100.;
        },

        setToneMapping : function(value){
            if(!_arrEffects[4].enabled) this.addToneMapping();
            //_arrEffects[3].uniforms[ 'saturation' ].value = (value - 100.) /100.;
        },
        
        addToneMapping : function(){
            
            // ADD Hue Saturation TOO
            this.addHueSaturation();
            this.setSaturationValue(26);
            this.setBrightnessValue(170);
            _arrEffects[2].enabled = true;
            _arrEffects[3].enabled = true;
            _arrEffects[4].enabled = true;
            _postprocessing.enabled = this.updateEffectRenderToScene();
        },
        
        removeToneMapping: function(){
           _arrEffects[2].enabled = false;
           _arrEffects[3].enabled = false;
           _arrEffects[4].enabled = false;
           _postprocessing.enabled = this.updateEffectRenderToScene();
           
           // REMOVE HUESATURATION
           // (back to normal)
            this.setSaturationValue(100);
            this.setBrightnessValue(100);
        },
        
        

         // Are we on computer or tablet/phone
           //
        checkIfMobile: function(forceBoolFromURL){

          if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)  || (forceBoolFromURL)){

              _mobileVersion = true;
              _scaleGlobal = 2;

              console.log("mobile version");
            }
        },
        
         /**
         * Change resolution and other optimization for low configuration (switch mode)
         * @returns {Void}
         */
        setReso: function(){
            
            
            
            if(_scaleGlobal==2){  // Change to High Res
                this.setLowReso(0);
            }  else{  // Change to Low Res
                this.setLowReso(1);
            }
            
            this.adaptWindowResolution();
        },
        
        setLowReso: function(b){
            
            if(b){// Change to Low Res
                _scaleGlobal = 2;
                _mobileVersion = true;}
            else{// Change to High Res
                _scaleGlobal = 1;
                _mobileVersion = false;
            }
            
            this.adaptWindowResolution();
        },


        /**
         * Refresh window with right resolution using _scaleGlobal
         * @returns {Void}
         */
      adaptWindowResolution: function(){
                _camera.aspect = window.innerWidth / window.innerHeight;
                _camera.updateProjectionMatrix();
                _winWidth = window.innerWidth/_scaleGlobal;
                _winHeight = window.innerHeight/_scaleGlobal;
                _renderer.setSize(_winWidth, _winHeight);


                var canvas = _renderer.domElement;//document.getElementsByTagName('canvas')[0];

                canvas.style.width = window.innerWidth + 'px';
                canvas.style.height = window.innerHeight + 'px';
                //_renderer.setSize(_winWidth, _winHeight);
            },
            
        setNodeControllerOn: function(b){
             console.log("setNodeControllerOn", b);
            _nodeControllerOn = b;
        },


        getNodeControllerOn: function(){
            console.log("node controller",_nodeControllerOn);
            return _nodeControllerOn;
        },


        render: function() {

            // set up the next call
            requestAnimFrame(GraphicEngine.render);

            // BETA Move camera smoothly between positions
            // tweening
            if(_orbitCameraOn) {

                GraphicEngine.orbitCamera(_centerOrbit);
                GraphicEngine.lookAtScaleOk(_centerOrbit);
            } else{

                _camera.position.x += (_translatCam.x - _camera.position.x) * _speedTransCam;
                _camera.position.z += (_translatCam.z - _camera.position.z) * _speedTransCam;
                _camera.position.y += (_translatCam.y - _camera.position.y) * _speedTransCam;

                _currentTargetPos.x += (_wantedTargetPos.x - _currentTargetPos.x) * _speedTurnCam;
                _currentTargetPos.y += (_wantedTargetPos.y - _currentTargetPos.y) * _speedTurnCam;
                _currentTargetPos.z += (_wantedTargetPos.z - _currentTargetPos.z) * _speedTurnCam;

                _camera.lookAt(_currentTargetPos);
            }

          // _camera.updateProjectionMatrix();


            if ( _postprocessing.enabled ) {

                if(_effects.climate){

                    _renderer.clear();
                     if(_msWater) {_msWater.material.uniforms.time.value += 1.0 / 60.0;_msWater.render();}
                     
                    // Render scene into texture color
                    _scene.overrideMaterial = null;
                    _renderer.render( _scene, _camera, _postprocessing.rtTextureColor, true );

                    // Render depth into texture depth. We change far cam cause of texture depth depedances
                    _camera.far = _farFog;
                    _scene.overrideMaterial = material_depth;

                    _renderer.render( _scene, _camera, _postprocessing.rtTextureDepth, true );
                    _camera.far = _far;
                }

                if(_anaglyph != null) _anaglyph.render(_scene,_camera);
                
                   else{
                      if(_toneMapping.enabled){
                            _renderer.clear();
                            _scene.overrideMaterial = null;
                            _renderer.render( _scene, _camera, _postprocessing.textureOriginal, true );
                      }
                      composer.render(); // Render shader composite to screen

                   }
  
            } else {
              
                 if(_msWater) {_msWater.material.uniforms.time.value += 1.0 / 60.0;_msWater.render();}
                _renderer.render(_scene, _camera);
            }

           //  if(!_mobileVersion) _rendererCSS.render(_cssScene, _camera);    
        },
          /**
         * Render main scene with main cam. No recall animFrame.
         * @returns {Void}
         */
        renderOnce: function(){
            _renderer.render(_scene, _camera);
        },

        //renderer.render(this.sceneRTT, camera, this.rtTexture,true)
        renderToTexture: function(scene, camera, texture, bool) {

            _renderer.render(scene, camera, texture, bool);
        },
        getState: function(state) {
            if (_states.hasOwnProperty(state) === false) {
                throw TypeError("Undefined state " + state + " in graphic engine");
            }
            else {
                return _states[state];
            }
        },
        setState: function(state, value) {
            if (_states.hasOwnProperty(state) === false) {
                throw TypeError("Undefined state " + state + " in graphic engine");
            }
            else {
                if (typeof _statesHandler[state] !== "undefined") {
                    _statesHandler[state](value);
                }
                _states[state] = (value === false || value === true) ? value : false;
            }
        },
        /**
         * Throws a ray from the given mouse coordinate to the forward direction and return an array of objects
         * intersected by the ray in the set of objects from the array given as parameter
         *
         * @param {Number} x The mouse clientX coordinate
         * @param {Number} y The mouse clientY coordinate
         * @param {THREE.Mesh[]} objects Objects tested accross the ray
         * @returns {THREE.Mesh[]} Objects given as parameter and intersected by the ray
         */
        getIntersected: function(x, y, objects) {
            var point = Utils.toNDC(x, y);
			raycaster.setFromCamera( point, _camera );
			return raycaster.intersectObjects( objects );
        },
        addToScene: function(obj) {
            _scene.add(obj);
        },

        

        

        /**
         * Add a collada mesh in the scene (just for demo purpose)
         */
        addDemoMesh: function(model) {

            model.position = new THREE.Vector3(_camera.position.x, _camera.position.y - 0.6, _camera.position.z + 0.7);
            this.rotateY(_angleCameraLon, model);
            model.rotation.x = -Math.PI / 2;

            switch (model.name.split("_")[0]) {
                case "tree": // tree
                    model.scale.multiplyScalar(0.125);
                    break;
                case "bench": // bench
                    model.scale.multiplyScalar(0.01);
                    model.rotation.z = -Math.PI / 4;
                    break;
                case "light": // light
                    model.scale.multiplyScalar(0.125);
                    break;
            }
            _scene.add(model);
        },
        addCube: function(name) {
            return addGeometry(new THREE.CubeGeometry(0.25, 0.25, 0.25), name);
        },
        addSphere: function(name) {
            return  addGeometry(new THREE.SphereGeometry(0.25, 16, 12), name);
        },
        addCylinder: function(name) {
            return addGeometry(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16, 16), name);
        },
        addTextPanel: function(canvas, position, name, scale) {

            if (typeof canvas === "undefined" || typeof position === "undefined") {
                throw TypeError("one argument is undefined");
            }
            
            var scale = scale || 0.0015;
            var geomPlane = new THREE.PlaneGeometry(canvas.width, canvas.height);
            var material = new THREE.MeshBasicMaterial({
                map: new THREE.Texture(canvas),
                /*overdraw: true,*/
                transparent: true,
                depthTest: false,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            material.map.needsUpdate = true;
            var meshPlane = new THREE.Mesh(geomPlane, material);
            meshPlane.name = name;
            meshPlane.id = name;
            meshPlane.position = new THREE.Vector3(position.x, position.y, position.z);
            //   meshPlane.rotation = _camera.rotation;
            meshPlane.quaternion = _camera.quaternion;
            meshPlane.scale.multiplyScalar(scale);
            _textPanels.push(meshPlane);
            _scene.add(meshPlane);

            return meshPlane;
        },
        
        removeTextPanels: function() {
            var panelsCount = _textPanels.length;
            while (panelsCount > 0) {
                _scene.remove(_textPanels.pop());
                panelsCount--;
            }
        },
        
        
        removeTextPanelFromName: function(nameText){
            
            //_scene.remove(_scene.getObjectByName(nameText, true ));
            _scene.remove(_scene.getObjectById( nameText, true ));
            /*
            var panelsCount = _textPanels.length;
            while (panelsCount > 0) {
                if(_scene)
                _scene.remove(_textPanels.pop());
                panelsCount--;
            }*/
        },
        
        getLastTextPanel: function(){
            
            return _textPanels[_textPanels.length -1];
        },
        removeFromScene: function(obj) {
            _scene.remove(obj);
        },

        drawSphereTest: function(param) {

            var ray, position;

            if (typeof param !== "undefined") {
                ray = param.ray || 50;
                position = param.position;
            }

            var sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(ray, 8, 8),
                    new THREE.MeshBasicMaterial({color: 0xff0000})
                    );

            if (typeof position !== "undefined") {
                sphere.position = position.clone();
            }
            // add the sphere to the scene
            _scene.add(sphere);
        },
        drawRay: function(x, y)
        {
            x = (x / (window.innerWidth)) * 2 - 1;
            y = -(y / (window.innerHeight)) * 2 + 1;

            var vector = new THREE.Vector3(x, y, 1);
            var projector = new THREE.Projector();
            projector.unprojectVector(vector, _camera);

            var geom = new THREE.Geometry();
            geom.vertices.push(_camera.position);
            geom.vertices.push(vector);

            var material = new THREE.LineBasicMaterial({
                color: 0xff0000,
                linewidth: 3
            });

            var line = new THREE.Line(geom, material);
            _scene.add(line);
        },
        drawCam: function()
        {
            if (_camDraw) {
                _scene.remove(_camDraw);
                _camDraw = null;
            }
            else {
                _camDraw = new THREE.CameraHelper(_camera);
                _scene.add(_camDraw);
            }

        },

        drawBB: function(mesh) {

            var existingBB = mesh.getChildByName(mesh.name + "_" + "bb");
            if (existingBB) {
                existingBB.visible = true;
            }
            else {
                mesh.geometry.computeBoundingBox();
                var bb = mesh.geometry.boundingBox;
                var bbGeometry = new THREE.CubeGeometry(bb.max.x - bb.min.x + 0.025,
                        bb.max.y - bb.min.y + 0.025,
                        bb.max.z - bb.min.z + 0.025);
                var bbMesh = new THREE.Mesh(bbGeometry, new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    wireframe: true
                }));
                bbMesh.name = mesh.name + "_" + "bb";
                mesh.add(bbMesh);
            }
        },

        hideBB: function(mesh) {
            var bb = mesh.getChildByName(mesh.name + "_" + "bb");
            if (bb) {
                bb.visible = false;
            }
        },

        switchSceneAxis: function() {
            if (_axisHelper == null) {
                _axisHelper = new THREE.AxisHelper();
                _axisHelper.scale.set(10, 10, 10);
                _scene.add(_axisHelper);
            }
            else {
                _scene.remove(_axisHelper);
                _axisHelper = null;
            }
        },

        /**
         * Apply a rotation to the given object arround the Y axis of the 3D coordinate system,
         * with the camera position as origin
         * @param {Number} angle Rotation angle in radian
         * @param {THREE.Object} object Object to rotate
         */
        rotateY: function(angle, object)
        {
            var tx = _camera.position.x,
                    tz = _camera.position.z;

            /* transfoMatrix = new THREE.Matrix4().translate(new THREE.Vector3(tx, 0, tz));
             transfoMatrix.rotateY(angle);
             transfoMatrix.translate(new THREE.Vector3(-tx, 0, -tz));
             */
            // SINCE R58
            var transfoMatrix = new THREE.Matrix4().makeTranslation(tx, 0, tz);
            transfoMatrix = Utils.rotateY(transfoMatrix, angle);
            transfoMatrix = Utils.translate(transfoMatrix, new THREE.Vector3(-tx, 0, -tz));

            object.position = object.position.applyMatrix4(transfoMatrix);
        },

        translateCamera: function(x, y, z) {
            if (typeof x !== "undefined" && typeof y !== "undefined" && typeof z !== "undefined") {
                var translation = new THREE.Vector3(x, y, z);
                if (THREE.REVISION === '52')
                    _camera.position.addSelf(translation);
                else
                    _camera.position.add(translation); //threejs 56
            }
            else {
                throw TypeError("one or many coordinate is/are undefined");
            }
        },

        // Tweening using variation in render
        translateCameraSmoothly: function(x, y, z) {

            if (typeof x !== "undefined" && typeof y !== "undefined" && typeof z !== "undefined") {

                if(x==-10001){_translatCam.y = y;}else{
                    _translatCam.x = x;
                    _translatCam.y = y;
                    _translatCam.z = z;
                }
            }
            else {
                throw TypeError("one or many coordinate is/are undefined");
            }
        },


        orbitCamera: function(center,speed,alti){

            var speed = speed || 0.001;
           // if (_camera.position.y <80) _camera.position.y = 120;
            //var alti = alti || 120;

            _angleCameraLon += speed;
            var targetDist = 300;//this.getTargetDist();

            var x = -targetDist * Math.sin(_angleCameraLon) + center.x;
            var z = -targetDist * Math.cos(_angleCameraLon) + center.z;
            var y =  targetDist * Math.tan(_angleCameraLat) + center.y;

        //    _currentTargetPos = new THREE.Vector3(x2,y2,z2);
        //    _wantedTargetPos = new THREE.Vector3(x2,y2,z2);

            _translatCam.x = x;
            _translatCam.y = y + 120;
            _translatCam.z = z;

            _currentTargetPos = center.clone() || new THREE.Vector3(-100,0,0);
            _wantedTargetPos = center.clone() || new THREE.Vector3(-100,0,0);

            _camera.position.x += (_translatCam.x - _camera.position.x) * _speedTransCam;
            _camera.position.z += (_translatCam.z - _camera.position.z) * _speedTransCam;
            _camera.position.y += (_translatCam.y - _camera.position.y) * _speedTransCam;

            _currentTargetPos.x += (_wantedTargetPos.x - _currentTargetPos.x) * _speedTurnCam;
            _currentTargetPos.y += (_wantedTargetPos.y - _currentTargetPos.y) * _speedTurnCam;
            _currentTargetPos.z += (_wantedTargetPos.z - _currentTargetPos.z) * _speedTurnCam;


        },



        cameraFollowItinerary: function(arrPos){

        },



        lookAtScaleOk: function(vector){

            vector = vector || new THREE.Vector3(0,0,0);
            var m1 = new THREE.Matrix4();
            // m1.lookAt( _camera.position, vector, _camera.up );
            m1.lookAt( _camera.position, vector, new THREE.Vector3(0,1,0) );
            m1 = Utils.rotateY(m1,Math.PI);
            _camera.quaternion.setFromRotationMatrix( m1 );

        /*

             // lookAt: function() {

		var x = new THREE.Vector3();
		var y = new THREE.Vector3();
		var z = new THREE.Vector3();

                var eye = _camera.positioj

		//return function ( eye, target, up ) {

			var te = this.elements;

			z.subVectors( eye, target ).normalize();

			if ( z.length() === 0 ) {

				z.z = 1;

			}

			x.crossVectors( up, z ).normalize();

			if ( x.length() === 0 ) {

				z.x += 0.0001;
				x.crossVectors( up, z ).normalize();

			}

			y.crossVectors( z, x );


			te[0] = x.x; te[4] = y.x; te[8] = z.x;
			te[1] = x.y; te[5] = y.y; te[9] = z.y;
			te[2] = x.z; te[6] = y.z; te[10] = z.z;



			return this;

		};
  */
       },
       
        setCameraOrthoVerticale: function(pos){
            
            //_posCamOriginale = _camera.position;
            this.translateCameraSmoothly(pos.x,pos.y,pos.z);
            
        },
        setOrbitCameraOn: function(orbitCenter){

            _centerOrbit = orbitCenter || _camera.position.clone();
            // Save current cam pos and ori
             if(!_orbitCameraOn){
                _oldCamPos = _camera.position.clone();
                _oldTarget = _currentTargetPos.clone();
                if (_camera.position.y <80) {_camera.position.y = 120;}
            }else{
                _translatCam = _oldCamPos;
                _currentTargetPos = _oldTarget;
            }

            _orbitCameraOn = !_orbitCameraOn;
        },

        cameraZoom: function(zoomValue) {

            var newFov = _camera.fov + zoomValue;
            if(newFov > 10 && newFov < 160){
                _camera.fov = newFov;
                _camera.updateProjectionMatrix();
            }
        },
        /**
         * Display or hide a grid in the scene according the val param
         */
        toggleGrid: function(val) {
            if (val === true) {
                _scene.add(_grid);
            }
            else {
                _scene.remove(_grid);
            }
        },
        // Function that position a point closer to the cam
        // To avoid the colision with the intersected mesh while
        // drawing another mesh
        // 'v' is original pos vector3, s is the scale (ex 0.05)
        getPositionCloserToCam: function(v, scale) {

            return new THREE.Vector3(v.x - scale * (v.x - _camera.position.x),
                    v.y - scale * (v.y - _camera.position.y),
                    v.z - scale * (v.z - _camera.position.z));
        },

        /**
         * Function that make the cam look at a special 3D point knowing his future position.
         * x1,z1 target of intersection in SCENE COORD! , x2 z2 position of cam after translation in center of pano.
         */
        cameraLookAtPosition: function(x1, y1, z1, x2, y2, z2) {

            var alpha = Math.atan2(x1 - x2, z1 - z2);
            var base = Math.sqrt((x1 - x2) * (x1 - x2) + (z1 - z2) * (z1 - z2));
            var beta = -Math.atan2(y1 - y2, base);

            this.setCameraLonLatAngle(alpha, beta);

            var x = -_targetDist * Math.sin(alpha);
            var z = -_targetDist * Math.cos(alpha);
            var y =  _targetDist * Math.tan(beta);

            this.setWantedCamRotation(x,y,z);


            //_camera.updateProjectionMatrix();
        },


        // alpha in degrees
        cameraLookAtHeading: function(x1, y1, z1, alpha) {

            var alpha = (alpha - 90) / 180 * Math.PI;
            var x = _targetDist * Math.cos(alpha);
            var z = _targetDist * Math.sin(alpha);
            this.cameraLookAtPosition(x1, y1, z1, x, y1, z);

            //  this.setCameraLonLatAngle(alpha,-beta);

        },
        
         // alpha in degrees (yaw = heading)
         // alhpa for yaw, beta for pitch
        cameraLookAtYawPitch: function(x1, y1, z1, alpha, beta) {

            var alpha = (alpha - 90) / 180 * Math.PI;
            var beta = beta /180 * Math.PI;
            var x = _targetDist * Math.cos(alpha);
            var z = _targetDist * Math.sin(alpha);
            var y = _targetDist * Math.tan(beta);
            this.cameraLookAtPosition(x1, y1, z1, x, y, z);

            //  this.setCameraLonLatAngle(alpha,-beta);

        },
        
        cameraLookHorizontally: function(){
            
           /*  this.setCameraLonLatAngle(alpha, beta);

            var x = -_targetDist * Math.sin(alpha);
            var z = -_targetDist * Math.cos(alpha);
            var y =  _targetDist * Math.tan(beta);*/

          //  this.setWantedCamRotation(x,y,z);
          
            // _wantedTargetPos.x = x;

            _angleCameraLat = 0;
            _wantedTargetPos.y = 0;//_wantedTargetPos.y;
          //  _wantedTargetPos.z = z;
        },

        tiltCamera: function(value){

            _camera.rotation.z = value;
            _camera.updateProjectionMatrix();

        },


        getProjectedRay: function(x, y, distance) {
            var coord = Utils.toNDC(x, y);

            var projector = new THREE.Projector();
            var ray = new THREE.Vector3(coord.x, coord.y, 1);
            projector.unprojectVector(ray, _camera);

            if (typeof distance !== "undefined") {
                ray.normalize().multiplyScalar(distance);
            }
            return ray;
        },
        getScene: function() {
            return _scene;
        },
        getContext: function() {
            return _renderer.getContext("experimental-webgl", {preserveDrawingBuffer: true});
        },
        getRenderer: function() {
            return _renderer;
        },

        getCameraPosition: function() {
            return _camera.position.clone();
        },
        getCamera: function() {
            return _camera;
        },
        getSpeedTurnCam: function() {
            return _speedTurnCam;
        },
        getSpeedTransCam: function() {
            return _speedTransCam;
        },
        getTranslatCam: function() {
            return _translatCam;
        },
        getCameraFov: function() {
            return _camera.fov;
        },
        setCameraFov: function(fov) {
           _camera.fov = fov;
           _camera.updateProjectionMatrix();
        },
        getAngleCameraLat: function() {
            return _angleCameraLat;
        },
        getAngleCameraLon: function() {
            return _angleCameraLon;
        },
        setCameraLonLatAngle: function(longitude, lattitude) {
            _angleCameraLon = longitude;
            _angleCameraLat = lattitude;
        },
        setWantedCamRotation: function(x, y, z) {
            _wantedTargetPos.x = x;
            _wantedTargetPos.y = y;
            _wantedTargetPos.z = z;
        },
        // return yaw, pitch in rad
        getCameraYawPitch: function(){
          return {yaw: _angleCameraLon, pitch: _angleCameraLat};  
          //{yaw:(_angleCameraLon % 2*Math.PI)/(2*Math.PI) * 360, pitch:(_angleCameraLat % Math.PI)/Math.PI * 180};  
        },
        getTargetDist: function() {
            return _targetDist;
        },
        getWinWith: function() {
            return _winWidth;
        },
        getWinHeight: function() {
            return _winHeight;
        },
        setZero: function(z) {
            console.log('set Zero at',z);
            if(z instanceof THREE.Vector3){
                _zero = z;
            }else{
                _zero = new THREE.Vector3(z.x,z.y,z.z);
            }    
        },
        getZero: function() {
            return _zero;
        },
        getZeroAsVec3D: function() {
            return new THREE.Vector3(parseFloat(_zero.x), parseFloat(_zero.y), parseFloat(_zero.z));
        },
        getTrip: function() {
            return _trip;
        },
        getClearColor: function(color) {
            return _renderer.getClearColor();
        },
        setSpeedTurnCam: function(value) {
            _speedTurnCam = value;
        },
        setSpeedTransCam: function(value) {
            _speedTransCam = value
        },
        setCameraPosition: function() {
            var numArg = arguments.length;
            if (numArg === 1)
                _camera.position.set(arguments[0].x, arguments[0].y, arguments[0].z);
            else if (numArg === 3)
                _camera.position.set(arguments[0], arguments[1], arguments[2]);
            else
                console.warn('No parameters passe through function' + arguments.callee);
        },

        setClearColor: function(color) {
            _renderer.setClearColor(color);

        },
        // ****Aesthetics************************************

        setFarFog: function(distance) {
            _farFog = distance;
        },
        setIntensityEffect: function(v) {
            _effectFogIntensity = v;
            _effectFog.uniforms['effectIntensity'].value= _effectFogIntensity;
        },
        setTimeEffect: function(t) {
            _effectFog.uniforms['indice_time'].value = t;
        },
        setEffectsClimateOn: function(b){

           if(b){

                this.addFogEffect();
                this.addLensFlare();
            }
            else{
                // We delete map and effects
                this.removeFogEffect();
                this.removeLensFlare();
            }

            _effects.climate = b;
            _effectFog.enabled = b;
            // _postprocessing.enabled = this.checkAtIfAtLeastOneEffectIsOn();
            _scene.overrideMaterial = null;
            _renderer.clear();
            _camera.far = _far;

            _postprocessing.enabled = this.updateEffectRenderToScene();
        },



        setWaterOn: function(){

            // Add light
		var directionalLight = new THREE.DirectionalLight(0xffff55, 1);
		directionalLight.position.set(-600, 300, 600);
		_scene.add(directionalLight);

            // Load textures
		var waterNormals = new THREE.ImageUtils.loadTexture('images/waternormals.jpg');
		waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

		// Create the water effect
		_msWater = new THREE.Water(_renderer, _camera, _scene, {
			textureWidth: 256,
			textureHeight: 256,
			waterNormals: waterNormals,
			alpha: 	1.0,
			sunDirection: directionalLight.position.normalize(),
			sunColor: 0xffffff,
			waterColor: 0x001e0f,
			betaVersion: 0,
			side: THREE.DoubleSide
		});
		var aMeshMirror = new THREE.Mesh(
			new THREE.PlaneGeometry(2000, 2000, 100, 100),
			_msWater.material
		);
		aMeshMirror.add(this.ms_Water);
		aMeshMirror.rotation.x = - Math.PI * 0.5;

		_scene.add(aMeshMirror);
                aMeshMirror.position.y-=6.5;

        },

        updateWater: function(){

                _msWater.material.uniforms.time.value += 1.0 / 60.0;
		//this.ms_Controls.update();
		//this.display();
                //console.log("test",this.ms_Water.material.uniforms.time.value);
                _msWater.render();

		//this.ms_Renderer.render(this.ms_Scene, this.ms_Camera);
        },
        /*
        checkAtIfAtLeastOneEffectIsOn: function(){

            var b = false;
            for(var p in _effects) {
                b = b || _effects[p];
            }
            return b;
        },
        */

       // Fonction to update the effect to render to the scene (last pass enabled)
       // And also return value updated of postprocessing
        updateEffectRenderToScene: function(){

           var found = false;
           var i = _arrEffects.length -1;
           while(!found && i>=0){
               found = _arrEffects[i].enabled == true;
               if(found) _arrEffects[i].renderToScreen = true;
               i--;
           }
           // Then set all the rest to no screenRendering
           while(i>=0){
               _arrEffects[i].renderToScreen = false; i--;
           }
           return (found && _postprocessing.guiBool) || (_anaglyph !=null &&_postprocessing.guiBool) ;
        },

        // lens flares   SUN
        addLensFlare: function() {

            var textureFlare0 = THREE.ImageUtils.loadTexture("../../images/lensflare/lensflare0.png");//images/lensflare/lensflare0.png
            var textureFlare2 = THREE.ImageUtils.loadTexture("../../images/lensflare/lensflare2.png");
            var textureFlare3 = THREE.ImageUtils.loadTexture("../../images/lensflare/lensflare3.png");
                
            // Get real light Position    
            //var currentPosWGS84 = Carto.convertCoordVec3(Carto.getCurrentPosition(),"EPSG:2154", "CRS:84");  
            var v = Utils.getSunPositionInScene(new Date().getTime());
            addLight(0.995, 0.5, 0.9,v.x, v.y, v.z);
            //addLight(0.995, 0.5, 0.9, 200, 200, 0);//-500, 150, 500 );

            function addLight(h, s, l, x, y, z) {
                console.log('sun added at position: ',x,y,z);
                _sunLight = new THREE.PointLight(0xffffff, 1.5, 4500);
                _sunLight.color.setHSL(h, s, l);
                _sunLight.position.set(x, y, z);
                //  _scene.add( _sunLight );

                var flareColor = new THREE.Color(0xffffff);
                flareColor.setHSL(h, s, l + 0.5);

                _lensFlare = new THREE.LensFlare(textureFlare0, 700, 0.0, THREE.AdditiveBlending, flareColor);

                _lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
                _lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
                _lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);

                _lensFlare.add(textureFlare3, 60, 0.6, THREE.AdditiveBlending);
                _lensFlare.add(textureFlare3, 70, 0.7, THREE.AdditiveBlending);
                _lensFlare.add(textureFlare3, 120, 0.9, THREE.AdditiveBlending);
                _lensFlare.add(textureFlare3, 700, 6.0, THREE.AdditiveBlending);

                //lensFlare.customUpdateCallback = lensFlareUpdateCallback;
                _lensFlare.position = _sunLight.position;

                _scene.add(_lensFlare);

            }
        },

        addClouds: function(){

            var clouds = new THREE.CloudShader();
            var mesh = clouds.showClouds();
            _scene.add(mesh);
        },

        removeLensFlare: function() {
            _scene.remove(_lensFlare);
        },
        setLensFlareIntensity: function(intensity) {

            if (_lensFlare) {
                _lensFlare.opacity = 0.6 + (1. - intensity / 100.) / 0.4;
                for (var a = 0; a < _lensFlare.lensFlares.length; ++a) {
                    _lensFlare.lensFlares[a].opacity = _lensFlare.opacity;
                }
            }
        },
        initialized: function() {
            return _initialized;
        },

       

        isMobileEnvironment:function(){
            return _mobileVersion;
        },

        setMobileEnvironment:function(v){
             _mobileVersion = v;
        },
        
        getContainerID: function(){
            return _containerId;
        }
    };

    return GraphicEngine;

});


