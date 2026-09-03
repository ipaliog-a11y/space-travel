import { useEffect, useMemo } from "react";
import { Color } from "three";
import { HULL_PAINT } from "@/lib/starwake/hull-kit";
import { buildProcHull, disposeProcHull, type SolidKind } from "@/lib/starwake/hull-proc";
import type { ShipId } from "@/lib/starwake/types";

function material(kind: SolidKind, hull: ShipId) {
  const p = HULL_PAINT[hull];
  const rgb = kind === "skin" ? p.skin : kind === "dark" ? p.dark : kind === "glass" ? p.glass : kind === "accent" ? p.accent : kind === "glow" ? p.glow : p.dark;
  const col = new Color(rgb[0], rgb[1], rgb[2]);
  if (kind === "glow") {
    return (
      <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.2} metalness={0.18} roughness={0.26} />
    );
  }
  if (kind === "glass") {
    return (
      <meshStandardMaterial
        color={col}
        emissive={col}
        emissiveIntensity={0.42}
        metalness={0.1}
        roughness={0.06}
        transparent
        opacity={0.9}
      />
    );
  }
  const metal = kind === "solar" ? 0.32 : kind === "dark" ? 0.7 : 0.86;
  const rough = kind === "solar" ? 0.58 : kind === "dark" ? 0.48 : 0.26;
  return <meshStandardMaterial color={col} metalness={metal} roughness={rough} />;
}

export function HullKit({ hull }: { hull: ShipId }) {
  const solids = useMemo(() => buildProcHull(hull), [hull]);
  useEffect(() => () => disposeProcHull(solids), [solids]);
  return (
    <group>
      {solids.map((s, i) => (
        <mesh key={`${hull}-${s.kind}-${i}`} geometry={s.geometry} castShadow receiveShadow>
          {material(s.kind, hull)}
        </mesh>
      ))}
    </group>
  );
}
