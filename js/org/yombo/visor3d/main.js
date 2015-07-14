
//-----------------------------------------------------
// User parameters

// Interpupillar distance for anaglyph view
var interpupillarDistance = 0.068;

// Price settings
var eurosPerCC = 1;
var baseEuros = 15;

// Maximum printing volume
var printMinX = -30;
var printMaxX = 30;
var printMinY = 0;
var printMaxY = 45;
var printMinZ = -30;
var printMaxZ = 30;
var printSizeX = printMaxX - printMinX;
var printSizeY = printMaxY - printMinY;
var printSizeZ = printMaxZ - printMinZ;

// Object Y Offset
var offsetYObject = 0.0001;

// Colors
var textColor = 0x000000;

var backGroundColor = 0xc8c8c8;

var bboxColor = 0xff0000;

// Default material for objects
var materialDefault = new THREE.MeshPhongMaterial( { color: 0x3090ea, specular: 0xffffff, shininess: 100, side: THREE.DoubleSide } );

//-----------------------------------------------------









// Check for WebGL
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


// Check for the various File API support.
if ( ! ( window.File && window.FileReader && window.FileList ) ) {
  alert( 'The File APIs are not fully supported in this browser, sorry :(' );
}

var container, stats;

var camera, cameraTarget, scene, renderer, controls;

var ground;

var bbox;
var sizeX;
var sizeY;
var sizeZ;

var maxDistance = 80;

var petAddObjectScene = false;
var objectToAdd = null;
var distCamObject = 1;
var currentObject = null;

//var volumeBtn;
//var petComputeVolume = false;

var volumeLabel;

var raycaster;

var textLines = [];

var leftCamera, rightCamera;
var leftRT, rightRT;
var resScreenX = 0, resScreenY = 0;

var anaglyphEnabled = false;
var petEnableAnaglyph = false;
var petDisableAnaglyph = false;

var petEnableBBoxView = false;
var petDisableBBoxView = false;

var anaglyphCamera, anaglyphShaderMaterial, anaglyphScene;

var checkBBox;
var boundingBoxLines = null;

var vec3Aux = new THREE.Vector3();

init();
animate();

function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.01, maxDistance );
    camera.position.set( -0.3, 0.4, 0.6 );
    scene.add( camera );

    leftCamera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.01, maxDistance );
    leftCamera.position.set( - interpupillarDistance * 0.5, 0, 0 );
    camera.add( leftCamera );

    rightCamera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.01, maxDistance );
    rightCamera.position.set( interpupillarDistance * 0.5, 0, 0 );
    camera.add( rightCamera );

    controls = new THREE.OrbitControls( camera );
    controls.damping = 0.2;
    controls.addEventListener( 'change', render );

    cameraTarget = new THREE.Vector3( 0, 0, 0 );
    camera.lookAt( cameraTarget );

    // Ground
    var shaderMaterialGround = new THREE.ShaderMaterial( {
        uniforms: {
        },
        vertexShader: textVertexShaderMaterialGround,
        fragmentShader: textFragmentShaderMaterialGround
        //side: THREE.DoubleSide
    } );

    ground = new THREE.Mesh( new THREE.PlaneBufferGeometry( 10, 10 ), shaderMaterialGround );
    ground.rotation.x = -Math.PI/2;
    scene.add( ground );

    ground.receiveShadow = true;

    // Lights

    scene.add( new THREE.AmbientLight( 0x333333 ) );

    addShadowedLight( 0.7, 1, 1, 0xffffff, 1 );
    addShadowedLight( -0.5, 1, -1, 0xffffff, 0.65 );


    raycaster = new THREE.Raycaster();



    // renderer

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( backGroundColor /*scene.fog.color*/ );
    renderer.setPixelRatio( window.devicePixelRatio );

    onWindowResize();

    //renderer.gammaInput = true;
    //renderer.gammaOutput = true;

    renderer.shadowMapEnabled = true;
    //renderer.shadowMapCullFace = THREE.CullFaceBack;

    container.appendChild( renderer.domElement );


    // Anaglyph scene
    anaglyphScene = new THREE.Scene();

    anaglyphShaderMaterial = new THREE.ShaderMaterial( {
        uniforms: {
            leftTexture: { type: "t", value: leftRT },
            rightTexture: { type: "t", value: rightRT },
        },
        vertexShader: textVertexShaderAnaglyph,
        fragmentShader: textFragmentShaderAnaglyph,
        side: THREE.DoubleSide
    } );

    var geomAnaglyph = new THREE.PlaneBufferGeometry( 2, 2, 1, 1 );
    var anaglyph = new THREE.Mesh( geomAnaglyph, anaglyphShaderMaterial );
    anaglyphScene.add( anaglyph );

    anaglyphCamera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0.1, 1000 );
    anaglyphCamera.position.z = 1;

