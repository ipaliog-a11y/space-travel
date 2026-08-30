import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "../auth/middleware.ts";
import type { CreateProfileData, PlayerProfile } from "./types.ts";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PlayerProfile | null> => {
    const { getPlayerProfile } = await import("./server.ts");
    return getPlayerProfile(context.userId);
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: CreateProfileData) => data)
  .handler(async ({ context, data }): Promise<PlayerProfile> => {
    const { createPlayerProfile } = await import("./server.ts");
    const name = data.displayName.trim();
    const call = data.callSign.trim().toUpperCase();
    if (!name || call.length < 3) throw new Error("Name and call sign are required");
    if (name === "Pilot" && call === "PILOT") throw new Error("Pick a name and call sign of your own");
    return createPlayerProfile(context.userId, {
      displayName: name,
      callSign: call,
      iconId: data.iconId,
    });
  });
