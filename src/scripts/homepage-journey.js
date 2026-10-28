import boundaries from '../data/europe-boundaries.json';
import { DURATION, clamp, smooth, diamond, projection, clipPolyline, routeMotion, focusState, titleOpacity, curvePath, viewportLayout } from '../lib/homepage-journey.mjs';

export function initializeHomepage() {
  const root=document.querySelector('[data-home-scroll]');
  if(!root)return () => {};
  const stage=root.querySelector('.home-stage'),title=root.querySelector('.home-title');
  const image=root.querySelector('.home-landscape-motion'),hint=root.querySelector('.scroll-hint');
  const host=root.querySelector('.home-journey'),svg=root.querySelector('.journey-map');
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
  const attr=(node,values)=>{ for(const [name,value] of Object.entries(values))node.setAttribute(name,String(value)); return node; };
  const element=(name,parent,values={})=>{const node=document.createElementNS('http://www.w3.org/2000/svg',name);attr(node,values);parent.append(node);return node;};

  function drawMap() {
    const {compact,mapHeight}=viewport;
    svg.replaceChildren();attr(svg,{viewBox:`0 0 ${width} ${mapHeight}`});
    const project=projection(width,mapHeight,viewport),defs=element('defs',svg);
    for(const axis of ['x','y']) {
      const gradient=element('linearGradient',defs,{id:`journey-edge-${axis}`,x2:axis==='x'?'100%':'0%',y2:axis==='y'?'100%':'0%'});
      for(const [offset,opacity] of [['0%',0],['7%',1],['93%',1],['100%',0]])element('stop',gradient,{offset,'stop-color':'white','stop-opacity':opacity});
      const mask=element('mask',defs,{id:`journey-mask-${axis}`});element('rect',mask,{width,height:mapHeight,fill:`url(#journey-edge-${axis})`});
    }
    const land=element('g',element('g',svg,{mask:'url(#journey-mask-x)'}),{mask:'url(#journey-mask-y)'});
    strokes=boundaries.flatMap(line=>clipPolyline(line.map(project),width,mapHeight)).map(line=>{
      let points=line;
      const closed=Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<.01;
      if(closed){points.pop();let top=0;points.forEach((p,i)=>{if(p[1]<points[top][1])top=i;});points=[...points.slice(top),...points.slice(0,top)];points.push(points[0]);}
      else if(points.at(-1)[1]<points[0][1])points.reverse();
      const node=element('path',land,{class:'journey-land',d:'M'+points.map(p=>p.join(',')).join('L')});
      return {node,length:node.getTotalLength(),first:points[0]};
    }).filter(s=>s.length>.1).sort((a,b)=>a.first[1]-b.first[1]||a.first[0]-b.first[0]);
    inkLength=0;strokes.forEach(s=>{s.start=inkLength;inkLength+=s.length;attr(s.node,{'stroke-dasharray':`${s.length} ${s.length}`});});
    const route=element('g',svg),nodes=element('g',svg),text=element('g',svg);
    paths=Array.from({length:3},()=>element('path',route,{class:'journey-route',pathLength:1,'stroke-dasharray':'1 1'}));
    positions=stops.map(stop=>project([stop.longitude,stop.latitude]));
    pins=positions.map(()=>element('polygon',nodes,{class:'journey-pin'}));
    ring=element('polygon',nodes,{class:'journey-ring'});
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
  }

  function measure() {
    animated=!reduced.matches;
    root.classList.toggle('is-animated',animated);
    height=stage.clientHeight;width=host.clientWidth;
    root.classList.toggle('is-compact',width<=664||height<680);
    const maxText=Math.max(...descriptions.map(p=>p.offsetHeight));
    viewport=viewportLayout(width,height,maxText);
    rootTop=root.getBoundingClientRect().top+window.scrollY;
    root.style.height=animated?`${height*2.2+viewport.distance}px`:'';
    root.style.setProperty('--journey-top',`${viewport.top}px`);
    root.style.setProperty('--journey-line-y',`${viewport.lineY}px`);
    root.style.setProperty('--journey-map-height',`${viewport.mapHeight}px`);
    root.style.setProperty('--journey-description-height',`${viewport.descriptionHeight}px`);
    if(animated)drawMap();
    else {svg.replaceChildren();title.style.transform='';image.style.transform='';image.style.opacity='';image.style.visibility='';host.style.opacity='';}
    const box=root.querySelector('.journey-descriptions');
    box.style.minHeight=animated?'0':`${Math.max(160,maxText)}px`;
    box.style.height=animated?`${Math.min(maxText+8,viewport.descriptionHeight)}px`:'';
    needsMeasurement=false;
  }

  function paintMap() {
    const drawn=clamp((time-.08)/1.92)*inkLength,erased=clamp((time-5.7)/1.4)*inkLength;
    strokes.forEach(s=>{
      const visible=Math.max(0,Math.min(s.length,drawn-s.start)),removed=clamp((erased-s.start)/s.length)*s.length;
      attr(s.node,{'stroke-dashoffset':erased>0?-removed:s.length-visible,visibility:visible>0&&removed<s.length?'visible':'hidden'});
    });
    const motion=routeMotion(time,width,positions,viewport),points=positions.map((_,i)=>motion.point(i));
    paths.forEach((path,i)=>attr(path,{d:curvePath(Array.from({length:25},(_,j)=>motion.point(i+j/24))),'stroke-dashoffset':1-smooth((time-2.4-i-.12)/.66),visibility:time>2.4+i+.12?'visible':'hidden'}));
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
    let points;
    if(animated){
      const rise=clamp(progress/.8),settle=smooth((progress-.8)/.4);
      image.style.transform=`translate(-50%,${-rise*height*.65}px)`;
      image.style.opacity=String((.55+.45*rise)*(1-smooth((progress-.8)/.3)));
      image.style.visibility=progress>=1.1?'hidden':'visible';
      title.style.transform=`translate(-50%,${-settle*height*.14}px) scale(${1-settle*.48})`;
      hint.style.opacity=String(1-clamp(progress*4));
      host.style.opacity=progress>=1.2?'1':'0';points=paintMap();
    }
    const focus=focusState(time);
    links.forEach((link,i)=>{
      const reveal=animated?titleOpacity(time,i):1;
      link.style.opacity=String(reveal);link.style.visibility=reveal>0?'visible':'hidden';link.inert=reveal<.95;
      link.style.fontSize=animated?(viewport.compact?'18px':`${Math.min(32,(width/4-16)/5.8)}px`):'';
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
      markers[i].style.transform=`translate(-50%,-50%) rotate(${turns[i]}deg)`;
      markers[i].style.opacity=(!animated||manualIndex===i||exitUntil[i]>now)?'1':'0';
      const emphasis=manualIndex>=0?(manualIndex===i?1:0):(focus.index===i?focus.text:0);
      link.style.color=`color-mix(in srgb,var(--ink) ${emphasis*100}%,var(--muted))`;
    });
    if(animated){
      const show=focus.index>=0&&manualIndex<0&&!manualExiting;
      attr(ring,{opacity:show?1:0});
      if(show){
        const order=[...points].reverse(),from=order[focus.index],to=order[Math.min(3,focus.index+1)];
        const x=from[0]+(to[0]-from[0])*focus.travel,y=from[1]+(to[1]-from[1])*focus.travel;
        attr(ring,{points:diamond(x,y,5.5+12.5*focus.growth),transform:`rotate(${focus.angle} ${x} ${y})`,'stroke-opacity':focus.growth});
        ring.style.fill=`color-mix(in srgb,var(--ink) ${(1-focus.growth)*100}%,var(--paper))`;
      }
    }
    const desiredIndex=manualIndex>=0?manualIndex:focus.index;
    const desiredOpacity=manualIndex>=0?1:focus.text;
    const speed=reduced.matches?1:dt/180;
    if(textIndex!==desiredIndex){textOpacity=Math.max(0,textOpacity-speed);if(textOpacity===0)textIndex=desiredIndex;}
    else textOpacity+=Math.sign(desiredOpacity-textOpacity)*Math.min(Math.abs(desiredOpacity-textOpacity),speed);
    descriptions.forEach((p,i)=>{
      const opacity=i===textIndex?textOpacity:0;
      p.style.opacity=String(opacity);p.style.visibility=opacity>0?'visible':'hidden';
      p.style.transform=`translateY(${(1-opacity)*8}px)`;p.setAttribute('aria-hidden',String(opacity===0));
    });
    if(textIndex!==desiredIndex||Math.abs(textOpacity-desiredOpacity)>.001||manualExiting)schedule();
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
  document.fonts?.ready.then(()=>{if(!controller.signal.aborted)invalidate();});
  update();
  return ()=>{controller.abort();observer.disconnect();cancelAnimationFrame(frame);};
}
