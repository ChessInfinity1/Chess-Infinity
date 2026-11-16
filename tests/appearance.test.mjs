import {test} from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {Chess} from 'chess.js';
import {boardPalettes,pieceStyles,colorThemes,normalizeAppearance} from '../lib/chess/appearance.ts';
const bundle=await build({stdin:{contents:'export {default as Board} from "./components/chess/Board";export {Piece,PieceStyleProvider} from "./components/chess/Piece";',resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react-dom','react/jsx-runtime']});const compiled={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);const {Board,Piece,PieceStyleProvider}=compiled.exports;
test('all piece sets render six distinct recognizable shapes in both colors and inherit into an entire board',()=>{
 for(const style of pieceStyles){for(const color of ['w','b']){const shapes=['k','q','r','b','n','p'].map(type=>renderToStaticMarkup(createElement(Piece,{type,color,style:style.id})));assert.equal(new Set(shapes).size,6);assert.ok(shapes.every(html=>html.includes(`data-piece-style="${style.id}"`)));}
  const html=renderToStaticMarkup(createElement(PieceStyleProvider,{value:style.id},createElement(Board,{fen:new Chess().fen(),onMove(){}})));assert.equal((html.match(new RegExp(`data-piece-style="${style.id}"`,'g'))||[]).length,32);
 }
});
test('every board palette applies its exact square colors and preserves square labels for both orientations',()=>{
 for(const palette of boardPalettes)for(const flipped of [false,true]){const html=renderToStaticMarkup(createElement(Board,{fen:new Chess().fen(),theme:palette.id,flipped,onMove(){}}));assert.ok(html.includes(`--square-light:${palette.light}`));assert.ok(html.includes(`--square-dark:${palette.dark}`));assert.ok(html.includes('e1 white king'));assert.ok(html.includes('e8 black king'));assert.equal((html.match(/data-square=/g)||[]).length,64);}
});
test('old or unknown appearance values safely fall back while valid combinations round trip',()=>{
 assert.deepEqual(normalizeAppearance(null),{theme:'light',colorTheme:'violet',boardTheme:'violet',pieceStyle:'classic'});assert.deepEqual(normalizeAppearance({theme:'invalid',colorTheme:'missing',boardTheme:'missing',pieceStyle:'missing'}),normalizeAppearance());
 for(const color of colorThemes)for(const board of boardPalettes)for(const piece of pieceStyles){const p={theme:'dark',colorTheme:color.id,boardTheme:board.id,pieceStyle:piece.id};assert.deepEqual(normalizeAppearance(JSON.parse(JSON.stringify(p))),p);}
});
