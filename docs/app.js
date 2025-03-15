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
var _Map = require("../world/Map");
var _SpriteSheet = require("../sprite/SpriteSheet");
var _SpriteBoard = require("../sprite/SpriteBoard");
var _Controller = require("../ui/Controller");
var _MapEditor = require("../ui/MapEditor");
var _Entity = require("../model/Entity");
var _Camera = require("../sprite/Camera");
var _Controller2 = require("../model/Controller");
var _Sprite = require("../sprite/Sprite");
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
    _this.map = new _Map.Map({
      spriteSheet: _this.spriteSheet,
      src: './map.json'
    });
    _this.map["import"]();
    _this.args.mapEditor = new _MapEditor.MapEditor({
      spriteSheet: _this.spriteSheet,
      map: _this.map
    });
    return _this;
  }
  _inherits(View, _BaseView);
  return _createClass(View, [{
    key: "onRendered",
    value: function onRendered() {
      var _this2 = this;
      var spriteBoard = new _SpriteBoard.SpriteBoard(this.tags.canvas.element, this.map);
      this.spriteBoard = spriteBoard;
      var entity = new _Entity.Entity({
        sprite: new _Sprite.Sprite({
          // x: 816,
          // y: -72,
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
      setInterval(function () {
        simulate(performance.now());
      }, 0);
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
      var zoomLevel = this.spriteBoard.gl2d.zoomLevel + delta * step;
      if (zoomLevel < min) {
        zoomLevel = min;
      } else if (zoomLevel > max) {
        zoomLevel = max;
      }

      // zoomLevel = Number(zoomLevel.toFixed(2));

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

require.register("model/Controller.js", function(exports, require, module) {
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
        console.log(t);
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

;require.register("sprite/Background.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Background = void 0;
var _Bindable = require("curvature/base/Bindable");
var _SpriteSheet = require("./SpriteSheet");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Background = exports.Background = /*#__PURE__*/function () {
  function Background(spriteBoard, map) {
    var _this = this;
    _classCallCheck(this, Background);
    this[_Bindable.Bindable.Prevent] = true;
    this.spriteBoard = spriteBoard;
    this.spriteSheet = new _SpriteSheet.SpriteSheet();
    this.map = map;
    this.width = 32;
    this.height = 32;
    this.xOffset = 0;
    this.yOffset = 0;
    var gl = this.spriteBoard.gl2d.context;
    this.tileMapping = this.spriteBoard.gl2d.createTexture(1, 1);
    this.tileTexture = this.spriteBoard.gl2d.createTexture(1, 1);
    var r = function r() {
      return parseInt(Math.random() * 255);
    };
    var pixel = new Uint8Array([r(), r(), r(), 255]);
    map.ready.then(function () {
      gl.bindTexture(gl.TEXTURE_2D, _this.tileTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, map.tileSetWidth, map.tileSetHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, map.pixels);
    });
  }
  return _createClass(Background, [{
    key: "negSafeMod",
    value: function negSafeMod(a, b) {
      if (a >= 0) return a % b;
      return (b + a % b) % b;
    }
  }, {
    key: "draw",
    value: function draw() {
      var gl = this.spriteBoard.gl2d.context;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
      this.spriteBoard.drawProgram.uniformI('u_background', 1);
      this.spriteBoard.drawProgram.uniformF('u_size', this.width, this.height);
      this.spriteBoard.drawProgram.uniformF('u_tileSize', 32, 32);
      this.spriteBoard.drawProgram.uniformF('u_mapTextureSize', this.map.tileSetWidth, this.map.tileSetHeight);
      var xOffset = Math.floor(Math.floor(0.5 * this.width / 64) + 0) * 64;
      var yOffset = Math.floor(Math.floor(0.5 * this.height / 64) + 0) * 64;
      var zoom = this.spriteBoard.gl2d.zoomLevel;
      var x = this.spriteBoard.following.sprite.x;
      var y = this.spriteBoard.following.sprite.y;
      var xPos = this.width * zoom * 0.5 + -this.negSafeMod(x + 16, 64) * zoom + -xOffset * zoom + this.xOffset * zoom * 0.5;
      var yPos = this.height * zoom * 0.5 + -this.negSafeMod(y + 16, 64) * zoom + -yOffset * zoom + this.yOffset * zoom * 0.5;
      var tilesWide = Math.floor(this.width / 32);
      var tilesHigh = Math.floor(this.height / 32);
      var tileCount = tilesWide * tilesHigh;
      var tileValues = new Uint32Array(tileCount);
      var tilePixels = new Uint8Array(tileValues.buffer);
      for (var k in tileValues) {
        var kX = k % tilesWide * 32 + -this.negSafeMod(x + 16, 64) + x + -16 + -this.width / 2;
        var kY = (-1 + tilesHigh - Math.floor(k / tilesWide)) * 32 + -this.negSafeMod(y + 16, 64) + y + -16 + -this.height / 2;
        if (kX < 0 || kY < 0) {
          tileValues[k] = 2;
          // tileValues[k] = (Math.floor(k/4) % 2 && Math.random() > 0.5 ) ? 2 : 1;
        } else {
          tileValues[k] = 1;
        }
      }
      this.spriteBoard.drawProgram.uniformF('u_tileCount', tileCount);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.tileMapping);
      this.spriteBoard.drawProgram.uniformI('u_tileMapping', 2);

      // Put the effectLayer in tex1
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
      this.spriteBoard.drawProgram.uniformI('u_tiles', 3);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tileMapping);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tilesWide, tilesHigh, 0, gl.RGBA, gl.UNSIGNED_BYTE, tilePixels);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
      this.setRectangle(xPos, yPos, this.width * zoom, this.height * zoom);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.spriteBoard.drawProgram.uniformI('u_background', 0);
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
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
      var x1 = x;
      var x2 = x + width;
      var y1 = y;
      var y2 = y + height;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y2, x2, y2, x1, y1, x1, y1, x2, y2, x2, y1]), gl.STATIC_DRAW);
    }
  }]);
}();
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

;require.register("sprite/Sprite.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Sprite = void 0;
var _Bindable = require("curvature/base/Bindable");
var _Camera = require("./Camera");
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
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
      this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);
      var zoom = this.spriteBoard.gl2d.zoomLevel;
      this.setRectangle(this.x * zoom + -_Camera.Camera.x + _Camera.Camera.width * zoom / 2, this.y * zoom + -_Camera.Camera.y + _Camera.Camera.height * zoom / 2 + -this.height * zoom, this.width * zoom, this.height * zoom);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.uniform4f.apply(gl, [this.spriteBoard.regionLocation].concat(_toConsumableArray(Object.assign(this.region || [0, 0, 0], {
        3: 1
      }))));
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.effectBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.uniform4f(this.spriteBoard.regionLocation, 0, 0, 0, 0);
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
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
      var x1 = x;
      var y1 = y + 32 * zoom;
      var x2 = x + width;
      var y2 = y + height + 32 * zoom;
      var points = new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]);
      var xOff = x + width / 2;
      var yOff = y + height / 2;
      var theta = performance.now() / 1000 % (2 * Math.PI);
      var t = this.matrixTransform(points, this.matrixComposite(this.matrixTranslate(xOff, yOff)
      // , this.matrixScale(Math.sin(theta), Math.cos(theta))
      // , this.matrixRotate(theta)
      , this.matrixTranslate(-xOff, -yOff)));
      gl.bufferData(gl.ARRAY_BUFFER, t, gl.STREAM_DRAW);
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
var _Background = require("./Background");
var _Gl2d = require("../gl2d/Gl2d");
var _Camera = require("./Camera");
var _Sprite = require("./Sprite");
var _Bindable = require("curvature/base/Bindable");
var _SpriteSheet = require("./SpriteSheet");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var SpriteBoard = exports.SpriteBoard = /*#__PURE__*/function () {
  function SpriteBoard(element, map) {
    var _this = this;
    _classCallCheck(this, SpriteBoard);
    this[_Bindable.Bindable.Prevent] = true;
    this.map = map;
    this.sprites = new _Bag.Bag();
    this.mouse = {
      x: null,
      y: null,
      clickX: null,
      clickY: null
    };
    _Camera.Camera.width = element.width;
    _Camera.Camera.height = element.height;
    this.gl2d = new _Gl2d.Gl2d(element);
    this.gl2d.enableBlending();
    var attributes = ['a_position', 'a_texCoord'];
    var uniforms = ['u_image', 'u_effect', 'u_tiles', 'u_tileMapping', 'u_resolution', 'u_ripple', 'u_size', 'u_tileSize', 'u_tileCount', 'u_region', 'u_background', 'u_mapTextureSize', 'u_renderMode'];
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
    var w = 1280;
    var spriteSheet = new _SpriteSheet.SpriteSheet();
    for (var i in Array(16).fill()) {
      var barrel = new _Sprite.Sprite({
        src: 'barrel.png',
        spriteBoard: this,
        spriteSheet: spriteSheet
      });
      barrel.x = 32 + i * 64 % w;
      barrel.y = Math.trunc(i * 32 / w) * 32;
      this.sprites.add(barrel);
    }
    this.sprites.add(this.background);
    this.following = null;
  }
  return _createClass(SpriteBoard, [{
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
      if (this.following) {
        _Camera.Camera.x = (16 + this.following.sprite.x) * this.gl2d.zoomLevel || 0;
        _Camera.Camera.y = (16 + this.following.sprite.y) * this.gl2d.zoomLevel || 0;
      }
      var gl = this.gl2d.context;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectBuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawProgram.uniformI('u_renderMode', this.renderMode);
      this.drawProgram.uniformF('u_resolution', gl.canvas.width, gl.canvas.height);
      this.drawProgram.uniformF('u_size', _Camera.Camera.width, _Camera.Camera.height);
      this.drawProgram.uniformF('u_scale', this.gl2d.zoomLevel, this.gl2d.zoomLevel);
      this.drawProgram.uniformF('u_region', 0, 0, 0, 0);
      this.drawProgram.uniformF('u_ripple', Math.PI / 8, performance.now() / 200 // + -Camera.y
      , 1);
      var sprites = this.sprites.items();
      sprites.forEach(function (s) {
        return s.z = s instanceof _Background.Background ? -1 : s.y;
      });
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
        return s.draw();
      });

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
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      var gl = this.gl2d.context;
      width = width || this.gl2d.element.width;
      height = height || this.gl2d.element.height;
      _Camera.Camera.x *= this.gl2d.zoomLevel;
      _Camera.Camera.y *= this.gl2d.zoomLevel;
      _Camera.Camera.width = width / this.gl2d.zoomLevel;
      _Camera.Camera.height = height / this.gl2d.zoomLevel;
      this.background.resize(_Camera.Camera.width, _Camera.Camera.height);
      gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _Camera.Camera.width * this.gl2d.zoomLevel, _Camera.Camera.height * this.gl2d.zoomLevel, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _Camera.Camera.width * this.gl2d.zoomLevel, _Camera.Camera.height * this.gl2d.zoomLevel, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
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

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tileset = void 0;
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
var Tileset = exports.Tileset = /*#__PURE__*/_createClass(function Tileset(_ref) {
  var _this = this;
  var columns = _ref.columns,
    firstgid = _ref.firstgid,
    image = _ref.image,
    imageheight = _ref.imageheight,
    imagewidth = _ref.imagewidth,
    margin = _ref.margin,
    name = _ref.name,
    spacing = _ref.spacing,
    tilecount = _ref.tilecount,
    tileheight = _ref.tileheight,
    tilewidth = _ref.tilewidth;
  _classCallCheck(this, Tileset);
  this.image = new Image();
  this.ready = new Promise(function (accept) {
    return _this.image.onload = function () {
      return accept();
    };
  });
  this.image.src = image;
  this.columns = columns;
  this.firstGid = firstgid;
  this.imageWidth = imagewidth;
  this.imageHeight = imageheight;
  this.margin = margin;
  this.name = name;
  this.spacing = spacing;
  this.tileCount = tilecount;
  this.tileHeight = tileheight;
  this.tileWidth = tilewidth;
});
});

;require.register("sprite/texture.frag", function(exports, require, module) {
module.exports = "// texture.frag\n#define M_PI 3.1415926535897932384626433832795\n#define M_TAU M_PI / 2.0\nprecision mediump float;\n\nuniform vec3 u_ripple;\nuniform vec2 u_size;\nuniform vec2 u_tileSize;\nuniform vec4 u_region;\nuniform int u_background;\nuniform vec2 u_mapTextureSize;\n\nuniform sampler2D u_image;\nuniform sampler2D u_effect;\nuniform sampler2D u_tiles;\nuniform sampler2D u_tileMapping;\n\nvarying vec2 v_texCoord;\nvarying vec2 v_position;\n\nfloat masked = 0.0;\nfloat sorted = 1.0;\nfloat displace = 1.0;\nfloat blur = 1.0;\n\nuniform int u_renderMode;\n\nvec2 rippleX(vec2 texCoord, float a, float b, float c) {\n  vec2 rippled = vec2(\n    v_texCoord.x + sin(v_texCoord.y * (a * u_size.y) + b) * c / u_size.x,\n    v_texCoord.y\n  );\n\n  if (rippled.x < 0.0) {\n    rippled.x = abs(rippled.x);\n  }\n  else if (rippled.x > u_size.x) {\n    rippled.x = u_size.x - (rippled.x - u_size.x);\n  }\n\n  return rippled;\n}\n\nvec2 rippleY(vec2 texCoord, float a, float b, float c) {\n  vec2 rippled = vec2(v_texCoord.x, v_texCoord.y + sin(v_texCoord.x * (a * u_size.x) + b) * c / u_size.y);\n\n  if (rippled.y < 0.0) {\n    rippled.x = abs(rippled.x);\n  }\n  else if (rippled.y > u_size.y) {\n    rippled.y = u_size.y - (rippled.y - u_size.y);\n  }\n\n  return rippled;\n}\n\nvec4 motionBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {\n  vec4 originalColor = texture2D(image, textCoord);\n  vec4 dispColor = originalColor;\n\n  const float max = 10.0;\n  float weight = 0.85;\n\n  for (float i = 0.0; i < max; i += 1.0) {\n    if(i > abs(magnitude) || originalColor.a < 1.0) {\n      break;\n    }\n    vec4 dispColorDown = texture2D(image, textCoord + vec2(\n      cos(angle) * i * sign(magnitude) / u_size.x,\n      sin(angle) * i * sign(magnitude) / u_size.y\n    ));\n    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight;\n    weight *= 0.8;\n  }\n\n  return dispColor;\n}\n\nvec4 linearBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {\n  vec4 originalColor = texture2D(image, textCoord);\n  vec4 dispColor = texture2D(image, textCoord);\n\n  const float max = 10.0;\n  float weight = 0.65;\n\n  for (float i = 0.0; i < max; i += 0.25) {\n    if(i > abs(magnitude)) {\n      break;\n    }\n    vec4 dispColorUp = texture2D(image, textCoord + vec2(\n      cos(angle) * -i * sign(magnitude) / u_size.x,\n      sin(angle) * -i * sign(magnitude) / u_size.y\n    ));\n    vec4 dispColorDown = texture2D(image, textCoord + vec2(\n      cos(angle) * i * sign(magnitude) / u_size.x,\n      sin(angle) * i * sign(magnitude) / u_size.y\n    ));\n    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight * 0.5 + dispColorUp * weight * 0.5;\n    weight *= 0.70;\n  }\n\n  return dispColor;\n}\n\nvoid main() {\n  if (u_background == 1) {\n    float xTiles = floor(u_size.x / u_tileSize.x);\n    float yTiles = floor(u_size.y / u_tileSize.y);\n\n    float inv_xTiles = 1.0 / xTiles;\n    float inv_yTiles = 1.0 / yTiles;\n\n    float xTiless = (u_size.x / u_tileSize.x);\n    float yTiless = (u_size.y / u_tileSize.y);\n\n    float inv_xTiless = 1.0 / xTiless;\n    float inv_yTiless = 1.0 / yTiless;\n\n    float xT = (v_texCoord.x * u_size.x) / u_tileSize.x;\n    float yT = (v_texCoord.y * u_size.y) / u_tileSize.y;\n\n    float xTile = floor(xT) * inv_xTiles;\n    float yTile = floor(yT) * inv_yTiles;\n\n    float xOff = (xT * inv_xTiles - xTile) * xTiles;\n    float yOff = (yT * inv_yTiles - yTile) * yTiles;\n\n    if (u_renderMode == 1) {\n      gl_FragColor = vec4(\n        xTile\n        , yTile\n        , 0\n        , 1.0\n      );\n      return;\n    }\n\n    if (u_renderMode == 2) {\n      gl_FragColor = vec4(\n        xTile\n        , yTile\n        , xOff / 2.0 + yOff / 2.0\n        , 1.0\n      );\n      return;\n    }\n\n    // vec4 tile = texture2D(u_tileMapping, vec2(xTile * inv_yTiless + yTile, 0.0));\n    // vec4 tile = texture2D(u_tileMapping, vec2(xTile, yTile));\n    vec4 tile = texture2D(u_tileMapping, v_texCoord);\n\n    if (u_renderMode == 3) {\n      gl_FragColor = tile;\n      gl_FragColor.b = 0.5;\n      gl_FragColor.a = 1.0;\n      return;\n    }\n\n    float lo = tile.r * 256.0;\n    float hi = tile.g * (256.0 * 256.0);\n    float tileNumber = lo + hi;\n\n    if (u_renderMode == 4) {\n      gl_FragColor = vec4(\n        xTile * inv_yTiless + yTile\n        , xTile * inv_yTiless + yTile\n        , xTile * inv_yTiless + yTile\n        , 1.0\n      );\n      return;\n    }\n\n    if (u_renderMode == 5) {\n      gl_FragColor = vec4(\n        mod(tileNumber, 256.0) / 256.0\n        , mod(tileNumber, 256.0) / 256.0\n        , mod(tileNumber, 256.0) / 256.0\n        , 1.0\n      );\n      return;\n    }\n\n    float xWrap = (u_mapTextureSize.x / u_tileSize.x);\n    float yWrap = (u_mapTextureSize.y / u_tileSize.y);\n\n    float tileX = floor(mod(tileNumber, xWrap));\n    float tileY = floor(tileNumber / xWrap);\n\n    gl_FragColor = texture2D(u_tiles, vec2(\n      xOff / xWrap + tileX * (u_tileSize.y / u_mapTextureSize.y)\n      , yOff / yWrap + tileY * (u_tileSize.y / u_mapTextureSize.y)\n    ));\n\n\n    gl_FragColor = texture2D(u_tiles, vec2(\n      xOff / xWrap + tileX * (u_tileSize.y / u_mapTextureSize.y)\n      , yOff / yWrap + tileY * (u_tileSize.y / u_mapTextureSize.y)\n    ));\n\n    return;\n  }\n\n  vec4 originalColor = texture2D(u_image,  v_texCoord);\n  vec4 effectColor   = texture2D(u_effect, v_texCoord);\n\n  // This if/else block only applies\n  // when we're drawing the effectBuffer\n  if (u_region.r > 0.0 || u_region.g > 0.0 || u_region.b > 0.0) {\n    if (masked < 1.0 || originalColor.a > 0.0) {\n      gl_FragColor = u_region;\n    }\n    return;\n  }\n  else if (u_region.a > 0.0) {\n    if (sorted > 0.0) {\n      gl_FragColor = vec4(0, 0, 0, originalColor.a > 0.0 ? 1.0 : 0.0);\n    }\n    else {\n      gl_FragColor = vec4(0, 0, 0, 0.0);\n    }\n    return;\n  };\n\n  // This if/else block only applies\n  // when we're drawing the drawBuffer\n  if (effectColor == vec4(0, 1, 1, 1)) { // Water region\n    vec2 texCoord = v_texCoord;\n    vec4 v_blurredColor = originalColor;\n    if (displace > 0.0) {\n      texCoord = rippleX(v_texCoord, u_ripple.x, u_ripple.y, u_ripple.z);\n      v_blurredColor = texture2D(u_image, texCoord);\n    }\n    if (blur > 0.0) {\n      v_blurredColor = linearBlur(u_image, 0.0, 1.0, texCoord);\n    }\n    gl_FragColor = v_blurredColor * 0.65 + effectColor * 0.35;\n  }\n  else if (effectColor == vec4(1, 0, 0, 1)) { // Fire region\n    vec2 v_displacement = rippleY(v_texCoord, u_ripple.x * 2.0, u_ripple.y * 1.5, u_ripple.z * 0.1);\n    vec4 v_blurredColor = originalColor;\n    if (displace > 0.0) {\n      v_blurredColor = texture2D(u_image, v_displacement);\n    }\n    if (blur > 0.0) {\n      v_blurredColor = motionBlur(u_image, -M_TAU, 1.0, v_displacement);\n    }\n    gl_FragColor = v_blurredColor * 0.75 + effectColor * 0.25;\n  }\n  else { // Null region\n    gl_FragColor = originalColor;\n  }\n}\n"
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

;require.register("world/Map.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Map = void 0;
var _Bindable = require("curvature/base/Bindable");
var _Tileset = require("../sprite/Tileset");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Map = exports.Map = /*#__PURE__*/function () {
  function Map(_ref) {
    var _this = this;
    var src = _ref.src,
      spriteSheet = _ref.spriteSheet;
    _classCallCheck(this, Map);
    this[_Bindable.Bindable.Prevent] = true;
    this.spriteSheet = spriteSheet;
    this.image = document.createElement("img");
    this.pixels = [];
    this.tileCount = 0;
    this.tileSetWidth = 1;
    this.tileSetHeight = 1;
    var loader = fetch(src).then(function (response) {
      return response.json();
    }).then(function (mapData) {
      var tilesets = mapData.tilesets && mapData.tilesets.map(function (t) {
        return new _Tileset.Tileset(t);
      });
      return Promise.all(tilesets.map(function (t) {
        return t.ready;
      })).then(function () {
        return tilesets;
      });
    }).then(function (tilesets) {
      _this.assemble(tilesets);
    });
    this.ready = loader;
  }
  return _createClass(Map, [{
    key: "assemble",
    value: function assemble(tilesets) {
      var _this2 = this;
      tilesets.sort(function (a, b) {
        return a.firstGid - b.firstGid;
      });
      var tileTotal = this.tileCount = tilesets.reduce(function (a, b) {
        return a.tileCount + b.tileCount;
      }, {
        tileCount: 0
      });
      var size = Math.ceil(Math.sqrt(tileTotal));
      console.log(tileTotal, size, tilesets);
      var destination = document.createElement('canvas');
      this.tileSetWidth = destination.width = size * 32;
      this.tileSetHeight = destination.height = Math.ceil(tileTotal / size) * 32;
      var ctxDestination = destination.getContext('2d');
      var xDestination = 0;
      var yDestination = 0;
      var _iterator = _createForOfIteratorHelper(tilesets),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var tileset = _step.value;
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
            var tile = ctxSource.getImageData(xSource, ySource, 32, 32);
            ctxDestination.putImageData(tile, xDestination, yDestination);
            xSource += 32;
            xDestination += 32;
            if (xSource >= tileset.imageWidth) {
              xSource = 0;
              ySource += 32;
            }
            if (xDestination >= destination.width) {
              xDestination = 0;
              yDestination += 32;
            }
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      this.pixels = ctxDestination.getImageData(0, 0, destination.width, destination.height).data;
      destination.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        _this2.image.onload = function () {
          return URL.revokeObjectURL(url);
        };
        _this2.image.src = url;
      });
      console.log(destination.toDataURL());
    }
  }, {
    key: "getTile",
    value: function getTile(x, y) {
      var layer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      if (this.tiles["".concat(x, ",").concat(y, "--").concat(layer)]) {
        return [this.spriteSheet.getFrame(this.tiles["".concat(x, ",").concat(y, "--").concat(layer)])];
      }
      var split = 4;
      var second = 'rock_4.png';
      if (x % split === 0 && y % split === 0) {
        second = 'cheese.png';
      }
      if (x === -1 && y === -1) {
        return [
        // this.spriteSheet.getFrame('floorTile.png')
        this.spriteSheet.getFrame('box_face.png')];
      }
      return [this.spriteSheet.getFrame('floorTile.png')
      // this.spriteSheet.getFrame('box_face.png')
      ];
      return [this.spriteSheet.getFrame('floorTile.png'), this.spriteSheet.getFrame(second)];
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
      this.tiles = JSON.parse(input);

      // console.log(JSON.parse(input));
    }
  }]);
}(); // {"-2,11":"lava_center_middle.png","-1,11":"lava_center_middle.png","0,11":"lava_center_middle.png"}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9CYWcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL0RvbS5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9NaXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1RhZy5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9VdWlkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzIiwiYXBwL0NvbmZpZy5qcyIsImFwcC9nbDJkL0dsMmQuanMiLCJhcHAvaG9tZS9WaWV3LmpzIiwiYXBwL2hvbWUvdmlldy50bXAuaHRtbCIsImFwcC9pbml0aWFsaXplLmpzIiwiYXBwL2luamVjdC9Db250YWluZXIuanMiLCJhcHAvaW5qZWN0L0luamVjdGFibGUuanMiLCJhcHAvaW5qZWN0L1NpbmdsZS5qcyIsImFwcC9tb2RlbC9Db250cm9sbGVyLmpzIiwiYXBwL21vZGVsL0VudGl0eS5qcyIsImFwcC9vdmVybGF5L292ZXJsYXkuZnJhZyIsImFwcC9vdmVybGF5L292ZXJsYXkudmVydCIsImFwcC9zcHJpdGUvQmFja2dyb3VuZC5qcyIsImFwcC9zcHJpdGUvQ2FtZXJhLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGUuanMiLCJhcHAvc3ByaXRlL1Nwcml0ZUJvYXJkLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGVTaGVldC5qcyIsImFwcC9zcHJpdGUvVGV4dHVyZUJhbmsuanMiLCJhcHAvc3ByaXRlL1RpbGVzZXQuanMiLCJhcHAvc3ByaXRlL3RleHR1cmUuZnJhZyIsImFwcC9zcHJpdGUvdGV4dHVyZS52ZXJ0IiwiYXBwL3VpL0NvbnRyb2xsZXIuanMiLCJhcHAvdWkvTWFwRWRpdG9yLmpzIiwiYXBwL3VpL2NvbnRyb2xsZXIudG1wLmh0bWwiLCJhcHAvdWkvbWFwRWRpdG9yLnRtcC5odG1sIiwiYXBwL3dvcmxkL0Zsb29yLmpzIiwiYXBwL3dvcmxkL01hcC5qcyIsIm5vZGVfbW9kdWxlcy9hdXRvLXJlbG9hZC1icnVuY2gvdmVuZG9yL2F1dG8tcmVsb2FkLmpzIl0sIm5hbWVzIjpbIkNvbmZpZyIsImV4cG9ydHMiLCJfY3JlYXRlQ2xhc3MiLCJfY2xhc3NDYWxsQ2hlY2siLCJ0aXRsZSIsIlByb2dyYW0iLCJfcmVmIiwiZ2wiLCJ2ZXJ0ZXhTaGFkZXIiLCJmcmFnbWVudFNoYWRlciIsInVuaWZvcm1zIiwiYXR0cmlidXRlcyIsIl9kZWZpbmVQcm9wZXJ0eSIsImNvbnRleHQiLCJwcm9ncmFtIiwiY3JlYXRlUHJvZ3JhbSIsImF0dGFjaFNoYWRlciIsImxpbmtQcm9ncmFtIiwiZGV0YWNoU2hhZGVyIiwiZGVsZXRlU2hhZGVyIiwiZ2V0UHJvZ3JhbVBhcmFtZXRlciIsIkxJTktfU1RBVFVTIiwiY29uc29sZSIsImVycm9yIiwiZ2V0UHJvZ3JhbUluZm9Mb2ciLCJkZWxldGVQcm9ncmFtIiwiX2l0ZXJhdG9yIiwiX2NyZWF0ZUZvck9mSXRlcmF0b3JIZWxwZXIiLCJfc3RlcCIsInMiLCJuIiwiZG9uZSIsInVuaWZvcm0iLCJ2YWx1ZSIsImxvY2F0aW9uIiwiZ2V0VW5pZm9ybUxvY2F0aW9uIiwid2FybiIsImNvbmNhdCIsImVyciIsImUiLCJmIiwiX2l0ZXJhdG9yMiIsIl9zdGVwMiIsImF0dHJpYnV0ZSIsImdldEF0dHJpYkxvY2F0aW9uIiwiYnVmZmVyIiwiY3JlYXRlQnVmZmVyIiwiYmluZEJ1ZmZlciIsIkFSUkFZX0JVRkZFUiIsImVuYWJsZVZlcnRleEF0dHJpYkFycmF5IiwidmVydGV4QXR0cmliUG9pbnRlciIsIkZMT0FUIiwiYnVmZmVycyIsImtleSIsInVzZSIsInVzZVByb2dyYW0iLCJ1bmlmb3JtRiIsIm5hbWUiLCJfbGVuIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiZmxvYXRzIiwiQXJyYXkiLCJfa2V5IiwiYXBwbHkiLCJ1bmlmb3JtSSIsIl9sZW4yIiwiaW50cyIsIl9rZXkyIiwiR2wyZCIsImVsZW1lbnQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJnZXRDb250ZXh0Iiwic2NyZWVuU2NhbGUiLCJ6b29tTGV2ZWwiLCJjcmVhdGVTaGFkZXIiLCJleHRlbnNpb24iLCJzdWJzdHJpbmciLCJsYXN0SW5kZXhPZiIsInR5cGUiLCJ0b1VwcGVyQ2FzZSIsIlZFUlRFWF9TSEFERVIiLCJGUkFHTUVOVF9TSEFERVIiLCJzaGFkZXIiLCJzb3VyY2UiLCJyZXF1aXJlIiwic2hhZGVyU291cmNlIiwiY29tcGlsZVNoYWRlciIsInN1Y2Nlc3MiLCJnZXRTaGFkZXJQYXJhbWV0ZXIiLCJDT01QSUxFX1NUQVRVUyIsImdldFNoYWRlckluZm9Mb2ciLCJfcmVmMiIsImNyZWF0ZVRleHR1cmUiLCJ3aWR0aCIsImhlaWdodCIsInRleHR1cmUiLCJiaW5kVGV4dHVyZSIsIlRFWFRVUkVfMkQiLCJ0ZXhJbWFnZTJEIiwiUkdCQSIsIlVOU0lHTkVEX0JZVEUiLCJ0ZXhQYXJhbWV0ZXJpIiwiVEVYVFVSRV9XUkFQX1MiLCJDTEFNUF9UT19FREdFIiwiVEVYVFVSRV9XUkFQX1QiLCJURVhUVVJFX01JTl9GSUxURVIiLCJORUFSRVNUIiwiVEVYVFVSRV9NQUdfRklMVEVSIiwiY3JlYXRlRnJhbWVidWZmZXIiLCJmcmFtZWJ1ZmZlciIsImJpbmRGcmFtZWJ1ZmZlciIsIkZSQU1FQlVGRkVSIiwiZnJhbWVidWZmZXJUZXh0dXJlMkQiLCJDT0xPUl9BVFRBQ0hNRU5UMCIsImVuYWJsZUJsZW5kaW5nIiwiYmxlbmRGdW5jIiwiU1JDX0FMUEhBIiwiT05FX01JTlVTX1NSQ19BTFBIQSIsImVuYWJsZSIsIkJMRU5EIiwiX1ZpZXciLCJfS2V5Ym9hcmQiLCJfQmFnIiwiX0NvbmZpZyIsIl9NYXAiLCJfU3ByaXRlU2hlZXQiLCJfU3ByaXRlQm9hcmQiLCJfQ29udHJvbGxlciIsIl9NYXBFZGl0b3IiLCJfRW50aXR5IiwiX0NhbWVyYSIsIl9Db250cm9sbGVyMiIsIl9TcHJpdGUiLCJhIiwiVHlwZUVycm9yIiwiX2RlZmluZVByb3BlcnRpZXMiLCJyIiwidCIsIm8iLCJlbnVtZXJhYmxlIiwiY29uZmlndXJhYmxlIiwid3JpdGFibGUiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsIl90b1Byb3BlcnR5S2V5IiwicHJvdG90eXBlIiwiaSIsIl90b1ByaW1pdGl2ZSIsIl90eXBlb2YiLCJTeW1ib2wiLCJ0b1ByaW1pdGl2ZSIsImNhbGwiLCJTdHJpbmciLCJOdW1iZXIiLCJfY2FsbFN1cGVyIiwiX2dldFByb3RvdHlwZU9mIiwiX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4iLCJfaXNOYXRpdmVSZWZsZWN0Q29uc3RydWN0IiwiUmVmbGVjdCIsImNvbnN0cnVjdCIsImNvbnN0cnVjdG9yIiwiX2Fzc2VydFRoaXNJbml0aWFsaXplZCIsIlJlZmVyZW5jZUVycm9yIiwiQm9vbGVhbiIsInZhbHVlT2YiLCJzZXRQcm90b3R5cGVPZiIsImdldFByb3RvdHlwZU9mIiwiYmluZCIsIl9fcHJvdG9fXyIsIl9pbmhlcml0cyIsImNyZWF0ZSIsIl9zZXRQcm90b3R5cGVPZiIsIkFwcGxpY2F0aW9uIiwib25TY3JlZW5Kb3lQYWQiLCJPblNjcmVlbkpveVBhZCIsImtleWJvYXJkIiwiS2V5Ym9hcmQiLCJnZXQiLCJWaWV3IiwiX0Jhc2VWaWV3IiwiYXJncyIsIl90aGlzIiwid2luZG93Iiwic21Qcm9maWxpbmciLCJ0ZW1wbGF0ZSIsInJvdXRlcyIsImVudGl0aWVzIiwiQmFnIiwic3BlZWQiLCJtYXhTcGVlZCIsImNvbnRyb2xsZXIiLCJmcHMiLCJzcHMiLCJjYW1YIiwiY2FtWSIsImZyYW1lTG9jayIsInNpbXVsYXRpb25Mb2NrIiwic2hvd0VkaXRvciIsImxpc3RlbmluZyIsImtleXMiLCJiaW5kVG8iLCJ2IiwiayIsImQiLCJtYXAiLCJzcHJpdGVCb2FyZCIsInVuc2VsZWN0Iiwic3ByaXRlU2hlZXQiLCJTcHJpdGVTaGVldCIsIldvcmxkTWFwIiwic3JjIiwibWFwRWRpdG9yIiwiTWFwRWRpdG9yIiwib25SZW5kZXJlZCIsIl90aGlzMiIsIlNwcml0ZUJvYXJkIiwidGFncyIsImNhbnZhcyIsImVudGl0eSIsIkVudGl0eSIsInNwcml0ZSIsIlNwcml0ZSIsInVuZGVmaW5lZCIsIkNvbnRyb2xsZXIiLCJjYW1lcmEiLCJDYW1lcmEiLCJhZGQiLCJzcHJpdGVzIiwiZm9sbG93aW5nIiwiem9vbSIsInNlbGVjdGVkIiwiZ2xvYmFsWCIsInN0YXJ0R2xvYmFsWCIsImlpIiwiaiIsInN0YXJ0R2xvYmFsWSIsImpqIiwiZ2xvYmFsWSIsInNldFRpbGUiLCJyZXNpemUiLCJwIiwibG9jYWxYIiwic2VsZWN0Iiwid2FpdCIsImFkZEV2ZW50TGlzdGVuZXIiLCJmVGhlbiIsInNUaGVuIiwiZlNhbXBsZXMiLCJzU2FtcGxlcyIsIm1heFNhbXBsZXMiLCJzaW11bGF0ZSIsIm5vdyIsImRlbHRhIiwidXBkYXRlIiwidmFsdWVzIiwiaXRlbXMiLCJfc3BzIiwicHVzaCIsInNoaWZ0IiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiZHJhdyIsInRvRml4ZWQiLCJ4IiwieSIsInBvc1giLCJwb3NZIiwiZ2wyZCIsImJvZHkiLCJjbGllbnRIZWlnaHQiLCJwZXJmb3JtYW5jZSIsInNldEludGVydmFsIiwicmVkdWNlIiwiYiIsInBhZFN0YXJ0IiwiY2xpZW50V2lkdGgiLCJyd2lkdGgiLCJNYXRoIiwidHJ1bmMiLCJyaGVpZ2h0Iiwib2xkU2NhbGUiLCJzY3JvbGwiLCJldmVudCIsImRlbHRhWSIsIm1heCIsIm1pbiIsInN0ZXAiLCJCYXNlVmlldyIsIl9Sb3V0ZXIiLCJQcm94eSIsInZpZXciLCJSb3V0ZXIiLCJsaXN0ZW4iLCJyZW5kZXIiLCJfSW5qZWN0YWJsZTIiLCJDb250YWluZXIiLCJfSW5qZWN0YWJsZSIsImluamVjdCIsImluamVjdGlvbnMiLCJhc3NpZ24iLCJJbmplY3RhYmxlIiwiY2xhc3NlcyIsIm9iamVjdHMiLCJpbmplY3Rpb24iLCJ0ZXN0IiwiaW5zdGFuY2UiLCJFcnJvciIsImV4aXN0aW5nSW5qZWN0aW9ucyIsIl9jbGFzcyIsIlNpbmdsZSIsInJhbmRvbSIsInNpbmdsZSIsIl9CaW5kYWJsZSIsIml0ZXJhdG9yIiwiQmluZGFibGUiLCJtYWtlQmluZGFibGUiLCJrZXlQcmVzcyIsImtleVJlbGVhc2UiLCJheGlzIiwicHJldiIsInRyaWdnZXJzIiwiZmlyZVJlZ2lvbiIsIndhdGVyUmVnaW9uIiwiZGlyZWN0aW9uIiwic3RhdGUiLCJyZWdpb24iLCJ4QXhpcyIsInlBeGlzIiwicmVuZGVyTW9kZSIsImxvZyIsImNlaWwiLCJmbG9vciIsImhvcml6b250YWwiLCJhYnMiLCJmcmFtZXMiLCJzZXRGcmFtZXMiLCJkZXN0cm95IiwiQmFja2dyb3VuZCIsIlByZXZlbnQiLCJ4T2Zmc2V0IiwieU9mZnNldCIsInRpbGVNYXBwaW5nIiwidGlsZVRleHR1cmUiLCJwYXJzZUludCIsInBpeGVsIiwiVWludDhBcnJheSIsInJlYWR5IiwidGhlbiIsInRpbGVTZXRXaWR0aCIsInRpbGVTZXRIZWlnaHQiLCJwaXhlbHMiLCJuZWdTYWZlTW9kIiwiZHJhd0J1ZmZlciIsImRyYXdQcm9ncmFtIiwieFBvcyIsInlQb3MiLCJ0aWxlc1dpZGUiLCJ0aWxlc0hpZ2giLCJ0aWxlQ291bnQiLCJ0aWxlVmFsdWVzIiwiVWludDMyQXJyYXkiLCJ0aWxlUGl4ZWxzIiwia1giLCJrWSIsImFjdGl2ZVRleHR1cmUiLCJURVhUVVJFMiIsIlRFWFRVUkUzIiwiVEVYVFVSRTAiLCJhX3RleENvb3JkIiwiYnVmZmVyRGF0YSIsIkZsb2F0MzJBcnJheSIsIlNUQVRJQ19EUkFXIiwic2V0UmVjdGFuZ2xlIiwiZHJhd0FycmF5cyIsIlRSSUFOR0xFUyIsImFfcG9zaXRpb24iLCJ4MSIsIngyIiwieTEiLCJ5MiIsImlzQXJyYXkiLCJfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkiLCJfbiIsIkYiLCJ1IiwibmV4dCIsIl90b0NvbnN1bWFibGVBcnJheSIsIl9hcnJheVdpdGhvdXRIb2xlcyIsIl9pdGVyYWJsZVRvQXJyYXkiLCJfbm9uSXRlcmFibGVTcHJlYWQiLCJfYXJyYXlMaWtlVG9BcnJheSIsInRvU3RyaW5nIiwic2xpY2UiLCJmcm9tIiwieiIsInNjYWxlIiwiZnJhbWVEZWxheSIsImN1cnJlbnREZWxheSIsImN1cnJlbnRGcmFtZSIsImN1cnJlbnRGcmFtZXMiLCJtb3ZpbmciLCJSSUdIVCIsIkRPV04iLCJMRUZUIiwiVVAiLCJFQVNUIiwiU09VVEgiLCJXRVNUIiwiTk9SVEgiLCJzdGFuZGluZyIsIndhbGtpbmciLCJzaGVldCIsImZyYW1lIiwiZ2V0RnJhbWUiLCJsb2FkVGV4dHVyZSIsImltYWdlIiwidW5pZm9ybTRmIiwicmVnaW9uTG9jYXRpb24iLCJlZmZlY3RCdWZmZXIiLCJmcmFtZVNlbGVjdG9yIiwiZnJhbWVzSWQiLCJqb2luIiwiZ2V0RnJhbWVzIiwiUHJvbWlzZSIsImFsbCIsInRyYW5zZm9ybSIsInBvaW50cyIsInhPZmYiLCJ5T2ZmIiwidGhldGEiLCJQSSIsIm1hdHJpeFRyYW5zZm9ybSIsIm1hdHJpeENvbXBvc2l0ZSIsIm1hdHJpeFRyYW5zbGF0ZSIsIlNUUkVBTV9EUkFXIiwibWF0cml4SWRlbnRpdHkiLCJkeCIsImR5IiwibWF0cml4U2NhbGUiLCJtYXRyaXhSb3RhdGUiLCJzaW4iLCJjIiwiY29zIiwibWF0cml4U2hlYXJYIiwibWF0cml4U2hlYXJZIiwibWF0cml4TXVsdGlwbHkiLCJtYXRBIiwibWF0QiIsIm91dHB1dCIsImZpbGwiLCJtYXRyaXgiLCJwb2ludCIsInJvdyIsImZpbHRlciIsIl8iLCJpbWFnZVNyYyIsInByb21pc2VzIiwibG9hZEltYWdlIiwiYWNjZXB0IiwicmVqZWN0IiwiSW1hZ2UiLCJfQmFja2dyb3VuZCIsIl9HbDJkIiwibW91c2UiLCJjbGlja1giLCJjbGlja1kiLCJjb2xvckxvY2F0aW9uIiwidV9jb2xvciIsInRpbGVQb3NMb2NhdGlvbiIsInVfdGlsZU5vIiwidV9yZWdpb24iLCJkcmF3TGF5ZXIiLCJlZmZlY3RMYXllciIsImNsaWVudFgiLCJjbGllbnRZIiwibG9jYWxZIiwiYmFja2dyb3VuZCIsInciLCJiYXJyZWwiLCJ2aWV3cG9ydCIsImNsZWFyQ29sb3IiLCJjbGVhciIsIkNPTE9SX0JVRkZFUl9CSVQiLCJmb3JFYWNoIiwidGltZSIsInNvcnQiLCJ0aW1lRW5kIiwiVEVYVFVSRTEiLCJpbWFnZVVybCIsImJveGVzVXJsIiwidmVydGljZXMiLCJzaGVldExvYWRlciIsImZldGNoIiwicmVzcG9uc2UiLCJqc29uIiwiYm94ZXMiLCJpbWFnZUxvYWRlciIsIm9ubG9hZCIsInByb2Nlc3NJbWFnZSIsIndpbGxSZWFkRnJlcXVlbnRseSIsImRyYXdJbWFnZSIsImZyYW1lUHJvbWlzZXMiLCJfbG9vcCIsInN1YkNhbnZhcyIsImgiLCJzdWJDb250ZXh0IiwicHV0SW1hZ2VEYXRhIiwiZ2V0SW1hZ2VEYXRhIiwidGV4dCIsImZpbGxTdHlsZSIsImNvbG9yIiwiZm9udCIsInRleHRBbGlnbiIsImZpbGxUZXh0IiwidG9CbG9iIiwiYmxvYiIsImZpbGVuYW1lIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiZ2V0VmVydGljZXMiLCJfdGhpczMiLCJnZXRGcmFtZXNCeVByZWZpeCIsInByZWZpeCIsInRleHR1cmVQcm9taXNlcyIsIlJFUEVBVCIsImltYWdlUHJvbWlzZXMiLCJUZXh0dXJlQmFuayIsIlRpbGVzZXQiLCJjb2x1bW5zIiwiZmlyc3RnaWQiLCJpbWFnZWhlaWdodCIsImltYWdld2lkdGgiLCJtYXJnaW4iLCJzcGFjaW5nIiwidGlsZWNvdW50IiwidGlsZWhlaWdodCIsInRpbGV3aWR0aCIsImZpcnN0R2lkIiwiaW1hZ2VXaWR0aCIsImltYWdlSGVpZ2h0IiwidGlsZUhlaWdodCIsInRpbGVXaWR0aCIsIl9WaWV3MiIsImRyYWdTdGFydCIsImRyYWdnaW5nIiwibW92ZVN0aWNrIiwiZHJvcFN0aWNrIiwiZHJhZ1N0aWNrIiwicG9zIiwicHJldmVudERlZmF1bHQiLCJ0b3VjaGVzIiwieHgiLCJ5eSIsImxpbWl0IiwidGlsZXMiLCJzZWxlY3RlZEdyYXBoaWMiLCJtdWx0aVNlbGVjdCIsInNlbGVjdGlvbiIsInNlbGVjdGVkSW1hZ2UiLCJzZWxlY3RHcmFwaGljIiwic2VsZWN0ZWRJbWFnZXMiLCJnZXRUaWxlIiwiRmxvb3IiLCJfVGlsZXNldCIsIk1hcCIsImxvYWRlciIsIm1hcERhdGEiLCJ0aWxlc2V0cyIsImFzc2VtYmxlIiwidGlsZVRvdGFsIiwic2l6ZSIsInNxcnQiLCJkZXN0aW5hdGlvbiIsImN0eERlc3RpbmF0aW9uIiwieERlc3RpbmF0aW9uIiwieURlc3RpbmF0aW9uIiwidGlsZXNldCIsInhTb3VyY2UiLCJ5U291cmNlIiwiY3R4U291cmNlIiwidGlsZSIsImRhdGEiLCJ1cmwiLCJyZXZva2VPYmplY3RVUkwiLCJ0b0RhdGFVUkwiLCJsYXllciIsInNwbGl0Iiwic2Vjb25kIiwiZXhwb3J0IiwiSlNPTiIsInN0cmluZ2lmeSIsImltcG9ydCIsImlucHV0IiwicGFyc2UiLCJXZWJTb2NrZXQiLCJNb3pXZWJTb2NrZXQiLCJiciIsImJydW5jaCIsImFyIiwiZGlzYWJsZWQiLCJfYXIiLCJjYWNoZUJ1c3RlciIsImRhdGUiLCJyb3VuZCIsIkRhdGUiLCJyZXBsYWNlIiwiaW5kZXhPZiIsImJyb3dzZXIiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJ0b0xvd2VyQ2FzZSIsImZvcmNlUmVwYWludCIsInJlbG9hZGVycyIsInBhZ2UiLCJyZWxvYWQiLCJzdHlsZXNoZWV0IiwicXVlcnlTZWxlY3RvckFsbCIsImxpbmsiLCJ2YWwiLCJnZXRBdHRyaWJ1dGUiLCJocmVmIiwic2V0VGltZW91dCIsIm9mZnNldEhlaWdodCIsImphdmFzY3JpcHQiLCJzY3JpcHRzIiwidGV4dFNjcmlwdHMiLCJzY3JpcHQiLCJzcmNTY3JpcHRzIiwibG9hZGVkIiwib25Mb2FkIiwiZXZhbCIsInJlbW92ZSIsIm5ld1NjcmlwdCIsImFzeW5jIiwiaGVhZCIsImFwcGVuZENoaWxkIiwicG9ydCIsImhvc3QiLCJzZXJ2ZXIiLCJob3N0bmFtZSIsImNvbm5lY3QiLCJjb25uZWN0aW9uIiwib25tZXNzYWdlIiwibWVzc2FnZSIsInJlbG9hZGVyIiwib25lcnJvciIsInJlYWR5U3RhdGUiLCJjbG9zZSIsIm9uY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUFDSCxTQUFTLENBQUM7TUFDdEMsQ0FBQyxDQUFDO0lBQ047RUFDRixDQUFDO0VBQ0QsSUFBSUksSUFBSSxHQUFHdEMsRUFBRSxDQUFDc0MsSUFBSSxJQUFJLElBQUk7RUFDMUIsSUFBSUMsSUFBSSxHQUFHekMsRUFBRSxDQUFDMEMsTUFBTSxJQUFJdmMsTUFBTSxDQUFDdEosUUFBUSxDQUFDOGxCLFFBQVEsSUFBSSxXQUFXO0VBRS9ELElBQUlDLFFBQU8sR0FBRyxTQUFWQSxPQUFPQSxDQUFBLEVBQWE7SUFDdEIsSUFBSUMsVUFBVSxHQUFHLElBQUkvQyxTQUFTLENBQUMsT0FBTyxHQUFHMkMsSUFBSSxHQUFHLEdBQUcsR0FBR0QsSUFBSSxDQUFDO0lBQzNESyxVQUFVLENBQUNDLFNBQVMsR0FBRyxVQUFTeFcsS0FBSyxFQUFDO01BQ3BDLElBQUk0VCxFQUFFLENBQUNDLFFBQVEsRUFBRTtNQUNqQixJQUFJNEMsT0FBTyxHQUFHelcsS0FBSyxDQUFDMlMsSUFBSTtNQUN4QixJQUFJK0QsUUFBUSxHQUFHaEMsU0FBUyxDQUFDK0IsT0FBTyxDQUFDLElBQUkvQixTQUFTLENBQUNDLElBQUk7TUFDbkQrQixRQUFRLENBQUMsQ0FBQztJQUNaLENBQUM7SUFDREgsVUFBVSxDQUFDSSxPQUFPLEdBQUcsWUFBVTtNQUM3QixJQUFJSixVQUFVLENBQUNLLFVBQVUsRUFBRUwsVUFBVSxDQUFDTSxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0ROLFVBQVUsQ0FBQ08sT0FBTyxHQUFHLFlBQVU7TUFDN0JqZCxNQUFNLENBQUNzYixVQUFVLENBQUNtQixRQUFPLEVBQUUsSUFBSSxDQUFDO0lBQ2xDLENBQUM7RUFDSCxDQUFDO0VBQ0RBLFFBQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxFQUFFLENBQUM7QUFDSiIsImZpbGUiOiJkb2NzL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0JhZy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQmFnID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIF9NaXhpbiA9IHJlcXVpcmUoXCIuL01peGluXCIpO1xudmFyIF9FdmVudFRhcmdldE1peGluID0gcmVxdWlyZShcIi4uL21peGluL0V2ZW50VGFyZ2V0TWl4aW5cIik7XG52YXIgdG9JZCA9IGludCA9PiBOdW1iZXIoaW50KTtcbnZhciBmcm9tSWQgPSBpZCA9PiBwYXJzZUludChpZCk7XG52YXIgTWFwcGVkID0gU3ltYm9sKCdNYXBwZWQnKTtcbnZhciBIYXMgPSBTeW1ib2woJ0hhcycpO1xudmFyIEFkZCA9IFN5bWJvbCgnQWRkJyk7XG52YXIgUmVtb3ZlID0gU3ltYm9sKCdSZW1vdmUnKTtcbnZhciBEZWxldGUgPSBTeW1ib2woJ0RlbGV0ZScpO1xuY2xhc3MgQmFnIGV4dGVuZHMgX01peGluLk1peGluLndpdGgoX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbikge1xuICBjb25zdHJ1Y3RvcihjaGFuZ2VDYWxsYmFjayA9IHVuZGVmaW5lZCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5jaGFuZ2VDYWxsYmFjayA9IGNoYW5nZUNhbGxiYWNrO1xuICAgIHRoaXMuY29udGVudCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLmxpc3QgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKFtdKTtcbiAgICB0aGlzLm1ldGEgPSBTeW1ib2woJ21ldGEnKTtcbiAgICB0aGlzLnR5cGUgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaGFzKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLmhhcyhpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbSGFzXShpdGVtKTtcbiAgfVxuICBbSGFzXShpdGVtKSB7XG4gICAgcmV0dXJuIHRoaXMuY29udGVudC5oYXMoaXRlbSk7XG4gIH1cbiAgYWRkKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLmFkZChpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbQWRkXShpdGVtKTtcbiAgfVxuICBbQWRkXShpdGVtKSB7XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCB8fCAhKGl0ZW0gaW5zdGFuY2VvZiBPYmplY3QpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgb2JqZWN0cyBtYXkgYmUgYWRkZWQgdG8gQmFncy4nKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudHlwZSAmJiAhKGl0ZW0gaW5zdGFuY2VvZiB0aGlzLnR5cGUpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRoaXMudHlwZSwgaXRlbSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9ubHkgb2JqZWN0cyBvZiB0eXBlICR7dGhpcy50eXBlfSBtYXkgYmUgYWRkZWQgdG8gdGhpcyBCYWcuYCk7XG4gICAgfVxuICAgIGl0ZW0gPSBfQmluZGFibGUuQmluZGFibGUubWFrZShpdGVtKTtcbiAgICBpZiAodGhpcy5jb250ZW50LmhhcyhpdGVtKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgYWRkaW5nID0gbmV3IEN1c3RvbUV2ZW50KCdhZGRpbmcnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KGFkZGluZykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGlkID0gdG9JZCh0aGlzLmN1cnJlbnQrKyk7XG4gICAgdGhpcy5jb250ZW50LnNldChpdGVtLCBpZCk7XG4gICAgdGhpcy5saXN0W2lkXSA9IGl0ZW07XG4gICAgaWYgKHRoaXMuY2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2soaXRlbSwgdGhpcy5tZXRhLCBCYWcuSVRFTV9BRERFRCwgaWQpO1xuICAgIH1cbiAgICB2YXIgYWRkID0gbmV3IEN1c3RvbUV2ZW50KCdhZGRlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtLFxuICAgICAgICBpZFxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChhZGQpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5zaXplO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICByZW1vdmUoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0ucmVtb3ZlKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tSZW1vdmVdKGl0ZW0pO1xuICB9XG4gIFtSZW1vdmVdKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkIHx8ICEoaXRlbSBpbnN0YW5jZW9mIE9iamVjdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBvYmplY3RzIG1heSBiZSByZW1vdmVkIGZyb20gQmFncy4nKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudHlwZSAmJiAhKGl0ZW0gaW5zdGFuY2VvZiB0aGlzLnR5cGUpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRoaXMudHlwZSwgaXRlbSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9ubHkgb2JqZWN0cyBvZiB0eXBlICR7dGhpcy50eXBlfSBtYXkgYmUgcmVtb3ZlZCBmcm9tIHRoaXMgQmFnLmApO1xuICAgIH1cbiAgICBpdGVtID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoaXRlbSk7XG4gICAgaWYgKCF0aGlzLmNvbnRlbnQuaGFzKGl0ZW0pKSB7XG4gICAgICBpZiAodGhpcy5jaGFuZ2VDYWxsYmFjaykge1xuICAgICAgICB0aGlzLmNoYW5nZUNhbGxiYWNrKGl0ZW0sIHRoaXMubWV0YSwgMCwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIHJlbW92aW5nID0gbmV3IEN1c3RvbUV2ZW50KCdyZW1vdmluZycsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQocmVtb3ZpbmcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpZCA9IHRoaXMuY29udGVudC5nZXQoaXRlbSk7XG4gICAgZGVsZXRlIHRoaXMubGlzdFtpZF07XG4gICAgdGhpcy5jb250ZW50LmRlbGV0ZShpdGVtKTtcbiAgICBpZiAodGhpcy5jaGFuZ2VDYWxsYmFjaykge1xuICAgICAgdGhpcy5jaGFuZ2VDYWxsYmFjayhpdGVtLCB0aGlzLm1ldGEsIEJhZy5JVEVNX1JFTU9WRUQsIGlkKTtcbiAgICB9XG4gICAgdmFyIHJlbW92ZSA9IG5ldyBDdXN0b21FdmVudCgncmVtb3ZlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtLFxuICAgICAgICBpZFxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChyZW1vdmUpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5zaXplO1xuICAgIHJldHVybiBpdGVtO1xuICB9XG4gIGRlbGV0ZShpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5kZWxldGUoaXRlbSk7XG4gICAgfVxuICAgIHRoaXNbRGVsZXRlXShpdGVtKTtcbiAgfVxuICBbRGVsZXRlXShpdGVtKSB7XG4gICAgdGhpcy5yZW1vdmUoaXRlbSk7XG4gIH1cbiAgbWFwKG1hcHBlciA9IHggPT4geCwgZmlsdGVyID0geCA9PiB4KSB7XG4gICAgdmFyIG1hcHBlZEl0ZW1zID0gbmV3IFdlYWtNYXAoKTtcbiAgICB2YXIgbWFwcGVkQmFnID0gbmV3IEJhZygpO1xuICAgIG1hcHBlZEJhZ1tNYXBwZWRdID0gdGhpcztcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZGVkJywgZXZlbnQgPT4ge1xuICAgICAgdmFyIGl0ZW0gPSBldmVudC5kZXRhaWwuaXRlbTtcbiAgICAgIGlmICghZmlsdGVyKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChtYXBwZWRJdGVtcy5oYXMoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIG1hcHBlZCA9IG1hcHBlcihpdGVtKTtcbiAgICAgIG1hcHBlZEl0ZW1zLnNldChpdGVtLCBtYXBwZWQpO1xuICAgICAgbWFwcGVkQmFnW0FkZF0obWFwcGVkKTtcbiAgICB9KTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3JlbW92ZWQnLCBldmVudCA9PiB7XG4gICAgICB2YXIgaXRlbSA9IGV2ZW50LmRldGFpbC5pdGVtO1xuICAgICAgaWYgKCFtYXBwZWRJdGVtcy5oYXMoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIG1hcHBlZCA9IG1hcHBlZEl0ZW1zLmdldChpdGVtKTtcbiAgICAgIG1hcHBlZEl0ZW1zLmRlbGV0ZShpdGVtKTtcbiAgICAgIG1hcHBlZEJhZ1tSZW1vdmVdKG1hcHBlZCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1hcHBlZEJhZztcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb250ZW50LnNpemU7XG4gIH1cbiAgaXRlbXMoKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jb250ZW50LmVudHJpZXMoKSkubWFwKGVudHJ5ID0+IGVudHJ5WzBdKTtcbiAgfVxufVxuZXhwb3J0cy5CYWcgPSBCYWc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmFnLCAnSVRFTV9BRERFRCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogMVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmFnLCAnSVRFTV9SRU1PVkVEJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiAtMVxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZS5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQmluZGFibGUgPSB2b2lkIDA7XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkoZSwgciwgdCkgeyByZXR1cm4gKHIgPSBfdG9Qcm9wZXJ0eUtleShyKSkgaW4gZSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCByLCB7IHZhbHVlOiB0LCBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwIH0pIDogZVtyXSA9IHQsIGU7IH1cbmZ1bmN0aW9uIF90b1Byb3BlcnR5S2V5KHQpIHsgdmFyIGkgPSBfdG9QcmltaXRpdmUodCwgXCJzdHJpbmdcIik7IHJldHVybiBcInN5bWJvbFwiID09IHR5cGVvZiBpID8gaSA6IGkgKyBcIlwiOyB9XG5mdW5jdGlvbiBfdG9QcmltaXRpdmUodCwgcikgeyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgdCB8fCAhdCkgcmV0dXJuIHQ7IHZhciBlID0gdFtTeW1ib2wudG9QcmltaXRpdmVdOyBpZiAodm9pZCAwICE9PSBlKSB7IHZhciBpID0gZS5jYWxsKHQsIHIgfHwgXCJkZWZhdWx0XCIpOyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgaSkgcmV0dXJuIGk7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJAQHRvUHJpbWl0aXZlIG11c3QgcmV0dXJuIGEgcHJpbWl0aXZlIHZhbHVlLlwiKTsgfSByZXR1cm4gKFwic3RyaW5nXCIgPT09IHIgPyBTdHJpbmcgOiBOdW1iZXIpKHQpOyB9XG52YXIgUmVmID0gU3ltYm9sKCdyZWYnKTtcbnZhciBPcmlnaW5hbCA9IFN5bWJvbCgnb3JpZ2luYWwnKTtcbnZhciBEZWNrID0gU3ltYm9sKCdkZWNrJyk7XG52YXIgQmluZGluZyA9IFN5bWJvbCgnYmluZGluZycpO1xudmFyIFN1YkJpbmRpbmcgPSBTeW1ib2woJ3N1YkJpbmRpbmcnKTtcbnZhciBCaW5kaW5nQWxsID0gU3ltYm9sKCdiaW5kaW5nQWxsJyk7XG52YXIgSXNCaW5kYWJsZSA9IFN5bWJvbCgnaXNCaW5kYWJsZScpO1xudmFyIFdyYXBwaW5nID0gU3ltYm9sKCd3cmFwcGluZycpO1xudmFyIE5hbWVzID0gU3ltYm9sKCdOYW1lcycpO1xudmFyIEV4ZWN1dGluZyA9IFN5bWJvbCgnZXhlY3V0aW5nJyk7XG52YXIgU3RhY2sgPSBTeW1ib2woJ3N0YWNrJyk7XG52YXIgT2JqU3ltYm9sID0gU3ltYm9sKCdvYmplY3QnKTtcbnZhciBXcmFwcGVkID0gU3ltYm9sKCd3cmFwcGVkJyk7XG52YXIgVW53cmFwcGVkID0gU3ltYm9sKCd1bndyYXBwZWQnKTtcbnZhciBHZXRQcm90byA9IFN5bWJvbCgnZ2V0UHJvdG8nKTtcbnZhciBPbkdldCA9IFN5bWJvbCgnb25HZXQnKTtcbnZhciBPbkFsbEdldCA9IFN5bWJvbCgnb25BbGxHZXQnKTtcbnZhciBCaW5kQ2hhaW4gPSBTeW1ib2woJ2JpbmRDaGFpbicpO1xudmFyIERlc2NyaXB0b3JzID0gU3ltYm9sKCdEZXNjcmlwdG9ycycpO1xudmFyIEJlZm9yZSA9IFN5bWJvbCgnQmVmb3JlJyk7XG52YXIgQWZ0ZXIgPSBTeW1ib2woJ0FmdGVyJyk7XG52YXIgTm9HZXR0ZXJzID0gU3ltYm9sKCdOb0dldHRlcnMnKTtcbnZhciBQcmV2ZW50ID0gU3ltYm9sKCdQcmV2ZW50Jyk7XG52YXIgVHlwZWRBcnJheSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihJbnQ4QXJyYXkpO1xudmFyIFNldEl0ZXJhdG9yID0gU2V0LnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdO1xudmFyIE1hcEl0ZXJhdG9yID0gTWFwLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdO1xudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG52YXIgaXNFeGNsdWRlZCA9IG9iamVjdCA9PiB0eXBlb2Ygd2luLk1hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTWFwIHx8IHR5cGVvZiB3aW4uU2V0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5TZXQgfHwgdHlwZW9mIHdpbi5Ob2RlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5Ob2RlIHx8IHR5cGVvZiB3aW4uV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uV2Vha01hcCB8fCB0eXBlb2Ygd2luLkxvY2F0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5Mb2NhdGlvbiB8fCB0eXBlb2Ygd2luLlN0b3JhZ2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlN0b3JhZ2UgfHwgdHlwZW9mIHdpbi5XZWFrU2V0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5XZWFrU2V0IHx8IHR5cGVvZiB3aW4uQXJyYXlCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkFycmF5QnVmZmVyIHx8IHR5cGVvZiB3aW4uUHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUHJvbWlzZSB8fCB0eXBlb2Ygd2luLkZpbGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkZpbGUgfHwgdHlwZW9mIHdpbi5FdmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uRXZlbnQgfHwgdHlwZW9mIHdpbi5DdXN0b21FdmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uQ3VzdG9tRXZlbnQgfHwgdHlwZW9mIHdpbi5HYW1lcGFkID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5HYW1lcGFkIHx8IHR5cGVvZiB3aW4uUmVzaXplT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlJlc2l6ZU9ic2VydmVyIHx8IHR5cGVvZiB3aW4uTXV0YXRpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTXV0YXRpb25PYnNlcnZlciB8fCB0eXBlb2Ygd2luLlBlcmZvcm1hbmNlT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlBlcmZvcm1hbmNlT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5JbnRlcnNlY3Rpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5JREJDdXJzb3IgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkN1cnNvciB8fCB0eXBlb2Ygd2luLklEQkN1cnNvcldpdGhWYWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCQ3Vyc29yV2l0aFZhbHVlIHx8IHR5cGVvZiB3aW4uSURCRGF0YWJhc2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkRhdGFiYXNlIHx8IHR5cGVvZiB3aW4uSURCRmFjdG9yeSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCRmFjdG9yeSB8fCB0eXBlb2Ygd2luLklEQkluZGV4ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJJbmRleCB8fCB0eXBlb2Ygd2luLklEQktleVJhbmdlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJLZXlSYW5nZSB8fCB0eXBlb2Ygd2luLklEQk9iamVjdFN0b3JlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJPYmplY3RTdG9yZSB8fCB0eXBlb2Ygd2luLklEQk9wZW5EQlJlcXVlc3QgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQk9wZW5EQlJlcXVlc3QgfHwgdHlwZW9mIHdpbi5JREJSZXF1ZXN0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJSZXF1ZXN0IHx8IHR5cGVvZiB3aW4uSURCVHJhbnNhY3Rpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQlRyYW5zYWN0aW9uIHx8IHR5cGVvZiB3aW4uSURCVmVyc2lvbkNoYW5nZUV2ZW50ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJWZXJzaW9uQ2hhbmdlRXZlbnQgfHwgdHlwZW9mIHdpbi5GaWxlU3lzdGVtRmlsZUhhbmRsZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uRmlsZVN5c3RlbUZpbGVIYW5kbGUgfHwgdHlwZW9mIHdpbi5SVENQZWVyQ29ubmVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUlRDUGVlckNvbm5lY3Rpb24gfHwgdHlwZW9mIHdpbi5TZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5TZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uIHx8IHR5cGVvZiB3aW4uV2ViR0xUZXh0dXJlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5XZWJHTFRleHR1cmU7XG5jbGFzcyBCaW5kYWJsZSB7XG4gIHN0YXRpYyBpc0JpbmRhYmxlKG9iamVjdCkge1xuICAgIGlmICghb2JqZWN0IHx8ICFvYmplY3RbSXNCaW5kYWJsZV0gfHwgIW9iamVjdFtQcmV2ZW50XSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0W0lzQmluZGFibGVdID09PSBCaW5kYWJsZTtcbiAgfVxuICBzdGF0aWMgb25EZWNrKG9iamVjdCwga2V5KSB7XG4gICAgcmV0dXJuIG9iamVjdFtEZWNrXS5nZXQoa2V5KSB8fCBmYWxzZTtcbiAgfVxuICBzdGF0aWMgcmVmKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3RbUmVmXSB8fCBvYmplY3QgfHwgZmFsc2U7XG4gIH1cbiAgc3RhdGljIG1ha2VCaW5kYWJsZShvYmplY3QpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlKG9iamVjdCk7XG4gIH1cbiAgc3RhdGljIHNodWNrKG9yaWdpbmFsLCBzZWVuKSB7XG4gICAgc2VlbiA9IHNlZW4gfHwgbmV3IE1hcCgpO1xuICAgIHZhciBjbG9uZSA9IE9iamVjdC5jcmVhdGUoe30pO1xuICAgIGlmIChvcmlnaW5hbCBpbnN0YW5jZW9mIFR5cGVkQXJyYXkgfHwgb3JpZ2luYWwgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgdmFyIF9jbG9uZSA9IG9yaWdpbmFsLnNsaWNlKDApO1xuICAgICAgc2Vlbi5zZXQob3JpZ2luYWwsIF9jbG9uZSk7XG4gICAgICByZXR1cm4gX2Nsb25lO1xuICAgIH1cbiAgICB2YXIgcHJvcGVydGllcyA9IE9iamVjdC5rZXlzKG9yaWdpbmFsKTtcbiAgICBmb3IgKHZhciBpIGluIHByb3BlcnRpZXMpIHtcbiAgICAgIHZhciBpaSA9IHByb3BlcnRpZXNbaV07XG4gICAgICBpZiAoaWkuc3Vic3RyaW5nKDAsIDMpID09PSAnX19fJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBhbHJlYWR5Q2xvbmVkID0gc2Vlbi5nZXQob3JpZ2luYWxbaWldKTtcbiAgICAgIGlmIChhbHJlYWR5Q2xvbmVkKSB7XG4gICAgICAgIGNsb25lW2lpXSA9IGFscmVhZHlDbG9uZWQ7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9yaWdpbmFsW2lpXSA9PT0gb3JpZ2luYWwpIHtcbiAgICAgICAgc2Vlbi5zZXQob3JpZ2luYWxbaWldLCBjbG9uZSk7XG4gICAgICAgIGNsb25lW2lpXSA9IGNsb25lO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcmlnaW5hbFtpaV0gJiYgdHlwZW9mIG9yaWdpbmFsW2lpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFyIG9yaWdpbmFsUHJvcCA9IG9yaWdpbmFsW2lpXTtcbiAgICAgICAgaWYgKEJpbmRhYmxlLmlzQmluZGFibGUob3JpZ2luYWxbaWldKSkge1xuICAgICAgICAgIG9yaWdpbmFsUHJvcCA9IG9yaWdpbmFsW2lpXVtPcmlnaW5hbF07XG4gICAgICAgIH1cbiAgICAgICAgY2xvbmVbaWldID0gdGhpcy5zaHVjayhvcmlnaW5hbFByb3AsIHNlZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xvbmVbaWldID0gb3JpZ2luYWxbaWldO1xuICAgICAgfVxuICAgICAgc2Vlbi5zZXQob3JpZ2luYWxbaWldLCBjbG9uZVtpaV0pO1xuICAgIH1cbiAgICBpZiAoQmluZGFibGUuaXNCaW5kYWJsZShvcmlnaW5hbCkpIHtcbiAgICAgIGRlbGV0ZSBjbG9uZS5iaW5kVG87XG4gICAgICBkZWxldGUgY2xvbmUuaXNCb3VuZDtcbiAgICB9XG4gICAgcmV0dXJuIGNsb25lO1xuICB9XG4gIHN0YXRpYyBtYWtlKG9iamVjdCkge1xuICAgIGlmIChvYmplY3RbUHJldmVudF0pIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmICghb2JqZWN0IHx8ICFbJ2Z1bmN0aW9uJywgJ29iamVjdCddLmluY2x1ZGVzKHR5cGVvZiBvYmplY3QpKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoUmVmIGluIG9iamVjdCkge1xuICAgICAgcmV0dXJuIG9iamVjdFtSZWZdO1xuICAgIH1cbiAgICBpZiAob2JqZWN0W0lzQmluZGFibGVdKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoT2JqZWN0LmlzU2VhbGVkKG9iamVjdCkgfHwgT2JqZWN0LmlzRnJvemVuKG9iamVjdCkgfHwgIU9iamVjdC5pc0V4dGVuc2libGUob2JqZWN0KSB8fCBpc0V4Y2x1ZGVkKG9iamVjdCkpIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIElzQmluZGFibGUsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBCaW5kYWJsZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFJlZiwge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiBmYWxzZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIE9yaWdpbmFsLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogb2JqZWN0XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgRGVjaywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJpbmRpbmcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgU3ViQmluZGluZywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJpbmRpbmdBbGwsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBFeGVjdXRpbmcsIHtcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBXcmFwcGluZywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFN0YWNrLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCZWZvcmUsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBBZnRlciwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFdyYXBwZWQsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobmV3IE1hcCgpKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFVud3JhcHBlZCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhuZXcgTWFwKCkpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgRGVzY3JpcHRvcnMsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobmV3IE1hcCgpKVxuICAgIH0pO1xuICAgIHZhciBiaW5kVG8gPSAocHJvcGVydHksIGNhbGxiYWNrID0gbnVsbCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgICB2YXIgYmluZFRvQWxsID0gZmFsc2U7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwcm9wZXJ0eSkpIHtcbiAgICAgICAgdmFyIGRlYmluZGVycyA9IHByb3BlcnR5Lm1hcChwID0+IGJpbmRUbyhwLCBjYWxsYmFjaywgb3B0aW9ucykpO1xuICAgICAgICByZXR1cm4gKCkgPT4gZGViaW5kZXJzLmZvckVhY2goZCA9PiBkKCkpO1xuICAgICAgfVxuICAgICAgaWYgKHByb3BlcnR5IGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrIHx8IHt9O1xuICAgICAgICBjYWxsYmFjayA9IHByb3BlcnR5O1xuICAgICAgICBiaW5kVG9BbGwgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuZGVsYXkgPj0gMCkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcERlbGF5Q2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMuZGVsYXkpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMudGhyb3R0bGUgPj0gMCkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcFRocm90dGxlQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMudGhyb3R0bGUpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMud2FpdCA+PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwV2FpdENhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLndhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuZnJhbWUpIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBGcmFtZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLmZyYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmlkbGUpIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBJZGxlQ2FsbGJhY2soY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGJpbmRUb0FsbCkge1xuICAgICAgICBvYmplY3RbQmluZGluZ0FsbF0uYWRkKGNhbGxiYWNrKTtcbiAgICAgICAgaWYgKCEoJ25vdycgaW4gb3B0aW9ucykgfHwgb3B0aW9ucy5ub3cpIHtcbiAgICAgICAgICBmb3IgKHZhciBpIGluIG9iamVjdCkge1xuICAgICAgICAgICAgY2FsbGJhY2sob2JqZWN0W2ldLCBpLCBvYmplY3QsIGZhbHNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICBvYmplY3RbQmluZGluZ0FsbF0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmICghb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XSkge1xuICAgICAgICBvYmplY3RbQmluZGluZ11bcHJvcGVydHldID0gbmV3IFNldCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBsZXQgYmluZEluZGV4ID0gb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5sZW5ndGg7XG5cbiAgICAgIGlmIChvcHRpb25zLmNoaWxkcmVuKSB7XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IGNhbGxiYWNrO1xuICAgICAgICBjYWxsYmFjayA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgdmFyIHYgPSBhcmdzWzBdO1xuICAgICAgICAgIHZhciBzdWJEZWJpbmQgPSBvYmplY3RbU3ViQmluZGluZ10uZ2V0KG9yaWdpbmFsKTtcbiAgICAgICAgICBpZiAoc3ViRGViaW5kKSB7XG4gICAgICAgICAgICBvYmplY3RbU3ViQmluZGluZ10uZGVsZXRlKG9yaWdpbmFsKTtcbiAgICAgICAgICAgIHN1YkRlYmluZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBvcmlnaW5hbCguLi5hcmdzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHZ2ID0gQmluZGFibGUubWFrZSh2KTtcbiAgICAgICAgICBpZiAoQmluZGFibGUuaXNCaW5kYWJsZSh2dikpIHtcbiAgICAgICAgICAgIG9iamVjdFtTdWJCaW5kaW5nXS5zZXQob3JpZ2luYWwsIHZ2LmJpbmRUbygoLi4uc3ViQXJncykgPT4gb3JpZ2luYWwoLi4uYXJncywgLi4uc3ViQXJncyksIE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgY2hpbGRyZW46IGZhbHNlXG4gICAgICAgICAgICB9KSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvcmlnaW5hbCguLi5hcmdzKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0uYWRkKGNhbGxiYWNrKTtcbiAgICAgIGlmICghKCdub3cnIGluIG9wdGlvbnMpIHx8IG9wdGlvbnMubm93KSB7XG4gICAgICAgIGNhbGxiYWNrKG9iamVjdFtwcm9wZXJ0eV0sIHByb3BlcnR5LCBvYmplY3QsIGZhbHNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBkZWJpbmRlciA9ICgpID0+IHtcbiAgICAgICAgdmFyIHN1YkRlYmluZCA9IG9iamVjdFtTdWJCaW5kaW5nXS5nZXQoY2FsbGJhY2spO1xuICAgICAgICBpZiAoc3ViRGViaW5kKSB7XG4gICAgICAgICAgb2JqZWN0W1N1YkJpbmRpbmddLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgICAgc3ViRGViaW5kKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvYmplY3RbQmluZGluZ11bcHJvcGVydHldKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5oYXMoY2FsbGJhY2spKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgIH07XG4gICAgICBpZiAob3B0aW9ucy5yZW1vdmVXaXRoICYmIG9wdGlvbnMucmVtb3ZlV2l0aCBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgICAgb3B0aW9ucy5yZW1vdmVXaXRoLm9uUmVtb3ZlKCgpID0+IGRlYmluZGVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWJpbmRlcjtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdiaW5kVG8nLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogYmluZFRvXG4gICAgfSk7XG4gICAgdmFyIF9fX2JlZm9yZSA9IGNhbGxiYWNrID0+IHtcbiAgICAgIG9iamVjdFtCZWZvcmVdLmFkZChjYWxsYmFjayk7XG4gICAgICByZXR1cm4gKCkgPT4gb2JqZWN0W0JlZm9yZV0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIHZhciBfX19hZnRlciA9IGNhbGxiYWNrID0+IHtcbiAgICAgIG9iamVjdFtBZnRlcl0uYWRkKGNhbGxiYWNrKTtcbiAgICAgIHJldHVybiAoKSA9PiBvYmplY3RbQWZ0ZXJdLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCaW5kQ2hhaW4sIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiAocGF0aCwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgICB2YXIgbm9kZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIHZhciBzdWJQYXJ0cyA9IHBhcnRzLnNsaWNlKDApO1xuICAgICAgICB2YXIgZGViaW5kID0gW107XG4gICAgICAgIGRlYmluZC5wdXNoKG9iamVjdC5iaW5kVG8obm9kZSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICB2YXIgcmVzdCA9IHN1YlBhcnRzLmpvaW4oJy4nKTtcbiAgICAgICAgICBpZiAoc3ViUGFydHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh2LCBrLCB0LCBkKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdiA9IHRba10gPSB0aGlzLm1ha2Uoe30pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWJpbmQgPSBkZWJpbmQuY29uY2F0KHZbQmluZENoYWluXShyZXN0LCBjYWxsYmFjaykpO1xuICAgICAgICB9KSk7XG4gICAgICAgIHJldHVybiAoKSA9PiBkZWJpbmQuZm9yRWFjaCh4ID0+IHgoKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ19fX2JlZm9yZScsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBfX19iZWZvcmVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnX19fYWZ0ZXInLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogX19fYWZ0ZXJcbiAgICB9KTtcbiAgICB2YXIgaXNCb3VuZCA9ICgpID0+IHtcbiAgICAgIGlmIChvYmplY3RbQmluZGluZ0FsbF0uc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGNhbGxiYWNrcyBvZiBPYmplY3QudmFsdWVzKG9iamVjdFtCaW5kaW5nXSkpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrcy5zaXplKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yKGxldCBjYWxsYmFjayBvZiBjYWxsYmFja3MpXG4gICAgICAgIC8vIHtcbiAgICAgICAgLy8gXHRpZihjYWxsYmFjaylcbiAgICAgICAgLy8gXHR7XG4gICAgICAgIC8vIFx0XHRyZXR1cm4gdHJ1ZTtcbiAgICAgICAgLy8gXHR9XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdpc0JvdW5kJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IGlzQm91bmRcbiAgICB9KTtcbiAgICBmb3IgKHZhciBpIGluIG9iamVjdCkge1xuICAgICAgLy8gY29uc3QgZGVzY3JpcHRvcnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhvYmplY3QpO1xuXG4gICAgICBpZiAoIW9iamVjdFtpXSB8fCB0eXBlb2Ygb2JqZWN0W2ldICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvYmplY3RbaV1bUmVmXSB8fCBvYmplY3RbaV0gaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKG9iamVjdFtpXSkgfHwgT2JqZWN0LmlzU2VhbGVkKG9iamVjdFtpXSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRXhjbHVkZWQob2JqZWN0W2ldKSkge1xuICAgICAgICBvYmplY3RbaV0gPSBCaW5kYWJsZS5tYWtlKG9iamVjdFtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBkZXNjcmlwdG9ycyA9IG9iamVjdFtEZXNjcmlwdG9yc107XG4gICAgdmFyIHdyYXBwZWQgPSBvYmplY3RbV3JhcHBlZF07XG4gICAgdmFyIHN0YWNrID0gb2JqZWN0W1N0YWNrXTtcbiAgICB2YXIgc2V0ID0gKHRhcmdldCwga2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFsdWUgPSBCaW5kYWJsZS5tYWtlKHZhbHVlKTtcbiAgICAgICAgaWYgKHRhcmdldFtrZXldID09PSB2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAod3JhcHBlZC5oYXMoa2V5KSkge1xuICAgICAgICB3cmFwcGVkLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgdmFyIG9uRGVjayA9IG9iamVjdFtEZWNrXTtcbiAgICAgIHZhciBpc09uRGVjayA9IG9uRGVjay5oYXMoa2V5KTtcbiAgICAgIHZhciB2YWxPbkRlY2sgPSBpc09uRGVjayAmJiBvbkRlY2suZ2V0KGtleSk7XG5cbiAgICAgIC8vIGlmKG9uRGVja1trZXldICE9PSB1bmRlZmluZWQgJiYgb25EZWNrW2tleV0gPT09IHZhbHVlKVxuICAgICAgaWYgKGlzT25EZWNrICYmIHZhbE9uRGVjayA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoa2V5LnNsaWNlICYmIGtleS5zbGljZSgtMykgPT09ICdfX18nKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRhcmdldFtrZXldID09PSB2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbE9uRGVjaykgJiYgaXNOYU4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgb25EZWNrLnNldChrZXksIHZhbHVlKTtcbiAgICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIG9iamVjdFtCaW5kaW5nQWxsXSkge1xuICAgICAgICBjYWxsYmFjayh2YWx1ZSwga2V5LCB0YXJnZXQsIGZhbHNlKTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgaW4gb2JqZWN0W0JpbmRpbmddKSB7XG4gICAgICAgIGZvciAodmFyIF9jYWxsYmFjayBvZiBvYmplY3RbQmluZGluZ11ba2V5XSkge1xuICAgICAgICAgIF9jYWxsYmFjayh2YWx1ZSwga2V5LCB0YXJnZXQsIGZhbHNlLCB0YXJnZXRba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9uRGVjay5kZWxldGUoa2V5KTtcbiAgICAgIHZhciBleGNsdWRlZCA9IHdpbi5GaWxlICYmIHRhcmdldCBpbnN0YW5jZW9mIHdpbi5GaWxlICYmIGtleSA9PSAnbGFzdE1vZGlmaWVkRGF0ZSc7XG4gICAgICBpZiAoIWV4Y2x1ZGVkKSB7XG4gICAgICAgIFJlZmxlY3Quc2V0KHRhcmdldCwga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpICYmIG9iamVjdFtCaW5kaW5nXVsnbGVuZ3RoJ10pIHtcbiAgICAgICAgZm9yICh2YXIgX2kgaW4gb2JqZWN0W0JpbmRpbmddWydsZW5ndGgnXSkge1xuICAgICAgICAgIHZhciBfY2FsbGJhY2syID0gb2JqZWN0W0JpbmRpbmddWydsZW5ndGgnXVtfaV07XG4gICAgICAgICAgX2NhbGxiYWNrMih0YXJnZXQubGVuZ3RoLCAnbGVuZ3RoJywgdGFyZ2V0LCBmYWxzZSwgdGFyZ2V0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgdmFyIGRlbGV0ZVByb3BlcnR5ID0gKHRhcmdldCwga2V5KSA9PiB7XG4gICAgICB2YXIgb25EZWNrID0gb2JqZWN0W0RlY2tdO1xuICAgICAgdmFyIGlzT25EZWNrID0gb25EZWNrLmhhcyhrZXkpO1xuICAgICAgaWYgKGlzT25EZWNrKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCEoa2V5IGluIHRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRvcnMuaGFzKGtleSkpIHtcbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ycy5nZXQoa2V5KTtcbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGRlc2NyaXB0b3JzLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgb25EZWNrLnNldChrZXksIG51bGwpO1xuICAgICAgaWYgKHdyYXBwZWQuaGFzKGtleSkpIHtcbiAgICAgICAgd3JhcHBlZC5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIG9iamVjdFtCaW5kaW5nQWxsXSkge1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGtleSwgdGFyZ2V0LCB0cnVlLCB0YXJnZXRba2V5XSk7XG4gICAgICB9XG4gICAgICBpZiAoa2V5IGluIG9iamVjdFtCaW5kaW5nXSkge1xuICAgICAgICBmb3IgKHZhciBiaW5kaW5nIG9mIG9iamVjdFtCaW5kaW5nXVtrZXldKSB7XG4gICAgICAgICAgYmluZGluZyh1bmRlZmluZWQsIGtleSwgdGFyZ2V0LCB0cnVlLCB0YXJnZXRba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBrZXkpO1xuICAgICAgb25EZWNrLmRlbGV0ZShrZXkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0ID0gKHRhcmdldCwgYXJncykgPT4ge1xuICAgICAgdmFyIGtleSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgICBmb3IgKHZhciBjYWxsYmFjayBvZiB0YXJnZXRbQmVmb3JlXSkge1xuICAgICAgICBjYWxsYmFjayh0YXJnZXQsIGtleSwgb2JqZWN0W1N0YWNrXSwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHZhciBpbnN0YW5jZSA9IEJpbmRhYmxlLm1ha2UobmV3IHRhcmdldFtPcmlnaW5hbF0oLi4uYXJncykpO1xuICAgICAgZm9yICh2YXIgX2NhbGxiYWNrMyBvZiB0YXJnZXRbQWZ0ZXJdKSB7XG4gICAgICAgIF9jYWxsYmFjazModGFyZ2V0LCBrZXksIG9iamVjdFtTdGFja10sIGluc3RhbmNlLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9O1xuICAgIHZhciBnZXQgPSAodGFyZ2V0LCBrZXkpID0+IHtcbiAgICAgIGlmICh3cmFwcGVkLmhhcyhrZXkpKSB7XG4gICAgICAgIHJldHVybiB3cmFwcGVkLmdldChrZXkpO1xuICAgICAgfVxuICAgICAgaWYgKGtleSA9PT0gUmVmIHx8IGtleSA9PT0gT3JpZ2luYWwgfHwga2V5ID09PSAnYXBwbHknIHx8IGtleSA9PT0gJ2lzQm91bmQnIHx8IGtleSA9PT0gJ2JpbmRUbycgfHwga2V5ID09PSAnX19wcm90b19fJyB8fCBrZXkgPT09ICdjb25zdHJ1Y3RvcicpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgICAgdmFyIGRlc2NyaXB0b3I7XG4gICAgICBpZiAoZGVzY3JpcHRvcnMuaGFzKGtleSkpIHtcbiAgICAgICAgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JzLmdldChrZXkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBrZXkpO1xuICAgICAgICBkZXNjcmlwdG9ycy5zZXQoa2V5LCBkZXNjcmlwdG9yKTtcbiAgICAgIH1cbiAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgICBpZiAoT25BbGxHZXQgaW4gb2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBvYmplY3RbT25BbGxHZXRdKGtleSk7XG4gICAgICB9XG4gICAgICBpZiAoT25HZXQgaW4gb2JqZWN0ICYmICEoa2V5IGluIG9iamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtPbkdldF0oa2V5KTtcbiAgICAgIH1cbiAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICB3cmFwcGVkLnNldChrZXksIG9iamVjdFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBvYmplY3Rba2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpZiAoTmFtZXMgaW4gb2JqZWN0W2tleV0pIHtcbiAgICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0W1Vud3JhcHBlZF0uc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICB2YXIgcHJvdG90eXBlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCk7XG4gICAgICAgIHZhciBpc01ldGhvZCA9IHByb3RvdHlwZVtrZXldID09PSBvYmplY3Rba2V5XTtcbiAgICAgICAgdmFyIG9ialJlZiA9XG4gICAgICAgIC8vICh0eXBlb2YgUHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgUHJvbWlzZSlcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBTdG9yYWdlID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBTdG9yYWdlKVxuICAgICAgICAvLyB8fCAodHlwZW9mIE1hcCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIE1hcClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBTZXQgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBTZXQpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgV2Vha01hcClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBXZWFrU2V0ID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBXZWFrU2V0KVxuICAgICAgICAvLyB8fCAodHlwZW9mIEFycmF5QnVmZmVyID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFJlc2l6ZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFJlc2l6ZU9ic2VydmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIE11dGF0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIE11dGF0aW9uT2JzZXJ2ZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgUGVyZm9ybWFuY2VPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgUGVyZm9ybWFuY2VPYnNlcnZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBJbnRlcnNlY3Rpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBJbnRlcnNlY3Rpb25PYnNlcnZlcilcbiAgICAgICAgaXNFeGNsdWRlZChvYmplY3QpIHx8IHR5cGVvZiBvYmplY3RbU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJyAmJiBrZXkgPT09ICduZXh0JyB8fCB0eXBlb2YgVHlwZWRBcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiBUeXBlZEFycmF5IHx8IHR5cGVvZiBFdmVudFRhcmdldCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiBFdmVudFRhcmdldCB8fCB0eXBlb2YgRGF0ZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiBEYXRlIHx8IHR5cGVvZiBNYXBJdGVyYXRvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QucHJvdG90eXBlID09PSBNYXBJdGVyYXRvciB8fCB0eXBlb2YgU2V0SXRlcmF0b3IgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0LnByb3RvdHlwZSA9PT0gU2V0SXRlcmF0b3IgPyBvYmplY3QgOiBvYmplY3RbUmVmXTtcbiAgICAgICAgdmFyIHdyYXBwZWRNZXRob2QgPSBmdW5jdGlvbiAoLi4ucHJvdmlkZWRBcmdzKSB7XG4gICAgICAgICAgb2JqZWN0W0V4ZWN1dGluZ10gPSBrZXk7XG4gICAgICAgICAgc3RhY2sudW5zaGlmdChrZXkpO1xuICAgICAgICAgIGZvciAodmFyIGJlZm9yZUNhbGxiYWNrIG9mIG9iamVjdFtCZWZvcmVdKSB7XG4gICAgICAgICAgICBiZWZvcmVDYWxsYmFjayhvYmplY3QsIGtleSwgc3RhY2ssIG9iamVjdCwgcHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICBpZiAobmV3LnRhcmdldCkge1xuICAgICAgICAgICAgcmV0ID0gbmV3IChvYmplY3RbVW53cmFwcGVkXS5nZXQoa2V5KSkoLi4ucHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGZ1bmMgPSBvYmplY3RbVW53cmFwcGVkXS5nZXQoa2V5KTtcbiAgICAgICAgICAgIGlmIChpc01ldGhvZCkge1xuICAgICAgICAgICAgICByZXQgPSBmdW5jLmFwcGx5KG9ialJlZiB8fCBvYmplY3QsIHByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXQgPSBmdW5jKC4uLnByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAodmFyIGFmdGVyQ2FsbGJhY2sgb2Ygb2JqZWN0W0FmdGVyXSkge1xuICAgICAgICAgICAgYWZ0ZXJDYWxsYmFjayhvYmplY3QsIGtleSwgc3RhY2ssIG9iamVjdCwgcHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb2JqZWN0W0V4ZWN1dGluZ10gPSBudWxsO1xuICAgICAgICAgIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfTtcbiAgICAgICAgd3JhcHBlZE1ldGhvZFtPbkFsbEdldF0gPSBfa2V5ID0+IG9iamVjdFtrZXldW19rZXldO1xuICAgICAgICB2YXIgcmVzdWx0ID0gQmluZGFibGUubWFrZSh3cmFwcGVkTWV0aG9kKTtcbiAgICAgICAgd3JhcHBlZC5zZXQoa2V5LCByZXN1bHQpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgIH07XG4gICAgdmFyIGdldFByb3RvdHlwZU9mID0gdGFyZ2V0ID0+IHtcbiAgICAgIGlmIChHZXRQcm90byBpbiBvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtHZXRQcm90b107XG4gICAgICB9XG4gICAgICByZXR1cm4gUmVmbGVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuICAgIH07XG4gICAgdmFyIGhhbmRsZXJEZWYgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIGhhbmRsZXJEZWYuc2V0ID0gc2V0O1xuICAgIGhhbmRsZXJEZWYuY29uc3RydWN0ID0gY29uc3RydWN0O1xuICAgIGhhbmRsZXJEZWYuZGVsZXRlUHJvcGVydHkgPSBkZWxldGVQcm9wZXJ0eTtcbiAgICBpZiAoIW9iamVjdFtOb0dldHRlcnNdKSB7XG4gICAgICBoYW5kbGVyRGVmLmdldFByb3RvdHlwZU9mID0gZ2V0UHJvdG90eXBlT2Y7XG4gICAgICBoYW5kbGVyRGVmLmdldCA9IGdldDtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgUmVmLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFByb3h5KG9iamVjdCwgaGFuZGxlckRlZilcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqZWN0W1JlZl07XG4gIH1cbiAgc3RhdGljIGNsZWFyQmluZGluZ3Mob2JqZWN0KSB7XG4gICAgdmFyIG1hcHMgPSBmdW5jID0+ICguLi5vcykgPT4gb3MubWFwKGZ1bmMpO1xuICAgIHZhciBjbGVhck9iaiA9IG8gPT4gT2JqZWN0LmtleXMobykubWFwKGsgPT4gZGVsZXRlIG9ba10pO1xuICAgIHZhciBjbGVhck9ianMgPSBtYXBzKGNsZWFyT2JqKTtcbiAgICBvYmplY3RbQmluZGluZ0FsbF0uY2xlYXIoKTtcbiAgICBjbGVhck9ianMob2JqZWN0W1dyYXBwZWRdLCBvYmplY3RbQmluZGluZ10sIG9iamVjdFtBZnRlcl0sIG9iamVjdFtCZWZvcmVdKTtcbiAgfVxuICBzdGF0aWMgcmVzb2x2ZShvYmplY3QsIHBhdGgsIG93bmVyID0gZmFsc2UpIHtcbiAgICB2YXIgbm9kZTtcbiAgICB2YXIgcGF0aFBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIHZhciB0b3AgPSBwYXRoUGFydHNbMF07XG4gICAgd2hpbGUgKHBhdGhQYXJ0cy5sZW5ndGgpIHtcbiAgICAgIGlmIChvd25lciAmJiBwYXRoUGFydHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHZhciBvYmogPSB0aGlzLm1ha2Uob2JqZWN0KTtcbiAgICAgICAgcmV0dXJuIFtvYmosIHBhdGhQYXJ0cy5zaGlmdCgpLCB0b3BdO1xuICAgICAgfVxuICAgICAgbm9kZSA9IHBhdGhQYXJ0cy5zaGlmdCgpO1xuICAgICAgaWYgKCEobm9kZSBpbiBvYmplY3QpIHx8ICFvYmplY3Rbbm9kZV0gfHwgISh0eXBlb2Ygb2JqZWN0W25vZGVdID09PSAnb2JqZWN0JykpIHtcbiAgICAgICAgb2JqZWN0W25vZGVdID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIH1cbiAgICAgIG9iamVjdCA9IHRoaXMubWFrZShvYmplY3Rbbm9kZV0pO1xuICAgIH1cbiAgICByZXR1cm4gW3RoaXMubWFrZShvYmplY3QpLCBub2RlLCB0b3BdO1xuICB9XG4gIHN0YXRpYyB3cmFwRGVsYXlDYWxsYmFjayhjYWxsYmFjaywgZGVsYXkpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soLi4uYXJncyksIGRlbGF5KTtcbiAgfVxuICBzdGF0aWMgd3JhcFRocm90dGxlQ2FsbGJhY2soY2FsbGJhY2ssIHRocm90dGxlKSB7XG4gICAgdGhpcy50aHJvdHRsZXMuc2V0KGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAodGhpcy50aHJvdHRsZXMuZ2V0KGNhbGxiYWNrLCB0cnVlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYWxsYmFjayguLi5hcmdzKTtcbiAgICAgIHRoaXMudGhyb3R0bGVzLnNldChjYWxsYmFjaywgdHJ1ZSk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy50aHJvdHRsZXMuc2V0KGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgICB9LCB0aHJvdHRsZSk7XG4gICAgfTtcbiAgfVxuICBzdGF0aWMgd3JhcFdhaXRDYWxsYmFjayhjYWxsYmFjaywgd2FpdCkge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgdmFyIHdhaXRlcjtcbiAgICAgIGlmICh3YWl0ZXIgPSB0aGlzLndhaXRlcnMuZ2V0KGNhbGxiYWNrKSkge1xuICAgICAgICB0aGlzLndhaXRlcnMuZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHdhaXRlcik7XG4gICAgICB9XG4gICAgICB3YWl0ZXIgPSBzZXRUaW1lb3V0KCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpLCB3YWl0KTtcbiAgICAgIHRoaXMud2FpdGVycy5zZXQoY2FsbGJhY2ssIHdhaXRlcik7XG4gICAgfTtcbiAgfVxuICBzdGF0aWMgd3JhcEZyYW1lQ2FsbGJhY2soY2FsbGJhY2ssIGZyYW1lcykge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpKTtcbiAgICB9O1xuICB9XG4gIHN0YXRpYyB3cmFwSWRsZUNhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICAvLyBDb21wYXRpYmlsaXR5IGZvciBTYWZhcmkgMDgvMjAyMFxuICAgICAgdmFyIHJlcSA9IHdpbmRvdy5yZXF1ZXN0SWRsZUNhbGxiYWNrIHx8IHJlcXVlc3RBbmltYXRpb25GcmFtZTtcbiAgICAgIHJlcSgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSk7XG4gICAgfTtcbiAgfVxufVxuZXhwb3J0cy5CaW5kYWJsZSA9IEJpbmRhYmxlO1xuX2RlZmluZVByb3BlcnR5KEJpbmRhYmxlLCBcIndhaXRlcnNcIiwgbmV3IFdlYWtNYXAoKSk7XG5fZGVmaW5lUHJvcGVydHkoQmluZGFibGUsIFwidGhyb3R0bGVzXCIsIG5ldyBXZWFrTWFwKCkpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnUHJldmVudCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IFByZXZlbnRcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnT25HZXQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBPbkdldFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdOb0dldHRlcnMnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBOb0dldHRlcnNcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnR2V0UHJvdG8nLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBHZXRQcm90b1xufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdPbkFsbEdldCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE9uQWxsR2V0XG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0NhY2hlLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5DYWNoZSA9IHZvaWQgMDtcbmNsYXNzIENhY2hlIHtcbiAgc3RhdGljIHN0b3JlKGtleSwgdmFsdWUsIGV4cGlyeSwgYnVja2V0ID0gJ3N0YW5kYXJkJykge1xuICAgIHZhciBleHBpcmF0aW9uID0gMDtcbiAgICBpZiAoZXhwaXJ5KSB7XG4gICAgICBleHBpcmF0aW9uID0gZXhwaXJ5ICogMTAwMCArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYnVja2V0cykge1xuICAgICAgdGhpcy5idWNrZXRzID0gbmV3IE1hcCgpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYnVja2V0cy5oYXMoYnVja2V0KSkge1xuICAgICAgdGhpcy5idWNrZXRzLnNldChidWNrZXQsIG5ldyBNYXAoKSk7XG4gICAgfVxuICAgIHZhciBldmVudEVuZCA9IG5ldyBDdXN0b21FdmVudCgnY3ZDYWNoZVN0b3JlJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBrZXksXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBleHBpcnksXG4gICAgICAgIGJ1Y2tldFxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50RW5kKSkge1xuICAgICAgdGhpcy5idWNrZXRzLmdldChidWNrZXQpLnNldChrZXksIHtcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIGV4cGlyYXRpb25cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgbG9hZChrZXksIGRlZmF1bHR2YWx1ZSA9IGZhbHNlLCBidWNrZXQgPSAnc3RhbmRhcmQnKSB7XG4gICAgdmFyIGV2ZW50RW5kID0gbmV3IEN1c3RvbUV2ZW50KCdjdkNhY2hlTG9hZCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAga2V5LFxuICAgICAgICBkZWZhdWx0dmFsdWUsXG4gICAgICAgIGJ1Y2tldFxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudEVuZCkpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0dmFsdWU7XG4gICAgfVxuICAgIGlmICh0aGlzLmJ1Y2tldHMgJiYgdGhpcy5idWNrZXRzLmhhcyhidWNrZXQpICYmIHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5oYXMoa2V5KSkge1xuICAgICAgdmFyIGVudHJ5ID0gdGhpcy5idWNrZXRzLmdldChidWNrZXQpLmdldChrZXkpO1xuICAgICAgLy8gY29uc29sZS5sb2codGhpcy5idWNrZXRbYnVja2V0XVtrZXldLmV4cGlyYXRpb24sIChuZXcgRGF0ZSkuZ2V0VGltZSgpKTtcbiAgICAgIGlmIChlbnRyeS5leHBpcmF0aW9uID09PSAwIHx8IGVudHJ5LmV4cGlyYXRpb24gPiBuZXcgRGF0ZSgpLmdldFRpbWUoKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5idWNrZXRzLmdldChidWNrZXQpLmdldChrZXkpLnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVmYXVsdHZhbHVlO1xuICB9XG59XG5leHBvcnRzLkNhY2hlID0gQ2FjaGU7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Db25maWcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkNvbmZpZyA9IHZvaWQgMDtcbnZhciBBcHBDb25maWcgPSB7fTtcbnZhciBfcmVxdWlyZSA9IHJlcXVpcmU7XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbnRyeSB7XG4gIEFwcENvbmZpZyA9IF9yZXF1aXJlKCcvQ29uZmlnJykuQ29uZmlnO1xufSBjYXRjaCAoZXJyb3IpIHtcbiAgd2luLmRldk1vZGUgPT09IHRydWUgJiYgY29uc29sZS5lcnJvcihlcnJvcik7XG4gIEFwcENvbmZpZyA9IHt9O1xufVxuY2xhc3MgQ29uZmlnIHtcbiAgc3RhdGljIGdldChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnc1tuYW1lXTtcbiAgfVxuICBzdGF0aWMgc2V0KG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5jb25maWdzW25hbWVdID0gdmFsdWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgc3RhdGljIGR1bXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlncztcbiAgfVxuICBzdGF0aWMgaW5pdCguLi5jb25maWdzKSB7XG4gICAgZm9yICh2YXIgaSBpbiBjb25maWdzKSB7XG4gICAgICB2YXIgY29uZmlnID0gY29uZmlnc1tpXTtcbiAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb25maWcgPSBKU09OLnBhcnNlKGNvbmZpZyk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBuYW1lIGluIGNvbmZpZykge1xuICAgICAgICB2YXIgdmFsdWUgPSBjb25maWdbbmFtZV07XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cbmV4cG9ydHMuQ29uZmlnID0gQ29uZmlnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KENvbmZpZywgJ2NvbmZpZ3MnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBBcHBDb25maWdcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvRG9tLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Eb20gPSB2b2lkIDA7XG52YXIgdHJhdmVyc2FscyA9IDA7XG5jbGFzcyBEb20ge1xuICBzdGF0aWMgbWFwVGFncyhkb2MsIHNlbGVjdG9yLCBjYWxsYmFjaywgc3RhcnROb2RlLCBlbmROb2RlKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBzdGFydGVkID0gdHJ1ZTtcbiAgICBpZiAoc3RhcnROb2RlKSB7XG4gICAgICBzdGFydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBlbmRlZCA9IGZhbHNlO1xuICAgIHZhciB7XG4gICAgICBOb2RlLFxuICAgICAgRWxlbWVudCxcbiAgICAgIE5vZGVGaWx0ZXIsXG4gICAgICBkb2N1bWVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB2YXIgdHJlZVdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoZG9jLCBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCB8IE5vZGVGaWx0ZXIuU0hPV19URVhULCB7XG4gICAgICBhY2NlcHROb2RlOiAobm9kZSwgd2Fsa2VyKSA9PiB7XG4gICAgICAgIGlmICghc3RhcnRlZCkge1xuICAgICAgICAgIGlmIChub2RlID09PSBzdGFydE5vZGUpIHtcbiAgICAgICAgICAgIHN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfU0tJUDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuZE5vZGUgJiYgbm9kZSA9PT0gZW5kTm9kZSkge1xuICAgICAgICAgIGVuZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5kZWQpIHtcbiAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfU0tJUDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChub2RlLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9BQ0NFUFQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9BQ0NFUFQ7XG4gICAgICB9XG4gICAgfSwgZmFsc2UpO1xuICAgIHZhciB0cmF2ZXJzYWwgPSB0cmF2ZXJzYWxzKys7XG4gICAgd2hpbGUgKHRyZWVXYWxrZXIubmV4dE5vZGUoKSkge1xuICAgICAgcmVzdWx0LnB1c2goY2FsbGJhY2sodHJlZVdhbGtlci5jdXJyZW50Tm9kZSwgdHJlZVdhbGtlcikpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHN0YXRpYyBkaXNwYXRjaEV2ZW50KGRvYywgZXZlbnQpIHtcbiAgICBkb2MuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgdGhpcy5tYXBUYWdzKGRvYywgZmFsc2UsIG5vZGUgPT4ge1xuICAgICAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB9KTtcbiAgfVxufVxuZXhwb3J0cy5Eb20gPSBEb207XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9NaXhpbi5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuTWl4aW4gPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgQ29uc3RydWN0b3IgPSBTeW1ib2woJ2NvbnN0cnVjdG9yJyk7XG52YXIgTWl4aW5MaXN0ID0gU3ltYm9sKCdtaXhpbkxpc3QnKTtcbmNsYXNzIE1peGluIHtcbiAgc3RhdGljIGZyb20oYmFzZUNsYXNzLCAuLi5taXhpbnMpIHtcbiAgICB2YXIgbmV3Q2xhc3MgPSBjbGFzcyBleHRlbmRzIGJhc2VDbGFzcyB7XG4gICAgICBjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG4gICAgICAgIHZhciBpbnN0YW5jZSA9IGJhc2VDbGFzcy5jb25zdHJ1Y3RvciA/IHN1cGVyKC4uLmFyZ3MpIDogbnVsbDtcbiAgICAgICAgZm9yICh2YXIgbWl4aW4gb2YgbWl4aW5zKSB7XG4gICAgICAgICAgaWYgKG1peGluW01peGluLkNvbnN0cnVjdG9yXSkge1xuICAgICAgICAgICAgbWl4aW5bTWl4aW4uQ29uc3RydWN0b3JdLmFwcGx5KHRoaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzd2l0Y2ggKHR5cGVvZiBtaXhpbikge1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICBNaXhpbi5taXhDbGFzcyhtaXhpbiwgbmV3Q2xhc3MpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgIE1peGluLm1peE9iamVjdChtaXhpbiwgdGhpcyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gbmV3Q2xhc3M7XG4gIH1cbiAgc3RhdGljIG1ha2UoLi4uY2xhc3Nlcykge1xuICAgIHZhciBiYXNlID0gY2xhc3Nlcy5wb3AoKTtcbiAgICByZXR1cm4gTWl4aW4udG8oYmFzZSwgLi4uY2xhc3Nlcyk7XG4gIH1cbiAgc3RhdGljIHRvKGJhc2UsIC4uLm1peGlucykge1xuICAgIHZhciBkZXNjcmlwdG9ycyA9IHt9O1xuICAgIG1peGlucy5tYXAobWl4aW4gPT4ge1xuICAgICAgc3dpdGNoICh0eXBlb2YgbWl4aW4pIHtcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGRlc2NyaXB0b3JzLCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhtaXhpbikpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihkZXNjcmlwdG9ycywgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMobWl4aW4ucHJvdG90eXBlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBkZWxldGUgZGVzY3JpcHRvcnMuY29uc3RydWN0b3I7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhiYXNlLnByb3RvdHlwZSwgZGVzY3JpcHRvcnMpO1xuICAgIH0pO1xuICB9XG4gIHN0YXRpYyB3aXRoKC4uLm1peGlucykge1xuICAgIHJldHVybiB0aGlzLmZyb20oY2xhc3Mge1xuICAgICAgY29uc3RydWN0b3IoKSB7fVxuICAgIH0sIC4uLm1peGlucyk7XG4gIH1cbiAgc3RhdGljIG1peE9iamVjdChtaXhpbiwgaW5zdGFuY2UpIHtcbiAgICBmb3IgKHZhciBmdW5jIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG1peGluKSkge1xuICAgICAgaWYgKHR5cGVvZiBtaXhpbltmdW5jXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpbnN0YW5jZVtmdW5jXSA9IG1peGluW2Z1bmNdLmJpbmQoaW5zdGFuY2UpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGluc3RhbmNlW2Z1bmNdID0gbWl4aW5bZnVuY107XG4gICAgfVxuICAgIGZvciAodmFyIF9mdW5jIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMobWl4aW4pKSB7XG4gICAgICBpZiAodHlwZW9mIG1peGluW19mdW5jXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpbnN0YW5jZVtfZnVuY10gPSBtaXhpbltfZnVuY10uYmluZChpbnN0YW5jZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW5zdGFuY2VbX2Z1bmNdID0gbWl4aW5bX2Z1bmNdO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgbWl4Q2xhc3MoY2xzLCBuZXdDbGFzcykge1xuICAgIGZvciAodmFyIGZ1bmMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2xzLnByb3RvdHlwZSkpIHtcbiAgICAgIGlmIChbJ25hbWUnLCAncHJvdG90eXBlJywgJ2xlbmd0aCddLmluY2x1ZGVzKGZ1bmMpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5ld0NsYXNzLCBmdW5jKTtcbiAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBjbHNbZnVuY10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW2Z1bmNdID0gY2xzLnByb3RvdHlwZVtmdW5jXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBuZXdDbGFzcy5wcm90b3R5cGVbZnVuY10gPSBjbHMucHJvdG90eXBlW2Z1bmNdLmJpbmQobmV3Q2xhc3MucHJvdG90eXBlKTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2Z1bmMyIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoY2xzLnByb3RvdHlwZSkpIHtcbiAgICAgIGlmICh0eXBlb2YgY2xzW19mdW5jMl0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW19mdW5jMl0gPSBjbHMucHJvdG90eXBlW19mdW5jMl07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW19mdW5jMl0gPSBjbHMucHJvdG90eXBlW19mdW5jMl0uYmluZChuZXdDbGFzcy5wcm90b3R5cGUpO1xuICAgIH1cbiAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChbJ25hbWUnLCAncHJvdG90eXBlJywgJ2xlbmd0aCddLmluY2x1ZGVzKF9mdW5jMykpIHtcbiAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobmV3Q2xhc3MsIF9mdW5jMyk7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBjbHNbX2Z1bmMzXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG5ld0NsYXNzW19mdW5jM10gPSBjbHNbX2Z1bmMzXTtcbiAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHJldiA9IG5ld0NsYXNzW19mdW5jM10gfHwgZmFsc2U7XG4gICAgICAgIHZhciBtZXRoID0gY2xzW19mdW5jM10uYmluZChuZXdDbGFzcyk7XG4gICAgICAgIG5ld0NsYXNzW19mdW5jM10gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgIHByZXYgJiYgcHJldiguLi5hcmdzKTtcbiAgICAgICAgICByZXR1cm4gbWV0aCguLi5hcmdzKTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBfcmV0O1xuICAgIGZvciAodmFyIF9mdW5jMyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjbHMpKSB7XG4gICAgICBfcmV0ID0gX2xvb3AoKTtcbiAgICAgIGlmIChfcmV0ID09PSAwKSBjb250aW51ZTtcbiAgICB9XG4gICAgdmFyIF9sb29wMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICh0eXBlb2YgY2xzW19mdW5jNF0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW19mdW5jNF0gPSBjbHNbX2Z1bmM0XTtcbiAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICB2YXIgcHJldiA9IG5ld0NsYXNzW19mdW5jNF0gfHwgZmFsc2U7XG4gICAgICB2YXIgbWV0aCA9IGNsc1tfZnVuYzRdLmJpbmQobmV3Q2xhc3MpO1xuICAgICAgbmV3Q2xhc3NbX2Z1bmM0XSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIHByZXYgJiYgcHJldiguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIG1ldGgoLi4uYXJncyk7XG4gICAgICB9O1xuICAgIH07XG4gICAgZm9yICh2YXIgX2Z1bmM0IG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoY2xzKSkge1xuICAgICAgaWYgKF9sb29wMigpKSBjb250aW51ZTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIG1peChtaXhpblRvKSB7XG4gICAgdmFyIGNvbnN0cnVjdG9ycyA9IFtdO1xuICAgIHZhciBhbGxTdGF0aWMgPSB7fTtcbiAgICB2YXIgYWxsSW5zdGFuY2UgPSB7fTtcbiAgICB2YXIgbWl4YWJsZSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUobWl4aW5Ubyk7XG4gICAgdmFyIF9sb29wMyA9IGZ1bmN0aW9uIChiYXNlKSB7XG4gICAgICB2YXIgaW5zdGFuY2VOYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGJhc2UucHJvdG90eXBlKTtcbiAgICAgIHZhciBzdGF0aWNOYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGJhc2UpO1xuICAgICAgdmFyIHByZWZpeCA9IC9eKGJlZm9yZXxhZnRlcilfXyguKykvO1xuICAgICAgdmFyIF9sb29wNSA9IGZ1bmN0aW9uIChfbWV0aG9kTmFtZTIpIHtcbiAgICAgICAgICB2YXIgbWF0Y2ggPSBfbWV0aG9kTmFtZTIubWF0Y2gocHJlZml4KTtcbiAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHN3aXRjaCAobWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgY2FzZSAnYmVmb3JlJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2JlZm9yZSgodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlW19tZXRob2ROYW1lMl0uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FmdGVyJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2FmdGVyKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2VbX21ldGhvZE5hbWUyXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYWxsU3RhdGljW19tZXRob2ROYW1lMl0pIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGJhc2VbX21ldGhvZE5hbWUyXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGFsbFN0YXRpY1tfbWV0aG9kTmFtZTJdID0gYmFzZVtfbWV0aG9kTmFtZTJdO1xuICAgICAgICB9LFxuICAgICAgICBfcmV0MjtcbiAgICAgIGZvciAodmFyIF9tZXRob2ROYW1lMiBvZiBzdGF0aWNOYW1lcykge1xuICAgICAgICBfcmV0MiA9IF9sb29wNShfbWV0aG9kTmFtZTIpO1xuICAgICAgICBpZiAoX3JldDIgPT09IDApIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIF9sb29wNiA9IGZ1bmN0aW9uIChfbWV0aG9kTmFtZTMpIHtcbiAgICAgICAgICB2YXIgbWF0Y2ggPSBfbWV0aG9kTmFtZTMubWF0Y2gocHJlZml4KTtcbiAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHN3aXRjaCAobWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgY2FzZSAnYmVmb3JlJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2JlZm9yZSgodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdhZnRlcic6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19hZnRlcigodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhbGxJbnN0YW5jZVtfbWV0aG9kTmFtZTNdKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgYWxsSW5zdGFuY2VbX21ldGhvZE5hbWUzXSA9IGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM107XG4gICAgICAgIH0sXG4gICAgICAgIF9yZXQzO1xuICAgICAgZm9yICh2YXIgX21ldGhvZE5hbWUzIG9mIGluc3RhbmNlTmFtZXMpIHtcbiAgICAgICAgX3JldDMgPSBfbG9vcDYoX21ldGhvZE5hbWUzKTtcbiAgICAgICAgaWYgKF9yZXQzID09PSAwKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZvciAodmFyIGJhc2UgPSB0aGlzOyBiYXNlICYmIGJhc2UucHJvdG90eXBlOyBiYXNlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGJhc2UpKSB7XG4gICAgICBfbG9vcDMoYmFzZSk7XG4gICAgfVxuICAgIGZvciAodmFyIG1ldGhvZE5hbWUgaW4gYWxsU3RhdGljKSB7XG4gICAgICBtaXhpblRvW21ldGhvZE5hbWVdID0gYWxsU3RhdGljW21ldGhvZE5hbWVdLmJpbmQobWl4aW5Ubyk7XG4gICAgfVxuICAgIHZhciBfbG9vcDQgPSBmdW5jdGlvbiAoX21ldGhvZE5hbWUpIHtcbiAgICAgIG1peGluVG8ucHJvdG90eXBlW19tZXRob2ROYW1lXSA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgIHJldHVybiBhbGxJbnN0YW5jZVtfbWV0aG9kTmFtZV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9O1xuICAgIH07XG4gICAgZm9yICh2YXIgX21ldGhvZE5hbWUgaW4gYWxsSW5zdGFuY2UpIHtcbiAgICAgIF9sb29wNChfbWV0aG9kTmFtZSk7XG4gICAgfVxuICAgIHJldHVybiBtaXhhYmxlO1xuICB9XG59XG5leHBvcnRzLk1peGluID0gTWl4aW47XG5NaXhpbi5Db25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvUm91dGVyLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Sb3V0ZXIgPSB2b2lkIDA7XG52YXIgX1ZpZXcgPSByZXF1aXJlKFwiLi9WaWV3XCIpO1xudmFyIF9DYWNoZSA9IHJlcXVpcmUoXCIuL0NhY2hlXCIpO1xudmFyIF9Db25maWcgPSByZXF1aXJlKFwiLi9Db25maWdcIik7XG52YXIgX1JvdXRlcyA9IHJlcXVpcmUoXCIuL1JvdXRlc1wiKTtcbnZhciBfd2luJEN1c3RvbUV2ZW50O1xudmFyIE5vdEZvdW5kRXJyb3IgPSBTeW1ib2woJ05vdEZvdW5kJyk7XG52YXIgSW50ZXJuYWxFcnJvciA9IFN5bWJvbCgnSW50ZXJuYWwnKTtcbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xud2luLkN1c3RvbUV2ZW50ID0gKF93aW4kQ3VzdG9tRXZlbnQgPSB3aW4uQ3VzdG9tRXZlbnQpICE9PSBudWxsICYmIF93aW4kQ3VzdG9tRXZlbnQgIT09IHZvaWQgMCA/IF93aW4kQ3VzdG9tRXZlbnQgOiB3aW4uRXZlbnQ7XG5jbGFzcyBSb3V0ZXIge1xuICBzdGF0aWMgd2FpdCh2aWV3LCBldmVudCA9ICdET01Db250ZW50TG9hZGVkJywgbm9kZSA9IGRvY3VtZW50KSB7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCAoKSA9PiB7XG4gICAgICB0aGlzLmxpc3Rlbih2aWV3KTtcbiAgICB9KTtcbiAgfVxuICBzdGF0aWMgbGlzdGVuKGxpc3RlbmVyLCByb3V0ZXMgPSBmYWxzZSkge1xuICAgIHRoaXMubGlzdGVuZXIgPSBsaXN0ZW5lciB8fCB0aGlzLmxpc3RlbmVyO1xuICAgIHRoaXMucm91dGVzID0gcm91dGVzIHx8IGxpc3RlbmVyLnJvdXRlcztcbiAgICBPYmplY3QuYXNzaWduKHRoaXMucXVlcnksIHRoaXMucXVlcnlPdmVyKHt9KSk7XG4gICAgdmFyIGxpc3RlbiA9IGV2ZW50ID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoZXZlbnQuc3RhdGUgJiYgJ3JvdXRlZElkJyBpbiBldmVudC5zdGF0ZSkge1xuICAgICAgICBpZiAoZXZlbnQuc3RhdGUucm91dGVkSWQgPD0gdGhpcy5yb3V0ZUNvdW50KSB7XG4gICAgICAgICAgdGhpcy5oaXN0b3J5LnNwbGljZShldmVudC5zdGF0ZS5yb3V0ZWRJZCk7XG4gICAgICAgICAgdGhpcy5yb3V0ZUNvdW50ID0gZXZlbnQuc3RhdGUucm91dGVkSWQ7XG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnQuc3RhdGUucm91dGVkSWQgPiB0aGlzLnJvdXRlQ291bnQpIHtcbiAgICAgICAgICB0aGlzLmhpc3RvcnkucHVzaChldmVudC5zdGF0ZS5wcmV2KTtcbiAgICAgICAgICB0aGlzLnJvdXRlQ291bnQgPSBldmVudC5zdGF0ZS5yb3V0ZWRJZDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YXRlID0gZXZlbnQuc3RhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5wcmV2UGF0aCAhPT0gbnVsbCAmJiB0aGlzLnByZXZQYXRoICE9PSBsb2NhdGlvbi5wYXRobmFtZSkge1xuICAgICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKHRoaXMucHJldlBhdGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSkge1xuICAgICAgICB0aGlzLm1hdGNoKGxvY2F0aW9uLnBhdGhuYW1lLCBsaXN0ZW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1hdGNoKHRoaXMubmV4dFBhdGgsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjdlVybENoYW5nZWQnLCBsaXN0ZW4pO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGxpc3Rlbik7XG4gICAgdmFyIHJvdXRlID0gIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSA/IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoIDogZmFsc2U7XG4gICAgaWYgKCF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikgJiYgbG9jYXRpb24uaGFzaCkge1xuICAgICAgcm91dGUgKz0gbG9jYXRpb24uaGFzaDtcbiAgICB9XG4gICAgdmFyIHN0YXRlID0ge1xuICAgICAgcm91dGVkSWQ6IHRoaXMucm91dGVDb3VudCxcbiAgICAgIHVybDogbG9jYXRpb24ucGF0aG5hbWUsXG4gICAgICBwcmV2OiB0aGlzLnByZXZQYXRoXG4gICAgfTtcbiAgICBpZiAoIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSkge1xuICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoc3RhdGUsIG51bGwsIGxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICB9XG4gICAgdGhpcy5nbyhyb3V0ZSAhPT0gZmFsc2UgPyByb3V0ZSA6ICcvJyk7XG4gIH1cbiAgc3RhdGljIGdvKHBhdGgsIHNpbGVudCA9IGZhbHNlKSB7XG4gICAgdmFyIGNvbmZpZ1RpdGxlID0gX0NvbmZpZy5Db25maWcuZ2V0KCd0aXRsZScpO1xuICAgIGlmIChjb25maWdUaXRsZSkge1xuICAgICAgZG9jdW1lbnQudGl0bGUgPSBjb25maWdUaXRsZTtcbiAgICB9XG4gICAgdmFyIHN0YXRlID0ge1xuICAgICAgcm91dGVkSWQ6IHRoaXMucm91dGVDb3VudCxcbiAgICAgIHByZXY6IHRoaXMucHJldlBhdGgsXG4gICAgICB1cmw6IGxvY2F0aW9uLnBhdGhuYW1lXG4gICAgfTtcbiAgICBpZiAoc2lsZW50ID09PSAtMSkge1xuICAgICAgdGhpcy5tYXRjaChwYXRoLCB0aGlzLmxpc3RlbmVyLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSkge1xuICAgICAgdGhpcy5uZXh0UGF0aCA9IHBhdGg7XG4gICAgfSBlbHNlIGlmIChzaWxlbnQgPT09IDIgJiYgbG9jYXRpb24ucGF0aG5hbWUgIT09IHBhdGgpIHtcbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlLCBudWxsLCBwYXRoKTtcbiAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLnBhdGhuYW1lICE9PSBwYXRoKSB7XG4gICAgICBoaXN0b3J5LnB1c2hTdGF0ZShzdGF0ZSwgbnVsbCwgcGF0aCk7XG4gICAgfVxuICAgIGlmICghc2lsZW50IHx8IHNpbGVudCA8IDApIHtcbiAgICAgIGlmIChzaWxlbnQgPT09IGZhbHNlKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICBpZiAocGF0aC5zdWJzdHJpbmcoMCwgMSkgPT09ICcjJykge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBIYXNoQ2hhbmdlRXZlbnQoJ2hhc2hjaGFuZ2UnKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdlVybENoYW5nZWQnKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wcmV2UGF0aCA9IHBhdGg7XG4gIH1cbiAgc3RhdGljIHByb2Nlc3NSb3V0ZShyb3V0ZXMsIHNlbGVjdGVkLCBhcmdzKSB7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmICh0eXBlb2Ygcm91dGVzW3NlbGVjdGVkXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKHJvdXRlc1tzZWxlY3RlZF0ucHJvdG90eXBlIGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICByZXN1bHQgPSBuZXcgcm91dGVzW3NlbGVjdGVkXShhcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IHJvdXRlc1tzZWxlY3RlZF0oYXJncyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IHJvdXRlc1tzZWxlY3RlZF07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgc3RhdGljIGhhbmRsZUVycm9yKGVycm9yLCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBsaXN0ZW5lciwgcGF0aCwgcHJldiwgZm9yY2VSZWZyZXNoKSB7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlRXJyb3InLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGVycm9yLFxuICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgcHJldixcbiAgICAgICAgICB2aWV3OiBsaXN0ZW5lcixcbiAgICAgICAgICByb3V0ZXMsXG4gICAgICAgICAgc2VsZWN0ZWRcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gd2luWydkZXZNb2RlJ10gPyAnVW5leHBlY3RlZCBlcnJvcjogJyArIFN0cmluZyhlcnJvcikgOiAnVW5leHBlY3RlZCBlcnJvci4nO1xuICAgIGlmIChyb3V0ZXNbSW50ZXJuYWxFcnJvcl0pIHtcbiAgICAgIGFyZ3NbSW50ZXJuYWxFcnJvcl0gPSBlcnJvcjtcbiAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc1JvdXRlKHJvdXRlcywgSW50ZXJuYWxFcnJvciwgYXJncyk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCk7XG4gIH1cbiAgc3RhdGljIG1hdGNoKHBhdGgsIGxpc3RlbmVyLCBvcHRpb25zID0gZmFsc2UpIHtcbiAgICB2YXIgZXZlbnQgPSBudWxsLFxuICAgICAgcmVxdWVzdCA9IG51bGwsXG4gICAgICBmb3JjZVJlZnJlc2ggPSBmYWxzZTtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgZm9yY2VSZWZyZXNoID0gb3B0aW9ucztcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3JjZVJlZnJlc2ggPSBvcHRpb25zLmZvcmNlUmVmcmVzaDtcbiAgICAgIGV2ZW50ID0gb3B0aW9ucy5ldmVudDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5wYXRoID09PSBwYXRoICYmICFmb3JjZVJlZnJlc2gpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG9yaWdpbiA9ICdodHRwOi8vZXhhbXBsZS5jb20nO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBvcmlnaW4gPSB0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikgPyBvcmlnaW4gOiBsb2NhdGlvbi5vcmlnaW47XG4gICAgICB0aGlzLnF1ZXJ5U3RyaW5nID0gbG9jYXRpb24uc2VhcmNoO1xuICAgIH1cbiAgICB2YXIgdXJsID0gbmV3IFVSTChwYXRoLCBvcmlnaW4pO1xuICAgIHBhdGggPSB0aGlzLnBhdGggPSB1cmwucGF0aG5hbWU7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMucXVlcnlTdHJpbmcgPSB1cmwuc2VhcmNoO1xuICAgIH1cbiAgICB2YXIgcHJldiA9IHRoaXMucHJldlBhdGg7XG4gICAgdmFyIGN1cnJlbnQgPSBsaXN0ZW5lciAmJiBsaXN0ZW5lci5hcmdzID8gbGlzdGVuZXIuYXJncy5jb250ZW50IDogbnVsbDtcbiAgICB2YXIgcm91dGVzID0gdGhpcy5yb3V0ZXMgfHwgbGlzdGVuZXIgJiYgbGlzdGVuZXIucm91dGVzIHx8IF9Sb3V0ZXMuUm91dGVzLmR1bXAoKTtcbiAgICB2YXIgcXVlcnkgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHRoaXMucXVlcnlTdHJpbmcpO1xuICAgIGlmIChldmVudCAmJiBldmVudC5yZXF1ZXN0KSB7XG4gICAgICB0aGlzLnJlcXVlc3QgPSBldmVudC5yZXF1ZXN0O1xuICAgIH1cbiAgICBmb3IgKHZhciBrZXkgaW4gT2JqZWN0LmtleXModGhpcy5xdWVyeSkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLnF1ZXJ5W2tleV07XG4gICAgfVxuICAgIGZvciAodmFyIFtfa2V5LCB2YWx1ZV0gb2YgcXVlcnkpIHtcbiAgICAgIHRoaXMucXVlcnlbX2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgdmFyIGFyZ3MgPSB7fSxcbiAgICAgIHNlbGVjdGVkID0gZmFsc2UsXG4gICAgICByZXN1bHQgPSAnJztcbiAgICBpZiAocGF0aC5zdWJzdHJpbmcoMCwgMSkgPT09ICcvJykge1xuICAgICAgcGF0aCA9IHBhdGguc3Vic3RyaW5nKDEpO1xuICAgIH1cbiAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5xdWVyeSkge1xuICAgICAgYXJnc1tpXSA9IHRoaXMucXVlcnlbaV07XG4gICAgfVxuICAgIEwxOiBmb3IgKHZhciBfaSBpbiByb3V0ZXMpIHtcbiAgICAgIHZhciByb3V0ZSA9IF9pLnNwbGl0KCcvJyk7XG4gICAgICBpZiAocm91dGUubGVuZ3RoIDwgcGF0aC5sZW5ndGggJiYgcm91dGVbcm91dGUubGVuZ3RoIC0gMV0gIT09ICcqJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIEwyOiBmb3IgKHZhciBqIGluIHJvdXRlKSB7XG4gICAgICAgIGlmIChyb3V0ZVtqXS5zdWJzdHIoMCwgMSkgPT0gJyUnKSB7XG4gICAgICAgICAgdmFyIGFyZ05hbWUgPSBudWxsO1xuICAgICAgICAgIHZhciBncm91cHMgPSAvXiUoXFx3KylcXD8/Ly5leGVjKHJvdXRlW2pdKTtcbiAgICAgICAgICBpZiAoZ3JvdXBzICYmIGdyb3Vwc1sxXSkge1xuICAgICAgICAgICAgYXJnTmFtZSA9IGdyb3Vwc1sxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFhcmdOYW1lKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cm91dGVbal19IGlzIG5vdCBhIHZhbGlkIGFyZ3VtZW50IHNlZ21lbnQgaW4gcm91dGUgXCIke19pfVwiYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghcGF0aFtqXSkge1xuICAgICAgICAgICAgaWYgKHJvdXRlW2pdLnN1YnN0cihyb3V0ZVtqXS5sZW5ndGggLSAxLCAxKSA9PSAnPycpIHtcbiAgICAgICAgICAgICAgYXJnc1thcmdOYW1lXSA9ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGludWUgTDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFyZ3NbYXJnTmFtZV0gPSBwYXRoW2pdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyb3V0ZVtqXSAhPT0gJyonICYmIHBhdGhbal0gIT09IHJvdXRlW2pdKSB7XG4gICAgICAgICAgY29udGludWUgTDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNlbGVjdGVkID0gX2k7XG4gICAgICByZXN1bHQgPSByb3V0ZXNbX2ldO1xuICAgICAgaWYgKHJvdXRlW3JvdXRlLmxlbmd0aCAtIDFdID09PSAnKicpIHtcbiAgICAgICAgYXJncy5wYXRocGFydHMgPSBwYXRoLnNsaWNlKHJvdXRlLmxlbmd0aCAtIDEpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHZhciBldmVudFN0YXJ0ID0gbmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlU3RhcnQnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHBhdGgsXG4gICAgICAgIHByZXYsXG4gICAgICAgIHJvb3Q6IGxpc3RlbmVyLFxuICAgICAgICBzZWxlY3RlZCxcbiAgICAgICAgcm91dGVzXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGlmICghZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudFN0YXJ0KSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghZm9yY2VSZWZyZXNoICYmIGxpc3RlbmVyICYmIGN1cnJlbnQgJiYgdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcgJiYgY3VycmVudC5jb25zdHJ1Y3RvciA9PT0gcmVzdWx0LmNvbnN0cnVjdG9yICYmICEocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkgJiYgY3VycmVudC51cGRhdGUoYXJncykpIHtcbiAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudCA9IGN1cnJlbnQ7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCEoc2VsZWN0ZWQgaW4gcm91dGVzKSkge1xuICAgICAgcm91dGVzW3NlbGVjdGVkXSA9IHJvdXRlc1tOb3RGb3VuZEVycm9yXTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc1JvdXRlKHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzUm91dGUocm91dGVzLCBOb3RGb3VuZEVycm9yLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICghKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICBpZiAoIShyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQudGhlbihyZWFsUmVzdWx0ID0+IHRoaXMudXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZWFsUmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpKS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgIHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGxpc3RlbmVyLCBwYXRoLCBwcmV2LCBmb3JjZVJlZnJlc2gpO1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGxpc3RlbmVyLCBwYXRoLCBwcmV2LCBmb3JjZVJlZnJlc2gpO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgdXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCkge1xuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHByZXYgPSB0aGlzLnByZXZQYXRoO1xuICAgIHZhciBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZScsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgcmVzdWx0LFxuICAgICAgICBwYXRoLFxuICAgICAgICBwcmV2LFxuICAgICAgICB2aWV3OiBsaXN0ZW5lcixcbiAgICAgICAgcm91dGVzLFxuICAgICAgICBzZWxlY3RlZFxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICBpZiAobGlzdGVuZXIuYXJncy5jb250ZW50IGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQucGF1c2UodHJ1ZSk7XG4gICAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGlmIChkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KSkge1xuICAgICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQgPSByZXN1bHQ7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICByZXN1bHQucGF1c2UoZmFsc2UpO1xuICAgICAgICByZXN1bHQudXBkYXRlKGFyZ3MsIGZvcmNlUmVmcmVzaCk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBldmVudEVuZCA9IG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZUVuZCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgcmVzdWx0LFxuICAgICAgICBwYXRoLFxuICAgICAgICBwcmV2LFxuICAgICAgICB2aWV3OiBsaXN0ZW5lcixcbiAgICAgICAgcm91dGVzLFxuICAgICAgICBzZWxlY3RlZFxuICAgICAgfVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRFbmQpO1xuICB9XG4gIHN0YXRpYyBpc09yaWdpbkxpbWl0ZWQoe1xuICAgIG9yaWdpblxuICB9KSB7XG4gICAgcmV0dXJuIG9yaWdpbiA9PT0gJ251bGwnIHx8IG9yaWdpbiA9PT0gJ2ZpbGU6Ly8nO1xuICB9XG4gIHN0YXRpYyBxdWVyeU92ZXIoYXJncyA9IHt9KSB7XG4gICAgdmFyIHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKTtcbiAgICB2YXIgZmluYWxBcmdzID0ge307XG4gICAgdmFyIHF1ZXJ5ID0ge307XG4gICAgZm9yICh2YXIgcGFpciBvZiBwYXJhbXMpIHtcbiAgICAgIHF1ZXJ5W3BhaXJbMF1dID0gcGFpclsxXTtcbiAgICB9XG4gICAgZmluYWxBcmdzID0gT2JqZWN0LmFzc2lnbihmaW5hbEFyZ3MsIHF1ZXJ5LCBhcmdzKTtcbiAgICBkZWxldGUgZmluYWxBcmdzWydhcGknXTtcbiAgICByZXR1cm4gZmluYWxBcmdzO1xuXG4gICAgLy8gZm9yKGxldCBpIGluIHF1ZXJ5KVxuICAgIC8vIHtcbiAgICAvLyBcdGZpbmFsQXJnc1tpXSA9IHF1ZXJ5W2ldO1xuICAgIC8vIH1cblxuICAgIC8vIGZvcihsZXQgaSBpbiBhcmdzKVxuICAgIC8vIHtcbiAgICAvLyBcdGZpbmFsQXJnc1tpXSA9IGFyZ3NbaV07XG4gICAgLy8gfVxuICB9XG4gIHN0YXRpYyBxdWVyeVRvU3RyaW5nKGFyZ3MgPSB7fSwgZnJlc2ggPSBmYWxzZSkge1xuICAgIHZhciBwYXJ0cyA9IFtdLFxuICAgICAgZmluYWxBcmdzID0gYXJncztcbiAgICBpZiAoIWZyZXNoKSB7XG4gICAgICBmaW5hbEFyZ3MgPSB0aGlzLnF1ZXJ5T3ZlcihhcmdzKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiBmaW5hbEFyZ3MpIHtcbiAgICAgIGlmIChmaW5hbEFyZ3NbaV0gPT09ICcnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcGFydHMucHVzaChpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbmFsQXJnc1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gcGFydHMuam9pbignJicpO1xuICB9XG4gIHN0YXRpYyBzZXRRdWVyeShuYW1lLCB2YWx1ZSwgc2lsZW50KSB7XG4gICAgdmFyIGFyZ3MgPSB0aGlzLnF1ZXJ5T3ZlcigpO1xuICAgIGFyZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZGVsZXRlIGFyZ3NbbmFtZV07XG4gICAgfVxuICAgIHZhciBxdWVyeVN0cmluZyA9IHRoaXMucXVlcnlUb1N0cmluZyhhcmdzLCB0cnVlKTtcbiAgICB0aGlzLmdvKGxvY2F0aW9uLnBhdGhuYW1lICsgKHF1ZXJ5U3RyaW5nID8gJz8nICsgcXVlcnlTdHJpbmcgOiAnPycpLCBzaWxlbnQpO1xuICB9XG59XG5leHBvcnRzLlJvdXRlciA9IFJvdXRlcjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdxdWVyeScsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IHt9XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdoaXN0b3J5Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogW11cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3JvdXRlQ291bnQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IDBcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3ByZXZQYXRoJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiBudWxsXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdxdWVyeVN0cmluZycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogbnVsbFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAnSW50ZXJuYWxFcnJvcicsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEludGVybmFsRXJyb3Jcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ05vdEZvdW5kRXJyb3InLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBOb3RGb3VuZEVycm9yXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1JvdXRlcy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUm91dGVzID0gdm9pZCAwO1xudmFyIEFwcFJvdXRlcyA9IHt9O1xudmFyIF9yZXF1aXJlID0gcmVxdWlyZTtcbnZhciBpbXBvcnRlZCA9IGZhbHNlO1xudmFyIHJ1bkltcG9ydCA9ICgpID0+IHtcbiAgaWYgKGltcG9ydGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIDtcbiAgdHJ5IHtcbiAgICBPYmplY3QuYXNzaWduKEFwcFJvdXRlcywgX3JlcXVpcmUoJ1JvdXRlcycpLlJvdXRlcyB8fCB7fSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgZ2xvYmFsVGhpcy5kZXZNb2RlID09PSB0cnVlICYmIGNvbnNvbGUud2FybihlcnJvcik7XG4gIH1cbiAgaW1wb3J0ZWQgPSB0cnVlO1xufTtcbmNsYXNzIFJvdXRlcyB7XG4gIHN0YXRpYyBnZXQobmFtZSkge1xuICAgIHJ1bkltcG9ydCgpO1xuICAgIHJldHVybiB0aGlzLnJvdXRlc1tuYW1lXTtcbiAgfVxuICBzdGF0aWMgZHVtcCgpIHtcbiAgICBydW5JbXBvcnQoKTtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXM7XG4gIH1cbn1cbmV4cG9ydHMuUm91dGVzID0gUm91dGVzO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlcywgJ3JvdXRlcycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEFwcFJvdXRlc1xufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9SdWxlU2V0LmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5SdWxlU2V0ID0gdm9pZCAwO1xudmFyIF9Eb20gPSByZXF1aXJlKFwiLi9Eb21cIik7XG52YXIgX1RhZyA9IHJlcXVpcmUoXCIuL1RhZ1wiKTtcbnZhciBfVmlldyA9IHJlcXVpcmUoXCIuL1ZpZXdcIik7XG5jbGFzcyBSdWxlU2V0IHtcbiAgc3RhdGljIGFkZChzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmdsb2JhbFJ1bGVzID0gdGhpcy5nbG9iYWxSdWxlcyB8fCB7fTtcbiAgICB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXSA9IHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdIHx8IFtdO1xuICAgIHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdLnB1c2goY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHN0YXRpYyBhcHBseShkb2MgPSBkb2N1bWVudCwgdmlldyA9IG51bGwpIHtcbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiB0aGlzLmdsb2JhbFJ1bGVzKSB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdW2ldO1xuICAgICAgICB2YXIgd3JhcHBlZCA9IHRoaXMud3JhcChkb2MsIGNhbGxiYWNrLCB2aWV3KTtcbiAgICAgICAgdmFyIG5vZGVzID0gZG9jLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBmb3IgKHZhciBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgd3JhcHBlZChub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBhZGQoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5ydWxlcyA9IHRoaXMucnVsZXMgfHwge307XG4gICAgdGhpcy5ydWxlc1tzZWxlY3Rvcl0gPSB0aGlzLnJ1bGVzW3NlbGVjdG9yXSB8fCBbXTtcbiAgICB0aGlzLnJ1bGVzW3NlbGVjdG9yXS5wdXNoKGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBhcHBseShkb2MgPSBkb2N1bWVudCwgdmlldyA9IG51bGwpIHtcbiAgICBSdWxlU2V0LmFwcGx5KGRvYywgdmlldyk7XG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gdGhpcy5ydWxlcykge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnJ1bGVzW3NlbGVjdG9yXSkge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLnJ1bGVzW3NlbGVjdG9yXVtpXTtcbiAgICAgICAgdmFyIHdyYXBwZWQgPSBSdWxlU2V0LndyYXAoZG9jLCBjYWxsYmFjaywgdmlldyk7XG4gICAgICAgIHZhciBub2RlcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZm9yICh2YXIgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgIHdyYXBwZWQobm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcHVyZ2UoKSB7XG4gICAgaWYgKCF0aGlzLnJ1bGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAodmFyIFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnJ1bGVzKSkge1xuICAgICAgaWYgKCF0aGlzLnJ1bGVzW2tdKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIga2sgaW4gdGhpcy5ydWxlc1trXSkge1xuICAgICAgICBkZWxldGUgdGhpcy5ydWxlc1trXVtra107XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHN0YXRpYyB3YWl0KGV2ZW50ID0gJ0RPTUNvbnRlbnRMb2FkZWQnLCBub2RlID0gZG9jdW1lbnQpIHtcbiAgICB2YXIgbGlzdGVuZXIgPSAoKGV2ZW50LCBub2RlKSA9PiAoKSA9PiB7XG4gICAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzLmFwcGx5KCk7XG4gICAgfSkoZXZlbnQsIG5vZGUpO1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICB9XG4gIHN0YXRpYyB3cmFwKGRvYywgb3JpZ2luYWxDYWxsYmFjaywgdmlldyA9IG51bGwpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBvcmlnaW5hbENhbGxiYWNrO1xuICAgIGlmIChvcmlnaW5hbENhbGxiYWNrIGluc3RhbmNlb2YgX1ZpZXcuVmlldyB8fCBvcmlnaW5hbENhbGxiYWNrICYmIG9yaWdpbmFsQ2FsbGJhY2sucHJvdG90eXBlICYmIG9yaWdpbmFsQ2FsbGJhY2sucHJvdG90eXBlIGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgY2FsbGJhY2sgPSAoKSA9PiBvcmlnaW5hbENhbGxiYWNrO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudCA9PiB7XG4gICAgICBpZiAodHlwZW9mIGVsZW1lbnQuX19fY3ZBcHBsaWVkX19fID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZWxlbWVudCwgJ19fX2N2QXBwbGllZF9fXycsIHtcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgICAgdmFsdWU6IG5ldyBXZWFrU2V0KClcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoZWxlbWVudC5fX19jdkFwcGxpZWRfX18uaGFzKG9yaWdpbmFsQ2FsbGJhY2spKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBkaXJlY3QsIHBhcmVudFZpZXc7XG4gICAgICBpZiAodmlldykge1xuICAgICAgICBkaXJlY3QgPSBwYXJlbnRWaWV3ID0gdmlldztcbiAgICAgICAgaWYgKHZpZXcudmlld0xpc3QpIHtcbiAgICAgICAgICBwYXJlbnRWaWV3ID0gdmlldy52aWV3TGlzdC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciB0YWcgPSBuZXcgX1RhZy5UYWcoZWxlbWVudCwgcGFyZW50VmlldywgbnVsbCwgdW5kZWZpbmVkLCBkaXJlY3QpO1xuICAgICAgdmFyIHBhcmVudCA9IHRhZy5lbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICB2YXIgc2libGluZyA9IHRhZy5lbGVtZW50Lm5leHRTaWJsaW5nO1xuICAgICAgdmFyIHJlc3VsdCA9IGNhbGxiYWNrKHRhZyk7XG4gICAgICBpZiAocmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgICBlbGVtZW50Ll9fX2N2QXBwbGllZF9fXy5hZGQob3JpZ2luYWxDYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IF9UYWcuVGFnKHJlc3VsdCk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgICAgaWYgKCFyZXN1bHQuZWxlbWVudC5jb250YWlucyh0YWcuZWxlbWVudCkpIHtcbiAgICAgICAgICB3aGlsZSAodGFnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgcmVzdWx0LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGFnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2libGluZykge1xuICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUocmVzdWx0LmVsZW1lbnQsIHNpYmxpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChyZXN1bHQuZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnByb3RvdHlwZSAmJiByZXN1bHQucHJvdG90eXBlIGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICByZXN1bHQgPSBuZXcgcmVzdWx0KHt9LCB2aWV3KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgdmlldy5jbGVhbnVwLnB1c2goKCkgPT4gcmVzdWx0LnJlbW92ZSgpKTtcbiAgICAgICAgICB2aWV3LmNsZWFudXAucHVzaCh2aWV3LmFyZ3MuYmluZFRvKCh2LCBrLCB0KSA9PiB7XG4gICAgICAgICAgICB0W2tdID0gdjtcbiAgICAgICAgICAgIHJlc3VsdC5hcmdzW2tdID0gdjtcbiAgICAgICAgICB9KSk7XG4gICAgICAgICAgdmlldy5jbGVhbnVwLnB1c2gocmVzdWx0LmFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgICB0W2tdID0gdjtcbiAgICAgICAgICAgIHZpZXcuYXJnc1trXSA9IHY7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIHRhZy5jbGVhcigpO1xuICAgICAgICByZXN1bHQucmVuZGVyKHRhZy5lbGVtZW50KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG5leHBvcnRzLlJ1bGVTZXQgPSBSdWxlU2V0O1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5TZXRNYXAgPSB2b2lkIDA7XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkoZSwgciwgdCkgeyByZXR1cm4gKHIgPSBfdG9Qcm9wZXJ0eUtleShyKSkgaW4gZSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCByLCB7IHZhbHVlOiB0LCBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwIH0pIDogZVtyXSA9IHQsIGU7IH1cbmZ1bmN0aW9uIF90b1Byb3BlcnR5S2V5KHQpIHsgdmFyIGkgPSBfdG9QcmltaXRpdmUodCwgXCJzdHJpbmdcIik7IHJldHVybiBcInN5bWJvbFwiID09IHR5cGVvZiBpID8gaSA6IGkgKyBcIlwiOyB9XG5mdW5jdGlvbiBfdG9QcmltaXRpdmUodCwgcikgeyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgdCB8fCAhdCkgcmV0dXJuIHQ7IHZhciBlID0gdFtTeW1ib2wudG9QcmltaXRpdmVdOyBpZiAodm9pZCAwICE9PSBlKSB7IHZhciBpID0gZS5jYWxsKHQsIHIgfHwgXCJkZWZhdWx0XCIpOyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgaSkgcmV0dXJuIGk7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJAQHRvUHJpbWl0aXZlIG11c3QgcmV0dXJuIGEgcHJpbWl0aXZlIHZhbHVlLlwiKTsgfSByZXR1cm4gKFwic3RyaW5nXCIgPT09IHIgPyBTdHJpbmcgOiBOdW1iZXIpKHQpOyB9XG5jbGFzcyBTZXRNYXAge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBfZGVmaW5lUHJvcGVydHkodGhpcywgXCJfbWFwXCIsIG5ldyBNYXAoKSk7XG4gIH1cbiAgaGFzKGtleSkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuaGFzKGtleSk7XG4gIH1cbiAgZ2V0KGtleSkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuZ2V0KGtleSk7XG4gIH1cbiAgZ2V0T25lKGtleSkge1xuICAgIHZhciBzZXQgPSB0aGlzLmdldChrZXkpO1xuICAgIGZvciAodmFyIGVudHJ5IG9mIHNldCkge1xuICAgICAgcmV0dXJuIGVudHJ5O1xuICAgIH1cbiAgfVxuICBhZGQoa2V5LCB2YWx1ZSkge1xuICAgIHZhciBzZXQgPSB0aGlzLl9tYXAuZ2V0KGtleSk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHRoaXMuX21hcC5zZXQoa2V5LCBzZXQgPSBuZXcgU2V0KCkpO1xuICAgIH1cbiAgICByZXR1cm4gc2V0LmFkZCh2YWx1ZSk7XG4gIH1cbiAgcmVtb3ZlKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy5fbWFwLmdldChrZXkpO1xuICAgIGlmICghc2V0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXMgPSBzZXQuZGVsZXRlKHZhbHVlKTtcbiAgICBpZiAoIXNldC5zaXplKSB7XG4gICAgICB0aGlzLl9tYXAuZGVsZXRlKGtleSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cbiAgdmFsdWVzKCkge1xuICAgIHJldHVybiBuZXcgU2V0KC4uLlsuLi50aGlzLl9tYXAudmFsdWVzKCldLm1hcChzZXQgPT4gWy4uLnNldC52YWx1ZXMoKV0pKTtcbiAgfVxufVxuZXhwb3J0cy5TZXRNYXAgPSBTZXRNYXA7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9UYWcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlRhZyA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBDdXJyZW50U3R5bGUgPSBTeW1ib2woJ0N1cnJlbnRTdHlsZScpO1xudmFyIEN1cnJlbnRBdHRycyA9IFN5bWJvbCgnQ3VycmVudEF0dHJzJyk7XG52YXIgc3R5bGVyID0gZnVuY3Rpb24gKHN0eWxlcykge1xuICBpZiAoIXRoaXMubm9kZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdHlsZXMpIHtcbiAgICB2YXIgc3RyaW5nZWRQcm9wZXJ0eSA9IFN0cmluZyhzdHlsZXNbcHJvcGVydHldKTtcbiAgICBpZiAodGhpc1tDdXJyZW50U3R5bGVdLmhhcyhwcm9wZXJ0eSkgJiYgdGhpc1tDdXJyZW50U3R5bGVdLmdldChwcm9wZXJ0eSkgPT09IHN0eWxlc1twcm9wZXJ0eV0gfHwgTnVtYmVyLmlzTmFOKHN0eWxlc1twcm9wZXJ0eV0pKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKHByb3BlcnR5WzBdID09PSAnLScpIHtcbiAgICAgIHRoaXMubm9kZS5zdHlsZS5zZXRQcm9wZXJ0eShwcm9wZXJ0eSwgc3RyaW5nZWRQcm9wZXJ0eSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubm9kZS5zdHlsZVtwcm9wZXJ0eV0gPSBzdHJpbmdlZFByb3BlcnR5O1xuICAgIH1cbiAgICBpZiAoc3R5bGVzW3Byb3BlcnR5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uc2V0KHByb3BlcnR5LCBzdHlsZXNbcHJvcGVydHldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLmRlbGV0ZShwcm9wZXJ0eSk7XG4gICAgfVxuICB9XG59O1xudmFyIGdldHRlciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIGlmICh0eXBlb2YgdGhpc1tuYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0aGlzW25hbWVdO1xuICB9XG4gIGlmICh0aGlzLm5vZGUgJiYgdHlwZW9mIHRoaXMubm9kZVtuYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0aGlzW25hbWVdID0gKC4uLmFyZ3MpID0+IHRoaXMubm9kZVtuYW1lXSguLi5hcmdzKTtcbiAgfVxuICBpZiAobmFtZSA9PT0gJ3N0eWxlJykge1xuICAgIHJldHVybiB0aGlzLnByb3h5LnN0eWxlO1xuICB9XG4gIGlmICh0aGlzLm5vZGUgJiYgbmFtZSBpbiB0aGlzLm5vZGUpIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlW25hbWVdO1xuICB9XG4gIHJldHVybiB0aGlzW25hbWVdO1xufTtcbmNsYXNzIFRhZyB7XG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIHBhcmVudCwgcmVmLCBpbmRleCwgZGlyZWN0KSB7XG4gICAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgdmFyIHN1YmRvYyA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KGVsZW1lbnQpO1xuICAgICAgZWxlbWVudCA9IHN1YmRvYy5maXJzdENoaWxkO1xuICAgIH1cbiAgICB0aGlzLmVsZW1lbnQgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKGVsZW1lbnQpO1xuICAgIHRoaXMubm9kZSA9IHRoaXMuZWxlbWVudDtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLmRpcmVjdCA9IGRpcmVjdDtcbiAgICB0aGlzLnJlZiA9IHJlZjtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5jbGVhbnVwID0gW107XG4gICAgdGhpc1tfQmluZGFibGUuQmluZGFibGUuT25BbGxHZXRdID0gZ2V0dGVyLmJpbmQodGhpcyk7XG4gICAgdGhpc1tDdXJyZW50U3R5bGVdID0gbmV3IE1hcCgpO1xuICAgIHRoaXNbQ3VycmVudEF0dHJzXSA9IG5ldyBNYXAoKTtcbiAgICB2YXIgYm91bmRTdHlsZXIgPSBfQmluZGFibGUuQmluZGFibGUubWFrZShzdHlsZXIuYmluZCh0aGlzKSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdzdHlsZScsIHtcbiAgICAgIHZhbHVlOiBib3VuZFN0eWxlclxuICAgIH0pO1xuICAgIHRoaXMucHJveHkgPSBfQmluZGFibGUuQmluZGFibGUubWFrZSh0aGlzKTtcbiAgICB0aGlzLnByb3h5LnN0eWxlLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgaWYgKHRoaXNbQ3VycmVudFN0eWxlXS5oYXMoaykgJiYgdGhpc1tDdXJyZW50U3R5bGVdLmdldChrKSA9PT0gdikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLm5vZGUuc3R5bGVba10gPSB2O1xuICAgICAgaWYgKCFkICYmIHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uc2V0KGssIHYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLmRlbGV0ZShrKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnByb3h5LmJpbmRUbygodiwgaykgPT4ge1xuICAgICAgaWYgKGsgPT09ICdpbmRleCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGsgaW4gZWxlbWVudCAmJiBlbGVtZW50W2tdICE9PSB2KSB7XG4gICAgICAgIGVsZW1lbnRba10gPSB2O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnByb3h5O1xuICB9XG4gIGF0dHIoYXR0cmlidXRlcykge1xuICAgIGZvciAodmFyIGF0dHJpYnV0ZSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICBpZiAodGhpc1tDdXJyZW50QXR0cnNdLmhhcyhhdHRyaWJ1dGUpICYmIGF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgICAgICAgdGhpc1tDdXJyZW50QXR0cnNdLmRlbGV0ZShhdHRyaWJ1dGUpO1xuICAgICAgfSBlbHNlIGlmICghdGhpc1tDdXJyZW50QXR0cnNdLmhhcyhhdHRyaWJ1dGUpIHx8IHRoaXNbQ3VycmVudEF0dHJzXS5nZXQoYXR0cmlidXRlKSAhPT0gYXR0cmlidXRlc1thdHRyaWJ1dGVdKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLm5vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZSwgJycpO1xuICAgICAgICAgIHRoaXNbQ3VycmVudEF0dHJzXS5zZXQoYXR0cmlidXRlLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5ub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsIGF0dHJpYnV0ZXNbYXR0cmlidXRlXSk7XG4gICAgICAgICAgdGhpc1tDdXJyZW50QXR0cnNdLnNldChhdHRyaWJ1dGUsIGF0dHJpYnV0ZXNbYXR0cmlidXRlXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgcmVtb3ZlKCkge1xuICAgIGlmICh0aGlzLm5vZGUpIHtcbiAgICAgIHRoaXMubm9kZS5yZW1vdmUoKTtcbiAgICB9XG4gICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcyk7XG4gICAgdmFyIGNsZWFudXA7XG4gICAgd2hpbGUgKGNsZWFudXAgPSB0aGlzLmNsZWFudXAuc2hpZnQoKSkge1xuICAgICAgY2xlYW51cCgpO1xuICAgIH1cbiAgICB0aGlzLmNsZWFyKCk7XG4gICAgaWYgKCF0aGlzLm5vZGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGRldGFjaEV2ZW50ID0gbmV3IEV2ZW50KCdjdkRvbURldGFjaGVkJyk7XG4gICAgdGhpcy5ub2RlLmRpc3BhdGNoRXZlbnQoZGV0YWNoRXZlbnQpO1xuICAgIHRoaXMubm9kZSA9IHRoaXMuZWxlbWVudCA9IHRoaXMucmVmID0gdGhpcy5wYXJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cbiAgY2xlYXIoKSB7XG4gICAgaWYgKCF0aGlzLm5vZGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGRldGFjaEV2ZW50ID0gbmV3IEV2ZW50KCdjdkRvbURldGFjaGVkJyk7XG4gICAgd2hpbGUgKHRoaXMubm9kZS5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLm5vZGUuZmlyc3RDaGlsZC5kaXNwYXRjaEV2ZW50KGRldGFjaEV2ZW50KTtcbiAgICAgIHRoaXMubm9kZS5yZW1vdmVDaGlsZCh0aGlzLm5vZGUuZmlyc3RDaGlsZCk7XG4gICAgfVxuICB9XG4gIHBhdXNlKHBhdXNlZCA9IHRydWUpIHt9XG4gIGxpc3RlbihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLm5vZGU7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIHZhciByZW1vdmUgPSAoKSA9PiB7XG4gICAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB2YXIgcmVtb3ZlciA9ICgpID0+IHtcbiAgICAgIHJlbW92ZSgpO1xuICAgICAgcmVtb3ZlID0gKCkgPT4gY29uc29sZS53YXJuKCdBbHJlYWR5IHJlbW92ZWQhJyk7XG4gICAgfTtcbiAgICB0aGlzLnBhcmVudC5vblJlbW92ZSgoKSA9PiByZW1vdmVyKCkpO1xuICAgIHJldHVybiByZW1vdmVyO1xuICB9XG59XG5leHBvcnRzLlRhZyA9IFRhZztcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1V1aWQuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlV1aWQgPSB2b2lkIDA7XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkoZSwgciwgdCkgeyByZXR1cm4gKHIgPSBfdG9Qcm9wZXJ0eUtleShyKSkgaW4gZSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCByLCB7IHZhbHVlOiB0LCBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwIH0pIDogZVtyXSA9IHQsIGU7IH1cbmZ1bmN0aW9uIF90b1Byb3BlcnR5S2V5KHQpIHsgdmFyIGkgPSBfdG9QcmltaXRpdmUodCwgXCJzdHJpbmdcIik7IHJldHVybiBcInN5bWJvbFwiID09IHR5cGVvZiBpID8gaSA6IGkgKyBcIlwiOyB9XG5mdW5jdGlvbiBfdG9QcmltaXRpdmUodCwgcikgeyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgdCB8fCAhdCkgcmV0dXJuIHQ7IHZhciBlID0gdFtTeW1ib2wudG9QcmltaXRpdmVdOyBpZiAodm9pZCAwICE9PSBlKSB7IHZhciBpID0gZS5jYWxsKHQsIHIgfHwgXCJkZWZhdWx0XCIpOyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgaSkgcmV0dXJuIGk7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJAQHRvUHJpbWl0aXZlIG11c3QgcmV0dXJuIGEgcHJpbWl0aXZlIHZhbHVlLlwiKTsgfSByZXR1cm4gKFwic3RyaW5nXCIgPT09IHIgPyBTdHJpbmcgOiBOdW1iZXIpKHQpOyB9XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbnZhciBjcnlwdG8gPSB3aW4uY3J5cHRvO1xuY2xhc3MgVXVpZCB7XG4gIGNvbnN0cnVjdG9yKHV1aWQgPSBudWxsLCB2ZXJzaW9uID0gNCkge1xuICAgIF9kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInV1aWRcIiwgbnVsbCk7XG4gICAgX2RlZmluZVByb3BlcnR5KHRoaXMsIFwidmVyc2lvblwiLCA0KTtcbiAgICBpZiAodXVpZCkge1xuICAgICAgaWYgKHR5cGVvZiB1dWlkICE9PSAnc3RyaW5nJyAmJiAhKHV1aWQgaW5zdGFuY2VvZiBVdWlkKSB8fCAhdXVpZC5tYXRjaCgvWzAtOUEtRmEtZl17OH0oLVswLTlBLUZhLWZdezR9KXszfS1bMC05QS1GYS1mXXsxMn0vKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgaW5wdXQgZm9yIFV1aWQ6IFwiJHt1dWlkfVwiYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnZlcnNpb24gPSB2ZXJzaW9uO1xuICAgICAgdGhpcy51dWlkID0gdXVpZDtcbiAgICB9IGVsc2UgaWYgKGNyeXB0byAmJiB0eXBlb2YgY3J5cHRvLnJhbmRvbVVVSUQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMudXVpZCA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBpbml0ID0gWzFlN10gKyAtMWUzICsgLTRlMyArIC04ZTMgKyAtMWUxMTtcbiAgICAgIHZhciByYW5kID0gY3J5cHRvICYmIHR5cGVvZiBjcnlwdG8ucmFuZG9tVVVJRCA9PT0gJ2Z1bmN0aW9uJyA/ICgpID0+IGNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQ4QXJyYXkoMSkpWzBdIDogKCkgPT4gTWF0aC50cnVuYyhNYXRoLnJhbmRvbSgpICogMjU2KTtcbiAgICAgIHRoaXMudXVpZCA9IGluaXQucmVwbGFjZSgvWzAxOF0vZywgYyA9PiAoYyBeIHJhbmQoKSAmIDE1ID4+IGMgLyA0KS50b1N0cmluZygxNikpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9XG4gIFtTeW1ib2wudG9QcmltaXRpdmVdKCkge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMudXVpZDtcbiAgfVxuICB0b0pzb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZlcnNpb246IHRoaXMudmVyc2lvbixcbiAgICAgIHV1aWQ6IHRoaXMudXVpZFxuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuVXVpZCA9IFV1aWQ7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9WaWV3LmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5WaWV3ID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIF9WaWV3TGlzdCA9IHJlcXVpcmUoXCIuL1ZpZXdMaXN0XCIpO1xudmFyIF9Sb3V0ZXIgPSByZXF1aXJlKFwiLi9Sb3V0ZXJcIik7XG52YXIgX1V1aWQgPSByZXF1aXJlKFwiLi9VdWlkXCIpO1xudmFyIF9Eb20gPSByZXF1aXJlKFwiLi9Eb21cIik7XG52YXIgX1RhZyA9IHJlcXVpcmUoXCIuL1RhZ1wiKTtcbnZhciBfQmFnID0gcmVxdWlyZShcIi4vQmFnXCIpO1xudmFyIF9SdWxlU2V0ID0gcmVxdWlyZShcIi4vUnVsZVNldFwiKTtcbnZhciBfTWl4aW4gPSByZXF1aXJlKFwiLi9NaXhpblwiKTtcbnZhciBfRXZlbnRUYXJnZXRNaXhpbiA9IHJlcXVpcmUoXCIuLi9taXhpbi9FdmVudFRhcmdldE1peGluXCIpO1xudmFyIGRvbnRQYXJzZSA9IFN5bWJvbCgnZG9udFBhcnNlJyk7XG52YXIgZXhwYW5kQmluZCA9IFN5bWJvbCgnZXhwYW5kQmluZCcpO1xudmFyIHV1aWQgPSBTeW1ib2woJ3V1aWQnKTtcbmNsYXNzIFZpZXcgZXh0ZW5kcyBfTWl4aW4uTWl4aW4ud2l0aChfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluKSB7XG4gIGdldCBfaWQoKSB7XG4gICAgcmV0dXJuIHRoaXNbdXVpZF07XG4gIH1cbiAgc3RhdGljIGZyb20odGVtcGxhdGUsIGFyZ3MgPSB7fSwgbWFpblZpZXcgPSBudWxsKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgdGhpcyhhcmdzLCBtYWluVmlldyk7XG4gICAgdmlldy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHJldHVybiB2aWV3O1xuICB9XG4gIGNvbnN0cnVjdG9yKGFyZ3MgPSB7fSwgbWFpblZpZXcgPSBudWxsKSB7XG4gICAgc3VwZXIoYXJncywgbWFpblZpZXcpO1xuICAgIHRoaXNbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gbWFpblZpZXc7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhcmdzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKGFyZ3MpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHV1aWQsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNvbnN0cnVjdG9yLnV1aWQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm9kZXNBdHRhY2hlZCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX0JhZy5CYWcoKGksIHMsIGEpID0+IHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm9kZXNEZXRhY2hlZCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX0JhZy5CYWcoKGksIHMsIGEpID0+IHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX29uUmVtb3ZlJywge1xuICAgICAgdmFsdWU6IG5ldyBfQmFnLkJhZygoaSwgcywgYSkgPT4ge30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjbGVhbnVwJywge1xuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwYXJlbnQnLCB7XG4gICAgICB2YWx1ZTogbWFpblZpZXcsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndmlld3MnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd2aWV3TGlzdHMnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd3aXRoVmlld3MnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd0YWdzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm9kZXMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoW10pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd0aW1lb3V0cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ludGVydmFscycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ZyYW1lcycsIHtcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncnVsZVNldCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX1J1bGVTZXQuUnVsZVNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVSdWxlU2V0Jywge1xuICAgICAgdmFsdWU6IG5ldyBfUnVsZVNldC5SdWxlU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N1YkJpbmRpbmdzJywge1xuICAgICAgdmFsdWU6IHt9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd0ZW1wbGF0ZXMnLCB7XG4gICAgICB2YWx1ZToge31cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3Bvc3RNYXBwaW5nJywge1xuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZXZlbnRDbGVhbnVwJywge1xuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd1bnBhdXNlQ2FsbGJhY2tzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaW50ZXJwb2xhdGVSZWdleCcsIHtcbiAgICAgIHZhbHVlOiAvKFxcW1xcWygoPzpcXCQrKT9bXFx3XFwuXFx8LV0rKVxcXVxcXSkvZ1xuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVuZGVyZWQnLCB7XG4gICAgICB2YWx1ZTogbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KSA9PiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbmRlckNvbXBsZXRlJywge1xuICAgICAgICB2YWx1ZTogYWNjZXB0XG4gICAgICB9KSlcbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIGlmICghdGhpc1tfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpc1tfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSBudWxsO1xuICAgIH0pO1xuICAgIHRoaXMuY29udHJvbGxlciA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IGBgO1xuICAgIHRoaXMuZmlyc3ROb2RlID0gbnVsbDtcbiAgICB0aGlzLmxhc3ROb2RlID0gbnVsbDtcbiAgICB0aGlzLnZpZXdMaXN0ID0gbnVsbDtcbiAgICB0aGlzLm1haW5WaWV3ID0gbnVsbDtcbiAgICB0aGlzLnByZXNlcnZlID0gZmFsc2U7XG4gICAgdGhpcy5yZW1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5sb2FkZWQgPSBQcm9taXNlLnJlc29sdmUodGhpcyk7XG5cbiAgICAvLyByZXR1cm4gQmluZGFibGUubWFrZSh0aGlzKTtcbiAgfVxuICBzdGF0aWMgaXNWaWV3KCkge1xuICAgIHJldHVybiBWaWV3O1xuICB9XG4gIG9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICB2YXIgc3RvcHBlZCA9IGZhbHNlO1xuICAgIHZhciBjYW5jZWwgPSAoKSA9PiB7XG4gICAgICBzdG9wcGVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIHZhciBjID0gdGltZXN0YW1wID0+IHtcbiAgICAgIGlmICh0aGlzLnJlbW92ZWQgfHwgc3RvcHBlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgICAgIGNhbGxiYWNrKERhdGUubm93KCkpO1xuICAgICAgfVxuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGMpO1xuICAgIH07XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGMoRGF0ZS5ub3coKSkpO1xuICAgIHRoaXMuZnJhbWVzLnB1c2goY2FuY2VsKTtcbiAgICByZXR1cm4gY2FuY2VsO1xuICB9XG4gIG9uTmV4dEZyYW1lKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSk7XG4gIH1cbiAgb25JZGxlKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHJlcXVlc3RJZGxlQ2FsbGJhY2soKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSkpO1xuICB9XG4gIG9uVGltZW91dCh0aW1lLCBjYWxsYmFjaykge1xuICAgIHZhciB0aW1lb3V0SW5mbyA9IHtcbiAgICAgIHRpbWVvdXQ6IG51bGwsXG4gICAgICBjYWxsYmFjazogbnVsbCxcbiAgICAgIHRpbWU6IHRpbWUsXG4gICAgICBmaXJlZDogZmFsc2UsXG4gICAgICBjcmVhdGVkOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgIHBhdXNlZDogZmFsc2VcbiAgICB9O1xuICAgIHZhciB3cmFwcGVkQ2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgICAgdGltZW91dEluZm8uZmlyZWQgPSB0cnVlO1xuICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dEluZm8udGltZW91dCk7XG4gICAgfTtcbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQod3JhcHBlZENhbGxiYWNrLCB0aW1lKTtcbiAgICB0aW1lb3V0SW5mby5jYWxsYmFjayA9IHdyYXBwZWRDYWxsYmFjaztcbiAgICB0aW1lb3V0SW5mby50aW1lb3V0ID0gdGltZW91dDtcbiAgICB0aGlzLnRpbWVvdXRzLnNldCh0aW1lb3V0SW5mby50aW1lb3V0LCB0aW1lb3V0SW5mbyk7XG4gICAgcmV0dXJuIHRpbWVvdXQ7XG4gIH1cbiAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpIHtcbiAgICBpZiAoIXRoaXMudGltZW91dHMuaGFzKHRpbWVvdXQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0SW5mbyA9IHRoaXMudGltZW91dHMuZ2V0KHRpbWVvdXQpO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgfVxuICBvbkludGVydmFsKHRpbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRJbnRlcnZhbChjYWxsYmFjaywgdGltZSk7XG4gICAgdGhpcy5pbnRlcnZhbHMuc2V0KHRpbWVvdXQsIHtcbiAgICAgIHRpbWVvdXQ6IHRpbWVvdXQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICB0aW1lOiB0aW1lLFxuICAgICAgcGF1c2VkOiBmYWxzZVxuICAgIH0pO1xuICAgIHJldHVybiB0aW1lb3V0O1xuICB9XG4gIGNsZWFySW50ZXJ2YWwodGltZW91dCkge1xuICAgIGlmICghdGhpcy5pbnRlcnZhbHMuaGFzKHRpbWVvdXQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0SW5mbyA9IHRoaXMuaW50ZXJ2YWxzLmdldCh0aW1lb3V0KTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dEluZm8udGltZW91dCk7XG4gICAgdGhpcy5pbnRlcnZhbHMuZGVsZXRlKHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICB9XG4gIHBhdXNlKHBhdXNlZCA9IHVuZGVmaW5lZCkge1xuICAgIGlmIChwYXVzZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wYXVzZWQgPSAhdGhpcy5wYXVzZWQ7XG4gICAgfVxuICAgIHRoaXMucGF1c2VkID0gcGF1c2VkO1xuICAgIGlmICh0aGlzLnBhdXNlZCkge1xuICAgICAgZm9yICh2YXIgW2NhbGxiYWNrLCB0aW1lb3V0XSBvZiB0aGlzLnRpbWVvdXRzKSB7XG4gICAgICAgIGlmICh0aW1lb3V0LmZpcmVkKSB7XG4gICAgICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dC50aW1lb3V0KTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dC50aW1lb3V0KTtcbiAgICAgICAgdGltZW91dC5wYXVzZWQgPSB0cnVlO1xuICAgICAgICB0aW1lb3V0LnRpbWUgPSBNYXRoLm1heCgwLCB0aW1lb3V0LnRpbWUgLSAoRGF0ZS5ub3coKSAtIHRpbWVvdXQuY3JlYXRlZCkpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgW19jYWxsYmFjaywgX3RpbWVvdXRdIG9mIHRoaXMuaW50ZXJ2YWxzKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoX3RpbWVvdXQudGltZW91dCk7XG4gICAgICAgIF90aW1lb3V0LnBhdXNlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIFtfY2FsbGJhY2syLCBfdGltZW91dDJdIG9mIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgaWYgKCFfdGltZW91dDIucGF1c2VkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF90aW1lb3V0Mi5maXJlZCkge1xuICAgICAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKF90aW1lb3V0Mi50aW1lb3V0KTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBfdGltZW91dDIudGltZW91dCA9IHNldFRpbWVvdXQoX3RpbWVvdXQyLmNhbGxiYWNrLCBfdGltZW91dDIudGltZSk7XG4gICAgICAgIF90aW1lb3V0Mi5wYXVzZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIFtfY2FsbGJhY2szLCBfdGltZW91dDNdIG9mIHRoaXMuaW50ZXJ2YWxzKSB7XG4gICAgICAgIGlmICghX3RpbWVvdXQzLnBhdXNlZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIF90aW1lb3V0My50aW1lb3V0ID0gc2V0SW50ZXJ2YWwoX3RpbWVvdXQzLmNhbGxiYWNrLCBfdGltZW91dDMudGltZSk7XG4gICAgICAgIF90aW1lb3V0My5wYXVzZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIFssIF9jYWxsYmFjazRdIG9mIHRoaXMudW5wYXVzZUNhbGxiYWNrcykge1xuICAgICAgICBfY2FsbGJhY2s0KCk7XG4gICAgICB9XG4gICAgICB0aGlzLnVucGF1c2VDYWxsYmFja3MuY2xlYXIoKTtcbiAgICB9XG4gICAgZm9yICh2YXIgW3RhZywgdmlld0xpc3RdIG9mIHRoaXMudmlld0xpc3RzKSB7XG4gICAgICB2aWV3TGlzdC5wYXVzZSghIXBhdXNlZCk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy50YWdzKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLnRhZ3NbaV0pKSB7XG4gICAgICAgIGZvciAodmFyIGogaW4gdGhpcy50YWdzW2ldKSB7XG4gICAgICAgICAgdGhpcy50YWdzW2ldW2pdLnBhdXNlKCEhcGF1c2VkKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMudGFnc1tpXS5wYXVzZSghIXBhdXNlZCk7XG4gICAgfVxuICB9XG4gIHJlbmRlcihwYXJlbnROb2RlID0gbnVsbCwgaW5zZXJ0UG9pbnQgPSBudWxsLCBvdXRlclZpZXcgPSBudWxsKSB7XG4gICAgdmFyIHtcbiAgICAgIGRvY3VtZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIGlmIChwYXJlbnROb2RlIGluc3RhbmNlb2YgVmlldykge1xuICAgICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUuZmlyc3ROb2RlLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIGlmIChpbnNlcnRQb2ludCBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgIGluc2VydFBvaW50ID0gaW5zZXJ0UG9pbnQuZmlyc3ROb2RlO1xuICAgIH1cbiAgICBpZiAodGhpcy5maXJzdE5vZGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlUmVuZGVyKHBhcmVudE5vZGUsIGluc2VydFBvaW50LCBvdXRlclZpZXcpO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW5kZXInKSk7XG4gICAgdmFyIHRlbXBsYXRlSXNGcmFnbWVudCA9IHR5cGVvZiB0aGlzLnRlbXBsYXRlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGhpcy50ZW1wbGF0ZS5jbG9uZU5vZGUgPT09ICdmdW5jdGlvbic7XG4gICAgdmFyIHRlbXBsYXRlUGFyc2VkID0gdGVtcGxhdGVJc0ZyYWdtZW50IHx8IFZpZXcudGVtcGxhdGVzLmhhcyh0aGlzLnRlbXBsYXRlKTtcbiAgICB2YXIgc3ViRG9jO1xuICAgIGlmICh0ZW1wbGF0ZVBhcnNlZCkge1xuICAgICAgaWYgKHRlbXBsYXRlSXNGcmFnbWVudCkge1xuICAgICAgICBzdWJEb2MgPSB0aGlzLnRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN1YkRvYyA9IFZpZXcudGVtcGxhdGVzLmdldCh0aGlzLnRlbXBsYXRlKS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1YkRvYyA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHRoaXMudGVtcGxhdGUpO1xuICAgIH1cbiAgICBpZiAoIXRlbXBsYXRlUGFyc2VkICYmICF0ZW1wbGF0ZUlzRnJhZ21lbnQpIHtcbiAgICAgIFZpZXcudGVtcGxhdGVzLnNldCh0aGlzLnRlbXBsYXRlLCBzdWJEb2MuY2xvbmVOb2RlKHRydWUpKTtcbiAgICB9XG4gICAgdGhpcy5tYWluVmlldyB8fCB0aGlzLnByZVJ1bGVTZXQuYXBwbHkoc3ViRG9jLCB0aGlzKTtcbiAgICB0aGlzLm1hcFRhZ3Moc3ViRG9jKTtcbiAgICB0aGlzLm1haW5WaWV3IHx8IHRoaXMucnVsZVNldC5hcHBseShzdWJEb2MsIHRoaXMpO1xuICAgIGlmIChnbG9iYWxUaGlzLmRldk1vZGUgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuZmlyc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChgVGVtcGxhdGUgJHt0aGlzLl9pZH0gU3RhcnRgKTtcbiAgICAgIHRoaXMubGFzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVDb21tZW50KGBUZW1wbGF0ZSAke3RoaXMuX2lkfSBFbmRgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5maXJzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICB0aGlzLmxhc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIH1cbiAgICB0aGlzLm5vZGVzLnB1c2godGhpcy5maXJzdE5vZGUsIC4uLkFycmF5LmZyb20oc3ViRG9jLmNoaWxkTm9kZXMpLCB0aGlzLmxhc3ROb2RlKTtcbiAgICB0aGlzLnBvc3RSZW5kZXIocGFyZW50Tm9kZSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVuZGVyZWQnKSk7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoQXR0YWNoKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgIGlmIChpbnNlcnRQb2ludCkge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgbnVsbCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIG51bGwpO1xuICAgICAgfVxuICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3ViRG9jLCB0aGlzLmxhc3ROb2RlKTtcbiAgICAgIHZhciByb290Tm9kZSA9IHBhcmVudE5vZGUuZ2V0Um9vdE5vZGUoKTtcbiAgICAgIGlmIChyb290Tm9kZS5pc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLmF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlLCBvdXRlclZpZXcpO1xuICAgICAgfSBlbHNlIGlmIChvdXRlclZpZXcpIHtcbiAgICAgICAgdmFyIGZpcnN0RG9tQXR0YWNoID0gZXZlbnQgPT4ge1xuICAgICAgICAgIHZhciByb290Tm9kZSA9IHBhcmVudE5vZGUuZ2V0Um9vdE5vZGUoKTtcbiAgICAgICAgICB0aGlzLmF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgICAgICB0aGlzLmRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUsIG91dGVyVmlldyk7XG4gICAgICAgICAgb3V0ZXJWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2F0dGFjaGVkJywgZmlyc3REb21BdHRhY2gpO1xuICAgICAgICB9O1xuICAgICAgICBvdXRlclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignYXR0YWNoZWQnLCBmaXJzdERvbUF0dGFjaCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucmVuZGVyQ29tcGxldGUodGhpcy5ub2Rlcyk7XG4gICAgcmV0dXJuIHRoaXMubm9kZXM7XG4gIH1cbiAgZGlzcGF0Y2hBdHRhY2goKSB7XG4gICAgdmFyIHtcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhdHRhY2gnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgdGFyZ2V0OiB0aGlzXG4gICAgfSkpO1xuICB9XG4gIGRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUsIHZpZXcgPSB1bmRlZmluZWQpIHtcbiAgICB2YXIge1xuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYXR0YWNoZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICBub2RlOiBwYXJlbnROb2RlLFxuICAgICAgICByb290OiByb290Tm9kZSxcbiAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgdGhpcy5kaXNwYXRjaERvbUF0dGFjaGVkKHZpZXcpO1xuICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIHRoaXMubm9kZXNBdHRhY2hlZC5pdGVtcygpKSB7XG4gICAgICBjYWxsYmFjayhyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgfVxuICB9XG4gIGRpc3BhdGNoRG9tQXR0YWNoZWQodmlldykge1xuICAgIHZhciB7XG4gICAgICBOb2RlLFxuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdGhpcy5ub2Rlcy5maWx0ZXIobiA9PiBuLm5vZGVUeXBlICE9PSBOb2RlLkNPTU1FTlRfTk9ERSkuZm9yRWFjaChjaGlsZCA9PiB7XG4gICAgICBpZiAoIWNoaWxkLm1hdGNoZXMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2hpbGQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tQXR0YWNoZWQnLCB7XG4gICAgICAgIHRhcmdldDogY2hpbGQsXG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgICBfRG9tLkRvbS5tYXBUYWdzKGNoaWxkLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICAgIGlmICghdGFnLm1hdGNoZXMpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkRvbUF0dGFjaGVkJywge1xuICAgICAgICAgIHRhcmdldDogdGFnLFxuICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJlUmVuZGVyKHBhcmVudE5vZGUsIGluc2VydFBvaW50LCBvdXRlclZpZXcpIHtcbiAgICB2YXIge1xuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdmFyIHdpbGxSZVJlbmRlciA9IHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlUmVuZGVyJyksIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICB0YXJnZXQ6IHRoaXMsXG4gICAgICB2aWV3OiBvdXRlclZpZXdcbiAgICB9KTtcbiAgICBpZiAoIXdpbGxSZVJlbmRlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgc3ViRG9jID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBpZiAodGhpcy5maXJzdE5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHZhciBkZXRhY2ggPSB0aGlzLm5vZGVzRGV0YWNoZWQuaXRlbXMoKTtcbiAgICAgIGZvciAodmFyIGkgaW4gZGV0YWNoKSB7XG4gICAgICAgIGRldGFjaFtpXSgpO1xuICAgICAgfVxuICAgIH1cbiAgICBzdWJEb2MuYXBwZW5kKC4uLnRoaXMubm9kZXMpO1xuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICBpZiAoaW5zZXJ0UG9pbnQpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIG51bGwpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN1YkRvYywgdGhpcy5sYXN0Tm9kZSk7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZVJlbmRlcmVkJyksIHtcbiAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgICAgdGFyZ2V0OiB0aGlzLFxuICAgICAgICB2aWV3OiBvdXRlclZpZXdcbiAgICAgIH0pO1xuICAgICAgdmFyIHJvb3ROb2RlID0gcGFyZW50Tm9kZS5nZXRSb290Tm9kZSgpO1xuICAgICAgaWYgKHJvb3ROb2RlLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgfVxuICBtYXBUYWdzKHN1YkRvYykge1xuICAgIF9Eb20uRG9tLm1hcFRhZ3Moc3ViRG9jLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICBpZiAodGFnW2RvbnRQYXJzZV0pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRhZy5tYXRjaGVzKSB7XG4gICAgICAgIHRhZyA9IHRoaXMubWFwSW50ZXJwb2xhdGFibGVUYWcodGFnKTtcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi10ZW1wbGF0ZV0nKSAmJiB0aGlzLm1hcFRlbXBsYXRlVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXNsb3RdJykgJiYgdGhpcy5tYXBTbG90VGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXByZXJlbmRlcl0nKSAmJiB0aGlzLm1hcFByZW5kZXJlclRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1saW5rXScpICYmIHRoaXMubWFwTGlua1RhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1hdHRyXScpICYmIHRoaXMubWFwQXR0clRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1leHBhbmRdJykgJiYgdGhpcy5tYXBFeHBhbmRhYmxlVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXJlZl0nKSAmJiB0aGlzLm1hcFJlZlRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1vbl0nKSAmJiB0aGlzLm1hcE9uVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWVhY2hdJykgJiYgdGhpcy5tYXBFYWNoVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWJpbmRdJykgJiYgdGhpcy5tYXBCaW5kVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXdpdGhdJykgJiYgdGhpcy5tYXBXaXRoVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWlmXScpICYmIHRoaXMubWFwSWZUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytdmlld10nKSAmJiB0aGlzLm1hcFZpZXdUYWcodGFnKSB8fCB0YWc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YWcgPSB0aGlzLm1hcEludGVycG9sYXRhYmxlVGFnKHRhZyk7XG4gICAgICB9XG4gICAgICBpZiAodGFnICE9PSB3YWxrZXIuY3VycmVudE5vZGUpIHtcbiAgICAgICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gdGFnO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucG9zdE1hcHBpbmcuZm9yRWFjaChjID0+IGMoKSk7XG4gIH1cbiAgbWFwRXhwYW5kYWJsZVRhZyh0YWcpIHtcbiAgICAvLyBjb25zdCB0YWdDb21waWxlciA9IHRoaXMuY29tcGlsZUV4cGFuZGFibGVUYWcodGFnKTtcbiAgICAvLyBjb25zdCBuZXdUYWcgPSB0YWdDb21waWxlcih0aGlzKTtcbiAgICAvLyB0YWcucmVwbGFjZVdpdGgobmV3VGFnKTtcbiAgICAvLyByZXR1cm4gbmV3VGFnO1xuXG4gICAgdmFyIGV4aXN0aW5nID0gdGFnW2V4cGFuZEJpbmRdO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgZXhpc3RpbmcoKTtcbiAgICAgIHRhZ1tleHBhbmRCaW5kXSA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgW3Byb3h5LCBleHBhbmRQcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZSh0aGlzLmFyZ3MsIHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpLCB0cnVlKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1leHBhbmQnKTtcbiAgICBpZiAoIXByb3h5W2V4cGFuZFByb3BlcnR5XSkge1xuICAgICAgcHJveHlbZXhwYW5kUHJvcGVydHldID0ge307XG4gICAgfVxuICAgIHByb3h5W2V4cGFuZFByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHByb3h5W2V4cGFuZFByb3BlcnR5XSk7XG4gICAgdGhpcy5vblJlbW92ZSh0YWdbZXhwYW5kQmluZF0gPSBwcm94eVtleHBhbmRQcm9wZXJ0eV0uYmluZFRvKCh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICBpZiAoZCB8fCB2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGFnLnJlbW92ZUF0dHJpYnV0ZShrLCB2KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHYgPT09IG51bGwpIHtcbiAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShrLCAnJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoaywgdik7XG4gICAgfSkpO1xuXG4gICAgLy8gbGV0IGV4cGFuZFByb3BlcnR5ID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG4gICAgLy8gbGV0IGV4cGFuZEFyZyA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZShcbiAgICAvLyBcdHRoaXMuYXJnc1tleHBhbmRQcm9wZXJ0eV0gfHwge31cbiAgICAvLyApO1xuXG4gICAgLy8gdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG5cbiAgICAvLyBmb3IobGV0IGkgaW4gZXhwYW5kQXJnKVxuICAgIC8vIHtcbiAgICAvLyBcdGlmKGkgPT09ICduYW1lJyB8fCBpID09PSAndHlwZScpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdGNvbnRpbnVlO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRsZXQgZGViaW5kID0gZXhwYW5kQXJnLmJpbmRUbyhpLCAoKHRhZyxpKT0+KHYpPT57XG4gICAgLy8gXHRcdHRhZy5zZXRBdHRyaWJ1dGUoaSwgdik7XG4gICAgLy8gXHR9KSh0YWcsaSkpO1xuXG4gICAgLy8gXHR0aGlzLm9uUmVtb3ZlKCgpPT57XG4gICAgLy8gXHRcdGRlYmluZCgpO1xuICAgIC8vIFx0XHRpZihleHBhbmRBcmcuaXNCb3VuZCgpKVxuICAgIC8vIFx0XHR7XG4gICAgLy8gXHRcdFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyhleHBhbmRBcmcpO1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHR9KTtcbiAgICAvLyB9XG5cbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gY29tcGlsZUV4cGFuZGFibGVUYWcoc291cmNlVGFnKVxuICAvLyB7XG4gIC8vIFx0cmV0dXJuIChiaW5kaW5nVmlldykgPT4ge1xuXG4gIC8vIFx0XHRjb25zdCB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKHRydWUpO1xuXG4gIC8vIFx0XHRsZXQgZXhwYW5kUHJvcGVydHkgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1leHBhbmQnKTtcbiAgLy8gXHRcdGxldCBleHBhbmRBcmcgPSBCaW5kYWJsZS5tYWtlKFxuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5hcmdzW2V4cGFuZFByb3BlcnR5XSB8fCB7fVxuICAvLyBcdFx0KTtcblxuICAvLyBcdFx0dGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG5cbiAgLy8gXHRcdGZvcihsZXQgaSBpbiBleHBhbmRBcmcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdGlmKGkgPT09ICduYW1lJyB8fCBpID09PSAndHlwZScpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRjb250aW51ZTtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGxldCBkZWJpbmQgPSBleHBhbmRBcmcuYmluZFRvKGksICgodGFnLGkpPT4odik9PntcbiAgLy8gXHRcdFx0XHR0YWcuc2V0QXR0cmlidXRlKGksIHYpO1xuICAvLyBcdFx0XHR9KSh0YWcsaSkpO1xuXG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKCgpPT57XG4gIC8vIFx0XHRcdFx0ZGViaW5kKCk7XG4gIC8vIFx0XHRcdFx0aWYoZXhwYW5kQXJnLmlzQm91bmQoKSlcbiAgLy8gXHRcdFx0XHR7XG4gIC8vIFx0XHRcdFx0XHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKGV4cGFuZEFyZyk7XG4gIC8vIFx0XHRcdFx0fVxuICAvLyBcdFx0XHR9KTtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0cmV0dXJuIHRhZztcbiAgLy8gXHR9O1xuICAvLyB9XG5cbiAgbWFwQXR0clRhZyh0YWcpIHtcbiAgICB2YXIgdGFnQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVBdHRyVGFnKHRhZyk7XG4gICAgdmFyIG5ld1RhZyA9IHRhZ0NvbXBpbGVyKHRoaXMpO1xuICAgIHRhZy5yZXBsYWNlV2l0aChuZXdUYWcpO1xuICAgIHJldHVybiBuZXdUYWc7XG5cbiAgICAvLyBsZXQgYXR0clByb3BlcnR5ID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuXG4gICAgLy8gdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuXG4gICAgLy8gbGV0IHBhaXJzID0gYXR0clByb3BlcnR5LnNwbGl0KCcsJyk7XG4gICAgLy8gbGV0IGF0dHJzID0gcGFpcnMubWFwKChwKSA9PiBwLnNwbGl0KCc6JykpO1xuXG4gICAgLy8gZm9yIChsZXQgaSBpbiBhdHRycylcbiAgICAvLyB7XG4gICAgLy8gXHRsZXQgcHJveHkgICAgICAgID0gdGhpcy5hcmdzO1xuICAgIC8vIFx0bGV0IGJpbmRQcm9wZXJ0eSA9IGF0dHJzW2ldWzFdO1xuICAgIC8vIFx0bGV0IHByb3BlcnR5ICAgICA9IGJpbmRQcm9wZXJ0eTtcblxuICAgIC8vIFx0aWYoYmluZFByb3BlcnR5Lm1hdGNoKC9cXC4vKSlcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0W3Byb3h5LCBwcm9wZXJ0eV0gPSBCaW5kYWJsZS5yZXNvbHZlKFxuICAgIC8vIFx0XHRcdHRoaXMuYXJnc1xuICAgIC8vIFx0XHRcdCwgYmluZFByb3BlcnR5XG4gICAgLy8gXHRcdFx0LCB0cnVlXG4gICAgLy8gXHRcdCk7XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGxldCBhdHRyaWIgPSBhdHRyc1tpXVswXTtcblxuICAgIC8vIFx0dGhpcy5vblJlbW92ZShwcm94eS5iaW5kVG8oXG4gICAgLy8gXHRcdHByb3BlcnR5XG4gICAgLy8gXHRcdCwgKHYpPT57XG4gICAgLy8gXHRcdFx0aWYodiA9PSBudWxsKVxuICAgIC8vIFx0XHRcdHtcbiAgICAvLyBcdFx0XHRcdHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCAnJyk7XG4gICAgLy8gXHRcdFx0XHRyZXR1cm47XG4gICAgLy8gXHRcdFx0fVxuICAgIC8vIFx0XHRcdHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCB2KTtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0KSk7XG4gICAgLy8gfVxuXG4gICAgLy8gcmV0dXJuIHRhZztcbiAgfVxuICBjb21waWxlQXR0clRhZyhzb3VyY2VUYWcpIHtcbiAgICB2YXIgYXR0clByb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuICAgIHZhciBwYWlycyA9IGF0dHJQcm9wZXJ0eS5zcGxpdCgvWyw7XS8pO1xuICAgIHZhciBhdHRycyA9IHBhaXJzLm1hcChwID0+IHAuc3BsaXQoJzonKSk7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuICAgIHJldHVybiBiaW5kaW5nVmlldyA9PiB7XG4gICAgICB2YXIgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGJpbmRQcm9wZXJ0eSA9IGF0dHJzW2ldWzFdIHx8IGF0dHJzW2ldWzBdO1xuICAgICAgICB2YXIgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShiaW5kaW5nVmlldy5hcmdzLCBiaW5kUHJvcGVydHksIHRydWUpO1xuICAgICAgICB2YXIgYXR0cmliID0gYXR0cnNbaV1bMF07XG4gICAgICAgIGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICBpZiAoZCB8fCB2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoYXR0cmliLCB2KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHYgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCAnJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCB2KTtcbiAgICAgICAgfSkpO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIGkgaW4gYXR0cnMpIHtcbiAgICAgICAgX2xvb3AoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0YWc7XG4gICAgfTtcbiAgfVxuICBtYXBJbnRlcnBvbGF0YWJsZVRhZyh0YWcpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciByZWdleCA9IHRoaXMuaW50ZXJwb2xhdGVSZWdleDtcbiAgICB2YXIge1xuICAgICAgTm9kZSxcbiAgICAgIGRvY3VtZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIGlmICh0YWcubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICB2YXIgb3JpZ2luYWwgPSB0YWcubm9kZVZhbHVlO1xuICAgICAgaWYgKCF0aGlzLmludGVycG9sYXRhYmxlKG9yaWdpbmFsKSkge1xuICAgICAgICByZXR1cm4gdGFnO1xuICAgICAgfVxuICAgICAgdmFyIGhlYWRlciA9IDA7XG4gICAgICB2YXIgbWF0Y2g7XG4gICAgICB2YXIgX2xvb3AyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBiaW5kUHJvcGVydHkgPSBtYXRjaFsyXTtcbiAgICAgICAgICB2YXIgdW5zYWZlSHRtbCA9IGZhbHNlO1xuICAgICAgICAgIHZhciB1bnNhZmVWaWV3ID0gZmFsc2U7XG4gICAgICAgICAgdmFyIHByb3BlcnR5U3BsaXQgPSBiaW5kUHJvcGVydHkuc3BsaXQoJ3wnKTtcbiAgICAgICAgICB2YXIgdHJhbnNmb3JtZXIgPSBmYWxzZTtcbiAgICAgICAgICBpZiAocHJvcGVydHlTcGxpdC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IF90aGlzLnN0cmluZ1RyYW5zZm9ybWVyKHByb3BlcnR5U3BsaXQuc2xpY2UoMSkpO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gcHJvcGVydHlTcGxpdFswXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5zdWJzdHIoMCwgMikgPT09ICckJCcpIHtcbiAgICAgICAgICAgIHVuc2FmZUh0bWwgPSB0cnVlO1xuICAgICAgICAgICAgdW5zYWZlVmlldyA9IHRydWU7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBiaW5kUHJvcGVydHkuc3Vic3RyKDIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICB1bnNhZmVIdG1sID0gdHJ1ZTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkuc3Vic3RyKDAsIDMpID09PSAnMDAwJykge1xuICAgICAgICAgICAgZXhwYW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eS5zdWJzdHIoMyk7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHN0YXRpY1ByZWZpeCA9IG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIsIG1hdGNoLmluZGV4KTtcbiAgICAgICAgICBoZWFkZXIgPSBtYXRjaC5pbmRleCArIG1hdGNoWzFdLmxlbmd0aDtcbiAgICAgICAgICB2YXIgc3RhdGljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0YXRpY1ByZWZpeCk7XG4gICAgICAgICAgc3RhdGljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3RhdGljTm9kZSwgdGFnKTtcbiAgICAgICAgICB2YXIgZHluYW1pY05vZGU7XG4gICAgICAgICAgaWYgKHVuc2FmZUh0bWwpIHtcbiAgICAgICAgICAgIGR5bmFtaWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGR5bmFtaWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkeW5hbWljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgICAgICB2YXIgcHJveHkgPSBfdGhpcy5hcmdzO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eTtcbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5Lm1hdGNoKC9cXC4vKSkge1xuICAgICAgICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShfdGhpcy5hcmdzLCBiaW5kUHJvcGVydHksIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZHluYW1pY05vZGUsIHRhZyk7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwcm94eSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybiAxOyAvLyBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBwcm94eSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHByb3h5KTtcbiAgICAgICAgICB2YXIgZGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRba10gIT09IHYgJiYgKHRba10gaW5zdGFuY2VvZiBWaWV3IHx8IHRba10gaW5zdGFuY2VvZiBOb2RlIHx8IHRba10gaW5zdGFuY2VvZiBfVGFnLlRhZykpIHtcbiAgICAgICAgICAgICAgaWYgKCF0W2tdLnByZXNlcnZlKSB7XG4gICAgICAgICAgICAgICAgdFtrXS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHVuc2FmZVZpZXcgJiYgISh2IGluc3RhbmNlb2YgVmlldykpIHtcbiAgICAgICAgICAgICAgdmFyIHVuc2FmZVRlbXBsYXRlID0gdiAhPT0gbnVsbCAmJiB2ICE9PSB2b2lkIDAgPyB2IDogJyc7XG4gICAgICAgICAgICAgIHYgPSBuZXcgVmlldyhfdGhpcy5hcmdzLCBfdGhpcyk7XG4gICAgICAgICAgICAgIHYudGVtcGxhdGUgPSB1bnNhZmVUZW1wbGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lcikge1xuICAgICAgICAgICAgICB2ID0gdHJhbnNmb3JtZXIodik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodiBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgICAgICAgICAgIHZbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gX3RoaXM7XG4gICAgICAgICAgICAgIHYucmVuZGVyKHRhZy5wYXJlbnROb2RlLCBkeW5hbWljTm9kZSwgX3RoaXMpO1xuICAgICAgICAgICAgICB2YXIgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXYucHJlc2VydmUpIHtcbiAgICAgICAgICAgICAgICAgIHYucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBfdGhpcy5vblJlbW92ZShjbGVhbnVwKTtcbiAgICAgICAgICAgICAgdi5vblJlbW92ZSgoKSA9PiBfdGhpcy5fb25SZW1vdmUucmVtb3ZlKGNsZWFudXApKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh2LCBkeW5hbWljTm9kZSk7XG4gICAgICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKCgpID0+IHYucmVtb3ZlKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgICAgICAgICAgIGlmICh2Lm5vZGUpIHtcbiAgICAgICAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodi5ub2RlLCBkeW5hbWljTm9kZSk7XG4gICAgICAgICAgICAgICAgX3RoaXMub25SZW1vdmUoKCkgPT4gdi5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBPYmplY3QgJiYgdi5fX3RvU3RyaW5nIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICB2ID0gdi5fX3RvU3RyaW5nKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHVuc2FmZUh0bWwpIHtcbiAgICAgICAgICAgICAgICBkeW5hbWljTm9kZS5pbm5lckhUTUwgPSB2O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9IHY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGR5bmFtaWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgICAgIH0sXG4gICAgICAgIF9yZXQ7XG4gICAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKG9yaWdpbmFsKSkge1xuICAgICAgICBfcmV0ID0gX2xvb3AyKCk7XG4gICAgICAgIGlmIChfcmV0ID09PSAwKSBjb250aW51ZTtcbiAgICAgICAgaWYgKF9yZXQgPT09IDEpIGJyZWFrO1xuICAgICAgfVxuICAgICAgdmFyIHN0YXRpY1N1ZmZpeCA9IG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIpO1xuICAgICAgdmFyIHN0YXRpY05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdGF0aWNTdWZmaXgpO1xuICAgICAgc3RhdGljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdGF0aWNOb2RlLCB0YWcpO1xuICAgICAgdGFnLm5vZGVWYWx1ZSA9ICcnO1xuICAgIH0gZWxzZSBpZiAodGFnLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgdmFyIF9sb29wMyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFfdGhpcy5pbnRlcnBvbGF0YWJsZSh0YWcuYXR0cmlidXRlc1tpXS52YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgaGVhZGVyID0gMDtcbiAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICB2YXIgb3JpZ2luYWwgPSB0YWcuYXR0cmlidXRlc1tpXS52YWx1ZTtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZSA9IHRhZy5hdHRyaWJ1dGVzW2ldO1xuICAgICAgICB2YXIgYmluZFByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgdmFyIHNlZ21lbnRzID0gW107XG4gICAgICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMob3JpZ2luYWwpKSB7XG4gICAgICAgICAgc2VnbWVudHMucHVzaChvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyLCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAgIGlmICghYmluZFByb3BlcnRpZXNbbWF0Y2hbMl1dKSB7XG4gICAgICAgICAgICBiaW5kUHJvcGVydGllc1ttYXRjaFsyXV0gPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYmluZFByb3BlcnRpZXNbbWF0Y2hbMl1dLnB1c2goc2VnbWVudHMubGVuZ3RoKTtcbiAgICAgICAgICBzZWdtZW50cy5wdXNoKG1hdGNoWzFdKTtcbiAgICAgICAgICBoZWFkZXIgPSBtYXRjaC5pbmRleCArIG1hdGNoWzFdLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBzZWdtZW50cy5wdXNoKG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIpKTtcbiAgICAgICAgdmFyIF9sb29wNCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgcHJveHkgPSBfdGhpcy5hcmdzO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IGo7XG4gICAgICAgICAgdmFyIHByb3BlcnR5U3BsaXQgPSBqLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgdmFyIHRyYW5zZm9ybWVyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGxvbmdQcm9wZXJ0eSA9IGo7XG4gICAgICAgICAgaWYgKHByb3BlcnR5U3BsaXQubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdHJhbnNmb3JtZXIgPSBfdGhpcy5zdHJpbmdUcmFuc2Zvcm1lcihwcm9wZXJ0eVNwbGl0LnNsaWNlKDEpKTtcbiAgICAgICAgICAgIHByb3BlcnR5ID0gcHJvcGVydHlTcGxpdFswXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHByb3BlcnR5Lm1hdGNoKC9cXC4vKSkge1xuICAgICAgICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShfdGhpcy5hcmdzLCBwcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBtYXRjaGluZyA9IFtdO1xuICAgICAgICAgIHZhciBiaW5kUHJvcGVydHkgPSBqO1xuICAgICAgICAgIHZhciBtYXRjaGluZ1NlZ21lbnRzID0gYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XTtcbiAgICAgICAgICBfdGhpcy5vblJlbW92ZShwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIpIHtcbiAgICAgICAgICAgICAgdiA9IHRyYW5zZm9ybWVyKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgX2kgaW4gYmluZFByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgX2ogaW4gYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgIHNlZ21lbnRzW2JpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV1bX2pdXSA9IHRbX2ldO1xuICAgICAgICAgICAgICAgIGlmIChrID09PSBwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgICAgc2VnbWVudHNbYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XVtfal1dID0gdjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghX3RoaXMucGF1c2VkKSB7XG4gICAgICAgICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLm5hbWUsIHNlZ21lbnRzLmpvaW4oJycpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF90aGlzLnVucGF1c2VDYWxsYmFja3Muc2V0KGF0dHJpYnV0ZSwgKCkgPT4gdGFnLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUubmFtZSwgc2VnbWVudHMuam9pbignJykpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH07XG4gICAgICAgIGZvciAodmFyIGogaW4gYmluZFByb3BlcnRpZXMpIHtcbiAgICAgICAgICBfbG9vcDQoKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKF9sb29wMygpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBSZWZUYWcodGFnKSB7XG4gICAgdmFyIHJlZkF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1yZWYnKTtcbiAgICB2YXIgW3JlZlByb3AsIHJlZkNsYXNzbmFtZSA9IG51bGwsIHJlZktleSA9IG51bGxdID0gcmVmQXR0ci5zcGxpdCgnOicpO1xuICAgIHZhciByZWZDbGFzcyA9IF9UYWcuVGFnO1xuICAgIGlmIChyZWZDbGFzc25hbWUpIHtcbiAgICAgIHJlZkNsYXNzID0gdGhpcy5zdHJpbmdUb0NsYXNzKHJlZkNsYXNzbmFtZSk7XG4gICAgfVxuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXJlZicpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YWcsICdfX190YWdfX18nLCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICB0YWcuX19fdGFnX19fID0gbnVsbDtcbiAgICAgIHRhZy5yZW1vdmUoKTtcbiAgICB9KTtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgZGlyZWN0ID0gdGhpcztcbiAgICBpZiAodGhpcy52aWV3TGlzdCkge1xuICAgICAgcGFyZW50ID0gdGhpcy52aWV3TGlzdC5wYXJlbnQ7XG4gICAgICAvLyBpZighdGhpcy52aWV3TGlzdC5wYXJlbnQudGFnc1tyZWZQcm9wXSlcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0dGhpcy52aWV3TGlzdC5wYXJlbnQudGFnc1tyZWZQcm9wXSA9IFtdO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBsZXQgcmVmS2V5VmFsID0gdGhpcy5hcmdzW3JlZktleV07XG5cbiAgICAgIC8vIHRoaXMudmlld0xpc3QucGFyZW50LnRhZ3NbcmVmUHJvcF1bcmVmS2V5VmFsXSA9IG5ldyByZWZDbGFzcyhcbiAgICAgIC8vIFx0dGFnLCB0aGlzLCByZWZQcm9wLCByZWZLZXlWYWxcbiAgICAgIC8vICk7XG4gICAgfVxuICAgIC8vIGVsc2VcbiAgICAvLyB7XG4gICAgLy8gXHR0aGlzLnRhZ3NbcmVmUHJvcF0gPSBuZXcgcmVmQ2xhc3MoXG4gICAgLy8gXHRcdHRhZywgdGhpcywgcmVmUHJvcFxuICAgIC8vIFx0KTtcbiAgICAvLyB9XG5cbiAgICB2YXIgdGFnT2JqZWN0ID0gbmV3IHJlZkNsYXNzKHRhZywgdGhpcywgcmVmUHJvcCwgdW5kZWZpbmVkLCBkaXJlY3QpO1xuICAgIHRhZy5fX190YWdfX18gPSB0YWdPYmplY3Q7XG4gICAgdGhpcy50YWdzW3JlZlByb3BdID0gdGFnT2JqZWN0O1xuICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgIHZhciByZWZLZXlWYWwgPSB0aGlzLmFyZ3NbcmVmS2V5XTtcbiAgICAgIGlmIChyZWZLZXlWYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoIXBhcmVudC50YWdzW3JlZlByb3BdKSB7XG4gICAgICAgICAgcGFyZW50LnRhZ3NbcmVmUHJvcF0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQudGFnc1tyZWZQcm9wXVtyZWZLZXlWYWxdID0gdGFnT2JqZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyZW50LnRhZ3NbcmVmUHJvcF0gPSB0YWdPYmplY3Q7XG4gICAgICB9XG4gICAgICBpZiAoIXBhcmVudC5wYXJlbnQpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcEJpbmRUYWcodGFnKSB7XG4gICAgdmFyIGJpbmRBcmcgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1iaW5kJyk7XG4gICAgdmFyIHByb3h5ID0gdGhpcy5hcmdzO1xuICAgIHZhciBwcm9wZXJ0eSA9IGJpbmRBcmc7XG4gICAgdmFyIHRvcCA9IG51bGw7XG4gICAgaWYgKGJpbmRBcmcubWF0Y2goL1xcLi8pKSB7XG4gICAgICBbcHJveHksIHByb3BlcnR5LCB0b3BdID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUodGhpcy5hcmdzLCBiaW5kQXJnLCB0cnVlKTtcbiAgICB9XG4gICAgaWYgKHByb3h5ICE9PSB0aGlzLmFyZ3MpIHtcbiAgICAgIHRoaXMuc3ViQmluZGluZ3NbYmluZEFyZ10gPSB0aGlzLnN1YkJpbmRpbmdzW2JpbmRBcmddIHx8IFtdO1xuICAgICAgdGhpcy5vblJlbW92ZSh0aGlzLmFyZ3MuYmluZFRvKHRvcCwgKCkgPT4ge1xuICAgICAgICB3aGlsZSAodGhpcy5zdWJCaW5kaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgICB0aGlzLnN1YkJpbmRpbmdzLnNoaWZ0KCkoKTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH1cbiAgICB2YXIgdW5zYWZlSHRtbCA9IGZhbHNlO1xuICAgIGlmIChwcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgcHJvcGVydHkgPSBwcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICB1bnNhZmVIdG1sID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGF1dG9FdmVudFN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB2YXIgZGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgaWYgKChwIGluc3RhbmNlb2YgVmlldyB8fCBwIGluc3RhbmNlb2YgTm9kZSB8fCBwIGluc3RhbmNlb2YgX1RhZy5UYWcpICYmIHAgIT09IHYpIHtcbiAgICAgICAgcC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGlmIChbJ0lOUFVUJywgJ1NFTEVDVCcsICdURVhUQVJFQSddLmluY2x1ZGVzKHRhZy50YWdOYW1lKSkge1xuICAgICAgICB2YXIgX3R5cGUgPSB0YWcuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgICAgIGlmIChfdHlwZSAmJiBfdHlwZS50b0xvd2VyQ2FzZSgpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgdGFnLmNoZWNrZWQgPSAhIXY7XG4gICAgICAgIH0gZWxzZSBpZiAoX3R5cGUgJiYgX3R5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgIHRhZy5jaGVja2VkID0gdiA9PSB0YWcudmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAoX3R5cGUgIT09ICdmaWxlJykge1xuICAgICAgICAgIGlmICh0YWcudGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RPcHRpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnLm9wdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0aW9uID0gdGFnLm9wdGlvbnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbi52YWx1ZSA9PSB2KSB7XG4gICAgICAgICAgICAgICAgICB0YWcuc2VsZWN0ZWRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2VsZWN0T3B0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLm5vZGVzQXR0YWNoZWQuYWRkKHNlbGVjdE9wdGlvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRhZy52YWx1ZSA9IHYgPT0gbnVsbCA/ICcnIDogdjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF1dG9FdmVudFN0YXJ0ZWQpIHtcbiAgICAgICAgICB0YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2QXV0b0NoYW5nZWQnLCB7XG4gICAgICAgICAgICBidWJibGVzOiB0cnVlXG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIGF1dG9FdmVudFN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICAgICAgZm9yICh2YXIgbm9kZSBvZiB0YWcuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdltfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSB0aGlzO1xuICAgICAgICAgIHYucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICB0YWcuaW5zZXJ0KHYpO1xuICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgICAgIHRhZy5hcHBlbmQodi5ub2RlKTtcbiAgICAgICAgfSBlbHNlIGlmICh1bnNhZmVIdG1sKSB7XG4gICAgICAgICAgaWYgKHRhZy5pbm5lckhUTUwgIT09IHYpIHtcbiAgICAgICAgICAgIHYgPSBTdHJpbmcodik7XG4gICAgICAgICAgICBpZiAodGFnLmlubmVySFRNTCA9PT0gdi5zdWJzdHJpbmcoMCwgdGFnLmlubmVySFRNTC5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgIHRhZy5pbm5lckhUTUwgKz0gdi5zdWJzdHJpbmcodGFnLmlubmVySFRNTC5sZW5ndGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgX25vZGUgb2YgdGFnLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICBfbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0YWcuaW5uZXJIVE1MID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9Eb20uRG9tLm1hcFRhZ3ModGFnLCBmYWxzZSwgdCA9PiB0W2RvbnRQYXJzZV0gPSB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRhZy50ZXh0Q29udGVudCAhPT0gdikge1xuICAgICAgICAgICAgZm9yICh2YXIgX25vZGUyIG9mIHRhZy5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgIF9ub2RlMi5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhZy50ZXh0Q29udGVudCA9IHY7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHByb3h5ICE9PSB0aGlzLmFyZ3MpIHtcbiAgICAgIHRoaXMuc3ViQmluZGluZ3NbYmluZEFyZ10ucHVzaChkZWJpbmQpO1xuICAgIH1cbiAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgdmFyIHR5cGUgPSB0YWcuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgdmFyIG11bHRpID0gdGFnLmdldEF0dHJpYnV0ZSgnbXVsdGlwbGUnKTtcbiAgICB2YXIgaW5wdXRMaXN0ZW5lciA9IGV2ZW50ID0+IHtcbiAgICAgIGlmIChldmVudC50YXJnZXQgIT09IHRhZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodHlwZSAmJiB0eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgaWYgKHRhZy5jaGVja2VkKSB7XG4gICAgICAgICAgcHJveHlbcHJvcGVydHldID0gZXZlbnQudGFyZ2V0LmdldEF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChldmVudC50YXJnZXQubWF0Y2hlcygnW2NvbnRlbnRlZGl0YWJsZT10cnVlXScpKSB7XG4gICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGV2ZW50LnRhcmdldC5pbm5lckhUTUw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdmaWxlJyAmJiBtdWx0aSkge1xuICAgICAgICB2YXIgZmlsZXMgPSBBcnJheS5mcm9tKGV2ZW50LnRhcmdldC5maWxlcyk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gcHJveHlbcHJvcGVydHldIHx8IF9CaW5kYWJsZS5CaW5kYWJsZS5vbkRlY2socHJveHksIHByb3BlcnR5KTtcbiAgICAgICAgaWYgKCFjdXJyZW50IHx8ICFmaWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBmaWxlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgX2xvb3A1ID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICAgIGlmIChmaWxlc1tpXSAhPT0gY3VycmVudFtpXSkge1xuICAgICAgICAgICAgICBmaWxlc1tpXS50b0pTT04gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGZpbGVbaV0ubmFtZSxcbiAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVbaV0uc2l6ZSxcbiAgICAgICAgICAgICAgICAgIHR5cGU6IGZpbGVbaV0udHlwZSxcbiAgICAgICAgICAgICAgICAgIGRhdGU6IGZpbGVbaV0ubGFzdE1vZGlmaWVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY3VycmVudFtpXSA9IGZpbGVzW2ldO1xuICAgICAgICAgICAgICByZXR1cm4gMTsgLy8gYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gZmlsZXMpIHtcbiAgICAgICAgICAgIGlmIChfbG9vcDUoaSkpIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZmlsZScgJiYgIW11bHRpICYmIGV2ZW50LnRhcmdldC5maWxlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIF9maWxlID0gZXZlbnQudGFyZ2V0LmZpbGVzLml0ZW0oMCk7XG4gICAgICAgIF9maWxlLnRvSlNPTiA9ICgpID0+IHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogX2ZpbGUubmFtZSxcbiAgICAgICAgICAgIHNpemU6IF9maWxlLnNpemUsXG4gICAgICAgICAgICB0eXBlOiBfZmlsZS50eXBlLFxuICAgICAgICAgICAgZGF0ZTogX2ZpbGUubGFzdE1vZGlmaWVkXG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgcHJveHlbcHJvcGVydHldID0gX2ZpbGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBldmVudC50YXJnZXQudmFsdWU7XG4gICAgICB9XG4gICAgfTtcbiAgICBpZiAodHlwZSA9PT0gJ2ZpbGUnIHx8IHR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcigndmFsdWUtY2hhbmdlZCcsIGlucHV0TGlzdGVuZXIpO1xuICAgIH1cbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIGlmICh0eXBlID09PSAnZmlsZScgfHwgdHlwZSA9PT0gJ3JhZGlvJykge1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcigndmFsdWUtY2hhbmdlZCcsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWJpbmQnKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcE9uVGFnKHRhZykge1xuICAgIHZhciByZWZlcmVudHMgPSBTdHJpbmcodGFnLmdldEF0dHJpYnV0ZSgnY3Ytb24nKSk7XG4gICAgcmVmZXJlbnRzLnNwbGl0KCc7JykubWFwKGEgPT4gYS5zcGxpdCgnOicpKS5mb3JFYWNoKGEgPT4ge1xuICAgICAgYSA9IGEubWFwKGEgPT4gYS50cmltKCkpO1xuICAgICAgdmFyIGFyZ0xlbiA9IGEubGVuZ3RoO1xuICAgICAgdmFyIGV2ZW50TmFtZSA9IFN0cmluZyhhLnNoaWZ0KCkpLnRyaW0oKTtcbiAgICAgIHZhciBjYWxsYmFja05hbWUgPSBTdHJpbmcoYS5zaGlmdCgpIHx8IGV2ZW50TmFtZSkudHJpbSgpO1xuICAgICAgdmFyIGV2ZW50RmxhZ3MgPSBTdHJpbmcoYS5zaGlmdCgpIHx8ICcnKS50cmltKCk7XG4gICAgICB2YXIgYXJnTGlzdCA9IFtdO1xuICAgICAgdmFyIGdyb3VwcyA9IC8oXFx3KykoPzpcXCgoWyRcXHdcXHMtJ1wiLF0rKVxcKSk/Ly5leGVjKGNhbGxiYWNrTmFtZSk7XG4gICAgICBpZiAoZ3JvdXBzKSB7XG4gICAgICAgIGNhbGxiYWNrTmFtZSA9IGdyb3Vwc1sxXS5yZXBsYWNlKC8oXltcXHNcXG5dK3xbXFxzXFxuXSskKS8sICcnKTtcbiAgICAgICAgaWYgKGdyb3Vwc1syXSkge1xuICAgICAgICAgIGFyZ0xpc3QgPSBncm91cHNbMl0uc3BsaXQoJywnKS5tYXAocyA9PiBzLnRyaW0oKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghYXJnTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgYXJnTGlzdC5wdXNoKCckZXZlbnQnKTtcbiAgICAgIH1cbiAgICAgIGlmICghZXZlbnROYW1lIHx8IGFyZ0xlbiA9PT0gMSkge1xuICAgICAgICBldmVudE5hbWUgPSBjYWxsYmFja05hbWU7XG4gICAgICB9XG4gICAgICB2YXIgZXZlbnRMaXN0ZW5lciA9IGV2ZW50ID0+IHtcbiAgICAgICAgdmFyIGV2ZW50TWV0aG9kO1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIF9sb29wNiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250cm9sbGVyID0gcGFyZW50LmNvbnRyb2xsZXI7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnRyb2xsZXJbY2FsbGJhY2tOYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICBldmVudE1ldGhvZCA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlcltjYWxsYmFja05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByZXR1cm4gMDsgLy8gYnJlYWtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhcmVudFtjYWxsYmFja05hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGV2ZW50TWV0aG9kID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICBwYXJlbnRbY2FsbGJhY2tOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFyZW50LnBhcmVudCkge1xuICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBfcmV0MjtcbiAgICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICAgIF9yZXQyID0gX2xvb3A2KCk7XG4gICAgICAgICAgaWYgKF9yZXQyID09PSAwKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB2YXIgYXJnUmVmcyA9IGFyZ0xpc3QubWFwKGFyZyA9PiB7XG4gICAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICAgIGlmIChOdW1iZXIoYXJnKSA9PSBhcmcpIHtcbiAgICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICdldmVudCcgfHwgYXJnID09PSAnJGV2ZW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHZpZXcnKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJGNvbnRyb2xsZXInKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udHJvbGxlcjtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyR0YWcnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHBhcmVudCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyRzdWJ2aWV3Jykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgaW4gdGhpcy5hcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcmdzW2FyZ107XG4gICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCA9IC9eWydcIl0oW1xcdy1dKz8pW1wiJ10kLy5leGVjKGFyZykpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoISh0eXBlb2YgZXZlbnRNZXRob2QgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2NhbGxiYWNrTmFtZX0gaXMgbm90IGRlZmluZWQgb24gVmlldyBvYmplY3QuYCArIFwiXFxuXCIgKyBgVGFnOmAgKyBcIlxcblwiICsgYCR7dGFnLm91dGVySFRNTH1gKTtcbiAgICAgICAgfVxuICAgICAgICBldmVudE1ldGhvZCguLi5hcmdSZWZzKTtcbiAgICAgIH07XG4gICAgICB2YXIgZXZlbnRPcHRpb25zID0ge307XG4gICAgICBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygncCcpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5wYXNzaXZlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnUCcpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5wYXNzaXZlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnYycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5jYXB0dXJlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnQycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5jYXB0dXJlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnbycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5vbmNlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnTycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5vbmNlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKGV2ZW50TmFtZSkge1xuICAgICAgICBjYXNlICdfaW5pdCc6XG4gICAgICAgICAgZXZlbnRMaXN0ZW5lcigpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdfYXR0YWNoJzpcbiAgICAgICAgICB0aGlzLm5vZGVzQXR0YWNoZWQuYWRkKGV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdfZGV0YWNoJzpcbiAgICAgICAgICB0aGlzLm5vZGVzRGV0YWNoZWQuYWRkKGV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZXZlbnRMaXN0ZW5lciwgZXZlbnRPcHRpb25zKTtcbiAgICAgICAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZXZlbnRMaXN0ZW5lciwgZXZlbnRPcHRpb25zKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHJldHVybiBbZXZlbnROYW1lLCBjYWxsYmFja05hbWUsIGFyZ0xpc3RdO1xuICAgIH0pO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LW9uJyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBMaW5rVGFnKHRhZykge1xuICAgIC8vIGNvbnN0IHRhZ0NvbXBpbGVyID0gdGhpcy5jb21waWxlTGlua1RhZyh0YWcpO1xuXG4gICAgLy8gY29uc3QgbmV3VGFnID0gdGFnQ29tcGlsZXIodGhpcyk7XG5cbiAgICAvLyB0YWcucmVwbGFjZVdpdGgobmV3VGFnKTtcblxuICAgIC8vIHJldHVybiBuZXdUYWc7XG5cbiAgICB2YXIgbGlua0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1saW5rJyk7XG4gICAgdGFnLnNldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmtBdHRyKTtcbiAgICB2YXIgbGlua0NsaWNrID0gZXZlbnQgPT4ge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChsaW5rQXR0ci5zdWJzdHJpbmcoMCwgNCkgPT09ICdodHRwJyB8fCBsaW5rQXR0ci5zdWJzdHJpbmcoMCwgMikgPT09ICcvLycpIHtcbiAgICAgICAgZ2xvYmFsVGhpcy5vcGVuKHRhZy5nZXRBdHRyaWJ1dGUoJ2hyZWYnLCBsaW5rQXR0cikpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBfUm91dGVyLlJvdXRlci5nbyh0YWcuZ2V0QXR0cmlidXRlKCdocmVmJykpO1xuICAgIH07XG4gICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlua0NsaWNrKTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgodGFnLCBldmVudExpc3RlbmVyKSA9PiAoKSA9PiB7XG4gICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudExpc3RlbmVyKTtcbiAgICAgIHRhZyA9IHVuZGVmaW5lZDtcbiAgICAgIGV2ZW50TGlzdGVuZXIgPSB1bmRlZmluZWQ7XG4gICAgfSkodGFnLCBsaW5rQ2xpY2spKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1saW5rJyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIGNvbXBpbGVMaW5rVGFnKHNvdXJjZVRhZylcbiAgLy8ge1xuICAvLyBcdGNvbnN0IGxpbmtBdHRyID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAvLyBcdHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgLy8gXHRyZXR1cm4gKGJpbmRpbmdWaWV3KSA9PiB7XG4gIC8vIFx0XHRjb25zdCB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKHRydWUpO1xuICAvLyBcdFx0dGFnLnNldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmtBdHRyKTtcbiAgLy8gXHRcdHJldHVybiB0YWc7XG4gIC8vIFx0fTtcbiAgLy8gfVxuXG4gIG1hcFByZW5kZXJlclRhZyh0YWcpIHtcbiAgICB2YXIgcHJlcmVuZGVyQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXByZXJlbmRlcicpO1xuICAgIHZhciBwcmVyZW5kZXJpbmcgPSBnbG9iYWxUaGlzLnByZXJlbmRlcmVyIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL3ByZXJlbmRlci9pKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1wcmVyZW5kZXInKTtcbiAgICBpZiAocHJlcmVuZGVyaW5nKSB7XG4gICAgICBnbG9iYWxUaGlzLnByZXJlbmRlcmVyID0gZ2xvYmFsVGhpcy5wcmVyZW5kZXJlciB8fCB0cnVlO1xuICAgIH1cbiAgICBpZiAocHJlcmVuZGVyQXR0ciA9PT0gJ25ldmVyJyAmJiBwcmVyZW5kZXJpbmcgfHwgcHJlcmVuZGVyQXR0ciA9PT0gJ29ubHknICYmICFwcmVyZW5kZXJpbmcpIHtcbiAgICAgIHRoaXMucG9zdE1hcHBpbmcuYWRkKCgpID0+IHRhZy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRhZykpO1xuICAgIH1cbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFdpdGhUYWcodGFnKSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG4gICAgdmFyIHdpdGhBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3Ytd2l0aCcpO1xuICAgIHZhciBjYXJyeUF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1jYXJyeScpO1xuICAgIHZhciB2aWV3QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi13aXRoJyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtY2FycnknKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHZpZXdBdHRyID8gdGhpcy5zdHJpbmdUb0NsYXNzKHZpZXdBdHRyKSA6IFZpZXc7XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4udGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIGNhcnJ5UHJvcHMgPSBbXTtcbiAgICBpZiAoY2FycnlBdHRyKSB7XG4gICAgICBjYXJyeVByb3BzID0gY2FycnlBdHRyLnNwbGl0KCcsJykubWFwKHMgPT4gcy50cmltKCkpO1xuICAgIH1cbiAgICB2YXIgZGViaW5kID0gdGhpcy5hcmdzLmJpbmRUbyh3aXRoQXR0ciwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgIGlmICh0aGlzLndpdGhWaWV3cy5oYXModGFnKSkge1xuICAgICAgICB0aGlzLndpdGhWaWV3cy5kZWxldGUodGFnKTtcbiAgICAgIH1cbiAgICAgIHdoaWxlICh0YWcuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YWcucmVtb3ZlQ2hpbGQodGFnLmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgICAgdmFyIHZpZXcgPSBuZXcgdmlld0NsYXNzKHt9LCB0aGlzKTtcbiAgICAgIHRoaXMub25SZW1vdmUoKHZpZXcgPT4gKCkgPT4ge1xuICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgfSkodmlldykpO1xuICAgICAgdmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAgICAgdmFyIF9sb29wNyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlYmluZCA9IF90aGlzMi5hcmdzLmJpbmRUbyhjYXJyeVByb3BzW2ldLCAodiwgaykgPT4ge1xuICAgICAgICAgIHZpZXcuYXJnc1trXSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICB2aWV3Lm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgICAgIF90aGlzMi5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgZGViaW5kKCk7XG4gICAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgaSBpbiBjYXJyeVByb3BzKSB7XG4gICAgICAgIF9sb29wNygpO1xuICAgICAgfVxuICAgICAgdmFyIF9sb29wOCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHYgPSBfQmluZGFibGUuQmluZGFibGUubWFrZSh2KTtcbiAgICAgICAgdmFyIGRlYmluZCA9IHYuYmluZFRvKF9pMiwgKHZ2LCBraywgdHQsIGRkKSA9PiB7XG4gICAgICAgICAgaWYgKCFkZCkge1xuICAgICAgICAgICAgdmlldy5hcmdzW2trXSA9IHZ2O1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2sgaW4gdmlldy5hcmdzKSB7XG4gICAgICAgICAgICBkZWxldGUgdmlldy5hcmdzW2trXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGViaW5kVXAgPSB2aWV3LmFyZ3MuYmluZFRvKF9pMiwgKHZ2LCBraywgdHQsIGRkKSA9PiB7XG4gICAgICAgICAgaWYgKCFkZCkge1xuICAgICAgICAgICAgdltra10gPSB2djtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtrIGluIHYpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2W2trXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfdGhpczIub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIGRlYmluZCgpO1xuICAgICAgICAgIGlmICghdi5pc0JvdW5kKCkpIHtcbiAgICAgICAgICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHYpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmlldy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgZGViaW5kKCk7XG4gICAgICAgICAgaWYgKCF2LmlzQm91bmQoKSkge1xuICAgICAgICAgICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3Modik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBfaTIgaW4gdikge1xuICAgICAgICBpZiAoX2xvb3A4KCkpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmlldy5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICAgIHRoaXMud2l0aFZpZXdzLnNldCh0YWcsIHZpZXcpO1xuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgdGhpcy53aXRoVmlld3MuZGVsZXRlKHRhZyk7XG4gICAgICBkZWJpbmQoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFZpZXdUYWcodGFnKSB7XG4gICAgdmFyIHZpZXdBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi50YWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgcGFydHMgPSB2aWV3QXR0ci5zcGxpdCgnOicpO1xuICAgIHZhciB2aWV3TmFtZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHBhcnRzLmxlbmd0aCA/IHRoaXMuc3RyaW5nVG9DbGFzcyhwYXJ0c1swXSkgOiBWaWV3O1xuICAgIHZhciB2aWV3ID0gbmV3IHZpZXdDbGFzcyh0aGlzLmFyZ3MsIHRoaXMpO1xuICAgIHRoaXMudmlld3Muc2V0KHRhZywgdmlldyk7XG4gICAgdGhpcy52aWV3cy5zZXQodmlld05hbWUsIHZpZXcpO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgIHRoaXMudmlld3MuZGVsZXRlKHRhZyk7XG4gICAgICB0aGlzLnZpZXdzLmRlbGV0ZSh2aWV3TmFtZSk7XG4gICAgfSk7XG4gICAgdmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAgIHZpZXcucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBFYWNoVGFnKHRhZykge1xuICAgIHZhciBlYWNoQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWVhY2gnKTtcbiAgICB2YXIgdmlld0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZWFjaCcpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgdmlld0NsYXNzID0gdmlld0F0dHIgPyB0aGlzLnN0cmluZ1RvQ2xhc3Modmlld0F0dHIpIDogVmlldztcbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi50YWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgW2VhY2hQcm9wLCBhc1Byb3AsIGtleVByb3BdID0gZWFjaEF0dHIuc3BsaXQoJzonKTtcbiAgICB2YXIgcHJveHkgPSB0aGlzLmFyZ3M7XG4gICAgdmFyIHByb3BlcnR5ID0gZWFjaFByb3A7XG4gICAgaWYgKGVhY2hQcm9wLm1hdGNoKC9cXC4vKSkge1xuICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZSh0aGlzLmFyZ3MsIGVhY2hQcm9wLCB0cnVlKTtcbiAgICB9XG4gICAgdmFyIGRlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgIGlmICh2IGluc3RhbmNlb2YgX0JhZy5CYWcpIHtcbiAgICAgICAgdiA9IHYubGlzdDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnZpZXdMaXN0cy5oYXModGFnKSkge1xuICAgICAgICB0aGlzLnZpZXdMaXN0cy5nZXQodGFnKS5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIHZhciB2aWV3TGlzdCA9IG5ldyBfVmlld0xpc3QuVmlld0xpc3Qoc3ViVGVtcGxhdGUsIGFzUHJvcCwgdiwgdGhpcywga2V5UHJvcCwgdmlld0NsYXNzKTtcbiAgICAgIHZhciB2aWV3TGlzdFJlbW92ZXIgPSAoKSA9PiB2aWV3TGlzdC5yZW1vdmUoKTtcbiAgICAgIHRoaXMub25SZW1vdmUodmlld0xpc3RSZW1vdmVyKTtcbiAgICAgIHZpZXdMaXN0Lm9uUmVtb3ZlKCgpID0+IHRoaXMuX29uUmVtb3ZlLnJlbW92ZSh2aWV3TGlzdFJlbW92ZXIpKTtcbiAgICAgIHZhciBkZWJpbmRBID0gdGhpcy5hcmdzLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICBpZiAoayA9PT0gJ19pZCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkKSB7XG4gICAgICAgICAgdmlld0xpc3Quc3ViQXJnc1trXSA9IHY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGsgaW4gdmlld0xpc3Quc3ViQXJncykge1xuICAgICAgICAgICAgZGVsZXRlIHZpZXdMaXN0LnN1YkFyZ3Nba107XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZhciBkZWJpbmRCID0gdmlld0xpc3QuYXJncy5iaW5kVG8oKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgICAgaWYgKGsgPT09ICdfaWQnIHx8IGsgPT09ICd2YWx1ZScgfHwgU3RyaW5nKGspLnN1YnN0cmluZygwLCAzKSA9PT0gJ19fXycpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkKSB7XG4gICAgICAgICAgaWYgKGsgaW4gdGhpcy5hcmdzKSB7XG4gICAgICAgICAgICB0aGlzLmFyZ3Nba10gPSB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5hcmdzW2tdO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZpZXdMaXN0Lm9uUmVtb3ZlKGRlYmluZEEpO1xuICAgICAgdmlld0xpc3Qub25SZW1vdmUoZGViaW5kQik7XG4gICAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZEEpO1xuICAgICAgdGhpcy5vblJlbW92ZShkZWJpbmRCKTtcbiAgICAgIHdoaWxlICh0YWcuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YWcucmVtb3ZlQ2hpbGQodGFnLmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgICAgdGhpcy52aWV3TGlzdHMuc2V0KHRhZywgdmlld0xpc3QpO1xuICAgICAgdmlld0xpc3QucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgICBpZiAodGFnLnRhZ05hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICAgIHZpZXdMaXN0LnJlUmVuZGVyKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZShkZWJpbmQpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwSWZUYWcodGFnKSB7XG4gICAgdmFyIHNvdXJjZVRhZyA9IHRhZztcbiAgICB2YXIgdmlld1Byb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciBpZlByb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtaWYnKTtcbiAgICB2YXIgaXNQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWlzJyk7XG4gICAgdmFyIGludmVydGVkID0gZmFsc2U7XG4gICAgdmFyIGRlZmluZWQgPSBmYWxzZTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtaWYnKTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1pcycpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSB2aWV3UHJvcGVydHkgPyB0aGlzLnN0cmluZ1RvQ2xhc3Modmlld1Byb3BlcnR5KSA6IFZpZXc7XG4gICAgaWYgKGlmUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnIScpIHtcbiAgICAgIGlmUHJvcGVydHkgPSBpZlByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgIGludmVydGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlmUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnPycpIHtcbiAgICAgIGlmUHJvcGVydHkgPSBpZlByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgIGRlZmluZWQgPSB0cnVlO1xuICAgIH1cbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi5zb3VyY2VUYWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgYmluZGluZ1ZpZXcgPSB0aGlzO1xuICAgIHZhciBpZkRvYyA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICAvLyBsZXQgdmlldyA9IG5ldyB2aWV3Q2xhc3MoT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5hcmdzKSwgYmluZGluZ1ZpZXcpO1xuICAgIHZhciB2aWV3ID0gbmV3IHZpZXdDbGFzcyh0aGlzLmFyZ3MsIGJpbmRpbmdWaWV3KTtcbiAgICB2aWV3LnRhZ3MuYmluZFRvKCh2LCBrKSA9PiB0aGlzLnRhZ3Nba10gPSB2LCB7XG4gICAgICByZW1vdmVXaXRoOiB0aGlzXG4gICAgfSk7XG4gICAgdmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAgIHZhciBwcm94eSA9IGJpbmRpbmdWaWV3LmFyZ3M7XG4gICAgdmFyIHByb3BlcnR5ID0gaWZQcm9wZXJ0eTtcbiAgICBpZiAoaWZQcm9wZXJ0eS5tYXRjaCgvXFwuLykpIHtcbiAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoYmluZGluZ1ZpZXcuYXJncywgaWZQcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgfVxuICAgIHZpZXcucmVuZGVyKGlmRG9jLCBudWxsLCB0aGlzKTtcbiAgICB2YXIgcHJvcGVydHlEZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrKSA9PiB7XG4gICAgICB2YXIgbyA9IHY7XG4gICAgICBpZiAoZGVmaW5lZCkge1xuICAgICAgICB2ID0gdiAhPT0gbnVsbCAmJiB2ICE9PSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBpZiAodiBpbnN0YW5jZW9mIF9CYWcuQmFnKSB7XG4gICAgICAgIHYgPSB2Lmxpc3Q7XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgICB2ID0gISF2Lmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGlmIChpc1Byb3BlcnR5ICE9PSBudWxsKSB7XG4gICAgICAgIHYgPSBvID09IGlzUHJvcGVydHk7XG4gICAgICB9XG4gICAgICBpZiAoaW52ZXJ0ZWQpIHtcbiAgICAgICAgdiA9ICF2O1xuICAgICAgfVxuICAgICAgaWYgKHYpIHtcbiAgICAgICAgdGFnLmFwcGVuZENoaWxkKGlmRG9jKTtcbiAgICAgICAgWy4uLmlmRG9jLmNoaWxkTm9kZXNdLmZvckVhY2gobm9kZSA9PiBfRG9tLkRvbS5tYXBUYWdzKG5vZGUsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgICAgICBpZiAoIXRhZy5tYXRjaGVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZEb21BdHRhY2hlZCcsIHtcbiAgICAgICAgICAgIHRhcmdldDogdGFnLFxuICAgICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZpZXcubm9kZXMuZm9yRWFjaChuID0+IGlmRG9jLmFwcGVuZENoaWxkKG4pKTtcbiAgICAgICAgX0RvbS5Eb20ubWFwVGFncyhpZkRvYywgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgICAgIGlmICghdGFnLm1hdGNoZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3IEN1c3RvbUV2ZW50KCdjdkRvbURldGFjaGVkJywge1xuICAgICAgICAgICAgdGFyZ2V0OiB0YWcsXG4gICAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShwcm94eVtwcm9wZXJ0eV0pXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBwcm9wZXJ0eURlYmluZCA9IHRoaXMuYXJncy5iaW5kQ2hhaW4ocHJvcGVydHksIG9uVXBkYXRlKTtcblxuICAgIGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcblxuICAgIC8vIGNvbnN0IGRlYmluZEEgPSB0aGlzLmFyZ3MuYmluZFRvKCh2LGssdCxkKSA9PiB7XG4gICAgLy8gXHRpZihrID09PSAnX2lkJylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0cmV0dXJuO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRpZighZClcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0dmlldy5hcmdzW2tdID0gdjtcbiAgICAvLyBcdH1cbiAgICAvLyBcdGVsc2UgaWYoayBpbiB2aWV3LmFyZ3MpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdGRlbGV0ZSB2aWV3LmFyZ3Nba107XG4gICAgLy8gXHR9XG5cbiAgICAvLyB9KTtcblxuICAgIC8vIGNvbnN0IGRlYmluZEIgPSB2aWV3LmFyZ3MuYmluZFRvKCh2LGssdCxkLHApID0+IHtcbiAgICAvLyBcdGlmKGsgPT09ICdfaWQnIHx8IFN0cmluZyhrKS5zdWJzdHJpbmcoMCwzKSA9PT0gJ19fXycpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdHJldHVybjtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0aWYoayBpbiB0aGlzLmFyZ3MpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdGlmKCFkKVxuICAgIC8vIFx0XHR7XG4gICAgLy8gXHRcdFx0dGhpcy5hcmdzW2tdID0gdjtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0XHRlbHNlXG4gICAgLy8gXHRcdHtcbiAgICAvLyBcdFx0XHRkZWxldGUgdGhpcy5hcmdzW2tdO1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHR9XG4gICAgLy8gfSk7XG5cbiAgICB2YXIgdmlld0RlYmluZCA9ICgpID0+IHtcbiAgICAgIHByb3BlcnR5RGViaW5kKCk7XG4gICAgICAvLyBkZWJpbmRBKCk7XG4gICAgICAvLyBkZWJpbmRCKCk7XG4gICAgICBiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcbiAgICAgIC8vIGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUoYmluZGFibGVEZWJpbmQpO1xuICAgIH07XG4gICAgYmluZGluZ1ZpZXcub25SZW1vdmUodmlld0RlYmluZCk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAvLyBkZWJpbmRBKCk7XG4gICAgICAvLyBkZWJpbmRCKCk7XG4gICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgaWYgKGJpbmRpbmdWaWV3ICE9PSB0aGlzKSB7XG4gICAgICAgIGJpbmRpbmdWaWV3LnJlbW92ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBjb21waWxlSWZUYWcoc291cmNlVGFnKVxuICAvLyB7XG4gIC8vIFx0bGV0IGlmUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1pZicpO1xuICAvLyBcdGxldCBpbnZlcnRlZCAgID0gZmFsc2U7XG5cbiAgLy8gXHRzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1pZicpO1xuXG4gIC8vIFx0aWYoaWZQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICchJylcbiAgLy8gXHR7XG4gIC8vIFx0XHRpZlByb3BlcnR5ID0gaWZQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gIC8vIFx0XHRpbnZlcnRlZCAgID0gdHJ1ZTtcbiAgLy8gXHR9XG5cbiAgLy8gXHRjb25zdCBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50O1xuXG4gIC8vIFx0Wy4uLnNvdXJjZVRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKFxuICAvLyBcdFx0biA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuLmNsb25lTm9kZSh0cnVlKSlcbiAgLy8gXHQpO1xuXG4gIC8vIFx0cmV0dXJuIChiaW5kaW5nVmlldykgPT4ge1xuXG4gIC8vIFx0XHRjb25zdCB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKCk7XG5cbiAgLy8gXHRcdGNvbnN0IGlmRG9jID0gbmV3IERvY3VtZW50RnJhZ21lbnQ7XG5cbiAgLy8gXHRcdGxldCB2aWV3ID0gbmV3IFZpZXcoe30sIGJpbmRpbmdWaWV3KTtcblxuICAvLyBcdFx0dmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAvLyBcdFx0Ly8gdmlldy5wYXJlbnQgICA9IGJpbmRpbmdWaWV3O1xuXG4gIC8vIFx0XHRiaW5kaW5nVmlldy5zeW5jQmluZCh2aWV3KTtcblxuICAvLyBcdFx0bGV0IHByb3h5ICAgID0gYmluZGluZ1ZpZXcuYXJncztcbiAgLy8gXHRcdGxldCBwcm9wZXJ0eSA9IGlmUHJvcGVydHk7XG5cbiAgLy8gXHRcdGlmKGlmUHJvcGVydHkubWF0Y2goL1xcLi8pKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRbcHJveHksIHByb3BlcnR5XSA9IEJpbmRhYmxlLnJlc29sdmUoXG4gIC8vIFx0XHRcdFx0YmluZGluZ1ZpZXcuYXJnc1xuICAvLyBcdFx0XHRcdCwgaWZQcm9wZXJ0eVxuICAvLyBcdFx0XHRcdCwgdHJ1ZVxuICAvLyBcdFx0XHQpO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRsZXQgaGFzUmVuZGVyZWQgPSBmYWxzZTtcblxuICAvLyBcdFx0Y29uc3QgcHJvcGVydHlEZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LGspID0+IHtcblxuICAvLyBcdFx0XHRpZighaGFzUmVuZGVyZWQpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRjb25zdCByZW5kZXJEb2MgPSAoYmluZGluZ1ZpZXcuYXJnc1twcm9wZXJ0eV0gfHwgaW52ZXJ0ZWQpXG4gIC8vIFx0XHRcdFx0XHQ/IHRhZyA6IGlmRG9jO1xuXG4gIC8vIFx0XHRcdFx0dmlldy5yZW5kZXIocmVuZGVyRG9jKTtcblxuICAvLyBcdFx0XHRcdGhhc1JlbmRlcmVkID0gdHJ1ZTtcblxuICAvLyBcdFx0XHRcdHJldHVybjtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGlmKEFycmF5LmlzQXJyYXkodikpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR2ID0gISF2Lmxlbmd0aDtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGlmKGludmVydGVkKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0diA9ICF2O1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0aWYodilcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHRhZy5hcHBlbmRDaGlsZChpZkRvYyk7XG4gIC8vIFx0XHRcdH1cbiAgLy8gXHRcdFx0ZWxzZVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0dmlldy5ub2Rlcy5mb3JFYWNoKG49PmlmRG9jLmFwcGVuZENoaWxkKG4pKTtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHR9KTtcblxuICAvLyBcdFx0Ly8gbGV0IGNsZWFuZXIgPSBiaW5kaW5nVmlldztcblxuICAvLyBcdFx0Ly8gd2hpbGUoY2xlYW5lci5wYXJlbnQpXG4gIC8vIFx0XHQvLyB7XG4gIC8vIFx0XHQvLyBcdGNsZWFuZXIgPSBjbGVhbmVyLnBhcmVudDtcbiAgLy8gXHRcdC8vIH1cblxuICAvLyBcdFx0YmluZGluZ1ZpZXcub25SZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuXG4gIC8vIFx0XHRsZXQgYmluZGFibGVEZWJpbmQgPSAoKSA9PiB7XG5cbiAgLy8gXHRcdFx0aWYoIXByb3h5LmlzQm91bmQoKSlcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3MocHJveHkpO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdH07XG5cbiAgLy8gXHRcdGxldCB2aWV3RGViaW5kID0gKCk9PntcbiAgLy8gXHRcdFx0cHJvcGVydHlEZWJpbmQoKTtcbiAgLy8gXHRcdFx0YmluZGFibGVEZWJpbmQoKTtcbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUoYmluZGFibGVEZWJpbmQpO1xuICAvLyBcdFx0fTtcblxuICAvLyBcdFx0dmlldy5vblJlbW92ZSh2aWV3RGViaW5kKTtcblxuICAvLyBcdFx0cmV0dXJuIHRhZztcbiAgLy8gXHR9O1xuICAvLyB9XG5cbiAgbWFwVGVtcGxhdGVUYWcodGFnKSB7XG4gICAgLy8gY29uc3QgdGVtcGxhdGVOYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcblxuICAgIC8vIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG5cbiAgICAvLyB0aGlzLnRlbXBsYXRlc1sgdGVtcGxhdGVOYW1lIF0gPSB0YWcudGFnTmFtZSA9PT0gJ1RFTVBMQVRFJ1xuICAgIC8vIFx0PyB0YWcuY2xvbmVOb2RlKHRydWUpLmNvbnRlbnRcbiAgICAvLyBcdDogbmV3IERvY3VtZW50RnJhZ21lbnQodGFnLmlubmVySFRNTCk7XG5cbiAgICB2YXIgdGVtcGxhdGVOYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuICAgIHZhciBzb3VyY2UgPSB0YWcuaW5uZXJIVE1MO1xuICAgIGlmICghVmlldy50ZW1wbGF0ZXMuaGFzKHNvdXJjZSkpIHtcbiAgICAgIFZpZXcudGVtcGxhdGVzLnNldChzb3VyY2UsIGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHRhZy5pbm5lckhUTUwpKTtcbiAgICB9XG4gICAgdGhpcy50ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXSA9IFZpZXcudGVtcGxhdGVzLmdldChzb3VyY2UpO1xuICAgIHRoaXMucG9zdE1hcHBpbmcuYWRkKCgpID0+IHRhZy5yZW1vdmUoKSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBTbG90VGFnKHRhZykge1xuICAgIHZhciB0ZW1wbGF0ZU5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1zbG90Jyk7XG4gICAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXTtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgdGVtcGxhdGUgPSBwYXJlbnQudGVtcGxhdGVzW3RlbXBsYXRlTmFtZV07XG4gICAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICB9XG4gICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFRlbXBsYXRlICR7dGVtcGxhdGVOYW1lfSBub3QgZm91bmQuYCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3Ytc2xvdCcpO1xuICAgIHdoaWxlICh0YWcuZmlyc3RDaGlsZCkge1xuICAgICAgdGFnLmZpcnN0Q2hpbGQucmVtb3ZlKCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdGVtcGxhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAoIVZpZXcudGVtcGxhdGVzLmhhcyh0ZW1wbGF0ZSkpIHtcbiAgICAgICAgVmlldy50ZW1wbGF0ZXMuc2V0KHRlbXBsYXRlLCBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCh0ZW1wbGF0ZSkpO1xuICAgICAgfVxuICAgICAgdGVtcGxhdGUgPSBWaWV3LnRlbXBsYXRlcy5nZXQodGVtcGxhdGUpO1xuICAgIH1cbiAgICB0YWcuYXBwZW5kQ2hpbGQodGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gc3luY0JpbmQoc3ViVmlldylcbiAgLy8ge1xuICAvLyBcdGxldCBkZWJpbmRBID0gdGhpcy5hcmdzLmJpbmRUbygodixrLHQsZCk9PntcbiAgLy8gXHRcdGlmKGsgPT09ICdfaWQnKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRyZXR1cm47XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKHN1YlZpZXcuYXJnc1trXSAhPT0gdilcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0c3ViVmlldy5hcmdzW2tdID0gdjtcbiAgLy8gXHRcdH1cbiAgLy8gXHR9KTtcblxuICAvLyBcdGxldCBkZWJpbmRCID0gc3ViVmlldy5hcmdzLmJpbmRUbygodixrLHQsZCxwKT0+e1xuXG4gIC8vIFx0XHRpZihrID09PSAnX2lkJylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0cmV0dXJuO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRsZXQgbmV3UmVmID0gdjtcbiAgLy8gXHRcdGxldCBvbGRSZWYgPSBwO1xuXG4gIC8vIFx0XHRpZihuZXdSZWYgaW5zdGFuY2VvZiBWaWV3KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRuZXdSZWYgPSBuZXdSZWYuX19fcmVmX19fO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihvbGRSZWYgaW5zdGFuY2VvZiBWaWV3KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRvbGRSZWYgPSBvbGRSZWYuX19fcmVmX19fO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihuZXdSZWYgIT09IG9sZFJlZiAmJiBvbGRSZWYgaW5zdGFuY2VvZiBWaWV3KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRwLnJlbW92ZSgpO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihrIGluIHRoaXMuYXJncylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0dGhpcy5hcmdzW2tdID0gdjtcbiAgLy8gXHRcdH1cblxuICAvLyBcdH0pO1xuXG4gIC8vIFx0dGhpcy5vblJlbW92ZShkZWJpbmRBKTtcbiAgLy8gXHR0aGlzLm9uUmVtb3ZlKGRlYmluZEIpO1xuXG4gIC8vIFx0c3ViVmlldy5vblJlbW92ZSgoKT0+e1xuICAvLyBcdFx0dGhpcy5fb25SZW1vdmUucmVtb3ZlKGRlYmluZEEpO1xuICAvLyBcdFx0dGhpcy5fb25SZW1vdmUucmVtb3ZlKGRlYmluZEIpO1xuICAvLyBcdH0pO1xuICAvLyB9XG5cbiAgcG9zdFJlbmRlcihwYXJlbnROb2RlKSB7fVxuICBhdHRhY2hlZChwYXJlbnROb2RlKSB7fVxuICBpbnRlcnBvbGF0YWJsZShzdHIpIHtcbiAgICByZXR1cm4gISFTdHJpbmcoc3RyKS5tYXRjaCh0aGlzLmludGVycG9sYXRlUmVnZXgpO1xuICB9XG4gIHN0YXRpYyB1dWlkKCkge1xuICAgIHJldHVybiBuZXcgX1V1aWQuVXVpZCgpO1xuICB9XG4gIHJlbW92ZShub3cgPSBmYWxzZSkge1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVtb3ZlJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHZpZXc6IHRoaXNcbiAgICAgIH0sXG4gICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgfSkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZW1vdmVyID0gKCkgPT4ge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnRhZ3MpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy50YWdzW2ldKSkge1xuICAgICAgICAgIHRoaXMudGFnc1tpXSAmJiB0aGlzLnRhZ3NbaV0uZm9yRWFjaCh0ID0+IHQucmVtb3ZlKCkpO1xuICAgICAgICAgIHRoaXMudGFnc1tpXS5zcGxpY2UoMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy50YWdzW2ldICYmIHRoaXMudGFnc1tpXS5yZW1vdmUoKTtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pMyBpbiB0aGlzLm5vZGVzKSB7XG4gICAgICAgIHRoaXMubm9kZXNbX2kzXSAmJiB0aGlzLm5vZGVzW19pM10uZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2N2RG9tRGV0YWNoZWQnKSk7XG4gICAgICAgIHRoaXMubm9kZXNbX2kzXSAmJiB0aGlzLm5vZGVzW19pM10ucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMubm9kZXNbX2kzXSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHRoaXMubm9kZXMuc3BsaWNlKDApO1xuICAgICAgdGhpcy5maXJzdE5vZGUgPSB0aGlzLmxhc3ROb2RlID0gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgaWYgKG5vdykge1xuICAgICAgcmVtb3ZlcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVtb3Zlcik7XG4gICAgfVxuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9vblJlbW92ZS5pdGVtcygpO1xuICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIGNhbGxiYWNrcykge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICAgIHRoaXMuX29uUmVtb3ZlLnJlbW92ZShjYWxsYmFjayk7XG4gICAgfVxuICAgIGZvciAodmFyIGNsZWFudXAgb2YgdGhpcy5jbGVhbnVwKSB7XG4gICAgICBjbGVhbnVwICYmIGNsZWFudXAoKTtcbiAgICB9XG4gICAgdGhpcy5jbGVhbnVwLmxlbmd0aCA9IDA7XG4gICAgZm9yICh2YXIgW3RhZywgdmlld0xpc3RdIG9mIHRoaXMudmlld0xpc3RzKSB7XG4gICAgICB2aWV3TGlzdC5yZW1vdmUoKTtcbiAgICB9XG4gICAgdGhpcy52aWV3TGlzdHMuY2xlYXIoKTtcbiAgICBmb3IgKHZhciBbX2NhbGxiYWNrNSwgdGltZW91dF0gb2YgdGhpcy50aW1lb3V0cykge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQudGltZW91dCk7XG4gICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0LnRpbWVvdXQpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpbnRlcnZhbCBvZiB0aGlzLmludGVydmFscykge1xuICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgfVxuICAgIHRoaXMuaW50ZXJ2YWxzLmxlbmd0aCA9IDA7XG4gICAgZm9yICh2YXIgZnJhbWUgb2YgdGhpcy5mcmFtZXMpIHtcbiAgICAgIGZyYW1lKCk7XG4gICAgfVxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5wcmVSdWxlU2V0LnB1cmdlKCk7XG4gICAgdGhpcy5ydWxlU2V0LnB1cmdlKCk7XG4gICAgdGhpcy5yZW1vdmVkID0gdHJ1ZTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW1vdmVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHZpZXc6IHRoaXNcbiAgICAgIH0sXG4gICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgfSkpO1xuICB9XG4gIGZpbmRUYWcoc2VsZWN0b3IpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMubm9kZXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB2b2lkIDA7XG4gICAgICBpZiAoIXRoaXMubm9kZXNbaV0ucXVlcnlTZWxlY3Rvcikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm5vZGVzW2ldLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBuZXcgX1RhZy5UYWcodGhpcy5ub2Rlc1tpXSwgdGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCA9IHRoaXMubm9kZXNbaV0ucXVlcnlTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBfVGFnLlRhZyhyZXN1bHQsIHRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZmluZFRhZ3Moc2VsZWN0b3IpIHtcbiAgICB2YXIgdG9wTGV2ZWwgPSB0aGlzLm5vZGVzLmZpbHRlcihuID0+IG4ubWF0Y2hlcyAmJiBuLm1hdGNoZXMoc2VsZWN0b3IpKTtcbiAgICB2YXIgc3ViTGV2ZWwgPSB0aGlzLm5vZGVzLmZpbHRlcihuID0+IG4ucXVlcnlTZWxlY3RvckFsbCkubWFwKG4gPT4gWy4uLm4ucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcildKS5mbGF0KCkubWFwKG4gPT4gbmV3IF9UYWcuVGFnKG4sIHRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzKSkgfHwgW107XG4gICAgcmV0dXJuIHRvcExldmVsLmNvbmNhdChzdWJMZXZlbCk7XG4gIH1cbiAgb25SZW1vdmUoY2FsbGJhY2spIHtcbiAgICBpZiAoY2FsbGJhY2sgaW5zdGFuY2VvZiBFdmVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9vblJlbW92ZS5hZGQoY2FsbGJhY2spO1xuICB9XG4gIHVwZGF0ZSgpIHt9XG4gIGJlZm9yZVVwZGF0ZShhcmdzKSB7fVxuICBhZnRlclVwZGF0ZShhcmdzKSB7fVxuICBzdHJpbmdUcmFuc2Zvcm1lcihtZXRob2RzKSB7XG4gICAgcmV0dXJuIHggPT4ge1xuICAgICAgZm9yICh2YXIgbSBpbiBtZXRob2RzKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgbWV0aG9kID0gbWV0aG9kc1ttXTtcbiAgICAgICAgd2hpbGUgKHBhcmVudCAmJiAhcGFyZW50W21ldGhvZF0pIHtcbiAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICghcGFyZW50KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHggPSBwYXJlbnRbbWV0aG9kc1ttXV0oeCk7XG4gICAgICB9XG4gICAgICByZXR1cm4geDtcbiAgICB9O1xuICB9XG4gIHN0cmluZ1RvQ2xhc3MocmVmQ2xhc3NuYW1lKSB7XG4gICAgaWYgKFZpZXcucmVmQ2xhc3Nlcy5oYXMocmVmQ2xhc3NuYW1lKSkge1xuICAgICAgcmV0dXJuIFZpZXcucmVmQ2xhc3Nlcy5nZXQocmVmQ2xhc3NuYW1lKTtcbiAgICB9XG4gICAgdmFyIHJlZkNsYXNzU3BsaXQgPSByZWZDbGFzc25hbWUuc3BsaXQoJy8nKTtcbiAgICB2YXIgcmVmU2hvcnRDbGFzcyA9IHJlZkNsYXNzU3BsaXRbcmVmQ2xhc3NTcGxpdC5sZW5ndGggLSAxXTtcbiAgICB2YXIgcmVmQ2xhc3MgPSByZXF1aXJlKHJlZkNsYXNzbmFtZSk7XG4gICAgVmlldy5yZWZDbGFzc2VzLnNldChyZWZDbGFzc25hbWUsIHJlZkNsYXNzW3JlZlNob3J0Q2xhc3NdKTtcbiAgICByZXR1cm4gcmVmQ2xhc3NbcmVmU2hvcnRDbGFzc107XG4gIH1cbiAgcHJldmVudFBhcnNpbmcobm9kZSkge1xuICAgIG5vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZXMubWFwKG4gPT4gbi5vdXRlckhUTUwpLmpvaW4oJyAnKTtcbiAgfVxuICBsaXN0ZW4obm9kZSwgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbnMgPSBjYWxsYmFjaztcbiAgICAgIGNhbGxiYWNrID0gZXZlbnROYW1lO1xuICAgICAgZXZlbnROYW1lID0gbm9kZTtcbiAgICAgIG5vZGUgPSB0aGlzO1xuICAgIH1cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpc3Rlbihub2RlLm5vZGVzLCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLm1hcChuID0+IHRoaXMubGlzdGVuKG4sIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpKTtcbiAgICAgIC8vIC5mb3JFYWNoKHIgPT4gcigpKTtcbiAgICB9XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdGVuKG5vZGUuZWxlbWVudCwgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgfVxuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB2YXIgcmVtb3ZlID0gKCkgPT4gbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIHZhciByZW1vdmVyID0gKCkgPT4ge1xuICAgICAgcmVtb3ZlKCk7XG4gICAgICByZW1vdmUgPSAoKSA9PiB7fTtcbiAgICB9O1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4gcmVtb3ZlcigpKTtcbiAgICByZXR1cm4gcmVtb3ZlcjtcbiAgfVxuICBkZXRhY2goKSB7XG4gICAgZm9yICh2YXIgbiBpbiB0aGlzLm5vZGVzKSB7XG4gICAgICB0aGlzLm5vZGVzW25dLnJlbW92ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgfVxufVxuZXhwb3J0cy5WaWV3ID0gVmlldztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShWaWV3LCAndGVtcGxhdGVzJywge1xuICB2YWx1ZTogbmV3IE1hcCgpXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShWaWV3LCAncmVmQ2xhc3NlcycsIHtcbiAgdmFsdWU6IG5ldyBNYXAoKVxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9WaWV3TGlzdC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVmlld0xpc3QgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgX1NldE1hcCA9IHJlcXVpcmUoXCIuL1NldE1hcFwiKTtcbnZhciBfQmFnID0gcmVxdWlyZShcIi4vQmFnXCIpO1xuY2xhc3MgVmlld0xpc3Qge1xuICBjb25zdHJ1Y3Rvcih0ZW1wbGF0ZSwgc3ViUHJvcGVydHksIGxpc3QsIHBhcmVudCwga2V5UHJvcGVydHkgPSBudWxsLCB2aWV3Q2xhc3MgPSBudWxsKSB7XG4gICAgdGhpcy5yZW1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5hcmdzID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICB0aGlzLmFyZ3MudmFsdWUgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKGxpc3QgfHwgT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgdGhpcy5zdWJBcmdzID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICB0aGlzLnZpZXdzID0gW107XG4gICAgdGhpcy5jbGVhbnVwID0gW107XG4gICAgdGhpcy52aWV3Q2xhc3MgPSB2aWV3Q2xhc3M7XG4gICAgdGhpcy5fb25SZW1vdmUgPSBuZXcgX0JhZy5CYWcoKTtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgdGhpcy5zdWJQcm9wZXJ0eSA9IHN1YlByb3BlcnR5O1xuICAgIHRoaXMua2V5UHJvcGVydHkgPSBrZXlQcm9wZXJ0eTtcbiAgICB0aGlzLnRhZyA9IG51bGw7XG4gICAgdGhpcy5kb3duRGViaW5kID0gW107XG4gICAgdGhpcy51cERlYmluZCA9IFtdO1xuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy52aWV3Q291bnQgPSAwO1xuICAgIHRoaXMucmVuZGVyZWQgPSBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpID0+IHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVuZGVyQ29tcGxldGUnLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZTogYWNjZXB0XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLndpbGxSZVJlbmRlciA9IGZhbHNlO1xuICAgIHRoaXMuYXJncy5fX19iZWZvcmUoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgIGlmIChlID09ICdiaW5kVG8nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMucGF1c2VkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLmFyZ3MuX19fYWZ0ZXIoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgIGlmIChlID09ICdiaW5kVG8nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMucGF1c2VkID0gcy5sZW5ndGggPiAxO1xuICAgICAgdGhpcy5yZVJlbmRlcigpO1xuICAgIH0pO1xuICAgIHZhciBkZWJpbmQgPSB0aGlzLmFyZ3MudmFsdWUuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGtrID0gaztcbiAgICAgIGlmICh0eXBlb2YgayA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlzTmFOKGspKSB7XG4gICAgICAgIGtrID0gJ18nICsgaztcbiAgICAgIH1cbiAgICAgIGlmIChkKSB7XG4gICAgICAgIGlmICh0aGlzLnZpZXdzW2trXSkge1xuICAgICAgICAgIHRoaXMudmlld3Nba2tdLnJlbW92ZSh0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy52aWV3c1tra107XG4gICAgICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgICAgIGlmICghdGhpcy52aWV3c1tpXSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpc05hTihpKSkge1xuICAgICAgICAgICAgdGhpcy52aWV3c1tpXS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gaS5zdWJzdHIoMSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52aWV3c1tpXS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gaTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghdGhpcy52aWV3c1tra10pIHtcbiAgICAgICAgaWYgKCF0aGlzLnZpZXdDb3VudCkge1xuICAgICAgICAgIHRoaXMucmVSZW5kZXIoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy53aWxsUmVSZW5kZXIgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLndpbGxSZVJlbmRlciA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMud2lsbFJlUmVuZGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgIHRoaXMucmVSZW5kZXIoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0aGlzLnZpZXdzW2trXSAmJiB0aGlzLnZpZXdzW2trXS5hcmdzKSB7XG4gICAgICAgIHRoaXMudmlld3Nba2tdLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBrO1xuICAgICAgICB0aGlzLnZpZXdzW2trXS5hcmdzW3RoaXMuc3ViUHJvcGVydHldID0gdjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB3YWl0OiAwXG4gICAgfSk7XG4gICAgdGhpcy5fb25SZW1vdmUuYWRkKGRlYmluZCk7XG4gICAgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKHRoaXMpO1xuICB9XG4gIHJlbmRlcih0YWcpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciByZW5kZXJzID0gW107XG4gICAgdmFyIF9sb29wID0gZnVuY3Rpb24gKHZpZXcpIHtcbiAgICAgIHZpZXcudmlld0xpc3QgPSBfdGhpcztcbiAgICAgIHZpZXcucmVuZGVyKHRhZywgbnVsbCwgX3RoaXMucGFyZW50KTtcbiAgICAgIHJlbmRlcnMucHVzaCh2aWV3LnJlbmRlcmVkLnRoZW4oKCkgPT4gdmlldykpO1xuICAgIH07XG4gICAgZm9yICh2YXIgdmlldyBvZiB0aGlzLnZpZXdzKSB7XG4gICAgICBfbG9vcCh2aWV3KTtcbiAgICB9XG4gICAgdGhpcy50YWcgPSB0YWc7XG4gICAgUHJvbWlzZS5hbGwocmVuZGVycykudGhlbih2aWV3cyA9PiB0aGlzLnJlbmRlckNvbXBsZXRlKHZpZXdzKSk7XG4gICAgdGhpcy5wYXJlbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RSZW5kZXJlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBrZXk6IHRoaXMuc3ViUHJvcGVydHksXG4gICAgICAgICAgdmFsdWU6IHRoaXMuYXJncy52YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG4gIHJlUmVuZGVyKCkge1xuICAgIHZhciBfdGhpczIgPSB0aGlzO1xuICAgIGlmICh0aGlzLnBhdXNlZCB8fCAhdGhpcy50YWcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHZpZXdzID0gW107XG4gICAgdmFyIGV4aXN0aW5nVmlld3MgPSBuZXcgX1NldE1hcC5TZXRNYXAoKTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgIHZhciB2aWV3ID0gdGhpcy52aWV3c1tpXTtcbiAgICAgIGlmICh2aWV3ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmlld3NbaV0gPSB2aWV3O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciByYXdWYWx1ZSA9IHZpZXcuYXJnc1t0aGlzLnN1YlByb3BlcnR5XTtcbiAgICAgIGV4aXN0aW5nVmlld3MuYWRkKHJhd1ZhbHVlLCB2aWV3KTtcbiAgICAgIHZpZXdzW2ldID0gdmlldztcbiAgICB9XG4gICAgdmFyIGZpbmFsVmlld3MgPSBbXTtcbiAgICB2YXIgZmluYWxWaWV3U2V0ID0gbmV3IFNldCgpO1xuICAgIHRoaXMuZG93bkRlYmluZC5sZW5ndGggJiYgdGhpcy5kb3duRGViaW5kLmZvckVhY2goZCA9PiBkICYmIGQoKSk7XG4gICAgdGhpcy51cERlYmluZC5sZW5ndGggJiYgdGhpcy51cERlYmluZC5mb3JFYWNoKGQgPT4gZCAmJiBkKCkpO1xuICAgIHRoaXMudXBEZWJpbmQubGVuZ3RoID0gMDtcbiAgICB0aGlzLmRvd25EZWJpbmQubGVuZ3RoID0gMDtcbiAgICB2YXIgbWluS2V5ID0gSW5maW5pdHk7XG4gICAgdmFyIGFudGVNaW5LZXkgPSBJbmZpbml0eTtcbiAgICB2YXIgX2xvb3AyID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICB2YXIgayA9IF9pO1xuICAgICAgaWYgKGlzTmFOKGspKSB7XG4gICAgICAgIGsgPSAnXycgKyBfaTtcbiAgICAgIH0gZWxzZSBpZiAoU3RyaW5nKGspLmxlbmd0aCkge1xuICAgICAgICBrID0gTnVtYmVyKGspO1xuICAgICAgfVxuICAgICAgaWYgKF90aGlzMi5hcmdzLnZhbHVlW19pXSAhPT0gdW5kZWZpbmVkICYmIGV4aXN0aW5nVmlld3MuaGFzKF90aGlzMi5hcmdzLnZhbHVlW19pXSkpIHtcbiAgICAgICAgdmFyIGV4aXN0aW5nVmlldyA9IGV4aXN0aW5nVmlld3MuZ2V0T25lKF90aGlzMi5hcmdzLnZhbHVlW19pXSk7XG4gICAgICAgIGlmIChleGlzdGluZ1ZpZXcpIHtcbiAgICAgICAgICBleGlzdGluZ1ZpZXcuYXJnc1tfdGhpczIua2V5UHJvcGVydHldID0gX2k7XG4gICAgICAgICAgZmluYWxWaWV3c1trXSA9IGV4aXN0aW5nVmlldztcbiAgICAgICAgICBmaW5hbFZpZXdTZXQuYWRkKGV4aXN0aW5nVmlldyk7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIGlmICghaXNOYU4oaykpIHtcbiAgICAgICAgICAgIG1pbktleSA9IE1hdGgubWluKG1pbktleSwgayk7XG4gICAgICAgICAgICBrID4gMCAmJiAoYW50ZU1pbktleSA9IE1hdGgubWluKGFudGVNaW5LZXksIGspKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZXhpc3RpbmdWaWV3cy5yZW1vdmUoX3RoaXMyLmFyZ3MudmFsdWVbX2ldLCBleGlzdGluZ1ZpZXcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgIHZhciB2aWV3QXJncyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIHZhciBfdmlldyA9IGZpbmFsVmlld3Nba10gPSBuZXcgX3RoaXMyLnZpZXdDbGFzcyh2aWV3QXJncywgX3RoaXMyLnBhcmVudCk7XG4gICAgICAgIGlmICghaXNOYU4oaykpIHtcbiAgICAgICAgICBtaW5LZXkgPSBNYXRoLm1pbihtaW5LZXksIGspO1xuICAgICAgICAgIGsgPiAwICYmIChhbnRlTWluS2V5ID0gTWF0aC5taW4oYW50ZU1pbktleSwgaykpO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsVmlld3Nba10udGVtcGxhdGUgPSBfdGhpczIudGVtcGxhdGU7XG4gICAgICAgIGZpbmFsVmlld3Nba10udmlld0xpc3QgPSBfdGhpczI7XG4gICAgICAgIGZpbmFsVmlld3Nba10uYXJnc1tfdGhpczIua2V5UHJvcGVydHldID0gX2k7XG4gICAgICAgIGZpbmFsVmlld3Nba10uYXJnc1tfdGhpczIuc3ViUHJvcGVydHldID0gX3RoaXMyLmFyZ3MudmFsdWVbX2ldO1xuICAgICAgICBfdGhpczIudXBEZWJpbmRba10gPSB2aWV3QXJncy5iaW5kVG8oX3RoaXMyLnN1YlByb3BlcnR5LCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIHZhciBpbmRleCA9IHZpZXdBcmdzW190aGlzMi5rZXlQcm9wZXJ0eV07XG4gICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBfdGhpczIuYXJncy52YWx1ZVtpbmRleF07XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIF90aGlzMi5hcmdzLnZhbHVlW2luZGV4XSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICBfdGhpczIuZG93bkRlYmluZFtrXSA9IF90aGlzMi5zdWJBcmdzLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICBkZWxldGUgdmlld0FyZ3Nba107XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZpZXdBcmdzW2tdID0gdjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciB1cERlYmluZCA9ICgpID0+IHtcbiAgICAgICAgICBfdGhpczIudXBEZWJpbmQuZmlsdGVyKHggPT4geCkuZm9yRWFjaChkID0+IGQoKSk7XG4gICAgICAgICAgX3RoaXMyLnVwRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBkb3duRGViaW5kID0gKCkgPT4ge1xuICAgICAgICAgIF90aGlzMi5kb3duRGViaW5kLmZpbHRlcih4ID0+IHgpLmZvckVhY2goZCA9PiBkKCkpO1xuICAgICAgICAgIF90aGlzMi5kb3duRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgICAgIH07XG4gICAgICAgIF92aWV3Lm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBfdGhpczIuX29uUmVtb3ZlLnJlbW92ZSh1cERlYmluZCk7XG4gICAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5yZW1vdmUoZG93bkRlYmluZCk7XG4gICAgICAgICAgX3RoaXMyLnVwRGViaW5kW2tdICYmIF90aGlzMi51cERlYmluZFtrXSgpO1xuICAgICAgICAgIF90aGlzMi5kb3duRGViaW5kW2tdICYmIF90aGlzMi5kb3duRGViaW5kW2tdKCk7XG4gICAgICAgICAgZGVsZXRlIF90aGlzMi51cERlYmluZFtrXTtcbiAgICAgICAgICBkZWxldGUgX3RoaXMyLmRvd25EZWJpbmRba107XG4gICAgICAgIH0pO1xuICAgICAgICBfdGhpczIuX29uUmVtb3ZlLmFkZCh1cERlYmluZCk7XG4gICAgICAgIF90aGlzMi5fb25SZW1vdmUuYWRkKGRvd25EZWJpbmQpO1xuICAgICAgICB2aWV3QXJnc1tfdGhpczIuc3ViUHJvcGVydHldID0gX3RoaXMyLmFyZ3MudmFsdWVbX2ldO1xuICAgICAgfVxuICAgIH07XG4gICAgZm9yICh2YXIgX2kgaW4gdGhpcy5hcmdzLnZhbHVlKSB7XG4gICAgICBfbG9vcDIoKTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2kyIGluIHZpZXdzKSB7XG4gICAgICBpZiAodmlld3NbX2kyXSAmJiAhZmluYWxWaWV3U2V0Lmhhcyh2aWV3c1tfaTJdKSkge1xuICAgICAgICB2aWV3c1tfaTJdLnJlbW92ZSh0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5hcmdzLnZhbHVlKSkge1xuICAgICAgdmFyIGxvY2FsTWluID0gbWluS2V5ID09PSAwICYmIGZpbmFsVmlld3NbMV0gIT09IHVuZGVmaW5lZCAmJiBmaW5hbFZpZXdzLmxlbmd0aCA+IDEgfHwgYW50ZU1pbktleSA9PT0gSW5maW5pdHkgPyBtaW5LZXkgOiBhbnRlTWluS2V5O1xuICAgICAgdmFyIHJlbmRlclJlY3Vyc2UgPSAoaSA9IDApID0+IHtcbiAgICAgICAgdmFyIGlpID0gZmluYWxWaWV3cy5sZW5ndGggLSBpIC0gMTtcbiAgICAgICAgd2hpbGUgKGlpID4gbG9jYWxNaW4gJiYgZmluYWxWaWV3c1tpaV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlpLS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlpIDwgbG9jYWxNaW4pIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbmFsVmlld3NbaWldID09PSB0aGlzLnZpZXdzW2lpXSkge1xuICAgICAgICAgIGlmIChmaW5hbFZpZXdzW2lpXSAmJiAhZmluYWxWaWV3c1tpaV0uZmlyc3ROb2RlKSB7XG4gICAgICAgICAgICBmaW5hbFZpZXdzW2lpXS5yZW5kZXIodGhpcy50YWcsIGZpbmFsVmlld3NbaWkgKyAxXSwgdGhpcy5wYXJlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGZpbmFsVmlld3NbaWldLnJlbmRlcmVkLnRoZW4oKCkgPT4gcmVuZGVyUmVjdXJzZShOdW1iZXIoaSkgKyAxKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzcGxpdCA9IDUwMDtcbiAgICAgICAgICAgIGlmIChpID09PSAwIHx8IGkgJSBzcGxpdCkge1xuICAgICAgICAgICAgICByZXR1cm4gcmVuZGVyUmVjdXJzZShOdW1iZXIoaSkgKyAxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhY2NlcHQgPT4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGFjY2VwdChyZW5kZXJSZWN1cnNlKE51bWJlcihpKSArIDEpKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmaW5hbFZpZXdzW2lpXS5yZW5kZXIodGhpcy50YWcsIGZpbmFsVmlld3NbaWkgKyAxXSwgdGhpcy5wYXJlbnQpO1xuICAgICAgICB0aGlzLnZpZXdzLnNwbGljZShpaSwgMCwgZmluYWxWaWV3c1tpaV0pO1xuICAgICAgICByZXR1cm4gZmluYWxWaWV3c1tpaV0ucmVuZGVyZWQudGhlbigoKSA9PiByZW5kZXJSZWN1cnNlKGkgKyAxKSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5yZW5kZXJlZCA9IHJlbmRlclJlY3Vyc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHJlbmRlcnMgPSBbXTtcbiAgICAgIHZhciBsZWZ0b3ZlcnMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5jcmVhdGUobnVsbCksIGZpbmFsVmlld3MpO1xuICAgICAgdmFyIGlzSW50ID0geCA9PiBwYXJzZUludCh4KSA9PT0geCAtIDA7XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGZpbmFsVmlld3MpLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgaWYgKGlzSW50KGEpICYmIGlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIE1hdGguc2lnbihhIC0gYik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc0ludChhKSAmJiAhaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzSW50KGEpICYmIGlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0ludChhKSAmJiAhaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgX2xvb3AzID0gZnVuY3Rpb24gKF9pMykge1xuICAgICAgICBkZWxldGUgbGVmdG92ZXJzW19pM107XG4gICAgICAgIGlmIChmaW5hbFZpZXdzW19pM10uZmlyc3ROb2RlICYmIGZpbmFsVmlld3NbX2kzXSA9PT0gX3RoaXMyLnZpZXdzW19pM10pIHtcbiAgICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBmaW5hbFZpZXdzW19pM10ucmVuZGVyKF90aGlzMi50YWcsIG51bGwsIF90aGlzMi5wYXJlbnQpO1xuICAgICAgICByZW5kZXJzLnB1c2goZmluYWxWaWV3c1tfaTNdLnJlbmRlcmVkLnRoZW4oKCkgPT4gZmluYWxWaWV3c1tfaTNdKSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgX2kzIG9mIGtleXMpIHtcbiAgICAgICAgaWYgKF9sb29wMyhfaTMpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pNCBpbiBsZWZ0b3ZlcnMpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuYXJncy52aWV3c1tfaTRdO1xuICAgICAgICBsZWZ0b3ZlcnMucmVtb3ZlKHRydWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5yZW5kZXJlZCA9IFByb21pc2UuYWxsKHJlbmRlcnMpO1xuICAgIH1cbiAgICBmb3IgKHZhciBfaTUgaW4gZmluYWxWaWV3cykge1xuICAgICAgaWYgKGlzTmFOKF9pNSkpIHtcbiAgICAgICAgZmluYWxWaWV3c1tfaTVdLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBfaTUuc3Vic3RyKDEpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZpbmFsVmlld3NbX2k1XS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gX2k1O1xuICAgIH1cbiAgICB0aGlzLnZpZXdzID0gQXJyYXkuaXNBcnJheSh0aGlzLmFyZ3MudmFsdWUpID8gWy4uLmZpbmFsVmlld3NdIDogZmluYWxWaWV3cztcbiAgICB0aGlzLnZpZXdDb3VudCA9IGZpbmFsVmlld3MubGVuZ3RoO1xuICAgIGZpbmFsVmlld1NldC5jbGVhcigpO1xuICAgIHRoaXMud2lsbFJlUmVuZGVyID0gZmFsc2U7XG4gICAgdGhpcy5yZW5kZXJlZC50aGVuKCgpID0+IHtcbiAgICAgIHRoaXMucGFyZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsaXN0UmVuZGVyZWQnLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAga2V5OiB0aGlzLnN1YlByb3BlcnR5LFxuICAgICAgICAgICAgdmFsdWU6IHRoaXMuYXJncy52YWx1ZSxcbiAgICAgICAgICAgIHRhZzogdGhpcy50YWdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICAgIHRoaXMudGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsaXN0UmVuZGVyZWQnLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAga2V5OiB0aGlzLnN1YlByb3BlcnR5LFxuICAgICAgICAgICAgdmFsdWU6IHRoaXMuYXJncy52YWx1ZSxcbiAgICAgICAgICAgIHRhZzogdGhpcy50YWdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJlZDtcbiAgfVxuICBwYXVzZShwYXVzZSA9IHRydWUpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgIHRoaXMudmlld3NbaV0ucGF1c2UocGF1c2UpO1xuICAgIH1cbiAgfVxuICBvblJlbW92ZShjYWxsYmFjaykge1xuICAgIHRoaXMuX29uUmVtb3ZlLmFkZChjYWxsYmFjayk7XG4gIH1cbiAgcmVtb3ZlKCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgdGhpcy52aWV3c1tpXSAmJiB0aGlzLnZpZXdzW2ldLnJlbW92ZSh0cnVlKTtcbiAgICB9XG4gICAgdmFyIG9uUmVtb3ZlID0gdGhpcy5fb25SZW1vdmUuaXRlbXMoKTtcbiAgICBmb3IgKHZhciBfaTYgaW4gb25SZW1vdmUpIHtcbiAgICAgIHRoaXMuX29uUmVtb3ZlLnJlbW92ZShvblJlbW92ZVtfaTZdKTtcbiAgICAgIG9uUmVtb3ZlW19pNl0oKTtcbiAgICB9XG4gICAgdmFyIGNsZWFudXA7XG4gICAgd2hpbGUgKHRoaXMuY2xlYW51cC5sZW5ndGgpIHtcbiAgICAgIGNsZWFudXAgPSB0aGlzLmNsZWFudXAucG9wKCk7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfVxuICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICB3aGlsZSAodGhpcy50YWcgJiYgdGhpcy50YWcuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy50YWcucmVtb3ZlQ2hpbGQodGhpcy50YWcuZmlyc3RDaGlsZCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN1YkFyZ3MpIHtcbiAgICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMuc3ViQXJncyk7XG4gICAgfVxuICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMuYXJncyk7XG5cbiAgICAvLyBpZih0aGlzLmFyZ3MudmFsdWUgJiYgIXRoaXMuYXJncy52YWx1ZS5pc0JvdW5kKCkpXG4gICAgLy8ge1xuICAgIC8vIFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzLmFyZ3MudmFsdWUpO1xuICAgIC8vIH1cblxuICAgIHRoaXMucmVtb3ZlZCA9IHRydWU7XG4gIH1cbn1cbmV4cG9ydHMuVmlld0xpc3QgPSBWaWV3TGlzdDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9pbnB1dC9LZXlib2FyZC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuS2V5Ym9hcmQgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4uL2Jhc2UvQmluZGFibGVcIik7XG5jbGFzcyBLZXlib2FyZCB7XG4gIHN0YXRpYyBnZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlIHx8IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKG5ldyB0aGlzKCkpO1xuICB9XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubWF4RGVjYXkgPSAxMjA7XG4gICAgdGhpcy5jb21ib1RpbWUgPSA1MDA7XG4gICAgdGhpcy5saXN0ZW5pbmcgPSBmYWxzZTtcbiAgICB0aGlzLmZvY3VzRWxlbWVudCA9IGRvY3VtZW50LmJvZHk7XG4gICAgdGhpc1tfQmluZGFibGUuQmluZGFibGUuTm9HZXR0ZXJzXSA9IHRydWU7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjb21ibycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZShbXSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3doaWNocycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2NvZGVzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAna2V5cycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZXNzZWRXaGljaCcsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZXNzZWRDb2RlJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlc3NlZEtleScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbGVhc2VkV2hpY2gnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZWxlYXNlZENvZGUnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZWxlYXNlZEtleScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2tleVJlZnMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBldmVudCA9PiB7XG4gICAgICBpZiAoIXRoaXMubGlzdGVuaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghKHRoaXMua2V5c1tldmVudC5rZXldID4gMCkgJiYgdGhpcy5mb2N1c0VsZW1lbnQgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAhPT0gdGhpcy5mb2N1c0VsZW1lbnQgJiYgKCF0aGlzLmZvY3VzRWxlbWVudC5jb250YWlucyhkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB8fCBkb2N1bWVudC5hY3RpdmVFbGVtZW50Lm1hdGNoZXMoJ2lucHV0LHRleHRhcmVhJykpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnJlbGVhc2VkV2hpY2hbZXZlbnQud2hpY2hdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucmVsZWFzZWRDb2RlW2V2ZW50LmNvZGVdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucmVsZWFzZWRLZXlbZXZlbnQua2V5XSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLndoaWNoc1tldmVudC53aGljaF0gPSAtMTtcbiAgICAgIHRoaXMuY29kZXNbZXZlbnQuY29kZV0gPSAtMTtcbiAgICAgIHRoaXMua2V5c1tldmVudC5rZXldID0gLTE7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGV2ZW50ID0+IHtcbiAgICAgIGlmICghdGhpcy5saXN0ZW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZm9jdXNFbGVtZW50ICYmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgIT09IHRoaXMuZm9jdXNFbGVtZW50ICYmICghdGhpcy5mb2N1c0VsZW1lbnQuY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkgfHwgZG9jdW1lbnQuYWN0aXZlRWxlbWVudC5tYXRjaGVzKCdpbnB1dCx0ZXh0YXJlYScpKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGV2ZW50LnJlcGVhdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLmNvbWJvLnB1c2goZXZlbnQuY29kZSk7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jb21ib1RpbWVyKTtcbiAgICAgIHRoaXMuY29tYm9UaW1lciA9IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5jb21iby5zcGxpY2UoMCksIHRoaXMuY29tYm9UaW1lKTtcbiAgICAgIHRoaXMucHJlc3NlZFdoaWNoW2V2ZW50LndoaWNoXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnByZXNzZWRDb2RlW2V2ZW50LmNvZGVdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucHJlc3NlZEtleVtldmVudC5rZXldID0gRGF0ZS5ub3coKTtcbiAgICAgIGlmICh0aGlzLmtleXNbZXZlbnQua2V5XSA+IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy53aGljaHNbZXZlbnQud2hpY2hdID0gMTtcbiAgICAgIHRoaXMuY29kZXNbZXZlbnQuY29kZV0gPSAxO1xuICAgICAgdGhpcy5rZXlzW2V2ZW50LmtleV0gPSAxO1xuICAgIH0pO1xuICAgIHZhciB3aW5kb3dCbHVyID0gZXZlbnQgPT4ge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLmtleXMpIHtcbiAgICAgICAgaWYgKHRoaXMua2V5c1tpXSA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbGVhc2VkS2V5W2ldID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdGhpcy5rZXlzW2ldID0gLTE7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaSBpbiB0aGlzLmNvZGVzKSB7XG4gICAgICAgIGlmICh0aGlzLmNvZGVzW19pXSA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbGVhc2VkQ29kZVtfaV0gPSBEYXRlLm5vdygpO1xuICAgICAgICB0aGlzLmNvZGVzW19pXSA9IC0xO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2kyIGluIHRoaXMud2hpY2hzKSB7XG4gICAgICAgIGlmICh0aGlzLndoaWNoc1tfaTJdIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVsZWFzZWRXaGljaFtfaTJdID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdGhpcy53aGljaHNbX2kyXSA9IC0xO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCB3aW5kb3dCbHVyKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsICgpID0+IHtcbiAgICAgIGlmIChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPT09ICd2aXNpYmxlJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB3aW5kb3dCbHVyKCk7XG4gICAgfSk7XG4gIH1cbiAgZ2V0S2V5UmVmKGtleUNvZGUpIHtcbiAgICB2YXIga2V5UmVmID0gdGhpcy5rZXlSZWZzW2tleUNvZGVdID0gdGhpcy5rZXlSZWZzW2tleUNvZGVdIHx8IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KTtcbiAgICByZXR1cm4ga2V5UmVmO1xuICB9XG4gIGdldEtleVRpbWUoa2V5KSB7XG4gICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZEtleVtrZXldO1xuICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkS2V5W2tleV07XG4gICAgaWYgKCFwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gcHJlc3NlZDtcbiAgICB9XG4gICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gIH1cbiAgZ2V0Q29kZVRpbWUoY29kZSkge1xuICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRDb2RlW2NvZGVdO1xuICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkQ29kZVtjb2RlXTtcbiAgICBpZiAoIXByZXNzZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBwcmVzc2VkO1xuICAgIH1cbiAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgfVxuICBnZXRXaGljaFRpbWUoY29kZSkge1xuICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRXaGljaFtjb2RlXTtcbiAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZFdoaWNoW2NvZGVdO1xuICAgIGlmICghcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHByZXNzZWQ7XG4gICAgfVxuICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICB9XG4gIGdldEtleShrZXkpIHtcbiAgICBpZiAoIXRoaXMua2V5c1trZXldKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMua2V5c1trZXldO1xuICB9XG4gIGdldEtleUNvZGUoY29kZSkge1xuICAgIGlmICghdGhpcy5jb2Rlc1tjb2RlXSkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvZGVzW2NvZGVdO1xuICB9XG4gIHJlc2V0KCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5rZXlzKSB7XG4gICAgICBkZWxldGUgdGhpcy5rZXlzW2ldO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMuY29kZXMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmNvZGVzW2ldO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMud2hpY2hzKSB7XG4gICAgICBkZWxldGUgdGhpcy53aGljaHNbaV07XG4gICAgfVxuICB9XG4gIHVwZGF0ZSgpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMua2V5cykge1xuICAgICAgaWYgKHRoaXMua2V5c1tpXSA+IDApIHtcbiAgICAgICAgdGhpcy5rZXlzW2ldKys7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMua2V5c1tpXSA+IC10aGlzLm1heERlY2F5KSB7XG4gICAgICAgIHRoaXMua2V5c1tpXS0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMua2V5c1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmNvZGVzKSB7XG4gICAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkQ29kZVtpXTtcbiAgICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkQ29kZVtpXTtcbiAgICAgIHZhciBrZXlSZWYgPSB0aGlzLmdldEtleVJlZihpKTtcbiAgICAgIGlmICh0aGlzLmNvZGVzW2ldID4gMCkge1xuICAgICAgICBrZXlSZWYuZnJhbWVzID0gdGhpcy5jb2Rlc1tpXSsrO1xuICAgICAgICBrZXlSZWYudGltZSA9IHByZXNzZWQgPyBEYXRlLm5vdygpIC0gcHJlc3NlZCA6IDA7XG4gICAgICAgIGtleVJlZi5kb3duID0gdHJ1ZTtcbiAgICAgICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuY29kZXNbaV0gPiAtdGhpcy5tYXhEZWNheSkge1xuICAgICAgICBrZXlSZWYuZnJhbWVzID0gdGhpcy5jb2Rlc1tpXS0tO1xuICAgICAgICBrZXlSZWYudGltZSA9IHJlbGVhc2VkIC0gRGF0ZS5ub3coKTtcbiAgICAgICAga2V5UmVmLmRvd24gPSBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGtleVJlZi5mcmFtZXMgPSAwO1xuICAgICAgICBrZXlSZWYudGltZSA9IDA7XG4gICAgICAgIGtleVJlZi5kb3duID0gZmFsc2U7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvZGVzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMud2hpY2hzKSB7XG4gICAgICBpZiAodGhpcy53aGljaHNbaV0gPiAwKSB7XG4gICAgICAgIHRoaXMud2hpY2hzW2ldKys7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMud2hpY2hzW2ldID4gLXRoaXMubWF4RGVjYXkpIHtcbiAgICAgICAgdGhpcy53aGljaHNbaV0tLTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndoaWNoc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbmV4cG9ydHMuS2V5Ym9hcmQgPSBLZXlib2FyZDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5FdmVudFRhcmdldE1peGluID0gdm9pZCAwO1xudmFyIF9NaXhpbiA9IHJlcXVpcmUoXCIuLi9iYXNlL01peGluXCIpO1xudmFyIEV2ZW50VGFyZ2V0UGFyZW50ID0gU3ltYm9sKCdFdmVudFRhcmdldFBhcmVudCcpO1xudmFyIENhbGxIYW5kbGVyID0gU3ltYm9sKCdDYWxsSGFuZGxlcicpO1xudmFyIENhcHR1cmUgPSBTeW1ib2woJ0NhcHR1cmUnKTtcbnZhciBCdWJibGUgPSBTeW1ib2woJ0J1YmJsZScpO1xudmFyIFRhcmdldCA9IFN5bWJvbCgnVGFyZ2V0Jyk7XG52YXIgSGFuZGxlcnNCdWJibGUgPSBTeW1ib2woJ0hhbmRsZXJzQnViYmxlJyk7XG52YXIgSGFuZGxlcnNDYXB0dXJlID0gU3ltYm9sKCdIYW5kbGVyc0NhcHR1cmUnKTtcbnZhciBFdmVudFRhcmdldE1peGluID0gZXhwb3J0cy5FdmVudFRhcmdldE1peGluID0ge1xuICBbX01peGluLk1peGluLkNvbnN0cnVjdG9yXSgpIHtcbiAgICB0aGlzW0hhbmRsZXJzQ2FwdHVyZV0gPSBuZXcgTWFwKCk7XG4gICAgdGhpc1tIYW5kbGVyc0J1YmJsZV0gPSBuZXcgTWFwKCk7XG4gIH0sXG4gIGRpc3BhdGNoRXZlbnQoLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgaWYgKHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KGV2ZW50KTtcbiAgICAgIGFyZ3NbMF0gPSBldmVudDtcbiAgICB9XG4gICAgZXZlbnQuY3ZQYXRoID0gZXZlbnQuY3ZQYXRoIHx8IFtdO1xuICAgIGV2ZW50LmN2VGFyZ2V0ID0gZXZlbnQuY3ZDdXJyZW50VGFyZ2V0ID0gdGhpcztcbiAgICB2YXIgcmVzdWx0ID0gdGhpc1tDYXB0dXJlXSguLi5hcmdzKTtcbiAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICB2YXIgaGFuZGxlcnMgPSBbXTtcbiAgICBpZiAodGhpc1tIYW5kbGVyc0NhcHR1cmVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgdmFyIGhhbmRsZXJNYXAgPSB0aGlzW0hhbmRsZXJzQ2FwdHVyZV0uZ2V0KGV2ZW50LnR5cGUpO1xuICAgICAgdmFyIG5ld0hhbmRsZXJzID0gWy4uLmhhbmRsZXJNYXBdO1xuICAgICAgbmV3SGFuZGxlcnMuZm9yRWFjaChoID0+IGgucHVzaChoYW5kbGVyTWFwKSk7XG4gICAgICBoYW5kbGVycy5wdXNoKC4uLm5ld0hhbmRsZXJzKTtcbiAgICB9XG4gICAgaWYgKHRoaXNbSGFuZGxlcnNCdWJibGVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgdmFyIF9oYW5kbGVyTWFwID0gdGhpc1tIYW5kbGVyc0J1YmJsZV0uZ2V0KGV2ZW50LnR5cGUpO1xuICAgICAgdmFyIF9uZXdIYW5kbGVycyA9IFsuLi5faGFuZGxlck1hcF07XG4gICAgICBfbmV3SGFuZGxlcnMuZm9yRWFjaChoID0+IGgucHVzaChfaGFuZGxlck1hcCkpO1xuICAgICAgaGFuZGxlcnMucHVzaCguLi5fbmV3SGFuZGxlcnMpO1xuICAgIH1cbiAgICBoYW5kbGVycy5wdXNoKFsoKSA9PiB0aGlzW0NhbGxIYW5kbGVyXSguLi5hcmdzKSwge30sIG51bGxdKTtcbiAgICBmb3IgKHZhciBbaGFuZGxlciwgb3B0aW9ucywgbWFwXSBvZiBoYW5kbGVycykge1xuICAgICAgaWYgKG9wdGlvbnMub25jZSkge1xuICAgICAgICBtYXAuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gaGFuZGxlcihldmVudCk7XG4gICAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiByZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWV2ZW50LmNhbmNlbGFibGUgfHwgIWV2ZW50LmNhbmNlbEJ1YmJsZSAmJiByZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICB0aGlzW0J1YmJsZV0oLi4uYXJncyk7XG4gICAgfVxuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF0pIHtcbiAgICAgIE9iamVjdC5mcmVlemUoZXZlbnQuY3ZQYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIGV2ZW50LnJldHVyblZhbHVlO1xuICB9LFxuICBhZGRFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgdXNlQ2FwdHVyZTogdHJ1ZVxuICAgICAgfTtcbiAgICB9XG4gICAgdmFyIGhhbmRsZXJzID0gSGFuZGxlcnNCdWJibGU7XG4gICAgaWYgKG9wdGlvbnMudXNlQ2FwdHVyZSkge1xuICAgICAgaGFuZGxlcnMgPSBIYW5kbGVyc0NhcHR1cmU7XG4gICAgfVxuICAgIGlmICghdGhpc1toYW5kbGVyc10uaGFzKHR5cGUpKSB7XG4gICAgICB0aGlzW2hhbmRsZXJzXS5zZXQodHlwZSwgbmV3IE1hcCgpKTtcbiAgICB9XG4gICAgdGhpc1toYW5kbGVyc10uZ2V0KHR5cGUpLnNldChjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgaWYgKG9wdGlvbnMuc2lnbmFsKSB7XG4gICAgICBvcHRpb25zLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIGV2ZW50ID0+IHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgb3B0aW9ucyksIHtcbiAgICAgICAgb25jZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICByZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgdXNlQ2FwdHVyZTogdHJ1ZVxuICAgICAgfTtcbiAgICB9XG4gICAgdmFyIGhhbmRsZXJzID0gSGFuZGxlcnNCdWJibGU7XG4gICAgaWYgKG9wdGlvbnMudXNlQ2FwdHVyZSkge1xuICAgICAgaGFuZGxlcnMgPSBIYW5kbGVyc0NhcHR1cmU7XG4gICAgfVxuICAgIGlmICghdGhpc1toYW5kbGVyc10uaGFzKHR5cGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXNbaGFuZGxlcnNdLmdldCh0eXBlKS5kZWxldGUoY2FsbGJhY2spO1xuICB9LFxuICBbQ2FwdHVyZV0oLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgZXZlbnQuY3ZQYXRoLnB1c2godGhpcyk7XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQ2FwdHVyZV0oLi4uYXJncyk7XG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQ2FwdHVyZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGV2ZW50LmN2Q3VycmVudFRhcmdldCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdO1xuICAgIHZhciB7XG4gICAgICB0eXBlXG4gICAgfSA9IGV2ZW50O1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQ2FwdHVyZV0uZ2V0KHR5cGUpO1xuICAgIGZvciAodmFyIFtoYW5kbGVyLCBvcHRpb25zXSBvZiBoYW5kbGVycykge1xuICAgICAgaWYgKG9wdGlvbnMub25jZSkge1xuICAgICAgICBoYW5kbGVycy5kZWxldGUoaGFuZGxlcik7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG4gIFtCdWJibGVdKC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGlmICghZXZlbnQuYnViYmxlcyB8fCAhdGhpc1tFdmVudFRhcmdldFBhcmVudF0gfHwgZXZlbnQuY2FuY2VsQnViYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNCdWJibGVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgcmV0dXJuIHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0J1YmJsZV0oLi4uYXJncyk7XG4gICAgfVxuICAgIHZhciByZXN1bHQ7XG4gICAgZXZlbnQuY3ZDdXJyZW50VGFyZ2V0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF07XG4gICAgdmFyIHtcbiAgICAgIHR5cGVcbiAgICB9ID0gZXZlbnQ7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNCdWJibGVdLmdldChldmVudC50eXBlKTtcbiAgICBmb3IgKHZhciBbaGFuZGxlciwgb3B0aW9uc10gb2YgaGFuZGxlcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgaGFuZGxlcnMuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gaGFuZGxlcihldmVudCk7XG4gICAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiByZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJlc3VsdCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0NhbGxIYW5kbGVyXSguLi5hcmdzKTtcbiAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQnViYmxlXSguLi5hcmdzKTtcbiAgfSxcbiAgW0NhbGxIYW5kbGVyXSguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZGVmYXVsdEhhbmRsZXIgPSBgb24ke2V2ZW50LnR5cGVbMF0udG9VcHBlckNhc2UoKSArIGV2ZW50LnR5cGUuc2xpY2UoMSl9YDtcbiAgICBpZiAodHlwZW9mIHRoaXNbZGVmYXVsdEhhbmRsZXJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpc1tkZWZhdWx0SGFuZGxlcl0oZXZlbnQpO1xuICAgIH1cbiAgfVxufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFdmVudFRhcmdldE1peGluLCAnUGFyZW50Jywge1xuICB2YWx1ZTogRXZlbnRUYXJnZXRQYXJlbnRcbn0pO1xuICB9KSgpO1xufSk7IiwiZXhwb3J0IGNsYXNzIENvbmZpZyB7fTtcblxuQ29uZmlnLnRpdGxlID0gJ3dnbDJkJztcbi8vIENvbmZpZy4iLCJjbGFzcyBQcm9ncmFtXG57XG5cdGNvbnRleHQgPSBudWxsO1xuXHRwcm9ncmFtID0gbnVsbDtcblxuXHRhdHRyaWJ1dGVzID0ge307XG5cdGJ1ZmZlcnMgPSB7fTtcblx0dW5pZm9ybXMgPSB7fTtcblxuXHRjb25zdHJ1Y3Rvcih7Z2wsIHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXIsIHVuaWZvcm1zLCBhdHRyaWJ1dGVzfSlcblx0e1xuXHRcdHRoaXMuY29udGV4dCA9IGdsO1xuXHRcdHRoaXMucHJvZ3JhbSA9IGdsLmNyZWF0ZVByb2dyYW0oKTtcblxuXHRcdGdsLmF0dGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0Z2wuYXR0YWNoU2hhZGVyKHRoaXMucHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xuXG5cdFx0Z2wubGlua1Byb2dyYW0odGhpcy5wcm9ncmFtKTtcblxuXHRcdGdsLmRldGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0Z2wuZGV0YWNoU2hhZGVyKHRoaXMucHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xuXG5cdFx0Z2wuZGVsZXRlU2hhZGVyKHZlcnRleFNoYWRlcik7XG5cdFx0Z2wuZGVsZXRlU2hhZGVyKGZyYWdtZW50U2hhZGVyKTtcblxuXHRcdGlmKCFnbC5nZXRQcm9ncmFtUGFyYW1ldGVyKHRoaXMucHJvZ3JhbSwgZ2wuTElOS19TVEFUVVMpKVxuXHRcdHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZ2wuZ2V0UHJvZ3JhbUluZm9Mb2codGhpcy5wcm9ncmFtKSk7XG5cdFx0XHRnbC5kZWxldGVQcm9ncmFtKHRoaXMucHJvZ3JhbSk7XG5cdFx0fVxuXG5cdFx0Zm9yKGNvbnN0IHVuaWZvcm0gb2YgdW5pZm9ybXMpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbG9jYXRpb24gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCB1bmlmb3JtKTtcblxuXHRcdFx0aWYobG9jYXRpb24gPT09IG51bGwpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnNvbGUud2FybihgVW5pZm9ybSAke3VuaWZvcm19IG5vdCBmb3VuZC5gKTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudW5pZm9ybXNbdW5pZm9ybV0gPSBsb2NhdGlvbjtcblx0XHR9XG5cblx0XHRmb3IoY29uc3QgYXR0cmlidXRlIG9mIGF0dHJpYnV0ZXMpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbG9jYXRpb24gPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLnByb2dyYW0sIGF0dHJpYnV0ZSk7XG5cblx0XHRcdGlmKGxvY2F0aW9uID09PSBudWxsKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zb2xlLndhcm4oYEF0dHJpYnV0ZSAke2F0dHJpYnV0ZX0gbm90IGZvdW5kLmApO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgYnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG5cblx0XHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCBidWZmZXIpO1xuXHRcdFx0Z2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkobG9jYXRpb24pO1xuXHRcdFx0Z2wudmVydGV4QXR0cmliUG9pbnRlcihcblx0XHRcdFx0bG9jYXRpb25cblx0XHRcdFx0LCAyXG5cdFx0XHRcdCwgZ2wuRkxPQVRcblx0XHRcdFx0LCBmYWxzZVxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCAwXG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLmF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9IGxvY2F0aW9uO1xuXHRcdFx0dGhpcy5idWZmZXJzW2F0dHJpYnV0ZV0gPSBidWZmZXI7XG5cdFx0fVxuXHR9XG5cblx0dXNlKClcblx0e1xuXHRcdHRoaXMuY29udGV4dC51c2VQcm9ncmFtKHRoaXMucHJvZ3JhbSk7XG5cdH1cblxuXHR1bmlmb3JtRihuYW1lLCAuLi5mbG9hdHMpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblx0XHRnbFtgdW5pZm9ybSR7ZmxvYXRzLmxlbmd0aH1mYF0odGhpcy51bmlmb3Jtc1tuYW1lXSwgLi4uZmxvYXRzKTtcblx0fVxuXG5cdHVuaWZvcm1JKG5hbWUsIC4uLmludHMpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblx0XHRnbFtgdW5pZm9ybSR7aW50cy5sZW5ndGh9aWBdKHRoaXMudW5pZm9ybXNbbmFtZV0sIC4uLmludHMpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBHbDJkXG57XG5cdGNvbnN0cnVjdG9yKGVsZW1lbnQpXG5cdHtcblx0XHR0aGlzLmVsZW1lbnQgICA9IGVsZW1lbnQgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5jb250ZXh0ICAgPSB0aGlzLmVsZW1lbnQuZ2V0Q29udGV4dCgnd2ViZ2wnKTtcblx0XHR0aGlzLnNjcmVlblNjYWxlID0gMTtcblx0XHR0aGlzLnpvb21MZXZlbCA9IDI7XG5cdH1cblxuXHRjcmVhdGVTaGFkZXIobG9jYXRpb24pXG5cdHtcblx0XHRjb25zdCBleHRlbnNpb24gPSBsb2NhdGlvbi5zdWJzdHJpbmcobG9jYXRpb24ubGFzdEluZGV4T2YoJy4nKSsxKTtcblx0XHRsZXQgICB0eXBlID0gbnVsbDtcblxuXHRcdHN3aXRjaChleHRlbnNpb24udG9VcHBlckNhc2UoKSlcblx0XHR7XG5cdFx0XHRjYXNlICdWRVJUJzpcblx0XHRcdFx0dHlwZSA9IHRoaXMuY29udGV4dC5WRVJURVhfU0hBREVSO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0ZSQUcnOlxuXHRcdFx0XHR0eXBlID0gdGhpcy5jb250ZXh0LkZSQUdNRU5UX1NIQURFUjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2hhZGVyID0gdGhpcy5jb250ZXh0LmNyZWF0ZVNoYWRlcih0eXBlKTtcblx0XHRjb25zdCBzb3VyY2UgPSByZXF1aXJlKGxvY2F0aW9uKTtcblxuXHRcdHRoaXMuY29udGV4dC5zaGFkZXJTb3VyY2Uoc2hhZGVyLCBzb3VyY2UpO1xuXHRcdHRoaXMuY29udGV4dC5jb21waWxlU2hhZGVyKHNoYWRlcik7XG5cblx0XHRjb25zdCBzdWNjZXNzID0gdGhpcy5jb250ZXh0LmdldFNoYWRlclBhcmFtZXRlcihcblx0XHRcdHNoYWRlclxuXHRcdFx0LCB0aGlzLmNvbnRleHQuQ09NUElMRV9TVEFUVVNcblx0XHQpO1xuXG5cdFx0aWYoc3VjY2Vzcylcblx0XHR7XG5cdFx0XHRyZXR1cm4gc2hhZGVyO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5jb250ZXh0LmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSk7XG5cblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlU2hhZGVyKHNoYWRlcik7XG5cdH1cblxuXHRjcmVhdGVQcm9ncmFtKHt2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyLCB1bmlmb3JtcywgYXR0cmlidXRlc30pXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblxuXHRcdHJldHVybiBuZXcgUHJvZ3JhbSh7Z2wsIHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXIsIHVuaWZvcm1zLCBhdHRyaWJ1dGVzfSk7XG5cdH1cblxuXHRjcmVhdGVUZXh0dXJlKHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblx0XHRjb25zdCB0ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIHdpZHRoXG5cdFx0XHQsIGhlaWdodFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBudWxsXG5cdFx0KTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXG5cdFx0Ly8gZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUik7XG5cdFx0Ly8gZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLkxJTkVBUik7XG5cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG5cblx0XHRyZXR1cm4gdGV4dHVyZTtcblx0fVxuXG5cdGNyZWF0ZUZyYW1lYnVmZmVyKHRleHR1cmUpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblxuXHRcdGNvbnN0IGZyYW1lYnVmZmVyID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgZnJhbWVidWZmZXIpO1xuXHRcdGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKFxuXHRcdFx0Z2wuRlJBTUVCVUZGRVJcblx0XHRcdCwgZ2wuQ09MT1JfQVRUQUNITUVOVDBcblx0XHRcdCwgZ2wuVEVYVFVSRV8yRFxuXHRcdFx0LCB0ZXh0dXJlXG5cdFx0XHQsIDBcblx0XHQpO1xuXG5cdFx0cmV0dXJuIGZyYW1lYnVmZmVyO1xuXHR9XG5cblx0ZW5hYmxlQmxlbmRpbmcoKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmNvbnRleHQ7XG5cdFx0Z2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG5cdFx0Z2wuZW5hYmxlKGdsLkJMRU5EKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgVmlldyBhcyBCYXNlVmlldyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1ZpZXcnO1xuaW1wb3J0IHsgS2V5Ym9hcmQgfSBmcm9tICdjdXJ2YXR1cmUvaW5wdXQvS2V5Ym9hcmQnXG5pbXBvcnQgeyBCYWcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CYWcnO1xuXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tICdDb25maWcnO1xuXG5pbXBvcnQgeyBNYXAgYXMgV29ybGRNYXAgfSBmcm9tICcuLi93b3JsZC9NYXAnO1xuXG5pbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGVTaGVldCc7XG5pbXBvcnQgeyBTcHJpdGVCb2FyZCB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGVCb2FyZCc7XG5cbmltcG9ydCB7IENvbnRyb2xsZXIgYXMgT25TY3JlZW5Kb3lQYWQgfSBmcm9tICcuLi91aS9Db250cm9sbGVyJztcbmltcG9ydCB7IE1hcEVkaXRvciAgIH0gZnJvbSAnLi4vdWkvTWFwRWRpdG9yJztcblxuaW1wb3J0IHsgRW50aXR5IH0gZnJvbSAnLi4vbW9kZWwvRW50aXR5JztcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4uL3Nwcml0ZS9DYW1lcmEnO1xuXG5pbXBvcnQgeyBDb250cm9sbGVyIH0gZnJvbSAnLi4vbW9kZWwvQ29udHJvbGxlcic7XG5pbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlJztcblxuY29uc3QgQXBwbGljYXRpb24gPSB7fTtcblxuQXBwbGljYXRpb24ub25TY3JlZW5Kb3lQYWQgPSBuZXcgT25TY3JlZW5Kb3lQYWQ7XG5BcHBsaWNhdGlvbi5rZXlib2FyZCA9IEtleWJvYXJkLmdldCgpO1xuXG5cbmV4cG9ydCBjbGFzcyBWaWV3IGV4dGVuZHMgQmFzZVZpZXdcbntcblx0Y29uc3RydWN0b3IoYXJncylcblx0e1xuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyA9IHRydWU7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL3ZpZXcudG1wJyk7XG5cdFx0dGhpcy5yb3V0ZXMgICAgPSBbXTtcblxuXHRcdHRoaXMuZW50aXRpZXMgID0gbmV3IEJhZztcblx0XHR0aGlzLmtleWJvYXJkICA9IEFwcGxpY2F0aW9uLmtleWJvYXJkO1xuXHRcdHRoaXMuc3BlZWQgICAgID0gMjQ7XG5cdFx0dGhpcy5tYXhTcGVlZCAgPSB0aGlzLnNwZWVkO1xuXG5cdFx0dGhpcy5hcmdzLmNvbnRyb2xsZXIgPSBBcHBsaWNhdGlvbi5vblNjcmVlbkpveVBhZDtcblxuXHRcdHRoaXMuYXJncy5mcHMgID0gMDtcblx0XHR0aGlzLmFyZ3Muc3BzICA9IDA7XG5cblx0XHR0aGlzLmFyZ3MuY2FtWCA9IDA7XG5cdFx0dGhpcy5hcmdzLmNhbVkgPSAwO1xuXG5cdFx0dGhpcy5hcmdzLmZyYW1lTG9jayAgICAgID0gNjA7XG5cdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID0gNjA7XG5cblx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IGZhbHNlO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5saXN0ZW5pbmcgPSB0cnVlO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnZScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMubWFwLmV4cG9ydCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnRXNjYXBlJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID09PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5zcHJpdGVCb2FyZC51bnNlbGVjdCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnSG9tZScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2srKztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0VuZCcsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2stLTtcblxuXHRcdFx0XHRpZih0aGlzLmFyZ3MuZnJhbWVMb2NrIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2sgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdQYWdlVXAnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2srKztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ1BhZ2VEb3duJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrLS07XG5cblx0XHRcdFx0aWYodGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cdFx0dGhpcy5tYXAgPSBuZXcgV29ybGRNYXAoe1xuXHRcdFx0c3ByaXRlU2hlZXQ6IHRoaXMuc3ByaXRlU2hlZXRcblx0XHRcdCwgc3JjOiAnLi9tYXAuanNvbidcblx0XHR9KTtcblxuXHRcdHRoaXMubWFwLmltcG9ydCgpO1xuXG5cdFx0dGhpcy5hcmdzLm1hcEVkaXRvciAgPSBuZXcgTWFwRWRpdG9yKHtcblx0XHRcdHNwcml0ZVNoZWV0OiB0aGlzLnNwcml0ZVNoZWV0XG5cdFx0XHQsIG1hcDogdGhpcy5tYXBcblx0XHR9KTtcblx0fVxuXG5cdG9uUmVuZGVyZWQoKVxuXHR7XG5cdFx0Y29uc3Qgc3ByaXRlQm9hcmQgPSBuZXcgU3ByaXRlQm9hcmQoXG5cdFx0XHR0aGlzLnRhZ3MuY2FudmFzLmVsZW1lbnRcblx0XHRcdCwgdGhpcy5tYXBcblx0XHQpO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXG5cdFx0Y29uc3QgZW50aXR5ID0gbmV3IEVudGl0eSh7XG5cdFx0XHRzcHJpdGU6IG5ldyBTcHJpdGUoe1xuXHRcdFx0XHQvLyB4OiA4MTYsXG5cdFx0XHRcdC8vIHk6IC03Mixcblx0XHRcdFx0c3JjOiB1bmRlZmluZWQsXG5cdFx0XHRcdHNwcml0ZUJvYXJkOiBzcHJpdGVCb2FyZCxcblx0XHRcdFx0c3ByaXRlU2hlZXQ6IHRoaXMuc3ByaXRlU2hlZXQsXG5cdFx0XHRcdHdpZHRoOiAzMixcblx0XHRcdFx0aGVpZ2h0OiA0OCxcblx0XHRcdH0pLFxuXHRcdFx0Y29udHJvbGxlcjogbmV3IENvbnRyb2xsZXIoe1xuXHRcdFx0XHRrZXlib2FyZDogdGhpcy5rZXlib2FyZCxcblx0XHRcdFx0b25TY3JlZW5Kb3lQYWQ6IHRoaXMuYXJncy5jb250cm9sbGVyLFxuXHRcdFx0fSksXG5cdFx0XHRjYW1lcmE6IENhbWVyYSxcblx0XHR9KTtcblxuXHRcdHRoaXMuZW50aXRpZXMuYWRkKGVudGl0eSk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5zcHJpdGVzLmFkZChlbnRpdHkuc3ByaXRlKTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nID0gZW50aXR5O1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnPScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuem9vbSgxKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJysnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnpvb20oMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCctJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy56b29tKC0xKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuYXJncy5tYXBFZGl0b3IuYXJncy5iaW5kVG8oJ3NlbGVjdGVkR3JhcGhpYycsICh2KT0+e1xuXHRcdFx0aWYoIXYgfHwgdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxYID09IG51bGwpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblxuXHRcdFx0bGV0IGkgID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5zdGFydEdsb2JhbFg7XG5cdFx0XHRsZXQgaWkgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFg7XG5cblx0XHRcdGlmKGlpIDwgaSlcblx0XHRcdHtcblx0XHRcdFx0W2lpLCBpXSA9IFtpLCBpaV07XG5cdFx0XHR9XG5cblx0XHRcdGZvcig7IGk8PSBpaTsgaSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRsZXQgaiAgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLnN0YXJ0R2xvYmFsWTtcblx0XHRcdFx0bGV0IGpqID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxZO1xuXHRcdFx0XHRpZihqaiA8IGopXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRbamosIGpdID0gW2osIGpqXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IoOyBqIDw9IGpqOyBqKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLm1hcC5zZXRUaWxlKGksIGosIHYpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMubWFwLnNldFRpbGUoXG5cdFx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWFxuXHRcdFx0XHQsIHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWVxuXHRcdFx0XHQsIHZcblx0XHRcdCk7XG5cblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzaXplKCk7XG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnVuc2VsZWN0KCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmJpbmRUbygodixrLHQsZCxwKT0+e1xuXHRcdFx0aWYodGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFggPT0gbnVsbClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy5tYXBFZGl0b3Iuc2VsZWN0KHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQpO1xuXG5cdFx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IHRydWU7XG5cblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzaXplKCk7XG5cdFx0fSx7d2FpdDowfSk7XG5cblx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IHRydWU7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCkgPT4gdGhpcy5yZXNpemUoKSk7XG5cblx0XHRsZXQgZlRoZW4gPSAwO1xuXHRcdGxldCBzVGhlbiA9IDA7XG5cblx0XHRsZXQgZlNhbXBsZXMgPSBbXTtcblx0XHRsZXQgc1NhbXBsZXMgPSBbXTtcblxuXHRcdGxldCBtYXhTYW1wbGVzID0gNTtcblxuXHRcdGNvbnN0IHNpbXVsYXRlID0gKG5vdykgPT4ge1xuXHRcdFx0bm93ID0gbm93IC8gMTAwMDtcblxuXHRcdFx0Y29uc3QgZGVsdGEgPSBub3cgLSBzVGhlbjtcblxuXHRcdFx0aWYodGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID09IDApXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzID0gWzBdO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmKGRlbHRhIDwgMS8odGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrKygxMCAqICh0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2svNjApKSkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c1RoZW4gPSBub3c7XG5cblx0XHRcdHRoaXMua2V5Ym9hcmQudXBkYXRlKCk7XG5cblx0XHRcdE9iamVjdC52YWx1ZXModGhpcy5lbnRpdGllcy5pdGVtcygpKS5tYXAoKGUpPT57XG5cdFx0XHRcdGUuc2ltdWxhdGUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyB0aGlzLnNwcml0ZUJvYXJkLnNpbXVsYXRlKCk7XG5cblx0XHRcdC8vIHRoaXMuYXJncy5sb2NhbFggID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MubG9jYWxZICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQubG9jYWxZO1xuXHRcdFx0Ly8gdGhpcy5hcmdzLmdsb2JhbFggPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MuZ2xvYmFsWSA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWTtcblxuXHRcdFx0dGhpcy5hcmdzLl9zcHMgPSAoMSAvIGRlbHRhKTtcblxuXHRcdFx0c1NhbXBsZXMucHVzaCh0aGlzLmFyZ3MuX3Nwcyk7XG5cblx0XHRcdHdoaWxlKHNTYW1wbGVzLmxlbmd0aCA+IG1heFNhbXBsZXMpXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzLnNoaWZ0KCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHRoaXMuc3ByaXRlQm9hcmQubW92ZUNhbWVyYShzcHJpdGUueCwgc3ByaXRlLnkpO1xuXHRcdH07XG5cblx0XHRjb25zdCB1cGRhdGUgPSAobm93KSA9Pntcblx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhdygpO1xuXG5cdFx0XHRjb25zdCBkZWx0YSA9IG5vdyAtIGZUaGVuO1xuXHRcdFx0ZlRoZW4gPSBub3c7XG5cblx0XHRcdHRoaXMuYXJncy5mcHMgPSAoMTAwMCAvIGRlbHRhKS50b0ZpeGVkKDMpO1xuXG5cdFx0XHR0aGlzLmFyZ3MuY2FtWCA9IE51bWJlcihDYW1lcmEueCkudG9GaXhlZCgzKTtcblx0XHRcdHRoaXMuYXJncy5jYW1ZID0gTnVtYmVyKENhbWVyYS55KS50b0ZpeGVkKDMpO1xuXG5cdFx0XHRpZih0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZylcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnBvc1ggPSBOdW1iZXIodGhpcy5zcHJpdGVCb2FyZC5mb2xsb3dpbmcuc3ByaXRlLngpLnRvRml4ZWQoMyk7XG5cdFx0XHRcdHRoaXMuYXJncy5wb3NZID0gTnVtYmVyKHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nLnNwcml0ZS55KS50b0ZpeGVkKDMpO1xuXHRcdFx0fVxuXG5cdFx0fTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAvIDEwMjQgKiA0O1xuXHRcdHRoaXMucmVzaXplKCk7XG5cblx0XHR1cGRhdGUocGVyZm9ybWFuY2Uubm93KCkpO1xuXG5cdFx0c2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdHNpbXVsYXRlKHBlcmZvcm1hbmNlLm5vdygpKTtcblx0XHR9LCAwKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRkb2N1bWVudC50aXRsZSA9IGAke0NvbmZpZy50aXRsZX0gJHt0aGlzLmFyZ3MuZnBzfSBGUFNgO1xuXHRcdH0sIDIyNy8zKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRjb25zdCBzcHMgPSBzU2FtcGxlcy5yZWR1Y2UoKGEsYik9PmErYiwgMCkgLyBzU2FtcGxlcy5sZW5ndGg7XG5cdFx0XHR0aGlzLmFyZ3Muc3BzID0gc3BzLnRvRml4ZWQoMykucGFkU3RhcnQoNSwgJyAnKTtcblx0XHR9LCAyMzEvMik7XG5cdH1cblxuXHRyZXNpemUoeCwgeSlcblx0e1xuXHRcdHRoaXMuYXJncy53aWR0aCAgPSB0aGlzLnRhZ3MuY2FudmFzLmVsZW1lbnQud2lkdGggICA9IHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aDtcblx0XHR0aGlzLmFyZ3MuaGVpZ2h0ID0gdGhpcy50YWdzLmNhbnZhcy5lbGVtZW50LmhlaWdodCAgPSB5IHx8IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0O1xuXG5cdFx0dGhpcy5hcmdzLnJ3aWR0aCAgPSBNYXRoLnRydW5jKFxuXHRcdFx0KHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgIC8gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHR0aGlzLmFyZ3MucmhlaWdodCA9IE1hdGgudHJ1bmMoXG5cdFx0XHQoeSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCkgLyB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0KTtcblxuXHRcdGNvbnN0IG9sZFNjYWxlID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSA9IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0IC8gMTAyNDtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgKj0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlIC8gb2xkU2NhbGU7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHR9XG5cblx0c2Nyb2xsKGV2ZW50KVxuXHR7XG5cdFx0bGV0IGRlbHRhID0gZXZlbnQuZGVsdGFZID4gMCA/IC0xIDogKFxuXHRcdFx0ZXZlbnQuZGVsdGFZIDwgMCA/IDEgOiAwXG5cdFx0KTtcblxuXHRcdHRoaXMuem9vbShkZWx0YSk7XG5cdH1cblxuXHR6b29tKGRlbHRhKVxuXHR7XG5cdFx0Y29uc3QgbWF4ID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMzI7XG5cdFx0Y29uc3QgbWluID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMC4yO1xuXHRcdGNvbnN0IHN0ZXAgPSAwLjA1ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblxuXHRcdGxldCB6b29tTGV2ZWwgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICsgKGRlbHRhICogc3RlcCk7XG5cblx0XHRpZih6b29tTGV2ZWwgPCBtaW4pXG5cdFx0e1xuXHRcdFx0em9vbUxldmVsID0gbWluO1xuXHRcdH1cblx0XHRlbHNlIGlmKHpvb21MZXZlbCA+IG1heClcblx0XHR7XG5cdFx0XHR6b29tTGV2ZWwgPSBtYXg7XG5cdFx0fVxuXG5cdFx0Ly8gem9vbUxldmVsID0gTnVtYmVyKHpvb21MZXZlbC50b0ZpeGVkKDIpKTtcblxuXHRcdGlmKHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgIT09IHpvb21MZXZlbClcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsID0gem9vbUxldmVsO1xuXHRcdFx0dGhpcy5yZXNpemUoKTtcblx0XHR9XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8Y2FudmFzXFxuXFx0Y3YtcmVmID0gXFxcImNhbnZhczpjdXJ2YXR1cmUvYmFzZS9UYWdcXFwiXFxuXFx0Y3Ytb24gID0gXFxcIndoZWVsOnNjcm9sbChldmVudCk7XFxcIlxcbj48L2NhbnZhcz5cXG48ZGl2IGNsYXNzID0gXFxcImh1ZCBmcHNcXFwiPlxcbiBbW3Nwc11dIHNpbXVsYXRpb25zL3MgLyBbW3NpbXVsYXRpb25Mb2NrXV1cXG4gW1tmcHNdXSBmcmFtZXMvcyAgICAgIC8gW1tmcmFtZUxvY2tdXVxcblxcbiBSZXMgW1tyd2lkdGhdXSB4IFtbcmhlaWdodF1dXFxuICAgICBbW3dpZHRoXV0geCBbW2hlaWdodF1dXFxuXFxuIENhbSBbW2NhbVhdXSB4IFtbY2FtWV1dXFxuIFBvcyBbW3Bvc1hdXSB4IFtbcG9zWV1dXFxuXFxuIM60IFNpbTogICBQZyBVcCAvIERuXFxuIM60IEZyYW1lOiBIb21lIC8gRW5kXFxuIM60IFNjYWxlOiArIC8gLVxcblxcbjwvZGl2PlxcbjxkaXYgY2xhc3MgPSBcXFwicmV0aWNsZVxcXCI+PC9kaXY+XFxuXFxuW1tjb250cm9sbGVyXV1cXG5cXG48ZGl2IGN2LWlmID0gXFxcInNob3dFZGl0b3JcXFwiPlxcblxcdFtbbWFwRWRpdG9yXV1cXG5cXHQtLVxcblxcdFtbbW1tXV1cXG48L3NwYW4+XFxuXCIiLCJpbXBvcnQgeyBSb3V0ZXIgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9Sb3V0ZXInO1xuaW1wb3J0IHsgVmlldyAgIH0gZnJvbSAnaG9tZS9WaWV3JztcblxuaWYoUHJveHkgIT09IHVuZGVmaW5lZClcbntcblx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcblx0XHRjb25zdCB2aWV3ID0gbmV3IFZpZXcoKTtcblx0XHRcblx0XHRSb3V0ZXIubGlzdGVuKHZpZXcpO1xuXHRcdFxuXHRcdHZpZXcucmVuZGVyKGRvY3VtZW50LmJvZHkpO1xuXHR9KTtcbn1cbmVsc2Vcbntcblx0Ly8gZG9jdW1lbnQud3JpdGUocmVxdWlyZSgnLi9GYWxsYmFjay9mYWxsYmFjay50bXAnKSk7XG59XG4iLCJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnLi9JbmplY3RhYmxlJztcblxuZXhwb3J0IGNsYXNzIENvbnRhaW5lciBleHRlbmRzIEluamVjdGFibGVcbntcblx0aW5qZWN0KGluamVjdGlvbnMpXG5cdHtcblx0XHRyZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IoT2JqZWN0LmFzc2lnbih7fSwgdGhpcywgaW5qZWN0aW9ucykpO1xuXHR9XG59XG4iLCJsZXQgY2xhc3NlcyA9IHt9O1xubGV0IG9iamVjdHMgPSB7fTtcblxuZXhwb3J0IGNsYXNzIEluamVjdGFibGVcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0bGV0IGluamVjdGlvbnMgPSB0aGlzLmNvbnN0cnVjdG9yLmluamVjdGlvbnMoKTtcblx0XHRsZXQgY29udGV4dCAgICA9IHRoaXMuY29uc3RydWN0b3IuY29udGV4dCgpO1xuXG5cdFx0aWYoIWNsYXNzZXNbY29udGV4dF0pXG5cdFx0e1xuXHRcdFx0Y2xhc3Nlc1tjb250ZXh0XSA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKCFvYmplY3RzW2NvbnRleHRdKVxuXHRcdHtcblx0XHRcdG9iamVjdHNbY29udGV4dF0gPSB7fTtcblx0XHR9XG5cblx0XHRmb3IobGV0IG5hbWUgaW4gaW5qZWN0aW9ucylcblx0XHR7XG5cdFx0XHRsZXQgaW5qZWN0aW9uID0gaW5qZWN0aW9uc1tuYW1lXTtcblxuXHRcdFx0aWYoY2xhc3Nlc1tjb250ZXh0XVtuYW1lXSB8fCAhaW5qZWN0aW9uLnByb3RvdHlwZSlcblx0XHRcdHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmKC9bQS1aXS8udGVzdChTdHJpbmcobmFtZSlbMF0pKVxuXHRcdFx0e1xuXHRcdFx0XHRjbGFzc2VzW2NvbnRleHRdW25hbWVdID0gaW5qZWN0aW9uO1xuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0Zm9yKGxldCBuYW1lIGluIGluamVjdGlvbnMpXG5cdFx0e1xuXHRcdFx0bGV0IGluc3RhbmNlICA9IHVuZGVmaW5lZDtcblx0XHRcdGxldCBpbmplY3Rpb24gPSBjbGFzc2VzW2NvbnRleHRdW25hbWVdIHx8IGluamVjdGlvbnNbbmFtZV07XG5cblx0XHRcdGlmKC9bQS1aXS8udGVzdChTdHJpbmcobmFtZSlbMF0pKVxuXHRcdFx0e1xuXHRcdFx0XHRpZihpbmplY3Rpb24ucHJvdG90eXBlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYoIW9iamVjdHNbY29udGV4dF1bbmFtZV0pXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0b2JqZWN0c1tjb250ZXh0XVtuYW1lXSA9IG5ldyBpbmplY3Rpb247XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG9iamVjdHNbY29udGV4dF1bbmFtZV0gPSBpbmplY3Rpb247XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpbnN0YW5jZSA9IG9iamVjdHNbY29udGV4dF1bbmFtZV07XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGlmKGluamVjdGlvbi5wcm90b3R5cGUpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpbnN0YW5jZSA9IG5ldyBpbmplY3Rpb247XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aW5zdGFuY2UgPSBpbmplY3Rpb247XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIG5hbWUsIHtcblx0XHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRcdHdyaXRhYmxlOiAgIGZhbHNlLFxuXHRcdFx0XHR2YWx1ZTogICAgICBpbnN0YW5jZVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxuXHRzdGF0aWMgaW5qZWN0aW9ucygpXG5cdHtcblx0XHRyZXR1cm4ge307XG5cdH1cblxuXHRzdGF0aWMgY29udGV4dCgpXG5cdHtcblx0XHRyZXR1cm4gJy4nO1xuXHR9XG5cblx0c3RhdGljIGluamVjdChpbmplY3Rpb25zLCBjb250ZXh0ID0gJy4nKVxuXHR7XG5cdFx0aWYoISh0aGlzLnByb3RvdHlwZSBpbnN0YW5jZW9mIEluamVjdGFibGUgfHwgdGhpcyA9PT0gSW5qZWN0YWJsZSkpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgYWNjZXNzIGluamVjdGFibGUgc3ViY2xhc3MhXG5cbkFyZSB5b3UgdHJ5aW5nIHRvIGluc3RhbnRpYXRlIGxpa2UgdGhpcz9cblxuXHRuZXcgWC5pbmplY3Qoey4uLn0pO1xuXG5JZiBzbyBwbGVhc2UgdHJ5OlxuXG5cdG5ldyAoWC5pbmplY3Qoey4uLn0pKTtcblxuUGxlYXNlIG5vdGUgdGhlIHBhcmVudGhlc2lzLlxuYCk7XG5cdFx0fVxuXG5cdFx0bGV0IGV4aXN0aW5nSW5qZWN0aW9ucyA9IHRoaXMuaW5qZWN0aW9ucygpO1xuXG5cdFx0cmV0dXJuIGNsYXNzIGV4dGVuZHMgdGhpcyB7XG5cdFx0XHRzdGF0aWMgaW5qZWN0aW9ucygpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBleGlzdGluZ0luamVjdGlvbnMsIGluamVjdGlvbnMpO1xuXHRcdFx0fVxuXHRcdFx0c3RhdGljIGNvbnRleHQoKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gY29udGV4dDtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG59XG4iLCJjbGFzcyBTaW5nbGVcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0dGhpcy5uYW1lID0gJ3Nzcy4nICsgTWF0aC5yYW5kb20oKTtcblx0fVxufVxuXG5sZXQgc2luZ2xlID0gbmV3IFNpbmdsZTtcblxuZXhwb3J0IHtTaW5nbGUsIHNpbmdsZX07IiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5cbmV4cG9ydCAgY2xhc3MgQ29udHJvbGxlclxue1xuXHR0cmlnZ2VycyA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh7fSk7XG5cdGF4aXMgICAgID0gQmluZGFibGUubWFrZUJpbmRhYmxlKHt9KTtcblx0XG5cdGNvbnN0cnVjdG9yKHtrZXlib2FyZCwgb25TY3JlZW5Kb3lQYWR9KVxuXHR7XG5cdFx0a2V5Ym9hcmQua2V5cy5iaW5kVG8oKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5rZXlQcmVzcyhrLHYsdFtrXSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYodiA9PT0gLTEpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMua2V5UmVsZWFzZShrLHYsdFtrXSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdH0pO1xuXG5cdFx0b25TY3JlZW5Kb3lQYWQuYXJncy5iaW5kVG8oJ3gnLCAodikgPT4ge1xuXHRcdFx0dGhpcy5heGlzWzBdID0gdiAvIDUwO1xuXHRcdH0pO1xuXG5cdFx0b25TY3JlZW5Kb3lQYWQuYXJncy5iaW5kVG8oJ3knLCAodikgPT4ge1xuXHRcdFx0dGhpcy5heGlzWzFdID0gdiAvIDUwO1xuXHRcdH0pO1xuXHR9XG5cblx0a2V5UHJlc3Moa2V5LCB2YWx1ZSwgcHJldilcblx0e1xuXHRcdGlmKC9eWzAtOV0kLy50ZXN0KGtleSkpXG5cdFx0e1xuXHRcdFx0dGhpcy50cmlnZ2Vyc1trZXldID0gdHJ1ZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzd2l0Y2goa2V5KVxuXHRcdHtcblx0XHRcdGNhc2UgJ0Fycm93UmlnaHQnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAxO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dEb3duJzpcblx0XHRcdFx0dGhpcy5heGlzWzFdID0gMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93TGVmdCc6XG5cdFx0XHRcdHRoaXMuYXhpc1swXSA9IC0xO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dVcCc6XG5cdFx0XHRcdHRoaXMuYXhpc1sxXSA9IC0xO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblxuXHRrZXlSZWxlYXNlKGtleSwgdmFsdWUsIHByZXYpXG5cdHtcblx0XHRpZigvXlswLTldJC8udGVzdChrZXkpKVxuXHRcdHtcblx0XHRcdHRoaXMudHJpZ2dlcnNba2V5XSA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHN3aXRjaChrZXkpXG5cdFx0e1xuXHRcdFx0Y2FzZSAnQXJyb3dSaWdodCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1swXSA+IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuYXhpc1swXSA9IDA7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93TGVmdCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1swXSA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0Rvd24nOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMV0gPiAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzFdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd1VwJzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzFdIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG59XG4iLCJjb25zdCBmaXJlUmVnaW9uID0gWzEsIDAsIDBdO1xuY29uc3Qgd2F0ZXJSZWdpb24gPSBbMCwgMSwgMV07XG5cbmV4cG9ydCBjbGFzcyBFbnRpdHlcbntcblx0Y29uc3RydWN0b3Ioe3Nwcml0ZSwgY29udHJvbGxlciwgeCwgeX0pXG5cdHtcblx0XHR0aGlzLmRpcmVjdGlvbiA9ICdzb3V0aCc7XG5cdFx0dGhpcy5zdGF0ZSA9ICdzdGFuZGluZyc7XG5cblx0XHR0aGlzLnNwcml0ZSA9IHNwcml0ZTtcblx0XHR0aGlzLmNvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xuXG5cdFx0dGhpcy54ID0geDtcblx0XHR0aGlzLnkgPSB5O1xuXHR9XG5cblx0Y3JlYXRlKClcblx0e1xuXHR9XG5cblx0c2ltdWxhdGUoKVxuXHR7XG5cdFx0aWYoTWF0aC50cnVuYyhwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApICUgMTUgPT09IDApXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUucmVnaW9uID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZihNYXRoLnRydW5jKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkgJSAxNSA9PT0gNSlcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5yZWdpb24gPSB3YXRlclJlZ2lvbjtcblx0XHR9XG5cblx0XHRpZihNYXRoLnRydW5jKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkgJSAxNSA9PT0gMTApXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUucmVnaW9uID0gZmlyZVJlZ2lvbjtcblx0XHR9XG5cblx0XHRsZXQgc3BlZWQgPSA0O1xuXG5cdFx0bGV0IHhBeGlzID0gdGhpcy5jb250cm9sbGVyLmF4aXNbMF0gfHwgMDtcblx0XHRsZXQgeUF4aXMgPSB0aGlzLmNvbnRyb2xsZXIuYXhpc1sxXSB8fCAwO1xuXG5cdFx0Zm9yKGxldCB0IGluIHRoaXMuY29udHJvbGxlci50cmlnZ2Vycylcblx0XHR7XG5cdFx0XHRpZighdGhpcy5jb250cm9sbGVyLnRyaWdnZXJzW3RdKVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zcHJpdGUuc3ByaXRlQm9hcmQucmVuZGVyTW9kZSA9IHQ7XG5cblx0XHRcdGNvbnNvbGUubG9nKHQpO1xuXHRcdH1cblxuXHRcdHhBeGlzID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoeEF4aXMsIC0xKSk7XG5cdFx0eUF4aXMgPSBNYXRoLm1pbigxLCBNYXRoLm1heCh5QXhpcywgLTEpKTtcblxuXHRcdHRoaXMuc3ByaXRlLnggKz0geEF4aXMgPiAwXG5cdFx0XHQ/IE1hdGguY2VpbChzcGVlZCAqIHhBeGlzKVxuXHRcdFx0OiBNYXRoLmZsb29yKHNwZWVkICogeEF4aXMpO1xuXG5cdFx0dGhpcy5zcHJpdGUueSArPSB5QXhpcyA+IDBcblx0XHRcdD8gTWF0aC5jZWlsKHNwZWVkICogeUF4aXMpXG5cdFx0XHQ6IE1hdGguZmxvb3Ioc3BlZWQgKiB5QXhpcyk7XG5cblx0XHRsZXQgaG9yaXpvbnRhbCA9IGZhbHNlO1xuXG5cdFx0aWYoTWF0aC5hYnMoeEF4aXMpID4gTWF0aC5hYnMoeUF4aXMpKVxuXHRcdHtcblx0XHRcdGhvcml6b250YWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmKGhvcml6b250YWwpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnd2VzdCc7XG5cblx0XHRcdGlmKHhBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnZWFzdCc7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc3RhdGUgPSAnd2Fsa2luZyc7XG5cblx0XHR9XG5cdFx0ZWxzZSBpZih5QXhpcylcblx0XHR7XG5cdFx0XHR0aGlzLmRpcmVjdGlvbiA9ICdub3J0aCc7XG5cblx0XHRcdGlmKHlBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXRlID0gJ3dhbGtpbmcnO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5zdGF0ZSA9ICdzdGFuZGluZyc7XG5cdFx0fVxuXG5cdFx0Ly8gaWYoIXhBeGlzICYmICF5QXhpcylcblx0XHQvLyB7XG5cdFx0Ly8gXHR0aGlzLmRpcmVjdGlvbiA9ICdzb3V0aCc7XG5cdFx0Ly8gfVxuXG5cdFx0bGV0IGZyYW1lcztcblxuXHRcdGlmKGZyYW1lcyA9IHRoaXMuc3ByaXRlW3RoaXMuc3RhdGVdW3RoaXMuZGlyZWN0aW9uXSlcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5zZXRGcmFtZXMoZnJhbWVzKTtcblx0XHR9XG5cdH1cblxuXHRkZXN0cm95KClcblx0e1xuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudW5pZm9ybSB2ZWM0IHVfY29sb3I7XFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKCkge1xcbiAgLy8gZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHZfdGV4Q29vcmQpO1xcbiAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgxLjAsIDEuMCwgMC4wLCAwLjI1KTtcXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKClcXG57XFxuICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247XFxuICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDtcXG4gIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTtcXG4gIHZfdGV4Q29vcmQgID0gYV90ZXhDb29yZDtcXG59XFxuXCIiLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi9TcHJpdGVTaGVldCc7XG5cbmV4cG9ydCAgY2xhc3MgQmFja2dyb3VuZFxue1xuXHRjb25zdHJ1Y3RvcihzcHJpdGVCb2FyZCwgbWFwKVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cdFx0dGhpcy5tYXAgPSBtYXA7XG5cblx0XHR0aGlzLndpZHRoICA9IDMyO1xuXHRcdHRoaXMuaGVpZ2h0ID0gMzI7XG5cblx0XHR0aGlzLnhPZmZzZXQgPSAwO1xuXHRcdHRoaXMueU9mZnNldCA9IDA7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0dGhpcy50aWxlTWFwcGluZyA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jcmVhdGVUZXh0dXJlKDEsIDEpO1xuXHRcdHRoaXMudGlsZVRleHR1cmUgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY3JlYXRlVGV4dHVyZSgxLCAxKTtcblxuXHRcdGNvbnN0IHIgPSAoKSA9PiBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMjU1KTtcblx0XHRjb25zdCBwaXhlbCA9IG5ldyBVaW50OEFycmF5KFtyKCksIHIoKSwgcigpLCAyNTVdKTtcblxuXHRcdG1hcC5yZWFkeS50aGVuKCgpID0+IHtcblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGlsZVRleHR1cmUpO1xuXHRcdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgbWFwLnRpbGVTZXRXaWR0aFxuXHRcdFx0XHQsIG1hcC50aWxlU2V0SGVpZ2h0XG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHRcdCwgbWFwLnBpeGVsc1xuXHRcdFx0KTtcblx0XHR9KTtcblx0fVxuXG5cdG5lZ1NhZmVNb2QoYSxiKVxuXHR7XG5cdFx0aWYoYSA+PSAwKSByZXR1cm4gYSAlIGI7XG5cdFx0cmV0dXJuIChiICsgYSAlIGIpICUgYjtcblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3QnVmZmVyKTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfYmFja2dyb3VuZCcsIDEpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3Vfc2l6ZScsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3RpbGVTaXplJywgMzIsIDMyKTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X21hcFRleHR1cmVTaXplJywgdGhpcy5tYXAudGlsZVNldFdpZHRoLCB0aGlzLm1hcC50aWxlU2V0SGVpZ2h0KTtcblxuXHRcdGNvbnN0IHhPZmZzZXQgPSBNYXRoLmZsb29yKE1hdGguZmxvb3IoKDAuNSAqIHRoaXMud2lkdGgpICAvIDY0KSArIDApICogNjQ7XG5cdFx0Y29uc3QgeU9mZnNldCA9IE1hdGguZmxvb3IoTWF0aC5mbG9vcigoMC41ICogdGhpcy5oZWlnaHQpIC8gNjQpICsgMCkgKiA2NDtcblxuXHRcdGNvbnN0IHpvb20gPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0Y29uc3QgeCA9IHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nLnNwcml0ZS54O1xuXHRcdGNvbnN0IHkgPSB0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZy5zcHJpdGUueTtcblxuXHRcdGNvbnN0IHhQb3MgPSAoIHRoaXMud2lkdGggKiB6b29tICogMC41IClcblx0XHRcdCsgLXRoaXMubmVnU2FmZU1vZCggeCArIDE2LCA2NCApICogem9vbVxuXHRcdFx0KyAteE9mZnNldCAqIHpvb21cblx0XHRcdCsgdGhpcy54T2Zmc2V0ICogem9vbSAqIDAuNTtcblxuXHRcdGNvbnN0IHlQb3MgPSAoIHRoaXMuaGVpZ2h0ICogem9vbSAqIDAuNSApXG5cdFx0XHQrIC10aGlzLm5lZ1NhZmVNb2QoIHkgKyAxNiwgNjQgKSAqIHpvb21cblx0XHRcdCsgLXlPZmZzZXQgKiB6b29tXG5cdFx0XHQrIHRoaXMueU9mZnNldCAqIHpvb20gKiAwLjU7XG5cblx0XHRjb25zdCB0aWxlc1dpZGUgPSBNYXRoLmZsb29yKHRoaXMud2lkdGggLyAzMik7XG5cdFx0Y29uc3QgdGlsZXNIaWdoID0gTWF0aC5mbG9vcih0aGlzLmhlaWdodCAvIDMyKTtcblx0XHRjb25zdCB0aWxlQ291bnQgPSB0aWxlc1dpZGUgKiB0aWxlc0hpZ2g7XG5cblx0XHRjb25zdCB0aWxlVmFsdWVzID0gbmV3IFVpbnQzMkFycmF5KHRpbGVDb3VudCk7XG5cdFx0Y29uc3QgdGlsZVBpeGVscyA9IG5ldyBVaW50OEFycmF5KHRpbGVWYWx1ZXMuYnVmZmVyKTtcblxuXHRcdGZvcihjb25zdCBrIGluIHRpbGVWYWx1ZXMpXG5cdFx0e1xuXHRcdFx0Y29uc3Qga1ggPSAoayAlIHRpbGVzV2lkZSkgKiAzMlxuXHRcdFx0XHQrIC10aGlzLm5lZ1NhZmVNb2QoIHggKyAxNiwgNjQgKSArIHggKyAtMTYgKyAtdGhpcy53aWR0aCAvIDI7XG5cblx0XHRcdGNvbnN0IGtZID0gKC0xICsgdGlsZXNIaWdoIC0gTWF0aC5mbG9vcihrIC8gdGlsZXNXaWRlKSkgKiAzMlxuXHRcdFx0XHQrIC10aGlzLm5lZ1NhZmVNb2QoIHkgKyAxNiwgNjQgKSArIHkgKyAtMTYgKyAtdGhpcy5oZWlnaHQgLyAyO1xuXG5cblx0XHRcdGlmKGtYIDwgMCB8fCBrWSA8IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRpbGVWYWx1ZXNba10gPSAyO1xuXHRcdFx0XHQvLyB0aWxlVmFsdWVzW2tdID0gKE1hdGguZmxvb3Ioay80KSAlIDIgJiYgTWF0aC5yYW5kb20oKSA+IDAuNSApID8gMiA6IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRpbGVWYWx1ZXNba10gPSAxO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfdGlsZUNvdW50JywgdGlsZUNvdW50KTtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTIpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGlsZU1hcHBpbmcpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfdGlsZU1hcHBpbmcnLCAyKTtcblxuXHRcdC8vIFB1dCB0aGUgZWZmZWN0TGF5ZXIgaW4gdGV4MVxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTMpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGlsZVRleHR1cmUpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfdGlsZXMnLCAzKTtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50aWxlTWFwcGluZyk7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIHRpbGVzV2lkZVxuXHRcdFx0LCB0aWxlc0hpZ2hcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgdGlsZVBpeGVsc1xuXHRcdCk7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfdGV4Q29vcmQpO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdDAuMCwgMC4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQxLjAsIDEuMCxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHR4UG9zXG5cdFx0XHQsIHlQb3Ncblx0XHRcdCwgdGhpcy53aWR0aCAqIHpvb21cblx0XHRcdCwgdGhpcy5oZWlnaHQgKiB6b29tXG5cdFx0KTtcblxuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfYmFja2dyb3VuZCcsIDApO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHR9XG5cblx0cmVzaXplKHgsIHkpXG5cdHtcblx0XHR0aGlzLndpZHRoID0gIHggKyAwO1xuXHRcdHRoaXMuaGVpZ2h0ID0geSArIDA7XG5cblx0XHR0aGlzLndpZHRoID0gIE1hdGguY2VpbCh4IC8gMTI4KSAqIDEyOCArIDEyODtcblx0XHR0aGlzLmhlaWdodCA9IE1hdGguY2VpbCh5IC8gMTI4KSAqIDEyOCArIDEyODtcblxuXHRcdHRoaXMueE9mZnNldCA9IHggLSB0aGlzLndpZHRoO1xuXHRcdHRoaXMueU9mZnNldCA9IHkgLSB0aGlzLmhlaWdodDtcblx0fVxuXG5cdHNpbXVsYXRlKClcblx0e31cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfcG9zaXRpb24pO1xuXG5cdFx0Y29uc3QgeDEgPSB4O1xuXHRcdGNvbnN0IHgyID0geCArIHdpZHRoO1xuXHRcdGNvbnN0IHkxID0geTtcblx0XHRjb25zdCB5MiA9IHkgKyBoZWlnaHQ7XG5cblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIENhbWVyYVxue1xuXHRzdGF0aWMgeCA9IDA7XG5cdHN0YXRpYyB5ID0gMDtcblx0c3RhdGljIHdpZHRoICA9IDA7XG5cdHN0YXRpYyBoZWlnaHQgPSAwO1xufVxuIiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tIFwiY3VydmF0dXJlL2Jhc2UvQmluZGFibGVcIjtcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gXCIuL0NhbWVyYVwiO1xuXG5leHBvcnQgY2xhc3MgU3ByaXRlXG57XG5cdGNvbnN0cnVjdG9yKHtzcmMsIHNwcml0ZUJvYXJkLCBzcHJpdGVTaGVldCwgd2lkdGgsIGhlaWdodCwgeCwgeSwgen0pXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblxuXHRcdHRoaXMueCA9IHggfHwgMDtcblx0XHR0aGlzLnkgPSB5IHx8IDA7XG5cdFx0dGhpcy56ID0geiB8fCAwO1xuXG5cdFx0dGhpcy53aWR0aCAgPSAzMiB8fCB3aWR0aDtcblx0XHR0aGlzLmhlaWdodCA9IDMyIHx8IGhlaWdodDtcblx0XHR0aGlzLnNjYWxlICA9IDE7XG5cblx0XHR0aGlzLmZyYW1lcyA9IFtdO1xuXHRcdHRoaXMuZnJhbWVEZWxheSA9IDQ7XG5cdFx0dGhpcy5jdXJyZW50RGVsYXkgPSB0aGlzLmZyYW1lRGVsYXk7XG5cdFx0dGhpcy5jdXJyZW50RnJhbWUgPSAwO1xuXHRcdHRoaXMuY3VycmVudEZyYW1lcyA9ICcnO1xuXG5cdFx0dGhpcy5zcGVlZCAgICA9IDA7XG5cdFx0dGhpcy5tYXhTcGVlZCA9IDg7XG5cblx0XHR0aGlzLm1vdmluZyA9IGZhbHNlO1xuXG5cdFx0dGhpcy5SSUdIVFx0PSAwO1xuXHRcdHRoaXMuRE9XTlx0PSAxO1xuXHRcdHRoaXMuTEVGVFx0PSAyO1xuXHRcdHRoaXMuVVBcdFx0PSAzO1xuXG5cdFx0dGhpcy5FQVNUXHQ9IHRoaXMuUklHSFQ7XG5cdFx0dGhpcy5TT1VUSFx0PSB0aGlzLkRPV047XG5cdFx0dGhpcy5XRVNUXHQ9IHRoaXMuTEVGVDtcblx0XHR0aGlzLk5PUlRIXHQ9IHRoaXMuVVA7XG5cblx0XHR0aGlzLnJlZ2lvbiA9IFswLCAwLCAwLCAxXTtcblxuXHRcdHRoaXMuc3RhbmRpbmcgPSB7XG5cdFx0XHQnbm9ydGgnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfc3RhbmRpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnc291dGgnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfc3RhbmRpbmdfc291dGgucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnd2VzdCc6IFtcblx0XHRcdFx0J3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ2Vhc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRdXG5cdFx0fTtcblxuXHRcdHRoaXMud2Fsa2luZyA9IHtcblx0XHRcdCdub3J0aCc6IFtcblx0XHRcdFx0J3BsYXllcl93YWxraW5nX25vcnRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19ub3J0aDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19ub3J0aDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnc291dGgnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ19zb3V0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3NvdXRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3NvdXRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfc291dGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfc291dGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3NvdXRoLnBuZydcblxuXHRcdFx0XVxuXHRcdFx0LCAnd2VzdCc6IFtcblx0XHRcdFx0J3BsYXllcl93YWxraW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3dlc3QyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfd2VzdDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ2Vhc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19lYXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX2Vhc3QyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRdXG5cdFx0fTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQgPSBzcHJpdGVCb2FyZDtcblxuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHR0aGlzLnRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnRleHR1cmUpO1xuXG5cdFx0Y29uc3QgciA9ICgpID0+IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAyNTUpO1xuXHRcdGNvbnN0IHBpeGVsID0gbmV3IFVpbnQ4QXJyYXkoW3IoKSwgcigpLCByKCksIDI1NV0pO1xuXG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIDFcblx0XHRcdCwgMVxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBwaXhlbFxuXHRcdCk7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0ID0gc3ByaXRlU2hlZXQ7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oKHNoZWV0KT0+e1xuXHRcdFx0Y29uc3QgZnJhbWUgPSB0aGlzLnNwcml0ZVNoZWV0LmdldEZyYW1lKHNyYyk7XG5cblx0XHRcdGlmKGZyYW1lKVxuXHRcdFx0e1xuXHRcdFx0XHRTcHJpdGUubG9hZFRleHR1cmUodGhpcy5zcHJpdGVCb2FyZC5nbDJkLCBmcmFtZSkudGhlbihhcmdzID0+IHtcblx0XHRcdFx0XHR0aGlzLnRleHR1cmUgPSBhcmdzLnRleHR1cmU7XG5cdFx0XHRcdFx0dGhpcy53aWR0aCA9IGFyZ3MuaW1hZ2Uud2lkdGggKiB0aGlzLnNjYWxlO1xuXHRcdFx0XHRcdHRoaXMuaGVpZ2h0ID0gYXJncy5pbWFnZS5oZWlnaHQgKiB0aGlzLnNjYWxlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0dGhpcy5mcmFtZURlbGF5ID0gdGhpcy5tYXhTcGVlZCAtIE1hdGguYWJzKHRoaXMuc3BlZWQpO1xuXHRcdGlmKHRoaXMuZnJhbWVEZWxheSA+IHRoaXMubWF4U3BlZWQpXG5cdFx0e1xuXHRcdFx0dGhpcy5mcmFtZURlbGF5ID0gdGhpcy5tYXhTcGVlZDtcblx0XHR9XG5cblx0XHRpZih0aGlzLmN1cnJlbnREZWxheSA8PSAwKVxuXHRcdHtcblx0XHRcdHRoaXMuY3VycmVudERlbGF5ID0gdGhpcy5mcmFtZURlbGF5O1xuXHRcdFx0dGhpcy5jdXJyZW50RnJhbWUrKztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHRoaXMuY3VycmVudERlbGF5LS07XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5jdXJyZW50RnJhbWUgPj0gdGhpcy5mcmFtZXMubGVuZ3RoKVxuXHRcdHtcblx0XHRcdHRoaXMuY3VycmVudEZyYW1lID0gdGhpcy5jdXJyZW50RnJhbWUgLSB0aGlzLmZyYW1lcy5sZW5ndGg7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZnJhbWUgPSB0aGlzLmZyYW1lc1sgdGhpcy5jdXJyZW50RnJhbWUgXTtcblxuXHRcdGlmKGZyYW1lKVxuXHRcdHtcblx0XHRcdHRoaXMudGV4dHVyZSA9IGZyYW1lLnRleHR1cmU7XG5cdFx0XHR0aGlzLndpZHRoICA9IGZyYW1lLndpZHRoICogdGhpcy5zY2FsZTtcblx0XHRcdHRoaXMuaGVpZ2h0ID0gZnJhbWUuaGVpZ2h0ICogdGhpcy5zY2FsZTtcblx0XHR9XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50ZXh0dXJlKTtcblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfdGV4Q29vcmQpO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdDAuMCwgMC4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQxLjAsIDEuMCxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9yZWdpb24nLCAwLCAwLCAwLCAwKTtcblxuXHRcdGNvbnN0IHpvb20gPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHR0aGlzLnggKiB6b29tICsgLUNhbWVyYS54ICsgKENhbWVyYS53aWR0aCAqIHpvb20gLyAyKVxuXHRcdFx0LCB0aGlzLnkgKiB6b29tICsgLUNhbWVyYS55ICsgKENhbWVyYS5oZWlnaHQgKiB6b29tIC8gMikgKyAtdGhpcy5oZWlnaHQgKiB6b29tXG5cdFx0XHQsIHRoaXMud2lkdGggKiB6b29tXG5cdFx0XHQsIHRoaXMuaGVpZ2h0ICogem9vbVxuXHRcdCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd0J1ZmZlcik7XG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXG5cdFx0Z2wudW5pZm9ybTRmKHRoaXMuc3ByaXRlQm9hcmQucmVnaW9uTG9jYXRpb24sIC4uLk9iamVjdC5hc3NpZ24odGhpcy5yZWdpb24gfHwgWzAsIDAsIDBdLCB7MzogMX0pKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5lZmZlY3RCdWZmZXIpO1xuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblxuXHRcdGdsLnVuaWZvcm00Zihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVnaW9uTG9jYXRpb25cblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cdH1cblxuXHRzZXRGcmFtZXMoZnJhbWVTZWxlY3Rvcilcblx0e1xuXHRcdGxldCBmcmFtZXNJZCA9IGZyYW1lU2VsZWN0b3Iuam9pbignICcpO1xuXG5cdFx0aWYodGhpcy5jdXJyZW50RnJhbWVzID09PSBmcmFtZXNJZClcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5jdXJyZW50RnJhbWVzID0gZnJhbWVzSWQ7XG5cblx0XHRjb25zdCBsb2FkVGV4dHVyZSA9IGZyYW1lID0+IFNwcml0ZS5sb2FkVGV4dHVyZSh0aGlzLnNwcml0ZUJvYXJkLmdsMmQsIGZyYW1lKTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQucmVhZHkudGhlbihzaGVldCA9PiB7XG5cdFx0XHRjb25zdCBmcmFtZXMgPSBzaGVldC5nZXRGcmFtZXMoZnJhbWVTZWxlY3RvcikubWFwKFxuXHRcdFx0XHRmcmFtZSA9PiBsb2FkVGV4dHVyZShmcmFtZSkudGhlbihhcmdzID0+ICh7XG5cdFx0XHRcdFx0dGV4dHVyZTogIGFyZ3MudGV4dHVyZVxuXHRcdFx0XHRcdCwgd2lkdGg6ICBhcmdzLmltYWdlLndpZHRoXG5cdFx0XHRcdFx0LCBoZWlnaHQ6IGFyZ3MuaW1hZ2UuaGVpZ2h0XG5cdFx0XHRcdH0pKVxuXHRcdFx0KTtcblxuXHRcdFx0UHJvbWlzZS5hbGwoZnJhbWVzKS50aGVuKGZyYW1lcyA9PiB0aGlzLmZyYW1lcyA9IGZyYW1lcyk7XG5cblx0XHR9KTtcblx0fVxuXG5cdHN0YXRpYyBsb2FkVGV4dHVyZShnbDJkLCBpbWFnZVNyYylcblx0e1xuXHRcdGNvbnN0IGdsID0gZ2wyZC5jb250ZXh0O1xuXG5cdFx0aWYoIXRoaXMucHJvbWlzZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5wcm9taXNlcyA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMucHJvbWlzZXNbaW1hZ2VTcmNdKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb21pc2VzW2ltYWdlU3JjXTtcblx0XHR9XG5cblx0XHR0aGlzLnByb21pc2VzW2ltYWdlU3JjXSA9IFNwcml0ZS5sb2FkSW1hZ2UoaW1hZ2VTcmMpLnRoZW4oKGltYWdlKT0+e1xuXHRcdFx0Y29uc3QgdGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblxuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cblx0XHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHRcdCwgaW1hZ2Vcblx0XHRcdCk7XG5cblx0XHRcdHJldHVybiB7aW1hZ2UsIHRleHR1cmV9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcy5wcm9taXNlc1tpbWFnZVNyY107XG5cdH1cblxuXHRzdGF0aWMgbG9hZEltYWdlKHNyYylcblx0e1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpPT57XG5cdFx0XHRjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0aW1hZ2Uuc3JjICAgPSBzcmM7XG5cdFx0XHRpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKGV2ZW50KT0+e1xuXHRcdFx0XHRhY2NlcHQoaW1hZ2UpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodCwgdHJhbnNmb3JtID0gW10pXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXHRcdGNvbnN0IHpvb20gPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0uYnVmZmVycy5hX3Bvc2l0aW9uKTtcblxuXHRcdGNvbnN0IHgxID0geDtcblx0XHRjb25zdCB5MSA9IHkgKyAzMiAqIHpvb207XG5cdFx0Y29uc3QgeDIgPSB4ICsgd2lkdGg7XG5cdFx0Y29uc3QgeTIgPSB5ICsgaGVpZ2h0ICsgMzIgKiB6b29tO1xuXG5cdFx0Y29uc3QgcG9pbnRzID0gbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XSk7XG5cblx0XHRjb25zdCB4T2ZmID0geCArIHdpZHRoIC8gMjtcblx0XHRjb25zdCB5T2ZmID0geSArIGhlaWdodCAvIDI7XG5cdFx0Y29uc3QgdGhldGEgPSBwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDAgJSAoMiAqIE1hdGguUEkpO1xuXG5cdFx0Y29uc3QgdCA9IHRoaXMubWF0cml4VHJhbnNmb3JtKHBvaW50cywgdGhpcy5tYXRyaXhDb21wb3NpdGUoXG5cdFx0XHR0aGlzLm1hdHJpeFRyYW5zbGF0ZSh4T2ZmLCB5T2ZmKVxuXHRcdFx0Ly8gLCB0aGlzLm1hdHJpeFNjYWxlKE1hdGguc2luKHRoZXRhKSwgTWF0aC5jb3ModGhldGEpKVxuXHRcdFx0Ly8gLCB0aGlzLm1hdHJpeFJvdGF0ZSh0aGV0YSlcblx0XHRcdCwgdGhpcy5tYXRyaXhUcmFuc2xhdGUoLXhPZmYsIC15T2ZmKVxuXHRcdCkpXG5cblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgdCwgZ2wuU1RSRUFNX0RSQVcpO1xuXHR9XG5cblx0bWF0cml4SWRlbnRpdHkoKVxuXHR7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFsxLCAwLCAwXSxcblx0XHRcdFswLCAxLCAwXSxcblx0XHRcdFswLCAwLCAxXSxcblx0XHRdO1xuXHR9XG5cblx0bWF0cml4VHJhbnNsYXRlKGR4LCBkeSlcblx0e1xuXHRcdHJldHVybiBbXG5cdFx0XHRbMSwgMCwgZHhdLFxuXHRcdFx0WzAsIDEsIGR5XSxcblx0XHRcdFswLCAwLCAgMV0sXG5cdFx0XTtcblx0fVxuXG5cdG1hdHJpeFNjYWxlKGR4LCBkeSlcblx0e1xuXHRcdHJldHVybiBbXG5cdFx0XHRbZHgsIDAsIDBdLFxuXHRcdFx0WzAsIGR5LCAwXSxcblx0XHRcdFswLCAwLCAgMV0sXG5cdFx0XTtcblx0fVxuXG5cdG1hdHJpeFJvdGF0ZSh0aGV0YSlcblx0e1xuXHRcdGNvbnN0IHMgPSBNYXRoLnNpbih0aGV0YSk7XG5cdFx0Y29uc3QgYyA9IE1hdGguY29zKHRoZXRhKTtcblxuXHRcdHJldHVybiBbXG5cdFx0XHRbYywgLXMsIDBdLFxuXHRcdFx0W3MsICBjLCAwXSxcblx0XHRcdFswLCAgMCwgMV0sXG5cdFx0XTtcblx0fVxuXG5cdG1hdHJpeFNoZWFyWChzKVxuXHR7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFsxLCBzLCAwXSxcblx0XHRcdFswLCAxLCAwXSxcblx0XHRcdFswLCAwLCAxXSxcblx0XHRdO1xuXHR9XG5cblx0bWF0cml4U2hlYXJZKHMpXG5cdHtcblx0XHRyZXR1cm4gW1xuXHRcdFx0WzEsIDAsIDBdLFxuXHRcdFx0W3MsIDEsIDBdLFxuXHRcdFx0WzAsIDAsIDFdLFxuXHRcdF07XG5cdH1cblxuXHRtYXRyaXhNdWx0aXBseShtYXRBLCBtYXRCKVxuXHR7XG5cdFx0aWYobWF0QS5sZW5ndGggIT09IG1hdEIubGVuZ3RoKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBtYXRyaWNlcycpO1xuXHRcdH1cblxuXHRcdGlmKG1hdEFbMF0ubGVuZ3RoICE9PSBtYXRCLmxlbmd0aClcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0luY29tcGF0aWJsZSBtYXRyaWNlcycpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG91dHB1dCA9IEFycmF5KG1hdEEubGVuZ3RoKS5maWxsKCkubWFwKCgpID0+IEFycmF5KG1hdEJbMF0ubGVuZ3RoKS5maWxsKDApKTtcblxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCBtYXRBLmxlbmd0aDsgaSsrKVxuXHRcdHtcblx0XHRcdGZvcihsZXQgaiA9IDA7IGogPCBtYXRCWzBdLmxlbmd0aDsgaisrKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IobGV0IGsgPSAwOyBrIDwgbWF0QVswXS5sZW5ndGg7IGsrKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG91dHB1dFtpXVtqXSArPSBtYXRBW2ldW2tdICogbWF0QltrXVtqXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRtYXRyaXhDb21wb3NpdGUoLi4ubWF0cylcblx0e1xuXHRcdGxldCBvdXRwdXQgPSB0aGlzLm1hdHJpeElkZW50aXR5KCk7XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgbWF0cy5sZW5ndGg7IGkrKylcblx0XHR7XG5cdFx0XHRvdXRwdXQgPSB0aGlzLm1hdHJpeE11bHRpcGx5KG91dHB1dCwgbWF0c1tpXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdG1hdHJpeFRyYW5zZm9ybShwb2ludHMsIG1hdHJpeClcblx0e1xuXHRcdGNvbnN0IG91dHB1dCA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkgKz0gMilcblx0XHR7XG5cdFx0XHRjb25zdCBwb2ludCA9IFtwb2ludHNbaV0sIHBvaW50c1tpICsgMV0sIDFdO1xuXG5cdFx0XHRmb3IoY29uc3Qgcm93IG9mIG1hdHJpeClcblx0XHRcdHtcblx0XHRcdFx0b3V0cHV0LnB1c2goXG5cdFx0XHRcdFx0cG9pbnRbMF0gKiByb3dbMF1cblx0XHRcdFx0XHQrIHBvaW50WzFdICogcm93WzFdXG5cdFx0XHRcdFx0KyBwb2ludFsyXSAqIHJvd1syXVxuXHRcdFx0XHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkob3V0cHV0LmZpbHRlcigoXywgaykgPT4gKDEgKyBrKSAlIDMpKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmFnIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmFnJztcbmltcG9ydCB7IEJhY2tncm91bmQgIH0gZnJvbSAnLi9CYWNrZ3JvdW5kJztcblxuaW1wb3J0IHsgR2wyZCB9IGZyb20gJy4uL2dsMmQvR2wyZCc7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tICcuL0NhbWVyYSc7XG5pbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuL1Nwcml0ZSc7XG5pbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi9TcHJpdGVTaGVldCc7XG5cbmV4cG9ydCBjbGFzcyBTcHJpdGVCb2FyZFxue1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50LCBtYXApXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblxuXHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdHRoaXMuc3ByaXRlcyA9IG5ldyBCYWc7XG5cblx0XHR0aGlzLm1vdXNlID0ge1xuXHRcdFx0eDogbnVsbFxuXHRcdFx0LCB5OiBudWxsXG5cdFx0XHQsIGNsaWNrWDogbnVsbFxuXHRcdFx0LCBjbGlja1k6IG51bGxcblx0XHR9O1xuXG5cdFx0Q2FtZXJhLndpZHRoICA9IGVsZW1lbnQud2lkdGg7XG5cdFx0Q2FtZXJhLmhlaWdodCA9IGVsZW1lbnQuaGVpZ2h0O1xuXG5cdFx0dGhpcy5nbDJkID0gbmV3IEdsMmQoZWxlbWVudCk7XG5cblx0XHR0aGlzLmdsMmQuZW5hYmxlQmxlbmRpbmcoKTtcblxuXHRcdGNvbnN0IGF0dHJpYnV0ZXMgPSBbJ2FfcG9zaXRpb24nLCAnYV90ZXhDb29yZCddO1xuXHRcdGNvbnN0IHVuaWZvcm1zID0gW1xuXHRcdFx0J3VfaW1hZ2UnXG5cdFx0XHQsICd1X2VmZmVjdCdcblx0XHRcdCwgJ3VfdGlsZXMnXG5cdFx0XHQsICd1X3RpbGVNYXBwaW5nJ1xuXHRcdFx0LCAndV9yZXNvbHV0aW9uJ1xuXHRcdFx0LCAndV9yaXBwbGUnXG5cdFx0XHQsICd1X3NpemUnXG5cdFx0XHQsICd1X3RpbGVTaXplJ1xuXHRcdFx0LCAndV90aWxlQ291bnQnXG5cdFx0XHQsICd1X3JlZ2lvbidcblx0XHRcdCwgJ3VfYmFja2dyb3VuZCdcblx0XHRcdCwgJ3VfbWFwVGV4dHVyZVNpemUnXG5cdFx0XHQsICd1X3JlbmRlck1vZGUnXG5cdFx0XTtcblxuXHRcdHRoaXMucmVuZGVyTW9kZSA9IDA7XG5cblx0XHR0aGlzLmRyYXdQcm9ncmFtID0gdGhpcy5nbDJkLmNyZWF0ZVByb2dyYW0oe1xuXHRcdFx0dmVydGV4U2hhZGVyOiB0aGlzLmdsMmQuY3JlYXRlU2hhZGVyKCdzcHJpdGUvdGV4dHVyZS52ZXJ0Jylcblx0XHRcdCwgZnJhZ21lbnRTaGFkZXI6IHRoaXMuZ2wyZC5jcmVhdGVTaGFkZXIoJ3Nwcml0ZS90ZXh0dXJlLmZyYWcnKVxuXHRcdFx0LCBhdHRyaWJ1dGVzXG5cdFx0XHQsIHVuaWZvcm1zXG5cdFx0fSk7XG5cblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVzZSgpO1xuXG5cdFx0dGhpcy5jb2xvckxvY2F0aW9uICAgPSB0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1zLnVfY29sb3I7XG5cdFx0dGhpcy50aWxlUG9zTG9jYXRpb24gPSB0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1zLnVfdGlsZU5vO1xuXHRcdHRoaXMucmVnaW9uTG9jYXRpb24gID0gdGhpcy5kcmF3UHJvZ3JhbS51bmlmb3Jtcy51X3JlZ2lvbjtcblxuXHRcdHRoaXMuZHJhd0xheWVyID0gdGhpcy5nbDJkLmNyZWF0ZVRleHR1cmUoMTAwMCwgMTAwMCk7XG5cdFx0dGhpcy5lZmZlY3RMYXllciA9IHRoaXMuZ2wyZC5jcmVhdGVUZXh0dXJlKDEwMDAsIDEwMDApO1xuXG5cdFx0dGhpcy5kcmF3QnVmZmVyID0gdGhpcy5nbDJkLmNyZWF0ZUZyYW1lYnVmZmVyKHRoaXMuZHJhd0xheWVyKTtcblx0XHR0aGlzLmVmZmVjdEJ1ZmZlciA9IHRoaXMuZ2wyZC5jcmVhdGVGcmFtZWJ1ZmZlcih0aGlzLmVmZmVjdExheWVyKTtcblxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHQnbW91c2Vtb3ZlJywgKGV2ZW50KT0+e1xuXHRcdFx0XHR0aGlzLm1vdXNlLnggPSBldmVudC5jbGllbnRYO1xuXHRcdFx0XHR0aGlzLm1vdXNlLnkgPSBldmVudC5jbGllbnRZO1xuXHRcdFx0fVxuXHRcdCk7XG5cblx0XHR0aGlzLnNlbGVjdGVkID0ge1xuXHRcdFx0bG9jYWxYOiAgICBudWxsXG5cdFx0XHQsIGxvY2FsWTogIG51bGxcblx0XHRcdCwgZ2xvYmFsWDogbnVsbFxuXHRcdFx0LCBnbG9iYWxZOiBudWxsXG5cdFx0XHQsIHN0YXJ0R2xvYmFsWDogbnVsbFxuXHRcdFx0LCBzdGFydEdsb2JhbFk6IG51bGxcblx0XHR9O1xuXG5cdFx0dGhpcy5zZWxlY3RlZCA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh0aGlzLnNlbGVjdGVkKTtcblxuXHRcdHRoaXMuYmFja2dyb3VuZCAgPSBuZXcgQmFja2dyb3VuZCh0aGlzLCBtYXApO1xuXHRcdGNvbnN0IHcgPSAxMjgwO1xuXHRcdGNvbnN0IHNwcml0ZVNoZWV0ID0gbmV3IFNwcml0ZVNoZWV0O1xuXG5cdFx0Zm9yKGNvbnN0IGkgaW4gQXJyYXkoMTYpLmZpbGwoKSlcblx0XHR7XG5cdFx0XHRjb25zdCBiYXJyZWwgPSBuZXcgU3ByaXRlKHtcblx0XHRcdFx0c3JjOiAnYmFycmVsLnBuZycsXG5cdFx0XHRcdHNwcml0ZUJvYXJkOiB0aGlzLFxuXHRcdFx0XHRzcHJpdGVTaGVldFxuXHRcdFx0fSk7XG5cdFx0XHRiYXJyZWwueCA9IDMyICsgKGkgKiA2NCkgJSB3O1xuXHRcdFx0YmFycmVsLnkgPSBNYXRoLnRydW5jKChpICogMzIpIC8gdykgKiAzMjtcblx0XHRcdHRoaXMuc3ByaXRlcy5hZGQoYmFycmVsKTtcblx0XHR9XG5cblx0XHR0aGlzLnNwcml0ZXMuYWRkKHRoaXMuYmFja2dyb3VuZCk7XG5cblx0XHR0aGlzLmZvbGxvd2luZyA9IG51bGw7XG5cdH1cblxuXHR1bnNlbGVjdCgpXG5cdHtcblx0XHRpZih0aGlzLnNlbGVjdGVkLmxvY2FsWCA9PT0gbnVsbClcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZWxlY3RlZC5sb2NhbFggID0gbnVsbDtcblx0XHR0aGlzLnNlbGVjdGVkLmxvY2FsWSAgPSBudWxsO1xuXHRcdHRoaXMuc2VsZWN0ZWQuZ2xvYmFsWCA9IG51bGw7XG5cdFx0dGhpcy5zZWxlY3RlZC5nbG9iYWxZID0gbnVsbDtcblxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHRpZih0aGlzLmZvbGxvd2luZylcblx0XHR7XG5cdFx0XHRDYW1lcmEueCA9ICgxNiArIHRoaXMuZm9sbG93aW5nLnNwcml0ZS54KSAqIHRoaXMuZ2wyZC56b29tTGV2ZWwgfHwgMDtcblx0XHRcdENhbWVyYS55ID0gKDE2ICsgdGhpcy5mb2xsb3dpbmcuc3ByaXRlLnkpICogdGhpcy5nbDJkLnpvb21MZXZlbCB8fCAwO1xuXHRcdH1cblxuXHRcdGNvbnN0IGdsID0gdGhpcy5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC52aWV3cG9ydCgwLCAwLCBnbC5jYW52YXMud2lkdGgsIGdsLmNhbnZhcy5oZWlnaHQpO1xuXG5cdFx0Z2wuY2xlYXJDb2xvcigwLCAwLCAwLCAwKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5lZmZlY3RCdWZmZXIpO1xuXHRcdGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5kcmF3QnVmZmVyKTtcblx0XHRnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKTtcblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXHRcdGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuXG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51bmlmb3JtSSgndV9yZW5kZXJNb2RlJywgdGhpcy5yZW5kZXJNb2RlKTtcblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3Jlc29sdXRpb24nLCBnbC5jYW52YXMud2lkdGgsIGdsLmNhbnZhcy5oZWlnaHQpO1xuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3Vfc2l6ZScsIENhbWVyYS53aWR0aCwgQ2FtZXJhLmhlaWdodCk7XG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9zY2FsZScsIHRoaXMuZ2wyZC56b29tTGV2ZWwsIHRoaXMuZ2wyZC56b29tTGV2ZWwpO1xuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfcmVnaW9uJywgMCwgMCwgMCwgMCk7XG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51bmlmb3JtRihcblx0XHRcdCd1X3JpcHBsZSdcblx0XHRcdCwgTWF0aC5QSSAvIDhcblx0XHRcdCwgcGVyZm9ybWFuY2Uubm93KCkgLyAyMDAgLy8gKyAtQ2FtZXJhLnlcblx0XHRcdCwgMVxuXHRcdCk7XG5cblx0XHRsZXQgc3ByaXRlcyA9IHRoaXMuc3ByaXRlcy5pdGVtcygpO1xuXG5cdFx0c3ByaXRlcy5mb3JFYWNoKHMgPT4gcy56ID0gcyBpbnN0YW5jZW9mIEJhY2tncm91bmQgPyAtMSA6IHMueSk7XG5cblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgJiYgY29uc29sZS50aW1lKCdzb3J0Jyk7XG5cblx0XHRzcHJpdGVzLnNvcnQoKGEsYikgPT4ge1xuXHRcdFx0aWYoKGEgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSAmJiAhKGIgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXG5cdFx0XHRpZigoYiBpbnN0YW5jZW9mIEJhY2tncm91bmQpICYmICEoYSBpbnN0YW5jZW9mIEJhY2tncm91bmQpKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYS56ID09PSB1bmRlZmluZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYi56ID09PSB1bmRlZmluZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYS56IC0gYi56O1xuXHRcdH0pO1xuXG5cdFx0aWYod2luZG93LnNtUHJvZmlsaW5nKVxuXHRcdHtcblx0XHRcdGNvbnNvbGUudGltZUVuZCgnc29ydCcpO1xuXHRcdFx0d2luZG93LnNtUHJvZmlsaW5nID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0c3ByaXRlcy5mb3JFYWNoKHMgPT4gcy5kcmF3KCkpO1xuXG5cdFx0Ly8gU2V0IHRoZSByZWN0YW5nbGUgZm9yIGJvdGggbGF5ZXJzXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHQwXG5cdFx0XHQsIHRoaXMuZ2wyZC5lbGVtZW50LmhlaWdodFxuXHRcdFx0LCB0aGlzLmdsMmQuZWxlbWVudC53aWR0aFxuXHRcdFx0LCAtdGhpcy5nbDJkLmVsZW1lbnQuaGVpZ2h0XG5cdFx0KTtcblxuXHRcdC8vIFN3aXRjaCB0byB0aGUgbWFpbiBmcmFtZWJ1ZmZlclxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cblx0XHQvLyBQdXQgdGhlIGRyYXdMYXllciBpbiB0ZXgwXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5kcmF3TGF5ZXIpO1xuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfaW1hZ2UnLCAwKTtcblxuXHRcdC8vIFB1dCB0aGUgZWZmZWN0TGF5ZXIgaW4gdGV4MVxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTEpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuZWZmZWN0TGF5ZXIpO1xuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfZWZmZWN0JywgMSk7XG5cblx0XHQvLyBEcmF3XG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXG5cdFx0Ly8gQ2xlYW51cC4uLlxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTEpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApO1xuXHR9XG5cblx0cmVzaXplKHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0d2lkdGggID0gd2lkdGggIHx8IHRoaXMuZ2wyZC5lbGVtZW50LndpZHRoO1xuXHRcdGhlaWdodCA9IGhlaWdodCB8fCB0aGlzLmdsMmQuZWxlbWVudC5oZWlnaHQ7XG5cblx0XHRDYW1lcmEueCAqPSB0aGlzLmdsMmQuem9vbUxldmVsO1xuXHRcdENhbWVyYS55ICo9IHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRDYW1lcmEud2lkdGggID0gd2lkdGggIC8gdGhpcy5nbDJkLnpvb21MZXZlbDtcblx0XHRDYW1lcmEuaGVpZ2h0ID0gaGVpZ2h0IC8gdGhpcy5nbDJkLnpvb21MZXZlbDtcblxuXHRcdHRoaXMuYmFja2dyb3VuZC5yZXNpemUoQ2FtZXJhLndpZHRoLCBDYW1lcmEuaGVpZ2h0KTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuZHJhd0xheWVyKTtcblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgQ2FtZXJhLndpZHRoICogdGhpcy5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCBDYW1lcmEuaGVpZ2h0ICogdGhpcy5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBudWxsXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuZWZmZWN0TGF5ZXIpO1xuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBDYW1lcmEud2lkdGggKiB0aGlzLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIENhbWVyYS5oZWlnaHQgKiB0aGlzLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIG51bGxcblx0XHQpO1xuXHR9XG5cblx0c2V0UmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuZHJhd1Byb2dyYW0uYnVmZmVycy5hX3Bvc2l0aW9uKTtcblxuXHRcdGNvbnN0IHgxID0geDtcblx0XHRjb25zdCB4MiA9IHggKyB3aWR0aDtcblx0XHRjb25zdCB5MSA9IHk7XG5cdFx0Y29uc3QgeTIgPSB5ICsgaGVpZ2h0O1xuXG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkxLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDIsIHkyLFxuXHRcdF0pLCBnbC5TVFJFQU1fRFJBVyk7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBTcHJpdGVTaGVldFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLmltYWdlVXJsID0gJy9zcHJpdGVzaGVldC5wbmcnO1xuXHRcdHRoaXMuYm94ZXNVcmwgPSAnL3Nwcml0ZXNoZWV0Lmpzb24nO1xuXHRcdHRoaXMudmVydGljZXMgPSB7fTtcblx0XHR0aGlzLmZyYW1lcyAgID0ge307XG5cdFx0dGhpcy53aWR0aCAgICA9IDA7XG5cdFx0dGhpcy5oZWlnaHQgICA9IDA7XG5cblx0XHRsZXQgc2hlZXRMb2FkZXIgPSBmZXRjaCh0aGlzLmJveGVzVXJsKVxuXHRcdC50aGVuKChyZXNwb25zZSk9PnJlc3BvbnNlLmpzb24oKSlcblx0XHQudGhlbigoYm94ZXMpID0+IHRoaXMuYm94ZXMgPSBib3hlcyk7XG5cblx0XHRsZXQgaW1hZ2VMb2FkZXIgPSBuZXcgUHJvbWlzZSgoYWNjZXB0KT0+e1xuXHRcdFx0dGhpcy5pbWFnZSAgICAgICAgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdHRoaXMuaW1hZ2Uuc3JjICAgID0gdGhpcy5pbWFnZVVybDtcblx0XHRcdHRoaXMuaW1hZ2Uub25sb2FkID0gKCk9Pntcblx0XHRcdFx0YWNjZXB0KCk7XG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5yZWFkeSA9IFByb21pc2UuYWxsKFtzaGVldExvYWRlciwgaW1hZ2VMb2FkZXJdKVxuXHRcdC50aGVuKCgpID0+IHRoaXMucHJvY2Vzc0ltYWdlKCkpXG5cdFx0LnRoZW4oKCkgPT4gdGhpcyk7XG5cdH1cblxuXHRwcm9jZXNzSW1hZ2UoKVxuXHR7XG5cdFx0aWYoIXRoaXMuYm94ZXMgfHwgIXRoaXMuYm94ZXMuZnJhbWVzKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBjYW52YXMgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0XHRjYW52YXMud2lkdGggID0gdGhpcy5pbWFnZS53aWR0aDtcblx0XHRjYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHRjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiLCB7d2lsbFJlYWRGcmVxdWVudGx5OiB0cnVlfSk7XG5cblx0XHRjb250ZXh0LmRyYXdJbWFnZSh0aGlzLmltYWdlLCAwLCAwKTtcblxuXHRcdGNvbnN0IGZyYW1lUHJvbWlzZXMgPSBbXTtcblxuXHRcdGZvcihsZXQgaSBpbiB0aGlzLmJveGVzLmZyYW1lcylcblx0XHR7XG5cdFx0XHRjb25zdCBzdWJDYW52YXMgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0XHRcdHN1YkNhbnZhcy53aWR0aCAgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53O1xuXHRcdFx0c3ViQ2FudmFzLmhlaWdodCA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmg7XG5cblx0XHRcdGNvbnN0IHN1YkNvbnRleHQgPSBzdWJDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG5cdFx0XHRpZih0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZSlcblx0XHRcdHtcblx0XHRcdFx0c3ViQ29udGV4dC5wdXRJbWFnZURhdGEoY29udGV4dC5nZXRJbWFnZURhdGEoXG5cdFx0XHRcdFx0dGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueFxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueVxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUud1xuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaFxuXHRcdFx0XHQpLCAwLCAwKTtcblx0XHRcdH1cblxuXHRcdFx0aWYodGhpcy5ib3hlcy5mcmFtZXNbaV0udGV4dClcblx0XHRcdHtcblx0XHRcdFx0c3ViQ29udGV4dC5maWxsU3R5bGUgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5jb2xvciB8fCAnd2hpdGUnO1xuXG5cdFx0XHRcdHN1YkNvbnRleHQuZm9udCA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZvbnRcblx0XHRcdFx0XHR8fCBgJHt0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5ofXB4IHNhbnMtc2VyaWZgO1xuXHRcdFx0XHRzdWJDb250ZXh0LnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXG5cdFx0XHRcdHN1YkNvbnRleHQuZmlsbFRleHQoXG5cdFx0XHRcdFx0dGhpcy5ib3hlcy5mcmFtZXNbaV0udGV4dFxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUudyAvIDJcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmhcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLndcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRzdWJDb250ZXh0LnRleHRBbGlnbiA9IG51bGw7XG5cdFx0XHRcdHN1YkNvbnRleHQuZm9udCAgICAgID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0ZnJhbWVQcm9taXNlcy5wdXNoKG5ldyBQcm9taXNlKChhY2NlcHQpPT57XG5cdFx0XHRcdHN1YkNhbnZhcy50b0Jsb2IoKGJsb2IpPT57XG5cdFx0XHRcdFx0dGhpcy5mcmFtZXNbdGhpcy5ib3hlcy5mcmFtZXNbaV0uZmlsZW5hbWVdID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblxuXHRcdFx0XHRcdGFjY2VwdCh0aGlzLmZyYW1lc1t0aGlzLmJveGVzLmZyYW1lc1tpXS5maWxlbmFtZV0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pKTtcblxuXG5cdFx0XHQvLyBsZXQgdTEgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS54IC8gdGhpcy5pbWFnZS53aWR0aDtcblx0XHRcdC8vIGxldCB2MSA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnkgLyB0aGlzLmltYWdlLmhlaWdodDtcblxuXHRcdFx0Ly8gbGV0IHUyID0gKHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnggKyB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53KVxuXHRcdFx0Ly8gXHQvIHRoaXMuaW1hZ2Uud2lkdGg7XG5cblx0XHRcdC8vIGxldCB2MiA9ICh0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS55ICsgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaClcblx0XHRcdC8vIFx0LyB0aGlzLmltYWdlLmhlaWdodDtcblxuXHRcdFx0Ly8gdGhpcy52ZXJ0aWNlc1t0aGlzLmJveGVzLmZyYW1lc1tpXS5maWxlbmFtZV0gPSB7XG5cdFx0XHQvLyBcdHUxLHYxLHUyLHYyXG5cdFx0XHQvLyB9O1xuXHRcdH1cblxuXHRcdHJldHVybiBQcm9taXNlLmFsbChmcmFtZVByb21pc2VzKTtcblx0fVxuXG5cdGdldFZlcnRpY2VzKGZpbGVuYW1lKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMudmVydGljZXNbZmlsZW5hbWVdO1xuXHR9XG5cblx0Z2V0RnJhbWUoZmlsZW5hbWUpXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5mcmFtZXNbZmlsZW5hbWVdO1xuXHR9XG5cblx0Z2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpXG5cdHtcblx0XHRpZihBcnJheS5pc0FycmF5KGZyYW1lU2VsZWN0b3IpKVxuXHRcdHtcblx0XHRcdHJldHVybiBmcmFtZVNlbGVjdG9yLm1hcCgobmFtZSk9PnRoaXMuZ2V0RnJhbWUobmFtZSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmdldEZyYW1lc0J5UHJlZml4KGZyYW1lU2VsZWN0b3IpO1xuXHR9XG5cblx0Z2V0RnJhbWVzQnlQcmVmaXgocHJlZml4KVxuXHR7XG5cdFx0bGV0IGZyYW1lcyA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpIGluIHRoaXMuZnJhbWVzKVxuXHRcdHtcblx0XHRcdGlmKGkuc3Vic3RyaW5nKDAsIHByZWZpeC5sZW5ndGgpICE9PSBwcmVmaXgpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRmcmFtZXMucHVzaCh0aGlzLmZyYW1lc1tpXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZyYW1lcztcblx0fVxuXG5cdHN0YXRpYyBsb2FkVGV4dHVyZShnbDJkLCBpbWFnZVNyYylcblx0e1xuXHRcdGNvbnN0IGdsID0gZ2wyZC5jb250ZXh0O1xuXG5cdFx0aWYoIXRoaXMudGV4dHVyZVByb21pc2VzKVxuXHRcdHtcblx0XHRcdHRoaXMudGV4dHVyZVByb21pc2VzID0ge307XG5cdFx0fVxuXG5cdFx0aWYodGhpcy50ZXh0dXJlUHJvbWlzZXNbaW1hZ2VTcmNdKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnRleHR1cmVQcm9taXNlc1tpbWFnZVNyY107XG5cdFx0fVxuXG5cdFx0Y29uc3QgdGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblxuXHRcdHJldHVybiB0aGlzLnRleHR1cmVQcm9taXNlc1tpbWFnZVNyY10gPSB0aGlzLmxvYWRJbWFnZShpbWFnZVNyYykudGhlbihpbWFnZSA9PiB7XG5cdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKTtcblxuXHRcdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdFx0LCBpbWFnZVxuXHRcdFx0KTtcblxuXHRcdFx0LyovXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0LyovXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5SRVBFQVQpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuUkVQRUFUKTtcblx0XHRcdC8vKi9cblxuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG5cdFx0XHRyZXR1cm4ge2ltYWdlLCB0ZXh0dXJlfVxuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIGxvYWRJbWFnZShzcmMpXG5cdHtcblx0XHRpZighdGhpcy5pbWFnZVByb21pc2VzKVxuXHRcdHtcblx0XHRcdHRoaXMuaW1hZ2VQcm9taXNlcyA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmltYWdlUHJvbWlzZXNbc3JjXTtcblx0XHR9XG5cblx0XHR0aGlzLmltYWdlUHJvbWlzZXNbc3JjXSA9IG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCk9Pntcblx0XHRcdGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG5cdFx0XHRpbWFnZS5zcmMgICA9IHNyYztcblx0XHRcdGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoZXZlbnQpPT57XG5cdFx0XHRcdGFjY2VwdChpbWFnZSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLmltYWdlUHJvbWlzZXNbc3JjXTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIFRleHR1cmVCYW5rXG57XG5cdFxufSIsImV4cG9ydCBjbGFzcyBUaWxlc2V0XG57XG5cdGNvbnN0cnVjdG9yKHtcblx0XHRjb2x1bW5zLCBmaXJzdGdpZCwgaW1hZ2UsIGltYWdlaGVpZ2h0LCBpbWFnZXdpZHRoXG5cdFx0LCBtYXJnaW4sIG5hbWUsIHNwYWNpbmcsIHRpbGVjb3VudCwgdGlsZWhlaWdodCwgdGlsZXdpZHRoLFxuXHR9KXtcblx0XHR0aGlzLmltYWdlID0gbmV3IEltYWdlO1xuXHRcdHRoaXMucmVhZHkgPSBuZXcgUHJvbWlzZShhY2NlcHQgPT4gdGhpcy5pbWFnZS5vbmxvYWQgPSAoKSA9PiBhY2NlcHQoKSk7XG5cdFx0dGhpcy5pbWFnZS5zcmMgPSBpbWFnZTtcblxuXHRcdHRoaXMuY29sdW1ucyA9IGNvbHVtbnM7XG5cdFx0dGhpcy5maXJzdEdpZCA9IGZpcnN0Z2lkO1xuXHRcdHRoaXMuaW1hZ2VXaWR0aCA9IGltYWdld2lkdGg7XG5cdFx0dGhpcy5pbWFnZUhlaWdodCA9IGltYWdlaGVpZ2h0O1xuXHRcdHRoaXMubWFyZ2luID0gbWFyZ2luO1xuXHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0dGhpcy5zcGFjaW5nID0gc3BhY2luZztcblx0XHR0aGlzLnRpbGVDb3VudCA9IHRpbGVjb3VudDtcblx0XHR0aGlzLnRpbGVIZWlnaHQgPSB0aWxlaGVpZ2h0O1xuXHRcdHRoaXMudGlsZVdpZHRoID0gdGlsZXdpZHRoO1xuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiLy8gdGV4dHVyZS5mcmFnXFxuI2RlZmluZSBNX1BJIDMuMTQxNTkyNjUzNTg5NzkzMjM4NDYyNjQzMzgzMjc5NVxcbiNkZWZpbmUgTV9UQVUgTV9QSSAvIDIuMFxcbnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xcblxcbnVuaWZvcm0gdmVjMyB1X3JpcHBsZTtcXG51bmlmb3JtIHZlYzIgdV9zaXplO1xcbnVuaWZvcm0gdmVjMiB1X3RpbGVTaXplO1xcbnVuaWZvcm0gdmVjNCB1X3JlZ2lvbjtcXG51bmlmb3JtIGludCB1X2JhY2tncm91bmQ7XFxudW5pZm9ybSB2ZWMyIHVfbWFwVGV4dHVyZVNpemU7XFxuXFxudW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTtcXG51bmlmb3JtIHNhbXBsZXIyRCB1X2VmZmVjdDtcXG51bmlmb3JtIHNhbXBsZXIyRCB1X3RpbGVzO1xcbnVuaWZvcm0gc2FtcGxlcjJEIHVfdGlsZU1hcHBpbmc7XFxuXFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxudmFyeWluZyB2ZWMyIHZfcG9zaXRpb247XFxuXFxuZmxvYXQgbWFza2VkID0gMC4wO1xcbmZsb2F0IHNvcnRlZCA9IDEuMDtcXG5mbG9hdCBkaXNwbGFjZSA9IDEuMDtcXG5mbG9hdCBibHVyID0gMS4wO1xcblxcbnVuaWZvcm0gaW50IHVfcmVuZGVyTW9kZTtcXG5cXG52ZWMyIHJpcHBsZVgodmVjMiB0ZXhDb29yZCwgZmxvYXQgYSwgZmxvYXQgYiwgZmxvYXQgYykge1xcbiAgdmVjMiByaXBwbGVkID0gdmVjMihcXG4gICAgdl90ZXhDb29yZC54ICsgc2luKHZfdGV4Q29vcmQueSAqIChhICogdV9zaXplLnkpICsgYikgKiBjIC8gdV9zaXplLngsXFxuICAgIHZfdGV4Q29vcmQueVxcbiAgKTtcXG5cXG4gIGlmIChyaXBwbGVkLnggPCAwLjApIHtcXG4gICAgcmlwcGxlZC54ID0gYWJzKHJpcHBsZWQueCk7XFxuICB9XFxuICBlbHNlIGlmIChyaXBwbGVkLnggPiB1X3NpemUueCkge1xcbiAgICByaXBwbGVkLnggPSB1X3NpemUueCAtIChyaXBwbGVkLnggLSB1X3NpemUueCk7XFxuICB9XFxuXFxuICByZXR1cm4gcmlwcGxlZDtcXG59XFxuXFxudmVjMiByaXBwbGVZKHZlYzIgdGV4Q29vcmQsIGZsb2F0IGEsIGZsb2F0IGIsIGZsb2F0IGMpIHtcXG4gIHZlYzIgcmlwcGxlZCA9IHZlYzIodl90ZXhDb29yZC54LCB2X3RleENvb3JkLnkgKyBzaW4odl90ZXhDb29yZC54ICogKGEgKiB1X3NpemUueCkgKyBiKSAqIGMgLyB1X3NpemUueSk7XFxuXFxuICBpZiAocmlwcGxlZC55IDwgMC4wKSB7XFxuICAgIHJpcHBsZWQueCA9IGFicyhyaXBwbGVkLngpO1xcbiAgfVxcbiAgZWxzZSBpZiAocmlwcGxlZC55ID4gdV9zaXplLnkpIHtcXG4gICAgcmlwcGxlZC55ID0gdV9zaXplLnkgLSAocmlwcGxlZC55IC0gdV9zaXplLnkpO1xcbiAgfVxcblxcbiAgcmV0dXJuIHJpcHBsZWQ7XFxufVxcblxcbnZlYzQgbW90aW9uQmx1cihzYW1wbGVyMkQgaW1hZ2UsIGZsb2F0IGFuZ2xlLCBmbG9hdCBtYWduaXR1ZGUsIHZlYzIgdGV4dENvb3JkKSB7XFxuICB2ZWM0IG9yaWdpbmFsQ29sb3IgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCk7XFxuICB2ZWM0IGRpc3BDb2xvciA9IG9yaWdpbmFsQ29sb3I7XFxuXFxuICBjb25zdCBmbG9hdCBtYXggPSAxMC4wO1xcbiAgZmxvYXQgd2VpZ2h0ID0gMC44NTtcXG5cXG4gIGZvciAoZmxvYXQgaSA9IDAuMDsgaSA8IG1heDsgaSArPSAxLjApIHtcXG4gICAgaWYoaSA+IGFicyhtYWduaXR1ZGUpIHx8IG9yaWdpbmFsQ29sb3IuYSA8IDEuMCkge1xcbiAgICAgIGJyZWFrO1xcbiAgICB9XFxuICAgIHZlYzQgZGlzcENvbG9yRG93biA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkICsgdmVjMihcXG4gICAgICBjb3MoYW5nbGUpICogaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS54LFxcbiAgICAgIHNpbihhbmdsZSkgKiBpICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLnlcXG4gICAgKSk7XFxuICAgIGRpc3BDb2xvciA9IGRpc3BDb2xvciAqICgxLjAgLSB3ZWlnaHQpICsgZGlzcENvbG9yRG93biAqIHdlaWdodDtcXG4gICAgd2VpZ2h0ICo9IDAuODtcXG4gIH1cXG5cXG4gIHJldHVybiBkaXNwQ29sb3I7XFxufVxcblxcbnZlYzQgbGluZWFyQmx1cihzYW1wbGVyMkQgaW1hZ2UsIGZsb2F0IGFuZ2xlLCBmbG9hdCBtYWduaXR1ZGUsIHZlYzIgdGV4dENvb3JkKSB7XFxuICB2ZWM0IG9yaWdpbmFsQ29sb3IgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCk7XFxuICB2ZWM0IGRpc3BDb2xvciA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkKTtcXG5cXG4gIGNvbnN0IGZsb2F0IG1heCA9IDEwLjA7XFxuICBmbG9hdCB3ZWlnaHQgPSAwLjY1O1xcblxcbiAgZm9yIChmbG9hdCBpID0gMC4wOyBpIDwgbWF4OyBpICs9IDAuMjUpIHtcXG4gICAgaWYoaSA+IGFicyhtYWduaXR1ZGUpKSB7XFxuICAgICAgYnJlYWs7XFxuICAgIH1cXG4gICAgdmVjNCBkaXNwQ29sb3JVcCA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkICsgdmVjMihcXG4gICAgICBjb3MoYW5nbGUpICogLWkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueCxcXG4gICAgICBzaW4oYW5nbGUpICogLWkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueVxcbiAgICApKTtcXG4gICAgdmVjNCBkaXNwQ29sb3JEb3duID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQgKyB2ZWMyKFxcbiAgICAgIGNvcyhhbmdsZSkgKiBpICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLngsXFxuICAgICAgc2luKGFuZ2xlKSAqIGkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueVxcbiAgICApKTtcXG4gICAgZGlzcENvbG9yID0gZGlzcENvbG9yICogKDEuMCAtIHdlaWdodCkgKyBkaXNwQ29sb3JEb3duICogd2VpZ2h0ICogMC41ICsgZGlzcENvbG9yVXAgKiB3ZWlnaHQgKiAwLjU7XFxuICAgIHdlaWdodCAqPSAwLjcwO1xcbiAgfVxcblxcbiAgcmV0dXJuIGRpc3BDb2xvcjtcXG59XFxuXFxudm9pZCBtYWluKCkge1xcbiAgaWYgKHVfYmFja2dyb3VuZCA9PSAxKSB7XFxuICAgIGZsb2F0IHhUaWxlcyA9IGZsb29yKHVfc2l6ZS54IC8gdV90aWxlU2l6ZS54KTtcXG4gICAgZmxvYXQgeVRpbGVzID0gZmxvb3IodV9zaXplLnkgLyB1X3RpbGVTaXplLnkpO1xcblxcbiAgICBmbG9hdCBpbnZfeFRpbGVzID0gMS4wIC8geFRpbGVzO1xcbiAgICBmbG9hdCBpbnZfeVRpbGVzID0gMS4wIC8geVRpbGVzO1xcblxcbiAgICBmbG9hdCB4VGlsZXNzID0gKHVfc2l6ZS54IC8gdV90aWxlU2l6ZS54KTtcXG4gICAgZmxvYXQgeVRpbGVzcyA9ICh1X3NpemUueSAvIHVfdGlsZVNpemUueSk7XFxuXFxuICAgIGZsb2F0IGludl94VGlsZXNzID0gMS4wIC8geFRpbGVzcztcXG4gICAgZmxvYXQgaW52X3lUaWxlc3MgPSAxLjAgLyB5VGlsZXNzO1xcblxcbiAgICBmbG9hdCB4VCA9ICh2X3RleENvb3JkLnggKiB1X3NpemUueCkgLyB1X3RpbGVTaXplLng7XFxuICAgIGZsb2F0IHlUID0gKHZfdGV4Q29vcmQueSAqIHVfc2l6ZS55KSAvIHVfdGlsZVNpemUueTtcXG5cXG4gICAgZmxvYXQgeFRpbGUgPSBmbG9vcih4VCkgKiBpbnZfeFRpbGVzO1xcbiAgICBmbG9hdCB5VGlsZSA9IGZsb29yKHlUKSAqIGludl95VGlsZXM7XFxuXFxuICAgIGZsb2F0IHhPZmYgPSAoeFQgKiBpbnZfeFRpbGVzIC0geFRpbGUpICogeFRpbGVzO1xcbiAgICBmbG9hdCB5T2ZmID0gKHlUICogaW52X3lUaWxlcyAtIHlUaWxlKSAqIHlUaWxlcztcXG5cXG4gICAgaWYgKHVfcmVuZGVyTW9kZSA9PSAxKSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNChcXG4gICAgICAgIHhUaWxlXFxuICAgICAgICAsIHlUaWxlXFxuICAgICAgICAsIDBcXG4gICAgICAgICwgMS4wXFxuICAgICAgKTtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG5cXG4gICAgaWYgKHVfcmVuZGVyTW9kZSA9PSAyKSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNChcXG4gICAgICAgIHhUaWxlXFxuICAgICAgICAsIHlUaWxlXFxuICAgICAgICAsIHhPZmYgLyAyLjAgKyB5T2ZmIC8gMi4wXFxuICAgICAgICAsIDEuMFxcbiAgICAgICk7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIC8vIHZlYzQgdGlsZSA9IHRleHR1cmUyRCh1X3RpbGVNYXBwaW5nLCB2ZWMyKHhUaWxlICogaW52X3lUaWxlc3MgKyB5VGlsZSwgMC4wKSk7XFxuICAgIC8vIHZlYzQgdGlsZSA9IHRleHR1cmUyRCh1X3RpbGVNYXBwaW5nLCB2ZWMyKHhUaWxlLCB5VGlsZSkpO1xcbiAgICB2ZWM0IHRpbGUgPSB0ZXh0dXJlMkQodV90aWxlTWFwcGluZywgdl90ZXhDb29yZCk7XFxuXFxuICAgIGlmICh1X3JlbmRlck1vZGUgPT0gMykge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHRpbGU7XFxuICAgICAgZ2xfRnJhZ0NvbG9yLmIgPSAwLjU7XFxuICAgICAgZ2xfRnJhZ0NvbG9yLmEgPSAxLjA7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIGZsb2F0IGxvID0gdGlsZS5yICogMjU2LjA7XFxuICAgIGZsb2F0IGhpID0gdGlsZS5nICogKDI1Ni4wICogMjU2LjApO1xcbiAgICBmbG9hdCB0aWxlTnVtYmVyID0gbG8gKyBoaTtcXG5cXG4gICAgaWYgKHVfcmVuZGVyTW9kZSA9PSA0KSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNChcXG4gICAgICAgIHhUaWxlICogaW52X3lUaWxlc3MgKyB5VGlsZVxcbiAgICAgICAgLCB4VGlsZSAqIGludl95VGlsZXNzICsgeVRpbGVcXG4gICAgICAgICwgeFRpbGUgKiBpbnZfeVRpbGVzcyArIHlUaWxlXFxuICAgICAgICAsIDEuMFxcbiAgICAgICk7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIGlmICh1X3JlbmRlck1vZGUgPT0gNSkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoXFxuICAgICAgICBtb2QodGlsZU51bWJlciwgMjU2LjApIC8gMjU2LjBcXG4gICAgICAgICwgbW9kKHRpbGVOdW1iZXIsIDI1Ni4wKSAvIDI1Ni4wXFxuICAgICAgICAsIG1vZCh0aWxlTnVtYmVyLCAyNTYuMCkgLyAyNTYuMFxcbiAgICAgICAgLCAxLjBcXG4gICAgICApO1xcbiAgICAgIHJldHVybjtcXG4gICAgfVxcblxcbiAgICBmbG9hdCB4V3JhcCA9ICh1X21hcFRleHR1cmVTaXplLnggLyB1X3RpbGVTaXplLngpO1xcbiAgICBmbG9hdCB5V3JhcCA9ICh1X21hcFRleHR1cmVTaXplLnkgLyB1X3RpbGVTaXplLnkpO1xcblxcbiAgICBmbG9hdCB0aWxlWCA9IGZsb29yKG1vZCh0aWxlTnVtYmVyLCB4V3JhcCkpO1xcbiAgICBmbG9hdCB0aWxlWSA9IGZsb29yKHRpbGVOdW1iZXIgLyB4V3JhcCk7XFxuXFxuICAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1X3RpbGVzLCB2ZWMyKFxcbiAgICAgIHhPZmYgLyB4V3JhcCArIHRpbGVYICogKHVfdGlsZVNpemUueSAvIHVfbWFwVGV4dHVyZVNpemUueSlcXG4gICAgICAsIHlPZmYgLyB5V3JhcCArIHRpbGVZICogKHVfdGlsZVNpemUueSAvIHVfbWFwVGV4dHVyZVNpemUueSlcXG4gICAgKSk7XFxuXFxuXFxuICAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1X3RpbGVzLCB2ZWMyKFxcbiAgICAgIHhPZmYgLyB4V3JhcCArIHRpbGVYICogKHVfdGlsZVNpemUueSAvIHVfbWFwVGV4dHVyZVNpemUueSlcXG4gICAgICAsIHlPZmYgLyB5V3JhcCArIHRpbGVZICogKHVfdGlsZVNpemUueSAvIHVfbWFwVGV4dHVyZVNpemUueSlcXG4gICAgKSk7XFxuXFxuICAgIHJldHVybjtcXG4gIH1cXG5cXG4gIHZlYzQgb3JpZ2luYWxDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCAgdl90ZXhDb29yZCk7XFxuICB2ZWM0IGVmZmVjdENvbG9yICAgPSB0ZXh0dXJlMkQodV9lZmZlY3QsIHZfdGV4Q29vcmQpO1xcblxcbiAgLy8gVGhpcyBpZi9lbHNlIGJsb2NrIG9ubHkgYXBwbGllc1xcbiAgLy8gd2hlbiB3ZSdyZSBkcmF3aW5nIHRoZSBlZmZlY3RCdWZmZXJcXG4gIGlmICh1X3JlZ2lvbi5yID4gMC4wIHx8IHVfcmVnaW9uLmcgPiAwLjAgfHwgdV9yZWdpb24uYiA+IDAuMCkge1xcbiAgICBpZiAobWFza2VkIDwgMS4wIHx8IG9yaWdpbmFsQ29sb3IuYSA+IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHVfcmVnaW9uO1xcbiAgICB9XFxuICAgIHJldHVybjtcXG4gIH1cXG4gIGVsc2UgaWYgKHVfcmVnaW9uLmEgPiAwLjApIHtcXG4gICAgaWYgKHNvcnRlZCA+IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMCwgMCwgMCwgb3JpZ2luYWxDb2xvci5hID4gMC4wID8gMS4wIDogMC4wKTtcXG4gICAgfVxcbiAgICBlbHNlIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAsIDAsIDAsIDAuMCk7XFxuICAgIH1cXG4gICAgcmV0dXJuO1xcbiAgfTtcXG5cXG4gIC8vIFRoaXMgaWYvZWxzZSBibG9jayBvbmx5IGFwcGxpZXNcXG4gIC8vIHdoZW4gd2UncmUgZHJhd2luZyB0aGUgZHJhd0J1ZmZlclxcbiAgaWYgKGVmZmVjdENvbG9yID09IHZlYzQoMCwgMSwgMSwgMSkpIHsgLy8gV2F0ZXIgcmVnaW9uXFxuICAgIHZlYzIgdGV4Q29vcmQgPSB2X3RleENvb3JkO1xcbiAgICB2ZWM0IHZfYmx1cnJlZENvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG4gICAgaWYgKGRpc3BsYWNlID4gMC4wKSB7XFxuICAgICAgdGV4Q29vcmQgPSByaXBwbGVYKHZfdGV4Q29vcmQsIHVfcmlwcGxlLngsIHVfcmlwcGxlLnksIHVfcmlwcGxlLnopO1xcbiAgICAgIHZfYmx1cnJlZENvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHRleENvb3JkKTtcXG4gICAgfVxcbiAgICBpZiAoYmx1ciA+IDAuMCkge1xcbiAgICAgIHZfYmx1cnJlZENvbG9yID0gbGluZWFyQmx1cih1X2ltYWdlLCAwLjAsIDEuMCwgdGV4Q29vcmQpO1xcbiAgICB9XFxuICAgIGdsX0ZyYWdDb2xvciA9IHZfYmx1cnJlZENvbG9yICogMC42NSArIGVmZmVjdENvbG9yICogMC4zNTtcXG4gIH1cXG4gIGVsc2UgaWYgKGVmZmVjdENvbG9yID09IHZlYzQoMSwgMCwgMCwgMSkpIHsgLy8gRmlyZSByZWdpb25cXG4gICAgdmVjMiB2X2Rpc3BsYWNlbWVudCA9IHJpcHBsZVkodl90ZXhDb29yZCwgdV9yaXBwbGUueCAqIDIuMCwgdV9yaXBwbGUueSAqIDEuNSwgdV9yaXBwbGUueiAqIDAuMSk7XFxuICAgIHZlYzQgdl9ibHVycmVkQ29sb3IgPSBvcmlnaW5hbENvbG9yO1xcbiAgICBpZiAoZGlzcGxhY2UgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB2X2Rpc3BsYWNlbWVudCk7XFxuICAgIH1cXG4gICAgaWYgKGJsdXIgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IG1vdGlvbkJsdXIodV9pbWFnZSwgLU1fVEFVLCAxLjAsIHZfZGlzcGxhY2VtZW50KTtcXG4gICAgfVxcbiAgICBnbF9GcmFnQ29sb3IgPSB2X2JsdXJyZWRDb2xvciAqIDAuNzUgKyBlZmZlY3RDb2xvciAqIDAuMjU7XFxuICB9XFxuICBlbHNlIHsgLy8gTnVsbCByZWdpb25cXG4gICAgZ2xfRnJhZ0NvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG4gIH1cXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiLy8gdGV4dHVyZS52ZXJ0XFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxuYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxuXFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxudmFyeWluZyB2ZWMyIHZfcG9zaXRpb247XFxuXFxudm9pZCBtYWluKClcXG57XFxuICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247XFxuICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDtcXG4gIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTtcXG4gIHZfdGV4Q29vcmQgID0gYV90ZXhDb29yZDtcXG4gIHZfcG9zaXRpb24gID0gYV9wb3NpdGlvbjtcXG59XFxuXCIiLCJpbXBvcnQgeyBWaWV3IH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvVmlldyc7XG5cbmV4cG9ydCBjbGFzcyBDb250cm9sbGVyIGV4dGVuZHMgVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXIudG1wJyk7XG5cdFx0dGhpcy5kcmFnU3RhcnQgPSBmYWxzZTtcblxuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyAgPSBmYWxzZTtcblx0XHR0aGlzLmFyZ3MueCA9IDA7XG5cdFx0dGhpcy5hcmdzLnkgPSAwO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5tb3ZlU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMuZHJvcFN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMubW92ZVN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5kcm9wU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZHJhZ1N0aWNrKGV2ZW50KVxuXHR7XG5cdFx0bGV0IHBvcyA9IGV2ZW50O1xuXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuXHRcdGlmKGV2ZW50LnRvdWNoZXMgJiYgZXZlbnQudG91Y2hlc1swXSlcblx0XHR7XG5cdFx0XHRwb3MgPSBldmVudC50b3VjaGVzWzBdO1xuXHRcdH1cblxuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyA9IHRydWU7XG5cdFx0dGhpcy5kcmFnU3RhcnQgICAgID0ge1xuXHRcdFx0eDogICBwb3MuY2xpZW50WFxuXHRcdFx0LCB5OiBwb3MuY2xpZW50WVxuXHRcdH07XG5cdH1cblxuXHRtb3ZlU3RpY2soZXZlbnQpXG5cdHtcblx0XHRpZih0aGlzLmFyZ3MuZHJhZ2dpbmcpXG5cdFx0e1xuXHRcdFx0bGV0IHBvcyA9IGV2ZW50O1xuXG5cdFx0XHRpZihldmVudC50b3VjaGVzICYmIGV2ZW50LnRvdWNoZXNbMF0pXG5cdFx0XHR7XG5cdFx0XHRcdHBvcyA9IGV2ZW50LnRvdWNoZXNbMF07XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy54eCA9IHBvcy5jbGllbnRYIC0gdGhpcy5kcmFnU3RhcnQueDtcblx0XHRcdHRoaXMuYXJncy55eSA9IHBvcy5jbGllbnRZIC0gdGhpcy5kcmFnU3RhcnQueTtcblxuXHRcdFx0Y29uc3QgbGltaXQgPSA1MDtcblxuXHRcdFx0aWYodGhpcy5hcmdzLnh4IDwgLWxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IC1saW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYodGhpcy5hcmdzLnh4ID4gbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gdGhpcy5hcmdzLnh4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLmFyZ3MueXkgPCAtbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gLWxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZih0aGlzLmFyZ3MueXkgPiBsaW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSBsaW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSB0aGlzLmFyZ3MueXk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJvcFN0aWNrKGV2ZW50KVxuXHR7XG5cdFx0dGhpcy5hcmdzLmRyYWdnaW5nID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnggPSAwO1xuXHRcdHRoaXMuYXJncy55ID0gMDtcblx0fVxufVxuIiwiaW1wb3J0IHsgVmlldyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1ZpZXcnO1xuXG5leHBvcnQgY2xhc3MgTWFwRWRpdG9yIGV4dGVuZHMgVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL21hcEVkaXRvci50bXAnKTtcblxuXHRcdGFyZ3Muc3ByaXRlU2hlZXQucmVhZHkudGhlbigoc2hlZXQpPT57XG5cdFx0XHR0aGlzLmFyZ3MudGlsZXMgPSBzaGVldC5mcmFtZXM7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmFyZ3MuYmluZFRvKCdzZWxlY3RlZEdyYXBoaWMnLCAodik9Pntcblx0XHRcdHRoaXMuYXJncy5zZWxlY3RlZEdyYXBoaWMgPSBudWxsO1xuXHRcdH0sIHt3YWl0OjB9KTtcblxuXHRcdHRoaXMuYXJncy5tdWx0aVNlbGVjdCAgID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnNlbGVjdGlvbiAgICAgPSB7fTtcblx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRJbWFnZSA9IG51bGxcblx0fVxuXG5cdHNlbGVjdEdyYXBoaWMoc3JjKVxuXHR7XG5cdFx0Y29uc29sZS5sb2coc3JjKTtcblxuXHRcdHRoaXMuYXJncy5zZWxlY3RlZEdyYXBoaWMgPSBzcmM7XG5cdH1cblxuXHRzZWxlY3Qoc2VsZWN0aW9uKVxuXHR7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLmFyZ3Muc2VsZWN0aW9uLCBzZWxlY3Rpb24pO1xuXG5cdFx0aWYoc2VsZWN0aW9uLmdsb2JhbFggIT09IHNlbGVjdGlvbi5zdGFydEdsb2JhbFhcblx0XHRcdHx8IHNlbGVjdGlvbi5nbG9iYWxZICE9PSBzZWxlY3Rpb24uc3RhcnRHbG9iYWxZXG5cdFx0KXtcblx0XHRcdHRoaXMuYXJncy5tdWx0aVNlbGVjdCA9IHRydWU7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR0aGlzLmFyZ3MubXVsdGlTZWxlY3QgPSBmYWxzZTtcblx0XHR9XG5cblx0XHRpZighdGhpcy5hcmdzLm11bHRpU2VsZWN0KVxuXHRcdHtcblx0XHRcdHRoaXMuYXJncy5zZWxlY3RlZEltYWdlcyA9IHRoaXMuYXJncy5tYXAuZ2V0VGlsZShzZWxlY3Rpb24uZ2xvYmFsWCwgc2VsZWN0aW9uLmdsb2JhbFkpO1xuXHRcdH1cblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3MgPSBcXFwiY29udHJvbGxlclxcXCI+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJqb3lzdGlja1xcXCIgY3Ytb24gPSBcXFwiXFxuXFx0XFx0dG91Y2hzdGFydDpkcmFnU3RpY2soZXZlbnQpO1xcblxcdFxcdG1vdXNlZG93bjpkcmFnU3RpY2soZXZlbnQpO1xcblxcdFxcXCI+XFxuXFx0XFx0PGRpdiBjbGFzcyA9IFxcXCJwYWRcXFwiIHN0eWxlID0gXFxcInBvc2l0aW9uOiByZWxhdGl2ZTsgdHJhbnNmb3JtOnRyYW5zbGF0ZShbW3hdXXB4LFtbeV1dcHgpO1xcXCI+PC9kaXY+XFxuXFx0PC9kaXY+XFxuXFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJidXR0b25cXFwiPkE8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImJ1dHRvblxcXCI+QjwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwiYnV0dG9uXFxcIj5DPC9kaXY+XFxuPC9kaXY+XCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcyA9IFxcXCJ0YWItcGFnZSBtYXBFZGl0b3JcXFwiPlxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGFic1xcXCI+XFxuXFx0XFx0PGRpdj5UaWxlPC9kaXY+XFxuXFx0XFx0PGRpdj5MYXllcjwvZGl2PlxcblxcdFxcdDxkaXY+T2JqZWN0PC9kaXY+XFxuXFx0XFx0PGRpdj5UcmlnZ2VyPC9kaXY+XFxuXFx0XFx0PGRpdj5NYXA8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVcXFwiPlxcblxcdFxcdDxkaXYgY2xhc3MgPSBcXFwic2VsZWN0ZWRcXFwiPlxcblxcdFxcdFxcdDxkaXYgY3YtaWYgPSBcXFwiIW11bHRpU2VsZWN0XFxcIj5cXG5cXHRcXHRcXHRcXHQ8cCBzdHlsZSA9IFxcXCJmb250LXNpemU6IGxhcmdlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQoW1tzZWxlY3Rpb24uZ2xvYmFsWF1dLCBbW3NlbGVjdGlvbi5nbG9iYWxZXV0pXFxuXFx0XFx0XFx0XFx0PC9wPlxcblxcdFxcdFxcdFxcdDxwIGN2LWVhY2ggPSBcXFwic2VsZWN0ZWRJbWFnZXM6c2VsZWN0ZWRJbWFnZTpzSVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGJ1dHRvbj4tPC9idXR0b24+XFxuXFx0XFx0XFx0XFx0XFx0PGltZyBjbGFzcyA9IFxcXCJjdXJyZW50XFxcIiBjdi1hdHRyID0gXFxcInNyYzpzZWxlY3RlZEltYWdlXFxcIj5cXG5cXHRcXHRcXHRcXHQ8L3A+XFxuXFx0XFx0XFx0XFx0PGJ1dHRvbj4rPC9idXR0b24+XFxuXFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0PGRpdiBjdi1pZiA9IFxcXCJtdWx0aVNlbGVjdFxcXCI+XFxuXFx0XFx0XFx0XFx0PHAgc3R5bGUgPSBcXFwiZm9udC1zaXplOiBsYXJnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0KFtbc2VsZWN0aW9uLnN0YXJ0R2xvYmFsWF1dLCBbW3NlbGVjdGlvbi5zdGFydEdsb2JhbFldXSkgLSAoW1tzZWxlY3Rpb24uZ2xvYmFsWF1dLCBbW3NlbGVjdGlvbi5nbG9iYWxZXV0pXFxuXFx0XFx0XFx0XFx0PC9wPlxcblxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdDwvZGl2PlxcblxcdFxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZXNcXFwiIGN2LWVhY2ggPSBcXFwidGlsZXM6dGlsZTp0XFxcIj5cXG5cXHRcXHRcXHQ8aW1nIGN2LWF0dHIgPSBcXFwic3JjOnRpbGUsdGl0bGU6dFxcXCIgY3Ytb24gPSBcXFwiY2xpY2s6c2VsZWN0R3JhcGhpYyh0KTtcXFwiPlxcblxcdFxcdDwvZGl2PlxcblxcdDwvZGl2PlxcblxcdDwhLS0gPGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5PQkpFQ1QgTU9ERTwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+VFJJR0dFUiBNT0RFPC9kaXY+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5NQVAgTU9ERTwvZGl2PiAtLT5cXG48L2Rpdj5cIiIsImltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGUnO1xuXG5leHBvcnQgY2xhc3MgRmxvb3Jcbntcblx0Y29uc3RydWN0b3IoZ2wyZCwgYXJncylcblx0e1xuXHRcdHRoaXMuZ2wyZCAgID0gZ2wyZDtcblx0XHR0aGlzLnNwcml0ZXMgPSBbXTtcblxuXHRcdC8vIHRoaXMucmVzaXplKDYwLCAzNCk7XG5cdFx0dGhpcy5yZXNpemUoOSwgOSk7XG5cdFx0Ly8gdGhpcy5yZXNpemUoNjAqMiwgMzQqMik7XG5cdH1cblxuXHRyZXNpemUod2lkdGgsIGhlaWdodClcblx0e1xuXHRcdHRoaXMud2lkdGggID0gd2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG5cblx0XHRmb3IobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKylcblx0XHR7XG5cdFx0XHRmb3IobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHNwcml0ZSA9IG5ldyBTcHJpdGUodGhpcy5nbDJkLCAnL2Zsb29yVGlsZS5wbmcnKTtcblxuXHRcdFx0XHRzcHJpdGUueCA9IDMyICogeDtcblx0XHRcdFx0c3ByaXRlLnkgPSAzMiAqIHk7XG5cblx0XHRcdFx0dGhpcy5zcHJpdGVzLnB1c2goc3ByaXRlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdHRoaXMuc3ByaXRlcy5tYXAocyA9PiBzLmRyYXcoKSk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuaW1wb3J0IHsgVGlsZXNldCB9IGZyb20gJy4uL3Nwcml0ZS9UaWxlc2V0JztcblxuZXhwb3J0ICBjbGFzcyBNYXBcbntcblx0Y29uc3RydWN0b3Ioe3NyYywgc3ByaXRlU2hlZXR9KVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IHNwcml0ZVNoZWV0O1xuXHRcdHRoaXMuaW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xuXHRcdHRoaXMucGl4ZWxzID0gW107XG5cdFx0dGhpcy50aWxlQ291bnQgPSAwO1xuXHRcdHRoaXMudGlsZVNldFdpZHRoID0gMTtcblx0XHR0aGlzLnRpbGVTZXRIZWlnaHQgPSAxO1xuXG5cdFx0Y29uc3QgbG9hZGVyID0gZmV0Y2goc3JjKVxuXHRcdC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcblx0XHQudGhlbihtYXBEYXRhID0+IHtcblx0XHRcdGNvbnN0IHRpbGVzZXRzID0gbWFwRGF0YS50aWxlc2V0cyAmJiBtYXBEYXRhLnRpbGVzZXRzLm1hcCh0ID0+IG5ldyBUaWxlc2V0KHQpKTtcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbCh0aWxlc2V0cy5tYXAodCA9PiB0LnJlYWR5KSkudGhlbigoKSA9PiB0aWxlc2V0cyk7XG5cdFx0fSkudGhlbih0aWxlc2V0cyA9PiB7XG5cdFx0XHR0aGlzLmFzc2VtYmxlKHRpbGVzZXRzKTtcblx0XHR9KTtcblxuXHRcdHRoaXMucmVhZHkgPSBsb2FkZXI7XG5cdH1cblxuXHRhc3NlbWJsZSh0aWxlc2V0cylcblx0e1xuXHRcdHRpbGVzZXRzLnNvcnQoKGEsIGIpID0+IGEuZmlyc3RHaWQgLSBiLmZpcnN0R2lkKTtcblxuXHRcdGNvbnN0IHRpbGVUb3RhbCA9IHRoaXMudGlsZUNvdW50ID0gdGlsZXNldHMucmVkdWNlKChhLCBiKSA9PiBhLnRpbGVDb3VudCArIGIudGlsZUNvdW50LCB7dGlsZUNvdW50OiAwfSk7XG5cblx0XHRjb25zdCBzaXplID0gTWF0aC5jZWlsKE1hdGguc3FydCh0aWxlVG90YWwpKTtcblxuXHRcdGNvbnNvbGUubG9nKHRpbGVUb3RhbCwgc2l6ZSwgdGlsZXNldHMpO1xuXG5cdFx0Y29uc3QgZGVzdGluYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHR0aGlzLnRpbGVTZXRXaWR0aCAgPSBkZXN0aW5hdGlvbi53aWR0aCAgPSBzaXplICogMzI7XG5cdFx0dGhpcy50aWxlU2V0SGVpZ2h0ID0gZGVzdGluYXRpb24uaGVpZ2h0ID0gTWF0aC5jZWlsKHRpbGVUb3RhbCAvIHNpemUpICogMzI7XG5cblx0XHRjb25zdCBjdHhEZXN0aW5hdGlvbiA9IGRlc3RpbmF0aW9uLmdldENvbnRleHQoJzJkJyk7XG5cblx0XHRsZXQgeERlc3RpbmF0aW9uID0gMDtcblx0XHRsZXQgeURlc3RpbmF0aW9uID0gMDtcblxuXHRcdGZvcihjb25zdCB0aWxlc2V0IG9mIHRpbGVzZXRzKVxuXHRcdHtcblx0XHRcdGxldCB4U291cmNlID0gMDtcblx0XHRcdGxldCB5U291cmNlID0gMDtcblx0XHRcdGNvbnN0IGltYWdlID0gdGlsZXNldC5pbWFnZTtcblx0XHRcdGNvbnN0IHNvdXJjZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdFx0XHRzb3VyY2Uud2lkdGggPSBpbWFnZS53aWR0aDtcblx0XHRcdHNvdXJjZS5oZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XG5cblx0XHRcdGNvbnN0IGN0eFNvdXJjZSA9IHNvdXJjZS5nZXRDb250ZXh0KCcyZCcsIHt3aWxsUmVhZEZyZXF1ZW50bHk6IHRydWV9KTtcblxuXHRcdFx0Y3R4U291cmNlLmRyYXdJbWFnZShpbWFnZSwgMCwgMCk7XG5cblx0XHRcdGZvcihsZXQgaSA9IDA7IGkgPCB0aWxlc2V0LnRpbGVDb3VudDsgaSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB0aWxlID0gY3R4U291cmNlLmdldEltYWdlRGF0YSh4U291cmNlLCB5U291cmNlLCAzMiwgMzIpO1xuXG5cdFx0XHRcdGN0eERlc3RpbmF0aW9uLnB1dEltYWdlRGF0YSh0aWxlLCB4RGVzdGluYXRpb24sIHlEZXN0aW5hdGlvbik7XG5cblx0XHRcdFx0eFNvdXJjZSArPSAzMjtcblx0XHRcdFx0eERlc3RpbmF0aW9uICs9IDMyO1xuXG5cdFx0XHRcdGlmKHhTb3VyY2UgPj0gdGlsZXNldC5pbWFnZVdpZHRoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eFNvdXJjZSA9IDA7XG5cdFx0XHRcdFx0eVNvdXJjZSArPSAzMjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKHhEZXN0aW5hdGlvbiA+PSBkZXN0aW5hdGlvbi53aWR0aClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHhEZXN0aW5hdGlvbiA9IDA7XG5cdFx0XHRcdFx0eURlc3RpbmF0aW9uICs9IDMyO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5waXhlbHMgPSBjdHhEZXN0aW5hdGlvbi5nZXRJbWFnZURhdGEoMCwgMCwgZGVzdGluYXRpb24ud2lkdGgsIGRlc3RpbmF0aW9uLmhlaWdodCkuZGF0YTtcblxuXHRcdGRlc3RpbmF0aW9uLnRvQmxvYihibG9iID0+IHtcblx0XHRcdGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHR0aGlzLmltYWdlLm9ubG9hZCA9ICgpID0+IFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcblx0XHRcdHRoaXMuaW1hZ2Uuc3JjID0gdXJsO1xuXHRcdH0pO1xuXG5cdFx0Y29uc29sZS5sb2coZGVzdGluYXRpb24udG9EYXRhVVJMKCkpO1xuXHR9XG5cblx0Z2V0VGlsZSh4LCB5LCBsYXllciA9IDApXG5cdHtcblx0XHRpZih0aGlzLnRpbGVzW2Ake3h9LCR7eX0tLSR7bGF5ZXJ9YF0pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0dGhpcy5zcHJpdGVTaGVldC5nZXRGcmFtZSh0aGlzLnRpbGVzW2Ake3h9LCR7eX0tLSR7bGF5ZXJ9YF0pXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdGxldCBzcGxpdCA9IDQ7XG5cdFx0bGV0IHNlY29uZCA9ICdyb2NrXzQucG5nJztcblxuXHRcdGlmKCh4ICUgc3BsaXQgPT09IDApICYmICh5ICUgc3BsaXQgPT09IDApKVxuXHRcdHtcblx0XHRcdHNlY29uZCA9ICdjaGVlc2UucG5nJ1xuXHRcdH1cblxuXHRcdGlmKHggPT09IC0xICYmIHkgPT09IC0xKVxuXHRcdHtcblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdC8vIHRoaXMuc3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2Zsb29yVGlsZS5wbmcnKVxuXHRcdFx0XHR0aGlzLnNwcml0ZVNoZWV0LmdldEZyYW1lKCdib3hfZmFjZS5wbmcnKVxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRyZXR1cm4gW1xuXHRcdFx0dGhpcy5zcHJpdGVTaGVldC5nZXRGcmFtZSgnZmxvb3JUaWxlLnBuZycpXG5cdFx0XHQvLyB0aGlzLnNwcml0ZVNoZWV0LmdldEZyYW1lKCdib3hfZmFjZS5wbmcnKVxuXHRcdF07XG5cblx0XHRyZXR1cm4gW1xuXHRcdFx0dGhpcy5zcHJpdGVTaGVldC5nZXRGcmFtZSgnZmxvb3JUaWxlLnBuZycpXG5cdFx0XHQsIHRoaXMuc3ByaXRlU2hlZXQuZ2V0RnJhbWUoc2Vjb25kKVxuXHRcdF07XG5cdH1cblxuXHRzZXRUaWxlKHgsIHksIGltYWdlLCBsYXllciA9IDApXG5cdHtcblx0XHR0aGlzLnRpbGVzW2Ake3h9LCR7eX0tLSR7bGF5ZXJ9YF0gPSBpbWFnZTtcblx0fVxuXG5cdGV4cG9ydCgpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0aGlzLnRpbGVzKSk7XG5cdH1cblxuXHRpbXBvcnQoaW5wdXQpXG5cdHtcblx0XHRpbnB1dCA9IGB7XCItMiwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wiLFwiLTEsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIixcIjAsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIn1gO1xuXG5cdFx0dGhpcy50aWxlcyA9IEpTT04ucGFyc2UoaW5wdXQpO1xuXG5cdFx0Ly8gY29uc29sZS5sb2coSlNPTi5wYXJzZShpbnB1dCkpO1xuXHR9XG59XG5cblxuLy8ge1wiLTIsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIixcIi0xLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCIsXCIwLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCJ9XG4iLCIvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBXZWJTb2NrZXQgPSB3aW5kb3cuV2ViU29ja2V0IHx8IHdpbmRvdy5Nb3pXZWJTb2NrZXQ7XG4gIHZhciBiciA9IHdpbmRvdy5icnVuY2ggPSAod2luZG93LmJydW5jaCB8fCB7fSk7XG4gIHZhciBhciA9IGJyWydhdXRvLXJlbG9hZCddID0gKGJyWydhdXRvLXJlbG9hZCddIHx8IHt9KTtcbiAgaWYgKCFXZWJTb2NrZXQgfHwgYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgaWYgKHdpbmRvdy5fYXIpIHJldHVybjtcbiAgd2luZG93Ll9hciA9IHRydWU7XG5cbiAgdmFyIGNhY2hlQnVzdGVyID0gZnVuY3Rpb24odXJsKXtcbiAgICB2YXIgZGF0ZSA9IE1hdGgucm91bmQoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgdXJsID0gdXJsLnJlcGxhY2UoLyhcXCZ8XFxcXD8pY2FjaGVCdXN0ZXI9XFxkKi8sICcnKTtcbiAgICByZXR1cm4gdXJsICsgKHVybC5pbmRleE9mKCc/JykgPj0gMCA/ICcmJyA6ICc/JykgKydjYWNoZUJ1c3Rlcj0nICsgZGF0ZTtcbiAgfTtcblxuICB2YXIgYnJvd3NlciA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKTtcbiAgdmFyIGZvcmNlUmVwYWludCA9IGFyLmZvcmNlUmVwYWludCB8fCBicm93c2VyLmluZGV4T2YoJ2Nocm9tZScpID4gLTE7XG5cbiAgdmFyIHJlbG9hZGVycyA9IHtcbiAgICBwYWdlOiBmdW5jdGlvbigpe1xuICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcbiAgICB9LFxuXG4gICAgc3R5bGVzaGVldDogZnVuY3Rpb24oKXtcbiAgICAgIFtdLnNsaWNlXG4gICAgICAgIC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpbmtbcmVsPXN0eWxlc2hlZXRdJykpXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIHZhciB2YWwgPSBsaW5rLmdldEF0dHJpYnV0ZSgnZGF0YS1hdXRvcmVsb2FkJyk7XG4gICAgICAgICAgcmV0dXJuIGxpbmsuaHJlZiAmJiB2YWwgIT0gJ2ZhbHNlJztcbiAgICAgICAgfSlcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIGxpbmsuaHJlZiA9IGNhY2hlQnVzdGVyKGxpbmsuaHJlZik7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBIYWNrIHRvIGZvcmNlIHBhZ2UgcmVwYWludCBhZnRlciAyNW1zLlxuICAgICAgaWYgKGZvcmNlUmVwYWludCkgc2V0VGltZW91dChmdW5jdGlvbigpIHsgZG9jdW1lbnQuYm9keS5vZmZzZXRIZWlnaHQ7IH0sIDI1KTtcbiAgICB9LFxuXG4gICAgamF2YXNjcmlwdDogZnVuY3Rpb24oKXtcbiAgICAgIHZhciBzY3JpcHRzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQnKSk7XG4gICAgICB2YXIgdGV4dFNjcmlwdHMgPSBzY3JpcHRzLm1hcChmdW5jdGlvbihzY3JpcHQpIHsgcmV0dXJuIHNjcmlwdC50ZXh0IH0pLmZpbHRlcihmdW5jdGlvbih0ZXh0KSB7IHJldHVybiB0ZXh0Lmxlbmd0aCA+IDAgfSk7XG4gICAgICB2YXIgc3JjU2NyaXB0cyA9IHNjcmlwdHMuZmlsdGVyKGZ1bmN0aW9uKHNjcmlwdCkgeyByZXR1cm4gc2NyaXB0LnNyYyB9KTtcblxuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgYWxsID0gc3JjU2NyaXB0cy5sZW5ndGg7XG4gICAgICB2YXIgb25Mb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvYWRlZCA9IGxvYWRlZCArIDE7XG4gICAgICAgIGlmIChsb2FkZWQgPT09IGFsbCkge1xuICAgICAgICAgIHRleHRTY3JpcHRzLmZvckVhY2goZnVuY3Rpb24oc2NyaXB0KSB7IGV2YWwoc2NyaXB0KTsgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3JjU2NyaXB0c1xuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzY3JpcHQpIHtcbiAgICAgICAgICB2YXIgc3JjID0gc2NyaXB0LnNyYztcbiAgICAgICAgICBzY3JpcHQucmVtb3ZlKCk7XG4gICAgICAgICAgdmFyIG5ld1NjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICAgIG5ld1NjcmlwdC5zcmMgPSBjYWNoZUJ1c3RlcihzcmMpO1xuICAgICAgICAgIG5ld1NjcmlwdC5hc3luYyA9IHRydWU7XG4gICAgICAgICAgbmV3U2NyaXB0Lm9ubG9hZCA9IG9uTG9hZDtcbiAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKG5ld1NjcmlwdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfTtcbiAgdmFyIHBvcnQgPSBhci5wb3J0IHx8IDk0ODU7XG4gIHZhciBob3N0ID0gYnIuc2VydmVyIHx8IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSB8fCAnbG9jYWxob3N0JztcblxuICB2YXIgY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgV2ViU29ja2V0KCd3czovLycgKyBob3N0ICsgJzonICsgcG9ydCk7XG4gICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCl7XG4gICAgICBpZiAoYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgICAgIHZhciBtZXNzYWdlID0gZXZlbnQuZGF0YTtcbiAgICAgIHZhciByZWxvYWRlciA9IHJlbG9hZGVyc1ttZXNzYWdlXSB8fCByZWxvYWRlcnMucGFnZTtcbiAgICAgIHJlbG9hZGVyKCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuICAgICAgaWYgKGNvbm5lY3Rpb24ucmVhZHlTdGF0ZSkgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24oKXtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNvbm5lY3QsIDEwMDApO1xuICAgIH07XG4gIH07XG4gIGNvbm5lY3QoKTtcbn0pKCk7XG4vKiBqc2hpbnQgaWdub3JlOmVuZCAqL1xuIl19