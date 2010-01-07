/**
 * @author Ben Gerrissen http://www.netben.nl
 * @license MIT
 */
var mikado = (function() {
	var library = {};
	
	var settings = {
		
		killTime: 1500,
		
		root: (function() {
			var scripts = document.getElementsByTagName("script"),
				re = /\/mikado[^\/\\]*\.js.?$/i,
				i = scripts.length,
				src;
			while (i--) {
				src = scripts[i].src;
				if (re.test(src)) {
					return src.replace(re, "");
				}
			}
			return "";
		})(),
		
		scriptLocation: document.getElementsByTagName("head")[0],
		
		repositories: {},
		
		force: {}
	
	};
	
	var scriptFragment = document.createElement("script");
	scriptFragment.type = "text/javascript";
	
	var Args = (function(a, b) {
		try {
			var tmp = Array.prototype.slice.call(arguments);
			if (tmp.length === 2 && tmp[0] === 1 && tmp[1] === 2) {
				return function(args, from) {
					return Array.prototype.slice.call(args, from);
				};
			}
		} 
		catch (e) {
			// fail
		}
		return function(args, from) {
			var result = [],
				i = 0,
				len = args.length;
			for (i; i < len; i++) {
				result.push(args[i]);
			}
			return result.slice(from);
		};
		
	})(1, 2);
	
	var sys = {
	
		queue: [],
		
		pending: {},
		
		killers: {},
		
		load: function(manifest) {
			var loc = settings.scriptLocation, 
				list = manifest.list,
				i = 0,
				length = list.length, 
				path, 
				script;
			
			if (manifest.param && !(manifest.param instanceof Array)) {
				manifest.param = [].concat(manifest.param);
			}
			
			for (i; i < length; i++) {
				
				path = list[i];
				
				if (library[path] || sys.pending[path]) {
					continue;
				}
				
				sys.pending[path] = manifest.list;
				
				script = scriptFragment.cloneNode(true);
				script.src = sys.createFullPath(path);
				
				sys.killers[path] = sys.startKiller(path, loc.appendChild(script), manifest);
			}
			
			if (manifest.callback) {
				sys.queue.push(manifest);
			}
		},
		
		startKiller: function(path, node, manifest) {
			var killTime = settings.killTime;
			
			if (manifest.killTime) {
				killTime = Math.max(killTime, manifest.killTime);
			}
			
			return setTimeout(function() {
				delete sys.pending[path];
				
				node.type = "KILLED ['" + path + "'] @ " + killTime + "ms";
				
				for (var i = 0, c; !!(c = sys.queue[i]); i++) {
					if (c === manifest) {
						sys.queue.splice(i, 1);
						break;
					}
				}
			}, killTime);
		},
		
		isLoaded: function(list) {
			var c, i = list.length, result = true;
			if (list instanceof Array) {
				while (!!(c = list[--i])) {
					if (!library[c]) {
						result = false;
					} else {
						list.splice(i, 1);
					}
				}
			}
			
			return result;
		},
		
		createFullPath: function(path) {
			if (/^.*:/.test(path)) {
				var repositoryName = path.replace(/:.*$/, "");
				var repository = settings.repositories[repositoryName];
				path = path.replace(/^.*:/, "").replace(/\./g, "/") + ".js";
				if (!repository) {
					throw "Error @ mikado#createFullPath : No repository set for '" + repositoryName + ":'";
				}
				return repository + path;
				
			} else {
				return settings.root + "/" + path.replace(/\./g, "/") + ".js";
			}
		},
		
		enforce: function(list)
		{
			var i = 0,
				len = list.length,
				path, name;
			for(i;i<len;i++)
			{
				path = list[i];
				name = sys.getNameFromPath(path);
				if(settings.force[name])
				{
					list[i] = settings.force[name];
				}
			}
			return list;
		},
		
		getNameFromPath: function(path)
		{
			return path.split(".").pop();
		},
		
		processQueue: function(path) {
			var i = sys.queue.length, c, h = [];
			
			while (i--) {
				c = sys.queue[i];
				if (sys.isLoaded(c.list)) {
					h.unshift(c);
					sys.queue.splice(i, 1);
				}
			}
			
			for (i = 0; c = h[i]; i++) {
				c.callback.apply(null, c.param);
			}
			
		},
		
		processModule: function(record) {
			
			record.name = sys.getNameFromPath(record.path);
			
			var required = [];
			
			if (record.fetch instanceof Array) {
				sys.enforce(record.fetch);
				required = required.concat(record.fetch);
			}
			
			if (record.include instanceof Array) {
				sys.enforce(record.include);
				required = required.concat(record.include);
			}
			
			if (record.allow instanceof Array) {
				var c, list = record.allow;
				record.allow = {};
				while (!!(c = list.pop())) {
					record.allow[c] = true;
				}
			}
			
			if (sys.isLoaded(required) || !required.length) {
				return sys.storeModule(record);
			}
			
			sys.load({
				list: required,
				callback: sys.storeModule,
				param: [record],
				killTime: record.killTime || 0
			});
			
		},
		
		storeModule: function(record) {
			record.lib = {};
			
			if (record.include instanceof Array) {
				record.lib = sys.createLib(record.include, record.path);
			}
			
			record.module = record.build(record.lib);
			
			library[record.path] = record;
			delete sys.pending[record.path];
			clearInterval(sys.killers[record.path]);
			
			sys.processQueue();
			
		},
		
		createLib: function(list, client)
		{
			var i = 0,
				len = list.length,
				lib = {},
				path,
				record,
				allowed;
				
			for (i;i < len; i++) {
				
				path = list[i];
				record = library[path];
				allowed = !!(!record.allow || record.allow[client]);
				lib[record.name] = allowed ? record.module : "Access denied!";

			}
			return lib;
		},
		
		destroy: function(/* paths */) {
			if (arguments.length) {
				for (var i = 0, c; c = arguments[i]; i++) {
					delete library[c];
				}
			} else {
				library = {};
			}
		}
	};
	
	// empty function used by instantiateModule
	function empty() {}
	
	/**Internal method to instantiate a modules prototype and apply it's constructor
	 * with an arguments object.
	 * 
	 * @param {Function} 	mod		Module
	 * @param {Object} 		args	Arguments object
	 */
	function instantiateModule(module, args) {
		if (typeof module == "function") {
			empty.prototype = module.prototype;
			var instance = new empty();
			module.apply(instance, args);
		}
	}
	
	return {
		/**@method mikado#add(record)
		 * 
		 * Adds a record containing module settings and the module build method to mikado.
		 * If all dependencies (include/fetch settings) are already loaded by mikado, it *builds* the module by invoking the "build" function setting.
		 * When dependencies need to be loaded, they will be loaded first before the build method gets invoked.
		 * 
		 * @param {Object} 		record				Hash; key = setting name, value = setting value.
		 * @param {String} 		record.path			Dot notated path to module file (omit extention).
		 * 
		 * 						This settings is REQUIRED and is CASE SENSITIVE, 
		 * 						the path is resolved from mikado root or maps to a repository token.
		 * 						Examples:
		 * 						-> "home.cat.Module" 		translates to 	rootPath + "/home/cat/Module.js"
		 * 						-> "ext:cat.Module"	translates to 	repositoryPath + "/cat/Module.js"
		 * 						In the above example, the "ext" token needs to be defined through mikado#set repositories {ext : "URL"}
		 * 
		 * @param {Array} 		record.include		A list of modules that will be loaded (if needed), attached to a Hash object and passed to the build function when invoked.
		 * 
		 * 						Listings (paths) need to be equal to the path notation defined in the target module file.
		 * 						Repository tokens (if any) will be ignored by mikado.
		 * 
		 * @param {Array} 		record.fetch		Same as record.include, except loaded modules will NOT be passed to the build method.
		 * 
		 * 						Fetching should be used to force paralel loading for the dependencies of included modules.
		 * 						For example, if the current module includes "some.Module" and that module has a dependency to "other.Module"
		 * 						"other.Module" then needs to be fetched unless it's directly used by the current module as well, in that case, include the sub dependency.
		 * 
		 * @param {Array} 		record.allow		A list of modules that are allowed to use the current module as include.
		 * 
		 * 						If the current module is loaded by a module that is not allowed, that module will not receive the current module in it's build parameter.
		 * 						This option should ONLY be used by security sensitive modules, though there is NO guarantee the module contents will be safe.						
		 * 						This is just a means to make it harder to access sensitive data or functionality.
		 * 
		 * @param {Number} 		record.killTime		A means to adjust killtime for dependency loading, but NOT the current module.
		 * 						
		 * 						
		 * @param {Function}	record.build		Module construction sandbox, receives a single Hash object as parameter containing included modules.
		 * 						
		 * 						The build method is based on a commonly used self invoking function pattern to keep variables out of the global scope.
		 * 						Instead of self invoking, mikado invokes the build method once all dependencies are loaded or present.
		 * 						The dependencies will be available on the single Hash object passed to the build method.
		 * 						
		 * 						example:
		 * 
		 * 							...
		 * 							build : function(lib) {
		 * 								var x = new lib.LoadedModule("someArgument");
		 * 								... CODE ...
		 * 								
		 * 								function TheModule() { ...CODE... }
		 * 								
		 * 								return TheModule;
		 * 							}
		 * 							...
		 * 						
		 * 						The return value of the build method will be stored as the actual module inside mikado
		 * 						and assigned as dependency for other modules. The module does NOT have to be a function, it can also
		 * 						be a singleton object containing methods.
		 * 
		 * 						Note! Though the "path" setting implies namespaces, the path namespace is actually abstracted away.
		 * 						Namespacing from module target will be preserved.
		 * 
		 * 						Since mikado abstracts away from a global namespace containing everything it is possible to load
		 * 						modules with similar names, though only one can be assigned as a dependency for another module.
		 */
		add: function(record) {
			if (settings.debug) {
				if (typeof record.path != "string") {
					throw "Error @ mikado#add : Expected string @ path parameter";
				}
				
				if (typeof record.build != "function") {
					throw "Error @ mikado#add : Expected function @ build parameter.";
				}
				
				if (record.include && !(record.include instanceof Array)) {
					throw "Error @ mikado#add : Expected an array @ include parameter.";
				}
			}
			
			sys.processModule(record);
			return this;
		},
		
		/**@method mikado#use(list[, callback[, killtime]])
		 * 
		 * Loads modules and when all modules are (already) loaded, attaches the modules
		 * to a Hash object and fires the callback (if any) function passing the hash as single argument.
		 * Can also be used to simply preload modules when omitting the callback.
		 * The mikado default killtime can be overridden without changing the default setting.
		 * 
		 * @param {Array} 		list			Array containing a list of module paths to load.
		 * @param {Function} 	callback		Callback function that gets called when all modules in the list are loaded.
		 * 
		 * 						The callback function will have an Hash as only argument containing references to the loaded modules
		 * 						from the passed list.
		 * 
		 * @param {Number} 		killTime		Killtime override for this specific transaction.
		 * 
		 * 						See mikado#set for more information about killtime.
		 */
		use: function(list, callback, killTime) {
			var manifest = {
				list: sys.enforce(list),
				killTime: killTime || 0
			};
			
			if (typeof callback == "function") {
				var copy = [].concat(list);
				manifest.callback = function() {
					var lib = {};
					for (var i = 0, c; c = copy[i]; i++) {
						c = library[c];
						lib[c.name] = c.module;
					}
					callback(lib);
				};
			}
			
			sys.load(manifest);
			return this;
		},
		
		/**@method mikado#run(modulePath [, arguments])
		 * 
		 * Instantiates a loaded module or first loads the module and then instantiates it.
		 * If the target module is a function, it will always be instantiated through the "new" operator.
		 * The instance is NOT returned through this means of instantiation.
		 * 
		 * See mikado#use if you want to use mikado in a more inline fashion.
		 * 
		 * @param {Object} 		modulePath				Path to a single module, preferably an initializer.
		 * @param {variable}	arguments				Any number of arguments the initializer might require/allow.
		 * @return {Void}								
		 */
		run: function(modulePath /*, arguments*/ ) {
			var args = Args(arguments, 1);
			if (library[modulePath]) {
				instantiateModule(library[modulePath].module, args);
			} else {
				sys.load({
					list: [modulePath],
					callback: function() {
						instantiateModule(library[modulePath].module, args);
					}
				});
			}
			return this;
		},
		
		/**@method mikado#set(params)
		 * 
		 * Changes mikado settings passed with a hash object.
		 * 
		 * @param {Object} 		params					Hash; key = setting name, value = setting value.
		 * @param {Number} 		params.killTime 		Max time in milliseconds a module gets to load before being killed.
		 * 
		 * 						A killed/timed-out module or modules that had a dependency to the killed module
		 * 						will never be build nor instantiated. Adjust accordingly when you use huge modules/scripts.
		 * 						This setting exists to allow users with slow connections to enjoy content without
		 * 						javascript bogging things down.
		 * 
		 * @param {String} 		params.root				Root directory of mikado.js
		 * 
		 * 						By default mikado attempts to set the root to the same directory mikado.js
		 * 						resides in, though this might fail in certain browser environments.
		 * 						To ensure default repository loading, set the root directory of mikado.js
		 * 
		 * @param {DomElement} 	params.scriptLocation	Element to which scripts will be appended.
		 * 
		 * 						By default scripts are loaded in the <HEAD> element of a HTML document.
		 * 
		 * @param {Object}		params.repositories		Hash; key = repository token, value = URL.
		 * 
		 * 						This allows module loading from other repositories/urls through a identifier token.
		 * 						This token is then used in module include/fetch declarations as "token:path.ModuleName"
		 * 						and mikado will lookup the path in the external repository.
		 * 
		 * @param {Object}		params.force			Hash; key = Module Name, value = path.
		 * 
		 * 						Forced modules will be used instead of modules with identical names.
		 * 						For example, if the module "Selector" is forced to path "home.css.Selector"
		 * 						that module will be used instead over another included module like "com.Selector".
		 * 						The other module will never be loaded.
		 * 
		 * @return {Void}
		 */
		set: function(params) {
			for (var key in params) {
				if (/(?:repositories|force)/.test(key)) {
					for (var repo in params[key]) {
						if (typeof params[key][repo] == "string") {
							settings[key][repo] = params[key][repo];
						}
					}
				} else if (settings[key]) {
					settings[key] = params[key];
				}
			}
			return this;
		}
	};
	
	
})();
