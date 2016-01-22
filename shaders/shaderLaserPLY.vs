	<script type="x-shader/x-vertex" id="vertexshaderlaserply">
		
		#ifdef GL_ES 
		precision mediump float;
		#endif
		
		attribute float displacementx;
		attribute float displacementy;
		attribute float displacementz;
		attribute vec3 colorattribute;
		attribute float uniqueid;
		
		varying vec3 colorpoint;
		uniform float point_size;
		uniform float indice_time_laser;
		uniform float currentidwork;
		
		
		uniform mat4 matLaserApplanix;  // Matrix of laser in the applanix repere
		attribute mat4 matApplanix;  // Matrix of applanix in the absolute repere, changing for each point
		attribute float distance;
		attribute float teta;
		attribute float testZ;
		
		void main() {
		
			gl_PointSize = point_size;
			vec3 newPosition;
			vec3 posTemp = vec3(distance*cos(teta), distance*sin(teta),0.);
			//vec3 newPosition = vec3(position.x+ displacementx*indice_time_laser, position.y+ displacementy*indice_time_laser, position.z+ displacementz*indice_time_laser);
			if(uniqueid==currentidwork){
				newPosition = vec3(posTemp.x+ displacementx*(0.1-indice_time_laser), posTemp.y+ displacementy*(0.1-indice_time_laser), posTemp.z+ displacementz*(0.1-indice_time_laser));
			}else if(currentidwork==100.)
			{	
				newPosition = vec3(posTemp.x+ displacementx*indice_time_laser, posTemp.y+ displacementy*indice_time_laser, posTemp.z+ displacementz*indice_time_laser);//vec3(position.x, position.y, position.z);
			}else{
				newPosition = posTemp;//vec3(position.x+ displacementx*indice_time_laser, position.y+ displacementy*indice_time_laser, position.z+ displacementz*indice_time_laser);
			}
			
			//gl_Position  =  projectionMatrix *  modelViewMatrix * vec4(newPosition,1.);
		        //	gl_Position  =  projectionMatrix *  modelViewMatrix * matApplanix * matLaserApplanix * vec4(distance*cos(teta), distance*sin(teta),0.,1.);//     vec4(newPosition,1.);
			//gl_Position  =  projectionMatrix *  modelViewMatrix * vec4(distance*cos(teta) + matApplanix[3][0], distance*sin(teta) + matApplanix[3][1],matApplanix[3][2],1.);
			//gl_Position  =  projectionMatrix *  modelViewMatrix * vec4(distance*cos(teta) + matApplanix[3][0], distance*sin(teta) + matApplanix[3][1],testZ,1.);
			//gl_Position  =  projectionMatrix *  modelViewMatrix * matLaserApplanix * vec4(distance*cos(teta) + matApplanix[3][0], distance*sin(teta) + matApplanix[3][1],testZ,1.);
			mat4 matApplanixTest = mat4(1.0);
			matApplanixTest[3][2] = testZ;
			
			mat4 testRotation = mat4(1.0);
			/*testRotation = mat4(1.,0.,0.,0.,
								0.,0.,1.,0.,
								0.,-1.,0.,0.,
								0.,0.,0.,1.);*/
			//	gl_Position  =  projectionMatrix *  modelViewMatrix * matApplanixTest * vec4(distance*cos(teta), distance*sin(teta),0.,1.);
                        //gl_Position  =  projectionMatrix *  modelViewMatrix * matApplanixTest * matLaserApplanix * vec4(distance*cos(teta), distance*sin(teta),0.,1.);  // Real Version
			//	gl_Position  =  projectionMatrix *  modelViewMatrix * matApplanixTest * testRotation * vec4(distance*cos(teta), distance*sin(teta),0.,1.);
			//gl_Position  =  projectionMatrix *  modelViewMatrix * matApplanixTest  * testRotation * vec4(distance*cos(teta), distance*sin(teta),0.,1.);
			gl_Position  =  projectionMatrix *  modelViewMatrix * matApplanixTest  * testRotation * vec4(newPosition,1.);
			colorpoint = colorattribute;
		}
				
	</script>