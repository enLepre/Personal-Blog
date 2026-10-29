import boundaries from '../data/europe-boundaries.json';
import { DURATION, clamp, smooth, diamond, projection, clipPolyline, routeMotion, focusState, titleOpacity, curvePath, viewportLayout, timelinePan, simplifyLine } from '../lib/homepage-journey.mjs';

export function initializeHomepage() {
  const root=document.querySelector('[data-home-scroll]');
  if(!root)return () => {};
  const stage=root.querySelector('.home-stage'),title=root.querySelector('.home-title');
  const image=root.querySelector('.home-landscape-motion'),hint=root.querySelector('.scroll-hint');
  const host=root.querySelector('.home-journey'),svg=root.querySelector('.journey-map');
  const geography=root.querySelector('.journey-geography'),focusLayer=root.querySelector('.journey-focus');
  const links=[...root.querySelectorAll('.journey-link')];
  const markers=links.map(link=>link.querySelector('.journey-hover-marker'));
  const descriptions=[...root.querySelectorAll('.journey-description')];
  const stops=JSON.parse(host.dataset.stops);
  const controller=new AbortController(),options={signal:controller.signal};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let animated=false,width=0,height=0,rootTop=0,needsMeasurement=true;
  let viewport={compact:false,top:110,lineY:275,mapHeight:560,distance:6000};
  let frame=0,lastTime=0,time=0,pointerIndex=-1,keyboardIndex=-1;
  let strokes=[],inkLength=0,paths=[],pins=[],labels=[],positions=[],ring;
  let textIndex=-1,textOpacity=0,manualIndex=-1;
  const turns=[45,45,45,45],exitUntil=[0,0,0,0];
  const styles=new WeakMap();
  const style=(node,name,value)=>{let previous=styles.get(node);if(!previous){previous={};styles.set(node,previous);}if(previous[name]!==value){node.style[name]=value;previous[name]=value;}};
  const attributes=new WeakMap();
  const attr=(node,values)=>{ let previous=attributes.get(node);if(!previous){previous={};attributes.set(node,previous);}for(const [name,value] of Object.entries(values)){const next=String(value);if(previous[name]!==next){node.setAttribute(name,next);previous[name]=next;}} return node; };
  let lastInk='',lastGeometry=-1,lastPaint=-1,cachedPoints=[],mapReady=false,landGroup,textGroup;
  const element=(name,parent,values={})=>{const node=document.createElementNS('http://www.w3.org/2000/svg',name);attr(node,values);parent.append(node);return node;};

  function drawMap() {
    lastInk='';lastGeometry=-1;lastPaint=-1;cachedPoints=[];
    const {compact,mapHeight}=viewport;
    svg.replaceChildren();attr(svg,{viewBox:`0 0 ${width} ${viewport.vertical?Math.max(mapHeight,viewport.contentHeight):mapHeight}`});
    geography.replaceChildren();focusLayer.replaceChildren();
    attr(geography,{viewBox:`0 0 ${width} ${mapHeight}`});
    const project=projection(width,mapHeight,viewport),defs=element('defs',geography);
    for(const axis of ['x','y']) {
      const gradient=element('linearGradient',defs,{id:`journey-edge-${axis}`,x2:axis==='x'?'100%':'0%',y2:axis==='y'?'100%':'0%'});
      for(const [offset,opacity] of [['0%',0],['7%',1],['93%',1],['100%',0]])element('stop',gradient,{offset,'stop-color':compact?'var(--paper)':'white','stop-opacity':compact?1-opacity:opacity});
      const mask=element('mask',defs,{id:`journey-mask-${axis}`});element('rect',mask,{width,height:mapHeight,fill:`url(#journey-edge-${axis})`});
    }
    // On phones, paper-coloured edge overlays avoid two offscreen mask surfaces.
    const land=compact?element('g',geography):element('g',element('g',geography,{mask:'url(#journey-mask-x)'}),{mask:'url(#journey-mask-y)'});
    landGroup=land;
    strokes=boundaries.flatMap(line=>clipPolyline(line.map(project),width,mapHeight)).map(line=>{
      let points=compact?simplifyLine(line):line;
      const closed=Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<.01;
      if(closed){points.pop();let top=0;points.forEach((p,i)=>{if(p[1]<points[top][1])top=i;});points=[...points.slice(top),...points.slice(0,top)];points.push(points[0]);}
      else if(points.at(-1)[1]<points[0][1])points.reverse();
      const node=element('path',land,{class:'journey-land',d:'M'+points.map(p=>p.join(',')).join('L')});
      // These paths are polylines: calculate their exact length without forcing SVG layout.
      const length=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
      return {node,length,first:points[0]};
    }).filter(s=>s.length>.1).sort((a,b)=>a.first[1]-b.first[1]||a.first[0]-b.first[0]);
    inkLength=0;strokes.forEach(s=>{s.start=inkLength;inkLength+=s.length;attr(s.node,{'stroke-dasharray':`${s.length} ${s.length}`});});
    if(compact)for(const axis of ['x','y'])element('rect',land,{width,height:mapHeight,fill:`url(#journey-edge-${axis})`,'pointer-events':'none'});
    const route=element('g',svg),nodes=element('g',svg),text=element('g',svg);
    textGroup=text;
    paths=Array.from({length:3},()=>element('path',route,{class:'journey-route',pathLength:1,'stroke-dasharray':'1 1'}));
    positions=stops.map(stop=>project([stop.longitude,stop.latitude]));
    pins=positions.map(()=>element('polygon',nodes,{class:'journey-pin'}));
    // A tiny independent surface moves/scales without repainting the full-height route.
    ring=element('polygon',focusLayer,{class:'journey-ring',points:diamond(24,24,18),'vector-effect':'non-scaling-stroke'});
    labels=stops.map((stop,i)=>{
      const [x,y]=positions[i],left=i>=2,lx=x+(left?-1:1)*(compact?12:16),ly=y+((compact?[8,-35,-70,18]:[8,-22,-50,16])[i]);
      const group=element('g',text,{class:'journey-career'});
      const maxWidth=left?lx-8:width-lx-8;
      const wrap=(value,cls)=>{
        if(!compact)return [value];
        const probe=element('text',group,{class:cls,visibility:'hidden'}),result=[];let line='';
        for(const word of value.split(/\s+/)){
          const candidate=line?`${line} ${word}`:word;probe.textContent=candidate;
          if(line&&probe.getComputedTextLength()>maxWidth){result.push(line);line=word;}else line=candidate;
        }
        if(line)result.push(line);probe.remove();return result;
      };
      const lines=compact?wrap(stop.title,'journey-role'):(stop.title.length>20?stop.title.replace(/ and /,'|and ').split('|'):[stop.title]);
      const topics=compact?wrap(stop.topic,'journey-topic'):(stop.topic.length>26?stop.topic.replace(/ Processes$/,'|Processes').split('|'):[stop.topic]);
      const endY=Math.max(ly-4,Math.min(y,ly+(lines.length+topics.length)*20+18));
      element('path',group,{class:'journey-leader',d:`M${x},${y}L${lx+(left?8:-8)},${endY}`});
      const add=(value,y,cls)=>{element('text',group,{class:cls,x:lx,y,'text-anchor':left?'end':'start'}).textContent=value;};
      add(stop.city,ly,'journey-city');let cursor=ly+(compact?21:26);
      lines.forEach(line=>{add(line,cursor,'journey-role');cursor+=compact?18:20;});
      topics.forEach(line=>{add(line,cursor+2,'journey-topic');cursor+=compact?16:20;});return group;
    });
    mapReady=true;
  }

  function measure() {
    animated=!reduced.matches;
    root.classList.toggle('is-animated',animated);
    height=stage.clientHeight;width=host.clientWidth;
    root.classList.toggle('is-compact',width<=664||height<680);
    root.classList.toggle('is-vertical',width<=664||height<680);
    const maxText=Math.max(...descriptions.map(p=>p.offsetHeight));
    viewport=viewportLayout(width,height,maxText);
    rootTop=root.getBoundingClientRect().top+window.scrollY;
    root.style.height=animated?`${height*2.2+viewport.distance}px`:'';
    root.style.setProperty('--journey-top',`${viewport.top}px`);
    root.style.setProperty('--journey-line-y',`${viewport.lineY}px`);
    root.style.setProperty('--journey-map-height',`${viewport.mapHeight}px`);
    root.style.setProperty('--journey-svg-height',`${viewport.vertical?Math.max(viewport.mapHeight,viewport.contentHeight):viewport.mapHeight}px`);
    root.style.setProperty('--journey-description-height',`${viewport.descriptionHeight}px`);
    root.style.setProperty('--journey-line-x',`${viewport.lineX}px`);
    root.style.setProperty('--journey-line-start',`${viewport.lineStart}px`);
    root.style.setProperty('--journey-step-gap',`${viewport.stepGap}px`);
    root.style.setProperty('--journey-description-top',`${viewport.descriptionTop}px`);
    mapReady=false;
    if(!animated){svg.replaceChildren();geography.replaceChildren();focusLayer.replaceChildren();style(title,'transform','');style(image,'transform','');style(image,'opacity','');style(image,'visibility','');style(host,'opacity','');}
    const box=root.querySelector('.journey-descriptions');
    box.style.minHeight=animated?'0':`${Math.max(160,maxText)}px`;
    box.style.height=viewport.vertical?`${3*viewport.stepGap+maxText+8}px`:(animated?`${Math.min(maxText+8,viewport.descriptionHeight)}px`:'');
    descriptions.forEach((p,i)=>{style(p,'top',viewport.vertical?`${i*viewport.stepGap}px`:'');});
    needsMeasurement=false;
  }

  function paintMap() {
    if(time===lastPaint)return cachedPoints;
    lastPaint=time;
    const drawn=clamp((time-.08)/1.92)*inkLength,erased=clamp((time-5.7)/1.4)*inkLength;
    style(geography,'visibility',drawn>0&&erased<inkLength?'visible':'hidden');
    attr(textGroup,{display:time<7.1?'inline':'none'});
    const ink=`${drawn}:${erased}`;
    if(ink!==lastInk)strokes.forEach(s=>{
      const visible=Math.max(0,Math.min(s.length,drawn-s.start)),removed=clamp((erased-s.start)/s.length)*s.length;
      attr(s.node,{'stroke-dashoffset':erased>0?-removed:s.length-visible,visibility:visible>0&&removed<s.length?'visible':'hidden'});
    });
    lastInk=ink;
    // Geometry only changes during the map-to-menu morph, never during hover or reading.
    const geometryTime=Math.max(7.05,Math.min(10.65,time));
    if(geometryTime!==lastGeometry){
      const motion=routeMotion(geometryTime,width,positions,viewport);
      cachedPoints=positions.map((_,i)=>motion.point(i));
      const samples=viewport.compact?12:24;
      paths.forEach((path,i)=>attr(path,{d:geometryTime===7.05||geometryTime===10.65?`M${cachedPoints[i]}L${cachedPoints[i+1]}`:curvePath(Array.from({length:samples+1},(_,j)=>motion.point(i+j/samples)))}));
      lastGeometry=geometryTime;
    }
    const points=cachedPoints;
    paths.forEach((path,i)=>attr(path,{'stroke-dashoffset':1-smooth((time-2.4-i-.12)/.66),visibility:time>2.4+i+.12?'visible':'hidden'}));
    pins.forEach((pin,i)=>{
      const reveal=i===0?smooth((time-2.12)/.22):smooth((time-2.4-(i-1)-.8)/.16);
      attr(pin,{points:diamond(...points[i],5.5*reveal),opacity:reveal});
      attr(labels[i],{opacity:reveal*(1-smooth((time-6.65)/.45)),transform:`translate(0,${(1-reveal)*7})`});
    });
    return points;
  }

  function update(now=performance.now()) {
    frame=0;
    const dt=lastTime?Math.min(50,now-lastTime):16;lastTime=now;
    if(needsMeasurement)measure();
    const scroll=Math.max(0,window.scrollY-rootTop),progress=scroll/height;
    time=animated?DURATION*clamp((scroll-height*1.2)/viewport.distance):DURATION;
    const pan=animated?timelinePan(time,viewport):0;
    style(host,'transform',pan?`translate3d(0,${-pan}px,0)`:'');
    let points;
    if(animated){
      const rise=clamp(progress/.8),settle=smooth((progress-.8)/.4);
      style(image,'transform',`translate(-50%,${-rise*height*.65}px)`);
      style(image,'opacity',String((.55+.45*rise)*(1-smooth((progress-.8)/.3))));
      style(image,'visibility',progress>=1.1?'hidden':'visible');
      style(title,'transform',`translate(-50%,${-settle*height*.14}px) scale(${1-settle*.48})`);
      style(hint,'opacity',String(1-clamp(progress*4)));
      style(host,'opacity',progress>=1.2?'1':'0');
      // Let the hero render first. Prepare geography during its exit, before the map appears.
      if(!mapReady&&progress>=.8)drawMap();
      if(mapReady)points=paintMap();
    }
    const focus=focusState(time);
    links.forEach((link,i)=>{
      const reveal=animated?titleOpacity(time,i):1;
      style(link,'opacity',String(reveal));style(link,'visibility',reveal>0?'visible':'hidden');if(link.inert!==(reveal<.95))link.inert=reveal<.95;
      style(link,'fontSize',animated?(viewport.vertical?'24px':`${Math.min(32,(width/4-16)/5.8)}px`):'');
    });
    const requested=keyboardIndex>=0?keyboardIndex:pointerIndex;
    const nextManual=requested>=0&&!links[requested].inert?requested:-1;
    if(nextManual!==manualIndex){
      if(manualIndex>=0){turns[manualIndex]+=45;exitUntil[manualIndex]=now+320;}
      if(nextManual>=0)turns[nextManual]+=45;
      manualIndex=nextManual;
    }
    const manualExiting=exitUntil.some(t=>t>now);
    links.forEach((link,i)=>{
      link.classList.toggle('is-selected',manualIndex===i);
      style(markers[i],'transform',`translate(-50%,-50%) rotate(${turns[i]}deg)`);
      style(markers[i],'opacity',(!animated||manualIndex===i||exitUntil[i]>now)?'1':'0');
      const emphasis=manualIndex>=0?(manualIndex===i?1:0):(focus.index===i?focus.text:0);
      style(link,'color',`color-mix(in srgb,var(--ink) ${emphasis*100}%,var(--muted))`);
    });
    if(animated&&mapReady){
      const show=focus.index>=0&&manualIndex<0&&!manualExiting;
      style(focusLayer,'opacity',show?'1':'0');
      if(show){
        const order=[...points].reverse(),from=order[focus.index],to=order[Math.min(3,focus.index+1)];
        const x=from[0]+(to[0]-from[0])*focus.travel,y=from[1]+(to[1]-from[1])*focus.travel;
        style(focusLayer,'transform',`translate3d(${x-24}px,${y-24}px,0) rotate(${focus.angle}deg) scale(${(5.5+12.5*focus.growth)/18})`);
        attr(ring,{'stroke-opacity':focus.growth});
        style(ring,'fill',`color-mix(in srgb,var(--ink) ${(1-focus.growth)*100}%,var(--paper))`);
      }
    }
    const desiredIndex=manualIndex>=0?manualIndex:focus.index;
    const desiredOpacity=manualIndex>=0?1:focus.text;
    const speed=reduced.matches?1:dt/180;
    if(textIndex!==desiredIndex){textOpacity=Math.max(0,textOpacity-speed);if(textOpacity===0)textIndex=desiredIndex;}
    else textOpacity+=Math.sign(desiredOpacity-textOpacity)*Math.min(Math.abs(desiredOpacity-textOpacity),speed);
    descriptions.forEach((p,i)=>{
      const opacity=viewport.vertical?(animated?titleOpacity(time,i):1):(i===textIndex?textOpacity:0);
      style(p,'opacity',String(opacity));style(p,'visibility',opacity>0?'visible':'hidden');
      style(p,'transform',`translateY(${(1-opacity)*8}px)`);attr(p,{'aria-hidden':opacity===0});
    });
    if((!viewport.vertical&&(textIndex!==desiredIndex||Math.abs(textOpacity-desiredOpacity)>.001))||manualExiting)schedule();
    else lastTime=0;
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  links.forEach((link,i)=>{
    link.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;pointerIndex=i;schedule();},options);
    link.addEventListener('pointerleave',()=>{if(pointerIndex===i)pointerIndex=-1;schedule();},options);
    link.addEventListener('focus',()=>{keyboardIndex=i;schedule();},options);
    link.addEventListener('blur',()=>{if(keyboardIndex===i)keyboardIndex=-1;schedule();},options);
  });
  window.addEventListener('scroll',schedule,{...options,passive:true});
  const invalidate=()=>{needsMeasurement=true;schedule();};
  // 100svh stays stable when mobile browser bars move; do not re-map scroll progress.
  const resize=()=>{if(stage.clientHeight!==height||host.clientWidth!==width)invalidate();};
  window.addEventListener('resize',resize,options);
  reduced.addEventListener('change',invalidate,options);
  const observer=new ResizeObserver(entries=>{if(entries.some(entry=>entry.target===host&&Math.abs(entry.contentRect.width-width)>.5))resize();});
  observer.observe(host);
  if(document.fonts?.status==='loading')document.fonts.ready.then(()=>{if(!controller.signal.aborted)invalidate();});
  update();
  return ()=>{controller.abort();observer.disconnect();cancelAnimationFrame(frame);};
}
