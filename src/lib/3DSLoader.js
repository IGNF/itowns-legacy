/*nguyen dot quocdinh at gmail dot com
 */

define (['lib/three','lib/BinaryStream','lib/PlatformInfo'],function(THREE,BinaryStream,PlatformInfo){
        var DS3Loader = function(dalle) {
                    this.decimalPrecision = 3;
                    this._materials = {};
                    this._unfinalized_objects = {};
                    this._textures={};

                    this._cur_obj_end = 0;
                    this._cur_obj;
                    
                    this._cur_mat_end = 0;
                    this._cur_mat;

                    this.totalFaces = 0;
                    this.pivot      = new THREE.Vector3(0,0,0);
                    //only for test
                    this.dalle      = dalle;
                    var self = this;
                    var xhr = new XMLHttpRequest;
  		    var urlName = dalle.getUrlDSFile();
                    xhr.open('GET', urlName, true);
                    
                    if(PlatformInfo.browser === 'ie' && PlatformInfo.version >= '10')
                            xhr.responseType = 'blob';	// use blob method to deal with 3DS files for IE >= 10
                    else{
                        xhr.overrideMimeType('text/plain; charset=x-user-defined');
                    }

                    xhr.onreadystatechange = function() {
                        if(this.readyState === 4) {
                            if(this.status === 200 || this.status === 0) {
                                    if(PlatformInfo.browser === 'ie' && PlatformInfo.version >= '10') {
                                        // asynchronously decode blob to binary string
                                        var blobReader = new FileReader;
                                        //remplace scene par callback
                                        blobReader.onload = function(event) {
                                            self.parse3DS(event.target.result);
                                        };
                                        blobReader.readAsText(this.response, 'x-user-defined');
                                    }
                                    else {
                                        self.parse3DS(this.responseText);
                                    }
                            }
                            else {
                                   console.log('Failed to load 3DS file "' + urlName + '".');
                            }
                        }
                    };

                    xhr.send();
        };
        DS3Loader.prototype.setDecimalPrecision = function(precision) {
                this.decimalPrecision = precision;
        };

        DS3Loader.prototype.parseMaterial= function (reader, endMaterial) {
 
                var mat = {};

                while (reader.tell() < endMaterial) {
                    var cid ;
                    var len;
                    var end;

                    cid = reader.readUInt16();
                    len = reader.readUInt32();
                    end = reader.tell() + (len-6);

                    switch (cid) {
                        case 0xA000: // Material name
                            mat.name = this.readNulTermString(reader);
                            break;

                        case 0xA010: // Ambient color
                            mat.ambientColor = this.readColor(reader);
                            break;

                        case 0xA020: // Diffuse color
                            mat.diffuseColor = this.readColor(reader);
                            break;

                        case 0xA030: // Specular color
                            mat.specularColor = this.readColor(reader);
                            break;

                        case 0xA050: // transparency
                            mat.transparency = this.readAmount(reader,end);
                          break;

                        case 0xA081: // Two-sided, existence indicates "true"
                            mat.twoSided = true;
                            break;

                        case 0xA200: // Main (color) texture
                            mat.colorMap = this.parseTexture(reader,end);
                            break;

                        case 0xA204: // Specular map
                            mat.specularMap = this.parseTexture(reader,end);
                            break;

                        default:
                            reader.seek(end);
                            break;
                    }
                }

                return mat;
        };

        DS3Loader.prototype.readAmount = function(reader,end) {

            var cid;
            var len;
            var amount = 0;
            cid = reader.readUInt16();
            len = reader.readUInt32();

            switch (cid) {
                case 0x0030: // Floats
                    amount = reader.readUInt16();
                    break;
                default:
                    break;
            }
            reader.seek(end);
                return amount;
        };

        DS3Loader.prototype.readColor = function(reader) {
            var cid;
            var len;
            var r, g, b;

            cid = reader.readUInt16();
            len = reader.readUInt32();

            switch (cid) {
                case 0x0010: // Floats
                    r = reader.readFloat32() * 255;
                    g = reader.readFloat32() * 255;
                    b = reader.readFloat32() * 255;
                    break;
                case 0x0011: // 24-bit color
                    r = reader.readUInt8();
                    g = reader.readUInt8();
                    b = reader.readUInt8();
                    break;
                default:
                    reader.skip(len-6);
                    break;
            }

            return (r<<16) | (g<<8) | b;
        };

        DS3Loader.prototype.parseTexture = function(reader, endTexture) {
            var tex ={};

            while (reader.tell() < endTexture) {
                var cid;
                var len;

                cid = reader.readUInt16();
                len = reader.readUInt32();

                switch (cid) {
                    case 0xA300:
                        tex.url = this.readNulTermString(reader);
                        break;

                    default:
                        // Skip this unknown texture sub-chunk
                        reader.skip(len-6);
                        break;
                }
            }

            this._textures[tex.url] = tex;
            return tex;
        };

        DS3Loader.prototype.readNulTermString= function (reader) {
            var chr;
            var str = '';

            while ((chr = reader.readUInt8()) > 0) {
                str += String.fromCharCode(chr);
            }

            return str;
        };

        DS3Loader.prototype.parseVertexList = function (reader) {
                  var i = 0;
                  var count = reader.readUInt16();
                  this._cur_obj.verts = new Array(count);

                  while (i<count) {
                      var x, y, z;

                      x = reader.readFloat32();
                      y = reader.readFloat32();
                      z = reader.readFloat32();
                      
                      this._cur_obj.verts[i] = new THREE.Vector3(x,z,y) ;
                      i++;
                  }
        };

        DS3Loader.prototype.parseFaceList = function (reader) {
                    var i = 0;
                    var count = reader.readUInt16();
                    this._cur_obj.facesCount = count;
                    this._cur_obj.indices = [];
                    this._cur_obj.uvsIndexes = [];

                    while (i < count) {
                        var i0, i1, i2;

                        i0 = reader.readUInt16();
                        i1 = reader.readUInt16();
                        i2 = reader.readUInt16();
                        this._cur_obj.indices.push(new THREE.Face3(i0,i2,i1));

                        this._cur_obj.uvsIndexes.push(new THREE.Vector3(i0,i2,i1));

                        i++;
                        // Skip "face info", irrelevant data
                        reader.skip(2);
                    }

                    this._cur_obj.smoothingGroups = [];
                    for (var index = 0 ; index <this._cur_obj.facesCount;index++){
                        this._cur_obj.smoothingGroups[index] = 0;
                    }
        };



        DS3Loader.prototype.parseUVList = function (reader) {
            var i = 0;
            var count = reader.readUInt16();
            this._cur_obj.uvs = [];
 
            while (i < count) {
                var u,v;
                 
                u = reader.readFloat32();
                v = 1- reader.readFloat32();   
                this._cur_obj.uvs.push(new THREE.Vector2(u,v));
                i+=1;
            }
           //console.log(this._cur_obj.uvs); 
        };


        DS3Loader.prototype.parseFaceMaterialList = function (reader) {
                var mat   = this.readNulTermString(reader);
                var count = reader.readUInt16();
                var i = 0;
                var faces = [];

                for (var index = 0 ; index < count;index++){
                    faces[index] = 0;
                }

                while (i<faces.length) {
                    faces[i++] = reader.readUInt16();
                }

                this._cur_obj.materials.push(mat);
                this._cur_obj.materialFaces[mat] = faces;
        };


        DS3Loader.prototype.readTransform = function (reader) {
             var n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44;
                // X axis
                n11 = reader.readFloat32(); // X
                n31 = reader.readFloat32(); // Z
                n21 = reader.readFloat32(); // Y
                n41 = 0;

                // Z axis
                n13 = reader.readFloat32(); // X
                n33 = reader.readFloat32(); // Z
                n23 = reader.readFloat32(); // Y
                n43 = 0;

                // Y Axis
                n12 = reader.readFloat32(); // X
                n32 = reader.readFloat32(); // Z
                n22 = reader.readFloat32(); // Y
                n42 = 0;

                // Translation
                n14 = reader.readFloat32(); // X
                n34 = reader.readFloat32(); // Z
                n24 = reader.readFloat32(); // Y
                n44 = 1;
                //console.log(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44);
                return new THREE.Matrix4().set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44 );
        };

        DS3Loader.prototype.parseObjectAnimation = function (reader,end) {
                var vo, obj, name, hier;

                // Pivot defaults to origin
                var px,py,pz;
                while (reader.tell() < end) {
                    var cid;
                    var len;

                    cid = reader.readUInt16();
                    len = reader.readUInt32();

                    switch (cid) {
                        case 0xb010: // Name/hierarchy
                            name = this.readNulTermString(reader);
                            reader.skip(4);
                            hier = reader.readInt16();
                            break;

                        case 0xb013: // Pivot
                            px = reader.readFloat32();
                            pz = reader.readFloat32();
                            py = reader.readFloat32();
                            if((px !==0) && (pz!==0))
                                    this.pivot.set(px,py,pz);
                            //console.log('pivot',pivot.x,pivot.y,pivot.z)
                            break;

                        default:
                            reader.skip(len-6);
                            break;
                    }
                }
                if (name != '$$$DUMMY' && this._unfinalized_objects.hasOwnProperty(name)) {
                    vo = this._unfinalized_objects[name];
                    delete this._unfinalized_objects[name];
                }
        };


        DS3Loader.prototype.parseSmoothingGroups = function (reader) {
            var len = this._cur_obj.facesCount;
            var i = 0;
            while (i < len) {
                this._cur_obj.smoothingGroups[i] = reader.readUInt32();
                i++;
            }
        };

        
        DS3Loader.prototype.finalizeCurrentMaterial = function () {
                this._materials[this._cur_mat.name] = this._cur_mat;
                this._cur_mat = null;
        };

        DS3Loader.prototype.parse3DS = function(data) {

              var reader = new BinaryStream(data);
                  reader.reset();
            
              while (!reader.eof()) {

                        if (this._cur_mat && reader.tell() >= this._cur_mat_end) {
                                    this.finalizeCurrentMaterial();
                        }
                        else if (this._cur_obj &&  reader.tell() >= this._cur_obj_end) {
                                    
                                    this.dalle.parse3DSGeometry(this);
                                     
                                    this.totalFaces+=this._cur_obj.facesCount;
                                    this._unfinalized_objects[this._cur_obj.name] = this._cur_obj;
                                    this._cur_obj_end = Number.MAX_VALUE;
                                    this._cur_obj = null;
                        }//end if


                        var cid, len, end;
                            cid = reader.readUInt16();
                            len = reader.readUInt32();
                            end = reader.tell() + (len-6);

                        switch (cid) {
                                case 0x4D4D: // MAIN3DS
                                    //console.log('Read MAIN3DS');
                                    continue;
                                    break;
                                case 0x3D3D: // EDIT3DS
                                    //console.log('Read EDIT3DS');
                                    continue;
                                    break;
                                case 0xB000: // KEYF3DS
                                    //console.log('Read KEYF3DS');
                                    continue;
                                    break;

                                case 0xAFFF: // MATERIAL
                                    //console.log('Read material');
                                    this._cur_mat_end = end;
                                    this._cur_mat = this.parseMaterial(reader,end);
                                    break;

                                case 0x4000: // EDIT_OBJECT
                                    //console.log('Read object');
                                    this._cur_obj_end = end;
                                    this._cur_obj = {};
                                    this._cur_obj.name = this.readNulTermString(reader);
                                    this._cur_obj.materials = [];
                                    this._cur_obj.materialFaces = [];
                                    break;

                                case 0x4100: // OBJ_TRIMESH

                                    this._cur_obj.type = 'mesh';
                                    break;

                                case 0x4110: // TRI_VERTEXL
                                    //console.log('Read the vertex buffer');
                                    this.parseVertexList(reader);
                                    break;

                                case 0x4140: // TRI_MAPPINGCOORDS
                                   // console.log('Read the texture coords buffer');
                                    this.parseUVList(reader);
                                    break;

                                case 0x4120: // TRI_FACELIST
                                   // console.log('Read the faces buffer');
                                    this.parseFaceList(reader);
                                    break;
                                case 0x4130: // Face materials
                                   // console.log('Read the face materials buffer');
                                    this.parseFaceMaterialList(reader);
                                    break;

                                case 0x4160: // Transform
                                   // console.log('Read the object transformation');
                                    this._cur_obj.transform = this.readTransform(reader);
                                    break;

                                case 0xB002: // Object animation (including pivot)
                                   // console.log('Read the object animation');
                                    this.parseObjectAnimation(reader,end);
                                    break;

                                case 0x4150: // Smoothing groups
                                   // console.log('Read the smoothing groups');
                                    this.parseSmoothingGroups(reader);
                                    break;

                                default:
                                    // Skip this (unknown) chunk
                                    reader.skip(len-6);
                                   // console.log('unknown chunk'); 
                                    break;
                            }
                    }
                    if(reader.eof()){
                           
                            this.dalle.parseDallePivot(this.pivot);
                            this.dalle.showDalleInScene();
                            this.dalle.emptyGeometryCache();
                            this.dalle.emptyMaterialsCache();
                            console.log('3DS object was loaded !');
                            console.log(' totalFaces='+this.totalFaces);
                    }
                   

        };

        DS3Loader.prototype.decimalPrecision = 3;

    return DS3Loader;
    
});
