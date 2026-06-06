/**
 * Ohm My God — lead editing & maintenance helpers (Phases 8–10)
 */
(function (global) {
  "use strict";

  function bumpVersion(tree) {
    const parts = String(tree.version || "1.0").split(".");
    const major = parts[0] || "1";
    const minor = parseInt(parts[1] || "0", 10) + 1;
    tree.version = `${major}.${minor}`;
    tree.lastModified = new Date().toISOString();
  }

  function createChangelogEntry(action, description, extra) {
    return {
      timestamp: new Date().toISOString(),
      editedBy: "Lead",
      action,
      description,
      ...extra
    };
  }

  function findReferrers(nodes, targetId) {
    const refs = [];
    for (const [id, node] of Object.entries(nodes)) {
      if (node.next === targetId) refs.push({ nodeId: id, via: "next" });
      if (node.ifUnsolved === targetId) refs.push({ nodeId: id, via: "ifUnsolved" });
      if (Array.isArray(node.answers)) {
        node.answers.forEach((answer, index) => {
          if (answer.next === targetId) refs.push({ nodeId: id, via: `answer_${index}` });
        });
      }
    }
    return refs;
  }

  function getDefaultRedirect(node) {
    if (node.next) return node.next;
    if (node.ifUnsolved) return node.ifUnsolved;
    if (node.answers?.[0]?.next) return node.answers[0].next;
    return null;
  }

  function retireNode(tree, nodeId, redirectTo) {
    const node = tree.nodes[nodeId];
    if (!node) throw new Error(`Node "${nodeId}" not found`);
    if (nodeId === "root") throw new Error("Cannot retire the root node");

    const refs = findReferrers(tree.nodes, nodeId);
    if (refs.length && !redirectTo) {
      throw new Error("Choose a redirect target — other nodes still point here");
    }

    for (const ref of refs) {
      const parent = tree.nodes[ref.nodeId];
      if (ref.via === "next") parent.next = redirectTo;
      else if (ref.via === "ifUnsolved") parent.ifUnsolved = redirectTo;
      else {
        const idx = parseInt(ref.via.split("_")[1], 10);
        parent.answers[idx].next = redirectTo;
      }
    }

    node.retired = true;
    bumpVersion(tree);
    return { refs, redirectTo };
  }

  function parseTags(input) {
    return String(input || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function applyNodeEdits(node, edits) {
    const updated = { ...node, text: edits.text };

    if (node.type === "question") {
      updated.answers = edits.answers.map((a, i) => ({
        label: a.label,
        next: a.next || node.answers[i]?.next
      }));
    } else if (node.type === "action") {
      updated.confirmation = edits.confirmation || "Done";
      updated.next = edits.next;
    } else if (node.type === "solution") {
      updated.tags = edits.tags || [];
      updated.ifUnsolved = edits.ifUnsolved;
    }

    return updated;
  }

  function getDeadEndHotspots(cases, nodes) {
    const counts = Object.create(null);

    for (const c of cases) {
      const path = c.path || [];
      if (!path.length) continue;
      const last = path[path.length - 1];
      const lastNode = nodes[last];
      if (lastNode?.type === "solution" && lastNode.ifUnsolved === null) {
        counts[last] = (counts[last] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([nodeId, count]) => ({ nodeId, count, node: nodes[nodeId] }))
      .filter((h) => h.count >= 1)
      .sort((a, b) => b.count - a.count);
  }

  function getFrequentlyAttemptedSolutions(cases) {
    const counts = Object.create(null);

    for (const c of cases) {
      for (const id of c.solutionsAttempted || []) {
        counts[id] = (counts[id] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([nodeId, count]) => ({ nodeId, count }))
      .filter((x) => x.count >= 2)
      .sort((a, b) => b.count - a.count);
  }

  function getMaintenanceSummary(app) {
    const pendingCount = app.pending.filter((p) => p.status === "pending").length;
    const unreviewedCases = app.cases.filter((c) => c.status === "unreviewed");
    const hotspots = getDeadEndHotspots(app.cases, app.tree.nodes).filter((h) => h.count >= 3);
    const failedSolutions = getFrequentlyAttemptedSolutions(app.cases);

    return {
      pendingCount,
      unreviewedCount: unreviewedCases.length,
      unreviewedCases,
      hotspots,
      failedSolutions,
      treeVersion: app.tree.version || "1.0"
    };
  }

  function listNodes(tree, filter) {
    const subsystem = filter?.subsystem || "";
    const search = (filter?.search || "").toLowerCase();

    return Object.entries(tree.nodes)
      .filter(([id, node]) => {
        if (subsystem && node.subsystem !== subsystem) return false;
        if (search && !id.toLowerCase().includes(search) && !node.text?.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      })
      .sort(([a], [b]) => a.localeCompare(b));
  }

  global.OhmgLeadTools = {
    bumpVersion,
    createChangelogEntry,
    findReferrers,
    getDefaultRedirect,
    retireNode,
    applyNodeEdits,
    parseTags,
    getDeadEndHotspots,
    getFrequentlyAttemptedSolutions,
    getMaintenanceSummary,
    listNodes
  };
})(window);
