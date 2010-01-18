
mikado.module({

    path: "test:home.dom.EventDispatcher.CasePropagationWithoutCapture",
    
    include: ["home.dom.EventDispatcher"],
    
    domBuild: 1,
    
    build: function(lib) {
        
        var top,child,select,listenerOne = function() {
        }
        
        return {
        
            name: "Event propagation, ignoring capture phase",
            
            setUp: function() {
                top = top || document.getElementById("top");
                child = child || document.getElementById("child");
                select = select || document.getElementById("select");
                this.TOP = lib.EventDispatcher(top);
                this.CHILD = lib.EventDispatcher(child);
            },
            
            tearDown: function() {
                delete this.TOP;
                delete this.CHILD;
            },
            
            testNormalPropagation: function() {
                var eventType = "click";
                var self = this;
                
                var fn = function(e) {
                    self.assert.areEqual(e.target, child, "Target should be child (h2).");
                    self.assert.areEqual(eventType, e.type, "EventType should be 'click'.");
                    self.TOP.clearAllEventListeners();
                    self.resume();
                }
                
                this.TOP.addEventListener(eventType, fn, false);
                this.CHILD.dispatchEvent(eventType);
                
                this.wait();
            },
            
            // This test is cheating, need to test this manually to be sure!
            testFormElementPropagation: function() {
                var eventType = "change";
                var self = this;
                
                select.options[0].selected = true;
                
                var fn = function(e) {
                    self.assert.areEqual(e.target, select, "Target should be child (h2).");
                    self.assert.areEqual(eventType, e.type, "EventType should be 'change'.");
                    self.TOP.clearAllEventListeners();
                    self.resume();
                }
                
                this.TOP.addEventListener(eventType, fn, false);
                
                
                lib.EventDispatcher(select).dispatchEvent(eventType)
                
                
                this.wait();
            },
            
            testCustomEventPropagation: function() {
                var eventType = "WORLDGOBOOM";
                var self = this;
                
                var fn = function(e) {
                    self.assert.areEqual(e.target, child, "Target should be child (h2).");
                    self.assert.areEqual(eventType, e.type, "EventType should be 'click'.");
                    self.TOP.clearAllEventListeners();
                    self.resume();
                }
                
                this.TOP.addEventListener(eventType, fn, false);
                this.CHILD.dispatchEvent(eventType);
                
                this.wait();
            }
            
        };
        
        return CASE;
    }
    
});
