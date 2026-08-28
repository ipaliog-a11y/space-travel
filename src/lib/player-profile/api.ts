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
    return createPlayerProfile(context.userId, data);
  });
