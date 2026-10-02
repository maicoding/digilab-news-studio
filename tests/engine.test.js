import test from 'node:test';
import assert from 'node:assert/strict';

const calls = [];
const context = () => ({
  font: '10px Arial', letterSpacing: '0px',
  measureText(value) { return {width: value.length * Number(this.font.match(/(\d+)px/)?.[1] ?? 10) / 2}; },
  save() {}, restore() {}, translate() {}, rotate() {}, clearRect() {}, fillRect() {},
  fillText(text) { calls.push({text, font: this.font}); },
});
globalThis.document = {createElement: () => ({getContext: context})};
const {measureLayerBounds, renderScene} = await import('../src/engine.js');
const textLayer = () => ({kind:'text', role:'headline', visible:true, opacity:1, blendMode:'source-over', blur:0,
  transform:{x:.5,y:.5,scale:1,rotation:0},
  text:{value:'AB',size:100,width:.8,weight:'700',leading:1,tracking:0,align:'left',italic:false,color:'#fff'}});

test('text scale doubles the selection bounds with the rendered font size', () => {
  const layer = textLayer();
  const one = measureLayerBounds({layer,width:1000,height:1000,getImage:()=>null});
  layer.transform.scale = 2;
  const two = measureLayerBounds({layer,width:1000,height:1000,getImage:()=>null});
  assert.equal(two.width, one.width * 2);
  assert.equal(two.height, one.height * 2);
});

test('rotation rotates asset selection bounds around the layer anchor', () => {
  const layer = {kind:'logo',visible:true,assetSrc:'logo',logo:{size:.2},transform:{x:.5,y:.5,scale:1,rotation:90}};
  const bounds = measureLayerBounds({layer,width:1000,height:1000,getImage:()=>({width:200,height:100})});
  assert.ok(Math.abs(bounds.width - 100) < .001);
  assert.ok(Math.abs(bounds.height - 200) < .001);
  assert.ok(Math.abs(bounds.x - 450) < .001);
  assert.ok(Math.abs(bounds.y - 400) < .001);
});

test('rendering preserves frozen scene data and uses italic, scale and chosen font', () => {
  const layer = textLayer(); layer.transform.scale=2; layer.text.italic=true;
  Object.freeze(layer.text); Object.freeze(layer.transform); Object.freeze(layer);
  const scene = Object.freeze({fontFamily:'Arial',background:{mode:'solid',colorA:'#000'},layers:Object.freeze([layer])});
  calls.length=0;
  renderScene({ctx:context(),width:1000,height:1000,scene,getImage:()=>null});
  assert.equal(calls[0].text,'AB');
  assert.match(calls[0].font,/italic 700 200px "Arial"/);
});

test('export renderer retains intermediate weights and uploaded font families', () => {
  const layer = textLayer(); layer.text.weight='500'; layer.text.italic=true;
  calls.length=0;
  renderScene({ctx:context(),width:1000,height:1000,scene:{fontFamily:'UploadFont123',typoAdvanced:true,background:{mode:'solid',colorA:'#000'},layers:[layer]},getImage:()=>null});
  assert.match(calls[0].font,/italic 500 100px "UploadFont123"/);
});

test('generic font families remain CSS keywords for canvas rendering', () => {
  for (const family of ['serif','sans-serif','monospace']) {
    calls.length=0;
    renderScene({ctx:context(),width:1000,height:1000,scene:{fontFamily:family,background:{mode:'solid',colorA:'#000'},layers:[textLayer()]},getImage:()=>null});
    assert.ok(calls[0].font.includes(`px ${family},`));
  }
});
