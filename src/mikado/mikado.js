/**
 * @author Ben Gerrissen http://www.netben.nl
 * @license MIT
 */

var mikado = function() {

	var library = {};
	var domLoaded = false;
	
	var settings = {
	
		timeout: 1500,
		
		root: (function() {
			var scripts = document.getElementsByTagName("script"), re = /\/mikado[^\/\\]*\.js.?$/i, i = scripts.length, src;
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
	
	var scripts = {};
	
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
			var result = [], i = 0, len = args.length;
			for (i; i < len; i++) {
				result.push(args[i]);
			}
			return result.slice(from);
		};
		
	})(1, 2);
	
	
	function EventDispatcher() {
		var listeners = {};
		return {
			add: function(event, listener) {
				if (!listeners[event]) {
					listeners[event] = [];
				}
				listeners[event].push(listener);
			},
			remove: function(event, listener) {
				if(!event) {
					return;
				}
				if(!listener && listeners[event]) {
					delete listeners[event];
					return;
				}
				var list = listeners[event], index;
				if (list && listener) {
					index = list.length;
					while (index--) {
						if (list[index] === listener) {
							list.splice(index, 1);
						}
					}
				}
			},
			dispatch: function(event, listener) {
				var list = listeners[event], index, length;
				if (list) {
					for (index = 0, length = list.length; index < length; index++) {
						list[index](event);
					}
				}
			}
		};
	}
	
	var domReady = (function() {
		var dispatcher = EventDispatcher();
		function pollDomReady(el) {
			if (el && !el.nextSibling) {
				el = document.body.removeChild(el);
				el = null;
				domLoaded = true;
				return dispatcher.dispatch("domReady");
			} else if (el) {
				document.body.removeChild(el);
				el = null;
			} else if (document.body) {
				el = document.body.appendChild(document.createElement("span"));
			}
			setTimeout(function() {
				pollDomReady(el);
			});
		}
		pollDomReady();
		return function(listener) {
			if (!domLoaded) {
				dispatcher.add("domReady", listener);
			} else {
				listener();
			}
		}
		
	})();
	
	var pending = {};
	var loadDispatcher = EventDispatcher();
	
	function loadDependencies(record) {
		if (!record.fetch) {
			return;
		}
		var list = record.fetch, path, script;
		
		record.dependencyListener = function(path) {
			var index = list.length;
			while (index--) {
				if (list[index] === path) {
					list.splice(index, 1);
				}
			}
			if (!list.length) {
				storeRecord(record);
				loadDispatcher.remove(path, record.dependencyListener);
			}
		}
		
		var index = list.length;
		while (index--) {
			path = list[index];
			if (library[path]) {
				list.splice(index, 1);
				continue;
			}
			
			if(!pending[path]) {
				pending[path] = [];
			}
			pending[path].push(record);
			
			loadDependency(path, record.timeout);
			loadDispatcher.add(path, record.dependencyListener);
		}
	}
	
	function loadDependency(path, timeout) {
		scripts[path] = scriptFragment.cloneNode(true);
		scripts[path].src = createFullPath(path);
		settings.scriptLocation.appendChild(scripts[path]);
		startKiller(path, timeout);
	}
	
	var killers = {};
	
	function startKiller(path, timeout) {
		// shutdown timeout mechanism when setting.timeout is set to 0 or fals(y).
		if(!settings.timeout) {
			return;
		}
		timeout = timeout ? Math.max(settings.timeout, timeout) : settings.timeout;
		killers[path] = {
			timeout: timeout,
			timeoutId: setTimeout(function(){
				delete pending[path];
				scripts[path].type = "TIMED OUT ['" + path + "'] @ " + timeout + "ms";
			}, timeout)
		}
	}
	
	function stopKiller(path) {
		if (killers[path] && settings.timeout) {
			clearTimeout(killers[path].timeoutId);
		}
	}
	
	function killerToDomReady(path) {
		if(!settings.timeout) {
			return;
		}
		stopKiller(path);
		var killer = killers[path];
		domReady(function(){
			startKiller(path, killer.node, killer.timeout);
		});
		var index = pending[path].length;
		while(i--) {
			killerToDomReady(pending[path][index].path);
		}
	}
	
	function enforce(list) {
		var i = 0, len = list.length, path, name;
		for (i; i < len; i++) {
			path = list[i];
			name = getNameFromPath(path);
			if (settings.force[name]) {
				list[i] = settings.force[name];
			}
		}
		return list;
	}
	
	function getNameFromPath(path) {
		return path.split(".").pop();
	}
	
	function createFullPath(path) {
		if (/^.*:/.test(path)) {
			var repositoryName = path.replace(/:.*$/, "");
			var repository = settings.repositories[repositoryName];
			path = path.replace(/^.*:/, "").replace(/\./g, "/") + ".js";
			if (!repository) {
				throw "Error @ mikado->internal 'createFullPath' : No repository set for '" + repositoryName + ":'";
			}
			return repository + path;
			
		} else {
			return settings.root + "/" + path.replace(/\./g, "/") + ".js";
		}
	}
	
	function setRequired(record) {
		record.fetch = record.fetch || [];
		if (record.include instanceof Array) {
			record.fetch = record.fetch.concat(record.include);
		}
		enforce(record.fetch);
	}
	
	function reformatAllowed(record) {
		if (record.allow instanceof Array) {
			var c, list = record.allow;
			record.allow = {};
			while (c = list.pop()) {
				record.allow[c] = true;
			}
		}
	}
	
	function setLibs(targetRecord) {
		var list = targetRecord.include, index = list.length, record, path, client = targetRecord.path;
		targetRecord.lib = {};
		
		while (index--) {
			path = list[index];
			record = library[path];
			if (record.allow && !record.allow[client]) {
				targetRecord.lib[record.name] = "Access denied!";
				continue;
			}
			targetRecord.hasDomTool = targetRecord.hasDomTool || record.domTool || record.hasDomTool;
			targetRecord.lib[record.name] = record.module;
		}
	}
	
	function processRecord(record) {
	
		record.name = getNameFromPath(record.path);
		reformatAllowed(record);
		setRequired(record);
		loadDependencies(record);
		
		if (!record.fetch.length) {
			storeRecord(record);
		}
	}
	
	function storeRecord(record) {
	
		if (record.domBuild && !domLoaded) {
			killerToDomReady(killerToDomReady(record.path));
			return domReady(function() {
				storeRecord(record);
			});
		}
		
		if (record.include instanceof Array) {
			setLibs(record);
		}
		
		record.module = record.build(record.lib);
		library[record.path] = record;
		
		// clean up
		cleanUp(record.path);
		
		// notify listeners.
		loadDispatcher.dispatch(record.path);
	}
	
	function cleanUp(path) {
		console.log(path)
		delete pending[path];
		stopKiller(path);
		delete killers[path];
		scripts[path].parentNode.removeChild(scripts[path]);
		delete scripts[path];
	}
	
	function empty() {
	}
	
	function instantiate(record, args) {
		var module = record.module;
		
		if (record.hasDomTool && !domLoaded) {
			domReady(function() {
				instantiate(record, args);
			});
			return;
		}
		
		if (typeof module == "function") {
			empty.prototype = module.prototype;
			var instance = new empty();
			module.apply(instance, args);
		}
	}
	
	return {
		/**Adds a module to the mikado library.
		 * 
		 * @param {Object} record REQUIRED
		 * 		Settings and attributes for the current module, order is NOT significant.

		 * 		setting		    type	   required             description
		 * 		+---------------+----------+--------+---------------------------------+
		 * 		| path			| String   | yes    | Dot notated path to module file |
		 * 		|               |          |        | relative to root or repository. |
		 * 		+---------------+----------+--------+---------------------------------+
		 * 		| build(lib)    | Function | yes    | Builder sandbox, gets executed  |
		 * 		|               |          |        | once module is loaded and should|
		 * 		|               |          |        | return the final module. The    |
 		 *      |               |          |        | build method will get a lib     |
		 *      |               |          |        | argument containing all included|
		 *      |               |          |        | modules						  |
		 * 		+---------------+----------+--------+---------------------------------+
		 * 		| include       | Array    | no     | List of other module paths which|
		 *      |               |          |        | are either required to build or |
		 *      |               |          |        | are being used by the current   |
		 *      |               |          |        | module. Included modules are    |
		 *      |               |          |        | added to the build lib argument.|
		 * 		+---------------+----------+--------+---------------------------------+
		 * 		| fetch         | Array    | no     | List of other module paths which|
		 *      |               |          |        | will be loaded but not added to |
		 *      |               |          |        | the build lib argument. Fetch   |
		 *      |               |          |        | is intended to load sub         |
		 *      |               |          |        | dependencies for faster loading.|
		 * 		+---------------+----------+--------+---------------------------------+
		 * 		| domBuild		| Boolean  | no     | Signify if build method requires|
		 * 		|   			|		   |        | DOM to build module properly.   |
		 * 		+---------------+----------+--------+---------------------------------+
		 *      | domTool       | Boolean  | no     | Signify if DOM is required      |
		 *      |               |          |        | before module can be used.      |
		 * 		+---------------+----------+--------+---------------------------------+
		 * 		| allow         | Array    | no     | List of other module path which |
		 *      |               |          |        | are allowed to use this module  |
		 *      |               |          |        | otherwise other modules CAN load|
		 *      |               |          |        | this module but won't be added  |
		 *      |               |          |        | the passed lib argument.        |
		 * 		+---------------+----------+--------+---------------------------------+
		 * 
		 * @return void
		 */
		module: function(record) {
			processRecord(record);
		},
		
		/**Instantiates (new) module with arguments, loads the module first if not present in mikado library.
		 * @param {String} path
		 * 		Dot notated path to module file relative to mikado root or external repository.
		 * 
		 * @param {Object} argument(s)
		 * 		Arguments passed to the module on instantiation. Multiple arguments are possible.
		 * 
		 * @return void;
		 */
		run: function(path /*, arguments*/) {
			var args = Args(arguments, 1), record = library[path];
			if (!record) {
				loadDispatcher.add(path, function(path) {
					instantiate(library[path], args);
				});
				loadDependency(path);
			} else {
				instantiate(record, args);
			}
			return this;
		},
		
		/**Loads modules into mikado memory if not already loaded.
		 * @param {Array} list
		 * 		Array with dot notated paths to module files, relative to mikado root or repository.
		 * 
		 * @param {Number} timeout
		 * 		Overrides mikado default timeout setting.
		 * 
		 * @return {Object} mikado
		 */
		fetch: function(list, timeout) {
			if(list instanceof Array) {
				var index = list.length;
				while(i--) {
					loadDependency(list[index], timeout);
				}
			}
			return this;
		},
		
		/**Modeled after YUI3's use method, load dependencies and fire a callback function when done.
		 * 
		 * @param {String} paths (multiple possible)
		 * 		One or more dot notated paths to module files, relative from mikado root or repository.
		 * 		Pass each path as a seperate argument.
		 * 
		 * @param {Function} callback
		 * 		Callback function that will be invoked after all dependencies are present in mikado library.
		 * 		The callback will receive a single argument containing the dependencies.
		 * 
		 * @param {Number} timeout
		 * 		Override default timeout setting for this specific load action.
		 * 
		 * @return {Object} mikado
		 */
		use: function(/* list MULTIPLE POSSIBLE, callback, timeout */) {
			var list = Args(arguments), index = list.length, timeout, callback, undefined, lib = {}, domTool;
			
			var dependencyListener = function(path) {
				var index = list.length;
				while (index--) {
					if (list[index] === path) {
						list.splice(index, 1);
					}
				}
				lib[library[path].name] = library[path].module;
				domTool = domTool || library[path].domTool || library[path].hasDomTool;
				if (!list.length) {
					loadDispatcher.remove(path, dependencyListener);
					if (callback && (!domTool || domLoaded)) {
						callback(lib);
					} else if (callback && !domLoaded) {
						domReady(function() {
							callback(lib);
						});
					}
				}
			}
			
			while (index--) {
				if (typeof list[index] == "string") {
					loadDependency(list[index]);
					loadDispatcher.add(list[index], dependencyListener);
					continue;
				}
				if (!isNaN(list[index]) && timeout === undefined) {
					timeout = list.splice(index, 1)[0];
				} else if (list[index] instanceof Function && !callback) {
					callback = list.splice(index, 1)[0];
				} else {
					list.splice(index, 1);
				}
			}
			
			return this;
		},
		
		/**Changes mikado internal settings.
		 * 
		 * @param {Object} params
		 * 		Following settings are mutable:
		 * 		setting		    type	                       description
		 * 		+---------------+----------+------------------------------------------+
		 * 		| timeout		| Number   | Number of milliseconds allowed for any   |
		 * 		|               |          | single module to load. When a module     |
		 * 		|               |          | times out, it will fail silently, but    |
		 * 		|               |          | leaves the script tag intact with a      |
		 * 		|               |          | message in it's type attribute           |
		 * 		+---------------+----------+------------------------------------------+
		 * 		| root   		| String   | Relative or absolute path to mikado.js   |
		 * 		|               |          | location. Mikado tries to set this       |
		 * 		|               |          | automatically, but setting it directly   |
		 * 		|               |          | can be more robust and failsafe.         |
		 * 		+---------------+----------+------------------------------------------+
		 * 		| scriptLocation| Element  | Relative or absolute path to mikado.js   |
		 * 		|               |          | location. Mikado tries to set this       |
		 * 		|               |          | automatically, but setting it directly   |
		 * 		|               |          | can be more robust and failsafe.         |
		 * 		+---------------+----------+------------------------------------------+
		 * 		| repositories  | Object   | A hash table (object) where keys signify |
		 * 		|               |          | tokens to be used as a means to super-   |
		 * 		|               |          | impose another URI to a module path and  |
		 * 		|               |          | values as the actual URL.				  |
		 * 		|               |          | To load a module from a repository,      |
		 * 		|               |          | prefix the module path with [token]:     |
		 * 		|               |          | so a path looks like:   				  |
		 * 		|               |          |       "org:widgets.lists.Accordion"	  |
		 * 		|               |          | and the repository setting looks like:	  |
		 * 		|               |          |       {org:"http://someurl.org/js/"}     |
		 * 		|               |          | !!USE WITH EXTREME CAUTION!!		      |
		 * 		+---------------+----------+------------------------------------------+
		 */
		settings: function(params) {
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
	
};
mikado = mikado();