"use client";

import { useMemo, useState, type CSSProperties } from "react";
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

type Neighbor = { node: Institution; label: string; side: "left" | "right" };

function graphNeighbors(id: string, childrenByParent: Map<string, Institution[]>): Neighbor[] {
  const focus = institutionById.get(id);
  if (!focus) return [];
  const neighbors = new Map<string, Neighbor>();
  if (focus.parentId) {
    const parent = institutionById.get(focus.parentId);
    if (parent) neighbors.set(parent.id, { node: parent, label: "category contains", side: "left" });
  }
  for (const child of childrenByParent.get(id) ?? []) {
    neighbors.set(child.id, { node: child, label: "grouped under", side: "right" });
  }
  for (const relation of institutionRelations) {
    if (relation.from === id) {
      const node = institutionById.get(relation.to);
      if (node) neighbors.set(node.id, { node, label: relation.label, side: "right" });
    } else if (relation.to === id) {
      const node = institutionById.get(relation.from);
      if (node) neighbors.set(node.id, { node, label: relation.reverseLabel ?? relation.label, side: "left" });
    }
  }
  return [...neighbors.values()];
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
  onClick,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  institution: Institution;
  active?: boolean;
  onClick?: () => void;
}) {
  const [lineOne, lineTwo] = twoLines(institution.name);
  return (
    <g
      className={`institution-graph-node${active ? " is-active" : ""}${onClick ? " is-clickable" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Focus on ${institution.name}` : institution.name}
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
    </g>
  );
}

function InstitutionGraph({ focusId, onSelect }: { focusId: string; onSelect: (id: string) => void }) {
  const focus = institutionById.get(focusId) ?? institutionMap[0];
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
  const neighbors = graphNeighbors(focus.id, childrenByParent);
  const left = neighbors.filter((neighbor) => neighbor.side === "left");
  const right = neighbors.filter((neighbor) => neighbor.side === "right");
  const rowGap = 88;
  const height = Math.max(360, Math.max(left.length, right.length) * rowGap + 100);
  const centerY = height / 2;
  const nodeY = (index: number, count: number) => centerY - ((count - 1) * rowGap) / 2 + index * rowGap;

  return (
    <div className="institution-graph-scroll" role="region" aria-label={`Institution connections around ${focus.name}`} tabIndex={0}>
      <svg className="institution-graph-canvas" viewBox={`0 0 1020 ${height}`} aria-label={`Graph centered on ${focus.name}`}>
        <g className="institution-graph-edges" aria-hidden="true">
          {left.map((neighbor, index) => {
            const y = nodeY(index, left.length) + 31;
            return <line key={`l-${neighbor.node.id}`} x1="290" y1={y} x2="410" y2={centerY} />;
          })}
          {right.map((neighbor, index) => {
            const y = nodeY(index, right.length) + 31;
            return <line key={`r-${neighbor.node.id}`} x1="680" y1={centerY} x2="730" y2={y} />;
          })}
        </g>
        {left.map((neighbor, index) => (
          <GraphNode key={neighbor.node.id} x={40} y={nodeY(index, left.length)} width={250} height={62} institution={neighbor.node} onClick={() => onSelect(neighbor.node.id)} />
        ))}
        <GraphNode x={410} y={centerY - 40} width={270} height={80} institution={focus} active />
        {right.map((neighbor, index) => (
          <GraphNode key={neighbor.node.id} x={730} y={nodeY(index, right.length)} width={250} height={62} institution={neighbor.node} onClick={() => onSelect(neighbor.node.id)} />
        ))}
      </svg>
      {neighbors.length > 0 && (
        <div className="institution-graph-relationships" aria-label="Relationship labels">
          {neighbors.map((neighbor) => (
            <button key={neighbor.node.id} type="button" onClick={() => onSelect(neighbor.node.id)}>
              <span>{neighbor.label}</span><strong>{neighbor.node.name}</strong>
            </button>
          ))}
        </div>
      )}
      {neighbors.length === 0 && <p className="institution-graph-empty">No mapped connections are available for this node yet.</p>}
    </div>
  );
}

function InstitutionDetails({ institution }: { institution: Institution }) {
  const parent = institution.parentId ? institutionById.get(institution.parentId) : undefined;
  const crossLinks = institutionRelations.filter((relation) => relation.from === institution.id || relation.to === institution.id);
  return (
    <aside className="institution-detail panel" aria-live="polite">
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
        <div className="institution-graph-layout">
          <section className="institution-graph-panel panel" aria-label="Institution relationship graph">
            <div className="institution-graph-heading">
              <div><p className="eyebrow">CONNECTED VIEW</p><h2>Explore from any institution</h2></div>
              <button className="button button-quiet" type="button" onClick={() => selectInstitution("republic-of-india")}>Start at the Republic</button>
            </div>
            <p className="institution-view-hint">Select a connected node to move through the map. The relationship list names why each connection exists.</p>
            <InstitutionGraph focusId={focusId} onSelect={selectInstitution} />
          </section>
          <InstitutionDetails institution={selected} />
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
