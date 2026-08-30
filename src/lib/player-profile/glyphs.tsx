import type { ReactNode } from "react";
import type { PilotIconId } from "./types.ts";

const SVG = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Mark({ children }: { children: ReactNode }) {
  return <svg {...SVG} aria-hidden="true">{children}</svg>;
}

/** Twenty original line marks. No emoji, no reused brand glyphs. */
export function PilotGlyph({ id }: { id: PilotIconId | string }) {
  switch (id) {
    case "pilot-01":
      return (
        <Mark>
          <path d="M5 16 L12 8 L19 16" />
          <path d="M7.5 16 L12 11 L16.5 16" />
          <path d="M10 16 L12 13.5 L14 16" />
        </Mark>
      );
    case "pilot-02":
      return (
        <Mark>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 4.5 V6.5 M12 17.5 V19.5 M4.5 12 H6.5 M17.5 12 H19.5 M6.4 6.4 L7.8 7.8 M16.2 16.2 L17.6 17.6 M17.6 6.4 L16.2 7.8 M7.8 16.2 L6.4 17.6" />
        </Mark>
      );
    case "pilot-03":
      return (
        <Mark>
          <ellipse cx="12" cy="12" rx="8" ry="3.2" />
          <circle cx="18" cy="12" r="1.4" />
        </Mark>
      );
    case "pilot-04":
      return (
        <Mark>
          <path d="M6 18 V7 H18 V18" />
          <path d="M9 18 V11 H15 V18" />
        </Mark>
      );
    case "pilot-05":
      return (
        <Mark>
          <path d="M12 5 L19 18 H5 Z" />
          <path d="M12 10 V16" />
        </Mark>
      );
    case "pilot-06":
      return (
        <Mark>
          <rect x="6" y="6" width="12" height="12" rx="1" />
          <path d="M12 8 L16 12 L12 16 L8 12 Z" />
        </Mark>
      );
    case "pilot-07":
      return (
        <Mark>
          <path d="M5 16 A7 7 0 0 1 19 16" />
          <path d="M7.5 16 A4.5 4.5 0 0 1 16.5 16" />
          <path d="M10 16 A2 2 0 0 1 14 16" />
        </Mark>
      );
    case "pilot-08":
      return (
        <Mark>
          <path d="M12 5 L12 13" />
          <path d="M12 13 L6.5 18" />
          <path d="M12 13 L17.5 18" />
        </Mark>
      );
    case "pilot-09":
      return (
        <Mark>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3.2" />
        </Mark>
      );
    case "pilot-10":
      return (
        <Mark>
          <path d="M12 4 L15.2 12 L12 20 L8.8 12 Z" />
        </Mark>
      );
    case "pilot-11":
      return (
        <Mark>
          <path d="M12 19 V8" />
          <circle cx="12" cy="6" r="2" />
          <path d="M8 11 H16" />
        </Mark>
      );
    case "pilot-12":
      return (
        <Mark>
          <path d="M5 16 L9 8 L13 16" />
          <path d="M11 16 L15 8 L19 16" />
        </Mark>
      );
    case "pilot-13":
      return (
        <Mark>
          <ellipse cx="12" cy="12" rx="8" ry="3.4" strokeDasharray="2.2 2" />
          <circle cx="12" cy="12" r="1.1" />
        </Mark>
      );
    case "pilot-14":
      return (
        <Mark>
          <path d="M5 18 H19" />
          <path d="M12 18 V10" />
          <path d="M9 13 H15" />
        </Mark>
      );
    case "pilot-15":
      return (
        <Mark>
          <path d="M16.5 8.5 C16.5 5.5 13.5 4.5 12 4.5 C8.5 4.5 6 7.5 6 11 C6 15.5 9.5 18.5 13 18.5 C16 18.5 18 16.5 18 14.5 C18 12 16 11 14 11" />
        </Mark>
      );
    case "pilot-16":
      return (
        <Mark>
          <path d="M12 5 V9 M12 15 V19 M5 12 H9 M15 12 H19" />
          <circle cx="12" cy="12" r="2.2" />
        </Mark>
      );
    case "pilot-17":
      return (
        <Mark>
          <path d="M16 6.5 A7 7 0 1 0 16 17.5" />
          <path d="M16 9 A4.2 4.2 0 1 0 16 15" />
        </Mark>
      );
    case "pilot-18":
      return (
        <Mark>
          <path d="M8 8 H16 M6.5 12 H17.5 M5 16 H19" />
        </Mark>
      );
    case "pilot-19":
      return (
        <Mark>
          <path d="M4.5 12 C7.5 7.5 16.5 7.5 19.5 12 C16.5 16.5 7.5 16.5 4.5 12 Z" />
          <circle cx="12" cy="12" r="1.6" />
        </Mark>
      );
    case "pilot-20":
      return (
        <Mark>
          <path d="M12 4 L13.6 10.4 L20 12 L13.6 13.6 L12 20 L10.4 13.6 L4 12 L10.4 10.4 Z" />
        </Mark>
      );
    default:
      return (
        <Mark>
          <path d="M5 16 L12 8 L19 16" />
          <path d="M7.5 16 L12 11 L16.5 16" />
        </Mark>
      );
  }
}
