		/**
		* 
		* @author AD IGN
		* Class generating shaders for projective texturing of MULTIPLE IMAGES in a single shader. This class can be used 
		* to texture any mesh. We need to set the matrix of Orientation of the projector
		* and its projective camera information.
		*/

		define (['GraphicEngine','lib/three','Ori','Shader', 'PanoramicProvider','url'],
			function (graphicEngine, THREE, Ori, Shader, PanoramicProvider,url) {

				window.requestAnimSelectionAlpha = (function(){
                         return  window.requestAnimationFrame || 
                         window.webkitRequestAnimationFrame   || 
                         window.mozRequestAnimationFrame      || 
                         window.oRequestAnimationFrame        || 
                         window.msRequestAnimationFrame       || 
                         function(callback, element){
                             window.setTimeout(callback, 1000 / 60);
                         };
               })();

				var _shaderMat = null;
				var _initiated = false;
				var _targetNbPanoramics;

				var ProjectiveTexturing = {
					
					init: function(targetNbPanoramics){
						_targetNbPanoramics = targetNbPanoramics || 2;
						_initiated = true;
					},
					
					isInitiated: function(){
						return _initiated;
					},	
					
					// display all the images of the panoramics
					nbImages: function(){
						return Ori.sensors.length;
					},
					
					// throttle down the number of panoramics to meet the gl.MAX_* constraints
					nbPanoramics: function(){ 
						var N = this.nbImages();
						var gl = graphicEngine.getRenderer().getContext();
						var maxVaryingVec = gl.getParameter(gl.MAX_VARYING_VECTORS);
						var maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
						var maxNbPanoramics = Math.floor(Math.min(maxVaryingVec,Math.floor(maxTextureImageUnits/2))/N);
						var P = Math.min(_targetNbPanoramics,maxNbPanoramics);
						console.log("Images per panoramic  : ", N ,"/",N);
						console.log("Panoramics displayed : ", P ,"/",_targetNbPanoramics);
						console.log("Varying usage : ", (N*P) ,"/",maxVaryingVec);
						console.log("Texture units usage : ", (2*N*P) ,"/",maxTextureImageUnits);
						return P;
					},
					
					createShaderMat: function(panoInfo,rot){  
						var N = this.nbImages();
						var P = this.nbPanoramics();
						var uniforms = {}
						var baseUrl = PanoramicProvider.getMetaDataSensorURL();
						for (var i=0; i<N; ++i){
							var j = i+N;
							var panoUrl = panoInfo.url_format.replace("{cam_id_pos}",Ori.sensors[i].infos.cam_id_pos);
							var tex = url.resolve(baseUrl,panoUrl);
							var mat = Ori.getMatrix(i).clone();
							var mvpp = (new THREE.Matrix3().multiplyMatrices(rot,mat)).transpose();
							var trans = Ori.getSommet(i).clone().applyMatrix3(rot);
							for(var pano=0; pano<P; ++pano) {
								var j = i+N*pano;
								uniforms['distortion['+j+']'] = {type:'v4',value:Ori.getDistortion(i)};
								uniforms['pps['+j+']'] = {type:'v2',value:Ori.getPPS(i)};
								uniforms['size['+j+']'] = {type:'v2',value:Ori.getSize(i)};
								uniforms['mask['+j+']'] = {type:'t' ,value:Ori.getMask(i)};
								uniforms['alpha['+j+']'] = {type:'f' ,value:1-pano};
								uniforms['mvpp['+j+']'] = {type:'m3',value:mvpp};
								uniforms['translation['+j+']'] = {type:'v3',value:trans};
								uniforms['texture['+j+']'] = {type:'t' ,value:THREE.ImageUtils.loadTexture(tex)  };
							}
						}
            			// create the shader material for Three
            			_shaderMat = new THREE.ShaderMaterial({
            				uniforms:     	uniforms,
            				vertexShader:   Shader.shaderTextureProjectiveVS(P*N),
            				fragmentShader: Shader.shaderTextureProjectiveFS(P*N),
            				side: THREE.BackSide,   
            				transparent:true
            			});
            			return _shaderMat;
            		},
					tweenIndiceTime: function (i){
            			var alpha = _shaderMat.uniforms['alpha['+i+']'].value;
            			if(alpha<1){
	            			var j = i + this.nbImages();
                			alpha += 0.03;
                			if(alpha>1) alpha=1;
                			_shaderMat.uniforms['alpha['+i+']'].value = alpha;
                			_shaderMat.uniforms['alpha['+j+']'].value = 1-alpha;
                			var that = this;
                			requestAnimSelectionAlpha(function() { that.tweenIndiceTime(i); });                			
           	 			}	
					},
            		changePanoTextureAfterloading: function (panoInfo,translation,rotation){
            			for (var i=0; i< Ori.sensors.length; ++i){            			
            				this.chargeOneImageCam(panoInfo,translation,rotation,i);
            			}
            		},
	         		// Load an Image(html) then use it as a texture. Wait loading before passing to the shader to avoid black effect
	         		chargeOneImageCam: function (panoInfo,translation,rotation,i){
	         			// move from bis to main pano
	            		// Load the new image
	            		var img = new Image(); 
	            		img.crossOrigin = 'anonymous';
	            		var that = this;
	            		img.onload = function () { 	
							var mat = Ori.getMatrix(i).clone();
							var mvpp = (new THREE.Matrix3().multiplyMatrices( rotation,mat )).transpose();
	            			var trans = Ori.getSommet(i).clone().applyMatrix3(rotation);
	            			var j = i + that.nbImages();
	            			if(_shaderMat.uniforms['mvpp['+j+']']) {
								_shaderMat.uniforms['mvpp['+j+']'].value = _shaderMat.uniforms['mvpp['+i+']'].value;
								_shaderMat.uniforms['translation['+j+']'].value = _shaderMat.uniforms['translation['+i+']'].value;
								_shaderMat.uniforms['texture['+j+']'].value =_shaderMat.uniforms['texture['+i+']'].value;
								_shaderMat.uniforms['alpha['+j+']'].value = 1;
								_shaderMat.uniforms['alpha['+i+']' ].value = 0;
								that.tweenIndiceTime(i);
							}

	            			_shaderMat.uniforms['mvpp['+i+']'].value = mvpp;
	            			_shaderMat.uniforms['translation['+i+']'].value = translation.clone().add(trans);
	            			_shaderMat.uniforms['texture['+i+']'].value = new THREE.Texture(this,THREE.UVMapping, 
	            				THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter,THREE.LinearFilter,THREE.RGBFormat);
	            			_shaderMat.uniforms['texture['+i+']'].value.needsUpdate = true;

						}; 
						var baseUrl = PanoramicProvider.getMetaDataSensorURL();
						var panoUrl = panoInfo.url_format.replace("{cam_id_pos}",Ori.sensors[i].infos.cam_id_pos);
	            		img.src = url.resolve(baseUrl,panoUrl); 
	            	}
	            }
	            return ProjectiveTexturing
	        }
	        )
