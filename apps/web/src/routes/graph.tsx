import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";

export const Route = createFileRoute("/graph")({
  component: GraphPage,
});

function GraphPage() {
  return (
    <div className="flex h-full flex-col p-4 gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Knowledge Graph</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visualize as conexões entre suas notas
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <KnowledgeGraph />
      </div>
    </div>
  );
}