/*
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );
*/

    // Setup event handlers:

    // Resize event
    window.addEventListener( 'resize', onWindowResize, false );

    // Manual 3d model file load event
    document.getElementById( 'files' ).addEventListener( 'change', handleFileSelect, false );

    // Drag and drop 3d model event
    var dropZone = document.getElementById( 'drop_zone' );
    dropZone.addEventListener( 'dragover', handleDragOver, false );
    dropZone.addEventListener( 'drop', handleDropIn, false );

    // Compute volume button
    /*
    volumeBtn = document.getElementById( 'computeVolumeBtn' );
    volumeBtn.addEventListener( 'click', function( evt ) {
        petComputeVolume = true;
    }, false );
    */

    // Anaglyph view checkbox
    var checkAnaglyph = document.getElementById( 'checkAnaglyph' );
    checkAnaglyph.addEventListener( 'change', function( evt ) {
            if ( checkAnaglyph.checked ) {
                petEnableAnaglyph = true;
            }
            else {
                petDisableAnaglyph = true;
            }
        }, false );

    // Bounding Box view checkbox
    checkBBox = document.getElementById( 'checkBBox' );
    checkBBox.addEventListener( 'change', function( evt ) {
            if ( currentObject == null ) {
                return;
            }
            if ( checkBBox.checked ) {
                petEnableBBoxView = true;
            }
            else {
                petDisableBBoxView = true;
            }
        }, false );

}

function handleFileSelect( evt ) {

    // FileList object
    var files = evt.target.files;

    loadFile( files[ 0 ] );

}

function handleDropIn( evt ) {

    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.

    loadFile( files[ 0 ] );

    // files is a FileList of File objects. List some properties.
/*
    for (var i = 0, f; f = files[i]; i++) {
        output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
                  f.size, ' bytes, last modified: ',
                  f.lastModifiedDate.toLocaleDateString(), '</li>');
    }
*/
}

function handleDragOver( evt ) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function loadFile( file ) {
    var lower = file.name.toLowerCase();
    if ( lower.endsWith( '.stl' ) ) {
        return loadSTLFile( file );
    }
    else if ( lower.endsWith( '.dae' ) ) {
        return loadDAEFile( file );
    }
    else {
        alert( "Unrecognized file type: " + file.name );
    }
}

function loadSTLFile( file ) {

    var reader = new FileReader();

    reader.onload = function( e ) {

        var loader = new THREE.STLLoader();

        var geometry = loader.parse( e.target.result );

        var mesh = new THREE.Mesh( geometry, materialDefault );

        prepareObject( mesh, true );

    };

    reader.readAsBinaryString( file );
}

function loadDAEFile( file ) {

    var reader = new FileReader();

    reader.onload = function( e ) {

        var loader = new THREE.ColladaLoader();
        //loader.options.convertUpAxis = true;
        var xmlParser = new DOMParser();
        var responseXML = xmlParser.parseFromString( e.target.result, "application/xml" );
        var dae = loader.parse( responseXML, undefined, undefined );

        // Sets default material
        dae.scene.traverse( function ( child ) {
            if ( child instanceof THREE.Mesh ) {
                child.material = materialDefault;
                child.castShadow = true;
                child.receiveShadow = false;
            }
        } );

        prepareObject( dae.scene, false );
    };

    reader.readAsText( file );
}

function prepareObject( object, doScale ) {

    var scale = 1;
    if ( doScale ) {
        scale = 0.001; // mm -> m
        object.scale.set( scale, scale, scale );
    }
    else {
        scale = object.scale.x;
    }

    bbox = new THREE.Box3();
    bbox.setFromObject( object );

    sizeX = bbox.max.x - bbox.min.x;
    sizeY = bbox.max.y - bbox.min.y;
    sizeZ = bbox.max.z - bbox.min.z;

    var x2 = ( bbox.min.x + bbox.max.x ) * 0.5;
    var z2 = ( bbox.min.y + bbox.max.y ) * 0.5;
    var yFloor = bbox.min.z;
    object.position.set( - x2, - yFloor + offsetYObject, z2 );
    object.rotation.set( - Math.PI / 2, 0, 0 );

    var mx = Math.abs( bbox.max.x - bbox.min.x );
    var mz = Math.abs( bbox.max.y - bbox.min.y );
    var scDist = 3;
    distCamObject = mz * scDist;// * scale;

    object.castShadow = true;
    object.receiveShadow = false;

    addObjectToScene( object );

    // Volume in cc
    var volume = sizeX * sizeY * sizeZ / 0.000001;

    var price = baseEuros + volume * eurosPerCC;

    var sx = numberDigits( sizeX / 0.01, 2 );
    var sy = numberDigits( sizeY / 0.01, 2 );
    var sz = numberDigits( sizeZ / 0.01, 2 );

    addTextToScene( volume, sx, sy, sz, price );

    bbox.setFromObject( object );

    if ( checkBBox.checked ) {
        petEnableBBoxView = true;
    }
}

