import { Canvas } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { SHIPS, SLOTS, SLOT_TAB } from "@/lib/starwake/catalog";
import type { ShipId, SlotId } from "@/lib/starwake/types";
import { HullKit } from "./HullKit";

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
  tender: {
    hx: [-1.05, 0.62, 0],
    tank: [0.05, -0.42, 0],
    fsd: [1.35, 0.28, 0],
    drive: [-0.35, 0.12, 0],
    hold: [0.22, 0.22, 0],
    thruster: [-2.28, 0, 0],
  },
  tug: {
    hx: [-0.72, 0.38, 0],
    tank: [0.12, -0.22, 0],
    fsd: [0.78, 0.22, 0],
    drive: [-0.28, 0.08, 0],
    hold: [0.18, 0.12, 0],
    thruster: [-1.72, 0, 0],
  },
  extractor: {
    hx: [-0.82, 0.48, 0],
    tank: [0.18, -0.38, 0],
    fsd: [1.05, 0.28, 0],
    drive: [-0.32, 0.1, 0],
    hold: [0.22, 0.16, 0],
    thruster: [-2.05, 0, 0],
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
            <HullKit hull={hull} />
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
