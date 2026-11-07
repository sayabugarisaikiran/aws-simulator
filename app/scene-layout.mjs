export function layoutScene(nodes){
 const positions={};const subs=nodes.filter(n=>n.type==='subnet');
 for(const n of nodes){if(n.type==='vpc')continue;positions[n.id]={x:((n.x??300)-350)/60,z:((n.y??200)-300)/60,y:.55};}
 for(const s of subs){positions[s.id].y=.3;}
 for(const n of nodes){if(n.type==='nat'&&positions[n.subnet]){const s=positions[n.subnet];positions[n.id]={x:s.x+.8,z:s.z,y:.9};}if(n.type==='route'){const s=subs.find(s=>s.route===n.id);if(s){const p=positions[s.id];positions[n.id]={x:p.x,z:p.z+2.6,y:.65};}}}
 positions.internet={x:0,y:1.1,z:-7};
 return positions;
}
export function cameraOrbit(start,dx,dy){return {angle:start.angle-dx*.35,tilt:Math.max(5,Math.min(80,start.tilt+dy*.25))};}
