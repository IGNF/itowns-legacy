
/**
 * Creates a module to handle weather effects
 * @author alexandre devaux IGN
 * @class Manages laser data
 * @require THREE.JS
 */
define(['jquery', 'GraphicEngine', 'three', 'Shader', 'Utils'],
    function($, gfxEngine, THREE, Shader, Utils) {
        
                
        
    var _shaderAttributes = null,
        _shaderUniforms = null,
        _indice_time = 0,
        _nbPointsBuffer = 10000,
        _nbPointsForCloud = 4000,
        _bufferGeometry = null,
        _bufferGeometryCloud,
        _shaderMat = null,
        _shaderMatCloud = null,
        _particleSystem = null,
        _particleSystemCloud = null,
        _effectNum = 0,
        _effectIntensity = 0,
        _time_step = 0.1,
        _farFog = 100;


    window.requestAnimFrameW = (function() {
        return  window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback, element) {
                    window.setTimeout(callback, 1000 / 60);
                };
    })();





    var WeatherEffects = {
        
        initiated: false,
        
        init: function() {
            
            this.initializeBufferGeometry();
            this.initiated = true;
            this.animateTime();
            this.setClimate(90);
        },
        
        addToScene: function(){
            
            gfxEngine.addToScene(_particleSystem);
            gfxEngine.addToScene(_particleSystemCloud);
            
        },
        
        removeFromScene: function(){
            
            gfxEngine.removeFromScene(_particleSystem);
            gfxEngine.removeFromScene(_particleSystemCloud);
        },
        
        animateTime: function(){

           _indice_time += _time_step;
           _particleSystem.material.uniforms['indice_time'].value = _indice_time;
           _particleSystemCloud.material.uniforms['indice_time'].value = _indice_time;
           
           gfxEngine.setTimeEffect(_indice_time);
           
           requestAnimFrameW(WeatherEffects.animateTime);     
        },
       
        initializeBufferGeometry: function() {

            this.createShader();
            this.createShaderCloud();

            _bufferGeometry = new THREE.BufferGeometry();
            _bufferGeometry.dynamic = true;
            
            _bufferGeometryCloud = new THREE.BufferGeometry();
            _bufferGeometryCloud.dynamic = true;

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
                size: {
                    itemSize: 1,
                    array: new Float32Array(_nbPointsBuffer ),
                    numItems: _nbPointsBuffer,
                    dynamic: false
                } 
            };
            
            
            _bufferGeometryCloud.attributes = {
                
                position: {
                    itemSize: 3,
                    array: new Float32Array(_nbPointsForCloud * 3), // ! not float64 to gpu
                    numItems: _nbPointsForCloud * 3,
                    dynamic: true
                },
                color: {
                    itemSize: 3,
                    array: new Float32Array(_nbPointsForCloud * 3),
                    numItems: _nbPointsForCloud * 3,
                    dynamic: true
                },
                displacement: {
                    itemSize: 3,
                    array: new Float32Array(_nbPointsForCloud * 3),
                    numItems: _nbPointsForCloud * 3,
                    dynamic: true
                }, 
                size: {
                    itemSize: 1,
                    array: new Float32Array(_nbPointsForCloud ),
                    numItems: _nbPointsForCloud,
                    dynamic: false
                } 
            };
       
            this.initializeBufferValues();
            this.initializeBufferValuesCloud();

            _particleSystem = new THREE.ParticleSystem(_bufferGeometry, _shaderMat);
            _particleSystemCloud = new THREE.ParticleSystem(_bufferGeometryCloud, _shaderMatCloud);
            
        },
        
        createShader: function() {

            _shaderAttributes = {
                displacement: {type: 'v3', value: []},
                color: {type: 'v3', value: []},
                size: {type: 'f', value: []}
            };

            _shaderUniforms = {
                indice_time: {type: 'f', value: _indice_time},
                point_size: {type: 'f', value: 1},
                alpha: {type: 'f', value: 0.7},
                textureSnow: {type: 't',
                   value: THREE.ImageUtils.loadTexture("images/textures/snowflake.png")//smoke_particle.png")  
                },
                textureDrop: {type: 't',
                   value: THREE.ImageUtils.loadTexture("images/textures/raindrop2flip.png")//smoke_particle.png")  
                },
                textureCloud: {type: 't',
                   value: THREE.ImageUtils.loadTexture("images/textures/smoke_particle.png")//smoke_particle.png")  
                },
                effectNum: {type: 'i', value:_effectNum},
                effectIntensity: {type: 'f', value:_effectIntensity},
                farFog: {type: 'f', value:_farFog}
            };

            // create the shader material for the laser particle system
            // !!!!!  VERY IMPORTANT  Depthest : false to have a nice opacity in every direction
            // For BufferGeometry now we need to set everything here. Like transparent 
            _shaderMat = new THREE.ShaderMaterial({
                uniforms: _shaderUniforms,
                attributes: _shaderAttributes,
                vertexShader: Shader.shaders['shaderWeather.vs'],
                fragmentShader: Shader.shaders['shaderWeather.fs'],
                vertexColors: THREE.VertexColors,
                depthTest: false,
                transparent: true
            });

        },
        
        createShaderCloud: function() {

            _shaderAttributes = {
                displacement: {type: 'v3', value: []},
                color: {type: 'v3', value: []},
                size: {type: 'f', value: []}
            };

            _shaderUniforms = {
                indice_time: {type: 'f', value: _indice_time},
                point_size: {type: 'f', value: 1},
                alpha: {type: 'f', value: 0.7},
                textureSnow: {type: 't',
                   value: THREE.ImageUtils.loadTexture("images/textures/snowflake.png")//smoke_particle.png")  
                },
                textureDrop: {type: 't',
                   value: THREE.ImageUtils.loadTexture("images/textures/raindrop2flip.png")//smoke_particle.png")  
                },
                textureCloud: {type: 't',
                   value: THREE.ImageUtils.loadTexture("images/textures/smoke_particle.png")//smoke_particle.png")  
                },
                effectNum: {type: 'i', value:5},
                effectIntensity: {type: 'f', value:_effectIntensity},
                farFog: {type: 'f', value:_farFog}
            };

            // create the shader material for the laser particle system
            // !!!!! DepthTest to true so clouds stay behind building and depthwrite to false
            // For BufferGeometry now we need to set everything here. Like transparent 
            _shaderMatCloud = new THREE.ShaderMaterial({
                uniforms: _shaderUniforms,
                attributes: _shaderAttributes,
                vertexShader: Shader.shaders['shaderWeather.vs'],
                fragmentShader: Shader.shaders['shaderWeather.fs'],
                vertexColors: THREE.VertexColors,
                depthTest:true,
                depthWrite:false,
                transparent: true
                //blending: THREE.AdditiveBlending
            });
            // _shaderMatCloud.blending = blending: THREE.AdditiveBlending
            //_shaderMatCloud.alphaTest = 0.5;

        },
        
        initializeBufferValues: function() {
            
            var positions = _bufferGeometry.attributes.position.array;
            var values_color = _bufferGeometry.attributes.color.array;
            var displacements = _bufferGeometry.attributes.displacement.array;
            var size = _bufferGeometry.attributes.size.array;

            var color2 = new THREE.Color();
            color2.setHSL(0.2, 0.5, 0.7);
            // we set default properties: position, color, displacement
            var radius = 100;

            for (n = 0; n < _nbPointsBuffer; ++n) {

                positions[ n * 3 + 0 ] = (Math.random() * 2 - 1) * radius - radius/2;  // Camera far: 10000
                positions[ n * 3 + 1 ] =  Math.random()  * radius*3;  // so out of frustum
                positions[ n * 3 + 2 ] = (Math.random() * 2 - 1) * radius - radius/2;

                displacements[ n * 3 + 0 ] = (Math.random() * 2 - 1) * radius;
                displacements[ n * 3 + 1 ] = -Math.random() * radius * 3;
                displacements[ n * 3 + 2 ] = (Math.random() * 2 - 1) * radius;

                values_color[ n * 3 + 0 ] = color2.r;
                values_color[ n * 3 + 1 ] = color2.g;
                values_color[ n * 3 + 2 ] = color2.b;
                
                size[n*3] = Math.random() * 10;

            }
        },
        
                
        initializeBufferValuesCloud: function() {
            
            var positions = _bufferGeometryCloud.attributes.position.array;
            var values_color = _bufferGeometryCloud.attributes.color.array;
            var displacements = _bufferGeometryCloud.attributes.displacement.array;
            var size = _bufferGeometryCloud.attributes.size.array;

            var color2 = new THREE.Color();
            color2.setHSL(0.2, 0.5, 0.7);
            // we set default properties: position, color, displacement
            var radius = 50;

            for (n = 0; n < _nbPointsBuffer; ++n) {

                positions[ n * 3 + 0 ] = (Math.random() * 2 - 1) * radius ;  // Camera far: 10000
                positions[ n * 3 + 1 ] = 30 + Math.random()  * radius/2;  // so out of frustum
                positions[ n * 3 + 2 ] = (Math.random() * 2 - 1) * radius ;

                displacements[ n * 3 + 0 ] = (Math.random() * 2 - 1) * radius;
                displacements[ n * 3 + 1 ] =  (Math.random() * 2 - 1) * radius;
                displacements[ n * 3 + 2 ] = (Math.random() * 2 - 1) * radius;

                values_color[ n * 3 + 0 ] = color2.r;
                values_color[ n * 3 + 1 ] = color2.g;
                values_color[ n * 3 + 2 ] = color2.b;
                
                size[n*3] = Math.random() * 10;

            }
        },
      
      
        changeEffect:function(effectNum){
            
            _effectNum = (effectNum || _effectNum +1) % 2 ;
            _particleSystem.material.uniforms['effectNum'].value = _effectNum;

        },
        
        // @param value from 0 to 100, 0 is nice weather, 100 is for storm
        // NO SNOWWWW
        setClimate: function(value){
            
            _effectIntensity = value;

            gfxEngine.setFarFog(2400 - _effectIntensity * 23.5);  
            gfxEngine.setIntensityEffect(_effectIntensity);
    
        },
        
        // @param value from 0 to 100, 0 is nice weather, 100 is for storm
        setClimateALLSAVEWITHSNOWANDRAIN: function(value){
            
            _effectIntensity = value;
            _particleSystem.material.uniforms['effectIntensity'].value = _effectIntensity;
            _particleSystemCloud.material.uniforms['effectIntensity'].value = _effectIntensity;
            
            //var newValue = value - 50;
            if(value<=50)
               this.setTimeStep(value/100.);
           else
               this.setTimeStep((value-50)/200);
           //this.setTimeStep(1.1 -(value/100));
            
            //gfxEngine.setFarFog(1050 - _effectIntensity * 10);
            gfxEngine.setFarFog(2400 - _effectIntensity * 23.5);  
            gfxEngine.setIntensityEffect(_effectIntensity);
            
            // SOUND
            if(Utils.snd2) Utils.snd2.volume = 1. - _effectIntensity/100.;
            if(Utils.snd2) Utils.snd.volume = _effectIntensity/100.;
            gfxEngine.setLensFlareIntensity(_effectIntensity);
            
        },
        
        setTimeStep: function(value){
            _time_step = value;
        },
        
       setEffectsClimateOn: function(b){
            
            gfxEngine.setEffectsClimateOn(b);
        },
        
        // RAIN AND SNOW WITH FOG AND SOUND
        setEffectsClimateOnSAVEWITHALLEFFECTS: function(b){
            
            
            if(!this.initiated){
               this.init();
               this.addToScene();
            }

            if(b){
                if (!this.initiated) this.init();
                this.addToScene();
                this.playRain("100431__2hear__rain-thunder-roll.mp3");
                this.playSummer("156894__ramston__spring-ambience-city-horizon-birds-light-traffic-car-01.mp3");
            }else{
                this.removeFromScene(); 
                this.stopCurrentMP3();
            }
            
            gfxEngine.setEffectsClimateOn(b);
        },
     
         // rain + thunder 100431__2hear__rain-thunder-roll
         playRain:function(mp3name){
          
            mp3name = mp3name || this.mp3Name;
            if(Utils.snd) Utils.snd.pause();    
            Utils.snd = new Audio('sounds/'+mp3name); // buffers automatically when created
            Utils.snd.loop = true;
            Utils.snd.play();
            Utils.snd.volume = 0.9;
            
         },
         
         // rain + thunder 100431__2hear__rain-thunder-roll
         playSummer:function(mp3name){
          
            mp3name = mp3name || this.mp3Name;
            if(Utils.snd2) Utils.snd2.pause();    
            Utils.snd2 = new Audio('sounds/'+mp3name); // buffers automatically when created
            Utils.snd2.loop = true;
            Utils.snd2.play();
            Utils.snd2.volume = 0.1;
         },
         
         
         stopCurrentMP3: function(){
            if(Utils.snd)  Utils.snd.pause();
            if(Utils.snd2) Utils.snd2.pause();
         }
      
        
        
    };
    
    return WeatherEffects;
            
    }
            
);
