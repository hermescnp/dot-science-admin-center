import type { Department } from '../api/types';

export const ROOT_NODE_ID = 'dot-science';
export const ROOT_NODE_WIDTH = 320;
export const DEPARTMENT_NODE_WIDTH = 280;

const SIBLING_GAP = 40;
const LEVEL_GAP = 240;

export interface OrgLayoutNode {
  id: string;
  position: { x: number; y: number };
  department: Department | null;
}

export interface OrgLayoutEdge {
  id: string;
  source: string;
  target: string;
}

/** Top-down tree: each parent is centred above its children, siblings sorted by position. */
export function layoutOrgChart(departments: Department[]) {
  const ids = new Set(departments.map((department) => department.id));
  const children = new Map<string, Department[]>();
  for (const department of departments) {
    // A dangling parent id would orphan the branch, so it hangs from the root instead.
    const parent =
      department.parentId && ids.has(department.parentId) ? department.parentId : ROOT_NODE_ID;
    children.set(parent, [...(children.get(parent) ?? []), department]);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }

  const widthOf = (id: string) => (id === ROOT_NODE_ID ? ROOT_NODE_WIDTH : DEPARTMENT_NODE_WIDTH);
  const subtreeWidths = new Map<string, number>();
  function measure(id: string): number {
    const kids = children.get(id) ?? [];
    const kidsWidth =
      kids.reduce((sum, kid) => sum + measure(kid.id), 0) +
      SIBLING_GAP * Math.max(kids.length - 1, 0);
    const width = Math.max(widthOf(id), kidsWidth);
    subtreeWidths.set(id, width);
    return width;
  }

  const nodes: OrgLayoutNode[] = [];
  const edges: OrgLayoutEdge[] = [];
  function place(id: string, department: Department | null, left: number, depth: number) {
    const width = subtreeWidths.get(id) ?? widthOf(id);
    nodes.push({
      id,
      department,
      position: { x: left + (width - widthOf(id)) / 2, y: depth * LEVEL_GAP }
    });

    const kids = children.get(id) ?? [];
    const kidsWidth =
      kids.reduce((sum, kid) => sum + (subtreeWidths.get(kid.id) ?? 0), 0) +
      SIBLING_GAP * Math.max(kids.length - 1, 0);
    let x = left + (width - kidsWidth) / 2;
    for (const kid of kids) {
      edges.push({ id: `${id}-${kid.id}`, source: id, target: kid.id });
      place(kid.id, kid, x, depth + 1);
      x += (subtreeWidths.get(kid.id) ?? 0) + SIBLING_GAP;
    }
  }

  measure(ROOT_NODE_ID);
  place(ROOT_NODE_ID, null, 0, 0);
  return { nodes, edges };
}
