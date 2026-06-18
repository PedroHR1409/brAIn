import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Button } from "@my-better-t-app/ui/components/button";
import { api, type ApiGraphNode, type ApiGraphEdge } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LayoutNode extends ApiGraphNode {
  x: number;
  y: number;
  r: number;
}

// ─── Force-directed layout ────────────────────────────────────────────────────

function computeLayout(nodes: ApiGraphNode[], W = 860, H = 540): LayoutNode[] {
  if (nodes.length === 0) return [];

  const pos = nodes.map((n) => ({
    ...n,
    x: W / 2 + (Math.random() - 0.5) * W * 0.7,
    y: H / 2 + (Math.random() - 0.5) * H * 0.7,
    r: Math.max(16, Math.min(44, 16 + n.connectionCount * 6)),
    vx: 0,
    vy: 0,
  }));

  const REPULSION = 4000;
  const GRAVITY = 0.015;
  const DAMPING = 0.85;

  for (let iter = 0; iter < 200; iter++) {
    for (const p of pos) { p.vx = 0; p.vy = 0; }

    // Repulsion
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = REPULSION / (d * d);
        pos[i].vx -= (dx / d) * f;
        pos[i].vy -= (dy / d) * f;
        pos[j].vx += (dx / d) * f;
        pos[j].vy += (dy / d) * f;
      }
    }

    // Center gravity
    for (const p of pos) {
      p.vx += (W / 2 - p.x) * GRAVITY;
      p.vy += (H / 2 - p.y) * GRAVITY;
    }

    // Apply + clamp
    for (const p of pos) {
      p.x = Math.max(p.r + 8, Math.min(W - p.r - 8, p.x + p.vx * DAMPING));
      p.y = Math.max(p.r + 8, Math.min(H - p.r - 8, p.y + p.vy * DAMPING));
    }
  }

  return pos;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR: Record<string, { fill: string; stroke: string }> = {
  permanent:  { fill: "#10B981", stroke: "#34D399" },
  literature: { fill: "#3B82F6", stroke: "#60A5FA" },
  fleeting:   { fill: "#A855F7", stroke: "#C084FC" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function KnowledgeGraph() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [edges, setEdges] = useState<ApiGraphEdge[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  async function load() {
    setLoading(true);
    setGraphError(null);
    try {
      const data = await api.vault.graph();
      const rawEdges = data.edges ?? [];
      setEdges(rawEdges);
      setNodes(computeLayout(data.nodes ?? []));
    } catch (e) {
      setGraphError(e instanceof Error ? e.message : "Failed to load graph");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="absolute top-3 left-4 z-10">
        <h2 className="text-sm font-semibold text-card-foreground">Knowledge Graph</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {nodes.length} notes · {edges.length} connections
        </p>
      </div>

      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <Button variant="outline" size="icon-sm" onClick={() => setScale((s) => Math.min(2, s + 0.15))}>
          <ZoomIn className="size-3.5" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}>
          <ZoomOut className="size-3.5" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Computing graph…</p>
          </div>
        </div>
      ) : graphError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-destructive font-medium">Failed to load graph</p>
          <p className="text-xs text-muted-foreground">{graphError}</p>
          <Button variant="outline" size="sm" onClick={load} className="mt-1">Retry</Button>
        </div>
      ) : nodes.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Create notes — they'll appear here even without connections.</p>
        </div>
      ) : (
        <svg
          viewBox="0 0 860 540"
          className="w-full h-full"
          style={{ transform: `scale(${scale})`, transformOrigin: "center", transition: "transform 0.2s" }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {edges.map((edge) => {
            const from = nodeMap[edge.fromNoteId];
            const to = nodeMap[edge.toNoteId];
            if (!from || !to) return null;
            const active = hovered === edge.fromNoteId || hovered === edge.toNoteId;
            return (
              <line
                key={`${edge.fromNoteId}-${edge.toNoteId}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={active ? "#A78BFA" : "#6B7280"}
                strokeWidth={active ? 2.5 : 1.5}
                strokeOpacity={active ? 1 : 0.65}
                className="transition-all duration-150"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isHov = hovered === node.id;
            const c = COLOR[node.type] ?? COLOR.fleeting;
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate({ to: "/notes/$id", params: { id: node.id } })}
                className="cursor-pointer"
              >
                <circle
                  cx={node.x} cy={node.y}
                  r={node.r + (isHov ? 3 : 0)}
                  fill={c.fill}
                  fillOpacity={isHov ? 0.95 : 0.75}
                  stroke={c.stroke}
                  strokeWidth={isHov ? 2.5 : 1.5}
                  filter={isHov ? "url(#glow)" : undefined}
                  className="transition-all duration-150"
                />
                <text
                  x={node.x} y={node.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#F9FAFB"
                  fontSize={node.r > 28 ? 9 : 8}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight={600}
                  className="pointer-events-none select-none"
                >
                  {node.title.length > 14 ? `${node.title.slice(0, 13)}…` : node.title}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-4 flex items-center gap-4">
        {(["permanent", "literature", "fleeting"] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: COLOR[type].fill }} />
            <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Tooltip hint */}
      {hovered && (
        <div className="absolute bottom-3 right-4 text-[10px] text-muted-foreground">
          Click to open note
        </div>
      )}
    </div>
  );
}
