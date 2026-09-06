import { createFileRoute } from "@tanstack/react-router";
import { Play } from "@/components/starwake/Play";
import { PlayErrorBound } from "@/components/starwake/PlayErrorBound";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return (
    <PlayErrorBound>
      <Play />
    </PlayErrorBound>
  );
}
