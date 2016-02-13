/**
 * @author alteredq / http://alteredqualia.com/
 * 
 * @Tuned A.D IGN   
 *   Careful RGBA format for target !!!
 */
define(['three'],function(THREE){
THREE.EffectComposer = function ( renderer, renderTarget ) {

	this.renderer = renderer;

	if ( renderTarget === undefined ) {

		var width = window.innerWidth || 1;
		var height = window.innerHeight  || 1;
		var parameters = { minFilter: THREE.LinearMipMapLinear, magFilter: THREE.LinearMipMapLinear, format: THREE.RGBAFormat, stencilBuffer: false, antialias: true};

		renderTarget = new THREE.WebGLRenderTarget( width, height, parameters );

	}

	this.renderTarget1 = renderTarget;
	this.renderTarget2 = renderTarget.clone();

	this.writeBuffer = this.renderTarget1;
	this.readBuffer = this.renderTarget2;

	this.passes = [];

	if ( THREE.CopyShader === undefined )
		console.error( "THREE.EffectComposer relies on THREE.CopyShader" );

	this.copyPass = new THREE.ShaderPass( THREE.CopyShader );

};

THREE.EffectComposer.prototype = {

	swapBuffers: function() {

		var tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;
	},

	addPass: function ( pass ) {

		this.passes.push( pass );

	},

	insertPass: function ( pass, index ) {

		this.passes.splice( index, 0, pass );

	},
        
        // ITOWNS ADDED
        removePass: function(index){
            
            index = index || this.passes.length -1;
            this.passes.splice( index, 1);
        },

	render: function ( delta ) {

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

		var maskActive = false;

		var pass, i, il = this.passes.length;

		for ( i = 0; i < il; i ++ ) {

			pass = this.passes[ i ];

			if ( !pass.enabled ) continue;

			pass.render( this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive );

			if ( pass.needsSwap ) {

				if ( maskActive ) {

					var context = this.renderer.context;

					context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );

					this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, delta );

					context.stencilFunc( context.EQUAL, 1, 0xffffffff );

				}

				this.swapBuffers();

			}

			if ( pass instanceof THREE.MaskPass ) {

				maskActive = true;

			} else if ( pass instanceof THREE.ClearMaskPass ) {

				maskActive = false;

			}

		}

	},

	reset: function ( renderTarget ) {

		if ( renderTarget === undefined ) {

			renderTarget = this.renderTarget1.clone();

			renderTarget.width = window.innerWidth;
			renderTarget.height = window.innerHeight;

		}

		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

	},

	setSize: function ( width, height ) {

		var renderTarget = this.renderTarget1.clone();

		renderTarget.width = width;
		renderTarget.height = height;

		this.reset( renderTarget );

	}

};

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.MaskPass = function ( scene, camera ) {

	this.scene = scene;
	this.camera = camera;

	this.enabled = true;
	this.clear = true;
	this.needsSwap = false;

	this.inverse = false;

};

THREE.MaskPass.prototype = {

	render: function ( renderer, writeBuffer, readBuffer, delta ) {

		var context = renderer.context;

		// don't update color or depth

		context.colorMask( false, false, false, false );
		context.depthMask( false );

		// set up stencil

		var writeValue, clearValue;

		if ( this.inverse ) {

			writeValue = 0;
			clearValue = 1;

		} else {

			writeValue = 1;
			clearValue = 0;

		}

		context.enable( context.STENCIL_TEST );
		context.stencilOp( context.REPLACE, context.REPLACE, context.REPLACE );
		context.stencilFunc( context.ALWAYS, writeValue, 0xffffffff );
		context.clearStencil( clearValue );

		// draw into the stencil buffer

		renderer.render( this.scene, this.camera, readBuffer, this.clear );
		renderer.render( this.scene, this.camera, writeBuffer, this.clear );

		// re-enable update of color and depth

		context.colorMask( true, true, true, true );
		context.depthMask( true );

		// only render where stencil is set to 1

		context.stencilFunc( context.EQUAL, 1, 0xffffffff );  // draw if == 1
		context.stencilOp( context.KEEP, context.KEEP, context.KEEP );

	}

};


THREE.ClearMaskPass = function () {

	this.enabled = true;

};

THREE.ClearMaskPass.prototype = {

	render: function ( renderer, writeBuffer, readBuffer, delta ) {

		var context = renderer.context;

		context.disable( context.STENCIL_TEST );

	}

};



/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

THREE.CopyShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"opacity":  { type: "f", value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform float opacity;",

		"uniform sampler2D tDiffuse;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 texel = texture2D( tDiffuse, vUv );",
			"gl_FragColor = opacity * texel;",

		"}"

	].join("\n")

};


/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.ShaderPass = function ( shader, textureID ) {

	this.textureID = ( textureID !== undefined ) ? textureID : "tDiffuse";

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.material = new THREE.ShaderMaterial( {

		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	} );

	this.renderToScreen = false;

	this.enabled = true;
	this.needsSwap = true;
	this.clear = false;

};

THREE.ShaderPass.prototype = {

	render: function ( renderer, writeBuffer, readBuffer, delta ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer;

		}

		THREE.EffectComposer.quad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.render( THREE.EffectComposer.scene, THREE.EffectComposer.camera );

		} else {

			renderer.render( THREE.EffectComposer.scene, THREE.EffectComposer.camera, writeBuffer, this.clear );

		}

	}

};


