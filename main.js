import * as THREE from './build/three.module.js';

import Stats from './jsm/stats.module.js';

import { OrbitControls } from './jsm/OrbitControls.js';
import { GLTFLoader } from './jsm/GLTFLoader.js';
import { DRACOLoader } from './jsm/DRACOLoader.js';

let stats, controls;
let renderer, scene, camera;
let clock = new THREE.Clock();

let mouse = new THREE.Vector2(),
  INTERSECTED;
let raycaster;
let model;
let pressed = false;

let mixer, clipAction, clipAction2;

let knobAClicked = false;
let knobARawValue = 50.0;
let knobAMax = 100.0;
let knobAMin = 0.0;
let knobA;
let knobPrevVal;
let text2;

let knobBClicked = false;
let knobBRawValue = 0.0;
let knobBMax = 100.0;
let knobBMin = 0.0;
let knobB;
let knobBNotches = 5;
let prevNotch = 0;
let text3;
let text4;

init();
animate();

function init() {
  const container = document.querySelector('#container');
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.physicallyCorrectLights = true;
  renderer.renderReverseSided = true;

  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  // camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    90
  );
  camera.position.set(0, 1.2, 0);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  // scene.fog = new THREE.Fog(0xffffff, 15, 52);
  // scene.fog = new THREE.FogExp2(0xffffff, 0.03);

  let light = new THREE.HemisphereLight(0xafafaf, 0x101010, 1.0); // sky color, ground color, intensity
  light.position.set(0, 8, 0);
  scene.add(light);

  light = new THREE.DirectionalLight(0xb59fa0);
  light.intensity = 2;
  light.position.set(-3, 8, 2);
  light.target.position.set(0, 0, 0);
  light.castShadow = true;

  light.shadow.bias = -0.0001;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 0.01;
  light.shadow.camera.far = 20;
  light.shadow.radius = 2;
  light.decay = 2;

  light.shadow.camera.left = -1;
  light.shadow.camera.bottom = -1;
  light.shadow.camera.top = 1;
  light.shadow.camera.right = 1;

  scene.add(light);
  // scene.add(light.target);

  let floorTex = [
    new THREE.TextureLoader().load('mat/plastic_grain_Base_Color.jpg'),
    new THREE.TextureLoader().load('mat/plastic_grain_Metallic.jpg'),
    new THREE.TextureLoader().load('mat/plastic_grain_Normal.jpg'),
    new THREE.TextureLoader().load('mat/plastic_grain_Roughness.jpg')
  ];

  floorTex.forEach(i => {
    i.wrapS = THREE.RepeatWrapping;
    i.wrapT = THREE.RepeatWrapping;
    i.repeat.set(4, 4);
  });

  let deskMat = new THREE.MeshStandardMaterial({
    map: floorTex[0],
    metalnessMap: floorTex[1],
    normalMap: floorTex[2],
    roughnessMap: floorTex[3],
    color: 0x404040
  });

  let knobMat = new THREE.MeshStandardMaterial({
    color: 0xff6892,
    metalness: 0,
    roughness: 0.2
  });

  // ground
  // let ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(20, 20), deskMat);
  // ground.rotation.x = -Math.PI / 2;
  // scene.add(ground);
  // ground.receiveShadow = true;

  let gltfLoader = new GLTFLoader();

  let positionKF = new THREE.VectorKeyframeTrack(
    '.position',
    [0, 0.1],
    [0, 0, 0, 0, -0.1, 0]
  );
  let releasePositionKF = new THREE.VectorKeyframeTrack(
    '.position',
    [0, 0.05],
    [0, 0, 0, 0, 0.1, 0]
  );

  let colorKF = new THREE.ColorKeyframeTrack(
    '.material.color',
    [0, 1, 2],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    THREE.InterpolateDiscrete
  );

  // create an animation sequence with the tracks
  //
  let clip = new THREE.AnimationClip('Action', 0.1, [positionKF]);
  let clip2 = new THREE.AnimationClip('Action2', 0.05, [releasePositionKF]);

  gltfLoader.load('simple-knobs.glb', gltf => {
    model = gltf.scene;
    model.rotation.y = Math.PI;
    scene.add(model);

    model.traverse(obj => {
      if (obj.castShadow !== undefined) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        // if (obj.material) obj.material.metalness = 1;
        console.log(obj.name);
        if (obj.name.includes('knob-type')) {
          obj.material = knobMat;
          if (obj.name == 'knob-type-a') {
            knobA = obj;
            obj.rotation.y = -knobARawValue;
          }
          if (obj.name == 'knob-type-b') {
            knobB = obj;
            obj.rotation.y = -knobBRawValue;
          }
        }
      }
      // if (obj.isMesh) {
      //   roughnessMipmapper.generateMipmaps(obj.material);
      // }
    });

    // roughnessMipmapper.dispose();
  });

  text2 = document.createElement('div');
  text2.style.position = 'absolute';
  //text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
  text2.style.width = '50px';
  text2.style.height = '20px';
  text2.style.backgroundColor = 'black';
  text2.style.color = 'white';
  text2.innerHTML = `${knobARawValue}`;
  text2.style.top = 200 + 'px';
  text2.style.left = 200 + 'px';
  document.body.appendChild(text2);

  text3 = document.createElement('div');
  text3.style.position = 'absolute';
  text3.style.width = '50px';
  text3.style.height = '20px';
  text3.style.backgroundColor = 'black';
  text3.style.color = 'white';
  text3.innerHTML = `${knobBRawValue}`;
  text3.style.top = 300 + 'px';
  text3.style.left = 200 + 'px';
  document.body.appendChild(text3);

  text4 = document.createElement('div');
  text4.style.position = 'absolute';
  text4.style.width = '50px';
  text4.style.height = '20px';
  text4.style.backgroundColor = 'black';
  text4.style.color = 'white';
  text4.innerHTML = `${prevNotch}`;
  text4.style.top = 350 + 'px';
  text4.style.left = 200 + 'px';
  document.body.appendChild(text4);

  renderer.shadowMap.enabled = true;
  // renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMapSoft = true;

  // for accurate colors
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // controls = new OrbitControls(camera, renderer.domElement);
  // controls.target.set(0, 0, 0);
  // controls.update();

  raycaster = new THREE.Raycaster();

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('mousemove', onDocumentMouseMove, false);
  window.addEventListener('mousedown', onMouseDown, false);
  window.addEventListener('mouseup', onMouseUp, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  let delta = clock.getDelta();

  // controls.update(delta);
  if (mixer) mixer.update(delta);
  stats.update();

  renderer.render(scene, camera);
  // render();
}

