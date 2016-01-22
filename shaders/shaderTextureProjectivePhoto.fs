<script type="x-shader/x-fragment">

        #ifdef GL_ES 
        precision highp float;
        #endif

        uniform float alpha;

        uniform mat4 mvpp_current_0;    
        uniform sampler2D   texture0; 
        uniform vec4 factorTranslation;	   
        uniform vec4 intrinsic300;

        uniform int fog;
        varying vec4 v_texcoord0;

        float width = 7216.;
        float height = 5412.;
        float dist;


        // Distortion
        float cpps = 3608.;
        float lpps = 2706.;
        vec2 pps = vec2(cpps,lpps);

        vec4 color = vec4(0.,0.,1.,0.);	
        vec4 colorbis = vec4(0.,0.,0.,0.);
        vec4 saveColor = vec4(0.,0.,0.,0.);

        vec2 corrected0;


                        // Function to correct coordinate using 3rd degree polynome and max
                       vec2 correctDistortionAndCoord(vec4 dist, vec4 v_texcoord){

                            vec2 v = v_texcoord.xy/v_texcoord.w - pps;
                            float v2 = dot(v,v);
                            if(v2>dist.w) return vec2(-2.,-2.); // false;
                            float r = v2*(dist.x+v2*(dist.y+v2*dist.z));
                            vec2 normCoord = v_texcoord.xy/(v_texcoord.w) + r*v;
                                //float r = v2*(dist.x+v2*(dist.y+v2*dist.z));
                                //vec2 normCoord = v_texcoord.xy + r*v*v_texcoord.w;

                            return vec2(normCoord.x/width , 1. - normCoord.y/height); 

                        }


        void main(void)
        {	
            
            //  corrected0bis = correctDistortionAndCoord(intrinsic300, v_texcoord0bis);

            vec2 uvv0 = v_texcoord0.xy/(v_texcoord0.w);
            vec2 corrected0 = vec2( uvv0.x/width, 1. - uvv0.y/height ); 

            if ((corrected0.x>0. && corrected0.x<1. && corrected0.y>0. && corrected0.y<1.) && v_texcoord0.w>0.){

                    color = texture2D(texture0,corrected0);
                    // color = vec4(1.,0.,0.,1.);
             }

             color.a = alpha;
             gl_FragColor = color;

        }
</script>