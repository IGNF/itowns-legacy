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

				var ProjectiveTexturing = {

					init: function(){
						_initiated = true;
					},
					isInitiated: function(){
						return _initiated;
					},
					createShaderMat: function(panoInfo,rot){
						var uniforms = {}
						var baseUrl = PanoramicProvider.getMetaDataSensorURL();
						for (var i=0; i< Ori.sensors.length; ++i){
							var panoUrl = panoInfo.url_format.replace("{cam_id_pos}",Ori.sensors[i].infos.cam_id_pos);
							var tex = url.resolve(baseUrl,panoUrl);
							var mat = Ori.getMatrix(i).clone();
							var mvpp = (new THREE.Matrix3().multiplyMatrices(rot,mat)).transpose();
							var trans = Ori.getSommet(i).clone().applyMatrix3(rot);
							uniforms['distortion' +i] = {type:'v4',value:Ori.getDistortion(i)};
							uniforms['pps'        +i] = {type:'v2',value:Ori.getPPS(i)};
							uniforms['size'       +i] = {type:'v2',value:Ori.getSize(i)};
							uniforms['mask'       +i] = {type:'t' ,value:Ori.getMask(i)};
							uniforms['alpha'+i      ] = {type:'f' ,value:0};
							uniforms['alpha'+i+'bis'] = {type:'f' ,value:1};
							uniforms['mvpp'+i       ] = {type:'m3',value:mvpp};
							uniforms['mvpp'+i+'bis' ] = {type:'m3',value:mvpp};
							uniforms['translation'+i      ] = {type:'v3',value:trans};
							uniforms['translation'+i+'bis'] = {type:'v3',value:trans};
							uniforms['texture'+i          ] = {type:'t' ,value:THREE.ImageUtils.loadTexture(tex)  };
							uniforms['texture'+i+'bis'    ] = {type:'t' ,value:THREE.ImageUtils.loadTexture(tex)  };
						}
            			// create the shader material for Three
            			_shaderMat = new THREE.ShaderMaterial({
            				uniforms:     	uniforms,
            				vertexShader:   Shader.shaderTextureProjective2VS.join("\n"),
            				fragmentShader: Shader.shaderTextureProjective2FS.join("\n"),
            				side: THREE.BackSide,   
            				transparent:true
            			});
            			return _shaderMat;
            		},
					tweenIndiceTime: function (num){
            			var i = _shaderMat.uniforms['alpha'+num].value;
            			if(i>0){
                			i -= 0.03;
                			if(i<0) i=0;
                			_shaderMat.uniforms['alpha'+num].value = i;
                			_shaderMat.uniforms['alpha'+num+'bis'].value = 1-i;
                			var that = this;
                			requestAnimSelectionAlpha(function() { that.tweenIndiceTime(num); });                			
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
							_shaderMat.uniforms['mvpp'+i].value = _shaderMat.uniforms['mvpp'+i+'bis'].value;
							_shaderMat.uniforms['translation'+i].value = _shaderMat.uniforms['translation'+i+'bis'].value;
							_shaderMat.uniforms['texture'+i].value =_shaderMat.uniforms['texture'+i+'bis'].value;

	            			_shaderMat.uniforms['mvpp'+i+'bis'].value = mvpp;
	            			_shaderMat.uniforms['translation'+i+'bis'].value = translation.clone().add(trans);
	            			_shaderMat.uniforms['texture'+i+'bis'].value = new THREE.Texture(this,THREE.UVMapping, 
	            				THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter,THREE.LinearFilter,THREE.RGBFormat);
	            			_shaderMat.uniforms['texture'+i+'bis'].value.needsUpdate = true;

	            			_shaderMat.uniforms['alpha'+i].value = 1;			
	            			_shaderMat.uniforms['alpha'+i+'bis'].value = 0;			
            				that.tweenIndiceTime(i);
						}; 
						var baseUrl = PanoramicProvider.getMetaDataSensorURL();
						var panoUrl = panoInfo.url_format.replace("{cam_id_pos}",Ori.sensors[i].infos.cam_id_pos);
	            		img.src = url.resolve(baseUrl,panoUrl); 
	            	}
	            }
	            return ProjectiveTexturing
	        }
	        )
