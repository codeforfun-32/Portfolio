import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

document.addEventListener("DOMContentLoaded", () => {
  const canvas3d = document.getElementById("avatar-canvas");
  const heroSection = document.getElementById("home"); 
  const holoToggleBtn = document.getElementById("holo-toggle");
  
  const eyebrowText = document.querySelector('.hero-eyebrow');
  const subtitleText = document.querySelector('.hero-subtitle');

  if (!canvas3d || !heroSection) return;

  // 1. Setup Scene, Camera, Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
  
  renderer.setSize(canvas3d.clientWidth, canvas3d.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 

  // 2. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(2, 4, 3);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
  fillLight.position.set(-2, 2, -3);
  scene.add(fillLight);

  // 3. Variables
  let headBone = null;
  let targetRotX = 0;
  let targetRotY = 0;
  
  let modelMesh = null;
  let originalMaterials = [];
  let hologramMaterials = [];
  let isHologram = false;
  let holoTime = 0;
  
  let glitchTimer = 0;
  let nextGlitchTime = 2.5 + Math.random() * 3.0; 
  let isGlitching = false;
  let glitchStartTime = 0;
  let glitchDuration = 0.3; 
  let glitchSeed = 0;
  let currentGlitchIntensity = 0;

  let sweepY = -100; 
  let sweepPauseTimer = 0;
  const SWEEP_SPEED = 10; 
  const SWEEP_PAUSE = 4.0; 

  // 4. Load the GLB Model
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader); 

  loader.load('assets/Avatar-v1.glb', (gltf) => {
    const model = gltf.scene;
    modelMesh = model;
    
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    model.position.y = -box.min.y; 
    model.position.x = -center.x;
    model.position.z = -center.z;
    
    scene.add(model);

    model.traverse((node) => {
      if (node.isMesh) {
        originalMaterials.push(node.material);

        const holoMat = node.material.clone();
        holoMat.transparent = true;
        holoMat.depthWrite = true; 
        holoMat.blending = THREE.NormalBlending; 

        holoMat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = { value: 0 };
          shader.uniforms.uGlitch = { value: 0 }; 
          shader.uniforms.uGlitchSeed = { value: 0 }; 
          shader.uniforms.uSweepY = { value: -100 }; 
          holoMat.userData.shader = shader;

          // --- VERTEX SHADER ---
          shader.vertexShader = `
            uniform float uTime;
            uniform float uGlitch;
            uniform float uGlitchSeed;
            varying vec3 vCustomNormal;
            varying vec3 vCustomViewPos;
            float hash(float n) { return fract(sin(n) * 1e4); }
          ` + shader.vertexShader;

          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            if (uGlitch > 0.0) {
                float yBand = floor(position.y * 40.0);
                float rnd = hash(yBand + uGlitchSeed);
                float shiftChance = step(0.65, rnd); 
                float dir = sign(hash(yBand + uGlitchSeed + 1.0) - 0.5);
                transformed.x += (rnd * 0.2) * shiftChance * dir * uGlitch;
            }
            `
          );

          shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            `
            #include <project_vertex>
            vCustomViewPos = -mvPosition.xyz;
            vCustomNormal = normalMatrix * normal;
            `
          );

          // --- FRAGMENT SHADER ---
          shader.fragmentShader = `
            uniform float uTime;
            uniform float uGlitch;
            uniform float uSweepY; 
            varying vec3 vCustomNormal;
            varying vec3 vCustomViewPos;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          ` + shader.fragmentShader;

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>
            
            vec3 holoBase = vec3(1.0, 0.35, 0.0); 
            vec3 holoGlow = vec3(0.6, 0.3, 0.9);  
            
            vec3 viewDir = normalize(vCustomViewPos);
            float fresnel = pow(1.0 - abs(dot(normalize(vCustomNormal), viewDir)), 3.0);
            
            vec3 texColor = diffuseColor.rgb;
            float luminance = dot(texColor, vec3(0.299, 0.587, 0.114));
            vec3 baseHolo = mix(holoBase * 0.1, holoBase * luminance, 0.9);

            float distToCenter = abs(gl_FragCoord.y - uSweepY);
            float giantSweep = 1.0 - smoothstep(0.0, 15.0, distToCenter); 
            giantSweep = pow(giantSweep, 2.0) * 1.5; 

            vec2 gridUV = gl_FragCoord.xy * 0.03; 
            vec2 grid = abs(fract(gridUV - 0.5) - 0.5) / fwidth(gridUV);
            float baseGrid = 1.0 - min(min(grid.x, grid.y), 1.0);
            
            float edgeGridBoost = pow(fresnel, 1.5);
            float gridMask = baseGrid * (0.4 + edgeGridBoost * 3.0); 
            
            float noiseVal = hash(floor(gridUV));
            gridMask *= step(0.85, noiseVal); 
            gridMask *= (sin(gl_FragCoord.y * 0.01 + uTime) * 0.5 + 0.5) * 0.5 + 0.2;

            float scan = sin(gl_FragCoord.y * 0.25 - uTime * 8.0) * 0.5 + 0.5;
            scan = pow(scan, 16.0) * 0.3; 

            vec3 finalColor = baseHolo;
            finalColor += holoGlow * fresnel * 2.0;     
            finalColor += holoGlow * gridMask * 0.6;    
            finalColor += holoGlow * scan;              
            finalColor += holoGlow * giantSweep; 
            
            if (uGlitch > 0.0) {
                finalColor.r += 0.4 * uGlitch;
                finalColor.b -= 0.2 * uGlitch;
            }

            gl_FragColor.rgb = finalColor;
            gl_FragColor.a = diffuseColor.a * 0.95;
            `
          );
        };

        hologramMaterials.push(holoMat);
      }

      // --- STRICT BONE FINDING ---
      if (node.isBone) {
        const exactName = node.name; 
        
        if (exactName === 'J_Bip_C_Head' || exactName === 'Head') {
          headBone = node;
        }
        
        if (exactName === 'J_Bip_L_UpperArm' || exactName === 'LeftUpperArm') {
          node.rotation.z = -1.2; 
        }
        if (exactName === 'J_Bip_R_UpperArm' || exactName === 'RightUpperArm') {
          node.rotation.z = 1.2; 
        }
      }
    });

    // Pre-compile shader
    let meshIndex = 0;
    modelMesh.traverse((node) => {
      if (node.isMesh) { node.material = hologramMaterials[meshIndex]; meshIndex++; }
    });
    renderer.compile(scene, camera);
    meshIndex = 0;
    modelMesh.traverse((node) => {
      if (node.isMesh) { node.material = originalMaterials[meshIndex]; meshIndex++; }
    });

    const focusHeight = size.y * 0.85; 
    camera.position.set(0, focusHeight, 1.1); 
    camera.lookAt(0, focusHeight, 0);

    document.dispatchEvent(new Event('avatarLoaded'));

  }, undefined, (error) => {
    console.error("Error loading 3D model:", error);
    document.dispatchEvent(new Event('avatarLoaded'));
  });

  // 5. Mouse Tracking
  window.addEventListener('mousemove', (event) => {
    const heroRect = heroSection.getBoundingClientRect();
    if (event.clientY > heroRect.bottom) {
      targetRotX = 0;
      targetRotY = 0;
      return;
    }

    const rect = canvas3d.getBoundingClientRect();
    const canvasCenterX = rect.left + rect.width / 2;
    const dx = event.clientX - canvasCenterX;
    let rawY = (dx / window.innerWidth) * 3.0; 
    targetRotY = THREE.MathUtils.clamp(rawY, -0.8, 0.8); 

    if (eyebrowText && subtitleText) {
      const topLineY = eyebrowText.getBoundingClientRect().bottom + 5; 
      const bottomLineY = subtitleText.getBoundingClientRect().top;

      let newTargetX = 0;
      if (event.clientY < topLineY) {
        const distance = topLineY - event.clientY;
        const ratio = Math.min(distance / (topLineY || 1), 1); 
        newTargetX = -(ratio * 0.6); 
      } else if (event.clientY > bottomLineY) {
        const distance = event.clientY - bottomLineY;
        const maxDistance = window.innerHeight - bottomLineY;
        const ratio = Math.min(distance / (maxDistance || 1), 1);
        newTargetX = ratio * 0.3;
      }
      targetRotX = newTargetX;
    }
  });

  // 6. Toggle Logic
  if (holoToggleBtn) {
    holoToggleBtn.addEventListener('click', () => {
      if (!modelMesh) return;
      
      isHologram = !isHologram;
      let meshIndex = 0;

      modelMesh.traverse((node) => {
        if (node.isMesh) {
          if (isHologram) {
            node.material = hologramMaterials[meshIndex];
          } else {
            node.material = originalMaterials[meshIndex];
          }
          meshIndex++;
        }
      });
    });
  }

  // 7. Animation Loop
  function animate3D() {
    requestAnimationFrame(animate3D);

    const delta = 0.016; 
    holoTime += delta;

    if (isHologram) {
      const maxHeight = canvas3d.height + 100; 
      if (sweepY < maxHeight) {
        sweepY += SWEEP_SPEED * delta;
        sweepPauseTimer = 0;
      } else {
        sweepPauseTimer += delta;
        if (sweepPauseTimer > SWEEP_PAUSE) {
          sweepY = -100; 
        }
      }
    }

    if (isHologram) {
      if (!isGlitching) {
        glitchTimer += delta;
        if (glitchTimer > nextGlitchTime) {
          isGlitching = true;
          glitchStartTime = holoTime;
          glitchDuration = 0.2 + Math.random() * 0.3; 
          glitchSeed = Math.random() * 100; 
          glitchTimer = 0;
        }
      } else {
        let elapsed = holoTime - glitchStartTime;
        
        if (elapsed > glitchDuration) {
          isGlitching = false;
          currentGlitchIntensity = 0;
          nextGlitchTime = 2.5 + Math.random() * 3.5; 
        } else {
          let t = elapsed / glitchDuration;
          currentGlitchIntensity = Math.sin(t * Math.PI); 
        }
      }
    }

    if (headBone) {
      headBone.rotation.y += (targetRotY - headBone.rotation.y) * 0.035;
      headBone.rotation.x += (targetRotX - headBone.rotation.x) * 0.035;
    }

    if (isHologram) {
      hologramMaterials.forEach(mat => {
        if (mat.userData.shader) {
          mat.userData.shader.uniforms.uTime.value = holoTime;
          mat.userData.shader.uniforms.uGlitch.value = currentGlitchIntensity;
          mat.userData.shader.uniforms.uGlitchSeed.value = glitchSeed;
          mat.userData.shader.uniforms.uSweepY.value = sweepY;
        }
      });
    }

    renderer.render(scene, camera);
  }
  animate3D();

  // 8. Resize
  window.addEventListener('resize', () => {
    const width = canvas3d.parentElement.clientWidth;
    const height = canvas3d.parentElement.clientHeight;
    
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
});