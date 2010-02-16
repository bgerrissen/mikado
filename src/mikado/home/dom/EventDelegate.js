/**
 * @author Ben Gerrissen http://www.netben.nl/ bgerrissen@gmail.com
 * @license MIT
 */
mikado.module({

    path: "home.dom.EventDelegate",
    
    traits: {
        domTool: true
    },
    
    include: ["home.dom.EventDispatcher", "home.dom.Selector", "home.lang.ObjectCache"],
    
    build: function(M) {
    
        var EventDispatcher = M.EventDispatcher;
        var DelegateCache = new M.ObjectCache();
        var match = M.Selector.match;
        
        var getCache = function(object, eventType, useCapture, selector) {
            // cache[eventType][useCapture][selector] = [];
            var cache = DelegateCache.get(object);
            cache = cache[eventType] || (cache[eventType] = {});
            cache = cache[useCapture] || (cache[useCapture] = {});
            cache = cache[selector] || (cache[selector] = []);
            return cache;
        }
        
        var invoker = function(e) {
            var cache = DelegateCache.get(e.currentTarget),
                phase = e.eventPhase < 3 ? 'true' : 'false',
                i, list;
            if(cache[e.type] && cache[e.type][phase]) {
                cache = cache[e.type][phase];
            }
            for (var selector in cache) {
                if (match(e.target, selector)) {
                    list = cache[selector];
                    i = list.length;
                    while(i--) {
                        list[i].call(e.target, e);
                    }
                }
            }
        }
        
        function EventDelegate(element) {
            if (!this.hasOwnProperty || !(this instanceof EventDelegate)) {
                return new EventDelegate(element);
            }
            this._element = element || document;
        }
        
        // static methods
        EventDelegate.listen = function(element, selector, eventType, handler, useCapture) {
            return new EventDelegate(element).listen(selector, eventType, handler, useCapture);
        }
        
        EventDelegate.deafen = function(element, selector, eventType, handler, useCapture) {
            return new EventDelegate(element).deafen(selector, eventType, handler, useCapture);
        }
        
        EventDelegate.notify = EventDispatcher.notify;
        
        EventDelegate.clear = function(element, selector, eventType) {
            return new EventDelegate(element).clear(selector, eventType);
        }
        
        EventDelegate.clearAll = function(element) {
            new EventDelegate(element).destroy();
        }
        
        EventDelegate.prototype = {
        
            listen: function(selector, eventType, handler, useCapture) {
                getCache(this._element, eventType, !!useCapture, selector).unshift(handler);
                new EventDispatcher(this._element).deafen(eventType, invoker, useCapture).listen(eventType, invoker, useCapture);
                return this;
            },
            
            deafen: function(selector, eventType, handler, useCapture) {
                var cache = getCache(this._element, eventType, !!useCapture, selector);
                var i = cache.length
                while (i--) {
                    if (cache[i] === handler) {
                        cache.splice(i, 1);
                    }
                }
                return this;
            },
            
            notify: EventDispatcher.prototype.notify,
            
            clear: function(selector, eventType) {
                if (eventType) {
                    getCache(this._element, eventType, true, selector).length = 0;
                    getCache(this._element, eventType, false, selector).length = 0;
                } else if (selector) {
                    var cache = DelegateCache.get(this._element)
                    for(var key in cache){
                        if(cache[key]['true'] && cache[key]['true']['selector']) {
                            cache[key]['true']['selector'] = []
                        }
                        if(cache[key]['false'] && cache[key]['false']['selector']) {
                            cache[key]['false']['selector'] = []
                        }
                    }
                }
                return this;
            },
            
            clearAll: function(selector) {
                DelegateCache.destroy(this._element);
                return this;
            }
        };
        
        return EventDelegate;
        
    }
    
});