/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Screen-space ambient occlusion shader
 * - ported from
 *   SSAO GLSL shader v1.2
 *   assembled by Martins Upitis (martinsh) (http://devlog-martinsh.blogspot.com)
 *   original technique is made by ArKano22 (http://www.gamedev.net/topic/550699-ssao-no-halo-artifacts/)
 * - modifications
 * - modified to use RGBA packed depth texture (use clear color 1,1,1,1 for depth pass)
 * - made fog more compatible with three.js linear fog
 * - refactoring and optimizations
 */

THREE.SSAOShader = {

	uniforms: {

		"tDiffuse":     { type: "t", value: null },
		"tDepth":       { type: "t", value: null },
		"size":         { type: "v2", value: new THREE.Vector2( 512, 512 ) },
		"cameraNear":   { type: "f", value: 1 },
		"cameraFar":    { type: "f", value: 100 },
		"fogNear":      { type: "f", value: 5 },
		"fogFar":       { type: "f", value: 100 },
		"fogEnabled":   { type: "i", value: 0 },
		"onlyAO":       { type: "i", value: 0 },
		"aoClamp":      { type: "f", value: 0.3 },
		"lumInfluence": { type: "f", value: 0.9 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",

			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform float cameraNear;",
		"uniform float cameraFar;",

		"uniform float fogNear;",
		"uniform float fogFar;",

		"uniform bool fogEnabled;",  // attenuate AO with linear fog
		"uniform bool onlyAO;",      // use only ambient occlusion pass?

		"uniform vec2 size;",        // texture width, height
		"uniform float aoClamp;",    // depth clamp - reduces haloing at screen edges

		"uniform float lumInfluence;",  // how much luminance affects occlusion

		"uniform sampler2D tDiffuse;",
		"uniform sampler2D tDepth;",

		"varying vec2 vUv;",

		// "#define PI 3.14159265",
		"#define DL 2.399963229728653",  // PI * ( 3.0 - sqrt( 5.0 ) )
		"#define EULER 2.718281828459045",

		// helpers

		"float width = size.x;",   // texture width
		"float height = size.y;",  // texture height

		"float cameraFarPlusNear = cameraFar + cameraNear;",
		"float cameraFarMinusNear = cameraFar - cameraNear;",
		"float cameraCoef = 2.0 * cameraNear;",

		// user variables

		"const int samples = 8;",     // ao sample count
		"const float radius = 5.0;",  // ao radius

		"const bool useNoise = false;",      // use noise instead of pattern for sample dithering
		"const float noiseAmount = 0.0003;", // dithering amount

		"const float diffArea = 0.4;",   // self-shadowing reduction
		"const float gDisplace = 0.4;",  // gauss bell center

		"const vec3 onlyAOColor = vec3( 1.0, 0.7, 0.5 );",
		// "const vec3 onlyAOColor = vec3( 1.0, 1.0, 1.0 );",


		// RGBA depth

		"float unpackDepth( const in vec4 rgba_depth ) {",

			"const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );",
			"float depth = dot( rgba_depth, bit_shift );",
			"return depth;",

		"}",

		// generating noise / pattern texture for dithering

		"vec2 rand( const vec2 coord ) {",

			"vec2 noise;",

			"if ( useNoise ) {",

				"float nx = dot ( coord, vec2( 12.9898, 78.233 ) );",
				"float ny = dot ( coord, vec2( 12.9898, 78.233 ) * 2.0 );",

				"noise = clamp( fract ( 43758.5453 * sin( vec2( nx, ny ) ) ), 0.0, 1.0 );",

			"} else {",

				"float ff = fract( 1.0 - coord.s * ( width / 2.0 ) );",
				"float gg = fract( coord.t * ( height / 2.0 ) );",

				"noise = vec2( 0.25, 0.75 ) * vec2( ff ) + vec2( 0.75, 0.25 ) * gg;",

			"}",

			"return ( noise * 2.0  - 1.0 ) * noiseAmount;",

		"}",

		"float doFog() {",

			"float zdepth = unpackDepth( texture2D( tDepth, vUv ) );",
			"float depth = -cameraFar * cameraNear / ( zdepth * cameraFarMinusNear - cameraFar );",

			"return smoothstep( fogNear, fogFar, depth );",

		"}",

		"float readDepth( const in vec2 coord ) {",

			// "return ( 2.0 * cameraNear ) / ( cameraFar + cameraNear - unpackDepth( texture2D( tDepth, coord ) ) * ( cameraFar - cameraNear ) );",
			"return cameraCoef / ( cameraFarPlusNear - unpackDepth( texture2D( tDepth, coord ) ) * cameraFarMinusNear );",


		"}",

		"float compareDepths( const in float depth1, const in float depth2, inout int far ) {",

			"float garea = 2.0;",                         // gauss bell width
			"float diff = ( depth1 - depth2 ) * 100.0;",  // depth difference (0-100)

			// reduce left bell width to avoid self-shadowing

			"if ( diff < gDisplace ) {",

				"garea = diffArea;",

			"} else {",

				"far = 1;",

			"}",

			"float dd = diff - gDisplace;",
			"float gauss = pow( EULER, -2.0 * dd * dd / ( garea * garea ) );",
			"return gauss;",

		"}",

		"float calcAO( float depth, float dw, float dh ) {",

			"float dd = radius - depth * radius;",
			"vec2 vv = vec2( dw, dh );",

			"vec2 coord1 = vUv + dd * vv;",
			"vec2 coord2 = vUv - dd * vv;",

			"float temp1 = 0.0;",
			"float temp2 = 0.0;",

			"int far = 0;",
			"temp1 = compareDepths( depth, readDepth( coord1 ), far );",

			// DEPTH EXTRAPOLATION

			"if ( far > 0 ) {",

				"temp2 = compareDepths( readDepth( coord2 ), depth, far );",
				"temp1 += ( 1.0 - temp1 ) * temp2;",

			"}",

			"return temp1;",

		"}",

		"void main() {",

			"vec2 noise = rand( vUv );",
			"float depth = readDepth( vUv );",

			"float tt = clamp( depth, aoClamp, 1.0 );",

			"float w = ( 1.0 / width )  / tt + ( noise.x * ( 1.0 - noise.x ) );",
			"float h = ( 1.0 / height ) / tt + ( noise.y * ( 1.0 - noise.y ) );",

			"float pw;",
			"float ph;",

			"float ao;",

			"float dz = 1.0 / float( samples );",
			"float z = 1.0 - dz / 2.0;",
			"float l = 0.0;",

			"for ( int i = 0; i <= samples; i ++ ) {",

				"float r = sqrt( 1.0 - z );",

				"pw = cos( l ) * r;",
				"ph = sin( l ) * r;",
				"ao += calcAO( depth, pw * w, ph * h );",
				"z = z - dz;",
				"l = l + DL;",

			"}",

			"ao /= float( samples );",
			"ao = 1.0 - ao;",

			"if ( fogEnabled ) {",

				"ao = mix( ao, 1.0, doFog() );",

			"}",

			"vec3 color = texture2D( tDiffuse, vUv ).rgb;",

			"vec3 lumcoeff = vec3( 0.299, 0.587, 0.114 );",
			"float lum = dot( color.rgb, lumcoeff );",
			"vec3 luminance = vec3( lum );",

			"vec3 final = vec3( color * mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );",  // mix( color * ao, white, luminance )

			"if ( onlyAO ) {",

				"final = onlyAOColor * vec3( mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );",  // ambient occlusion only

			"}",

			"gl_FragColor = vec4( final, 1.0 );",

		"}"

	].join("\n")

};


/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.RenderPass = function ( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

	this.scene = scene;
	this.camera = camera;

	this.overrideMaterial = overrideMaterial;

	this.clearColor = clearColor;
	this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 1;

	this.oldClearColor = new THREE.Color();
	this.oldClearAlpha = 1;

	this.enabled = true;
	this.clear = true;
	this.needsSwap = false;

};

THREE.RenderPass.prototype = {

	render: function ( renderer, writeBuffer, readBuffer, delta ) {

		this.scene.overrideMaterial = this.overrideMaterial;

		if ( this.clearColor ) {

			this.oldClearColor.copy( renderer.getClearColor() );
			this.oldClearAlpha = renderer.getClearAlpha();

			renderer.setClearColor( this.clearColor, this.clearAlpha );

		}

		renderer.render( this.scene, this.camera, readBuffer, this.clear );

		if ( this.clearColor ) {

			renderer.setClearColor( this.oldClearColor, this.oldClearAlpha );

		}

		this.scene.overrideMaterial = null;

	}

};

THREE.CloudShader = function(){
    
    var _materialCloud = new THREE.ShaderMaterial( {
        
            uniforms: {

                        "map": { type: "t", value:  THREE.ImageUtils.loadTexture( 'images/cloud10.png')  },
                        "fogColor":    { type: "v3", value: new THREE.Vector3( 0.27,0.5,0.70 ) },
                        "fogNear":   { type: "f", value: -100 },
                        "fogFar":    { type: "f", value: 3000 }

                },

            vertexShader: [

                        "varying vec2 vUv;",

                        "void main() {",

                                "vUv = uv;",
                                "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

                        "}"

                ].join("\n"),

                fragmentShader: [
                                "uniform sampler2D map;",

                                "uniform vec3 fogColor;",
                                "uniform float fogNear;",
                                "uniform float fogFar;",

                                "varying vec2 vUv;",

                                "void main() {",

              
                                         "float depth = gl_FragCoord.z / gl_FragCoord.w;",
                                        "float fogFactor = smoothstep( fogNear, fogFar, depth );",

                                        "gl_FragColor = texture2D( map, vUv );",
                                        "gl_FragColor.w *= pow( gl_FragCoord.z, 20.0 );",
                                        "gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );",
                                      

                        "}"

                ].join("\n")
                
             });
        
        
            this.showClouds = function(){
            
                console.log("showClouds");
                var geometry = new THREE.Geometry();

                var texture = THREE.ImageUtils.loadTexture( 'images/cloud10.png', null);//, animate );
                texture.magFilter = THREE.LinearMipMapLinearFilter;
                texture.minFilter = THREE.LinearMipMapLinearFilter;

                //var fog = new THREE.Fog( 0x4584b4, - 100, 3000 );
                
                var plane = new THREE.Mesh( new THREE.PlaneGeometry( 64, 64 ) );

                for ( var i = 0; i < 8000; i++ ) {

                        plane.position.x = Math.random() * 1000 - 500;
                        plane.position.y =  Math.random() * Math.random() * 200 + 15;
                        plane.position.z = Math.random() * 1000 - 500;//i;//Math.random() *10 - i/800;
                        plane.rotation.z = Math.random() * Math.PI;
                        //plane.rotation.y = Math.random() * Math.PI;
                        //plane.rotation.x = Math.random() * Math.PI;
                        plane.scale.x = plane.scale.y = Math.random() * Math.random() * 1.5 + 0.5;

                        THREE.GeometryUtils.merge( geometry, plane );

                }
                
                _materialCloud.depthWrite= false,
                     _materialCloud.depthTest= false,
                     _materialCloud.transparent=true;
                    _materialCloud.side = THREE.DoubleSide;
                    
                    
                var mesh = new THREE.Mesh( geometry, _materialCloud );

             //   scene.add( mesh );

          //      mesh = new THREE.Mesh( geometry, _materialCloud );
           //     mesh.position.z = - 8000;
             //   scene.add( mesh );
             
             
                return mesh;
            };
        
   };

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Dot screen shader
 * based on glfx.js sepia shader
 * https://github.com/evanw/glfx.js
 */

THREE.DotScreenShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"tSize":    { type: "v2", value: new THREE.Vector2( 256, 256 ) },
		"center":   { type: "v2", value: new THREE.Vector2( 0.5, 0.5 ) },
		"angle":    { type: "f", value: 1.57 },
		"scale":    { type: "f", value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform vec2 center;",
		"uniform float angle;",
		"uniform float scale;",
		"uniform vec2 tSize;",

		"uniform sampler2D tDiffuse;",

		"varying vec2 vUv;",
                

		"float pattern() {",

			"float s = sin( angle ), c = cos( angle );",

			"vec2 tex = vUv * tSize - center;",
			"vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * scale;",

			"return ( sin( point.x ) * sin( point.y ) ) * 4.0;",

		"}",

		"void main() {",

			"vec4 color = texture2D( tDiffuse, vUv );",

			"float average = ( color.r + color.g + color.b ) / 3.0;",

			"gl_FragColor = vec4( vec3( average * 10.0 - 5.0 + pattern() ), color.a );",

		"}"

	].join("\n")
};


/**
 * @author felixturner / http://airtight.cc/
 *
 * RGB Shift Shader
 * Shifts red and blue channels from center in opposite directions
 * Ported from http://kriss.cx/tom/2009/05/rgb-shift/
 * by Tom Butterworth / http://kriss.cx/tom/
 *
 * amount: shift distance (1 is width of input)
 * angle: shift angle in radians
 */

THREE.RGBShiftShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"amount":   { type: "f", value: 0.005 },
		"angle":    { type: "f", value: 0.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float amount;",
		"uniform float angle;",

		"varying vec2 vUv;",

		"void main() {",

			"vec2 offset = amount * vec2( cos(angle), sin(angle));",
			"vec4 cr = texture2D(tDiffuse, vUv + offset);",
			"vec4 cga = texture2D(tDiffuse, vUv);",
			"vec4 cb = texture2D(tDiffuse, vUv - offset);",
			"gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);",

		"}"

	].join("\n")
};
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Bleach bypass shader [http://en.wikipedia.org/wiki/Bleach_bypass]
 * - based on Nvidia example
 * http://developer.download.nvidia.com/shaderlibrary/webpages/shader_library.html#post_bleach_bypass
 */

THREE.BleachBypassShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"opacity":  { type: "f", value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform float opacity;",

		"uniform sampler2D tDiffuse;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 base = texture2D( tDiffuse, vUv );",

			"vec3 lumCoeff = vec3( 0.25, 0.65, 0.1 );",
			"float lum = dot( lumCoeff, base.rgb );",
			"vec3 blend = vec3( lum );",

			"float L = min( 1.0, max( 0.0, 10.0 * ( lum - 0.45 ) ) );",

			"vec3 result1 = 2.0 * base.rgb * blend;",
			"vec3 result2 = 1.0 - 2.0 * ( 1.0 - blend ) * ( 1.0 - base.rgb );",

			"vec3 newColor = mix( result1, result2, L );",

			"float A2 = opacity * base.a;",
			"vec3 mixRGB = A2 * newColor.rgb;",
			"mixRGB += ( ( 1.0 - A2 ) * base.rgb );",

			"gl_FragColor = vec4( mixRGB, base.a );",

		"}"

	].join("\n")

};


/**  (ALEX added brightness & contrast)
 * @author tapio / http://tapio.github.com/
 *
 * Hue and saturation adjustment
 * https://github.com/evanw/glfx.js
 * hue: -1 to 1 (-1 is 180 degrees in the negative direction, 0 is no change, etc.
 * saturation: -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)
 */

THREE.HueSaturationShader = {

	uniforms: {

		"tDiffuse":   { type: "t", value: null },
		"hue":        { type: "f", value: 0 },
		"saturation": { type: "f", value: 0. },
                "brightness": { type: "f", value: 1. },
                "contrast": { type: "f", value: 1. }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float hue;",
		"uniform float saturation;",
                "uniform float brightness;",
                "uniform float contrast;",

		"varying vec2 vUv;",

		"void main() {",

			"gl_FragColor = texture2D( tDiffuse, vUv );",

			// hue
			"float angle = hue * 3.14159265;",
			"float s = sin(angle), c = cos(angle);",
			"vec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;",
			"float len = length(gl_FragColor.rgb);",
			"gl_FragColor.rgb = vec3(",
				"dot(gl_FragColor.rgb, weights.xyz),",
				"dot(gl_FragColor.rgb, weights.zxy),",
				"dot(gl_FragColor.rgb, weights.yzx)",
			");",

			// saturation
			"float average = (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b) / 3.0;",
			"if (saturation > 0.0) {",
				"gl_FragColor.rgb += (average - gl_FragColor.rgb) * (1.0 - 1.0 / (1.001 - saturation));",
			"} else {",
				"gl_FragColor.rgb += (average - gl_FragColor.rgb) * (-saturation);",
			"}",
                        
                        // Constrast
                        "gl_FragColor.rgb = ((gl_FragColor.rgb - 0.5) * max(contrast, 0.)) + 0.5;",
                        
                        // Brightness
                        "gl_FragColor.rgb *= brightness;",

		"}"

	].join("\n")

};

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Focus shader
 * based on PaintEffect postprocess from ro.me
 * http://code.google.com/p/3-dreams-of-black/source/browse/deploy/js/effects/PaintEffect.js
 */

THREE.FocusShader = {

	uniforms : {

		"tDiffuse":       { type: "t", value: null },
		"screenWidth":    { type: "f", value: 1024 },
		"screenHeight":   { type: "f", value: 1024 },
		"sampleDistance": { type: "f", value: 0.94 },
		"waveFactor":     { type: "f", value: 0.00125 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform float screenWidth;",
		"uniform float screenHeight;",
		"uniform float sampleDistance;",
		"uniform float waveFactor;",

		"uniform sampler2D tDiffuse;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 color, org, tmp, add;",
			"float sample_dist, f;",
			"vec2 vin;",
			"vec2 uv = vUv;",

			"add = color = org = texture2D( tDiffuse, uv );",

			"vin = ( uv - vec2( 0.5 ) ) * vec2( 1.4 );",
			"sample_dist = dot( vin, vin ) * 2.0;",

			"f = ( waveFactor * 100.0 + sample_dist ) * sampleDistance * 4.0;",

			"vec2 sampleSize = vec2(  1.0 / screenWidth, 1.0 / screenHeight ) * vec2( f );",

			"add += tmp = texture2D( tDiffuse, uv + vec2( 0.111964, 0.993712 ) * sampleSize );",
			"if( tmp.b < color.b ) color = tmp;",

			"add += tmp = texture2D( tDiffuse, uv + vec2( 0.846724, 0.532032 ) * sampleSize );",
			"if( tmp.b < color.b ) color = tmp;",

			"add += tmp = texture2D( tDiffuse, uv + vec2( 0.943883, -0.330279 ) * sampleSize );",
			"if( tmp.b < color.b ) color = tmp;",

			"add += tmp = texture2D( tDiffuse, uv + vec2( 0.330279, -0.943883 ) * sampleSize );",
			"if( tmp.b < color.b ) color = tmp;",

			"add += tmp = texture2D( tDiffuse, uv + vec2( -0.532032, -0.846724 ) * sampleSize );",
			"if( tmp.b < color.b ) color = tmp;",

			"add += tmp = texture2D( tDiffuse, uv + vec2( -0.993712, -0.111964 ) * sampleSize );",
			"if( tmp.b < color.b ) color = tmp;",

			"add += tmp = texture2D( tDiffuse, uv + vec2( -0.707107, 0.707107 ) * sampleSize );",
			"if( tmp.b < color.b ) color = tmp;",

			"color = color * vec4( 2.0 ) - ( add / vec4( 8.0 ) );",
			"color = color + ( add / vec4( 8.0 ) - color ) * ( vec4( 1.0 ) - vec4( sample_dist * 0.5 ) );",

			"gl_FragColor = vec4( color.rgb * color.rgb * vec3( 0.95 ) + color.rgb, 1.0 );",

		"}"


	].join("\n")
};
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Depth-of-field shader with bokeh
 * ported from GLSL shader by Martins Upitis
 * http://artmartinsh.blogspot.com/2010/02/glsl-lens-blur-filter-with-bokeh.html
 */

THREE.BokehShader = {

	uniforms: {

		"tColor":   { type: "t", value: null },
		"tDepth":   { type: "t", value: null },
		"focus":    { type: "f", value: 1.0 },
		"aspect":   { type: "f", value: 1.0 },
		"aperture": { type: "f", value: 0.0025 },
		"maxblur":  { type: "f", value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"varying vec2 vUv;",

		"uniform sampler2D tColor;",
		"uniform sampler2D tDepth;",

		"uniform float maxblur;",  // max blur amount
		"uniform float aperture;", // aperture - bigger values for shallower depth of field

		"uniform float focus;",
		"uniform float aspect;",

		"void main() {",

			"vec2 aspectcorrect = vec2( 1.0, aspect );",

			"vec4 depth1 = texture2D( tDepth, vUv );",

			"float factor = depth1.x - focus;",

			"vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );",

			"vec2 dofblur9 = dofblur * 0.9;",
			"vec2 dofblur7 = dofblur * 0.7;",
			"vec2 dofblur4 = dofblur * 0.4;",

			"vec4 col = vec4( 0.0 );",

			"col += texture2D( tColor, vUv.xy );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );",

			"col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );",

			"col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );",

			"col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );",
			"col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );",
			"col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );",

			"gl_FragColor = col / 41.0;",
			"gl_FragColor.a = 1.0;",

		"}"

	].join("\n")

};

THREE.blurTriangleXDepth = {
    
                    info: {
                        name: 'triangle blur (pass 1)',
                        author: 'Evan Wallace',
                        link: 'https://github.com/evanw/glfx.js'
                    },

                    uniforms: { tDepth: { type: "t", value: 0, texture: null },
                                radius: { type: "f", value: 0.0 },
                                resolutionW: { type: "f", value: 1920 }
                              },

                    controls: {
                                    radius: {min:0, max: 200, step:.05}
                              },

                   vertexShader: [

                            "varying vec2 vUv;",

                            "void main() {",

                                    "vUv = uv;",
                                    "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

                            "}"

                    ].join("\n"),

                    fragmentShader: [
                        
                        "varying vec2 vUv;",
                        
                        "uniform sampler2D tDepth;",
                        "uniform float radius;",
                        "uniform float resolutionW;",
                        
                        "float random(vec3 scale, float seed) {",
                            "/* use the fragment position for a different seed per-pixel */",
                            "return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);",
                        "}",

                        "void main() {",
                            "vec4 color = vec4(0.0);",
                            "float total = 0.0;",
                            "vec2 delta = vec2(radius / resolutionW, 0);",

                            "/* randomize the lookup values to hide the fixed number of samples */",
                            "float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);",

                            "for (float t = -30.0; t <= 30.0; t++) {",
                                "float percent = (t + offset - 0.5) / 30.0;",
                                "float weight = 1.0 - abs(percent);",
                                "color += texture2D(tDepth, vUv + delta * percent) * weight;",
                                "total += weight;",
                            "}",
                            "gl_FragColor = color / total;",
                        "}",

                    ].join("\n")
                
                };


THREE.blurTriangleX = {
    
                    info: {
                        name: 'triangle blur (pass 1)',
                        author: 'Evan Wallace',
                        link: 'https://github.com/evanw/glfx.js'
                    },

                    uniforms: { tDiffuse: { type: "t", value: 0, texture: null },
                                radius: { type: "f", value: 0.0 },
                                resolutionW: { type: "f", value: 1920 }
                              },

                    controls: {
                                    radius: {min:0, max: 200, step:.05}
                              },

                   vertexShader: [

                            "varying vec2 vUv;",

                            "void main() {",

                                    "vUv = uv;",
                                    "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

                            "}"

                    ].join("\n"),

                    fragmentShader: [
                        
                        "varying vec2 vUv;",
                        
                        "uniform sampler2D tDiffuse;",
                        "uniform float radius;",
                        "uniform float resolutionW;",
                        
                        "float random(vec3 scale, float seed) {",
                            "/* use the fragment position for a different seed per-pixel */",
                            "return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);",
                        "}",

                        "void main() {",
                            "vec4 color = vec4(0.0);",
                            "float total = 0.0;",
                            "vec2 delta = vec2(radius / resolutionW, 0);",

                            "/* randomize the lookup values to hide the fixed number of samples */",
                            "float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);",

                            "for (float t = -30.0; t <= 30.0; t++) {",
                                "float percent = (t + offset - 0.5) / 30.0;",
                                "float weight = 1.0 - abs(percent);",
                                "color += texture2D(tDiffuse, vUv + delta * percent) * weight;",
                                "total += weight;",
                            "}",
                            "gl_FragColor = color / total;",
                        "}",

                    ].join("\n")
                
                };


THREE.blurTriangleY = {
    
                    info: {
                        name: 'triangle blur (pass 2)',
                        author: 'Evan Wallace',
                        link: 'https://github.com/evanw/glfx.js'
                    },

                    uniforms: {     tDiffuse: { type: "t", value: 0, texture: null },
                                    radius: { type: "f", value: 0.0 },
                                    resolutionH: { type: "f", value: 1080 }
                              },

                    controls: {
                                    radius: {min:0, max: 200, step:.05}
                              },

                    vertexShader: [

                            "varying vec2 vUv;",

                            "void main() {",

                                    "vUv = uv;",
                                    "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

                            "}"

                    ].join("\n"),

                    fragmentShader: [
                        
                        "varying vec2 vUv;",
                        
                        "uniform sampler2D tDiffuse;",
                        "uniform float radius;",
                        "uniform float resolutionH;",
                        
                        "float randomy(vec3 scale, float seed) {",
                            "/* use the fragment position for a different seed per-pixel */",
                            "return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);",
                        "}",

                        "void main() {",
                            "vec4 color = vec4(0.0);",
                            "float total = 0.0;",
                            "vec2 delta = vec2(0, radius / resolutionH);",

                            "/* randomize the lookup values to hide the fixed number of samples */",
                            "float offset = randomy(vec3(12.9898, 78.233, 151.7182), 0.0);",

                            "for (float t = -30.0; t <= 30.0; t++) {",
                                "float percent = (t + offset - 0.5) / 30.0;",
                                "float weight = 1.0 - abs(percent);",
                                "color += texture2D(tDiffuse, vUv + delta * percent) * weight;",
                                "total += weight;",
                            "}",
                            "gl_FragColor = color / total;",
                        "}",

                    ].join("\n")
                
                };
                
                
THREE.itownsMask = {
    
                    uniforms:{
                        "tDiffuse": { type: "t", value:1, texture: null },  // from previous shader
                        "textureIn": { type: "t", value:0, texture: null },  // Color image,
                        "bias": { type: "f", value: -2.0 },
                        
                    },
                    
                    controls: {
                            bias: { min:-10, max: 10, step:.5}
                    },
                    
                    vertexShader: [

                            "varying vec2 vUv;",

                            "void main() {",

                                    "vUv = uv;",
                                    "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

                            "}"

                    ].join("\n"),
                    
                    fragmentShader: [

                        "varying vec2 vUv;",

                        "uniform float bias;",
                        "uniform sampler2D tDiffuse;",   // tBlur
                        "uniform sampler2D textureIn;",

                        "void main() {",

                            "vec4 tex_blur = texture2D( tDiffuse, vUv );",
                            "vec4 tex_color = texture2D( textureIn, vUv );",
                            "gl_FragColor = tex_color - 0.2*(vec4(1.) - tex_blur);",//vec4(spatial_imp, 1.0);",//tex_blur;",//vec4(final, 1.0);", //tex_depth;",
                            "gl_FragColor.a = 1.;",
                        "}",
                    
                    ].join("\n")

  }  



  distw =1.0/1920.;
  disth =1.0/1080.;     

  THREE.ItownsSharpening = {

                    info: {
                        name: 'sharpen',
                        author: 'AD'
                    },

                   
                    uniforms:{
                        "tDiffuse": { type: "t", value:0, texture: null },  
                        "bias": { type: "f", value: -2.0 },
                        "kernel" : { type: "iv1", value: [ -1, -1, -1,-1, 17,-1,-1,-1, -1 ] },    // integer array (plain),
                        "screenWidth" : {type: "i", value: 1920 },
		        "screenHeight" : {type: "i", value: 1080 },
                        "offset": { type: "v2v", value: [ 
                            new THREE.Vector2(distw,disth ),new THREE.Vector2( 0.,disth),new THREE.Vector2( -distw,disth),
                            new THREE.Vector2(distw,0. ),new THREE.Vector2( 0.,0.),new THREE.Vector2( -distw,0.),
                            new THREE.Vector2(distw,-disth ),new THREE.Vector2( 0.,-disth),new THREE.Vector2( -distw,-disth)
                            ]
                        }, 
                    },
                    
                    controls: {
                            bias: { min:-10, max: 10, step:.5}
                    },
                    
                    vertexShader: [

                            "varying vec2 vUv;",
                            "void main() {",

                                    "vUv = uv;",
                                    "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

                            "}"

                    ].join("\n"),
                    
                    fragmentShader: [

                        "varying vec2 vUv;",
                        "uniform float bias;",
                        "uniform sampler2D tDiffuse;",
                        "uniform int kernel[ 9 ];",
                        "uniform vec2 offset[ 9 ];",

                        "void main() {",

                           "vec4 sum = vec4(0.0);",        
                           "for(int i = 0; i < 9; i++) {",
                             "  vec4 color = texture2D(tDiffuse, vUv + offset[i]);",
                             "  sum += color * float(kernel[i]);",
                          "}",

                          "gl_FragColor = sum/9.;",//vec4(spatial_imp, 1.0);",//tex_blur;",//vec4(final, 1.0);", //tex_depth;",
                        "}",
                    
                    ].join("\n")

                };

THREE.unsharpMasking = {

                    info: {
                        name: 'unsharp masking',
                        author: 'ported by thierry tranchina aka @rDad',
                        link: 'http://graphics.uni-konstanz.de/publikationen/2006/unsharp_masking/webseite/'
                    },

                    uniforms:{
                        "tDepth": { type: "t", value:2, texture: null },
                        "tDiffuse": { type: "t", value:1, texture: null },   //  tBlur is the tDiffuse
                        "textureIn": { type: "t", value:0, texture: null },  
                        "bias": { type: "f", value: -2.0 }
                    },
                    
                    controls: {
                            bias: { min:-10, max: 10, step:.5}
                    },
                    
                    vertexShader: [

                            "varying vec2 vUv;",

                            "void main() {",

                                    "vUv = uv;",
                                    "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

                            "}"

                    ].join("\n"),
                    
                    fragmentShader: [

                        "varying vec2 vUv;",

                        "uniform float bias;",
                        "uniform sampler2D tDepth;",
                        "uniform sampler2D tDiffuse;",   // tBlur
                        "uniform sampler2D textureIn;",

                        "void main() {",

                            "vec4 tex_depth = texture2D( tDepth, vUv );",
                            "vec4 tex_blur = texture2D( tDiffuse, vUv );",
                            "vec4 tex_color = texture2D( textureIn, vUv );",

                            "vec3 spatial_imp = tex_blur.rgb - tex_depth.rgb;",

                            "vec3 final = vec3(1.,1.,1.);",//tex_color.rgb;",
                     //       "if(spatial_imp.r <=0.0) spatial_imp = vec3(0.,0.,0.);",
                            "if(spatial_imp.r>=0.0  &&  spatial_imp.r<0.9/*tex_depth.r >0.2*/)",
                            "{",
                                " final += spatial_imp * bias;",
                            "}",

                          "gl_FragColor = vec4(final, 0.2);",//vec4(spatial_imp, 1.0);",//tex_blur;",//vec4(final, 1.0);", //tex_depth;",

                        "}",
                    
                    ].join("\n")

                };


/**
 * @author alex IGN
 *
*/

THREE.ItownsToneMapping = {

	uniforms: {

		"tColor":   { type: "t", value: null },  // blurred img
                "tDiffuse":   { type: "t", value: null },
		"exposure":   { type: "f", value: 0.125 },
		"brightMax":    { type: "f", value: 0.5 }
	},
        
        vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

    fragmentShader: [


		"uniform sampler2D   tColor;",
                "uniform sampler2D   tDiffuse;",
		"uniform float       exposure;",
		"uniform float       brightMax;",

		"varying vec2  vUv;",
  
              
		"void main() {",


			"	vec4 colorOriginal =  texture2D( tColor, vUv );",
                        "	vec4 colorBlurred  =  texture2D( tDiffuse, vUv );",
                        
                        //"       colorOriginal *=2.;",
                        //"       colorBlurred  *=2.;",
                        "       vec4 newColor = colorOriginal/(colorBlurred+0.2);",
			"	gl_FragColor = vec4( newColor.xyz, 1 );",

                  "}"                    
                
	].join("\n")
		
};

THREE.ItownsDepthShader = {

	uniforms: {

		"tColor":   { type: "t", value: null },
		"tDepth":   { type: "t", value: null },
		"focus":    { type: "f", value: 1 },
		"maxblur":  { type: "f", value: 1.8 },
                "effectIntensity": { type: "f", value: 0.},
                "indice_time": { type: "f", value: 0.}

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform float focus;",
		"uniform float maxblur;",

		"uniform sampler2D tColor;",
		"uniform sampler2D tDepth;",
                "uniform float effectIntensity;",
                "uniform float indice_time;",

		"varying vec2 vUv;",
                "float cameraFar = 10000.;",
                "float cameraNear = 0.2;",
                "float fogFar = 200.;",
                "float fogNear = 5.;",

                "float cameraFarPlusNear = cameraFar + cameraNear;",
		"float cameraFarMinusNear = cameraFar - cameraNear;",
		"float cameraCoef = 2.0 * cameraNear;",
                //" vec3 fogColor = vec3(0.93725,0.8196,0.7098);",
                " vec3 fogColor = vec3(0.9725,0.896,0.7598);",
                " vec3 skyColor = vec3(0.613,0.758,0.947);",
                " const float LOG2 = 1.442695;",
                " float fogDensity = 0.0025;",
  
		"void main() {",

                       
                        " vec4 depth = texture2D( tDepth, vUv );",
                        " float factor = depth.x - focus;",

                        " vec4 col = texture2D( tColor, vUv);//, 2.0 * maxblur * abs( focus - depth.x ) ); ",
                                                //" col.a=1.;",
                                                // "if (col.r > 0.9 && col.g > 0.9 && col.b > 0.9) {col = vec4(fogColor,1.);}",// col.r = 0.; col.g = 0.;col.a = 0.;}",
                        " gl_FragColor = col; ",
                                                // " gl_FragColor.a = 1.0;",
                        " float depth2 = (1.-depth.x);", 
                                                // " float fogFactor = exp2( - fogDensity * fogDensity * depth2 * depth2 * LOG2 );",
                                                // " fogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );",
                       // We mix the blue sky and the fog color for ambient
                        " vec4 newAmbientColor = mix( vec4(skyColor,1.), vec4(fogColor, 1. ), effectIntensity / 100. );",
                        
                        "float coefMix = depth2/1.1;",
                      //  "if (col.r > 0.98 && col.g > 0.98 && col.b > 0.98 ) coefMix = 1.;",
                        " gl_FragColor = mix( col, newAmbientColor, coefMix);",
                        
                        // Apply brightness.
                         "gl_FragColor.rgb += 0.1 - effectIntensity/1000.;",

                        // Lightning
                        "if (( effectIntensity == 100. && mod(indice_time,50.) >= 0. && mod(indice_time,50.) <= 0.2)",
                         "  || ( effectIntensity == 100. && mod(indice_time,49.) >= 0. && mod(indice_time,49.) <= 0.2)) ",

                                " gl_FragColor = mix( col, vec4( 1.,1.,1.,1. ), depth2/1.1);",
                  "}"                    
                
	].join("\n")

};


THREE.BufferGeometryUtils = {

	fromGeometry: function geometryToBufferGeometry( geometry, settings ) {

		if ( geometry instanceof THREE.BufferGeometry ) {
			return geometry;
		}

		settings = settings || { 'vertexColors': THREE.NoColors };

		var vertices = geometry.vertices;
		var faces = geometry.faces;
		var faceVertexUvs = geometry.faceVertexUvs;
		var vertexColors = settings.vertexColors;
		var hasFaceVertexUv = faceVertexUvs[ 0 ].length > 0;

		var bufferGeometry = new THREE.BufferGeometry();

		var positions = new Float32Array( faces.length * 3 * 3 );
        var materialindice = new Float32Array( faces.length *3 );

		var colors, uvs;
		if ( vertexColors !== THREE.NoColors )
			colors = new Float32Array( faces.length * 3 * 3 );

		if ( hasFaceVertexUv === true )
			uvs = new Float32Array( faces.length * 3 * 2 );

		var i2 = 0, i3 = 0;
		for ( var i = 0; i < faces.length; i ++ ) {

			var face = faces[ i ];
                        var materialIndiceCurrent = face.materialIndex;
                        var matIndiceNormalized = materialIndiceCurrent - settings.indice;
      
                        materialindice[i*3]   = matIndiceNormalized;
                        materialindice[i*3+1] = matIndiceNormalized;
                        materialindice[i*3+2] = matIndiceNormalized;
                
               
			var a = vertices[ face.a ];
			var b = vertices[ face.b ];
			var c = vertices[ face.c ];

			positions[ i3     ] = a.x;
			positions[ i3 + 1 ] = a.y;
			positions[ i3 + 2 ] = a.z;
			
			positions[ i3 + 3 ] = b.x;
			positions[ i3 + 4 ] = b.y;
			positions[ i3 + 5 ] = b.z;
			
			positions[ i3 + 6 ] = c.x;
			positions[ i3 + 7 ] = c.y;
			positions[ i3 + 8 ] = c.z;

			if ( vertexColors === THREE.FaceColors ) {

				var fc = face.color;

				colors[ i3     ] = fc.r;
				colors[ i3 + 1 ] = fc.g;
				colors[ i3 + 2 ] = fc.b;

				colors[ i3 + 3 ] = fc.r;
				colors[ i3 + 4 ] = fc.g;
				colors[ i3 + 5 ] = fc.b;

				colors[ i3 + 6 ] = fc.r;
				colors[ i3 + 7 ] = fc.g;
				colors[ i3 + 8 ] = fc.b;

			} else if ( vertexColors === THREE.VertexColors ) {

				var vca = face.vertexColors[ 0 ];
				var vcb = face.vertexColors[ 1 ];
				var vcc = face.vertexColors[ 2 ];

				colors[ i3     ] = vca.r;
				colors[ i3 + 1 ] = vca.g;
				colors[ i3 + 2 ] = vca.b;

				colors[ i3 + 3 ] = vcb.r;
				colors[ i3 + 4 ] = vcb.g;
				colors[ i3 + 5 ] = vcb.b;

				colors[ i3 + 6 ] = vcc.r;
				colors[ i3 + 7 ] = vcc.g;
				colors[ i3 + 8 ] = vcc.b;

			}

			if ( hasFaceVertexUv === true ) {

				var uva = faceVertexUvs[ 0 ][ i ][ 0 ];
				var uvb = faceVertexUvs[ 0 ][ i ][ 1 ];
				var uvc = faceVertexUvs[ 0 ][ i ][ 2 ];

				uvs[ i2     ] = uva.x;
				uvs[ i2 + 1 ] = uva.y;
			
				uvs[ i2 + 2 ] = uvb.x;
				uvs[ i2 + 3 ] = uvb.y;
			
				uvs[ i2 + 4 ] = uvc.x;
				uvs[ i2 + 5 ] = uvc.y;

			}

			i3 += 9;
			i2 += 6;

		}

		bufferGeometry.addAttribute('position', new THREE.BufferAttribute( positions, 3 ) );
		bufferGeometry.addAttribute('materialindice', new THREE.BufferAttribute( materialindice, 1 ) );
		
		if ( vertexColors !== THREE.NoColors )
			bufferGeometry.addAttribute('color', new THREE.BufferAttribute( colors, 3 ) );

		if ( hasFaceVertexUv === true )
			bufferGeometry.addAttribute('uv', new THREE.BufferAttribute( uvs, 2 ) );
			
		bufferGeometry.computeBoundingSphere();

		return bufferGeometry;

	}

};

THREE.AnaglyphEffect = function ( renderer,base3D, width, height ) {

        
	var eyeRight = new THREE.Matrix4();
	var eyeLeft = new THREE.Matrix4();
	var focalLength = base3D;
	var _aspect, _near, _far, _fov;
        var _anaglyphOn = true;
       // var _sideBySideOn = false;
        var _arrayEffect = [1,0,0]; // 3 renderings, [Anaglyph,Polarize,SidebySide]
        var _currentEffectNum = 0; // -> anaglyph [0-2]

	var _cameraL = new THREE.PerspectiveCamera();
	_cameraL.matrixAutoUpdate = false;

	var _cameraR = new THREE.PerspectiveCamera();
	_cameraR.matrixAutoUpdate = false;

	var _camera = new THREE.OrthographicCamera( -1, 1, 1, - 1, 0, 1 );

	var _scene = new THREE.Scene();

	var _params = { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat };

	if ( width === undefined ) width = 512;
	if ( height === undefined ) height = 512;

	var _renderTargetL = new THREE.WebGLRenderTarget( width, height, _params );
	var _renderTargetR = new THREE.WebGLRenderTarget( width, height, _params );

	var _materialAnalgyph = new THREE.ShaderMaterial( {

		uniforms: {

			"mapLeft": { type: "t", value: _renderTargetL },
			"mapRight": { type: "t", value: _renderTargetR }

		},

		vertexShader: [

			"varying vec2 vUv;",

			"void main() {",

			"	vUv = vec2( uv.x, uv.y );",
			"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform sampler2D mapLeft;",
			"uniform sampler2D mapRight;",
			"varying vec2 vUv;",

			"void main() {",

			"	vec4 colorL, colorR;",
			"	vec2 uv = vUv;",

			"	colorL = texture2D( mapLeft, uv );",
			"	colorR = texture2D( mapRight, uv );",

				// http://3dtv.at/Knowhow/AnaglyphComparison_en.aspx

			"	gl_FragColor = vec4( colorL.g * 0.7 + colorL.b * 0.3, colorR.g, colorR.b, colorL.a + colorR.a ) * 1.1;",

			"}"

		].join("\n")

	} );
        
        // For rendering on 3D screen (1 line on 2)
        var _materialPolarize = new THREE.ShaderMaterial( {

		uniforms: {

			"mapLeft": { type: "t", value: _renderTargetL },
			"mapRight": { type: "t", value: _renderTargetR }

		},

		vertexShader: [

			"varying vec2 vUv;",

			"void main() {",

			"	vUv = vec2( uv.x, uv.y );",
			"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform sampler2D mapLeft;",
			"uniform sampler2D mapRight;",
			"varying vec2 vUv;",

			"void main() {",

			"	vec2 uv = vUv;",

			"	if ( ( mod( gl_FragCoord.y, 2.0 ) ) > 1.00 ) {",

			"		gl_FragColor = texture2D( mapLeft, uv );",

			"	} else {",

			"		gl_FragColor = texture2D( mapRight, uv );",

			"	}",

			"}"


		].join("\n")

	} );
        
         // For rendering on 3D screen (1 line on 2)
        var _materialSideBySide = new THREE.ShaderMaterial( {

		uniforms: {

			"mapLeft": { type: "t", value: _renderTargetL },
			"mapRight": { type: "t", value: _renderTargetR }

		},

		vertexShader: [

			"varying vec2 vUv;",

			"void main() {",

			"	vUv = vec2( uv.x, uv.y );",
			"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform sampler2D mapLeft;",
			"uniform sampler2D mapRight;",
			"varying vec2 vUv;",

			"void main() {",

			"	if ( gl_FragCoord.x  < 960. ) {",

			"		gl_FragColor = texture2D( mapLeft, vec2(vUv.x *2., vUv.y) );",

			"	} else {",

			"		gl_FragColor = texture2D( mapRight, vec2((vUv.x - 0.5) *2., vUv.y) );",

			"	}",

			"}"


		].join("\n")

	} );


        _material = _materialAnalgyph;

	var mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), _material );
	_scene.add( mesh );
        
        /*   // Polarize and anaglyph SAVE
        this.switchMaterial = function(){
            
            _anaglyphOn = !_anaglyphOn;
            
            if (!_anaglyphOn)
                _material = _materialPolarize;    
            else
                _material = _materialAnalgyph;

            _material.uniforms[ "mapLeft" ].value = _renderTargetL;
            _material.uniforms[ "mapRight" ].value = _renderTargetR;
            mesh.material = _material;
        };
     */
        
        // switch between ActiveGlasses and anaglyph
        this.switchMaterial = function(){
            
            _currentEffectNum = (_currentEffectNum+1) % 3;
   
            switch(_currentEffectNum){
            
                case 0:  _material = _materialAnalgyph; break;
                case 1:  _material = _materialPolarize; break;
                case 2:  _material = _materialSideBySide; break;
            }

            _material.uniforms[ "mapLeft" ].value = _renderTargetL;
            _material.uniforms[ "mapRight" ].value = _renderTargetR;
            mesh.material = _material;
        };
        
        
        this.setFocalLength = function(v,camera){
            
            focalLength = v;
            _aspect = camera.aspect;
            _near = camera.near;
            _far = camera.far;
            _fov = camera.fov;

            var projectionMatrix = camera.projectionMatrix.clone();
            var eyeSep = focalLength / 30 * 0.5;
            var eyeSepOnProjection = eyeSep * _near / focalLength;
            var ymax = _near * Math.tan( THREE.Math.degToRad( _fov * 0.5 ) );
            var xmin, xmax;

            // translate xOffset

            eyeRight.elements[12] = eyeSep;
            eyeLeft.elements[12] = -eyeSep;

            // for left eye

            xmin = -ymax * _aspect + eyeSepOnProjection;
            xmax = ymax * _aspect + eyeSepOnProjection;

            projectionMatrix.elements[0] = 2 * _near / ( xmax - xmin );
            projectionMatrix.elements[8] = ( xmax + xmin ) / ( xmax - xmin );

            _cameraL.projectionMatrix.copy( projectionMatrix );

            // for right eye

            xmin = -ymax * _aspect - eyeSepOnProjection;
            xmax = ymax * _aspect - eyeSepOnProjection;

            projectionMatrix.elements[0] = 2 * _near / ( xmax - xmin );
            projectionMatrix.elements[8] = ( xmax + xmin ) / ( xmax - xmin );

            _cameraR.projectionMatrix.copy( projectionMatrix );

        }


	this.setSize = function ( width, height ) {

		if ( _renderTargetL ) _renderTargetL.dispose();
		if ( _renderTargetR ) _renderTargetR.dispose();
		_renderTargetL = new THREE.WebGLRenderTarget( width, height, _params );
		_renderTargetR = new THREE.WebGLRenderTarget( width, height, _params );

		_material.uniforms[ "mapLeft" ].value = _renderTargetL;
		_material.uniforms[ "mapRight" ].value = _renderTargetR;

		renderer.setSize( width, height );

	};

	/*
	 * Renderer now uses an asymmetric perspective projection
	 * (http://paulbourke.net/miscellaneous/stereographics/stereorender/).
	 *
	 * Each camera is offset by the eye seperation and its projection matrix is
	 * also skewed asymetrically back to converge on the same projection plane.
	 * Added a focal length parameter to, this is where the parallax is equal to 0.
	 */

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		if ( camera.parent === undefined ) camera.updateMatrixWorld();

		var hasCameraChanged = ( _aspect !== camera.aspect ) || ( _near !== camera.near ) || ( _far !== camera.far ) || ( _fov !== camera.fov );

		if ( hasCameraChanged ) {

			_aspect = camera.aspect;
			_near = camera.near;
			_far = camera.far;
			_fov = camera.fov;

			var projectionMatrix = camera.projectionMatrix.clone();
			var eyeSep = focalLength / 30 * 0.5;
			var eyeSepOnProjection = eyeSep * _near / focalLength;
			var ymax = _near * Math.tan( THREE.Math.degToRad( _fov * 0.5 ) );
			var xmin, xmax;

			// translate xOffset

			eyeRight.elements[12] = eyeSep;
			eyeLeft.elements[12] = -eyeSep;

			// for left eye

			xmin = -ymax * _aspect + eyeSepOnProjection;
			xmax = ymax * _aspect + eyeSepOnProjection;

			projectionMatrix.elements[0] = 2 * _near / ( xmax - xmin );
			projectionMatrix.elements[8] = ( xmax + xmin ) / ( xmax - xmin );

			_cameraL.projectionMatrix.copy( projectionMatrix );

			// for right eye

			xmin = -ymax * _aspect - eyeSepOnProjection;
			xmax = ymax * _aspect - eyeSepOnProjection;

			projectionMatrix.elements[0] = 2 * _near / ( xmax - xmin );
			projectionMatrix.elements[8] = ( xmax + xmin ) / ( xmax - xmin );

			_cameraR.projectionMatrix.copy( projectionMatrix );

		}

		_cameraL.matrixWorld.copy( camera.matrixWorld ).multiply( eyeLeft );
		_cameraL.position.copy( camera.position );
		_cameraL.near = camera.near;
		_cameraL.far = camera.far;

		renderer.render( scene, _cameraL, _renderTargetL, true );

		_cameraR.matrixWorld.copy( camera.matrixWorld ).multiply( eyeRight );
		_cameraR.position.copy( camera.position );
		_cameraR.near = camera.near;
		_cameraR.far = camera.far;

		renderer.render( scene, _cameraR, _renderTargetR, true );

		renderer.render( _scene, _camera );

	};

	this.dispose = function() {
		if ( _renderTargetL ) _renderTargetL.dispose();
		if ( _renderTargetR ) _renderTargetR.dispose();
	}

};




