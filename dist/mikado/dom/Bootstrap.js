/**
 * @author Ben Gerrissen http://www.netben.nl/ bgerrissen@gmail.com
 * @license MIT
 * 
 * Maps CSS query patterns to module instantiation manifests.
 * If the bootstrapper finds nodes that match a CSS query pattern,
 * it loads and instantiates the module with the arguments defined
 * in the manifest.
 * 
 * Modules defined in a manifest MUST accept the found node as first argument!
 * Arguments defined in the manifest will be postfixed with the node found by Bootstrap.
 * 
 * example:
 * 
 * 	mikado.run("home.dom.Bootstrap", {
 * 		"div.myApplication" : {
 * 			path: "my.space.Application",
 * 			args: ["argument_one", "argument_two"],
 * 			priority: 1 // lower number is higher priority, 0 is no priority.
 * 		},
 * 		"div.myOtherApplication" : {
 * 			path: "my.space.OtherApplication",
 * 			args: ["argument_one", "argument_two"],
 * 			priority: 2 // lower number is higher priority, 0 is NO priority.
 * 		},
 * 	});
 * 
 * todo:
 * - ponder priority.
 * - ponder static methods.
 * - ponder plugins
 * - ponder instance methods.
 * 
 */
mikado.module({path:"home.dom.Bootstrap",include:["home.dom.Selector"],domTool:1,build:function(E){var C=E.Selector.select;function F(H,G){return H-G}function D(H){var I;while(I=H.shift()){var G=C(I.cssExpression);if(G.length){A(G,I)}}}function A(G,H){var I;while(I=G.shift()){mikado.run.apply(null,[H.path,I].concat(H.args))}I=null}function B(L){var G=[];var I={0:[]};var K,J;for(var H in L){K=L[H];K.cssExpression=H;if(K.priority){G.push(K.priority);if(!I[K.priority]){I[K.priority]=[]}I[K.priority].push(L[H])}else{I[0].push(L[H])}}G.sort(F);while(K=G.shift()){if(K!==J){D(I[K]);J=K}}}return B}});