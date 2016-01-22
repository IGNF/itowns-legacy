define (function () {
    
    var _mode = "stereopolis";
    
    /**
     * Manages the global configuration of iTOWNS
     * @export Config
     */
    
    var Config = {
        
        init : function (conf){
            _mode = conf;
        },
        
        dataURL:{
            defaultUrlMetaDataProviderPos  : "php/getInfosFromPos.php?",
            defaultUrlMetaDataProviderName : "php/getInfosFromName.php?",
            defaultUrlImageFile            : "",
            defaultUrlMetaProviderSensor   : "php/getSensorsInfos.php",
            defaultUrlBuildingFootprint    : "http://wxs.ign.fr/",
            defaultUrlDTM                  : "php/getDTM.php?",
            defaultUrlPointCloud           : "http://www.itowns.fr/viewer/",
            defaultUrl3DBuilding           : "http://www.itowns.fr/viewer/Bati3D_LOB/Version4LODS/"
        },
        
        
        phpDir : "php/", //"http://www.itowns.fr/php2/",

        set conf(val) { 
            if (val === "dell") {
                _mode = "dell";
            }
            else {
                _mode = "stereopolis";
            }
        },
        serverList : ["stereopolis", "dell"],
        server : {
            dell : {
                url : "http://DEL1101W001", //
                iipService : ""
            },
            stereopolis : {
                url : "http://www.itowns.fr",
                iipService : ""
            },
            get url () { return this[_mode].url; },
            get iipService() { return this[_mode].iipService; },
        },
        geoAPIKey : ""
    };
    
    return Config;
});

// Nouvelle cle all Services (WMS/WMTS, orthoPARIS) itowns.fr 8c7lypm4agbrdinqtj2u6q8i  (expire le 20/11/2016)
// Clé localhost all Services (WMS/WMTS, orthoPARIS): ngpro6r3fk4d49q5eqihgn18 (expire le 20/11/2016)
