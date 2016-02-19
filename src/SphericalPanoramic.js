/* 
 * Spherical Panoramic viewer using equirectangular images
 */




    define (['GraphicEngine','jquery', 'three','Utils','Ori','TileTexture','Draw','CVML','Cartography'],
        function(gfxEngine, $, THREE, Utils, Ori, TileTexture, Draw, CVML) {
            
            
            
           var _geometry,
               _material,
               _mesh;
            
            
           var SphericalPanoramic ={
            
                init: function(imgName){

                    imgName = imgName || 'http://www.itowns.fr/nokiaHere/images/pano1.jpg';
                    _geometry = new THREE.SphereGeometry( 500,32,32);// 60, 40 );
                    //_geometry.applyMatrix( new THREE.Matrix4().makeScale( -1, 1, 1 ) );

                    _material = new THREE.MeshBasicMaterial( {
                            map: THREE.ImageUtils.loadTexture( imgName )
                    } );
                    
                    _material.side = THREE.DoubleSide;

                    _mesh = new THREE.Mesh( _geometry, _material );
             //       _mesh.rotation.y = -Math.PI/2;  // To get center of pano at north (heading:0°)

                    gfxEngine.addToScene( _mesh );
                },


                setEquirectangularImage: function(imgURL){
                    
                    _material.map = THREE.ImageUtils.loadTexture( imgURL );
                        
                },
                
                
                setOrientation: function(ori){
                    
                },
                
                
                setHeading: function(val){
                    
                    _mesh.rotation.y = val/180 * Math.PI - Math.PI/2;
                },
                
                
                setPitch: function(val){
                    
                    _mesh.rotation.x = val/180 * Math.PI ;
                },
                
                setRoll: function(val){
                    
                    _mesh.rotation.z = val/180 * Math.PI ;
                },
                
                                // Trick for spherical texturing (-Math.PI/2)
                computeSpecificMatOriFromHeadingPitchRoll: function(heading,pitch,roll){

                      heading = parseFloat(heading) / 180 * Math.PI - Math.PI/2 - 0.025;  // Deg to Rad // Axe Y
                      pitch   = parseFloat(pitch)   / 180 * Math.PI ;  // Deg to Rad // axe X
                      roll    = parseFloat(roll)    / 180 * Math.PI ;  // Deg to Rad   // axe Z
                         console.log("heading,pitch,roll ",heading,pitch,roll );
                      // With quaternion  //set rotation.order to "YXZ", which is equivalent to "heading, pitch, and roll"
                      var q = new THREE.Quaternion();
                      //q.setFromEuler(new THREE.Euler(heading,pitch,roll,'YXZ'),true);
                      q.setFromEuler(new THREE.Euler(roll,heading,pitch,'YXZ'),true);
                      var matTotale = new THREE.Matrix4().makeRotationFromQuaternion(q);//qRoll);//quater);
                      
                      _mesh.setRotationFromMatrix(matTotale);
                      
                      return matTotale;//.transpose(); //mat2 //matRotation;
                },
                
                
                // Trick for spherical texturing (-Math.PI/2)
                computeSpecificMatOriFromHeadingPitchRollSAVE: function(heading,pitch,roll){

                      heading = parseFloat(heading) / 180 * Math.PI - Math.PI/2;  // Deg to Rad // Axe Y
                      pitch = parseFloat(pitch)/ 180 * Math.PI ;  // Deg to Rad // axe X
                      roll = parseFloat(roll)/ 180 * Math.PI ;  // Deg to Rad   // axe Z

                      // With quaternion  //set rotation.order to "YXZ", which is equivalent to "heading, pitch, and roll"
                      var q = new THREE.Quaternion();
                      q.setFromEuler(new THREE.Euler(pitch,heading,roll,'YXZ'),true);
                      var matTotale = new THREE.Matrix4().makeRotationFromQuaternion(q);//qRoll);//quater);
                      
                      _mesh.setRotationFromMatrix(matTotale);
                      
                      return matTotale;//.transpose(); //mat2 //matRotation;
                },
                                     
            }

            return SphericalPanoramic;
            
        });
