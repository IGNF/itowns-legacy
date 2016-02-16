/**
 * Creates a TileTexture object
 * @class Manage TitleTexture loaded into panoramic mesh planes 
 * @author alexandre devaux IGN
 * @requires ThreeJS
 */ 

define (['three'], function (THREE) { 

    // nbTW,nbTH : number of trianges for w and h for the plane3D
    TileTexture = function(url,layer,formatImg,pos,sizeTileMeters,sizeTilePx,nbTiles,geom,pivotGrid,sideGrid,radiusMarge, key, sizeCell){
        
        var widthMap = nbTiles * sizeTileMeters;
        var heightMap = nbTiles * sizeTileMeters;
        this.canvasTex = document.createElement( 'canvas' );
        this.canvasTex.width = 2048;
        this.canvasTex.height = 2048;
        this.ctxTex = this.canvasTex.getContext( '2d' );
        this.opacity = 1; 
       
        this.xmt = new THREE.MeshBasicMaterial( { map: new THREE.Texture( this.canvasTex ),transparent: false, opacity:this.opacity} );
        this.xmt.side = THREE.DoubleSide;
        this.xmt.map.needsUpdate = true;
        
        this.key = key;
        
        // Create the right mesh
        var _geometry;

        if(geom){

              console.log("Tile texture using DTM",geom);
              _geometry = geom.clone(); // 
              _geometry.faceVertexUvs[0] = [];  // Erace all UVMapping if some exists
            //  var gridLength = 100; // marge = 500; 
              
               // 200 faces per line , 200 row     
             //  var sizeCell = 10; // 10 meters default -> face 4 10*10 m
               var marge = 500; //_radius + 100
               //var radiusMarge = 500;
                                         
               for(var i=0; i<sideGrid -1; ++i){
                 for(var j=0; j<sideGrid -1; ++j){
                                          
                   // if(a < geometry.vertices.length - grid.length -1 && ((a +1) % grid.length !=0)){ 
                   var verticeA = new THREE.Vector3(i*sizeCell-radiusMarge + pivotGrid.x, 0, j*sizeCell - radiusMarge+ pivotGrid.z);
                   var verticeB = new THREE.Vector3((i+1)*sizeCell-radiusMarge+ pivotGrid.x, 0, j*sizeCell - radiusMarge+ pivotGrid.z);
                   var verticeC = new THREE.Vector3(i*sizeCell-radiusMarge+ pivotGrid.x, 0, (j+1)*sizeCell - radiusMarge+ pivotGrid.z);
                   var verticeD = new THREE.Vector3((i+1)*sizeCell-radiusMarge+ pivotGrid.x, 0, (j+1)*sizeCell - radiusMarge+ pivotGrid.z);
                     
                   // We need to know for every vertices its coordinate in the map, and then normalize it
                   // Damn long cause of the projection doesn t respect axes of grid and scale.........
                   var verticeAinMap = new THREE.Vector3(verticeA.x- pos.x,0,verticeA.z - pos.y);
                   var verticeBinMap = new THREE.Vector3(verticeB.x- pos.x,0,verticeB.z - pos.y);
                   var verticeCinMap = new THREE.Vector3(verticeC.x- pos.x,0,verticeC.z - pos.y);
                   var verticeDinMap = new THREE.Vector3(verticeD.x- pos.x,0,verticeD.z - pos.y);

                   //  console.log(verticeAinMap,verticeBinMap,verticeCinMap,verticeDinMap);
                   // NORMALISATION TO UV 0-1

                   verticeAinMap.x /= widthMap;
                   verticeAinMap.z /= heightMap;
                   verticeBinMap.x /= widthMap;
                   verticeBinMap.z /= heightMap;
                   verticeCinMap.x /= widthMap;
                   verticeCinMap.z /= heightMap;
                   verticeDinMap.x /= widthMap;
                   verticeDinMap.z /= heightMap;

                   verticeAinMap.x = (verticeAinMap.x <0 || verticeAinMap.x>1) ? 0 : verticeAinMap.x;
                   verticeAinMap.z = (verticeAinMap.z <0 || verticeAinMap.z>1) ? 0 : verticeAinMap.z;
                   verticeBinMap.x = (verticeBinMap.x <0 || verticeBinMap.x>1) ? 0 : verticeBinMap.x;
                   verticeBinMap.z = (verticeBinMap.z <0 || verticeBinMap.z>1) ? 0 : verticeBinMap.z;
                   verticeCinMap.x = (verticeCinMap.x <0 || verticeCinMap.x>1) ? 0 : verticeCinMap.x;
                   verticeCinMap.z = (verticeCinMap.z <0 || verticeCinMap.z>1) ? 0 : verticeCinMap.z;
                   verticeDinMap.x = (verticeDinMap.x <0 || verticeDinMap.x>1) ? 0 : verticeDinMap.x;
                   verticeDinMap.z = (verticeDinMap.z <0 || verticeDinMap.z>1) ? 0 : verticeDinMap.z;


                    _geometry.faceVertexUvs[0].push( [
                       new THREE.Vector2( verticeAinMap.x, verticeAinMap.z ),
                       new THREE.Vector2( verticeCinMap.x, verticeCinMap.z ),
                       new THREE.Vector2( verticeBinMap.x, verticeBinMap.z ),
                    ] );

                    _geometry.faceVertexUvs[0].push( [
                       new THREE.Vector2( verticeCinMap.x, verticeCinMap.z ),
                       new THREE.Vector2( verticeDinMap.x, verticeDinMap.z ),
                       new THREE.Vector2( verticeBinMap.x, verticeBinMap.z )
                    ] );

                }
             }                                  // Tip: get Vertex from faceIndex
                                                // geometry.vertices[geometry.faces[faceIndex][ String.fromCharCode(97 + vertexIndex) ]];                      
             _geometry.computeFaceNormals(); 
             
        }else{
           console.log("Create new Geometry");
            _geometry = new THREE.Geometry();
            _geometry.vertices.push(new THREE.Vector3(0,0,0),
                                    new THREE.Vector3(0,0,2048),
                                    new THREE.Vector3(2048,0,2048),
                                    new THREE.Vector3(2048,0,0));
                                    
             _geometry.faces.push( new THREE.Face3( 0,1,3) );
             _geometry.faces.push( new THREE.Face3( 1,2,3) );
             _geometry.faceVertexUvs[ 0 ].push( [
                new THREE.Vector2( 0, 0 ),
                new THREE.Vector2( 0, 1 ),
                new THREE.Vector2( 1, 0 )
             ] );
             _geometry.faceVertexUvs[ 0 ].push( [
                new THREE.Vector2( 0, 1 ),
                new THREE.Vector2( 1, 1 ),
                new THREE.Vector2( 1, 0 )
             ] );
           /* _geometry.faces.push( new THREE.Face4( 1,2,3,0) );
            _geometry.faceVertexUvs[ 0 ].push( [
                new THREE.Vector2( 0, 1 ),
                new THREE.Vector2( 1, 1 ),
                new THREE.Vector2( 1, 0 ),
                new THREE.Vector2( 0, 0 )
             ] );
             */
            _geometry.computeFaceNormals(); 
        }
        
        
        // var mat = new THREE.MeshBasicMaterial({color:0xff00ff, wireframe:true});
        this.meshNest = new THREE.Mesh( _geometry,this.xmt);// mat);//this.xmt );   // To be added to the scene
        //this.meshNest.position.y+=0.05;//1;  // To avoid blinking!
        this.meshNest.position.y-=5;//1;  // To avoid blinking!
        this.formatImage = formatImg;
        this.url = url;
        this.layer = layer;
        this.nbLoaded = 0;
        this.tilesList = [];
        console.log(geom);
        
    };
    
    TileTexture.prototype.addTileToTextureNow = function( x, y, img) {
    
            var newTileSideSize = 256;
            var nbTiles = 8
            var yMax = 256* (nbTiles -1);
            this.nbLoaded++;
            this.ctxTex.drawImage( img, x*newTileSideSize, yMax- y*newTileSideSize);//, newTileSideSize,newTileSideSize);
            this.xmt.map.needsUpdate = true;    
            this.loadTilesFromList();
    };
    
    
     TileTexture.prototype.loadTilesFromList = function() {
         
         if(this.tilesList.length>0){
             
            var tileInfo = this.tilesList.shift();
            var that = this;
            var img = new Image();
            img.crossOrigin = "Anonymous";  // Very importan when images are not on local server. 
            (function( x, y, img ) {        // Works if http header contains Access-Control-Allow-Origin: *
                  img.onload = function() {
                      that.addTileToTextureNow( x, y, img ); 
                  };
                  img.onerror = function() {
                    console.error("Image server screwed up for this tile");
                  };
              })( tileInfo.x, tileInfo.y, img);
              img.src = tileInfo.url;
          }
     };
     
    
     TileTexture.prototype.createTilesList = function(pos,sizeTileMeters) {
        
        var nbTilesPerSide = 8; //Math.pow(2, level);
   /*     pos.x += 4*sizeTileMeters;
        pos.y += 4*sizeTileMeters;
          
        for(var x=0; x< nbTilesPerSide/2; ++x){
            for(var y=0; y< nbTilesPerSide/2; ++y){
                
                // Back
                var urlBase = "http://wxs.ign.fr/" + this.key;  //wxs-i
                var x1 = pos.x+ x *sizeTileMeters;
                var y1 = pos.y+ y *sizeTileMeters;
                var x2 = x1+sizeTileMeters;
                var y2 = y1+sizeTileMeters;
                
                urlBase += "/geoportail/r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&CRS=IGNF:LAMB93&LAYERS="+this.layer;
                urlBase += "&STYLES=normal&WIDTH=256&HEIGHT=256&BBOX="+x1+","+y1+","+x2+","+y2;
                urlBase += "&FORMAT=image%2F"+this.formatImage; 
                                
                this.tilesList.push({url:urlBase,x:x ,y:y});
                
                // Forth
                var urlBase = "http://wxs.ign.fr/" + this.key;  //wxs-i
                var x1 = pos.x+ x *sizeTileMeters;
                var y1 = pos.y- y *sizeTileMeters;
                var x2 = x1+sizeTileMeters;
                var y2 = y1+sizeTileMeters;
                
                urlBase = "http://wxs.ign.fr/" + this.key;  //wxs-i
                urlBase += "/geoportail/r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&CRS=IGNF:LAMB93&LAYERS="+this.layer;
                urlBase += "&STYLES=normal&WIDTH=256&HEIGHT=256&BBOX="+x1+","+y1+","+x2+","+y2;
                urlBase += "&FORMAT=image%2F"+this.formatImage; 
                                
                this.tilesList.push({url:urlBase,x:x,y:y});
            }
        }
      */  
    
        for(var x=0; x< nbTilesPerSide; ++x){
            for(var y=0; y< nbTilesPerSide; ++y){
                
                    var urlBase = "http://wxs.ign.fr/" + this.key;  //wxs-i
                    var x1 = pos.x+ x *sizeTileMeters;
                    var y1 = pos.y+ y *sizeTileMeters;
                    var x2 = x1+sizeTileMeters;
                    var y2 = y1+sizeTileMeters;

                    urlBase += "/geoportail/r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&CRS=IGNF:LAMB93&LAYERS="+this.layer;
                    urlBase += "&STYLES=normal&WIDTH=256&HEIGHT=256&BBOX="+x1+","+y1+","+x2+","+y2;
                    urlBase += "&FORMAT=image%2F"+this.formatImage; 

                    this.tilesList.push({url:urlBase,x:x,y:y});

            }
        }
        
    };
    
    
    

       return TileTexture;
    }
);
