import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { SHIPS, SLOTS, SLOT_TAB } from "@/lib/starwake/catalog";
import type { ShipId, SlotId } from "@/lib/starwake/types";
import type { Mesh, MeshStandardMaterial } from "three";

type Props = {
  hull: ShipId;
  slot: SlotId;
  onSlot: (s: SlotId) => void;
};

type Dolly = { in: () => void; out: () => void };

type OrbitApi = {
  dollyIn: (scale: number) => void;
  dollyOut: (scale: number) => void;
  update: () => void;
};

const POINTS: Record<ShipId, Record<SlotId, [number, number, number]>> = {
  courier: {
    hx: [-1.42, 0.44, 0],
    tank: [-0.04, 0.34, 0],
    fsd: [0.62, 0.26, 0],
    drive: [-0.72, 0.02, 0],
    hold: [0.22, -0.16, 0],
    thruster: [-2.28, 0, 0],
  },
  hauler: {
    hx: [-1.15, 0.5, 0],
    tank: [0.08, -0.62, 0],
    fsd: [1.22, 0.34, 0],
    drive: [-0.28, 0.14, 0],
    hold: [0.12, 0.18, 0],
    thruster: [-2.32, 0, 0],
  },
  scout: {
    hx: [-1.05, 0.48, 0],
    tank: [-0.12, 0.22, 0],
    fsd: [0.85, 0.18, 0],
    drive: [-0.55, 0.02, 0],
    hold: [0.18, -0.2, 0],
    thruster: [-2.35, 0, 0],
  },
  clipper: {
    hx: [-0.85, 0.22, 0.42],
    tank: [0.08, 0.12, 0],
    fsd: [0.92, 0.16, 0],
    drive: [-0.42, 0.04, 0],
    hold: [0.22, -0.12, 0],
    thruster: [-1.92, 0, 0],
  },
};

export function HullBay({ hull, slot, onSlot }: Props) {
  const dolly = useRef<Dolly | null>(null);
  const reduce = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const points = POINTS[hull];

  return (
    <div className={`hull-bay hull-${hull}`}>
      <Canvas
        camera={{ position: [4.15, 1.72, 5.15], fov: 32, near: 0.1, far: 50 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        shadows
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`${SHIPS[hull].name} in bay`}
      >
        <color attach="background" args={["#09090e"]} />
        <fog attach="fog" args={["#09090e", 10, 24]} />
        <hemisphereLight args={["#dfe4ea", "#161820", 0.5]} />
        <directionalLight
          position={[5, 7.2, 3.4]}
          intensity={1.55}
          color="#f3f5f8"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-4.2, 1.4, -3]} intensity={0.4} color="#8a96a6" />
        <pointLight position={[-2.6, 0.2, 0]} intensity={0.5} color="#8eb0c8" distance={6} />
        <group position={[0, 0.2, 0]}>
          <group key={hull}>
            {hull === "courier" ? (
              <CourierMesh />
            ) : hull === "hauler" ? (
              <HaulerMesh />
            ) : hull === "scout" ? (
              <ScoutMesh />
            ) : (
              <ClipperMesh />
            )}
            {SLOTS.map((id) => (
              <Hardpoint
                key={id}
                id={id}
                position={points[id]}
                active={slot === id}
                onPick={onSlot}
              />
            ))}
          </group>
        </group>
        <BayPad />
        <ContactShadows position={[0, -0.76, 0]} opacity={0.5} scale={9} blur={2.6} far={4} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.085}
          autoRotate={!reduce}
          autoRotateSpeed={0.48}
          minDistance={3}
          maxDistance={12}
          minPolarAngle={0.3}
          maxPolarAngle={1.46}
          target={[0, 0.1, 0]}
          ref={(node) => {
            const api = node as unknown as OrbitApi | null;
            if (!api) {
              dolly.current = null;
              return;
            }
            dolly.current = {
              in: () => {
                api.dollyIn(1.22);
                api.update();
              },
              out: () => {
                api.dollyOut(1.22);
                api.update();
              },
            };
          }}
        />
      </Canvas>
      <img src={`/ships/${hull}.png`} alt="" className="hull-plate" />
      <p className="hull-hint">Drag to turn · scroll to zoom</p>
      <span className="hull-bay-name">{SHIPS[hull].name}</span>
      <div className="hull-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => dolly.current?.in()}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => dolly.current?.out()}>
          −
        </button>
      </div>
    </div>
  );
}

