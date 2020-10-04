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
const mapa = [
"X  xxx",
"xx   x",
" xxx x",
"  x  x",
"xxxxxx",
];

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

let ITEMS = ['🌣', '😃', '🎔', '🎩', '🐈']
const RIDDLE = [
    [3, 2],
    [3, 0],
    [1, 1],
    [0, 4],
    [5, 4]
];
let NEXT_ITEM = 0;

var renderer, camera, ballAcc={x:0, y:0}, ballSpeed={x:0, y:0}, last_timestamp=0, sphere;
var isFalling = false, BOXES = [];
var GAME_STATE = 'PLAYING';

function showModal(text) {
    document.querySelector('#modal .modal-inner').innerHTML = text;
    document.querySelector('#modal').classList.remove('hidden')
}

function init() {
    camera = new THREE.PerspectiveCamera(70, 1, 1, 1000);
    camera.position.z = 0;
    camera.position.x = 0
    camera.position.y = 256;
    camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    console.log('>>>>', camera.rotation);
    scene = new THREE.Scene();
    var light = new THREE.DirectionalLight(0xfdfdfd, 2);
    // you set the position of the light and it shines into the origin
    light.position.set(0, 200, 10).normalize();
    scene.add(light);
    //var texture = new THREE.TextureLoader().load('textures/cosmo2.jpg');
    //scene.background = texture;
    var geometry_1 = new THREE.BoxBufferGeometry(80, 10, 80);
    var geometry_2 = new THREE.BoxBufferGeometry(80, 60, 80);
    // var material = new THREE.MeshBasicMaterial( { map: texture } );

    let material_1 = new THREE.MeshPhongMaterial({ specular: 0x00baff, color: 0x00baff, emissive: 0x00baff, shininess: 50, });
    let material_2 = new THREE.MeshPhongMaterial({ specular: 0xba00ff, color: 0xba00ff, emissive: 0xba00ff, shininess: 50, });

    let material_final = new THREE.MeshPhongMaterial({ specular: 0xffba00, color: 0xffba00, emissive: 0xffba00, shininess: 50, });

    let geometry, height;
    for (let y = 0; y < mapa.length; y++) {
        for (let x = 0; x < mapa[y].length; x++) {
            if (mapa[y][x] == ' ')
                continue;
            // if (mapa[y][x] == 'x')
            geometry = geometry_1;
            let material = (x + y) % 2 ? material_1 : material_2;

            if (mapa[y][x] == 'X')
                material = material_final;
            mesh = new THREE.Mesh(geometry, material);
            mesh.translateZ(80 * y);
            mesh.translateX(80 * x);
            // geometry.computeBoundingBox().getSize
            // if (mapa[y][x] == 'x')
            height = 10;
            // else
            //     height = 60;
            mesh.translateY(0.5 * height);
            scene.add(mesh);
            }
    }
    
    for(let i=0;i<50;i++) {
        mesh = new THREE.Mesh(geometry_1, Math.random() < 0.5 ? material_1 : material_2);
        mesh.translateZ((2*Math.random()-1) * 1500);
        mesh.translateX((2*Math.random()-1) * 1500);
        let dist = (Math.random()) * 400 + 100;
        mesh.translateY(-dist);
        // mesh.material.opacity = 0.1;
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
    shuffle(ITEMS);
    shuffle(RIDDLE);

    RIDDLE.forEach((box, i) => {
        boxMesh = createBoxWithUnicode(ITEMS[i]);
        boxMesh.translateY(20);
        boxMesh.translateX(80*box[0]);
        boxMesh.translateZ(80*box[1]);
        scene.add(boxMesh);
        BOXES.push(boxMesh);
        document.querySelector('#hud').innerHTML += '<span id="item_'+i+'">' + ITEMS[i] +'</div>'
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
}

function onWindowResize() {
    // console.log('--------');
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    // console.log(renderer.domElement.clientX, renderer.domElement.clientY);
    // console.log(event, event.clientX, event.clientY);
    let el = renderer.domElement
    let x = 2 * (event.clientX - el.offsetLeft) / el.width - 1;
    let y = 2 * (event.clientY - el.offsetTop) / el.height - 1;

    ballAcc = {x: x, y: y};

    // camera.rotation.x = 0;//30*x* Math.PI / 180;
    // camera.lookAt(new THREE.Vector3( 30*y, 0, 30*x));
    camera.rotation.y = -0.2*x;
    camera.rotation.x = -0.2*y - 1.57069632679523;//0.5*Math.pi;
    // console.log(x, y);
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
    // console.log(sphere.position.x, sphere.position.z, sphere.position.y);

    // console.log(sphere.position.x, sphere.position.z);
    let tileX = Math.floor((sphere.position.x+40)/80), tileY = Math.floor((sphere.position.z+40)/80);
    if(tileX < 0 || tileY < 0 || tileY >= mapa.length || tileX >= mapa[tileY].length || mapa[tileY][tileX] == ' ')
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
        map: texture
    });
    return new THREE.Mesh(geometry, material);
}