/**
 * @module LasReader
 */
define([], function(){
    
    /**
     * Utility function to read a las file provided by an "input" tag and parse it through the LasReader object.
     * @example
     * //we need to have an html input tag somewhere in the document with id="file and type="file"
     *          var onLasLoaded = function(lasObject) {
     *               console.log(lasObject);
     *               console.log(lasObject.getPointData(0));
     *           };
     *           document.getElementById('file').onchange = function() {
     *               var f = this.files[0];
     *               LasReader.lasLoader(this.files[0], onLasLoaded);
     *           };
     *           
     * @todo: need to test how to deal with bigint and also there is bigint in the getPoint function that are not handled yet.
     * @alias module:lasLoader
     * @param {File} lasFileObject the File object provided by the "input" tag.
     * @param {function} onLoadCB the callback to trigger when the load and the parsing is done
     * @param {function} onErrorCB the callback to trigger if the load and the parsing fail.
     * @returns {Void}
     */
    var lasLoader = function(lasFileObject, onLoadCB, onErrorCB) {
        var reader = new FileReader();
        reader.onload = function(result) {
            var lasObj = new LasReader(reader.result);
            onLoadCB(lasObj);
        };
        reader.readAsArrayBuffer(lasFileObject);
    };
    /**
     * @constructor
     * @alias module:LasReader
     * @param {type} lasFileData the raw binary datas provided by a FileReader object.
     */
    var LasReader = function(lasFileData) {
        this.rawData = lasFileData;
        this.header = this.loadHeaderFromFile();
    };
    LasReader.prototype = {
        /**
         * read the las header from the binary datas and populate the good header properties according to the las revision number
         * @returns {Number} the offset in bytes from the start of the binary stream after reading the header.
         */
        loadHeaderFromFile : function() {
            var rawData = this.rawData;
            var getHeaderRoot = function() {
                var dv = new DataView(rawData, 0, 90);
                header.sourceId = dv.getUint16(4);
                header.globalEncoding = dv.getUint16(6); //2
                header.id_guid_data1 = dv.getUint32(8), //4
                header.id_guid_data2 = dv.getUint16(12), //2
                header.id_guid_data3 = dv.getUint16(14), //2
                //header.id_guid_data4  : dv.getUint32(16), //8
                header.versionMajor = dv.getUint8(24), //1
                header.versionMinor = dv.getUint8(25), //1
                header.systemId = ""; //32
                header.generatingSoftware = ""; //32
                return 90;
            };
            
            
            var getHeaderDateRevision_1_0 = function(offset) {
                var dv = new DataView(rawData, offset, 4);
                header.flightDateJulian = dv.getUint16(0, true); //2
                header.year = dv.getUint16(2, true); //2
                return offset + 4;
            };
            var getHeaderDateRevision_1_1to4 = function(offset) {
                var dv2 = new DataView(rawData, offset, 4);
                header.fileCreationDayOfYear = dv2.getUint16(0, true); //2
                header.fileCreationYear = dv2.getUint16(2, true); //2
                return offset + 4;
            };
            var getBasicPointDataInfo = function(offset) {
                var dv = new DataView(rawData, offset, 13);
                header.headerSize             = dv.getUint16(0, true); //2
                header.offsetToPointData      = dv.getUint32(2, true); //4
                header.numberOfVLR            = dv.getUint32(6, true); //4
                header.pointDataRecordFormat  = dv.getUint8(10, true);  //1
                header.pointDataRecordLength  = dv.getUint16(11, true); //2
                return offset + 13;
            };
                     
            var getLegacyPointNumbers = function(offset, old) {
                var dv = new DataView(rawData, offset, 24);
                var numpoint = dv.getUint32(0, true); //4
                var numpointReturn = [];
                var loffset = 4;
                for (var i=0; i< 5; i++) {
                    numpointReturn.push(dv.getUint32(loffset, true)); //4
                    loffset += 4;
                }
                if (old) {
                    header.numberOfPointRecords = numpoint;
                    header.numberOfPointsByReturn = numpointReturn;
                } else {
                    header.legacyNumberOfPointRecords = numpoint;
                    header.legacyNumberOfPointsByReturn = numpointReturn;
                }
                return offset + loffset;
            }
               
            var getBBoxInformations = function(offset) {
                var dv = new DataView(rawData, offset, 96);

                header.XScaleFactor    = dv.getFloat64(0, true); //8
                header.YScaleFactor    = dv.getFloat64(8, true); //8
                header.ZScaleFactor    = dv.getFloat64(16, true); //8
                header.XOffset         = dv.getFloat64(24, true); //8
                header.YOffset         = dv.getFloat64(32, true); //8
                header.ZOffset         = dv.getFloat64(40, true); //8
                header.maxX            = dv.getFloat64(48, true); //8
                header.minX            = dv.getFloat64(56, true); //8
                header.maxY            = dv.getFloat64(64, true); //8
                header.minY            = dv.getFloat64(72, true); //8
                header.maxZ            = dv.getFloat64(80, true); //8
                header.minZ            = dv.getFloat64(88, true); //8
                return offset + 96;
            };
                     
            /**
             * load the waveform data part of the header starting at the provided offset
             * @param {number} offset the offset in bytes the reader will start at
             * @return {number} the new position of the reading head.
             */
            var getHeaderWaveFormData = function(offset) {
                var dv = new DataView(rawData, offset, 4 + (15*8));
                header.startOfEVLR                      = dv.getUint32(offset+8, true); //4
                header.numberOfPointByRecord            = [];
                var loffset = 4;
                for (var i=0; i< 15; i++) {
                    header.numberOfPointByRecord.push(dv.getUint32(loffset, true)* Math.pow(2,32) + dv.getUint32(loffset+4, true)); //8
                    loffset += 8;
                };
                return offset + loffset;
           };
           
           // -------------- start building up things together ------------------
            var getHeaderRevion1_0 = function(offset) {
                offset = getHeaderDateRevision_1_0(offset);
                offset = getBasicPointDataInfo(offset);
                offset = getLegacyPointNumbers(offset);
                offset = getBBoxInformations(offset);
                return offset;
            };
            
            var getHeaderRevision1_1= function(offset) {
                offset = getHeaderDateRevision_1_1to4(offset); //different from 1.0
                offset = getBasicPointDataInfo(offset);
                offset = getLegacyPointNumbers(offset, true);
                offset = getBBoxInformations(offset);
                return offset;                
            };
            var getHeaderRevision1_2= function(offset) {
                offset = getHeaderRevision1_1(offset);
            };
            var getHeaderRevision1_3= function(offset) {
                offset = getHeaderRevision1_2(offset);
                var dv = new DataView(rawData, offset, 8);
                header.startOfWaveFormDataPacketRecord  = dv.getUint32(offset, true)* Math.pow(2,32) + dv.getUint32(offset+4, true); //8
                return offset + 8;
            };
            var getHeaderRevision1_4= function(offset) {
                offset = getHeaderDateRevision_1_1to4(offset); //different from 1.0
                offset = getBasicPointDataInfo(offset);
                offset = getLegacyPointNumbers(offset, false);
                offset = getBBoxInformations(offset);
                var dv = new DataView(rawData, offset, 8);
                header.startOfWaveFormDataPacketRecord  = dv.getUint32(offset, true)* Math.pow(2,32) + dv.getUint32(offset+4, true);
                offset += 8;
                offset = getHeaderWaveFormData(offset);
                return offset;
            };            
            /* -------------- let's go ----------------- */
            var header = {};
            var offset = getHeaderRoot();
            
            if (header.versionMajor === 1){
                switch(header.versionMinor) {
                    case 0:
                        offset = getHeaderRevision1_0(offset);
                        break;
                    case 1: 
                        offset = getHeaderRevision1_1(offset);
                        break;
                    case 2: 
                        offset = getHeaderRevision1_2(offset);
                        break;

                    case 3: 
                        offset = getHeaderRevision1_3(offset);
                        break;

                    case 4: 
                        offset = getHeaderRevision1_4(offset);    
                        break;

                }
            }
            return header;
        },
        getRawPointData : function(pointNumber) {
            var pointPosition = this.header.offsetToPointData + (pointNumber * this.header.pointDataRecordLength);            
            var pointData = {}
            pointData.X = pointPosition;
            pointData.Y = pointPosition+4;
            pointData.Z = pointPosition+8;
            pointData.intensity = pointPosition+12;
            return pointData;
        },
        
        /**
         * get the datas associated with the point number
         * @param {number} pointNumber id of the point to be retrieved.
         * @returns {object} an object containing the datas for this point.
         */
        getPointData : function(pointNumber) {
            var pointPosition = this.header.offsetToPointData + (pointNumber * this.header.pointDataRecordLength);

            var b1 = 1;    //00000001
            var b2 = 2;    //00000010
            var b3 = 4;    //00000100
            var b4 = 8;    //00001000
            var b5 = 16    //00010000
            var b6 = 32;   //00100000
            var b7 = 64;   //01000000
            var b8 = 128;  //10000000

            var pdv = new DataView(this.rawData, pointPosition, this.header.pointDataRecordLength)
            var pointData = {}
            var getDataForPointFormat0 = function () {
                pointData.X                = pdv.getInt32(0, true);   // 4
                pointData.Y                = pdv.getInt32(4, true);   // 4
                pointData.Z                = pdv.getInt32(8, true);   // 4
                pointData.intensity        = pdv.getUint16(12, true); // 2 -- to be normalized to 65535 before use
                var packedBit              = pdv.getUint8(14, true);  // 1
                pointData.returnNumber     = packedBit & (b1|b2|b3);  //3bits
                pointData.numberOfReturns  = packedBit >> 3 & (b1|b2|b3) // 3bits
                pointData.scanDirectionFlag= packedBit >> 6 & (b1); // 1 bit
                pointData.edgeOfFlightLine = packedBit >> 7 & (b1); //1 bit
                pointData.classification   = pdv.getUint8(15, true);  //1
                pointData.scanAngleRank    = pdv.getInt8(16, true);   //1
                pointData.userData         = pdv.getUint8(17, true);  //1
                pointData.pointSourceID    = pdv.getUint16(18, true); //2
                return 20;
            }
            var getDataForPointFormat1 = function() {
                var offset = getDataForPointFormat0()
                pointData.gpsTime          = pdv.getFloat64(offset, true); //8
                return offset + 8;
            }

            function getRVB(offset) {
                pointData.red              = pdv.getUint16(offset  , true);  //2
                pointData.green            = pdv.getUint16(offset+2, true);  //2
                pointData.blue             = pdv.getUint16(offset+4, true);  //2
                return offset + 6;
            }

            var getDataForPointFormat2 = function() {
                var offset = getDataForPointFormat0();
                offset = getRVB(offset);
                return offset;
            }
            var getDataForPointFormat3 = function() {
                var offset = getDataForPointFormat0();
                pointData.gpsTime          = pdv.getFloat64(offset, true); //8
                offset = getRVB(offset+8);
                return offset;
            }

            function getWaveFormPacketData(offset) {
                pointData.wavePacketDescriptorIdx      = pdv.getInt8(offset, true);      //1
                pointData.byteOffsetToWaveFormData1    = pdv.getUint32(offset + 1, true);   //4 Achtung this is an int64 !
                pointData.byteOffsetToWaveFormData2    = pdv.getUint32(offset + 5, true);   //4 not provided in dataview
                pointData.waveFormPacketSizeInBytes    = pdv.getUint32(offset + 9, true);   //4
                pointData.returnPointWaveformLocation  = pdv.getFloat32(offset + 13, true); //4
                pointData.Xt                           = pdv.getFloat32(offset + 17, true); //4
                pointData.Yt                           = pdv.getFloat32(offset + 21, true); //4
                pointData.Zt                           = pdv.getFloat32(offset + 25, true); //4
                return offset + 29;
            }
            var getDataForPointFormat4 = function() {
                var offset = getDataForPointFormat1();
                offset = getWaveFormPacketData(offset);
                return offset;
            }

            var getDataForPointFormat5 = function() {
                var offset = getDataForPointFormat3();
                offset = getWaveFormPacketData(offset);
                return offset;
            }

            var getDataForPointFormat6 = function () {
                pointData.X                = pdv.getInt32(0, true);   // 4
                pointData.Y                = pdv.getInt32(4, true);   // 4
                pointData.Z                = pdv.getInt32(8, true);   // 4
                pointData.intensity        = pdv.getUint16(12, true); // 2 -- to be normalized to 65535 before use
                var packedBit1              = pdv.getUint8(14, true);  // 1 
                pointData.returnNumber     = packedBit1 & (b1|b2|b3|b4);  //4bits <!--
                pointData.numberOfReturns  = packedBit1 >> 4 & (b1|b2|b3|b4) //4bits <!--
                var packedBit2              = pdv.getUint8(15, true);  // 1 <!--
                pointData.classificationFlags = packedBit2 & (b1|b2|b3|b4);  //4bits <!--
                pointData.scannerChannel   = packedBit2 >> 4 & (b1|b2); //2bits <!--
                pointData.scanDirectionFlag= packedBit2 >> 6 & (b1); // 1 bit
                pointData.edgeOfFlightLine = packedBit2 >> 7 & (b1); //1 bit
                pointData.classification   = pdv.getUint8(16, true);  //1
                pointData.userData         = pdv.getUint8(17, true);  //1
                pointData.scanAngleRank    = pdv.getInt16(18, true);  //2 <!-- 
                pointData.pointSourceID    = pdv.getUint16(20, true); //2
                pointData.gpsTime          = pdv.getFloat64(22, true); //8
                return 30;
            }

            var getDataForPointFormat7 = function() {
                var offset = getDataForPointFormat6();
                offset = getRVB(offset);
                return offset;
            }
            var getDataForPointFormat8 = function() {
                var offset = getDataForPointFormat7();
                pointData.nir          = pdv.getUint16(offset, true); //2
                return offset +2;
            }
            var getDataForPointFormat9 = function() {
                var offset = getDataForPointFormat6();
                offset = getWaveFormPacketData(offset);
                return offset;
            }
            var getDataForPointFormat10 = function() {
                var offset = getDataForPointFormat8();
                offset = getWaveFormPacketData(offset);
                return offset;
            }


            var pointDataFormat = {
                0: getDataForPointFormat0,
                1: getDataForPointFormat1,
                2: getDataForPointFormat2,
                3: getDataForPointFormat3,
                4: getDataForPointFormat4,
                5: getDataForPointFormat5,
                6: getDataForPointFormat6,
                7: getDataForPointFormat7,
                8: getDataForPointFormat8,
                9: getDataForPointFormat9,
                10: getDataForPointFormat10,
            }
            pointDataFormat[this.header.pointDataRecordFormat]();
            return pointData;
        }
    };
    return {
        LasReader:LasReader,
        lasLoader:lasLoader
        };
});