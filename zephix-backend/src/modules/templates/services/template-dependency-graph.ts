/**
 * TC-C1b (F1) — pure dependency-graph cycle detection for template instantiation.
 *
 * The work-management BFS cycle-check (task-dependencies.service.wouldCreateCycle)
 * reads committed rows through an injected tenant repository, so it cannot see a
 * brand-new dependency set being written inside the instantiate transaction.
 * Instantiate resolves the whole template dependency graph up front and validates
 * it here — in memory, deterministically — before writing any row. A cycle throws,
 * and the surrounding transaction rolls back atomically (no partial rows).
 *
 * Edge semantics match work_task_dependencies: predecessor -> successor.
 */

export interface DependencyEdge {
  predecessorId: string;
  successorId: string;
}

/**
 * Returns true if the directed graph (predecessor -> successor) contains a cycle.
 * Iterative DFS with a three-colour (white/grey/black) marking so a back-edge to a
 * node currently on the DFS stack signals a cycle. O(V + E).
 */
export function hasDependencyCycle(edges: DependencyEdge[]): boolean {
  const adjacency = new Map<string, string[]>();
  const nodes = new Set<string>();
  for (const { predecessorId, successorId } of edges) {
    nodes.add(predecessorId);
    nodes.add(successorId);
    const list = adjacency.get(predecessorId) ?? [];
    list.push(successorId);
    adjacency.set(predecessorId, list);
  }

  // 0 = unvisited (white), 1 = on stack (grey), 2 = done (black)
  const colour = new Map<string, number>();

  for (const start of nodes) {
    if (colour.get(start) === 2) continue;
    // Iterative DFS. Frame = [node, nextChildIndex].
    const stack: Array<[string, number]> = [[start, 0]];
    colour.set(start, 1);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const [node, idx] = frame;
      const children = adjacency.get(node) ?? [];
      if (idx < children.length) {
        frame[1] = idx + 1;
        const child = children[idx];
        const c = colour.get(child);
        if (c === 1) return true; // back-edge to a node on the stack -> cycle
        if (c === undefined) {
          colour.set(child, 1);
          stack.push([child, 0]);
        }
      } else {
        colour.set(node, 2);
        stack.pop();
      }
    }
  }
  return false;
}
