<script type="x-shader/x-vertex">

  
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform int textureJPG;
    attribute float materialindice;
    varying float matindice;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 pos;

    void main() {

        vNormal = normal;
        vUv = vec2( uv.x, uv.y );
        if(textureJPG ==1) vUv = vec2(vUv.x, 1.- vUv.y);  
        matindice = materialindice;
            pos = position;
        gl_Position  =  projectionMatrix *  modelViewMatrix * vec4( position, 1.0 );

    }
</script>