function BayPad() {
  return (
    <group position={[0, -0.78, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.6, 64]} />
        <meshStandardMaterial color="#101014" metalness={0.28} roughness={0.82} />
      </mesh>
      {[1.15, 2.05, 3.15].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[r - 0.012, r + 0.012, 72]} />
          <meshStandardMaterial
            color="#d8dce4"
            emissive="#d8dce4"
            emissiveIntensity={0.14}
            metalness={0.4}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

function Hardpoint({
  id,
  position,
  active,
  onPick,
}: {
  id: SlotId;
  position: [number, number, number];
  active: boolean;
  onPick: (s: SlotId) => void;
}) {
  const color = active ? "#ececef" : "#8c8c96";
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onPick(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[active ? 0.08 : 0.058, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.8 : 0.22}
          roughness={0.32}
          metalness={0.18}
        />
      </mesh>
      {active ? (
        <Html center occlude={false} distanceFactor={8} style={{ pointerEvents: "none" }}>
          <span className="hp-name">{SLOT_TAB[id]}</span>
        </Html>
      ) : null}
    </group>
  );
}

function Steel({
  color,
  metal = 0.76,
  rough = 0.36,
}: {
  color: string;
  metal?: number;
  rough?: number;
}) {
  return <meshStandardMaterial color={color} metalness={metal} roughness={rough} />;
}

function EngineGlow({ position, radius }: { position: [number, number, number]; radius: number }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    const mat = ref.current?.material as MeshStandardMaterial | undefined;
    if (!mat) return;
    mat.emissiveIntensity = 0.55 + Math.sin(state.clock.elapsedTime * 2.3) * 0.2;
  });
  return (
    <mesh ref={ref} position={position} rotation={[0, 0, Math.PI / 2]}>
      <circleGeometry args={[radius, 16]} />
      <meshStandardMaterial color="#10141a" emissive="#7fa3bc" emissiveIntensity={0.6} />
    </mesh>
  );
}

