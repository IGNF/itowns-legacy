/* 
 * To manage Bati 3D layer
 * quocdinh dot nguyen at gmail dot com
 */
define(['jquery', 'GraphicEngine', 'three', 'lib/threeExt', 'Panoramic', 'Dispatcher', 'Cartography','lib/3DSLoader', 'Shader','lib/B3DLoader','lib/DDSLoader','Draw', 'Utils', 'Config'],
    function($, gfxEngine, THREE, THREEExt, Panoramic, Dispatcher, Cartography, DS3Loader, Shader, B3DLoader, DDSLoader, Draw, Utils, Config) {
        
        
               
            //GLOBAL VARIABLE
            var _events = {
                                MOVE: function() {
                                       Cartography3D.update();
                                }
            };
            
            var _textureType = '.dds';
          
            //manage planet by quadSphere
            var quadSpherePlanet = {
                     quadMaterial : new THREE.QuadMaterialBuilder({
			
                                onCreate : function () {
                                                    // NOP
                                },

                                buildMaterialForQuad : function (centerPoint, position, radius, width) {

                                                var color = new THREE.Color();

                                                    var decimalColor = ((width/1E11) * 16777215);


                                                var R =	 decimalColor%256;
                                                var G =	 (decimalColor/256)%256;
                                                var B =	 Math.sin(width);//((decimalColor/256)/256)%256;

                                                color.r = R;
                                                color.g = G;
                                                color.b = B;

                                                return new THREE.MeshBasicMaterial({wireframe: true, color: color});

                                }
                    }),
		    quadSphere : null    
            };
            
            var dalleClasse  =  function(){
                
                    this.dataURL         = "";
                    this.name            = '';
                    this.path            = '';
                    this.pivot           = new THREE.Vector3(0,0,0);
                    this.LOBLevel        = {  level:0, 
                                              urlDS3 : '', 
                                              urlDDS : '',
                                              urlDDS16:'' 
                                           };
                    this.textureType = '.dds';  
                    this.dalleOpacity = 1.;
                    this.cachedMaterials = {   
                                                loadMaterials : true,
                                                materials     : [],
                                                textures : [],
                                                imgUrlMaterial: [],
                                                urls:  []
                                           };
                    this.geometry        =  new THREE.Geometry();                        
                    this.materialsName   = [];
                    this.mesh            = null;
                    this.globalObject = new THREE.Object3D();        
                    this.shaderMat = null;
                    this.texture1 = null;
                    this.racineFile = "";//Version4LODS";  // Version4LODS_o for jpg
            };
            
            dalleClasse.prototype.addSubMeshToDalle = function(mesh){
                    this.dalleObject.add(mesh);
            };
            dalleClasse.prototype.setDalleZeroPivot     = function(v){
                    //this is zero
                    this.pivot = v;
            };
            
            dalleClasse.prototype.setTextureType = function(t){
              
                this.textureType = t;
            };
            dalleClasse.prototype.addMaterialsName  = function(v){
                    this.materialsName.push(v);
            };
            dalleClasse.prototype.getIndexMaterialName = function(v){
                    return this.materialsName.indexOf(v);
            };
            dalleClasse.prototype.setNamePath = function(name){
                    
                    this.path = "EXPORT_" + name + "/" + "export-3DS" +"/";
                    this.name = name;
            };
            /*
            dalleClasse.prototype.setNamePath = function(name){
                    this.name = name;
                    this.path = this.name + "/" + this.name +"/";
            };
            */
            dalleClasse.prototype.isMaterialsLoaded  = function() {
                    return this.cachedMaterials.loadMaterials;
            };
            dalleClasse.prototype.setMaterialsLoaded = function(v) {
                    this.cachedMaterials.loadMaterials = v;
            }; 
            dalleClasse.prototype.addDalleMaterials = function(mat){
                    this.cachedMaterials.materials.push(mat);
            };
            dalleClasse.prototype.addTextureURL= function(url){
                    this.cachedMaterials.urls.push(url);
            };
            dalleClasse.prototype.addTextureAlex = function(texture){
                    this.cachedMaterials.textures.push(texture);
            };
            dalleClasse.prototype.mergeObject = function(object){
                    THREE.GeometryUtils.merge( this.geometry, object );
            };
            dalleClasse.prototype.mergeGeometry = function(geom){
                    this.geometry.merge(geom);
            };
            dalleClasse.prototype.checkDoubleVertices = function(){
                    this.geometry.mergeVertices(); 
            };
            dalleClasse.prototype.setLoDLevel = function(v){
                    this.LOBLevel.level = v; 
            };
            dalleClasse.prototype.getLoDLevel = function(){
                    return this.LOBLevel.level; 
            };
            dalleClasse.prototype.subdivision = function(){
                    this.checkDoubleVertices();
                    var modifier = new THREE.SubdivisionModifier(this.LOBLevel);
                    modifier.modify(this.geometry);
            };

            dalleClasse.prototype.getDalleGemetry  = function(){
                   return this.geometry;
            };            
            
            
            dalleClasse.prototype.showDalleInScene = function(){

                    /*  this.mesh = new THREE.Mesh(  this.geometry, 
                                                   new THREE.MeshFaceMaterial( 
                                                                             this.cachedMaterials.materials)
                                                 );
                   gfxEngine.addToScene(this.mesh);
                  */
              

           // Create mesh for each n material with BufferGeomtry and specific shader material 
                   var vertices = this.geometry.vertices;  // Pointeur
                   var faces = this.geometry.faces;
                   var faceVertexUvs = this.geometry.faceVertexUvs;
                   var nbMaterials = this.cachedMaterials.urls.length;
                   var nbTexturesInShader = 16;
                   
                  
                   var geom2 = new THREE.Geometry();
                   for(n=0;n<=nbMaterials;n+=nbTexturesInShader){
                       
                        //var geom2 = new THREE.Geometry();
                        geom2.vertices = this.geometry.vertices;//.slice(); 
                        //geom2.faceVertexUvs = this.geometry.faceVertexUvs.slice();
                       // var geom2 = this.geometry.clone();
                        geom2.faces = [];
                        geom2.faceVertexUvs[0] = [];
                        for ( var i = 0; i < faces.length; i ++ ) {
                            
                                var face = faces[ i ];
                                var faceUV = faceVertexUvs[0][i];
                                if (face.materialIndex >= n && face.materialIndex <n+nbTexturesInShader){
                                    geom2.faces.push(face);
                                    geom2.faceVertexUvs[0].push(faceUV);
                                }   
                        }
                        
                        
                        var bufferGeometry = THREE.BufferGeometryUtils.fromGeometry(geom2,{indice:n} );

                        var mat = this.createShaderForBati();
                        for(var a=0;a<nbTexturesInShader;++a){                            
                           if(n+a< nbMaterials) this.affectTexture(mat,n+a,a);
                        }
                        var mesh = new THREE.Mesh(bufferGeometry,mat);//this.cachedMaterials.materials[n]);
                        
                        this.globalObject.add(mesh);
                        
                        //gfxEngine.addToScene(mesh);
                   }   
                     gfxEngine.addToScene(this.globalObject);
                  /*    
                        var bufferGeometry = THREE.BufferGeometryUtils.fromGeometry(this.geometry );
                       // var mesh = new THREE.Mesh(bufferGeometry,new THREE.MeshBasicMaterial({side : THREE.DoubleSide, wireframe:true,color:0xff0000}));
                        var mesh = new THREE.Mesh(bufferGeometry,this.cachedMaterials.materials[0]);
                        gfxEngine.addToScene(mesh);
                        console.log(bufferGeometry);
                 */
            };
            
            dalleClasse.prototype.load3DS    =     function(){
                    var loader = new DS3Loader(this);
            };
            dalleClasse.prototype.affectTexture = function(shaderMat,numMaterial,numTexture){
                //console.log("aaaaaaaaa");
                 var urlTexture = this.cachedMaterials.urls[numMaterial]; //console.log(urlTexture);
                 var texture;
                 THREE.ImageUtils.crossOrigin= 'use-credentials';   // No anonymous to keep ability to access password protected files (behind dir Viewer)
                 if(this.textureType=='.dds'){
					 var loader = new THREE.DDSLoader();
                     texture = loader.load(urlTexture, function() {
                                               shaderMat.uniforms["u_textures"].value[numTexture] = texture;   // onLoad function
                                               texture.dispose();
                                           }
                                );
                   }
                else{
                    texture = THREE.ImageUtils.loadTexture(urlTexture,null,function() { "http://www.itowns.fr/images/textures/quoc.png"
                                               shaderMat.uniforms["u_textures"].value[numTexture] = texture;   // onLoad function
                                               texture.dispose();
                                           }
                                  );
                          
                    texture.generateMipmaps = true;;
                 }
                  texture.minFilter = texture.magFilter = THREE.LinearFilter;
                  texture.anisotropy = 4;
                  texture.needsUpdate = true;
                  texture.name = numMaterial;

                 // shaderMat.uniforms["u_textures"].value[numTexture] = texture ;//this.cachedMaterials.textures[numMaterial];//texture ;//this.cachedMaterials.textures[numMaterial];//this.texture1;//this.cachedMaterials.materials[0].map;//THREE.ImageUtils.loadTexture("images/itowns.png");//new THREE.Texture();//this.cachedMaterials.materials[0].map);
                 // shaderMat.uniforms["u_textures"].value[numTexture].needsUpdate = true;
                
            };
            
             pushTextureToGPU2 = function(){
                console.log('pushTextureToGPU2',this);
            };
            
            dalleClasse.prototype.pushTextureToGPU = function(texture){
                console.log('pushTextureToGPU',texture);
            };
           /*
            * works
            dalleClasse.prototype.affectTexture = function(shaderMat,numMaterial,numTexture){
                 shaderMat.uniforms["u_textures"].value[numTexture] = this.cachedMaterials.textures[numMaterial];//this.texture1;//this.cachedMaterials.materials[0].map;//THREE.ImageUtils.loadTexture("images/itowns.png");//new THREE.Texture();//this.cachedMaterials.materials[0].map);
                 shaderMat.uniforms["u_textures"].value[numTexture].needsUpdate = true;
            };
         */
                      
            dalleClasse.prototype.createShaderForBati = function(){

                var uniformsBati = {
                    alpha: {type: "f", value: this.dalleOpacity},
                    textureJPG : { type: "i" ,value: this.textureType =='.jpg'},
                    u_textures : { type: "tv", value: [ new THREE.Texture(),new THREE.Texture(),new THREE.Texture(),new THREE.Texture(),new THREE.Texture(),
                                                        new THREE.Texture(),new THREE.Texture(),new THREE.Texture(),new THREE.Texture(),new THREE.Texture(),
                                                        new THREE.Texture(),new THREE.Texture(),new THREE.Texture(),new THREE.Texture(),new THREE.Texture(),
                                                        new THREE.Texture()] }, 
                    light: {type: "v3", value:  Cartography3D.light}                            
               };
                
                              
                 // create the shader material
                var shaderMat = new THREE.ShaderMaterial({
                        uniforms:     	uniformsBati,
                        vertexShader:   Shader.shaderBati3DVS.join("\n"),//Shader.shaders['shaderBati3D.vs'],
                        fragmentShader: Shader.shaderBati3DFS.join("\n"),//Shader.shaders['shaderBati3D.fs'],
                        side: THREE.DoubleSide,
                        transparent:true
                });
                
                return shaderMat;
            };
        
            dalleClasse.prototype.emptyGeometryCache = function(){
                   //suppose garbage collector work well, we just
                   //déreference memory buffer!
                    this.geometry = new THREE.Geometry();
            };
            dalleClasse.prototype.emptyMaterialsCache = function(){
                    this.cachedMaterials.materials = [];
                    this.setMaterialsLoaded(true);
            };    
            dalleClasse.prototype.generateAmbientColor = function(ambient){
                    var ambientR = (ambient & 0xff0000) >> 16;
                    var ambientG = (ambient & 0xff00) >> 8;
                    var ambientB = ambient  & 0xff;
                    this.colorMaterial.ambient.setRGB(ambientR,ambientG,ambientB);
            };
       
            dalleClasse.prototype.generateDidduseColor = function(diffuse) {
                    var diffuseR = (diffuse & 0xff0000) >> 16;
                    var diffuseG = (diffuse & 0xff00) >> 8;
                    var diffuseB = diffuse  & 0xff;
                    this.colorMaterial.diffuse.setRGB(diffuseR, diffuseG,diffuseB);
            };
            
              
	    dalleClasse.prototype.computeUrlLoBLevel = function(){
                
                if(this.textureType=='.dds'){
		   switch(this.getLoDLevel())
		   {
			 case 0 :
                                this.LOBLevel.urlDS3    =  this.dataURL +  this.path + "ZoneAExporter.3DS";
				this.LOBLevel.urlDDS    =  this.textureType;	
				break;
			 case 2 :
				this.LOBLevel.urlDS3    =  this.dataURL +  this.path + "ZoneAExporter-0.b3d";
				this.LOBLevel.urlDDS    =  this.textureType;
                                this.LOBLevel.urlDDS16  =  '-16'+this.textureType;
				break;
			 case 4 :
                                this.LOBLevel.urlDS3    =  this.dataURL + this.path + "ZoneAExporter-1.b3d";
				this.LOBLevel.urlDDS	=  '-4'+this.textureType;
                                this.LOBLevel.urlDDS16  =  '-16'+this.textureType;
				break;									
			 case 8 :
                                this.LOBLevel.urlDS3    =  this.dataURL + this.path + "ZoneAExporter-2.b3d";
				this.LOBLevel.urlDDS	=  '-8'+this.textureType;
                                this.LOBLevel.urlDDS16  =  '-16'+this.textureType;
				break;									
			 case 16 :
				this.LOBLevel.urlDS3    =  this.dataURL + this.path + "ZoneAExporter-3.b3d"//"images/Bati3D/" + this.path + "ZoneAExporter-3.b3d"; 
				this.LOBLevel.urlDDS	=  '-16'+this.textureType;
                                this.LOBLevel.urlDDS16  =  '-16'+this.textureType;
				break;																		
			default : 
			        console.log('Cartography3D: does not support this level');
			        break;
		   }
               }else{
                    switch(this.getLoDLevel())
		   {
			 case 0 :
                                this.LOBLevel.urlDS3    =  this.dataURL +  this.path + "ZoneAExporter.3DS";
				this.LOBLevel.urlDDS    =  this.textureType;	
				break;
			 case 2 :
				this.LOBLevel.urlDS3    =  this.dataURL +  this.path + "ZoneAExporter-0.b3d";
				this.LOBLevel.urlDDS    =  this.textureType;
                                this.LOBLevel.urlDDS16  =  this.textureType;
				break;
			 case 4 :
                                this.LOBLevel.urlDS3    =  this.dataURL +  this.path + "ZoneAExporter-1.b3d";
				this.LOBLevel.urlDDS	=  this.textureType;
                                this.LOBLevel.urlDDS16  =  this.textureType;
				break;									
			 case 8 :
                                this.LOBLevel.urlDS3    =  this.dataURL +  this.path + "ZoneAExporter-2.b3d";
				this.LOBLevel.urlDDS	=  this.textureType;
                                this.LOBLevel.urlDDS16  =  this.textureType;
				break;									
			 case 16 :
				this.LOBLevel.urlDS3    =  this.dataURL +  this.path + "ZoneAExporter-3.b3d"//"images/Bati3D/" + this.path + "ZoneAExporter-3.b3d"; 
				this.LOBLevel.urlDDS	=  this.textureType;
                                this.LOBLevel.urlDDS16  =  this.textureType;
				break;																		
			default : 
			        console.log('Cartography3D: does not support this level');
			        break;
		   }
               }
                   
	    };
	    dalleClasse.prototype.computeUrlLoBLevelSAVE = function(){
                
                if(this.textureType=='.dds'){
		   switch(this.getLoDLevel())
		   {
			 case 0 :
                                this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter.3DS";
				this.LOBLevel.urlDDS    =  this.textureType;	
				break;
			 case 2 :
				this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter-0.b3d";
				this.LOBLevel.urlDDS    =  this.textureType;
                                this.LOBLevel.urlDDS16  =  '-16'+this.textureType;
				break;
			 case 4 :
                                this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter-1.b3d";
				this.LOBLevel.urlDDS	=  '-4'+this.textureType;
                                this.LOBLevel.urlDDS16  =  '-16'+this.textureType;
				break;									
			 case 8 :
                                this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter-2.b3d";
				this.LOBLevel.urlDDS	=  '-8'+this.textureType;
                                this.LOBLevel.urlDDS16  =  '-16'+this.textureType;
				break;									
			 case 16 :
				this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter-3.b3d"//"images/Bati3D/" + this.path + "ZoneAExporter-3.b3d"; 
				this.LOBLevel.urlDDS	=  '-16'+this.textureType;
                                this.LOBLevel.urlDDS16  =  '-16'+this.textureType;
				break;																		
			default : 
			        console.log('Cartography3D: does not support this level');
			        break;
		   }
               }else{
                    switch(this.getLoDLevel())
		   {
			 case 0 :
                                this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter.3DS";
				this.LOBLevel.urlDDS    =  this.textureType;	
				break;
			 case 2 :
				this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter-0.b3d";
				this.LOBLevel.urlDDS    =  this.textureType;
                                this.LOBLevel.urlDDS16  =  this.textureType;
				break;
			 case 4 :
                                this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter-1.b3d";
				this.LOBLevel.urlDDS	=  this.textureType;
                                this.LOBLevel.urlDDS16  =  this.textureType;
				break;									
			 case 8 :
                                this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter-2.b3d";
				this.LOBLevel.urlDDS	=  this.textureType;
                                this.LOBLevel.urlDDS16  =  this.textureType;
				break;									
			 case 16 :
				this.LOBLevel.urlDS3    =  "../Bati3D_LOB/Version4LODS/" + this.path + "ZoneAExporter-3.b3d"//"images/Bati3D/" + this.path + "ZoneAExporter-3.b3d"; 
				this.LOBLevel.urlDDS	=  this.textureType;
                                this.LOBLevel.urlDDS16  =  this.textureType;
				break;																		
			default : 
			        console.log('Cartography3D: does not support this level');
			        break;
		   }
               }
                   
	    };
	    dalleClasse.prototype.getUrlDSFile	 = function(){
		    return this.LOBLevel.urlDS3;
	    };
	    dalleClasse.prototype.getUrlDDSFile	 = function(){
	 	    return this.LOBLevel.urlDDS;
	    };
            
            dalleClasse.prototype.getUrlDDS16	 = function(){
                    return this.LOBLevel.urlDDS16;
	    };
            
            dalleClasse.prototype.load    =     function(){
		    this.computeUrlLoBLevel();
		    var loader = new B3DLoader(this);
            };
            dalleClasse.prototype.setVisible = function(v){
                    this.globalObject.traverse( function ( object ) { object.visible = v; } );
                   // this.globalObject.traverse( function ( object ) { if(object.material) object.material.uniforms.alpha.value = 0.3;} );
                    console.log('Bati3D visibility is ',v);
                    //this.mesh.visible Visi= v;
            };
            
            dalleClasse.prototype.setOpacity = function(v){
                    this.globalObject.traverse( function ( object ) { if(object.material) object.material.uniforms.alpha.value = v;} );
                //    console.log('Bati3D opacity is ',v);
            };
            
            dalleClasse.prototype.removeFromScene = function(){
                    //gfxEngine.removeFromScene(this.mesh);
                    gfxEngine.removeFromScene(this.globalObject);
                    this.globalObject.traverse( function ( object ) { gfxEngine.removeFromScene(object);} );
            };
            
            
            dalleClasse.prototype.setLightPosition = function(v){
                    this.globalObject.traverse( function ( object ) { if(object.material) object.material.uniforms.light.value = v;} );
                //    console.log('Bati3D opacity is ',v);
            };
        
            dalleClasse.prototype.parseB3DObject = function(instantB3D){
                    var     self = this, 
                            obj = instantB3D._cur_obj,
			    urlDDS   = self.getUrlDDSFile(),
                            urlDDS16 = self.getUrlDDS16() ;
                    
                            //add vertices and faces
                            this.geometry.vertices   = obj.verts,
                            this.geometry.faces      = obj.indices;    //face index
                            
                            if(gfxEngine.isMobileEnvironment()) this.racineFile = "Version4LODS_o"; 
                            //load texture one time at begining
                            if(self.isMaterialsLoaded()) {
                                     var mat = null;
                                     for(var materialName in instantB3D._materials){
                                              mat = instantB3D._materials[materialName];
                                              if (mat.colorMap) {
                                                  
                                                  var imgUrl   = this.dataURL+this.racineFile+"/" + self.path + mat.colorMap.url.split('.')[0] + urlDDS;
                                                  self.addTextureURL(imgUrl);
                                                  self.addMaterialsName(materialName);
                                              }              
                                     }
                                     self.setMaterialsLoaded(false);
                            }  
                            
                            //add uv texture if exist
                            
                            for(var i= 0; i < obj.uvsIndexes.length ; i++){
                                      this.geometry.faceVertexUvs[0].push([
                                            obj.uvs[obj.uvsIndexes[i].x],
                                            obj.uvs[obj.uvsIndexes[i].y],
                                            obj.uvs[obj.uvsIndexes[i].z]
                                      ]);
                                    
                            }

                             
                              var materialFaces = obj.materialFaces;
                              for(var materialName in materialFaces){
                                    var ind      = self.getIndexMaterialName(materialName);
                                    
                                    var indFaces = materialFaces[materialName];
                                   
                                    for ( var j = 0; j < indFaces.length; j ++ ) {
                                            this.geometry.faces[indFaces[j]].materialIndex = ind;
                                    }    
                              }
                              
                              
                              this.geometry.computeFaceNormals();
                              this.geometry.computeVertexNormals();  
                              
                             //self.mergeGeometry(geometry);
                   //}// end check uv
            };
            /*
            dalleClasse.prototype.parseDallePivot  = function(p){
                    //console.log('dalle pivot',p);
                    if((p.x !==0)&&(p.y !==0)){
                        var xp =  Math.abs(p.x) - this.pivot.x,
                            yp =  Math.abs(p.y) - this.pivot.y,
                            zp =  Math.abs(p.z) - this.pivot.z;
                        this.geometry.applyMatrix( new THREE.Matrix4().makeTranslation( xp, yp, zp) );
                    }     
            };
            */
           
            dalleClasse.prototype.parseDallePivot  = function(p){
                        var xp =  - this.pivot.x,
                            yp =  - this.pivot.y,
                            zp =  - this.pivot.z;
                        this.geometry.applyMatrix( new THREE.Matrix4().makeTranslation( xp, yp, zp) );
            };
           
            dalleClasse.prototype.parse3DSGeometry = function(instant3DS){
                                    
                 var self = this, obj = instant3DS._cur_obj; 
/*
// messes up the UV coordinates if enabled...

                 if(obj.uvs !== undefined){        
                             var geometry = new THREE.Geometry();
                                   //add vertices and faces
                                   geometry.vertices   = obj.verts,
                                   geometry.faces      = obj.indices;    //face index
                             //load texture one time at begining
                             if(self.isMaterialsLoaded()) {
                                        var mat = null;
                                        for(var materialName in instant3DS._materials){
                                                 mat = instant3DS._materials[materialName];
                                                 if (mat.colorMap) {
                                                       self.addDalleMaterials(new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe :true})); 
                                                       self.addMaterialsName(materialName);
                                                 }              
                                        }
                                        self.setMaterialsLoaded(false);
                             }  
                             //add uv texture if exist
                             for(var i= 0; i < obj.uvsIndexes.length ; i++){
                                      geometry.faceVertexUvs[0].push([
                                            obj.uvs[obj.uvsIndexes[i].x],
                                            obj.uvs[obj.uvsIndexes[i].y],
                                            obj.uvs[obj.uvsIndexes[i].z]
                                      ]);
                              }
                              var materialFaces = obj.materialFaces;
                              for(var materialName in materialFaces){
                                    var ind = self.getIndexMaterialName(materialName);
                                    for ( var j = 0; j < geometry.faces.length; j ++ ) {
                                            geometry.faces[j].materialIndex = ind;
                                    }    
                              }

                              self.mergeGeometry(geometry);
                   }
*/
            };
            
                dalleClasse.prototype.parseB3DGeometry = function(instantB3D){
                                    
                 var self = this, obj = instantB3D._cur_obj; 
                 if(obj.uvs !== undefined){        
                             var geometry = new THREE.Geometry();
                                   //add vertices and faces
                                   geometry.vertices   = obj.verts,
                                   geometry.faces      = obj.indices;    //face index
                             //load texture one time at begining
                             if(self.isMaterialsLoaded()) {
                                        var mat = null;
                                        for(var materialName in instantB3D._materials){
                                                 mat = instantB3D._materials[materialName];
                                                 if (mat.colorMap) {
                                                       self.addDalleMaterials(new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe :true})); 
                                                       self.addMaterialsName(materialName);
                                                 }              
                                        }
                                        self.setMaterialsLoaded(false);
                             }  
                             //add uv texture if exist
                             for(var i= 0; i < obj.uvsIndexes.length ; i++){
                                      geometry.faceVertexUvs[0].push([
                                            obj.uvs[obj.uvsIndexes[i].x],
                                            obj.uvs[obj.uvsIndexes[i].y],
                                            obj.uvs[obj.uvsIndexes[i].z]
                                      ]);
                              }
                              var materialFaces = obj.materialFaces;
                              for(var materialName in materialFaces){
                                    var ind = self.getIndexMaterialName(materialName);
                                    for ( var j = 0; j < geometry.faces.length; j ++ ) {
                                            geometry.faces[j].materialIndex = ind;
                                    }    
                              }

                              self.mergeGeometry(geometry);
                   }
            };
            
           //END OF OBJECT CLASSS
           var  bbox      = { xmin : 1286, 
                               xmax : 1315, //+1
                               ymin : 13715, 
                               ymax : 13734 //+1
                              };
                              
           var LODs = {
                            ORIGIN: 2,
                            SECOND: 4,
                            THIRD:  8,
                            FOURTH: 16
                       };
               
 
                          
             var clipMap = function (lon, lat, levels, scale,textureType) {
                 
                    THREE.Object3D.call( this );

                    this.levels = ( levels !== undefined ) ? levels : 4;
                    this.scale  = ( scale !== undefined ) ? scale : 1;
                    this.list   = [];
                    this.textureType = textureType;

                
                    var nbDallesCote = 2;
                    if (this.textureType == '.jpg') nbDallesCote = 2;
                    /*
                    for(var i=-nbDallesCote/2 +1 ;i<nbDallesCote/2 +1;++i){
                          for(var j=-nbDallesCote/2 ;j<nbDallesCote/2 ;++j){
                             
                             if (this.textureType == '.jpg'){
                                  this.createTile(lon, lat, i, j, LODs.SECOND);
                             }else{
                                 
                                if(Math.abs(i)<1) this.createTile(lon, lat, i, j, LODs.ORIGIN);
                                else
                                    if(Math.abs(i)<3) this.createTile(lon, lat, i, j, LODs.ORIGIN);
                                else
                                   this.createTile(lon, lat, i, j, LODs.THIRD);
                              
                             }
                          
                          }
                    }*/
                    
                    this.createTile(lon, lat, 0, 0, LODs.SECOND);
           
                };
                
               
               
                clipMap.prototype = {
                    
                    hide: function(){
                        this.hidden = true;
                        this.meshes.forEach(function(mesh){
                             mesh.visible = false;
                        });
                    },

                    show: function(){
                        this.hidden = false;
                        this.meshes.forEach(function(mesh){
                             mesh.visible = true;
                        });
                    },

                    createTile: function (lon, lat, x, y, lod) {
                         // if(gfxEngine.isMobileEnvironment)
                          var name  = (lon+x).toString() + "-" + (lat+y).toString();
                          var dalle =  new dalleClasse();
                              dalle.dataURL = Cartography3D.dataURL;
                              dalle.setNamePath(name);
                              dalle.setLoDLevel(lod);
                              dalle.setTextureType(this.textureType);
                              this.list.push(dalle);
                              
                    },
                    
                   createTile2: function (lon, lat, x, y, lod) {
                         // if(gfxEngine.isMobileEnvironment)
                          var name  = (lon+x).toString() + "-" + (lat+y).toString();
                          var dalle =  new dalleClasse();
                              dalle.setNamePath(name);
                              dalle.setLoDLevel(lod);
                              dalle.setTextureType(this.textureType);
                              this.list.push(dalle);
                              
                    },
                    
                    getListTiles : function(){
                         return this.list;  
                    }
                    
                };
            
            
            
            
            var Cartography3D = {
                
                            intialized       : false,
                            opacity          : 1,
                            carte3Dactivated : false,
                            grid             : [],
                            dalleSet         : {},
                            listDalles       : [],
                            scale            : 500,
                            zero             : null,
                            paris            : { xmin : bbox.xmin*500, 
                                                 xmax : bbox.xmax*500, 
                                                 ymin : bbox.ymin*500, 
                                                 ymax : bbox.ymax*500 
                                               },
                            videoGamesOn        : false,    
                            dataURL : Config.dataURL.defaultUrl3DBuilding,
                            nbSeeds:5,
                            dateNow : null,
                            timeLapse: null,
                            counterAdded : false,
                            arrTargets : [],
                            iteration        : 0,   // For updating loop
                            light: new THREE.Vector3 (0., -0.5, -1.0).normalize(),
                            gridWeather: [],
                            gridGeometry: null,
                            textureType : 'dds',
							raycaster : new THREE.Raycaster(), // create once
                            //grillMap
                            gmap            : null,
                            createGMap      : function(){
                                
                                      var  mat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent:true, opacity:0.5, side:THREE.DoubleSide});
                                      this.gmap = new THREE.Mesh(
                                              new THREE.PlaneGeometry(10000, 10000),
                                              mat
                                      );

                                      this.gmap.rotation.x = - Math.PI * 0.5;
                                      this.gmap.position.y  = 0;
                                      this.gmap.visible = false;
                                      gfxEngine.addToScene(this.gmap);
                            },
                            projectFrustumOnGMAP : function() {
                                  var viewMatrix           = new THREE.Matrix4(),
                                      viewProjectionMatrix = new THREE.Matrix4(),
                                      frustum = new THREE.Frustum();
                                      viewMatrix.copy( gfxEngine.getCamera().matrixWorldInverse.getInverse(gfxEngine.getCamera().matrixWorld));
                                      viewProjectionMatrix.multiplyMatrices( gfxEngine.getCamera().projectionMatrix, viewMatrix );
                                      frustum.setFromMatrix( viewProjectionMatrix );
                                  
                            },
                            
                            
                            
                            generateGrid:function(){
                
                                var leftBottomCornerGrid = new THREE.Vector3(bbox.xmin*500,0,bbox.ymin*500);
                                this.sceneleftBottomCornerGrid = new THREE.Vector3().subVectors(leftBottomCornerGrid,this.zero);
                                    
                                this.grid = new Array();
                                var nbdallesX = bbox.xmax - bbox.xmin +1;
                                var nbdallesY = bbox.ymax - bbox.ymin +1;
                                //console.log(nbdallesX);
                                //console.log(nbdallesY);
                                for(var i=0; i< nbdallesX; i++)
                                   this.grid[i] = new Array();

                                // on parcourt les lignes...
                                for(var i=0; i<nbdallesX; i++)
                                   // ... et dans chaque ligne, on parcourt les cellules
                                   for(var j=0; j<nbdallesY; j++)
                                      this.grid[i][j] = null;

                                                    /*

                                                     var  bbox      = { xmin : 1286, 
                                                                        xmax : 1315, //+1
                                                                        ymin : 13715, 
                                                                        ymax : 13734 //+1
                                                                };
                                                  */
                            },
                            
                            
                         
                            getDalleXYFromCamDirection: function(){
                                
                                var p = new THREE.Vector3(-9999,0,0);  // To detect no intersection                               
                                this.raycaster.setFromCamera(new THREE.Vector3(0, 0), gfxEngine.getCamera());
                                var objArray = this.raycaster.intersectObjects([this.gmap]);
                                if (objArray[0]) {
                                    
                                    p = objArray[0].point; // Pos 3D in scene of camera look to gmap plane
                                    if(p.distanceTo(gfxEngine.getCameraPosition()) < 500){
                                        var currentDalleUnderCam = new THREE.Vector3().subVectors(p,this.sceneleftBottomCornerGrid);
                                        var x = Math.floor(currentDalleUnderCam.x / 500);
                                        var z = Math.floor(currentDalleUnderCam.z / 500);
                                        p.x = x; p.z = z;}
                                    else p = new THREE.Vector3(-9999,0,0); 
                                }
                                
                                return p;
                             
                            },
                            
                            
                            checkWhatToLoad: function(){
                                
                                this.iteration++;
                                
                                if(this.iteration%30==0 && this.opacity==1){
                                            
                                   var pLook = this.getDalleXYFromCamDirection();
                                   
                                   if(pLook.x!=-9999 && this.grid[pLook.x][pLook.z] == null){
                                        var lon = bbox.xmin + pLook.x;
                                        var lat = bbox.ymin + pLook.z;
                                        this.loadDallesAtPosition(lon,lat);   
                                   }
   
                               }
                               
                               requestAnimSelectionAlpha(this.checkWhatToLoad.bind(this));
                               
                            },
                            
                            
                            // GAMING FUNCTION
                            checkIfTouchTarget: function(){

                                if(this.videoGamesOn){
                                    var nbTouched = this.nbSeeds - this.arrTargets.length ;
                                    for (var i=0;i<this.arrTargets.length;++i){
                                        var d = gfxEngine.getCameraPosition().distanceTo(this.arrTargets[i].position);
                                        if(d<50) {
                                            
                                         //   var nbTouched = this.nbSeeds - this.arrTargets.length +1;
                                            console.log("touched!");
                                        //    this.setMessageDisplay( nbTouched ,1);
                                            // remove targets sphere in scene
                                            gfxEngine.removeFromScene(this.arrTargets[i]);
                                            this.arrTargets.splice(i, 1);
                                            this.playMP3(nbTouched);
                                            
                                        }
                                    }
                                    
                                    this.setMessageDisplay( nbTouched ,1);
                                    requestAnimSelectionAlpha(this.checkIfTouchTarget.bind(this));
                                }
                                    
                            },
                            
                            
                           
                            
                            
                            playMP3:function(nbTouched){

                                    var mp3name = "172205__fins__jumping.wav";
                                    //mp3name = mp3name || "172205__fins__jumping.wav";  //221568__alaskarobotics__cheering-and-clapping-crowd-1
                                    if(nbTouched >= this.nbSeeds-1) {
                                        mp3name = "clap.mp3";
                                        Utils.snd = new Audio('sounds/'+mp3name);
                                    }
                                    if(!Utils.snd) Utils.snd = new Audio('sounds/'+mp3name); // buffers automatically when created
                                    Utils.snd.play();
                            },
                               
                            removeDalleFromGrid: function(x,y){
                                
                               var pLook = this.getDalleXYFromCamDirection();
                               if(pLook.x!=-9999){
                                    console.log("remove dalle",pLook.x,pLook.z);
                                    console.log(this.grid[pLook.x][pLook.z] );
                                    this.grid[pLook.x][pLook.z].removeFromScene();
                               }
                            },
                                   
                 
                            initCarto3D : function(dataURL){
                                  
                                  this.dataURL = dataURL.url3DBuilding || Config.dataURL.defaultUrl3DBuilding;
                                  this.zero = gfxEngine.getZeroAsVec3D(); 
                                  this.textureType = gfxEngine.isMobileEnvironment() ? '.jpg' : '.dds'; console.log("this.textureType",this.textureType);
                                  _textureType = this.textureType;
                                  //var pos   = Cartography.getCurrentPosition();
                                  var pos = gfxEngine.getCameraPosition();
                                  
                                  this.createGMap();
                                  this.generateGrid();
                                 // this.generateSeeds();
                                  gfxEngine.translateCameraSmoothly(-10001,100,0);   // Translate to 100 meters up
                                  if(this.isDataAvailable(pos.add(this.zero))){ 
                                       this.loadDallesAroundPosition(pos,this.zero);
                                       this.setInitStatus(true);
                                  }    
                            },
                            
                            /*
                            initCarto3D : function(){
                                 this.createQuadTreePlanet();
                            },
                            */
                            setActivatedCarte3D : function(v){
                                  this.carte3Dactivated = v;  
                                //  this.setVisibility(v);
                            },
                            isActivatedCarte3D : function(){
                                  return this.carte3Dactivated;
                            },
                            setInitStatus : function(v){
                                  this.intialized = v;
                            },                 
                            isCartoInitialized : function(){
                                  return this.intialized;
                            },                 
                            createCarteLoD : function(p,zero) {
                                /*
                                  if(this.isDataAvailable(p)){
                                          var lon   = Math.floor(p.x/this.scale),
                                              //lat   = Math.ceil(p.z/this.scale),
                                              lat   = Math.floor(p.z/this.scale),
                                              dalle = null,
                                              listDalles = this.createDalleListAroundPosition(lon, lat);
                                              for(var i = 0; i< listDalles.length;i++){
                                                    var name = listDalles[i];
                                                    if(this.dalleSet[name] === undefined){
                                                              dalle =  new dalleClasse();
                                                              dalle.setDalleZeroPivot(zero);
                                                              dalle.setNamePath(name);
                                                              dalle.load(2);

                                                              //empty texture cache
                                                              this.dalleSet[name] = dalle;
                                                    }
                                             }
                                             console.log('create dalle',Math.floor(p.x/this.scale), Math.ceil(p.z/this.scale)); 
                                  } */
                            },
                            
                            removeAllDalles :function(){
                                     for(var dalleName in this.dalleSet){
                                           this.dalleSet[dalleName].removeFromScene();
                                     }
                            },
                            
                            setVisibility :function(v){

                                   // this.tweenGeneralOpacity();
                                   for(var dalle in this.listDalles){
                                       //console.log("dalle",dalle);
                                        this.listDalles[dalle].setVisible(v);
                                }
                                   
                            },
                            
                            removeDalleAt: function(x,y){
                                
                            },
                            
                            setOpacity :function(v){

                                   this.opacity = v;
                                   for(var dalle in this.listDalles){
                                       //console.log("dalle",dalle);
                                        this.listDalles[dalle].setOpacity(v);
                                   }
                                    
                            },
                            
                            setLightPosition :function(v){

                                   this.opacity = v;
                                   for(var dalle in this.listDalles){
                                       //console.log("dalle",dalle);
                                        this.listDalles[dalle].setLightPosition(v);
                                   }
                                    
                            },
                            
                            // DOWN
                            tweenGeneralOpacity: function(){
                                    
                                //console.log(" tweenGeneralOpacity",this.opacity);
                                if(this.intialized){
                                    var i = this.opacity;
                                    if(i>0){
                                        i -= (1- (i-0.01))*0.04;
                                        if(i<0) {i=0;this.setVisibility(false);}
                                        this.setOpacity(i);
                                    	requestAnimSelectionAlpha(this.tweenGeneralOpacity.bind(this));
                                    }
                               }
                            },
                            
                              // UP
                            tweenGeneralOpacityUP: function(){
                                
                                
                                //console.log(" tweenGeneralOpacity",this.opacity);
                                if(this.intialized){
                                    
                                    var i = this.opacity;
                                    //if(i==0) this.setVisibility(true);
                                    if(i<1){
                                        i += ((i+0.01))*0.04;
                                        if(i>1) i=1;   
                                        this.setOpacity(i);
                                        requestAnimSelectionAlpha(this.tweenGeneralOpacity.bind(this));
                                    }
                               }
                            },
                            
                            getOpacity: function(){
                                return this.opacity;
                            },
                          
                            // with Alex changes
                            loadDallesAtPosition  : function(lon,lat) {
                                    console.log("loadDallesAtPosition",lon,lat);
                              var      dalle = null,
                                       listDalles = this.createDalleListAroundPosition(lon, lat);
                               
                                   for(var i = 0; i< listDalles.length;i++){
                                           var name = listDalles[i];
                                           if(this.dalleSet[name] === undefined){
                                                      
                                                     dalle =  new dalleClasse();
                                                     dalle.dataURL = this.dataURL;
                                                     dalle.textureType = this.textureType;
                                                     dalle.setDalleZeroPivot(gfxEngine.getZeroAsVec3D());
                                                     dalle.setNamePath(name);
                                                     dalle.setLoDLevel(2);
                                                     dalle.load();
                                                     this.grid[lon - bbox.xmin][lat - bbox.ymin] = dalle;   
                                                     //empty texture cache
                                                     this.dalleSet[name] = dalle;
                                                     // add to Global listDalles
                                                     this.listDalles.push(dalle);
                                           }
                                  }
                            },
                           
                           loadDallesAroundPosition  : function(p,zero) {
                              console.log("loadDallesAroundPosition",p);
                                   var lon   = Math.floor(p.x/this.scale),
                                       lat   = Math.floor(p.z/this.scale);
                                   var textureType = '.dds';
                                   if(gfxEngine.isMobileEnvironment()) { textureType = '.jpg';}
                                   var map   = new clipMap(lon, lat, 1, 1, _textureType);
                                   this.listDalles = map.getListTiles();
                                   //console.log("listDalles",this.listDalles);
                                   //console.log(this.grid);
                                   for(var i = 0; i< this.listDalles.length;i++){
                                       if(this.dalleSet[this.listDalles[i].name] === undefined){
                                                var currentDalle = this.listDalles[i];
                                                var currentDalleNameSplit = this.listDalles[i].name.split('-');
                                                var currentDalleXinGrid =  currentDalleNameSplit[0] - bbox.xmin;
                                                var currentDalleYinGrid =  currentDalleNameSplit[1] - bbox.ymin;
                                                //console.log(currentDalleXinGrid,currentDalleYinGrid);
                                                this.grid[currentDalleXinGrid][currentDalleYinGrid] = currentDalle;
                                                this.listDalles[i].setDalleZeroPivot(zero);
                                                if(!this.using3DS) {
                                                    this.listDalles[i].load();
                                                } else {
                                                    this.listDalles[i].setLoDLevel(0);  
                                                    this.listDalles[i].load3DS();
                                                }    
                                       }
                                  }
                                  this.checkWhatToLoad();   // Then launch auto update
                                  // call update LOD texture here
                                  // this.updateLODTextureInClipMap(listDalles);
                            },
                            
                            usingLayer : function(layerName) {
                                 if(layerName === "3DBuilding"){
                                     this.using3DS = true;
                                 }else{
                                     this.using3DS = false;
                                 }   
                            },
                            
                            setVideoGamesOn: function(b){
                                this.videoGamesOn = b;
                            },
                            
                            getVideoGamesOn: function(b){
                                return this.videoGamesOn;
                            },
 
 
                            generateSeeds: function(){
                                
                                console.log("generateSeeds");
                               
                                this.arrTargets = [];
                                this.dateNow  = new Date();
                                for(var i = 0; i< this.nbSeeds; ++i){
                                    
                                    var pos = new THREE.Vector3(500*Math.random()-250, 20 + 100*Math.random(), 500*Math.random()-250);
                                    this.drawTarget(pos,25);
                                     // this.arrTargets.push(pos);
                                    //Draw.drawSphereAt(pos,10);
                                }
                                
                                this.videoGamesOn = true;
                                
                                this.checkIfTouchTarget();
                                var helico = new Audio('sounds/'+"93076__cgeffex__helicopter.mp3"); // buffers automatically when created
                                helico.loop = true;
                                helico.play();
                                
                                this.getTemperatureForGrid();
                                
                            },   
                            
                              // Print message on screen(text) remove it depending on value
                            setMessageDisplay: function(text,value){

                                var timeLapse = new Date() -  this.dateNow ;
                                if(text < this.nbSeeds-1) 
                                this.timeLapse = timeLapse;
                                if(!this.counterAdded){
                                    
                                    this.counterAdded = true;
                                    
                                    var element = document.createElement("div");
                                    element.innerHTML = '<font style="font-family: Impact; font-size:8vw; position:absolute; bottom:5%; left: 35%; margin-top: -10vw; margin-left: 0vw; color:white"> '+ text +' '+this.timeLapse+' </font>';
                                    element.id="loading";
                                    var div = document.getElementById("dynamicInput");
                                    div.appendChild(element);          
                                }
                                else{
                                    $('#loading').html('<font style="font-family: Impact; font-size:8vw; position:absolute; bottom:5%; left: 35%; margin-top: -10vw; margin-left: 0vw; color:white"> '+ text+' '+this.timeLapse+' </font>');
                                }
                                
                                // Turn torus
                                 for (var i=0;i<this.arrTargets.length;++i){
                                       
                                     this.arrTargets[i].rotation.y+=0.01;  
                                    
                                }
                                
                            },
                            
                            
                            drawTarget: function(pos,radius){
                             
                                var mesh = new THREE.Mesh( new THREE.TorusGeometry( 20, 3, 16, 100),new THREE.MeshBasicMaterial( { depthTest: false, transparent: true,  opacity: 0.8, color: 0xffffff * Math.random()}));
                                mesh.position = pos;
                                gfxEngine.addToScene(mesh);
                                this.arrTargets.push(mesh);
      
                            },
                         
                            
                            createQuadTreePlanet : function(){
                                
                                var refCamera = gfxEngine.getCamera(), eathRadius = 6376136;
                                
                                 quadSpherePlanet.quadSphere = new THREE.QuadTreeSphere({
                                            workerPath: new THREE.QuadTreeSphereBlobWorker(),
                                            camera: refCamera,
                                            radius: eathRadius, //radius earth
                                            patchSize: 16,
                                            scene: gfxEngine.getScene(),
                                            fov: refCamera.fov,
                                            quadMaterial: quadSpherePlanet.quadMaterial
                                  });
                                  
                                   refCamera.position.z = eathRadius * 4;
		  	           refCamera.lookAt(new THREE.Vector3(0, 0, 0));
                                                                
                                   this.renderQuadTreePlanet();
                            },
                            
                            renderQuadTreePlanet : function () {
                                  quadSpherePlanet.quadSphere.update();
                                  requestAnimationFrame(Cartography3D.renderQuadTreePlanet);
                            }, 
                            
                            
                            
                            // List dalle around position and check if already loaded or not
                            createDalleListAroundPosition : function(lon,lat){
                                  var list = [],
                                         x = [0,1],
                                         y = [0,1];

                                  for(var i = 0 ; i < x.length ; i++)
                                      for(var j= 0; j < y.length; j++){
                                            if (this.grid[lon + x[i] - bbox.xmin][lat +y[j] - bbox.ymin] == null){
                                                this.grid[lon + x[i] - bbox.xmin][lat +y[j] - bbox.ymin] == {};  
                                                var name  = /*"EXPORT_" +*/ (lon+x[i]).toString() + "-" + (lat+y[j]).toString();
                                                list.push(name);
                                            }
                                      }
                                 return list; 
                            },
                            
                         
                            isPointInsideDalle : function(geom, pt){
                                    var p1 = new THREE.Vector2(geom.Xmin,geom.Ymin),
                                        p2 = new THREE.Vector2(geom.Xmin,geom.Ymax),
                                        p3 = new THREE.Vector2(geom.Xmax,geom.Ymax),
                                        p4 = new THREE.Vector2(geom.Xmax,geom.Ymin);
                                    var b1 = pt.isPointInTriange(p1,p2,p3),
                                        b2 = pt.isPointInTriange(p1,p3,p4);
                                    return (b1.x || b2.x);    
                            },
                            isDataAvailable : function(p){
                                    return (p.x > this.paris.xmin)&&(p.x < this.paris.xmax)&&
                                       (p.z > this.paris.ymin)&&(p.z < this.paris.ymax);
                            },
                            update : function() {
                                    if(this.isActivatedCarte3D()){
                                        var zero           = gfxEngine.getZeroAsVec3D(), //pivot for RGE, street view
                                            pos            = Cartography.getCurrentPosition(); //current position when click on geoportail
                                            if(this.isDataAvailable(pos)){
                                                    // this.createNewDalle(pos,zero);
                                                    //this.createCarteLoD(pos,zero);
                                                    //this.createALlDalle(pos,zero);
                                                    this.loadDallesAroundPosition(pos,zero);
                                            }        
                                    }        
                            },
                    
                            processEvent: function(event) {
                                    if (_events[event]) {
                                            _events[event]();
                                    }
                            }
            };
            
             

    return Cartography3D;
});

