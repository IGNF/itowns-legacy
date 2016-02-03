
/**
* 
* @author AD IGN
* Class where we get the Extrinseque and Intrinseque parameters of the system. Camera (laser soon).
* Next we will dynamically load configuration from server in case of changes
* @Depends Sensor.js
*/

define (['GraphicEngine','lib/three','Utils','Sensor','jquery', 'Config', 'PanoramicProvider'],
function (graphicEngine, THREE, Utils, Sensor, $, Config, PanoramicProvider) {
                                              
      var sensors = []; // Contains all the sensors

      var Ori = {
           
          initiated:false, 
                 
          init: function(){
                var that = this;
                $.getJSON(PanoramicProvider.getMetaDataSensorURL(), function (data){
                           that.handleDBData(data);
                });
           },

          // Create the cameras from the infos took in the DB, JSON
          // Transform all coordinates in itowns ref
          // Fill the array of Sensors
          
          handleDBData :function(data){
                for (var i =0; i< data.length; ++i)  // For all DB sens info we create sensor object
                    sensors.push(new Sensor(data[i]));
                this.initiated = true;
                console.log('Orientation module is loaded');
           },

         // Global orientation matrix of the vehicule
         // Warning: heading pitch roll not all in right side in itowns ref
         // Pitch and Roll are in opposite
          computeMatOriFromHeadingPitchRoll: function(heading,pitch,roll){
                heading = parseFloat(heading) / 180 * Math.PI;  // Deg to Rad // Axe Y
                pitch = parseFloat(pitch)/ 180 * Math.PI;  // Deg to Rad // axe X
                roll = parseFloat(roll)/ 180 * Math.PI;  // Deg to Rad   // axe Z
                // With quaternion  //set rotation.order to "YXZ", which is equivalent to "heading, pitch, and roll"
                var q = new THREE.Quaternion();
                q.setFromEuler(new THREE.Euler(-pitch,heading,-roll,'YXZ'),true);
                var matTotale = new THREE.Matrix4().makeRotationFromQuaternion(q);//qRoll);//quater);
                //console.log('quater',qRoll);
                return matTotale;//.transpose(); //mat2 //matRotation;
          },
          

        getBarycentreV2: function(){
            var sum = new THREE.Vector3(0,0,0);
            for (var i =0; i< sensors.length; ++i)
               sum = sum.add(sensors[i].position);
            return sum.divideScalar(sensors.length);

        },

        getDistortionAndR2ForCamAsVec4: function(num){
             return sensors[num].distortion;
        },

        getSommet: function(num){
        return sensors[num].position;
        },

        getProjCam: function(num){
        return sensors[num].projection;
        },

        getMatCam: function(num){
        return sensors[num].rotation;
        }
    };
     
     
    return Ori
    
  }
)
