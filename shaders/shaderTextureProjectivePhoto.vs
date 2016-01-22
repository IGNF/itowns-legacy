<script type="x-shader/x-vertex">

  
    #ifdef GL_ES
    precision  highp float;
    #endif

    // Those uniforms are 
    // ModelView * Projection * rotation of the rigid sys (Stereopolis)
    uniform mat4 mvpp_current_0;
    uniform vec4 factorTranslation0;	
    varying vec4 v_texcoord0;

    vec4 pos;

    void main() {

        pos =  vec4(position,1.);
        v_texcoord0 =  mvpp_current_0 * (pos - factorTranslation0);
        gl_Position  =  projectionMatrix *  modelViewMatrix * pos;

    }
</script>