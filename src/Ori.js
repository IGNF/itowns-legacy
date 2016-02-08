
/**
* 
* @author AD IGN
* Class where we get the Extrinseque and Intrinseque parameters of the system. Camera (laser soon).
* Next we will dynamically load configuration from server in case of changes
* @Depends Sensor.js
*/

define(['lib/three','Sensor','jquery', 'PanoramicProvider'],
  function (THREE, Sensor, $, PanoramicProvider) {

    var Ori = {

      initiated:false, 
      sensors:[],

      init: function(){
        var that = this;
        $.getJSON(PanoramicProvider.getMetaDataSensorURL(), function (data){
         that.handleDBData(data);
       });
      },

      handleDBData :function(data){
        for (var i =0; i< data.length; ++i)  // For all DB sensor info we create sensor object
          this.sensors.push(new Sensor(data[i]));
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
        var q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch,heading,-roll,'YXZ'),true);
        return new THREE.Matrix4().makeRotationFromQuaternion(q);
      },

      getPosition: function(){
        var sum = new THREE.Vector3(0,0,0);
        for (var i =0; i< this.sensors.length; ++i)
          sum = sum.add(this.sensors[i].position);
        return sum.divideScalar(this.sensors.length);
      },

      // deprecated methods
      getDistortion: function(num){ return this.sensors[num].distortion; },
      getPPS       : function(num){ return this.sensors[num].pps;},
      getSize      : function(num){ return this.sensors[num].size;},
      getSommet    : function(num){ return this.sensors[num].position;   },
      getProjCam   : function(num){ return this.sensors[num].projection; },
      getMatCam    : function(num){ return this.sensors[num].rotation;   },
      getMask      : function(num){ return this.sensors[num].mask;   }
    };

    return Ori;
  }
  )
