<script type="x-shader/x-vertex">

    #ifdef GL_ES 
        precision mediump float;
    #endif

    attribute vec3 displacement;
    attribute float uniqueid;


    varying vec3 colorpoint;
    uniform float point_size;
    uniform float indice_time_laser;
    uniform float currentidwork;
    uniform float indice_time_laser_tab[160];

    uniform int movementLocked;
    
    float getSize(float id){
      return (0.5 -indice_time_laser_tab[int(id)]) * 15.;
    }

    void main()
    {
        
        
        vec3 newPosition = position;
        gl_PointSize = point_size;     //2.* clamp(6. - (position.y + 2.), 0., 6.); //getSize(uniqueid);//point_size;

        if(movementLocked!=1)
            newPosition = vec3(position.x+ displacement.x*indice_time_laser_tab[int(uniqueid)],
                               position.y+ displacement.y*indice_time_laser_tab[int(uniqueid)],
                               position.z+ displacement.z*indice_time_laser_tab[int(uniqueid)]);

        gl_Position  =  projectionMatrix *  modelViewMatrix * vec4(newPosition,1.);
       
        colorpoint = color;

    }

</script>