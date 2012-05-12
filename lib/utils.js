var Utils={};
Utils.dump = function(arr,level) {
	var dumped_text = "";
	if(!level) level = 0;
	
	//The padding given at the beginning of the line.
	var level_padding = "";
	for(var j=0;j<level+1;j++) level_padding += "    ";
	
	if(typeof(arr) == 'object') { //Array/Hashes/Objects 
		for(var item in arr) {
			var value = arr[item];
			
			if(typeof(value) == 'object') { //If it is an array,
				dumped_text += level_padding + "'" + item + "' ...\n";
				dumped_text += dump(value,level+1);
			} else {
				dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
			}
		}
	} else { //Stings/Chars/Numbers etc.
		dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
	}
	return dumped_text;
}

Utils.debug=function(params,alive) {
	console.log(params);
	if(!alive) process.exit(0);
}

Utils.rand_str = function() {
    return Math.random().toString(36).substr(2);
};

Utils.token = function() {
    return Utils.rand_str() + Utils.rand_str();
};

/* source: http://www.thomasfrank.se/downloadableJS/jsonStringify.js */
Utils.JSONstring={
	compactOutput:false, 		
	includeProtos:false, 	
	includeFunctions: false,
	detectCirculars:true,
	restoreCirculars:true,
	make:function(arg,restore) {
		this.restore=restore;
		this.mem=[];this.pathMem=[];
		return this.toJsonStringArray(arg).join('');
	},
	toObject:function(x){
		if(!this.cleaner){
			try{this.cleaner=new RegExp('^("(\\\\.|[^"\\\\\\n\\r])*?"|[,:{}\\[\\]0-9.\\-+Eaeflnr-u \\n\\r\\t])+?$')}
			catch(a){this.cleaner=/^(true|false|null|\[.*\]|\{.*\}|".*"|\d+|\d+\.\d+)$/}
		};
		if(!this.cleaner.test(x)){return {}};
		eval("this.myObj="+x);
		if(!this.restoreCirculars || !alert){return this.myObj};
		if(this.includeFunctions){
			var x=this.myObj;
			for(var i in x){if(typeof x[i]=="string" && !x[i].indexOf("JSONincludedFunc:")){
				x[i]=x[i].substring(17);
				eval("x[i]="+x[i])
			}}
		};
		this.restoreCode=[];
		this.make(this.myObj,true);
		var r=this.restoreCode.join(";")+";";
		eval('r=r.replace(/\\W([0-9]{1,})(\\W)/g,"[$1]$2").replace(/\\.\\;/g,";")');
		eval(r);
		return this.myObj
	},
	toJsonStringArray:function(arg, out) {
		if(!out){this.path=[]};
		out = out || [];
		var u; // undefined
		switch (typeof arg) {
		case 'object':
			this.lastObj=arg;
			if(this.detectCirculars){
				var m=this.mem; var n=this.pathMem;
				for(var i=0;i<m.length;i++){
					if(arg===m[i]){
						out.push('"JSONcircRef:'+n[i]+'"');return out
					}
				};
				m.push(arg); n.push(this.path.join("."));
			};
			if (arg) {
				if (arg.constructor == Array) {
					out.push('[');
					for (var i = 0; i < arg.length; ++i) {
						this.path.push(i);
						if (i > 0)
							out.push(',\n');
						this.toJsonStringArray(arg[i], out);
						this.path.pop();
					}
					out.push(']');
					return out;
				} else if (typeof arg.toString != 'undefined') {
					out.push('{');
					var first = true;
					for (var i in arg) {
						try {
							if(!this.includeProtos && arg[i]===arg.constructor.prototype[i]){continue};
							this.path.push(i);
							var curr = out.length; 
							if (!first)
								out.push(this.compactOutput?',':',\n');
							this.toJsonStringArray(i, out);
							out.push(':');                    
							this.toJsonStringArray(arg[i], out);
							if (out[out.length - 1] == u)
								out.splice(curr, out.length - curr);
							else
								first = false;
							this.path.pop();
						} catch(e) {
							
						}
					}
					out.push('}');
					return out;
				}
				return out;
			}
			out.push('null');
			return out;
		case 'unknown':
		case 'undefined':
		case 'function':
			if(!this.includeFunctions){out.push(u);return out};
			arg="JSONincludedFunc:"+arg;
			out.push('"');
			var a=['\\','\\\\','\n','\\n','\r','\\r','"','\\"'];arg+=""; 
			for(var i=0;i<8;i+=2){arg=arg.split(a[i]).join(a[i+1])};
			out.push(arg);
			out.push('"');
			return out;
		case 'string':
			if(this.restore && arg.indexOf("JSONcircRef:")==0){
				this.restoreCode.push('this.myObj.'+this.path.join(".")+"="+arg.split("JSONcircRef:").join("this.myObj."));
			};
			out.push('"');
			var a=['\n','\\n','\r','\\r','"','\\"'];
			arg+=""; for(var i=0;i<6;i+=2){arg=arg.split(a[i]).join(a[i+1])};
			out.push(arg);
			out.push('"');
			return out;
		default:
			out.push(String(arg));
			return out;
		}
	}
};

global.Utils=Utils;