THREE.ShaderLib['water'] = {

	uniforms: { "normalSampler":	{ type: "t", value: null },
				"mirrorSampler":	{ type: "t", value: null },
				"alpha":			{ type: "f", value: 1.0 },
				"time":				{ type: "f", value: 0.0 },
				"distortionScale":	{ type: "f", value: 20.0 },
				"noiseScale":		{ type: "f", value: 1.0 },
				"textureMatrix" :	{ type: "m4", value: new THREE.Matrix4() },
				"sunColor":			{ type: "c", value: new THREE.Color(0x7F7F7F) },
				"sunDirection":		{ type: "v3", value: new THREE.Vector3(0.70707, 0.70707, 0) },
				"eye":				{ type: "v3", value: new THREE.Vector3(0, 0, 0) },
				"waterColor":		{ type: "c", value: new THREE.Color(0x555555) },
				"betaVersion":		{ type: "i", value: 0 }
	},

	vertexShader: [
		'uniform mat4 textureMatrix;',
		'uniform float time;',
		'uniform float noiseScale;',
		'uniform sampler2D normalSampler;',
		'uniform int betaVersion;',

		'varying vec4 mirrorCoord;',
		'varying vec3 worldPosition;',
		
		'float getHeight(in vec2 uv)',
		'{',
		'	vec2 uv0 = uv / (103.0 * noiseScale) + vec2(time / 17.0, time / 29.0);',
		'	vec2 uv1 = uv / (107.0 * noiseScale) - vec2(time / -19.0, time / 31.0);',
		'	vec2 uv2 = uv / (vec2(8907.0, 9803.0) * noiseScale) + vec2(time / 101.0, time /  097.0);',
		'	vec2 uv3 = uv / (vec2(1091.0, 1027.0) * noiseScale) - vec2(time / 109.0, time / -113.0);',
		
		'	float v0 = texture2D(normalSampler, uv0).y;',
		'	float v1 = texture2D(normalSampler, uv1).y;',
		'	float v2 = texture2D(normalSampler, uv2).y;',
		'	float v3 = texture2D(normalSampler, uv3).y;',
		
		'	return v0 * 103.0 + v1 * 107.0 + v2 * 9000.0 + v3 * 1000.0 + 20000.0;',
		'}',
		
		'void main()',
		'{',
		'	mirrorCoord = modelMatrix * vec4(position, 1.0);',
		'	worldPosition = mirrorCoord.xyz;',
		
		'	mirrorCoord = textureMatrix * mirrorCoord;',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
		
		/*'	if(betaVersion > 0)', // This is just a really beta way to add movement on vertices, totally wrong, but fast to implement
		'	{',
		'		gl_Position.y += getHeight(worldPosition.xz) * 0.008;',
		'	}',*/
		'}'
	].join('\n'),

	fragmentShader: [		
		'uniform sampler2D mirrorSampler;',
		'uniform float alpha;',
		'uniform float time;',
		'uniform float distortionScale;',
		'uniform float noiseScale;',
		'uniform sampler2D normalSampler;',
		'uniform vec3 sunColor;',
		'uniform vec3 sunDirection;',
		'uniform vec3 eye;',
		'uniform vec3 waterColor;',

		'varying vec4 mirrorCoord;',
		'varying vec3 worldPosition;',
		
		'void sunLight(const vec3 surfaceNormal, const vec3 eyeDirection, in float shiny, in float spec, in float diffuse, inout vec3 diffuseColor, inout vec3 specularColor)',
		'{',
		'	vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));',
		'	float direction = max(0.0, dot(eyeDirection, reflection));',
		'	specularColor += pow(direction, shiny) * sunColor * spec;',
		'	diffuseColor += max(dot(sunDirection, surfaceNormal), 0.0) * sunColor * diffuse;',
		'}',
		
		'vec3 getNoise(in vec2 uv)',
		'{',
		'	vec2 uv0 = uv / (103.0 * noiseScale) + vec2(time / 17.0, time / 29.0);',
		'	vec2 uv1 = uv / (107.0 * noiseScale) - vec2(time / -19.0, time / 31.0);',
		'	vec2 uv2 = uv / (vec2(8907.0, 9803.0) * noiseScale) + vec2(time / 101.0, time /   97.0);',
		'	vec2 uv3 = uv / (vec2(1091.0, 1027.0) * noiseScale) - vec2(time / 109.0, time / -113.0);',
		'	vec4 noise = (texture2D(normalSampler, uv0)) +',
        '		(texture2D(normalSampler, uv1)) +',
        '		(texture2D(normalSampler, uv2)) +',
		'		(texture2D(normalSampler, uv3));',
		'	return noise.xzy * 0.5 - 1.0;',
		'}',
		
		'void main()',
		'{',
		'	vec3 surfaceNormal = (getNoise(worldPosition.xz));',
		'   if( eye.y < worldPosition.y )',
		'		surfaceNormal = surfaceNormal * -1.0;',

		'	vec3 diffuseLight = vec3(0.0);',
		'	vec3 specularLight = vec3(0.0);',

		'	vec3 worldToEye = eye - worldPosition;',
		'	vec3 eyeDirection = normalize(worldToEye);',
		'	sunLight(surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight);',
		
		'	float distance = length(worldToEye);',

		'	vec2 distortion = surfaceNormal.xz * distortionScale * sqrt(distance) * 0.07;',
        '   vec3 mirrorDistord = mirrorCoord.xyz + vec3(distortion.x, distortion.y, 1.0);',
        '   vec3 reflectionSample = texture2DProj(mirrorSampler, mirrorDistord).xyz;',

		'	float theta = max(dot(eyeDirection, surfaceNormal), 0.0);',
		'	const float rf0 = 0.3;',
		'	float reflectance = 0.3 + (1.0 - 0.3) * pow((1.0 - theta), 5.0);',
		'	vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor;',
		'	vec3 albedo = mix(sunColor * diffuseLight * 0.3 + scatter, (vec3(0.1) + reflectionSample * 0.9 + reflectionSample * specularLight), reflectance);',
        '   vec2 tmp = mirrorCoord.xy / mirrorCoord.z + distortion;',

        '	gl_FragColor = vec4(albedo, alpha);',
		'}'
	].join('\n')

};

