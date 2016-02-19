

    define (['GraphicEngine','jquery', 'three','Utils','ProjectiveTexturing','Ori','TileTexture','Draw','CVML','Cartography'],
        function(gfxEngine, $, THREE, Utils,  ProjectiveTexturing, Ori, TileTexture, Draw, CVML,Cartography) {




        var _geometry = null,
            _currentObject = {name:"not attributed"},
            _currentObjectToDrag = null,   // Object to drag with mouse3D
            _projectiveMaterial = null,
            _currentMeshForClickAndGo = null,  // Simplify mesh for faster search
            _visibility = true,

            //RGE
           _rgeCurrentPositionE  = 0.0,
           _rgeCurrentPositionN  = 0.0,
           _rgeLastPositionE     = 0.0,
           _rgeLastPositionN     = 0.0,
           _radius               = 250,//200,//400,
           _sizeCell  		 = 10, // Size grid cell , ex: 10 meters      
           
           //ROOF
           _meshRoof = null,
           
           //DTM
           _showDTM = false,
           _pivotGrid = new THREE.Vector3(),
           _gridDTM  = new Array(),  // From Bati
           _gridDTM2 = new Array(), // From Stereopolis
           _gridFES = new Array(),
           _geomDTM = null,
           _meshDTM = null,
           _meshCartoFES = null,  // TEMP to intersect with huge mesh carto
           
           //Carto
           _orthoPhotoOn = false,
           _sizeTile = 0,
           _topLeftCorner = {x:-20037508,y:20037508},
           _tabMapMesh = [],
           _roadOn = true,
           
           _urlBuildingFootprint = '',
           _urlDTM =''


        var Manager = {
           
            panoInfo:null,
            skyBox:null,  // Optional skybox while not at Camera original position
             
            init : function (info, options) {
                  
                _urlBuildingFootprint   = options.buildingFootprints;
                _urlDTM                 = options.DTM;
                
                if(gfxEngine.isMobileEnvironment()) _radius = 100;
                this.panoInfo           = info;
                _rgeCurrentPositionE    = info.easting;
                _rgeCurrentPositionN    = info.northing;
                _rgeLastPositionE       = _rgeCurrentPositionE;
                _rgeLastPositionN       = _rgeCurrentPositionN;
                
                 this.loadAndCreateMeshFromDB();
            },

           updateDataFromRGE: function(){
               //console.log('updateDataFromRGE');
                 //check if data loading is necessary for this move!
                var  info = this.panoInfo;
                     _rgeCurrentPositionE  = info.easting;
                     _rgeCurrentPositionN  = info.northing;
                 var dist = Math.sqrt((_rgeCurrentPositionE - _rgeLastPositionE)*(_rgeCurrentPositionE - _rgeLastPositionE) +
                                      (_rgeCurrentPositionN - _rgeLastPositionN)*(_rgeCurrentPositionN - _rgeLastPositionN));
                 
                 // If we go to the limit of the exsting RGE loaded we load a new area
                 if(dist >= _radius*0.8){  
                      console.log('load NEW RGE DATA');
                      if(_tabMapMesh.length>0) this.removeMapMeshes();  // Carto
                    
                      this.getDTMFromTrajectory();
                      //this.searchPolygonBatiAround(_rgeCurrentPositionE,_rgeCurrentPositionN,_radius);
                      //update last position
                      _rgeLastPositionE = _rgeCurrentPositionE;
                      _rgeLastPositionN = _rgeCurrentPositionN;
                     
                      
                 }            
           },
           
           forceUpdateRGE: function(){
               
                 console.log("forceUpdateRGE");
                 var  info = this.panoInfo;
                     _rgeCurrentPositionE  = info.easting;
                     _rgeCurrentPositionN  = info.northing;

                 this.searchPolygonBatiAround(_rgeCurrentPositionE,_rgeCurrentPositionN,_radius);
                      //update last position
                 _rgeLastPositionE = _rgeCurrentPositionE;
                 _rgeLastPositionN = _rgeCurrentPositionN;
             
           },

           loadAndCreateMeshFromDB: function(){
               this.getDTMFromTrajectory();
             //  this.searchPolygonBatiAround(_rgeCurrentPositionE,_rgeCurrentPositionN,_radius);
           },

           // Load jsut Cubic geometry for new cam configuration
           loadAndCreateMeshFromDBNewCam: function(){
             this.createGeometry3DfromPoly2([]);
           },


           /*
            * @documentation: Search for bati footprint in PostGIS or WFS around position and launch on callback the creation of the mesh
            * @param {type} easting
            * @param {type} northing
            * @param {type} radius
            */
           searchPolygonBatiAround: function(easting, northing ,radius){
               var that= this;
               /*
               var options = {
                    bottomLeft : new THREE.Vector2(easting - radius, northing - radius),
                    topRight   : new THREE.Vector2(easting + radius, northing + radius),
                    key        : "72hpsel8j8nhb5qgdh07gcyp",
                    service    : "service=WFS&version=2.0.0&REQUEST=GetFeature&typeName=BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie"
				}
                    
                var url = " http://wxs.ign.fr/{key}/geoportail/wfs?{service}&srsName=EPSG:2154&bbox={bottomLeft.x},{bottomLeft.y},{topRight.x},{topRight.y},EPSG:2154&outputFormat=json";
                */
               url = _urlBuildingFootprint;
               $.getJSON(url, function (data){ that.createGeometry3DfromPoly(data,true); });
          },
          
        

         

          generatePointOnCircle : function (centerx, centery, circleradius, totalpoints, startangle, arc, pointdirection) {
                startangle = startangle || 0;
                arc = arc || 360;
                pointdirection = pointdirection || "clockwise";
               
                var pts = [];
                var diameter = circleradius*2;

                var mpi = Math.PI/180;
                var startRadians = 0 * mpi;

                var incrementAngle = arc/totalpoints;
                var incrementRadians = incrementAngle * mpi;


                while(totalpoints--) {
                    var xp = centerx + Math.sin(startRadians) * circleradius;
                    var yp = centery + Math.cos(startRadians) * circleradius;
                    pts.push({x:xp, y:yp});

                    if(pointdirection=="antiClockwise") {
                        startRadians += incrementRadians;
                    } else {
                        startRadians -= incrementRadians;
                    }
                }

                return pts;
          },
          
          

          // [{"geom":"POLYGON((651317.7 6861303.4,651317.3 6861308.8,651308.6 6861304.1,651308.6 6861302.4,651317.7 6861303.4))","h":"3.7","alti":"38"}...]
          createGeometry3DfromPoly: function(data,WFSOption){

              _geometry = new THREE.Geometry();
              var geometry = new THREE.Geometry();  // for the roof
              var geometryClickToGo = new THREE.Geometry();  // facades with Simple road  (no dtm)
              var heightApplanixOnTruck = 2;
              var zero = gfxEngine.getZeroAsVec3D();
              var altiSolTruck = this.panoInfo.altitude - zero.y - heightApplanixOnTruck;
              var radiusMarge = _radius + 100;
              var suppHauteur = 10;   // So we don't cut the roof
              
              if(WFSOption){
                
                var features = data.features; 
                for( var r = 0 ; r <features.length ; r++){
                 
                    var hauteur       = (features[r].properties.hauteur + suppHauteur) || 0;
                    var altitude_sol  = 0;//curRow.alti - zero.y || altiSolTruck;
                    var polygon       = features[r].geometry.coordinates[0][0];
                  
                    if(polygon.length > 2){

                                var strHex = 0xffffff;   //'#'+Math.floor(Math.random()*16777215).toString(16);                              
                                var arrPoint2D = [];
                               
                                // VERTICES
                                for(var j=0; j< polygon.length -1; ++j){
                                   
                                    var pt2DTab   = polygon[j];   //.split(' ');
                                    var p1  = new THREE.Vector3(parseFloat(pt2DTab[0]) - zero.x, 0, parseFloat(pt2DTab[1]) -  zero.z);
                                   
                                   // NEW: GET ALTI FROM GENERATED DTM
                                   var indx = Math.floor((p1.x - _pivotGrid.x + radiusMarge)/10);
                                   var indy = Math.floor((p1.z - _pivotGrid.z + radiusMarge)/10);
                                   if(indx >0 && indx < _gridDTM2.length && indy>0 && indy<_gridDTM2.length){
                                       altitude_sol = _gridDTM2[indx][indy];
                                   }

                                   var vector3_1 = new THREE.Vector3(p1.x,altitude_sol,p1.z);
                                   var vector3_2 = new THREE.Vector3(p1.x,altitude_sol+hauteur,p1.z);
                                   arrPoint2D.push(CVML.newPoint(p1.x,p1.z)); //for roof
                                   _geometry.vertices.push(vector3_1,vector3_2);
                                }
                               
                               
                                // FACES
                                // indice of the first point of the polygon 3D
                                for(var k = _geometry.vertices.length - ((polygon.length -1)* 2); k< _geometry.vertices.length ; k=k+2){

                                     var l = k;   // % (pts2DTab.length);
                                     if(l>_geometry.vertices.length-4){
                                         l = _geometry.vertices.length - ((polygon.length -1) * 2);
                                     }
                                     _geometry.faces.push(new THREE.Face3(l, l + 1, l + 3));
                                     _geometry.faces.push(new THREE.Face3(l, l + 3, l + 2));
                                 }
                                 
                                 var ll = _geometry.vertices.length - ((polygon.length -1)* 2);
                                 _geometry.faces.push(new THREE.Face3(ll, ll +1, _geometry.vertices.length-1));
                                 _geometry.faces.push(new THREE.Face3(ll, _geometry.vertices.length-1, _geometry.vertices.length-2));
                                   
                  }

                 //**************** ROOF ****************************
                               var triangles = CVML.TriangulatePoly(arrPoint2D);
                               //var geometry = new THREE.Geometry();  // for the roof
                               triangles.forEach(function(t) {
                                   
                                   var pt1  = t.getPoint(0),  
                                       pt2  = t.getPoint(1),
                                       pt3  = t.getPoint(2);

                                   //var geometry = new THREE.Geometry();
                                   geometry.vertices.push(new THREE.Vector3(pt1.x, altitude_sol + hauteur,pt1.y));
                                   geometry.vertices.push(new THREE.Vector3(pt2.x, altitude_sol + hauteur,pt2.y));
                                   geometry.vertices.push(new THREE.Vector3(pt3.x, altitude_sol + hauteur,pt3.y));

                                   var face = new THREE.Face3(            
                                                             geometry.vertices.length -3,
                                                             geometry.vertices.length -2,
                                                             geometry.vertices.length -1
                                   );
                                   geometry.faces.push(face);
     
                                });
   
                        }
                  
                  
              } else{
                  

                for( var r = 0 ; r <data.length ; r++){

                      var curRow = data[r];
                      var polygonArray  = curRow.geom.replace("POLYGON((" ,'').replace("))",'');
                          polygonArray  = polygonArray.split('),(');
                      var polygon       = polygonArray[0].split(',');

                      var hauteur      = (curRow.h + suppHauteur) || 0;
                      var altitude_sol = curRow.alti - zero.y || altiSolTruck;

                      if(polygon.length > 2){

                                  var strHex = 0xffffff;   //'#'+Math.floor(Math.random()*16777215).toString(16);                              
                                  var arrPoint2D = [];

                                  // VERTICES
                                  for(var j=0; j< polygon.length -1; ++j){

                                      var pt2DTab   = polygon[j].split(' ');
                                      var p1  = new THREE.Vector3(parseFloat(pt2DTab[0]) - zero.x, 0, parseFloat(pt2DTab[1]) -  zero.z);

                                     // NEW: GET ALTI FROM GENERATED DTM
                                     var indx = Math.floor((p1.x - _pivotGrid.x + radiusMarge)/10);
                                     var indy = Math.floor((p1.z - _pivotGrid.z + radiusMarge)/10);
                                     if(indx >0 && indx < _gridDTM2.length && indy>0 && indy<_gridDTM2.length){
                                         altitude_sol = _gridDTM2[indx][indy];
                                     }

                                     var vector3_1 = new THREE.Vector3(p1.x,altitude_sol,p1.z);
                                     var vector3_2 = new THREE.Vector3(p1.x,altitude_sol+hauteur,p1.z);
                                     arrPoint2D.push(CVML.newPoint(p1.x,p1.z)); //for roof
                                     _geometry.vertices.push(vector3_1,vector3_2);
                                  }


                                  // FACES
                                  // indice of the first point of the polygon 3D
                                  for(var k = _geometry.vertices.length - ((polygon.length -1)* 2); k< _geometry.vertices.length ; k=k+2){

                                       var l = k;   // % (pts2DTab.length);
                                       if(l>_geometry.vertices.length-4){
                                           l = _geometry.vertices.length - ((polygon.length -1) * 2);
                                       }
                                       _geometry.faces.push(new THREE.Face3(l, l + 1, l + 3));
                                       _geometry.faces.push(new THREE.Face3(l, l + 3, l + 2));
                                   }

                                   var ll = _geometry.vertices.length - ((polygon.length -1)* 2);
                                   _geometry.faces.push(new THREE.Face3(ll, ll +1, _geometry.vertices.length-1));
                                   _geometry.faces.push(new THREE.Face3(ll, _geometry.vertices.length-1, _geometry.vertices.length-2));

                    }

                   //**************** ROOF ****************************
                                 var triangles = CVML.TriangulatePoly(arrPoint2D);
                                 //var geometry = new THREE.Geometry();  // for the roof
                                 triangles.forEach(function(t) {

                                     var pt1  = t.getPoint(0),  
                                         pt2  = t.getPoint(1),
                                         pt3  = t.getPoint(2);

                                     //var geometry = new THREE.Geometry();
                                     geometry.vertices.push(new THREE.Vector3(pt1.x, altitude_sol + hauteur,pt1.y));
                                     geometry.vertices.push(new THREE.Vector3(pt2.x, altitude_sol + hauteur,pt2.y));
                                     geometry.vertices.push(new THREE.Vector3(pt3.x, altitude_sol + hauteur,pt3.y));

                                     var face = new THREE.Face3(            
                                                               geometry.vertices.length -3,
                                                               geometry.vertices.length -2,
                                                               geometry.vertices.length -1
                                     );
                                     geometry.faces.push(face);

                                  });

                          }
                    }

                        if(_meshRoof) gfxEngine.removeFromScene(_meshRoof);
                        _meshRoof = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color: strHex, transparent: true, opacity:0.6 }));
                        _meshRoof.geometry.verticesNeedUpdate = true;
                        _meshRoof.material.side = THREE.DoubleSide;
                        _meshRoof.visible = _visibility;  // So if panoramic is hidden, the roof too
                        gfxEngine.addToScene(_meshRoof);


       //*** ROAD  *** Let s add a road if(roadOn)
                var centerTruckX = this.panoInfo.easting  - gfxEngine.getZeroAsVec3D().x;
                var centerTruckY = this.panoInfo.altitude - gfxEngine.getZeroAsVec3D().y;
                var centerTruckZ = this.panoInfo.northing - gfxEngine.getZeroAsVec3D().z;
               
                geometryClickToGo = _geometry.clone();
                
                if(_roadOn){  // AND CUBE
                   
                  // Version using SIMPLE PLANE ROAD for Click and Go
                       var roadLength = 500
                       geometryClickToGo.vertices.push(new THREE.Vector3(centerTruckX-roadLength,altiSolTruck,centerTruckZ-roadLength),
                               new THREE.Vector3(centerTruckX-roadLength,altiSolTruck,centerTruckZ+roadLength),
                               new THREE.Vector3(centerTruckX+roadLength,altiSolTruck,centerTruckZ+roadLength),
                               new THREE.Vector3(centerTruckX+roadLength,altiSolTruck,centerTruckZ-roadLength)
                           );

                       var len = geometryClickToGo.vertices.length;
                       geometryClickToGo.faces.push( new THREE.Face3( len-4,len-3,len-2));
                       geometryClickToGo.faces.push( new THREE.Face3( len-4,len-2,len-1));
                       
                   
                // NEW DTM ROAD
                        var len = _geometry.vertices.length;
                        var geom = _meshDTM.geometry;
                        for(var a=0;a<geom.vertices.length;++a){
                           // if(geom.vertices[a].y !=0)
                             _geometry.vertices.push(geom.vertices[a]);
                        }

                        for( a=0;a<geom.faces.length;++a){
                            var f = geom.faces[a];
                            _geometry.faces.push(new THREE.Face3(f.a+len,f.b+len,f.c+len));
                        }

    //**** CUBE   Let s add a big cube around position so we are sure to texture everywhere around the cameras
                var cubeSize = 5000; // Coordinate from panoramic cam center and cube edges (in 2D) Half
                var a,b,c,d,e,f,g,h;
                a = new THREE.Vector3(centerTruckX-cubeSize,centerTruckY-cubeSize,centerTruckZ-cubeSize);
                b = new THREE.Vector3(centerTruckX-cubeSize,centerTruckY+cubeSize,centerTruckZ-cubeSize);
                c = new THREE.Vector3(centerTruckX+cubeSize,centerTruckY+cubeSize,centerTruckZ-cubeSize);
                d = new THREE.Vector3(centerTruckX+cubeSize,centerTruckY-cubeSize,centerTruckZ-cubeSize);
                e = new THREE.Vector3(centerTruckX-cubeSize,centerTruckY+cubeSize,centerTruckZ+cubeSize);
                f = new THREE.Vector3(centerTruckX+cubeSize,centerTruckY+cubeSize,centerTruckZ+cubeSize);
                g = new THREE.Vector3(centerTruckX+cubeSize,centerTruckY-cubeSize,centerTruckZ+cubeSize);
                h = new THREE.Vector3(centerTruckX-cubeSize,centerTruckY-cubeSize,centerTruckZ+cubeSize);
                _geometry.vertices.push(a,b,c,d,e,f,g,h);
                len = _geometry.vertices.length;

                _geometry.faces.push( new THREE.Face3( len-1,len-2,len-3));
                _geometry.faces.push( new THREE.Face3( len-1,len-3,len-4));
                _geometry.faces.push( new THREE.Face3( len-6,len-3,len-2));
                _geometry.faces.push( new THREE.Face3( len-6,len-2,len-5));
                _geometry.faces.push( new THREE.Face3( len-8,len-7,len-6));
                _geometry.faces.push( new THREE.Face3( len-8,len-6,len-5));
                _geometry.faces.push( new THREE.Face3( len-8,len-7,len-4));
                _geometry.faces.push( new THREE.Face3( len-8,len-4,len-1));
                _geometry.faces.push( new THREE.Face3( len-7,len-6,len-3));
                _geometry.faces.push( new THREE.Face3( len-7,len-3,len-4));
                _geometry.faces.push( new THREE.Face3( len-8,len-5,len-2));
                _geometry.faces.push( new THREE.Face3( len-8,len-2,len-1));
            }
    //***********************************************************************************************************     
                console.log("RGE Bati loaded and transformed to mesh OK");
  
                _geometry.computeFaceNormals();  // WARNING : VERY IMPORTANT WHILE WORKING WITH RAY CASTING ON CUSTOM MESH

                geometryClickToGo.computeFaceNormals();
                var mat = new THREE.MeshBasicMaterial({color:0xff00ff});
                mat.side = THREE.DoubleSide;
                _currentMeshForClickAndGo  = new THREE.Mesh(geometryClickToGo,mat);

                // 5 cameras configuration
                if(!ProjectiveTexturing.isInitiated()){
                    
                    console.log('ProjectiveTexturing init ');
                    var mat = new THREE.MeshBasicMaterial({color:0xff00ff});
                    var mesh  = new THREE.Mesh(_geometry,mat);
                    mat.side = THREE.DoubleSide;
                    mesh.name = "RGE";
                    _currentObject = mesh;

                    var matRotation = Ori.computeMatOriFromHeadingPitchRoll(
                                        this.panoInfo.heading,
                                        this.panoInfo.pitch,
                                        this.panoInfo.roll
                                    );

                    ProjectiveTexturing.init();
                    _projectiveMaterial = ProjectiveTexturing.createShaderMat(this.panoInfo,matRotation);
                    mesh.material = _projectiveMaterial;
                    mesh.material.side = THREE.DoubleSide;  
                    mesh.material.transparent = false;
                    mesh.visible = _visibility;                      

                }else {
                    
                    //remove older rge in scene
                    console.log('ProjectiveTexturing  ');
                    gfxEngine.removeFromScene(_currentObject);  console.log('remove old mesh');
                   // var mesh  = new THREE.Mesh(_geometry, _projectiveMaterial);
                    var mesh  = new THREE.Mesh(_geometry, ProjectiveTexturing.getShaderMat());
                    mesh.material.side = THREE.DoubleSide;  
                    mesh.material.transparent = false;
                    mesh.name = "RGE";
                    mesh.visible = _visibility;
                    _currentObject = mesh;

                }
                   
                
                
                 gfxEngine.addToScene(_currentObject);
                 this.setRoadOn(true);

                 allInitialized = true;  // End of initializing all (geometry, intriseq param etc)
                    
            },
               
               
               
            // Simple cube geometry for a fast texturing while no RGE (or not yet loaded)
            initGeometryWithCube: function(matRot){
               
                var heightCamOnTruck = 2;
                var alti = this.panoInfo.altitude - gfxEngine.getZeroAsVec3D().y - heightCamOnTruck;
                _geometry = new THREE.Geometry();
               
     //****** Let s add a road
                var centerTruckX = this.panoInfo.easting  - gfxEngine.getZeroAsVec3D().x;
                var centerTruckY = this.panoInfo.altitude - gfxEngine.getZeroAsVec3D().y;
                var centerTruckZ = this.panoInfo.northing - gfxEngine.getZeroAsVec3D().z;
               
                var roadLength = 500
                _geometry.vertices.push(new THREE.Vector3(centerTruckX-roadLength,alti,centerTruckX-roadLength),
                    new THREE.Vector3(centerTruckX-roadLength,alti,centerTruckX+roadLength),
                    new THREE.Vector3(centerTruckX+roadLength,alti,centerTruckX+ roadLength),
                    new THREE.Vector3(centerTruckX+roadLength,alti,centerTruckX-roadLength)
                );
              var len = _geometry.vertices.length;
                _geometry.faces.push( new THREE.Face4( len-4,len-3,len-2,len-1) );//new THREE.Face4( len-1,len-2,len-3,len-4) );

    //**** CUBE   Let s add a big cube around position so we are sure to texture everywhere around the cameras
                var cubeSize = 5000; // Coordinate from panoramic cam center and cube edges (in 2D) Half
                var a,b,c,d,e,f,g,h;
                a = new THREE.Vector3(centerTruckX-cubeSize,centerTruckY-cubeSize,centerTruckZ-cubeSize);
                b = new THREE.Vector3(centerTruckX-cubeSize,centerTruckY+cubeSize,centerTruckZ-cubeSize);
                c = new THREE.Vector3(centerTruckX+cubeSize,centerTruckY+cubeSize,centerTruckZ-cubeSize);
                d = new THREE.Vector3(centerTruckX+cubeSize,centerTruckY-cubeSize,centerTruckZ-cubeSize);
                e = new THREE.Vector3(centerTruckX-cubeSize,centerTruckY+cubeSize,centerTruckZ+cubeSize);
                f = new THREE.Vector3(centerTruckX+cubeSize,centerTruckY+cubeSize,centerTruckZ+cubeSize);
                g = new THREE.Vector3(centerTruckX+cubeSize,centerTruckY-cubeSize,centerTruckZ+cubeSize);
                h = new THREE.Vector3(centerTruckX-cubeSize,centerTruckY-cubeSize,centerTruckZ+cubeSize);
                _geometry.vertices.push(a,b,c,d,e,f,g,h);
                len = _geometry.vertices.length;
                _geometry.faces.push( new THREE.Face4( len-1,len-2,len-3,len-4) );
                _geometry.faces.push( new THREE.Face4( len-6,len-3,len-2,len-5) );
                _geometry.faces.push( new THREE.Face4( len-8,len-7,len-6,len-5) );
                _geometry.faces.push( new THREE.Face4( len-8,len-7,len-4,len-1) );
                _geometry.faces.push( new THREE.Face4( len-7,len-6,len-3,len-4) );
                _geometry.faces.push( new THREE.Face4( len-8,len-5,len-2,len-1) );
    //***********************************************************************************************************            

                _geometry.computeFaceNormals();  // WARNING : VERY IMPORTANT WHILE WORKING WITH RAY CASTING ON CUSTOM MESH
               
               
                 if(!ProjectiveTexturing.isInitiated()){

                    var mat = new THREE.MeshBasicMaterial({color:0xff00ff});
                    var mesh  = new THREE.Mesh(_geometry,mat);
                    mat.side = THREE.DoubleSide;
                    mesh.name = "RGE";
                    _currentObject = mesh;

                    ProjectiveTexturing.init();
                    _projectiveMaterial = ProjectiveTexturing.createShaderMat(this.panoInfo.filename,50);
                    mesh.material = _projectiveMaterial;
                    mesh.material.side = THREE.DoubleSide;  // SEE IF BETTER TO HAVE ANOTHER MESH (CLONE) TO TEXTURE SIMPLE SIDE
                    mesh.material.transparent = true;
                    mesh.visible = _visibility;  
                    gfxEngine.addToScene(_currentObject);

                }else {
                    //remove older rge in scene
                    gfxEngine.removeFromScene(_currentObject);  console.log('remove old mesh');
                    var mesh  = new THREE.Mesh(_geometry, _projectiveMaterial);
                    mesh.material.side = THREE.DoubleSide;  // SEE IF BETTER TO HAVE ANOTHER MESH (CLONE) TO TEXTURE SIMPLE SIDE
                    mesh.material.transparent = true;
                    mesh.name = "RGE";
                    mesh.visible = _visibility;
                    _currentObject = mesh;
                    gfxEngine.addToScene(_currentObject);
                }
                 
     
             },
             
       
       //**************************************************** DTM **************************************
       
            getDTMFromTrajectory: function(){
                var that = this;
                var urlRequest = _urlDTM; // format({ easting : this.panoInfo.easting, northing:this.panoInfo.northing, radius:_radius});
                $.getJSON(urlRequest, function (data){
                        that.createDTMFromTrajectory(data,that.panoInfo);
                    });
            },


            createDTMFromTrajectory: function(data,info){
 
                var radiusMarge = _radius + 100;
                var heightApplanixOnTruck = 2.1;
                var zero = gfxEngine.getZeroAsVec3D();
                _pivotGrid = new THREE.Vector3(
                                 info.easting  - zero.x,
                                 info.altitude - zero.y,
                                 info.northing - zero.z
                );  
                     
                var sideGrid = Math.floor(radiusMarge * 2 / 10);  
                for(var i=0; i< sideGrid; ++i){
                     _gridDTM2[i] = new Array();
                     for(var j=0; j<sideGrid; ++j){
                         _gridDTM2[i][j] = 0;
                    }
                }
                 
                 
                for( i = 0 ; i <data.length ; ++i){
                
                    var pos = data[i];
                    pos.h -= zero.y /*+ _pivotGrid.y*/ + heightApplanixOnTruck;
                    pos.e -= zero.x + _pivotGrid.x;
                    pos.n -= zero.z + _pivotGrid.z;
                   
                   _gridDTM2[Math.floor((pos.e +radiusMarge)/_sizeCell)][Math.floor((pos.n + radiusMarge)/_sizeCell)] = pos.h;
                }
               
                //this.showGridDTM(_gridDTM2);
                this.smoothGrid(_gridDTM2);
            },
           
           
            // test with all cell is the average of neighbour (>8 connex)
            // TOREDO!
            smoothGrid: function(grid){
               
                console.log("smoothGrid");
                var newGrid = new Array();
                var size  = grid.length;
                var radiusMarge = _radius + 100;
               
                for(var i=0; i<size; ++i){
                     newGrid[i] = new Array();
                     for(var j=0; j<size; ++j){
                         newGrid[i][j] = -2;  // was 0 but as applanix is 2meters overground, if no info -2 is better
                    }
                 }
                 
             
                for( var i=3; i<grid.length-3; i+=1){
                     for( var j=3; j<grid.length-3; j+=1){
                         
                         var som=0;
                         var n=0;
                         var lastAlti = -1000;
                         for(var a=-3; a<=3;++a){
                               for(var b=-3; b<=3;++b){
                                   
                                   var alti = grid[i+a][j+b];
                                   if( alti != 0){   // Don't take into account where no information
                                       
                                        if(Math.abs(alti - lastAlti)>0.3){    // Check if same alti as last dont count (Todo: coef:weight)
                                            som+=alti;
                                            n++;
                                            lastAlti = alti;
                                        }
                                   }
                               }
                         }
                         if(n!=0) newGrid[i][j] = som/n;
                       
                     }
                }
               
               
                // SHOW
                 var geometry = new THREE.Geometry();
                 
                 for(var i=0; i<grid.length; ++i){
                     for(var j=0; j<grid[0].length; ++j){
                         
                         var pos1 = new THREE.Vector3(i*_sizeCell-radiusMarge + _pivotGrid.x, newGrid[i][j]/*+ _pivotGrid.y*/, j*_sizeCell - radiusMarge + _pivotGrid.z);
                         geometry.vertices.push(pos1);
                    }
                 }
                 
                 for(var a=0;a<geometry.vertices.length;++a){
                     
                     if(a < geometry.vertices.length - grid.length -1 && ((a +1) % grid.length !=0)){
                         geometry.faces.push( new THREE.Face3( a, a+1, a+grid.length) );
                         geometry.faces.push( new THREE.Face3( a+1, a+1+grid.length, a+grid.length) );
                     }
                 }
                 
                 
                 geometry.computeFaceNormals();
                 
                 var mat = new THREE.MeshBasicMaterial({color:Math.random() * 0xffffff, wireframe:true});
                 mat.side = THREE.DoubleSide;
                 
                if(_showDTM){
                       if(_meshDTM) gfxEngine.removeFromScene(_meshDTM);
                //_meshDTM = new THREE.Mesh(geometry, mat);
                      _meshDTM = new THREE.Mesh(geometry.clone(), mat);
                      gfxEngine.addToScene(_meshDTM);   //   DISPLAY DTM
                }else{
                   _meshDTM = new THREE.Mesh(geometry, mat);
                }
     
               
                _gridDTM2 = newGrid;
                _geomDTM = geometry;
                   
                // var currentPos = {x:this.panoInfo.easting , y: this.panoInfo.northing };
                // this.generateCartoPlane({x:currentPos.x-200,y:currentPos.y+ 200} ,19,10,"ORTHOIMAGERY.ORTHOPHOTOS.PARIS","png",-1);

               //  THEN LAUNCH BATI ETC
                this.searchPolygonBatiAround(_rgeCurrentPositionE,_rgeCurrentPositionN,_radius);
                
                  
                // We create Map and effect is ortho is activated
                if (this.getOrthoPhotoOn()) {
                    this.removeMapMeshes();  // Carto

                    var layer = "ORTHOIMAGERY.ORTHOPHOTOS.PARIS";
                    var info = this.panoInfo;
                    if (info.easting > 656000 || info.easting < 640000 || info.northing > 6869000 || info.northing < 6860000)
                        layer = "ORTHOIMAGERY.ORTHOPHOTOS";

                    var currentPos = {x: info.easting, z: info.northing};
                    this.generateCartoPlane({x: currentPos.x, y: currentPos.z}, 18, 10, layer, "jpeg",128);

                }
               
            },


             initGridDTM: function(size){
                 
                 for(var i=0; i<size; ++i){
                     _gridDTM[i] = new Array();
                     for(var j=0; j<size; ++j){
                         _gridDTM[i][j] = 0;
                    }
                 }
             },
             
        
            
             // Doesn t recreate if already done
             generateSkyBox: function(){
             
               if(this.skyBox == null ){
                   
                    var urls = [
                        //'images/textures/skybox/px.jpg',
                        '../../images/textures/skybox/px.jpg',
                        '../../images/textures/skybox/nx.jpg',
                        '../../images/textures/skybox/py.jpg',
                        '../../images/textures/skybox/ny.jpg',
                        '../../images/textures/skybox/pz.jpg',
                        '../../images/textures/skybox/nz.jpg'
                    ];

                    var cubemap = THREE.ImageUtils.loadTextureCube(urls); // load textures
                    cubemap.format = THREE.RGBFormat;

                    var shader = THREE.ShaderLib['cube']; // init cube shader from built-in lib
                    shader.uniforms['tCube'].value = cubemap; // apply textures to shader

                    // create shader material
                    var skyBoxMaterial = new THREE.ShaderMaterial( {
                      fragmentShader: shader.fragmentShader,
                      vertexShader: shader.vertexShader,
                      uniforms: shader.uniforms//,
                      //depthWrite: false//,
                      //side: THREE.BackSide
                    });

                    // create skybox mesh
                    this.skyBox = new THREE.Mesh(
                      new THREE.CubeGeometry(8000, 8000, 8000),
                      skyBoxMaterial
                    );
                }
                
                 gfxEngine.addToScene( this.skyBox );
                 //this.skyBox.position.y = 1000;
                 
            },
           
           
            removeSkyBox: function(){
                gfxEngine.removeFromScene(this.skyBox);
            },
            
            
            setSkyBoxVisibility: function(b){
                if(this.skyBox && b) this.generateSkyBox();
                if(this.skyBox) this.skyBox.visible = b;
            },
       
       
          // ******************************** carto Plane 3D********************************************    
          // WMS LAMB93
         generateCartoPlane: function(pos,level,radius,layer,format,sizeTileMeters){
                   
                  this.removeMapMeshes();  // first remove existing carto
                 // The size of tiles in meters will give the precision of ortho. smaller -> higher precision
                  var sizeTileMeters =  sizeTileMeters || 164;//128;
                  var nbTiles = 8;
                  var sizeTilePx = 256;
                  pos.x -= (sizeTileMeters * nbTiles)/2;
                  pos.y -= (sizeTileMeters * nbTiles)/2;
                  var sizeCell = 10; //10 m grids default
                 
                  var posLocal = {x:pos.x - gfxEngine.getZero().x, y:pos.y - gfxEngine.getZero().z };
                  console.log(posLocal);

                  // We then launch the creation of the TileTexture (composed of 8*8 tiles) with the 4 corners position for the mesh  
                  var tileTexture = new TileTexture("name",layer,format,posLocal,sizeTileMeters,sizeTilePx,nbTiles,_geomDTM,_pivotGrid, _gridDTM2.length, _radius+100, Config.geoAPIKey,sizeCell);

                  tileTexture.createTilesList(pos,sizeTileMeters);
                  tileTexture.loadTilesFromList();
                 
                  gfxEngine.addToScene(tileTexture.meshNest);
                  _tabMapMesh.push(tileTexture.meshNest);
             },
 
 
