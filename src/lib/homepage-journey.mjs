// Pure scroll geometry, shared by the homepage and its regression tests.
export const DURATION = 19;
export const clamp = n => Math.max(0, Math.min(1, n));
export const smooth = n => { const x = clamp(n); return x*x*x*(x*(x*6-15)+10); };
export const diamond = (x,y,r) => `${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}`;
const mercatorY = latitude => Math.log(Math.tan(Math.PI/4 + latitude*Math.PI/360));
export function viewportLayout(width,height,textHeight) {
  const compact=width<=664 || height<680;
  const top=compact?(height<500?68:88):110;
  const available=Math.max(160,height-top-24);
  const lineY=Math.max(90,Math.min(compact?260:275,available-textHeight-48));
  return {compact,top,lineY,mapHeight:compact?Math.min(500,available):560,
    descriptionHeight:Math.max(60,available-lineY-40),
    distance:compact?Math.round(Math.max(2600,Math.min(4500,height*6))):6000};
}
export function projection(width, height, {compact=false}={}) {
  const broad = Math.min((width-48)/(55*Math.PI/180), (height-56)/(mercatorY(72)-mercatorY(32)));
  const preferred = (broad + Math.min(width/.49,1400))/2;
  const scale = compact?Math.min(preferred,height*.9):preferred;
  return ([longitude,latitude]) => [width*.52+scale*(longitude-10.8)*Math.PI/180, height*.48-scale*(mercatorY(latitude)-mercatorY(50.5))];
}
// Clip before measuring ink length, so off-screen coastlines do not delay drawing.
export function clipPolyline(points,width,height) {
  const paths=[];let path=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1];
    let start=0,end=1,visible=true;
    for(const [p,q] of [[-dx,a[0]],[dx,width-a[0]],[-dy,a[1]],[dy,height-a[1]]]){
      if(p===0){if(q<0)visible=false;}
      else if(p<0)start=Math.max(start,q/p);
      else end=Math.min(end,q/p);
    }
    if(!visible||start>end){if(path.length>1)paths.push(path);path=[];continue;}
    const from=[a[0]+dx*start,a[1]+dy*start],to=[a[0]+dx*end,a[1]+dy*end];
    if(path.length&&Math.hypot(path.at(-1)[0]-from[0],path.at(-1)[1]-from[1])>.01){paths.push(path);path=[];}
    if(!path.length)path.push(from);path.push(to);
  }
  if(path.length>1)paths.push(path);return paths;
}
export function routeMotion(time, width, layout, {lineY=275,mapHeight=560}={}) {
  const progress = smooth((time-7.1)/3.55);
  // Overlapping deformation and opening: no stationary circular keyframe.
  const form = 1-(1-progress)**3, open = progress;
  const radius = Math.min(110,width*.22,mapHeight*.23), cx=width/2, cy=lineY;
  const sweep = 1.5*Math.PI*(1-open);
  const length = radius*1.5*Math.PI*(1-open)+width*.75*open;
  const base=cy+radius*(1-open);
  function point(t) {
    const i=Math.min(2,Math.floor(t)),v=t-i,a=layout[i],b=layout[i+1];
    const before=layout[Math.max(0,i-1)],after=layout[Math.min(3,i+2)];
    const bend=smooth((time-7.05)/.2);
    const original=[0,1].map(k=>{
      const c1=a[k]+(b[k]-a[k])/3*(1-bend)+(b[k]-before[k])/6*bend;
      const c2=b[k]-(b[k]-a[k])/3*(1-bend)-(after[k]-a[k])/6*bend;
      return (1-v)**3*a[k]+3*(1-v)**2*v*c1+3*(1-v)*v*v*c2+v**3*b[k];
    });
    const u=(t/3-.5)*sweep;
    const arc=sweep<.00001?[cx+(t/3-.5)*length,base]:[cx+length/sweep*Math.sin(u),base-2*length/sweep*Math.sin(u/2)**2];
    const destination=[2*cx-arc[0],2*cy-arc[1]];
    return original.map((n,k)=>n+(destination[k]-n)*form);
  }
  return {point,form,open};
}
export function focusState(time) {
  const elapsed=time-11.6;
  if(elapsed<0 || time>=18.6)return {index:-1,travel:0,growth:0,text:0,angle:360};
  const index=Math.min(3,Math.floor(elapsed/1.65)),local=elapsed-index*1.65;
  const grow=smooth(local/.3),shrink=smooth((local-(index===3?1.25:1))/.25);
  const travel=index===3?0:smooth((local-1.25)/.4);
  const text=smooth((local-.18)/.24)*(1-smooth((local-(index===3?1.25:1))/.2));
  return {index,travel,growth:grow*(1-shrink),text,angle:index*90+45*(grow+shrink)};
}
export const titleOpacity = (time,index) => smooth((time-(11.6+index*1.65)-.18)/.24);

// Smooth cubic interpolation through samples, including every career marker.
export function curvePath(points) {
  let d=`M${points[0]}`;
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+2)];
    const c1=a.map((n,k)=>n+(b[k]-before[k])/6),c2=b.map((n,k)=>n-(after[k]-a[k])/6);
    d+=`C${c1} ${c2} ${b}`;
  }
  return d;
}
