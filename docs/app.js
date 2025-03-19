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

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = void 0;
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
var Config = exports.Config = /*#__PURE__*/_createClass(function Config() {
  _classCallCheck(this, Config);
});
;
Config.title = 'wgl2d';
// Config.
});

;require.register("gl2d/Gl2d.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Gl2d = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Program = /*#__PURE__*/function () {
  function Program(_ref) {
    var gl = _ref.gl,
      vertexShader = _ref.vertexShader,
      fragmentShader = _ref.fragmentShader,
      uniforms = _ref.uniforms,
      attributes = _ref.attributes;
    _classCallCheck(this, Program);
    _defineProperty(this, "context", null);
    _defineProperty(this, "program", null);
    _defineProperty(this, "attributes", {});
    _defineProperty(this, "buffers", {});
    _defineProperty(this, "uniforms", {});
    this.context = gl;
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    gl.detachShader(this.program, vertexShader);
    gl.detachShader(this.program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program));
      gl.deleteProgram(this.program);
    }
    var _iterator = _createForOfIteratorHelper(uniforms),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var uniform = _step.value;
        var location = gl.getUniformLocation(this.program, uniform);
        if (location === null) {
          console.warn("Uniform ".concat(uniform, " not found."));
          continue;
        }
        this.uniforms[uniform] = location;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    var _iterator2 = _createForOfIteratorHelper(attributes),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var attribute = _step2.value;
        var _location = gl.getAttribLocation(this.program, attribute);
        if (_location === null) {
          console.warn("Attribute ".concat(attribute, " not found."));
          continue;
        }
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(_location);
        gl.vertexAttribPointer(_location, 2, gl.FLOAT, false, 0, 0);
        this.attributes[attribute] = _location;
        this.buffers[attribute] = buffer;
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }
  return _createClass(Program, [{
    key: "use",
    value: function use() {
      this.context.useProgram(this.program);
    }
  }, {
    key: "uniformF",
    value: function uniformF(name) {
      var gl = this.context;
      for (var _len = arguments.length, floats = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        floats[_key - 1] = arguments[_key];
      }
      gl["uniform".concat(floats.length, "f")].apply(gl, [this.uniforms[name]].concat(floats));
    }
  }, {
    key: "uniformI",
    value: function uniformI(name) {
      var gl = this.context;
      for (var _len2 = arguments.length, ints = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        ints[_key2 - 1] = arguments[_key2];
      }
      gl["uniform".concat(ints.length, "i")].apply(gl, [this.uniforms[name]].concat(ints));
    }
  }]);
}();
var Gl2d = exports.Gl2d = /*#__PURE__*/function () {
  function Gl2d(element) {
    _classCallCheck(this, Gl2d);
    this.element = element || document.createElement('canvas');
    this.context = this.element.getContext('webgl');
    this.screenScale = 1;
    this.zoomLevel = 2;
  }
  return _createClass(Gl2d, [{
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
    value: function createProgram(_ref2) {
      var vertexShader = _ref2.vertexShader,
        fragmentShader = _ref2.fragmentShader,
        uniforms = _ref2.uniforms,
        attributes = _ref2.attributes;
      var gl = this.context;
      return new Program({
        gl: gl,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms,
        attributes: attributes
      });
    }
  }, {
    key: "createTexture",
    value: function createTexture(width, height) {
      var gl = this.context;
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return texture;
    }
  }, {
    key: "createFramebuffer",
    value: function createFramebuffer(texture) {
      var gl = this.context;
      var framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return framebuffer;
    }
  }, {
    key: "enableBlending",
    value: function enableBlending() {
      var gl = this.context;
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
    }
  }]);
}();
});

;require.register("home/View.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.View = void 0;
var _View = require("curvature/base/View");
var _Keyboard = require("curvature/input/Keyboard");
var _Bag = require("curvature/base/Bag");
var _Config = require("Config");
var _TileMap = require("../world/TileMap");
var _SpriteSheet = require("../sprite/SpriteSheet");
var _SpriteBoard = require("../sprite/SpriteBoard");
var _Controller = require("../ui/Controller");
var _MapEditor = require("../ui/MapEditor");
var _Entity = require("../model/Entity");
var _Camera = require("../sprite/Camera");
var _Controller2 = require("../model/Controller");
var _Sprite = require("../sprite/Sprite");
var _World = require("../world/World");
var _Quadtree = require("../math/Quadtree");
var _Rectangle = require("../math/Rectangle");
var _MTree = require("../math/MTree");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var Application = {};
Application.onScreenJoyPad = new _Controller.Controller();
Application.keyboard = _Keyboard.Keyboard.get();
var quad = new _Quadtree.Quadtree(0, 0, 100, 100, 0.25);
quad.insert({
  x: 10,
  y: 10
});
quad.insert({
  x: 20,
  y: 20
});
quad.insert({
  x: 20,
  y: 25
});
quad.insert({
  x: 25,
  y: 25
});

// console.log(quad);
// console.log(quad.findLeaf(75, 75));
// console.log(quad.select(0 , 0, 20, 20));

var mapTree = new _MTree.MTree();

// const rect1 = new Rectangle( 0, 0, 50,  20);
// const rect2 = new Rectangle(25, 0, 75,  10);
// const rect3 = new Rectangle(50, 0, 75,  10);
// const rect4 = new Rectangle(50, 0, 100, 100);
// const rect5 = new Rectangle(140, 0, 160, 0);
// console.log({rect1, rect2, rect3, rect4});
// mapTree.add(rect1);
// mapTree.add(rect2);
// mapTree.add(rect3);
// mapTree.add(rect4);
// mapTree.add(rect5);

// const xSize = 50;
// const ySize = 50;
// const xSpace = 25;
// const ySpace = 25;

// const rects = [];

// for(let i = 0; i < 10; i++)
// {
// 	for(let j = 0; j < 10; j++)
// 	{
// 		const rect = new Rectangle(
// 			i * xSpace, j * ySpace
// 			, i * xSpace + xSize, j * ySpace + ySize
// 		);

// 		mapTree.add(rect);

// 		rects.push(rect);
// 	}
// }

// // console.log(mapTree);
// console.log(mapTree.segments);
// console.log(mapTree.query(0, 0, 100, 100));

// for(const rect of rects)
// {
// 	mapTree.delete(rect);
// }

// console.log(mapTree.segments);
// console.log(mapTree.query(0, 0, 100, 100));
var View = exports.View = /*#__PURE__*/function (_BaseView) {
  function View(args) {
    var _this;
    _classCallCheck(this, View);
    window.smProfiling = true;
    _this = _callSuper(this, View, [args]);
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
    _this.world = new _World.World({
      src: './world.json'
    });
    _this.map = new _TileMap.TileMap({
      spriteSheet: _this.spriteSheet,
      src: './map.json'
    });
    _this.args.mapEditor = new _MapEditor.MapEditor({
      spriteSheet: _this.spriteSheet,
      world: _this.world,
      map: _this.map
    });
    return _this;
  }
  _inherits(View, _BaseView);
  return _createClass(View, [{
    key: "onRendered",
    value: function onRendered() {
      var _this2 = this;
      var spriteBoard = new _SpriteBoard.SpriteBoard({
        element: this.tags.canvas.element,
        world: this.world,
        map: this.map
      });
      this.spriteBoard = spriteBoard;
      var entity = new _Entity.Entity({
        sprite: new _Sprite.Sprite({
          x: 48,
          y: 64,
          src: undefined,
          spriteBoard: spriteBoard,
          spriteSheet: this.spriteSheet,
          width: 32,
          height: 48
        }),
        controller: new _Controller2.Controller({
          keyboard: this.keyboard,
          onScreenJoyPad: this.args.controller
        }),
        camera: _Camera.Camera
      });
      this.entities.add(entity);
      this.spriteBoard.sprites.add(entity.sprite);
      this.spriteBoard.following = entity;
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
      this.args.showEditor = false;
      window.addEventListener('resize', function () {
        return _this2.resize();
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
        });

        // this.spriteBoard.simulate();
        // this.args.localX  = this.spriteBoard.selected.localX;
        // this.args.localY  = this.spriteBoard.selected.localY;
        // this.args.globalX = this.spriteBoard.selected.globalX;
        // this.args.globalY = this.spriteBoard.selected.globalY;

        _this2.args._sps = 1 / delta;
        sSamples.push(_this2.args._sps);
        while (sSamples.length > maxSamples) {
          sSamples.shift();
        }

        // this.spriteBoard.moveCamera(sprite.x, sprite.y);
      };
      var _update = function update(now) {
        if (document.hidden) {
          window.requestAnimationFrame(_update);
          return;
        }
        simulate(performance.now());
        window.requestAnimationFrame(_update);
        _this2.spriteBoard.draw();
        var delta = now - fThen;
        fThen = now;
        _this2.args.fps = (1000 / delta).toFixed(3);
        _this2.args.camX = Number(_Camera.Camera.x).toFixed(3);
        _this2.args.camY = Number(_Camera.Camera.y).toFixed(3);
        if (_this2.spriteBoard.following) {
          _this2.args.posX = Number(_this2.spriteBoard.following.sprite.x).toFixed(3);
          _this2.args.posY = Number(_this2.spriteBoard.following.sprite.y).toFixed(3);
        }
      };
      this.spriteBoard.gl2d.zoomLevel = document.body.clientHeight / 1024 * 4;
      this.resize();
      _update(performance.now());

      // setInterval(()=>{
      // }, 0);

      setInterval(function () {
        document.title = "".concat(_Config.Config.title, " ").concat(_this2.args.fps, " FPS");
      }, 227 / 3);
      setInterval(function () {
        var sps = sSamples.reduce(function (a, b) {
          return a + b;
        }, 0) / sSamples.length;
        _this2.args.sps = sps.toFixed(3).padStart(5, ' ');
      }, 231 / 2);
    }
  }, {
    key: "resize",
    value: function resize(x, y) {
      this.args.width = this.tags.canvas.element.width = x || document.body.clientWidth;
      this.args.height = this.tags.canvas.element.height = y || document.body.clientHeight;
      this.args.rwidth = Math.trunc((x || document.body.clientWidth) / this.spriteBoard.gl2d.zoomLevel);
      this.args.rheight = Math.trunc((y || document.body.clientHeight) / this.spriteBoard.gl2d.zoomLevel);
      var oldScale = this.spriteBoard.gl2d.screenScale;
      this.spriteBoard.gl2d.screenScale = document.body.clientHeight / 1024;
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
      var min = this.spriteBoard.gl2d.screenScale * 0.2;
      var step = 0.05 * this.spriteBoard.gl2d.zoomLevel;
      var zoomLevel = (delta * step + this.spriteBoard.gl2d.zoomLevel).toFixed(2);
      if (zoomLevel < min) {
        zoomLevel = min;
      } else if (zoomLevel > max) {
        zoomLevel = max;
      }
      if (Math.abs(zoomLevel - 1) < 0.05) {
        zoomLevel = 1;
      }
      if (this.spriteBoard.gl2d.zoomLevel !== zoomLevel) {
        this.spriteBoard.gl2d.zoomLevel = zoomLevel;
        this.resize();
      }
    }
  }]);
}(_View.View);
});

;require.register("home/view.tmp.html", function(exports, require, module) {
module.exports = "<canvas\n\tcv-ref = \"canvas:curvature/base/Tag\"\n\tcv-on  = \"wheel:scroll(event);\"\n></canvas>\n<div class = \"hud fps\">\n [[sps]] simulations/s / [[simulationLock]]\n [[fps]] frames/s      / [[frameLock]]\n\n Res [[rwidth]] x [[rheight]]\n     [[width]] x [[height]]\n\n Cam [[camX]] x [[camY]]\n Pos [[posX]] x [[posY]]\n\n δ Sim:   Pg Up / Dn\n δ Frame: Home / End\n δ Scale: + / -\n\n</div>\n<div class = \"reticle\"></div>\n\n[[controller]]\n\n<div cv-if = \"showEditor\">\n\t[[mapEditor]]\n\t--\n\t[[mmm]]\n</span>\n"
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
} else {
  // document.write(require('./Fallback/fallback.tmp'));
}
});

;require.register("inject/Container.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Container = void 0;
var _Injectable2 = require("./Injectable");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var Container = exports.Container = /*#__PURE__*/function (_Injectable) {
  function Container() {
    _classCallCheck(this, Container);
    return _callSuper(this, Container, arguments);
  }
  _inherits(Container, _Injectable);
  return _createClass(Container, [{
    key: "inject",
    value: function inject(injections) {
      return new this.constructor(Object.assign({}, this, injections));
    }
  }]);
}(_Injectable2.Injectable);
});

;require.register("inject/Injectable.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Injectable = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var classes = {};
var objects = {};
var Injectable = exports.Injectable = /*#__PURE__*/function () {
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
  return _createClass(Injectable, null, [{
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
        function _class() {
          _classCallCheck(this, _class);
          return _callSuper(this, _class, arguments);
        }
        _inherits(_class, _this);
        return _createClass(_class, null, [{
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
      }(this);
    }
  }]);
}();
});

;require.register("inject/Single.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.single = exports.Single = void 0;
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
var Single = exports.Single = /*#__PURE__*/_createClass(function Single() {
  _classCallCheck(this, Single);
  this.name = 'sss.' + Math.random();
});
var single = exports.single = new Single();
});

require.register("math/MTree.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MTree = void 0;
var _Rectangle = require("./Rectangle");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Segment = /*#__PURE__*/function () {
  function Segment(start, end, prev) {
    var depth = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    _classCallCheck(this, Segment);
    this.start = start;
    this.end = end;
    this.depth = depth;
    this.size = 0;
    this.rectangles = new Set();
    this.subTree = depth < 1 ? new MTree(1 + depth) : null;
    this.prev = prev;
  }
  return _createClass(Segment, [{
    key: "split",
    value: function split(at) {
      if (at < this.start || at > this.end) {
        throw new RangeError('Splitting segment out of bounds!');
      }
      if (at === this.start) {
        return [this];
      }
      if (at === this.end) {
        return [this];
      }
      var a = new Segment(this.start, at, this.prev, this.depth);
      var b = new Segment(at, this.end, a, this.depth);
      var _iterator = _createForOfIteratorHelper(this.rectangles),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var rectangle = _step.value;
          var rectMin = this.depth === 0 ? rectangle.x1 : rectangle.y1;
          var rectMax = this.depth === 0 ? rectangle.x2 : rectangle.y2;
          if (rectMax < at) {
            a.add(rectangle);
            continue;
          }
          if (rectMin > at) {
            b.add(rectangle);
            continue;
          }
          a.add(rectangle);
          b.add(rectangle);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      return [a, b];
    }
  }, {
    key: "add",
    value: function add(rectangle) {
      if (this.subTree) {
        this.subTree.add(rectangle);
      }
      this.rectangles.add(rectangle);
      this.size = this.rectangles.size;
    }
  }, {
    key: "delete",
    value: function _delete(rectangle) {
      if (this.subTree) {
        this.subTree["delete"](rectangle);
      }
      this.rectangles["delete"](rectangle);
      this.size = this.rectangles.size;
      var empty = !this.rectangles.size && this.start > -Infinity;
      return empty;
    }
  }]);
}();
var MTree = exports.MTree = /*#__PURE__*/function () {
  function MTree() {
    var depth = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    _classCallCheck(this, MTree);
    this.depth = depth;
    this.segments = [new Segment(-Infinity, Infinity, null, this.depth)];
  }
  return _createClass(MTree, [{
    key: "add",
    value: function add(rectangle) {
      var rectMin = this.depth === 0 ? rectangle.x1 : rectangle.y1;
      var rectMax = this.depth === 0 ? rectangle.x2 : rectangle.y2;
      var startIndex = this.findSegment(rectMin);
      this.splitSegment(startIndex, rectMin);
      var endIndex = this.findSegment(rectMax);
      this.splitSegment(endIndex, rectMax);
      if (startIndex === endIndex) {
        this.segments[startIndex].add(rectangle);
        return;
      }
      for (var i = 1 + startIndex; i <= endIndex; i++) {
        this.segments[i].add(rectangle);
      }
    }
  }, {
    key: "delete",
    value: function _delete(rectangle) {
      var rectMin = this.depth === 0 ? rectangle.x1 : rectangle.y1;
      var rectMax = this.depth === 0 ? rectangle.x2 : rectangle.y2;
      var startIndex = this.findSegment(rectMin);
      var endIndex = this.findSegment(rectMax);
      var empty = [];
      for (var i = startIndex; i <= endIndex; i++) {
        if (this.segments[i]["delete"](rectangle)) {
          empty.push(i);
        }
      }
      for (var _i = -1 + empty.length; _i >= 0; _i--) {
        var e = empty[_i];
        if (!this.segments[-1 + e]) {
          throw new Error('Cannot delete segment without predecessor.');
        }
        this.segments[-1 + e].end = this.segments[e].end;
        this.segments[1 + e].prev = this.segments[-1 + e];
        this.segments.splice(e, 1);
      }
      if (this.segments.length === 2 && this.segments[0].size == 0 && this.segments[1].size === 0) {
        this.segments[0].end = this.segments[1].end;
        this.segments.length = 1;
      }
    }
  }, {
    key: "query",
    value: function query(x1, y1, x2, y2) {
      console.time('query time');
      var rectangles = new Set();
      var xStartIndex = this.findSegment(x1);
      var xEndIndex = this.findSegment(x2);
      for (var i = xStartIndex; i <= xEndIndex; i++) {
        var segment = this.segments[i];
        if (!segment.subTree) {
          continue;
        }
        var yStartIndex = segment.subTree.findSegment(y1);
        var yEndIndex = segment.subTree.findSegment(y2);
        for (var j = yStartIndex; j <= yEndIndex; j++) {
          var _iterator2 = _createForOfIteratorHelper(segment.subTree.segments[j].rectangles),
            _step2;
          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var rectangle = _step2.value;
              rectangles.add(rectangle);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      }
      console.timeEnd('query time');
      return rectangles;
    }
  }, {
    key: "splitSegment",
    value: function splitSegment(index, at) {
      var _this$segments;
      if (at <= this.segments[index].start || at >= this.segments[index].end) {
        return;
      }
      var splitSegments = this.segments[index].split(at);
      (_this$segments = this.segments).splice.apply(_this$segments, [index, 1].concat(_toConsumableArray(splitSegments)));
    }
  }, {
    key: "findSegment",
    value: function findSegment(at) {
      var lo = 0;
      var hi = -1 + this.segments.length;
      do {
        var current = Math.floor((lo + hi) * 0.5);
        var segment = this.segments[current];
        if (segment.start <= at && segment.end >= at) {
          return current;
        }
        if (segment.start < at) {
          lo = 1 + current;
        }
        if (segment.end > at) {
          hi = -1 + current;
        }
      } while (lo <= hi);
      return -1;
    }
  }]);
}();
});

;require.register("math/Quadtree.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Quadtree = void 0;
var _Rectangle2 = require("./Rectangle");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var Quadtree = exports.Quadtree = /*#__PURE__*/function (_Rectangle) {
  function Quadtree(x1, y1, x2, y2, minSize) {
    var _this;
    _classCallCheck(this, Quadtree);
    _this = _callSuper(this, Quadtree, [x1, y1, x2, y2]);
    _this.split = false;
    _this.items = new Set();
    _this.minSize = minSize;
    _this.ulCell = null;
    _this.urCell = null;
    _this.blCell = null;
    _this.brCell = null;
    return _this;
  }
  _inherits(Quadtree, _Rectangle);
  return _createClass(Quadtree, [{
    key: "insert",
    value: function insert(entity) {
      if (!this.contains(entity.x, entity.y)) {
        return;
      }
      var xSize = this.x2 - this.x1;
      var ySize = this.y2 - this.y1;
      if (this.items.size && xSize > this.minSize && ySize > this.minSize) {
        if (!this.split) {
          var xSizeHalf = 0.5 * xSize;
          var ySizeHalf = 0.5 * ySize;
          this.ulCell = new Quadtree(this.x1, this.y1, this.x1 + xSizeHalf, this.y1 + ySizeHalf, this.minSize);
          this.blCell = new Quadtree(this.x1, this.y1 + ySizeHalf, this.x1 + xSizeHalf, this.y2, this.minSize);
          this.urCell = new Quadtree(this.x1 + xSizeHalf, this.y1, this.x2, this.y1 + ySizeHalf, this.minSize);
          this.brCell = new Quadtree(this.x1 + xSizeHalf, this.y1 + ySizeHalf, this.x2, this.y2, this.minSize);
          this.split = true;
        }
        var _iterator = _createForOfIteratorHelper(this.items),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var item = _step.value;
            this.ulCell.insert(item);
            this.urCell.insert(item);
            this.blCell.insert(item);
            this.brCell.insert(item);
            this.items["delete"](item);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
        this.ulCell.insert(entity);
        this.urCell.insert(entity);
        this.blCell.insert(entity);
        this.brCell.insert(entity);
      } else {
        this.items.add(entity);
      }
    }
  }, {
    key: "findLeaf",
    value: function findLeaf(x, y) {
      var _ref, _ref2, _this$ulCell$findLeaf;
      if (!this.contains(x, y)) {
        return null;
      }
      if (!this.split) {
        return this;
      }
      return (_ref = (_ref2 = (_this$ulCell$findLeaf = this.ulCell.findLeaf(x, y)) !== null && _this$ulCell$findLeaf !== void 0 ? _this$ulCell$findLeaf : this.urCell.findLeaf(x, y)) !== null && _ref2 !== void 0 ? _ref2 : this.blCell.findLeaf(x, y)) !== null && _ref !== void 0 ? _ref : this.brCell.findLeaf(x, y);
    }
  }, {
    key: "has",
    value: function has(entity) {
      if (this.split) {
        return this.ulCell.has(entity) || this.urCell.has(entity) || this.blCell.has(entity) || this.brCell.has(entity);
      }
      return this.items.has(entity);
    }
  }, {
    key: "select",
    value: function select(x, y, w, h) {
      var xMax = x + w;
      var yMax = y + h;
      if (xMax < this.x1 || x > this.x2) {
        return new Set();
      }
      if (yMax < this.y1 || y > this.y2) {
        return new Set();
      }
      if (this.split) {
        return new Set([].concat(_toConsumableArray(this.ulCell.select(x, y, w, h)), _toConsumableArray(this.urCell.select(x, y, w, h)), _toConsumableArray(this.blCell.select(x, y, w, h)), _toConsumableArray(this.brCell.select(x, y, w, h))));
      }
      return this.items;
    }
  }, {
    key: "dump",
    value: function dump() {
      if (this.split) {
        return new Set([].concat(_toConsumableArray(this.ulCell.dump()), _toConsumableArray(this.urCell.dump()), _toConsumableArray(this.blCell.dump()), _toConsumableArray(this.brCell.dump())));
      }
      return this.items;
    }
  }]);
}(_Rectangle2.Rectangle);
});

;require.register("math/Rectangle.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Rectangle = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Rectangle = exports.Rectangle = /*#__PURE__*/function () {
  function Rectangle(x1, y1, x2, y2) {
    _classCallCheck(this, Rectangle);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
  return _createClass(Rectangle, [{
    key: "contains",
    value: function contains(x, y) {
      if (x < this.x1 || x > this.x2) {
        return false;
      }
      if (y < this.y1 || y > this.y2) {
        return false;
      }
      return true;
    }
  }, {
    key: "intersection",
    value: function intersection(other) {
      if (this.x1 > other.x2 || this.x2 < other.x1) {
        return;
      }
      if (this.y1 > other.y2 || this.y2 < other.y1) {
        return;
      }
      return new this.constructor(Math.max(this.x1, other.x1), Math.max(this.y1, other.y1), Math.min(this.x2, other.x2), Math.min(this.y2, other.y2));
    }
  }, {
    key: "isInside",
    value: function isInside(other) {
      return this.x1 <= other.x1 && this.y1 >= other.y1 && this.x2 >= other.x2 && this.y2 >= other.y2;
    }
  }, {
    key: "isOutside",
    value: function isOutside(other) {
      return other.isInside(this);
    }
  }, {
    key: "toTriangles",
    value: function toTriangles() {
      var dim = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 2;
      if (dim === 2) {
        return [this.x1, this.y1, this.x2, this.y1, this.x1, this.y2, this.x1, this.y2, this.x2, this.y1, this.x2, this.y2];
      }
      if (dim === 3) {
        return [this.x1, this.y1, 1, this.x2, this.y1, 1, this.x1, this.y2, 1, this.x1, this.y2, 1, this.x2, this.y1, 1, this.x2, this.y2, 1];
      }
      if (dim === 4) {
        return [this.x1, this.y1, 0, 1, this.x2, this.y1, 0, 1, this.x1, this.y2, 0, 1, this.x1, this.y2, 0, 1, this.x2, this.y1, 0, 1, this.x2, this.y2, 0, 1];
      }
      return [this.x1, this.y1].concat(_toConsumableArray(dim > 2 ? Array(-2 + dim).fill(0) : []), [this.x2, this.y1], _toConsumableArray(dim > 2 ? Array(-2 + dim).fill(0) : []), [this.x1, this.y2], _toConsumableArray(dim > 2 ? Array(-2 + dim).fill(0) : []), [this.x1, this.y2], _toConsumableArray(dim > 2 ? Array(-2 + dim).fill(0) : []), [this.x2, this.y1], _toConsumableArray(dim > 2 ? Array(-2 + dim).fill(0) : []), [this.x2, this.y2], _toConsumableArray(dim > 2 ? Array(-2 + dim).fill(0) : []));
    }
  }]);
}();
});

;require.register("math/Split.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Split = void 0;
var _Split;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Split = exports.Split = /*#__PURE__*/function () {
  function Split() {
    _classCallCheck(this, Split);
  }
  return _createClass(Split, null, [{
    key: "intToBytes",
    value: function intToBytes(value) {
      this.value[0] = value;
      return _toConsumableArray(this.bytes);
    }
  }]);
}();
_Split = Split;
_defineProperty(Split, "bytes", new Uint8ClampedArray(4));
_defineProperty(Split, "words", new Uint16Array(_Split.bytes.buffer));
_defineProperty(Split, "value", new Uint32Array(_Split.bytes.buffer));
});

;require.register("model/Controller.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Controller = void 0;
var _Bindable = require("curvature/base/Bindable");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Controller = exports.Controller = /*#__PURE__*/function () {
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
  return _createClass(Controller, [{
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
}();
});

;require.register("model/Entity.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Entity = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var fireRegion = [1, 0, 0];
var waterRegion = [0, 1, 1];
var Entity = exports.Entity = /*#__PURE__*/function () {
  function Entity(_ref) {
    var sprite = _ref.sprite,
      controller = _ref.controller,
      x = _ref.x,
      y = _ref.y;
    _classCallCheck(this, Entity);
    this.direction = 'south';
    this.state = 'standing';
    this.sprite = sprite;
    this.controller = controller;
    this.x = x;
    this.y = y;
    this.sprite.spriteBoard.renderMode = 0;
  }
  return _createClass(Entity, [{
    key: "create",
    value: function create() {}
  }, {
    key: "simulate",
    value: function simulate() {
      if (Math.trunc(performance.now() / 1000) % 15 === 0) {
        this.sprite.region = null;
      }
      if (Math.trunc(performance.now() / 1000) % 15 === 5) {
        this.sprite.region = waterRegion;
      }
      if (Math.trunc(performance.now() / 1000) % 15 === 10) {
        this.sprite.region = fireRegion;
      }
      var speed = 4;
      var xAxis = this.controller.axis[0] || 0;
      var yAxis = this.controller.axis[1] || 0;
      for (var t in this.controller.triggers) {
        if (!this.controller.triggers[t]) {
          continue;
        }
        this.sprite.spriteBoard.renderMode = t;
        if (t === '9') {
          var maps = this.sprite.spriteBoard.world.getMapsForPoint(this.sprite.x, this.sprite.y);
          console.log(maps);
        }
      }
      xAxis = Math.min(1, Math.max(xAxis, -1));
      yAxis = Math.min(1, Math.max(yAxis, -1));
      this.sprite.x += xAxis > 0 ? Math.ceil(speed * xAxis) : Math.floor(speed * xAxis);
      this.sprite.y += yAxis > 0 ? Math.ceil(speed * yAxis) : Math.floor(speed * yAxis);
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
      }

      // if(!xAxis && !yAxis)
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
}();
});

;require.register("overlay/overlay.frag", function(exports, require, module) {
module.exports = "precision mediump float;\n\nuniform vec4 u_color;\nvarying vec2 v_texCoord;\n\nvoid main() {\n  // gl_FragColor = texture2D(u_image, v_texCoord);\n  gl_FragColor = vec4(1.0, 1.0, 0.0, 0.25);\n}\n"
});

;require.register("overlay/overlay.vert", function(exports, require, module) {
module.exports = "attribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform vec2 u_resolution;\nvarying vec2 v_texCoord;\n\nvoid main()\n{\n  vec2 zeroToOne = a_position / u_resolution;\n  vec2 zeroToTwo = zeroToOne * 2.0;\n  vec2 clipSpace = zeroToTwo - 1.0;\n\n  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n  v_texCoord  = a_texCoord;\n}\n"
});

;require.register("sprite/Camera.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Camera = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Camera = exports.Camera = /*#__PURE__*/_createClass(function Camera() {
  _classCallCheck(this, Camera);
});
_defineProperty(Camera, "x", 0);
_defineProperty(Camera, "y", 0);
_defineProperty(Camera, "width", 0);
_defineProperty(Camera, "height", 0);
});

;require.register("sprite/MapRenderer.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MapRenderer = void 0;
var _Bindable = require("curvature/base/Bindable");
var _SpriteSheet = require("./SpriteSheet");
var _Split = require("../math/Split");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var MapRenderer = exports.MapRenderer = /*#__PURE__*/function () {
  function MapRenderer(_ref) {
    var _this = this;
    var spriteBoard = _ref.spriteBoard,
      map = _ref.map;
    _classCallCheck(this, MapRenderer);
    this[_Bindable.Bindable.Prevent] = true;
    this.spriteBoard = spriteBoard;
    this.spriteSheet = new _SpriteSheet.SpriteSheet();
    this.loaded = false;
    this.map = map;
    this.width = 0;
    this.height = 0;
    this.tileWidth = 0;
    this.tileHeight = 0;
    this.xOffset = 0;
    this.yOffset = 0;
    var gl = this.spriteBoard.gl2d.context;
    this.tileMapping = this.spriteBoard.gl2d.createTexture(1, 1);
    this.tileTexture = this.spriteBoard.gl2d.createTexture(1, 1);
    var r = function r() {
      return parseInt(Math.random() * 0xFF);
    };
    var pixel = new Uint8Array([r(), r(), r(), 0xFF]);
    map.ready.then(function () {
      _this.loaded = true;
      _this.tileWidth = map.tileWidth;
      _this.tileHeight = map.tileHeight;
      gl.bindTexture(gl.TEXTURE_2D, _this.tileTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, map.tileSetWidth, map.tileSetHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, map.pixels);
      gl.bindTexture(gl.TEXTURE_2D, null);
    });
  }
  return _createClass(MapRenderer, [{
    key: "negSafeMod",
    value: function negSafeMod(a, b) {
      if (a >= 0) return a % b;
      return (b + a % b) % b;
    }
  }, {
    key: "draw",
    value: function draw() {
      if (!this.loaded) {
        return;
      }
      var gl = this.spriteBoard.gl2d.context;
      var x = this.spriteBoard.following.sprite.x;
      var y = this.spriteBoard.following.sprite.y;
      var zoom = this.spriteBoard.gl2d.zoomLevel;
      var halfTileWidth = this.tileWidth * 0.5;
      var halfTileHeight = this.tileHeight * 0.5;
      var tilesWide = Math.floor(this.width / this.tileWidth);
      var tilesHigh = Math.floor(this.height / this.tileHeight);
      var xOffset = Math.floor(Math.floor(0.5 * this.width / 64) + 0) * 64;
      var yOffset = Math.floor(Math.floor(0.5 * this.height / 64) + 0) * 64;
      var xTile = (x + halfTileWidth) / this.tileWidth + -this.negSafeMod(x + halfTileWidth, 64) / this.tileWidth + -this.map.xWorld / this.tileWidth + -xOffset / this.tileWidth;
      var yTile = (y + halfTileHeight) / this.tileHeight + -this.negSafeMod(y + halfTileHeight, 64) / this.tileHeight + -this.map.yWorld / this.tileHeight + -yOffset / this.tileHeight;
      if (xTile + tilesWide < 0 || yTile + tilesHigh < 0) {
        return;
      }
      var xPos = zoom * ((this.width + this.xOffset) * 0.5 + -this.negSafeMod(x + halfTileWidth, 64) + -xOffset);
      var yPos = zoom * ((this.height + this.yOffset) * 0.5 + -this.negSafeMod(y + halfTileHeight, 64) + -yOffset);
      this.spriteBoard.drawProgram.uniformF('u_size', this.width, this.height);
      this.spriteBoard.drawProgram.uniformF('u_tileSize', this.tileWidth, this.tileHeight);
      this.spriteBoard.drawProgram.uniformF('u_mapTextureSize', this.map.tileSetWidth, this.map.tileSetHeight);
      this.spriteBoard.drawProgram.uniformI('u_renderTiles', 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
      this.spriteBoard.drawProgram.uniformI('u_tiles', 2);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.tileMapping);
      this.spriteBoard.drawProgram.uniformI('u_tileMapping', 3);
      var tilePixelLayers = this.map.getSlice(xTile, yTile, tilesWide, tilesHigh, performance.now() / 1000);
      var _iterator = _createForOfIteratorHelper(tilePixelLayers),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var tilePixels = _step.value;
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tilesWide, tilesHigh, 0, gl.RGBA, gl.UNSIGNED_BYTE, tilePixels);
          this.setRectangle(xPos + this.tileWidth * 0.5 * zoom, yPos + this.tileHeight * zoom, this.width * zoom, this.height * zoom);
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        // Cleanup...
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      this.spriteBoard.drawProgram.uniformI('u_renderTiles', 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }, {
    key: "resize",
    value: function resize(x, y) {
      this.width = x + 0;
      this.height = y + 0;
      this.width = Math.ceil(x / 128) * 128 + 128;
      this.height = Math.ceil(y / 128) * 128 + 128;
      this.xOffset = x - this.width;
      this.yOffset = y - this.height;
    }
  }, {
    key: "simulate",
    value: function simulate() {}
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      var gl = this.spriteBoard.gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
      var x1 = x;
      var x2 = x + width;
      var y1 = y;
      var y2 = y + height;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y2, x2, y2, x1, y1, x1, y1, x2, y2, x2, y1]), gl.STATIC_DRAW);
    }
  }]);
}();
});

;require.register("sprite/Parallax.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Parallax = void 0;
var _Bindable = require("curvature/base/Bindable");
var _Camera = require("./Camera");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var ParallaxLayer = /*#__PURE__*/_createClass(function ParallaxLayer() {
  _classCallCheck(this, ParallaxLayer);
  _defineProperty(this, "texture", null);
  _defineProperty(this, "width", 0);
  _defineProperty(this, "height", 0);
  _defineProperty(this, "offset", 0);
  _defineProperty(this, "parallax", 0);
});
var Parallax = exports.Parallax = /*#__PURE__*/function () {
  function Parallax(_ref) {
    var _this = this;
    var spriteBoard = _ref.spriteBoard,
      map = _ref.map;
    _classCallCheck(this, Parallax);
    this[_Bindable.Bindable.Prevent] = true;
    this.spriteBoard = spriteBoard;
    var gl = this.spriteBoard.gl2d.context;
    this.map = map;
    this.texture = null;
    this.height = 0;
    this.slices = ['parallax/mountains-0.png', 'parallax/sky-0-recolor.png', 'parallax/sky-1-recolor.png', 'parallax/sky-1b-recolor.png', 'parallax/sky-2-recolor.png'];
    this.parallaxLayers = [];
    this.textures = [];
    map.ready.then(function () {
      return _this.assemble(map);
    }).then(function () {
      _this.loaded = true;
    });
    this.loaded = false;
    this.x = 0;
    this.y = 0;
  }
  return _createClass(Parallax, [{
    key: "assemble",
    value: function assemble() {
      var _this2 = this;
      var gl = this.spriteBoard.gl2d.context;
      var loadSlices = this.map.imageLayers.map(function (layerData, index) {
        return _this2.constructor.loadImage(layerData.image).then(function (image) {
          var _layerData$offsety, _layerData$parallaxx;
          var texture = _this2.textures[index] = gl.createTexture();
          var layer = _this2.parallaxLayers[index] = new ParallaxLayer();
          var layerBottom = image.height + layerData.offsety;
          if (_this2.height < layerBottom) {
            _this2.height = layerBottom;
          }
          layer.texture = texture;
          layer.width = image.width;
          layer.height = image.height;
          layer.offset = (_layerData$offsety = layerData.offsety) !== null && _layerData$offsety !== void 0 ? _layerData$offsety : 0;
          layer.parallax = (_layerData$parallaxx = layerData.parallaxx) !== null && _layerData$parallaxx !== void 0 ? _layerData$parallaxx : 1;
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        });
      });
      return Promise.all(loadSlices);
    }
  }, {
    key: "draw",
    value: function draw() {
      if (!this.loaded) {
        return;
      }
      var gl = this.spriteBoard.gl2d.context;
      var zoom = this.spriteBoard.gl2d.zoomLevel;
      this.x = this.spriteBoard.following.sprite.x + -this.spriteBoard.width / zoom * 0.5;
      this.y = this.spriteBoard.following.sprite.y;
      this.spriteBoard.drawProgram.uniformI('u_renderParallax', 1);
      this.spriteBoard.drawProgram.uniformF('u_scroll', this.x, this.y);
      gl.activeTexture(gl.TEXTURE0);
      var _iterator = _createForOfIteratorHelper(this.parallaxLayers),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var layer = _step.value;
          gl.bindTexture(gl.TEXTURE_2D, layer.texture);
          this.spriteBoard.drawProgram.uniformF('u_size', layer.width, layer.width);
          this.spriteBoard.drawProgram.uniformF('u_parallax', layer.parallax, 0);
          this.setRectangle(0, this.spriteBoard.height + (-this.height + layer.offset) * zoom, layer.width * zoom, layer.height * zoom, layer.width);
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      this.spriteBoard.drawProgram.uniformI('u_renderParallax', 0);

      // Cleanup...
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      var gl = this.spriteBoard.gl2d.context;
      var ratio = this.spriteBoard.width / width;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, ratio, 0.0, 0.0, 1.0, 0.0, 1.0, ratio, 0.0, ratio, 1.0]), gl.STATIC_DRAW);
      var x1 = x - 0;
      var x2 = x + this.spriteBoard.width;
      var y1 = y;
      var y2 = y + height;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y2, x2, y2, x1, y1, x1, y1, x2, y2, x2, y1]), gl.STATIC_DRAW);
    }
  }], [{
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
}();
});

;require.register("sprite/Sprite.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Sprite = void 0;
var _Bindable = require("curvature/base/Bindable");
var _Camera = require("./Camera");
var _Split = require("../math/Split");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Sprite = exports.Sprite = /*#__PURE__*/function () {
  function Sprite(_ref) {
    var _this = this;
    var src = _ref.src,
      spriteBoard = _ref.spriteBoard,
      spriteSheet = _ref.spriteSheet,
      width = _ref.width,
      height = _ref.height,
      x = _ref.x,
      y = _ref.y,
      z = _ref.z;
    _classCallCheck(this, Sprite);
    this[_Bindable.Bindable.Prevent] = true;
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.width = 32 || width;
    this.height = 32 || height;
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
    this.region = [0, 0, 0, 1];
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
    var pixel = new Uint8Array([r(), r(), r(), 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    this.spriteSheet = spriteSheet;
    this.spriteSheet.ready.then(function (sheet) {
      var frame = _this.spriteSheet.getFrame(src);
      if (frame) {
        Sprite.loadTexture(_this.spriteBoard.gl2d, frame).then(function (args) {
          _this.texture = args.texture;
          _this.width = args.image.width * _this.scale;
          _this.height = args.image.height * _this.scale;
        });
      }
    });
  }
  return _createClass(Sprite, [{
    key: "draw",
    value: function draw() {
      var _this$spriteBoard$dra;
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
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);
      var zoom = this.spriteBoard.gl2d.zoomLevel;
      this.setRectangle(this.x * zoom + -_Camera.Camera.x + this.spriteBoard.width / 2, this.y * zoom + -_Camera.Camera.y + this.spriteBoard.height / 2 + -this.height * zoom, this.width * zoom, this.height * zoom);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      (_this$spriteBoard$dra = this.spriteBoard.drawProgram).uniformF.apply(_this$spriteBoard$dra, ['u_region'].concat(_toConsumableArray(Object.assign(this.region || [0, 0, 0], {
        3: 1
      }))));
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.effectBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

      // Cleanup...
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return;
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
      var loadTexture = function loadTexture(frame) {
        return Sprite.loadTexture(_this2.spriteBoard.gl2d, frame);
      };
      this.spriteSheet.ready.then(function (sheet) {
        var frames = sheet.getFrames(frameSelector).map(function (frame) {
          return loadTexture(frame).then(function (args) {
            return {
              texture: args.texture,
              width: args.image.width,
              height: args.image.height
            };
          });
        });
        Promise.all(frames).then(function (frames) {
          return _this2.frames = frames;
        });
      });
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      var transform = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];
      var gl = this.spriteBoard.gl2d.context;
      var zoom = this.spriteBoard.gl2d.zoomLevel;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
      var x1 = x;
      var y1 = y + 32 * zoom;
      var x2 = x + width;
      var y2 = y + height + 32 * zoom;
      var points = new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]);
      var xOff = x + width * 0.5;
      var yOff = y + height * 0.5;
      var t = this.matrixTransform(points, this.matrixComposite(this.matrixTranslate(xOff, yOff)
      // , this.matrixScale(Math.sin(theta), Math.cos(theta))
      // , this.matrixRotate(theta)
      , this.matrixTranslate(-xOff, -yOff)));
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
      gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
    }
  }, {
    key: "matrixIdentity",
    value: function matrixIdentity() {
      return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }
  }, {
    key: "matrixTranslate",
    value: function matrixTranslate(dx, dy) {
      return [[1, 0, dx], [0, 1, dy], [0, 0, 1]];
    }
  }, {
    key: "matrixScale",
    value: function matrixScale(dx, dy) {
      return [[dx, 0, 0], [0, dy, 0], [0, 0, 1]];
    }
  }, {
    key: "matrixRotate",
    value: function matrixRotate(theta) {
      var s = Math.sin(theta);
      var c = Math.cos(theta);
      return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
    }
  }, {
    key: "matrixShearX",
    value: function matrixShearX(s) {
      return [[1, s, 0], [0, 1, 0], [0, 0, 1]];
    }
  }, {
    key: "matrixShearY",
    value: function matrixShearY(s) {
      return [[1, 0, 0], [s, 1, 0], [0, 0, 1]];
    }
  }, {
    key: "matrixMultiply",
    value: function matrixMultiply(matA, matB) {
      if (matA.length !== matB.length) {
        throw new Error('Invalid matrices');
      }
      if (matA[0].length !== matB.length) {
        throw new Error('Incompatible matrices');
      }
      var output = Array(matA.length).fill().map(function () {
        return Array(matB[0].length).fill(0);
      });
      for (var i = 0; i < matA.length; i++) {
        for (var j = 0; j < matB[0].length; j++) {
          for (var k = 0; k < matA[0].length; k++) {
            output[i][j] += matA[i][k] * matB[k][j];
          }
        }
      }
      return output;
    }
  }, {
    key: "matrixComposite",
    value: function matrixComposite() {
      var output = this.matrixIdentity();
      for (var i = 0; i < arguments.length; i++) {
        output = this.matrixMultiply(output, i < 0 || arguments.length <= i ? undefined : arguments[i]);
      }
      return output;
    }
  }, {
    key: "matrixTransform",
    value: function matrixTransform(points, matrix) {
      var output = [];
      for (var i = 0; i < points.length; i += 2) {
        var point = [points[i], points[i + 1], 1];
        var _iterator = _createForOfIteratorHelper(matrix),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var row = _step.value;
            output.push(point[0] * row[0] + point[1] * row[1] + point[2] * row[2]);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }
      return new Float32Array(output.filter(function (_, k) {
        return (1 + k) % 3;
      }));
    }
  }], [{
    key: "loadTexture",
    value: function loadTexture(gl2d, imageSrc) {
      var gl = gl2d.context;
      if (!this.promises) {
        this.promises = {};
      }
      if (this.promises[imageSrc]) {
        return this.promises[imageSrc];
      }
      this.promises[imageSrc] = Sprite.loadImage(imageSrc).then(function (image) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.bindTexture(gl.TEXTURE_2D, null);
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
}();
});

;require.register("sprite/SpriteBoard.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SpriteBoard = void 0;
var _Bag = require("curvature/base/Bag");
var _Bindable = require("curvature/base/Bindable");
var _Gl2d = require("../gl2d/Gl2d");
var _Camera = require("./Camera");
var _Sprite = require("./Sprite");
var _SpriteSheet = require("./SpriteSheet");
var _MapRenderer = require("./MapRenderer");
var _Parallax = require("./Parallax");
var _Split = require("../math/Split");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var SpriteBoard = exports.SpriteBoard = /*#__PURE__*/function () {
  function SpriteBoard(_ref) {
    var _this = this;
    var element = _ref.element,
      world = _ref.world,
      map = _ref.map;
    _classCallCheck(this, SpriteBoard);
    this[_Bindable.Bindable.Prevent] = true;
    console.log(_Split.Split.intToBytes(0xFF00));
    this.map = map;
    this.maps = [];
    this.mapRenderers = [];
    this.world = world;
    this.sprites = new _Bag.Bag();
    this.mouse = {
      x: null,
      y: null,
      clickX: null,
      clickY: null
    };
    this.width = element.width;
    this.height = element.height;
    _Camera.Camera.width = element.width;
    _Camera.Camera.height = element.height;
    this.gl2d = new _Gl2d.Gl2d(element);
    this.gl2d.enableBlending();
    var attributes = ['a_position', 'a_texCoord'];
    var uniforms = ['u_image', 'u_effect', 'u_tiles', 'u_tileMapping', 'u_size', 'u_scale', 'u_scroll', 'u_stretch', 'u_tileSize', 'u_resolution', 'u_mapTextureSize', 'u_region', 'u_parallax', 'u_time', 'u_renderTiles', 'u_renderParallax', 'u_renderMode'];
    this.renderMode = 0;
    this.drawProgram = this.gl2d.createProgram({
      vertexShader: this.gl2d.createShader('sprite/texture.vert'),
      fragmentShader: this.gl2d.createShader('sprite/texture.frag'),
      attributes: attributes,
      uniforms: uniforms
    });
    this.drawProgram.use();
    this.colorLocation = this.drawProgram.uniforms.u_color;
    this.tilePosLocation = this.drawProgram.uniforms.u_tileNo;
    this.regionLocation = this.drawProgram.uniforms.u_region;
    this.drawLayer = this.gl2d.createTexture(1000, 1000);
    this.effectLayer = this.gl2d.createTexture(1000, 1000);
    this.drawBuffer = this.gl2d.createFramebuffer(this.drawLayer);
    this.effectBuffer = this.gl2d.createFramebuffer(this.effectLayer);
    document.addEventListener('mousemove', function (event) {
      _this.mouse.x = event.clientX;
      _this.mouse.y = event.clientY;
    });
    world.ready.then(function (maps) {
      _this.mapRenderers = maps.map(function (m) {
        var mr = new _MapRenderer.MapRenderer({
          spriteBoard: _this,
          map: m
        });
        mr.resize(_Camera.Camera.width, _Camera.Camera.height);
        return mr;
      });
    });
    this.parallax = new _Parallax.Parallax({
      spriteBoard: this,
      map: map
    });
    var w = 1280;
    var spriteSheet = new _SpriteSheet.SpriteSheet();
    for (var i in Array(2).fill()) {
      var barrel = new _Sprite.Sprite({
        src: 'barrel.png',
        spriteBoard: this,
        spriteSheet: spriteSheet
      });
      barrel.x = 32 + i * 64 % w - 16;
      barrel.y = Math.trunc(i * 32 / w) * 32 + 32;
      this.sprites.add(barrel);
    }
    this.following = null;
  }
  return _createClass(SpriteBoard, [{
    key: "draw",
    value: function draw() {
      if (this.following) {
        _Camera.Camera.x = (16 + this.following.sprite.x) * this.gl2d.zoomLevel || 0;
        _Camera.Camera.y = (16 + this.following.sprite.y) * this.gl2d.zoomLevel || 0;
      }
      var gl = this.gl2d.context;
      this.drawProgram.uniformF('u_size', _Camera.Camera.width, _Camera.Camera.height);
      this.drawProgram.uniformF('u_resolution', gl.canvas.width, gl.canvas.height);
      this.drawProgram.uniformI('u_renderMode', this.renderMode);
      this.drawProgram.uniformF('u_time', performance.now());
      this.drawProgram.uniformF('u_region', 0, 0, 0, 0);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectBuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (this.map.backgroundColor) {
        var color = this.map.backgroundColor.substr(1);
        var r = parseInt(color.substr(-6, 2), 16) / 255;
        var b = parseInt(color.substr(-4, 2), 16) / 255;
        var g = parseInt(color.substr(-2, 2), 16) / 255;
        var a = color.length === 8 ? parseInt(color.substr(-8, 2), 16) / 255 : 1;
        gl.clearColor(r, g, b, a);
      } else {
        gl.clearColor(0, 0, 0, 1);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      window.smProfiling && console.time('draw-parallax');
      this.parallax && this.parallax.draw();
      window.smProfiling && console.timeEnd('draw-parallax');
      this.drawProgram.uniformF('u_size', _Camera.Camera.width, _Camera.Camera.height);
      window.smProfiling && console.time('draw-tiles');
      this.mapRenderers.forEach(function (mr) {
        return mr.draw();
      });
      window.smProfiling && console.timeEnd('draw-tiles');
      window.smProfiling && console.time('draw-sprites');
      var sprites = this.sprites.items();
      // sprites.forEach(s => s.z = s.y);
      sprites.sort(function (a, b) {
        if (a.y === undefined) {
          return -1;
        }
        if (b.y === undefined) {
          return 1;
        }
        return a.y - b.y;
      });
      sprites.forEach(function (s) {
        return s.draw();
      });
      window.smProfiling && console.timeEnd('draw-sprites');
      if (window.smProfiling) {
        window.smProfiling = false;
      }

      // Set the rectangle for both layers
      this.setRectangle(0, this.gl2d.element.height, this.gl2d.element.width, -this.gl2d.element.height);

      // Switch to the main framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // Put the drawLayer in tex0
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
      this.drawProgram.uniformI('u_image', 0);

      // Put the effectLayer in tex1
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
      this.drawProgram.uniformI('u_effect', 1);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Cleanup...
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      var gl = this.gl2d.context;
      width = width || this.gl2d.element.width;
      height = height || this.gl2d.element.height;
      this.width = width;
      this.height = height;
      _Camera.Camera.x *= this.gl2d.zoomLevel;
      _Camera.Camera.y *= this.gl2d.zoomLevel;
      _Camera.Camera.width = width / this.gl2d.zoomLevel;
      _Camera.Camera.height = height / this.gl2d.zoomLevel;
      this.mapRenderers.forEach(function (mr) {
        return mr.resize(_Camera.Camera.width, _Camera.Camera.height);
      });
      gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      var gl = this.gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.drawProgram.buffers.a_position);
      var x1 = x;
      var x2 = x + width;
      var y1 = y;
      var y2 = y + height;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STREAM_DRAW);
    }

    // unselect()
    // {
    // 	if(this.selected.localX === null)
    // 	{
    // 		return false;
    // 	}

    // 	this.selected.localX  = null;
    // 	this.selected.localY  = null;
    // 	this.selected.globalX = null;
    // 	this.selected.globalY = null;

    // 	return true;
    // }
  }]);
}();
});

;require.register("sprite/SpriteSheet.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SpriteSheet = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var SpriteSheet = exports.SpriteSheet = /*#__PURE__*/function () {
  function SpriteSheet() {
    var _this = this;
    _classCallCheck(this, SpriteSheet);
    this.imageUrl = '/spritesheet.png';
    this.boxesUrl = '/spritesheet.json';
    this.vertices = {};
    this.frames = {};
    this.width = 0;
    this.height = 0;
    var sheetLoader = fetch(this.boxesUrl).then(function (response) {
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
  return _createClass(SpriteSheet, [{
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
        }));

        // let u1 = this.boxes.frames[i].frame.x / this.image.width;
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
      var texture = gl.createTexture();
      return this.texturePromises[imageSrc] = this.loadImage(imageSrc).then(function (image) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        /*/
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        /*/
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        //*/

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
}();
});

;require.register("sprite/TextureBank.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TextureBank = void 0;
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
var TextureBank = exports.TextureBank = /*#__PURE__*/_createClass(function TextureBank() {
  _classCallCheck(this, TextureBank);
});
});

;require.register("sprite/Tileset.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tileset = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Tileset = exports.Tileset = /*#__PURE__*/function () {
  function Tileset(_ref) {
    var source = _ref.source,
      firstgid = _ref.firstgid,
      columns = _ref.columns,
      image = _ref.image,
      imageheight = _ref.imageheight,
      imagewidth = _ref.imagewidth,
      margin = _ref.margin,
      name = _ref.name,
      spacing = _ref.spacing,
      tilecount = _ref.tilecount,
      tileheight = _ref.tileheight,
      tilewidth = _ref.tilewidth,
      tiles = _ref.tiles;
    _classCallCheck(this, Tileset);
    this.firstGid = firstgid;
    this.ready = this.getReady({
      source: source,
      columns: columns,
      image: image,
      imageheight: imageheight,
      imagewidth: imagewidth,
      margin: margin,
      name: name,
      spacing: spacing,
      tilecount: tilecount,
      tileheight: tileheight,
      tilewidth: tilewidth,
      tiles: tiles
    });
  }
  return _createClass(Tileset, [{
    key: "getReady",
    value: function () {
      var _getReady = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(_ref2) {
        var _this = this;
        var source, columns, image, imageheight, imagewidth, margin, name, spacing, tilecount, tileheight, tilewidth, tiles, _yield$yield$fetch$js, _iterator, _step, tile;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              source = _ref2.source, columns = _ref2.columns, image = _ref2.image, imageheight = _ref2.imageheight, imagewidth = _ref2.imagewidth, margin = _ref2.margin, name = _ref2.name, spacing = _ref2.spacing, tilecount = _ref2.tilecount, tileheight = _ref2.tileheight, tilewidth = _ref2.tilewidth, tiles = _ref2.tiles;
              if (!source) {
                _context.next = 20;
                break;
              }
              _context.next = 4;
              return fetch(source);
            case 4:
              _context.next = 6;
              return _context.sent.json();
            case 6:
              _yield$yield$fetch$js = _context.sent;
              columns = _yield$yield$fetch$js.columns;
              image = _yield$yield$fetch$js.image;
              imageheight = _yield$yield$fetch$js.imageheight;
              imagewidth = _yield$yield$fetch$js.imagewidth;
              margin = _yield$yield$fetch$js.margin;
              name = _yield$yield$fetch$js.name;
              spacing = _yield$yield$fetch$js.spacing;
              tilecount = _yield$yield$fetch$js.tilecount;
              tileheight = _yield$yield$fetch$js.tileheight;
              tilewidth = _yield$yield$fetch$js.tilewidth;
              tiles = _yield$yield$fetch$js.tiles;
              _iterator = _createForOfIteratorHelper(tiles);
              try {
                for (_iterator.s(); !(_step = _iterator.n()).done;) {
                  tile = _step.value;
                  tile.id += this.firstGid;
                }
              } catch (err) {
                _iterator.e(err);
              } finally {
                _iterator.f();
              }
            case 20:
              this.image = new Image();
              this.image.src = image;
              this.columns = columns;
              this.imageWidth = imagewidth;
              this.imageHeight = imageheight;
              this.margin = margin;
              this.name = name;
              this.spacing = spacing;
              this.tileCount = tilecount;
              this.tileHeight = tileheight;
              this.tileWidth = tilewidth;
              this.tiles = tiles !== null && tiles !== void 0 ? tiles : [];
              console.log(this);
              return _context.abrupt("return", new Promise(function (accept) {
                return _this.image.onload = function () {
                  return accept();
                };
              }));
            case 34:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function getReady(_x) {
        return _getReady.apply(this, arguments);
      }
      return getReady;
    }()
  }]);
}();
});

;require.register("sprite/texture.frag", function(exports, require, module) {
module.exports = "// texture.frag\n#define M_PI 3.1415926535897932384626433832795\n#define M_TAU M_PI / 2.0\nprecision mediump float;\n\nvarying vec2 v_texCoord;\nvarying vec2 v_position;\n\nuniform sampler2D u_image;\nuniform sampler2D u_effect;\nuniform sampler2D u_tiles;\nuniform sampler2D u_tileMapping;\n\nuniform vec2 u_size;\nuniform vec2 u_tileSize;\nuniform vec2 u_resolution;\nuniform vec2 u_mapTextureSize;\n\nuniform vec4 u_color;\nuniform vec4 u_region;\nuniform vec2 u_parallax;\nuniform vec2 u_scroll;\nuniform vec2 u_stretch;\n\nuniform float u_time;\nuniform float u_scale;\n\nuniform int u_renderTiles;\nuniform int u_renderParallax;\nuniform int u_renderMode;\n\nfloat masked = 0.0;\nfloat sorted = 1.0;\nfloat displace = 1.0;\nfloat blur = 1.0;\n\nvec2 rippleX(vec2 texCoord, float a, float b, float c) {\n  vec2 rippled = vec2(\n    v_texCoord.x + sin(v_texCoord.y * (a * u_size.y) + b) * c / u_size.x,\n    v_texCoord.y\n  );\n\n  if (rippled.x < 0.0) {\n    rippled.x = abs(rippled.x);\n  }\n  else if (rippled.x > u_size.x) {\n    rippled.x = u_size.x - (rippled.x - u_size.x);\n  }\n\n  return rippled;\n}\n\nvec2 rippleY(vec2 texCoord, float a, float b, float c) {\n  vec2 rippled = vec2(v_texCoord.x, v_texCoord.y + sin(v_texCoord.x * (a * u_size.x) + b) * c / u_size.y);\n\n  if (rippled.y < 0.0) {\n    rippled.x = abs(rippled.x);\n  }\n  else if (rippled.y > u_size.y) {\n    rippled.y = u_size.y - (rippled.y - u_size.y);\n  }\n\n  return rippled;\n}\n\nvec4 motionBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {\n  vec4 originalColor = texture2D(image, textCoord);\n  vec4 dispColor = originalColor;\n\n  const float max = 10.0;\n  float weight = 0.85;\n\n  for (float i = 0.0; i < max; i += 1.0) {\n    if(i > abs(magnitude) || originalColor.a < 1.0) {\n      break;\n    }\n    vec4 dispColorDown = texture2D(image, textCoord + vec2(\n      cos(angle) * i * sign(magnitude) / u_size.x,\n      sin(angle) * i * sign(magnitude) / u_size.y\n    ));\n    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight;\n    weight *= 0.8;\n  }\n\n  return dispColor;\n}\n\nvec4 linearBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {\n  vec4 originalColor = texture2D(image, textCoord);\n  vec4 dispColor = texture2D(image, textCoord);\n\n  const float max = 10.0;\n  float weight = 0.65;\n\n  for (float i = 0.0; i < max; i += 0.25) {\n    if(i > abs(magnitude)) {\n      break;\n    }\n    vec4 dispColorUp = texture2D(image, textCoord + vec2(\n      cos(angle) * -i * sign(magnitude) / u_size.x,\n      sin(angle) * -i * sign(magnitude) / u_size.y\n    ));\n    vec4 dispColorDown = texture2D(image, textCoord + vec2(\n      cos(angle) * i * sign(magnitude) / u_size.x,\n      sin(angle) * i * sign(magnitude) / u_size.y\n    ));\n    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight * 0.5 + dispColorUp * weight * 0.5;\n    weight *= 0.70;\n  }\n\n  return dispColor;\n}\n\nvoid main() {\n  vec4 originalColor = texture2D(u_image, v_texCoord);\n  vec4 effectColor = texture2D(u_effect,  v_texCoord);\n\n  // This only applies when drawing the parallax background\n  if (u_renderParallax == 1) {\n\n    float texelSize = 1.0 / u_size.x;\n\n    vec2 parallaxCoord = v_texCoord * vec2(1.0, -1.0) + vec2(0.0, 1.0)\n      + vec2(u_scroll.x * texelSize * u_parallax.x, 0.0);\n      // + vec2(u_time / 10000.0, 0.0);\n      // + vec2(, 0.0);\n      ;\n\n    gl_FragColor = texture2D(u_image,  parallaxCoord);\n\n    return;\n  }\n\n  // This only applies when drawing tiles.\n  if (u_renderTiles == 1) {\n    float xTiles = floor(u_size.x / u_tileSize.x);\n    float yTiles = floor(u_size.y / u_tileSize.y);\n\n    float xT = (v_texCoord.x * u_size.x) / u_tileSize.x;\n    float yT = (v_texCoord.y * u_size.y) / u_tileSize.y;\n\n    float inv_xTiles = 1.0 / xTiles;\n    float inv_yTiles = 1.0 / yTiles;\n\n    float xTile = floor(xT) * inv_xTiles;\n    float yTile = floor(yT) * inv_yTiles;\n\n    float xOff = (xT * inv_xTiles - xTile) * xTiles;\n    float yOff = (yT * inv_yTiles - yTile) * yTiles * -1.0 + 1.0;\n\n    float xWrap = u_mapTextureSize.x / u_tileSize.x;\n    float yWrap = u_mapTextureSize.y / u_tileSize.y;\n\n    // Mode 1 draws tiles' x/y values as red & green\n    if (u_renderMode == 1) {\n      gl_FragColor = vec4(xTile, yTile, 0, 1.0);\n      return;\n    }\n\n    // Mode 2 is the same as mode 1 but adds combines\n    // internal tile x/y to the blue channel\n    if (u_renderMode == 2) {\n      gl_FragColor = vec4(xTile, yTile, (xOff + yOff) * 0.5, 1.0);\n      return;\n    }\n\n    vec4 tile = texture2D(u_tileMapping, v_texCoord * vec2(1.0, -1.0) + vec2(0.0, 1.0));\n\n    float lo = tile.r * 256.0;\n    float hi = tile.g * 256.0 * 256.0;\n\n    float tileNumber = lo + hi;\n\n    if (tileNumber == 0.0) {\n      gl_FragColor.a = 0.0;\n      return;\n    }\n\n    // Mode 3 uses the tile number for the red/green channels\n    if (u_renderMode == 3) {\n      gl_FragColor = tile;\n      gl_FragColor.b = 0.5;\n      gl_FragColor.a = 1.0;\n      return;\n    }\n\n    // Mode 4 normalizes the tile number to all channels\n    if (u_renderMode == 4) {\n      gl_FragColor = vec4(\n        mod(tileNumber, 256.0) / 256.0\n        , mod(tileNumber, 256.0) / 256.0\n        , mod(tileNumber, 256.0) / 256.0\n        , 1.0\n      );\n      return;\n    }\n\n    float tileSetX = floor(mod((-1.0 + tileNumber), xWrap));\n    float tileSetY = floor((-1.0 + tileNumber) / xWrap);\n\n    vec4 tileColor = texture2D(u_tiles, vec2(\n      xOff / xWrap + tileSetX * (u_tileSize.y / u_mapTextureSize.y)\n      , yOff / yWrap + tileSetY * (u_tileSize.y / u_mapTextureSize.y)\n    ));\n\n    gl_FragColor = tileColor;\n\n    return;\n  }\n\n  // This if/else block only applies\n  // when we're drawing the effectBuffer\n  if (u_region.r > 0.0 || u_region.g > 0.0 || u_region.b > 0.0) {\n    if (masked < 1.0 || originalColor.a > 0.0) {\n      gl_FragColor = u_region;\n    }\n    return;\n  }\n  else if (u_region.a > 0.0) {\n    if (sorted > 0.0) {\n      gl_FragColor = vec4(0, 0, 0, originalColor.a > 0.0 ? 1.0 : 0.0);\n    }\n    else {\n      gl_FragColor = vec4(0, 0, 0, 0.0);\n    }\n    return;\n  };\n\n  // Mode 5 draws the effect buffer to the screen\n  if (u_renderMode == 5) {\n    gl_FragColor = effectColor;\n    return;\n  }\n\n  vec3 ripple = vec3(M_PI/8.0, u_time / 200.0, 1.0);\n\n  // This if/else block only applies\n  // when we're drawing the drawBuffer\n  if (effectColor == vec4(0, 1, 1, 1)) { // Water region\n    vec2 texCoord = v_texCoord;\n    vec4 v_blurredColor = originalColor;\n    if (displace > 0.0) {\n      texCoord = rippleX(v_texCoord, ripple.x, ripple.y, ripple.z);\n      v_blurredColor = texture2D(u_image, texCoord);\n    }\n    if (blur > 0.0) {\n      v_blurredColor = linearBlur(u_image, 0.0, 1.0, texCoord);\n    }\n    gl_FragColor = v_blurredColor * 0.65 + effectColor * 0.35;\n  }\n  else if (effectColor == vec4(1, 0, 0, 1)) { // Fire region\n    vec2 v_displacement = rippleY(v_texCoord, ripple.x * 3.0, ripple.y * 1.5, ripple.z * 0.333);\n    vec4 v_blurredColor = originalColor;\n    if (displace > 0.0) {\n      v_blurredColor = texture2D(u_image, v_displacement);\n    }\n    if (blur > 0.0) {\n      v_blurredColor = motionBlur(u_image, -M_TAU, 1.0, v_displacement);\n    }\n    gl_FragColor = v_blurredColor * 0.75 + effectColor * 0.25;\n  }\n  else { // Null region\n    gl_FragColor = originalColor;\n  }\n}\n"
});

;require.register("sprite/texture.vert", function(exports, require, module) {
module.exports = "// texture.vert\nprecision mediump float;\n\nattribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform vec2 u_resolution;\n\nvarying vec2 v_texCoord;\nvarying vec2 v_position;\n\nvoid main()\n{\n  vec2 zeroToOne = a_position / u_resolution;\n  vec2 zeroToTwo = zeroToOne * 2.0;\n  vec2 clipSpace = zeroToTwo - 1.0;\n\n  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n  v_texCoord  = a_texCoord;\n  v_position  = a_position;\n}\n"
});

;require.register("ui/Controller.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Controller = void 0;
var _View2 = require("curvature/base/View");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var Controller = exports.Controller = /*#__PURE__*/function (_View) {
  function Controller(args) {
    var _this;
    _classCallCheck(this, Controller);
    _this = _callSuper(this, Controller, [args]);
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
  _inherits(Controller, _View);
  return _createClass(Controller, [{
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
}(_View2.View);
});

;require.register("ui/MapEditor.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MapEditor = void 0;
var _View2 = require("curvature/base/View");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var MapEditor = exports.MapEditor = /*#__PURE__*/function (_View) {
  function MapEditor(args) {
    var _this;
    _classCallCheck(this, MapEditor);
    _this = _callSuper(this, MapEditor, [args]);
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
  _inherits(MapEditor, _View);
  return _createClass(MapEditor, [{
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
}(_View2.View);
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
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Floor = exports.Floor = /*#__PURE__*/function () {
  function Floor(gl2d, args) {
    _classCallCheck(this, Floor);
    this.gl2d = gl2d;
    this.sprites = [];

    // this.resize(60, 34);
    this.resize(9, 9);
    // this.resize(60*2, 34*2);
  }
  return _createClass(Floor, [{
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
}();
});

;require.register("world/TileMap.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TileMap = void 0;
var _Bindable = require("curvature/base/Bindable");
var _Tileset = require("../sprite/Tileset");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var TileMap = exports.TileMap = /*#__PURE__*/function () {
  function TileMap(_ref) {
    var src = _ref.src;
    _classCallCheck(this, TileMap);
    this[_Bindable.Bindable.Prevent] = true;
    this.image = document.createElement('img');
    this.src = src;
    this.pixels = [];
    this.tileCount = 0;
    this.backgroundColor = null;
    this.properties = {};
    this.canvases = new Map();
    this.contexts = new Map();
    this.tileLayers = [];
    this.imageLayers = [];
    this.objectLayers = [];
    this.xWorld = 0;
    this.yWorld = 0;
    this.width = 0;
    this.height = 0;
    this.tileWidth = 0;
    this.tileHeight = 0;
    this.tileSetWidth = 0;
    this.tileSetHeight = 0;
    this.ready = this.getReady(src);
    this.animations = new Map();
  }
  return _createClass(TileMap, [{
    key: "getReady",
    value: function () {
      var _getReady = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(src) {
        var mapData, _iterator, _step, property, tilesets;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return fetch(src);
            case 2:
              _context.next = 4;
              return _context.sent.json();
            case 4:
              mapData = _context.sent;
              this.tileLayers = mapData.layers.filter(function (layer) {
                return layer.type === 'tilelayer';
              });
              this.imageLayers = mapData.layers.filter(function (layer) {
                return layer.type === 'imagelayer';
              });
              this.objectLayers = mapData.layers.filter(function (layer) {
                return layer.type === 'objectlayer';
              });
              this.backgroundColor = mapData.backgroundcolor;
              if (mapData.properties) {
                _iterator = _createForOfIteratorHelper(mapData.properties);
                try {
                  for (_iterator.s(); !(_step = _iterator.n()).done;) {
                    property = _step.value;
                    this.properties[property.name] = property.value;
                  }
                } catch (err) {
                  _iterator.e(err);
                } finally {
                  _iterator.f();
                }
              }
              if (this.properties.backgroundColor) {
                this.backgroundColor = this.properties.backgroundColor;
              }
              tilesets = mapData.tilesets.map(function (t) {
                return new _Tileset.Tileset(t);
              });
              this.width = mapData.width;
              this.height = mapData.height;
              this.tileWidth = mapData.tilewidth;
              this.tileHeight = mapData.tileheight;
              _context.next = 18;
              return Promise.all(tilesets.map(function (t) {
                return t.ready;
              }));
            case 18:
              this.assemble(tilesets);
              return _context.abrupt("return", this);
            case 20:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function getReady(_x) {
        return _getReady.apply(this, arguments);
      }
      return getReady;
    }()
  }, {
    key: "assemble",
    value: function assemble(tilesets) {
      var _this = this;
      tilesets.sort(function (a, b) {
        return a.firstGid - b.firstGid;
      });
      var tileTotal = this.tileCount = tilesets.reduce(function (a, b) {
        return a.tileCount + b.tileCount;
      }, {
        tileCount: 0
      });
      var size = Math.ceil(Math.sqrt(tileTotal));
      var destination = document.createElement('canvas');
      this.tileSetWidth = destination.width = size * this.tileWidth;
      this.tileSetHeight = destination.height = Math.ceil(tileTotal / size) * this.tileHeight;
      var ctxDestination = destination.getContext('2d');
      var xDestination = 0;
      var yDestination = 0;
      var _iterator2 = _createForOfIteratorHelper(tilesets),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var tileset = _step2.value;
          var xSource = 0;
          var ySource = 0;
          var image = tileset.image;
          var source = document.createElement('canvas');
          source.width = image.width;
          source.height = image.height;
          var ctxSource = source.getContext('2d', {
            willReadFrequently: true
          });
          ctxSource.drawImage(image, 0, 0);
          for (var i = 0; i < tileset.tileCount; i++) {
            var tile = ctxSource.getImageData(xSource, ySource, this.tileWidth, this.tileHeight);
            ctxDestination.putImageData(tile, xDestination, yDestination);
            xSource += this.tileWidth;
            xDestination += this.tileWidth;
            if (xSource >= tileset.imageWidth) {
              xSource = 0;
              ySource += this.tileHeight;
            }
            if (xDestination >= destination.width) {
              xDestination = 0;
              yDestination += this.tileHeight;
            }
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      this.pixels = ctxDestination.getImageData(0, 0, destination.width, destination.height).data;
      destination.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        _this.image.onload = function () {
          return URL.revokeObjectURL(url);
        };
        _this.image.src = url;
      });
      var _iterator3 = _createForOfIteratorHelper(tilesets),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var _tileset = _step3.value;
          var _iterator5 = _createForOfIteratorHelper(_tileset.tiles),
            _step5;
          try {
            for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
              var tileData = _step5.value;
              if (tileData.animation) {
                this.animations.set(tileData.id, tileData.animation);
              }
            }
          } catch (err) {
            _iterator5.e(err);
          } finally {
            _iterator5.f();
          }
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
      var _iterator4 = _createForOfIteratorHelper(this.tileLayers),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var layer = _step4.value;
          var canvas = document.createElement('canvas');
          var context = canvas.getContext('2d', {
            willReadFrequently: true
          });
          this.canvases.set(layer, canvas);
          this.contexts.set(layer, context);
          var tileValues = new Uint32Array(layer.data.map(function (t) {
            return 0 + t;
          }));
          var tilePixels = new Uint8ClampedArray(tileValues.buffer);
          for (var _i in tileValues) {
            var _tile = tileValues[_i];
            if (this.animations.has(_tile)) {
              console.log({
                i: _i,
                tile: _tile
              }, this.animations.get(_tile));
            }
          }
          for (var _i2 = 3; _i2 < tilePixels.length; _i2 += 4) {
            tilePixels[_i2] = 0xFF;
          }
          canvas.width = this.width;
          canvas.height = this.height;
          context.putImageData(new ImageData(tilePixels, this.width, this.height), 0, 0);
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
    }
  }, {
    key: "getSlice",
    value: function getSlice(x, y, w, h) {
      var t = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
      return this.contexts.values().map(function (context) {
        return context.getImageData(x, y, w, h).data;
      });
    }
  }]);
}();
});

;require.register("world/World.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.World = void 0;
var _Bindable = require("curvature/base/Bindable");
var _Tileset = require("../sprite/Tileset");
var _TileMap = require("./TileMap");
var _Rectangle = require("../math/Rectangle");
var _MTree = require("../math/MTree");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var World = exports.World = /*#__PURE__*/function () {
  function World(_ref) {
    var src = _ref.src;
    _classCallCheck(this, World);
    this[_Bindable.Bindable.Prevent] = true;
    this.ready = this.getReady(src);
    this.maps = [];
    this.mTree = new _MTree.MTree();
    this.rectMap = new Map();
  }
  return _createClass(World, [{
    key: "getReady",
    value: function () {
      var _getReady = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(src) {
        var _this = this;
        var worldData;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return fetch(src);
            case 2:
              _context.next = 4;
              return _context.sent.json();
            case 4:
              worldData = _context.sent;
              _context.next = 7;
              return Promise.all(worldData.maps.map(function (m, i) {
                var map = new _TileMap.TileMap({
                  src: m.fileName
                });
                map.xWorld = m.x;
                map.yWorld = m.y;
                _this.maps[i] = map;
                var rect = new _Rectangle.Rectangle(m.x, m.y, m.x + m.width, m.y + m.height);
                _this.rectMap.set(rect, map);
                _this.mTree.add(rect);
                return map.ready;
              }));
            case 7:
              return _context.abrupt("return", _context.sent);
            case 8:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      function getReady(_x) {
        return _getReady.apply(this, arguments);
      }
      return getReady;
    }()
  }, {
    key: "getMapsForPoint",
    value: function getMapsForPoint(x, y) {
      var rects = this.mTree.query(x, y, x, y);
      var maps = new Set();
      var _iterator = _createForOfIteratorHelper(rects),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var rect = _step.value;
          var map = this.rectMap.get(rect);
          maps.add(map);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      return maps;
    }
  }]);
}();
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
      });

      // Hack to force page repaint after 25ms.
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
  var _connect = function connect() {
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
      window.setTimeout(_connect, 1000);
    };
  };
  _connect();
})();
/* jshint ignore:end */
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9CYWcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL0RvbS5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9NaXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1RhZy5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9VdWlkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzIiwiYXBwL0NvbmZpZy5qcyIsImFwcC9nbDJkL0dsMmQuanMiLCJhcHAvaG9tZS9WaWV3LmpzIiwiYXBwL2hvbWUvdmlldy50bXAuaHRtbCIsImFwcC9pbml0aWFsaXplLmpzIiwiYXBwL2luamVjdC9Db250YWluZXIuanMiLCJhcHAvaW5qZWN0L0luamVjdGFibGUuanMiLCJhcHAvaW5qZWN0L1NpbmdsZS5qcyIsImFwcC9tYXRoL01UcmVlLmpzIiwiYXBwL21hdGgvUXVhZHRyZWUuanMiLCJhcHAvbWF0aC9SZWN0YW5nbGUuanMiLCJhcHAvbWF0aC9TcGxpdC5qcyIsImFwcC9tb2RlbC9Db250cm9sbGVyLmpzIiwiYXBwL21vZGVsL0VudGl0eS5qcyIsImFwcC9vdmVybGF5L292ZXJsYXkuZnJhZyIsImFwcC9vdmVybGF5L292ZXJsYXkudmVydCIsImFwcC9zcHJpdGUvQ2FtZXJhLmpzIiwiYXBwL3Nwcml0ZS9NYXBSZW5kZXJlci5qcyIsImFwcC9zcHJpdGUvUGFyYWxsYXguanMiLCJhcHAvc3ByaXRlL1Nwcml0ZS5qcyIsImFwcC9zcHJpdGUvU3ByaXRlQm9hcmQuanMiLCJhcHAvc3ByaXRlL1Nwcml0ZVNoZWV0LmpzIiwiYXBwL3Nwcml0ZS9UZXh0dXJlQmFuay5qcyIsImFwcC9zcHJpdGUvVGlsZXNldC5qcyIsImFwcC9zcHJpdGUvdGV4dHVyZS5mcmFnIiwiYXBwL3Nwcml0ZS90ZXh0dXJlLnZlcnQiLCJhcHAvdWkvQ29udHJvbGxlci5qcyIsImFwcC91aS9NYXBFZGl0b3IuanMiLCJhcHAvdWkvY29udHJvbGxlci50bXAuaHRtbCIsImFwcC91aS9tYXBFZGl0b3IudG1wLmh0bWwiLCJhcHAvd29ybGQvRmxvb3IuanMiLCJhcHAvd29ybGQvVGlsZU1hcC5qcyIsImFwcC93b3JsZC9Xb3JsZC5qcyIsIm5vZGVfbW9kdWxlcy9hdXRvLXJlbG9hZC1icnVuY2gvdmVuZG9yL2F1dG8tcmVsb2FkLmpzIl0sIm5hbWVzIjpbIkNvbmZpZyIsImV4cG9ydHMiLCJfY3JlYXRlQ2xhc3MiLCJfY2xhc3NDYWxsQ2hlY2siLCJ0aXRsZSIsIlByb2dyYW0iLCJfcmVmIiwiZ2wiLCJ2ZXJ0ZXhTaGFkZXIiLCJmcmFnbWVudFNoYWRlciIsInVuaWZvcm1zIiwiYXR0cmlidXRlcyIsIl9kZWZpbmVQcm9wZXJ0eSIsImNvbnRleHQiLCJwcm9ncmFtIiwiY3JlYXRlUHJvZ3JhbSIsImF0dGFjaFNoYWRlciIsImxpbmtQcm9ncmFtIiwiZGV0YWNoU2hhZGVyIiwiZGVsZXRlU2hhZGVyIiwiZ2V0UHJvZ3JhbVBhcmFtZXRlciIsIkxJTktfU1RBVFVTIiwiY29uc29sZSIsImVycm9yIiwiZ2V0UHJvZ3JhbUluZm9Mb2ciLCJkZWxldGVQcm9ncmFtIiwiX2l0ZXJhdG9yIiwiX2NyZWF0ZUZvck9mSXRlcmF0b3JIZWxwZXIiLCJfc3RlcCIsInMiLCJuIiwiZG9uZSIsInVuaWZvcm0iLCJ2YWx1ZSIsImxvY2F0aW9uIiwiZ2V0VW5pZm9ybUxvY2F0aW9uIiwid2FybiIsImNvbmNhdCIsImVyciIsImUiLCJmIiwiX2l0ZXJhdG9yMiIsIl9zdGVwMiIsImF0dHJpYnV0ZSIsImdldEF0dHJpYkxvY2F0aW9uIiwiYnVmZmVyIiwiY3JlYXRlQnVmZmVyIiwiYmluZEJ1ZmZlciIsIkFSUkFZX0JVRkZFUiIsImVuYWJsZVZlcnRleEF0dHJpYkFycmF5IiwidmVydGV4QXR0cmliUG9pbnRlciIsIkZMT0FUIiwiYnVmZmVycyIsImtleSIsInVzZSIsInVzZVByb2dyYW0iLCJ1bmlmb3JtRiIsIm5hbWUiLCJfbGVuIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiZmxvYXRzIiwiQXJyYXkiLCJfa2V5IiwiYXBwbHkiLCJ1bmlmb3JtSSIsIl9sZW4yIiwiaW50cyIsIl9rZXkyIiwiR2wyZCIsImVsZW1lbnQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJnZXRDb250ZXh0Iiwic2NyZWVuU2NhbGUiLCJ6b29tTGV2ZWwiLCJjcmVhdGVTaGFkZXIiLCJleHRlbnNpb24iLCJzdWJzdHJpbmciLCJsYXN0SW5kZXhPZiIsInR5cGUiLCJ0b1VwcGVyQ2FzZSIsIlZFUlRFWF9TSEFERVIiLCJGUkFHTUVOVF9TSEFERVIiLCJzaGFkZXIiLCJzb3VyY2UiLCJyZXF1aXJlIiwic2hhZGVyU291cmNlIiwiY29tcGlsZVNoYWRlciIsInN1Y2Nlc3MiLCJnZXRTaGFkZXJQYXJhbWV0ZXIiLCJDT01QSUxFX1NUQVRVUyIsImdldFNoYWRlckluZm9Mb2ciLCJfcmVmMiIsImNyZWF0ZVRleHR1cmUiLCJ3aWR0aCIsImhlaWdodCIsInRleHR1cmUiLCJiaW5kVGV4dHVyZSIsIlRFWFRVUkVfMkQiLCJ0ZXhJbWFnZTJEIiwiUkdCQSIsIlVOU0lHTkVEX0JZVEUiLCJ0ZXhQYXJhbWV0ZXJpIiwiVEVYVFVSRV9XUkFQX1MiLCJDTEFNUF9UT19FREdFIiwiVEVYVFVSRV9XUkFQX1QiLCJURVhUVVJFX01JTl9GSUxURVIiLCJORUFSRVNUIiwiVEVYVFVSRV9NQUdfRklMVEVSIiwiY3JlYXRlRnJhbWVidWZmZXIiLCJmcmFtZWJ1ZmZlciIsImJpbmRGcmFtZWJ1ZmZlciIsIkZSQU1FQlVGRkVSIiwiZnJhbWVidWZmZXJUZXh0dXJlMkQiLCJDT0xPUl9BVFRBQ0hNRU5UMCIsImVuYWJsZUJsZW5kaW5nIiwiYmxlbmRGdW5jIiwiU1JDX0FMUEhBIiwiT05FX01JTlVTX1NSQ19BTFBIQSIsImVuYWJsZSIsIkJMRU5EIiwiX1ZpZXciLCJfS2V5Ym9hcmQiLCJfQmFnIiwiX0NvbmZpZyIsIl9UaWxlTWFwIiwiX1Nwcml0ZVNoZWV0IiwiX1Nwcml0ZUJvYXJkIiwiX0NvbnRyb2xsZXIiLCJfTWFwRWRpdG9yIiwiX0VudGl0eSIsIl9DYW1lcmEiLCJfQ29udHJvbGxlcjIiLCJfU3ByaXRlIiwiX1dvcmxkIiwiX1F1YWR0cmVlIiwiX1JlY3RhbmdsZSIsIl9NVHJlZSIsImEiLCJUeXBlRXJyb3IiLCJfZGVmaW5lUHJvcGVydGllcyIsInIiLCJ0IiwibyIsImVudW1lcmFibGUiLCJjb25maWd1cmFibGUiLCJ3cml0YWJsZSIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiX3RvUHJvcGVydHlLZXkiLCJwcm90b3R5cGUiLCJpIiwiX3RvUHJpbWl0aXZlIiwiX3R5cGVvZiIsIlN5bWJvbCIsInRvUHJpbWl0aXZlIiwiY2FsbCIsIlN0cmluZyIsIk51bWJlciIsIl9jYWxsU3VwZXIiLCJfZ2V0UHJvdG90eXBlT2YiLCJfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybiIsIl9pc05hdGl2ZVJlZmxlY3RDb25zdHJ1Y3QiLCJSZWZsZWN0IiwiY29uc3RydWN0IiwiY29uc3RydWN0b3IiLCJfYXNzZXJ0VGhpc0luaXRpYWxpemVkIiwiUmVmZXJlbmNlRXJyb3IiLCJCb29sZWFuIiwidmFsdWVPZiIsInNldFByb3RvdHlwZU9mIiwiZ2V0UHJvdG90eXBlT2YiLCJiaW5kIiwiX19wcm90b19fIiwiX2luaGVyaXRzIiwiY3JlYXRlIiwiX3NldFByb3RvdHlwZU9mIiwiQXBwbGljYXRpb24iLCJvblNjcmVlbkpveVBhZCIsIk9uU2NyZWVuSm95UGFkIiwia2V5Ym9hcmQiLCJLZXlib2FyZCIsImdldCIsInF1YWQiLCJRdWFkdHJlZSIsImluc2VydCIsIngiLCJ5IiwibWFwVHJlZSIsIk1UcmVlIiwiVmlldyIsIl9CYXNlVmlldyIsImFyZ3MiLCJfdGhpcyIsIndpbmRvdyIsInNtUHJvZmlsaW5nIiwidGVtcGxhdGUiLCJyb3V0ZXMiLCJlbnRpdGllcyIsIkJhZyIsInNwZWVkIiwibWF4U3BlZWQiLCJjb250cm9sbGVyIiwiZnBzIiwic3BzIiwiY2FtWCIsImNhbVkiLCJmcmFtZUxvY2siLCJzaW11bGF0aW9uTG9jayIsInNob3dFZGl0b3IiLCJsaXN0ZW5pbmciLCJrZXlzIiwiYmluZFRvIiwidiIsImsiLCJkIiwic3ByaXRlQm9hcmQiLCJ1bnNlbGVjdCIsInNwcml0ZVNoZWV0IiwiU3ByaXRlU2hlZXQiLCJ3b3JsZCIsIldvcmxkIiwic3JjIiwibWFwIiwiVGlsZU1hcCIsIm1hcEVkaXRvciIsIk1hcEVkaXRvciIsIm9uUmVuZGVyZWQiLCJfdGhpczIiLCJTcHJpdGVCb2FyZCIsInRhZ3MiLCJjYW52YXMiLCJlbnRpdHkiLCJFbnRpdHkiLCJzcHJpdGUiLCJTcHJpdGUiLCJ1bmRlZmluZWQiLCJDb250cm9sbGVyIiwiY2FtZXJhIiwiQ2FtZXJhIiwiYWRkIiwic3ByaXRlcyIsImZvbGxvd2luZyIsInpvb20iLCJzZWxlY3RlZCIsImdsb2JhbFgiLCJzdGFydEdsb2JhbFgiLCJpaSIsImoiLCJzdGFydEdsb2JhbFkiLCJqaiIsImdsb2JhbFkiLCJzZXRUaWxlIiwicmVzaXplIiwiYWRkRXZlbnRMaXN0ZW5lciIsImZUaGVuIiwic1RoZW4iLCJmU2FtcGxlcyIsInNTYW1wbGVzIiwibWF4U2FtcGxlcyIsInNpbXVsYXRlIiwibm93IiwiZGVsdGEiLCJ1cGRhdGUiLCJ2YWx1ZXMiLCJpdGVtcyIsIl9zcHMiLCJwdXNoIiwic2hpZnQiLCJoaWRkZW4iLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJwZXJmb3JtYW5jZSIsImRyYXciLCJ0b0ZpeGVkIiwicG9zWCIsInBvc1kiLCJnbDJkIiwiYm9keSIsImNsaWVudEhlaWdodCIsInNldEludGVydmFsIiwicmVkdWNlIiwiYiIsInBhZFN0YXJ0IiwiY2xpZW50V2lkdGgiLCJyd2lkdGgiLCJNYXRoIiwidHJ1bmMiLCJyaGVpZ2h0Iiwib2xkU2NhbGUiLCJzY3JvbGwiLCJldmVudCIsImRlbHRhWSIsIm1heCIsIm1pbiIsInN0ZXAiLCJhYnMiLCJCYXNlVmlldyIsIl9Sb3V0ZXIiLCJQcm94eSIsInZpZXciLCJSb3V0ZXIiLCJsaXN0ZW4iLCJyZW5kZXIiLCJfSW5qZWN0YWJsZTIiLCJDb250YWluZXIiLCJfSW5qZWN0YWJsZSIsImluamVjdCIsImluamVjdGlvbnMiLCJhc3NpZ24iLCJJbmplY3RhYmxlIiwiY2xhc3NlcyIsIm9iamVjdHMiLCJpbmplY3Rpb24iLCJ0ZXN0IiwiaW5zdGFuY2UiLCJFcnJvciIsImV4aXN0aW5nSW5qZWN0aW9ucyIsIl9jbGFzcyIsIlNpbmdsZSIsInJhbmRvbSIsInNpbmdsZSIsIl90b0NvbnN1bWFibGVBcnJheSIsIl9hcnJheVdpdGhvdXRIb2xlcyIsIl9pdGVyYWJsZVRvQXJyYXkiLCJfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkiLCJfbm9uSXRlcmFibGVTcHJlYWQiLCJpdGVyYXRvciIsImZyb20iLCJpc0FycmF5IiwiX2FycmF5TGlrZVRvQXJyYXkiLCJfbiIsIkYiLCJ1IiwibmV4dCIsInRvU3RyaW5nIiwic2xpY2UiLCJTZWdtZW50Iiwic3RhcnQiLCJlbmQiLCJwcmV2IiwiZGVwdGgiLCJzaXplIiwicmVjdGFuZ2xlcyIsIlNldCIsInN1YlRyZWUiLCJzcGxpdCIsImF0IiwiUmFuZ2VFcnJvciIsInJlY3RhbmdsZSIsInJlY3RNaW4iLCJ4MSIsInkxIiwicmVjdE1heCIsIngyIiwieTIiLCJkZWxldGUiLCJlbXB0eSIsIkluZmluaXR5Iiwic2VnbWVudHMiLCJzdGFydEluZGV4IiwiZmluZFNlZ21lbnQiLCJzcGxpdFNlZ21lbnQiLCJlbmRJbmRleCIsInNwbGljZSIsInF1ZXJ5IiwidGltZSIsInhTdGFydEluZGV4IiwieEVuZEluZGV4Iiwic2VnbWVudCIsInlTdGFydEluZGV4IiwieUVuZEluZGV4IiwidGltZUVuZCIsImluZGV4IiwiX3RoaXMkc2VnbWVudHMiLCJzcGxpdFNlZ21lbnRzIiwibG8iLCJoaSIsImN1cnJlbnQiLCJmbG9vciIsIl9SZWN0YW5nbGUyIiwibWluU2l6ZSIsInVsQ2VsbCIsInVyQ2VsbCIsImJsQ2VsbCIsImJyQ2VsbCIsImNvbnRhaW5zIiwieFNpemUiLCJ5U2l6ZSIsInhTaXplSGFsZiIsInlTaXplSGFsZiIsIml0ZW0iLCJmaW5kTGVhZiIsIl90aGlzJHVsQ2VsbCRmaW5kTGVhZiIsImhhcyIsInNlbGVjdCIsInciLCJoIiwieE1heCIsInlNYXgiLCJkdW1wIiwiUmVjdGFuZ2xlIiwiaW50ZXJzZWN0aW9uIiwib3RoZXIiLCJpc0luc2lkZSIsImlzT3V0c2lkZSIsInRvVHJpYW5nbGVzIiwiZGltIiwiZmlsbCIsIlNwbGl0IiwiaW50VG9CeXRlcyIsImJ5dGVzIiwiX1NwbGl0IiwiVWludDhDbGFtcGVkQXJyYXkiLCJVaW50MTZBcnJheSIsIlVpbnQzMkFycmF5IiwiX0JpbmRhYmxlIiwiQmluZGFibGUiLCJtYWtlQmluZGFibGUiLCJrZXlQcmVzcyIsImtleVJlbGVhc2UiLCJheGlzIiwidHJpZ2dlcnMiLCJmaXJlUmVnaW9uIiwid2F0ZXJSZWdpb24iLCJkaXJlY3Rpb24iLCJzdGF0ZSIsInJlbmRlck1vZGUiLCJyZWdpb24iLCJ4QXhpcyIsInlBeGlzIiwibWFwcyIsImdldE1hcHNGb3JQb2ludCIsImxvZyIsImNlaWwiLCJob3Jpem9udGFsIiwiZnJhbWVzIiwic2V0RnJhbWVzIiwiZGVzdHJveSIsIk1hcFJlbmRlcmVyIiwiUHJldmVudCIsImxvYWRlZCIsInRpbGVXaWR0aCIsInRpbGVIZWlnaHQiLCJ4T2Zmc2V0IiwieU9mZnNldCIsInRpbGVNYXBwaW5nIiwidGlsZVRleHR1cmUiLCJwYXJzZUludCIsInBpeGVsIiwiVWludDhBcnJheSIsInJlYWR5IiwidGhlbiIsInRpbGVTZXRXaWR0aCIsInRpbGVTZXRIZWlnaHQiLCJwaXhlbHMiLCJuZWdTYWZlTW9kIiwiaGFsZlRpbGVXaWR0aCIsImhhbGZUaWxlSGVpZ2h0IiwidGlsZXNXaWRlIiwidGlsZXNIaWdoIiwieFRpbGUiLCJ4V29ybGQiLCJ5VGlsZSIsInlXb3JsZCIsInhQb3MiLCJ5UG9zIiwiZHJhd1Byb2dyYW0iLCJhY3RpdmVUZXh0dXJlIiwiVEVYVFVSRTIiLCJURVhUVVJFMyIsInRpbGVQaXhlbExheWVycyIsImdldFNsaWNlIiwidGlsZVBpeGVscyIsInNldFJlY3RhbmdsZSIsImRyYXdCdWZmZXIiLCJkcmF3QXJyYXlzIiwiVFJJQU5HTEVTIiwiVEVYVFVSRTAiLCJhX3RleENvb3JkIiwiYnVmZmVyRGF0YSIsIkZsb2F0MzJBcnJheSIsIlNUQVRJQ19EUkFXIiwiYV9wb3NpdGlvbiIsIlBhcmFsbGF4TGF5ZXIiLCJQYXJhbGxheCIsInNsaWNlcyIsInBhcmFsbGF4TGF5ZXJzIiwidGV4dHVyZXMiLCJhc3NlbWJsZSIsImxvYWRTbGljZXMiLCJpbWFnZUxheWVycyIsImxheWVyRGF0YSIsImxvYWRJbWFnZSIsImltYWdlIiwiX2xheWVyRGF0YSRvZmZzZXR5IiwiX2xheWVyRGF0YSRwYXJhbGxheHgiLCJsYXllciIsImxheWVyQm90dG9tIiwib2Zmc2V0eSIsIm9mZnNldCIsInBhcmFsbGF4IiwicGFyYWxsYXh4IiwiUkVQRUFUIiwiUHJvbWlzZSIsImFsbCIsInJhdGlvIiwiaW1hZ2VQcm9taXNlcyIsImFjY2VwdCIsInJlamVjdCIsIkltYWdlIiwieiIsInNjYWxlIiwiZnJhbWVEZWxheSIsImN1cnJlbnREZWxheSIsImN1cnJlbnRGcmFtZSIsImN1cnJlbnRGcmFtZXMiLCJtb3ZpbmciLCJSSUdIVCIsIkRPV04iLCJMRUZUIiwiVVAiLCJFQVNUIiwiU09VVEgiLCJXRVNUIiwiTk9SVEgiLCJzdGFuZGluZyIsIndhbGtpbmciLCJzaGVldCIsImZyYW1lIiwiZ2V0RnJhbWUiLCJsb2FkVGV4dHVyZSIsIl90aGlzJHNwcml0ZUJvYXJkJGRyYSIsImVmZmVjdEJ1ZmZlciIsImZyYW1lU2VsZWN0b3IiLCJmcmFtZXNJZCIsImpvaW4iLCJnZXRGcmFtZXMiLCJ0cmFuc2Zvcm0iLCJwb2ludHMiLCJ4T2ZmIiwieU9mZiIsIm1hdHJpeFRyYW5zZm9ybSIsIm1hdHJpeENvbXBvc2l0ZSIsIm1hdHJpeFRyYW5zbGF0ZSIsIm1hdHJpeElkZW50aXR5IiwiZHgiLCJkeSIsIm1hdHJpeFNjYWxlIiwibWF0cml4Um90YXRlIiwidGhldGEiLCJzaW4iLCJjIiwiY29zIiwibWF0cml4U2hlYXJYIiwibWF0cml4U2hlYXJZIiwibWF0cml4TXVsdGlwbHkiLCJtYXRBIiwibWF0QiIsIm91dHB1dCIsIm1hdHJpeCIsInBvaW50Iiwicm93IiwiZmlsdGVyIiwiXyIsImltYWdlU3JjIiwicHJvbWlzZXMiLCJfR2wyZCIsIl9NYXBSZW5kZXJlciIsIl9QYXJhbGxheCIsIm1hcFJlbmRlcmVycyIsIm1vdXNlIiwiY2xpY2tYIiwiY2xpY2tZIiwiY29sb3JMb2NhdGlvbiIsInVfY29sb3IiLCJ0aWxlUG9zTG9jYXRpb24iLCJ1X3RpbGVObyIsInJlZ2lvbkxvY2F0aW9uIiwidV9yZWdpb24iLCJkcmF3TGF5ZXIiLCJlZmZlY3RMYXllciIsImNsaWVudFgiLCJjbGllbnRZIiwibSIsIm1yIiwiYmFycmVsIiwidmlld3BvcnQiLCJjbGVhckNvbG9yIiwiY2xlYXIiLCJDT0xPUl9CVUZGRVJfQklUIiwiYmFja2dyb3VuZENvbG9yIiwiY29sb3IiLCJzdWJzdHIiLCJnIiwiZm9yRWFjaCIsInNvcnQiLCJURVhUVVJFMSIsIlRFWFRVUkU0IiwiU1RSRUFNX0RSQVciLCJpbWFnZVVybCIsImJveGVzVXJsIiwidmVydGljZXMiLCJzaGVldExvYWRlciIsImZldGNoIiwicmVzcG9uc2UiLCJqc29uIiwiYm94ZXMiLCJpbWFnZUxvYWRlciIsIm9ubG9hZCIsInByb2Nlc3NJbWFnZSIsIndpbGxSZWFkRnJlcXVlbnRseSIsImRyYXdJbWFnZSIsImZyYW1lUHJvbWlzZXMiLCJfbG9vcCIsInN1YkNhbnZhcyIsInN1YkNvbnRleHQiLCJwdXRJbWFnZURhdGEiLCJnZXRJbWFnZURhdGEiLCJ0ZXh0IiwiZmlsbFN0eWxlIiwiZm9udCIsInRleHRBbGlnbiIsImZpbGxUZXh0IiwidG9CbG9iIiwiYmxvYiIsImZpbGVuYW1lIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiZ2V0VmVydGljZXMiLCJfdGhpczMiLCJnZXRGcmFtZXNCeVByZWZpeCIsInByZWZpeCIsInRleHR1cmVQcm9taXNlcyIsIlRleHR1cmVCYW5rIiwiX3JlZ2VuZXJhdG9yUnVudGltZSIsImhhc093blByb3BlcnR5IiwiYXN5bmNJdGVyYXRvciIsInRvU3RyaW5nVGFnIiwiZGVmaW5lIiwid3JhcCIsIkdlbmVyYXRvciIsIkNvbnRleHQiLCJtYWtlSW52b2tlTWV0aG9kIiwidHJ5Q2F0Y2giLCJhcmciLCJsIiwiR2VuZXJhdG9yRnVuY3Rpb24iLCJHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSIsInAiLCJkZWZpbmVJdGVyYXRvck1ldGhvZHMiLCJfaW52b2tlIiwiQXN5bmNJdGVyYXRvciIsImludm9rZSIsInJlc29sdmUiLCJfX2F3YWl0IiwiY2FsbEludm9rZVdpdGhNZXRob2RBbmRBcmciLCJtZXRob2QiLCJkZWxlZ2F0ZSIsIm1heWJlSW52b2tlRGVsZWdhdGUiLCJzZW50IiwiX3NlbnQiLCJkaXNwYXRjaEV4Y2VwdGlvbiIsImFicnVwdCIsInJlc3VsdE5hbWUiLCJuZXh0TG9jIiwicHVzaFRyeUVudHJ5IiwidHJ5TG9jIiwiY2F0Y2hMb2MiLCJmaW5hbGx5TG9jIiwiYWZ0ZXJMb2MiLCJ0cnlFbnRyaWVzIiwicmVzZXRUcnlFbnRyeSIsImNvbXBsZXRpb24iLCJyZXNldCIsImlzTmFOIiwiZGlzcGxheU5hbWUiLCJpc0dlbmVyYXRvckZ1bmN0aW9uIiwibWFyayIsImF3cmFwIiwiYXN5bmMiLCJyZXZlcnNlIiwicG9wIiwiY2hhckF0Iiwic3RvcCIsInJ2YWwiLCJoYW5kbGUiLCJjb21wbGV0ZSIsImZpbmlzaCIsIl9jYXRjaCIsImRlbGVnYXRlWWllbGQiLCJhc3luY0dlbmVyYXRvclN0ZXAiLCJfYXN5bmNUb0dlbmVyYXRvciIsIl9uZXh0IiwiX3Rocm93IiwiVGlsZXNldCIsImZpcnN0Z2lkIiwiY29sdW1ucyIsImltYWdlaGVpZ2h0IiwiaW1hZ2V3aWR0aCIsIm1hcmdpbiIsInNwYWNpbmciLCJ0aWxlY291bnQiLCJ0aWxlaGVpZ2h0IiwidGlsZXdpZHRoIiwidGlsZXMiLCJmaXJzdEdpZCIsImdldFJlYWR5IiwiX2dldFJlYWR5IiwiX2NhbGxlZSIsIl95aWVsZCR5aWVsZCRmZXRjaCRqcyIsInRpbGUiLCJfY2FsbGVlJCIsIl9jb250ZXh0IiwiaWQiLCJpbWFnZVdpZHRoIiwiaW1hZ2VIZWlnaHQiLCJ0aWxlQ291bnQiLCJfeCIsIl9WaWV3MiIsImRyYWdTdGFydCIsImRyYWdnaW5nIiwibW92ZVN0aWNrIiwiZHJvcFN0aWNrIiwiZHJhZ1N0aWNrIiwicG9zIiwicHJldmVudERlZmF1bHQiLCJ0b3VjaGVzIiwieHgiLCJ5eSIsImxpbWl0Iiwic2VsZWN0ZWRHcmFwaGljIiwid2FpdCIsIm11bHRpU2VsZWN0Iiwic2VsZWN0aW9uIiwic2VsZWN0ZWRJbWFnZSIsInNlbGVjdEdyYXBoaWMiLCJzZWxlY3RlZEltYWdlcyIsImdldFRpbGUiLCJGbG9vciIsIl9UaWxlc2V0IiwicHJvcGVydGllcyIsImNhbnZhc2VzIiwiTWFwIiwiY29udGV4dHMiLCJ0aWxlTGF5ZXJzIiwib2JqZWN0TGF5ZXJzIiwiYW5pbWF0aW9ucyIsIm1hcERhdGEiLCJwcm9wZXJ0eSIsInRpbGVzZXRzIiwibGF5ZXJzIiwiYmFja2dyb3VuZGNvbG9yIiwidGlsZVRvdGFsIiwic3FydCIsImRlc3RpbmF0aW9uIiwiY3R4RGVzdGluYXRpb24iLCJ4RGVzdGluYXRpb24iLCJ5RGVzdGluYXRpb24iLCJ0aWxlc2V0IiwieFNvdXJjZSIsInlTb3VyY2UiLCJjdHhTb3VyY2UiLCJkYXRhIiwidXJsIiwicmV2b2tlT2JqZWN0VVJMIiwiX2l0ZXJhdG9yMyIsIl9zdGVwMyIsIl9pdGVyYXRvcjUiLCJfc3RlcDUiLCJ0aWxlRGF0YSIsImFuaW1hdGlvbiIsInNldCIsIl9pdGVyYXRvcjQiLCJfc3RlcDQiLCJ0aWxlVmFsdWVzIiwiSW1hZ2VEYXRhIiwibVRyZWUiLCJyZWN0TWFwIiwid29ybGREYXRhIiwiZmlsZU5hbWUiLCJyZWN0IiwicmVjdHMiLCJXZWJTb2NrZXQiLCJNb3pXZWJTb2NrZXQiLCJiciIsImJydW5jaCIsImFyIiwiZGlzYWJsZWQiLCJfYXIiLCJjYWNoZUJ1c3RlciIsImRhdGUiLCJyb3VuZCIsIkRhdGUiLCJyZXBsYWNlIiwiaW5kZXhPZiIsImJyb3dzZXIiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJ0b0xvd2VyQ2FzZSIsImZvcmNlUmVwYWludCIsInJlbG9hZGVycyIsInBhZ2UiLCJyZWxvYWQiLCJzdHlsZXNoZWV0IiwicXVlcnlTZWxlY3RvckFsbCIsImxpbmsiLCJ2YWwiLCJnZXRBdHRyaWJ1dGUiLCJocmVmIiwic2V0VGltZW91dCIsIm9mZnNldEhlaWdodCIsImphdmFzY3JpcHQiLCJzY3JpcHRzIiwidGV4dFNjcmlwdHMiLCJzY3JpcHQiLCJzcmNTY3JpcHRzIiwib25Mb2FkIiwiZXZhbCIsInJlbW92ZSIsIm5ld1NjcmlwdCIsImhlYWQiLCJhcHBlbmRDaGlsZCIsInBvcnQiLCJob3N0Iiwic2VydmVyIiwiaG9zdG5hbWUiLCJjb25uZWN0IiwiY29ubmVjdGlvbiIsIm9ubWVzc2FnZSIsIm1lc3NhZ2UiLCJyZWxvYWRlciIsIm9uZXJyb3IiLCJyZWFkeVN0YXRlIiwiY2xvc2UiLCJvbmNsb3NlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcjNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7SUM5S2FBLE1BQU0sR0FBQUMsT0FBQSxDQUFBRCxNQUFBLGdCQUFBRSxZQUFBLFVBQUFGLE9BQUE7RUFBQUcsZUFBQSxPQUFBSCxNQUFBO0FBQUE7QUFBRztBQUV0QkEsTUFBTSxDQUFDSSxLQUFLLEdBQUcsT0FBTztBQUN0Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUNITUMsT0FBTztFQVNaLFNBQUFBLFFBQUFDLElBQUEsRUFDQTtJQUFBLElBRGFDLEVBQUUsR0FBQUQsSUFBQSxDQUFGQyxFQUFFO01BQUVDLFlBQVksR0FBQUYsSUFBQSxDQUFaRSxZQUFZO01BQUVDLGNBQWMsR0FBQUgsSUFBQSxDQUFkRyxjQUFjO01BQUVDLFFBQVEsR0FBQUosSUFBQSxDQUFSSSxRQUFRO01BQUVDLFVBQVUsR0FBQUwsSUFBQSxDQUFWSyxVQUFVO0lBQUFSLGVBQUEsT0FBQUUsT0FBQTtJQUFBTyxlQUFBLGtCQVB6RCxJQUFJO0lBQUFBLGVBQUEsa0JBQ0osSUFBSTtJQUFBQSxlQUFBLHFCQUVELENBQUMsQ0FBQztJQUFBQSxlQUFBLGtCQUNMLENBQUMsQ0FBQztJQUFBQSxlQUFBLG1CQUNELENBQUMsQ0FBQztJQUlaLElBQUksQ0FBQ0MsT0FBTyxHQUFHTixFQUFFO0lBQ2pCLElBQUksQ0FBQ08sT0FBTyxHQUFHUCxFQUFFLENBQUNRLGFBQWEsQ0FBQyxDQUFDO0lBRWpDUixFQUFFLENBQUNTLFlBQVksQ0FBQyxJQUFJLENBQUNGLE9BQU8sRUFBRU4sWUFBWSxDQUFDO0lBQzNDRCxFQUFFLENBQUNTLFlBQVksQ0FBQyxJQUFJLENBQUNGLE9BQU8sRUFBRUwsY0FBYyxDQUFDO0lBRTdDRixFQUFFLENBQUNVLFdBQVcsQ0FBQyxJQUFJLENBQUNILE9BQU8sQ0FBQztJQUU1QlAsRUFBRSxDQUFDVyxZQUFZLENBQUMsSUFBSSxDQUFDSixPQUFPLEVBQUVOLFlBQVksQ0FBQztJQUMzQ0QsRUFBRSxDQUFDVyxZQUFZLENBQUMsSUFBSSxDQUFDSixPQUFPLEVBQUVMLGNBQWMsQ0FBQztJQUU3Q0YsRUFBRSxDQUFDWSxZQUFZLENBQUNYLFlBQVksQ0FBQztJQUM3QkQsRUFBRSxDQUFDWSxZQUFZLENBQUNWLGNBQWMsQ0FBQztJQUUvQixJQUFHLENBQUNGLEVBQUUsQ0FBQ2EsbUJBQW1CLENBQUMsSUFBSSxDQUFDTixPQUFPLEVBQUVQLEVBQUUsQ0FBQ2MsV0FBVyxDQUFDLEVBQ3hEO01BQ0NDLE9BQU8sQ0FBQ0MsS0FBSyxDQUFDaEIsRUFBRSxDQUFDaUIsaUJBQWlCLENBQUMsSUFBSSxDQUFDVixPQUFPLENBQUMsQ0FBQztNQUNqRFAsRUFBRSxDQUFDa0IsYUFBYSxDQUFDLElBQUksQ0FBQ1gsT0FBTyxDQUFDO0lBQy9CO0lBQUMsSUFBQVksU0FBQSxHQUFBQywwQkFBQSxDQUVvQmpCLFFBQVE7TUFBQWtCLEtBQUE7SUFBQTtNQUE3QixLQUFBRixTQUFBLENBQUFHLENBQUEsTUFBQUQsS0FBQSxHQUFBRixTQUFBLENBQUFJLENBQUEsSUFBQUMsSUFBQSxHQUNBO1FBQUEsSUFEVUMsT0FBTyxHQUFBSixLQUFBLENBQUFLLEtBQUE7UUFFaEIsSUFBTUMsUUFBUSxHQUFHM0IsRUFBRSxDQUFDNEIsa0JBQWtCLENBQUMsSUFBSSxDQUFDckIsT0FBTyxFQUFFa0IsT0FBTyxDQUFDO1FBRTdELElBQUdFLFFBQVEsS0FBSyxJQUFJLEVBQ3BCO1VBQ0NaLE9BQU8sQ0FBQ2MsSUFBSSxZQUFBQyxNQUFBLENBQVlMLE9BQU8sZ0JBQWEsQ0FBQztVQUM3QztRQUNEO1FBRUEsSUFBSSxDQUFDdEIsUUFBUSxDQUFDc0IsT0FBTyxDQUFDLEdBQUdFLFFBQVE7TUFDbEM7SUFBQyxTQUFBSSxHQUFBO01BQUFaLFNBQUEsQ0FBQWEsQ0FBQSxDQUFBRCxHQUFBO0lBQUE7TUFBQVosU0FBQSxDQUFBYyxDQUFBO0lBQUE7SUFBQSxJQUFBQyxVQUFBLEdBQUFkLDBCQUFBLENBRXNCaEIsVUFBVTtNQUFBK0IsTUFBQTtJQUFBO01BQWpDLEtBQUFELFVBQUEsQ0FBQVosQ0FBQSxNQUFBYSxNQUFBLEdBQUFELFVBQUEsQ0FBQVgsQ0FBQSxJQUFBQyxJQUFBLEdBQ0E7UUFBQSxJQURVWSxTQUFTLEdBQUFELE1BQUEsQ0FBQVQsS0FBQTtRQUVsQixJQUFNQyxTQUFRLEdBQUczQixFQUFFLENBQUNxQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM5QixPQUFPLEVBQUU2QixTQUFTLENBQUM7UUFFOUQsSUFBR1QsU0FBUSxLQUFLLElBQUksRUFDcEI7VUFDQ1osT0FBTyxDQUFDYyxJQUFJLGNBQUFDLE1BQUEsQ0FBY00sU0FBUyxnQkFBYSxDQUFDO1VBQ2pEO1FBQ0Q7UUFFQSxJQUFNRSxNQUFNLEdBQUd0QyxFQUFFLENBQUN1QyxZQUFZLENBQUMsQ0FBQztRQUVoQ3ZDLEVBQUUsQ0FBQ3dDLFVBQVUsQ0FBQ3hDLEVBQUUsQ0FBQ3lDLFlBQVksRUFBRUgsTUFBTSxDQUFDO1FBQ3RDdEMsRUFBRSxDQUFDMEMsdUJBQXVCLENBQUNmLFNBQVEsQ0FBQztRQUNwQzNCLEVBQUUsQ0FBQzJDLG1CQUFtQixDQUNyQmhCLFNBQVEsRUFDTixDQUFDLEVBQ0QzQixFQUFFLENBQUM0QyxLQUFLLEVBQ1IsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUNILENBQUM7UUFFRCxJQUFJLENBQUN4QyxVQUFVLENBQUNnQyxTQUFTLENBQUMsR0FBR1QsU0FBUTtRQUNyQyxJQUFJLENBQUNrQixPQUFPLENBQUNULFNBQVMsQ0FBQyxHQUFHRSxNQUFNO01BQ2pDO0lBQUMsU0FBQVAsR0FBQTtNQUFBRyxVQUFBLENBQUFGLENBQUEsQ0FBQUQsR0FBQTtJQUFBO01BQUFHLFVBQUEsQ0FBQUQsQ0FBQTtJQUFBO0VBQ0Y7RUFBQyxPQUFBdEMsWUFBQSxDQUFBRyxPQUFBO0lBQUFnRCxHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQXFCLEdBQUdBLENBQUEsRUFDSDtNQUNDLElBQUksQ0FBQ3pDLE9BQU8sQ0FBQzBDLFVBQVUsQ0FBQyxJQUFJLENBQUN6QyxPQUFPLENBQUM7SUFDdEM7RUFBQztJQUFBdUMsR0FBQTtJQUFBcEIsS0FBQSxFQUVELFNBQUF1QixRQUFRQSxDQUFDQyxJQUFJLEVBQ2I7TUFDQyxJQUFNbEQsRUFBRSxHQUFHLElBQUksQ0FBQ00sT0FBTztNQUFDLFNBQUE2QyxJQUFBLEdBQUFDLFNBQUEsQ0FBQUMsTUFBQSxFQUZQQyxNQUFNLE9BQUFDLEtBQUEsQ0FBQUosSUFBQSxPQUFBQSxJQUFBLFdBQUFLLElBQUEsTUFBQUEsSUFBQSxHQUFBTCxJQUFBLEVBQUFLLElBQUE7UUFBTkYsTUFBTSxDQUFBRSxJQUFBLFFBQUFKLFNBQUEsQ0FBQUksSUFBQTtNQUFBO01BR3ZCeEQsRUFBRSxXQUFBOEIsTUFBQSxDQUFXd0IsTUFBTSxDQUFDRCxNQUFNLE9BQUksQ0FBQUksS0FBQSxDQUE5QnpELEVBQUUsR0FBNkIsSUFBSSxDQUFDRyxRQUFRLENBQUMrQyxJQUFJLENBQUMsRUFBQXBCLE1BQUEsQ0FBS3dCLE1BQU0sRUFBQztJQUMvRDtFQUFDO0lBQUFSLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBZ0MsUUFBUUEsQ0FBQ1IsSUFBSSxFQUNiO01BQ0MsSUFBTWxELEVBQUUsR0FBRyxJQUFJLENBQUNNLE9BQU87TUFBQyxTQUFBcUQsS0FBQSxHQUFBUCxTQUFBLENBQUFDLE1BQUEsRUFGUE8sSUFBSSxPQUFBTCxLQUFBLENBQUFJLEtBQUEsT0FBQUEsS0FBQSxXQUFBRSxLQUFBLE1BQUFBLEtBQUEsR0FBQUYsS0FBQSxFQUFBRSxLQUFBO1FBQUpELElBQUksQ0FBQUMsS0FBQSxRQUFBVCxTQUFBLENBQUFTLEtBQUE7TUFBQTtNQUdyQjdELEVBQUUsV0FBQThCLE1BQUEsQ0FBVzhCLElBQUksQ0FBQ1AsTUFBTSxPQUFJLENBQUFJLEtBQUEsQ0FBNUJ6RCxFQUFFLEdBQTJCLElBQUksQ0FBQ0csUUFBUSxDQUFDK0MsSUFBSSxDQUFDLEVBQUFwQixNQUFBLENBQUs4QixJQUFJLEVBQUM7SUFDM0Q7RUFBQztBQUFBO0FBQUEsSUFHV0UsSUFBSSxHQUFBcEUsT0FBQSxDQUFBb0UsSUFBQTtFQUVoQixTQUFBQSxLQUFZQyxPQUFPLEVBQ25CO0lBQUFuRSxlQUFBLE9BQUFrRSxJQUFBO0lBQ0MsSUFBSSxDQUFDQyxPQUFPLEdBQUdBLE9BQU8sSUFBSUMsUUFBUSxDQUFDQyxhQUFhLENBQUMsUUFBUSxDQUFDO0lBQzFELElBQUksQ0FBQzNELE9BQU8sR0FBRyxJQUFJLENBQUN5RCxPQUFPLENBQUNHLFVBQVUsQ0FBQyxPQUFPLENBQUM7SUFDL0MsSUFBSSxDQUFDQyxXQUFXLEdBQUcsQ0FBQztJQUNwQixJQUFJLENBQUNDLFNBQVMsR0FBRyxDQUFDO0VBQ25CO0VBQUMsT0FBQXpFLFlBQUEsQ0FBQW1FLElBQUE7SUFBQWhCLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBMkMsWUFBWUEsQ0FBQzFDLFFBQVEsRUFDckI7TUFDQyxJQUFNMkMsU0FBUyxHQUFHM0MsUUFBUSxDQUFDNEMsU0FBUyxDQUFDNUMsUUFBUSxDQUFDNkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQztNQUNqRSxJQUFNQyxJQUFJLEdBQUcsSUFBSTtNQUVqQixRQUFPSCxTQUFTLENBQUNJLFdBQVcsQ0FBQyxDQUFDO1FBRTdCLEtBQUssTUFBTTtVQUNWRCxJQUFJLEdBQUcsSUFBSSxDQUFDbkUsT0FBTyxDQUFDcUUsYUFBYTtVQUNqQztRQUNELEtBQUssTUFBTTtVQUNWRixJQUFJLEdBQUcsSUFBSSxDQUFDbkUsT0FBTyxDQUFDc0UsZUFBZTtVQUNuQztNQUNGO01BRUEsSUFBTUMsTUFBTSxHQUFHLElBQUksQ0FBQ3ZFLE9BQU8sQ0FBQytELFlBQVksQ0FBQ0ksSUFBSSxDQUFDO01BQzlDLElBQU1LLE1BQU0sR0FBR0MsT0FBTyxDQUFDcEQsUUFBUSxDQUFDO01BRWhDLElBQUksQ0FBQ3JCLE9BQU8sQ0FBQzBFLFlBQVksQ0FBQ0gsTUFBTSxFQUFFQyxNQUFNLENBQUM7TUFDekMsSUFBSSxDQUFDeEUsT0FBTyxDQUFDMkUsYUFBYSxDQUFDSixNQUFNLENBQUM7TUFFbEMsSUFBTUssT0FBTyxHQUFHLElBQUksQ0FBQzVFLE9BQU8sQ0FBQzZFLGtCQUFrQixDQUM5Q04sTUFBTSxFQUNKLElBQUksQ0FBQ3ZFLE9BQU8sQ0FBQzhFLGNBQ2hCLENBQUM7TUFFRCxJQUFHRixPQUFPLEVBQ1Y7UUFDQyxPQUFPTCxNQUFNO01BQ2Q7TUFFQTlELE9BQU8sQ0FBQ0MsS0FBSyxDQUFDLElBQUksQ0FBQ1YsT0FBTyxDQUFDK0UsZ0JBQWdCLENBQUNSLE1BQU0sQ0FBQyxDQUFDO01BRXBELElBQUksQ0FBQ3ZFLE9BQU8sQ0FBQ00sWUFBWSxDQUFDaUUsTUFBTSxDQUFDO0lBQ2xDO0VBQUM7SUFBQS9CLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBbEIsYUFBYUEsQ0FBQThFLEtBQUEsRUFDYjtNQUFBLElBRGVyRixZQUFZLEdBQUFxRixLQUFBLENBQVpyRixZQUFZO1FBQUVDLGNBQWMsR0FBQW9GLEtBQUEsQ0FBZHBGLGNBQWM7UUFBRUMsUUFBUSxHQUFBbUYsS0FBQSxDQUFSbkYsUUFBUTtRQUFFQyxVQUFVLEdBQUFrRixLQUFBLENBQVZsRixVQUFVO01BRWhFLElBQU1KLEVBQUUsR0FBRyxJQUFJLENBQUNNLE9BQU87TUFFdkIsT0FBTyxJQUFJUixPQUFPLENBQUM7UUFBQ0UsRUFBRSxFQUFGQSxFQUFFO1FBQUVDLFlBQVksRUFBWkEsWUFBWTtRQUFFQyxjQUFjLEVBQWRBLGNBQWM7UUFBRUMsUUFBUSxFQUFSQSxRQUFRO1FBQUVDLFVBQVUsRUFBVkE7TUFBVSxDQUFDLENBQUM7SUFDN0U7RUFBQztJQUFBMEMsR0FBQTtJQUFBcEIsS0FBQSxFQUVELFNBQUE2RCxhQUFhQSxDQUFDQyxLQUFLLEVBQUVDLE1BQU0sRUFDM0I7TUFDQyxJQUFNekYsRUFBRSxHQUFHLElBQUksQ0FBQ00sT0FBTztNQUN2QixJQUFNb0YsT0FBTyxHQUFHMUYsRUFBRSxDQUFDdUYsYUFBYSxDQUFDLENBQUM7TUFFbEN2RixFQUFFLENBQUMyRixXQUFXLENBQUMzRixFQUFFLENBQUM0RixVQUFVLEVBQUVGLE9BQU8sQ0FBQztNQUN0QzFGLEVBQUUsQ0FBQzZGLFVBQVUsQ0FDWjdGLEVBQUUsQ0FBQzRGLFVBQVUsRUFDWCxDQUFDLEVBQ0Q1RixFQUFFLENBQUM4RixJQUFJLEVBQ1BOLEtBQUssRUFDTEMsTUFBTSxFQUNOLENBQUMsRUFDRHpGLEVBQUUsQ0FBQzhGLElBQUksRUFDUDlGLEVBQUUsQ0FBQytGLGFBQWEsRUFDaEIsSUFDSCxDQUFDO01BRUQvRixFQUFFLENBQUNnRyxhQUFhLENBQUNoRyxFQUFFLENBQUM0RixVQUFVLEVBQUU1RixFQUFFLENBQUNpRyxjQUFjLEVBQUVqRyxFQUFFLENBQUNrRyxhQUFhLENBQUM7TUFDcEVsRyxFQUFFLENBQUNnRyxhQUFhLENBQUNoRyxFQUFFLENBQUM0RixVQUFVLEVBQUU1RixFQUFFLENBQUNtRyxjQUFjLEVBQUVuRyxFQUFFLENBQUNrRyxhQUFhLENBQUM7O01BRXBFO01BQ0E7O01BRUFsRyxFQUFFLENBQUNnRyxhQUFhLENBQUNoRyxFQUFFLENBQUM0RixVQUFVLEVBQUU1RixFQUFFLENBQUNvRyxrQkFBa0IsRUFBRXBHLEVBQUUsQ0FBQ3FHLE9BQU8sQ0FBQztNQUNsRXJHLEVBQUUsQ0FBQ2dHLGFBQWEsQ0FBQ2hHLEVBQUUsQ0FBQzRGLFVBQVUsRUFBRTVGLEVBQUUsQ0FBQ3NHLGtCQUFrQixFQUFFdEcsRUFBRSxDQUFDcUcsT0FBTyxDQUFDO01BR2xFLE9BQU9YLE9BQU87SUFDZjtFQUFDO0lBQUE1QyxHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQTZFLGlCQUFpQkEsQ0FBQ2IsT0FBTyxFQUN6QjtNQUNDLElBQU0xRixFQUFFLEdBQUcsSUFBSSxDQUFDTSxPQUFPO01BRXZCLElBQU1rRyxXQUFXLEdBQUd4RyxFQUFFLENBQUN1RyxpQkFBaUIsQ0FBQyxDQUFDO01BRTFDdkcsRUFBRSxDQUFDeUcsZUFBZSxDQUFDekcsRUFBRSxDQUFDMEcsV0FBVyxFQUFFRixXQUFXLENBQUM7TUFFL0N4RyxFQUFFLENBQUMyRyxvQkFBb0IsQ0FDdEIzRyxFQUFFLENBQUMwRyxXQUFXLEVBQ1oxRyxFQUFFLENBQUM0RyxpQkFBaUIsRUFDcEI1RyxFQUFFLENBQUM0RixVQUFVLEVBQ2JGLE9BQU8sRUFDUCxDQUNILENBQUM7TUFFRCxPQUFPYyxXQUFXO0lBQ25CO0VBQUM7SUFBQTFELEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBbUYsY0FBY0EsQ0FBQSxFQUNkO01BQ0MsSUFBTTdHLEVBQUUsR0FBRyxJQUFJLENBQUNNLE9BQU87TUFDdkJOLEVBQUUsQ0FBQzhHLFNBQVMsQ0FBQzlHLEVBQUUsQ0FBQytHLFNBQVMsRUFBRS9HLEVBQUUsQ0FBQ2dILG1CQUFtQixDQUFDO01BQ2xEaEgsRUFBRSxDQUFDaUgsTUFBTSxDQUFDakgsRUFBRSxDQUFDa0gsS0FBSyxDQUFDO0lBQ3BCO0VBQUM7QUFBQTs7Ozs7Ozs7Ozs7QUN0TUYsSUFBQUMsS0FBQSxHQUFBcEMsT0FBQTtBQUNBLElBQUFxQyxTQUFBLEdBQUFyQyxPQUFBO0FBQ0EsSUFBQXNDLElBQUEsR0FBQXRDLE9BQUE7QUFFQSxJQUFBdUMsT0FBQSxHQUFBdkMsT0FBQTtBQUVBLElBQUF3QyxRQUFBLEdBQUF4QyxPQUFBO0FBRUEsSUFBQXlDLFlBQUEsR0FBQXpDLE9BQUE7QUFDQSxJQUFBMEMsWUFBQSxHQUFBMUMsT0FBQTtBQUVBLElBQUEyQyxXQUFBLEdBQUEzQyxPQUFBO0FBQ0EsSUFBQTRDLFVBQUEsR0FBQTVDLE9BQUE7QUFFQSxJQUFBNkMsT0FBQSxHQUFBN0MsT0FBQTtBQUNBLElBQUE4QyxPQUFBLEdBQUE5QyxPQUFBO0FBRUEsSUFBQStDLFlBQUEsR0FBQS9DLE9BQUE7QUFDQSxJQUFBZ0QsT0FBQSxHQUFBaEQsT0FBQTtBQUNBLElBQUFpRCxNQUFBLEdBQUFqRCxPQUFBO0FBQ0EsSUFBQWtELFNBQUEsR0FBQWxELE9BQUE7QUFDQSxJQUFBbUQsVUFBQSxHQUFBbkQsT0FBQTtBQUNBLElBQUFvRCxNQUFBLEdBQUFwRCxPQUFBO0FBQXNDLFNBQUFuRixnQkFBQXdJLENBQUEsRUFBQTdHLENBQUEsVUFBQTZHLENBQUEsWUFBQTdHLENBQUEsYUFBQThHLFNBQUE7QUFBQSxTQUFBQyxrQkFBQXRHLENBQUEsRUFBQXVHLENBQUEsYUFBQUMsQ0FBQSxNQUFBQSxDQUFBLEdBQUFELENBQUEsQ0FBQWxGLE1BQUEsRUFBQW1GLENBQUEsVUFBQUMsQ0FBQSxHQUFBRixDQUFBLENBQUFDLENBQUEsR0FBQUMsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsQ0FBQUMsVUFBQSxRQUFBRCxDQUFBLENBQUFFLFlBQUEsa0JBQUFGLENBQUEsS0FBQUEsQ0FBQSxDQUFBRyxRQUFBLFFBQUFDLE1BQUEsQ0FBQUMsY0FBQSxDQUFBOUcsQ0FBQSxFQUFBK0csY0FBQSxDQUFBTixDQUFBLENBQUEzRixHQUFBLEdBQUEyRixDQUFBO0FBQUEsU0FBQTlJLGFBQUFxQyxDQUFBLEVBQUF1RyxDQUFBLEVBQUFDLENBQUEsV0FBQUQsQ0FBQSxJQUFBRCxpQkFBQSxDQUFBdEcsQ0FBQSxDQUFBZ0gsU0FBQSxFQUFBVCxDQUFBLEdBQUFDLENBQUEsSUFBQUYsaUJBQUEsQ0FBQXRHLENBQUEsRUFBQXdHLENBQUEsR0FBQUssTUFBQSxDQUFBQyxjQUFBLENBQUE5RyxDQUFBLGlCQUFBNEcsUUFBQSxTQUFBNUcsQ0FBQTtBQUFBLFNBQUErRyxlQUFBUCxDQUFBLFFBQUFTLENBQUEsR0FBQUMsWUFBQSxDQUFBVixDQUFBLGdDQUFBVyxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVYsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBWSxPQUFBLENBQUFYLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUF4RyxDQUFBLEdBQUF3RyxDQUFBLENBQUFZLE1BQUEsQ0FBQUMsV0FBQSxrQkFBQXJILENBQUEsUUFBQWlILENBQUEsR0FBQWpILENBQUEsQ0FBQXNILElBQUEsQ0FBQWQsQ0FBQSxFQUFBRCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsVUFBQUEsQ0FBQSxZQUFBWixTQUFBLHlFQUFBRSxDQUFBLEdBQUFnQixNQUFBLEdBQUFDLE1BQUEsRUFBQWhCLENBQUE7QUFBQSxTQUFBaUIsV0FBQWpCLENBQUEsRUFBQUMsQ0FBQSxFQUFBekcsQ0FBQSxXQUFBeUcsQ0FBQSxHQUFBaUIsZUFBQSxDQUFBakIsQ0FBQSxHQUFBa0IsMEJBQUEsQ0FBQW5CLENBQUEsRUFBQW9CLHlCQUFBLEtBQUFDLE9BQUEsQ0FBQUMsU0FBQSxDQUFBckIsQ0FBQSxFQUFBekcsQ0FBQSxRQUFBMEgsZUFBQSxDQUFBbEIsQ0FBQSxFQUFBdUIsV0FBQSxJQUFBdEIsQ0FBQSxDQUFBaEYsS0FBQSxDQUFBK0UsQ0FBQSxFQUFBeEcsQ0FBQTtBQUFBLFNBQUEySCwyQkFBQW5CLENBQUEsRUFBQXhHLENBQUEsUUFBQUEsQ0FBQSxpQkFBQW1ILE9BQUEsQ0FBQW5ILENBQUEsMEJBQUFBLENBQUEsVUFBQUEsQ0FBQSxpQkFBQUEsQ0FBQSxZQUFBcUcsU0FBQSxxRUFBQTJCLHNCQUFBLENBQUF4QixDQUFBO0FBQUEsU0FBQXdCLHVCQUFBaEksQ0FBQSxtQkFBQUEsQ0FBQSxZQUFBaUksY0FBQSxzRUFBQWpJLENBQUE7QUFBQSxTQUFBNEgsMEJBQUEsY0FBQXBCLENBQUEsSUFBQTBCLE9BQUEsQ0FBQWxCLFNBQUEsQ0FBQW1CLE9BQUEsQ0FBQWIsSUFBQSxDQUFBTyxPQUFBLENBQUFDLFNBQUEsQ0FBQUksT0FBQSxpQ0FBQTFCLENBQUEsYUFBQW9CLHlCQUFBLFlBQUFBLDBCQUFBLGFBQUFwQixDQUFBO0FBQUEsU0FBQWtCLGdCQUFBbEIsQ0FBQSxXQUFBa0IsZUFBQSxHQUFBYixNQUFBLENBQUF1QixjQUFBLEdBQUF2QixNQUFBLENBQUF3QixjQUFBLENBQUFDLElBQUEsZUFBQTlCLENBQUEsV0FBQUEsQ0FBQSxDQUFBK0IsU0FBQSxJQUFBMUIsTUFBQSxDQUFBd0IsY0FBQSxDQUFBN0IsQ0FBQSxNQUFBa0IsZUFBQSxDQUFBbEIsQ0FBQTtBQUFBLFNBQUFnQyxVQUFBaEMsQ0FBQSxFQUFBeEcsQ0FBQSw2QkFBQUEsQ0FBQSxhQUFBQSxDQUFBLFlBQUFxRyxTQUFBLHdEQUFBRyxDQUFBLENBQUFRLFNBQUEsR0FBQUgsTUFBQSxDQUFBNEIsTUFBQSxDQUFBekksQ0FBQSxJQUFBQSxDQUFBLENBQUFnSCxTQUFBLElBQUFlLFdBQUEsSUFBQXJJLEtBQUEsRUFBQThHLENBQUEsRUFBQUksUUFBQSxNQUFBRCxZQUFBLFdBQUFFLE1BQUEsQ0FBQUMsY0FBQSxDQUFBTixDQUFBLGlCQUFBSSxRQUFBLFNBQUE1RyxDQUFBLElBQUEwSSxlQUFBLENBQUFsQyxDQUFBLEVBQUF4RyxDQUFBO0FBQUEsU0FBQTBJLGdCQUFBbEMsQ0FBQSxFQUFBeEcsQ0FBQSxXQUFBMEksZUFBQSxHQUFBN0IsTUFBQSxDQUFBdUIsY0FBQSxHQUFBdkIsTUFBQSxDQUFBdUIsY0FBQSxDQUFBRSxJQUFBLGVBQUE5QixDQUFBLEVBQUF4RyxDQUFBLFdBQUF3RyxDQUFBLENBQUErQixTQUFBLEdBQUF2SSxDQUFBLEVBQUF3RyxDQUFBLEtBQUFrQyxlQUFBLENBQUFsQyxDQUFBLEVBQUF4RyxDQUFBO0FBRXRDLElBQU0ySSxXQUFXLEdBQUcsQ0FBQyxDQUFDO0FBRXRCQSxXQUFXLENBQUNDLGNBQWMsR0FBRyxJQUFJQyxzQkFBYyxDQUFELENBQUM7QUFDL0NGLFdBQVcsQ0FBQ0csUUFBUSxHQUFHQyxrQkFBUSxDQUFDQyxHQUFHLENBQUMsQ0FBQztBQUdyQyxJQUFNQyxJQUFJLEdBQUcsSUFBSUMsa0JBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDO0FBQy9DRCxJQUFJLENBQUNFLE1BQU0sQ0FBQztFQUFDQyxDQUFDLEVBQUUsRUFBRTtFQUFFQyxDQUFDLEVBQUU7QUFBRSxDQUFDLENBQUM7QUFDM0JKLElBQUksQ0FBQ0UsTUFBTSxDQUFDO0VBQUNDLENBQUMsRUFBRSxFQUFFO0VBQUVDLENBQUMsRUFBRTtBQUFFLENBQUMsQ0FBQztBQUMzQkosSUFBSSxDQUFDRSxNQUFNLENBQUM7RUFBQ0MsQ0FBQyxFQUFFLEVBQUU7RUFBRUMsQ0FBQyxFQUFFO0FBQUUsQ0FBQyxDQUFDO0FBQzNCSixJQUFJLENBQUNFLE1BQU0sQ0FBQztFQUFDQyxDQUFDLEVBQUUsRUFBRTtFQUFFQyxDQUFDLEVBQUU7QUFBRSxDQUFDLENBQUM7O0FBRTNCO0FBQ0E7QUFDQTs7QUFFQSxJQUFNQyxPQUFPLEdBQUcsSUFBSUMsWUFBSyxDQUFELENBQUM7O0FBRXpCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFBQSxJQUVhQyxJQUFJLEdBQUE5TCxPQUFBLENBQUE4TCxJQUFBLDBCQUFBQyxTQUFBO0VBRWhCLFNBQUFELEtBQVlFLElBQUksRUFDaEI7SUFBQSxJQUFBQyxLQUFBO0lBQUEvTCxlQUFBLE9BQUE0TCxJQUFBO0lBQ0NJLE1BQU0sQ0FBQ0MsV0FBVyxHQUFHLElBQUk7SUFDekJGLEtBQUEsR0FBQWxDLFVBQUEsT0FBQStCLElBQUEsR0FBTUUsSUFBSTtJQUNWQyxLQUFBLENBQUtHLFFBQVEsR0FBSS9HLE9BQU8sQ0FBQyxZQUFZLENBQUM7SUFDdEM0RyxLQUFBLENBQUtJLE1BQU0sR0FBTSxFQUFFO0lBRW5CSixLQUFBLENBQUtLLFFBQVEsR0FBSSxJQUFJQyxRQUFHLENBQUQsQ0FBQztJQUN4Qk4sS0FBQSxDQUFLYixRQUFRLEdBQUlILFdBQVcsQ0FBQ0csUUFBUTtJQUNyQ2EsS0FBQSxDQUFLTyxLQUFLLEdBQU8sRUFBRTtJQUNuQlAsS0FBQSxDQUFLUSxRQUFRLEdBQUlSLEtBQUEsQ0FBS08sS0FBSztJQUUzQlAsS0FBQSxDQUFLRCxJQUFJLENBQUNVLFVBQVUsR0FBR3pCLFdBQVcsQ0FBQ0MsY0FBYztJQUVqRGUsS0FBQSxDQUFLRCxJQUFJLENBQUNXLEdBQUcsR0FBSSxDQUFDO0lBQ2xCVixLQUFBLENBQUtELElBQUksQ0FBQ1ksR0FBRyxHQUFJLENBQUM7SUFFbEJYLEtBQUEsQ0FBS0QsSUFBSSxDQUFDYSxJQUFJLEdBQUcsQ0FBQztJQUNsQlosS0FBQSxDQUFLRCxJQUFJLENBQUNjLElBQUksR0FBRyxDQUFDO0lBRWxCYixLQUFBLENBQUtELElBQUksQ0FBQ2UsU0FBUyxHQUFHLEVBQUU7SUFDeEJkLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZ0IsY0FBYyxHQUFHLEVBQUU7SUFFN0JmLEtBQUEsQ0FBS0QsSUFBSSxDQUFDaUIsVUFBVSxHQUFHLEtBQUs7SUFFNUJoQixLQUFBLENBQUtiLFFBQVEsQ0FBQzhCLFNBQVMsR0FBRyxJQUFJO0lBRTlCakIsS0FBQSxDQUFLYixRQUFRLENBQUMrQixJQUFJLENBQUNDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsVUFBQ0MsQ0FBQyxFQUFDQyxDQUFDLEVBQUN4RSxDQUFDLEVBQUN5RSxDQUFDLEVBQUc7TUFDOUMsSUFBR0YsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUNYO1FBQ0NwQixLQUFBLENBQUt1QixXQUFXLENBQUNDLFFBQVEsQ0FBQyxDQUFDO01BQzVCO0lBQ0QsQ0FBQyxDQUFDO0lBRUZ4QixLQUFBLENBQUtiLFFBQVEsQ0FBQytCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ3hFLENBQUMsRUFBQ3lFLENBQUMsRUFBRztNQUM1QyxJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1FBQ0NwQixLQUFBLENBQUtELElBQUksQ0FBQ2UsU0FBUyxFQUFFO01BQ3RCO0lBQ0QsQ0FBQyxDQUFDO0lBRUZkLEtBQUEsQ0FBS2IsUUFBUSxDQUFDK0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsS0FBSyxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDeEUsQ0FBQyxFQUFDeUUsQ0FBQyxFQUFHO01BQzNDLElBQUdGLENBQUMsR0FBRyxDQUFDLEVBQ1I7UUFDQ3BCLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZSxTQUFTLEVBQUU7UUFFckIsSUFBR2QsS0FBQSxDQUFLRCxJQUFJLENBQUNlLFNBQVMsR0FBRyxDQUFDLEVBQzFCO1VBQ0NkLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZSxTQUFTLEdBQUcsQ0FBQztRQUN4QjtNQUNEO0lBQ0QsQ0FBQyxDQUFDO0lBRUZkLEtBQUEsQ0FBS2IsUUFBUSxDQUFDK0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDeEUsQ0FBQyxFQUFDeUUsQ0FBQyxFQUFHO01BQzlDLElBQUdGLENBQUMsR0FBRyxDQUFDLEVBQ1I7UUFDQ3BCLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZ0IsY0FBYyxFQUFFO01BQzNCO0lBQ0QsQ0FBQyxDQUFDO0lBRUZmLEtBQUEsQ0FBS2IsUUFBUSxDQUFDK0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsVUFBVSxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDeEUsQ0FBQyxFQUFDeUUsQ0FBQyxFQUFHO01BQ2hELElBQUdGLENBQUMsR0FBRyxDQUFDLEVBQ1I7UUFDQ3BCLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZ0IsY0FBYyxFQUFFO1FBRTFCLElBQUdmLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZ0IsY0FBYyxHQUFHLENBQUMsRUFDL0I7VUFDQ2YsS0FBQSxDQUFLRCxJQUFJLENBQUNnQixjQUFjLEdBQUcsQ0FBQztRQUM3QjtNQUNEO0lBQ0QsQ0FBQyxDQUFDO0lBRUZmLEtBQUEsQ0FBS3lCLFdBQVcsR0FBRyxJQUFJQyx3QkFBVyxDQUFELENBQUM7SUFFbEMxQixLQUFBLENBQUsyQixLQUFLLEdBQUcsSUFBSUMsWUFBSyxDQUFDO01BQUNDLEdBQUcsRUFBRTtJQUFjLENBQUMsQ0FBQztJQUU3QzdCLEtBQUEsQ0FBSzhCLEdBQUcsR0FBRyxJQUFJQyxnQkFBTyxDQUFDO01BQ3RCTixXQUFXLEVBQUV6QixLQUFBLENBQUt5QixXQUFXO01BQzNCSSxHQUFHLEVBQUU7SUFDUixDQUFDLENBQUM7SUFFRjdCLEtBQUEsQ0FBS0QsSUFBSSxDQUFDaUMsU0FBUyxHQUFJLElBQUlDLG9CQUFTLENBQUM7TUFDcENSLFdBQVcsRUFBRXpCLEtBQUEsQ0FBS3lCLFdBQVc7TUFDM0JFLEtBQUssRUFBRTNCLEtBQUEsQ0FBSzJCLEtBQUs7TUFDakJHLEdBQUcsRUFBRTlCLEtBQUEsQ0FBSzhCO0lBQ2IsQ0FBQyxDQUFDO0lBQUMsT0FBQTlCLEtBQUE7RUFDSjtFQUFDbkIsU0FBQSxDQUFBZ0IsSUFBQSxFQUFBQyxTQUFBO0VBQUEsT0FBQTlMLFlBQUEsQ0FBQTZMLElBQUE7SUFBQTFJLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBbU0sVUFBVUEsQ0FBQSxFQUNWO01BQUEsSUFBQUMsTUFBQTtNQUNDLElBQU1aLFdBQVcsR0FBRyxJQUFJYSx3QkFBVyxDQUFDO1FBQ25DaEssT0FBTyxFQUFFLElBQUksQ0FBQ2lLLElBQUksQ0FBQ0MsTUFBTSxDQUFDbEssT0FBTztRQUMvQnVKLEtBQUssRUFBRSxJQUFJLENBQUNBLEtBQUs7UUFDakJHLEdBQUcsRUFBRSxJQUFJLENBQUNBO01BQ2IsQ0FBQyxDQUFDO01BRUYsSUFBSSxDQUFDUCxXQUFXLEdBQUdBLFdBQVc7TUFFOUIsSUFBTWdCLE1BQU0sR0FBRyxJQUFJQyxjQUFNLENBQUM7UUFDekJDLE1BQU0sRUFBRSxJQUFJQyxjQUFNLENBQUM7VUFDbEJqRCxDQUFDLEVBQUUsRUFBRTtVQUNMQyxDQUFDLEVBQUUsRUFBRTtVQUNMbUMsR0FBRyxFQUFFYyxTQUFTO1VBQ2RwQixXQUFXLEVBQUVBLFdBQVc7VUFDeEJFLFdBQVcsRUFBRSxJQUFJLENBQUNBLFdBQVc7VUFDN0I1SCxLQUFLLEVBQUUsRUFBRTtVQUNUQyxNQUFNLEVBQUU7UUFDVCxDQUFDLENBQUM7UUFDRjJHLFVBQVUsRUFBRSxJQUFJbUMsdUJBQVUsQ0FBQztVQUMxQnpELFFBQVEsRUFBRSxJQUFJLENBQUNBLFFBQVE7VUFDdkJGLGNBQWMsRUFBRSxJQUFJLENBQUNjLElBQUksQ0FBQ1U7UUFDM0IsQ0FBQyxDQUFDO1FBQ0ZvQyxNQUFNLEVBQUVDO01BQ1QsQ0FBQyxDQUFDO01BRUYsSUFBSSxDQUFDekMsUUFBUSxDQUFDMEMsR0FBRyxDQUFDUixNQUFNLENBQUM7TUFDekIsSUFBSSxDQUFDaEIsV0FBVyxDQUFDeUIsT0FBTyxDQUFDRCxHQUFHLENBQUNSLE1BQU0sQ0FBQ0UsTUFBTSxDQUFDO01BRTNDLElBQUksQ0FBQ2xCLFdBQVcsQ0FBQzBCLFNBQVMsR0FBR1YsTUFBTTtNQUVuQyxJQUFJLENBQUNwRCxRQUFRLENBQUMrQixJQUFJLENBQUNDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsVUFBQ0MsQ0FBQyxFQUFDQyxDQUFDLEVBQUN4RSxDQUFDLEVBQUN5RSxDQUFDLEVBQUc7UUFDekMsSUFBR0YsQ0FBQyxHQUFHLENBQUMsRUFDUjtVQUNDZSxNQUFJLENBQUNlLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDYjtNQUNELENBQUMsQ0FBQztNQUVGLElBQUksQ0FBQy9ELFFBQVEsQ0FBQytCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLEdBQUcsRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ3hFLENBQUMsRUFBQ3lFLENBQUMsRUFBRztRQUN6QyxJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1VBQ0NlLE1BQUksQ0FBQ2UsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNiO01BQ0QsQ0FBQyxDQUFDO01BRUYsSUFBSSxDQUFDL0QsUUFBUSxDQUFDK0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsR0FBRyxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDeEUsQ0FBQyxFQUFDeUUsQ0FBQyxFQUFHO1FBQ3pDLElBQUdGLENBQUMsR0FBRyxDQUFDLEVBQ1I7VUFDQ2UsTUFBSSxDQUFDZSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZDtNQUNELENBQUMsQ0FBQztNQUVGLElBQUksQ0FBQ25ELElBQUksQ0FBQ2lDLFNBQVMsQ0FBQ2pDLElBQUksQ0FBQ29CLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxVQUFDQyxDQUFDLEVBQUc7UUFDdkQsSUFBRyxDQUFDQSxDQUFDLElBQUllLE1BQUksQ0FBQ1osV0FBVyxDQUFDNEIsUUFBUSxDQUFDQyxPQUFPLElBQUksSUFBSSxFQUNsRDtVQUNDO1FBQ0Q7UUFFQWpCLE1BQUksQ0FBQ3BDLElBQUksQ0FBQ2lCLFVBQVUsR0FBRyxLQUFLO1FBRTVCLElBQUkxRCxDQUFDLEdBQUk2RSxNQUFJLENBQUNaLFdBQVcsQ0FBQzRCLFFBQVEsQ0FBQ0UsWUFBWTtRQUMvQyxJQUFJQyxFQUFFLEdBQUduQixNQUFJLENBQUNaLFdBQVcsQ0FBQzRCLFFBQVEsQ0FBQ0MsT0FBTztRQUUxQyxJQUFHRSxFQUFFLEdBQUdoRyxDQUFDLEVBQ1Q7VUFBQSxJQUFBbEosSUFBQSxHQUNXLENBQUNrSixDQUFDLEVBQUVnRyxFQUFFLENBQUM7VUFBaEJBLEVBQUUsR0FBQWxQLElBQUE7VUFBRWtKLENBQUMsR0FBQWxKLElBQUE7UUFDUDtRQUVBLE9BQU1rSixDQUFDLElBQUdnRyxFQUFFLEVBQUVoRyxDQUFDLEVBQUUsRUFDakI7VUFDQyxJQUFJaUcsQ0FBQyxHQUFJcEIsTUFBSSxDQUFDWixXQUFXLENBQUM0QixRQUFRLENBQUNLLFlBQVk7VUFDL0MsSUFBSUMsRUFBRSxHQUFHdEIsTUFBSSxDQUFDWixXQUFXLENBQUM0QixRQUFRLENBQUNPLE9BQU87VUFDMUMsSUFBR0QsRUFBRSxHQUFHRixDQUFDLEVBQ1Q7WUFBQSxJQUFBNUosS0FBQSxHQUNXLENBQUM0SixDQUFDLEVBQUVFLEVBQUUsQ0FBQztZQUFoQkEsRUFBRSxHQUFBOUosS0FBQTtZQUFFNEosQ0FBQyxHQUFBNUosS0FBQTtVQUNQO1VBQ0EsT0FBTTRKLENBQUMsSUFBSUUsRUFBRSxFQUFFRixDQUFDLEVBQUUsRUFDbEI7WUFDQ3BCLE1BQUksQ0FBQ0wsR0FBRyxDQUFDNkIsT0FBTyxDQUFDckcsQ0FBQyxFQUFFaUcsQ0FBQyxFQUFFbkMsQ0FBQyxDQUFDO1VBQzFCO1FBQ0Q7UUFFQWUsTUFBSSxDQUFDTCxHQUFHLENBQUM2QixPQUFPLENBQ2Z4QixNQUFJLENBQUNaLFdBQVcsQ0FBQzRCLFFBQVEsQ0FBQ0MsT0FBTyxFQUMvQmpCLE1BQUksQ0FBQ1osV0FBVyxDQUFDNEIsUUFBUSxDQUFDTyxPQUFPLEVBQ2pDdEMsQ0FDSCxDQUFDO1FBRURlLE1BQUksQ0FBQ1osV0FBVyxDQUFDcUMsTUFBTSxDQUFDLENBQUM7UUFDekJ6QixNQUFJLENBQUNaLFdBQVcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7TUFDNUIsQ0FBQyxDQUFDO01BRUYsSUFBSSxDQUFDekIsSUFBSSxDQUFDaUIsVUFBVSxHQUFHLEtBQUs7TUFFNUJmLE1BQU0sQ0FBQzRELGdCQUFnQixDQUFDLFFBQVEsRUFBRTtRQUFBLE9BQU0xQixNQUFJLENBQUN5QixNQUFNLENBQUMsQ0FBQztNQUFBLEVBQUM7TUFFdEQsSUFBSUUsS0FBSyxHQUFHLENBQUM7TUFDYixJQUFJQyxLQUFLLEdBQUcsQ0FBQztNQUViLElBQUlDLFFBQVEsR0FBRyxFQUFFO01BQ2pCLElBQUlDLFFBQVEsR0FBRyxFQUFFO01BRWpCLElBQUlDLFVBQVUsR0FBRyxDQUFDO01BRWxCLElBQU1DLFFBQVEsR0FBRyxTQUFYQSxRQUFRQSxDQUFJQyxHQUFHLEVBQUs7UUFDekJBLEdBQUcsR0FBR0EsR0FBRyxHQUFHLElBQUk7UUFFaEIsSUFBTUMsS0FBSyxHQUFHRCxHQUFHLEdBQUdMLEtBQUs7UUFFekIsSUFBRzVCLE1BQUksQ0FBQ3BDLElBQUksQ0FBQ2dCLGNBQWMsSUFBSSxDQUFDLEVBQ2hDO1VBQ0NrRCxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7VUFDZDtRQUNEO1FBRUEsSUFBR0ksS0FBSyxHQUFHLENBQUMsSUFBRWxDLE1BQUksQ0FBQ3BDLElBQUksQ0FBQ2dCLGNBQWMsR0FBRSxFQUFFLElBQUlvQixNQUFJLENBQUNwQyxJQUFJLENBQUNnQixjQUFjLEdBQUMsRUFBRSxDQUFFLENBQUMsRUFDNUU7VUFDQztRQUNEO1FBRUFnRCxLQUFLLEdBQUdLLEdBQUc7UUFFWGpDLE1BQUksQ0FBQ2hELFFBQVEsQ0FBQ21GLE1BQU0sQ0FBQyxDQUFDO1FBRXRCcEgsTUFBTSxDQUFDcUgsTUFBTSxDQUFDcEMsTUFBSSxDQUFDOUIsUUFBUSxDQUFDbUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDMUMsR0FBRyxDQUFDLFVBQUN6TCxDQUFDLEVBQUc7VUFDN0NBLENBQUMsQ0FBQzhOLFFBQVEsQ0FBQyxDQUFDO1FBQ2IsQ0FBQyxDQUFDOztRQUVGO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7O1FBRUFoQyxNQUFJLENBQUNwQyxJQUFJLENBQUMwRSxJQUFJLEdBQUksQ0FBQyxHQUFHSixLQUFNO1FBRTVCSixRQUFRLENBQUNTLElBQUksQ0FBQ3ZDLE1BQUksQ0FBQ3BDLElBQUksQ0FBQzBFLElBQUksQ0FBQztRQUU3QixPQUFNUixRQUFRLENBQUN2TSxNQUFNLEdBQUd3TSxVQUFVLEVBQ2xDO1VBQ0NELFFBQVEsQ0FBQ1UsS0FBSyxDQUFDLENBQUM7UUFDakI7O1FBRUE7TUFDRCxDQUFDO01BRUQsSUFBTUwsT0FBTSxHQUFHLFNBQVRBLE1BQU1BLENBQUdGLEdBQUcsRUFBSTtRQUVyQixJQUFHL0wsUUFBUSxDQUFDdU0sTUFBTSxFQUNsQjtVQUNDM0UsTUFBTSxDQUFDNEUscUJBQXFCLENBQUNQLE9BQU0sQ0FBQztVQUNwQztRQUNEO1FBRUFILFFBQVEsQ0FBQ1csV0FBVyxDQUFDVixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNCbkUsTUFBTSxDQUFDNEUscUJBQXFCLENBQUNQLE9BQU0sQ0FBQztRQUNwQ25DLE1BQUksQ0FBQ1osV0FBVyxDQUFDd0QsSUFBSSxDQUFDLENBQUM7UUFFdkIsSUFBTVYsS0FBSyxHQUFHRCxHQUFHLEdBQUdOLEtBQUs7UUFDekJBLEtBQUssR0FBR00sR0FBRztRQUVYakMsTUFBSSxDQUFDcEMsSUFBSSxDQUFDVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcyRCxLQUFLLEVBQUVXLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFekM3QyxNQUFJLENBQUNwQyxJQUFJLENBQUNhLElBQUksR0FBRy9DLE1BQU0sQ0FBQ2lGLGNBQU0sQ0FBQ3JELENBQUMsQ0FBQyxDQUFDdUYsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM1QzdDLE1BQUksQ0FBQ3BDLElBQUksQ0FBQ2MsSUFBSSxHQUFHaEQsTUFBTSxDQUFDaUYsY0FBTSxDQUFDcEQsQ0FBQyxDQUFDLENBQUNzRixPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRTVDLElBQUc3QyxNQUFJLENBQUNaLFdBQVcsQ0FBQzBCLFNBQVMsRUFDN0I7VUFDQ2QsTUFBSSxDQUFDcEMsSUFBSSxDQUFDa0YsSUFBSSxHQUFHcEgsTUFBTSxDQUFDc0UsTUFBSSxDQUFDWixXQUFXLENBQUMwQixTQUFTLENBQUNSLE1BQU0sQ0FBQ2hELENBQUMsQ0FBQyxDQUFDdUYsT0FBTyxDQUFDLENBQUMsQ0FBQztVQUN2RTdDLE1BQUksQ0FBQ3BDLElBQUksQ0FBQ21GLElBQUksR0FBR3JILE1BQU0sQ0FBQ3NFLE1BQUksQ0FBQ1osV0FBVyxDQUFDMEIsU0FBUyxDQUFDUixNQUFNLENBQUMvQyxDQUFDLENBQUMsQ0FBQ3NGLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDeEU7TUFFRCxDQUFDO01BRUQsSUFBSSxDQUFDekQsV0FBVyxDQUFDNEQsSUFBSSxDQUFDMU0sU0FBUyxHQUFHSixRQUFRLENBQUMrTSxJQUFJLENBQUNDLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQztNQUN2RSxJQUFJLENBQUN6QixNQUFNLENBQUMsQ0FBQztNQUViVSxPQUFNLENBQUNRLFdBQVcsQ0FBQ1YsR0FBRyxDQUFDLENBQUMsQ0FBQzs7TUFFekI7TUFDQTs7TUFFQWtCLFdBQVcsQ0FBQyxZQUFJO1FBQ2ZqTixRQUFRLENBQUNuRSxLQUFLLE1BQUFpQyxNQUFBLENBQU1yQyxjQUFNLENBQUNJLEtBQUssT0FBQWlDLE1BQUEsQ0FBSWdNLE1BQUksQ0FBQ3BDLElBQUksQ0FBQ1csR0FBRyxTQUFNO01BQ3hELENBQUMsRUFBRSxHQUFHLEdBQUMsQ0FBQyxDQUFDO01BRVQ0RSxXQUFXLENBQUMsWUFBSTtRQUNmLElBQU0zRSxHQUFHLEdBQUdzRCxRQUFRLENBQUNzQixNQUFNLENBQUMsVUFBQzlJLENBQUMsRUFBQytJLENBQUM7VUFBQSxPQUFHL0ksQ0FBQyxHQUFDK0ksQ0FBQztRQUFBLEdBQUUsQ0FBQyxDQUFDLEdBQUd2QixRQUFRLENBQUN2TSxNQUFNO1FBQzVEeUssTUFBSSxDQUFDcEMsSUFBSSxDQUFDWSxHQUFHLEdBQUdBLEdBQUcsQ0FBQ3FFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQ1MsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7TUFDaEQsQ0FBQyxFQUFFLEdBQUcsR0FBQyxDQUFDLENBQUM7SUFDVjtFQUFDO0lBQUF0TyxHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQTZOLE1BQU1BLENBQUNuRSxDQUFDLEVBQUVDLENBQUMsRUFDWDtNQUNDLElBQUksQ0FBQ0ssSUFBSSxDQUFDbEcsS0FBSyxHQUFJLElBQUksQ0FBQ3dJLElBQUksQ0FBQ0MsTUFBTSxDQUFDbEssT0FBTyxDQUFDeUIsS0FBSyxHQUFLNEYsQ0FBQyxJQUFJcEgsUUFBUSxDQUFDK00sSUFBSSxDQUFDTSxXQUFXO01BQ3BGLElBQUksQ0FBQzNGLElBQUksQ0FBQ2pHLE1BQU0sR0FBRyxJQUFJLENBQUN1SSxJQUFJLENBQUNDLE1BQU0sQ0FBQ2xLLE9BQU8sQ0FBQzBCLE1BQU0sR0FBSTRGLENBQUMsSUFBSXJILFFBQVEsQ0FBQytNLElBQUksQ0FBQ0MsWUFBWTtNQUVyRixJQUFJLENBQUN0RixJQUFJLENBQUM0RixNQUFNLEdBQUdDLElBQUksQ0FBQ0MsS0FBSyxDQUM1QixDQUFDcEcsQ0FBQyxJQUFJcEgsUUFBUSxDQUFDK00sSUFBSSxDQUFDTSxXQUFXLElBQUssSUFBSSxDQUFDbkUsV0FBVyxDQUFDNEQsSUFBSSxDQUFDMU0sU0FDM0QsQ0FBQztNQUVELElBQUksQ0FBQ3NILElBQUksQ0FBQytGLE9BQU8sR0FBR0YsSUFBSSxDQUFDQyxLQUFLLENBQzdCLENBQUNuRyxDQUFDLElBQUlySCxRQUFRLENBQUMrTSxJQUFJLENBQUNDLFlBQVksSUFBSSxJQUFJLENBQUM5RCxXQUFXLENBQUM0RCxJQUFJLENBQUMxTSxTQUMzRCxDQUFDO01BRUQsSUFBTXNOLFFBQVEsR0FBRyxJQUFJLENBQUN4RSxXQUFXLENBQUM0RCxJQUFJLENBQUMzTSxXQUFXO01BQ2xELElBQUksQ0FBQytJLFdBQVcsQ0FBQzRELElBQUksQ0FBQzNNLFdBQVcsR0FBR0gsUUFBUSxDQUFDK00sSUFBSSxDQUFDQyxZQUFZLEdBQUcsSUFBSTtNQUVyRSxJQUFJLENBQUM5RCxXQUFXLENBQUM0RCxJQUFJLENBQUMxTSxTQUFTLElBQUksSUFBSSxDQUFDOEksV0FBVyxDQUFDNEQsSUFBSSxDQUFDM00sV0FBVyxHQUFHdU4sUUFBUTtNQUUvRSxJQUFJLENBQUN4RSxXQUFXLENBQUNxQyxNQUFNLENBQUMsQ0FBQztJQUMxQjtFQUFDO0lBQUF6TSxHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQWlRLE1BQU1BLENBQUNDLEtBQUssRUFDWjtNQUNDLElBQUk1QixLQUFLLEdBQUc0QixLQUFLLENBQUNDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQ2hDRCxLQUFLLENBQUNDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQ3ZCO01BRUQsSUFBSSxDQUFDaEQsSUFBSSxDQUFDbUIsS0FBSyxDQUFDO0lBQ2pCO0VBQUM7SUFBQWxOLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBbU4sSUFBSUEsQ0FBQ21CLEtBQUssRUFDVjtNQUNDLElBQU04QixHQUFHLEdBQUcsSUFBSSxDQUFDNUUsV0FBVyxDQUFDNEQsSUFBSSxDQUFDM00sV0FBVyxHQUFHLEVBQUU7TUFDbEQsSUFBTTROLEdBQUcsR0FBRyxJQUFJLENBQUM3RSxXQUFXLENBQUM0RCxJQUFJLENBQUMzTSxXQUFXLEdBQUcsR0FBRztNQUNuRCxJQUFNNk4sSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM5RSxXQUFXLENBQUM0RCxJQUFJLENBQUMxTSxTQUFTO01BRW5ELElBQUlBLFNBQVMsR0FBRyxDQUFDNEwsS0FBSyxHQUFHZ0MsSUFBSSxHQUFHLElBQUksQ0FBQzlFLFdBQVcsQ0FBQzRELElBQUksQ0FBQzFNLFNBQVMsRUFBRXVNLE9BQU8sQ0FBQyxDQUFDLENBQUM7TUFFM0UsSUFBR3ZNLFNBQVMsR0FBRzJOLEdBQUcsRUFDbEI7UUFDQzNOLFNBQVMsR0FBRzJOLEdBQUc7TUFDaEIsQ0FBQyxNQUNJLElBQUczTixTQUFTLEdBQUcwTixHQUFHLEVBQ3ZCO1FBQ0MxTixTQUFTLEdBQUcwTixHQUFHO01BQ2hCO01BRUEsSUFBR1AsSUFBSSxDQUFDVSxHQUFHLENBQUM3TixTQUFTLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUNqQztRQUNDQSxTQUFTLEdBQUcsQ0FBQztNQUNkO01BRUEsSUFBRyxJQUFJLENBQUM4SSxXQUFXLENBQUM0RCxJQUFJLENBQUMxTSxTQUFTLEtBQUtBLFNBQVMsRUFDaEQ7UUFDQyxJQUFJLENBQUM4SSxXQUFXLENBQUM0RCxJQUFJLENBQUMxTSxTQUFTLEdBQUdBLFNBQVM7UUFDM0MsSUFBSSxDQUFDbUwsTUFBTSxDQUFDLENBQUM7TUFDZDtJQUNEO0VBQUM7QUFBQSxFQXBWd0IyQyxVQUFROzs7Q0N4RmxDO0FBQUE7QUFBQTtBQUFBOzs7O0FDQUEsSUFBQUMsT0FBQSxHQUFBcE4sT0FBQTtBQUNBLElBQUFvQyxLQUFBLEdBQUFwQyxPQUFBO0FBRUEsSUFBR3FOLEtBQUssS0FBSzlELFNBQVMsRUFDdEI7RUFDQ3RLLFFBQVEsQ0FBQ3dMLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLFlBQU07SUFDbkQsSUFBTTZDLElBQUksR0FBRyxJQUFJN0csVUFBSSxDQUFDLENBQUM7SUFFdkI4RyxjQUFNLENBQUNDLE1BQU0sQ0FBQ0YsSUFBSSxDQUFDO0lBRW5CQSxJQUFJLENBQUNHLE1BQU0sQ0FBQ3hPLFFBQVEsQ0FBQytNLElBQUksQ0FBQztFQUMzQixDQUFDLENBQUM7QUFDSCxDQUFDLE1BRUQ7RUFDQztBQUFBOzs7Ozs7Ozs7OztBQ2ZELElBQUEwQixZQUFBLEdBQUExTixPQUFBO0FBQTBDLFNBQUFuRixnQkFBQXdJLENBQUEsRUFBQTdHLENBQUEsVUFBQTZHLENBQUEsWUFBQTdHLENBQUEsYUFBQThHLFNBQUE7QUFBQSxTQUFBQyxrQkFBQXRHLENBQUEsRUFBQXVHLENBQUEsYUFBQUMsQ0FBQSxNQUFBQSxDQUFBLEdBQUFELENBQUEsQ0FBQWxGLE1BQUEsRUFBQW1GLENBQUEsVUFBQUMsQ0FBQSxHQUFBRixDQUFBLENBQUFDLENBQUEsR0FBQUMsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsQ0FBQUMsVUFBQSxRQUFBRCxDQUFBLENBQUFFLFlBQUEsa0JBQUFGLENBQUEsS0FBQUEsQ0FBQSxDQUFBRyxRQUFBLFFBQUFDLE1BQUEsQ0FBQUMsY0FBQSxDQUFBOUcsQ0FBQSxFQUFBK0csY0FBQSxDQUFBTixDQUFBLENBQUEzRixHQUFBLEdBQUEyRixDQUFBO0FBQUEsU0FBQTlJLGFBQUFxQyxDQUFBLEVBQUF1RyxDQUFBLEVBQUFDLENBQUEsV0FBQUQsQ0FBQSxJQUFBRCxpQkFBQSxDQUFBdEcsQ0FBQSxDQUFBZ0gsU0FBQSxFQUFBVCxDQUFBLEdBQUFDLENBQUEsSUFBQUYsaUJBQUEsQ0FBQXRHLENBQUEsRUFBQXdHLENBQUEsR0FBQUssTUFBQSxDQUFBQyxjQUFBLENBQUE5RyxDQUFBLGlCQUFBNEcsUUFBQSxTQUFBNUcsQ0FBQTtBQUFBLFNBQUErRyxlQUFBUCxDQUFBLFFBQUFTLENBQUEsR0FBQUMsWUFBQSxDQUFBVixDQUFBLGdDQUFBVyxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVYsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBWSxPQUFBLENBQUFYLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUF4RyxDQUFBLEdBQUF3RyxDQUFBLENBQUFZLE1BQUEsQ0FBQUMsV0FBQSxrQkFBQXJILENBQUEsUUFBQWlILENBQUEsR0FBQWpILENBQUEsQ0FBQXNILElBQUEsQ0FBQWQsQ0FBQSxFQUFBRCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsVUFBQUEsQ0FBQSxZQUFBWixTQUFBLHlFQUFBRSxDQUFBLEdBQUFnQixNQUFBLEdBQUFDLE1BQUEsRUFBQWhCLENBQUE7QUFBQSxTQUFBaUIsV0FBQWpCLENBQUEsRUFBQUMsQ0FBQSxFQUFBekcsQ0FBQSxXQUFBeUcsQ0FBQSxHQUFBaUIsZUFBQSxDQUFBakIsQ0FBQSxHQUFBa0IsMEJBQUEsQ0FBQW5CLENBQUEsRUFBQW9CLHlCQUFBLEtBQUFDLE9BQUEsQ0FBQUMsU0FBQSxDQUFBckIsQ0FBQSxFQUFBekcsQ0FBQSxRQUFBMEgsZUFBQSxDQUFBbEIsQ0FBQSxFQUFBdUIsV0FBQSxJQUFBdEIsQ0FBQSxDQUFBaEYsS0FBQSxDQUFBK0UsQ0FBQSxFQUFBeEcsQ0FBQTtBQUFBLFNBQUEySCwyQkFBQW5CLENBQUEsRUFBQXhHLENBQUEsUUFBQUEsQ0FBQSxpQkFBQW1ILE9BQUEsQ0FBQW5ILENBQUEsMEJBQUFBLENBQUEsVUFBQUEsQ0FBQSxpQkFBQUEsQ0FBQSxZQUFBcUcsU0FBQSxxRUFBQTJCLHNCQUFBLENBQUF4QixDQUFBO0FBQUEsU0FBQXdCLHVCQUFBaEksQ0FBQSxtQkFBQUEsQ0FBQSxZQUFBaUksY0FBQSxzRUFBQWpJLENBQUE7QUFBQSxTQUFBNEgsMEJBQUEsY0FBQXBCLENBQUEsSUFBQTBCLE9BQUEsQ0FBQWxCLFNBQUEsQ0FBQW1CLE9BQUEsQ0FBQWIsSUFBQSxDQUFBTyxPQUFBLENBQUFDLFNBQUEsQ0FBQUksT0FBQSxpQ0FBQTFCLENBQUEsYUFBQW9CLHlCQUFBLFlBQUFBLDBCQUFBLGFBQUFwQixDQUFBO0FBQUEsU0FBQWtCLGdCQUFBbEIsQ0FBQSxXQUFBa0IsZUFBQSxHQUFBYixNQUFBLENBQUF1QixjQUFBLEdBQUF2QixNQUFBLENBQUF3QixjQUFBLENBQUFDLElBQUEsZUFBQTlCLENBQUEsV0FBQUEsQ0FBQSxDQUFBK0IsU0FBQSxJQUFBMUIsTUFBQSxDQUFBd0IsY0FBQSxDQUFBN0IsQ0FBQSxNQUFBa0IsZUFBQSxDQUFBbEIsQ0FBQTtBQUFBLFNBQUFnQyxVQUFBaEMsQ0FBQSxFQUFBeEcsQ0FBQSw2QkFBQUEsQ0FBQSxhQUFBQSxDQUFBLFlBQUFxRyxTQUFBLHdEQUFBRyxDQUFBLENBQUFRLFNBQUEsR0FBQUgsTUFBQSxDQUFBNEIsTUFBQSxDQUFBekksQ0FBQSxJQUFBQSxDQUFBLENBQUFnSCxTQUFBLElBQUFlLFdBQUEsSUFBQXJJLEtBQUEsRUFBQThHLENBQUEsRUFBQUksUUFBQSxNQUFBRCxZQUFBLFdBQUFFLE1BQUEsQ0FBQUMsY0FBQSxDQUFBTixDQUFBLGlCQUFBSSxRQUFBLFNBQUE1RyxDQUFBLElBQUEwSSxlQUFBLENBQUFsQyxDQUFBLEVBQUF4RyxDQUFBO0FBQUEsU0FBQTBJLGdCQUFBbEMsQ0FBQSxFQUFBeEcsQ0FBQSxXQUFBMEksZUFBQSxHQUFBN0IsTUFBQSxDQUFBdUIsY0FBQSxHQUFBdkIsTUFBQSxDQUFBdUIsY0FBQSxDQUFBRSxJQUFBLGVBQUE5QixDQUFBLEVBQUF4RyxDQUFBLFdBQUF3RyxDQUFBLENBQUErQixTQUFBLEdBQUF2SSxDQUFBLEVBQUF3RyxDQUFBLEtBQUFrQyxlQUFBLENBQUFsQyxDQUFBLEVBQUF4RyxDQUFBO0FBQUEsSUFFN0IwUSxTQUFTLEdBQUFoVCxPQUFBLENBQUFnVCxTQUFBLDBCQUFBQyxXQUFBO0VBQUEsU0FBQUQsVUFBQTtJQUFBOVMsZUFBQSxPQUFBOFMsU0FBQTtJQUFBLE9BQUFqSixVQUFBLE9BQUFpSixTQUFBLEVBQUF0UCxTQUFBO0VBQUE7RUFBQW9ILFNBQUEsQ0FBQWtJLFNBQUEsRUFBQUMsV0FBQTtFQUFBLE9BQUFoVCxZQUFBLENBQUErUyxTQUFBO0lBQUE1UCxHQUFBO0lBQUFwQixLQUFBLEVBRXJCLFNBQUFrUixNQUFNQSxDQUFDQyxVQUFVLEVBQ2pCO01BQ0MsT0FBTyxJQUFJLElBQUksQ0FBQzlJLFdBQVcsQ0FBQ2xCLE1BQU0sQ0FBQ2lLLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUVELFVBQVUsQ0FBQyxDQUFDO0lBQ2pFO0VBQUM7QUFBQSxFQUw2QkUsdUJBQVU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDRnpDLElBQUlDLE9BQU8sR0FBRyxDQUFDLENBQUM7QUFDaEIsSUFBSUMsT0FBTyxHQUFHLENBQUMsQ0FBQztBQUFDLElBRUpGLFVBQVUsR0FBQXJULE9BQUEsQ0FBQXFULFVBQUE7RUFFdEIsU0FBQUEsV0FBQSxFQUNBO0lBQUFuVCxlQUFBLE9BQUFtVCxVQUFBO0lBQ0MsSUFBSUYsVUFBVSxHQUFHLElBQUksQ0FBQzlJLFdBQVcsQ0FBQzhJLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLElBQUl2UyxPQUFPLEdBQU0sSUFBSSxDQUFDeUosV0FBVyxDQUFDekosT0FBTyxDQUFDLENBQUM7SUFFM0MsSUFBRyxDQUFDMFMsT0FBTyxDQUFDMVMsT0FBTyxDQUFDLEVBQ3BCO01BQ0MwUyxPQUFPLENBQUMxUyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEI7SUFFQSxJQUFHLENBQUMyUyxPQUFPLENBQUMzUyxPQUFPLENBQUMsRUFDcEI7TUFDQzJTLE9BQU8sQ0FBQzNTLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QjtJQUVBLEtBQUksSUFBSTRDLElBQUksSUFBSTJQLFVBQVUsRUFDMUI7TUFDQyxJQUFJSyxTQUFTLEdBQUdMLFVBQVUsQ0FBQzNQLElBQUksQ0FBQztNQUVoQyxJQUFHOFAsT0FBTyxDQUFDMVMsT0FBTyxDQUFDLENBQUM0QyxJQUFJLENBQUMsSUFBSSxDQUFDZ1EsU0FBUyxDQUFDbEssU0FBUyxFQUNqRDtRQUNDO01BQ0Q7TUFFQSxJQUFHLE9BQU8sQ0FBQ21LLElBQUksQ0FBQzVKLE1BQU0sQ0FBQ3JHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2hDO1FBQ0M4UCxPQUFPLENBQUMxUyxPQUFPLENBQUMsQ0FBQzRDLElBQUksQ0FBQyxHQUFHZ1EsU0FBUztNQUNuQztJQUVEO0lBRUEsS0FBSSxJQUFJaFEsS0FBSSxJQUFJMlAsVUFBVSxFQUMxQjtNQUNDLElBQUlPLFFBQVEsR0FBSTlFLFNBQVM7TUFDekIsSUFBSTRFLFVBQVMsR0FBR0YsT0FBTyxDQUFDMVMsT0FBTyxDQUFDLENBQUM0QyxLQUFJLENBQUMsSUFBSTJQLFVBQVUsQ0FBQzNQLEtBQUksQ0FBQztNQUUxRCxJQUFHLE9BQU8sQ0FBQ2lRLElBQUksQ0FBQzVKLE1BQU0sQ0FBQ3JHLEtBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2hDO1FBQ0MsSUFBR2dRLFVBQVMsQ0FBQ2xLLFNBQVMsRUFDdEI7VUFDQyxJQUFHLENBQUNpSyxPQUFPLENBQUMzUyxPQUFPLENBQUMsQ0FBQzRDLEtBQUksQ0FBQyxFQUMxQjtZQUNDK1AsT0FBTyxDQUFDM1MsT0FBTyxDQUFDLENBQUM0QyxLQUFJLENBQUMsR0FBRyxJQUFJZ1EsVUFBUyxDQUFELENBQUM7VUFDdkM7UUFDRCxDQUFDLE1BRUQ7VUFDQ0QsT0FBTyxDQUFDM1MsT0FBTyxDQUFDLENBQUM0QyxLQUFJLENBQUMsR0FBR2dRLFVBQVM7UUFDbkM7UUFFQUUsUUFBUSxHQUFHSCxPQUFPLENBQUMzUyxPQUFPLENBQUMsQ0FBQzRDLEtBQUksQ0FBQztNQUNsQyxDQUFDLE1BRUQ7UUFDQyxJQUFHZ1EsVUFBUyxDQUFDbEssU0FBUyxFQUN0QjtVQUNDb0ssUUFBUSxHQUFHLElBQUlGLFVBQVMsQ0FBRCxDQUFDO1FBQ3pCLENBQUMsTUFFRDtVQUNDRSxRQUFRLEdBQUdGLFVBQVM7UUFDckI7TUFDRDtNQUVBckssTUFBTSxDQUFDQyxjQUFjLENBQUMsSUFBSSxFQUFFNUYsS0FBSSxFQUFFO1FBQ2pDd0YsVUFBVSxFQUFFLEtBQUs7UUFDakJFLFFBQVEsRUFBSSxLQUFLO1FBQ2pCbEgsS0FBSyxFQUFPMFI7TUFDYixDQUFDLENBQUM7SUFDSDtFQUVEO0VBQUMsT0FBQXpULFlBQUEsQ0FBQW9ULFVBQUE7SUFBQWpRLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFPbVIsVUFBVUEsQ0FBQSxFQUNqQjtNQUNDLE9BQU8sQ0FBQyxDQUFDO0lBQ1Y7RUFBQztJQUFBL1AsR0FBQTtJQUFBcEIsS0FBQSxFQUVELFNBQU9wQixPQUFPQSxDQUFBLEVBQ2Q7TUFDQyxPQUFPLEdBQUc7SUFDWDtFQUFDO0lBQUF3QyxHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBT2tSLE1BQU1BLENBQUNDLFdBQVUsRUFDeEI7TUFBQSxJQUQwQnZTLFFBQU8sR0FBQThDLFNBQUEsQ0FBQUMsTUFBQSxRQUFBRCxTQUFBLFFBQUFrTCxTQUFBLEdBQUFsTCxTQUFBLE1BQUcsR0FBRztNQUV0QyxJQUFHLEVBQUUsSUFBSSxDQUFDNEYsU0FBUyxZQUFZK0osVUFBVSxJQUFJLElBQUksS0FBS0EsVUFBVSxDQUFDLEVBQ2pFO1FBQ0MsTUFBTSxJQUFJTSxLQUFLLDhMQVdqQixDQUFDO01BQ0E7TUFFQSxJQUFJQyxrQkFBa0IsR0FBRyxJQUFJLENBQUNULFVBQVUsQ0FBQyxDQUFDO01BRTFDLDhCQUFBbEgsS0FBQTtRQUFBLFNBQUE0SCxPQUFBO1VBQUEzVCxlQUFBLE9BQUEyVCxNQUFBO1VBQUEsT0FBQTlKLFVBQUEsT0FBQThKLE1BQUEsRUFBQW5RLFNBQUE7UUFBQTtRQUFBb0gsU0FBQSxDQUFBK0ksTUFBQSxFQUFBNUgsS0FBQTtRQUFBLE9BQUFoTSxZQUFBLENBQUE0VCxNQUFBO1VBQUF6USxHQUFBO1VBQUFwQixLQUFBLEVBQ0MsU0FBT21SLFVBQVVBLENBQUEsRUFDakI7WUFDQyxPQUFPaEssTUFBTSxDQUFDaUssTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFUSxrQkFBa0IsRUFBRVQsV0FBVSxDQUFDO1VBQ3pEO1FBQUM7VUFBQS9QLEdBQUE7VUFBQXBCLEtBQUEsRUFDRCxTQUFPcEIsT0FBT0EsQ0FBQSxFQUNkO1lBQ0MsT0FBT0EsUUFBTztVQUNmO1FBQUM7TUFBQSxFQVJtQixJQUFJO0lBVTFCO0VBQUM7QUFBQTs7Ozs7Ozs7Ozs7Ozs7OztJQ3RISWtULE1BQU0sR0FBQTlULE9BQUEsQ0FBQThULE1BQUEsZ0JBQUE3VCxZQUFBLENBRVgsU0FBQTZULE9BQUEsRUFDQTtFQUFBNVQsZUFBQSxPQUFBNFQsTUFBQTtFQUNDLElBQUksQ0FBQ3RRLElBQUksR0FBRyxNQUFNLEdBQUdxTyxJQUFJLENBQUNrQyxNQUFNLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBR0YsSUFBSUMsTUFBTSxHQUFBaFUsT0FBQSxDQUFBZ1UsTUFBQSxHQUFHLElBQUlGLE1BQU0sQ0FBRCxDQUFDOzs7Ozs7Ozs7O0FDUnZCLElBQUF0TCxVQUFBLEdBQUFuRCxPQUFBO0FBQXdDLFNBQUE0TyxtQkFBQXBMLENBQUEsV0FBQXFMLGtCQUFBLENBQUFyTCxDQUFBLEtBQUFzTCxnQkFBQSxDQUFBdEwsQ0FBQSxLQUFBdUwsMkJBQUEsQ0FBQXZMLENBQUEsS0FBQXdMLGtCQUFBO0FBQUEsU0FBQUEsbUJBQUEsY0FBQTFMLFNBQUE7QUFBQSxTQUFBd0wsaUJBQUF0TCxDQUFBLDhCQUFBYSxNQUFBLFlBQUFiLENBQUEsQ0FBQWEsTUFBQSxDQUFBNEssUUFBQSxhQUFBekwsQ0FBQSx1QkFBQWhGLEtBQUEsQ0FBQTBRLElBQUEsQ0FBQTFMLENBQUE7QUFBQSxTQUFBcUwsbUJBQUFyTCxDQUFBLFFBQUFoRixLQUFBLENBQUEyUSxPQUFBLENBQUEzTCxDQUFBLFVBQUE0TCxpQkFBQSxDQUFBNUwsQ0FBQTtBQUFBLFNBQUFZLFFBQUFWLENBQUEsc0NBQUFVLE9BQUEsd0JBQUFDLE1BQUEsdUJBQUFBLE1BQUEsQ0FBQTRLLFFBQUEsYUFBQXZMLENBQUEsa0JBQUFBLENBQUEsZ0JBQUFBLENBQUEsV0FBQUEsQ0FBQSx5QkFBQVcsTUFBQSxJQUFBWCxDQUFBLENBQUFzQixXQUFBLEtBQUFYLE1BQUEsSUFBQVgsQ0FBQSxLQUFBVyxNQUFBLENBQUFKLFNBQUEscUJBQUFQLENBQUEsS0FBQVUsT0FBQSxDQUFBVixDQUFBO0FBQUEsU0FBQXJILDJCQUFBbUgsQ0FBQSxFQUFBdkcsQ0FBQSxRQUFBd0csQ0FBQSx5QkFBQVksTUFBQSxJQUFBYixDQUFBLENBQUFhLE1BQUEsQ0FBQTRLLFFBQUEsS0FBQXpMLENBQUEscUJBQUFDLENBQUEsUUFBQWpGLEtBQUEsQ0FBQTJRLE9BQUEsQ0FBQTNMLENBQUEsTUFBQUMsQ0FBQSxHQUFBc0wsMkJBQUEsQ0FBQXZMLENBQUEsTUFBQXZHLENBQUEsSUFBQXVHLENBQUEsdUJBQUFBLENBQUEsQ0FBQWxGLE1BQUEsSUFBQW1GLENBQUEsS0FBQUQsQ0FBQSxHQUFBQyxDQUFBLE9BQUE0TCxFQUFBLE1BQUFDLENBQUEsWUFBQUEsRUFBQSxlQUFBL1MsQ0FBQSxFQUFBK1MsQ0FBQSxFQUFBOVMsQ0FBQSxXQUFBQSxFQUFBLFdBQUE2UyxFQUFBLElBQUE3TCxDQUFBLENBQUFsRixNQUFBLEtBQUE3QixJQUFBLFdBQUFBLElBQUEsTUFBQUUsS0FBQSxFQUFBNkcsQ0FBQSxDQUFBNkwsRUFBQSxVQUFBcFMsQ0FBQSxXQUFBQSxFQUFBdUcsQ0FBQSxVQUFBQSxDQUFBLEtBQUF0RyxDQUFBLEVBQUFvUyxDQUFBLGdCQUFBaE0sU0FBQSxpSkFBQUksQ0FBQSxFQUFBTCxDQUFBLE9BQUFrTSxDQUFBLGdCQUFBaFQsQ0FBQSxXQUFBQSxFQUFBLElBQUFrSCxDQUFBLEdBQUFBLENBQUEsQ0FBQWMsSUFBQSxDQUFBZixDQUFBLE1BQUFoSCxDQUFBLFdBQUFBLEVBQUEsUUFBQWdILENBQUEsR0FBQUMsQ0FBQSxDQUFBK0wsSUFBQSxXQUFBbk0sQ0FBQSxHQUFBRyxDQUFBLENBQUEvRyxJQUFBLEVBQUErRyxDQUFBLEtBQUF2RyxDQUFBLFdBQUFBLEVBQUF1RyxDQUFBLElBQUErTCxDQUFBLE9BQUE3TCxDQUFBLEdBQUFGLENBQUEsS0FBQXRHLENBQUEsV0FBQUEsRUFBQSxVQUFBbUcsQ0FBQSxZQUFBSSxDQUFBLGNBQUFBLENBQUEsOEJBQUE4TCxDQUFBLFFBQUE3TCxDQUFBO0FBQUEsU0FBQXFMLDRCQUFBdkwsQ0FBQSxFQUFBSCxDQUFBLFFBQUFHLENBQUEsMkJBQUFBLENBQUEsU0FBQTRMLGlCQUFBLENBQUE1TCxDQUFBLEVBQUFILENBQUEsT0FBQUksQ0FBQSxNQUFBZ00sUUFBQSxDQUFBbEwsSUFBQSxDQUFBZixDQUFBLEVBQUFrTSxLQUFBLDZCQUFBak0sQ0FBQSxJQUFBRCxDQUFBLENBQUF3QixXQUFBLEtBQUF2QixDQUFBLEdBQUFELENBQUEsQ0FBQXdCLFdBQUEsQ0FBQTdHLElBQUEsYUFBQXNGLENBQUEsY0FBQUEsQ0FBQSxHQUFBakYsS0FBQSxDQUFBMFEsSUFBQSxDQUFBMUwsQ0FBQSxvQkFBQUMsQ0FBQSwrQ0FBQTJLLElBQUEsQ0FBQTNLLENBQUEsSUFBQTJMLGlCQUFBLENBQUE1TCxDQUFBLEVBQUFILENBQUE7QUFBQSxTQUFBK0wsa0JBQUE1TCxDQUFBLEVBQUFILENBQUEsYUFBQUEsQ0FBQSxJQUFBQSxDQUFBLEdBQUFHLENBQUEsQ0FBQWxGLE1BQUEsTUFBQStFLENBQUEsR0FBQUcsQ0FBQSxDQUFBbEYsTUFBQSxZQUFBckIsQ0FBQSxNQUFBVCxDQUFBLEdBQUFnQyxLQUFBLENBQUE2RSxDQUFBLEdBQUFwRyxDQUFBLEdBQUFvRyxDQUFBLEVBQUFwRyxDQUFBLElBQUFULENBQUEsQ0FBQVMsQ0FBQSxJQUFBdUcsQ0FBQSxDQUFBdkcsQ0FBQSxVQUFBVCxDQUFBO0FBQUEsU0FBQTNCLGdCQUFBd0ksQ0FBQSxFQUFBN0csQ0FBQSxVQUFBNkcsQ0FBQSxZQUFBN0csQ0FBQSxhQUFBOEcsU0FBQTtBQUFBLFNBQUFDLGtCQUFBdEcsQ0FBQSxFQUFBdUcsQ0FBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUQsQ0FBQSxDQUFBbEYsTUFBQSxFQUFBbUYsQ0FBQSxVQUFBQyxDQUFBLEdBQUFGLENBQUEsQ0FBQUMsQ0FBQSxHQUFBQyxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUE5RyxDQUFBLEVBQUErRyxjQUFBLENBQUFOLENBQUEsQ0FBQTNGLEdBQUEsR0FBQTJGLENBQUE7QUFBQSxTQUFBOUksYUFBQXFDLENBQUEsRUFBQXVHLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFELGlCQUFBLENBQUF0RyxDQUFBLENBQUFnSCxTQUFBLEVBQUFULENBQUEsR0FBQUMsQ0FBQSxJQUFBRixpQkFBQSxDQUFBdEcsQ0FBQSxFQUFBd0csQ0FBQSxHQUFBSyxNQUFBLENBQUFDLGNBQUEsQ0FBQTlHLENBQUEsaUJBQUE0RyxRQUFBLFNBQUE1RyxDQUFBO0FBQUEsU0FBQStHLGVBQUFQLENBQUEsUUFBQVMsQ0FBQSxHQUFBQyxZQUFBLENBQUFWLENBQUEsZ0NBQUFXLE9BQUEsQ0FBQUYsQ0FBQSxJQUFBQSxDQUFBLEdBQUFBLENBQUE7QUFBQSxTQUFBQyxhQUFBVixDQUFBLEVBQUFELENBQUEsb0JBQUFZLE9BQUEsQ0FBQVgsQ0FBQSxNQUFBQSxDQUFBLFNBQUFBLENBQUEsTUFBQXhHLENBQUEsR0FBQXdHLENBQUEsQ0FBQVksTUFBQSxDQUFBQyxXQUFBLGtCQUFBckgsQ0FBQSxRQUFBaUgsQ0FBQSxHQUFBakgsQ0FBQSxDQUFBc0gsSUFBQSxDQUFBZCxDQUFBLEVBQUFELENBQUEsZ0NBQUFZLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFaLFNBQUEseUVBQUFFLENBQUEsR0FBQWdCLE1BQUEsR0FBQUMsTUFBQSxFQUFBaEIsQ0FBQTtBQUFBLElBRWxDa00sT0FBTztFQUVaLFNBQUFBLFFBQVlDLEtBQUssRUFBRUMsR0FBRyxFQUFFQyxJQUFJLEVBQzVCO0lBQUEsSUFEOEJDLEtBQUssR0FBQTFSLFNBQUEsQ0FBQUMsTUFBQSxRQUFBRCxTQUFBLFFBQUFrTCxTQUFBLEdBQUFsTCxTQUFBLE1BQUcsQ0FBQztJQUFBeEQsZUFBQSxPQUFBOFUsT0FBQTtJQUV0QyxJQUFJLENBQUNDLEtBQUssR0FBR0EsS0FBSztJQUNsQixJQUFJLENBQUNDLEdBQUcsR0FBS0EsR0FBRztJQUNoQixJQUFJLENBQUNFLEtBQUssR0FBR0EsS0FBSztJQUNsQixJQUFJLENBQUNDLElBQUksR0FBSSxDQUFDO0lBRWQsSUFBSSxDQUFDQyxVQUFVLEdBQUcsSUFBSUMsR0FBRyxDQUFELENBQUM7SUFDekIsSUFBSSxDQUFDQyxPQUFPLEdBQUdKLEtBQUssR0FBRyxDQUFDLEdBQ3JCLElBQUl2SixLQUFLLENBQUMsQ0FBQyxHQUFHdUosS0FBSyxDQUFDLEdBQ3BCLElBQUk7SUFFUCxJQUFJLENBQUNELElBQUksR0FBSUEsSUFBSTtFQUNsQjtFQUFDLE9BQUFsVixZQUFBLENBQUErVSxPQUFBO0lBQUE1UixHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQXlULEtBQUtBLENBQUNDLEVBQUUsRUFDUjtNQUNDLElBQUdBLEVBQUUsR0FBRyxJQUFJLENBQUNULEtBQUssSUFBSVMsRUFBRSxHQUFHLElBQUksQ0FBQ1IsR0FBRyxFQUNuQztRQUNDLE1BQU0sSUFBSVMsVUFBVSxDQUFDLGtDQUFrQyxDQUFDO01BQ3pEO01BRUEsSUFBR0QsRUFBRSxLQUFLLElBQUksQ0FBQ1QsS0FBSyxFQUNwQjtRQUNDLE9BQU8sQ0FBQyxJQUFJLENBQUM7TUFDZDtNQUVBLElBQUdTLEVBQUUsS0FBSyxJQUFJLENBQUNSLEdBQUcsRUFDbEI7UUFDQyxPQUFPLENBQUMsSUFBSSxDQUFDO01BQ2Q7TUFFQSxJQUFNeE0sQ0FBQyxHQUFHLElBQUlzTSxPQUFPLENBQUMsSUFBSSxDQUFDQyxLQUFLLEVBQUVTLEVBQUUsRUFBRSxJQUFJLENBQUNQLElBQUksRUFBRSxJQUFJLENBQUNDLEtBQUssQ0FBQztNQUM1RCxJQUFNM0QsQ0FBQyxHQUFHLElBQUl1RCxPQUFPLENBQUNVLEVBQUUsRUFBRSxJQUFJLENBQUNSLEdBQUcsRUFBRXhNLENBQUMsRUFBRSxJQUFJLENBQUMwTSxLQUFLLENBQUM7TUFBQyxJQUFBM1QsU0FBQSxHQUFBQywwQkFBQSxDQUU1QixJQUFJLENBQUM0VCxVQUFVO1FBQUEzVCxLQUFBO01BQUE7UUFBdEMsS0FBQUYsU0FBQSxDQUFBRyxDQUFBLE1BQUFELEtBQUEsR0FBQUYsU0FBQSxDQUFBSSxDQUFBLElBQUFDLElBQUEsR0FDQTtVQUFBLElBRFU4VCxTQUFTLEdBQUFqVSxLQUFBLENBQUFLLEtBQUE7VUFFbEIsSUFBTTZULE9BQU8sR0FBRyxJQUFJLENBQUNULEtBQUssS0FBSyxDQUFDLEdBQUdRLFNBQVMsQ0FBQ0UsRUFBRSxHQUFHRixTQUFTLENBQUNHLEVBQUU7VUFDOUQsSUFBTUMsT0FBTyxHQUFHLElBQUksQ0FBQ1osS0FBSyxLQUFLLENBQUMsR0FBR1EsU0FBUyxDQUFDSyxFQUFFLEdBQUdMLFNBQVMsQ0FBQ00sRUFBRTtVQUU5RCxJQUFHRixPQUFPLEdBQUdOLEVBQUUsRUFDZjtZQUNDaE4sQ0FBQyxDQUFDc0csR0FBRyxDQUFDNEcsU0FBUyxDQUFDO1lBQ2hCO1VBQ0Q7VUFFQSxJQUFHQyxPQUFPLEdBQUdILEVBQUUsRUFDZjtZQUNDakUsQ0FBQyxDQUFDekMsR0FBRyxDQUFDNEcsU0FBUyxDQUFDO1lBQ2hCO1VBQ0Q7VUFFQWxOLENBQUMsQ0FBQ3NHLEdBQUcsQ0FBQzRHLFNBQVMsQ0FBQztVQUNoQm5FLENBQUMsQ0FBQ3pDLEdBQUcsQ0FBQzRHLFNBQVMsQ0FBQztRQUNqQjtNQUFDLFNBQUF2VCxHQUFBO1FBQUFaLFNBQUEsQ0FBQWEsQ0FBQSxDQUFBRCxHQUFBO01BQUE7UUFBQVosU0FBQSxDQUFBYyxDQUFBO01BQUE7TUFFRCxPQUFPLENBQUNtRyxDQUFDLEVBQUUrSSxDQUFDLENBQUM7SUFDZDtFQUFDO0lBQUFyTyxHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQWdOLEdBQUdBLENBQUM0RyxTQUFTLEVBQ2I7TUFDQyxJQUFHLElBQUksQ0FBQ0osT0FBTyxFQUNmO1FBQ0MsSUFBSSxDQUFDQSxPQUFPLENBQUN4RyxHQUFHLENBQUM0RyxTQUFTLENBQUM7TUFDNUI7TUFFQSxJQUFJLENBQUNOLFVBQVUsQ0FBQ3RHLEdBQUcsQ0FBQzRHLFNBQVMsQ0FBQztNQUM5QixJQUFJLENBQUNQLElBQUksR0FBRyxJQUFJLENBQUNDLFVBQVUsQ0FBQ0QsSUFBSTtJQUNqQztFQUFDO0lBQUFqUyxHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQW1VLE9BQU1BLENBQUNQLFNBQVMsRUFDaEI7TUFDQyxJQUFHLElBQUksQ0FBQ0osT0FBTyxFQUNmO1FBQ0MsSUFBSSxDQUFDQSxPQUFPLFVBQU8sQ0FBQ0ksU0FBUyxDQUFDO01BQy9CO01BRUEsSUFBSSxDQUFDTixVQUFVLFVBQU8sQ0FBQ00sU0FBUyxDQUFDO01BQ2pDLElBQUksQ0FBQ1AsSUFBSSxHQUFHLElBQUksQ0FBQ0MsVUFBVSxDQUFDRCxJQUFJO01BRWhDLElBQU1lLEtBQUssR0FBSSxDQUFDLElBQUksQ0FBQ2QsVUFBVSxDQUFDRCxJQUFJLElBQUssSUFBSSxDQUFDSixLQUFLLEdBQUcsQ0FBQ29CLFFBQVE7TUFFL0QsT0FBT0QsS0FBSztJQUNiO0VBQUM7QUFBQTtBQUFBLElBR1d2SyxLQUFLLEdBQUE3TCxPQUFBLENBQUE2TCxLQUFBO0VBRWpCLFNBQUFBLE1BQUEsRUFDQTtJQUFBLElBRFl1SixLQUFLLEdBQUExUixTQUFBLENBQUFDLE1BQUEsUUFBQUQsU0FBQSxRQUFBa0wsU0FBQSxHQUFBbEwsU0FBQSxNQUFHLENBQUM7SUFBQXhELGVBQUEsT0FBQTJMLEtBQUE7SUFFcEIsSUFBSSxDQUFDdUosS0FBSyxHQUFHQSxLQUFLO0lBQ2xCLElBQUksQ0FBQ2tCLFFBQVEsR0FBRyxDQUFDLElBQUl0QixPQUFPLENBQUMsQ0FBQ3FCLFFBQVEsRUFBRUEsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUNqQixLQUFLLENBQUMsQ0FBQztFQUNyRTtFQUFDLE9BQUFuVixZQUFBLENBQUE0TCxLQUFBO0lBQUF6SSxHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQWdOLEdBQUdBLENBQUM0RyxTQUFTLEVBQ2I7TUFDQyxJQUFNQyxPQUFPLEdBQUcsSUFBSSxDQUFDVCxLQUFLLEtBQUssQ0FBQyxHQUFHUSxTQUFTLENBQUNFLEVBQUUsR0FBR0YsU0FBUyxDQUFDRyxFQUFFO01BQzlELElBQU1DLE9BQU8sR0FBRyxJQUFJLENBQUNaLEtBQUssS0FBSyxDQUFDLEdBQUdRLFNBQVMsQ0FBQ0ssRUFBRSxHQUFHTCxTQUFTLENBQUNNLEVBQUU7TUFFOUQsSUFBTUssVUFBVSxHQUFHLElBQUksQ0FBQ0MsV0FBVyxDQUFDWCxPQUFPLENBQUM7TUFDNUMsSUFBSSxDQUFDWSxZQUFZLENBQUNGLFVBQVUsRUFBRVYsT0FBTyxDQUFDO01BRXRDLElBQU1hLFFBQVEsR0FBRyxJQUFJLENBQUNGLFdBQVcsQ0FBQ1IsT0FBTyxDQUFDO01BQzFDLElBQUksQ0FBQ1MsWUFBWSxDQUFDQyxRQUFRLEVBQUVWLE9BQU8sQ0FBQztNQUVwQyxJQUFHTyxVQUFVLEtBQUtHLFFBQVEsRUFDMUI7UUFDQyxJQUFJLENBQUNKLFFBQVEsQ0FBQ0MsVUFBVSxDQUFDLENBQUN2SCxHQUFHLENBQUM0RyxTQUFTLENBQUM7UUFDeEM7TUFDRDtNQUVBLEtBQUksSUFBSXJNLENBQUMsR0FBRyxDQUFDLEdBQUdnTixVQUFVLEVBQUVoTixDQUFDLElBQUltTixRQUFRLEVBQUVuTixDQUFDLEVBQUUsRUFDOUM7UUFDQyxJQUFJLENBQUMrTSxRQUFRLENBQUMvTSxDQUFDLENBQUMsQ0FBQ3lGLEdBQUcsQ0FBQzRHLFNBQVMsQ0FBQztNQUNoQztJQUNEO0VBQUM7SUFBQXhTLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBbVUsT0FBTUEsQ0FBQ1AsU0FBUyxFQUNoQjtNQUNDLElBQU1DLE9BQU8sR0FBRyxJQUFJLENBQUNULEtBQUssS0FBSyxDQUFDLEdBQUdRLFNBQVMsQ0FBQ0UsRUFBRSxHQUFHRixTQUFTLENBQUNHLEVBQUU7TUFDOUQsSUFBTUMsT0FBTyxHQUFHLElBQUksQ0FBQ1osS0FBSyxLQUFLLENBQUMsR0FBR1EsU0FBUyxDQUFDSyxFQUFFLEdBQUdMLFNBQVMsQ0FBQ00sRUFBRTtNQUU5RCxJQUFNSyxVQUFVLEdBQUcsSUFBSSxDQUFDQyxXQUFXLENBQUNYLE9BQU8sQ0FBQztNQUM1QyxJQUFNYSxRQUFRLEdBQUcsSUFBSSxDQUFDRixXQUFXLENBQUNSLE9BQU8sQ0FBQztNQUUxQyxJQUFNSSxLQUFLLEdBQUcsRUFBRTtNQUVoQixLQUFJLElBQUk3TSxDQUFDLEdBQUdnTixVQUFVLEVBQUVoTixDQUFDLElBQUltTixRQUFRLEVBQUVuTixDQUFDLEVBQUUsRUFDMUM7UUFDQyxJQUFHLElBQUksQ0FBQytNLFFBQVEsQ0FBQy9NLENBQUMsQ0FBQyxVQUFPLENBQUNxTSxTQUFTLENBQUMsRUFDckM7VUFDQ1EsS0FBSyxDQUFDekYsSUFBSSxDQUFDcEgsQ0FBQyxDQUFDO1FBQ2Q7TUFDRDtNQUVBLEtBQUksSUFBSUEsRUFBQyxHQUFHLENBQUMsQ0FBQyxHQUFHNk0sS0FBSyxDQUFDelMsTUFBTSxFQUFFNEYsRUFBQyxJQUFJLENBQUMsRUFBRUEsRUFBQyxFQUFFLEVBQzFDO1FBQ0MsSUFBTWpILENBQUMsR0FBRzhULEtBQUssQ0FBQzdNLEVBQUMsQ0FBQztRQUVsQixJQUFHLENBQUMsSUFBSSxDQUFDK00sUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHaFUsQ0FBQyxDQUFDLEVBQ3pCO1VBQ0MsTUFBTSxJQUFJcVIsS0FBSyxDQUFDLDRDQUE0QyxDQUFDO1FBQzlEO1FBRUEsSUFBSSxDQUFDMkMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHaFUsQ0FBQyxDQUFDLENBQUM0UyxHQUFHLEdBQUcsSUFBSSxDQUFDb0IsUUFBUSxDQUFDaFUsQ0FBQyxDQUFDLENBQUM0UyxHQUFHO1FBQ2hELElBQUksQ0FBQ29CLFFBQVEsQ0FBQyxDQUFDLEdBQUdoVSxDQUFDLENBQUMsQ0FBQzZTLElBQUksR0FBRyxJQUFJLENBQUNtQixRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUdoVSxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDZ1UsUUFBUSxDQUFDSyxNQUFNLENBQUNyVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO01BQzNCO01BRUEsSUFBRyxJQUFJLENBQUNnVSxRQUFRLENBQUMzUyxNQUFNLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQzJTLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQ2pCLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDaUIsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDakIsSUFBSSxLQUFLLENBQUMsRUFDMUY7UUFDQyxJQUFJLENBQUNpQixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUNwQixHQUFHLEdBQUcsSUFBSSxDQUFDb0IsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDcEIsR0FBRztRQUMzQyxJQUFJLENBQUNvQixRQUFRLENBQUMzUyxNQUFNLEdBQUcsQ0FBQztNQUN6QjtJQUNEO0VBQUM7SUFBQVAsR0FBQTtJQUFBcEIsS0FBQSxFQUVELFNBQUE0VSxLQUFLQSxDQUFDZCxFQUFFLEVBQUVDLEVBQUUsRUFBRUUsRUFBRSxFQUFFQyxFQUFFLEVBQ3BCO01BQ0M3VSxPQUFPLENBQUN3VixJQUFJLENBQUMsWUFBWSxDQUFDO01BRTFCLElBQU12QixVQUFVLEdBQUcsSUFBSUMsR0FBRyxDQUFELENBQUM7TUFFMUIsSUFBTXVCLFdBQVcsR0FBRyxJQUFJLENBQUNOLFdBQVcsQ0FBQ1YsRUFBRSxDQUFDO01BQ3hDLElBQU1pQixTQUFTLEdBQUcsSUFBSSxDQUFDUCxXQUFXLENBQUNQLEVBQUUsQ0FBQztNQUV0QyxLQUFJLElBQUkxTSxDQUFDLEdBQUd1TixXQUFXLEVBQUV2TixDQUFDLElBQUl3TixTQUFTLEVBQUV4TixDQUFDLEVBQUUsRUFDNUM7UUFDQyxJQUFNeU4sT0FBTyxHQUFHLElBQUksQ0FBQ1YsUUFBUSxDQUFDL00sQ0FBQyxDQUFDO1FBRWhDLElBQUcsQ0FBQ3lOLE9BQU8sQ0FBQ3hCLE9BQU8sRUFDbkI7VUFDQztRQUNEO1FBRUEsSUFBTXlCLFdBQVcsR0FBR0QsT0FBTyxDQUFDeEIsT0FBTyxDQUFDZ0IsV0FBVyxDQUFDVCxFQUFFLENBQUM7UUFDbkQsSUFBTW1CLFNBQVMsR0FBR0YsT0FBTyxDQUFDeEIsT0FBTyxDQUFDZ0IsV0FBVyxDQUFDTixFQUFFLENBQUM7UUFFakQsS0FBSSxJQUFJMUcsQ0FBQyxHQUFHeUgsV0FBVyxFQUFFekgsQ0FBQyxJQUFJMEgsU0FBUyxFQUFFMUgsQ0FBQyxFQUFFLEVBQzVDO1VBQUEsSUFBQWhOLFVBQUEsR0FBQWQsMEJBQUEsQ0FDd0JzVixPQUFPLENBQUN4QixPQUFPLENBQUNjLFFBQVEsQ0FBQzlHLENBQUMsQ0FBQyxDQUFDOEYsVUFBVTtZQUFBN1MsTUFBQTtVQUFBO1lBQTdELEtBQUFELFVBQUEsQ0FBQVosQ0FBQSxNQUFBYSxNQUFBLEdBQUFELFVBQUEsQ0FBQVgsQ0FBQSxJQUFBQyxJQUFBLEdBQ0E7Y0FBQSxJQURVOFQsU0FBUyxHQUFBblQsTUFBQSxDQUFBVCxLQUFBO2NBRWxCc1QsVUFBVSxDQUFDdEcsR0FBRyxDQUFDNEcsU0FBUyxDQUFDO1lBQzFCO1VBQUMsU0FBQXZULEdBQUE7WUFBQUcsVUFBQSxDQUFBRixDQUFBLENBQUFELEdBQUE7VUFBQTtZQUFBRyxVQUFBLENBQUFELENBQUE7VUFBQTtRQUNGO01BQ0Q7TUFFQWxCLE9BQU8sQ0FBQzhWLE9BQU8sQ0FBQyxZQUFZLENBQUM7TUFDN0IsT0FBTzdCLFVBQVU7SUFDbEI7RUFBQztJQUFBbFMsR0FBQTtJQUFBcEIsS0FBQSxFQUVELFNBQUF5VSxZQUFZQSxDQUFDVyxLQUFLLEVBQUUxQixFQUFFLEVBQ3RCO01BQUEsSUFBQTJCLGNBQUE7TUFDQyxJQUFHM0IsRUFBRSxJQUFJLElBQUksQ0FBQ1ksUUFBUSxDQUFDYyxLQUFLLENBQUMsQ0FBQ25DLEtBQUssSUFBSVMsRUFBRSxJQUFJLElBQUksQ0FBQ1ksUUFBUSxDQUFDYyxLQUFLLENBQUMsQ0FBQ2xDLEdBQUcsRUFDckU7UUFDQztNQUNEO01BRUEsSUFBTW9DLGFBQWEsR0FBRyxJQUFJLENBQUNoQixRQUFRLENBQUNjLEtBQUssQ0FBQyxDQUFDM0IsS0FBSyxDQUFDQyxFQUFFLENBQUM7TUFFcEQsQ0FBQTJCLGNBQUEsT0FBSSxDQUFDZixRQUFRLEVBQUNLLE1BQU0sQ0FBQTVTLEtBQUEsQ0FBQXNULGNBQUEsR0FBQ0QsS0FBSyxFQUFFLENBQUMsRUFBQWhWLE1BQUEsQ0FBQTZSLGtCQUFBLENBQUtxRCxhQUFhLEdBQUM7SUFDakQ7RUFBQztJQUFBbFUsR0FBQTtJQUFBcEIsS0FBQSxFQUVELFNBQUF3VSxXQUFXQSxDQUFDZCxFQUFFLEVBQ2Q7TUFDQyxJQUFJNkIsRUFBRSxHQUFHLENBQUM7TUFDVixJQUFJQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDbEIsUUFBUSxDQUFDM1MsTUFBTTtNQUVsQyxHQUNBO1FBQ0MsSUFBTThULE9BQU8sR0FBRzVGLElBQUksQ0FBQzZGLEtBQUssQ0FBQyxDQUFDSCxFQUFFLEdBQUdDLEVBQUUsSUFBSSxHQUFHLENBQUM7UUFDM0MsSUFBTVIsT0FBTyxHQUFHLElBQUksQ0FBQ1YsUUFBUSxDQUFDbUIsT0FBTyxDQUFDO1FBRXRDLElBQUdULE9BQU8sQ0FBQy9CLEtBQUssSUFBSVMsRUFBRSxJQUFJc0IsT0FBTyxDQUFDOUIsR0FBRyxJQUFJUSxFQUFFLEVBQzNDO1VBQ0MsT0FBTytCLE9BQU87UUFDZjtRQUVBLElBQUdULE9BQU8sQ0FBQy9CLEtBQUssR0FBR1MsRUFBRSxFQUNyQjtVQUNDNkIsRUFBRSxHQUFHLENBQUMsR0FBR0UsT0FBTztRQUNqQjtRQUVBLElBQUdULE9BQU8sQ0FBQzlCLEdBQUcsR0FBR1EsRUFBRSxFQUNuQjtVQUNDOEIsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHQyxPQUFPO1FBQ2xCO01BQ0QsQ0FBQyxRQUFPRixFQUFFLElBQUlDLEVBQUU7TUFFaEIsT0FBTyxDQUFDLENBQUM7SUFDVjtFQUFDO0FBQUE7Ozs7Ozs7Ozs7O0FDek9GLElBQUFHLFdBQUEsR0FBQXRTLE9BQUE7QUFBd0MsU0FBQTRPLG1CQUFBcEwsQ0FBQSxXQUFBcUwsa0JBQUEsQ0FBQXJMLENBQUEsS0FBQXNMLGdCQUFBLENBQUF0TCxDQUFBLEtBQUF1TCwyQkFBQSxDQUFBdkwsQ0FBQSxLQUFBd0wsa0JBQUE7QUFBQSxTQUFBQSxtQkFBQSxjQUFBMUwsU0FBQTtBQUFBLFNBQUF3TCxpQkFBQXRMLENBQUEsOEJBQUFhLE1BQUEsWUFBQWIsQ0FBQSxDQUFBYSxNQUFBLENBQUE0SyxRQUFBLGFBQUF6TCxDQUFBLHVCQUFBaEYsS0FBQSxDQUFBMFEsSUFBQSxDQUFBMUwsQ0FBQTtBQUFBLFNBQUFxTCxtQkFBQXJMLENBQUEsUUFBQWhGLEtBQUEsQ0FBQTJRLE9BQUEsQ0FBQTNMLENBQUEsVUFBQTRMLGlCQUFBLENBQUE1TCxDQUFBO0FBQUEsU0FBQW5ILDJCQUFBbUgsQ0FBQSxFQUFBdkcsQ0FBQSxRQUFBd0csQ0FBQSx5QkFBQVksTUFBQSxJQUFBYixDQUFBLENBQUFhLE1BQUEsQ0FBQTRLLFFBQUEsS0FBQXpMLENBQUEscUJBQUFDLENBQUEsUUFBQWpGLEtBQUEsQ0FBQTJRLE9BQUEsQ0FBQTNMLENBQUEsTUFBQUMsQ0FBQSxHQUFBc0wsMkJBQUEsQ0FBQXZMLENBQUEsTUFBQXZHLENBQUEsSUFBQXVHLENBQUEsdUJBQUFBLENBQUEsQ0FBQWxGLE1BQUEsSUFBQW1GLENBQUEsS0FBQUQsQ0FBQSxHQUFBQyxDQUFBLE9BQUE0TCxFQUFBLE1BQUFDLENBQUEsWUFBQUEsRUFBQSxlQUFBL1MsQ0FBQSxFQUFBK1MsQ0FBQSxFQUFBOVMsQ0FBQSxXQUFBQSxFQUFBLFdBQUE2UyxFQUFBLElBQUE3TCxDQUFBLENBQUFsRixNQUFBLEtBQUE3QixJQUFBLFdBQUFBLElBQUEsTUFBQUUsS0FBQSxFQUFBNkcsQ0FBQSxDQUFBNkwsRUFBQSxVQUFBcFMsQ0FBQSxXQUFBQSxFQUFBdUcsQ0FBQSxVQUFBQSxDQUFBLEtBQUF0RyxDQUFBLEVBQUFvUyxDQUFBLGdCQUFBaE0sU0FBQSxpSkFBQUksQ0FBQSxFQUFBTCxDQUFBLE9BQUFrTSxDQUFBLGdCQUFBaFQsQ0FBQSxXQUFBQSxFQUFBLElBQUFrSCxDQUFBLEdBQUFBLENBQUEsQ0FBQWMsSUFBQSxDQUFBZixDQUFBLE1BQUFoSCxDQUFBLFdBQUFBLEVBQUEsUUFBQWdILENBQUEsR0FBQUMsQ0FBQSxDQUFBK0wsSUFBQSxXQUFBbk0sQ0FBQSxHQUFBRyxDQUFBLENBQUEvRyxJQUFBLEVBQUErRyxDQUFBLEtBQUF2RyxDQUFBLFdBQUFBLEVBQUF1RyxDQUFBLElBQUErTCxDQUFBLE9BQUE3TCxDQUFBLEdBQUFGLENBQUEsS0FBQXRHLENBQUEsV0FBQUEsRUFBQSxVQUFBbUcsQ0FBQSxZQUFBSSxDQUFBLGNBQUFBLENBQUEsOEJBQUE4TCxDQUFBLFFBQUE3TCxDQUFBO0FBQUEsU0FBQXFMLDRCQUFBdkwsQ0FBQSxFQUFBSCxDQUFBLFFBQUFHLENBQUEsMkJBQUFBLENBQUEsU0FBQTRMLGlCQUFBLENBQUE1TCxDQUFBLEVBQUFILENBQUEsT0FBQUksQ0FBQSxNQUFBZ00sUUFBQSxDQUFBbEwsSUFBQSxDQUFBZixDQUFBLEVBQUFrTSxLQUFBLDZCQUFBak0sQ0FBQSxJQUFBRCxDQUFBLENBQUF3QixXQUFBLEtBQUF2QixDQUFBLEdBQUFELENBQUEsQ0FBQXdCLFdBQUEsQ0FBQTdHLElBQUEsYUFBQXNGLENBQUEsY0FBQUEsQ0FBQSxHQUFBakYsS0FBQSxDQUFBMFEsSUFBQSxDQUFBMUwsQ0FBQSxvQkFBQUMsQ0FBQSwrQ0FBQTJLLElBQUEsQ0FBQTNLLENBQUEsSUFBQTJMLGlCQUFBLENBQUE1TCxDQUFBLEVBQUFILENBQUE7QUFBQSxTQUFBK0wsa0JBQUE1TCxDQUFBLEVBQUFILENBQUEsYUFBQUEsQ0FBQSxJQUFBQSxDQUFBLEdBQUFHLENBQUEsQ0FBQWxGLE1BQUEsTUFBQStFLENBQUEsR0FBQUcsQ0FBQSxDQUFBbEYsTUFBQSxZQUFBckIsQ0FBQSxNQUFBVCxDQUFBLEdBQUFnQyxLQUFBLENBQUE2RSxDQUFBLEdBQUFwRyxDQUFBLEdBQUFvRyxDQUFBLEVBQUFwRyxDQUFBLElBQUFULENBQUEsQ0FBQVMsQ0FBQSxJQUFBdUcsQ0FBQSxDQUFBdkcsQ0FBQSxVQUFBVCxDQUFBO0FBQUEsU0FBQTNCLGdCQUFBd0ksQ0FBQSxFQUFBN0csQ0FBQSxVQUFBNkcsQ0FBQSxZQUFBN0csQ0FBQSxhQUFBOEcsU0FBQTtBQUFBLFNBQUFDLGtCQUFBdEcsQ0FBQSxFQUFBdUcsQ0FBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUQsQ0FBQSxDQUFBbEYsTUFBQSxFQUFBbUYsQ0FBQSxVQUFBQyxDQUFBLEdBQUFGLENBQUEsQ0FBQUMsQ0FBQSxHQUFBQyxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUE5RyxDQUFBLEVBQUErRyxjQUFBLENBQUFOLENBQUEsQ0FBQTNGLEdBQUEsR0FBQTJGLENBQUE7QUFBQSxTQUFBOUksYUFBQXFDLENBQUEsRUFBQXVHLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFELGlCQUFBLENBQUF0RyxDQUFBLENBQUFnSCxTQUFBLEVBQUFULENBQUEsR0FBQUMsQ0FBQSxJQUFBRixpQkFBQSxDQUFBdEcsQ0FBQSxFQUFBd0csQ0FBQSxHQUFBSyxNQUFBLENBQUFDLGNBQUEsQ0FBQTlHLENBQUEsaUJBQUE0RyxRQUFBLFNBQUE1RyxDQUFBO0FBQUEsU0FBQStHLGVBQUFQLENBQUEsUUFBQVMsQ0FBQSxHQUFBQyxZQUFBLENBQUFWLENBQUEsZ0NBQUFXLE9BQUEsQ0FBQUYsQ0FBQSxJQUFBQSxDQUFBLEdBQUFBLENBQUE7QUFBQSxTQUFBQyxhQUFBVixDQUFBLEVBQUFELENBQUEsb0JBQUFZLE9BQUEsQ0FBQVgsQ0FBQSxNQUFBQSxDQUFBLFNBQUFBLENBQUEsTUFBQXhHLENBQUEsR0FBQXdHLENBQUEsQ0FBQVksTUFBQSxDQUFBQyxXQUFBLGtCQUFBckgsQ0FBQSxRQUFBaUgsQ0FBQSxHQUFBakgsQ0FBQSxDQUFBc0gsSUFBQSxDQUFBZCxDQUFBLEVBQUFELENBQUEsZ0NBQUFZLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFaLFNBQUEseUVBQUFFLENBQUEsR0FBQWdCLE1BQUEsR0FBQUMsTUFBQSxFQUFBaEIsQ0FBQTtBQUFBLFNBQUFpQixXQUFBakIsQ0FBQSxFQUFBQyxDQUFBLEVBQUF6RyxDQUFBLFdBQUF5RyxDQUFBLEdBQUFpQixlQUFBLENBQUFqQixDQUFBLEdBQUFrQiwwQkFBQSxDQUFBbkIsQ0FBQSxFQUFBb0IseUJBQUEsS0FBQUMsT0FBQSxDQUFBQyxTQUFBLENBQUFyQixDQUFBLEVBQUF6RyxDQUFBLFFBQUEwSCxlQUFBLENBQUFsQixDQUFBLEVBQUF1QixXQUFBLElBQUF0QixDQUFBLENBQUFoRixLQUFBLENBQUErRSxDQUFBLEVBQUF4RyxDQUFBO0FBQUEsU0FBQTJILDJCQUFBbkIsQ0FBQSxFQUFBeEcsQ0FBQSxRQUFBQSxDQUFBLGlCQUFBbUgsT0FBQSxDQUFBbkgsQ0FBQSwwQkFBQUEsQ0FBQSxVQUFBQSxDQUFBLGlCQUFBQSxDQUFBLFlBQUFxRyxTQUFBLHFFQUFBMkIsc0JBQUEsQ0FBQXhCLENBQUE7QUFBQSxTQUFBd0IsdUJBQUFoSSxDQUFBLG1CQUFBQSxDQUFBLFlBQUFpSSxjQUFBLHNFQUFBakksQ0FBQTtBQUFBLFNBQUE0SCwwQkFBQSxjQUFBcEIsQ0FBQSxJQUFBMEIsT0FBQSxDQUFBbEIsU0FBQSxDQUFBbUIsT0FBQSxDQUFBYixJQUFBLENBQUFPLE9BQUEsQ0FBQUMsU0FBQSxDQUFBSSxPQUFBLGlDQUFBMUIsQ0FBQSxhQUFBb0IseUJBQUEsWUFBQUEsMEJBQUEsYUFBQXBCLENBQUE7QUFBQSxTQUFBa0IsZ0JBQUFsQixDQUFBLFdBQUFrQixlQUFBLEdBQUFiLE1BQUEsQ0FBQXVCLGNBQUEsR0FBQXZCLE1BQUEsQ0FBQXdCLGNBQUEsQ0FBQUMsSUFBQSxlQUFBOUIsQ0FBQSxXQUFBQSxDQUFBLENBQUErQixTQUFBLElBQUExQixNQUFBLENBQUF3QixjQUFBLENBQUE3QixDQUFBLE1BQUFrQixlQUFBLENBQUFsQixDQUFBO0FBQUEsU0FBQWdDLFVBQUFoQyxDQUFBLEVBQUF4RyxDQUFBLDZCQUFBQSxDQUFBLGFBQUFBLENBQUEsWUFBQXFHLFNBQUEsd0RBQUFHLENBQUEsQ0FBQVEsU0FBQSxHQUFBSCxNQUFBLENBQUE0QixNQUFBLENBQUF6SSxDQUFBLElBQUFBLENBQUEsQ0FBQWdILFNBQUEsSUFBQWUsV0FBQSxJQUFBckksS0FBQSxFQUFBOEcsQ0FBQSxFQUFBSSxRQUFBLE1BQUFELFlBQUEsV0FBQUUsTUFBQSxDQUFBQyxjQUFBLENBQUFOLENBQUEsaUJBQUFJLFFBQUEsU0FBQTVHLENBQUEsSUFBQTBJLGVBQUEsQ0FBQWxDLENBQUEsRUFBQXhHLENBQUE7QUFBQSxTQUFBMEksZ0JBQUFsQyxDQUFBLEVBQUF4RyxDQUFBLFdBQUEwSSxlQUFBLEdBQUE3QixNQUFBLENBQUF1QixjQUFBLEdBQUF2QixNQUFBLENBQUF1QixjQUFBLENBQUFFLElBQUEsZUFBQTlCLENBQUEsRUFBQXhHLENBQUEsV0FBQXdHLENBQUEsQ0FBQStCLFNBQUEsR0FBQXZJLENBQUEsRUFBQXdHLENBQUEsS0FBQWtDLGVBQUEsQ0FBQWxDLENBQUEsRUFBQXhHLENBQUE7QUFBQSxJQUUzQmtKLFFBQVEsR0FBQXhMLE9BQUEsQ0FBQXdMLFFBQUEsMEJBQUFoRCxVQUFBO0VBRXBCLFNBQUFnRCxTQUFZc0ssRUFBRSxFQUFFQyxFQUFFLEVBQUVFLEVBQUUsRUFBRUMsRUFBRSxFQUFFMEIsT0FBTyxFQUNuQztJQUFBLElBQUEzTCxLQUFBO0lBQUEvTCxlQUFBLE9BQUFzTCxRQUFBO0lBQ0NTLEtBQUEsR0FBQWxDLFVBQUEsT0FBQXlCLFFBQUEsR0FBTXNLLEVBQUUsRUFBRUMsRUFBRSxFQUFFRSxFQUFFLEVBQUVDLEVBQUU7SUFFcEJqSyxLQUFBLENBQUt3SixLQUFLLEdBQUcsS0FBSztJQUNsQnhKLEtBQUEsQ0FBS3dFLEtBQUssR0FBRyxJQUFJOEUsR0FBRyxDQUFELENBQUM7SUFDcEJ0SixLQUFBLENBQUsyTCxPQUFPLEdBQUdBLE9BQU87SUFFdEIzTCxLQUFBLENBQUs0TCxNQUFNLEdBQUcsSUFBSTtJQUNsQjVMLEtBQUEsQ0FBSzZMLE1BQU0sR0FBRyxJQUFJO0lBQ2xCN0wsS0FBQSxDQUFLOEwsTUFBTSxHQUFHLElBQUk7SUFDbEI5TCxLQUFBLENBQUsrTCxNQUFNLEdBQUcsSUFBSTtJQUFDLE9BQUEvTCxLQUFBO0VBQ3BCO0VBQUNuQixTQUFBLENBQUFVLFFBQUEsRUFBQWhELFVBQUE7RUFBQSxPQUFBdkksWUFBQSxDQUFBdUwsUUFBQTtJQUFBcEksR0FBQTtJQUFBcEIsS0FBQSxFQUVELFNBQUF5SixNQUFNQSxDQUFDK0MsTUFBTSxFQUNiO01BQ0MsSUFBRyxDQUFDLElBQUksQ0FBQ3lKLFFBQVEsQ0FBQ3pKLE1BQU0sQ0FBQzlDLENBQUMsRUFBRThDLE1BQU0sQ0FBQzdDLENBQUMsQ0FBQyxFQUNyQztRQUNDO01BQ0Q7TUFFQSxJQUFNdU0sS0FBSyxHQUFHLElBQUksQ0FBQ2pDLEVBQUUsR0FBRyxJQUFJLENBQUNILEVBQUU7TUFDL0IsSUFBTXFDLEtBQUssR0FBRyxJQUFJLENBQUNqQyxFQUFFLEdBQUcsSUFBSSxDQUFDSCxFQUFFO01BRS9CLElBQUcsSUFBSSxDQUFDdEYsS0FBSyxDQUFDNEUsSUFBSSxJQUFJNkMsS0FBSyxHQUFHLElBQUksQ0FBQ04sT0FBTyxJQUFJTyxLQUFLLEdBQUcsSUFBSSxDQUFDUCxPQUFPLEVBQ2xFO1FBQ0MsSUFBRyxDQUFDLElBQUksQ0FBQ25DLEtBQUssRUFDZDtVQUNDLElBQU0yQyxTQUFTLEdBQUcsR0FBRyxHQUFHRixLQUFLO1VBQzdCLElBQU1HLFNBQVMsR0FBRyxHQUFHLEdBQUdGLEtBQUs7VUFFN0IsSUFBSSxDQUFDTixNQUFNLEdBQUcsSUFBSXJNLFFBQVEsQ0FBQyxJQUFJLENBQUNzSyxFQUFFLEVBQUUsSUFBSSxDQUFDQyxFQUFFLEVBQWMsSUFBSSxDQUFDRCxFQUFFLEdBQUdzQyxTQUFTLEVBQUUsSUFBSSxDQUFDckMsRUFBRSxHQUFHc0MsU0FBUyxFQUFFLElBQUksQ0FBQ1QsT0FBTyxDQUFDO1VBQ2hILElBQUksQ0FBQ0csTUFBTSxHQUFHLElBQUl2TSxRQUFRLENBQUMsSUFBSSxDQUFDc0ssRUFBRSxFQUFFLElBQUksQ0FBQ0MsRUFBRSxHQUFHc0MsU0FBUyxFQUFFLElBQUksQ0FBQ3ZDLEVBQUUsR0FBR3NDLFNBQVMsRUFBRSxJQUFJLENBQUNsQyxFQUFFLEVBQWMsSUFBSSxDQUFDMEIsT0FBTyxDQUFDO1VBRWhILElBQUksQ0FBQ0UsTUFBTSxHQUFHLElBQUl0TSxRQUFRLENBQUMsSUFBSSxDQUFDc0ssRUFBRSxHQUFHc0MsU0FBUyxFQUFFLElBQUksQ0FBQ3JDLEVBQUUsRUFBYyxJQUFJLENBQUNFLEVBQUUsRUFBRSxJQUFJLENBQUNGLEVBQUUsR0FBR3NDLFNBQVMsRUFBRSxJQUFJLENBQUNULE9BQU8sQ0FBQztVQUNoSCxJQUFJLENBQUNJLE1BQU0sR0FBRyxJQUFJeE0sUUFBUSxDQUFDLElBQUksQ0FBQ3NLLEVBQUUsR0FBR3NDLFNBQVMsRUFBRSxJQUFJLENBQUNyQyxFQUFFLEdBQUdzQyxTQUFTLEVBQUUsSUFBSSxDQUFDcEMsRUFBRSxFQUFFLElBQUksQ0FBQ0MsRUFBRSxFQUFjLElBQUksQ0FBQzBCLE9BQU8sQ0FBQztVQUVoSCxJQUFJLENBQUNuQyxLQUFLLEdBQUksSUFBSTtRQUNuQjtRQUFDLElBQUFoVSxTQUFBLEdBQUFDLDBCQUFBLENBRWlCLElBQUksQ0FBQytPLEtBQUs7VUFBQTlPLEtBQUE7UUFBQTtVQUE1QixLQUFBRixTQUFBLENBQUFHLENBQUEsTUFBQUQsS0FBQSxHQUFBRixTQUFBLENBQUFJLENBQUEsSUFBQUMsSUFBQSxHQUNBO1lBQUEsSUFEVXdXLElBQUksR0FBQTNXLEtBQUEsQ0FBQUssS0FBQTtZQUViLElBQUksQ0FBQzZWLE1BQU0sQ0FBQ3BNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQztZQUN4QixJQUFJLENBQUNSLE1BQU0sQ0FBQ3JNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQztZQUN4QixJQUFJLENBQUNQLE1BQU0sQ0FBQ3RNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQztZQUN4QixJQUFJLENBQUNOLE1BQU0sQ0FBQ3ZNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQztZQUV4QixJQUFJLENBQUM3SCxLQUFLLFVBQU8sQ0FBQzZILElBQUksQ0FBQztVQUN4QjtRQUFDLFNBQUFqVyxHQUFBO1VBQUFaLFNBQUEsQ0FBQWEsQ0FBQSxDQUFBRCxHQUFBO1FBQUE7VUFBQVosU0FBQSxDQUFBYyxDQUFBO1FBQUE7UUFFRCxJQUFJLENBQUNzVixNQUFNLENBQUNwTSxNQUFNLENBQUMrQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDc0osTUFBTSxDQUFDck0sTUFBTSxDQUFDK0MsTUFBTSxDQUFDO1FBQzFCLElBQUksQ0FBQ3VKLE1BQU0sQ0FBQ3RNLE1BQU0sQ0FBQytDLE1BQU0sQ0FBQztRQUMxQixJQUFJLENBQUN3SixNQUFNLENBQUN2TSxNQUFNLENBQUMrQyxNQUFNLENBQUM7TUFDM0IsQ0FBQyxNQUVEO1FBQ0MsSUFBSSxDQUFDaUMsS0FBSyxDQUFDekIsR0FBRyxDQUFDUixNQUFNLENBQUM7TUFDdkI7SUFDRDtFQUFDO0lBQUFwTCxHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQXVXLFFBQVFBLENBQUM3TSxDQUFDLEVBQUVDLENBQUMsRUFDYjtNQUFBLElBQUF0TCxJQUFBLEVBQUF1RixLQUFBLEVBQUE0UyxxQkFBQTtNQUNDLElBQUcsQ0FBQyxJQUFJLENBQUNQLFFBQVEsQ0FBQ3ZNLENBQUMsRUFBRUMsQ0FBQyxDQUFDLEVBQ3ZCO1FBQ0MsT0FBTyxJQUFJO01BQ1o7TUFFQSxJQUFHLENBQUMsSUFBSSxDQUFDOEosS0FBSyxFQUNkO1FBQ0MsT0FBTyxJQUFJO01BQ1o7TUFFQSxRQUFBcFYsSUFBQSxJQUFBdUYsS0FBQSxJQUFBNFMscUJBQUEsR0FBTyxJQUFJLENBQUNYLE1BQU0sQ0FBQ1UsUUFBUSxDQUFDN00sQ0FBQyxFQUFFQyxDQUFDLENBQUMsY0FBQTZNLHFCQUFBLGNBQUFBLHFCQUFBLEdBQzdCLElBQUksQ0FBQ1YsTUFBTSxDQUFDUyxRQUFRLENBQUM3TSxDQUFDLEVBQUVDLENBQUMsQ0FBQyxjQUFBL0YsS0FBQSxjQUFBQSxLQUFBLEdBQzFCLElBQUksQ0FBQ21TLE1BQU0sQ0FBQ1EsUUFBUSxDQUFDN00sQ0FBQyxFQUFFQyxDQUFDLENBQUMsY0FBQXRMLElBQUEsY0FBQUEsSUFBQSxHQUMxQixJQUFJLENBQUMyWCxNQUFNLENBQUNPLFFBQVEsQ0FBQzdNLENBQUMsRUFBRUMsQ0FBQyxDQUFDO0lBQy9CO0VBQUM7SUFBQXZJLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBeVcsR0FBR0EsQ0FBQ2pLLE1BQU0sRUFDVjtNQUNDLElBQUcsSUFBSSxDQUFDaUgsS0FBSyxFQUNiO1FBQ0MsT0FBTyxJQUFJLENBQUNvQyxNQUFNLENBQUNZLEdBQUcsQ0FBQ2pLLE1BQU0sQ0FBQyxJQUMxQixJQUFJLENBQUNzSixNQUFNLENBQUNXLEdBQUcsQ0FBQ2pLLE1BQU0sQ0FBQyxJQUN2QixJQUFJLENBQUN1SixNQUFNLENBQUNVLEdBQUcsQ0FBQ2pLLE1BQU0sQ0FBQyxJQUN2QixJQUFJLENBQUN3SixNQUFNLENBQUNTLEdBQUcsQ0FBQ2pLLE1BQU0sQ0FBQztNQUM1QjtNQUVBLE9BQU8sSUFBSSxDQUFDaUMsS0FBSyxDQUFDZ0ksR0FBRyxDQUFDakssTUFBTSxDQUFDO0lBQzlCO0VBQUM7SUFBQXBMLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBMFcsTUFBTUEsQ0FBQ2hOLENBQUMsRUFBRUMsQ0FBQyxFQUFFZ04sQ0FBQyxFQUFFQyxDQUFDLEVBQ2pCO01BQ0MsSUFBTUMsSUFBSSxHQUFHbk4sQ0FBQyxHQUFHaU4sQ0FBQztNQUNsQixJQUFNRyxJQUFJLEdBQUduTixDQUFDLEdBQUdpTixDQUFDO01BRWxCLElBQUdDLElBQUksR0FBRyxJQUFJLENBQUMvQyxFQUFFLElBQUlwSyxDQUFDLEdBQUcsSUFBSSxDQUFDdUssRUFBRSxFQUNoQztRQUNDLE9BQU8sSUFBSVYsR0FBRyxDQUFELENBQUM7TUFDZjtNQUVBLElBQUd1RCxJQUFJLEdBQUcsSUFBSSxDQUFDL0MsRUFBRSxJQUFJcEssQ0FBQyxHQUFHLElBQUksQ0FBQ3VLLEVBQUUsRUFDaEM7UUFDQyxPQUFPLElBQUlYLEdBQUcsQ0FBRCxDQUFDO01BQ2Y7TUFFQSxJQUFHLElBQUksQ0FBQ0UsS0FBSyxFQUNiO1FBQ0MsT0FBTyxJQUFJRixHQUFHLElBQUFuVCxNQUFBLENBQUE2UixrQkFBQSxDQUNWLElBQUksQ0FBQzRELE1BQU0sQ0FBQ2EsTUFBTSxDQUFDaE4sQ0FBQyxFQUFFQyxDQUFDLEVBQUVnTixDQUFDLEVBQUVDLENBQUMsQ0FBQyxHQUFBM0Usa0JBQUEsQ0FDNUIsSUFBSSxDQUFDNkQsTUFBTSxDQUFDWSxNQUFNLENBQUNoTixDQUFDLEVBQUVDLENBQUMsRUFBRWdOLENBQUMsRUFBRUMsQ0FBQyxDQUFDLEdBQUEzRSxrQkFBQSxDQUM5QixJQUFJLENBQUM4RCxNQUFNLENBQUNXLE1BQU0sQ0FBQ2hOLENBQUMsRUFBRUMsQ0FBQyxFQUFFZ04sQ0FBQyxFQUFFQyxDQUFDLENBQUMsR0FBQTNFLGtCQUFBLENBQzlCLElBQUksQ0FBQytELE1BQU0sQ0FBQ1UsTUFBTSxDQUFDaE4sQ0FBQyxFQUFFQyxDQUFDLEVBQUVnTixDQUFDLEVBQUVDLENBQUMsQ0FBQyxFQUNuQyxDQUFDO01BQ0g7TUFFQSxPQUFPLElBQUksQ0FBQ25JLEtBQUs7SUFDbEI7RUFBQztJQUFBck4sR0FBQTtJQUFBcEIsS0FBQSxFQUVELFNBQUErVyxJQUFJQSxDQUFBLEVBQ0o7TUFDQyxJQUFHLElBQUksQ0FBQ3RELEtBQUssRUFDYjtRQUNDLE9BQU8sSUFBSUYsR0FBRyxJQUFBblQsTUFBQSxDQUFBNlIsa0JBQUEsQ0FDVixJQUFJLENBQUM0RCxNQUFNLENBQUNrQixJQUFJLENBQUMsQ0FBQyxHQUFBOUUsa0JBQUEsQ0FDaEIsSUFBSSxDQUFDNkQsTUFBTSxDQUFDaUIsSUFBSSxDQUFDLENBQUMsR0FBQTlFLGtCQUFBLENBQ2xCLElBQUksQ0FBQzhELE1BQU0sQ0FBQ2dCLElBQUksQ0FBQyxDQUFDLEdBQUE5RSxrQkFBQSxDQUNsQixJQUFJLENBQUMrRCxNQUFNLENBQUNlLElBQUksQ0FBQyxDQUFDLEVBQ3ZCLENBQUM7TUFDSDtNQUVBLE9BQU8sSUFBSSxDQUFDdEksS0FBSztJQUNsQjtFQUFDO0FBQUEsRUF2STRCdUkscUJBQVM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUNGMUJBLFNBQVMsR0FBQWhaLE9BQUEsQ0FBQWdaLFNBQUE7RUFFckIsU0FBQUEsVUFBWWxELEVBQUUsRUFBRUMsRUFBRSxFQUFFRSxFQUFFLEVBQUVDLEVBQUUsRUFDMUI7SUFBQWhXLGVBQUEsT0FBQThZLFNBQUE7SUFDQyxJQUFJLENBQUNsRCxFQUFFLEdBQUdBLEVBQUU7SUFDWixJQUFJLENBQUNDLEVBQUUsR0FBR0EsRUFBRTtJQUNaLElBQUksQ0FBQ0UsRUFBRSxHQUFHQSxFQUFFO0lBQ1osSUFBSSxDQUFDQyxFQUFFLEdBQUdBLEVBQUU7RUFDYjtFQUFDLE9BQUFqVyxZQUFBLENBQUErWSxTQUFBO0lBQUE1VixHQUFBO0lBQUFwQixLQUFBLEVBRUQsU0FBQWlXLFFBQVFBLENBQUN2TSxDQUFDLEVBQUVDLENBQUMsRUFDYjtNQUNDLElBQUdELENBQUMsR0FBRyxJQUFJLENBQUNvSyxFQUFFLElBQUlwSyxDQUFDLEdBQUcsSUFBSSxDQUFDdUssRUFBRSxFQUM3QjtRQUNDLE9BQU8sS0FBSztNQUNiO01BRUEsSUFBR3RLLENBQUMsR0FBRyxJQUFJLENBQUNvSyxFQUFFLElBQUlwSyxDQUFDLEdBQUcsSUFBSSxDQUFDdUssRUFBRSxFQUM3QjtRQUNDLE9BQU8sS0FBSztNQUNiO01BRUEsT0FBTyxJQUFJO0lBQ1o7RUFBQztJQUFBOVMsR0FBQTtJQUFBcEIsS0FBQSxFQUVELFNBQUFpWCxZQUFZQSxDQUFDQyxLQUFLLEVBQ2xCO01BQ0MsSUFBRyxJQUFJLENBQUNwRCxFQUFFLEdBQUdvRCxLQUFLLENBQUNqRCxFQUFFLElBQUksSUFBSSxDQUFDQSxFQUFFLEdBQUdpRCxLQUFLLENBQUNwRCxFQUFFLEVBQzNDO1FBQ0M7TUFDRDtNQUVBLElBQUcsSUFBSSxDQUFDQyxFQUFFLEdBQUdtRCxLQUFLLENBQUNoRCxFQUFFLElBQUksSUFBSSxDQUFDQSxFQUFFLEdBQUdnRCxLQUFLLENBQUNuRCxFQUFFLEVBQzNDO1FBQ0M7TUFDRDtNQUVBLE9BQU8sSUFBSyxJQUFJLENBQUMxTCxXQUFXLENBQzNCd0gsSUFBSSxDQUFDTyxHQUFHLENBQUMsSUFBSSxDQUFDMEQsRUFBRSxFQUFFb0QsS0FBSyxDQUFDcEQsRUFBRSxDQUFDLEVBQUVqRSxJQUFJLENBQUNPLEdBQUcsQ0FBQyxJQUFJLENBQUMyRCxFQUFFLEVBQUVtRCxLQUFLLENBQUNuRCxFQUFFLENBQUMsRUFDdERsRSxJQUFJLENBQUNRLEdBQUcsQ0FBQyxJQUFJLENBQUM0RCxFQUFFLEVBQUVpRCxLQUFLLENBQUNqRCxFQUFFLENBQUMsRUFBRXBFLElBQUksQ0FBQ1EsR0FBRyxDQUFDLElBQUksQ0FBQzZELEVBQUUsRUFBRWdELEtBQUssQ0FBQ2hELEVBQUUsQ0FDMUQsQ0FBQztJQUNGO0VBQUM7SUFBQTlTLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBbVgsUUFBUUEsQ0FBQ0QsS0FBSyxFQUNkO01BQ0MsT0FBTyxJQUFJLENBQUNwRCxFQUFFLElBQUlvRCxLQUFLLENBQUNwRCxFQUFFLElBQ3RCLElBQUksQ0FBQ0MsRUFBRSxJQUFJbUQsS0FBSyxDQUFDbkQsRUFBRSxJQUNuQixJQUFJLENBQUNFLEVBQUUsSUFBSWlELEtBQUssQ0FBQ2pELEVBQUUsSUFDbkIsSUFBSSxDQUFDQyxFQUFFLElBQUlnRCxLQUFLLENBQUNoRCxFQUFFO0lBQ3hCO0VBQUM7SUFBQTlTLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBb1gsU0FBU0EsQ0FBQ0YsS0FBSyxFQUNmO01BQ0MsT0FBT0EsS0FBSyxDQUFDQyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQzVCO0VBQUM7SUFBQS9WLEdBQUE7SUFBQXBCLEtBQUEsRUFFRCxTQUFBcVgsV0FBV0EsQ0FBQSxFQUNYO01BQUEsSUFEWUMsR0FBRyxHQUFBNVYsU0FBQSxDQUFBQyxNQUFBLFFBQUFELFNBQUEsUUFBQWtMLFNBQUEsR0FBQWxMLFNBQUEsTUFBRyxDQUFDO01BRWxCLElBQUc0VixHQUFHLEtBQUssQ0FBQyxFQUNaO1FBQ0MsT0FBTyxDQUNOLElBQUksQ0FBQ3hELEVBQUUsRUFBRSxJQUFJLENBQUNDLEVBQUUsRUFDaEIsSUFBSSxDQUFDRSxFQUFFLEVBQUUsSUFBSSxDQUFDRixFQUFFLEVBQ2hCLElBQUksQ0FBQ0QsRUFBRSxFQUFFLElBQUksQ0FBQ0ksRUFBRSxFQUNoQixJQUFJLENBQUNKLEVBQUUsRUFBRSxJQUFJLENBQUNJLEVBQUUsRUFDaEIsSUFBSSxDQUFDRCxFQUFFLEVBQUUsSUFBSSxDQUFDRixFQUFFLEVBQ2hCLElBQUksQ0FBQ0UsRUFBRSxFQUFFLElBQUksQ0FBQ0MsRUFBRSxDQUNoQjtNQUNGO01BRUEsSUFBR29ELEdBQUcsS0FBSyxDQUFDLEVBQ1o7UUFDQyxPQUFPLENBQ04sSUFBSSxDQUFDeEQsRUFBRSxFQUFFLElBQUksQ0FBQ0MsRUFBRSxFQUFFLENBQUMsRUFDbkIsSUFBSSxDQUFDRSxFQUFFLEVBQUUsSUFBSSxDQUFDRixFQUFFLEVBQUUsQ0FBQyxFQUNuQixJQUFJLENBQUNELEVBQUUsRUFBRSxJQUFJLENBQUNJLEVBQUUsRUFBRSxDQUFDLEVBQ25CLElBQUksQ0FBQ0osRUFBRSxFQUFFLElBQUksQ0FBQ0ksRUFBRSxFQUFFLENBQUMsRUFDbkIsSUFBSSxDQUFDRCxFQUFFLEVBQUUsSUFBSSxDQUFDRixFQUFFLEVBQUUsQ0FBQyxFQUNuQixJQUFJLENBQUNFLEVBQUUsRUFBRSxJQUFJLENBQUNDLEVBQUUsRUFBRSxDQUFDLENBQ25CO01BQ0Y7TUFFQSxJQUFHb0QsR0FBRyxLQUFLLENBQUMsRUFDWjtRQUNDLE9BQU8sQ0FDTixJQUFJLENBQUN4RCxFQUFFLEVBQUUsSUFBSSxDQUFDQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFDdEIsSUFBSSxDQUFDRSxFQUFFLEVBQUUsSUFBSSxDQUFDRixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFDdEIsSUFBSSxDQUFDRCxFQUFFLEVBQUUsSUFBSSxDQUFDSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFDdEIsSUFBSSxDQUFDSixFQUFFLEVBQUUsSUFBSSxDQUFDSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFDdEIsSUFBSSxDQUFDRCxFQUFFLEVBQUUsSUFBSSxDQUFDRixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFDdEIsSUFBSSxDQUFDRSxFQUFFLEVBQUUsSUFBSSxDQUFDQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FDdEI7TUFDRjtNQUVBLFFBQ0MsSUFBSSxDQUFDSixFQUFFLEVBQUUsSUFBSSxDQUFDQyxFQUFFLEVBQUEzVCxNQUFBLENBQUE2UixrQkFBQSxDQUFNcUYsR0FBRyxHQUFHLENBQUMsR0FBR3pWLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQ3lWLEdBQUcsQ0FBQyxDQUFDQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUUsRUFBRSxJQUN6RCxJQUFJLENBQUN0RCxFQUFFLEVBQUUsSUFBSSxDQUFDRixFQUFFLEdBQUE5QixrQkFBQSxDQUFNcUYsR0FBRyxHQUFHLENBQUMsR0FBR3pWLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQ3lWLEdBQUcsQ0FBQyxDQUFDQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUUsRUFBRSxJQUN6RCxJQUFJLENBQUN6RCxFQUFFLEVBQUUsSUFBSSxDQUFDSSxFQUFFLEdBQUFqQyxrQkFBQSxDQUFNcUYsR0FBRyxHQUFHLENBQUMsR0FBR3pWLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQ3lWLEdBQUcsQ0FBQyxDQUFDQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUUsRUFBRSxJQUN6RCxJQUFJLENBQUN6RCxFQUFFLEVBQUUsSUFBSSxDQUFDSSxFQUFFLEdBQUFqQyxrQkFBQSxDQUFNcUYsR0FBRyxHQUFHLENBQUMsR0FBR3pWLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQ3lWLEdBQUcsQ0FBQyxDQUFDQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUUsRUFBRSxJQUN6RCxJQUFJLENBQUN0RCxFQUFFLEVBQUUsSUFBSSxDQUFDRixFQUFFLEdBQUE5QixrQkFBQSxDQUFNcUYsR0FBRyxHQUFHLENBQUMsR0FBR3pWLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQ3lWLEdBQUcsQ0FBQyxDQUFDQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUUsRUFBRSxJQUN6RCxJQUFJLENBQUN0RCxFQUFFLEVBQUUsSUFBSSxDQUFDQyxFQUFFLEdBQUFqQyxrQkFBQSxDQUFNcUYsR0FBRyxHQUFHLENBQUMsR0FBR3pWLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQ3lWLEdBQUcsQ0FBQyxDQUFDQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUUsRUFBRTtJQUUzRDtFQUFDO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQ3RHV0MsS0FBSyxHQUFBeFosT0FBQSxD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QUFPLEdBQUcsU0FBVkEsT0FBT0EsQ0FBQSxFQUFhO0lBQ3RCLElBQUlDLFVBQVUsR0FBRyxJQUFJN0MsU0FBUyxDQUFDLE9BQU8sR0FBR3lDLElBQUksR0FBRyxHQUFHLEdBQUdELElBQUksQ0FBQztJQUMzREssVUFBVSxDQUFDQyxTQUFTLEdBQUcsVUFBUzFoQixLQUFLLEVBQUM7TUFDcEMsSUFBSWdmLEVBQUUsQ0FBQ0MsUUFBUSxFQUFFO01BQ2pCLElBQUkwQyxPQUFPLEdBQUczaEIsS0FBSyxDQUFDd2QsSUFBSTtNQUN4QixJQUFJb0UsUUFBUSxHQUFHOUIsU0FBUyxDQUFDNkIsT0FBTyxDQUFDLElBQUk3QixTQUFTLENBQUNDLElBQUk7TUFDbkQ2QixRQUFRLENBQUMsQ0FBQztJQUNaLENBQUM7SUFDREgsVUFBVSxDQUFDSSxPQUFPLEdBQUcsWUFBVTtNQUM3QixJQUFJSixVQUFVLENBQUNLLFVBQVUsRUFBRUwsVUFBVSxDQUFDTSxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0ROLFVBQVUsQ0FBQ08sT0FBTyxHQUFHLFlBQVU7TUFDN0Job0IsTUFBTSxDQUFDdW1CLFVBQVUsQ0FBQ2lCLFFBQU8sRUFBRSxJQUFJLENBQUM7SUFDbEMsQ0FBQztFQUNILENBQUM7RUFDREEsUUFBTyxDQUFDLENBQUM7QUFDWCxDQUFDLEVBQUUsQ0FBQztBQUNKIiwiZmlsZSI6ImRvY3MvYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQmFnLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5CYWcgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgX01peGluID0gcmVxdWlyZShcIi4vTWl4aW5cIik7XG52YXIgX0V2ZW50VGFyZ2V0TWl4aW4gPSByZXF1aXJlKFwiLi4vbWl4aW4vRXZlbnRUYXJnZXRNaXhpblwiKTtcbnZhciB0b0lkID0gaW50ID0+IE51bWJlcihpbnQpO1xudmFyIGZyb21JZCA9IGlkID0+IHBhcnNlSW50KGlkKTtcbnZhciBNYXBwZWQgPSBTeW1ib2woJ01hcHBlZCcpO1xudmFyIEhhcyA9IFN5bWJvbCgnSGFzJyk7XG52YXIgQWRkID0gU3ltYm9sKCdBZGQnKTtcbnZhciBSZW1vdmUgPSBTeW1ib2woJ1JlbW92ZScpO1xudmFyIERlbGV0ZSA9IFN5bWJvbCgnRGVsZXRlJyk7XG5jbGFzcyBCYWcgZXh0ZW5kcyBfTWl4aW4uTWl4aW4ud2l0aChfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluKSB7XG4gIGNvbnN0cnVjdG9yKGNoYW5nZUNhbGxiYWNrID0gdW5kZWZpbmVkKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmNoYW5nZUNhbGxiYWNrID0gY2hhbmdlQ2FsbGJhY2s7XG4gICAgdGhpcy5jb250ZW50ID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMubGlzdCA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoW10pO1xuICAgIHRoaXMubWV0YSA9IFN5bWJvbCgnbWV0YScpO1xuICAgIHRoaXMudHlwZSA9IHVuZGVmaW5lZDtcbiAgfVxuICBoYXMoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0uaGFzKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tIYXNdKGl0ZW0pO1xuICB9XG4gIFtIYXNdKGl0ZW0pIHtcbiAgICByZXR1cm4gdGhpcy5jb250ZW50LmhhcyhpdGVtKTtcbiAgfVxuICBhZGQoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0uYWRkKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tBZGRdKGl0ZW0pO1xuICB9XG4gIFtBZGRdKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkIHx8ICEoaXRlbSBpbnN0YW5jZW9mIE9iamVjdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBvYmplY3RzIG1heSBiZSBhZGRlZCB0byBCYWdzLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy50eXBlICYmICEoaXRlbSBpbnN0YW5jZW9mIHRoaXMudHlwZSkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy50eXBlLCBpdGVtKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgT25seSBvYmplY3RzIG9mIHR5cGUgJHt0aGlzLnR5cGV9IG1heSBiZSBhZGRlZCB0byB0aGlzIEJhZy5gKTtcbiAgICB9XG4gICAgaXRlbSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKGl0ZW0pO1xuICAgIGlmICh0aGlzLmNvbnRlbnQuaGFzKGl0ZW0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBhZGRpbmcgPSBuZXcgQ3VzdG9tRXZlbnQoJ2FkZGluZycsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQoYWRkaW5nKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaWQgPSB0b0lkKHRoaXMuY3VycmVudCsrKTtcbiAgICB0aGlzLmNvbnRlbnQuc2V0KGl0ZW0sIGlkKTtcbiAgICB0aGlzLmxpc3RbaWRdID0gaXRlbTtcbiAgICBpZiAodGhpcy5jaGFuZ2VDYWxsYmFjaykge1xuICAgICAgdGhpcy5jaGFuZ2VDYWxsYmFjayhpdGVtLCB0aGlzLm1ldGEsIEJhZy5JVEVNX0FEREVELCBpZCk7XG4gICAgfVxuICAgIHZhciBhZGQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2FkZGVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW0sXG4gICAgICAgIGlkXG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGFkZCk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLnNpemU7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIHJlbW92ZShpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5yZW1vdmUoaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW1JlbW92ZV0oaXRlbSk7XG4gIH1cbiAgW1JlbW92ZV0oaXRlbSkge1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQgfHwgIShpdGVtIGluc3RhbmNlb2YgT2JqZWN0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9iamVjdHMgbWF5IGJlIHJlbW92ZWQgZnJvbSBCYWdzLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy50eXBlICYmICEoaXRlbSBpbnN0YW5jZW9mIHRoaXMudHlwZSkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy50eXBlLCBpdGVtKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgT25seSBvYmplY3RzIG9mIHR5cGUgJHt0aGlzLnR5cGV9IG1heSBiZSByZW1vdmVkIGZyb20gdGhpcyBCYWcuYCk7XG4gICAgfVxuICAgIGl0ZW0gPSBfQmluZGFibGUuQmluZGFibGUubWFrZShpdGVtKTtcbiAgICBpZiAoIXRoaXMuY29udGVudC5oYXMoaXRlbSkpIHtcbiAgICAgIGlmICh0aGlzLmNoYW5nZUNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2soaXRlbSwgdGhpcy5tZXRhLCAwLCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZpbmcgPSBuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92aW5nJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChyZW1vdmluZykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGlkID0gdGhpcy5jb250ZW50LmdldChpdGVtKTtcbiAgICBkZWxldGUgdGhpcy5saXN0W2lkXTtcbiAgICB0aGlzLmNvbnRlbnQuZGVsZXRlKGl0ZW0pO1xuICAgIGlmICh0aGlzLmNoYW5nZUNhbGxiYWNrKSB7XG4gICAgICB0aGlzLmNoYW5nZUNhbGxiYWNrKGl0ZW0sIHRoaXMubWV0YSwgQmFnLklURU1fUkVNT1ZFRCwgaWQpO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZlID0gbmV3IEN1c3RvbUV2ZW50KCdyZW1vdmVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW0sXG4gICAgICAgIGlkXG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KHJlbW92ZSk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLnNpemU7XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cbiAgZGVsZXRlKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLmRlbGV0ZShpdGVtKTtcbiAgICB9XG4gICAgdGhpc1tEZWxldGVdKGl0ZW0pO1xuICB9XG4gIFtEZWxldGVdKGl0ZW0pIHtcbiAgICB0aGlzLnJlbW92ZShpdGVtKTtcbiAgfVxuICBtYXAobWFwcGVyID0geCA9PiB4LCBmaWx0ZXIgPSB4ID0+IHgpIHtcbiAgICB2YXIgbWFwcGVkSXRlbXMgPSBuZXcgV2Vha01hcCgpO1xuICAgIHZhciBtYXBwZWRCYWcgPSBuZXcgQmFnKCk7XG4gICAgbWFwcGVkQmFnW01hcHBlZF0gPSB0aGlzO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignYWRkZWQnLCBldmVudCA9PiB7XG4gICAgICB2YXIgaXRlbSA9IGV2ZW50LmRldGFpbC5pdGVtO1xuICAgICAgaWYgKCFmaWx0ZXIoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKG1hcHBlZEl0ZW1zLmhhcyhpdGVtKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgbWFwcGVkID0gbWFwcGVyKGl0ZW0pO1xuICAgICAgbWFwcGVkSXRlbXMuc2V0KGl0ZW0sIG1hcHBlZCk7XG4gICAgICBtYXBwZWRCYWdbQWRkXShtYXBwZWQpO1xuICAgIH0pO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigncmVtb3ZlZCcsIGV2ZW50ID0+IHtcbiAgICAgIHZhciBpdGVtID0gZXZlbnQuZGV0YWlsLml0ZW07XG4gICAgICBpZiAoIW1hcHBlZEl0ZW1zLmhhcyhpdGVtKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgbWFwcGVkID0gbWFwcGVkSXRlbXMuZ2V0KGl0ZW0pO1xuICAgICAgbWFwcGVkSXRlbXMuZGVsZXRlKGl0ZW0pO1xuICAgICAgbWFwcGVkQmFnW1JlbW92ZV0obWFwcGVkKTtcbiAgICB9KTtcbiAgICByZXR1cm4gbWFwcGVkQmFnO1xuICB9XG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLmNvbnRlbnQuc2l6ZTtcbiAgfVxuICBpdGVtcygpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbnRlbnQuZW50cmllcygpKS5tYXAoZW50cnkgPT4gZW50cnlbMF0pO1xuICB9XG59XG5leHBvcnRzLkJhZyA9IEJhZztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCYWcsICdJVEVNX0FEREVEJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiAxXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCYWcsICdJVEVNX1JFTU9WRUQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IC0xXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0JpbmRhYmxlLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5CaW5kYWJsZSA9IHZvaWQgMDtcbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShlLCByLCB0KSB7IHJldHVybiAociA9IF90b1Byb3BlcnR5S2V5KHIpKSBpbiBlID8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsIHIsIHsgdmFsdWU6IHQsIGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAgfSkgOiBlW3JdID0gdCwgZTsgfVxuZnVuY3Rpb24gX3RvUHJvcGVydHlLZXkodCkgeyB2YXIgaSA9IF90b1ByaW1pdGl2ZSh0LCBcInN0cmluZ1wiKTsgcmV0dXJuIFwic3ltYm9sXCIgPT0gdHlwZW9mIGkgPyBpIDogaSArIFwiXCI7IH1cbmZ1bmN0aW9uIF90b1ByaW1pdGl2ZSh0LCByKSB7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiB0IHx8ICF0KSByZXR1cm4gdDsgdmFyIGUgPSB0W1N5bWJvbC50b1ByaW1pdGl2ZV07IGlmICh2b2lkIDAgIT09IGUpIHsgdmFyIGkgPSBlLmNhbGwodCwgciB8fCBcImRlZmF1bHRcIik7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiBpKSByZXR1cm4gaTsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkBAdG9QcmltaXRpdmUgbXVzdCByZXR1cm4gYSBwcmltaXRpdmUgdmFsdWUuXCIpOyB9IHJldHVybiAoXCJzdHJpbmdcIiA9PT0gciA/IFN0cmluZyA6IE51bWJlcikodCk7IH1cbnZhciBSZWYgPSBTeW1ib2woJ3JlZicpO1xudmFyIE9yaWdpbmFsID0gU3ltYm9sKCdvcmlnaW5hbCcpO1xudmFyIERlY2sgPSBTeW1ib2woJ2RlY2snKTtcbnZhciBCaW5kaW5nID0gU3ltYm9sKCdiaW5kaW5nJyk7XG52YXIgU3ViQmluZGluZyA9IFN5bWJvbCgnc3ViQmluZGluZycpO1xudmFyIEJpbmRpbmdBbGwgPSBTeW1ib2woJ2JpbmRpbmdBbGwnKTtcbnZhciBJc0JpbmRhYmxlID0gU3ltYm9sKCdpc0JpbmRhYmxlJyk7XG52YXIgV3JhcHBpbmcgPSBTeW1ib2woJ3dyYXBwaW5nJyk7XG52YXIgTmFtZXMgPSBTeW1ib2woJ05hbWVzJyk7XG52YXIgRXhlY3V0aW5nID0gU3ltYm9sKCdleGVjdXRpbmcnKTtcbnZhciBTdGFjayA9IFN5bWJvbCgnc3RhY2snKTtcbnZhciBPYmpTeW1ib2wgPSBTeW1ib2woJ29iamVjdCcpO1xudmFyIFdyYXBwZWQgPSBTeW1ib2woJ3dyYXBwZWQnKTtcbnZhciBVbndyYXBwZWQgPSBTeW1ib2woJ3Vud3JhcHBlZCcpO1xudmFyIEdldFByb3RvID0gU3ltYm9sKCdnZXRQcm90bycpO1xudmFyIE9uR2V0ID0gU3ltYm9sKCdvbkdldCcpO1xudmFyIE9uQWxsR2V0ID0gU3ltYm9sKCdvbkFsbEdldCcpO1xudmFyIEJpbmRDaGFpbiA9IFN5bWJvbCgnYmluZENoYWluJyk7XG52YXIgRGVzY3JpcHRvcnMgPSBTeW1ib2woJ0Rlc2NyaXB0b3JzJyk7XG52YXIgQmVmb3JlID0gU3ltYm9sKCdCZWZvcmUnKTtcbnZhciBBZnRlciA9IFN5bWJvbCgnQWZ0ZXInKTtcbnZhciBOb0dldHRlcnMgPSBTeW1ib2woJ05vR2V0dGVycycpO1xudmFyIFByZXZlbnQgPSBTeW1ib2woJ1ByZXZlbnQnKTtcbnZhciBUeXBlZEFycmF5ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKEludDhBcnJheSk7XG52YXIgU2V0SXRlcmF0b3IgPSBTZXQucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl07XG52YXIgTWFwSXRlcmF0b3IgPSBNYXAucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl07XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbnZhciBpc0V4Y2x1ZGVkID0gb2JqZWN0ID0+IHR5cGVvZiB3aW4uTWFwID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5NYXAgfHwgdHlwZW9mIHdpbi5TZXQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlNldCB8fCB0eXBlb2Ygd2luLk5vZGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLk5vZGUgfHwgdHlwZW9mIHdpbi5XZWFrTWFwID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5XZWFrTWFwIHx8IHR5cGVvZiB3aW4uTG9jYXRpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkxvY2F0aW9uIHx8IHR5cGVvZiB3aW4uU3RvcmFnZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uU3RvcmFnZSB8fCB0eXBlb2Ygd2luLldlYWtTZXQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLldlYWtTZXQgfHwgdHlwZW9mIHdpbi5BcnJheUJ1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uQXJyYXlCdWZmZXIgfHwgdHlwZW9mIHdpbi5Qcm9taXNlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5Qcm9taXNlIHx8IHR5cGVvZiB3aW4uRmlsZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uRmlsZSB8fCB0eXBlb2Ygd2luLkV2ZW50ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5FdmVudCB8fCB0eXBlb2Ygd2luLkN1c3RvbUV2ZW50ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5DdXN0b21FdmVudCB8fCB0eXBlb2Ygd2luLkdhbWVwYWQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkdhbWVwYWQgfHwgdHlwZW9mIHdpbi5SZXNpemVPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUmVzaXplT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5NdXRhdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5NdXRhdGlvbk9ic2VydmVyIHx8IHR5cGVvZiB3aW4uUGVyZm9ybWFuY2VPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUGVyZm9ybWFuY2VPYnNlcnZlciB8fCB0eXBlb2Ygd2luLkludGVyc2VjdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JbnRlcnNlY3Rpb25PYnNlcnZlciB8fCB0eXBlb2Ygd2luLklEQkN1cnNvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCQ3Vyc29yIHx8IHR5cGVvZiB3aW4uSURCQ3Vyc29yV2l0aFZhbHVlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJDdXJzb3JXaXRoVmFsdWUgfHwgdHlwZW9mIHdpbi5JREJEYXRhYmFzZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCRGF0YWJhc2UgfHwgdHlwZW9mIHdpbi5JREJGYWN0b3J5ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJGYWN0b3J5IHx8IHR5cGVvZiB3aW4uSURCSW5kZXggPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkluZGV4IHx8IHR5cGVvZiB3aW4uSURCS2V5UmFuZ2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQktleVJhbmdlIHx8IHR5cGVvZiB3aW4uSURCT2JqZWN0U3RvcmUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQk9iamVjdFN0b3JlIHx8IHR5cGVvZiB3aW4uSURCT3BlbkRCUmVxdWVzdCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCT3BlbkRCUmVxdWVzdCB8fCB0eXBlb2Ygd2luLklEQlJlcXVlc3QgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQlJlcXVlc3QgfHwgdHlwZW9mIHdpbi5JREJUcmFuc2FjdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCVHJhbnNhY3Rpb24gfHwgdHlwZW9mIHdpbi5JREJWZXJzaW9uQ2hhbmdlRXZlbnQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQlZlcnNpb25DaGFuZ2VFdmVudCB8fCB0eXBlb2Ygd2luLkZpbGVTeXN0ZW1GaWxlSGFuZGxlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5GaWxlU3lzdGVtRmlsZUhhbmRsZSB8fCB0eXBlb2Ygd2luLlJUQ1BlZXJDb25uZWN0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5SVENQZWVyQ29ubmVjdGlvbiB8fCB0eXBlb2Ygd2luLlNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24gfHwgdHlwZW9mIHdpbi5XZWJHTFRleHR1cmUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLldlYkdMVGV4dHVyZTtcbmNsYXNzIEJpbmRhYmxlIHtcbiAgc3RhdGljIGlzQmluZGFibGUob2JqZWN0KSB7XG4gICAgaWYgKCFvYmplY3QgfHwgIW9iamVjdFtJc0JpbmRhYmxlXSB8fCAhb2JqZWN0W1ByZXZlbnRdKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RbSXNCaW5kYWJsZV0gPT09IEJpbmRhYmxlO1xuICB9XG4gIHN0YXRpYyBvbkRlY2sob2JqZWN0LCBrZXkpIHtcbiAgICByZXR1cm4gb2JqZWN0W0RlY2tdLmdldChrZXkpIHx8IGZhbHNlO1xuICB9XG4gIHN0YXRpYyByZWYob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdFtSZWZdIHx8IG9iamVjdCB8fCBmYWxzZTtcbiAgfVxuICBzdGF0aWMgbWFrZUJpbmRhYmxlKG9iamVjdCkge1xuICAgIHJldHVybiB0aGlzLm1ha2Uob2JqZWN0KTtcbiAgfVxuICBzdGF0aWMgc2h1Y2sob3JpZ2luYWwsIHNlZW4pIHtcbiAgICBzZWVuID0gc2VlbiB8fCBuZXcgTWFwKCk7XG4gICAgdmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh7fSk7XG4gICAgaWYgKG9yaWdpbmFsIGluc3RhbmNlb2YgVHlwZWRBcnJheSB8fCBvcmlnaW5hbCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICB2YXIgX2Nsb25lID0gb3JpZ2luYWwuc2xpY2UoMCk7XG4gICAgICBzZWVuLnNldChvcmlnaW5hbCwgX2Nsb25lKTtcbiAgICAgIHJldHVybiBfY2xvbmU7XG4gICAgfVxuICAgIHZhciBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMob3JpZ2luYWwpO1xuICAgIGZvciAodmFyIGkgaW4gcHJvcGVydGllcykge1xuICAgICAgdmFyIGlpID0gcHJvcGVydGllc1tpXTtcbiAgICAgIGlmIChpaS5zdWJzdHJpbmcoMCwgMykgPT09ICdfX18nKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIGFscmVhZHlDbG9uZWQgPSBzZWVuLmdldChvcmlnaW5hbFtpaV0pO1xuICAgICAgaWYgKGFscmVhZHlDbG9uZWQpIHtcbiAgICAgICAgY2xvbmVbaWldID0gYWxyZWFkeUNsb25lZDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWxbaWldID09PSBvcmlnaW5hbCkge1xuICAgICAgICBzZWVuLnNldChvcmlnaW5hbFtpaV0sIGNsb25lKTtcbiAgICAgICAgY2xvbmVbaWldID0gY2xvbmU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9yaWdpbmFsW2lpXSAmJiB0eXBlb2Ygb3JpZ2luYWxbaWldID09PSAnb2JqZWN0Jykge1xuICAgICAgICB2YXIgb3JpZ2luYWxQcm9wID0gb3JpZ2luYWxbaWldO1xuICAgICAgICBpZiAoQmluZGFibGUuaXNCaW5kYWJsZShvcmlnaW5hbFtpaV0pKSB7XG4gICAgICAgICAgb3JpZ2luYWxQcm9wID0gb3JpZ2luYWxbaWldW09yaWdpbmFsXTtcbiAgICAgICAgfVxuICAgICAgICBjbG9uZVtpaV0gPSB0aGlzLnNodWNrKG9yaWdpbmFsUHJvcCwgc2Vlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbG9uZVtpaV0gPSBvcmlnaW5hbFtpaV07XG4gICAgICB9XG4gICAgICBzZWVuLnNldChvcmlnaW5hbFtpaV0sIGNsb25lW2lpXSk7XG4gICAgfVxuICAgIGlmIChCaW5kYWJsZS5pc0JpbmRhYmxlKG9yaWdpbmFsKSkge1xuICAgICAgZGVsZXRlIGNsb25lLmJpbmRUbztcbiAgICAgIGRlbGV0ZSBjbG9uZS5pc0JvdW5kO1xuICAgIH1cbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cbiAgc3RhdGljIG1ha2Uob2JqZWN0KSB7XG4gICAgaWYgKG9iamVjdFtQcmV2ZW50XSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKCFvYmplY3QgfHwgIVsnZnVuY3Rpb24nLCAnb2JqZWN0J10uaW5jbHVkZXModHlwZW9mIG9iamVjdCkpIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmIChSZWYgaW4gb2JqZWN0KSB7XG4gICAgICByZXR1cm4gb2JqZWN0W1JlZl07XG4gICAgfVxuICAgIGlmIChvYmplY3RbSXNCaW5kYWJsZV0pIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmIChPYmplY3QuaXNTZWFsZWQob2JqZWN0KSB8fCBPYmplY3QuaXNGcm96ZW4ob2JqZWN0KSB8fCAhT2JqZWN0LmlzRXh0ZW5zaWJsZShvYmplY3QpIHx8IGlzRXhjbHVkZWQob2JqZWN0KSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgSXNCaW5kYWJsZSwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IEJpbmRhYmxlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgUmVmLCB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6IGZhbHNlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgT3JpZ2luYWwsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBvYmplY3RcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBEZWNrLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmluZGluZywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5jcmVhdGUobnVsbClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTdWJCaW5kaW5nLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmluZGluZ0FsbCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEV4ZWN1dGluZywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFdyYXBwaW5nLCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgU3RhY2ssIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJlZm9yZSwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEFmdGVyLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgV3JhcHBlZCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhuZXcgTWFwKCkpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgVW53cmFwcGVkLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG5ldyBNYXAoKSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBEZXNjcmlwdG9ycywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhuZXcgTWFwKCkpXG4gICAgfSk7XG4gICAgdmFyIGJpbmRUbyA9IChwcm9wZXJ0eSwgY2FsbGJhY2sgPSBudWxsLCBvcHRpb25zID0ge30pID0+IHtcbiAgICAgIHZhciBiaW5kVG9BbGwgPSBmYWxzZTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BlcnR5KSkge1xuICAgICAgICB2YXIgZGViaW5kZXJzID0gcHJvcGVydHkubWFwKHAgPT4gYmluZFRvKHAsIGNhbGxiYWNrLCBvcHRpb25zKSk7XG4gICAgICAgIHJldHVybiAoKSA9PiBkZWJpbmRlcnMuZm9yRWFjaChkID0+IGQoKSk7XG4gICAgICB9XG4gICAgICBpZiAocHJvcGVydHkgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICBvcHRpb25zID0gY2FsbGJhY2sgfHwge307XG4gICAgICAgIGNhbGxiYWNrID0gcHJvcGVydHk7XG4gICAgICAgIGJpbmRUb0FsbCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5kZWxheSA+PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwRGVsYXlDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy5kZWxheSk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy50aHJvdHRsZSA+PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwVGhyb3R0bGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy50aHJvdHRsZSk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy53YWl0ID49IDApIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBXYWl0Q2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMud2FpdCk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5mcmFtZSkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcEZyYW1lQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMuZnJhbWUpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuaWRsZSkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcElkbGVDYWxsYmFjayhjYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAoYmluZFRvQWxsKSB7XG4gICAgICAgIG9iamVjdFtCaW5kaW5nQWxsXS5hZGQoY2FsbGJhY2spO1xuICAgICAgICBpZiAoISgnbm93JyBpbiBvcHRpb25zKSB8fCBvcHRpb25zLm5vdykge1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhvYmplY3RbaV0sIGksIG9iamVjdCwgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIG9iamVjdFtCaW5kaW5nQWxsXS5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKCFvYmplY3RbQmluZGluZ11bcHJvcGVydHldKSB7XG4gICAgICAgIG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0gPSBuZXcgU2V0KCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGxldCBiaW5kSW5kZXggPSBvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmxlbmd0aDtcblxuICAgICAgaWYgKG9wdGlvbnMuY2hpbGRyZW4pIHtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICB2YXIgdiA9IGFyZ3NbMF07XG4gICAgICAgICAgdmFyIHN1YkRlYmluZCA9IG9iamVjdFtTdWJCaW5kaW5nXS5nZXQob3JpZ2luYWwpO1xuICAgICAgICAgIGlmIChzdWJEZWJpbmQpIHtcbiAgICAgICAgICAgIG9iamVjdFtTdWJCaW5kaW5nXS5kZWxldGUob3JpZ2luYWwpO1xuICAgICAgICAgICAgc3ViRGViaW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsKC4uLmFyZ3MpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgdnYgPSBCaW5kYWJsZS5tYWtlKHYpO1xuICAgICAgICAgIGlmIChCaW5kYWJsZS5pc0JpbmRhYmxlKHZ2KSkge1xuICAgICAgICAgICAgb2JqZWN0W1N1YkJpbmRpbmddLnNldChvcmlnaW5hbCwgdnYuYmluZFRvKCguLi5zdWJBcmdzKSA9PiBvcmlnaW5hbCguLi5hcmdzLCAuLi5zdWJBcmdzKSwgT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgICAgICAgICBjaGlsZHJlbjogZmFsc2VcbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9yaWdpbmFsKC4uLmFyZ3MpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5hZGQoY2FsbGJhY2spO1xuICAgICAgaWYgKCEoJ25vdycgaW4gb3B0aW9ucykgfHwgb3B0aW9ucy5ub3cpIHtcbiAgICAgICAgY2FsbGJhY2sob2JqZWN0W3Byb3BlcnR5XSwgcHJvcGVydHksIG9iamVjdCwgZmFsc2UpO1xuICAgICAgfVxuICAgICAgdmFyIGRlYmluZGVyID0gKCkgPT4ge1xuICAgICAgICB2YXIgc3ViRGViaW5kID0gb2JqZWN0W1N1YkJpbmRpbmddLmdldChjYWxsYmFjayk7XG4gICAgICAgIGlmIChzdWJEZWJpbmQpIHtcbiAgICAgICAgICBvYmplY3RbU3ViQmluZGluZ10uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgICBzdWJEZWJpbmQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmhhcyhjYWxsYmFjaykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgfTtcbiAgICAgIGlmIChvcHRpb25zLnJlbW92ZVdpdGggJiYgb3B0aW9ucy5yZW1vdmVXaXRoIGluc3RhbmNlb2YgVmlldykge1xuICAgICAgICBvcHRpb25zLnJlbW92ZVdpdGgub25SZW1vdmUoKCkgPT4gZGViaW5kZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlYmluZGVyO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ2JpbmRUbycsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBiaW5kVG9cbiAgICB9KTtcbiAgICB2YXIgX19fYmVmb3JlID0gY2FsbGJhY2sgPT4ge1xuICAgICAgb2JqZWN0W0JlZm9yZV0uYWRkKGNhbGxiYWNrKTtcbiAgICAgIHJldHVybiAoKSA9PiBvYmplY3RbQmVmb3JlXS5kZWxldGUoY2FsbGJhY2spO1xuICAgIH07XG4gICAgdmFyIF9fX2FmdGVyID0gY2FsbGJhY2sgPT4ge1xuICAgICAgb2JqZWN0W0FmdGVyXS5hZGQoY2FsbGJhY2spO1xuICAgICAgcmV0dXJuICgpID0+IG9iamVjdFtBZnRlcl0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJpbmRDaGFpbiwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IChwYXRoLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICAgIHZhciBub2RlID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgdmFyIHN1YlBhcnRzID0gcGFydHMuc2xpY2UoMCk7XG4gICAgICAgIHZhciBkZWJpbmQgPSBbXTtcbiAgICAgICAgZGViaW5kLnB1c2gob2JqZWN0LmJpbmRUbyhub2RlLCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIHZhciByZXN0ID0gc3ViUGFydHMuam9pbignLicpO1xuICAgICAgICAgIGlmIChzdWJQYXJ0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHYsIGssIHQsIGQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2ID0gdFtrXSA9IHRoaXMubWFrZSh7fSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlYmluZCA9IGRlYmluZC5jb25jYXQodltCaW5kQ2hhaW5dKHJlc3QsIGNhbGxiYWNrKSk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgcmV0dXJuICgpID0+IGRlYmluZC5mb3JFYWNoKHggPT4geCgpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnX19fYmVmb3JlJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IF9fX2JlZm9yZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdfX19hZnRlcicsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBfX19hZnRlclxuICAgIH0pO1xuICAgIHZhciBpc0JvdW5kID0gKCkgPT4ge1xuICAgICAgaWYgKG9iamVjdFtCaW5kaW5nQWxsXS5zaXplKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgY2FsbGJhY2tzIG9mIE9iamVjdC52YWx1ZXMob2JqZWN0W0JpbmRpbmddKSkge1xuICAgICAgICBpZiAoY2FsbGJhY2tzLnNpemUpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3IobGV0IGNhbGxiYWNrIG9mIGNhbGxiYWNrcylcbiAgICAgICAgLy8ge1xuICAgICAgICAvLyBcdGlmKGNhbGxiYWNrKVxuICAgICAgICAvLyBcdHtcbiAgICAgICAgLy8gXHRcdHJldHVybiB0cnVlO1xuICAgICAgICAvLyBcdH1cbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ2lzQm91bmQnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogaXNCb3VuZFxuICAgIH0pO1xuICAgIGZvciAodmFyIGkgaW4gb2JqZWN0KSB7XG4gICAgICAvLyBjb25zdCBkZXNjcmlwdG9ycyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iamVjdCk7XG5cbiAgICAgIGlmICghb2JqZWN0W2ldIHx8IHR5cGVvZiBvYmplY3RbaV0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9iamVjdFtpXVtSZWZdIHx8IG9iamVjdFtpXSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUob2JqZWN0W2ldKSB8fCBPYmplY3QuaXNTZWFsZWQob2JqZWN0W2ldKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNFeGNsdWRlZChvYmplY3RbaV0pKSB7XG4gICAgICAgIG9iamVjdFtpXSA9IEJpbmRhYmxlLm1ha2Uob2JqZWN0W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGRlc2NyaXB0b3JzID0gb2JqZWN0W0Rlc2NyaXB0b3JzXTtcbiAgICB2YXIgd3JhcHBlZCA9IG9iamVjdFtXcmFwcGVkXTtcbiAgICB2YXIgc3RhY2sgPSBvYmplY3RbU3RhY2tdO1xuICAgIHZhciBzZXQgPSAodGFyZ2V0LCBrZXksIHZhbHVlKSA9PiB7XG4gICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICB2YWx1ZSA9IEJpbmRhYmxlLm1ha2UodmFsdWUpO1xuICAgICAgICBpZiAodGFyZ2V0W2tleV0gPT09IHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3cmFwcGVkLmhhcyhrZXkpKSB7XG4gICAgICAgIHdyYXBwZWQuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgICB2YXIgb25EZWNrID0gb2JqZWN0W0RlY2tdO1xuICAgICAgdmFyIGlzT25EZWNrID0gb25EZWNrLmhhcyhrZXkpO1xuICAgICAgdmFyIHZhbE9uRGVjayA9IGlzT25EZWNrICYmIG9uRGVjay5nZXQoa2V5KTtcblxuICAgICAgLy8gaWYob25EZWNrW2tleV0gIT09IHVuZGVmaW5lZCAmJiBvbkRlY2tba2V5XSA9PT0gdmFsdWUpXG4gICAgICBpZiAoaXNPbkRlY2sgJiYgdmFsT25EZWNrID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkuc2xpY2UgJiYga2V5LnNsaWNlKC0zKSA9PT0gJ19fXycpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodGFyZ2V0W2tleV0gPT09IHZhbHVlIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgaXNOYU4odmFsT25EZWNrKSAmJiBpc05hTih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBvbkRlY2suc2V0KGtleSwgdmFsdWUpO1xuICAgICAgZm9yICh2YXIgY2FsbGJhY2sgb2Ygb2JqZWN0W0JpbmRpbmdBbGxdKSB7XG4gICAgICAgIGNhbGxiYWNrKHZhbHVlLCBrZXksIHRhcmdldCwgZmFsc2UpO1xuICAgICAgfVxuICAgICAgaWYgKGtleSBpbiBvYmplY3RbQmluZGluZ10pIHtcbiAgICAgICAgZm9yICh2YXIgX2NhbGxiYWNrIG9mIG9iamVjdFtCaW5kaW5nXVtrZXldKSB7XG4gICAgICAgICAgX2NhbGxiYWNrKHZhbHVlLCBrZXksIHRhcmdldCwgZmFsc2UsIHRhcmdldFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb25EZWNrLmRlbGV0ZShrZXkpO1xuICAgICAgdmFyIGV4Y2x1ZGVkID0gd2luLkZpbGUgJiYgdGFyZ2V0IGluc3RhbmNlb2Ygd2luLkZpbGUgJiYga2V5ID09ICdsYXN0TW9kaWZpZWREYXRlJztcbiAgICAgIGlmICghZXhjbHVkZWQpIHtcbiAgICAgICAgUmVmbGVjdC5zZXQodGFyZ2V0LCBrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkgJiYgb2JqZWN0W0JpbmRpbmddWydsZW5ndGgnXSkge1xuICAgICAgICBmb3IgKHZhciBfaSBpbiBvYmplY3RbQmluZGluZ11bJ2xlbmd0aCddKSB7XG4gICAgICAgICAgdmFyIF9jYWxsYmFjazIgPSBvYmplY3RbQmluZGluZ11bJ2xlbmd0aCddW19pXTtcbiAgICAgICAgICBfY2FsbGJhY2syKHRhcmdldC5sZW5ndGgsICdsZW5ndGgnLCB0YXJnZXQsIGZhbHNlLCB0YXJnZXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICB2YXIgZGVsZXRlUHJvcGVydHkgPSAodGFyZ2V0LCBrZXkpID0+IHtcbiAgICAgIHZhciBvbkRlY2sgPSBvYmplY3RbRGVja107XG4gICAgICB2YXIgaXNPbkRlY2sgPSBvbkRlY2suaGFzKGtleSk7XG4gICAgICBpZiAoaXNPbkRlY2spIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoIShrZXkgaW4gdGFyZ2V0KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChkZXNjcmlwdG9ycy5oYXMoa2V5KSkge1xuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JzLmdldChrZXkpO1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5jb25maWd1cmFibGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZGVzY3JpcHRvcnMuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgICBvbkRlY2suc2V0KGtleSwgbnVsbCk7XG4gICAgICBpZiAod3JhcHBlZC5oYXMoa2V5KSkge1xuICAgICAgICB3cmFwcGVkLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgY2FsbGJhY2sgb2Ygb2JqZWN0W0JpbmRpbmdBbGxdKSB7XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwga2V5LCB0YXJnZXQsIHRydWUsIHRhcmdldFtrZXldKTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgaW4gb2JqZWN0W0JpbmRpbmddKSB7XG4gICAgICAgIGZvciAodmFyIGJpbmRpbmcgb2Ygb2JqZWN0W0JpbmRpbmddW2tleV0pIHtcbiAgICAgICAgICBiaW5kaW5nKHVuZGVmaW5lZCwga2V5LCB0YXJnZXQsIHRydWUsIHRhcmdldFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIGtleSk7XG4gICAgICBvbkRlY2suZGVsZXRlKGtleSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3QgPSAodGFyZ2V0LCBhcmdzKSA9PiB7XG4gICAgICB2YXIga2V5ID0gJ2NvbnN0cnVjdG9yJztcbiAgICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIHRhcmdldFtCZWZvcmVdKSB7XG4gICAgICAgIGNhbGxiYWNrKHRhcmdldCwga2V5LCBvYmplY3RbU3RhY2tdLCB1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgdmFyIGluc3RhbmNlID0gQmluZGFibGUubWFrZShuZXcgdGFyZ2V0W09yaWdpbmFsXSguLi5hcmdzKSk7XG4gICAgICBmb3IgKHZhciBfY2FsbGJhY2szIG9mIHRhcmdldFtBZnRlcl0pIHtcbiAgICAgICAgX2NhbGxiYWNrMyh0YXJnZXQsIGtleSwgb2JqZWN0W1N0YWNrXSwgaW5zdGFuY2UsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH07XG4gICAgdmFyIGdldCA9ICh0YXJnZXQsIGtleSkgPT4ge1xuICAgICAgaWYgKHdyYXBwZWQuaGFzKGtleSkpIHtcbiAgICAgICAgcmV0dXJuIHdyYXBwZWQuZ2V0KGtleSk7XG4gICAgICB9XG4gICAgICBpZiAoa2V5ID09PSBSZWYgfHwga2V5ID09PSBPcmlnaW5hbCB8fCBrZXkgPT09ICdhcHBseScgfHwga2V5ID09PSAnaXNCb3VuZCcgfHwga2V5ID09PSAnYmluZFRvJyB8fCBrZXkgPT09ICdfX3Byb3RvX18nIHx8IGtleSA9PT0gJ2NvbnN0cnVjdG9yJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgICB2YXIgZGVzY3JpcHRvcjtcbiAgICAgIGlmIChkZXNjcmlwdG9ycy5oYXMoa2V5KSkge1xuICAgICAgICBkZXNjcmlwdG9yID0gZGVzY3JpcHRvcnMuZ2V0KGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIGtleSk7XG4gICAgICAgIGRlc2NyaXB0b3JzLnNldChrZXksIGRlc2NyaXB0b3IpO1xuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgIH1cbiAgICAgIGlmIChPbkFsbEdldCBpbiBvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtPbkFsbEdldF0oa2V5KTtcbiAgICAgIH1cbiAgICAgIGlmIChPbkdldCBpbiBvYmplY3QgJiYgIShrZXkgaW4gb2JqZWN0KSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W09uR2V0XShrZXkpO1xuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgIHdyYXBwZWQuc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG9iamVjdFtrZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGlmIChOYW1lcyBpbiBvYmplY3Rba2V5XSkge1xuICAgICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBvYmplY3RbVW53cmFwcGVkXS5zZXQoa2V5LCBvYmplY3Rba2V5XSk7XG4gICAgICAgIHZhciBwcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTtcbiAgICAgICAgdmFyIGlzTWV0aG9kID0gcHJvdG90eXBlW2tleV0gPT09IG9iamVjdFtrZXldO1xuICAgICAgICB2YXIgb2JqUmVmID1cbiAgICAgICAgLy8gKHR5cGVvZiBQcm9taXNlID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBQcm9taXNlKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFN0b3JhZ2UgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFN0b3JhZ2UpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgTWFwID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgTWFwKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFNldCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFNldClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBXZWFrTWFwID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBXZWFrTWFwKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFdlYWtTZXQgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFdlYWtTZXQpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgQXJyYXlCdWZmZXIgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgUmVzaXplT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgUmVzaXplT2JzZXJ2ZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgTXV0YXRpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgTXV0YXRpb25PYnNlcnZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBQZXJmb3JtYW5jZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBQZXJmb3JtYW5jZU9ic2VydmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIEludGVyc2VjdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIEludGVyc2VjdGlvbk9ic2VydmVyKVxuICAgICAgICBpc0V4Y2x1ZGVkKG9iamVjdCkgfHwgdHlwZW9mIG9iamVjdFtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nICYmIGtleSA9PT0gJ25leHQnIHx8IHR5cGVvZiBUeXBlZEFycmF5ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIFR5cGVkQXJyYXkgfHwgdHlwZW9mIEV2ZW50VGFyZ2V0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIEV2ZW50VGFyZ2V0IHx8IHR5cGVvZiBEYXRlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIERhdGUgfHwgdHlwZW9mIE1hcEl0ZXJhdG9yID09PSAnZnVuY3Rpb24nICYmIG9iamVjdC5wcm90b3R5cGUgPT09IE1hcEl0ZXJhdG9yIHx8IHR5cGVvZiBTZXRJdGVyYXRvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QucHJvdG90eXBlID09PSBTZXRJdGVyYXRvciA/IG9iamVjdCA6IG9iamVjdFtSZWZdO1xuICAgICAgICB2YXIgd3JhcHBlZE1ldGhvZCA9IGZ1bmN0aW9uICguLi5wcm92aWRlZEFyZ3MpIHtcbiAgICAgICAgICBvYmplY3RbRXhlY3V0aW5nXSA9IGtleTtcbiAgICAgICAgICBzdGFjay51bnNoaWZ0KGtleSk7XG4gICAgICAgICAgZm9yICh2YXIgYmVmb3JlQ2FsbGJhY2sgb2Ygb2JqZWN0W0JlZm9yZV0pIHtcbiAgICAgICAgICAgIGJlZm9yZUNhbGxiYWNrKG9iamVjdCwga2V5LCBzdGFjaywgb2JqZWN0LCBwcm92aWRlZEFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmV0O1xuICAgICAgICAgIGlmIChuZXcudGFyZ2V0KSB7XG4gICAgICAgICAgICByZXQgPSBuZXcgKG9iamVjdFtVbndyYXBwZWRdLmdldChrZXkpKSguLi5wcm92aWRlZEFyZ3MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IG9iamVjdFtVbndyYXBwZWRdLmdldChrZXkpO1xuICAgICAgICAgICAgaWYgKGlzTWV0aG9kKSB7XG4gICAgICAgICAgICAgIHJldCA9IGZ1bmMuYXBwbHkob2JqUmVmIHx8IG9iamVjdCwgcHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldCA9IGZ1bmMoLi4ucHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yICh2YXIgYWZ0ZXJDYWxsYmFjayBvZiBvYmplY3RbQWZ0ZXJdKSB7XG4gICAgICAgICAgICBhZnRlckNhbGxiYWNrKG9iamVjdCwga2V5LCBzdGFjaywgb2JqZWN0LCBwcm92aWRlZEFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvYmplY3RbRXhlY3V0aW5nXSA9IG51bGw7XG4gICAgICAgICAgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9O1xuICAgICAgICB3cmFwcGVkTWV0aG9kW09uQWxsR2V0XSA9IF9rZXkgPT4gb2JqZWN0W2tleV1bX2tleV07XG4gICAgICAgIHZhciByZXN1bHQgPSBCaW5kYWJsZS5tYWtlKHdyYXBwZWRNZXRob2QpO1xuICAgICAgICB3cmFwcGVkLnNldChrZXksIHJlc3VsdCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgfTtcbiAgICB2YXIgZ2V0UHJvdG90eXBlT2YgPSB0YXJnZXQgPT4ge1xuICAgICAgaWYgKEdldFByb3RvIGluIG9iamVjdCkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W0dldFByb3RvXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZWZsZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCk7XG4gICAgfTtcbiAgICB2YXIgaGFuZGxlckRlZiA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgaGFuZGxlckRlZi5zZXQgPSBzZXQ7XG4gICAgaGFuZGxlckRlZi5jb25zdHJ1Y3QgPSBjb25zdHJ1Y3Q7XG4gICAgaGFuZGxlckRlZi5kZWxldGVQcm9wZXJ0eSA9IGRlbGV0ZVByb3BlcnR5O1xuICAgIGlmICghb2JqZWN0W05vR2V0dGVyc10pIHtcbiAgICAgIGhhbmRsZXJEZWYuZ2V0UHJvdG90eXBlT2YgPSBnZXRQcm90b3R5cGVPZjtcbiAgICAgIGhhbmRsZXJEZWYuZ2V0ID0gZ2V0O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBSZWYsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgUHJveHkob2JqZWN0LCBoYW5kbGVyRGVmKVxuICAgIH0pO1xuICAgIHJldHVybiBvYmplY3RbUmVmXTtcbiAgfVxuICBzdGF0aWMgY2xlYXJCaW5kaW5ncyhvYmplY3QpIHtcbiAgICB2YXIgbWFwcyA9IGZ1bmMgPT4gKC4uLm9zKSA9PiBvcy5tYXAoZnVuYyk7XG4gICAgdmFyIGNsZWFyT2JqID0gbyA9PiBPYmplY3Qua2V5cyhvKS5tYXAoayA9PiBkZWxldGUgb1trXSk7XG4gICAgdmFyIGNsZWFyT2JqcyA9IG1hcHMoY2xlYXJPYmopO1xuICAgIG9iamVjdFtCaW5kaW5nQWxsXS5jbGVhcigpO1xuICAgIGNsZWFyT2JqcyhvYmplY3RbV3JhcHBlZF0sIG9iamVjdFtCaW5kaW5nXSwgb2JqZWN0W0FmdGVyXSwgb2JqZWN0W0JlZm9yZV0pO1xuICB9XG4gIHN0YXRpYyByZXNvbHZlKG9iamVjdCwgcGF0aCwgb3duZXIgPSBmYWxzZSkge1xuICAgIHZhciBub2RlO1xuICAgIHZhciBwYXRoUGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgdmFyIHRvcCA9IHBhdGhQYXJ0c1swXTtcbiAgICB3aGlsZSAocGF0aFBhcnRzLmxlbmd0aCkge1xuICAgICAgaWYgKG93bmVyICYmIHBhdGhQYXJ0cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgdmFyIG9iaiA9IHRoaXMubWFrZShvYmplY3QpO1xuICAgICAgICByZXR1cm4gW29iaiwgcGF0aFBhcnRzLnNoaWZ0KCksIHRvcF07XG4gICAgICB9XG4gICAgICBub2RlID0gcGF0aFBhcnRzLnNoaWZ0KCk7XG4gICAgICBpZiAoIShub2RlIGluIG9iamVjdCkgfHwgIW9iamVjdFtub2RlXSB8fCAhKHR5cGVvZiBvYmplY3Rbbm9kZV0gPT09ICdvYmplY3QnKSkge1xuICAgICAgICBvYmplY3Rbbm9kZV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgfVxuICAgICAgb2JqZWN0ID0gdGhpcy5tYWtlKG9iamVjdFtub2RlXSk7XG4gICAgfVxuICAgIHJldHVybiBbdGhpcy5tYWtlKG9iamVjdCksIG5vZGUsIHRvcF07XG4gIH1cbiAgc3RhdGljIHdyYXBEZWxheUNhbGxiYWNrKGNhbGxiYWNrLCBkZWxheSkge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSwgZGVsYXkpO1xuICB9XG4gIHN0YXRpYyB3cmFwVGhyb3R0bGVDYWxsYmFjayhjYWxsYmFjaywgdGhyb3R0bGUpIHtcbiAgICB0aGlzLnRocm90dGxlcy5zZXQoY2FsbGJhY2ssIGZhbHNlKTtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICh0aGlzLnRocm90dGxlcy5nZXQoY2FsbGJhY2ssIHRydWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgICAgdGhpcy50aHJvdHRsZXMuc2V0KGNhbGxiYWNrLCB0cnVlKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnRocm90dGxlcy5zZXQoY2FsbGJhY2ssIGZhbHNlKTtcbiAgICAgIH0sIHRocm90dGxlKTtcbiAgICB9O1xuICB9XG4gIHN0YXRpYyB3cmFwV2FpdENhbGxiYWNrKGNhbGxiYWNrLCB3YWl0KSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICB2YXIgd2FpdGVyO1xuICAgICAgaWYgKHdhaXRlciA9IHRoaXMud2FpdGVycy5nZXQoY2FsbGJhY2spKSB7XG4gICAgICAgIHRoaXMud2FpdGVycy5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICBjbGVhclRpbWVvdXQod2FpdGVyKTtcbiAgICAgIH1cbiAgICAgIHdhaXRlciA9IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soLi4uYXJncyksIHdhaXQpO1xuICAgICAgdGhpcy53YWl0ZXJzLnNldChjYWxsYmFjaywgd2FpdGVyKTtcbiAgICB9O1xuICB9XG4gIHN0YXRpYyB3cmFwRnJhbWVDYWxsYmFjayhjYWxsYmFjaywgZnJhbWVzKSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gY2FsbGJhY2soLi4uYXJncykpO1xuICAgIH07XG4gIH1cbiAgc3RhdGljIHdyYXBJZGxlQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIC8vIENvbXBhdGliaWxpdHkgZm9yIFNhZmFyaSAwOC8yMDIwXG4gICAgICB2YXIgcmVxID0gd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2sgfHwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuICAgICAgcmVxKCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpKTtcbiAgICB9O1xuICB9XG59XG5leHBvcnRzLkJpbmRhYmxlID0gQmluZGFibGU7XG5fZGVmaW5lUHJvcGVydHkoQmluZGFibGUsIFwid2FpdGVyc1wiLCBuZXcgV2Vha01hcCgpKTtcbl9kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgXCJ0aHJvdHRsZXNcIiwgbmV3IFdlYWtNYXAoKSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdQcmV2ZW50Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogUHJldmVudFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdPbkdldCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE9uR2V0XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ05vR2V0dGVycycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE5vR2V0dGVyc1xufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdHZXRQcm90bycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEdldFByb3RvXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ09uQWxsR2V0Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogT25BbGxHZXRcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkNhY2hlID0gdm9pZCAwO1xuY2xhc3MgQ2FjaGUge1xuICBzdGF0aWMgc3RvcmUoa2V5LCB2YWx1ZSwgZXhwaXJ5LCBidWNrZXQgPSAnc3RhbmRhcmQnKSB7XG4gICAgdmFyIGV4cGlyYXRpb24gPSAwO1xuICAgIGlmIChleHBpcnkpIHtcbiAgICAgIGV4cGlyYXRpb24gPSBleHBpcnkgKiAxMDAwICsgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5idWNrZXRzKSB7XG4gICAgICB0aGlzLmJ1Y2tldHMgPSBuZXcgTWFwKCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5idWNrZXRzLmhhcyhidWNrZXQpKSB7XG4gICAgICB0aGlzLmJ1Y2tldHMuc2V0KGJ1Y2tldCwgbmV3IE1hcCgpKTtcbiAgICB9XG4gICAgdmFyIGV2ZW50RW5kID0gbmV3IEN1c3RvbUV2ZW50KCdjdkNhY2hlU3RvcmUnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGtleSxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIGV4cGlyeSxcbiAgICAgICAgYnVja2V0XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRFbmQpKSB7XG4gICAgICB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuc2V0KGtleSwge1xuICAgICAgICB2YWx1ZSxcbiAgICAgICAgZXhwaXJhdGlvblxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBsb2FkKGtleSwgZGVmYXVsdHZhbHVlID0gZmFsc2UsIGJ1Y2tldCA9ICdzdGFuZGFyZCcpIHtcbiAgICB2YXIgZXZlbnRFbmQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Q2FjaGVMb2FkJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBrZXksXG4gICAgICAgIGRlZmF1bHR2YWx1ZSxcbiAgICAgICAgYnVja2V0XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50RW5kKSkge1xuICAgICAgcmV0dXJuIGRlZmF1bHR2YWx1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuYnVja2V0cyAmJiB0aGlzLmJ1Y2tldHMuaGFzKGJ1Y2tldCkgJiYgdGhpcy5idWNrZXRzLmdldChidWNrZXQpLmhhcyhrZXkpKSB7XG4gICAgICB2YXIgZW50cnkgPSB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuZ2V0KGtleSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmJ1Y2tldFtidWNrZXRdW2tleV0uZXhwaXJhdGlvbiwgKG5ldyBEYXRlKS5nZXRUaW1lKCkpO1xuICAgICAgaWYgKGVudHJ5LmV4cGlyYXRpb24gPT09IDAgfHwgZW50cnkuZXhwaXJhdGlvbiA+IG5ldyBEYXRlKCkuZ2V0VGltZSgpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuZ2V0KGtleSkudmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZWZhdWx0dmFsdWU7XG4gIH1cbn1cbmV4cG9ydHMuQ2FjaGUgPSBDYWNoZTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0NvbmZpZy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQ29uZmlnID0gdm9pZCAwO1xudmFyIEFwcENvbmZpZyA9IHt9O1xudmFyIF9yZXF1aXJlID0gcmVxdWlyZTtcbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xudHJ5IHtcbiAgQXBwQ29uZmlnID0gX3JlcXVpcmUoJy9Db25maWcnKS5Db25maWc7XG59IGNhdGNoIChlcnJvcikge1xuICB3aW4uZGV2TW9kZSA9PT0gdHJ1ZSAmJiBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgQXBwQ29uZmlnID0ge307XG59XG5jbGFzcyBDb25maWcge1xuICBzdGF0aWMgZ2V0KG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWdzW25hbWVdO1xuICB9XG4gIHN0YXRpYyBzZXQobmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLmNvbmZpZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBzdGF0aWMgZHVtcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWdzO1xuICB9XG4gIHN0YXRpYyBpbml0KC4uLmNvbmZpZ3MpIHtcbiAgICBmb3IgKHZhciBpIGluIGNvbmZpZ3MpIHtcbiAgICAgIHZhciBjb25maWcgPSBjb25maWdzW2ldO1xuICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIG5hbWUgaW4gY29uZmlnKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGNvbmZpZ1tuYW1lXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuZXhwb3J0cy5Db25maWcgPSBDb25maWc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQ29uZmlnLCAnY29uZmlncycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEFwcENvbmZpZ1xufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Eb20uanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkRvbSA9IHZvaWQgMDtcbnZhciB0cmF2ZXJzYWxzID0gMDtcbmNsYXNzIERvbSB7XG4gIHN0YXRpYyBtYXBUYWdzKGRvYywgc2VsZWN0b3IsIGNhbGxiYWNrLCBzdGFydE5vZGUsIGVuZE5vZGUpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIHN0YXJ0ZWQgPSB0cnVlO1xuICAgIGlmIChzdGFydE5vZGUpIHtcbiAgICAgIHN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGVuZGVkID0gZmFsc2U7XG4gICAgdmFyIHtcbiAgICAgIE5vZGUsXG4gICAgICBFbGVtZW50LFxuICAgICAgTm9kZUZpbHRlcixcbiAgICAgIGRvY3VtZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHZhciB0cmVlV2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihkb2MsIE5vZGVGaWx0ZXIuU0hPV19FTEVNRU5UIHwgTm9kZUZpbHRlci5TSE9XX1RFWFQsIHtcbiAgICAgIGFjY2VwdE5vZGU6IChub2RlLCB3YWxrZXIpID0+IHtcbiAgICAgICAgaWYgKCFzdGFydGVkKSB7XG4gICAgICAgICAgaWYgKG5vZGUgPT09IHN0YXJ0Tm9kZSkge1xuICAgICAgICAgICAgc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5kTm9kZSAmJiBub2RlID09PSBlbmROb2RlKSB7XG4gICAgICAgICAgZW5kZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmRlZCkge1xuICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKG5vZGUubWF0Y2hlcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX0FDQ0VQVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX1NLSVA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX0FDQ0VQVDtcbiAgICAgIH1cbiAgICB9LCBmYWxzZSk7XG4gICAgdmFyIHRyYXZlcnNhbCA9IHRyYXZlcnNhbHMrKztcbiAgICB3aGlsZSAodHJlZVdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICByZXN1bHQucHVzaChjYWxsYmFjayh0cmVlV2Fsa2VyLmN1cnJlbnROb2RlLCB0cmVlV2Fsa2VyKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgc3RhdGljIGRpc3BhdGNoRXZlbnQoZG9jLCBldmVudCkge1xuICAgIGRvYy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB0aGlzLm1hcFRhZ3MoZG9jLCBmYWxzZSwgbm9kZSA9PiB7XG4gICAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIH0pO1xuICB9XG59XG5leHBvcnRzLkRvbSA9IERvbTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL01peGluLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5NaXhpbiA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBDb25zdHJ1Y3RvciA9IFN5bWJvbCgnY29uc3RydWN0b3InKTtcbnZhciBNaXhpbkxpc3QgPSBTeW1ib2woJ21peGluTGlzdCcpO1xuY2xhc3MgTWl4aW4ge1xuICBzdGF0aWMgZnJvbShiYXNlQ2xhc3MsIC4uLm1peGlucykge1xuICAgIHZhciBuZXdDbGFzcyA9IGNsYXNzIGV4dGVuZHMgYmFzZUNsYXNzIHtcbiAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3MpIHtcbiAgICAgICAgdmFyIGluc3RhbmNlID0gYmFzZUNsYXNzLmNvbnN0cnVjdG9yID8gc3VwZXIoLi4uYXJncykgOiBudWxsO1xuICAgICAgICBmb3IgKHZhciBtaXhpbiBvZiBtaXhpbnMpIHtcbiAgICAgICAgICBpZiAobWl4aW5bTWl4aW4uQ29uc3RydWN0b3JdKSB7XG4gICAgICAgICAgICBtaXhpbltNaXhpbi5Db25zdHJ1Y3Rvcl0uYXBwbHkodGhpcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN3aXRjaCAodHlwZW9mIG1peGluKSB7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgIE1peGluLm1peENsYXNzKG1peGluLCBuZXdDbGFzcyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgTWl4aW4ubWl4T2JqZWN0KG1peGluLCB0aGlzKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBuZXdDbGFzcztcbiAgfVxuICBzdGF0aWMgbWFrZSguLi5jbGFzc2VzKSB7XG4gICAgdmFyIGJhc2UgPSBjbGFzc2VzLnBvcCgpO1xuICAgIHJldHVybiBNaXhpbi50byhiYXNlLCAuLi5jbGFzc2VzKTtcbiAgfVxuICBzdGF0aWMgdG8oYmFzZSwgLi4ubWl4aW5zKSB7XG4gICAgdmFyIGRlc2NyaXB0b3JzID0ge307XG4gICAgbWl4aW5zLm1hcChtaXhpbiA9PiB7XG4gICAgICBzd2l0Y2ggKHR5cGVvZiBtaXhpbikge1xuICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oZGVzY3JpcHRvcnMsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG1peGluKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGRlc2NyaXB0b3JzLCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhtaXhpbi5wcm90b3R5cGUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSBkZXNjcmlwdG9ycy5jb25zdHJ1Y3RvcjtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGJhc2UucHJvdG90eXBlLCBkZXNjcmlwdG9ycyk7XG4gICAgfSk7XG4gIH1cbiAgc3RhdGljIHdpdGgoLi4ubWl4aW5zKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbShjbGFzcyB7XG4gICAgICBjb25zdHJ1Y3RvcigpIHt9XG4gICAgfSwgLi4ubWl4aW5zKTtcbiAgfVxuICBzdGF0aWMgbWl4T2JqZWN0KG1peGluLCBpbnN0YW5jZSkge1xuICAgIGZvciAodmFyIGZ1bmMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobWl4aW4pKSB7XG4gICAgICBpZiAodHlwZW9mIG1peGluW2Z1bmNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGluc3RhbmNlW2Z1bmNdID0gbWl4aW5bZnVuY10uYmluZChpbnN0YW5jZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW5zdGFuY2VbZnVuY10gPSBtaXhpbltmdW5jXTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2Z1bmMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhtaXhpbikpIHtcbiAgICAgIGlmICh0eXBlb2YgbWl4aW5bX2Z1bmNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGluc3RhbmNlW19mdW5jXSA9IG1peGluW19mdW5jXS5iaW5kKGluc3RhbmNlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnN0YW5jZVtfZnVuY10gPSBtaXhpbltfZnVuY107XG4gICAgfVxuICB9XG4gIHN0YXRpYyBtaXhDbGFzcyhjbHMsIG5ld0NsYXNzKSB7XG4gICAgZm9yICh2YXIgZnVuYyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjbHMucHJvdG90eXBlKSkge1xuICAgICAgaWYgKFsnbmFtZScsICdwcm90b3R5cGUnLCAnbGVuZ3RoJ10uaW5jbHVkZXMoZnVuYykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobmV3Q2xhc3MsIGZ1bmMpO1xuICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGNsc1tmdW5jXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBuZXdDbGFzcy5wcm90b3R5cGVbZnVuY10gPSBjbHMucHJvdG90eXBlW2Z1bmNdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtmdW5jXSA9IGNscy5wcm90b3R5cGVbZnVuY10uYmluZChuZXdDbGFzcy5wcm90b3R5cGUpO1xuICAgIH1cbiAgICBmb3IgKHZhciBfZnVuYzIgb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhjbHMucHJvdG90eXBlKSkge1xuICAgICAgaWYgKHR5cGVvZiBjbHNbX2Z1bmMyXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBuZXdDbGFzcy5wcm90b3R5cGVbX2Z1bmMyXSA9IGNscy5wcm90b3R5cGVbX2Z1bmMyXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBuZXdDbGFzcy5wcm90b3R5cGVbX2Z1bmMyXSA9IGNscy5wcm90b3R5cGVbX2Z1bmMyXS5iaW5kKG5ld0NsYXNzLnByb3RvdHlwZSk7XG4gICAgfVxuICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKFsnbmFtZScsICdwcm90b3R5cGUnLCAnbGVuZ3RoJ10uaW5jbHVkZXMoX2Z1bmMzKSkge1xuICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihuZXdDbGFzcywgX2Z1bmMzKTtcbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGNsc1tfZnVuYzNdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgbmV3Q2xhc3NbX2Z1bmMzXSA9IGNsc1tfZnVuYzNdO1xuICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHZhciBwcmV2ID0gbmV3Q2xhc3NbX2Z1bmMzXSB8fCBmYWxzZTtcbiAgICAgICAgdmFyIG1ldGggPSBjbHNbX2Z1bmMzXS5iaW5kKG5ld0NsYXNzKTtcbiAgICAgICAgbmV3Q2xhc3NbX2Z1bmMzXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgcHJldiAmJiBwcmV2KC4uLmFyZ3MpO1xuICAgICAgICAgIHJldHVybiBtZXRoKC4uLmFyZ3MpO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIF9yZXQ7XG4gICAgZm9yICh2YXIgX2Z1bmMzIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNscykpIHtcbiAgICAgIF9yZXQgPSBfbG9vcCgpO1xuICAgICAgaWYgKF9yZXQgPT09IDApIGNvbnRpbnVlO1xuICAgIH1cbiAgICB2YXIgX2xvb3AyID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHR5cGVvZiBjbHNbX2Z1bmM0XSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBuZXdDbGFzcy5wcm90b3R5cGVbX2Z1bmM0XSA9IGNsc1tfZnVuYzRdO1xuICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgIH1cbiAgICAgIHZhciBwcmV2ID0gbmV3Q2xhc3NbX2Z1bmM0XSB8fCBmYWxzZTtcbiAgICAgIHZhciBtZXRoID0gY2xzW19mdW5jNF0uYmluZChuZXdDbGFzcyk7XG4gICAgICBuZXdDbGFzc1tfZnVuYzRdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgcHJldiAmJiBwcmV2KC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWV0aCguLi5hcmdzKTtcbiAgICAgIH07XG4gICAgfTtcbiAgICBmb3IgKHZhciBfZnVuYzQgb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhjbHMpKSB7XG4gICAgICBpZiAoX2xvb3AyKCkpIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgbWl4KG1peGluVG8pIHtcbiAgICB2YXIgY29uc3RydWN0b3JzID0gW107XG4gICAgdmFyIGFsbFN0YXRpYyA9IHt9O1xuICAgIHZhciBhbGxJbnN0YW5jZSA9IHt9O1xuICAgIHZhciBtaXhhYmxlID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShtaXhpblRvKTtcbiAgICB2YXIgX2xvb3AzID0gZnVuY3Rpb24gKGJhc2UpIHtcbiAgICAgIHZhciBpbnN0YW5jZU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYmFzZS5wcm90b3R5cGUpO1xuICAgICAgdmFyIHN0YXRpY05hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYmFzZSk7XG4gICAgICB2YXIgcHJlZml4ID0gL14oYmVmb3JlfGFmdGVyKV9fKC4rKS87XG4gICAgICB2YXIgX2xvb3A1ID0gZnVuY3Rpb24gKF9tZXRob2ROYW1lMikge1xuICAgICAgICAgIHZhciBtYXRjaCA9IF9tZXRob2ROYW1lMi5tYXRjaChwcmVmaXgpO1xuICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgc3dpdGNoIChtYXRjaFsxXSkge1xuICAgICAgICAgICAgICBjYXNlICdiZWZvcmUnOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYmVmb3JlKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2VbX21ldGhvZE5hbWUyXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnYWZ0ZXInOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYWZ0ZXIoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZVtfbWV0aG9kTmFtZTJdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhbGxTdGF0aWNbX21ldGhvZE5hbWUyXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgYmFzZVtfbWV0aG9kTmFtZTJdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgYWxsU3RhdGljW19tZXRob2ROYW1lMl0gPSBiYXNlW19tZXRob2ROYW1lMl07XG4gICAgICAgIH0sXG4gICAgICAgIF9yZXQyO1xuICAgICAgZm9yICh2YXIgX21ldGhvZE5hbWUyIG9mIHN0YXRpY05hbWVzKSB7XG4gICAgICAgIF9yZXQyID0gX2xvb3A1KF9tZXRob2ROYW1lMik7XG4gICAgICAgIGlmIChfcmV0MiA9PT0gMCkgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgX2xvb3A2ID0gZnVuY3Rpb24gKF9tZXRob2ROYW1lMykge1xuICAgICAgICAgIHZhciBtYXRjaCA9IF9tZXRob2ROYW1lMy5tYXRjaChwcmVmaXgpO1xuICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgc3dpdGNoIChtYXRjaFsxXSkge1xuICAgICAgICAgICAgICBjYXNlICdiZWZvcmUnOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYmVmb3JlKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM10uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FmdGVyJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2FmdGVyKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM10uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFsbEluc3RhbmNlW19tZXRob2ROYW1lM10pIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBhbGxJbnN0YW5jZVtfbWV0aG9kTmFtZTNdID0gYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXTtcbiAgICAgICAgfSxcbiAgICAgICAgX3JldDM7XG4gICAgICBmb3IgKHZhciBfbWV0aG9kTmFtZTMgb2YgaW5zdGFuY2VOYW1lcykge1xuICAgICAgICBfcmV0MyA9IF9sb29wNihfbWV0aG9kTmFtZTMpO1xuICAgICAgICBpZiAoX3JldDMgPT09IDApIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH07XG4gICAgZm9yICh2YXIgYmFzZSA9IHRoaXM7IGJhc2UgJiYgYmFzZS5wcm90b3R5cGU7IGJhc2UgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYmFzZSkpIHtcbiAgICAgIF9sb29wMyhiYXNlKTtcbiAgICB9XG4gICAgZm9yICh2YXIgbWV0aG9kTmFtZSBpbiBhbGxTdGF0aWMpIHtcbiAgICAgIG1peGluVG9bbWV0aG9kTmFtZV0gPSBhbGxTdGF0aWNbbWV0aG9kTmFtZV0uYmluZChtaXhpblRvKTtcbiAgICB9XG4gICAgdmFyIF9sb29wNCA9IGZ1bmN0aW9uIChfbWV0aG9kTmFtZSkge1xuICAgICAgbWl4aW5Uby5wcm90b3R5cGVbX21ldGhvZE5hbWVdID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGFsbEluc3RhbmNlW19tZXRob2ROYW1lXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH07XG4gICAgfTtcbiAgICBmb3IgKHZhciBfbWV0aG9kTmFtZSBpbiBhbGxJbnN0YW5jZSkge1xuICAgICAgX2xvb3A0KF9tZXRob2ROYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIG1peGFibGU7XG4gIH1cbn1cbmV4cG9ydHMuTWl4aW4gPSBNaXhpbjtcbk1peGluLkNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJvdXRlciA9IHZvaWQgMDtcbnZhciBfVmlldyA9IHJlcXVpcmUoXCIuL1ZpZXdcIik7XG52YXIgX0NhY2hlID0gcmVxdWlyZShcIi4vQ2FjaGVcIik7XG52YXIgX0NvbmZpZyA9IHJlcXVpcmUoXCIuL0NvbmZpZ1wiKTtcbnZhciBfUm91dGVzID0gcmVxdWlyZShcIi4vUm91dGVzXCIpO1xudmFyIF93aW4kQ3VzdG9tRXZlbnQ7XG52YXIgTm90Rm91bmRFcnJvciA9IFN5bWJvbCgnTm90Rm91bmQnKTtcbnZhciBJbnRlcm5hbEVycm9yID0gU3ltYm9sKCdJbnRlcm5hbCcpO1xudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG53aW4uQ3VzdG9tRXZlbnQgPSAoX3dpbiRDdXN0b21FdmVudCA9IHdpbi5DdXN0b21FdmVudCkgIT09IG51bGwgJiYgX3dpbiRDdXN0b21FdmVudCAhPT0gdm9pZCAwID8gX3dpbiRDdXN0b21FdmVudCA6IHdpbi5FdmVudDtcbmNsYXNzIFJvdXRlciB7XG4gIHN0YXRpYyB3YWl0KHZpZXcsIGV2ZW50ID0gJ0RPTUNvbnRlbnRMb2FkZWQnLCBub2RlID0gZG9jdW1lbnQpIHtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsICgpID0+IHtcbiAgICAgIHRoaXMubGlzdGVuKHZpZXcpO1xuICAgIH0pO1xuICB9XG4gIHN0YXRpYyBsaXN0ZW4obGlzdGVuZXIsIHJvdXRlcyA9IGZhbHNlKSB7XG4gICAgdGhpcy5saXN0ZW5lciA9IGxpc3RlbmVyIHx8IHRoaXMubGlzdGVuZXI7XG4gICAgdGhpcy5yb3V0ZXMgPSByb3V0ZXMgfHwgbGlzdGVuZXIucm91dGVzO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5xdWVyeSwgdGhpcy5xdWVyeU92ZXIoe30pKTtcbiAgICB2YXIgbGlzdGVuID0gZXZlbnQgPT4ge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChldmVudC5zdGF0ZSAmJiAncm91dGVkSWQnIGluIGV2ZW50LnN0YXRlKSB7XG4gICAgICAgIGlmIChldmVudC5zdGF0ZS5yb3V0ZWRJZCA8PSB0aGlzLnJvdXRlQ291bnQpIHtcbiAgICAgICAgICB0aGlzLmhpc3Rvcnkuc3BsaWNlKGV2ZW50LnN0YXRlLnJvdXRlZElkKTtcbiAgICAgICAgICB0aGlzLnJvdXRlQ291bnQgPSBldmVudC5zdGF0ZS5yb3V0ZWRJZDtcbiAgICAgICAgfSBlbHNlIGlmIChldmVudC5zdGF0ZS5yb3V0ZWRJZCA+IHRoaXMucm91dGVDb3VudCkge1xuICAgICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKGV2ZW50LnN0YXRlLnByZXYpO1xuICAgICAgICAgIHRoaXMucm91dGVDb3VudCA9IGV2ZW50LnN0YXRlLnJvdXRlZElkO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdGUgPSBldmVudC5zdGF0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLnByZXZQYXRoICE9PSBudWxsICYmIHRoaXMucHJldlBhdGggIT09IGxvY2F0aW9uLnBhdGhuYW1lKSB7XG4gICAgICAgICAgdGhpcy5oaXN0b3J5LnB1c2godGhpcy5wcmV2UGF0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pKSB7XG4gICAgICAgIHRoaXMubWF0Y2gobG9jYXRpb24ucGF0aG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubWF0Y2godGhpcy5uZXh0UGF0aCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2N2VXJsQ2hhbmdlZCcsIGxpc3Rlbik7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgbGlzdGVuKTtcbiAgICB2YXIgcm91dGUgPSAhdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pID8gbG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5zZWFyY2ggOiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSAmJiBsb2NhdGlvbi5oYXNoKSB7XG4gICAgICByb3V0ZSArPSBsb2NhdGlvbi5oYXNoO1xuICAgIH1cbiAgICB2YXIgc3RhdGUgPSB7XG4gICAgICByb3V0ZWRJZDogdGhpcy5yb3V0ZUNvdW50LFxuICAgICAgdXJsOiBsb2NhdGlvbi5wYXRobmFtZSxcbiAgICAgIHByZXY6IHRoaXMucHJldlBhdGhcbiAgICB9O1xuICAgIGlmICghdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pKSB7XG4gICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShzdGF0ZSwgbnVsbCwgbG9jYXRpb24ucGF0aG5hbWUpO1xuICAgIH1cbiAgICB0aGlzLmdvKHJvdXRlICE9PSBmYWxzZSA/IHJvdXRlIDogJy8nKTtcbiAgfVxuICBzdGF0aWMgZ28ocGF0aCwgc2lsZW50ID0gZmFsc2UpIHtcbiAgICB2YXIgY29uZmlnVGl0bGUgPSBfQ29uZmlnLkNvbmZpZy5nZXQoJ3RpdGxlJyk7XG4gICAgaWYgKGNvbmZpZ1RpdGxlKSB7XG4gICAgICBkb2N1bWVudC50aXRsZSA9IGNvbmZpZ1RpdGxlO1xuICAgIH1cbiAgICB2YXIgc3RhdGUgPSB7XG4gICAgICByb3V0ZWRJZDogdGhpcy5yb3V0ZUNvdW50LFxuICAgICAgcHJldjogdGhpcy5wcmV2UGF0aCxcbiAgICAgIHVybDogbG9jYXRpb24ucGF0aG5hbWVcbiAgICB9O1xuICAgIGlmIChzaWxlbnQgPT09IC0xKSB7XG4gICAgICB0aGlzLm1hdGNoKHBhdGgsIHRoaXMubGlzdGVuZXIsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pKSB7XG4gICAgICB0aGlzLm5leHRQYXRoID0gcGF0aDtcbiAgICB9IGVsc2UgaWYgKHNpbGVudCA9PT0gMiAmJiBsb2NhdGlvbi5wYXRobmFtZSAhPT0gcGF0aCkge1xuICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoc3RhdGUsIG51bGwsIHBhdGgpO1xuICAgIH0gZWxzZSBpZiAobG9jYXRpb24ucGF0aG5hbWUgIT09IHBhdGgpIHtcbiAgICAgIGhpc3RvcnkucHVzaFN0YXRlKHN0YXRlLCBudWxsLCBwYXRoKTtcbiAgICB9XG4gICAgaWYgKCFzaWxlbnQgfHwgc2lsZW50IDwgMCkge1xuICAgICAgaWYgKHNpbGVudCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5wYXRoID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgIGlmIChwYXRoLnN1YnN0cmluZygwLCAxKSA9PT0gJyMnKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEhhc2hDaGFuZ2VFdmVudCgnaGFzaGNoYW5nZScpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2VXJsQ2hhbmdlZCcpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnByZXZQYXRoID0gcGF0aDtcbiAgfVxuICBzdGF0aWMgcHJvY2Vzc1JvdXRlKHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKHR5cGVvZiByb3V0ZXNbc2VsZWN0ZWRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAocm91dGVzW3NlbGVjdGVkXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIHJlc3VsdCA9IG5ldyByb3V0ZXNbc2VsZWN0ZWRdKGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gcm91dGVzW3NlbGVjdGVkXShhcmdzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gcm91dGVzW3NlbGVjdGVkXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBzdGF0aWMgaGFuZGxlRXJyb3IoZXJyb3IsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGxpc3RlbmVyLCBwYXRoLCBwcmV2LCBmb3JjZVJlZnJlc2gpIHtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGVFcnJvcicsIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgcGF0aCxcbiAgICAgICAgICBwcmV2LFxuICAgICAgICAgIHZpZXc6IGxpc3RlbmVyLFxuICAgICAgICAgIHJvdXRlcyxcbiAgICAgICAgICBzZWxlY3RlZFxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSB3aW5bJ2Rldk1vZGUnXSA/ICdVbmV4cGVjdGVkIGVycm9yOiAnICsgU3RyaW5nKGVycm9yKSA6ICdVbmV4cGVjdGVkIGVycm9yLic7XG4gICAgaWYgKHJvdXRlc1tJbnRlcm5hbEVycm9yXSkge1xuICAgICAgYXJnc1tJbnRlcm5hbEVycm9yXSA9IGVycm9yO1xuICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzUm91dGUocm91dGVzLCBJbnRlcm5hbEVycm9yLCBhcmdzKTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKTtcbiAgfVxuICBzdGF0aWMgbWF0Y2gocGF0aCwgbGlzdGVuZXIsIG9wdGlvbnMgPSBmYWxzZSkge1xuICAgIHZhciBldmVudCA9IG51bGwsXG4gICAgICByZXF1ZXN0ID0gbnVsbCxcbiAgICAgIGZvcmNlUmVmcmVzaCA9IGZhbHNlO1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBmb3JjZVJlZnJlc2ggPSBvcHRpb25zO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvcmNlUmVmcmVzaCA9IG9wdGlvbnMuZm9yY2VSZWZyZXNoO1xuICAgICAgZXZlbnQgPSBvcHRpb25zLmV2ZW50O1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnBhdGggPT09IHBhdGggJiYgIWZvcmNlUmVmcmVzaCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgb3JpZ2luID0gJ2h0dHA6Ly9leGFtcGxlLmNvbSc7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIG9yaWdpbiA9IHRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSA/IG9yaWdpbiA6IGxvY2F0aW9uLm9yaWdpbjtcbiAgICAgIHRoaXMucXVlcnlTdHJpbmcgPSBsb2NhdGlvbi5zZWFyY2g7XG4gICAgfVxuICAgIHZhciB1cmwgPSBuZXcgVVJMKHBhdGgsIG9yaWdpbik7XG4gICAgcGF0aCA9IHRoaXMucGF0aCA9IHVybC5wYXRobmFtZTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5xdWVyeVN0cmluZyA9IHVybC5zZWFyY2g7XG4gICAgfVxuICAgIHZhciBwcmV2ID0gdGhpcy5wcmV2UGF0aDtcbiAgICB2YXIgY3VycmVudCA9IGxpc3RlbmVyICYmIGxpc3RlbmVyLmFyZ3MgPyBsaXN0ZW5lci5hcmdzLmNvbnRlbnQgOiBudWxsO1xuICAgIHZhciByb3V0ZXMgPSB0aGlzLnJvdXRlcyB8fCBsaXN0ZW5lciAmJiBsaXN0ZW5lci5yb3V0ZXMgfHwgX1JvdXRlcy5Sb3V0ZXMuZHVtcCgpO1xuICAgIHZhciBxdWVyeSA9IG5ldyBVUkxTZWFyY2hQYXJhbXModGhpcy5xdWVyeVN0cmluZyk7XG4gICAgaWYgKGV2ZW50ICYmIGV2ZW50LnJlcXVlc3QpIHtcbiAgICAgIHRoaXMucmVxdWVzdCA9IGV2ZW50LnJlcXVlc3Q7XG4gICAgfVxuICAgIGZvciAodmFyIGtleSBpbiBPYmplY3Qua2V5cyh0aGlzLnF1ZXJ5KSkge1xuICAgICAgZGVsZXRlIHRoaXMucXVlcnlba2V5XTtcbiAgICB9XG4gICAgZm9yICh2YXIgW19rZXksIHZhbHVlXSBvZiBxdWVyeSkge1xuICAgICAgdGhpcy5xdWVyeVtfa2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgICB2YXIgYXJncyA9IHt9LFxuICAgICAgc2VsZWN0ZWQgPSBmYWxzZSxcbiAgICAgIHJlc3VsdCA9ICcnO1xuICAgIGlmIChwYXRoLnN1YnN0cmluZygwLCAxKSA9PT0gJy8nKSB7XG4gICAgICBwYXRoID0gcGF0aC5zdWJzdHJpbmcoMSk7XG4gICAgfVxuICAgIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnF1ZXJ5KSB7XG4gICAgICBhcmdzW2ldID0gdGhpcy5xdWVyeVtpXTtcbiAgICB9XG4gICAgTDE6IGZvciAodmFyIF9pIGluIHJvdXRlcykge1xuICAgICAgdmFyIHJvdXRlID0gX2kuc3BsaXQoJy8nKTtcbiAgICAgIGlmIChyb3V0ZS5sZW5ndGggPCBwYXRoLmxlbmd0aCAmJiByb3V0ZVtyb3V0ZS5sZW5ndGggLSAxXSAhPT0gJyonKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgTDI6IGZvciAodmFyIGogaW4gcm91dGUpIHtcbiAgICAgICAgaWYgKHJvdXRlW2pdLnN1YnN0cigwLCAxKSA9PSAnJScpIHtcbiAgICAgICAgICB2YXIgYXJnTmFtZSA9IG51bGw7XG4gICAgICAgICAgdmFyIGdyb3VwcyA9IC9eJShcXHcrKVxcPz8vLmV4ZWMocm91dGVbal0pO1xuICAgICAgICAgIGlmIChncm91cHMgJiYgZ3JvdXBzWzFdKSB7XG4gICAgICAgICAgICBhcmdOYW1lID0gZ3JvdXBzWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWFyZ05hbWUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtyb3V0ZVtqXX0gaXMgbm90IGEgdmFsaWQgYXJndW1lbnQgc2VnbWVudCBpbiByb3V0ZSBcIiR7X2l9XCJgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFwYXRoW2pdKSB7XG4gICAgICAgICAgICBpZiAocm91dGVbal0uc3Vic3RyKHJvdXRlW2pdLmxlbmd0aCAtIDEsIDEpID09ICc/Jykge1xuICAgICAgICAgICAgICBhcmdzW2FyZ05hbWVdID0gJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250aW51ZSBMMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXJnc1thcmdOYW1lXSA9IHBhdGhbal07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJvdXRlW2pdICE9PSAnKicgJiYgcGF0aFtqXSAhPT0gcm91dGVbal0pIHtcbiAgICAgICAgICBjb250aW51ZSBMMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2VsZWN0ZWQgPSBfaTtcbiAgICAgIHJlc3VsdCA9IHJvdXRlc1tfaV07XG4gICAgICBpZiAocm91dGVbcm91dGUubGVuZ3RoIC0gMV0gPT09ICcqJykge1xuICAgICAgICBhcmdzLnBhdGhwYXJ0cyA9IHBhdGguc2xpY2Uocm91dGUubGVuZ3RoIC0gMSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgdmFyIGV2ZW50U3RhcnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGVTdGFydCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcHJldixcbiAgICAgICAgcm9vdDogbGlzdGVuZXIsXG4gICAgICAgIHNlbGVjdGVkLFxuICAgICAgICByb3V0ZXNcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKCFkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50U3RhcnQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFmb3JjZVJlZnJlc2ggJiYgbGlzdGVuZXIgJiYgY3VycmVudCAmJiB0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0JyAmJiBjdXJyZW50LmNvbnN0cnVjdG9yID09PSByZXN1bHQuY29uc3RydWN0b3IgJiYgIShyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSAmJiBjdXJyZW50LnVwZGF0ZShhcmdzKSkge1xuICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50ID0gY3VycmVudDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoIShzZWxlY3RlZCBpbiByb3V0ZXMpKSB7XG4gICAgICByb3V0ZXNbc2VsZWN0ZWRdID0gcm91dGVzW05vdEZvdW5kRXJyb3JdO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzUm91dGUocm91dGVzLCBzZWxlY3RlZCwgYXJncyk7XG4gICAgICBpZiAocmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NSb3V0ZShyb3V0ZXMsIE5vdEZvdW5kRXJyb3IsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKCEocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIGlmICghKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKHJlYWxSZXN1bHQgPT4gdGhpcy51cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlYWxSZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCkpLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgdGhpcy5oYW5kbGVFcnJvcihlcnJvciwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgbGlzdGVuZXIsIHBhdGgsIHByZXYsIGZvcmNlUmVmcmVzaCk7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5oYW5kbGVFcnJvcihlcnJvciwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgbGlzdGVuZXIsIHBhdGgsIHByZXYsIGZvcmNlUmVmcmVzaCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyB1cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKSB7XG4gICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcHJldiA9IHRoaXMucHJldlBhdGg7XG4gICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICByZXN1bHQsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIHByZXYsXG4gICAgICAgIHZpZXc6IGxpc3RlbmVyLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHNlbGVjdGVkXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgIGlmIChsaXN0ZW5lci5hcmdzLmNvbnRlbnQgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudC5wYXVzZSh0cnVlKTtcbiAgICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50LnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgaWYgKGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudCA9IHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIHJlc3VsdC5wYXVzZShmYWxzZSk7XG4gICAgICAgIHJlc3VsdC51cGRhdGUoYXJncywgZm9yY2VSZWZyZXNoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGV2ZW50RW5kID0gbmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlRW5kJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICByZXN1bHQsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIHByZXYsXG4gICAgICAgIHZpZXc6IGxpc3RlbmVyLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHNlbGVjdGVkXG4gICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudEVuZCk7XG4gIH1cbiAgc3RhdGljIGlzT3JpZ2luTGltaXRlZCh7XG4gICAgb3JpZ2luXG4gIH0pIHtcbiAgICByZXR1cm4gb3JpZ2luID09PSAnbnVsbCcgfHwgb3JpZ2luID09PSAnZmlsZTovLyc7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5T3ZlcihhcmdzID0ge30pIHtcbiAgICB2YXIgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpO1xuICAgIHZhciBmaW5hbEFyZ3MgPSB7fTtcbiAgICB2YXIgcXVlcnkgPSB7fTtcbiAgICBmb3IgKHZhciBwYWlyIG9mIHBhcmFtcykge1xuICAgICAgcXVlcnlbcGFpclswXV0gPSBwYWlyWzFdO1xuICAgIH1cbiAgICBmaW5hbEFyZ3MgPSBPYmplY3QuYXNzaWduKGZpbmFsQXJncywgcXVlcnksIGFyZ3MpO1xuICAgIGRlbGV0ZSBmaW5hbEFyZ3NbJ2FwaSddO1xuICAgIHJldHVybiBmaW5hbEFyZ3M7XG5cbiAgICAvLyBmb3IobGV0IGkgaW4gcXVlcnkpXG4gICAgLy8ge1xuICAgIC8vIFx0ZmluYWxBcmdzW2ldID0gcXVlcnlbaV07XG4gICAgLy8gfVxuXG4gICAgLy8gZm9yKGxldCBpIGluIGFyZ3MpXG4gICAgLy8ge1xuICAgIC8vIFx0ZmluYWxBcmdzW2ldID0gYXJnc1tpXTtcbiAgICAvLyB9XG4gIH1cbiAgc3RhdGljIHF1ZXJ5VG9TdHJpbmcoYXJncyA9IHt9LCBmcmVzaCA9IGZhbHNlKSB7XG4gICAgdmFyIHBhcnRzID0gW10sXG4gICAgICBmaW5hbEFyZ3MgPSBhcmdzO1xuICAgIGlmICghZnJlc2gpIHtcbiAgICAgIGZpbmFsQXJncyA9IHRoaXMucXVlcnlPdmVyKGFyZ3MpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIGZpbmFsQXJncykge1xuICAgICAgaWYgKGZpbmFsQXJnc1tpXSA9PT0gJycpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBwYXJ0cy5wdXNoKGkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoZmluYWxBcmdzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBwYXJ0cy5qb2luKCcmJyk7XG4gIH1cbiAgc3RhdGljIHNldFF1ZXJ5KG5hbWUsIHZhbHVlLCBzaWxlbnQpIHtcbiAgICB2YXIgYXJncyA9IHRoaXMucXVlcnlPdmVyKCk7XG4gICAgYXJnc1tuYW1lXSA9IHZhbHVlO1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBkZWxldGUgYXJnc1tuYW1lXTtcbiAgICB9XG4gICAgdmFyIHF1ZXJ5U3RyaW5nID0gdGhpcy5xdWVyeVRvU3RyaW5nKGFyZ3MsIHRydWUpO1xuICAgIHRoaXMuZ28obG9jYXRpb24ucGF0aG5hbWUgKyAocXVlcnlTdHJpbmcgPyAnPycgKyBxdWVyeVN0cmluZyA6ICc/JyksIHNpbGVudCk7XG4gIH1cbn1cbmV4cG9ydHMuUm91dGVyID0gUm91dGVyO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3F1ZXJ5Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZToge31cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ2hpc3RvcnknLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBbXVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncm91dGVDb3VudCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogMFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncHJldlBhdGgnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IG51bGxcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3F1ZXJ5U3RyaW5nJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiBudWxsXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdJbnRlcm5hbEVycm9yJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogSW50ZXJuYWxFcnJvclxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAnTm90Rm91bmRFcnJvcicsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE5vdEZvdW5kRXJyb3Jcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Sb3V0ZXMgPSB2b2lkIDA7XG52YXIgQXBwUm91dGVzID0ge307XG52YXIgX3JlcXVpcmUgPSByZXF1aXJlO1xudmFyIGltcG9ydGVkID0gZmFsc2U7XG52YXIgcnVuSW1wb3J0ID0gKCkgPT4ge1xuICBpZiAoaW1wb3J0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgO1xuICB0cnkge1xuICAgIE9iamVjdC5hc3NpZ24oQXBwUm91dGVzLCBfcmVxdWlyZSgnUm91dGVzJykuUm91dGVzIHx8IHt9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBnbG9iYWxUaGlzLmRldk1vZGUgPT09IHRydWUgJiYgY29uc29sZS53YXJuKGVycm9yKTtcbiAgfVxuICBpbXBvcnRlZCA9IHRydWU7XG59O1xuY2xhc3MgUm91dGVzIHtcbiAgc3RhdGljIGdldChuYW1lKSB7XG4gICAgcnVuSW1wb3J0KCk7XG4gICAgcmV0dXJuIHRoaXMucm91dGVzW25hbWVdO1xuICB9XG4gIHN0YXRpYyBkdW1wKCkge1xuICAgIHJ1bkltcG9ydCgpO1xuICAgIHJldHVybiB0aGlzLnJvdXRlcztcbiAgfVxufVxuZXhwb3J0cy5Sb3V0ZXMgPSBSb3V0ZXM7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVzLCAncm91dGVzJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogQXBwUm91dGVzXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJ1bGVTZXQgPSB2b2lkIDA7XG52YXIgX0RvbSA9IHJlcXVpcmUoXCIuL0RvbVwiKTtcbnZhciBfVGFnID0gcmVxdWlyZShcIi4vVGFnXCIpO1xudmFyIF9WaWV3ID0gcmVxdWlyZShcIi4vVmlld1wiKTtcbmNsYXNzIFJ1bGVTZXQge1xuICBzdGF0aWMgYWRkKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHRoaXMuZ2xvYmFsUnVsZXMgPSB0aGlzLmdsb2JhbFJ1bGVzIHx8IHt9O1xuICAgIHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdID0gdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0gfHwgW107XG4gICAgdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0ucHVzaChjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgc3RhdGljIGFwcGx5KGRvYyA9IGRvY3VtZW50LCB2aWV3ID0gbnVsbCkge1xuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIHRoaXMuZ2xvYmFsUnVsZXMpIHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl1baV07XG4gICAgICAgIHZhciB3cmFwcGVkID0gdGhpcy53cmFwKGRvYywgY2FsbGJhY2ssIHZpZXcpO1xuICAgICAgICB2YXIgbm9kZXMgPSBkb2MucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGZvciAodmFyIG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICB3cmFwcGVkKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGFkZChzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICB0aGlzLnJ1bGVzID0gdGhpcy5ydWxlcyB8fCB7fTtcbiAgICB0aGlzLnJ1bGVzW3NlbGVjdG9yXSA9IHRoaXMucnVsZXNbc2VsZWN0b3JdIHx8IFtdO1xuICAgIHRoaXMucnVsZXNbc2VsZWN0b3JdLnB1c2goY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIGFwcGx5KGRvYyA9IGRvY3VtZW50LCB2aWV3ID0gbnVsbCkge1xuICAgIFJ1bGVTZXQuYXBwbHkoZG9jLCB2aWV3KTtcbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiB0aGlzLnJ1bGVzKSB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMucnVsZXNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHRoaXMucnVsZXNbc2VsZWN0b3JdW2ldO1xuICAgICAgICB2YXIgd3JhcHBlZCA9IFJ1bGVTZXQud3JhcChkb2MsIGNhbGxiYWNrLCB2aWV3KTtcbiAgICAgICAgdmFyIG5vZGVzID0gZG9jLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBmb3IgKHZhciBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgd3JhcHBlZChub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBwdXJnZSgpIHtcbiAgICBpZiAoIXRoaXMucnVsZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yICh2YXIgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMucnVsZXMpKSB7XG4gICAgICBpZiAoIXRoaXMucnVsZXNba10pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBrayBpbiB0aGlzLnJ1bGVzW2tdKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnJ1bGVzW2tdW2trXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgc3RhdGljIHdhaXQoZXZlbnQgPSAnRE9NQ29udGVudExvYWRlZCcsIG5vZGUgPSBkb2N1bWVudCkge1xuICAgIHZhciBsaXN0ZW5lciA9ICgoZXZlbnQsIG5vZGUpID0+ICgpID0+IHtcbiAgICAgIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXMuYXBwbHkoKTtcbiAgICB9KShldmVudCwgbm9kZSk7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gIH1cbiAgc3RhdGljIHdyYXAoZG9jLCBvcmlnaW5hbENhbGxiYWNrLCB2aWV3ID0gbnVsbCkge1xuICAgIHZhciBjYWxsYmFjayA9IG9yaWdpbmFsQ2FsbGJhY2s7XG4gICAgaWYgKG9yaWdpbmFsQ2FsbGJhY2sgaW5zdGFuY2VvZiBfVmlldy5WaWV3IHx8IG9yaWdpbmFsQ2FsbGJhY2sgJiYgb3JpZ2luYWxDYWxsYmFjay5wcm90b3R5cGUgJiYgb3JpZ2luYWxDYWxsYmFjay5wcm90b3R5cGUgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICBjYWxsYmFjayA9ICgpID0+IG9yaWdpbmFsQ2FsbGJhY2s7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50ID0+IHtcbiAgICAgIGlmICh0eXBlb2YgZWxlbWVudC5fX19jdkFwcGxpZWRfX18gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlbGVtZW50LCAnX19fY3ZBcHBsaWVkX19fJywge1xuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICB2YWx1ZTogbmV3IFdlYWtTZXQoKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChlbGVtZW50Ll9fX2N2QXBwbGllZF9fXy5oYXMob3JpZ2luYWxDYWxsYmFjaykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGRpcmVjdCwgcGFyZW50VmlldztcbiAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgIGRpcmVjdCA9IHBhcmVudFZpZXcgPSB2aWV3O1xuICAgICAgICBpZiAodmlldy52aWV3TGlzdCkge1xuICAgICAgICAgIHBhcmVudFZpZXcgPSB2aWV3LnZpZXdMaXN0LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIHRhZyA9IG5ldyBfVGFnLlRhZyhlbGVtZW50LCBwYXJlbnRWaWV3LCBudWxsLCB1bmRlZmluZWQsIGRpcmVjdCk7XG4gICAgICB2YXIgcGFyZW50ID0gdGFnLmVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgIHZhciBzaWJsaW5nID0gdGFnLmVsZW1lbnQubmV4dFNpYmxpbmc7XG4gICAgICB2YXIgcmVzdWx0ID0gY2FsbGJhY2sodGFnKTtcbiAgICAgIGlmIChyZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICAgIGVsZW1lbnQuX19fY3ZBcHBsaWVkX19fLmFkZChvcmlnaW5hbENhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICByZXN1bHQgPSBuZXcgX1RhZy5UYWcocmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgICBpZiAoIXJlc3VsdC5lbGVtZW50LmNvbnRhaW5zKHRhZy5lbGVtZW50KSkge1xuICAgICAgICAgIHdoaWxlICh0YWcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICByZXN1bHQuZWxlbWVudC5hcHBlbmRDaGlsZCh0YWcuZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaWJsaW5nKSB7XG4gICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShyZXN1bHQuZWxlbWVudCwgc2libGluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKHJlc3VsdC5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQucHJvdG90eXBlICYmIHJlc3VsdC5wcm90b3R5cGUgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIHJlc3VsdCA9IG5ldyByZXN1bHQoe30sIHZpZXcpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICB2aWV3LmNsZWFudXAucHVzaCgoKSA9PiByZXN1bHQucmVtb3ZlKCkpO1xuICAgICAgICAgIHZpZXcuY2xlYW51cC5wdXNoKHZpZXcuYXJncy5iaW5kVG8oKHYsIGssIHQpID0+IHtcbiAgICAgICAgICAgIHRba10gPSB2O1xuICAgICAgICAgICAgcmVzdWx0LmFyZ3Nba10gPSB2O1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgICB2aWV3LmNsZWFudXAucHVzaChyZXN1bHQuYXJncy5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICAgIHRba10gPSB2O1xuICAgICAgICAgICAgdmlldy5hcmdzW2tdID0gdjtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgdGFnLmNsZWFyKCk7XG4gICAgICAgIHJlc3VsdC5yZW5kZXIodGFnLmVsZW1lbnQpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuUnVsZVNldCA9IFJ1bGVTZXQ7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9TZXRNYXAuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlNldE1hcCA9IHZvaWQgMDtcbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShlLCByLCB0KSB7IHJldHVybiAociA9IF90b1Byb3BlcnR5S2V5KHIpKSBpbiBlID8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsIHIsIHsgdmFsdWU6IHQsIGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAgfSkgOiBlW3JdID0gdCwgZTsgfVxuZnVuY3Rpb24gX3RvUHJvcGVydHlLZXkodCkgeyB2YXIgaSA9IF90b1ByaW1pdGl2ZSh0LCBcInN0cmluZ1wiKTsgcmV0dXJuIFwic3ltYm9sXCIgPT0gdHlwZW9mIGkgPyBpIDogaSArIFwiXCI7IH1cbmZ1bmN0aW9uIF90b1ByaW1pdGl2ZSh0LCByKSB7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiB0IHx8ICF0KSByZXR1cm4gdDsgdmFyIGUgPSB0W1N5bWJvbC50b1ByaW1pdGl2ZV07IGlmICh2b2lkIDAgIT09IGUpIHsgdmFyIGkgPSBlLmNhbGwodCwgciB8fCBcImRlZmF1bHRcIik7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiBpKSByZXR1cm4gaTsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkBAdG9QcmltaXRpdmUgbXVzdCByZXR1cm4gYSBwcmltaXRpdmUgdmFsdWUuXCIpOyB9IHJldHVybiAoXCJzdHJpbmdcIiA9PT0gciA/IFN0cmluZyA6IE51bWJlcikodCk7IH1cbmNsYXNzIFNldE1hcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIF9kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIl9tYXBcIiwgbmV3IE1hcCgpKTtcbiAgfVxuICBoYXMoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5oYXMoa2V5KTtcbiAgfVxuICBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgfVxuICBnZXRPbmUoa2V5KSB7XG4gICAgdmFyIHNldCA9IHRoaXMuZ2V0KGtleSk7XG4gICAgZm9yICh2YXIgZW50cnkgb2Ygc2V0KSB7XG4gICAgICByZXR1cm4gZW50cnk7XG4gICAgfVxuICB9XG4gIGFkZChrZXksIHZhbHVlKSB7XG4gICAgdmFyIHNldCA9IHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgICBpZiAoIXNldCkge1xuICAgICAgdGhpcy5fbWFwLnNldChrZXksIHNldCA9IG5ldyBTZXQoKSk7XG4gICAgfVxuICAgIHJldHVybiBzZXQuYWRkKHZhbHVlKTtcbiAgfVxuICByZW1vdmUoa2V5LCB2YWx1ZSkge1xuICAgIHZhciBzZXQgPSB0aGlzLl9tYXAuZ2V0KGtleSk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlcyA9IHNldC5kZWxldGUodmFsdWUpO1xuICAgIGlmICghc2V0LnNpemUpIHtcbiAgICAgIHRoaXMuX21hcC5kZWxldGUoa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuICB2YWx1ZXMoKSB7XG4gICAgcmV0dXJuIG5ldyBTZXQoLi4uWy4uLnRoaXMuX21hcC52YWx1ZXMoKV0ubWFwKHNldCA9PiBbLi4uc2V0LnZhbHVlcygpXSkpO1xuICB9XG59XG5leHBvcnRzLlNldE1hcCA9IFNldE1hcDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1RhZy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVGFnID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIEN1cnJlbnRTdHlsZSA9IFN5bWJvbCgnQ3VycmVudFN0eWxlJyk7XG52YXIgQ3VycmVudEF0dHJzID0gU3ltYm9sKCdDdXJyZW50QXR0cnMnKTtcbnZhciBzdHlsZXIgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gIGlmICghdGhpcy5ub2RlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAodmFyIHByb3BlcnR5IGluIHN0eWxlcykge1xuICAgIHZhciBzdHJpbmdlZFByb3BlcnR5ID0gU3RyaW5nKHN0eWxlc1twcm9wZXJ0eV0pO1xuICAgIGlmICh0aGlzW0N1cnJlbnRTdHlsZV0uaGFzKHByb3BlcnR5KSAmJiB0aGlzW0N1cnJlbnRTdHlsZV0uZ2V0KHByb3BlcnR5KSA9PT0gc3R5bGVzW3Byb3BlcnR5XSB8fCBOdW1iZXIuaXNOYU4oc3R5bGVzW3Byb3BlcnR5XSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAocHJvcGVydHlbMF0gPT09ICctJykge1xuICAgICAgdGhpcy5ub2RlLnN0eWxlLnNldFByb3BlcnR5KHByb3BlcnR5LCBzdHJpbmdlZFByb3BlcnR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ub2RlLnN0eWxlW3Byb3BlcnR5XSA9IHN0cmluZ2VkUHJvcGVydHk7XG4gICAgfVxuICAgIGlmIChzdHlsZXNbcHJvcGVydHldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5zZXQocHJvcGVydHksIHN0eWxlc1twcm9wZXJ0eV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uZGVsZXRlKHByb3BlcnR5KTtcbiAgICB9XG4gIH1cbn07XG52YXIgZ2V0dGVyID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgaWYgKHR5cGVvZiB0aGlzW25hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHRoaXNbbmFtZV07XG4gIH1cbiAgaWYgKHRoaXMubm9kZSAmJiB0eXBlb2YgdGhpcy5ub2RlW25hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHRoaXNbbmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5ub2RlW25hbWVdKC4uLmFyZ3MpO1xuICB9XG4gIGlmIChuYW1lID09PSAnc3R5bGUnKSB7XG4gICAgcmV0dXJuIHRoaXMucHJveHkuc3R5bGU7XG4gIH1cbiAgaWYgKHRoaXMubm9kZSAmJiBuYW1lIGluIHRoaXMubm9kZSkge1xuICAgIHJldHVybiB0aGlzLm5vZGVbbmFtZV07XG4gIH1cbiAgcmV0dXJuIHRoaXNbbmFtZV07XG59O1xuY2xhc3MgVGFnIHtcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgcGFyZW50LCByZWYsIGluZGV4LCBkaXJlY3QpIHtcbiAgICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIgc3ViZG9jID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQoZWxlbWVudCk7XG4gICAgICBlbGVtZW50ID0gc3ViZG9jLmZpcnN0Q2hpbGQ7XG4gICAgfVxuICAgIHRoaXMuZWxlbWVudCA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoZWxlbWVudCk7XG4gICAgdGhpcy5ub2RlID0gdGhpcy5lbGVtZW50O1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuZGlyZWN0ID0gZGlyZWN0O1xuICAgIHRoaXMucmVmID0gcmVmO1xuICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICB0aGlzLmNsZWFudXAgPSBbXTtcbiAgICB0aGlzW19CaW5kYWJsZS5CaW5kYWJsZS5PbkFsbEdldF0gPSBnZXR0ZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzW0N1cnJlbnRTdHlsZV0gPSBuZXcgTWFwKCk7XG4gICAgdGhpc1tDdXJyZW50QXR0cnNdID0gbmV3IE1hcCgpO1xuICAgIHZhciBib3VuZFN0eWxlciA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHN0eWxlci5iaW5kKHRoaXMpKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N0eWxlJywge1xuICAgICAgdmFsdWU6IGJvdW5kU3R5bGVyXG4gICAgfSk7XG4gICAgdGhpcy5wcm94eSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHRoaXMpO1xuICAgIHRoaXMucHJveHkuc3R5bGUuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICBpZiAodGhpc1tDdXJyZW50U3R5bGVdLmhhcyhrKSAmJiB0aGlzW0N1cnJlbnRTdHlsZV0uZ2V0KGspID09PSB2KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMubm9kZS5zdHlsZVtrXSA9IHY7XG4gICAgICBpZiAoIWQgJiYgdiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5zZXQoaywgdik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uZGVsZXRlKGspO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucHJveHkuYmluZFRvKCh2LCBrKSA9PiB7XG4gICAgICBpZiAoayA9PT0gJ2luZGV4Jykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoayBpbiBlbGVtZW50ICYmIGVsZW1lbnRba10gIT09IHYpIHtcbiAgICAgICAgZWxlbWVudFtrXSA9IHY7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucHJveHk7XG4gIH1cbiAgYXR0cihhdHRyaWJ1dGVzKSB7XG4gICAgZm9yICh2YXIgYXR0cmlidXRlIGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgIGlmICh0aGlzW0N1cnJlbnRBdHRyc10uaGFzKGF0dHJpYnV0ZSkgJiYgYXR0cmlidXRlc1thdHRyaWJ1dGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5ub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICAgICAgICB0aGlzW0N1cnJlbnRBdHRyc10uZGVsZXRlKGF0dHJpYnV0ZSk7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzW0N1cnJlbnRBdHRyc10uaGFzKGF0dHJpYnV0ZSkgfHwgdGhpc1tDdXJyZW50QXR0cnNdLmdldChhdHRyaWJ1dGUpICE9PSBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pIHtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9PT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMubm9kZS5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCAnJyk7XG4gICAgICAgICAgdGhpc1tDdXJyZW50QXR0cnNdLnNldChhdHRyaWJ1dGUsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLm5vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZSwgYXR0cmlidXRlc1thdHRyaWJ1dGVdKTtcbiAgICAgICAgICB0aGlzW0N1cnJlbnRBdHRyc10uc2V0KGF0dHJpYnV0ZSwgYXR0cmlidXRlc1thdHRyaWJ1dGVdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICByZW1vdmUoKSB7XG4gICAgaWYgKHRoaXMubm9kZSkge1xuICAgICAgdGhpcy5ub2RlLnJlbW92ZSgpO1xuICAgIH1cbiAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzKTtcbiAgICB2YXIgY2xlYW51cDtcbiAgICB3aGlsZSAoY2xlYW51cCA9IHRoaXMuY2xlYW51cC5zaGlmdCgpKSB7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfVxuICAgIHRoaXMuY2xlYXIoKTtcbiAgICBpZiAoIXRoaXMubm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZGV0YWNoRXZlbnQgPSBuZXcgRXZlbnQoJ2N2RG9tRGV0YWNoZWQnKTtcbiAgICB0aGlzLm5vZGUuZGlzcGF0Y2hFdmVudChkZXRhY2hFdmVudCk7XG4gICAgdGhpcy5ub2RlID0gdGhpcy5lbGVtZW50ID0gdGhpcy5yZWYgPSB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZDtcbiAgfVxuICBjbGVhcigpIHtcbiAgICBpZiAoIXRoaXMubm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZGV0YWNoRXZlbnQgPSBuZXcgRXZlbnQoJ2N2RG9tRGV0YWNoZWQnKTtcbiAgICB3aGlsZSAodGhpcy5ub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMubm9kZS5maXJzdENoaWxkLmRpc3BhdGNoRXZlbnQoZGV0YWNoRXZlbnQpO1xuICAgICAgdGhpcy5ub2RlLnJlbW92ZUNoaWxkKHRoaXMubm9kZS5maXJzdENoaWxkKTtcbiAgICB9XG4gIH1cbiAgcGF1c2UocGF1c2VkID0gdHJ1ZSkge31cbiAgbGlzdGVuKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMubm9kZTtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgdmFyIHJlbW92ZSA9ICgpID0+IHtcbiAgICAgIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHZhciByZW1vdmVyID0gKCkgPT4ge1xuICAgICAgcmVtb3ZlKCk7XG4gICAgICByZW1vdmUgPSAoKSA9PiBjb25zb2xlLndhcm4oJ0FscmVhZHkgcmVtb3ZlZCEnKTtcbiAgICB9O1xuICAgIHRoaXMucGFyZW50Lm9uUmVtb3ZlKCgpID0+IHJlbW92ZXIoKSk7XG4gICAgcmV0dXJuIHJlbW92ZXI7XG4gIH1cbn1cbmV4cG9ydHMuVGFnID0gVGFnO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVXVpZC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVXVpZCA9IHZvaWQgMDtcbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShlLCByLCB0KSB7IHJldHVybiAociA9IF90b1Byb3BlcnR5S2V5KHIpKSBpbiBlID8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsIHIsIHsgdmFsdWU6IHQsIGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAgfSkgOiBlW3JdID0gdCwgZTsgfVxuZnVuY3Rpb24gX3RvUHJvcGVydHlLZXkodCkgeyB2YXIgaSA9IF90b1ByaW1pdGl2ZSh0LCBcInN0cmluZ1wiKTsgcmV0dXJuIFwic3ltYm9sXCIgPT0gdHlwZW9mIGkgPyBpIDogaSArIFwiXCI7IH1cbmZ1bmN0aW9uIF90b1ByaW1pdGl2ZSh0LCByKSB7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiB0IHx8ICF0KSByZXR1cm4gdDsgdmFyIGUgPSB0W1N5bWJvbC50b1ByaW1pdGl2ZV07IGlmICh2b2lkIDAgIT09IGUpIHsgdmFyIGkgPSBlLmNhbGwodCwgciB8fCBcImRlZmF1bHRcIik7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiBpKSByZXR1cm4gaTsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkBAdG9QcmltaXRpdmUgbXVzdCByZXR1cm4gYSBwcmltaXRpdmUgdmFsdWUuXCIpOyB9IHJldHVybiAoXCJzdHJpbmdcIiA9PT0gciA/IFN0cmluZyA6IE51bWJlcikodCk7IH1cbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xudmFyIGNyeXB0byA9IHdpbi5jcnlwdG87XG5jbGFzcyBVdWlkIHtcbiAgY29uc3RydWN0b3IodXVpZCA9IG51bGwsIHZlcnNpb24gPSA0KSB7XG4gICAgX2RlZmluZVByb3BlcnR5KHRoaXMsIFwidXVpZFwiLCBudWxsKTtcbiAgICBfZGVmaW5lUHJvcGVydHkodGhpcywgXCJ2ZXJzaW9uXCIsIDQpO1xuICAgIGlmICh1dWlkKSB7XG4gICAgICBpZiAodHlwZW9mIHV1aWQgIT09ICdzdHJpbmcnICYmICEodXVpZCBpbnN0YW5jZW9mIFV1aWQpIHx8ICF1dWlkLm1hdGNoKC9bMC05QS1GYS1mXXs4fSgtWzAtOUEtRmEtZl17NH0pezN9LVswLTlBLUZhLWZdezEyfS8pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBpbnB1dCBmb3IgVXVpZDogXCIke3V1aWR9XCJgKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudmVyc2lvbiA9IHZlcnNpb247XG4gICAgICB0aGlzLnV1aWQgPSB1dWlkO1xuICAgIH0gZWxzZSBpZiAoY3J5cHRvICYmIHR5cGVvZiBjcnlwdG8ucmFuZG9tVVVJRCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy51dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGluaXQgPSBbMWU3XSArIC0xZTMgKyAtNGUzICsgLThlMyArIC0xZTExO1xuICAgICAgdmFyIHJhbmQgPSBjcnlwdG8gJiYgdHlwZW9mIGNyeXB0by5yYW5kb21VVUlEID09PSAnZnVuY3Rpb24nID8gKCkgPT4gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDhBcnJheSgxKSlbMF0gOiAoKSA9PiBNYXRoLnRydW5jKE1hdGgucmFuZG9tKCkgKiAyNTYpO1xuICAgICAgdGhpcy51dWlkID0gaW5pdC5yZXBsYWNlKC9bMDE4XS9nLCBjID0+IChjIF4gcmFuZCgpICYgMTUgPj4gYyAvIDQpLnRvU3RyaW5nKDE2KSk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH1cbiAgW1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbiAgfVxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy51dWlkO1xuICB9XG4gIHRvSnNvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuICAgICAgdXVpZDogdGhpcy51dWlkXG4gICAgfTtcbiAgfVxufVxuZXhwb3J0cy5VdWlkID0gVXVpZDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1ZpZXcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlZpZXcgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgX1ZpZXdMaXN0ID0gcmVxdWlyZShcIi4vVmlld0xpc3RcIik7XG52YXIgX1JvdXRlciA9IHJlcXVpcmUoXCIuL1JvdXRlclwiKTtcbnZhciBfVXVpZCA9IHJlcXVpcmUoXCIuL1V1aWRcIik7XG52YXIgX0RvbSA9IHJlcXVpcmUoXCIuL0RvbVwiKTtcbnZhciBfVGFnID0gcmVxdWlyZShcIi4vVGFnXCIpO1xudmFyIF9CYWcgPSByZXF1aXJlKFwiLi9CYWdcIik7XG52YXIgX1J1bGVTZXQgPSByZXF1aXJlKFwiLi9SdWxlU2V0XCIpO1xudmFyIF9NaXhpbiA9IHJlcXVpcmUoXCIuL01peGluXCIpO1xudmFyIF9FdmVudFRhcmdldE1peGluID0gcmVxdWlyZShcIi4uL21peGluL0V2ZW50VGFyZ2V0TWl4aW5cIik7XG52YXIgZG9udFBhcnNlID0gU3ltYm9sKCdkb250UGFyc2UnKTtcbnZhciBleHBhbmRCaW5kID0gU3ltYm9sKCdleHBhbmRCaW5kJyk7XG52YXIgdXVpZCA9IFN5bWJvbCgndXVpZCcpO1xuY2xhc3MgVmlldyBleHRlbmRzIF9NaXhpbi5NaXhpbi53aXRoKF9FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4pIHtcbiAgZ2V0IF9pZCgpIHtcbiAgICByZXR1cm4gdGhpc1t1dWlkXTtcbiAgfVxuICBzdGF0aWMgZnJvbSh0ZW1wbGF0ZSwgYXJncyA9IHt9LCBtYWluVmlldyA9IG51bGwpIHtcbiAgICB2YXIgdmlldyA9IG5ldyB0aGlzKGFyZ3MsIG1haW5WaWV3KTtcbiAgICB2aWV3LnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgcmV0dXJuIHZpZXc7XG4gIH1cbiAgY29uc3RydWN0b3IoYXJncyA9IHt9LCBtYWluVmlldyA9IG51bGwpIHtcbiAgICBzdXBlcihhcmdzLCBtYWluVmlldyk7XG4gICAgdGhpc1tfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSBtYWluVmlldztcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2FyZ3MnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoYXJncylcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgdXVpZCwge1xuICAgICAgdmFsdWU6IHRoaXMuY29uc3RydWN0b3IudXVpZCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdub2Rlc0F0dGFjaGVkJywge1xuICAgICAgdmFsdWU6IG5ldyBfQmFnLkJhZygoaSwgcywgYSkgPT4ge30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdub2Rlc0RldGFjaGVkJywge1xuICAgICAgdmFsdWU6IG5ldyBfQmFnLkJhZygoaSwgcywgYSkgPT4ge30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfb25SZW1vdmUnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9CYWcuQmFnKChpLCBzLCBhKSA9PiB7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2NsZWFudXAnLCB7XG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3BhcmVudCcsIHtcbiAgICAgIHZhbHVlOiBtYWluVmlldyxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd2aWV3cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ZpZXdMaXN0cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3dpdGhWaWV3cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RhZ3MnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdub2RlcycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZShbXSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RpbWVvdXRzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaW50ZXJ2YWxzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZnJhbWVzJywge1xuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdydWxlU2V0Jywge1xuICAgICAgdmFsdWU6IG5ldyBfUnVsZVNldC5SdWxlU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZVJ1bGVTZXQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9SdWxlU2V0LlJ1bGVTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc3ViQmluZGluZ3MnLCB7XG4gICAgICB2YWx1ZToge31cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RlbXBsYXRlcycsIHtcbiAgICAgIHZhbHVlOiB7fVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncG9zdE1hcHBpbmcnLCB7XG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdldmVudENsZWFudXAnLCB7XG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3VucGF1c2VDYWxsYmFja3MnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdpbnRlcnBvbGF0ZVJlZ2V4Jywge1xuICAgICAgdmFsdWU6IC8oXFxbXFxbKCg/OlxcJCspP1tcXHdcXC5cXHwtXSspXFxdXFxdKS9nXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZW5kZXJlZCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpID0+IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVuZGVyQ29tcGxldGUnLCB7XG4gICAgICAgIHZhbHVlOiBhY2NlcHRcbiAgICAgIH0pKVxuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzW19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzW19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IG51bGw7XG4gICAgfSk7XG4gICAgdGhpcy5jb250cm9sbGVyID0gdGhpcztcbiAgICB0aGlzLnRlbXBsYXRlID0gYGA7XG4gICAgdGhpcy5maXJzdE5vZGUgPSBudWxsO1xuICAgIHRoaXMubGFzdE5vZGUgPSBudWxsO1xuICAgIHRoaXMudmlld0xpc3QgPSBudWxsO1xuICAgIHRoaXMubWFpblZpZXcgPSBudWxsO1xuICAgIHRoaXMucHJlc2VydmUgPSBmYWxzZTtcbiAgICB0aGlzLnJlbW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxvYWRlZCA9IFByb21pc2UucmVzb2x2ZSh0aGlzKTtcblxuICAgIC8vIHJldHVybiBCaW5kYWJsZS5tYWtlKHRoaXMpO1xuICB9XG4gIHN0YXRpYyBpc1ZpZXcoKSB7XG4gICAgcmV0dXJuIFZpZXc7XG4gIH1cbiAgb25GcmFtZShjYWxsYmFjaykge1xuICAgIHZhciBzdG9wcGVkID0gZmFsc2U7XG4gICAgdmFyIGNhbmNlbCA9ICgpID0+IHtcbiAgICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgIH07XG4gICAgdmFyIGMgPSB0aW1lc3RhbXAgPT4ge1xuICAgICAgaWYgKHRoaXMucmVtb3ZlZCB8fCBzdG9wcGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgY2FsbGJhY2soRGF0ZS5ub3coKSk7XG4gICAgICB9XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYyk7XG4gICAgfTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gYyhEYXRlLm5vdygpKSk7XG4gICAgdGhpcy5mcmFtZXMucHVzaChjYW5jZWwpO1xuICAgIHJldHVybiBjYW5jZWw7XG4gIH1cbiAgb25OZXh0RnJhbWUoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGNhbGxiYWNrKERhdGUubm93KCkpKTtcbiAgfVxuICBvbklkbGUoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gcmVxdWVzdElkbGVDYWxsYmFjaygoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSk7XG4gIH1cbiAgb25UaW1lb3V0KHRpbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRpbWVvdXRJbmZvID0ge1xuICAgICAgdGltZW91dDogbnVsbCxcbiAgICAgIGNhbGxiYWNrOiBudWxsLFxuICAgICAgdGltZTogdGltZSxcbiAgICAgIGZpcmVkOiBmYWxzZSxcbiAgICAgIGNyZWF0ZWQ6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgcGF1c2VkOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIHdyYXBwZWRDYWxsYmFjayA9ICgpID0+IHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB0aW1lb3V0SW5mby5maXJlZCA9IHRydWU7XG4gICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgICB9O1xuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dCh3cmFwcGVkQ2FsbGJhY2ssIHRpbWUpO1xuICAgIHRpbWVvdXRJbmZvLmNhbGxiYWNrID0gd3JhcHBlZENhbGxiYWNrO1xuICAgIHRpbWVvdXRJbmZvLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgIHRoaXMudGltZW91dHMuc2V0KHRpbWVvdXRJbmZvLnRpbWVvdXQsIHRpbWVvdXRJbmZvKTtcbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxuICBjbGVhclRpbWVvdXQodGltZW91dCkge1xuICAgIGlmICghdGhpcy50aW1lb3V0cy5oYXModGltZW91dCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXRJbmZvID0gdGhpcy50aW1lb3V0cy5nZXQodGltZW91dCk7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICB9XG4gIG9uSW50ZXJ2YWwodGltZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgdGltZW91dCA9IHNldEludGVydmFsKGNhbGxiYWNrLCB0aW1lKTtcbiAgICB0aGlzLmludGVydmFscy5zZXQodGltZW91dCwge1xuICAgICAgdGltZW91dDogdGltZW91dCxcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcbiAgICAgIHRpbWU6IHRpbWUsXG4gICAgICBwYXVzZWQ6IGZhbHNlXG4gICAgfSk7XG4gICAgcmV0dXJuIHRpbWVvdXQ7XG4gIH1cbiAgY2xlYXJJbnRlcnZhbCh0aW1lb3V0KSB7XG4gICAgaWYgKCF0aGlzLmludGVydmFscy5oYXModGltZW91dCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXRJbmZvID0gdGhpcy5pbnRlcnZhbHMuZ2V0KHRpbWVvdXQpO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgICB0aGlzLmludGVydmFscy5kZWxldGUodGltZW91dEluZm8udGltZW91dCk7XG4gIH1cbiAgcGF1c2UocGF1c2VkID0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHBhdXNlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnBhdXNlZCA9ICF0aGlzLnBhdXNlZDtcbiAgICB9XG4gICAgdGhpcy5wYXVzZWQgPSBwYXVzZWQ7XG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICBmb3IgKHZhciBbY2FsbGJhY2ssIHRpbWVvdXRdIG9mIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgaWYgKHRpbWVvdXQuZmlyZWQpIHtcbiAgICAgICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0LnBhdXNlZCA9IHRydWU7XG4gICAgICAgIHRpbWVvdXQudGltZSA9IE1hdGgubWF4KDAsIHRpbWVvdXQudGltZSAtIChEYXRlLm5vdygpIC0gdGltZW91dC5jcmVhdGVkKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBbX2NhbGxiYWNrLCBfdGltZW91dF0gb2YgdGhpcy5pbnRlcnZhbHMpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChfdGltZW91dC50aW1lb3V0KTtcbiAgICAgICAgX3RpbWVvdXQucGF1c2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgW19jYWxsYmFjazIsIF90aW1lb3V0Ml0gb2YgdGhpcy50aW1lb3V0cykge1xuICAgICAgICBpZiAoIV90aW1lb3V0Mi5wYXVzZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoX3RpbWVvdXQyLmZpcmVkKSB7XG4gICAgICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUoX3RpbWVvdXQyLnRpbWVvdXQpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIF90aW1lb3V0Mi50aW1lb3V0ID0gc2V0VGltZW91dChfdGltZW91dDIuY2FsbGJhY2ssIF90aW1lb3V0Mi50aW1lKTtcbiAgICAgICAgX3RpbWVvdXQyLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgW19jYWxsYmFjazMsIF90aW1lb3V0M10gb2YgdGhpcy5pbnRlcnZhbHMpIHtcbiAgICAgICAgaWYgKCFfdGltZW91dDMucGF1c2VkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgX3RpbWVvdXQzLnRpbWVvdXQgPSBzZXRJbnRlcnZhbChfdGltZW91dDMuY2FsbGJhY2ssIF90aW1lb3V0My50aW1lKTtcbiAgICAgICAgX3RpbWVvdXQzLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgWywgX2NhbGxiYWNrNF0gb2YgdGhpcy51bnBhdXNlQ2FsbGJhY2tzKSB7XG4gICAgICAgIF9jYWxsYmFjazQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudW5wYXVzZUNhbGxiYWNrcy5jbGVhcigpO1xuICAgIH1cbiAgICBmb3IgKHZhciBbdGFnLCB2aWV3TGlzdF0gb2YgdGhpcy52aWV3TGlzdHMpIHtcbiAgICAgIHZpZXdMaXN0LnBhdXNlKCEhcGF1c2VkKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnRhZ3MpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMudGFnc1tpXSkpIHtcbiAgICAgICAgZm9yICh2YXIgaiBpbiB0aGlzLnRhZ3NbaV0pIHtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV1bal0ucGF1c2UoISFwYXVzZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy50YWdzW2ldLnBhdXNlKCEhcGF1c2VkKTtcbiAgICB9XG4gIH1cbiAgcmVuZGVyKHBhcmVudE5vZGUgPSBudWxsLCBpbnNlcnRQb2ludCA9IG51bGwsIG91dGVyVmlldyA9IG51bGwpIHtcbiAgICB2YXIge1xuICAgICAgZG9jdW1lbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgaWYgKHBhcmVudE5vZGUgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5maXJzdE5vZGUucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgaWYgKGluc2VydFBvaW50IGluc3RhbmNlb2YgVmlldykge1xuICAgICAgaW5zZXJ0UG9pbnQgPSBpbnNlcnRQb2ludC5maXJzdE5vZGU7XG4gICAgfVxuICAgIGlmICh0aGlzLmZpcnN0Tm9kZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVSZW5kZXIocGFyZW50Tm9kZSwgaW5zZXJ0UG9pbnQsIG91dGVyVmlldyk7XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbmRlcicpKTtcbiAgICB2YXIgdGVtcGxhdGVJc0ZyYWdtZW50ID0gdHlwZW9mIHRoaXMudGVtcGxhdGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiB0aGlzLnRlbXBsYXRlLmNsb25lTm9kZSA9PT0gJ2Z1bmN0aW9uJztcbiAgICB2YXIgdGVtcGxhdGVQYXJzZWQgPSB0ZW1wbGF0ZUlzRnJhZ21lbnQgfHwgVmlldy50ZW1wbGF0ZXMuaGFzKHRoaXMudGVtcGxhdGUpO1xuICAgIHZhciBzdWJEb2M7XG4gICAgaWYgKHRlbXBsYXRlUGFyc2VkKSB7XG4gICAgICBpZiAodGVtcGxhdGVJc0ZyYWdtZW50KSB7XG4gICAgICAgIHN1YkRvYyA9IHRoaXMudGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3ViRG9jID0gVmlldy50ZW1wbGF0ZXMuZ2V0KHRoaXMudGVtcGxhdGUpLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3ViRG9jID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQodGhpcy50ZW1wbGF0ZSk7XG4gICAgfVxuICAgIGlmICghdGVtcGxhdGVQYXJzZWQgJiYgIXRlbXBsYXRlSXNGcmFnbWVudCkge1xuICAgICAgVmlldy50ZW1wbGF0ZXMuc2V0KHRoaXMudGVtcGxhdGUsIHN1YkRvYy5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIH1cbiAgICB0aGlzLm1haW5WaWV3IHx8IHRoaXMucHJlUnVsZVNldC5hcHBseShzdWJEb2MsIHRoaXMpO1xuICAgIHRoaXMubWFwVGFncyhzdWJEb2MpO1xuICAgIHRoaXMubWFpblZpZXcgfHwgdGhpcy5ydWxlU2V0LmFwcGx5KHN1YkRvYywgdGhpcyk7XG4gICAgaWYgKGdsb2JhbFRoaXMuZGV2TW9kZSA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5maXJzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVDb21tZW50KGBUZW1wbGF0ZSAke3RoaXMuX2lkfSBTdGFydGApO1xuICAgICAgdGhpcy5sYXN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoYFRlbXBsYXRlICR7dGhpcy5faWR9IEVuZGApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZpcnN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIHRoaXMubGFzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuICAgIHRoaXMubm9kZXMucHVzaCh0aGlzLmZpcnN0Tm9kZSwgLi4uQXJyYXkuZnJvbShzdWJEb2MuY2hpbGROb2RlcyksIHRoaXMubGFzdE5vZGUpO1xuICAgIHRoaXMucG9zdFJlbmRlcihwYXJlbnROb2RlKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW5kZXJlZCcpKTtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hBdHRhY2goKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgaWYgKGluc2VydFBvaW50KSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBudWxsKTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgbnVsbCk7XG4gICAgICB9XG4gICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShzdWJEb2MsIHRoaXMubGFzdE5vZGUpO1xuICAgICAgdmFyIHJvb3ROb2RlID0gcGFyZW50Tm9kZS5nZXRSb290Tm9kZSgpO1xuICAgICAgaWYgKHJvb3ROb2RlLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUsIG91dGVyVmlldyk7XG4gICAgICB9IGVsc2UgaWYgKG91dGVyVmlldykge1xuICAgICAgICB2YXIgZmlyc3REb21BdHRhY2ggPSBldmVudCA9PiB7XG4gICAgICAgICAgdmFyIHJvb3ROb2RlID0gcGFyZW50Tm9kZS5nZXRSb290Tm9kZSgpO1xuICAgICAgICAgIHRoaXMuYXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgICAgIHRoaXMuZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSwgb3V0ZXJWaWV3KTtcbiAgICAgICAgICBvdXRlclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcignYXR0YWNoZWQnLCBmaXJzdERvbUF0dGFjaCk7XG4gICAgICAgIH07XG4gICAgICAgIG91dGVyVmlldy5hZGRFdmVudExpc3RlbmVyKCdhdHRhY2hlZCcsIGZpcnN0RG9tQXR0YWNoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5yZW5kZXJDb21wbGV0ZSh0aGlzLm5vZGVzKTtcbiAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgfVxuICBkaXNwYXRjaEF0dGFjaCgpIHtcbiAgICB2YXIge1xuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2F0dGFjaCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICB0YXJnZXQ6IHRoaXNcbiAgICB9KSk7XG4gIH1cbiAgZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSwgdmlldyA9IHVuZGVmaW5lZCkge1xuICAgIHZhciB7XG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhdHRhY2hlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgIG5vZGU6IHBhcmVudE5vZGUsXG4gICAgICAgIHJvb3Q6IHJvb3ROb2RlLFxuICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgfVxuICAgIH0pKTtcbiAgICB0aGlzLmRpc3BhdGNoRG9tQXR0YWNoZWQodmlldyk7XG4gICAgZm9yICh2YXIgY2FsbGJhY2sgb2YgdGhpcy5ub2Rlc0F0dGFjaGVkLml0ZW1zKCkpIHtcbiAgICAgIGNhbGxiYWNrKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICB9XG4gIH1cbiAgZGlzcGF0Y2hEb21BdHRhY2hlZCh2aWV3KSB7XG4gICAgdmFyIHtcbiAgICAgIE5vZGUsXG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB0aGlzLm5vZGVzLmZpbHRlcihuID0+IG4ubm9kZVR5cGUgIT09IE5vZGUuQ09NTUVOVF9OT0RFKS5mb3JFYWNoKGNoaWxkID0+IHtcbiAgICAgIGlmICghY2hpbGQubWF0Y2hlcykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjaGlsZC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZEb21BdHRhY2hlZCcsIHtcbiAgICAgICAgdGFyZ2V0OiBjaGlsZCxcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICAgIF9Eb20uRG9tLm1hcFRhZ3MoY2hpbGQsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgICAgaWYgKCF0YWcubWF0Y2hlcykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tQXR0YWNoZWQnLCB7XG4gICAgICAgICAgdGFyZ2V0OiB0YWcsXG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmVSZW5kZXIocGFyZW50Tm9kZSwgaW5zZXJ0UG9pbnQsIG91dGVyVmlldykge1xuICAgIHZhciB7XG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB2YXIgd2lsbFJlUmVuZGVyID0gdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVSZW5kZXInKSwge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIHRhcmdldDogdGhpcyxcbiAgICAgIHZpZXc6IG91dGVyVmlld1xuICAgIH0pO1xuICAgIGlmICghd2lsbFJlUmVuZGVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBzdWJEb2MgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIGlmICh0aGlzLmZpcnN0Tm9kZS5pc0Nvbm5lY3RlZCkge1xuICAgICAgdmFyIGRldGFjaCA9IHRoaXMubm9kZXNEZXRhY2hlZC5pdGVtcygpO1xuICAgICAgZm9yICh2YXIgaSBpbiBkZXRhY2gpIHtcbiAgICAgICAgZGV0YWNoW2ldKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHN1YkRvYy5hcHBlbmQoLi4udGhpcy5ub2Rlcyk7XG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgIGlmIChpbnNlcnRQb2ludCkge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgbnVsbCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIG51bGwpO1xuICAgICAgfVxuICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3ViRG9jLCB0aGlzLmxhc3ROb2RlKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlUmVuZGVyZWQnKSwge1xuICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICB0YXJnZXQ6IHRoaXMsXG4gICAgICAgIHZpZXc6IG91dGVyVmlld1xuICAgICAgfSk7XG4gICAgICB2YXIgcm9vdE5vZGUgPSBwYXJlbnROb2RlLmdldFJvb3ROb2RlKCk7XG4gICAgICBpZiAocm9vdE5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICB9XG4gIG1hcFRhZ3Moc3ViRG9jKSB7XG4gICAgX0RvbS5Eb20ubWFwVGFncyhzdWJEb2MsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgIGlmICh0YWdbZG9udFBhcnNlXSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGFnLm1hdGNoZXMpIHtcbiAgICAgICAgdGFnID0gdGhpcy5tYXBJbnRlcnBvbGF0YWJsZVRhZyh0YWcpO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXRlbXBsYXRlXScpICYmIHRoaXMubWFwVGVtcGxhdGVUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytc2xvdF0nKSAmJiB0aGlzLm1hcFNsb3RUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtcHJlcmVuZGVyXScpICYmIHRoaXMubWFwUHJlbmRlcmVyVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWxpbmtdJykgJiYgdGhpcy5tYXBMaW5rVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWF0dHJdJykgJiYgdGhpcy5tYXBBdHRyVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWV4cGFuZF0nKSAmJiB0aGlzLm1hcEV4cGFuZGFibGVUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtcmVmXScpICYmIHRoaXMubWFwUmVmVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LW9uXScpICYmIHRoaXMubWFwT25UYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtZWFjaF0nKSAmJiB0aGlzLm1hcEVhY2hUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtYmluZF0nKSAmJiB0aGlzLm1hcEJpbmRUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytd2l0aF0nKSAmJiB0aGlzLm1hcFdpdGhUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtaWZdJykgJiYgdGhpcy5tYXBJZlRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi12aWV3XScpICYmIHRoaXMubWFwVmlld1RhZyh0YWcpIHx8IHRhZztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhZyA9IHRoaXMubWFwSW50ZXJwb2xhdGFibGVUYWcodGFnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0YWcgIT09IHdhbGtlci5jdXJyZW50Tm9kZSkge1xuICAgICAgICB3YWxrZXIuY3VycmVudE5vZGUgPSB0YWc7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wb3N0TWFwcGluZy5mb3JFYWNoKGMgPT4gYygpKTtcbiAgfVxuICBtYXBFeHBhbmRhYmxlVGFnKHRhZykge1xuICAgIC8vIGNvbnN0IHRhZ0NvbXBpbGVyID0gdGhpcy5jb21waWxlRXhwYW5kYWJsZVRhZyh0YWcpO1xuICAgIC8vIGNvbnN0IG5ld1RhZyA9IHRhZ0NvbXBpbGVyKHRoaXMpO1xuICAgIC8vIHRhZy5yZXBsYWNlV2l0aChuZXdUYWcpO1xuICAgIC8vIHJldHVybiBuZXdUYWc7XG5cbiAgICB2YXIgZXhpc3RpbmcgPSB0YWdbZXhwYW5kQmluZF07XG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICBleGlzdGluZygpO1xuICAgICAgdGFnW2V4cGFuZEJpbmRdID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBbcHJveHksIGV4cGFuZFByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKHRoaXMuYXJncywgdGFnLmdldEF0dHJpYnV0ZSgnY3YtZXhwYW5kJyksIHRydWUpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuICAgIGlmICghcHJveHlbZXhwYW5kUHJvcGVydHldKSB7XG4gICAgICBwcm94eVtleHBhbmRQcm9wZXJ0eV0gPSB7fTtcbiAgICB9XG4gICAgcHJveHlbZXhwYW5kUHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UocHJveHlbZXhwYW5kUHJvcGVydHldKTtcbiAgICB0aGlzLm9uUmVtb3ZlKHRhZ1tleHBhbmRCaW5kXSA9IHByb3h5W2V4cGFuZFByb3BlcnR5XS5iaW5kVG8oKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgIGlmIChkIHx8IHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0YWcucmVtb3ZlQXR0cmlidXRlKGssIHYpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodiA9PT0gbnVsbCkge1xuICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGssICcnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGFnLnNldEF0dHJpYnV0ZShrLCB2KTtcbiAgICB9KSk7XG5cbiAgICAvLyBsZXQgZXhwYW5kUHJvcGVydHkgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1leHBhbmQnKTtcbiAgICAvLyBsZXQgZXhwYW5kQXJnID0gQmluZGFibGUubWFrZUJpbmRhYmxlKFxuICAgIC8vIFx0dGhpcy5hcmdzW2V4cGFuZFByb3BlcnR5XSB8fCB7fVxuICAgIC8vICk7XG5cbiAgICAvLyB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1leHBhbmQnKTtcblxuICAgIC8vIGZvcihsZXQgaSBpbiBleHBhbmRBcmcpXG4gICAgLy8ge1xuICAgIC8vIFx0aWYoaSA9PT0gJ25hbWUnIHx8IGkgPT09ICd0eXBlJylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0Y29udGludWU7XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGxldCBkZWJpbmQgPSBleHBhbmRBcmcuYmluZFRvKGksICgodGFnLGkpPT4odik9PntcbiAgICAvLyBcdFx0dGFnLnNldEF0dHJpYnV0ZShpLCB2KTtcbiAgICAvLyBcdH0pKHRhZyxpKSk7XG5cbiAgICAvLyBcdHRoaXMub25SZW1vdmUoKCk9PntcbiAgICAvLyBcdFx0ZGViaW5kKCk7XG4gICAgLy8gXHRcdGlmKGV4cGFuZEFyZy5pc0JvdW5kKCkpXG4gICAgLy8gXHRcdHtcbiAgICAvLyBcdFx0XHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKGV4cGFuZEFyZyk7XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdH0pO1xuICAgIC8vIH1cblxuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBjb21waWxlRXhwYW5kYWJsZVRhZyhzb3VyY2VUYWcpXG4gIC8vIHtcbiAgLy8gXHRyZXR1cm4gKGJpbmRpbmdWaWV3KSA9PiB7XG5cbiAgLy8gXHRcdGNvbnN0IHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUodHJ1ZSk7XG5cbiAgLy8gXHRcdGxldCBleHBhbmRQcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuICAvLyBcdFx0bGV0IGV4cGFuZEFyZyA9IEJpbmRhYmxlLm1ha2UoXG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3LmFyZ3NbZXhwYW5kUHJvcGVydHldIHx8IHt9XG4gIC8vIFx0XHQpO1xuXG4gIC8vIFx0XHR0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1leHBhbmQnKTtcblxuICAvLyBcdFx0Zm9yKGxldCBpIGluIGV4cGFuZEFyZylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0aWYoaSA9PT0gJ25hbWUnIHx8IGkgPT09ICd0eXBlJylcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdGNvbnRpbnVlO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0bGV0IGRlYmluZCA9IGV4cGFuZEFyZy5iaW5kVG8oaSwgKCh0YWcsaSk9Pih2KT0+e1xuICAvLyBcdFx0XHRcdHRhZy5zZXRBdHRyaWJ1dGUoaSwgdik7XG4gIC8vIFx0XHRcdH0pKHRhZyxpKSk7XG5cbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcub25SZW1vdmUoKCk9PntcbiAgLy8gXHRcdFx0XHRkZWJpbmQoKTtcbiAgLy8gXHRcdFx0XHRpZihleHBhbmRBcmcuaXNCb3VuZCgpKVxuICAvLyBcdFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3MoZXhwYW5kQXJnKTtcbiAgLy8gXHRcdFx0XHR9XG4gIC8vIFx0XHRcdH0pO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRyZXR1cm4gdGFnO1xuICAvLyBcdH07XG4gIC8vIH1cblxuICBtYXBBdHRyVGFnKHRhZykge1xuICAgIHZhciB0YWdDb21waWxlciA9IHRoaXMuY29tcGlsZUF0dHJUYWcodGFnKTtcbiAgICB2YXIgbmV3VGFnID0gdGFnQ29tcGlsZXIodGhpcyk7XG4gICAgdGFnLnJlcGxhY2VXaXRoKG5ld1RhZyk7XG4gICAgcmV0dXJuIG5ld1RhZztcblxuICAgIC8vIGxldCBhdHRyUHJvcGVydHkgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1hdHRyJyk7XG5cbiAgICAvLyB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1hdHRyJyk7XG5cbiAgICAvLyBsZXQgcGFpcnMgPSBhdHRyUHJvcGVydHkuc3BsaXQoJywnKTtcbiAgICAvLyBsZXQgYXR0cnMgPSBwYWlycy5tYXAoKHApID0+IHAuc3BsaXQoJzonKSk7XG5cbiAgICAvLyBmb3IgKGxldCBpIGluIGF0dHJzKVxuICAgIC8vIHtcbiAgICAvLyBcdGxldCBwcm94eSAgICAgICAgPSB0aGlzLmFyZ3M7XG4gICAgLy8gXHRsZXQgYmluZFByb3BlcnR5ID0gYXR0cnNbaV1bMV07XG4gICAgLy8gXHRsZXQgcHJvcGVydHkgICAgID0gYmluZFByb3BlcnR5O1xuXG4gICAgLy8gXHRpZihiaW5kUHJvcGVydHkubWF0Y2goL1xcLi8pKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRbcHJveHksIHByb3BlcnR5XSA9IEJpbmRhYmxlLnJlc29sdmUoXG4gICAgLy8gXHRcdFx0dGhpcy5hcmdzXG4gICAgLy8gXHRcdFx0LCBiaW5kUHJvcGVydHlcbiAgICAvLyBcdFx0XHQsIHRydWVcbiAgICAvLyBcdFx0KTtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0bGV0IGF0dHJpYiA9IGF0dHJzW2ldWzBdO1xuXG4gICAgLy8gXHR0aGlzLm9uUmVtb3ZlKHByb3h5LmJpbmRUbyhcbiAgICAvLyBcdFx0cHJvcGVydHlcbiAgICAvLyBcdFx0LCAodik9PntcbiAgICAvLyBcdFx0XHRpZih2ID09IG51bGwpXG4gICAgLy8gXHRcdFx0e1xuICAgIC8vIFx0XHRcdFx0dGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsICcnKTtcbiAgICAvLyBcdFx0XHRcdHJldHVybjtcbiAgICAvLyBcdFx0XHR9XG4gICAgLy8gXHRcdFx0dGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsIHYpO1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHQpKTtcbiAgICAvLyB9XG5cbiAgICAvLyByZXR1cm4gdGFnO1xuICB9XG4gIGNvbXBpbGVBdHRyVGFnKHNvdXJjZVRhZykge1xuICAgIHZhciBhdHRyUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1hdHRyJyk7XG4gICAgdmFyIHBhaXJzID0gYXR0clByb3BlcnR5LnNwbGl0KC9bLDtdLyk7XG4gICAgdmFyIGF0dHJzID0gcGFpcnMubWFwKHAgPT4gcC5zcGxpdCgnOicpKTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1hdHRyJyk7XG4gICAgcmV0dXJuIGJpbmRpbmdWaWV3ID0+IHtcbiAgICAgIHZhciB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgdmFyIF9sb29wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYmluZFByb3BlcnR5ID0gYXR0cnNbaV1bMV0gfHwgYXR0cnNbaV1bMF07XG4gICAgICAgIHZhciBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKGJpbmRpbmdWaWV3LmFyZ3MsIGJpbmRQcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgICAgIHZhciBhdHRyaWIgPSBhdHRyc1tpXVswXTtcbiAgICAgICAgYmluZGluZ1ZpZXcub25SZW1vdmUocHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIGlmIChkIHx8IHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFnLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWIsIHYpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsICcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsIHYpO1xuICAgICAgICB9KSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgaSBpbiBhdHRycykge1xuICAgICAgICBfbG9vcCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRhZztcbiAgICB9O1xuICB9XG4gIG1hcEludGVycG9sYXRhYmxlVGFnKHRhZykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyIHJlZ2V4ID0gdGhpcy5pbnRlcnBvbGF0ZVJlZ2V4O1xuICAgIHZhciB7XG4gICAgICBOb2RlLFxuICAgICAgZG9jdW1lbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgaWYgKHRhZy5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICAgIHZhciBvcmlnaW5hbCA9IHRhZy5ub2RlVmFsdWU7XG4gICAgICBpZiAoIXRoaXMuaW50ZXJwb2xhdGFibGUob3JpZ2luYWwpKSB7XG4gICAgICAgIHJldHVybiB0YWc7XG4gICAgICB9XG4gICAgICB2YXIgaGVhZGVyID0gMDtcbiAgICAgIHZhciBtYXRjaDtcbiAgICAgIHZhciBfbG9vcDIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGJpbmRQcm9wZXJ0eSA9IG1hdGNoWzJdO1xuICAgICAgICAgIHZhciB1bnNhZmVIdG1sID0gZmFsc2U7XG4gICAgICAgICAgdmFyIHVuc2FmZVZpZXcgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgcHJvcGVydHlTcGxpdCA9IGJpbmRQcm9wZXJ0eS5zcGxpdCgnfCcpO1xuICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IGZhbHNlO1xuICAgICAgICAgIGlmIChwcm9wZXJ0eVNwbGl0Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyID0gX3RoaXMuc3RyaW5nVHJhbnNmb3JtZXIocHJvcGVydHlTcGxpdC5zbGljZSgxKSk7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBwcm9wZXJ0eVNwbGl0WzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5LnN1YnN0cigwLCAyKSA9PT0gJyQkJykge1xuICAgICAgICAgICAgdW5zYWZlSHRtbCA9IHRydWU7XG4gICAgICAgICAgICB1bnNhZmVWaWV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eS5zdWJzdHIoMik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgICAgICAgIHVuc2FmZUh0bWwgPSB0cnVlO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gYmluZFByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5zdWJzdHIoMCwgMykgPT09ICcwMDAnKSB7XG4gICAgICAgICAgICBleHBhbmQgPSB0cnVlO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gYmluZFByb3BlcnR5LnN1YnN0cigzKTtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgc3RhdGljUHJlZml4ID0gb3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlciwgbWF0Y2guaW5kZXgpO1xuICAgICAgICAgIGhlYWRlciA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMV0ubGVuZ3RoO1xuICAgICAgICAgIHZhciBzdGF0aWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RhdGljUHJlZml4KTtcbiAgICAgICAgICBzdGF0aWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdGF0aWNOb2RlLCB0YWcpO1xuICAgICAgICAgIHZhciBkeW5hbWljTm9kZTtcbiAgICAgICAgICBpZiAodW5zYWZlSHRtbCkge1xuICAgICAgICAgICAgZHluYW1pY05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHluYW1pY05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGR5bmFtaWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgICAgIHZhciBwcm94eSA9IF90aGlzLmFyZ3M7XG4gICAgICAgICAgdmFyIHByb3BlcnR5ID0gYmluZFByb3BlcnR5O1xuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkubWF0Y2goL1xcLi8pKSB7XG4gICAgICAgICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKF90aGlzLmFyZ3MsIGJpbmRQcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkeW5hbWljTm9kZSwgdGFnKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHByb3h5ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcmV0dXJuIDE7IC8vIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIHByb3h5ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UocHJveHkpO1xuICAgICAgICAgIHZhciBkZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0KSA9PiB7XG4gICAgICAgICAgICBpZiAodFtrXSAhPT0gdiAmJiAodFtrXSBpbnN0YW5jZW9mIFZpZXcgfHwgdFtrXSBpbnN0YW5jZW9mIE5vZGUgfHwgdFtrXSBpbnN0YW5jZW9mIF9UYWcuVGFnKSkge1xuICAgICAgICAgICAgICBpZiAoIXRba10ucHJlc2VydmUpIHtcbiAgICAgICAgICAgICAgICB0W2tdLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodW5zYWZlVmlldyAmJiAhKHYgaW5zdGFuY2VvZiBWaWV3KSkge1xuICAgICAgICAgICAgICB2YXIgdW5zYWZlVGVtcGxhdGUgPSB2ICE9PSBudWxsICYmIHYgIT09IHZvaWQgMCA/IHYgOiAnJztcbiAgICAgICAgICAgICAgdiA9IG5ldyBWaWV3KF90aGlzLmFyZ3MsIF90aGlzKTtcbiAgICAgICAgICAgICAgdi50ZW1wbGF0ZSA9IHVuc2FmZVRlbXBsYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyKSB7XG4gICAgICAgICAgICAgIHYgPSB0cmFuc2Zvcm1lcih2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgVmlldykge1xuICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgdltfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSBfdGhpcztcbiAgICAgICAgICAgICAgdi5yZW5kZXIodGFnLnBhcmVudE5vZGUsIGR5bmFtaWNOb2RlLCBfdGhpcyk7XG4gICAgICAgICAgICAgIHZhciBjbGVhbnVwID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdi5wcmVzZXJ2ZSkge1xuICAgICAgICAgICAgICAgICAgdi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKGNsZWFudXApO1xuICAgICAgICAgICAgICB2Lm9uUmVtb3ZlKCgpID0+IF90aGlzLl9vblJlbW92ZS5yZW1vdmUoY2xlYW51cCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHYsIGR5bmFtaWNOb2RlKTtcbiAgICAgICAgICAgICAgX3RoaXMub25SZW1vdmUoKCkgPT4gdi5yZW1vdmUoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgaWYgKHYubm9kZSkge1xuICAgICAgICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh2Lm5vZGUsIGR5bmFtaWNOb2RlKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5vblJlbW92ZSgoKSA9PiB2LnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2LnJlbW92ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAodiBpbnN0YW5jZW9mIE9iamVjdCAmJiB2Ll9fdG9TdHJpbmcgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgIHYgPSB2Ll9fdG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAodW5zYWZlSHRtbCkge1xuICAgICAgICAgICAgICAgIGR5bmFtaWNOb2RlLmlubmVySFRNTCA9IHY7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gdjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHluYW1pY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgX3RoaXMub25SZW1vdmUoZGViaW5kKTtcbiAgICAgICAgfSxcbiAgICAgICAgX3JldDtcbiAgICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMob3JpZ2luYWwpKSB7XG4gICAgICAgIF9yZXQgPSBfbG9vcDIoKTtcbiAgICAgICAgaWYgKF9yZXQgPT09IDApIGNvbnRpbnVlO1xuICAgICAgICBpZiAoX3JldCA9PT0gMSkgYnJlYWs7XG4gICAgICB9XG4gICAgICB2YXIgc3RhdGljU3VmZml4ID0gb3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlcik7XG4gICAgICB2YXIgc3RhdGljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0YXRpY1N1ZmZpeCk7XG4gICAgICBzdGF0aWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN0YXRpY05vZGUsIHRhZyk7XG4gICAgICB0YWcubm9kZVZhbHVlID0gJyc7XG4gICAgfSBlbHNlIGlmICh0YWcubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICB2YXIgX2xvb3AzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIV90aGlzLmludGVycG9sYXRhYmxlKHRhZy5hdHRyaWJ1dGVzW2ldLnZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHZhciBoZWFkZXIgPSAwO1xuICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IHRhZy5hdHRyaWJ1dGVzW2ldLnZhbHVlO1xuICAgICAgICB2YXIgYXR0cmlidXRlID0gdGFnLmF0dHJpYnV0ZXNbaV07XG4gICAgICAgIHZhciBiaW5kUHJvcGVydGllcyA9IHt9O1xuICAgICAgICB2YXIgc2VnbWVudHMgPSBbXTtcbiAgICAgICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhvcmlnaW5hbCkpIHtcbiAgICAgICAgICBzZWdtZW50cy5wdXNoKG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgICAgaWYgKCFiaW5kUHJvcGVydGllc1ttYXRjaFsyXV0pIHtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0aWVzW21hdGNoWzJdXSA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBiaW5kUHJvcGVydGllc1ttYXRjaFsyXV0ucHVzaChzZWdtZW50cy5sZW5ndGgpO1xuICAgICAgICAgIHNlZ21lbnRzLnB1c2gobWF0Y2hbMV0pO1xuICAgICAgICAgIGhlYWRlciA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMV0ubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHNlZ21lbnRzLnB1c2gob3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlcikpO1xuICAgICAgICB2YXIgX2xvb3A0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBwcm94eSA9IF90aGlzLmFyZ3M7XG4gICAgICAgICAgdmFyIHByb3BlcnR5ID0gajtcbiAgICAgICAgICB2YXIgcHJvcGVydHlTcGxpdCA9IGouc3BsaXQoJ3wnKTtcbiAgICAgICAgICB2YXIgdHJhbnNmb3JtZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgbG9uZ1Byb3BlcnR5ID0gajtcbiAgICAgICAgICBpZiAocHJvcGVydHlTcGxpdC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IF90aGlzLnN0cmluZ1RyYW5zZm9ybWVyKHByb3BlcnR5U3BsaXQuc2xpY2UoMSkpO1xuICAgICAgICAgICAgcHJvcGVydHkgPSBwcm9wZXJ0eVNwbGl0WzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocHJvcGVydHkubWF0Y2goL1xcLi8pKSB7XG4gICAgICAgICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKF90aGlzLmFyZ3MsIHByb3BlcnR5LCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG1hdGNoaW5nID0gW107XG4gICAgICAgICAgdmFyIGJpbmRQcm9wZXJ0eSA9IGo7XG4gICAgICAgICAgdmFyIG1hdGNoaW5nU2VnbWVudHMgPSBiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldO1xuICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lcikge1xuICAgICAgICAgICAgICB2ID0gdHJhbnNmb3JtZXIodik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBfaSBpbiBiaW5kUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBmb3IgKHZhciBfaiBpbiBiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldKSB7XG4gICAgICAgICAgICAgICAgc2VnbWVudHNbYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XVtfal1dID0gdFtfaV07XG4gICAgICAgICAgICAgICAgaWYgKGsgPT09IHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgICBzZWdtZW50c1tiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldW19qXV0gPSB2O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUubmFtZSwgc2VnbWVudHMuam9pbignJykpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgX3RoaXMudW5wYXVzZUNhbGxiYWNrcy5zZXQoYXR0cmlidXRlLCAoKSA9PiB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBzZWdtZW50cy5qb2luKCcnKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfTtcbiAgICAgICAgZm9yICh2YXIgaiBpbiBiaW5kUHJvcGVydGllcykge1xuICAgICAgICAgIF9sb29wNCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWcuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoX2xvb3AzKCkpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFJlZlRhZyh0YWcpIHtcbiAgICB2YXIgcmVmQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXJlZicpO1xuICAgIHZhciBbcmVmUHJvcCwgcmVmQ2xhc3NuYW1lID0gbnVsbCwgcmVmS2V5ID0gbnVsbF0gPSByZWZBdHRyLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHJlZkNsYXNzID0gX1RhZy5UYWc7XG4gICAgaWYgKHJlZkNsYXNzbmFtZSkge1xuICAgICAgcmVmQ2xhc3MgPSB0aGlzLnN0cmluZ1RvQ2xhc3MocmVmQ2xhc3NuYW1lKTtcbiAgICB9XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtcmVmJyk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhZywgJ19fX3RhZ19fXycsIHtcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIHRhZy5fX190YWdfX18gPSBudWxsO1xuICAgICAgdGFnLnJlbW92ZSgpO1xuICAgIH0pO1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIHZhciBkaXJlY3QgPSB0aGlzO1xuICAgIGlmICh0aGlzLnZpZXdMaXN0KSB7XG4gICAgICBwYXJlbnQgPSB0aGlzLnZpZXdMaXN0LnBhcmVudDtcbiAgICAgIC8vIGlmKCF0aGlzLnZpZXdMaXN0LnBhcmVudC50YWdzW3JlZlByb3BdKVxuICAgICAgLy8ge1xuICAgICAgLy8gXHR0aGlzLnZpZXdMaXN0LnBhcmVudC50YWdzW3JlZlByb3BdID0gW107XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIGxldCByZWZLZXlWYWwgPSB0aGlzLmFyZ3NbcmVmS2V5XTtcblxuICAgICAgLy8gdGhpcy52aWV3TGlzdC5wYXJlbnQudGFnc1tyZWZQcm9wXVtyZWZLZXlWYWxdID0gbmV3IHJlZkNsYXNzKFxuICAgICAgLy8gXHR0YWcsIHRoaXMsIHJlZlByb3AsIHJlZktleVZhbFxuICAgICAgLy8gKTtcbiAgICB9XG4gICAgLy8gZWxzZVxuICAgIC8vIHtcbiAgICAvLyBcdHRoaXMudGFnc1tyZWZQcm9wXSA9IG5ldyByZWZDbGFzcyhcbiAgICAvLyBcdFx0dGFnLCB0aGlzLCByZWZQcm9wXG4gICAgLy8gXHQpO1xuICAgIC8vIH1cblxuICAgIHZhciB0YWdPYmplY3QgPSBuZXcgcmVmQ2xhc3ModGFnLCB0aGlzLCByZWZQcm9wLCB1bmRlZmluZWQsIGRpcmVjdCk7XG4gICAgdGFnLl9fX3RhZ19fXyA9IHRhZ09iamVjdDtcbiAgICB0aGlzLnRhZ3NbcmVmUHJvcF0gPSB0YWdPYmplY3Q7XG4gICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgdmFyIHJlZktleVZhbCA9IHRoaXMuYXJnc1tyZWZLZXldO1xuICAgICAgaWYgKHJlZktleVZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICghcGFyZW50LnRhZ3NbcmVmUHJvcF0pIHtcbiAgICAgICAgICBwYXJlbnQudGFnc1tyZWZQcm9wXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudC50YWdzW3JlZlByb3BdW3JlZktleVZhbF0gPSB0YWdPYmplY3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJlbnQudGFnc1tyZWZQcm9wXSA9IHRhZ09iamVjdDtcbiAgICAgIH1cbiAgICAgIGlmICghcGFyZW50LnBhcmVudCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwQmluZFRhZyh0YWcpIHtcbiAgICB2YXIgYmluZEFyZyA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWJpbmQnKTtcbiAgICB2YXIgcHJveHkgPSB0aGlzLmFyZ3M7XG4gICAgdmFyIHByb3BlcnR5ID0gYmluZEFyZztcbiAgICB2YXIgdG9wID0gbnVsbDtcbiAgICBpZiAoYmluZEFyZy5tYXRjaCgvXFwuLykpIHtcbiAgICAgIFtwcm94eSwgcHJvcGVydHksIHRvcF0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZSh0aGlzLmFyZ3MsIGJpbmRBcmcsIHRydWUpO1xuICAgIH1cbiAgICBpZiAocHJveHkgIT09IHRoaXMuYXJncykge1xuICAgICAgdGhpcy5zdWJCaW5kaW5nc1tiaW5kQXJnXSA9IHRoaXMuc3ViQmluZGluZ3NbYmluZEFyZ10gfHwgW107XG4gICAgICB0aGlzLm9uUmVtb3ZlKHRoaXMuYXJncy5iaW5kVG8odG9wLCAoKSA9PiB7XG4gICAgICAgIHdoaWxlICh0aGlzLnN1YkJpbmRpbmdzLmxlbmd0aCkge1xuICAgICAgICAgIHRoaXMuc3ViQmluZGluZ3Muc2hpZnQoKSgpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHZhciB1bnNhZmVIdG1sID0gZmFsc2U7XG4gICAgaWYgKHByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICBwcm9wZXJ0eSA9IHByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgIHVuc2FmZUh0bWwgPSB0cnVlO1xuICAgIH1cbiAgICB2YXIgYXV0b0V2ZW50U3RhcnRlZCA9IGZhbHNlO1xuICAgIHZhciBkZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICBpZiAoKHAgaW5zdGFuY2VvZiBWaWV3IHx8IHAgaW5zdGFuY2VvZiBOb2RlIHx8IHAgaW5zdGFuY2VvZiBfVGFnLlRhZykgJiYgcCAhPT0gdikge1xuICAgICAgICBwLnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgaWYgKFsnSU5QVVQnLCAnU0VMRUNUJywgJ1RFWFRBUkVBJ10uaW5jbHVkZXModGFnLnRhZ05hbWUpKSB7XG4gICAgICAgIHZhciBfdHlwZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcbiAgICAgICAgaWYgKF90eXBlICYmIF90eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICB0YWcuY2hlY2tlZCA9ICEhdjtcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSAmJiBfdHlwZS50b0xvd2VyQ2FzZSgpID09PSAncmFkaW8nKSB7XG4gICAgICAgICAgdGFnLmNoZWNrZWQgPSB2ID09IHRhZy52YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSAhPT0gJ2ZpbGUnKSB7XG4gICAgICAgICAgaWYgKHRhZy50YWdOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgICAgICAgdmFyIHNlbGVjdE9wdGlvbiA9ICgpID0+IHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWcub3B0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb24gPSB0YWcub3B0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uLnZhbHVlID09IHYpIHtcbiAgICAgICAgICAgICAgICAgIHRhZy5zZWxlY3RlZEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzZWxlY3RPcHRpb24oKTtcbiAgICAgICAgICAgIHRoaXMubm9kZXNBdHRhY2hlZC5hZGQoc2VsZWN0T3B0aW9uKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGFnLnZhbHVlID0gdiA9PSBudWxsID8gJycgOiB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoYXV0b0V2ZW50U3RhcnRlZCkge1xuICAgICAgICAgIHRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZBdXRvQ2hhbmdlZCcsIHtcbiAgICAgICAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgYXV0b0V2ZW50U3RhcnRlZCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodiBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgICAgICBmb3IgKHZhciBub2RlIG9mIHRhZy5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICBub2RlLnJlbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2W19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IHRoaXM7XG4gICAgICAgICAgdi5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICAgIHRhZy5pbnNlcnQodik7XG4gICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICAgICAgdGFnLmFwcGVuZCh2Lm5vZGUpO1xuICAgICAgICB9IGVsc2UgaWYgKHVuc2FmZUh0bWwpIHtcbiAgICAgICAgICBpZiAodGFnLmlubmVySFRNTCAhPT0gdikge1xuICAgICAgICAgICAgdiA9IFN0cmluZyh2KTtcbiAgICAgICAgICAgIGlmICh0YWcuaW5uZXJIVE1MID09PSB2LnN1YnN0cmluZygwLCB0YWcuaW5uZXJIVE1MLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgdGFnLmlubmVySFRNTCArPSB2LnN1YnN0cmluZyh0YWcuaW5uZXJIVE1MLmxlbmd0aCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3IgKHZhciBfbm9kZSBvZiB0YWcuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgIF9ub2RlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHRhZy5pbm5lckhUTUwgPSB2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX0RvbS5Eb20ubWFwVGFncyh0YWcsIGZhbHNlLCB0ID0+IHRbZG9udFBhcnNlXSA9IHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGFnLnRleHRDb250ZW50ICE9PSB2KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBfbm9kZTIgb2YgdGFnLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgX25vZGUyLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFnLnRleHRDb250ZW50ID0gdjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAocHJveHkgIT09IHRoaXMuYXJncykge1xuICAgICAgdGhpcy5zdWJCaW5kaW5nc1tiaW5kQXJnXS5wdXNoKGRlYmluZCk7XG4gICAgfVxuICAgIHRoaXMub25SZW1vdmUoZGViaW5kKTtcbiAgICB2YXIgdHlwZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcbiAgICB2YXIgbXVsdGkgPSB0YWcuZ2V0QXR0cmlidXRlKCdtdWx0aXBsZScpO1xuICAgIHZhciBpbnB1dExpc3RlbmVyID0gZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50LnRhcmdldCAhPT0gdGFnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlICYmIHR5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICBpZiAodGFnLmNoZWNrZWQpIHtcbiAgICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBldmVudC50YXJnZXQuZ2V0QXR0cmlidXRlKCd2YWx1ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50LnRhcmdldC5tYXRjaGVzKCdbY29udGVudGVkaXRhYmxlPXRydWVdJykpIHtcbiAgICAgICAgcHJveHlbcHJvcGVydHldID0gZXZlbnQudGFyZ2V0LmlubmVySFRNTDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2ZpbGUnICYmIG11bHRpKSB7XG4gICAgICAgIHZhciBmaWxlcyA9IEFycmF5LmZyb20oZXZlbnQudGFyZ2V0LmZpbGVzKTtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBwcm94eVtwcm9wZXJ0eV0gfHwgX0JpbmRhYmxlLkJpbmRhYmxlLm9uRGVjayhwcm94eSwgcHJvcGVydHkpO1xuICAgICAgICBpZiAoIWN1cnJlbnQgfHwgIWZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGZpbGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBfbG9vcDUgPSBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgaWYgKGZpbGVzW2ldICE9PSBjdXJyZW50W2ldKSB7XG4gICAgICAgICAgICAgIGZpbGVzW2ldLnRvSlNPTiA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgbmFtZTogZmlsZVtpXS5uYW1lLFxuICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZVtpXS5zaXplLFxuICAgICAgICAgICAgICAgICAgdHlwZTogZmlsZVtpXS50eXBlLFxuICAgICAgICAgICAgICAgICAgZGF0ZTogZmlsZVtpXS5sYXN0TW9kaWZpZWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjdXJyZW50W2ldID0gZmlsZXNbaV07XG4gICAgICAgICAgICAgIHJldHVybiAxOyAvLyBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgZm9yICh2YXIgaSBpbiBmaWxlcykge1xuICAgICAgICAgICAgaWYgKF9sb29wNShpKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdmaWxlJyAmJiAhbXVsdGkgJiYgZXZlbnQudGFyZ2V0LmZpbGVzLmxlbmd0aCkge1xuICAgICAgICB2YXIgX2ZpbGUgPSBldmVudC50YXJnZXQuZmlsZXMuaXRlbSgwKTtcbiAgICAgICAgX2ZpbGUudG9KU09OID0gKCkgPT4ge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBfZmlsZS5uYW1lLFxuICAgICAgICAgICAgc2l6ZTogX2ZpbGUuc2l6ZSxcbiAgICAgICAgICAgIHR5cGU6IF9maWxlLnR5cGUsXG4gICAgICAgICAgICBkYXRlOiBfZmlsZS5sYXN0TW9kaWZpZWRcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBfZmlsZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGlmICh0eXBlID09PSAnZmlsZScgfHwgdHlwZSA9PT0gJ3JhZGlvJykge1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCd2YWx1ZS1jaGFuZ2VkJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgfVxuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgaWYgKHR5cGUgPT09ICdmaWxlJyB8fCB0eXBlID09PSAncmFkaW8nKSB7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdpbnB1dCcsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCd2YWx1ZS1jaGFuZ2VkJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtYmluZCcpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwT25UYWcodGFnKSB7XG4gICAgdmFyIHJlZmVyZW50cyA9IFN0cmluZyh0YWcuZ2V0QXR0cmlidXRlKCdjdi1vbicpKTtcbiAgICByZWZlcmVudHMuc3BsaXQoJzsnKS5tYXAoYSA9PiBhLnNwbGl0KCc6JykpLmZvckVhY2goYSA9PiB7XG4gICAgICBhID0gYS5tYXAoYSA9PiBhLnRyaW0oKSk7XG4gICAgICB2YXIgYXJnTGVuID0gYS5sZW5ndGg7XG4gICAgICB2YXIgZXZlbnROYW1lID0gU3RyaW5nKGEuc2hpZnQoKSkudHJpbSgpO1xuICAgICAgdmFyIGNhbGxiYWNrTmFtZSA9IFN0cmluZyhhLnNoaWZ0KCkgfHwgZXZlbnROYW1lKS50cmltKCk7XG4gICAgICB2YXIgZXZlbnRGbGFncyA9IFN0cmluZyhhLnNoaWZ0KCkgfHwgJycpLnRyaW0oKTtcbiAgICAgIHZhciBhcmdMaXN0ID0gW107XG4gICAgICB2YXIgZ3JvdXBzID0gLyhcXHcrKSg/OlxcKChbJFxcd1xccy0nXCIsXSspXFwpKT8vLmV4ZWMoY2FsbGJhY2tOYW1lKTtcbiAgICAgIGlmIChncm91cHMpIHtcbiAgICAgICAgY2FsbGJhY2tOYW1lID0gZ3JvdXBzWzFdLnJlcGxhY2UoLyheW1xcc1xcbl0rfFtcXHNcXG5dKyQpLywgJycpO1xuICAgICAgICBpZiAoZ3JvdXBzWzJdKSB7XG4gICAgICAgICAgYXJnTGlzdCA9IGdyb3Vwc1syXS5zcGxpdCgnLCcpLm1hcChzID0+IHMudHJpbSgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFhcmdMaXN0Lmxlbmd0aCkge1xuICAgICAgICBhcmdMaXN0LnB1c2goJyRldmVudCcpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudE5hbWUgfHwgYXJnTGVuID09PSAxKSB7XG4gICAgICAgIGV2ZW50TmFtZSA9IGNhbGxiYWNrTmFtZTtcbiAgICAgIH1cbiAgICAgIHZhciBldmVudExpc3RlbmVyID0gZXZlbnQgPT4ge1xuICAgICAgICB2YXIgZXZlbnRNZXRob2Q7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgX2xvb3A2ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXIgPSBwYXJlbnQuY29udHJvbGxlcjtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udHJvbGxlcltjYWxsYmFja05hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGV2ZW50TWV0aG9kID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyW2NhbGxiYWNrTmFtZV0oLi4uYXJncyk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIHJldHVybiAwOyAvLyBicmVha1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyZW50W2NhbGxiYWNrTmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgZXZlbnRNZXRob2QgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgICAgIHBhcmVudFtjYWxsYmFja05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByZXR1cm4gMDsgLy8gYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwYXJlbnQucGFyZW50KSB7XG4gICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gMDsgLy8gYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIF9yZXQyO1xuICAgICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgICAgX3JldDIgPSBfbG9vcDYoKTtcbiAgICAgICAgICBpZiAoX3JldDIgPT09IDApIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhcmdSZWZzID0gYXJnTGlzdC5tYXAoYXJnID0+IHtcbiAgICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgICAgaWYgKE51bWJlcihhcmcpID09IGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJ2V2ZW50JyB8fCBhcmcgPT09ICckZXZlbnQnKSB7XG4gICAgICAgICAgICByZXR1cm4gZXZlbnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckdmlldycpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckY29udHJvbGxlcicpIHtcbiAgICAgICAgICAgIHJldHVybiBjb250cm9sbGVyO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHRhZycpIHtcbiAgICAgICAgICAgIHJldHVybiB0YWc7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckcGFyZW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHN1YnZpZXcnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyBpbiB0aGlzLmFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFyZ3NbYXJnXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoID0gL15bJ1wiXShbXFx3LV0rPylbXCInXSQvLmV4ZWMoYXJnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghKHR5cGVvZiBldmVudE1ldGhvZCA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7Y2FsbGJhY2tOYW1lfSBpcyBub3QgZGVmaW5lZCBvbiBWaWV3IG9iamVjdC5gICsgXCJcXG5cIiArIGBUYWc6YCArIFwiXFxuXCIgKyBgJHt0YWcub3V0ZXJIVE1MfWApO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50TWV0aG9kKC4uLmFyZ1JlZnMpO1xuICAgICAgfTtcbiAgICAgIHZhciBldmVudE9wdGlvbnMgPSB7fTtcbiAgICAgIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdwJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLnBhc3NpdmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdQJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLnBhc3NpdmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdjJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLmNhcHR1cmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdDJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLmNhcHR1cmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdvJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLm9uY2UgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdPJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLm9uY2UgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHN3aXRjaCAoZXZlbnROYW1lKSB7XG4gICAgICAgIGNhc2UgJ19pbml0JzpcbiAgICAgICAgICBldmVudExpc3RlbmVyKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ19hdHRhY2gnOlxuICAgICAgICAgIHRoaXMubm9kZXNBdHRhY2hlZC5hZGQoZXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ19kZXRhY2gnOlxuICAgICAgICAgIHRoaXMubm9kZXNEZXRhY2hlZC5hZGQoZXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBldmVudExpc3RlbmVyLCBldmVudE9wdGlvbnMpO1xuICAgICAgICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBldmVudExpc3RlbmVyLCBldmVudE9wdGlvbnMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtldmVudE5hbWUsIGNhbGxiYWNrTmFtZSwgYXJnTGlzdF07XG4gICAgfSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3Ytb24nKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcExpbmtUYWcodGFnKSB7XG4gICAgLy8gY29uc3QgdGFnQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVMaW5rVGFnKHRhZyk7XG5cbiAgICAvLyBjb25zdCBuZXdUYWcgPSB0YWdDb21waWxlcih0aGlzKTtcblxuICAgIC8vIHRhZy5yZXBsYWNlV2l0aChuZXdUYWcpO1xuXG4gICAgLy8gcmV0dXJuIG5ld1RhZztcblxuICAgIHZhciBsaW5rQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgICB0YWcuc2V0QXR0cmlidXRlKCdocmVmJywgbGlua0F0dHIpO1xuICAgIHZhciBsaW5rQ2xpY2sgPSBldmVudCA9PiB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGxpbmtBdHRyLnN1YnN0cmluZygwLCA0KSA9PT0gJ2h0dHAnIHx8IGxpbmtBdHRyLnN1YnN0cmluZygwLCAyKSA9PT0gJy8vJykge1xuICAgICAgICBnbG9iYWxUaGlzLm9wZW4odGFnLmdldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmtBdHRyKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIF9Sb3V0ZXIuUm91dGVyLmdvKHRhZy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSk7XG4gICAgfTtcbiAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaW5rQ2xpY2spO1xuICAgIHRoaXMub25SZW1vdmUoKCh0YWcsIGV2ZW50TGlzdGVuZXIpID0+ICgpID0+IHtcbiAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50TGlzdGVuZXIpO1xuICAgICAgdGFnID0gdW5kZWZpbmVkO1xuICAgICAgZXZlbnRMaXN0ZW5lciA9IHVuZGVmaW5lZDtcbiAgICB9KSh0YWcsIGxpbmtDbGljaykpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gY29tcGlsZUxpbmtUYWcoc291cmNlVGFnKVxuICAvLyB7XG4gIC8vIFx0Y29uc3QgbGlua0F0dHIgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1saW5rJyk7XG4gIC8vIFx0c291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAvLyBcdHJldHVybiAoYmluZGluZ1ZpZXcpID0+IHtcbiAgLy8gXHRcdGNvbnN0IHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUodHJ1ZSk7XG4gIC8vIFx0XHR0YWcuc2V0QXR0cmlidXRlKCdocmVmJywgbGlua0F0dHIpO1xuICAvLyBcdFx0cmV0dXJuIHRhZztcbiAgLy8gXHR9O1xuICAvLyB9XG5cbiAgbWFwUHJlbmRlcmVyVGFnKHRhZykge1xuICAgIHZhciBwcmVyZW5kZXJBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtcHJlcmVuZGVyJyk7XG4gICAgdmFyIHByZXJlbmRlcmluZyA9IGdsb2JhbFRoaXMucHJlcmVuZGVyZXIgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvcHJlcmVuZGVyL2kpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXByZXJlbmRlcicpO1xuICAgIGlmIChwcmVyZW5kZXJpbmcpIHtcbiAgICAgIGdsb2JhbFRoaXMucHJlcmVuZGVyZXIgPSBnbG9iYWxUaGlzLnByZXJlbmRlcmVyIHx8IHRydWU7XG4gICAgfVxuICAgIGlmIChwcmVyZW5kZXJBdHRyID09PSAnbmV2ZXInICYmIHByZXJlbmRlcmluZyB8fCBwcmVyZW5kZXJBdHRyID09PSAnb25seScgJiYgIXByZXJlbmRlcmluZykge1xuICAgICAgdGhpcy5wb3N0TWFwcGluZy5hZGQoKCkgPT4gdGFnLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGFnKSk7XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwV2l0aFRhZyh0YWcpIHtcbiAgICB2YXIgX3RoaXMyID0gdGhpcztcbiAgICB2YXIgd2l0aEF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi13aXRoJyk7XG4gICAgdmFyIGNhcnJ5QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWNhcnJ5Jyk7XG4gICAgdmFyIHZpZXdBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXdpdGgnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1jYXJyeScpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgdmlld0NsYXNzID0gdmlld0F0dHIgPyB0aGlzLnN0cmluZ1RvQ2xhc3Modmlld0F0dHIpIDogVmlldztcbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi50YWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgY2FycnlQcm9wcyA9IFtdO1xuICAgIGlmIChjYXJyeUF0dHIpIHtcbiAgICAgIGNhcnJ5UHJvcHMgPSBjYXJyeUF0dHIuc3BsaXQoJywnKS5tYXAocyA9PiBzLnRyaW0oKSk7XG4gICAgfVxuICAgIHZhciBkZWJpbmQgPSB0aGlzLmFyZ3MuYmluZFRvKHdpdGhBdHRyLCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgaWYgKHRoaXMud2l0aFZpZXdzLmhhcyh0YWcpKSB7XG4gICAgICAgIHRoaXMud2l0aFZpZXdzLmRlbGV0ZSh0YWcpO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHRhZy5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhZy5yZW1vdmVDaGlsZCh0YWcuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgICB2YXIgdmlldyA9IG5ldyB2aWV3Q2xhc3Moe30sIHRoaXMpO1xuICAgICAgdGhpcy5vblJlbW92ZSgodmlldyA9PiAoKSA9PiB7XG4gICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICB9KSh2aWV3KSk7XG4gICAgICB2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gICAgICB2YXIgX2xvb3A3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGViaW5kID0gX3RoaXMyLmFyZ3MuYmluZFRvKGNhcnJ5UHJvcHNbaV0sICh2LCBrKSA9PiB7XG4gICAgICAgICAgdmlldy5hcmdzW2tdID0gdjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZpZXcub25SZW1vdmUoZGViaW5kKTtcbiAgICAgICAgX3RoaXMyLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBkZWJpbmQoKTtcbiAgICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBpIGluIGNhcnJ5UHJvcHMpIHtcbiAgICAgICAgX2xvb3A3KCk7XG4gICAgICB9XG4gICAgICB2YXIgX2xvb3A4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdiA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHYpO1xuICAgICAgICB2YXIgZGViaW5kID0gdi5iaW5kVG8oX2kyLCAodnYsIGtrLCB0dCwgZGQpID0+IHtcbiAgICAgICAgICBpZiAoIWRkKSB7XG4gICAgICAgICAgICB2aWV3LmFyZ3Nba2tdID0gdnY7XG4gICAgICAgICAgfSBlbHNlIGlmIChrayBpbiB2aWV3LmFyZ3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2aWV3LmFyZ3Nba2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkZWJpbmRVcCA9IHZpZXcuYXJncy5iaW5kVG8oX2kyLCAodnYsIGtrLCB0dCwgZGQpID0+IHtcbiAgICAgICAgICBpZiAoIWRkKSB7XG4gICAgICAgICAgICB2W2trXSA9IHZ2O1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2sgaW4gdikge1xuICAgICAgICAgICAgZGVsZXRlIHZba2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzMi5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgZGViaW5kKCk7XG4gICAgICAgICAgaWYgKCF2LmlzQm91bmQoKSkge1xuICAgICAgICAgICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3Modik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB2aWV3Lm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBkZWJpbmQoKTtcbiAgICAgICAgICBpZiAoIXYuaXNCb3VuZCgpKSB7XG4gICAgICAgICAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh2KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIF9pMiBpbiB2KSB7XG4gICAgICAgIGlmIChfbG9vcDgoKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICB2aWV3LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgICAgdGhpcy53aXRoVmlld3Muc2V0KHRhZywgdmlldyk7XG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICB0aGlzLndpdGhWaWV3cy5kZWxldGUodGFnKTtcbiAgICAgIGRlYmluZCgpO1xuICAgIH0pO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwVmlld1RhZyh0YWcpIHtcbiAgICB2YXIgdmlld0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBwYXJ0cyA9IHZpZXdBdHRyLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHZpZXdOYW1lID0gcGFydHMuc2hpZnQoKTtcbiAgICB2YXIgdmlld0NsYXNzID0gcGFydHMubGVuZ3RoID8gdGhpcy5zdHJpbmdUb0NsYXNzKHBhcnRzWzBdKSA6IFZpZXc7XG4gICAgdmFyIHZpZXcgPSBuZXcgdmlld0NsYXNzKHRoaXMuYXJncywgdGhpcyk7XG4gICAgdGhpcy52aWV3cy5zZXQodGFnLCB2aWV3KTtcbiAgICB0aGlzLnZpZXdzLnNldCh2aWV3TmFtZSwgdmlldyk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgdGhpcy52aWV3cy5kZWxldGUodGFnKTtcbiAgICAgIHRoaXMudmlld3MuZGVsZXRlKHZpZXdOYW1lKTtcbiAgICB9KTtcbiAgICB2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gICAgdmlldy5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcEVhY2hUYWcodGFnKSB7XG4gICAgdmFyIGVhY2hBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtZWFjaCcpO1xuICAgIHZhciB2aWV3QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1lYWNoJyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSB2aWV3QXR0ciA/IHRoaXMuc3RyaW5nVG9DbGFzcyh2aWV3QXR0cikgOiBWaWV3O1xuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBbZWFjaFByb3AsIGFzUHJvcCwga2V5UHJvcF0gPSBlYWNoQXR0ci5zcGxpdCgnOicpO1xuICAgIHZhciBwcm94eSA9IHRoaXMuYXJncztcbiAgICB2YXIgcHJvcGVydHkgPSBlYWNoUHJvcDtcbiAgICBpZiAoZWFjaFByb3AubWF0Y2goL1xcLi8pKSB7XG4gICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKHRoaXMuYXJncywgZWFjaFByb3AsIHRydWUpO1xuICAgIH1cbiAgICB2YXIgZGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgaWYgKHYgaW5zdGFuY2VvZiBfQmFnLkJhZykge1xuICAgICAgICB2ID0gdi5saXN0O1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMudmlld0xpc3RzLmhhcyh0YWcpKSB7XG4gICAgICAgIHRoaXMudmlld0xpc3RzLmdldCh0YWcpLnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgdmFyIHZpZXdMaXN0ID0gbmV3IF9WaWV3TGlzdC5WaWV3TGlzdChzdWJUZW1wbGF0ZSwgYXNQcm9wLCB2LCB0aGlzLCBrZXlQcm9wLCB2aWV3Q2xhc3MpO1xuICAgICAgdmFyIHZpZXdMaXN0UmVtb3ZlciA9ICgpID0+IHZpZXdMaXN0LnJlbW92ZSgpO1xuICAgICAgdGhpcy5vblJlbW92ZSh2aWV3TGlzdFJlbW92ZXIpO1xuICAgICAgdmlld0xpc3Qub25SZW1vdmUoKCkgPT4gdGhpcy5fb25SZW1vdmUucmVtb3ZlKHZpZXdMaXN0UmVtb3ZlcikpO1xuICAgICAgdmFyIGRlYmluZEEgPSB0aGlzLmFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgIGlmIChrID09PSAnX2lkJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWQpIHtcbiAgICAgICAgICB2aWV3TGlzdC5zdWJBcmdzW2tdID0gdjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoayBpbiB2aWV3TGlzdC5zdWJBcmdzKSB7XG4gICAgICAgICAgICBkZWxldGUgdmlld0xpc3Quc3ViQXJnc1trXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIGRlYmluZEIgPSB2aWV3TGlzdC5hcmdzLmJpbmRUbygodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgICBpZiAoayA9PT0gJ19pZCcgfHwgayA9PT0gJ3ZhbHVlJyB8fCBTdHJpbmcoaykuc3Vic3RyaW5nKDAsIDMpID09PSAnX19fJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWQpIHtcbiAgICAgICAgICBpZiAoayBpbiB0aGlzLmFyZ3MpIHtcbiAgICAgICAgICAgIHRoaXMuYXJnc1trXSA9IHY7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLmFyZ3Nba107XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmlld0xpc3Qub25SZW1vdmUoZGViaW5kQSk7XG4gICAgICB2aWV3TGlzdC5vblJlbW92ZShkZWJpbmRCKTtcbiAgICAgIHRoaXMub25SZW1vdmUoZGViaW5kQSk7XG4gICAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZEIpO1xuICAgICAgd2hpbGUgKHRhZy5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhZy5yZW1vdmVDaGlsZCh0YWcuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgICB0aGlzLnZpZXdMaXN0cy5zZXQodGFnLCB2aWV3TGlzdCk7XG4gICAgICB2aWV3TGlzdC5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICAgIGlmICh0YWcudGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHtcbiAgICAgICAgdmlld0xpc3QucmVSZW5kZXIoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBJZlRhZyh0YWcpIHtcbiAgICB2YXIgc291cmNlVGFnID0gdGFnO1xuICAgIHZhciB2aWV3UHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIGlmUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1pZicpO1xuICAgIHZhciBpc1Byb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtaXMnKTtcbiAgICB2YXIgaW52ZXJ0ZWQgPSBmYWxzZTtcbiAgICB2YXIgZGVmaW5lZCA9IGZhbHNlO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1pZicpO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWlzJyk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHZpZXdQcm9wZXJ0eSA/IHRoaXMuc3RyaW5nVG9DbGFzcyh2aWV3UHJvcGVydHkpIDogVmlldztcbiAgICBpZiAoaWZQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICchJykge1xuICAgICAgaWZQcm9wZXJ0eSA9IGlmUHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgaW52ZXJ0ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaWZQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICc/Jykge1xuICAgICAgaWZQcm9wZXJ0eSA9IGlmUHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgZGVmaW5lZCA9IHRydWU7XG4gICAgfVxuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnNvdXJjZVRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBiaW5kaW5nVmlldyA9IHRoaXM7XG4gICAgdmFyIGlmRG9jID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgIC8vIGxldCB2aWV3ID0gbmV3IHZpZXdDbGFzcyhPYmplY3QuYXNzaWduKHt9LCB0aGlzLmFyZ3MpLCBiaW5kaW5nVmlldyk7XG4gICAgdmFyIHZpZXcgPSBuZXcgdmlld0NsYXNzKHRoaXMuYXJncywgYmluZGluZ1ZpZXcpO1xuICAgIHZpZXcudGFncy5iaW5kVG8oKHYsIGspID0+IHRoaXMudGFnc1trXSA9IHYsIHtcbiAgICAgIHJlbW92ZVdpdGg6IHRoaXNcbiAgICB9KTtcbiAgICB2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gICAgdmFyIHByb3h5ID0gYmluZGluZ1ZpZXcuYXJncztcbiAgICB2YXIgcHJvcGVydHkgPSBpZlByb3BlcnR5O1xuICAgIGlmIChpZlByb3BlcnR5Lm1hdGNoKC9cXC4vKSkge1xuICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShiaW5kaW5nVmlldy5hcmdzLCBpZlByb3BlcnR5LCB0cnVlKTtcbiAgICB9XG4gICAgdmlldy5yZW5kZXIoaWZEb2MsIG51bGwsIHRoaXMpO1xuICAgIHZhciBwcm9wZXJ0eURlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGspID0+IHtcbiAgICAgIHZhciBvID0gdjtcbiAgICAgIGlmIChkZWZpbmVkKSB7XG4gICAgICAgIHYgPSB2ICE9PSBudWxsICYmIHYgIT09IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGlmICh2IGluc3RhbmNlb2YgX0JhZy5CYWcpIHtcbiAgICAgICAgdiA9IHYubGlzdDtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHYpKSB7XG4gICAgICAgIHYgPSAhIXYubGVuZ3RoO1xuICAgICAgfVxuICAgICAgaWYgKGlzUHJvcGVydHkgIT09IG51bGwpIHtcbiAgICAgICAgdiA9IG8gPT0gaXNQcm9wZXJ0eTtcbiAgICAgIH1cbiAgICAgIGlmIChpbnZlcnRlZCkge1xuICAgICAgICB2ID0gIXY7XG4gICAgICB9XG4gICAgICBpZiAodikge1xuICAgICAgICB0YWcuYXBwZW5kQ2hpbGQoaWZEb2MpO1xuICAgICAgICBbLi4uaWZEb2MuY2hpbGROb2Rlc10uZm9yRWFjaChub2RlID0+IF9Eb20uRG9tLm1hcFRhZ3Mobm9kZSwgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgICAgIGlmICghdGFnLm1hdGNoZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkRvbUF0dGFjaGVkJywge1xuICAgICAgICAgICAgdGFyZ2V0OiB0YWcsXG4gICAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmlldy5ub2Rlcy5mb3JFYWNoKG4gPT4gaWZEb2MuYXBwZW5kQ2hpbGQobikpO1xuICAgICAgICBfRG9tLkRvbS5tYXBUYWdzKGlmRG9jLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICAgICAgaWYgKCF0YWcubWF0Y2hlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tRGV0YWNoZWQnLCB7XG4gICAgICAgICAgICB0YXJnZXQ6IHRhZyxcbiAgICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KHByb3h5W3Byb3BlcnR5XSlcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IHByb3BlcnR5RGViaW5kID0gdGhpcy5hcmdzLmJpbmRDaGFpbihwcm9wZXJ0eSwgb25VcGRhdGUpO1xuXG4gICAgYmluZGluZ1ZpZXcub25SZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuXG4gICAgLy8gY29uc3QgZGViaW5kQSA9IHRoaXMuYXJncy5iaW5kVG8oKHYsayx0LGQpID0+IHtcbiAgICAvLyBcdGlmKGsgPT09ICdfaWQnKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRyZXR1cm47XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGlmKCFkKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHR2aWV3LmFyZ3Nba10gPSB2O1xuICAgIC8vIFx0fVxuICAgIC8vIFx0ZWxzZSBpZihrIGluIHZpZXcuYXJncylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0ZGVsZXRlIHZpZXcuYXJnc1trXTtcbiAgICAvLyBcdH1cblxuICAgIC8vIH0pO1xuXG4gICAgLy8gY29uc3QgZGViaW5kQiA9IHZpZXcuYXJncy5iaW5kVG8oKHYsayx0LGQscCkgPT4ge1xuICAgIC8vIFx0aWYoayA9PT0gJ19pZCcgfHwgU3RyaW5nKGspLnN1YnN0cmluZygwLDMpID09PSAnX19fJylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0cmV0dXJuO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRpZihrIGluIHRoaXMuYXJncylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0aWYoIWQpXG4gICAgLy8gXHRcdHtcbiAgICAvLyBcdFx0XHR0aGlzLmFyZ3Nba10gPSB2O1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHRcdGVsc2VcbiAgICAvLyBcdFx0e1xuICAgIC8vIFx0XHRcdGRlbGV0ZSB0aGlzLmFyZ3Nba107XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdH1cbiAgICAvLyB9KTtcblxuICAgIHZhciB2aWV3RGViaW5kID0gKCkgPT4ge1xuICAgICAgcHJvcGVydHlEZWJpbmQoKTtcbiAgICAgIC8vIGRlYmluZEEoKTtcbiAgICAgIC8vIGRlYmluZEIoKTtcbiAgICAgIGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuICAgICAgLy8gYmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShiaW5kYWJsZURlYmluZCk7XG4gICAgfTtcbiAgICBiaW5kaW5nVmlldy5vblJlbW92ZSh2aWV3RGViaW5kKTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIC8vIGRlYmluZEEoKTtcbiAgICAgIC8vIGRlYmluZEIoKTtcbiAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICBpZiAoYmluZGluZ1ZpZXcgIT09IHRoaXMpIHtcbiAgICAgICAgYmluZGluZ1ZpZXcucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIGNvbXBpbGVJZlRhZyhzb3VyY2VUYWcpXG4gIC8vIHtcbiAgLy8gXHRsZXQgaWZQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWlmJyk7XG4gIC8vIFx0bGV0IGludmVydGVkICAgPSBmYWxzZTtcblxuICAvLyBcdHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWlmJyk7XG5cbiAgLy8gXHRpZihpZlByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyEnKVxuICAvLyBcdHtcbiAgLy8gXHRcdGlmUHJvcGVydHkgPSBpZlByb3BlcnR5LnN1YnN0cigxKTtcbiAgLy8gXHRcdGludmVydGVkICAgPSB0cnVlO1xuICAvLyBcdH1cblxuICAvLyBcdGNvbnN0IHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQ7XG5cbiAgLy8gXHRbLi4uc291cmNlVGFnLmNoaWxkTm9kZXNdLmZvckVhY2goXG4gIC8vIFx0XHRuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4uY2xvbmVOb2RlKHRydWUpKVxuICAvLyBcdCk7XG5cbiAgLy8gXHRyZXR1cm4gKGJpbmRpbmdWaWV3KSA9PiB7XG5cbiAgLy8gXHRcdGNvbnN0IHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUoKTtcblxuICAvLyBcdFx0Y29uc3QgaWZEb2MgPSBuZXcgRG9jdW1lbnRGcmFnbWVudDtcblxuICAvLyBcdFx0bGV0IHZpZXcgPSBuZXcgVmlldyh7fSwgYmluZGluZ1ZpZXcpO1xuXG4gIC8vIFx0XHR2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gIC8vIFx0XHQvLyB2aWV3LnBhcmVudCAgID0gYmluZGluZ1ZpZXc7XG5cbiAgLy8gXHRcdGJpbmRpbmdWaWV3LnN5bmNCaW5kKHZpZXcpO1xuXG4gIC8vIFx0XHRsZXQgcHJveHkgICAgPSBiaW5kaW5nVmlldy5hcmdzO1xuICAvLyBcdFx0bGV0IHByb3BlcnR5ID0gaWZQcm9wZXJ0eTtcblxuICAvLyBcdFx0aWYoaWZQcm9wZXJ0eS5tYXRjaCgvXFwuLykpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdFtwcm94eSwgcHJvcGVydHldID0gQmluZGFibGUucmVzb2x2ZShcbiAgLy8gXHRcdFx0XHRiaW5kaW5nVmlldy5hcmdzXG4gIC8vIFx0XHRcdFx0LCBpZlByb3BlcnR5XG4gIC8vIFx0XHRcdFx0LCB0cnVlXG4gIC8vIFx0XHRcdCk7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGxldCBoYXNSZW5kZXJlZCA9IGZhbHNlO1xuXG4gIC8vIFx0XHRjb25zdCBwcm9wZXJ0eURlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsaykgPT4ge1xuXG4gIC8vIFx0XHRcdGlmKCFoYXNSZW5kZXJlZClcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdGNvbnN0IHJlbmRlckRvYyA9IChiaW5kaW5nVmlldy5hcmdzW3Byb3BlcnR5XSB8fCBpbnZlcnRlZClcbiAgLy8gXHRcdFx0XHRcdD8gdGFnIDogaWZEb2M7XG5cbiAgLy8gXHRcdFx0XHR2aWV3LnJlbmRlcihyZW5kZXJEb2MpO1xuXG4gIC8vIFx0XHRcdFx0aGFzUmVuZGVyZWQgPSB0cnVlO1xuXG4gIC8vIFx0XHRcdFx0cmV0dXJuO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0aWYoQXJyYXkuaXNBcnJheSh2KSlcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHYgPSAhIXYubGVuZ3RoO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0aWYoaW52ZXJ0ZWQpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR2ID0gIXY7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRpZih2KVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0dGFnLmFwcGVuZENoaWxkKGlmRG9jKTtcbiAgLy8gXHRcdFx0fVxuICAvLyBcdFx0XHRlbHNlXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR2aWV3Lm5vZGVzLmZvckVhY2gobj0+aWZEb2MuYXBwZW5kQ2hpbGQobikpO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdH0pO1xuXG4gIC8vIFx0XHQvLyBsZXQgY2xlYW5lciA9IGJpbmRpbmdWaWV3O1xuXG4gIC8vIFx0XHQvLyB3aGlsZShjbGVhbmVyLnBhcmVudClcbiAgLy8gXHRcdC8vIHtcbiAgLy8gXHRcdC8vIFx0Y2xlYW5lciA9IGNsZWFuZXIucGFyZW50O1xuICAvLyBcdFx0Ly8gfVxuXG4gIC8vIFx0XHRiaW5kaW5nVmlldy5vblJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG5cbiAgLy8gXHRcdGxldCBiaW5kYWJsZURlYmluZCA9ICgpID0+IHtcblxuICAvLyBcdFx0XHRpZighcHJveHkuaXNCb3VuZCgpKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyhwcm94eSk7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0fTtcblxuICAvLyBcdFx0bGV0IHZpZXdEZWJpbmQgPSAoKT0+e1xuICAvLyBcdFx0XHRwcm9wZXJ0eURlYmluZCgpO1xuICAvLyBcdFx0XHRiaW5kYWJsZURlYmluZCgpO1xuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShiaW5kYWJsZURlYmluZCk7XG4gIC8vIFx0XHR9O1xuXG4gIC8vIFx0XHR2aWV3Lm9uUmVtb3ZlKHZpZXdEZWJpbmQpO1xuXG4gIC8vIFx0XHRyZXR1cm4gdGFnO1xuICAvLyBcdH07XG4gIC8vIH1cblxuICBtYXBUZW1wbGF0ZVRhZyh0YWcpIHtcbiAgICAvLyBjb25zdCB0ZW1wbGF0ZU5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuXG4gICAgLy8gdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcblxuICAgIC8vIHRoaXMudGVtcGxhdGVzWyB0ZW1wbGF0ZU5hbWUgXSA9IHRhZy50YWdOYW1lID09PSAnVEVNUExBVEUnXG4gICAgLy8gXHQ/IHRhZy5jbG9uZU5vZGUodHJ1ZSkuY29udGVudFxuICAgIC8vIFx0OiBuZXcgRG9jdW1lbnRGcmFnbWVudCh0YWcuaW5uZXJIVE1MKTtcblxuICAgIHZhciB0ZW1wbGF0ZU5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG4gICAgdmFyIHNvdXJjZSA9IHRhZy5pbm5lckhUTUw7XG4gICAgaWYgKCFWaWV3LnRlbXBsYXRlcy5oYXMoc291cmNlKSkge1xuICAgICAgVmlldy50ZW1wbGF0ZXMuc2V0KHNvdXJjZSwgZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQodGFnLmlubmVySFRNTCkpO1xuICAgIH1cbiAgICB0aGlzLnRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdID0gVmlldy50ZW1wbGF0ZXMuZ2V0KHNvdXJjZSk7XG4gICAgdGhpcy5wb3N0TWFwcGluZy5hZGQoKCkgPT4gdGFnLnJlbW92ZSgpKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFNsb3RUYWcodGFnKSB7XG4gICAgdmFyIHRlbXBsYXRlTmFtZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXNsb3QnKTtcbiAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdO1xuICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICB0ZW1wbGF0ZSA9IHBhcmVudC50ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXTtcbiAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgIH1cbiAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgVGVtcGxhdGUgJHt0ZW1wbGF0ZU5hbWV9IG5vdCBmb3VuZC5gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1zbG90Jyk7XG4gICAgd2hpbGUgKHRhZy5maXJzdENoaWxkKSB7XG4gICAgICB0YWcuZmlyc3RDaGlsZC5yZW1vdmUoKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmICghVmlldy50ZW1wbGF0ZXMuaGFzKHRlbXBsYXRlKSkge1xuICAgICAgICBWaWV3LnRlbXBsYXRlcy5zZXQodGVtcGxhdGUsIGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHRlbXBsYXRlKSk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZSA9IFZpZXcudGVtcGxhdGVzLmdldCh0ZW1wbGF0ZSk7XG4gICAgfVxuICAgIHRhZy5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBzeW5jQmluZChzdWJWaWV3KVxuICAvLyB7XG4gIC8vIFx0bGV0IGRlYmluZEEgPSB0aGlzLmFyZ3MuYmluZFRvKCh2LGssdCxkKT0+e1xuICAvLyBcdFx0aWYoayA9PT0gJ19pZCcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHJldHVybjtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYoc3ViVmlldy5hcmdzW2tdICE9PSB2KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRzdWJWaWV3LmFyZ3Nba10gPSB2O1xuICAvLyBcdFx0fVxuICAvLyBcdH0pO1xuXG4gIC8vIFx0bGV0IGRlYmluZEIgPSBzdWJWaWV3LmFyZ3MuYmluZFRvKCh2LGssdCxkLHApPT57XG5cbiAgLy8gXHRcdGlmKGsgPT09ICdfaWQnKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRyZXR1cm47XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGxldCBuZXdSZWYgPSB2O1xuICAvLyBcdFx0bGV0IG9sZFJlZiA9IHA7XG5cbiAgLy8gXHRcdGlmKG5ld1JlZiBpbnN0YW5jZW9mIFZpZXcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdG5ld1JlZiA9IG5ld1JlZi5fX19yZWZfX187XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKG9sZFJlZiBpbnN0YW5jZW9mIFZpZXcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdG9sZFJlZiA9IG9sZFJlZi5fX19yZWZfX187XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKG5ld1JlZiAhPT0gb2xkUmVmICYmIG9sZFJlZiBpbnN0YW5jZW9mIFZpZXcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHAucmVtb3ZlKCk7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKGsgaW4gdGhpcy5hcmdzKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHR0aGlzLmFyZ3Nba10gPSB2O1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0fSk7XG5cbiAgLy8gXHR0aGlzLm9uUmVtb3ZlKGRlYmluZEEpO1xuICAvLyBcdHRoaXMub25SZW1vdmUoZGViaW5kQik7XG5cbiAgLy8gXHRzdWJWaWV3Lm9uUmVtb3ZlKCgpPT57XG4gIC8vIFx0XHR0aGlzLl9vblJlbW92ZS5yZW1vdmUoZGViaW5kQSk7XG4gIC8vIFx0XHR0aGlzLl9vblJlbW92ZS5yZW1vdmUoZGViaW5kQik7XG4gIC8vIFx0fSk7XG4gIC8vIH1cblxuICBwb3N0UmVuZGVyKHBhcmVudE5vZGUpIHt9XG4gIGF0dGFjaGVkKHBhcmVudE5vZGUpIHt9XG4gIGludGVycG9sYXRhYmxlKHN0cikge1xuICAgIHJldHVybiAhIVN0cmluZyhzdHIpLm1hdGNoKHRoaXMuaW50ZXJwb2xhdGVSZWdleCk7XG4gIH1cbiAgc3RhdGljIHV1aWQoKSB7XG4gICAgcmV0dXJuIG5ldyBfVXVpZC5VdWlkKCk7XG4gIH1cbiAgcmVtb3ZlKG5vdyA9IGZhbHNlKSB7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW1vdmUnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgdmlldzogdGhpc1xuICAgICAgfSxcbiAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICB9KSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlbW92ZXIgPSAoKSA9PiB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMudGFncykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLnRhZ3NbaV0pKSB7XG4gICAgICAgICAgdGhpcy50YWdzW2ldICYmIHRoaXMudGFnc1tpXS5mb3JFYWNoKHQgPT4gdC5yZW1vdmUoKSk7XG4gICAgICAgICAgdGhpcy50YWdzW2ldLnNwbGljZSgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0gJiYgdGhpcy50YWdzW2ldLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMudGFnc1tpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2kzIGluIHRoaXMubm9kZXMpIHtcbiAgICAgICAgdGhpcy5ub2Rlc1tfaTNdICYmIHRoaXMubm9kZXNbX2kzXS5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY3ZEb21EZXRhY2hlZCcpKTtcbiAgICAgICAgdGhpcy5ub2Rlc1tfaTNdICYmIHRoaXMubm9kZXNbX2kzXS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5ub2Rlc1tfaTNdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgdGhpcy5ub2Rlcy5zcGxpY2UoMCk7XG4gICAgICB0aGlzLmZpcnN0Tm9kZSA9IHRoaXMubGFzdE5vZGUgPSB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICBpZiAobm93KSB7XG4gICAgICByZW1vdmVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShyZW1vdmVyKTtcbiAgICB9XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX29uUmVtb3ZlLml0ZW1zKCk7XG4gICAgZm9yICh2YXIgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgICAgdGhpcy5fb25SZW1vdmUucmVtb3ZlKGNhbGxiYWNrKTtcbiAgICB9XG4gICAgZm9yICh2YXIgY2xlYW51cCBvZiB0aGlzLmNsZWFudXApIHtcbiAgICAgIGNsZWFudXAgJiYgY2xlYW51cCgpO1xuICAgIH1cbiAgICB0aGlzLmNsZWFudXAubGVuZ3RoID0gMDtcbiAgICBmb3IgKHZhciBbdGFnLCB2aWV3TGlzdF0gb2YgdGhpcy52aWV3TGlzdHMpIHtcbiAgICAgIHZpZXdMaXN0LnJlbW92ZSgpO1xuICAgIH1cbiAgICB0aGlzLnZpZXdMaXN0cy5jbGVhcigpO1xuICAgIGZvciAodmFyIFtfY2FsbGJhY2s1LCB0aW1lb3V0XSBvZiB0aGlzLnRpbWVvdXRzKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dC50aW1lb3V0KTtcbiAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXQudGltZW91dCk7XG4gICAgfVxuICAgIGZvciAodmFyIGludGVydmFsIG9mIHRoaXMuaW50ZXJ2YWxzKSB7XG4gICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICB9XG4gICAgdGhpcy5pbnRlcnZhbHMubGVuZ3RoID0gMDtcbiAgICBmb3IgKHZhciBmcmFtZSBvZiB0aGlzLmZyYW1lcykge1xuICAgICAgZnJhbWUoKTtcbiAgICB9XG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLnByZVJ1bGVTZXQucHVyZ2UoKTtcbiAgICB0aGlzLnJ1bGVTZXQucHVyZ2UoKTtcbiAgICB0aGlzLnJlbW92ZWQgPSB0cnVlO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92ZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgdmlldzogdGhpc1xuICAgICAgfSxcbiAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICB9KSk7XG4gIH1cbiAgZmluZFRhZyhzZWxlY3Rvcikge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5ub2Rlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IHZvaWQgMDtcbiAgICAgIGlmICghdGhpcy5ub2Rlc1tpXS5xdWVyeVNlbGVjdG9yKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubm9kZXNbaV0ubWF0Y2hlcyhzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBfVGFnLlRhZyh0aGlzLm5vZGVzW2ldLCB0aGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcyk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0ID0gdGhpcy5ub2Rlc1tpXS5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IF9UYWcuVGFnKHJlc3VsdCwgdGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBmaW5kVGFncyhzZWxlY3Rvcikge1xuICAgIHZhciB0b3BMZXZlbCA9IHRoaXMubm9kZXMuZmlsdGVyKG4gPT4gbi5tYXRjaGVzICYmIG4ubWF0Y2hlcyhzZWxlY3RvcikpO1xuICAgIHZhciBzdWJMZXZlbCA9IHRoaXMubm9kZXMuZmlsdGVyKG4gPT4gbi5xdWVyeVNlbGVjdG9yQWxsKS5tYXAobiA9PiBbLi4ubi5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKV0pLmZsYXQoKS5tYXAobiA9PiBuZXcgX1RhZy5UYWcobiwgdGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMpKSB8fCBbXTtcbiAgICByZXR1cm4gdG9wTGV2ZWwuY29uY2F0KHN1YkxldmVsKTtcbiAgfVxuICBvblJlbW92ZShjYWxsYmFjaykge1xuICAgIGlmIChjYWxsYmFjayBpbnN0YW5jZW9mIEV2ZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX29uUmVtb3ZlLmFkZChjYWxsYmFjayk7XG4gIH1cbiAgdXBkYXRlKCkge31cbiAgYmVmb3JlVXBkYXRlKGFyZ3MpIHt9XG4gIGFmdGVyVXBkYXRlKGFyZ3MpIHt9XG4gIHN0cmluZ1RyYW5zZm9ybWVyKG1ldGhvZHMpIHtcbiAgICByZXR1cm4geCA9PiB7XG4gICAgICBmb3IgKHZhciBtIGluIG1ldGhvZHMpIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBtZXRob2QgPSBtZXRob2RzW21dO1xuICAgICAgICB3aGlsZSAocGFyZW50ICYmICFwYXJlbnRbbWV0aG9kXSkge1xuICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFwYXJlbnQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgeCA9IHBhcmVudFttZXRob2RzW21dXSh4KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB4O1xuICAgIH07XG4gIH1cbiAgc3RyaW5nVG9DbGFzcyhyZWZDbGFzc25hbWUpIHtcbiAgICBpZiAoVmlldy5yZWZDbGFzc2VzLmhhcyhyZWZDbGFzc25hbWUpKSB7XG4gICAgICByZXR1cm4gVmlldy5yZWZDbGFzc2VzLmdldChyZWZDbGFzc25hbWUpO1xuICAgIH1cbiAgICB2YXIgcmVmQ2xhc3NTcGxpdCA9IHJlZkNsYXNzbmFtZS5zcGxpdCgnLycpO1xuICAgIHZhciByZWZTaG9ydENsYXNzID0gcmVmQ2xhc3NTcGxpdFtyZWZDbGFzc1NwbGl0Lmxlbmd0aCAtIDFdO1xuICAgIHZhciByZWZDbGFzcyA9IHJlcXVpcmUocmVmQ2xhc3NuYW1lKTtcbiAgICBWaWV3LnJlZkNsYXNzZXMuc2V0KHJlZkNsYXNzbmFtZSwgcmVmQ2xhc3NbcmVmU2hvcnRDbGFzc10pO1xuICAgIHJldHVybiByZWZDbGFzc1tyZWZTaG9ydENsYXNzXTtcbiAgfVxuICBwcmV2ZW50UGFyc2luZyhub2RlKSB7XG4gICAgbm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgfVxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5ub2Rlcy5tYXAobiA9PiBuLm91dGVySFRNTCkuam9pbignICcpO1xuICB9XG4gIGxpc3Rlbihub2RlLCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBldmVudE5hbWU7XG4gICAgICBldmVudE5hbWUgPSBub2RlO1xuICAgICAgbm9kZSA9IHRoaXM7XG4gICAgfVxuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVmlldykge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdGVuKG5vZGUubm9kZXMsIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUubWFwKG4gPT4gdGhpcy5saXN0ZW4obiwgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucykpO1xuICAgICAgLy8gLmZvckVhY2gociA9PiByKCkpO1xuICAgIH1cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0ZW4obm9kZS5lbGVtZW50LCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIHZhciByZW1vdmUgPSAoKSA9PiBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgdmFyIHJlbW92ZXIgPSAoKSA9PiB7XG4gICAgICByZW1vdmUoKTtcbiAgICAgIHJlbW92ZSA9ICgpID0+IHt9O1xuICAgIH07XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiByZW1vdmVyKCkpO1xuICAgIHJldHVybiByZW1vdmVyO1xuICB9XG4gIGRldGFjaCgpIHtcbiAgICBmb3IgKHZhciBuIGluIHRoaXMubm9kZXMpIHtcbiAgICAgIHRoaXMubm9kZXNbbl0ucmVtb3ZlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICB9XG59XG5leHBvcnRzLlZpZXcgPSBWaWV3O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFZpZXcsICd0ZW1wbGF0ZXMnLCB7XG4gIHZhbHVlOiBuZXcgTWFwKClcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFZpZXcsICdyZWZDbGFzc2VzJywge1xuICB2YWx1ZTogbmV3IE1hcCgpXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1ZpZXdMaXN0LmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5WaWV3TGlzdCA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBfU2V0TWFwID0gcmVxdWlyZShcIi4vU2V0TWFwXCIpO1xudmFyIF9CYWcgPSByZXF1aXJlKFwiLi9CYWdcIik7XG5jbGFzcyBWaWV3TGlzdCB7XG4gIGNvbnN0cnVjdG9yKHRlbXBsYXRlLCBzdWJQcm9wZXJ0eSwgbGlzdCwgcGFyZW50LCBrZXlQcm9wZXJ0eSA9IG51bGwsIHZpZXdDbGFzcyA9IG51bGwpIHtcbiAgICB0aGlzLnJlbW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmFyZ3MgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgIHRoaXMuYXJncy52YWx1ZSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUobGlzdCB8fCBPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICB0aGlzLnN1YkFyZ3MgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICB0aGlzLmNsZWFudXAgPSBbXTtcbiAgICB0aGlzLnZpZXdDbGFzcyA9IHZpZXdDbGFzcztcbiAgICB0aGlzLl9vblJlbW92ZSA9IG5ldyBfQmFnLkJhZygpO1xuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICB0aGlzLnN1YlByb3BlcnR5ID0gc3ViUHJvcGVydHk7XG4gICAgdGhpcy5rZXlQcm9wZXJ0eSA9IGtleVByb3BlcnR5O1xuICAgIHRoaXMudGFnID0gbnVsbDtcbiAgICB0aGlzLmRvd25EZWJpbmQgPSBbXTtcbiAgICB0aGlzLnVwRGViaW5kID0gW107XG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLnZpZXdDb3VudCA9IDA7XG4gICAgdGhpcy5yZW5kZXJlZCA9IG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCkgPT4ge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZW5kZXJDb21wbGV0ZScsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIHZhbHVlOiBhY2NlcHRcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMud2lsbFJlUmVuZGVyID0gZmFsc2U7XG4gICAgdGhpcy5hcmdzLl9fX2JlZm9yZSgodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgaWYgKGUgPT0gJ2JpbmRUbycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXVzZWQgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMuYXJncy5fX19hZnRlcigodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgaWYgKGUgPT0gJ2JpbmRUbycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXVzZWQgPSBzLmxlbmd0aCA+IDE7XG4gICAgICB0aGlzLnJlUmVuZGVyKCk7XG4gICAgfSk7XG4gICAgdmFyIGRlYmluZCA9IHRoaXMuYXJncy52YWx1ZS5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgIGlmICh0aGlzLnBhdXNlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIga2sgPSBrO1xuICAgICAgaWYgKHR5cGVvZiBrID09PSAnc3ltYm9sJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoaXNOYU4oaykpIHtcbiAgICAgICAga2sgPSAnXycgKyBrO1xuICAgICAgfVxuICAgICAgaWYgKGQpIHtcbiAgICAgICAgaWYgKHRoaXMudmlld3Nba2tdKSB7XG4gICAgICAgICAgdGhpcy52aWV3c1tra10ucmVtb3ZlKHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSB0aGlzLnZpZXdzW2trXTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLnZpZXdzW2ldKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlzTmFOKGkpKSB7XG4gICAgICAgICAgICB0aGlzLnZpZXdzW2ldLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBpLnN1YnN0cigxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnZpZXdzW2ldLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLnZpZXdzW2trXSkge1xuICAgICAgICBpZiAoIXRoaXMudmlld0NvdW50KSB7XG4gICAgICAgICAgdGhpcy5yZVJlbmRlcigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0aGlzLndpbGxSZVJlbmRlciA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMud2lsbFJlUmVuZGVyID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy53aWxsUmVSZW5kZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgdGhpcy5yZVJlbmRlcigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudmlld3Nba2tdICYmIHRoaXMudmlld3Nba2tdLmFyZ3MpIHtcbiAgICAgICAgdGhpcy52aWV3c1tra10uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IGs7XG4gICAgICAgIHRoaXMudmlld3Nba2tdLmFyZ3NbdGhpcy5zdWJQcm9wZXJ0eV0gPSB2O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHdhaXQ6IDBcbiAgICB9KTtcbiAgICB0aGlzLl9vblJlbW92ZS5hZGQoZGViaW5kKTtcbiAgICBPYmplY3QucHJldmVudEV4dGVuc2lvbnModGhpcyk7XG4gIH1cbiAgcmVuZGVyKHRhZykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyIHJlbmRlcnMgPSBbXTtcbiAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAodmlldykge1xuICAgICAgdmlldy52aWV3TGlzdCA9IF90aGlzO1xuICAgICAgdmlldy5yZW5kZXIodGFnLCBudWxsLCBfdGhpcy5wYXJlbnQpO1xuICAgICAgcmVuZGVycy5wdXNoKHZpZXcucmVuZGVyZWQudGhlbigoKSA9PiB2aWV3KSk7XG4gICAgfTtcbiAgICBmb3IgKHZhciB2aWV3IG9mIHRoaXMudmlld3MpIHtcbiAgICAgIF9sb29wKHZpZXcpO1xuICAgIH1cbiAgICB0aGlzLnRhZyA9IHRhZztcbiAgICBQcm9taXNlLmFsbChyZW5kZXJzKS50aGVuKHZpZXdzID0+IHRoaXMucmVuZGVyQ29tcGxldGUodmlld3MpKTtcbiAgICB0aGlzLnBhcmVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdFJlbmRlcmVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGtleTogdGhpcy5zdWJQcm9wZXJ0eSxcbiAgICAgICAgICB2YWx1ZTogdGhpcy5hcmdzLnZhbHVlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbiAgcmVSZW5kZXIoKSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG4gICAgaWYgKHRoaXMucGF1c2VkIHx8ICF0aGlzLnRhZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdmlld3MgPSBbXTtcbiAgICB2YXIgZXhpc3RpbmdWaWV3cyA9IG5ldyBfU2V0TWFwLlNldE1hcCgpO1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgdmFyIHZpZXcgPSB0aGlzLnZpZXdzW2ldO1xuICAgICAgaWYgKHZpZXcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2aWV3c1tpXSA9IHZpZXc7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIHJhd1ZhbHVlID0gdmlldy5hcmdzW3RoaXMuc3ViUHJvcGVydHldO1xuICAgICAgZXhpc3RpbmdWaWV3cy5hZGQocmF3VmFsdWUsIHZpZXcpO1xuICAgICAgdmlld3NbaV0gPSB2aWV3O1xuICAgIH1cbiAgICB2YXIgZmluYWxWaWV3cyA9IFtdO1xuICAgIHZhciBmaW5hbFZpZXdTZXQgPSBuZXcgU2V0KCk7XG4gICAgdGhpcy5kb3duRGViaW5kLmxlbmd0aCAmJiB0aGlzLmRvd25EZWJpbmQuZm9yRWFjaChkID0+IGQgJiYgZCgpKTtcbiAgICB0aGlzLnVwRGViaW5kLmxlbmd0aCAmJiB0aGlzLnVwRGViaW5kLmZvckVhY2goZCA9PiBkICYmIGQoKSk7XG4gICAgdGhpcy51cERlYmluZC5sZW5ndGggPSAwO1xuICAgIHRoaXMuZG93bkRlYmluZC5sZW5ndGggPSAwO1xuICAgIHZhciBtaW5LZXkgPSBJbmZpbml0eTtcbiAgICB2YXIgYW50ZU1pbktleSA9IEluZmluaXR5O1xuICAgIHZhciBfbG9vcDIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICAgIHZhciBrID0gX2k7XG4gICAgICBpZiAoaXNOYU4oaykpIHtcbiAgICAgICAgayA9ICdfJyArIF9pO1xuICAgICAgfSBlbHNlIGlmIChTdHJpbmcoaykubGVuZ3RoKSB7XG4gICAgICAgIGsgPSBOdW1iZXIoayk7XG4gICAgICB9XG4gICAgICBpZiAoX3RoaXMyLmFyZ3MudmFsdWVbX2ldICE9PSB1bmRlZmluZWQgJiYgZXhpc3RpbmdWaWV3cy5oYXMoX3RoaXMyLmFyZ3MudmFsdWVbX2ldKSkge1xuICAgICAgICB2YXIgZXhpc3RpbmdWaWV3ID0gZXhpc3RpbmdWaWV3cy5nZXRPbmUoX3RoaXMyLmFyZ3MudmFsdWVbX2ldKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nVmlldykge1xuICAgICAgICAgIGV4aXN0aW5nVmlldy5hcmdzW190aGlzMi5rZXlQcm9wZXJ0eV0gPSBfaTtcbiAgICAgICAgICBmaW5hbFZpZXdzW2tdID0gZXhpc3RpbmdWaWV3O1xuICAgICAgICAgIGZpbmFsVmlld1NldC5hZGQoZXhpc3RpbmdWaWV3KTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgaWYgKCFpc05hTihrKSkge1xuICAgICAgICAgICAgbWluS2V5ID0gTWF0aC5taW4obWluS2V5LCBrKTtcbiAgICAgICAgICAgIGsgPiAwICYmIChhbnRlTWluS2V5ID0gTWF0aC5taW4oYW50ZU1pbktleSwgaykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBleGlzdGluZ1ZpZXdzLnJlbW92ZShfdGhpczIuYXJncy52YWx1ZVtfaV0sIGV4aXN0aW5nVmlldyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgdmFyIHZpZXdBcmdzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgdmFyIF92aWV3ID0gZmluYWxWaWV3c1trXSA9IG5ldyBfdGhpczIudmlld0NsYXNzKHZpZXdBcmdzLCBfdGhpczIucGFyZW50KTtcbiAgICAgICAgaWYgKCFpc05hTihrKSkge1xuICAgICAgICAgIG1pbktleSA9IE1hdGgubWluKG1pbktleSwgayk7XG4gICAgICAgICAgayA+IDAgJiYgKGFudGVNaW5LZXkgPSBNYXRoLm1pbihhbnRlTWluS2V5LCBrKSk7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxWaWV3c1trXS50ZW1wbGF0ZSA9IF90aGlzMi50ZW1wbGF0ZTtcbiAgICAgICAgZmluYWxWaWV3c1trXS52aWV3TGlzdCA9IF90aGlzMjtcbiAgICAgICAgZmluYWxWaWV3c1trXS5hcmdzW190aGlzMi5rZXlQcm9wZXJ0eV0gPSBfaTtcbiAgICAgICAgZmluYWxWaWV3c1trXS5hcmdzW190aGlzMi5zdWJQcm9wZXJ0eV0gPSBfdGhpczIuYXJncy52YWx1ZVtfaV07XG4gICAgICAgIF90aGlzMi51cERlYmluZFtrXSA9IHZpZXdBcmdzLmJpbmRUbyhfdGhpczIuc3ViUHJvcGVydHksICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgdmFyIGluZGV4ID0gdmlld0FyZ3NbX3RoaXMyLmtleVByb3BlcnR5XTtcbiAgICAgICAgICBpZiAoZCkge1xuICAgICAgICAgICAgZGVsZXRlIF90aGlzMi5hcmdzLnZhbHVlW2luZGV4XTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgX3RoaXMyLmFyZ3MudmFsdWVbaW5kZXhdID0gdjtcbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzMi5kb3duRGViaW5kW2tdID0gX3RoaXMyLnN1YkFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2aWV3QXJnc1trXTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmlld0FyZ3Nba10gPSB2O1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHVwRGViaW5kID0gKCkgPT4ge1xuICAgICAgICAgIF90aGlzMi51cERlYmluZC5maWx0ZXIoeCA9PiB4KS5mb3JFYWNoKGQgPT4gZCgpKTtcbiAgICAgICAgICBfdGhpczIudXBEZWJpbmQubGVuZ3RoID0gMDtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGRvd25EZWJpbmQgPSAoKSA9PiB7XG4gICAgICAgICAgX3RoaXMyLmRvd25EZWJpbmQuZmlsdGVyKHggPT4geCkuZm9yRWFjaChkID0+IGQoKSk7XG4gICAgICAgICAgX3RoaXMyLmRvd25EZWJpbmQubGVuZ3RoID0gMDtcbiAgICAgICAgfTtcbiAgICAgICAgX3ZpZXcub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIF90aGlzMi5fb25SZW1vdmUucmVtb3ZlKHVwRGViaW5kKTtcbiAgICAgICAgICBfdGhpczIuX29uUmVtb3ZlLnJlbW92ZShkb3duRGViaW5kKTtcbiAgICAgICAgICBfdGhpczIudXBEZWJpbmRba10gJiYgX3RoaXMyLnVwRGViaW5kW2tdKCk7XG4gICAgICAgICAgX3RoaXMyLmRvd25EZWJpbmRba10gJiYgX3RoaXMyLmRvd25EZWJpbmRba10oKTtcbiAgICAgICAgICBkZWxldGUgX3RoaXMyLnVwRGViaW5kW2tdO1xuICAgICAgICAgIGRlbGV0ZSBfdGhpczIuZG93bkRlYmluZFtrXTtcbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzMi5fb25SZW1vdmUuYWRkKHVwRGViaW5kKTtcbiAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5hZGQoZG93bkRlYmluZCk7XG4gICAgICAgIHZpZXdBcmdzW190aGlzMi5zdWJQcm9wZXJ0eV0gPSBfdGhpczIuYXJncy52YWx1ZVtfaV07XG4gICAgICB9XG4gICAgfTtcbiAgICBmb3IgKHZhciBfaSBpbiB0aGlzLmFyZ3MudmFsdWUpIHtcbiAgICAgIF9sb29wMigpO1xuICAgIH1cbiAgICBmb3IgKHZhciBfaTIgaW4gdmlld3MpIHtcbiAgICAgIGlmICh2aWV3c1tfaTJdICYmICFmaW5hbFZpZXdTZXQuaGFzKHZpZXdzW19pMl0pKSB7XG4gICAgICAgIHZpZXdzW19pMl0ucmVtb3ZlKHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmFyZ3MudmFsdWUpKSB7XG4gICAgICB2YXIgbG9jYWxNaW4gPSBtaW5LZXkgPT09IDAgJiYgZmluYWxWaWV3c1sxXSAhPT0gdW5kZWZpbmVkICYmIGZpbmFsVmlld3MubGVuZ3RoID4gMSB8fCBhbnRlTWluS2V5ID09PSBJbmZpbml0eSA/IG1pbktleSA6IGFudGVNaW5LZXk7XG4gICAgICB2YXIgcmVuZGVyUmVjdXJzZSA9IChpID0gMCkgPT4ge1xuICAgICAgICB2YXIgaWkgPSBmaW5hbFZpZXdzLmxlbmd0aCAtIGkgLSAxO1xuICAgICAgICB3aGlsZSAoaWkgPiBsb2NhbE1pbiAmJiBmaW5hbFZpZXdzW2lpXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWktLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWkgPCBsb2NhbE1pbikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmluYWxWaWV3c1tpaV0gPT09IHRoaXMudmlld3NbaWldKSB7XG4gICAgICAgICAgaWYgKGZpbmFsVmlld3NbaWldICYmICFmaW5hbFZpZXdzW2lpXS5maXJzdE5vZGUpIHtcbiAgICAgICAgICAgIGZpbmFsVmlld3NbaWldLnJlbmRlcih0aGlzLnRhZywgZmluYWxWaWV3c1tpaSArIDFdLCB0aGlzLnBhcmVudCk7XG4gICAgICAgICAgICByZXR1cm4gZmluYWxWaWV3c1tpaV0ucmVuZGVyZWQudGhlbigoKSA9PiByZW5kZXJSZWN1cnNlKE51bWJlcihpKSArIDEpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHNwbGl0ID0gNTAwO1xuICAgICAgICAgICAgaWYgKGkgPT09IDAgfHwgaSAlIHNwbGl0KSB7XG4gICAgICAgICAgICAgIHJldHVybiByZW5kZXJSZWN1cnNlKE51bWJlcihpKSArIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFjY2VwdCA9PiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gYWNjZXB0KHJlbmRlclJlY3Vyc2UoTnVtYmVyKGkpICsgMSkpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZpbmFsVmlld3NbaWldLnJlbmRlcih0aGlzLnRhZywgZmluYWxWaWV3c1tpaSArIDFdLCB0aGlzLnBhcmVudCk7XG4gICAgICAgIHRoaXMudmlld3Muc3BsaWNlKGlpLCAwLCBmaW5hbFZpZXdzW2lpXSk7XG4gICAgICAgIHJldHVybiBmaW5hbFZpZXdzW2lpXS5yZW5kZXJlZC50aGVuKCgpID0+IHJlbmRlclJlY3Vyc2UoaSArIDEpKTtcbiAgICAgIH07XG4gICAgICB0aGlzLnJlbmRlcmVkID0gcmVuZGVyUmVjdXJzZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVuZGVycyA9IFtdO1xuICAgICAgdmFyIGxlZnRvdmVycyA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmNyZWF0ZShudWxsKSwgZmluYWxWaWV3cyk7XG4gICAgICB2YXIgaXNJbnQgPSB4ID0+IHBhcnNlSW50KHgpID09PSB4IC0gMDtcbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZmluYWxWaWV3cykuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICBpZiAoaXNJbnQoYSkgJiYgaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gTWF0aC5zaWduKGEgLSBiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzSW50KGEpICYmICFpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNJbnQoYSkgJiYgaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzSW50KGEpICYmICFpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZhciBfbG9vcDMgPSBmdW5jdGlvbiAoX2kzKSB7XG4gICAgICAgIGRlbGV0ZSBsZWZ0b3ZlcnNbX2kzXTtcbiAgICAgICAgaWYgKGZpbmFsVmlld3NbX2kzXS5maXJzdE5vZGUgJiYgZmluYWxWaWV3c1tfaTNdID09PSBfdGhpczIudmlld3NbX2kzXSkge1xuICAgICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGZpbmFsVmlld3NbX2kzXS5yZW5kZXIoX3RoaXMyLnRhZywgbnVsbCwgX3RoaXMyLnBhcmVudCk7XG4gICAgICAgIHJlbmRlcnMucHVzaChmaW5hbFZpZXdzW19pM10ucmVuZGVyZWQudGhlbigoKSA9PiBmaW5hbFZpZXdzW19pM10pKTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBfaTMgb2Yga2V5cykge1xuICAgICAgICBpZiAoX2xvb3AzKF9pMykpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2k0IGluIGxlZnRvdmVycykge1xuICAgICAgICBkZWxldGUgdGhpcy5hcmdzLnZpZXdzW19pNF07XG4gICAgICAgIGxlZnRvdmVycy5yZW1vdmUodHJ1ZSk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlbmRlcmVkID0gUHJvbWlzZS5hbGwocmVuZGVycyk7XG4gICAgfVxuICAgIGZvciAodmFyIF9pNSBpbiBmaW5hbFZpZXdzKSB7XG4gICAgICBpZiAoaXNOYU4oX2k1KSkge1xuICAgICAgICBmaW5hbFZpZXdzW19pNV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IF9pNS5zdWJzdHIoMSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZmluYWxWaWV3c1tfaTVdLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBfaTU7XG4gICAgfVxuICAgIHRoaXMudmlld3MgPSBBcnJheS5pc0FycmF5KHRoaXMuYXJncy52YWx1ZSkgPyBbLi4uZmluYWxWaWV3c10gOiBmaW5hbFZpZXdzO1xuICAgIHRoaXMudmlld0NvdW50ID0gZmluYWxWaWV3cy5sZW5ndGg7XG4gICAgZmluYWxWaWV3U2V0LmNsZWFyKCk7XG4gICAgdGhpcy53aWxsUmVSZW5kZXIgPSBmYWxzZTtcbiAgICB0aGlzLnJlbmRlcmVkLnRoZW4oKCkgPT4ge1xuICAgICAgdGhpcy5wYXJlbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RSZW5kZXJlZCcsIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICBrZXk6IHRoaXMuc3ViUHJvcGVydHksXG4gICAgICAgICAgICB2YWx1ZTogdGhpcy5hcmdzLnZhbHVlLFxuICAgICAgICAgICAgdGFnOiB0aGlzLnRhZ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgICAgdGhpcy50YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RSZW5kZXJlZCcsIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICBrZXk6IHRoaXMuc3ViUHJvcGVydHksXG4gICAgICAgICAgICB2YWx1ZTogdGhpcy5hcmdzLnZhbHVlLFxuICAgICAgICAgICAgdGFnOiB0aGlzLnRhZ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlbmRlcmVkO1xuICB9XG4gIHBhdXNlKHBhdXNlID0gdHJ1ZSkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgdGhpcy52aWV3c1tpXS5wYXVzZShwYXVzZSk7XG4gICAgfVxuICB9XG4gIG9uUmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fb25SZW1vdmUuYWRkKGNhbGxiYWNrKTtcbiAgfVxuICByZW1vdmUoKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICB0aGlzLnZpZXdzW2ldICYmIHRoaXMudmlld3NbaV0ucmVtb3ZlKHRydWUpO1xuICAgIH1cbiAgICB2YXIgb25SZW1vdmUgPSB0aGlzLl9vblJlbW92ZS5pdGVtcygpO1xuICAgIGZvciAodmFyIF9pNiBpbiBvblJlbW92ZSkge1xuICAgICAgdGhpcy5fb25SZW1vdmUucmVtb3ZlKG9uUmVtb3ZlW19pNl0pO1xuICAgICAgb25SZW1vdmVbX2k2XSgpO1xuICAgIH1cbiAgICB2YXIgY2xlYW51cDtcbiAgICB3aGlsZSAodGhpcy5jbGVhbnVwLmxlbmd0aCkge1xuICAgICAgY2xlYW51cCA9IHRoaXMuY2xlYW51cC5wb3AoKTtcbiAgICAgIGNsZWFudXAoKTtcbiAgICB9XG4gICAgdGhpcy52aWV3cyA9IFtdO1xuICAgIHdoaWxlICh0aGlzLnRhZyAmJiB0aGlzLnRhZy5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnRhZy5yZW1vdmVDaGlsZCh0aGlzLnRhZy5maXJzdENoaWxkKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3ViQXJncykge1xuICAgICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcy5zdWJBcmdzKTtcbiAgICB9XG4gICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcy5hcmdzKTtcblxuICAgIC8vIGlmKHRoaXMuYXJncy52YWx1ZSAmJiAhdGhpcy5hcmdzLnZhbHVlLmlzQm91bmQoKSlcbiAgICAvLyB7XG4gICAgLy8gXHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMuYXJncy52YWx1ZSk7XG4gICAgLy8gfVxuXG4gICAgdGhpcy5yZW1vdmVkID0gdHJ1ZTtcbiAgfVxufVxuZXhwb3J0cy5WaWV3TGlzdCA9IFZpZXdMaXN0O1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5LZXlib2FyZCA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi4vYmFzZS9CaW5kYWJsZVwiKTtcbmNsYXNzIEtleWJvYXJkIHtcbiAgc3RhdGljIGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy5pbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2UgfHwgX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UobmV3IHRoaXMoKSk7XG4gIH1cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5tYXhEZWNheSA9IDEyMDtcbiAgICB0aGlzLmNvbWJvVGltZSA9IDUwMDtcbiAgICB0aGlzLmxpc3RlbmluZyA9IGZhbHNlO1xuICAgIHRoaXMuZm9jdXNFbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcbiAgICB0aGlzW19CaW5kYWJsZS5CaW5kYWJsZS5Ob0dldHRlcnNdID0gdHJ1ZTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2NvbWJvJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKFtdKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2hpY2hzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY29kZXMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdrZXlzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlc3NlZFdoaWNoJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlc3NlZENvZGUnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVzc2VkS2V5Jywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVsZWFzZWRXaGljaCcsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbGVhc2VkQ29kZScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbGVhc2VkS2V5Jywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAna2V5UmVmcycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGV2ZW50ID0+IHtcbiAgICAgIGlmICghdGhpcy5saXN0ZW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCEodGhpcy5rZXlzW2V2ZW50LmtleV0gPiAwKSAmJiB0aGlzLmZvY3VzRWxlbWVudCAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ICE9PSB0aGlzLmZvY3VzRWxlbWVudCAmJiAoIXRoaXMuZm9jdXNFbGVtZW50LmNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHx8IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQubWF0Y2hlcygnaW5wdXQsdGV4dGFyZWEnKSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMucmVsZWFzZWRXaGljaFtldmVudC53aGljaF0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5yZWxlYXNlZENvZGVbZXZlbnQuY29kZV0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5yZWxlYXNlZEtleVtldmVudC5rZXldID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMud2hpY2hzW2V2ZW50LndoaWNoXSA9IC0xO1xuICAgICAgdGhpcy5jb2Rlc1tldmVudC5jb2RlXSA9IC0xO1xuICAgICAgdGhpcy5rZXlzW2V2ZW50LmtleV0gPSAtMTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZXZlbnQgPT4ge1xuICAgICAgaWYgKCF0aGlzLmxpc3RlbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5mb2N1c0VsZW1lbnQgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAhPT0gdGhpcy5mb2N1c0VsZW1lbnQgJiYgKCF0aGlzLmZvY3VzRWxlbWVudC5jb250YWlucyhkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB8fCBkb2N1bWVudC5hY3RpdmVFbGVtZW50Lm1hdGNoZXMoJ2lucHV0LHRleHRhcmVhJykpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoZXZlbnQucmVwZWF0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuY29tYm8ucHVzaChldmVudC5jb2RlKTtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNvbWJvVGltZXIpO1xuICAgICAgdGhpcy5jb21ib1RpbWVyID0gc2V0VGltZW91dCgoKSA9PiB0aGlzLmNvbWJvLnNwbGljZSgwKSwgdGhpcy5jb21ib1RpbWUpO1xuICAgICAgdGhpcy5wcmVzc2VkV2hpY2hbZXZlbnQud2hpY2hdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucHJlc3NlZENvZGVbZXZlbnQuY29kZV0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5wcmVzc2VkS2V5W2V2ZW50LmtleV0gPSBEYXRlLm5vdygpO1xuICAgICAgaWYgKHRoaXMua2V5c1tldmVudC5rZXldID4gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLndoaWNoc1tldmVudC53aGljaF0gPSAxO1xuICAgICAgdGhpcy5jb2Rlc1tldmVudC5jb2RlXSA9IDE7XG4gICAgICB0aGlzLmtleXNbZXZlbnQua2V5XSA9IDE7XG4gICAgfSk7XG4gICAgdmFyIHdpbmRvd0JsdXIgPSBldmVudCA9PiB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMua2V5cykge1xuICAgICAgICBpZiAodGhpcy5rZXlzW2ldIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVsZWFzZWRLZXlbaV0gPSBEYXRlLm5vdygpO1xuICAgICAgICB0aGlzLmtleXNbaV0gPSAtMTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pIGluIHRoaXMuY29kZXMpIHtcbiAgICAgICAgaWYgKHRoaXMuY29kZXNbX2ldIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVsZWFzZWRDb2RlW19pXSA9IERhdGUubm93KCk7XG4gICAgICAgIHRoaXMuY29kZXNbX2ldID0gLTE7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaTIgaW4gdGhpcy53aGljaHMpIHtcbiAgICAgICAgaWYgKHRoaXMud2hpY2hzW19pMl0gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWxlYXNlZFdoaWNoW19pMl0gPSBEYXRlLm5vdygpO1xuICAgICAgICB0aGlzLndoaWNoc1tfaTJdID0gLTE7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIHdpbmRvd0JsdXIpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgKCkgPT4ge1xuICAgICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gJ3Zpc2libGUnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHdpbmRvd0JsdXIoKTtcbiAgICB9KTtcbiAgfVxuICBnZXRLZXlSZWYoa2V5Q29kZSkge1xuICAgIHZhciBrZXlSZWYgPSB0aGlzLmtleVJlZnNba2V5Q29kZV0gPSB0aGlzLmtleVJlZnNba2V5Q29kZV0gfHwgX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pO1xuICAgIHJldHVybiBrZXlSZWY7XG4gIH1cbiAgZ2V0S2V5VGltZShrZXkpIHtcbiAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkS2V5W2tleV07XG4gICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRLZXlba2V5XTtcbiAgICBpZiAoIXByZXNzZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBwcmVzc2VkO1xuICAgIH1cbiAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgfVxuICBnZXRDb2RlVGltZShjb2RlKSB7XG4gICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZENvZGVbY29kZV07XG4gICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRDb2RlW2NvZGVdO1xuICAgIGlmICghcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHByZXNzZWQ7XG4gICAgfVxuICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICB9XG4gIGdldFdoaWNoVGltZShjb2RlKSB7XG4gICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZFdoaWNoW2NvZGVdO1xuICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkV2hpY2hbY29kZV07XG4gICAgaWYgKCFwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gcHJlc3NlZDtcbiAgICB9XG4gICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gIH1cbiAgZ2V0S2V5KGtleSkge1xuICAgIGlmICghdGhpcy5rZXlzW2tleV0pIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5rZXlzW2tleV07XG4gIH1cbiAgZ2V0S2V5Q29kZShjb2RlKSB7XG4gICAgaWYgKCF0aGlzLmNvZGVzW2NvZGVdKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29kZXNbY29kZV07XG4gIH1cbiAgcmVzZXQoKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmtleXMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmtleXNbaV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5jb2Rlcykge1xuICAgICAgZGVsZXRlIHRoaXMuY29kZXNbaV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy53aGljaHMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLndoaWNoc1tpXTtcbiAgICB9XG4gIH1cbiAgdXBkYXRlKCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5rZXlzKSB7XG4gICAgICBpZiAodGhpcy5rZXlzW2ldID4gMCkge1xuICAgICAgICB0aGlzLmtleXNbaV0rKztcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5rZXlzW2ldID4gLXRoaXMubWF4RGVjYXkpIHtcbiAgICAgICAgdGhpcy5rZXlzW2ldLS07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy5rZXlzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMuY29kZXMpIHtcbiAgICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRDb2RlW2ldO1xuICAgICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRDb2RlW2ldO1xuICAgICAgdmFyIGtleVJlZiA9IHRoaXMuZ2V0S2V5UmVmKGkpO1xuICAgICAgaWYgKHRoaXMuY29kZXNbaV0gPiAwKSB7XG4gICAgICAgIGtleVJlZi5mcmFtZXMgPSB0aGlzLmNvZGVzW2ldKys7XG4gICAgICAgIGtleVJlZi50aW1lID0gcHJlc3NlZCA/IERhdGUubm93KCkgLSBwcmVzc2VkIDogMDtcbiAgICAgICAga2V5UmVmLmRvd24gPSB0cnVlO1xuICAgICAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5jb2Rlc1tpXSA+IC10aGlzLm1heERlY2F5KSB7XG4gICAgICAgIGtleVJlZi5mcmFtZXMgPSB0aGlzLmNvZGVzW2ldLS07XG4gICAgICAgIGtleVJlZi50aW1lID0gcmVsZWFzZWQgLSBEYXRlLm5vdygpO1xuICAgICAgICBrZXlSZWYuZG93biA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAga2V5UmVmLmZyYW1lcyA9IDA7XG4gICAgICAgIGtleVJlZi50aW1lID0gMDtcbiAgICAgICAga2V5UmVmLmRvd24gPSBmYWxzZTtcbiAgICAgICAgZGVsZXRlIHRoaXMuY29kZXNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy53aGljaHMpIHtcbiAgICAgIGlmICh0aGlzLndoaWNoc1tpXSA+IDApIHtcbiAgICAgICAgdGhpcy53aGljaHNbaV0rKztcbiAgICAgIH0gZWxzZSBpZiAodGhpcy53aGljaHNbaV0gPiAtdGhpcy5tYXhEZWNheSkge1xuICAgICAgICB0aGlzLndoaWNoc1tpXS0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMud2hpY2hzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuZXhwb3J0cy5LZXlib2FyZCA9IEtleWJvYXJkO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL21peGluL0V2ZW50VGFyZ2V0TWl4aW4uanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkV2ZW50VGFyZ2V0TWl4aW4gPSB2b2lkIDA7XG52YXIgX01peGluID0gcmVxdWlyZShcIi4uL2Jhc2UvTWl4aW5cIik7XG52YXIgRXZlbnRUYXJnZXRQYXJlbnQgPSBTeW1ib2woJ0V2ZW50VGFyZ2V0UGFyZW50Jyk7XG52YXIgQ2FsbEhhbmRsZXIgPSBTeW1ib2woJ0NhbGxIYW5kbGVyJyk7XG52YXIgQ2FwdHVyZSA9IFN5bWJvbCgnQ2FwdHVyZScpO1xudmFyIEJ1YmJsZSA9IFN5bWJvbCgnQnViYmxlJyk7XG52YXIgVGFyZ2V0ID0gU3ltYm9sKCdUYXJnZXQnKTtcbnZhciBIYW5kbGVyc0J1YmJsZSA9IFN5bWJvbCgnSGFuZGxlcnNCdWJibGUnKTtcbnZhciBIYW5kbGVyc0NhcHR1cmUgPSBTeW1ib2woJ0hhbmRsZXJzQ2FwdHVyZScpO1xudmFyIEV2ZW50VGFyZ2V0TWl4aW4gPSBleHBvcnRzLkV2ZW50VGFyZ2V0TWl4aW4gPSB7XG4gIFtfTWl4aW4uTWl4aW4uQ29uc3RydWN0b3JdKCkge1xuICAgIHRoaXNbSGFuZGxlcnNDYXB0dXJlXSA9IG5ldyBNYXAoKTtcbiAgICB0aGlzW0hhbmRsZXJzQnViYmxlXSA9IG5ldyBNYXAoKTtcbiAgfSxcbiAgZGlzcGF0Y2hFdmVudCguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBpZiAodHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoZXZlbnQpO1xuICAgICAgYXJnc1swXSA9IGV2ZW50O1xuICAgIH1cbiAgICBldmVudC5jdlBhdGggPSBldmVudC5jdlBhdGggfHwgW107XG4gICAgZXZlbnQuY3ZUYXJnZXQgPSBldmVudC5jdkN1cnJlbnRUYXJnZXQgPSB0aGlzO1xuICAgIHZhciByZXN1bHQgPSB0aGlzW0NhcHR1cmVdKC4uLmFyZ3MpO1xuICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgIGlmICh0aGlzW0hhbmRsZXJzQ2FwdHVyZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICB2YXIgaGFuZGxlck1hcCA9IHRoaXNbSGFuZGxlcnNDYXB0dXJlXS5nZXQoZXZlbnQudHlwZSk7XG4gICAgICB2YXIgbmV3SGFuZGxlcnMgPSBbLi4uaGFuZGxlck1hcF07XG4gICAgICBuZXdIYW5kbGVycy5mb3JFYWNoKGggPT4gaC5wdXNoKGhhbmRsZXJNYXApKTtcbiAgICAgIGhhbmRsZXJzLnB1c2goLi4ubmV3SGFuZGxlcnMpO1xuICAgIH1cbiAgICBpZiAodGhpc1tIYW5kbGVyc0J1YmJsZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICB2YXIgX2hhbmRsZXJNYXAgPSB0aGlzW0hhbmRsZXJzQnViYmxlXS5nZXQoZXZlbnQudHlwZSk7XG4gICAgICB2YXIgX25ld0hhbmRsZXJzID0gWy4uLl9oYW5kbGVyTWFwXTtcbiAgICAgIF9uZXdIYW5kbGVycy5mb3JFYWNoKGggPT4gaC5wdXNoKF9oYW5kbGVyTWFwKSk7XG4gICAgICBoYW5kbGVycy5wdXNoKC4uLl9uZXdIYW5kbGVycyk7XG4gICAgfVxuICAgIGhhbmRsZXJzLnB1c2goWygpID0+IHRoaXNbQ2FsbEhhbmRsZXJdKC4uLmFyZ3MpLCB7fSwgbnVsbF0pO1xuICAgIGZvciAodmFyIFtoYW5kbGVyLCBvcHRpb25zLCBtYXBdIG9mIGhhbmRsZXJzKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgIG1hcC5kZWxldGUoaGFuZGxlcik7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghZXZlbnQuY2FuY2VsYWJsZSB8fCAhZXZlbnQuY2FuY2VsQnViYmxlICYmIHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgIHRoaXNbQnViYmxlXSguLi5hcmdzKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XSkge1xuICAgICAgT2JqZWN0LmZyZWV6ZShldmVudC5jdlBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gZXZlbnQucmV0dXJuVmFsdWU7XG4gIH0sXG4gIGFkZEV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICB1c2VDYXB0dXJlOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgaGFuZGxlcnMgPSBIYW5kbGVyc0J1YmJsZTtcbiAgICBpZiAob3B0aW9ucy51c2VDYXB0dXJlKSB7XG4gICAgICBoYW5kbGVycyA9IEhhbmRsZXJzQ2FwdHVyZTtcbiAgICB9XG4gICAgaWYgKCF0aGlzW2hhbmRsZXJzXS5oYXModHlwZSkpIHtcbiAgICAgIHRoaXNbaGFuZGxlcnNdLnNldCh0eXBlLCBuZXcgTWFwKCkpO1xuICAgIH1cbiAgICB0aGlzW2hhbmRsZXJzXS5nZXQodHlwZSkuc2V0KGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucy5zaWduYWwpIHtcbiAgICAgIG9wdGlvbnMuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0JywgZXZlbnQgPT4gdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zKSwge1xuICAgICAgICBvbmNlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gIHJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICB1c2VDYXB0dXJlOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgaGFuZGxlcnMgPSBIYW5kbGVyc0J1YmJsZTtcbiAgICBpZiAob3B0aW9ucy51c2VDYXB0dXJlKSB7XG4gICAgICBoYW5kbGVycyA9IEhhbmRsZXJzQ2FwdHVyZTtcbiAgICB9XG4gICAgaWYgKCF0aGlzW2hhbmRsZXJzXS5oYXModHlwZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpc1toYW5kbGVyc10uZ2V0KHR5cGUpLmRlbGV0ZShjYWxsYmFjayk7XG4gIH0sXG4gIFtDYXB0dXJlXSguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBldmVudC5jdlBhdGgucHVzaCh0aGlzKTtcbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtDYXB0dXJlXSguLi5hcmdzKTtcbiAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNDYXB0dXJlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZXZlbnQuY3ZDdXJyZW50VGFyZ2V0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF07XG4gICAgdmFyIHtcbiAgICAgIHR5cGVcbiAgICB9ID0gZXZlbnQ7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNDYXB0dXJlXS5nZXQodHlwZSk7XG4gICAgZm9yICh2YXIgW2hhbmRsZXIsIG9wdGlvbnNdIG9mIGhhbmRsZXJzKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgIGhhbmRsZXJzLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgW0J1YmJsZV0oLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgaWYgKCFldmVudC5idWJibGVzIHx8ICF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XSB8fCBldmVudC5jYW5jZWxCdWJibGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0J1YmJsZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICByZXR1cm4gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQnViYmxlXSguLi5hcmdzKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdDtcbiAgICBldmVudC5jdkN1cnJlbnRUYXJnZXQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XTtcbiAgICB2YXIge1xuICAgICAgdHlwZVxuICAgIH0gPSBldmVudDtcbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0J1YmJsZV0uZ2V0KGV2ZW50LnR5cGUpO1xuICAgIGZvciAodmFyIFtoYW5kbGVyLCBvcHRpb25zXSBvZiBoYW5kbGVycykge1xuICAgICAgaWYgKG9wdGlvbnMub25jZSkge1xuICAgICAgICBoYW5kbGVycy5kZWxldGUoaGFuZGxlcik7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmVzdWx0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQ2FsbEhhbmRsZXJdKC4uLmFyZ3MpO1xuICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtCdWJibGVdKC4uLmFyZ3MpO1xuICB9LFxuICBbQ2FsbEhhbmRsZXJdKC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkZWZhdWx0SGFuZGxlciA9IGBvbiR7ZXZlbnQudHlwZVswXS50b1VwcGVyQ2FzZSgpICsgZXZlbnQudHlwZS5zbGljZSgxKX1gO1xuICAgIGlmICh0eXBlb2YgdGhpc1tkZWZhdWx0SGFuZGxlcl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzW2RlZmF1bHRIYW5kbGVyXShldmVudCk7XG4gICAgfVxuICB9XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEV2ZW50VGFyZ2V0TWl4aW4sICdQYXJlbnQnLCB7XG4gIHZhbHVlOiBFdmVudFRhcmdldFBhcmVudFxufSk7XG4gIH0pKCk7XG59KTsiLCJleHBvcnQgY2xhc3MgQ29uZmlnIHt9O1xuXG5Db25maWcudGl0bGUgPSAnd2dsMmQnO1xuLy8gQ29uZmlnLiIsImNsYXNzIFByb2dyYW1cbntcblx0Y29udGV4dCA9IG51bGw7XG5cdHByb2dyYW0gPSBudWxsO1xuXG5cdGF0dHJpYnV0ZXMgPSB7fTtcblx0YnVmZmVycyA9IHt9O1xuXHR1bmlmb3JtcyA9IHt9O1xuXG5cdGNvbnN0cnVjdG9yKHtnbCwgdmVydGV4U2hhZGVyLCBmcmFnbWVudFNoYWRlciwgdW5pZm9ybXMsIGF0dHJpYnV0ZXN9KVxuXHR7XG5cdFx0dGhpcy5jb250ZXh0ID0gZ2w7XG5cdFx0dGhpcy5wcm9ncmFtID0gZ2wuY3JlYXRlUHJvZ3JhbSgpO1xuXG5cdFx0Z2wuYXR0YWNoU2hhZGVyKHRoaXMucHJvZ3JhbSwgdmVydGV4U2hhZGVyKTtcblx0XHRnbC5hdHRhY2hTaGFkZXIodGhpcy5wcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XG5cblx0XHRnbC5saW5rUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXG5cdFx0Z2wuZGV0YWNoU2hhZGVyKHRoaXMucHJvZ3JhbSwgdmVydGV4U2hhZGVyKTtcblx0XHRnbC5kZXRhY2hTaGFkZXIodGhpcy5wcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XG5cblx0XHRnbC5kZWxldGVTaGFkZXIodmVydGV4U2hhZGVyKTtcblx0XHRnbC5kZWxldGVTaGFkZXIoZnJhZ21lbnRTaGFkZXIpO1xuXG5cdFx0aWYoIWdsLmdldFByb2dyYW1QYXJhbWV0ZXIodGhpcy5wcm9ncmFtLCBnbC5MSU5LX1NUQVRVUykpXG5cdFx0e1xuXHRcdFx0Y29uc29sZS5lcnJvcihnbC5nZXRQcm9ncmFtSW5mb0xvZyh0aGlzLnByb2dyYW0pKTtcblx0XHRcdGdsLmRlbGV0ZVByb2dyYW0odGhpcy5wcm9ncmFtKTtcblx0XHR9XG5cblx0XHRmb3IoY29uc3QgdW5pZm9ybSBvZiB1bmlmb3Jtcylcblx0XHR7XG5cdFx0XHRjb25zdCBsb2NhdGlvbiA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sIHVuaWZvcm0pO1xuXG5cdFx0XHRpZihsb2NhdGlvbiA9PT0gbnVsbClcblx0XHRcdHtcblx0XHRcdFx0Y29uc29sZS53YXJuKGBVbmlmb3JtICR7dW5pZm9ybX0gbm90IGZvdW5kLmApO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy51bmlmb3Jtc1t1bmlmb3JtXSA9IGxvY2F0aW9uO1xuXHRcdH1cblxuXHRcdGZvcihjb25zdCBhdHRyaWJ1dGUgb2YgYXR0cmlidXRlcylcblx0XHR7XG5cdFx0XHRjb25zdCBsb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgYXR0cmlidXRlKTtcblxuXHRcdFx0aWYobG9jYXRpb24gPT09IG51bGwpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnNvbGUud2FybihgQXR0cmlidXRlICR7YXR0cmlidXRlfSBub3QgZm91bmQuYCk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBidWZmZXIgPSBnbC5jcmVhdGVCdWZmZXIoKTtcblxuXHRcdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIGJ1ZmZlcik7XG5cdFx0XHRnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShsb2NhdGlvbik7XG5cdFx0XHRnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKFxuXHRcdFx0XHRsb2NhdGlvblxuXHRcdFx0XHQsIDJcblx0XHRcdFx0LCBnbC5GTE9BVFxuXHRcdFx0XHQsIGZhbHNlXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIDBcblx0XHRcdCk7XG5cblx0XHRcdHRoaXMuYXR0cmlidXRlc1thdHRyaWJ1dGVdID0gbG9jYXRpb247XG5cdFx0XHR0aGlzLmJ1ZmZlcnNbYXR0cmlidXRlXSA9IGJ1ZmZlcjtcblx0XHR9XG5cdH1cblxuXHR1c2UoKVxuXHR7XG5cdFx0dGhpcy5jb250ZXh0LnVzZVByb2dyYW0odGhpcy5wcm9ncmFtKTtcblx0fVxuXG5cdHVuaWZvcm1GKG5hbWUsIC4uLmZsb2F0cylcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5jb250ZXh0O1xuXHRcdGdsW2B1bmlmb3JtJHtmbG9hdHMubGVuZ3RofWZgXSh0aGlzLnVuaWZvcm1zW25hbWVdLCAuLi5mbG9hdHMpO1xuXHR9XG5cblx0dW5pZm9ybUkobmFtZSwgLi4uaW50cylcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5jb250ZXh0O1xuXHRcdGdsW2B1bmlmb3JtJHtpbnRzLmxlbmd0aH1pYF0odGhpcy51bmlmb3Jtc1tuYW1lXSwgLi4uaW50cyk7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIEdsMmRcbntcblx0Y29uc3RydWN0b3IoZWxlbWVudClcblx0e1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5jb250ZXh0ID0gdGhpcy5lbGVtZW50LmdldENvbnRleHQoJ3dlYmdsJyk7XG5cdFx0dGhpcy5zY3JlZW5TY2FsZSA9IDE7XG5cdFx0dGhpcy56b29tTGV2ZWwgPSAyO1xuXHR9XG5cblx0Y3JlYXRlU2hhZGVyKGxvY2F0aW9uKVxuXHR7XG5cdFx0Y29uc3QgZXh0ZW5zaW9uID0gbG9jYXRpb24uc3Vic3RyaW5nKGxvY2F0aW9uLmxhc3RJbmRleE9mKCcuJykrMSk7XG5cdFx0bGV0ICAgdHlwZSA9IG51bGw7XG5cblx0XHRzd2l0Y2goZXh0ZW5zaW9uLnRvVXBwZXJDYXNlKCkpXG5cdFx0e1xuXHRcdFx0Y2FzZSAnVkVSVCc6XG5cdFx0XHRcdHR5cGUgPSB0aGlzLmNvbnRleHQuVkVSVEVYX1NIQURFUjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdGUkFHJzpcblx0XHRcdFx0dHlwZSA9IHRoaXMuY29udGV4dC5GUkFHTUVOVF9TSEFERVI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNoYWRlciA9IHRoaXMuY29udGV4dC5jcmVhdGVTaGFkZXIodHlwZSk7XG5cdFx0Y29uc3Qgc291cmNlID0gcmVxdWlyZShsb2NhdGlvbik7XG5cblx0XHR0aGlzLmNvbnRleHQuc2hhZGVyU291cmNlKHNoYWRlciwgc291cmNlKTtcblx0XHR0aGlzLmNvbnRleHQuY29tcGlsZVNoYWRlcihzaGFkZXIpO1xuXG5cdFx0Y29uc3Qgc3VjY2VzcyA9IHRoaXMuY29udGV4dC5nZXRTaGFkZXJQYXJhbWV0ZXIoXG5cdFx0XHRzaGFkZXJcblx0XHRcdCwgdGhpcy5jb250ZXh0LkNPTVBJTEVfU1RBVFVTXG5cdFx0KTtcblxuXHRcdGlmKHN1Y2Nlc3MpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHNoYWRlcjtcblx0XHR9XG5cblx0XHRjb25zb2xlLmVycm9yKHRoaXMuY29udGV4dC5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcikpO1xuXG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVNoYWRlcihzaGFkZXIpO1xuXHR9XG5cblx0Y3JlYXRlUHJvZ3JhbSh7dmVydGV4U2hhZGVyLCBmcmFnbWVudFNoYWRlciwgdW5pZm9ybXMsIGF0dHJpYnV0ZXN9KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmNvbnRleHQ7XG5cblx0XHRyZXR1cm4gbmV3IFByb2dyYW0oe2dsLCB2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyLCB1bmlmb3JtcywgYXR0cmlidXRlc30pO1xuXHR9XG5cblx0Y3JlYXRlVGV4dHVyZSh3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmNvbnRleHQ7XG5cdFx0Y29uc3QgdGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCB3aWR0aFxuXHRcdFx0LCBoZWlnaHRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbnVsbFxuXHRcdCk7XG5cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblxuXHRcdC8vIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5MSU5FQVIpO1xuXHRcdC8vIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5MSU5FQVIpO1xuXG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcblxuXG5cdFx0cmV0dXJuIHRleHR1cmU7XG5cdH1cblxuXHRjcmVhdGVGcmFtZWJ1ZmZlcih0ZXh0dXJlKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmNvbnRleHQ7XG5cblx0XHRjb25zdCBmcmFtZWJ1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIGZyYW1lYnVmZmVyKTtcblxuXHRcdGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKFxuXHRcdFx0Z2wuRlJBTUVCVUZGRVJcblx0XHRcdCwgZ2wuQ09MT1JfQVRUQUNITUVOVDBcblx0XHRcdCwgZ2wuVEVYVFVSRV8yRFxuXHRcdFx0LCB0ZXh0dXJlXG5cdFx0XHQsIDBcblx0XHQpO1xuXG5cdFx0cmV0dXJuIGZyYW1lYnVmZmVyO1xuXHR9XG5cblx0ZW5hYmxlQmxlbmRpbmcoKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmNvbnRleHQ7XG5cdFx0Z2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG5cdFx0Z2wuZW5hYmxlKGdsLkJMRU5EKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgVmlldyBhcyBCYXNlVmlldyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1ZpZXcnO1xuaW1wb3J0IHsgS2V5Ym9hcmQgfSBmcm9tICdjdXJ2YXR1cmUvaW5wdXQvS2V5Ym9hcmQnXG5pbXBvcnQgeyBCYWcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CYWcnO1xuXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tICdDb25maWcnO1xuXG5pbXBvcnQgeyBUaWxlTWFwIH0gZnJvbSAnLi4vd29ybGQvVGlsZU1hcCc7XG5cbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZVNoZWV0JztcbmltcG9ydCB7IFNwcml0ZUJvYXJkIH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZUJvYXJkJztcblxuaW1wb3J0IHsgQ29udHJvbGxlciBhcyBPblNjcmVlbkpveVBhZCB9IGZyb20gJy4uL3VpL0NvbnRyb2xsZXInO1xuaW1wb3J0IHsgTWFwRWRpdG9yICAgfSBmcm9tICcuLi91aS9NYXBFZGl0b3InO1xuXG5pbXBvcnQgeyBFbnRpdHkgfSBmcm9tICcuLi9tb2RlbC9FbnRpdHknO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi4vc3ByaXRlL0NhbWVyYSc7XG5cbmltcG9ydCB7IENvbnRyb2xsZXIgfSBmcm9tICcuLi9tb2RlbC9Db250cm9sbGVyJztcbmltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGUnO1xuaW1wb3J0IHsgV29ybGQgfSBmcm9tICcuLi93b3JsZC9Xb3JsZCc7XG5pbXBvcnQgeyBRdWFkdHJlZSB9IGZyb20gJy4uL21hdGgvUXVhZHRyZWUnO1xuaW1wb3J0IHsgUmVjdGFuZ2xlIH0gZnJvbSAnLi4vbWF0aC9SZWN0YW5nbGUnO1xuaW1wb3J0IHsgTVRyZWUgfSBmcm9tICcuLi9tYXRoL01UcmVlJztcblxuY29uc3QgQXBwbGljYXRpb24gPSB7fTtcblxuQXBwbGljYXRpb24ub25TY3JlZW5Kb3lQYWQgPSBuZXcgT25TY3JlZW5Kb3lQYWQ7XG5BcHBsaWNhdGlvbi5rZXlib2FyZCA9IEtleWJvYXJkLmdldCgpO1xuXG5cbmNvbnN0IHF1YWQgPSBuZXcgUXVhZHRyZWUoMCwgMCwgMTAwLCAxMDAsIDAuMjUpO1xucXVhZC5pbnNlcnQoe3g6IDEwLCB5OiAxMH0pO1xucXVhZC5pbnNlcnQoe3g6IDIwLCB5OiAyMH0pO1xucXVhZC5pbnNlcnQoe3g6IDIwLCB5OiAyNX0pO1xucXVhZC5pbnNlcnQoe3g6IDI1LCB5OiAyNX0pO1xuXG4vLyBjb25zb2xlLmxvZyhxdWFkKTtcbi8vIGNvbnNvbGUubG9nKHF1YWQuZmluZExlYWYoNzUsIDc1KSk7XG4vLyBjb25zb2xlLmxvZyhxdWFkLnNlbGVjdCgwICwgMCwgMjAsIDIwKSk7XG5cbmNvbnN0IG1hcFRyZWUgPSBuZXcgTVRyZWU7XG5cbi8vIGNvbnN0IHJlY3QxID0gbmV3IFJlY3RhbmdsZSggMCwgMCwgNTAsICAyMCk7XG4vLyBjb25zdCByZWN0MiA9IG5ldyBSZWN0YW5nbGUoMjUsIDAsIDc1LCAgMTApO1xuLy8gY29uc3QgcmVjdDMgPSBuZXcgUmVjdGFuZ2xlKDUwLCAwLCA3NSwgIDEwKTtcbi8vIGNvbnN0IHJlY3Q0ID0gbmV3IFJlY3RhbmdsZSg1MCwgMCwgMTAwLCAxMDApO1xuLy8gY29uc3QgcmVjdDUgPSBuZXcgUmVjdGFuZ2xlKDE0MCwgMCwgMTYwLCAwKTtcbi8vIGNvbnNvbGUubG9nKHtyZWN0MSwgcmVjdDIsIHJlY3QzLCByZWN0NH0pO1xuLy8gbWFwVHJlZS5hZGQocmVjdDEpO1xuLy8gbWFwVHJlZS5hZGQocmVjdDIpO1xuLy8gbWFwVHJlZS5hZGQocmVjdDMpO1xuLy8gbWFwVHJlZS5hZGQocmVjdDQpO1xuLy8gbWFwVHJlZS5hZGQocmVjdDUpO1xuXG4vLyBjb25zdCB4U2l6ZSA9IDUwO1xuLy8gY29uc3QgeVNpemUgPSA1MDtcbi8vIGNvbnN0IHhTcGFjZSA9IDI1O1xuLy8gY29uc3QgeVNwYWNlID0gMjU7XG5cbi8vIGNvbnN0IHJlY3RzID0gW107XG5cbi8vIGZvcihsZXQgaSA9IDA7IGkgPCAxMDsgaSsrKVxuLy8ge1xuLy8gXHRmb3IobGV0IGogPSAwOyBqIDwgMTA7IGorKylcbi8vIFx0e1xuLy8gXHRcdGNvbnN0IHJlY3QgPSBuZXcgUmVjdGFuZ2xlKFxuLy8gXHRcdFx0aSAqIHhTcGFjZSwgaiAqIHlTcGFjZVxuLy8gXHRcdFx0LCBpICogeFNwYWNlICsgeFNpemUsIGogKiB5U3BhY2UgKyB5U2l6ZVxuLy8gXHRcdCk7XG5cbi8vIFx0XHRtYXBUcmVlLmFkZChyZWN0KTtcblxuLy8gXHRcdHJlY3RzLnB1c2gocmVjdCk7XG4vLyBcdH1cbi8vIH1cblxuLy8gLy8gY29uc29sZS5sb2cobWFwVHJlZSk7XG4vLyBjb25zb2xlLmxvZyhtYXBUcmVlLnNlZ21lbnRzKTtcbi8vIGNvbnNvbGUubG9nKG1hcFRyZWUucXVlcnkoMCwgMCwgMTAwLCAxMDApKTtcblxuLy8gZm9yKGNvbnN0IHJlY3Qgb2YgcmVjdHMpXG4vLyB7XG4vLyBcdG1hcFRyZWUuZGVsZXRlKHJlY3QpO1xuLy8gfVxuXG4vLyBjb25zb2xlLmxvZyhtYXBUcmVlLnNlZ21lbnRzKTtcbi8vIGNvbnNvbGUubG9nKG1hcFRyZWUucXVlcnkoMCwgMCwgMTAwLCAxMDApKTtcblxuZXhwb3J0IGNsYXNzIFZpZXcgZXh0ZW5kcyBCYXNlVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0d2luZG93LnNtUHJvZmlsaW5nID0gdHJ1ZTtcblx0XHRzdXBlcihhcmdzKTtcblx0XHR0aGlzLnRlbXBsYXRlICA9IHJlcXVpcmUoJy4vdmlldy50bXAnKTtcblx0XHR0aGlzLnJvdXRlcyAgICA9IFtdO1xuXG5cdFx0dGhpcy5lbnRpdGllcyAgPSBuZXcgQmFnO1xuXHRcdHRoaXMua2V5Ym9hcmQgID0gQXBwbGljYXRpb24ua2V5Ym9hcmQ7XG5cdFx0dGhpcy5zcGVlZCAgICAgPSAyNDtcblx0XHR0aGlzLm1heFNwZWVkICA9IHRoaXMuc3BlZWQ7XG5cblx0XHR0aGlzLmFyZ3MuY29udHJvbGxlciA9IEFwcGxpY2F0aW9uLm9uU2NyZWVuSm95UGFkO1xuXG5cdFx0dGhpcy5hcmdzLmZwcyAgPSAwO1xuXHRcdHRoaXMuYXJncy5zcHMgID0gMDtcblxuXHRcdHRoaXMuYXJncy5jYW1YID0gMDtcblx0XHR0aGlzLmFyZ3MuY2FtWSA9IDA7XG5cblx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrID0gNjA7XG5cdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID0gNjA7XG5cblx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IGZhbHNlO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5saXN0ZW5pbmcgPSB0cnVlO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnRXNjYXBlJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID09PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5zcHJpdGVCb2FyZC51bnNlbGVjdCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnSG9tZScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2srKztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0VuZCcsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2stLTtcblxuXHRcdFx0XHRpZih0aGlzLmFyZ3MuZnJhbWVMb2NrIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2sgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdQYWdlVXAnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2srKztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ1BhZ2VEb3duJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrLS07XG5cblx0XHRcdFx0aWYodGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cblx0XHR0aGlzLndvcmxkID0gbmV3IFdvcmxkKHtzcmM6ICcuL3dvcmxkLmpzb24nfSk7XG5cblx0XHR0aGlzLm1hcCA9IG5ldyBUaWxlTWFwKHtcblx0XHRcdHNwcml0ZVNoZWV0OiB0aGlzLnNwcml0ZVNoZWV0XG5cdFx0XHQsIHNyYzogJy4vbWFwLmpzb24nXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFyZ3MubWFwRWRpdG9yICA9IG5ldyBNYXBFZGl0b3Ioe1xuXHRcdFx0c3ByaXRlU2hlZXQ6IHRoaXMuc3ByaXRlU2hlZXRcblx0XHRcdCwgd29ybGQ6IHRoaXMud29ybGRcblx0XHRcdCwgbWFwOiB0aGlzLm1hcFxuXHRcdH0pO1xuXHR9XG5cblx0b25SZW5kZXJlZCgpXG5cdHtcblx0XHRjb25zdCBzcHJpdGVCb2FyZCA9IG5ldyBTcHJpdGVCb2FyZCh7XG5cdFx0XHRlbGVtZW50OiB0aGlzLnRhZ3MuY2FudmFzLmVsZW1lbnRcblx0XHRcdCwgd29ybGQ6IHRoaXMud29ybGRcblx0XHRcdCwgbWFwOiB0aGlzLm1hcFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXG5cdFx0Y29uc3QgZW50aXR5ID0gbmV3IEVudGl0eSh7XG5cdFx0XHRzcHJpdGU6IG5ldyBTcHJpdGUoe1xuXHRcdFx0XHR4OiA0OCxcblx0XHRcdFx0eTogNjQsXG5cdFx0XHRcdHNyYzogdW5kZWZpbmVkLFxuXHRcdFx0XHRzcHJpdGVCb2FyZDogc3ByaXRlQm9hcmQsXG5cdFx0XHRcdHNwcml0ZVNoZWV0OiB0aGlzLnNwcml0ZVNoZWV0LFxuXHRcdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRcdGhlaWdodDogNDgsXG5cdFx0XHR9KSxcblx0XHRcdGNvbnRyb2xsZXI6IG5ldyBDb250cm9sbGVyKHtcblx0XHRcdFx0a2V5Ym9hcmQ6IHRoaXMua2V5Ym9hcmQsXG5cdFx0XHRcdG9uU2NyZWVuSm95UGFkOiB0aGlzLmFyZ3MuY29udHJvbGxlcixcblx0XHRcdH0pLFxuXHRcdFx0Y2FtZXJhOiBDYW1lcmEsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmVudGl0aWVzLmFkZChlbnRpdHkpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuc3ByaXRlcy5hZGQoZW50aXR5LnNwcml0ZSk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZyA9IGVudGl0eTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJz0nLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnpvb20oMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCcrJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy56b29tKDEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnLScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuem9vbSgtMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmFyZ3MubWFwRWRpdG9yLmFyZ3MuYmluZFRvKCdzZWxlY3RlZEdyYXBoaWMnLCAodik9Pntcblx0XHRcdGlmKCF2IHx8IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWCA9PSBudWxsKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy5zaG93RWRpdG9yID0gZmFsc2U7XG5cblx0XHRcdGxldCBpICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuc3RhcnRHbG9iYWxYO1xuXHRcdFx0bGV0IGlpID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxYO1xuXG5cdFx0XHRpZihpaSA8IGkpXG5cdFx0XHR7XG5cdFx0XHRcdFtpaSwgaV0gPSBbaSwgaWldO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IoOyBpPD0gaWk7IGkrKylcblx0XHRcdHtcblx0XHRcdFx0bGV0IGogID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5zdGFydEdsb2JhbFk7XG5cdFx0XHRcdGxldCBqaiA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWTtcblx0XHRcdFx0aWYoamogPCBqKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0W2pqLCBqXSA9IFtqLCBqal07XG5cdFx0XHRcdH1cblx0XHRcdFx0Zm9yKDsgaiA8PSBqajsgaisrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5tYXAuc2V0VGlsZShpLCBqLCB2KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLm1hcC5zZXRUaWxlKFxuXHRcdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFhcblx0XHRcdFx0LCB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFlcblx0XHRcdFx0LCB2XG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC51bnNlbGVjdCgpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCAoKSA9PiB0aGlzLnJlc2l6ZSgpKTtcblxuXHRcdGxldCBmVGhlbiA9IDA7XG5cdFx0bGV0IHNUaGVuID0gMDtcblxuXHRcdGxldCBmU2FtcGxlcyA9IFtdO1xuXHRcdGxldCBzU2FtcGxlcyA9IFtdO1xuXG5cdFx0bGV0IG1heFNhbXBsZXMgPSA1O1xuXG5cdFx0Y29uc3Qgc2ltdWxhdGUgPSAobm93KSA9PiB7XG5cdFx0XHRub3cgPSBub3cgLyAxMDAwO1xuXG5cdFx0XHRjb25zdCBkZWx0YSA9IG5vdyAtIHNUaGVuO1xuXG5cdFx0XHRpZih0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPT0gMClcblx0XHRcdHtcblx0XHRcdFx0c1NhbXBsZXMgPSBbMF07XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYoZGVsdGEgPCAxLyh0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2srKDEwICogKHRoaXMuYXJncy5zaW11bGF0aW9uTG9jay82MCkpKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzVGhlbiA9IG5vdztcblxuXHRcdFx0dGhpcy5rZXlib2FyZC51cGRhdGUoKTtcblxuXHRcdFx0T2JqZWN0LnZhbHVlcyh0aGlzLmVudGl0aWVzLml0ZW1zKCkpLm1hcCgoZSk9Pntcblx0XHRcdFx0ZS5zaW11bGF0ZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIHRoaXMuc3ByaXRlQm9hcmQuc2ltdWxhdGUoKTtcblx0XHRcdC8vIHRoaXMuYXJncy5sb2NhbFggID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MubG9jYWxZICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQubG9jYWxZO1xuXHRcdFx0Ly8gdGhpcy5hcmdzLmdsb2JhbFggPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MuZ2xvYmFsWSA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWTtcblxuXHRcdFx0dGhpcy5hcmdzLl9zcHMgPSAoMSAvIGRlbHRhKTtcblxuXHRcdFx0c1NhbXBsZXMucHVzaCh0aGlzLmFyZ3MuX3Nwcyk7XG5cblx0XHRcdHdoaWxlKHNTYW1wbGVzLmxlbmd0aCA+IG1heFNhbXBsZXMpXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzLnNoaWZ0KCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHRoaXMuc3ByaXRlQm9hcmQubW92ZUNhbWVyYShzcHJpdGUueCwgc3ByaXRlLnkpO1xuXHRcdH07XG5cblx0XHRjb25zdCB1cGRhdGUgPSBub3cgPT4ge1xuXG5cdFx0XHRpZihkb2N1bWVudC5oaWRkZW4pXG5cdFx0XHR7XG5cdFx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzaW11bGF0ZShwZXJmb3JtYW5jZS5ub3coKSk7XG5cdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXcoKTtcblxuXHRcdFx0Y29uc3QgZGVsdGEgPSBub3cgLSBmVGhlbjtcblx0XHRcdGZUaGVuID0gbm93O1xuXG5cdFx0XHR0aGlzLmFyZ3MuZnBzID0gKDEwMDAgLyBkZWx0YSkudG9GaXhlZCgzKTtcblxuXHRcdFx0dGhpcy5hcmdzLmNhbVggPSBOdW1iZXIoQ2FtZXJhLngpLnRvRml4ZWQoMyk7XG5cdFx0XHR0aGlzLmFyZ3MuY2FtWSA9IE51bWJlcihDYW1lcmEueSkudG9GaXhlZCgzKTtcblxuXHRcdFx0aWYodGhpcy5zcHJpdGVCb2FyZC5mb2xsb3dpbmcpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5wb3NYID0gTnVtYmVyKHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nLnNwcml0ZS54KS50b0ZpeGVkKDMpO1xuXHRcdFx0XHR0aGlzLmFyZ3MucG9zWSA9IE51bWJlcih0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZy5zcHJpdGUueSkudG9GaXhlZCgzKTtcblx0XHRcdH1cblxuXHRcdH07XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQgLyAxMDI0ICogNDtcblx0XHR0aGlzLnJlc2l6ZSgpO1xuXG5cdFx0dXBkYXRlKHBlcmZvcm1hbmNlLm5vdygpKTtcblxuXHRcdC8vIHNldEludGVydmFsKCgpPT57XG5cdFx0Ly8gfSwgMCk7XG5cblx0XHRzZXRJbnRlcnZhbCgoKT0+e1xuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSBgJHtDb25maWcudGl0bGV9ICR7dGhpcy5hcmdzLmZwc30gRlBTYDtcblx0XHR9LCAyMjcvMyk7XG5cblx0XHRzZXRJbnRlcnZhbCgoKT0+e1xuXHRcdFx0Y29uc3Qgc3BzID0gc1NhbXBsZXMucmVkdWNlKChhLGIpPT5hK2IsIDApIC8gc1NhbXBsZXMubGVuZ3RoO1xuXHRcdFx0dGhpcy5hcmdzLnNwcyA9IHNwcy50b0ZpeGVkKDMpLnBhZFN0YXJ0KDUsICcgJyk7XG5cdFx0fSwgMjMxLzIpO1xuXHR9XG5cblx0cmVzaXplKHgsIHkpXG5cdHtcblx0XHR0aGlzLmFyZ3Mud2lkdGggID0gdGhpcy50YWdzLmNhbnZhcy5lbGVtZW50LndpZHRoICAgPSB4IHx8IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XG5cdFx0dGhpcy5hcmdzLmhlaWdodCA9IHRoaXMudGFncy5jYW52YXMuZWxlbWVudC5oZWlnaHQgID0geSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodDtcblxuXHRcdHRoaXMuYXJncy5yd2lkdGggPSBNYXRoLnRydW5jKFxuXHRcdFx0KHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgIC8gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHR0aGlzLmFyZ3MucmhlaWdodCA9IE1hdGgudHJ1bmMoXG5cdFx0XHQoeSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCkgLyB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0KTtcblxuXHRcdGNvbnN0IG9sZFNjYWxlID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSA9IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0IC8gMTAyNDtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgKj0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlIC8gb2xkU2NhbGU7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHR9XG5cblx0c2Nyb2xsKGV2ZW50KVxuXHR7XG5cdFx0bGV0IGRlbHRhID0gZXZlbnQuZGVsdGFZID4gMCA/IC0xIDogKFxuXHRcdFx0ZXZlbnQuZGVsdGFZIDwgMCA/IDEgOiAwXG5cdFx0KTtcblxuXHRcdHRoaXMuem9vbShkZWx0YSk7XG5cdH1cblxuXHR6b29tKGRlbHRhKVxuXHR7XG5cdFx0Y29uc3QgbWF4ID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMzI7XG5cdFx0Y29uc3QgbWluID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMC4yO1xuXHRcdGNvbnN0IHN0ZXAgPSAwLjA1ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblxuXHRcdGxldCB6b29tTGV2ZWwgPSAoZGVsdGEgKiBzdGVwICsgdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCkudG9GaXhlZCgyKTtcblxuXHRcdGlmKHpvb21MZXZlbCA8IG1pbilcblx0XHR7XG5cdFx0XHR6b29tTGV2ZWwgPSBtaW47XG5cdFx0fVxuXHRcdGVsc2UgaWYoem9vbUxldmVsID4gbWF4KVxuXHRcdHtcblx0XHRcdHpvb21MZXZlbCA9IG1heDtcblx0XHR9XG5cblx0XHRpZihNYXRoLmFicyh6b29tTGV2ZWwgLSAxKSA8IDAuMDUpXG5cdFx0e1xuXHRcdFx0em9vbUxldmVsID0gMTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICE9PSB6b29tTGV2ZWwpXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCA9IHpvb21MZXZlbDtcblx0XHRcdHRoaXMucmVzaXplKCk7XG5cdFx0fVxuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGNhbnZhc1xcblxcdGN2LXJlZiA9IFxcXCJjYW52YXM6Y3VydmF0dXJlL2Jhc2UvVGFnXFxcIlxcblxcdGN2LW9uICA9IFxcXCJ3aGVlbDpzY3JvbGwoZXZlbnQpO1xcXCJcXG4+PC9jYW52YXM+XFxuPGRpdiBjbGFzcyA9IFxcXCJodWQgZnBzXFxcIj5cXG4gW1tzcHNdXSBzaW11bGF0aW9ucy9zIC8gW1tzaW11bGF0aW9uTG9ja11dXFxuIFtbZnBzXV0gZnJhbWVzL3MgICAgICAvIFtbZnJhbWVMb2NrXV1cXG5cXG4gUmVzIFtbcndpZHRoXV0geCBbW3JoZWlnaHRdXVxcbiAgICAgW1t3aWR0aF1dIHggW1toZWlnaHRdXVxcblxcbiBDYW0gW1tjYW1YXV0geCBbW2NhbVldXVxcbiBQb3MgW1twb3NYXV0geCBbW3Bvc1ldXVxcblxcbiDOtCBTaW06ICAgUGcgVXAgLyBEblxcbiDOtCBGcmFtZTogSG9tZSAvIEVuZFxcbiDOtCBTY2FsZTogKyAvIC1cXG5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzID0gXFxcInJldGljbGVcXFwiPjwvZGl2PlxcblxcbltbY29udHJvbGxlcl1dXFxuXFxuPGRpdiBjdi1pZiA9IFxcXCJzaG93RWRpdG9yXFxcIj5cXG5cXHRbW21hcEVkaXRvcl1dXFxuXFx0LS1cXG5cXHRbW21tbV1dXFxuPC9zcGFuPlxcblwiIiwiaW1wb3J0IHsgUm91dGVyIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvUm91dGVyJztcbmltcG9ydCB7IFZpZXcgICB9IGZyb20gJ2hvbWUvVmlldyc7XG5cbmlmKFByb3h5ICE9PSB1bmRlZmluZWQpXG57XG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG5cdFx0Y29uc3QgdmlldyA9IG5ldyBWaWV3KCk7XG5cdFx0XG5cdFx0Um91dGVyLmxpc3Rlbih2aWV3KTtcblx0XHRcblx0XHR2aWV3LnJlbmRlcihkb2N1bWVudC5ib2R5KTtcblx0fSk7XG59XG5lbHNlXG57XG5cdC8vIGRvY3VtZW50LndyaXRlKHJlcXVpcmUoJy4vRmFsbGJhY2svZmFsbGJhY2sudG1wJykpO1xufVxuIiwiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJy4vSW5qZWN0YWJsZSc7XG5cbmV4cG9ydCBjbGFzcyBDb250YWluZXIgZXh0ZW5kcyBJbmplY3RhYmxlXG57XG5cdGluamVjdChpbmplY3Rpb25zKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKE9iamVjdC5hc3NpZ24oe30sIHRoaXMsIGluamVjdGlvbnMpKTtcblx0fVxufVxuIiwibGV0IGNsYXNzZXMgPSB7fTtcbmxldCBvYmplY3RzID0ge307XG5cbmV4cG9ydCBjbGFzcyBJbmplY3RhYmxlXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdGxldCBpbmplY3Rpb25zID0gdGhpcy5jb25zdHJ1Y3Rvci5pbmplY3Rpb25zKCk7XG5cdFx0bGV0IGNvbnRleHQgICAgPSB0aGlzLmNvbnN0cnVjdG9yLmNvbnRleHQoKTtcblxuXHRcdGlmKCFjbGFzc2VzW2NvbnRleHRdKVxuXHRcdHtcblx0XHRcdGNsYXNzZXNbY29udGV4dF0gPSB7fTtcblx0XHR9XG5cblx0XHRpZighb2JqZWN0c1tjb250ZXh0XSlcblx0XHR7XG5cdFx0XHRvYmplY3RzW2NvbnRleHRdID0ge307XG5cdFx0fVxuXG5cdFx0Zm9yKGxldCBuYW1lIGluIGluamVjdGlvbnMpXG5cdFx0e1xuXHRcdFx0bGV0IGluamVjdGlvbiA9IGluamVjdGlvbnNbbmFtZV07XG5cblx0XHRcdGlmKGNsYXNzZXNbY29udGV4dF1bbmFtZV0gfHwgIWluamVjdGlvbi5wcm90b3R5cGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZigvW0EtWl0vLnRlc3QoU3RyaW5nKG5hbWUpWzBdKSlcblx0XHRcdHtcblx0XHRcdFx0Y2xhc3Nlc1tjb250ZXh0XVtuYW1lXSA9IGluamVjdGlvbjtcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGZvcihsZXQgbmFtZSBpbiBpbmplY3Rpb25zKVxuXHRcdHtcblx0XHRcdGxldCBpbnN0YW5jZSAgPSB1bmRlZmluZWQ7XG5cdFx0XHRsZXQgaW5qZWN0aW9uID0gY2xhc3Nlc1tjb250ZXh0XVtuYW1lXSB8fCBpbmplY3Rpb25zW25hbWVdO1xuXG5cdFx0XHRpZigvW0EtWl0vLnRlc3QoU3RyaW5nKG5hbWUpWzBdKSlcblx0XHRcdHtcblx0XHRcdFx0aWYoaW5qZWN0aW9uLnByb3RvdHlwZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmKCFvYmplY3RzW2NvbnRleHRdW25hbWVdKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG9iamVjdHNbY29udGV4dF1bbmFtZV0gPSBuZXcgaW5qZWN0aW9uO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRvYmplY3RzW2NvbnRleHRdW25hbWVdID0gaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aW5zdGFuY2UgPSBvYmplY3RzW2NvbnRleHRdW25hbWVdO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRpZihpbmplY3Rpb24ucHJvdG90eXBlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aW5zdGFuY2UgPSBuZXcgaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGluc3RhbmNlID0gaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBuYW1lLCB7XG5cdFx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0XHR3cml0YWJsZTogICBmYWxzZSxcblx0XHRcdFx0dmFsdWU6ICAgICAgaW5zdGFuY2Vcblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cblx0c3RhdGljIGluamVjdGlvbnMoKVxuXHR7XG5cdFx0cmV0dXJuIHt9O1xuXHR9XG5cblx0c3RhdGljIGNvbnRleHQoKVxuXHR7XG5cdFx0cmV0dXJuICcuJztcblx0fVxuXG5cdHN0YXRpYyBpbmplY3QoaW5qZWN0aW9ucywgY29udGV4dCA9ICcuJylcblx0e1xuXHRcdGlmKCEodGhpcy5wcm90b3R5cGUgaW5zdGFuY2VvZiBJbmplY3RhYmxlIHx8IHRoaXMgPT09IEluamVjdGFibGUpKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGFjY2VzcyBpbmplY3RhYmxlIHN1YmNsYXNzIVxuXG5BcmUgeW91IHRyeWluZyB0byBpbnN0YW50aWF0ZSBsaWtlIHRoaXM/XG5cblx0bmV3IFguaW5qZWN0KHsuLi59KTtcblxuSWYgc28gcGxlYXNlIHRyeTpcblxuXHRuZXcgKFguaW5qZWN0KHsuLi59KSk7XG5cblBsZWFzZSBub3RlIHRoZSBwYXJlbnRoZXNpcy5cbmApO1xuXHRcdH1cblxuXHRcdGxldCBleGlzdGluZ0luamVjdGlvbnMgPSB0aGlzLmluamVjdGlvbnMoKTtcblxuXHRcdHJldHVybiBjbGFzcyBleHRlbmRzIHRoaXMge1xuXHRcdFx0c3RhdGljIGluamVjdGlvbnMoKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgZXhpc3RpbmdJbmplY3Rpb25zLCBpbmplY3Rpb25zKTtcblx0XHRcdH1cblx0XHRcdHN0YXRpYyBjb250ZXh0KClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIGNvbnRleHQ7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxufVxuIiwiY2xhc3MgU2luZ2xlXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHRoaXMubmFtZSA9ICdzc3MuJyArIE1hdGgucmFuZG9tKCk7XG5cdH1cbn1cblxubGV0IHNpbmdsZSA9IG5ldyBTaW5nbGU7XG5cbmV4cG9ydCB7U2luZ2xlLCBzaW5nbGV9OyIsImltcG9ydCB7IFJlY3RhbmdsZSB9IGZyb20gXCIuL1JlY3RhbmdsZVwiO1xuXG5jbGFzcyBTZWdtZW50XG57XG5cdGNvbnN0cnVjdG9yKHN0YXJ0LCBlbmQsIHByZXYsIGRlcHRoID0gMClcblx0e1xuXHRcdHRoaXMuc3RhcnQgPSBzdGFydDtcblx0XHR0aGlzLmVuZCAgID0gZW5kO1xuXHRcdHRoaXMuZGVwdGggPSBkZXB0aDtcblx0XHR0aGlzLnNpemUgID0gMDtcblxuXHRcdHRoaXMucmVjdGFuZ2xlcyA9IG5ldyBTZXQ7XG5cdFx0dGhpcy5zdWJUcmVlID0gZGVwdGggPCAxXG5cdFx0XHQ/IG5ldyBNVHJlZSgxICsgZGVwdGgpXG5cdFx0XHQ6IG51bGw7XG5cblx0XHR0aGlzLnByZXYgID0gcHJldjtcblx0fVxuXG5cdHNwbGl0KGF0KVxuXHR7XG5cdFx0aWYoYXQgPCB0aGlzLnN0YXJ0IHx8IGF0ID4gdGhpcy5lbmQpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1NwbGl0dGluZyBzZWdtZW50IG91dCBvZiBib3VuZHMhJyk7XG5cdFx0fVxuXG5cdFx0aWYoYXQgPT09IHRoaXMuc3RhcnQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFt0aGlzXTtcblx0XHR9XG5cblx0XHRpZihhdCA9PT0gdGhpcy5lbmQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFt0aGlzXTtcblx0XHR9XG5cblx0XHRjb25zdCBhID0gbmV3IFNlZ21lbnQodGhpcy5zdGFydCwgYXQsIHRoaXMucHJldiwgdGhpcy5kZXB0aCk7XG5cdFx0Y29uc3QgYiA9IG5ldyBTZWdtZW50KGF0LCB0aGlzLmVuZCwgYSwgdGhpcy5kZXB0aCk7XG5cblx0XHRmb3IoY29uc3QgcmVjdGFuZ2xlIG9mIHRoaXMucmVjdGFuZ2xlcylcblx0XHR7XG5cdFx0XHRjb25zdCByZWN0TWluID0gdGhpcy5kZXB0aCA9PT0gMCA/IHJlY3RhbmdsZS54MSA6IHJlY3RhbmdsZS55MTtcblx0XHRcdGNvbnN0IHJlY3RNYXggPSB0aGlzLmRlcHRoID09PSAwID8gcmVjdGFuZ2xlLngyIDogcmVjdGFuZ2xlLnkyO1xuXG5cdFx0XHRpZihyZWN0TWF4IDwgYXQpXG5cdFx0XHR7XG5cdFx0XHRcdGEuYWRkKHJlY3RhbmdsZSk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihyZWN0TWluID4gYXQpXG5cdFx0XHR7XG5cdFx0XHRcdGIuYWRkKHJlY3RhbmdsZSk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRhLmFkZChyZWN0YW5nbGUpO1xuXHRcdFx0Yi5hZGQocmVjdGFuZ2xlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gW2EsIGJdO1xuXHR9XG5cblx0YWRkKHJlY3RhbmdsZSlcblx0e1xuXHRcdGlmKHRoaXMuc3ViVHJlZSlcblx0XHR7XG5cdFx0XHR0aGlzLnN1YlRyZWUuYWRkKHJlY3RhbmdsZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5yZWN0YW5nbGVzLmFkZChyZWN0YW5nbGUpO1xuXHRcdHRoaXMuc2l6ZSA9IHRoaXMucmVjdGFuZ2xlcy5zaXplO1xuXHR9XG5cblx0ZGVsZXRlKHJlY3RhbmdsZSlcblx0e1xuXHRcdGlmKHRoaXMuc3ViVHJlZSlcblx0XHR7XG5cdFx0XHR0aGlzLnN1YlRyZWUuZGVsZXRlKHJlY3RhbmdsZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5yZWN0YW5nbGVzLmRlbGV0ZShyZWN0YW5nbGUpO1xuXHRcdHRoaXMuc2l6ZSA9IHRoaXMucmVjdGFuZ2xlcy5zaXplO1xuXG5cdFx0Y29uc3QgZW1wdHkgPSAoIXRoaXMucmVjdGFuZ2xlcy5zaXplKSAmJiB0aGlzLnN0YXJ0ID4gLUluZmluaXR5O1xuXG5cdFx0cmV0dXJuIGVtcHR5O1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBNVHJlZVxue1xuXHRjb25zdHJ1Y3RvcihkZXB0aCA9IDApXG5cdHtcblx0XHR0aGlzLmRlcHRoID0gZGVwdGg7XG5cdFx0dGhpcy5zZWdtZW50cyA9IFtuZXcgU2VnbWVudCgtSW5maW5pdHksIEluZmluaXR5LCBudWxsLCB0aGlzLmRlcHRoKV07XG5cdH1cblxuXHRhZGQocmVjdGFuZ2xlKVxuXHR7XG5cdFx0Y29uc3QgcmVjdE1pbiA9IHRoaXMuZGVwdGggPT09IDAgPyByZWN0YW5nbGUueDEgOiByZWN0YW5nbGUueTE7XG5cdFx0Y29uc3QgcmVjdE1heCA9IHRoaXMuZGVwdGggPT09IDAgPyByZWN0YW5nbGUueDIgOiByZWN0YW5nbGUueTI7XG5cblx0XHRjb25zdCBzdGFydEluZGV4ID0gdGhpcy5maW5kU2VnbWVudChyZWN0TWluKTtcblx0XHR0aGlzLnNwbGl0U2VnbWVudChzdGFydEluZGV4LCByZWN0TWluKTtcblxuXHRcdGNvbnN0IGVuZEluZGV4ID0gdGhpcy5maW5kU2VnbWVudChyZWN0TWF4KTtcblx0XHR0aGlzLnNwbGl0U2VnbWVudChlbmRJbmRleCwgcmVjdE1heCk7XG5cblx0XHRpZihzdGFydEluZGV4ID09PSBlbmRJbmRleClcblx0XHR7XG5cdFx0XHR0aGlzLnNlZ21lbnRzW3N0YXJ0SW5kZXhdLmFkZChyZWN0YW5nbGUpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGZvcihsZXQgaSA9IDEgKyBzdGFydEluZGV4OyBpIDw9IGVuZEluZGV4OyBpKyspXG5cdFx0e1xuXHRcdFx0dGhpcy5zZWdtZW50c1tpXS5hZGQocmVjdGFuZ2xlKTtcblx0XHR9XG5cdH1cblxuXHRkZWxldGUocmVjdGFuZ2xlKVxuXHR7XG5cdFx0Y29uc3QgcmVjdE1pbiA9IHRoaXMuZGVwdGggPT09IDAgPyByZWN0YW5nbGUueDEgOiByZWN0YW5nbGUueTE7XG5cdFx0Y29uc3QgcmVjdE1heCA9IHRoaXMuZGVwdGggPT09IDAgPyByZWN0YW5nbGUueDIgOiByZWN0YW5nbGUueTI7XG5cblx0XHRjb25zdCBzdGFydEluZGV4ID0gdGhpcy5maW5kU2VnbWVudChyZWN0TWluKTtcblx0XHRjb25zdCBlbmRJbmRleCA9IHRoaXMuZmluZFNlZ21lbnQocmVjdE1heCk7XG5cblx0XHRjb25zdCBlbXB0eSA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpID0gc3RhcnRJbmRleDsgaSA8PSBlbmRJbmRleDsgaSsrKVxuXHRcdHtcblx0XHRcdGlmKHRoaXMuc2VnbWVudHNbaV0uZGVsZXRlKHJlY3RhbmdsZSkpXG5cdFx0XHR7XG5cdFx0XHRcdGVtcHR5LnB1c2goaSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Zm9yKGxldCBpID0gLTEgKyBlbXB0eS5sZW5ndGg7IGkgPj0gMDsgaS0tKVxuXHRcdHtcblx0XHRcdGNvbnN0IGUgPSBlbXB0eVtpXTtcblxuXHRcdFx0aWYoIXRoaXMuc2VnbWVudHNbLTEgKyBlXSlcblx0XHRcdHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGVsZXRlIHNlZ21lbnQgd2l0aG91dCBwcmVkZWNlc3Nvci4nKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNlZ21lbnRzWy0xICsgZV0uZW5kID0gdGhpcy5zZWdtZW50c1tlXS5lbmQ7XG5cdFx0XHR0aGlzLnNlZ21lbnRzWzEgKyBlXS5wcmV2ID0gdGhpcy5zZWdtZW50c1stMSArIGVdO1xuXHRcdFx0dGhpcy5zZWdtZW50cy5zcGxpY2UoZSwgMSk7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5zZWdtZW50cy5sZW5ndGggPT09IDIgJiYgdGhpcy5zZWdtZW50c1swXS5zaXplID09IDAgJiYgdGhpcy5zZWdtZW50c1sxXS5zaXplID09PSAwKVxuXHRcdHtcblx0XHRcdHRoaXMuc2VnbWVudHNbMF0uZW5kID0gdGhpcy5zZWdtZW50c1sxXS5lbmQ7XG5cdFx0XHR0aGlzLnNlZ21lbnRzLmxlbmd0aCA9IDE7XG5cdFx0fVxuXHR9XG5cblx0cXVlcnkoeDEsIHkxLCB4MiwgeTIpXG5cdHtcblx0XHRjb25zb2xlLnRpbWUoJ3F1ZXJ5IHRpbWUnKTtcblxuXHRcdGNvbnN0IHJlY3RhbmdsZXMgPSBuZXcgU2V0O1xuXG5cdFx0Y29uc3QgeFN0YXJ0SW5kZXggPSB0aGlzLmZpbmRTZWdtZW50KHgxKTtcblx0XHRjb25zdCB4RW5kSW5kZXggPSB0aGlzLmZpbmRTZWdtZW50KHgyKTtcblxuXHRcdGZvcihsZXQgaSA9IHhTdGFydEluZGV4OyBpIDw9IHhFbmRJbmRleDsgaSsrKVxuXHRcdHtcblx0XHRcdGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzW2ldO1xuXG5cdFx0XHRpZighc2VnbWVudC5zdWJUcmVlKVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgeVN0YXJ0SW5kZXggPSBzZWdtZW50LnN1YlRyZWUuZmluZFNlZ21lbnQoeTEpO1xuXHRcdFx0Y29uc3QgeUVuZEluZGV4ID0gc2VnbWVudC5zdWJUcmVlLmZpbmRTZWdtZW50KHkyKTtcblxuXHRcdFx0Zm9yKGxldCBqID0geVN0YXJ0SW5kZXg7IGogPD0geUVuZEluZGV4OyBqKyspXG5cdFx0XHR7XG5cdFx0XHRcdGZvcihjb25zdCByZWN0YW5nbGUgb2Ygc2VnbWVudC5zdWJUcmVlLnNlZ21lbnRzW2pdLnJlY3RhbmdsZXMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZWN0YW5nbGVzLmFkZChyZWN0YW5nbGUpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zb2xlLnRpbWVFbmQoJ3F1ZXJ5IHRpbWUnKTtcblx0XHRyZXR1cm4gcmVjdGFuZ2xlcztcblx0fVxuXG5cdHNwbGl0U2VnbWVudChpbmRleCwgYXQpXG5cdHtcblx0XHRpZihhdCA8PSB0aGlzLnNlZ21lbnRzW2luZGV4XS5zdGFydCB8fCBhdCA+PSB0aGlzLnNlZ21lbnRzW2luZGV4XS5lbmQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNwbGl0U2VnbWVudHMgPSB0aGlzLnNlZ21lbnRzW2luZGV4XS5zcGxpdChhdCk7XG5cblx0XHR0aGlzLnNlZ21lbnRzLnNwbGljZShpbmRleCwgMSwgLi4uc3BsaXRTZWdtZW50cyk7XG5cdH1cblxuXHRmaW5kU2VnbWVudChhdClcblx0e1xuXHRcdGxldCBsbyA9IDA7XG5cdFx0bGV0IGhpID0gLTEgKyB0aGlzLnNlZ21lbnRzLmxlbmd0aDtcblxuXHRcdGRvXG5cdFx0e1xuXHRcdFx0Y29uc3QgY3VycmVudCA9IE1hdGguZmxvb3IoKGxvICsgaGkpICogMC41KTtcblx0XHRcdGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzW2N1cnJlbnRdO1xuXG5cdFx0XHRpZihzZWdtZW50LnN0YXJ0IDw9IGF0ICYmIHNlZ21lbnQuZW5kID49IGF0KVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudDtcblx0XHRcdH1cblxuXHRcdFx0aWYoc2VnbWVudC5zdGFydCA8IGF0KVxuXHRcdFx0e1xuXHRcdFx0XHRsbyA9IDEgKyBjdXJyZW50O1xuXHRcdFx0fVxuXG5cdFx0XHRpZihzZWdtZW50LmVuZCA+IGF0KVxuXHRcdFx0e1xuXHRcdFx0XHRoaSA9IC0xICsgY3VycmVudDtcblx0XHRcdH1cblx0XHR9IHdoaWxlKGxvIDw9IGhpKTtcblxuXHRcdHJldHVybiAtMTtcblx0fVxufVxuIiwiaW1wb3J0IHsgUmVjdGFuZ2xlIH0gZnJvbSBcIi4vUmVjdGFuZ2xlXCI7XG5cbmV4cG9ydCBjbGFzcyBRdWFkdHJlZSBleHRlbmRzIFJlY3RhbmdsZVxue1xuXHRjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgbWluU2l6ZSlcblx0e1xuXHRcdHN1cGVyKHgxLCB5MSwgeDIsIHkyKTtcblxuXHRcdHRoaXMuc3BsaXQgPSBmYWxzZTtcblx0XHR0aGlzLml0ZW1zID0gbmV3IFNldDtcblx0XHR0aGlzLm1pblNpemUgPSBtaW5TaXplO1xuXG5cdFx0dGhpcy51bENlbGwgPSBudWxsO1xuXHRcdHRoaXMudXJDZWxsID0gbnVsbDtcblx0XHR0aGlzLmJsQ2VsbCA9IG51bGw7XG5cdFx0dGhpcy5ickNlbGwgPSBudWxsO1xuXHR9XG5cblx0aW5zZXJ0KGVudGl0eSlcblx0e1xuXHRcdGlmKCF0aGlzLmNvbnRhaW5zKGVudGl0eS54LCBlbnRpdHkueSkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHhTaXplID0gdGhpcy54MiAtIHRoaXMueDE7XG5cdFx0Y29uc3QgeVNpemUgPSB0aGlzLnkyIC0gdGhpcy55MTtcblxuXHRcdGlmKHRoaXMuaXRlbXMuc2l6ZSAmJiB4U2l6ZSA+IHRoaXMubWluU2l6ZSAmJiB5U2l6ZSA+IHRoaXMubWluU2l6ZSlcblx0XHR7XG5cdFx0XHRpZighdGhpcy5zcGxpdClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgeFNpemVIYWxmID0gMC41ICogeFNpemU7XG5cdFx0XHRcdGNvbnN0IHlTaXplSGFsZiA9IDAuNSAqIHlTaXplO1xuXG5cdFx0XHRcdHRoaXMudWxDZWxsID0gbmV3IFF1YWR0cmVlKHRoaXMueDEsIHRoaXMueTEsICAgICAgICAgICAgIHRoaXMueDEgKyB4U2l6ZUhhbGYsIHRoaXMueTEgKyB5U2l6ZUhhbGYsIHRoaXMubWluU2l6ZSk7XG5cdFx0XHRcdHRoaXMuYmxDZWxsID0gbmV3IFF1YWR0cmVlKHRoaXMueDEsIHRoaXMueTEgKyB5U2l6ZUhhbGYsIHRoaXMueDEgKyB4U2l6ZUhhbGYsIHRoaXMueTIsICAgICAgICAgICAgIHRoaXMubWluU2l6ZSk7XG5cblx0XHRcdFx0dGhpcy51ckNlbGwgPSBuZXcgUXVhZHRyZWUodGhpcy54MSArIHhTaXplSGFsZiwgdGhpcy55MSwgICAgICAgICAgICAgdGhpcy54MiwgdGhpcy55MSArIHlTaXplSGFsZiwgdGhpcy5taW5TaXplKTtcblx0XHRcdFx0dGhpcy5ickNlbGwgPSBuZXcgUXVhZHRyZWUodGhpcy54MSArIHhTaXplSGFsZiwgdGhpcy55MSArIHlTaXplSGFsZiwgdGhpcy54MiwgdGhpcy55MiwgICAgICAgICAgICAgdGhpcy5taW5TaXplKTtcblxuXHRcdFx0XHR0aGlzLnNwbGl0ICA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdGZvcihjb25zdCBpdGVtIG9mIHRoaXMuaXRlbXMpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMudWxDZWxsLmluc2VydChpdGVtKTtcblx0XHRcdFx0dGhpcy51ckNlbGwuaW5zZXJ0KGl0ZW0pO1xuXHRcdFx0XHR0aGlzLmJsQ2VsbC5pbnNlcnQoaXRlbSk7XG5cdFx0XHRcdHRoaXMuYnJDZWxsLmluc2VydChpdGVtKTtcblxuXHRcdFx0XHR0aGlzLml0ZW1zLmRlbGV0ZShpdGVtKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy51bENlbGwuaW5zZXJ0KGVudGl0eSk7XG5cdFx0XHR0aGlzLnVyQ2VsbC5pbnNlcnQoZW50aXR5KTtcblx0XHRcdHRoaXMuYmxDZWxsLmluc2VydChlbnRpdHkpO1xuXHRcdFx0dGhpcy5ickNlbGwuaW5zZXJ0KGVudGl0eSk7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR0aGlzLml0ZW1zLmFkZChlbnRpdHkpO1xuXHRcdH1cblx0fVxuXG5cdGZpbmRMZWFmKHgsIHkpXG5cdHtcblx0XHRpZighdGhpcy5jb250YWlucyh4LCB5KSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cblx0XHRpZighdGhpcy5zcGxpdClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy51bENlbGwuZmluZExlYWYoeCwgeSlcblx0XHRcdD8/IHRoaXMudXJDZWxsLmZpbmRMZWFmKHgsIHkpXG5cdFx0XHQ/PyB0aGlzLmJsQ2VsbC5maW5kTGVhZih4LCB5KVxuXHRcdFx0Pz8gdGhpcy5ickNlbGwuZmluZExlYWYoeCwgeSk7XG5cdH1cblxuXHRoYXMoZW50aXR5KVxuXHR7XG5cdFx0aWYodGhpcy5zcGxpdClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy51bENlbGwuaGFzKGVudGl0eSlcblx0XHRcdFx0fHwgdGhpcy51ckNlbGwuaGFzKGVudGl0eSlcblx0XHRcdFx0fHwgdGhpcy5ibENlbGwuaGFzKGVudGl0eSlcblx0XHRcdFx0fHwgdGhpcy5ickNlbGwuaGFzKGVudGl0eSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuaXRlbXMuaGFzKGVudGl0eSk7XG5cdH1cblxuXHRzZWxlY3QoeCwgeSwgdywgaClcblx0e1xuXHRcdGNvbnN0IHhNYXggPSB4ICsgdztcblx0XHRjb25zdCB5TWF4ID0geSArIGg7XG5cblx0XHRpZih4TWF4IDwgdGhpcy54MSB8fCB4ID4gdGhpcy54Milcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFNldDtcblx0XHR9XG5cblx0XHRpZih5TWF4IDwgdGhpcy55MSB8fCB5ID4gdGhpcy55Milcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFNldDtcblx0XHR9XG5cblx0XHRpZih0aGlzLnNwbGl0KVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgU2V0KFtcblx0XHRcdFx0Li4udGhpcy51bENlbGwuc2VsZWN0KHgsIHksIHcsIGgpXG5cdFx0XHRcdCwgLi4udGhpcy51ckNlbGwuc2VsZWN0KHgsIHksIHcsIGgpXG5cdFx0XHRcdCwgLi4udGhpcy5ibENlbGwuc2VsZWN0KHgsIHksIHcsIGgpXG5cdFx0XHRcdCwgLi4udGhpcy5ickNlbGwuc2VsZWN0KHgsIHksIHcsIGgpXG5cdFx0XHRdKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5pdGVtcztcblx0fVxuXG5cdGR1bXAoKVxuXHR7XG5cdFx0aWYodGhpcy5zcGxpdClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFNldChbXG5cdFx0XHRcdC4uLnRoaXMudWxDZWxsLmR1bXAoKVxuXHRcdFx0XHQsIC4uLnRoaXMudXJDZWxsLmR1bXAoKVxuXHRcdFx0XHQsIC4uLnRoaXMuYmxDZWxsLmR1bXAoKVxuXHRcdFx0XHQsIC4uLnRoaXMuYnJDZWxsLmR1bXAoKVxuXHRcdFx0XSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuaXRlbXM7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBSZWN0YW5nbGVcbntcblx0Y29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIpXG5cdHtcblx0XHR0aGlzLngxID0geDE7XG5cdFx0dGhpcy55MSA9IHkxO1xuXHRcdHRoaXMueDIgPSB4Mjtcblx0XHR0aGlzLnkyID0geTI7XG5cdH1cblxuXHRjb250YWlucyh4LCB5KVxuXHR7XG5cdFx0aWYoeCA8IHRoaXMueDEgfHwgeCA+IHRoaXMueDIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKHkgPCB0aGlzLnkxIHx8IHkgPiB0aGlzLnkyKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGludGVyc2VjdGlvbihvdGhlcilcblx0e1xuXHRcdGlmKHRoaXMueDEgPiBvdGhlci54MiB8fCB0aGlzLngyIDwgb3RoZXIueDEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMueTEgPiBvdGhlci55MiB8fCB0aGlzLnkyIDwgb3RoZXIueTEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5ldyAodGhpcy5jb25zdHJ1Y3RvcikoXG5cdFx0XHRNYXRoLm1heCh0aGlzLngxLCBvdGhlci54MSksIE1hdGgubWF4KHRoaXMueTEsIG90aGVyLnkxKVxuXHRcdFx0LCBNYXRoLm1pbih0aGlzLngyLCBvdGhlci54MiksIE1hdGgubWluKHRoaXMueTIsIG90aGVyLnkyKVxuXHRcdCk7XG5cdH1cblxuXHRpc0luc2lkZShvdGhlcilcblx0e1xuXHRcdHJldHVybiB0aGlzLngxIDw9IG90aGVyLngxXG5cdFx0XHQmJiB0aGlzLnkxID49IG90aGVyLnkxXG5cdFx0XHQmJiB0aGlzLngyID49IG90aGVyLngyXG5cdFx0XHQmJiB0aGlzLnkyID49IG90aGVyLnkyO1xuXHR9XG5cblx0aXNPdXRzaWRlKG90aGVyKVxuXHR7XG5cdFx0cmV0dXJuIG90aGVyLmlzSW5zaWRlKHRoaXMpO1xuXHR9XG5cblx0dG9UcmlhbmdsZXMoZGltID0gMilcblx0e1xuXHRcdGlmKGRpbSA9PT0gMilcblx0XHR7XG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHR0aGlzLngxLCB0aGlzLnkxLFxuXHRcdFx0XHR0aGlzLngyLCB0aGlzLnkxLFxuXHRcdFx0XHR0aGlzLngxLCB0aGlzLnkyLFxuXHRcdFx0XHR0aGlzLngxLCB0aGlzLnkyLFxuXHRcdFx0XHR0aGlzLngyLCB0aGlzLnkxLFxuXHRcdFx0XHR0aGlzLngyLCB0aGlzLnkyLFxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRpZihkaW0gPT09IDMpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0dGhpcy54MSwgdGhpcy55MSwgMSxcblx0XHRcdFx0dGhpcy54MiwgdGhpcy55MSwgMSxcblx0XHRcdFx0dGhpcy54MSwgdGhpcy55MiwgMSxcblx0XHRcdFx0dGhpcy54MSwgdGhpcy55MiwgMSxcblx0XHRcdFx0dGhpcy54MiwgdGhpcy55MSwgMSxcblx0XHRcdFx0dGhpcy54MiwgdGhpcy55MiwgMSxcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0aWYoZGltID09PSA0KVxuXHRcdHtcblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdHRoaXMueDEsIHRoaXMueTEsIDAsIDEsXG5cdFx0XHRcdHRoaXMueDIsIHRoaXMueTEsIDAsIDEsXG5cdFx0XHRcdHRoaXMueDEsIHRoaXMueTIsIDAsIDEsXG5cdFx0XHRcdHRoaXMueDEsIHRoaXMueTIsIDAsIDEsXG5cdFx0XHRcdHRoaXMueDIsIHRoaXMueTEsIDAsIDEsXG5cdFx0XHRcdHRoaXMueDIsIHRoaXMueTIsIDAsIDEsXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdHJldHVybiBbXG5cdFx0XHR0aGlzLngxLCB0aGlzLnkxLCAuLi4oZGltID4gMiA/IEFycmF5KC0yK2RpbSkuZmlsbCgwKTogW10pLFxuXHRcdFx0dGhpcy54MiwgdGhpcy55MSwgLi4uKGRpbSA+IDIgPyBBcnJheSgtMitkaW0pLmZpbGwoMCk6IFtdKSxcblx0XHRcdHRoaXMueDEsIHRoaXMueTIsIC4uLihkaW0gPiAyID8gQXJyYXkoLTIrZGltKS5maWxsKDApOiBbXSksXG5cdFx0XHR0aGlzLngxLCB0aGlzLnkyLCAuLi4oZGltID4gMiA/IEFycmF5KC0yK2RpbSkuZmlsbCgwKTogW10pLFxuXHRcdFx0dGhpcy54MiwgdGhpcy55MSwgLi4uKGRpbSA+IDIgPyBBcnJheSgtMitkaW0pLmZpbGwoMCk6IFtdKSxcblx0XHRcdHRoaXMueDIsIHRoaXMueTIsIC4uLihkaW0gPiAyID8gQXJyYXkoLTIrZGltKS5maWxsKDApOiBbXSksXG5cdFx0XTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIFNwbGl0XG57XG5cdHN0YXRpYyBieXRlcyA9IG5ldyBVaW50OENsYW1wZWRBcnJheSg0KTtcblx0c3RhdGljIHdvcmRzID0gbmV3IFVpbnQxNkFycmF5KHRoaXMuYnl0ZXMuYnVmZmVyKTtcblx0c3RhdGljIHZhbHVlID0gbmV3IFVpbnQzMkFycmF5KHRoaXMuYnl0ZXMuYnVmZmVyKTtcblxuXHRzdGF0aWMgaW50VG9CeXRlcyh2YWx1ZSlcblx0e1xuXHRcdHRoaXMudmFsdWVbMF0gPSB2YWx1ZTtcblxuXHRcdHJldHVybiBbLi4udGhpcy5ieXRlc107XG5cdH1cbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuXG5leHBvcnQgIGNsYXNzIENvbnRyb2xsZXJcbntcblx0dHJpZ2dlcnMgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUoe30pO1xuXHRheGlzICAgICA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh7fSk7XG5cdFxuXHRjb25zdHJ1Y3Rvcih7a2V5Ym9hcmQsIG9uU2NyZWVuSm95UGFkfSlcblx0e1xuXHRcdGtleWJvYXJkLmtleXMuYmluZFRvKCh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMua2V5UHJlc3Moayx2LHRba10pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmKHYgPT09IC0xKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmtleVJlbGVhc2Uoayx2LHRba10pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHR9KTtcblxuXHRcdG9uU2NyZWVuSm95UGFkLmFyZ3MuYmluZFRvKCd4JywgKHYpID0+IHtcblx0XHRcdHRoaXMuYXhpc1swXSA9IHYgLyA1MDtcblx0XHR9KTtcblxuXHRcdG9uU2NyZWVuSm95UGFkLmFyZ3MuYmluZFRvKCd5JywgKHYpID0+IHtcblx0XHRcdHRoaXMuYXhpc1sxXSA9IHYgLyA1MDtcblx0XHR9KTtcblx0fVxuXG5cdGtleVByZXNzKGtleSwgdmFsdWUsIHByZXYpXG5cdHtcblx0XHRpZigvXlswLTldJC8udGVzdChrZXkpKVxuXHRcdHtcblx0XHRcdHRoaXMudHJpZ2dlcnNba2V5XSA9IHRydWU7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c3dpdGNoKGtleSlcblx0XHR7XG5cdFx0XHRjYXNlICdBcnJvd1JpZ2h0Jzpcblx0XHRcdFx0dGhpcy5heGlzWzBdID0gMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93RG93bic6XG5cdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0xlZnQnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAtMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93VXAnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAtMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0a2V5UmVsZWFzZShrZXksIHZhbHVlLCBwcmV2KVxuXHR7XG5cdFx0aWYoL15bMC05XSQvLnRlc3Qoa2V5KSlcblx0XHR7XG5cdFx0XHR0aGlzLnRyaWdnZXJzW2tleV0gPSBmYWxzZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzd2l0Y2goa2V5KVxuXHRcdHtcblx0XHRcdGNhc2UgJ0Fycm93UmlnaHQnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMF0gPiAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0xlZnQnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMF0gPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dEb3duJzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzFdID4gMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dVcCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1sxXSA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxufVxuIiwiY29uc3QgZmlyZVJlZ2lvbiA9IFsxLCAwLCAwXTtcbmNvbnN0IHdhdGVyUmVnaW9uID0gWzAsIDEsIDFdO1xuXG5leHBvcnQgY2xhc3MgRW50aXR5XG57XG5cdGNvbnN0cnVjdG9yKHtzcHJpdGUsIGNvbnRyb2xsZXIsIHgsIHl9KVxuXHR7XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdHRoaXMuc3RhdGUgPSAnc3RhbmRpbmcnO1xuXG5cdFx0dGhpcy5zcHJpdGUgPSBzcHJpdGU7XG5cdFx0dGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcblxuXHRcdHRoaXMueCA9IHg7XG5cdFx0dGhpcy55ID0geTtcblxuXHRcdHRoaXMuc3ByaXRlLnNwcml0ZUJvYXJkLnJlbmRlck1vZGUgPSAwO1xuXHR9XG5cblx0Y3JlYXRlKClcblx0e1xuXHR9XG5cblx0c2ltdWxhdGUoKVxuXHR7XG5cdFx0aWYoTWF0aC50cnVuYyhwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApICUgMTUgPT09IDApXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUucmVnaW9uID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZihNYXRoLnRydW5jKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkgJSAxNSA9PT0gNSlcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5yZWdpb24gPSB3YXRlclJlZ2lvbjtcblx0XHR9XG5cblx0XHRpZihNYXRoLnRydW5jKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkgJSAxNSA9PT0gMTApXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUucmVnaW9uID0gZmlyZVJlZ2lvbjtcblx0XHR9XG5cblx0XHRsZXQgc3BlZWQgPSA0O1xuXG5cdFx0bGV0IHhBeGlzID0gdGhpcy5jb250cm9sbGVyLmF4aXNbMF0gfHwgMDtcblx0XHRsZXQgeUF4aXMgPSB0aGlzLmNvbnRyb2xsZXIuYXhpc1sxXSB8fCAwO1xuXG5cdFx0Zm9yKGxldCB0IGluIHRoaXMuY29udHJvbGxlci50cmlnZ2Vycylcblx0XHR7XG5cdFx0XHRpZighdGhpcy5jb250cm9sbGVyLnRyaWdnZXJzW3RdKVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zcHJpdGUuc3ByaXRlQm9hcmQucmVuZGVyTW9kZSA9IHQ7XG5cblx0XHRcdGlmKHQgPT09ICc5Jylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbWFwcyA9IHRoaXMuc3ByaXRlLnNwcml0ZUJvYXJkLndvcmxkLmdldE1hcHNGb3JQb2ludChcblx0XHRcdFx0XHR0aGlzLnNwcml0ZS54LCB0aGlzLnNwcml0ZS55LFxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdGNvbnNvbGUubG9nKG1hcHMpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHhBeGlzID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoeEF4aXMsIC0xKSk7XG5cdFx0eUF4aXMgPSBNYXRoLm1pbigxLCBNYXRoLm1heCh5QXhpcywgLTEpKTtcblxuXHRcdHRoaXMuc3ByaXRlLnggKz0geEF4aXMgPiAwXG5cdFx0XHQ/IE1hdGguY2VpbChzcGVlZCAqIHhBeGlzKVxuXHRcdFx0OiBNYXRoLmZsb29yKHNwZWVkICogeEF4aXMpO1xuXG5cdFx0dGhpcy5zcHJpdGUueSArPSB5QXhpcyA+IDBcblx0XHRcdD8gTWF0aC5jZWlsKHNwZWVkICogeUF4aXMpXG5cdFx0XHQ6IE1hdGguZmxvb3Ioc3BlZWQgKiB5QXhpcyk7XG5cblx0XHRsZXQgaG9yaXpvbnRhbCA9IGZhbHNlO1xuXG5cdFx0aWYoTWF0aC5hYnMoeEF4aXMpID4gTWF0aC5hYnMoeUF4aXMpKVxuXHRcdHtcblx0XHRcdGhvcml6b250YWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmKGhvcml6b250YWwpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnd2VzdCc7XG5cblx0XHRcdGlmKHhBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnZWFzdCc7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc3RhdGUgPSAnd2Fsa2luZyc7XG5cblx0XHR9XG5cdFx0ZWxzZSBpZih5QXhpcylcblx0XHR7XG5cdFx0XHR0aGlzLmRpcmVjdGlvbiA9ICdub3J0aCc7XG5cblx0XHRcdGlmKHlBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXRlID0gJ3dhbGtpbmcnO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5zdGF0ZSA9ICdzdGFuZGluZyc7XG5cdFx0fVxuXG5cdFx0Ly8gaWYoIXhBeGlzICYmICF5QXhpcylcblx0XHQvLyB7XG5cdFx0Ly8gXHR0aGlzLmRpcmVjdGlvbiA9ICdzb3V0aCc7XG5cdFx0Ly8gfVxuXG5cdFx0bGV0IGZyYW1lcztcblxuXHRcdGlmKGZyYW1lcyA9IHRoaXMuc3ByaXRlW3RoaXMuc3RhdGVdW3RoaXMuZGlyZWN0aW9uXSlcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5zZXRGcmFtZXMoZnJhbWVzKTtcblx0XHR9XG5cdH1cblxuXHRkZXN0cm95KClcblx0e1xuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudW5pZm9ybSB2ZWM0IHVfY29sb3I7XFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKCkge1xcbiAgLy8gZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHZfdGV4Q29vcmQpO1xcbiAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgxLjAsIDEuMCwgMC4wLCAwLjI1KTtcXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKClcXG57XFxuICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247XFxuICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDtcXG4gIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTtcXG4gIHZfdGV4Q29vcmQgID0gYV90ZXhDb29yZDtcXG59XFxuXCIiLCJleHBvcnQgY2xhc3MgQ2FtZXJhXG57XG5cdHN0YXRpYyB4ID0gMDtcblx0c3RhdGljIHkgPSAwO1xuXHRzdGF0aWMgd2lkdGggID0gMDtcblx0c3RhdGljIGhlaWdodCA9IDA7XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi9TcHJpdGVTaGVldCc7XG5pbXBvcnQgeyBTcGxpdCB9IGZyb20gJy4uL21hdGgvU3BsaXQnO1xuXG5leHBvcnQgY2xhc3MgTWFwUmVuZGVyZXJcbntcblx0Y29uc3RydWN0b3Ioe3Nwcml0ZUJvYXJkLCBtYXB9KVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cblx0XHR0aGlzLmxvYWRlZCA9IGZhbHNlO1xuXG5cdFx0dGhpcy5tYXAgPSBtYXA7XG5cdFx0dGhpcy53aWR0aCAgPSAwO1xuXHRcdHRoaXMuaGVpZ2h0ID0gMDtcblxuXHRcdHRoaXMudGlsZVdpZHRoICA9IDA7XG5cdFx0dGhpcy50aWxlSGVpZ2h0ID0gMDtcblxuXHRcdHRoaXMueE9mZnNldCA9IDA7XG5cdFx0dGhpcy55T2Zmc2V0ID0gMDtcblxuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHR0aGlzLnRpbGVNYXBwaW5nID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNyZWF0ZVRleHR1cmUoMSwgMSk7XG5cdFx0dGhpcy50aWxlVGV4dHVyZSA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jcmVhdGVUZXh0dXJlKDEsIDEpO1xuXG5cdFx0Y29uc3QgciA9ICgpID0+IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGKTtcblx0XHRjb25zdCBwaXhlbCA9IG5ldyBVaW50OEFycmF5KFtyKCksIHIoKSwgcigpLCAweEZGXSk7XG5cblx0XHRtYXAucmVhZHkudGhlbigoKSA9PiB7XG5cdFx0XHR0aGlzLmxvYWRlZCA9IHRydWU7XG5cdFx0XHR0aGlzLnRpbGVXaWR0aCAgPSBtYXAudGlsZVdpZHRoO1xuXHRcdFx0dGhpcy50aWxlSGVpZ2h0ID0gbWFwLnRpbGVIZWlnaHQ7XG5cdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnRpbGVUZXh0dXJlKTtcblx0XHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIG1hcC50aWxlU2V0V2lkdGhcblx0XHRcdFx0LCBtYXAudGlsZVNldEhlaWdodFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0XHQsIG1hcC5waXhlbHNcblx0XHRcdCk7XG5cdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblxuXHRcdH0pO1xuXHR9XG5cblx0bmVnU2FmZU1vZChhLGIpXG5cdHtcblx0XHRpZihhID49IDApIHJldHVybiBhICUgYjtcblx0XHRyZXR1cm4gKGIgKyBhICUgYikgJSBiO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHRpZighdGhpcy5sb2FkZWQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRjb25zdCB4ID0gdGhpcy5zcHJpdGVCb2FyZC5mb2xsb3dpbmcuc3ByaXRlLng7XG5cdFx0Y29uc3QgeSA9IHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nLnNwcml0ZS55O1xuXG5cdFx0Y29uc3Qgem9vbSA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRjb25zdCBoYWxmVGlsZVdpZHRoICA9IHRoaXMudGlsZVdpZHRoICAqIDAuNTtcblx0XHRjb25zdCBoYWxmVGlsZUhlaWdodCA9IHRoaXMudGlsZUhlaWdodCAqIDAuNTtcblxuXHRcdGNvbnN0IHRpbGVzV2lkZSA9IE1hdGguZmxvb3IodGhpcy53aWR0aCAvIHRoaXMudGlsZVdpZHRoKTtcblx0XHRjb25zdCB0aWxlc0hpZ2ggPSBNYXRoLmZsb29yKHRoaXMuaGVpZ2h0IC8gdGhpcy50aWxlSGVpZ2h0KTtcblxuXHRcdGNvbnN0IHhPZmZzZXQgPSBNYXRoLmZsb29yKE1hdGguZmxvb3IoKDAuNSAqIHRoaXMud2lkdGgpICAvIDY0KSArIDApICogNjQ7XG5cdFx0Y29uc3QgeU9mZnNldCA9IE1hdGguZmxvb3IoTWF0aC5mbG9vcigoMC41ICogdGhpcy5oZWlnaHQpIC8gNjQpICsgMCkgKiA2NDtcblxuXHRcdGNvbnN0IHhUaWxlID0gKHgraGFsZlRpbGVXaWR0aCkvdGhpcy50aWxlV2lkdGhcblx0XHRcdCsgLXRoaXMubmVnU2FmZU1vZCggeCArIGhhbGZUaWxlV2lkdGgsIDY0ICkgLyB0aGlzLnRpbGVXaWR0aFxuXHRcdFx0KyAtdGhpcy5tYXAueFdvcmxkIC8gdGhpcy50aWxlV2lkdGhcblx0XHRcdCsgLXhPZmZzZXQgLyB0aGlzLnRpbGVXaWR0aDtcblxuXHRcdGNvbnN0IHlUaWxlID0gKHkraGFsZlRpbGVIZWlnaHQpL3RoaXMudGlsZUhlaWdodFxuXHRcdFx0KyAtdGhpcy5uZWdTYWZlTW9kKCB5ICsgaGFsZlRpbGVIZWlnaHQsIDY0ICkgLyB0aGlzLnRpbGVIZWlnaHRcblx0XHRcdCsgLXRoaXMubWFwLnlXb3JsZCAvIHRoaXMudGlsZUhlaWdodFxuXHRcdFx0KyAteU9mZnNldCAvIHRoaXMudGlsZUhlaWdodDtcblxuXHRcdGlmKHhUaWxlICsgdGlsZXNXaWRlIDwgMCB8fCB5VGlsZSArIHRpbGVzSGlnaCA8IDApXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHhQb3MgPSB6b29tICogKFxuXHRcdFx0KHRoaXMud2lkdGggKyB0aGlzLnhPZmZzZXQpICogMC41XG5cdFx0XHQrIC10aGlzLm5lZ1NhZmVNb2QoIHggKyBoYWxmVGlsZVdpZHRoLCA2NCApXG5cdFx0XHQrIC14T2Zmc2V0XG5cdFx0KTtcblxuXHRcdGNvbnN0IHlQb3MgPSB6b29tICogKFxuXHRcdFx0KHRoaXMuaGVpZ2h0ICsgdGhpcy55T2Zmc2V0KSAqIDAuNVxuXHRcdFx0KyAtdGhpcy5uZWdTYWZlTW9kKCB5ICsgaGFsZlRpbGVIZWlnaHQsIDY0IClcblx0XHRcdCsgLXlPZmZzZXRcblx0XHQpO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9zaXplJywgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfdGlsZVNpemUnLCB0aGlzLnRpbGVXaWR0aCwgdGhpcy50aWxlSGVpZ2h0KTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X21hcFRleHR1cmVTaXplJywgdGhpcy5tYXAudGlsZVNldFdpZHRoLCB0aGlzLm1hcC50aWxlU2V0SGVpZ2h0KTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X3JlbmRlclRpbGVzJywgMSk7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUyKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnRpbGVUZXh0dXJlKTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X3RpbGVzJywgMik7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUzKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnRpbGVNYXBwaW5nKTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X3RpbGVNYXBwaW5nJywgMyk7XG5cblx0XHRjb25zdCB0aWxlUGl4ZWxMYXllcnMgPSB0aGlzLm1hcC5nZXRTbGljZSh4VGlsZSwgeVRpbGUsIHRpbGVzV2lkZSwgdGlsZXNIaWdoLCBwZXJmb3JtYW5jZS5ub3coKS8xMDAwKTtcblxuXHRcdGZvcihjb25zdCB0aWxlUGl4ZWxzIG9mIHRpbGVQaXhlbExheWVycylcblx0XHR7XG5cdFx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCB0aWxlc1dpZGVcblx0XHRcdFx0LCB0aWxlc0hpZ2hcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdFx0LCB0aWxlUGl4ZWxzXG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLnNldFJlY3RhbmdsZShcblx0XHRcdFx0eFBvcyArIHRoaXMudGlsZVdpZHRoICogMC41ICogem9vbVxuXHRcdFx0XHQsIHlQb3MgKyB0aGlzLnRpbGVIZWlnaHQgKiB6b29tXG5cdFx0XHRcdCwgdGhpcy53aWR0aCAqIHpvb21cblx0XHRcdFx0LCB0aGlzLmhlaWdodCAqIHpvb21cblx0XHRcdCk7XG5cblx0XHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3QnVmZmVyKTtcblx0XHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblx0XHR9XG5cblx0XHQvLyBDbGVhbnVwLi4uXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtSSgndV9yZW5kZXJUaWxlcycsIDApO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTIpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMyk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG5cblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHR9XG5cblx0cmVzaXplKHgsIHkpXG5cdHtcblx0XHR0aGlzLndpZHRoID0gIHggKyAwO1xuXHRcdHRoaXMuaGVpZ2h0ID0geSArIDA7XG5cblx0XHR0aGlzLndpZHRoID0gIE1hdGguY2VpbCh4IC8gMTI4KSAqIDEyOCArIDEyODtcblx0XHR0aGlzLmhlaWdodCA9IE1hdGguY2VpbCh5IC8gMTI4KSAqIDEyOCArIDEyODtcblxuXHRcdHRoaXMueE9mZnNldCA9IHggLSB0aGlzLndpZHRoO1xuXHRcdHRoaXMueU9mZnNldCA9IHkgLSB0aGlzLmhlaWdodDtcblx0fVxuXG5cdHNpbXVsYXRlKClcblx0e31cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfdGV4Q29vcmQpO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdDAuMCwgMC4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQxLjAsIDEuMCxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cdFx0Y29uc3QgeDEgPSB4O1xuXHRcdGNvbnN0IHgyID0geCArIHdpZHRoO1xuXHRcdGNvbnN0IHkxID0geTtcblx0XHRjb25zdCB5MiA9IHkgKyBoZWlnaHQ7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfcG9zaXRpb24pO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgyLCB5Mixcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgyLCB5Mixcblx0XHRcdHgyLCB5MSxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4vQ2FtZXJhJztcblxuY2xhc3MgUGFyYWxsYXhMYXllclxue1xuXHR0ZXh0dXJlID0gbnVsbDtcblx0d2lkdGggPSAwO1xuXHRoZWlnaHQgPSAwO1xuXHRvZmZzZXQgPSAwO1xuXHRwYXJhbGxheCA9IDA7XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJhbGxheFxue1xuXHRjb25zdHJ1Y3Rvcih7c3ByaXRlQm9hcmQsIG1hcH0pXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0dGhpcy5tYXAgPSBtYXA7XG5cdFx0dGhpcy50ZXh0dXJlID0gbnVsbDtcblxuXHRcdHRoaXMuaGVpZ2h0ID0gMDtcblxuXHRcdHRoaXMuc2xpY2VzID0gW1xuXHRcdFx0J3BhcmFsbGF4L21vdW50YWlucy0wLnBuZydcblx0XHRcdCwgJ3BhcmFsbGF4L3NreS0wLXJlY29sb3IucG5nJ1xuXHRcdFx0LCAncGFyYWxsYXgvc2t5LTEtcmVjb2xvci5wbmcnXG5cdFx0XHQsICdwYXJhbGxheC9za3ktMWItcmVjb2xvci5wbmcnXG5cdFx0XHQsICdwYXJhbGxheC9za3ktMi1yZWNvbG9yLnBuZydcblx0XHRdO1xuXG5cdFx0dGhpcy5wYXJhbGxheExheWVycyA9IFtdO1xuXHRcdHRoaXMudGV4dHVyZXMgPSBbXTtcblxuXHRcdG1hcC5yZWFkeS50aGVuKCgpID0+IHRoaXMuYXNzZW1ibGUobWFwKSkudGhlbigoKSA9PiB7XG5cdFx0XHR0aGlzLmxvYWRlZCA9IHRydWU7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmxvYWRlZCA9IGZhbHNlO1xuXG5cdFx0dGhpcy54ID0gMDtcblx0XHR0aGlzLnkgPSAwO1xuXHR9XG5cblx0YXNzZW1ibGUoKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGNvbnN0IGxvYWRTbGljZXMgPSB0aGlzLm1hcC5pbWFnZUxheWVycy5tYXAoXG5cdFx0XHQobGF5ZXJEYXRhLCBpbmRleCkgPT4gdGhpcy5jb25zdHJ1Y3Rvci5sb2FkSW1hZ2UobGF5ZXJEYXRhLmltYWdlKS50aGVuKGltYWdlID0+IHtcblx0XHRcdFx0Y29uc3QgdGV4dHVyZSA9IHRoaXMudGV4dHVyZXNbaW5kZXhdID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXHRcdFx0XHRjb25zdCBsYXllciA9IHRoaXMucGFyYWxsYXhMYXllcnNbaW5kZXhdID0gbmV3IFBhcmFsbGF4TGF5ZXI7XG5cblx0XHRcdFx0Y29uc3QgbGF5ZXJCb3R0b20gPSBpbWFnZS5oZWlnaHQgKyBsYXllckRhdGEub2Zmc2V0eTtcblxuXHRcdFx0XHRpZih0aGlzLmhlaWdodCA8IGxheWVyQm90dG9tKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5oZWlnaHQgPSBsYXllckJvdHRvbTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGxheWVyLnRleHR1cmUgPSB0ZXh0dXJlO1xuXHRcdFx0XHRsYXllci53aWR0aCA9IGltYWdlLndpZHRoO1xuXHRcdFx0XHRsYXllci5oZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XG5cdFx0XHRcdGxheWVyLm9mZnNldCA9IGxheWVyRGF0YS5vZmZzZXR5ID8/IDA7XG5cdFx0XHRcdGxheWVyLnBhcmFsbGF4ID0gbGF5ZXJEYXRhLnBhcmFsbGF4eCA/PyAxO1xuXG5cdFx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG5cdFx0XHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0XHRcdCwgMFxuXHRcdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0XHRcdCwgaW1hZ2Vcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5SRVBFQVQpO1xuXHRcdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblxuXHRcdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRcdH1cblx0XHQpKTtcblxuXHRcdHJldHVybiBQcm9taXNlLmFsbChsb2FkU2xpY2VzKTtcblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0aWYoIXRoaXMubG9hZGVkKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXHRcdGNvbnN0IHpvb20gPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0dGhpcy54ID0gdGhpcy5zcHJpdGVCb2FyZC5mb2xsb3dpbmcuc3ByaXRlLnggKyAtdGhpcy5zcHJpdGVCb2FyZC53aWR0aCAvIHpvb20gKiAwLjU7XG5cdFx0dGhpcy55ID0gdGhpcy5zcHJpdGVCb2FyZC5mb2xsb3dpbmcuc3ByaXRlLnk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X3JlbmRlclBhcmFsbGF4JywgMSk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9zY3JvbGwnLCB0aGlzLngsIHRoaXMueSk7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKTtcblxuXHRcdGZvcihjb25zdCBsYXllciBvZiB0aGlzLnBhcmFsbGF4TGF5ZXJzKVxuXHRcdHtcblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIGxheWVyLnRleHR1cmUpO1xuXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3NpemUnLCBsYXllci53aWR0aCwgbGF5ZXIud2lkdGgpO1xuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9wYXJhbGxheCcsIGxheWVyLnBhcmFsbGF4LCAwKTtcblxuXHRcdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHRcdDBcblx0XHRcdFx0LCB0aGlzLnNwcml0ZUJvYXJkLmhlaWdodCArICgtdGhpcy5oZWlnaHQgKyBsYXllci5vZmZzZXQpICogem9vbVxuXHRcdFx0XHQsIGxheWVyLndpZHRoICogem9vbVxuXHRcdFx0XHQsIGxheWVyLmhlaWdodCAqIHpvb21cblx0XHRcdFx0LCBsYXllci53aWR0aFxuXHRcdFx0KTtcblxuXHRcdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmRyYXdCdWZmZXIpO1xuXHRcdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHRcdH1cblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfcmVuZGVyUGFyYWxsYXgnLCAwKTtcblxuXHRcdC8vIENsZWFudXAuLi5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHR9XG5cblx0c3RhdGljIGxvYWRJbWFnZShzcmMpXG5cdHtcblx0XHRpZighdGhpcy5pbWFnZVByb21pc2VzKVxuXHRcdHtcblx0XHRcdHRoaXMuaW1hZ2VQcm9taXNlcyA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmltYWdlUHJvbWlzZXNbc3JjXTtcblx0XHR9XG5cblx0XHR0aGlzLmltYWdlUHJvbWlzZXNbc3JjXSA9IG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCk9Pntcblx0XHRcdGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG5cdFx0XHRpbWFnZS5zcmMgICA9IHNyYztcblx0XHRcdGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoZXZlbnQpPT57XG5cdFx0XHRcdGFjY2VwdChpbWFnZSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLmltYWdlUHJvbWlzZXNbc3JjXTtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGNvbnN0IHJhdGlvID0gdGhpcy5zcHJpdGVCb2FyZC53aWR0aCAvIHdpZHRoO1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0uYnVmZmVycy5hX3RleENvb3JkKTtcblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHQwLjAsIDAuMCxcblx0XHRcdHJhdGlvLCAwLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0cmF0aW8sIDAuMCxcblx0XHRcdHJhdGlvLCAxLjAsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblxuXHRcdGNvbnN0IHgxID0geCAtIDA7XG5cdFx0Y29uc3QgeDIgPSB4ICsgdGhpcy5zcHJpdGVCb2FyZC53aWR0aDtcblx0XHRjb25zdCB5MSA9IHk7XG5cdFx0Y29uc3QgeTIgPSB5ICsgaGVpZ2h0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0uYnVmZmVycy5hX3Bvc2l0aW9uKTtcblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tIFwiY3VydmF0dXJlL2Jhc2UvQmluZGFibGVcIjtcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gXCIuL0NhbWVyYVwiO1xuaW1wb3J0IHsgU3BsaXQgfSBmcm9tIFwiLi4vbWF0aC9TcGxpdFwiO1xuXG5leHBvcnQgY2xhc3MgU3ByaXRlXG57XG5cdGNvbnN0cnVjdG9yKHtzcmMsIHNwcml0ZUJvYXJkLCBzcHJpdGVTaGVldCwgd2lkdGgsIGhlaWdodCwgeCwgeSwgen0pXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblxuXHRcdHRoaXMueCA9IHggfHwgMDtcblx0XHR0aGlzLnkgPSB5IHx8IDA7XG5cdFx0dGhpcy56ID0geiB8fCAwO1xuXG5cdFx0dGhpcy53aWR0aCAgPSAzMiB8fCB3aWR0aDtcblx0XHR0aGlzLmhlaWdodCA9IDMyIHx8IGhlaWdodDtcblx0XHR0aGlzLnNjYWxlICA9IDE7XG5cblx0XHR0aGlzLmZyYW1lcyA9IFtdO1xuXHRcdHRoaXMuZnJhbWVEZWxheSA9IDQ7XG5cdFx0dGhpcy5jdXJyZW50RGVsYXkgPSB0aGlzLmZyYW1lRGVsYXk7XG5cdFx0dGhpcy5jdXJyZW50RnJhbWUgPSAwO1xuXHRcdHRoaXMuY3VycmVudEZyYW1lcyA9ICcnO1xuXG5cdFx0dGhpcy5zcGVlZCAgICA9IDA7XG5cdFx0dGhpcy5tYXhTcGVlZCA9IDg7XG5cblx0XHR0aGlzLm1vdmluZyA9IGZhbHNlO1xuXG5cdFx0dGhpcy5SSUdIVFx0PSAwO1xuXHRcdHRoaXMuRE9XTlx0PSAxO1xuXHRcdHRoaXMuTEVGVFx0PSAyO1xuXHRcdHRoaXMuVVBcdFx0PSAzO1xuXG5cdFx0dGhpcy5FQVNUXHQ9IHRoaXMuUklHSFQ7XG5cdFx0dGhpcy5TT1VUSFx0PSB0aGlzLkRPV047XG5cdFx0dGhpcy5XRVNUXHQ9IHRoaXMuTEVGVDtcblx0XHR0aGlzLk5PUlRIXHQ9IHRoaXMuVVA7XG5cblx0XHR0aGlzLnJlZ2lvbiA9IFswLCAwLCAwLCAxXTtcblxuXHRcdHRoaXMuc3RhbmRpbmcgPSB7XG5cdFx0XHQnbm9ydGgnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfc3RhbmRpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnc291dGgnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfc3RhbmRpbmdfc291dGgucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnd2VzdCc6IFtcblx0XHRcdFx0J3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ2Vhc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRdXG5cdFx0fTtcblxuXHRcdHRoaXMud2Fsa2luZyA9IHtcblx0XHRcdCdub3J0aCc6IFtcblx0XHRcdFx0J3BsYXllcl93YWxraW5nX25vcnRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19ub3J0aDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19ub3J0aDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnc291dGgnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ19zb3V0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3NvdXRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3NvdXRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfc291dGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfc291dGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3NvdXRoLnBuZydcblxuXHRcdFx0XVxuXHRcdFx0LCAnd2VzdCc6IFtcblx0XHRcdFx0J3BsYXllcl93YWxraW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3dlc3QyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfd2VzdDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ2Vhc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19lYXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX2Vhc3QyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRdXG5cdFx0fTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQgPSBzcHJpdGVCb2FyZDtcblxuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHR0aGlzLnRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnRleHR1cmUpO1xuXG5cdFx0Y29uc3QgciA9ICgpID0+IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAyNTUpO1xuXHRcdGNvbnN0IHBpeGVsID0gbmV3IFVpbnQ4QXJyYXkoW3IoKSwgcigpLCByKCksIDI1NV0pO1xuXG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIDFcblx0XHRcdCwgMVxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBwaXhlbFxuXHRcdCk7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0ID0gc3ByaXRlU2hlZXQ7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oKHNoZWV0KT0+e1xuXHRcdFx0Y29uc3QgZnJhbWUgPSB0aGlzLnNwcml0ZVNoZWV0LmdldEZyYW1lKHNyYyk7XG5cblx0XHRcdGlmKGZyYW1lKVxuXHRcdFx0e1xuXHRcdFx0XHRTcHJpdGUubG9hZFRleHR1cmUodGhpcy5zcHJpdGVCb2FyZC5nbDJkLCBmcmFtZSkudGhlbihhcmdzID0+IHtcblx0XHRcdFx0XHR0aGlzLnRleHR1cmUgPSBhcmdzLnRleHR1cmU7XG5cdFx0XHRcdFx0dGhpcy53aWR0aCA9IGFyZ3MuaW1hZ2Uud2lkdGggKiB0aGlzLnNjYWxlO1xuXHRcdFx0XHRcdHRoaXMuaGVpZ2h0ID0gYXJncy5pbWFnZS5oZWlnaHQgKiB0aGlzLnNjYWxlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0dGhpcy5mcmFtZURlbGF5ID0gdGhpcy5tYXhTcGVlZCAtIE1hdGguYWJzKHRoaXMuc3BlZWQpO1xuXG5cdFx0aWYodGhpcy5mcmFtZURlbGF5ID4gdGhpcy5tYXhTcGVlZClcblx0XHR7XG5cdFx0XHR0aGlzLmZyYW1lRGVsYXkgPSB0aGlzLm1heFNwZWVkO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuY3VycmVudERlbGF5IDw9IDApXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXkgPSB0aGlzLmZyYW1lRGVsYXk7XG5cdFx0XHR0aGlzLmN1cnJlbnRGcmFtZSsrO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXktLTtcblx0XHR9XG5cblx0XHRpZih0aGlzLmN1cnJlbnRGcmFtZSA+PSB0aGlzLmZyYW1lcy5sZW5ndGgpXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RnJhbWUgPSB0aGlzLmN1cnJlbnRGcmFtZSAtIHRoaXMuZnJhbWVzLmxlbmd0aDtcblx0XHR9XG5cblx0XHRjb25zdCBmcmFtZSA9IHRoaXMuZnJhbWVzWyB0aGlzLmN1cnJlbnRGcmFtZSBdO1xuXG5cdFx0aWYoZnJhbWUpXG5cdFx0e1xuXHRcdFx0dGhpcy50ZXh0dXJlID0gZnJhbWUudGV4dHVyZTtcblx0XHRcdHRoaXMud2lkdGggID0gZnJhbWUud2lkdGggKiB0aGlzLnNjYWxlO1xuXHRcdFx0dGhpcy5oZWlnaHQgPSBmcmFtZS5oZWlnaHQgKiB0aGlzLnNjYWxlO1xuXHRcdH1cblxuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnRleHR1cmUpO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9yZWdpb24nLCAwLCAwLCAwLCAwKTtcblxuXHRcdGNvbnN0IHpvb20gPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHR0aGlzLnggKiB6b29tICsgLUNhbWVyYS54ICsgKHRoaXMuc3ByaXRlQm9hcmQud2lkdGggLyAyKVxuXHRcdFx0LCB0aGlzLnkgKiB6b29tICsgLUNhbWVyYS55ICsgKHRoaXMuc3ByaXRlQm9hcmQuaGVpZ2h0IC8gMikgKyAtdGhpcy5oZWlnaHQgKiB6b29tXG5cdFx0XHQsIHRoaXMud2lkdGggKiB6b29tXG5cdFx0XHQsIHRoaXMuaGVpZ2h0ICogem9vbVxuXHRcdCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd0J1ZmZlcik7XG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9yZWdpb24nLCAuLi5PYmplY3QuYXNzaWduKHRoaXMucmVnaW9uIHx8IFswLCAwLCAwXSwgezM6IDF9KSk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZWZmZWN0QnVmZmVyKTtcblx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3JlZ2lvbicsIDAsIDAsIDAsIDApO1xuXG5cdFx0Ly8gQ2xlYW51cC4uLlxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0c2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpXG5cdHtcblx0XHRsZXQgZnJhbWVzSWQgPSBmcmFtZVNlbGVjdG9yLmpvaW4oJyAnKTtcblxuXHRcdGlmKHRoaXMuY3VycmVudEZyYW1lcyA9PT0gZnJhbWVzSWQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMuY3VycmVudEZyYW1lcyA9IGZyYW1lc0lkO1xuXG5cdFx0Y29uc3QgbG9hZFRleHR1cmUgPSBmcmFtZSA9PiBTcHJpdGUubG9hZFRleHR1cmUodGhpcy5zcHJpdGVCb2FyZC5nbDJkLCBmcmFtZSk7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oc2hlZXQgPT4ge1xuXHRcdFx0Y29uc3QgZnJhbWVzID0gc2hlZXQuZ2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpLm1hcChcblx0XHRcdFx0ZnJhbWUgPT4gbG9hZFRleHR1cmUoZnJhbWUpLnRoZW4oYXJncyA9PiAoe1xuXHRcdFx0XHRcdHRleHR1cmU6ICBhcmdzLnRleHR1cmVcblx0XHRcdFx0XHQsIHdpZHRoOiAgYXJncy5pbWFnZS53aWR0aFxuXHRcdFx0XHRcdCwgaGVpZ2h0OiBhcmdzLmltYWdlLmhlaWdodFxuXHRcdFx0XHR9KSlcblx0XHRcdCk7XG5cblx0XHRcdFByb21pc2UuYWxsKGZyYW1lcykudGhlbihmcmFtZXMgPT4gdGhpcy5mcmFtZXMgPSBmcmFtZXMpO1xuXG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgbG9hZFRleHR1cmUoZ2wyZCwgaW1hZ2VTcmMpXG5cdHtcblx0XHRjb25zdCBnbCA9IGdsMmQuY29udGV4dDtcblxuXHRcdGlmKCF0aGlzLnByb21pc2VzKVxuXHRcdHtcblx0XHRcdHRoaXMucHJvbWlzZXMgPSB7fTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnByb21pc2VzW2ltYWdlU3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm9taXNlc1tpbWFnZVNyY107XG5cdFx0fVxuXG5cdFx0dGhpcy5wcm9taXNlc1tpbWFnZVNyY10gPSBTcHJpdGUubG9hZEltYWdlKGltYWdlU3JjKS50aGVuKChpbWFnZSk9Pntcblx0XHRcdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG5cdFx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0XHQsIGltYWdlXG5cdFx0XHQpO1xuXG5cdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblxuXHRcdFx0cmV0dXJuIHtpbWFnZSwgdGV4dHVyZX1cblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLnByb21pc2VzW2ltYWdlU3JjXTtcblx0fVxuXG5cdHN0YXRpYyBsb2FkSW1hZ2Uoc3JjKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCk9Pntcblx0XHRcdGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG5cdFx0XHRpbWFnZS5zcmMgICA9IHNyYztcblx0XHRcdGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoZXZlbnQpPT57XG5cdFx0XHRcdGFjY2VwdChpbWFnZSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0cmFuc2Zvcm0gPSBbXSlcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cdFx0Y29uc3Qgem9vbSA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfdGV4Q29vcmQpO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdDAuMCwgMC4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQxLjAsIDEuMCxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cblx0XHRjb25zdCB4MSA9IHg7XG5cdFx0Y29uc3QgeTEgPSB5ICsgMzIgKiB6b29tO1xuXHRcdGNvbnN0IHgyID0geCArIHdpZHRoO1xuXHRcdGNvbnN0IHkyID0geSArIGhlaWdodCArIDMyICogem9vbTtcblxuXHRcdGNvbnN0IHBvaW50cyA9IG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkxLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDIsIHkyLFxuXHRcdF0pO1xuXG5cdFx0Y29uc3QgeE9mZiA9IHggKyB3aWR0aCAgKiAwLjU7XG5cdFx0Y29uc3QgeU9mZiA9IHkgKyBoZWlnaHQgKiAwLjU7XG5cblx0XHRjb25zdCB0ID0gdGhpcy5tYXRyaXhUcmFuc2Zvcm0ocG9pbnRzLCB0aGlzLm1hdHJpeENvbXBvc2l0ZShcblx0XHRcdHRoaXMubWF0cml4VHJhbnNsYXRlKHhPZmYsIHlPZmYpXG5cdFx0XHQvLyAsIHRoaXMubWF0cml4U2NhbGUoTWF0aC5zaW4odGhldGEpLCBNYXRoLmNvcyh0aGV0YSkpXG5cdFx0XHQvLyAsIHRoaXMubWF0cml4Um90YXRlKHRoZXRhKVxuXHRcdFx0LCB0aGlzLm1hdHJpeFRyYW5zbGF0ZSgteE9mZiwgLXlPZmYpXG5cdFx0KSk7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfcG9zaXRpb24pO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCB0LCBnbC5TVEFUSUNfRFJBVyk7XG5cdH1cblxuXHRtYXRyaXhJZGVudGl0eSgpXG5cdHtcblx0XHRyZXR1cm4gW1xuXHRcdFx0WzEsIDAsIDBdLFxuXHRcdFx0WzAsIDEsIDBdLFxuXHRcdFx0WzAsIDAsIDFdLFxuXHRcdF07XG5cdH1cblxuXHRtYXRyaXhUcmFuc2xhdGUoZHgsIGR5KVxuXHR7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFsxLCAwLCBkeF0sXG5cdFx0XHRbMCwgMSwgZHldLFxuXHRcdFx0WzAsIDAsICAxXSxcblx0XHRdO1xuXHR9XG5cblx0bWF0cml4U2NhbGUoZHgsIGR5KVxuXHR7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFtkeCwgMCwgMF0sXG5cdFx0XHRbMCwgZHksIDBdLFxuXHRcdFx0WzAsIDAsICAxXSxcblx0XHRdO1xuXHR9XG5cblx0bWF0cml4Um90YXRlKHRoZXRhKVxuXHR7XG5cdFx0Y29uc3QgcyA9IE1hdGguc2luKHRoZXRhKTtcblx0XHRjb25zdCBjID0gTWF0aC5jb3ModGhldGEpO1xuXG5cdFx0cmV0dXJuIFtcblx0XHRcdFtjLCAtcywgMF0sXG5cdFx0XHRbcywgIGMsIDBdLFxuXHRcdFx0WzAsICAwLCAxXSxcblx0XHRdO1xuXHR9XG5cblx0bWF0cml4U2hlYXJYKHMpXG5cdHtcblx0XHRyZXR1cm4gW1xuXHRcdFx0WzEsIHMsIDBdLFxuXHRcdFx0WzAsIDEsIDBdLFxuXHRcdFx0WzAsIDAsIDFdLFxuXHRcdF07XG5cdH1cblxuXHRtYXRyaXhTaGVhclkocylcblx0e1xuXHRcdHJldHVybiBbXG5cdFx0XHRbMSwgMCwgMF0sXG5cdFx0XHRbcywgMSwgMF0sXG5cdFx0XHRbMCwgMCwgMV0sXG5cdFx0XTtcblx0fVxuXG5cdG1hdHJpeE11bHRpcGx5KG1hdEEsIG1hdEIpXG5cdHtcblx0XHRpZihtYXRBLmxlbmd0aCAhPT0gbWF0Qi5sZW5ndGgpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG1hdHJpY2VzJyk7XG5cdFx0fVxuXG5cdFx0aWYobWF0QVswXS5sZW5ndGggIT09IG1hdEIubGVuZ3RoKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW5jb21wYXRpYmxlIG1hdHJpY2VzJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgb3V0cHV0ID0gQXJyYXkobWF0QS5sZW5ndGgpLmZpbGwoKS5tYXAoKCkgPT4gQXJyYXkobWF0QlswXS5sZW5ndGgpLmZpbGwoMCkpO1xuXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IG1hdEEubGVuZ3RoOyBpKyspXG5cdFx0e1xuXHRcdFx0Zm9yKGxldCBqID0gMDsgaiA8IG1hdEJbMF0ubGVuZ3RoOyBqKyspXG5cdFx0XHR7XG5cdFx0XHRcdGZvcihsZXQgayA9IDA7IGsgPCBtYXRBWzBdLmxlbmd0aDsgaysrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0b3V0cHV0W2ldW2pdICs9IG1hdEFbaV1ba10gKiBtYXRCW2tdW2pdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdG1hdHJpeENvbXBvc2l0ZSguLi5tYXRzKVxuXHR7XG5cdFx0bGV0IG91dHB1dCA9IHRoaXMubWF0cml4SWRlbnRpdHkoKTtcblxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCBtYXRzLmxlbmd0aDsgaSsrKVxuXHRcdHtcblx0XHRcdG91dHB1dCA9IHRoaXMubWF0cml4TXVsdGlwbHkob3V0cHV0LCBtYXRzW2ldKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0bWF0cml4VHJhbnNmb3JtKHBvaW50cywgbWF0cml4KVxuXHR7XG5cdFx0Y29uc3Qgb3V0cHV0ID0gW107XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSArPSAyKVxuXHRcdHtcblx0XHRcdGNvbnN0IHBvaW50ID0gW3BvaW50c1tpXSwgcG9pbnRzW2kgKyAxXSwgMV07XG5cblx0XHRcdGZvcihjb25zdCByb3cgb2YgbWF0cml4KVxuXHRcdFx0e1xuXHRcdFx0XHRvdXRwdXQucHVzaChcblx0XHRcdFx0XHRwb2ludFswXSAqIHJvd1swXVxuXHRcdFx0XHRcdCsgcG9pbnRbMV0gKiByb3dbMV1cblx0XHRcdFx0XHQrIHBvaW50WzJdICogcm93WzJdXG5cdFx0XHRcdClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gbmV3IEZsb2F0MzJBcnJheShvdXRwdXQuZmlsdGVyKChfLCBrKSA9PiAoMSArIGspICUgMykpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBCYWcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CYWcnO1xuaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5cbmltcG9ydCB7IEdsMmQgfSBmcm9tICcuLi9nbDJkL0dsMmQnO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi9DYW1lcmEnO1xuaW1wb3J0IHsgU3ByaXRlIH0gZnJvbSAnLi9TcHJpdGUnO1xuaW1wb3J0IHsgU3ByaXRlU2hlZXQgfSBmcm9tICcuL1Nwcml0ZVNoZWV0JztcbmltcG9ydCB7IE1hcFJlbmRlcmVyIH0gZnJvbSAnLi9NYXBSZW5kZXJlcic7XG5pbXBvcnQgeyBQYXJhbGxheCB9IGZyb20gJy4vUGFyYWxsYXgnO1xuaW1wb3J0IHsgU3BsaXQgfSBmcm9tICcuLi9tYXRoL1NwbGl0JztcblxuZXhwb3J0IGNsYXNzIFNwcml0ZUJvYXJkXG57XG5cdGNvbnN0cnVjdG9yKHtlbGVtZW50LCB3b3JsZCwgbWFwfSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXG5cdFx0Y29uc29sZS5sb2coU3BsaXQuaW50VG9CeXRlcygweEZGXzAwKSk7XG5cblx0XHR0aGlzLm1hcCA9IG1hcDtcblx0XHR0aGlzLm1hcHMgPSBbXTtcblx0XHR0aGlzLm1hcFJlbmRlcmVycyA9IFtdO1xuXHRcdHRoaXMud29ybGQgPSB3b3JsZDtcblx0XHR0aGlzLnNwcml0ZXMgPSBuZXcgQmFnO1xuXG5cdFx0dGhpcy5tb3VzZSA9IHtcblx0XHRcdHg6IG51bGxcblx0XHRcdCwgeTogbnVsbFxuXHRcdFx0LCBjbGlja1g6IG51bGxcblx0XHRcdCwgY2xpY2tZOiBudWxsXG5cdFx0fTtcblxuXHRcdHRoaXMud2lkdGggPSBlbGVtZW50LndpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gZWxlbWVudC5oZWlnaHQ7XG5cblx0XHRDYW1lcmEud2lkdGggID0gZWxlbWVudC53aWR0aDtcblx0XHRDYW1lcmEuaGVpZ2h0ID0gZWxlbWVudC5oZWlnaHQ7XG5cblx0XHR0aGlzLmdsMmQgPSBuZXcgR2wyZChlbGVtZW50KTtcblxuXHRcdHRoaXMuZ2wyZC5lbmFibGVCbGVuZGluZygpO1xuXG5cdFx0Y29uc3QgYXR0cmlidXRlcyA9IFsnYV9wb3NpdGlvbicsICdhX3RleENvb3JkJ107XG5cdFx0Y29uc3QgdW5pZm9ybXMgPSBbXG5cdFx0XHQndV9pbWFnZSdcblx0XHRcdCwgJ3VfZWZmZWN0J1xuXHRcdFx0LCAndV90aWxlcydcblx0XHRcdCwgJ3VfdGlsZU1hcHBpbmcnXG5cblx0XHRcdCwgJ3Vfc2l6ZSdcblx0XHRcdCwgJ3Vfc2NhbGUnXG5cdFx0XHQsICd1X3Njcm9sbCdcblx0XHRcdCwgJ3Vfc3RyZXRjaCdcblx0XHRcdCwgJ3VfdGlsZVNpemUnXG5cdFx0XHQsICd1X3Jlc29sdXRpb24nXG5cdFx0XHQsICd1X21hcFRleHR1cmVTaXplJ1xuXG5cdFx0XHQsICd1X3JlZ2lvbidcblx0XHRcdCwgJ3VfcGFyYWxsYXgnXG5cdFx0XHQsICd1X3RpbWUnXG5cblx0XHRcdCwgJ3VfcmVuZGVyVGlsZXMnXG5cdFx0XHQsICd1X3JlbmRlclBhcmFsbGF4J1xuXHRcdFx0LCAndV9yZW5kZXJNb2RlJ1xuXHRcdF07XG5cblx0XHR0aGlzLnJlbmRlck1vZGUgPSAwO1xuXG5cdFx0dGhpcy5kcmF3UHJvZ3JhbSA9IHRoaXMuZ2wyZC5jcmVhdGVQcm9ncmFtKHtcblx0XHRcdHZlcnRleFNoYWRlcjogdGhpcy5nbDJkLmNyZWF0ZVNoYWRlcignc3ByaXRlL3RleHR1cmUudmVydCcpXG5cdFx0XHQsIGZyYWdtZW50U2hhZGVyOiB0aGlzLmdsMmQuY3JlYXRlU2hhZGVyKCdzcHJpdGUvdGV4dHVyZS5mcmFnJylcblx0XHRcdCwgYXR0cmlidXRlc1xuXHRcdFx0LCB1bmlmb3Jtc1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51c2UoKTtcblxuXHRcdHRoaXMuY29sb3JMb2NhdGlvbiAgID0gdGhpcy5kcmF3UHJvZ3JhbS51bmlmb3Jtcy51X2NvbG9yO1xuXHRcdHRoaXMudGlsZVBvc0xvY2F0aW9uID0gdGhpcy5kcmF3UHJvZ3JhbS51bmlmb3Jtcy51X3RpbGVObztcblx0XHR0aGlzLnJlZ2lvbkxvY2F0aW9uICA9IHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybXMudV9yZWdpb247XG5cblx0XHR0aGlzLmRyYXdMYXllciA9IHRoaXMuZ2wyZC5jcmVhdGVUZXh0dXJlKDEwMDAsIDEwMDApO1xuXHRcdHRoaXMuZWZmZWN0TGF5ZXIgPSB0aGlzLmdsMmQuY3JlYXRlVGV4dHVyZSgxMDAwLCAxMDAwKTtcblxuXHRcdHRoaXMuZHJhd0J1ZmZlciA9IHRoaXMuZ2wyZC5jcmVhdGVGcmFtZWJ1ZmZlcih0aGlzLmRyYXdMYXllcik7XG5cdFx0dGhpcy5lZmZlY3RCdWZmZXIgPSB0aGlzLmdsMmQuY3JlYXRlRnJhbWVidWZmZXIodGhpcy5lZmZlY3RMYXllcik7XG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxuXHRcdFx0J21vdXNlbW92ZScsIChldmVudCk9Pntcblx0XHRcdFx0dGhpcy5tb3VzZS54ID0gZXZlbnQuY2xpZW50WDtcblx0XHRcdFx0dGhpcy5tb3VzZS55ID0gZXZlbnQuY2xpZW50WTtcblx0XHRcdH1cblx0XHQpO1xuXG5cdFx0d29ybGQucmVhZHkudGhlbihtYXBzID0+IHtcblx0XHRcdHRoaXMubWFwUmVuZGVyZXJzID0gbWFwcy5tYXAobSA9PiB7XG5cdFx0XHRcdGNvbnN0IG1yID0gbmV3IE1hcFJlbmRlcmVyKHtzcHJpdGVCb2FyZDogdGhpcywgbWFwOiBtfSk7XG5cdFx0XHRcdG1yLnJlc2l6ZShDYW1lcmEud2lkdGgsIENhbWVyYS5oZWlnaHQpO1xuXHRcdFx0XHRyZXR1cm4gbXI7XG5cdFx0XHR9KVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5wYXJhbGxheCA9IG5ldyBQYXJhbGxheCh7c3ByaXRlQm9hcmQ6IHRoaXMsIG1hcH0pO1xuXG5cdFx0Y29uc3QgdyA9IDEyODA7XG5cdFx0Y29uc3Qgc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cblx0XHRmb3IoY29uc3QgaSBpbiBBcnJheSgyKS5maWxsKCkpXG5cdFx0e1xuXHRcdFx0Y29uc3QgYmFycmVsID0gbmV3IFNwcml0ZSh7XG5cdFx0XHRcdHNyYzogJ2JhcnJlbC5wbmcnLFxuXHRcdFx0XHRzcHJpdGVCb2FyZDogdGhpcyxcblx0XHRcdFx0c3ByaXRlU2hlZXRcblx0XHRcdH0pO1xuXHRcdFx0YmFycmVsLnggPSAzMiArIChpICogNjQpICUgdyAtIDE2O1xuXHRcdFx0YmFycmVsLnkgPSBNYXRoLnRydW5jKChpICogMzIpIC8gdykgKiAzMiArIDMyO1xuXHRcdFx0dGhpcy5zcHJpdGVzLmFkZChiYXJyZWwpO1xuXHRcdH1cblxuXHRcdHRoaXMuZm9sbG93aW5nID0gbnVsbDtcblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0aWYodGhpcy5mb2xsb3dpbmcpXG5cdFx0e1xuXHRcdFx0Q2FtZXJhLnggPSAoMTYgKyB0aGlzLmZvbGxvd2luZy5zcHJpdGUueCkgKiB0aGlzLmdsMmQuem9vbUxldmVsIHx8IDA7XG5cdFx0XHRDYW1lcmEueSA9ICgxNiArIHRoaXMuZm9sbG93aW5nLnNwcml0ZS55KSAqIHRoaXMuZ2wyZC56b29tTGV2ZWwgfHwgMDtcblx0XHR9XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9zaXplJywgQ2FtZXJhLndpZHRoLCBDYW1lcmEuaGVpZ2h0KTtcblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3Jlc29sdXRpb24nLCBnbC5jYW52YXMud2lkdGgsIGdsLmNhbnZhcy5oZWlnaHQpO1xuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfcmVuZGVyTW9kZScsIHRoaXMucmVuZGVyTW9kZSk7XG5cblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3RpbWUnLCBwZXJmb3JtYW5jZS5ub3coKSk7XG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9yZWdpb24nLCAwLCAwLCAwLCAwKTtcblxuXHRcdGdsLnZpZXdwb3J0KDAsIDAsIGdsLmNhbnZhcy53aWR0aCwgZ2wuY2FudmFzLmhlaWdodCk7XG5cdFx0Z2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5lZmZlY3RCdWZmZXIpO1xuXHRcdGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmRyYXdCdWZmZXIpO1xuXHRcdGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMCk7XG5cdFx0Z2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXG5cdFx0aWYodGhpcy5tYXAuYmFja2dyb3VuZENvbG9yKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNvbG9yID0gdGhpcy5tYXAuYmFja2dyb3VuZENvbG9yLnN1YnN0cigxKTtcblxuXHRcdFx0Y29uc3QgciA9IHBhcnNlSW50KGNvbG9yLnN1YnN0cigtNiwgMiksIDE2KSAvIDI1NTtcblx0XHRcdGNvbnN0IGIgPSBwYXJzZUludChjb2xvci5zdWJzdHIoLTQsIDIpLCAxNikgLyAyNTU7XG5cdFx0XHRjb25zdCBnID0gcGFyc2VJbnQoY29sb3Iuc3Vic3RyKC0yLCAyKSwgMTYpIC8gMjU1O1xuXHRcdFx0Y29uc3QgYSA9IGNvbG9yLmxlbmd0aCA9PT0gOCA/IHBhcnNlSW50KGNvbG9yLnN1YnN0cigtOCwgMiksIDE2KSAvIDI1NSA6IDE7XG5cblx0XHRcdGdsLmNsZWFyQ29sb3IociwgZywgYiwgYSk7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRnbC5jbGVhckNvbG9yKDAsIDAsIDAsIDEpO1xuXHRcdH1cblxuXHRcdGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuXG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZSgnZHJhdy1wYXJhbGxheCcpO1xuXHRcdHRoaXMucGFyYWxsYXggJiYgdGhpcy5wYXJhbGxheC5kcmF3KCk7XG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZUVuZCgnZHJhdy1wYXJhbGxheCcpO1xuXG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9zaXplJywgQ2FtZXJhLndpZHRoLCBDYW1lcmEuaGVpZ2h0KTtcblxuXG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZSgnZHJhdy10aWxlcycpO1xuXHRcdHRoaXMubWFwUmVuZGVyZXJzLmZvckVhY2gobXIgPT4gbXIuZHJhdygpKTtcblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgJiYgY29uc29sZS50aW1lRW5kKCdkcmF3LXRpbGVzJyk7XG5cblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgJiYgY29uc29sZS50aW1lKCdkcmF3LXNwcml0ZXMnKTtcblx0XHRsZXQgc3ByaXRlcyA9IHRoaXMuc3ByaXRlcy5pdGVtcygpO1xuXHRcdC8vIHNwcml0ZXMuZm9yRWFjaChzID0+IHMueiA9IHMueSk7XG5cdFx0c3ByaXRlcy5zb3J0KChhLGIpID0+IHtcblx0XHRcdGlmKGEueSA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGIueSA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGEueSAtIGIueTtcblx0XHR9KTtcblx0XHRzcHJpdGVzLmZvckVhY2gocyA9PiBzLmRyYXcoKSk7XG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZUVuZCgnZHJhdy1zcHJpdGVzJyk7XG5cblx0XHRpZih3aW5kb3cuc21Qcm9maWxpbmcpXG5cdFx0e1xuXHRcdFx0d2luZG93LnNtUHJvZmlsaW5nID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gU2V0IHRoZSByZWN0YW5nbGUgZm9yIGJvdGggbGF5ZXJzXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHQwXG5cdFx0XHQsIHRoaXMuZ2wyZC5lbGVtZW50LmhlaWdodFxuXHRcdFx0LCB0aGlzLmdsMmQuZWxlbWVudC53aWR0aFxuXHRcdFx0LCAtdGhpcy5nbDJkLmVsZW1lbnQuaGVpZ2h0XG5cdFx0KTtcblxuXHRcdC8vIFN3aXRjaCB0byB0aGUgbWFpbiBmcmFtZWJ1ZmZlclxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cblx0XHQvLyBQdXQgdGhlIGRyYXdMYXllciBpbiB0ZXgwXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5kcmF3TGF5ZXIpO1xuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfaW1hZ2UnLCAwKTtcblxuXHRcdC8vIFB1dCB0aGUgZWZmZWN0TGF5ZXIgaW4gdGV4MVxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTEpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuZWZmZWN0TGF5ZXIpO1xuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfZWZmZWN0JywgMSk7XG5cblx0XHQvLyBEcmF3XG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXG5cdFx0Ly8gQ2xlYW51cC4uLlxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTEpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTQpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHR9XG5cblx0cmVzaXplKHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0d2lkdGggID0gd2lkdGggIHx8IHRoaXMuZ2wyZC5lbGVtZW50LndpZHRoO1xuXHRcdGhlaWdodCA9IGhlaWdodCB8fCB0aGlzLmdsMmQuZWxlbWVudC5oZWlnaHQ7XG5cblx0XHR0aGlzLndpZHRoID0gd2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG5cblx0XHRDYW1lcmEueCAqPSB0aGlzLmdsMmQuem9vbUxldmVsO1xuXHRcdENhbWVyYS55ICo9IHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRDYW1lcmEud2lkdGggID0gd2lkdGggIC8gdGhpcy5nbDJkLnpvb21MZXZlbDtcblx0XHRDYW1lcmEuaGVpZ2h0ID0gaGVpZ2h0IC8gdGhpcy5nbDJkLnpvb21MZXZlbDtcblxuXHRcdHRoaXMubWFwUmVuZGVyZXJzLmZvckVhY2gobXIgPT4gbXIucmVzaXplKENhbWVyYS53aWR0aCwgQ2FtZXJhLmhlaWdodCkpXG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLmRyYXdMYXllcik7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbnVsbFxuXHRcdCk7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLmVmZmVjdExheWVyKTtcblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgdGhpcy53aWR0aFxuXHRcdFx0LCB0aGlzLmhlaWdodFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBudWxsXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHR9XG5cblx0c2V0UmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuZHJhd1Byb2dyYW0uYnVmZmVycy5hX3Bvc2l0aW9uKTtcblxuXHRcdGNvbnN0IHgxID0geDtcblx0XHRjb25zdCB4MiA9IHggKyB3aWR0aDtcblx0XHRjb25zdCB5MSA9IHk7XG5cdFx0Y29uc3QgeTIgPSB5ICsgaGVpZ2h0O1xuXG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkxLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDIsIHkyLFxuXHRcdF0pLCBnbC5TVFJFQU1fRFJBVyk7XG5cdH1cblxuXHQvLyB1bnNlbGVjdCgpXG5cdC8vIHtcblx0Ly8gXHRpZih0aGlzLnNlbGVjdGVkLmxvY2FsWCA9PT0gbnVsbClcblx0Ly8gXHR7XG5cdC8vIFx0XHRyZXR1cm4gZmFsc2U7XG5cdC8vIFx0fVxuXG5cdC8vIFx0dGhpcy5zZWxlY3RlZC5sb2NhbFggID0gbnVsbDtcblx0Ly8gXHR0aGlzLnNlbGVjdGVkLmxvY2FsWSAgPSBudWxsO1xuXHQvLyBcdHRoaXMuc2VsZWN0ZWQuZ2xvYmFsWCA9IG51bGw7XG5cdC8vIFx0dGhpcy5zZWxlY3RlZC5nbG9iYWxZID0gbnVsbDtcblxuXHQvLyBcdHJldHVybiB0cnVlO1xuXHQvLyB9XG59XG4iLCJleHBvcnQgY2xhc3MgU3ByaXRlU2hlZXRcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0dGhpcy5pbWFnZVVybCA9ICcvc3ByaXRlc2hlZXQucG5nJztcblx0XHR0aGlzLmJveGVzVXJsID0gJy9zcHJpdGVzaGVldC5qc29uJztcblx0XHR0aGlzLnZlcnRpY2VzID0ge307XG5cdFx0dGhpcy5mcmFtZXMgICA9IHt9O1xuXHRcdHRoaXMud2lkdGggICAgPSAwO1xuXHRcdHRoaXMuaGVpZ2h0ICAgPSAwO1xuXG5cdFx0bGV0IHNoZWV0TG9hZGVyID0gZmV0Y2godGhpcy5ib3hlc1VybClcblx0XHQudGhlbigocmVzcG9uc2UpPT5yZXNwb25zZS5qc29uKCkpXG5cdFx0LnRoZW4oKGJveGVzKSA9PiB0aGlzLmJveGVzID0gYm94ZXMpO1xuXG5cdFx0bGV0IGltYWdlTG9hZGVyID0gbmV3IFByb21pc2UoKGFjY2VwdCk9Pntcblx0XHRcdHRoaXMuaW1hZ2UgICAgICAgID0gbmV3IEltYWdlKCk7XG5cdFx0XHR0aGlzLmltYWdlLnNyYyAgICA9IHRoaXMuaW1hZ2VVcmw7XG5cdFx0XHR0aGlzLmltYWdlLm9ubG9hZCA9ICgpPT57XG5cdFx0XHRcdGFjY2VwdCgpO1xuXHRcdFx0fTtcblx0XHR9KTtcblxuXHRcdHRoaXMucmVhZHkgPSBQcm9taXNlLmFsbChbc2hlZXRMb2FkZXIsIGltYWdlTG9hZGVyXSlcblx0XHQudGhlbigoKSA9PiB0aGlzLnByb2Nlc3NJbWFnZSgpKVxuXHRcdC50aGVuKCgpID0+IHRoaXMpO1xuXHR9XG5cblx0cHJvY2Vzc0ltYWdlKClcblx0e1xuXHRcdGlmKCF0aGlzLmJveGVzIHx8ICF0aGlzLmJveGVzLmZyYW1lcylcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgY2FudmFzICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdFx0Y2FudmFzLndpZHRoICA9IHRoaXMuaW1hZ2Uud2lkdGg7XG5cdFx0Y2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2UuaGVpZ2h0O1xuXG5cdFx0Y29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIiwge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pO1xuXG5cdFx0Y29udGV4dC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgMCwgMCk7XG5cblx0XHRjb25zdCBmcmFtZVByb21pc2VzID0gW107XG5cblx0XHRmb3IobGV0IGkgaW4gdGhpcy5ib3hlcy5mcmFtZXMpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3ViQ2FudmFzICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdFx0XHRzdWJDYW52YXMud2lkdGggID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUudztcblx0XHRcdHN1YkNhbnZhcy5oZWlnaHQgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oO1xuXG5cdFx0XHRjb25zdCBzdWJDb250ZXh0ID0gc3ViQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblxuXHRcdFx0aWYodGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUpXG5cdFx0XHR7XG5cdFx0XHRcdHN1YkNvbnRleHQucHV0SW1hZ2VEYXRhKGNvbnRleHQuZ2V0SW1hZ2VEYXRhKFxuXHRcdFx0XHRcdHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnhcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnlcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLndcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmhcblx0XHRcdFx0KSwgMCwgMCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMuYm94ZXMuZnJhbWVzW2ldLnRleHQpXG5cdFx0XHR7XG5cdFx0XHRcdHN1YkNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uY29sb3IgfHwgJ3doaXRlJztcblxuXHRcdFx0XHRzdWJDb250ZXh0LmZvbnQgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mb250XG5cdFx0XHRcdFx0fHwgYCR7dGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaH1weCBzYW5zLXNlcmlmYDtcblx0XHRcdFx0c3ViQ29udGV4dC50ZXh0QWxpZ24gPSAnY2VudGVyJztcblxuXHRcdFx0XHRzdWJDb250ZXh0LmZpbGxUZXh0KFxuXHRcdFx0XHRcdHRoaXMuYm94ZXMuZnJhbWVzW2ldLnRleHRcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLncgLyAyXG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oXG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53XG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0c3ViQ29udGV4dC50ZXh0QWxpZ24gPSBudWxsO1xuXHRcdFx0XHRzdWJDb250ZXh0LmZvbnQgICAgICA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGZyYW1lUHJvbWlzZXMucHVzaChuZXcgUHJvbWlzZSgoYWNjZXB0KT0+e1xuXHRcdFx0XHRzdWJDYW52YXMudG9CbG9iKChibG9iKT0+e1xuXHRcdFx0XHRcdHRoaXMuZnJhbWVzW3RoaXMuYm94ZXMuZnJhbWVzW2ldLmZpbGVuYW1lXSA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cblx0XHRcdFx0XHRhY2NlcHQodGhpcy5mcmFtZXNbdGhpcy5ib3hlcy5mcmFtZXNbaV0uZmlsZW5hbWVdKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KSk7XG5cblxuXHRcdFx0Ly8gbGV0IHUxID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueCAvIHRoaXMuaW1hZ2Uud2lkdGg7XG5cdFx0XHQvLyBsZXQgdjEgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS55IC8gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHRcdC8vIGxldCB1MiA9ICh0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS54ICsgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUudylcblx0XHRcdC8vIFx0LyB0aGlzLmltYWdlLndpZHRoO1xuXG5cdFx0XHQvLyBsZXQgdjIgPSAodGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueSArIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmgpXG5cdFx0XHQvLyBcdC8gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHRcdC8vIHRoaXMudmVydGljZXNbdGhpcy5ib3hlcy5mcmFtZXNbaV0uZmlsZW5hbWVdID0ge1xuXHRcdFx0Ly8gXHR1MSx2MSx1Mix2MlxuXHRcdFx0Ly8gfTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwoZnJhbWVQcm9taXNlcyk7XG5cdH1cblxuXHRnZXRWZXJ0aWNlcyhmaWxlbmFtZSlcblx0e1xuXHRcdHJldHVybiB0aGlzLnZlcnRpY2VzW2ZpbGVuYW1lXTtcblx0fVxuXG5cdGdldEZyYW1lKGZpbGVuYW1lKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW2ZpbGVuYW1lXTtcblx0fVxuXG5cdGdldEZyYW1lcyhmcmFtZVNlbGVjdG9yKVxuXHR7XG5cdFx0aWYoQXJyYXkuaXNBcnJheShmcmFtZVNlbGVjdG9yKSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gZnJhbWVTZWxlY3Rvci5tYXAoKG5hbWUpPT50aGlzLmdldEZyYW1lKG5hbWUpKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5nZXRGcmFtZXNCeVByZWZpeChmcmFtZVNlbGVjdG9yKTtcblx0fVxuXG5cdGdldEZyYW1lc0J5UHJlZml4KHByZWZpeClcblx0e1xuXHRcdGxldCBmcmFtZXMgPSBbXTtcblxuXHRcdGZvcihsZXQgaSBpbiB0aGlzLmZyYW1lcylcblx0XHR7XG5cdFx0XHRpZihpLnN1YnN0cmluZygwLCBwcmVmaXgubGVuZ3RoKSAhPT0gcHJlZml4KVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0ZnJhbWVzLnB1c2godGhpcy5mcmFtZXNbaV0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBmcmFtZXM7XG5cdH1cblxuXHRzdGF0aWMgbG9hZFRleHR1cmUoZ2wyZCwgaW1hZ2VTcmMpXG5cdHtcblx0XHRjb25zdCBnbCA9IGdsMmQuY29udGV4dDtcblxuXHRcdGlmKCF0aGlzLnRleHR1cmVQcm9taXNlcylcblx0XHR7XG5cdFx0XHR0aGlzLnRleHR1cmVQcm9taXNlcyA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMudGV4dHVyZVByb21pc2VzW2ltYWdlU3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy50ZXh0dXJlUHJvbWlzZXNbaW1hZ2VTcmNdO1xuXHRcdH1cblxuXHRcdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRyZXR1cm4gdGhpcy50ZXh0dXJlUHJvbWlzZXNbaW1hZ2VTcmNdID0gdGhpcy5sb2FkSW1hZ2UoaW1hZ2VTcmMpLnRoZW4oaW1hZ2UgPT4ge1xuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cblx0XHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHRcdCwgaW1hZ2Vcblx0XHRcdCk7XG5cblx0XHRcdC8qL1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdC8qL1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuUkVQRUFUKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLlJFUEVBVCk7XG5cdFx0XHQvLyovXG5cblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcblxuXHRcdFx0cmV0dXJuIHtpbWFnZSwgdGV4dHVyZX1cblx0XHR9KTtcblx0fVxuXG5cdHN0YXRpYyBsb2FkSW1hZ2Uoc3JjKVxuXHR7XG5cdFx0aWYoIXRoaXMuaW1hZ2VQcm9taXNlcylcblx0XHR7XG5cdFx0XHR0aGlzLmltYWdlUHJvbWlzZXMgPSB7fTtcblx0XHR9XG5cblx0XHRpZih0aGlzLmltYWdlUHJvbWlzZXNbc3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbWFnZVByb21pc2VzW3NyY107XG5cdFx0fVxuXG5cdFx0dGhpcy5pbWFnZVByb21pc2VzW3NyY10gPSBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpPT57XG5cdFx0XHRjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0aW1hZ2Uuc3JjICAgPSBzcmM7XG5cdFx0XHRpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKGV2ZW50KT0+e1xuXHRcdFx0XHRhY2NlcHQoaW1hZ2UpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcy5pbWFnZVByb21pc2VzW3NyY107XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBUZXh0dXJlQmFua1xue1xuXHRcbn0iLCJleHBvcnQgY2xhc3MgVGlsZXNldFxue1xuXHRjb25zdHJ1Y3Rvcih7XG5cdFx0c291cmNlLCBmaXJzdGdpZCwgY29sdW1ucywgaW1hZ2UsIGltYWdlaGVpZ2h0LCBpbWFnZXdpZHRoLCBtYXJnaW5cblx0XHQsIG5hbWUsIHNwYWNpbmcsIHRpbGVjb3VudCwgdGlsZWhlaWdodCwgdGlsZXdpZHRoLCB0aWxlc1xuXHR9KXtcblx0XHR0aGlzLmZpcnN0R2lkID0gZmlyc3RnaWQ7XG5cblx0XHR0aGlzLnJlYWR5ID0gdGhpcy5nZXRSZWFkeSh7XG5cdFx0XHRzb3VyY2UsIGNvbHVtbnMsIGltYWdlLCBpbWFnZWhlaWdodCwgaW1hZ2V3aWR0aCwgbWFyZ2luXG5cdFx0XHQsIG5hbWUsIHNwYWNpbmcsIHRpbGVjb3VudCwgdGlsZWhlaWdodCwgdGlsZXdpZHRoLCB0aWxlc1xuXHRcdH0pO1xuXHR9XG5cblx0YXN5bmMgZ2V0UmVhZHkoe1xuXHRcdHNvdXJjZSwgY29sdW1ucywgaW1hZ2UsIGltYWdlaGVpZ2h0LCBpbWFnZXdpZHRoLCBtYXJnaW4sIG5hbWVcblx0XHQsIHNwYWNpbmcsIHRpbGVjb3VudCwgdGlsZWhlaWdodCwgdGlsZXdpZHRoLCB0aWxlc1xuXHR9KXtcblx0XHRpZihzb3VyY2UpXG5cdFx0e1xuXHRcdFx0KHtjb2x1bW5zLCBpbWFnZSwgaW1hZ2VoZWlnaHQsIGltYWdld2lkdGgsIG1hcmdpbiwgbmFtZSxcblx0XHRcdFx0c3BhY2luZywgdGlsZWNvdW50LCB0aWxlaGVpZ2h0LCB0aWxld2lkdGgsIHRpbGVzXG5cdFx0XHR9ID0gYXdhaXQgKGF3YWl0IGZldGNoKHNvdXJjZSkpLmpzb24oKSk7XG5cblx0XHRcdGZvcihjb25zdCB0aWxlIG9mIHRpbGVzKVxuXHRcdFx0e1xuXHRcdFx0XHR0aWxlLmlkICs9IHRoaXMuZmlyc3RHaWQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5pbWFnZSA9IG5ldyBJbWFnZTtcblx0XHR0aGlzLmltYWdlLnNyYyA9IGltYWdlO1xuXG5cdFx0dGhpcy5jb2x1bW5zID0gY29sdW1ucztcblx0XHR0aGlzLmltYWdlV2lkdGggPSBpbWFnZXdpZHRoO1xuXHRcdHRoaXMuaW1hZ2VIZWlnaHQgPSBpbWFnZWhlaWdodDtcblx0XHR0aGlzLm1hcmdpbiA9IG1hcmdpbjtcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdHRoaXMuc3BhY2luZyA9IHNwYWNpbmc7XG5cdFx0dGhpcy50aWxlQ291bnQgPSB0aWxlY291bnQ7XG5cdFx0dGhpcy50aWxlSGVpZ2h0ID0gdGlsZWhlaWdodDtcblx0XHR0aGlzLnRpbGVXaWR0aCA9IHRpbGV3aWR0aDtcblx0XHR0aGlzLnRpbGVzID0gdGlsZXMgPz8gW107XG5cblx0XHRjb25zb2xlLmxvZyh0aGlzKTtcblxuXHRcdHJldHVybiBuZXcgUHJvbWlzZShhY2NlcHQgPT4gdGhpcy5pbWFnZS5vbmxvYWQgPSAoKSA9PiBhY2NlcHQoKSk7XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCIvLyB0ZXh0dXJlLmZyYWdcXG4jZGVmaW5lIE1fUEkgMy4xNDE1OTI2NTM1ODk3OTMyMzg0NjI2NDMzODMyNzk1XFxuI2RlZmluZSBNX1RBVSBNX1BJIC8gMi4wXFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxudmFyeWluZyB2ZWMyIHZfcG9zaXRpb247XFxuXFxudW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTtcXG51bmlmb3JtIHNhbXBsZXIyRCB1X2VmZmVjdDtcXG51bmlmb3JtIHNhbXBsZXIyRCB1X3RpbGVzO1xcbnVuaWZvcm0gc2FtcGxlcjJEIHVfdGlsZU1hcHBpbmc7XFxuXFxudW5pZm9ybSB2ZWMyIHVfc2l6ZTtcXG51bmlmb3JtIHZlYzIgdV90aWxlU2l6ZTtcXG51bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uO1xcbnVuaWZvcm0gdmVjMiB1X21hcFRleHR1cmVTaXplO1xcblxcbnVuaWZvcm0gdmVjNCB1X2NvbG9yO1xcbnVuaWZvcm0gdmVjNCB1X3JlZ2lvbjtcXG51bmlmb3JtIHZlYzIgdV9wYXJhbGxheDtcXG51bmlmb3JtIHZlYzIgdV9zY3JvbGw7XFxudW5pZm9ybSB2ZWMyIHVfc3RyZXRjaDtcXG5cXG51bmlmb3JtIGZsb2F0IHVfdGltZTtcXG51bmlmb3JtIGZsb2F0IHVfc2NhbGU7XFxuXFxudW5pZm9ybSBpbnQgdV9yZW5kZXJUaWxlcztcXG51bmlmb3JtIGludCB1X3JlbmRlclBhcmFsbGF4O1xcbnVuaWZvcm0gaW50IHVfcmVuZGVyTW9kZTtcXG5cXG5mbG9hdCBtYXNrZWQgPSAwLjA7XFxuZmxvYXQgc29ydGVkID0gMS4wO1xcbmZsb2F0IGRpc3BsYWNlID0gMS4wO1xcbmZsb2F0IGJsdXIgPSAxLjA7XFxuXFxudmVjMiByaXBwbGVYKHZlYzIgdGV4Q29vcmQsIGZsb2F0IGEsIGZsb2F0IGIsIGZsb2F0IGMpIHtcXG4gIHZlYzIgcmlwcGxlZCA9IHZlYzIoXFxuICAgIHZfdGV4Q29vcmQueCArIHNpbih2X3RleENvb3JkLnkgKiAoYSAqIHVfc2l6ZS55KSArIGIpICogYyAvIHVfc2l6ZS54LFxcbiAgICB2X3RleENvb3JkLnlcXG4gICk7XFxuXFxuICBpZiAocmlwcGxlZC54IDwgMC4wKSB7XFxuICAgIHJpcHBsZWQueCA9IGFicyhyaXBwbGVkLngpO1xcbiAgfVxcbiAgZWxzZSBpZiAocmlwcGxlZC54ID4gdV9zaXplLngpIHtcXG4gICAgcmlwcGxlZC54ID0gdV9zaXplLnggLSAocmlwcGxlZC54IC0gdV9zaXplLngpO1xcbiAgfVxcblxcbiAgcmV0dXJuIHJpcHBsZWQ7XFxufVxcblxcbnZlYzIgcmlwcGxlWSh2ZWMyIHRleENvb3JkLCBmbG9hdCBhLCBmbG9hdCBiLCBmbG9hdCBjKSB7XFxuICB2ZWMyIHJpcHBsZWQgPSB2ZWMyKHZfdGV4Q29vcmQueCwgdl90ZXhDb29yZC55ICsgc2luKHZfdGV4Q29vcmQueCAqIChhICogdV9zaXplLngpICsgYikgKiBjIC8gdV9zaXplLnkpO1xcblxcbiAgaWYgKHJpcHBsZWQueSA8IDAuMCkge1xcbiAgICByaXBwbGVkLnggPSBhYnMocmlwcGxlZC54KTtcXG4gIH1cXG4gIGVsc2UgaWYgKHJpcHBsZWQueSA+IHVfc2l6ZS55KSB7XFxuICAgIHJpcHBsZWQueSA9IHVfc2l6ZS55IC0gKHJpcHBsZWQueSAtIHVfc2l6ZS55KTtcXG4gIH1cXG5cXG4gIHJldHVybiByaXBwbGVkO1xcbn1cXG5cXG52ZWM0IG1vdGlvbkJsdXIoc2FtcGxlcjJEIGltYWdlLCBmbG9hdCBhbmdsZSwgZmxvYXQgbWFnbml0dWRlLCB2ZWMyIHRleHRDb29yZCkge1xcbiAgdmVjNCBvcmlnaW5hbENvbG9yID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQpO1xcbiAgdmVjNCBkaXNwQ29sb3IgPSBvcmlnaW5hbENvbG9yO1xcblxcbiAgY29uc3QgZmxvYXQgbWF4ID0gMTAuMDtcXG4gIGZsb2F0IHdlaWdodCA9IDAuODU7XFxuXFxuICBmb3IgKGZsb2F0IGkgPSAwLjA7IGkgPCBtYXg7IGkgKz0gMS4wKSB7XFxuICAgIGlmKGkgPiBhYnMobWFnbml0dWRlKSB8fCBvcmlnaW5hbENvbG9yLmEgPCAxLjApIHtcXG4gICAgICBicmVhaztcXG4gICAgfVxcbiAgICB2ZWM0IGRpc3BDb2xvckRvd24gPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCArIHZlYzIoXFxuICAgICAgY29zKGFuZ2xlKSAqIGkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueCxcXG4gICAgICBzaW4oYW5nbGUpICogaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS55XFxuICAgICkpO1xcbiAgICBkaXNwQ29sb3IgPSBkaXNwQ29sb3IgKiAoMS4wIC0gd2VpZ2h0KSArIGRpc3BDb2xvckRvd24gKiB3ZWlnaHQ7XFxuICAgIHdlaWdodCAqPSAwLjg7XFxuICB9XFxuXFxuICByZXR1cm4gZGlzcENvbG9yO1xcbn1cXG5cXG52ZWM0IGxpbmVhckJsdXIoc2FtcGxlcjJEIGltYWdlLCBmbG9hdCBhbmdsZSwgZmxvYXQgbWFnbml0dWRlLCB2ZWMyIHRleHRDb29yZCkge1xcbiAgdmVjNCBvcmlnaW5hbENvbG9yID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQpO1xcbiAgdmVjNCBkaXNwQ29sb3IgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCk7XFxuXFxuICBjb25zdCBmbG9hdCBtYXggPSAxMC4wO1xcbiAgZmxvYXQgd2VpZ2h0ID0gMC42NTtcXG5cXG4gIGZvciAoZmxvYXQgaSA9IDAuMDsgaSA8IG1heDsgaSArPSAwLjI1KSB7XFxuICAgIGlmKGkgPiBhYnMobWFnbml0dWRlKSkge1xcbiAgICAgIGJyZWFrO1xcbiAgICB9XFxuICAgIHZlYzQgZGlzcENvbG9yVXAgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCArIHZlYzIoXFxuICAgICAgY29zKGFuZ2xlKSAqIC1pICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLngsXFxuICAgICAgc2luKGFuZ2xlKSAqIC1pICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLnlcXG4gICAgKSk7XFxuICAgIHZlYzQgZGlzcENvbG9yRG93biA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkICsgdmVjMihcXG4gICAgICBjb3MoYW5nbGUpICogaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS54LFxcbiAgICAgIHNpbihhbmdsZSkgKiBpICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLnlcXG4gICAgKSk7XFxuICAgIGRpc3BDb2xvciA9IGRpc3BDb2xvciAqICgxLjAgLSB3ZWlnaHQpICsgZGlzcENvbG9yRG93biAqIHdlaWdodCAqIDAuNSArIGRpc3BDb2xvclVwICogd2VpZ2h0ICogMC41O1xcbiAgICB3ZWlnaHQgKj0gMC43MDtcXG4gIH1cXG5cXG4gIHJldHVybiBkaXNwQ29sb3I7XFxufVxcblxcbnZvaWQgbWFpbigpIHtcXG4gIHZlYzQgb3JpZ2luYWxDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB2X3RleENvb3JkKTtcXG4gIHZlYzQgZWZmZWN0Q29sb3IgPSB0ZXh0dXJlMkQodV9lZmZlY3QsICB2X3RleENvb3JkKTtcXG5cXG4gIC8vIFRoaXMgb25seSBhcHBsaWVzIHdoZW4gZHJhd2luZyB0aGUgcGFyYWxsYXggYmFja2dyb3VuZFxcbiAgaWYgKHVfcmVuZGVyUGFyYWxsYXggPT0gMSkge1xcblxcbiAgICBmbG9hdCB0ZXhlbFNpemUgPSAxLjAgLyB1X3NpemUueDtcXG5cXG4gICAgdmVjMiBwYXJhbGxheENvb3JkID0gdl90ZXhDb29yZCAqIHZlYzIoMS4wLCAtMS4wKSArIHZlYzIoMC4wLCAxLjApXFxuICAgICAgKyB2ZWMyKHVfc2Nyb2xsLnggKiB0ZXhlbFNpemUgKiB1X3BhcmFsbGF4LngsIDAuMCk7XFxuICAgICAgLy8gKyB2ZWMyKHVfdGltZSAvIDEwMDAwLjAsIDAuMCk7XFxuICAgICAgLy8gKyB2ZWMyKCwgMC4wKTtcXG4gICAgICA7XFxuXFxuICAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCAgcGFyYWxsYXhDb29yZCk7XFxuXFxuICAgIHJldHVybjtcXG4gIH1cXG5cXG4gIC8vIFRoaXMgb25seSBhcHBsaWVzIHdoZW4gZHJhd2luZyB0aWxlcy5cXG4gIGlmICh1X3JlbmRlclRpbGVzID09IDEpIHtcXG4gICAgZmxvYXQgeFRpbGVzID0gZmxvb3IodV9zaXplLnggLyB1X3RpbGVTaXplLngpO1xcbiAgICBmbG9hdCB5VGlsZXMgPSBmbG9vcih1X3NpemUueSAvIHVfdGlsZVNpemUueSk7XFxuXFxuICAgIGZsb2F0IHhUID0gKHZfdGV4Q29vcmQueCAqIHVfc2l6ZS54KSAvIHVfdGlsZVNpemUueDtcXG4gICAgZmxvYXQgeVQgPSAodl90ZXhDb29yZC55ICogdV9zaXplLnkpIC8gdV90aWxlU2l6ZS55O1xcblxcbiAgICBmbG9hdCBpbnZfeFRpbGVzID0gMS4wIC8geFRpbGVzO1xcbiAgICBmbG9hdCBpbnZfeVRpbGVzID0gMS4wIC8geVRpbGVzO1xcblxcbiAgICBmbG9hdCB4VGlsZSA9IGZsb29yKHhUKSAqIGludl94VGlsZXM7XFxuICAgIGZsb2F0IHlUaWxlID0gZmxvb3IoeVQpICogaW52X3lUaWxlcztcXG5cXG4gICAgZmxvYXQgeE9mZiA9ICh4VCAqIGludl94VGlsZXMgLSB4VGlsZSkgKiB4VGlsZXM7XFxuICAgIGZsb2F0IHlPZmYgPSAoeVQgKiBpbnZfeVRpbGVzIC0geVRpbGUpICogeVRpbGVzICogLTEuMCArIDEuMDtcXG5cXG4gICAgZmxvYXQgeFdyYXAgPSB1X21hcFRleHR1cmVTaXplLnggLyB1X3RpbGVTaXplLng7XFxuICAgIGZsb2F0IHlXcmFwID0gdV9tYXBUZXh0dXJlU2l6ZS55IC8gdV90aWxlU2l6ZS55O1xcblxcbiAgICAvLyBNb2RlIDEgZHJhd3MgdGlsZXMnIHgveSB2YWx1ZXMgYXMgcmVkICYgZ3JlZW5cXG4gICAgaWYgKHVfcmVuZGVyTW9kZSA9PSAxKSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCh4VGlsZSwgeVRpbGUsIDAsIDEuMCk7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIC8vIE1vZGUgMiBpcyB0aGUgc2FtZSBhcyBtb2RlIDEgYnV0IGFkZHMgY29tYmluZXNcXG4gICAgLy8gaW50ZXJuYWwgdGlsZSB4L3kgdG8gdGhlIGJsdWUgY2hhbm5lbFxcbiAgICBpZiAodV9yZW5kZXJNb2RlID09IDIpIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KHhUaWxlLCB5VGlsZSwgKHhPZmYgKyB5T2ZmKSAqIDAuNSwgMS4wKTtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG5cXG4gICAgdmVjNCB0aWxlID0gdGV4dHVyZTJEKHVfdGlsZU1hcHBpbmcsIHZfdGV4Q29vcmQgKiB2ZWMyKDEuMCwgLTEuMCkgKyB2ZWMyKDAuMCwgMS4wKSk7XFxuXFxuICAgIGZsb2F0IGxvID0gdGlsZS5yICogMjU2LjA7XFxuICAgIGZsb2F0IGhpID0gdGlsZS5nICogMjU2LjAgKiAyNTYuMDtcXG5cXG4gICAgZmxvYXQgdGlsZU51bWJlciA9IGxvICsgaGk7XFxuXFxuICAgIGlmICh0aWxlTnVtYmVyID09IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvci5hID0gMC4wO1xcbiAgICAgIHJldHVybjtcXG4gICAgfVxcblxcbiAgICAvLyBNb2RlIDMgdXNlcyB0aGUgdGlsZSBudW1iZXIgZm9yIHRoZSByZWQvZ3JlZW4gY2hhbm5lbHNcXG4gICAgaWYgKHVfcmVuZGVyTW9kZSA9PSAzKSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdGlsZTtcXG4gICAgICBnbF9GcmFnQ29sb3IuYiA9IDAuNTtcXG4gICAgICBnbF9GcmFnQ29sb3IuYSA9IDEuMDtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG5cXG4gICAgLy8gTW9kZSA0IG5vcm1hbGl6ZXMgdGhlIHRpbGUgbnVtYmVyIHRvIGFsbCBjaGFubmVsc1xcbiAgICBpZiAodV9yZW5kZXJNb2RlID09IDQpIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KFxcbiAgICAgICAgbW9kKHRpbGVOdW1iZXIsIDI1Ni4wKSAvIDI1Ni4wXFxuICAgICAgICAsIG1vZCh0aWxlTnVtYmVyLCAyNTYuMCkgLyAyNTYuMFxcbiAgICAgICAgLCBtb2QodGlsZU51bWJlciwgMjU2LjApIC8gMjU2LjBcXG4gICAgICAgICwgMS4wXFxuICAgICAgKTtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG5cXG4gICAgZmxvYXQgdGlsZVNldFggPSBmbG9vcihtb2QoKC0xLjAgKyB0aWxlTnVtYmVyKSwgeFdyYXApKTtcXG4gICAgZmxvYXQgdGlsZVNldFkgPSBmbG9vcigoLTEuMCArIHRpbGVOdW1iZXIpIC8geFdyYXApO1xcblxcbiAgICB2ZWM0IHRpbGVDb2xvciA9IHRleHR1cmUyRCh1X3RpbGVzLCB2ZWMyKFxcbiAgICAgIHhPZmYgLyB4V3JhcCArIHRpbGVTZXRYICogKHVfdGlsZVNpemUueSAvIHVfbWFwVGV4dHVyZVNpemUueSlcXG4gICAgICAsIHlPZmYgLyB5V3JhcCArIHRpbGVTZXRZICogKHVfdGlsZVNpemUueSAvIHVfbWFwVGV4dHVyZVNpemUueSlcXG4gICAgKSk7XFxuXFxuICAgIGdsX0ZyYWdDb2xvciA9IHRpbGVDb2xvcjtcXG5cXG4gICAgcmV0dXJuO1xcbiAgfVxcblxcbiAgLy8gVGhpcyBpZi9lbHNlIGJsb2NrIG9ubHkgYXBwbGllc1xcbiAgLy8gd2hlbiB3ZSdyZSBkcmF3aW5nIHRoZSBlZmZlY3RCdWZmZXJcXG4gIGlmICh1X3JlZ2lvbi5yID4gMC4wIHx8IHVfcmVnaW9uLmcgPiAwLjAgfHwgdV9yZWdpb24uYiA+IDAuMCkge1xcbiAgICBpZiAobWFza2VkIDwgMS4wIHx8IG9yaWdpbmFsQ29sb3IuYSA+IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHVfcmVnaW9uO1xcbiAgICB9XFxuICAgIHJldHVybjtcXG4gIH1cXG4gIGVsc2UgaWYgKHVfcmVnaW9uLmEgPiAwLjApIHtcXG4gICAgaWYgKHNvcnRlZCA+IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMCwgMCwgMCwgb3JpZ2luYWxDb2xvci5hID4gMC4wID8gMS4wIDogMC4wKTtcXG4gICAgfVxcbiAgICBlbHNlIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAsIDAsIDAsIDAuMCk7XFxuICAgIH1cXG4gICAgcmV0dXJuO1xcbiAgfTtcXG5cXG4gIC8vIE1vZGUgNSBkcmF3cyB0aGUgZWZmZWN0IGJ1ZmZlciB0byB0aGUgc2NyZWVuXFxuICBpZiAodV9yZW5kZXJNb2RlID09IDUpIHtcXG4gICAgZ2xfRnJhZ0NvbG9yID0gZWZmZWN0Q29sb3I7XFxuICAgIHJldHVybjtcXG4gIH1cXG5cXG4gIHZlYzMgcmlwcGxlID0gdmVjMyhNX1BJLzguMCwgdV90aW1lIC8gMjAwLjAsIDEuMCk7XFxuXFxuICAvLyBUaGlzIGlmL2Vsc2UgYmxvY2sgb25seSBhcHBsaWVzXFxuICAvLyB3aGVuIHdlJ3JlIGRyYXdpbmcgdGhlIGRyYXdCdWZmZXJcXG4gIGlmIChlZmZlY3RDb2xvciA9PSB2ZWM0KDAsIDEsIDEsIDEpKSB7IC8vIFdhdGVyIHJlZ2lvblxcbiAgICB2ZWMyIHRleENvb3JkID0gdl90ZXhDb29yZDtcXG4gICAgdmVjNCB2X2JsdXJyZWRDb2xvciA9IG9yaWdpbmFsQ29sb3I7XFxuICAgIGlmIChkaXNwbGFjZSA+IDAuMCkge1xcbiAgICAgIHRleENvb3JkID0gcmlwcGxlWCh2X3RleENvb3JkLCByaXBwbGUueCwgcmlwcGxlLnksIHJpcHBsZS56KTtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB0ZXhDb29yZCk7XFxuICAgIH1cXG4gICAgaWYgKGJsdXIgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IGxpbmVhckJsdXIodV9pbWFnZSwgMC4wLCAxLjAsIHRleENvb3JkKTtcXG4gICAgfVxcbiAgICBnbF9GcmFnQ29sb3IgPSB2X2JsdXJyZWRDb2xvciAqIDAuNjUgKyBlZmZlY3RDb2xvciAqIDAuMzU7XFxuICB9XFxuICBlbHNlIGlmIChlZmZlY3RDb2xvciA9PSB2ZWM0KDEsIDAsIDAsIDEpKSB7IC8vIEZpcmUgcmVnaW9uXFxuICAgIHZlYzIgdl9kaXNwbGFjZW1lbnQgPSByaXBwbGVZKHZfdGV4Q29vcmQsIHJpcHBsZS54ICogMy4wLCByaXBwbGUueSAqIDEuNSwgcmlwcGxlLnogKiAwLjMzMyk7XFxuICAgIHZlYzQgdl9ibHVycmVkQ29sb3IgPSBvcmlnaW5hbENvbG9yO1xcbiAgICBpZiAoZGlzcGxhY2UgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB2X2Rpc3BsYWNlbWVudCk7XFxuICAgIH1cXG4gICAgaWYgKGJsdXIgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IG1vdGlvbkJsdXIodV9pbWFnZSwgLU1fVEFVLCAxLjAsIHZfZGlzcGxhY2VtZW50KTtcXG4gICAgfVxcbiAgICBnbF9GcmFnQ29sb3IgPSB2X2JsdXJyZWRDb2xvciAqIDAuNzUgKyBlZmZlY3RDb2xvciAqIDAuMjU7XFxuICB9XFxuICBlbHNlIHsgLy8gTnVsbCByZWdpb25cXG4gICAgZ2xfRnJhZ0NvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG4gIH1cXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiLy8gdGV4dHVyZS52ZXJ0XFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxuYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxuXFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxudmFyeWluZyB2ZWMyIHZfcG9zaXRpb247XFxuXFxudm9pZCBtYWluKClcXG57XFxuICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247XFxuICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDtcXG4gIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTtcXG4gIHZfdGV4Q29vcmQgID0gYV90ZXhDb29yZDtcXG4gIHZfcG9zaXRpb24gID0gYV9wb3NpdGlvbjtcXG59XFxuXCIiLCJpbXBvcnQgeyBWaWV3IH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvVmlldyc7XG5cbmV4cG9ydCBjbGFzcyBDb250cm9sbGVyIGV4dGVuZHMgVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXIudG1wJyk7XG5cdFx0dGhpcy5kcmFnU3RhcnQgPSBmYWxzZTtcblxuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyAgPSBmYWxzZTtcblx0XHR0aGlzLmFyZ3MueCA9IDA7XG5cdFx0dGhpcy5hcmdzLnkgPSAwO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5tb3ZlU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMuZHJvcFN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMubW92ZVN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5kcm9wU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZHJhZ1N0aWNrKGV2ZW50KVxuXHR7XG5cdFx0bGV0IHBvcyA9IGV2ZW50O1xuXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuXHRcdGlmKGV2ZW50LnRvdWNoZXMgJiYgZXZlbnQudG91Y2hlc1swXSlcblx0XHR7XG5cdFx0XHRwb3MgPSBldmVudC50b3VjaGVzWzBdO1xuXHRcdH1cblxuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyA9IHRydWU7XG5cdFx0dGhpcy5kcmFnU3RhcnQgICAgID0ge1xuXHRcdFx0eDogICBwb3MuY2xpZW50WFxuXHRcdFx0LCB5OiBwb3MuY2xpZW50WVxuXHRcdH07XG5cdH1cblxuXHRtb3ZlU3RpY2soZXZlbnQpXG5cdHtcblx0XHRpZih0aGlzLmFyZ3MuZHJhZ2dpbmcpXG5cdFx0e1xuXHRcdFx0bGV0IHBvcyA9IGV2ZW50O1xuXG5cdFx0XHRpZihldmVudC50b3VjaGVzICYmIGV2ZW50LnRvdWNoZXNbMF0pXG5cdFx0XHR7XG5cdFx0XHRcdHBvcyA9IGV2ZW50LnRvdWNoZXNbMF07XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy54eCA9IHBvcy5jbGllbnRYIC0gdGhpcy5kcmFnU3RhcnQueDtcblx0XHRcdHRoaXMuYXJncy55eSA9IHBvcy5jbGllbnRZIC0gdGhpcy5kcmFnU3RhcnQueTtcblxuXHRcdFx0Y29uc3QgbGltaXQgPSA1MDtcblxuXHRcdFx0aWYodGhpcy5hcmdzLnh4IDwgLWxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IC1saW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYodGhpcy5hcmdzLnh4ID4gbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gdGhpcy5hcmdzLnh4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLmFyZ3MueXkgPCAtbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gLWxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZih0aGlzLmFyZ3MueXkgPiBsaW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSBsaW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSB0aGlzLmFyZ3MueXk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJvcFN0aWNrKGV2ZW50KVxuXHR7XG5cdFx0dGhpcy5hcmdzLmRyYWdnaW5nID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnggPSAwO1xuXHRcdHRoaXMuYXJncy55ID0gMDtcblx0fVxufVxuIiwiaW1wb3J0IHsgVmlldyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1ZpZXcnO1xuXG5leHBvcnQgY2xhc3MgTWFwRWRpdG9yIGV4dGVuZHMgVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL21hcEVkaXRvci50bXAnKTtcblxuXHRcdGFyZ3Muc3ByaXRlU2hlZXQucmVhZHkudGhlbigoc2hlZXQpPT57XG5cdFx0XHR0aGlzLmFyZ3MudGlsZXMgPSBzaGVldC5mcmFtZXM7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmFyZ3MuYmluZFRvKCdzZWxlY3RlZEdyYXBoaWMnLCAodik9Pntcblx0XHRcdHRoaXMuYXJncy5zZWxlY3RlZEdyYXBoaWMgPSBudWxsO1xuXHRcdH0sIHt3YWl0OjB9KTtcblxuXHRcdHRoaXMuYXJncy5tdWx0aVNlbGVjdCAgID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnNlbGVjdGlvbiAgICAgPSB7fTtcblx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRJbWFnZSA9IG51bGxcblx0fVxuXG5cdHNlbGVjdEdyYXBoaWMoc3JjKVxuXHR7XG5cdFx0Y29uc29sZS5sb2coc3JjKTtcblxuXHRcdHRoaXMuYXJncy5zZWxlY3RlZEdyYXBoaWMgPSBzcmM7XG5cdH1cblxuXHRzZWxlY3Qoc2VsZWN0aW9uKVxuXHR7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLmFyZ3Muc2VsZWN0aW9uLCBzZWxlY3Rpb24pO1xuXG5cdFx0aWYoc2VsZWN0aW9uLmdsb2JhbFggIT09IHNlbGVjdGlvbi5zdGFydEdsb2JhbFhcblx0XHRcdHx8IHNlbGVjdGlvbi5nbG9iYWxZICE9PSBzZWxlY3Rpb24uc3RhcnRHbG9iYWxZXG5cdFx0KXtcblx0XHRcdHRoaXMuYXJncy5tdWx0aVNlbGVjdCA9IHRydWU7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR0aGlzLmFyZ3MubXVsdGlTZWxlY3QgPSBmYWxzZTtcblx0XHR9XG5cblx0XHRpZighdGhpcy5hcmdzLm11bHRpU2VsZWN0KVxuXHRcdHtcblx0XHRcdHRoaXMuYXJncy5zZWxlY3RlZEltYWdlcyA9IHRoaXMuYXJncy5tYXAuZ2V0VGlsZShzZWxlY3Rpb24uZ2xvYmFsWCwgc2VsZWN0aW9uLmdsb2JhbFkpO1xuXHRcdH1cblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3MgPSBcXFwiY29udHJvbGxlclxcXCI+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJqb3lzdGlja1xcXCIgY3Ytb24gPSBcXFwiXFxuXFx0XFx0dG91Y2hzdGFydDpkcmFnU3RpY2soZXZlbnQpO1xcblxcdFxcdG1vdXNlZG93bjpkcmFnU3RpY2soZXZlbnQpO1xcblxcdFxcXCI+XFxuXFx0XFx0PGRpdiBjbGFzcyA9IFxcXCJwYWRcXFwiIHN0eWxlID0gXFxcInBvc2l0aW9uOiByZWxhdGl2ZTsgdHJhbnNmb3JtOnRyYW5zbGF0ZShbW3hdXXB4LFtbeV1dcHgpO1xcXCI+PC9kaXY+XFxuXFx0PC9kaXY+XFxuXFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJidXR0b25cXFwiPkE8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImJ1dHRvblxcXCI+QjwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwiYnV0dG9uXFxcIj5DPC9kaXY+XFxuPC9kaXY+XCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcyA9IFxcXCJ0YWItcGFnZSBtYXBFZGl0b3JcXFwiPlxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGFic1xcXCI+XFxuXFx0XFx0PGRpdj5UaWxlPC9kaXY+XFxuXFx0XFx0PGRpdj5MYXllcjwvZGl2PlxcblxcdFxcdDxkaXY+T2JqZWN0PC9kaXY+XFxuXFx0XFx0PGRpdj5UcmlnZ2VyPC9kaXY+XFxuXFx0XFx0PGRpdj5NYXA8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVcXFwiPlxcblxcdFxcdDxkaXYgY2xhc3MgPSBcXFwic2VsZWN0ZWRcXFwiPlxcblxcdFxcdFxcdDxkaXYgY3YtaWYgPSBcXFwiIW11bHRpU2VsZWN0XFxcIj5cXG5cXHRcXHRcXHRcXHQ8cCBzdHlsZSA9IFxcXCJmb250LXNpemU6IGxhcmdlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQoW1tzZWxlY3Rpb24uZ2xvYmFsWF1dLCBbW3NlbGVjdGlvbi5nbG9iYWxZXV0pXFxuXFx0XFx0XFx0XFx0PC9wPlxcblxcdFxcdFxcdFxcdDxwIGN2LWVhY2ggPSBcXFwic2VsZWN0ZWRJbWFnZXM6c2VsZWN0ZWRJbWFnZTpzSVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGJ1dHRvbj4tPC9idXR0b24+XFxuXFx0XFx0XFx0XFx0XFx0PGltZyBjbGFzcyA9IFxcXCJjdXJyZW50XFxcIiBjdi1hdHRyID0gXFxcInNyYzpzZWxlY3RlZEltYWdlXFxcIj5cXG5cXHRcXHRcXHRcXHQ8L3A+XFxuXFx0XFx0XFx0XFx0PGJ1dHRvbj4rPC9idXR0b24+XFxuXFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0PGRpdiBjdi1pZiA9IFxcXCJtdWx0aVNlbGVjdFxcXCI+XFxuXFx0XFx0XFx0XFx0PHAgc3R5bGUgPSBcXFwiZm9udC1zaXplOiBsYXJnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0KFtbc2VsZWN0aW9uLnN0YXJ0R2xvYmFsWF1dLCBbW3NlbGVjdGlvbi5zdGFydEdsb2JhbFldXSkgLSAoW1tzZWxlY3Rpb24uZ2xvYmFsWF1dLCBbW3NlbGVjdGlvbi5nbG9iYWxZXV0pXFxuXFx0XFx0XFx0XFx0PC9wPlxcblxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdDwvZGl2PlxcblxcdFxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZXNcXFwiIGN2LWVhY2ggPSBcXFwidGlsZXM6dGlsZTp0XFxcIj5cXG5cXHRcXHRcXHQ8aW1nIGN2LWF0dHIgPSBcXFwic3JjOnRpbGUsdGl0bGU6dFxcXCIgY3Ytb24gPSBcXFwiY2xpY2s6c2VsZWN0R3JhcGhpYyh0KTtcXFwiPlxcblxcdFxcdDwvZGl2PlxcblxcdDwvZGl2PlxcblxcdDwhLS0gPGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5PQkpFQ1QgTU9ERTwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+VFJJR0dFUiBNT0RFPC9kaXY+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5NQVAgTU9ERTwvZGl2PiAtLT5cXG48L2Rpdj5cIiIsImltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGUnO1xuXG5leHBvcnQgY2xhc3MgRmxvb3Jcbntcblx0Y29uc3RydWN0b3IoZ2wyZCwgYXJncylcblx0e1xuXHRcdHRoaXMuZ2wyZCAgID0gZ2wyZDtcblx0XHR0aGlzLnNwcml0ZXMgPSBbXTtcblxuXHRcdC8vIHRoaXMucmVzaXplKDYwLCAzNCk7XG5cdFx0dGhpcy5yZXNpemUoOSwgOSk7XG5cdFx0Ly8gdGhpcy5yZXNpemUoNjAqMiwgMzQqMik7XG5cdH1cblxuXHRyZXNpemUod2lkdGgsIGhlaWdodClcblx0e1xuXHRcdHRoaXMud2lkdGggID0gd2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG5cblx0XHRmb3IobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKylcblx0XHR7XG5cdFx0XHRmb3IobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHNwcml0ZSA9IG5ldyBTcHJpdGUodGhpcy5nbDJkLCAnL2Zsb29yVGlsZS5wbmcnKTtcblxuXHRcdFx0XHRzcHJpdGUueCA9IDMyICogeDtcblx0XHRcdFx0c3ByaXRlLnkgPSAzMiAqIHk7XG5cblx0XHRcdFx0dGhpcy5zcHJpdGVzLnB1c2goc3ByaXRlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdHRoaXMuc3ByaXRlcy5tYXAocyA9PiBzLmRyYXcoKSk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuaW1wb3J0IHsgVGlsZXNldCB9IGZyb20gJy4uL3Nwcml0ZS9UaWxlc2V0JztcblxuZXhwb3J0IGNsYXNzIFRpbGVNYXBcbntcblx0Y29uc3RydWN0b3Ioe3NyY30pXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblx0XHR0aGlzLmltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0dGhpcy5zcmMgPSBzcmM7XG5cdFx0dGhpcy5waXhlbHMgPSBbXTtcblx0XHR0aGlzLnRpbGVDb3VudCA9IDA7XG5cblx0XHR0aGlzLmJhY2tncm91bmRDb2xvciA9IG51bGw7XG5cblx0XHR0aGlzLnByb3BlcnRpZXMgPSB7fTtcblxuXHRcdHRoaXMuY2FudmFzZXMgPSBuZXcgTWFwO1xuXHRcdHRoaXMuY29udGV4dHMgPSBuZXcgTWFwO1xuXG5cdFx0dGhpcy50aWxlTGF5ZXJzICAgPSBbXTtcblx0XHR0aGlzLmltYWdlTGF5ZXJzICA9IFtdO1xuXHRcdHRoaXMub2JqZWN0TGF5ZXJzID0gW107XG5cblx0XHR0aGlzLnhXb3JsZCA9IDA7XG5cdFx0dGhpcy55V29ybGQgPSAwO1xuXG5cdFx0dGhpcy53aWR0aCAgPSAwO1xuXHRcdHRoaXMuaGVpZ2h0ID0gMDtcblxuXHRcdHRoaXMudGlsZVdpZHRoICA9IDA7XG5cdFx0dGhpcy50aWxlSGVpZ2h0ID0gMDtcblxuXHRcdHRoaXMudGlsZVNldFdpZHRoICA9IDA7XG5cdFx0dGhpcy50aWxlU2V0SGVpZ2h0ID0gMDtcblxuXHRcdHRoaXMucmVhZHkgPSB0aGlzLmdldFJlYWR5KHNyYyk7XG5cblx0XHR0aGlzLmFuaW1hdGlvbnMgPSBuZXcgTWFwO1xuXHR9XG5cblx0YXN5bmMgZ2V0UmVhZHkoc3JjKVxuXHR7XG5cdFx0Y29uc3QgbWFwRGF0YSA9IGF3YWl0IChhd2FpdCBmZXRjaChzcmMpKS5qc29uKCk7XG5cblx0XHR0aGlzLnRpbGVMYXllcnMgICA9IG1hcERhdGEubGF5ZXJzLmZpbHRlcihsYXllciA9PiBsYXllci50eXBlID09PSAndGlsZWxheWVyJyk7XG5cdFx0dGhpcy5pbWFnZUxheWVycyAgPSBtYXBEYXRhLmxheWVycy5maWx0ZXIobGF5ZXIgPT4gbGF5ZXIudHlwZSA9PT0gJ2ltYWdlbGF5ZXInKTtcblx0XHR0aGlzLm9iamVjdExheWVycyA9IG1hcERhdGEubGF5ZXJzLmZpbHRlcihsYXllciA9PiBsYXllci50eXBlID09PSAnb2JqZWN0bGF5ZXInKTtcblxuXHRcdHRoaXMuYmFja2dyb3VuZENvbG9yID0gbWFwRGF0YS5iYWNrZ3JvdW5kY29sb3I7XG5cblx0XHRpZihtYXBEYXRhLnByb3BlcnRpZXMpXG5cdFx0Zm9yKGNvbnN0IHByb3BlcnR5IG9mIG1hcERhdGEucHJvcGVydGllcylcblx0XHR7XG5cdFx0XHR0aGlzLnByb3BlcnRpZXNbIHByb3BlcnR5Lm5hbWUgXSA9IHByb3BlcnR5LnZhbHVlO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMucHJvcGVydGllcy5iYWNrZ3JvdW5kQ29sb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLnByb3BlcnRpZXMuYmFja2dyb3VuZENvbG9yO1xuXHRcdH1cblxuXHRcdGNvbnN0IHRpbGVzZXRzID0gbWFwRGF0YS50aWxlc2V0cy5tYXAodCA9PiBuZXcgVGlsZXNldCh0KSk7XG5cblx0XHR0aGlzLndpZHRoICA9IG1hcERhdGEud2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSBtYXBEYXRhLmhlaWdodDtcblxuXHRcdHRoaXMudGlsZVdpZHRoICA9IG1hcERhdGEudGlsZXdpZHRoO1xuXHRcdHRoaXMudGlsZUhlaWdodCA9IG1hcERhdGEudGlsZWhlaWdodDtcblxuXHRcdGF3YWl0IFByb21pc2UuYWxsKHRpbGVzZXRzLm1hcCh0ID0+IHQucmVhZHkpKTtcblxuXHRcdHRoaXMuYXNzZW1ibGUodGlsZXNldHMpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRhc3NlbWJsZSh0aWxlc2V0cylcblx0e1xuXHRcdHRpbGVzZXRzLnNvcnQoKGEsIGIpID0+IGEuZmlyc3RHaWQgLSBiLmZpcnN0R2lkKTtcblxuXHRcdGNvbnN0IHRpbGVUb3RhbCA9IHRoaXMudGlsZUNvdW50ID0gdGlsZXNldHMucmVkdWNlKChhLCBiKSA9PiBhLnRpbGVDb3VudCArIGIudGlsZUNvdW50LCB7dGlsZUNvdW50OiAwfSk7XG5cblx0XHRjb25zdCBzaXplID0gTWF0aC5jZWlsKE1hdGguc3FydCh0aWxlVG90YWwpKTtcblxuXHRcdGNvbnN0IGRlc3RpbmF0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy50aWxlU2V0V2lkdGggID0gZGVzdGluYXRpb24ud2lkdGggID0gc2l6ZSAqIHRoaXMudGlsZVdpZHRoO1xuXHRcdHRoaXMudGlsZVNldEhlaWdodCA9IGRlc3RpbmF0aW9uLmhlaWdodCA9IE1hdGguY2VpbCh0aWxlVG90YWwgLyBzaXplKSAqIHRoaXMudGlsZUhlaWdodDtcblxuXHRcdGNvbnN0IGN0eERlc3RpbmF0aW9uID0gZGVzdGluYXRpb24uZ2V0Q29udGV4dCgnMmQnKTtcblxuXHRcdGxldCB4RGVzdGluYXRpb24gPSAwO1xuXHRcdGxldCB5RGVzdGluYXRpb24gPSAwO1xuXG5cdFx0Zm9yKGNvbnN0IHRpbGVzZXQgb2YgdGlsZXNldHMpXG5cdFx0e1xuXHRcdFx0bGV0IHhTb3VyY2UgPSAwO1xuXHRcdFx0bGV0IHlTb3VyY2UgPSAwO1xuXHRcdFx0Y29uc3QgaW1hZ2UgPSB0aWxlc2V0LmltYWdlO1xuXHRcdFx0Y29uc3Qgc291cmNlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0XHRcdHNvdXJjZS53aWR0aCA9IGltYWdlLndpZHRoO1xuXHRcdFx0c291cmNlLmhlaWdodCA9IGltYWdlLmhlaWdodDtcblxuXHRcdFx0Y29uc3QgY3R4U291cmNlID0gc291cmNlLmdldENvbnRleHQoJzJkJywge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pO1xuXG5cdFx0XHRjdHhTb3VyY2UuZHJhd0ltYWdlKGltYWdlLCAwLCAwKTtcblxuXHRcdFx0Zm9yKGxldCBpID0gMDsgaSA8IHRpbGVzZXQudGlsZUNvdW50OyBpKyspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHRpbGUgPSBjdHhTb3VyY2UuZ2V0SW1hZ2VEYXRhKHhTb3VyY2UsIHlTb3VyY2UsIHRoaXMudGlsZVdpZHRoLCB0aGlzLnRpbGVIZWlnaHQpO1xuXG5cdFx0XHRcdGN0eERlc3RpbmF0aW9uLnB1dEltYWdlRGF0YSh0aWxlLCB4RGVzdGluYXRpb24sIHlEZXN0aW5hdGlvbik7XG5cblx0XHRcdFx0eFNvdXJjZSArPSB0aGlzLnRpbGVXaWR0aDtcblx0XHRcdFx0eERlc3RpbmF0aW9uICs9IHRoaXMudGlsZVdpZHRoO1xuXG5cdFx0XHRcdGlmKHhTb3VyY2UgPj0gdGlsZXNldC5pbWFnZVdpZHRoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eFNvdXJjZSA9IDA7XG5cdFx0XHRcdFx0eVNvdXJjZSArPSB0aGlzLnRpbGVIZWlnaHQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZih4RGVzdGluYXRpb24gPj0gZGVzdGluYXRpb24ud2lkdGgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR4RGVzdGluYXRpb24gPSAwO1xuXHRcdFx0XHRcdHlEZXN0aW5hdGlvbiArPSB0aGlzLnRpbGVIZWlnaHQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnBpeGVscyA9IGN0eERlc3RpbmF0aW9uLmdldEltYWdlRGF0YSgwLCAwLCBkZXN0aW5hdGlvbi53aWR0aCwgZGVzdGluYXRpb24uaGVpZ2h0KS5kYXRhO1xuXG5cdFx0ZGVzdGluYXRpb24udG9CbG9iKGJsb2IgPT4ge1xuXHRcdFx0Y29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdHRoaXMuaW1hZ2Uub25sb2FkID0gKCkgPT4gVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuXHRcdFx0dGhpcy5pbWFnZS5zcmMgPSB1cmw7XG5cdFx0fSk7XG5cblx0XHRmb3IoY29uc3QgdGlsZXNldCBvZiB0aWxlc2V0cylcblx0XHR7XG5cdFx0XHRmb3IoY29uc3QgdGlsZURhdGEgb2YgdGlsZXNldC50aWxlcylcblx0XHRcdHtcblx0XHRcdFx0aWYodGlsZURhdGEuYW5pbWF0aW9uKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hbmltYXRpb25zLnNldCh0aWxlRGF0YS5pZCwgdGlsZURhdGEuYW5pbWF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZvcihjb25zdCBsYXllciBvZiB0aGlzLnRpbGVMYXllcnMpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0XHRjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJywge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pO1xuXG5cdFx0XHR0aGlzLmNhbnZhc2VzLnNldChsYXllciwgY2FudmFzKTtcblx0XHRcdHRoaXMuY29udGV4dHMuc2V0KGxheWVyLCBjb250ZXh0KTtcblxuXHRcdFx0Y29uc3QgdGlsZVZhbHVlcyA9IG5ldyBVaW50MzJBcnJheShsYXllci5kYXRhLm1hcCh0ID0+IDAgKyB0KSk7XG5cdFx0XHRjb25zdCB0aWxlUGl4ZWxzID0gbmV3IFVpbnQ4Q2xhbXBlZEFycmF5KHRpbGVWYWx1ZXMuYnVmZmVyKTtcblxuXHRcdFx0Zm9yKGNvbnN0IGkgaW4gdGlsZVZhbHVlcylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdGlsZSA9IHRpbGVWYWx1ZXNbaV07XG5cblx0XHRcdFx0aWYodGhpcy5hbmltYXRpb25zLmhhcyh0aWxlKSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHtpLCB0aWxlfSwgdGhpcy5hbmltYXRpb25zLmdldCh0aWxlKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Zm9yKGxldCBpID0gMzsgaSA8IHRpbGVQaXhlbHMubGVuZ3RoOyBpICs9NClcblx0XHRcdHtcblx0XHRcdFx0dGlsZVBpeGVsc1tpXSA9IDB4RkY7XG5cdFx0XHR9XG5cblx0XHRcdGNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGg7XG5cdFx0XHRjYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XG5cdFx0XHRjb250ZXh0LnB1dEltYWdlRGF0YShuZXcgSW1hZ2VEYXRhKHRpbGVQaXhlbHMsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSwgMCwgMCk7XG5cdFx0fVxuXHR9XG5cblx0Z2V0U2xpY2UoeCwgeSwgdywgaCwgdCA9IDApXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5jb250ZXh0cy52YWx1ZXMoKS5tYXAoY29udGV4dCA9PiBjb250ZXh0LmdldEltYWdlRGF0YSh4LCB5LCB3LCBoKS5kYXRhKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5pbXBvcnQgeyBUaWxlc2V0IH0gZnJvbSAnLi4vc3ByaXRlL1RpbGVzZXQnO1xuaW1wb3J0IHsgVGlsZU1hcCB9IGZyb20gJy4vVGlsZU1hcCc7XG5pbXBvcnQgeyBSZWN0YW5nbGUgfSBmcm9tICcuLi9tYXRoL1JlY3RhbmdsZSc7XG5pbXBvcnQgeyBNVHJlZSB9IGZyb20gJy4uL21hdGgvTVRyZWUnO1xuXG5leHBvcnQgY2xhc3MgV29ybGRcbntcblx0Y29uc3RydWN0b3Ioe3NyY30pXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblx0XHR0aGlzLnJlYWR5ID0gdGhpcy5nZXRSZWFkeShzcmMpO1xuXHRcdHRoaXMubWFwcyA9IFtdO1xuXHRcdHRoaXMubVRyZWUgPSBuZXcgTVRyZWU7XG5cdFx0dGhpcy5yZWN0TWFwID0gbmV3IE1hcDtcblx0fVxuXG5cdGFzeW5jIGdldFJlYWR5KHNyYylcblx0e1xuXHRcdGNvbnN0IHdvcmxkRGF0YSA9IGF3YWl0IChhd2FpdCBmZXRjaChzcmMpKS5qc29uKCk7XG5cdFx0cmV0dXJuIGF3YWl0IFByb21pc2UuYWxsKHdvcmxkRGF0YS5tYXBzLm1hcCgobSwgaSkgPT4ge1xuXHRcdFx0Y29uc3QgbWFwID0gbmV3IFRpbGVNYXAoe3NyYzogbS5maWxlTmFtZX0pO1xuXG5cdFx0XHRtYXAueFdvcmxkID0gbS54O1xuXHRcdFx0bWFwLnlXb3JsZCA9IG0ueTtcblx0XHRcdHRoaXMubWFwc1tpXSA9IG1hcDtcblxuXHRcdFx0Y29uc3QgcmVjdCA9IG5ldyBSZWN0YW5nbGUobS54LCBtLnksIG0ueCArIG0ud2lkdGgsIG0ueSArIG0uaGVpZ2h0KTtcblxuXHRcdFx0dGhpcy5yZWN0TWFwLnNldChyZWN0LCBtYXApO1xuXG5cdFx0XHR0aGlzLm1UcmVlLmFkZChyZWN0KTtcblxuXHRcdFx0cmV0dXJuIG1hcC5yZWFkeTtcblx0XHR9KSk7XG5cdH1cblxuXHRnZXRNYXBzRm9yUG9pbnQoeCwgeSlcblx0e1xuXHRcdGNvbnN0IHJlY3RzID0gdGhpcy5tVHJlZS5xdWVyeSh4LCB5LCB4LCB5KTtcblx0XHRjb25zdCBtYXBzID0gbmV3IFNldDtcblxuXHRcdGZvcihjb25zdCByZWN0IG9mIHJlY3RzKVxuXHRcdHtcblx0XHRcdGNvbnN0IG1hcCA9IHRoaXMucmVjdE1hcC5nZXQocmVjdCk7XG5cdFx0XHRtYXBzLmFkZChtYXApO1xuXHRcdH1cblxuXHRcdHJldHVybiBtYXBzO1xuXHR9XG59XG4iLCIvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBXZWJTb2NrZXQgPSB3aW5kb3cuV2ViU29ja2V0IHx8IHdpbmRvdy5Nb3pXZWJTb2NrZXQ7XG4gIHZhciBiciA9IHdpbmRvdy5icnVuY2ggPSAod2luZG93LmJydW5jaCB8fCB7fSk7XG4gIHZhciBhciA9IGJyWydhdXRvLXJlbG9hZCddID0gKGJyWydhdXRvLXJlbG9hZCddIHx8IHt9KTtcbiAgaWYgKCFXZWJTb2NrZXQgfHwgYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgaWYgKHdpbmRvdy5fYXIpIHJldHVybjtcbiAgd2luZG93Ll9hciA9IHRydWU7XG5cbiAgdmFyIGNhY2hlQnVzdGVyID0gZnVuY3Rpb24odXJsKXtcbiAgICB2YXIgZGF0ZSA9IE1hdGgucm91bmQoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgdXJsID0gdXJsLnJlcGxhY2UoLyhcXCZ8XFxcXD8pY2FjaGVCdXN0ZXI9XFxkKi8sICcnKTtcbiAgICByZXR1cm4gdXJsICsgKHVybC5pbmRleE9mKCc/JykgPj0gMCA/ICcmJyA6ICc/JykgKydjYWNoZUJ1c3Rlcj0nICsgZGF0ZTtcbiAgfTtcblxuICB2YXIgYnJvd3NlciA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKTtcbiAgdmFyIGZvcmNlUmVwYWludCA9IGFyLmZvcmNlUmVwYWludCB8fCBicm93c2VyLmluZGV4T2YoJ2Nocm9tZScpID4gLTE7XG5cbiAgdmFyIHJlbG9hZGVycyA9IHtcbiAgICBwYWdlOiBmdW5jdGlvbigpe1xuICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcbiAgICB9LFxuXG4gICAgc3R5bGVzaGVldDogZnVuY3Rpb24oKXtcbiAgICAgIFtdLnNsaWNlXG4gICAgICAgIC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpbmtbcmVsPXN0eWxlc2hlZXRdJykpXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIHZhciB2YWwgPSBsaW5rLmdldEF0dHJpYnV0ZSgnZGF0YS1hdXRvcmVsb2FkJyk7XG4gICAgICAgICAgcmV0dXJuIGxpbmsuaHJlZiAmJiB2YWwgIT0gJ2ZhbHNlJztcbiAgICAgICAgfSlcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIGxpbmsuaHJlZiA9IGNhY2hlQnVzdGVyKGxpbmsuaHJlZik7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBIYWNrIHRvIGZvcmNlIHBhZ2UgcmVwYWludCBhZnRlciAyNW1zLlxuICAgICAgaWYgKGZvcmNlUmVwYWludCkgc2V0VGltZW91dChmdW5jdGlvbigpIHsgZG9jdW1lbnQuYm9keS5vZmZzZXRIZWlnaHQ7IH0sIDI1KTtcbiAgICB9LFxuXG4gICAgamF2YXNjcmlwdDogZnVuY3Rpb24oKXtcbiAgICAgIHZhciBzY3JpcHRzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQnKSk7XG4gICAgICB2YXIgdGV4dFNjcmlwdHMgPSBzY3JpcHRzLm1hcChmdW5jdGlvbihzY3JpcHQpIHsgcmV0dXJuIHNjcmlwdC50ZXh0IH0pLmZpbHRlcihmdW5jdGlvbih0ZXh0KSB7IHJldHVybiB0ZXh0Lmxlbmd0aCA+IDAgfSk7XG4gICAgICB2YXIgc3JjU2NyaXB0cyA9IHNjcmlwdHMuZmlsdGVyKGZ1bmN0aW9uKHNjcmlwdCkgeyByZXR1cm4gc2NyaXB0LnNyYyB9KTtcblxuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgYWxsID0gc3JjU2NyaXB0cy5sZW5ndGg7XG4gICAgICB2YXIgb25Mb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvYWRlZCA9IGxvYWRlZCArIDE7XG4gICAgICAgIGlmIChsb2FkZWQgPT09IGFsbCkge1xuICAgICAgICAgIHRleHRTY3JpcHRzLmZvckVhY2goZnVuY3Rpb24oc2NyaXB0KSB7IGV2YWwoc2NyaXB0KTsgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3JjU2NyaXB0c1xuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzY3JpcHQpIHtcbiAgICAgICAgICB2YXIgc3JjID0gc2NyaXB0LnNyYztcbiAgICAgICAgICBzY3JpcHQucmVtb3ZlKCk7XG4gICAgICAgICAgdmFyIG5ld1NjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICAgIG5ld1NjcmlwdC5zcmMgPSBjYWNoZUJ1c3RlcihzcmMpO1xuICAgICAgICAgIG5ld1NjcmlwdC5hc3luYyA9IHRydWU7XG4gICAgICAgICAgbmV3U2NyaXB0Lm9ubG9hZCA9IG9uTG9hZDtcbiAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKG5ld1NjcmlwdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfTtcbiAgdmFyIHBvcnQgPSBhci5wb3J0IHx8IDk0ODU7XG4gIHZhciBob3N0ID0gYnIuc2VydmVyIHx8IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSB8fCAnbG9jYWxob3N0JztcblxuICB2YXIgY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgV2ViU29ja2V0KCd3czovLycgKyBob3N0ICsgJzonICsgcG9ydCk7XG4gICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCl7XG4gICAgICBpZiAoYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgICAgIHZhciBtZXNzYWdlID0gZXZlbnQuZGF0YTtcbiAgICAgIHZhciByZWxvYWRlciA9IHJlbG9hZGVyc1ttZXNzYWdlXSB8fCByZWxvYWRlcnMucGFnZTtcbiAgICAgIHJlbG9hZGVyKCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuICAgICAgaWYgKGNvbm5lY3Rpb24ucmVhZHlTdGF0ZSkgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24oKXtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNvbm5lY3QsIDEwMDApO1xuICAgIH07XG4gIH07XG4gIGNvbm5lY3QoKTtcbn0pKCk7XG4vKiBqc2hpbnQgaWdub3JlOmVuZCAqL1xuIl19