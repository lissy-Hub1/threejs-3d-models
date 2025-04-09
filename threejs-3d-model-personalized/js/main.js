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
  asset: "Hip Hop",
  animation: "Hip Hop",
};

const assets = ["Hip Hop", "morph_test"];
const animations = ["Hip Hop", "Jazz", "Rumba", "Silly", "Twerk"];

init();

function init() {
  // Usamos el contenedor de la TV en lugar de crear uno nuevo
  const container = document.getElementById('three-container');
  
  // Ajustamos la cámara al tamaño del contenedor de la TV
  const containerRect = container.getBoundingClientRect();
  camera = new THREE.PerspectiveCamera(45, containerRect.width / containerRect.height, 1, 2000);
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
  renderer.setSize(containerRect.width, containerRect.height);
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
  window.addEventListener("keydown", (event) => {
    if (params.asset !== "Hip Hop") return;
  
    const keyToAnimation = {
      "1": "Hip Hop",
      "2": "Jazz",
      "3": "Rumba",
      "4": "Silly",
      "5": "Twerk",
    };
  
    const anim = keyToAnimation[event.key];
    if (anim) {
      params.animation = anim;
      playAnimation(anim);
    }
  });

  guiMorphsFolder = gui.addFolder("Morphs").hide();
}

function loadAsset(asset) {
  console.log("Cargando modelo:", asset);

  loader.load(`../models/fbx/${asset}.fbx`, function (group) {
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

    // Evitar que el modelo se vea transparente
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
          mat.side = THREE.FrontSide;
        });
      }
    });

    scene.add(object);

    // Crear mixer y reproducir la primera animación
    mixer = new THREE.AnimationMixer(object);
    playAnimation(params.animation);
  });
}

function playAnimation(animationName) {
  if (!mixer || !object) return;

  loader.load(`../models/fbx/${animationName}.fbx`, (animObj) => {
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
  const container = document.getElementById('three-container');
  const containerRect = container.getBoundingClientRect();
  camera.aspect = containerRect.width / containerRect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(containerRect.width, containerRect.height);
}

function animate() {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
  stats.update();
}