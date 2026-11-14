const zoneBounds = {
  A: { minX: 100, maxX: 274 },
  B: { minX: 440, maxX: 614 },
};

export function subnetPosition(subnet, x = subnet.x, y = subnet.y) {
  const zone = subnet.az === 'A' || subnet.az === 'B' ? zoneBounds[subnet.az] : undefined;
  return {
    x: Math.max(zone?.minX ?? 25, Math.min(zone?.maxX ?? 690, x ?? 120)),
    y: Math.max(zone ? 176 : 55, Math.min(zone ? 473 : 580, y ?? 335)),
  };
}

export function canvasNodes(nodes) {
  const positions = new Map(nodes.map(node => [
    node.id,
    node.type === 'subnet' ? { ...node, ...subnetPosition(node) } : node,
  ]));
  const bySubnet = new Map();
  for (const node of nodes) {
    if (node.type !== 'nat') continue;
    const host = positions.get(node.subnet);
    if (host?.type !== 'subnet') continue;
    const group = bySubnet.get(host.id) ?? [];
    group.push(node);
    bySubnet.set(host.id, group);
  }
  for (const [id, gateways] of bySubnet) {
    const host = positions.get(id);
    // The subnet face is 126 × 65. Fit associated gateways inside its lower half.
    const columns = Math.min(4, gateways.length);
    const rows = Math.ceil(gateways.length / columns);
    const size = Math.min(22, 29 / rows - 1);
    gateways.forEach((gateway, index) => {
      const x = host.x + 126 - (columns - index % columns) * (size + 3) - 4;
      const y = host.y + 33 + Math.floor(index / columns) * (size + 1);
      positions.set(gateway.id, { ...gateway, x, y, insetSize: size, hostName: host.name });
    });
  }
  return [...positions.values()];
}

export function removeResource(nodes, resource) {
  if (resource.type === 'vpc') return [];
  return nodes.filter(node => node.id !== resource.id)
    .map(node => node.acl === resource.id ? { ...node, acl: '' } : node);
}
