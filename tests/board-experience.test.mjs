import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Chess} from 'chess.js';

const bundle=await build({entryPoints:['components/chess/Board.tsx'],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react-dom','react/jsx-runtime']});
const compiled={exports:{}};
new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
const Board=compiled.exports.default;
const render=(game,props={})=>renderToStaticMarkup(createElement(Board,{fen:game.fen(),onMove(){},...props}));

test('checkmate marker is attached to the defeated king for either color and board orientation',()=>{
 for(const line of [['f3','e5','g4','Qh4#'],['e4','e5','Bc4','Nc6','Qh5','Nf6','Qxf7#']]){
  const game=new Chess();for(const move of line)game.move(move);
  assert.equal(game.isCheckmate(),true);
  const king=game.board().flat().find(p=>p?.type==='k'&&p.color===game.turn()).square;
  for(const flipped of [false,true]){
   const html=render(game,{flipped});
   assert.equal((html.match(/class="square [^"]*checkmated-king/g)||[]).length,1);
   assert.ok(html.includes(`data-square="${king}"`));
   assert.ok(html.includes(`${king} ${game.turn()==='w'?'white':'black'} king · checkmated`));
   assert.match(html,/king-mate-callout/);
   assert.ok(html.includes(`Checkmate. ${game.turn()==='w'?'Black':'White'} wins.`));
  }
  game.undo();assert.ok(!render(game).includes('king-mate-callout'),'undo removes the mate marker');
 }
});
test('checks, stalemates and material draws never get a checkmate announcement',()=>{
 for(const fen of ['7k/6Q1/8/8/8/8/8/K7 b - - 0 1','7k/5Q2/6K1/8/8/8/8/8 b - - 0 1','7k/8/8/8/8/8/8/K7 w - - 0 1']){
  const game=new Chess(fen);assert.equal(game.isCheckmate(),false);
  const html=render(game);assert.ok(!html.includes('king-mate-callout'));assert.ok(!html.includes('checkmated-king'));
 }
});
test('promotion outcomes use the selected legal piece rather than assuming a queen',()=>{
 const fen='7k/5P2/6K1/8/8/8/8/8 w - - 0 1';
 for(const piece of ['q','r','b','n']){
  const game=new Chess(fen);game.move({from:'f7',to:'f8',promotion:piece});
  assert.equal(game.get('f8').type,piece);
  assert.equal(render(game).includes('king-mate-callout'),game.isCheckmate());
 }
 const game=new Chess(fen);game.move({from:'f7',to:'f8',promotion:'q'});assert.equal(game.isCheckmate(),true);
});
test('practice tools are opt-in, use accessible labels, and last-move squares stay distinct from selection',()=>{
 const game=new Chess();game.move('e4');
 assert.ok(!render(game).includes('Practice board controls'));
 const html=render(game,{showTools:true,lastMove:{from:'e2',to:'e4'}});
 for(const label of ['Flip board view','Show legal move hints','Show board coordinates','Annotate board','Clear board annotations'])assert.ok(html.includes(label));
 assert.equal((html.match(/class="square [^"]*last-move/g)||[]).length,2);
 assert.ok(!html.includes('king-mate-callout'));
});
