
/**
* @author AD IGN
* Class where we get the Intrinseque parameters of the system. Camera (laser soon).
* load configuration from DB (t_camera INNER JOIN tl_stereopolis_capteurs )
*/


define ('Sensor',['lib/three','Utils'], function (THREE,Utils) { 

    Sensor = function (infos){
        this.infos = infos;
        this.position = new THREE.Vector3().fromArray( infos.position );
        this.rotation = new THREE.Matrix4().fromArray( infos.rotation ).transpose();
        this.projection = new THREE.Matrix4().fromArray( infos.projection ).transpose();
        this.pps = new THREE.Vector2().fromArray(infos.distortion.pps);
        var disto = new THREE.Vector3().fromArray(infos.distortion.poly357);
        var r2max = this.getDistortion_r2max(disto);
        this.distortion = new THREE.Vector4(disto.x,disto.y,disto.z,r2max);
        this.mask = (infos.mask) ? THREE.ImageUtils.loadTexture(infos.mask) : undefined;

        // change conventions
        this.orientation = infos.orientation;
        this._itownsWay = new THREE.Matrix4( 0, 1, 0, 0,
                                             0, 0,-1, 0,
                                             1, 0, 0, 0,
                                             0, 0, 0, 1 );
                                           
        this.Photogram_JMM = new THREE.Matrix4( 0, 0,-1, 0,
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


     Sensor.prototype.getDistortion_r2max = function(disto){
            // returned the square of the smallest positive root of the derivativeof the distortion polynomial
            // which tells where the distortion might no longer be bijective.
            var roots = Utils.cardan_cubic_roots(7*disto.z,5*disto.y,3*disto.x,1);
            var imax=-1;
                for (var i in roots)
                    if(roots[i]>0 && (imax==-1 || roots[imax]>roots[i])) imax = i;
            if(imax==-1) return Infinity; // no roots : all is valid !
            return roots[imax];
        },
        

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
    return Sensor

});
