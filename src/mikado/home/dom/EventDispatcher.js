/**
 * @author Ben Gerrissen http://www.netben.nl/ bgerrissen@gmail.com
 * @license MIT
 *
 * Adapted version of Diego Perini's work.
 *
 * License ORIGINAL version:
 *  http://javascript.nwbox.com/NWEvents/MIT-LICENSE
 * Download ORIGINAL version:
 *  http://javascript.nwbox.com/NWEvents/nwevents.js
 *
 */
mikado.module({

    path: "home.dom.EventDispatcher",
    
    include: [
        "home.lang.ObjectCache"
    ],
    
    build: function(M) {
    
        /*-----------------------------------------------------------------*
         *                          CONSTANTS                              *
         *-----------------------------------------------------------------*/
        var WIN = window, CONTEXT = WIN.document, ROOT = CONTEXT.documentElement;
        
        var CAPTURING_PHASE = 1, AT_TARGET = 2, BUBBLING_PHASE = 3;
        var PHASE = {
            'true': CAPTURING_PHASE,
            'false': BUBBLING_PHASE
        };
        var W3C_MODEL = !!(ROOT.addEventListener && ROOT.removeEventListener);
        var IE_MODEL = !!(ROOT.attachEvent && ROOT.detachEvent && !W3C_MODEL);
        var USE_DOM2 = true;
        
        /*-----------------------------------------------------------------*
         *                          EVENTCACHE                             *
         *-----------------------------------------------------------------*/
        var EventCache = new M.ObjectCache();
        
        // override methods for convenience.
        EventCache._get = EventCache.get;
        EventCache.get = function(object, key){
            var cache = this._get(object);
            return cache[key] || (cache[key] = []);
        }
        
        EventCache.put = function(object, key, value){
            this.get(object, key).push(value);
        }
        
        EventCache.remove = function(object, key, value){
            var cache = this.get(object, key),
                i = value ? cache.length : (cache.length = 0);
            while(i--) {
                if(cache[i] === value) {
                    cache.splice(i, 1);
                }
            }
        }
        
        /*-----------------------------------------------------------------*
         *                       UTILITY METHODS                           *
         *-----------------------------------------------------------------*/
        var getDocument = function(e) {
            return e.ownerDocument || e.document || e;
        }
        
        // bloated for clarity.
        if ('parentWindow' in top.document) {
            var getWindow = function(context) {
                return context.parentWindow || window;
            }
        } else if ('defaultView' in top.document && top === top.document.defaultView) {
            var getWindow = function(context) {
                return context.defaultView || window;
            }
        } else {
            // breaks clean code idiom, can be cleaner?
            var getWindow = function(context) {
                // fix for older Safari 2.0.x returning
                // [object AbstractView] instead of [window]
                if (window.frames.length === 0 && top.document === context) {
                    return top;
                } else {
                    for (var i in top.frames) {
                        if (top.frames[i].document === context) {
                            return top.frames[i];
                        }
                    }
                }
                return top;
            }
        }
        
        var arrayContains = function(array, object) {
            var i = array.length;
            while (i--) {
                if (object === array[i]) {
                    return true;
                }
            }
            return false;
        }
        
        // examine DRY idiom possibilities.
        // make this MORE READABLE!
        // IE and W3C can be implemented in one if with exception of createEvent.
        if (W3C_MODEL && USE_DOM2) {
            var createEvent = function(element, type) {
                var event, doc = getDocument(element), win = getWindow(doc);
                if (/mouse|click/.test(type)) {
                    try {
                        event = doc.createEvent('MouseEvents');
                        event.initMouseEvent(type, true, true, win, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                    } 
                    catch (e) {
                        event = doc.createEvent('HTMLEvents');
                        event.initEvent(type, true, true);
                    }
                } else if (/key(down|press|out)/.test(type)) {
                    event = doc.createEvent('KeyEvents');
                    event.initKeyEvent(type, true, true, win, false, false, false, false, 0, 0);
                } else {
                    event = doc.createEvent('HTMLEvents');
                    event.initEvent(type, true, true);
                }
                return (element = doc = win = event);
            }
            var addListener = function(element, eventType, listener) {
                element.addEventListener(eventType, listener, true);
            }
            var removeListener = function(element, eventType, listener) {
                element.removeEventListener(eventType, listener, true);
            }
            var dispatch = function(element, eventType) {
                var event = createEvent(getDocument(element), eventType);
                element.dispatchEvent(event);
            }
        } else if (IE_MODEL && USE_DOM2) {
            var createEvent = function(element, type) {
                var event = getDocument(element).createEventObject();
                return (element = event);
            }
            var addListener = function(element, eventType, listener) {
                element.attachEvent('on' + eventType, listener);
            }
            var removeListener = function(element, eventType, listener) {
                element.detachEvent('on' + eventType, listener);
            }
            var dispatch = function(element, eventType) {
                var event = createEvent(element, eventType);
                event.target = element;
                element.fireEvent('on' + eventType, event);
            }
        } else {
            // DOM0
            var addListener = function(element, eventType, listener) {
                var current = element['on' + eventType];
                if (current && current !== interceptor) {
                    EventCache.add(this, eventType + 3, current);
                }
                element['on' + eventType] = interceptor;
            }
            var removeListener = function(element, eventType, listener) {
                // not used.
            }
            var dispatch = function(element, eventType) {
                if (typeof element['on' + eventType] == 'function') {
                    element['on' + type](new Event(eventType, this));
                }
            }
        }
        
        /*-----------------------------------------------------------------*
         *                         EVENT OBJECT                            *
         *-----------------------------------------------------------------*/
        var Event = function(e, element, type) {
            this.domEvent = e || (e = {});
            if (e) {
                e.simulated = true;
            }
            this.eventPhase = 1;
            this.type = e.type || type;
            this.target = e.target || (e.target = e.srcElement) || element;
            this.timeStamp = +new Date();
            this.relatedTarget = e[(e.target == e.fromElement ? 'to' : 'from') + 'Element'];
            this.keyCode = e.keyCode || e.which || 0;
            this.altKey = e.altKey || e.altLeft || false;
            this.ctrlKey = e.ctrlKey || e.ctrlLeft || false;
            this.shiftKey = e.shiftKey || e.shiftLeft || false;
            this.pageX = e.pageX || e.clientX || 0;
            this.pageY = e.pageY || e.clientY || 0;
            if (Event.dataTransport) {
                this.data = Event.dataTransport;
                Event.dataTransport = null;
            }
        }
        
        Event.prototype = {
            preventDefault: function() {
                this.returnValue = false;
                this.domEvent.returnValue = false;
                if (this.domEvent.preventDefault) {
                    this.domEvent.preventDefault();
                }
            },
            stopPropagation: function() {
                this.cancelBubble = true;
                this.domEvent.cancelBubble = true;
                if (this.domEvent.stopPropagation) {
                    this.domEvent.stopPropagation();
                }
            },
            stop: function() {
                this.preventDefault();
                this.stopPropagation();
            }
        };
        
        Event.supported = {};
        Event.isSupported = function(type) {
            var undefined;
            if (Event.supported[type] !== undefined) {
                return Event.supported[type];
            }
            var fn = function(e) {
                Event.supported[type] = ((e || WIN.event).type === type);
            }
            try {
                addListener(CONTEXT, type, fn);
                dispatch(CONTEXT, type, fn);
            } 
            catch (e) {
                Event.supported[type] = false;
                removeListener(CONTEXT, type, fn);
            }
            return Event.supported[type];
        }
        
        /*-----------------------------------------------------------------*
         *                          SIMULATOR                              *
         *-----------------------------------------------------------------*/
        EventSimulator = {
            invoke: function(object, e, phase) {
                var list = EventCache.get(object, e.type + phase);
                if (!list) {
                    return;
                }
                e.currentTarget = object;
                if (object === e.target) {
                    e.eventPhase = AT_TARGET;
                }
                var i = list.length, result, tmp;
                while (i--) {
                    result = list[i].call(object, e) === false ? false : result;
                }
                return result;
            },
            // clean code idiom says to break this up into more methods.
            // JS engines however dictates a reduction of method calls.
            propagate: function(e) {
                var chain = [];
                var i = e.target.parentNode || e.target.parentObject;
                var result;
                
                while (i) {
                    if (arrayContains(chain, i)) {
                        // prevent circular propagation with JS objects.
                        break;
                    }
                    chain.push(i);
                    i = i.parentNode || i.parentObject;
                }
                
                i = chain.length;
                
                e.eventPhase = CAPTURING_PHASE;
                
                while (i-- && !e.cancelBubble) {
                    result = EventSimulator.invoke(chain[i], e, CAPTURING_PHASE);
                }
                
                if (!e.cancelBubble) {
                    result = EventSimulator.invoke(e.target, e, CAPTURING_PHASE) === false ? false : result;
                }
                
                if (!e.cancelBubble) {
                    result = EventSimulator.invoke(e.target, e, BUBBLING_PHASE) === false ? false : result;
                }
                
                e.eventPhase = BUBBLING_PHASE;
                
                while ((i = chain.shift()) && !e.cancelBubble) {
                    result = EventSimulator.invoke(i, e, BUBBLING_PHASE) === false ? false : result;
                }
                
                if (result === false) {
                    e.preventDefault();
                }
                
                return result;
            }
        };
        
        var interceptor = function(e) {
            e = e || WIN.event;
            if (!e.simulated) {
                e = new Event(e, this);
                return EventSimulator.propagate(e);
            }
        }
        
        /*-----------------------------------------------------------------*
         *                      PROPAGATION FIXES                          *
         *-----------------------------------------------------------------*/
        if (IE_MODEL) {
            addListener(CONTEXT, "beforeactivate", function(e) {
                e || (e = WIN.event);
                e.target = e.target || e.srcElement;
                var tag = e.target.tagName;
                if (/^(?:select|input|textarea)/i.test(tag)) {
                    removeListener(e.target, "change", interceptor);
                    addListener(e.target, "change", interceptor);
                }
            });
        }
        
        /*-----------------------------------------------------------------*
         *                        IMPLEMENTATION                           *
         *-----------------------------------------------------------------*/
        function EventDispatcher(element) {
            if (!this.hasOwnProperty || !(this instanceof EventDispatcher)) {
                return (element = new EventDispatcher(element));
            }
            this._element = element;
        }
        
        // static methods
        EventDispatcher.listen = function(element, type, listener, capture) {
            return new EventDispatcher(element).listen(type, listener, capture);
        }
        
        EventDispatcher.deafen = function(element, type, listener, capture) {
            return new EventDispatcher(element).deafen(type, listener, capture);
        }
        
        EventDispatcher.notify = function(element, type, data) {
            return new EventDispatcher(element).notify(type, data);
        }
        
        EventDispatcher.clear = function(element, type) {
            return new EventDispatcher(element).clear(element, type);
        }
        
        EventDispatcher.clearAll = function(element) {
            return new EventDispatcher(element).clearAll();
        }
        
        // Expose as underscored static properties
        EventDispatcher._Event = Event;
        EventDispatcher._EventCache = EventCache;
        
        // instance methods.
        EventDispatcher.prototype = {

            listen: function(type, listener, capture) {
                Event.isSupported(type);
                var key = type + PHASE[capture || false];
                EventCache.put(this._element, key, listener);
                if (listener !== interceptor && this._element.nodeType) {
                    removeListener(this._element, type, interceptor);
                    addListener(this._element, type, interceptor);
                }
                return this;
            },

            deafen: function(type, listener, capture) {
                EventCache.remove(this._element, type + PHASE[capture || false], listener);
                return this;
            },

            clear: function(type) {
                EventCache.remove(this._element, type + PHASE[true]);
                EventCache.remove(this._element, type + PHASE[false]);
                return this;
            },

            clearAll: function() {
                EventCache.destroy(this._element);
                return this;
            },

            notify: function(type, data) {
                Event.dataTransport = data;
                if (Event.isSupported(type) && this._element.nodeType) {
                    dispatch(this._element, type);
                } else {
                    EventSimulator.propagate(new Event(null, this._element, type));
                }
                return this;
            }
        };
        
        return EventDispatcher;
        
    }
});
