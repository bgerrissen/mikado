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
	
	function empty() {
	}
	
	function instantiateModule(mod, args) {
		if (typeof mod == "function") {
			empty.prototype = mod.prototype;
			var obj = new empty();
			mod.apply(obj, args);
		}
	}
	
	return {
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
