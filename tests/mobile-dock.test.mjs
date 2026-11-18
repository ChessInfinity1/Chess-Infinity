import {test} from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const bundle=await build({entryPoints:['components/chess/MobileDock.tsx'],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime']});const compiled={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);const Dock=compiled.exports.default;const render=(page,keyboardOpen=false,solid=false)=>renderToStaticMarkup(createElement(Dock,{page,keyboardOpen,solid,onNavigate(){}}));
test('keyboard-hidden mobile navigation is inert and removed from assistive navigation',()=>{const html=render('dashboard',true);assert.match(html,/<nav[^>]*inert=""/);assert.match(html,/<nav[^>]*aria-hidden="true"/);assert.equal((html.match(/<button/g)||[]).length,5);});
test('the current route remains truthful, auxiliary pages have no misleading active tab',()=>{for(const route of ['dashboard','learn','puzzles','play'])assert.equal((render(route).match(/aria-current="page"/g)||[]).length,1);const other=render('studio');assert.ok(other.includes('no-selection'));assert.ok(!other.includes('aria-current="page"'));assert.ok(render('dashboard',false,true).includes('solid'));});

test("More is a first-class tab with current-page semantics", () => {
  const html = render("more");
  assert.match(html, /<button[^>]*aria-current="page"[^>]*aria-label="More"/);
  assert.doesNotMatch(html, /aria-haspopup|aria-controls|no-selection/);
});
