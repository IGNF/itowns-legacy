		/**
		* 
		* @author AD IGN
		* Class generating shaders for projective texturing of MULTIPLE IMAGES in a single shader. This class can be used 
		* to texture any mesh. We need to set the matrix of Orientation of the projector
		* and its projective camera information.
		*/

		define (['GraphicEngine','lib/three','Ori','Shader', 'PanoramicProvider'],
			function (graphicEngine, THREE, Ori, Shader, PanoramicProvider) {

			var _mobileVersion = false;
			// True: use local files / False: use iipimages
			var _localImageFiles = true;
			var _sensors;
			var _shaderMat = null;
			var _initiated = false;



			var ProjectiveTexturing = {

			init: function(){
				_localImageFiles = PanoramicProvider.getImageLocal();
				//_mobileVersion = graphicEngine.isMobileEnvironment() ? 1:0;
				this.initSensorMetaData();
				//this.initImages();
				//this.initMatrices();
				//this.initTranslations();
				_initiated = true;
			},
			loadSensorData:function(){
		         	// Local mode and not yet loaded
		            // parse the local JSON file
		            var requestURL = PanoramicProvider.getMetaDataSensorURL();
		            return new Promise(function(resolve, reject) {
		            	var req = new XMLHttpRequest();
		            	req.open('GET', requestURL);
		            	req.onload = function() {
		            		if (req.status === 200) {
		            			sensorMetaData = JSON.parse(req.response);
		            			resolve(sensorMetaData);
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
		        },
		    // Get Orientation matrices for camera, relatif
		    // all cam in the same local ref
		    initSensorMetaData: function(){
		    	this.loadSensorData().then(
		    		function(result){
		    			var sensorMetaData = result;
		    			_sensors = [];
		    			for (var i=0; i< sensorMetaData.length; ++i){
		    				_sensors.push(new Sensor(sensorMetaData[i]));
		    			}
		    		} );
		    },
		    isInitiated: function(){
            return _initiated;
        	},
		    createShaderMat: function(){
		    	var uniforms5 = {
		    		mvpp0:{type: 'm4',value: undefined},
                    mvpp1:{type: 'm4',value: undefined},
                    mvpp2:{type: 'm4',value: undefined},
                    mvpp3:{type: 'm4',value: undefined},
                    mvpp4:{type: 'm4',value: undefined},
                    translation0:{type:"v4",value: undefined},
                    translation1:{type:"v4",value: undefined},
                    translation2:{type:"v4",value: undefined},
                    translation3:{type:"v4",value: undefined},
                    translation4:{type:"v4",value: undefined},
		    		texture0: {type: 't',value: undefined},
		    		texture1: {type: 't',value: undefined},
		    		texture2: {type: 't',value: undefined},
		    		texture3: {type: 't',value: undefined},
		    		texture4: {type: 't',value: undefined},
		    	};
            		// create the shader material for Three
            		_shaderMat = new THREE.ShaderMaterial({
            			uniforms:     	uniforms5,
            			vertexShader:   Shader.shaderTextureProjectiveVS.join("\n"),
            			fragmentShader: Shader.shaderTextureProjectiveFS.join("\n"),
            			side: THREE.BackSide,   
            			transparent:true
            		});
            		return _shaderMat;
           	},
            changePanoTextureAfterloading: function (panoInfo){
            		chargeOneImageCam(panoInfo,'texture0',_sensors[0]);
            		chargeOneImageCam(panoInfo,'texture1',_sensors[1]);
            		chargeOneImageCam(panoInfo,'texture2',_sensors[2]);
            		chargeOneImageCam(panoInfo,'texture3',_sensors[3]);
            		chargeOneImageCam(panoInfo,'texture4',_sensors[4]);
            },
	         // Load an Image(html) then use it as a texture. Wait loading before passing to the shader to avoid black effect
	        chargeOneImageCam: function (panoInfo,nameTexture,sensor){
	            // Load the new image
	            var img = new Image(); 
	            img.crossOrigin = 'anonymous';
	            var that = this;
	            img.onload = function () { 		                
	            	_shaderMat.uniforms[nameTexture].value = new THREE.Texture(this,THREE.UVMapping, 
	            		THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter,THREE.LinearFilter,THREE.RGBFormat);
	            	_shaderMat.uniforms[nameTexture].value.needsUpdate = true;
	            }; 
	            img.src = panoInfo.url_format.replace("{cam_pos_id}",sensor.cam_pos_id); 
	        }
	    }
	        return ProjectiveTexturing
	    }
	)
