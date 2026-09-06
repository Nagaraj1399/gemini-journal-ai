import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  BookOpen,
  Target,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Info,
} from 'lucide-react';
import { Conversation, Goal } from '../types';

interface ThoughtGraphViewProps {
  journals: Conversation[];
  goals: Goal[];
  onSelectJournal: (id: string) => void;
  onStartConversationWithTopic: (topic: string) => void;
}

interface Node {
  id: string;
  label: string;
  type: 'theme' | 'goal' | 'journal' | 'question';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  relatedIds: string[];
}

interface Edge {
  source: string;
  target: string;
}

export const ThoughtGraphView: React.FC<ThoughtGraphViewProps> = ({
  journals,
  goals,
  onSelectJournal,
  onStartConversationWithTopic,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'theme' | 'goal' | 'journal'>('all');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Compute graph data deterministically from user's authenticated journals & goals
  const { nodes, edges } = useMemo(() => {
    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];
    const themeSet = new Map<string, string[]>(); // theme -> journalIds

    // 1. Add Journal nodes & collect themes
    journals.slice(0, 14).forEach((j, idx) => {
      const jNodeId = `j-${j.id}`;
      rawNodes.push({
        id: jNodeId,
        label: j.title.slice(0, 24),
        type: 'journal',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 18,
        relatedIds: [j.id],
      });

      j.themes?.forEach((t) => {
        const norm = t.trim();
        if (!norm) return;
        if (!themeSet.has(norm)) themeSet.set(norm, []);
        themeSet.get(norm)!.push(jNodeId);
      });
    });

    // 2. Add Theme nodes (central connectors)
    Array.from(themeSet.entries()).slice(0, 10).forEach(([themeName, relatedJNodes]) => {
      const themeNodeId = `t-${themeName}`;
      rawNodes.push({
        id: themeNodeId,
        label: themeName,
        type: 'theme',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 22,
        relatedIds: relatedJNodes,
      });

      // Connect theme to its journals
      relatedJNodes.forEach((jId) => {
        rawEdges.push({ source: themeNodeId, target: jId });
      });
    });

    // 3. Add Goal nodes and connect to matching themes
    goals.slice(0, 8).forEach((g) => {
      const gNodeId = `g-${g.id}`;
      const matchingThemes: string[] = [];

      rawNodes.forEach((n) => {
        if (
          n.type === 'theme' &&
          (g.title.toLowerCase().includes(n.label.toLowerCase()) ||
            g.category.toLowerCase().includes(n.label.toLowerCase()))
        ) {
          matchingThemes.push(n.id);
        }
      });

      rawNodes.push({
        id: gNodeId,
        label: g.title.slice(0, 22),
        type: 'goal',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 20,
        relatedIds: matchingThemes,
      });

      matchingThemes.forEach((tId) => {
        rawEdges.push({ source: gNodeId, target: tId });
      });
    });

    // Arrange nodes in an organic circular layout
    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    const total = rawNodes.length;
    rawNodes.forEach((node, i) => {
      const angle = (i / (total || 1)) * 2 * Math.PI;
      const dist =
        node.type === 'theme'
          ? 100 + (i % 3) * 30
          : node.type === 'goal'
          ? 200 + (i % 2) * 20
          : 270 + (i % 2) * 25;

      node.x = centerX + Math.cos(angle) * dist;
      node.y = centerY + Math.sin(angle) * dist;
    });

    return { nodes: rawNodes, edges: rawEdges };
  }, [journals, goals]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Filtered nodes
  const displayNodes = nodes.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const nodeColorMap = {
    theme: { fill: '#06b6d4', stroke: '#22d3ee', text: '#ecfeff', label: 'Theme' },
    goal: { fill: '#10b981', stroke: '#34d399', text: '#f0fdf4', label: 'Goal' },
    journal: { fill: '#6366f1', stroke: '#818cf8', text: '#e0e7ff', label: 'Journal' },
    question: { fill: '#f59e0b', stroke: '#fbbf24', text: '#fffbeb', label: 'Question' },
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6" id="thought-graph-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              Cognitive Topology
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Interactive Thought Graph</h1>
          <p className="text-sm text-slate-400">
            Explore organic connections between your journal topics, recurring themes, active goals, and deep questions.
          </p>
        </div>

        {/* Filters & Zoom controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl p-1 text-xs">
            {(['all', 'theme', 'goal', 'journal'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  filterType === t
                    ? 'bg-cyan-600 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl p-1 text-xs text-slate-400">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
              className="p-1 hover:text-white"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 font-mono text-[11px]">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
              className="p-1 hover:text-white"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Visualizer Stage + Detail Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Canvas Area */}
        <div className="lg:col-span-8 rounded-2xl bg-slate-950/80 border border-white/5 p-4 overflow-hidden relative min-h-[520px] flex items-center justify-center">
          {/* Legend */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3 bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Themes
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Goals
            </span>
            <span className="flex items-center gap-1.5 text-indigo-300">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              Journals
            </span>
          </div>

          {nodes.length === 0 ? (
            <div className="text-center text-slate-500">
              <Share2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
              <p className="text-xs">No graph nodes yet. Save your first journal entries to populate connections.</p>
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <svg viewBox="0 0 800 500" className="w-full h-full max-h-[500px]">
                {/* Edges */}
                <g className="edges">
                  {edges.map((edge, idx) => {
                    const sourceNode = nodes.find((n) => n.id === edge.source);
                    const targetNode = nodes.find((n) => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    const isHighlighted =
                      selectedNodeId &&
                      (sourceNode.id === selectedNodeId || targetNode.id === selectedNodeId);

                    return (
                      <line
                        key={idx}
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke={isHighlighted ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}
                        strokeWidth={isHighlighted ? 2 : 1}
                        strokeDasharray={isHighlighted ? 'none' : '2,2'}
                      />
                    );
                  })}
                </g>

                {/* Nodes */}
                <g className="nodes">
                  {displayNodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const colors = nodeColorMap[node.type];

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNodeId(node.id)}
                        className="cursor-pointer group"
                      >
                        {/* Glow ring */}
                        {isSelected && (
                          <circle
                            r={node.radius + 6}
                            fill="none"
                            stroke={colors.stroke}
                            strokeWidth={2}
                            opacity={0.6}
                            className="animate-pulse"
                          />
                        )}

                        <circle
                          r={node.radius}
                          fill={colors.fill}
                          fillOpacity={isSelected ? 0.9 : 0.4}
                          stroke={colors.stroke}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          className="transition-all duration-200 group-hover:scale-110"
                        />

                        {/* Label */}
                        <text
                          dy=".3em"
                          textAnchor="middle"
                          fontSize="9"
                          fill="#ffffff"
                          fontWeight="bold"
                          pointerEvents="none"
                          className="select-none"
                        >
                          {node.label.slice(0, 10)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          )}
        </div>

        {/* Node Inspection Drawer */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/70 border border-white/5 p-5 flex flex-col justify-between min-h-[480px]">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase"
                  style={{
                    backgroundColor: `${nodeColorMap[selectedNode.type].fill}20`,
                    color: nodeColorMap[selectedNode.type].stroke,
                  }}
                >
                  {nodeColorMap[selectedNode.type].label} Node
                </span>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-1">{selectedNode.label}</h3>
                <p className="text-xs text-slate-400">
                  Node connected to {selectedNode.relatedIds.length} related element{selectedNode.relatedIds.length === 1 ? '' : 's'}.
                </p>
              </div>

              {/* Related journal entries or items */}
              {selectedNode.type === 'theme' && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-300">Associated Journal Entries:</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {journals
                      .filter((j) => (j.themes || []).includes(selectedNode.label))
                      .map((j) => (
                        <div
                          key={j.id}
                          onClick={() => onSelectJournal(j.id)}
                          className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 hover:border-cyan-500/30 cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-xs text-slate-200 group-hover:text-cyan-300 font-medium truncate max-w-[170px]">
                              {j.title}
                            </span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-white" />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {selectedNode.type === 'journal' && (
                <div className="pt-2">
                  <button
                    onClick={() => onSelectJournal(selectedNode.relatedIds[0])}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Open Full Journal Entry
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={() => onStartConversationWithTopic(selectedNode.label)}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Reflect on "{selectedNode.label.slice(0, 16)}"
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Info className="w-8 h-8 mb-2 opacity-30 text-cyan-400" />
              <h4 className="text-sm font-semibold text-slate-300 mb-1">Select Any Node</h4>
              <p className="text-xs">
                Click a theme, goal, or journal node on the graph to inspect connected reflections and launch a focused thinking session.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