function CourierMesh() {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.155, 0.09, 3.7, 22]} />
        <Steel color="#d5dde6" metal={0.82} rough={0.28} />
      </mesh>
      <mesh position={[0.12, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.168, 0.175, 0.85, 22]} />
        <Steel color="#c5ced8" metal={0.78} rough={0.3} />
      </mesh>
      <mesh position={[2.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.09, 0.72, 18]} />
        <Steel color="#e4eaf0" metal={0.86} rough={0.22} />
      </mesh>
      <mesh position={[2.48, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.028, 0.18, 10]} />
        <Steel color="#8b949e" metal={0.7} rough={0.35} />
      </mesh>
      <mesh position={[0.62, 0.14, 0]} scale={[0.92, 0.2, 0.24]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial
          color="#7ea0bc"
          metalness={0.08}
          roughness={0.08}
          emissive="#4d7394"
          emissiveIntensity={0.32}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position={[0.18, 0.2, 0]} castShadow>
        <boxGeometry args={[1.35, 0.045, 0.12]} />
        <Steel color="#9aa7b2" metal={0.6} rough={0.4} />
      </mesh>
      {[-0.16, 0, 0.16].map((z) => (
        <mesh key={z} position={[-1.55, 0.22, z]} rotation={[0, z * 0.18, 0.08]} castShadow>
          <boxGeometry args={[0.62, 0.42, 0.018]} />
          <Steel color="#b7c2cc" metal={0.55} rough={0.38} />
        </mesh>
      ))}
      {[-0.14, 0.14].map((z) => (
        <group key={z}>
          <mesh position={[-2.08, 0, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.07, 0.11, 0.38, 14]} />
            <Steel color="#aeb8c2" metal={0.58} rough={0.34} />
          </mesh>
          <EngineGlow position={[-2.3, 0, z]} radius={0.065} />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.35, -0.02, s * 0.16]} rotation={[s * 0.42, 0, 0]}>
          <boxGeometry args={[1.35, 0.018, 0.06]} />
          <Steel color="#c5cdd6" metal={0.7} rough={0.32} />
        </mesh>
      ))}
      {[-0.7, 0.15, 1.05].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.15, 0.007, 6, 22]} />
          <Steel color="#3e464e" metal={0.4} rough={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function HaulerMesh() {
  const ribs = useMemo(() => Array.from({ length: 7 }, (_, i) => -0.85 + i * 0.28), []);
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[3.35, 0.92, 1.38]} />
        <Steel color="#3a424c" metal={0.62} rough={0.5} />
      </mesh>
      <mesh position={[0.08, 0.08, 0]} castShadow>
        <boxGeometry args={[1.85, 0.72, 1.18]} />
        <Steel color="#1c2228" metal={0.4} rough={0.62} />
      </mesh>
      {ribs.map((x) => (
        <mesh key={x} position={[x, 0.48, 0]}>
          <boxGeometry args={[0.05, 0.12, 1.4]} />
          <Steel color="#151a20" metal={0.35} rough={0.68} />
        </mesh>
      ))}
      <mesh position={[0.12, 0.04, 0.7]}>
        <boxGeometry args={[2.55, 0.14, 0.03]} />
        <meshStandardMaterial color="#a45c32" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0.12, 0.04, -0.7]}>
        <boxGeometry args={[2.55, 0.14, 0.03]} />
        <meshStandardMaterial color="#a45c32" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[1.72, 0.1, 0]} castShadow>
        <boxGeometry args={[0.78, 0.7, 1.02]} />
        <Steel color="#5a646e" metal={0.68} rough={0.38} />
      </mesh>
      <mesh position={[1.78, 0.38, 0]} scale={[0.42, 0.2, 0.36]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial
          color="#6a849c"
          metalness={0.1}
          roughness={0.12}
          emissive="#3a5570"
          emissiveIntensity={0.28}
        />
      </mesh>
      <mesh position={[0.05, -0.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 1.95, 18]} />
        <Steel color="#2e363e" metal={0.55} rough={0.48} />
      </mesh>
      {[-1.0, 1.05].map((x) => (
        <mesh key={x} position={[x, -0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
          <sphereGeometry args={[0.28, 14, 12]} />
          <Steel color="#262e36" metal={0.52} rough={0.5} />
        </mesh>
      ))}
      {[-0.38, 0, 0.38].map((z) => (
        <mesh key={z} position={[-1.28, 0.42, z]} castShadow>
          <boxGeometry args={[0.82, 0.52, 0.05]} />
          <Steel color="#4a545e" metal={0.48} rough={0.52} />
        </mesh>
      ))}
      <mesh position={[-1.85, 0, 0]} castShadow>
        <boxGeometry args={[0.62, 0.82, 1.18]} />
        <Steel color="#323a42" metal={0.58} rough={0.44} />
      </mesh>
      {[-0.32, 0.32].map((z) => (
        <group key={z}>
          <mesh position={[-2.12, 0, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, 0.7, 16]} />
            <Steel color="#6a747e" metal={0.5} rough={0.4} />
          </mesh>
          <EngineGlow position={[-2.5, 0, z]} radius={0.16} />
        </group>
      ))}
      <mesh position={[2.12, -0.06, 0]}>
        <boxGeometry args={[0.24, 0.32, 0.78]} />
        <Steel color="#8a949e" metal={0.7} rough={0.34} />
      </mesh>
    </group>
  );
}

function ScoutMesh() {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.08, 3.95, 20]} />
        <Steel color="#cfd6ce" metal={0.8} rough={0.3} />
      </mesh>
      <mesh position={[0.08, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.145, 0.15, 0.72, 20]} />
        <Steel color="#b7c0b6" metal={0.74} rough={0.34} />
      </mesh>
      <mesh position={[2.22, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.078, 0.82, 16]} />
        <Steel color="#e2e8e0" metal={0.86} rough={0.2} />
      </mesh>
      <mesh position={[2.72, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.7, 8]} />
        <Steel color="#8a9490" metal={0.65} rough={0.4} />
      </mesh>
      <mesh position={[0.55, 0.12, 0]} scale={[0.7, 0.16, 0.2]} castShadow>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial
          color="#7ea8a0"
          metalness={0.08}
          roughness={0.1}
          emissive="#3d6a62"
          emissiveIntensity={0.28}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position={[0.15, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.55, 10]} />
        <Steel color="#9aa49c" metal={0.6} rough={0.4} />
      </mesh>
      <mesh position={[0.15, 0.72, 0]} rotation={[Math.PI / 2.4, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.035, 24]} />
        <Steel color="#dce4dc" metal={0.55} rough={0.28} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.35, 0.02, s * 0.55]} rotation={[s * 0.08, 0, 0.12]} castShadow>
          <boxGeometry args={[1.15, 0.012, 0.42]} />
          <Steel color="#b8c4b4" metal={0.5} rough={0.42} />
        </mesh>
      ))}
      {[-0.12, 0.12].map((z) => (
        <group key={z}>
          <mesh position={[-2.12, 0, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.055, 0.09, 0.34, 12]} />
            <Steel color="#a8b2aa" metal={0.58} rough={0.36} />
          </mesh>
          <EngineGlow position={[-2.32, 0, z]} radius={0.05} />
        </group>
      ))}
      {[-0.85, 0.2, 1.15].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.12, 0.006, 6, 20]} />
          <Steel color="#3e4642" metal={0.4} rough={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function ClipperMesh() {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.2, 0.06, 2.7, 8]} />
        <Steel color="#d4ccc4" metal={0.78} rough={0.32} />
      </mesh>
      <mesh position={[0.1, 0.02, 0]} scale={[1.2, 0.2, 0.7]} castShadow>
        <boxGeometry args={[1.6, 1, 1]} />
        <Steel color="#c8c0b8" metal={0.74} rough={0.34} />
      </mesh>
      <mesh position={[1.38, 0.04, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.15, 0.72, 8]} />
        <Steel color="#e6ded6" metal={0.84} rough={0.22} />
      </mesh>
      <mesh position={[0.48, 0.18, 0]} scale={[0.5, 0.14, 0.26]} castShadow>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial
          color="#8aa0b0"
          metalness={0.1}
          roughness={0.1}
          emissive="#3a5568"
          emissiveIntensity={0.3}
        />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[-0.2, 0, s * 0.48]} rotation={[s * 0.16, 0, 0.06]} castShadow>
            <boxGeometry args={[1.7, 0.07, 0.38]} />
            <Steel color="#b8b0a8" metal={0.7} rough={0.36} />
          </mesh>
          <mesh position={[-1.48, 0, s * 0.34]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.13, 0.48, 10]} />
            <Steel color="#9a928a" metal={0.58} rough={0.38} />
          </mesh>
          <EngineGlow position={[-1.74, 0, s * 0.34]} radius={0.075} />
        </group>
      ))}
      <mesh position={[0.28, -0.14, 0]} castShadow>
        <boxGeometry args={[0.62, 0.14, 0.26]} />
        <Steel color="#2e3236" metal={0.45} rough={0.55} />
      </mesh>
    </group>
  );
}
