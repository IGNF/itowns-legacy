/* 
 * to add some extension to THREE without modifying the lib directly
 * Nguyen dot QuocDinh at gmail dot com
 */

define(['three'],function(THREE){


		// mbredif: extend THREE.Matrix3 prototype to with some THREE.Matrix4 functionalities
		THREE.Matrix3.prototype.fromArray = THREE.Matrix4.prototype.fromArray;

		THREE.Matrix3.prototype.multiplyMatrices = function ( a, b ) {
			var ae = a.elements;
			var be = b.elements;
			var te = this.elements;

			var a11 = ae[0], a12 = ae[3], a13 = ae[6];
			var a21 = ae[1], a22 = ae[4], a23 = ae[7];
			var a31 = ae[2], a32 = ae[5], a33 = ae[8];
			
			var b11 = be[0], b12 = be[3], b13 = be[6];
			var b21 = be[1], b22 = be[4], b23 = be[7];
			var b31 = be[2], b32 = be[5], b33 = be[8];
	
			te[0] = a11 * b11 + a12 * b21 + a13 * b31;
			te[3] = a11 * b12 + a12 * b22 + a13 * b32;
			te[6] = a11 * b13 + a12 * b23 + a13 * b33;
	
			te[1] = a21 * b11 + a22 * b21 + a23 * b31;
			te[4] = a21 * b12 + a22 * b22 + a23 * b32;
			te[7] = a21 * b13 + a22 * b23 + a23 * b33;
	
			te[2] = a31 * b11 + a32 * b21 + a33 * b31;
			te[5] = a31 * b12 + a32 * b22 + a33 * b32;
			te[8] = a31 * b13 + a32 * b23 + a33 * b33;
	
			return this;

		};

		THREE.Matrix3.prototype.flattenToArray = function ( flat ) {

			var te = this.elements;
			flat[ 0 ] = te[0]; flat[ 1 ] = te[1]; flat[ 2 ] = te[2]; 
			flat[ 3 ] = te[3]; flat[ 4 ] = te[4]; flat[ 5 ] = te[5];
			flat[ 6 ] = te[6]; flat[ 7 ] = te[7]; flat[ 8 ] = te[8];

			return flat;

		};
		
		THREE.Matrix3.prototype.flattenToArrayOffset = function( flat, offset ) {

			var te = this.elements;
			flat[ offset ] = te[0];
			flat[ offset + 1 ] = te[1];
			flat[ offset + 2 ] = te[2];
		
			flat[ offset + 3 ] = te[3];
			flat[ offset + 4 ] = te[4];
			flat[ offset + 5 ] = te[5];

			flat[ offset + 6 ] = te[6];
			flat[ offset + 7 ] = te[7];
			flat[ offset + 8 ]  = te[8];

			return flat;

		};
		
		THREE.Matrix3.prototype.makeRotationFromQuaternion = function ( q ) {

			var te = this.elements;

			var x = q.x, y = q.y, z = q.z, w = q.w;
			var x2 = x + x, y2 = y + y, z2 = z + z;
			var xx = x * x2, xy = x * y2, xz = x * z2;
			var yy = y * y2, yz = y * z2, zz = z * z2;
			var wx = w * x2, wy = w * y2, wz = w * z2;

			te[0] = 1 - ( yy + zz );
			te[3] = xy - wz;
			te[6] = xz + wy;

			te[1] = xy + wz;
			te[4] = 1 - ( xx + zz );
			te[7] = yz - wx;

			te[2] = xz - wy;
			te[5] = yz + wx;
			te[8] = 1 - ( xx + yy );

			return this;

		};
		
       //Vector3 zone
       //add conversion function of Vector3 to lonlat
          THREE.Vector3.prototype.toLonLat = function(){
                               return new THREE.Vector2(this.x,this.z);
                      };
       //Vector2 zone
       //add check if point 2D in inside of triangle
          THREE.Vector2.prototype.vec = function(from, to) {  
                                return new THREE.Vector2(to.x - from.x, to.y - from.y);  
                      };
                    
          THREE.Vector2.prototype.dot = function(u, v) {  
                                return u.x * v.x + u.y * v.y;  
                      };
          /*
          THREE.Vector2.prototype.isPointInTriange = function (A, B, C) {
                                // Compute vectors        
                                var v0 = this.vec(A, C);
                                var v1 = this.vec(A, B);
                                var v2 = this.vec(A, this);
                                // Compute dot products
                                var dot00 = this.dot(v0, v0);
                                var dot01 = this.dot(v0, v1);
                                var dot02 = this.dot(v0, v2);
                                var dot11 = this.dot(v1, v1);
                                var dot12 = this.dot(v1, v2);
                                // Compute barycentric coordinates
                                var invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
                                var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
                                var v = (dot00 * dot12 - dot01 * dot02) * invDenom;
                                // Check if point is in triangle and return baricentrique
                                return new THREE.Vector3((u >= 0) && (v >= 0) && (u + v < 1), //inside?true:false 
                                                          u, //alpha
                                                          v  //beta
                                           );
                     };
           */
           // Compute barycentric coordinates (u, v, w) for
           // point p with respect to triangle (a, b, c)
           THREE.Vector2.prototype.isPointInTriange = function(A, B, C)
           {
                var v1 = this.vec(A, C);
                var v0 = this.vec(A, B);
                var v2 = this.vec(A, this);
 
                // Compute dot products
                var dot00 = this.dot(v0, v0);
                var dot01 = this.dot(v0, v1);
                var dot02 = this.dot(v0, v2);
                var dot11 = this.dot(v1, v1);
                var dot12 = this.dot(v1, v2);
                var invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
                var v = (dot11 * dot02 - dot01 * dot12)*invDenom,
                    w = (dot00 * dot12 - dot01 * dot02)*invDenom,
                    u = 1.0 - v - w;
                return new THREE.Vector3((u >= 0) && (v >= 0) && (u + v < 1), //inside?true:false 
                                                          u, //alpha
                                                          v  //beta
                                           );    
           };
           
           //Extend threejs with Triangle2d for scan line
           THREE.Triangle2D = function ( a, b, c ) {
                this.a = ( a !== undefined ) ? a : new THREE.Vector2();
                this.b = ( b !== undefined ) ? b : new THREE.Vector2();
                this.c = ( c !== undefined ) ? c : new THREE.Vector2();
           };           
           
           THREE.Triangle2D.prototype = {

                    constructor: THREE.Triangle2D,

                    set: function ( a, b, c ) {

                            this.a.copy( a );
                            this.b.copy( b );
                            this.c.copy( c );

                            return this;

                    },

                    setFromPointsAndIndices: function ( points, i0, i1, i2 ) {

                            this.a.copy( points[i0] );
                            this.b.copy( points[i1] );
                            this.c.copy( points[i2] );

                            return this;

                    },

                    copy: function ( triangle ) {

                            this.a.copy( triangle.a );
                            this.b.copy( triangle.b );
                            this.c.copy( triangle.c );

                            return this;

                    },


                    clone: function () {

                            return new THREE.Triangle2D().copy( this );

                    }
            };

            THREE.Edge2D = function(pt1, pt2) {
                    if(pt1.y < pt2.y) {
                        this.pStart = pt1.clone();
                        this.pEnd   = pt2.clone();
                    } else {
                        this.pStart = pt2.clone();
                        this.pEnd   = pt1.clone();
                    }
            };
            
            /*
                *	@author zz85 / http://twitter.com/blurspline / http://www.lab4games.net/zz85/blog 
                *
                *	Subdivision Geometry Modifier 
                *		using Loop Subdivision Scheme
                *
                *	References:
                *		http://graphics.stanford.edu/~mdfisher/subdivision.html
                *		http://www.holmes3d.net/graphics/subdivision/
                *		http://www.cs.rutgers.edu/~decarlo/readings/subdiv-sg00c.pdf
                *
                *	Known Issues et TODO for itowns:
                *		- currently doesn't handle UVs
                *		- currently doesn't handle "Sharp Edges"
                *
           */

            THREE.SubdivisionModifier = function ( subdivisions ) {

                    this.subdivisions = (subdivisions === undefined ) ? 1 : subdivisions;

            };

            // Applies the "modify" pattern
            THREE.SubdivisionModifier.prototype.modify = function ( geometry ) {

                    var repeats = this.subdivisions;

                    while ( repeats-- > 0 ) {
                            this.smooth( geometry );
                    }

                    delete geometry.__tmpVertices;
                    geometry.computeCentroids();
                    geometry.computeFaceNormals();
                    geometry.computeVertexNormals();

            };


            // Some constants et global functions
            var WARNINGS = !true; // Set to true for development
            var ABC = [ 'a', 'b', 'c' ];

            function getEdge( a, b, map ) {

                    var vertexIndexA = Math.min( a, b );
                    var vertexIndexB = Math.max( a, b );

                    var key = vertexIndexA + "_" + vertexIndexB;

                    return map[ key ];

            }


            function processEdge( a, b, vertices, map, face, metaVertices ) {

                    var vertexIndexA = Math.min( a, b );
                    var vertexIndexB = Math.max( a, b );

                    var key = vertexIndexA + "_" + vertexIndexB;

                    var edge;

                    if ( key in map ) {

                            edge = map[ key ];

                    } else {

                            var vertexA = vertices[ vertexIndexA ];
                            var vertexB = vertices[ vertexIndexB ];

                            edge = {

                                    a: vertexA, // pointer reference
                                    b: vertexB,
                                    newEdge: null,
                                    // aIndex: a, // numbered reference
                                    // bIndex: b,
                                    faces: [] // pointers to face

                            };

                            map[ key ] = edge;

                    }

                    edge.faces.push( face );

                    metaVertices[ a ].edges.push( edge );
                    metaVertices[ b ].edges.push( edge );

            }

            function generateLookups( vertices, faces, metaVertices, edges ) {

                    var i, il, face, edge;

                    for ( i = 0, il = vertices.length; i < il; i++ ) {
                            metaVertices[ i ] = { edges: [] };
                    }

                    for ( i = 0, il = faces.length; i < il; i++ ) {
                            face = faces[ i ];

                            processEdge( face.a, face.b, vertices, edges, face, metaVertices );
                            processEdge( face.b, face.c, vertices, edges, face, metaVertices );
                            processEdge( face.c, face.a, vertices, edges, face, metaVertices );

                    }
            }

            function newFace( newFaces, a, b, c ) {

                    newFaces.push( new THREE.Face3( a, b, c ) );

            }

            // Performs one iteration of Subdivision
            THREE.SubdivisionModifier.prototype.smooth = function ( geometry ) {

                    var tmp = new THREE.Vector3();

                    var oldVertices, oldFaces;
                    var newVertices, newFaces; // newUVs = [];

                    var n, l, i, il, j, k;
                    var metaVertices, sourceEdges;

                    // new stuff.
                    var sourceEdges, newEdgeVertices, newSourceVertices;

                    oldVertices = geometry.vertices; // { x, y, z}
                    oldFaces = geometry.faces; // { a: oldVertex1, b: oldVertex2, c: oldVertex3 }

                    /******************************************************
                     *
                     * Step 0: Preprocess Geometry to Generate edges Lookup
                     *
                     *******************************************************/

                    metaVertices = new Array( oldVertices.length );
                    sourceEdges = {}; // Edge => { oldVertex1, oldVertex2, faces[]  }

                    generateLookups(oldVertices, oldFaces, metaVertices, sourceEdges);


                    /******************************************************
                     *
                     *	Step 1. 
                     *	For each edge, create a new Edge Vertex,
                     *	then position it.
                     *
                     *******************************************************/

                    newEdgeVertices = [];
                    var other, currentEdge, newEdge, face;
                    var edgeVertexWeight, adjacentVertexWeight, connectedFaces;

                    for ( i in sourceEdges ) {

                            currentEdge = sourceEdges[ i ];
                            newEdge = new THREE.Vector3();

                            edgeVertexWeight = 3 / 8;
                            adjacentVertexWeight = 1 / 8;

                            connectedFaces = currentEdge.faces.length;

                            // check how many linked faces. 2 should be correct.
                            if ( connectedFaces != 2 ) {

                                    // if length is not 2, handle condition
                                    edgeVertexWeight = 0.5;
                                    adjacentVertexWeight = 0;

                                    if ( connectedFaces != 1 ) {

                                            if (WARNINGS) console.warn('Subdivision Modifier: Number of connected faces != 2, is: ', connectedFaces, currentEdge);

                                    }

                            }

                            newEdge.addVectors( currentEdge.a, currentEdge.b ).multiplyScalar( edgeVertexWeight );

                            tmp.set( 0, 0, 0 );

                            for ( j = 0; j < connectedFaces; j++ ) {

                                    face = currentEdge.faces[ j ];

                                    for ( k = 0; k < 3; k++ ) {

                                            other = oldVertices[ face[ ABC[k] ] ];
                                            if (other !== currentEdge.a && other !== currentEdge.b ) break;

                                    }

                                    tmp.add( other );

                            }

                            tmp.multiplyScalar( adjacentVertexWeight );
                            newEdge.add( tmp );

                            currentEdge.newEdge = newEdgeVertices.length;
                            newEdgeVertices.push(newEdge);

                            // console.log(currentEdge, newEdge);
                    }

                    /******************************************************
                     *
                     *	Step 2. 
                     *	Reposition each source vertices.
                     *
                     *******************************************************/

                    var beta, sourceVertexWeight, connectingVertexWeight;
                    var connectingEdge, connectingEdges, oldVertex, newSourceVertex;
                    newSourceVertices = [];

                    for ( i = 0, il = oldVertices.length; i < il; i++ ) {

                            oldVertex = oldVertices[ i ];

                            // find all connecting edges (using lookupTable)
                            connectingEdges = metaVertices[ i ].edges;
                            n = connectingEdges.length;
                            beta;

                            if ( n == 3 ) {

                                    beta = 3 / 16;

                            } else if ( n > 3 ) {

                                    beta = 3 / ( 8 * n ); // Warren's modified formula

                            }

                            // Loop's original beta formula
                            // beta = 1 / n * ( 5/8 - Math.pow( 3/8 + 1/4 * Math.cos( 2 * Math. PI / n ), 2) );

                            sourceVertexWeight = 1 - n * beta;
                            connectingVertexWeight = beta;

                            if ( n <= 2 ) {

                                    // crease and boundary rules
                                    // console.warn('crease and boundary rules');

                                    if ( n == 2 ) {

                                            if (WARNINGS) console.warn('2 connecting edges', connectingEdges);
                                            sourceVertexWeight = 3 / 4;
                                            connectingVertexWeight = 1 / 8;

                                            // sourceVertexWeight = 1;
                                            // connectingVertexWeight = 0;

                                    } else if ( n == 1 ) {

                                            if (WARNINGS) console.warn('only 1 connecting edge');

                                    } else if ( n == 0 ) {

                                            if (WARNINGS) console.warn('0 connecting edges');

                                    }

                            }

                            newSourceVertex = oldVertex.clone().multiplyScalar( sourceVertexWeight );

                            tmp.set( 0, 0, 0 );

                            for ( j=0; j < n; j++ ) {

                                    connectingEdge = connectingEdges[ j ];
                                    other = connectingEdge.a !== oldVertex ? connectingEdge.a : connectingEdge.b;
                                    tmp.add( other );

                            }

                            tmp.multiplyScalar( connectingVertexWeight );
                            newSourceVertex.add( tmp );

                            newSourceVertices.push( newSourceVertex );

                    }


                    /******************************************************
                     *
                     *	Step 3. 
                     *	Generate Faces between source vertecies
                     *	and edge vertices.
                     *
                     *******************************************************/

                    newVertices = newSourceVertices.concat( newEdgeVertices );
                    var sl = newSourceVertices.length, edge1, edge2, edge3;
                    newFaces = [];

                    for ( i = 0, il = oldFaces.length; i < il; i++ ) {

                            face = oldFaces[ i ];

                            // find the 3 new edges vertex of each old face

                            edge1 = getEdge( face.a, face.b, sourceEdges ).newEdge + sl;
                            edge2 = getEdge( face.b, face.c, sourceEdges ).newEdge + sl;
                            edge3 = getEdge( face.c, face.a, sourceEdges ).newEdge + sl;

                            // create 4 faces.

                            newFace( newFaces, edge1, edge2, edge3 );
                            newFace( newFaces, face.a, edge1, edge3 );
                            newFace( newFaces, face.b, edge2, edge1 );
                            newFace( newFaces, face.c, edge3, edge2 );

                    }

                    // Overwrite old arrays
                    geometry.vertices = newVertices;
                    geometry.faces = newFaces;

                    // console.log('done');

            };
        
          /*
           * *************End of Subdivision*****************************************
           */
          
          /*
           * ************* This section adapt from WebGL QuadTree Planet*************
           * ************* https://github.com/merpnderp *****************************
           */

            THREE.QuadTree = function (options) {

                this.name = options.name;
                this.position = options.corner;
                this.widthDir = options.widthDir;
                this.heightDir = options.heightDir;
                this.planet = options.planet;

                this.rootNode = new THREE.TreeNode({ parent: undefined, level: 0, tree: this, position: this.position });
            };

            THREE.QuadTree.prototype.update = function () {
                this.rootNode.update();
            };

            THREE.QuadTree.prototype.AssignNeighbors = function (left, top, right, bottom) {
                this.rootNode.leftNeighbor = left;
                this.rootNode.topNeighbor = top;
                this.rootNode.rightNeighbor = right;
                this.rootNode.bottomNeighbor = bottom;
            };

            
            THREE.TreeNode = function (options) {
                this.level = options.level;
                this.parent = options.parent;
                this.tree = options.tree;
                this.position = options.position;

                //console.log(this.position.x + " : " + this.position.y + " : " + this.position.z);

                this.width = this.tree.planet.radius * 2 / Math.pow(2, this.level);
                this.halfWidth = this.width / 2;
                //this.arcLength = (this.width / this.tree.planet.radius) / 1.43 //divided by fudge factor;
                this.arcLength = (this.width / this.tree.planet.radius);//divided by fudge factor;

                //This is the node's center location after the point is projected onto the sphere.
                this.center = this.FindCenter();
                this.name = this.center.x + ":" + this.center.y + ":" + this.center.z;

                this.isSplit = false;
                this.isDrawn = false;
                this.isOccluded = false;

            };


            THREE.TreeNode.prototype = {


                update: function () {
                    if (this.OccludedByHorizon()) {
                        if (this.isDrawn) {
                            this.isOccluded = true;
                            this.UnDraw();
                        }
                    } else {
                        this.isOccluded = false;
                        if (this.InCameraFrustum()) {
                            this.GetDistanceFromCamera();
                            if (this.isSplit) {
                                if (this.ShouldUnSplit()) {
                                    this.UnSplit();
                                    this.update();
                                } else {
                                    this.updateChildren();
                                }
                            } else if (this.ShouldSplit()) {
                                if (this.isDrawn) {
                                    this.UnDraw();
                                }
                                this.Split();
                                this.updateChildren();
                            }
                            /*else if (!this.isDrawn) {
                                this.ShouldDraw();
                            }*/
                        }
                    }
                },

	
                checkNeighbors: function(){

                            // T;BL;BR; If the top neighbor is split and either the bottem left or bottom right child is split
                    if(this.topNeighbor && this.topNeighbor.isSplit && (this.topNeighbor.bottomLeftChild.isSplit || this.topNeighbor.bottomRightChild.isSplit)){

                        this.Split();

                    }

                            // R;TL;BL; If the right neighbor is split and either the top left or bottom left child is split
                    if(this.rightNeighbor &&this.rightNeighbor.isSplit && (this.rightNeighbor.bottomLeftChild.isSplit || this.rightNeighbor.topLeftChild.isSplit)){

                        this.Split();

                    }

                            // B;TL;TR If the bottom neighbor is split and either the top left or top right child is split
                    if(this.bottomNeighbor && this.bottomNeighbor.isSplit && (this.bottomNeighbor.topLeftChild.isSplit || this.bottomNeighbor.topRightChild.isSplit)){

                        this.Split();

                    }

                            // L;TR;BR If the top neighbor is split and either the top right or bottom right child is split
                    if(this.leftNeighbor && this.leftNeighbor.isSplit && (this.leftNeighbor.topRightChild.isSplit || this.leftNeighbor.bottomRightChild.isSplit)){

                        this.Split();

                    }


                    if(this.isSplit){

                        if(this.topNeighbor && this.topNeighbor.isSplit){

                                            // -----------------     -----------------
                                            // |   | x |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                            // |   | o | • |   |     |   | • | • |   |
                                            // -----------------  =  -----------------
                                            // |   | • | • |   |     |   | o | • |   |
                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   | x |   |   |
                                            // -----------------     -----------------
                                        this.topLeftChild.topNeighbor = this.topNeighbor.bottomLeftChild;

                                            // -----------------     -----------------
                                            // |   |   | x |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                            // |   | • | o |   |     |   | • | • |   |
                                            // -----------------  =  -----------------
                                            // |   | • | • |   |     |   | • | o |   |
                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   | x |   |
                                            // -----------------     -----------------
                                        this.topRightChild.topNeighbor = this.topNeighbor.bottomRightChild;

                        }

                        if(this.rightNeighbor && this.rightNeighbor.isSplit){

                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                            // |   | • | o | x |     | x | o | • |   |
                                            // -----------------  =  -----------------
                                            // |   | • | • |   |     |   | • | • |   |
                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                        this.topRightChild.rightNeighbor = this.rightNeighbor.topLeftChild;

                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                            // |   | • | • |   |     |   | • | • |   |
                                            // -----------------  =  -----------------
                                            // |   | • | o | x |     | x | o | • |   |
                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                        this.bottomRightChild.rightNeighbor = this.rightNeighbor.bottomLeftChild;

                                    }

                        if(this.bottomNeighbor && this.bottomNeighbor.isSplit){

                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   | x |   |   |
                                            // -----------------     -----------------
                                            // |   | • | • |   |     |   | o | • |   |
                                            // -----------------  =  -----------------
                                            // |   | o | • |   |     |   | • | • |   |
                                            // -----------------     -----------------
                                            // |   | x |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                        this.bottomLeftChild.bottomNeighbor = this.bottomNeighbor.topLeftChild;

                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   | x |   |
                                            // -----------------     -----------------
                                            // |   | • | • |   |     |   | • | o |   |
                                            // -----------------  =  -----------------
                                            // |   | • | o |   |     |   | • | • |   |
                                            // -----------------     -----------------
                                            // |   |   | x |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                        this.bottomRightChild.bottomNeighbor = this.bottomNeighbor.topRightChild;

                                    }

                        if(this.leftNeighbor && this.leftNeighbor.isSplit){

                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                            // | x | o | • |   |     |   | • | o | x |
                                            // -----------------  =  -----------------
                                            // |   | • | • |   |     |   | • | • |   |
                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                        this.topLeftChild.leftNeighbor = this.leftNeighbor.topRightChild;

                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                                            // |   | • | • |   |     |   | • | • |   |
                                            // -----------------  =  -----------------
                                            // | x | o | • |   |     |   | • | o | x |
                                            // -----------------     -----------------
                                            // |   |   |   |   |     |   |   |   |   |
                                            // -----------------     -----------------
                            this.bottomLeftChild.leftNeighbor = this.leftNeighbor.bottomRightChild;

                                    }

                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                                    // |   | o | x |   |     |   | • | x |   |
                                    // -----------------  =  -----------------
                                    // |   | • | • |   |     |   | • | • |   |
                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                            this.topLeftChild.rightNeighbor = this.topRightChild;

                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                                    // |   | o | • |   |     |   | • | • |   |
                                    // -----------------  =  -----------------
                                    // |   | x | • |   |     |   | x | • |   |
                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                            this.topLeftChild.bottomNeighbor = this.bottomLeftChild;

                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                                    // |   | • | o |   |     |   | • | • |   |
                                    // -----------------  =  -----------------
                                    // |   | • | x |   |     |   | • | x |   |
                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                            this.topRightChild.bottomNeighbor = this.bottomRightChild;

                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                                    // |   | • | • |   |     |   | • | • |   |
                                    // -----------------  =  -----------------
                                    // |   | • | • |   |     |   | • | • |   |
                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                            this.topRightChild.leftNeighbor = this.topLeftChild;
 
                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                                    // |   | x | • |   |     |   | x | • |   |
                                    // -----------------  =  -----------------
                                    // |   | o | • |   |     |   | • | • |   |
                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                           this.bottomLeftChild.topNeighbor = this.topLeftChild;

                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                                    // |   | • | • |   |     |   | • | • |   |
                                    // -----------------  =  -----------------
                                    // |   | o | x |   |     |   | • | x |   |
                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                           this.bottomLeftChild.rightNeighbor = this.bottomRightChild;

                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                                    // |   | • | x |   |     |   | • | x |   |
                                    // -----------------  =  -----------------
                                    // |   | • | o |   |     |   | • | • |   |
                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                          this.bottomRightChild.topNeighbor = this.topRightChild;

                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                                    // |   | • | • |   |     |   | • | • |   |
                                    // -----------------  =  -----------------
                                    // |   | x | o |   |     |   | x | • |   |
                                    // -----------------     -----------------
                                    // |   |   |   |   |     |   |   |   |   |
                                    // -----------------     -----------------
                          this.bottomRightChild.leftNeighbor = this.bottomLeftChild;

                       if(!this.leftNeighbor || this.leftNeighbor && !this.leftNeighbor.isSplit){
                                            // -----------------
                                            // |   |   |   |   |
                                            // -----------------
                                            // |   | x | • |   |
                                            // -----------------
                                            // |   | • | • |   |
                                            // -----------------
                                            // |   |   |   |   |
                                            // -----------------
                                this.topLeftChild.checkNeighbors();

                                            // -----------------
                                            // |   |   |   |   |
                                            // -----------------
                                            // |   | • | x |   |
                                            // -----------------
                                            // |   | • | • |   |
                                            // -----------------
                                            // |   |   |   |   |
                                            // -----------------
                                this.topRightChild.checkNeighbors();

                                            // -----------------
                                            // |   |   |   |   |
                                            // -----------------
                                            // |   | • | • |   |
                                            // -----------------
                                            // |   | x | • |   |
                                            // -----------------
                                            // |   |   |   |   |
                                            // -----------------
                                this.bottomLeftChild.checkNeighbors();

                                            // -----------------
                                            // |   |   |   |   |
                                            // -----------------
                                            // |   | • | • |   |
                                            // -----------------
                                            // |   | • | x |   |
                                            // -----------------
                                            // |   |   |   |   |
                                            // -----------------
                                this.bottomRightChild.checkNeighbors();				
                                    }


                    }

                },


                /*ShouldDraw: function(){
                    this.tree.planet.meshesMightAdd.push({name: this.name, draw: this.Draw.bind(this)});
                },*/

                Draw: function () {

                    var position;

                    return function () {
                        "use strict";

                        if(this.isSplit){
                            this.topLeftChild.Draw();
                            this.topRightChild.Draw();
                            this.bottomLeftChild.Draw();
                            this.bottomRightChild.Draw();
                            return;
                        }

                        if(this.isDrawn || this.isOccluded){
                            return;
                        }

                        this.tree.planet.RemoveFromDeletedMeshes(this.name);

                        var positions = new Float32Array(this.tree.planet.patchSize * this.tree.planet.patchSize * 6 * 3);
                        var normals = new Float32Array(this.tree.planet.patchSize * this.tree.planet.patchSize * 6 * 3);
                        var uvs = new Float32Array(this.tree.planet.patchSize * this.tree.planet.patchSize * 6 * 2);

                        var positionCount = 0;
                        var uvsCount = 0;

                        var patchSize = this.tree.planet.patchSize;

                        for (var u = 0; u < patchSize; u++) {
                            for (var v = 0; v < patchSize; v++) {
                                position = this.SolvePoint(u / patchSize, v / patchSize);
                                positions[positionCount++] = position.x;
                                normals[positionCount-1] = positions[positionCount-1];
                                positions[positionCount++] = position.y;
                                normals[positionCount-1] = positions[positionCount-1];
                                positions[positionCount++] = position.z;
                                normals[positionCount-1] = positions[positionCount-1];
                                uvs[uvsCount++] = u / patchSize;
                                uvs[uvsCount++] = v / patchSize;


                                position = this.SolvePoint((u + 1) / patchSize, (v) / patchSize);
                                positions[positionCount++] = position.x;
                                positions[positionCount++] = position.y;
                                positions[positionCount++] = position.z;
                                uvs[uvsCount++] = (u + 1) / patchSize;
                                uvs[uvsCount++] = v / patchSize;

                                position = this.SolvePoint((u) / patchSize, (v + 1) / patchSize);
                                positions[positionCount++] = position.x;
                                positions[positionCount++] = position.y;
                                positions[positionCount++] = position.z;
                                uvs[uvsCount++] = (u) / patchSize;
                                uvs[uvsCount++] = (v + 1) / patchSize;

                                positions[positionCount++] = positions[positionCount - 4];
                                positions[positionCount++] = positions[positionCount - 4];
                                positions[positionCount++] = positions[positionCount - 4];
                                uvs[uvsCount++] = (u) / patchSize;
                                uvs[uvsCount++] = (v + 1) / patchSize;

                                positions[positionCount++] = positions[positionCount - 10];
                                positions[positionCount++] = positions[positionCount - 10];
                                positions[positionCount++] = positions[positionCount - 10];
                                uvs[uvsCount++] = (u + 1) / patchSize;
                                uvs[uvsCount++] = (v) / patchSize;

                                position = this.SolvePoint((u + 1) / patchSize, (v + 1) / patchSize);
                                positions[positionCount++] = position.x;
                                positions[positionCount++] = position.y;
                                positions[positionCount++] = position.z;
                                uvs[uvsCount++] = (u + 1) / patchSize;
                                uvs[uvsCount++] = (v + 1) / patchSize;
                            }
                        }

                        this.tree.planet.meshesToAdd.push(positions.buffer);
                        this.tree.planet.meshesToAdd.push(normals.buffer);
                        this.tree.planet.meshesToAdd.push(uvs.buffer);
                        //this.tree.planet.returnObject.newMeshes.push({name: this.name, center: this.center, positions: positions, uvs: uvs, normals: normals});
                        this.tree.planet.returnObject.newMeshes.push({name: this.name, width: this.width, center: this.center, positions: positions, uvs: uvs});

                        this.isDrawn = true;
                    };

                }(),

                SolvePoint: function () {
                    var x, y, z, length;
                    return function (u, v) {
                        "use strict";
                        /*
                        var temp = this.tree.widthDir.clone();
                        temp.multiplyScalar(u);
                        temp.add(this.tree.heightDir.clone().multiplyScalar(v));
                        temp.multiplyScalar(this.width);
                        temp.add(this.position);
                        temp.normalize();
                        temp.multiplyScalar(this.tree.planet.radius);
                        return temp;
                        */
                        /*
                        width = this.width;
                        wx = this.tree.widthDir.x;
                        wy = this.tree.widthDir.y;
                        wz = this.tree.widthDir.z;
                        hx = this.tree.heightDir.x;
                        hy = this.tree.heightDir.y;
                        hz = this.tree.heightDir.z;
            */
                        x = ((this.tree.widthDir.x * u + this.tree.heightDir.x * v) * this.width) + this.position.x;
                        y = ((this.tree.widthDir.y * u + this.tree.heightDir.y * v) * this.width) + this.position.y;
                        z = ((this.tree.widthDir.z * u + this.tree.heightDir.z * v) * this.width) + this.position.z;

                        length = Math.sqrt( x * x + y * y + z * z );

                        x = (x / length) * this.tree.planet.radius - this.center.x;
                        y = (y / length) * this.tree.planet.radius - this.center.y;
                        z = (z / length) * this.tree.planet.radius - this.center.z;

                        return {
                                            x: x,
                                            y: y,
                                            z: z
                                    };

                    }
                }(),


                UnDraw: function () {

                    this.tree.planet.returnObject.deletedMeshes.push(this.name);
                    this.isDrawn = false;

                },


                GetDistanceFromCamera: function () {
                    return function () {
                        this.distance = this.tree.planet.localCameraPosition.distanceTo(this.center);
                    };
                }(),


                ShouldSplit: function () {
                    //console.log("\tShould " + this.level + " Split if: " + this.tree.sphere.splitTable[this.level] + " >= " + this.distance);
                    this.tree.planet.log(this.level + " < " + this.tree.planet.maxLevel);
                    return this.level < this.tree.planet.maxLevel && this.tree.planet.splitTable[this.level] >= this.distance;

                },


                ShouldUnSplit: function () {

                    //console.log("\tShould " + this.level + " UnSplit if: " + this.tree.sphere.splitTable[this.level-1] + " < " + this.distance);
                    return this.level >= 0 && this.tree.planet.splitTable[this.level] < this.distance;

                },


                InCameraFrustum: function () {

                    return true;

                },

                OccludedByHorizon: function () {
                    var angleToCamera = this.tree.planet.localCameraPlanetProjectionPosition.angleTo(this.center);

                    angleToCamera -= this.arcLength;

                    if (angleToCamera > this.tree.planet.localCameraMaxAngle) {
                        return true;
                    }
                    return false;
                },


                Split: function () {

                    var options;

                    return function () {
                        if(this.isSplit){
                            return;
                        }
                        options = {
                                            level: this.level + 1,
                                            parent: this,
                                            tree: this.tree
                                    };

                        options.position = this.position.clone().add(this.tree.heightDir.clone().multiplyScalar(this.halfWidth));
                        this.topLeftChild = new THREE.TreeNode(options);

                        options.position = this.position.clone().add(this.tree.heightDir.clone().multiplyScalar(this.halfWidth));
                        options.position.add(this.tree.widthDir.clone().multiplyScalar(this.halfWidth));
                        this.topRightChild = new THREE.TreeNode(options);

                        options.position = this.position.clone();
                        this.bottomLeftChild = new THREE.TreeNode(options);

                        options.position = this.position.clone().add(this.tree.widthDir.clone().multiplyScalar(this.halfWidth));
                        this.bottomRightChild = new THREE.TreeNode(options);

                        this.isSplit = true;

                    };

                }(),


                Die: function () {
                    if (this.isDrawn) {
                        this.UnDraw();
                    }
                            else if (this.isSplit) {
                        this.UnSplit();
                    }

                },


                UnSplit: function () {

                    if (this.isSplit) {

                        this.topLeftChild.Die();
                        this.topRightChild.Die();
                        this.bottomLeftChild.Die();
                        this.bottomRightChild.Die();
                        delete this.topLeftChild;
                        delete this.topRightChild;
                        delete this.bottomLeftChild;
                        delete this.bottomRightChild;

                    }

                    this.isSplit = false;

                },


                updateChildren: function () {

                    this.topLeftChild.update();
                    this.topRightChild.update();
                    this.bottomLeftChild.update();
                    this.bottomRightChild.update();

                },


                FindCenter: function () {

                    var x, y, z, w, wd, hd;

                    return function () {
                        x = this.position.x;
                        y = this.position.y;
                        z = this.position.z;
                        wd = this.tree.widthDir;
                        hd = this.tree.heightDir;
                        w = this.halfWidth;

                        x = x + wd.x * w + hd.x * w;
                        y = y + wd.y * w + hd.y * w;
                        z = z + wd.z * w + hd.z * w;
                        return new THREE.Vector3(x, y, z).normalize().multiplyScalar(this.tree.planet.radius);
                    };
                }()


            };



            THREE.QuadTreeSphere = function (options) {
                THREE.Object3D.call(this);
                this.isInitialized = false;
                this.pause = false;
                this.meshes = {};
                this.meshBuildTimeAvg = 0;

                    this.initializeOptions(options);

                    this.initializeWorker();

                    this.updateCounter = 0;
                    this.avg = 0;

            };

            THREE.QuadTreeSphere.prototype = Object.create(THREE.Object3D.prototype);

            THREE.QuadTreeSphere.prototype.initializeOptions = function (options, callback) {

                    this.workerPath = options.workerPath || "QuadTreeSphereWorker.min.js";

                    this.configureCamera(options.camera);

                this.scene = options.scene;
                this.radius = options.radius;
                this.patchSize = options.patchSize;
                this.fov = options.fov;

                    this.quadMaterial = options.quadMaterial;

            };

            THREE.QuadTreeSphere.prototype.configureCamera = function ( camera ) {

                this.camera = camera;
                this.cameraHeight = 0;

            };


            THREE.QuadTreeSphere.prototype.initializeWorker = function () {

                this.worker = new Worker(this.workerPath);
                this.worker.onmessage = this.onWorkerMessage.bind(this);

                this.worker.postMessage({
                            Init: {
                                    radius: this.radius,
                                    patchSize: this.patchSize,
                                    fov: this.fov,
                                    screenWidth: screen.width
                            }
                    });

            };

            THREE.QuadTreeSphere.prototype.update = function () {

                return function () {

                            var localCameraPosition;

                    if (!this.isInitialized) {
                        return;
                    }

                    localCameraPosition = this.worldToLocal(this.camera.position.clone());
                    this.cameraHeight = localCameraPosition.length() - this.radius;
                    if (this.pause) {
                        return;
                    }

                    this.worker.postMessage({
                                    update: {
                                            localCameraPosition: localCameraPosition,
                                            started: performance.now()
                                    }
                            });
                }
            }();

            THREE.QuadTreeSphere.prototype.onWorkerMessage = function (event) {

                // var me = this;

                    // Local reference so we don't have to scope traverse in the JIT compiler
                    var data = event.data;

                if (data.isInitialized) {
                    this.isInitialized = true;
                    return;
                }

                    // Is this akin to an Error?
                if (data.log) {
            //        console.log(data.log);
                    return;
                }

                if (data.deletedMeshes) {
                    data.deletedMeshes.forEach(this.removeMesh.bind(this));
                }

                if (data.newMeshes) {
                    if (data.newMeshes.length > 0) {

                        this.updateCounters += 1;
                        this.avg += (performance.now() - data.started);

                        this.meshBuildTimeAvg = this.avg / (this.updateCounters);

                        if ( this.updateCounters % 10 == 0 ) {

                            this.avg = 0;
                                            this.updateCounters= 0;

                        }
                    }

                    data.newMeshes.forEach(this.buildNewMesh.bind(this));
                }
                /*
                 console.log(Date.now() - data.started);
                 console.log(data.finished);
                 console.log(data);
                 */
            };

            /**
             * Remove a mesh from the scene and the THREE.QuadTreeSphere.
             */
            THREE.QuadTreeSphere.prototype.removeMesh = function (name) {

                this.scene.remove(this.meshes[name]);
                delete this.meshes[name];
                //console.log("Deleting: " + name);

            };

            THREE.QuadTreeSphere.prototype.buildNewMesh = function (mesh) {
                var buff = new THREE.BufferGeometry();


                buff.attributes.position = {};
                buff.attributes.position.array = mesh.positions;
                buff.attributes.position.itemSize = 3;
                /*
                 buff.attributes.normal = {};
                 buff.attributes.normal.array = mesh.normals;
                 buff.attributes.normal.itemSize = 3;
                 */
                buff.attributes.uv = {};
                buff.attributes.uv.array = mesh.uvs;
                buff.attributes.uv.itemSize = 2;

                buff.computeBoundingSphere();





                var newMesh = new THREE.Mesh(
                            buff, 
                            this.quadMaterial.buildMaterial(
                                    new THREE.Vector3(mesh.center.x, mesh.center.y, mesh.center.z),
                                    this.position,
                                    this.radius,
                                    mesh.width
                            )
                );

                newMesh.position.x = mesh.center.x;
                newMesh.position.y = mesh.center.y;
                newMesh.position.z = mesh.center.z;
                newMesh.position.add(this.position);

                this.scene.add(newMesh);
                this.meshes[mesh.name] = newMesh;

                    delete mesh;
            }
            
            
            
            var QuadTreeSphereWorker = function () {
                        // console.log("QuadTreeSphereWorker Spawned.");
                        self.onmessage = this.handleMessage.bind(this);
                };

                QuadTreeSphereWorker.prototype = {

                        handleMessage: function (event) {
                            if (event.data.Init) {
                                this.Init(event.data.Init);
                            }
                            if (event.data.update) {
                                this.update(event.data.update);
                            }
                        },

                        log: function (text) {
                        self.postMessage({
                                        log: text
                                });
                        },
	
                        update: function (data) {

                            this.log("Worker says update called");

                            this.returnObject = {
                                        started: data.started,
                                        newMeshes: [],
                                        deletedMeshes: []
                                };


                            this.meshesToAdd = [];


                            //Get local position of player
                            this.localCameraPosition = new THREE.Vector3(data.localCameraPosition.x, data.localCameraPosition.y, data.localCameraPosition.z);
                            this.localCameraPlanetProjectionPosition = this.localCameraPosition.clone().normalize().multiplyScalar(this.radius);
                            //this.cameraHeight = this.localCameraPosition.distanceTo(this.position) - this.radius;
                            this.cameraHeight = this.localCameraPosition.length() - this.radius;

                            this.localCameraMaxAngle = Math.acos(this.radius / (this.cameraHeight + this.radius));

                            this.cameraHeight = this.cameraHeight > 0 ? this.cameraHeight : this.radius + 1;
                            // this.log = function (text) {
                            //     self.postMessage({log: text});
                            // };
                            this.quadTrees.forEach(function (tree) {
                                tree.rootNode.update();
                            });
                            this.quadTrees.forEach(function (tree) {
                                tree.rootNode.checkNeighbors();
                            });

                            this.quadTrees.forEach(function (tree) {
                                tree.rootNode.Draw();
                            });


                            self.postMessage(this.returnObject, this.meshesToAdd);

                        },
	
                        RemoveFromDeletedMeshes: function (name) {

                            for (var i = 0, length = this.returnObject.deletedMeshes; i < length; i++) {
                                if (this.returnObject.deletedMeshes[i] == name) {
                                    this.returnObject.deletedMeshes.splice(i, 1);
                                    return;
                                }
                            }

                        },
	
                        Init: function (data) {

                                this.log("Worker says Init called");

                            this.radius = data.radius;
                            this.patchSize = data.patchSize;
                            this.fov = data.fov;
                            // this.geometryProvider = new GeometryProvider(this.patchSize);
                            this.vs = Math.tan(this.fov / data.screenWidth);
                            this.quadTrees = [];
                            this.splitTable = [];
                            this.BuildSplitTable();
                            this.InitQuadTrees();
                            this.AssignNeighbors();
                            self.postMessage({isInitialized: true});
                        },
	
                        BuildSplitTable: function () {
                            var patchPixelWidth, i = 0, patchSize = this.patchSize;
                            while (i < 200) {
                                patchPixelWidth = (Math.PI * this.radius * 2) / (patchSize * 6);
                                this.splitTable[i] = patchPixelWidth / this.vs;
                                patchSize = patchSize * 2;
                                if (this.splitTable[i] < 3) {
                                    this.maxLevel = i;
                                    break;
                                }
                                i++;
                            }
                        },
	
                        InitQuadTrees: function () {

                            var nearCorner = new THREE.Vector3(1, 1, 1).multiplyScalar(this.radius);
                            var farCorner = nearCorner.clone().multiplyScalar(-1);

                            //Near quadtrees
                            this.quadTrees.push(new THREE.QuadTree({name: "Bottom", corner: nearCorner, widthDir: new THREE.Vector3(0, 0, -1), heightDir: new THREE.Vector3(-1, 0, 0), planet: this}));
                            this.quadTrees.push(new THREE.QuadTree({name: "Front", corner: nearCorner, widthDir: new THREE.Vector3(-1, 0, 0), heightDir: new THREE.Vector3(0, -1, 0), planet: this}));
                            this.quadTrees.push(new THREE.QuadTree({name: "Left", corner: nearCorner, widthDir: new THREE.Vector3(0, -1, 0), heightDir: new THREE.Vector3(0, 0, -1), planet: this}));

                                //Far quadtrees
                            this.quadTrees.push(new THREE.QuadTree({name: "Top", corner: farCorner, widthDir: new THREE.Vector3(1, 0, 0), heightDir: new THREE.Vector3(0, 0, 1), planet: this}));
                            this.quadTrees.push(new THREE.QuadTree({name: "Back", corner: farCorner, widthDir: new THREE.Vector3(0, 1, 0), heightDir: new THREE.Vector3(1, 0, 0), planet: this}));
                            this.quadTrees.push(new THREE.QuadTree({name: "Right", corner: farCorner, widthDir: new THREE.Vector3(0, 0, 1), heightDir: new THREE.Vector3(0, 1, 0), planet: this}));

                        },
	
                        AssignNeighbors: function () {

                            var bottom = this.quadTrees[0].rootNode;
                            var front = this.quadTrees[1].rootNode;
                            var left = this.quadTrees[2].rootNode;
                            var top = this.quadTrees[3].rootNode;
                            var back = this.quadTrees[4].rootNode;
                            var right = this.quadTrees[5].rootNode;

                            this.quadTrees[0].AssignNeighbors(left, back, right, front);
                            this.quadTrees[1].AssignNeighbors(left, top, right, bottom);
                            this.quadTrees[2].AssignNeighbors(bottom, back, top, front);
                            this.quadTrees[3].AssignNeighbors(right, front, left, back);
                            this.quadTrees[4].AssignNeighbors(top, left, bottom, right);
                            this.quadTrees[5].AssignNeighbors(back, bottom, front, top);

                        }
                };
                
                //dinhnq 
                THREE.QuadTreeSphereBlobWorker = function () {
                    
                    var funcObj = new QuadTreeSphereWorker();
                    // Build a worker from an anonymous function body
                    var blobURL = URL.createObjectURL(new Blob(['(',

                            funcObj.toString(),

                                ')()'], {
                                type: 'application/javascript'
                            }));
                    return blobURL;
                };
                
                var QuadBuilder = function () {

                };

                QuadBuilder.prototype = {

                    BuildQuadForGrid: function () {

                                var baseIndex, index0, index1, index2, index3, n = new THREE.Vector3(0, 0, 1);

                                return function (geo, position, uv, buildTriangles, vertsPerRow, swapOrder) {

                                    geo.vertices.push(position);
                                    geo.faceVertexUvs.push(uv);

                                    //geo.faceVertexUvs[0].push([]);

                                    if (buildTriangles) {

                                        baseIndex = geo.vertices.length - 1;
                                        index0 = baseIndex;
                                        index1 = baseIndex - 1;
                                        index2 = baseIndex - vertsPerRow;
                                        index3 = baseIndex - vertsPerRow - 1;

                                        if (swapOrder) {
                                            geo.faces.push(new THREE.Face3(index0, index1, index3, [n, n, n]));
                                            geo.faces.push(new THREE.Face3(index0, index3, index2, [n, n, n]));
                                        } else {
                                            geo.faces.push(new THREE.Face3(index2, index1, index3, [n, n, n]));
                                            geo.faces.push(new THREE.Face3(index0, index1, index2, [n, n, n]));
                                        }
                                    }
                                };
                    }()
                };
                
                //
                // Supply a material to a quadrant.
                // To implement your configuration requires a getMaterialForQuad callback method.
                //
                THREE.QuadMaterialBuilder = function (config) {
                        this.config = config;
                        try {
                                this.config.onCreate();
                        }
                        catch (e) {
                                console.error("QuadMaterial onCreate had an error.", e);
                        }
                };

                THREE.QuadMaterialBuilder.prototype = {

                        /**
                         * Vector3 position - The center point of the quad
                         * float radius - Radius of the planet which hosts the quad
                         */
                        buildMaterial: function (centerPoint, position, radius, width) {
                                try {
                                        return this.config.buildMaterialForQuad(centerPoint, position, radius, width);
                                }
                                catch (e) {
                                        console.error("Unable to build quad material.", e);

                                        var color = new THREE.Color();
                                        color.r = color.g = color.b = 255;

                                        return new THREE.MeshBasicMaterial({wireframe: true, color: color});

                                }

                        }

                };

            /*
             * 
             *  Terrain  
            * 
             */
            
            THREE.Terrain = function (resolution, radius, clipMapCount) {

                    THREE.Object3D.call(this);

                    this.radius = radius;
                    this.resolution = resolution;
                    this.clipMapCount = clipMapCount;

                    this.geometry = new THREE.PlaneGeometry(1, 1, resolution, resolution);

                    this.position = new THREE.Vector3(0, 0, 0);
                    this.clipMaps = [];

                    this.terrainCamera = new TerrainCamera(radius, settings.fov, resolution, Window.innerWidth);

                    this.clipMapCount = this.terrainCamera.getViewTheta(settings.minPossibleHeight);
                    this.clipMapCount = Math.floor((Math.log(1 / (this.clipMapCount / Math.PI))) / Math.log(2));

                    this.createClipMaps();

                };

                THREE.Terrain.prototype = Object.create(THREE.Object3D.prototype);

                THREE.Terrain.prototype = {

                    update: function (cameraPosition) {
                        this.updateCameraPosition(cameraPosition);
                        this.updateClipMaps();
                    },

                    updateCameraPosition: function (cameraPosition) {
                        localCameraPosition.copy(cameraPosition);
                        this.worldToLocal(localCameraPosition);
                        this.terrainCamera.update(localCameraPosition);
                    },


                    updateClipMaps: function () {
                        var maxTheta = this.getViewTheta(this.terrainCamera.height);
                        var minTheta = this.terrainCamera.viewTheta;
                        for (var i = 0; i < this.clipMapCount; i++) {
                            if (this.clipMaps[i].theta > minTheta || this.clipMaps[i].theta < minTheta) {
                                if (!this.clipMaps[i].hidden) {
                                    this.clipMaps[i].hide();
                                }
                            } else {
                                if (this.clipMaps[i].hidden) {
                                    this.clipMaps[i].show();
                                }
                                this.clipMaps[i].theta = this.terrainCamera.theta;
                                this.clipMaps[i].phi = this.terrainCamera.phi;
                                //snap positions to grid
                            }
                        }
                    },

                    createClipMaps: function () {
                        var scale = this.radius;
                        for (var i = 0; i < this.clipMapCount; i++) {

                            this.clipMaps[i] = new ClipMap(scale, this.geometry);
                            this.clipMaps[i].theta = this.getViewTheta(scale / 2);//get inner ring theta

                            this.children.concat(this.clipMaps[i].meshes);

                            scale = scale / 2;
                        }
                    },

                    getViewTheta: function (height) {
                        return Math.acos(this.radius / (this.radius + height));
                    }
                };
                
                var terrainCamera = function (radius, fov, resolution, pixels) {
                        this.fov = fov;
                        this.resolution = resolution;
                        this.pixels = pixels;
                        this.phi = 0;
                        this.theta = 0;
                        this.viewTheta = 0;
                        this.height = 0;
                        this.position = 0;
                        this.radius = radius;
                };

                terrainCamera.prototype = {
                         update: function (localCameraPosition) {
                             this.phi = Math.atan2(this.localCameraPosition.x, this.localCameraPosition.x);
                             this.theta = Math.acos(this.localCameraPosition.y); //0 at north pole, PI at south pole
                             this.height = localCameraPosition.length() - this.radius;
                             this.position = localCameraPosition;
                             this.viewTheta = this.getViewTheta(this.height);
                         },

                         getViewTheta: function (height) {
                             var vs = Math.tan(this.fov / this.pixels);
                             var lt = ( (height * vs) / this.radius ) * this.resolution;

                             return lt;
                         }
                };
            
              var Edge = {
                            NONE: 0,
                            TOP: 1,
                            LEFT: 2,
                            BOTTOM: 4,
                            RIGHT: 8
                  };

             var clipMap = function (scale, geo) {
                    this.hidden = false;
                    this.geo    = geo;
                    this.meshes = [];
                    this.phi   = 0;
                    this.theta = 0;

                    // Create center layer first
                    // +---+---+
                    // | O | O |
                    // +---+---+
                    // | O | O |
                    // +---+---+
                    this.createTile(-scale, -scale, scale, Edge.NONE);
                    this.createTile(-scale, 0, scale, Edge.NONE);
                    this.createTile(0, 0, scale, Edge.NONE);
                    this.createTile(0, -scale, scale, Edge.NONE);

                    // Create "quadtree" of tiles, with smallest in center
                    // Each added layer consists of the following tiles (marked 'A'), with the tiles
                    // in the middle being created in previous layers
                    // +---+---+---+---+
                    // | A | A | A | A |
                    // +---+---+---+---+
                    // | A |   |   | A |
                    // +---+---+---+---+
                    // | A |   |   | A |
                    // +---+---+---+---+
                    // | A | A | A | A |
                    // +---+---+---+---+

                    this.createTile(-2 * scale, -2 * scale, scale, Edge.BOTTOM | Edge.LEFT);
                    this.createTile(-2 * scale, -scale, scale, Edge.LEFT);
                    this.createTile(-2 * scale, 0, scale, Edge.LEFT);
                    this.createTile(-2 * scale, scale, scale, Edge.TOP | Edge.LEFT);

                    this.createTile(-scale, -2 * scale, scale, Edge.BOTTOM);
                    // 2 tiles 'missing' here are in previous layer
                    this.createTile(-scale, scale, scale, Edge.TOP);

                    this.createTile(0, -2 * scale, scale, Edge.BOTTOM);
                    // 2 tiles 'missing' here are in previous layer
                    this.createTile(0, scale, scale, Edge.TOP);

                    this.createTile(scale, -2 * scale, scale, Edge.BOTTOM | Edge.RIGHT);
                    this.createTile(scale, -scale, scale, Edge.RIGHT);
                    this.createTile(scale, 0, scale, Edge.RIGHT);
                    this.createTile(scale, scale, scale, Edge.TOP | Edge.RIGHT);

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

                    createTile: function (x, y, scale, edgeMorphy) {
                        var terrainMaterial = new THREE.MeshBasicMaterial();
                        this.meshes.push(new THREE.Mesh(this.geo, terrainMaterial));
                    }
                };
            

});
