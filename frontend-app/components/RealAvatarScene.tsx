"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useScrollStore } from '../store/scrollStore';
import { useAvatarStore } from '../store/avatarStore';

export function RealAvatarScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const pointsRef = useRef<THREE.Points>();
  const avatarRef = useRef<THREE.Group>();
  const animationRef = useRef<number>();
  const scrollProgress = useScrollStore((state) => state.scrollProgress);
  const { setProgress, setLoaded, setError, reset } = useAvatarStore();

  // Suprimir errores específicos de texturas blob
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('GLTFLoader') && message.includes('Couldn\'t load texture') && message.includes('blob:')) {
        // Suprimir este error específico silenciosamente
        return;
      }
      originalError.apply(console, args);
    };
    
    return () => {
      console.error = originalError;
    };
  }, []);
  
  // Refs para la animación de estrellas
  const starPhasesRef = useRef<Float32Array>();
  const starSpeedsRef = useRef<Float32Array>();
  const starCountRef = useRef<number>(800);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    // Sin color de fondo para transparencia - igual que working version
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // FORZAR que el canvas sea visible - APPROACH AGRESIVO
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';
    renderer.domElement.style.zIndex = '1'; // Por debajo del HTML (que tiene z-index: 10)
    renderer.domElement.style.pointerEvents = 'none';
    // renderer.domElement.style.border = '5px solid red'; // DEBUG: borde rojo - REMOVIDO
    console.log('🎨 Canvas styles applied:', renderer.domElement.style);
    
    // Añadir directamente al BODY para evitar problemas de stacking
    document.body.appendChild(renderer.domElement);
    console.log('🎯 Canvas añadido directamente al BODY');

    // Lighting setup optimizado - IGUAL AL WORKING VERSION
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight1.position.set(5, 5, 5);
    directionalLight1.castShadow = true;
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xff00aa, 1);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);

    // Constelación suave con brillo individual por estrella
    const starCount = starCountRef.current;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starPhases = new Float32Array(starCount); // Fase de brillo individual
    const starSpeeds = new Float32Array(starCount); // Velocidad de brillo individual
    
    // Guardar en refs para acceso en animación
    starPhasesRef.current = starPhases;
    starSpeedsRef.current = starSpeeds;
    
    for (let i = 0; i < starCount; i++) {
      const radius = Math.random() * 100 + 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Tamaños variables
      starSizes[i] = Math.random() * 2 + 0.5;
      
      // Fase aleatoria para que cada estrella brille en momento distinto
      starPhases[i] = Math.random() * Math.PI * 2;
      
      // Velocidad aleatoria para que brillen a velocidades distintas
      starSpeeds[i] = Math.random() * 0.02 + 0.005; // Entre 0.005 y 0.025
    }
    
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    
    // Material personalizado para brillo individual
    const starOpacities = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      starOpacities[i] = 0.5; // Opacidad base
    }
    starGeometry.setAttribute('opacity', new THREE.BufferAttribute(starOpacities, 1));

    const starMaterial = new THREE.ShaderMaterial({
      transparent: true,
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying float vOpacity;
        
        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        
        void main() {
          float distanceFromCenter = distance(gl_PointCoord, vec2(0.5));
          if (distanceFromCenter > 0.5) discard;
          
          float alpha = (1.0 - distanceFromCenter * 2.0) * vOpacity;
          gl_FragColor = vec4(0.67, 0.8, 1.0, alpha); // Color azul suave
        }
      `
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    pointsRef.current = stars;

    // DEBUG: Cubo de prueba REMOVIDO - ya no necesario
    // const testGeometry = new THREE.BoxGeometry(2, 2, 2);
    // const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // const testCube = new THREE.Mesh(testGeometry, testMaterial);
    // testCube.position.set(5, 0, 0);
    // scene.add(testCube);

    // Reset avatar store al iniciar
    reset();

    // Avatar loading
    const loader = new GLTFLoader();
    loader.load(
      '/models/avatar-optimized.glb',
      (gltf) => {
        console.log('🎯 Avatar GLTF cargado exitosamente');
        const avatar = gltf.scene;
        
        // Debug: Calcular bounding box del modelo completo
        const bbox = new THREE.Box3().setFromObject(avatar);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());
        console.log('📐 Avatar Bounding Box:');
        console.log('  Size:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
        console.log('  Center:', center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2));
        console.log('  Min:', bbox.min.x.toFixed(2), bbox.min.y.toFixed(2), bbox.min.z.toFixed(2));
        console.log('  Max:', bbox.max.x.toFixed(2), bbox.max.y.toFixed(2), bbox.max.z.toFixed(2));
        
        let meshCount = 0;
        // Configurar todos los meshes
        avatar.traverse((child) => {
          if ((child as any).isMesh) {
            meshCount++;
            const mesh = child as THREE.Mesh;
            mesh.visible = true;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            console.log(`🔍 Mesh ${meshCount}:`, mesh.name, mesh.visible);
            
            // NO TOCAR MATERIALES - Dejar originales intactos
            // (Los materiales y texturas se cargan automáticamente desde el GLB)
          }
        });
        
        console.log(`🎭 Total meshes configurados: ${meshCount}`);
        
        // Posición inicial del avatar - ajustada para mobile
        avatar.scale.setScalar(6); // Escala igual que en working version  
        
        // Detectar mobile y ajustar posición Y
        const isMobileView = window.innerWidth < 768;
        const avatarY = isMobileView ? -2.5 : -0.6;  // MUCHO más abajo en mobile
        avatar.position.set(0, avatarY, 5);
        
        console.log('📱 Mobile detection:', { isMobileView, windowWidth: window.innerWidth, avatarY });
        
        console.log(`🎯 Avatar configurado:`);
        console.log('  Escala:', avatar.scale.x.toFixed(3));
        console.log('  Posición:', avatar.position.x.toFixed(2), avatar.position.y.toFixed(2), avatar.position.z.toFixed(2));
        
        scene.add(avatar);
        avatarRef.current = avatar;
        
        // DEBUG: Helper cube REMOVIDO - ya no necesario
        // const helperGeometry = new THREE.BoxGeometry(1, 1, 1);
        // const helperMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        // const helperCube = new THREE.Mesh(helperGeometry, helperMaterial);
        // helperCube.position.set(0, -1.5, 5);
        // helperCube.scale.setScalar(6);
        // scene.add(helperCube);
        
        console.log('✅ Avatar añadido a la escena y visible');
        
        // Delay para asegurar que esté realmente renderizado
        setTimeout(() => {
          setLoaded(true);
          console.log('🎯 Avatar marcado como completamente cargado después de render');
        }, 100); // Pequeño delay para asegurar renderizado
      },
      (progress) => {
        const percent = (progress.loaded / progress.total * 100);
        setProgress(percent);
        console.log('📥 Cargando avatar:', percent.toFixed(1) + '%');
      },
      (error) => {
        console.error('❌ Error cargando avatar:', error);
        setError(error instanceof Error ? error.message : 'Error loading 3D avatar');
        
        // Fallback: cubo simple wrapeado en Group
        const fallbackGroup = new THREE.Group();
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ color: 0xff00ff });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, -2.5, 0);
        cube.scale.setScalar(3);
        fallbackGroup.add(cube);
        scene.add(fallbackGroup);
        avatarRef.current = fallbackGroup;
        
        // Marcar como cargado aunque sea fallback
        setTimeout(() => {
          setLoaded(true);
        }, 100);
      }
    );

    // Posición de cámara actualizada - ajustada para mobile
    camera.position.set(0, 0, 20); // Alejar más la cámara
    
    // Ajustar punto de mira según dispositivo para coincidir con avatar
    const isMobileSetup = window.innerWidth < 768;
    const lookAtY = isMobileSetup ? -2.5 : -0.9;  // Mirar donde está el avatar en cada caso
    camera.lookAt(0, lookAtY, 0);
    
    console.log('📷 Camera setup:', { isMobileSetup, lookAtY });

    // Store refs
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Animation loop - brillo individual por estrella + rotación continua del avatar
    let time = 0;
    const animate = () => {
      time += 0.01;
      
      // Actualizar brillo individual de cada estrella
      if (pointsRef.current && starPhasesRef.current && starSpeedsRef.current) {
        const geometry = pointsRef.current.geometry;
        const opacityAttribute = geometry.getAttribute('opacity') as THREE.BufferAttribute;
        
        for (let i = 0; i < starCountRef.current; i++) {
          // Cada estrella brilla con su propia fase y velocidad
          const phase = starPhasesRef.current[i] + time * starSpeedsRef.current[i];
          const brightness = 0.3 + Math.sin(phase) * 0.4; // Oscila entre 0.1 y 0.7
          opacityAttribute.setX(i, brightness);
        }
        
        opacityAttribute.needsUpdate = true;
      }
      
      // Animación estacional - solo flotación sutil (MANTENER como estaba)
      if (avatarRef.current) {
        // Solo balanceo sutil, SIN rotación 360 continua - la rotación se maneja en useEffect de scroll
        avatarRef.current.rotation.x = Math.sin(time * 0.8) * 0.03; // Balanceo dinámico en X
        avatarRef.current.rotation.z = Math.cos(time * 1.0) * 0.02; // Balanceo dinámico en Z
      }
      
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (renderer.domElement && document.body.contains(renderer.domElement)) {
        document.body.removeChild(renderer.domElement);
      }
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  // Efecto separado para la animación por scroll
  useEffect(() => {
    if (!avatarRef.current) return;

    // Estados de animación - CONSISTENCIA TOTAL para evitar bug de estacionado
    // Detectar mobile para consistencia con posición inicial
    const isMobileAnimation = window.innerWidth < 768;
    const startY = isMobileAnimation ? -2.5 : -0.6; // Usar misma lógica que posición inicial
    
    const START_STATE = {
      scale: 6,       // Grande al inicio
      position: { x: 0, y: startY, z: 5 }, // Respetar configuración mobile
      rotation: { y: 0 } // De frente
    };
    
    console.log('🔄 Scroll animation START_STATE:', { isMobileAnimation, startY });

    const END_STATE = {
      scale: 0.5,     // Valor exacto del repo master-master2
      position: { x: 0, y: 8, z: 5 }, // Sale por arriba como en master-master2
      rotation: { y: Math.PI * 2 } // Una vuelta completa como en master-master2
    };

    // CLAMP scrollProgress más agresivo para evitar valores residuales
    const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
    
    // Threshold más estricto: si está muy cerca de 0, forzar a 0
    const finalProgress = clampedProgress < 0.02 ? 0 : clampedProgress;

    // Interpolación suave con easing para transiciones más naturales
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const lerp = (start: number, end: number, progress: number) => 
      start + (end - start) * progress;
    const lerpEased = (start: number, end: number, progress: number) => 
      start + (end - start) * easeInOutCubic(progress);

    // Aplicar transformaciones interpoladas con suavizado
    const scale = lerp(START_STATE.scale, END_STATE.scale, finalProgress);
    const basePosY = lerpEased(START_STATE.position.y, END_STATE.position.y, finalProgress);
    const rotY = lerpEased(START_STATE.rotation.y, END_STATE.rotation.y, finalProgress);

    // Aplicar transformaciones
    avatarRef.current.scale.setScalar(scale);
    avatarRef.current.rotation.y = rotY;
    avatarRef.current.position.set(0, basePosY, 5);
    
    // DEBUG: Log detallado
    if (scrollProgress !== finalProgress) {
      console.log('📏 ScrollProgress ajustado:', {
        original: scrollProgress.toFixed(4),
        final: finalProgress.toFixed(4),
        positionY: basePosY.toFixed(3)
      });
    }

  }, [scrollProgress]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}