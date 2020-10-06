/*
TODO przed meetingiem:
[x] renderowanie map
[x] renderowanie kulki
[x] ruszanie mapą przy użyciu myszki

---

[x] mobilny widok
[x] ruszanie z użyciem akcelerometru
[x] dodanie literek do zbierania / Unicode

*/
// import {BufferGeometryUtils} from "./BufferGeometryUtils.js";
import * as THREE from 'https://unpkg.com/three@0.121.1/build/three.module.js';
import { BufferGeometryUtils } from 'https://unpkg.com/three@0.121.1/examples/jsm/utils/BufferGeometryUtils.js';
import { LEVELS } from './levels.js';


/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

let NEXT_ITEM = 0;

var renderer, camera, ballAcc={x:0, y:0}, ballSpeed={x:0, y:0}, last_timestamp=0, sphere;
var isFalling = false, BOXES = [], scene;
var GAME_STATE = 'PLAYING', LEVEL;

function showModal(text) {
    document.querySelector('#modal .modal-inner').innerHTML = text;
    document.querySelector('#modal').classList.remove('hidden')
}

function blendColors(c1, c2, t) {
    let r1 = (c1>>16)&0xff, g1 = (c1>>8)&0xff, b1 = (c1>>0)&0xff;
    let r2 = (c2>>16)&0xff, g2 = (c2>>8)&0xff, b2 = (c2>>0)&0xff;

    let r = Math.round(r1*t + r2*(1-t)), g = Math.round(g1*t + g2*(1-t)), b = Math.round(b1*t + b2*(1-t));
    return (r<<16)|(g<<8)|(b<<0);
}

function createCollisionMap(level, scene) {
    let mapa = level.board;
    for (let y = 0; y < mapa.length; y++) {
        for (let x = 0; x < mapa[y].length; x++) {
            let geometry = new THREE.PlaneGeometry( 80, 80);

            var bitmap = document.createElement('canvas');
            var g = bitmap.getContext('2d');
            bitmap.width = 256;
            bitmap.height = 256;
            g.fillStyle = 'red';
            g.fillRect(0, 0, 256, 256);
            let imageData = g.getImageData(0,0,256,256);
            let data = imageData.data;
            let fn = TILES_COLLISION[mapa[y][x]] || ((x,y)=>false);

            for(let xx=0;xx<256;xx++)
                for(let yy=0;yy<256;yy++)
                    data[4*(xx+256*yy)+3] = 128 * fn(xx/256, yy/256) + 128;
            g.putImageData(imageData,0,0);
            // canvas contents will be used for a texture
            var texture = new THREE.Texture(bitmap);
            texture.needsUpdate = true;

            let material = new THREE.MeshBasicMaterial({
                map: texture,
                // opacity: 0.5,
                transparent: true,
            });

            let mesh = new THREE.Mesh(geometry, material);
            mesh.translateZ(80 * y);
            mesh.translateX(80 * x);
            mesh.translateY(10);
            mesh.rotation.x = -90 * Math.PI / 180;

            scene.add(mesh);
        }
    }
}
let corner = function(dx, dy){
    let a = new THREE.BoxBufferGeometry(50, 10, 20);
    a.translate(dx, 0, 0);
    let b = new THREE.BoxBufferGeometry(20, 10, 50);
    b.translate(0, 0, dy);
    return BufferGeometryUtils.mergeBufferGeometries([a, b]);
};

const TILES = {
    'x': new THREE.BoxBufferGeometry(80, 10, 80),
    '-': new THREE.BoxBufferGeometry(80, 10, 20),
    '|': new THREE.BoxBufferGeometry(20, 10, 80),
    '+': (function(){
        let a = new THREE.BoxBufferGeometry(80, 10, 20);
        let b = new THREE.BoxBufferGeometry(20, 10, 80);
        return BufferGeometryUtils.mergeBufferGeometries([a, b]);
    })(),
    'z': corner(-15, 15),
    'c': corner(15, 15),
    'q': corner(-15, -15),
    'e': corner(15, -15)
};

const TILES_COLLISION = {
    'x': (x, y) => true,
    '-': (x, y) => (3/4*0.5 <= y) && (y <= 5/4*0.5),
    '|': (x, y) => (3/4*0.5 <= x) && (x <= 5/4*0.5),
    '+': (x, y) => ((3/4*0.5 <= x) && (x <= 5/4*0.5)) || ((3/4*0.5 <= y) && (y <= 5/4*0.5)),
    ' ': (x, y) => false,
    'z': (x, y) => (x <= 5/4 * 0.5) && (3/4*0.5 <= y) && ((x >= 3/4*0.5) || (y<=5/4*0.5)),
    'c': (x, y) => (x >= 3/4 * 0.5) && (3/4*0.5 <= y) && ((x <= 5/4*0.5) || (y<=5/4*0.5)),
    'e': (x, y) => (x >= 3/4 * 0.5) && (5/4*0.5 >= y) && ((x <= 5/4*0.5) || (y>=3/4*0.5)),
    'q': (x, y) => (x <= 5/4 * 0.5) && (5/4*0.5 >= y) && ((x >= 3/4*0.5) || (y>=3/4*0.5)),
};

