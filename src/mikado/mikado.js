/**
 * @author Ben Gerrissen http://www.netben.nl/ bgerrissen@gmail.com
 * @license MIT
 * 
 * @version RC2
 * 
 * @todo
 * - unit tests
 * - test new killer mechanism properly
 * - investigate alternative for domBuild/domTool
 * - investigate expecting mikado.build to always return an Object or Function.
 * - backup script element load listeners to check if a script was loaded with no 'mikado.module' call inside.
 * - More proper error messages.
 * - Security messages?
 * - Module versions?
 * 
 * @notes
 * 
 * Still pondering about repository feature, it's far from understandable in current state.
 * Perhaps require that external repositories to always need the repo token to be set in module
 * definition paths? Another way is to superimpose the repo token to all dependencies.
 * 
 * Dropped mikado.use method, thats more YUI's thing!
 * 
 */

(function() {
    
	/*---------------------------------------------------------------*
	 *           settings, variables and constants                   *
	 *---------------------------------------------------------------*/
    
    var registry = {}, scripts = {}, pending = {}, killers = {}, errorLog = [];
        
    var domLoaded = 0;
        
    var GLOBAL = this, CONTEXT = GLOBAL.document, ROOT = CONTEXT.documentElement;
        
    var TARGET = CONTEXT.getElementsByTagName("head")[0];
    
    var COMPLETE = "complete", LOADED = "loaded", LOADING = "loading", ERROR = "error", DOMREADY = "domReady";
        
    var config = {
        
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
        
        // external repository token map
        repositories: {},
        
        // path override map
        force: {}
    };
        
    // used to create script elements for module loading.
    var scriptFragment = CONTEXT.createElement("script");
    scriptFragment.type = "text/javascript";
        
    // used to instantiate modules.
    var empty = function(){};
        
    /*---------------------------------------------------------------*
     *                           utility                             *
     *---------------------------------------------------------------*/
        
    // no explanation needed to JS devs.
    var slice = Array.prototype.slice;
        
    // Internal abstract EventDispatcher factory method.
    var listeners = {}
    var dispatcher = {
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
        dispatch: function(type, data){
            var list = listeners[type], i;
            if (list) {
                i = list.length;
                while (i--) {
                    list[i](data||type);
                }
            }
        }
    };
        
    var log = function(data) {
        data.stamp = +new Date();
        errorLog.push(data);
        dispatcher.dispatch(ERROR, data);
    }
        
    var initDomReady = function(){
        if(!domLoaded) {
            domLoaded = 1;
            dispatcher.dispatch(DOMREADY);
        }
    }
    
    // based on Diego Perini's work.
    // http://javascript.nwbox.com/ContentLoaded/ +
    // http://javascript.nwbox.com/IEContentLoaded/
    if(CONTEXT.addEventListener) {
        var W3CContentLoaded = function(){
            initDomReady();
            CONTEXT.removeEventListener('DOMContentLoaded', arguments.callee, false);
            CONTEXT.removeEventListener('load', arguments.callee, false);
        }
        CONTEXT.addEventListener('DOMContentLoaded', W3CContentLoaded, false);
        CONTEXT.addEventListener('load', W3CContentLoaded, false);
    } else if(CONTEXT.attachEvent){
        var size = 0;
        var poll = function() {
            try {
                // throws errors until after ondocumentready
                ROOT.doScroll('left');
                size = ROOT.outerHTML.length;
                if (size * 1.03 < CONTEXT.fileSize * 1) {
                    return setTimeout(poll, 50);
                }
            } 
            catch (e) {
                return setTimeout(poll, 50);
            }
            initDomReady();
        }
        var IEContentLoaded = function(){
            if(CONTEXT.readyState != 'complete') {
                poll();
            } else {
                initDomReady();
            }
            CONTEXT.detachEvent('onreadystatechange', arguments.callee);
            CONTEXT.detachEvent('load', arguments.callee);
        }
        CONTEXT.attachEvent('onreadystatechange', IEContentLoaded);
        CONTEXT.attachEvent('load', IEContentLoaded);
    } else {
        // from Simon Willison
        var oldonload = GLOBAL.onload;
        GLOBAL.onload = function(event) {
            initDomReady();
            if (typeof oldonload == 'function') {
                oldonload(event || GLOBAL.event);
            }
        }
    }
    
    var domReady = function(listener){
        if (!domLoaded) {
            dispatcher.add(DOMREADY, listener);
        } else {
            listener();
        }
    }

    /*---------------------------------------------------------------*
     *                      loading mechanism                        *
     *---------------------------------------------------------------*/
    
    // Adding a global handler to store records once all dependencies are loaded.
    // Passing as anonymous function since we never want to remove this listener.
    dispatcher.add(COMPLETE, function(e){
        var list = pending[e.path];
        if(!list || !list.length) {
            return;
        }
        var i = list.length, j, current;
        while((current = list[--i])) {
            j = current.fetch.length;
            while(j && j--) {
                if(current.fetch[j] != e.path) {
                    continue;
                }
                current.fetch.splice(j, 1);
                if(!current.fetch.length) {
                    storeRecord(current);
                    list.splice(i, 1);
                }
            }
        }
    });
        
    /**Creates a proper URI from the dot notated path.
     * 
     * @param {String} path Dot notated path to the module, relative to mikado root or repository
     * @return {String} URI to module file.
     */
    var createURI = function(path) {
        for(var key in config.repositories) {
            if(RegExp("^"+key).test(path)) {
                return config.repositories[key] + path.replace(/\./g, "/") + ".js";
            }
        }    
	    return config.root + "/" + path.replace(/\./g, "/") + ".js";
    }
    
    /**Loads all dependencies defined in the module record.
     * 
     * @param {Object} record Module data and builder method.
     * @return {Boolean} true when there where dependencies that needed to be loaded.
     */
    var loadDependencies = function(record){
        if(!record.fetch || !record.fetch.length){
            return false;
        }
        var list = record.fetch, i = list.length, path;
        while(i--) {
            path = list[i];
            if(registry[path]){
                list.splice(i, 1);
                continue;
            }
            if (!pending[path]) {
                loadDependency(path, record.timeout);
            }
            pending[path].push(record);
        }
        return true;
    }
    
    /**Appends a script tag to the TARGET with the URI to the module.
     * - calls startKiller()
     * - creates pending[path] registry
     * 
     * @param {String} path Dot notated path to the module, relative to mikado root or repository
     * @param {Number} timeout Timeout override in miliseconds
     * @return {Boolean} true if dependency is appended, false if dependency is already present.
     */
    var loadDependency = function(path, timeout) {
        if(registry[path]) {
            return false;
        }
        if(!pending[path]) {
            pending[path] = [];
        }
        scripts[path] = scriptFragment.cloneNode(false);
        scripts[path].src = createURI(path);
        TARGET.appendChild(scripts[path]);
        dispatcher.dispatch(LOADING, {
            path: path,
            timeout: timeout ? Math.max(timeout, config.timeout) : config.timeout,
            stamp: +new Date()
        });
        return true;
    }
    
    /*---------------------------------------------------------------*
     *                      killing mechanism                        *
     *---------------------------------------------------------------*/
    
    /**Recursively cleans up trail a timedout module leaves behind.
     * 
     * @param {String} path Dot notated path to the module, relative to mikado root or repository
     * @param {String} message Error message, will be appended to script element in type attribute.
     * @return {void}
     */
    var kill = function(path, message){
        var prefix = message ? "DEPENDENCY -> " : "";
        message = message || "TIMED OUT ["+path+"] @ "+killers[path].timeout+"ms";
        log({
            message: message,
            resolution: "timeout"
        });
        var list = pending[path], i = 
            list.length;
        while(i--) {
            kill(list[i].path, message);
            delete list[i];
        }
        delete pending[path];
    }
    
    /**Initializes a timeout procedure, calling kill() when timeout is achieved.
     * 
     * @param {String} path Dot notated path to the module, relative to mikado root or repository
     * @param {Number} timeout Timeout override in miliseconds
     * @return {Boolean} false if timeout mechanism is disabled through config.timeout
     */
    dispatcher.add(LOADING, function(e){
        if(!config.timeout) {
            return false;
        }
        killers[e.path] = {
            timeout: e.timeout,
            timeoutID: setTimeout(function(){
                kill(e.path);
            }, e.timeout)
        };
        
        return true;
    })
    
    /**Shuts down the timeout procedure once the module has loaded
     * (but not yet stored) and cleans up killer footprint.
     */
    dispatcher.add(LOADED, function(e){
        clearInterval(killers[e.path].timeoutID);
        delete killers[e.path];
    });
        
    /*---------------------------------------------------------------*
     *                       record mechanism                        *
     *---------------------------------------------------------------*/
    
    /**Filters the module name from dot notated path.
     * 
     * @param {String} path Dot notated path to the module, relative to mikado root or repository
     * @return {String} name of the module.
     */
    var getNameFromPath = function(path){
        return path ? path.split(".").pop() : null;
    }
    
    /**Checks dependencies on module name and forces relative set module paths
     * defined in config.force map.
     * 
     * @param {Array} list List of module paths (dot notated)
     * @return {void}
     */
    var enforce = function(list) {
        var i = list.length, name;
        while(i--) {
            name = getNameFromPath(list[i]);
            if(name && config.force[name]) {
                list[i] = config.force[name];
            }
        }
        return list;
    }
    
    /**Concatenates record.fetch and record.include arrays to be used for
     * dependency loading.
     * 
     * @param {Object} record Module data and builder method.
     * @return {void}
     */
    var setRequired = function(record){
        record.fetch = record.fetch || [];
        if(record.include instanceof Array) {
            record.fetch = record.fetch.concat(record.include);
        }
        return enforce(record.fetch);
    }
    
    /**Reformats allowed array to object map.
     * 
     * @param {Object} record
     * @return {void}
     */
    var setAllowed = function(record){
        if(record.allow instanceof Array) {
            var list = record.allow, path;
            record.allow = {};
            while((path = list.pop())) {
                record.allow[path] = true;
            }
        }
    }
    
    /**Builds library object containing 'include' dependency modules.
     * 
     * @param {Object} targetRecord
     * @return {void}
     */
    var setLibraries = function(targetRecord) {
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
                log({
                    message: "Disallowed acces from "+path+" to "+targetRecord.path,
                    resolution: "continue"
                });
                continue;
            }
            targetRecord.hasDomTool = targetRecord.hasDomTool || record.domTool || record.hasDomTool || false;
            if (record.module) {
                targetRecord.library[record.name] = record.module;
            }
        }
    }
    
    /**A bit of foolproofing, in case the path in the module is malformed or incorrect.
     * Checks with 'pending' map on module name.
     * 
     * @param {Object} record
     * @exception {String} Resolve error
     * @return {Boolean} false if path cannot be resolved
     */
    var resolvePath = function(record){
        var name = record.name || getNameFromPath(record.path),
            path = record.path || name;
        if(pending[path]) {
            return true;
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
            log({
                message: "could not resolve path '"+path+"'",
                resolution: "fail"
            });
            return false;
        }
        return true;
    }
    
    /**Reformats record for convenience and starts dependency loading if required.
     * Disables the killer mechanism for this specific record.
     * When there are no dependencies, storeRecord() is called right away.
     * 
     * @param {Object} record
     * @return {void}
     */
    var processRecord = function(record){
        if(!resolvePath(record)){
            return;
        }
        record.name = record.name || getNameFromPath(record.path);
        setAllowed(record);
        setRequired(record);
        dispatcher.dispatch(LOADED, {
            path: record.path,
            stamp: +new Date()
        });
        if(!loadDependencies(record)) {
            storeRecord(record);
        }
    }
    
    /**Builds the final record or delays building till DOM is ready depending on record.domBuild setting.
     * Notifies any module listeners that rely on current record.
     * 
     * @param {Object} record
     * @return {void}
     */
    var storeRecord = function(record){
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
        dispatcher.dispatch(COMPLETE, {
            path: record.path,
            stamp: +new Date()
        });
        cleanUp(record.path);
    }
    
    /**Cleans up footprint of module (path used as identifier)
     * 
     * @param {String} path
     * @return {void}
     */
    var cleanUp = function(path){
        delete pending[path];
        scripts[path].parentNode.removeChild(scripts[path]);
        delete scripts[path];
    }
    
    /**Instantiates module if module is a function.
     * Checks first if module has domTool dependencies, if so;
     * relays instaniate procedure to domReady event.
     * 
     * @param {Object} record
     * @param {Array} args
     * @return {void}
     */
    var instantiate = function(record, args) {
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
    }
    
    /*---------------------------------------------------------------*
     *                       final mikado API                        *
     *---------------------------------------------------------------*/
    
    var api = {
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
				dispatcher.add(COMPLETE, function(e) {
                    if (e.path == path) {
                        instantiate(registry[path], args);
                        dispatcher.remove(COMPLETE, arguments.callee);
                    }
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
         * - timeout             Main timeout for module loading in miliseconds, 
         *                       set to 0 to disable timeout mechanism. defaults to 1500 ms.
         * - force               Force any path that leads to module name to a default path.
         *                       For example: force : {"Selector":"some.Selector"} will
         *                       force any other path that leads to a Selector module to 
         *                       "some.Selector".
         * - repositories        Maps the start part of a possible path to another script
         *                       repository. For example: 
         *                           repositories : {
         *                               "test.home" : "/src/"
         *                           }
         *                       maps any path thats starts with "test.home" to the /src/ directory.
         *                       Can also be used to load modules from another domain.
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
        },
        
        /**Adds an event listener for mikado events.
         * Events can be one of the following (event object described after each event)
         * - loading {target:"path", stamp:"timestamp"}
         * - loaded {target:"path", stamp:"timestamp"}
         * - complete {target:"path", stamp:"timestamp"}
         * - error {message:"text", resolution:"text", stamp:"timestamp"}
         * 
         * @param {String} eventType
         * @param {Function} handler
         * @return {Object} mikado
         */
        listen: function(eventType, handler){
            dispatcher.add(eventType, handler)
            return this;
        },
        
        /**Removes an event listener.
         * 
         * @param {String} eventType
         * @param {Function} handler
         * @return {Object} mikado
         */
        deafen: function(eventType, handler){
            dispatcher.remove(eventType, handler)
            return this;
        },
        
        /**returns error log.
         */
        getErrorLog: function() {
            return errorLog;
        }
        
    };
        
   // unleash mikado
   GLOBAL.mikado =  api;

})();