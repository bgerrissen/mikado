
mikado.module({

    path: "test:home.dom.EventDispatcher.CaseBasicUtility",
    
    include: ["home.dom.EventDispatcher"],
    
    domBuild: 1,
    
    build: function(lib) {
        
        var top, listenerOne = function() {
        }
        
        return {
        
            name: "Basic EventDispatcher utility",
            
            setUp: function() {
                top = top || document.getElementById("top");
                this.ED = lib.EventDispatcher(top);
            },
            
            tearDown: function() {
                delete this.ED;
            },
            
            testAddEventListener: function() {
                this.ED.addEventListener("click", listenerOne, true);
                this.assert.areEqual(1, this.ED.listeners(), "There should be 1 listener present!");
            },
            
            testRemoveEventListener: function() {
                this.ED.removeEventListener("click", listenerOne, true);
                this.assert.areEqual(0, this.ED.listeners(), "There should be NO listeners present!");
            },
            
            testClearEventListeners: function() {
                this.ED.addEventListener("click", listenerOne, true);
                this.ED.addEventListener("click", listenerOne, true);
                this.ED.addEventListener("click", listenerOne, true);
                this.ED.addEventListener("mouseover", listenerOne, true);
                
                this.assert.areEqual(4, this.ED.listeners(), "There should be 4 listeners present!");
                
                this.ED.clearEventListeners("click");
                
                this.assert.areEqual(1, this.ED.listeners(), "There should be 1 listener present!");
                
                this.ED.clearEventListeners("mouseover");
                
                this.assert.areEqual(0, this.ED.listeners(), "There should be NO listeners present!");
            },
            
            testClearAllEventListeners: function() {
                this.ED.addEventListener("click", listenerOne, true);
                this.ED.addEventListener("click", listenerOne, true);
                this.ED.addEventListener("click", listenerOne, true);
                this.ED.addEventListener("mouseover", listenerOne, true);
                
                this.assert.areEqual(4, this.ED.listeners(), "There should be 4 listeners present!");
                
                this.ED.clearAllEventListeners();
                
                this.assert.areEqual(0, this.ED.listeners(), "There should be NO listeners present!");
            }
            
        };
        
        return CASE;
        
    }
    
});