// let selectedObject = null;

function onDocumentMouseMove(e) {
  e.preventDefault();

  // update mouse coordinates
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // clientY is 0 at top of window and increases as mouse moves down
  // mouse.y is 1 at top, 0 at center, -1 at bottom

  if (knobAClicked) {
    // knobA.rotation.y -= (knobAClickCenter - e.clientY) * 0.01;
    knobARawValue += (knobPrevVal - e.clientY) * 0.5;
    knobARawValue =
      knobARawValue > 100 ? 100 : knobARawValue < 0 ? 0 : knobARawValue;
    let newRotation =
      Math.PI * 0.75 +
      ((-Math.PI * 0.75 - Math.PI * 0.75) / (100 - 0)) * (knobARawValue - 0);
    knobA.rotation.y = newRotation;

    knobPrevVal = e.clientY;
    text2.innerHTML = `${knobARawValue}`;
  }
  if (knobBClicked) {
    // knobA.rotation.y -= (knobAClickCenter - e.clientY) * 0.01;
    knobBRawValue += (knobPrevVal - e.clientY) * 0.5;
    // min max limits
    knobBRawValue =
      knobBRawValue > 100 ? 100 : knobBRawValue < 0 ? 0 : knobBRawValue;

    // if (knobBRawValue > knobPrevVal) {
    //   if (knobBRawValue >= knobBMax / knobBNotches) {
    //     knobBRawValue = knobBMax / knobBNotches;
    //   } else {
    //     knobBRawValue = knobPrevVal;
    //   }
    // }

    for (let i = 0; i <= knobBNotches; i++) {
      let notchVal = (knobBMax / knobBNotches) * i;
      if (
        Math.abs(knobBRawValue - notchVal) <
        (knobBMax / knobBNotches) * 0.5
      ) {
        prevNotch = notchVal;
      }
    }

    let newRotation =
      Math.PI * 0.75 +
      ((-Math.PI * 0.75 - Math.PI * 0.75) / (100 - 0)) * (prevNotch - 0);

    knobB.rotation.y = newRotation;
    text4.innerHTML = `${prevNotch}`;

    knobPrevVal = e.clientY;
    text3.innerHTML = `${knobBRawValue}`;
  }
}

function onMouseDown(e) {
  e.preventDefault();
  camera.updateMatrixWorld();
  raycaster.setFromCamera(mouse, camera);

  // let intersects = raycaster.intersectObjects(scene.children, true);
  let intersects = raycaster.intersectObject(model, true);
  console.log(intersects);

  if (intersects.length > 0) {
    if (
      // INTERSECTED != intersects[0].object &&
      intersects[0].object.name === 'knob-type-a' &&
      knobAClicked == false
    ) {
      knobAClicked = true;
      knobPrevVal = e.clientY;

      console.log(knobA);
      console.log('knob a clicked');
    } else if (
      intersects[0].object.name === 'knob-type-b' &&
      knobBClicked == false
    ) {
      knobBClicked = true;
      knobPrevVal = e.clientY;
      prevNotch = knobBRawValue;

      console.log(knobB);
    }
  }
}

function onMouseUp(e) {
  e.preventDefault();

  if (knobAClicked == true) {
    knobAClicked = false;
    console.log('knob a released');
  }
  if (knobBClicked == true) {
    knobBClicked = false;
    console.log('knob b released');
  }
}

function render() {
  camera.updateMatrixWorld();
  raycaster.setFromCamera(mouse, camera);

  // let intersects = raycaster.intersectObjects(scene.children, true);
  let intersects = raycaster.intersectObject(model, true);

  if (intersects.length > 0) {
    console.log(intersects[0]);
    if (
      INTERSECTED != intersects[0].object &&
      intersects[0].object.name[0] == 'sa_low'
    ) {
      let button = intersects[0].object;
      if (INTERSECTED) {
        button.material.emissive.setHex(INTERSECTED.currentHex);
        button.rotation.x -= 0.1;
        clipAction.play();
      }

      INTERSECTED = intersects[0].object;
      INTERSECTED.currentHex = button.material.emissive.getHex();
      button.material.emissive.setHex(0xff0000);

      clipAction2.play();
    }
  } else {
    if (INTERSECTED) {
      INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
      INTERSECTED.rotation.x -= 0.1;
      clipAction.play();
    }

    INTERSECTED = null;
  }
  renderer.render(scene, camera);
}

function getIntersects(x, y) {
  x = (x / window.innerWidth) * 2 - 1;
  y = -(y / window.innerHeight) * 2 + 1;

  mouseVector.set(x, y, 0.5);
  raycaster.setFromCamera(mouseVector, camera);

  return raycaster.intersectObject(group, true);
}
