/*nguyen dot quocdinh at gmail dot com
 */
define (['lib/three','lib/BinaryStream','lib/PlatformInfo'],function(THREE,BinaryStream,PlatformInfo){
       
        var B3DLoader = function(dalle) {
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
                            xhr.responseType = 'blob';	// use blob method to deal with b3d files for IE >= 10
                    else{
                        xhr.overrideMimeType('text/plain; charset=x-user-defined');
                    }

                    xhr.onreadystatechange = function() {
                        if(this.readyState === 4) {
                            if(this.status === 200 || this.status === 0) {
                                    if(PlatformInfo.browser === 'ie' && PlatformInfo.version >= '10') {
                                        var blobReader = new FileReader;
                                        blobReader.onload = function(event) {
                                            self.parseB3D(event.target.result);
                                        };
                                        blobReader.readAsText(this.response, 'x-user-defined');
                                    }
                                    else {
                                        self.parseB3D(this.responseText);
                                    }
                            }
                            else {
                                   console.log('Failed to load B3D file "' + urlName + '".');
                            }
                        }
                    };

                    xhr.send();
        };
        B3DLoader.prototype.setDecimalPrecision = function(precision) {
                this.decimalPrecision = precision;
        };

        B3DLoader.prototype.parseMaterial= function (reader, endMaterial) {
 
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

        B3DLoader.prototype.readAmount = function(reader,end) {

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

        B3DLoader.prototype.readColor = function(reader) {
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

        B3DLoader.prototype.parseTexture = function(reader, endTexture) {
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

        B3DLoader.prototype.readNulTermString= function (reader) {
            var chr;
            var str = '';

            while ((chr = reader.readUInt8()) > 0) {
                str += String.fromCharCode(chr);
            }

            return str;
        };

        B3DLoader.prototype.parseVertexList = function (reader) {
                  var i = 0;
                  var count = reader.readUInt16();
                  //console.log('have to read '+count+' vertices');
            
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

        B3DLoader.prototype.parseFaceList = function (reader) {
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
        B3DLoader.prototype.parseUVList = function (reader) {
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
        };
        B3DLoader.prototype.parseFaceMaterialList = function (reader) {
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

        
        B3DLoader.prototype.finalizeCurrentMaterial = function () {
                this._materials[this._cur_mat.name] = this._cur_mat;
                this._cur_mat = null;
        };

        B3DLoader.prototype.parseB3D = function(data) {

              var reader = new BinaryStream(data);
                  reader.reset();
            
              while (!reader.eof()) {

                        if (this._cur_mat && reader.tell() >= this._cur_mat_end) {
                                    this.finalizeCurrentMaterial();
                        }
                        else if (this._cur_obj &&  reader.tell() >= this._cur_obj_end) {
                                    
                                    this.dalle.parseB3DObject(this);
                                     
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
                                case 0x4D4D: // MAINB3D
                                    continue;
                                    break;
                                case 0x3D3D: // EDITB3D
                                    continue;
                                    break;
                                case 0xB000: // KEYFB3D
                                    continue;
                                    break;

                                case 0xAFFF: // MATERIAL
                                    this._cur_mat_end = end;
                                    this._cur_mat = this.parseMaterial(reader,end);
                                    break;

                                case 0x4000: // EDIT_OBJECT
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
                                    this.parseVertexList(reader);
                                    break;

                                case 0x4140: // TRI_MAPPINGCOORDS
                                    this.parseUVList(reader);
                                    break;

                                case 0x4120: // TRI_FACELIST
                                    this.parseFaceList(reader);
                                    break;
                                case 0x4130: // Face materials
                                    this.parseFaceMaterialList(reader);
                                    break;

                                default:
                                    reader.skip(len-6);
                                    break;
                            }
                    }
                    if(reader.eof()){
                            this.dalle.parseDallePivot(this.pivot);
                            this.dalle.showDalleInScene();
                            this.dalle.emptyGeometryCache();
                            this.dalle.emptyMaterialsCache();
                            console.log('B3D object was loaded !');
                            console.log(' totalFaces='+this.totalFaces, 'Dalle Name=' + this.dalle.name);
                    }
        };

        B3DLoader.prototype.decimalPrecision = 3;

    return B3DLoader;
    
});