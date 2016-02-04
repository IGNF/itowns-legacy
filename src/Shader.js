define ( ['jquery', 'Utils'],function ( $, Utils) {
		
	var Shader ={
            
            shadersURL : null,//shadersURL;
            shaderNum : null,//shadersURL.length;
            shaders : {},
            loaded: false,
            attributes : {
                    displacementx: {
                          type: 'f', // a float
                          value: [] // an empty array
                    },
                    displacementy: {
                          type: 'f', // a float	
                          value: [] // an empty array
                    },
                    displacementz: {
                          type: 'f', // a float
                          value: [] // an empty array
                    },
                    colorattribute : {
                           type: 'v3',
                           value:[]
                    },
                    uniqueid: {
                          type: 'i',
                          value:[]
                   }
               },


             uniformslaser : {
                        indice_time_laser:{type: 'f',value: 1},
                        currentidwork:{type:'f',value:100.},
                        point_size:{type:'f',value:1.},
                        alpha:{type:'f',value:0.5},
                        colortest:{type:'v3', value: {}},
                        nb_time:{type: 'i',value: 0}
             },         

             init: function(shadersURL){
                 this.shadersURL = shadersURL;
                 this.shaderNum =  shadersURL.length;
             },

             loadShaders : function() {              
                 var loadedShaders = 0;
                 var that = this;

                 function partialLoading(shaderContent, shaderName) {
                     loadedShaders++;
                     that.shaders[shaderName] = shaderContent;

                     //all shader files have been loaded
                     if (loadedShaders === that.shaderNum) {
                         that.loaded = true;
                         console.log("Shaders are loaded");
                     }
                 }

                 for (var i=0; i < that.shaderNum; i++) {
                     var currentShaderURL = that.shadersURL[i];

                     (function(currentShaderURL) {
                         $.ajax({
                             url: currentShaderURL,
                             success: function (data) {
                                 partialLoading($(data).html(),currentShaderURL.substr(currentShaderURL.lastIndexOf('/')+1));
                             },
                             dataType: 'html',
                             error: function () {
                                 console.error("Unable to load shader from file" + currentShaderURL);
                             }
                         });
                     })(currentShaderURL);
                 }
             },
             
             

    shaderTextureProjective5VS : [
        
        "#ifdef GL_ES",
        "precision  highp float;",
        "#endif",

        // Those uniforms are 
        // ModelView * Projection * rotation of the rigid sys (Stereopolis)

        "uniform mat4 mvpp0;",
        "uniform mat4 mvpp1;",
        "uniform mat4 mvpp2;",
        "uniform mat4 mvpp3;",
        "uniform mat4 mvpp4;",

        "uniform vec4 translation0;",
        "uniform vec4 translation1;",
        "uniform vec4 translation2;",
        "uniform vec4 translation3;",
        "uniform vec4 translation4;",

        "varying vec4 v_texcoord0;",
        "varying vec4 v_texcoord1;",
        "varying vec4 v_texcoord2;",
        "varying vec4 v_texcoord3;",
        "varying vec4 v_texcoord4;",

        "vec4 pos;",

        "void main() {",
        "    pos =  vec4(position,1.);",
        "        v_texcoord0 =  mvpp0 * (pos- translation0);",
        "        v_texcoord1 =  mvpp1 * (pos- translation1);",
        "        v_texcoord2 =  mvpp2 * (pos- translation2);",
        "        v_texcoord3 =  mvpp3 * (pos- translation3);",
        "        v_texcoord4 =  mvpp4 * (pos- translation4);",
        "    gl_Position  =  projectionMatrix *  modelViewMatrix * pos;",
        "}"
    ],
    
     shaderTextureProjective5FS : [
         
      
        "#ifdef GL_ES",
        "precision  highp float;",
        "#endif",

        "uniform sampler2D   texture0;",
        "uniform sampler2D   texture1;",
        "uniform sampler2D   texture2;",
        "uniform sampler2D   texture3;",
        "uniform sampler2D   texture4;",
      
        "varying vec4 v_texcoord0;",
        "varying vec4 v_texcoord1;",
        "varying vec4 v_texcoord2;",
        "varying vec4 v_texcoord3;",
        "varying vec4 v_texcoord4;",
  
        "vec4 color = vec4(0.,0.,0.,0.);",
        "vec2 corrected0,corrected1,corrected2,corrected3,corrected4;",
        "float width = 2048.0;",
        "float height = 2048.0;",
        //"float cpps = 1042.178;",
        //"float lpps = 1020.435;",
        //"vec2 pps = vec2(cpps,lpps);",

      // Function to correct coordinate using 3rd degree polynome and max
      " vec2 correctDistortionAndCoord(vec4 v_texcoord){",     
      "      vec2 normCoord = v_texcoord.xy/(v_texcoord.w);",
      "      return vec2(normCoord.x/width , 1. - normCoord.y/height); ",
      "  }",
       " void main(void)",
       " {  ",
           " corrected0 = correctDistortionAndCoord(v_texcoord0);",
           " corrected1 = correctDistortionAndCoord(v_texcoord1);",
           " corrected2 = correctDistortionAndCoord(v_texcoord2);",
           " corrected3 = correctDistortionAndCoord(v_texcoord3);",
           " corrected4 = correctDistortionAndCoord(v_texcoord4);",

          "  if ((corrected0.x>0. && corrected0.x<1. && corrected0.y>0. && corrected0.y<1.) && v_texcoord0.w>0.){",
          "      color = texture2D(texture0,corrected0);",
          "  }else",
          "  if ((corrected1.x>0. && corrected1.x<1. && corrected1.y>0. && corrected1.y<1.) && v_texcoord1.w>0.){",
          "      color = texture2D(texture1,corrected1);",
          "  }else",
          "  if ((corrected2.x>0. && corrected2.x<1. && corrected2.y>0. && corrected2.y<1.) && v_texcoord2.w>0.){",
          "      color = texture2D(texture2,corrected2);",
          "  }else",
          "  if ((corrected3.x>0. && corrected3.x<1. && corrected3.y>0. && corrected3.y<1.) && v_texcoord3.w>0.){",
          "      color = texture2D(texture3,corrected3);",
          "  }else",
          "  if ((corrected4.x>0. && corrected4.x<1. && corrected4.y>0. && corrected4.y<1.) && v_texcoord4.w>0.){",
          "      color = texture2D(texture4,corrected4);",
          "  }",
          "  color.a = 1.0; ",
          "  gl_FragColor = color; ",
    "} "         
        ],
    
             
    shaderTextureProjective2VS : [
        
        "#ifdef GL_ES",
        "precision  highp float;",
        "#endif",

        // Those uniforms are 
        // ModelView * Projection * rotation of the rigid sys (Stereopolis)

        "uniform mat4 mvpp_current_0;",
        "uniform mat4 mvpp_current_1;",
        "uniform mat4 mvpp_current_2;",
        "uniform mat4 mvpp_current_3;",
        "uniform mat4 mvpp_current_4;",
        "uniform mat4 mvpp_current_0bis;",
        "uniform mat4 mvpp_current_1bis;",
        "uniform mat4 mvpp_current_2bis;",
        "uniform mat4 mvpp_current_3bis;",
        "uniform mat4 mvpp_current_4bis;",

        "uniform vec4 factorTranslation0;",
        "uniform vec4 factorTranslation1;",
        "uniform vec4 factorTranslation2;",
        "uniform vec4 factorTranslation3;",
        "uniform vec4 factorTranslation4;",
        "uniform vec4 factorTranslation0bis;",
        "uniform vec4 factorTranslation1bis;",
        "uniform vec4 factorTranslation2bis;",
        "uniform vec4 factorTranslation3bis;",
        "uniform vec4 factorTranslation4bis;",

        "uniform int mobileOn;",

        "varying vec4 v_texcoord0;",
        "varying vec4 v_texcoord1;",
        "varying vec4 v_texcoord2;",
        "varying vec4 v_texcoord3;",
        "varying vec4 v_texcoord4;",
        "varying vec4 v_texcoord0bis;",
        "varying vec4 v_texcoord1bis;",
        "varying vec4 v_texcoord2bis;",
        "varying vec4 v_texcoord3bis;",
        "varying vec4 v_texcoord4bis;",

        "vec4 pos;",



        "void main() {",

        "    pos =  vec4(position,1.);",

        "    if(mobileOn==0){",
        "        v_texcoord0 =  mvpp_current_0 * (pos- factorTranslation0);",
        "        v_texcoord1 =  mvpp_current_1 * (pos- factorTranslation1);",
        "        v_texcoord2 =  mvpp_current_2 * (pos- factorTranslation2);",
        "        v_texcoord3 =  mvpp_current_3 * (pos- factorTranslation3);",
        "        v_texcoord4 =  mvpp_current_4 * (pos- factorTranslation4);",
        "    }",

        "    v_texcoord0bis =  mvpp_current_0bis * (pos- factorTranslation0bis);",
        "    v_texcoord1bis =  mvpp_current_1bis * (pos- factorTranslation1bis);",
        "    v_texcoord2bis =  mvpp_current_2bis * (pos- factorTranslation2bis);",
        "    v_texcoord3bis =  mvpp_current_3bis * (pos- factorTranslation3bis);",
        "    v_texcoord4bis =  mvpp_current_4bis * (pos- factorTranslation4bis);",

        "    gl_Position  =  projectionMatrix *  modelViewMatrix * pos;",

        "}"
    ],
    
     shaderTextureProjective2FS : [
         
      
        "#ifdef GL_ES",
        "precision  highp float;",
        "#endif",

        "uniform float alpha;",

        "uniform mat4 mvpp_current_0;",
        "uniform mat4 mvpp_current_1;",
        "uniform mat4 mvpp_current_2;",
        "uniform mat4 mvpp_current_3;",
        "uniform mat4 mvpp_current_4;",
        "uniform mat4 mvpp_current_0bis;",
        "uniform mat4 mvpp_current_1bis;",
        "uniform mat4 mvpp_current_2bis;",
        "uniform mat4 mvpp_current_3bis;",
        "uniform mat4 mvpp_current_4bis;",

        "uniform sampler2D   texture0;",
        "uniform sampler2D   texture1;",
        "uniform sampler2D   texture2;",
        "uniform sampler2D   texture3;",
        "uniform sampler2D   texture4;",
        "uniform sampler2D   texture0bis;",
        "uniform sampler2D   texture1bis;",
        "uniform sampler2D   texture2bis;",
        "uniform sampler2D   texture3bis;",
        "uniform sampler2D   texture4bis;",
        "uniform sampler2D   textureFrontMask;",
        "uniform sampler2D   textureBackMask;",

        "uniform vec4 factorTranslation;",	
        "uniform vec4 factorTranslationbis;",

        "varying vec4 v_texcoord0;",
        "varying vec4 v_texcoord1;",
        "varying vec4 v_texcoord2;",
        "varying vec4 v_texcoord3;",
        "varying vec4 v_texcoord4;",
        "varying vec4 v_texcoord0bis;",
        "varying vec4 v_texcoord1bis;",
        "varying vec4 v_texcoord2bis;",
        "varying vec4 v_texcoord3bis;",
        "varying vec4 v_texcoord4bis;",


        "uniform float indice_time0;",
        "uniform float indice_time1;",
        "uniform float indice_time2;",
        "uniform float indice_time3;",
        "uniform float indice_time4;",

        "uniform vec4 intrinsic300;",
        "uniform vec4 intrinsic301;",
        "uniform vec4 intrinsic302;",
        "uniform vec4 intrinsic303;",
        "uniform vec4 intrinsic304;",
        

        "uniform int blendingOn;",
        "uniform int mobileOn;",
        "uniform int fog;",

        "float width = 2048.0;",
        "float height = 2048.0;",
        "float dist;",


        // Distortion
        "float cpps = 1042.178;",
        "float lpps = 1020.435;",
        "vec2 pps = vec2(cpps,lpps);",

        "vec4 color = vec4(0.,0.,0.,0.);",
        "vec4 colorbis = vec4(0.,0.,0.,0.);",
        "vec4 saveColor = vec4(0.,0.,0.,0.);",

        "vec2 corrected0, corrected1,corrected2,corrected3,corrected4;",
        "vec2 corrected0bis, corrected1bis,corrected2bis,corrected3bis,corrected4bis;",



        // Function to correct coordinate using 3rd degree polynome and max
      " vec2 correctDistortionAndCoord(vec4 dist, vec4 v_texcoord){",
            
      "      vec2 v = v_texcoord.xy/v_texcoord.w - pps;",
      "      float v2 = dot(v,v);",
      "      if(v2>dist.w) return vec2(-2.,-2.); // false;",
      "      float r = v2*(dist.x+v2*(dist.y+v2*dist.z));",
      "      vec2 normCoord = v_texcoord.xy/(v_texcoord.w) + r*v;",
                //float r = v2*(dist.x+v2*(dist.y+v2*dist.z));
                //vec2 normCoord = v_texcoord.xy + r*v*v_texcoord.w;

      "      return vec2(normCoord.x/width , 1. - normCoord.y/height); ",

      "  }",



       " void main(void)",
       " {	",
       "     bool blending = (blendingOn == 1) && (mobileOn==0);",

            // FIRSTLY the previous position for nice transition

        "    if(mobileOn==0){    // If not on light config we compute the rendering for previous pano ",

          "          corrected0 = correctDistortionAndCoord(intrinsic300, v_texcoord0);",

   "                 if ((corrected0.x>=0. && corrected0.x<=1. && corrected0.y>=0. && corrected0.y<=1.) && v_texcoord0.w>0.)",
        "                 color = texture2D(texture0,corrected0); ",
        "            else{",

                       " corrected1 = correctDistortionAndCoord(intrinsic301, v_texcoord1);",

                      "  if ((corrected1.x>=0. && corrected1.x<=1. && corrected1.y>=0. && corrected1.y<=1.) && v_texcoord1.w>0.){",
                      "   color = texture2D(texture1,corrected1); ",
                      "   color.a = 1. - texture2D(textureFrontMask,corrected1).a;",
                      "  }",
                     "   else{",

                       "     corrected2 = correctDistortionAndCoord(intrinsic302, v_texcoord2);",

                        "    if ((corrected2.x>=0. && corrected2.x<=1. && corrected2.y>=0. && corrected2.y<=1.) && v_texcoord2.w>0.)",
                       "        color = texture2D(texture2,corrected2); ",
                      "       else{",



                              "  corrected3 = correctDistortionAndCoord(intrinsic303, v_texcoord3);",


                            "    if ((corrected3.x>=0. && corrected3.x<=1. && corrected3.y>=0. && corrected3.y<=1.) && v_texcoord3.w>0.){",
                           "             color = texture2D(texture3,corrected3); ",
                           "             color.a = 1. - texture2D(textureBackMask,corrected3).a;",
                           "     }",
                          "      else{",

                             "       corrected4 = correctDistortionAndCoord(intrinsic304, v_texcoord4);",

                             "       if ((corrected4.x>=0. && corrected4.x<=1. && corrected4.y>=0. && corrected4.y<=1.) && v_texcoord4.w>0.)",
                            "                        color = texture2D(texture4,corrected4); ",
                             "   }",
                        "    }",
                       " }",
                  "  }",
           " }",
           " saveColor = color;",


// SECONDLY 
        
   
           " corrected0bis = correctDistortionAndCoord(intrinsic300, v_texcoord0bis);",
           " corrected1bis = correctDistortionAndCoord(intrinsic301, v_texcoord1bis);",
           " corrected2bis = correctDistortionAndCoord(intrinsic302, v_texcoord2bis);",
          "  corrected3bis = correctDistortionAndCoord(intrinsic303, v_texcoord3bis);",
          "  corrected4bis = correctDistortionAndCoord(intrinsic304, v_texcoord4bis);",


// CAM 0,300

          "  if ((corrected0bis.x>0. && corrected0bis.x<1. && corrected0bis.y>0. && corrected0bis.y<1.) && v_texcoord0bis.w>0.){",

          "      colorbis = texture2D(texture0bis,corrected0bis);",
                
         "       if(blending){   ",
                    // Blending cam0/cam1
            "        if (((corrected1bis.x>=0. && corrected1bis.x<=1. && corrected1bis.y>=0. && corrected1bis.y<=1.) && v_texcoord1bis.w>0.)&& corrected0bis.x < 0.03){ ",
           "             colorbis = colorbis * (corrected0bis.x/ 0.03) +   texture2D(texture1bis,corrected1bis) * (1.- (corrected0bis.x)/ 0.03);",
                    "}",
                    // Blending cam0/cam2
               "     if (((corrected2bis.x>=0. && corrected2bis.x<=1. && corrected2bis.y>=0. && corrected2bis.y<=1.) && v_texcoord2bis.w>0.)&& corrected0bis.y >0.97){ ",
                "        colorbis = colorbis *  (1. - (corrected0bis.y-0.97)/0.03)  +   texture2D(texture2bis,corrected2bis) * ((corrected0bis.y-0.97)/0.03);",
                "    }",
                    // Blending cam0/cam3",
                "     if (((corrected3bis.x>0. && corrected3bis.x<1. && corrected3bis.y>0. && corrected3bis.y<1.) && v_texcoord3bis.w>0.)&& corrected0bis.x > 0.97){ ",
                 "       colorbis = colorbis *  (1. - (corrected0bis.x-0.97)/0.03)   +   texture2D(texture3bis,corrected3bis) * ((corrected0bis.x-0.97)/0.03);",
                    "}",
                    // Blending cam0/cam4
                 "    if (((corrected4bis.x>=0. && corrected4bis.x<=1. && corrected4bis.y>=0. && corrected4bis.y<=1.) && v_texcoord4bis.w>0.)&& corrected0bis.y < 0.03){ ",
                   "     colorbis = colorbis *  (corrected0bis.y/0.03)  +   texture2D(texture4bis,corrected4bis) * ( 1. - corrected0bis.y/0.03);",
                  "  }",
                  "    if (((corrected1bis.x>=0. && corrected1bis.x<=1. && corrected1bis.y>=0. && corrected1bis.y<=1.) && v_texcoord1bis.w>0.)&& corrected0bis.x < 0.03){ ",
                   "     colorbis = colorbis * (corrected0bis.x/ 0.03) +   texture2D(texture1bis,corrected1bis) * (1.- (corrected0bis.x)/ 0.03);         ",
                   " }",
                "}",
                                 
                //color = indice_time0 * saveColor + (1. - indice_time0) * colorbis; //indice_time21
                "color = indice_time0 * (saveColor - colorbis) + colorbis;",
           " }else",


// CAM 1,301

           "  if ((corrected1bis.x>0. && corrected1bis.x<1. && corrected1bis.y>0. && corrected1bis.y<1.) && v_texcoord1bis.w>0.){ ",

           "            colorbis =  texture2D(texture1bis,corrected1bis); ",
          "             colorbis.a = 1.- texture2D(textureFrontMask,corrected1bis).a; ",

             "          if(blending){ ",
                           // Blending cam1/cam2
             "              if (((corrected2bis.x>=0. && corrected2bis.x<=1. && corrected2bis.y>=0. && corrected2bis.y<=1.) && v_texcoord2bis.w>0.)&& corrected1bis.x> .97){  ",
              "                 colorbis = colorbis * (1. - (corrected1bis.x-0.97)/0.03)  +   texture2D(texture2bis,corrected2bis) * ((corrected1bis.x-0.97)/0.03); ",
               "            } ",
                           // Blending cam1/cam4
              "             if (((corrected4bis.x>=0. && corrected4bis.x<=1. && corrected4bis.y>=0. && corrected4bis.y<=1.) && v_texcoord4bis.w>0.)&& corrected1bis.x< 0.03){  ",
               "                colorbis = colorbis * (corrected1bis.x/0.03)  +   texture2D(texture4bis,corrected4bis) * (1.- (corrected1bis.x)/0.03); ",
              "             } ",
              "         } ",

              "         color = (1. - colorbis.a) * saveColor + colorbis.a * colorbis; ",
               "        color.a = colorbis.a + saveColor.a; ",
                       //color = indice_time1 * saveColor + (1. - indice_time1) * color;
              "         color = indice_time1 * (saveColor - color) + color; ",

         "   }else ",



// CAM 2,302

        "    if ((corrected2bis.x>0. && corrected2bis.x<1. && corrected2bis.y>0. && corrected2bis.y<1.) && v_texcoord2bis.w>0.){ ",
               
          "         colorbis = texture2D(texture2bis,corrected2bis); ",
          "      if(blending){ ",
                     // Blending cam2/cam3
            "         if (((corrected3bis.x>=0. && corrected3bis.x<=1. && corrected3bis.y>=0. && corrected3bis.y<=1.) && v_texcoord3bis.w>0.)&& corrected2bis.x>0.97){  ",
           "              colorbis = colorbis * (1. - (corrected2bis.x-0.97)/0.03)  +   texture2D(texture3bis,corrected3bis) * ((corrected2bis.x-0.97)/0.03); ",
            "         } ",
           "     } ",

                //  BLEND with ground
         "       if(corrected2bis.y>0.97) colorbis = colorbis * (1. - (corrected2bis.y-0.97)/0.03) + saveColor * ((corrected2bis.y-0.97)/0.03); ",

                //color = indice_time2 * saveColor + (1. - indice_time2) * colorbis; 	
         "         color = indice_time2 * (saveColor - colorbis) + colorbis; ",
                    
         "   }else ",

// CAM 3,303

       "     if ((corrected3bis.x>0.01 && corrected3bis.x<0.99 && corrected3bis.y>0. && corrected3bis.y<1.) && v_texcoord3bis.w>0.){ ",
             
        "           colorbis = texture2D(texture3bis,corrected3bis); ",
        "           colorbis.a = 1.- texture2D(textureBackMask,corrected3bis).a; ",

                    // Blending cam3/cam4
         "           if(blending){ ",
         "               if (((corrected4bis.x>=0. && corrected4bis.x<=1. && corrected4bis.y>=0. && corrected4bis.y<=1.) && v_texcoord4bis.w>0.)&& corrected3bis.x>0.97){  ",
          "                  colorbis = colorbis * (1. - (corrected3bis.x-0.97)/0.03)   +   texture2D(texture4bis,corrected4bis) * ((corrected3bis.x-0.97)/0.03); ",
          "              } ",
          "          } ",
                    
         "           color = (1. - colorbis.a) * saveColor + colorbis.a * colorbis; ",
         "           color.a = colorbis.a + saveColor.a; ",
                    //color = indice_time3 * saveColor + (1. - indice_time3) * color;
         "           color = indice_time3 * (saveColor - color) + color; ",

         "       }else ",

// CAM 4,304

        "    if ((corrected4bis.x>0. && corrected4bis.x<1. && corrected4bis.y>0. && corrected4bis.y<1.) && v_texcoord4bis.w>0.){ ",

         "       colorbis = texture2D(texture4bis,corrected4bis);	 ",

                //  BLEND with ground
        "        if(corrected4bis.y>0.97) colorbis = colorbis * (1. - (corrected4bis.y-0.97)/0.03) + saveColor * ((corrected4bis.y-0.97)/0.03); ",

                //color = indice_time4 * saveColor + (1. - indice_time4) * colorbis; 
          "        color = indice_time4 * (saveColor - colorbis) + colorbis; ",
          "  } ",

         "   color.a = alpha; ",
        "    gl_FragColor = color; ",

    "} "         
     
        ],
        
         shaderTextureProjective2LightFS : [
        
      

        "#ifdef GL_ES",
        "precision highp float;",
        "#endif",

        "uniform float alpha;",

        "uniform mat4 mvpp_current_0;",
        "uniform mat4 mvpp_current_1;",
        "uniform mat4 mvpp_current_2;",
        "uniform mat4 mvpp_current_3;",
        "uniform mat4 mvpp_current_4;",
        "uniform mat4 mvpp_current_0bis;",
        "uniform mat4 mvpp_current_1bis;",
        "uniform mat4 mvpp_current_2bis;",
        "uniform mat4 mvpp_current_3bis;",
        "uniform mat4 mvpp_current_4bis;",

        "uniform sampler2D   texture0;",
        "uniform sampler2D   texture1;",
        "uniform sampler2D   texture2;",
        "uniform sampler2D   texture3;",
        "uniform sampler2D   texture4;",
        "uniform sampler2D   texture0bis;",
        "uniform sampler2D   texture1bis;",
        "uniform sampler2D   texture2bis;",
        "uniform sampler2D   texture3bis;",
        "uniform sampler2D   texture4bis;",
        "uniform sampler2D   textureFrontMask;",
        "uniform sampler2D   textureBackMask;",

        "uniform vec4 factorTranslation;	",
        "uniform vec4 factorTranslationbis;",

        "varying vec4 v_texcoord0;",
        "varying vec4 v_texcoord1;",
        "varying vec4 v_texcoord2;",
        "varying vec4 v_texcoord3;",
        "varying vec4 v_texcoord4;",
        "varying vec4 v_texcoord0bis;",
        "varying vec4 v_texcoord1bis;",
        "varying vec4 v_texcoord2bis;",
        "varying vec4 v_texcoord3bis;",
        "varying vec4 v_texcoord4bis;",

        "uniform float indice_time0;",
        "uniform float indice_time1;",
        "uniform float indice_time2;",
        "uniform float indice_time3;",
        "uniform float indice_time4;",

        "uniform vec4 intrinsic300;",
        "uniform vec4 intrinsic301;",
        "uniform vec4 intrinsic302;",
        "uniform vec4 intrinsic303;",
        "uniform vec4 intrinsic304;",
        

        "uniform int blendingOn;",
        "uniform int mobileOn;",
        "uniform int fog;",

        "float width = 2048.0;",
        "float height = 2048.0;",
        "float dist;",


        // Distortion
        "float cpps = 1042.178;",
        "float lpps = 1020.435;",
        "vec2 pps = vec2(cpps,lpps);",

        "vec4 color = vec4(0.38,0.34,0.34,0.5);	",
        "vec4 colorbis = vec4(0.,0.,0.,0.);",
        "vec4 saveColor = vec4(0.,0.,0.,0.);",

        "vec2 corrected0, corrected1, corrected2, corrected3, corrected4;",
        "vec2 corrected0bis, corrected1bis, corrected2bis, corrected3bis, corrected4bis;",



        // Function to correct coordinate using 3rd degree polynome and max
      " vec2 correctDistortionAndCoord(vec4 dist, vec4 v_texcoord){",
            
          "  vec2 v = v_texcoord.xy/v_texcoord.w - pps;",
         "   float v2 = dot(v,v);",
         "   if(v2>dist.w) return vec2(-2.,-2.); // false;",
         "   float r = v2*(dist.x+v2*(dist.y+v2*dist.z));",
         "   vec2 normCoord = v_texcoord.xy/(v_texcoord.w) + r*v;",
                //float r = v2*(dist.x+v2*(dist.y+v2*dist.z));
                //vec2 normCoord = v_texcoord.xy + r*v*v_texcoord.w;

          "  return vec2(normCoord.x/width , 1. - normCoord.y/height); ",

     "   }",



      "  void main(void)",
   "     {	",
    "        bool blending = (blendingOn == 1) && (mobileOn == 0);",


          "   saveColor = color;",


// SECONDLY 
        
   
       "     corrected0bis = correctDistortionAndCoord(intrinsic300, v_texcoord0bis);",
        "    corrected1bis = correctDistortionAndCoord(intrinsic301, v_texcoord1bis);",
        "    corrected2bis = correctDistortionAndCoord(intrinsic302, v_texcoord2bis);",
        "    corrected3bis = correctDistortionAndCoord(intrinsic303, v_texcoord3bis);",
        "    corrected4bis = correctDistortionAndCoord(intrinsic304, v_texcoord4bis);",


// CAM 0,300

  "          if ((corrected0bis.x>0. && corrected0bis.x<1. && corrected0bis.y>0. && corrected0bis.y<1.) && v_texcoord0bis.w>0.){",

         "       colorbis = texture2D(texture0bis,corrected0bis);",
                
     "           if(blending){   ",
                    // Blending cam0/cam1
           "         if (((corrected1bis.x>=0. && corrected1bis.x<=1. && corrected1bis.y>=0. && corrected1bis.y<=1.) && v_texcoord1bis.w>0.)&& corrected0bis.x < 0.03){ ",
            "            colorbis = colorbis * (corrected0bis.x/ 0.03) +   texture2D(texture1bis,corrected1bis) * (1.- (corrected0bis.x)/ 0.03);",
            "        }",
                    // Blending cam0/cam2
              "      if (((corrected2bis.x>=0. && corrected2bis.x<=1. && corrected2bis.y>=0. && corrected2bis.y<=1.) && v_texcoord2bis.w>0.)&& corrected0bis.y >0.97){ ",
              "          colorbis = colorbis *  (1. - (corrected0bis.y-0.97)/0.03)  +   texture2D(texture2bis,corrected2bis) * ((corrected0bis.y-0.97)/0.03);",
             "       }",
                    // Blending cam0/cam3
           "          if (((corrected3bis.x>0. && corrected3bis.x<1. && corrected3bis.y>0. && corrected3bis.y<1.) && v_texcoord3bis.w>0.)&& corrected0bis.x > 0.97){ ",
           "             colorbis = colorbis *  (1. - (corrected0bis.x-0.97)/0.03)   +   texture2D(texture3bis,corrected3bis) * ((corrected0bis.x-0.97)/0.03);",
           "         }",
                    // Blending cam0/cam4
       "              if (((corrected4bis.x>=0. && corrected4bis.x<=1. && corrected4bis.y>=0. && corrected4bis.y<=1.) && v_texcoord4bis.w>0.)&& corrected0bis.y < 0.03){ ",
        "                colorbis = colorbis *  (corrected0bis.y/0.03)  +   texture2D(texture4bis,corrected4bis) * ( 1. - corrected0bis.y/0.03);",
       "             }",
        "              if (((corrected1bis.x>=0. && corrected1bis.x<=1. && corrected1bis.y>=0. && corrected1bis.y<=1.) && v_texcoord1bis.w>0.)&& corrected0bis.x < 0.03){ ",
        "                colorbis = colorbis * (corrected0bis.x/ 0.03) +   texture2D(texture1bis,corrected1bis) * (1.- (corrected0bis.x)/ 0.03);         ",
         "           }",
        "        }",
                                 
                //color = indice_time0 * saveColor + (1. - indice_time0) * colorbis; //indice_time21
         "       color = indice_time0 * (saveColor - colorbis) + colorbis;",
         "  }else",


// CAM 1,301

        "     if ((corrected1bis.x>0. && corrected1bis.x<1. && corrected1bis.y>0. && corrected1bis.y<1.) && v_texcoord1bis.w>0.){",

        "               colorbis =  texture2D(texture1bis,corrected1bis);",
         "              colorbis.a = 1.- texture2D(textureFrontMask,corrected1bis).a;",

          "             if(blending){",
                           // Blending cam1/cam2
             "              if (((corrected2bis.x>=0. && corrected2bis.x<=1. && corrected2bis.y>=0. && corrected2bis.y<=1.) && v_texcoord2bis.w>0.)&& corrected1bis.x> .97){ ",
             "                  colorbis = colorbis * (1. - (corrected1bis.x-0.97)/0.03)  +   texture2D(texture2bis,corrected2bis) * ((corrected1bis.x-0.97)/0.03);",
             "              }",
                           // Blending cam1/cam4
               "            if (((corrected4bis.x>=0. && corrected4bis.x<=1. && corrected4bis.y>=0. && corrected4bis.y<=1.) && v_texcoord4bis.w>0.)&& corrected1bis.x< 0.03){ ",
               "                colorbis = colorbis * (corrected1bis.x/0.03)  +   texture2D(texture4bis,corrected4bis) * (1.- (corrected1bis.x)/0.03);",
               "            }",
               "        }",

               "        color = (1. - colorbis.a) * saveColor + colorbis.a * colorbis;",
               "        color.a = colorbis.a + saveColor.a;",
                       //color = indice_time1 * saveColor + (1. - indice_time1) * color;
               "        color = indice_time1 * (saveColor - color) + color;",

         "   }else",



// CAM 2,302

       "     if ((corrected2bis.x>0. && corrected2bis.x<1. && corrected2bis.y>0. && corrected2bis.y<1.) && v_texcoord2bis.w>0.){",
               
          "         colorbis = texture2D(texture2bis,corrected2bis);",
          "      if(blending){",
                     // Blending cam2/cam3
          "           if (((corrected3bis.x>=0. && corrected3bis.x<=1. && corrected3bis.y>=0. && corrected3bis.y<=1.) && v_texcoord3bis.w>0.)&& corrected2bis.x>0.97){ ",
           "              colorbis = colorbis * (1. - (corrected2bis.x-0.97)/0.03)  +   texture2D(texture3bis,corrected3bis) * ((corrected2bis.x-0.97)/0.03);",
          "           }",
          "      }",

                //  BLEND with ground
           "     if(corrected2bis.y>0.97) colorbis = colorbis * (1. - (corrected2bis.y-0.97)/0.03) + saveColor * ((corrected2bis.y-0.97)/0.03);",

                //color = indice_time2 * saveColor + (1. - indice_time2) * colorbis; 	
          "        color = indice_time2 * (saveColor - colorbis) + colorbis;",
                    
         "   }else",

// CAM 3,303

        "    if ((corrected3bis.x>0.01 && corrected3bis.x<0.99 && corrected3bis.y>0. && corrected3bis.y<1.) && v_texcoord3bis.w>0.){",
             
        "           colorbis = texture2D(texture3bis,corrected3bis);",
        "           colorbis.a = 1.- texture2D(textureBackMask,corrected3bis).a;",

                    // Blending cam3/cam4
         "           if(blending){",
            "            if (((corrected4bis.x>=0. && corrected4bis.x<=1. && corrected4bis.y>=0. && corrected4bis.y<=1.) && v_texcoord4bis.w>0.)&& corrected3bis.x>0.97){ ",
          "                  colorbis = colorbis * (1. - (corrected3bis.x-0.97)/0.03)   +   texture2D(texture4bis,corrected4bis) * ((corrected3bis.x-0.97)/0.03);",
         "               }",
          "          }",
                    
        "            color = (1. - colorbis.a) * saveColor + colorbis.a * colorbis;",
        "            color.a = colorbis.a + saveColor.a;",
                    //color = indice_time3 * saveColor + (1. - indice_time3) * color;
        "            color = indice_time3 * (saveColor - color) + color;",

        "        }else",

// CAM 4,304

       "     if ((corrected4bis.x>0. && corrected4bis.x<1. && corrected4bis.y>0. && corrected4bis.y<1.) && v_texcoord4bis.w>0.){",

       "         colorbis = texture2D(texture4bis,corrected4bis);	",

                //  BLEND with ground
       "         if(corrected4bis.y>0.97) colorbis = colorbis * (1. - (corrected4bis.y-0.97)/0.03) + saveColor * ((corrected4bis.y-0.97)/0.03);",

                //color = indice_time4 * saveColor + (1. - indice_time4) * colorbis; 
       "           color = indice_time4 * (saveColor - colorbis) + colorbis;",
       "     }",

       "     color.a = alpha;",
       "     gl_FragColor = color;",

   " }"
   
     ],
         
       shaderLaserVS :   [
          
      "    #ifdef GL_ES ",
      "    precision mediump float;",
      "    #endif ",

      "    attribute vec3 displacement; ",
      "    attribute float uniqueid; ",


      "    varying vec3 colorpoint;",
      "    uniform float point_size;",
      "    uniform float indice_time_laser;",
      "    uniform float currentidwork;",
      "    uniform float indice_time_laser_tab[160];",

      "    uniform int movementLocked;",

      "    float getSize(float id){",
      "      return (0.5 -indice_time_laser_tab[int(id)]) * 15.;",
      "    }",

      "    void main()",
      "    {",


      "    vec3 newPosition = position;",
      "    gl_PointSize = point_size;     //2.* clamp(6. - (position.y + 2.), 0., 6.); //getSize(uniqueid);//point_size;",

      "    if(movementLocked!=1)",
      "           newPosition = vec3(position.x+ displacement.x*indice_time_laser_tab[int(uniqueid)],",
      "                              position.y+ displacement.y*indice_time_laser_tab[int(uniqueid)],",
      "                              position.z+ displacement.z*indice_time_laser_tab[int(uniqueid)]);",

      "           gl_Position  =  projectionMatrix *  modelViewMatrix * vec4(newPosition,1.);",

      "          colorpoint = color;",

      "      }"
        
       ],
       

       
        shaderLaserFS :   [
        
    "      #ifdef GL_ES ",
    "        precision mediump float;",
    "      #endif",

     "       varying vec3 colorpoint;",
     "       uniform float alpha;",
     "       uniform sampler2D texturePoint;",

      "      void main() ",
     "       {",

       "         gl_FragColor = vec4(colorpoint,alpha);",
 
      "      }	"

        
       ],
       
         shaderBati3DVS :   [

            "#ifdef GL_ES",
            "precision mediump float;",
           " #endif",

           " uniform int textureJPG;",
           " attribute float materialindice;",
           " varying float matindice;",
           " varying vec2 vUv;",
           " varying vec3 vNormal;",
           " varying vec3 pos;",

         "   void main() {",
               " vNormal = normal;",
               " vUv = vec2( uv.x, uv.y );",
               " if(textureJPG ==1) vUv = vec2(vUv.x, 1.- vUv.y);  ",
               " matindice = materialindice;",
               "     pos = position;",
               "   gl_Position  =  projectionMatrix *  modelViewMatrix * vec4( position, 1.0 );",
               "}",
         ],
         
         shaderBati3DFS :   [
             
           " #ifdef GL_ES ",
           " precision highp float;",
           " #endif",


           " uniform sampler2D u_textures[16];",
          "  uniform int textureJPG;",
          "  uniform float alpha;",
           " uniform vec3 light;",

          "  varying float matindice;",
          "  varying vec2 vUv;",
           " varying vec3 vNormal;",
          "  varying vec3 pos;",

          "  vec4 color = vec4(1.,0.,0.,1.);",

          "  void main(void)",
           " {	",
           "         vec2 uv = vUv;",

           "         if (matindice<0.9)      color = texture2D(u_textures[0],uv);",
           "         else if (matindice<1.9) color = texture2D(u_textures[1],uv);",
           "         else if (matindice<2.9) color = texture2D(u_textures[2],uv);",
           "         else if (matindice<3.9) color = texture2D(u_textures[3],uv);",
           "         else if (matindice<4.9) color = texture2D(u_textures[4],uv);",
           "         else if (matindice<5.9) color = texture2D(u_textures[5],uv);",
           "         else if (matindice<6.9) color = texture2D(u_textures[6],uv);",
           "         else if (matindice<7.9) color = texture2D(u_textures[7],uv);",
           "         else if (matindice<8.9) color = texture2D(u_textures[8],uv);",
           "         else if (matindice<9.9) color = texture2D(u_textures[9],uv);",
           "         else if (matindice<10.9) color = texture2D(u_textures[10],uv);",
           "         else if (matindice<11.9) color = texture2D(u_textures[11],uv);",
           "         else if (matindice<12.9) color = texture2D(u_textures[12],uv);",
           "         else if (matindice<13.9) color = texture2D(u_textures[13],uv);",
           "         else if (matindice<14.9) color = texture2D(u_textures[14],uv);",
           "         else if (matindice<15.9) color = texture2D(u_textures[15],uv);",


           "         if(color.r == 0. && color.g ==0.) color =  vec4(vUv.x,vUv.x,vUv.x,0.5);",
                                                                                                //color =  vec4(matindice/2.,1.,1.,1.);
           "        else",
           "               color.a = alpha;",
           "    gl_FragColor = color; //vec4(1.,1.,0.,1.);//texture2D(u_textures[0],uv);",
          " }",
             
             
         ]
             
             
             
             
             
             
         }
 
         return Shader;   
});