THREE.Water = function (renderer, camera, scene, options) {
	
	THREE.Object3D.call(this);
	this.name = 'water_' + this.id;

	function isPowerOfTwo (value) {
		return (value & (value - 1)) === 0;
	};
	function optionalParameter (value, defaultValue) {
		return value !== undefined ? value : defaultValue;
	};

	options = options || {};
	
	this.matrixNeedsUpdate = true;
	
	var width = optionalParameter(options.textureWidth, 512);
	var height = optionalParameter(options.textureHeight, 512);
	this.clipBias = optionalParameter(options.clipBias, -0.0001);
	this.alpha = optionalParameter(options.alpha, 1.0);
	this.time = optionalParameter(options.time, 0.0);
	this.normalSampler = optionalParameter(options.waterNormals, null);
	this.sunDirection = optionalParameter(options.sunDirection, new THREE.Vector3(0.70707, 0.70707, 0.0));
	this.sunColor = new THREE.Color(optionalParameter(options.sunColor, 0xffffff));
	this.waterColor = new THREE.Color(optionalParameter(options.waterColor, 0x7F7F7F));
	this.eye = optionalParameter(options.eye, new THREE.Vector3(0, 0, 0));
	this.distortionScale = optionalParameter(options.distortionScale, 20.0);
	this.noiseScale = optionalParameter(options.noiseScale, 1.0);
	this.betaVersion = optionalParameter(options.betaVersion, 0);
	this.side = optionalParameter(options.side, THREE.FrontSide);
	
	this.renderer = renderer;
	this.scene = scene;
	this.mirrorPlane = new THREE.Plane();
	this.normal = new THREE.Vector3(0, 0, 1);
	this.mirrorWorldPosition = new THREE.Vector3();
	this.cameraWorldPosition = new THREE.Vector3();
	this.rotationMatrix = new THREE.Matrix4();
	this.lookAtPosition = new THREE.Vector3(0, 0, -1);
	this.clipPlane = new THREE.Vector4();
	
	if (camera instanceof THREE.PerspectiveCamera)
		this.camera = camera;
	else  {
		this.camera = new THREE.PerspectiveCamera();
		console.log(this.name + ': camera is not a Perspective Camera!')
	}

	this.textureMatrix = new THREE.Matrix4();

	this.mirrorCamera = this.camera.clone();
	
	this.texture = new THREE.WebGLRenderTarget(width, height);
	this.tempTexture = new THREE.WebGLRenderTarget(width, height);
	
	var mirrorShader = THREE.ShaderLib["water"];
	var mirrorUniforms = THREE.UniformsUtils.clone(mirrorShader.uniforms);

	this.material = new THREE.ShaderMaterial({ 
		fragmentShader: mirrorShader.fragmentShader, 
		vertexShader: mirrorShader.vertexShader, 
		uniforms: mirrorUniforms,
		transparent: true,
		side: this.side
	});

	this.material.uniforms.mirrorSampler.value = this.texture;
	this.material.uniforms.textureMatrix.value = this.textureMatrix;
	this.material.uniforms.alpha.value = this.alpha;
	this.material.uniforms.time.value = this.time;
	this.material.uniforms.normalSampler.value = this.normalSampler;
	this.material.uniforms.sunColor.value = this.sunColor;
	this.material.uniforms.waterColor.value = this.waterColor;
	this.material.uniforms.sunDirection.value = this.sunDirection;
	this.material.uniforms.distortionScale.value = this.distortionScale;
	this.material.uniforms.noiseScale.value = this.noiseScale;
	this.material.uniforms.betaVersion.value = this.betaVersion;
	
	this.material.uniforms.eye.value = this.eye;
	
	if (!isPowerOfTwo(width) || !isPowerOfTwo(height)) 
	{
		this.texture.generateMipmaps = false;
		this.tempTexture.generateMipmaps = false;
	}

	this.updateTextureMatrix();
	this.render();
};

