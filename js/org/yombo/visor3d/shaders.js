//
// Shaders
//

var textVertexShaderMaterialGround = String.raw`

    varying vec3 worldPosInterp;

    void main() {

        worldPosInterp = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }

 `; // Fin de shader

var textFragmentShaderMaterialGround = String.raw`

    const float grid1Fraction = 0.015 * 0.1;
    const float grid2Fraction = 0.08 * 0.01;

    const vec3 groundColor = vec3( 200.0 / 255.0, 200.0 / 255.0, 200.0 / 255.0 );
    const vec3 gridColor = vec3( 255.0 / 255.0, 255.0 / 255.0, 255.0 / 255.0 );

    varying vec3 worldPosInterp;

    void main() {

        float grid1 = ( mod( worldPosInterp.x, 0.1 ) < grid1Fraction ) || ( mod( worldPosInterp.z, 0.1 ) < grid1Fraction ) ? 1.0 : 0.0;
        float grid2 = ( mod( worldPosInterp.x, 0.01 ) < grid2Fraction ) || ( mod( worldPosInterp.z, 0.01 ) < grid2Fraction ) ? 1.0 : 0.0;

        float grid = max( grid1, grid2 );

        float attenuationFactor = max( 0.0, 1.0 - ( length( worldPosInterp - cameraPosition ) / 0.8 ) );

        grid *= attenuationFactor;

        gl_FragColor = vec4( mix( groundColor, gridColor, grid ), 1 );
    }

 `; // Fin de shader

var textVertexShaderAnaglyph = String.raw`

    varying vec2 uvInterp;

    void main() {

        uvInterp = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }

 `; // Fin de shader

var textFragmentShaderAnaglyph = String.raw`

    uniform sampler2D leftTexture;
    uniform sampler2D rightTexture;

    varying vec2 uvInterp;

    void main() {

        vec4 leftColor = texture2D( leftTexture, uvInterp );
        vec4 rightColor = texture2D( rightTexture, uvInterp );

        gl_FragColor = vec4( leftColor.r, rightColor.g, rightColor.b,  1.0 );
    }

 `; // Fin de shader
