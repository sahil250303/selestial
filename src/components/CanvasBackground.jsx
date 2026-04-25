import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Stars } from '@react-three/drei';

function ArmillarySphere() {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }
  });

  const materialProps = {
    color: "#cfd0d2",
    envMapIntensity: 2.5,
    metalness: 1,
    roughness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.1
  };

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={2}>
      <group ref={groupRef}>
        {/* Core Jewel / Star */}
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshPhysicalMaterial {...materialProps} roughness={0.05} />
        </mesh>
        
        {/* Orbital Rings representing both jewellery and the universe */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.5, 0.05, 32, 100]} />
          <meshPhysicalMaterial {...materialProps} />
        </mesh>
        
        <mesh rotation={[0, Math.PI / 3, 0]}>
          <torusGeometry args={[3, 0.08, 32, 100]} />
          <meshPhysicalMaterial {...materialProps} />
        </mesh>

        <mesh rotation={[0, -Math.PI / 3, 0]}>
          <torusGeometry args={[3.5, 0.05, 32, 100]} />
          <meshPhysicalMaterial {...materialProps} />
        </mesh>
      </group>
    </Float>
  );
}

export default function CanvasBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-dark pointer-events-none">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} color="#4a4a4a" intensity={0.8} />
        
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        <ArmillarySphere />
        
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
