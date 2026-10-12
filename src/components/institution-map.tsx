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
  radius,
  color,
  institution,
  active,
  expanded,
  expandable,
  onClick,
}: {
  x: number;
  y: number;
  radius: number;
  color: string;
  institution: Institution;
  active?: boolean;
  expanded?: boolean;
  expandable?: boolean;
  onClick?: () => void;
}) {
  const [lineOne, lineTwo] = twoLines(institution.name);
  let actionLabel = "Select and center on";
  if (expandable) actionLabel = `${expanded ? "Collapse" : "Expand"} and center on`;
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
      {active && <circle className="institution-graph-node-halo" cx={x} cy={y} r={radius + 7} />}
      <circle className="institution-graph-node-dot" cx={x} cy={y} r={radius} style={{ fill: color }} />
      <text textAnchor="middle" x={x} y={y + radius + 18}>
        <tspan x={x}>{lineOne}</tspan>
        {lineTwo && <tspan x={x} dy="13">{lineTwo}</tspan>}
      </text>
      <text className="institution-graph-kind" textAnchor="middle" x={x} y={y + radius + (lineTwo ? 28 : 17)}>{institution.kind.toUpperCase()}</text>
      {expandable && (
        <g className="institution-graph-expand-control" aria-hidden="true">
          <circle cx={x + radius * 0.72} cy={y - radius * 0.72} r="8" />
          <text x={x + radius * 0.72} y={y - radius * 0.72 + 3.5}>{expanded ? "−" : "+"}</text>
        </g>
      )}
    </g>
  );
}

type GraphPosition = { node: Institution; x: number; y: number; depth: number; radius: number; color: string };
type PanState = { x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; panX: number; panY: number };

const graphMargin = 190;

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nodeColor(institution: Institution) {
  if (institution.id === "republic-of-india") return "#183e34";
  let branch = institution;
  while (branch.parentId && branch.parentId !== "republic-of-india") {
    branch = institutionById.get(branch.parentId) ?? branch;
  }
  if (branch.id === "state-and-ut-governments") return "#c5832e";
  if (branch.id === "judiciary") return "#7865b3";
  if (branch.id === "constitutional-bodies") return "#3484a2";
  if (branch.id === "local-self-government") return "#4d925e";
  return "#287c70";
}

