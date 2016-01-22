<script type="x-shader/x-fragment">

        #ifdef GL_ES 
        precision highp float;
        #endif

        
        uniform sampler2D u_textures[16];
        uniform int textureJPG;
        uniform float alpha;
        uniform vec3 light;

        varying float matindice;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 pos;

        vec4 color = vec4(1.,0.,0.,1.);

        void main(void)
        {	
                vec2 uv = vUv;
        
                if (matindice<0.9)      color = texture2D(u_textures[0],uv);
                else if (matindice<1.9) color = texture2D(u_textures[1],uv);
                else if (matindice<2.9) color = texture2D(u_textures[2],uv);
                else if (matindice<3.9) color = texture2D(u_textures[3],uv);
                else if (matindice<4.9) color = texture2D(u_textures[4],uv);
                else if (matindice<5.9) color = texture2D(u_textures[5],uv);
                else if (matindice<6.9) color = texture2D(u_textures[6],uv);
                else if (matindice<7.9) color = texture2D(u_textures[7],uv);
                else if (matindice<8.9) color = texture2D(u_textures[8],uv);
                else if (matindice<9.9) color = texture2D(u_textures[9],uv);
                else if (matindice<10.9) color = texture2D(u_textures[10],uv);
                else if (matindice<11.9) color = texture2D(u_textures[11],uv);
                else if (matindice<12.9) color = texture2D(u_textures[12],uv);
                else if (matindice<13.9) color = texture2D(u_textures[13],uv);
                else if (matindice<14.9) color = texture2D(u_textures[14],uv);
                else if (matindice<15.9) color = texture2D(u_textures[15],uv);

      
                if(color.r == 0. && color.g ==0.) color =  vec4(vUv.x,vUv.x,vUv.x,0.5);
                                                                                            //color =  vec4(matindice/2.,1.,1.,1.);
               else
                      color.a = alpha;
           gl_FragColor = color; //vec4(1.,1.,0.,1.);//texture2D(u_textures[0],uv);
         //  gl_FragColor = vec4(0.5,pos.y/40.,0.5,1.);
     
    /*
                    // calc the dot product and clamp
                    // 0 -> 1 rather than -1 -> 1
                    

                    // ensure it's normalized
                    //   light = normalize(light);

                    // calculate the dot product of
                    // the light to the vertex normal
                    float dProd = max(0.0,
                                      dot(vNormal, light));

                 // feed into our frag colour
                 //     gl_FragColor = vec4(dProd, // R
                 //                       dProd, // G
                 //                       dProd, // B
                 //                        1.0);  // A
               

           gl_FragColor = color + dProd/5.;
    */

         }
</script>