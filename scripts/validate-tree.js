#!/usr/bin/env node
/**
 * Validates tree.json integrity rules from the FSAE Diagnostic Tool spec (Section 10).
 * Run: npm run validate
 */

const fs = require("fs");
const path = require("path");

const TREE_PATH = path.join(__dirname, "..", "tree.json");

function fail(errors) {
  console.error("Tree validation failed:\n");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

function success(message) {
  console.log(message);
}

function loadTree() {
  const raw = fs.readFileSync(TREE_PATH, "utf8");
  return JSON.parse(raw);
}

function collectReferencedIds(node) {
  const refs = [];

  if (node.next) refs.push(node.next);
  if (node.ifUnsolved) refs.push(node.ifUnsolved);
  if (Array.isArray(node.answers)) {
    node.answers.forEach((a) => {
      if (a.next) refs.push(a.next);
    });
  }

  return refs;
}

function validate(tree) {
  const errors = [];
  const nodes = tree.nodes;

  if (!nodes || typeof nodes !== "object") {
    fail(["tree.nodes must be an object"]);
  }

  if (!nodes.root) {
    errors.push('Root node "root" must exist');
  }

  const nodeIds = Object.keys(nodes);
  const idSet = new Set(nodeIds);

  if (nodeIds.length !== idSet.size) {
    errors.push("Node IDs must be unique across the entire tree");
  }

  for (const [id, node] of Object.entries(nodes)) {
    if (node.id !== id) {
      errors.push(`Node key "${id}" does not match node.id "${node.id}"`);
    }

    if (node.retired) continue;

    switch (node.type) {
      case "question":
        if (!Array.isArray(node.answers) || node.answers.length < 2) {
          errors.push(`Question node "${id}" must have at least two answers`);
        } else {
          node.answers.forEach((answer, index) => {
            if (!answer.next) {
              errors.push(`Question node "${id}" answer ${index} missing next`);
            }
          });
        }
        break;

      case "action":
        if (!node.next) {
          errors.push(`Action node "${id}" must have a next field`);
        }
        if (!node.confirmation) {
          errors.push(`Action node "${id}" must have a confirmation label`);
        }
        break;

      case "solution":
        if (!Object.prototype.hasOwnProperty.call(node, "ifUnsolved")) {
          errors.push(`Solution node "${id}" must have an ifUnsolved field (null is valid)`);
        }
        break;

      default:
        errors.push(`Node "${id}" has unknown type "${node.type}"`);
    }
  }

  const referenced = new Set();
  for (const node of Object.values(nodes)) {
    collectReferencedIds(node).forEach((ref) => referenced.add(ref));
  }

  for (const ref of referenced) {
    if (!idSet.has(ref)) {
      errors.push(`Referenced node "${ref}" does not exist in tree.json`);
    }
  }

  if (errors.length) fail(errors);

  success(
    `Tree valid: ${nodeIds.length} nodes, ${referenced.size} references checked.`
  );
}

validate(loadTree());
