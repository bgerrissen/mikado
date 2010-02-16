/**
 * @author Ben Gerrissen http://www.netben.nl/ bgerrissen@gmail.com
 * @license MIT
 */
mikado.module({
    
    path: "home.lang.ObjectCache",
    
    build: function() {
        
        function ObjectCache() {
            if(!this.hasOwnProperty || !(this instanceof ObjectCache)) {
                return new Class();
            }
            this._storage = {};
            this._lastCache = null;
        }
        
        ObjectCache.prototype = {
            
            _typeOf: function(object){
                return object.nodeName ? object.nodeName : Object.prototype.toString.call(object);
            },
            
            get: function(object, key){
                var cache = this._lastCache;
                if(cache && cache.owner === object) {
                    return key ? cache.data[key] : cache.data;
                }
                var type = this._typeOf(object),
                    storage = this._storage[type] || (this._storage[type] = []),
                    i = storage.length
                    cache = null;
                while(i--) {
                    if(storage[i].owner === object) {
                        cache = storage[i];
                        break;
                    }
                }
                if (!cache) {
                    cache = {
                        owner: object,
                        data: {}
                    };
                    storage.push(cache);
                }
                this._lastCache = cache;
                return key ? cache.data[key] : cache.data;
            },
            put: function(object, key, value){
                this.get(object)[key] = value;
                return this;
            },
            remove: function(object, key){
                delete this.get(object)[key];
            },
            destroy: function(object){
                var type = this._typeOf(object),
                    storage = this._storage[type];
                if(!storage) {
                    return this;
                }
                var i = storage.length;
                while(i--) {
                    if(storage[i].owner === object) {
                        storage.splice(i, 1);
                        break;
                    }
                }
                return this;
            },
            destroyAll: function(){
                this._storage = {};
            }
        };
        
        return ObjectCache;
        
    }
    
});