function createMap(level, scene) {
    let material_1 = new THREE.MeshPhongMaterial({ specular: 0x00baff, color: 0x00baff, emissive: 0x00baff, shininess: 50, });
    let material_2 = new THREE.MeshPhongMaterial({ specular: 0xba00ff, color: 0xba00ff, emissive: 0xba00ff, shininess: 50, });
    let material_final = new THREE.MeshPhongMaterial({ specular: 0xffba00, color: 0xffba00, emissive: 0xffba00, shininess: 50, });

    let mapa = level.board;
    for (let y = 0; y < mapa.length; y++) {
        for (let x = 0; x < mapa[y].length; x++) {
            let geometry;
            if (mapa[y][x] == ' ')
                continue;
            geometry = TILES[mapa[y][x]];
            let material = (x + y) % 2 ? material_1 : material_2;

            if (y == level.start[1] && x == level.start[0])
                material = material_final;

            let mesh = new THREE.Mesh(geometry, material);
            mesh.translateZ(80 * y);
            mesh.translateX(80 * x);
            // mesh.translateY(0.5 * height);
            scene.add(mesh);
        }
    }
}

function initSensor() {
    const options = { frequency: 60, referenceFrame: 'device' };
    const sensor = new RelativeOrientationSensor(options);

    Promise.all([navigator.permissions.query({ name: "accelerometer" }),
             navigator.permissions.query({ name: "gyroscope" })])
       .then(results => {
         if (results.every(result => result.state === "granted")) {
            sensor.addEventListener('reading', () => {
                // model is a Three.js object instantiated elsewhere.
                // document.querySelector('#hud').innerText = 'x='+(sensor.quaternion[0].toFixed(2))+' y='+(sensor.quaternion[1].toFixed(2))+' z='+(sensor.quaternion[2].toFixed(2));
                rotateBoard(sensor.quaternion[1], sensor.quaternion[0]);
                // alert(sensor.quaternion);
                model.quaternion.fromArray(sensor.quaternion).inverse();
            });
            sensor.addEventListener('error', error => {
                if (event.error.name == 'NotReadableError') {
                    // alert("Sensor is not available.");
                }
            });
            sensor.start();
            // alert('Everything done');
         } else {
        //    alert("No permissions to use RelativeOrientationSensor.");
         }
    });
    // alert('ok');
}

function init() {
    camera = new THREE.PerspectiveCamera(70, 1, 1, 1000);
    camera.position.y = 256;
    camera.lookAt(new THREE.Vector3( 0, 0, 0 ));

    scene = new THREE.Scene();
    var light = new THREE.DirectionalLight(0xfdfdfd, 2);
    // you set the position of the light and it shines into the origin
    light.position.set(0, 200, 10).normalize();
    scene.add(light);

    const urlParams = new URLSearchParams(window.location.search);
    const level_id = urlParams.get('level') || 'easy';
    LEVEL = LEVELS[level_id];

    createMap(LEVEL, scene);
    if(urlParams.get('collision'))
        createCollisionMap(LEVEL, scene);

    // generate background tiles
    for(let i=0;i<20;i++) {
        let dist = (Math.random()) * 200 + 100;
        let color = Math.random() < 0.5 ? 0x00baff : 0xba00ff;
        color = blendColors(color, 0x000000, 0.3 - 0.2*(dist / 300) );

        let material = new THREE.MeshPhongMaterial({ specular: color, color: color, emissive: color, shininess: 20});

        let mesh = new THREE.Mesh(TILES['x'], material);
        mesh.translateZ((2*Math.random()-1) * 500);
        mesh.translateX((2*Math.random()-1) * 500);
        mesh.translateY(-dist);
        scene.add(mesh);
    }

    //// KULKA
    let material_sphere = new THREE.MeshPhongMaterial({ specular: 0x111111, color: 0xce2140, emissive: 0x000000, shininess: 30, });
    sphere = new THREE.Mesh(
        new THREE.SphereGeometry( 20, 32, 32),
        material_sphere
    );
    sphere.position.y = 20;
    scene.add( sphere );
    //// end KULKA

    // unicody
    LEVEL.coords.forEach((coords, i) => {
        let boxMesh = createBoxWithUnicode(LEVEL.items[i]);
        boxMesh.translateY(20);
        boxMesh.translateX(80*coords[0]);
        boxMesh.translateZ(80*coords[1]);
        scene.add(boxMesh);
        BOXES.push(boxMesh);
        document.querySelector('#hud').innerHTML += '<span id="item_'+i+'">' + LEVEL.items[i] +'</div>'
    });
    // end of unicode

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setSize(512, 512);
    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);
    requestAnimationFrame(animate);
    onWindowResize();
    initSensor();
}

