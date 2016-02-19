define(['three', 'GraphicEngine','Utils','ProjectiveTexturing', 'Shader'],
    function(THREE, gfxEngine, Utils, ProjectiveTexturing, Shader) {

    //PRIVATE MEMBERS******************************************************************************************
    //*********************************************************************************************************

    // ATTRIBUTES
    //*************************************

    var _lineMesureAddedToScene = false,
            _geometryLinesMesure,
            _lineMesure,
            // Text for mesuring. Positioned in 3D.
            _canvasText, // Canvas created to show text at 3D Pos while mesuring for example
            _canvasTextCreated = false,
            _xc, // Context 2D of the canvas
            _meshText, // mesh of the plan textured with the text
            _texture,
            _xm, // new THREE.MeshBasicMaterial    material (texture) of the mesh containing the text
            _drawnMesureValue = false, // If the mesure has been drawn to keep many on the screen
            _dist, // Distance mesured
            _textPlaneSize = 2,
            _surfaceType = null,
            _surface = null,
            _surfaceOn = false,
            _materialSurface = null,
            _materialCircle = null,
            _geometrySurface = null,
            _surfaceScale = 1,
            _rectangleMesh = null,
            _arrPtsInliers = [],
            _zebraMesh = null,
            _circleMesh = null,
            _cylinder = null,
            _zebraOn = false,
            _zebraInitiated = false,
            _roadMesh = null,
            _shaderLineMat = null,
            _nbPointsBuffer = 6,
            _bufferGeometryLine = null;  // nb points max per line


    //END OF PRIVATE MEMBERS***********************************************************************************
    //*********************************************************************************************************

    /**
     * Manages drawing functions (Canvas 2D and 3D).
     * @exports Draw
     */
    var Draw = {
        //BoundingBox 3D LIDAR
        tabBoundingBox: [], // Tab of vector3 of the Bounding box
        drawBB: false, // Boolean to start drawing the bb
        drawBB2: false,
        BBCreated: false,
        alphaBB: 0,
        heightBB: 0,
        bg: null, // = new THREE.Geometry(), // bounding box geometry
        BBMesh: null, // Mesh bounding box
        tAtemp: null, ptBtemp: null, ptCtemp: null, ptDtemp: null,
        ptA2: null, ptB2: null, ptC2: null, ptD2: null, point2: null, // New value after repere rotation
        lengthAB: null, lengthAC: null, lengthAPoint: null,
        nbClassLidar: 1.,
        lidarClassDragActive: false,
        infoBB: null,
        tabBB: [],
        tabLines: [],
        tabText: [],
        tabPoints : [],         // Points drawn from user in app
        tabPointsImported: [],  // Points drawn from imported file
        initSurface: function() {

            _surfaceOn = true;
            //meshMaterial.side = THREE.DoubleSide;
            this.initSurfacesType();
            _surface = _rectangleMesh;//_rectangleMesh;
            // _geometrySurface = new THREE.PlaneGeometry(4,2,1); 
            // _surface = THREE.SceneUtils.createMultiMaterialObject(_geometrySurface, _materialSurface);
            //gfxEngine.addToScene(_surface);
        },
        // Bug in visibility. So we play with position
        initSurfacesType: function() {

            _materialSurface = [
                new THREE.MeshBasicMaterial({color: 0xffffff, overdraw: false, depthTest: false, transparent: true, opacity: 0.5}),
                new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true, depthTest: false, transparent: true, opacity: 0.6})
            ];

            _materialCircle = [
                new THREE.MeshBasicMaterial({color: 0xffffff, overdraw: false, transparent: true, opacity: 0.3}),
                        //new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true,transparent: true,opacity:0.6})
            ];

            var geomPlane = new THREE.PlaneGeometry(4, 2, 1);
            //_rectangleMesh = THREE.SceneUtils.createMultiMaterialObject(geomPlane, _materialSurface);
            _rectangleMesh = new THREE.Mesh(geomPlane, new THREE.MeshBasicMaterial({side: THREE.DoubleSide, color: 0xffffff, wireframe: false, depthTest: false, transparent: true, opacity: 0.5}));
            var geomCircle = new THREE.CircleGeometry(1, 32);
            //_circleMesh    = new THREE.Mesh(geomCircle,new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest:false,transparent: true}));
           _circleMesh = new THREE.Mesh(geomCircle, new THREE.MeshBasicMaterial( { side:THREE.DoubleSide,color: 0xffffff, overdraw: false,depthTest: false, transparent: true, opacity:0.5 } ));
            ////THREE.SceneUtils.createMultiMaterialObject(geomCircle, _materialCircle);

            _circleMesh.position.y = 10000;
            _rectangleMesh.position.y = 10000;
            gfxEngine.addToScene(_rectangleMesh);
            gfxEngine.addToScene(_circleMesh);

           //TEMP
           _cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12, 1),
                    new THREE.MeshBasicMaterial( { color: 0xffffff,  overdraw: false,depthTest:false,transparent: true, opacity:0.5 } ));
           _cylinder.position.y=40000;
           gfxEngine.addToScene(_cylinder);
           
        },
        
        setSurfaceType: function(surfaceType) {

           if(surfaceType=="Rectangle"){ 
              _surfaceType ="Rectangle"; _surface = _rectangleMesh;_circleMesh.position.y=10000;
                _surface = _rectangleMesh;
                _circleMesh.position.y = 10000;
           }else{
              _surfaceType ="Circle"; _surface = _circleMesh; _rectangleMesh.position.y=10000;
                _surface = _circleMesh;
                _rectangleMesh.position.y = 10000;
           }
        },
        
        // opacity is deducted from scale 
        // when zooming, scale decreases as so the opacity
        // to clear the view for the user
        setSurfaceScaleAndOpacity: function(scale){
            _circleMesh.scale.x = scale;
            _circleMesh.scale.y = scale;
            _rectangleMesh.scale.x = scale;
            _rectangleMesh.scale.y = scale;
            
            _circleMesh.material.opacity = scale > 0.5 ? 0.5:scale*0.8;
            _rectangleMesh.material.opacity = scale > 0.5 ? 0.5:scale*0.8;
        },
        
        drawSurface: function(pos3D, norm) {


            pos3D = gfxEngine.getPositionCloserToCam(pos3D, 0.05);  // To separate from the wall
            if (!_surfaceOn)
                this.initSurface();
            this.setSurfaceVisibility(true);
            _surface.position.set(pos3D.x,pos3D.y,pos3D.z);

            var vec = norm.clone();
            // the cone points up 
            var up = new THREE.Vector3(0, 0, 1);  //(0,1,0);
            var axis = new THREE.Vector3().crossVectors(up, vec);
            
            // we want the cone to point in the direction of the face normal
            // determine an axis to rotate around
            // cross will not work if vec == +up or -up, so there is a special case
            if (vec.y === 1 || vec.y === -1) {
                axis = new THREE.Vector3(1, 0, 0);
            }

            // determine the amount to rotate
            var radians = Math.acos(vec.dot(up));

            // create a rotation matrix that implements that rotation
            var mat = new THREE.Matrix4();
          //  mat.makeRotationAxis(axis, radians);   // !!!! doesnt work very well...
             mat = Utils.rotateByAxis( mat,axis, radians );
            _surface.rotation.setFromRotationMatrix(mat);

            if(_surface.rotation.x==0 || _surface.rotation.x<-3.14) this.setSurfaceType("Rectangle") 
                else this.setSurfaceType("Circle");
           // if(_surface.rotation.y==0) this.setSurfaceType("Circle") 
            //    else this.setSurfaceType("Rectangle");

        },
        
        setSurfaceColor: function(intensity){
            
            var c = new THREE.Color().setHSL( 0, intensity, 0.5 ).getHex();
      
           // _surface.material.color = 0xff00ff;
             _surface.material = new THREE.MeshBasicMaterial( { side:THREE.DoubleSide, color: c, overdraw: false, depthTest: false, transparent: true, opacity:0.7 } );
        },
        
        // Set visibility of the surface (both)
        setSurfaceVisibility: function(b) {

            _rectangleMesh.visible = _circleMesh.visible = b;
            //_surface.visible = b;
        },
        
        // userAdded means we save to tabpoints in order to export in shp or kml those specific points
        drawSphereAt: function(vec3,radius,color,userAdded){
            
            radius = radius || 0.5;
            var id = -1;
            color = color || '#'+Math.floor(Math.random()*16777215).toString(16);
            var sphere = new THREE.SphereGeometry(radius, 8, 8);
            var sphereMesh = new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( { transparent: true,depthTest:false, opacity: 0.8, color: color}));
            sphereMesh.position.set(vec3.x, vec3.y, vec3.z);//new THREE.Vector3(vec3.x,vec2.y,vec3.z);
            gfxEngine.addToScene(sphereMesh);
            if(userAdded){  // Means point added from 3D measure , so in order to save we put in tab
                // Look for id if imported points homolog
                if(this.tabPointsImported.length>0)
                    id = this.searchClosePointsID(vec3);
                this.tabPoints.push(new THREE.Vector4(vec3.x,vec3.y,vec3.z,id));
            }
            return id;
        },
        
        // add points 4D xyzm to tab 
        addPointsFromFile : function(v4){
            
            this.tabPointsImported.push(v4);
        },
        
        searchClosePointsID: function(v3){
            
            var found = false;
            var i=0;
            var idClosestPoint = -1;
            while (!found && i< this.tabPointsImported.length){
                var p = this.tabPointsImported[i];
                
                found = v3.distanceTo(p) < 1.0; // Homolog if 1 meter max distance
                if (found) idClosestPoint = p.w; // id on measure attrtibute
                ++i;
            }
            return idClosestPoint;
        },
        
       
        drawCircleAt: function(tileTexture, i, j, radius) {

            tileTexture.ctxTex.beginPath();
            tileTexture.ctxTex.fillStyle = "#FF4422";
            tileTexture.ctxTex.arc(i, j, 4, 0, 2 * Math.PI);
            tileTexture.ctxTex.fill();
            tileTexture.xmt.map.needsUpdate = true;
        },
        drawVerticalShapeAt: function(pos,note){
          
          _cylinder.position = pos;
          _cylinder.material.opacity = note/100;
          
        },

        /**
         * Draws a line between 2 points 3D (Vector3). used for mesuring distance
         */
        drawLine: function(point1, point2) {

            var point3D1 = null, point3D2 = null;

            if (!_lineMesureAddedToScene) {

                _lineMesureAddedToScene = true;
                //scene.removeObject(scene.objects[i]); removeObject(scene.objects[i],feat);
                _geometryLinesMesure = new THREE.Geometry();
                point3D1 = point1;
                point3D2 = point2;
                _geometryLinesMesure.vertices.push(point3D1);
                _geometryLinesMesure.vertices.push(point3D2);

                var lineMat = new THREE.LineBasicMaterial({color: 0xaaff0f, overdraw: true, transparent: true, depthTest: false, depthWrite: false, linewidth: 4})
                _lineMesure = new THREE.Line(_geometryLinesMesure, lineMat, THREE.LinePieces);
                _lineMesure.dynamic = true;
                _lineMesure.name = "lineMes";
                gfxEngine.addToScene(_lineMesure);
            } else {				// On  modifie un des sommets

                point3D1 = point1;
                point3D2 = point2;
                _lineMesure.geometry.vertices[0] = point3D1;
                _lineMesure.geometry.vertices[1] = point3D2;
                _lineMesure.geometry.verticesNeedUpdate = true;
            }
             this.tabLines.push(_lineMesure);
        },
   
        
        /**
         * Draws a line between 2 points 3D (Vector3). used for measuring distance
         */
        drawOneMoreLine: function(point1, point2) {

            var geometryLinesMesureMore = new THREE.Geometry();
            var point3D1 = point1;
            var point3D2 = point2;
            geometryLinesMesureMore.vertices.push(point3D1);
            geometryLinesMesureMore.vertices.push(point3D2);

            var lineMat = new THREE.LineBasicMaterial({color: 0xaaff0f, overdraw: true, transparent: true, depthTest: false, depthWrite: false, linewidth: 4})
            var lineMesureMore = new THREE.Line(geometryLinesMesureMore, lineMat, THREE.LinePieces);
            lineMesureMore.name = "lineMesMore" + this.tabLines.length;
            gfxEngine.addToScene(lineMesureMore);
            this.tabLines.push(lineMesureMore);
        },
        removeAllMeasures: function() {
            this.removeAllPoints();
            this.removeAllLines();
            this.removeAllText();
        },
        removeAllLines: function() {

            for (var i = 0; i < this.tabLines.length; ++i) {
                gfxEngine.removeFromScene(this.tabLines[i]);
            }
            this.tabLines = [];
        },
        
         getAllLines: function(){
            
                return this.tabLines;
        },
        
        // getLineForShapeFile Style 
        //   var polylineZ =  [
        //                    [[-180.0, 50.0, 10.], [-180, 90.0, 10.], [180.0, 90, 10.], [180, 50.0, 10.]],
        //                     [[-50, 100.0, 10.], [-40, 110, 10.], [50, 110, 10.], [60, 100, 10.]],
        //                     [[-180.0, 350.0, 10.], [-180, 390.0, 10.], [180.0, 390, 10.], [180, 350.0, 10.],[-180.0, 350.0, 10.]]
        //                 ];
        getAllLinesForSHP: function(){
            
               var polylineZ = [];
               var zero = gfxEngine.getZeroAsVec3D(); 
  
               
               for(var i = 0; i< this.tabLines.length; ++i){
                   
                   var l = this.tabLines[i].geometry.vertices;
                   var line = [];
                   for(var j = 0; j< l.length; ++j){
                       var coord = l[j];
                       var tabCoord = [];
                       tabCoord.push(coord.x + zero.x,coord.z+zero.z,coord.y+zero.y);
                       line.push(tabCoord);
                   }
                   polylineZ.push(line);
               }
               return polylineZ;
          //     console.log(polylineZ);
        },
        
        
        
        getAllPointsForSHP: function(){
            
               var pointsZ = [];
               var zero = gfxEngine.getZeroAsVec3D(); 
         
               for(var i = 0; i< this.tabPoints.length; ++i){
                   
                    var coord = this.tabPoints[i];
                    var p3DasArray = [];
                    
                    p3DasArray.push(coord.x + zero.x,coord.z+zero.z,coord.y+zero.y,coord.w);
                    pointsZ.push(p3DasArray);
               }
               return pointsZ;

        },
        
        removeAllText: function() {

            for (var i = 0; i < this.tabText.length; ++i) {
                gfxEngine.removeFromScene(this.tabText[i]);
            }
            this.tabText = [];
        },
        
        removeAllPoints : function(){
            for (var i = 0; i < this.tabPoints.length; ++i) {
                gfxEngine.removeFromScene(this.tabPoints[i]);
            }
            this.tabPoints = [];
        },
       
         
        drawLines: function(lines) {

            var zero = gfxEngine.getZero();
            for (var l in lines) {

                var line = lines[l];
                var v1 = new THREE.Vector3(line.pt1.x - zero.x,
                        line.pt1.y - zero.y,
                        line.pt1.z - zero.z);

                var v2 = new THREE.Vector3(line.pt2.x - zero.x,
                        line.pt2.y - zero.y,
                        line.pt2.z - zero.z);
                this.drawOneMoreLine(v1, v2);
                var dist = v1.distanceTo(v2).toFixed(2);
                this.showTextAtPos3D(dist + "m", v2/*gfxEngine.getPositionCloserToCam(v2,0.02)*/, 50);

            }
        },
        
        
        
        
        // Draw road profiles from alex db
        // ex: "MULTIPOINT Z (1900.89367676 21220.0527344 37.8202588181,1900
        drawProfiles: function(data, gid){

            var _pivotParis6 = {x:649000,y:0,z:6840000};
            var pivot = {x:_pivotParis6.x - gfxEngine.getZeroAsVec3D().x,
                         y:_pivotParis6.y - gfxEngine.getZeroAsVec3D().y,
                         z:_pivotParis6.z - gfxEngine.getZeroAsVec3D().z
            }
            
            for (var p in data){   // for each profile
               
                  var profile = data[p]; 
                  if( profile.gid > gid){ // to draw
                      console.log("profile.gid",profile.gid , "new data from algo!");
                      var ptTG = profile.pt_trottoirs_gauche;
                      var ptC = profile.pt_chaussee;
                      var ptTD = profile.pt_trottoirs_droite;

                      ptTG = ptTG.substring(ptTG.indexOf('(')+1);
                      ptC = ptC.substring(ptC.indexOf('(')+1);
                      ptTD = ptTD.substring(ptTD.indexOf('(')+1);

                      var arrayPtTG = ptTG.split(',');//console.log(arrayPtTG);
                      var arrayPtC = ptC.split(',');
                      var arrayPtTD = ptTD.split(',');

                      this.drawSubProfile(arrayPtTG,0xaa00aa, pivot);
                      this.drawSubProfile(arrayPtC,0x0aa0aa,  pivot);
                      this.drawSubProfile(arrayPtTD,0xaa00aa, pivot);
                 }

            }
            
        },
        
    
        createMeshFromSelectedPoints: function(arrayPoints,projectionNum){
            
             var geometry = new THREE.Geometry();
             for(var i=arrayPoints.length - 4;i< arrayPoints.length; ++i){               
                 geometry.vertices.push(arrayPoints[i]);
             }
             
             geometry.faces.push( new THREE.Face4(0,1,2,3) );
             geometry.computeFaceNormals();
             
                        
           //var mat = new THREE.MeshBasicMaterial({wireframe: true, wireframeLinewidth : 4, depthTest:false, depthWrite : false, color: 0xaaff0f});
           //var mat = new THREE.MeshBasicMaterial({wireframe: false, wireframeLinewidth : 4, depthTest:false, depthWrite : false, color: 0xffffff});
           
             var mat = ProjectiveTexturing.getShaderMat();
              
           
           
           _roadMesh = new THREE.Mesh(geometry, mat );
           
           _roadMesh.material.side = THREE.DoubleSide; 
           _roadMesh.material.transparent = false;
           
           gfxEngine.addToScene(_roadMesh);
             
            
        },
        
        // FROM DB ALGO POINT EXTRACTED
        createMesh: function(data){

            var _pivotParis6 = {x:649000,y:0,z:6840000};
            var pivot = {x:_pivotParis6.x - gfxEngine.getZeroAsVec3D().x,
                         y:_pivotParis6.y - gfxEngine.getZeroAsVec3D().y,
                         z:_pivotParis6.z - gfxEngine.getZeroAsVec3D().z
            }
            
            
            
            var geometry = new THREE.Geometry();
             
             
            for (var i=0;i<data.length; i+=1){   // for each profile
               
              
                  var profile = data[i];     
                  
         //***TROTTOIR G et D******
                  var ptTG = profile.pt_trottoirs_gauche;
                  var ptC1 = profile.pt_chaussee;
                  var ptTD = profile.pt_trottoirs_droite;
                  
                  ptTG = ptTG.substring(ptTG.indexOf('(')+1);
                  ptC1 = ptC1.substring(ptC1.indexOf('(')+1);
                  ptTD = ptTD.substring(ptTD.indexOf('(')+1);   

                  var arrayPtTG = ptTG.split(',');
                  var arrayPtC1 = ptC1.split(',');
                  var arrayPtTD = ptTD.split(',');
                  
                  var arrayCoordGLeft = arrayPtTG[0].split(' ');
                  var arrayCoordGRight = arrayPtTG[arrayPtTG.length -1].split(' ');
                  
                  var arrayCoordDLeft = arrayPtTD[arrayPtTD.length -1].split(' ');
                  var arrayCoordDRight = arrayPtTD[0].split(' ');
                  
                         // Add right pavement vertices   
                  geometry.vertices.push(new THREE.Vector3(     parseFloat(arrayCoordDLeft[0])+ pivot.x,
                                                                parseFloat(arrayCoordDLeft[2])+ pivot.y,
                                                                parseFloat(arrayCoordDLeft[1])+ pivot.z)
                  ); 
                  geometry.vertices.push(new THREE.Vector3(     parseFloat(arrayCoordDRight[0])+ pivot.x,
                                                                parseFloat(arrayCoordDRight[2])+ pivot.y,
                                                                parseFloat(arrayCoordDRight[1])+ pivot.z)
                  );

                  
            //****CHAUSSEE    ****
               
               // Add chaussee vertices    
                  // We suppose the array of the same size
                  var nbPointsChaussee = arrayPtC1.length;
                  
                  for (var j=0; j< nbPointsChaussee; j++){
                      
                      var arrayCoord = arrayPtC1[j].split(' ');
                      geometry.vertices.push(new THREE.Vector3( parseFloat(arrayCoord[0])+ pivot.x,
                                                                parseFloat(arrayCoord[2])+ pivot.y,
                                                                parseFloat(arrayCoord[1])+ pivot.z)
                      ); 
                  }
                  
                                   
                                 
             // Add left pavement vertices    
                  geometry.vertices.push(new THREE.Vector3(     parseFloat(arrayCoordGLeft[0])+ pivot.x,
                                                                parseFloat(arrayCoordGLeft[2])+ pivot.y,
                                                                parseFloat(arrayCoordGLeft[1])+ pivot.z)
                  );
                  geometry.vertices.push(new THREE.Vector3(     parseFloat(arrayCoordGRight[0])+ pivot.x,
                                                                parseFloat(arrayCoordGRight[2])+ pivot.y,
                                                                parseFloat(arrayCoordGRight[1])+ pivot.z)
                  ); 
                  
                  
                  
         // NOW WE ADD FACES      
            
                if(i>0){    // At least we have 2 profiles already now:  indice = (nbPointsChaussee +4) * 2
                      var nbPointsPerProfile = nbPointsChaussee +4;   //4 for trottoirs G &D (2*2)+
                      
                      for (var a = geometry.vertices.length - (2 * nbPointsPerProfile); a < geometry.vertices.length - nbPointsPerProfile -1; ++a){
                           if( a+nbPointsPerProfile+1 < geometry.vertices.length){
                             geometry.faces.push( new THREE.Face3( a, a+nbPointsPerProfile,a+nbPointsPerProfile+1) );
                             geometry.faces.push( new THREE.Face3( a,a+nbPointsPerProfile+1,a+1) );
                           }  
                      }

                }       
               
            }
            
            
           geometry.computeFaceNormals();
           if(_roadMesh) gfxEngine.removeFromScene(_roadMesh);
           
           //var mat = new THREE.MeshBasicMaterial({wireframe: true, wireframeLinewidth : 4, depthTest:false, depthWrite : false, color: 0xaaff0f});
           var mat = ProjectiveTexturing.getShaderMat();
              
           _roadMesh = new THREE.Mesh(geometry, mat );
           
           _roadMesh.material.side = THREE.DoubleSide; 
           _roadMesh.material.transparent = false;
      //     _roadMesh.material.side = THREE.DoubleSide;
           
                
           gfxEngine.addToScene(_roadMesh);
  
        },
        
         drawArrPoints : function(arrP){
              var pointGeometry  = new THREE.Geometry();
	      var colors         = [];
              for(var i= 0; i< arrP.length; i++){
                          var color = new THREE.Color(0x00ff00);
                              colors.push(color);
                              pointGeometry.vertices.push(arrP[i]);
              }
              pointGeometry.colors = colors;
              var pMaterial = new THREE.ParticleBasicMaterial( { size: 0.03, vertexColors: true, transparent: true }); // map:sprite
              var ptsNeiBors = new THREE.ParticleSystem(pointGeometry, pMaterial); 
              _arrPtsInliers.push(ptsNeiBors);
              gfxEngine.addToScene(ptsNeiBors);
         },        
        
         drawInliersPoints : function(arrP, indP){
                  var pointGeometry  = new THREE.Geometry();
                  var colors         = [];
                  for(var i= 0; i< indP.length; i++){
                              var color = new THREE.Color(0x0000ff);
                                  colors.push(color);
                                  pointGeometry.vertices.push(arrP[indP[i]]);
                  }
                  pointGeometry.colors = colors;
                  var pMaterial = new THREE.ParticleBasicMaterial( { size: 0.03, vertexColors: true, transparent: true }); // map:sprite
                  var ptsInliers = new THREE.ParticleSystem(pointGeometry, pMaterial);
                   _arrPtsInliers.push(ptsInliers);
                  gfxEngine.addToScene(ptsInliers);
         },
         
        removePtsNeibords : function (){
            for(var i=0; i < _arrPtsInliers.length; i++)
              gfxEngine.removeFromScene(_arrPtsInliers[i]);
        },
        

        // ["1900.76220703 21222.3613281 37.7839419862", "1900.75621167 21222.3610938 37.78426668", "1900.75021631 21222.3608594 37.7845900596", 
        drawSubProfile: function(arr,color, pivot){
            

            var geometryLine = new THREE.Geometry();
            
 
            for (var i=0; i< arr.length-1; i++){
                
                var arrayCoord = arr[i].split(' ');
                geometryLine.vertices.push(new THREE.Vector3( parseFloat(arrayCoord[0])+ pivot.x,
                                                              parseFloat(arrayCoord[2])+ pivot.y,
                                                              parseFloat(arrayCoord[1])+ pivot.z)
                                          );
                                              
                arrayCoord = arr[i+1].split(' ');
                geometryLine.vertices.push(new THREE.Vector3( parseFloat(arrayCoord[0])+ pivot.x,
                                                              parseFloat(arrayCoord[2])+ pivot.y,
                                                              parseFloat(arrayCoord[1])+ pivot.z)
                                          );
                
                
            }
            
            var lineMat = new THREE.LineBasicMaterial( { color: color, overdraw: true, transparent:true, depthTest:false, depthWrite : false, linewidth:2 } )
            var lineAlgo = new THREE.Line(geometryLine,lineMat,THREE.LinePieces);
            gfxEngine.addToScene(lineAlgo);
            
        },
        
        
        drawLinesNotConnected: function(arrLines,color){
            
            var color = color || 0xff00ff;
            var geometryLine = new THREE.Geometry();
            
            for (var i=0; i< arrLines.length-1; i+=2){
               
                var pt1 = arrLines[i];
                geometryLine.vertices.push(pt1);
                                              
                var pt2 = arrLines[i+1];
                geometryLine.vertices.push(pt2);
            }
            
            var lineMat = new THREE.LineBasicMaterial( { color: color, overdraw: true, transparent:true, depthTest:false, depthWrite : false, linewidth:2 } )
            var lineAlgo = new THREE.Line(geometryLine,lineMat,THREE.LinePieces);
            gfxEngine.addToScene(lineAlgo);
            
        },
        
        
        initializeTextCanvas: function() {

            _canvasText = document.createElement("canvas");
            _canvasText.width = _canvasText.height = 350;
            _canvasTextCreated = true;

        },
        setTextToCanvas: function(text, sizeFont) {
            _xc = _canvasText.getContext("2d");
            //_xc.fillStyle ="#dbbd7a";
            //_xc.fill();
            _xc.clearRect(0, 0, _canvasText.width, _canvasText.height);

            _xc.shadowColor = "#000";
            _xc.shadowBlur = 7;
            _xc.fillStyle = "rgba(173,216,230,1)";
            _xc.font = sizeFont.toString() + "pt arial bold";

            var tabText = text.split(";"); 
            for (var i = 0; i < tabText.length; ++i) {
                _xc.fillText(tabText[i], 10, (i + 1) * sizeFont);
            }
        },
        setTextMeshPosition: function(v) {

            _meshText.position = v;
        },
        initializeTextMesh: function(posx, posy, posz) {

            _xm = new THREE.MeshBasicMaterial({map: new THREE.Texture(_canvasText), transparent: true, depthTest: false});
            _xm.map.needsUpdate = true;
            _xm.side = THREE.DoubleSide;
            // depthTest: false,
            //   transparent: true

            _meshText = new THREE.Mesh(new THREE.PlaneGeometry(_textPlaneSize, _textPlaneSize), _xm);
            _meshText.name = "textMes";
            this.setTextMeshPosition(posx, posy, posz);
            _meshText.scale.x = _meshText.scale.y = _meshText.scale.z = 1;
            _meshText.quaternion = gfxEngine.getCamera().quaternion;
            //     _meshText.rotation = gfxEngine.getCamera().rotation;
            //    _meshText.updateMatrix();

        },
        
        showTextAtPos3D2: function(text, v, sizeFont) {

            if (!_canvasTextCreated) {
                this.initializeTextCanvas();
                this.setTextToCanvas(text, sizeFont);

                _texture = new THREE.Texture(_canvasText);
                _texture.needsUpdate = true;

                var material = new THREE.MeshBasicMaterial({
                    map: _texture, transparent: true
                });
                _meshText = new THREE.Mesh(new THREE.PlaneGeometry(_canvasText.width, _canvasText.height), material);
                _meshText.rotation = gfxEngine.getCamera().rotation;
                // mesh.overdraw = true;
                _meshText.doubleSided = true;
                _meshText.position = v;

                gfxEngine.addToScene(_meshText);
            }
            else {
                this.setTextMeshPosition(v);
                this.setTextToCanvas(text, sizeFont);
                _texture = new THREE.Texture(_canvasText);
                _meshText.material.map = _texture;
                _texture.needsUpdate = true; //.map.needsu
                _meshText.updateMatrix();
            }
        },
        /**
         * Uses the context 2D from the canvas drawn on a texture to show text in a specific 3D Position FOLLOWING THE MOUSE
         */
        showTextAtPos3DSameMesure: function(text, v, sizeFont) {

            sizeFont = sizeFont ||50;
            if (!_canvasTextCreated) {

                this.initializeTextCanvas();
                this.setTextToCanvas(text, sizeFont);
                this.initializeTextMesh(v);
                _xm.map.needsUpdate = true;
                _xm.side = THREE.DoubleSide;
                gfxEngine.addToScene(_meshText);
                //_meshText.doubleSided = true;
                // _meshText.updateMatrix();
                _xm.map.needsUpdate = true;
                _xm.side = THREE.DoubleSide;
            }
            else {

                this.setTextToCanvas(text, sizeFont);
                this.setTextMeshPosition(v);
                _xm.map = new THREE.Texture(_canvasText);
                _xm.map.needsUpdate = true;
                _meshText.updateMatrix();
            }
            
            this.tabText.push(_meshText);
        },
        /**
         * Use the context 2D from the canvas drawn on a texture to show text in a specific FIXED 3D Position
         */
        showTextAtPos3D: function(text, v, sizeFont) {

            sizeFont = sizeFont ||50;
            if (!_canvasTextCreated) {
                this.initializeTextCanvas();
                this.setTextToCanvas(text, sizeFont);
                this.initializeTextMesh(v);
            }
            else {
                this.setTextToCanvas(text, sizeFont);
                this.initializeTextMesh(v);
            }
            gfxEngine.addToScene(_meshText);
            this.tabText.push(_meshText);
            _canvasTextCreated = false;
        },
        /**
         * Draw a boundingbox in edition using 4 3D points coming from 2 and an height
         */
        drawBBTemp: function(ptA, ptB, ptC, ptD, h) {

            if (!this.BBCreated) {

                this.bg = new THREE.Geometry();
                this.bg.dynamic = true; //!!!! Needs to be set before adding the vertices!!
                // Base (ground)
                this.bg.vertices.push(ptA);
                this.bg.vertices.push(ptB);
                this.bg.vertices.push(ptC);
                this.bg.vertices.push(ptD);

                //Top
                this.bg.vertices.push(new THREE.Vector3(ptA.x, ptA.y + h, ptA.z));
                this.bg.vertices.push(new THREE.Vector3(ptB.x, ptB.y + h, ptB.z));
                this.bg.vertices.push(new THREE.Vector3(ptC.x, ptC.y + h, ptC.z));
                this.bg.vertices.push(new THREE.Vector3(ptD.x, ptD.y + h, ptD.z));

                this.bg.faces.push(new THREE.Face3(0, 1, 3));
                this.bg.faces.push(new THREE.Face3(0, 3, 2));
                
                
                this.bg.faces.push(new THREE.Face3(4, 5, 7));
                this.bg.faces.push(new THREE.Face3(4, 7, 6));
                
                this.bg.faces.push(new THREE.Face3(0, 1, 5));
                this.bg.faces.push(new THREE.Face3(0, 5, 4));

                this.bg.faces.push(new THREE.Face3(1, 3, 7));
                this.bg.faces.push(new THREE.Face3(1, 7, 5));
                
                this.bg.faces.push(new THREE.Face3(3, 2, 6));
                this.bg.faces.push(new THREE.Face3(3, 6, 7));
                
                this.bg.faces.push(new THREE.Face3(2, 0, 4));
                this.bg.faces.push(new THREE.Face3(2, 4, 6));
                
                this.bg.dynamic = true;

                if (this.BBMesh) {
                    this.BBMesh.position.y = 0;//-=1; 
                }

                this.BBMesh = new THREE.Mesh(this.bg, new THREE.MeshBasicMaterial({wireframe: true, wireframeLinewidth: 3, color: 0xaaff0f, transparent:true, depthTest: false}));
                this.BBMesh.geometry.dynamic = true;
                this.BBMesh.geometry.verticesNeedUpdate = true;
                this.BBMesh.dynamic = true;
                this.BBCreated = true;
                gfxEngine.addToScene(this.BBMesh);

            } else {

                this.BBMesh.geometry.vertices[0] = ptA;
                this.BBMesh.geometry.vertices[1] = ptB;
                this.BBMesh.geometry.vertices[2] = ptC;
                this.BBMesh.geometry.vertices[3] = ptD;

                this.BBMesh.geometry.vertices[4] = new THREE.Vector3(ptA.x, ptA.y + h, ptA.z);
                this.BBMesh.geometry.vertices[5] = new THREE.Vector3(ptB.x, ptB.y + h, ptB.z);
                this.BBMesh.geometry.vertices[6] = new THREE.Vector3(ptC.x, ptC.y + h, ptC.z);
                this.BBMesh.geometry.vertices[7] = new THREE.Vector3(ptD.x, ptD.y + h, ptD.z);

                this.BBMesh.geometry.__dirtyVertices = true;
                this.BBMesh.geometry.verticesNeedUpdate = true;
            }
        },
        // Display BoundingBox Info, volume, pos, width...
        displayBBInfo: function(lengthAB, lengthAC, nbPointsInBB, ptA, ptB, ptC, ptD, h, nbClassLidar) {


            if (this.infoBB) {
                this.infoBB.mesh.y -= 1; //this.infoBB.lineMesure.y-=1;
            }
            this.infoBB = InfoBox;
            var iWidth, iHeight, iLength, iVolume, iPoints, iPos, estimatedShape;
            iWidth = Math.min(Math.abs(lengthAB), Math.abs(lengthAC)).toFixed(2);
            iLength = Math.max(Math.abs(lengthAB), Math.abs(lengthAC)).toFixed(2);
            iHeight = Math.abs(h).toFixed(2);
            iVolume = (iWidth * iLength * iHeight).toFixed(2);
            iPoints = nbPointsInBB;
            iPos = new THREE.Vector3(parseFloat(ptA.x) + parseFloat(gfxEngine.getZero().x),
                    parseFloat(ptA.y) + parseFloat(gfxEngine.getZero().y) + 0.7, parseFloat(ptA.z) + parseFloat(gfxEngine.getZero().z));
            estimatedShape = "Unknown";
            if (iLength / iHeight < 0.66) {
                if (iLength < 2) {
                    estimatedShape = "Human";
                }
            } else
            {
                if (iLength / iWidth > 1.5) {
                    if (iLength > 3.5 && iLength < 7 && iHeight < 4) {
                        estimatedShape = "Car";
                    }
                    else {
                        estimatedShape = "Scooter";
                    }

                }
            }

            this.infoBB.initialize(nbClassLidar, iWidth, iHeight, iLength, iVolume, iPoints, iPos, estimatedShape);
            this.infoBB.setPosition(new THREE.Vector3(ptA.x, ptA.y + h, ptA.z));
            this.infoBB.addToScene();
            this.tabBB.push(this.infoBB);
        },
        
        addTextPanel: function(text, position, options) {
            
            // We modify the position a bit for the text not to hide the measure point
            position.x+=0.5; 
            position.y+=0.5;
            
            options = options || {}
            var style = options.style || {};
            var delimiter = options.delimiter || "\n";
            var name = options.name || "";

            var canvas = document.createElement("canvas");
            var canvasContext = canvas.getContext("2d");
            var fontSize = style.fontSize || 20;
            canvasContext.font = fontSize + "pt arial bold";// "pt bold Calibri, sans-serif";

            //split text by line
            text = text.split(delimiter);

            //compute the space needed by the canvas
            var canvasWidth = canvasContext.measureText(text[0]).width;
            var lineNumber = text.length;

            for (var i = 1; i < lineNumber; i++) {
                var currentWidth = canvasContext.measureText(text[i]).width;
                if (currentWidth > canvasWidth) { //we keep the longer text for the canvas width
                    canvasWidth = currentWidth;
                }
            }

            //set canvas dimensions
            var padding = style.padding || 10;
            canvasWidth += 2 * padding;
            canvas.width = canvasWidth;
            var lineSpace = style.lineSpace || 3;
            canvas.height = lineNumber * fontSize + 2 * padding + (lineNumber - 1) * lineSpace;

            //set canvas style (font style, colors, ...)
            canvasContext.fillStyle = 'rgba(0,51,102,0.1)'; 
            canvasContext.fillRect(0, 0, canvasWidth, canvas.height);
            canvasContext.shadowColor = "#000";
            canvasContext.shadowBlur = 7;
            canvasContext.fillStyle = 'rgba(255,255,255,1)';
            canvasContext.font = fontSize + "pt arial bold";//"pt bold Calibri, sans-serif";

            //fill canvas with text    
            for (i = 0; i < lineNumber; i++) {
                canvasContext.fillText(text[i], padding, padding + fontSize * (i + 1) + (i * lineSpace));
            }
            
            return gfxEngine.addTextPanel(canvas, position, name);
        },
        getSurfaceType: function() {
            return _surfaceType;
        },
        
        copyToClipboard : function(s) {
                if (window.clipboardData && clipboardData.setData) {
                          clipboardData.setData('text', s);
                }else console.log("browser does not support clipboard");
         },
         
         setZebraOn: function(b){
             _zebraOn = b;
         },
         
         getZebraOn: function(){
             return _zebraOn;
         },
         
         // DrawPlaneSpecific   ex pedestrian 
         initializeZebra: function(pt1,pt2){
             
            var geomPlane = new THREE.PlaneGeometry(4, 2, 1);
            geomPlane.dynamic = true;
            var texture = THREE.ImageUtils.loadTexture("images/zebra.png");
            var material = new THREE.MeshBasicMaterial({map:texture,side: THREE.DoubleSide, transparent:true, depthTest: false});
            _zebraMesh = new THREE.Mesh(geomPlane, material);//new THREE.MeshBasicMaterial({side: THREE.DoubleSide, color: 0xffffff, wireframe: false, depthTest: false, transparent: true, opacity: 0.5}));
            gfxEngine.addToScene(_zebraMesh);

            var m = (pt2.z - pt1.z) / (pt2.x - pt1.x);
            var vecNormal = new THREE.Vector3(-m,0,1).normalize(); 
            var widthZebra = 3; 
            var pt12 = pt1.clone().add(vecNormal.clone().multiplyScalar(widthZebra));
            var pt22 = pt2.clone().add(vecNormal.clone().multiplyScalar(widthZebra));

            var vertices = _zebraMesh.geometry.vertices;
            vertices[0] = pt1;
            vertices[1] = pt2;
            vertices[2] = pt12;
            vertices[3] = pt22;
         
            _zebraInitiated = true;
         },
         
         setZebraPosition: function(pt1,pt2,stay){
             
             if(_zebraOn){
                if(!_zebraInitiated || stay == 'ON') this.initializeZebra(pt1,pt2);
                else{
                    var m = (pt2.z - pt1.z) / (pt2.x - pt1.x);
                    var vecNormal = new THREE.Vector3(-m,0,1).normalize(); 
                    var widthZebra = 3; 
                    var pt12 = pt1.clone().add(vecNormal.clone().multiplyScalar(widthZebra));
                    var pt22 = pt2.clone().add(vecNormal.clone().multiplyScalar(widthZebra));
                    var vertices = _zebraMesh.geometry.vertices;
                    vertices[0] = pt1;
                    vertices[1] = pt2;
                    vertices[2] = pt12;
                    vertices[3] = pt22;
                    _zebraMesh.geometry.verticesNeedUpdate = true;
                }
            }
         },
         
         
         
         
         
         
        // LINE 3D NEW SHADER FOR ANGLE TOO ***************************************************************
        
        
        initializeBufferGeometry: function() {

            this.createShaderLine();
          
            var _currentNbPointsInBuffer = 0;
            _bufferGeometryLine = new THREE.BufferGeometry();
            _bufferGeometryLine.dynamic = true;

            _bufferGeometryLine.attributes = {
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
                }
            };
            
            this.initializeBufferValues();
        },
        
                
        initializeBufferValues: function() {

            var values_color = _bufferGeometryLine.attributes.color.array;
            var positions = _bufferGeometryLine.attributes.position.array;
            var displacements = _bufferGeometryLine.attributes.displacement.array;

            var color2 = new THREE.Color();
            color2.setHSL(0.2, 0.5, 0.7);
            // we set default properties: position, color, displacement
            var radius = 10;

            for (n = 0; n < _nbPointsBuffer; ++n) {

                positions[ n * 3 + 0 ] = 5;  // Camera far: 10000
                positions[ n * 3 + 1 ] = 5;  // so out of frustum
                positions[ n * 3 + 2 ] = 5;

                displacements[ n * 3 + 0 ] = (Math.random() * 2 - 1) * radius;
                displacements[ n * 3 + 1 ] = (Math.random() * 2 - 1) * radius;
                displacements[ n * 3 + 2 ] = (Math.random() * 2 - 1) * radius;

                values_color[ n * 3 + 0 ] = color2.r;
                values_color[ n * 3 + 1 ] = color2.g;
                values_color[ n * 3 + 2 ] = color2.b;
            }
            
        },
      
        
        
        
        createShaderLine: function() {

            var _shaderAttributes = {
                displacement: {type: 'v3', value: []},
                color: {type: 'v3', value: []},
            };

            var _shaderUniforms = {
                alpha: {type: 'f', value: 0.4},
                point_size: {type: 'f', value: 10.}
            };

            // create the shader material for the laser particle system
            // !!!!!  VERY IMPORTANT  Depthest : false to have a nice opacity in every direction
            // For BufferGeometry now we need to set everything here. Like transparent 
            _shaderLineMat = new THREE.ShaderMaterial({
                uniforms: _shaderUniforms,
                attributes: _shaderAttributes,
                vertexShader: Shader.shaders['shaderLine.vs'],
                fragmentShader: Shader.shaders['shaderLine.fs'],
                vertexColors: THREE.VertexColors,
                depthTest: false,
                side: THREE.DoubleSide,
                transparent: true
            });

        },

        
        drawLine3D: function(pt1,pt2){
            
             if(pt1==null){pt1 = new THREE.Vector3(0,0,0); pt2 = new THREE.Vector3(10,10,10);}
             
             this.initializeBufferGeometry();
  
            
             var geometryLinesIti = new THREE.Geometry();
             geometryLinesIti.vertices.push(pt1);
             geometryLinesIti.vertices.push(pt2);
             
             
             /*
                var lineMat = new THREE.LineBasicMaterial( { color: 0xaaff0f, opacity: 0.5, overdraw: true, transparent:true, depthTest:true,depthWrite : true, linewidth:4 } )
                var _lineIti = new THREE.Line(geometryLinesIti,lineMat,THREE.LinePieces);
                _lineIti.name = "lineIti";
                gfxEngine.addToScene(_lineIti);
             */
         
             //var _lineIti = new THREE.Mesh(_bufferGeometryLine,_shaderLineMat);//,THREE.LinePieces);//THREE.LineStrip);//THREE.LinePieces);
             var _lineIti = new THREE.Line(_bufferGeometryLine,_shaderLineMat);//matWire);//_shaderLineMat);
             gfxEngine.addToScene(_lineIti);


        
        
        THREE.PiecewiseLinearCurve3 = THREE.Curve.create(

            function ( points /* array of Vector3 */ ) {

                    this.points = (points == undefined) ? [] : points;

            },

            function ( t ) {

                    var points = this.points;

                    var d = ( points.length - 1 ) * t; // t should be clamped between 0 and 1

                    var index1 = Math.floor( d );
                    var index2 = ( index1 < points.length - 1 ) ? index1 + 1 : index1;

                    var	pt1 = points[ index1 ];
                    var	pt2 = points[ index2 ];

                    var weight = d - index1;

                    return new THREE.Vector3().copy( pt1 ).lerp( pt2, weight );

            }

          );

             // points
                    var points = [];
                    for( var i = 0; i < 38; i++ ) {
                            points.push( new THREE.Vector3( Math.cos( i * Math.PI / 3 ), i / 18 - 1, Math.sin( i * Math.PI / 3 ) ).multiplyScalar( 48 ) );
                    }

                    // path
                    var path = new THREE.PiecewiseLinearCurve3( points );

                    // params
                    var pathSegments = 1024; // must be a fairly big number to pass near corners
                    var tubeRadius = 0.2;
                    var radiusSegments = 8;
                    var closed = false;

                    // geometry
                    var geometry = new THREE.TubeGeometry( path, pathSegments, tubeRadius, radiusSegments, closed );

                    // material
                    var material = new THREE.MeshBasicMaterial( {
                            color: 0x4080ff, 
                            opacity: 0.4,
                            transparent: true,
                            side: THREE.DoubleSide,
                            depthTest:false
                    } );

                    // mesh
                   var  mesh = new THREE.Mesh( geometry, material );
                   gfxEngine.addToScene(mesh );
             
         /*    
           var  _particleSystem = new THREE.ParticleSystem(
                    _bufferGeometryLine,_shaderLineMat
                    );
            
            gfxEngine.addToScene(_particleSystem);
            */
        },
        
        
        
         drawLine3DTube: function(points){
             
              THREE.PiecewiseLinearCurve3 = THREE.Curve.create(

                    function ( points /* array of Vector3 */ ) {

                            this.points = (points == undefined) ? [] : points;
                    },

                    function ( t ) {

                            var points = this.points;

                            var d = ( points.length - 1 ) * t; // t should be clamped between 0 and 1

                            var index1 = Math.floor( d );
                            var index2 = ( index1 < points.length - 1 ) ? index1 + 1 : index1;

                            var	pt1 = points[ index1 ];
                            var	pt2 = points[ index2 ];

                            var weight = d - index1;

                            return new THREE.Vector3().copy( pt1 ).lerp( pt2, weight );

                    }
            );


            // path
            var path = new THREE.PiecewiseLinearCurve3( points );

            // params
            var pathSegments = 1024; // must be a fairly big number to pass near corners
            var tubeRadius = 0.5;
            var radiusSegments = 8;
            var closed = false;

            // geometry
            var geometry = new THREE.TubeGeometry( path, pathSegments, tubeRadius, radiusSegments, closed );

            // material
            var material = new THREE.MeshBasicMaterial( {
                    color: 0x4080ff, 
                    opacity: 0.8,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthTest:true
            } );

            // mesh
           var  mesh = new THREE.Mesh( geometry, material );
           return mesh;
           //gfxEngine.addToScene(mesh );


         }
        
        
        
         
         
         
         
         
         
    };


    return Draw;

});
