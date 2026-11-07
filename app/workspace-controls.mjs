/** Orthographic orbit: yaw is unbounded so full turns never jump backward. */
export function orbitView(start, dx, dy) {
  return { angle: start.angle + dx * .35, tilt: Math.max(0, Math.min(70, start.tilt - dy * .25)) };
}
/** Invert scale * rotateX(tilt) * rotateZ(angle) on the workspace plane. */
export function planeDelta(dx, dy, angle, tilt, scale) {
  const a=angle*Math.PI/180, t=tilt*Math.PI/180;
  const x=dx/scale, y=dy/scale/Math.cos(t);
  return {x:x*Math.cos(a)+y*Math.sin(a), y:-x*Math.sin(a)+y*Math.cos(a)};
}
/** Immutable snapshots: keep only the latest three completed edit boundaries. */
export function remember(history, snapshot) {return [...history.slice(-2), snapshot];}
