import { createFileRoute, redirect } from "@tanstack/react-router";

/** Live ship market is the Market screen on the Gate. */
export const Route = createFileRoute("/market")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
