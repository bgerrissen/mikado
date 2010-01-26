/**
 * NOTE: CODE IS PURPOSLY BLOATED FOR CLARITY!
 * WORK IN PROGRESS!
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
    
    build: function() {
    
        /*-----------------------------------------------------------------*
         *                          CONSTANTS                              *
         *-----------------------------------------------------------------*/
        var WIN = window, CONTEXT = WIN.document, ROOT = CONTEXT.documentElement;
        
        var CAPTURING_PHASE = 1, AT_TARGET = 2, BUBBLING_PHASE = 3;
        
        var W3C_MODEL = !!(ROOT.addEventListener && ROOT.removeEventListener);
        var IE_MODEL = !!(ROOT.attachEvent && ROOT.detachEvent && !W3C_MODEL);
        var uid = 0;
        
        var USE_DOM2 = true;
        
        var undefined;
        /*-----------------------------------------------------------------*
         *                       UTILITY METHODS                           *
         *-----------------------------------------------------------------*/
        var getDocument = function(e) {
            return e.ownerDocument || e.document || e;
        }
        
        var getWindow;
        
        // bloated for clarity.
        if ('parentWindow' in top.document) {
            getWindow = function(context) {
                return context.parentWindow || window;
            }
        } else if ('defaultView' in top.document && top === top.document.defaultView) {
            getWindow = function(context) {
                return context.defaultView || window;
            }
        } else {
            getWindow = function(context) {
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
        
        /*-----------------------------------------------------------------*
         *                       EVENT REGISTRY                            *
         *-----------------------------------------------------------------*/
        /* A somewhat simpler event registry, based on Diego's more complex
         * registry. We're adding string ID's to elements and use those
         * to lookup event/listener combinations in the registry instead
         * of passing dom elements through functions.
         */
        var registry = {};
        var IDCache = {};
        
        /* Gets a cache tied to an element, if no cache, it creates one.
         * No more expando's on elements and still id's are seperated from registry.
         */
        var getIDC = function(element) {
            var type = element.nodeType, i, cache = IDCache[type];
            if (!cache) {
                cache = IDCache[type] = [];
            } else {
                i = cache.length;
                while (i--) {
                    if (element === cache[i].element) {
                        return (element = cache[i]);
                    }
                }
            }
            // no cache for element, so we create one.
            i = cache.push({
                element: element,
                id: ++uid
            });
            registry[uid] = {
                __listenerLength__: 0
            };
            return (element = cache[i - 1]);
        }
        
        var getID = function(element) {
            return getIDC(element).id;
        }
        
        /**Registers a specific event/listener combination.
         *
         * @param {DomElement} element
         * @param {String} type
         * @param {Function} listener
         * @param {Function} wrapped
         * @param {Boolean} capture
         * @return {void}
         */
        var register = function(id, type, listener, wrapped, capture) {
            if (!registry[id]) {
                registry[id] = {};
            }
            if (!registry[id][type]) {
                registry[id][type] = [];
            }
            registry[id][type].push({
                listener: listener,
                wrapped: wrapped,
                capture: capture
            });
            registry[id].__listenerLength__++;
        }
        
        /**Checks if current combination of parameters is already registered.
         *
         * @param {DomElement} element
         * @param {String} type
         * @param {Function} listener
         * @param {Function} wrapped
         * @param {Boolean} capture
         * @return {Boolean, Number} false or index
         */
        var isRegistered = function(id, type, listener, capture) {
            var cache = registry[id] ? registry[id][type] : null;
            if (cache) {
                var index = cache.length, c;
                while (index--) {
                    c = cache[index];
                    if (c.listener === listener && c.capture === capture) {
                        return index;
                    }
                }
            }
            return false;
        }
        
        /**Removes combination from registry. Only used by removeEvent.
         *
         * @param {String} type
         * @param {Number} index
         * @return void
         */
        var unregister = function(id, type, index) {
            if (registry[id] && registry[id][type]) {
                registry[id][type].splice(index, 1);
                registry[id].__listenerLength__--;
            }
        }
        
        var stopPropagation = function() {
            this.cancelBubble = true;
        }
        
        var preventDefault = function() {
            this.returnValue = false;
        }
        
        /*-----------------------------------------------------------------*
         *                     EVENT IMPLEMENTATION                        *
         *-----------------------------------------------------------------*/
        // reduced Diego's if/else expressions, results in more bytes for minute peformance.
        // easier for me to overview as well.
        if (W3C_MODEL && USE_DOM2) {
            // ----------------------------- W3C ---------------------------- //
            
            var createEvent = function(context, type) {
                var event, win = getWindow(context);
                if (/mouse|click/.test(type)) {
                    try {
                        event = context.createEvent('MouseEvents');
                        event.initMouseEvent(type, true, true, win, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                    } 
                    catch (e) {
                        event = context.createEvent('HTMLEvents');
                        event.initEvent(type, true, true);
                    }
                } else if (/key(down|press|out)/.test(type)) {
                    event = context.createEvent('KeyEvents');
                    event.initKeyEvent(type, true, true, win, false, false, false, false, 0, 0);
                } else {
                    event = context.createEvent('HTMLEvents');
                    event.initEvent(type, true, true);
                }
                return (context = win = event);
            }
            
            var addListener = function(element, id, type, listener, capture) {
                register(id || getID(element), type, listener, null, capture || false);
                element.addEventListener(type, listener, capture || false);
                element = null;
            }
            
            var removeListener = function(element, id, type, listener, capture) {
                id || (id = getID(element));
                var index = isRegistered(id, type, listener, capture || false);
                if (index !== false) {
                    element.removeEventListener(type, listener, capture || false);
                    unregister(id, type, index);
                }
                element = null;
            }
            
            var clearListeners = function(element, id, type) {
                id || (id = getID(element));
                var index, current;
                var cache = registry[id] ? registry[id][type] : null;
                if (cache) {
                    index = cache.length;
                    while (index--) {
                        current = cache[index];
                        element.removeEventListener(type, current.listener, current.capture);
                        unregister(id, type, index);
                    }
                }
                element = null;
            }
            
            var dispatch = function(element, type) {
                return (element = element.dispatchEvent(createEvent(getDocument(element), type)));
            }
            
        } else {
        
            // ----------------------------- legacy browsers ---------------------------- //
            var fixEvent = function(element, event, capture) {
                event || (event = getWindow(getDocument(element)).event);
                event.currentTarget = element;
                event.target = event.srcElement || element;
                event.preventDefault = preventDefault;
                event.stopPropagation = stopPropagation;
                event.eventPhase = capture ? CAPTURING_PHASE : BUBBLING_PHASE;
                event.relatedTarget = event[(event.target == event.fromElement ? 'to' : 'from') + 'Element'];
                event.timeStamp = +new Date();
                return (element = event);
            }
            
            var createEvent = function(element, type, capture) {
                var event = getDocument(element).createEventObject();
                event.type = type;
                event.target = element;
                event.eventPhase = 0;
                event.currentTarget = element;
                event.cancelBubble = !!capture;
                event.returnValue = undefined;
                return (element = fixEvent(element, event, capture));
            }
            
            var fixListener = function(element, id, type, listener, capture) {
                function wrapped(event) {
                    var element = arguments.callee.element;
                    listener.call(element, fixEvent(element, event, capture));
                }
                wrapped.element = element;
                register(id, type, listener, wrapped, capture);
                return (element = wrapped);
            }
            
            if (IE_MODEL && USE_DOM2) {
            
                // ----------------------------- IE ---------------------------- //
                
                var addListener = function(element, id, type, listener, capture) {
                    id || (id = getID(element));
                    element.attachEvent('on' + type, fixListener(element, id, type, listener, capture || false));
                    element = null;
                }
                
                var removeListener = function(element, id, type, listener, capture) {
                    id || (id = getID(element));
                    var index = isRegistered(id, type, listener, capture || false);
                    if (index !== false) {
                        listener = registry[id][type][index].wrapped;
                        element.detachEvent('on' + type, listener);
                        unregister(id, type, index);
                    }
                    element = null;
                }
                
                var clearListeners = function(element, id, type) {
                    id || (id = getID(element));
                    var index, current;
                    var cache = registry[id] ? registry[id][type] : null;
                    if (cache) {
                        index = cache.length;
                        while (index--) {
                            current = cache[index];
                            element.detachEvent('on' + type, current.wrapped, current.capture);
                            unregister(id, type, index);
                        }
                    }
                    element = null;
                }
                
                var dispatch = function(element, type, capture) {
                    return element.fireEvent('on' + type, createEvent(element, type, capture || false));
                }
                
            } else {
            
                // ----------------------------- DOM 0 ---------------------------- //
                
                var eventHandler = function(event) {
                    event = event || window.event;
                    var id = getID(this), type = event.type;
                    var cache = registry[id] ? registry[id][type] : null;
                    if (cache) {
                        event = fixEvent(this, event);
                        for (var index = 0, length = cache.length; index < length; index++) {
                            cache[index].wrapped.call(this, event);
                        }
                    }
                }
                
                var addListener = function(element, id, type, listener, capture) {
                    id || (id = getID(element));
                    fixListener(element, id, type, listener, capture);
                    if (element['on' + type] && element['on' + type] !== eventHandler) {
                        fixListener(element, id, type, element['on' + type], false);
                    }
                    element['on' + type] = eventHandler;
                }
                
                var removeListener = function(element, id, type, listener, capture) {
                    unregister(id || getID(element), type, listener, capture);
                }
                
                var clearListeners = function(element, id, type) {
                    id || (id = getID(element));
                    var index, current;
                    var cache = registry[id] ? registry[id][type] : null;
                    if (cache) {
                        index = cache.length;
                        while (index--) {
                            unregister(id, type, index);
                        }
                    }
                    element = null;
                }
                
                var dispatch = function(element, type, capture) {
                    element['on' + type](fixEvent(this, {
                        type: type
                    }, capture));
                }
            }
        }
        
        // same for all
        var clearAllListeners = function(element, id) {
            id || (id = getID(element));
            var cache = registry[id], type;
            if (cache) {
                for (type in cache) {
                    clearEventListeners(element, id, type);
                }
            }
            element = null;
        }
        
        /*-----------------------------------------------------------------*
         *                       EVENT SIMULATOR                           *
         *                                                                 *
         *          For broken and custom event dispatching.               *
         *-----------------------------------------------------------------*/
        var customEvent = function(element, type, capture) {
            return (element = {
                type: type,
                target: element,
                bubbles: true,
                cancelable: true,
                currentTarget: element,
                relatedTarget: null,
                timeStamp: +new Date(),
                preventDefault: preventDefault,
                stopPropagation: stopPropagation,
                eventPhase: capture ? CAPTURING_PHASE : BUBBLING_PHASE
            });
        }
        
        var manualDispatch = function(element, event, capturePhase) {
            var id = getID(element);
            var cache = registry[id] ? registry[id][event.type] : null;
            if (cache) {
                var index = 0, length = cache.length, current;
                for (index; index < length; index++) {
                    if (cache[index].capture === capturePhase) {
                        cache[index].listener.call(element, event);
                    }
                }
            }
            element = null;
        }
        
        // propate in a single function, minute performance gain.
        var propagate = function(event, self) {
        
            var ancestors = [], node = this.parentNode, index;
            
            if (self) {
                event.eventPhase = AT_TARGET;
                manualDispatch(this, event, true);
            }
            
            while (node.nodeType == 1) {
                ancestors.push(node);
                node = node.parentNode;
            }
            
            index = ancestors.length;
            event.eventPhase = CAPTURING_PHASE;
            
            while (index-- && !event.cancelBubble) {
                node = ancestors[index];
                event.currentTarget = node;
                manualDispatch(node, event, true);
            }
            
            index = 0;
            event.eventPhase = BUBBLING_PHASE;
            
            while ((node = ancestors.shift()) && !event.cancelBubble) {
                event.currentTarget = node;
                manualDispatch(node, event, false);
            }
            
            if (self) {
                event.eventPhase = AT_TARGET;
                manualDispatch(this, event, false);
            }
            
            node = null;
        }
        
        /*-----------------------------------------------------------------*
         *                         EVENT TESTER                            *
         *                                                                 *
         *    Feature test events live and store supported events!         *
         *-----------------------------------------------------------------*/
        /* works in:
         * - FireFox 3.5.7
         * - Safari 4.0.4
         * - Opera 9.62
         * - IE 8 , 7
         * Need more browser tests!
         *
         * Attaches listener to document
         * dispatches event on document.documentElement
         * Removes listener from document
         *
         * We need this to determine if we need to use the Event Simulator
         * for custom events. I prefer to use native support when possible.
         */
        var supportedEvents = {};
        var contextID = getID(CONTEXT);
        var eventSupported = function(type) {
            if (supportedEvents[type] !== undefined) {
                return supportedEvents[type];
            }
            var fn = function(e) {
                supportedEvents[type] = e.type === type;
            }
            try {
                addListener(CONTEXT, contextID, type, fn, false);
                dispatch(ROOT, type);
            } 
            catch (e) {
                supportedEvents[type] = false;
                removeListener(CONTEXT, contextID, type, fn, false);
            }
            return supportedEvents[type];
        }
        
        /*-----------------------------------------------------------------*
         *                 FINALIZE EVENT IMPLEMENTATION                   *
         *-----------------------------------------------------------------*/
        var addEventListener = addListener;
        var removeEventListener = removeListener;
        
        var dispatchEvent = function(element, type) {
            if (eventSupported(type)) {
                dispatch(element, type);
            } else {
                propagate.call(element, customEvent(element, type), true);
            }
            element = null;
        }
        
        var clearEventListeners = clearListeners;
        var clearAllEventListeners = clearAllListeners;
        
        // ----------------------------- fix form element propagation ---------------------------- //
        /* FF, Opera and Safari actually do propagate (FF requires a blur or enter event for change event to fire, but it works)
         - change
         So doing this for IE only, need to research more.
         
         I suspect IE form elements are activeX abominations (which would explain a LOT).
         Ergo, they do not inherit from the document.documentElement, but have
         their own definitions.
         
         Just fixing onchange event for IE form elements for now.
         */
        if (IE_MODEL && USE_DOM2) {
        
            var activeElement;
            var pushPropagate = function(e) {
                if (activeElement) {
                    propagate.call(activeElement, customEvent(activeElement, 'change', true), false);
                    activeElement.detachEvent('onchange', pushPropagate);
                    activeElement = null;
                }
            }
            
            CONTEXT.attachEvent("onbeforeactivate", function(e) {
                e || (e = WIN.event);
                activeElement = e.target || e.srcElement;
                var tag = activeElement.tagName;
                if (/^(?:select|input|textarea)/i.test(tag)) {
                    activeElement.attachEvent('onchange', pushPropagate);
                }
            });
            
        }
        
        // ----------------------------- The Class ---------------------------- //
        var EventDispatcher = function(element) {
        
            if (!(this instanceof EventDispatcher)) {
                return (element = new EventDispatcher(element));
            }
            
            this._element = element;
            this._eventRegistryID = getID(element);
            
            element = null;
        }
        
        EventDispatcher.prototype = {
            addEventListener: function(type, listener, capture) {
                addEventListener(this._element, this._eventRegistryID, type, listener, capture);
                return this;
            },
            removeEventListener: function(type, listener, capture) {
                removeEventListener(this._element, this._eventRegistryID, type, listener, capture);
                return this;
            },
            dispatchEvent: function(event) {
                return dispatchEvent(this._element, event);
            },
            clearEventListeners: function(event) {
                clearEventListeners(this._element, this._eventRegistryID, event);
                return this;
            },
            clearAllEventListeners: function() {
                clearAllEventListeners(this._element, this._eventRegistryID);
                return this;
            },
            listeners: function() {
                var id = this._eventRegistryID || getID(this._element);
                return registry[id].__listenerLength__;
            }
        }
        
        EventDispatcher.eventSupported = eventSupported;
        
        // TODO:
        // enforce useCapture for IE. slower performance!
        // EventDispatcher.enableIECapture = useCaptureSupport;
        
        return EventDispatcher;
    }
});
