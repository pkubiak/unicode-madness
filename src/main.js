import * as THREE from 'https://unpkg.com/three@0.121.1/build/three.module.js';
import { BufferGeometryUtils } from 'https://unpkg.com/three@0.121.1/examples/jsm/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'https://unpkg.com/three@0.121.1/examples/jsm/controls/OrbitControls.js';
import { LEVELS } from './levels.js';


let NEXT_ITEM = 0;

var renderer, camera, ballAcc={x:0, y:0}, ballSpeed={x:0, y:0}, last_timestamp=null, sphere;
var isFalling = false, BOXES = [], scene;
var GAME_STATE = 'PLAYING', LEVEL;
const SENSOR_FORCE = 1.5;
let CREATIVE_MODE = false;
let BARRIERS = new Set();

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
TILES['>'] = TILES['<'] = TILES['^'] = TILES['v'] = TILES['x'];


const TRUE = (x,y) => true;

const TILES_COLLISION = {
    'x': TRUE,
    '>': TRUE, '<': TRUE, '^': TRUE, 'v': TRUE,
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
    let material_3 = new THREE.MeshPhongMaterial({ specular: 0, color: 0xff4400, emissive: 0xff4400, shininess: 50, });
    let material_final = new THREE.MeshPhongMaterial({ specular: 0xffba00, color: 0xffba00, emissive: 0xffba00, shininess: 50, });

    let boost_materials = {};
    const dirs = '>^<v';

    for(let i=0;i<4;i++) {
        let tex = createUnicodeTexture('»');
        tex.center.x = 0.5;
        tex.center.y = 0.5;
        tex.rotation = 90 * i * (2 * Math.PI) / 360;//i * 0.5 * Math.PI;
        tex.updateMatrix();
        boost_materials[dirs[i]] = new THREE.MeshPhongMaterial({
            specular: 0x111111,
            color: 0x45FF00,
            emissive: 0x0,
            shininess: 10,
            map: tex
        })
    }

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
            if('<>^v'.indexOf(mapa[y][x]) != -1)
                material = boost_materials[mapa[y][x]];

            let mesh = new THREE.Mesh(geometry, material);
            mesh.translateZ(80 * y);
            mesh.translateX(80 * x);
            scene.add(mesh);
        }
    }

    for(let barrier of level.barriers) {
        let [dir, x, y] = barrier;

        if(dir == 'v') {
            let b = makeBarrier(material_1, material_3);
            b.translateX(-40 + x*80);
            b.translateZ(80 * y);
            scene.add(b);
            BARRIERS.add(`v_${x}_${y}`);
        }
        if(dir == 'h') {
            let b = makeBarrier(material_1, material_3);
            b.rotateY(0.5*Math.PI);
            b.translateX(40-80*y);
            b.translateZ(80*x);
            scene.add(b);
            BARRIERS.add(`h_${x}_${y}`);
        }
    }
}

function makeBarrier(material_1, material_2){
    let x = new THREE.Mesh(new THREE.BoxBufferGeometry(5, 10, 80), material_2);
    x.translateY(20);
    let y = new THREE.Mesh(new THREE.BoxBufferGeometry(3, 35, 3), material_1);
    y.translateZ(30);
    y.translateY(25-7.5-5);
    let z = new THREE.Mesh(new THREE.BoxBufferGeometry(3, 35, 3), material_1);
    z.translateZ(-30);
    z.translateY(25-7.5-5);

    let barier = new THREE.Group();
    barier.add(x);
    barier.add(y);
    barier.add(z);

    return barier;
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
    material_sphere = new THREE.MeshBasicMaterial({
        map: getCheckerboardTexture(8),
        // opacity: 0.5,
        // transparent: true,
    });

    sphere = new THREE.Mesh(
        new THREE.SphereGeometry( 20, 32, 32),
        material_sphere
    );
    sphere.position.y = 20;
    sphere.position.x = 80*LEVEL.start[0];
    sphere.position.z = 80*LEVEL.start[1];
    scene.add( sphere );
    //// end KULKA

    // unicody
    // document.querySelector('#hud').innerHTML = 'Target: ';
    LEVEL.coords.forEach((coords, i) => {
        let item = LEVEL.items[i];
        let boxMesh = createBoxWithUnicode(item);
        boxMesh.translateY(20);
        boxMesh.translateX(80*coords[0]);
        boxMesh.translateZ(80*coords[1]);
        scene.add(boxMesh);
        BOXES.push(boxMesh);
        let output = item;
        if(item.length > 1)
            output = '<img src="https://github.githubassets.com/images/icons/emoji/unicode/'+item+'.png"/>'

        document.querySelector('#hud').innerHTML += '<span id="item_'+i+'">' + output +'</div>';
    });

    // end of unicode

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setSize(512, 512);
    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);
    requestAnimationFrame(animate);
    onWindowResize();

    CREATIVE_MODE = urlParams.has('creative');
    if(CREATIVE_MODE) {
        let controls = new OrbitControls( camera, renderer.domElement );
    } else {
        initMotion();
    }
}

