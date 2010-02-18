/**
 * @author Ben Gerrissen http://www.netben.nl/ bgerrissen@gmail.com
 * @license MIT
 * 
 * @version RC3
 * 
 * @todo
 * - unit tests!!!
 * - investigate alternative for domBuild/domTool
 * - investigate expecting mikado.build to always return an Object or Function.
 * - backup script element load listeners to check if a script was loaded with no 'mikado.module' call inside.
 * - More proper error messages.
 * - Security messages?
 * - Module versions?
 * - cleaner code
 * - better architecture
 * 
 */
(function(){var k={},K={},J={},G={},b=[],Y=0,W=this,Q=W.document,i=Q.documentElement,X=Q.getElementsByTagName("head")[0],Z={timeout:1500,root:function(){var r=Q.getElementsByTagName("script"),o=0,p=/\/mikado[^\/\\]*\.js.?$/i,q;while((q=r[o++])){if(p.test(q.src)){return q.src.replace(p,"")}}}(),repositories:{},force:{}},g=Q.createElement("script");g.type="text/javascript";var B=function(){},M=Array.prototype.slice,N=function(p,q){if(q){for(var o in q){p[o]=q[o]}}return p},h={},T={listen:function(o,p){if(!h[o]){h[o]=[]}h[o].unshift(p)},deafen:function(p,r){var q=h[p],o;if(q){o=q.length;while(o--){if(q[o]===r){q.splice(o,1)}}}},dispatch:function(p,r){var q=h[p],o;r=r||{};r.type=p;if(q){o=q.length;while(o--){q[o](r)}}}},a=function(o,p){this.type=o||this.type;this.timestamp=+new Date();N(this,p)};a.prototype={type:"none",message:null,resolution:null,path:null};N(a,{COMPLETE:"complete",LOADING:"loading",LOADED:"loaded",ERROR:"error",DOMREADY:"domReady",RUN:"run",RAN:"ran"});var I=function(o,p){var q=new a(o,p);b.push(q);T.dispatch(o,q)},V=function(){if(!Y){Y=1;T.dispatch(a.DOMREADY)}};if(Q.addEventListener){var U=function(){V();Q.removeEventListener("DOMContentLoaded",arguments.callee,false);Q.removeEventListener("load",arguments.callee,false)};Q.addEventListener("DOMContentLoaded",U,false);Q.addEventListener("load",U,false)}else{if(Q.attachEvent){var H=0;var c=function(){try{i.doScroll("left");H=i.outerHTML.length;if(H*1.03<Q.fileSize*1){return setTimeout(c,50)}}catch(o){return setTimeout(c,50)}V()};var j=function(){if(Q.readyState!="complete"){c()}else{V()}Q.detachEvent("onreadystatechange",arguments.callee);Q.detachEvent("load",arguments.callee)};Q.attachEvent("onreadystatechange",j);Q.attachEvent("load",j)}else{var m=W.onload;W.onload=function(o){V();if(typeof m=="function"){m(o||W.event)}}}}T.listen(a.COMPLETE,function(s){var q=J[s.path];if(!q||!q.length){return }var p=q.length,o,r;while((r=q[--p])){o=r.fetch.length;while(o&&o--){if(r.fetch[o]!=s.path){continue}r.fetch.splice(o,1);if(!r.fetch.length){n(r);q.splice(p,1)}}}});var e=function(p){for(var o in Z.repositories){if(RegExp("^"+o).test(p)){return Z.repositories[o]+p.replace(/\./g,"/")+".js"}}return Z.root+"/"+p.replace(/\./g,"/")+".js"},d=function(o){if(!o.fetch||!o.fetch.length){return false}var q=o.fetch,p=q.length,r;while(p--){r=q[p];if(k[r]){q.splice(p,1);continue}}if(!q.length){return false}q=[].concat(q);p=q.length;while(p--){r=q[p];if(J[r]){q.splice(p,1);J[r].push(o)}else{J[r]=[o]}}C(q,o.timeout);return true},C=function(r,q){var p=r.length,s,o=document.createDocumentFragment();while(p--){s=r[p];K[s]=g.cloneNode(true);K[s].src=e(s);o.appendChild(K[s]);I(a.LOADING,{path:s,timeout:q})}X.appendChild(o)},O=function(s,p){var r=p?"Dependency '"+s+"'":"";p=p||"Timed out @ "+G[s].timeout+"ms";I(a.ERROR,{path:s,message:p,resolution:"failed silently"});var q=J[s],o=q.length;while(o--){O(q[o].path,p);delete q[o]}delete J[s]};T.listen(a.LOADING,function(o){if(!Z.timeout){return false}G[o.path]={timeout:o.timeout,timeoutID:setTimeout(function(){O(o.path)},o.timeout)};return true});T.listen(a.LOADED,function(o){if(G[o.path]){clearInterval(G[o.path].timeoutID);delete G[o.path]}});var l=function(o){return o?o.split(".").pop():null},F=function(q){var p=q.length,o;while(p--){o=l(q[p]);if(o&&Z.force[o]){q[p]=Z.force[o]}}return q},L=function(p){if(p){var o=p.length;while(o--){if(typeof p[o]==="string"){continue}if(p[o].path&&p[o].when){p[o]=p[o].path}if(typeof p[o]!=="string"){p.splice(o,1)}}}},R=function(o){L(o.fetch);L(o.include);o.fetch=o.fetch||[];if(o.include instanceof Array){o.fetch=o.fetch.concat(o.include)}return F(o.fetch)},D=function(o){if(o.allow instanceof Array){var p=o.allow,q;o.allow={};while((q=p.pop())){o.allow[q]=true}}},f=function(q){var s=q.include,r=s.length,p=q.path,o,t;q.library={};while(r--){t=s[r];o=k[t];if(o.allow&&!o.allow[p]){q.library[o.name]="Access denied!";I(a.ERROR,{path:q.path,message:"Disallowed acces to '"+t+"'",resolution:"failed silently"});continue}if(o.traits.domTool){q.traits.domTool=true}if(o.module){q.library[o.name]=o.module}}},S=function(o){o.name=o.name||l(o.path);o.traits||(o.traits={});o.traits.path=o.path;o.traits.name=o.name;o.timeout=o.timeout?Math.max(timeout,Z.timeout):Z.timeout;D(o);R(o);I(a.LOADED,o.traits);if(!d(o)){n(o)}},n=function(o){if(o.traits.domBuild&&!Y){T.listen(a.DOMREADY,function(){n(o)});return false}if(o.include instanceof Array){f(o)}if(typeof o.build=="function"){try{o.module=o.build(o.library);delete o.build}catch(p){I(a.ERROR,{error:p,path:o.path,message:"failed to build module",resolution:"failed silently"})}}k[o.path]=o;I(a.COMPLETE,o.traits)};T.listen(a.COMPLETE,function(o){if(K[o.path]){K[o.path].parentNode.removeChild(K[o.path])}delete J[o.path];delete K[o.path]});var A=function(p,q){var r=p.module,o;if(typeof r=="function"){I(a.RUN,p.traits);B.prototype=r.prototype;o=new B();r.apply(o,q);I(a.RAN,p.traits)}else{I(a.ERROR,{path:p.path,message:"Nothing is run @ '"+p.path+"'",resolution:"failed silently"})}return o},P=function(t,q,s,r){var p=k[t];if(!p){T.listen(a.COMPLETE,function(v){if(v.path===t){T.deafen(a.COMPLETE,arguments.callee);P(t,q,s)}});r=r?Math.max(Z.timeout,r):Z.timeout;C([t],r);return }if(!Y&&p.traits.domTool&&!p.traits.domIgnore){T.listen(a.DOMREADY,function(v){T.deafen(a.DOMREADY,arguments.callee);P(t,q,s)});return }var o=A(p,q);if(o&&s&&s.invoke){var u;while((u=s.invoke.shift())){if(typeof o[u.method]==="function"){o[u.method].apply(o,u.args||[])}}}if(s.run){mikado.run(s.run)}},E={module:function(o){S(o)},run:function(){var o=M.call(arguments);if(typeof o[0]==="string"){P(o.shift(),o)}else{if(o.length===1){P(o[0].path,o[0].args,o[0],o[0].timeout)}}return this},fetch:function(q,p){if(!(q instanceof Array)){return this}var o=q.length;while(o--){if(J[q[o]]){q.splice(o,1)}}if(q.length){C(q,p)}return this},available:function(o){return !!k[o]},config:function(q){for(var p in q){if(/(?:repositories|force)/.test(p)){for(var o in q[p]){if(typeof q[p][o]=="string"){Z[p][o]=q[p][o]}}}else{if(Z[p]){Z[p]=q[p]}}}return this},listen:function(o,p){T.listen(o,p);return this},deafen:function(o,p){T.deafen(o,p);return this},getLog:function(r){var q=new RegExp("^(?:"+M.call(arguments).join("|")+")$");var o=b.length,p=[];while(o--){if(q.test(b[o].type)||!r){p.unshift(b[o])}}return p}};W.mikado=E})();