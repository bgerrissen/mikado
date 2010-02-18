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

(function() {
    
	/*---------------------------------------------------------------*
	 *           settings, variables and constants                   *
	 *---------------------------------------------------------------*/
    
    var registry = {}, scripts = {}, pending = {}, killers = {}, eventLog = [],
        
    domLoaded = 0,
        
    GLOBAL = this, CONTEXT = GLOBAL.document, ROOT = CONTEXT.documentElement,
        
    HEAD = CONTEXT.getElementsByTagName("head")[0],
    
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
        
        // external repository map
        repositories: {},
        
        // path override map
        force: {}
    },
        
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
    
    augment = function(receiver, provider){
        if (provider) {
            for (var key in provider) {
                receiver[key] = provider[key];
            }
        }
        return receiver;
    },
        
    // Internal abstract EventDispatcher factory method.
    listeners = {},
    dispatcher = {
        listen: function(type, listener) {
            if (!listeners[type]) {
                listeners[type] = [];
            }
            listeners[type].unshift(listener);
        },
        deafen: function(type, listener) {
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
            data = data || {};
            data.type = type;
            if (list) {
                i = list.length;
                while (i--) {
                    list[i](data);
                }
            }
        }
    },
    
    Event = function(type, data){
        this.type = type || this.type;
        this.timestamp = +new Date();
        augment(this, data);
    }
    
    Event.prototype = {
        type: 'none',
        message: null,
        resolution: null,
        path: null
    };
    
    augment(Event, {
        COMPLETE: 'complete',
        LOADING: 'loading',
        LOADED: 'loaded',
        ERROR: 'error',
        DOMREADY: 'domReady',
        RUN: 'run',
        RAN: 'ran'
    });
    
    /**Logs data and dispatches it as event.
     * 
     * @param {String} type Event type
     * @param {Object} data Key/Value hash
     */
    var log = function(type, data) {
        var e = new Event(type, data);
        eventLog.push(e);
        dispatcher.dispatch(type, e);
    },
        
    initDomReady = function(){
        if(!domLoaded) {
            domLoaded = 1;
            dispatcher.dispatch(Event.DOMREADY);
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
    
    /*---------------------------------------------------------------*
     *                      loading mechanism                        *
     *---------------------------------------------------------------*/
    
    // Adding a global handler to store records once all dependencies are loaded.
    dispatcher.listen(Event.COMPLETE, function(e){
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
        var list = record.fetch, i = list.length, path;
        while(i--) {
            path = list[i];
            if(registry[path]){
                list.splice(i, 1);
                continue;
            }
        }
        if(!list.length) {
            return false;
        }
        list = [].concat(list);
        i = list.length;
        while(i--) {
            path = list[i];
            if(pending[path]){
                list.splice(i, 1);
                pending[path].push(record);
            } else {
                pending[path] = [record];
            }
        }
        appendScripts(list, record.timeout);
        return true;
    },
    
    /**Iterates over a list of dot notated module paths and appends them to the scriptLocation
     * through a documentFragment.
     * 
     * @param {String} path Dot notated path to the module, relative to mikado root or repository
     * @param {Number} timeout Timeout override in miliseconds
     */
    appendScripts = function(list, timeout){
        var i = list.length, path,
            fragment = document.createDocumentFragment();
        while(i--){
            path = list[i];
            scripts[path] = scriptFragment.cloneNode(true);
            scripts[path].src = createURI(path);
            fragment.appendChild(scripts[path]);
            log(Event.LOADING, {
                path: path,
                timeout: timeout
            });
        }
        HEAD.appendChild(fragment);
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
        var prefix = message ? "Dependency '"+path+"'" : "";
        message = message || "Timed out @ "+killers[path].timeout+"ms";
        log(Event.ERROR, {
            path: path,
            message: message,
            resolution: "failed silently"
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
    dispatcher.listen(Event.LOADING, function(e){
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
    dispatcher.listen(Event.LOADED, function(e){
        if (killers[e.path]) {
            clearInterval(killers[e.path].timeoutID);
            delete killers[e.path];
        }
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
        return list;
    },
    
    /**Loops over an array to check for dependency descriptors.
     * If a descriptor contains the attribute 'path' and 'when' is truthy
     * the list item gets replaced by the path, otherwise it is removed from the list.
     * If 'path' wasn't a string for some reason, the list item gets removed as well.
     * 
     * @param {Array} list
     * @return {void}
     */
    prepareDependencies = function(list){
        if(list) {
            var i = list.length;
            while(i--) {
                if(typeof list[i] === 'string') {
                    continue;
                }
                if(list[i].path && list[i].when) {
                    list[i] = list[i].path;
                }
                if(typeof list[i] !== 'string') {
                    list.splice(i,1);
                }
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
        prepareDependencies(record.fetch);
        prepareDependencies(record.include);
        record.fetch = record.fetch || [];
        if(record.include instanceof Array) {
            record.fetch = record.fetch.concat(record.include);
        }
        return enforce(record.fetch);
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
                log(Event.ERROR, {
                    path: targetRecord.path,
                    message: "Disallowed acces to '"+path+"'",
                    resolution: "failed silently"
                });
                continue;
            }
            if(record.traits.domTool) {
                targetRecord.traits.domTool = true;
            }
            if (record.module) {
                targetRecord.library[record.name] = record.module;
            }
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
        record.name = record.name || getNameFromPath(record.path);
        record.traits || (record.traits = {});
        record.traits.path = record.path;
        record.traits.name = record.name;
        record.timeout = record.timeout ? Math.max(timeout, config.timeout) : config.timeout;
        setAllowed(record);
        setRequired(record);
        log(Event.LOADED, record.traits);
        if(!loadDependencies(record)) {
            storeRecord(record);
        }
    },
    
    /**Builds the final record or delays building till DOM is ready depending on record.traits.domBuild setting.
     * Notifies any module listeners that rely on current record.
     * 
     * @param {Object} record
     * @return {void}
     */
    storeRecord = function(record){
        if(record.traits.domBuild && !domLoaded) {
            dispatcher.listen(Event.DOMREADY, function(){
                storeRecord(record);
            });
            return false;
        }
        if(record.include instanceof Array) {
            setLibraries(record);
        }
        if(typeof record.build == "function") {
            try {
                record.module = record.build(record.library);
                delete record.build;
            } catch(e) {
                log(Event.ERROR, {
                    error: e,
                    path: record.path,
                    message: 'failed to build module',
                    resolution: 'failed silently'
                });
            }
        }
        registry[record.path] = record;
        log(Event.COMPLETE, record.traits);
    }
    
    /**Cleans up footprint.
     */
    dispatcher.listen(Event.COMPLETE, function(e){
        if(scripts[e.path]) {
            scripts[e.path].parentNode.removeChild(scripts[e.path]);
        }
        delete pending[e.path];
        delete scripts[e.path];
    });
    
    /**Instantiates module if module is a function.
     * Checks first if module has domTool dependencies, if so;
     * relays instaniate procedure to domReady event.
     * 
     * @param {Object} record
     * @param {Array} args
     * @return {void}
     */
    var instantiate = function(record, args) {
        var module = record.module, instance;
		if (typeof module == "function") {
            log(Event.RUN, record.traits);
            empty.prototype = module.prototype;
			instance = new empty();
			module.apply(instance, args);
            log(Event.RAN, record.traits);
		} else {
            log(Event.ERROR, {
                path: record.path,
                message: "Nothing is run @ '"+record.path+"'",
                resolution: "failed silently"
            });
        }
        return instance;
    },
    
    /**Runs a module by simple path + args or through a descriptor object.
     * When running a module through a descriptor object, we can do more.
     * 
     * Example using simple path:
     * 
     *     mikado.run('some.path.Module', 'argument1', argument2);
     *     
     * Example using descriptor:
     * 
     *     mikado.run({
     *         path: 'some.path.Module',
     *         args: ['argument1', 'argument2'],
     *         // optional timeout override
     *         timeout: 30000,
     *         // optional method call chaining
     *         invoke: [
     *             {
     *                 method: 'someMethod',
     *                 args: ['argument1', 'argument2']
     *             },
     *             {
     *                 method: 'otherMethod',
     *                 args: ['argument1', 'argument2']
     *             },
     *         ],
     *         // once done, run next descriptor, same options possible.
     *         run: {
     *             path: 'other.path.Module',
     *             args: ['argument1', 'argument2']
     *         }
     *         
     *     });
     * 
     * @param {String} path
     * @param {Array} args
     * @param {Object|undefined} descriptor
     * @param {Number|undefined} timeout
     * @return {void}
     */
    run = function(path, args, descriptor, timeout){
        var record = registry[path];
        
        // try again when module is actually loaded.
        if(!record) {
            dispatcher.listen(Event.COMPLETE, function(e){
                if(e.path === path) {
                    dispatcher.deafen(Event.COMPLETE, arguments.callee);
                    run(path, args, descriptor);
                }
            });
            timeout = timeout ? Math.max(config.timeout, timeout) : config.timeout;
            appendScripts([path], timeout);
            return;
        }
        
        // relay #run till after DOM is ready and interactive.
        if (!domLoaded && record.traits.domTool && !record.traits.domIgnore) {
			dispatcher.listen(Event.DOMREADY, function(e) {
                dispatcher.deafen(Event.DOMREADY, arguments.callee);
                run(path, args, descriptor);
			});
            return;
		}
        
        var instance = instantiate(record, args);
        
        if(instance && descriptor && descriptor.invoke) {
            var pair;
            while((pair = descriptor.invoke.shift())) {
                if(typeof instance[pair.method] === 'function') {
                    instance[pair.method].apply(instance, pair.args || []);
                }
            }
        }
        
        if(descriptor.run) {
            mikado.run(descriptor.run);
        }
        
    },
    
    /*---------------------------------------------------------------*
     *                       final mikado API                        *
     *---------------------------------------------------------------*/
    
    api = {
        /**Add a module schema to mikado registry, following 'record' settings are possible:
         * 
         * REQUIRED:
         * - path            Dot notated path to module file, relative to mikado root or repository config.
         * - build           Builder method, return result will become the module.
         * 
         * OPTIONAL:
         * - name            Name of module, will be parsed from path otherwise.
         * - include         Dot notated paths to other modules the current module requires.
         * - fetch           Dot notated paths to other modules the current module does NOT require,
         *                   fetch can be used to force paralel loading of modules used by include dependencies.
         * - allow           A list of dot notated paths of modules that are allowed to use current module.
         *                   If a module loads a disallowed submodule, that module will not be made available.
         * - traits          A hash of traits that will get passed to the eventObject in mikado events.
         *     - domTool     Set to true if module relies on DOM ready event to be USED.
         *     - domBuild    Set to true if module required DOM to be ready to BUILD.
         *     - domIgnore   Set to true if a module inherits domTool trait, this will force the module
         *                   to ignore domReady and simply run even if dom is not fully loaded.
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
        run: function() {
			var args = slice.call(arguments);
            if(typeof args[0] === 'string') {
                run(args.shift(), args);
            } else if(args.length === 1) {
                run(args[0].path, args[0].args, args[0], args[0].timeout);
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
			if(!(list instanceof Array)) {
                return this;
            }
			var i = list.length;
            while(i--) {
                if(pending[list[i]]) {
                    list.splice(i, 1);
                }
            }
            if (list.length) {
                appendScripts(list, timeout);
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
            dispatcher.listen(eventType, handler)
            return this;
        },
        
        /**Removes an event listener.
         * 
         * @param {String} eventType
         * @param {Function} handler
         * @return {Object} mikado
         */
        deafen: function(eventType, handler){
            dispatcher.deafen(eventType, handler)
            return this;
        },
        
        /**Returns the log items corresponding with the event types passed as arguments.
         * 
         * @param {String} type EventType, multiple possible.
         * @return {Array} list of requested log items, empty if none present.
         */
        getLog: function(type /*, multiple possible*/){
            var re = new RegExp("^(?:"+slice.call(arguments).join("|")+")$");
            var i = eventLog.length, log = [];
            while(i--){
                if(re.test(eventLog[i].type) || !type) {
                    log.unshift(eventLog[i]);
                }
            }
            return log;
        }
        
    };
        
   // unleash mikado
   GLOBAL.mikado =  api;

})();