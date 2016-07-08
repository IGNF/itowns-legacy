
/**
* @author AD IGN
* Class where we get the Intrinsic parameters of the system.
*/


define ('Sensor',['three','Utils','url'], function (THREE,Utils,url) { 


    Sensor = function (infos){
        this.infos = infos;
        this.size = new THREE.Vector2().fromArray(infos.size);
        this.mask = infos.mask;

        if(infos.transfo) {
            this.matrix = new THREE.Matrix3();
            this.position = new THREE.Vector3();
            for(i = 0; i < infos.transfo.length; i++)
            { 
                var t = infos.transfo[i];
                //console.log(t);
                switch(t.type)
                {
                    case "affine" : 
                    case "translation" : 
                        if(t.vec3)
                        {
                            var p = new THREE.Vector3().fromArray( t.vec3 );
                            p.applyMatrix3(this.matrix);
                            this.position = this.position.sub(p);
                        } else {
                            console.log("ERROR: this is not a supported ",t.type," transfo : ",t);            
                        }
                        if(t.type=="translation") break; // affine is translation followed by linear

                    case "linear" : 
                        if(t.mat3)
                        {
                            this.matrix = new THREE.Matrix3().multiplyMatrices( this.matrix, new THREE.Matrix3().fromArray( t.mat3 ));
                        } else if(t.orientation)
                        {
                            this.matrix = new THREE.Matrix3().multiplyMatrices( this.matrix, this.getMatOrientationCapteur(t.orientation));
                        } else 
                        {
                            console.log("ERROR: this is not a supported ",t.type," transfo : ",t);            
                        }
                        break;

                    case "distortion" :
                        this.pps = new THREE.Vector2().fromArray(t.pps);
                        var disto = new THREE.Vector3().fromArray(t.poly357);
                        var r2max = this.getDistortion_r2max(disto);
                        this.distortion = new THREE.Vector4(disto.x,disto.y,disto.z,r2max);
                        break;

                    default :
                        console.log("ERROR ", t.type, " is not a supported transfo type in ",t);            
                }
            }

        } else {
            if(infos.distortion) {
                this.pps = new THREE.Vector2().fromArray(infos.distortion.pps);
                var disto = new THREE.Vector3().fromArray(infos.distortion.poly357);
                var r2max = this.getDistortion_r2max(disto);
                this.distortion = new THREE.Vector4(disto.x,disto.y,disto.z,r2max);
            }

            // change conventions
            var itownsWay = new THREE.Matrix3().set(0, 1, 0,
                                                 0, 0,-1,
                                                 1, 0, 0);
                                               
            var Photogram_JMM = new THREE.Matrix3().set(0, 0,-1,
                                                   -1, 0, 0,
                                                    0, 1, 0);
                                                   
            var photgramme_image = new THREE.Matrix3().set(1, 0, 0,
                                                      0,-1, 0,
                                                      0, 0,-1);

            this.matrix = itownsWay;
            this.matrix = new THREE.Matrix3().multiplyMatrices( this.matrix, new THREE.Matrix3().fromArray( infos.rotation ));    
            this.matrix = new THREE.Matrix3().multiplyMatrices( this.matrix, Photogram_JMM );
            this.matrix = new THREE.Matrix3().multiplyMatrices( this.matrix, this.getMatOrientationCapteur(infos.orientation));
            this.matrix = new THREE.Matrix3().multiplyMatrices( this.matrix, photgramme_image);
            this.matrix = new THREE.Matrix3().multiplyMatrices( this.matrix, new THREE.Matrix3().fromArray( infos.projection ));

            this.position = new THREE.Vector3().fromArray( infos.position );
            this.position.applyMatrix3(itownsWay);
        }
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
        



    Sensor.prototype.getMatOrientationCapteur =  function(orientation){
         
            var m = [
                new THREE.Matrix3().set( 0,-1, 0,
										1, 0, 0,
										0, 0, 1),
                new THREE.Matrix3().set( 0, 1, 0,
									   -1, 0, 0,
										0, 0, 1),
                new THREE.Matrix3().set(-1, 0, 0,
										0,-1, 0,
										0, 0, 1),
                new THREE.Matrix3().set( 1, 0, 0,
										0, 1, 0,
										0, 0, 1)
            ];

            return m[orientation];                              
       }

    return Sensor

});
