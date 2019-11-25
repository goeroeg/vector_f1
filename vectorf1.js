
import * as THREE from './node_modules/three/build/three.module.js';
import { GUI } from './node_modules/three/examples/jsm/libs/dat.gui.module.js';
import { MapControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';


var camera, controls, scene, renderer, raycaster, INTERSECTED;

var mouse = new THREE.Vector2();

const pixPerMm = 5.906;

var pageSizes = { A0:{mmX:841, mmY:1189}, 
                  A1:{mmX:594, mmY:841},
                  A2:{mmX:420, mmY:594},
                  A3:{mmX:297, mmY:420},
                  A4:{mmX:210, mmY:297},
                  A5:{mmX:148, mmY:210}}

var pageSize = pageSizes.A5;

var nodes = [];
var nodeMeshMap = new Map();

initNodes();

init();
    
initScene();


//render(); // remove when using next line for animation loop (requestAnimationFrame)
animate();

function init() {
    

    
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 5000 );
    camera.up = new THREE.Vector3(0, 0, 1);
    camera.position.set(pageSize.mmX / 2 * pixPerMm, 0, pageSize.mmX );
    
    raycaster = new THREE.Raycaster();

    // controls
    controls = new MapControls( camera, renderer.domElement );    
    //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 100;
    controls.maxDistance = 2500;
    controls.maxPolarAngle = Math.PI / 2;

    //
    window.addEventListener( 'resize', onWindowResize, false );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );

    var gui = new GUI();
    gui.add( controls, 'screenSpacePanning' );
}

function initScene() {

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xcccccc );

    // world
    //var geometry = new THREE.PlaneGeometry( 200, 200 );
    //geometry.rotateX(Math.PI / 2);

    var geometry = new THREE.BoxBufferGeometry(pageSize.mmX * pixPerMm, pageSize.mmY * pixPerMm, 1);
    var texture = initTexture(64, 0.5, pageSize.mmX / 10, pageSize.mmY / 10);
    var material = new THREE.MeshBasicMaterial({ map: texture });
    var paperMesh = new THREE.Mesh(geometry, material);
    scene.add(paperMesh);

    var nodeSize = 5/3 * pixPerMm;

    var nodeGeo = new THREE.CylinderBufferGeometry(nodeSize, nodeSize, 3, 24);
    nodeGeo.rotateX(Math.PI /2);
    var nodeMaterial = new THREE.MeshPhongMaterial({color: 0x000000, transparent:true, opacity:0.0})
    
    for (let node of nodes)
    {
        var nodeMesh = new THREE.Mesh(nodeGeo, nodeMaterial.clone());
        nodeMesh.material.color.setHex(node.color);
        nodeMesh.position.x = node.x * pixPerMm;
        nodeMesh.position.y = node.y * pixPerMm;

        nodeMesh.node = node;        
        nodeMeshMap.set(node, nodeMesh);

        scene.add(nodeMesh);
    }


    // lights
    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1);
    scene.add(light);
    var light = new THREE.DirectionalLight(0x002288);
    light.position.set(-1, -1, -1);
    scene.add(light);
    var light = new THREE.AmbientLight(0x222222);
    scene.add(light);
}

function initTexture(size, lineWidth, cmX, cmY) {
    var ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = size;
    ctx.canvas.height = size;
    ctx.fillStyle = '#eeeeee';
    ctx.strokeStyle = '#0000aa';

    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.lineWidth = lineWidth;

    var lines = [[[size/2, 0], [size/2, size]], 
                 [[0, size/2], [size, size/2]],
                 [[0, size-1], [size, size-1]],
                 [[size-1, 0], [size-1, size]]];

    for (let line of lines)
    {
        ctx.beginPath();
        ctx.moveTo(line[0][0], line[0][1]);
        ctx.lineTo(line[1][0], line[1][1]);
        ctx.stroke();
    }
    
    var texture = new THREE.CanvasTexture(ctx.canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(cmX, cmY);
    return texture;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseMove( event ) {
    event.preventDefault();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function animate() {
    requestAnimationFrame( animate );
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    render();
}

function render() {
    checkIntersect();
    renderer.render( scene, camera );
}

function checkIntersect(){
    raycaster.setFromCamera( mouse, camera );
    var intersects = raycaster.intersectObjects( scene.children );
    if ( intersects.length > 0 ) {
        if ( INTERSECTED != intersects[0].object ) {
            resetIntersect();

            if (intersects[0].object.node){
                INTERSECTED = intersects[0].object;
                INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
                INTERSECTED.material.emissive.setHex( 0xff0000 );
                INTERSECTED.material.opacity = 0.5;
                for (let neighbor of INTERSECTED.node.neighbors)
                {
                    var neighborMesh = nodeMeshMap.get(neighbor);
                    neighborMesh.material.emissive.setHex(0x0000ff);
                    neighborMesh.material.opacity = 0.5;
                }
            }
        }
    } else {
        resetIntersect();
    }
}

function resetIntersect() {
    if (INTERSECTED) {
        INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
        INTERSECTED.material.opacity = 0;
        for (let neighbor of INTERSECTED.node.neighbors) {
            var neighborMesh = nodeMeshMap.get(neighbor);
            neighborMesh.material.emissive.setHex(0x000000);
            neighborMesh.material.opacity = 0;
        }
    }
    INTERSECTED = null;
}

function initNodes()
{
    for (var x = -pageSize.mmX / 2 + 5; x < pageSize.mmX / 2; x+=5) {
        for (var y = -pageSize.mmY / 2 + 5; y < pageSize.mmY / 2; y+=5) {
            nodes.push({ x: x, y: y, color: 0x00aa00 })
        } 
    } 

    // not very effective but works
    for (let node of nodes)
    {
        node.neighbors = [];
        for (let anotherNode of nodes)
        {
            if (anotherNode != node && Math.abs(anotherNode.x - node.x) < 6 && Math.abs(anotherNode.y - node.y) < 6)
            {
                node.neighbors.push(anotherNode);
            }
        }
        if (node.neighbors.length > 8 || node.neighbors.length < 3) 
        {
            console.log(node);
        }
    }

}
		