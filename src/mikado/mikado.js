


(function(global){
    
    var slice = Array.prototype.slice
    
    , timeout = 1500
    
    , doc = global.document
    
    , registry = {}
    
    , pending = {}
    
    , scripts = {}
    
    , killers = {}
	
	, aliases = {}
    
    , repositories = {}
    
    , forced = {}
    
    , root = '/'
        
    , anchor = (function(){
        var list = doc.getElementsByTagName('script')
        , node
        , i = list.length
        , re = /\/mikado[^\/\\]*\.js.?$/i;
        while((node = list[--i])){
            if(re.test(node.src)){
                root = node.src.replace(re, '');
                return node;
            }
        }
    })()
    
    , script = doc ? doc.createElement('script') : null
    
    , events = {
        'loading' : []
        , 'loaded' : []
        , 'complete' : []
        , 'run' : []
        , 'ran' : []
        , 'error' : []
    }
    
    , augment = function(receiver, provider){
        if (provider) {
            for (var key in provider) {
                provider.hasOwnProperty(key) && (receiver[key] = provider[key]);
            }
        }
        return receiver;
    }
    
    , empty = function(){}
    
    , clone = '__proto__' in {} ? function(obj, properties){
        return properties ? augment({__proto__:obj}, properties) : {__proto__:obj};
    } : function(obj, properties){
        empty.prototype = obj;
        obj = new empty;
        return properties ? augment(obj, properties) : obj;
    }
    
    , Event = function(type, data){
        this.type = type;
        this.timestamp = +new Date();
        augment(this, data);
    }
    
    , listen = function(type, listener, scope){
        events[type] && events[type].push({
            listener: listener,
            scope: scope
        });
    }
    
    , deafen = function(type, listener, scope){
        var list = events[type], i;
        if (list && (i = list.length)) {
            while (i--) {
                list[i] === listener && list.splice(i, 1);
            }
        }
    }
    
    , announce = function(type, data){
        var list = events[type]
        , i = 0
        , item;
        if (list && list.length) {
            data = new Event(type, data);
            while ((item = list[i++])) {
                item.scope ? item.listener.call(item.scope, data) : item.listener(data);
            }
        }
    }

    , getURI = function(path){
        var bits = path.split('-');
        if(bits.length > 2){
            announce('error', {
                path: path,
                message: "Malformed path, only 1 instance of ´-´ is allowed to signify version.",
                resolution: "failed silently"
            });
        }
        bits[0] = bits[0].replace(/\./g, '/');
        var url = bits.join('-');
        for(var key in repositories) {
            if(RegExp("^"+key).test(path)) {
                return repositories[key] + url + ".js";
            }
        }    
        return root + "/" + url + ".js";
    }
    
    , getName = function(path){
        return path.replace(/-.*$/,'').split('.').pop();
    }
    
    /**@id load
     * 
     * @param {Object} record
     * @return {Boolean}
     */
    , load = function(record){
        
        if(!record.fetch || !record.fetch.length){
            return false;
        }
        
        var list = record.fetch
        , i = list.length
        , fragment = doc.createDocumentFragment()
        , path;
        
        while(i--) {
            path = list[i].path || list[i];
            
            if(registry[path]){
                list.splice(i, 1);
                continue;
            }
            
            if (!pending[path]) {
                (scripts[path] = script.cloneNode(true)).src = getURI(path);
                fragment.appendChild(scripts[path]);
                
                pending[path] = [record];
                
                announce('loading', {
                    path: path,
                    timeout: record.timeout
                });
                
            } else {
                
                pending[path].push(record);
                
            }
        }
        
        list.length && anchor.parentNode.insertBefore(fragment, anchor);
        
        return !!list.length;
        
    }
    
    /**@id single
     * 
     * @param {Object} path
     * @param {Object} timeout
     */
    , single = function(path, tout){
        if(pending[path]) return;
        tout = tout ? tout < timeout && (tout = timeout) : timeout;
        pending[path] = [];
        (scripts[path] = script.cloneNode(true)).src = getURI(path);
        anchor.parentNode.insertBefore(scripts[path], anchor);
        announce('loading', {
            path: path,
            timeout: tout
        });
    }
    
    /**@id process
     * 
     * @param {Object} record
     */
    , process = function(record){
        record.name = getName(record.path);
        record.traits || (record.traits = {});
        record.traits.path = record.path;
        record.traits.name = record.name;
        record.library = {};
        record.timeout && record.timeout < timeout || (record.timeout = timeout);
        
        record.eventData = augment({
            module: null
        }, record.traits);
        
        allowed(record);
        required(record);
        
        announce('loaded', record.eventData);
        
        !load(record) && store(record);
    }
    
    , allowed = function(record){
        if(!record.allow) {
            return;
        }
        record.allow = [].concat(record.allow);
        var list = record.allow
        , path;
        record.allow = {};
        while((path = list.pop())) {
            record.allow[path] = true;
        }
    }
    
    , required = function(record){
        if(!record.fetch && !record.include) {
            return;
        }
        record.fetch = record.fetch ? [].concat(record.fetch) : [];
        record.include = record.include ? [].concat(record.include) : [];
        
        record.fetch.length && enforce(record.fetch);
        record.include.length && enforce(record.include);

        record.fetch = record.fetch.concat(record.include);
    }
    
    , enforce = function(list){
        var i = list.length
        , name
        , path;
        while(i--){
            if(list[i].path && 'when' in list[i] && !list[i].when) {
                list.splice(i, 1);
                continue;
            }
            path = list[i].path || list[i];
            name = getName(path);
			console.log(forced)
			console.log(name)
            if(name && forced[name]) {
				console.log('FORCING NAME')
                (list[i].path && (list[i].path = forced[name])) || (list[i] = forced[name]);
            }
        }
    }
    
    , libraries = function(target){
        if(!target.include){
            return;
        }
        var list = target.include
        , i = list.length
        , lib = target.library
        , item, name, path, record;
        
        while((item = list[--i])){
            path = item.path || item;
            record = registry[path];
            name = item.alias || item.as || record.name;
            
            if (record.allow && !record.allow[target.path]) {
                lib[name] = 'Access denied!';
                announce('error', {
                    path: target.path,
                    message: "Disallowed access to '"+path+"'",
                    resolution: "failed silently"
                });
                continue;
            }
            
            record.module && (lib[name] = record.module);
            
        }
    }
    
    , store = function(record){
        libraries(record);
        record.eventData.module = record.module = record.build.call(record.traits, record.library);
        delete record.build;
        registry[record.path] = record;
        announce('complete', record.eventData);
        return 1;
    }
    
    , instantiate = function(record, descriptor){
        var module = record.module
        , init = descriptor.init
        , instance;
        if (typeof module == "function") {
            announce('run', record.traits);
            instance = clone(module.prototype);
            module.apply(instance, descriptor.args);
            announce('ran', record.traits);
        } else if (init && record.module[init]) {
            instance = record.module;
            instance[init].apply(instance, descriptor.args);
        } else {
            announce('error', {
                path: record.path,
                message: "Nothing is run at '"+record.path+"'",
                resolution: "failed silently"
            });
        }
        return instance;
    }
    
    , run = function(descriptor){
		
		if(/^@([^@]*)/g.test(descriptor.path)) {
			descriptor.path = descriptor.path.replace(/^@[^@]*/g,aliases[RegExp.$1]);
		}
        
        if(/#/.test(descriptor.path)){
            var b = descriptor.path.split('#');
            descriptor.path = b[0];
            descriptor.init = b[1];
        }
        
        var record = registry[descriptor.path]
        , instance
        , pair;
        
        if(!record){
            var listener = function(e){
                if(e.path === descriptor.path){
                    deafen('complete', listener);
                    run(descriptor);
                }
            }
            listen('complete', listener);
            single(descriptor.path, descriptor.timeout);
            return false;
        }
        
       instance = instantiate(record, descriptor);
        
        if(instance && descriptor && descriptor.invoke) {
            while((pair = descriptor.invoke.shift())) {
                typeof instance[pair.method] === 'function' && instance[pair.method].apply(instance, pair.args || []);
            }
        }
        
        if(descriptor && descriptor.run) {
            mikado.run(descriptor.run);
        }
    }
    
    , kill = function(path, message, stack){
        message = message ? message : "Timed out at "+killers[path].timeout+"ms ";
        (stack = stack || []).push(path);
        announce('error', {
            path: path,
            message: message + stack.join(' -> '),
            resolution: "failed silently"
        });
        var list = pending[path], 
            i = list.length;
        while(i--) {
            kill(list[i].path, message, stack);
            delete list[i];
        }
        delete pending[path];
    }
    
    
    
    listen('loading', function(e){
        if(!timeout) {
            return false;
        }
        
        killers[e.path] = {
            timeout: e.timeout,
            timeoutID: setTimeout(function(){
                kill(e.path);
            }, e.timeout)
        };
        
        listen('loaded', function(e){
            if (killers[e.path]) {
                clearInterval(killers[e.path].timeoutID);
                delete killers[e.path];
            }
        });
        
        return true;
    });
    
    
    
    listen('complete', function(e){
        var list = pending[e.path]
        if(!list || !list.length) {
            return;
        }
        var i = list.length
        , j
        , record, path;
        while((record = list[--i])) {
            j = record.fetch.length;
            while(j && j--) {
                path = record.fetch[j].path || record.fetch[j];
                if (path === e.path) {
                    record.fetch.splice(j, 1);
                    !record.fetch.length && store(record);
                    list.splice(i, 1);
                }
            }
        }
    });
    
    // cleanup
    listen('complete', function(e){
        if(scripts[e.path]) {
            scripts[e.path].parentNode.removeChild(scripts[e.path]);
            delete scripts[e.path];
        }
        delete registry[e.path].eventData;
        delete registry[e.path].timeout;
        delete registry[e.path].include;
        delete registry[e.path].fetch;
        delete pending[e.path];
    });
    
    global.mikado = {
        
        module: function(record){
            process(record);
        }
        
        , run: function(p /* arguments */){
            var args = slice.call(arguments);
            typeof p === 'string' ? run({
                path: p,
                args: args.shift() && args
            }) : run(p);
            return this;
        }
        
        , listen: function(type, listener, scope){
            listen(type, listener, scope);
            return this;
        }
        
        , deafen: function(type, listener, scope){
            deafen(type, listener, scope);
            return this;
        }
        
        , available: function(path){
            return !!registry[path];
        }
        
        , pending: function(path){
            return !!pending[path];
        }
        
        , repo : function(path, uri) {
			if(typeof path === 'string'){
				repositories[path] = uri
			} else {
				for(var key in path){
					path.hasOwnProperty(key) && (repositories[key] = path[key]);
				}
			}
            return this;
        }
		
		, alias : function(alias, path){
			if(typeof alias === 'string'){
				!aliases[alias] && (aliases[alias] = path);
			} else {
				for(var key in alias){
                    alias.hasOwnProperty(key) && !aliases[key] && (aliases[key] = alias[key]);
                }
			}
			return this;
		}
		
		, force : function(name, path){
			if(typeof name === 'string'){
				forced[name] = path;
			} else {
				for(var n in name) {
					name.hasOwnProperty(n) && (forced[n] = name[n]);
				}
			}
			return this;
		}
		
		, timeout : function(t){
			if(t && t >= 1500) timeout = t;
			return timeout;
		}
		
		, list : function(){
			var list = [];
			for(var path in registry) {
				registry.hasOwnProperty(path) && list.push(key);
			}
			return list;
		}
        
    };
    
})(this);