(function() {
  'use strict';

  var globals = typeof global === 'undefined' ? self : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = {}.hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    var val = aliases[name];
    return (val && name !== val) ? expandAlias(val) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (bundle && typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = typeof window === 'undefined' ? this : window;
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};

require.register("curvature/base/Bag.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Bag = void 0;
var _Bindable = require("./Bindable");
var _Mixin = require("./Mixin");
var _EventTargetMixin = require("../mixin/EventTargetMixin");
var toId = int => Number(int);
var fromId = id => parseInt(id);
var Mapped = Symbol('Mapped');
var Has = Symbol('Has');
var Add = Symbol('Add');
var Remove = Symbol('Remove');
var Delete = Symbol('Delete');
class Bag extends _Mixin.Mixin.with(_EventTargetMixin.EventTargetMixin) {
  constructor(changeCallback = undefined) {
    super();
    this.changeCallback = changeCallback;
    this.content = new Map();
    this.current = 0;
    this.length = 0;
    this.list = _Bindable.Bindable.makeBindable([]);
    this.meta = Symbol('meta');
    this.type = undefined;
  }
  has(item) {
    if (this[Mapped]) {
      return this[Mapped].has(item);
    }
    return this[Has](item);
  }
  [Has](item) {
    return this.content.has(item);
  }
  add(item) {
    if (this[Mapped]) {
      return this[Mapped].add(item);
    }
    return this[Add](item);
  }
  [Add](item) {
    if (item === undefined || !(item instanceof Object)) {
      throw new Error('Only objects may be added to Bags.');
    }
    if (this.type && !(item instanceof this.type)) {
      console.error(this.type, item);
      throw new Error(`Only objects of type ${this.type} may be added to this Bag.`);
    }
    item = _Bindable.Bindable.make(item);
    if (this.content.has(item)) {
      return;
    }
    var adding = new CustomEvent('adding', {
      detail: {
        item
      }
    });
    if (!this.dispatchEvent(adding)) {
      return;
    }
    var id = toId(this.current++);
    this.content.set(item, id);
    this.list[id] = item;
    if (this.changeCallback) {
      this.changeCallback(item, this.meta, Bag.ITEM_ADDED, id);
    }
    var add = new CustomEvent('added', {
      detail: {
        item,
        id
      }
    });
    this.dispatchEvent(add);
    this.length = this.size;
    return id;
  }
  remove(item) {
    if (this[Mapped]) {
      return this[Mapped].remove(item);
    }
    return this[Remove](item);
  }
  [Remove](item) {
    if (item === undefined || !(item instanceof Object)) {
      throw new Error('Only objects may be removed from Bags.');
    }
    if (this.type && !(item instanceof this.type)) {
      console.error(this.type, item);
      throw new Error(`Only objects of type ${this.type} may be removed from this Bag.`);
    }
    item = _Bindable.Bindable.make(item);
    if (!this.content.has(item)) {
      if (this.changeCallback) {
        this.changeCallback(item, this.meta, 0, undefined);
      }
      return false;
    }
    var removing = new CustomEvent('removing', {
      detail: {
        item
      }
    });
    if (!this.dispatchEvent(removing)) {
      return;
    }
    var id = this.content.get(item);
    delete this.list[id];
    this.content.delete(item);
    if (this.changeCallback) {
      this.changeCallback(item, this.meta, Bag.ITEM_REMOVED, id);
    }
    var remove = new CustomEvent('removed', {
      detail: {
        item,
        id
      }
    });
    this.dispatchEvent(remove);
    this.length = this.size;
    return item;
  }
  delete(item) {
    if (this[Mapped]) {
      return this[Mapped].delete(item);
    }
    this[Delete](item);
  }
  [Delete](item) {
    this.remove(item);
  }
  map(mapper = x => x, filter = x => x) {
    var mappedItems = new WeakMap();
    var mappedBag = new Bag();
    mappedBag[Mapped] = this;
    this.addEventListener('added', event => {
      var item = event.detail.item;
      if (!filter(item)) {
        return;
      }
      if (mappedItems.has(item)) {
        return;
      }
      var mapped = mapper(item);
      mappedItems.set(item, mapped);
      mappedBag[Add](mapped);
    });
    this.addEventListener('removed', event => {
      var item = event.detail.item;
      if (!mappedItems.has(item)) {
        return;
      }
      var mapped = mappedItems.get(item);
      mappedItems.delete(item);
      mappedBag[Remove](mapped);
    });
    return mappedBag;
  }
  get size() {
    return this.content.size;
  }
  items() {
    return Array.from(this.content.entries()).map(entry => entry[0]);
  }
}
exports.Bag = Bag;
Object.defineProperty(Bag, 'ITEM_ADDED', {
  configurable: false,
  enumerable: false,
  writable: true,
  value: 1
});
Object.defineProperty(Bag, 'ITEM_REMOVED', {
  configurable: false,
  enumerable: false,
  writable: true,
  value: -1
});
  })();
});

require.register("curvature/base/Bindable.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Bindable = void 0;
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Ref = Symbol('ref');
var Original = Symbol('original');
var Deck = Symbol('deck');
var Binding = Symbol('binding');
var SubBinding = Symbol('subBinding');
var BindingAll = Symbol('bindingAll');
var IsBindable = Symbol('isBindable');
var Wrapping = Symbol('wrapping');
var Names = Symbol('Names');
var Executing = Symbol('executing');
var Stack = Symbol('stack');
var ObjSymbol = Symbol('object');
var Wrapped = Symbol('wrapped');
var Unwrapped = Symbol('unwrapped');
var GetProto = Symbol('getProto');
var OnGet = Symbol('onGet');
var OnAllGet = Symbol('onAllGet');
var BindChain = Symbol('bindChain');
var Descriptors = Symbol('Descriptors');
var Before = Symbol('Before');
var After = Symbol('After');
var NoGetters = Symbol('NoGetters');
var Prevent = Symbol('Prevent');
var TypedArray = Object.getPrototypeOf(Int8Array);
var SetIterator = Set.prototype[Symbol.iterator];
var MapIterator = Map.prototype[Symbol.iterator];
var win = typeof globalThis === 'object' ? globalThis : typeof window === 'object' ? window : typeof self === 'object' ? self : void 0;
var isExcluded = object => typeof win.Map === 'function' && object instanceof win.Map || typeof win.Set === 'function' && object instanceof win.Set || typeof win.Node === 'function' && object instanceof win.Node || typeof win.WeakMap === 'function' && object instanceof win.WeakMap || typeof win.Location === 'function' && object instanceof win.Location || typeof win.Storage === 'function' && object instanceof win.Storage || typeof win.WeakSet === 'function' && object instanceof win.WeakSet || typeof win.ArrayBuffer === 'function' && object instanceof win.ArrayBuffer || typeof win.Promise === 'function' && object instanceof win.Promise || typeof win.File === 'function' && object instanceof win.File || typeof win.Event === 'function' && object instanceof win.Event || typeof win.CustomEvent === 'function' && object instanceof win.CustomEvent || typeof win.Gamepad === 'function' && object instanceof win.Gamepad || typeof win.ResizeObserver === 'function' && object instanceof win.ResizeObserver || typeof win.MutationObserver === 'function' && object instanceof win.MutationObserver || typeof win.PerformanceObserver === 'function' && object instanceof win.PerformanceObserver || typeof win.IntersectionObserver === 'function' && object instanceof win.IntersectionObserver || typeof win.IDBCursor === 'function' && object instanceof win.IDBCursor || typeof win.IDBCursorWithValue === 'function' && object instanceof win.IDBCursorWithValue || typeof win.IDBDatabase === 'function' && object instanceof win.IDBDatabase || typeof win.IDBFactory === 'function' && object instanceof win.IDBFactory || typeof win.IDBIndex === 'function' && object instanceof win.IDBIndex || typeof win.IDBKeyRange === 'function' && object instanceof win.IDBKeyRange || typeof win.IDBObjectStore === 'function' && object instanceof win.IDBObjectStore || typeof win.IDBOpenDBRequest === 'function' && object instanceof win.IDBOpenDBRequest || typeof win.IDBRequest === 'function' && object instanceof win.IDBRequest || typeof win.IDBTransaction === 'function' && object instanceof win.IDBTransaction || typeof win.IDBVersionChangeEvent === 'function' && object instanceof win.IDBVersionChangeEvent || typeof win.FileSystemFileHandle === 'function' && object instanceof win.FileSystemFileHandle || typeof win.RTCPeerConnection === 'function' && object instanceof win.RTCPeerConnection || typeof win.ServiceWorkerRegistration === 'function' && object instanceof win.ServiceWorkerRegistration || typeof win.WebGLTexture === 'function' && object instanceof win.WebGLTexture;
class Bindable {
  static isBindable(object) {
    if (!object || !object[IsBindable] || !object[Prevent]) {
      return false;
    }
    return object[IsBindable] === Bindable;
  }
  static onDeck(object, key) {
    return object[Deck].get(key) || false;
  }
  static ref(object) {
    return object[Ref] || object || false;
  }
  static makeBindable(object) {
    return this.make(object);
  }
  static shuck(original, seen) {
    seen = seen || new Map();
    var clone = Object.create({});
    if (original instanceof TypedArray || original instanceof ArrayBuffer) {
      var _clone = original.slice(0);
      seen.set(original, _clone);
      return _clone;
    }
    var properties = Object.keys(original);
    for (var i in properties) {
      var ii = properties[i];
      if (ii.substring(0, 3) === '___') {
        continue;
      }
      var alreadyCloned = seen.get(original[ii]);
      if (alreadyCloned) {
        clone[ii] = alreadyCloned;
        continue;
      }
      if (original[ii] === original) {
        seen.set(original[ii], clone);
        clone[ii] = clone;
        continue;
      }
      if (original[ii] && typeof original[ii] === 'object') {
        var originalProp = original[ii];
        if (Bindable.isBindable(original[ii])) {
          originalProp = original[ii][Original];
        }
        clone[ii] = this.shuck(originalProp, seen);
      } else {
        clone[ii] = original[ii];
      }
      seen.set(original[ii], clone[ii]);
    }
    if (Bindable.isBindable(original)) {
      delete clone.bindTo;
      delete clone.isBound;
    }
    return clone;
  }
  static make(object) {
    if (object[Prevent]) {
      return object;
    }
    if (!object || !['function', 'object'].includes(typeof object)) {
      return object;
    }
    if (Ref in object) {
      return object[Ref];
    }
    if (object[IsBindable]) {
      return object;
    }
    if (Object.isSealed(object) || Object.isFrozen(object) || !Object.isExtensible(object) || isExcluded(object)) {
      return object;
    }
    Object.defineProperty(object, IsBindable, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Bindable
    });
    Object.defineProperty(object, Ref, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: false
    });
    Object.defineProperty(object, Original, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: object
    });
    Object.defineProperty(object, Deck, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: new Map()
    });
    Object.defineProperty(object, Binding, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Object.create(null)
    });
    Object.defineProperty(object, SubBinding, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: new Map()
    });
    Object.defineProperty(object, BindingAll, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: new Set()
    });
    Object.defineProperty(object, Executing, {
      enumerable: false,
      writable: true
    });
    Object.defineProperty(object, Wrapping, {
      enumerable: false,
      writable: true
    });
    Object.defineProperty(object, Stack, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: []
    });
    Object.defineProperty(object, Before, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: new Set()
    });
    Object.defineProperty(object, After, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: new Set()
    });
    Object.defineProperty(object, Wrapped, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Object.preventExtensions(new Map())
    });
    Object.defineProperty(object, Unwrapped, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Object.preventExtensions(new Map())
    });
    Object.defineProperty(object, Descriptors, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Object.preventExtensions(new Map())
    });
    var bindTo = (property, callback = null, options = {}) => {
      var bindToAll = false;
      if (Array.isArray(property)) {
        var debinders = property.map(p => bindTo(p, callback, options));
        return () => debinders.forEach(d => d());
      }
      if (property instanceof Function) {
        options = callback || {};
        callback = property;
        bindToAll = true;
      }
      if (options.delay >= 0) {
        callback = this.wrapDelayCallback(callback, options.delay);
      }
      if (options.throttle >= 0) {
        callback = this.wrapThrottleCallback(callback, options.throttle);
      }
      if (options.wait >= 0) {
        callback = this.wrapWaitCallback(callback, options.wait);
      }
      if (options.frame) {
        callback = this.wrapFrameCallback(callback, options.frame);
      }
      if (options.idle) {
        callback = this.wrapIdleCallback(callback);
      }
      if (bindToAll) {
        object[BindingAll].add(callback);
        if (!('now' in options) || options.now) {
          for (var i in object) {
            callback(object[i], i, object, false);
          }
        }
        return () => {
          object[BindingAll].delete(callback);
        };
      }
      if (!object[Binding][property]) {
        object[Binding][property] = new Set();
      }

      // let bindIndex = object[Binding][property].length;

      if (options.children) {
        var original = callback;
        callback = (...args) => {
          var v = args[0];
          var subDebind = object[SubBinding].get(original);
          if (subDebind) {
            object[SubBinding].delete(original);
            subDebind();
          }
          if (typeof v !== 'object') {
            original(...args);
            return;
          }
          var vv = Bindable.make(v);
          if (Bindable.isBindable(vv)) {
            object[SubBinding].set(original, vv.bindTo((...subArgs) => original(...args, ...subArgs), Object.assign({}, options, {
              children: false
            })));
          }
          original(...args);
        };
      }
      object[Binding][property].add(callback);
      if (!('now' in options) || options.now) {
        callback(object[property], property, object, false);
      }
      var debinder = () => {
        var subDebind = object[SubBinding].get(callback);
        if (subDebind) {
          object[SubBinding].delete(callback);
          subDebind();
        }
        if (!object[Binding][property]) {
          return;
        }
        if (!object[Binding][property].has(callback)) {
          return;
        }
        object[Binding][property].delete(callback);
      };
      if (options.removeWith && options.removeWith instanceof View) {
        options.removeWith.onRemove(() => debinder);
      }
      return debinder;
    };
    Object.defineProperty(object, 'bindTo', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: bindTo
    });
    var ___before = callback => {
      object[Before].add(callback);
      return () => object[Before].delete(callback);
    };
    var ___after = callback => {
      object[After].add(callback);
      return () => object[After].delete(callback);
    };
    Object.defineProperty(object, BindChain, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: (path, callback) => {
        var parts = path.split('.');
        var node = parts.shift();
        var subParts = parts.slice(0);
        var debind = [];
        debind.push(object.bindTo(node, (v, k, t, d) => {
          var rest = subParts.join('.');
          if (subParts.length === 0) {
            callback(v, k, t, d);
            return;
          }
          if (v === undefined) {
            v = t[k] = this.make({});
          }
          debind = debind.concat(v[BindChain](rest, callback));
        }));
        return () => debind.forEach(x => x());
      }
    });
    Object.defineProperty(object, '___before', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: ___before
    });
    Object.defineProperty(object, '___after', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: ___after
    });
    var isBound = () => {
      if (object[BindingAll].size) {
        return true;
      }
      for (var callbacks of Object.values(object[Binding])) {
        if (callbacks.size) {
          return true;
        }
        // for(let callback of callbacks)
        // {
        // 	if(callback)
        // 	{
        // 		return true;
        // 	}
        // }
      }
      return false;
    };
    Object.defineProperty(object, 'isBound', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: isBound
    });
    for (var i in object) {
      // const descriptors = Object.getOwnPropertyDescriptors(object);

      if (!object[i] || typeof object[i] !== 'object') {
        continue;
      }
      if (object[i][Ref] || object[i] instanceof Promise) {
        continue;
      }
      if (!Object.isExtensible(object[i]) || Object.isSealed(object[i])) {
        continue;
      }
      if (!isExcluded(object[i])) {
        object[i] = Bindable.make(object[i]);
      }
    }
    var descriptors = object[Descriptors];
    var wrapped = object[Wrapped];
    var stack = object[Stack];
    var set = (target, key, value) => {
      if (value && typeof value === 'object') {
        value = Bindable.make(value);
        if (target[key] === value) {
          return true;
        }
      }
      if (wrapped.has(key)) {
        wrapped.delete(key);
      }
      var onDeck = object[Deck];
      var isOnDeck = onDeck.has(key);
      var valOnDeck = isOnDeck && onDeck.get(key);

      // if(onDeck[key] !== undefined && onDeck[key] === value)
      if (isOnDeck && valOnDeck === value) {
        return true;
      }
      if (key.slice && key.slice(-3) === '___') {
        return true;
      }
      if (target[key] === value || typeof value === 'number' && isNaN(valOnDeck) && isNaN(value)) {
        return true;
      }
      onDeck.set(key, value);
      for (var callback of object[BindingAll]) {
        callback(value, key, target, false);
      }
      if (key in object[Binding]) {
        for (var _callback of object[Binding][key]) {
          _callback(value, key, target, false, target[key]);
        }
      }
      onDeck.delete(key);
      var excluded = win.File && target instanceof win.File && key == 'lastModifiedDate';
      if (!excluded) {
        Reflect.set(target, key, value);
      }
      if (Array.isArray(target) && object[Binding]['length']) {
        for (var _i in object[Binding]['length']) {
          var _callback2 = object[Binding]['length'][_i];
          _callback2(target.length, 'length', target, false, target.length);
        }
      }
      return true;
    };
    var deleteProperty = (target, key) => {
      var onDeck = object[Deck];
      var isOnDeck = onDeck.has(key);
      if (isOnDeck) {
        return true;
      }
      if (!(key in target)) {
        return true;
      }
      if (descriptors.has(key)) {
        var descriptor = descriptors.get(key);
        if (descriptor && !descriptor.configurable) {
          return false;
        }
        descriptors.delete(key);
      }
      onDeck.set(key, null);
      if (wrapped.has(key)) {
        wrapped.delete(key);
      }
      for (var callback of object[BindingAll]) {
        callback(undefined, key, target, true, target[key]);
      }
      if (key in object[Binding]) {
        for (var binding of object[Binding][key]) {
          binding(undefined, key, target, true, target[key]);
        }
      }
      Reflect.deleteProperty(target, key);
      onDeck.delete(key);
      return true;
    };
    var construct = (target, args) => {
      var key = 'constructor';
      for (var callback of target[Before]) {
        callback(target, key, object[Stack], undefined, args);
      }
      var instance = Bindable.make(new target[Original](...args));
      for (var _callback3 of target[After]) {
        _callback3(target, key, object[Stack], instance, args);
      }
      return instance;
    };
    var get = (target, key) => {
      if (wrapped.has(key)) {
        return wrapped.get(key);
      }
      if (key === Ref || key === Original || key === 'apply' || key === 'isBound' || key === 'bindTo' || key === '__proto__' || key === 'constructor') {
        return object[key];
      }
      var descriptor;
      if (descriptors.has(key)) {
        descriptor = descriptors.get(key);
      } else {
        descriptor = Object.getOwnPropertyDescriptor(object, key);
        descriptors.set(key, descriptor);
      }
      if (descriptor && !descriptor.configurable && !descriptor.writable) {
        return object[key];
      }
      if (OnAllGet in object) {
        return object[OnAllGet](key);
      }
      if (OnGet in object && !(key in object)) {
        return object[OnGet](key);
      }
      if (descriptor && !descriptor.configurable && !descriptor.writable) {
        wrapped.set(key, object[key]);
        return object[key];
      }
      if (typeof object[key] === 'function') {
        if (Names in object[key]) {
          return object[key];
        }
        object[Unwrapped].set(key, object[key]);
        var prototype = Object.getPrototypeOf(object);
        var isMethod = prototype[key] === object[key];
        var objRef =
        // (typeof Promise === 'function'                    && object instanceof Promise)
        // || (typeof Storage === 'function'                 && object instanceof Storage)
        // || (typeof Map === 'function'                     && object instanceof Map)
        // || (typeof Set === 'function'                     && object instanceof Set)
        // || (typeof WeakMap === 'function'                 && object instanceof WeakMap)
        // || (typeof WeakSet === 'function'                 && object instanceof WeakSet)
        // || (typeof ArrayBuffer === 'function'             && object instanceof ArrayBuffer)
        // || (typeof ResizeObserver === 'function'          && object instanceof ResizeObserver)
        // || (typeof MutationObserver === 'function'        && object instanceof MutationObserver)
        // || (typeof PerformanceObserver === 'function'     && object instanceof PerformanceObserver)
        // || (typeof IntersectionObserver === 'function'    && object instanceof IntersectionObserver)
        isExcluded(object) || typeof object[Symbol.iterator] === 'function' && key === 'next' || typeof TypedArray === 'function' && object instanceof TypedArray || typeof EventTarget === 'function' && object instanceof EventTarget || typeof Date === 'function' && object instanceof Date || typeof MapIterator === 'function' && object.prototype === MapIterator || typeof SetIterator === 'function' && object.prototype === SetIterator ? object : object[Ref];
        var wrappedMethod = function (...providedArgs) {
          object[Executing] = key;
          stack.unshift(key);
          for (var beforeCallback of object[Before]) {
            beforeCallback(object, key, stack, object, providedArgs);
          }
          var ret;
          if (new.target) {
            ret = new (object[Unwrapped].get(key))(...providedArgs);
          } else {
            var func = object[Unwrapped].get(key);
            if (isMethod) {
              ret = func.apply(objRef || object, providedArgs);
            } else {
              ret = func(...providedArgs);
            }
          }
          for (var afterCallback of object[After]) {
            afterCallback(object, key, stack, object, providedArgs);
          }
          object[Executing] = null;
          stack.shift();
          return ret;
        };
        wrappedMethod[OnAllGet] = _key => object[key][_key];
        var result = Bindable.make(wrappedMethod);
        wrapped.set(key, result);
        return result;
      }
      return object[key];
    };
    var getPrototypeOf = target => {
      if (GetProto in object) {
        return object[GetProto];
      }
      return Reflect.getPrototypeOf(target);
    };
    var handlerDef = Object.create(null);
    handlerDef.set = set;
    handlerDef.construct = construct;
    handlerDef.deleteProperty = deleteProperty;
    if (!object[NoGetters]) {
      handlerDef.getPrototypeOf = getPrototypeOf;
      handlerDef.get = get;
    }
    Object.defineProperty(object, Ref, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: new Proxy(object, handlerDef)
    });
    return object[Ref];
  }
  static clearBindings(object) {
    var maps = func => (...os) => os.map(func);
    var clearObj = o => Object.keys(o).map(k => delete o[k]);
    var clearObjs = maps(clearObj);
    object[BindingAll].clear();
    clearObjs(object[Wrapped], object[Binding], object[After], object[Before]);
  }
  static resolve(object, path, owner = false) {
    var node;
    var pathParts = path.split('.');
    var top = pathParts[0];
    while (pathParts.length) {
      if (owner && pathParts.length === 1) {
        var obj = this.make(object);
        return [obj, pathParts.shift(), top];
      }
      node = pathParts.shift();
      if (!(node in object) || !object[node] || !(typeof object[node] === 'object')) {
        object[node] = Object.create(null);
      }
      object = this.make(object[node]);
    }
    return [this.make(object), node, top];
  }
  static wrapDelayCallback(callback, delay) {
    return (...args) => setTimeout(() => callback(...args), delay);
  }
  static wrapThrottleCallback(callback, throttle) {
    this.throttles.set(callback, false);
    return (...args) => {
      if (this.throttles.get(callback, true)) {
        return;
      }
      callback(...args);
      this.throttles.set(callback, true);
      setTimeout(() => {
        this.throttles.set(callback, false);
      }, throttle);
    };
  }
  static wrapWaitCallback(callback, wait) {
    return (...args) => {
      var waiter;
      if (waiter = this.waiters.get(callback)) {
        this.waiters.delete(callback);
        clearTimeout(waiter);
      }
      waiter = setTimeout(() => callback(...args), wait);
      this.waiters.set(callback, waiter);
    };
  }
  static wrapFrameCallback(callback, frames) {
    return (...args) => {
      requestAnimationFrame(() => callback(...args));
    };
  }
  static wrapIdleCallback(callback) {
    return (...args) => {
      // Compatibility for Safari 08/2020
      var req = window.requestIdleCallback || requestAnimationFrame;
      req(() => callback(...args));
    };
  }
}
exports.Bindable = Bindable;
_defineProperty(Bindable, "waiters", new WeakMap());
_defineProperty(Bindable, "throttles", new WeakMap());
Object.defineProperty(Bindable, 'Prevent', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: Prevent
});
Object.defineProperty(Bindable, 'OnGet', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: OnGet
});
Object.defineProperty(Bindable, 'NoGetters', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: NoGetters
});
Object.defineProperty(Bindable, 'GetProto', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: GetProto
});
Object.defineProperty(Bindable, 'OnAllGet', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: OnAllGet
});
  })();
});

require.register("curvature/base/Cache.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Cache = void 0;
class Cache {
  static store(key, value, expiry, bucket = 'standard') {
    var expiration = 0;
    if (expiry) {
      expiration = expiry * 1000 + new Date().getTime();
    }
    if (!this.buckets) {
      this.buckets = new Map();
    }
    if (!this.buckets.has(bucket)) {
      this.buckets.set(bucket, new Map());
    }
    var eventEnd = new CustomEvent('cvCacheStore', {
      cancelable: true,
      detail: {
        key,
        value,
        expiry,
        bucket
      }
    });
    if (document.dispatchEvent(eventEnd)) {
      this.buckets.get(bucket).set(key, {
        value,
        expiration
      });
    }
  }
  static load(key, defaultvalue = false, bucket = 'standard') {
    var eventEnd = new CustomEvent('cvCacheLoad', {
      cancelable: true,
      detail: {
        key,
        defaultvalue,
        bucket
      }
    });
    if (!document.dispatchEvent(eventEnd)) {
      return defaultvalue;
    }
    if (this.buckets && this.buckets.has(bucket) && this.buckets.get(bucket).has(key)) {
      var entry = this.buckets.get(bucket).get(key);
      // console.log(this.bucket[bucket][key].expiration, (new Date).getTime());
      if (entry.expiration === 0 || entry.expiration > new Date().getTime()) {
        return this.buckets.get(bucket).get(key).value;
      }
    }
    return defaultvalue;
  }
}
exports.Cache = Cache;
  })();
});

require.register("curvature/base/Config.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = void 0;
var AppConfig = {};
var _require = require;
var win = typeof globalThis === 'object' ? globalThis : typeof window === 'object' ? window : typeof self === 'object' ? self : void 0;
try {
  AppConfig = _require('/Config').Config;
} catch (error) {
  win.devMode === true && console.error(error);
  AppConfig = {};
}
class Config {
  static get(name) {
    return this.configs[name];
  }
  static set(name, value) {
    this.configs[name] = value;
    return this;
  }
  static dump() {
    return this.configs;
  }
  static init(...configs) {
    for (var i in configs) {
      var config = configs[i];
      if (typeof config === 'string') {
        config = JSON.parse(config);
      }
      for (var name in config) {
        var value = config[name];
        return this.configs[name] = value;
      }
    }
    return this;
  }
}
exports.Config = Config;
Object.defineProperty(Config, 'configs', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: AppConfig
});
  })();
});

require.register("curvature/base/Dom.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Dom = void 0;
var traversals = 0;
class Dom {
  static mapTags(doc, selector, callback, startNode, endNode) {
    var result = [];
    var started = true;
    if (startNode) {
      started = false;
    }
    var ended = false;
    var {
      Node,
      Element,
      NodeFilter,
      document
    } = globalThis.window;
    var treeWalker = document.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (node, walker) => {
        if (!started) {
          if (node === startNode) {
            started = true;
          } else {
            return NodeFilter.FILTER_SKIP;
          }
        }
        if (endNode && node === endNode) {
          ended = true;
        }
        if (ended) {
          return NodeFilter.FILTER_SKIP;
        }
        if (selector) {
          if (node instanceof Element) {
            if (node.matches(selector)) {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);
    var traversal = traversals++;
    while (treeWalker.nextNode()) {
      result.push(callback(treeWalker.currentNode, treeWalker));
    }
    return result;
  }
  static dispatchEvent(doc, event) {
    doc.dispatchEvent(event);
    this.mapTags(doc, false, node => {
      node.dispatchEvent(event);
    });
  }
}
exports.Dom = Dom;
  })();
});

require.register("curvature/base/Mixin.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Mixin = void 0;
var _Bindable = require("./Bindable");
var Constructor = Symbol('constructor');
var MixinList = Symbol('mixinList');
class Mixin {
  static from(baseClass, ...mixins) {
    var newClass = class extends baseClass {
      constructor(...args) {
        var instance = baseClass.constructor ? super(...args) : null;
        for (var mixin of mixins) {
          if (mixin[Mixin.Constructor]) {
            mixin[Mixin.Constructor].apply(this);
          }
          switch (typeof mixin) {
            case 'function':
              Mixin.mixClass(mixin, newClass);
              break;
            case 'object':
              Mixin.mixObject(mixin, this);
              break;
          }
        }
        return instance;
      }
    };
    return newClass;
  }
  static make(...classes) {
    var base = classes.pop();
    return Mixin.to(base, ...classes);
  }
  static to(base, ...mixins) {
    var descriptors = {};
    mixins.map(mixin => {
      switch (typeof mixin) {
        case 'object':
          Object.assign(descriptors, Object.getOwnPropertyDescriptors(mixin));
          break;
        case 'function':
          Object.assign(descriptors, Object.getOwnPropertyDescriptors(mixin.prototype));
          break;
      }
      delete descriptors.constructor;
      Object.defineProperties(base.prototype, descriptors);
    });
  }
  static with(...mixins) {
    return this.from(class {
      constructor() {}
    }, ...mixins);
  }
  static mixObject(mixin, instance) {
    for (var func of Object.getOwnPropertyNames(mixin)) {
      if (typeof mixin[func] === 'function') {
        instance[func] = mixin[func].bind(instance);
        continue;
      }
      instance[func] = mixin[func];
    }
    for (var _func of Object.getOwnPropertySymbols(mixin)) {
      if (typeof mixin[_func] === 'function') {
        instance[_func] = mixin[_func].bind(instance);
        continue;
      }
      instance[_func] = mixin[_func];
    }
  }
  static mixClass(cls, newClass) {
    for (var func of Object.getOwnPropertyNames(cls.prototype)) {
      if (['name', 'prototype', 'length'].includes(func)) {
        continue;
      }
      var descriptor = Object.getOwnPropertyDescriptor(newClass, func);
      if (descriptor && !descriptor.writable) {
        continue;
      }
      if (typeof cls[func] !== 'function') {
        newClass.prototype[func] = cls.prototype[func];
        continue;
      }
      newClass.prototype[func] = cls.prototype[func].bind(newClass.prototype);
    }
    for (var _func2 of Object.getOwnPropertySymbols(cls.prototype)) {
      if (typeof cls[_func2] !== 'function') {
        newClass.prototype[_func2] = cls.prototype[_func2];
        continue;
      }
      newClass.prototype[_func2] = cls.prototype[_func2].bind(newClass.prototype);
    }
    var _loop = function () {
        if (['name', 'prototype', 'length'].includes(_func3)) {
          return 0; // continue
        }
        var descriptor = Object.getOwnPropertyDescriptor(newClass, _func3);
        if (descriptor && !descriptor.writable) {
          return 0; // continue
        }
        if (typeof cls[_func3] !== 'function') {
          newClass[_func3] = cls[_func3];
          return 0; // continue
        }
        var prev = newClass[_func3] || false;
        var meth = cls[_func3].bind(newClass);
        newClass[_func3] = (...args) => {
          prev && prev(...args);
          return meth(...args);
        };
      },
      _ret;
    for (var _func3 of Object.getOwnPropertyNames(cls)) {
      _ret = _loop();
      if (_ret === 0) continue;
    }
    var _loop2 = function () {
      if (typeof cls[_func4] !== 'function') {
        newClass.prototype[_func4] = cls[_func4];
        return 1; // continue
      }
      var prev = newClass[_func4] || false;
      var meth = cls[_func4].bind(newClass);
      newClass[_func4] = (...args) => {
        prev && prev(...args);
        return meth(...args);
      };
    };
    for (var _func4 of Object.getOwnPropertySymbols(cls)) {
      if (_loop2()) continue;
    }
  }
  static mix(mixinTo) {
    var constructors = [];
    var allStatic = {};
    var allInstance = {};
    var mixable = _Bindable.Bindable.makeBindable(mixinTo);
    var _loop3 = function (base) {
      var instanceNames = Object.getOwnPropertyNames(base.prototype);
      var staticNames = Object.getOwnPropertyNames(base);
      var prefix = /^(before|after)__(.+)/;
      var _loop5 = function (_methodName2) {
          var match = _methodName2.match(prefix);
          if (match) {
            switch (match[1]) {
              case 'before':
                mixable.___before((t, e, s, o, a) => {
                  if (e !== match[2]) {
                    return;
                  }
                  var method = base[_methodName2].bind(o);
                  return method(...a);
                });
                break;
              case 'after':
                mixable.___after((t, e, s, o, a) => {
                  if (e !== match[2]) {
                    return;
                  }
                  var method = base[_methodName2].bind(o);
                  return method(...a);
                });
                break;
            }
            return 0; // continue
          }
          if (allStatic[_methodName2]) {
            return 0; // continue
          }
          if (typeof base[_methodName2] !== 'function') {
            return 0; // continue
          }
          allStatic[_methodName2] = base[_methodName2];
        },
        _ret2;
      for (var _methodName2 of staticNames) {
        _ret2 = _loop5(_methodName2);
        if (_ret2 === 0) continue;
      }
      var _loop6 = function (_methodName3) {
          var match = _methodName3.match(prefix);
          if (match) {
            switch (match[1]) {
              case 'before':
                mixable.___before((t, e, s, o, a) => {
                  if (e !== match[2]) {
                    return;
                  }
                  var method = base.prototype[_methodName3].bind(o);
                  return method(...a);
                });
                break;
              case 'after':
                mixable.___after((t, e, s, o, a) => {
                  if (e !== match[2]) {
                    return;
                  }
                  var method = base.prototype[_methodName3].bind(o);
                  return method(...a);
                });
                break;
            }
            return 0; // continue
          }
          if (allInstance[_methodName3]) {
            return 0; // continue
          }
          if (typeof base.prototype[_methodName3] !== 'function') {
            return 0; // continue
          }
          allInstance[_methodName3] = base.prototype[_methodName3];
        },
        _ret3;
      for (var _methodName3 of instanceNames) {
        _ret3 = _loop6(_methodName3);
        if (_ret3 === 0) continue;
      }
    };
    for (var base = this; base && base.prototype; base = Object.getPrototypeOf(base)) {
      _loop3(base);
    }
    for (var methodName in allStatic) {
      mixinTo[methodName] = allStatic[methodName].bind(mixinTo);
    }
    var _loop4 = function (_methodName) {
      mixinTo.prototype[_methodName] = function (...args) {
        return allInstance[_methodName].apply(this, args);
      };
    };
    for (var _methodName in allInstance) {
      _loop4(_methodName);
    }
    return mixable;
  }
}
exports.Mixin = Mixin;
Mixin.Constructor = Constructor;
  })();
});

require.register("curvature/base/Router.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Router = void 0;
var _View = require("./View");
var _Cache = require("./Cache");
var _Config = require("./Config");
var _Routes = require("./Routes");
var _win$CustomEvent;
var NotFoundError = Symbol('NotFound');
var InternalError = Symbol('Internal');
var win = typeof globalThis === 'object' ? globalThis : typeof window === 'object' ? window : typeof self === 'object' ? self : void 0;
win.CustomEvent = (_win$CustomEvent = win.CustomEvent) !== null && _win$CustomEvent !== void 0 ? _win$CustomEvent : win.Event;
class Router {
  static wait(view, event = 'DOMContentLoaded', node = document) {
    node.addEventListener(event, () => {
      this.listen(view);
    });
  }
  static listen(listener, routes = false) {
    this.listener = listener || this.listener;
    this.routes = routes || listener.routes;
    Object.assign(this.query, this.queryOver({}));
    var listen = event => {
      event.preventDefault();
      if (event.state && 'routedId' in event.state) {
        if (event.state.routedId <= this.routeCount) {
          this.history.splice(event.state.routedId);
          this.routeCount = event.state.routedId;
        } else if (event.state.routedId > this.routeCount) {
          this.history.push(event.state.prev);
          this.routeCount = event.state.routedId;
        }
        this.state = event.state;
      } else {
        if (this.prevPath !== null && this.prevPath !== location.pathname) {
          this.history.push(this.prevPath);
        }
      }
      if (!this.isOriginLimited(location)) {
        this.match(location.pathname, listener);
      } else {
        this.match(this.nextPath, listener);
      }
    };
    window.addEventListener('cvUrlChanged', listen);
    window.addEventListener('popstate', listen);
    var route = !this.isOriginLimited(location) ? location.pathname + location.search : false;
    if (!this.isOriginLimited(location) && location.hash) {
      route += location.hash;
    }
    var state = {
      routedId: this.routeCount,
      url: location.pathname,
      prev: this.prevPath
    };
    if (!this.isOriginLimited(location)) {
      history.replaceState(state, null, location.pathname);
    }
    this.go(route !== false ? route : '/');
  }
  static go(path, silent = false) {
    var configTitle = _Config.Config.get('title');
    if (configTitle) {
      document.title = configTitle;
    }
    var state = {
      routedId: this.routeCount,
      prev: this.prevPath,
      url: location.pathname
    };
    if (silent === -1) {
      this.match(path, this.listener, true);
    } else if (this.isOriginLimited(location)) {
      this.nextPath = path;
    } else if (silent === 2 && location.pathname !== path) {
      history.replaceState(state, null, path);
    } else if (location.pathname !== path) {
      history.pushState(state, null, path);
    }
    if (!silent || silent < 0) {
      if (silent === false) {
        this.path = null;
      }
      if (!silent) {
        if (path.substring(0, 1) === '#') {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } else {
          window.dispatchEvent(new CustomEvent('cvUrlChanged'));
        }
      }
    }
    this.prevPath = path;
  }
  static processRoute(routes, selected, args) {
    var result = false;
    if (typeof routes[selected] === 'function') {
      if (routes[selected].prototype instanceof _View.View) {
        result = new routes[selected](args);
      } else {
        result = routes[selected](args);
      }
    } else {
      result = routes[selected];
    }
    return result;
  }
  static handleError(error, routes, selected, args, listener, path, prev, forceRefresh) {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('cvRouteError', {
        detail: {
          error,
          path,
          prev,
          view: listener,
          routes,
          selected
        }
      }));
    }
    var result = win['devMode'] ? 'Unexpected error: ' + String(error) : 'Unexpected error.';
    if (routes[InternalError]) {
      args[InternalError] = error;
      result = this.processRoute(routes, InternalError, args);
    }
    this.update(listener, path, result, routes, selected, args, forceRefresh);
  }
  static match(path, listener, options = false) {
    var event = null,
      request = null,
      forceRefresh = false;
    if (options === true) {
      forceRefresh = options;
    }
    if (options && typeof options === 'object') {
      forceRefresh = options.forceRefresh;
      event = options.event;
    }
    if (typeof document !== 'undefined' && this.path === path && !forceRefresh) {
      return;
    }
    var origin = 'http://example.com';
    if (typeof document !== 'undefined') {
      origin = this.isOriginLimited(location) ? origin : location.origin;
      this.queryString = location.search;
    }
    var url = new URL(path, origin);
    path = this.path = url.pathname;
    if (typeof document === 'undefined') {
      this.queryString = url.search;
    }
    var prev = this.prevPath;
    var current = listener && listener.args ? listener.args.content : null;
    var routes = this.routes || listener && listener.routes || _Routes.Routes.dump();
    var query = new URLSearchParams(this.queryString);
    if (event && event.request) {
      this.request = event.request;
    }
    for (var key in Object.keys(this.query)) {
      delete this.query[key];
    }
    for (var [_key, value] of query) {
      this.query[_key] = value;
    }
    var args = {},
      selected = false,
      result = '';
    if (path.substring(0, 1) === '/') {
      path = path.substring(1);
    }
    path = path.split('/');
    for (var i in this.query) {
      args[i] = this.query[i];
    }
    L1: for (var _i in routes) {
      var route = _i.split('/');
      if (route.length < path.length && route[route.length - 1] !== '*') {
        continue;
      }
      L2: for (var j in route) {
        if (route[j].substr(0, 1) == '%') {
          var argName = null;
          var groups = /^%(\w+)\??/.exec(route[j]);
          if (groups && groups[1]) {
            argName = groups[1];
          }
          if (!argName) {
            throw new Error(`${route[j]} is not a valid argument segment in route "${_i}"`);
          }
          if (!path[j]) {
            if (route[j].substr(route[j].length - 1, 1) == '?') {
              args[argName] = '';
            } else {
              continue L1;
            }
          } else {
            args[argName] = path[j];
          }
        } else if (route[j] !== '*' && path[j] !== route[j]) {
          continue L1;
        }
      }
      selected = _i;
      result = routes[_i];
      if (route[route.length - 1] === '*') {
        args.pathparts = path.slice(route.length - 1);
      }
      break;
    }
    var eventStart = new CustomEvent('cvRouteStart', {
      cancelable: true,
      detail: {
        path,
        prev,
        root: listener,
        selected,
        routes
      }
    });
    if (typeof document !== 'undefined') {
      if (!document.dispatchEvent(eventStart)) {
        return;
      }
    }
    if (!forceRefresh && listener && current && typeof result === 'object' && current.constructor === result.constructor && !(result instanceof Promise) && current.update(args)) {
      listener.args.content = current;
      return true;
    }
    if (!(selected in routes)) {
      routes[selected] = routes[NotFoundError];
    }
    try {
      result = this.processRoute(routes, selected, args);
      if (result === false) {
        result = this.processRoute(routes, NotFoundError, args);
      }
      if (typeof document === 'undefined') {
        if (!(result instanceof Promise)) {
          return Promise.resolve(result);
        }
        return result;
      }
      if (!(result instanceof Promise)) {
        return this.update(listener, path, result, routes, selected, args, forceRefresh);
      }
      return result.then(realResult => this.update(listener, path, realResult, routes, selected, args, forceRefresh)).catch(error => {
        this.handleError(error, routes, selected, args, listener, path, prev, forceRefresh);
      });
    } catch (error) {
      this.handleError(error, routes, selected, args, listener, path, prev, forceRefresh);
    }
  }
  static update(listener, path, result, routes, selected, args, forceRefresh) {
    if (!listener) {
      return;
    }
    var prev = this.prevPath;
    var event = new CustomEvent('cvRoute', {
      cancelable: true,
      detail: {
        result,
        path,
        prev,
        view: listener,
        routes,
        selected
      }
    });
    if (result !== false) {
      if (listener.args.content instanceof _View.View) {
        listener.args.content.pause(true);
        listener.args.content.remove();
      }
      if (document.dispatchEvent(event)) {
        listener.args.content = result;
      }
      if (result instanceof _View.View) {
        result.pause(false);
        result.update(args, forceRefresh);
      }
    }
    var eventEnd = new CustomEvent('cvRouteEnd', {
      cancelable: true,
      detail: {
        result,
        path,
        prev,
        view: listener,
        routes,
        selected
      }
    });
    document.dispatchEvent(eventEnd);
  }
  static isOriginLimited({
    origin
  }) {
    return origin === 'null' || origin === 'file://';
  }
  static queryOver(args = {}) {
    var params = new URLSearchParams(location.search);
    var finalArgs = {};
    var query = {};
    for (var pair of params) {
      query[pair[0]] = pair[1];
    }
    finalArgs = Object.assign(finalArgs, query, args);
    delete finalArgs['api'];
    return finalArgs;

    // for(let i in query)
    // {
    // 	finalArgs[i] = query[i];
    // }

    // for(let i in args)
    // {
    // 	finalArgs[i] = args[i];
    // }
  }
  static queryToString(args = {}, fresh = false) {
    var parts = [],
      finalArgs = args;
    if (!fresh) {
      finalArgs = this.queryOver(args);
    }
    for (var i in finalArgs) {
      if (finalArgs[i] === '') {
        continue;
      }
      parts.push(i + '=' + encodeURIComponent(finalArgs[i]));
    }
    return parts.join('&');
  }
  static setQuery(name, value, silent) {
    var args = this.queryOver();
    args[name] = value;
    if (value === undefined) {
      delete args[name];
    }
    var queryString = this.queryToString(args, true);
    this.go(location.pathname + (queryString ? '?' + queryString : '?'), silent);
  }
}
exports.Router = Router;
Object.defineProperty(Router, 'query', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: {}
});
Object.defineProperty(Router, 'history', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: []
});
Object.defineProperty(Router, 'routeCount', {
  configurable: false,
  enumerable: false,
  writable: true,
  value: 0
});
Object.defineProperty(Router, 'prevPath', {
  configurable: false,
  enumerable: false,
  writable: true,
  value: null
});
Object.defineProperty(Router, 'queryString', {
  configurable: false,
  enumerable: false,
  writable: true,
  value: null
});
Object.defineProperty(Router, 'InternalError', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: InternalError
});
Object.defineProperty(Router, 'NotFoundError', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: NotFoundError
});
  })();
});

require.register("curvature/base/Routes.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Routes = void 0;
var AppRoutes = {};
var _require = require;
var imported = false;
var runImport = () => {
  if (imported) {
    return;
  }
  ;
  try {
    Object.assign(AppRoutes, _require('Routes').Routes || {});
  } catch (error) {
    globalThis.devMode === true && console.warn(error);
  }
  imported = true;
};
class Routes {
  static get(name) {
    runImport();
    return this.routes[name];
  }
  static dump() {
    runImport();
    return this.routes;
  }
}
exports.Routes = Routes;
Object.defineProperty(Routes, 'routes', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: AppRoutes
});
  })();
});

require.register("curvature/base/RuleSet.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RuleSet = void 0;
var _Dom = require("./Dom");
var _Tag = require("./Tag");
var _View = require("./View");
class RuleSet {
  static add(selector, callback) {
    this.globalRules = this.globalRules || {};
    this.globalRules[selector] = this.globalRules[selector] || [];
    this.globalRules[selector].push(callback);
    return this;
  }
  static apply(doc = document, view = null) {
    for (var selector in this.globalRules) {
      for (var i in this.globalRules[selector]) {
        var callback = this.globalRules[selector][i];
        var wrapped = this.wrap(doc, callback, view);
        var nodes = doc.querySelectorAll(selector);
        for (var node of nodes) {
          wrapped(node);
        }
      }
    }
  }
  add(selector, callback) {
    this.rules = this.rules || {};
    this.rules[selector] = this.rules[selector] || [];
    this.rules[selector].push(callback);
    return this;
  }
  apply(doc = document, view = null) {
    RuleSet.apply(doc, view);
    for (var selector in this.rules) {
      for (var i in this.rules[selector]) {
        var callback = this.rules[selector][i];
        var wrapped = RuleSet.wrap(doc, callback, view);
        var nodes = doc.querySelectorAll(selector);
        for (var node of nodes) {
          wrapped(node);
        }
      }
    }
  }
  purge() {
    if (!this.rules) {
      return;
    }
    for (var [k, v] of Object.entries(this.rules)) {
      if (!this.rules[k]) {
        continue;
      }
      for (var kk in this.rules[k]) {
        delete this.rules[k][kk];
      }
    }
  }
  static wait(event = 'DOMContentLoaded', node = document) {
    var listener = ((event, node) => () => {
      node.removeEventListener(event, listener);
      return this.apply();
    })(event, node);
    node.addEventListener(event, listener);
  }
  static wrap(doc, originalCallback, view = null) {
    var callback = originalCallback;
    if (originalCallback instanceof _View.View || originalCallback && originalCallback.prototype && originalCallback.prototype instanceof _View.View) {
      callback = () => originalCallback;
    }
    return element => {
      if (typeof element.___cvApplied___ === 'undefined') {
        Object.defineProperty(element, '___cvApplied___', {
          enumerable: false,
          writable: false,
          value: new WeakSet()
        });
      }
      if (element.___cvApplied___.has(originalCallback)) {
        return;
      }
      var direct, parentView;
      if (view) {
        direct = parentView = view;
        if (view.viewList) {
          parentView = view.viewList.parent;
        }
      }
      var tag = new _Tag.Tag(element, parentView, null, undefined, direct);
      var parent = tag.element.parentNode;
      var sibling = tag.element.nextSibling;
      var result = callback(tag);
      if (result !== false) {
        element.___cvApplied___.add(originalCallback);
      }
      if (result instanceof HTMLElement) {
        result = new _Tag.Tag(result);
      }
      if (result instanceof _Tag.Tag) {
        if (!result.element.contains(tag.element)) {
          while (tag.element.firstChild) {
            result.element.appendChild(tag.element.firstChild);
          }
          tag.remove();
        }
        if (sibling) {
          parent.insertBefore(result.element, sibling);
        } else {
          parent.appendChild(result.element);
        }
      }
      if (result && result.prototype && result.prototype instanceof _View.View) {
        result = new result({}, view);
      }
      if (result instanceof _View.View) {
        if (view) {
          view.cleanup.push(() => result.remove());
          view.cleanup.push(view.args.bindTo((v, k, t) => {
            t[k] = v;
            result.args[k] = v;
          }));
          view.cleanup.push(result.args.bindTo((v, k, t, d) => {
            t[k] = v;
            view.args[k] = v;
          }));
        }
        tag.clear();
        result.render(tag.element);
      }
    };
  }
}
exports.RuleSet = RuleSet;
  })();
});

require.register("curvature/base/SetMap.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SetMap = void 0;
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
class SetMap {
  constructor() {
    _defineProperty(this, "_map", new Map());
  }
  has(key) {
    return this._map.has(key);
  }
  get(key) {
    return this._map.get(key);
  }
  getOne(key) {
    var set = this.get(key);
    for (var entry of set) {
      return entry;
    }
  }
  add(key, value) {
    var set = this._map.get(key);
    if (!set) {
      this._map.set(key, set = new Set());
    }
    return set.add(value);
  }
  remove(key, value) {
    var set = this._map.get(key);
    if (!set) {
      return;
    }
    var res = set.delete(value);
    if (!set.size) {
      this._map.delete(key);
    }
    return res;
  }
  values() {
    return new Set(...[...this._map.values()].map(set => [...set.values()]));
  }
}
exports.SetMap = SetMap;
  })();
});

require.register("curvature/base/Tag.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tag = void 0;
var _Bindable = require("./Bindable");
var CurrentStyle = Symbol('CurrentStyle');
var CurrentAttrs = Symbol('CurrentAttrs');
var styler = function (styles) {
  if (!this.node) {
    return;
  }
  for (var property in styles) {
    var stringedProperty = String(styles[property]);
    if (this[CurrentStyle].has(property) && this[CurrentStyle].get(property) === styles[property] || Number.isNaN(styles[property])) {
      continue;
    }
    if (property[0] === '-') {
      this.node.style.setProperty(property, stringedProperty);
    } else {
      this.node.style[property] = stringedProperty;
    }
    if (styles[property] !== undefined) {
      this[CurrentStyle].set(property, styles[property]);
    } else {
      this[CurrentStyle].delete(property);
    }
  }
};
var getter = function (name) {
  if (typeof this[name] === 'function') {
    return this[name];
  }
  if (this.node && typeof this.node[name] === 'function') {
    return this[name] = (...args) => this.node[name](...args);
  }
  if (name === 'style') {
    return this.proxy.style;
  }
  if (this.node && name in this.node) {
    return this.node[name];
  }
  return this[name];
};
class Tag {
  constructor(element, parent, ref, index, direct) {
    if (typeof element === 'string') {
      var subdoc = document.createRange().createContextualFragment(element);
      element = subdoc.firstChild;
    }
    this.element = _Bindable.Bindable.makeBindable(element);
    this.node = this.element;
    this.parent = parent;
    this.direct = direct;
    this.ref = ref;
    this.index = index;
    this.cleanup = [];
    this[_Bindable.Bindable.OnAllGet] = getter.bind(this);
    this[CurrentStyle] = new Map();
    this[CurrentAttrs] = new Map();
    var boundStyler = _Bindable.Bindable.make(styler.bind(this));
    Object.defineProperty(this, 'style', {
      value: boundStyler
    });
    this.proxy = _Bindable.Bindable.make(this);
    this.proxy.style.bindTo((v, k, t, d) => {
      if (this[CurrentStyle].has(k) && this[CurrentStyle].get(k) === v) {
        return;
      }
      this.node.style[k] = v;
      if (!d && v !== undefined) {
        this[CurrentStyle].set(k, v);
      } else {
        this[CurrentStyle].delete(k);
      }
    });
    this.proxy.bindTo((v, k) => {
      if (k === 'index') {
        return;
      }
      if (k in element && element[k] !== v) {
        element[k] = v;
      }
      return false;
    });
    return this.proxy;
  }
  attr(attributes) {
    for (var attribute in attributes) {
      if (this[CurrentAttrs].has(attribute) && attributes[attribute] === undefined) {
        this.node.removeAttribute(attribute);
        this[CurrentAttrs].delete(attribute);
      } else if (!this[CurrentAttrs].has(attribute) || this[CurrentAttrs].get(attribute) !== attributes[attribute]) {
        if (attributes[attribute] === null) {
          this.node.setAttribute(attribute, '');
          this[CurrentAttrs].set(attribute, '');
        } else {
          this.node.setAttribute(attribute, attributes[attribute]);
          this[CurrentAttrs].set(attribute, attributes[attribute]);
        }
      }
    }
    return this;
  }
  remove() {
    if (this.node) {
      this.node.remove();
    }
    _Bindable.Bindable.clearBindings(this);
    var cleanup;
    while (cleanup = this.cleanup.shift()) {
      cleanup();
    }
    this.clear();
    if (!this.node) {
      return;
    }
    var detachEvent = new Event('cvDomDetached');
    this.node.dispatchEvent(detachEvent);
    this.node = this.element = this.ref = this.parent = undefined;
  }
  clear() {
    if (!this.node) {
      return;
    }
    var detachEvent = new Event('cvDomDetached');
    while (this.node.firstChild) {
      this.node.firstChild.dispatchEvent(detachEvent);
      this.node.removeChild(this.node.firstChild);
    }
  }
  pause(paused = true) {}
  listen(eventName, callback, options) {
    var node = this.node;
    node.addEventListener(eventName, callback, options);
    var remove = () => {
      node.removeEventListener(eventName, callback, options);
    };
    var remover = () => {
      remove();
      remove = () => console.warn('Already removed!');
    };
    this.parent.onRemove(() => remover());
    return remover;
  }
}
exports.Tag = Tag;
  })();
});

require.register("curvature/base/Uuid.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Uuid = void 0;
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var win = typeof globalThis === 'object' ? globalThis : typeof window === 'object' ? window : typeof self === 'object' ? self : void 0;
var crypto = win.crypto;
class Uuid {
  constructor(uuid = null, version = 4) {
    _defineProperty(this, "uuid", null);
    _defineProperty(this, "version", 4);
    if (uuid) {
      if (typeof uuid !== 'string' && !(uuid instanceof Uuid) || !uuid.match(/[0-9A-Fa-f]{8}(-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}/)) {
        throw new Error(`Invalid input for Uuid: "${uuid}"`);
      }
      this.version = version;
      this.uuid = uuid;
    } else if (crypto && typeof crypto.randomUUID === 'function') {
      this.uuid = crypto.randomUUID();
    } else {
      var init = [1e7] + -1e3 + -4e3 + -8e3 + -1e11;
      var rand = crypto && typeof crypto.randomUUID === 'function' ? () => crypto.getRandomValues(new Uint8Array(1))[0] : () => Math.trunc(Math.random() * 256);
      this.uuid = init.replace(/[018]/g, c => (c ^ rand() & 15 >> c / 4).toString(16));
    }
    Object.freeze(this);
  }
  [Symbol.toPrimitive]() {
    return this.toString();
  }
  toString() {
    return this.uuid;
  }
  toJson() {
    return {
      version: this.version,
      uuid: this.uuid
    };
  }
}
exports.Uuid = Uuid;
  })();
});

require.register("curvature/base/View.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.View = void 0;
var _Bindable = require("./Bindable");
var _ViewList = require("./ViewList");
var _Router = require("./Router");
var _Uuid = require("./Uuid");
var _Dom = require("./Dom");
var _Tag = require("./Tag");
var _Bag = require("./Bag");
var _RuleSet = require("./RuleSet");
var _Mixin = require("./Mixin");
var _EventTargetMixin = require("../mixin/EventTargetMixin");
var dontParse = Symbol('dontParse');
var expandBind = Symbol('expandBind');
var uuid = Symbol('uuid');
class View extends _Mixin.Mixin.with(_EventTargetMixin.EventTargetMixin) {
  get _id() {
    return this[uuid];
  }
  static from(template, args = {}, mainView = null) {
    var view = new this(args, mainView);
    view.template = template;
    return view;
  }
  constructor(args = {}, mainView = null) {
    super(args, mainView);
    this[_EventTargetMixin.EventTargetMixin.Parent] = mainView;
    Object.defineProperty(this, 'args', {
      value: _Bindable.Bindable.make(args)
    });
    Object.defineProperty(this, uuid, {
      value: this.constructor.uuid()
    });
    Object.defineProperty(this, 'nodesAttached', {
      value: new _Bag.Bag((i, s, a) => {})
    });
    Object.defineProperty(this, 'nodesDetached', {
      value: new _Bag.Bag((i, s, a) => {})
    });
    Object.defineProperty(this, '_onRemove', {
      value: new _Bag.Bag((i, s, a) => {})
    });
    Object.defineProperty(this, 'cleanup', {
      value: []
    });
    Object.defineProperty(this, 'parent', {
      value: mainView,
      writable: true
    });
    Object.defineProperty(this, 'views', {
      value: new Map()
    });
    Object.defineProperty(this, 'viewLists', {
      value: new Map()
    });
    Object.defineProperty(this, 'withViews', {
      value: new Map()
    });
    Object.defineProperty(this, 'tags', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'nodes', {
      value: _Bindable.Bindable.make([])
    });
    Object.defineProperty(this, 'timeouts', {
      value: new Map()
    });
    Object.defineProperty(this, 'intervals', {
      value: new Map()
    });
    Object.defineProperty(this, 'frames', {
      value: []
    });
    Object.defineProperty(this, 'ruleSet', {
      value: new _RuleSet.RuleSet()
    });
    Object.defineProperty(this, 'preRuleSet', {
      value: new _RuleSet.RuleSet()
    });
    Object.defineProperty(this, 'subBindings', {
      value: {}
    });
    Object.defineProperty(this, 'templates', {
      value: {}
    });
    Object.defineProperty(this, 'postMapping', {
      value: new Set()
    });
    Object.defineProperty(this, 'eventCleanup', {
      value: []
    });
    Object.defineProperty(this, 'unpauseCallbacks', {
      value: new Map()
    });
    Object.defineProperty(this, 'interpolateRegex', {
      value: /(\[\[((?:\$+)?[\w\.\|-]+)\]\])/g
    });
    Object.defineProperty(this, 'rendered', {
      value: new Promise((accept, reject) => Object.defineProperty(this, 'renderComplete', {
        value: accept
      }))
    });
    this.onRemove(() => {
      if (!this[_EventTargetMixin.EventTargetMixin.Parent]) {
        return;
      }
      this[_EventTargetMixin.EventTargetMixin.Parent] = null;
    });
    this.controller = this;
    this.template = ``;
    this.firstNode = null;
    this.lastNode = null;
    this.viewList = null;
    this.mainView = null;
    this.preserve = false;
    this.removed = false;
    this.loaded = Promise.resolve(this);

    // return Bindable.make(this);
  }
  static isView() {
    return View;
  }
  onFrame(callback) {
    var stopped = false;
    var cancel = () => {
      stopped = true;
    };
    var c = timestamp => {
      if (this.removed || stopped) {
        return;
      }
      if (!this.paused) {
        callback(Date.now());
      }
      requestAnimationFrame(c);
    };
    requestAnimationFrame(() => c(Date.now()));
    this.frames.push(cancel);
    return cancel;
  }
  onNextFrame(callback) {
    return requestAnimationFrame(() => callback(Date.now()));
  }
  onIdle(callback) {
    return requestIdleCallback(() => callback(Date.now()));
  }
  onTimeout(time, callback) {
    var timeoutInfo = {
      timeout: null,
      callback: null,
      time: time,
      fired: false,
      created: new Date().getTime(),
      paused: false
    };
    var wrappedCallback = () => {
      callback();
      timeoutInfo.fired = true;
      this.timeouts.delete(timeoutInfo.timeout);
    };
    var timeout = setTimeout(wrappedCallback, time);
    timeoutInfo.callback = wrappedCallback;
    timeoutInfo.timeout = timeout;
    this.timeouts.set(timeoutInfo.timeout, timeoutInfo);
    return timeout;
  }
  clearTimeout(timeout) {
    if (!this.timeouts.has(timeout)) {
      return;
    }
    var timeoutInfo = this.timeouts.get(timeout);
    clearTimeout(timeoutInfo.timeout);
    this.timeouts.delete(timeoutInfo.timeout);
  }
  onInterval(time, callback) {
    var timeout = setInterval(callback, time);
    this.intervals.set(timeout, {
      timeout: timeout,
      callback: callback,
      time: time,
      paused: false
    });
    return timeout;
  }
  clearInterval(timeout) {
    if (!this.intervals.has(timeout)) {
      return;
    }
    var timeoutInfo = this.intervals.get(timeout);
    clearTimeout(timeoutInfo.timeout);
    this.intervals.delete(timeoutInfo.timeout);
  }
  pause(paused = undefined) {
    if (paused === undefined) {
      this.paused = !this.paused;
    }
    this.paused = paused;
    if (this.paused) {
      for (var [callback, timeout] of this.timeouts) {
        if (timeout.fired) {
          this.timeouts.delete(timeout.timeout);
          continue;
        }
        clearTimeout(timeout.timeout);
        timeout.paused = true;
        timeout.time = Math.max(0, timeout.time - (Date.now() - timeout.created));
      }
      for (var [_callback, _timeout] of this.intervals) {
        clearInterval(_timeout.timeout);
        _timeout.paused = true;
      }
    } else {
      for (var [_callback2, _timeout2] of this.timeouts) {
        if (!_timeout2.paused) {
          continue;
        }
        if (_timeout2.fired) {
          this.timeouts.delete(_timeout2.timeout);
          continue;
        }
        _timeout2.timeout = setTimeout(_timeout2.callback, _timeout2.time);
        _timeout2.paused = false;
      }
      for (var [_callback3, _timeout3] of this.intervals) {
        if (!_timeout3.paused) {
          continue;
        }
        _timeout3.timeout = setInterval(_timeout3.callback, _timeout3.time);
        _timeout3.paused = false;
      }
      for (var [, _callback4] of this.unpauseCallbacks) {
        _callback4();
      }
      this.unpauseCallbacks.clear();
    }
    for (var [tag, viewList] of this.viewLists) {
      viewList.pause(!!paused);
    }
    for (var i in this.tags) {
      if (Array.isArray(this.tags[i])) {
        for (var j in this.tags[i]) {
          this.tags[i][j].pause(!!paused);
        }
        continue;
      }
      this.tags[i].pause(!!paused);
    }
  }
  render(parentNode = null, insertPoint = null, outerView = null) {
    var {
      document
    } = globalThis.window;
    if (parentNode instanceof View) {
      parentNode = parentNode.firstNode.parentNode;
    }
    if (insertPoint instanceof View) {
      insertPoint = insertPoint.firstNode;
    }
    if (this.firstNode) {
      return this.reRender(parentNode, insertPoint, outerView);
    }
    this.dispatchEvent(new CustomEvent('render'));
    var templateIsFragment = typeof this.template === 'object' && typeof this.template.cloneNode === 'function';
    var templateParsed = templateIsFragment || View.templates.has(this.template);
    var subDoc;
    if (templateParsed) {
      if (templateIsFragment) {
        subDoc = this.template.cloneNode(true);
      } else {
        subDoc = View.templates.get(this.template).cloneNode(true);
      }
    } else {
      subDoc = document.createRange().createContextualFragment(this.template);
    }
    if (!templateParsed && !templateIsFragment) {
      View.templates.set(this.template, subDoc.cloneNode(true));
    }
    this.mainView || this.preRuleSet.apply(subDoc, this);
    this.mapTags(subDoc);
    this.mainView || this.ruleSet.apply(subDoc, this);
    if (globalThis.devMode === true) {
      this.firstNode = document.createComment(`Template ${this._id} Start`);
      this.lastNode = document.createComment(`Template ${this._id} End`);
    } else {
      this.firstNode = document.createTextNode('');
      this.lastNode = document.createTextNode('');
    }
    this.nodes.push(this.firstNode, ...Array.from(subDoc.childNodes), this.lastNode);
    this.postRender(parentNode);
    this.dispatchEvent(new CustomEvent('rendered'));
    if (!this.dispatchAttach()) {
      return;
    }
    if (parentNode) {
      if (insertPoint) {
        parentNode.insertBefore(this.firstNode, insertPoint);
        parentNode.insertBefore(this.lastNode, insertPoint);
      } else {
        parentNode.insertBefore(this.firstNode, null);
        parentNode.insertBefore(this.lastNode, null);
      }
      parentNode.insertBefore(subDoc, this.lastNode);
      var rootNode = parentNode.getRootNode();
      if (rootNode.isConnected) {
        this.attached(rootNode, parentNode);
        this.dispatchAttached(rootNode, parentNode, outerView);
      } else if (outerView) {
        var firstDomAttach = event => {
          var rootNode = parentNode.getRootNode();
          this.attached(rootNode, parentNode);
          this.dispatchAttached(rootNode, parentNode, outerView);
          outerView.removeEventListener('attached', firstDomAttach);
        };
        outerView.addEventListener('attached', firstDomAttach);
      }
    }
    this.renderComplete(this.nodes);
    return this.nodes;
  }
  dispatchAttach() {
    var {
      CustomEvent
    } = globalThis.window;
    return this.dispatchEvent(new CustomEvent('attach', {
      cancelable: true,
      target: this
    }));
  }
  dispatchAttached(rootNode, parentNode, view = undefined) {
    var {
      CustomEvent
    } = globalThis.window;
    this.dispatchEvent(new CustomEvent('attached', {
      detail: {
        view: view || this,
        node: parentNode,
        root: rootNode,
        mainView: this
      }
    }));
    this.dispatchDomAttached(view);
    for (var callback of this.nodesAttached.items()) {
      callback(rootNode, parentNode);
    }
  }
  dispatchDomAttached(view) {
    var {
      Node,
      CustomEvent
    } = globalThis.window;
    this.nodes.filter(n => n.nodeType !== Node.COMMENT_NODE).forEach(child => {
      if (!child.matches) {
        return;
      }
      child.dispatchEvent(new CustomEvent('cvDomAttached', {
        target: child,
        detail: {
          view: view || this,
          mainView: this
        }
      }));
      _Dom.Dom.mapTags(child, false, (tag, walker) => {
        if (!tag.matches) {
          return;
        }
        tag.dispatchEvent(new CustomEvent('cvDomAttached', {
          target: tag,
          detail: {
            view: view || this,
            mainView: this
          }
        }));
      });
    });
  }
  reRender(parentNode, insertPoint, outerView) {
    var {
      CustomEvent
    } = globalThis.window;
    var willReRender = this.dispatchEvent(new CustomEvent('reRender'), {
      cancelable: true,
      target: this,
      view: outerView
    });
    if (!willReRender) {
      return;
    }
    var subDoc = new DocumentFragment();
    if (this.firstNode.isConnected) {
      var detach = this.nodesDetached.items();
      for (var i in detach) {
        detach[i]();
      }
    }
    subDoc.append(...this.nodes);
    if (parentNode) {
      if (insertPoint) {
        parentNode.insertBefore(this.firstNode, insertPoint);
        parentNode.insertBefore(this.lastNode, insertPoint);
      } else {
        parentNode.insertBefore(this.firstNode, null);
        parentNode.insertBefore(this.lastNode, null);
      }
      parentNode.insertBefore(subDoc, this.lastNode);
      this.dispatchEvent(new CustomEvent('reRendered'), {
        cancelable: true,
        target: this,
        view: outerView
      });
      var rootNode = parentNode.getRootNode();
      if (rootNode.isConnected) {
        this.attached(rootNode, parentNode);
        this.dispatchAttached(rootNode, parentNode);
      }
    }
    return this.nodes;
  }
  mapTags(subDoc) {
    _Dom.Dom.mapTags(subDoc, false, (tag, walker) => {
      if (tag[dontParse]) {
        return;
      }
      if (tag.matches) {
        tag = this.mapInterpolatableTag(tag);
        tag = tag.matches('[cv-template]') && this.mapTemplateTag(tag) || tag;
        tag = tag.matches('[cv-slot]') && this.mapSlotTag(tag) || tag;
        tag = tag.matches('[cv-prerender]') && this.mapPrendererTag(tag) || tag;
        tag = tag.matches('[cv-link]') && this.mapLinkTag(tag) || tag;
        tag = tag.matches('[cv-attr]') && this.mapAttrTag(tag) || tag;
        tag = tag.matches('[cv-expand]') && this.mapExpandableTag(tag) || tag;
        tag = tag.matches('[cv-ref]') && this.mapRefTag(tag) || tag;
        tag = tag.matches('[cv-on]') && this.mapOnTag(tag) || tag;
        tag = tag.matches('[cv-each]') && this.mapEachTag(tag) || tag;
        tag = tag.matches('[cv-bind]') && this.mapBindTag(tag) || tag;
        tag = tag.matches('[cv-with]') && this.mapWithTag(tag) || tag;
        tag = tag.matches('[cv-if]') && this.mapIfTag(tag) || tag;
        tag = tag.matches('[cv-view]') && this.mapViewTag(tag) || tag;
      } else {
        tag = this.mapInterpolatableTag(tag);
      }
      if (tag !== walker.currentNode) {
        walker.currentNode = tag;
      }
    });
    this.postMapping.forEach(c => c());
  }
  mapExpandableTag(tag) {
    // const tagCompiler = this.compileExpandableTag(tag);
    // const newTag = tagCompiler(this);
    // tag.replaceWith(newTag);
    // return newTag;

    var existing = tag[expandBind];
    if (existing) {
      existing();
      tag[expandBind] = false;
    }
    var [proxy, expandProperty] = _Bindable.Bindable.resolve(this.args, tag.getAttribute('cv-expand'), true);
    tag.removeAttribute('cv-expand');
    if (!proxy[expandProperty]) {
      proxy[expandProperty] = {};
    }
    proxy[expandProperty] = _Bindable.Bindable.make(proxy[expandProperty]);
    this.onRemove(tag[expandBind] = proxy[expandProperty].bindTo((v, k, t, d, p) => {
      if (d || v === undefined) {
        tag.removeAttribute(k, v);
        return;
      }
      if (v === null) {
        tag.setAttribute(k, '');
        return;
      }
      tag.setAttribute(k, v);
    }));

    // let expandProperty = tag.getAttribute('cv-expand');
    // let expandArg = Bindable.makeBindable(
    // 	this.args[expandProperty] || {}
    // );

    // tag.removeAttribute('cv-expand');

    // for(let i in expandArg)
    // {
    // 	if(i === 'name' || i === 'type')
    // 	{
    // 		continue;
    // 	}

    // 	let debind = expandArg.bindTo(i, ((tag,i)=>(v)=>{
    // 		tag.setAttribute(i, v);
    // 	})(tag,i));

    // 	this.onRemove(()=>{
    // 		debind();
    // 		if(expandArg.isBound())
    // 		{
    // 			Bindable.clearBindings(expandArg);
    // 		}
    // 	});
    // }

    return tag;
  }

  // compileExpandableTag(sourceTag)
  // {
  // 	return (bindingView) => {

  // 		const tag = sourceTag.cloneNode(true);

  // 		let expandProperty = tag.getAttribute('cv-expand');
  // 		let expandArg = Bindable.make(
  // 			bindingView.args[expandProperty] || {}
  // 		);

  // 		tag.removeAttribute('cv-expand');

  // 		for(let i in expandArg)
  // 		{
  // 			if(i === 'name' || i === 'type')
  // 			{
  // 				continue;
  // 			}

  // 			let debind = expandArg.bindTo(i, ((tag,i)=>(v)=>{
  // 				tag.setAttribute(i, v);
  // 			})(tag,i));

  // 			bindingView.onRemove(()=>{
  // 				debind();
  // 				if(expandArg.isBound())
  // 				{
  // 					Bindable.clearBindings(expandArg);
  // 				}
  // 			});
  // 		}

  // 		return tag;
  // 	};
  // }

  mapAttrTag(tag) {
    var tagCompiler = this.compileAttrTag(tag);
    var newTag = tagCompiler(this);
    tag.replaceWith(newTag);
    return newTag;

    // let attrProperty = tag.getAttribute('cv-attr');

    // tag.removeAttribute('cv-attr');

    // let pairs = attrProperty.split(',');
    // let attrs = pairs.map((p) => p.split(':'));

    // for (let i in attrs)
    // {
    // 	let proxy        = this.args;
    // 	let bindProperty = attrs[i][1];
    // 	let property     = bindProperty;

    // 	if(bindProperty.match(/\./))
    // 	{
    // 		[proxy, property] = Bindable.resolve(
    // 			this.args
    // 			, bindProperty
    // 			, true
    // 		);
    // 	}

    // 	let attrib = attrs[i][0];

    // 	this.onRemove(proxy.bindTo(
    // 		property
    // 		, (v)=>{
    // 			if(v == null)
    // 			{
    // 				tag.setAttribute(attrib, '');
    // 				return;
    // 			}
    // 			tag.setAttribute(attrib, v);
    // 		}
    // 	));
    // }

    // return tag;
  }
  compileAttrTag(sourceTag) {
    var attrProperty = sourceTag.getAttribute('cv-attr');
    var pairs = attrProperty.split(/[,;]/);
    var attrs = pairs.map(p => p.split(':'));
    sourceTag.removeAttribute('cv-attr');
    return bindingView => {
      var tag = sourceTag.cloneNode(true);
      var _loop = function () {
        var bindProperty = attrs[i][1] || attrs[i][0];
        var [proxy, property] = _Bindable.Bindable.resolve(bindingView.args, bindProperty, true);
        var attrib = attrs[i][0];
        bindingView.onRemove(proxy.bindTo(property, (v, k, t, d) => {
          if (d || v === undefined) {
            tag.removeAttribute(attrib, v);
            return;
          }
          if (v === null) {
            tag.setAttribute(attrib, '');
            return;
          }
          tag.setAttribute(attrib, v);
        }));
      };
      for (var i in attrs) {
        _loop();
      }
      return tag;
    };
  }
  mapInterpolatableTag(tag) {
    var _this = this;
    var regex = this.interpolateRegex;
    var {
      Node,
      document
    } = globalThis.window;
    if (tag.nodeType === Node.TEXT_NODE) {
      var original = tag.nodeValue;
      if (!this.interpolatable(original)) {
        return tag;
      }
      var header = 0;
      var match;
      var _loop2 = function () {
          var bindProperty = match[2];
          var unsafeHtml = false;
          var unsafeView = false;
          var propertySplit = bindProperty.split('|');
          var transformer = false;
          if (propertySplit.length > 1) {
            transformer = _this.stringTransformer(propertySplit.slice(1));
            bindProperty = propertySplit[0];
          }
          if (bindProperty.substr(0, 2) === '$$') {
            unsafeHtml = true;
            unsafeView = true;
            bindProperty = bindProperty.substr(2);
          }
          if (bindProperty.substr(0, 1) === '$') {
            unsafeHtml = true;
            bindProperty = bindProperty.substr(1);
          }
          if (bindProperty.substr(0, 3) === '000') {
            expand = true;
            bindProperty = bindProperty.substr(3);
            return 0; // continue
          }
          var staticPrefix = original.substring(header, match.index);
          header = match.index + match[1].length;
          var staticNode = document.createTextNode(staticPrefix);
          staticNode[dontParse] = true;
          tag.parentNode.insertBefore(staticNode, tag);
          var dynamicNode;
          if (unsafeHtml) {
            dynamicNode = document.createElement('div');
          } else {
            dynamicNode = document.createTextNode('');
          }
          dynamicNode[dontParse] = true;
          var proxy = _this.args;
          var property = bindProperty;
          if (bindProperty.match(/\./)) {
            [proxy, property] = _Bindable.Bindable.resolve(_this.args, bindProperty, true);
          }
          tag.parentNode.insertBefore(dynamicNode, tag);
          if (typeof proxy !== 'object') {
            return 1; // break
          }
          proxy = _Bindable.Bindable.make(proxy);
          var debind = proxy.bindTo(property, (v, k, t) => {
            if (t[k] !== v && (t[k] instanceof View || t[k] instanceof Node || t[k] instanceof _Tag.Tag)) {
              if (!t[k].preserve) {
                t[k].remove();
              }
            }
            if (unsafeView && !(v instanceof View)) {
              var unsafeTemplate = v !== null && v !== void 0 ? v : '';
              v = new View(_this.args, _this);
              v.template = unsafeTemplate;
            }
            if (transformer) {
              v = transformer(v);
            }
            if (v instanceof View) {
              dynamicNode.nodeValue = '';
              v[_EventTargetMixin.EventTargetMixin.Parent] = _this;
              v.render(tag.parentNode, dynamicNode, _this);
              var cleanup = () => {
                if (!v.preserve) {
                  v.remove();
                }
              };
              _this.onRemove(cleanup);
              v.onRemove(() => _this._onRemove.remove(cleanup));
            } else if (v instanceof Node) {
              dynamicNode.nodeValue = '';
              tag.parentNode.insertBefore(v, dynamicNode);
              _this.onRemove(() => v.remove());
            } else if (v instanceof _Tag.Tag) {
              dynamicNode.nodeValue = '';
              if (v.node) {
                tag.parentNode.insertBefore(v.node, dynamicNode);
                _this.onRemove(() => v.remove());
              } else {
                v.remove();
              }
            } else {
              if (v instanceof Object && v.__toString instanceof Function) {
                v = v.__toString();
              }
              if (unsafeHtml) {
                dynamicNode.innerHTML = v;
              } else {
                dynamicNode.nodeValue = v;
              }
            }
            dynamicNode[dontParse] = true;
          });
          _this.onRemove(debind);
        },
        _ret;
      while (match = regex.exec(original)) {
        _ret = _loop2();
        if (_ret === 0) continue;
        if (_ret === 1) break;
      }
      var staticSuffix = original.substring(header);
      var staticNode = document.createTextNode(staticSuffix);
      staticNode[dontParse] = true;
      tag.parentNode.insertBefore(staticNode, tag);
      tag.nodeValue = '';
    } else if (tag.nodeType === Node.ELEMENT_NODE) {
      var _loop3 = function () {
        if (!_this.interpolatable(tag.attributes[i].value)) {
          return 1; // continue
        }
        var header = 0;
        var match;
        var original = tag.attributes[i].value;
        var attribute = tag.attributes[i];
        var bindProperties = {};
        var segments = [];
        while (match = regex.exec(original)) {
          segments.push(original.substring(header, match.index));
          if (!bindProperties[match[2]]) {
            bindProperties[match[2]] = [];
          }
          bindProperties[match[2]].push(segments.length);
          segments.push(match[1]);
          header = match.index + match[1].length;
        }
        segments.push(original.substring(header));
        var _loop4 = function () {
          var proxy = _this.args;
          var property = j;
          var propertySplit = j.split('|');
          var transformer = false;
          var longProperty = j;
          if (propertySplit.length > 1) {
            transformer = _this.stringTransformer(propertySplit.slice(1));
            property = propertySplit[0];
          }
          if (property.match(/\./)) {
            [proxy, property] = _Bindable.Bindable.resolve(_this.args, property, true);
          }
          var matching = [];
          var bindProperty = j;
          var matchingSegments = bindProperties[longProperty];
          _this.onRemove(proxy.bindTo(property, (v, k, t, d) => {
            if (transformer) {
              v = transformer(v);
            }
            for (var _i in bindProperties) {
              for (var _j in bindProperties[longProperty]) {
                segments[bindProperties[longProperty][_j]] = t[_i];
                if (k === property) {
                  segments[bindProperties[longProperty][_j]] = v;
                }
              }
            }
            if (!_this.paused) {
              tag.setAttribute(attribute.name, segments.join(''));
            } else {
              _this.unpauseCallbacks.set(attribute, () => tag.setAttribute(attribute.name, segments.join('')));
            }
          }));
        };
        for (var j in bindProperties) {
          _loop4();
        }
      };
      for (var i = 0; i < tag.attributes.length; i++) {
        if (_loop3()) continue;
      }
    }
    return tag;
  }
  mapRefTag(tag) {
    var refAttr = tag.getAttribute('cv-ref');
    var [refProp, refClassname = null, refKey = null] = refAttr.split(':');
    var refClass = _Tag.Tag;
    if (refClassname) {
      refClass = this.stringToClass(refClassname);
    }
    tag.removeAttribute('cv-ref');
    Object.defineProperty(tag, '___tag___', {
      enumerable: false,
      writable: true
    });
    this.onRemove(() => {
      tag.___tag___ = null;
      tag.remove();
    });
    var parent = this;
    var direct = this;
    if (this.viewList) {
      parent = this.viewList.parent;
      // if(!this.viewList.parent.tags[refProp])
      // {
      // 	this.viewList.parent.tags[refProp] = [];
      // }

      // let refKeyVal = this.args[refKey];

      // this.viewList.parent.tags[refProp][refKeyVal] = new refClass(
      // 	tag, this, refProp, refKeyVal
      // );
    }
    // else
    // {
    // 	this.tags[refProp] = new refClass(
    // 		tag, this, refProp
    // 	);
    // }

    var tagObject = new refClass(tag, this, refProp, undefined, direct);
    tag.___tag___ = tagObject;
    this.tags[refProp] = tagObject;
    while (parent) {
      var refKeyVal = this.args[refKey];
      if (refKeyVal !== undefined) {
        if (!parent.tags[refProp]) {
          parent.tags[refProp] = [];
        }
        parent.tags[refProp][refKeyVal] = tagObject;
      } else {
        parent.tags[refProp] = tagObject;
      }
      if (!parent.parent) {
        break;
      }
      parent = parent.parent;
    }
    return tag;
  }
  mapBindTag(tag) {
    var bindArg = tag.getAttribute('cv-bind');
    var proxy = this.args;
    var property = bindArg;
    var top = null;
    if (bindArg.match(/\./)) {
      [proxy, property, top] = _Bindable.Bindable.resolve(this.args, bindArg, true);
    }
    if (proxy !== this.args) {
      this.subBindings[bindArg] = this.subBindings[bindArg] || [];
      this.onRemove(this.args.bindTo(top, () => {
        while (this.subBindings.length) {
          this.subBindings.shift()();
        }
      }));
    }
    var unsafeHtml = false;
    if (property.substr(0, 1) === '$') {
      property = property.substr(1);
      unsafeHtml = true;
    }
    var autoEventStarted = false;
    var debind = proxy.bindTo(property, (v, k, t, d, p) => {
      if ((p instanceof View || p instanceof Node || p instanceof _Tag.Tag) && p !== v) {
        p.remove();
      }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag.tagName)) {
        var _type = tag.getAttribute('type');
        if (_type && _type.toLowerCase() === 'checkbox') {
          tag.checked = !!v;
        } else if (_type && _type.toLowerCase() === 'radio') {
          tag.checked = v == tag.value;
        } else if (_type !== 'file') {
          if (tag.tagName === 'SELECT') {
            var selectOption = () => {
              for (var i = 0; i < tag.options.length; i++) {
                var option = tag.options[i];
                if (option.value == v) {
                  tag.selectedIndex = i;
                }
              }
            };
            selectOption();
            this.nodesAttached.add(selectOption);
          } else {
            tag.value = v == null ? '' : v;
          }
        }
        if (autoEventStarted) {
          tag.dispatchEvent(new CustomEvent('cvAutoChanged', {
            bubbles: true
          }));
        }
        autoEventStarted = true;
      } else {
        if (v instanceof View) {
          for (var node of tag.childNodes) {
            node.remove();
          }
          v[_EventTargetMixin.EventTargetMixin.Parent] = this;
          v.render(tag, null, this);
        } else if (v instanceof Node) {
          tag.insert(v);
        } else if (v instanceof _Tag.Tag) {
          tag.append(v.node);
        } else if (unsafeHtml) {
          if (tag.innerHTML !== v) {
            v = String(v);
            if (tag.innerHTML === v.substring(0, tag.innerHTML.length)) {
              tag.innerHTML += v.substring(tag.innerHTML.length);
            } else {
              for (var _node of tag.childNodes) {
                _node.remove();
              }
              tag.innerHTML = v;
            }
            _Dom.Dom.mapTags(tag, false, t => t[dontParse] = true);
          }
        } else {
          if (tag.textContent !== v) {
            for (var _node2 of tag.childNodes) {
              _node2.remove();
            }
            tag.textContent = v;
          }
        }
      }
    });
    if (proxy !== this.args) {
      this.subBindings[bindArg].push(debind);
    }
    this.onRemove(debind);
    var type = tag.getAttribute('type');
    var multi = tag.getAttribute('multiple');
    var inputListener = event => {
      if (event.target !== tag) {
        return;
      }
      if (type && type.toLowerCase() === 'checkbox') {
        if (tag.checked) {
          proxy[property] = event.target.getAttribute('value');
        } else {
          proxy[property] = false;
        }
      } else if (event.target.matches('[contenteditable=true]')) {
        proxy[property] = event.target.innerHTML;
      } else if (type === 'file' && multi) {
        var files = Array.from(event.target.files);
        var current = proxy[property] || _Bindable.Bindable.onDeck(proxy, property);
        if (!current || !files.length) {
          proxy[property] = files;
        } else {
          var _loop5 = function (i) {
            if (files[i] !== current[i]) {
              files[i].toJSON = () => {
                return {
                  name: file[i].name,
                  size: file[i].size,
                  type: file[i].type,
                  date: file[i].lastModified
                };
              };
              current[i] = files[i];
              return 1; // break
            }
          };
          for (var i in files) {
            if (_loop5(i)) break;
          }
        }
      } else if (type === 'file' && !multi && event.target.files.length) {
        var _file = event.target.files.item(0);
        _file.toJSON = () => {
          return {
            name: _file.name,
            size: _file.size,
            type: _file.type,
            date: _file.lastModified
          };
        };
        proxy[property] = _file;
      } else {
        proxy[property] = event.target.value;
      }
    };
    if (type === 'file' || type === 'radio') {
      tag.addEventListener('change', inputListener);
    } else {
      tag.addEventListener('input', inputListener);
      tag.addEventListener('change', inputListener);
      tag.addEventListener('value-changed', inputListener);
    }
    this.onRemove(() => {
      if (type === 'file' || type === 'radio') {
        tag.removeEventListener('change', inputListener);
      } else {
        tag.removeEventListener('input', inputListener);
        tag.removeEventListener('change', inputListener);
        tag.removeEventListener('value-changed', inputListener);
      }
    });
    tag.removeAttribute('cv-bind');
    return tag;
  }
  mapOnTag(tag) {
    var referents = String(tag.getAttribute('cv-on'));
    referents.split(';').map(a => a.split(':')).forEach(a => {
      a = a.map(a => a.trim());
      var argLen = a.length;
      var eventName = String(a.shift()).trim();
      var callbackName = String(a.shift() || eventName).trim();
      var eventFlags = String(a.shift() || '').trim();
      var argList = [];
      var groups = /(\w+)(?:\(([$\w\s-'",]+)\))?/.exec(callbackName);
      if (groups) {
        callbackName = groups[1].replace(/(^[\s\n]+|[\s\n]+$)/, '');
        if (groups[2]) {
          argList = groups[2].split(',').map(s => s.trim());
        }
      }
      if (!argList.length) {
        argList.push('$event');
      }
      if (!eventName || argLen === 1) {
        eventName = callbackName;
      }
      var eventListener = event => {
        var eventMethod;
        var parent = this;
        var _loop6 = function () {
            var controller = parent.controller;
            if (typeof controller[callbackName] === 'function') {
              eventMethod = (...args) => {
                controller[callbackName](...args);
              };
              return 0; // break
            } else if (typeof parent[callbackName] === 'function') {
              eventMethod = (...args) => {
                parent[callbackName](...args);
              };
              return 0; // break
            }
            if (parent.parent) {
              parent = parent.parent;
            } else {
              return 0; // break
            }
          },
          _ret2;
        while (parent) {
          _ret2 = _loop6();
          if (_ret2 === 0) break;
        }
        var argRefs = argList.map(arg => {
          var match;
          if (Number(arg) == arg) {
            return arg;
          } else if (arg === 'event' || arg === '$event') {
            return event;
          } else if (arg === '$view') {
            return parent;
          } else if (arg === '$controller') {
            return controller;
          } else if (arg === '$tag') {
            return tag;
          } else if (arg === '$parent') {
            return this.parent;
          } else if (arg === '$subview') {
            return this;
          } else if (arg in this.args) {
            return this.args[arg];
          } else if (match = /^['"]([\w-]+?)["']$/.exec(arg)) {
            return match[1];
          }
        });
        if (!(typeof eventMethod === 'function')) {
          throw new Error(`${callbackName} is not defined on View object.` + "\n" + `Tag:` + "\n" + `${tag.outerHTML}`);
        }
        eventMethod(...argRefs);
      };
      var eventOptions = {};
      if (eventFlags.includes('p')) {
        eventOptions.passive = true;
      } else if (eventFlags.includes('P')) {
        eventOptions.passive = false;
      }
      if (eventFlags.includes('c')) {
        eventOptions.capture = true;
      } else if (eventFlags.includes('C')) {
        eventOptions.capture = false;
      }
      if (eventFlags.includes('o')) {
        eventOptions.once = true;
      } else if (eventFlags.includes('O')) {
        eventOptions.once = false;
      }
      switch (eventName) {
        case '_init':
          eventListener();
          break;
        case '_attach':
          this.nodesAttached.add(eventListener);
          break;
        case '_detach':
          this.nodesDetached.add(eventListener);
          break;
        default:
          tag.addEventListener(eventName, eventListener, eventOptions);
          this.onRemove(() => {
            tag.removeEventListener(eventName, eventListener, eventOptions);
          });
          break;
      }
      return [eventName, callbackName, argList];
    });
    tag.removeAttribute('cv-on');
    return tag;
  }
  mapLinkTag(tag) {
    // const tagCompiler = this.compileLinkTag(tag);

    // const newTag = tagCompiler(this);

    // tag.replaceWith(newTag);

    // return newTag;

    var linkAttr = tag.getAttribute('cv-link');
    tag.setAttribute('href', linkAttr);
    var linkClick = event => {
      event.preventDefault();
      if (linkAttr.substring(0, 4) === 'http' || linkAttr.substring(0, 2) === '//') {
        globalThis.open(tag.getAttribute('href', linkAttr));
        return;
      }
      _Router.Router.go(tag.getAttribute('href'));
    };
    tag.addEventListener('click', linkClick);
    this.onRemove(((tag, eventListener) => () => {
      tag.removeEventListener('click', eventListener);
      tag = undefined;
      eventListener = undefined;
    })(tag, linkClick));
    tag.removeAttribute('cv-link');
    return tag;
  }

  // compileLinkTag(sourceTag)
  // {
  // 	const linkAttr = sourceTag.getAttribute('cv-link');
  // 	sourceTag.removeAttribute('cv-link');
  // 	return (bindingView) => {
  // 		const tag = sourceTag.cloneNode(true);
  // 		tag.setAttribute('href', linkAttr);
  // 		return tag;
  // 	};
  // }

  mapPrendererTag(tag) {
    var prerenderAttr = tag.getAttribute('cv-prerender');
    var prerendering = globalThis.prerenderer || navigator.userAgent.match(/prerender/i);
    tag.removeAttribute('cv-prerender');
    if (prerendering) {
      globalThis.prerenderer = globalThis.prerenderer || true;
    }
    if (prerenderAttr === 'never' && prerendering || prerenderAttr === 'only' && !prerendering) {
      this.postMapping.add(() => tag.parentNode.removeChild(tag));
    }
    return tag;
  }
  mapWithTag(tag) {
    var _this2 = this;
    var withAttr = tag.getAttribute('cv-with');
    var carryAttr = tag.getAttribute('cv-carry');
    var viewAttr = tag.getAttribute('cv-view');
    tag.removeAttribute('cv-with');
    tag.removeAttribute('cv-carry');
    tag.removeAttribute('cv-view');
    var viewClass = viewAttr ? this.stringToClass(viewAttr) : View;
    var subTemplate = new DocumentFragment();
    [...tag.childNodes].forEach(n => subTemplate.appendChild(n));
    var carryProps = [];
    if (carryAttr) {
      carryProps = carryAttr.split(',').map(s => s.trim());
    }
    var debind = this.args.bindTo(withAttr, (v, k, t, d) => {
      if (this.withViews.has(tag)) {
        this.withViews.delete(tag);
      }
      while (tag.firstChild) {
        tag.removeChild(tag.firstChild);
      }
      var view = new viewClass({}, this);
      this.onRemove((view => () => {
        view.remove();
      })(view));
      view.template = subTemplate;
      var _loop7 = function () {
        var debind = _this2.args.bindTo(carryProps[i], (v, k) => {
          view.args[k] = v;
        });
        view.onRemove(debind);
        _this2.onRemove(() => {
          debind();
          view.remove();
        });
      };
      for (var i in carryProps) {
        _loop7();
      }
      var _loop8 = function () {
        if (typeof v !== 'object') {
          return 1; // continue
        }
        v = _Bindable.Bindable.make(v);
        var debind = v.bindTo(_i2, (vv, kk, tt, dd) => {
          if (!dd) {
            view.args[kk] = vv;
          } else if (kk in view.args) {
            delete view.args[kk];
          }
        });
        var debindUp = view.args.bindTo(_i2, (vv, kk, tt, dd) => {
          if (!dd) {
            v[kk] = vv;
          } else if (kk in v) {
            delete v[kk];
          }
        });
        _this2.onRemove(() => {
          debind();
          if (!v.isBound()) {
            _Bindable.Bindable.clearBindings(v);
          }
          view.remove();
        });
        view.onRemove(() => {
          debind();
          if (!v.isBound()) {
            _Bindable.Bindable.clearBindings(v);
          }
        });
      };
      for (var _i2 in v) {
        if (_loop8()) continue;
      }
      view.render(tag, null, this);
      this.withViews.set(tag, view);
    });
    this.onRemove(() => {
      this.withViews.delete(tag);
      debind();
    });
    return tag;
  }
  mapViewTag(tag) {
    var viewAttr = tag.getAttribute('cv-view');
    tag.removeAttribute('cv-view');
    var subTemplate = new DocumentFragment();
    [...tag.childNodes].forEach(n => subTemplate.appendChild(n));
    var parts = viewAttr.split(':');
    var viewName = parts.shift();
    var viewClass = parts.length ? this.stringToClass(parts[0]) : View;
    var view = new viewClass(this.args, this);
    this.views.set(tag, view);
    this.views.set(viewName, view);
    this.onRemove(() => {
      view.remove();
      this.views.delete(tag);
      this.views.delete(viewName);
    });
    view.template = subTemplate;
    view.render(tag, null, this);
    return tag;
  }
  mapEachTag(tag) {
    var eachAttr = tag.getAttribute('cv-each');
    var viewAttr = tag.getAttribute('cv-view');
    tag.removeAttribute('cv-each');
    tag.removeAttribute('cv-view');
    var viewClass = viewAttr ? this.stringToClass(viewAttr) : View;
    var subTemplate = new DocumentFragment();
    [...tag.childNodes].forEach(n => subTemplate.appendChild(n));
    var [eachProp, asProp, keyProp] = eachAttr.split(':');
    var proxy = this.args;
    var property = eachProp;
    if (eachProp.match(/\./)) {
      [proxy, property] = _Bindable.Bindable.resolve(this.args, eachProp, true);
    }
    var debind = proxy.bindTo(property, (v, k, t, d, p) => {
      if (v instanceof _Bag.Bag) {
        v = v.list;
      }
      if (this.viewLists.has(tag)) {
        this.viewLists.get(tag).remove();
      }
      var viewList = new _ViewList.ViewList(subTemplate, asProp, v, this, keyProp, viewClass);
      var viewListRemover = () => viewList.remove();
      this.onRemove(viewListRemover);
      viewList.onRemove(() => this._onRemove.remove(viewListRemover));
      var debindA = this.args.bindTo((v, k, t, d) => {
        if (k === '_id') {
          return;
        }
        if (!d) {
          viewList.subArgs[k] = v;
        } else {
          if (k in viewList.subArgs) {
            delete viewList.subArgs[k];
          }
        }
      });
      var debindB = viewList.args.bindTo((v, k, t, d, p) => {
        if (k === '_id' || k === 'value' || String(k).substring(0, 3) === '___') {
          return;
        }
        if (!d) {
          if (k in this.args) {
            this.args[k] = v;
          }
        } else {
          delete this.args[k];
        }
      });
      viewList.onRemove(debindA);
      viewList.onRemove(debindB);
      this.onRemove(debindA);
      this.onRemove(debindB);
      while (tag.firstChild) {
        tag.removeChild(tag.firstChild);
      }
      this.viewLists.set(tag, viewList);
      viewList.render(tag, null, this);
      if (tag.tagName === 'SELECT') {
        viewList.reRender();
      }
    });
    this.onRemove(debind);
    return tag;
  }
  mapIfTag(tag) {
    var sourceTag = tag;
    var viewProperty = sourceTag.getAttribute('cv-view');
    var ifProperty = sourceTag.getAttribute('cv-if');
    var isProperty = sourceTag.getAttribute('cv-is');
    var inverted = false;
    var defined = false;
    sourceTag.removeAttribute('cv-view');
    sourceTag.removeAttribute('cv-if');
    sourceTag.removeAttribute('cv-is');
    var viewClass = viewProperty ? this.stringToClass(viewProperty) : View;
    if (ifProperty.substr(0, 1) === '!') {
      ifProperty = ifProperty.substr(1);
      inverted = true;
    }
    if (ifProperty.substr(0, 1) === '?') {
      ifProperty = ifProperty.substr(1);
      defined = true;
    }
    var subTemplate = new DocumentFragment();
    [...sourceTag.childNodes].forEach(n => subTemplate.appendChild(n));
    var bindingView = this;
    var ifDoc = new DocumentFragment();

    // let view = new viewClass(Object.assign({}, this.args), bindingView);
    var view = new viewClass(this.args, bindingView);
    view.tags.bindTo((v, k) => this.tags[k] = v, {
      removeWith: this
    });
    view.template = subTemplate;
    var proxy = bindingView.args;
    var property = ifProperty;
    if (ifProperty.match(/\./)) {
      [proxy, property] = _Bindable.Bindable.resolve(bindingView.args, ifProperty, true);
    }
    view.render(ifDoc, null, this);
    var propertyDebind = proxy.bindTo(property, (v, k) => {
      var o = v;
      if (defined) {
        v = v !== null && v !== undefined;
      }
      if (v instanceof _Bag.Bag) {
        v = v.list;
      }
      if (Array.isArray(v)) {
        v = !!v.length;
      }
      if (isProperty !== null) {
        v = o == isProperty;
      }
      if (inverted) {
        v = !v;
      }
      if (v) {
        tag.appendChild(ifDoc);
        [...ifDoc.childNodes].forEach(node => _Dom.Dom.mapTags(node, false, (tag, walker) => {
          if (!tag.matches) {
            return;
          }
          tag.dispatchEvent(new CustomEvent('cvDomAttached', {
            target: tag,
            detail: {
              view: view || this,
              mainView: this
            }
          }));
        }));
      } else {
        view.nodes.forEach(n => ifDoc.appendChild(n));
        _Dom.Dom.mapTags(ifDoc, false, (tag, walker) => {
          if (!tag.matches) {
            return;
          }
          new CustomEvent('cvDomDetached', {
            target: tag,
            detail: {
              view: view || this,
              mainView: this
            }
          });
        });
      }
    }, {
      children: Array.isArray(proxy[property])
    });

    // const propertyDebind = this.args.bindChain(property, onUpdate);

    bindingView.onRemove(propertyDebind);

    // const debindA = this.args.bindTo((v,k,t,d) => {
    // 	if(k === '_id')
    // 	{
    // 		return;
    // 	}

    // 	if(!d)
    // 	{
    // 		view.args[k] = v;
    // 	}
    // 	else if(k in view.args)
    // 	{
    // 		delete view.args[k];
    // 	}

    // });

    // const debindB = view.args.bindTo((v,k,t,d,p) => {
    // 	if(k === '_id' || String(k).substring(0,3) === '___')
    // 	{
    // 		return;
    // 	}

    // 	if(k in this.args)
    // 	{
    // 		if(!d)
    // 		{
    // 			this.args[k] = v;
    // 		}
    // 		else
    // 		{
    // 			delete this.args[k];
    // 		}
    // 	}
    // });

    var viewDebind = () => {
      propertyDebind();
      // debindA();
      // debindB();
      bindingView._onRemove.remove(propertyDebind);
      // bindingView._onRemove.remove(bindableDebind);
    };
    bindingView.onRemove(viewDebind);
    this.onRemove(() => {
      // debindA();
      // debindB();
      view.remove();
      if (bindingView !== this) {
        bindingView.remove();
      }
    });
    return tag;
  }

  // compileIfTag(sourceTag)
  // {
  // 	let ifProperty = sourceTag.getAttribute('cv-if');
  // 	let inverted   = false;

  // 	sourceTag.removeAttribute('cv-if');

  // 	if(ifProperty.substr(0, 1) === '!')
  // 	{
  // 		ifProperty = ifProperty.substr(1);
  // 		inverted   = true;
  // 	}

  // 	const subTemplate = new DocumentFragment;

  // 	[...sourceTag.childNodes].forEach(
  // 		n => subTemplate.appendChild(n.cloneNode(true))
  // 	);

  // 	return (bindingView) => {

  // 		const tag = sourceTag.cloneNode();

  // 		const ifDoc = new DocumentFragment;

  // 		let view = new View({}, bindingView);

  // 		view.template = subTemplate;
  // 		// view.parent   = bindingView;

  // 		bindingView.syncBind(view);

  // 		let proxy    = bindingView.args;
  // 		let property = ifProperty;

  // 		if(ifProperty.match(/\./))
  // 		{
  // 			[proxy, property] = Bindable.resolve(
  // 				bindingView.args
  // 				, ifProperty
  // 				, true
  // 			);
  // 		}

  // 		let hasRendered = false;

  // 		const propertyDebind = proxy.bindTo(property, (v,k) => {

  // 			if(!hasRendered)
  // 			{
  // 				const renderDoc = (bindingView.args[property] || inverted)
  // 					? tag : ifDoc;

  // 				view.render(renderDoc);

  // 				hasRendered = true;

  // 				return;
  // 			}

  // 			if(Array.isArray(v))
  // 			{
  // 				v = !!v.length;
  // 			}

  // 			if(inverted)
  // 			{
  // 				v = !v;
  // 			}

  // 			if(v)
  // 			{
  // 				tag.appendChild(ifDoc);
  // 			}
  // 			else
  // 			{
  // 				view.nodes.forEach(n=>ifDoc.appendChild(n));
  // 			}

  // 		});

  // 		// let cleaner = bindingView;

  // 		// while(cleaner.parent)
  // 		// {
  // 		// 	cleaner = cleaner.parent;
  // 		// }

  // 		bindingView.onRemove(propertyDebind);

  // 		let bindableDebind = () => {

  // 			if(!proxy.isBound())
  // 			{
  // 				Bindable.clearBindings(proxy);
  // 			}

  // 		};

  // 		let viewDebind = ()=>{
  // 			propertyDebind();
  // 			bindableDebind();
  // 			bindingView._onRemove.remove(propertyDebind);
  // 			bindingView._onRemove.remove(bindableDebind);
  // 		};

  // 		view.onRemove(viewDebind);

  // 		return tag;
  // 	};
  // }

  mapTemplateTag(tag) {
    // const templateName = tag.getAttribute('cv-template');

    // tag.removeAttribute('cv-template');

    // this.templates[ templateName ] = tag.tagName === 'TEMPLATE'
    // 	? tag.cloneNode(true).content
    // 	: new DocumentFragment(tag.innerHTML);

    var templateName = tag.getAttribute('cv-template');
    tag.removeAttribute('cv-template');
    var source = tag.innerHTML;
    if (!View.templates.has(source)) {
      View.templates.set(source, document.createRange().createContextualFragment(tag.innerHTML));
    }
    this.templates[templateName] = View.templates.get(source);
    this.postMapping.add(() => tag.remove());
    return tag;
  }
  mapSlotTag(tag) {
    var templateName = tag.getAttribute('cv-slot');
    var template = this.templates[templateName];
    if (!template) {
      var parent = this;
      while (parent) {
        template = parent.templates[templateName];
        if (template) {
          break;
        }
        parent = parent.parent;
      }
      if (!template) {
        console.error(`Template ${templateName} not found.`);
        return;
      }
    }
    tag.removeAttribute('cv-slot');
    while (tag.firstChild) {
      tag.firstChild.remove();
    }
    if (typeof template === 'string') {
      if (!View.templates.has(template)) {
        View.templates.set(template, document.createRange().createContextualFragment(template));
      }
      template = View.templates.get(template);
    }
    tag.appendChild(template.cloneNode(true));
    return tag;
  }

  // syncBind(subView)
  // {
  // 	let debindA = this.args.bindTo((v,k,t,d)=>{
  // 		if(k === '_id')
  // 		{
  // 			return;
  // 		}

  // 		if(subView.args[k] !== v)
  // 		{
  // 			subView.args[k] = v;
  // 		}
  // 	});

  // 	let debindB = subView.args.bindTo((v,k,t,d,p)=>{

  // 		if(k === '_id')
  // 		{
  // 			return;
  // 		}

  // 		let newRef = v;
  // 		let oldRef = p;

  // 		if(newRef instanceof View)
  // 		{
  // 			newRef = newRef.___ref___;
  // 		}

  // 		if(oldRef instanceof View)
  // 		{
  // 			oldRef = oldRef.___ref___;
  // 		}

  // 		if(newRef !== oldRef && oldRef instanceof View)
  // 		{
  // 			p.remove();
  // 		}

  // 		if(k in this.args)
  // 		{
  // 			this.args[k] = v;
  // 		}

  // 	});

  // 	this.onRemove(debindA);
  // 	this.onRemove(debindB);

  // 	subView.onRemove(()=>{
  // 		this._onRemove.remove(debindA);
  // 		this._onRemove.remove(debindB);
  // 	});
  // }

  postRender(parentNode) {}
  attached(parentNode) {}
  interpolatable(str) {
    return !!String(str).match(this.interpolateRegex);
  }
  static uuid() {
    return new _Uuid.Uuid();
  }
  remove(now = false) {
    if (!this.dispatchEvent(new CustomEvent('remove', {
      detail: {
        view: this
      },
      cancelable: true
    }))) {
      return;
    }
    var remover = () => {
      for (var i in this.tags) {
        if (Array.isArray(this.tags[i])) {
          this.tags[i] && this.tags[i].forEach(t => t.remove());
          this.tags[i].splice(0);
        } else {
          this.tags[i] && this.tags[i].remove();
          this.tags[i] = undefined;
        }
      }
      for (var _i3 in this.nodes) {
        this.nodes[_i3] && this.nodes[_i3].dispatchEvent(new Event('cvDomDetached'));
        this.nodes[_i3] && this.nodes[_i3].remove();
        this.nodes[_i3] = undefined;
      }
      this.nodes.splice(0);
      this.firstNode = this.lastNode = undefined;
    };
    if (now) {
      remover();
    } else {
      requestAnimationFrame(remover);
    }
    var callbacks = this._onRemove.items();
    for (var callback of callbacks) {
      callback();
      this._onRemove.remove(callback);
    }
    for (var cleanup of this.cleanup) {
      cleanup && cleanup();
    }
    this.cleanup.length = 0;
    for (var [tag, viewList] of this.viewLists) {
      viewList.remove();
    }
    this.viewLists.clear();
    for (var [_callback5, timeout] of this.timeouts) {
      clearTimeout(timeout.timeout);
      this.timeouts.delete(timeout.timeout);
    }
    for (var interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.length = 0;
    for (var frame of this.frames) {
      frame();
    }
    this.frames.length = 0;
    this.preRuleSet.purge();
    this.ruleSet.purge();
    this.removed = true;
    this.dispatchEvent(new CustomEvent('removed', {
      detail: {
        view: this
      },
      cancelable: true
    }));
  }
  findTag(selector) {
    for (var i in this.nodes) {
      var result = void 0;
      if (!this.nodes[i].querySelector) {
        continue;
      }
      if (this.nodes[i].matches(selector)) {
        return new _Tag.Tag(this.nodes[i], this, undefined, undefined, this);
      }
      if (result = this.nodes[i].querySelector(selector)) {
        return new _Tag.Tag(result, this, undefined, undefined, this);
      }
    }
  }
  findTags(selector) {
    var topLevel = this.nodes.filter(n => n.matches && n.matches(selector));
    var subLevel = this.nodes.filter(n => n.querySelectorAll).map(n => [...n.querySelectorAll(selector)]).flat().map(n => new _Tag.Tag(n, this, undefined, undefined, this)) || [];
    return topLevel.concat(subLevel);
  }
  onRemove(callback) {
    if (callback instanceof Event) {
      return;
    }
    this._onRemove.add(callback);
  }
  update() {}
  beforeUpdate(args) {}
  afterUpdate(args) {}
  stringTransformer(methods) {
    return x => {
      for (var m in methods) {
        var parent = this;
        var method = methods[m];
        while (parent && !parent[method]) {
          parent = parent.parent;
        }
        if (!parent) {
          return;
        }
        x = parent[methods[m]](x);
      }
      return x;
    };
  }
  stringToClass(refClassname) {
    if (View.refClasses.has(refClassname)) {
      return View.refClasses.get(refClassname);
    }
    var refClassSplit = refClassname.split('/');
    var refShortClass = refClassSplit[refClassSplit.length - 1];
    var refClass = require(refClassname);
    View.refClasses.set(refClassname, refClass[refShortClass]);
    return refClass[refShortClass];
  }
  preventParsing(node) {
    node[dontParse] = true;
  }
  toString() {
    return this.nodes.map(n => n.outerHTML).join(' ');
  }
  listen(node, eventName, callback, options) {
    if (typeof node === 'string') {
      options = callback;
      callback = eventName;
      eventName = node;
      node = this;
    }
    if (node instanceof View) {
      return this.listen(node.nodes, eventName, callback, options);
    }
    if (Array.isArray(node)) {
      return node.map(n => this.listen(n, eventName, callback, options));
      // .forEach(r => r());
    }
    if (node instanceof _Tag.Tag) {
      return this.listen(node.element, eventName, callback, options);
    }
    node.addEventListener(eventName, callback, options);
    var remove = () => node.removeEventListener(eventName, callback, options);
    var remover = () => {
      remove();
      remove = () => {};
    };
    this.onRemove(() => remover());
    return remover;
  }
  detach() {
    for (var n in this.nodes) {
      this.nodes[n].remove();
    }
    return this.nodes;
  }
}
exports.View = View;
Object.defineProperty(View, 'templates', {
  value: new Map()
});
Object.defineProperty(View, 'refClasses', {
  value: new Map()
});
  })();
});

require.register("curvature/base/ViewList.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ViewList = void 0;
var _Bindable = require("./Bindable");
var _SetMap = require("./SetMap");
var _Bag = require("./Bag");
class ViewList {
  constructor(template, subProperty, list, parent, keyProperty = null, viewClass = null) {
    this.removed = false;
    this.args = _Bindable.Bindable.makeBindable(Object.create(null));
    this.args.value = _Bindable.Bindable.makeBindable(list || Object.create(null));
    this.subArgs = _Bindable.Bindable.makeBindable(Object.create(null));
    this.views = [];
    this.cleanup = [];
    this.viewClass = viewClass;
    this._onRemove = new _Bag.Bag();
    this.template = template;
    this.subProperty = subProperty;
    this.keyProperty = keyProperty;
    this.tag = null;
    this.downDebind = [];
    this.upDebind = [];
    this.paused = false;
    this.parent = parent;
    this.viewCount = 0;
    this.rendered = new Promise((accept, reject) => {
      Object.defineProperty(this, 'renderComplete', {
        configurable: false,
        writable: true,
        value: accept
      });
    });
    this.willReRender = false;
    this.args.___before((t, e, s, o, a) => {
      if (e == 'bindTo') {
        return;
      }
      this.paused = true;
    });
    this.args.___after((t, e, s, o, a) => {
      if (e == 'bindTo') {
        return;
      }
      this.paused = s.length > 1;
      this.reRender();
    });
    var debind = this.args.value.bindTo((v, k, t, d) => {
      if (this.paused) {
        return;
      }
      var kk = k;
      if (typeof k === 'symbol') {
        return;
      }
      if (isNaN(k)) {
        kk = '_' + k;
      }
      if (d) {
        if (this.views[kk]) {
          this.views[kk].remove(true);
        }
        delete this.views[kk];
        for (var i in this.views) {
          if (!this.views[i]) {
            continue;
          }
          if (isNaN(i)) {
            this.views[i].args[this.keyProperty] = i.substr(1);
            continue;
          }
          this.views[i].args[this.keyProperty] = i;
        }
      } else if (!this.views[kk]) {
        if (!this.viewCount) {
          this.reRender();
        } else {
          if (this.willReRender === false) {
            this.willReRender = requestAnimationFrame(() => {
              this.willReRender = false;
              this.reRender();
            });
          }
        }
      } else if (this.views[kk] && this.views[kk].args) {
        this.views[kk].args[this.keyProperty] = k;
        this.views[kk].args[this.subProperty] = v;
      }
    }, {
      wait: 0
    });
    this._onRemove.add(debind);
    Object.preventExtensions(this);
  }
  render(tag) {
    var _this = this;
    var renders = [];
    var _loop = function (view) {
      view.viewList = _this;
      view.render(tag, null, _this.parent);
      renders.push(view.rendered.then(() => view));
    };
    for (var view of this.views) {
      _loop(view);
    }
    this.tag = tag;
    Promise.all(renders).then(views => this.renderComplete(views));
    this.parent.dispatchEvent(new CustomEvent('listRendered', {
      detail: {
        detail: {
          key: this.subProperty,
          value: this.args.value
        }
      }
    }));
  }
  reRender() {
    var _this2 = this;
    if (this.paused || !this.tag) {
      return;
    }
    var views = [];
    var existingViews = new _SetMap.SetMap();
    for (var i in this.views) {
      var view = this.views[i];
      if (view === undefined) {
        views[i] = view;
        continue;
      }
      var rawValue = view.args[this.subProperty];
      existingViews.add(rawValue, view);
      views[i] = view;
    }
    var finalViews = [];
    var finalViewSet = new Set();
    this.downDebind.length && this.downDebind.forEach(d => d && d());
    this.upDebind.length && this.upDebind.forEach(d => d && d());
    this.upDebind.length = 0;
    this.downDebind.length = 0;
    var minKey = Infinity;
    var anteMinKey = Infinity;
    var _loop2 = function () {
      var found = false;
      var k = _i;
      if (isNaN(k)) {
        k = '_' + _i;
      } else if (String(k).length) {
        k = Number(k);
      }
      if (_this2.args.value[_i] !== undefined && existingViews.has(_this2.args.value[_i])) {
        var existingView = existingViews.getOne(_this2.args.value[_i]);
        if (existingView) {
          existingView.args[_this2.keyProperty] = _i;
          finalViews[k] = existingView;
          finalViewSet.add(existingView);
          found = true;
          if (!isNaN(k)) {
            minKey = Math.min(minKey, k);
            k > 0 && (anteMinKey = Math.min(anteMinKey, k));
          }
          existingViews.remove(_this2.args.value[_i], existingView);
        }
      }
      if (!found) {
        var viewArgs = Object.create(null);
        var _view = finalViews[k] = new _this2.viewClass(viewArgs, _this2.parent);
        if (!isNaN(k)) {
          minKey = Math.min(minKey, k);
          k > 0 && (anteMinKey = Math.min(anteMinKey, k));
        }
        finalViews[k].template = _this2.template;
        finalViews[k].viewList = _this2;
        finalViews[k].args[_this2.keyProperty] = _i;
        finalViews[k].args[_this2.subProperty] = _this2.args.value[_i];
        _this2.upDebind[k] = viewArgs.bindTo(_this2.subProperty, (v, k, t, d) => {
          var index = viewArgs[_this2.keyProperty];
          if (d) {
            delete _this2.args.value[index];
            return;
          }
          _this2.args.value[index] = v;
        });
        _this2.downDebind[k] = _this2.subArgs.bindTo((v, k, t, d) => {
          if (d) {
            delete viewArgs[k];
            return;
          }
          viewArgs[k] = v;
        });
        var upDebind = () => {
          _this2.upDebind.filter(x => x).forEach(d => d());
          _this2.upDebind.length = 0;
        };
        var downDebind = () => {
          _this2.downDebind.filter(x => x).forEach(d => d());
          _this2.downDebind.length = 0;
        };
        _view.onRemove(() => {
          _this2._onRemove.remove(upDebind);
          _this2._onRemove.remove(downDebind);
          _this2.upDebind[k] && _this2.upDebind[k]();
          _this2.downDebind[k] && _this2.downDebind[k]();
          delete _this2.upDebind[k];
          delete _this2.downDebind[k];
        });
        _this2._onRemove.add(upDebind);
        _this2._onRemove.add(downDebind);
        viewArgs[_this2.subProperty] = _this2.args.value[_i];
      }
    };
    for (var _i in this.args.value) {
      _loop2();
    }
    for (var _i2 in views) {
      if (views[_i2] && !finalViewSet.has(views[_i2])) {
        views[_i2].remove(true);
      }
    }
    if (Array.isArray(this.args.value)) {
      var localMin = minKey === 0 && finalViews[1] !== undefined && finalViews.length > 1 || anteMinKey === Infinity ? minKey : anteMinKey;
      var renderRecurse = (i = 0) => {
        var ii = finalViews.length - i - 1;
        while (ii > localMin && finalViews[ii] === undefined) {
          ii--;
        }
        if (ii < localMin) {
          return Promise.resolve();
        }
        if (finalViews[ii] === this.views[ii]) {
          if (finalViews[ii] && !finalViews[ii].firstNode) {
            finalViews[ii].render(this.tag, finalViews[ii + 1], this.parent);
            return finalViews[ii].rendered.then(() => renderRecurse(Number(i) + 1));
          } else {
            var split = 500;
            if (i === 0 || i % split) {
              return renderRecurse(Number(i) + 1);
            } else {
              return new Promise(accept => requestAnimationFrame(() => accept(renderRecurse(Number(i) + 1))));
            }
          }
        }
        finalViews[ii].render(this.tag, finalViews[ii + 1], this.parent);
        this.views.splice(ii, 0, finalViews[ii]);
        return finalViews[ii].rendered.then(() => renderRecurse(i + 1));
      };
      this.rendered = renderRecurse();
    } else {
      var renders = [];
      var leftovers = Object.assign(Object.create(null), finalViews);
      var isInt = x => parseInt(x) === x - 0;
      var keys = Object.keys(finalViews).sort((a, b) => {
        if (isInt(a) && isInt(b)) {
          return Math.sign(a - b);
        }
        if (!isInt(a) && !isInt(b)) {
          return 0;
        }
        if (!isInt(a) && isInt(b)) {
          return -1;
        }
        if (isInt(a) && !isInt(b)) {
          return 1;
        }
      });
      var _loop3 = function (_i3) {
        delete leftovers[_i3];
        if (finalViews[_i3].firstNode && finalViews[_i3] === _this2.views[_i3]) {
          return 1; // continue
        }
        finalViews[_i3].render(_this2.tag, null, _this2.parent);
        renders.push(finalViews[_i3].rendered.then(() => finalViews[_i3]));
      };
      for (var _i3 of keys) {
        if (_loop3(_i3)) continue;
      }
      for (var _i4 in leftovers) {
        delete this.args.views[_i4];
        leftovers.remove(true);
      }
      this.rendered = Promise.all(renders);
    }
    for (var _i5 in finalViews) {
      if (isNaN(_i5)) {
        finalViews[_i5].args[this.keyProperty] = _i5.substr(1);
        continue;
      }
      finalViews[_i5].args[this.keyProperty] = _i5;
    }
    this.views = Array.isArray(this.args.value) ? [...finalViews] : finalViews;
    this.viewCount = finalViews.length;
    finalViewSet.clear();
    this.willReRender = false;
    this.rendered.then(() => {
      this.parent.dispatchEvent(new CustomEvent('listRendered', {
        detail: {
          detail: {
            key: this.subProperty,
            value: this.args.value,
            tag: this.tag
          }
        }
      }));
      this.tag.dispatchEvent(new CustomEvent('listRendered', {
        detail: {
          detail: {
            key: this.subProperty,
            value: this.args.value,
            tag: this.tag
          }
        }
      }));
    });
    return this.rendered;
  }
  pause(pause = true) {
    for (var i in this.views) {
      this.views[i].pause(pause);
    }
  }
  onRemove(callback) {
    this._onRemove.add(callback);
  }
  remove() {
    for (var i in this.views) {
      this.views[i] && this.views[i].remove(true);
    }
    var onRemove = this._onRemove.items();
    for (var _i6 in onRemove) {
      this._onRemove.remove(onRemove[_i6]);
      onRemove[_i6]();
    }
    var cleanup;
    while (this.cleanup.length) {
      cleanup = this.cleanup.pop();
      cleanup();
    }
    this.views = [];
    while (this.tag && this.tag.firstChild) {
      this.tag.removeChild(this.tag.firstChild);
    }
    if (this.subArgs) {
      _Bindable.Bindable.clearBindings(this.subArgs);
    }
    _Bindable.Bindable.clearBindings(this.args);

    // if(this.args.value && !this.args.value.isBound())
    // {
    // 	Bindable.clearBindings(this.args.value);
    // }

    this.removed = true;
  }
}
exports.ViewList = ViewList;
  })();
});

require.register("curvature/input/Keyboard.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Keyboard = void 0;
var _Bindable = require("../base/Bindable");
class Keyboard {
  static get() {
    return this.instance = this.instance || _Bindable.Bindable.make(new this());
  }
  constructor() {
    this.maxDecay = 120;
    this.comboTime = 500;
    this.listening = false;
    this.focusElement = document.body;
    this[_Bindable.Bindable.NoGetters] = true;
    Object.defineProperty(this, 'combo', {
      value: _Bindable.Bindable.make([])
    });
    Object.defineProperty(this, 'whichs', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'codes', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'keys', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'pressedWhich', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'pressedCode', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'pressedKey', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'releasedWhich', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'releasedCode', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'releasedKey', {
      value: _Bindable.Bindable.make({})
    });
    Object.defineProperty(this, 'keyRefs', {
      value: _Bindable.Bindable.make({})
    });
    document.addEventListener('keyup', event => {
      if (!this.listening) {
        return;
      }
      if (!(this.keys[event.key] > 0) && this.focusElement && document.activeElement !== this.focusElement && (!this.focusElement.contains(document.activeElement) || document.activeElement.matches('input,textarea'))) {
        return;
      }
      event.preventDefault();
      this.releasedWhich[event.which] = Date.now();
      this.releasedCode[event.code] = Date.now();
      this.releasedKey[event.key] = Date.now();
      this.whichs[event.which] = -1;
      this.codes[event.code] = -1;
      this.keys[event.key] = -1;
    });
    document.addEventListener('keydown', event => {
      if (!this.listening) {
        return;
      }
      if (this.focusElement && document.activeElement !== this.focusElement && (!this.focusElement.contains(document.activeElement) || document.activeElement.matches('input,textarea'))) {
        return;
      }
      event.preventDefault();
      if (event.repeat) {
        return;
      }
      this.combo.push(event.code);
      clearTimeout(this.comboTimer);
      this.comboTimer = setTimeout(() => this.combo.splice(0), this.comboTime);
      this.pressedWhich[event.which] = Date.now();
      this.pressedCode[event.code] = Date.now();
      this.pressedKey[event.key] = Date.now();
      if (this.keys[event.key] > 0) {
        return;
      }
      this.whichs[event.which] = 1;
      this.codes[event.code] = 1;
      this.keys[event.key] = 1;
    });
    var windowBlur = event => {
      for (var i in this.keys) {
        if (this.keys[i] < 0) {
          continue;
        }
        this.releasedKey[i] = Date.now();
        this.keys[i] = -1;
      }
      for (var _i in this.codes) {
        if (this.codes[_i] < 0) {
          continue;
        }
        this.releasedCode[_i] = Date.now();
        this.codes[_i] = -1;
      }
      for (var _i2 in this.whichs) {
        if (this.whichs[_i2] < 0) {
          continue;
        }
        this.releasedWhich[_i2] = Date.now();
        this.whichs[_i2] = -1;
      }
    };
    window.addEventListener('blur', windowBlur);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        return;
      }
      windowBlur();
    });
  }
  getKeyRef(keyCode) {
    var keyRef = this.keyRefs[keyCode] = this.keyRefs[keyCode] || _Bindable.Bindable.make({});
    return keyRef;
  }
  getKeyTime(key) {
    var released = this.releasedKey[key];
    var pressed = this.pressedKey[key];
    if (!pressed) {
      return 0;
    }
    if (!released || released < pressed) {
      return Date.now() - pressed;
    }
    return (Date.now() - released) * -1;
  }
  getCodeTime(code) {
    var released = this.releasedCode[code];
    var pressed = this.pressedCode[code];
    if (!pressed) {
      return 0;
    }
    if (!released || released < pressed) {
      return Date.now() - pressed;
    }
    return (Date.now() - released) * -1;
  }
  getWhichTime(code) {
    var released = this.releasedWhich[code];
    var pressed = this.pressedWhich[code];
    if (!pressed) {
      return 0;
    }
    if (!released || released < pressed) {
      return Date.now() - pressed;
    }
    return (Date.now() - released) * -1;
  }
  getKey(key) {
    if (!this.keys[key]) {
      return 0;
    }
    return this.keys[key];
  }
  getKeyCode(code) {
    if (!this.codes[code]) {
      return 0;
    }
    return this.codes[code];
  }
  reset() {
    for (var i in this.keys) {
      delete this.keys[i];
    }
    for (var i in this.codes) {
      delete this.codes[i];
    }
    for (var i in this.whichs) {
      delete this.whichs[i];
    }
  }
  update() {
    for (var i in this.keys) {
      if (this.keys[i] > 0) {
        this.keys[i]++;
      } else if (this.keys[i] > -this.maxDecay) {
        this.keys[i]--;
      } else {
        delete this.keys[i];
      }
    }
    for (var i in this.codes) {
      var released = this.releasedCode[i];
      var pressed = this.pressedCode[i];
      var keyRef = this.getKeyRef(i);
      if (this.codes[i] > 0) {
        keyRef.frames = this.codes[i]++;
        keyRef.time = pressed ? Date.now() - pressed : 0;
        keyRef.down = true;
        if (!released || released < pressed) {
          return;
        }
        return (Date.now() - released) * -1;
      } else if (this.codes[i] > -this.maxDecay) {
        keyRef.frames = this.codes[i]--;
        keyRef.time = released - Date.now();
        keyRef.down = false;
      } else {
        keyRef.frames = 0;
        keyRef.time = 0;
        keyRef.down = false;
        delete this.codes[i];
      }
    }
    for (var i in this.whichs) {
      if (this.whichs[i] > 0) {
        this.whichs[i]++;
      } else if (this.whichs[i] > -this.maxDecay) {
        this.whichs[i]--;
      } else {
        delete this.whichs[i];
      }
    }
  }
}
exports.Keyboard = Keyboard;
  })();
});

require.register("curvature/mixin/EventTargetMixin.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "curvature");
  (function() {
    "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventTargetMixin = void 0;
var _Mixin = require("../base/Mixin");
var EventTargetParent = Symbol('EventTargetParent');
var CallHandler = Symbol('CallHandler');
var Capture = Symbol('Capture');
var Bubble = Symbol('Bubble');
var Target = Symbol('Target');
var HandlersBubble = Symbol('HandlersBubble');
var HandlersCapture = Symbol('HandlersCapture');
var EventTargetMixin = exports.EventTargetMixin = {
  [_Mixin.Mixin.Constructor]() {
    this[HandlersCapture] = new Map();
    this[HandlersBubble] = new Map();
  },
  dispatchEvent(...args) {
    var event = args[0];
    if (typeof event === 'string') {
      event = new CustomEvent(event);
      args[0] = event;
    }
    event.cvPath = event.cvPath || [];
    event.cvTarget = event.cvCurrentTarget = this;
    var result = this[Capture](...args);
    if (event.cancelable && (result === false || event.cancelBubble)) {
      return result;
    }
    var handlers = [];
    if (this[HandlersCapture].has(event.type)) {
      var handlerMap = this[HandlersCapture].get(event.type);
      var newHandlers = [...handlerMap];
      newHandlers.forEach(h => h.push(handlerMap));
      handlers.push(...newHandlers);
    }
    if (this[HandlersBubble].has(event.type)) {
      var _handlerMap = this[HandlersBubble].get(event.type);
      var _newHandlers = [..._handlerMap];
      _newHandlers.forEach(h => h.push(_handlerMap));
      handlers.push(..._newHandlers);
    }
    handlers.push([() => this[CallHandler](...args), {}, null]);
    for (var [handler, options, map] of handlers) {
      if (options.once) {
        map.delete(handler);
      }
      result = handler(event);
      if (event.cancelable && result === false) {
        break;
      }
    }
    if (!event.cancelable || !event.cancelBubble && result !== false) {
      this[Bubble](...args);
    }
    if (!this[EventTargetParent]) {
      Object.freeze(event.cvPath);
    }
    return event.returnValue;
  },
  addEventListener(type, callback, options = {}) {
    if (options === true) {
      options = {
        useCapture: true
      };
    }
    var handlers = HandlersBubble;
    if (options.useCapture) {
      handlers = HandlersCapture;
    }
    if (!this[handlers].has(type)) {
      this[handlers].set(type, new Map());
    }
    this[handlers].get(type).set(callback, options);
    if (options.signal) {
      options.signal.addEventListener('abort', event => this.removeEventListener(type, callback, options), {
        once: true
      });
    }
  },
  removeEventListener(type, callback, options = {}) {
    if (options === true) {
      options = {
        useCapture: true
      };
    }
    var handlers = HandlersBubble;
    if (options.useCapture) {
      handlers = HandlersCapture;
    }
    if (!this[handlers].has(type)) {
      return;
    }
    this[handlers].get(type).delete(callback);
  },
  [Capture](...args) {
    var event = args[0];
    event.cvPath.push(this);
    if (!this[EventTargetParent]) {
      return;
    }
    var result = this[EventTargetParent][Capture](...args);
    if (event.cancelable && (result === false || event.cancelBubble)) {
      return;
    }
    if (!this[EventTargetParent][HandlersCapture].has(event.type)) {
      return;
    }
    event.cvCurrentTarget = this[EventTargetParent];
    var {
      type
    } = event;
    var handlers = this[EventTargetParent][HandlersCapture].get(type);
    for (var [handler, options] of handlers) {
      if (options.once) {
        handlers.delete(handler);
      }
      result = handler(event);
      if (event.cancelable && (result === false || event.cancelBubble)) {
        break;
      }
    }
    return result;
  },
  [Bubble](...args) {
    var event = args[0];
    if (!event.bubbles || !this[EventTargetParent] || event.cancelBubble) {
      return;
    }
    if (!this[EventTargetParent][HandlersBubble].has(event.type)) {
      return this[EventTargetParent][Bubble](...args);
    }
    var result;
    event.cvCurrentTarget = this[EventTargetParent];
    var {
      type
    } = event;
    var handlers = this[EventTargetParent][HandlersBubble].get(event.type);
    for (var [handler, options] of handlers) {
      if (options.once) {
        handlers.delete(handler);
      }
      result = handler(event);
      if (event.cancelable && result === false) {
        return result;
      }
    }
    result = this[EventTargetParent][CallHandler](...args);
    if (event.cancelable && (result === false || event.cancelBubble)) {
      return result;
    }
    return this[EventTargetParent][Bubble](...args);
  },
  [CallHandler](...args) {
    var event = args[0];
    if (event.defaultPrevented) {
      return;
    }
    var defaultHandler = `on${event.type[0].toUpperCase() + event.type.slice(1)}`;
    if (typeof this[defaultHandler] === 'function') {
      return this[defaultHandler](event);
    }
  }
};
Object.defineProperty(EventTargetMixin, 'Parent', {
  value: EventTargetParent
});
  })();
});
require.register("Config.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = void 0;

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Config = /*#__PURE__*/_createClass(function Config() {
  _classCallCheck(this, Config);
});

exports.Config = Config;
;
Config.title = 'wgl2d'; // Config.
});

;require.register("gl2d/Gl2d.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Gl2d = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var Gl2d = /*#__PURE__*/function () {
  function Gl2d(element) {
    _classCallCheck(this, Gl2d);

    this.element = element || document.createElement('canvas');
    this.context = this.element.getContext('webgl');
    this.screenScale = 1;
    this.zoomLevel = 1;
  }

  _createClass(Gl2d, [{
    key: "cleanup",
    value: function cleanup() {
      this.context.deleteProgram(this.program);
    }
  }, {
    key: "createShader",
    value: function createShader(location) {
      var extension = location.substring(location.lastIndexOf('.') + 1);
      var type = null;

      switch (extension.toUpperCase()) {
        case 'VERT':
          type = this.context.VERTEX_SHADER;
          break;

        case 'FRAG':
          type = this.context.FRAGMENT_SHADER;
          break;
      }

      var shader = this.context.createShader(type);

      var source = require(location);

      this.context.shaderSource(shader, source);
      this.context.compileShader(shader);
      var success = this.context.getShaderParameter(shader, this.context.COMPILE_STATUS);

      if (success) {
        return shader;
      }

      console.error(this.context.getShaderInfoLog(shader));
      this.context.deleteShader(shader);
    }
  }, {
    key: "createProgram",
    value: function createProgram(vertexShader, fragmentShader) {
      var program = this.context.createProgram();
      this.context.attachShader(program, vertexShader);
      this.context.attachShader(program, fragmentShader);
      this.context.linkProgram(program);
      this.context.detachShader(program, vertexShader);
      this.context.detachShader(program, fragmentShader);
      this.context.deleteShader(vertexShader);
      this.context.deleteShader(fragmentShader);

      if (this.context.getProgramParameter(program, this.context.LINK_STATUS)) {
        return program;
      }

      console.error(this.context.getProgramInfoLog(program));
      this.context.deleteProgram(program);
      return program;
    }
  }]);

  return Gl2d;
}();

exports.Gl2d = Gl2d;
});

;require.register("home/View.js", function(exports, require, module) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.View = void 0;

var _View = require("curvature/base/View");

var _Keyboard = require("curvature/input/Keyboard");

var _Bag = require("curvature/base/Bag");

var _Config = require("Config");

var _Map = require("../world/Map");

var _SpriteSheet = require("../sprite/SpriteSheet");

var _SpriteBoard = require("../sprite/SpriteBoard");

var _Controller = require("../ui/Controller");

var _MapEditor = require("../ui/MapEditor");

var _Entity = require("../model/Entity");

var _Camera = require("../sprite/Camera");

var _Controller2 = require("../model/Controller");

var _Sprite = require("../sprite/Sprite");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var Application = {};
Application.onScreenJoyPad = new _Controller.Controller();
Application.keyboard = _Keyboard.Keyboard.get();

var View = /*#__PURE__*/function (_BaseView) {
  _inherits(View, _BaseView);

  var _super = _createSuper(View);

  function View(args) {
    var _this;

    _classCallCheck(this, View);

    window.smProfiling = true;
    _this = _super.call(this, args);
    _this.template = require('./view.tmp');
    _this.routes = [];
    _this.entities = new _Bag.Bag();
    _this.keyboard = Application.keyboard;
    _this.speed = 24;
    _this.maxSpeed = _this.speed;
    _this.args.controller = Application.onScreenJoyPad;
    _this.args.fps = 0;
    _this.args.sps = 0;
    _this.args.camX = 0;
    _this.args.camY = 0;
    _this.args.frameLock = 60;
    _this.args.simulationLock = 60;
    _this.args.showEditor = false;
    _this.keyboard.listening = true;

    _this.keyboard.keys.bindTo('e', function (v, k, t, d) {
      if (v > 0) {
        _this.map["export"]();
      }
    });

    _this.keyboard.keys.bindTo('Escape', function (v, k, t, d) {
      if (v === -1) {
        _this.spriteBoard.unselect();
      }
    });

    _this.keyboard.keys.bindTo('Home', function (v, k, t, d) {
      if (v > 0) {
        _this.args.frameLock++;
      }
    });

    _this.keyboard.keys.bindTo('End', function (v, k, t, d) {
      if (v > 0) {
        _this.args.frameLock--;

        if (_this.args.frameLock < 0) {
          _this.args.frameLock = 0;
        }
      }
    });

    _this.keyboard.keys.bindTo('PageUp', function (v, k, t, d) {
      if (v > 0) {
        _this.args.simulationLock++;
      }
    });

    _this.keyboard.keys.bindTo('PageDown', function (v, k, t, d) {
      if (v > 0) {
        _this.args.simulationLock--;

        if (_this.args.simulationLock < 0) {
          _this.args.simulationLock = 0;
        }
      }
    });

    _this.spriteSheet = new _SpriteSheet.SpriteSheet();
    _this.map = new _Map.Map();

    _this.map["import"]();

    _this.args.mapEditor = new _MapEditor.MapEditor({
      spriteSheet: _this.spriteSheet,
      map: _this.map
    });
    return _this;
  }

  _createClass(View, [{
    key: "onRendered",
    value: function onRendered() {
      var _this2 = this;

      var spriteBoard = new _SpriteBoard.SpriteBoard(this.tags.canvas.element, this.map);
      this.spriteBoard = spriteBoard;
      var entity = new _Entity.Entity({
        sprite: new _Sprite.Sprite({
          src: undefined,
          spriteBoard: spriteBoard,
          spriteSheet: this.spriteSheet
        }),
        controller: new _Controller2.Controller({
          keyboard: this.keyboard,
          onScreenJoyPad: this.args.controller
        }),
        camera: _Camera.Camera
      });
      this.entities.add(entity);
      this.spriteBoard.sprites.add(entity.sprite);
      this.keyboard.keys.bindTo('=', function (v, k, t, d) {
        if (v > 0) {
          _this2.zoom(1);
        }
      });
      this.keyboard.keys.bindTo('+', function (v, k, t, d) {
        if (v > 0) {
          _this2.zoom(1);
        }
      });
      this.keyboard.keys.bindTo('-', function (v, k, t, d) {
        if (v > 0) {
          _this2.zoom(-1);
        }
      });
      this.args.mapEditor.args.bindTo('selectedGraphic', function (v) {
        if (!v || _this2.spriteBoard.selected.globalX == null) {
          return;
        }

        _this2.args.showEditor = false;
        var i = _this2.spriteBoard.selected.startGlobalX;
        var ii = _this2.spriteBoard.selected.globalX;

        if (ii < i) {
          var _ref = [i, ii];
          ii = _ref[0];
          i = _ref[1];
        }

        for (; i <= ii; i++) {
          var j = _this2.spriteBoard.selected.startGlobalY;
          var jj = _this2.spriteBoard.selected.globalY;

          if (jj < j) {
            var _ref2 = [j, jj];
            jj = _ref2[0];
            j = _ref2[1];
          }

          for (; j <= jj; j++) {
            _this2.map.setTile(i, j, v);
          }
        }

        _this2.map.setTile(_this2.spriteBoard.selected.globalX, _this2.spriteBoard.selected.globalY, v);

        _this2.spriteBoard.resize();

        _this2.spriteBoard.unselect();
      });
      this.spriteBoard.selected.bindTo(function (v, k, t, d, p) {
        if (_this2.spriteBoard.selected.localX == null) {
          _this2.args.showEditor = false;
          return;
        }

        _this2.args.mapEditor.select(_this2.spriteBoard.selected);

        _this2.args.showEditor = true;

        _this2.spriteBoard.resize();
      }, {
        wait: 0
      });
      this.args.showEditor = true;
      window.addEventListener('resize', function () {
        _this2.resize(); // update();

      });
      var fThen = 0;
      var sThen = 0;
      var fSamples = [];
      var sSamples = [];
      var maxSamples = 5;

      var simulate = function simulate(now) {
        now = now / 1000;
        var delta = now - sThen;

        if (_this2.args.simulationLock == 0) {
          sSamples = [0];
          return;
        }

        if (delta < 1 / (_this2.args.simulationLock + 10 * (_this2.args.simulationLock / 60))) {
          return;
        }

        sThen = now;

        _this2.keyboard.update();

        Object.values(_this2.entities.items()).map(function (e) {
          e.simulate();
        }); // this.spriteBoard.simulate();
        // this.args.localX  = this.spriteBoard.selected.localX;
        // this.args.localY  = this.spriteBoard.selected.localY;
        // this.args.globalX = this.spriteBoard.selected.globalX;
        // this.args.globalY = this.spriteBoard.selected.globalY;

        _this2.args._sps = 1 / delta;
        sSamples.push(_this2.args._sps);

        while (sSamples.length > maxSamples) {
          sSamples.shift();
        } // this.spriteBoard.moveCamera(sprite.x, sprite.y);

      };

      var update = function update(now) {
        now = now / 1000;
        var delta = now - fThen;

        if (delta < 1 / (_this2.args.frameLock + 10 * (_this2.args.frameLock / 60))) {
          window.requestAnimationFrame(update);
          return;
        }

        fThen = now;

        if (_this2.args.frameLock == 0) {
          window.requestAnimationFrame(update);
          fSamples = [0];
          return;
        }

        _this2.spriteBoard.draw();

        window.requestAnimationFrame(update);
        fSamples.push(_this2.args._fps);

        while (fSamples.length > maxSamples) {
          fSamples.shift();
        }

        _this2.args._fps = 1 / delta;
        _this2.args.camX = Number(_Camera.Camera.x).toFixed(2);
        _this2.args.camY = Number(_Camera.Camera.y).toFixed(2);
      };

      this.spriteBoard.gl2d.zoomLevel = document.body.clientWidth / 1024;
      this.resize();
      setInterval(function () {
        simulate(performance.now());
      }, 0);
      setInterval(function () {
        var fps = fSamples.reduce(function (a, b) {
          return a + b;
        }, 0) / fSamples.length;
        _this2.args.fps = fps.toFixed(3).padStart(5, ' ');
      }, 227);
      setInterval(function () {
        document.title = "".concat(_Config.Config.title, " ").concat(_this2.args.fps, " FPS");
      }, 227 / 3);
      setInterval(function () {
        var sps = sSamples.reduce(function (a, b) {
          return a + b;
        }, 0) / sSamples.length;
        _this2.args.sps = sps.toFixed(3).padStart(5, ' ');
      }, 231 / 2);
      window.requestAnimationFrame(update);
    }
  }, {
    key: "resize",
    value: function resize(x, y) {
      this.args.width = this.tags.canvas.element.width = x || document.body.clientWidth;
      this.args.height = this.tags.canvas.element.height = y || document.body.clientHeight;
      this.args.rwidth = Math.trunc((x || document.body.clientWidth) / this.spriteBoard.gl2d.zoomLevel);
      this.args.rheight = Math.trunc((y || document.body.clientHeight) / this.spriteBoard.gl2d.zoomLevel);
      var oldScale = this.spriteBoard.gl2d.screenScale;
      this.spriteBoard.gl2d.screenScale = document.body.clientWidth / 1024;
      this.spriteBoard.gl2d.zoomLevel *= this.spriteBoard.gl2d.screenScale / oldScale;
      this.spriteBoard.resize();
    }
  }, {
    key: "scroll",
    value: function scroll(event) {
      var delta = event.deltaY > 0 ? -1 : event.deltaY < 0 ? 1 : 0;
      this.zoom(delta);
    }
  }, {
    key: "zoom",
    value: function zoom(delta) {
      var max = this.spriteBoard.gl2d.screenScale * 32;
      var min = this.spriteBoard.gl2d.screenScale * 0.6667;
      var step = 0.05 * this.spriteBoard.gl2d.zoomLevel;
      var zoomLevel = this.spriteBoard.gl2d.zoomLevel + delta * step;

      if (zoomLevel < min) {
        zoomLevel = min;
      } else if (zoomLevel > max) {
        zoomLevel = max;
      }

      if (this.spriteBoard.gl2d.zoomLevel !== zoomLevel) {
        this.spriteBoard.gl2d.zoomLevel = zoomLevel;
        this.resize();
      }
    }
  }]);

  return View;
}(_View.View);

exports.View = View;
});

;require.register("home/view.tmp.html", function(exports, require, module) {
module.exports = "<canvas\n\tcv-ref = \"canvas:curvature/base/Tag\"\n\tcv-on  = \"wheel:scroll(event);\"\n></canvas>\n<div class = \"hud fps\">\n [[sps]] simulations/s / [[simulationLock]] \n [[fps]] frames/s      / [[frameLock]] \n\n Res [[rwidth]] x [[rheight]]\n     [[width]] x [[height]]\n \n Pos [[camX]] x [[camY]]\n\n δ Sim:   Pg Up / Dn\n δ Frame: Home / End \n δ Scale: + / - \n\n</div>\n<div class = \"reticle\"></div>\n\n[[controller]]\n\n<div cv-if = \"showEditor\">\n\t[[mapEditor]]\n\t--\n\t[[mmm]]\n</span>\n"
});

;require.register("initialize.js", function(exports, require, module) {
"use strict";

var _Router = require("curvature/base/Router");

var _View = require("home/View");

if (Proxy !== undefined) {
  document.addEventListener('DOMContentLoaded', function () {
    var view = new _View.View();

    _Router.Router.listen(view);

    view.render(document.body);
  });
} else {// document.write(require('./Fallback/fallback.tmp'));
}
});

;require.register("inject/Container.js", function(exports, require, module) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Container = void 0;

var _Injectable2 = require("./Injectable");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var Container = /*#__PURE__*/function (_Injectable) {
  _inherits(Container, _Injectable);

  var _super = _createSuper(Container);

  function Container() {
    _classCallCheck(this, Container);

    return _super.apply(this, arguments);
  }

  _createClass(Container, [{
    key: "inject",
    value: function inject(injections) {
      return new this.constructor(Object.assign({}, this, injections));
    }
  }]);

  return Container;
}(_Injectable2.Injectable);

exports.Container = Container;
});

;require.register("inject/Injectable.js", function(exports, require, module) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Injectable = void 0;

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var classes = {};
var objects = {};

var Injectable = /*#__PURE__*/function () {
  function Injectable() {
    _classCallCheck(this, Injectable);

    var injections = this.constructor.injections();
    var context = this.constructor.context();

    if (!classes[context]) {
      classes[context] = {};
    }

    if (!objects[context]) {
      objects[context] = {};
    }

    for (var name in injections) {
      var injection = injections[name];

      if (classes[context][name] || !injection.prototype) {
        continue;
      }

      if (/[A-Z]/.test(String(name)[0])) {
        classes[context][name] = injection;
      }
    }

    for (var _name in injections) {
      var instance = undefined;

      var _injection = classes[context][_name] || injections[_name];

      if (/[A-Z]/.test(String(_name)[0])) {
        if (_injection.prototype) {
          if (!objects[context][_name]) {
            objects[context][_name] = new _injection();
          }
        } else {
          objects[context][_name] = _injection;
        }

        instance = objects[context][_name];
      } else {
        if (_injection.prototype) {
          instance = new _injection();
        } else {
          instance = _injection;
        }
      }

      Object.defineProperty(this, _name, {
        enumerable: false,
        writable: false,
        value: instance
      });
    }
  }

  _createClass(Injectable, null, [{
    key: "injections",
    value: function injections() {
      return {};
    }
  }, {
    key: "context",
    value: function context() {
      return '.';
    }
  }, {
    key: "inject",
    value: function inject(_injections) {
      var _context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '.';

      if (!(this.prototype instanceof Injectable || this === Injectable)) {
        throw new Error("Cannot access injectable subclass!\n\nAre you trying to instantiate like this?\n\n\tnew X.inject({...});\n\nIf so please try:\n\n\tnew (X.inject({...}));\n\nPlease note the parenthesis.\n");
      }

      var existingInjections = this.injections();
      return /*#__PURE__*/function (_this) {
        _inherits(_class, _this);

        var _super = _createSuper(_class);

        function _class() {
          _classCallCheck(this, _class);

          return _super.apply(this, arguments);
        }

        _createClass(_class, null, [{
          key: "injections",
          value: function injections() {
            return Object.assign({}, existingInjections, _injections);
          }
        }, {
          key: "context",
          value: function context() {
            return _context;
          }
        }]);

        return _class;
      }(this);
    }
  }]);

  return Injectable;
}();

exports.Injectable = Injectable;
});

;require.register("inject/Single.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.single = exports.Single = void 0;

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Single = /*#__PURE__*/_createClass(function Single() {
  _classCallCheck(this, Single);

  this.name = 'sss.' + Math.random();
});

exports.Single = Single;
var single = new Single();
exports.single = single;
});

require.register("model/Controller.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Controller = void 0;

var _Bindable = require("curvature/base/Bindable");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Controller = /*#__PURE__*/function () {
  function Controller(_ref) {
    var _this = this;

    var keyboard = _ref.keyboard,
        onScreenJoyPad = _ref.onScreenJoyPad;

    _classCallCheck(this, Controller);

    _defineProperty(this, "triggers", _Bindable.Bindable.makeBindable({}));

    _defineProperty(this, "axis", _Bindable.Bindable.makeBindable({}));

    keyboard.keys.bindTo(function (v, k, t, d) {
      if (v > 0) {
        _this.keyPress(k, v, t[k]);

        return;
      }

      if (v === -1) {
        _this.keyRelease(k, v, t[k]);

        return;
      }
    });
    onScreenJoyPad.args.bindTo('x', function (v) {
      _this.axis[0] = v / 50;
    });
    onScreenJoyPad.args.bindTo('y', function (v) {
      _this.axis[1] = v / 50;
    });
  }

  _createClass(Controller, [{
    key: "keyPress",
    value: function keyPress(key, value, prev) {
      if (/^[0-9]$/.test(key)) {
        this.triggers[key] = true;
        return;
      }

      switch (key) {
        case 'ArrowRight':
          this.axis[0] = 1;
          break;

        case 'ArrowDown':
          this.axis[1] = 1;
          break;

        case 'ArrowLeft':
          this.axis[0] = -1;
          break;

        case 'ArrowUp':
          this.axis[1] = -1;
          break;
      }
    }
  }, {
    key: "keyRelease",
    value: function keyRelease(key, value, prev) {
      if (/^[0-9]$/.test(key)) {
        this.triggers[key] = false;
        return;
      }

      switch (key) {
        case 'ArrowRight':
          if (this.axis[0] > 0) {
            this.axis[0] = 0;
          }

          this.axis[0] = 0;

        case 'ArrowLeft':
          if (this.axis[0] < 0) {
            this.axis[0] = 0;
          }

          break;

        case 'ArrowDown':
          if (this.axis[1] > 0) {
            this.axis[1] = 0;
          }

        case 'ArrowUp':
          if (this.axis[1] < 0) {
            this.axis[1] = 0;
          }

          break;
      }
    }
  }]);

  return Controller;
}();

exports.Controller = Controller;
});

;require.register("model/Entity.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Entity = void 0;

var _Camera = require("../sprite/Camera");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var Entity = /*#__PURE__*/function () {
  function Entity(_ref) {
    var sprite = _ref.sprite,
        controller = _ref.controller;

    _classCallCheck(this, Entity);

    this.direction = 'south';
    this.state = 'standing';
    this.sprite = sprite;
    this.controller = controller;
  }

  _createClass(Entity, [{
    key: "create",
    value: function create() {}
  }, {
    key: "simulate",
    value: function simulate() {
      var speed = 4;
      var xAxis = this.controller.axis[0] || 0;
      var yAxis = this.controller.axis[1] || 0;

      for (var t in this.controller.triggers) {
        if (!this.controller.triggers[t]) {
          continue;
        }

        console.log(t);
      }

      xAxis = Math.min(1, Math.max(xAxis, -1));
      yAxis = Math.min(1, Math.max(yAxis, -1));
      this.sprite.x += xAxis > 0 ? Math.ceil(speed * xAxis) : Math.floor(speed * xAxis);
      this.sprite.y += yAxis > 0 ? Math.ceil(speed * yAxis) : Math.floor(speed * yAxis);
      _Camera.Camera.x = (16 + this.sprite.x) * this.sprite.spriteBoard.gl2d.zoomLevel || 0;
      _Camera.Camera.y = (16 + this.sprite.y) * this.sprite.spriteBoard.gl2d.zoomLevel || 0;
      var horizontal = false;

      if (Math.abs(xAxis) > Math.abs(yAxis)) {
        horizontal = true;
      }

      if (horizontal) {
        this.direction = 'west';

        if (xAxis > 0) {
          this.direction = 'east';
        }

        this.state = 'walking';
      } else if (yAxis) {
        this.direction = 'north';

        if (yAxis > 0) {
          this.direction = 'south';
        }

        this.state = 'walking';
      } else {
        this.state = 'standing';
      } // if(!xAxis && !yAxis)
      // {
      // 	this.direction = 'south';
      // }


      var frames;

      if (frames = this.sprite[this.state][this.direction]) {
        this.sprite.setFrames(frames);
      }
    }
  }, {
    key: "destroy",
    value: function destroy() {}
  }]);

  return Entity;
}();

exports.Entity = Entity;
});

;require.register("overlay/overlay.frag", function(exports, require, module) {
module.exports = "precision mediump float;\n\nuniform vec4      u_color;\nvarying vec2      v_texCoord;\n\nvoid main() {\n   // gl_FragColor = texture2D(u_image, v_texCoord);\n   gl_FragColor = vec4(1.0, 1.0, 0.0, 0.25);\n}\n"
});

;require.register("overlay/overlay.vert", function(exports, require, module) {
module.exports = "attribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform   vec2 u_resolution;\n\nvarying   vec2 v_texCoord;\n\nvoid main()\n{\n   vec2 zeroToOne = a_position / u_resolution;\n   vec2 zeroToTwo = zeroToOne * 2.0;\n   vec2 clipSpace = zeroToTwo - 1.0;\n\n   gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n   v_texCoord  = a_texCoord;\n}\n"
});

;require.register("sprite/Background.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Background = void 0;

var _Surface = require("./Surface");

var _Camera = require("./Camera");

var _SpriteSheet = require("./SpriteSheet");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var Background = /*#__PURE__*/function () {
  function Background(spriteBoard, map) {
    var layer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

    _classCallCheck(this, Background);

    this.spriteBoard = spriteBoard;
    this.spriteSheet = new _SpriteSheet.SpriteSheet();
    this.panes = [];
    this.panesXY = {};
    this.maxPanes = 9;
    this.map = map;
    this.layer = layer;
    this.tileWidth = 32;
    this.tileHeight = 32;
    this.surfaceWidth = 5;
    this.surfaceHeight = 5;
  }

  _createClass(Background, [{
    key: "renderPane",
    value: function renderPane(x, y, forceUpdate) {
      var pane;
      var paneX = x * this.tileWidth * this.surfaceWidth * this.spriteBoard.gl2d.zoomLevel;
      var paneY = y * this.tileHeight * this.surfaceHeight * this.spriteBoard.gl2d.zoomLevel;

      if (this.panesXY[paneX] && this.panesXY[paneX][paneY]) {
        pane = this.panesXY[paneX][paneY];
      } else {
        pane = new _Surface.Surface(this.spriteBoard, this.spriteSheet, this.map, this.surfaceWidth, this.surfaceHeight, paneX, paneY, this.layer);

        if (!this.panesXY[paneX]) {
          this.panesXY[paneX] = {};
        }

        if (!this.panesXY[paneX][paneY]) {
          this.panesXY[paneX][paneY] = pane;
        }
      }

      this.panes.push(pane);

      if (this.panes.length > this.maxPanes) {
        this.panes.shift();
      }
    }
  }, {
    key: "draw",
    value: function draw() {
      this.panes.length = 0;
      var centerX = Math.floor(_Camera.Camera.x / (this.surfaceWidth * this.tileWidth * this.spriteBoard.gl2d.zoomLevel) + 0);
      var centerY = Math.floor(_Camera.Camera.y / (this.surfaceHeight * this.tileHeight * this.spriteBoard.gl2d.zoomLevel) + 0);
      var range = [-1, 0, 1];

      for (var x in range) {
        for (var y in range) {
          this.renderPane(centerX + range[x], centerY + range[y]);
        }
      }

      this.panes.forEach(function (p) {
        return p.draw();
      });
    }
  }, {
    key: "resize",
    value: function resize(x, y) {
      for (var i in this.panesXY) {
        for (var j in this.panesXY[i]) {
          delete this.panesXY[i][j];
        }
      }

      while (this.panes.length) {
        this.panes.pop();
      }

      this.surfaceWidth = Math.ceil(x / this.tileWidth);
      this.surfaceHeight = Math.ceil(y / this.tileHeight);
      this.draw();
    }
  }, {
    key: "simulate",
    value: function simulate() {}
  }]);

  return Background;
}();

exports.Background = Background;
});

;require.register("sprite/Camera.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Camera = void 0;

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Camera = /*#__PURE__*/_createClass(function Camera() {
  _classCallCheck(this, Camera);
});

exports.Camera = Camera;

_defineProperty(Camera, "x", 0);

_defineProperty(Camera, "y", 0);

_defineProperty(Camera, "width", 0);

_defineProperty(Camera, "height", 0);
});

;require.register("sprite/Sprite.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Sprite = void 0;

var _Bindable = require("curvature/base/Bindable");

var _Camera = require("./Camera");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var Sprite = /*#__PURE__*/function () {
  function Sprite(_ref) {
    var _this = this;

    var src = _ref.src,
        spriteBoard = _ref.spriteBoard,
        spriteSheet = _ref.spriteSheet;

    _classCallCheck(this, Sprite);

    this[_Bindable.Bindable.Prevent] = true;
    this.z = 0;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.scale = 1;
    this.frames = [];
    this.frameDelay = 4;
    this.currentDelay = this.frameDelay;
    this.currentFrame = 0;
    this.currentFrames = '';
    this.speed = 0;
    this.maxSpeed = 8;
    this.moving = false;
    this.RIGHT = 0;
    this.DOWN = 1;
    this.LEFT = 2;
    this.UP = 3;
    this.EAST = this.RIGHT;
    this.SOUTH = this.DOWN;
    this.WEST = this.LEFT;
    this.NORTH = this.UP;
    this.standing = {
      'north': ['player_standing_north.png'],
      'south': ['player_standing_south.png'],
      'west': ['player_standing_west.png'],
      'east': ['player_standing_east.png']
    };
    this.walking = {
      'north': ['player_walking_north.png', 'player_walking_north.png', 'player_standing_north.png', 'player_walking_north2.png', 'player_walking_north2.png', 'player_standing_north.png'],
      'south': ['player_walking_south.png', 'player_walking_south.png', 'player_standing_south.png', 'player_walking_south2.png', 'player_walking_south2.png', 'player_standing_south.png'],
      'west': ['player_walking_west.png', 'player_walking_west.png', 'player_standing_west.png', 'player_standing_west.png', 'player_walking_west2.png', 'player_walking_west2.png', 'player_standing_west.png', 'player_standing_west.png'],
      'east': ['player_walking_east.png', 'player_walking_east.png', 'player_standing_east.png', 'player_standing_east.png', 'player_walking_east2.png', 'player_walking_east2.png', 'player_standing_east.png', 'player_standing_east.png']
    };
    this.spriteBoard = spriteBoard;
    var gl = this.spriteBoard.gl2d.context;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    var r = function r() {
      return parseInt(Math.random() * 255);
    };

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r(), r(), 0, 255]));
    this.spriteSheet = spriteSheet;
    this.spriteSheet.ready.then(function (sheet) {
      var frame = _this.spriteSheet.getFrame(src);

      if (frame) {
        Sprite.loadTexture(_this.spriteBoard.gl2d, _this.spriteSheet, frame).then(function (args) {
          _this.texture = args.texture;
          _this.width = args.image.width * _this.scale;
          _this.height = args.image.height * _this.scale;
        });
      }
    });
  }

  _createClass(Sprite, [{
    key: "draw",
    value: function draw() {
      this.frameDelay = this.maxSpeed - Math.abs(this.speed);

      if (this.frameDelay > this.maxSpeed) {
        this.frameDelay = this.maxSpeed;
      }

      if (this.currentDelay <= 0) {
        this.currentDelay = this.frameDelay;
        this.currentFrame++;
      } else {
        this.currentDelay--;
      }

      if (this.currentFrame >= this.frames.length) {
        this.currentFrame = this.currentFrame - this.frames.length;
      }

      var frame = this.frames[this.currentFrame];

      if (frame) {
        this.texture = frame.texture;
        this.width = frame.width * this.scale;
        this.height = frame.height * this.scale;
      }

      var gl = this.spriteBoard.gl2d.context;
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      this.setRectangle(this.x * this.spriteBoard.gl2d.zoomLevel + -_Camera.Camera.x + _Camera.Camera.width * this.spriteBoard.gl2d.zoomLevel / 2, this.y * this.spriteBoard.gl2d.zoomLevel + -_Camera.Camera.y + _Camera.Camera.height * this.spriteBoard.gl2d.zoomLevel / 2 + -this.height * 0.5 * this.spriteBoard.gl2d.zoomLevel, this.width * this.spriteBoard.gl2d.zoomLevel, this.height * this.spriteBoard.gl2d.zoomLevel);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }, {
    key: "setFrames",
    value: function setFrames(frameSelector) {
      var _this2 = this;

      var framesId = frameSelector.join(' ');

      if (this.currentFrames === framesId) {
        return;
      }

      this.currentFrames = framesId;
      this.spriteSheet.ready.then(function (sheet) {
        var frames = sheet.getFrames(frameSelector).map(function (frame) {
          return Sprite.loadTexture(_this2.spriteBoard.gl2d, _this2.spriteSheet, frame).then(function (args) {
            return {
              texture: args.texture,
              width: args.image.width,
              height: args.image.height
            };
          });
        });
        Promise.all(frames).then(function (frames) {
          _this2.frames = frames;
        });
      });
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      var gl = this.spriteBoard.gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.positionBuffer);
      var x1 = x;
      var x2 = x + width;
      var y1 = y;
      var y2 = y + height;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, this.z, x2, y1, this.z, x1, y2, this.z, x1, y2, this.z, x2, y1, this.z, x2, y2, this.z]), gl.STREAM_DRAW);
    }
  }], [{
    key: "loadTexture",
    value: function loadTexture(gl2d, spriteSheet, imageSrc) {
      var gl = gl2d.context;

      if (!this.promises) {
        this.promises = {};
      }

      if (this.promises[imageSrc]) {
        return this.promises[imageSrc];
      } // console.log(imageSrc);


      this.promises[imageSrc] = Sprite.loadImage(imageSrc).then(function (image) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        return {
          image: image,
          texture: texture
        };
      });
      return this.promises[imageSrc];
    }
  }, {
    key: "loadImage",
    value: function loadImage(src) {
      return new Promise(function (accept, reject) {
        var image = new Image();
        image.src = src;
        image.addEventListener('load', function (event) {
          accept(image);
        });
      });
    }
  }]);

  return Sprite;
}();

exports.Sprite = Sprite;
});

;require.register("sprite/SpriteBoard.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SpriteBoard = void 0;

var _Bag = require("curvature/base/Bag");

var _Background = require("./Background");

var _Gl2d = require("../gl2d/Gl2d");

var _Camera = require("./Camera");

var _Sprite = require("./Sprite");

var _Bindable = require("curvature/base/Bindable");

var _SpriteSheet = require("./SpriteSheet");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var SpriteBoard = /*#__PURE__*/function () {
  function SpriteBoard(element, map) {
    var _this = this;

    _classCallCheck(this, SpriteBoard);

    this[_Bindable.Bindable.Prevent] = true;
    this.map = map;
    this.mouse = {
      x: null,
      y: null,
      clickX: null,
      clickY: null
    };
    this.sprites = new _Bag.Bag();
    _Camera.Camera.width = element.width;
    _Camera.Camera.height = element.height;
    this.gl2d = new _Gl2d.Gl2d(element);
    var gl = this.gl2d.context;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    this.program = this.gl2d.createProgram(this.gl2d.createShader('sprite/texture.vert'), this.gl2d.createShader('sprite/texture.frag'));
    this.overlayProgram = this.gl2d.createProgram(this.gl2d.createShader('overlay/overlay.vert'), this.gl2d.createShader('overlay/overlay.frag'));
    this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
    this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    this.positionBuffer = gl.createBuffer();
    this.texCoordBuffer = gl.createBuffer();
    this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
    this.colorLocation = gl.getUniformLocation(this.program, 'u_color');
    this.overlayLocation = gl.getAttribLocation(this.overlayProgram, 'a_position');
    this.overlayResolution = gl.getUniformLocation(this.overlayProgram, 'u_resolution');
    this.overlayColor = gl.getUniformLocation(this.overlayProgram, 'u_color');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    document.addEventListener('mousemove', function (event) {
      _this.mouse.x = event.clientX;
      _this.mouse.y = event.clientY;
    });
    this.selected = {
      localX: null,
      localY: null,
      globalX: null,
      globalY: null,
      startGlobalX: null,
      startGlobalY: null
    };
    this.selected = _Bindable.Bindable.makeBindable(this.selected);
    this.background = new _Background.Background(this, map);
    var w = 128;
    var spriteSheet = new _SpriteSheet.SpriteSheet();

    for (var i in Array(16).fill()) {
      var barrel = new _Sprite.Sprite({
        src: 'barrel.png',
        spriteBoard: this,
        spriteSheet: spriteSheet
      });
      barrel.x = i * 32 % w;
      barrel.y = Math.trunc(i * 32 / w) * 32;
      this.sprites.add(barrel);
    }

    this.sprites.add(this.background);
  }

  _createClass(SpriteBoard, [{
    key: "unselect",
    value: function unselect() {
      if (this.selected.localX === null) {
        return false;
      }

      this.selected.localX = null;
      this.selected.localY = null;
      this.selected.globalX = null;
      this.selected.globalY = null;
      return true;
    }
  }, {
    key: "draw",
    value: function draw() {
      var gl = this.gl2d.context;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height); // gl.clearColor(0, 0, 0, 0);
      // gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.program);
      gl.uniform2f(this.gl2d.resolutionLocation, _Camera.Camera.width, _Camera.Camera.height);
      var sprites = this.sprites.items();
      window.smProfiling && console.time('sort');
      sprites.sort(function (a, b) {
        if (a instanceof _Background.Background && !(b instanceof _Background.Background)) {
          return -1;
        }

        if (b instanceof _Background.Background && !(a instanceof _Background.Background)) {
          return 1;
        }

        if (a.z === undefined) {
          return -1;
        }

        if (b.z === undefined) {
          return 1;
        }

        return a.z - b.z;
      });

      if (window.smProfiling) {
        console.timeEnd('sort');
        window.smProfiling = false;
      }

      sprites.forEach(function (s) {
        s.z = s instanceof _Background.Background ? -1 : s.y;
        s.draw();
      });
    }
  }, {
    key: "resize",
    value: function resize(x, y) {
      x = x || this.gl2d.element.width;
      y = y || this.gl2d.element.height;
      _Camera.Camera.width = x / this.gl2d.zoomLevel;
      _Camera.Camera.height = y / this.gl2d.zoomLevel;
      this.background.resize(_Camera.Camera.width, _Camera.Camera.height);
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      var gl = this.gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      var x1 = x;
      var x2 = x + width;
      var y1 = y;
      var y2 = y + height;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, this.z, x2, y1, this.z, x1, y2, this.z, x1, y2, this.z, x2, y1, this.z, x2, y2, this.z]), gl.STREAM_DRAW);
    }
  }]);

  return SpriteBoard;
}();

exports.SpriteBoard = SpriteBoard;
});

;require.register("sprite/SpriteSheet.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SpriteSheet = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var SpriteSheet = /*#__PURE__*/function () {
  function SpriteSheet() {
    var _this = this;

    _classCallCheck(this, SpriteSheet);

    this.imageUrl = '/spritesheet.png';
    this.boxesUrl = '/spritesheet.json';
    this.vertices = {};
    this.frames = {};
    this.width = 0;
    this.height = 0;
    var request = new Request(this.boxesUrl);
    var sheetLoader = fetch(request).then(function (response) {
      return response.json();
    }).then(function (boxes) {
      return _this.boxes = boxes;
    });
    var imageLoader = new Promise(function (accept) {
      _this.image = new Image();
      _this.image.src = _this.imageUrl;

      _this.image.onload = function () {
        accept();
      };
    });
    this.ready = Promise.all([sheetLoader, imageLoader]).then(function () {
      return _this.processImage();
    }).then(function () {
      return _this;
    });
  }

  _createClass(SpriteSheet, [{
    key: "processImage",
    value: function processImage() {
      var _this2 = this;

      if (!this.boxes || !this.boxes.frames) {
        return;
      }

      var canvas = document.createElement('canvas');
      canvas.width = this.image.width;
      canvas.height = this.image.height;
      var context = canvas.getContext("2d", {
        willReadFrequently: true
      });
      context.drawImage(this.image, 0, 0);
      var framePromises = [];

      var _loop = function _loop(i) {
        var subCanvas = document.createElement('canvas');
        subCanvas.width = _this2.boxes.frames[i].frame.w;
        subCanvas.height = _this2.boxes.frames[i].frame.h;
        var subContext = subCanvas.getContext("2d");

        if (_this2.boxes.frames[i].frame) {
          subContext.putImageData(context.getImageData(_this2.boxes.frames[i].frame.x, _this2.boxes.frames[i].frame.y, _this2.boxes.frames[i].frame.w, _this2.boxes.frames[i].frame.h), 0, 0);
        }

        if (_this2.boxes.frames[i].text) {
          subContext.fillStyle = _this2.boxes.frames[i].color || 'white';
          subContext.font = _this2.boxes.frames[i].font || "".concat(_this2.boxes.frames[i].frame.h, "px sans-serif");
          subContext.textAlign = 'center';
          subContext.fillText(_this2.boxes.frames[i].text, _this2.boxes.frames[i].frame.w / 2, _this2.boxes.frames[i].frame.h, _this2.boxes.frames[i].frame.w);
          subContext.textAlign = null;
          subContext.font = null;
        }

        framePromises.push(new Promise(function (accept) {
          subCanvas.toBlob(function (blob) {
            _this2.frames[_this2.boxes.frames[i].filename] = URL.createObjectURL(blob);
            accept(_this2.frames[_this2.boxes.frames[i].filename]);
          });
        })); // let u1 = this.boxes.frames[i].frame.x / this.image.width;
        // let v1 = this.boxes.frames[i].frame.y / this.image.height;
        // let u2 = (this.boxes.frames[i].frame.x + this.boxes.frames[i].frame.w)
        // 	/ this.image.width;
        // let v2 = (this.boxes.frames[i].frame.y + this.boxes.frames[i].frame.h)
        // 	/ this.image.height;
        // this.vertices[this.boxes.frames[i].filename] = {
        // 	u1,v1,u2,v2
        // };
      };

      for (var i in this.boxes.frames) {
        _loop(i);
      }

      return Promise.all(framePromises);
    }
  }, {
    key: "getVertices",
    value: function getVertices(filename) {
      return this.vertices[filename];
    }
  }, {
    key: "getFrame",
    value: function getFrame(filename) {
      return this.frames[filename];
    }
  }, {
    key: "getFrames",
    value: function getFrames(frameSelector) {
      var _this3 = this;

      if (Array.isArray(frameSelector)) {
        return frameSelector.map(function (name) {
          return _this3.getFrame(name);
        });
      }

      return this.getFramesByPrefix(frameSelector);
    }
  }, {
    key: "getFramesByPrefix",
    value: function getFramesByPrefix(prefix) {
      var frames = [];

      for (var i in this.frames) {
        if (i.substring(0, prefix.length) !== prefix) {
          continue;
        }

        frames.push(this.frames[i]);
      }

      return frames;
    }
  }], [{
    key: "loadTexture",
    value: function loadTexture(gl2d, imageSrc) {
      var gl = gl2d.context;

      if (!this.texturePromises) {
        this.texturePromises = {};
      }

      if (this.texturePromises[imageSrc]) {
        return this.texturePromises[imageSrc];
      }

      return this.texturePromises[imageSrc] = this.loadImage(imageSrc).then(function (image) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        /*/
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        /*/

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); //*/

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        return {
          image: image,
          texture: texture
        };
      });
    }
  }, {
    key: "loadImage",
    value: function loadImage(src) {
      if (!this.imagePromises) {
        this.imagePromises = {};
      }

      if (this.imagePromises[src]) {
        return this.imagePromises[src];
      }

      this.imagePromises[src] = new Promise(function (accept, reject) {
        var image = new Image();
        image.src = src;
        image.addEventListener('load', function (event) {
          accept(image);
        });
      });
      return this.imagePromises[src];
    }
  }]);

  return SpriteSheet;
}();

exports.SpriteSheet = SpriteSheet;
});

;require.register("sprite/Surface.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Surface = void 0;

var _Bindable = require("curvature/base/Bindable");

var _Camera = require("./Camera");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var Surface = /*#__PURE__*/function () {
  function Surface(spriteBoard, spriteSheet, map) {
    var _this = this;

    var xSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 2;
    var ySize = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 2;
    var xOffset = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
    var yOffset = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 0;
    var layer = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : 0;
    var z = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : -1;

    _classCallCheck(this, Surface);

    this[_Bindable.Bindable.Prevent] = true;
    this.spriteBoard = spriteBoard;
    this.spriteSheet = spriteSheet;
    this.x = xOffset;
    this.y = yOffset;
    this.z = z;
    this.layer = layer;
    this.xSize = xSize;
    this.ySize = ySize;
    this.tileWidth = 32;
    this.tileHeight = 32;
    this.width = this.xSize * this.tileWidth;
    this.height = this.ySize * this.tileHeight;
    this.map = map;
    this.texVertices = [];
    var gl = this.spriteBoard.gl2d.context;
    this.subTextures = {};
    this.loaded = false;
    this.spriteSheet.ready.then(function (sheet) {
      var texturePromises = [];

      var _loop = function _loop(i) {
        var vertices = void 0;
        var localX = i % _this.xSize;
        var offsetX = Math.floor(_this.x / _this.tileWidth);
        var globalX = localX + offsetX;
        var localY = Math.floor(i / _this.xSize);
        var offsetY = Math.floor(_this.y / _this.tileHeight);
        var globalY = localY + offsetY;
        var frames = i > 10 ? _this.map.getTile(globalX, globalY, _this.layer) : _this.map.getTile(-1, -1, _this.layer);

        if (Array.isArray(frames)) {
          var j = 0;
          _this.subTextures[i] = [];
          texturePromises.push(Promise.all(frames.map(function (frame) {
            return _this.spriteSheet.constructor.loadTexture(_this.spriteBoard.gl2d, frame).then(function (args) {
              _this.subTextures[i][j] = args.texture;
              j++;
            });
          })));
        } else {
          texturePromises.push(_this.spriteSheet.constructor.loadTexture(gl2d, frames).then(function (args) {
            return _this.subTextures[i] = args.texture;
          }));
        }
      };

      for (var i = 0; i < _this.xSize * _this.ySize; i++) {
        _loop(i);
      }

      Promise.all(texturePromises).then(function () {
        _this.assemble();

        _this.loaded = true;
      });
    });
    this.pane = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.pane);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //*/

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    /*/
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //*/

    this.frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    var attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.pane, 0);
  }

  _createClass(Surface, [{
    key: "draw",
    value: function draw() {
      var gl = this.spriteBoard.gl2d.context;
      gl.bindTexture(gl.TEXTURE_2D, this.pane);
      var x = this.x + -_Camera.Camera.x + _Camera.Camera.width * this.spriteBoard.gl2d.zoomLevel / 2;
      var y = this.y + -_Camera.Camera.y + _Camera.Camera.height * this.spriteBoard.gl2d.zoomLevel / 2;
      this.setRectangle(x, y, this.width * this.spriteBoard.gl2d.zoomLevel, this.height * this.spriteBoard.gl2d.zoomLevel);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }, {
    key: "assemble",
    value: function assemble() {
      var gl = this.spriteBoard.gl2d.context;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
      gl.viewport(0, 0, this.width, this.height); // gl.clearColor(0, 0, 0, 1);

      gl.clearColor(Math.random(), Math.random(), Math.random(), 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform4f(this.spriteBoard.colorLocation, 1, 0, 0, 1);
      gl.uniform2f(this.spriteBoard.resolutionLocation, this.width, this.height);

      if (this.subTextures[0][0]) {
        gl.bindTexture(gl.TEXTURE_2D, this.subTextures[0][0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, this.width / 32, 0.0, 0.0, -this.height / 32, 0.0, -this.height / 32, this.width / 32, 0.0, this.width / 32, -this.height / 32]), gl.STATIC_DRAW);
        this.setRectangle(0, 0, this.width, this.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      var x = 0;
      var y = 0;

      for (var i in this.subTextures) {
        if (!Array.isArray(this.subTextures[i])) {
          this.subTextures[i] = [this.subTextures[i]];
        }

        for (var j in this.subTextures[i]) {
          gl.bindTexture(gl.TEXTURE_2D, this.subTextures[i][j]);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.texCoordBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
          this.setRectangle(x, y + this.tileHeight, this.tileWidth, -this.tileHeight);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        x += this.tileWidth;

        if (x >= this.width) {
          x = 0;
          y += this.tileHeight;
        }
      } // gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      var gl = this.spriteBoard.gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.positionBuffer);
      var x1 = x;
      var x2 = x + width;
      var y1 = y;
      var y2 = y + height;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y2, this.z, x2, y2, this.z, x1, y1, this.z, x1, y1, this.z, x2, y2, this.z, x2, y1, this.z]), gl.STATIC_DRAW);
    }
  }]);

  return Surface;
}();

exports.Surface = Surface;
});

;require.register("sprite/TextureBank.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TextureBank = void 0;

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TextureBank = /*#__PURE__*/_createClass(function TextureBank() {
  _classCallCheck(this, TextureBank);
});

exports.TextureBank = TextureBank;
});

;require.register("sprite/texture.frag", function(exports, require, module) {
module.exports = "// texture.fragZ\n\nprecision mediump float;\n\nuniform vec4      u_color;\nuniform sampler2D u_image;\nvarying vec2      v_texCoord;\n\nvoid main() {\n  gl_FragColor = texture2D(u_image, v_texCoord);\n  // gl_FragColor.w = gl_FragColor.w * 0.5;\n  // gl_FragColor = vec4(1.0,0.0,1.0,1.0);\n  // gl_FragColor = gl_PointCoord.yyxx;\n}\n"
});

;require.register("sprite/texture.vert", function(exports, require, module) {
module.exports = "// texture.vert\n\nattribute vec3 a_position;\nattribute vec2 a_texCoord;\n\nuniform   vec2 u_resolution;\n\nvarying   vec2 v_texCoord;\n\nvoid main()\n{\n  vec2 zeroToOne = a_position.xy / u_resolution;\n  vec2 zeroToTwo = zeroToOne * 2.0;\n  vec2 clipSpace = zeroToTwo - 1.0;\n\n  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n  v_texCoord  = a_texCoord;\n}\n"
});

;require.register("ui/Controller.js", function(exports, require, module) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Controller = void 0;

var _View2 = require("curvature/base/View");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var Controller = /*#__PURE__*/function (_View) {
  _inherits(Controller, _View);

  var _super = _createSuper(Controller);

  function Controller(args) {
    var _this;

    _classCallCheck(this, Controller);

    _this = _super.call(this, args);
    _this.template = require('./controller.tmp');
    _this.dragStart = false;
    _this.args.dragging = false;
    _this.args.x = 0;
    _this.args.y = 0;
    window.addEventListener('mousemove', function (event) {
      _this.moveStick(event);
    });
    window.addEventListener('mouseup', function (event) {
      _this.dropStick(event);
    });
    window.addEventListener('touchmove', function (event) {
      _this.moveStick(event);
    });
    window.addEventListener('touchend', function (event) {
      _this.dropStick(event);
    });
    return _this;
  }

  _createClass(Controller, [{
    key: "dragStick",
    value: function dragStick(event) {
      var pos = event;
      event.preventDefault();

      if (event.touches && event.touches[0]) {
        pos = event.touches[0];
      }

      this.args.dragging = true;
      this.dragStart = {
        x: pos.clientX,
        y: pos.clientY
      };
    }
  }, {
    key: "moveStick",
    value: function moveStick(event) {
      if (this.args.dragging) {
        var pos = event;

        if (event.touches && event.touches[0]) {
          pos = event.touches[0];
        }

        this.args.xx = pos.clientX - this.dragStart.x;
        this.args.yy = pos.clientY - this.dragStart.y;
        var limit = 50;

        if (this.args.xx < -limit) {
          this.args.x = -limit;
        } else if (this.args.xx > limit) {
          this.args.x = limit;
        } else {
          this.args.x = this.args.xx;
        }

        if (this.args.yy < -limit) {
          this.args.y = -limit;
        } else if (this.args.yy > limit) {
          this.args.y = limit;
        } else {
          this.args.y = this.args.yy;
        }
      }
    }
  }, {
    key: "dropStick",
    value: function dropStick(event) {
      this.args.dragging = false;
      this.args.x = 0;
      this.args.y = 0;
    }
  }]);

  return Controller;
}(_View2.View);

exports.Controller = Controller;
});

;require.register("ui/MapEditor.js", function(exports, require, module) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MapEditor = void 0;

var _View2 = require("curvature/base/View");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var MapEditor = /*#__PURE__*/function (_View) {
  _inherits(MapEditor, _View);

  var _super = _createSuper(MapEditor);

  function MapEditor(args) {
    var _this;

    _classCallCheck(this, MapEditor);

    _this = _super.call(this, args);
    _this.template = require('./mapEditor.tmp');
    args.spriteSheet.ready.then(function (sheet) {
      _this.args.tiles = sheet.frames;
    });

    _this.args.bindTo('selectedGraphic', function (v) {
      _this.args.selectedGraphic = null;
    }, {
      wait: 0
    });

    _this.args.multiSelect = false;
    _this.args.selection = {};
    _this.args.selectedImage = null;
    return _this;
  }

  _createClass(MapEditor, [{
    key: "selectGraphic",
    value: function selectGraphic(src) {
      console.log(src);
      this.args.selectedGraphic = src;
    }
  }, {
    key: "select",
    value: function select(selection) {
      Object.assign(this.args.selection, selection);

      if (selection.globalX !== selection.startGlobalX || selection.globalY !== selection.startGlobalY) {
        this.args.multiSelect = true;
      } else {
        this.args.multiSelect = false;
      }

      if (!this.args.multiSelect) {
        this.args.selectedImages = this.args.map.getTile(selection.globalX, selection.globalY);
      }
    }
  }]);

  return MapEditor;
}(_View2.View);

exports.MapEditor = MapEditor;
});

;require.register("ui/controller.tmp.html", function(exports, require, module) {
module.exports = "<div class = \"controller\">\n\t<div class = \"joystick\" cv-on = \"\n\t\ttouchstart:dragStick(event);\n\t\tmousedown:dragStick(event);\n\t\">\n\t\t<div class = \"pad\" style = \"position: relative; transform:translate([[x]]px,[[y]]px);\"></div>\n\t</div>\n\n\t<div class = \"button\">A</div>\n\t<div class = \"button\">B</div>\n\t<div class = \"button\">C</div>\n</div>"
});

;require.register("ui/mapEditor.tmp.html", function(exports, require, module) {
module.exports = "<div class = \"tab-page mapEditor\">\n\t<div class = \"tabs\">\n\t\t<div>Tile</div>\n\t\t<div>Layer</div>\n\t\t<div>Object</div>\n\t\t<div>Trigger</div>\n\t\t<div>Map</div>\n\t</div>\n\n\t<div class = \"tile\">\n\t\t<div class = \"selected\">\n\t\t\t<div cv-if = \"!multiSelect\">\n\t\t\t\t<p style = \"font-size: large\">\n\t\t\t\t\t([[selection.globalX]], [[selection.globalY]])\n\t\t\t\t</p>\n\t\t\t\t<p cv-each = \"selectedImages:selectedImage:sI\">\n\t\t\t\t\t<button>-</button>\n\t\t\t\t\t<img class = \"current\" cv-attr = \"src:selectedImage\">\n\t\t\t\t</p>\n\t\t\t\t<button>+</button>\n\t\t\t</div>\n\t\t\t<div cv-if = \"multiSelect\">\n\t\t\t\t<p style = \"font-size: large\">\n\t\t\t\t\t([[selection.startGlobalX]], [[selection.startGlobalY]]) - ([[selection.globalX]], [[selection.globalY]])\n\t\t\t\t</p>\n\t\t\t</div>\n\t\t</div>\n\t\t<div class = \"tiles\" cv-each = \"tiles:tile:t\">\n\t\t\t<img cv-attr = \"src:tile,title:t\" cv-on = \"click:selectGraphic(t);\">\n\t\t</div>\n\t</div>\n\t<!-- <div class = \"tile\">OBJECT MODE</div>\n\t<div class = \"tile\">TRIGGER MODE</div>\n\t<div class = \"tile\">MAP MODE</div> -->\n</div>"
});

;require.register("world/Actor.js", function(exports, require, module) {
"use strict";
});

;require.register("world/Floor.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Floor = void 0;

var _Sprite = require("../sprite/Sprite");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var Floor = /*#__PURE__*/function () {
  function Floor(gl2d, args) {
    _classCallCheck(this, Floor);

    this.gl2d = gl2d;
    this.sprites = []; // this.resize(60, 34);

    this.resize(9, 9); // this.resize(60*2, 34*2);
  }

  _createClass(Floor, [{
    key: "resize",
    value: function resize(width, height) {
      this.width = width;
      this.height = height;

      for (var x = 0; x < width; x++) {
        for (var y = 0; y < height; y++) {
          var sprite = new _Sprite.Sprite(this.gl2d, '/floorTile.png');
          sprite.x = 32 * x;
          sprite.y = 32 * y;
          this.sprites.push(sprite);
        }
      }
    }
  }, {
    key: "draw",
    value: function draw() {
      this.sprites.map(function (s) {
        return s.draw();
      });
    }
  }]);

  return Floor;
}();

exports.Floor = Floor;
});

;require.register("world/Map.js", function(exports, require, module) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Map = void 0;

var _SpriteSheet = require("../sprite/SpriteSheet");

var _Injectable = require("../inject/Injectable");

var _Bindable = require("curvature/base/Bindable");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var Map = /*#__PURE__*/function (_Injectable$inject) {
  _inherits(Map, _Injectable$inject);

  var _super = _createSuper(Map);

  function Map() {
    var _this;

    _classCallCheck(this, Map);

    _this = _super.call(this);
    _this[_Bindable.Bindable.Prevent] = true;
    _this.tiles = {};
    return _this;
  }

  _createClass(Map, [{
    key: "getTile",
    value: function getTile(x, y) {
      var layer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

      if (this.tiles["".concat(x, ",").concat(y, "--").concat(layer)]) {
        return [this.SpriteSheet.getFrame(this.tiles["".concat(x, ",").concat(y, "--").concat(layer)])];
      }

      var split = 4;
      var second = 'rock_4.png';

      if (x % split === 0 && y % split === 0) {
        second = 'cheese.png';
      }

      if (x === -1 && y === -1) {
        return [// this.SpriteSheet.getFrame('floorTile.png')
        this.SpriteSheet.getFrame('box_face.png')];
      }

      return [this.SpriteSheet.getFrame('floorTile.png') // this.SpriteSheet.getFrame('box_face.png')
      ];
      return [this.SpriteSheet.getFrame('floorTile.png'), this.SpriteSheet.getFrame(second)];
    }
  }, {
    key: "setTile",
    value: function setTile(x, y, image) {
      var layer = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
      this.tiles["".concat(x, ",").concat(y, "--").concat(layer)] = image;
    }
  }, {
    key: "export",
    value: function _export() {
      console.log(JSON.stringify(this.tiles));
    }
  }, {
    key: "import",
    value: function _import(input) {
      input = "{\"-2,11\":\"lava_center_middle.png\",\"-1,11\":\"lava_center_middle.png\",\"0,11\":\"lava_center_middle.png\"}";
      this.tiles = JSON.parse(input); // console.log(JSON.parse(input));
    }
  }]);

  return Map;
}(_Injectable.Injectable.inject({
  SpriteSheet: _SpriteSheet.SpriteSheet
})); // {"-2,11":"lava_center_middle.png","-1,11":"lava_center_middle.png","0,11":"lava_center_middle.png"}


exports.Map = Map;
});

;require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');

"use strict";

/* jshint ignore:start */
(function () {
  var WebSocket = window.WebSocket || window.MozWebSocket;
  var br = window.brunch = window.brunch || {};
  var ar = br['auto-reload'] = br['auto-reload'] || {};
  if (!WebSocket || ar.disabled) return;
  if (window._ar) return;
  window._ar = true;

  var cacheBuster = function cacheBuster(url) {
    var date = Math.round(Date.now() / 1000).toString();
    url = url.replace(/(\&|\\?)cacheBuster=\d*/, '');
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'cacheBuster=' + date;
  };

  var browser = navigator.userAgent.toLowerCase();
  var forceRepaint = ar.forceRepaint || browser.indexOf('chrome') > -1;
  var reloaders = {
    page: function page() {
      window.location.reload(true);
    },
    stylesheet: function stylesheet() {
      [].slice.call(document.querySelectorAll('link[rel=stylesheet]')).filter(function (link) {
        var val = link.getAttribute('data-autoreload');
        return link.href && val != 'false';
      }).forEach(function (link) {
        link.href = cacheBuster(link.href);
      }); // Hack to force page repaint after 25ms.

      if (forceRepaint) setTimeout(function () {
        document.body.offsetHeight;
      }, 25);
    },
    javascript: function javascript() {
      var scripts = [].slice.call(document.querySelectorAll('script'));
      var textScripts = scripts.map(function (script) {
        return script.text;
      }).filter(function (text) {
        return text.length > 0;
      });
      var srcScripts = scripts.filter(function (script) {
        return script.src;
      });
      var loaded = 0;
      var all = srcScripts.length;

      var onLoad = function onLoad() {
        loaded = loaded + 1;

        if (loaded === all) {
          textScripts.forEach(function (script) {
            eval(script);
          });
        }
      };

      srcScripts.forEach(function (script) {
        var src = script.src;
        script.remove();
        var newScript = document.createElement('script');
        newScript.src = cacheBuster(src);
        newScript.async = true;
        newScript.onload = onLoad;
        document.head.appendChild(newScript);
      });
    }
  };
  var port = ar.port || 9485;
  var host = br.server || window.location.hostname || 'localhost';

  var connect = function connect() {
    var connection = new WebSocket('ws://' + host + ':' + port);

    connection.onmessage = function (event) {
      if (ar.disabled) return;
      var message = event.data;
      var reloader = reloaders[message] || reloaders.page;
      reloader();
    };

    connection.onerror = function () {
      if (connection.readyState) connection.close();
    };

    connection.onclose = function () {
      window.setTimeout(connect, 1000);
    };
  };

  connect();
})();
/* jshint ignore:end */
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9CYWcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL0RvbS5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9NaXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1RhZy5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9VdWlkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzIiwiYXBwL0NvbmZpZy5qcyIsImFwcC9nbDJkL0dsMmQuanMiLCJhcHAvaG9tZS9WaWV3LmpzIiwiYXBwL2hvbWUvdmlldy50bXAuaHRtbCIsImFwcC9pbml0aWFsaXplLmpzIiwiYXBwL2luamVjdC9Db250YWluZXIuanMiLCJhcHAvaW5qZWN0L0luamVjdGFibGUuanMiLCJhcHAvaW5qZWN0L1NpbmdsZS5qcyIsImFwcC9tb2RlbC9Db250cm9sbGVyLmpzIiwiYXBwL21vZGVsL0VudGl0eS5qcyIsImFwcC9vdmVybGF5L292ZXJsYXkuZnJhZyIsImFwcC9vdmVybGF5L292ZXJsYXkudmVydCIsImFwcC9zcHJpdGUvQmFja2dyb3VuZC5qcyIsImFwcC9zcHJpdGUvQ2FtZXJhLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGUuanMiLCJhcHAvc3ByaXRlL1Nwcml0ZUJvYXJkLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGVTaGVldC5qcyIsImFwcC9zcHJpdGUvU3VyZmFjZS5qcyIsImFwcC9zcHJpdGUvVGV4dHVyZUJhbmsuanMiLCJhcHAvc3ByaXRlL3RleHR1cmUuZnJhZyIsImFwcC9zcHJpdGUvdGV4dHVyZS52ZXJ0IiwiYXBwL3VpL0NvbnRyb2xsZXIuanMiLCJhcHAvdWkvTWFwRWRpdG9yLmpzIiwiYXBwL3VpL2NvbnRyb2xsZXIudG1wLmh0bWwiLCJhcHAvdWkvbWFwRWRpdG9yLnRtcC5odG1sIiwiYXBwL3dvcmxkL0Zsb29yLmpzIiwiYXBwL3dvcmxkL01hcC5qcyIsIm5vZGVfbW9kdWxlcy9hdXRvLXJlbG9hZC1icnVuY2gvdmVuZG9yL2F1dG8tcmVsb2FkLmpzIl0sIm5hbWVzIjpbIkNvbmZpZyIsInRpdGxlIiwiR2wyZCIsImVsZW1lbnQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjb250ZXh0IiwiZ2V0Q29udGV4dCIsInNjcmVlblNjYWxlIiwiem9vbUxldmVsIiwiZGVsZXRlUHJvZ3JhbSIsInByb2dyYW0iLCJsb2NhdGlvbiIsImV4dGVuc2lvbiIsInN1YnN0cmluZyIsImxhc3RJbmRleE9mIiwidHlwZSIsInRvVXBwZXJDYXNlIiwiVkVSVEVYX1NIQURFUiIsIkZSQUdNRU5UX1NIQURFUiIsInNoYWRlciIsImNyZWF0ZVNoYWRlciIsInNvdXJjZSIsInJlcXVpcmUiLCJzaGFkZXJTb3VyY2UiLCJjb21waWxlU2hhZGVyIiwic3VjY2VzcyIsImdldFNoYWRlclBhcmFtZXRlciIsIkNPTVBJTEVfU1RBVFVTIiwiY29uc29sZSIsImVycm9yIiwiZ2V0U2hhZGVySW5mb0xvZyIsImRlbGV0ZVNoYWRlciIsInZlcnRleFNoYWRlciIsImZyYWdtZW50U2hhZGVyIiwiY3JlYXRlUHJvZ3JhbSIsImF0dGFjaFNoYWRlciIsImxpbmtQcm9ncmFtIiwiZGV0YWNoU2hhZGVyIiwiZ2V0UHJvZ3JhbVBhcmFtZXRlciIsIkxJTktfU1RBVFVTIiwiZ2V0UHJvZ3JhbUluZm9Mb2ciLCJBcHBsaWNhdGlvbiIsIm9uU2NyZWVuSm95UGFkIiwiT25TY3JlZW5Kb3lQYWQiLCJrZXlib2FyZCIsIktleWJvYXJkIiwiZ2V0IiwiVmlldyIsImFyZ3MiLCJ3aW5kb3ciLCJzbVByb2ZpbGluZyIsInRlbXBsYXRlIiwicm91dGVzIiwiZW50aXRpZXMiLCJCYWciLCJzcGVlZCIsIm1heFNwZWVkIiwiY29udHJvbGxlciIsImZwcyIsInNwcyIsImNhbVgiLCJjYW1ZIiwiZnJhbWVMb2NrIiwic2ltdWxhdGlvbkxvY2siLCJzaG93RWRpdG9yIiwibGlzdGVuaW5nIiwia2V5cyIsImJpbmRUbyIsInYiLCJrIiwidCIsImQiLCJtYXAiLCJzcHJpdGVCb2FyZCIsInVuc2VsZWN0Iiwic3ByaXRlU2hlZXQiLCJTcHJpdGVTaGVldCIsIldvcmxkTWFwIiwibWFwRWRpdG9yIiwiTWFwRWRpdG9yIiwiU3ByaXRlQm9hcmQiLCJ0YWdzIiwiY2FudmFzIiwiZW50aXR5IiwiRW50aXR5Iiwic3ByaXRlIiwiU3ByaXRlIiwic3JjIiwidW5kZWZpbmVkIiwiQ29udHJvbGxlciIsImNhbWVyYSIsIkNhbWVyYSIsImFkZCIsInNwcml0ZXMiLCJ6b29tIiwic2VsZWN0ZWQiLCJnbG9iYWxYIiwiaSIsInN0YXJ0R2xvYmFsWCIsImlpIiwiaiIsInN0YXJ0R2xvYmFsWSIsImpqIiwiZ2xvYmFsWSIsInNldFRpbGUiLCJyZXNpemUiLCJwIiwibG9jYWxYIiwic2VsZWN0Iiwid2FpdCIsImFkZEV2ZW50TGlzdGVuZXIiLCJmVGhlbiIsInNUaGVuIiwiZlNhbXBsZXMiLCJzU2FtcGxlcyIsIm1heFNhbXBsZXMiLCJzaW11bGF0ZSIsIm5vdyIsImRlbHRhIiwidXBkYXRlIiwiT2JqZWN0IiwidmFsdWVzIiwiaXRlbXMiLCJlIiwiX3NwcyIsInB1c2giLCJsZW5ndGgiLCJzaGlmdCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsImRyYXciLCJfZnBzIiwiTnVtYmVyIiwieCIsInRvRml4ZWQiLCJ5IiwiZ2wyZCIsImJvZHkiLCJjbGllbnRXaWR0aCIsInNldEludGVydmFsIiwicGVyZm9ybWFuY2UiLCJyZWR1Y2UiLCJhIiwiYiIsInBhZFN0YXJ0Iiwid2lkdGgiLCJoZWlnaHQiLCJjbGllbnRIZWlnaHQiLCJyd2lkdGgiLCJNYXRoIiwidHJ1bmMiLCJyaGVpZ2h0Iiwib2xkU2NhbGUiLCJldmVudCIsImRlbHRhWSIsIm1heCIsIm1pbiIsInN0ZXAiLCJCYXNlVmlldyIsIlByb3h5IiwidmlldyIsIlJvdXRlciIsImxpc3RlbiIsInJlbmRlciIsIkNvbnRhaW5lciIsImluamVjdGlvbnMiLCJjb25zdHJ1Y3RvciIsImFzc2lnbiIsIkluamVjdGFibGUiLCJjbGFzc2VzIiwib2JqZWN0cyIsIm5hbWUiLCJpbmplY3Rpb24iLCJwcm90b3R5cGUiLCJ0ZXN0IiwiU3RyaW5nIiwiaW5zdGFuY2UiLCJkZWZpbmVQcm9wZXJ0eSIsImVudW1lcmFibGUiLCJ3cml0YWJsZSIsInZhbHVlIiwiRXJyb3IiLCJleGlzdGluZ0luamVjdGlvbnMiLCJTaW5nbGUiLCJyYW5kb20iLCJzaW5nbGUiLCJCaW5kYWJsZSIsIm1ha2VCaW5kYWJsZSIsImtleVByZXNzIiwia2V5UmVsZWFzZSIsImF4aXMiLCJrZXkiLCJwcmV2IiwidHJpZ2dlcnMiLCJkaXJlY3Rpb24iLCJzdGF0ZSIsInhBeGlzIiwieUF4aXMiLCJsb2ciLCJjZWlsIiwiZmxvb3IiLCJob3Jpem9udGFsIiwiYWJzIiwiZnJhbWVzIiwic2V0RnJhbWVzIiwiQmFja2dyb3VuZCIsImxheWVyIiwicGFuZXMiLCJwYW5lc1hZIiwibWF4UGFuZXMiLCJ0aWxlV2lkdGgiLCJ0aWxlSGVpZ2h0Iiwic3VyZmFjZVdpZHRoIiwic3VyZmFjZUhlaWdodCIsImZvcmNlVXBkYXRlIiwicGFuZSIsInBhbmVYIiwicGFuZVkiLCJTdXJmYWNlIiwiY2VudGVyWCIsImNlbnRlclkiLCJyYW5nZSIsInJlbmRlclBhbmUiLCJmb3JFYWNoIiwicG9wIiwiUHJldmVudCIsInoiLCJzY2FsZSIsImZyYW1lRGVsYXkiLCJjdXJyZW50RGVsYXkiLCJjdXJyZW50RnJhbWUiLCJjdXJyZW50RnJhbWVzIiwibW92aW5nIiwiUklHSFQiLCJET1dOIiwiTEVGVCIsIlVQIiwiRUFTVCIsIlNPVVRIIiwiV0VTVCIsIk5PUlRIIiwic3RhbmRpbmciLCJ3YWxraW5nIiwiZ2wiLCJ0ZXh0dXJlIiwiY3JlYXRlVGV4dHVyZSIsImJpbmRUZXh0dXJlIiwiVEVYVFVSRV8yRCIsInIiLCJwYXJzZUludCIsInRleEltYWdlMkQiLCJSR0JBIiwiVU5TSUdORURfQllURSIsIlVpbnQ4QXJyYXkiLCJyZWFkeSIsInRoZW4iLCJzaGVldCIsImZyYW1lIiwiZ2V0RnJhbWUiLCJsb2FkVGV4dHVyZSIsImltYWdlIiwic2V0UmVjdGFuZ2xlIiwiZHJhd0FycmF5cyIsIlRSSUFOR0xFUyIsImZyYW1lU2VsZWN0b3IiLCJmcmFtZXNJZCIsImpvaW4iLCJnZXRGcmFtZXMiLCJQcm9taXNlIiwiYWxsIiwiYmluZEJ1ZmZlciIsIkFSUkFZX0JVRkZFUiIsInBvc2l0aW9uQnVmZmVyIiwieDEiLCJ4MiIsInkxIiwieTIiLCJidWZmZXJEYXRhIiwiRmxvYXQzMkFycmF5IiwiU1RSRUFNX0RSQVciLCJpbWFnZVNyYyIsInByb21pc2VzIiwibG9hZEltYWdlIiwidGV4UGFyYW1ldGVyaSIsIlRFWFRVUkVfV1JBUF9TIiwiQ0xBTVBfVE9fRURHRSIsIlRFWFRVUkVfV1JBUF9UIiwiVEVYVFVSRV9NSU5fRklMVEVSIiwiTkVBUkVTVCIsIlRFWFRVUkVfTUFHX0ZJTFRFUiIsImFjY2VwdCIsInJlamVjdCIsIkltYWdlIiwibW91c2UiLCJjbGlja1giLCJjbGlja1kiLCJibGVuZEZ1bmMiLCJTUkNfQUxQSEEiLCJPTkVfTUlOVVNfU1JDX0FMUEhBIiwiZW5hYmxlIiwiQkxFTkQiLCJvdmVybGF5UHJvZ3JhbSIsInBvc2l0aW9uTG9jYXRpb24iLCJnZXRBdHRyaWJMb2NhdGlvbiIsInRleENvb3JkTG9jYXRpb24iLCJjcmVhdGVCdWZmZXIiLCJ0ZXhDb29yZEJ1ZmZlciIsInJlc29sdXRpb25Mb2NhdGlvbiIsImdldFVuaWZvcm1Mb2NhdGlvbiIsImNvbG9yTG9jYXRpb24iLCJvdmVybGF5TG9jYXRpb24iLCJvdmVybGF5UmVzb2x1dGlvbiIsIm92ZXJsYXlDb2xvciIsImVuYWJsZVZlcnRleEF0dHJpYkFycmF5IiwidmVydGV4QXR0cmliUG9pbnRlciIsIkZMT0FUIiwiY2xpZW50WCIsImNsaWVudFkiLCJsb2NhbFkiLCJiYWNrZ3JvdW5kIiwidyIsIkFycmF5IiwiZmlsbCIsImJhcnJlbCIsImJpbmRGcmFtZWJ1ZmZlciIsIkZSQU1FQlVGRkVSIiwidmlld3BvcnQiLCJ1bmlmb3JtMmYiLCJ1c2VQcm9ncmFtIiwidGltZSIsInNvcnQiLCJ0aW1lRW5kIiwicyIsImltYWdlVXJsIiwiYm94ZXNVcmwiLCJ2ZXJ0aWNlcyIsInJlcXVlc3QiLCJSZXF1ZXN0Iiwic2hlZXRMb2FkZXIiLCJmZXRjaCIsInJlc3BvbnNlIiwianNvbiIsImJveGVzIiwiaW1hZ2VMb2FkZXIiLCJvbmxvYWQiLCJwcm9jZXNzSW1hZ2UiLCJ3aWxsUmVhZEZyZXF1ZW50bHkiLCJkcmF3SW1hZ2UiLCJmcmFtZVByb21pc2VzIiwic3ViQ2FudmFzIiwiaCIsInN1YkNvbnRleHQiLCJwdXRJbWFnZURhdGEiLCJnZXRJbWFnZURhdGEiLCJ0ZXh0IiwiZmlsbFN0eWxlIiwiY29sb3IiLCJmb250IiwidGV4dEFsaWduIiwiZmlsbFRleHQiLCJ0b0Jsb2IiLCJibG9iIiwiZmlsZW5hbWUiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJpc0FycmF5IiwiZ2V0RnJhbWVzQnlQcmVmaXgiLCJwcmVmaXgiLCJ0ZXh0dXJlUHJvbWlzZXMiLCJSRVBFQVQiLCJpbWFnZVByb21pc2VzIiwieFNpemUiLCJ5U2l6ZSIsInhPZmZzZXQiLCJ5T2Zmc2V0IiwidGV4VmVydGljZXMiLCJzdWJUZXh0dXJlcyIsImxvYWRlZCIsIm9mZnNldFgiLCJvZmZzZXRZIiwiZ2V0VGlsZSIsImFzc2VtYmxlIiwiZnJhbWVCdWZmZXIiLCJjcmVhdGVGcmFtZWJ1ZmZlciIsImF0dGFjaG1lbnRQb2ludCIsIkNPTE9SX0FUVEFDSE1FTlQwIiwiZnJhbWVidWZmZXJUZXh0dXJlMkQiLCJjbGVhckNvbG9yIiwiY2xlYXIiLCJDT0xPUl9CVUZGRVJfQklUIiwiREVQVEhfQlVGRkVSX0JJVCIsInVuaWZvcm00ZiIsIlNUQVRJQ19EUkFXIiwiVGV4dHVyZUJhbmsiLCJkcmFnU3RhcnQiLCJkcmFnZ2luZyIsIm1vdmVTdGljayIsImRyb3BTdGljayIsInBvcyIsInByZXZlbnREZWZhdWx0IiwidG91Y2hlcyIsInh4IiwieXkiLCJsaW1pdCIsInRpbGVzIiwic2VsZWN0ZWRHcmFwaGljIiwibXVsdGlTZWxlY3QiLCJzZWxlY3Rpb24iLCJzZWxlY3RlZEltYWdlIiwic2VsZWN0ZWRJbWFnZXMiLCJGbG9vciIsIk1hcCIsInNwbGl0Iiwic2Vjb25kIiwiSlNPTiIsInN0cmluZ2lmeSIsImlucHV0IiwicGFyc2UiLCJpbmplY3QiLCJXZWJTb2NrZXQiLCJNb3pXZWJTb2NrZXQiLCJiciIsImJydW5jaCIsImFyIiwiZGlzYWJsZWQiLCJfYXIiLCJjYWNoZUJ1c3RlciIsInVybCIsImRhdGUiLCJyb3VuZCIsIkRhdGUiLCJ0b1N0cmluZyIsInJlcGxhY2UiLCJpbmRleE9mIiwiYnJvd3NlciIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsInRvTG93ZXJDYXNlIiwiZm9yY2VSZXBhaW50IiwicmVsb2FkZXJzIiwicGFnZSIsInJlbG9hZCIsInN0eWxlc2hlZXQiLCJzbGljZSIsImNhbGwiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZmlsdGVyIiwibGluayIsInZhbCIsImdldEF0dHJpYnV0ZSIsImhyZWYiLCJzZXRUaW1lb3V0Iiwib2Zmc2V0SGVpZ2h0IiwiamF2YXNjcmlwdCIsInNjcmlwdHMiLCJ0ZXh0U2NyaXB0cyIsInNjcmlwdCIsInNyY1NjcmlwdHMiLCJvbkxvYWQiLCJldmFsIiwicmVtb3ZlIiwibmV3U2NyaXB0IiwiYXN5bmMiLCJoZWFkIiwiYXBwZW5kQ2hpbGQiLCJwb3J0IiwiaG9zdCIsInNlcnZlciIsImhvc3RuYW1lIiwiY29ubmVjdCIsImNvbm5lY3Rpb24iLCJvbm1lc3NhZ2UiLCJtZXNzYWdlIiwiZGF0YSIsInJlbG9hZGVyIiwib25lcnJvciIsInJlYWR5U3RhdGUiLCJjbG9zZSIsIm9uY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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RDtBQW1GQSIsImZpbGUiOiJkb2NzL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0JhZy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQmFnID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIF9NaXhpbiA9IHJlcXVpcmUoXCIuL01peGluXCIpO1xudmFyIF9FdmVudFRhcmdldE1peGluID0gcmVxdWlyZShcIi4uL21peGluL0V2ZW50VGFyZ2V0TWl4aW5cIik7XG52YXIgdG9JZCA9IGludCA9PiBOdW1iZXIoaW50KTtcbnZhciBmcm9tSWQgPSBpZCA9PiBwYXJzZUludChpZCk7XG52YXIgTWFwcGVkID0gU3ltYm9sKCdNYXBwZWQnKTtcbnZhciBIYXMgPSBTeW1ib2woJ0hhcycpO1xudmFyIEFkZCA9IFN5bWJvbCgnQWRkJyk7XG52YXIgUmVtb3ZlID0gU3ltYm9sKCdSZW1vdmUnKTtcbnZhciBEZWxldGUgPSBTeW1ib2woJ0RlbGV0ZScpO1xuY2xhc3MgQmFnIGV4dGVuZHMgX01peGluLk1peGluLndpdGgoX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbikge1xuICBjb25zdHJ1Y3RvcihjaGFuZ2VDYWxsYmFjayA9IHVuZGVmaW5lZCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5jaGFuZ2VDYWxsYmFjayA9IGNoYW5nZUNhbGxiYWNrO1xuICAgIHRoaXMuY29udGVudCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLmxpc3QgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKFtdKTtcbiAgICB0aGlzLm1ldGEgPSBTeW1ib2woJ21ldGEnKTtcbiAgICB0aGlzLnR5cGUgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaGFzKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLmhhcyhpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbSGFzXShpdGVtKTtcbiAgfVxuICBbSGFzXShpdGVtKSB7XG4gICAgcmV0dXJuIHRoaXMuY29udGVudC5oYXMoaXRlbSk7XG4gIH1cbiAgYWRkKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLmFkZChpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbQWRkXShpdGVtKTtcbiAgfVxuICBbQWRkXShpdGVtKSB7XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCB8fCAhKGl0ZW0gaW5zdGFuY2VvZiBPYmplY3QpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgb2JqZWN0cyBtYXkgYmUgYWRkZWQgdG8gQmFncy4nKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudHlwZSAmJiAhKGl0ZW0gaW5zdGFuY2VvZiB0aGlzLnR5cGUpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRoaXMudHlwZSwgaXRlbSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9ubHkgb2JqZWN0cyBvZiB0eXBlICR7dGhpcy50eXBlfSBtYXkgYmUgYWRkZWQgdG8gdGhpcyBCYWcuYCk7XG4gICAgfVxuICAgIGl0ZW0gPSBfQmluZGFibGUuQmluZGFibGUubWFrZShpdGVtKTtcbiAgICBpZiAodGhpcy5jb250ZW50LmhhcyhpdGVtKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgYWRkaW5nID0gbmV3IEN1c3RvbUV2ZW50KCdhZGRpbmcnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KGFkZGluZykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGlkID0gdG9JZCh0aGlzLmN1cnJlbnQrKyk7XG4gICAgdGhpcy5jb250ZW50LnNldChpdGVtLCBpZCk7XG4gICAgdGhpcy5saXN0W2lkXSA9IGl0ZW07XG4gICAgaWYgKHRoaXMuY2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2soaXRlbSwgdGhpcy5tZXRhLCBCYWcuSVRFTV9BRERFRCwgaWQpO1xuICAgIH1cbiAgICB2YXIgYWRkID0gbmV3IEN1c3RvbUV2ZW50KCdhZGRlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtLFxuICAgICAgICBpZFxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChhZGQpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5zaXplO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICByZW1vdmUoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0ucmVtb3ZlKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tSZW1vdmVdKGl0ZW0pO1xuICB9XG4gIFtSZW1vdmVdKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkIHx8ICEoaXRlbSBpbnN0YW5jZW9mIE9iamVjdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBvYmplY3RzIG1heSBiZSByZW1vdmVkIGZyb20gQmFncy4nKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudHlwZSAmJiAhKGl0ZW0gaW5zdGFuY2VvZiB0aGlzLnR5cGUpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRoaXMudHlwZSwgaXRlbSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9ubHkgb2JqZWN0cyBvZiB0eXBlICR7dGhpcy50eXBlfSBtYXkgYmUgcmVtb3ZlZCBmcm9tIHRoaXMgQmFnLmApO1xuICAgIH1cbiAgICBpdGVtID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoaXRlbSk7XG4gICAgaWYgKCF0aGlzLmNvbnRlbnQuaGFzKGl0ZW0pKSB7XG4gICAgICBpZiAodGhpcy5jaGFuZ2VDYWxsYmFjaykge1xuICAgICAgICB0aGlzLmNoYW5nZUNhbGxiYWNrKGl0ZW0sIHRoaXMubWV0YSwgMCwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIHJlbW92aW5nID0gbmV3IEN1c3RvbUV2ZW50KCdyZW1vdmluZycsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQocmVtb3ZpbmcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpZCA9IHRoaXMuY29udGVudC5nZXQoaXRlbSk7XG4gICAgZGVsZXRlIHRoaXMubGlzdFtpZF07XG4gICAgdGhpcy5jb250ZW50LmRlbGV0ZShpdGVtKTtcbiAgICBpZiAodGhpcy5jaGFuZ2VDYWxsYmFjaykge1xuICAgICAgdGhpcy5jaGFuZ2VDYWxsYmFjayhpdGVtLCB0aGlzLm1ldGEsIEJhZy5JVEVNX1JFTU9WRUQsIGlkKTtcbiAgICB9XG4gICAgdmFyIHJlbW92ZSA9IG5ldyBDdXN0b21FdmVudCgncmVtb3ZlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtLFxuICAgICAgICBpZFxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChyZW1vdmUpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5zaXplO1xuICAgIHJldHVybiBpdGVtO1xuICB9XG4gIGRlbGV0ZShpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5kZWxldGUoaXRlbSk7XG4gICAgfVxuICAgIHRoaXNbRGVsZXRlXShpdGVtKTtcbiAgfVxuICBbRGVsZXRlXShpdGVtKSB7XG4gICAgdGhpcy5yZW1vdmUoaXRlbSk7XG4gIH1cbiAgbWFwKG1hcHBlciA9IHggPT4geCwgZmlsdGVyID0geCA9PiB4KSB7XG4gICAgdmFyIG1hcHBlZEl0ZW1zID0gbmV3IFdlYWtNYXAoKTtcbiAgICB2YXIgbWFwcGVkQmFnID0gbmV3IEJhZygpO1xuICAgIG1hcHBlZEJhZ1tNYXBwZWRdID0gdGhpcztcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZGVkJywgZXZlbnQgPT4ge1xuICAgICAgdmFyIGl0ZW0gPSBldmVudC5kZXRhaWwuaXRlbTtcbiAgICAgIGlmICghZmlsdGVyKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChtYXBwZWRJdGVtcy5oYXMoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIG1hcHBlZCA9IG1hcHBlcihpdGVtKTtcbiAgICAgIG1hcHBlZEl0ZW1zLnNldChpdGVtLCBtYXBwZWQpO1xuICAgICAgbWFwcGVkQmFnW0FkZF0obWFwcGVkKTtcbiAgICB9KTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3JlbW92ZWQnLCBldmVudCA9PiB7XG4gICAgICB2YXIgaXRlbSA9IGV2ZW50LmRldGFpbC5pdGVtO1xuICAgICAgaWYgKCFtYXBwZWRJdGVtcy5oYXMoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIG1hcHBlZCA9IG1hcHBlZEl0ZW1zLmdldChpdGVtKTtcbiAgICAgIG1hcHBlZEl0ZW1zLmRlbGV0ZShpdGVtKTtcbiAgICAgIG1hcHBlZEJhZ1tSZW1vdmVdKG1hcHBlZCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1hcHBlZEJhZztcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb250ZW50LnNpemU7XG4gIH1cbiAgaXRlbXMoKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jb250ZW50LmVudHJpZXMoKSkubWFwKGVudHJ5ID0+IGVudHJ5WzBdKTtcbiAgfVxufVxuZXhwb3J0cy5CYWcgPSBCYWc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmFnLCAnSVRFTV9BRERFRCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogMVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmFnLCAnSVRFTV9SRU1PVkVEJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiAtMVxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZS5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQmluZGFibGUgPSB2b2lkIDA7XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkoZSwgciwgdCkgeyByZXR1cm4gKHIgPSBfdG9Qcm9wZXJ0eUtleShyKSkgaW4gZSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCByLCB7IHZhbHVlOiB0LCBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwIH0pIDogZVtyXSA9IHQsIGU7IH1cbmZ1bmN0aW9uIF90b1Byb3BlcnR5S2V5KHQpIHsgdmFyIGkgPSBfdG9QcmltaXRpdmUodCwgXCJzdHJpbmdcIik7IHJldHVybiBcInN5bWJvbFwiID09IHR5cGVvZiBpID8gaSA6IGkgKyBcIlwiOyB9XG5mdW5jdGlvbiBfdG9QcmltaXRpdmUodCwgcikgeyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgdCB8fCAhdCkgcmV0dXJuIHQ7IHZhciBlID0gdFtTeW1ib2wudG9QcmltaXRpdmVdOyBpZiAodm9pZCAwICE9PSBlKSB7IHZhciBpID0gZS5jYWxsKHQsIHIgfHwgXCJkZWZhdWx0XCIpOyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgaSkgcmV0dXJuIGk7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJAQHRvUHJpbWl0aXZlIG11c3QgcmV0dXJuIGEgcHJpbWl0aXZlIHZhbHVlLlwiKTsgfSByZXR1cm4gKFwic3RyaW5nXCIgPT09IHIgPyBTdHJpbmcgOiBOdW1iZXIpKHQpOyB9XG52YXIgUmVmID0gU3ltYm9sKCdyZWYnKTtcbnZhciBPcmlnaW5hbCA9IFN5bWJvbCgnb3JpZ2luYWwnKTtcbnZhciBEZWNrID0gU3ltYm9sKCdkZWNrJyk7XG52YXIgQmluZGluZyA9IFN5bWJvbCgnYmluZGluZycpO1xudmFyIFN1YkJpbmRpbmcgPSBTeW1ib2woJ3N1YkJpbmRpbmcnKTtcbnZhciBCaW5kaW5nQWxsID0gU3ltYm9sKCdiaW5kaW5nQWxsJyk7XG52YXIgSXNCaW5kYWJsZSA9IFN5bWJvbCgnaXNCaW5kYWJsZScpO1xudmFyIFdyYXBwaW5nID0gU3ltYm9sKCd3cmFwcGluZycpO1xudmFyIE5hbWVzID0gU3ltYm9sKCdOYW1lcycpO1xudmFyIEV4ZWN1dGluZyA9IFN5bWJvbCgnZXhlY3V0aW5nJyk7XG52YXIgU3RhY2sgPSBTeW1ib2woJ3N0YWNrJyk7XG52YXIgT2JqU3ltYm9sID0gU3ltYm9sKCdvYmplY3QnKTtcbnZhciBXcmFwcGVkID0gU3ltYm9sKCd3cmFwcGVkJyk7XG52YXIgVW53cmFwcGVkID0gU3ltYm9sKCd1bndyYXBwZWQnKTtcbnZhciBHZXRQcm90byA9IFN5bWJvbCgnZ2V0UHJvdG8nKTtcbnZhciBPbkdldCA9IFN5bWJvbCgnb25HZXQnKTtcbnZhciBPbkFsbEdldCA9IFN5bWJvbCgnb25BbGxHZXQnKTtcbnZhciBCaW5kQ2hhaW4gPSBTeW1ib2woJ2JpbmRDaGFpbicpO1xudmFyIERlc2NyaXB0b3JzID0gU3ltYm9sKCdEZXNjcmlwdG9ycycpO1xudmFyIEJlZm9yZSA9IFN5bWJvbCgnQmVmb3JlJyk7XG52YXIgQWZ0ZXIgPSBTeW1ib2woJ0FmdGVyJyk7XG52YXIgTm9HZXR0ZXJzID0gU3ltYm9sKCdOb0dldHRlcnMnKTtcbnZhciBQcmV2ZW50ID0gU3ltYm9sKCdQcmV2ZW50Jyk7XG52YXIgVHlwZWRBcnJheSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihJbnQ4QXJyYXkpO1xudmFyIFNldEl0ZXJhdG9yID0gU2V0LnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdO1xudmFyIE1hcEl0ZXJhdG9yID0gTWFwLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdO1xudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG52YXIgaXNFeGNsdWRlZCA9IG9iamVjdCA9PiB0eXBlb2Ygd2luLk1hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTWFwIHx8IHR5cGVvZiB3aW4uU2V0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5TZXQgfHwgdHlwZW9mIHdpbi5Ob2RlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5Ob2RlIHx8IHR5cGVvZiB3aW4uV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uV2Vha01hcCB8fCB0eXBlb2Ygd2luLkxvY2F0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5Mb2NhdGlvbiB8fCB0eXBlb2Ygd2luLlN0b3JhZ2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlN0b3JhZ2UgfHwgdHlwZW9mIHdpbi5XZWFrU2V0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5XZWFrU2V0IHx8IHR5cGVvZiB3aW4uQXJyYXlCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkFycmF5QnVmZmVyIHx8IHR5cGVvZiB3aW4uUHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUHJvbWlzZSB8fCB0eXBlb2Ygd2luLkZpbGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkZpbGUgfHwgdHlwZW9mIHdpbi5FdmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uRXZlbnQgfHwgdHlwZW9mIHdpbi5DdXN0b21FdmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uQ3VzdG9tRXZlbnQgfHwgdHlwZW9mIHdpbi5HYW1lcGFkID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5HYW1lcGFkIHx8IHR5cGVvZiB3aW4uUmVzaXplT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlJlc2l6ZU9ic2VydmVyIHx8IHR5cGVvZiB3aW4uTXV0YXRpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTXV0YXRpb25PYnNlcnZlciB8fCB0eXBlb2Ygd2luLlBlcmZvcm1hbmNlT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlBlcmZvcm1hbmNlT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5JbnRlcnNlY3Rpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5JREJDdXJzb3IgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkN1cnNvciB8fCB0eXBlb2Ygd2luLklEQkN1cnNvcldpdGhWYWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCQ3Vyc29yV2l0aFZhbHVlIHx8IHR5cGVvZiB3aW4uSURCRGF0YWJhc2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkRhdGFiYXNlIHx8IHR5cGVvZiB3aW4uSURCRmFjdG9yeSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCRmFjdG9yeSB8fCB0eXBlb2Ygd2luLklEQkluZGV4ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJJbmRleCB8fCB0eXBlb2Ygd2luLklEQktleVJhbmdlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJLZXlSYW5nZSB8fCB0eXBlb2Ygd2luLklEQk9iamVjdFN0b3JlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJPYmplY3RTdG9yZSB8fCB0eXBlb2Ygd2luLklEQk9wZW5EQlJlcXVlc3QgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQk9wZW5EQlJlcXVlc3QgfHwgdHlwZW9mIHdpbi5JREJSZXF1ZXN0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJSZXF1ZXN0IHx8IHR5cGVvZiB3aW4uSURCVHJhbnNhY3Rpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQlRyYW5zYWN0aW9uIHx8IHR5cGVvZiB3aW4uSURCVmVyc2lvbkNoYW5nZUV2ZW50ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJWZXJzaW9uQ2hhbmdlRXZlbnQgfHwgdHlwZW9mIHdpbi5GaWxlU3lzdGVtRmlsZUhhbmRsZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uRmlsZVN5c3RlbUZpbGVIYW5kbGUgfHwgdHlwZW9mIHdpbi5SVENQZWVyQ29ubmVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUlRDUGVlckNvbm5lY3Rpb24gfHwgdHlwZW9mIHdpbi5TZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5TZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uIHx8IHR5cGVvZiB3aW4uV2ViR0xUZXh0dXJlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5XZWJHTFRleHR1cmU7XG5jbGFzcyBCaW5kYWJsZSB7XG4gIHN0YXRpYyBpc0JpbmRhYmxlKG9iamVjdCkge1xuICAgIGlmICghb2JqZWN0IHx8ICFvYmplY3RbSXNCaW5kYWJsZV0gfHwgIW9iamVjdFtQcmV2ZW50XSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0W0lzQmluZGFibGVdID09PSBCaW5kYWJsZTtcbiAgfVxuICBzdGF0aWMgb25EZWNrKG9iamVjdCwga2V5KSB7XG4gICAgcmV0dXJuIG9iamVjdFtEZWNrXS5nZXQoa2V5KSB8fCBmYWxzZTtcbiAgfVxuICBzdGF0aWMgcmVmKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3RbUmVmXSB8fCBvYmplY3QgfHwgZmFsc2U7XG4gIH1cbiAgc3RhdGljIG1ha2VCaW5kYWJsZShvYmplY3QpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlKG9iamVjdCk7XG4gIH1cbiAgc3RhdGljIHNodWNrKG9yaWdpbmFsLCBzZWVuKSB7XG4gICAgc2VlbiA9IHNlZW4gfHwgbmV3IE1hcCgpO1xuICAgIHZhciBjbG9uZSA9IE9iamVjdC5jcmVhdGUoe30pO1xuICAgIGlmIChvcmlnaW5hbCBpbnN0YW5jZW9mIFR5cGVkQXJyYXkgfHwgb3JpZ2luYWwgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgdmFyIF9jbG9uZSA9IG9yaWdpbmFsLnNsaWNlKDApO1xuICAgICAgc2Vlbi5zZXQob3JpZ2luYWwsIF9jbG9uZSk7XG4gICAgICByZXR1cm4gX2Nsb25lO1xuICAgIH1cbiAgICB2YXIgcHJvcGVydGllcyA9IE9iamVjdC5rZXlzKG9yaWdpbmFsKTtcbiAgICBmb3IgKHZhciBpIGluIHByb3BlcnRpZXMpIHtcbiAgICAgIHZhciBpaSA9IHByb3BlcnRpZXNbaV07XG4gICAgICBpZiAoaWkuc3Vic3RyaW5nKDAsIDMpID09PSAnX19fJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBhbHJlYWR5Q2xvbmVkID0gc2Vlbi5nZXQob3JpZ2luYWxbaWldKTtcbiAgICAgIGlmIChhbHJlYWR5Q2xvbmVkKSB7XG4gICAgICAgIGNsb25lW2lpXSA9IGFscmVhZHlDbG9uZWQ7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9yaWdpbmFsW2lpXSA9PT0gb3JpZ2luYWwpIHtcbiAgICAgICAgc2Vlbi5zZXQob3JpZ2luYWxbaWldLCBjbG9uZSk7XG4gICAgICAgIGNsb25lW2lpXSA9IGNsb25lO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcmlnaW5hbFtpaV0gJiYgdHlwZW9mIG9yaWdpbmFsW2lpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFyIG9yaWdpbmFsUHJvcCA9IG9yaWdpbmFsW2lpXTtcbiAgICAgICAgaWYgKEJpbmRhYmxlLmlzQmluZGFibGUob3JpZ2luYWxbaWldKSkge1xuICAgICAgICAgIG9yaWdpbmFsUHJvcCA9IG9yaWdpbmFsW2lpXVtPcmlnaW5hbF07XG4gICAgICAgIH1cbiAgICAgICAgY2xvbmVbaWldID0gdGhpcy5zaHVjayhvcmlnaW5hbFByb3AsIHNlZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xvbmVbaWldID0gb3JpZ2luYWxbaWldO1xuICAgICAgfVxuICAgICAgc2Vlbi5zZXQob3JpZ2luYWxbaWldLCBjbG9uZVtpaV0pO1xuICAgIH1cbiAgICBpZiAoQmluZGFibGUuaXNCaW5kYWJsZShvcmlnaW5hbCkpIHtcbiAgICAgIGRlbGV0ZSBjbG9uZS5iaW5kVG87XG4gICAgICBkZWxldGUgY2xvbmUuaXNCb3VuZDtcbiAgICB9XG4gICAgcmV0dXJuIGNsb25lO1xuICB9XG4gIHN0YXRpYyBtYWtlKG9iamVjdCkge1xuICAgIGlmIChvYmplY3RbUHJldmVudF0pIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmICghb2JqZWN0IHx8ICFbJ2Z1bmN0aW9uJywgJ29iamVjdCddLmluY2x1ZGVzKHR5cGVvZiBvYmplY3QpKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoUmVmIGluIG9iamVjdCkge1xuICAgICAgcmV0dXJuIG9iamVjdFtSZWZdO1xuICAgIH1cbiAgICBpZiAob2JqZWN0W0lzQmluZGFibGVdKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoT2JqZWN0LmlzU2VhbGVkKG9iamVjdCkgfHwgT2JqZWN0LmlzRnJvemVuKG9iamVjdCkgfHwgIU9iamVjdC5pc0V4dGVuc2libGUob2JqZWN0KSB8fCBpc0V4Y2x1ZGVkKG9iamVjdCkpIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIElzQmluZGFibGUsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBCaW5kYWJsZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFJlZiwge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiBmYWxzZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIE9yaWdpbmFsLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogb2JqZWN0XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgRGVjaywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJpbmRpbmcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgU3ViQmluZGluZywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJpbmRpbmdBbGwsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBFeGVjdXRpbmcsIHtcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBXcmFwcGluZywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFN0YWNrLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCZWZvcmUsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBBZnRlciwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFdyYXBwZWQsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobmV3IE1hcCgpKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFVud3JhcHBlZCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhuZXcgTWFwKCkpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgRGVzY3JpcHRvcnMsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobmV3IE1hcCgpKVxuICAgIH0pO1xuICAgIHZhciBiaW5kVG8gPSAocHJvcGVydHksIGNhbGxiYWNrID0gbnVsbCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgICB2YXIgYmluZFRvQWxsID0gZmFsc2U7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwcm9wZXJ0eSkpIHtcbiAgICAgICAgdmFyIGRlYmluZGVycyA9IHByb3BlcnR5Lm1hcChwID0+IGJpbmRUbyhwLCBjYWxsYmFjaywgb3B0aW9ucykpO1xuICAgICAgICByZXR1cm4gKCkgPT4gZGViaW5kZXJzLmZvckVhY2goZCA9PiBkKCkpO1xuICAgICAgfVxuICAgICAgaWYgKHByb3BlcnR5IGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrIHx8IHt9O1xuICAgICAgICBjYWxsYmFjayA9IHByb3BlcnR5O1xuICAgICAgICBiaW5kVG9BbGwgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuZGVsYXkgPj0gMCkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcERlbGF5Q2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMuZGVsYXkpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMudGhyb3R0bGUgPj0gMCkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcFRocm90dGxlQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMudGhyb3R0bGUpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMud2FpdCA+PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwV2FpdENhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLndhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuZnJhbWUpIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBGcmFtZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLmZyYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmlkbGUpIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBJZGxlQ2FsbGJhY2soY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGJpbmRUb0FsbCkge1xuICAgICAgICBvYmplY3RbQmluZGluZ0FsbF0uYWRkKGNhbGxiYWNrKTtcbiAgICAgICAgaWYgKCEoJ25vdycgaW4gb3B0aW9ucykgfHwgb3B0aW9ucy5ub3cpIHtcbiAgICAgICAgICBmb3IgKHZhciBpIGluIG9iamVjdCkge1xuICAgICAgICAgICAgY2FsbGJhY2sob2JqZWN0W2ldLCBpLCBvYmplY3QsIGZhbHNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICBvYmplY3RbQmluZGluZ0FsbF0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmICghb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XSkge1xuICAgICAgICBvYmplY3RbQmluZGluZ11bcHJvcGVydHldID0gbmV3IFNldCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBsZXQgYmluZEluZGV4ID0gb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5sZW5ndGg7XG5cbiAgICAgIGlmIChvcHRpb25zLmNoaWxkcmVuKSB7XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IGNhbGxiYWNrO1xuICAgICAgICBjYWxsYmFjayA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgdmFyIHYgPSBhcmdzWzBdO1xuICAgICAgICAgIHZhciBzdWJEZWJpbmQgPSBvYmplY3RbU3ViQmluZGluZ10uZ2V0KG9yaWdpbmFsKTtcbiAgICAgICAgICBpZiAoc3ViRGViaW5kKSB7XG4gICAgICAgICAgICBvYmplY3RbU3ViQmluZGluZ10uZGVsZXRlKG9yaWdpbmFsKTtcbiAgICAgICAgICAgIHN1YkRlYmluZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBvcmlnaW5hbCguLi5hcmdzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHZ2ID0gQmluZGFibGUubWFrZSh2KTtcbiAgICAgICAgICBpZiAoQmluZGFibGUuaXNCaW5kYWJsZSh2dikpIHtcbiAgICAgICAgICAgIG9iamVjdFtTdWJCaW5kaW5nXS5zZXQob3JpZ2luYWwsIHZ2LmJpbmRUbygoLi4uc3ViQXJncykgPT4gb3JpZ2luYWwoLi4uYXJncywgLi4uc3ViQXJncyksIE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgY2hpbGRyZW46IGZhbHNlXG4gICAgICAgICAgICB9KSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvcmlnaW5hbCguLi5hcmdzKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0uYWRkKGNhbGxiYWNrKTtcbiAgICAgIGlmICghKCdub3cnIGluIG9wdGlvbnMpIHx8IG9wdGlvbnMubm93KSB7XG4gICAgICAgIGNhbGxiYWNrKG9iamVjdFtwcm9wZXJ0eV0sIHByb3BlcnR5LCBvYmplY3QsIGZhbHNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBkZWJpbmRlciA9ICgpID0+IHtcbiAgICAgICAgdmFyIHN1YkRlYmluZCA9IG9iamVjdFtTdWJCaW5kaW5nXS5nZXQoY2FsbGJhY2spO1xuICAgICAgICBpZiAoc3ViRGViaW5kKSB7XG4gICAgICAgICAgb2JqZWN0W1N1YkJpbmRpbmddLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgICAgc3ViRGViaW5kKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvYmplY3RbQmluZGluZ11bcHJvcGVydHldKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5oYXMoY2FsbGJhY2spKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgIH07XG4gICAgICBpZiAob3B0aW9ucy5yZW1vdmVXaXRoICYmIG9wdGlvbnMucmVtb3ZlV2l0aCBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgICAgb3B0aW9ucy5yZW1vdmVXaXRoLm9uUmVtb3ZlKCgpID0+IGRlYmluZGVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWJpbmRlcjtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdiaW5kVG8nLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogYmluZFRvXG4gICAgfSk7XG4gICAgdmFyIF9fX2JlZm9yZSA9IGNhbGxiYWNrID0+IHtcbiAgICAgIG9iamVjdFtCZWZvcmVdLmFkZChjYWxsYmFjayk7XG4gICAgICByZXR1cm4gKCkgPT4gb2JqZWN0W0JlZm9yZV0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIHZhciBfX19hZnRlciA9IGNhbGxiYWNrID0+IHtcbiAgICAgIG9iamVjdFtBZnRlcl0uYWRkKGNhbGxiYWNrKTtcbiAgICAgIHJldHVybiAoKSA9PiBvYmplY3RbQWZ0ZXJdLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCaW5kQ2hhaW4sIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiAocGF0aCwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgICB2YXIgbm9kZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIHZhciBzdWJQYXJ0cyA9IHBhcnRzLnNsaWNlKDApO1xuICAgICAgICB2YXIgZGViaW5kID0gW107XG4gICAgICAgIGRlYmluZC5wdXNoKG9iamVjdC5iaW5kVG8obm9kZSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICB2YXIgcmVzdCA9IHN1YlBhcnRzLmpvaW4oJy4nKTtcbiAgICAgICAgICBpZiAoc3ViUGFydHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh2LCBrLCB0LCBkKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdiA9IHRba10gPSB0aGlzLm1ha2Uoe30pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWJpbmQgPSBkZWJpbmQuY29uY2F0KHZbQmluZENoYWluXShyZXN0LCBjYWxsYmFjaykpO1xuICAgICAgICB9KSk7XG4gICAgICAgIHJldHVybiAoKSA9PiBkZWJpbmQuZm9yRWFjaCh4ID0+IHgoKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ19fX2JlZm9yZScsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBfX19iZWZvcmVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnX19fYWZ0ZXInLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogX19fYWZ0ZXJcbiAgICB9KTtcbiAgICB2YXIgaXNCb3VuZCA9ICgpID0+IHtcbiAgICAgIGlmIChvYmplY3RbQmluZGluZ0FsbF0uc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGNhbGxiYWNrcyBvZiBPYmplY3QudmFsdWVzKG9iamVjdFtCaW5kaW5nXSkpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrcy5zaXplKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yKGxldCBjYWxsYmFjayBvZiBjYWxsYmFja3MpXG4gICAgICAgIC8vIHtcbiAgICAgICAgLy8gXHRpZihjYWxsYmFjaylcbiAgICAgICAgLy8gXHR7XG4gICAgICAgIC8vIFx0XHRyZXR1cm4gdHJ1ZTtcbiAgICAgICAgLy8gXHR9XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdpc0JvdW5kJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IGlzQm91bmRcbiAgICB9KTtcbiAgICBmb3IgKHZhciBpIGluIG9iamVjdCkge1xuICAgICAgLy8gY29uc3QgZGVzY3JpcHRvcnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhvYmplY3QpO1xuXG4gICAgICBpZiAoIW9iamVjdFtpXSB8fCB0eXBlb2Ygb2JqZWN0W2ldICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvYmplY3RbaV1bUmVmXSB8fCBvYmplY3RbaV0gaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKG9iamVjdFtpXSkgfHwgT2JqZWN0LmlzU2VhbGVkKG9iamVjdFtpXSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRXhjbHVkZWQob2JqZWN0W2ldKSkge1xuICAgICAgICBvYmplY3RbaV0gPSBCaW5kYWJsZS5tYWtlKG9iamVjdFtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBkZXNjcmlwdG9ycyA9IG9iamVjdFtEZXNjcmlwdG9yc107XG4gICAgdmFyIHdyYXBwZWQgPSBvYmplY3RbV3JhcHBlZF07XG4gICAgdmFyIHN0YWNrID0gb2JqZWN0W1N0YWNrXTtcbiAgICB2YXIgc2V0ID0gKHRhcmdldCwga2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFsdWUgPSBCaW5kYWJsZS5tYWtlKHZhbHVlKTtcbiAgICAgICAgaWYgKHRhcmdldFtrZXldID09PSB2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAod3JhcHBlZC5oYXMoa2V5KSkge1xuICAgICAgICB3cmFwcGVkLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgdmFyIG9uRGVjayA9IG9iamVjdFtEZWNrXTtcbiAgICAgIHZhciBpc09uRGVjayA9IG9uRGVjay5oYXMoa2V5KTtcbiAgICAgIHZhciB2YWxPbkRlY2sgPSBpc09uRGVjayAmJiBvbkRlY2suZ2V0KGtleSk7XG5cbiAgICAgIC8vIGlmKG9uRGVja1trZXldICE9PSB1bmRlZmluZWQgJiYgb25EZWNrW2tleV0gPT09IHZhbHVlKVxuICAgICAgaWYgKGlzT25EZWNrICYmIHZhbE9uRGVjayA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoa2V5LnNsaWNlICYmIGtleS5zbGljZSgtMykgPT09ICdfX18nKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRhcmdldFtrZXldID09PSB2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbE9uRGVjaykgJiYgaXNOYU4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgb25EZWNrLnNldChrZXksIHZhbHVlKTtcbiAgICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIG9iamVjdFtCaW5kaW5nQWxsXSkge1xuICAgICAgICBjYWxsYmFjayh2YWx1ZSwga2V5LCB0YXJnZXQsIGZhbHNlKTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgaW4gb2JqZWN0W0JpbmRpbmddKSB7XG4gICAgICAgIGZvciAodmFyIF9jYWxsYmFjayBvZiBvYmplY3RbQmluZGluZ11ba2V5XSkge1xuICAgICAgICAgIF9jYWxsYmFjayh2YWx1ZSwga2V5LCB0YXJnZXQsIGZhbHNlLCB0YXJnZXRba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9uRGVjay5kZWxldGUoa2V5KTtcbiAgICAgIHZhciBleGNsdWRlZCA9IHdpbi5GaWxlICYmIHRhcmdldCBpbnN0YW5jZW9mIHdpbi5GaWxlICYmIGtleSA9PSAnbGFzdE1vZGlmaWVkRGF0ZSc7XG4gICAgICBpZiAoIWV4Y2x1ZGVkKSB7XG4gICAgICAgIFJlZmxlY3Quc2V0KHRhcmdldCwga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpICYmIG9iamVjdFtCaW5kaW5nXVsnbGVuZ3RoJ10pIHtcbiAgICAgICAgZm9yICh2YXIgX2kgaW4gb2JqZWN0W0JpbmRpbmddWydsZW5ndGgnXSkge1xuICAgICAgICAgIHZhciBfY2FsbGJhY2syID0gb2JqZWN0W0JpbmRpbmddWydsZW5ndGgnXVtfaV07XG4gICAgICAgICAgX2NhbGxiYWNrMih0YXJnZXQubGVuZ3RoLCAnbGVuZ3RoJywgdGFyZ2V0LCBmYWxzZSwgdGFyZ2V0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgdmFyIGRlbGV0ZVByb3BlcnR5ID0gKHRhcmdldCwga2V5KSA9PiB7XG4gICAgICB2YXIgb25EZWNrID0gb2JqZWN0W0RlY2tdO1xuICAgICAgdmFyIGlzT25EZWNrID0gb25EZWNrLmhhcyhrZXkpO1xuICAgICAgaWYgKGlzT25EZWNrKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCEoa2V5IGluIHRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRvcnMuaGFzKGtleSkpIHtcbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ycy5nZXQoa2V5KTtcbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGRlc2NyaXB0b3JzLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgb25EZWNrLnNldChrZXksIG51bGwpO1xuICAgICAgaWYgKHdyYXBwZWQuaGFzKGtleSkpIHtcbiAgICAgICAgd3JhcHBlZC5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIG9iamVjdFtCaW5kaW5nQWxsXSkge1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGtleSwgdGFyZ2V0LCB0cnVlLCB0YXJnZXRba2V5XSk7XG4gICAgICB9XG4gICAgICBpZiAoa2V5IGluIG9iamVjdFtCaW5kaW5nXSkge1xuICAgICAgICBmb3IgKHZhciBiaW5kaW5nIG9mIG9iamVjdFtCaW5kaW5nXVtrZXldKSB7XG4gICAgICAgICAgYmluZGluZyh1bmRlZmluZWQsIGtleSwgdGFyZ2V0LCB0cnVlLCB0YXJnZXRba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBrZXkpO1xuICAgICAgb25EZWNrLmRlbGV0ZShrZXkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0ID0gKHRhcmdldCwgYXJncykgPT4ge1xuICAgICAgdmFyIGtleSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgICBmb3IgKHZhciBjYWxsYmFjayBvZiB0YXJnZXRbQmVmb3JlXSkge1xuICAgICAgICBjYWxsYmFjayh0YXJnZXQsIGtleSwgb2JqZWN0W1N0YWNrXSwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHZhciBpbnN0YW5jZSA9IEJpbmRhYmxlLm1ha2UobmV3IHRhcmdldFtPcmlnaW5hbF0oLi4uYXJncykpO1xuICAgICAgZm9yICh2YXIgX2NhbGxiYWNrMyBvZiB0YXJnZXRbQWZ0ZXJdKSB7XG4gICAgICAgIF9jYWxsYmFjazModGFyZ2V0LCBrZXksIG9iamVjdFtTdGFja10sIGluc3RhbmNlLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9O1xuICAgIHZhciBnZXQgPSAodGFyZ2V0LCBrZXkpID0+IHtcbiAgICAgIGlmICh3cmFwcGVkLmhhcyhrZXkpKSB7XG4gICAgICAgIHJldHVybiB3cmFwcGVkLmdldChrZXkpO1xuICAgICAgfVxuICAgICAgaWYgKGtleSA9PT0gUmVmIHx8IGtleSA9PT0gT3JpZ2luYWwgfHwga2V5ID09PSAnYXBwbHknIHx8IGtleSA9PT0gJ2lzQm91bmQnIHx8IGtleSA9PT0gJ2JpbmRUbycgfHwga2V5ID09PSAnX19wcm90b19fJyB8fCBrZXkgPT09ICdjb25zdHJ1Y3RvcicpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgICAgdmFyIGRlc2NyaXB0b3I7XG4gICAgICBpZiAoZGVzY3JpcHRvcnMuaGFzKGtleSkpIHtcbiAgICAgICAgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JzLmdldChrZXkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBrZXkpO1xuICAgICAgICBkZXNjcmlwdG9ycy5zZXQoa2V5LCBkZXNjcmlwdG9yKTtcbiAgICAgIH1cbiAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgICBpZiAoT25BbGxHZXQgaW4gb2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBvYmplY3RbT25BbGxHZXRdKGtleSk7XG4gICAgICB9XG4gICAgICBpZiAoT25HZXQgaW4gb2JqZWN0ICYmICEoa2V5IGluIG9iamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtPbkdldF0oa2V5KTtcbiAgICAgIH1cbiAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICB3cmFwcGVkLnNldChrZXksIG9iamVjdFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBvYmplY3Rba2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpZiAoTmFtZXMgaW4gb2JqZWN0W2tleV0pIHtcbiAgICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0W1Vud3JhcHBlZF0uc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICB2YXIgcHJvdG90eXBlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCk7XG4gICAgICAgIHZhciBpc01ldGhvZCA9IHByb3RvdHlwZVtrZXldID09PSBvYmplY3Rba2V5XTtcbiAgICAgICAgdmFyIG9ialJlZiA9XG4gICAgICAgIC8vICh0eXBlb2YgUHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgUHJvbWlzZSlcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBTdG9yYWdlID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBTdG9yYWdlKVxuICAgICAgICAvLyB8fCAodHlwZW9mIE1hcCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIE1hcClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBTZXQgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBTZXQpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgV2Vha01hcClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBXZWFrU2V0ID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBXZWFrU2V0KVxuICAgICAgICAvLyB8fCAodHlwZW9mIEFycmF5QnVmZmVyID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFJlc2l6ZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFJlc2l6ZU9ic2VydmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIE11dGF0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIE11dGF0aW9uT2JzZXJ2ZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgUGVyZm9ybWFuY2VPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgUGVyZm9ybWFuY2VPYnNlcnZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBJbnRlcnNlY3Rpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBJbnRlcnNlY3Rpb25PYnNlcnZlcilcbiAgICAgICAgaXNFeGNsdWRlZChvYmplY3QpIHx8IHR5cGVvZiBvYmplY3RbU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJyAmJiBrZXkgPT09ICduZXh0JyB8fCB0eXBlb2YgVHlwZWRBcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiBUeXBlZEFycmF5IHx8IHR5cGVvZiBFdmVudFRhcmdldCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiBFdmVudFRhcmdldCB8fCB0eXBlb2YgRGF0ZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiBEYXRlIHx8IHR5cGVvZiBNYXBJdGVyYXRvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QucHJvdG90eXBlID09PSBNYXBJdGVyYXRvciB8fCB0eXBlb2YgU2V0SXRlcmF0b3IgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0LnByb3RvdHlwZSA9PT0gU2V0SXRlcmF0b3IgPyBvYmplY3QgOiBvYmplY3RbUmVmXTtcbiAgICAgICAgdmFyIHdyYXBwZWRNZXRob2QgPSBmdW5jdGlvbiAoLi4ucHJvdmlkZWRBcmdzKSB7XG4gICAgICAgICAgb2JqZWN0W0V4ZWN1dGluZ10gPSBrZXk7XG4gICAgICAgICAgc3RhY2sudW5zaGlmdChrZXkpO1xuICAgICAgICAgIGZvciAodmFyIGJlZm9yZUNhbGxiYWNrIG9mIG9iamVjdFtCZWZvcmVdKSB7XG4gICAgICAgICAgICBiZWZvcmVDYWxsYmFjayhvYmplY3QsIGtleSwgc3RhY2ssIG9iamVjdCwgcHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICBpZiAobmV3LnRhcmdldCkge1xuICAgICAgICAgICAgcmV0ID0gbmV3IChvYmplY3RbVW53cmFwcGVkXS5nZXQoa2V5KSkoLi4ucHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGZ1bmMgPSBvYmplY3RbVW53cmFwcGVkXS5nZXQoa2V5KTtcbiAgICAgICAgICAgIGlmIChpc01ldGhvZCkge1xuICAgICAgICAgICAgICByZXQgPSBmdW5jLmFwcGx5KG9ialJlZiB8fCBvYmplY3QsIHByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXQgPSBmdW5jKC4uLnByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAodmFyIGFmdGVyQ2FsbGJhY2sgb2Ygb2JqZWN0W0FmdGVyXSkge1xuICAgICAgICAgICAgYWZ0ZXJDYWxsYmFjayhvYmplY3QsIGtleSwgc3RhY2ssIG9iamVjdCwgcHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb2JqZWN0W0V4ZWN1dGluZ10gPSBudWxsO1xuICAgICAgICAgIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfTtcbiAgICAgICAgd3JhcHBlZE1ldGhvZFtPbkFsbEdldF0gPSBfa2V5ID0+IG9iamVjdFtrZXldW19rZXldO1xuICAgICAgICB2YXIgcmVzdWx0ID0gQmluZGFibGUubWFrZSh3cmFwcGVkTWV0aG9kKTtcbiAgICAgICAgd3JhcHBlZC5zZXQoa2V5LCByZXN1bHQpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgIH07XG4gICAgdmFyIGdldFByb3RvdHlwZU9mID0gdGFyZ2V0ID0+IHtcbiAgICAgIGlmIChHZXRQcm90byBpbiBvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtHZXRQcm90b107XG4gICAgICB9XG4gICAgICByZXR1cm4gUmVmbGVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuICAgIH07XG4gICAgdmFyIGhhbmRsZXJEZWYgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIGhhbmRsZXJEZWYuc2V0ID0gc2V0O1xuICAgIGhhbmRsZXJEZWYuY29uc3RydWN0ID0gY29uc3RydWN0O1xuICAgIGhhbmRsZXJEZWYuZGVsZXRlUHJvcGVydHkgPSBkZWxldGVQcm9wZXJ0eTtcbiAgICBpZiAoIW9iamVjdFtOb0dldHRlcnNdKSB7XG4gICAgICBoYW5kbGVyRGVmLmdldFByb3RvdHlwZU9mID0gZ2V0UHJvdG90eXBlT2Y7XG4gICAgICBoYW5kbGVyRGVmLmdldCA9IGdldDtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgUmVmLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFByb3h5KG9iamVjdCwgaGFuZGxlckRlZilcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqZWN0W1JlZl07XG4gIH1cbiAgc3RhdGljIGNsZWFyQmluZGluZ3Mob2JqZWN0KSB7XG4gICAgdmFyIG1hcHMgPSBmdW5jID0+ICguLi5vcykgPT4gb3MubWFwKGZ1bmMpO1xuICAgIHZhciBjbGVhck9iaiA9IG8gPT4gT2JqZWN0LmtleXMobykubWFwKGsgPT4gZGVsZXRlIG9ba10pO1xuICAgIHZhciBjbGVhck9ianMgPSBtYXBzKGNsZWFyT2JqKTtcbiAgICBvYmplY3RbQmluZGluZ0FsbF0uY2xlYXIoKTtcbiAgICBjbGVhck9ianMob2JqZWN0W1dyYXBwZWRdLCBvYmplY3RbQmluZGluZ10sIG9iamVjdFtBZnRlcl0sIG9iamVjdFtCZWZvcmVdKTtcbiAgfVxuICBzdGF0aWMgcmVzb2x2ZShvYmplY3QsIHBhdGgsIG93bmVyID0gZmFsc2UpIHtcbiAgICB2YXIgbm9kZTtcbiAgICB2YXIgcGF0aFBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIHZhciB0b3AgPSBwYXRoUGFydHNbMF07XG4gICAgd2hpbGUgKHBhdGhQYXJ0cy5sZW5ndGgpIHtcbiAgICAgIGlmIChvd25lciAmJiBwYXRoUGFydHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHZhciBvYmogPSB0aGlzLm1ha2Uob2JqZWN0KTtcbiAgICAgICAgcmV0dXJuIFtvYmosIHBhdGhQYXJ0cy5zaGlmdCgpLCB0b3BdO1xuICAgICAgfVxuICAgICAgbm9kZSA9IHBhdGhQYXJ0cy5zaGlmdCgpO1xuICAgICAgaWYgKCEobm9kZSBpbiBvYmplY3QpIHx8ICFvYmplY3Rbbm9kZV0gfHwgISh0eXBlb2Ygb2JqZWN0W25vZGVdID09PSAnb2JqZWN0JykpIHtcbiAgICAgICAgb2JqZWN0W25vZGVdID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIH1cbiAgICAgIG9iamVjdCA9IHRoaXMubWFrZShvYmplY3Rbbm9kZV0pO1xuICAgIH1cbiAgICByZXR1cm4gW3RoaXMubWFrZShvYmplY3QpLCBub2RlLCB0b3BdO1xuICB9XG4gIHN0YXRpYyB3cmFwRGVsYXlDYWxsYmFjayhjYWxsYmFjaywgZGVsYXkpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soLi4uYXJncyksIGRlbGF5KTtcbiAgfVxuICBzdGF0aWMgd3JhcFRocm90dGxlQ2FsbGJhY2soY2FsbGJhY2ssIHRocm90dGxlKSB7XG4gICAgdGhpcy50aHJvdHRsZXMuc2V0KGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAodGhpcy50aHJvdHRsZXMuZ2V0KGNhbGxiYWNrLCB0cnVlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYWxsYmFjayguLi5hcmdzKTtcbiAgICAgIHRoaXMudGhyb3R0bGVzLnNldChjYWxsYmFjaywgdHJ1ZSk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy50aHJvdHRsZXMuc2V0KGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgICB9LCB0aHJvdHRsZSk7XG4gICAgfTtcbiAgfVxuICBzdGF0aWMgd3JhcFdhaXRDYWxsYmFjayhjYWxsYmFjaywgd2FpdCkge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgdmFyIHdhaXRlcjtcbiAgICAgIGlmICh3YWl0ZXIgPSB0aGlzLndhaXRlcnMuZ2V0KGNhbGxiYWNrKSkge1xuICAgICAgICB0aGlzLndhaXRlcnMuZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHdhaXRlcik7XG4gICAgICB9XG4gICAgICB3YWl0ZXIgPSBzZXRUaW1lb3V0KCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpLCB3YWl0KTtcbiAgICAgIHRoaXMud2FpdGVycy5zZXQoY2FsbGJhY2ssIHdhaXRlcik7XG4gICAgfTtcbiAgfVxuICBzdGF0aWMgd3JhcEZyYW1lQ2FsbGJhY2soY2FsbGJhY2ssIGZyYW1lcykge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpKTtcbiAgICB9O1xuICB9XG4gIHN0YXRpYyB3cmFwSWRsZUNhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICAvLyBDb21wYXRpYmlsaXR5IGZvciBTYWZhcmkgMDgvMjAyMFxuICAgICAgdmFyIHJlcSA9IHdpbmRvdy5yZXF1ZXN0SWRsZUNhbGxiYWNrIHx8IHJlcXVlc3RBbmltYXRpb25GcmFtZTtcbiAgICAgIHJlcSgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSk7XG4gICAgfTtcbiAgfVxufVxuZXhwb3J0cy5CaW5kYWJsZSA9IEJpbmRhYmxlO1xuX2RlZmluZVByb3BlcnR5KEJpbmRhYmxlLCBcIndhaXRlcnNcIiwgbmV3IFdlYWtNYXAoKSk7XG5fZGVmaW5lUHJvcGVydHkoQmluZGFibGUsIFwidGhyb3R0bGVzXCIsIG5ldyBXZWFrTWFwKCkpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnUHJldmVudCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IFByZXZlbnRcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnT25HZXQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBPbkdldFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdOb0dldHRlcnMnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBOb0dldHRlcnNcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnR2V0UHJvdG8nLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBHZXRQcm90b1xufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdPbkFsbEdldCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE9uQWxsR2V0XG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0NhY2hlLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5DYWNoZSA9IHZvaWQgMDtcbmNsYXNzIENhY2hlIHtcbiAgc3RhdGljIHN0b3JlKGtleSwgdmFsdWUsIGV4cGlyeSwgYnVja2V0ID0gJ3N0YW5kYXJkJykge1xuICAgIHZhciBleHBpcmF0aW9uID0gMDtcbiAgICBpZiAoZXhwaXJ5KSB7XG4gICAgICBleHBpcmF0aW9uID0gZXhwaXJ5ICogMTAwMCArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYnVja2V0cykge1xuICAgICAgdGhpcy5idWNrZXRzID0gbmV3IE1hcCgpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYnVja2V0cy5oYXMoYnVja2V0KSkge1xuICAgICAgdGhpcy5idWNrZXRzLnNldChidWNrZXQsIG5ldyBNYXAoKSk7XG4gICAgfVxuICAgIHZhciBldmVudEVuZCA9IG5ldyBDdXN0b21FdmVudCgnY3ZDYWNoZVN0b3JlJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBrZXksXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBleHBpcnksXG4gICAgICAgIGJ1Y2tldFxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50RW5kKSkge1xuICAgICAgdGhpcy5idWNrZXRzLmdldChidWNrZXQpLnNldChrZXksIHtcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIGV4cGlyYXRpb25cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgbG9hZChrZXksIGRlZmF1bHR2YWx1ZSA9IGZhbHNlLCBidWNrZXQgPSAnc3RhbmRhcmQnKSB7XG4gICAgdmFyIGV2ZW50RW5kID0gbmV3IEN1c3RvbUV2ZW50KCdjdkNhY2hlTG9hZCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAga2V5LFxuICAgICAgICBkZWZhdWx0dmFsdWUsXG4gICAgICAgIGJ1Y2tldFxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudEVuZCkpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0dmFsdWU7XG4gICAgfVxuICAgIGlmICh0aGlzLmJ1Y2tldHMgJiYgdGhpcy5idWNrZXRzLmhhcyhidWNrZXQpICYmIHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5oYXMoa2V5KSkge1xuICAgICAgdmFyIGVudHJ5ID0gdGhpcy5idWNrZXRzLmdldChidWNrZXQpLmdldChrZXkpO1xuICAgICAgLy8gY29uc29sZS5sb2codGhpcy5idWNrZXRbYnVja2V0XVtrZXldLmV4cGlyYXRpb24sIChuZXcgRGF0ZSkuZ2V0VGltZSgpKTtcbiAgICAgIGlmIChlbnRyeS5leHBpcmF0aW9uID09PSAwIHx8IGVudHJ5LmV4cGlyYXRpb24gPiBuZXcgRGF0ZSgpLmdldFRpbWUoKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5idWNrZXRzLmdldChidWNrZXQpLmdldChrZXkpLnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVmYXVsdHZhbHVlO1xuICB9XG59XG5leHBvcnRzLkNhY2hlID0gQ2FjaGU7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Db25maWcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkNvbmZpZyA9IHZvaWQgMDtcbnZhciBBcHBDb25maWcgPSB7fTtcbnZhciBfcmVxdWlyZSA9IHJlcXVpcmU7XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbnRyeSB7XG4gIEFwcENvbmZpZyA9IF9yZXF1aXJlKCcvQ29uZmlnJykuQ29uZmlnO1xufSBjYXRjaCAoZXJyb3IpIHtcbiAgd2luLmRldk1vZGUgPT09IHRydWUgJiYgY29uc29sZS5lcnJvcihlcnJvcik7XG4gIEFwcENvbmZpZyA9IHt9O1xufVxuY2xhc3MgQ29uZmlnIHtcbiAgc3RhdGljIGdldChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnc1tuYW1lXTtcbiAgfVxuICBzdGF0aWMgc2V0KG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5jb25maWdzW25hbWVdID0gdmFsdWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgc3RhdGljIGR1bXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlncztcbiAgfVxuICBzdGF0aWMgaW5pdCguLi5jb25maWdzKSB7XG4gICAgZm9yICh2YXIgaSBpbiBjb25maWdzKSB7XG4gICAgICB2YXIgY29uZmlnID0gY29uZmlnc1tpXTtcbiAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb25maWcgPSBKU09OLnBhcnNlKGNvbmZpZyk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBuYW1lIGluIGNvbmZpZykge1xuICAgICAgICB2YXIgdmFsdWUgPSBjb25maWdbbmFtZV07XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cbmV4cG9ydHMuQ29uZmlnID0gQ29uZmlnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KENvbmZpZywgJ2NvbmZpZ3MnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBBcHBDb25maWdcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvRG9tLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Eb20gPSB2b2lkIDA7XG52YXIgdHJhdmVyc2FscyA9IDA7XG5jbGFzcyBEb20ge1xuICBzdGF0aWMgbWFwVGFncyhkb2MsIHNlbGVjdG9yLCBjYWxsYmFjaywgc3RhcnROb2RlLCBlbmROb2RlKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBzdGFydGVkID0gdHJ1ZTtcbiAgICBpZiAoc3RhcnROb2RlKSB7XG4gICAgICBzdGFydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBlbmRlZCA9IGZhbHNlO1xuICAgIHZhciB7XG4gICAgICBOb2RlLFxuICAgICAgRWxlbWVudCxcbiAgICAgIE5vZGVGaWx0ZXIsXG4gICAgICBkb2N1bWVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB2YXIgdHJlZVdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoZG9jLCBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCB8IE5vZGVGaWx0ZXIuU0hPV19URVhULCB7XG4gICAgICBhY2NlcHROb2RlOiAobm9kZSwgd2Fsa2VyKSA9PiB7XG4gICAgICAgIGlmICghc3RhcnRlZCkge1xuICAgICAgICAgIGlmIChub2RlID09PSBzdGFydE5vZGUpIHtcbiAgICAgICAgICAgIHN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfU0tJUDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuZE5vZGUgJiYgbm9kZSA9PT0gZW5kTm9kZSkge1xuICAgICAgICAgIGVuZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5kZWQpIHtcbiAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfU0tJUDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChub2RlLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9BQ0NFUFQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9BQ0NFUFQ7XG4gICAgICB9XG4gICAgfSwgZmFsc2UpO1xuICAgIHZhciB0cmF2ZXJzYWwgPSB0cmF2ZXJzYWxzKys7XG4gICAgd2hpbGUgKHRyZWVXYWxrZXIubmV4dE5vZGUoKSkge1xuICAgICAgcmVzdWx0LnB1c2goY2FsbGJhY2sodHJlZVdhbGtlci5jdXJyZW50Tm9kZSwgdHJlZVdhbGtlcikpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHN0YXRpYyBkaXNwYXRjaEV2ZW50KGRvYywgZXZlbnQpIHtcbiAgICBkb2MuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgdGhpcy5tYXBUYWdzKGRvYywgZmFsc2UsIG5vZGUgPT4ge1xuICAgICAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB9KTtcbiAgfVxufVxuZXhwb3J0cy5Eb20gPSBEb207XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9NaXhpbi5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuTWl4aW4gPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgQ29uc3RydWN0b3IgPSBTeW1ib2woJ2NvbnN0cnVjdG9yJyk7XG52YXIgTWl4aW5MaXN0ID0gU3ltYm9sKCdtaXhpbkxpc3QnKTtcbmNsYXNzIE1peGluIHtcbiAgc3RhdGljIGZyb20oYmFzZUNsYXNzLCAuLi5taXhpbnMpIHtcbiAgICB2YXIgbmV3Q2xhc3MgPSBjbGFzcyBleHRlbmRzIGJhc2VDbGFzcyB7XG4gICAgICBjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG4gICAgICAgIHZhciBpbnN0YW5jZSA9IGJhc2VDbGFzcy5jb25zdHJ1Y3RvciA/IHN1cGVyKC4uLmFyZ3MpIDogbnVsbDtcbiAgICAgICAgZm9yICh2YXIgbWl4aW4gb2YgbWl4aW5zKSB7XG4gICAgICAgICAgaWYgKG1peGluW01peGluLkNvbnN0cnVjdG9yXSkge1xuICAgICAgICAgICAgbWl4aW5bTWl4aW4uQ29uc3RydWN0b3JdLmFwcGx5KHRoaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzd2l0Y2ggKHR5cGVvZiBtaXhpbikge1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICBNaXhpbi5taXhDbGFzcyhtaXhpbiwgbmV3Q2xhc3MpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgIE1peGluLm1peE9iamVjdChtaXhpbiwgdGhpcyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gbmV3Q2xhc3M7XG4gIH1cbiAgc3RhdGljIG1ha2UoLi4uY2xhc3Nlcykge1xuICAgIHZhciBiYXNlID0gY2xhc3Nlcy5wb3AoKTtcbiAgICByZXR1cm4gTWl4aW4udG8oYmFzZSwgLi4uY2xhc3Nlcyk7XG4gIH1cbiAgc3RhdGljIHRvKGJhc2UsIC4uLm1peGlucykge1xuICAgIHZhciBkZXNjcmlwdG9ycyA9IHt9O1xuICAgIG1peGlucy5tYXAobWl4aW4gPT4ge1xuICAgICAgc3dpdGNoICh0eXBlb2YgbWl4aW4pIHtcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGRlc2NyaXB0b3JzLCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhtaXhpbikpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihkZXNjcmlwdG9ycywgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMobWl4aW4ucHJvdG90eXBlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBkZWxldGUgZGVzY3JpcHRvcnMuY29uc3RydWN0b3I7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhiYXNlLnByb3RvdHlwZSwgZGVzY3JpcHRvcnMpO1xuICAgIH0pO1xuICB9XG4gIHN0YXRpYyB3aXRoKC4uLm1peGlucykge1xuICAgIHJldHVybiB0aGlzLmZyb20oY2xhc3Mge1xuICAgICAgY29uc3RydWN0b3IoKSB7fVxuICAgIH0sIC4uLm1peGlucyk7XG4gIH1cbiAgc3RhdGljIG1peE9iamVjdChtaXhpbiwgaW5zdGFuY2UpIHtcbiAgICBmb3IgKHZhciBmdW5jIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG1peGluKSkge1xuICAgICAgaWYgKHR5cGVvZiBtaXhpbltmdW5jXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpbnN0YW5jZVtmdW5jXSA9IG1peGluW2Z1bmNdLmJpbmQoaW5zdGFuY2UpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGluc3RhbmNlW2Z1bmNdID0gbWl4aW5bZnVuY107XG4gICAgfVxuICAgIGZvciAodmFyIF9mdW5jIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMobWl4aW4pKSB7XG4gICAgICBpZiAodHlwZW9mIG1peGluW19mdW5jXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpbnN0YW5jZVtfZnVuY10gPSBtaXhpbltfZnVuY10uYmluZChpbnN0YW5jZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW5zdGFuY2VbX2Z1bmNdID0gbWl4aW5bX2Z1bmNdO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgbWl4Q2xhc3MoY2xzLCBuZXdDbGFzcykge1xuICAgIGZvciAodmFyIGZ1bmMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2xzLnByb3RvdHlwZSkpIHtcbiAgICAgIGlmIChbJ25hbWUnLCAncHJvdG90eXBlJywgJ2xlbmd0aCddLmluY2x1ZGVzKGZ1bmMpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5ld0NsYXNzLCBmdW5jKTtcbiAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBjbHNbZnVuY10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW2Z1bmNdID0gY2xzLnByb3RvdHlwZVtmdW5jXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBuZXdDbGFzcy5wcm90b3R5cGVbZnVuY10gPSBjbHMucHJvdG90eXBlW2Z1bmNdLmJpbmQobmV3Q2xhc3MucHJvdG90eXBlKTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2Z1bmMyIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoY2xzLnByb3RvdHlwZSkpIHtcbiAgICAgIGlmICh0eXBlb2YgY2xzW19mdW5jMl0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW19mdW5jMl0gPSBjbHMucHJvdG90eXBlW19mdW5jMl07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW19mdW5jMl0gPSBjbHMucHJvdG90eXBlW19mdW5jMl0uYmluZChuZXdDbGFzcy5wcm90b3R5cGUpO1xuICAgIH1cbiAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChbJ25hbWUnLCAncHJvdG90eXBlJywgJ2xlbmd0aCddLmluY2x1ZGVzKF9mdW5jMykpIHtcbiAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobmV3Q2xhc3MsIF9mdW5jMyk7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBjbHNbX2Z1bmMzXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG5ld0NsYXNzW19mdW5jM10gPSBjbHNbX2Z1bmMzXTtcbiAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHJldiA9IG5ld0NsYXNzW19mdW5jM10gfHwgZmFsc2U7XG4gICAgICAgIHZhciBtZXRoID0gY2xzW19mdW5jM10uYmluZChuZXdDbGFzcyk7XG4gICAgICAgIG5ld0NsYXNzW19mdW5jM10gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgIHByZXYgJiYgcHJldiguLi5hcmdzKTtcbiAgICAgICAgICByZXR1cm4gbWV0aCguLi5hcmdzKTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBfcmV0O1xuICAgIGZvciAodmFyIF9mdW5jMyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjbHMpKSB7XG4gICAgICBfcmV0ID0gX2xvb3AoKTtcbiAgICAgIGlmIChfcmV0ID09PSAwKSBjb250aW51ZTtcbiAgICB9XG4gICAgdmFyIF9sb29wMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICh0eXBlb2YgY2xzW19mdW5jNF0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW19mdW5jNF0gPSBjbHNbX2Z1bmM0XTtcbiAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICB2YXIgcHJldiA9IG5ld0NsYXNzW19mdW5jNF0gfHwgZmFsc2U7XG4gICAgICB2YXIgbWV0aCA9IGNsc1tfZnVuYzRdLmJpbmQobmV3Q2xhc3MpO1xuICAgICAgbmV3Q2xhc3NbX2Z1bmM0XSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIHByZXYgJiYgcHJldiguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIG1ldGgoLi4uYXJncyk7XG4gICAgICB9O1xuICAgIH07XG4gICAgZm9yICh2YXIgX2Z1bmM0IG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoY2xzKSkge1xuICAgICAgaWYgKF9sb29wMigpKSBjb250aW51ZTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIG1peChtaXhpblRvKSB7XG4gICAgdmFyIGNvbnN0cnVjdG9ycyA9IFtdO1xuICAgIHZhciBhbGxTdGF0aWMgPSB7fTtcbiAgICB2YXIgYWxsSW5zdGFuY2UgPSB7fTtcbiAgICB2YXIgbWl4YWJsZSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUobWl4aW5Ubyk7XG4gICAgdmFyIF9sb29wMyA9IGZ1bmN0aW9uIChiYXNlKSB7XG4gICAgICB2YXIgaW5zdGFuY2VOYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGJhc2UucHJvdG90eXBlKTtcbiAgICAgIHZhciBzdGF0aWNOYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGJhc2UpO1xuICAgICAgdmFyIHByZWZpeCA9IC9eKGJlZm9yZXxhZnRlcilfXyguKykvO1xuICAgICAgdmFyIF9sb29wNSA9IGZ1bmN0aW9uIChfbWV0aG9kTmFtZTIpIHtcbiAgICAgICAgICB2YXIgbWF0Y2ggPSBfbWV0aG9kTmFtZTIubWF0Y2gocHJlZml4KTtcbiAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHN3aXRjaCAobWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgY2FzZSAnYmVmb3JlJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2JlZm9yZSgodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlW19tZXRob2ROYW1lMl0uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FmdGVyJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2FmdGVyKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2VbX21ldGhvZE5hbWUyXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYWxsU3RhdGljW19tZXRob2ROYW1lMl0pIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGJhc2VbX21ldGhvZE5hbWUyXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGFsbFN0YXRpY1tfbWV0aG9kTmFtZTJdID0gYmFzZVtfbWV0aG9kTmFtZTJdO1xuICAgICAgICB9LFxuICAgICAgICBfcmV0MjtcbiAgICAgIGZvciAodmFyIF9tZXRob2ROYW1lMiBvZiBzdGF0aWNOYW1lcykge1xuICAgICAgICBfcmV0MiA9IF9sb29wNShfbWV0aG9kTmFtZTIpO1xuICAgICAgICBpZiAoX3JldDIgPT09IDApIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIF9sb29wNiA9IGZ1bmN0aW9uIChfbWV0aG9kTmFtZTMpIHtcbiAgICAgICAgICB2YXIgbWF0Y2ggPSBfbWV0aG9kTmFtZTMubWF0Y2gocHJlZml4KTtcbiAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHN3aXRjaCAobWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgY2FzZSAnYmVmb3JlJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2JlZm9yZSgodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdhZnRlcic6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19hZnRlcigodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhbGxJbnN0YW5jZVtfbWV0aG9kTmFtZTNdKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgYWxsSW5zdGFuY2VbX21ldGhvZE5hbWUzXSA9IGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM107XG4gICAgICAgIH0sXG4gICAgICAgIF9yZXQzO1xuICAgICAgZm9yICh2YXIgX21ldGhvZE5hbWUzIG9mIGluc3RhbmNlTmFtZXMpIHtcbiAgICAgICAgX3JldDMgPSBfbG9vcDYoX21ldGhvZE5hbWUzKTtcbiAgICAgICAgaWYgKF9yZXQzID09PSAwKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZvciAodmFyIGJhc2UgPSB0aGlzOyBiYXNlICYmIGJhc2UucHJvdG90eXBlOyBiYXNlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGJhc2UpKSB7XG4gICAgICBfbG9vcDMoYmFzZSk7XG4gICAgfVxuICAgIGZvciAodmFyIG1ldGhvZE5hbWUgaW4gYWxsU3RhdGljKSB7XG4gICAgICBtaXhpblRvW21ldGhvZE5hbWVdID0gYWxsU3RhdGljW21ldGhvZE5hbWVdLmJpbmQobWl4aW5Ubyk7XG4gICAgfVxuICAgIHZhciBfbG9vcDQgPSBmdW5jdGlvbiAoX21ldGhvZE5hbWUpIHtcbiAgICAgIG1peGluVG8ucHJvdG90eXBlW19tZXRob2ROYW1lXSA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgIHJldHVybiBhbGxJbnN0YW5jZVtfbWV0aG9kTmFtZV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9O1xuICAgIH07XG4gICAgZm9yICh2YXIgX21ldGhvZE5hbWUgaW4gYWxsSW5zdGFuY2UpIHtcbiAgICAgIF9sb29wNChfbWV0aG9kTmFtZSk7XG4gICAgfVxuICAgIHJldHVybiBtaXhhYmxlO1xuICB9XG59XG5leHBvcnRzLk1peGluID0gTWl4aW47XG5NaXhpbi5Db25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvUm91dGVyLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Sb3V0ZXIgPSB2b2lkIDA7XG52YXIgX1ZpZXcgPSByZXF1aXJlKFwiLi9WaWV3XCIpO1xudmFyIF9DYWNoZSA9IHJlcXVpcmUoXCIuL0NhY2hlXCIpO1xudmFyIF9Db25maWcgPSByZXF1aXJlKFwiLi9Db25maWdcIik7XG52YXIgX1JvdXRlcyA9IHJlcXVpcmUoXCIuL1JvdXRlc1wiKTtcbnZhciBfd2luJEN1c3RvbUV2ZW50O1xudmFyIE5vdEZvdW5kRXJyb3IgPSBTeW1ib2woJ05vdEZvdW5kJyk7XG52YXIgSW50ZXJuYWxFcnJvciA9IFN5bWJvbCgnSW50ZXJuYWwnKTtcbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xud2luLkN1c3RvbUV2ZW50ID0gKF93aW4kQ3VzdG9tRXZlbnQgPSB3aW4uQ3VzdG9tRXZlbnQpICE9PSBudWxsICYmIF93aW4kQ3VzdG9tRXZlbnQgIT09IHZvaWQgMCA/IF93aW4kQ3VzdG9tRXZlbnQgOiB3aW4uRXZlbnQ7XG5jbGFzcyBSb3V0ZXIge1xuICBzdGF0aWMgd2FpdCh2aWV3LCBldmVudCA9ICdET01Db250ZW50TG9hZGVkJywgbm9kZSA9IGRvY3VtZW50KSB7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCAoKSA9PiB7XG4gICAgICB0aGlzLmxpc3Rlbih2aWV3KTtcbiAgICB9KTtcbiAgfVxuICBzdGF0aWMgbGlzdGVuKGxpc3RlbmVyLCByb3V0ZXMgPSBmYWxzZSkge1xuICAgIHRoaXMubGlzdGVuZXIgPSBsaXN0ZW5lciB8fCB0aGlzLmxpc3RlbmVyO1xuICAgIHRoaXMucm91dGVzID0gcm91dGVzIHx8IGxpc3RlbmVyLnJvdXRlcztcbiAgICBPYmplY3QuYXNzaWduKHRoaXMucXVlcnksIHRoaXMucXVlcnlPdmVyKHt9KSk7XG4gICAgdmFyIGxpc3RlbiA9IGV2ZW50ID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoZXZlbnQuc3RhdGUgJiYgJ3JvdXRlZElkJyBpbiBldmVudC5zdGF0ZSkge1xuICAgICAgICBpZiAoZXZlbnQuc3RhdGUucm91dGVkSWQgPD0gdGhpcy5yb3V0ZUNvdW50KSB7XG4gICAgICAgICAgdGhpcy5oaXN0b3J5LnNwbGljZShldmVudC5zdGF0ZS5yb3V0ZWRJZCk7XG4gICAgICAgICAgdGhpcy5yb3V0ZUNvdW50ID0gZXZlbnQuc3RhdGUucm91dGVkSWQ7XG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnQuc3RhdGUucm91dGVkSWQgPiB0aGlzLnJvdXRlQ291bnQpIHtcbiAgICAgICAgICB0aGlzLmhpc3RvcnkucHVzaChldmVudC5zdGF0ZS5wcmV2KTtcbiAgICAgICAgICB0aGlzLnJvdXRlQ291bnQgPSBldmVudC5zdGF0ZS5yb3V0ZWRJZDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YXRlID0gZXZlbnQuc3RhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5wcmV2UGF0aCAhPT0gbnVsbCAmJiB0aGlzLnByZXZQYXRoICE9PSBsb2NhdGlvbi5wYXRobmFtZSkge1xuICAgICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKHRoaXMucHJldlBhdGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSkge1xuICAgICAgICB0aGlzLm1hdGNoKGxvY2F0aW9uLnBhdGhuYW1lLCBsaXN0ZW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1hdGNoKHRoaXMubmV4dFBhdGgsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjdlVybENoYW5nZWQnLCBsaXN0ZW4pO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGxpc3Rlbik7XG4gICAgdmFyIHJvdXRlID0gIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSA/IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoIDogZmFsc2U7XG4gICAgaWYgKCF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikgJiYgbG9jYXRpb24uaGFzaCkge1xuICAgICAgcm91dGUgKz0gbG9jYXRpb24uaGFzaDtcbiAgICB9XG4gICAgdmFyIHN0YXRlID0ge1xuICAgICAgcm91dGVkSWQ6IHRoaXMucm91dGVDb3VudCxcbiAgICAgIHVybDogbG9jYXRpb24ucGF0aG5hbWUsXG4gICAgICBwcmV2OiB0aGlzLnByZXZQYXRoXG4gICAgfTtcbiAgICBpZiAoIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSkge1xuICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoc3RhdGUsIG51bGwsIGxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICB9XG4gICAgdGhpcy5nbyhyb3V0ZSAhPT0gZmFsc2UgPyByb3V0ZSA6ICcvJyk7XG4gIH1cbiAgc3RhdGljIGdvKHBhdGgsIHNpbGVudCA9IGZhbHNlKSB7XG4gICAgdmFyIGNvbmZpZ1RpdGxlID0gX0NvbmZpZy5Db25maWcuZ2V0KCd0aXRsZScpO1xuICAgIGlmIChjb25maWdUaXRsZSkge1xuICAgICAgZG9jdW1lbnQudGl0bGUgPSBjb25maWdUaXRsZTtcbiAgICB9XG4gICAgdmFyIHN0YXRlID0ge1xuICAgICAgcm91dGVkSWQ6IHRoaXMucm91dGVDb3VudCxcbiAgICAgIHByZXY6IHRoaXMucHJldlBhdGgsXG4gICAgICB1cmw6IGxvY2F0aW9uLnBhdGhuYW1lXG4gICAgfTtcbiAgICBpZiAoc2lsZW50ID09PSAtMSkge1xuICAgICAgdGhpcy5tYXRjaChwYXRoLCB0aGlzLmxpc3RlbmVyLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSkge1xuICAgICAgdGhpcy5uZXh0UGF0aCA9IHBhdGg7XG4gICAgfSBlbHNlIGlmIChzaWxlbnQgPT09IDIgJiYgbG9jYXRpb24ucGF0aG5hbWUgIT09IHBhdGgpIHtcbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlLCBudWxsLCBwYXRoKTtcbiAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLnBhdGhuYW1lICE9PSBwYXRoKSB7XG4gICAgICBoaXN0b3J5LnB1c2hTdGF0ZShzdGF0ZSwgbnVsbCwgcGF0aCk7XG4gICAgfVxuICAgIGlmICghc2lsZW50IHx8IHNpbGVudCA8IDApIHtcbiAgICAgIGlmIChzaWxlbnQgPT09IGZhbHNlKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICBpZiAocGF0aC5zdWJzdHJpbmcoMCwgMSkgPT09ICcjJykge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBIYXNoQ2hhbmdlRXZlbnQoJ2hhc2hjaGFuZ2UnKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdlVybENoYW5nZWQnKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wcmV2UGF0aCA9IHBhdGg7XG4gIH1cbiAgc3RhdGljIHByb2Nlc3NSb3V0ZShyb3V0ZXMsIHNlbGVjdGVkLCBhcmdzKSB7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmICh0eXBlb2Ygcm91dGVzW3NlbGVjdGVkXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKHJvdXRlc1tzZWxlY3RlZF0ucHJvdG90eXBlIGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICByZXN1bHQgPSBuZXcgcm91dGVzW3NlbGVjdGVkXShhcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IHJvdXRlc1tzZWxlY3RlZF0oYXJncyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IHJvdXRlc1tzZWxlY3RlZF07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgc3RhdGljIGhhbmRsZUVycm9yKGVycm9yLCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBsaXN0ZW5lciwgcGF0aCwgcHJldiwgZm9yY2VSZWZyZXNoKSB7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlRXJyb3InLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGVycm9yLFxuICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgcHJldixcbiAgICAgICAgICB2aWV3OiBsaXN0ZW5lcixcbiAgICAgICAgICByb3V0ZXMsXG4gICAgICAgICAgc2VsZWN0ZWRcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gd2luWydkZXZNb2RlJ10gPyAnVW5leHBlY3RlZCBlcnJvcjogJyArIFN0cmluZyhlcnJvcikgOiAnVW5leHBlY3RlZCBlcnJvci4nO1xuICAgIGlmIChyb3V0ZXNbSW50ZXJuYWxFcnJvcl0pIHtcbiAgICAgIGFyZ3NbSW50ZXJuYWxFcnJvcl0gPSBlcnJvcjtcbiAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc1JvdXRlKHJvdXRlcywgSW50ZXJuYWxFcnJvciwgYXJncyk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCk7XG4gIH1cbiAgc3RhdGljIG1hdGNoKHBhdGgsIGxpc3RlbmVyLCBvcHRpb25zID0gZmFsc2UpIHtcbiAgICB2YXIgZXZlbnQgPSBudWxsLFxuICAgICAgcmVxdWVzdCA9IG51bGwsXG4gICAgICBmb3JjZVJlZnJlc2ggPSBmYWxzZTtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgZm9yY2VSZWZyZXNoID0gb3B0aW9ucztcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3JjZVJlZnJlc2ggPSBvcHRpb25zLmZvcmNlUmVmcmVzaDtcbiAgICAgIGV2ZW50ID0gb3B0aW9ucy5ldmVudDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5wYXRoID09PSBwYXRoICYmICFmb3JjZVJlZnJlc2gpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG9yaWdpbiA9ICdodHRwOi8vZXhhbXBsZS5jb20nO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBvcmlnaW4gPSB0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikgPyBvcmlnaW4gOiBsb2NhdGlvbi5vcmlnaW47XG4gICAgICB0aGlzLnF1ZXJ5U3RyaW5nID0gbG9jYXRpb24uc2VhcmNoO1xuICAgIH1cbiAgICB2YXIgdXJsID0gbmV3IFVSTChwYXRoLCBvcmlnaW4pO1xuICAgIHBhdGggPSB0aGlzLnBhdGggPSB1cmwucGF0aG5hbWU7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMucXVlcnlTdHJpbmcgPSB1cmwuc2VhcmNoO1xuICAgIH1cbiAgICB2YXIgcHJldiA9IHRoaXMucHJldlBhdGg7XG4gICAgdmFyIGN1cnJlbnQgPSBsaXN0ZW5lciAmJiBsaXN0ZW5lci5hcmdzID8gbGlzdGVuZXIuYXJncy5jb250ZW50IDogbnVsbDtcbiAgICB2YXIgcm91dGVzID0gdGhpcy5yb3V0ZXMgfHwgbGlzdGVuZXIgJiYgbGlzdGVuZXIucm91dGVzIHx8IF9Sb3V0ZXMuUm91dGVzLmR1bXAoKTtcbiAgICB2YXIgcXVlcnkgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHRoaXMucXVlcnlTdHJpbmcpO1xuICAgIGlmIChldmVudCAmJiBldmVudC5yZXF1ZXN0KSB7XG4gICAgICB0aGlzLnJlcXVlc3QgPSBldmVudC5yZXF1ZXN0O1xuICAgIH1cbiAgICBmb3IgKHZhciBrZXkgaW4gT2JqZWN0LmtleXModGhpcy5xdWVyeSkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLnF1ZXJ5W2tleV07XG4gICAgfVxuICAgIGZvciAodmFyIFtfa2V5LCB2YWx1ZV0gb2YgcXVlcnkpIHtcbiAgICAgIHRoaXMucXVlcnlbX2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgdmFyIGFyZ3MgPSB7fSxcbiAgICAgIHNlbGVjdGVkID0gZmFsc2UsXG4gICAgICByZXN1bHQgPSAnJztcbiAgICBpZiAocGF0aC5zdWJzdHJpbmcoMCwgMSkgPT09ICcvJykge1xuICAgICAgcGF0aCA9IHBhdGguc3Vic3RyaW5nKDEpO1xuICAgIH1cbiAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5xdWVyeSkge1xuICAgICAgYXJnc1tpXSA9IHRoaXMucXVlcnlbaV07XG4gICAgfVxuICAgIEwxOiBmb3IgKHZhciBfaSBpbiByb3V0ZXMpIHtcbiAgICAgIHZhciByb3V0ZSA9IF9pLnNwbGl0KCcvJyk7XG4gICAgICBpZiAocm91dGUubGVuZ3RoIDwgcGF0aC5sZW5ndGggJiYgcm91dGVbcm91dGUubGVuZ3RoIC0gMV0gIT09ICcqJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIEwyOiBmb3IgKHZhciBqIGluIHJvdXRlKSB7XG4gICAgICAgIGlmIChyb3V0ZVtqXS5zdWJzdHIoMCwgMSkgPT0gJyUnKSB7XG4gICAgICAgICAgdmFyIGFyZ05hbWUgPSBudWxsO1xuICAgICAgICAgIHZhciBncm91cHMgPSAvXiUoXFx3KylcXD8/Ly5leGVjKHJvdXRlW2pdKTtcbiAgICAgICAgICBpZiAoZ3JvdXBzICYmIGdyb3Vwc1sxXSkge1xuICAgICAgICAgICAgYXJnTmFtZSA9IGdyb3Vwc1sxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFhcmdOYW1lKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cm91dGVbal19IGlzIG5vdCBhIHZhbGlkIGFyZ3VtZW50IHNlZ21lbnQgaW4gcm91dGUgXCIke19pfVwiYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghcGF0aFtqXSkge1xuICAgICAgICAgICAgaWYgKHJvdXRlW2pdLnN1YnN0cihyb3V0ZVtqXS5sZW5ndGggLSAxLCAxKSA9PSAnPycpIHtcbiAgICAgICAgICAgICAgYXJnc1thcmdOYW1lXSA9ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGludWUgTDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFyZ3NbYXJnTmFtZV0gPSBwYXRoW2pdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyb3V0ZVtqXSAhPT0gJyonICYmIHBhdGhbal0gIT09IHJvdXRlW2pdKSB7XG4gICAgICAgICAgY29udGludWUgTDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNlbGVjdGVkID0gX2k7XG4gICAgICByZXN1bHQgPSByb3V0ZXNbX2ldO1xuICAgICAgaWYgKHJvdXRlW3JvdXRlLmxlbmd0aCAtIDFdID09PSAnKicpIHtcbiAgICAgICAgYXJncy5wYXRocGFydHMgPSBwYXRoLnNsaWNlKHJvdXRlLmxlbmd0aCAtIDEpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHZhciBldmVudFN0YXJ0ID0gbmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlU3RhcnQnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHBhdGgsXG4gICAgICAgIHByZXYsXG4gICAgICAgIHJvb3Q6IGxpc3RlbmVyLFxuICAgICAgICBzZWxlY3RlZCxcbiAgICAgICAgcm91dGVzXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGlmICghZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudFN0YXJ0KSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghZm9yY2VSZWZyZXNoICYmIGxpc3RlbmVyICYmIGN1cnJlbnQgJiYgdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcgJiYgY3VycmVudC5jb25zdHJ1Y3RvciA9PT0gcmVzdWx0LmNvbnN0cnVjdG9yICYmICEocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkgJiYgY3VycmVudC51cGRhdGUoYXJncykpIHtcbiAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudCA9IGN1cnJlbnQ7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCEoc2VsZWN0ZWQgaW4gcm91dGVzKSkge1xuICAgICAgcm91dGVzW3NlbGVjdGVkXSA9IHJvdXRlc1tOb3RGb3VuZEVycm9yXTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc1JvdXRlKHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzUm91dGUocm91dGVzLCBOb3RGb3VuZEVycm9yLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICghKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICBpZiAoIShyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQudGhlbihyZWFsUmVzdWx0ID0+IHRoaXMudXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZWFsUmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpKS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgIHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGxpc3RlbmVyLCBwYXRoLCBwcmV2LCBmb3JjZVJlZnJlc2gpO1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGxpc3RlbmVyLCBwYXRoLCBwcmV2LCBmb3JjZVJlZnJlc2gpO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgdXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCkge1xuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHByZXYgPSB0aGlzLnByZXZQYXRoO1xuICAgIHZhciBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZScsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgcmVzdWx0LFxuICAgICAgICBwYXRoLFxuICAgICAgICBwcmV2LFxuICAgICAgICB2aWV3OiBsaXN0ZW5lcixcbiAgICAgICAgcm91dGVzLFxuICAgICAgICBzZWxlY3RlZFxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICBpZiAobGlzdGVuZXIuYXJncy5jb250ZW50IGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQucGF1c2UodHJ1ZSk7XG4gICAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGlmIChkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KSkge1xuICAgICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQgPSByZXN1bHQ7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICByZXN1bHQucGF1c2UoZmFsc2UpO1xuICAgICAgICByZXN1bHQudXBkYXRlKGFyZ3MsIGZvcmNlUmVmcmVzaCk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBldmVudEVuZCA9IG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZUVuZCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgcmVzdWx0LFxuICAgICAgICBwYXRoLFxuICAgICAgICBwcmV2LFxuICAgICAgICB2aWV3OiBsaXN0ZW5lcixcbiAgICAgICAgcm91dGVzLFxuICAgICAgICBzZWxlY3RlZFxuICAgICAgfVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRFbmQpO1xuICB9XG4gIHN0YXRpYyBpc09yaWdpbkxpbWl0ZWQoe1xuICAgIG9yaWdpblxuICB9KSB7XG4gICAgcmV0dXJuIG9yaWdpbiA9PT0gJ251bGwnIHx8IG9yaWdpbiA9PT0gJ2ZpbGU6Ly8nO1xuICB9XG4gIHN0YXRpYyBxdWVyeU92ZXIoYXJncyA9IHt9KSB7XG4gICAgdmFyIHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKTtcbiAgICB2YXIgZmluYWxBcmdzID0ge307XG4gICAgdmFyIHF1ZXJ5ID0ge307XG4gICAgZm9yICh2YXIgcGFpciBvZiBwYXJhbXMpIHtcbiAgICAgIHF1ZXJ5W3BhaXJbMF1dID0gcGFpclsxXTtcbiAgICB9XG4gICAgZmluYWxBcmdzID0gT2JqZWN0LmFzc2lnbihmaW5hbEFyZ3MsIHF1ZXJ5LCBhcmdzKTtcbiAgICBkZWxldGUgZmluYWxBcmdzWydhcGknXTtcbiAgICByZXR1cm4gZmluYWxBcmdzO1xuXG4gICAgLy8gZm9yKGxldCBpIGluIHF1ZXJ5KVxuICAgIC8vIHtcbiAgICAvLyBcdGZpbmFsQXJnc1tpXSA9IHF1ZXJ5W2ldO1xuICAgIC8vIH1cblxuICAgIC8vIGZvcihsZXQgaSBpbiBhcmdzKVxuICAgIC8vIHtcbiAgICAvLyBcdGZpbmFsQXJnc1tpXSA9IGFyZ3NbaV07XG4gICAgLy8gfVxuICB9XG4gIHN0YXRpYyBxdWVyeVRvU3RyaW5nKGFyZ3MgPSB7fSwgZnJlc2ggPSBmYWxzZSkge1xuICAgIHZhciBwYXJ0cyA9IFtdLFxuICAgICAgZmluYWxBcmdzID0gYXJncztcbiAgICBpZiAoIWZyZXNoKSB7XG4gICAgICBmaW5hbEFyZ3MgPSB0aGlzLnF1ZXJ5T3ZlcihhcmdzKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiBmaW5hbEFyZ3MpIHtcbiAgICAgIGlmIChmaW5hbEFyZ3NbaV0gPT09ICcnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcGFydHMucHVzaChpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbmFsQXJnc1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gcGFydHMuam9pbignJicpO1xuICB9XG4gIHN0YXRpYyBzZXRRdWVyeShuYW1lLCB2YWx1ZSwgc2lsZW50KSB7XG4gICAgdmFyIGFyZ3MgPSB0aGlzLnF1ZXJ5T3ZlcigpO1xuICAgIGFyZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZGVsZXRlIGFyZ3NbbmFtZV07XG4gICAgfVxuICAgIHZhciBxdWVyeVN0cmluZyA9IHRoaXMucXVlcnlUb1N0cmluZyhhcmdzLCB0cnVlKTtcbiAgICB0aGlzLmdvKGxvY2F0aW9uLnBhdGhuYW1lICsgKHF1ZXJ5U3RyaW5nID8gJz8nICsgcXVlcnlTdHJpbmcgOiAnPycpLCBzaWxlbnQpO1xuICB9XG59XG5leHBvcnRzLlJvdXRlciA9IFJvdXRlcjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdxdWVyeScsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IHt9XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdoaXN0b3J5Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogW11cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3JvdXRlQ291bnQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IDBcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3ByZXZQYXRoJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiBudWxsXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdxdWVyeVN0cmluZycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogbnVsbFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAnSW50ZXJuYWxFcnJvcicsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEludGVybmFsRXJyb3Jcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ05vdEZvdW5kRXJyb3InLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBOb3RGb3VuZEVycm9yXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1JvdXRlcy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUm91dGVzID0gdm9pZCAwO1xudmFyIEFwcFJvdXRlcyA9IHt9O1xudmFyIF9yZXF1aXJlID0gcmVxdWlyZTtcbnZhciBpbXBvcnRlZCA9IGZhbHNlO1xudmFyIHJ1bkltcG9ydCA9ICgpID0+IHtcbiAgaWYgKGltcG9ydGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIDtcbiAgdHJ5IHtcbiAgICBPYmplY3QuYXNzaWduKEFwcFJvdXRlcywgX3JlcXVpcmUoJ1JvdXRlcycpLlJvdXRlcyB8fCB7fSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgZ2xvYmFsVGhpcy5kZXZNb2RlID09PSB0cnVlICYmIGNvbnNvbGUud2FybihlcnJvcik7XG4gIH1cbiAgaW1wb3J0ZWQgPSB0cnVlO1xufTtcbmNsYXNzIFJvdXRlcyB7XG4gIHN0YXRpYyBnZXQobmFtZSkge1xuICAgIHJ1bkltcG9ydCgpO1xuICAgIHJldHVybiB0aGlzLnJvdXRlc1tuYW1lXTtcbiAgfVxuICBzdGF0aWMgZHVtcCgpIHtcbiAgICBydW5JbXBvcnQoKTtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXM7XG4gIH1cbn1cbmV4cG9ydHMuUm91dGVzID0gUm91dGVzO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlcywgJ3JvdXRlcycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEFwcFJvdXRlc1xufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9SdWxlU2V0LmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5SdWxlU2V0ID0gdm9pZCAwO1xudmFyIF9Eb20gPSByZXF1aXJlKFwiLi9Eb21cIik7XG52YXIgX1RhZyA9IHJlcXVpcmUoXCIuL1RhZ1wiKTtcbnZhciBfVmlldyA9IHJlcXVpcmUoXCIuL1ZpZXdcIik7XG5jbGFzcyBSdWxlU2V0IHtcbiAgc3RhdGljIGFkZChzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmdsb2JhbFJ1bGVzID0gdGhpcy5nbG9iYWxSdWxlcyB8fCB7fTtcbiAgICB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXSA9IHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdIHx8IFtdO1xuICAgIHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdLnB1c2goY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHN0YXRpYyBhcHBseShkb2MgPSBkb2N1bWVudCwgdmlldyA9IG51bGwpIHtcbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiB0aGlzLmdsb2JhbFJ1bGVzKSB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdW2ldO1xuICAgICAgICB2YXIgd3JhcHBlZCA9IHRoaXMud3JhcChkb2MsIGNhbGxiYWNrLCB2aWV3KTtcbiAgICAgICAgdmFyIG5vZGVzID0gZG9jLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBmb3IgKHZhciBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgd3JhcHBlZChub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBhZGQoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5ydWxlcyA9IHRoaXMucnVsZXMgfHwge307XG4gICAgdGhpcy5ydWxlc1tzZWxlY3Rvcl0gPSB0aGlzLnJ1bGVzW3NlbGVjdG9yXSB8fCBbXTtcbiAgICB0aGlzLnJ1bGVzW3NlbGVjdG9yXS5wdXNoKGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBhcHBseShkb2MgPSBkb2N1bWVudCwgdmlldyA9IG51bGwpIHtcbiAgICBSdWxlU2V0LmFwcGx5KGRvYywgdmlldyk7XG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gdGhpcy5ydWxlcykge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnJ1bGVzW3NlbGVjdG9yXSkge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLnJ1bGVzW3NlbGVjdG9yXVtpXTtcbiAgICAgICAgdmFyIHdyYXBwZWQgPSBSdWxlU2V0LndyYXAoZG9jLCBjYWxsYmFjaywgdmlldyk7XG4gICAgICAgIHZhciBub2RlcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZm9yICh2YXIgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgIHdyYXBwZWQobm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcHVyZ2UoKSB7XG4gICAgaWYgKCF0aGlzLnJ1bGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAodmFyIFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnJ1bGVzKSkge1xuICAgICAgaWYgKCF0aGlzLnJ1bGVzW2tdKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIga2sgaW4gdGhpcy5ydWxlc1trXSkge1xuICAgICAgICBkZWxldGUgdGhpcy5ydWxlc1trXVtra107XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHN0YXRpYyB3YWl0KGV2ZW50ID0gJ0RPTUNvbnRlbnRMb2FkZWQnLCBub2RlID0gZG9jdW1lbnQpIHtcbiAgICB2YXIgbGlzdGVuZXIgPSAoKGV2ZW50LCBub2RlKSA9PiAoKSA9PiB7XG4gICAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzLmFwcGx5KCk7XG4gICAgfSkoZXZlbnQsIG5vZGUpO1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICB9XG4gIHN0YXRpYyB3cmFwKGRvYywgb3JpZ2luYWxDYWxsYmFjaywgdmlldyA9IG51bGwpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBvcmlnaW5hbENhbGxiYWNrO1xuICAgIGlmIChvcmlnaW5hbENhbGxiYWNrIGluc3RhbmNlb2YgX1ZpZXcuVmlldyB8fCBvcmlnaW5hbENhbGxiYWNrICYmIG9yaWdpbmFsQ2FsbGJhY2sucHJvdG90eXBlICYmIG9yaWdpbmFsQ2FsbGJhY2sucHJvdG90eXBlIGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgY2FsbGJhY2sgPSAoKSA9PiBvcmlnaW5hbENhbGxiYWNrO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudCA9PiB7XG4gICAgICBpZiAodHlwZW9mIGVsZW1lbnQuX19fY3ZBcHBsaWVkX19fID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZWxlbWVudCwgJ19fX2N2QXBwbGllZF9fXycsIHtcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgICAgdmFsdWU6IG5ldyBXZWFrU2V0KClcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoZWxlbWVudC5fX19jdkFwcGxpZWRfX18uaGFzKG9yaWdpbmFsQ2FsbGJhY2spKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBkaXJlY3QsIHBhcmVudFZpZXc7XG4gICAgICBpZiAodmlldykge1xuICAgICAgICBkaXJlY3QgPSBwYXJlbnRWaWV3ID0gdmlldztcbiAgICAgICAgaWYgKHZpZXcudmlld0xpc3QpIHtcbiAgICAgICAgICBwYXJlbnRWaWV3ID0gdmlldy52aWV3TGlzdC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciB0YWcgPSBuZXcgX1RhZy5UYWcoZWxlbWVudCwgcGFyZW50VmlldywgbnVsbCwgdW5kZWZpbmVkLCBkaXJlY3QpO1xuICAgICAgdmFyIHBhcmVudCA9IHRhZy5lbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICB2YXIgc2libGluZyA9IHRhZy5lbGVtZW50Lm5leHRTaWJsaW5nO1xuICAgICAgdmFyIHJlc3VsdCA9IGNhbGxiYWNrKHRhZyk7XG4gICAgICBpZiAocmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgICBlbGVtZW50Ll9fX2N2QXBwbGllZF9fXy5hZGQob3JpZ2luYWxDYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IF9UYWcuVGFnKHJlc3VsdCk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgICAgaWYgKCFyZXN1bHQuZWxlbWVudC5jb250YWlucyh0YWcuZWxlbWVudCkpIHtcbiAgICAgICAgICB3aGlsZSAodGFnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgcmVzdWx0LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGFnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2libGluZykge1xuICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUocmVzdWx0LmVsZW1lbnQsIHNpYmxpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChyZXN1bHQuZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnByb3RvdHlwZSAmJiByZXN1bHQucHJvdG90eXBlIGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICByZXN1bHQgPSBuZXcgcmVzdWx0KHt9LCB2aWV3KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgdmlldy5jbGVhbnVwLnB1c2goKCkgPT4gcmVzdWx0LnJlbW92ZSgpKTtcbiAgICAgICAgICB2aWV3LmNsZWFudXAucHVzaCh2aWV3LmFyZ3MuYmluZFRvKCh2LCBrLCB0KSA9PiB7XG4gICAgICAgICAgICB0W2tdID0gdjtcbiAgICAgICAgICAgIHJlc3VsdC5hcmdzW2tdID0gdjtcbiAgICAgICAgICB9KSk7XG4gICAgICAgICAgdmlldy5jbGVhbnVwLnB1c2gocmVzdWx0LmFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgICB0W2tdID0gdjtcbiAgICAgICAgICAgIHZpZXcuYXJnc1trXSA9IHY7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIHRhZy5jbGVhcigpO1xuICAgICAgICByZXN1bHQucmVuZGVyKHRhZy5lbGVtZW50KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG5leHBvcnRzLlJ1bGVTZXQgPSBSdWxlU2V0O1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5TZXRNYXAgPSB2b2lkIDA7XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkoZSwgciwgdCkgeyByZXR1cm4gKHIgPSBfdG9Qcm9wZXJ0eUtleShyKSkgaW4gZSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCByLCB7IHZhbHVlOiB0LCBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwIH0pIDogZVtyXSA9IHQsIGU7IH1cbmZ1bmN0aW9uIF90b1Byb3BlcnR5S2V5KHQpIHsgdmFyIGkgPSBfdG9QcmltaXRpdmUodCwgXCJzdHJpbmdcIik7IHJldHVybiBcInN5bWJvbFwiID09IHR5cGVvZiBpID8gaSA6IGkgKyBcIlwiOyB9XG5mdW5jdGlvbiBfdG9QcmltaXRpdmUodCwgcikgeyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgdCB8fCAhdCkgcmV0dXJuIHQ7IHZhciBlID0gdFtTeW1ib2wudG9QcmltaXRpdmVdOyBpZiAodm9pZCAwICE9PSBlKSB7IHZhciBpID0gZS5jYWxsKHQsIHIgfHwgXCJkZWZhdWx0XCIpOyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgaSkgcmV0dXJuIGk7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJAQHRvUHJpbWl0aXZlIG11c3QgcmV0dXJuIGEgcHJpbWl0aXZlIHZhbHVlLlwiKTsgfSByZXR1cm4gKFwic3RyaW5nXCIgPT09IHIgPyBTdHJpbmcgOiBOdW1iZXIpKHQpOyB9XG5jbGFzcyBTZXRNYXAge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBfZGVmaW5lUHJvcGVydHkodGhpcywgXCJfbWFwXCIsIG5ldyBNYXAoKSk7XG4gIH1cbiAgaGFzKGtleSkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuaGFzKGtleSk7XG4gIH1cbiAgZ2V0KGtleSkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuZ2V0KGtleSk7XG4gIH1cbiAgZ2V0T25lKGtleSkge1xuICAgIHZhciBzZXQgPSB0aGlzLmdldChrZXkpO1xuICAgIGZvciAodmFyIGVudHJ5IG9mIHNldCkge1xuICAgICAgcmV0dXJuIGVudHJ5O1xuICAgIH1cbiAgfVxuICBhZGQoa2V5LCB2YWx1ZSkge1xuICAgIHZhciBzZXQgPSB0aGlzLl9tYXAuZ2V0KGtleSk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHRoaXMuX21hcC5zZXQoa2V5LCBzZXQgPSBuZXcgU2V0KCkpO1xuICAgIH1cbiAgICByZXR1cm4gc2V0LmFkZCh2YWx1ZSk7XG4gIH1cbiAgcmVtb3ZlKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy5fbWFwLmdldChrZXkpO1xuICAgIGlmICghc2V0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXMgPSBzZXQuZGVsZXRlKHZhbHVlKTtcbiAgICBpZiAoIXNldC5zaXplKSB7XG4gICAgICB0aGlzLl9tYXAuZGVsZXRlKGtleSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cbiAgdmFsdWVzKCkge1xuICAgIHJldHVybiBuZXcgU2V0KC4uLlsuLi50aGlzLl9tYXAudmFsdWVzKCldLm1hcChzZXQgPT4gWy4uLnNldC52YWx1ZXMoKV0pKTtcbiAgfVxufVxuZXhwb3J0cy5TZXRNYXAgPSBTZXRNYXA7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9UYWcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlRhZyA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBDdXJyZW50U3R5bGUgPSBTeW1ib2woJ0N1cnJlbnRTdHlsZScpO1xudmFyIEN1cnJlbnRBdHRycyA9IFN5bWJvbCgnQ3VycmVudEF0dHJzJyk7XG52YXIgc3R5bGVyID0gZnVuY3Rpb24gKHN0eWxlcykge1xuICBpZiAoIXRoaXMubm9kZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdHlsZXMpIHtcbiAgICB2YXIgc3RyaW5nZWRQcm9wZXJ0eSA9IFN0cmluZyhzdHlsZXNbcHJvcGVydHldKTtcbiAgICBpZiAodGhpc1tDdXJyZW50U3R5bGVdLmhhcyhwcm9wZXJ0eSkgJiYgdGhpc1tDdXJyZW50U3R5bGVdLmdldChwcm9wZXJ0eSkgPT09IHN0eWxlc1twcm9wZXJ0eV0gfHwgTnVtYmVyLmlzTmFOKHN0eWxlc1twcm9wZXJ0eV0pKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKHByb3BlcnR5WzBdID09PSAnLScpIHtcbiAgICAgIHRoaXMubm9kZS5zdHlsZS5zZXRQcm9wZXJ0eShwcm9wZXJ0eSwgc3RyaW5nZWRQcm9wZXJ0eSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubm9kZS5zdHlsZVtwcm9wZXJ0eV0gPSBzdHJpbmdlZFByb3BlcnR5O1xuICAgIH1cbiAgICBpZiAoc3R5bGVzW3Byb3BlcnR5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uc2V0KHByb3BlcnR5LCBzdHlsZXNbcHJvcGVydHldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLmRlbGV0ZShwcm9wZXJ0eSk7XG4gICAgfVxuICB9XG59O1xudmFyIGdldHRlciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIGlmICh0eXBlb2YgdGhpc1tuYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0aGlzW25hbWVdO1xuICB9XG4gIGlmICh0aGlzLm5vZGUgJiYgdHlwZW9mIHRoaXMubm9kZVtuYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0aGlzW25hbWVdID0gKC4uLmFyZ3MpID0+IHRoaXMubm9kZVtuYW1lXSguLi5hcmdzKTtcbiAgfVxuICBpZiAobmFtZSA9PT0gJ3N0eWxlJykge1xuICAgIHJldHVybiB0aGlzLnByb3h5LnN0eWxlO1xuICB9XG4gIGlmICh0aGlzLm5vZGUgJiYgbmFtZSBpbiB0aGlzLm5vZGUpIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlW25hbWVdO1xuICB9XG4gIHJldHVybiB0aGlzW25hbWVdO1xufTtcbmNsYXNzIFRhZyB7XG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIHBhcmVudCwgcmVmLCBpbmRleCwgZGlyZWN0KSB7XG4gICAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgdmFyIHN1YmRvYyA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KGVsZW1lbnQpO1xuICAgICAgZWxlbWVudCA9IHN1YmRvYy5maXJzdENoaWxkO1xuICAgIH1cbiAgICB0aGlzLmVsZW1lbnQgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKGVsZW1lbnQpO1xuICAgIHRoaXMubm9kZSA9IHRoaXMuZWxlbWVudDtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLmRpcmVjdCA9IGRpcmVjdDtcbiAgICB0aGlzLnJlZiA9IHJlZjtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5jbGVhbnVwID0gW107XG4gICAgdGhpc1tfQmluZGFibGUuQmluZGFibGUuT25BbGxHZXRdID0gZ2V0dGVyLmJpbmQodGhpcyk7XG4gICAgdGhpc1tDdXJyZW50U3R5bGVdID0gbmV3IE1hcCgpO1xuICAgIHRoaXNbQ3VycmVudEF0dHJzXSA9IG5ldyBNYXAoKTtcbiAgICB2YXIgYm91bmRTdHlsZXIgPSBfQmluZGFibGUuQmluZGFibGUubWFrZShzdHlsZXIuYmluZCh0aGlzKSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdzdHlsZScsIHtcbiAgICAgIHZhbHVlOiBib3VuZFN0eWxlclxuICAgIH0pO1xuICAgIHRoaXMucHJveHkgPSBfQmluZGFibGUuQmluZGFibGUubWFrZSh0aGlzKTtcbiAgICB0aGlzLnByb3h5LnN0eWxlLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgaWYgKHRoaXNbQ3VycmVudFN0eWxlXS5oYXMoaykgJiYgdGhpc1tDdXJyZW50U3R5bGVdLmdldChrKSA9PT0gdikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLm5vZGUuc3R5bGVba10gPSB2O1xuICAgICAgaWYgKCFkICYmIHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uc2V0KGssIHYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLmRlbGV0ZShrKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnByb3h5LmJpbmRUbygodiwgaykgPT4ge1xuICAgICAgaWYgKGsgPT09ICdpbmRleCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGsgaW4gZWxlbWVudCAmJiBlbGVtZW50W2tdICE9PSB2KSB7XG4gICAgICAgIGVsZW1lbnRba10gPSB2O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnByb3h5O1xuICB9XG4gIGF0dHIoYXR0cmlidXRlcykge1xuICAgIGZvciAodmFyIGF0dHJpYnV0ZSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICBpZiAodGhpc1tDdXJyZW50QXR0cnNdLmhhcyhhdHRyaWJ1dGUpICYmIGF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgICAgICAgdGhpc1tDdXJyZW50QXR0cnNdLmRlbGV0ZShhdHRyaWJ1dGUpO1xuICAgICAgfSBlbHNlIGlmICghdGhpc1tDdXJyZW50QXR0cnNdLmhhcyhhdHRyaWJ1dGUpIHx8IHRoaXNbQ3VycmVudEF0dHJzXS5nZXQoYXR0cmlidXRlKSAhPT0gYXR0cmlidXRlc1thdHRyaWJ1dGVdKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLm5vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZSwgJycpO1xuICAgICAgICAgIHRoaXNbQ3VycmVudEF0dHJzXS5zZXQoYXR0cmlidXRlLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5ub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsIGF0dHJpYnV0ZXNbYXR0cmlidXRlXSk7XG4gICAgICAgICAgdGhpc1tDdXJyZW50QXR0cnNdLnNldChhdHRyaWJ1dGUsIGF0dHJpYnV0ZXNbYXR0cmlidXRlXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgcmVtb3ZlKCkge1xuICAgIGlmICh0aGlzLm5vZGUpIHtcbiAgICAgIHRoaXMubm9kZS5yZW1vdmUoKTtcbiAgICB9XG4gICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcyk7XG4gICAgdmFyIGNsZWFudXA7XG4gICAgd2hpbGUgKGNsZWFudXAgPSB0aGlzLmNsZWFudXAuc2hpZnQoKSkge1xuICAgICAgY2xlYW51cCgpO1xuICAgIH1cbiAgICB0aGlzLmNsZWFyKCk7XG4gICAgaWYgKCF0aGlzLm5vZGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGRldGFjaEV2ZW50ID0gbmV3IEV2ZW50KCdjdkRvbURldGFjaGVkJyk7XG4gICAgdGhpcy5ub2RlLmRpc3BhdGNoRXZlbnQoZGV0YWNoRXZlbnQpO1xuICAgIHRoaXMubm9kZSA9IHRoaXMuZWxlbWVudCA9IHRoaXMucmVmID0gdGhpcy5wYXJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cbiAgY2xlYXIoKSB7XG4gICAgaWYgKCF0aGlzLm5vZGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGRldGFjaEV2ZW50ID0gbmV3IEV2ZW50KCdjdkRvbURldGFjaGVkJyk7XG4gICAgd2hpbGUgKHRoaXMubm9kZS5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLm5vZGUuZmlyc3RDaGlsZC5kaXNwYXRjaEV2ZW50KGRldGFjaEV2ZW50KTtcbiAgICAgIHRoaXMubm9kZS5yZW1vdmVDaGlsZCh0aGlzLm5vZGUuZmlyc3RDaGlsZCk7XG4gICAgfVxuICB9XG4gIHBhdXNlKHBhdXNlZCA9IHRydWUpIHt9XG4gIGxpc3RlbihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLm5vZGU7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIHZhciByZW1vdmUgPSAoKSA9PiB7XG4gICAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB2YXIgcmVtb3ZlciA9ICgpID0+IHtcbiAgICAgIHJlbW92ZSgpO1xuICAgICAgcmVtb3ZlID0gKCkgPT4gY29uc29sZS53YXJuKCdBbHJlYWR5IHJlbW92ZWQhJyk7XG4gICAgfTtcbiAgICB0aGlzLnBhcmVudC5vblJlbW92ZSgoKSA9PiByZW1vdmVyKCkpO1xuICAgIHJldHVybiByZW1vdmVyO1xuICB9XG59XG5leHBvcnRzLlRhZyA9IFRhZztcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1V1aWQuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlV1aWQgPSB2b2lkIDA7XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkoZSwgciwgdCkgeyByZXR1cm4gKHIgPSBfdG9Qcm9wZXJ0eUtleShyKSkgaW4gZSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCByLCB7IHZhbHVlOiB0LCBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwIH0pIDogZVtyXSA9IHQsIGU7IH1cbmZ1bmN0aW9uIF90b1Byb3BlcnR5S2V5KHQpIHsgdmFyIGkgPSBfdG9QcmltaXRpdmUodCwgXCJzdHJpbmdcIik7IHJldHVybiBcInN5bWJvbFwiID09IHR5cGVvZiBpID8gaSA6IGkgKyBcIlwiOyB9XG5mdW5jdGlvbiBfdG9QcmltaXRpdmUodCwgcikgeyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgdCB8fCAhdCkgcmV0dXJuIHQ7IHZhciBlID0gdFtTeW1ib2wudG9QcmltaXRpdmVdOyBpZiAodm9pZCAwICE9PSBlKSB7IHZhciBpID0gZS5jYWxsKHQsIHIgfHwgXCJkZWZhdWx0XCIpOyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgaSkgcmV0dXJuIGk7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJAQHRvUHJpbWl0aXZlIG11c3QgcmV0dXJuIGEgcHJpbWl0aXZlIHZhbHVlLlwiKTsgfSByZXR1cm4gKFwic3RyaW5nXCIgPT09IHIgPyBTdHJpbmcgOiBOdW1iZXIpKHQpOyB9XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbnZhciBjcnlwdG8gPSB3aW4uY3J5cHRvO1xuY2xhc3MgVXVpZCB7XG4gIGNvbnN0cnVjdG9yKHV1aWQgPSBudWxsLCB2ZXJzaW9uID0gNCkge1xuICAgIF9kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInV1aWRcIiwgbnVsbCk7XG4gICAgX2RlZmluZVByb3BlcnR5KHRoaXMsIFwidmVyc2lvblwiLCA0KTtcbiAgICBpZiAodXVpZCkge1xuICAgICAgaWYgKHR5cGVvZiB1dWlkICE9PSAnc3RyaW5nJyAmJiAhKHV1aWQgaW5zdGFuY2VvZiBVdWlkKSB8fCAhdXVpZC5tYXRjaCgvWzAtOUEtRmEtZl17OH0oLVswLTlBLUZhLWZdezR9KXszfS1bMC05QS1GYS1mXXsxMn0vKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgaW5wdXQgZm9yIFV1aWQ6IFwiJHt1dWlkfVwiYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnZlcnNpb24gPSB2ZXJzaW9uO1xuICAgICAgdGhpcy51dWlkID0gdXVpZDtcbiAgICB9IGVsc2UgaWYgKGNyeXB0byAmJiB0eXBlb2YgY3J5cHRvLnJhbmRvbVVVSUQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMudXVpZCA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBpbml0ID0gWzFlN10gKyAtMWUzICsgLTRlMyArIC04ZTMgKyAtMWUxMTtcbiAgICAgIHZhciByYW5kID0gY3J5cHRvICYmIHR5cGVvZiBjcnlwdG8ucmFuZG9tVVVJRCA9PT0gJ2Z1bmN0aW9uJyA/ICgpID0+IGNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQ4QXJyYXkoMSkpWzBdIDogKCkgPT4gTWF0aC50cnVuYyhNYXRoLnJhbmRvbSgpICogMjU2KTtcbiAgICAgIHRoaXMudXVpZCA9IGluaXQucmVwbGFjZSgvWzAxOF0vZywgYyA9PiAoYyBeIHJhbmQoKSAmIDE1ID4+IGMgLyA0KS50b1N0cmluZygxNikpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9XG4gIFtTeW1ib2wudG9QcmltaXRpdmVdKCkge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMudXVpZDtcbiAgfVxuICB0b0pzb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZlcnNpb246IHRoaXMudmVyc2lvbixcbiAgICAgIHV1aWQ6IHRoaXMudXVpZFxuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuVXVpZCA9IFV1aWQ7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9WaWV3LmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5WaWV3ID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIF9WaWV3TGlzdCA9IHJlcXVpcmUoXCIuL1ZpZXdMaXN0XCIpO1xudmFyIF9Sb3V0ZXIgPSByZXF1aXJlKFwiLi9Sb3V0ZXJcIik7XG52YXIgX1V1aWQgPSByZXF1aXJlKFwiLi9VdWlkXCIpO1xudmFyIF9Eb20gPSByZXF1aXJlKFwiLi9Eb21cIik7XG52YXIgX1RhZyA9IHJlcXVpcmUoXCIuL1RhZ1wiKTtcbnZhciBfQmFnID0gcmVxdWlyZShcIi4vQmFnXCIpO1xudmFyIF9SdWxlU2V0ID0gcmVxdWlyZShcIi4vUnVsZVNldFwiKTtcbnZhciBfTWl4aW4gPSByZXF1aXJlKFwiLi9NaXhpblwiKTtcbnZhciBfRXZlbnRUYXJnZXRNaXhpbiA9IHJlcXVpcmUoXCIuLi9taXhpbi9FdmVudFRhcmdldE1peGluXCIpO1xudmFyIGRvbnRQYXJzZSA9IFN5bWJvbCgnZG9udFBhcnNlJyk7XG52YXIgZXhwYW5kQmluZCA9IFN5bWJvbCgnZXhwYW5kQmluZCcpO1xudmFyIHV1aWQgPSBTeW1ib2woJ3V1aWQnKTtcbmNsYXNzIFZpZXcgZXh0ZW5kcyBfTWl4aW4uTWl4aW4ud2l0aChfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluKSB7XG4gIGdldCBfaWQoKSB7XG4gICAgcmV0dXJuIHRoaXNbdXVpZF07XG4gIH1cbiAgc3RhdGljIGZyb20odGVtcGxhdGUsIGFyZ3MgPSB7fSwgbWFpblZpZXcgPSBudWxsKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgdGhpcyhhcmdzLCBtYWluVmlldyk7XG4gICAgdmlldy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHJldHVybiB2aWV3O1xuICB9XG4gIGNvbnN0cnVjdG9yKGFyZ3MgPSB7fSwgbWFpblZpZXcgPSBudWxsKSB7XG4gICAgc3VwZXIoYXJncywgbWFpblZpZXcpO1xuICAgIHRoaXNbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gbWFpblZpZXc7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhcmdzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKGFyZ3MpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHV1aWQsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNvbnN0cnVjdG9yLnV1aWQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm9kZXNBdHRhY2hlZCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX0JhZy5CYWcoKGksIHMsIGEpID0+IHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm9kZXNEZXRhY2hlZCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX0JhZy5CYWcoKGksIHMsIGEpID0+IHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX29uUmVtb3ZlJywge1xuICAgICAgdmFsdWU6IG5ldyBfQmFnLkJhZygoaSwgcywgYSkgPT4ge30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjbGVhbnVwJywge1xuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwYXJlbnQnLCB7XG4gICAgICB2YWx1ZTogbWFpblZpZXcsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndmlld3MnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd2aWV3TGlzdHMnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd3aXRoVmlld3MnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd0YWdzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm9kZXMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoW10pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd0aW1lb3V0cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ludGVydmFscycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ZyYW1lcycsIHtcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncnVsZVNldCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX1J1bGVTZXQuUnVsZVNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVSdWxlU2V0Jywge1xuICAgICAgdmFsdWU6IG5ldyBfUnVsZVNldC5SdWxlU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N1YkJpbmRpbmdzJywge1xuICAgICAgdmFsdWU6IHt9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd0ZW1wbGF0ZXMnLCB7XG4gICAgICB2YWx1ZToge31cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3Bvc3RNYXBwaW5nJywge1xuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZXZlbnRDbGVhbnVwJywge1xuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd1bnBhdXNlQ2FsbGJhY2tzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaW50ZXJwb2xhdGVSZWdleCcsIHtcbiAgICAgIHZhbHVlOiAvKFxcW1xcWygoPzpcXCQrKT9bXFx3XFwuXFx8LV0rKVxcXVxcXSkvZ1xuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVuZGVyZWQnLCB7XG4gICAgICB2YWx1ZTogbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KSA9PiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbmRlckNvbXBsZXRlJywge1xuICAgICAgICB2YWx1ZTogYWNjZXB0XG4gICAgICB9KSlcbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIGlmICghdGhpc1tfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpc1tfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSBudWxsO1xuICAgIH0pO1xuICAgIHRoaXMuY29udHJvbGxlciA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IGBgO1xuICAgIHRoaXMuZmlyc3ROb2RlID0gbnVsbDtcbiAgICB0aGlzLmxhc3ROb2RlID0gbnVsbDtcbiAgICB0aGlzLnZpZXdMaXN0ID0gbnVsbDtcbiAgICB0aGlzLm1haW5WaWV3ID0gbnVsbDtcbiAgICB0aGlzLnByZXNlcnZlID0gZmFsc2U7XG4gICAgdGhpcy5yZW1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5sb2FkZWQgPSBQcm9taXNlLnJlc29sdmUodGhpcyk7XG5cbiAgICAvLyByZXR1cm4gQmluZGFibGUubWFrZSh0aGlzKTtcbiAgfVxuICBzdGF0aWMgaXNWaWV3KCkge1xuICAgIHJldHVybiBWaWV3O1xuICB9XG4gIG9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICB2YXIgc3RvcHBlZCA9IGZhbHNlO1xuICAgIHZhciBjYW5jZWwgPSAoKSA9PiB7XG4gICAgICBzdG9wcGVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIHZhciBjID0gdGltZXN0YW1wID0+IHtcbiAgICAgIGlmICh0aGlzLnJlbW92ZWQgfHwgc3RvcHBlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgICAgIGNhbGxiYWNrKERhdGUubm93KCkpO1xuICAgICAgfVxuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGMpO1xuICAgIH07XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGMoRGF0ZS5ub3coKSkpO1xuICAgIHRoaXMuZnJhbWVzLnB1c2goY2FuY2VsKTtcbiAgICByZXR1cm4gY2FuY2VsO1xuICB9XG4gIG9uTmV4dEZyYW1lKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSk7XG4gIH1cbiAgb25JZGxlKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHJlcXVlc3RJZGxlQ2FsbGJhY2soKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSkpO1xuICB9XG4gIG9uVGltZW91dCh0aW1lLCBjYWxsYmFjaykge1xuICAgIHZhciB0aW1lb3V0SW5mbyA9IHtcbiAgICAgIHRpbWVvdXQ6IG51bGwsXG4gICAgICBjYWxsYmFjazogbnVsbCxcbiAgICAgIHRpbWU6IHRpbWUsXG4gICAgICBmaXJlZDogZmFsc2UsXG4gICAgICBjcmVhdGVkOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgIHBhdXNlZDogZmFsc2VcbiAgICB9O1xuICAgIHZhciB3cmFwcGVkQ2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgICAgdGltZW91dEluZm8uZmlyZWQgPSB0cnVlO1xuICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dEluZm8udGltZW91dCk7XG4gICAgfTtcbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQod3JhcHBlZENhbGxiYWNrLCB0aW1lKTtcbiAgICB0aW1lb3V0SW5mby5jYWxsYmFjayA9IHdyYXBwZWRDYWxsYmFjaztcbiAgICB0aW1lb3V0SW5mby50aW1lb3V0ID0gdGltZW91dDtcbiAgICB0aGlzLnRpbWVvdXRzLnNldCh0aW1lb3V0SW5mby50aW1lb3V0LCB0aW1lb3V0SW5mbyk7XG4gICAgcmV0dXJuIHRpbWVvdXQ7XG4gIH1cbiAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpIHtcbiAgICBpZiAoIXRoaXMudGltZW91dHMuaGFzKHRpbWVvdXQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0SW5mbyA9IHRoaXMudGltZW91dHMuZ2V0KHRpbWVvdXQpO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgfVxuICBvbkludGVydmFsKHRpbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRJbnRlcnZhbChjYWxsYmFjaywgdGltZSk7XG4gICAgdGhpcy5pbnRlcnZhbHMuc2V0KHRpbWVvdXQsIHtcbiAgICAgIHRpbWVvdXQ6IHRpbWVvdXQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICB0aW1lOiB0aW1lLFxuICAgICAgcGF1c2VkOiBmYWxzZVxuICAgIH0pO1xuICAgIHJldHVybiB0aW1lb3V0O1xuICB9XG4gIGNsZWFySW50ZXJ2YWwodGltZW91dCkge1xuICAgIGlmICghdGhpcy5pbnRlcnZhbHMuaGFzKHRpbWVvdXQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0SW5mbyA9IHRoaXMuaW50ZXJ2YWxzLmdldCh0aW1lb3V0KTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dEluZm8udGltZW91dCk7XG4gICAgdGhpcy5pbnRlcnZhbHMuZGVsZXRlKHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICB9XG4gIHBhdXNlKHBhdXNlZCA9IHVuZGVmaW5lZCkge1xuICAgIGlmIChwYXVzZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wYXVzZWQgPSAhdGhpcy5wYXVzZWQ7XG4gICAgfVxuICAgIHRoaXMucGF1c2VkID0gcGF1c2VkO1xuICAgIGlmICh0aGlzLnBhdXNlZCkge1xuICAgICAgZm9yICh2YXIgW2NhbGxiYWNrLCB0aW1lb3V0XSBvZiB0aGlzLnRpbWVvdXRzKSB7XG4gICAgICAgIGlmICh0aW1lb3V0LmZpcmVkKSB7XG4gICAgICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dC50aW1lb3V0KTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dC50aW1lb3V0KTtcbiAgICAgICAgdGltZW91dC5wYXVzZWQgPSB0cnVlO1xuICAgICAgICB0aW1lb3V0LnRpbWUgPSBNYXRoLm1heCgwLCB0aW1lb3V0LnRpbWUgLSAoRGF0ZS5ub3coKSAtIHRpbWVvdXQuY3JlYXRlZCkpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgW19jYWxsYmFjaywgX3RpbWVvdXRdIG9mIHRoaXMuaW50ZXJ2YWxzKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoX3RpbWVvdXQudGltZW91dCk7XG4gICAgICAgIF90aW1lb3V0LnBhdXNlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIFtfY2FsbGJhY2syLCBfdGltZW91dDJdIG9mIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgaWYgKCFfdGltZW91dDIucGF1c2VkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF90aW1lb3V0Mi5maXJlZCkge1xuICAgICAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKF90aW1lb3V0Mi50aW1lb3V0KTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBfdGltZW91dDIudGltZW91dCA9IHNldFRpbWVvdXQoX3RpbWVvdXQyLmNhbGxiYWNrLCBfdGltZW91dDIudGltZSk7XG4gICAgICAgIF90aW1lb3V0Mi5wYXVzZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIFtfY2FsbGJhY2szLCBfdGltZW91dDNdIG9mIHRoaXMuaW50ZXJ2YWxzKSB7XG4gICAgICAgIGlmICghX3RpbWVvdXQzLnBhdXNlZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIF90aW1lb3V0My50aW1lb3V0ID0gc2V0SW50ZXJ2YWwoX3RpbWVvdXQzLmNhbGxiYWNrLCBfdGltZW91dDMudGltZSk7XG4gICAgICAgIF90aW1lb3V0My5wYXVzZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIFssIF9jYWxsYmFjazRdIG9mIHRoaXMudW5wYXVzZUNhbGxiYWNrcykge1xuICAgICAgICBfY2FsbGJhY2s0KCk7XG4gICAgICB9XG4gICAgICB0aGlzLnVucGF1c2VDYWxsYmFja3MuY2xlYXIoKTtcbiAgICB9XG4gICAgZm9yICh2YXIgW3RhZywgdmlld0xpc3RdIG9mIHRoaXMudmlld0xpc3RzKSB7XG4gICAgICB2aWV3TGlzdC5wYXVzZSghIXBhdXNlZCk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy50YWdzKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLnRhZ3NbaV0pKSB7XG4gICAgICAgIGZvciAodmFyIGogaW4gdGhpcy50YWdzW2ldKSB7XG4gICAgICAgICAgdGhpcy50YWdzW2ldW2pdLnBhdXNlKCEhcGF1c2VkKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMudGFnc1tpXS5wYXVzZSghIXBhdXNlZCk7XG4gICAgfVxuICB9XG4gIHJlbmRlcihwYXJlbnROb2RlID0gbnVsbCwgaW5zZXJ0UG9pbnQgPSBudWxsLCBvdXRlclZpZXcgPSBudWxsKSB7XG4gICAgdmFyIHtcbiAgICAgIGRvY3VtZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIGlmIChwYXJlbnROb2RlIGluc3RhbmNlb2YgVmlldykge1xuICAgICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUuZmlyc3ROb2RlLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIGlmIChpbnNlcnRQb2ludCBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgIGluc2VydFBvaW50ID0gaW5zZXJ0UG9pbnQuZmlyc3ROb2RlO1xuICAgIH1cbiAgICBpZiAodGhpcy5maXJzdE5vZGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlUmVuZGVyKHBhcmVudE5vZGUsIGluc2VydFBvaW50LCBvdXRlclZpZXcpO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW5kZXInKSk7XG4gICAgdmFyIHRlbXBsYXRlSXNGcmFnbWVudCA9IHR5cGVvZiB0aGlzLnRlbXBsYXRlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGhpcy50ZW1wbGF0ZS5jbG9uZU5vZGUgPT09ICdmdW5jdGlvbic7XG4gICAgdmFyIHRlbXBsYXRlUGFyc2VkID0gdGVtcGxhdGVJc0ZyYWdtZW50IHx8IFZpZXcudGVtcGxhdGVzLmhhcyh0aGlzLnRlbXBsYXRlKTtcbiAgICB2YXIgc3ViRG9jO1xuICAgIGlmICh0ZW1wbGF0ZVBhcnNlZCkge1xuICAgICAgaWYgKHRlbXBsYXRlSXNGcmFnbWVudCkge1xuICAgICAgICBzdWJEb2MgPSB0aGlzLnRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN1YkRvYyA9IFZpZXcudGVtcGxhdGVzLmdldCh0aGlzLnRlbXBsYXRlKS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1YkRvYyA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHRoaXMudGVtcGxhdGUpO1xuICAgIH1cbiAgICBpZiAoIXRlbXBsYXRlUGFyc2VkICYmICF0ZW1wbGF0ZUlzRnJhZ21lbnQpIHtcbiAgICAgIFZpZXcudGVtcGxhdGVzLnNldCh0aGlzLnRlbXBsYXRlLCBzdWJEb2MuY2xvbmVOb2RlKHRydWUpKTtcbiAgICB9XG4gICAgdGhpcy5tYWluVmlldyB8fCB0aGlzLnByZVJ1bGVTZXQuYXBwbHkoc3ViRG9jLCB0aGlzKTtcbiAgICB0aGlzLm1hcFRhZ3Moc3ViRG9jKTtcbiAgICB0aGlzLm1haW5WaWV3IHx8IHRoaXMucnVsZVNldC5hcHBseShzdWJEb2MsIHRoaXMpO1xuICAgIGlmIChnbG9iYWxUaGlzLmRldk1vZGUgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuZmlyc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChgVGVtcGxhdGUgJHt0aGlzLl9pZH0gU3RhcnRgKTtcbiAgICAgIHRoaXMubGFzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVDb21tZW50KGBUZW1wbGF0ZSAke3RoaXMuX2lkfSBFbmRgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5maXJzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICB0aGlzLmxhc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIH1cbiAgICB0aGlzLm5vZGVzLnB1c2godGhpcy5maXJzdE5vZGUsIC4uLkFycmF5LmZyb20oc3ViRG9jLmNoaWxkTm9kZXMpLCB0aGlzLmxhc3ROb2RlKTtcbiAgICB0aGlzLnBvc3RSZW5kZXIocGFyZW50Tm9kZSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVuZGVyZWQnKSk7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoQXR0YWNoKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgIGlmIChpbnNlcnRQb2ludCkge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgbnVsbCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIG51bGwpO1xuICAgICAgfVxuICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3ViRG9jLCB0aGlzLmxhc3ROb2RlKTtcbiAgICAgIHZhciByb290Tm9kZSA9IHBhcmVudE5vZGUuZ2V0Um9vdE5vZGUoKTtcbiAgICAgIGlmIChyb290Tm9kZS5pc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLmF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlLCBvdXRlclZpZXcpO1xuICAgICAgfSBlbHNlIGlmIChvdXRlclZpZXcpIHtcbiAgICAgICAgdmFyIGZpcnN0RG9tQXR0YWNoID0gZXZlbnQgPT4ge1xuICAgICAgICAgIHZhciByb290Tm9kZSA9IHBhcmVudE5vZGUuZ2V0Um9vdE5vZGUoKTtcbiAgICAgICAgICB0aGlzLmF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgICAgICB0aGlzLmRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUsIG91dGVyVmlldyk7XG4gICAgICAgICAgb3V0ZXJWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2F0dGFjaGVkJywgZmlyc3REb21BdHRhY2gpO1xuICAgICAgICB9O1xuICAgICAgICBvdXRlclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignYXR0YWNoZWQnLCBmaXJzdERvbUF0dGFjaCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucmVuZGVyQ29tcGxldGUodGhpcy5ub2Rlcyk7XG4gICAgcmV0dXJuIHRoaXMubm9kZXM7XG4gIH1cbiAgZGlzcGF0Y2hBdHRhY2goKSB7XG4gICAgdmFyIHtcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhdHRhY2gnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgdGFyZ2V0OiB0aGlzXG4gICAgfSkpO1xuICB9XG4gIGRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUsIHZpZXcgPSB1bmRlZmluZWQpIHtcbiAgICB2YXIge1xuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYXR0YWNoZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICBub2RlOiBwYXJlbnROb2RlLFxuICAgICAgICByb290OiByb290Tm9kZSxcbiAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgdGhpcy5kaXNwYXRjaERvbUF0dGFjaGVkKHZpZXcpO1xuICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIHRoaXMubm9kZXNBdHRhY2hlZC5pdGVtcygpKSB7XG4gICAgICBjYWxsYmFjayhyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgfVxuICB9XG4gIGRpc3BhdGNoRG9tQXR0YWNoZWQodmlldykge1xuICAgIHZhciB7XG4gICAgICBOb2RlLFxuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdGhpcy5ub2Rlcy5maWx0ZXIobiA9PiBuLm5vZGVUeXBlICE9PSBOb2RlLkNPTU1FTlRfTk9ERSkuZm9yRWFjaChjaGlsZCA9PiB7XG4gICAgICBpZiAoIWNoaWxkLm1hdGNoZXMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2hpbGQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tQXR0YWNoZWQnLCB7XG4gICAgICAgIHRhcmdldDogY2hpbGQsXG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgICBfRG9tLkRvbS5tYXBUYWdzKGNoaWxkLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICAgIGlmICghdGFnLm1hdGNoZXMpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkRvbUF0dGFjaGVkJywge1xuICAgICAgICAgIHRhcmdldDogdGFnLFxuICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJlUmVuZGVyKHBhcmVudE5vZGUsIGluc2VydFBvaW50LCBvdXRlclZpZXcpIHtcbiAgICB2YXIge1xuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdmFyIHdpbGxSZVJlbmRlciA9IHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlUmVuZGVyJyksIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICB0YXJnZXQ6IHRoaXMsXG4gICAgICB2aWV3OiBvdXRlclZpZXdcbiAgICB9KTtcbiAgICBpZiAoIXdpbGxSZVJlbmRlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgc3ViRG9jID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBpZiAodGhpcy5maXJzdE5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHZhciBkZXRhY2ggPSB0aGlzLm5vZGVzRGV0YWNoZWQuaXRlbXMoKTtcbiAgICAgIGZvciAodmFyIGkgaW4gZGV0YWNoKSB7XG4gICAgICAgIGRldGFjaFtpXSgpO1xuICAgICAgfVxuICAgIH1cbiAgICBzdWJEb2MuYXBwZW5kKC4uLnRoaXMubm9kZXMpO1xuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICBpZiAoaW5zZXJ0UG9pbnQpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIG51bGwpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN1YkRvYywgdGhpcy5sYXN0Tm9kZSk7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZVJlbmRlcmVkJyksIHtcbiAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgICAgdGFyZ2V0OiB0aGlzLFxuICAgICAgICB2aWV3OiBvdXRlclZpZXdcbiAgICAgIH0pO1xuICAgICAgdmFyIHJvb3ROb2RlID0gcGFyZW50Tm9kZS5nZXRSb290Tm9kZSgpO1xuICAgICAgaWYgKHJvb3ROb2RlLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgfVxuICBtYXBUYWdzKHN1YkRvYykge1xuICAgIF9Eb20uRG9tLm1hcFRhZ3Moc3ViRG9jLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICBpZiAodGFnW2RvbnRQYXJzZV0pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRhZy5tYXRjaGVzKSB7XG4gICAgICAgIHRhZyA9IHRoaXMubWFwSW50ZXJwb2xhdGFibGVUYWcodGFnKTtcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi10ZW1wbGF0ZV0nKSAmJiB0aGlzLm1hcFRlbXBsYXRlVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXNsb3RdJykgJiYgdGhpcy5tYXBTbG90VGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXByZXJlbmRlcl0nKSAmJiB0aGlzLm1hcFByZW5kZXJlclRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1saW5rXScpICYmIHRoaXMubWFwTGlua1RhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1hdHRyXScpICYmIHRoaXMubWFwQXR0clRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1leHBhbmRdJykgJiYgdGhpcy5tYXBFeHBhbmRhYmxlVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXJlZl0nKSAmJiB0aGlzLm1hcFJlZlRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1vbl0nKSAmJiB0aGlzLm1hcE9uVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWVhY2hdJykgJiYgdGhpcy5tYXBFYWNoVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWJpbmRdJykgJiYgdGhpcy5tYXBCaW5kVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXdpdGhdJykgJiYgdGhpcy5tYXBXaXRoVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWlmXScpICYmIHRoaXMubWFwSWZUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytdmlld10nKSAmJiB0aGlzLm1hcFZpZXdUYWcodGFnKSB8fCB0YWc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YWcgPSB0aGlzLm1hcEludGVycG9sYXRhYmxlVGFnKHRhZyk7XG4gICAgICB9XG4gICAgICBpZiAodGFnICE9PSB3YWxrZXIuY3VycmVudE5vZGUpIHtcbiAgICAgICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gdGFnO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucG9zdE1hcHBpbmcuZm9yRWFjaChjID0+IGMoKSk7XG4gIH1cbiAgbWFwRXhwYW5kYWJsZVRhZyh0YWcpIHtcbiAgICAvLyBjb25zdCB0YWdDb21waWxlciA9IHRoaXMuY29tcGlsZUV4cGFuZGFibGVUYWcodGFnKTtcbiAgICAvLyBjb25zdCBuZXdUYWcgPSB0YWdDb21waWxlcih0aGlzKTtcbiAgICAvLyB0YWcucmVwbGFjZVdpdGgobmV3VGFnKTtcbiAgICAvLyByZXR1cm4gbmV3VGFnO1xuXG4gICAgdmFyIGV4aXN0aW5nID0gdGFnW2V4cGFuZEJpbmRdO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgZXhpc3RpbmcoKTtcbiAgICAgIHRhZ1tleHBhbmRCaW5kXSA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgW3Byb3h5LCBleHBhbmRQcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZSh0aGlzLmFyZ3MsIHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpLCB0cnVlKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1leHBhbmQnKTtcbiAgICBpZiAoIXByb3h5W2V4cGFuZFByb3BlcnR5XSkge1xuICAgICAgcHJveHlbZXhwYW5kUHJvcGVydHldID0ge307XG4gICAgfVxuICAgIHByb3h5W2V4cGFuZFByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHByb3h5W2V4cGFuZFByb3BlcnR5XSk7XG4gICAgdGhpcy5vblJlbW92ZSh0YWdbZXhwYW5kQmluZF0gPSBwcm94eVtleHBhbmRQcm9wZXJ0eV0uYmluZFRvKCh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICBpZiAoZCB8fCB2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGFnLnJlbW92ZUF0dHJpYnV0ZShrLCB2KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHYgPT09IG51bGwpIHtcbiAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShrLCAnJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoaywgdik7XG4gICAgfSkpO1xuXG4gICAgLy8gbGV0IGV4cGFuZFByb3BlcnR5ID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG4gICAgLy8gbGV0IGV4cGFuZEFyZyA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZShcbiAgICAvLyBcdHRoaXMuYXJnc1tleHBhbmRQcm9wZXJ0eV0gfHwge31cbiAgICAvLyApO1xuXG4gICAgLy8gdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG5cbiAgICAvLyBmb3IobGV0IGkgaW4gZXhwYW5kQXJnKVxuICAgIC8vIHtcbiAgICAvLyBcdGlmKGkgPT09ICduYW1lJyB8fCBpID09PSAndHlwZScpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdGNvbnRpbnVlO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRsZXQgZGViaW5kID0gZXhwYW5kQXJnLmJpbmRUbyhpLCAoKHRhZyxpKT0+KHYpPT57XG4gICAgLy8gXHRcdHRhZy5zZXRBdHRyaWJ1dGUoaSwgdik7XG4gICAgLy8gXHR9KSh0YWcsaSkpO1xuXG4gICAgLy8gXHR0aGlzLm9uUmVtb3ZlKCgpPT57XG4gICAgLy8gXHRcdGRlYmluZCgpO1xuICAgIC8vIFx0XHRpZihleHBhbmRBcmcuaXNCb3VuZCgpKVxuICAgIC8vIFx0XHR7XG4gICAgLy8gXHRcdFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyhleHBhbmRBcmcpO1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHR9KTtcbiAgICAvLyB9XG5cbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gY29tcGlsZUV4cGFuZGFibGVUYWcoc291cmNlVGFnKVxuICAvLyB7XG4gIC8vIFx0cmV0dXJuIChiaW5kaW5nVmlldykgPT4ge1xuXG4gIC8vIFx0XHRjb25zdCB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKHRydWUpO1xuXG4gIC8vIFx0XHRsZXQgZXhwYW5kUHJvcGVydHkgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1leHBhbmQnKTtcbiAgLy8gXHRcdGxldCBleHBhbmRBcmcgPSBCaW5kYWJsZS5tYWtlKFxuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5hcmdzW2V4cGFuZFByb3BlcnR5XSB8fCB7fVxuICAvLyBcdFx0KTtcblxuICAvLyBcdFx0dGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG5cbiAgLy8gXHRcdGZvcihsZXQgaSBpbiBleHBhbmRBcmcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdGlmKGkgPT09ICduYW1lJyB8fCBpID09PSAndHlwZScpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRjb250aW51ZTtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGxldCBkZWJpbmQgPSBleHBhbmRBcmcuYmluZFRvKGksICgodGFnLGkpPT4odik9PntcbiAgLy8gXHRcdFx0XHR0YWcuc2V0QXR0cmlidXRlKGksIHYpO1xuICAvLyBcdFx0XHR9KSh0YWcsaSkpO1xuXG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKCgpPT57XG4gIC8vIFx0XHRcdFx0ZGViaW5kKCk7XG4gIC8vIFx0XHRcdFx0aWYoZXhwYW5kQXJnLmlzQm91bmQoKSlcbiAgLy8gXHRcdFx0XHR7XG4gIC8vIFx0XHRcdFx0XHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKGV4cGFuZEFyZyk7XG4gIC8vIFx0XHRcdFx0fVxuICAvLyBcdFx0XHR9KTtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0cmV0dXJuIHRhZztcbiAgLy8gXHR9O1xuICAvLyB9XG5cbiAgbWFwQXR0clRhZyh0YWcpIHtcbiAgICB2YXIgdGFnQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVBdHRyVGFnKHRhZyk7XG4gICAgdmFyIG5ld1RhZyA9IHRhZ0NvbXBpbGVyKHRoaXMpO1xuICAgIHRhZy5yZXBsYWNlV2l0aChuZXdUYWcpO1xuICAgIHJldHVybiBuZXdUYWc7XG5cbiAgICAvLyBsZXQgYXR0clByb3BlcnR5ID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuXG4gICAgLy8gdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuXG4gICAgLy8gbGV0IHBhaXJzID0gYXR0clByb3BlcnR5LnNwbGl0KCcsJyk7XG4gICAgLy8gbGV0IGF0dHJzID0gcGFpcnMubWFwKChwKSA9PiBwLnNwbGl0KCc6JykpO1xuXG4gICAgLy8gZm9yIChsZXQgaSBpbiBhdHRycylcbiAgICAvLyB7XG4gICAgLy8gXHRsZXQgcHJveHkgICAgICAgID0gdGhpcy5hcmdzO1xuICAgIC8vIFx0bGV0IGJpbmRQcm9wZXJ0eSA9IGF0dHJzW2ldWzFdO1xuICAgIC8vIFx0bGV0IHByb3BlcnR5ICAgICA9IGJpbmRQcm9wZXJ0eTtcblxuICAgIC8vIFx0aWYoYmluZFByb3BlcnR5Lm1hdGNoKC9cXC4vKSlcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0W3Byb3h5LCBwcm9wZXJ0eV0gPSBCaW5kYWJsZS5yZXNvbHZlKFxuICAgIC8vIFx0XHRcdHRoaXMuYXJnc1xuICAgIC8vIFx0XHRcdCwgYmluZFByb3BlcnR5XG4gICAgLy8gXHRcdFx0LCB0cnVlXG4gICAgLy8gXHRcdCk7XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGxldCBhdHRyaWIgPSBhdHRyc1tpXVswXTtcblxuICAgIC8vIFx0dGhpcy5vblJlbW92ZShwcm94eS5iaW5kVG8oXG4gICAgLy8gXHRcdHByb3BlcnR5XG4gICAgLy8gXHRcdCwgKHYpPT57XG4gICAgLy8gXHRcdFx0aWYodiA9PSBudWxsKVxuICAgIC8vIFx0XHRcdHtcbiAgICAvLyBcdFx0XHRcdHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCAnJyk7XG4gICAgLy8gXHRcdFx0XHRyZXR1cm47XG4gICAgLy8gXHRcdFx0fVxuICAgIC8vIFx0XHRcdHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCB2KTtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0KSk7XG4gICAgLy8gfVxuXG4gICAgLy8gcmV0dXJuIHRhZztcbiAgfVxuICBjb21waWxlQXR0clRhZyhzb3VyY2VUYWcpIHtcbiAgICB2YXIgYXR0clByb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuICAgIHZhciBwYWlycyA9IGF0dHJQcm9wZXJ0eS5zcGxpdCgvWyw7XS8pO1xuICAgIHZhciBhdHRycyA9IHBhaXJzLm1hcChwID0+IHAuc3BsaXQoJzonKSk7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuICAgIHJldHVybiBiaW5kaW5nVmlldyA9PiB7XG4gICAgICB2YXIgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGJpbmRQcm9wZXJ0eSA9IGF0dHJzW2ldWzFdIHx8IGF0dHJzW2ldWzBdO1xuICAgICAgICB2YXIgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShiaW5kaW5nVmlldy5hcmdzLCBiaW5kUHJvcGVydHksIHRydWUpO1xuICAgICAgICB2YXIgYXR0cmliID0gYXR0cnNbaV1bMF07XG4gICAgICAgIGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICBpZiAoZCB8fCB2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoYXR0cmliLCB2KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHYgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCAnJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCB2KTtcbiAgICAgICAgfSkpO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIGkgaW4gYXR0cnMpIHtcbiAgICAgICAgX2xvb3AoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0YWc7XG4gICAgfTtcbiAgfVxuICBtYXBJbnRlcnBvbGF0YWJsZVRhZyh0YWcpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciByZWdleCA9IHRoaXMuaW50ZXJwb2xhdGVSZWdleDtcbiAgICB2YXIge1xuICAgICAgTm9kZSxcbiAgICAgIGRvY3VtZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIGlmICh0YWcubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICB2YXIgb3JpZ2luYWwgPSB0YWcubm9kZVZhbHVlO1xuICAgICAgaWYgKCF0aGlzLmludGVycG9sYXRhYmxlKG9yaWdpbmFsKSkge1xuICAgICAgICByZXR1cm4gdGFnO1xuICAgICAgfVxuICAgICAgdmFyIGhlYWRlciA9IDA7XG4gICAgICB2YXIgbWF0Y2g7XG4gICAgICB2YXIgX2xvb3AyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBiaW5kUHJvcGVydHkgPSBtYXRjaFsyXTtcbiAgICAgICAgICB2YXIgdW5zYWZlSHRtbCA9IGZhbHNlO1xuICAgICAgICAgIHZhciB1bnNhZmVWaWV3ID0gZmFsc2U7XG4gICAgICAgICAgdmFyIHByb3BlcnR5U3BsaXQgPSBiaW5kUHJvcGVydHkuc3BsaXQoJ3wnKTtcbiAgICAgICAgICB2YXIgdHJhbnNmb3JtZXIgPSBmYWxzZTtcbiAgICAgICAgICBpZiAocHJvcGVydHlTcGxpdC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IF90aGlzLnN0cmluZ1RyYW5zZm9ybWVyKHByb3BlcnR5U3BsaXQuc2xpY2UoMSkpO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gcHJvcGVydHlTcGxpdFswXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5zdWJzdHIoMCwgMikgPT09ICckJCcpIHtcbiAgICAgICAgICAgIHVuc2FmZUh0bWwgPSB0cnVlO1xuICAgICAgICAgICAgdW5zYWZlVmlldyA9IHRydWU7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBiaW5kUHJvcGVydHkuc3Vic3RyKDIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICB1bnNhZmVIdG1sID0gdHJ1ZTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkuc3Vic3RyKDAsIDMpID09PSAnMDAwJykge1xuICAgICAgICAgICAgZXhwYW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eS5zdWJzdHIoMyk7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHN0YXRpY1ByZWZpeCA9IG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIsIG1hdGNoLmluZGV4KTtcbiAgICAgICAgICBoZWFkZXIgPSBtYXRjaC5pbmRleCArIG1hdGNoWzFdLmxlbmd0aDtcbiAgICAgICAgICB2YXIgc3RhdGljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0YXRpY1ByZWZpeCk7XG4gICAgICAgICAgc3RhdGljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3RhdGljTm9kZSwgdGFnKTtcbiAgICAgICAgICB2YXIgZHluYW1pY05vZGU7XG4gICAgICAgICAgaWYgKHVuc2FmZUh0bWwpIHtcbiAgICAgICAgICAgIGR5bmFtaWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGR5bmFtaWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkeW5hbWljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgICAgICB2YXIgcHJveHkgPSBfdGhpcy5hcmdzO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eTtcbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5Lm1hdGNoKC9cXC4vKSkge1xuICAgICAgICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShfdGhpcy5hcmdzLCBiaW5kUHJvcGVydHksIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZHluYW1pY05vZGUsIHRhZyk7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwcm94eSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybiAxOyAvLyBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBwcm94eSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHByb3h5KTtcbiAgICAgICAgICB2YXIgZGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRba10gIT09IHYgJiYgKHRba10gaW5zdGFuY2VvZiBWaWV3IHx8IHRba10gaW5zdGFuY2VvZiBOb2RlIHx8IHRba10gaW5zdGFuY2VvZiBfVGFnLlRhZykpIHtcbiAgICAgICAgICAgICAgaWYgKCF0W2tdLnByZXNlcnZlKSB7XG4gICAgICAgICAgICAgICAgdFtrXS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHVuc2FmZVZpZXcgJiYgISh2IGluc3RhbmNlb2YgVmlldykpIHtcbiAgICAgICAgICAgICAgdmFyIHVuc2FmZVRlbXBsYXRlID0gdiAhPT0gbnVsbCAmJiB2ICE9PSB2b2lkIDAgPyB2IDogJyc7XG4gICAgICAgICAgICAgIHYgPSBuZXcgVmlldyhfdGhpcy5hcmdzLCBfdGhpcyk7XG4gICAgICAgICAgICAgIHYudGVtcGxhdGUgPSB1bnNhZmVUZW1wbGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lcikge1xuICAgICAgICAgICAgICB2ID0gdHJhbnNmb3JtZXIodik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodiBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgICAgICAgICAgIHZbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gX3RoaXM7XG4gICAgICAgICAgICAgIHYucmVuZGVyKHRhZy5wYXJlbnROb2RlLCBkeW5hbWljTm9kZSwgX3RoaXMpO1xuICAgICAgICAgICAgICB2YXIgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXYucHJlc2VydmUpIHtcbiAgICAgICAgICAgICAgICAgIHYucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBfdGhpcy5vblJlbW92ZShjbGVhbnVwKTtcbiAgICAgICAgICAgICAgdi5vblJlbW92ZSgoKSA9PiBfdGhpcy5fb25SZW1vdmUucmVtb3ZlKGNsZWFudXApKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh2LCBkeW5hbWljTm9kZSk7XG4gICAgICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKCgpID0+IHYucmVtb3ZlKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgICAgICAgICAgIGlmICh2Lm5vZGUpIHtcbiAgICAgICAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodi5ub2RlLCBkeW5hbWljTm9kZSk7XG4gICAgICAgICAgICAgICAgX3RoaXMub25SZW1vdmUoKCkgPT4gdi5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBPYmplY3QgJiYgdi5fX3RvU3RyaW5nIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICB2ID0gdi5fX3RvU3RyaW5nKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHVuc2FmZUh0bWwpIHtcbiAgICAgICAgICAgICAgICBkeW5hbWljTm9kZS5pbm5lckhUTUwgPSB2O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9IHY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGR5bmFtaWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgICAgIH0sXG4gICAgICAgIF9yZXQ7XG4gICAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKG9yaWdpbmFsKSkge1xuICAgICAgICBfcmV0ID0gX2xvb3AyKCk7XG4gICAgICAgIGlmIChfcmV0ID09PSAwKSBjb250aW51ZTtcbiAgICAgICAgaWYgKF9yZXQgPT09IDEpIGJyZWFrO1xuICAgICAgfVxuICAgICAgdmFyIHN0YXRpY1N1ZmZpeCA9IG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIpO1xuICAgICAgdmFyIHN0YXRpY05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdGF0aWNTdWZmaXgpO1xuICAgICAgc3RhdGljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdGF0aWNOb2RlLCB0YWcpO1xuICAgICAgdGFnLm5vZGVWYWx1ZSA9ICcnO1xuICAgIH0gZWxzZSBpZiAodGFnLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgdmFyIF9sb29wMyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFfdGhpcy5pbnRlcnBvbGF0YWJsZSh0YWcuYXR0cmlidXRlc1tpXS52YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgaGVhZGVyID0gMDtcbiAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICB2YXIgb3JpZ2luYWwgPSB0YWcuYXR0cmlidXRlc1tpXS52YWx1ZTtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZSA9IHRhZy5hdHRyaWJ1dGVzW2ldO1xuICAgICAgICB2YXIgYmluZFByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgdmFyIHNlZ21lbnRzID0gW107XG4gICAgICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMob3JpZ2luYWwpKSB7XG4gICAgICAgICAgc2VnbWVudHMucHVzaChvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyLCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAgIGlmICghYmluZFByb3BlcnRpZXNbbWF0Y2hbMl1dKSB7XG4gICAgICAgICAgICBiaW5kUHJvcGVydGllc1ttYXRjaFsyXV0gPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYmluZFByb3BlcnRpZXNbbWF0Y2hbMl1dLnB1c2goc2VnbWVudHMubGVuZ3RoKTtcbiAgICAgICAgICBzZWdtZW50cy5wdXNoKG1hdGNoWzFdKTtcbiAgICAgICAgICBoZWFkZXIgPSBtYXRjaC5pbmRleCArIG1hdGNoWzFdLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBzZWdtZW50cy5wdXNoKG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIpKTtcbiAgICAgICAgdmFyIF9sb29wNCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgcHJveHkgPSBfdGhpcy5hcmdzO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IGo7XG4gICAgICAgICAgdmFyIHByb3BlcnR5U3BsaXQgPSBqLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgdmFyIHRyYW5zZm9ybWVyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGxvbmdQcm9wZXJ0eSA9IGo7XG4gICAgICAgICAgaWYgKHByb3BlcnR5U3BsaXQubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdHJhbnNmb3JtZXIgPSBfdGhpcy5zdHJpbmdUcmFuc2Zvcm1lcihwcm9wZXJ0eVNwbGl0LnNsaWNlKDEpKTtcbiAgICAgICAgICAgIHByb3BlcnR5ID0gcHJvcGVydHlTcGxpdFswXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHByb3BlcnR5Lm1hdGNoKC9cXC4vKSkge1xuICAgICAgICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShfdGhpcy5hcmdzLCBwcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBtYXRjaGluZyA9IFtdO1xuICAgICAgICAgIHZhciBiaW5kUHJvcGVydHkgPSBqO1xuICAgICAgICAgIHZhciBtYXRjaGluZ1NlZ21lbnRzID0gYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XTtcbiAgICAgICAgICBfdGhpcy5vblJlbW92ZShwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIpIHtcbiAgICAgICAgICAgICAgdiA9IHRyYW5zZm9ybWVyKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgX2kgaW4gYmluZFByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgX2ogaW4gYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgIHNlZ21lbnRzW2JpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV1bX2pdXSA9IHRbX2ldO1xuICAgICAgICAgICAgICAgIGlmIChrID09PSBwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgICAgc2VnbWVudHNbYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XVtfal1dID0gdjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghX3RoaXMucGF1c2VkKSB7XG4gICAgICAgICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLm5hbWUsIHNlZ21lbnRzLmpvaW4oJycpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF90aGlzLnVucGF1c2VDYWxsYmFja3Muc2V0KGF0dHJpYnV0ZSwgKCkgPT4gdGFnLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUubmFtZSwgc2VnbWVudHMuam9pbignJykpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH07XG4gICAgICAgIGZvciAodmFyIGogaW4gYmluZFByb3BlcnRpZXMpIHtcbiAgICAgICAgICBfbG9vcDQoKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKF9sb29wMygpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBSZWZUYWcodGFnKSB7XG4gICAgdmFyIHJlZkF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1yZWYnKTtcbiAgICB2YXIgW3JlZlByb3AsIHJlZkNsYXNzbmFtZSA9IG51bGwsIHJlZktleSA9IG51bGxdID0gcmVmQXR0ci5zcGxpdCgnOicpO1xuICAgIHZhciByZWZDbGFzcyA9IF9UYWcuVGFnO1xuICAgIGlmIChyZWZDbGFzc25hbWUpIHtcbiAgICAgIHJlZkNsYXNzID0gdGhpcy5zdHJpbmdUb0NsYXNzKHJlZkNsYXNzbmFtZSk7XG4gICAgfVxuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXJlZicpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YWcsICdfX190YWdfX18nLCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICB0YWcuX19fdGFnX19fID0gbnVsbDtcbiAgICAgIHRhZy5yZW1vdmUoKTtcbiAgICB9KTtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgZGlyZWN0ID0gdGhpcztcbiAgICBpZiAodGhpcy52aWV3TGlzdCkge1xuICAgICAgcGFyZW50ID0gdGhpcy52aWV3TGlzdC5wYXJlbnQ7XG4gICAgICAvLyBpZighdGhpcy52aWV3TGlzdC5wYXJlbnQudGFnc1tyZWZQcm9wXSlcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0dGhpcy52aWV3TGlzdC5wYXJlbnQudGFnc1tyZWZQcm9wXSA9IFtdO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBsZXQgcmVmS2V5VmFsID0gdGhpcy5hcmdzW3JlZktleV07XG5cbiAgICAgIC8vIHRoaXMudmlld0xpc3QucGFyZW50LnRhZ3NbcmVmUHJvcF1bcmVmS2V5VmFsXSA9IG5ldyByZWZDbGFzcyhcbiAgICAgIC8vIFx0dGFnLCB0aGlzLCByZWZQcm9wLCByZWZLZXlWYWxcbiAgICAgIC8vICk7XG4gICAgfVxuICAgIC8vIGVsc2VcbiAgICAvLyB7XG4gICAgLy8gXHR0aGlzLnRhZ3NbcmVmUHJvcF0gPSBuZXcgcmVmQ2xhc3MoXG4gICAgLy8gXHRcdHRhZywgdGhpcywgcmVmUHJvcFxuICAgIC8vIFx0KTtcbiAgICAvLyB9XG5cbiAgICB2YXIgdGFnT2JqZWN0ID0gbmV3IHJlZkNsYXNzKHRhZywgdGhpcywgcmVmUHJvcCwgdW5kZWZpbmVkLCBkaXJlY3QpO1xuICAgIHRhZy5fX190YWdfX18gPSB0YWdPYmplY3Q7XG4gICAgdGhpcy50YWdzW3JlZlByb3BdID0gdGFnT2JqZWN0O1xuICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgIHZhciByZWZLZXlWYWwgPSB0aGlzLmFyZ3NbcmVmS2V5XTtcbiAgICAgIGlmIChyZWZLZXlWYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoIXBhcmVudC50YWdzW3JlZlByb3BdKSB7XG4gICAgICAgICAgcGFyZW50LnRhZ3NbcmVmUHJvcF0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQudGFnc1tyZWZQcm9wXVtyZWZLZXlWYWxdID0gdGFnT2JqZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyZW50LnRhZ3NbcmVmUHJvcF0gPSB0YWdPYmplY3Q7XG4gICAgICB9XG4gICAgICBpZiAoIXBhcmVudC5wYXJlbnQpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcEJpbmRUYWcodGFnKSB7XG4gICAgdmFyIGJpbmRBcmcgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1iaW5kJyk7XG4gICAgdmFyIHByb3h5ID0gdGhpcy5hcmdzO1xuICAgIHZhciBwcm9wZXJ0eSA9IGJpbmRBcmc7XG4gICAgdmFyIHRvcCA9IG51bGw7XG4gICAgaWYgKGJpbmRBcmcubWF0Y2goL1xcLi8pKSB7XG4gICAgICBbcHJveHksIHByb3BlcnR5LCB0b3BdID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUodGhpcy5hcmdzLCBiaW5kQXJnLCB0cnVlKTtcbiAgICB9XG4gICAgaWYgKHByb3h5ICE9PSB0aGlzLmFyZ3MpIHtcbiAgICAgIHRoaXMuc3ViQmluZGluZ3NbYmluZEFyZ10gPSB0aGlzLnN1YkJpbmRpbmdzW2JpbmRBcmddIHx8IFtdO1xuICAgICAgdGhpcy5vblJlbW92ZSh0aGlzLmFyZ3MuYmluZFRvKHRvcCwgKCkgPT4ge1xuICAgICAgICB3aGlsZSAodGhpcy5zdWJCaW5kaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgICB0aGlzLnN1YkJpbmRpbmdzLnNoaWZ0KCkoKTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH1cbiAgICB2YXIgdW5zYWZlSHRtbCA9IGZhbHNlO1xuICAgIGlmIChwcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgcHJvcGVydHkgPSBwcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICB1bnNhZmVIdG1sID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGF1dG9FdmVudFN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB2YXIgZGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgaWYgKChwIGluc3RhbmNlb2YgVmlldyB8fCBwIGluc3RhbmNlb2YgTm9kZSB8fCBwIGluc3RhbmNlb2YgX1RhZy5UYWcpICYmIHAgIT09IHYpIHtcbiAgICAgICAgcC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGlmIChbJ0lOUFVUJywgJ1NFTEVDVCcsICdURVhUQVJFQSddLmluY2x1ZGVzKHRhZy50YWdOYW1lKSkge1xuICAgICAgICB2YXIgX3R5cGUgPSB0YWcuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgICAgIGlmIChfdHlwZSAmJiBfdHlwZS50b0xvd2VyQ2FzZSgpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgdGFnLmNoZWNrZWQgPSAhIXY7XG4gICAgICAgIH0gZWxzZSBpZiAoX3R5cGUgJiYgX3R5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgIHRhZy5jaGVja2VkID0gdiA9PSB0YWcudmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAoX3R5cGUgIT09ICdmaWxlJykge1xuICAgICAgICAgIGlmICh0YWcudGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RPcHRpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnLm9wdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0aW9uID0gdGFnLm9wdGlvbnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbi52YWx1ZSA9PSB2KSB7XG4gICAgICAgICAgICAgICAgICB0YWcuc2VsZWN0ZWRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2VsZWN0T3B0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLm5vZGVzQXR0YWNoZWQuYWRkKHNlbGVjdE9wdGlvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRhZy52YWx1ZSA9IHYgPT0gbnVsbCA/ICcnIDogdjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF1dG9FdmVudFN0YXJ0ZWQpIHtcbiAgICAgICAgICB0YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2QXV0b0NoYW5nZWQnLCB7XG4gICAgICAgICAgICBidWJibGVzOiB0cnVlXG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIGF1dG9FdmVudFN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICAgICAgZm9yICh2YXIgbm9kZSBvZiB0YWcuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdltfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSB0aGlzO1xuICAgICAgICAgIHYucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICB0YWcuaW5zZXJ0KHYpO1xuICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgICAgIHRhZy5hcHBlbmQodi5ub2RlKTtcbiAgICAgICAgfSBlbHNlIGlmICh1bnNhZmVIdG1sKSB7XG4gICAgICAgICAgaWYgKHRhZy5pbm5lckhUTUwgIT09IHYpIHtcbiAgICAgICAgICAgIHYgPSBTdHJpbmcodik7XG4gICAgICAgICAgICBpZiAodGFnLmlubmVySFRNTCA9PT0gdi5zdWJzdHJpbmcoMCwgdGFnLmlubmVySFRNTC5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgIHRhZy5pbm5lckhUTUwgKz0gdi5zdWJzdHJpbmcodGFnLmlubmVySFRNTC5sZW5ndGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgX25vZGUgb2YgdGFnLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICBfbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0YWcuaW5uZXJIVE1MID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9Eb20uRG9tLm1hcFRhZ3ModGFnLCBmYWxzZSwgdCA9PiB0W2RvbnRQYXJzZV0gPSB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRhZy50ZXh0Q29udGVudCAhPT0gdikge1xuICAgICAgICAgICAgZm9yICh2YXIgX25vZGUyIG9mIHRhZy5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgIF9ub2RlMi5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhZy50ZXh0Q29udGVudCA9IHY7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHByb3h5ICE9PSB0aGlzLmFyZ3MpIHtcbiAgICAgIHRoaXMuc3ViQmluZGluZ3NbYmluZEFyZ10ucHVzaChkZWJpbmQpO1xuICAgIH1cbiAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgdmFyIHR5cGUgPSB0YWcuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgdmFyIG11bHRpID0gdGFnLmdldEF0dHJpYnV0ZSgnbXVsdGlwbGUnKTtcbiAgICB2YXIgaW5wdXRMaXN0ZW5lciA9IGV2ZW50ID0+IHtcbiAgICAgIGlmIChldmVudC50YXJnZXQgIT09IHRhZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodHlwZSAmJiB0eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgaWYgKHRhZy5jaGVja2VkKSB7XG4gICAgICAgICAgcHJveHlbcHJvcGVydHldID0gZXZlbnQudGFyZ2V0LmdldEF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChldmVudC50YXJnZXQubWF0Y2hlcygnW2NvbnRlbnRlZGl0YWJsZT10cnVlXScpKSB7XG4gICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGV2ZW50LnRhcmdldC5pbm5lckhUTUw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdmaWxlJyAmJiBtdWx0aSkge1xuICAgICAgICB2YXIgZmlsZXMgPSBBcnJheS5mcm9tKGV2ZW50LnRhcmdldC5maWxlcyk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gcHJveHlbcHJvcGVydHldIHx8IF9CaW5kYWJsZS5CaW5kYWJsZS5vbkRlY2socHJveHksIHByb3BlcnR5KTtcbiAgICAgICAgaWYgKCFjdXJyZW50IHx8ICFmaWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBmaWxlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgX2xvb3A1ID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICAgIGlmIChmaWxlc1tpXSAhPT0gY3VycmVudFtpXSkge1xuICAgICAgICAgICAgICBmaWxlc1tpXS50b0pTT04gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGZpbGVbaV0ubmFtZSxcbiAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVbaV0uc2l6ZSxcbiAgICAgICAgICAgICAgICAgIHR5cGU6IGZpbGVbaV0udHlwZSxcbiAgICAgICAgICAgICAgICAgIGRhdGU6IGZpbGVbaV0ubGFzdE1vZGlmaWVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY3VycmVudFtpXSA9IGZpbGVzW2ldO1xuICAgICAgICAgICAgICByZXR1cm4gMTsgLy8gYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gZmlsZXMpIHtcbiAgICAgICAgICAgIGlmIChfbG9vcDUoaSkpIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZmlsZScgJiYgIW11bHRpICYmIGV2ZW50LnRhcmdldC5maWxlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIF9maWxlID0gZXZlbnQudGFyZ2V0LmZpbGVzLml0ZW0oMCk7XG4gICAgICAgIF9maWxlLnRvSlNPTiA9ICgpID0+IHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogX2ZpbGUubmFtZSxcbiAgICAgICAgICAgIHNpemU6IF9maWxlLnNpemUsXG4gICAgICAgICAgICB0eXBlOiBfZmlsZS50eXBlLFxuICAgICAgICAgICAgZGF0ZTogX2ZpbGUubGFzdE1vZGlmaWVkXG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgcHJveHlbcHJvcGVydHldID0gX2ZpbGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBldmVudC50YXJnZXQudmFsdWU7XG4gICAgICB9XG4gICAgfTtcbiAgICBpZiAodHlwZSA9PT0gJ2ZpbGUnIHx8IHR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcigndmFsdWUtY2hhbmdlZCcsIGlucHV0TGlzdGVuZXIpO1xuICAgIH1cbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIGlmICh0eXBlID09PSAnZmlsZScgfHwgdHlwZSA9PT0gJ3JhZGlvJykge1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcigndmFsdWUtY2hhbmdlZCcsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWJpbmQnKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcE9uVGFnKHRhZykge1xuICAgIHZhciByZWZlcmVudHMgPSBTdHJpbmcodGFnLmdldEF0dHJpYnV0ZSgnY3Ytb24nKSk7XG4gICAgcmVmZXJlbnRzLnNwbGl0KCc7JykubWFwKGEgPT4gYS5zcGxpdCgnOicpKS5mb3JFYWNoKGEgPT4ge1xuICAgICAgYSA9IGEubWFwKGEgPT4gYS50cmltKCkpO1xuICAgICAgdmFyIGFyZ0xlbiA9IGEubGVuZ3RoO1xuICAgICAgdmFyIGV2ZW50TmFtZSA9IFN0cmluZyhhLnNoaWZ0KCkpLnRyaW0oKTtcbiAgICAgIHZhciBjYWxsYmFja05hbWUgPSBTdHJpbmcoYS5zaGlmdCgpIHx8IGV2ZW50TmFtZSkudHJpbSgpO1xuICAgICAgdmFyIGV2ZW50RmxhZ3MgPSBTdHJpbmcoYS5zaGlmdCgpIHx8ICcnKS50cmltKCk7XG4gICAgICB2YXIgYXJnTGlzdCA9IFtdO1xuICAgICAgdmFyIGdyb3VwcyA9IC8oXFx3KykoPzpcXCgoWyRcXHdcXHMtJ1wiLF0rKVxcKSk/Ly5leGVjKGNhbGxiYWNrTmFtZSk7XG4gICAgICBpZiAoZ3JvdXBzKSB7XG4gICAgICAgIGNhbGxiYWNrTmFtZSA9IGdyb3Vwc1sxXS5yZXBsYWNlKC8oXltcXHNcXG5dK3xbXFxzXFxuXSskKS8sICcnKTtcbiAgICAgICAgaWYgKGdyb3Vwc1syXSkge1xuICAgICAgICAgIGFyZ0xpc3QgPSBncm91cHNbMl0uc3BsaXQoJywnKS5tYXAocyA9PiBzLnRyaW0oKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghYXJnTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgYXJnTGlzdC5wdXNoKCckZXZlbnQnKTtcbiAgICAgIH1cbiAgICAgIGlmICghZXZlbnROYW1lIHx8IGFyZ0xlbiA9PT0gMSkge1xuICAgICAgICBldmVudE5hbWUgPSBjYWxsYmFja05hbWU7XG4gICAgICB9XG4gICAgICB2YXIgZXZlbnRMaXN0ZW5lciA9IGV2ZW50ID0+IHtcbiAgICAgICAgdmFyIGV2ZW50TWV0aG9kO1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIF9sb29wNiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250cm9sbGVyID0gcGFyZW50LmNvbnRyb2xsZXI7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnRyb2xsZXJbY2FsbGJhY2tOYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICBldmVudE1ldGhvZCA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlcltjYWxsYmFja05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByZXR1cm4gMDsgLy8gYnJlYWtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhcmVudFtjYWxsYmFja05hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGV2ZW50TWV0aG9kID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICBwYXJlbnRbY2FsbGJhY2tOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFyZW50LnBhcmVudCkge1xuICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBfcmV0MjtcbiAgICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICAgIF9yZXQyID0gX2xvb3A2KCk7XG4gICAgICAgICAgaWYgKF9yZXQyID09PSAwKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB2YXIgYXJnUmVmcyA9IGFyZ0xpc3QubWFwKGFyZyA9PiB7XG4gICAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICAgIGlmIChOdW1iZXIoYXJnKSA9PSBhcmcpIHtcbiAgICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICdldmVudCcgfHwgYXJnID09PSAnJGV2ZW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHZpZXcnKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJGNvbnRyb2xsZXInKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udHJvbGxlcjtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyR0YWcnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHBhcmVudCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyRzdWJ2aWV3Jykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgaW4gdGhpcy5hcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcmdzW2FyZ107XG4gICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCA9IC9eWydcIl0oW1xcdy1dKz8pW1wiJ10kLy5leGVjKGFyZykpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoISh0eXBlb2YgZXZlbnRNZXRob2QgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2NhbGxiYWNrTmFtZX0gaXMgbm90IGRlZmluZWQgb24gVmlldyBvYmplY3QuYCArIFwiXFxuXCIgKyBgVGFnOmAgKyBcIlxcblwiICsgYCR7dGFnLm91dGVySFRNTH1gKTtcbiAgICAgICAgfVxuICAgICAgICBldmVudE1ldGhvZCguLi5hcmdSZWZzKTtcbiAgICAgIH07XG4gICAgICB2YXIgZXZlbnRPcHRpb25zID0ge307XG4gICAgICBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygncCcpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5wYXNzaXZlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnUCcpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5wYXNzaXZlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnYycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5jYXB0dXJlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnQycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5jYXB0dXJlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnbycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5vbmNlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnTycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5vbmNlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKGV2ZW50TmFtZSkge1xuICAgICAgICBjYXNlICdfaW5pdCc6XG4gICAgICAgICAgZXZlbnRMaXN0ZW5lcigpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdfYXR0YWNoJzpcbiAgICAgICAgICB0aGlzLm5vZGVzQXR0YWNoZWQuYWRkKGV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdfZGV0YWNoJzpcbiAgICAgICAgICB0aGlzLm5vZGVzRGV0YWNoZWQuYWRkKGV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZXZlbnRMaXN0ZW5lciwgZXZlbnRPcHRpb25zKTtcbiAgICAgICAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZXZlbnRMaXN0ZW5lciwgZXZlbnRPcHRpb25zKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHJldHVybiBbZXZlbnROYW1lLCBjYWxsYmFja05hbWUsIGFyZ0xpc3RdO1xuICAgIH0pO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LW9uJyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBMaW5rVGFnKHRhZykge1xuICAgIC8vIGNvbnN0IHRhZ0NvbXBpbGVyID0gdGhpcy5jb21waWxlTGlua1RhZyh0YWcpO1xuXG4gICAgLy8gY29uc3QgbmV3VGFnID0gdGFnQ29tcGlsZXIodGhpcyk7XG5cbiAgICAvLyB0YWcucmVwbGFjZVdpdGgobmV3VGFnKTtcblxuICAgIC8vIHJldHVybiBuZXdUYWc7XG5cbiAgICB2YXIgbGlua0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1saW5rJyk7XG4gICAgdGFnLnNldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmtBdHRyKTtcbiAgICB2YXIgbGlua0NsaWNrID0gZXZlbnQgPT4ge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChsaW5rQXR0ci5zdWJzdHJpbmcoMCwgNCkgPT09ICdodHRwJyB8fCBsaW5rQXR0ci5zdWJzdHJpbmcoMCwgMikgPT09ICcvLycpIHtcbiAgICAgICAgZ2xvYmFsVGhpcy5vcGVuKHRhZy5nZXRBdHRyaWJ1dGUoJ2hyZWYnLCBsaW5rQXR0cikpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBfUm91dGVyLlJvdXRlci5nbyh0YWcuZ2V0QXR0cmlidXRlKCdocmVmJykpO1xuICAgIH07XG4gICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlua0NsaWNrKTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgodGFnLCBldmVudExpc3RlbmVyKSA9PiAoKSA9PiB7XG4gICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudExpc3RlbmVyKTtcbiAgICAgIHRhZyA9IHVuZGVmaW5lZDtcbiAgICAgIGV2ZW50TGlzdGVuZXIgPSB1bmRlZmluZWQ7XG4gICAgfSkodGFnLCBsaW5rQ2xpY2spKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1saW5rJyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIGNvbXBpbGVMaW5rVGFnKHNvdXJjZVRhZylcbiAgLy8ge1xuICAvLyBcdGNvbnN0IGxpbmtBdHRyID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAvLyBcdHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgLy8gXHRyZXR1cm4gKGJpbmRpbmdWaWV3KSA9PiB7XG4gIC8vIFx0XHRjb25zdCB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKHRydWUpO1xuICAvLyBcdFx0dGFnLnNldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmtBdHRyKTtcbiAgLy8gXHRcdHJldHVybiB0YWc7XG4gIC8vIFx0fTtcbiAgLy8gfVxuXG4gIG1hcFByZW5kZXJlclRhZyh0YWcpIHtcbiAgICB2YXIgcHJlcmVuZGVyQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXByZXJlbmRlcicpO1xuICAgIHZhciBwcmVyZW5kZXJpbmcgPSBnbG9iYWxUaGlzLnByZXJlbmRlcmVyIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL3ByZXJlbmRlci9pKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1wcmVyZW5kZXInKTtcbiAgICBpZiAocHJlcmVuZGVyaW5nKSB7XG4gICAgICBnbG9iYWxUaGlzLnByZXJlbmRlcmVyID0gZ2xvYmFsVGhpcy5wcmVyZW5kZXJlciB8fCB0cnVlO1xuICAgIH1cbiAgICBpZiAocHJlcmVuZGVyQXR0ciA9PT0gJ25ldmVyJyAmJiBwcmVyZW5kZXJpbmcgfHwgcHJlcmVuZGVyQXR0ciA9PT0gJ29ubHknICYmICFwcmVyZW5kZXJpbmcpIHtcbiAgICAgIHRoaXMucG9zdE1hcHBpbmcuYWRkKCgpID0+IHRhZy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRhZykpO1xuICAgIH1cbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFdpdGhUYWcodGFnKSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG4gICAgdmFyIHdpdGhBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3Ytd2l0aCcpO1xuICAgIHZhciBjYXJyeUF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1jYXJyeScpO1xuICAgIHZhciB2aWV3QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi13aXRoJyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtY2FycnknKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHZpZXdBdHRyID8gdGhpcy5zdHJpbmdUb0NsYXNzKHZpZXdBdHRyKSA6IFZpZXc7XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4udGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIGNhcnJ5UHJvcHMgPSBbXTtcbiAgICBpZiAoY2FycnlBdHRyKSB7XG4gICAgICBjYXJyeVByb3BzID0gY2FycnlBdHRyLnNwbGl0KCcsJykubWFwKHMgPT4gcy50cmltKCkpO1xuICAgIH1cbiAgICB2YXIgZGViaW5kID0gdGhpcy5hcmdzLmJpbmRUbyh3aXRoQXR0ciwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgIGlmICh0aGlzLndpdGhWaWV3cy5oYXModGFnKSkge1xuICAgICAgICB0aGlzLndpdGhWaWV3cy5kZWxldGUodGFnKTtcbiAgICAgIH1cbiAgICAgIHdoaWxlICh0YWcuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YWcucmVtb3ZlQ2hpbGQodGFnLmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgICAgdmFyIHZpZXcgPSBuZXcgdmlld0NsYXNzKHt9LCB0aGlzKTtcbiAgICAgIHRoaXMub25SZW1vdmUoKHZpZXcgPT4gKCkgPT4ge1xuICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgfSkodmlldykpO1xuICAgICAgdmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAgICAgdmFyIF9sb29wNyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlYmluZCA9IF90aGlzMi5hcmdzLmJpbmRUbyhjYXJyeVByb3BzW2ldLCAodiwgaykgPT4ge1xuICAgICAgICAgIHZpZXcuYXJnc1trXSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICB2aWV3Lm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgICAgIF90aGlzMi5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgZGViaW5kKCk7XG4gICAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgaSBpbiBjYXJyeVByb3BzKSB7XG4gICAgICAgIF9sb29wNygpO1xuICAgICAgfVxuICAgICAgdmFyIF9sb29wOCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHYgPSBfQmluZGFibGUuQmluZGFibGUubWFrZSh2KTtcbiAgICAgICAgdmFyIGRlYmluZCA9IHYuYmluZFRvKF9pMiwgKHZ2LCBraywgdHQsIGRkKSA9PiB7XG4gICAgICAgICAgaWYgKCFkZCkge1xuICAgICAgICAgICAgdmlldy5hcmdzW2trXSA9IHZ2O1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2sgaW4gdmlldy5hcmdzKSB7XG4gICAgICAgICAgICBkZWxldGUgdmlldy5hcmdzW2trXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGViaW5kVXAgPSB2aWV3LmFyZ3MuYmluZFRvKF9pMiwgKHZ2LCBraywgdHQsIGRkKSA9PiB7XG4gICAgICAgICAgaWYgKCFkZCkge1xuICAgICAgICAgICAgdltra10gPSB2djtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtrIGluIHYpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2W2trXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfdGhpczIub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIGRlYmluZCgpO1xuICAgICAgICAgIGlmICghdi5pc0JvdW5kKCkpIHtcbiAgICAgICAgICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHYpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmlldy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgZGViaW5kKCk7XG4gICAgICAgICAgaWYgKCF2LmlzQm91bmQoKSkge1xuICAgICAgICAgICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3Modik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBfaTIgaW4gdikge1xuICAgICAgICBpZiAoX2xvb3A4KCkpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmlldy5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICAgIHRoaXMud2l0aFZpZXdzLnNldCh0YWcsIHZpZXcpO1xuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgdGhpcy53aXRoVmlld3MuZGVsZXRlKHRhZyk7XG4gICAgICBkZWJpbmQoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFZpZXdUYWcodGFnKSB7XG4gICAgdmFyIHZpZXdBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi50YWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgcGFydHMgPSB2aWV3QXR0ci5zcGxpdCgnOicpO1xuICAgIHZhciB2aWV3TmFtZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHBhcnRzLmxlbmd0aCA/IHRoaXMuc3RyaW5nVG9DbGFzcyhwYXJ0c1swXSkgOiBWaWV3O1xuICAgIHZhciB2aWV3ID0gbmV3IHZpZXdDbGFzcyh0aGlzLmFyZ3MsIHRoaXMpO1xuICAgIHRoaXMudmlld3Muc2V0KHRhZywgdmlldyk7XG4gICAgdGhpcy52aWV3cy5zZXQodmlld05hbWUsIHZpZXcpO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgIHRoaXMudmlld3MuZGVsZXRlKHRhZyk7XG4gICAgICB0aGlzLnZpZXdzLmRlbGV0ZSh2aWV3TmFtZSk7XG4gICAgfSk7XG4gICAgdmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAgIHZpZXcucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBFYWNoVGFnKHRhZykge1xuICAgIHZhciBlYWNoQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWVhY2gnKTtcbiAgICB2YXIgdmlld0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZWFjaCcpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgdmlld0NsYXNzID0gdmlld0F0dHIgPyB0aGlzLnN0cmluZ1RvQ2xhc3Modmlld0F0dHIpIDogVmlldztcbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi50YWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgW2VhY2hQcm9wLCBhc1Byb3AsIGtleVByb3BdID0gZWFjaEF0dHIuc3BsaXQoJzonKTtcbiAgICB2YXIgcHJveHkgPSB0aGlzLmFyZ3M7XG4gICAgdmFyIHByb3BlcnR5ID0gZWFjaFByb3A7XG4gICAgaWYgKGVhY2hQcm9wLm1hdGNoKC9cXC4vKSkge1xuICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZSh0aGlzLmFyZ3MsIGVhY2hQcm9wLCB0cnVlKTtcbiAgICB9XG4gICAgdmFyIGRlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgIGlmICh2IGluc3RhbmNlb2YgX0JhZy5CYWcpIHtcbiAgICAgICAgdiA9IHYubGlzdDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnZpZXdMaXN0cy5oYXModGFnKSkge1xuICAgICAgICB0aGlzLnZpZXdMaXN0cy5nZXQodGFnKS5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIHZhciB2aWV3TGlzdCA9IG5ldyBfVmlld0xpc3QuVmlld0xpc3Qoc3ViVGVtcGxhdGUsIGFzUHJvcCwgdiwgdGhpcywga2V5UHJvcCwgdmlld0NsYXNzKTtcbiAgICAgIHZhciB2aWV3TGlzdFJlbW92ZXIgPSAoKSA9PiB2aWV3TGlzdC5yZW1vdmUoKTtcbiAgICAgIHRoaXMub25SZW1vdmUodmlld0xpc3RSZW1vdmVyKTtcbiAgICAgIHZpZXdMaXN0Lm9uUmVtb3ZlKCgpID0+IHRoaXMuX29uUmVtb3ZlLnJlbW92ZSh2aWV3TGlzdFJlbW92ZXIpKTtcbiAgICAgIHZhciBkZWJpbmRBID0gdGhpcy5hcmdzLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICBpZiAoayA9PT0gJ19pZCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkKSB7XG4gICAgICAgICAgdmlld0xpc3Quc3ViQXJnc1trXSA9IHY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGsgaW4gdmlld0xpc3Quc3ViQXJncykge1xuICAgICAgICAgICAgZGVsZXRlIHZpZXdMaXN0LnN1YkFyZ3Nba107XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZhciBkZWJpbmRCID0gdmlld0xpc3QuYXJncy5iaW5kVG8oKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgICAgaWYgKGsgPT09ICdfaWQnIHx8IGsgPT09ICd2YWx1ZScgfHwgU3RyaW5nKGspLnN1YnN0cmluZygwLCAzKSA9PT0gJ19fXycpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkKSB7XG4gICAgICAgICAgaWYgKGsgaW4gdGhpcy5hcmdzKSB7XG4gICAgICAgICAgICB0aGlzLmFyZ3Nba10gPSB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5hcmdzW2tdO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZpZXdMaXN0Lm9uUmVtb3ZlKGRlYmluZEEpO1xuICAgICAgdmlld0xpc3Qub25SZW1vdmUoZGViaW5kQik7XG4gICAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZEEpO1xuICAgICAgdGhpcy5vblJlbW92ZShkZWJpbmRCKTtcbiAgICAgIHdoaWxlICh0YWcuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YWcucmVtb3ZlQ2hpbGQodGFnLmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgICAgdGhpcy52aWV3TGlzdHMuc2V0KHRhZywgdmlld0xpc3QpO1xuICAgICAgdmlld0xpc3QucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgICBpZiAodGFnLnRhZ05hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICAgIHZpZXdMaXN0LnJlUmVuZGVyKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZShkZWJpbmQpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwSWZUYWcodGFnKSB7XG4gICAgdmFyIHNvdXJjZVRhZyA9IHRhZztcbiAgICB2YXIgdmlld1Byb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciBpZlByb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtaWYnKTtcbiAgICB2YXIgaXNQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWlzJyk7XG4gICAgdmFyIGludmVydGVkID0gZmFsc2U7XG4gICAgdmFyIGRlZmluZWQgPSBmYWxzZTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtaWYnKTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1pcycpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSB2aWV3UHJvcGVydHkgPyB0aGlzLnN0cmluZ1RvQ2xhc3Modmlld1Byb3BlcnR5KSA6IFZpZXc7XG4gICAgaWYgKGlmUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnIScpIHtcbiAgICAgIGlmUHJvcGVydHkgPSBpZlByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgIGludmVydGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlmUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnPycpIHtcbiAgICAgIGlmUHJvcGVydHkgPSBpZlByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgIGRlZmluZWQgPSB0cnVlO1xuICAgIH1cbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi5zb3VyY2VUYWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgYmluZGluZ1ZpZXcgPSB0aGlzO1xuICAgIHZhciBpZkRvYyA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICAvLyBsZXQgdmlldyA9IG5ldyB2aWV3Q2xhc3MoT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5hcmdzKSwgYmluZGluZ1ZpZXcpO1xuICAgIHZhciB2aWV3ID0gbmV3IHZpZXdDbGFzcyh0aGlzLmFyZ3MsIGJpbmRpbmdWaWV3KTtcbiAgICB2aWV3LnRhZ3MuYmluZFRvKCh2LCBrKSA9PiB0aGlzLnRhZ3Nba10gPSB2LCB7XG4gICAgICByZW1vdmVXaXRoOiB0aGlzXG4gICAgfSk7XG4gICAgdmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAgIHZhciBwcm94eSA9IGJpbmRpbmdWaWV3LmFyZ3M7XG4gICAgdmFyIHByb3BlcnR5ID0gaWZQcm9wZXJ0eTtcbiAgICBpZiAoaWZQcm9wZXJ0eS5tYXRjaCgvXFwuLykpIHtcbiAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoYmluZGluZ1ZpZXcuYXJncywgaWZQcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgfVxuICAgIHZpZXcucmVuZGVyKGlmRG9jLCBudWxsLCB0aGlzKTtcbiAgICB2YXIgcHJvcGVydHlEZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrKSA9PiB7XG4gICAgICB2YXIgbyA9IHY7XG4gICAgICBpZiAoZGVmaW5lZCkge1xuICAgICAgICB2ID0gdiAhPT0gbnVsbCAmJiB2ICE9PSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBpZiAodiBpbnN0YW5jZW9mIF9CYWcuQmFnKSB7XG4gICAgICAgIHYgPSB2Lmxpc3Q7XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgICB2ID0gISF2Lmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGlmIChpc1Byb3BlcnR5ICE9PSBudWxsKSB7XG4gICAgICAgIHYgPSBvID09IGlzUHJvcGVydHk7XG4gICAgICB9XG4gICAgICBpZiAoaW52ZXJ0ZWQpIHtcbiAgICAgICAgdiA9ICF2O1xuICAgICAgfVxuICAgICAgaWYgKHYpIHtcbiAgICAgICAgdGFnLmFwcGVuZENoaWxkKGlmRG9jKTtcbiAgICAgICAgWy4uLmlmRG9jLmNoaWxkTm9kZXNdLmZvckVhY2gobm9kZSA9PiBfRG9tLkRvbS5tYXBUYWdzKG5vZGUsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgICAgICBpZiAoIXRhZy5tYXRjaGVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZEb21BdHRhY2hlZCcsIHtcbiAgICAgICAgICAgIHRhcmdldDogdGFnLFxuICAgICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZpZXcubm9kZXMuZm9yRWFjaChuID0+IGlmRG9jLmFwcGVuZENoaWxkKG4pKTtcbiAgICAgICAgX0RvbS5Eb20ubWFwVGFncyhpZkRvYywgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgICAgIGlmICghdGFnLm1hdGNoZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3IEN1c3RvbUV2ZW50KCdjdkRvbURldGFjaGVkJywge1xuICAgICAgICAgICAgdGFyZ2V0OiB0YWcsXG4gICAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShwcm94eVtwcm9wZXJ0eV0pXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBwcm9wZXJ0eURlYmluZCA9IHRoaXMuYXJncy5iaW5kQ2hhaW4ocHJvcGVydHksIG9uVXBkYXRlKTtcblxuICAgIGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcblxuICAgIC8vIGNvbnN0IGRlYmluZEEgPSB0aGlzLmFyZ3MuYmluZFRvKCh2LGssdCxkKSA9PiB7XG4gICAgLy8gXHRpZihrID09PSAnX2lkJylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0cmV0dXJuO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRpZighZClcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0dmlldy5hcmdzW2tdID0gdjtcbiAgICAvLyBcdH1cbiAgICAvLyBcdGVsc2UgaWYoayBpbiB2aWV3LmFyZ3MpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdGRlbGV0ZSB2aWV3LmFyZ3Nba107XG4gICAgLy8gXHR9XG5cbiAgICAvLyB9KTtcblxuICAgIC8vIGNvbnN0IGRlYmluZEIgPSB2aWV3LmFyZ3MuYmluZFRvKCh2LGssdCxkLHApID0+IHtcbiAgICAvLyBcdGlmKGsgPT09ICdfaWQnIHx8IFN0cmluZyhrKS5zdWJzdHJpbmcoMCwzKSA9PT0gJ19fXycpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdHJldHVybjtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0aWYoayBpbiB0aGlzLmFyZ3MpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdGlmKCFkKVxuICAgIC8vIFx0XHR7XG4gICAgLy8gXHRcdFx0dGhpcy5hcmdzW2tdID0gdjtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0XHRlbHNlXG4gICAgLy8gXHRcdHtcbiAgICAvLyBcdFx0XHRkZWxldGUgdGhpcy5hcmdzW2tdO1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHR9XG4gICAgLy8gfSk7XG5cbiAgICB2YXIgdmlld0RlYmluZCA9ICgpID0+IHtcbiAgICAgIHByb3BlcnR5RGViaW5kKCk7XG4gICAgICAvLyBkZWJpbmRBKCk7XG4gICAgICAvLyBkZWJpbmRCKCk7XG4gICAgICBiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcbiAgICAgIC8vIGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUoYmluZGFibGVEZWJpbmQpO1xuICAgIH07XG4gICAgYmluZGluZ1ZpZXcub25SZW1vdmUodmlld0RlYmluZCk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAvLyBkZWJpbmRBKCk7XG4gICAgICAvLyBkZWJpbmRCKCk7XG4gICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgaWYgKGJpbmRpbmdWaWV3ICE9PSB0aGlzKSB7XG4gICAgICAgIGJpbmRpbmdWaWV3LnJlbW92ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBjb21waWxlSWZUYWcoc291cmNlVGFnKVxuICAvLyB7XG4gIC8vIFx0bGV0IGlmUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1pZicpO1xuICAvLyBcdGxldCBpbnZlcnRlZCAgID0gZmFsc2U7XG5cbiAgLy8gXHRzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1pZicpO1xuXG4gIC8vIFx0aWYoaWZQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICchJylcbiAgLy8gXHR7XG4gIC8vIFx0XHRpZlByb3BlcnR5ID0gaWZQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gIC8vIFx0XHRpbnZlcnRlZCAgID0gdHJ1ZTtcbiAgLy8gXHR9XG5cbiAgLy8gXHRjb25zdCBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50O1xuXG4gIC8vIFx0Wy4uLnNvdXJjZVRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKFxuICAvLyBcdFx0biA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuLmNsb25lTm9kZSh0cnVlKSlcbiAgLy8gXHQpO1xuXG4gIC8vIFx0cmV0dXJuIChiaW5kaW5nVmlldykgPT4ge1xuXG4gIC8vIFx0XHRjb25zdCB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKCk7XG5cbiAgLy8gXHRcdGNvbnN0IGlmRG9jID0gbmV3IERvY3VtZW50RnJhZ21lbnQ7XG5cbiAgLy8gXHRcdGxldCB2aWV3ID0gbmV3IFZpZXcoe30sIGJpbmRpbmdWaWV3KTtcblxuICAvLyBcdFx0dmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAvLyBcdFx0Ly8gdmlldy5wYXJlbnQgICA9IGJpbmRpbmdWaWV3O1xuXG4gIC8vIFx0XHRiaW5kaW5nVmlldy5zeW5jQmluZCh2aWV3KTtcblxuICAvLyBcdFx0bGV0IHByb3h5ICAgID0gYmluZGluZ1ZpZXcuYXJncztcbiAgLy8gXHRcdGxldCBwcm9wZXJ0eSA9IGlmUHJvcGVydHk7XG5cbiAgLy8gXHRcdGlmKGlmUHJvcGVydHkubWF0Y2goL1xcLi8pKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRbcHJveHksIHByb3BlcnR5XSA9IEJpbmRhYmxlLnJlc29sdmUoXG4gIC8vIFx0XHRcdFx0YmluZGluZ1ZpZXcuYXJnc1xuICAvLyBcdFx0XHRcdCwgaWZQcm9wZXJ0eVxuICAvLyBcdFx0XHRcdCwgdHJ1ZVxuICAvLyBcdFx0XHQpO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRsZXQgaGFzUmVuZGVyZWQgPSBmYWxzZTtcblxuICAvLyBcdFx0Y29uc3QgcHJvcGVydHlEZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LGspID0+IHtcblxuICAvLyBcdFx0XHRpZighaGFzUmVuZGVyZWQpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRjb25zdCByZW5kZXJEb2MgPSAoYmluZGluZ1ZpZXcuYXJnc1twcm9wZXJ0eV0gfHwgaW52ZXJ0ZWQpXG4gIC8vIFx0XHRcdFx0XHQ/IHRhZyA6IGlmRG9jO1xuXG4gIC8vIFx0XHRcdFx0dmlldy5yZW5kZXIocmVuZGVyRG9jKTtcblxuICAvLyBcdFx0XHRcdGhhc1JlbmRlcmVkID0gdHJ1ZTtcblxuICAvLyBcdFx0XHRcdHJldHVybjtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGlmKEFycmF5LmlzQXJyYXkodikpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR2ID0gISF2Lmxlbmd0aDtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGlmKGludmVydGVkKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0diA9ICF2O1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0aWYodilcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHRhZy5hcHBlbmRDaGlsZChpZkRvYyk7XG4gIC8vIFx0XHRcdH1cbiAgLy8gXHRcdFx0ZWxzZVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0dmlldy5ub2Rlcy5mb3JFYWNoKG49PmlmRG9jLmFwcGVuZENoaWxkKG4pKTtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHR9KTtcblxuICAvLyBcdFx0Ly8gbGV0IGNsZWFuZXIgPSBiaW5kaW5nVmlldztcblxuICAvLyBcdFx0Ly8gd2hpbGUoY2xlYW5lci5wYXJlbnQpXG4gIC8vIFx0XHQvLyB7XG4gIC8vIFx0XHQvLyBcdGNsZWFuZXIgPSBjbGVhbmVyLnBhcmVudDtcbiAgLy8gXHRcdC8vIH1cblxuICAvLyBcdFx0YmluZGluZ1ZpZXcub25SZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuXG4gIC8vIFx0XHRsZXQgYmluZGFibGVEZWJpbmQgPSAoKSA9PiB7XG5cbiAgLy8gXHRcdFx0aWYoIXByb3h5LmlzQm91bmQoKSlcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3MocHJveHkpO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdH07XG5cbiAgLy8gXHRcdGxldCB2aWV3RGViaW5kID0gKCk9PntcbiAgLy8gXHRcdFx0cHJvcGVydHlEZWJpbmQoKTtcbiAgLy8gXHRcdFx0YmluZGFibGVEZWJpbmQoKTtcbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUoYmluZGFibGVEZWJpbmQpO1xuICAvLyBcdFx0fTtcblxuICAvLyBcdFx0dmlldy5vblJlbW92ZSh2aWV3RGViaW5kKTtcblxuICAvLyBcdFx0cmV0dXJuIHRhZztcbiAgLy8gXHR9O1xuICAvLyB9XG5cbiAgbWFwVGVtcGxhdGVUYWcodGFnKSB7XG4gICAgLy8gY29uc3QgdGVtcGxhdGVOYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcblxuICAgIC8vIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG5cbiAgICAvLyB0aGlzLnRlbXBsYXRlc1sgdGVtcGxhdGVOYW1lIF0gPSB0YWcudGFnTmFtZSA9PT0gJ1RFTVBMQVRFJ1xuICAgIC8vIFx0PyB0YWcuY2xvbmVOb2RlKHRydWUpLmNvbnRlbnRcbiAgICAvLyBcdDogbmV3IERvY3VtZW50RnJhZ21lbnQodGFnLmlubmVySFRNTCk7XG5cbiAgICB2YXIgdGVtcGxhdGVOYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuICAgIHZhciBzb3VyY2UgPSB0YWcuaW5uZXJIVE1MO1xuICAgIGlmICghVmlldy50ZW1wbGF0ZXMuaGFzKHNvdXJjZSkpIHtcbiAgICAgIFZpZXcudGVtcGxhdGVzLnNldChzb3VyY2UsIGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHRhZy5pbm5lckhUTUwpKTtcbiAgICB9XG4gICAgdGhpcy50ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXSA9IFZpZXcudGVtcGxhdGVzLmdldChzb3VyY2UpO1xuICAgIHRoaXMucG9zdE1hcHBpbmcuYWRkKCgpID0+IHRhZy5yZW1vdmUoKSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBTbG90VGFnKHRhZykge1xuICAgIHZhciB0ZW1wbGF0ZU5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1zbG90Jyk7XG4gICAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXTtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgdGVtcGxhdGUgPSBwYXJlbnQudGVtcGxhdGVzW3RlbXBsYXRlTmFtZV07XG4gICAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICB9XG4gICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFRlbXBsYXRlICR7dGVtcGxhdGVOYW1lfSBub3QgZm91bmQuYCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3Ytc2xvdCcpO1xuICAgIHdoaWxlICh0YWcuZmlyc3RDaGlsZCkge1xuICAgICAgdGFnLmZpcnN0Q2hpbGQucmVtb3ZlKCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdGVtcGxhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAoIVZpZXcudGVtcGxhdGVzLmhhcyh0ZW1wbGF0ZSkpIHtcbiAgICAgICAgVmlldy50ZW1wbGF0ZXMuc2V0KHRlbXBsYXRlLCBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCh0ZW1wbGF0ZSkpO1xuICAgICAgfVxuICAgICAgdGVtcGxhdGUgPSBWaWV3LnRlbXBsYXRlcy5nZXQodGVtcGxhdGUpO1xuICAgIH1cbiAgICB0YWcuYXBwZW5kQ2hpbGQodGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gc3luY0JpbmQoc3ViVmlldylcbiAgLy8ge1xuICAvLyBcdGxldCBkZWJpbmRBID0gdGhpcy5hcmdzLmJpbmRUbygodixrLHQsZCk9PntcbiAgLy8gXHRcdGlmKGsgPT09ICdfaWQnKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRyZXR1cm47XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKHN1YlZpZXcuYXJnc1trXSAhPT0gdilcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0c3ViVmlldy5hcmdzW2tdID0gdjtcbiAgLy8gXHRcdH1cbiAgLy8gXHR9KTtcblxuICAvLyBcdGxldCBkZWJpbmRCID0gc3ViVmlldy5hcmdzLmJpbmRUbygodixrLHQsZCxwKT0+e1xuXG4gIC8vIFx0XHRpZihrID09PSAnX2lkJylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0cmV0dXJuO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRsZXQgbmV3UmVmID0gdjtcbiAgLy8gXHRcdGxldCBvbGRSZWYgPSBwO1xuXG4gIC8vIFx0XHRpZihuZXdSZWYgaW5zdGFuY2VvZiBWaWV3KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRuZXdSZWYgPSBuZXdSZWYuX19fcmVmX19fO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihvbGRSZWYgaW5zdGFuY2VvZiBWaWV3KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRvbGRSZWYgPSBvbGRSZWYuX19fcmVmX19fO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihuZXdSZWYgIT09IG9sZFJlZiAmJiBvbGRSZWYgaW5zdGFuY2VvZiBWaWV3KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRwLnJlbW92ZSgpO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihrIGluIHRoaXMuYXJncylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0dGhpcy5hcmdzW2tdID0gdjtcbiAgLy8gXHRcdH1cblxuICAvLyBcdH0pO1xuXG4gIC8vIFx0dGhpcy5vblJlbW92ZShkZWJpbmRBKTtcbiAgLy8gXHR0aGlzLm9uUmVtb3ZlKGRlYmluZEIpO1xuXG4gIC8vIFx0c3ViVmlldy5vblJlbW92ZSgoKT0+e1xuICAvLyBcdFx0dGhpcy5fb25SZW1vdmUucmVtb3ZlKGRlYmluZEEpO1xuICAvLyBcdFx0dGhpcy5fb25SZW1vdmUucmVtb3ZlKGRlYmluZEIpO1xuICAvLyBcdH0pO1xuICAvLyB9XG5cbiAgcG9zdFJlbmRlcihwYXJlbnROb2RlKSB7fVxuICBhdHRhY2hlZChwYXJlbnROb2RlKSB7fVxuICBpbnRlcnBvbGF0YWJsZShzdHIpIHtcbiAgICByZXR1cm4gISFTdHJpbmcoc3RyKS5tYXRjaCh0aGlzLmludGVycG9sYXRlUmVnZXgpO1xuICB9XG4gIHN0YXRpYyB1dWlkKCkge1xuICAgIHJldHVybiBuZXcgX1V1aWQuVXVpZCgpO1xuICB9XG4gIHJlbW92ZShub3cgPSBmYWxzZSkge1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVtb3ZlJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHZpZXc6IHRoaXNcbiAgICAgIH0sXG4gICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgfSkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZW1vdmVyID0gKCkgPT4ge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnRhZ3MpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy50YWdzW2ldKSkge1xuICAgICAgICAgIHRoaXMudGFnc1tpXSAmJiB0aGlzLnRhZ3NbaV0uZm9yRWFjaCh0ID0+IHQucmVtb3ZlKCkpO1xuICAgICAgICAgIHRoaXMudGFnc1tpXS5zcGxpY2UoMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy50YWdzW2ldICYmIHRoaXMudGFnc1tpXS5yZW1vdmUoKTtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pMyBpbiB0aGlzLm5vZGVzKSB7XG4gICAgICAgIHRoaXMubm9kZXNbX2kzXSAmJiB0aGlzLm5vZGVzW19pM10uZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2N2RG9tRGV0YWNoZWQnKSk7XG4gICAgICAgIHRoaXMubm9kZXNbX2kzXSAmJiB0aGlzLm5vZGVzW19pM10ucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMubm9kZXNbX2kzXSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHRoaXMubm9kZXMuc3BsaWNlKDApO1xuICAgICAgdGhpcy5maXJzdE5vZGUgPSB0aGlzLmxhc3ROb2RlID0gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgaWYgKG5vdykge1xuICAgICAgcmVtb3ZlcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVtb3Zlcik7XG4gICAgfVxuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9vblJlbW92ZS5pdGVtcygpO1xuICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIGNhbGxiYWNrcykge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICAgIHRoaXMuX29uUmVtb3ZlLnJlbW92ZShjYWxsYmFjayk7XG4gICAgfVxuICAgIGZvciAodmFyIGNsZWFudXAgb2YgdGhpcy5jbGVhbnVwKSB7XG4gICAgICBjbGVhbnVwICYmIGNsZWFudXAoKTtcbiAgICB9XG4gICAgdGhpcy5jbGVhbnVwLmxlbmd0aCA9IDA7XG4gICAgZm9yICh2YXIgW3RhZywgdmlld0xpc3RdIG9mIHRoaXMudmlld0xpc3RzKSB7XG4gICAgICB2aWV3TGlzdC5yZW1vdmUoKTtcbiAgICB9XG4gICAgdGhpcy52aWV3TGlzdHMuY2xlYXIoKTtcbiAgICBmb3IgKHZhciBbX2NhbGxiYWNrNSwgdGltZW91dF0gb2YgdGhpcy50aW1lb3V0cykge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQudGltZW91dCk7XG4gICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0LnRpbWVvdXQpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpbnRlcnZhbCBvZiB0aGlzLmludGVydmFscykge1xuICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgfVxuICAgIHRoaXMuaW50ZXJ2YWxzLmxlbmd0aCA9IDA7XG4gICAgZm9yICh2YXIgZnJhbWUgb2YgdGhpcy5mcmFtZXMpIHtcbiAgICAgIGZyYW1lKCk7XG4gICAgfVxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5wcmVSdWxlU2V0LnB1cmdlKCk7XG4gICAgdGhpcy5ydWxlU2V0LnB1cmdlKCk7XG4gICAgdGhpcy5yZW1vdmVkID0gdHJ1ZTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW1vdmVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHZpZXc6IHRoaXNcbiAgICAgIH0sXG4gICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgfSkpO1xuICB9XG4gIGZpbmRUYWcoc2VsZWN0b3IpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMubm9kZXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB2b2lkIDA7XG4gICAgICBpZiAoIXRoaXMubm9kZXNbaV0ucXVlcnlTZWxlY3Rvcikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm5vZGVzW2ldLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBuZXcgX1RhZy5UYWcodGhpcy5ub2Rlc1tpXSwgdGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCA9IHRoaXMubm9kZXNbaV0ucXVlcnlTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBfVGFnLlRhZyhyZXN1bHQsIHRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZmluZFRhZ3Moc2VsZWN0b3IpIHtcbiAgICB2YXIgdG9wTGV2ZWwgPSB0aGlzLm5vZGVzLmZpbHRlcihuID0+IG4ubWF0Y2hlcyAmJiBuLm1hdGNoZXMoc2VsZWN0b3IpKTtcbiAgICB2YXIgc3ViTGV2ZWwgPSB0aGlzLm5vZGVzLmZpbHRlcihuID0+IG4ucXVlcnlTZWxlY3RvckFsbCkubWFwKG4gPT4gWy4uLm4ucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcildKS5mbGF0KCkubWFwKG4gPT4gbmV3IF9UYWcuVGFnKG4sIHRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzKSkgfHwgW107XG4gICAgcmV0dXJuIHRvcExldmVsLmNvbmNhdChzdWJMZXZlbCk7XG4gIH1cbiAgb25SZW1vdmUoY2FsbGJhY2spIHtcbiAgICBpZiAoY2FsbGJhY2sgaW5zdGFuY2VvZiBFdmVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9vblJlbW92ZS5hZGQoY2FsbGJhY2spO1xuICB9XG4gIHVwZGF0ZSgpIHt9XG4gIGJlZm9yZVVwZGF0ZShhcmdzKSB7fVxuICBhZnRlclVwZGF0ZShhcmdzKSB7fVxuICBzdHJpbmdUcmFuc2Zvcm1lcihtZXRob2RzKSB7XG4gICAgcmV0dXJuIHggPT4ge1xuICAgICAgZm9yICh2YXIgbSBpbiBtZXRob2RzKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgbWV0aG9kID0gbWV0aG9kc1ttXTtcbiAgICAgICAgd2hpbGUgKHBhcmVudCAmJiAhcGFyZW50W21ldGhvZF0pIHtcbiAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICghcGFyZW50KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHggPSBwYXJlbnRbbWV0aG9kc1ttXV0oeCk7XG4gICAgICB9XG4gICAgICByZXR1cm4geDtcbiAgICB9O1xuICB9XG4gIHN0cmluZ1RvQ2xhc3MocmVmQ2xhc3NuYW1lKSB7XG4gICAgaWYgKFZpZXcucmVmQ2xhc3Nlcy5oYXMocmVmQ2xhc3NuYW1lKSkge1xuICAgICAgcmV0dXJuIFZpZXcucmVmQ2xhc3Nlcy5nZXQocmVmQ2xhc3NuYW1lKTtcbiAgICB9XG4gICAgdmFyIHJlZkNsYXNzU3BsaXQgPSByZWZDbGFzc25hbWUuc3BsaXQoJy8nKTtcbiAgICB2YXIgcmVmU2hvcnRDbGFzcyA9IHJlZkNsYXNzU3BsaXRbcmVmQ2xhc3NTcGxpdC5sZW5ndGggLSAxXTtcbiAgICB2YXIgcmVmQ2xhc3MgPSByZXF1aXJlKHJlZkNsYXNzbmFtZSk7XG4gICAgVmlldy5yZWZDbGFzc2VzLnNldChyZWZDbGFzc25hbWUsIHJlZkNsYXNzW3JlZlNob3J0Q2xhc3NdKTtcbiAgICByZXR1cm4gcmVmQ2xhc3NbcmVmU2hvcnRDbGFzc107XG4gIH1cbiAgcHJldmVudFBhcnNpbmcobm9kZSkge1xuICAgIG5vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZXMubWFwKG4gPT4gbi5vdXRlckhUTUwpLmpvaW4oJyAnKTtcbiAgfVxuICBsaXN0ZW4obm9kZSwgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbnMgPSBjYWxsYmFjaztcbiAgICAgIGNhbGxiYWNrID0gZXZlbnROYW1lO1xuICAgICAgZXZlbnROYW1lID0gbm9kZTtcbiAgICAgIG5vZGUgPSB0aGlzO1xuICAgIH1cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpc3Rlbihub2RlLm5vZGVzLCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLm1hcChuID0+IHRoaXMubGlzdGVuKG4sIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpKTtcbiAgICAgIC8vIC5mb3JFYWNoKHIgPT4gcigpKTtcbiAgICB9XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdGVuKG5vZGUuZWxlbWVudCwgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgfVxuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB2YXIgcmVtb3ZlID0gKCkgPT4gbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIHZhciByZW1vdmVyID0gKCkgPT4ge1xuICAgICAgcmVtb3ZlKCk7XG4gICAgICByZW1vdmUgPSAoKSA9PiB7fTtcbiAgICB9O1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4gcmVtb3ZlcigpKTtcbiAgICByZXR1cm4gcmVtb3ZlcjtcbiAgfVxuICBkZXRhY2goKSB7XG4gICAgZm9yICh2YXIgbiBpbiB0aGlzLm5vZGVzKSB7XG4gICAgICB0aGlzLm5vZGVzW25dLnJlbW92ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgfVxufVxuZXhwb3J0cy5WaWV3ID0gVmlldztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShWaWV3LCAndGVtcGxhdGVzJywge1xuICB2YWx1ZTogbmV3IE1hcCgpXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShWaWV3LCAncmVmQ2xhc3NlcycsIHtcbiAgdmFsdWU6IG5ldyBNYXAoKVxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9WaWV3TGlzdC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVmlld0xpc3QgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgX1NldE1hcCA9IHJlcXVpcmUoXCIuL1NldE1hcFwiKTtcbnZhciBfQmFnID0gcmVxdWlyZShcIi4vQmFnXCIpO1xuY2xhc3MgVmlld0xpc3Qge1xuICBjb25zdHJ1Y3Rvcih0ZW1wbGF0ZSwgc3ViUHJvcGVydHksIGxpc3QsIHBhcmVudCwga2V5UHJvcGVydHkgPSBudWxsLCB2aWV3Q2xhc3MgPSBudWxsKSB7XG4gICAgdGhpcy5yZW1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5hcmdzID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICB0aGlzLmFyZ3MudmFsdWUgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKGxpc3QgfHwgT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgdGhpcy5zdWJBcmdzID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICB0aGlzLnZpZXdzID0gW107XG4gICAgdGhpcy5jbGVhbnVwID0gW107XG4gICAgdGhpcy52aWV3Q2xhc3MgPSB2aWV3Q2xhc3M7XG4gICAgdGhpcy5fb25SZW1vdmUgPSBuZXcgX0JhZy5CYWcoKTtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgdGhpcy5zdWJQcm9wZXJ0eSA9IHN1YlByb3BlcnR5O1xuICAgIHRoaXMua2V5UHJvcGVydHkgPSBrZXlQcm9wZXJ0eTtcbiAgICB0aGlzLnRhZyA9IG51bGw7XG4gICAgdGhpcy5kb3duRGViaW5kID0gW107XG4gICAgdGhpcy51cERlYmluZCA9IFtdO1xuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy52aWV3Q291bnQgPSAwO1xuICAgIHRoaXMucmVuZGVyZWQgPSBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpID0+IHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVuZGVyQ29tcGxldGUnLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZTogYWNjZXB0XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLndpbGxSZVJlbmRlciA9IGZhbHNlO1xuICAgIHRoaXMuYXJncy5fX19iZWZvcmUoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgIGlmIChlID09ICdiaW5kVG8nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMucGF1c2VkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLmFyZ3MuX19fYWZ0ZXIoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgIGlmIChlID09ICdiaW5kVG8nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMucGF1c2VkID0gcy5sZW5ndGggPiAxO1xuICAgICAgdGhpcy5yZVJlbmRlcigpO1xuICAgIH0pO1xuICAgIHZhciBkZWJpbmQgPSB0aGlzLmFyZ3MudmFsdWUuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGtrID0gaztcbiAgICAgIGlmICh0eXBlb2YgayA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlzTmFOKGspKSB7XG4gICAgICAgIGtrID0gJ18nICsgaztcbiAgICAgIH1cbiAgICAgIGlmIChkKSB7XG4gICAgICAgIGlmICh0aGlzLnZpZXdzW2trXSkge1xuICAgICAgICAgIHRoaXMudmlld3Nba2tdLnJlbW92ZSh0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy52aWV3c1tra107XG4gICAgICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgICAgIGlmICghdGhpcy52aWV3c1tpXSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpc05hTihpKSkge1xuICAgICAgICAgICAgdGhpcy52aWV3c1tpXS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gaS5zdWJzdHIoMSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52aWV3c1tpXS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gaTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghdGhpcy52aWV3c1tra10pIHtcbiAgICAgICAgaWYgKCF0aGlzLnZpZXdDb3VudCkge1xuICAgICAgICAgIHRoaXMucmVSZW5kZXIoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy53aWxsUmVSZW5kZXIgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLndpbGxSZVJlbmRlciA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMud2lsbFJlUmVuZGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgIHRoaXMucmVSZW5kZXIoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0aGlzLnZpZXdzW2trXSAmJiB0aGlzLnZpZXdzW2trXS5hcmdzKSB7XG4gICAgICAgIHRoaXMudmlld3Nba2tdLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBrO1xuICAgICAgICB0aGlzLnZpZXdzW2trXS5hcmdzW3RoaXMuc3ViUHJvcGVydHldID0gdjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB3YWl0OiAwXG4gICAgfSk7XG4gICAgdGhpcy5fb25SZW1vdmUuYWRkKGRlYmluZCk7XG4gICAgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKHRoaXMpO1xuICB9XG4gIHJlbmRlcih0YWcpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciByZW5kZXJzID0gW107XG4gICAgdmFyIF9sb29wID0gZnVuY3Rpb24gKHZpZXcpIHtcbiAgICAgIHZpZXcudmlld0xpc3QgPSBfdGhpcztcbiAgICAgIHZpZXcucmVuZGVyKHRhZywgbnVsbCwgX3RoaXMucGFyZW50KTtcbiAgICAgIHJlbmRlcnMucHVzaCh2aWV3LnJlbmRlcmVkLnRoZW4oKCkgPT4gdmlldykpO1xuICAgIH07XG4gICAgZm9yICh2YXIgdmlldyBvZiB0aGlzLnZpZXdzKSB7XG4gICAgICBfbG9vcCh2aWV3KTtcbiAgICB9XG4gICAgdGhpcy50YWcgPSB0YWc7XG4gICAgUHJvbWlzZS5hbGwocmVuZGVycykudGhlbih2aWV3cyA9PiB0aGlzLnJlbmRlckNvbXBsZXRlKHZpZXdzKSk7XG4gICAgdGhpcy5wYXJlbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RSZW5kZXJlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBrZXk6IHRoaXMuc3ViUHJvcGVydHksXG4gICAgICAgICAgdmFsdWU6IHRoaXMuYXJncy52YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG4gIHJlUmVuZGVyKCkge1xuICAgIHZhciBfdGhpczIgPSB0aGlzO1xuICAgIGlmICh0aGlzLnBhdXNlZCB8fCAhdGhpcy50YWcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHZpZXdzID0gW107XG4gICAgdmFyIGV4aXN0aW5nVmlld3MgPSBuZXcgX1NldE1hcC5TZXRNYXAoKTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgIHZhciB2aWV3ID0gdGhpcy52aWV3c1tpXTtcbiAgICAgIGlmICh2aWV3ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmlld3NbaV0gPSB2aWV3O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciByYXdWYWx1ZSA9IHZpZXcuYXJnc1t0aGlzLnN1YlByb3BlcnR5XTtcbiAgICAgIGV4aXN0aW5nVmlld3MuYWRkKHJhd1ZhbHVlLCB2aWV3KTtcbiAgICAgIHZpZXdzW2ldID0gdmlldztcbiAgICB9XG4gICAgdmFyIGZpbmFsVmlld3MgPSBbXTtcbiAgICB2YXIgZmluYWxWaWV3U2V0ID0gbmV3IFNldCgpO1xuICAgIHRoaXMuZG93bkRlYmluZC5sZW5ndGggJiYgdGhpcy5kb3duRGViaW5kLmZvckVhY2goZCA9PiBkICYmIGQoKSk7XG4gICAgdGhpcy51cERlYmluZC5sZW5ndGggJiYgdGhpcy51cERlYmluZC5mb3JFYWNoKGQgPT4gZCAmJiBkKCkpO1xuICAgIHRoaXMudXBEZWJpbmQubGVuZ3RoID0gMDtcbiAgICB0aGlzLmRvd25EZWJpbmQubGVuZ3RoID0gMDtcbiAgICB2YXIgbWluS2V5ID0gSW5maW5pdHk7XG4gICAgdmFyIGFudGVNaW5LZXkgPSBJbmZpbml0eTtcbiAgICB2YXIgX2xvb3AyID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICB2YXIgayA9IF9pO1xuICAgICAgaWYgKGlzTmFOKGspKSB7XG4gICAgICAgIGsgPSAnXycgKyBfaTtcbiAgICAgIH0gZWxzZSBpZiAoU3RyaW5nKGspLmxlbmd0aCkge1xuICAgICAgICBrID0gTnVtYmVyKGspO1xuICAgICAgfVxuICAgICAgaWYgKF90aGlzMi5hcmdzLnZhbHVlW19pXSAhPT0gdW5kZWZpbmVkICYmIGV4aXN0aW5nVmlld3MuaGFzKF90aGlzMi5hcmdzLnZhbHVlW19pXSkpIHtcbiAgICAgICAgdmFyIGV4aXN0aW5nVmlldyA9IGV4aXN0aW5nVmlld3MuZ2V0T25lKF90aGlzMi5hcmdzLnZhbHVlW19pXSk7XG4gICAgICAgIGlmIChleGlzdGluZ1ZpZXcpIHtcbiAgICAgICAgICBleGlzdGluZ1ZpZXcuYXJnc1tfdGhpczIua2V5UHJvcGVydHldID0gX2k7XG4gICAgICAgICAgZmluYWxWaWV3c1trXSA9IGV4aXN0aW5nVmlldztcbiAgICAgICAgICBmaW5hbFZpZXdTZXQuYWRkKGV4aXN0aW5nVmlldyk7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIGlmICghaXNOYU4oaykpIHtcbiAgICAgICAgICAgIG1pbktleSA9IE1hdGgubWluKG1pbktleSwgayk7XG4gICAgICAgICAgICBrID4gMCAmJiAoYW50ZU1pbktleSA9IE1hdGgubWluKGFudGVNaW5LZXksIGspKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZXhpc3RpbmdWaWV3cy5yZW1vdmUoX3RoaXMyLmFyZ3MudmFsdWVbX2ldLCBleGlzdGluZ1ZpZXcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgIHZhciB2aWV3QXJncyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIHZhciBfdmlldyA9IGZpbmFsVmlld3Nba10gPSBuZXcgX3RoaXMyLnZpZXdDbGFzcyh2aWV3QXJncywgX3RoaXMyLnBhcmVudCk7XG4gICAgICAgIGlmICghaXNOYU4oaykpIHtcbiAgICAgICAgICBtaW5LZXkgPSBNYXRoLm1pbihtaW5LZXksIGspO1xuICAgICAgICAgIGsgPiAwICYmIChhbnRlTWluS2V5ID0gTWF0aC5taW4oYW50ZU1pbktleSwgaykpO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsVmlld3Nba10udGVtcGxhdGUgPSBfdGhpczIudGVtcGxhdGU7XG4gICAgICAgIGZpbmFsVmlld3Nba10udmlld0xpc3QgPSBfdGhpczI7XG4gICAgICAgIGZpbmFsVmlld3Nba10uYXJnc1tfdGhpczIua2V5UHJvcGVydHldID0gX2k7XG4gICAgICAgIGZpbmFsVmlld3Nba10uYXJnc1tfdGhpczIuc3ViUHJvcGVydHldID0gX3RoaXMyLmFyZ3MudmFsdWVbX2ldO1xuICAgICAgICBfdGhpczIudXBEZWJpbmRba10gPSB2aWV3QXJncy5iaW5kVG8oX3RoaXMyLnN1YlByb3BlcnR5LCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIHZhciBpbmRleCA9IHZpZXdBcmdzW190aGlzMi5rZXlQcm9wZXJ0eV07XG4gICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBfdGhpczIuYXJncy52YWx1ZVtpbmRleF07XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIF90aGlzMi5hcmdzLnZhbHVlW2luZGV4XSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICBfdGhpczIuZG93bkRlYmluZFtrXSA9IF90aGlzMi5zdWJBcmdzLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICBkZWxldGUgdmlld0FyZ3Nba107XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZpZXdBcmdzW2tdID0gdjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciB1cERlYmluZCA9ICgpID0+IHtcbiAgICAgICAgICBfdGhpczIudXBEZWJpbmQuZmlsdGVyKHggPT4geCkuZm9yRWFjaChkID0+IGQoKSk7XG4gICAgICAgICAgX3RoaXMyLnVwRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBkb3duRGViaW5kID0gKCkgPT4ge1xuICAgICAgICAgIF90aGlzMi5kb3duRGViaW5kLmZpbHRlcih4ID0+IHgpLmZvckVhY2goZCA9PiBkKCkpO1xuICAgICAgICAgIF90aGlzMi5kb3duRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgICAgIH07XG4gICAgICAgIF92aWV3Lm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBfdGhpczIuX29uUmVtb3ZlLnJlbW92ZSh1cERlYmluZCk7XG4gICAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5yZW1vdmUoZG93bkRlYmluZCk7XG4gICAgICAgICAgX3RoaXMyLnVwRGViaW5kW2tdICYmIF90aGlzMi51cERlYmluZFtrXSgpO1xuICAgICAgICAgIF90aGlzMi5kb3duRGViaW5kW2tdICYmIF90aGlzMi5kb3duRGViaW5kW2tdKCk7XG4gICAgICAgICAgZGVsZXRlIF90aGlzMi51cERlYmluZFtrXTtcbiAgICAgICAgICBkZWxldGUgX3RoaXMyLmRvd25EZWJpbmRba107XG4gICAgICAgIH0pO1xuICAgICAgICBfdGhpczIuX29uUmVtb3ZlLmFkZCh1cERlYmluZCk7XG4gICAgICAgIF90aGlzMi5fb25SZW1vdmUuYWRkKGRvd25EZWJpbmQpO1xuICAgICAgICB2aWV3QXJnc1tfdGhpczIuc3ViUHJvcGVydHldID0gX3RoaXMyLmFyZ3MudmFsdWVbX2ldO1xuICAgICAgfVxuICAgIH07XG4gICAgZm9yICh2YXIgX2kgaW4gdGhpcy5hcmdzLnZhbHVlKSB7XG4gICAgICBfbG9vcDIoKTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2kyIGluIHZpZXdzKSB7XG4gICAgICBpZiAodmlld3NbX2kyXSAmJiAhZmluYWxWaWV3U2V0Lmhhcyh2aWV3c1tfaTJdKSkge1xuICAgICAgICB2aWV3c1tfaTJdLnJlbW92ZSh0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5hcmdzLnZhbHVlKSkge1xuICAgICAgdmFyIGxvY2FsTWluID0gbWluS2V5ID09PSAwICYmIGZpbmFsVmlld3NbMV0gIT09IHVuZGVmaW5lZCAmJiBmaW5hbFZpZXdzLmxlbmd0aCA+IDEgfHwgYW50ZU1pbktleSA9PT0gSW5maW5pdHkgPyBtaW5LZXkgOiBhbnRlTWluS2V5O1xuICAgICAgdmFyIHJlbmRlclJlY3Vyc2UgPSAoaSA9IDApID0+IHtcbiAgICAgICAgdmFyIGlpID0gZmluYWxWaWV3cy5sZW5ndGggLSBpIC0gMTtcbiAgICAgICAgd2hpbGUgKGlpID4gbG9jYWxNaW4gJiYgZmluYWxWaWV3c1tpaV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlpLS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlpIDwgbG9jYWxNaW4pIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbmFsVmlld3NbaWldID09PSB0aGlzLnZpZXdzW2lpXSkge1xuICAgICAgICAgIGlmIChmaW5hbFZpZXdzW2lpXSAmJiAhZmluYWxWaWV3c1tpaV0uZmlyc3ROb2RlKSB7XG4gICAgICAgICAgICBmaW5hbFZpZXdzW2lpXS5yZW5kZXIodGhpcy50YWcsIGZpbmFsVmlld3NbaWkgKyAxXSwgdGhpcy5wYXJlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGZpbmFsVmlld3NbaWldLnJlbmRlcmVkLnRoZW4oKCkgPT4gcmVuZGVyUmVjdXJzZShOdW1iZXIoaSkgKyAxKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzcGxpdCA9IDUwMDtcbiAgICAgICAgICAgIGlmIChpID09PSAwIHx8IGkgJSBzcGxpdCkge1xuICAgICAgICAgICAgICByZXR1cm4gcmVuZGVyUmVjdXJzZShOdW1iZXIoaSkgKyAxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhY2NlcHQgPT4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGFjY2VwdChyZW5kZXJSZWN1cnNlKE51bWJlcihpKSArIDEpKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmaW5hbFZpZXdzW2lpXS5yZW5kZXIodGhpcy50YWcsIGZpbmFsVmlld3NbaWkgKyAxXSwgdGhpcy5wYXJlbnQpO1xuICAgICAgICB0aGlzLnZpZXdzLnNwbGljZShpaSwgMCwgZmluYWxWaWV3c1tpaV0pO1xuICAgICAgICByZXR1cm4gZmluYWxWaWV3c1tpaV0ucmVuZGVyZWQudGhlbigoKSA9PiByZW5kZXJSZWN1cnNlKGkgKyAxKSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5yZW5kZXJlZCA9IHJlbmRlclJlY3Vyc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHJlbmRlcnMgPSBbXTtcbiAgICAgIHZhciBsZWZ0b3ZlcnMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5jcmVhdGUobnVsbCksIGZpbmFsVmlld3MpO1xuICAgICAgdmFyIGlzSW50ID0geCA9PiBwYXJzZUludCh4KSA9PT0geCAtIDA7XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGZpbmFsVmlld3MpLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgaWYgKGlzSW50KGEpICYmIGlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIE1hdGguc2lnbihhIC0gYik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc0ludChhKSAmJiAhaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzSW50KGEpICYmIGlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0ludChhKSAmJiAhaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgX2xvb3AzID0gZnVuY3Rpb24gKF9pMykge1xuICAgICAgICBkZWxldGUgbGVmdG92ZXJzW19pM107XG4gICAgICAgIGlmIChmaW5hbFZpZXdzW19pM10uZmlyc3ROb2RlICYmIGZpbmFsVmlld3NbX2kzXSA9PT0gX3RoaXMyLnZpZXdzW19pM10pIHtcbiAgICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBmaW5hbFZpZXdzW19pM10ucmVuZGVyKF90aGlzMi50YWcsIG51bGwsIF90aGlzMi5wYXJlbnQpO1xuICAgICAgICByZW5kZXJzLnB1c2goZmluYWxWaWV3c1tfaTNdLnJlbmRlcmVkLnRoZW4oKCkgPT4gZmluYWxWaWV3c1tfaTNdKSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgX2kzIG9mIGtleXMpIHtcbiAgICAgICAgaWYgKF9sb29wMyhfaTMpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pNCBpbiBsZWZ0b3ZlcnMpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuYXJncy52aWV3c1tfaTRdO1xuICAgICAgICBsZWZ0b3ZlcnMucmVtb3ZlKHRydWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5yZW5kZXJlZCA9IFByb21pc2UuYWxsKHJlbmRlcnMpO1xuICAgIH1cbiAgICBmb3IgKHZhciBfaTUgaW4gZmluYWxWaWV3cykge1xuICAgICAgaWYgKGlzTmFOKF9pNSkpIHtcbiAgICAgICAgZmluYWxWaWV3c1tfaTVdLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBfaTUuc3Vic3RyKDEpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZpbmFsVmlld3NbX2k1XS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gX2k1O1xuICAgIH1cbiAgICB0aGlzLnZpZXdzID0gQXJyYXkuaXNBcnJheSh0aGlzLmFyZ3MudmFsdWUpID8gWy4uLmZpbmFsVmlld3NdIDogZmluYWxWaWV3cztcbiAgICB0aGlzLnZpZXdDb3VudCA9IGZpbmFsVmlld3MubGVuZ3RoO1xuICAgIGZpbmFsVmlld1NldC5jbGVhcigpO1xuICAgIHRoaXMud2lsbFJlUmVuZGVyID0gZmFsc2U7XG4gICAgdGhpcy5yZW5kZXJlZC50aGVuKCgpID0+IHtcbiAgICAgIHRoaXMucGFyZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsaXN0UmVuZGVyZWQnLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAga2V5OiB0aGlzLnN1YlByb3BlcnR5LFxuICAgICAgICAgICAgdmFsdWU6IHRoaXMuYXJncy52YWx1ZSxcbiAgICAgICAgICAgIHRhZzogdGhpcy50YWdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICAgIHRoaXMudGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsaXN0UmVuZGVyZWQnLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAga2V5OiB0aGlzLnN1YlByb3BlcnR5LFxuICAgICAgICAgICAgdmFsdWU6IHRoaXMuYXJncy52YWx1ZSxcbiAgICAgICAgICAgIHRhZzogdGhpcy50YWdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJlZDtcbiAgfVxuICBwYXVzZShwYXVzZSA9IHRydWUpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgIHRoaXMudmlld3NbaV0ucGF1c2UocGF1c2UpO1xuICAgIH1cbiAgfVxuICBvblJlbW92ZShjYWxsYmFjaykge1xuICAgIHRoaXMuX29uUmVtb3ZlLmFkZChjYWxsYmFjayk7XG4gIH1cbiAgcmVtb3ZlKCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgdGhpcy52aWV3c1tpXSAmJiB0aGlzLnZpZXdzW2ldLnJlbW92ZSh0cnVlKTtcbiAgICB9XG4gICAgdmFyIG9uUmVtb3ZlID0gdGhpcy5fb25SZW1vdmUuaXRlbXMoKTtcbiAgICBmb3IgKHZhciBfaTYgaW4gb25SZW1vdmUpIHtcbiAgICAgIHRoaXMuX29uUmVtb3ZlLnJlbW92ZShvblJlbW92ZVtfaTZdKTtcbiAgICAgIG9uUmVtb3ZlW19pNl0oKTtcbiAgICB9XG4gICAgdmFyIGNsZWFudXA7XG4gICAgd2hpbGUgKHRoaXMuY2xlYW51cC5sZW5ndGgpIHtcbiAgICAgIGNsZWFudXAgPSB0aGlzLmNsZWFudXAucG9wKCk7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfVxuICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICB3aGlsZSAodGhpcy50YWcgJiYgdGhpcy50YWcuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy50YWcucmVtb3ZlQ2hpbGQodGhpcy50YWcuZmlyc3RDaGlsZCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN1YkFyZ3MpIHtcbiAgICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMuc3ViQXJncyk7XG4gICAgfVxuICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMuYXJncyk7XG5cbiAgICAvLyBpZih0aGlzLmFyZ3MudmFsdWUgJiYgIXRoaXMuYXJncy52YWx1ZS5pc0JvdW5kKCkpXG4gICAgLy8ge1xuICAgIC8vIFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzLmFyZ3MudmFsdWUpO1xuICAgIC8vIH1cblxuICAgIHRoaXMucmVtb3ZlZCA9IHRydWU7XG4gIH1cbn1cbmV4cG9ydHMuVmlld0xpc3QgPSBWaWV3TGlzdDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9pbnB1dC9LZXlib2FyZC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuS2V5Ym9hcmQgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4uL2Jhc2UvQmluZGFibGVcIik7XG5jbGFzcyBLZXlib2FyZCB7XG4gIHN0YXRpYyBnZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlIHx8IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKG5ldyB0aGlzKCkpO1xuICB9XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubWF4RGVjYXkgPSAxMjA7XG4gICAgdGhpcy5jb21ib1RpbWUgPSA1MDA7XG4gICAgdGhpcy5saXN0ZW5pbmcgPSBmYWxzZTtcbiAgICB0aGlzLmZvY3VzRWxlbWVudCA9IGRvY3VtZW50LmJvZHk7XG4gICAgdGhpc1tfQmluZGFibGUuQmluZGFibGUuTm9HZXR0ZXJzXSA9IHRydWU7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjb21ibycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZShbXSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3doaWNocycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2NvZGVzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAna2V5cycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZXNzZWRXaGljaCcsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZXNzZWRDb2RlJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlc3NlZEtleScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbGVhc2VkV2hpY2gnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZWxlYXNlZENvZGUnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZWxlYXNlZEtleScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2tleVJlZnMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBldmVudCA9PiB7XG4gICAgICBpZiAoIXRoaXMubGlzdGVuaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghKHRoaXMua2V5c1tldmVudC5rZXldID4gMCkgJiYgdGhpcy5mb2N1c0VsZW1lbnQgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAhPT0gdGhpcy5mb2N1c0VsZW1lbnQgJiYgKCF0aGlzLmZvY3VzRWxlbWVudC5jb250YWlucyhkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB8fCBkb2N1bWVudC5hY3RpdmVFbGVtZW50Lm1hdGNoZXMoJ2lucHV0LHRleHRhcmVhJykpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnJlbGVhc2VkV2hpY2hbZXZlbnQud2hpY2hdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucmVsZWFzZWRDb2RlW2V2ZW50LmNvZGVdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucmVsZWFzZWRLZXlbZXZlbnQua2V5XSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLndoaWNoc1tldmVudC53aGljaF0gPSAtMTtcbiAgICAgIHRoaXMuY29kZXNbZXZlbnQuY29kZV0gPSAtMTtcbiAgICAgIHRoaXMua2V5c1tldmVudC5rZXldID0gLTE7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGV2ZW50ID0+IHtcbiAgICAgIGlmICghdGhpcy5saXN0ZW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZm9jdXNFbGVtZW50ICYmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgIT09IHRoaXMuZm9jdXNFbGVtZW50ICYmICghdGhpcy5mb2N1c0VsZW1lbnQuY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkgfHwgZG9jdW1lbnQuYWN0aXZlRWxlbWVudC5tYXRjaGVzKCdpbnB1dCx0ZXh0YXJlYScpKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGV2ZW50LnJlcGVhdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLmNvbWJvLnB1c2goZXZlbnQuY29kZSk7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jb21ib1RpbWVyKTtcbiAgICAgIHRoaXMuY29tYm9UaW1lciA9IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5jb21iby5zcGxpY2UoMCksIHRoaXMuY29tYm9UaW1lKTtcbiAgICAgIHRoaXMucHJlc3NlZFdoaWNoW2V2ZW50LndoaWNoXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnByZXNzZWRDb2RlW2V2ZW50LmNvZGVdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucHJlc3NlZEtleVtldmVudC5rZXldID0gRGF0ZS5ub3coKTtcbiAgICAgIGlmICh0aGlzLmtleXNbZXZlbnQua2V5XSA+IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy53aGljaHNbZXZlbnQud2hpY2hdID0gMTtcbiAgICAgIHRoaXMuY29kZXNbZXZlbnQuY29kZV0gPSAxO1xuICAgICAgdGhpcy5rZXlzW2V2ZW50LmtleV0gPSAxO1xuICAgIH0pO1xuICAgIHZhciB3aW5kb3dCbHVyID0gZXZlbnQgPT4ge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLmtleXMpIHtcbiAgICAgICAgaWYgKHRoaXMua2V5c1tpXSA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbGVhc2VkS2V5W2ldID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdGhpcy5rZXlzW2ldID0gLTE7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaSBpbiB0aGlzLmNvZGVzKSB7XG4gICAgICAgIGlmICh0aGlzLmNvZGVzW19pXSA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbGVhc2VkQ29kZVtfaV0gPSBEYXRlLm5vdygpO1xuICAgICAgICB0aGlzLmNvZGVzW19pXSA9IC0xO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2kyIGluIHRoaXMud2hpY2hzKSB7XG4gICAgICAgIGlmICh0aGlzLndoaWNoc1tfaTJdIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVsZWFzZWRXaGljaFtfaTJdID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdGhpcy53aGljaHNbX2kyXSA9IC0xO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCB3aW5kb3dCbHVyKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsICgpID0+IHtcbiAgICAgIGlmIChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPT09ICd2aXNpYmxlJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB3aW5kb3dCbHVyKCk7XG4gICAgfSk7XG4gIH1cbiAgZ2V0S2V5UmVmKGtleUNvZGUpIHtcbiAgICB2YXIga2V5UmVmID0gdGhpcy5rZXlSZWZzW2tleUNvZGVdID0gdGhpcy5rZXlSZWZzW2tleUNvZGVdIHx8IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KTtcbiAgICByZXR1cm4ga2V5UmVmO1xuICB9XG4gIGdldEtleVRpbWUoa2V5KSB7XG4gICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZEtleVtrZXldO1xuICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkS2V5W2tleV07XG4gICAgaWYgKCFwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gcHJlc3NlZDtcbiAgICB9XG4gICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gIH1cbiAgZ2V0Q29kZVRpbWUoY29kZSkge1xuICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRDb2RlW2NvZGVdO1xuICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkQ29kZVtjb2RlXTtcbiAgICBpZiAoIXByZXNzZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBwcmVzc2VkO1xuICAgIH1cbiAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgfVxuICBnZXRXaGljaFRpbWUoY29kZSkge1xuICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRXaGljaFtjb2RlXTtcbiAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZFdoaWNoW2NvZGVdO1xuICAgIGlmICghcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHByZXNzZWQ7XG4gICAgfVxuICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICB9XG4gIGdldEtleShrZXkpIHtcbiAgICBpZiAoIXRoaXMua2V5c1trZXldKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMua2V5c1trZXldO1xuICB9XG4gIGdldEtleUNvZGUoY29kZSkge1xuICAgIGlmICghdGhpcy5jb2Rlc1tjb2RlXSkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvZGVzW2NvZGVdO1xuICB9XG4gIHJlc2V0KCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5rZXlzKSB7XG4gICAgICBkZWxldGUgdGhpcy5rZXlzW2ldO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMuY29kZXMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmNvZGVzW2ldO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMud2hpY2hzKSB7XG4gICAgICBkZWxldGUgdGhpcy53aGljaHNbaV07XG4gICAgfVxuICB9XG4gIHVwZGF0ZSgpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMua2V5cykge1xuICAgICAgaWYgKHRoaXMua2V5c1tpXSA+IDApIHtcbiAgICAgICAgdGhpcy5rZXlzW2ldKys7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMua2V5c1tpXSA+IC10aGlzLm1heERlY2F5KSB7XG4gICAgICAgIHRoaXMua2V5c1tpXS0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMua2V5c1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmNvZGVzKSB7XG4gICAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkQ29kZVtpXTtcbiAgICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkQ29kZVtpXTtcbiAgICAgIHZhciBrZXlSZWYgPSB0aGlzLmdldEtleVJlZihpKTtcbiAgICAgIGlmICh0aGlzLmNvZGVzW2ldID4gMCkge1xuICAgICAgICBrZXlSZWYuZnJhbWVzID0gdGhpcy5jb2Rlc1tpXSsrO1xuICAgICAgICBrZXlSZWYudGltZSA9IHByZXNzZWQgPyBEYXRlLm5vdygpIC0gcHJlc3NlZCA6IDA7XG4gICAgICAgIGtleVJlZi5kb3duID0gdHJ1ZTtcbiAgICAgICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuY29kZXNbaV0gPiAtdGhpcy5tYXhEZWNheSkge1xuICAgICAgICBrZXlSZWYuZnJhbWVzID0gdGhpcy5jb2Rlc1tpXS0tO1xuICAgICAgICBrZXlSZWYudGltZSA9IHJlbGVhc2VkIC0gRGF0ZS5ub3coKTtcbiAgICAgICAga2V5UmVmLmRvd24gPSBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGtleVJlZi5mcmFtZXMgPSAwO1xuICAgICAgICBrZXlSZWYudGltZSA9IDA7XG4gICAgICAgIGtleVJlZi5kb3duID0gZmFsc2U7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvZGVzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMud2hpY2hzKSB7XG4gICAgICBpZiAodGhpcy53aGljaHNbaV0gPiAwKSB7XG4gICAgICAgIHRoaXMud2hpY2hzW2ldKys7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMud2hpY2hzW2ldID4gLXRoaXMubWF4RGVjYXkpIHtcbiAgICAgICAgdGhpcy53aGljaHNbaV0tLTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndoaWNoc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbmV4cG9ydHMuS2V5Ym9hcmQgPSBLZXlib2FyZDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5FdmVudFRhcmdldE1peGluID0gdm9pZCAwO1xudmFyIF9NaXhpbiA9IHJlcXVpcmUoXCIuLi9iYXNlL01peGluXCIpO1xudmFyIEV2ZW50VGFyZ2V0UGFyZW50ID0gU3ltYm9sKCdFdmVudFRhcmdldFBhcmVudCcpO1xudmFyIENhbGxIYW5kbGVyID0gU3ltYm9sKCdDYWxsSGFuZGxlcicpO1xudmFyIENhcHR1cmUgPSBTeW1ib2woJ0NhcHR1cmUnKTtcbnZhciBCdWJibGUgPSBTeW1ib2woJ0J1YmJsZScpO1xudmFyIFRhcmdldCA9IFN5bWJvbCgnVGFyZ2V0Jyk7XG52YXIgSGFuZGxlcnNCdWJibGUgPSBTeW1ib2woJ0hhbmRsZXJzQnViYmxlJyk7XG52YXIgSGFuZGxlcnNDYXB0dXJlID0gU3ltYm9sKCdIYW5kbGVyc0NhcHR1cmUnKTtcbnZhciBFdmVudFRhcmdldE1peGluID0gZXhwb3J0cy5FdmVudFRhcmdldE1peGluID0ge1xuICBbX01peGluLk1peGluLkNvbnN0cnVjdG9yXSgpIHtcbiAgICB0aGlzW0hhbmRsZXJzQ2FwdHVyZV0gPSBuZXcgTWFwKCk7XG4gICAgdGhpc1tIYW5kbGVyc0J1YmJsZV0gPSBuZXcgTWFwKCk7XG4gIH0sXG4gIGRpc3BhdGNoRXZlbnQoLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgaWYgKHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KGV2ZW50KTtcbiAgICAgIGFyZ3NbMF0gPSBldmVudDtcbiAgICB9XG4gICAgZXZlbnQuY3ZQYXRoID0gZXZlbnQuY3ZQYXRoIHx8IFtdO1xuICAgIGV2ZW50LmN2VGFyZ2V0ID0gZXZlbnQuY3ZDdXJyZW50VGFyZ2V0ID0gdGhpcztcbiAgICB2YXIgcmVzdWx0ID0gdGhpc1tDYXB0dXJlXSguLi5hcmdzKTtcbiAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICB2YXIgaGFuZGxlcnMgPSBbXTtcbiAgICBpZiAodGhpc1tIYW5kbGVyc0NhcHR1cmVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgdmFyIGhhbmRsZXJNYXAgPSB0aGlzW0hhbmRsZXJzQ2FwdHVyZV0uZ2V0KGV2ZW50LnR5cGUpO1xuICAgICAgdmFyIG5ld0hhbmRsZXJzID0gWy4uLmhhbmRsZXJNYXBdO1xuICAgICAgbmV3SGFuZGxlcnMuZm9yRWFjaChoID0+IGgucHVzaChoYW5kbGVyTWFwKSk7XG4gICAgICBoYW5kbGVycy5wdXNoKC4uLm5ld0hhbmRsZXJzKTtcbiAgICB9XG4gICAgaWYgKHRoaXNbSGFuZGxlcnNCdWJibGVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgdmFyIF9oYW5kbGVyTWFwID0gdGhpc1tIYW5kbGVyc0J1YmJsZV0uZ2V0KGV2ZW50LnR5cGUpO1xuICAgICAgdmFyIF9uZXdIYW5kbGVycyA9IFsuLi5faGFuZGxlck1hcF07XG4gICAgICBfbmV3SGFuZGxlcnMuZm9yRWFjaChoID0+IGgucHVzaChfaGFuZGxlck1hcCkpO1xuICAgICAgaGFuZGxlcnMucHVzaCguLi5fbmV3SGFuZGxlcnMpO1xuICAgIH1cbiAgICBoYW5kbGVycy5wdXNoKFsoKSA9PiB0aGlzW0NhbGxIYW5kbGVyXSguLi5hcmdzKSwge30sIG51bGxdKTtcbiAgICBmb3IgKHZhciBbaGFuZGxlciwgb3B0aW9ucywgbWFwXSBvZiBoYW5kbGVycykge1xuICAgICAgaWYgKG9wdGlvbnMub25jZSkge1xuICAgICAgICBtYXAuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gaGFuZGxlcihldmVudCk7XG4gICAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiByZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWV2ZW50LmNhbmNlbGFibGUgfHwgIWV2ZW50LmNhbmNlbEJ1YmJsZSAmJiByZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICB0aGlzW0J1YmJsZV0oLi4uYXJncyk7XG4gICAgfVxuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF0pIHtcbiAgICAgIE9iamVjdC5mcmVlemUoZXZlbnQuY3ZQYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIGV2ZW50LnJldHVyblZhbHVlO1xuICB9LFxuICBhZGRFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgdXNlQ2FwdHVyZTogdHJ1ZVxuICAgICAgfTtcbiAgICB9XG4gICAgdmFyIGhhbmRsZXJzID0gSGFuZGxlcnNCdWJibGU7XG4gICAgaWYgKG9wdGlvbnMudXNlQ2FwdHVyZSkge1xuICAgICAgaGFuZGxlcnMgPSBIYW5kbGVyc0NhcHR1cmU7XG4gICAgfVxuICAgIGlmICghdGhpc1toYW5kbGVyc10uaGFzKHR5cGUpKSB7XG4gICAgICB0aGlzW2hhbmRsZXJzXS5zZXQodHlwZSwgbmV3IE1hcCgpKTtcbiAgICB9XG4gICAgdGhpc1toYW5kbGVyc10uZ2V0KHR5cGUpLnNldChjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgaWYgKG9wdGlvbnMuc2lnbmFsKSB7XG4gICAgICBvcHRpb25zLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIGV2ZW50ID0+IHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgb3B0aW9ucyksIHtcbiAgICAgICAgb25jZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICByZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgdXNlQ2FwdHVyZTogdHJ1ZVxuICAgICAgfTtcbiAgICB9XG4gICAgdmFyIGhhbmRsZXJzID0gSGFuZGxlcnNCdWJibGU7XG4gICAgaWYgKG9wdGlvbnMudXNlQ2FwdHVyZSkge1xuICAgICAgaGFuZGxlcnMgPSBIYW5kbGVyc0NhcHR1cmU7XG4gICAgfVxuICAgIGlmICghdGhpc1toYW5kbGVyc10uaGFzKHR5cGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXNbaGFuZGxlcnNdLmdldCh0eXBlKS5kZWxldGUoY2FsbGJhY2spO1xuICB9LFxuICBbQ2FwdHVyZV0oLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgZXZlbnQuY3ZQYXRoLnB1c2godGhpcyk7XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQ2FwdHVyZV0oLi4uYXJncyk7XG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQ2FwdHVyZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGV2ZW50LmN2Q3VycmVudFRhcmdldCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdO1xuICAgIHZhciB7XG4gICAgICB0eXBlXG4gICAgfSA9IGV2ZW50O1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQ2FwdHVyZV0uZ2V0KHR5cGUpO1xuICAgIGZvciAodmFyIFtoYW5kbGVyLCBvcHRpb25zXSBvZiBoYW5kbGVycykge1xuICAgICAgaWYgKG9wdGlvbnMub25jZSkge1xuICAgICAgICBoYW5kbGVycy5kZWxldGUoaGFuZGxlcik7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG4gIFtCdWJibGVdKC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGlmICghZXZlbnQuYnViYmxlcyB8fCAhdGhpc1tFdmVudFRhcmdldFBhcmVudF0gfHwgZXZlbnQuY2FuY2VsQnViYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNCdWJibGVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgcmV0dXJuIHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0J1YmJsZV0oLi4uYXJncyk7XG4gICAgfVxuICAgIHZhciByZXN1bHQ7XG4gICAgZXZlbnQuY3ZDdXJyZW50VGFyZ2V0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF07XG4gICAgdmFyIHtcbiAgICAgIHR5cGVcbiAgICB9ID0gZXZlbnQ7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNCdWJibGVdLmdldChldmVudC50eXBlKTtcbiAgICBmb3IgKHZhciBbaGFuZGxlciwgb3B0aW9uc10gb2YgaGFuZGxlcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgaGFuZGxlcnMuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gaGFuZGxlcihldmVudCk7XG4gICAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiByZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJlc3VsdCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0NhbGxIYW5kbGVyXSguLi5hcmdzKTtcbiAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQnViYmxlXSguLi5hcmdzKTtcbiAgfSxcbiAgW0NhbGxIYW5kbGVyXSguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZGVmYXVsdEhhbmRsZXIgPSBgb24ke2V2ZW50LnR5cGVbMF0udG9VcHBlckNhc2UoKSArIGV2ZW50LnR5cGUuc2xpY2UoMSl9YDtcbiAgICBpZiAodHlwZW9mIHRoaXNbZGVmYXVsdEhhbmRsZXJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpc1tkZWZhdWx0SGFuZGxlcl0oZXZlbnQpO1xuICAgIH1cbiAgfVxufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFdmVudFRhcmdldE1peGluLCAnUGFyZW50Jywge1xuICB2YWx1ZTogRXZlbnRUYXJnZXRQYXJlbnRcbn0pO1xuICB9KSgpO1xufSk7IiwiZXhwb3J0IGNsYXNzIENvbmZpZyB7fTtcblxuQ29uZmlnLnRpdGxlID0gJ3dnbDJkJztcbi8vIENvbmZpZy4iLCJleHBvcnQgY2xhc3MgR2wyZFxue1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50KVxuXHR7XG5cdFx0dGhpcy5lbGVtZW50ICAgPSBlbGVtZW50IHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuY29udGV4dCAgID0gdGhpcy5lbGVtZW50LmdldENvbnRleHQoJ3dlYmdsJyk7XG5cdFx0dGhpcy5zY3JlZW5TY2FsZSA9IDE7XG5cdFx0dGhpcy56b29tTGV2ZWwgPSAxO1xuXHR9XG5cblx0Y2xlYW51cCgpXG5cdHtcblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXHR9XG5cblx0Y3JlYXRlU2hhZGVyKGxvY2F0aW9uKVxuXHR7XG5cdFx0Y29uc3QgZXh0ZW5zaW9uID0gbG9jYXRpb24uc3Vic3RyaW5nKGxvY2F0aW9uLmxhc3RJbmRleE9mKCcuJykrMSk7XG5cdFx0bGV0ICAgdHlwZSA9IG51bGw7XG5cblx0XHRzd2l0Y2goZXh0ZW5zaW9uLnRvVXBwZXJDYXNlKCkpXG5cdFx0e1xuXHRcdFx0Y2FzZSAnVkVSVCc6XG5cdFx0XHRcdHR5cGUgPSB0aGlzLmNvbnRleHQuVkVSVEVYX1NIQURFUjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdGUkFHJzpcblx0XHRcdFx0dHlwZSA9IHRoaXMuY29udGV4dC5GUkFHTUVOVF9TSEFERVI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNoYWRlciA9IHRoaXMuY29udGV4dC5jcmVhdGVTaGFkZXIodHlwZSk7XG5cdFx0Y29uc3Qgc291cmNlID0gcmVxdWlyZShsb2NhdGlvbik7XG5cblx0XHR0aGlzLmNvbnRleHQuc2hhZGVyU291cmNlKHNoYWRlciwgc291cmNlKTtcblx0XHR0aGlzLmNvbnRleHQuY29tcGlsZVNoYWRlcihzaGFkZXIpO1xuXG5cdFx0Y29uc3Qgc3VjY2VzcyA9IHRoaXMuY29udGV4dC5nZXRTaGFkZXJQYXJhbWV0ZXIoXG5cdFx0XHRzaGFkZXJcblx0XHRcdCwgdGhpcy5jb250ZXh0LkNPTVBJTEVfU1RBVFVTXG5cdFx0KTtcblxuXHRcdGlmKHN1Y2Nlc3MpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHNoYWRlcjtcblx0XHR9XG5cblx0XHRjb25zb2xlLmVycm9yKHRoaXMuY29udGV4dC5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcikpO1xuXG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVNoYWRlcihzaGFkZXIpO1xuXHR9XG5cblx0Y3JlYXRlUHJvZ3JhbSh2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyKVxuXHR7XG5cdFx0Y29uc3QgcHJvZ3JhbSA9IHRoaXMuY29udGV4dC5jcmVhdGVQcm9ncmFtKCk7XG5cblx0XHR0aGlzLmNvbnRleHQuYXR0YWNoU2hhZGVyKHByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmF0dGFjaFNoYWRlcihwcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XG5cblx0XHR0aGlzLmNvbnRleHQubGlua1Byb2dyYW0ocHJvZ3JhbSk7XG5cblx0XHR0aGlzLmNvbnRleHQuZGV0YWNoU2hhZGVyKHByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmRldGFjaFNoYWRlcihwcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVNoYWRlcih2ZXJ0ZXhTaGFkZXIpO1xuXHRcdHRoaXMuY29udGV4dC5kZWxldGVTaGFkZXIoZnJhZ21lbnRTaGFkZXIpO1xuXG5cdFx0aWYodGhpcy5jb250ZXh0LmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgdGhpcy5jb250ZXh0LkxJTktfU1RBVFVTKSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gcHJvZ3JhbTtcblx0XHR9XG5cblx0XHRjb25zb2xlLmVycm9yKHRoaXMuY29udGV4dC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG5cblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlUHJvZ3JhbShwcm9ncmFtKTtcblxuXHRcdHJldHVybiBwcm9ncmFtO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBWaWV3IGFzIEJhc2VWaWV3IH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvVmlldyc7XG5pbXBvcnQgeyBLZXlib2FyZCB9IGZyb20gJ2N1cnZhdHVyZS9pbnB1dC9LZXlib2FyZCdcbmltcG9ydCB7IEJhZyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JhZyc7XG5cbmltcG9ydCB7IENvbmZpZyB9IGZyb20gJ0NvbmZpZyc7XG5cbmltcG9ydCB7IE1hcCBhcyBXb3JsZE1hcCB9IGZyb20gJy4uL3dvcmxkL01hcCc7XG5cbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZVNoZWV0JztcbmltcG9ydCB7IFNwcml0ZUJvYXJkIH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZUJvYXJkJztcblxuaW1wb3J0IHsgQ29udHJvbGxlciBhcyBPblNjcmVlbkpveVBhZCB9IGZyb20gJy4uL3VpL0NvbnRyb2xsZXInO1xuaW1wb3J0IHsgTWFwRWRpdG9yICAgfSBmcm9tICcuLi91aS9NYXBFZGl0b3InO1xuXG5pbXBvcnQgeyBFbnRpdHkgfSBmcm9tICcuLi9tb2RlbC9FbnRpdHknO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi4vc3ByaXRlL0NhbWVyYSc7XG5cbmltcG9ydCB7IENvbnRyb2xsZXIgfSBmcm9tICcuLi9tb2RlbC9Db250cm9sbGVyJztcbmltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGUnO1xuXG5jb25zdCBBcHBsaWNhdGlvbiA9IHt9O1xuXG5BcHBsaWNhdGlvbi5vblNjcmVlbkpveVBhZCA9IG5ldyBPblNjcmVlbkpveVBhZDtcbkFwcGxpY2F0aW9uLmtleWJvYXJkID0gS2V5Ym9hcmQuZ2V0KCk7XG5cblxuZXhwb3J0IGNsYXNzIFZpZXcgZXh0ZW5kcyBCYXNlVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0d2luZG93LnNtUHJvZmlsaW5nID0gdHJ1ZTtcblx0XHRzdXBlcihhcmdzKTtcblx0XHR0aGlzLnRlbXBsYXRlICA9IHJlcXVpcmUoJy4vdmlldy50bXAnKTtcblx0XHR0aGlzLnJvdXRlcyAgICA9IFtdO1xuXG5cdFx0dGhpcy5lbnRpdGllcyAgPSBuZXcgQmFnO1xuXHRcdHRoaXMua2V5Ym9hcmQgID0gQXBwbGljYXRpb24ua2V5Ym9hcmQ7XG5cdFx0dGhpcy5zcGVlZCAgICAgPSAyNDtcblx0XHR0aGlzLm1heFNwZWVkICA9IHRoaXMuc3BlZWQ7XG5cblx0XHR0aGlzLmFyZ3MuY29udHJvbGxlciA9IEFwcGxpY2F0aW9uLm9uU2NyZWVuSm95UGFkO1xuXG5cdFx0dGhpcy5hcmdzLmZwcyAgPSAwO1xuXHRcdHRoaXMuYXJncy5zcHMgID0gMDtcblxuXHRcdHRoaXMuYXJncy5jYW1YID0gMDtcblx0XHR0aGlzLmFyZ3MuY2FtWSA9IDA7XG5cblx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrICAgICAgPSA2MDtcblx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPSA2MDtcblxuXHRcdHRoaXMuYXJncy5zaG93RWRpdG9yID0gZmFsc2U7XG5cblx0XHR0aGlzLmtleWJvYXJkLmxpc3RlbmluZyA9IHRydWU7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdlJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5tYXAuZXhwb3J0KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdFc2NhcGUnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPT09IC0xKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnVuc2VsZWN0KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdIb21lJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLmZyYW1lTG9jaysrO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnRW5kJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLmZyYW1lTG9jay0tO1xuXG5cdFx0XHRcdGlmKHRoaXMuYXJncy5mcmFtZUxvY2sgPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hcmdzLmZyYW1lTG9jayA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ1BhZ2VVcCcsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jaysrO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnUGFnZURvd24nLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2stLTtcblxuXHRcdFx0XHRpZih0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IG5ldyBTcHJpdGVTaGVldDtcblx0XHR0aGlzLm1hcCAgICAgICAgID0gbmV3IFdvcmxkTWFwO1xuXG5cdFx0dGhpcy5tYXAuaW1wb3J0KCk7XG5cblx0XHR0aGlzLmFyZ3MubWFwRWRpdG9yICA9IG5ldyBNYXBFZGl0b3Ioe1xuXHRcdFx0c3ByaXRlU2hlZXQ6IHRoaXMuc3ByaXRlU2hlZXRcblx0XHRcdCwgbWFwOiAgICAgICB0aGlzLm1hcFxuXHRcdH0pO1xuXHR9XG5cblx0b25SZW5kZXJlZCgpXG5cdHtcblx0XHRjb25zdCBzcHJpdGVCb2FyZCA9IG5ldyBTcHJpdGVCb2FyZChcblx0XHRcdHRoaXMudGFncy5jYW52YXMuZWxlbWVudFxuXHRcdFx0LCB0aGlzLm1hcFxuXHRcdCk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cblx0XHRjb25zdCBlbnRpdHkgPSBuZXcgRW50aXR5KHtcblx0XHRcdHNwcml0ZTogbmV3IFNwcml0ZSh7XG5cdFx0XHRcdHNyYzogdW5kZWZpbmVkLFxuXHRcdFx0XHRzcHJpdGVCb2FyZDogc3ByaXRlQm9hcmQsXG5cdFx0XHRcdHNwcml0ZVNoZWV0OiB0aGlzLnNwcml0ZVNoZWV0LFxuXHRcdFx0fSksXG5cdFx0XHRjb250cm9sbGVyOiBuZXcgQ29udHJvbGxlcih7XG5cdFx0XHRcdGtleWJvYXJkOiB0aGlzLmtleWJvYXJkLFxuXHRcdFx0XHRvblNjcmVlbkpveVBhZDogdGhpcy5hcmdzLmNvbnRyb2xsZXIsXG5cdFx0XHR9KSxcblx0XHRcdGNhbWVyYTogQ2FtZXJhLFxuXHRcdH0pO1xuXHRcdHRoaXMuZW50aXRpZXMuYWRkKGVudGl0eSk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5zcHJpdGVzLmFkZChlbnRpdHkuc3ByaXRlKTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJz0nLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnpvb20oMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCcrJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy56b29tKDEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnLScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuem9vbSgtMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmFyZ3MubWFwRWRpdG9yLmFyZ3MuYmluZFRvKCdzZWxlY3RlZEdyYXBoaWMnLCAodik9Pntcblx0XHRcdGlmKCF2IHx8IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWCA9PSBudWxsKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy5zaG93RWRpdG9yID0gZmFsc2U7XG5cblx0XHRcdGxldCBpICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuc3RhcnRHbG9iYWxYO1xuXHRcdFx0bGV0IGlpID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxYO1xuXG5cdFx0XHRpZihpaSA8IGkpXG5cdFx0XHR7XG5cdFx0XHRcdFtpaSwgaV0gPSBbaSwgaWldO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IoOyBpPD0gaWk7IGkrKylcblx0XHRcdHtcblx0XHRcdFx0bGV0IGogID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5zdGFydEdsb2JhbFk7XG5cdFx0XHRcdGxldCBqaiA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWTtcblx0XHRcdFx0aWYoamogPCBqKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0W2pqLCBqXSA9IFtqLCBqal07XG5cdFx0XHRcdH1cblx0XHRcdFx0Zm9yKDsgaiA8PSBqajsgaisrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5tYXAuc2V0VGlsZShpLCBqLCB2KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLm1hcC5zZXRUaWxlKFxuXHRcdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFhcblx0XHRcdFx0LCB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFlcblx0XHRcdFx0LCB2XG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC51bnNlbGVjdCgpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5iaW5kVG8oKHYsayx0LGQscCk9Pntcblx0XHRcdGlmKHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQubG9jYWxYID09IG51bGwpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5zaG93RWRpdG9yID0gZmFsc2U7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFyZ3MubWFwRWRpdG9yLnNlbGVjdCh0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkKTtcblxuXHRcdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSB0cnVlO1xuXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHRcdH0se3dhaXQ6MH0pO1xuXG5cdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSB0cnVlO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsICgpID0+IHtcblx0XHRcdHRoaXMucmVzaXplKCk7XG5cdFx0XHQvLyB1cGRhdGUoKTtcblx0XHR9KTtcblxuXHRcdGxldCBmVGhlbiA9IDA7XG5cdFx0bGV0IHNUaGVuID0gMDtcblxuXHRcdGxldCBmU2FtcGxlcyA9IFtdO1xuXHRcdGxldCBzU2FtcGxlcyA9IFtdO1xuXG5cdFx0bGV0IG1heFNhbXBsZXMgPSA1O1xuXG5cdFx0Y29uc3Qgc2ltdWxhdGUgPSAobm93KSA9PiB7XG5cdFx0XHRub3cgPSBub3cgLyAxMDAwO1xuXG5cdFx0XHRjb25zdCBkZWx0YSA9IG5vdyAtIHNUaGVuO1xuXG5cdFx0XHRpZih0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPT0gMClcblx0XHRcdHtcblx0XHRcdFx0c1NhbXBsZXMgPSBbMF07XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYoZGVsdGEgPCAxLyh0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2srKDEwICogKHRoaXMuYXJncy5zaW11bGF0aW9uTG9jay82MCkpKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzVGhlbiA9IG5vdztcblxuXHRcdFx0dGhpcy5rZXlib2FyZC51cGRhdGUoKTtcblxuXHRcdFx0T2JqZWN0LnZhbHVlcyh0aGlzLmVudGl0aWVzLml0ZW1zKCkpLm1hcCgoZSk9Pntcblx0XHRcdFx0ZS5zaW11bGF0ZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIHRoaXMuc3ByaXRlQm9hcmQuc2ltdWxhdGUoKTtcblxuXHRcdFx0Ly8gdGhpcy5hcmdzLmxvY2FsWCAgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmxvY2FsWDtcblx0XHRcdC8vIHRoaXMuYXJncy5sb2NhbFkgID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFk7XG5cdFx0XHQvLyB0aGlzLmFyZ3MuZ2xvYmFsWCA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWDtcblx0XHRcdC8vIHRoaXMuYXJncy5nbG9iYWxZID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxZO1xuXG5cdFx0XHR0aGlzLmFyZ3MuX3NwcyA9ICgxIC8gZGVsdGEpO1xuXG5cdFx0XHRzU2FtcGxlcy5wdXNoKHRoaXMuYXJncy5fc3BzKTtcblxuXHRcdFx0d2hpbGUoc1NhbXBsZXMubGVuZ3RoID4gbWF4U2FtcGxlcylcblx0XHRcdHtcblx0XHRcdFx0c1NhbXBsZXMuc2hpZnQoKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gdGhpcy5zcHJpdGVCb2FyZC5tb3ZlQ2FtZXJhKHNwcml0ZS54LCBzcHJpdGUueSk7XG5cdFx0fTtcblxuXHRcdGNvbnN0IHVwZGF0ZSA9IChub3cpID0+e1xuXHRcdFx0bm93ID0gbm93IC8gMTAwMDtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZGVsdGEgPSBub3cgLSBmVGhlbjtcblxuXHRcdFx0aWYoZGVsdGEgPCAxLyh0aGlzLmFyZ3MuZnJhbWVMb2NrKygxMCAqICh0aGlzLmFyZ3MuZnJhbWVMb2NrLzYwKSkpKVxuXHRcdFx0e1xuXHRcdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0ZlRoZW4gPSBub3c7XG5cblx0XHRcdGlmKHRoaXMuYXJncy5mcmFtZUxvY2sgPT0gMClcblx0XHRcdHtcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xuXHRcdFx0XHRmU2FtcGxlcyA9IFswXTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhdygpO1xuXG5cdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG5cblx0XHRcdGZTYW1wbGVzLnB1c2godGhpcy5hcmdzLl9mcHMpO1xuXG5cdFx0XHR3aGlsZShmU2FtcGxlcy5sZW5ndGggPiBtYXhTYW1wbGVzKVxuXHRcdFx0e1xuXHRcdFx0XHRmU2FtcGxlcy5zaGlmdCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFyZ3MuX2ZwcyA9ICgxIC8gZGVsdGEpO1xuXG5cdFx0XHR0aGlzLmFyZ3MuY2FtWCA9IE51bWJlcihDYW1lcmEueCkudG9GaXhlZCgyKTtcblx0XHRcdHRoaXMuYXJncy5jYW1ZID0gTnVtYmVyKENhbWVyYS55KS50b0ZpeGVkKDIpO1xuXHRcdH07XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsID0gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCAvIDEwMjQ7XG5cdFx0dGhpcy5yZXNpemUoKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRzaW11bGF0ZShwZXJmb3JtYW5jZS5ub3coKSk7XG5cdFx0fSwgMCk7XG5cblx0XHRzZXRJbnRlcnZhbCgoKT0+e1xuXHRcdFx0Y29uc3QgZnBzID0gZlNhbXBsZXMucmVkdWNlKChhLGIpPT5hK2IsIDApIC8gZlNhbXBsZXMubGVuZ3RoO1xuXHRcdFx0dGhpcy5hcmdzLmZwcyA9IGZwcy50b0ZpeGVkKDMpLnBhZFN0YXJ0KDUsICcgJyk7XG5cdFx0fSwgMjI3KTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRkb2N1bWVudC50aXRsZSA9IGAke0NvbmZpZy50aXRsZX0gJHt0aGlzLmFyZ3MuZnBzfSBGUFNgO1xuXHRcdH0sIDIyNy8zKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRjb25zdCBzcHMgPSBzU2FtcGxlcy5yZWR1Y2UoKGEsYik9PmErYiwgMCkgLyBzU2FtcGxlcy5sZW5ndGg7XG5cdFx0XHR0aGlzLmFyZ3Muc3BzID0gc3BzLnRvRml4ZWQoMykucGFkU3RhcnQoNSwgJyAnKTtcblx0XHR9LCAyMzEvMik7XG5cblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG5cdH1cblxuXHRyZXNpemUoeCwgeSlcblx0e1xuXHRcdHRoaXMuYXJncy53aWR0aCAgPSB0aGlzLnRhZ3MuY2FudmFzLmVsZW1lbnQud2lkdGggICA9IHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aDtcblx0XHR0aGlzLmFyZ3MuaGVpZ2h0ID0gdGhpcy50YWdzLmNhbnZhcy5lbGVtZW50LmhlaWdodCAgPSB5IHx8IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0O1xuXG5cdFx0dGhpcy5hcmdzLnJ3aWR0aCAgPSBNYXRoLnRydW5jKFxuXHRcdFx0KHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgIC8gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHR0aGlzLmFyZ3MucmhlaWdodCA9IE1hdGgudHJ1bmMoXG5cdFx0XHQoeSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCkgLyB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0KTtcblxuXHRcdGNvbnN0IG9sZFNjYWxlID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGggLyAxMDI0O1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAqPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuc2NyZWVuU2NhbGUgLyBvbGRTY2FsZTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzaXplKCk7XG5cdH1cblxuXHRzY3JvbGwoZXZlbnQpXG5cdHtcblx0XHRsZXQgZGVsdGEgPSBldmVudC5kZWx0YVkgPiAwID8gLTEgOiAoXG5cdFx0XHRldmVudC5kZWx0YVkgPCAwID8gMSA6IDBcblx0XHQpO1xuXG5cdFx0dGhpcy56b29tKGRlbHRhKTtcblx0fVxuXG5cdHpvb20oZGVsdGEpXG5cdHtcblx0XHRjb25zdCBtYXggICA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSAqIDMyO1xuXHRcdGNvbnN0IG1pbiAgID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMC42NjY3O1xuXHRcdFxuXHRcdGNvbnN0IHN0ZXAgID0gMC4wNSAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRsZXQgem9vbUxldmVsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCArIChkZWx0YSAqIHN0ZXApO1xuXG5cdFx0aWYoem9vbUxldmVsIDwgbWluKVxuXHRcdHtcblx0XHRcdHpvb21MZXZlbCA9IG1pbjtcblx0XHR9XG5cdFx0ZWxzZSBpZih6b29tTGV2ZWwgPiBtYXgpXG5cdFx0e1xuXHRcdFx0em9vbUxldmVsID0gbWF4O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgIT09IHpvb21MZXZlbClcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsID0gem9vbUxldmVsO1xuXHRcdFx0dGhpcy5yZXNpemUoKTtcblx0XHR9XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8Y2FudmFzXFxuXFx0Y3YtcmVmID0gXFxcImNhbnZhczpjdXJ2YXR1cmUvYmFzZS9UYWdcXFwiXFxuXFx0Y3Ytb24gID0gXFxcIndoZWVsOnNjcm9sbChldmVudCk7XFxcIlxcbj48L2NhbnZhcz5cXG48ZGl2IGNsYXNzID0gXFxcImh1ZCBmcHNcXFwiPlxcbiBbW3Nwc11dIHNpbXVsYXRpb25zL3MgLyBbW3NpbXVsYXRpb25Mb2NrXV0gXFxuIFtbZnBzXV0gZnJhbWVzL3MgICAgICAvIFtbZnJhbWVMb2NrXV0gXFxuXFxuIFJlcyBbW3J3aWR0aF1dIHggW1tyaGVpZ2h0XV1cXG4gICAgIFtbd2lkdGhdXSB4IFtbaGVpZ2h0XV1cXG4gXFxuIFBvcyBbW2NhbVhdXSB4IFtbY2FtWV1dXFxuXFxuIM60IFNpbTogICBQZyBVcCAvIERuXFxuIM60IEZyYW1lOiBIb21lIC8gRW5kIFxcbiDOtCBTY2FsZTogKyAvIC0gXFxuXFxuPC9kaXY+XFxuPGRpdiBjbGFzcyA9IFxcXCJyZXRpY2xlXFxcIj48L2Rpdj5cXG5cXG5bW2NvbnRyb2xsZXJdXVxcblxcbjxkaXYgY3YtaWYgPSBcXFwic2hvd0VkaXRvclxcXCI+XFxuXFx0W1ttYXBFZGl0b3JdXVxcblxcdC0tXFxuXFx0W1ttbW1dXVxcbjwvc3Bhbj5cXG5cIiIsImltcG9ydCB7IFJvdXRlciB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1JvdXRlcic7XG5pbXBvcnQgeyBWaWV3ICAgfSBmcm9tICdob21lL1ZpZXcnO1xuXG5pZihQcm94eSAhPT0gdW5kZWZpbmVkKVxue1xuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuXHRcdGNvbnN0IHZpZXcgPSBuZXcgVmlldygpO1xuXHRcdFxuXHRcdFJvdXRlci5saXN0ZW4odmlldyk7XG5cdFx0XG5cdFx0dmlldy5yZW5kZXIoZG9jdW1lbnQuYm9keSk7XG5cdH0pO1xufVxuZWxzZVxue1xuXHQvLyBkb2N1bWVudC53cml0ZShyZXF1aXJlKCcuL0ZhbGxiYWNrL2ZhbGxiYWNrLnRtcCcpKTtcbn1cbiIsImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICcuL0luamVjdGFibGUnO1xuXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgSW5qZWN0YWJsZVxue1xuXHRpbmplY3QoaW5qZWN0aW9ucylcblx0e1xuXHRcdHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3RvcihPYmplY3QuYXNzaWduKHt9LCB0aGlzLCBpbmplY3Rpb25zKSk7XG5cdH1cbn1cbiIsImxldCBjbGFzc2VzID0ge307XG5sZXQgb2JqZWN0cyA9IHt9O1xuXG5leHBvcnQgY2xhc3MgSW5qZWN0YWJsZVxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRsZXQgaW5qZWN0aW9ucyA9IHRoaXMuY29uc3RydWN0b3IuaW5qZWN0aW9ucygpO1xuXHRcdGxldCBjb250ZXh0ICAgID0gdGhpcy5jb25zdHJ1Y3Rvci5jb250ZXh0KCk7XG5cblx0XHRpZighY2xhc3Nlc1tjb250ZXh0XSlcblx0XHR7XG5cdFx0XHRjbGFzc2VzW2NvbnRleHRdID0ge307XG5cdFx0fVxuXG5cdFx0aWYoIW9iamVjdHNbY29udGV4dF0pXG5cdFx0e1xuXHRcdFx0b2JqZWN0c1tjb250ZXh0XSA9IHt9O1xuXHRcdH1cblxuXHRcdGZvcihsZXQgbmFtZSBpbiBpbmplY3Rpb25zKVxuXHRcdHtcblx0XHRcdGxldCBpbmplY3Rpb24gPSBpbmplY3Rpb25zW25hbWVdO1xuXG5cdFx0XHRpZihjbGFzc2VzW2NvbnRleHRdW25hbWVdIHx8ICFpbmplY3Rpb24ucHJvdG90eXBlKVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0aWYoL1tBLVpdLy50ZXN0KFN0cmluZyhuYW1lKVswXSkpXG5cdFx0XHR7XG5cdFx0XHRcdGNsYXNzZXNbY29udGV4dF1bbmFtZV0gPSBpbmplY3Rpb247XG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRmb3IobGV0IG5hbWUgaW4gaW5qZWN0aW9ucylcblx0XHR7XG5cdFx0XHRsZXQgaW5zdGFuY2UgID0gdW5kZWZpbmVkO1xuXHRcdFx0bGV0IGluamVjdGlvbiA9IGNsYXNzZXNbY29udGV4dF1bbmFtZV0gfHwgaW5qZWN0aW9uc1tuYW1lXTtcblxuXHRcdFx0aWYoL1tBLVpdLy50ZXN0KFN0cmluZyhuYW1lKVswXSkpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKGluamVjdGlvbi5wcm90b3R5cGUpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZighb2JqZWN0c1tjb250ZXh0XVtuYW1lXSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRvYmplY3RzW2NvbnRleHRdW25hbWVdID0gbmV3IGluamVjdGlvbjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0b2JqZWN0c1tjb250ZXh0XVtuYW1lXSA9IGluamVjdGlvbjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGluc3RhbmNlID0gb2JqZWN0c1tjb250ZXh0XVtuYW1lXTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0aWYoaW5qZWN0aW9uLnByb3RvdHlwZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGluc3RhbmNlID0gbmV3IGluamVjdGlvbjtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpbnN0YW5jZSA9IGluamVjdGlvbjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuXHRcdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdFx0d3JpdGFibGU6ICAgZmFsc2UsXG5cdFx0XHRcdHZhbHVlOiAgICAgIGluc3RhbmNlXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG5cdHN0YXRpYyBpbmplY3Rpb25zKClcblx0e1xuXHRcdHJldHVybiB7fTtcblx0fVxuXG5cdHN0YXRpYyBjb250ZXh0KClcblx0e1xuXHRcdHJldHVybiAnLic7XG5cdH1cblxuXHRzdGF0aWMgaW5qZWN0KGluamVjdGlvbnMsIGNvbnRleHQgPSAnLicpXG5cdHtcblx0XHRpZighKHRoaXMucHJvdG90eXBlIGluc3RhbmNlb2YgSW5qZWN0YWJsZSB8fCB0aGlzID09PSBJbmplY3RhYmxlKSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBhY2Nlc3MgaW5qZWN0YWJsZSBzdWJjbGFzcyFcblxuQXJlIHlvdSB0cnlpbmcgdG8gaW5zdGFudGlhdGUgbGlrZSB0aGlzP1xuXG5cdG5ldyBYLmluamVjdCh7Li4ufSk7XG5cbklmIHNvIHBsZWFzZSB0cnk6XG5cblx0bmV3IChYLmluamVjdCh7Li4ufSkpO1xuXG5QbGVhc2Ugbm90ZSB0aGUgcGFyZW50aGVzaXMuXG5gKTtcblx0XHR9XG5cblx0XHRsZXQgZXhpc3RpbmdJbmplY3Rpb25zID0gdGhpcy5pbmplY3Rpb25zKCk7XG5cblx0XHRyZXR1cm4gY2xhc3MgZXh0ZW5kcyB0aGlzIHtcblx0XHRcdHN0YXRpYyBpbmplY3Rpb25zKClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGV4aXN0aW5nSW5qZWN0aW9ucywgaW5qZWN0aW9ucyk7XG5cdFx0XHR9XG5cdFx0XHRzdGF0aWMgY29udGV4dCgpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBjb250ZXh0O1xuXHRcdFx0fVxuXHRcdH07XG5cdH1cbn1cbiIsImNsYXNzIFNpbmdsZVxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLm5hbWUgPSAnc3NzLicgKyBNYXRoLnJhbmRvbSgpO1xuXHR9XG59XG5cbmxldCBzaW5nbGUgPSBuZXcgU2luZ2xlO1xuXG5leHBvcnQge1NpbmdsZSwgc2luZ2xlfTsiLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcblxuZXhwb3J0ICBjbGFzcyBDb250cm9sbGVyXG57XG5cdHRyaWdnZXJzID0gQmluZGFibGUubWFrZUJpbmRhYmxlKHt9KTtcblx0YXhpcyAgICAgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUoe30pO1xuXHRcblx0Y29uc3RydWN0b3Ioe2tleWJvYXJkLCBvblNjcmVlbkpveVBhZH0pXG5cdHtcblx0XHRrZXlib2FyZC5rZXlzLmJpbmRUbygodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmtleVByZXNzKGssdix0W2tdKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih2ID09PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5rZXlSZWxlYXNlKGssdix0W2tdKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cblx0XHRvblNjcmVlbkpveVBhZC5hcmdzLmJpbmRUbygneCcsICh2KSA9PiB7XG5cdFx0XHR0aGlzLmF4aXNbMF0gPSB2IC8gNTA7XG5cdFx0fSk7XG5cblx0XHRvblNjcmVlbkpveVBhZC5hcmdzLmJpbmRUbygneScsICh2KSA9PiB7XG5cdFx0XHR0aGlzLmF4aXNbMV0gPSB2IC8gNTA7XG5cdFx0fSk7XG5cdH1cblxuXHRrZXlQcmVzcyhrZXksIHZhbHVlLCBwcmV2KVxuXHR7XG5cdFx0aWYoL15bMC05XSQvLnRlc3Qoa2V5KSlcblx0XHR7XG5cdFx0XHR0aGlzLnRyaWdnZXJzW2tleV0gPSB0cnVlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHN3aXRjaChrZXkpXG5cdFx0e1xuXHRcdFx0Y2FzZSAnQXJyb3dSaWdodCc6XG5cdFx0XHRcdHRoaXMuYXhpc1swXSA9IDE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0Rvd24nOlxuXHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAxO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dMZWZ0Jzpcblx0XHRcdFx0dGhpcy5heGlzWzBdID0gLTE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd1VwJzpcblx0XHRcdFx0dGhpcy5heGlzWzFdID0gLTE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdGtleVJlbGVhc2Uoa2V5LCB2YWx1ZSwgcHJldilcblx0e1xuXHRcdGlmKC9eWzAtOV0kLy50ZXN0KGtleSkpXG5cdFx0e1xuXHRcdFx0dGhpcy50cmlnZ2Vyc1trZXldID0gZmFsc2U7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c3dpdGNoKGtleSlcblx0XHR7XG5cdFx0XHRjYXNlICdBcnJvd1JpZ2h0Jzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzBdID4gMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1swXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dMZWZ0Jzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzBdIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1swXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93RG93bic6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1sxXSA+IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93VXAnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMV0gPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzFdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH1cbn1cbiIsImltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4uL3Nwcml0ZS9DYW1lcmEnO1xuXG5leHBvcnQgY2xhc3MgRW50aXR5XG57XG5cdGNvbnN0cnVjdG9yKHtzcHJpdGUsIGNvbnRyb2xsZXJ9KVxuXHR7XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdHRoaXMuc3RhdGUgICAgID0gJ3N0YW5kaW5nJztcblxuXHRcdHRoaXMuc3ByaXRlID0gc3ByaXRlO1xuXHRcdHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG5cdH1cblxuXHRjcmVhdGUoKVxuXHR7XG5cdH1cblxuXHRzaW11bGF0ZSgpXG5cdHtcblx0XHRsZXQgc3BlZWQgPSA0O1xuXG5cdFx0bGV0IHhBeGlzID0gdGhpcy5jb250cm9sbGVyLmF4aXNbMF0gfHwgMDtcblx0XHRsZXQgeUF4aXMgPSB0aGlzLmNvbnRyb2xsZXIuYXhpc1sxXSB8fCAwO1xuXG5cdFx0Zm9yKGxldCB0IGluIHRoaXMuY29udHJvbGxlci50cmlnZ2Vycylcblx0XHR7XG5cdFx0XHRpZighdGhpcy5jb250cm9sbGVyLnRyaWdnZXJzW3RdKVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc29sZS5sb2codCk7XG5cdFx0fVxuXG5cdFx0eEF4aXMgPSBNYXRoLm1pbigxLCBNYXRoLm1heCh4QXhpcywgLTEpKTtcblx0XHR5QXhpcyA9IE1hdGgubWluKDEsIE1hdGgubWF4KHlBeGlzLCAtMSkpO1xuXG5cdFx0dGhpcy5zcHJpdGUueCArPSB4QXhpcyA+IDBcblx0XHRcdD8gTWF0aC5jZWlsKHNwZWVkICogeEF4aXMpXG5cdFx0XHQ6IE1hdGguZmxvb3Ioc3BlZWQgKiB4QXhpcyk7XG5cblx0XHR0aGlzLnNwcml0ZS55ICs9IHlBeGlzID4gMFxuXHRcdFx0PyBNYXRoLmNlaWwoc3BlZWQgKiB5QXhpcylcblx0XHRcdDogTWF0aC5mbG9vcihzcGVlZCAqIHlBeGlzKTtcblxuXHRcdENhbWVyYS54ID0gKDE2ICsgdGhpcy5zcHJpdGUueCkgKiB0aGlzLnNwcml0ZS5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCB8fCAwO1xuXHRcdENhbWVyYS55ID0gKDE2ICsgdGhpcy5zcHJpdGUueSkgKiB0aGlzLnNwcml0ZS5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCB8fCAwO1xuXG5cdFx0bGV0IGhvcml6b250YWwgPSBmYWxzZTtcblxuXHRcdGlmKE1hdGguYWJzKHhBeGlzKSA+IE1hdGguYWJzKHlBeGlzKSlcblx0XHR7XG5cdFx0XHRob3Jpem9udGFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZihob3Jpem9udGFsKVxuXHRcdHtcblx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ3dlc3QnO1xuXG5cdFx0XHRpZih4QXhpcyA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ2Vhc3QnO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXRlID0gJ3dhbGtpbmcnO1xuXHRcdFx0XG5cdFx0fVxuXHRcdGVsc2UgaWYoeUF4aXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnbm9ydGgnO1xuXG5cdFx0XHRpZih5QXhpcyA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ3NvdXRoJztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zdGF0ZSA9ICd3YWxraW5nJztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHRoaXMuc3RhdGUgPSAnc3RhbmRpbmcnO1xuXHRcdH1cblxuXHRcdC8vIGlmKCF4QXhpcyAmJiAheUF4aXMpXG5cdFx0Ly8ge1xuXHRcdC8vIFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdC8vIH1cblxuXHRcdGxldCBmcmFtZXM7XG5cblx0XHRpZihmcmFtZXMgPSB0aGlzLnNwcml0ZVt0aGlzLnN0YXRlXVt0aGlzLmRpcmVjdGlvbl0pXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUuc2V0RnJhbWVzKGZyYW1lcyk7XG5cdFx0fVxuXHR9XG5cblx0ZGVzdHJveSgpXG5cdHtcblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xcblxcbnVuaWZvcm0gdmVjNCAgICAgIHVfY29sb3I7XFxudmFyeWluZyB2ZWMyICAgICAgdl90ZXhDb29yZDtcXG5cXG52b2lkIG1haW4oKSB7XFxuICAgLy8gZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHZfdGV4Q29vcmQpO1xcbiAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMS4wLCAxLjAsIDAuMCwgMC4yNSk7XFxufVxcblwiIiwibW9kdWxlLmV4cG9ydHMgPSBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247XFxuYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDtcXG5cXG51bmlmb3JtICAgdmVjMiB1X3Jlc29sdXRpb247XFxuXFxudmFyeWluZyAgIHZlYzIgdl90ZXhDb29yZDtcXG5cXG52b2lkIG1haW4oKVxcbntcXG4gICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247XFxuICAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7XFxuICAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7XFxuXFxuICAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTtcXG4gICB2X3RleENvb3JkICA9IGFfdGV4Q29vcmQ7XFxufVxcblwiIiwiaW1wb3J0IHsgU3VyZmFjZSB9IGZyb20gJy4vU3VyZmFjZSc7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tICcuL0NhbWVyYSc7XG5pbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4vU3ByaXRlU2hlZXQnO1xuXG5leHBvcnQgIGNsYXNzIEJhY2tncm91bmRcbntcblx0Y29uc3RydWN0b3Ioc3ByaXRlQm9hcmQsIG1hcCwgbGF5ZXIgPSAwKVxuXHR7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cblx0XHR0aGlzLnBhbmVzICAgICAgID0gW107XG5cdFx0dGhpcy5wYW5lc1hZICAgICA9IHt9O1xuXHRcdHRoaXMubWF4UGFuZXMgICAgPSA5O1xuXG5cdFx0dGhpcy5tYXAgICAgICAgICA9IG1hcDtcblx0XHR0aGlzLmxheWVyICAgICAgID0gbGF5ZXI7XG5cblx0XHR0aGlzLnRpbGVXaWR0aCAgID0gMzI7XG5cdFx0dGhpcy50aWxlSGVpZ2h0ICA9IDMyO1xuXG5cdFx0dGhpcy5zdXJmYWNlV2lkdGggPSA1O1xuXHRcdHRoaXMuc3VyZmFjZUhlaWdodCA9IDU7XG5cdH1cblxuXHRyZW5kZXJQYW5lKHgsIHksIGZvcmNlVXBkYXRlKVxuXHR7XG5cdFx0bGV0IHBhbmU7XG5cdFx0bGV0IHBhbmVYID0geCAqIHRoaXMudGlsZVdpZHRoICogdGhpcy5zdXJmYWNlV2lkdGggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXHRcdGxldCBwYW5lWSA9IHkgKiB0aGlzLnRpbGVIZWlnaHQgKiB0aGlzLnN1cmZhY2VIZWlnaHQgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0aWYodGhpcy5wYW5lc1hZW3BhbmVYXSAmJiB0aGlzLnBhbmVzWFlbcGFuZVhdW3BhbmVZXSlcblx0XHR7XG5cdFx0XHRwYW5lID0gdGhpcy5wYW5lc1hZW3BhbmVYXVtwYW5lWV07XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRwYW5lID0gbmV3IFN1cmZhY2UoXG5cdFx0XHRcdHRoaXMuc3ByaXRlQm9hcmRcblx0XHRcdFx0LCB0aGlzLnNwcml0ZVNoZWV0XG5cdFx0XHRcdCwgdGhpcy5tYXBcblx0XHRcdFx0LCB0aGlzLnN1cmZhY2VXaWR0aFxuXHRcdFx0XHQsIHRoaXMuc3VyZmFjZUhlaWdodFxuXHRcdFx0XHQsIHBhbmVYXG5cdFx0XHRcdCwgcGFuZVlcblx0XHRcdFx0LCB0aGlzLmxheWVyXG5cdFx0XHQpO1xuXG5cdFx0XHRpZighdGhpcy5wYW5lc1hZW3BhbmVYXSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5wYW5lc1hZW3BhbmVYXSA9IHt9O1xuXHRcdFx0fVxuXG5cdFx0XHRpZighdGhpcy5wYW5lc1hZW3BhbmVYXVtwYW5lWV0pXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMucGFuZXNYWVtwYW5lWF1bcGFuZVldID0gcGFuZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnBhbmVzLnB1c2gocGFuZSk7XG5cblx0XHRpZih0aGlzLnBhbmVzLmxlbmd0aCA+IHRoaXMubWF4UGFuZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5wYW5lcy5zaGlmdCgpO1xuXHRcdH1cblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0dGhpcy5wYW5lcy5sZW5ndGggPSAwO1xuXG5cdFx0Y29uc3QgY2VudGVyWCA9IE1hdGguZmxvb3IoXG5cdFx0XHQoQ2FtZXJhLnggLyAodGhpcy5zdXJmYWNlV2lkdGggKiB0aGlzLnRpbGVXaWR0aCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwpKSArIDBcblx0XHQpO1xuXG5cdFx0Y29uc3QgY2VudGVyWSA9IE1hdGguZmxvb3IoXG5cdFx0XHRDYW1lcmEueSAvICh0aGlzLnN1cmZhY2VIZWlnaHQgKiB0aGlzLnRpbGVIZWlnaHQgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsKSArIDBcblx0XHQpO1xuXG5cdFx0bGV0IHJhbmdlID0gWy0xLCAwLCAxXTtcblxuXHRcdGZvcihsZXQgeCBpbiByYW5nZSlcblx0XHR7XG5cdFx0XHRmb3IobGV0IHkgaW4gcmFuZ2UpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMucmVuZGVyUGFuZShjZW50ZXJYICsgcmFuZ2VbeF0sIGNlbnRlclkgKyByYW5nZVt5XSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5wYW5lcy5mb3JFYWNoKHAgPT4gcC5kcmF3KCkpO1xuXHR9XG5cblx0cmVzaXplKHgsIHkpXG5cdHtcblx0XHRmb3IobGV0IGkgaW4gdGhpcy5wYW5lc1hZKVxuXHRcdHtcblx0XHRcdGZvcihsZXQgaiBpbiB0aGlzLnBhbmVzWFlbaV0pXG5cdFx0XHR7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnBhbmVzWFlbaV1bal07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0d2hpbGUodGhpcy5wYW5lcy5sZW5ndGgpXG5cdFx0e1xuXHRcdFx0dGhpcy5wYW5lcy5wb3AoKTtcblx0XHR9XG5cblx0XHR0aGlzLnN1cmZhY2VXaWR0aCA9IE1hdGguY2VpbCgoeCAvIHRoaXMudGlsZVdpZHRoKSk7XG5cdFx0dGhpcy5zdXJmYWNlSGVpZ2h0ID0gTWF0aC5jZWlsKCh5IC8gdGhpcy50aWxlSGVpZ2h0KSk7XG5cblx0XHR0aGlzLmRyYXcoKTtcblx0fVxuXG5cdHNpbXVsYXRlKClcblx0e1xuXHRcdFxuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQ2FtZXJhXG57XG5cdHN0YXRpYyB4ID0gMDtcblx0c3RhdGljIHkgPSAwO1xuXHRzdGF0aWMgd2lkdGggID0gMDtcblx0c3RhdGljIGhlaWdodCA9IDA7XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gXCJjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZVwiO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSBcIi4vQ2FtZXJhXCI7XG5cbmV4cG9ydCBjbGFzcyBTcHJpdGVcbntcblx0Y29uc3RydWN0b3Ioe3NyYywgc3ByaXRlQm9hcmQsIHNwcml0ZVNoZWV0fSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXHRcdFxuXHRcdHRoaXMueiAgICAgID0gMDtcblx0XHR0aGlzLnggICAgICA9IDA7XG5cdFx0dGhpcy55ICAgICAgPSAwO1xuXG5cdFx0dGhpcy53aWR0aCAgPSAwO1xuXHRcdHRoaXMuaGVpZ2h0ID0gMDtcblx0XHR0aGlzLnNjYWxlICA9IDE7XG5cblx0XHR0aGlzLmZyYW1lcyAgICAgICAgPSBbXTtcblx0XHR0aGlzLmZyYW1lRGVsYXkgICAgPSA0O1xuXHRcdHRoaXMuY3VycmVudERlbGF5ICA9IHRoaXMuZnJhbWVEZWxheTtcblx0XHR0aGlzLmN1cnJlbnRGcmFtZSAgPSAwO1xuXHRcdHRoaXMuY3VycmVudEZyYW1lcyA9ICcnO1xuXG5cdFx0dGhpcy5zcGVlZCAgICA9IDA7XG5cdFx0dGhpcy5tYXhTcGVlZCA9IDg7XG5cblx0XHR0aGlzLm1vdmluZyA9IGZhbHNlO1xuXG5cdFx0dGhpcy5SSUdIVFx0PSAwO1xuXHRcdHRoaXMuRE9XTlx0PSAxO1xuXHRcdHRoaXMuTEVGVFx0PSAyO1xuXHRcdHRoaXMuVVBcdFx0PSAzO1xuXG5cdFx0dGhpcy5FQVNUXHQ9IHRoaXMuUklHSFQ7XG5cdFx0dGhpcy5TT1VUSFx0PSB0aGlzLkRPV047XG5cdFx0dGhpcy5XRVNUXHQ9IHRoaXMuTEVGVDtcblx0XHR0aGlzLk5PUlRIXHQ9IHRoaXMuVVA7XG5cblx0XHR0aGlzLnN0YW5kaW5nID0ge1xuXHRcdFx0J25vcnRoJzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX25vcnRoLnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ3NvdXRoJzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX3NvdXRoLnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ3dlc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdlYXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XVxuXHRcdH07XG5cblx0XHR0aGlzLndhbGtpbmcgPSB7XG5cdFx0XHQnbm9ydGgnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ19ub3J0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX25vcnRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX25vcnRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfbm9ydGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfbm9ydGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX25vcnRoLnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ3NvdXRoJzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfc291dGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19zb3V0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19zb3V0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3NvdXRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3NvdXRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19zb3V0aC5wbmcnXG5cblx0XHRcdF1cblx0XHRcdCwgJ3dlc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ193ZXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3dlc3QyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdlYXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfZWFzdDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19lYXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XVxuXHRcdH07XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0dGhpcy50ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50ZXh0dXJlKTtcblxuXHRcdGNvbnN0IHIgPSAoKT0+cGFyc2VJbnQoTWF0aC5yYW5kb20oKSoyNTUpO1xuXG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIDFcblx0XHRcdCwgMVxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBuZXcgVWludDhBcnJheShbcigpLCByKCksIDAsIDI1NV0pXG5cdFx0KTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBzcHJpdGVTaGVldDtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQucmVhZHkudGhlbigoc2hlZXQpPT57XG5cdFx0XHRjb25zdCBmcmFtZSA9IHRoaXMuc3ByaXRlU2hlZXQuZ2V0RnJhbWUoc3JjKTtcblxuXHRcdFx0aWYoZnJhbWUpXG5cdFx0XHR7XG5cdFx0XHRcdFNwcml0ZS5sb2FkVGV4dHVyZSh0aGlzLnNwcml0ZUJvYXJkLmdsMmQsIHRoaXMuc3ByaXRlU2hlZXQsIGZyYW1lKS50aGVuKChhcmdzKT0+e1xuXHRcdFx0XHRcdHRoaXMudGV4dHVyZSA9IGFyZ3MudGV4dHVyZTtcblx0XHRcdFx0XHR0aGlzLndpZHRoICAgPSBhcmdzLmltYWdlLndpZHRoICogdGhpcy5zY2FsZTtcblx0XHRcdFx0XHR0aGlzLmhlaWdodCAgPSBhcmdzLmltYWdlLmhlaWdodCAqIHRoaXMuc2NhbGU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHR0aGlzLmZyYW1lRGVsYXkgPSB0aGlzLm1heFNwZWVkIC0gTWF0aC5hYnModGhpcy5zcGVlZCk7XG5cdFx0aWYodGhpcy5mcmFtZURlbGF5ID4gdGhpcy5tYXhTcGVlZClcblx0XHR7XG5cdFx0XHR0aGlzLmZyYW1lRGVsYXkgPSB0aGlzLm1heFNwZWVkO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuY3VycmVudERlbGF5IDw9IDApXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXkgPSB0aGlzLmZyYW1lRGVsYXk7XG5cdFx0XHR0aGlzLmN1cnJlbnRGcmFtZSsrO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXktLTtcblx0XHR9XG5cblx0XHRpZih0aGlzLmN1cnJlbnRGcmFtZSA+PSB0aGlzLmZyYW1lcy5sZW5ndGgpXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RnJhbWUgPSB0aGlzLmN1cnJlbnRGcmFtZSAtIHRoaXMuZnJhbWVzLmxlbmd0aDtcblx0XHR9XG5cblx0XHRjb25zdCBmcmFtZSA9IHRoaXMuZnJhbWVzWyB0aGlzLmN1cnJlbnRGcmFtZSBdO1xuXG5cdFx0aWYoZnJhbWUpXG5cdFx0e1xuXHRcdFx0dGhpcy50ZXh0dXJlID0gZnJhbWUudGV4dHVyZTtcblx0XHRcdHRoaXMud2lkdGggID0gZnJhbWUud2lkdGggKiB0aGlzLnNjYWxlO1xuXHRcdFx0dGhpcy5oZWlnaHQgPSBmcmFtZS5oZWlnaHQgKiB0aGlzLnNjYWxlO1xuXHRcdH1cblxuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnRleHR1cmUpO1xuXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHR0aGlzLnggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICsgLUNhbWVyYS54ICsgKENhbWVyYS53aWR0aCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgLyAyKVxuXHRcdFx0LCB0aGlzLnkgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICsgLUNhbWVyYS55ICsgKENhbWVyYS5oZWlnaHQgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsIC8gMikgKyAtdGhpcy5oZWlnaHQgKiAwLjUgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIHRoaXMud2lkdGggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIHRoaXMuaGVpZ2h0ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cdH1cblxuXHRzZXRGcmFtZXMoZnJhbWVTZWxlY3Rvcilcblx0e1xuXHRcdGxldCBmcmFtZXNJZCA9IGZyYW1lU2VsZWN0b3Iuam9pbignICcpO1xuXG5cdFx0aWYodGhpcy5jdXJyZW50RnJhbWVzID09PSBmcmFtZXNJZClcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5jdXJyZW50RnJhbWVzID0gZnJhbWVzSWQ7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oKHNoZWV0KT0+e1xuXG5cdFx0XHRjb25zdCBmcmFtZXMgPSBzaGVldC5nZXRGcmFtZXMoZnJhbWVTZWxlY3RvcikubWFwKChmcmFtZSk9PntcblxuXHRcdFx0XHRyZXR1cm4gU3ByaXRlLmxvYWRUZXh0dXJlKHRoaXMuc3ByaXRlQm9hcmQuZ2wyZCwgdGhpcy5zcHJpdGVTaGVldCwgZnJhbWUpLnRoZW4oKGFyZ3MpPT57XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRleHR1cmU6ICBhcmdzLnRleHR1cmVcblx0XHRcdFx0XHRcdCwgd2lkdGg6ICBhcmdzLmltYWdlLndpZHRoXG5cdFx0XHRcdFx0XHQsIGhlaWdodDogYXJncy5pbWFnZS5oZWlnaHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHR9KTtcblxuXHRcdFx0UHJvbWlzZS5hbGwoZnJhbWVzKS50aGVuKChmcmFtZXMpPT57XG5cdFx0XHRcdHRoaXMuZnJhbWVzID0gZnJhbWVzO1xuXHRcdFx0fSk7XG5cblx0XHR9KTtcblx0fVxuXG5cdHN0YXRpYyBsb2FkVGV4dHVyZShnbDJkLCBzcHJpdGVTaGVldCwgaW1hZ2VTcmMpXG5cdHtcblx0XHRjb25zdCBnbCA9IGdsMmQuY29udGV4dDtcblxuXHRcdGlmKCF0aGlzLnByb21pc2VzKVxuXHRcdHtcblx0XHRcdHRoaXMucHJvbWlzZXMgPSB7fTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnByb21pc2VzW2ltYWdlU3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm9taXNlc1tpbWFnZVNyY107XG5cdFx0fVxuXG5cdFx0Ly8gY29uc29sZS5sb2coaW1hZ2VTcmMpO1xuXG5cdFx0dGhpcy5wcm9taXNlc1tpbWFnZVNyY10gPSBTcHJpdGUubG9hZEltYWdlKGltYWdlU3JjKS50aGVuKChpbWFnZSk9Pntcblx0XHRcdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG5cdFx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0XHQsIGltYWdlXG5cdFx0XHQpO1xuXG5cdFx0XHRyZXR1cm4ge2ltYWdlLCB0ZXh0dXJlfVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMucHJvbWlzZXNbaW1hZ2VTcmNdO1xuXHR9XG5cblx0c3RhdGljIGxvYWRJbWFnZShzcmMpXG5cdHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KT0+e1xuXHRcdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdGltYWdlLnNyYyAgID0gc3JjO1xuXHRcdFx0aW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldmVudCk9Pntcblx0XHRcdFx0YWNjZXB0KGltYWdlKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0c2V0UmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQucG9zaXRpb25CdWZmZXIpO1xuXG5cdFx0Y29uc3QgeDEgPSB4O1xuXHRcdGNvbnN0IHgyID0geCArIHdpZHRoO1xuXHRcdGNvbnN0IHkxID0geTtcblx0XHRjb25zdCB5MiA9IHkgKyBoZWlnaHQ7XG5cdFx0XG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkxLCB0aGlzLnosXG5cdFx0XHR4MiwgeTEsIHRoaXMueixcblx0XHRcdHgxLCB5MiwgdGhpcy56LFxuXHRcdFx0eDEsIHkyLCB0aGlzLnosXG5cdFx0XHR4MiwgeTEsIHRoaXMueixcblx0XHRcdHgyLCB5MiwgdGhpcy56LFxuXHRcdF0pLCBnbC5TVFJFQU1fRFJBVyk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEJhZyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JhZyc7XG5pbXBvcnQgeyBCYWNrZ3JvdW5kICB9IGZyb20gJy4vQmFja2dyb3VuZCc7XG5cbmltcG9ydCB7IEdsMmQgfSBmcm9tICcuLi9nbDJkL0dsMmQnO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi9DYW1lcmEnO1xuaW1wb3J0IHsgU3ByaXRlIH0gZnJvbSAnLi9TcHJpdGUnO1xuaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5pbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4vU3ByaXRlU2hlZXQnO1xuXG5leHBvcnQgY2xhc3MgU3ByaXRlQm9hcmRcbntcblx0Y29uc3RydWN0b3IoZWxlbWVudCwgbWFwKVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cblx0XHR0aGlzLm1hcCA9IG1hcDtcblxuXHRcdHRoaXMubW91c2UgPSB7XG5cdFx0XHR4OiAgICAgICAgbnVsbFxuXHRcdFx0LCB5OiAgICAgIG51bGxcblx0XHRcdCwgY2xpY2tYOiBudWxsXG5cdFx0XHQsIGNsaWNrWTogbnVsbFxuXHRcdH07XG5cblx0XHR0aGlzLnNwcml0ZXMgPSBuZXcgQmFnO1xuXG5cdFx0Q2FtZXJhLndpZHRoICA9IGVsZW1lbnQud2lkdGg7XG5cdFx0Q2FtZXJhLmhlaWdodCA9IGVsZW1lbnQuaGVpZ2h0O1xuXG5cdFx0dGhpcy5nbDJkID0gbmV3IEdsMmQoZWxlbWVudCk7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG5cdFx0Z2wuZW5hYmxlKGdsLkJMRU5EKTtcblxuXHRcdHRoaXMucHJvZ3JhbSA9IHRoaXMuZ2wyZC5jcmVhdGVQcm9ncmFtKFxuXHRcdFx0dGhpcy5nbDJkLmNyZWF0ZVNoYWRlcignc3ByaXRlL3RleHR1cmUudmVydCcpXG5cdFx0XHQsIHRoaXMuZ2wyZC5jcmVhdGVTaGFkZXIoJ3Nwcml0ZS90ZXh0dXJlLmZyYWcnKVxuXHRcdCk7XG5cblx0XHR0aGlzLm92ZXJsYXlQcm9ncmFtID0gdGhpcy5nbDJkLmNyZWF0ZVByb2dyYW0oXG5cdFx0XHR0aGlzLmdsMmQuY3JlYXRlU2hhZGVyKCdvdmVybGF5L292ZXJsYXkudmVydCcpXG5cdFx0XHQsIHRoaXMuZ2wyZC5jcmVhdGVTaGFkZXIoJ292ZXJsYXkvb3ZlcmxheS5mcmFnJylcblx0XHQpO1xuXG5cdFx0dGhpcy5wb3NpdGlvbkxvY2F0aW9uICAgPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLnByb2dyYW0sICdhX3Bvc2l0aW9uJyk7XG5cdFx0dGhpcy50ZXhDb29yZExvY2F0aW9uICAgPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLnByb2dyYW0sICdhX3RleENvb3JkJyk7XG5cblx0XHR0aGlzLnBvc2l0aW9uQnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG5cdFx0dGhpcy50ZXhDb29yZEJ1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuXG5cdFx0dGhpcy5yZXNvbHV0aW9uTG9jYXRpb24gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV9yZXNvbHV0aW9uJyk7XG5cdFx0dGhpcy5jb2xvckxvY2F0aW9uICAgICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV9jb2xvcicpO1xuXG5cdFx0dGhpcy5vdmVybGF5TG9jYXRpb24gICA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMub3ZlcmxheVByb2dyYW0sICdhX3Bvc2l0aW9uJyk7XG5cdFx0dGhpcy5vdmVybGF5UmVzb2x1dGlvbiA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLm92ZXJsYXlQcm9ncmFtLCAndV9yZXNvbHV0aW9uJyk7XG5cdFx0dGhpcy5vdmVybGF5Q29sb3IgICAgICA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLm92ZXJsYXlQcm9ncmFtLCAndV9jb2xvcicpO1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMucG9zaXRpb25CdWZmZXIpO1xuXHRcdGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHRoaXMucG9zaXRpb25Mb2NhdGlvbik7XG5cdFx0Z2wudmVydGV4QXR0cmliUG9pbnRlcihcblx0XHRcdHRoaXMucG9zaXRpb25Mb2NhdGlvblxuXHRcdFx0LCAzXG5cdFx0XHQsIGdsLkZMT0FUXG5cdFx0XHQsIGZhbHNlXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSh0aGlzLnRleENvb3JkTG9jYXRpb24pO1xuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnRleENvb3JkQnVmZmVyKTtcblx0XHRnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKFxuXHRcdFx0dGhpcy50ZXhDb29yZExvY2F0aW9uXG5cdFx0XHQsIDJcblx0XHRcdCwgZ2wuRkxPQVRcblx0XHRcdCwgZmFsc2Vcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHQnbW91c2Vtb3ZlJywgKGV2ZW50KT0+e1xuXHRcdFx0XHR0aGlzLm1vdXNlLnggPSBldmVudC5jbGllbnRYO1xuXHRcdFx0XHR0aGlzLm1vdXNlLnkgPSBldmVudC5jbGllbnRZO1xuXHRcdFx0fVxuXHRcdCk7XG5cblx0XHR0aGlzLnNlbGVjdGVkID0ge1xuXHRcdFx0bG9jYWxYOiAgICBudWxsXG5cdFx0XHQsIGxvY2FsWTogIG51bGxcblx0XHRcdCwgZ2xvYmFsWDogbnVsbFxuXHRcdFx0LCBnbG9iYWxZOiBudWxsXG5cdFx0XHQsIHN0YXJ0R2xvYmFsWDogbnVsbFxuXHRcdFx0LCBzdGFydEdsb2JhbFk6IG51bGxcblx0XHR9O1xuXG5cdFx0dGhpcy5zZWxlY3RlZCA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh0aGlzLnNlbGVjdGVkKTtcblxuXHRcdHRoaXMuYmFja2dyb3VuZCAgPSBuZXcgQmFja2dyb3VuZCh0aGlzLCBtYXApO1xuXHRcdGNvbnN0IHcgPSAxMjg7XG5cdFx0Y29uc3Qgc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cdFx0XG5cdFx0Zm9yKGNvbnN0IGkgaW4gQXJyYXkoMTYpLmZpbGwoKSlcblx0XHR7XG5cdFx0XHRjb25zdCBiYXJyZWwgPSBuZXcgU3ByaXRlKHtcblx0XHRcdFx0c3JjOiAnYmFycmVsLnBuZycsXG5cdFx0XHRcdHNwcml0ZUJvYXJkOiB0aGlzLFxuXHRcdFx0XHRzcHJpdGVTaGVldFxuXHRcdFx0fSk7XG5cdFx0XHRiYXJyZWwueCA9IChpICogMzIpICUgdztcblx0XHRcdGJhcnJlbC55ID0gTWF0aC50cnVuYygoaSAqIDMyKSAvIHcpICogMzI7XG5cdFx0XHR0aGlzLnNwcml0ZXMuYWRkKGJhcnJlbCk7XG5cdFx0fVxuXHRcdHRoaXMuc3ByaXRlcy5hZGQodGhpcy5iYWNrZ3JvdW5kKTtcblx0fVxuXG5cdHVuc2VsZWN0KClcblx0e1xuXHRcdGlmKHRoaXMuc2VsZWN0ZWQubG9jYWxYID09PSBudWxsKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR0aGlzLnNlbGVjdGVkLmxvY2FsWCAgPSBudWxsO1xuXHRcdHRoaXMuc2VsZWN0ZWQubG9jYWxZICA9IG51bGw7XG5cdFx0dGhpcy5zZWxlY3RlZC5nbG9iYWxYID0gbnVsbDtcblx0XHR0aGlzLnNlbGVjdGVkLmdsb2JhbFkgPSBudWxsO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXHRcdGdsLnZpZXdwb3J0KDAsIDAsIGdsLmNhbnZhcy53aWR0aCwgZ2wuY2FudmFzLmhlaWdodCk7XG5cblx0XHRnbC51bmlmb3JtMmYoXG5cdFx0XHR0aGlzLnJlc29sdXRpb25Mb2NhdGlvblxuXHRcdFx0LCBnbC5jYW52YXMud2lkdGhcblx0XHRcdCwgZ2wuY2FudmFzLmhlaWdodFxuXHRcdCk7XG5cblx0XHQvLyBnbC5jbGVhckNvbG9yKDAsIDAsIDAsIDApO1xuXHRcdC8vIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuXG5cdFx0Z2wudXNlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXG5cdFx0Z2wudW5pZm9ybTJmKFxuXHRcdFx0dGhpcy5nbDJkLnJlc29sdXRpb25Mb2NhdGlvblxuXHRcdFx0LCBDYW1lcmEud2lkdGhcblx0XHRcdCwgQ2FtZXJhLmhlaWdodFxuXHRcdCk7XG5cblx0XHRsZXQgc3ByaXRlcyA9IHRoaXMuc3ByaXRlcy5pdGVtcygpO1xuXG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZSgnc29ydCcpO1xuXHRcdFxuXHRcdHNwcml0ZXMuc29ydCgoYSxiKSA9PiB7XG5cdFx0XHRpZigoYSBpbnN0YW5jZW9mIEJhY2tncm91bmQpICYmICEoYiBpbnN0YW5jZW9mIEJhY2tncm91bmQpKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cblx0XHRcdGlmKChiIGluc3RhbmNlb2YgQmFja2dyb3VuZCkgJiYgIShhIGluc3RhbmNlb2YgQmFja2dyb3VuZCkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihhLnogPT09IHVuZGVmaW5lZClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXHRcdFxuXHRcdFx0aWYoYi56ID09PSB1bmRlZmluZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXHRcdFxuXHRcdFx0cmV0dXJuIGEueiAtIGIuejtcblx0XHR9KTtcblxuXHRcdGlmKHdpbmRvdy5zbVByb2ZpbGluZylcblx0XHR7XG5cdFx0XHRjb25zb2xlLnRpbWVFbmQoJ3NvcnQnKTtcblx0XHRcdHdpbmRvdy5zbVByb2ZpbGluZyA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdHNwcml0ZXMuZm9yRWFjaChzID0+IHtcblx0XHRcdHMueiA9IHMgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kID8gLTEgOiBzLnk7XG5cdFx0XHRzLmRyYXcoKTtcblx0XHR9KTtcblx0fVxuXG5cdHJlc2l6ZSh4LCB5KVxuXHR7XG5cdFx0eCA9IHggfHwgdGhpcy5nbDJkLmVsZW1lbnQud2lkdGg7XG5cdFx0eSA9IHkgfHwgdGhpcy5nbDJkLmVsZW1lbnQuaGVpZ2h0O1xuXG5cdFx0Q2FtZXJhLndpZHRoICA9IHggLyB0aGlzLmdsMmQuem9vbUxldmVsO1xuXHRcdENhbWVyYS5oZWlnaHQgPSB5IC8gdGhpcy5nbDJkLnpvb21MZXZlbDtcblxuXHRcdHRoaXMuYmFja2dyb3VuZC5yZXNpemUoQ2FtZXJhLndpZHRoLCBDYW1lcmEuaGVpZ2h0KTtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnBvc2l0aW9uQnVmZmVyKTtcblxuXHRcdGNvbnN0IHgxID0geDtcblx0XHRjb25zdCB4MiA9IHggKyB3aWR0aDtcblx0XHRjb25zdCB5MSA9IHk7XG5cdFx0Y29uc3QgeTIgPSB5ICsgaGVpZ2h0O1xuXG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkxLCB0aGlzLnosXG5cdFx0XHR4MiwgeTEsIHRoaXMueixcblx0XHRcdHgxLCB5MiwgdGhpcy56LFxuXHRcdFx0eDEsIHkyLCB0aGlzLnosXG5cdFx0XHR4MiwgeTEsIHRoaXMueixcblx0XHRcdHgyLCB5MiwgdGhpcy56LFxuXHRcdF0pLCBnbC5TVFJFQU1fRFJBVyk7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBTcHJpdGVTaGVldFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLmltYWdlVXJsID0gJy9zcHJpdGVzaGVldC5wbmcnO1xuXHRcdHRoaXMuYm94ZXNVcmwgPSAnL3Nwcml0ZXNoZWV0Lmpzb24nO1xuXHRcdHRoaXMudmVydGljZXMgPSB7fTtcblx0XHR0aGlzLmZyYW1lcyAgID0ge307XG5cdFx0dGhpcy53aWR0aCAgICA9IDA7XG5cdFx0dGhpcy5oZWlnaHQgICA9IDA7XG5cblx0XHRsZXQgcmVxdWVzdCAgID0gbmV3IFJlcXVlc3QodGhpcy5ib3hlc1VybCk7XG5cblx0XHRsZXQgc2hlZXRMb2FkZXIgPSBmZXRjaChyZXF1ZXN0KVxuXHRcdC50aGVuKChyZXNwb25zZSk9PnJlc3BvbnNlLmpzb24oKSlcblx0XHQudGhlbigoYm94ZXMpID0+IHRoaXMuYm94ZXMgPSBib3hlcyk7XG5cblx0XHRsZXQgaW1hZ2VMb2FkZXIgPSBuZXcgUHJvbWlzZSgoYWNjZXB0KT0+e1xuXHRcdFx0dGhpcy5pbWFnZSAgICAgICAgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdHRoaXMuaW1hZ2Uuc3JjICAgID0gdGhpcy5pbWFnZVVybDtcblx0XHRcdHRoaXMuaW1hZ2Uub25sb2FkID0gKCk9Pntcblx0XHRcdFx0YWNjZXB0KCk7XG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5yZWFkeSA9IFByb21pc2UuYWxsKFtzaGVldExvYWRlciwgaW1hZ2VMb2FkZXJdKVxuXHRcdC50aGVuKCgpID0+IHRoaXMucHJvY2Vzc0ltYWdlKCkpXG5cdFx0LnRoZW4oKCkgPT4gdGhpcyk7XG5cdH1cblxuXHRwcm9jZXNzSW1hZ2UoKVxuXHR7XG5cdFx0aWYoIXRoaXMuYm94ZXMgfHwgIXRoaXMuYm94ZXMuZnJhbWVzKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBjYW52YXMgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0XHRjYW52YXMud2lkdGggID0gdGhpcy5pbWFnZS53aWR0aDtcblx0XHRjYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHRjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiLCB7d2lsbFJlYWRGcmVxdWVudGx5OiB0cnVlfSk7XG5cblx0XHRjb250ZXh0LmRyYXdJbWFnZSh0aGlzLmltYWdlLCAwLCAwKTtcblxuXHRcdGNvbnN0IGZyYW1lUHJvbWlzZXMgPSBbXTtcblxuXHRcdGZvcihsZXQgaSBpbiB0aGlzLmJveGVzLmZyYW1lcylcblx0XHR7XG5cdFx0XHRjb25zdCBzdWJDYW52YXMgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0XHRcdHN1YkNhbnZhcy53aWR0aCAgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53O1xuXHRcdFx0c3ViQ2FudmFzLmhlaWdodCA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmg7XG5cblx0XHRcdGNvbnN0IHN1YkNvbnRleHQgPSBzdWJDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG5cdFx0XHRpZih0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZSlcblx0XHRcdHtcblx0XHRcdFx0c3ViQ29udGV4dC5wdXRJbWFnZURhdGEoY29udGV4dC5nZXRJbWFnZURhdGEoXG5cdFx0XHRcdFx0dGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueFxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueVxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUud1xuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaFxuXHRcdFx0XHQpLCAwLCAwKTtcblx0XHRcdH1cblxuXHRcdFx0aWYodGhpcy5ib3hlcy5mcmFtZXNbaV0udGV4dClcblx0XHRcdHtcblx0XHRcdFx0c3ViQ29udGV4dC5maWxsU3R5bGUgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5jb2xvciB8fCAnd2hpdGUnO1xuXG5cdFx0XHRcdHN1YkNvbnRleHQuZm9udCA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZvbnRcblx0XHRcdFx0XHR8fCBgJHt0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5ofXB4IHNhbnMtc2VyaWZgO1xuXHRcdFx0XHRzdWJDb250ZXh0LnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXG5cdFx0XHRcdHN1YkNvbnRleHQuZmlsbFRleHQoXG5cdFx0XHRcdFx0dGhpcy5ib3hlcy5mcmFtZXNbaV0udGV4dFxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUudyAvIDJcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmhcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLndcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRzdWJDb250ZXh0LnRleHRBbGlnbiA9IG51bGw7XG5cdFx0XHRcdHN1YkNvbnRleHQuZm9udCAgICAgID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0ZnJhbWVQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKChhY2NlcHQpPT57XG5cdFx0XHRcdHN1YkNhbnZhcy50b0Jsb2IoKGJsb2IpPT57XG5cdFx0XHRcdFx0dGhpcy5mcmFtZXNbdGhpcy5ib3hlcy5mcmFtZXNbaV0uZmlsZW5hbWVdID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblxuXHRcdFx0XHRcdGFjY2VwdCh0aGlzLmZyYW1lc1t0aGlzLmJveGVzLmZyYW1lc1tpXS5maWxlbmFtZV0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pKTtcblxuXG5cdFx0XHQvLyBsZXQgdTEgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS54IC8gdGhpcy5pbWFnZS53aWR0aDtcblx0XHRcdC8vIGxldCB2MSA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnkgLyB0aGlzLmltYWdlLmhlaWdodDtcblxuXHRcdFx0Ly8gbGV0IHUyID0gKHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnggKyB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53KVxuXHRcdFx0Ly8gXHQvIHRoaXMuaW1hZ2Uud2lkdGg7XG5cblx0XHRcdC8vIGxldCB2MiA9ICh0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS55ICsgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaClcblx0XHRcdC8vIFx0LyB0aGlzLmltYWdlLmhlaWdodDtcblxuXHRcdFx0Ly8gdGhpcy52ZXJ0aWNlc1t0aGlzLmJveGVzLmZyYW1lc1tpXS5maWxlbmFtZV0gPSB7XG5cdFx0XHQvLyBcdHUxLHYxLHUyLHYyXG5cdFx0XHQvLyB9O1xuXHRcdH1cblxuXHRcdHJldHVybiBQcm9taXNlLmFsbChmcmFtZVByb21pc2VzKTtcblx0fVxuXG5cdGdldFZlcnRpY2VzKGZpbGVuYW1lKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMudmVydGljZXNbZmlsZW5hbWVdO1xuXHR9XG5cblx0Z2V0RnJhbWUoZmlsZW5hbWUpXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5mcmFtZXNbZmlsZW5hbWVdO1xuXHR9XG5cblx0Z2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpXG5cdHtcblx0XHRpZihBcnJheS5pc0FycmF5KGZyYW1lU2VsZWN0b3IpKVxuXHRcdHtcblx0XHRcdHJldHVybiBmcmFtZVNlbGVjdG9yLm1hcCgobmFtZSk9PnRoaXMuZ2V0RnJhbWUobmFtZSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmdldEZyYW1lc0J5UHJlZml4KGZyYW1lU2VsZWN0b3IpO1xuXHR9XG5cblx0Z2V0RnJhbWVzQnlQcmVmaXgocHJlZml4KVxuXHR7XG5cdFx0bGV0IGZyYW1lcyA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpIGluIHRoaXMuZnJhbWVzKVxuXHRcdHtcblx0XHRcdGlmKGkuc3Vic3RyaW5nKDAsIHByZWZpeC5sZW5ndGgpICE9PSBwcmVmaXgpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRmcmFtZXMucHVzaCh0aGlzLmZyYW1lc1tpXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZyYW1lcztcblx0fVxuXG5cdHN0YXRpYyBsb2FkVGV4dHVyZShnbDJkLCBpbWFnZVNyYylcblx0e1xuXHRcdGNvbnN0IGdsID0gZ2wyZC5jb250ZXh0O1xuXG5cdFx0aWYoIXRoaXMudGV4dHVyZVByb21pc2VzKVxuXHRcdHtcblx0XHRcdHRoaXMudGV4dHVyZVByb21pc2VzID0ge307XG5cdFx0fVxuXG5cdFx0aWYodGhpcy50ZXh0dXJlUHJvbWlzZXNbaW1hZ2VTcmNdKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnRleHR1cmVQcm9taXNlc1tpbWFnZVNyY107XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMudGV4dHVyZVByb21pc2VzW2ltYWdlU3JjXSA9IHRoaXMubG9hZEltYWdlKGltYWdlU3JjKS50aGVuKChpbWFnZSk9Pntcblx0XHRcdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG5cdFx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0XHQsIGltYWdlXG5cdFx0XHQpO1xuXG5cdFx0XHQvKi9cblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0XHQvKi9cblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLlJFUEVBVCk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5SRVBFQVQpO1xuXHRcdFx0Ly8qL1xuXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XHRcdFx0XG5cblx0XHRcdHJldHVybiB7aW1hZ2UsIHRleHR1cmV9XG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgbG9hZEltYWdlKHNyYylcblx0e1xuXHRcdGlmKCF0aGlzLmltYWdlUHJvbWlzZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5pbWFnZVByb21pc2VzID0ge307XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5pbWFnZVByb21pc2VzW3NyY10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdO1xuXHRcdH1cblxuXHRcdHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdID0gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KT0+e1xuXHRcdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdGltYWdlLnNyYyAgID0gc3JjO1xuXHRcdFx0aW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldmVudCk9Pntcblx0XHRcdFx0YWNjZXB0KGltYWdlKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4vQ2FtZXJhJztcblxuZXhwb3J0IGNsYXNzIFN1cmZhY2Vcbntcblx0Y29uc3RydWN0b3Ioc3ByaXRlQm9hcmQsIHNwcml0ZVNoZWV0LCBtYXAsIHhTaXplID0gMiwgeVNpemUgPSAyLCB4T2Zmc2V0ID0gMCwgeU9mZnNldCA9IDAsIGxheWVyID0gMCwgeiA9IC0xKVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IHNwcml0ZVNoZWV0O1xuXG5cdFx0dGhpcy54ICAgICAgID0geE9mZnNldDtcblx0XHR0aGlzLnkgICAgICAgPSB5T2Zmc2V0O1xuXHRcdHRoaXMueiAgICAgICA9IHo7XG5cblx0XHR0aGlzLmxheWVyICAgPSBsYXllcjtcblx0XHR0aGlzLnhTaXplICAgPSB4U2l6ZTtcblx0XHR0aGlzLnlTaXplICAgPSB5U2l6ZTtcblxuXHRcdHRoaXMudGlsZVdpZHRoICA9IDMyO1xuXHRcdHRoaXMudGlsZUhlaWdodCA9IDMyO1xuXG5cdFx0dGhpcy53aWR0aCAgID0gdGhpcy54U2l6ZSAqIHRoaXMudGlsZVdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ICA9IHRoaXMueVNpemUgKiB0aGlzLnRpbGVIZWlnaHQ7XG5cblx0XHR0aGlzLm1hcCA9IG1hcDtcblxuXHRcdHRoaXMudGV4VmVydGljZXMgPSBbXTtcblxuXHRcdGNvbnN0IGdsICA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0dGhpcy5zdWJUZXh0dXJlcyA9IHt9O1xuXG5cdFx0dGhpcy5sb2FkZWQgPSBmYWxzZTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQucmVhZHkudGhlbihzaGVldCA9PiB7XG5cdFx0XHRsZXQgdGV4dHVyZVByb21pc2VzID0gW107XG5cblx0XHRcdGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLnhTaXplICogdGhpcy55U2l6ZTsgaSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRsZXQgdmVydGljZXM7XG5cblx0XHRcdFx0bGV0IGxvY2FsWCAgPSBpICUgdGhpcy54U2l6ZTtcblx0XHRcdFx0bGV0IG9mZnNldFggPSBNYXRoLmZsb29yKHRoaXMueCAvIHRoaXMudGlsZVdpZHRoKTtcblx0XHRcdFx0bGV0IGdsb2JhbFggPSBsb2NhbFggKyBvZmZzZXRYO1xuXG5cdFx0XHRcdGxldCBsb2NhbFkgID0gTWF0aC5mbG9vcihpIC8gdGhpcy54U2l6ZSk7XG5cdFx0XHRcdGxldCBvZmZzZXRZID0gTWF0aC5mbG9vcih0aGlzLnkgLyB0aGlzLnRpbGVIZWlnaHQpO1xuXHRcdFx0XHRsZXQgZ2xvYmFsWSA9IGxvY2FsWSArIG9mZnNldFk7XG5cblx0XHRcdFx0bGV0IGZyYW1lcyA9IGkgPiAxMFxuXHRcdFx0XHRcdD8gdGhpcy5tYXAuZ2V0VGlsZShnbG9iYWxYLCBnbG9iYWxZLCB0aGlzLmxheWVyKVxuXHRcdFx0XHRcdDogdGhpcy5tYXAuZ2V0VGlsZSgtMSwgLTEsIHRoaXMubGF5ZXIpO1xuXG5cdFx0XHRcdGlmKEFycmF5LmlzQXJyYXkoZnJhbWVzKSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxldCBqID0gMDtcblx0XHRcdFx0XHR0aGlzLnN1YlRleHR1cmVzW2ldID0gW107XG5cblx0XHRcdFx0XHR0ZXh0dXJlUHJvbWlzZXMucHVzaCggUHJvbWlzZS5hbGwoZnJhbWVzLm1hcCgoZnJhbWUpPT5cblx0XHRcdFx0XHRcdHRoaXMuc3ByaXRlU2hlZXQuY29uc3RydWN0b3IubG9hZFRleHR1cmUodGhpcy5zcHJpdGVCb2FyZC5nbDJkLCBmcmFtZSkudGhlbihcblx0XHRcdFx0XHRcdFx0YXJncyA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zdWJUZXh0dXJlc1tpXVtqXSA9IGFyZ3MudGV4dHVyZTtcblx0XHRcdFx0XHRcdFx0XHRqKys7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHQpKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGV4dHVyZVByb21pc2VzLnB1c2goXG5cdFx0XHRcdFx0XHR0aGlzLnNwcml0ZVNoZWV0LmNvbnN0cnVjdG9yLmxvYWRUZXh0dXJlKGdsMmQsIGZyYW1lcykudGhlbihcblx0XHRcdFx0XHRcdFx0YXJncyA9PiB0aGlzLnN1YlRleHR1cmVzW2ldID0gYXJncy50ZXh0dXJlXG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRQcm9taXNlLmFsbCh0ZXh0dXJlUHJvbWlzZXMpLnRoZW4oKCk9Pntcblx0XHRcdFx0dGhpcy5hc3NlbWJsZSgpO1xuXG5cdFx0XHRcdHRoaXMubG9hZGVkID0gdHJ1ZTtcblx0XHRcdH0pO1xuXG5cdFx0fSk7XG5cblx0XHR0aGlzLnBhbmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnBhbmUpO1xuXG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbnVsbFxuXHRcdCk7XG5cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblxuXHRcdC8vKi9cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdC8qL1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5MSU5FQVIpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5MSU5FQVIpO1xuXHRcdC8vKi9cblxuXHRcdHRoaXMuZnJhbWVCdWZmZXIgPSBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmZyYW1lQnVmZmVyKTtcblxuXHRcdGNvbnN0IGF0dGFjaG1lbnRQb2ludCA9IGdsLkNPTE9SX0FUVEFDSE1FTlQwO1xuXG5cdFx0Z2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoXG5cdFx0XHRnbC5GUkFNRUJVRkZFUlxuXHRcdFx0LCBhdHRhY2htZW50UG9pbnRcblx0XHRcdCwgZ2wuVEVYVFVSRV8yRFxuXHRcdFx0LCB0aGlzLnBhbmVcblx0XHRcdCwgMFxuXHRcdCk7XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnBhbmUpO1xuXG5cdFx0Y29uc3QgeCA9IHRoaXMueCArIC1DYW1lcmEueCArIChDYW1lcmEud2lkdGggICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAvIDIpO1xuXHRcdGNvbnN0IHkgPSB0aGlzLnkgKyAtQ2FtZXJhLnkgKyAoQ2FtZXJhLmhlaWdodCAgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsIC8gMik7XG5cblx0XHR0aGlzLnNldFJlY3RhbmdsZShcblx0XHRcdHhcblx0XHRcdCwgeVxuXHRcdFx0LCB0aGlzLndpZHRoICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCB0aGlzLmhlaWdodCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWxcblx0XHQpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcblx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cdH1cblxuXHRhc3NlbWJsZSgpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5mcmFtZUJ1ZmZlcik7XG5cdFx0Z2wudmlld3BvcnQoMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuXHRcdC8vIGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMSk7XG5cdFx0Z2wuY2xlYXJDb2xvcihNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpLCAxKTtcblx0XHRnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUIHwgZ2wuREVQVEhfQlVGRkVSX0JJVCk7XG5cblx0XHRnbC51bmlmb3JtNGYoXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmNvbG9yTG9jYXRpb25cblx0XHRcdCwgMVxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMVxuXHRcdCk7XG5cblx0XHRnbC51bmlmb3JtMmYoXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc29sdXRpb25Mb2NhdGlvblxuXHRcdFx0LCB0aGlzLndpZHRoXG5cdFx0XHQsIHRoaXMuaGVpZ2h0XG5cdFx0KTtcblxuXHRcdGlmKHRoaXMuc3ViVGV4dHVyZXNbMF1bMF0pXG5cdFx0e1xuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5zdWJUZXh0dXJlc1swXVswXSk7XG5cdFx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC50ZXhDb29yZEJ1ZmZlcik7XG5cdFx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHRcdDAuMCwgICAgICAgICAgICAgIDAuMCxcblx0XHRcdFx0dGhpcy53aWR0aCAvIDMyLCAgMC4wLFxuXHRcdFx0XHQwLjAsICAgICAgICAgICAgICAtdGhpcy5oZWlnaHQgLyAzMixcblx0XHRcdFx0MC4wLCAgICAgICAgICAgICAgLXRoaXMuaGVpZ2h0IC8gMzIsXG5cdFx0XHRcdHRoaXMud2lkdGggLyAzMiwgIDAuMCxcblx0XHRcdFx0dGhpcy53aWR0aCAvIDMyLCAgLXRoaXMuaGVpZ2h0IC8gMzIsXG5cdFx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cdFx0XHR0aGlzLnNldFJlY3RhbmdsZShcblx0XHRcdFx0MFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCB0aGlzLndpZHRoXG5cdFx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHRcdCk7XG5cblx0XHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblx0XHR9XG5cblx0XHRsZXQgeCA9IDA7XG5cdFx0bGV0IHkgPSAwO1xuXG5cdFx0Zm9yKGxldCBpIGluIHRoaXMuc3ViVGV4dHVyZXMpXG5cdFx0e1xuXHRcdFx0aWYoIUFycmF5LmlzQXJyYXkodGhpcy5zdWJUZXh0dXJlc1tpXSkpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuc3ViVGV4dHVyZXNbaV0gPSBbdGhpcy5zdWJUZXh0dXJlc1tpXV07XG5cdFx0XHR9XG5cblx0XHRcdGZvcihsZXQgaiBpbiB0aGlzLnN1YlRleHR1cmVzW2ldKVxuXHRcdFx0e1xuXHRcdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnN1YlRleHR1cmVzW2ldW2pdKTtcblx0XHRcdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQudGV4Q29vcmRCdWZmZXIpO1xuXHRcdFx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHRcdFx0MC4wLCAwLjAsXG5cdFx0XHRcdFx0MS4wLCAwLjAsXG5cdFx0XHRcdFx0MC4wLCAxLjAsXG5cdFx0XHRcdFx0MC4wLCAxLjAsXG5cdFx0XHRcdFx0MS4wLCAwLjAsXG5cdFx0XHRcdFx0MS4wLCAxLjAsXG5cdFx0XHRcdF0pLCBnbC5TVEFUSUNfRFJBVyk7XG5cblx0XHRcdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHRcdFx0eFxuXHRcdFx0XHRcdCwgeSArIHRoaXMudGlsZUhlaWdodFxuXHRcdFx0XHRcdCwgdGhpcy50aWxlV2lkdGhcblx0XHRcdFx0XHQsIC10aGlzLnRpbGVIZWlnaHRcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cdFx0XHR9XG5cblx0XHRcdHggKz0gdGhpcy50aWxlV2lkdGg7XG5cblx0XHRcdGlmKHggPj0gdGhpcy53aWR0aClcblx0XHRcdHtcblx0XHRcdFx0eCA9IDA7XG5cdFx0XHRcdHkgKz0gdGhpcy50aWxlSGVpZ2h0O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cdH1cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5wb3NpdGlvbkJ1ZmZlcik7XG5cblx0XHRjb25zdCB4MSA9IHg7XG5cdFx0Y29uc3QgeDIgPSAoeCArIHdpZHRoKTtcblx0XHRjb25zdCB5MSA9IHk7XG5cdFx0Y29uc3QgeTIgPSAoeSArIGhlaWdodCk7XG5cblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSwgeTIsIHRoaXMueixcblx0XHRcdHgyLCB5MiwgdGhpcy56LFxuXHRcdFx0eDEsIHkxLCB0aGlzLnosXG5cdFx0XHR4MSwgeTEsIHRoaXMueixcblx0XHRcdHgyLCB5MiwgdGhpcy56LFxuXHRcdFx0eDIsIHkxLCB0aGlzLnosXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIFRleHR1cmVCYW5rXG57XG5cdFxufSIsIm1vZHVsZS5leHBvcnRzID0gXCIvLyB0ZXh0dXJlLmZyYWdaXFxuXFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudW5pZm9ybSB2ZWM0ICAgICAgdV9jb2xvcjtcXG51bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlO1xcbnZhcnlpbmcgdmVjMiAgICAgIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKCkge1xcbiAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHZfdGV4Q29vcmQpO1xcbiAgLy8gZ2xfRnJhZ0NvbG9yLncgPSBnbF9GcmFnQ29sb3IudyAqIDAuNTtcXG4gIC8vIGdsX0ZyYWdDb2xvciA9IHZlYzQoMS4wLDAuMCwxLjAsMS4wKTtcXG4gIC8vIGdsX0ZyYWdDb2xvciA9IGdsX1BvaW50Q29vcmQueXl4eDtcXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiLy8gdGV4dHVyZS52ZXJ0XFxuXFxuYXR0cmlidXRlIHZlYzMgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gICB2ZWMyIHVfcmVzb2x1dGlvbjtcXG5cXG52YXJ5aW5nICAgdmVjMiB2X3RleENvb3JkO1xcblxcbnZvaWQgbWFpbigpXFxue1xcbiAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uLnh5IC8gdV9yZXNvbHV0aW9uO1xcbiAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7XFxuICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDtcXG5cXG4gIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7XFxuICB2X3RleENvb3JkICA9IGFfdGV4Q29vcmQ7XFxufVxcblwiIiwiaW1wb3J0IHsgVmlldyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1ZpZXcnO1xuXG5leHBvcnQgY2xhc3MgQ29udHJvbGxlciBleHRlbmRzIFZpZXdcbntcblx0Y29uc3RydWN0b3IoYXJncylcblx0e1xuXHRcdHN1cGVyKGFyZ3MpO1xuXHRcdHRoaXMudGVtcGxhdGUgID0gcmVxdWlyZSgnLi9jb250cm9sbGVyLnRtcCcpO1xuXHRcdHRoaXMuZHJhZ1N0YXJ0ID0gZmFsc2U7XG5cblx0XHR0aGlzLmFyZ3MuZHJhZ2dpbmcgID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnggPSAwO1xuXHRcdHRoaXMuYXJncy55ID0gMDtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMubW92ZVN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLmRyb3BTdGljayhldmVudCk7XG5cdFx0fSk7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLm1vdmVTdGljayhldmVudCk7XG5cdFx0fSk7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMuZHJvcFN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblx0fVxuXG5cdGRyYWdTdGljayhldmVudClcblx0e1xuXHRcdGxldCBwb3MgPSBldmVudDtcblxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRpZihldmVudC50b3VjaGVzICYmIGV2ZW50LnRvdWNoZXNbMF0pXG5cdFx0e1xuXHRcdFx0cG9zID0gZXZlbnQudG91Y2hlc1swXTtcblx0XHR9XG5cblx0XHR0aGlzLmFyZ3MuZHJhZ2dpbmcgPSB0cnVlO1xuXHRcdHRoaXMuZHJhZ1N0YXJ0ICAgICA9IHtcblx0XHRcdHg6ICAgcG9zLmNsaWVudFhcblx0XHRcdCwgeTogcG9zLmNsaWVudFlcblx0XHR9O1xuXHR9XG5cblx0bW92ZVN0aWNrKGV2ZW50KVxuXHR7XG5cdFx0aWYodGhpcy5hcmdzLmRyYWdnaW5nKVxuXHRcdHtcblx0XHRcdGxldCBwb3MgPSBldmVudDtcblxuXHRcdFx0aWYoZXZlbnQudG91Y2hlcyAmJiBldmVudC50b3VjaGVzWzBdKVxuXHRcdFx0e1xuXHRcdFx0XHRwb3MgPSBldmVudC50b3VjaGVzWzBdO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFyZ3MueHggPSBwb3MuY2xpZW50WCAtIHRoaXMuZHJhZ1N0YXJ0Lng7XG5cdFx0XHR0aGlzLmFyZ3MueXkgPSBwb3MuY2xpZW50WSAtIHRoaXMuZHJhZ1N0YXJ0Lnk7XG5cblx0XHRcdGNvbnN0IGxpbWl0ID0gNTA7XG5cblx0XHRcdGlmKHRoaXMuYXJncy54eCA8IC1saW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnggPSAtbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHRoaXMuYXJncy54eCA+IGxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IGxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IHRoaXMuYXJncy54eDtcblx0XHRcdH1cblxuXHRcdFx0aWYodGhpcy5hcmdzLnl5IDwgLWxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueSA9IC1saW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYodGhpcy5hcmdzLnl5ID4gbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gdGhpcy5hcmdzLnl5O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGRyb3BTdGljayhldmVudClcblx0e1xuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyA9IGZhbHNlO1xuXHRcdHRoaXMuYXJncy54ID0gMDtcblx0XHR0aGlzLmFyZ3MueSA9IDA7XG5cdH1cbn1cbiIsImltcG9ydCB7IFZpZXcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9WaWV3JztcblxuZXhwb3J0IGNsYXNzIE1hcEVkaXRvciBleHRlbmRzIFZpZXdcbntcblx0Y29uc3RydWN0b3IoYXJncylcblx0e1xuXHRcdHN1cGVyKGFyZ3MpO1xuXHRcdHRoaXMudGVtcGxhdGUgID0gcmVxdWlyZSgnLi9tYXBFZGl0b3IudG1wJyk7XG5cblx0XHRhcmdzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oKHNoZWV0KT0+e1xuXHRcdFx0dGhpcy5hcmdzLnRpbGVzID0gc2hlZXQuZnJhbWVzO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5hcmdzLmJpbmRUbygnc2VsZWN0ZWRHcmFwaGljJywgKHYpPT57XG5cdFx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRHcmFwaGljID0gbnVsbDtcblx0XHR9LCB7d2FpdDowfSk7XG5cblx0XHR0aGlzLmFyZ3MubXVsdGlTZWxlY3QgICA9IGZhbHNlO1xuXHRcdHRoaXMuYXJncy5zZWxlY3Rpb24gICAgID0ge307XG5cdFx0dGhpcy5hcmdzLnNlbGVjdGVkSW1hZ2UgPSBudWxsXG5cdH1cblxuXHRzZWxlY3RHcmFwaGljKHNyYylcblx0e1xuXHRcdGNvbnNvbGUubG9nKHNyYyk7XG5cblx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRHcmFwaGljID0gc3JjO1xuXHR9XG5cblx0c2VsZWN0KHNlbGVjdGlvbilcblx0e1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5hcmdzLnNlbGVjdGlvbiwgc2VsZWN0aW9uKTtcblxuXHRcdGlmKHNlbGVjdGlvbi5nbG9iYWxYICE9PSBzZWxlY3Rpb24uc3RhcnRHbG9iYWxYXG5cdFx0XHR8fCBzZWxlY3Rpb24uZ2xvYmFsWSAhPT0gc2VsZWN0aW9uLnN0YXJ0R2xvYmFsWVxuXHRcdCl7XG5cdFx0XHR0aGlzLmFyZ3MubXVsdGlTZWxlY3QgPSB0cnVlO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5hcmdzLm11bHRpU2VsZWN0ID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYoIXRoaXMuYXJncy5tdWx0aVNlbGVjdClcblx0XHR7XG5cdFx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRJbWFnZXMgPSB0aGlzLmFyZ3MubWFwLmdldFRpbGUoc2VsZWN0aW9uLmdsb2JhbFgsIHNlbGVjdGlvbi5nbG9iYWxZKTtcblx0XHR9XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzID0gXFxcImNvbnRyb2xsZXJcXFwiPlxcblxcdDxkaXYgY2xhc3MgPSBcXFwiam95c3RpY2tcXFwiIGN2LW9uID0gXFxcIlxcblxcdFxcdHRvdWNoc3RhcnQ6ZHJhZ1N0aWNrKGV2ZW50KTtcXG5cXHRcXHRtb3VzZWRvd246ZHJhZ1N0aWNrKGV2ZW50KTtcXG5cXHRcXFwiPlxcblxcdFxcdDxkaXYgY2xhc3MgPSBcXFwicGFkXFxcIiBzdHlsZSA9IFxcXCJwb3NpdGlvbjogcmVsYXRpdmU7IHRyYW5zZm9ybTp0cmFuc2xhdGUoW1t4XV1weCxbW3ldXXB4KTtcXFwiPjwvZGl2PlxcblxcdDwvZGl2PlxcblxcblxcdDxkaXYgY2xhc3MgPSBcXFwiYnV0dG9uXFxcIj5BPC9kaXY+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJidXR0b25cXFwiPkI8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImJ1dHRvblxcXCI+QzwvZGl2PlxcbjwvZGl2PlwiIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3MgPSBcXFwidGFiLXBhZ2UgbWFwRWRpdG9yXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRhYnNcXFwiPlxcblxcdFxcdDxkaXY+VGlsZTwvZGl2PlxcblxcdFxcdDxkaXY+TGF5ZXI8L2Rpdj5cXG5cXHRcXHQ8ZGl2Pk9iamVjdDwvZGl2PlxcblxcdFxcdDxkaXY+VHJpZ2dlcjwvZGl2PlxcblxcdFxcdDxkaXY+TWFwPC9kaXY+XFxuXFx0PC9kaXY+XFxuXFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5cXG5cXHRcXHQ8ZGl2IGNsYXNzID0gXFxcInNlbGVjdGVkXFxcIj5cXG5cXHRcXHRcXHQ8ZGl2IGN2LWlmID0gXFxcIiFtdWx0aVNlbGVjdFxcXCI+XFxuXFx0XFx0XFx0XFx0PHAgc3R5bGUgPSBcXFwiZm9udC1zaXplOiBsYXJnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0KFtbc2VsZWN0aW9uLmdsb2JhbFhdXSwgW1tzZWxlY3Rpb24uZ2xvYmFsWV1dKVxcblxcdFxcdFxcdFxcdDwvcD5cXG5cXHRcXHRcXHRcXHQ8cCBjdi1lYWNoID0gXFxcInNlbGVjdGVkSW1hZ2VzOnNlbGVjdGVkSW1hZ2U6c0lcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxidXR0b24+LTwvYnV0dG9uPlxcblxcdFxcdFxcdFxcdFxcdDxpbWcgY2xhc3MgPSBcXFwiY3VycmVudFxcXCIgY3YtYXR0ciA9IFxcXCJzcmM6c2VsZWN0ZWRJbWFnZVxcXCI+XFxuXFx0XFx0XFx0XFx0PC9wPlxcblxcdFxcdFxcdFxcdDxidXR0b24+KzwvYnV0dG9uPlxcblxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdDxkaXYgY3YtaWYgPSBcXFwibXVsdGlTZWxlY3RcXFwiPlxcblxcdFxcdFxcdFxcdDxwIHN0eWxlID0gXFxcImZvbnQtc2l6ZTogbGFyZ2VcXFwiPlxcblxcdFxcdFxcdFxcdFxcdChbW3NlbGVjdGlvbi5zdGFydEdsb2JhbFhdXSwgW1tzZWxlY3Rpb24uc3RhcnRHbG9iYWxZXV0pIC0gKFtbc2VsZWN0aW9uLmdsb2JhbFhdXSwgW1tzZWxlY3Rpb24uZ2xvYmFsWV1dKVxcblxcdFxcdFxcdFxcdDwvcD5cXG5cXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHQ8L2Rpdj5cXG5cXHRcXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVzXFxcIiBjdi1lYWNoID0gXFxcInRpbGVzOnRpbGU6dFxcXCI+XFxuXFx0XFx0XFx0PGltZyBjdi1hdHRyID0gXFxcInNyYzp0aWxlLHRpdGxlOnRcXFwiIGN2LW9uID0gXFxcImNsaWNrOnNlbGVjdEdyYXBoaWModCk7XFxcIj5cXG5cXHRcXHQ8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG5cXHQ8IS0tIDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+T0JKRUNUIE1PREU8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVcXFwiPlRSSUdHRVIgTU9ERTwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+TUFQIE1PREU8L2Rpdj4gLS0+XFxuPC9kaXY+XCIiLCJpbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlJztcblxuZXhwb3J0IGNsYXNzIEZsb29yXG57XG5cdGNvbnN0cnVjdG9yKGdsMmQsIGFyZ3MpXG5cdHtcblx0XHR0aGlzLmdsMmQgICA9IGdsMmQ7XG5cdFx0dGhpcy5zcHJpdGVzID0gW107XG5cblx0XHQvLyB0aGlzLnJlc2l6ZSg2MCwgMzQpO1xuXHRcdHRoaXMucmVzaXplKDksIDkpO1xuXHRcdC8vIHRoaXMucmVzaXplKDYwKjIsIDM0KjIpO1xuXHR9XG5cblx0cmVzaXplKHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHR0aGlzLndpZHRoICA9IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0Zm9yKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspXG5cdFx0e1xuXHRcdFx0Zm9yKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBzcHJpdGUgPSBuZXcgU3ByaXRlKHRoaXMuZ2wyZCwgJy9mbG9vclRpbGUucG5nJyk7XG5cblx0XHRcdFx0c3ByaXRlLnggPSAzMiAqIHg7XG5cdFx0XHRcdHNwcml0ZS55ID0gMzIgKiB5O1xuXG5cdFx0XHRcdHRoaXMuc3ByaXRlcy5wdXNoKHNwcml0ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHR0aGlzLnNwcml0ZXMubWFwKHMgPT4gcy5kcmF3KCkpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGVTaGVldCc7XG5pbXBvcnQgeyBJbmplY3RhYmxlICB9IGZyb20gJy4uL2luamVjdC9JbmplY3RhYmxlJztcbmltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuXG5leHBvcnQgIGNsYXNzIE1hcFxuZXh0ZW5kcyBJbmplY3RhYmxlLmluamVjdCh7U3ByaXRlU2hlZXR9KVxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cblx0XHR0aGlzLnRpbGVzID0ge307XG5cdH1cblxuXHRnZXRUaWxlKHgsIHksIGxheWVyID0gMClcblx0e1xuXHRcdGlmKHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSlcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0bGV0IHNwbGl0ID0gNDtcblx0XHRsZXQgc2Vjb25kID0gJ3JvY2tfNC5wbmcnO1xuXG5cdFx0aWYoKHggJSBzcGxpdCA9PT0gMCkgJiYgKHkgJSBzcGxpdCA9PT0gMCkpXG5cdFx0e1xuXHRcdFx0c2Vjb25kID0gJ2NoZWVzZS5wbmcnXG5cdFx0fVxuXG5cdFx0aWYoeCA9PT0gLTEgJiYgeSA9PT0gLTEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0Ly8gdGhpcy5TcHJpdGVTaGVldC5nZXRGcmFtZSgnZmxvb3JUaWxlLnBuZycpXG5cdFx0XHRcdHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2JveF9mYWNlLnBuZycpXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdHJldHVybiBbXG5cdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKCdmbG9vclRpbGUucG5nJylcblx0XHRcdC8vIHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2JveF9mYWNlLnBuZycpXG5cdFx0XTtcblxuXHRcdHJldHVybiBbXG5cdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKCdmbG9vclRpbGUucG5nJylcblx0XHRcdCwgdGhpcy5TcHJpdGVTaGVldC5nZXRGcmFtZShzZWNvbmQpXG5cdFx0XTtcblx0fVxuXG5cdHNldFRpbGUoeCwgeSwgaW1hZ2UsIGxheWVyID0gMClcblx0e1xuXHRcdHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSA9IGltYWdlO1xuXHR9XG5cblx0ZXhwb3J0KClcblx0e1xuXHRcdGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRoaXMudGlsZXMpKTtcblx0fVxuXG5cdGltcG9ydChpbnB1dClcblx0e1xuXHRcdGlucHV0ID0gYHtcIi0yLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCIsXCItMSwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wiLFwiMCwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wifWA7XG5cblx0XHR0aGlzLnRpbGVzID0gSlNPTi5wYXJzZShpbnB1dCk7XG5cblx0XHQvLyBjb25zb2xlLmxvZyhKU09OLnBhcnNlKGlucHV0KSk7XG5cdH1cbn1cblxuXG4vLyB7XCItMiwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wiLFwiLTEsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIixcIjAsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIn0iLCIvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBXZWJTb2NrZXQgPSB3aW5kb3cuV2ViU29ja2V0IHx8IHdpbmRvdy5Nb3pXZWJTb2NrZXQ7XG4gIHZhciBiciA9IHdpbmRvdy5icnVuY2ggPSAod2luZG93LmJydW5jaCB8fCB7fSk7XG4gIHZhciBhciA9IGJyWydhdXRvLXJlbG9hZCddID0gKGJyWydhdXRvLXJlbG9hZCddIHx8IHt9KTtcbiAgaWYgKCFXZWJTb2NrZXQgfHwgYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgaWYgKHdpbmRvdy5fYXIpIHJldHVybjtcbiAgd2luZG93Ll9hciA9IHRydWU7XG5cbiAgdmFyIGNhY2hlQnVzdGVyID0gZnVuY3Rpb24odXJsKXtcbiAgICB2YXIgZGF0ZSA9IE1hdGgucm91bmQoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgdXJsID0gdXJsLnJlcGxhY2UoLyhcXCZ8XFxcXD8pY2FjaGVCdXN0ZXI9XFxkKi8sICcnKTtcbiAgICByZXR1cm4gdXJsICsgKHVybC5pbmRleE9mKCc/JykgPj0gMCA/ICcmJyA6ICc/JykgKydjYWNoZUJ1c3Rlcj0nICsgZGF0ZTtcbiAgfTtcblxuICB2YXIgYnJvd3NlciA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKTtcbiAgdmFyIGZvcmNlUmVwYWludCA9IGFyLmZvcmNlUmVwYWludCB8fCBicm93c2VyLmluZGV4T2YoJ2Nocm9tZScpID4gLTE7XG5cbiAgdmFyIHJlbG9hZGVycyA9IHtcbiAgICBwYWdlOiBmdW5jdGlvbigpe1xuICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcbiAgICB9LFxuXG4gICAgc3R5bGVzaGVldDogZnVuY3Rpb24oKXtcbiAgICAgIFtdLnNsaWNlXG4gICAgICAgIC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpbmtbcmVsPXN0eWxlc2hlZXRdJykpXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIHZhciB2YWwgPSBsaW5rLmdldEF0dHJpYnV0ZSgnZGF0YS1hdXRvcmVsb2FkJyk7XG4gICAgICAgICAgcmV0dXJuIGxpbmsuaHJlZiAmJiB2YWwgIT0gJ2ZhbHNlJztcbiAgICAgICAgfSlcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIGxpbmsuaHJlZiA9IGNhY2hlQnVzdGVyKGxpbmsuaHJlZik7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBIYWNrIHRvIGZvcmNlIHBhZ2UgcmVwYWludCBhZnRlciAyNW1zLlxuICAgICAgaWYgKGZvcmNlUmVwYWludCkgc2V0VGltZW91dChmdW5jdGlvbigpIHsgZG9jdW1lbnQuYm9keS5vZmZzZXRIZWlnaHQ7IH0sIDI1KTtcbiAgICB9LFxuXG4gICAgamF2YXNjcmlwdDogZnVuY3Rpb24oKXtcbiAgICAgIHZhciBzY3JpcHRzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQnKSk7XG4gICAgICB2YXIgdGV4dFNjcmlwdHMgPSBzY3JpcHRzLm1hcChmdW5jdGlvbihzY3JpcHQpIHsgcmV0dXJuIHNjcmlwdC50ZXh0IH0pLmZpbHRlcihmdW5jdGlvbih0ZXh0KSB7IHJldHVybiB0ZXh0Lmxlbmd0aCA+IDAgfSk7XG4gICAgICB2YXIgc3JjU2NyaXB0cyA9IHNjcmlwdHMuZmlsdGVyKGZ1bmN0aW9uKHNjcmlwdCkgeyByZXR1cm4gc2NyaXB0LnNyYyB9KTtcblxuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgYWxsID0gc3JjU2NyaXB0cy5sZW5ndGg7XG4gICAgICB2YXIgb25Mb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvYWRlZCA9IGxvYWRlZCArIDE7XG4gICAgICAgIGlmIChsb2FkZWQgPT09IGFsbCkge1xuICAgICAgICAgIHRleHRTY3JpcHRzLmZvckVhY2goZnVuY3Rpb24oc2NyaXB0KSB7IGV2YWwoc2NyaXB0KTsgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3JjU2NyaXB0c1xuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzY3JpcHQpIHtcbiAgICAgICAgICB2YXIgc3JjID0gc2NyaXB0LnNyYztcbiAgICAgICAgICBzY3JpcHQucmVtb3ZlKCk7XG4gICAgICAgICAgdmFyIG5ld1NjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICAgIG5ld1NjcmlwdC5zcmMgPSBjYWNoZUJ1c3RlcihzcmMpO1xuICAgICAgICAgIG5ld1NjcmlwdC5hc3luYyA9IHRydWU7XG4gICAgICAgICAgbmV3U2NyaXB0Lm9ubG9hZCA9IG9uTG9hZDtcbiAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKG5ld1NjcmlwdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfTtcbiAgdmFyIHBvcnQgPSBhci5wb3J0IHx8IDk0ODU7XG4gIHZhciBob3N0ID0gYnIuc2VydmVyIHx8IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSB8fCAnbG9jYWxob3N0JztcblxuICB2YXIgY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgV2ViU29ja2V0KCd3czovLycgKyBob3N0ICsgJzonICsgcG9ydCk7XG4gICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCl7XG4gICAgICBpZiAoYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgICAgIHZhciBtZXNzYWdlID0gZXZlbnQuZGF0YTtcbiAgICAgIHZhciByZWxvYWRlciA9IHJlbG9hZGVyc1ttZXNzYWdlXSB8fCByZWxvYWRlcnMucGFnZTtcbiAgICAgIHJlbG9hZGVyKCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuICAgICAgaWYgKGNvbm5lY3Rpb24ucmVhZHlTdGF0ZSkgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24oKXtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNvbm5lY3QsIDEwMDApO1xuICAgIH07XG4gIH07XG4gIGNvbm5lY3QoKTtcbn0pKCk7XG4vKiBqc2hpbnQgaWdub3JlOmVuZCAqL1xuIl19