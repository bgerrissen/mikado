/**
 * @author Ben
 */
mikado.module({

    path: "test:home.dom.EventDispatcher.Suite",
    
    fetch: [
        "home.dom.EventDispatcher"
    ],
    
    include: [
        "test:home.dom.EventDispatcher.CaseBasicUtility",
        "test:home.dom.EventDispatcher.CaseEventDispatching",
        "test:home.dom.EventDispatcher.CasePropagationWithoutCapture"
    ],
    
    domBuild: 1,
    
    build: function(TestCases) {
        
        YUI().use("test", "console", function(Y) {
            
            var r = new Y.Console({
                verbose: true,
                newestOnTop: false
            });
            
            r.render('#testLogger');
            
            var Suite = new Y.Test.Suite("Event Suite");
            
            for (var key in TestCases) {
                TestCases[key].assert = Y.Assert;
                Suite.add(new Y.Test.Case(TestCases[key]));
            }
            
            
            Y.Test.Runner.add(Suite);
            Y.Test.Runner.run();
            
        });
        
    }
    
});