function numberDigits( number, decimalDigits ) {
    var b = Math.pow( 10, decimalDigits );
    var n = Math.round( number * b );
    return n / b;
}

function addObjectToScene( object ) {
    if ( ! petAddObjectScene ) {
        petAddObjectScene = true;
        objectToAdd = object;
    }
}

function computeObjectVolume( scene, bbox ) {

    // Compute volume divided in mm
    var compUnit = 0.001;

    // Margin for "leaving space for the rays to collide" :)
    var margin = 2 * compUnit;

    var originX = bbox.min.x - margin;
    var originY = bbox.min.y - margin;
    var originZ = bbox.min.z - margin;

    var maxX = bbox.max.x + margin;
    var maxY = bbox.max.y + margin;
    var maxZ = bbox.max.z + margin;

    var origin = new THREE.Vector3();
    var direction = new THREE.Vector3( 0, 0, 1 );

    origin.z = originZ - sizeZ * 0.5;

    var numRays = 0;
    var volume = 0;
    var compUnitInv = 1 / compUnit;
    for ( var y = originY; y < maxY; y += compUnit ) {
        origin.y = y;
        for ( var x = originX; x < maxX; x += compUnit ) {

            origin.x = x;
            raycaster.set( origin, direction );
            var intersects = raycaster.intersectObjects( scene.children );


            for ( var i = 0, il = intersects.length; i < il - 1; i+=2 ) {
                var d = intersects[ i + 1 ].distance - intersects[ i ].distance;
                volume += d * compUnitInv;
            }

            numRays++;
        }
    }

    return volume;

}

function addTextToScene( volume, sizeX, sizeY, sizeZ, price ) {

    // Removes previous text
    for ( var i = 0, il = textLines.length; i < il; i++ ) {
        camera.remove( textLines[ i ] );
    }
    textLines = [];

    var textVolume = "Object volume: " + numberDigits( volume, 2 ) + " cm³";
    var textBbox = "b. box: (" + sizeX + ", " + sizeY + ", " + sizeZ + ") cm";
    var textPrice = "Orientative price: " + numberDigits( price, 2 ) + " euro";

    createText( textVolume, textColor, false, false, 0.5, -3 );
    createText( textBbox, textColor, false, false, 0.4, -4 );
    createText( textPrice, textColor, false, false, 0.4, -5 );

}

function createText( text, color, bold, italics, ySize, yPosition ) {

    var parameters = {
        size: ySize,
        height: 0.05,
        //height: 0.05,
        //curveSegments: 4,
        font: "optimer",
        weight: bold? "bold" : "normal",
        style: italics? "italics" : "normal",
    };

    var textShape = THREE.FontUtils.generateShapes( text, parameters );
    var textGeometry = new THREE.ShapeGeometry( textShape );

    //var textGeometry = new THREE.TextGeometry( text, parameters );

    textGeometry.computeBoundingBox();
    textGeometry.computeVertexNormals();

    var x = - ( textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x ) * 0.5;
    var textMaterial1 = new THREE.MeshBasicMaterial( { color: color/*, side: THREE.DoubleSide*/ } );
    var textMesh = new THREE.Mesh( textGeometry, textMaterial1 );
    textMesh.scale.set( 0.001, 0.001, 0.001 );
    textMesh.position.set( x * 0.001, yPosition * 0.001, - 20 * 0.001 );
    camera.add( textMesh );

    textLines.push( textMesh );

}

function createBBoxHelper() {

    if ( boundingBoxLines != null ) {
        scene.remove( boundingBoxLines );
    }

    var x0 = bbox.min.x;
    var x1 = bbox.max.x;
    var y0 = bbox.min.y;
    var y1 = bbox.max.y;
    var z0 = bbox.min.z;
    var z1 = bbox.max.z;

    var geometry = new THREE.Geometry();
    geometry.vertices.push( new THREE.Vector3( x0, y0, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y0, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x0, y1, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y1, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x0, y0, z1 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y0, z1 ) );
    geometry.vertices.push( new THREE.Vector3( x0, y1, z1 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y1, z1 ) );

    geometry.vertices.push( new THREE.Vector3( x0, y0, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x0, y1, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y0, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y1, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x0, y0, z1 ) );
    geometry.vertices.push( new THREE.Vector3( x0, y1, z1 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y0, z1 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y1, z1 ) );

    geometry.vertices.push( new THREE.Vector3( x0, y0, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x0, y0, z1 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y0, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y0, z1 ) );
    geometry.vertices.push( new THREE.Vector3( x0, y1, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x0, y1, z1 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y1, z0 ) );
    geometry.vertices.push( new THREE.Vector3( x1, y1, z1 ) );


    var material = new THREE.LineBasicMaterial( { color: bboxColor } );
    boundingBoxLines = new THREE.Line( geometry, material, THREE.LinePieces );

    scene.add( boundingBoxLines );
}

