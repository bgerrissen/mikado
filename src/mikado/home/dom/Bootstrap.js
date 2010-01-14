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
mikado.module({
	
	path: "home.dom.Bootstrap",
	
	include: [
		"home.dom.Selector"
	],
	
	domTool: 1,
	
	build: function(lib) {
		
		var query = lib.Selector.select;
		
		/* generic method to be used through the final returned closure */
		function sortNumber(a,b) {
			return a - b;
		}
		
		/* generic method to be used through the final returned closure */
		function process(list) {
			var current;
			while(current = list.shift()) {
				var result = query(current.cssExpression);
				if(result.length) {
					processResult(result, current);
				}
			}
		}
		
		/* generic method to be used through the final returned closure */
		function processResult(nodeList, manifest) {
			var node;
			while(node = nodeList.shift()) {
				mikado.run.apply(null, [manifest.path, node].concat(manifest.args));
			}
			node = null;
		}
		
		/* final closure, will be returned as module */
		function Bootstrap(map) {
			var priorities = [];
			var finalMap = {0:[]};
			var current, last;
			
			// remap to finalMap according to priorities.
			for(var key in map) {
				current = map[key];
				current.cssExpression = key;
				if(current.priority) {
					priorities.push(current.priority);
					if(!finalMap[current.priority]) {
						finalMap[current.priority] = [];
					}
					finalMap[current.priority].push(map[key]);
				} else {
					finalMap[0].push(map[key]);
				}
			}
			
			// ensure proper priority order
			priorities.sort(sortNumber);
			
			// now handle it! High (number) priority first!
			while (current = priorities.shift()) {
				if(current !== last) {
					process(finalMap[current]);
					last = current;
				}
			}
			
		}
		
		return Bootstrap;
		
	}
	
});
