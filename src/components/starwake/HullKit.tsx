import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { Color, Group, Quaternion, Vector3 } from "three";
import { layoutHull, type HullPart } from "@/lib/starwake/hull-kit";
import type { ShipId } from "@/lib/starwake/types";

const Y_UP = new Vector3(0, 1, 0);
const Z_UP = new Vector3(0, 0, 1);

function paint(part: HullPart) {
  const col = new Color(part.color[0], part.color[1], part.color[2]);
  const glass = part.emit > 0.18 && part.emit < 0.45;
  const glow = part.emit >= 0.45;
  if (glow) {
    return (
      <meshStandardMaterial
        color={col}
        emissive={col}
        emissiveIntensity={1.15}
        metalness={0.2}
        roughness={0.28}
      />
    );
  }
  if (glass) {
    return (
      <meshStandardMaterial
        color={col}
        emissive={col}
        emissiveIntensity={0.45}
        metalness={0.12}
        roughness={0.08}
        transparent
        opacity={0.92}
      />
    );
  }
  const metal = part.shade === 12 ? 0.35 : part.shade === 14 ? 0.48 : 0.82;
  const rough = part.shade === 12 ? 0.62 : part.shade === 11 ? 0.3 : 0.42;
  return <meshStandardMaterial color={col} metalness={metal} roughness={rough} />;
}

function PartMesh({ part }: { part: HullPart }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    const ax = new Vector3(part.ax[0], part.ax[1], part.ax[2]).normalize();
    const from = part.along === "z" ? Z_UP : Y_UP;
    g.quaternion.copy(new Quaternion().setFromUnitVectors(from, ax));
    g.position.set(part.p[0], part.p[1], part.p[2]);
    g.scale.set(part.s[0], part.s[1], part.s[2]);
  }, [part]);

  let geo: ReactNode = <boxGeometry args={[1, 1, 1]} />;
  if (part.mesh === "sphere") geo = <sphereGeometry args={[1, 28, 20]} />;
  else if (part.mesh === "cyl") geo = <cylinderGeometry args={[1, 1, 1, 28]} />;
  else if (part.mesh === "cone") geo = <coneGeometry args={[1, 1, 24]} />;
  else if (part.mesh === "torus") geo = <torusGeometry args={[1, 0.12, 12, 36]} />;
  else if (part.mesh === "thin") geo = <torusGeometry args={[1, 0.04, 8, 32]} />;

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow>
        {geo}
        {paint(part)}
      </mesh>
    </group>
  );
}

export function HullKit({ hull }: { hull: ShipId }) {
  const parts = useMemo(() => layoutHull(hull, 2), [hull]);
  return (
    <group>
      {parts.map((part, i) => (
        <PartMesh key={`${hull}-${i}`} part={part} />
      ))}
    </group>
  );
}
