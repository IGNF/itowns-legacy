/**
 * Creates a new Measure obj
 * @author alexandre devaux IGN
 * @class Manages measures
 * 
 */

define(['jquery', 'GraphicEngine', 'three','Panoramic', 'Dispatcher',  'Draw', 'Navigation'],
    function($, gfxEngine, THREE, Panoramic, Dispatcher, Draw, Navigation) {

    var _posCurrent = null, // vec3 current position
        _RAY_SEARCH = 550,   // ray of search for measures in DB
        _tabMeasures = [],
        _measures =  {},
        _poiArray = null,
        _currentGID = 0,
        _poiIterator = 0,
        _lastMeasure = {},
        


        // EVENT MANAGEMENT
        //*************************************
    _events = {
        MOVE: function() {
            if ($("#connected").length==1)
                Measure.updateMeasureAroundPosition();
        }
    };



    var Measure = {
        
        initiated: false,
        
        init: function() {

            console.log('Measure initiated');
            _posCurrent = Panoramic.getPanoPos();
            _tabMeasures = [];
            this.showUserMeasures();
            Dispatcher.register("MOVE", Measure);
            this.initiated = true;
        },
        
        
       updateMeasureAroundPosition: function(){
                           
             var newPos = Panoramic.getPanoPos();
             var dist = newPos.distanceTo(_posCurrent);                 
             if(dist > _RAY_SEARCH){  // We remove existing measures and load new ones
                  Draw.removeAllMeasures();
                  console.log('load NEW MEASURES');
                  this.showUserMeasures();
                  //update last position
                  _posCurrent = newPos;
             }            
       },

                
        //fonction de tests, appelee dans le traitement de l'event MOVE
        showUserMeasures: function(){
           //console.log('show user measures',$("#connected"));
            if ($("#connected").length==1){ console.log('user is connected');  // Test if user is connected
                var currentPanoInfos = Panoramic.getPanoInfos();
                var params = "easting="+currentPanoInfos.easting+"&northing="+currentPanoInfos.northing+"&ray="+_RAY_SEARCH;
                $.getJSON("php/getUserInputs.php?"+params, function(data){
                    _measures = data; console.log(data);
                   // _poiArray = JSON.parse(data.poi);
                    Measure.drawUserMeasures();
                });
            }    
        },

        
        drawUserMeasures: function(){
           // console.log("Draw.drawLines");
            Draw.drawLines(_measures.lines);
            Draw.drawPOI(_measures.poi);
        },

        drawMeasure: function(pt){
            
            Draw.drawPOI([{x:pt.x,y:pt.y,z:pt.z,description:"QT"}]);
        },
        
        drawAlgoResults: function(data,id){
            
            console.log("Draw algo results");
            Draw.drawProfiles(data,id);
          //  Draw.createMesh(data);
        },
        
        
        // Launch alex H program through zooproject and display result (dynamically)
        launchAlgoAH: function(){

          $.getJSON("http://172.20.0.158/cgi-bin/zoo_loader.cgi?ServiceProvider=&metapath=&Service=WPS&Request=Execute&Version=1.0.0&Identifier=totalprofil&DataInputs=x1_1=1904.461792;y1_1=21219.601562;z1_1=37.966621;x1_2=1904.458496;y1_2=21219.748047;z1_2=37.965637;x1_3=1904.447632;y1_3=21219.892578;z1_3=37.969490;x1_4=1904.430542;y1_4=21220.134766;z1_4=37.967007;x2_1=1900.932617;y2_1=21219.376953;z2_1=37.785740;x2_2=1900.92443;y2_2=21219.521484;z2_2=37.777386;x2_3=1900.916260;y2_3=21219.716797;z2_3=37.778072;x2_4=1900.909668;y2_4=21219.861328;z2_4=37.767097",
            function(){});
          
          this.showAlgoMeasures();
          
        },        
                  
        //fonction de tests, appelee dans le traitement de l'event MOVE
        showAlgoMeasures: function(){
           
            console.log('showAlgoMeasures');
            var idAlgo = 1; 
            $.getJSON("php/getAlgoResults.php?idAlgo="+idAlgo, function(data){

               if( data.length > _currentGID){
                   
                    Measure.drawAlgoResults(data,_currentGID);
                    _currentGID = data.length;                  
              }
              
               setTimeout(Measure.showAlgoMeasures, 500);
            });
            
        },
        
        
        processEvent: function(event) {
            if (_events[event]) {
                _events[event]();
            }
        },
        
        getMeasures: function(){
            return _measures;
        },

        setMeasures: function(m){

            _measures = m;
        },
        
         getPoiArray: function(){
            return _poiArray;
        },

        setPoiArray: function(poi){

            _poiArray = poi;
        },
        
        
        addPOI: function(poiPos,poiDescription){

           var pSon = {x:parseFloat(poiPos.x),y:parseFloat(poiPos.y),z:parseFloat(poiPos.z),description:poiDescription};

        
           if(!_measures.poi){
               var nameItem = "p0";
               _measures.poi = {};
               _measures.poi[nameItem] = pSon;
           }
           else{
              var l = Object.keys(_measures.poi).length;  // To get clean length of object pois
              var nameItem = "p"+l;
              _measures.poi[nameItem] = pSon;
           }

           console.log(_measures);   
        },
        
        
        goToPOI: function(side){
            
            var poiToGo;
            var l = Object.keys(_measures.poi).length; 
            
            if(side=='next'){
                _poiIterator++
            }else{
                _poiIterator--;
            }
            
            var i = (l +_poiIterator) % l;
            if (i<0) i +=l;
            var poiName = 'p'+i;
             
            poiToGo = _measures.poi[poiName];
            console.log(poiToGo);
            var posToGo = new THREE.Vector3(poiToGo.x,poiToGo.y,poiToGo.z);
            var option = {intersectionToLook:posToGo.clone().sub(gfxEngine.getZeroAsVec3D()),surfaceType:"Rectangle"};
            Navigation.goToClosestPosition(posToGo,option);
            
        },
        
         getLastMeasure: function(){
            return _lastMeasure;
        },
        
        setLastMeasure: function(m){
            _lastMeasure = m;
        }

        
    };
    
   
    
    return Measure;
    
});
