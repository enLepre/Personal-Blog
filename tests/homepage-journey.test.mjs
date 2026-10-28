import test from 'node:test';
import assert from 'node:assert/strict';
import { projection, clipPolyline, routeMotion, focusState, titleOpacity, DURATION } from '../src/lib/homepage-journey.mjs';

const cities=[[13.7768,45.6495],[13.0645,52.3906],[8.6724,49.3988],[8.5417,47.3769]];
test('drawing excludes invisible coastlines and preserves distinct boundary fragments',()=>{
  assert.deepEqual(clipPolyline([[-10,50],[50,50],[110,50]],100,100),[[[0,50],[50,50],[100,50]]]);
  assert.deepEqual(clipPolyline([[-10,-20],[-10,120]],100,100),[]);
  const parts=clipPolyline([[20,20],[120,20],[120,80],[20,80]],100,100);
  assert.equal(parts.length,2);assert.deepEqual(parts[1],[[100,80],[20,80]]);
});
test('final homepage is unselected with all four navigation titles available',()=>{
  const final=focusState(DURATION);
  assert.equal(final.index,-1);assert.equal(final.growth,0);assert.equal(final.text,0);
  assert.deepEqual(cities.map((_,i)=>titleOpacity(DURATION,i)),[1,1,1,1]);
  assert.ok(focusState(17.2).text>.9);
  assert.ok(focusState(18).text<.5);
});
test('each description fades away before the following description appears',()=>{
  for(let i=0;i<3;i++){
    const boundary=11.6+(i+1)*1.65;
    assert.equal(focusState(boundary-.01).text,0);
    assert.equal(focusState(boundary+.01).text,0);
  }
});
for(const width of [704,976,1024])test(`continuous route opens without crossings at ${width}px`,()=>{
  const layout=cities.map(projection(width,560));
  const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(let frame=0;frame<=200;frame++){
    const time=7.1+3.55*frame/200,motion=routeMotion(time,width,layout);
    const points=Array.from({length:73},(_,i)=>motion.point(i/24));
    assert.ok(points.flat().every(Number.isFinite));
    for(let i=0;i<72;i++)for(let j=i+2;j<72;j++){
      const crosses=orient(points[i],points[i+1],points[j])*orient(points[i],points[i+1],points[j+1])<0&&orient(points[j],points[j+1],points[i])*orient(points[j],points[j+1],points[i+1])<0;
      assert.equal(crosses,false,`crossing at ${time}`);
    }
  }
  // The old circle-stage boundary must have nonzero movement on both sides.
  const before=routeMotion(8.24,width,layout).point(0),after=routeMotion(8.26,width,layout).point(0);
  assert.ok(Math.hypot(after[0]-before[0],after[1]-before[1])>.1);
  const end=routeMotion(10.65,width,layout);
  cities.forEach((_,i)=>{assert.ok(Math.abs(end.point(i)[1]-275)<1e-8);assert.ok(Math.abs(end.point(i)[0]-(width*.875-width*.25*i))<1e-8);});
});