THREE.Water.prototype = Object.create(THREE.Object3D.prototype);

THREE.Water.prototype.renderWithMirror = function (otherMirror) {

	// update the mirror matrix to mirror the current view
	this.updateTextureMatrix();
	this.matrixNeedsUpdate = false;

	// set the camera of the other mirror so the mirrored view is the reference view
	var tempCamera = otherMirror.camera;
	otherMirror.camera = this.mirrorCamera;

	// render the other mirror in temp texture
	otherMirror.renderTemp();
	otherMirror.material.uniforms.mirrorSampler.value = otherMirror.tempTexture;

	// render the current mirror
	this.render();
	this.matrixNeedsUpdate = true;

	// restore material and camera of other mirror
	otherMirror.material.uniforms.mirrorSampler.value = otherMirror.texture;
	otherMirror.camera = tempCamera;

	// restore texture matrix of other mirror
	otherMirror.updateTextureMatrix();
};

THREE.Water.prototype.updateTextureMatrix = function () {


       // console.log("tttttthis",this);
	function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }

	this.updateMatrixWorld();
	this.camera.updateMatrixWorld();

	//this.mirrorWorldPosition.setFromMatrixPosition(this.matrixWorld);
	//this.cameraWorldPosition.setFromMatrixPosition(this.camera.matrixWorld);
        this.mirrorWorldPosition = new THREE.Vector3().getPositionFromMatrix(this.matrixWorld);
        this.cameraWorldPosition = new THREE.Vector3().getPositionFromMatrix(this.camera.matrixWorld);

	this.rotationMatrix.extractRotation(this.matrixWorld);

	if( this.mirrorWorldPosition.y > this.cameraWorldPosition.y ) {
		this.normal.set(0, 0, -1);
	}
	else {
		this.normal.set(0, 0, 1);
	}
	this.normal.applyMatrix4(this.rotationMatrix);

	var view = this.mirrorWorldPosition.clone().sub(this.cameraWorldPosition);
	view.reflect(this.normal).negate();
	view.add(this.mirrorWorldPosition);

	this.rotationMatrix.extractRotation(this.camera.matrixWorld);

	this.lookAtPosition.set(0, 0, -1);
	this.lookAtPosition.applyMatrix4(this.rotationMatrix);
	this.lookAtPosition.add(this.cameraWorldPosition);

	var target = this.mirrorWorldPosition.clone().sub(this.lookAtPosition);
	target.reflect(this.normal).negate();
	target.add(this.mirrorWorldPosition);

	this.up.set(0, -1, 0);
	this.up.applyMatrix4(this.rotationMatrix);
	this.up.reflect(this.normal).negate();

	this.mirrorCamera.position.copy(view);
	this.mirrorCamera.up = this.up;
	this.mirrorCamera.lookAt(target);
	this.mirrorCamera.aspect = this.camera.aspect;

	this.mirrorCamera.updateProjectionMatrix();
	this.mirrorCamera.updateMatrixWorld();
	this.mirrorCamera.matrixWorldInverse.getInverse(this.mirrorCamera.matrixWorld);

	// Update the texture matrix
	this.textureMatrix.set(0.5, 0.0, 0.0, 0.5,
							0.0, 0.5, 0.0, 0.5,
							0.0, 0.0, 0.5, 0.5,
							0.0, 0.0, 0.0, 1.0);
	this.textureMatrix.multiply(this.mirrorCamera.projectionMatrix);
	this.textureMatrix.multiply(this.mirrorCamera.matrixWorldInverse);

	// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
	// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
	this.mirrorPlane.setFromNormalAndCoplanarPoint(this.normal, this.mirrorWorldPosition);
	this.mirrorPlane.applyMatrix4(this.mirrorCamera.matrixWorldInverse);

	this.clipPlane.set(this.mirrorPlane.normal.x, this.mirrorPlane.normal.y, this.mirrorPlane.normal.z, this.mirrorPlane.constant);

	var q = new THREE.Vector4();
	var projectionMatrix = this.mirrorCamera.projectionMatrix;

	q.x = (sign(this.clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
	q.y = (sign(this.clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
	q.z = -1.0;
	q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

	// Calculate the scaled plane vector
	var c = new THREE.Vector4();
	c = this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(q));

	// Replacing the third row of the projection matrix
	projectionMatrix.elements[2] = c.x;
	projectionMatrix.elements[6] = c.y;
	projectionMatrix.elements[10] = c.z + 1.0 - this.clipBias;
	projectionMatrix.elements[14] = c.w;
	
	var worldCoordinates = new THREE.Vector3();
	worldCoordinates = new THREE.Vector3().getPositionFromMatrix(this.camera.matrixWorld);
	this.eye = worldCoordinates;
	this.material.uniforms.eye.value = this.eye;
};

THREE.Water.prototype.render = function () {

	if(this.matrixNeedsUpdate)
		this.updateTextureMatrix();

	this.matrixNeedsUpdate = true;

	// Render the mirrored view of the current scene into the target texture
	if(this.scene !== undefined && this.scene instanceof THREE.Scene)
	{
        this.renderer.render(this.scene, this.mirrorCamera, this.texture, true);
	}

};

THREE.Water.prototype.renderTemp = function () {

	if(this.matrixNeedsUpdate)
		this.updateTextureMatrix();

	this.matrixNeedsUpdate = true;

	// Render the mirrored view of the current scene into the target texture
	if(this.scene !== undefined && this.scene instanceof THREE.Scene)
	{
		this.renderer.render(this.scene, this.mirrorCamera, this.tempTexture, true);
	}

};

THREE.Water.prototype.update=function() {
		this.ms_Water.material.uniforms.time.value += 1.0 / 60.0;
		//this.ms_Controls.update();
		//this.display();
	};



// shared ortho camera

THREE.EffectComposer.camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );

THREE.EffectComposer.quad = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), null );

THREE.EffectComposer.scene = new THREE.Scene();
THREE.EffectComposer.scene.add( THREE.EffectComposer.quad );


});


