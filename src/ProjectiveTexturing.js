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
			var _shaderMat = null;
			var _initiated = false;

			var ProjectiveTexturing = {

			init: function(){
				_localImageFiles = PanoramicProvider.getImageLocal();
				//_mobileVersion = graphicEngine.isMobileEnvironment() ? 1:0;
				//this.initImages();
				//this.initMatrices();
				//this.initTranslations();
				_initiated = true;
			},
		    isInitiated: function(){
            return _initiated;
        	},
		    createShaderMat: function(){
		    	var uniforms5 = {
		    		mvpp0:{type: 'm4',value: Ori.sensors[0].rotation},
                    mvpp1:{type: 'm4',value: Ori.sensors[1].rotation},
                    mvpp2:{type: 'm4',value: Ori.sensors[2].rotation},
                    mvpp3:{type: 'm4',value: Ori.sensors[3].rotation},
                    mvpp4:{type: 'm4',value: Ori.sensors[4].rotation},
                    translation0:{type:"v4",value: Ori.sensors[0].position},
                    translation1:{type:"v4",value: Ori.sensors[1].position},
                    translation2:{type:"v4",value: Ori.sensors[2].position},
                    translation3:{type:"v4",value: Ori.sensors[3].position},
                    translation4:{type:"v4",value: Ori.sensors[4].position},
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
            changePanoTextureAfterloading: function (panoInfo,rotation){
            		this.chargeOneImageCam(panoInfo,'texture0',Ori.sensors[0]);
            		this.chargeOneImageCam(panoInfo,'texture1',Ori.sensors[1]);
            		this.chargeOneImageCam(panoInfo,'texture2',Ori.sensors[2]);
            		this.chargeOneImageCam(panoInfo,'texture3',Ori.sensors[3]);
            		this.chargeOneImageCam(panoInfo,'texture4',Ori.sensors[4]);
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
	            console.log("info:",panoInfo);
	            console.log("sensor:",sensor);
	            img.src = panoInfo.url_format.replace("{cam_id_pos}",sensor.infos.cam_id_pos); 
	            console.log('url : ',img.src);
	        }
	    }
	        return ProjectiveTexturing
	    }
	)
