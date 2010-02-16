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
 * 			priority: 1 // lower number is higher priority, 0 is NO priority.
 * 		},
 * 		"div.myOtherApplication" : {
 * 			path: "my.space.OtherApplication",
 * 			args: ["argument_one", "argument_two"],
 * 			priority: 2 // lower number is higher priority, 0 is NO priority.
 * 		},
 * 	});
 * 
 * todo:
 * - ponder static methods.
 * - ponder plugins
 * - ponder instance methods.
 * - auto polling to see if Bootstrapper needs to run again?
 * 
 */
mikado.module({path:"home.dom.Bootstrapper",include:["home.dom.Selector"],traits:{domTool:true},build:function(B){var A=function(C){if(!this.hasOwnProperty||!(this instanceof A)){return new A(C)}if(C){this.prepare(C)}this.initialise()};A.prototype={_storage:{0:[]},_priorities:[0],_contains:function(E,D){var C=E.length;while(C--){if(E[C]===D){return(D=true)}}return(D=false)},prepare:function(F){if(!F){return false}var H=this._storage,D=this._priorities,E,G,C;for(C in F){if(!F.hasOwnProperty(C)){continue}E=F[C];E.cssExp=C;E.processed=[];G=E.prio||(E.prio=0);if(!H[G]){H[G]=[];D.push(G)}H[G].unshift(E)}D.sort(function(J,I){return I?J-I:I-J});return true},initialise:function(){var E=this._storage,C=this._priorities,D=C.length;while(D--){this.process(E[C[D]])}},process:function(D){var C=D.length;while(C--){D[C].result=B.Selector.select(D[C].cssExp);if(D[C].result&&D[C].result.length){this.strap(D[C])}}},strap:function(C){var D;while((D=C.result.shift())){if(this._contains(C.processed,D)){continue}mikado.run.apply(null,[C.path,D].concat(C.args));C.processed.push(D)}}};return A}});