// SPECIFIC VERSION for Futur En Seine. All paris using 2 triangles    ***************************************************
          generateCartoPlanePARIS: function(pos,level,radius,layer,format){
                   
               //   this.removeMapMeshes();  // first remove existing carto
                 // The size of tiles in meters will give the precision of ortho. smaller -> higher precision
                  var sizeTileMeters =  1000;//128;
                  var nbTiles = 8;
                  var sizeTilePx = 256;
                  pos.x -= (sizeTileMeters * nbTiles)/2;
                  pos.y -= (sizeTileMeters * nbTiles)/2;
                 
                  var posLocal = {x:pos.x - gfxEngine.getZero().x, y:pos.y - gfxEngine.getZero().z };
                  console.log(posLocal);
                  
                  
                  
                  // Create a very simple grid
				  var  info = this.panoInfo;
				  var localRadius = 4500;
          	      var radiusMarge = localRadius + 100;
          	      var sizeCell = 400;
             	  var heightApplanixOnTruck = 2.1;
             	  var zero = gfxEngine.getZeroAsVec3D();
             	  _pivotGrid = new THREE.Vector3(
                                 info.easting  - zero.x,
                                 info.altitude - zero.y,
                                 info.northing - zero.z
                  );  
                     
	                var sideGrid = Math.floor(radiusMarge * 2 / sizeCell);  
	                for(var i=0; i< sideGrid; ++i){
	                     _gridFES[i] = new Array();
	                     for(var j=0; j<sideGrid; ++j){
	                         _gridFES[i][j] = -20;
	                    }
	                }
	                
	                
	                            // SHOW
                 var geometry = new THREE.Geometry();
                 
                 for(var i=0; i<_gridFES.length; ++i){
                     for(var j=0; j<_gridFES.length; ++j){
                         
                         var pos1 = new THREE.Vector3(i*sizeCell-radiusMarge + _pivotGrid.x, _gridFES[i][j]/*+ _pivotGrid.y*/, j*sizeCell - radiusMarge + _pivotGrid.z);
                         geometry.vertices.push(pos1);
                    }
                 }
                 
                 for(var a=0;a<geometry.vertices.length;++a){
                     
                     if(a < geometry.vertices.length - _gridFES.length -1 && ((a +1) % _gridFES.length !=0)){
                         geometry.faces.push( new THREE.Face3( a, a+1, a+_gridFES.length) );
                         geometry.faces.push( new THREE.Face3( a+1, a+1+_gridFES.length, a+_gridFES.length) );
                     }
                 }
                 
                 
                 geometry.computeFaceNormals();
          /*       
                 var mat = new THREE.MeshBasicMaterial({color:Math.random() * 0xffffff, wireframe:true});
                 mat.side = THREE.DoubleSide;
                 
                 var meshDTM = new THREE.Mesh(geometry, mat);
                 gfxEngine.addToScene(meshDTM);
        */         

	             
                  // We then launch the creation of the TileTexture (composed of 8*8 tiles) with the 4 corners position for the mesh  
                  var tileTexture = new TileTexture("name",layer,format,posLocal,sizeTileMeters,sizeTilePx,nbTiles,geometry,_pivotGrid, _gridFES.length, localRadius+100, Config.geoAPIKey,sizeCell);
                        
                  tileTexture.createTilesList(pos,sizeTileMeters);
                  tileTexture.loadTilesFromList();
                  _meshCartoFES = tileTexture.meshNest;
                  gfxEngine.addToScene(_meshCartoFES);
               //   _tabMapMesh.push(tileTexture.meshNest);
             },
             
             
             
             setVisibilityParisOrtho: function(b){
                 _meshCartoFES.visible = b;
                 
             },
             
             getMeshFES : function(){
                 return _meshCartoFES;
             },
       
             generateCartoPlaneWMTSMercator: function(pos,level,radius,layer,format,alti){

             // We need to compute the size of the tiles (depends on level) in meters mercator sys
                  _sizeTile = Cartography.computeSizeTile(level);

            //   We need to get to position of the tileTexture around our position in lamb93
                  var tileInfo = Cartography.getTileCoordAtPos(pos,_sizeTile);
                  var tilePosX = tileInfo.x *_sizeTile + _topLeftCorner.x;
                  var tilePosY = -tileInfo.y *_sizeTile + _topLeftCorner.y;
                  var posLamb = Cartography.convertCoord({x:tilePosX, y:tilePosY},"EPSG:3857","EPSG:2154");        
                 
              // Then we need to know the width and height of the Tile Texture
              // And we calcul the corners position of the Tile Texture (composed of 8*8 tiles)
                  var tilePosBottomCornerX = tilePosX + 8 *_sizeTile;
                  var tilePosBottomCornerY = tilePosY - 8 *_sizeTile;
                  var posLambCorner = Cartography.convertCoord({x:tilePosBottomCornerX, y:tilePosBottomCornerY},"EPSG:3857","EPSG:2154");
                  var widTileTexture = posLambCorner.x - posLamb.x;
                  var heiTileTexture = posLambCorner.y - posLamb.y;
                 
               // We transform the 2 other corners in local projection  
                  var posLambCorner11 = Cartography.convertCoord({x:tilePosBottomCornerX, y:tilePosY},"EPSG:3857","EPSG:2154");
                  var posLambCorner21 = Cartography.convertCoord({x:tilePosX, y:tilePosBottomCornerY},"EPSG:3857","EPSG:2154");
                 
                  var zero = gfxEngine.getZeroAsVec3D();
                  var posLambLocal         = new THREE.Vector3(posLamb.x - zero.x,         alti,   posLamb.y - zero.z);
                  var posLambCornerLocal   = new THREE.Vector3(posLambCorner.x - zero.x,   alti,   posLambCorner.y   - zero.z);
                  var posLambCorner11Local = new THREE.Vector3(posLambCorner11.x - zero.x, alti,   posLambCorner11.y - zero.z);
                  var posLambCorner21Local = new THREE.Vector3(posLambCorner21.x - zero.x, alti,   posLambCorner21.y - zero.z);
                 
                  Draw.drawSphereAt(posLambLocal, 15, 0xff0000);
                  Draw.drawSphereAt(posLambCornerLocal, 15, 0x00ff00);
                  Draw.drawSphereAt(posLambCorner21Local, 15, 0x0000ff);
                 
               // We then launch the creation of the TileTexture (composed of 8*8 tiles) with the 4 corners position for the mesh  
                  var tileTexture = new TileTexture("ur",layer,format,level,
                                                    widTileTexture,heiTileTexture,5,5,posLambLocal,posLambCornerLocal,posLambCorner21Local,posLambCorner11Local,_geomDTM);
                  //tileTexture.loadAllTiles(tileInfo.x,tileInfo.y);
                  tileTexture.createTilesList(tileInfo.x,tileInfo.y);
                  tileTexture.loadTilesFromList();
                 
                  gfxEngine.addToScene(tileTexture.meshNest);
                  _tabMapMesh.push(tileTexture.meshNest);
                  //var heightCamOnTruck = 2;
                  //var alti = this.panoInfo.altitude - zero.y - heightCamOnTruck;
             },
       
         
             
              setMapOpacity: function(alpha){
                 
                  _tabMapMesh[0].material.opacity = alpha;
              },
             
                  getTabMesh: function(){
                 
                  return _tabMapMesh;
              },
             
              removeMapMeshes: function(){
                 
                  //console.log(_tabMapMesh);
                  gfxEngine.removeFromScene(_tabMapMesh[0]);
                //  gfxEngine.removeFromScene(_tabMapMesh[1]);
                  _tabMapMesh = [];
                 /*
                  while(_tabMapMesh.length >0){
                      gfxEngine.removeFromScene(_tabMapMesh.splice());
                  }*/
              },
             
             // NOT USED
              displayTile:function(img, posLamb){
                 
       
                  _sizeTile = 50.23516095429659 ;

                  var texture = new THREE.Texture(img,THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter,THREE.LinearFilter);
                  var meshMaterial = new THREE.MeshBasicMaterial( { map: texture, transparent: false} );
                  meshMaterial.side = THREE.DoubleSide;
                  var meshTile = new THREE.Mesh( new THREE.PlaneGeometry(_sizeTile,_sizeTile), meshMaterial);
                  gfxEngine.addToScene(meshTile);
                  texture.needsUpdate = true;  // VERY IMPORTANT
               
                  var heightCamOnTruck = 2;
                  var zero = gfxEngine.getZeroAsVec3D();
                  var alti = this.panoInfo.altitude - zero.y - heightCamOnTruck;
                 
                  meshTile.rotation.x = Math.PI/2;
                  console.log('posLamb',posLamb);
                  //meshTile.position = new THREE.Vector3(posLamb.x - zero.x - 38,alti,posLamb.y - zero.z + 38);
                  meshTile.position = new THREE.Vector3(posLamb.x - zero.x + _sizeTile/2, alti, posLamb.y - zero.z - _sizeTile/2);
                  //meshTile.position = new THREE.Vector3(0+ sizeTile/2,alti,0-sizeTile/2);//posLamb.x - zero.x , alti, posLamb.y - zero.z);
             },

       
             getCurrentObject:function(){
                 return _currentObject;
             },
             
             getCurrentMeshForClickAndGo:function(){
                 return _currentMeshForClickAndGo;
             },
             
             getProjectiveMaterial: function(){
                 return _projectiveMaterial;
             },
             
             getGeometry: function(){
                 return _geometry;
             },
             
             getCurrentObjectToDrag : function(){
                 return _currentObjectToDrag;
             },

            getOrthoPhotoOn: function(){
                return _orthoPhotoOn;
            },
             
             addAmbientLight : function(){
                var ambient = new THREE.AmbientLight( 0x101030 );
                gfxEngine.addToScene( ambient );
             },
             
             addDirectionalLight : function(){
                var directionalLight = new THREE.DirectionalLight( 0xffffff );
                directionalLight.position.set( 1000, 1000, 0 ).normalize();
                gfxEngine.addToScene(directionalLight);
             },
             
            setVisibility: function(b){
                _visibility = b;
                _currentObject.visible = b;
                this.setRoofVisibility(b);  
            },
           
            setRoofVisibility: function(b){
                if(_meshRoof != undefined)
                     _meshRoof.visible = b;
            },
            
            tweenGeneralOpacityUp: function(){
                console.log("tweenGeneralOpacityUp");
                if(ProjectiveTexturing.isInitiated()){
                    ProjectiveTexturing.setGeneralOpacity(0);
                    ProjectiveTexturing.tweenGeneralOpacityUp();
                }
            },
           
            setFogValue: function(v){
               
                if(ProjectiveTexturing.isInitiated()) ProjectiveTexturing.setFogValue(v);
            },
           
            setRoadOn: function(b){
                _roadOn = b;
                //this.forceUpdateRGE();
            },
           
            setOrthoPhotoOn: function(b){
                _orthoPhotoOn = b; 
               // if(b) $("#checkbox3")[0].checked = true;   // API OUT
            },
           
            setShowDTM: function(b){
                _showDTM = b;
                if(_showDTM){
                     
                      if(_meshDTM) gfxEngine.removeFromScene(_meshDTM);
                      var mat = new THREE.MeshBasicMaterial({color:Math.random() * 0xffffff, wireframe:true});
                      mat.side = THREE.DoubleSide;
                      _meshDTM = new THREE.Mesh(_geomDTM.clone(), mat);
                      gfxEngine.addToScene(_meshDTM);   //   DISPLAY DTM
                }else{
                   if(_meshDTM) gfxEngine.removeFromScene(_meshDTM);
                }
                 
            },
            
            // Get alti (float) from DTM using parameter Vector3
            getAltiFromDTM: function(v){
                
               var radiusMarge = _radius + 100;
               var altitude_sol = 0;
               
               var indx = Math.floor((v.x - _pivotGrid.x + radiusMarge)/10);
               var indy = Math.floor((v.z - _pivotGrid.z + radiusMarge)/10);
               if(indx >0 && indx < _gridDTM2.length && indy>0 && indy<_gridDTM2.length){
                   altitude_sol = _gridDTM2[indx][indy];
               }
               
               return altitude_sol;
            },
            
            
            removeCubeFromMeshFaces: function(){
                
                //geometry.elementsNeedUpdate = true;
                var l = _currentObject.geometry.faces.length;
                console.log(l); 
                //_geometry.faces.length = l-12;
                _currentObject.geometry.faces[l-1] = null;
                _currentObject.geometry.faces[l-2] = null;
                _currentObject.geometry.faces[l-3] = null;
                _currentObject.geometry.faces[l-4] = null;
                _currentObject.geometry.faces[l-5] = null;
                _currentObject.geometry.faces[l-6] = null;
                _currentObject.geometry.faces[l-7] = null;
                _currentObject.geometry.faces[l-8] = null;
                _currentObject.geometry.faces[l-9] = null;
                _currentObject.geometry.faces[l-10] = null;
                _currentObject.geometry.faces[l-11] = null;
                _currentObject.geometry.faces.length = l-2500;
                _currentObject.geometry.elementsNeedUpdate = true;
                console.log(l);
            }
             
             
        };
        return Manager;
    });

