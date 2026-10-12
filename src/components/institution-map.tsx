"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import {
  institutionById,
  institutionMap,
  institutionRelations,
  sources,
  type Institution,
} from "@/data/institution-map";

type View = "tree" | "graph";
type TreeNodeProps = {
  node: Institution;
  childrenByParent: Map<string, Institution[]>;
  expanded: Set<string>;
  selectedId: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  depth: number;
};

function TreeNode({ node, childrenByParent, expanded, selectedId, onSelect, onToggle, depth }: TreeNodeProps) {
  const children = childrenByParent.get(node.id) ?? [];
  const isExpanded = expanded.has(node.id);
  return (
    <li className="institution-tree-node">
      <div className={`institution-tree-row${selectedId === node.id ? " is-selected" : ""}`} style={{ "--tree-depth": depth } as CSSProperties}>
        {children.length > 0 ? (
          <button
            className="institution-tree-expand"
            type="button"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.name}`}
            aria-expanded={isExpanded}
            onClick={() => onToggle(node.id)}
          >
            <span aria-hidden="true">{isExpanded ? "⌄" : "›"}</span>
          </button>
        ) : <span className="institution-tree-spacer" aria-hidden="true" />}
        <button
          className="institution-tree-select"
          type="button"
          aria-current={selectedId === node.id ? "true" : undefined}
          onClick={() => onSelect(node.id)}
        >
          <span>{node.name}</span>
          <small>{node.kind}</small>
        </button>
      </div>
      {children.length > 0 && isExpanded && (
        <ul className="institution-tree-children">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              childrenByParent={childrenByParent}
              expanded={expanded}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function twoLines(value: string): [string, string] {
  if (value.length <= 27) return [value, ""];
  const splitAt = value.lastIndexOf(" ", 27);
  if (splitAt < 10) return [`${value.slice(0, 25)}…`, ""];
  const first = value.slice(0, splitAt);
  const rest = value.slice(splitAt + 1);
  return [first, rest.length > 27 ? `${rest.slice(0, 25)}…` : rest];
}

function GraphNode({
  x,
  y,
  width,
  height,
  institution,
  active,
  expanded,
  expandable,
  onClick,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  institution: Institution;
  active?: boolean;
  expanded?: boolean;
  expandable?: boolean;
  onClick?: () => void;
}) {
  const [lineOne, lineTwo] = twoLines(institution.name);
  let actionLabel = "Select and center on";
  if (expandable) actionLabel = expanded ? "Keep expanded and center on" : "Expand and center on";
  return (
    <g
      className={`institution-graph-node${active ? " is-active" : ""}${onClick ? " is-clickable" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${actionLabel} ${institution.name}` : institution.name}
      onClick={onClick}
      onKeyDown={onClick ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <title>{institution.name}</title>
      <rect x={x} y={y} width={width} height={height} rx="10" />
      <text x={x + 13} y={y + 23}>
        <tspan x={x + 13}>{lineOne}</tspan>
        {lineTwo && <tspan x={x + 13} dy="16">{lineTwo}</tspan>}
      </text>
      <text className="institution-graph-kind" x={x + 13} y={y + height - 10}>{institution.kind.toUpperCase()}</text>
      {expandable && <text className="institution-graph-expand-mark" x={x + width - 19} y={y + 23}>{expanded ? "⌄" : "+"}</text>}
    </g>
  );
}

type GraphPosition = { node: Institution; x: number; y: number; depth: number };
type PanState = { x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; panX: number; panY: number };

const graphNodeWidth = 238;
const graphNodeHeight = 76;

function InstitutionGraph({
  focusId,
  selectedId,
  childrenByParent,
  expanded,
  onSelect,
  onExpand,
  onBackToTree,
  onReset,
}: {
  focusId: string;
  selectedId: string;
  childrenByParent: Map<string, Institution[]>;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onBackToTree: () => void;
  onReset: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const layout = useMemo(() => {
    const root = institutionMap.find((institution) => institution.parentId === null) ?? institutionMap[0];
    const positions = new Map<string, GraphPosition>();
    let leafY = 48;
    let maxDepth = 0;

    function place(node: Institution, depth: number): number {
      maxDepth = Math.max(maxDepth, depth);
      const children = expanded.has(node.id) ? childrenByParent.get(node.id) ?? [] : [];
      let y: number;
      if (children.length === 0) {
        y = leafY;
        leafY += 112;
      } else {
        const childYs = children.map((child) => place(child, depth + 1));
        y = childYs.reduce((total, childY) => total + childY, 0) / childYs.length;
      }
      positions.set(node.id, { node, x: 56 + depth * 300, y, depth });
      return y;
    }

    place(root, 0);
    return {
      positions,
      width: Math.max(1100, 56 + maxDepth * 300 + graphNodeWidth + 100),
      height: Math.max(660, leafY + 32),
    };
  }, [childrenByParent, expanded]);

  const centerNode = useCallback((id: string) => {
    const position = layout.positions.get(id);
    const viewport = viewportRef.current;
    if (!position || !viewport) return;
    const bounds = viewport.getBoundingClientRect();
    setPan({
      x: bounds.width / 2 - (position.x + graphNodeWidth / 2),
      y: bounds.height / 2 - position.y,
    });
  }, [layout]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => centerNode(focusId));
    return () => window.cancelAnimationFrame(frame);
  }, [centerNode, focusId]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as Element).closest(".institution-graph-node")) return;
    const viewport = event.currentTarget;
    viewport.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setIsDragging(true);
    event.preventDefault();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan({ x: drag.panX + event.clientX - drag.startX, y: drag.panY + event.clientY - drag.startY });
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setPan((current) => ({ x: current.x - event.deltaX, y: current.y - event.deltaY }));
  }

  const visiblePositions = [...layout.positions.values()];
  const positionById = layout.positions;
  const structuralEdges = visiblePositions.flatMap(({ node }) => {
    const parent = node.parentId ? positionById.get(node.parentId) : undefined;
    return parent ? [{ key: `tree-${parent.node.id}-${node.id}`, from: parent, to: positionById.get(node.id)! }] : [];
  });
  const visibleIds = new Set(positionById.keys());
  const crossEdges = institutionRelations.filter((relation) => visibleIds.has(relation.from) && visibleIds.has(relation.to));

  return (
    <>
      <div
        ref={viewportRef}
        className={`institution-graph-viewport${isDragging ? " is-dragging" : ""}`}
        role="region"
        aria-label="Draggable institution graph"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onWheel={handleWheel}
      >
        <div
          className="institution-graph-canvas"
          style={{ width: layout.width, height: layout.height, transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-label="Expanded institution hierarchy graph">
            <g className="institution-graph-edges" aria-hidden="true">
              {structuralEdges.map(({ key, from, to }) => (
                <line key={key} x1={from.x + graphNodeWidth} y1={from.y} x2={to.x} y2={to.y} />
              ))}
              {crossEdges.map((relation) => {
                const from = positionById.get(relation.from)!;
                const to = positionById.get(relation.to)!;
                return <line className="institution-graph-cross-edge" key={`relation-${relation.from}-${relation.to}`} x1={from.x + graphNodeWidth / 2} y1={from.y} x2={to.x + graphNodeWidth / 2} y2={to.y} />;
              })}
            </g>
            {visiblePositions.map(({ node, x, y }) => {
              const expandable = (childrenByParent.get(node.id)?.length ?? 0) > 0;
              return (
                <GraphNode
                  key={node.id}
                  x={x}
                  y={y - graphNodeHeight / 2}
                  width={graphNodeWidth}
                  height={graphNodeHeight}
                  institution={node}
                  active={selectedId === node.id}
                  expandable={expandable}
                  expanded={expanded.has(node.id)}
                  onClick={() => {
                    onSelect(node.id);
                    if (expandable) onExpand(node.id);
                    centerNode(node.id);
                  }}
                />
              );
            })}
          </svg>
        </div>
      </div>
      <div className="institution-graph-floating-toolbar">
        <button className="button button-quiet" type="button" onClick={onBackToTree}>← Tree view</button>
        <span className="institution-graph-mode-label">GRAPH VIEW</span>
        <button className="button button-quiet" type="button" onClick={onReset}>Reset map</button>
      </div>
      <p className="institution-graph-help">Click a node to expand it and center it. Drag the background to move around the map.</p>
    </>
  );
}

function InstitutionDetails({ institution, floating = false }: { institution: Institution; floating?: boolean }) {
  const parent = institution.parentId ? institutionById.get(institution.parentId) : undefined;
  const crossLinks = institutionRelations.filter((relation) => relation.from === institution.id || relation.to === institution.id);
  return (
    <aside className={`institution-detail panel${floating ? " institution-detail-floating" : ""}`} aria-live="polite">
      <p className="eyebrow">INSTITUTION DETAILS</p>
      <h2>{institution.name}</h2>
      <span className="institution-kind-badge">{institution.kind}</span>
      <p className="institution-description">{institution.description}</p>
      {parent && <p className="institution-parent">Listed under <strong>{parent.name}</strong></p>}
      <div className="institution-detail-links">
        {institution.website ? (
          <a className="button button-dark" href={institution.website} target="_blank" rel="noreferrer">Official website <span aria-hidden="true">↗</span></a>
        ) : (
          <p className="institution-no-website">No direct website is recorded for this entry. Use the official directory to find its current portal.</p>
        )}
        {institution.directoryUrl && <a className="institution-source-link" href={institution.directoryUrl} target="_blank" rel="noreferrer">{institution.website ? "View source or directory entry" : "Find in official government directory"} ↗</a>}
      </div>
      {crossLinks.length > 0 && (
        <div className="institution-relations-list">
          <h3>How it connects</h3>
          {crossLinks.map((relation) => {
            const otherId = relation.from === institution.id ? relation.to : relation.from;
            const other = institutionById.get(otherId);
            const label = relation.from === institution.id ? relation.label : relation.reverseLabel ?? relation.label;
            return other ? <p key={`${relation.from}-${relation.to}`}><span>{label}</span><strong>{other.name}</strong></p> : null;
          })}
        </div>
      )}
    </aside>
  );
}

export function InstitutionMap() {
  const [view, setView] = useState<View>("tree");
  const [selectedId, setSelectedId] = useState("republic-of-india");
  const [focusId, setFocusId] = useState("republic-of-india");
  const [expanded, setExpanded] = useState(() => new Set(["republic-of-india"]));
  const [graphExpanded, setGraphExpanded] = useState(() => new Set(["republic-of-india"]));
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Institution[]>();
    for (const institution of institutionMap) {
      if (!institution.parentId) continue;
      const existing = map.get(institution.parentId) ?? [];
      existing.push(institution);
      map.set(institution.parentId, existing);
    }
    return map;
  }, []);
  const selected = institutionById.get(selectedId) ?? institutionMap[0];

  function selectInstitution(id: string) {
    setSelectedId(id);
    setFocusId(id);
    setGraphExpanded((current) => {
      const next = new Set(current);
      let parentId = institutionById.get(id)?.parentId ?? null;
      while (parentId) {
        next.add(parentId);
        parentId = institutionById.get(parentId)?.parentId ?? null;
      }
      if ((childrenByParent.get(id)?.length ?? 0) > 0) next.add(id);
      return next;
    });
  }

  function expandGraphNode(id: string) {
    setGraphExpanded((current) => new Set(current).add(id));
  }

  function resetGraph() {
    setSelectedId("republic-of-india");
    setFocusId("republic-of-india");
    setGraphExpanded(new Set(["republic-of-india"]));
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="institution-map-intro panel">
        <div>
          <p className="eyebrow">A CITIZEN'S GUIDE</p>
          <h2>How public institutions connect</h2>
          <p>This first map covers major constitutional structures, Union ministries and departments, all States and Union Territories, courts, selected constitutional bodies, and local-government tiers.</p>
        </div>
        <a className="institution-directory-cta" href={sources.directory} target="_blank" rel="noreferrer">Open the Government directory <span aria-hidden="true">↗</span></a>
      </div>

      <div className="institution-map-tabs" role="group" aria-label="Institution map view">
        <button type="button" aria-pressed={view === "tree"} className={view === "tree" ? "is-active" : ""} onClick={() => setView("tree")}>Tree view</button>
        <button type="button" aria-pressed={view === "graph"} className={view === "graph" ? "is-active" : ""} onClick={() => setView("graph")}>Graph view</button>
      </div>

      {view === "tree" ? (
        <div className="institution-map-layout">
          <section className="institution-tree-panel panel" aria-label="Institution hierarchy tree">
            <p className="institution-view-hint">Expand a branch to browse. Select any name to read about it.</p>
            <ul className="institution-tree-root">
              {institutionMap.filter((item) => item.parentId === null).map((node) => (
                <TreeNode key={node.id} node={node} childrenByParent={childrenByParent} expanded={expanded} selectedId={selectedId} onSelect={selectInstitution} onToggle={toggleExpanded} depth={0} />
              ))}
            </ul>
          </section>
          <InstitutionDetails institution={selected} />
        </div>
      ) : (
        <div className="institution-graph-layout" role="region" aria-label="Full-screen institution graph">
          <InstitutionGraph
            focusId={focusId}
            selectedId={selectedId}
            childrenByParent={childrenByParent}
            expanded={graphExpanded}
            onSelect={(id) => { setSelectedId(id); setFocusId(id); }}
            onExpand={expandGraphNode}
            onBackToTree={() => setView("tree")}
            onReset={resetGraph}
          />
          <InstitutionDetails institution={selected} floating />
        </div>
      )}

      <section className="institution-sources panel">
        <h2>Sources and coverage</h2>
        <p>Relationships are based on constitutional text and official government descriptions. Tree placement is a browsing aid; it does not by itself mean one body legally controls another. The State and Union Territory entries are jurisdiction-level links, and this version does not list every local body, district court, tribunal, or government organization.</p>
        <div className="institution-source-list">
          <a href={sources.constitution} target="_blank" rel="noreferrer">Constitution of India <span>↗</span></a>
          <a href={sources.allocationRules} target="_blank" rel="noreferrer">Cabinet Secretariat: Allocation of Business Rules <span>↗</span></a>
          <a href={sources.firstSchedule} target="_blank" rel="noreferrer">First Schedule: ministries and departments <span>↗</span></a>
          <a href={sources.directory} target="_blank" rel="noreferrer">Integrated Government Online Directory <span>↗</span></a>
          <a href={sources.highCourts} target="_blank" rel="noreferrer">Supreme Court: jurisdiction and High Courts <span>↗</span></a>
          <a href={sources.panchayatiRaj} target="_blank" rel="noreferrer">Ministry of Panchayati Raj <span>↗</span></a>
          <a href={sources.electionCommission} target="_blank" rel="noreferrer">Election Commission of India <span>↗</span></a>
          <a href={sources.upsc} target="_blank" rel="noreferrer">Union Public Service Commission <span>↗</span></a>
          <a href={sources.cag} target="_blank" rel="noreferrer">Comptroller and Auditor General <span>↗</span></a>
        </div>
      </section>
    </>
  );
}
