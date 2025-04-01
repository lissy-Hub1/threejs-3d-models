import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const manager = new THREE.LoadingManager();
let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
let mixer, currentAction;

const clock = new THREE.Clock();

const params = {
  asset: "Samba Dancing",
  animation: "Samba Dancing",
};

const assets = ["Samba Dancing", "morph_test"];
const animations = ["Samba Dancing", "Singing", "Flair", "Boxing", "Sitting", "Guitar Playing"];

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.set(100, 200, 300);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);
  scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 5);
  dirLight.position.set(0, 200, 100);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Suelo
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  loader = new FBXLoader(manager);
  console.log(params.asset);
  loadAsset(params.asset);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 100, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);

  stats = new Stats();
  container.appendChild(stats.dom);

  // GUI para cambiar modelo y animación
  const gui = new GUI();
  gui.add(params, "asset", assets).onChange(loadAsset);
  gui.add(params, "animation", animations).onChange(playAnimation);

  guiMorphsFolder = gui.addFolder("Morphs").hide();
}

function loadAsset(asset) {
  console.log("Cargando modelo:", asset);

  loader.load(`models/fbx/${asset}.fbx`, function (group) {
    if (object) {
      object.traverse((child) => {
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
        if (child.geometry) child.geometry.dispose();
      });

      scene.remove(object);
    }

    object = group;
    scene.add(object);

    // Crear mixer y reproducir la primera animación
    mixer = new THREE.AnimationMixer(object);
    playAnimation(params.animation);
  });
}

function playAnimation(animationName) {
  if (!mixer || !object) return;

  loader.load(`models/fbx/${animationName}.fbx`, (animObj) => {
    const clip = animObj.animations[0];
    if (!clip) {
      console.warn(`No se encontró la animación: ${animationName}`);
      return;
    }

    console.log(`Reproduciendo animación: ${animationName}`);

    // Detener la animación anterior
    if (currentAction) {
      currentAction.fadeOut(0.5);
    }

    // Aplicar la nueva animación
    const action = mixer.clipAction(clip);
    action.reset().fadeIn(0.5).play();
    currentAction = action;
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
  stats.update();
}
