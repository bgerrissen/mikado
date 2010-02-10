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
mikado.module({
	
	path: "home.dom.Bootstrapper",
	
	include: [
		"home.dom.Selector"
	],
	
    traits: {
        domTool: true
    },
	
	build: function(M){
        
        var Class = function(map){
            
            if(!this.hasOwnProperty || !(this instanceof Class)) {
                return new Class(map);
            }
            
            if(map) {
                this.prepare(map);
            }
            
            this.initialise();
            
        }
    
        Class.prototype = {
            
            _storage: {0:[]},
            
            _priorities: [0],
            
            _contains: function(array, value) {
                var i = array.length;
                while(i--) {
                    if(array[i] === value) {
                        return (value = true);
                    }
                }
                return (value = false);
            },
            
            prepare: function(map) {
                
                if(!map) {
                    return false;
                }
                
                var storage = this._storage,
                	priorities = this._priorities,
                	current, prio, cssExp;
                    
                for(cssExp in map) {
                    if(!map.hasOwnProperty(cssExp)) {
                        continue;
                    }
                    
                    current = map[cssExp];
                    current.cssExp = cssExp;
                    current.processed = [];
                    
                    prio = current.prio || (current.prio = 0);
                    
                    if(!storage[prio]) {
                        storage[prio] = [];
                        priorities.push(prio);
                    }
                    
                    storage[prio].unshift(current);
                }
                
                priorities.sort(function(a, b){
                    return b ? a - b : b - a;
                });
                
                return true;
            },
            
            initialise: function() {
                var storage = this._storage,
                    priorities = this._priorities,
                    i = priorities.length;
                while(i--) {
                    this.process(storage[priorities[i]]);
                }
            },
            
            process: function(list) {
                var i = list.length;
                while(i--) {
                    list[i].result = M.Selector.select(list[i].cssExp);
                    if(list[i].result && list[i].result.length) {
                        this.strap(list[i]);
                    }
                }
            },
            
            strap: function(mapping) {
                var node;
                while((node = mapping.result.shift())) {
                    if(this._contains(mapping.processed, node)) {
                        continue;
                    }
                    mikado.run.apply(null, [mapping.path, node].concat(mapping.args));
                    mapping.processed.push(node);
                }
            }
        }
        
        return Class;
    }
    	
});
