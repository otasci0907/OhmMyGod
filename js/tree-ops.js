/**
 * Ohm My God — decision tree operations (Phases 5–7)
 */
(function (global) {
  "use strict";

  function buildAdjacency(nodes) {
    const adj = {};
    for (const [id, node] of Object.entries(nodes)) {
      if (node.retired) continue;
      const edges = [];
      if (node.next) edges.push(node.next);
      if (node.ifUnsolved) edges.push(node.ifUnsolved);
      if (Array.isArray(node.answers)) {
        node.answers.forEach((a) => {
          if (a.next) edges.push(a.next);
        });
      }
      adj[id] = edges;
    }
    return adj;
  }

  function findPathToNode(nodes, targetId) {
    if (!nodes[targetId]) return null;
    const adj = buildAdjacency(nodes);
    const queue = [["root"]];
    const visited = new Set(["root"]);

    while (queue.length) {
      const path = queue.shift();
      const current = path[path.length - 1];
      if (current === targetId) return path;
      for (const next of adj[current] || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(path.concat(next));
        }
      }
    }
    return null;
  }

  function maxSequenceForPrefix(ids, prefix) {
    let max = 0;
    for (const id of ids) {
      if (!id.startsWith(prefix)) continue;
      const suffix = id.slice(prefix.length);
      const num = parseInt(suffix, 10);
      if (!Number.isNaN(num)) max = Math.max(max, num);
    }
    return max;
  }

  function generateNodeId(tree, subsystem) {
    const ids = Object.keys(tree.nodes);
    const prefix = `${subsystem}_`;
    let max = 0;
    for (const id of ids) {
      if (!id.startsWith(prefix)) continue;
      const rest = id.slice(prefix.length);
      if (/^\d+$/.test(rest)) max = Math.max(max, parseInt(rest, 10));
      if (/^sol_\d+$/.test(rest)) max = Math.max(max, parseInt(rest.slice(4), 10));
    }
    return `${subsystem}_${String(max + 1).padStart(3, "0")}`;
  }

  function generateDeadEndId(tree, subsystem) {
    const prefix = `${subsystem}_deadend_`;
    const max = maxSequenceForPrefix(Object.keys(tree.nodes), prefix);
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }

  function generatePendingId(pending) {
    let max = 0;
    for (const p of pending) {
      const match = /^pending_(\d+)$/.exec(p.id);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    }
    return `pending_${String(max + 1).padStart(3, "0")}`;
  }

  function createDeadEndNode(id, subsystem) {
    return {
      id,
      type: "solution",
      subsystem,
      text: `No recorded fix for this ${subsystem} failure path.`,
      tags: [],
      ifUnsolved: null
    };
  }

  function getSubsystemFromAttachNode(tree, attachAfterNode) {
    const node = tree.nodes[attachAfterNode];
    return node?.subsystem || null;
  }

  function getNodesInSubsystem(tree, subsystem) {
    return Object.entries(tree.nodes)
      .filter(([, node]) => node.subsystem === subsystem && !node.retired)
      .map(([id]) => id)
      .sort();
  }

  function wireParent(tree, attachAfterNode, attachVia, newNodeId) {
    const parent = tree.nodes[attachAfterNode];
    if (!parent) throw new Error(`Attachment node "${attachAfterNode}" not found`);

    if (attachVia === "ifUnsolved") {
      parent.ifUnsolved = newNodeId;
      return;
    }

    const answerMatch = /^answer_(\d+)$/.exec(attachVia);
    if (answerMatch) {
      const idx = parseInt(answerMatch[1], 10);
      if (!parent.answers?.[idx]) {
        throw new Error(`Answer index ${idx} not found on node "${attachAfterNode}"`);
      }
      parent.answers[idx].next = newNodeId;
      return;
    }

    throw new Error(`Unknown attachVia value "${attachVia}"`);
  }

  function finalizeProposedNode(tree, proposedNode, newNodeId, subsystem) {
    const node = { ...proposedNode, id: newNodeId, subsystem };

    if (node.type === "question") {
      node.answers = (node.answers || []).map((answer) => {
        const deadId = generateDeadEndId(tree, subsystem);
        tree.nodes[deadId] = createDeadEndNode(deadId, subsystem);
        return { label: answer.label, next: deadId };
      });
    } else if (node.type === "action") {
      if (!node.next) {
        const deadId = generateDeadEndId(tree, subsystem);
        tree.nodes[deadId] = createDeadEndNode(deadId, subsystem);
        node.next = deadId;
      }
    } else if (node.type === "solution") {
      if (!Object.prototype.hasOwnProperty.call(node, "ifUnsolved")) {
        node.ifUnsolved = null;
      }
    }

    tree.nodes[newNodeId] = node;
    return node;
  }

  function applyApproval(tree, pendingEntry, proposedOverride) {
    const proposed = proposedOverride || pendingEntry.proposedNode;
    const subsystem =
      proposed.subsystem ||
      getSubsystemFromAttachNode(tree, pendingEntry.attachAfterNode);

    if (!subsystem) {
      throw new Error("Could not determine subsystem for new node");
    }

    const newNodeId = generateNodeId(tree, subsystem);
    finalizeProposedNode(tree, proposed, newNodeId, subsystem);
    wireParent(tree, pendingEntry.attachAfterNode, pendingEntry.attachVia, newNodeId);

    tree.lastModified = new Date().toISOString();
    const versionParts = String(tree.version || "1.0").split(".");
    const major = versionParts[0] || "1";
    const minor = parseInt(versionParts[1] || "0", 10) + 1;
    tree.version = `${major}.${minor}`;

    const path = findPathToNode(tree.nodes, pendingEntry.attachAfterNode) || [];
    const changelogEntry = {
      timestamp: new Date().toISOString(),
      editedBy: "Lead",
      action: "promoted",
      pendingRef: pendingEntry.id,
      newNodeId,
      description: `Added ${proposed.type} node after ${pendingEntry.attachAfterNode} via ${pendingEntry.attachVia}`
    };

    return { newNodeId, changelogEntry, pathPreview: path.concat("[NEW NODE]") };
  }

  function renderProposedNodePreview(proposed) {
    if (!proposed) return "";
    if (proposed.type === "question") {
      const answers = (proposed.answers || []).map((a) => a.label).join(" / ");
      return `Question: ${proposed.text}${answers ? ` → ${answers}` : ""}`;
    }
    if (proposed.type === "action") {
      return `Action: ${proposed.text}`;
    }
    return `Solution: ${proposed.text}`;
  }

  global.OhmgTreeOps = {
    findPathToNode: (nodes, targetId) => findPathToNode(nodes, targetId),
    generateNodeId,
    generateDeadEndId,
    generatePendingId,
    getNodesInSubsystem,
    applyApproval,
    renderProposedNodePreview,
    wireParent,
    finalizeProposedNode
  };
})(window);
