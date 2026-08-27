import { createFileRoute } from "@tanstack/react-router";
import { Play } from "@/components/starwake/Play";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return <Play />;
}
