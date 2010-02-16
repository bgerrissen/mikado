/**
 * @author Ben Gerrissen http://www.netben.nl/ bgerrissen@gmail.com
 * @license MIT
 * 
 * Adapted version of Diego Perini's work.
 *
 * License ORIGINAL version:
 *  http://javascript.nwbox.com/NWEvents/MIT-LICENSE
 * Download ORIGINAL version:
 *  http://javascript.nwbox.com/NWEvents/nwevents.js
 *
 */
mikado.module({path:"home.dom.EventDelegate",traits:{domTool:true},include:["home.dom.EventDispatcher","home.dom.Selector","home.lang.ObjectCache"],build:function(G){var E=G.EventDispatcher;var D=new G.ObjectCache();var B=G.Selector.match;var F=function(K,L,I,H){var J=D.get(K);J=J[L]||(J[L]={});J=J[I]||(J[I]={});J=J[H]||(J[H]=[]);return J};var A=function(M){var J=D.get(M.currentTarget),I=M.eventPhase<3?"true":"false",K,L;if(J[M.type]&&J[M.type][I]){J=J[M.type][I]}for(var H in J){if(B(M.target,H)){L=J[H];K=L.length;while(K--){L[K].call(M.target,M)}}}};function C(H){if(!this.hasOwnProperty||!(this instanceof C)){return new C(H)}this._element=H||document}C.listen=function(K,I,J,L,H){return new C(K).listen(I,J,L,H)};C.deafen=function(K,I,J,L,H){return new C(K).deafen(I,J,L,H)};C.notify=E.notify;C.clear=function(J,H,I){return new C(J).clear(H,I)};C.clearAll=function(H){new C(H).destroy()};C.prototype={listen:function(I,J,K,H){F(this._element,J,!!H,I).unshift(K);new E(this._element).deafen(J,A,H).listen(J,A,H);return this},deafen:function(I,L,M,H){var J=F(this._element,L,!!H,I);var K=J.length;while(K--){if(J[K]===M){J.splice(K,1)}}return this},notify:E.prototype.notify,clear:function(H,K){if(K){F(this._element,K,true,H).length=0;F(this._element,K,false,H).length=0}else{if(H){var I=D.get(this._element);for(var J in I){if(I[J]["true"]&&I[J]["true"]["selector"]){I[J]["true"]["selector"]=[]}if(I[J]["false"]&&I[J]["false"]["selector"]){I[J]["false"]["selector"]=[]}}}}return this},clearAll:function(H){D.destroy(this._element);return this}};return C}});