"use client"

import { useMemo } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react"

import type { RippleEdge, RippleNode } from "@/lib/ripple-engine"

type RippleGraphProps = {
  nodes: RippleNode[]
  edges: RippleEdge[]
  className?: string
}

const DEPTH_GAP = 260
const NODE_GAP = 120

function impactColor(score: number) {
  if (score >= 80) return "oklch(0.78 0.13 180)"
  if (score >= 55) return "oklch(0.78 0.16 85)"
  if (score >= 30) return "oklch(0.7 0.14 220)"
  return "oklch(0.66 0.012 240)"
}

function nodeSize(score: number) {
  return Math.max(96, Math.min(152, 88 + score * 0.64))
}

function buildFlowNodes(nodes: RippleNode[]): Node[] {
  const nodesByDepth = new Map<number, RippleNode[]>()

  for (const node of nodes) {
    const depthNodes = nodesByDepth.get(node.depth) ?? []
    depthNodes.push(node)
    nodesByDepth.set(node.depth, depthNodes)
  }

  return nodes.map((node) => {
    const depthNodes = nodesByDepth.get(node.depth) ?? []
    const indexInDepth = depthNodes.findIndex(
      (depthNode) => depthNode.entityId === node.entityId,
    )
    const size = nodeSize(node.impactScore)
    const color = impactColor(node.impactScore)

    return {
      id: node.entityId,
      position: {
        x: node.depth * DEPTH_GAP,
        y: indexInDepth * NODE_GAP,
      },
      data: {
        label: `${node.entityId}\n${node.impactScore.toFixed(1)}`,
      },
      style: {
        width: size,
        minHeight: 64,
        borderRadius: 14,
        border: `1px solid ${color}`,
        background:
          "linear-gradient(145deg, oklch(0.24 0.014 240 / 0.96), oklch(0.17 0.012 240 / 0.96))",
        boxShadow: `0 0 ${Math.round(node.impactScore / 4)}px ${color}55`,
        color: "oklch(0.96 0.005 240)",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.35,
        padding: "12px 14px",
        textAlign: "center",
        whiteSpace: "pre-line",
      },
    }
  })
}

function buildFlowEdges(edges: RippleEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: `${edge.relationshipType} ${edge.strength.toFixed(2)}`,
    animated: edge.strength > 0.75,
    style: {
      stroke: "oklch(0.78 0.13 180)",
      strokeOpacity: 0.48 + edge.strength * 0.28,
      strokeWidth: 1.4 + edge.strength * 1.8,
    },
    labelStyle: {
      fill: "oklch(0.78 0.13 180)",
      fontSize: 10,
      fontWeight: 600,
    },
    labelBgStyle: {
      fill: "oklch(0.16 0.012 240 / 0.86)",
      fillOpacity: 0.9,
    },
  }))
}

export function RippleGraph({ nodes, edges, className }: RippleGraphProps) {
  const flowNodes = useMemo(() => buildFlowNodes(nodes), [nodes])
  const flowEdges = useMemo(() => buildFlowEdges(edges), [edges])

  return (
    <div
      className={[
        "finripple-flow h-[420px] min-h-[320px] w-full overflow-hidden rounded-lg border border-border/80 bg-background/70",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={false}
      >
        <Background
          color="oklch(0.78 0.13 180 / 0.22)"
          gap={24}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) =>
            typeof node.style?.border === "string"
              ? node.style.border.replace("1px solid ", "")
              : "oklch(0.78 0.13 180)"
          }
        />
      </ReactFlow>
    </div>
  )
}
