import { createFileRoute, redirect } from "@tanstack/react-router";

/** Parallel ownership dashboard removed — live hangar is the game hangar. */
export const Route = createFileRoute("/hangar")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
