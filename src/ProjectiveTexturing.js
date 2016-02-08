		/**
		* 
		* @author AD IGN
		* Class generating shaders for projective texturing of MULTIPLE IMAGES in a single shader. This class can be used 
		* to texture any mesh. We need to set the matrix of Orientation of the projector
		* and its projective camera information.
		*/

		define (['GraphicEngine','lib/three','Ori','Shader', 'PanoramicProvider'],
			function (graphicEngine, THREE, Ori, Shader, PanoramicProvider) {

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
						_localImageFiles = PanoramicProvider.getImageLocal();
						_initiated = true;
					},
					isInitiated: function(){
						return _initiated;
					},
					createShaderMat: function(panoInfo,rot){
						var indice_time = 0;
						var uniforms = {};
						for (var i=0; i< Ori.sensors.length; ++i){    
							var mat = new THREE.Matrix4().multiplyMatrices(Ori.getMatCam(i),Ori.getProjCam(i));
							var trans = Ori.getSommet(i).clone().applyProjection( rot); trans.w = 1;
							uniforms['indice_time'+i]={type:'f',value: indice_time};
							uniforms['distortion'+i]={type:"v4",value:Ori.getDistortion(i)};
							uniforms['pps'+i]={type:"v2",value:Ori.getPPS(i)};
							uniforms['size'+i]={type:"v2",value:Ori.getSize(i)};
							uniforms['mvpp'+i]={type: 'm4',value: (new THREE.Matrix4().multiplyMatrices( rot,mat.clone() )).transpose()};
							uniforms['translation'+i]={type:"v4",value: trans};
							uniforms['texture'+i]={type: 't',value: THREE.ImageUtils.loadTexture(panoInfo.url_format.replace("{cam_id_pos}",Ori.sensors[i].infos.cam_id_pos))};
							uniforms['mvpp'+i+'bis']={type: 'm4',value: (new THREE.Matrix4().multiplyMatrices( rot,mat.clone() )).transpose()};
							uniforms['translation'+i+'bis']={type:"v4",value: trans};
							uniforms['texture'+i+'bis']={type: 't',value: THREE.ImageUtils.loadTexture(panoInfo.url_format.replace("{cam_id_pos}",Ori.sensors[i].infos.cam_id_pos))};
							uniforms['textureMask'+i]={type: 't',value: Ori.getMask(i)};							
						}
						// create the shader material for Three
            			_shaderMat = new THREE.ShaderMaterial({
            					uniforms:     	uniforms,
            					vertexShader: Shader.createSimpleProjectiveVS(Ori.sensors.length).join("\n"),
            					fragmentShader: Shader.createSimpleProjectiveFS(Ori.sensors.length).join("\n"),
            					side: THREE.BackSide,   
            					transparent:true
            			});						
            			return _shaderMat;
            		},
					tweenIndiceTime: function (num){
            			var i = _shaderMat.uniforms['indice_time'+num].value;
            			if(i>0){
                			i -= 0.03;
                			if(i<0) i=0;
                			_shaderMat.uniforms['indice_time'+num].value = i;
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
	            		var url = panoInfo.url_format.replace("{cam_id_pos}",Ori.sensors[i].infos.cam_id_pos);
	            		img.onload = function () { 	
	            			var mat = new THREE.Matrix4().multiplyMatrices(Ori.getMatCam(i),Ori.getProjCam(i));
	            			var trans = Ori.getSommet(i).clone().applyProjection( rotation); trans.w = 1;	
                			_shaderMat.uniforms['mvpp'+i].value = _shaderMat.uniforms['mvpp'+i+'bis'].value;
                			_shaderMat.uniforms['translation'+i].value = _shaderMat.uniforms['translation'+i+'bis'].value;
                			_shaderMat.uniforms['texture'+i].value =_shaderMat.uniforms['texture'+i+'bis'].value;

	            			_shaderMat.uniforms['mvpp'+i+'bis'].value = (new THREE.Matrix4().multiplyMatrices( rotation,mat.clone() )).transpose();
	            			_shaderMat.uniforms['translation'+i+'bis'].value = translation.clone().add(trans);
	            			_shaderMat.uniforms['texture'+i+'bis'].value = new THREE.Texture(this,THREE.UVMapping, 
	            				THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter,THREE.LinearFilter,THREE.RGBFormat);
	            			_shaderMat.uniforms['texture'+i+'bis'].value.needsUpdate = true;

	            			_shaderMat.uniforms['indice_time'+i].value = 1;			
            				that.tweenIndiceTime(i);
            			}; 
	            		img.src = url; 
	            	}
	            }
	            return ProjectiveTexturing
	        }
	        )
