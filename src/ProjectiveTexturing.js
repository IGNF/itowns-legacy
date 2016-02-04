		/**
		* 
		* @author AD IGN
		* Class generating shaders for projective texturing of MULTIPLE IMAGES in a single shader. This class can be used 
		* to texture any mesh. We need to set the matrix of Orientation of the projector
		* and its projective camera information.
		*/

		define (['GraphicEngine','lib/three','Ori','Shader', 'PanoramicProvider'],
			function (graphicEngine, THREE, Ori, Shader, PanoramicProvider) {

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
						var tabUrl=[];
						var tabMat=[];
						var tabTrans=[];
						var tabIntr=[];
						for (var i=0; i< Ori.sensors.length; ++i){    
							tabUrl.push(panoInfo.url_format.replace("{cam_id_pos}",Ori.sensors[i].infos.cam_id_pos));
							var mat = new THREE.Matrix4().multiplyMatrices(Ori.getMatCam(i),Ori.getProjCam(i));
							tabMat.push((new THREE.Matrix4().multiplyMatrices( rot,mat.clone() )).transpose());
							var trans = Ori.getSommet(i).clone().applyProjection( rot); trans.w = 1;
							tabTrans.push(trans);
							tabIntr.push(Ori.getDistortion(i));
						}
						switch(Ori.sensors.length){
							case 5:
							var uniforms5 = {
								distortion0: {type:"v4",value:tabIntr[0]},
								distortion1: {type:"v4",value:tabIntr[1]},
								distortion2: {type:"v4",value:tabIntr[2]},
								distortion3: {type:"v4",value:tabIntr[3]},
								distortion4: {type:"v4",value:tabIntr[4]},
								mvpp0:{type: 'm4',value: tabMat[0]},
								mvpp1:{type: 'm4',value: tabMat[1]},
								mvpp2:{type: 'm4',value: tabMat[2]},
								mvpp3:{type: 'm4',value: tabMat[3]},
								mvpp4:{type: 'm4',value: tabMat[4]},
								translation0:{type:"v4",value: tabTrans[0]},
								translation1:{type:"v4",value: tabTrans[1]},
								translation2:{type:"v4",value: tabTrans[2]},
								translation3:{type:"v4",value: tabTrans[3]},
								translation4:{type:"v4",value: tabTrans[4]},
								texture0: {type: 't',value: THREE.ImageUtils.loadTexture(tabUrl[0]) },
								texture1: {type: 't',value: THREE.ImageUtils.loadTexture(tabUrl[1])},
								texture2: {type: 't',value: THREE.ImageUtils.loadTexture(tabUrl[2])},
								texture3: {type: 't',value: THREE.ImageUtils.loadTexture(tabUrl[3])},
								texture4: {type: 't',value: THREE.ImageUtils.loadTexture(tabUrl[4])},
								textureMask0: {type: 't',value: Ori.getMask(0) },
								textureMask1: {type: 't',value: Ori.getMask(1)},
								textureMask2: {type: 't',value: Ori.getMask(2)},
								textureMask3: {type: 't',value: Ori.getMask(3)},
								textureMask4: {type: 't',value: Ori.getMask(4)}
							};
            				// create the shader material for Three
            				_shaderMat = new THREE.ShaderMaterial({
            					uniforms:     	uniforms5,
            					vertexShader:   Shader.shaderTextureProjective2VS.join("\n"),
            					fragmentShader: Shader.shaderTextureProjective2FS.join("\n"),
            					side: THREE.BackSide,   
            					transparent:true
            				});
            				break;
            				default:
            			}
            			return _shaderMat;
            		},
            		changePanoTextureAfterloading: function (panoInfo,translation,rotation){
            			for (var i=0; i< 5; ++i){            			
            				this.chargeOneImageCam(panoInfo,translation,rotation,i);
            			}
            		},
	         		// Load an Image(html) then use it as a texture. Wait loading before passing to the shader to avoid black effect
	         		chargeOneImageCam: function (panoInfo,translation,rotation,i){
	            		// Load the new image
	            		var img = new Image(); 
	            		img.crossOrigin = 'anonymous';
	            		var that = this;
	            		var url = panoInfo.url_format.replace("{cam_id_pos}",Ori.sensors[i].infos.cam_id_pos);
	            		img.onload = function () { 	
	            			var mat = new THREE.Matrix4().multiplyMatrices(Ori.getMatCam(i),Ori.getProjCam(i));
	            			var trans = Ori.getSommet(i).clone().applyProjection( rotation); trans.w = 1;					
	            			_shaderMat.uniforms['mvpp'+Number(i)].value = (new THREE.Matrix4().multiplyMatrices( rotation,mat.clone() )).transpose();
	            			_shaderMat.uniforms['translation'+Number(i)].value = translation.clone().add(trans);
	            			_shaderMat.uniforms['texture'+Number(i)].value = new THREE.Texture(this,THREE.UVMapping, 
	            				THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter,THREE.LinearFilter,THREE.RGBFormat);
	            			_shaderMat.uniforms['texture'+Number(i)].value.needsUpdate = true;
	            		}; 
	            		img.src = url; 
	            	}
	            }
	            return ProjectiveTexturing
	        }
	        )
