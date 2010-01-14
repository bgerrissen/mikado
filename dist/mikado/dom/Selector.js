/*
 * Copyright (C) 2007-2009 Diego Perini
 * All rights reserved.
 *
 * nwmatcher.js - A fast CSS selector engine and matcher
 *
 * Author: Diego Perini <diego.perini at gmail com>
 * Version: 1.2.0
 * Created: 20070722
 * Release: 20091201
 *
 * License:
 *  http://javascript.nwbox.com/NWMatcher/MIT-LICENSE
 * Download:
 *  http://javascript.nwbox.com/NWMatcher/nwmatcher.js
 */
mikado.module({path:"home.dom.Selector",domTool:1,build:function(){var BT="nwmatcher-1.2.0",BR=window.document,BD=BR.doctype,B0=BR.documentElement,As=BR.defaultView||BR.parentWindow,BH,Be,An,BQ=BR,Bs="((?:[-\\w]|[^\\x00-\\xa0]|\\\\.)+)",Bn="(?:\\[.*\\]|\\(.*\\))",A8=/^([.:#*]|[>+~a-zA-Z]|[^\x00-\xa0]|\[.*\])/,Ao=/^[\x20\t\n\r\f]+|[\x20\t\n\r\f]+$/g,Aq=/([^,\\()[\]]+|\([^()]+\)|\(.*\)|\[(?:\[[^[\]]*\]|["'][^'"]*["']|[^'"[\]]+)+\]|\[.*\]|\\.)+/g,Bt=/([^ >+~,\\()[\]]+|\([^()]+\)|\(.*\)|\[[^[\]]+\]|\[.*\]|\\.)+/g,BX=/([-\w]+)/,BL=/\#([-\w]+)$/,A7=/[\x20\t\n\r\f]+/g,Br=/^\s*[>+~]+/,BK=/[>+~]+\s*$/,BW=Array.prototype.slice,Ai=function(A){return A.replace(/<\/?("[^\"]*"|'[^\']*'|[^>])+>/gi,"")},BO=false,A9=function(A){if(BO){var B=window.console;if(B&&B.log){B.log(A)}else{if(/exception/i.test(A)){window.status=A;window.defaultStatus=A}else{window.status+=A}}}},A0=function(B,A){return A4(B,"",A||false)},A6=function(A){By=A&&Bl?Ah:Bv},BG=(function(){var A=(window.open+"").replace(/open/g,"");return function(C,E){var D=C?C[E]:false,B=new RegExp(E,"g");return !!(D&&typeof D!="string"&&A===(D+"").replace(B,""))}})(),BS=BR.compatMode?BR.compatMode.indexOf("CSS")<0:(function(){var A=document.createElement("div"),B=A.style&&(A.style.width=1)&&A.style.width!="1px";A=null;return !B})(),BB=!!BR.xmlVersion,Bi=BG(BR,"hasFocus"),Bl=BG(BR,"querySelector"),Ap=BG(BR,"getElementById"),Bw=BG(B0,"getElementsByTagName"),Ay=BG(B0,"getElementsByClassName"),Bm=BG(B0,"hasAttribute"),A5=(function(){try{return BW.call(BR.childNodes,0) instanceof Array}catch(A){return false}})(),Bh="nextElementSibling" in B0&&"previousElementSibling" in B0,BA=Ap?(function(){var A,B=BR.createElement("div");B0.insertBefore(B,B0.firstChild);B.appendChild(BR.createElement("a")).setAttribute("id","Z");A=BR.getElementsByName&&BR.getElementsByName("Z")[0];B.removeChild(B.firstChild);B0.removeChild(B);B=null;return !!A})():true,Ax=Bw?(function(){var A,B=BR.createElement("div");B.appendChild(BR.createComment(""));A=B.getElementsByTagName("*")[0];B.removeChild(B.firstChild);B=null;return !!A})():true,BF=Ay?(function(){var A,B=BR.createElement("div"),C="\u53f0\u5317";B.appendChild(BR.createElement("span")).setAttribute("class",C+"abc "+C);B.appendChild(BR.createElement("span")).setAttribute("class","x");A=!B.getElementsByClassName(C)[0];B.lastChild.className=C;if(!A){A=B.getElementsByClassName(C).length!==2}B.removeChild(B.firstChild);B.removeChild(B.firstChild);B=null;return A})():true,A2=Bl?(function(){var C=["!=",":contains",":selected"],A=BR.createElement("div"),D;A.appendChild(BR.createElement("p")).setAttribute("class","xXx");A.appendChild(BR.createElement("p")).setAttribute("class","xxx");if(BS&&(A.querySelectorAll("[class~=xxx]").length!=2||A.querySelectorAll(".xXx").length!=2)){C.push("(?:\\[[\\x20\\t\\n\\r\\f]*class\\b|\\."+Bs+")")}A.removeChild(A.firstChild);A.removeChild(A.firstChild);(D=BR.createElement("input")).setAttribute("type","hidden");A.appendChild(D);try{A.querySelectorAll(":enabled").length===1&&C.push(":enabled",":disabled")}catch(B){}A.removeChild(A.firstChild);(D=BR.createElement("input")).setAttribute("type","hidden");A.appendChild(D);D.setAttribute("checked","checked");try{A.querySelectorAll(":checked").length!==1&&C.push(":checked")}catch(B){}A.removeChild(A.firstChild);A.appendChild(BR.createElement("a")).setAttribute("href","x");A.querySelectorAll(":link").length!==1&&C.push(":link");A.removeChild(A.firstChild);A=null;return C.length?new RegExp(C.join("|")):{test:function(){return false}}})():true,A1=Bw&&typeof BR.getElementsByTagName("*").length=="number",BC=Ax||BF?new RegExp("^#"+Bs+"$"):new RegExp("^(?:\\*|[.#]?"+Bs+")$"),Aj={a:1,A:1,area:1,AREA:1,link:1,LINK:1},Bx={"9":1,"11":1},Bk={action:2,cite:2,codebase:2,data:2,href:2,longdesc:2,lowsrc:2,src:2,usemap:2},Am={"class":BS?1:0,accept:1,"accept-charset":1,align:1,alink:1,axis:1,bgcolor:1,charset:1,checked:1,clear:1,codetype:1,color:1,compact:1,declare:1,defer:1,dir:1,direction:1,disabled:1,enctype:1,face:1,frame:1,hreflang:1,"http-equiv":1,lang:1,language:1,link:1,media:1,method:1,multiple:1,nohref:1,noresize:1,noshade:1,nowrap:1,readonly:1,rel:1,rev:1,rules:1,scope:1,scrolling:1,selected:1,shape:1,target:1,text:1,type:1,valign:1,valuetype:1,vlink:1},BJ={accept:1,"accept-charset":1,alink:1,axis:1,bgcolor:1,charset:1,codetype:1,color:1,enctype:1,face:1,hreflang:1,"http-equiv":1,lang:1,language:1,link:1,media:1,rel:1,rev:1,target:1,text:1,type:1,vlink:1},Bq=BD&&BD.systemId&&BD.systemId.indexOf("xhtml")>-1?BJ:Am,BU={},BZ={"=":"%p==='%m'","!=":"%p!=='%m'","^=":"%p.indexOf('%m')==0","*=":"%p.indexOf('%m')>-1","|=":"(%p+'-').indexOf('%m-')==0","~=":"(' '+%p+' ').indexOf(' %m ')>-1","$=":"%p.substr(%p.length - '%m'.length) === '%m'"},Bf="(?:^|[>+~\\x20\\t\\n\\r\\f])",BI={ID:new RegExp("#"+Bs+"|"+Bn),TAG:new RegExp(Bf+Bs+"|"+Bn),CLASS:new RegExp("\\."+Bs+"|"+Bn),NAME:/\[\s*name\s*=\s*((["']*)([^'"()]*?)\2)?\s*\]/},B1={attribute:/^\[[\x20\t\n\r\f]*([-\w]*:?(?:[-\w])+)[\x20\t\n\r\f]*(?:([~*^$|!]?=)[\x20\t\n\r\f]*(["']*)([^'"()]*?)\3)?[\x20\t\n\r\f]*\](.*)/,spseudos:/^\:(root|empty|nth)?-?(first|last|only)?-?(child)?-?(of-type)?(?:\(([^\x29]*)\))?(.*)/,dpseudos:/^\:([\w]+|[^\x00-\xa0]+)(?:\((["']*)(.*?(\(.*\))?[^'"()]*?)\2\))?(.*)/,children:/^[\x20\t\n\r\f]*\>[\x20\t\n\r\f]*(.*)/,adjacent:/^[\x20\t\n\r\f]*\+[\x20\t\n\r\f]*(.*)/,relative:/^[\x20\t\n\r\f]*\~[\x20\t\n\r\f]*(.*)/,ancestor:/^[\x20\t\n\r\f]+(.*)/,universal:/^\*(.*)/,id:new RegExp("^#"+Bs+"(.*)"),tagName:new RegExp("^"+Bs+"(.*)"),className:new RegExp("^\\."+Bs+"(.*)")},Bo={Structural:{root:3,empty:3,"first-child":3,"last-child":3,"only-child":3,"first-of-type":3,"last-of-type":3,"only-of-type":3,"first-child-of-type":3,"last-child-of-type":3,"only-child-of-type":3,"nth-child":3,"nth-last-child":3,"nth-of-type":3,"nth-last-of-type":3},Others:{checked:3,disabled:3,enabled:3,selected:2,indeterminate:"?",active:3,focus:3,hover:3,link:3,visited:3,target:3,lang:3,not:3,contains:"?"}},Az=function(A,B){var C=-1,D;if(A.length===0&&Array.slice){return Array.slice(B)}while((D=B[++C])){A[A.length]=D}return A},Bz=function(A,B,E){var C=-1,D;while((D=B[++C])){E(A[A.length]=D)}return A},BN=function(E,F){var C=-1,D,A,B;F||(F=BR);E=E.replace(/\\/g,"");if(F.getElementById){if((D=F.getElementById(E))&&E!=Bb(D,"id")&&F.getElementsByName){A=F.getElementsByName(E);while((D=A[++C])){if((B=D.getAttributeNode("id"))&&B.value==E){return D}}return null}return D}A=At("*",F);while((D=A[++C])){if(D.getAttribute("id")==E){return D}}return null},At=function(B,A){return(A||BR).getElementsByTagName(B)},BY=function(B,A){return By('[name="'+B.replace(/\\/g,"")+'"]',A||BR)},Bc=!BF?function(B,A){return(A||BR).getElementsByClassName(B.replace(/\\/g,""))}:function(H,E){var A=-1,D=A,B=[],C,G=(E||BR).getElementsByTagName("*"),F=BS?H.toLowerCase():H;H=" "+F.replace(/\\/g,"")+" ";while((C=G[++A])){F=BB?C.getAttribute("class"):C.className;if(F&&(" "+(BS?F.toLowerCase():F).replace(A7," ")+" ").indexOf(H)>-1){B[++D]=C}}return B},Ar=function(B){var C=0,D,A=B[A3]||(B[A3]=++B3);if(!Bj[A]){D={};B=B.firstChild;while(B){if(B.nodeName.charCodeAt(0)>64){D[B[A3]||(B[A3]=++B3)]=++C}B=B.nextSibling}D.length=C;Bj[A]=D}return Bj[A]},B2=function(A,C){var B=0,D,E=A[A3]||(A[A3]=++B3);if(!Ba[E]||!Ba[E][C]){D={};A=A.firstChild;while(A){if(A.nodeName.toUpperCase()==C){D[A[A3]||(A[A3]=++B3)]=++B}A=A.nextSibling}D.length=B;Ba[E]||(Ba[E]={});Ba[E][C]=D}return Ba[E]},Bb=Bm?function(B,A){return B.getAttribute(A)+""}:function(B,A){if(Bk[A.toLowerCase()]){return B.getAttribute(A,2)+""}B=B.getAttributeNode(A);return(B&&B.value)+""},BM=Bm?function(B,A){return B.hasAttribute(A)}:function(C,A){var B=C.getAttributeNode(A);return !!(B&&(B.specified||B.nodeValue))},Bu=function(A){return BM(A,"href")&&Aj[A.nodeName]},Bg="compareDocumentPosition" in B0?function(A,B){return(B.compareDocumentPosition(A)&1)==1}:"contains" in B0?function(A,B){return !B.contains(A)}:function(A,B){while((A=A.parentNode)){if(A===B){return false}}return true},Au="f&&f(N);r[r.length]=N;continue main;",BP=typeof BR.createElementNS=="function"?".toUpperCase()":"",Al=Ax?"if(e.nodeName.charCodeAt(0)<65){continue;}":"",Ak="textContent" in B0?"e.textContent":(function(){var A=BR.createElement("div"),B;A.appendChild(B=BR.createElement("p"));B.appendChild(BR.createTextNode("p"));A.style.display="none";return A.innerText?"e.innerText":"s.stripTags(e.innerHTML)"})(),A4=function(D,G,E){var A=-1,C={},F,B;if((F=D.match(Aq))){while((B=F[++A])){B=B.replace(Ao,"");if(!C[B]){G+=A>0?"e=N;":"";G+=BE(B,E?Au:"return true;")}C[B]=true}}if(E){return new Function("c,s,r,d,h,g,f","var n,x=0,N,k=0,e;main:while(N=e=c[k++]){"+Al+G+"}return r;")}else{return new Function("e,s,r,d,h,g,f","var n,x=0,N=e;"+G+"return false;")}},BE=function(K,M){var H,C,D,L,J,B,G,A,I,F,E;J=0;while(K){if((G=K.match(B1.universal))){true}else{if((G=K.match(B1.id))){M='if((e.submit?s.getAttribute(e,"id"):e.id)=="'+G[1]+'"){'+M+"}"}else{if((G=K.match(B1.tagName))){M='if(e.nodeName=="'+G[1].toUpperCase()+'"||e.nodeName=="'+G[1].toLowerCase()+'"){'+M+"}"}else{if((G=K.match(B1.className))){B='d.xmlVersion?e.getAttribute("class"):e.className';M="if((n="+B+')&&(" "+'+(BS?"n.toLowerCase()":"n")+".replace("+A7+'," ")+" ").indexOf(" '+(BS?G[1].toLowerCase():G[1])+' ")>-1){'+M+"}"}else{if((G=K.match(B1.attribute))){B=G[1].split(":");B=B.length==2?B[1]:B[0]+"";F=Bq[B.toLowerCase()];if(G[4]&&F){G[4]=G[4].toLowerCase()}M=(G[2]?'n=s.getAttribute(e,"'+G[1]+'");':"")+"if("+(G[2]?BZ[G[2]].replace(/\%p/g,"n"+(F?".toLowerCase()":"")).replace(/\%m/g,G[4]):'s.hasAttribute(e,"'+G[1]+'")')+"){"+M+"}"}else{if((G=K.match(B1.adjacent))){M=Bh?"if((e=e.previousElementSibling)){"+M+"}":"while((e=e.previousSibling)){if(e.nodeName.charCodeAt(0)>64){"+M+"break;}}"}else{if((G=K.match(B1.relative))){M=Bh?"while((e=e.previousElementSibling)){"+M+"}":"while((e=e.previousSibling)){if(e.nodeName.charCodeAt(0)>64){"+M+"}}"}else{if((G=K.match(B1.children))){M="if(e!==g&&(e=e.parentNode)){"+M+"}"}else{if((G=K.match(B1.ancestor))){M="while(e!==g&&(e=e.parentNode)){"+M+"}"}else{if((G=K.match(B1.spseudos))&&Bo.Structural[K.match(BX)[0]]){switch(G[1]){case"root":M="if(e===h){"+M+"}";break;case"empty":M="if(!e.firstChild){"+M+"}";break;default:if(G[1]&&G[5]){if(G[5]=="even"){C=2;D=0}else{if(G[5]=="odd"){C=2;D=1}else{D=((L=G[5].match(/(-?\d{1,})$/))?parseInt(L[1],10):0);C=((L=G[5].match(/(-?\d{0,})n/))?parseInt(L[1],10):0);if(L&&L[1]=="-"){C=-1}}}E=G[4]?"n[e.nodeName"+BP+"]":"n";B=G[2]=="last"?E+".length-"+(D-1):D;E=E+"[e."+A3+"]";F=D<1&&C>1?"("+E+"-("+D+"))%"+C+"==0":C>+1?E+">="+D+"&&("+E+"-("+D+"))%"+C+"==0":C<-1?E+"<="+D+"&&("+E+"-("+D+"))%"+C+"==0":C===0?E+"=="+B:C==-1?E+"<="+D:E+">="+D;M="if(e!==h){n=s.getIndexesBy"+(G[4]?"NodeName":"NodeType")+"(e.parentNode"+(G[4]?",e.nodeName"+BP:"")+");if("+F+"){"+M+"}}"}else{C=G[2]=="first"?"previous":"next";L=G[2]=="only"?"previous":"next";D=G[2]=="first"||G[2]=="last";E=G[4]?"&&n.nodeName!=e.nodeName":"&&n.nodeName.charCodeAt(0)<65";M="if(e!==h){"+("n=e;while((n=n."+C+"Sibling)"+E+");if(!n){"+(D?M:"n=e;while((n=n."+L+"Sibling)"+E+");if(!n){"+M+"}")+"}")+"}"}break}}else{if((G=K.match(B1.dpseudos))&&Bo.Others[K.match(BX)[0]]){switch(G[1]){case"not":M='if(!s.match(e, "'+G[3].replace(/\x22/g,'\\"')+'")){'+M+"}";break;case"checked":M="if(e.type&&/radio|checkbox/i.test(e.type)&&e.checked){"+M+"}";break;case"enabled":M='if((("form" in e&&e.type.toLowerCase()!=="hidden")||s.isLink(e))&&!e.disabled){'+M+"}";break;case"disabled":M='if((("form" in e&&e.type.toLowerCase()!=="hidden")||s.isLink(e))&&e.disabled){'+M+"}";break;case"target":L=BR.location.hash;M='if(e.id=="'+L+'"&&e.href!=void 0){'+M+"}";break;case"link":M="if(s.isLink(e)&&!e.visited){"+M+"}";break;case"visited":M="if(s.isLink(e)&&!!e.visited){"+M+"}";break;case"active":M="if(e===d.activeElement){"+M+"}";break;case"hover":M="if(e===d.hoverElement){"+M+"}";break;case"focus":M=Bi?"if(e.type&&e===d.activeElement&&d.hasFocus()){"+M+"}":"if(e.type&&e===d.activeElement){"+M+"}";break;case"contains":M="if("+Ak+'.indexOf("'+G[3]+'")>-1){'+M+"}";break;case"selected":L=BR.getElementsByTagName("select");for(H=0;L[H];H++){L[H].selectedIndex}M="if(e.selected){"+M+"}";break;default:break}}else{B=false;I=true;for(B in BU){if((G=K.match(BU[B].Expression))){A=BU[B].Callback(G,M);M=A.source;I|=A.status}}if(!I){A9('DOMException: unknown pseudo selector "'+K+'"');return M}if(!B){A9('DOMException: unknown token in selector "'+K+'"');return M}}}}}}}}}}}}K=G&&G[G.length-1]}return M},Aw=function(C,D,E,B,A){if(C&&C.nodeType==1&&C.nodeName.charCodeAt(0)>64){if(typeof D=="string"&&D.length){BR=C.ownerDocument;B0=BR.documentElement;if(!Av[D]){Av[D]=A4(D,"",false)}return Av[D](C,Bd,B,BR,B0,E||BR,A)}else{A9('DOMException: "'+D+'" is not a valid CSS selector.')}}return false},Bp=function(D,E,A,F){var C,B;switch(D.charAt(0)){case"#":if((C=BN(D.slice(1),E))){F&&F(C);A[A.length]=C}return A;case".":B=Bc(D.slice(1),E);break;default:B=At(D,E);break}return F?Bz(A,B,F):A||!A5?Az(A,B):BW.call(B)},Ah=function(D,E,B,F){if(BC.test(D)){return Bp(D,E,B||[],F)}if(!BB&&!BV[D]&&!A2.test(D)&&(!E||Bx[E.nodeType])){var C;try{C=(E||BR).querySelectorAll(D)}catch(A){}if(C){switch(C.length){case 0:return B||[];case 1:F&&F(C[0]);if(B){B[B.length]=C[0]}else{B=[C[0]]}return B;default:return F?Bz(B||[],C,F):B||!A5?Az(B||[],C):BW.call(C)}}}return Bv(D,E,B,F)},Bv=function(I,B,F,A){var E,G,D,L,H,J,K,C;if(BC.test(I)){return Bp(I,B,F||[],A)}if(Br.test(I)){I=!B?"*"+I:B.id?"#"+B.id+I:I}if(BK.test(I)){I=I+"*"}B||(B=BR);if(BQ!=B){BQ=B;B0=(BR=B.ownerDocument||B).documentElement;BB=!!BR.xmlVersion}if(K=Be!=I){if(A8.test(I)){Be=I;I=I.replace(Ao,"")}else{A9('DOMException: "'+I+'" is not a valid CSS selector.');return F||[]}}if((C=I.match(Aq).length<2)){if(K){H=I.match(Bt);J=H[H.length-1];An=J.split(":not")[0];BH=I.length-J.length}if((H=I.match(BI.ID))){if((D=BR.getElementById(H[1]))){if(/[>+~]/.test(I)){B=D.parentNode}else{I=I.replace("#"+J,"*");B=D}}}if((H=An.match(BI.ID))&&(J=H[1])&&BR.getElementById){if((D=BN(J,BR))){if(Aw(D,I)){L=[D];G=true}else{B=D}}}else{if((H=An.match(BI.CLASS))&&(J=H[1])){if((L=Bc(J,B)).length===0){return F||[]}if(I=="."+J){G=true}else{I=I.substr(0,BH)+I.substr(BH).replace("."+J,"*")}}else{if((H=An.match(BI.TAG))&&(J=H[1])){if((L=At(J,B)).length===0){return F||[]}if(I==J){G=true}else{I=I.substr(0,BH)+I.substr(BH).replace(J,"*")}}else{if((H=I.match(BI.ID))&&(J=H[1])){if((D=BN(J,BR))){if(/[>+~]/.test(I)){B=D.parentNode}else{I=I.replace("#"+J,"*");B=D}}else{return F||[]}}}}}}if(!L){L=B.getElementsByTagName("*")}if(!G&&!BV[I]){if(C){BV[I]=new Function("c,s,r,d,h,g,f","var n,x=0,N,k=0,e;main:while(N=e=c[k++]){"+Al+BE(I,Au)+"}return r;")}else{BV[I]=A4(I,"",true)}}if(!G){Bj={};Ba={}}return G?A?Bz(F||[],L,A):Az(F||[],L):BV[I](L,Bd,F||[],BR,B0,B,A)},By=Bl?Ah:Bv,B3=1,A3="uniqueID" in B0?"uniqueID":"CSS_ID",Bj={},Ba={},BV={},Av={},Bd={getIndexesByNodeType:Ar,getIndexesByNodeName:B2,getAttribute:Bb,hasAttribute:BM,byClass:Bc,byName:BY,byTag:At,byId:BN,stripTags:Ai,isLink:Bu,select:By,match:Aw};return{byId:BN,byTag:At,byName:BY,byClass:Bc,getAttribute:Bb,hasAttribute:BM,match:Aw,select:By,compile:A0,setQSA:A6,registerOperator:function(B,A){if(!BZ[B]){BZ[B]=A}},registerSelector:function(C,A,B){if(!BU[C]){BU[C]={};BU[C].Expression=A;BU[C].Callback=B}}}}});