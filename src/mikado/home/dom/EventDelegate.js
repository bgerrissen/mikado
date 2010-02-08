/**
 * @author Ben
 * 
 * work in progress
 * 
 */
mikado.module({

    path: "home.dom.EventDelegate",
    
    domTool: 1,
    
    include: [
		"home.dom.EventDispatcher",
        "home.dom.Selector",
        "home.lang.ObjectCache"
	],
    
    build: function(M) {
        
        var EventDispatcher = M.EventDispatcher;
        var DelegateCache = new M.ObjectCache();
        var match = M.Selector.match;
        
		
       function EventDelegate(element) {
           if(!this.hasOwnProperty || !(this instanceof eventListener)) {
               return new eventListener(type);
           }
           this._element = element || document;
       }
       
       EventDelegate.prototype = {
           
           listen: function(selector, eventType, handler, useCapture){
               return this;
           },
           
           deafen: function(selector, eventType, handler, useCapture){
               return this;
           },
           
           notify: function(selector, eventType){
               return this;
           },
           
           clear: function(selector, eventType){
               return this;
           },
           
           clearAll: function(selector){
               return this;
           }
       };
        
    }
    
});
