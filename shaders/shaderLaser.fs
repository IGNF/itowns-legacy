<script type="x-shader/x-fragment" id="fragmentshaderlaser">
    
    #ifdef GL_ES 
        precision mediump float;
    #endif

    varying vec3 colorpoint;
    uniform float alpha;
    uniform sampler2D texturePoint;

    void main() 
    {
        
       /* vec2 coord = gl_PointCoord - vec2(0.5);  //from [0,1] to [-0.5,0.5]
        if(length(coord) > 0.5)                  //outside of circle radius?
            discard;
        */
       gl_FragColor = vec4(colorpoint,alpha);
 
    }	

</script>