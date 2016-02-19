/**
 * Creates a new Laser object
 * @author alexandre devaux IGN
 * @class Manages laser data
 * @require THREE.JS
 */
define(['jquery', 'GraphicEngine', 'three', 'Shader', 'Panoramic', 'Dispatcher', 'Cartography','Draw',  'CVML','Utils', 'LasReader'],
    function($, gfxEngine, THREE, Shader, Panoramic, Dispatcher, Cartography, Draw, CVML, Utils, LasReader) {

    var _particleSystem = null,
        _particleSystemPicking = null,
        _geometryParticleSystem = new THREE.Geometry(),
        _geometryParticleSystemPicking = new THREE.Geometry(), // sused for the texture rendering for picking
        //_colors = [],
        _colorsPicking = [],
        _url = null,
        _sceneRTT, // Maybe displace to GE
        _rtTexture = null, //new THREE.WebGLRenderTarget( 1000,800),//gfxEngine.getWinWith(), gfxEngine.getWinHeight(),{ minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat }), // Maybe displace to GE
        _zeroEasting, _zeroNorthing, _zeroAltitude, // initialInfo.easting ...
        _shaderLoader = null,
        _indiceTimeLaser = 1., // shader uniform variable to animate point positions 
        _reverseMotion = false,
        _speedMovment = 0.07, // 0.07,
        _snowOn = false,
        _nbPointsBuffer = 1*1048576,// 1024*1024 //500000,
        _bufferGeometry = null,
        _geometryLidar = null,
        _currentNbPointsInBuffer = 0,
        _indiceStartTriangulate = 0,
        _localMode = false,   // at true when dropping large original PLY, to prevent loading other bin from server when moving
        _dataView = null,     // used for local PLY, to keep original file
        _filename = "",       // Filename of local PLY
        _nbLabel =0,          // Nb objects, means when parsing Input ply, max of all label id
        _filterFacadeAndGround = false, // Bool if the box has to filter ground and facade id
        _idSurface = 200000000,
        _currentClassEditing = 0,    // ClassIdCurrentlyEditing        
        _sizeHeader = 0,
        _shaderAttributes,
        _shaderUniforms,
        _movementLocked = 1,  // 1 means activate no translation for faster rendering
        _shaderMatLaserCloud,
        _pickingGeometry,
        _nbTime = 1.,
        _indice_time_laser_tab = [],//new Float32Array(40);
        _nbIndiceMax = 160,
        _currentLaserPivot = {},
        _nbClassLidar = 0,
        _zero = null, // Translation substracting the init position to all coords
        _notLoaded= true,
        _newBufferPosition= null,
        _globalOffset = 0,  //TEMP
        _globalOffsetByte = 0,
        _gl = null;
        // EVENT MANAGEMENT
        //*************************************
           
        
    _events = {
        MOVE: function() {
            _notLoaded = true;
            if(_particleSystem.visible && !_localMode)
                LaserCloud.launchLaserAroundCurrentTime(10, 11);
                
                //LaserCloud.showUserMeasures();
        },
        CHANGEPIVOT: function() {
            if(LaserCloud.initiated)
                 LaserCloud.emptyBuffer();
        }
    };



    // SHIM
    // @see http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    window.requestAnimFrame2 = (function() {
        return  window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback, element) {
                    window.setTimeout(callback, 1000 / 60);
                };
    })();


    var LaserCloud = {
        
        initiated: false,
        laserCloudMaster: new THREE.Object3D(), //null;
        nbPointsLoaded: 0,
        indiceLaserFileLoaded: 0,
        indicePacketInBuffer:0,  // Indicate the number of packet in buffer
        tabLaserFilesToLoad: [],
        nbSecondsToLoad: 0,
        nbPointsInBB: 0,
        lengthAPoint: 0,
        // Added properties for Bounding Box
        ptA2: null, ptB2: null, ptC2: null, ptD2: null, point2: null,
        lengthAB: 0, lengthAC: 0, lengthAPoint:0,
                //nbClassLidar: 1000.,  // When selected cause we create class from packet loaded number 
        nbPointsInBB: 0,
        animateOn:false,
        //add atribute to buttons
        btnSwitchPoint : false,
        btnSwitchLine  : false,
        btnSwitchVolume : false,
        computeNormalOn : false,
        annotationOn : false,
            
            
        init: function(zero,options) {

            _currentLaserPivot = options.offset;
            _zero = zero;
            _url = options.url;
            _rtTexture = new THREE.WebGLRenderTarget(gfxEngine.getWinWith(), gfxEngine.getWinHeight());
            this.initiated = true;
            this.initializeBufferGeometry();
            
            //Measure.init();
            
            Dispatcher.register("MOVE", LaserCloud);
            Dispatcher.register("CHANGEPIVOT",LaserCloud);
            _gl = gfxEngine.getRenderer().getContext();
            
            // when resizing the window for picking!
            $(window).resize(function() {
                _rtTexture.width = window.innerWidth;
                _rtTexture.height = window.innerHeight;
            });
            
        },
        //***********************************************************************
        // New way of loading laser, alpha.
        // One pre-allocated fixed size buffer 

        initializeBufferGeometry: function() {

            for(var i=0;i<_nbIndiceMax ;++i){
              _indice_time_laser_tab[i] = 0.;
            }
             
            this.createShader();
           
            _currentNbPointsInBuffer = 0;
            _bufferGeometry = new THREE.BufferGeometry();
            //_bufferGeometry.dynamic = true;

            _bufferGeometry.addAttribute( 'position',     new THREE.BufferAttribute( new Float32Array( _nbPointsBuffer * 3 ), 3 ));//.setDynamic(true) );
	        _bufferGeometry.addAttribute( 'color',        new THREE.BufferAttribute( new Float32Array( _nbPointsBuffer * 3 ), 3 ));//.setDynamic(true) );
            _bufferGeometry.addAttribute( 'displacement', new THREE.BufferAttribute( new Float32Array( _nbPointsBuffer * 3 ), 3 ));//.setDynamic(true) );
            _bufferGeometry.addAttribute( 'uniqueid',     new THREE.BufferAttribute( new Float32Array( _nbPointsBuffer ), 1 ));//.setDynamic(true) );

/*
            _bufferGeometry.attributes = {
                position: {
                    itemSize: 3,
                    array: new Float32Array(_nbPointsBuffer * 3), // ! not float64 to gpu
                    numItems: _nbPointsBuffer * 3,
                    dynamic: true
                },
                color: {
                    itemSize: 3,
                    array: new Float32Array(_nbPointsBuffer * 3),
                    numItems: _nbPointsBuffer * 3,
                    dynamic: true
                },
                displacement: {
                    itemSize: 3,
                    array: new Float32Array(_nbPointsBuffer * 3),
                    numItems: _nbPointsBuffer * 3,
                    dynamic: true
                },
                uniqueid: {
                    itemSize: 1,
                    array: new Float32Array(_nbPointsBuffer),
                    dynamic: true
                }

            };
       */
            
            
            //*****Picking **********************
            _geometryParticleSystemPicking = new THREE.Geometry();
            _geometryParticleSystemPicking.vertices = new Array(_nbPointsBuffer);
            _geometryParticleSystemPicking.dynamic = true;


            this.initializeBufferValues();

            _particleSystem = new THREE.Points(
                    _bufferGeometry,
                    _shaderMatLaserCloud
                    );

            //*****Picking **********************
            _geometryParticleSystemPicking.colors = _colorsPicking;
            var pMaterial = new THREE.PointsMaterial({size: 0.10, vertexColors: true, depthTest: false});  // map:sprite
            // create the particle system used to get the id (3D pos). Rendered to texture, not to screen.
            _particleSystemPicking = new THREE.Points(_geometryParticleSystemPicking, pMaterial);
            // Modified RTT. Texture rendering ac le Color ID for Picking 3D
            _sceneRTT = new THREE.Scene();
            _sceneRTT.add(_particleSystemPicking);
            
            //gfxEngine.addToScene(_particleSystemPicking); 
            this.laserCloudMaster.add(_particleSystem);
            this.visible = true;
            // this.laserCloudMaster.renderOrder = 1000;
        },
        
        createShader: function() {

/*
            _shaderAttributes = {
                displacement: {type: 'v3', value: []},
                color: {type: 'v3', value: []},
                uniqueid: {type: 'f', value: []}
            };
*/
            _shaderUniforms = {
                indice_time_laser: {type: 'f', value: _indiceTimeLaser},
                currentidwork: {type: 'f', value: 1000.},
                point_size: {type: 'f', value: 1.},
                alpha: {type: 'f', value: 0.6}, //0.6
                indice_time_laser_tab:{type: 'fv1', value: _indice_time_laser_tab},
                movementLocked: {type:'i', value:_movementLocked},
                texturePoint: {type: 't',
                   value: null//THREE.ImageUtils.loadTexture("images/textures/smoke_particle.png")  
                }
            };

            // create the shader material for the laser particle system
            // !!!!!  VERY IMPORTANT  Depthest : false to have a nice opacity in every direction
            // For BufferGeometry now we need to set everything here. Like transparent 
            _shaderMatLaserCloud = new THREE.ShaderMaterial({
                uniforms: _shaderUniforms,
            //    attributes: _bufferGeometry.attributes,// _shaderAttributes,
                vertexShader: Shader.shaderLaserVS.join("\n"),//Shader.shaders['shaderLaser.vs'],
                fragmentShader: Shader.shaderLaserFS.join("\n"),//Shader.shaders['shaderLaser.fs'],
                vertexColors: THREE.VertexColors,
                depthTest: false,
                transparent: true
            });
            
       

        },
        
        initializeBufferValues: function() {

            var values_color = _bufferGeometry.attributes.color.array;
            var positions = _bufferGeometry.attributes.position.array;
            var displacements = _bufferGeometry.attributes.displacement.array;
            var uniqueids = _bufferGeometry.attributes.uniqueid.array;
         //   var classes = _bufferGeometry.attributes.classe.array;


            var color2 = new THREE.Color();
            color2.setHSL(0.2, 0.5, 0.7);
            // we set default properties: position, color, displacement
            var radius = 10;

            for (n = 0; n < _nbPointsBuffer; ++n) {

                positions[ n * 3 + 0 ] = 15000;  // Camera far: 10000
                positions[ n * 3 + 1 ] = 15000;  // so out of frustum
                positions[ n * 3 + 2 ] = 15000;

                displacements[ n * 3 + 0 ] = (Math.random() * 2 - 1) * radius;
                if(_snowOn) displacements[ n * 3 + 1 ] = Math.random()* radius * 10;
                    else
                    displacements[ n * 3 + 1 ] = (Math.random() * 2 - 1) * radius;
                displacements[ n * 3 + 2 ] = (Math.random() * 2 - 1) * radius;

                values_color[ n * 3 + 0 ] = color2.r;
                values_color[ n * 3 + 1 ] = color2.g;
                values_color[ n * 3 + 2 ] = color2.b;

                uniqueids[ n + 0 ] = this.indiceLaserFileLoaded;
             //   classes[ n + 0 ] = 0;
                //Picking*****
                _colorsPicking[n] = 0;
                _geometryParticleSystemPicking.vertices[n] = new THREE.Vector3(0, 0, 0);
            }
        },
      
      
       // Loader for binary file with no Header. All attributes have to be the same data type
       // pivot is the value we substract to all coordinates
       // Work for xyz, xyzi, xyzikzfzefzfz... 
       // in itowns file sys, each point has a x,y,z,i,c (3dposition,intensity and a class)
       // ex xyzi double -> nbAttributes:4, nbBitsPerAttribute:64
      addPointsToBufferGeneric: function(buffer,nbAttributes,nbBitsPerAttribute,pivot){
          
         var byteArray; 
         switch(nbBitsPerAttribute){
             
             case 64: byteArray = new Float64Array(buffer); break;
             case 32: byteArray = new Float32Array(buffer); break;
             case 16: byteArray = new Int16Array(buffer);   break;
         }
         
	 var positions =    _bufferGeometry.attributes.position.array;
         var values_color = _bufferGeometry.attributes.color.array;
         var uniqueids =    _bufferGeometry.attributes.uniqueid.array;
         
         var color2 = new THREE.Color();
         var pX,pY,pZ,pI,ind;         

         if( (_currentNbPointsInBuffer + byteArray.length * 8/nbBitsPerAttribute) > _nbPointsBuffer ){// + byteArray.length/(4*nbBitsPerAttributes) ))
            _currentNbPointsInBuffer   = 0;   // We add new points remplacing the oldest in buffer
            this.indicePacketInBuffer  = 0;
        }
        
         // NEW TECH, we create a new small buffer that we will use to update the global geometry buffer
         var nbPoints = byteArray.length / nbAttributes;
         for(var p = 0; p < byteArray.length- nbAttributes ; p=p+nbAttributes){ // P+4 cause x,y,z,i in bin

                    pX = byteArray[p]   - pivot.x,
                    pY = byteArray[p+1] - pivot.y ,// Decalage laser/cam
                    pZ = byteArray[p+2] - pivot.z;  
                    // pI = (byteArray[p+3] +25) / 35; Nice lut
                    if(nbAttributes==4) pI = (byteArray[p+3] +25) / 25; else if(nbAttributes==6) pI = byteArray[p+4]/20; else pI= 0.6 + pY/80;
              //if(p<5) console.log(pivot.x);
                    ind = _currentNbPointsInBuffer * 3;
    
                    positions[ ind + 0 ] = pX;
                    positions[ ind + 1 ] = pY;
                    positions[ ind + 2 ] = pZ;
          
                    color2.setHSL(pI,0.5,0.8);
                    values_color[ ind + 0] = color2.r;
                    values_color[ ind + 1] = color2.g;
                    values_color[ ind + 2] = color2.b;

                    uniqueids[ _currentNbPointsInBuffer ] = this.indicePacketInBuffer;

                    // Then for the picking ***********************
                    var colorHexFromInt = _currentNbPointsInBuffer.toString(16);
                    var nbZerosMissing = 6 - colorHexFromInt.length;
                    for (var i=0; i< nbZerosMissing; ++i){ colorHexFromInt = '0' + colorHexFromInt;}
                    var colorHex = '#'+colorHexFromInt;
                    _colorsPicking[_currentNbPointsInBuffer] = new THREE.Color(colorHex);
                    _geometryParticleSystemPicking.vertices[_currentNbPointsInBuffer] = new THREE.Vector3(pX, pY, pZ);
                  
                    _currentNbPointsInBuffer++;

         }
        //         .._newBufferPosition = new Float32Array(nbPoints * 3);
         // console.log("a",a);
          _shaderUniforms.currentidwork.value = this.indiceLaserFileLoaded;
          _indice_time_laser_tab[this.indicePacketInBuffer] = 0.15;

    //      if (this.indiceLaserFileLoaded %8 ==0 || this.indiceLaserFileLoaded >= this.tabLaserFilesToLoad.length -1) this.updateLaserAttributes(); 
 //       this.updateLaserAttributes(); 
          this.setLockMovement(0);
       
          this.updateLaserAttributes();//(nbPoints);//offset); 

          _indiceTimeLaser = 0.5;                    
          if(!this.animateOn){this.animateOn = true; this.animatePoints2(); /*console.log('thisanimate');*/}  // First file
                                                                                    // start animation function
          this.indiceLaserFileLoaded++;// console.log(_currentNbPointsInBuffer);
          this.indicePacketInBuffer++;
          
          if(this.indiceLaserFileLoaded == 2)
              _bufferGeometry.computeBoundingSphere();   // Once every new series load. Very important 
           
          // Load the next file in the list if not last (seems faster than parallel load)
          if(this.indiceLaserFileLoaded < this.tabLaserFilesToLoad.length )
             this.readLaserPointsFileFromItownsGeneric(this.tabLaserFilesToLoad[this.indiceLaserFileLoaded],nbBitsPerAttribute,pivot);
             else{ 
                setTimeout(function() {
                  LaserCloud.setLockMovement(1);}
                , 800);
              }
           
      },


       // Loader for binary file with no Header. All attributes have to be the same data type
       // pivot is the value we substract to all coordinates
       // Work for xyz, xyzi, xyzikzfzefzfz... 
       // in itowns file sys, each point has a x,y,z,i,c (3dposition,intensity and a class)
       // ex xyzi double -> nbAttributes:4, nbBitsPerAttribute:64
      addPointsToBufferGenericMesh: function(buffer,nbAttributes,nbBitsPerAttribute,pivot){
          
         var byteArray; 
         switch(nbBitsPerAttribute){
             
             case 64: byteArray = new Float64Array(buffer); break;
             case 32: byteArray = new Float32Array(buffer); break;
             case 16: byteArray = new Int16Array(buffer);   break;
         }
         
	 var positions =    _bufferGeometry.attributes.position.array;
         var values_color = _bufferGeometry.attributes.color.array;
         var uniqueids =    _bufferGeometry.attributes.uniqueid.array;
         
         var color2 = new THREE.Color();
         var pX,pY,pZ,pI,ind;         

                 if(_indiceStartTriangulate == 0) _indiceStartTriangulate = _currentNbPointsInBuffer;
         if( (_currentNbPointsInBuffer + byteArray.length * 8/nbBitsPerAttribute) > _nbPointsBuffer ){// + byteArray.length/(4*nbBitsPerAttributes) ))
            _currentNbPointsInBuffer   = 0;   // We add new points remplacing the oldest in buffer
            this.indicePacketInBuffer  = 0;
        }
        
         // NEW TECH, we create a new small buffer that we will use to update the global geometry buffer
         var nbPoints = byteArray.length / nbAttributes;
         for(var p = 0; p < byteArray.length- nbAttributes ; p=p+nbAttributes){ // P+4 cause x,y,z,i in bin

                    pX = byteArray[p]   - pivot.x,
                    pY = byteArray[p+1] - pivot.y ,// Decalage laser/cam
                    pZ = byteArray[p+2] - pivot.z;  
                    if(nbAttributes>3) pI = (byteArray[p+3] +25) / 35; else pI= 0.6 + pY/80;

                    ind = _currentNbPointsInBuffer * 3;
    
                    positions[ ind + 0 ] = pX;
                    positions[ ind + 1 ] = pY;
                    positions[ ind + 2 ] = pZ;
          
                    color2.setHSL(pI,0.5,0.8);
                    values_color[ ind + 0] = color2.r;
                    values_color[ ind + 1] = color2.g;
                    values_color[ ind + 2] = color2.b;

                    uniqueids[ _currentNbPointsInBuffer ] = this.indicePacketInBuffer;

                    // Then for the picking ***********************
                    var colorHexFromInt = _currentNbPointsInBuffer.toString(16);
                    var nbZerosMissing = 6 - colorHexFromInt.length;
                    for (var i=0; i< nbZerosMissing; ++i){ colorHexFromInt = '0' + colorHexFromInt;}
                    var colorHex = '#'+colorHexFromInt;
                    _colorsPicking[_currentNbPointsInBuffer] = new THREE.Color(colorHex);
                    _geometryParticleSystemPicking.vertices[_currentNbPointsInBuffer] = new THREE.Vector3(pX, pY, pZ);
                  
                    _currentNbPointsInBuffer++;

         }
        //         .._newBufferPosition = new Float32Array(nbPoints * 3);
         // console.log("a",a);
          _shaderUniforms.currentidwork.value = this.indiceLaserFileLoaded;
          _indice_time_laser_tab[this.indicePacketInBuffer] = 0.15;

          this.updateLaserAttributesSmartly(nbPoints);//offset); 

          _indiceTimeLaser = 0.5;                    
          if(!this.animateOn){this.animateOn = true; this.animatePoints2(); /*console.log('thisanimate');*/}  // First file
                                                                                    // start animation function
          this.indiceLaserFileLoaded++;// console.log(_currentNbPointsInBuffer);
          this.indicePacketInBuffer++;
          // Load the next file in the list if not last (seems faster than parallel load)
          if(this.indiceLaserFileLoaded < this.tabLaserFilesToLoad.length )
             this.readLaserPointsFileFromItownsGenericMesh(this.tabLaserFilesToLoad[this.indiceLaserFileLoaded],nbBitsPerAttribute,pivot);
           
      },
      
      
      triangulateLaserCloudSAVE: function(nbPoints){
          
          console.log('triangulateLaserCloud ',_indiceStartTriangulate,_currentNbPointsInBuffer);
          var nbPointsPerTurn = 360;
          var offsetSub = _indiceStartTriangulate* 3;
          var offsetSubEnd = offsetSub + (nbPoints) * 3;
          var view = _bufferGeometry.attributes.position.array.subarray(offsetSub, offsetSubEnd);
          
          var _geometryLidar = new THREE.Geometry();
          
          // Vertices
          for(var i =0; i< nbPoints*3; i+=3){
             
            var v = new THREE.Vector3(view[i],view[i+1],view[i+2]);
            if(i==0)Draw.drawSphereAt(v,0.1);
            //console.log(v);
            _geometryLidar.vertices.push(v);
          }
          
          // Faces
          for(var a=0;a<_geometryLidar.vertices.length - nbPointsPerTurn - 1;++a){
             
             if(a%360 != 0){ 
                _geometryLidar.faces.push( new THREE.Face3( a, a+1, a+nbPointsPerTurn) );
                _geometryLidar.faces.push( new THREE.Face3( a+1, a+1+nbPointsPerTurn, a+nbPointsPerTurn) );
            }
          }
          
          _geometryLidar.computeFaceNormals();
        
          var mat = new THREE.MeshBasicMaterial({color:0xDCE9FA, wireframe:true, wireframeLinewidth: 1, transparent: true, opacity: 0.3});
          mat.side = THREE.DoubleSide;
          var meshLidar = new THREE.Mesh(_geometryLidar, mat);
          gfxEngine.addToScene(meshLidar);  
          
         //this.textureMeshLidar(_geometryLidar);
        
      },
      
       
      triangulateLaserCloud: function(nbPoints){
          
          var maxDist = 0.8; // max distance in meters between consecutive vertices
          console.log('triangulateLaserCloud ',_indiceStartTriangulate,_currentNbPointsInBuffer);
          var nbPointsPerTurn = 360;
          var offsetSub = _indiceStartTriangulate* 3;
          var offsetSubEnd = offsetSub + (nbPoints) * 3;
          var view = _bufferGeometry.attributes.position.array.subarray(offsetSub, offsetSubEnd);
          
          var _geometryLidar = new THREE.Geometry();
          var lastVertex = new THREE.Vector3(view[0],view[1],view[2]);  // first vertex
          
          
          var copyOut = new Array(nbPoints);// view.slice(0);

          for(var i =0; i< nbPoints; ++i){
              copyOut[i] = new THREE.Vector3(view[i*3],view[i*3+1],view[i*3+2]);
          }
          
          var copyOutPP = copyOut.slice(0);
 
          for(var i= nbPointsPerTurn +1; i< copyOut.length -(nbPointsPerTurn +1);++i){
              
              //this.analyzeNeighbourood(copyOut,copyOutPP,i,nbPointsPerTurn,maxDist);
              if (copyOutPP[i].y >-2 && copyOutPP[i].y <11)
                   copyOutPP[i] = this.filterLidarMeshUsingRoofLine(copyOut,i,nbPointsPerTurn,maxDist);
                  // copyOutPP[i] = this.filterLidarMeshComputingFacadePlan(copyOut,i,nbPointsPerTurn,maxDist);
          }
           // Vertices
          for(var i =0; i< nbPoints; i++){
              
              _geometryLidar.vertices.push(copyOutPP[i]);
          }
   
           // Faces
           // ADDED AS OPTION FILTER TOO LARGE TRIANGLES
           var maxDistanceInTriangle = 4.5; // 3 meters max
          for(var a=0;a<_geometryLidar.vertices.length - nbPointsPerTurn - 1;++a){
             
             if(a%360 != 0){ 
                 
                 var v1 = _geometryLidar.vertices[a];
                 var v2 = _geometryLidar.vertices[a+1];
                 var v3 = _geometryLidar.vertices[a+nbPointsPerTurn];
                 var v4 = _geometryLidar.vertices[a+1+nbPointsPerTurn];
                 
                  if(v1.distanceTo(v2)< maxDistanceInTriangle && v1.distanceTo(v3)< maxDistanceInTriangle)
                     _geometryLidar.faces.push( new THREE.Face3( a, a+1, a+nbPointsPerTurn) );
                         
                  if(v2.distanceTo(v3)< maxDistanceInTriangle && v2.distanceTo(v4)< maxDistanceInTriangle)        
                    _geometryLidar.faces.push( new THREE.Face3( a+1, a+1+nbPointsPerTurn, a+nbPointsPerTurn) );
                
            }
          }
          
          _geometryLidar.computeFaceNormals();
        
          var mat = new THREE.MeshBasicMaterial({color:0xDCE9FA, wireframe:true, wireframeLinewidth: 1, transparent: true, opacity: 0.3});
          mat.side = THREE.DoubleSide;
          var meshLidar = new THREE.Mesh(_geometryLidar, mat);
     //     gfxEngine.addToScene(meshLidar);  
          
          this.textureMeshLidar(_geometryLidar);
        
      },
           
           
      // THE CURRENT WORKING ONE             
      // We estimate the vertical accumulation to get most probable xz    
      // (next We ll estimate vertical vector at altitude higher than truck)  
      filterLidarMeshUsingRoofLine:function(arr,pos,nbPointsPerTurn,maxDist){
          
          var nbPointsToEstimate = 3; // 2 meters
          var indice = pos;  // indice to start estimating xz going up
          var sens = true;//arr[pos].y - arr[pos+1].y <0 ; // if positive then we go down (left side of road)
          var currentAlti = arr[indice].y;
          var alti = arr[indice].y;
          var highestAlti = -20;
          var indicehighestAlti = -1;
          var indiceOtherSide = -1;

          
       // We look in a total turn for the indice of the highest point
        for(var i=0; i<nbPointsPerTurn; ++i){
            
            if(arr[pos+i].y >= highestAlti){
                 highestAlti = arr[pos+i].y;
                 indicehighestAlti = pos+i;
            }  
        }
        
        // Then we look for the other highest point from the opposite side
          var hightestaltiV2 = new THREE.Vector2(arr[indicehighestAlti].x,arr[indicehighestAlti].z);
          var otherSideFound = false;
          var a=0;
          var gapSize = 5; // 5 meters between points for minimum gap acceptable
         
          while(!otherSideFound){
              
              var pointNearer = new THREE.Vector2(arr[indicehighestAlti + a].x,arr[indicehighestAlti + a].z);
              var pointFarer  = new THREE.Vector2(arr[indicehighestAlti - a].x,arr[indicehighestAlti - a].z);
              var d = hightestaltiV2.distanceTo(pointNearer);
              var d2 = hightestaltiV2.distanceTo(pointFarer);
              
              if(d>gapSize || d2 >gapSize){
                otherSideFound = true;
                if(d>d2){
                     indiceOtherSide = indicehighestAlti + a;
                }else{
                     indiceOtherSide = indicehighestAlti - a;
                }
             }
             a++;
          }
 
        //  then we need to find which side is associated to the current point
          var tempPosA = new THREE.Vector3(arr[pos].x,arr[indicehighestAlti].y, arr[pos].z);
          var tempPosB = new THREE.Vector3(arr[pos].x,arr[indiceOtherSide].y,   arr[pos].z);
          var currentPointToA = tempPosA.distanceTo(arr[indicehighestAlti]);
          var currentPointToB = tempPosB.distanceTo(arr[indiceOtherSide]);
          
          var dd = Math.max(currentPointToA, currentPointToB);
          
          var currentPosIndiceHigh, otherSideIndiceHigh;
          if(dd == currentPointToA){
              currentPosIndiceHigh = indiceOtherSide;
              otherSideIndiceHigh = indicehighestAlti;
              
          }else{
              currentPosIndiceHigh = indicehighestAlti;
              otherSideIndiceHigh = indiceOtherSide;
          }
          
        // Here are the highest point in the same side same row of the current point and other side point
          var pointSameSideHighest  = arr[currentPosIndiceHigh];
          var pointOtherSideHighest = arr[otherSideIndiceHigh];
          
         var color = Math.random()*0xffffff;
 /*        if(arr[pos].y>10){
            Draw.drawSphereAt(pointOtherSideHighest, 0.1,color);
            Draw.drawSphereAt(pointSameSideHighest, 0.1,color);
         }
     */     
          
        // We search to get 0.3 meters behind roof limit
        // Do a vector 
          var s = new THREE.Vector2(pointSameSideHighest.x,pointSameSideHighest.z);
          var o = new THREE.Vector2(pointOtherSideHighest.x,pointOtherSideHighest.z);
    /*      var so = new THREE.Vector2.subVectors(o,s);
          so.normalize();
     */     
          // We compute the position of the roof line supposing its a bit back from highest laser
          var alpha = Math.atan2(o.y - s.y, o.x - s.x);
          var decalage =  -0.5; // 80cm from roof line
          var vx = decalage * Math.cos(alpha);
          var vz = decalage * Math.sin(alpha);
          var pointWithDecalage = new THREE.Vector3(pointSameSideHighest.x + vx,
                                                    pointSameSideHighest.y,
                                                    pointSameSideHighest.z + vz);
        
          // We compute the plausible position of stuff behind roof line like window etc
          var decalageBackRoof =  -1; // 80cm from roof line
          vx = decalageBackRoof * Math.cos(alpha);
          vz = decalageBackRoof * Math.sin(alpha);
          var positionBackRoof = new THREE.Vector3(pointSameSideHighest.x + vx,
                                                   pointSameSideHighest.y,
                                                   pointSameSideHighest.z + vz);

          
       // We then look if the point is far from roof print
          var currentPointAltiHigh = new THREE.Vector3(arr[pos].x, pointSameSideHighest .y, arr[pos].z);
          var dist = currentPointAltiHigh.distanceTo(pointWithDecalage);//pointSameSideHighest );
          var pointCorrected = arr[pos];
         
          if(dist > maxDist){
              
             // We need to look for a better alti for the point, using horizontal neighbours, min is usually good alti
             var somAlti = 0;
             var altiMin = 1000;
             
             for(var j =0; j<10; ++j){
                 var indice = pos+nbPointsPerTurn * j;
                 if(indice< arr.length){
                    somAlti+=arr[indice].y;
                    if(arr[indice].y<altiMin)
                        altiMin = arr[indice].y
                }
                    
             }
             altiMin = altiMin == 1000 ? arr[pos].y : altiMin;
             
             pointCorrected = new THREE.Vector3(positionBackRoof.x,altiMin,positionBackRoof.z);
         }
         
         return pointCorrected
 
      },
          
          
      // We estimate the vertical accumulation to get most probable xz    
      // (next We ll estimate vertical vector at altitude higher than truck)  
      filterLidarMeshComputingFacadePlan:function(arr,pos,nbPointsPerTurn,maxDist){
          
          var nbPointsToEstimate = 12; // 2 meters
          var indice = pos;  // indice to start estimating xz going up
          var sens = arr[pos].y - arr[pos+1].y <0 ; // if positive then we go down (left side of road)
        //  var alti = arr[indice].y;
          var sensToGo = arr[indice].y > 2;  
          
          
          // First find indice of position to start computing median
          // We need the altitude to be higher than truck
          while (!sensToGo && indice < arr.length){
              if(sens) 
                  indice -=2;
              else
                  indice +=2;
              sensToGo = arr[indice].y > 2 ;  
          }

          var arrVerticalValuesX = [];
          var arrVerticalValuesZ = [];
          for(var i=0;i<nbPointsToEstimate; ++i){
              
              arrVerticalValuesX.push(arr[indice +i].x);
              arrVerticalValuesZ.push(arr[indice +i].z);
              
          }
          
          arrVerticalValuesX.sort(function(a,b){return a - b});
          arrVerticalValuesZ.sort(function(a,b){return a - b});
          
          var indiceMedian = Math.floor((arrVerticalValuesX.length + 1) /2);
          
          var pointMedian = new THREE.Vector3(arrVerticalValuesX[indiceMedian],arr[pos].y,arrVerticalValuesZ[indiceMedian]);
          
         // console.log(arrVerticalValuesX,arrVerticalValuesZ,'pointMedian ',pointMedian,'indiceMedian',indiceMedian);
          var pointCorrected = arr[pos];
          
          // If dist too big we need to compute new point to replace artefact
          // x,z are already computed from median we just need to compute altitude from horizontal neighboors
          if( pointMedian.distanceTo(arr[pos]) > maxDist){
              
              var arrAltiNeighboors = [];
              for (var a=0;a<nbPointsToEstimate; ++a){
                  
                  var indice = pos + a*(nbPointsPerTurn);
                  if (indice<arr.length) arrAltiNeighboors.push(arr[indice].y);
              }
              
              arrAltiNeighboors.sort(function(a,b){return a - b});
              var indiceMedianH = Math.floor((arrAltiNeighboors.length + 1) /2);
              // Adjust point returned with new alti
              pointCorrected = new THREE.Vector3(pointMedian.x,arrAltiNeighboors[indiceMedianH],pointMedian.z);
              
          }
              
              
          return pointCorrected;    
          
      },
              
        
      filterLidarMeshUsingRGE:function(){
          
      },
                    
      // 4 connex        
      analyzeNeighbourood: function(arr,arrOut,pos,nbPointsPerTurn,maxDist){
          
      //    console.log(arr,pos);
            var v = arr[pos];
            var vUp = arr[pos+1]; 
            var vDown = arr[pos-1];  
            var vRight = arr[pos + nbPointsPerTurn]; 
            var vLeft = arr[pos - nbPointsPerTurn];  
            var max =0; var side="";
            
            if(v.y<12){
                var a = v.distanceTo(vDown);
                var b = v.distanceTo(vLeft);
                if(a>b) {max = a; side = "vDown"} else {max = b; side = "vLeft"};
                if(max>maxDist){
                    if(side=="vDown")
                        arrOut[pos] = vDown;
                    else
                        arrOut[pos] = vLeft;
                }
                
                /*
                if (v.distanceTo(vDown)> maxDist){
                    //Draw.drawSphereAt(v,0.2);
                    arr[pos] = arr[pos-1];
                 //   arr[pos].y += arr[pos-1].y - arr[pos-2].y;
                }*/
            }
            /*
            var variationx = v.x - lastVertex.x;
            var variationy = v.x - lastVertex.y;
            var variationz = v.z - lastVertex.z;
            */
          
      },        
      
      
      textureMeshLidar: function(geo){
          
           var mat = ProjectiveTexturing2.getShaderMat();
           var meshLidar  = new THREE.Mesh(geo,mat);//, mat); //new THREE.MeshBasicMaterial({wireframe:true, color:0xff00ff}));
        //   meshLidar.material.side = THREE.DoubleSide;
        //   meshLidar.material.transparent = false;
           gfxEngine.addToScene(meshLidar);
          
      },


      updateLaserAttributes: function() {
/*
            _bufferGeometry.attributes.position.updateRange.count = 3145728;
            _bufferGeometry.attributes.color.updateRange.count = 3145728;
            _bufferGeometry.attributes.uniqueid.updateRange.count = 1048576;
   */         
            _bufferGeometry.attributes.position.needsUpdate = true;
            _bufferGeometry.attributes.color.needsUpdate = true; 
            _bufferGeometry.attributes.uniqueid.needsUpdate = true;
            
            //Picking
            _geometryParticleSystemPicking.verticesNeedUpdate = true;
            _geometryParticleSystemPicking.colorsNeedUpdate = true;
            
            //_bufferGeometry.computeBoundingSphere();
             // _bufferGeometry.verticesNeedUpdate = true;
             //console.log(_bufferGeometry.attributes.color,"  ",_bufferGeometry.attributes.uniqueid);
       },

        // offset is _currentNbPointsInBuffer * 3; -> the place to start writing new points
        // !! offset for subarray is expressed in arraytype -> float32, not byte like for buffersubdata
        // !! new Float32Array(_bufferGeometry.attributes.position.array,offset,nbPoints *32)  doesnt take offset in account,
        // even if multiple of typearray(float32), https://developer.mozilla.org/en-US/docs/Web/API/Float32Array
        updateLaserAttributesSmartly: function(nbPoints){
            
 
              var offsetGeometry = (_currentNbPointsInBuffer -  (nbPoints-1)) * 12;
              var offsetSub = (_currentNbPointsInBuffer - (nbPoints-1)) * 3;
              var lengthSub = (nbPoints) * 3;
              var offsetSubEnd = offsetSub + lengthSub;

              // Positions
              var view = _bufferGeometry.attributes.position.array.subarray(offsetSub, offsetSubEnd);
              _gl.bindBuffer(_gl.ARRAY_BUFFER, _bufferGeometry.attributes.position.buffer);
              _gl.bufferSubData(_gl.ARRAY_BUFFER, offsetGeometry,view);
              // _gl.bufferData(_gl.ARRAY_BUFFER, _bufferGeometry.attributes.position.array, _gl.DYNAMIC_DRAW);  // OK all buffer

              // Color
              view = _bufferGeometry.attributes.color.array.subarray(offsetSub, offsetSubEnd);
              _gl.bindBuffer(_gl.ARRAY_BUFFER, _bufferGeometry.attributes.color.buffer);
              _gl.bufferSubData(_gl.ARRAY_BUFFER, offsetGeometry,view);
              
              // id
              view = _bufferGeometry.attributes.uniqueid.array.subarray(offsetSub/3, offsetSubEnd/3);
              _gl.bindBuffer(_gl.ARRAY_BUFFER, _bufferGeometry.attributes.uniqueid.buffer);
              _gl.bufferSubData(_gl.ARRAY_BUFFER, offsetGeometry/3,view);

              //Picking
              _geometryParticleSystemPicking.verticesNeedUpdate = true;
              _geometryParticleSystemPicking.colorsNeedUpdate = true;
              
        },
        
        
        
        //***********************************************************************
        animatePoints2: function() {

           if(_movementLocked !=1){
                for(var i=0;i<_nbIndiceMax ;++i){

                      if(_indice_time_laser_tab[i] >0){
                          _indice_time_laser_tab[i] -= _indice_time_laser_tab[i] * _speedMovment;
                           if (_indice_time_laser_tab[i]<0.001)
                               _indice_time_laser_tab[i]= 0.;
                      }
                }
            }
           requestAnimFrame2(LaserCloud.animatePoints2 );     
      },
      
      
      // Optimize locking when no more lasers are loaded for faster gpu rendering
      setLockMovement: function(value){
            
            _movementLocked = value;
            _shaderUniforms.movementLocked.value = _movementLocked;
            //setTimeout(Panoramic.setLockMovement, 300);  // !! scope
      },
      
      getLockedMovement: function(){
          return _movementLocked;
      },
       

      // Damn file with special order xzy... to optimise loading we dont put 'if' statement
      // and duplicate some code for pivot too... 
      addPointsToBufferIGN: function(buffer,nbAttributes,nbBitsPerAttribute,pivot){
          
         var byteArray; 
         switch(nbBitsPerAttribute){
             
             case 64: byteArray = new Float64Array(buffer); break;
             case 32: byteArray = new Float32Array(buffer); break;
             case 16: byteArray = new Int16Array(buffer); break;
         }
         
	 var positions = _bufferGeometry.attributes.position.array;
         var values_color = _bufferGeometry.attributes.color.array;
         var uniqueids =    _bufferGeometry.attributes.uniqueid.array;
         
         var color2 = new THREE.Color();        
          
         if(_currentNbPointsInBuffer > _nbPointsBuffer){// + byteArray.length/(4*nbBitsPerAttributes) ))
            _currentNbPointsInBuffer   = 0;   // We add new points remplacing the oldest in buffer
            this.indicePacketInBuffer = 0;
        }
          
         for(var p = 0; p < byteArray.length-nbAttributes; p=p+nbAttributes){ // P+4 cause x,y,z,i in bin

                var pX = byteArray[p] - pivot.x,
                pZ = byteArray[p+1] - pivot.z ,
                pY = byteArray[p+2] - pivot.y ;  // Decalage laser/cam
                var pI = 0.5;  // Intensity default    
                //if(pX > 50) console.log(pX,pY,pZ);
                if(nbAttributes>3) pI = byteArray[p+3];
                
                positions[ _currentNbPointsInBuffer * 3 + 0 ] = pX;
                positions[ _currentNbPointsInBuffer * 3 + 1 ] = pY;
                positions[ _currentNbPointsInBuffer * 3 + 2 ] = pZ;
                
                color2.setHSL(pI,0.5,0.8);
                values_color[ _currentNbPointsInBuffer * 3 + 0] = color2.r;
                values_color[ _currentNbPointsInBuffer * 3 + 1] = color2.g;
                values_color[ _currentNbPointsInBuffer * 3 + 2] = color2.b;
               
                uniqueids[ _currentNbPointsInBuffer ] = this.indicePacketInBuffer;
                
                // Then for the picking ***********************
                var colorHexFromInt = _currentNbPointsInBuffer.toString(16);
                var nbZerosMissing = 6 - colorHexFromInt.length;
                for (var i=0; i< nbZerosMissing; ++i){ colorHexFromInt = '0' + colorHexFromInt;}
                var colorHex = '#'+colorHexFromInt;
                _colorsPicking[_currentNbPointsInBuffer] = new THREE.Color(colorHex);
                 var vectorPoint = new THREE.Vector3(pX, pY, pZ); //particle
                _geometryParticleSystemPicking.vertices[_currentNbPointsInBuffer] = vectorPoint;
                //******************
                
                _currentNbPointsInBuffer++;
         }
         
          _shaderUniforms.currentidwork.value = this.indiceLaserFileLoaded;
          _indice_time_laser_tab[this.indicePacketInBuffer] = 0.3;
          
          this.updateLaserAttributes(); 
          _geometryParticleSystemPicking.verticesNeedUpdate = true;
          _geometryParticleSystemPicking.colorsNeedUpdate = true;
          
          _indiceTimeLaser = 0.5;                    
         if(!this.animateOn){this.animateOn = true; this.animatePoints2();}  // First file
                                                                                    // start animation function
          this.indiceLaserFileLoaded++;
          this.indicePacketInBuffer++
          // Load the next file in the list if not last (seems faster than parallel load)
          if(this.indiceLaserFileLoaded < this.tabLaserFilesToLoad.length)
                    this.readLaserPointsFileFromItownsBINARY(this.tabLaserFilesToLoad[this.indiceLaserFileLoaded],nbBitsPerAttribute,pivot);
      },
      
      
        // Read bin file  using dataView   Light version bruno
        readLaserFileLocalPlySAVE: function(buffer, nbAttributes, nbBitsPerAttribute, pivot) {

            /* !!! Special error when trying to read a float 64 when the offset (the position) is not a multiple of 8...  !!!  */
            /* UPDATE: Using DataView which is now supported by chrome & FF                                                   */
            //ex://6127450
            _dataView = new DataView(buffer);
            if(_currentNbPointsInBuffer>0){this.initializeBufferValues(); _nbLabel = 0;}  // We clean old data buffers
            // We need to detect the 'end_header'
            // 'e' -> 101 sur 8 bits then 'n' -> 110..
            // des qu on voit la suite (ea)der : (101 97) 100 101 114 10 (retour chariot)

            if( (_currentNbPointsInBuffer + 3000000) > _nbPointsBuffer ){// + byteArray.length/(4*nbBitsPerAttributes) ))
                _currentNbPointsInBuffer   = 0;   // We add new points remplacing the oldest in buffer
                this.indicePacketInBuffer  = 0;
            }
            
             var offsetStartCoding = 0;
             var littleEndian = true;         
             var startFound = false;
             var a = 0;
             while (!startFound && a<8000){
                startFound = ((_dataView.getInt8(a,littleEndian) == 100) && (_dataView.getInt8(a+1,littleEndian) == 101) && (_dataView.getInt8(a+2,littleEndian) == 114));// && (_dataView.getInt8(a+3,littleEndian) == 10)) ;
                a++;
             }
             if(a>=8000){ alert("fichier incorrect"); return;} else console.log("hearder end found at ",a);
             var offsetStartCoding = a+3;  // Offset where start the objects 
             if(nbAttributes==28) {offsetStartCoding = a+4;};
             _sizeHeader = offsetStartCoding;
             
            var originalPlyWithNoClass = false;//(_sizeHeader == 856 || _sizeHeader ==922 ); // DIRTY TEST
            
            
            var sizeObjectByte = 86;
            if(!originalPlyWithNoClass) sizeObjectByte = 54;  // with label & class
            
      //      if(nbAttributes==28) {var sizeObjectByte = 82; console.log('PARIS2014');}  // FOR NEW PLY like PARIS 2014, LOUVRE...
             
            var nbPoints = ((buffer.byteLength - offsetStartCoding) / sizeObjectByte) * 1;//pourcentage;

            var positions =    _bufferGeometry.attributes.position.array;
            var values_color = _bufferGeometry.attributes.color.array;
            var uniqueids =    _bufferGeometry.attributes.uniqueid.array;
            var classes =      _bufferGeometry.attributes.classe.array;

            var color2 = new THREE.Color();
            var pX,pY,pZ,pI,ind,label=0,classe=0;   

            for (var i = offsetStartCoding; i < nbPoints * sizeObjectByte; i += sizeObjectByte) {

                pX = _dataView.getFloat32(i + 8, littleEndian) - pivot.x;
                pZ = _dataView.getFloat32(i + 12, littleEndian) - pivot.z;
                pY = _dataView.getFloat32(i + 16, littleEndian) - pivot.y;
                pI = (_dataView.getFloat32(i + 32, littleEndian) + 25) / 35;
                
                if(!originalPlyWithNoClass){
                    
                    label  = _dataView.getUint32(i+44, littleEndian);
                    classe = _dataView.getUint32(i+48, littleEndian);
                    if(i<5000) console.log("label",label);
                    if(label > _nbLabel) _nbLabel = label;
                    if(label>0){color2.setHSL(label/60,1.0,0.5); if(i<15000)console.log("label",label);}
                 //   if(classe !=0) {pI = 0; color2.setHSL(pI,1.0,0.5);} //Math.random();
                       else color2.setHSL(pI,0.5,0.8)
                }else{
                    color2.setHSL(pI,0.5,0.8);
                }
                    
                ind = _currentNbPointsInBuffer * 3;
                
                positions[ ind + 0 ] = pX;
                positions[ ind + 1 ] = pY;
                positions[ ind + 2 ] = pZ;

                
                values_color[ ind + 0] = color2.r;
                values_color[ ind + 1] = color2.g;
                values_color[ ind + 2] = color2.b;

                uniqueids[ _currentNbPointsInBuffer ] = label;
                classes[ _currentNbPointsInBuffer ]   = classe;

            // Then for the picking ***********************
                    var colorHexFromInt = _currentNbPointsInBuffer.toString(16);
                    var nbZerosMissing = 6 - colorHexFromInt.length;
                     for (var a = 0; a < nbZerosMissing; ++a) { colorHexFromInt = '0' + colorHexFromInt;}
                    var colorHex = '#'+colorHexFromInt;
                    _colorsPicking[_currentNbPointsInBuffer] = new THREE.Color(colorHex);
                    _geometryParticleSystemPicking.vertices[_currentNbPointsInBuffer] = new THREE.Vector3(pX, pY, pZ);

                _currentNbPointsInBuffer++;
                
                
            }
            

             _shaderUniforms.currentidwork.value = this.indiceLaserFileLoaded;
             _indice_time_laser_tab[this.indicePacketInBuffer] = 0.15;

             this.updateLaserAttributes();
             
             _localMode = true;
             var posFirstVertex = new THREE.Vector3(positions[600000],positions[600001],positions[600002]);
             var options = {intersectionToLook:posFirstVertex, surfaceType:"Rectangle"};
             require("Navigation").goToClosestPosition(posFirstVertex.add(gfxEngine.getZeroAsVec3D()),options);
                                                                        
            this.indiceLaserFileLoaded++;  // console.log(_currentNbPointsInBuffer);
            this.indicePacketInBuffer++;
            
            this.setMessageDisplay("",false);
            
            console.log("nb ids: '(label",_nbLabel);
        },
        
        
        // Read bin file  using dataView
        readLaserFileLocalPly: function(buffer, nbAttributes, nbBitsPerAttribute, pivot) {

            /* !!! Special error when trying to read a float 64 when the offset (the position) is not a multiple of 8...  !!!  */
            /* UPDATE: Using DataView which is now supported by chrome & FF                                                   */
            //ex://6127450
            _dataView = new DataView(buffer);
            if(_currentNbPointsInBuffer>0){this.initializeBufferValues(); _nbLabel = 0;}  // We clean old data buffers
            // We need to detect the 'end_header'
            // 'e' -> 101 sur 8 bits then 'n' -> 110..
            // des qu on voit la suite (ea)der : (101 97) 100 101 114 10 (retour chariot)

            if( (_currentNbPointsInBuffer + 3000000) > _nbPointsBuffer ){// + byteArray.length/(4*nbBitsPerAttributes) ))
                _currentNbPointsInBuffer   = 0;   // We add new points remplacing the oldest in buffer
                this.indicePacketInBuffer  = 0;
            }
            
             var offsetStartCoding = 0;
             var littleEndian = true;         
             var startFound = false;
             var a = 0;
             while (!startFound && a<8000){
                startFound = ((_dataView.getInt8(a,littleEndian) == 100) && (_dataView.getInt8(a+1,littleEndian) == 101) && (_dataView.getInt8(a+2,littleEndian) == 114));// && (_dataView.getInt8(a+3,littleEndian) == 10)) ;
                a++;
             }
             if(a>=8000){ alert("fichier incorrect"); return;} else console.log("hearder end found at ",a);
             var offsetStartCoding = a+3;  // Offset where start the objects 
             if(nbAttributes==28) {offsetStartCoding = a+4;};
             _sizeHeader = offsetStartCoding;
             
            var originalPlyWithNoClass = (_sizeHeader == 856 || _sizeHeader ==922 ); // DIRTY TEST
            
            
            var sizeObjectByte = 86;   // New laser file (paris 2014 is 82 bytes, 86 for old like terrmob2)
            if(!originalPlyWithNoClass) sizeObjectByte = 94;  // with label & class
            
            if(nbAttributes==28) {var sizeObjectByte = 82; console.log('PARIS2014');}  // FOR NEW PLY like PARIS 2014, LOUVRE...
             
            var nbPoints = ((buffer.byteLength - offsetStartCoding) / sizeObjectByte) * 1;//pourcentage;

            var positions =    _bufferGeometry.attributes.position.array;
            var values_color = _bufferGeometry.attributes.color.array;
            var uniqueids =    _bufferGeometry.attributes.uniqueid.array;
            var classes =      _bufferGeometry.attributes.classe.array;

            var color2 = new THREE.Color();
            var pX,pY,pZ,pI,ind,label=0,classe=0;   

            for (var i = offsetStartCoding; i < nbPoints * sizeObjectByte; i += sizeObjectByte) {

                pX = _dataView.getFloat32(i + 32, littleEndian) - pivot.x;
                pZ = _dataView.getFloat32(i + 36, littleEndian) - pivot.z;
                pY = _dataView.getFloat32(i + 40, littleEndian) - pivot.y;
                pI = (_dataView.getFloat32(i + 70, littleEndian) + 25) / 35;
                
                if(!originalPlyWithNoClass){
                    
                    label = _dataView.getFloat32(i+86, true);
                    classe = _dataView.getFloat32(i+90, true);
                    if(label > _nbLabel) _nbLabel = label;
                    if(classe !=0) {pI = 0; color2.setHSL(pI,1.0,0.5);} //Math.random();
                       else color2.setHSL(pI,0.5,0.8)
                }else{
                    color2.setHSL(pI,0.5,0.8);
                }
                    
                ind = _currentNbPointsInBuffer * 3;
                
                positions[ ind + 0 ] = pX;
                positions[ ind + 1 ] = pY;
                positions[ ind + 2 ] = pZ;

                
                values_color[ ind + 0] = color2.r;
                values_color[ ind + 1] = color2.g;
                values_color[ ind + 2] = color2.b;

                uniqueids[ _currentNbPointsInBuffer ] = label;
                classes[ _currentNbPointsInBuffer ]   = classe;

            // Then for the picking ***********************
                    var colorHexFromInt = _currentNbPointsInBuffer.toString(16);
                    var nbZerosMissing = 6 - colorHexFromInt.length;
                     for (var a = 0; a < nbZerosMissing; ++a) { colorHexFromInt = '0' + colorHexFromInt;}
                    var colorHex = '#'+colorHexFromInt;
                    _colorsPicking[_currentNbPointsInBuffer] = new THREE.Color(colorHex);
                    _geometryParticleSystemPicking.vertices[_currentNbPointsInBuffer] = new THREE.Vector3(pX, pY, pZ);

                _currentNbPointsInBuffer++;
                
                
            }
            

             _shaderUniforms.currentidwork.value = this.indiceLaserFileLoaded;
             _indice_time_laser_tab[this.indicePacketInBuffer] = 0.15;

             this.updateLaserAttributes();
             
             _localMode = true;
             var posFirstVertex = new THREE.Vector3(positions[600000],positions[600001],positions[600002]);
             var options = {intersectionToLook:posFirstVertex, surfaceType:"Rectangle"};
         //    require("Navigation").goToClosestPosition(posFirstVertex.add(gfxEngine.getZeroAsVec3D()),options);   // Launch camera move and load pano close to laser points
                                                                        
            this.indiceLaserFileLoaded++;  // console.log(_currentNbPointsInBuffer);
            this.indicePacketInBuffer++;
            
            this.setMessageDisplay("",false);
        },
        
        
        readLaserFileXYZAscii: function(contents, nbAttributes, nbBitsPerAttribute, pivot) {


            if (_currentNbPointsInBuffer > _nbPointsBuffer)// + byteArray.length/(4*nbBitsPerAttributes) ))
                _currentNbPointsInBuffer = 0;   // We add new points remplacing the oldest in buffer


            var positions = _bufferGeometry.attributes.position.array;
            var values_color = _bufferGeometry.attributes.color.array;
            var uniqueids = _bufferGeometry.attributes.uniqueid.array;

            var color2 = new THREE.Color();
            color2.setHSL(0.4 + Math.random(), 0.5, 0.8);

            var lines = contents.match(/^.*((\r\n|\n|\r)|$)/gm);
            var x, y, z, xyz;
            for (var i = 0; i < lines.length; ++i) {
                xyz = lines[i].split(' '); //console.log(xyz);
                x = parseFloat(xyz[0] - pivot.x);
                z = parseFloat(xyz[1] - pivot.z);
                y = parseFloat(xyz[4] - pivot.y);
                //  if(i<10)console.log(x,y,z);

                positions[ _currentNbPointsInBuffer * 3 + 0 ] = x;
                positions[ _currentNbPointsInBuffer * 3 + 1 ] = y;
                positions[ _currentNbPointsInBuffer * 3 + 2 ] = z;


                values_color[ _currentNbPointsInBuffer * 3 + 0] = color2.r;
                values_color[ _currentNbPointsInBuffer * 3 + 1] = color2.g;
                values_color[ _currentNbPointsInBuffer * 3 + 2] = color2.b;



                uniqueids[ _currentNbPointsInBuffer ] = this.indiceLaserFileLoaded;

                // Then for the picking ***********************
                var colorHexFromInt = _currentNbPointsInBuffer.toString(16);
                var nbZerosMissing = 6 - colorHexFromInt.length;
                for (var a = 0; a < nbZerosMissing; ++a) {
                    colorHexFromInt = '0' + colorHexFromInt;
                }
                var colorHex = '#' + colorHexFromInt;
                _colorsPicking[_currentNbPointsInBuffer] = new THREE.Color(colorHex);
                var vectorPoint = new THREE.Vector3(x, y, z); //particle
                _geometryParticleSystemPicking.vertices[_currentNbPointsInBuffer] = vectorPoint;
                //******************

                _currentNbPointsInBuffer++;
            }

            _shaderUniforms.currentidwork.value = this.indiceLaserFileLoaded;

            this.updateLaserAttributes();
            _geometryParticleSystemPicking.verticesNeedUpdate = true;
            _geometryParticleSystemPicking.colorsNeedUpdate = true;

            _indiceTimeLaser = 0.5;
           if(!this.animateOn){this.animateOn = true; this.animatePoints2();}  // First file
            // start animation function
            this.indiceLaserFileLoaded++;
            // Load the next file in the list if not last (seems faster than parallel load)
            if (this.indiceLaserFileLoaded < this.tabLaserFilesToLoad.length)
                this.readLaserPointsFileFromItownsBINARY(this.tabLaserFilesToLoad[this.indiceLaserFileLoaded]);
            //var l1 = contents.substr(1, 12);//contents.indexOf("n"));
            //console.log(l1);
        },
        
        
        readLaserFileLidarFormat: function(contents, nbAttributes, nbBitsPerAttribute, pivot) {


            if (_currentNbPointsInBuffer > _nbPointsBuffer)// + byteArray.length/(4*nbBitsPerAttributes) ))
                _currentNbPointsInBuffer = 0;   // We add new points remplacing the oldest in buffer


            var positions = _bufferGeometry.attributes.position.array;
            var values_color = _bufferGeometry.attributes.color.array;
            var uniqueids = _bufferGeometry.attributes.uniqueid.array;

            var color2 = new THREE.Color();
            color2.setHSL(0.4 + Math.random(), 0.5, 0.8);

            var lines = contents.match(/^.*((\r\n|\n|\r)|$)/gm);
            var x, y, z, xyz;

            for (var i = 0; i < lines.length; ++i) {
                xyz = lines[i].split(' ');
                x = parseFloat(xyz[0]) / 1000 + 655000 - pivot.x;
                z = parseFloat(xyz[1]) / 1000 + 6860000 - pivot.z;
                y = parseFloat(xyz[2]) / 1000 - pivot.y;
                if (i < 3)
                    console.log(x, y, z);


                positions[ _currentNbPointsInBuffer * 3 + 0 ] = x;
                positions[ _currentNbPointsInBuffer * 3 + 1 ] = y;
                positions[ _currentNbPointsInBuffer * 3 + 2 ] = z;


                values_color[ _currentNbPointsInBuffer * 3 + 0] = color2.r;
                values_color[ _currentNbPointsInBuffer * 3 + 1] = color2.g;
                values_color[ _currentNbPointsInBuffer * 3 + 2] = color2.b;



                uniqueids[ _currentNbPointsInBuffer ] = this.indiceLaserFileLoaded;

                // Then for the picking ***********************
                var colorHexFromInt = _currentNbPointsInBuffer.toString(16);
                var nbZerosMissing = 6 - colorHexFromInt.length;
                for (var a = 0; a < nbZerosMissing; ++a) {
                    colorHexFromInt = '0' + colorHexFromInt;
                }
                var colorHex = '#' + colorHexFromInt;
                _colorsPicking[_currentNbPointsInBuffer] = new THREE.Color(colorHex);
                var vectorPoint = new THREE.Vector3(x, y, z); //particle
                _geometryParticleSystemPicking.vertices[_currentNbPointsInBuffer] = vectorPoint;
                //******************

                _currentNbPointsInBuffer++;
            }

            _shaderUniforms.currentidwork.value = this.indiceLaserFileLoaded;

            this.updateLaserAttributes();
            _geometryParticleSystemPicking.verticesNeedUpdate = true;
            _geometryParticleSystemPicking.colorsNeedUpdate = true;

            _indiceTimeLaser = 0.5;
           if(!this.animateOn){this.animateOn = true; this.animatePoints2();}  // First file
            // start animation function
            this.indiceLaserFileLoaded++;
            // Load the next file in the list if not last (seems faster than parallel load)
            if (this.indiceLaserFileLoaded < this.tabLaserFilesToLoad.length)
                this.readLaserPointsFileFromItownsBINARY(this.tabLaserFilesToLoad[this.indiceLaserFileLoaded]);
            //var l1 = contents.substr(1, 12);//contents.indexOf("n"));

            //var l1 = contents.substr(1, 12);//contents.indexOf("n"));
            //console.log(l1);
        },
        
        
        readLaserFileASCII: function(buffer, nbAttributes, nbBitsPerAttribute, pivot) {
        },
        
        
        // Loader for binary file with no Header. All attributes have to be the same data type
        // pivot is the value we substract to all coordinates
        // Work for xyz, xyzi, xyzikzfzefzfz... 
        // in itowns file sys, each point has a x,y,z,i,c (3dposition,intensity and a class)
        // ex xyzi double -> nbAttributes:4, nbBitsPerAttribute:64
        addPointsToBufferGenericWithConversion: function(buffer, nbAttributes, nbBitsPerAttribute, pivot, projection1, projection2) {

            var byteArray;
            switch (nbBitsPerAttribute) {

                case 64:
                    byteArray = new Float64Array(buffer);
                    break;
                case 32:
                    byteArray = new Float32Array(buffer);
                    break;
                case 16:
                    byteArray = new Int16Array(buffer);
                    break;
            }

            var positions = _bufferGeometry.attributes.position.array;
            var values_color = _bufferGeometry.attributes.color.array;
            var uniqueids = _bufferGeometry.attributes.uniqueid.array;

            var color2 = new THREE.Color();
            var pI;
            if (_currentNbPointsInBuffer > _nbPointsBuffer)// + byteArray.length/(4*nbBitsPerAttributes) ))
                _currentNbPointsInBuffer = 0;   // We add new points remplacing the oldest in buffer

            for (var p = 0; p < byteArray.length - nbAttributes; p = p + nbAttributes) { // P+4 cause x,y,z,i in bin

                var p1 = Cartography.convertCoord({x: byteArray[p], y: byteArray[p + 2]}, projection1, projection2);
                var pX = p1.x - pivot.x,
                    pY = byteArray[p + 1] - pivot.y,
                    pZ = p1.y - pivot.z;  // Decalage laser/cam
                // Intensity default    
                if (nbAttributes > 3)
                    pI = byteArray[p + 3] / 255;
                else
                    pI = 0.6 + Math.abs(pY / 80);

                positions[ _currentNbPointsInBuffer * 3 + 0 ] = pX;
                positions[ _currentNbPointsInBuffer * 3 + 1 ] = pY;
                positions[ _currentNbPointsInBuffer * 3 + 2 ] = pZ;

                color2.setHSL(pI, 0.5, 0.8);
                values_color[ _currentNbPointsInBuffer * 3 + 0] = color2.r;
                values_color[ _currentNbPointsInBuffer * 3 + 1] = color2.g;
                values_color[ _currentNbPointsInBuffer * 3 + 2] = color2.b;

                uniqueids[ _currentNbPointsInBuffer ] = this.indiceLaserFileLoaded;

                // Then for the picking ***********************
                var colorHexFromInt = _currentNbPointsInBuffer.toString(16);
                var nbZerosMissing = 6 - colorHexFromInt.length;
                for (var i = 0; i < nbZerosMissing; ++i) {
                    colorHexFromInt = '0' + colorHexFromInt;
                }
                var colorHex = '#' + colorHexFromInt;
                _colorsPicking[_currentNbPointsInBuffer] = new THREE.Color(colorHex);
                var vectorPoint = new THREE.Vector3(pX, pY, pZ); //particle
                _geometryParticleSystemPicking.vertices[_currentNbPointsInBuffer] = vectorPoint;
                //******************

                _currentNbPointsInBuffer++;
            }

            _shaderUniforms.currentidwork.value = this.indiceLaserFileLoaded;

           this.updateLaserAttributes();
            _geometryParticleSystemPicking.verticesNeedUpdate = true;
            _geometryParticleSystemPicking.colorsNeedUpdate = true;

            _indiceTimeLaser = 0.5;
            if(!this.animateOn){this.animateOn = true; this.animatePoints2();}  // First file
            // start animation function
            this.indiceLaserFileLoaded++;
            // Load the next file in the list if not last (seems faster than parallel load)
            if (this.indiceLaserFileLoaded < this.tabLaserFilesToLoad.length)
                this.readLaserPointsFileFromItownsBINARY(this.tabLaserFilesToLoad[this.indiceLaserFileLoaded]);
        },
    
       
        readLaserPointsFileFromItownsBINARY: function(fileName) {

            var self = this;
            var xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function() {  // Asynch version	
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        var buffer = xhr.response;
                        //self.loadLaserBuffer(buffer);
                        //self.addPointsToBuffer(buffer);
                        self.addPointsToBufferIGN(buffer, 4, 64, _zero);  //4 attributes 64bits with pivot _zero
                            } else {  
                                    console.log("Error", xhr.statusText);  
                                    self.indiceLaserFileLoaded++;
                                    self.readLaserPointsFileFromItownsBINARY( self.tabLaserFilesToLoad[ self.indiceLaserFileLoaded],nbBitsPerAttribute,pivot);
                            }  
                    }  
            }
            xhr.open("GET", _url + fileName, true);//, "login", "pass");  //98_88.bin
            xhr.responseType = 'arraybuffer';
            xhr.send(null);	
       },
       
       
       readLaserPointsFileFromItownsGeneric: function(fileName,nbBitsPerAttribute,pivot){

            var self = this;
            var xhr = new XMLHttpRequest();            
            var zero = gfxEngine.getZero();

            xhr.onreadystatechange = function () {  // Asynch version	
                    if (xhr.readyState === 4) {  
                            if (xhr.status === 200) {  	
                                    var buffer = xhr.response;	
                                    //self.loadLaserBuffer(buffer);
                                    //self.addPointsToBuffer(buffer);
                                    self.addPointsToBufferGeneric(buffer,4,nbBitsPerAttribute,pivot);  //4 attributes of nbBitsPerAttribute bits with pivot _zero
                    } else {
                                   // console.log("Error", xhr.statusText);
                                    self.indiceLaserFileLoaded++;
                                    if(self.indiceLaserFileLoaded < self.tabLaserFilesToLoad.length)
                                        self.readLaserPointsFileFromItownsGeneric(self.tabLaserFilesToLoad[self.indiceLaserFileLoaded],32,
                                                                                  {x:zero.x - _currentLaserPivot.x,
                                                                                   y:zero.y - _currentLaserPivot.y,
                                                                                   z:zero.z - _currentLaserPivot.z});
                    }
                }
            }
            
            var urlRequest = _url + fileName;
            xhr.open("GET", urlRequest, true);//,  "login", "pass");  //98_88.bin
            xhr.responseType = 'arraybuffer';
            xhr.send(null);
        },
        
        
        readLaserPointsFileFromItownsGenericMesh: function(fileName,nbBitsPerAttribute,pivot){

            var self = this;
            var xhr = new XMLHttpRequest();            
            var zero = gfxEngine.getZero();

            xhr.onreadystatechange = function () {  // Asynch version	
                    if (xhr.readyState === 4) {  
                            if (xhr.status === 200) {  	
                                    var buffer = xhr.response;	
                                    //self.loadLaserBuffer(buffer);
                                    //self.addPointsToBuffer(buffer);
                                    self.addPointsToBufferGenericMesh(buffer,4,nbBitsPerAttribute,pivot);  //4 attributes of nbBitsPerAttribute bits with pivot _zero
                    } else { // Error but keep going on the stack
                                   // console.log("Error", xhr.statusText);
                                    self.indiceLaserFileLoaded++;
                                    if(self.indiceLaserFileLoaded < self.tabLaserFilesToLoad.length)
                                        self.readLaserPointsFileFromItownsGenericMesh(self.tabLaserFilesToLoad[self.indiceLaserFileLoaded],32,
                                                                                  {x:zero.x - _currentLaserPivot.x,
                                                                                   y:zero.y - _currentLaserPivot.y,
                                                                                   z:zero.z - _currentLaserPivot.z});
                    }
                }
            }
            xhr.open("GET", _url + fileName, true);
            xhr.responseType = 'arraybuffer';
            xhr.send(null);
        },
       
        readLaserFileLocalBINARY: function(buffer, nbAttributes, nbBitsPerAttribute, pivot) {

            this.addPointsToBufferGeneric(buffer, nbAttributes, nbBitsPerAttribute, pivot);
            // this.addPointsToBufferIGN(buffer,nbAttributes,nbBitsPerAttribute,pivot);
        },
        readLaserFileLocalBINARYWithConversion: function(buffer, nbAttributes, nbBitsPerAttribute, pivot, projection1, projection2) {

            this.addPointsToBufferGenericWithConversion(buffer, nbAttributes, nbBitsPerAttribute, pivot, projection1, projection2);
        },
        
        
        // Empty laser buffer totally, for example when jumping to a new pivot
        emptyBuffer: function(){
            console.log('emptyBuffer');
            //this.tabLaserFilesToLoad = [];
            this.initializeBufferValues();
            //_bufferGeometry.attributes.position.array = new Float32Array(_nbPointsBuffer * 3);
            this.updateLaserAttributes();
        },
       
       
        // MAIN LOADING FUNCTION
        launchLaserAroundCurrentTime: function(duration, laserNum) {
            
            _notLoaded = false;   // Means if no movement we won t have to load again when visibility gets back on
            var date = Panoramic.getYYMMDD();
            var hours = Panoramic.getPanoHours();
            var seconds = Panoramic.getPanoSecondsInHour();
            var decalageUTC = Panoramic.getDecalageUTC();
            console.log("laser", date, laserNum, hours, seconds, duration, _currentLaserPivot);
            this.launchLaserNewRieglLOD(date,hours,seconds - decalageUTC,duration/6);
        },
        
        //Test with riegl360
        launchLaserNewRiegl: function(date,hours,seconds,duration){

           // duration /=2;
            var decalage = 3;
            var zero = gfxEngine.getZero();
            
            //this.tabLaserFilesToLoad = [];
            var second = hours * 3600 + seconds + decalage;
            for(var i = parseInt(second - duration/2) * 10 ; i< parseInt(second + duration/2) * 10 ; ++i){

                var fileName = date+"/"+i+".bin";
                if(($.inArray(fileName, this.tabLaserFilesToLoad)=== -1)) 
                     this.tabLaserFilesToLoad.push(fileName);
            }
            this.readLaserPointsFileFromItownsGeneric(this.tabLaserFilesToLoad[this.indiceLaserFileLoaded],32,
                                                                                  {x:zero.x - _currentLaserPivot.x,
                                                                                   y:zero.y - _currentLaserPivot.y,
                                                                                   z:zero.z - _currentLaserPivot.z});
        },
        
           
        // Test with riegl360 with 2 level of definitions
        launchLaserNewRieglLOD: function(date,hours,seconds,duration){

           // duration /=2;
            var decalage = 3;
            var zero = gfxEngine.getZero();
            
            //this.tabLaserFilesToLoad = [];
            var second = 3600 * hours + seconds;// + decalage;
            var fileNameMin="", fileNameMax="";
            
            // Empty files to load (temp)
            this.tabLaserFilesToLoad = [];
            this.indiceLaserFileLoaded = 0;
    
            //LR
            for(var i = 0 ; i< 1 * duration  ; i+=0.1){
                
                var nummin = (second - i) * 10;
                var nummax = (second + i) * 10;
                fileNameMin = date+"/LR/"+nummin+".bin";
                fileNameMax = date+"/LR/"+nummax+".bin";
                
                var posMin = $.inArray(fileNameMin, this.tabLaserFilesToLoad);
                var posMax = $.inArray(fileNameMax, this.tabLaserFilesToLoad);
                
                if( (posMin === -1) || (this.tabLaserFilesToLoad.length - posMin> 20) ) 
                     this.tabLaserFilesToLoad.push(fileNameMin);
                if( i>0 && ((posMax === -1) || (this.tabLaserFilesToLoad.length - posMax> 20)) ) 
                     this.tabLaserFilesToLoad.push(fileNameMax);
            }
            
            
            // HR
            for(var i = 0 ; i< 1*duration ; i+=0.1){
                
                var nummin = (second - i) * 10;
                var nummax = (second + i) * 10;
                fileNameMin = date+"/HR/"+nummin+".bin";
                fileNameMax = date+"/HR/"+nummax+".bin";
                
                var posMin = $.inArray(fileNameMin, this.tabLaserFilesToLoad);
                var posMax = $.inArray(fileNameMax, this.tabLaserFilesToLoad);
                
                if( (posMin === -1) || (this.tabLaserFilesToLoad.length - posMin> 20) ) 
                     this.tabLaserFilesToLoad.push(fileNameMin);
                if( i>0 && ((posMax === -1) || (this.tabLaserFilesToLoad.length - posMax> 20)) ) 
                     this.tabLaserFilesToLoad.push(fileNameMax);
            }
            
       
            //  console.log(this.tabLaserFilesToLoad);
            if(this.indiceLaserFileLoaded < this.tabLaserFilesToLoad.length)
                 this.readLaserPointsFileFromItownsGeneric(this.tabLaserFilesToLoad[this.indiceLaserFileLoaded],32,
                                                                                  {x:zero.x - _currentLaserPivot.x,
                                                                                   y:zero.y - _currentLaserPivot.y,
                                                                                   z:zero.z - _currentLaserPivot.z});
          
        },
             
        // LAS lidar file loading function
        loadLasFile: function (filename,pivot){


                 var self = this;
                 var xhr = new XMLHttpRequest();            
                 var zero = gfxEngine.getZero();
                 // 43.11575365753033, y: 54.760090470367814, z: 5.807350948914382
                 
                 xhr.onreadystatechange = function () {  // Asynch version	
                         if (xhr.readyState === 4) {  
                                 if (xhr.status === 200) {  	
                                         var buffer = xhr.response;	
                                         self.addLasPointsToBuffer(buffer,pivot);  //4 attributes of nbBitsPerAttribute bits with pivot _zero
                                 }
                     }
                 }
                 xhr.open("GET", "http://www.itowns.fr/nokiaHere/lidar/" + filename, true);  //98_88.bin
                 xhr.responseType = 'arraybuffer';
                 xhr.send(null);


        },
        
        // LAS point cloud
        addLasPointsToBuffer: function(buffer,pivot){
            
             var lasObj = new LasReader.LasReader(buffer);
             console.log("lasOBJ: ",lasObj);
             
             
                var positions =    _bufferGeometry.attributes.position.array;
                var values_color = _bufferGeometry.attributes.color.array;
                var uniqueids =    _bufferGeometry.attributes.uniqueid.array;

                var color2 = new THREE.Color();
                var pX,pY,pZ,pI,ind;         

             var geo = new THREE.Geometry();       
             var LasReaderObject = lasObj;
             var projItowns = new OpenLayers.Projection("EPSG:2154");
             var projLAS = new OpenLayers.Projection("EPSG:4326");  // nokia las wgs84
             
             for (var p=0; p< LasReaderObject.header.numberOfPointRecords; p++) {

                    var lasPoint = LasReaderObject.getPointData(p);
                        
                    var vec = new THREE.Vector3((LasReaderObject.header.YScaleFactor * lasPoint.Y*1.0) + LasReaderObject.header.YOffset,
                                                (LasReaderObject.header.ZScaleFactor * lasPoint.Z*1.0) + LasReaderObject.header.ZOffset ,
                                                (LasReaderObject.header.XScaleFactor * lasPoint.X*1.0) + LasReaderObject.header.XOffset);//.applyMatrix4(transformMatrix);    
                                                

                     
                 //       var p1 = Cartography.convertCoord({y: vec.x, x: vec.z}, "EPSG:4326","EPSG:2154");  // 4326 for wgs84 ! 
                        var p1 = new OpenLayers.Geometry.Point(vec.z, vec.x);
                        p1 = p1.transform(projLAS, projItowns);
                                                       
                        p1.x -= pivot.x;
                        p1.y -= pivot.z;
                        vec.y -= pivot.y + 0.6;  // 0.6 bias SUPPOSED ellipsoid conversion or nokia forgot to mention??
                        
                        if ( p<10) {
                            console.log(vec.x,vec.z,vec.y,p1);
                        }   
                        ind = _currentNbPointsInBuffer * 3;
                                                    
                        positions[ ind + 0 ] = p1.x;
                        positions[ ind + 1 ] = vec.y;
                        positions[ ind + 2 ] = p1.y;

                        color2.setHSL(0.5,0.5,0.8);
                        values_color[ ind + 0] = color2.r;
                        values_color[ ind + 1] = color2.g;
                        values_color[ ind + 2] = color2.b;

                        uniqueids[ _currentNbPointsInBuffer ] = this.indicePacketInBuffer;

                        // Then for the picking ***********************
                        var colorHexFromInt = _currentNbPointsInBuffer.toString(16);
                        var nbZerosMissing = 6 - colorHexFromInt.length;
                        for (var i=0; i< nbZerosMissing; ++i){ colorHexFromInt = '0' + colorHexFromInt;}
                        var colorHex = '#'+colorHexFromInt;
                        _colorsPicking[_currentNbPointsInBuffer] = new THREE.Color(colorHex);
                        _geometryParticleSystemPicking.vertices[_currentNbPointsInBuffer] = new THREE.Vector3(p1.x, vec.y, p1.y);

                        _currentNbPointsInBuffer++;

                        geo.vertices.push(vec);
            }
            

          _shaderUniforms.currentidwork.value = this.indiceLaserFileLoaded;
          _indice_time_laser_tab[this.indicePacketInBuffer] = 0.15;

          this.setLockMovement(0);
          console.log('nb points LAS: ',LasReaderObject.header.numberOfPointRecords);
          this.updateLaserAttributes();
          //this.updateLaserAttributesSmartly(LasReaderObject.header.numberOfPointRecords);//offset); 

          _indiceTimeLaser = 0.5;                    
          if(!this.animateOn){this.animateOn = true; this.animatePoints2(); /*console.log('thisanimate');*/}  // First file
                                                                                    // start animation function
          this.indiceLaserFileLoaded++;// console.log(_currentNbPointsInBuffer);
          this.indicePacketInBuffer++;
            
            geo.las = LasReaderObject;
        },
       
        
        processEvent: function(event) {
            if (_events[event]) {
                _events[event]();
            }
        },
        setReverseMotion: function(b) {
            _indiceTimeLaser = 0.5;//_reverseMotion = b;
        },
        setPointSize: function(newValue) {
            if (this.initiated)
                _particleSystem.material.uniforms['point_size'].value = newValue;
        },
        changeVisibility: function() {
            if (this.initiated)
                _particleSystem.visible = !_particleSystem.visible;
        },
        setVisibility: function(b) {		
            if (this.initiated)
                _particleSystem.visible = !!b;
        },
        changeAlpha: function(val) {
            if (this.initiated)
                _particleSystem.material.uniforms['alpha'].value = val;
        },
     /*
        getXYZFromClick2D: function(mouseX, mouseY) {

            var arr = new Uint8Array(4);//(wi * he * 4);
            //console.log(gfxEngine.getWinHeight(), mouseY,gfxEngine.getWinHeight() - mouseY );
            gfxEngine.renderToTexture(_sceneRTT, gfxEngine.getCamera(), _rtTexture, true); // Render to texture, not shown on screen with the color id
            var ctx = gfxEngine.getContext();//"experimental-webgl", {preserveDrawingBuffer: true});
            ctx.readPixels(mouseX, gfxEngine.getWinHeight() - mouseY, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, arr);    // ATTENTION sens inverse pour les Y lors du readPixels
            
            var r = arr[0];
            var g = arr[1];
            var b = arr[2];
      //      console.log(r,g, b);
            var posXYZ = new THREE.Vector3(-1, -1, -1);
            if (!(r === 255 && g === 255 && b === 255)) {
                var colorClicked = new THREE.Color();
                colorClicked.setRGB(r / 255, g / 255, b / 255);
                posXYZ = this.findXYZFromColorID(colorClicked.getHex());
            }
           
            return posXYZ;
        },
    */
                // Function that finds the best 3D position under the mouse using the pointCloud
         getXYZFromClick2D: function(mouseX, mouseY, radius) {
             
            var arrayNeighbours = []; // Arrray of points (vec3) close to click (from projected view...)
            var zero = gfxEngine.getZero();
            var radius = radius || 170;
            var arr = new Uint8Array(radius*radius*4);//(wi * he * 4);
            gfxEngine.renderToTexture(_sceneRTT, gfxEngine.getCamera(), _rtTexture, true); // Render to texture, not shown on screen with the color id
            var ctx = gfxEngine.getContext();//"experimental-webgl", {preserveDrawingBuffer: true});
            ctx.readPixels(mouseX - radius/2, gfxEngine.getWinHeight() - mouseY - radius/2 , radius, radius, ctx.RGBA, ctx.UNSIGNED_BYTE, arr);    // ATTENTION sens inverse pour les Y lors du readPixels

            var min = 1000;
            var colorClicked = new THREE.Color();
            var posXYZ = new THREE.Vector3(-1, -1, -1);
            var arrCoord2D = []; // array containing 2D coords of point in projectiv coord
            var arrCoord3D = [];
            //var distFromCenter = [];  // array containing dist from center (mouse click) in 2D of the points
            var indiceClosestPointFromClick = 0;
    
            for(var a=0; a<arr.length - 4; a+=4){
                 
                // Coordinates in texture crop  (mouse coord in texture crop is (radius/2, radius/2)) 
                var i = (a/4) % radius;
                var j = (a/4) / radius;
                
                var r = arr[a];
                var g = arr[a+1];
                var b = arr[a+2];
                
                if (!(r == 0 && g == 0 && b == 0)){   // Color of scene background, SHOULD BE A PARAMETER, not always black
                    arrCoord2D.push(new THREE.Vector2(i,j)); 
                    var colorClicked = new THREE.Color();
                    colorClicked.setRGB(r / 255, g / 255, b / 255);
                    posXYZ = this.findXYZFromColorID(colorClicked.getHex());
                    arrCoord3D.push(posXYZ);
                    var distFromClick  = Math.sqrt( (i - radius/2) * (i - radius/2) + (j - radius/2) * (j - radius/2));
                    //distFromCenter.push(distFromClick); 
                    if(distFromClick < min){ min = distFromClick; indiceClosestPointFromClick = arrCoord2D.length - 1;}
                }
            }

            // Draw.drawSphereAt(arrCoord3D[indiceClosestPointFromClick],0.05);
            // Then get best 3D points representing neighbour and then normal
            var norm = this.getBestRepresentingNormalFrom(arrCoord3D,indiceClosestPointFromClick) || new THREE.Vector3();
            
            // Create plane at position with normal for intersection with ray
            if(!this.planeLocal){
                var geomPlane = new THREE.PlaneGeometry(2, 2, 1);
                this.planeLocal= new THREE.Mesh(geomPlane, new THREE.MeshBasicMaterial({side:THREE.DoubleSide,color:0xff00ff, transparent:true,opacity:0.3}));
                gfxEngine.addToScene(this.planeLocal); this.planeLocal.visible = false;
            }
            this.planeLocal.position = arrCoord3D[indiceClosestPointFromClick]; //console.log("plane position: ", this.planeLocal.position);
            
            // Orient plane
            var vec = norm.clone();
            var up = new THREE.Vector3(0, 0, 1);  //(0,1,0);
            var axis = new THREE.Vector3().crossVectors(up, vec);
            if (vec.y === 1 || vec.y === -1) {
                axis = new THREE.Vector3(1, 0, 0);
            }

            var radians = Math.acos(vec.dot(up));
            var mat = new THREE.Matrix4();
            mat = Utils.rotateByAxis( mat,axis, radians);
            this.planeLocal.rotation.setFromRotationMatrix(mat);
             // ! Needs a rendering pass (matrix world update? weird)
            gfxEngine.renderOnce();
            // Compute intersection with plane
            var objArray = gfxEngine.getIntersected(mouseX, mouseY, [this.planeLocal]);
          //  console.log(mouseX,mouseY);
            if (objArray[0]) {
                    var p = objArray[0].point; // Pos 3D intersected
                    posXYZ = p;
             }

            return posXYZ; //this.getBest3DposFromArray(mouseX, mouseY, arrayNeighbours); //arrayNeighbours;
        },
        
        
        // Option: indiceClosestPointFromClick specifi the base of plane
        getBestRepresentingNormalFrom: function(arrayPoints,indiceClosestPointFromClick){
            
            var a,b,c = null;
            var a = indiceClosestPointFromClick != undefined ? arrayPoints[indiceClosestPointFromClick] : arrayPoints[0];
            var i = 0;
            while (!c && i< arrayPoints.length){
                
                var v = arrayPoints[i];
                if(!b){
                    if (Math.abs(v.x - a.x) >=0.04) b = v;
                }
                else{
                    if (Math.abs(v.z - b.z) >=0.04) c = v;}

                i++;
            }
            
            if(c) return this.computeNormalFrom3Points(a,b,c,false);  // bool to draw normal and surface
            
        },
        
        // We have the 3D points neighbours of the clic we need to find the best 3D pos under mouse
        // reconstructing a surface and intersecting with clic-cam ray
        getBest3DposFromArray: function(mouseX,mouseY, arrPos){
            
            var min = 100;
            
            for(var i=0; i<arrPos.length; ++i){
                
                var dist = arrPos;
            }
        },
      
        
        
        // PREVIOUSLY  getNeighboursXYZFromClick2D (look vertical objects)
        getMaxVerticalAccumulationPoint: function(mouseX, mouseY) {
            
            var arrayNeighbours = this.getNeighboursXYZFromClick2D(mouseX, mouseY,40);
            var posAndCoef = this.analyzeShapeFromNeighbours(arrayNeighbours);
            
            return posAndCoef;
        },
        
        // Return arrray of points (vec3) close to click (from projeted view...)
         getNeighboursXYZFromClick2D: function(mouseX, mouseY, radius) {
             
            var arrayNeighbours = []; 
            var zero = gfxEngine.getZero();
            var radius = radius || 40 ;
            var arr = new Uint8Array(radius*radius*4);//(wi * he * 4);
            gfxEngine.renderToTexture(_sceneRTT, gfxEngine.getCamera(), _rtTexture, true); // Render to texture, not shown on screen with the color id
            var ctx = gfxEngine.getContext();//"experimental-webgl", {preserveDrawingBuffer: true});
            ctx.readPixels(mouseX - radius/2, gfxEngine.getWinHeight() - mouseY - radius/2 , radius, radius, ctx.RGBA, ctx.UNSIGNED_BYTE, arr);    // ATTENTION sens inverse pour les Y lors du readPixels

            for(var i=0; i<arr.length - 4; i+=4){
                var r = arr[i];
                var g = arr[i+1];
                var b = arr[i+2];
                
                if (!(r == 0 && g == 0 && b == 0)) {
                    var colorClicked = new THREE.Color();
                    colorClicked.setRGB(r / 255, g / 255, b / 255);
                    var posXYZ = this.findXYZFromColorID(colorClicked.getHex());
                    arrayNeighbours.push(posXYZ);
                }
                //console.log(r,g,b);
            }
            
            return arrayNeighbours;
        },
        
        
        // arrayPoints is array of vec3, around click
        // look for vertical structure
        analyzeShapeFromNeighbours: function(arrayPoints) {
            
          //  console.log(arrayPoints.length);
            var l = arrayPoints.length;
            //var tabAccu = new Array(l);
            var tabAccu = []; tabAccu.length = l;
            var maxAccu = 0;
            var indiceMaxAccu = -1;
            var seuil = 0.08;
            for (var i=0; i< arrayPoints.length; ++i){
                
                var currentPoint = arrayPoints[i]; 
                for (var j=0; j< arrayPoints.length; ++j){
                
                    var dist = Math.sqrt( (currentPoint.x - arrayPoints[j].x) *(currentPoint.x - arrayPoints[j].x) + 
                                          (currentPoint.z - arrayPoints[j].z) *(currentPoint.z - arrayPoints[j].z));
                 
                    if (dist < seuil){
                      
                        if(tabAccu[i] == undefined) tabAccu[i] = 0; else tabAccu[i]++;
                        if(tabAccu[i]>maxAccu){maxAccu = tabAccu[i]; indiceMaxAccu = i;}
                    }                     
                                              
                 }
                
            }
            
            return {pos:arrayPoints[indiceMaxAccu],note:maxAccu};          
        },
        
        
        
        extractPointsFromPCA : function(pca, opt){
           var ret = [], coff = 2;
               ret.push(pca.m);
               Draw.drawSphereAt(new THREE.Vector3(ret[ret.length-1][0],ret[ret.length-1][1],ret[ret.length-1][2]),0.03);
           for(var i = 1; i < opt.num; i++){
                    if(ret.length === opt.num) return ret;    
                    var variance = [0,0,0];
                        variance[0] = i*coff*Math.sqrt(pca.pca.S[0]);
                        variance[2] = i*coff*Math.sqrt(pca.pca.S[2]);
                    var delta = CVML.dotMV(pca.pca.U, variance);
                     //console.log(delta);
                     ret.push(CVML.addVec(pca.m,delta));
                     Draw.drawSphereAt(new THREE.Vector3(ret[ret.length-1][0],ret[ret.length-1][1],ret[ret.length-1][2]),0.03);
                     if(opt.bidirectional){
                         if(ret.length === opt.num) return ret;
                         ret.push(CVML.subVec(pca.m,delta));
                         Draw.drawSphereAt(new THREE.Vector3(ret[ret.length-1][0],ret[ret.length-1][1],ret[ret.length-1][2]),0.03);
                         
                     }
           }
        },        
        
        computeNormalPointCloud : function(arrP, indP){
            var arr = [];
            var mX = 0, mY = 0, mZ =0;
            for(var i= 0; i< indP.length; i++){
                    arr.push([arrP[indP[i]].x,arrP[indP[i]].y,arrP[indP[i]].z]);
                    mX += arrP[indP[i]].x;
                    mY += arrP[indP[i]].y;
                    mZ += arrP[indP[i]].z;
            }
            var mPt = [mX/indP.length,mY/indP.length,mZ/indP.length];
            var pca = CVML.pca(arr,mPt);
            return {pca:pca,m:mPt};
        },        
                
        
        fitLineToNeighboursPointFromClick: function(mouseX, mouseY) {

            var arrayNeighbours2D = [];
            var arrayNeighbours3D = [];
            var radius1 = 40;
            var radius2 = 120;
            
            var arr = new Uint8Array(radius1*radius2*4);//(wi * he * 4);
                gfxEngine.renderToTexture(_sceneRTT, gfxEngine.getCamera(), _rtTexture, true); // Render to texture, not shown on screen with the color id
            var ctx = gfxEngine.getContext();//"experimental-webgl", {preserveDrawingBuffer: true});

            ctx.readPixels(mouseX - radius2/2, gfxEngine.getWinHeight() - mouseY - radius1/2 , radius2, radius1, ctx.RGBA, ctx.UNSIGNED_BYTE, arr);
            var lr = 0, lg = 0, lb = 0;
            for(var i=0; i<arr.length - 4; i+=4){
                var r = arr[i];
                var g = arr[i+1];
                var b = arr[i+2];
                 
                if (!(r === 0 && g === 0 && b === 0)&&!(r === lr && g === lg && b === lb)) {
                    var colorClicked = new THREE.Color();
                        colorClicked.setRGB(r / 255, g / 255, b / 255);
                    var posXYZ = this.findXYZFromColorID(colorClicked.getHex());
                    arrayNeighbours3D.push(posXYZ);
                    arrayNeighbours2D.push(new CVML.Point2D(posXYZ.x,posXYZ.z));
                }
                lr = r, lg = g, lb = b;
            }            
            
            //console.log(arrayNeighbours3D);
            //Draw.drawArrPoints(arrayNeighbours3D);
            var ret = CVML.RobustLineFitting(arrayNeighbours2D, 0.03);
            var pca = this.computeNormalPointCloud(arrayNeighbours3D,ret.inliers);
            var opt = {num:4, bidirectional:false};
            this.extractPointsFromPCA(pca,opt); 
            
            if(this.IsComputeNormalOn()){
                    Draw.drawArrPoints(arrayNeighbours3D);
                    Draw.drawInliersPoints(arrayNeighbours3D,ret.inliers);
            } 
        },
        
         
         getNeighboursReflectanceFromClick2D: function(mouseX, mouseY) {
             
            var arrayNeighbours = []; 
            var arrayRGB = [];
            var zero = gfxEngine.getZero();
            var radius = 40;
            var arr = new Uint8Array(radius*radius*4);//(wi * he * 4);
            gfxEngine.renderToTexture(_sceneRTT, gfxEngine.getCamera(), _rtTexture, true); // Render to texture, not shown on screen with the color id
            var ctx = gfxEngine.getContext();//"experimental-webgl", {preserveDrawingBuffer: true});
            ctx.readPixels(mouseX - radius/2, gfxEngine.getWinHeight() - mouseY - radius/2 , radius, radius, ctx.RGBA, ctx.UNSIGNED_BYTE, arr);    // ATTENTION sens inverse pour les Y lors du readPixels

            for(var i=0; i<arr.length - 4; i+=4){
                var r = arr[i];
                var g = arr[i+1];
                var b = arr[i+2];
                
                if (!(r == 0 && g == 0 && b == 0)) {
                    var colorClicked = new THREE.Color();
                    colorClicked.setRGB(r / 255, g / 255, b / 255);
                    var posXYZ = this.findXYZFromColorID(colorClicked.getHex());
                    arrayNeighbours.push(posXYZ);
                    
                    var rgb = this.findReflectanceFromColorID(colorClicked.getHex());
                    arrayRGB.push(rgb);
                    
                    
                }
                //console.log(r,g,b);
                
            }
            
             var posAndCoef = this.analyzeShapeFromNeighbours(arrayNeighbours);
            // console.log(vec3);
           
            return posAndCoef;
        },
        
        
        
        getZebraFromClick2D: function(mouseX, mouseY) {
            
            var zero = gfxEngine.getZero();
            var arr = new Uint8Array(4);//(wi * he * 4);
            gfxEngine.renderToTexture(_sceneRTT, gfxEngine.getCamera(), _rtTexture, true); // Render to texture, not shown on screen with the color id
            var ctx = gfxEngine.getContext();//"experimental-webgl", {preserveDrawingBuffer: true});
            ctx.readPixels(mouseX, gfxEngine.getWinHeight() - mouseY, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, arr);    // ATTENTION sens inverse pour les Y lors du readPixels

            var r = arr[0];
            var g = arr[1];
            var b = arr[2];

            var posXYZ = new THREE.Vector3(-1, -1, -1);
            if (!(r == 0 && g == 0 && b == 0)) {
                
                 // POS
                var colorClicked = new THREE.Color();
                colorClicked.setRGB(r / 255, g / 255, b / 255);
                posXYZ = this.findXYZFromColorID(colorClicked.getHex());
                
                // REFLECTANCE
                var rgb = this.findReflectanceFromColorID(colorClicked.getHex());
                
                // Analyze
                //var indice = colorClicked.getHex() * 3;
                this.analyzeRegionOnReflectance(rgb,posXYZ);
                console.log(rgb);
            }
            
            return posXYZ;
        },
        
        
        
        analyzeRegionOnReflectance: function(rgb,pos){
            
             var arraySeg = [];
             for (var i = 0; i < _currentNbPointsInBuffer; ++i) {

                var point = new THREE.Vector3(_bufferGeometry.attributes.position.array[i * 3    ],
                                              _bufferGeometry.attributes.position.array[i * 3 + 1],
                                              _bufferGeometry.attributes.position.array[i * 3 + 2]);
                        
                var color   = new THREE.Vector3(_bufferGeometry.attributes.color.array[i * 3    ],
                                                _bufferGeometry.attributes.color.array[i * 3 + 1],
                                                _bufferGeometry.attributes.color.array[i * 3 + 2]);  
                                              
                if (point.distanceTo(pos) <  0.15 ){
                    if( Math.abs(rgb.z - color.z) <0.03 && Math.abs(rgb.y - color.y) <0.03 && Math.abs(pos.y - point.y) <0.25){
                        this.colorizePointAtPos(i,new THREE.Vector3(1,1,1));
                        arraySeg.push(point);
                        // PUT UP
                        // _bufferGeometry.attributes.position.array[i * 3 + 1] += 1;
                    }
                }                        
                                              
             }
             
             var arrCorners = this.extractCorners(arraySeg);
             for(var a=0; a<arrCorners.length; ++a){
                 Draw.drawSphereAt(arrCorners[a],0.05); 
             }
             //_bufferGeometry.attributes.color.needsUpdate = true;
             this.updateLaserAttributes();
        },
        
        
        findXYZFromColorID: function(hex) {

            var pos = new THREE.Vector3(0, 0, 0);
            var indice = hex * 3;
            pos = new THREE.Vector3(_bufferGeometry.attributes.position.array[indice],
                        _bufferGeometry.attributes.position.array[indice + 1],
                        _bufferGeometry.attributes.position.array[indice + 2]);
                       // console.log(hex,pos);
            return pos;
        },
        

    
        findReflectanceFromColorID: function(hex) {

            var rgb = new THREE.Vector3(0, 0, 0);
            var indice = hex * 3;
            rgb = new THREE.Vector3(_bufferGeometry.attributes.color.array[indice],
                        _bufferGeometry.attributes.color.array[indice + 1],
                        _bufferGeometry.attributes.color.array[indice + 2]);

            return rgb;
        },
        
        colorizePointAtPos: function(pos,rgb){
            
            _bufferGeometry.attributes.color.array[pos *3   ] = rgb.x;
            _bufferGeometry.attributes.color.array[pos *3+ 1] = rgb.y;
            _bufferGeometry.attributes.color.array[pos *3+ 2] = rgb.z;            
            _bufferGeometry.attributes.color.needsUpdate = true; 
        },

        
        // Look if points are corners
        extractCorners: function(arr){
            
            var arrCorners = [];
            for (var i = 0; i < arr.length; ++i) {
                
                var p = arr[i];
                var cL = true; var cR = true; var cU = true; var cD = true;
                var j = 0;
                while ( (cL == true || cR == true || cU ==true || cD==true) && j< arr.length ){
                    var p1 = arr[j];
                    if( p.distanceTo(p1) <  0.15 ){   // Look in the point close neighbourhood
                        
                        cL = p1.x >= p.x && cL;
                        cR = p1.x <= p.x && cR;
                        cU = p1.z <= p.z && cU;
                        cD = p1.z >= p.z && cD;     
                    }
                    
                    j++;
                }
                
                if (cL == true || cR == true || cU ==true || cD==true){
                    arrCorners.push(p);
                }
               
            }
        
            console.log(arr.length);
            console.log(arrCorners.length);
            return  arrCorners;
        },
        
        
        // TEMP for PMR module, estimate slope Using local points
         estimateSlope: function(mouseX, mouseY, radius) {
            //var arrPoints = this.getNeighboursXYZFromClick2D(mouseX, mouseY, 40);
           // console.log(arrPoints);
            var arrayNeighbours = []; 
            var zero = gfxEngine.getZero();
            var radius = radius || 32 ;
            var arr = new Uint8Array(radius*radius*4);//(wi * he * 4);
            gfxEngine.renderToTexture(_sceneRTT, gfxEngine.getCamera(), _rtTexture, true); // Render to texture, not shown on screen with the color id
            var ctx = gfxEngine.getContext();//"experimental-webgl", {preserveDrawingBuffer: true});
            ctx.readPixels(mouseX - radius/2, gfxEngine.getWinHeight() - mouseY - radius/2 , radius, radius, ctx.RGBA, ctx.UNSIGNED_BYTE, arr);    // ATTENTION sens inverse pour les Y lors du readPixels

            for(var i=0; i<arr.length - 4; i+=4){
                
                var r = arr[i];
                var g = arr[i+1];
                var b = arr[i+2];
                
                if (!(r == 0 && g == 0 && b == 0)) {
                    var colorClicked = new THREE.Color();
                    colorClicked.setRGB(r / 255, g / 255, b / 255);
                    var posXYZ = this.findXYZFromColorID(colorClicked.getHex());
                      this.colorizePointAtPos(colorClicked.getHex(),new THREE.Vector3(1,0,0));
                    arrayNeighbours.push(posXYZ);
                }
                //console.log(r,g,b);
            }
            
            this.analyzeSlopeFromArr(arrayNeighbours);
 
        },
        
        
        // Function to compute automatically Width of road, pavements and also heights of buildings
        // Draw Option indicates if it stays or follow move (mouse move or up)
        estimateWidth: function(mouseX, mouseY, drawOption) {

            var arr = new Uint8Array(4);//(wi * he * 4);
            //console.log(gfxEngine.getWinHeight(), mouseY,gfxEngine.getWinHeight() - mouseY );
            gfxEngine.renderToTexture(_sceneRTT, gfxEngine.getCamera(), _rtTexture, true); // Render to texture, not shown on screen with the color id
            var ctx = gfxEngine.getContext();//"experimental-webgl", {preserveDrawingBuffer: true});
            ctx.readPixels(mouseX, gfxEngine.getWinHeight() - mouseY, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, arr);    // ATTENTION sens inverse pour les Y lors du readPixels

            var r = arr[0];
            var g = arr[1];
            var b = arr[2];
            //console.log(r,g, b);
            var posXYZ = new THREE.Vector3(-1, -1, -1);
            if (!(r === 255 && g === 255 && b === 255)) {
                
                var colorClicked = new THREE.Color();
                colorClicked.setRGB(r / 255, g / 255, b / 255);
               // posXYZ = this.findXYZFrdomColorID(colorClicked.getHex());
                var hex = colorClicked.getHex();
                var indice = hex * 3;   // Indice of position in array of point under mouse
               
                var lOk = false;
                var rOk = false;
                var maxSearch = 5000; 
                var maxYDif = 0.01;
                var minDist = 2;
                var nbPointsLocalAnalyze = 4;
                
                var arrPos = _bufferGeometry.attributes.position.array;
                var initialPos = new THREE.Vector3(arrPos[indice],
                                                   arrPos[indice + 1],
                                                   arrPos[indice + 2]);
                                                   
                var currentPos = new THREE.Vector3(arrPos[indice],
                                                   arrPos[indice + 1],
                                                   arrPos[indice + 2]);
                     
                var i = 0;  
                var ind = indice;
                
                
                // First we look if the user wants to measures something vertical or horizontal
                // Depending on neighbours orientation
                
                // VERTICAL SEARCH
                var up =   arrPos[ind - 2] < initialPos.y && initialPos.y < arrPos[ind + 4] && (arrPos[ind + 4] - arrPos[ind - 2]) > maxYDif * 2;
                var down = arrPos[ind - 2] > initialPos.y && initialPos.y > arrPos[ind + 4] && (arrPos[ind - 2] - arrPos[ind +4 ]) > maxYDif * 2;
                
                if( up || down){
                    
                    var p;
                    if(up)
                        p = this.searchForPointToward(indice,"top");                  
                    else
                        p = this.searchForPointToward(indice,"bottom");      

                       posR = p.posR;
                       posL = p.posL;
                       // adjust XZ of bottom point
                       posL.x = initialPos.x;
                       posL.z = initialPos.z;
                       
                       var dist =   posL.y - posR.y;
                       
                       if(drawOption == "Stay"){
                            Draw.drawOneMoreLine(posL,posR);  
                            Draw.drawSphereAt(posL,0.05,0xff00ff);
                            Draw.drawSphereAt(posR,0.05,0xff00ff);
                            Draw.showTextAtPos3D(dist.toFixed(1)+'m  ',initialPos,50);
                       }else{
                           Draw.drawLine(posL,posR);  
                           Draw.showTextAtPos3DSameMesure(dist.toFixed(1)+'m  ',initialPos);
                            
                       }
                
                }
                else     // HORIZONTAL SEARCH
                {

                    //look left first
                    while(!lOk && i< maxSearch){
                        i++;
                        var acc = 0;  
                        for(var j=0; j<nbPointsLocalAnalyze;++j){

                             ind = indice + (i+j) * 3;
                             var posL = new THREE.Vector3(arrPos[ind    ],
                                                          arrPos[ind + 1],
                                                          arrPos[ind + 2]);

                                //    this.colorizePointAtPos(ind/3,new THREE.Vector3(1,0,0));
                             var difYL =  posL.y - currentPos.y;
                              // Option stronger but much slower to avoid shadow
                            /* if(Math.sqrt( (posL.x - currentPos.x) *(posL.x - currentPos.x) + 
                                           (posL.z - currentPos.z) *(posL.z - currentPos.z)) < 2*maxYDif)*/
                                acc += difYL;

                             currentPos = posL.clone();
                             j+=3;
                        }

                      lOk = (Math.abs(acc) > maxYDif*1.5);// && (Math.abs(acc) < 60*maxYDif);

                  }


                  var indiceL = ind;//-3;
                  var posL = new THREE.Vector3(arrPos[indiceL    ],
                                               arrPos[indiceL + 1],
                                               arrPos[indiceL + 2]);

                  i = 0; 
                  currentPos = new THREE.Vector3(arrPos[indice],
                                                 arrPos[indice + 1],
                                                 arrPos[indice + 2]);
                  //look left first
                  while(!rOk && i<maxSearch ){
                        i++;  
                        var acc = 0;  
                        for(var j=0; j<nbPointsLocalAnalyze;++j){

                             ind = indice - (i+j) * 3;
                             var posR = new THREE.Vector3(arrPos[ind    ],
                                                          arrPos[ind + 1],
                                                          arrPos[ind + 2]);

                            // this.colorizePointAtPos(ind/3,new THREE.Vector3(0,0,1));
                             var difYR =  posR.y - currentPos.y;
                             // Option stronger but much slower to avoid shadow
                          /*  if(Math.sqrt( (posR.x - currentPos.x) *(posR.x - currentPos.x) + 
                                          (posR.z - currentPos.z) *(posR.z - currentPos.z)) < 10*maxYDif)*/
                                acc += difYR;
                             currentPos = posR.clone();
                             j+=3;
                        }

                      rOk = (Math.abs(acc) > maxYDif*1.5);// && (Math.abs(acc) < 10*maxYDif);
                  }
                  var indiceR = ind;//-3;

                  var posR = new THREE.Vector3(arrPos[indiceR    ],
                                               arrPos[indiceR + 1],
                                               arrPos[indiceR + 2]);

                  // Temp for obstacle
                  if( Math.abs(posR.y - posL.y) > 10*maxYDif){
                      if(posR.y>posL.y) posR.y = posL.y; else posL.y = posR.y;
                  }

                  //a.add(new THREE.Vector3(0,2,0))));//cb));// new THREE.addVectors(a,cb));
                  var posMiddle = new THREE.Vector3((posL.x+posR.x)/2,(posL.y+posR.y)/2 - 0.4,(posL.z+posR.z)/2);
                  var dist = posR.distanceTo(posL).toFixed(2); 
                  var distPlanar = Math.sqrt( (posR.x - posL.x) *(posR.x - posL.x) + 
                                              (posR.z - posL.z) *(posR.z - posL.z));
                  var slope = Math.abs(posR.y - posL.y) / distPlanar;
                  
                 // Draw.drawLine(posL,posR);
                 // Draw.showTextAtPos3DSameMesure(dist+'m  '+slope.toFixed(1)+'%',posMiddle);
                  
                  if(drawOption == "Stay"){
                      
                       Draw.drawOneMoreLine(posL,posR);  
                       Draw.showTextAtPos3D(dist+'m  '+slope.toFixed(1)+'%',posMiddle,45);
                       Draw.drawSphereAt(posL,0.05,0xff00ff);
                       Draw.drawSphereAt(posR,0.05,0xff00ff);
                       Draw.setZebraPosition(posL,posR,'ON');
                       
                  }else{
                       Draw.setZebraPosition(posL,posR);
                       Draw.drawLine(posL,posR);  
                       Draw.showTextAtPos3DSameMesure(dist+'m  '+slope.toFixed(1)+'%',posMiddle, 45);
                           
                  }
                  // console.log(posL,posR);
                }
            }
        },
   

        searchForPointToward: function(indice,direction){
            
            
            var arrPos = _bufferGeometry.attributes.position.array;
            var initialPos = new THREE.Vector3(arrPos[indice],
                                               arrPos[indice + 1],
                                               arrPos[indice + 2]);

            var currentPos = new THREE.Vector3(arrPos[indice],
                                               arrPos[indice + 1],
                                               arrPos[indice + 2]);

            var i = 0;  
            var ind = indice;

            var lOk = false;
            var rOk = false;
            var maxSearch = 8000; 
            var maxYDif = 0.01;
            var minDist = 6;
            var nbPointsLocalAnalyze = 4;
            var indiceL,indiceR;
            var posR, posL;
            
            if(direction=="top"){    
                
                while(!lOk && i< maxSearch){
                        i++;
                        ind = indice + i * 3;
                        //this.colorizePointAtPos(ind/3,new THREE.Vector3(1,0,0));
                        var pos = new THREE.Vector3(arrPos[ind    ],
                                                    arrPos[ind + 1],
                                                    arrPos[ind + 2]);

                        var dist = currentPos.distanceTo(pos);
                        currentPos = pos.clone();
                        lOk = dist > minDist;
                   }
                   indiceL = ind - 3;// -3*4;
                   
                   
                   i = 0; 
                   currentPos = new THREE.Vector3(arrPos[indice],
                                                  arrPos[indice + 1],
                                                  arrPos[indice + 2]);                                                       
                   while(!rOk && i< maxSearch){
                       var acc = 0;  
                       i++; 
                       for(var j=0; j<nbPointsLocalAnalyze*24;++j){

                         ind = indice - (i+j) * 3;
                         posL = new THREE.Vector3(arrPos[ind    ],
                                                  arrPos[ind + 1],
                                                  arrPos[ind + 2]);

                         var difYL =  posL.y - currentPos.y;
                         acc += difYL;
                         //this.colorizePointAtPos(ind/3,new THREE.Vector3(0,1,1));
                         currentPos = posL.clone();
                         j+=3;
                      }
                      rOk = (Math.abs(acc) < maxYDif/4);
                   }
                   indiceR = ind - 3;

            }else{
                 
                while(!lOk && i< maxSearch){
                        i++;
                        ind = indice - i * 3;
                        //this.colorizePointAtPos(ind/3,new THREE.Vector3(1,0,0));
                        var pos = new THREE.Vector3(arrPos[ind    ],
                                                    arrPos[ind + 1],
                                                    arrPos[ind + 2]);

                        var dist = currentPos.distanceTo(pos);
                        currentPos = pos.clone();
                        lOk = dist > minDist;
                   }
                   indiceL = ind + 3;

                   i = 0; 
                   currentPos = new THREE.Vector3(arrPos[indice],
                                                  arrPos[indice + 1],
                                                  arrPos[indice + 2]);                                                       
                   while(!rOk && i< maxSearch){
                       var acc = 0;  
                       i++; 
                       for(var j=0; j<nbPointsLocalAnalyze*2;++j){

                         ind = indice + (i+j) * 3;
                         posL = new THREE.Vector3(arrPos[ind    ],
                                                  arrPos[ind + 1],
                                                  arrPos[ind + 2]);

                         var difYL =  posL.y - currentPos.y;
                         acc += difYL;
                         //this.colorizePointAtPos(ind/3,new THREE.Vector3(0,0,1));
                         currentPos = posL.clone();
                         j+=3;
                      }
                      rOk = (Math.abs(acc) < maxYDif/3);

                   }
                   indiceR = ind - 3;
           } 
         //*nbPointsLocalAnalyze;//-3;
           
           
           posR = new THREE.Vector3(arrPos[indiceR    ],
                                    arrPos[indiceR + 1],
                                    arrPos[indiceR + 2]);

           posL = new THREE.Vector3(arrPos[indiceL    ],
                                    arrPos[indiceL + 1],
                                    arrPos[indiceL + 2]);

           // adjust XZ of bottom point
           posR.x = initialPos.x;
           posR.z = initialPos.z;
           posL.x = initialPos.x;
           posL.z = initialPos.z;


           return {posL:posL,posR:posR};
        },
        
        
        analyzeSlopeFromArr: function(arrayPoints){
            
            var a,b,c = null;
            var a = arrayPoints[0];
            var i = 1;
            while (!c && i< arrayPoints.length){
                
                var v = arrayPoints[i];
                if(!b){
                    if (Math.abs(v.x - a.x) >0.1) b = v;}
                else{
                    if (Math.abs(v.z - b.z) >0.1) c = v;}

                i++;
            }
            
            if(c) this.computeNormalFrom3Points(a,b,c);
        },
        
        /*
        analyzeSlopeFromArr: function(arrayPoints){
            

            var l = arrayPoints.length;
            var tabAccu = []; tabAccu.length = l;
            var maxAccu = 0;
            var indiceMaxAccu = -1;
            var seuil = 0.08;
            var maxSlope = 0;
            for (var i=0; i< arrayPoints.length; ++i){
                
                var currentPoint = arrayPoints[i]; 
                for (var j=0; j< arrayPoints.length; ++j){
                
                    var dist = Math.sqrt( (currentPoint.x - arrayPoints[j].x) *(currentPoint.x - arrayPoints[j].x) + 
                                          (currentPoint.z - arrayPoints[j].z) *(currentPoint.z - arrayPoints[j].z));
                    
                    if (dist>0.1){
                       var difH =  Math.abs(currentPoint.y - arrayPoints[j].y);    
                       var slope = difH/dist;
                       if (slope > maxSlope) maxSlope = slope;
                   }

                  //  console.log(slope);                  
                 }
            }
            console.log(maxSlope);
            return maxSlope;
        },
        */
        
        
        computeNormalFrom3Points: function(a,b,c,drawOn){

            var cb = new THREE.Vector3(), ab = new THREE.Vector3();

            cb.subVectors( c, b );
            ab.subVectors( a, b );
            cb.cross( ab );
            cb.normalize();
            
            if(drawOn){
                Draw.drawLine(a,new THREE.Vector3(a.x + cb.x,a.y+cb.y,a.z+cb.z));//a.add(new THREE.Vector3(0,2,0))));//cb));// new THREE.addVectors(a,cb));
                Draw.drawSurface(a,cb); console.log(cb);
                var intensitySlope =  0.3 + 4 * (Math.abs(cb.x) + Math.abs(cb.z));
                if(intensitySlope >1) intensitySlope = 1;
                Draw.setSurfaceColor(intensitySlope);
            }
            
            return cb;
        },
        
        /**
         * Functions for selection, bounding box, inside checkings...
         * 
         */
        changeRepere: function(ptA, ptB, ptC, ptD, alpha) {

            this.lengthAB = (ptB.x - ptA.x) / Math.cos(-alpha);
            this.lengthAC = (ptC.x - ptA.x) / Math.sin(-alpha);

            this.ptA2 = ptA;
            this.ptB2 = new THREE.Vector3(ptA.x + this.lengthAB, ptB.y, ptA.z);
            this.ptC2 = new THREE.Vector3(ptA.x, ptC.y, ptA.z + this.lengthAC);
        },
        
        
        // Function that colorize 3D points inside a bounding box.
        // h is the height of the box
        checkAllPointsInBB: function(ptA, ptB, ptC, ptD, alpha, h) {

            _nbLabel++;
            
            _currentClassEditing = 0;//require('GUI').getCurrentClassEditing();
            _idSurface = 0;//require('GUI').getIdFromFR("surface");
            
            this.changeRepere(ptA, ptB, ptC, ptD, alpha);
            this.nbPointsInBB = 0;
            var color2 = new THREE.Color();
            color2.setHSL(0.2, 0.5, 1.);
            // Then for all 3D points we project in the new coordinate system and check if inside polygon2 (new)
            for (var i = 0; i < _currentNbPointsInBuffer; ++i) {

                var point = new THREE.Vector3(_bufferGeometry.attributes.position.array[i * 3],
                        _bufferGeometry.attributes.position.array[i * 3 + 1],
                        _bufferGeometry.attributes.position.array[i * 3 + 2]);
                this.lengthAPoint = Math.sqrt((point.x - ptA.x) * (point.x - ptA.x) + (point.z - ptA.z) * (point.z - ptA.z));
                var beta = Math.atan2(point.z - ptA.z, point.x - ptA.x);
                this.point2 = new THREE.Vector3(ptA.x + this.lengthAPoint * Math.cos(beta - alpha), point.y, ptA.z + this.lengthAPoint * Math.sin(beta - alpha));

                var configOk = false;
                if (this.ptA2.x < this.ptB2.x) {

                    if (this.ptA2.z < this.ptC2.z) {
                        configOk = this.point2.x > this.ptA2.x && this.point2.x < this.ptB2.x && this.point2.z > this.ptA2.z && this.point2.z < this.ptC2.z;
                    }
                    else {
                        configOk = this.point2.x > this.ptA2.x && this.point2.x < this.ptB2.x && this.point2.z < this.ptA2.z && this.point2.z > this.ptC2.z;
                    }
                } else {
                    if (this.ptA2.z < this.ptC2.z) {
                        configOk = this.point2.x < this.ptA2.x && this.point2.x > this.ptB2.x && this.point2.z > this.ptA2.z && this.point2.z < this.ptC2.z;
                    }
                    else {
                        configOk = this.point2.x < this.ptA2.x && this.point2.x > this.ptB2.x && this.point2.z < this.ptA2.z && this.point2.z > this.ptC2.z;
                    }
                }

                configOk = configOk && (this.ptA2.y <= this.point2.y) && (this.ptA2.y + h >= this.point2.y);
                
                // Pass to filter ground and facade
                if(_filterFacadeAndGround){
                    var classeCurrentPoint = _bufferGeometry.attributes.classe.array[i];
                    configOk =  configOk && ( (classeCurrentPoint < _idSurface) || (classeCurrentPoint >= _idSurface + 100000000 ) );
                }

                if (configOk) {
                    this.nbPointsInBB++;
                    _bufferGeometry.attributes.color.array[i * 3] = color2.r;
                    _bufferGeometry.attributes.color.array[i * 3 + 1] = color2.g;
                    _bufferGeometry.attributes.color.array[i * 3 + 2] = color2.b;
                    _bufferGeometry.attributes.uniqueid.array[i] = _nbLabel;
                    _bufferGeometry.attributes.classe.array[i] = _currentClassEditing;
                    // New stuff to move directly the points ******************************************

                    /*
                     _particleSystem.material.attributes.displacementy.value[i] =10;
                     _particleSystem.material.attributes.displacementx.value[i] =0;
                     _particleSystem.material.attributes.displacementz.value[i] =0;
                     */
                    // *****************************************************************************
                }
            }

            //_particleSystem.material.uniforms['currentidwork'].value = this.nbClassLidar;  // To move the point using the shader
            this.updateLaserAttributes();
            // *****************************************************************************
            
        },
        
        specifyClassForPointsSameID: function(mouseX, mouseY){

            var arr = new Uint8Array(4);//(wi * he * 4);
            //console.log(gfxEngine.getWinHeight(), mouseY,gfxEngine.getWinHeight() - mouseY );
            gfxEngine.renderToTexture(_sceneRTT, gfxEngine.getCamera(), _rtTexture, true); // Render to texture, not shown on screen with the color id
            var ctx = gfxEngine.getContext();//"experimental-webgl", {preserveDrawingBuffer: true});
            ctx.readPixels(mouseX, gfxEngine.getWinHeight() - mouseY, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, arr);    // ATTENTION sens inverse pour les Y lors du readPixels
            
            var r = arr[0];
            var g = arr[1];
            var b = arr[2];
      //      console.log(r,g, b);
            var posXYZ = new THREE.Vector3(-1, -1, -1);
            if (!(r === 255 && g === 255 && b === 255)) {
                
                 var colorClicked = new THREE.Color();
                 colorClicked.setRGB(r / 255, g / 255, b / 255);
                 var hex = colorClicked.getHex();
                
                 var pos = new THREE.Vector3(0, 0, 0);
                 var indice = hex ;//* 3;
                 
                 // Search all points with same id that indice
                 var idObjectUnderPoint = _bufferGeometry.attributes.uniqueid.array[indice];
                 console.log("id of object selected: ",idObjectUnderPoint);
                 for (var i = 0; i < _currentNbPointsInBuffer; ++i) {

                    if (_bufferGeometry.attributes.uniqueid.array[i] == idObjectUnderPoint){
                           _bufferGeometry.attributes.classe.array[i] = _currentClassEditing;
                           this.colorizePointAtPos(i,new THREE.Vector3(1,1,1));
                    }

                 } 
           }

        },
        
        setFilterSurface: function(filterBool){
            _filterFacadeAndGround = filterBool;
            console.log(filterBool);
        },

        // Cartography conversion
        convert: function(x1, y1) {

            var p1 = Cartography.convertCoord({x: x1, y: y1}, "EPSG:27561", "EPSG:2154");
            //var currentPosGeom = new OpenLayers.Geometry.Point(_currentPos.easting, _currentPos.northing);                    
            // converting from lambert93 to viewer srs
            //currentPosGeom = currentPosGeom.transform(new OpenLayers.Projection("EPSG:2154"), _viewer.getMap().getProjectionObject());
            //console.log(p1.x,p1.y);
        },
        
        pairWiseRegistration: function() {
            //+69  + 31  + 301
            var x, y, z, ity;
            for (var i = 0; i < _currentNbPointsInBuffer; ++i) {

                if (_bufferGeometry.attributes.uniqueid.array[i] == _nbClassLidar - 1) {

                    _bufferGeometry.attributes.position.array[i * 3] = _bufferGeometry.attributes.position.array[i * 3] + 69
                    _bufferGeometry.attributes.position.array[i * 3 + 1] = _bufferGeometry.attributes.position.array[i * 3 + 1] + 41;
                    _bufferGeometry.attributes.position.array[i * 3 + 2] = _bufferGeometry.attributes.position.array[i * 3 + 2] + 301;
                    /*      
                     _bufferGeometry.attributes.displacement.array[i*3] = -69
                     _bufferGeometry.attributes.displacement.array[i*3+1] =  -41;
                     _bufferGeometry.attributes.displacement.array[i*3+2] =  -301;
                     */
                }
            }
            _shaderUniforms.currentidwork.value = _nbClassLidar - 1;
            LaserCloud.setReverseMotion
            _bufferGeometry.attributes.displacement.needsUpdate = true;
            this.updateLaserAttributes();

        },
        
        
        getZero: function() {
            return _zero;
        },
        
        getNotLoaded: function(){
            return _notLoaded;
        },
        
        
        getNbClassLidar: function() {
            return _nbClassLidar;
        },
        
        
        getShaderMat: function(){
              return _shaderMatLaserCloud;  
        },


        getGeometryVertices: function(){
            return _bufferGeometry;
        },     
        
       savePointInputs: function(pt1) {
            $.post("php/postUserInputs.php",
                    {
                        inputType: 1,
                        p1: [pt1.x, pt1.y, pt1.z]
                    },
            function(resultMsg) {
                console.log("Storing operation : " + resultMsg);
            });
        },
        
        saveLineInputs: function(pt1, pt2) {
            $.post("php/postUserInputs.php",
                    {
                        inputType: 2,
                        p1: [pt1.x, pt1.y, pt1.z],
                        p2: [pt2.x, pt2.y, pt2.z]
                    },
            function(resultMsg) {
                console.log("Storing operation : " + resultMsg);
            });
        },
                     
        saveBBInputs: function(pt1, pt2, pt3, pt4, height) {
            $.post("php/postUserInputs.php",
                    {
                        inputType: 3,
                        p1: [pt1.x, pt1.y, pt1.z],
                        p2: [pt2.x, pt2.y, pt2.z],
                        p3: [pt3.x, pt3.y, pt3.z],
                        p4: [pt4.x, pt4.y, pt4.z],
                        h: height
                    },
                    function(resultMsg) {
                        console.log("Storing operation : " + resultMsg);
                    });
        },
        
        setAnnotationOnOff: function(b){
          
            console.log('setAnnotationOnOff');
            this.annotationOn = b;
        },
        
        getAnnotationOnOff: function(){
          
            return this.annotationOn;
        },
   
        setComputeNormalOn : function(e){
                this.computeNormalOn    = e;
        },
       
        IsComputeNormalOn : function(){
             return this.computeNormalOn;
        },
        
        getLocalMode : function(){
            return _localMode;
        },
        
        setLocalMode: function(value){
            _localMode = value;
        },
        
        setFilename: function(name){
            _filename = name;
        },
        
        // Print message on screen(text) remove it depending on value
        setMessageDisplay: function(text,value){
            
           if(value){ 
                console.log('loading');
                var element = document.createElement("div");
                element.innerHTML = '<font style="font-family: Impact; font-size:20vw; position:absolute; top:50%; left: 35%; margin-top: -10vw; margin-left: -10vw; color:white"> LOADING </font>';
                element.id="loading";

                var div = document.getElementById("dynamicInput");
                div.appendChild(element);
           }else{
               $('#loading').remove();
           }

           
        }
        
        

    };

    return LaserCloud;
});


  
