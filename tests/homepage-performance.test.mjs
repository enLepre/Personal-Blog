import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as geometry from '../src/lib/homepage-journey.mjs';

function fixture({reduced=false,mobile=false,screenWidth=mobile?390:1024,stageHeight=800}={}) {
  let measurements=0,now=100,pending;
  class Element {
    constructor(){this.style={setProperty(k,v){this[k]=v;}};this.attributes={};this.children=[];this.listeners={};this.inert=false;this.dataset={};this.offsetHeight=90;this.classes=new Set();this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};}
    setAttribute(k,v){this.attributes[k]=v;}
    append(node){this.children.push(node);}
    replaceChildren(){this.children=[];}
    addEventListener(name,handler,options){this.listeners[name]={handler,signal:options?.signal};}
    getTotalLength(){return 50;}
    getComputedTextLength(){return (this.textContent||'').length*7;}
    remove(){}
  }
  const title=new Element(),image=new Element(),hint=new Element(),host=new Element(),svg=new Element(),box=new Element();
  host.clientWidth=screenWidth-(screenWidth<=700?36:48);
  host.dataset.stops=JSON.stringify(['Trieste','Potsdam','Heidelberg','Zurich'].map((city,i)=>({city,longitude:[13.7768,13.0645,8.6724,8.5417][i],latitude:[45.6495,52.3906,49.3988,47.3769][i],title:'Postdoc',topic:'Chemistry'})));
  const links=Array.from({length:4},()=>{const link=new Element();link.marker=new Element();link.querySelector=()=>link.marker;return link;});
  const descriptions=Array.from({length:4},()=>new Element());
  const stage={get clientHeight(){measurements++;return stageHeight;}};
  const elements={'.home-stage':stage,'.home-title':title,'.home-landscape-motion':image,'.scroll-hint':hint,'.home-journey':host,'.journey-map':svg,'.journey-descriptions':box};
  const root=new Element();root.querySelector=s=>elements[s];root.querySelectorAll=s=>s==='.journey-link'?links:descriptions;
  root.getBoundingClientRect=()=>{measurements++;return {top:-window.scrollY};};
  const window=new Element();window.scrollY=0;window.innerWidth=screenWidth;window.innerHeight=stageHeight;
  const document={querySelector:()=>root,createElementNS:()=>new Element()};
  const media=new Element();media.matches=reduced;
  const source=readFileSync('src/scripts/homepage-journey.js','utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
  const cleanup=vm.runInNewContext(source+';initializeHomepage();',{
    ...geometry,boundaries:[[[0,40],[10,50],[10,60]]],document,window,AbortController,
    performance:{now:()=>now},matchMedia:()=>media,ResizeObserver:class{observe(){}disconnect(){}},
    requestAnimationFrame(callback){pending=callback;return 1;},cancelAnimationFrame(){pending=undefined;}
  });
  const flush=()=>{for(let i=0;pending&&i<100;i++){const cb=pending;pending=undefined;now+=20;cb(now);}assert.equal(pending,undefined,'animation settles without an idle loop');};
  const scrollTo=value=>{window.scrollY=value;window.listeners.scroll.handler();flush();};
  const event=(index,name)=>{links[index].listeners[name].handler({pointerType:'mouse'});flush();};
  return {root,links,descriptions,title,image,window,host,svg,cleanup,flush,scrollTo,event,measurements:()=>measurements,
    rotate(w,h){window.innerWidth=w;window.innerHeight=h;stageHeight=h;host.clientWidth=w-(w<=700?36:48);window.listeners.resize.handler();flush();}};
}
test('scroll reuses geometry measurements, reveals navigation, and ends empty',()=>{
  const f=fixture();assert.equal(f.measurements(),2);
  assert.equal(f.root.classes.has('is-vertical'),false,'desktop keeps its horizontal layout');
  assert.ok(f.links.every(link=>link.inert));
  f.scrollTo(5000);f.scrollTo(6960);
  assert.equal(f.measurements(),2);assert.ok(f.links.every(link=>!link.inert&&link.style.opacity==='1'));
  assert.ok(f.descriptions.every(p=>p.style.opacity==='0'));
  assert.ok(f.links.every(link=>!link.classes.has('is-selected')));
  const finalTransform=f.title.style.transform;
  f.scrollTo(6800);assert.equal(f.title.style.transform,finalTransform,'title remains settled');
  f.cleanup();assert.equal(f.window.listeners.scroll.signal.aborted,true);
});
for(const options of [{},{reduced:true},{mobile:true},{reduced:true,mobile:true}])test(`hover and keyboard reveal one description and clear it on exit ${JSON.stringify(options)}`,()=>{
  const f=fixture(options);f.scrollTo(6960);
  f.event(0,'pointerenter');assert.equal(f.descriptions[0].style.opacity,'1');
  assert.ok(f.links[0].classes.has('is-selected'));
  assert.match(f.links[0].marker.style.transform,/rotate\(90deg\)/);
  f.event(0,'pointerleave');assert.ok(f.descriptions.every(p=>p.style.opacity==='0'));
  assert.match(f.links[0].marker.style.transform,/rotate\(135deg\)/,'exit continues clockwise');
  f.event(2,'focus');assert.equal(f.descriptions[2].style.opacity,'1');
  assert.ok(f.descriptions.filter(p=>p.style.opacity!=='0').length===1);
  f.event(2,'blur');assert.ok(f.descriptions.every(p=>p.style.opacity==='0'));
  assert.equal(f.root.classes.has('is-animated'),!options.reduced);
  f.cleanup();
});
for(const [screenWidth,stageHeight] of [[320,568],[375,667],[390,844],[430,932],[844,390]])test(`phone animation draws, morphs and finishes at ${screenWidth}×${stageHeight}`,()=>{
  const f=fixture({screenWidth,stageHeight});
  assert.equal(f.root.classes.has('is-animated'),true);
  assert.equal(f.root.classes.has('is-compact'),true);
  assert.equal(f.root.classes.has('is-vertical'),true);
  assert.ok(f.svg.children.length>0,'map geometry exists');
  const distance=parseFloat(f.root.style.height)-stageHeight*2.2;
  f.scrollTo(stageHeight*1.2+distance*.25);
  assert.ok(f.links.every(link=>link.inert),'navigation cannot be tapped during the map phase');
  f.scrollTo(stageHeight*1.2+distance*12.2/19);
  assert.equal(f.descriptions[0].style.opacity,'1');
  const findRing=node=>node.attributes?.class==='journey-ring'?node:node.children?.map(findRing).find(Boolean);
  const ring=findRing(f.svg);
  const center=()=>{const points=ring.attributes.points.split(' ').map(pair=>pair.split(',').map(Number));return [points.reduce((sum,p)=>sum+p[0],0)/4,points.reduce((sum,p)=>sum+p[1],0)/4];};
  const researchPosition=center();
  assert.ok(Math.abs(researchPosition[0]-24)<.001);
  assert.ok(Math.abs(researchPosition[1]-28)<.001,'first menu node starts at the top');
  f.scrollTo(stageHeight*1.2+distance*13.85/19);
  const publicationsPosition=center();
  assert.ok(Math.abs(publicationsPosition[0]-researchPosition[0])<.001);
  assert.ok(publicationsPosition[1]>researchPosition[1],'selection moves down the vertical rail');
  f.scrollTo(stageHeight*1.2+distance);
  assert.ok(f.links.every(link=>!link.inert&&parseFloat(link.style.fontSize)>=24));
  assert.ok(f.descriptions.every(p=>p.style.opacity==='0'));
  const heightBefore=f.root.style.height,transformBefore=f.title.style.transform;
  f.window.innerHeight+=60;f.window.listeners.resize.handler();f.flush();
  assert.equal(f.root.style.height,heightBefore,'browser chrome must not change scroll distance');
  assert.equal(f.title.style.transform,transformBefore);
  f.rotate(stageHeight,screenWidth);
  assert.equal(f.root.classes.has('is-animated'),true,'rotation preserves animation');
  f.cleanup();
});
