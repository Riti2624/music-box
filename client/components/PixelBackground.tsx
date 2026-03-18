import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const PixelGroup = () => {
  const groupRef = useRef<THREE.Group>(null);
  const pixelsRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!groupRef.current) return;

    // Create floating pixels
    const pixelCount = 50;
    pixelsRef.current = [];

    for (let i = 0; i < pixelCount; i++) {
      const geometry = new THREE.BoxGeometry(
        Math.random() * 0.3 + 0.1,
        Math.random() * 0.3 + 0.1,
        Math.random() * 0.3 + 0.1
      );

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
        emissive: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
        emissiveIntensity: 0.5,
        metalness: 0.6,
        roughness: 0.4,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      );

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // Store rotation speed
      (mesh as any).rotationSpeed = {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01,
      };

      // Store movement direction
      (mesh as any).velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );

      groupRef.current.add(mesh);
      pixelsRef.current.push(mesh);
    }

    return () => {
      // Cleanup
      pixelsRef.current.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    };
  }, []);

  useFrame(({ mouse, camera }) => {
    if (!groupRef.current) return;

    // Parallax effect based on mouse movement
    camera.position.x = mouse.x * 5;
    camera.position.y = mouse.y * 5;

    // Animate pixels
    pixelsRef.current.forEach((mesh) => {
      // Rotation
      const rotSpeed = (mesh as any).rotationSpeed;
      mesh.rotation.x += rotSpeed.x;
      mesh.rotation.y += rotSpeed.y;
      mesh.rotation.z += rotSpeed.z;

      // Movement
      const vel = (mesh as any).velocity;
      mesh.position.add(vel);

      // Bounce off boundaries
      const bounds = 20;
      if (Math.abs(mesh.position.x) > bounds) {
        (mesh as any).velocity.x *= -1;
        mesh.position.x = Math.sign(mesh.position.x) * bounds;
      }
      if (Math.abs(mesh.position.y) > bounds) {
        (mesh as any).velocity.y *= -1;
        mesh.position.y = Math.sign(mesh.position.y) * bounds;
      }
      if (Math.abs(mesh.position.z) > bounds) {
        (mesh as any).velocity.z *= -1;
        mesh.position.z = Math.sign(mesh.position.z) * bounds;
      }
    });
  });

  return <group ref={groupRef} />;
};

export const PixelBackground = () => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none opacity-35">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        style={{
          background: "transparent",
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, 10]} intensity={0.5} color="#8b5cf6" />
        <pointLight position={[0, 0, 20]} intensity={0.3} color="#3b82f6" />
        <PixelGroup />
      </Canvas>
    </div>
  );
};
