
/**
* 
* @author AD IGN
* Class where we get the Extrinseque and Intrinseque parameters of the system. Camera (laser soon).
* Next we will dynamically load configuration from server in case of changes
* @Depends Sensor.js
*/

define (['GraphicEngine','lib/three','Utils','Sensor','jquery', 'Config', 'PanoramicProvider'],
function (graphicEngine, THREE, Utils, Sensor, $, Config, PanoramicProvider) {
                                              
      //var sensors = []; // Contains all the sensors

      var Ori = {
           
          initiated:false, 
          sensors:[],
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
                for (var i =0; i< data.length; ++i){  // For all DB sens info we create sensor object
                    this.sensors.push(new Sensor(data[i]));
                }
                this.initiated = true;
                console.log('Orientation module is loaded');
           },

         // Global orientation matrix of the vehicule
         // Warning: heading pitch roll not all in right side in itowns ref
         // Pitch and Roll are in opposite
          computeMatOriFromHeadingPitchRoll: function(heading,pitch,roll){
              
              //  console.log(heading,pitch,roll);
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
          
        getDistortion_r2max: function(distortion){
            // returned the square of the smallest positive root of the derivativeof the distortion polynomial
            // which tells where the distortion might no longer be bijective.
            var roots = Utils.cardan_cubic_roots(7*distortion[2],5*distortion[1],3*distortion[0],1);
            var imax=-1;
                for (var i in roots)
                    if(roots[i]>0 && (imax==-1 || roots[imax]>roots[i])) imax = i;
            if(imax==-1) return Infinity; // no roots : all is valid !
            return roots[imax];
        },
        
        getDistortionAndR2ForCamAsVec4: function(numCam){
             var arrDistortion = this.getDistortionsPolynomesForCam(numCam);
             var r2max = this.getDistortion_r2max(arrDistortion);
             return new THREE.Vector4(arrDistortion[0],arrDistortion[1],arrDistortion[2],r2max);
        },
        

        getBarycentreV2: function(){
            var sum = new THREE.Vector3(0,0,0);
               for (var i =0; i< this.sensors.length; ++i){  // For all DB sens info we create sensor object
                    sum = sum.add(this.sensors[i].position);
                }
            return sum.divideScalar(this.sensors.length);

        },
        


        // return 3rd degree polynomes for camera number in parameter
        getDistortionsPolynomesForCam: function(num){
        return this.sensors[num].distortion;
        },
          

        getSommet: function(num){
        return this.sensors[num].position;
        },

        getProjCam: function(num){
        return this.sensors[num].projection;
        },

        getMatCam: function(num){
        return this.sensors[num].rotation;
        }
    };
     
     
    return Ori
    
  }
)
         