function initMotion() {
    if(window.DeviceOrientationEvent && 'ontouchstart' in window) {
        // device support orientation events
        window.addEventListener("deviceorientation", onDeviceOrientation, true);
    } else {
        // fallback to mouse control
        window.addEventListener('mousemove', onMouseMove, false);
    }
}

function onWindowResize() {
    // console.log('--------');
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function rotateBoard(x, y) {
    ballAcc = {x: x, y: y};

    camera.rotation.y = -0.2*x;
    camera.rotation.x = -0.2*y - 1.57069632679523;//0.5*Math.pi;
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
    if(last_timestamp === null) {
        dt = 1/60;
    }
    last_timestamp = timestamp;

    let accX = ballAcc.x, accY = ballAcc.y;
    let tileX = Math.floor((sphere.position.x+40)/80), tileY = Math.floor((sphere.position.z+40)/80);


    if(tileX >= 0 && tileY >= 0 && tileY < LEVEL.board.length && tileX < LEVEL.board[tileY].length) {
        let tile = LEVEL.board[tileY][tileX];
        if(tile == '>')accX += 3.0;
        if(tile == '<')accX -= 3.0;
        if(tile == '^')accY -= 3.0;
        if(tile == 'v')accY += 3.0;
    }

    if(!isFalling) {
        ballSpeed.x += 50*dt*accX;
        ballSpeed.y += 50*dt*accY;

        sphere.position.x += dt*ballSpeed.x;
        sphere.position.z += dt*ballSpeed.y;
    }

    let dir = new THREE.Vector3(ballSpeed.y, 0, -ballSpeed.x);
    let length = dir.length();
    dir.normalize();
    sphere.rotateOnWorldAxis(dir, 0.1*dt * length);

    let pX = (sphere.position.x+40)/80 - tileX, pY = (sphere.position.z+40)/80 - tileY;
    // console.log(tileX, tileY, pX, pY);


    if(tileX < 0 || tileY < 0 || tileY >= LEVEL.board.length || tileX >= LEVEL.board[tileY].length || !TILES_COLLISION[LEVEL.board[tileY][tileX]](pX, pY))
        isFalling = true;


    if(isFalling)
        sphere.position.y -= 400*dt;
    else {
        // check collisions with barriers
        let R = 0.26;
        let bL = (pX < R), bR = (pX > 1-R), bT = (pY < R), bB = (pY > 1-R);
        let any = false;
        const ELASTICITY = 0.4;
        let isb = (t, x, y) => BARRIERS.has(`${t}_${x}_${y}`);

        if(bL || bR || bT || bB) {
            if(bL && isb('v', tileX, tileY)) {
                sphere.position.x = 80*tileX - 40 + 80*R;
                ballSpeed.x *= -ELASTICITY;
                any = true;
            } else
            if(bR && isb('v', tileX+1, tileY)) {
                sphere.position.x = 80*tileX - 40 + 80*(1-R);
                ballSpeed.x *= -ELASTICITY;
                any = true;
            }

            if(bT && isb('h', tileX, tileY)) {
                sphere.position.z = 80*tileY - 40 + 80*R;
                ballSpeed.y *= -ELASTICITY;
                any = true;
            } else
            if(bB && isb('h', tileX, tileY+1)) {
                sphere.position.z = 80*tileY - 40 + 80*(1-R);
                ballSpeed.y *= -ELASTICITY;
                any = true;
            }

            if(!any) {
                let dist;
                if(bL && bT && (isb('v', tileX, tileY-1) || isb('h', tileX-1, tileY)) && (dist=Math.hypot(pX, pY)) < R) {
                    sphere.position.x -= 80*(R - dist) * ballSpeed.x/Math.hypot(ballSpeed.x, ballSpeed.y);
                    sphere.position.z -= 80*(R - dist) * ballSpeed.y/Math.hypot(ballSpeed.x, ballSpeed.y);

                    ballSpeed.y *= -ELASTICITY;
                    ballSpeed.x *= -ELASTICITY;
                } else
                if(bR && bT && (isb('v', tileX+1, tileY-1) || isb('h', tileX+1, tileY)) && (dist=Math.hypot(1-pX, pY)) < R) {
                    sphere.position.x -= 80*(R - dist) * ballSpeed.x/Math.hypot(ballSpeed.x, ballSpeed.y);
                    sphere.position.z -= 80*(R - dist) * ballSpeed.y/Math.hypot(ballSpeed.x, ballSpeed.y);

                    ballSpeed.y *= -ELASTICITY;
                    ballSpeed.x *= -ELASTICITY;
                } else
                if(bR && bB && (isb('v', tileX+1, tileY+1) || isb('h', tileX+1, tileY+1)) && (dist=Math.hypot(1-pX, 1-pY)) < R) {
                    sphere.position.x -= 80*(R - dist) * ballSpeed.x/Math.hypot(ballSpeed.x, ballSpeed.y);
                    sphere.position.z -= 80*(R - dist) * ballSpeed.y/Math.hypot(ballSpeed.x, ballSpeed.y);

                    ballSpeed.y *= -ELASTICITY;
                    ballSpeed.x *= -ELASTICITY;
                } else
                if(bL && bB && (isb('v', tileX, tileY+1) || isb('h', tileX-1, tileY+1)) && (dist=Math.hypot(pX, 1-pY)) < R) {
                    sphere.position.x -= 80*(R - dist) * ballSpeed.x/Math.hypot(ballSpeed.x, ballSpeed.y);
                    sphere.position.z -= 80*(R - dist) * ballSpeed.y/Math.hypot(ballSpeed.x, ballSpeed.y);

                    ballSpeed.y *= -ELASTICITY;
                    ballSpeed.x *= -ELASTICITY;
                }
            }
        }
    }

    if(sphere.position.y < -1000) {
        scene.remove(sphere);
        showModal('<h1>Looser!</h1><p>You have fallen off the board!</p>');
        GAME_STATE = 'DONE';
    }

    // set camera position to ball position
    if(!CREATIVE_MODE) {
        camera.position.z = sphere.position.z;
        camera.position.x = sphere.position.x;
    }

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
                    document.querySelector('#item_'+i).classList.add('disabled');
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

function createUnicodeTexture(text, background) {
    let texture = new THREE.Texture();
    let bitmap = document.createElement('canvas');
    let g = bitmap.getContext('2d');
    bitmap.width = 256;
    bitmap.height = 256;

    g.fillStyle = background || 'white';
    g.fillRect(0, 0, 256, 256);

    if(text.length == 1) {
        g.font = 'Bold 190px Arial';
        g.fillStyle = 'black';
        g.textAlign = "center";
        g.textBaseline = 'middle';
        g.fillText(text, 128, 128);
        texture.image = bitmap;
        texture.needsUpdate = true;
    } else {
        let manager = new THREE.LoadingManager();
        var loader = new THREE.ImageLoader( manager );
        texture = new THREE.Texture();
        loader.load('https://github.githubassets.com/images/icons/emoji/unicode/'+text+'.png', function ( image ) {
            let offset = 16;
            g.drawImage(image, offset, offset, 256-2*offset, 256-2*offset)
            texture.image = bitmap;
            texture.needsUpdate = true;
        });
    }
    return texture;
}

// https://stackoverflow.com/questions/12380072/threejs-render-text-in-canvas-as-texture-and-then-apply-to-a-plane
function createBoxWithUnicode(text) {
    let geometry = new THREE.BoxGeometry(20,20,20);
    const material = new THREE.MeshBasicMaterial({
        map: createUnicodeTexture(text),
        transparent: false,
    });
    return new THREE.Mesh(geometry, material);
}

function getCheckerboardTexture(n) {
    var bitmap = document.createElement('canvas');
    var g = bitmap.getContext('2d');
    bitmap.width = 256;
    bitmap.height = 256;
    g.fillStyle = 'white';
    g.fillRect(0, 0, 256, 256);
    let dd = 256/n;
    g.fillStyle = 'black';
    for(let x=0;x<n;x++)
        for(let y=0;y<n;y++)
            if((x+y)%2)
                g.fillRect(x*dd,y*dd,dd,dd);

    let texture = new THREE.Texture(bitmap);
    texture.needsUpdate = true;
    return texture;
}


window.onload = init;


function onDeviceOrientation(event){
    // document.querySelector('#hud').innerHTML = event.absolute + '<br/>'+Math.round(event.alpha, 2)+'<br/>'+Math.round(event.beta,2)+'<br/>'+Math.round(event.gamma,2);
    rotateBoard(SENSOR_FORCE * event.gamma / 90, SENSOR_FORCE * event.beta / 90);
}

