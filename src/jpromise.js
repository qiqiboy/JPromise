/*
 * @author qiqiboy
 * @github https://github.com/qiqiboy/JPromise
 */
;
(function(ROOT, struct, undefined){
    "use strict";

    var Refer={
        resolved:'resolve',
        rejected:'reject',
        pending:'notify'
    },
    slice=[].slice,
    toString={}.toString;

    function _forEach(iterate){
        var i=0,len=this.length,item;
        for(;i<len;i++){
            item=this[i];
            if(typeof item!='undefined'){
                iterate(item,i,this);
            }
        }
    }

    function each(arr,iterate){
        return 'forEach' in arr ? arr.forEach(iterate) : _forEach.call(arr,iterate)
    }
    
    function bind(obj,fn){
        return function(){
            return fn.apply(obj,arguments);
        }
    }

    function isFn(fn){
        return typeof fn=='function';
    }

    function isPromiseLike(obj){
        return isFn(obj&&obj.then);
    }
    
    function isArray(arr){
        return toString.call(arr)=='[object Array]';
    }

    struct.prototype={
        constructor:struct,
        state:'pending',
        init:function(resolver){
            this.handles={};
            typeof resolver=='function' &&
                resolver(bind(this,this.resolve),bind(this,this.reject),bind(this,this.notify));
            return this;
        },
        on:function(ev,fn){
            if(!this.handles[ev]){
                this.handles[ev]=[];
            }
            isFn(fn) && this.handles[ev].push(fn);
            return this;
        },
        fire:function(ev){
            var args=this.args||[],
                queue=this.handles[ev]||[];
            if(ev=='notify'){
                each(queue,function(fn){
                    fn.apply(null,args);
                });
            }else{
                while(queue.length){
                    queue.shift().apply(null,args);
                }
            }
            return this;
        },
        then:function(){
            var next=new struct,
                fns=arguments;
            
            each("resolve reject notify".split(" "),bind(this,function(prop,i){
                this.on(prop,function(){
                    var args=slice.call(arguments),
                        v;

                    if(isFn(fns[i])){
                        try{
                            v=fns[i].apply(null,args);
                            prop=='notify' || (prop='resolve');
                        }catch(e){
                            v=e;
                            prop='reject';
                        }
                        args=[v];
                    }
                    
                    next[prop].apply(next,args);
                });
            }));

            switch(this.state){
                case 'resolved':
                case 'rejected':
                    this.fire(Refer[this.state]);
                    break;
            }

            return next;
        },
        chain:function(p){
            try{
                if(!(p instanceof struct)){
                    throw new TypeError(p+' is not an instance of Promise');
                }

                if(p==this){
                    throw new TypeError('TypeError');
                }

                return this.then(bind(p,p.resolve),bind(p,p.reject),bind(p,p.notify));
            }catch(e){
                return struct.reject(e);
            }
        },
        delay:function(ms){
            var self=this,
                p=new struct;
            this.always(function(){
                setTimeout(function(){
                    self.chain(p);
                },ms);
            });
            return p;
        },
        'catch':function(fn){
            return this.then(null,fn);
        },
        done:function(fn){
            return this.then(fn);
        },
        fail:function(fn){
            return this.then(null,fn);
        },
        always:function(fn){
            return this.then(fn,fn);
        },
        progress:function(fn){
            return this.then(null,null,fn);
        },
        deferred:function(){
            return this;
        },
        promise:function(){
            var self=this,
                p={};
            each("then catch progress".split(" "),function(prop){
                p[prop]=function(){
                    return self[prop].apply(self,arguments).promise();
                }
            });
            return p;
        }
    }

    each("defer promise".split(" "),function(prop){
        struct[prop]=function callee(resolver){
            if(this instanceof callee){
                throw new TypeError(prop+' is not a constructor');
            }
            return this(resolver)[prop]();
        }
    });

    each("resolved rejected pending".split(" "),function(state){
        var prop=Refer[state];

        struct[prop]=function(){
            var p=new this;
            p[prop].apply(p,arguments);
            return p;
        }

        struct.prototype[prop]=function(p){
            if(this.state=='pending'){
                if(isPromiseLike(p)){
                    this.chain.call(p,this);
                }else{
                    this.state=state;
                    this.args=slice.call(arguments);
                    this.fire(prop);
                }
            }
        }
    });

    struct.queue=function(){
        var queue=slice.call(arguments),
            chain=struct.resolve();

        return struct(function(resolve,reject,notify){
            each(queue,function(p){
                chain=chain.then(isFn(p)?p:function(){
                    if(isArray(p)){
                        p=struct.queue.apply(null,p).progress(notify);
                    }
                    return p;
                });
                !isArray(p) && chain.always(notify);
            });
            chain.then(resolve);
        });
    }
    struct.prototype.queue=function(){
        struct.queue.apply(null,arguments).chain(this);
        return this;
    }

    each("when all every any some race".split(" "),function(prop){
        var callee=struct[prop]=function(){
            var queue=slice.call(arguments),
                ret1=[],ret2=[],
                len=queue.length,
                pending=0;

            return struct(function(resolve, reject, notify){
                queue.length?each(queue,function(p,i){
                    var isArr=isArray(p),
                        done,fail;
                    if(isArr){
                        p=callee.apply(null,p).progress(notify);
                    }else{
                        p.always(notify);
                    }
                    p=struct.resolve(p);
                    switch(prop){
                        case 'any':
                            done=resolve;
                            fail=function(v){
                                ret2[i]=isArr?slice.call(arguments):v;
                                if(len==++pending){
                                    reject.apply(null,ret2);
                                }
                            }
                            break;
                        case 'some':
                            done=function(v){
                                ret1.push(isArr?slice.call(arguments):v);
                                if(len==++pending){
                                    resolve.apply(null,ret1);
                                }
                            }
                            fail=function(v){
                                ret2.push(isArr?slice.call(arguments):v);
                                if(len==++pending){
                                    ret1.length?resolve.apply(null,ret1):reject.apply(null,ret2);
                                }
                            }
                            break;
                        case 'race':
                            done=fail=resolve;
                            break;
                        default:
                            done=function(v){
                                ret1[i]=isArr?slice.call(arguments):v;
                                if(len==++pending){
                                    resolve.apply(null,ret1);
                                }
                            }
                            fail=reject;
                    }
                    p.then(done,fail);
                }):resolve();
            });
        }

        struct.prototype[prop]=function(){
            callee.apply(null,arguments).chain(this);
            return this;
        }
    });

    ROOT.JPromise=struct;
    
})(window, function(resolver){
    if(!(this instanceof arguments.callee)){
        return new arguments.callee(resolver);
    }
    this.init(resolver);
});