function onWindowResize() {
    // console.log('--------');
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
function rotateBoard(x, y) {
    ballAcc = {x: x, y: y};

    // camera.rotation.x = 0;//30*x* Math.PI / 180;
    // camera.lookAt(new THREE.Vector3( 30*y, 0, 30*x));
    camera.rotation.y = -0.2*x;
    camera.rotation.x = -0.2*y - 1.57069632679523;//0.5*Math.pi;
    // console.log(x, y);
}
function onMouseMove(event) {
    // console.log(renderer.domElement.clientX, renderer.domElement.clientY);
    // console.log(event, event.clientX, event.clientY);
    let el = renderer.domElement
    let x = 2 * (event.clientX - el.offsetLeft) / el.width - 1;
    let y = 2 * (event.clientY - el.offsetTop) / el.height - 1;
    rotateBoard(x, y);
}
function animate(timestamp) {
    let dt = (timestamp - last_timestamp)/1000.0;
    last_timestamp = timestamp;

    // console.log(dt, timestamp, last_timestamp);

    if(isFalling)
        sphere.position.y -= 400*dt;
    else {
        ballSpeed.x += 50*dt*ballAcc.x;
        ballSpeed.y += 50*dt*ballAcc.y;

        sphere.position.x += dt*ballSpeed.x;
        sphere.position.z += dt*ballSpeed.y;
    }

    let tileX = Math.floor((sphere.position.x+40)/80), tileY = Math.floor((sphere.position.z+40)/80);
    let pX = (sphere.position.x+40)/80 - tileX, pY = (sphere.position.z+40)/80 - tileY;
    if(tileX < 0 || tileY < 0 || tileY >= LEVEL.board.length || tileX >= LEVEL.board[tileY].length || !TILES_COLLISION[LEVEL.board[tileY][tileX]](pX, pY))
        isFalling = true;


    if(sphere.position.y < -1000) {
        scene.remove(sphere);
        showModal('<h1>Looser!</h1><p>You have fallen off the board!</p>');
        GAME_STATE = 'DONE';
    }

    // set camera position to ball position
    camera.position.z = sphere.position.z;
    camera.position.x = sphere.position.x;

    // rotate boxes
    BOXES.forEach((box, i) => {
        if(box) {
            box.rotation.x += 0.01;
            box.rotation.y += 0.01;
            if(Math.hypot(box.position.x - sphere.position.x, box.position.z - sphere.position.z) < 30) {
                if(i == NEXT_ITEM) {
                    scene.remove(box);
                    BOXES[i] = null;
                    NEXT_ITEM += 1;
                    document.querySelector('#item_'+i).style.color = 'yellow';
                    if(NEXT_ITEM == BOXES.length) {
                        showModal('<h1>Congratulations!</h1><p>That was brilliant 😍</p>');
                        GAME_STATE = 'DONE';
                    }
                } else {
                    showModal('<h1>Looser!</h1><p>You have confused order!</p>')
                    GAME_STATE = 'DONE';
                }
            }
        }
    });

    renderer.render(scene, camera);

    if(GAME_STATE == 'PLAYING')
        requestAnimationFrame(animate);
}

// https://stackoverflow.com/questions/12380072/threejs-render-text-in-canvas-as-texture-and-then-apply-to-a-plane
function createBoxWithUnicode(text) {
    var bitmap = document.createElement('canvas');
    var g = bitmap.getContext('2d');
    bitmap.width = 256;
    bitmap.height = 256;
    g.font = 'Bold 190px Arial';
    g.fillStyle = 'white';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'black';
    g.textAlign = "center";
    g.textBaseline = 'middle';
    g.fillText(text, 128, 128);
    // g.strokeStyle = 'red';
    // g.strokeText(text, 0, 20);

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(bitmap);
    texture.needsUpdate = true;

    let geometry = new THREE.BoxGeometry(20,20,20);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        // opacity: 0.99,
        // transparent: true,
        doubleSide: true
    });
    return new THREE.Mesh(geometry, material);
}

console.log(blendColors(0xffeedd, 0x000000, 0.1))

window.onload = function(){
    init();
}