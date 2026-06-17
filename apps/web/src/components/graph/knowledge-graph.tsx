import { useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@my-better-t-app/ui/components/button";

interface GraphNode {
  id: string;
  x: number;
  y: number;
  r: number;
  label: string;
  type: "hub" | "permanent" | "literature" | "fleeting";
}

interface GraphEdge {
  from: string;
  to: string;
}

const NODES: GraphNode[] = [
  { id: "center", x: 400, y: 290, r: 52, label: "🧠", type: "hub" },
  { id: "n1", x: 215, y: 165, r: 34, label: "PKM", type: "permanent" },
  { id: "n2", x: 590, y: 145, r: 32, label: "Zettelkasten", type: "permanent" },
  { id: "n3", x: 685, y: 310, r: 28, label: "Aprendizado", type: "literature" },
  { id: "n4", x: 580, y: 450, r: 28, label: "Projetos", type: "permanent" },
  { id: "n5", x: 205, y: 415, r: 26, label: "Daily Notes", type: "fleeting" },
  { id: "n6", x: 95, y: 285, r: 24, label: "Ideias", type: "fleeting" },
  { id: "n7", x: 330, y: 115, r: 26, label: "Livros", type: "literature" },
  { id: "n8", x: 480, y: 75, r: 22, label: "Artigos", type: "literature" },
  { id: "n9", x: 760, y: 210, r: 22, label: "Código", type: "permanent" },
  { id: "n10", x: 130, y: 165, r: 20, label: "PARA", type: "permanent" },
  { id: "n11", x: 720, y: 400, r: 18, label: "Podcasts", type: "literature" },
  { id: "n12", x: 310, y: 450, r: 18, label: "Reflexões", type: "fleeting" },
];

const EDGES: GraphEdge[] = [
  { from: "center", to: "n1" },
  { from: "center", to: "n2" },
  { from: "center", to: "n3" },
  { from: "center", to: "n4" },
  { from: "center", to: "n5" },
  { from: "center", to: "n6" },
  { from: "n1", to: "n7" },
  { from: "n1", to: "n10" },
  { from: "n2", to: "n7" },
  { from: "n2", to: "n8" },
  { from: "n3", to: "n9" },
  { from: "n3", to: "n8" },
  { from: "n3", to: "n11" },
  { from: "n4", to: "n12" },
  { from: "n5", to: "n12" },
  { from: "n6", to: "n10" },
];

const nodeColor: Record<GraphNode["type"], string> = {
  hub: "#7C3AED",
  permanent: "#10B981",
  literature: "#3B82F6",
  fleeting: "#F59E0B",
};

const nodeStroke: Record<GraphNode["type"], string> = {
  hub: "#A78BFA",
  permanent: "#34D399",
  literature: "#60A5FA",
  fleeting: "#FBBF24",
};

const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

export function KnowledgeGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl border border-border bg-card overflow-hidden">
      <div className="absolute top-3 left-4 z-10">
        <h2 className="text-sm font-semibold text-card-foreground">
          Knowledge Graph
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {NODES.length} notas · {EDGES.length} conexões
        </p>
      </div>

      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <Button variant="outline" size="icon-sm">
          <ZoomOut className="size-3.5" />
        </Button>
        <Button variant="outline" size="icon-sm">
          <ZoomIn className="size-3.5" />
        </Button>
        <Button variant="outline" size="icon-sm">
          <Maximize2 className="size-3.5" />
        </Button>
      </div>

      <svg
        viewBox="0 0 860 560"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4A1D96" stopOpacity="0.7" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {EDGES.map((edge) => {
          const from = nodeMap[edge.from];
          const to = nodeMap[edge.to];
          if (!from || !to) return null;
          const isActive =
            hoveredNode === edge.from || hoveredNode === edge.to;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isActive ? "#7C3AED" : "#2D2D3F"}
              strokeWidth={isActive ? 2 : 1.5}
              strokeOpacity={isActive ? 0.8 : 0.5}
              className="transition-all duration-200"
            />
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const isHovered = hoveredNode === node.id;
          const fill =
            node.type === "hub" ? "url(#hubGrad)" : nodeColor[node.type];
          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r + (isHovered ? 4 : 0)}
                fill={fill}
                fillOpacity={node.type === "hub" ? 1 : isHovered ? 0.9 : 0.75}
                stroke={nodeStroke[node.type]}
                strokeWidth={isHovered ? 2.5 : 1.5}
                filter={isHovered ? "url(#glow)" : undefined}
                className="transition-all duration-200"
              />
              <text
                x={node.x}
                y={node.type === "hub" ? node.y + 5 : node.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#FAFAFA"
                fontSize={node.type === "hub" ? 26 : node.r > 28 ? 10 : 8}
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight={600}
                className="pointer-events-none select-none"
              >
                {node.type === "hub" ? node.label : node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-4 flex items-center gap-4">
        {(
          [
            { type: "permanent", label: "Permanent" },
            { type: "literature", label: "Literature" },
            { type: "fleeting", label: "Fleeting" },
          ] as const
        ).map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: nodeColor[type] }}
            />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
