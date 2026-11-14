const kinds = new Set(['vpc', 'subnet', 'route', 'igw', 'nat', 'eip', 'acl']);
const modes = ['example', 'custom'];

export function emptyDraft(nodes = []) {
  return {
    nodes,
    selected: nodes[0]?.id || '',
    source: nodes.find(n => n.type === 'subnet')?.id || '',
    history: [],
    zoom: .8,
    angle: -16,
    tilt: 35,
  };
}

function safeNodes(nodes) {
  if (!Array.isArray(nodes)) throw new Error('Saved workspace has no component list.');
  const ids = new Set();
  for (const node of nodes) {
    if (!node || typeof node.id !== 'string' || !node.id || ids.has(node.id) || !kinds.has(node.type)) {
      throw new Error('Saved workspace contains invalid or duplicate components.');
    }
    ids.add(node.id);
    for (const key of ['rules', 'routes']) {
      const rows = node[key];
      if (rows === undefined) continue;
      if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row) ||
        Object.values(row).some(value => typeof value !== 'string' && typeof value !== 'number'))) {
        throw new Error('Saved rules or routes are damaged.');
      }
    }
    for (const key of ['name', 'cidr', 'route', 'acl', 'subnet', 'eip', 'az']) {
      if (node[key] !== undefined && typeof node[key] !== 'string') {
        throw new Error('Saved component fields are damaged.');
      }
    }
    for (const key of ['x', 'y']) {
      if (node[key] !== undefined && !Number.isFinite(node[key])) {
        throw new Error('Saved component position is damaged.');
      }
    }
  }
  return nodes;
}

function restoreDraft(value, mode) {
  const base = emptyDraft(safeNodes(value.nodes));
  const history = value.history ?? [];
  if (!Array.isArray(history)) throw new Error('Saved undo history is damaged.');
  for (const entry of history.slice(-3)) {
    if (!entry || typeof entry !== 'object' || (entry.mode !== undefined && entry.mode !== mode)) {
      throw new Error('Saved undo history is damaged.');
    }
    safeNodes(entry.nodes);
  }
  return {
    ...base,
    ...value,
    selected: typeof value.selected === 'string' ? value.selected : base.selected,
    source: typeof value.source === 'string' ? value.source : base.source,
    history: history.slice(-3),
    zoom: Number.isFinite(value.zoom) ? Math.max(.4, Math.min(1.8, value.zoom)) : .8,
    angle: Number.isFinite(value.angle) ? value.angle : -16,
    tilt: Number.isFinite(value.tilt) ? Math.max(0, Math.min(80, value.tilt)) : 35,
  };
}

export function loadDrafts(data, exampleNodes) {
  const drafts = { example: emptyDraft(exampleNodes), custom: emptyDraft() };
  if (data === null || data === undefined) return { drafts, mode: 'example' };
  if (typeof data !== 'object' || !modes.includes(data.mode)) {
    throw new Error('Saved workspace format is damaged.');
  }
  if (data.drafts) {
    for (const mode of modes) {
      if (!data.drafts[mode]) throw new Error('A saved workspace is missing.');
      drafts[mode] = restoreDraft(data.drafts[mode], mode);
    }
  } else {
    drafts[data.mode] = emptyDraft(safeNodes(data.nodes));
  }
  return { drafts, mode: data.mode };
}

export function saveDraft(drafts, mode, snapshot) {
  return { ...drafts, [mode]: snapshot };
}
