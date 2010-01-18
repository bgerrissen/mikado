/**
 * @author Ben Gerrissen http://www.netben.nl/ bgerrissen@gmail.com
 * @license MIT
 * 
 * @version RC1
 * 
 * @todo
 * - unit tests
 * - test new killer mechanism properly
 * - investigate alternative for domBuild/domTool
 * - investigate expecting mikado.build to always return an Object or Function.
 * - backup script element load listeners to check if a script was loaded with no 'mikado.module' call inside.
 * - More proper error messages.
 * - Security messages?
 * 
 * @notes
 * 
 * Still pondering about repository feature, it's far from understandable in current state.
 * Perhaps require that external repositories to always need the repo token to be set in module
 * definition paths? Another way is to superimpose the repo token to all dependencies.
 * 
 * Dropped mikado.use method, thats more YUI's thing!
 * 
 * //noformat -> is a flag for Aptana JS editor, so formatting (ctrl-shift-f)
 * can only be done by selecting lines of code.
 */
//noformat
(function() {
    
	/*---------------------------------------------------------------*
	 *           settings, variables and constants                   *
	 *---------------------------------------------------------------*/
    
    var registry = {},
        
        domLoaded = 0,
        
        GLOBAL = this,
        
        CONTEXT = GLOBAL.document,
        
        ROOT = CONTEXT.documentElement,
        
        config = {
            
            // default time in miliseconds a module is allowed to take for loading.
            timeout: 1500,
            
            // default folder repository to attach module paths to.
            root:function() {
                var list = CONTEXT.getElementsByTagName("script"),
                    i = 0,
                    re = /\/mikado[^\/\\]*\.js.?$/i,
                    node;
                while((node = list[i++])) {
                    if(re.test(node.src)) {
                        return node.src.replace(re, "");
                    }
                }
            }(),
            
            // to put script elements in.
            scriptLocation: CONTEXT.getElementsByTagName("head")[0],
            
            // external repository token map
            repositories: {},
            
            // path override map
            force: {}
        },
        
        // stores active script elements.
        scripts = {},
        
        // stores pending records relative to loading modules.
        pending = {},
        
        // stores timeout killers
        killers = {},
        
        // used to create script elements for module loading.
        scriptFragment = CONTEXT.createElement("script");
        scriptFragment.type = "text/javascript";
        
        // used to instantiate modules.
        var empty = function(){},
        
        /*---------------------------------------------------------------*
         *                           utility                             *
         *---------------------------------------------------------------*/
        
        // no explanation needed to JS devs.
        slice = Array.prototype.slice,
        
        // Internal abstract EventDispatcher factory method.
        createDispatcher = function() {
            var listeners = {};
            return {
                add: function(type, listener) {
                    if (!listeners[type]) {
                        listeners[type] = [];
                    }
                    listeners[type].unshift(listener);
                },
                remove: function(type, listener) {
                    var list = listeners[type], i;
                    if (list) {
                        i = list.length;
                        while (i--) {
                            if (list[i] === listener) {
                                list.splice(i, 1);
                            }
                        }
                    }
                },
                clear: function(type) {
                    if(type && listeners[type]) {
                        delete listeners[type];
                    }
                },
                dispatch: function(type){
                    console.log("dispatching event -> "+type)
                    var list = listeners[type], i;
                    if (list) {
                        i = list.length;
                        while (i--) {
                            list[i](type);
                        }
                    }
                }
            }
        },
        
        // polls document.body to see if it's done rendering elements.
        // notifies listeners when the beast is ready.
        // This works, works well and I prefer simplicity over code forking.
        // might be off by ~25 miliseconds from other domReady implementations /shrug.
        domReady = (function() {
            var dispatcher = createDispatcher();
            var poll = function(el){ 
                    if (el && !el.nextSibling) {
                        CONTEXT.body.removeChild(el);
                        domLoaded = 1;
                        dispatcher.dispatch("domReady");
                        return (dispatcher = el = null);
                    } else if (el) {
                        CONTEXT.body.removeChild(el);
                        el = null;
                    } else if (CONTEXT.body) {
                        el = CONTEXT.body.appendChild(CONTEXT.createElement("span"));
                    }
                    setTimeout(function() {
                        poll(el);
                    });
                }
            poll();
            return function(listener) {
                if (!domLoaded) {
                    dispatcher.add("domReady", listener);
                } else {
                    listener();
                }
            }
        })(),

        /*---------------------------------------------------------------*
         *                      loading mechanism                        *
         *---------------------------------------------------------------*/
        loadDispatcher = createDispatcher(),
        
        /**Creates a proper URI from the dot notated path.
         * 
         * @param {String} path Dot notated path to the module, relative to mikado root or repository
         * @return {String} URI to module file.
         */
        createURI = function(path) {	
			if (/^.*:/.test(path)) {
				var repositoryName = path.replace(/:.*$/, ""),
					repository = config.repositories[repositoryName];
				if (!repository) {
					throw "Error @ mikado->internal 'createFullPath' : No repository set for '" + repositoryName + ":'";
				}
                path = path.replace(/^.*:/, "").replace(/\./g, "/") + ".js";
				return repository + path;
			}
			else {
				return config.root + "/" + path.replace(/\./g, "/") + ".js";
			}
        },
        
        /**Loads all dependencies defined in the module record.
         * 
         * @param {Object} record Module data and builder method.
         * @return {Boolean} true when there where dependencies that needed to be loaded.
         */
        loadDependencies = function(record){
            if(!record.fetch || !record.fetch.length){
                return false;
            }
            var list = record.fetch;
            record.dependencyTracker = function(path){
                var i = list.length;
                while(i--) {
                    if(list[i] === path) {
                        list.splice(i, 1);
                    }
                }
                if(!list.length) {
                    storeRecord(record);
                    loadDispatcher.remove(path, record.dependencyTracker);
                    delete record.dependencyTracker;
                }
            }
            var i = list.length, path;
            while(i--) {
                path = list[i];
                if(registry[path]){
                    list.splice(i, 1);
                    continue;
                }
                loadDispatcher.add(path, record.dependencyTracker);
                if (!pending[path]) {
                    loadDependency(path, record.timeout);
                }
                pending[path].push(record);
            }
            return true;
        },
        
        /**Appends a script tag to the scriptLocation with the URI to the module.
         * - calls startKiller()
         * - creates pending[path] registry
         * 
         * @param {String} path Dot notated path to the module, relative to mikado root or repository
         * @param {Number} timeout Timeout override in miliseconds
         * @return {Boolean} true if dependency is appended, false if dependency is already present.
         */
        loadDependency = function(path, timeout) {
            if(registry[path]) {
                return false;
            }
            if(!pending[path]) {
                pending[path] = [];
            }
            scripts[path] = scriptFragment.cloneNode(false);
            scripts[path].src = createURI(path);
            config.scriptLocation.appendChild(scripts[path]);
            startKiller(path, timeout);
            return true;
        },
        
        /*---------------------------------------------------------------*
         *                      killing mechanism                        *
         *---------------------------------------------------------------*/
        
        /**Recursively cleans up trail a timedout module leaves behind.
         * 
         * @param {String} path Dot notated path to the module, relative to mikado root or repository
         * @param {String} message Error message, will be appended to script element in type attribute.
         * @return {void}
         */
        kill = function(path, message){
            var prefix = message ? "DEPENDENCY " : "";
            message = message || "TIMED OUT ["+path+"] @ "+killers[path].timeout+"ms";
            scripts[path].type = prefix + message;
            var list = pending[path], i = 
                list.length;
            loadDispatcher.clear(path);
            while(i--) {
                kill(list[i].path, message);
                delete list[i];
            }
            delete pending[path];
        },
        
        /**Initializes a timeout procedure, calling kill() when timeout is achieved.
         * 
         * @param {String} path Dot notated path to the module, relative to mikado root or repository
         * @param {Number} timeout Timeout override in miliseconds
         * @return {Boolean} false if timeout mechanism is disabled through config.timeout
         */
        startKiller = function(path, timeout){
            if(!config.timeout) {
                return false;
            }
            timeout = timeout ? Math.max(timeout, config.timeout) : config.timeout;
            killers[path] = {
                timeout: timeout,
                timeoutID: setTimeout(function(){
                    kill(path);
                }, timeout)
            };
            
            return true;
        },
        
        /**Shuts down the timeout procedure.
         * 
         * @param {String} path Dot notated path to the module, relative to mikado root or repository
         * @return {void}
         */
        stopKiller = function(path){
            clearInterval(killers[path].timeoutID);
        },
        
        /*---------------------------------------------------------------*
         *                       record mechanism                        *
         *---------------------------------------------------------------*/
        
        /**Filters the module name from dot notated path.
         * 
         * @param {String} path Dot notated path to the module, relative to mikado root or repository
         * @return {String} name of the module.
         */
        getNameFromPath = function(path){
            return path ? path.split(".").pop() : null;
        },
        
        /**Checks dependencies on module name and forces relative set module paths
         * defined in config.force map.
         * 
         * @param {Array} list List of module paths (dot notated)
         * @return {void}
         */
        enforce = function(list) {
            var i = list.length, name;
            while(i--) {
                name = getNameFromPath(list[i]);
                if(name && config.force[name]) {
                    list[i] = config.force[name];
                }
            }
        },
        
        /**Concatenates record.fetch and record.include arrays to be used for
         * dependency loading.
         * 
         * @param {Object} record Module data and builder method.
         * @return {void}
         */
        setRequired = function(record){
            record.fetch = record.fetch || [];
            if(record.include instanceof Array) {
                record.fetch = record.fetch.concat(record.include);
            }
            enforce(record.fetch);
        },
        
        /**Reformats allowed array to object map.
         * 
         * @param {Object} record
         * @return {void}
         */
        setAllowed = function(record){
            if(record.allow instanceof Array) {
                var list = record.allow, path;
                record.allow = {};
                while((path = list.pop())) {
                    record.allow[path] = true;
                }
            }
        },
        
        /**Builds library object containing 'include' dependency modules.
         * 
         * @param {Object} targetRecord
         * @return {void}
         */
        setLibraries = function(targetRecord) {
            console.log(targetRecord)
            var list = targetRecord.include,
                i = list.length,
                client = targetRecord.path,
                record, path;
            targetRecord.library = {};
            while(i--) {
                path = list[i];
                record = registry[path];
                if(record.allow && !record.allow[client]) {
                    targetRecord.library[record.name] = "Access denied!";
                    continue;
                }
                targetRecord.hasDomTool = targetRecord.hasDomTool || record.domTool || record.hasDomTool || false;
                if (record.module) {
                    targetRecord.library[record.name] = record.module;
                }
            }
        },
        
        /**A bit of foolproofing, in case the path in the module is malformed or incorrect.
         * Checks with 'pending' map on module name.
         * 
         * @param {Object} record
         * @exception {String} Resolve error
         * @return {void}
         */
        resolvePath = function(record){
            var name = record.name || getNameFromPath(record.path),
                path = record.path || name;
            if(pending[path]) {
                return;
            }
            var candidates = [], key;
            for(key in pending) {
                if(name == getNameFromPath(key)){
                    candidates.push(key);
                }
            }
            if(candidates.length === 1) {
                record.path = candidates[0];
            } else {
                throw "ERROR: could not resolve incorrect path: '"+path+"'";
            }
        },
        
        /**Reformats record for convenience and starts dependency loading if required.
         * Disables the killer mechanism for this specific record.
         * When there are no dependencies, storeRecord() is called right away.
         * 
         * @param {Object} record
         * @return {void}
         */
        processRecord = function(record){
            resolvePath(record);
            stopKiller(record.path);
            record.name = record.name || getNameFromPath(record.path);
            setAllowed(record);
            setRequired(record);
            if(!loadDependencies(record)) {
                storeRecord(record);
            }
        },
        
        /**Builds the final record or delays building till DOM is ready depending on record.domBuild setting.
         * Notifies any module listeners that rely on current record.
         * Cleans up trail.
         * 
         * @param {Object} record
         * @return {void}
         */
        storeRecord = function(record){
            if(record.domBuild && !domLoaded) {
                domReady(function(){
                    storeRecord(record);
                });
                return false;
            }
            if(record.include instanceof Array) {
                setLibraries(record);
            }
            if(typeof record.build == "function") {
                record.module = record.build(record.library);
                delete record.build;
            }
            registry[record.path] = record;
            loadDispatcher.dispatch(record.path);
            cleanUp(record.path);
        },
        
        /**Cleans up trail of module (path used as identifier)
         * 
         * @param {String} path
         * @return {void}
         */
        cleanUp = function(path){
            delete pending[path];
            delete killers[path];
            scripts[path].parentNode.removeChild(scripts[path]);
            delete scripts[path];
        },
        
        /**Instantiates module if module is a function.
         * Checks first if module has domTool dependencies, if so;
         * relays instaniate procedure to domReady event.
         * 
         * @param {Object} record
         * @param {Array} args
         */
        instantiate = function(record, args) {
    		if (record.hasDomTool && !domLoaded) {
    			return domReady(function() {
    				instantiate(record, args);
    			});
    		}
            var module = record.module;
    		if (typeof module == "function") {
    			empty.prototype = module.prototype;
    			var instance = new empty();
    			module.apply(instance, args);
    		}
        },
        
        /*---------------------------------------------------------------*
         *                       final mikado API                        *
         *---------------------------------------------------------------*/
        
        api = {
            /**Add a module schema to mikado registry, following 'record' settings are possible:
             * 
             * REQUIRED:
             * - path        Dot notated path to module file, relative to mikado root or repository config.
             * - build       Builder method, return result will become the module.
             * 
             * OPTIONAL:
             * - domTool     Set to true if module relies on DOM ready event to be USED.
             * - domBuild    Set to true if module required DOM to be ready to BUILD.
             * - name        Name of module, will be parsed from path otherwise.
             * - include     Dot notated paths to other modules the current module requires.
             * - fetch       Dot notated paths to other modules the current module does NOT require,
             *               fetch can be used to force paralel loading of modules used by include dependencies.
             * - allow       A list of dot notated paths of modules that are allowed to use current module.
             *               If a module loads a disallowed submodule, that module will not be made available.
             * 
             * @param {Object} record see above
             * @return {void}
             */
            module: function(record) {
    			processRecord(record);
    		},
            
            /**Creates an instance of the module, loads module if not already present in registry.
             * Any extra arguments will be passed to the module constructor.
             * Will NOT instantiate module if the module is not a function.
             * Will relay instantiation if module requires DOM to be ready due to having 'domTool' setting set to true.
             * 
             * @param {Object} path Dot notated path to module file relative to mikado root or repository.
             * @param {Object} arguments Multiple possible, any argument the module might require.
             * @return {Object} mikado
             */
            run: function(path /*, arguments*/) {
    			var args = slice.call(arguments, 1), 
                    record = registry[path];
    			if (!record) {
    				loadDispatcher.add(path, function(path) {
    					instantiate(registry[path], args);
    				});
    				loadDependency(path);
    			} else {
    				instantiate(record, args);
    			}
    			return this;
    		},
            
            /**Loads modules defined in list and overrides timeout if set.
             * Cannot disable timeout mechanism, use config to disable timeout mechanism.
             * 
             * @param {Array} list Array with dot notated paths to modules for loading.
             * @param {Number} timeout Time module can take to load in miliseconds.
             * @return {Object} mikado
             */
            fetch: function(list, timeout) {
    			if(list instanceof Array) {
    				var i = list.length;
    				while(i--) {
    					loadDependency(list[i], timeout);
    				}
    			}
    			return this;
    		},
            
            /**Checks if module is present and thus loaded in registry.
             * 
             * @param {Object} path Dot notated path to module file relative to mikado root or repository.
             * @return {Boolean} true if the module is present in registry.
             */
            available: function(path) {
                return !!registry[path];
            },
            
            /**Setter method for mikado config.
             * - root                URI of module root folder, defaults to mikado root folder.
             * - scriptLocation      DOM element to which script elements are added to load modules.
             * - timeout             Main timeout for module loading in miliseconds, 
             *                       set to 0 to disable timeout mechanism. defaults to 1500 ms.
             * - force               Force any path that leads to module name to a default path.
             *                       For example: force : {"Selector":"some.Selector"} will
             *                       force any other path that leads to a Selector module to 
             *                       "some.Selector".
             * - repositories        Maps tokens to other URI's for example:
             *                       repositories : {"yui":"http://yuisite.com/modules/"}
             *                       forces all modules with "yui:" prefix to be loaded from defined url.
             * 
             * 
             * @param {Object} params
             */
            config: function(params) {
                for (var key in params) {
                    if (/(?:repositories|force)/.test(key)) {
                        for (var name in params[key]) {
                            if (typeof params[key][name] == "string") {
                                config[key][name] = params[key][name];
                            }
                        }
                    } else if (config[key]) {
                        config[key] = params[key];
                    }
                }
                return this;
            }
            
        };
        
   // unleash mikado
   GLOBAL.mikado =  api;

})();