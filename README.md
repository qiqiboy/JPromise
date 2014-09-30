JPromise
========

## 使用方法
基本用法同Promise规范。
额外新增了progress方法，使用方法参考下例。

```javascript

//常规调用 new JPromise(resolver);
new JPromise(function(resolve,reject,notify){
	var t=setInterval(function(){
		notify('progress');
	},100);
	setTimeout(function(){
		//取消通知，否则会引发错误。
		//因为一旦resolve后状态不允许更改，所以无法继续通知！
		clearInterval(t);
		//完成该任务
		resolve('done!');
	},2000);
}).then(function(v){
	console.log(v); // done!
},function(v){
	console.log(v);//无输出
},function(v){
	console.log(v);//间隔100ms输出 progress
});

/* 上面调用还可以改写如下 */
var p=new JPromise,
	t;
t=setInterval(function(){
	p.notify('progress');
},100);
setTimeout(function(){
	//取消通知，否则会引发错误。
	//因为一旦resolve后状态不允许更改，所以无法继续通知！
	clearInterval(t);
	//完成该任务
	p.resolve('done!');
},2000);
p.progress(function(v){
	console.log(v);//间隔100ms输出 progress
}).done(function(v){
	console.log(v); // done!
});


//延迟调用链
var resolveDefer=function(t){
	return JPromise(function(resolve,reject,notify){
		setTimeout(function(){resolve(t);},t);
	});
},rejectDefer=function(t){
	return JPromise(function(resolve,reject,notify){
		setTimeout(function(){reject(t);},t);
	});
}
console.log('start');
JPromise.resolve(1000).then(function(t){
	return resolveDefer(t); //延迟1s
}).then(function(t){
	console.log(t+'ms后输出');
	return t+1000;
}).then(function(t){
	return resolveDefer(t); //延迟2s
}).then(function(t){
	console.log(t+'ms后输出');
	return rejectDefer(t+1000) //延迟3s，并返回失败
}).then(function(){
	console.log('成功')
},function(t){
	console.log(t+'ms后失败')
}).then(function(t){
	return resolveDefer(2000); //延迟2s
}).then(function(){
	console.log('调用完毕');
});

//获取受限promise，即只有 .then .catch .progress 方法，不允许外部更改promise状态
var p=new Promise;
p.promise(); //= new Promise(resolver).promise(); 等同于 Promise.promise(resolver);

//其它方法说明
JPromise.all(); //同Promise规范
JPromise.any(); //同Promise规范

````
