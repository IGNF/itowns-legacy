define ([],function(){

           var BinaryStream = function(data, isBigEndian) {
                    if(isBigEndian)
                            throw 'BinaryStream constructor failed: Big endian is not supported yet!';

                    this.data = data;
                    this.offset = 0;
            };

            BinaryStream.prototype.size = function() {
                    return this.data.length;
            };
            BinaryStream.prototype.tell = function() {
                    return this.offset;
            };
            BinaryStream.prototype.seek = function(position) {
                    if(position < 0 || position >= this.data.length)
                            return false;

                    this.offset = position;

                    return true;
            };
            BinaryStream.prototype.reset = function() {
                    this.offset = 0;
            };
            BinaryStream.prototype.skip = function(bytesToSkip) {
                    if(this.offset + bytesToSkip > this.data.length)
                            this.offset = this.data.length;
                    else
                            this.offset += bytesToSkip;
            };
            BinaryStream.prototype.available = function() {
                    return this.data.length - this.offset;
            };
            BinaryStream.prototype.eof = function() {
                    return !(this.offset < this.data.length);
            };
            BinaryStream.prototype.readUInt8 = function() {
                    return this.decodeInt(1, false);
            };
            BinaryStream.prototype.readInt8 = function() {
                    return this.decodeInt(1, true);
            };
            BinaryStream.prototype.readUInt16 = function() {
                    return this.decodeInt(2, false);
            };
            BinaryStream.prototype.readInt16 = function() {
                    return this.decodeInt(2, true);
            };
            BinaryStream.prototype.readUInt32 = function() {
                    return this.decodeInt(4, false);
            };
            BinaryStream.prototype.readInt32 = function() {
                    return this.decodeInt(4, true);
            };
            BinaryStream.prototype.readFloat32 = function() {
                    return this.decodeFloat(4, 23);
            };
            BinaryStream.prototype.readFloat64 = function() {
                    return this.decodeFloat(8, 52);
            };
            BinaryStream.prototype.readBytes = function(buffer, bytesToRead) {
                    var bytesRead = bytesToRead;
                    if(this.offset + bytesToRead > this.data.length)
                            bytesRead = this.data.length - this.offset;

                    for(var i=0; i<bytesRead; i++) {
                            buffer[i] = this.data[this.offset++].charCodeAt(0) & 0xff;
                    }

                    return bytesRead;
            };
            BinaryStream.prototype.decodeInt = function(bytes, isSigned) {
                    if(this.offset + bytes > this.data.length) {
                            this.offset = this.data.length;
                            return NaN;
                    }

                    var rv = 0, f = 1;
                    for(var i=0; i<bytes; i++) {
                            rv += ((this.data[this.offset++].charCodeAt(0) & 0xff) * f);
                            f *= 256;
                    }

                    if( isSigned && (rv & Math.pow(2, bytes * 8 - 1)) )
                            rv -= Math.pow(2, bytes * 8);

                    return rv;
            };
            BinaryStream.prototype.decodeFloat = function(bytes, significandBits) {
                    if(this.offset + bytes > this.data.length) {
                            this.offset = this.data.length;
                            return NaN;
                    }

                    var mLen = significandBits;
                    var eLen = bytes * 8 - mLen - 1;
                    var eMax = (1 << eLen) - 1;
                    var eBias = eMax >> 1;

                    var i = bytes - 1; 
                    var d = -1; 
                    var s = this.data[this.offset + i].charCodeAt(0) & 0xff; 
                    i += d; 
                    var bits = -7;
                    var e = s & ((1 << (-bits)) - 1);
                    s >>= -bits;
                    bits += eLen
                    while(bits > 0) {
                            e = e * 256 + (this.data[this.offset + i].charCodeAt(0) & 0xff);
                            i += d;
                            bits -= 8;
                    }

                    var m = e & ((1 << (-bits)) - 1);
                    e >>= -bits;
                    bits += mLen;
                    while(bits > 0) {
                            m = m * 256 + (this.data[this.offset + i].charCodeAt(0) & 0xff);
                            i += d;
                            bits -= 8;
                    }

                    this.offset += bytes;

                    switch(e) {
                            case 0:		// 0 or denormalized number
                                    e = 1 - eBias;
                                    break;
                            case eMax:	// NaN or +/-Infinity
                                    return m ? NaN : ((s ? -1 : 1) * Infinity);
                            default:	// normalized number
                                    m += Math.pow(2, mLen);
                                    e -= eBias;
                                    break;
                    }

                    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
            };

return BinaryStream;

});