function InstitutionGraph({
  focusId,
  selectedId,
  childrenByParent,
  expanded,
  onSelect,
  onToggle,
  onBackToTree,
  onReset,
}: {
  focusId: string;
  selectedId: string;
  childrenByParent: Map<string, Institution[]>;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onBackToTree: () => void;
  onReset: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const layout = useMemo(() => {
    const root = institutionMap.find((institution) => institution.parentId === null) ?? institutionMap[0];
    const nodes: Array<{ node: Institution; depth: number; branchId: string }> = [];
    const nodeById = new Map<string, Institution>();
    function collect(node: Institution, depth: number, branchId: string) {
      nodes.push({ node, depth, branchId });
      nodeById.set(node.id, node);
      const currentBranch = depth === 1 ? node.id : branchId;
      if (!expanded.has(node.id)) return;
      for (const child of childrenByParent.get(node.id) ?? []) collect(child, depth + 1, currentBranch);
    }
    collect(root, 0, root.id);

    const rootChildren = childrenByParent.get(root.id) ?? [];
    const rootAngleById = new Map(rootChildren.map((node, index) => [node.id, -Math.PI / 2 + (2 * Math.PI * index) / Math.max(1, rootChildren.length)]));
    const work: Array<{ node: Institution; depth: number; branchId: string; x: number; y: number; vx: number; vy: number; radius: number; labelRadius: number; color: string }> = [];
    const positionsSeed = new Map<string, { x: number; y: number }>();
    for (const { node, depth, branchId } of nodes) {
      const parent = node.parentId ? nodeById.get(node.parentId) : undefined;
      const parentPosition = parent ? positionsSeed.get(parent.id) : undefined;
      const angle = rootAngleById.get(node.id) ?? ((hashText(node.id) % 100000) / 100000) * Math.PI * 2;
      const siblings = node.parentId ? childrenByParent.get(node.parentId) ?? [] : [];
      const siblingSpread = Math.sqrt(Math.max(1, siblings.length));
      const distance = depth === 0 ? 0 : depth === 1 ? 360 : 116 + siblingSpread * 18 + (hashText(`${node.id}-radius`) % 110);
      const branchAngle = rootAngleById.get(branchId) ?? angle;
      const initialAngle = depth === 1 ? angle : angle + branchAngle * 0.3;
      const centerX = depth > 1 && parentPosition ? parentPosition.x : 0;
      const centerY = depth > 1 && parentPosition ? parentPosition.y : 0;
      const radius = node.id === root.id ? 29 : depth === 1 ? 23 : node.kind === "branch" ? 18 : 14;
      const item = {
        node,
        depth,
        branchId,
        x: depth === 0 ? 0 : centerX + Math.cos(initialAngle) * distance,
        y: depth === 0 ? 0 : centerY + Math.sin(initialAngle) * distance,
        vx: 0,
        vy: 0,
        radius,
        labelRadius: 38 + Math.min(node.name.length * 2.25, 112) + (node.name.length > 27 ? 10 : 0),
        color: nodeColor(node),
      };
      work.push(item);
      positionsSeed.set(node.id, item);
    }
    const itemById = new Map(work.map((item) => [item.node.id, item]));
    const links = work.flatMap((item) => {
      const parent = item.node.parentId ? itemById.get(item.node.parentId) : undefined;
      return parent ? [{ from: parent, to: item, distance: 190, strength: 0.012 }] : [];
    });
    for (const relation of institutionRelations) {
      const from = itemById.get(relation.from);
      const to = itemById.get(relation.to);
      if (from && to) links.push({ from, to, distance: 285, strength: 0.004 });
    }

    // A small deterministic force simulation spreads linked nodes into visible clusters.
    for (let iteration = 0; iteration < 95; iteration += 1) {
      for (let leftIndex = 0; leftIndex < work.length; leftIndex += 1) {
        const left = work[leftIndex];
        for (let rightIndex = leftIndex + 1; rightIndex < work.length; rightIndex += 1) {
          const right = work[rightIndex];
          let dx = right.x - left.x;
          let dy = right.y - left.y;
          let distance = Math.hypot(dx, dy);
          if (distance < 0.01) {
            dx = 0.01 * (leftIndex + 1);
            dy = 0.01 * (rightIndex + 1);
            distance = Math.hypot(dx, dy);
          }
          const minDistance = left.labelRadius + right.labelRadius + 14;
          const overlapForce = Math.max(0, minDistance - distance) * 0.025;
          const ambientForce = Math.min(0.014, 95 / (distance * distance));
          const force = overlapForce + ambientForce;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          if (left.node.id !== root.id) { left.vx -= fx; left.vy -= fy; }
          if (right.node.id !== root.id) { right.vx += fx; right.vy += fy; }
        }
      }
      for (const link of links) {
        let dx = link.to.x - link.from.x;
        let dy = link.to.y - link.from.y;
        const distance = Math.max(0.01, Math.hypot(dx, dy));
        const force = (distance - link.distance) * link.strength;
        dx = (dx / distance) * force;
        dy = (dy / distance) * force;
        if (link.from.node.id !== root.id) { link.from.vx += dx; link.from.vy += dy; }
        if (link.to.node.id !== root.id) { link.to.vx -= dx; link.to.vy -= dy; }
      }
      for (const item of work) {
        if (item.node.id === root.id) continue;
        const branchRoot = itemById.get(item.branchId);
        if (branchRoot && item.node.id !== item.branchId) {
          item.vx += (branchRoot.x - item.x) * 0.0009;
          item.vy += (branchRoot.y - item.y) * 0.0009;
        }
        item.vx *= 0.72;
        item.vy *= 0.72;
        const speed = Math.hypot(item.vx, item.vy);
        if (speed > 14) { item.vx = (item.vx / speed) * 14; item.vy = (item.vy / speed) * 14; }
        item.x += item.vx;
        item.y += item.vy;
      }
    }

    const minX = Math.min(...work.map((item) => item.x - item.labelRadius));
    const maxX = Math.max(...work.map((item) => item.x + item.labelRadius));
    const minY = Math.min(...work.map((item) => item.y - item.radius));
    const maxY = Math.max(...work.map((item) => item.y + item.radius + 58));
    const positions = new Map<string, GraphPosition>(work.map((item) => [item.node.id, {
      node: item.node,
      x: item.x - minX + graphMargin,
      y: item.y - minY + graphMargin,
      depth: item.depth,
      radius: item.radius,
      color: item.color,
    }]));
    return {
      positions,
      width: Math.max(1100, maxX - minX + graphMargin * 2),
      height: Math.max(760, maxY - minY + graphMargin * 2),
    };
  }, [childrenByParent, expanded]);

  const centerNode = useCallback((id: string) => {
    const position = layout.positions.get(id);
    const viewport = viewportRef.current;
    if (!position || !viewport) return;
    const bounds = viewport.getBoundingClientRect();
    setPan({
      x: bounds.width / 2 - position.x,
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
                <line key={key} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              ))}
              {crossEdges.map((relation) => {
                const from = positionById.get(relation.from)!;
                const to = positionById.get(relation.to)!;
                return <line className="institution-graph-cross-edge" key={`relation-${relation.from}-${relation.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
              })}
            </g>
            {visiblePositions.map(({ node, x, y, radius, color }) => {
              const expandable = (childrenByParent.get(node.id)?.length ?? 0) > 0;
              return (
                <GraphNode
                  key={node.id}
                  x={x}
                  y={y}
                  radius={radius}
                  color={color}
                  institution={node}
                  active={selectedId === node.id}
                  expandable={expandable}
                  expanded={expanded.has(node.id)}
                  onClick={() => {
                    onSelect(node.id);
                    if (expandable) onToggle(node.id);
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
      <p className="institution-graph-help">Click a node to expand or collapse its branch and center it. Drag the background to move around the network.</p>
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

  function toggleGraphNode(id: string) {
    setGraphExpanded((current) => {
      const next = new Set(current);
      if (!next.has(id)) {
        next.add(id);
        return next;
      }
      next.delete(id);
      function collapseDescendants(parentId: string) {
        for (const child of childrenByParent.get(parentId) ?? []) {
          next.delete(child.id);
          collapseDescendants(child.id);
        }
      }
      collapseDescendants(id);
      return next;
    });
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
            onToggle={toggleGraphNode}
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
