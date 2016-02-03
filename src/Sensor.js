
/**
* @author AD IGN
* Class where we get the Intrinseque parameters of the system. Camera (laser soon).
* load configuration from DB (t_camera INNER JOIN tl_stereopolis_capteurs )
*/


define ('Sensor',['lib/three'], function (THREE) { 

    Sensor = function (infos){
        //alert(JSON.stringify(infos)); 
        this.infos = infos;
        this.position = new THREE.Vector3().fromArray( infos.position );
        this.rotation = new THREE.Matrix4().fromArray( infos.rotation );
        this.projection = new THREE.Matrix4().fromArray( infos.projection );
        this.pps = new THREE.Vector2().fromArray(infos.distortion.pps);
        this.distortion = new THREE.Vector3().fromArray(infos.distortion.poly357);
        this.orientation = infos.orientation;
     
        //alert(JSON.stringify(this));



        this._itownsWay =    new THREE.Matrix4( 0, 1, 0, 0,
                                               0, 0,-1, 0,
                                               1, 0, 0, 0,
                                               0, 0, 0, 1 );
                                           
        this.Photogram_JMM    = new THREE.Matrix4( 0, 0,-1, 0,
                                                 -1, 0, 0, 0,
                                                  0, 1, 0, 0,
                                                  0, 0, 0, 1);
                                               
        this.photgramme_image = new THREE.Matrix4( 1, 0, 0, 0,
                                                  0,-1, 0, 0,
                                                  0, 0,-1, 0,
                                                  0, 0, 0, 1);

        this.rotation = this.getMatOrientationTotal();
        this.position.applyProjection(this._itownsWay);

     };   

     Sensor.prototype.getMatOrientationTotal =
       function(){
        var out = new THREE.Matrix4();
        out = this.rotation.clone(); 
        out = new THREE.Matrix4().multiplyMatrices( out.clone(), this.Photogram_JMM.clone() );
        
        out = new THREE.Matrix4().multiplyMatrices( out.clone(), this.getMatOrientationCapteur().clone());
        out = new THREE.Matrix4().multiplyMatrices( out.clone(), this.photgramme_image.clone());

        out = new THREE.Matrix4().multiplyMatrices(this._itownsWay, out.clone());    
        return out;
        
      }
      
              // 4 different ori of the capteur
    Sensor.prototype.getMatOrientationCapteur =  function(){
         
            var ori0 = new THREE.Matrix4( 0,-1, 0, 0,
                                          1, 0, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1);


            var ori1 = new THREE.Matrix4( 0, 1, 0, 0,
                                         -1, 0, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1);


            var ori2 = new THREE.Matrix4(-1, 0, 0, 0,
                                          0,-1, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1);


            var ori3 = new THREE.Matrix4( 1, 0, 0, 0,
                                          0, 1, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1);

            switch(this.orientation){

                case 0: return ori0;
                case 1: return ori1;
                case 2: return ori2; 
                case 3: return ori3; 
            }                              

         
       }




/*          computeMatOriFromHeadingPitchRoll: function(heading,pitch,roll){
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
*/

     
    return Sensor


});