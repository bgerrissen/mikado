
mikado.module({

    path: "test:home.dom.EventDispatcher.CaseEventDispatching",
    
    include: ["home.dom.EventDispatcher"],
    
    domBuild: 1,
    
    build: function(lib) {
    
        var top, listenerOne = function() {
        }
        
        return {
        
            name: "Event dispatching utility",
            
            setUp: function() {
                top = top || document.getElementById("top");
                this.ED = lib.EventDispatcher(top);
            },
            
            tearDown: function() {
                delete this.ED;
            },
            
            testDispatchEvent: function() {
                var eventType = "click";
                var self = this;
                
                var fn = function(e) {
                    self.assert.areEqual(eventType, e.type, "Should be 'click'.");
                    self.ED.clearAllEventListeners();
                    self.resume();
                }
                
                this.ED.addEventListener(eventType, fn, true);
                this.ED.dispatchEvent(eventType);
                
                this.wait();
            },
            
            testDispatchCustomEvent: function() {
                var eventType = "helloWorld!";
                var self = this;
                
                var fn = function(e) {
                    self.assert.areEqual(eventType, e.type, "Should be 'helloWorld!'.");
                    self.ED.clearAllEventListeners();
                    self.resume();
                }
                
                this.ED.addEventListener(eventType, fn, true);
                this.assert.areEqual(1, this.ED.listeners(), "There should be 1 listener present!");
                this.ED.dispatchEvent(eventType);
                
                this.wait();
            }
            
        };
        
        return CASE;
    }
    
});