function addShadowedLight( x, y, z, color, intensity ) {

    var directionalLight = new THREE.DirectionalLight( color, intensity );
    directionalLight.position.set( x, y, z );
    scene.add( directionalLight );

/*
    directionalLight.castShadow = true;
    // directionalLight.shadowCameraVisible = true;


    var d = 1;
    directionalLight.shadowCameraLeft = -d;
    directionalLight.shadowCameraRight = d;
    directionalLight.shadowCameraTop = d;
    directionalLight.shadowCameraBottom = -d;

    directionalLight.shadowCameraNear = 1;
    directionalLight.shadowCameraFar = 4;

    directionalLight.shadowMapWidth = 1024;
    directionalLight.shadowMapHeight = 1024;

    directionalLight.shadowBias = -0.005;
    directionalLight.shadowDarkness = 0.15;
*/

}

function setTextureFilters( texture, filters ) {
    // filters is true or false
    if ( ! filters ) {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
    }
    else {
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
    }
}

function onWindowResize() {

    var inited = resScreenX > 0;
    var resChange = ( resScreenX !== window.innerWidth ) || ( resScreenY !== window.innerHeight );

    resScreenX = window.innerWidth;
    resScreenY = window.innerHeight;
    var aspect = resScreenX / resScreenY;

    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    leftCamera.aspect = aspect;
    leftCamera.updateProjectionMatrix();

    rightCamera.aspect = aspect;
    rightCamera.updateProjectionMatrix();

    renderer.setSize( resScreenX, resScreenY );

    if ( resChange ) {
        leftRT = createRenderTarget( resScreenX, resScreenY );
        rightRT = createRenderTarget( resScreenX, resScreenY );

        if ( inited ) {
            anaglyphShaderMaterial.uniforms.leftTexture.value = leftRT;
            anaglyphShaderMaterial.uniforms.rightTexture.value = rightRT;
        }
    }

}

function createRenderTarget( resX, resY ) {
    return new THREE.WebGLRenderTarget( resX, resY, { magFilter: THREE.NearestFilter,
                                                      minFilter: THREE.NearestFilter,
                                                      type: THREE.UnsignedByteType,
                                                      depthBuffer: true,
                                                      stencilBuffer: false,
                                                      generateMipmaps: false
                                                    } );
}

function animate() {

    requestAnimationFrame( animate );

    render();

//    stats.update();

    controls.update();

}

function render() {

    if ( petAddObjectScene ) {
        if ( currentObject != null ) {
            scene.remove( currentObject );
        }
        scene.add( objectToAdd );
        currentObject = objectToAdd;
        petAddObjectScene = false;

        camera.position.set( - distCamObject * 0.3, distCamObject, distCamObject * 1.5 );
        camera.lookAt( cameraTarget );
    }

    /*
    if ( petComputeVolume ) {
        petComputeVolume = false;
        scene.remove( ground );
        volumeLabel.innerHTML = "Calculating...";
        var volume = computeObjectVolume( scene, bbox );
        scene.add( ground );

        var price = baseEuros + volume * eurosPerMM3;

        volumeLabel.innerHTML = "Object volume: " + volume + " mm³ (bbox:" + sizeX / 0.001 + ", " + sizeY / 0.001 + ", " + sizeZ / 0.001 + "), Approx. price: " + price + "€";

    }
    */

    if ( petEnableAnaglyph ) {
        anaglyphEnabled = true;
        controls.noPan = true;
        controls.noZoom = true;
        controls.target.set( 0, 0, 0 );
        petEnableAnaglyph = false;
    }
    if ( petDisableAnaglyph ) {
        anaglyphEnabled = false;
        controls.noPan = false;
        controls.noZoom = false;
        petDisableAnaglyph = false;
    }

    if ( petEnableBBoxView ) {
        createBBoxHelper();
        petEnableBBoxView = false;
    }
    if ( petDisableBBoxView && boundingBoxLines != null ) {
        scene.remove( boundingBoxLines );
        boundingBoxLines = null;
        petDisableBBoxView = false;
    }

    if ( ! anaglyphEnabled ) {
        renderer.render( scene, camera );
    }
    else {

        vec3Aux.set( 0, 0, 0 );
        var l = leftCamera.localToWorld( vec3Aux ).length();
        var l2 = camera.position.length();
        var angle = Math.acos( l2 / l );
        leftCamera.rotation.y = - angle;
        rightCamera.rotation.y = angle;

        renderer.render(  scene, leftCamera, leftRT, false );
        renderer.render(  scene, rightCamera, rightRT, false );
        renderer.render(  anaglyphScene, anaglyphCamera );
    }

}
