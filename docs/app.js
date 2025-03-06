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
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Gl2d = exports.Gl2d = /*#__PURE__*/function () {
  function Gl2d(element) {
    _classCallCheck(this, Gl2d);
    this.element = element || document.createElement('canvas');
    this.context = this.element.getContext('webgl');
    this.screenScale = 1;
    this.zoomLevel = 2;
  }
  return _createClass(Gl2d, [{
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
    _this.map = new _Map.Map();
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
      };
      this.spriteBoard.gl2d.zoomLevel = document.body.clientWidth / 1024 * 2;
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
}(_View.View);
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
var _Camera = require("../sprite/Camera");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Entity = exports.Entity = /*#__PURE__*/function () {
  function Entity(_ref) {
    var sprite = _ref.sprite,
      controller = _ref.controller;
    _classCallCheck(this, Entity);
    this.direction = 'south';
    this.state = 'standing';
    this.sprite = sprite;
    this.controller = controller;
  }
  return _createClass(Entity, [{
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
module.exports = "precision mediump float;\n\nuniform vec4 u_color;\nvarying vec2 v_texCoord;\n\nvoid main() {\n   // gl_FragColor = texture2D(u_image, v_texCoord);\n   gl_FragColor = vec4(1.0, 1.0, 0.0, 0.25);\n}\n"
});

;require.register("overlay/overlay.vert", function(exports, require, module) {
module.exports = "attribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform vec2 u_resolution;\nvarying vec2 v_texCoord;\n\nvoid main()\n{\n   vec2 zeroToOne = a_position / u_resolution;\n   vec2 zeroToTwo = zeroToOne * 2.0;\n   vec2 clipSpace = zeroToTwo - 1.0;\n\n   gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n   v_texCoord  = a_texCoord;\n}\n"
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
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Background = exports.Background = /*#__PURE__*/function () {
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
  return _createClass(Background, [{
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
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
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
      var gl = this.spriteBoard.gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.positionBuffer);
      var x1 = x;
      var y1 = y;
      var x2 = x + width;
      var y2 = y + height;

      // const s = -80 * this.spriteBoard.gl2d.zoomLevel * Math.sin(performance.now() / 1000);
      var s = 0;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1 + s, y1, this.z, x2 + s, y1, this.z, x1, y2, this.z, x1, y2, this.z, x2 + s, y1, this.z, x2, y2, this.z]), gl.STREAM_DRAW);
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
    gl.useProgram(this.program);
    this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
    this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    this.positionBuffer = gl.createBuffer();
    this.texCoordBuffer = gl.createBuffer();
    this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
    this.tilePosLocation = gl.getUniformLocation(this.program, 'u_tileNo');
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
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);

      // gl.clearColor(0, 0, 0, 0);
      // gl.clear(gl.COLOR_BUFFER_BIT);

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
      _Camera.Camera.x *= this.gl2d.zoomLevel;
      _Camera.Camera.y *= this.gl2d.zoomLevel;
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
      return this.texturePromises[imageSrc] = this.loadImage(imageSrc).then(function (image) {
        var texture = gl.createTexture();
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

;require.register("sprite/Surface.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Surface = void 0;
var _Bindable = require("curvature/base/Bindable");
var _Camera = require("./Camera");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Surface = exports.Surface = /*#__PURE__*/function () {
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
    this.subTextures = {};
    this.spriteSheet.ready.then(function (sheet) {
      return _this.buildTiles();
    });
    var gl = this.spriteBoard.gl2d.context;
    this.pane = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.pane);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //*/
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    /*/
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //*/

    this.frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pane, 0);
  }
  return _createClass(Surface, [{
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
    key: "buildTiles",
    value: function buildTiles() {
      var _this2 = this;
      var texturePromises = [];
      var size = this.xSize * this.ySize;
      var _loop = function _loop(i) {
        var localX = i % _this2.xSize;
        var offsetX = Math.floor(_this2.x / _this2.tileWidth);
        var globalX = localX + offsetX;
        var localY = Math.floor(i / _this2.xSize);
        var offsetY = Math.floor(_this2.y / _this2.tileHeight);
        var globalY = localY + offsetY;
        var frames = _this2.map.getTile(globalX, globalY, _this2.layer);
        var loadTexture = function loadTexture(frame) {
          return _this2.spriteSheet.constructor.loadTexture(_this2.spriteBoard.gl2d, frame);
        };
        if (Array.isArray(frames)) {
          var j = 0;
          _this2.subTextures[i] = [];
          texturePromises.push(Promise.all(frames.map(function (frame) {
            return loadTexture(frame).then(function (args) {
              _this2.subTextures[i][j] = args.texture;
              j++;
            });
          })));
        } else {
          texturePromises.push(loadTexture(frames).then(function (args) {
            return _this2.subTextures[i] = args.texture;
          }));
        }
      };
      for (var i = 0; i < size; i++) {
        _loop(i);
      }
      Promise.all(texturePromises).then(function () {
        return _this2.assemble();
      });
    }
  }, {
    key: "assemble",
    value: function assemble() {
      var gl = this.spriteBoard.gl2d.context;
      gl.bindTexture(gl.TEXTURE_2D, this.subTextures[0][0]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
      gl.viewport(0, 0, this.width, this.height);
      // gl.clearColor(0, 0, 0, 1);
      gl.clearColor(Math.random(), Math.random(), Math.random(), 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform4f(this.spriteBoard.colorLocation, 1, 0, 0, 1);
      gl.uniform3f(this.spriteBoard.tilePosLocation, 0, 0, 0);
      gl.uniform2f(this.spriteBoard.resolutionLocation, this.width, this.height);
      if (this.subTextures[0][0]) {
        gl.bindTexture(gl.TEXTURE_2D, this.subTextures[0][0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, this.width / 32, 0.0, 0.0, -this.height / 32, 0.0, -this.height / 32, this.width / 32, 0.0, this.width / 32, -this.height / 32]), gl.STATIC_DRAW);
        this.setRectangle(0, 0, this.width, this.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return;
      for (var i in this.subTextures) {
        i = Number(i);
        var x = i * this.tileWidth % this.width;
        var y = Math.trunc(i * this.tileWidth / this.width) * this.tileWidth;
        if (!Array.isArray(this.subTextures[i])) {
          this.subTextures[i] = [this.subTextures[i]];
        }
        for (var j in this.subTextures[i]) {
          gl.uniform3f(this.spriteBoard.tilePosLocation, Number(i), Object.keys(this.subTextures).length, 1);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.texCoordBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
          this.setRectangle(x, y + this.tileHeight, this.tileWidth, -this.tileHeight);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
      gl.uniform3f(this.spriteBoard.tilePosLocation, 0, 0, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

;require.register("sprite/texture.frag", function(exports, require, module) {
module.exports = "// texture.frag\n\nprecision mediump float;\n\nuniform sampler2D u_image;\nuniform vec4 u_color;\nvarying vec2 v_texCoord;\nuniform vec3 u_tileNo;\n\n\nvec2 ripple(vec2 texCoord, float ripple, float disp) {\n  return vec2(v_texCoord.x + sin(v_texCoord.y * ripple) * disp, v_texCoord.y);\n}\n\nvoid main() {\n/*\n  vec2 v_displaced = ripple(v_texCoord, 0.0, 0.0);\n/*/\n  vec2 v_displaced = ripple(v_texCoord, 3.1415 * 2.0, 0.025);\n  if (v_displaced.x > 1.0) {\n    v_displaced.x = 1.0 - (v_displaced.x - 1.0);\n  }\n  if (v_displaced.x < 0.0) {\n    v_displaced.x = abs(v_displaced.x);\n  }\n//*/\n  if (u_tileNo.z > 0.0) {\n    gl_FragColor = vec4(u_tileNo.x / u_tileNo.y, 0, 0, 1.0);\n  } \n  else {\n    gl_FragColor = texture2D(u_image, v_displaced);\n  }\n}\n"
});

;require.register("sprite/texture.vert", function(exports, require, module) {
module.exports = "// texture.vert\n\nattribute vec3 a_position;\nattribute vec2 a_texCoord;\n\nuniform   vec2 u_resolution;\n\nvarying   vec2 v_texCoord;\n\nvoid main()\n{\n  vec2 zeroToOne = a_position.xy / u_resolution;\n  vec2 zeroToTwo = zeroToOne * 2.0;\n  vec2 clipSpace = zeroToTwo - 1.0;\n\n  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n  v_texCoord  = a_texCoord;\n}\n"
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

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Map = void 0;
var _SpriteSheet = require("../sprite/SpriteSheet");
var _Injectable = require("../inject/Injectable");
var _Bindable = require("curvature/base/Bindable");
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
var Map = exports.Map = /*#__PURE__*/function (_Injectable$inject) {
  function Map() {
    var _this;
    _classCallCheck(this, Map);
    _this = _callSuper(this, Map);
    _this[_Bindable.Bindable.Prevent] = true;
    _this.tiles = {};
    return _this;
  }
  _inherits(Map, _Injectable$inject);
  return _createClass(Map, [{
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
        return [
        // this.SpriteSheet.getFrame('floorTile.png')
        this.SpriteSheet.getFrame('box_face.png')];
      }
      return [this.SpriteSheet.getFrame('floorTile.png')
      // this.SpriteSheet.getFrame('box_face.png')
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
      this.tiles = JSON.parse(input);

      // console.log(JSON.parse(input));
    }
  }]);
}(_Injectable.Injectable.inject({
  SpriteSheet: _SpriteSheet.SpriteSheet
})); // {"-2,11":"lava_center_middle.png","-1,11":"lava_center_middle.png","0,11":"lava_center_middle.png"}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9CYWcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL0RvbS5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9NaXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1RhZy5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9VdWlkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzIiwiYXBwL0NvbmZpZy5qcyIsImFwcC9nbDJkL0dsMmQuanMiLCJhcHAvaG9tZS9WaWV3LmpzIiwiYXBwL2hvbWUvdmlldy50bXAuaHRtbCIsImFwcC9pbml0aWFsaXplLmpzIiwiYXBwL2luamVjdC9Db250YWluZXIuanMiLCJhcHAvaW5qZWN0L0luamVjdGFibGUuanMiLCJhcHAvaW5qZWN0L1NpbmdsZS5qcyIsImFwcC9tb2RlbC9Db250cm9sbGVyLmpzIiwiYXBwL21vZGVsL0VudGl0eS5qcyIsImFwcC9vdmVybGF5L292ZXJsYXkuZnJhZyIsImFwcC9vdmVybGF5L292ZXJsYXkudmVydCIsImFwcC9zcHJpdGUvQmFja2dyb3VuZC5qcyIsImFwcC9zcHJpdGUvQ2FtZXJhLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGUuanMiLCJhcHAvc3ByaXRlL1Nwcml0ZUJvYXJkLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGVTaGVldC5qcyIsImFwcC9zcHJpdGUvU3VyZmFjZS5qcyIsImFwcC9zcHJpdGUvVGV4dHVyZUJhbmsuanMiLCJhcHAvc3ByaXRlL3RleHR1cmUuZnJhZyIsImFwcC9zcHJpdGUvdGV4dHVyZS52ZXJ0IiwiYXBwL3VpL0NvbnRyb2xsZXIuanMiLCJhcHAvdWkvTWFwRWRpdG9yLmpzIiwiYXBwL3VpL2NvbnRyb2xsZXIudG1wLmh0bWwiLCJhcHAvdWkvbWFwRWRpdG9yLnRtcC5odG1sIiwiYXBwL3dvcmxkL0Zsb29yLmpzIiwiYXBwL3dvcmxkL01hcC5qcyIsIm5vZGVfbW9kdWxlcy9hdXRvLXJlbG9hZC1icnVuY2gvdmVuZG9yL2F1dG8tcmVsb2FkLmpzIl0sIm5hbWVzIjpbIkNvbmZpZyIsImV4cG9ydHMiLCJfY3JlYXRlQ2xhc3MiLCJfY2xhc3NDYWxsQ2hlY2siLCJ0aXRsZSIsIkdsMmQiLCJlbGVtZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY29udGV4dCIsImdldENvbnRleHQiLCJzY3JlZW5TY2FsZSIsInpvb21MZXZlbCIsImtleSIsInZhbHVlIiwiY2xlYW51cCIsImRlbGV0ZVByb2dyYW0iLCJwcm9ncmFtIiwiY3JlYXRlU2hhZGVyIiwibG9jYXRpb24iLCJleHRlbnNpb24iLCJzdWJzdHJpbmciLCJsYXN0SW5kZXhPZiIsInR5cGUiLCJ0b1VwcGVyQ2FzZSIsIlZFUlRFWF9TSEFERVIiLCJGUkFHTUVOVF9TSEFERVIiLCJzaGFkZXIiLCJzb3VyY2UiLCJyZXF1aXJlIiwic2hhZGVyU291cmNlIiwiY29tcGlsZVNoYWRlciIsInN1Y2Nlc3MiLCJnZXRTaGFkZXJQYXJhbWV0ZXIiLCJDT01QSUxFX1NUQVRVUyIsImNvbnNvbGUiLCJlcnJvciIsImdldFNoYWRlckluZm9Mb2ciLCJkZWxldGVTaGFkZXIiLCJjcmVhdGVQcm9ncmFtIiwidmVydGV4U2hhZGVyIiwiZnJhZ21lbnRTaGFkZXIiLCJhdHRhY2hTaGFkZXIiLCJsaW5rUHJvZ3JhbSIsImRldGFjaFNoYWRlciIsImdldFByb2dyYW1QYXJhbWV0ZXIiLCJMSU5LX1NUQVRVUyIsImdldFByb2dyYW1JbmZvTG9nIiwiX1ZpZXciLCJfS2V5Ym9hcmQiLCJfQmFnIiwiX0NvbmZpZyIsIl9NYXAiLCJfU3ByaXRlU2hlZXQiLCJfU3ByaXRlQm9hcmQiLCJfQ29udHJvbGxlciIsIl9NYXBFZGl0b3IiLCJfRW50aXR5IiwiX0NhbWVyYSIsIl9Db250cm9sbGVyMiIsIl9TcHJpdGUiLCJhIiwibiIsIlR5cGVFcnJvciIsIl9kZWZpbmVQcm9wZXJ0aWVzIiwiZSIsInIiLCJ0IiwibGVuZ3RoIiwibyIsImVudW1lcmFibGUiLCJjb25maWd1cmFibGUiLCJ3cml0YWJsZSIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiX3RvUHJvcGVydHlLZXkiLCJwcm90b3R5cGUiLCJpIiwiX3RvUHJpbWl0aXZlIiwiX3R5cGVvZiIsIlN5bWJvbCIsInRvUHJpbWl0aXZlIiwiY2FsbCIsIlN0cmluZyIsIk51bWJlciIsIl9jYWxsU3VwZXIiLCJfZ2V0UHJvdG90eXBlT2YiLCJfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybiIsIl9pc05hdGl2ZVJlZmxlY3RDb25zdHJ1Y3QiLCJSZWZsZWN0IiwiY29uc3RydWN0IiwiY29uc3RydWN0b3IiLCJhcHBseSIsIl9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQiLCJSZWZlcmVuY2VFcnJvciIsIkJvb2xlYW4iLCJ2YWx1ZU9mIiwic2V0UHJvdG90eXBlT2YiLCJnZXRQcm90b3R5cGVPZiIsImJpbmQiLCJfX3Byb3RvX18iLCJfaW5oZXJpdHMiLCJjcmVhdGUiLCJfc2V0UHJvdG90eXBlT2YiLCJBcHBsaWNhdGlvbiIsIm9uU2NyZWVuSm95UGFkIiwiT25TY3JlZW5Kb3lQYWQiLCJrZXlib2FyZCIsIktleWJvYXJkIiwiZ2V0IiwiVmlldyIsIl9CYXNlVmlldyIsImFyZ3MiLCJfdGhpcyIsIndpbmRvdyIsInNtUHJvZmlsaW5nIiwidGVtcGxhdGUiLCJyb3V0ZXMiLCJlbnRpdGllcyIsIkJhZyIsInNwZWVkIiwibWF4U3BlZWQiLCJjb250cm9sbGVyIiwiZnBzIiwic3BzIiwiY2FtWCIsImNhbVkiLCJmcmFtZUxvY2siLCJzaW11bGF0aW9uTG9jayIsInNob3dFZGl0b3IiLCJsaXN0ZW5pbmciLCJrZXlzIiwiYmluZFRvIiwidiIsImsiLCJkIiwibWFwIiwic3ByaXRlQm9hcmQiLCJ1bnNlbGVjdCIsInNwcml0ZVNoZWV0IiwiU3ByaXRlU2hlZXQiLCJXb3JsZE1hcCIsIm1hcEVkaXRvciIsIk1hcEVkaXRvciIsIm9uUmVuZGVyZWQiLCJfdGhpczIiLCJTcHJpdGVCb2FyZCIsInRhZ3MiLCJjYW52YXMiLCJlbnRpdHkiLCJFbnRpdHkiLCJzcHJpdGUiLCJTcHJpdGUiLCJzcmMiLCJ1bmRlZmluZWQiLCJDb250cm9sbGVyIiwiY2FtZXJhIiwiQ2FtZXJhIiwiYWRkIiwic3ByaXRlcyIsImZvbGxvd2luZyIsInpvb20iLCJzZWxlY3RlZCIsImdsb2JhbFgiLCJzdGFydEdsb2JhbFgiLCJpaSIsIl9yZWYiLCJqIiwic3RhcnRHbG9iYWxZIiwiamoiLCJnbG9iYWxZIiwiX3JlZjIiLCJzZXRUaWxlIiwicmVzaXplIiwicCIsImxvY2FsWCIsInNlbGVjdCIsIndhaXQiLCJhZGRFdmVudExpc3RlbmVyIiwiZlRoZW4iLCJzVGhlbiIsImZTYW1wbGVzIiwic1NhbXBsZXMiLCJtYXhTYW1wbGVzIiwic2ltdWxhdGUiLCJub3ciLCJkZWx0YSIsInVwZGF0ZSIsInZhbHVlcyIsIml0ZW1zIiwiX3NwcyIsInB1c2giLCJzaGlmdCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsImRyYXciLCJ0b0ZpeGVkIiwieCIsInkiLCJnbDJkIiwiYm9keSIsImNsaWVudFdpZHRoIiwicGVyZm9ybWFuY2UiLCJzZXRJbnRlcnZhbCIsImNvbmNhdCIsInJlZHVjZSIsImIiLCJwYWRTdGFydCIsIndpZHRoIiwiaGVpZ2h0IiwiY2xpZW50SGVpZ2h0IiwicndpZHRoIiwiTWF0aCIsInRydW5jIiwicmhlaWdodCIsIm9sZFNjYWxlIiwic2Nyb2xsIiwiZXZlbnQiLCJkZWx0YVkiLCJtYXgiLCJtaW4iLCJzdGVwIiwiQmFzZVZpZXciLCJfUm91dGVyIiwiUHJveHkiLCJ2aWV3IiwiUm91dGVyIiwibGlzdGVuIiwicmVuZGVyIiwiX0luamVjdGFibGUyIiwiQ29udGFpbmVyIiwiX0luamVjdGFibGUiLCJhcmd1bWVudHMiLCJpbmplY3QiLCJpbmplY3Rpb25zIiwiYXNzaWduIiwiSW5qZWN0YWJsZSIsImNsYXNzZXMiLCJvYmplY3RzIiwibmFtZSIsImluamVjdGlvbiIsInRlc3QiLCJpbnN0YW5jZSIsIkVycm9yIiwiZXhpc3RpbmdJbmplY3Rpb25zIiwiX2NsYXNzIiwiU2luZ2xlIiwicmFuZG9tIiwic2luZ2xlIiwiX0JpbmRhYmxlIiwiaXRlcmF0b3IiLCJfZGVmaW5lUHJvcGVydHkiLCJCaW5kYWJsZSIsIm1ha2VCaW5kYWJsZSIsImtleVByZXNzIiwia2V5UmVsZWFzZSIsImF4aXMiLCJwcmV2IiwidHJpZ2dlcnMiLCJkaXJlY3Rpb24iLCJzdGF0ZSIsInhBeGlzIiwieUF4aXMiLCJsb2ciLCJjZWlsIiwiZmxvb3IiLCJob3Jpem9udGFsIiwiYWJzIiwiZnJhbWVzIiwic2V0RnJhbWVzIiwiZGVzdHJveSIsIl9TdXJmYWNlIiwiQmFja2dyb3VuZCIsImxheWVyIiwicGFuZXMiLCJwYW5lc1hZIiwibWF4UGFuZXMiLCJ0aWxlV2lkdGgiLCJ0aWxlSGVpZ2h0Iiwic3VyZmFjZVdpZHRoIiwic3VyZmFjZUhlaWdodCIsInJlbmRlclBhbmUiLCJmb3JjZVVwZGF0ZSIsInBhbmUiLCJwYW5lWCIsInBhbmVZIiwiU3VyZmFjZSIsImNlbnRlclgiLCJjZW50ZXJZIiwicmFuZ2UiLCJmb3JFYWNoIiwicG9wIiwiUHJldmVudCIsInoiLCJzY2FsZSIsImZyYW1lRGVsYXkiLCJjdXJyZW50RGVsYXkiLCJjdXJyZW50RnJhbWUiLCJjdXJyZW50RnJhbWVzIiwibW92aW5nIiwiUklHSFQiLCJET1dOIiwiTEVGVCIsIlVQIiwiRUFTVCIsIlNPVVRIIiwiV0VTVCIsIk5PUlRIIiwic3RhbmRpbmciLCJ3YWxraW5nIiwiZ2wiLCJ0ZXh0dXJlIiwiY3JlYXRlVGV4dHVyZSIsImJpbmRUZXh0dXJlIiwiVEVYVFVSRV8yRCIsInBhcnNlSW50IiwidGV4SW1hZ2UyRCIsIlJHQkEiLCJVTlNJR05FRF9CWVRFIiwiVWludDhBcnJheSIsInJlYWR5IiwidGhlbiIsInNoZWV0IiwiZnJhbWUiLCJnZXRGcmFtZSIsImxvYWRUZXh0dXJlIiwiaW1hZ2UiLCJiaW5kQnVmZmVyIiwiQVJSQVlfQlVGRkVSIiwidGV4Q29vcmRCdWZmZXIiLCJidWZmZXJEYXRhIiwiRmxvYXQzMkFycmF5IiwiU1RBVElDX0RSQVciLCJzZXRSZWN0YW5nbGUiLCJkcmF3QXJyYXlzIiwiVFJJQU5HTEVTIiwiZnJhbWVTZWxlY3RvciIsImZyYW1lc0lkIiwiam9pbiIsImdldEZyYW1lcyIsIlByb21pc2UiLCJhbGwiLCJwb3NpdGlvbkJ1ZmZlciIsIngxIiwieTEiLCJ4MiIsInkyIiwicyIsIlNUUkVBTV9EUkFXIiwiaW1hZ2VTcmMiLCJwcm9taXNlcyIsImxvYWRJbWFnZSIsInRleFBhcmFtZXRlcmkiLCJURVhUVVJFX1dSQVBfUyIsIkNMQU1QX1RPX0VER0UiLCJURVhUVVJFX1dSQVBfVCIsIlRFWFRVUkVfTUlOX0ZJTFRFUiIsIk5FQVJFU1QiLCJURVhUVVJFX01BR19GSUxURVIiLCJhY2NlcHQiLCJyZWplY3QiLCJJbWFnZSIsIl9CYWNrZ3JvdW5kIiwiX0dsMmQiLCJtb3VzZSIsImNsaWNrWCIsImNsaWNrWSIsImJsZW5kRnVuYyIsIlNSQ19BTFBIQSIsIk9ORV9NSU5VU19TUkNfQUxQSEEiLCJlbmFibGUiLCJCTEVORCIsIm92ZXJsYXlQcm9ncmFtIiwidXNlUHJvZ3JhbSIsInBvc2l0aW9uTG9jYXRpb24iLCJnZXRBdHRyaWJMb2NhdGlvbiIsInRleENvb3JkTG9jYXRpb24iLCJjcmVhdGVCdWZmZXIiLCJyZXNvbHV0aW9uTG9jYXRpb24iLCJnZXRVbmlmb3JtTG9jYXRpb24iLCJ0aWxlUG9zTG9jYXRpb24iLCJjb2xvckxvY2F0aW9uIiwib3ZlcmxheUxvY2F0aW9uIiwib3ZlcmxheVJlc29sdXRpb24iLCJvdmVybGF5Q29sb3IiLCJlbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSIsInZlcnRleEF0dHJpYlBvaW50ZXIiLCJGTE9BVCIsImNsaWVudFgiLCJjbGllbnRZIiwibG9jYWxZIiwiYmFja2dyb3VuZCIsInciLCJBcnJheSIsImZpbGwiLCJiYXJyZWwiLCJiaW5kRnJhbWVidWZmZXIiLCJGUkFNRUJVRkZFUiIsInZpZXdwb3J0IiwidW5pZm9ybTJmIiwidGltZSIsInNvcnQiLCJ0aW1lRW5kIiwiaW1hZ2VVcmwiLCJib3hlc1VybCIsInZlcnRpY2VzIiwicmVxdWVzdCIsIlJlcXVlc3QiLCJzaGVldExvYWRlciIsImZldGNoIiwicmVzcG9uc2UiLCJqc29uIiwiYm94ZXMiLCJpbWFnZUxvYWRlciIsIm9ubG9hZCIsInByb2Nlc3NJbWFnZSIsIndpbGxSZWFkRnJlcXVlbnRseSIsImRyYXdJbWFnZSIsImZyYW1lUHJvbWlzZXMiLCJfbG9vcCIsInN1YkNhbnZhcyIsImgiLCJzdWJDb250ZXh0IiwicHV0SW1hZ2VEYXRhIiwiZ2V0SW1hZ2VEYXRhIiwidGV4dCIsImZpbGxTdHlsZSIsImNvbG9yIiwiZm9udCIsInRleHRBbGlnbiIsImZpbGxUZXh0IiwidG9CbG9iIiwiYmxvYiIsImZpbGVuYW1lIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiZ2V0VmVydGljZXMiLCJfdGhpczMiLCJpc0FycmF5IiwiZ2V0RnJhbWVzQnlQcmVmaXgiLCJwcmVmaXgiLCJ0ZXh0dXJlUHJvbWlzZXMiLCJSRVBFQVQiLCJpbWFnZVByb21pc2VzIiwieFNpemUiLCJ5U2l6ZSIsInhPZmZzZXQiLCJ5T2Zmc2V0IiwidGV4VmVydGljZXMiLCJzdWJUZXh0dXJlcyIsImJ1aWxkVGlsZXMiLCJmcmFtZUJ1ZmZlciIsImNyZWF0ZUZyYW1lYnVmZmVyIiwiZnJhbWVidWZmZXJUZXh0dXJlMkQiLCJDT0xPUl9BVFRBQ0hNRU5UMCIsInNpemUiLCJvZmZzZXRYIiwib2Zmc2V0WSIsImdldFRpbGUiLCJhc3NlbWJsZSIsImNsZWFyQ29sb3IiLCJjbGVhciIsIkNPTE9SX0JVRkZFUl9CSVQiLCJERVBUSF9CVUZGRVJfQklUIiwidW5pZm9ybTRmIiwidW5pZm9ybTNmIiwiVGV4dHVyZUJhbmsiLCJfVmlldzIiLCJkcmFnU3RhcnQiLCJkcmFnZ2luZyIsIm1vdmVTdGljayIsImRyb3BTdGljayIsImRyYWdTdGljayIsInBvcyIsInByZXZlbnREZWZhdWx0IiwidG91Y2hlcyIsInh4IiwieXkiLCJsaW1pdCIsInRpbGVzIiwic2VsZWN0ZWRHcmFwaGljIiwibXVsdGlTZWxlY3QiLCJzZWxlY3Rpb24iLCJzZWxlY3RlZEltYWdlIiwic2VsZWN0R3JhcGhpYyIsInNlbGVjdGVkSW1hZ2VzIiwiRmxvb3IiLCJNYXAiLCJfSW5qZWN0YWJsZSRpbmplY3QiLCJzcGxpdCIsInNlY29uZCIsImV4cG9ydCIsIkpTT04iLCJzdHJpbmdpZnkiLCJpbXBvcnQiLCJpbnB1dCIsInBhcnNlIiwiV2ViU29ja2V0IiwiTW96V2ViU29ja2V0IiwiYnIiLCJicnVuY2giLCJhciIsImRpc2FibGVkIiwiX2FyIiwiY2FjaGVCdXN0ZXIiLCJ1cmwiLCJkYXRlIiwicm91bmQiLCJEYXRlIiwidG9TdHJpbmciLCJyZXBsYWNlIiwiaW5kZXhPZiIsImJyb3dzZXIiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJ0b0xvd2VyQ2FzZSIsImZvcmNlUmVwYWludCIsInJlbG9hZGVycyIsInBhZ2UiLCJyZWxvYWQiLCJzdHlsZXNoZWV0Iiwic2xpY2UiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZmlsdGVyIiwibGluayIsInZhbCIsImdldEF0dHJpYnV0ZSIsImhyZWYiLCJzZXRUaW1lb3V0Iiwib2Zmc2V0SGVpZ2h0IiwiamF2YXNjcmlwdCIsInNjcmlwdHMiLCJ0ZXh0U2NyaXB0cyIsInNjcmlwdCIsInNyY1NjcmlwdHMiLCJsb2FkZWQiLCJvbkxvYWQiLCJldmFsIiwicmVtb3ZlIiwibmV3U2NyaXB0IiwiYXN5bmMiLCJoZWFkIiwiYXBwZW5kQ2hpbGQiLCJwb3J0IiwiaG9zdCIsInNlcnZlciIsImhvc3RuYW1lIiwiY29ubmVjdCIsImNvbm5lY3Rpb24iLCJvbm1lc3NhZ2UiLCJtZXNzYWdlIiwiZGF0YSIsInJlbG9hZGVyIiwib25lcnJvciIsInJlYWR5U3RhdGUiLCJjbG9zZSIsIm9uY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QyxTQUFTLENBQUNDLElBQUk7TUFDbkRrQyxRQUFRLENBQUMsQ0FBQztJQUNaLENBQUM7SUFDREosVUFBVSxDQUFDSyxPQUFPLEdBQUcsWUFBVTtNQUM3QixJQUFJTCxVQUFVLENBQUNNLFVBQVUsRUFBRU4sVUFBVSxDQUFDTyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0RQLFVBQVUsQ0FBQ1EsT0FBTyxHQUFHLFlBQVU7TUFDN0J6YixNQUFNLENBQUM2WixVQUFVLENBQUNtQixRQUFPLEVBQUUsSUFBSSxDQUFDO0lBQ2xDLENBQUM7RUFDSCxDQUFDO0VBQ0RBLFFBQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxFQUFFLENBQUM7QUFDSiIsImZpbGUiOiJkb2NzL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0JhZy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQmFnID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIF9NaXhpbiA9IHJlcXVpcmUoXCIuL01peGluXCIpO1xudmFyIF9FdmVudFRhcmdldE1peGluID0gcmVxdWlyZShcIi4uL21peGluL0V2ZW50VGFyZ2V0TWl4aW5cIik7XG52YXIgdG9JZCA9IGludCA9PiBOdW1iZXIoaW50KTtcbnZhciBmcm9tSWQgPSBpZCA9PiBwYXJzZUludChpZCk7XG52YXIgTWFwcGVkID0gU3ltYm9sKCdNYXBwZWQnKTtcbnZhciBIYXMgPSBTeW1ib2woJ0hhcycpO1xudmFyIEFkZCA9IFN5bWJvbCgnQWRkJyk7XG52YXIgUmVtb3ZlID0gU3ltYm9sKCdSZW1vdmUnKTtcbnZhciBEZWxldGUgPSBTeW1ib2woJ0RlbGV0ZScpO1xuY2xhc3MgQmFnIGV4dGVuZHMgX01peGluLk1peGluLndpdGgoX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbikge1xuICBjb25zdHJ1Y3RvcihjaGFuZ2VDYWxsYmFjayA9IHVuZGVmaW5lZCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5jaGFuZ2VDYWxsYmFjayA9IGNoYW5nZUNhbGxiYWNrO1xuICAgIHRoaXMuY29udGVudCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLmxpc3QgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKFtdKTtcbiAgICB0aGlzLm1ldGEgPSBTeW1ib2woJ21ldGEnKTtcbiAgICB0aGlzLnR5cGUgPSB1bmRlZmluZWQ7XG4gIH1cbiAgaGFzKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLmhhcyhpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbSGFzXShpdGVtKTtcbiAgfVxuICBbSGFzXShpdGVtKSB7XG4gICAgcmV0dXJuIHRoaXMuY29udGVudC5oYXMoaXRlbSk7XG4gIH1cbiAgYWRkKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLmFkZChpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbQWRkXShpdGVtKTtcbiAgfVxuICBbQWRkXShpdGVtKSB7XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCB8fCAhKGl0ZW0gaW5zdGFuY2VvZiBPYmplY3QpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgb2JqZWN0cyBtYXkgYmUgYWRkZWQgdG8gQmFncy4nKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudHlwZSAmJiAhKGl0ZW0gaW5zdGFuY2VvZiB0aGlzLnR5cGUpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRoaXMudHlwZSwgaXRlbSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9ubHkgb2JqZWN0cyBvZiB0eXBlICR7dGhpcy50eXBlfSBtYXkgYmUgYWRkZWQgdG8gdGhpcyBCYWcuYCk7XG4gICAgfVxuICAgIGl0ZW0gPSBfQmluZGFibGUuQmluZGFibGUubWFrZShpdGVtKTtcbiAgICBpZiAodGhpcy5jb250ZW50LmhhcyhpdGVtKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgYWRkaW5nID0gbmV3IEN1c3RvbUV2ZW50KCdhZGRpbmcnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KGFkZGluZykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGlkID0gdG9JZCh0aGlzLmN1cnJlbnQrKyk7XG4gICAgdGhpcy5jb250ZW50LnNldChpdGVtLCBpZCk7XG4gICAgdGhpcy5saXN0W2lkXSA9IGl0ZW07XG4gICAgaWYgKHRoaXMuY2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2soaXRlbSwgdGhpcy5tZXRhLCBCYWcuSVRFTV9BRERFRCwgaWQpO1xuICAgIH1cbiAgICB2YXIgYWRkID0gbmV3IEN1c3RvbUV2ZW50KCdhZGRlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtLFxuICAgICAgICBpZFxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChhZGQpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5zaXplO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICByZW1vdmUoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0ucmVtb3ZlKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tSZW1vdmVdKGl0ZW0pO1xuICB9XG4gIFtSZW1vdmVdKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkIHx8ICEoaXRlbSBpbnN0YW5jZW9mIE9iamVjdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBvYmplY3RzIG1heSBiZSByZW1vdmVkIGZyb20gQmFncy4nKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudHlwZSAmJiAhKGl0ZW0gaW5zdGFuY2VvZiB0aGlzLnR5cGUpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRoaXMudHlwZSwgaXRlbSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9ubHkgb2JqZWN0cyBvZiB0eXBlICR7dGhpcy50eXBlfSBtYXkgYmUgcmVtb3ZlZCBmcm9tIHRoaXMgQmFnLmApO1xuICAgIH1cbiAgICBpdGVtID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoaXRlbSk7XG4gICAgaWYgKCF0aGlzLmNvbnRlbnQuaGFzKGl0ZW0pKSB7XG4gICAgICBpZiAodGhpcy5jaGFuZ2VDYWxsYmFjaykge1xuICAgICAgICB0aGlzLmNoYW5nZUNhbGxiYWNrKGl0ZW0sIHRoaXMubWV0YSwgMCwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIHJlbW92aW5nID0gbmV3IEN1c3RvbUV2ZW50KCdyZW1vdmluZycsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQocmVtb3ZpbmcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpZCA9IHRoaXMuY29udGVudC5nZXQoaXRlbSk7XG4gICAgZGVsZXRlIHRoaXMubGlzdFtpZF07XG4gICAgdGhpcy5jb250ZW50LmRlbGV0ZShpdGVtKTtcbiAgICBpZiAodGhpcy5jaGFuZ2VDYWxsYmFjaykge1xuICAgICAgdGhpcy5jaGFuZ2VDYWxsYmFjayhpdGVtLCB0aGlzLm1ldGEsIEJhZy5JVEVNX1JFTU9WRUQsIGlkKTtcbiAgICB9XG4gICAgdmFyIHJlbW92ZSA9IG5ldyBDdXN0b21FdmVudCgncmVtb3ZlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtLFxuICAgICAgICBpZFxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChyZW1vdmUpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5zaXplO1xuICAgIHJldHVybiBpdGVtO1xuICB9XG4gIGRlbGV0ZShpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5kZWxldGUoaXRlbSk7XG4gICAgfVxuICAgIHRoaXNbRGVsZXRlXShpdGVtKTtcbiAgfVxuICBbRGVsZXRlXShpdGVtKSB7XG4gICAgdGhpcy5yZW1vdmUoaXRlbSk7XG4gIH1cbiAgbWFwKG1hcHBlciA9IHggPT4geCwgZmlsdGVyID0geCA9PiB4KSB7XG4gICAgdmFyIG1hcHBlZEl0ZW1zID0gbmV3IFdlYWtNYXAoKTtcbiAgICB2YXIgbWFwcGVkQmFnID0gbmV3IEJhZygpO1xuICAgIG1hcHBlZEJhZ1tNYXBwZWRdID0gdGhpcztcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZGVkJywgZXZlbnQgPT4ge1xuICAgICAgdmFyIGl0ZW0gPSBldmVudC5kZXRhaWwuaXRlbTtcbiAgICAgIGlmICghZmlsdGVyKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChtYXBwZWRJdGVtcy5oYXMoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIG1hcHBlZCA9IG1hcHBlcihpdGVtKTtcbiAgICAgIG1hcHBlZEl0ZW1zLnNldChpdGVtLCBtYXBwZWQpO1xuICAgICAgbWFwcGVkQmFnW0FkZF0obWFwcGVkKTtcbiAgICB9KTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3JlbW92ZWQnLCBldmVudCA9PiB7XG4gICAgICB2YXIgaXRlbSA9IGV2ZW50LmRldGFpbC5pdGVtO1xuICAgICAgaWYgKCFtYXBwZWRJdGVtcy5oYXMoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIG1hcHBlZCA9IG1hcHBlZEl0ZW1zLmdldChpdGVtKTtcbiAgICAgIG1hcHBlZEl0ZW1zLmRlbGV0ZShpdGVtKTtcbiAgICAgIG1hcHBlZEJhZ1tSZW1vdmVdKG1hcHBlZCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1hcHBlZEJhZztcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb250ZW50LnNpemU7XG4gIH1cbiAgaXRlbXMoKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jb250ZW50LmVudHJpZXMoKSkubWFwKGVudHJ5ID0+IGVudHJ5WzBdKTtcbiAgfVxufVxuZXhwb3J0cy5CYWcgPSBCYWc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmFnLCAnSVRFTV9BRERFRCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogMVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmFnLCAnSVRFTV9SRU1PVkVEJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiAtMVxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZS5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQmluZGFibGUgPSB2b2lkIDA7XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkoZSwgciwgdCkgeyByZXR1cm4gKHIgPSBfdG9Qcm9wZXJ0eUtleShyKSkgaW4gZSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCByLCB7IHZhbHVlOiB0LCBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwIH0pIDogZVtyXSA9IHQsIGU7IH1cbmZ1bmN0aW9uIF90b1Byb3BlcnR5S2V5KHQpIHsgdmFyIGkgPSBfdG9QcmltaXRpdmUodCwgXCJzdHJpbmdcIik7IHJldHVybiBcInN5bWJvbFwiID09IHR5cGVvZiBpID8gaSA6IGkgKyBcIlwiOyB9XG5mdW5jdGlvbiBfdG9QcmltaXRpdmUodCwgcikgeyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgdCB8fCAhdCkgcmV0dXJuIHQ7IHZhciBlID0gdFtTeW1ib2wudG9QcmltaXRpdmVdOyBpZiAodm9pZCAwICE9PSBlKSB7IHZhciBpID0gZS5jYWxsKHQsIHIgfHwgXCJkZWZhdWx0XCIpOyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgaSkgcmV0dXJuIGk7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJAQHRvUHJpbWl0aXZlIG11c3QgcmV0dXJuIGEgcHJpbWl0aXZlIHZhbHVlLlwiKTsgfSByZXR1cm4gKFwic3RyaW5nXCIgPT09IHIgPyBTdHJpbmcgOiBOdW1iZXIpKHQpOyB9XG52YXIgUmVmID0gU3ltYm9sKCdyZWYnKTtcbnZhciBPcmlnaW5hbCA9IFN5bWJvbCgnb3JpZ2luYWwnKTtcbnZhciBEZWNrID0gU3ltYm9sKCdkZWNrJyk7XG52YXIgQmluZGluZyA9IFN5bWJvbCgnYmluZGluZycpO1xudmFyIFN1YkJpbmRpbmcgPSBTeW1ib2woJ3N1YkJpbmRpbmcnKTtcbnZhciBCaW5kaW5nQWxsID0gU3ltYm9sKCdiaW5kaW5nQWxsJyk7XG52YXIgSXNCaW5kYWJsZSA9IFN5bWJvbCgnaXNCaW5kYWJsZScpO1xudmFyIFdyYXBwaW5nID0gU3ltYm9sKCd3cmFwcGluZycpO1xudmFyIE5hbWVzID0gU3ltYm9sKCdOYW1lcycpO1xudmFyIEV4ZWN1dGluZyA9IFN5bWJvbCgnZXhlY3V0aW5nJyk7XG52YXIgU3RhY2sgPSBTeW1ib2woJ3N0YWNrJyk7XG52YXIgT2JqU3ltYm9sID0gU3ltYm9sKCdvYmplY3QnKTtcbnZhciBXcmFwcGVkID0gU3ltYm9sKCd3cmFwcGVkJyk7XG52YXIgVW53cmFwcGVkID0gU3ltYm9sKCd1bndyYXBwZWQnKTtcbnZhciBHZXRQcm90byA9IFN5bWJvbCgnZ2V0UHJvdG8nKTtcbnZhciBPbkdldCA9IFN5bWJvbCgnb25HZXQnKTtcbnZhciBPbkFsbEdldCA9IFN5bWJvbCgnb25BbGxHZXQnKTtcbnZhciBCaW5kQ2hhaW4gPSBTeW1ib2woJ2JpbmRDaGFpbicpO1xudmFyIERlc2NyaXB0b3JzID0gU3ltYm9sKCdEZXNjcmlwdG9ycycpO1xudmFyIEJlZm9yZSA9IFN5bWJvbCgnQmVmb3JlJyk7XG52YXIgQWZ0ZXIgPSBTeW1ib2woJ0FmdGVyJyk7XG52YXIgTm9HZXR0ZXJzID0gU3ltYm9sKCdOb0dldHRlcnMnKTtcbnZhciBQcmV2ZW50ID0gU3ltYm9sKCdQcmV2ZW50Jyk7XG52YXIgVHlwZWRBcnJheSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihJbnQ4QXJyYXkpO1xudmFyIFNldEl0ZXJhdG9yID0gU2V0LnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdO1xudmFyIE1hcEl0ZXJhdG9yID0gTWFwLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdO1xudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG52YXIgaXNFeGNsdWRlZCA9IG9iamVjdCA9PiB0eXBlb2Ygd2luLk1hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTWFwIHx8IHR5cGVvZiB3aW4uU2V0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5TZXQgfHwgdHlwZW9mIHdpbi5Ob2RlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5Ob2RlIHx8IHR5cGVvZiB3aW4uV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uV2Vha01hcCB8fCB0eXBlb2Ygd2luLkxvY2F0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5Mb2NhdGlvbiB8fCB0eXBlb2Ygd2luLlN0b3JhZ2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlN0b3JhZ2UgfHwgdHlwZW9mIHdpbi5XZWFrU2V0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5XZWFrU2V0IHx8IHR5cGVvZiB3aW4uQXJyYXlCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkFycmF5QnVmZmVyIHx8IHR5cGVvZiB3aW4uUHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUHJvbWlzZSB8fCB0eXBlb2Ygd2luLkZpbGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkZpbGUgfHwgdHlwZW9mIHdpbi5FdmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uRXZlbnQgfHwgdHlwZW9mIHdpbi5DdXN0b21FdmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uQ3VzdG9tRXZlbnQgfHwgdHlwZW9mIHdpbi5HYW1lcGFkID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5HYW1lcGFkIHx8IHR5cGVvZiB3aW4uUmVzaXplT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlJlc2l6ZU9ic2VydmVyIHx8IHR5cGVvZiB3aW4uTXV0YXRpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTXV0YXRpb25PYnNlcnZlciB8fCB0eXBlb2Ygd2luLlBlcmZvcm1hbmNlT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlBlcmZvcm1hbmNlT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5JbnRlcnNlY3Rpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5JREJDdXJzb3IgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkN1cnNvciB8fCB0eXBlb2Ygd2luLklEQkN1cnNvcldpdGhWYWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCQ3Vyc29yV2l0aFZhbHVlIHx8IHR5cGVvZiB3aW4uSURCRGF0YWJhc2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkRhdGFiYXNlIHx8IHR5cGVvZiB3aW4uSURCRmFjdG9yeSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCRmFjdG9yeSB8fCB0eXBlb2Ygd2luLklEQkluZGV4ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJJbmRleCB8fCB0eXBlb2Ygd2luLklEQktleVJhbmdlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJLZXlSYW5nZSB8fCB0eXBlb2Ygd2luLklEQk9iamVjdFN0b3JlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJPYmplY3RTdG9yZSB8fCB0eXBlb2Ygd2luLklEQk9wZW5EQlJlcXVlc3QgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQk9wZW5EQlJlcXVlc3QgfHwgdHlwZW9mIHdpbi5JREJSZXF1ZXN0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJSZXF1ZXN0IHx8IHR5cGVvZiB3aW4uSURCVHJhbnNhY3Rpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQlRyYW5zYWN0aW9uIHx8IHR5cGVvZiB3aW4uSURCVmVyc2lvbkNoYW5nZUV2ZW50ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJWZXJzaW9uQ2hhbmdlRXZlbnQgfHwgdHlwZW9mIHdpbi5GaWxlU3lzdGVtRmlsZUhhbmRsZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uRmlsZVN5c3RlbUZpbGVIYW5kbGUgfHwgdHlwZW9mIHdpbi5SVENQZWVyQ29ubmVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUlRDUGVlckNvbm5lY3Rpb24gfHwgdHlwZW9mIHdpbi5TZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5TZXJ2aWNlV29ya2VyUmVnaXN0cmF0aW9uIHx8IHR5cGVvZiB3aW4uV2ViR0xUZXh0dXJlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5XZWJHTFRleHR1cmU7XG5jbGFzcyBCaW5kYWJsZSB7XG4gIHN0YXRpYyBpc0JpbmRhYmxlKG9iamVjdCkge1xuICAgIGlmICghb2JqZWN0IHx8ICFvYmplY3RbSXNCaW5kYWJsZV0gfHwgIW9iamVjdFtQcmV2ZW50XSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0W0lzQmluZGFibGVdID09PSBCaW5kYWJsZTtcbiAgfVxuICBzdGF0aWMgb25EZWNrKG9iamVjdCwga2V5KSB7XG4gICAgcmV0dXJuIG9iamVjdFtEZWNrXS5nZXQoa2V5KSB8fCBmYWxzZTtcbiAgfVxuICBzdGF0aWMgcmVmKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3RbUmVmXSB8fCBvYmplY3QgfHwgZmFsc2U7XG4gIH1cbiAgc3RhdGljIG1ha2VCaW5kYWJsZShvYmplY3QpIHtcbiAgICByZXR1cm4gdGhpcy5tYWtlKG9iamVjdCk7XG4gIH1cbiAgc3RhdGljIHNodWNrKG9yaWdpbmFsLCBzZWVuKSB7XG4gICAgc2VlbiA9IHNlZW4gfHwgbmV3IE1hcCgpO1xuICAgIHZhciBjbG9uZSA9IE9iamVjdC5jcmVhdGUoe30pO1xuICAgIGlmIChvcmlnaW5hbCBpbnN0YW5jZW9mIFR5cGVkQXJyYXkgfHwgb3JpZ2luYWwgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgdmFyIF9jbG9uZSA9IG9yaWdpbmFsLnNsaWNlKDApO1xuICAgICAgc2Vlbi5zZXQob3JpZ2luYWwsIF9jbG9uZSk7XG4gICAgICByZXR1cm4gX2Nsb25lO1xuICAgIH1cbiAgICB2YXIgcHJvcGVydGllcyA9IE9iamVjdC5rZXlzKG9yaWdpbmFsKTtcbiAgICBmb3IgKHZhciBpIGluIHByb3BlcnRpZXMpIHtcbiAgICAgIHZhciBpaSA9IHByb3BlcnRpZXNbaV07XG4gICAgICBpZiAoaWkuc3Vic3RyaW5nKDAsIDMpID09PSAnX19fJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBhbHJlYWR5Q2xvbmVkID0gc2Vlbi5nZXQob3JpZ2luYWxbaWldKTtcbiAgICAgIGlmIChhbHJlYWR5Q2xvbmVkKSB7XG4gICAgICAgIGNsb25lW2lpXSA9IGFscmVhZHlDbG9uZWQ7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9yaWdpbmFsW2lpXSA9PT0gb3JpZ2luYWwpIHtcbiAgICAgICAgc2Vlbi5zZXQob3JpZ2luYWxbaWldLCBjbG9uZSk7XG4gICAgICAgIGNsb25lW2lpXSA9IGNsb25lO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcmlnaW5hbFtpaV0gJiYgdHlwZW9mIG9yaWdpbmFsW2lpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFyIG9yaWdpbmFsUHJvcCA9IG9yaWdpbmFsW2lpXTtcbiAgICAgICAgaWYgKEJpbmRhYmxlLmlzQmluZGFibGUob3JpZ2luYWxbaWldKSkge1xuICAgICAgICAgIG9yaWdpbmFsUHJvcCA9IG9yaWdpbmFsW2lpXVtPcmlnaW5hbF07XG4gICAgICAgIH1cbiAgICAgICAgY2xvbmVbaWldID0gdGhpcy5zaHVjayhvcmlnaW5hbFByb3AsIHNlZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xvbmVbaWldID0gb3JpZ2luYWxbaWldO1xuICAgICAgfVxuICAgICAgc2Vlbi5zZXQob3JpZ2luYWxbaWldLCBjbG9uZVtpaV0pO1xuICAgIH1cbiAgICBpZiAoQmluZGFibGUuaXNCaW5kYWJsZShvcmlnaW5hbCkpIHtcbiAgICAgIGRlbGV0ZSBjbG9uZS5iaW5kVG87XG4gICAgICBkZWxldGUgY2xvbmUuaXNCb3VuZDtcbiAgICB9XG4gICAgcmV0dXJuIGNsb25lO1xuICB9XG4gIHN0YXRpYyBtYWtlKG9iamVjdCkge1xuICAgIGlmIChvYmplY3RbUHJldmVudF0pIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmICghb2JqZWN0IHx8ICFbJ2Z1bmN0aW9uJywgJ29iamVjdCddLmluY2x1ZGVzKHR5cGVvZiBvYmplY3QpKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoUmVmIGluIG9iamVjdCkge1xuICAgICAgcmV0dXJuIG9iamVjdFtSZWZdO1xuICAgIH1cbiAgICBpZiAob2JqZWN0W0lzQmluZGFibGVdKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoT2JqZWN0LmlzU2VhbGVkKG9iamVjdCkgfHwgT2JqZWN0LmlzRnJvemVuKG9iamVjdCkgfHwgIU9iamVjdC5pc0V4dGVuc2libGUob2JqZWN0KSB8fCBpc0V4Y2x1ZGVkKG9iamVjdCkpIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIElzQmluZGFibGUsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBCaW5kYWJsZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFJlZiwge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiBmYWxzZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIE9yaWdpbmFsLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogb2JqZWN0XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgRGVjaywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJpbmRpbmcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgU3ViQmluZGluZywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJpbmRpbmdBbGwsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBFeGVjdXRpbmcsIHtcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBXcmFwcGluZywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFN0YWNrLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCZWZvcmUsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBBZnRlciwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFdyYXBwZWQsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobmV3IE1hcCgpKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFVud3JhcHBlZCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhuZXcgTWFwKCkpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgRGVzY3JpcHRvcnMsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobmV3IE1hcCgpKVxuICAgIH0pO1xuICAgIHZhciBiaW5kVG8gPSAocHJvcGVydHksIGNhbGxiYWNrID0gbnVsbCwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgICB2YXIgYmluZFRvQWxsID0gZmFsc2U7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwcm9wZXJ0eSkpIHtcbiAgICAgICAgdmFyIGRlYmluZGVycyA9IHByb3BlcnR5Lm1hcChwID0+IGJpbmRUbyhwLCBjYWxsYmFjaywgb3B0aW9ucykpO1xuICAgICAgICByZXR1cm4gKCkgPT4gZGViaW5kZXJzLmZvckVhY2goZCA9PiBkKCkpO1xuICAgICAgfVxuICAgICAgaWYgKHByb3BlcnR5IGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrIHx8IHt9O1xuICAgICAgICBjYWxsYmFjayA9IHByb3BlcnR5O1xuICAgICAgICBiaW5kVG9BbGwgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuZGVsYXkgPj0gMCkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcERlbGF5Q2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMuZGVsYXkpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMudGhyb3R0bGUgPj0gMCkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcFRocm90dGxlQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMudGhyb3R0bGUpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMud2FpdCA+PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwV2FpdENhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLndhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuZnJhbWUpIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBGcmFtZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLmZyYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmlkbGUpIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBJZGxlQ2FsbGJhY2soY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGJpbmRUb0FsbCkge1xuICAgICAgICBvYmplY3RbQmluZGluZ0FsbF0uYWRkKGNhbGxiYWNrKTtcbiAgICAgICAgaWYgKCEoJ25vdycgaW4gb3B0aW9ucykgfHwgb3B0aW9ucy5ub3cpIHtcbiAgICAgICAgICBmb3IgKHZhciBpIGluIG9iamVjdCkge1xuICAgICAgICAgICAgY2FsbGJhY2sob2JqZWN0W2ldLCBpLCBvYmplY3QsIGZhbHNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICBvYmplY3RbQmluZGluZ0FsbF0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmICghb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XSkge1xuICAgICAgICBvYmplY3RbQmluZGluZ11bcHJvcGVydHldID0gbmV3IFNldCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBsZXQgYmluZEluZGV4ID0gb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5sZW5ndGg7XG5cbiAgICAgIGlmIChvcHRpb25zLmNoaWxkcmVuKSB7XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IGNhbGxiYWNrO1xuICAgICAgICBjYWxsYmFjayA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgdmFyIHYgPSBhcmdzWzBdO1xuICAgICAgICAgIHZhciBzdWJEZWJpbmQgPSBvYmplY3RbU3ViQmluZGluZ10uZ2V0KG9yaWdpbmFsKTtcbiAgICAgICAgICBpZiAoc3ViRGViaW5kKSB7XG4gICAgICAgICAgICBvYmplY3RbU3ViQmluZGluZ10uZGVsZXRlKG9yaWdpbmFsKTtcbiAgICAgICAgICAgIHN1YkRlYmluZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBvcmlnaW5hbCguLi5hcmdzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHZ2ID0gQmluZGFibGUubWFrZSh2KTtcbiAgICAgICAgICBpZiAoQmluZGFibGUuaXNCaW5kYWJsZSh2dikpIHtcbiAgICAgICAgICAgIG9iamVjdFtTdWJCaW5kaW5nXS5zZXQob3JpZ2luYWwsIHZ2LmJpbmRUbygoLi4uc3ViQXJncykgPT4gb3JpZ2luYWwoLi4uYXJncywgLi4uc3ViQXJncyksIE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgY2hpbGRyZW46IGZhbHNlXG4gICAgICAgICAgICB9KSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvcmlnaW5hbCguLi5hcmdzKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0uYWRkKGNhbGxiYWNrKTtcbiAgICAgIGlmICghKCdub3cnIGluIG9wdGlvbnMpIHx8IG9wdGlvbnMubm93KSB7XG4gICAgICAgIGNhbGxiYWNrKG9iamVjdFtwcm9wZXJ0eV0sIHByb3BlcnR5LCBvYmplY3QsIGZhbHNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBkZWJpbmRlciA9ICgpID0+IHtcbiAgICAgICAgdmFyIHN1YkRlYmluZCA9IG9iamVjdFtTdWJCaW5kaW5nXS5nZXQoY2FsbGJhY2spO1xuICAgICAgICBpZiAoc3ViRGViaW5kKSB7XG4gICAgICAgICAgb2JqZWN0W1N1YkJpbmRpbmddLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgICAgc3ViRGViaW5kKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvYmplY3RbQmluZGluZ11bcHJvcGVydHldKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5oYXMoY2FsbGJhY2spKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgIH07XG4gICAgICBpZiAob3B0aW9ucy5yZW1vdmVXaXRoICYmIG9wdGlvbnMucmVtb3ZlV2l0aCBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgICAgb3B0aW9ucy5yZW1vdmVXaXRoLm9uUmVtb3ZlKCgpID0+IGRlYmluZGVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWJpbmRlcjtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdiaW5kVG8nLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogYmluZFRvXG4gICAgfSk7XG4gICAgdmFyIF9fX2JlZm9yZSA9IGNhbGxiYWNrID0+IHtcbiAgICAgIG9iamVjdFtCZWZvcmVdLmFkZChjYWxsYmFjayk7XG4gICAgICByZXR1cm4gKCkgPT4gb2JqZWN0W0JlZm9yZV0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIHZhciBfX19hZnRlciA9IGNhbGxiYWNrID0+IHtcbiAgICAgIG9iamVjdFtBZnRlcl0uYWRkKGNhbGxiYWNrKTtcbiAgICAgIHJldHVybiAoKSA9PiBvYmplY3RbQWZ0ZXJdLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCaW5kQ2hhaW4sIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiAocGF0aCwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgICB2YXIgbm9kZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIHZhciBzdWJQYXJ0cyA9IHBhcnRzLnNsaWNlKDApO1xuICAgICAgICB2YXIgZGViaW5kID0gW107XG4gICAgICAgIGRlYmluZC5wdXNoKG9iamVjdC5iaW5kVG8obm9kZSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICB2YXIgcmVzdCA9IHN1YlBhcnRzLmpvaW4oJy4nKTtcbiAgICAgICAgICBpZiAoc3ViUGFydHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh2LCBrLCB0LCBkKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdiA9IHRba10gPSB0aGlzLm1ha2Uoe30pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWJpbmQgPSBkZWJpbmQuY29uY2F0KHZbQmluZENoYWluXShyZXN0LCBjYWxsYmFjaykpO1xuICAgICAgICB9KSk7XG4gICAgICAgIHJldHVybiAoKSA9PiBkZWJpbmQuZm9yRWFjaCh4ID0+IHgoKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ19fX2JlZm9yZScsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBfX19iZWZvcmVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnX19fYWZ0ZXInLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogX19fYWZ0ZXJcbiAgICB9KTtcbiAgICB2YXIgaXNCb3VuZCA9ICgpID0+IHtcbiAgICAgIGlmIChvYmplY3RbQmluZGluZ0FsbF0uc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGNhbGxiYWNrcyBvZiBPYmplY3QudmFsdWVzKG9iamVjdFtCaW5kaW5nXSkpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrcy5zaXplKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yKGxldCBjYWxsYmFjayBvZiBjYWxsYmFja3MpXG4gICAgICAgIC8vIHtcbiAgICAgICAgLy8gXHRpZihjYWxsYmFjaylcbiAgICAgICAgLy8gXHR7XG4gICAgICAgIC8vIFx0XHRyZXR1cm4gdHJ1ZTtcbiAgICAgICAgLy8gXHR9XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdpc0JvdW5kJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IGlzQm91bmRcbiAgICB9KTtcbiAgICBmb3IgKHZhciBpIGluIG9iamVjdCkge1xuICAgICAgLy8gY29uc3QgZGVzY3JpcHRvcnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhvYmplY3QpO1xuXG4gICAgICBpZiAoIW9iamVjdFtpXSB8fCB0eXBlb2Ygb2JqZWN0W2ldICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvYmplY3RbaV1bUmVmXSB8fCBvYmplY3RbaV0gaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKG9iamVjdFtpXSkgfHwgT2JqZWN0LmlzU2VhbGVkKG9iamVjdFtpXSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRXhjbHVkZWQob2JqZWN0W2ldKSkge1xuICAgICAgICBvYmplY3RbaV0gPSBCaW5kYWJsZS5tYWtlKG9iamVjdFtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBkZXNjcmlwdG9ycyA9IG9iamVjdFtEZXNjcmlwdG9yc107XG4gICAgdmFyIHdyYXBwZWQgPSBvYmplY3RbV3JhcHBlZF07XG4gICAgdmFyIHN0YWNrID0gb2JqZWN0W1N0YWNrXTtcbiAgICB2YXIgc2V0ID0gKHRhcmdldCwga2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFsdWUgPSBCaW5kYWJsZS5tYWtlKHZhbHVlKTtcbiAgICAgICAgaWYgKHRhcmdldFtrZXldID09PSB2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAod3JhcHBlZC5oYXMoa2V5KSkge1xuICAgICAgICB3cmFwcGVkLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgdmFyIG9uRGVjayA9IG9iamVjdFtEZWNrXTtcbiAgICAgIHZhciBpc09uRGVjayA9IG9uRGVjay5oYXMoa2V5KTtcbiAgICAgIHZhciB2YWxPbkRlY2sgPSBpc09uRGVjayAmJiBvbkRlY2suZ2V0KGtleSk7XG5cbiAgICAgIC8vIGlmKG9uRGVja1trZXldICE9PSB1bmRlZmluZWQgJiYgb25EZWNrW2tleV0gPT09IHZhbHVlKVxuICAgICAgaWYgKGlzT25EZWNrICYmIHZhbE9uRGVjayA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoa2V5LnNsaWNlICYmIGtleS5zbGljZSgtMykgPT09ICdfX18nKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRhcmdldFtrZXldID09PSB2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbE9uRGVjaykgJiYgaXNOYU4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgb25EZWNrLnNldChrZXksIHZhbHVlKTtcbiAgICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIG9iamVjdFtCaW5kaW5nQWxsXSkge1xuICAgICAgICBjYWxsYmFjayh2YWx1ZSwga2V5LCB0YXJnZXQsIGZhbHNlKTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgaW4gb2JqZWN0W0JpbmRpbmddKSB7XG4gICAgICAgIGZvciAodmFyIF9jYWxsYmFjayBvZiBvYmplY3RbQmluZGluZ11ba2V5XSkge1xuICAgICAgICAgIF9jYWxsYmFjayh2YWx1ZSwga2V5LCB0YXJnZXQsIGZhbHNlLCB0YXJnZXRba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9uRGVjay5kZWxldGUoa2V5KTtcbiAgICAgIHZhciBleGNsdWRlZCA9IHdpbi5GaWxlICYmIHRhcmdldCBpbnN0YW5jZW9mIHdpbi5GaWxlICYmIGtleSA9PSAnbGFzdE1vZGlmaWVkRGF0ZSc7XG4gICAgICBpZiAoIWV4Y2x1ZGVkKSB7XG4gICAgICAgIFJlZmxlY3Quc2V0KHRhcmdldCwga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpICYmIG9iamVjdFtCaW5kaW5nXVsnbGVuZ3RoJ10pIHtcbiAgICAgICAgZm9yICh2YXIgX2kgaW4gb2JqZWN0W0JpbmRpbmddWydsZW5ndGgnXSkge1xuICAgICAgICAgIHZhciBfY2FsbGJhY2syID0gb2JqZWN0W0JpbmRpbmddWydsZW5ndGgnXVtfaV07XG4gICAgICAgICAgX2NhbGxiYWNrMih0YXJnZXQubGVuZ3RoLCAnbGVuZ3RoJywgdGFyZ2V0LCBmYWxzZSwgdGFyZ2V0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgdmFyIGRlbGV0ZVByb3BlcnR5ID0gKHRhcmdldCwga2V5KSA9PiB7XG4gICAgICB2YXIgb25EZWNrID0gb2JqZWN0W0RlY2tdO1xuICAgICAgdmFyIGlzT25EZWNrID0gb25EZWNrLmhhcyhrZXkpO1xuICAgICAgaWYgKGlzT25EZWNrKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCEoa2V5IGluIHRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRvcnMuaGFzKGtleSkpIHtcbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ycy5nZXQoa2V5KTtcbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGRlc2NyaXB0b3JzLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgb25EZWNrLnNldChrZXksIG51bGwpO1xuICAgICAgaWYgKHdyYXBwZWQuaGFzKGtleSkpIHtcbiAgICAgICAgd3JhcHBlZC5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIG9iamVjdFtCaW5kaW5nQWxsXSkge1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIGtleSwgdGFyZ2V0LCB0cnVlLCB0YXJnZXRba2V5XSk7XG4gICAgICB9XG4gICAgICBpZiAoa2V5IGluIG9iamVjdFtCaW5kaW5nXSkge1xuICAgICAgICBmb3IgKHZhciBiaW5kaW5nIG9mIG9iamVjdFtCaW5kaW5nXVtrZXldKSB7XG4gICAgICAgICAgYmluZGluZyh1bmRlZmluZWQsIGtleSwgdGFyZ2V0LCB0cnVlLCB0YXJnZXRba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBrZXkpO1xuICAgICAgb25EZWNrLmRlbGV0ZShrZXkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICB2YXIgY29uc3RydWN0ID0gKHRhcmdldCwgYXJncykgPT4ge1xuICAgICAgdmFyIGtleSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgICBmb3IgKHZhciBjYWxsYmFjayBvZiB0YXJnZXRbQmVmb3JlXSkge1xuICAgICAgICBjYWxsYmFjayh0YXJnZXQsIGtleSwgb2JqZWN0W1N0YWNrXSwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHZhciBpbnN0YW5jZSA9IEJpbmRhYmxlLm1ha2UobmV3IHRhcmdldFtPcmlnaW5hbF0oLi4uYXJncykpO1xuICAgICAgZm9yICh2YXIgX2NhbGxiYWNrMyBvZiB0YXJnZXRbQWZ0ZXJdKSB7XG4gICAgICAgIF9jYWxsYmFjazModGFyZ2V0LCBrZXksIG9iamVjdFtTdGFja10sIGluc3RhbmNlLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9O1xuICAgIHZhciBnZXQgPSAodGFyZ2V0LCBrZXkpID0+IHtcbiAgICAgIGlmICh3cmFwcGVkLmhhcyhrZXkpKSB7XG4gICAgICAgIHJldHVybiB3cmFwcGVkLmdldChrZXkpO1xuICAgICAgfVxuICAgICAgaWYgKGtleSA9PT0gUmVmIHx8IGtleSA9PT0gT3JpZ2luYWwgfHwga2V5ID09PSAnYXBwbHknIHx8IGtleSA9PT0gJ2lzQm91bmQnIHx8IGtleSA9PT0gJ2JpbmRUbycgfHwga2V5ID09PSAnX19wcm90b19fJyB8fCBrZXkgPT09ICdjb25zdHJ1Y3RvcicpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgICAgdmFyIGRlc2NyaXB0b3I7XG4gICAgICBpZiAoZGVzY3JpcHRvcnMuaGFzKGtleSkpIHtcbiAgICAgICAgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JzLmdldChrZXkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBrZXkpO1xuICAgICAgICBkZXNjcmlwdG9ycy5zZXQoa2V5LCBkZXNjcmlwdG9yKTtcbiAgICAgIH1cbiAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgICBpZiAoT25BbGxHZXQgaW4gb2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBvYmplY3RbT25BbGxHZXRdKGtleSk7XG4gICAgICB9XG4gICAgICBpZiAoT25HZXQgaW4gb2JqZWN0ICYmICEoa2V5IGluIG9iamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtPbkdldF0oa2V5KTtcbiAgICAgIH1cbiAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICB3cmFwcGVkLnNldChrZXksIG9iamVjdFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBvYmplY3Rba2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpZiAoTmFtZXMgaW4gb2JqZWN0W2tleV0pIHtcbiAgICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0W1Vud3JhcHBlZF0uc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICB2YXIgcHJvdG90eXBlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCk7XG4gICAgICAgIHZhciBpc01ldGhvZCA9IHByb3RvdHlwZVtrZXldID09PSBvYmplY3Rba2V5XTtcbiAgICAgICAgdmFyIG9ialJlZiA9XG4gICAgICAgIC8vICh0eXBlb2YgUHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgUHJvbWlzZSlcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBTdG9yYWdlID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBTdG9yYWdlKVxuICAgICAgICAvLyB8fCAodHlwZW9mIE1hcCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIE1hcClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBTZXQgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBTZXQpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgV2Vha01hcClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBXZWFrU2V0ID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBXZWFrU2V0KVxuICAgICAgICAvLyB8fCAodHlwZW9mIEFycmF5QnVmZmVyID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFJlc2l6ZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFJlc2l6ZU9ic2VydmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIE11dGF0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIE11dGF0aW9uT2JzZXJ2ZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgUGVyZm9ybWFuY2VPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgUGVyZm9ybWFuY2VPYnNlcnZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBJbnRlcnNlY3Rpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBJbnRlcnNlY3Rpb25PYnNlcnZlcilcbiAgICAgICAgaXNFeGNsdWRlZChvYmplY3QpIHx8IHR5cGVvZiBvYmplY3RbU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJyAmJiBrZXkgPT09ICduZXh0JyB8fCB0eXBlb2YgVHlwZWRBcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiBUeXBlZEFycmF5IHx8IHR5cGVvZiBFdmVudFRhcmdldCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiBFdmVudFRhcmdldCB8fCB0eXBlb2YgRGF0ZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiBEYXRlIHx8IHR5cGVvZiBNYXBJdGVyYXRvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QucHJvdG90eXBlID09PSBNYXBJdGVyYXRvciB8fCB0eXBlb2YgU2V0SXRlcmF0b3IgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0LnByb3RvdHlwZSA9PT0gU2V0SXRlcmF0b3IgPyBvYmplY3QgOiBvYmplY3RbUmVmXTtcbiAgICAgICAgdmFyIHdyYXBwZWRNZXRob2QgPSBmdW5jdGlvbiAoLi4ucHJvdmlkZWRBcmdzKSB7XG4gICAgICAgICAgb2JqZWN0W0V4ZWN1dGluZ10gPSBrZXk7XG4gICAgICAgICAgc3RhY2sudW5zaGlmdChrZXkpO1xuICAgICAgICAgIGZvciAodmFyIGJlZm9yZUNhbGxiYWNrIG9mIG9iamVjdFtCZWZvcmVdKSB7XG4gICAgICAgICAgICBiZWZvcmVDYWxsYmFjayhvYmplY3QsIGtleSwgc3RhY2ssIG9iamVjdCwgcHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICBpZiAobmV3LnRhcmdldCkge1xuICAgICAgICAgICAgcmV0ID0gbmV3IChvYmplY3RbVW53cmFwcGVkXS5nZXQoa2V5KSkoLi4ucHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGZ1bmMgPSBvYmplY3RbVW53cmFwcGVkXS5nZXQoa2V5KTtcbiAgICAgICAgICAgIGlmIChpc01ldGhvZCkge1xuICAgICAgICAgICAgICByZXQgPSBmdW5jLmFwcGx5KG9ialJlZiB8fCBvYmplY3QsIHByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXQgPSBmdW5jKC4uLnByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAodmFyIGFmdGVyQ2FsbGJhY2sgb2Ygb2JqZWN0W0FmdGVyXSkge1xuICAgICAgICAgICAgYWZ0ZXJDYWxsYmFjayhvYmplY3QsIGtleSwgc3RhY2ssIG9iamVjdCwgcHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb2JqZWN0W0V4ZWN1dGluZ10gPSBudWxsO1xuICAgICAgICAgIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfTtcbiAgICAgICAgd3JhcHBlZE1ldGhvZFtPbkFsbEdldF0gPSBfa2V5ID0+IG9iamVjdFtrZXldW19rZXldO1xuICAgICAgICB2YXIgcmVzdWx0ID0gQmluZGFibGUubWFrZSh3cmFwcGVkTWV0aG9kKTtcbiAgICAgICAgd3JhcHBlZC5zZXQoa2V5LCByZXN1bHQpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgIH07XG4gICAgdmFyIGdldFByb3RvdHlwZU9mID0gdGFyZ2V0ID0+IHtcbiAgICAgIGlmIChHZXRQcm90byBpbiBvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtHZXRQcm90b107XG4gICAgICB9XG4gICAgICByZXR1cm4gUmVmbGVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuICAgIH07XG4gICAgdmFyIGhhbmRsZXJEZWYgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIGhhbmRsZXJEZWYuc2V0ID0gc2V0O1xuICAgIGhhbmRsZXJEZWYuY29uc3RydWN0ID0gY29uc3RydWN0O1xuICAgIGhhbmRsZXJEZWYuZGVsZXRlUHJvcGVydHkgPSBkZWxldGVQcm9wZXJ0eTtcbiAgICBpZiAoIW9iamVjdFtOb0dldHRlcnNdKSB7XG4gICAgICBoYW5kbGVyRGVmLmdldFByb3RvdHlwZU9mID0gZ2V0UHJvdG90eXBlT2Y7XG4gICAgICBoYW5kbGVyRGVmLmdldCA9IGdldDtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgUmVmLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFByb3h5KG9iamVjdCwgaGFuZGxlckRlZilcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqZWN0W1JlZl07XG4gIH1cbiAgc3RhdGljIGNsZWFyQmluZGluZ3Mob2JqZWN0KSB7XG4gICAgdmFyIG1hcHMgPSBmdW5jID0+ICguLi5vcykgPT4gb3MubWFwKGZ1bmMpO1xuICAgIHZhciBjbGVhck9iaiA9IG8gPT4gT2JqZWN0LmtleXMobykubWFwKGsgPT4gZGVsZXRlIG9ba10pO1xuICAgIHZhciBjbGVhck9ianMgPSBtYXBzKGNsZWFyT2JqKTtcbiAgICBvYmplY3RbQmluZGluZ0FsbF0uY2xlYXIoKTtcbiAgICBjbGVhck9ianMob2JqZWN0W1dyYXBwZWRdLCBvYmplY3RbQmluZGluZ10sIG9iamVjdFtBZnRlcl0sIG9iamVjdFtCZWZvcmVdKTtcbiAgfVxuICBzdGF0aWMgcmVzb2x2ZShvYmplY3QsIHBhdGgsIG93bmVyID0gZmFsc2UpIHtcbiAgICB2YXIgbm9kZTtcbiAgICB2YXIgcGF0aFBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIHZhciB0b3AgPSBwYXRoUGFydHNbMF07XG4gICAgd2hpbGUgKHBhdGhQYXJ0cy5sZW5ndGgpIHtcbiAgICAgIGlmIChvd25lciAmJiBwYXRoUGFydHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHZhciBvYmogPSB0aGlzLm1ha2Uob2JqZWN0KTtcbiAgICAgICAgcmV0dXJuIFtvYmosIHBhdGhQYXJ0cy5zaGlmdCgpLCB0b3BdO1xuICAgICAgfVxuICAgICAgbm9kZSA9IHBhdGhQYXJ0cy5zaGlmdCgpO1xuICAgICAgaWYgKCEobm9kZSBpbiBvYmplY3QpIHx8ICFvYmplY3Rbbm9kZV0gfHwgISh0eXBlb2Ygb2JqZWN0W25vZGVdID09PSAnb2JqZWN0JykpIHtcbiAgICAgICAgb2JqZWN0W25vZGVdID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIH1cbiAgICAgIG9iamVjdCA9IHRoaXMubWFrZShvYmplY3Rbbm9kZV0pO1xuICAgIH1cbiAgICByZXR1cm4gW3RoaXMubWFrZShvYmplY3QpLCBub2RlLCB0b3BdO1xuICB9XG4gIHN0YXRpYyB3cmFwRGVsYXlDYWxsYmFjayhjYWxsYmFjaywgZGVsYXkpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soLi4uYXJncyksIGRlbGF5KTtcbiAgfVxuICBzdGF0aWMgd3JhcFRocm90dGxlQ2FsbGJhY2soY2FsbGJhY2ssIHRocm90dGxlKSB7XG4gICAgdGhpcy50aHJvdHRsZXMuc2V0KGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAodGhpcy50aHJvdHRsZXMuZ2V0KGNhbGxiYWNrLCB0cnVlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYWxsYmFjayguLi5hcmdzKTtcbiAgICAgIHRoaXMudGhyb3R0bGVzLnNldChjYWxsYmFjaywgdHJ1ZSk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy50aHJvdHRsZXMuc2V0KGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgICB9LCB0aHJvdHRsZSk7XG4gICAgfTtcbiAgfVxuICBzdGF0aWMgd3JhcFdhaXRDYWxsYmFjayhjYWxsYmFjaywgd2FpdCkge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgdmFyIHdhaXRlcjtcbiAgICAgIGlmICh3YWl0ZXIgPSB0aGlzLndhaXRlcnMuZ2V0KGNhbGxiYWNrKSkge1xuICAgICAgICB0aGlzLndhaXRlcnMuZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHdhaXRlcik7XG4gICAgICB9XG4gICAgICB3YWl0ZXIgPSBzZXRUaW1lb3V0KCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpLCB3YWl0KTtcbiAgICAgIHRoaXMud2FpdGVycy5zZXQoY2FsbGJhY2ssIHdhaXRlcik7XG4gICAgfTtcbiAgfVxuICBzdGF0aWMgd3JhcEZyYW1lQ2FsbGJhY2soY2FsbGJhY2ssIGZyYW1lcykge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpKTtcbiAgICB9O1xuICB9XG4gIHN0YXRpYyB3cmFwSWRsZUNhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICAvLyBDb21wYXRpYmlsaXR5IGZvciBTYWZhcmkgMDgvMjAyMFxuICAgICAgdmFyIHJlcSA9IHdpbmRvdy5yZXF1ZXN0SWRsZUNhbGxiYWNrIHx8IHJlcXVlc3RBbmltYXRpb25GcmFtZTtcbiAgICAgIHJlcSgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSk7XG4gICAgfTtcbiAgfVxufVxuZXhwb3J0cy5CaW5kYWJsZSA9IEJpbmRhYmxlO1xuX2RlZmluZVByb3BlcnR5KEJpbmRhYmxlLCBcIndhaXRlcnNcIiwgbmV3IFdlYWtNYXAoKSk7XG5fZGVmaW5lUHJvcGVydHkoQmluZGFibGUsIFwidGhyb3R0bGVzXCIsIG5ldyBXZWFrTWFwKCkpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnUHJldmVudCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IFByZXZlbnRcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnT25HZXQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBPbkdldFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdOb0dldHRlcnMnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBOb0dldHRlcnNcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnR2V0UHJvdG8nLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBHZXRQcm90b1xufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdPbkFsbEdldCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE9uQWxsR2V0XG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0NhY2hlLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5DYWNoZSA9IHZvaWQgMDtcbmNsYXNzIENhY2hlIHtcbiAgc3RhdGljIHN0b3JlKGtleSwgdmFsdWUsIGV4cGlyeSwgYnVja2V0ID0gJ3N0YW5kYXJkJykge1xuICAgIHZhciBleHBpcmF0aW9uID0gMDtcbiAgICBpZiAoZXhwaXJ5KSB7XG4gICAgICBleHBpcmF0aW9uID0gZXhwaXJ5ICogMTAwMCArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYnVja2V0cykge1xuICAgICAgdGhpcy5idWNrZXRzID0gbmV3IE1hcCgpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYnVja2V0cy5oYXMoYnVja2V0KSkge1xuICAgICAgdGhpcy5idWNrZXRzLnNldChidWNrZXQsIG5ldyBNYXAoKSk7XG4gICAgfVxuICAgIHZhciBldmVudEVuZCA9IG5ldyBDdXN0b21FdmVudCgnY3ZDYWNoZVN0b3JlJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBrZXksXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBleHBpcnksXG4gICAgICAgIGJ1Y2tldFxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50RW5kKSkge1xuICAgICAgdGhpcy5idWNrZXRzLmdldChidWNrZXQpLnNldChrZXksIHtcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIGV4cGlyYXRpb25cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgbG9hZChrZXksIGRlZmF1bHR2YWx1ZSA9IGZhbHNlLCBidWNrZXQgPSAnc3RhbmRhcmQnKSB7XG4gICAgdmFyIGV2ZW50RW5kID0gbmV3IEN1c3RvbUV2ZW50KCdjdkNhY2hlTG9hZCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAga2V5LFxuICAgICAgICBkZWZhdWx0dmFsdWUsXG4gICAgICAgIGJ1Y2tldFxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudEVuZCkpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0dmFsdWU7XG4gICAgfVxuICAgIGlmICh0aGlzLmJ1Y2tldHMgJiYgdGhpcy5idWNrZXRzLmhhcyhidWNrZXQpICYmIHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5oYXMoa2V5KSkge1xuICAgICAgdmFyIGVudHJ5ID0gdGhpcy5idWNrZXRzLmdldChidWNrZXQpLmdldChrZXkpO1xuICAgICAgLy8gY29uc29sZS5sb2codGhpcy5idWNrZXRbYnVja2V0XVtrZXldLmV4cGlyYXRpb24sIChuZXcgRGF0ZSkuZ2V0VGltZSgpKTtcbiAgICAgIGlmIChlbnRyeS5leHBpcmF0aW9uID09PSAwIHx8IGVudHJ5LmV4cGlyYXRpb24gPiBuZXcgRGF0ZSgpLmdldFRpbWUoKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5idWNrZXRzLmdldChidWNrZXQpLmdldChrZXkpLnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVmYXVsdHZhbHVlO1xuICB9XG59XG5leHBvcnRzLkNhY2hlID0gQ2FjaGU7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Db25maWcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkNvbmZpZyA9IHZvaWQgMDtcbnZhciBBcHBDb25maWcgPSB7fTtcbnZhciBfcmVxdWlyZSA9IHJlcXVpcmU7XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbnRyeSB7XG4gIEFwcENvbmZpZyA9IF9yZXF1aXJlKCcvQ29uZmlnJykuQ29uZmlnO1xufSBjYXRjaCAoZXJyb3IpIHtcbiAgd2luLmRldk1vZGUgPT09IHRydWUgJiYgY29uc29sZS5lcnJvcihlcnJvcik7XG4gIEFwcENvbmZpZyA9IHt9O1xufVxuY2xhc3MgQ29uZmlnIHtcbiAgc3RhdGljIGdldChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnc1tuYW1lXTtcbiAgfVxuICBzdGF0aWMgc2V0KG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5jb25maWdzW25hbWVdID0gdmFsdWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgc3RhdGljIGR1bXAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlncztcbiAgfVxuICBzdGF0aWMgaW5pdCguLi5jb25maWdzKSB7XG4gICAgZm9yICh2YXIgaSBpbiBjb25maWdzKSB7XG4gICAgICB2YXIgY29uZmlnID0gY29uZmlnc1tpXTtcbiAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb25maWcgPSBKU09OLnBhcnNlKGNvbmZpZyk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBuYW1lIGluIGNvbmZpZykge1xuICAgICAgICB2YXIgdmFsdWUgPSBjb25maWdbbmFtZV07XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cbmV4cG9ydHMuQ29uZmlnID0gQ29uZmlnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KENvbmZpZywgJ2NvbmZpZ3MnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBBcHBDb25maWdcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvRG9tLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Eb20gPSB2b2lkIDA7XG52YXIgdHJhdmVyc2FscyA9IDA7XG5jbGFzcyBEb20ge1xuICBzdGF0aWMgbWFwVGFncyhkb2MsIHNlbGVjdG9yLCBjYWxsYmFjaywgc3RhcnROb2RlLCBlbmROb2RlKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBzdGFydGVkID0gdHJ1ZTtcbiAgICBpZiAoc3RhcnROb2RlKSB7XG4gICAgICBzdGFydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBlbmRlZCA9IGZhbHNlO1xuICAgIHZhciB7XG4gICAgICBOb2RlLFxuICAgICAgRWxlbWVudCxcbiAgICAgIE5vZGVGaWx0ZXIsXG4gICAgICBkb2N1bWVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB2YXIgdHJlZVdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoZG9jLCBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCB8IE5vZGVGaWx0ZXIuU0hPV19URVhULCB7XG4gICAgICBhY2NlcHROb2RlOiAobm9kZSwgd2Fsa2VyKSA9PiB7XG4gICAgICAgIGlmICghc3RhcnRlZCkge1xuICAgICAgICAgIGlmIChub2RlID09PSBzdGFydE5vZGUpIHtcbiAgICAgICAgICAgIHN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfU0tJUDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuZE5vZGUgJiYgbm9kZSA9PT0gZW5kTm9kZSkge1xuICAgICAgICAgIGVuZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5kZWQpIHtcbiAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfU0tJUDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmIChub2RlLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9BQ0NFUFQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9BQ0NFUFQ7XG4gICAgICB9XG4gICAgfSwgZmFsc2UpO1xuICAgIHZhciB0cmF2ZXJzYWwgPSB0cmF2ZXJzYWxzKys7XG4gICAgd2hpbGUgKHRyZWVXYWxrZXIubmV4dE5vZGUoKSkge1xuICAgICAgcmVzdWx0LnB1c2goY2FsbGJhY2sodHJlZVdhbGtlci5jdXJyZW50Tm9kZSwgdHJlZVdhbGtlcikpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHN0YXRpYyBkaXNwYXRjaEV2ZW50KGRvYywgZXZlbnQpIHtcbiAgICBkb2MuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgdGhpcy5tYXBUYWdzKGRvYywgZmFsc2UsIG5vZGUgPT4ge1xuICAgICAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB9KTtcbiAgfVxufVxuZXhwb3J0cy5Eb20gPSBEb207XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9NaXhpbi5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuTWl4aW4gPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgQ29uc3RydWN0b3IgPSBTeW1ib2woJ2NvbnN0cnVjdG9yJyk7XG52YXIgTWl4aW5MaXN0ID0gU3ltYm9sKCdtaXhpbkxpc3QnKTtcbmNsYXNzIE1peGluIHtcbiAgc3RhdGljIGZyb20oYmFzZUNsYXNzLCAuLi5taXhpbnMpIHtcbiAgICB2YXIgbmV3Q2xhc3MgPSBjbGFzcyBleHRlbmRzIGJhc2VDbGFzcyB7XG4gICAgICBjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG4gICAgICAgIHZhciBpbnN0YW5jZSA9IGJhc2VDbGFzcy5jb25zdHJ1Y3RvciA/IHN1cGVyKC4uLmFyZ3MpIDogbnVsbDtcbiAgICAgICAgZm9yICh2YXIgbWl4aW4gb2YgbWl4aW5zKSB7XG4gICAgICAgICAgaWYgKG1peGluW01peGluLkNvbnN0cnVjdG9yXSkge1xuICAgICAgICAgICAgbWl4aW5bTWl4aW4uQ29uc3RydWN0b3JdLmFwcGx5KHRoaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzd2l0Y2ggKHR5cGVvZiBtaXhpbikge1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICBNaXhpbi5taXhDbGFzcyhtaXhpbiwgbmV3Q2xhc3MpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgIE1peGluLm1peE9iamVjdChtaXhpbiwgdGhpcyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gbmV3Q2xhc3M7XG4gIH1cbiAgc3RhdGljIG1ha2UoLi4uY2xhc3Nlcykge1xuICAgIHZhciBiYXNlID0gY2xhc3Nlcy5wb3AoKTtcbiAgICByZXR1cm4gTWl4aW4udG8oYmFzZSwgLi4uY2xhc3Nlcyk7XG4gIH1cbiAgc3RhdGljIHRvKGJhc2UsIC4uLm1peGlucykge1xuICAgIHZhciBkZXNjcmlwdG9ycyA9IHt9O1xuICAgIG1peGlucy5tYXAobWl4aW4gPT4ge1xuICAgICAgc3dpdGNoICh0eXBlb2YgbWl4aW4pIHtcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGRlc2NyaXB0b3JzLCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhtaXhpbikpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihkZXNjcmlwdG9ycywgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMobWl4aW4ucHJvdG90eXBlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBkZWxldGUgZGVzY3JpcHRvcnMuY29uc3RydWN0b3I7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhiYXNlLnByb3RvdHlwZSwgZGVzY3JpcHRvcnMpO1xuICAgIH0pO1xuICB9XG4gIHN0YXRpYyB3aXRoKC4uLm1peGlucykge1xuICAgIHJldHVybiB0aGlzLmZyb20oY2xhc3Mge1xuICAgICAgY29uc3RydWN0b3IoKSB7fVxuICAgIH0sIC4uLm1peGlucyk7XG4gIH1cbiAgc3RhdGljIG1peE9iamVjdChtaXhpbiwgaW5zdGFuY2UpIHtcbiAgICBmb3IgKHZhciBmdW5jIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG1peGluKSkge1xuICAgICAgaWYgKHR5cGVvZiBtaXhpbltmdW5jXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpbnN0YW5jZVtmdW5jXSA9IG1peGluW2Z1bmNdLmJpbmQoaW5zdGFuY2UpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGluc3RhbmNlW2Z1bmNdID0gbWl4aW5bZnVuY107XG4gICAgfVxuICAgIGZvciAodmFyIF9mdW5jIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMobWl4aW4pKSB7XG4gICAgICBpZiAodHlwZW9mIG1peGluW19mdW5jXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpbnN0YW5jZVtfZnVuY10gPSBtaXhpbltfZnVuY10uYmluZChpbnN0YW5jZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW5zdGFuY2VbX2Z1bmNdID0gbWl4aW5bX2Z1bmNdO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgbWl4Q2xhc3MoY2xzLCBuZXdDbGFzcykge1xuICAgIGZvciAodmFyIGZ1bmMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2xzLnByb3RvdHlwZSkpIHtcbiAgICAgIGlmIChbJ25hbWUnLCAncHJvdG90eXBlJywgJ2xlbmd0aCddLmluY2x1ZGVzKGZ1bmMpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5ld0NsYXNzLCBmdW5jKTtcbiAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBjbHNbZnVuY10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW2Z1bmNdID0gY2xzLnByb3RvdHlwZVtmdW5jXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBuZXdDbGFzcy5wcm90b3R5cGVbZnVuY10gPSBjbHMucHJvdG90eXBlW2Z1bmNdLmJpbmQobmV3Q2xhc3MucHJvdG90eXBlKTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2Z1bmMyIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoY2xzLnByb3RvdHlwZSkpIHtcbiAgICAgIGlmICh0eXBlb2YgY2xzW19mdW5jMl0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW19mdW5jMl0gPSBjbHMucHJvdG90eXBlW19mdW5jMl07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW19mdW5jMl0gPSBjbHMucHJvdG90eXBlW19mdW5jMl0uYmluZChuZXdDbGFzcy5wcm90b3R5cGUpO1xuICAgIH1cbiAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChbJ25hbWUnLCAncHJvdG90eXBlJywgJ2xlbmd0aCddLmluY2x1ZGVzKF9mdW5jMykpIHtcbiAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobmV3Q2xhc3MsIF9mdW5jMyk7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBjbHNbX2Z1bmMzXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG5ld0NsYXNzW19mdW5jM10gPSBjbHNbX2Z1bmMzXTtcbiAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHJldiA9IG5ld0NsYXNzW19mdW5jM10gfHwgZmFsc2U7XG4gICAgICAgIHZhciBtZXRoID0gY2xzW19mdW5jM10uYmluZChuZXdDbGFzcyk7XG4gICAgICAgIG5ld0NsYXNzW19mdW5jM10gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgIHByZXYgJiYgcHJldiguLi5hcmdzKTtcbiAgICAgICAgICByZXR1cm4gbWV0aCguLi5hcmdzKTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBfcmV0O1xuICAgIGZvciAodmFyIF9mdW5jMyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjbHMpKSB7XG4gICAgICBfcmV0ID0gX2xvb3AoKTtcbiAgICAgIGlmIChfcmV0ID09PSAwKSBjb250aW51ZTtcbiAgICB9XG4gICAgdmFyIF9sb29wMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICh0eXBlb2YgY2xzW19mdW5jNF0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW19mdW5jNF0gPSBjbHNbX2Z1bmM0XTtcbiAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICB2YXIgcHJldiA9IG5ld0NsYXNzW19mdW5jNF0gfHwgZmFsc2U7XG4gICAgICB2YXIgbWV0aCA9IGNsc1tfZnVuYzRdLmJpbmQobmV3Q2xhc3MpO1xuICAgICAgbmV3Q2xhc3NbX2Z1bmM0XSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIHByZXYgJiYgcHJldiguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIG1ldGgoLi4uYXJncyk7XG4gICAgICB9O1xuICAgIH07XG4gICAgZm9yICh2YXIgX2Z1bmM0IG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoY2xzKSkge1xuICAgICAgaWYgKF9sb29wMigpKSBjb250aW51ZTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIG1peChtaXhpblRvKSB7XG4gICAgdmFyIGNvbnN0cnVjdG9ycyA9IFtdO1xuICAgIHZhciBhbGxTdGF0aWMgPSB7fTtcbiAgICB2YXIgYWxsSW5zdGFuY2UgPSB7fTtcbiAgICB2YXIgbWl4YWJsZSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUobWl4aW5Ubyk7XG4gICAgdmFyIF9sb29wMyA9IGZ1bmN0aW9uIChiYXNlKSB7XG4gICAgICB2YXIgaW5zdGFuY2VOYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGJhc2UucHJvdG90eXBlKTtcbiAgICAgIHZhciBzdGF0aWNOYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGJhc2UpO1xuICAgICAgdmFyIHByZWZpeCA9IC9eKGJlZm9yZXxhZnRlcilfXyguKykvO1xuICAgICAgdmFyIF9sb29wNSA9IGZ1bmN0aW9uIChfbWV0aG9kTmFtZTIpIHtcbiAgICAgICAgICB2YXIgbWF0Y2ggPSBfbWV0aG9kTmFtZTIubWF0Y2gocHJlZml4KTtcbiAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHN3aXRjaCAobWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgY2FzZSAnYmVmb3JlJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2JlZm9yZSgodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlW19tZXRob2ROYW1lMl0uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FmdGVyJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2FmdGVyKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2VbX21ldGhvZE5hbWUyXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYWxsU3RhdGljW19tZXRob2ROYW1lMl0pIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGJhc2VbX21ldGhvZE5hbWUyXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGFsbFN0YXRpY1tfbWV0aG9kTmFtZTJdID0gYmFzZVtfbWV0aG9kTmFtZTJdO1xuICAgICAgICB9LFxuICAgICAgICBfcmV0MjtcbiAgICAgIGZvciAodmFyIF9tZXRob2ROYW1lMiBvZiBzdGF0aWNOYW1lcykge1xuICAgICAgICBfcmV0MiA9IF9sb29wNShfbWV0aG9kTmFtZTIpO1xuICAgICAgICBpZiAoX3JldDIgPT09IDApIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIF9sb29wNiA9IGZ1bmN0aW9uIChfbWV0aG9kTmFtZTMpIHtcbiAgICAgICAgICB2YXIgbWF0Y2ggPSBfbWV0aG9kTmFtZTMubWF0Y2gocHJlZml4KTtcbiAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHN3aXRjaCAobWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgY2FzZSAnYmVmb3JlJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2JlZm9yZSgodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdhZnRlcic6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19hZnRlcigodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhbGxJbnN0YW5jZVtfbWV0aG9kTmFtZTNdKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgYWxsSW5zdGFuY2VbX21ldGhvZE5hbWUzXSA9IGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM107XG4gICAgICAgIH0sXG4gICAgICAgIF9yZXQzO1xuICAgICAgZm9yICh2YXIgX21ldGhvZE5hbWUzIG9mIGluc3RhbmNlTmFtZXMpIHtcbiAgICAgICAgX3JldDMgPSBfbG9vcDYoX21ldGhvZE5hbWUzKTtcbiAgICAgICAgaWYgKF9yZXQzID09PSAwKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZvciAodmFyIGJhc2UgPSB0aGlzOyBiYXNlICYmIGJhc2UucHJvdG90eXBlOyBiYXNlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGJhc2UpKSB7XG4gICAgICBfbG9vcDMoYmFzZSk7XG4gICAgfVxuICAgIGZvciAodmFyIG1ldGhvZE5hbWUgaW4gYWxsU3RhdGljKSB7XG4gICAgICBtaXhpblRvW21ldGhvZE5hbWVdID0gYWxsU3RhdGljW21ldGhvZE5hbWVdLmJpbmQobWl4aW5Ubyk7XG4gICAgfVxuICAgIHZhciBfbG9vcDQgPSBmdW5jdGlvbiAoX21ldGhvZE5hbWUpIHtcbiAgICAgIG1peGluVG8ucHJvdG90eXBlW19tZXRob2ROYW1lXSA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgIHJldHVybiBhbGxJbnN0YW5jZVtfbWV0aG9kTmFtZV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9O1xuICAgIH07XG4gICAgZm9yICh2YXIgX21ldGhvZE5hbWUgaW4gYWxsSW5zdGFuY2UpIHtcbiAgICAgIF9sb29wNChfbWV0aG9kTmFtZSk7XG4gICAgfVxuICAgIHJldHVybiBtaXhhYmxlO1xuICB9XG59XG5leHBvcnRzLk1peGluID0gTWl4aW47XG5NaXhpbi5Db25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvUm91dGVyLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Sb3V0ZXIgPSB2b2lkIDA7XG52YXIgX1ZpZXcgPSByZXF1aXJlKFwiLi9WaWV3XCIpO1xudmFyIF9DYWNoZSA9IHJlcXVpcmUoXCIuL0NhY2hlXCIpO1xudmFyIF9Db25maWcgPSByZXF1aXJlKFwiLi9Db25maWdcIik7XG52YXIgX1JvdXRlcyA9IHJlcXVpcmUoXCIuL1JvdXRlc1wiKTtcbnZhciBfd2luJEN1c3RvbUV2ZW50O1xudmFyIE5vdEZvdW5kRXJyb3IgPSBTeW1ib2woJ05vdEZvdW5kJyk7XG52YXIgSW50ZXJuYWxFcnJvciA9IFN5bWJvbCgnSW50ZXJuYWwnKTtcbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xud2luLkN1c3RvbUV2ZW50ID0gKF93aW4kQ3VzdG9tRXZlbnQgPSB3aW4uQ3VzdG9tRXZlbnQpICE9PSBudWxsICYmIF93aW4kQ3VzdG9tRXZlbnQgIT09IHZvaWQgMCA/IF93aW4kQ3VzdG9tRXZlbnQgOiB3aW4uRXZlbnQ7XG5jbGFzcyBSb3V0ZXIge1xuICBzdGF0aWMgd2FpdCh2aWV3LCBldmVudCA9ICdET01Db250ZW50TG9hZGVkJywgbm9kZSA9IGRvY3VtZW50KSB7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCAoKSA9PiB7XG4gICAgICB0aGlzLmxpc3Rlbih2aWV3KTtcbiAgICB9KTtcbiAgfVxuICBzdGF0aWMgbGlzdGVuKGxpc3RlbmVyLCByb3V0ZXMgPSBmYWxzZSkge1xuICAgIHRoaXMubGlzdGVuZXIgPSBsaXN0ZW5lciB8fCB0aGlzLmxpc3RlbmVyO1xuICAgIHRoaXMucm91dGVzID0gcm91dGVzIHx8IGxpc3RlbmVyLnJvdXRlcztcbiAgICBPYmplY3QuYXNzaWduKHRoaXMucXVlcnksIHRoaXMucXVlcnlPdmVyKHt9KSk7XG4gICAgdmFyIGxpc3RlbiA9IGV2ZW50ID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoZXZlbnQuc3RhdGUgJiYgJ3JvdXRlZElkJyBpbiBldmVudC5zdGF0ZSkge1xuICAgICAgICBpZiAoZXZlbnQuc3RhdGUucm91dGVkSWQgPD0gdGhpcy5yb3V0ZUNvdW50KSB7XG4gICAgICAgICAgdGhpcy5oaXN0b3J5LnNwbGljZShldmVudC5zdGF0ZS5yb3V0ZWRJZCk7XG4gICAgICAgICAgdGhpcy5yb3V0ZUNvdW50ID0gZXZlbnQuc3RhdGUucm91dGVkSWQ7XG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnQuc3RhdGUucm91dGVkSWQgPiB0aGlzLnJvdXRlQ291bnQpIHtcbiAgICAgICAgICB0aGlzLmhpc3RvcnkucHVzaChldmVudC5zdGF0ZS5wcmV2KTtcbiAgICAgICAgICB0aGlzLnJvdXRlQ291bnQgPSBldmVudC5zdGF0ZS5yb3V0ZWRJZDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YXRlID0gZXZlbnQuc3RhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5wcmV2UGF0aCAhPT0gbnVsbCAmJiB0aGlzLnByZXZQYXRoICE9PSBsb2NhdGlvbi5wYXRobmFtZSkge1xuICAgICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKHRoaXMucHJldlBhdGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSkge1xuICAgICAgICB0aGlzLm1hdGNoKGxvY2F0aW9uLnBhdGhuYW1lLCBsaXN0ZW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1hdGNoKHRoaXMubmV4dFBhdGgsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjdlVybENoYW5nZWQnLCBsaXN0ZW4pO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGxpc3Rlbik7XG4gICAgdmFyIHJvdXRlID0gIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSA/IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoIDogZmFsc2U7XG4gICAgaWYgKCF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikgJiYgbG9jYXRpb24uaGFzaCkge1xuICAgICAgcm91dGUgKz0gbG9jYXRpb24uaGFzaDtcbiAgICB9XG4gICAgdmFyIHN0YXRlID0ge1xuICAgICAgcm91dGVkSWQ6IHRoaXMucm91dGVDb3VudCxcbiAgICAgIHVybDogbG9jYXRpb24ucGF0aG5hbWUsXG4gICAgICBwcmV2OiB0aGlzLnByZXZQYXRoXG4gICAgfTtcbiAgICBpZiAoIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSkge1xuICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoc3RhdGUsIG51bGwsIGxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICB9XG4gICAgdGhpcy5nbyhyb3V0ZSAhPT0gZmFsc2UgPyByb3V0ZSA6ICcvJyk7XG4gIH1cbiAgc3RhdGljIGdvKHBhdGgsIHNpbGVudCA9IGZhbHNlKSB7XG4gICAgdmFyIGNvbmZpZ1RpdGxlID0gX0NvbmZpZy5Db25maWcuZ2V0KCd0aXRsZScpO1xuICAgIGlmIChjb25maWdUaXRsZSkge1xuICAgICAgZG9jdW1lbnQudGl0bGUgPSBjb25maWdUaXRsZTtcbiAgICB9XG4gICAgdmFyIHN0YXRlID0ge1xuICAgICAgcm91dGVkSWQ6IHRoaXMucm91dGVDb3VudCxcbiAgICAgIHByZXY6IHRoaXMucHJldlBhdGgsXG4gICAgICB1cmw6IGxvY2F0aW9uLnBhdGhuYW1lXG4gICAgfTtcbiAgICBpZiAoc2lsZW50ID09PSAtMSkge1xuICAgICAgdGhpcy5tYXRjaChwYXRoLCB0aGlzLmxpc3RlbmVyLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSkge1xuICAgICAgdGhpcy5uZXh0UGF0aCA9IHBhdGg7XG4gICAgfSBlbHNlIGlmIChzaWxlbnQgPT09IDIgJiYgbG9jYXRpb24ucGF0aG5hbWUgIT09IHBhdGgpIHtcbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlLCBudWxsLCBwYXRoKTtcbiAgICB9IGVsc2UgaWYgKGxvY2F0aW9uLnBhdGhuYW1lICE9PSBwYXRoKSB7XG4gICAgICBoaXN0b3J5LnB1c2hTdGF0ZShzdGF0ZSwgbnVsbCwgcGF0aCk7XG4gICAgfVxuICAgIGlmICghc2lsZW50IHx8IHNpbGVudCA8IDApIHtcbiAgICAgIGlmIChzaWxlbnQgPT09IGZhbHNlKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICBpZiAocGF0aC5zdWJzdHJpbmcoMCwgMSkgPT09ICcjJykge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBIYXNoQ2hhbmdlRXZlbnQoJ2hhc2hjaGFuZ2UnKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdlVybENoYW5nZWQnKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wcmV2UGF0aCA9IHBhdGg7XG4gIH1cbiAgc3RhdGljIHByb2Nlc3NSb3V0ZShyb3V0ZXMsIHNlbGVjdGVkLCBhcmdzKSB7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmICh0eXBlb2Ygcm91dGVzW3NlbGVjdGVkXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKHJvdXRlc1tzZWxlY3RlZF0ucHJvdG90eXBlIGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICByZXN1bHQgPSBuZXcgcm91dGVzW3NlbGVjdGVkXShhcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IHJvdXRlc1tzZWxlY3RlZF0oYXJncyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IHJvdXRlc1tzZWxlY3RlZF07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgc3RhdGljIGhhbmRsZUVycm9yKGVycm9yLCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBsaXN0ZW5lciwgcGF0aCwgcHJldiwgZm9yY2VSZWZyZXNoKSB7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlRXJyb3InLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGVycm9yLFxuICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgcHJldixcbiAgICAgICAgICB2aWV3OiBsaXN0ZW5lcixcbiAgICAgICAgICByb3V0ZXMsXG4gICAgICAgICAgc2VsZWN0ZWRcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gd2luWydkZXZNb2RlJ10gPyAnVW5leHBlY3RlZCBlcnJvcjogJyArIFN0cmluZyhlcnJvcikgOiAnVW5leHBlY3RlZCBlcnJvci4nO1xuICAgIGlmIChyb3V0ZXNbSW50ZXJuYWxFcnJvcl0pIHtcbiAgICAgIGFyZ3NbSW50ZXJuYWxFcnJvcl0gPSBlcnJvcjtcbiAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc1JvdXRlKHJvdXRlcywgSW50ZXJuYWxFcnJvciwgYXJncyk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCk7XG4gIH1cbiAgc3RhdGljIG1hdGNoKHBhdGgsIGxpc3RlbmVyLCBvcHRpb25zID0gZmFsc2UpIHtcbiAgICB2YXIgZXZlbnQgPSBudWxsLFxuICAgICAgcmVxdWVzdCA9IG51bGwsXG4gICAgICBmb3JjZVJlZnJlc2ggPSBmYWxzZTtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgZm9yY2VSZWZyZXNoID0gb3B0aW9ucztcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3JjZVJlZnJlc2ggPSBvcHRpb25zLmZvcmNlUmVmcmVzaDtcbiAgICAgIGV2ZW50ID0gb3B0aW9ucy5ldmVudDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5wYXRoID09PSBwYXRoICYmICFmb3JjZVJlZnJlc2gpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG9yaWdpbiA9ICdodHRwOi8vZXhhbXBsZS5jb20nO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBvcmlnaW4gPSB0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikgPyBvcmlnaW4gOiBsb2NhdGlvbi5vcmlnaW47XG4gICAgICB0aGlzLnF1ZXJ5U3RyaW5nID0gbG9jYXRpb24uc2VhcmNoO1xuICAgIH1cbiAgICB2YXIgdXJsID0gbmV3IFVSTChwYXRoLCBvcmlnaW4pO1xuICAgIHBhdGggPSB0aGlzLnBhdGggPSB1cmwucGF0aG5hbWU7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMucXVlcnlTdHJpbmcgPSB1cmwuc2VhcmNoO1xuICAgIH1cbiAgICB2YXIgcHJldiA9IHRoaXMucHJldlBhdGg7XG4gICAgdmFyIGN1cnJlbnQgPSBsaXN0ZW5lciAmJiBsaXN0ZW5lci5hcmdzID8gbGlzdGVuZXIuYXJncy5jb250ZW50IDogbnVsbDtcbiAgICB2YXIgcm91dGVzID0gdGhpcy5yb3V0ZXMgfHwgbGlzdGVuZXIgJiYgbGlzdGVuZXIucm91dGVzIHx8IF9Sb3V0ZXMuUm91dGVzLmR1bXAoKTtcbiAgICB2YXIgcXVlcnkgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHRoaXMucXVlcnlTdHJpbmcpO1xuICAgIGlmIChldmVudCAmJiBldmVudC5yZXF1ZXN0KSB7XG4gICAgICB0aGlzLnJlcXVlc3QgPSBldmVudC5yZXF1ZXN0O1xuICAgIH1cbiAgICBmb3IgKHZhciBrZXkgaW4gT2JqZWN0LmtleXModGhpcy5xdWVyeSkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLnF1ZXJ5W2tleV07XG4gICAgfVxuICAgIGZvciAodmFyIFtfa2V5LCB2YWx1ZV0gb2YgcXVlcnkpIHtcbiAgICAgIHRoaXMucXVlcnlbX2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgdmFyIGFyZ3MgPSB7fSxcbiAgICAgIHNlbGVjdGVkID0gZmFsc2UsXG4gICAgICByZXN1bHQgPSAnJztcbiAgICBpZiAocGF0aC5zdWJzdHJpbmcoMCwgMSkgPT09ICcvJykge1xuICAgICAgcGF0aCA9IHBhdGguc3Vic3RyaW5nKDEpO1xuICAgIH1cbiAgICBwYXRoID0gcGF0aC5zcGxpdCgnLycpO1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5xdWVyeSkge1xuICAgICAgYXJnc1tpXSA9IHRoaXMucXVlcnlbaV07XG4gICAgfVxuICAgIEwxOiBmb3IgKHZhciBfaSBpbiByb3V0ZXMpIHtcbiAgICAgIHZhciByb3V0ZSA9IF9pLnNwbGl0KCcvJyk7XG4gICAgICBpZiAocm91dGUubGVuZ3RoIDwgcGF0aC5sZW5ndGggJiYgcm91dGVbcm91dGUubGVuZ3RoIC0gMV0gIT09ICcqJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIEwyOiBmb3IgKHZhciBqIGluIHJvdXRlKSB7XG4gICAgICAgIGlmIChyb3V0ZVtqXS5zdWJzdHIoMCwgMSkgPT0gJyUnKSB7XG4gICAgICAgICAgdmFyIGFyZ05hbWUgPSBudWxsO1xuICAgICAgICAgIHZhciBncm91cHMgPSAvXiUoXFx3KylcXD8/Ly5leGVjKHJvdXRlW2pdKTtcbiAgICAgICAgICBpZiAoZ3JvdXBzICYmIGdyb3Vwc1sxXSkge1xuICAgICAgICAgICAgYXJnTmFtZSA9IGdyb3Vwc1sxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFhcmdOYW1lKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cm91dGVbal19IGlzIG5vdCBhIHZhbGlkIGFyZ3VtZW50IHNlZ21lbnQgaW4gcm91dGUgXCIke19pfVwiYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghcGF0aFtqXSkge1xuICAgICAgICAgICAgaWYgKHJvdXRlW2pdLnN1YnN0cihyb3V0ZVtqXS5sZW5ndGggLSAxLCAxKSA9PSAnPycpIHtcbiAgICAgICAgICAgICAgYXJnc1thcmdOYW1lXSA9ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGludWUgTDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFyZ3NbYXJnTmFtZV0gPSBwYXRoW2pdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyb3V0ZVtqXSAhPT0gJyonICYmIHBhdGhbal0gIT09IHJvdXRlW2pdKSB7XG4gICAgICAgICAgY29udGludWUgTDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNlbGVjdGVkID0gX2k7XG4gICAgICByZXN1bHQgPSByb3V0ZXNbX2ldO1xuICAgICAgaWYgKHJvdXRlW3JvdXRlLmxlbmd0aCAtIDFdID09PSAnKicpIHtcbiAgICAgICAgYXJncy5wYXRocGFydHMgPSBwYXRoLnNsaWNlKHJvdXRlLmxlbmd0aCAtIDEpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHZhciBldmVudFN0YXJ0ID0gbmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlU3RhcnQnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHBhdGgsXG4gICAgICAgIHByZXYsXG4gICAgICAgIHJvb3Q6IGxpc3RlbmVyLFxuICAgICAgICBzZWxlY3RlZCxcbiAgICAgICAgcm91dGVzXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGlmICghZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudFN0YXJ0KSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghZm9yY2VSZWZyZXNoICYmIGxpc3RlbmVyICYmIGN1cnJlbnQgJiYgdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcgJiYgY3VycmVudC5jb25zdHJ1Y3RvciA9PT0gcmVzdWx0LmNvbnN0cnVjdG9yICYmICEocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkgJiYgY3VycmVudC51cGRhdGUoYXJncykpIHtcbiAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudCA9IGN1cnJlbnQ7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCEoc2VsZWN0ZWQgaW4gcm91dGVzKSkge1xuICAgICAgcm91dGVzW3NlbGVjdGVkXSA9IHJvdXRlc1tOb3RGb3VuZEVycm9yXTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc1JvdXRlKHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzUm91dGUocm91dGVzLCBOb3RGb3VuZEVycm9yLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICghKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICBpZiAoIShyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQudGhlbihyZWFsUmVzdWx0ID0+IHRoaXMudXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZWFsUmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpKS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgIHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGxpc3RlbmVyLCBwYXRoLCBwcmV2LCBmb3JjZVJlZnJlc2gpO1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGxpc3RlbmVyLCBwYXRoLCBwcmV2LCBmb3JjZVJlZnJlc2gpO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgdXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCkge1xuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHByZXYgPSB0aGlzLnByZXZQYXRoO1xuICAgIHZhciBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZScsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgcmVzdWx0LFxuICAgICAgICBwYXRoLFxuICAgICAgICBwcmV2LFxuICAgICAgICB2aWV3OiBsaXN0ZW5lcixcbiAgICAgICAgcm91dGVzLFxuICAgICAgICBzZWxlY3RlZFxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICBpZiAobGlzdGVuZXIuYXJncy5jb250ZW50IGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQucGF1c2UodHJ1ZSk7XG4gICAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGlmIChkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KSkge1xuICAgICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQgPSByZXN1bHQ7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICByZXN1bHQucGF1c2UoZmFsc2UpO1xuICAgICAgICByZXN1bHQudXBkYXRlKGFyZ3MsIGZvcmNlUmVmcmVzaCk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBldmVudEVuZCA9IG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZUVuZCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgcmVzdWx0LFxuICAgICAgICBwYXRoLFxuICAgICAgICBwcmV2LFxuICAgICAgICB2aWV3OiBsaXN0ZW5lcixcbiAgICAgICAgcm91dGVzLFxuICAgICAgICBzZWxlY3RlZFxuICAgICAgfVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRFbmQpO1xuICB9XG4gIHN0YXRpYyBpc09yaWdpbkxpbWl0ZWQoe1xuICAgIG9yaWdpblxuICB9KSB7XG4gICAgcmV0dXJuIG9yaWdpbiA9PT0gJ251bGwnIHx8IG9yaWdpbiA9PT0gJ2ZpbGU6Ly8nO1xuICB9XG4gIHN0YXRpYyBxdWVyeU92ZXIoYXJncyA9IHt9KSB7XG4gICAgdmFyIHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKTtcbiAgICB2YXIgZmluYWxBcmdzID0ge307XG4gICAgdmFyIHF1ZXJ5ID0ge307XG4gICAgZm9yICh2YXIgcGFpciBvZiBwYXJhbXMpIHtcbiAgICAgIHF1ZXJ5W3BhaXJbMF1dID0gcGFpclsxXTtcbiAgICB9XG4gICAgZmluYWxBcmdzID0gT2JqZWN0LmFzc2lnbihmaW5hbEFyZ3MsIHF1ZXJ5LCBhcmdzKTtcbiAgICBkZWxldGUgZmluYWxBcmdzWydhcGknXTtcbiAgICByZXR1cm4gZmluYWxBcmdzO1xuXG4gICAgLy8gZm9yKGxldCBpIGluIHF1ZXJ5KVxuICAgIC8vIHtcbiAgICAvLyBcdGZpbmFsQXJnc1tpXSA9IHF1ZXJ5W2ldO1xuICAgIC8vIH1cblxuICAgIC8vIGZvcihsZXQgaSBpbiBhcmdzKVxuICAgIC8vIHtcbiAgICAvLyBcdGZpbmFsQXJnc1tpXSA9IGFyZ3NbaV07XG4gICAgLy8gfVxuICB9XG4gIHN0YXRpYyBxdWVyeVRvU3RyaW5nKGFyZ3MgPSB7fSwgZnJlc2ggPSBmYWxzZSkge1xuICAgIHZhciBwYXJ0cyA9IFtdLFxuICAgICAgZmluYWxBcmdzID0gYXJncztcbiAgICBpZiAoIWZyZXNoKSB7XG4gICAgICBmaW5hbEFyZ3MgPSB0aGlzLnF1ZXJ5T3ZlcihhcmdzKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiBmaW5hbEFyZ3MpIHtcbiAgICAgIGlmIChmaW5hbEFyZ3NbaV0gPT09ICcnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcGFydHMucHVzaChpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbmFsQXJnc1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gcGFydHMuam9pbignJicpO1xuICB9XG4gIHN0YXRpYyBzZXRRdWVyeShuYW1lLCB2YWx1ZSwgc2lsZW50KSB7XG4gICAgdmFyIGFyZ3MgPSB0aGlzLnF1ZXJ5T3ZlcigpO1xuICAgIGFyZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZGVsZXRlIGFyZ3NbbmFtZV07XG4gICAgfVxuICAgIHZhciBxdWVyeVN0cmluZyA9IHRoaXMucXVlcnlUb1N0cmluZyhhcmdzLCB0cnVlKTtcbiAgICB0aGlzLmdvKGxvY2F0aW9uLnBhdGhuYW1lICsgKHF1ZXJ5U3RyaW5nID8gJz8nICsgcXVlcnlTdHJpbmcgOiAnPycpLCBzaWxlbnQpO1xuICB9XG59XG5leHBvcnRzLlJvdXRlciA9IFJvdXRlcjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdxdWVyeScsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IHt9XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdoaXN0b3J5Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogW11cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3JvdXRlQ291bnQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IDBcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3ByZXZQYXRoJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiBudWxsXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdxdWVyeVN0cmluZycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogbnVsbFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAnSW50ZXJuYWxFcnJvcicsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEludGVybmFsRXJyb3Jcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ05vdEZvdW5kRXJyb3InLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBOb3RGb3VuZEVycm9yXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1JvdXRlcy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUm91dGVzID0gdm9pZCAwO1xudmFyIEFwcFJvdXRlcyA9IHt9O1xudmFyIF9yZXF1aXJlID0gcmVxdWlyZTtcbnZhciBpbXBvcnRlZCA9IGZhbHNlO1xudmFyIHJ1bkltcG9ydCA9ICgpID0+IHtcbiAgaWYgKGltcG9ydGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIDtcbiAgdHJ5IHtcbiAgICBPYmplY3QuYXNzaWduKEFwcFJvdXRlcywgX3JlcXVpcmUoJ1JvdXRlcycpLlJvdXRlcyB8fCB7fSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgZ2xvYmFsVGhpcy5kZXZNb2RlID09PSB0cnVlICYmIGNvbnNvbGUud2FybihlcnJvcik7XG4gIH1cbiAgaW1wb3J0ZWQgPSB0cnVlO1xufTtcbmNsYXNzIFJvdXRlcyB7XG4gIHN0YXRpYyBnZXQobmFtZSkge1xuICAgIHJ1bkltcG9ydCgpO1xuICAgIHJldHVybiB0aGlzLnJvdXRlc1tuYW1lXTtcbiAgfVxuICBzdGF0aWMgZHVtcCgpIHtcbiAgICBydW5JbXBvcnQoKTtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXM7XG4gIH1cbn1cbmV4cG9ydHMuUm91dGVzID0gUm91dGVzO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlcywgJ3JvdXRlcycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEFwcFJvdXRlc1xufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9SdWxlU2V0LmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5SdWxlU2V0ID0gdm9pZCAwO1xudmFyIF9Eb20gPSByZXF1aXJlKFwiLi9Eb21cIik7XG52YXIgX1RhZyA9IHJlcXVpcmUoXCIuL1RhZ1wiKTtcbnZhciBfVmlldyA9IHJlcXVpcmUoXCIuL1ZpZXdcIik7XG5jbGFzcyBSdWxlU2V0IHtcbiAgc3RhdGljIGFkZChzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmdsb2JhbFJ1bGVzID0gdGhpcy5nbG9iYWxSdWxlcyB8fCB7fTtcbiAgICB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXSA9IHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdIHx8IFtdO1xuICAgIHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdLnB1c2goY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHN0YXRpYyBhcHBseShkb2MgPSBkb2N1bWVudCwgdmlldyA9IG51bGwpIHtcbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiB0aGlzLmdsb2JhbFJ1bGVzKSB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdW2ldO1xuICAgICAgICB2YXIgd3JhcHBlZCA9IHRoaXMud3JhcChkb2MsIGNhbGxiYWNrLCB2aWV3KTtcbiAgICAgICAgdmFyIG5vZGVzID0gZG9jLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBmb3IgKHZhciBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgd3JhcHBlZChub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBhZGQoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5ydWxlcyA9IHRoaXMucnVsZXMgfHwge307XG4gICAgdGhpcy5ydWxlc1tzZWxlY3Rvcl0gPSB0aGlzLnJ1bGVzW3NlbGVjdG9yXSB8fCBbXTtcbiAgICB0aGlzLnJ1bGVzW3NlbGVjdG9yXS5wdXNoKGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBhcHBseShkb2MgPSBkb2N1bWVudCwgdmlldyA9IG51bGwpIHtcbiAgICBSdWxlU2V0LmFwcGx5KGRvYywgdmlldyk7XG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gdGhpcy5ydWxlcykge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnJ1bGVzW3NlbGVjdG9yXSkge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLnJ1bGVzW3NlbGVjdG9yXVtpXTtcbiAgICAgICAgdmFyIHdyYXBwZWQgPSBSdWxlU2V0LndyYXAoZG9jLCBjYWxsYmFjaywgdmlldyk7XG4gICAgICAgIHZhciBub2RlcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZm9yICh2YXIgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgIHdyYXBwZWQobm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcHVyZ2UoKSB7XG4gICAgaWYgKCF0aGlzLnJ1bGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAodmFyIFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnJ1bGVzKSkge1xuICAgICAgaWYgKCF0aGlzLnJ1bGVzW2tdKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIga2sgaW4gdGhpcy5ydWxlc1trXSkge1xuICAgICAgICBkZWxldGUgdGhpcy5ydWxlc1trXVtra107XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHN0YXRpYyB3YWl0KGV2ZW50ID0gJ0RPTUNvbnRlbnRMb2FkZWQnLCBub2RlID0gZG9jdW1lbnQpIHtcbiAgICB2YXIgbGlzdGVuZXIgPSAoKGV2ZW50LCBub2RlKSA9PiAoKSA9PiB7XG4gICAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzLmFwcGx5KCk7XG4gICAgfSkoZXZlbnQsIG5vZGUpO1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICB9XG4gIHN0YXRpYyB3cmFwKGRvYywgb3JpZ2luYWxDYWxsYmFjaywgdmlldyA9IG51bGwpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBvcmlnaW5hbENhbGxiYWNrO1xuICAgIGlmIChvcmlnaW5hbENhbGxiYWNrIGluc3RhbmNlb2YgX1ZpZXcuVmlldyB8fCBvcmlnaW5hbENhbGxiYWNrICYmIG9yaWdpbmFsQ2FsbGJhY2sucHJvdG90eXBlICYmIG9yaWdpbmFsQ2FsbGJhY2sucHJvdG90eXBlIGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgY2FsbGJhY2sgPSAoKSA9PiBvcmlnaW5hbENhbGxiYWNrO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudCA9PiB7XG4gICAgICBpZiAodHlwZW9mIGVsZW1lbnQuX19fY3ZBcHBsaWVkX19fID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZWxlbWVudCwgJ19fX2N2QXBwbGllZF9fXycsIHtcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgICAgdmFsdWU6IG5ldyBXZWFrU2V0KClcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoZWxlbWVudC5fX19jdkFwcGxpZWRfX18uaGFzKG9yaWdpbmFsQ2FsbGJhY2spKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBkaXJlY3QsIHBhcmVudFZpZXc7XG4gICAgICBpZiAodmlldykge1xuICAgICAgICBkaXJlY3QgPSBwYXJlbnRWaWV3ID0gdmlldztcbiAgICAgICAgaWYgKHZpZXcudmlld0xpc3QpIHtcbiAgICAgICAgICBwYXJlbnRWaWV3ID0gdmlldy52aWV3TGlzdC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciB0YWcgPSBuZXcgX1RhZy5UYWcoZWxlbWVudCwgcGFyZW50VmlldywgbnVsbCwgdW5kZWZpbmVkLCBkaXJlY3QpO1xuICAgICAgdmFyIHBhcmVudCA9IHRhZy5lbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICB2YXIgc2libGluZyA9IHRhZy5lbGVtZW50Lm5leHRTaWJsaW5nO1xuICAgICAgdmFyIHJlc3VsdCA9IGNhbGxiYWNrKHRhZyk7XG4gICAgICBpZiAocmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgICBlbGVtZW50Ll9fX2N2QXBwbGllZF9fXy5hZGQob3JpZ2luYWxDYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IF9UYWcuVGFnKHJlc3VsdCk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgICAgaWYgKCFyZXN1bHQuZWxlbWVudC5jb250YWlucyh0YWcuZWxlbWVudCkpIHtcbiAgICAgICAgICB3aGlsZSAodGFnLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgcmVzdWx0LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGFnLmVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2libGluZykge1xuICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUocmVzdWx0LmVsZW1lbnQsIHNpYmxpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChyZXN1bHQuZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnByb3RvdHlwZSAmJiByZXN1bHQucHJvdG90eXBlIGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICByZXN1bHQgPSBuZXcgcmVzdWx0KHt9LCB2aWV3KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgdmlldy5jbGVhbnVwLnB1c2goKCkgPT4gcmVzdWx0LnJlbW92ZSgpKTtcbiAgICAgICAgICB2aWV3LmNsZWFudXAucHVzaCh2aWV3LmFyZ3MuYmluZFRvKCh2LCBrLCB0KSA9PiB7XG4gICAgICAgICAgICB0W2tdID0gdjtcbiAgICAgICAgICAgIHJlc3VsdC5hcmdzW2tdID0gdjtcbiAgICAgICAgICB9KSk7XG4gICAgICAgICAgdmlldy5jbGVhbnVwLnB1c2gocmVzdWx0LmFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgICB0W2tdID0gdjtcbiAgICAgICAgICAgIHZpZXcuYXJnc1trXSA9IHY7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIHRhZy5jbGVhcigpO1xuICAgICAgICByZXN1bHQucmVuZGVyKHRhZy5lbGVtZW50KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG5leHBvcnRzLlJ1bGVTZXQgPSBSdWxlU2V0O1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5TZXRNYXAgPSB2b2lkIDA7XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkoZSwgciwgdCkgeyByZXR1cm4gKHIgPSBfdG9Qcm9wZXJ0eUtleShyKSkgaW4gZSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCByLCB7IHZhbHVlOiB0LCBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwIH0pIDogZVtyXSA9IHQsIGU7IH1cbmZ1bmN0aW9uIF90b1Byb3BlcnR5S2V5KHQpIHsgdmFyIGkgPSBfdG9QcmltaXRpdmUodCwgXCJzdHJpbmdcIik7IHJldHVybiBcInN5bWJvbFwiID09IHR5cGVvZiBpID8gaSA6IGkgKyBcIlwiOyB9XG5mdW5jdGlvbiBfdG9QcmltaXRpdmUodCwgcikgeyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgdCB8fCAhdCkgcmV0dXJuIHQ7IHZhciBlID0gdFtTeW1ib2wudG9QcmltaXRpdmVdOyBpZiAodm9pZCAwICE9PSBlKSB7IHZhciBpID0gZS5jYWxsKHQsIHIgfHwgXCJkZWZhdWx0XCIpOyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgaSkgcmV0dXJuIGk7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJAQHRvUHJpbWl0aXZlIG11c3QgcmV0dXJuIGEgcHJpbWl0aXZlIHZhbHVlLlwiKTsgfSByZXR1cm4gKFwic3RyaW5nXCIgPT09IHIgPyBTdHJpbmcgOiBOdW1iZXIpKHQpOyB9XG5jbGFzcyBTZXRNYXAge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBfZGVmaW5lUHJvcGVydHkodGhpcywgXCJfbWFwXCIsIG5ldyBNYXAoKSk7XG4gIH1cbiAgaGFzKGtleSkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuaGFzKGtleSk7XG4gIH1cbiAgZ2V0KGtleSkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuZ2V0KGtleSk7XG4gIH1cbiAgZ2V0T25lKGtleSkge1xuICAgIHZhciBzZXQgPSB0aGlzLmdldChrZXkpO1xuICAgIGZvciAodmFyIGVudHJ5IG9mIHNldCkge1xuICAgICAgcmV0dXJuIGVudHJ5O1xuICAgIH1cbiAgfVxuICBhZGQoa2V5LCB2YWx1ZSkge1xuICAgIHZhciBzZXQgPSB0aGlzLl9tYXAuZ2V0KGtleSk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHRoaXMuX21hcC5zZXQoa2V5LCBzZXQgPSBuZXcgU2V0KCkpO1xuICAgIH1cbiAgICByZXR1cm4gc2V0LmFkZCh2YWx1ZSk7XG4gIH1cbiAgcmVtb3ZlKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy5fbWFwLmdldChrZXkpO1xuICAgIGlmICghc2V0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXMgPSBzZXQuZGVsZXRlKHZhbHVlKTtcbiAgICBpZiAoIXNldC5zaXplKSB7XG4gICAgICB0aGlzLl9tYXAuZGVsZXRlKGtleSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cbiAgdmFsdWVzKCkge1xuICAgIHJldHVybiBuZXcgU2V0KC4uLlsuLi50aGlzLl9tYXAudmFsdWVzKCldLm1hcChzZXQgPT4gWy4uLnNldC52YWx1ZXMoKV0pKTtcbiAgfVxufVxuZXhwb3J0cy5TZXRNYXAgPSBTZXRNYXA7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9UYWcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlRhZyA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBDdXJyZW50U3R5bGUgPSBTeW1ib2woJ0N1cnJlbnRTdHlsZScpO1xudmFyIEN1cnJlbnRBdHRycyA9IFN5bWJvbCgnQ3VycmVudEF0dHJzJyk7XG52YXIgc3R5bGVyID0gZnVuY3Rpb24gKHN0eWxlcykge1xuICBpZiAoIXRoaXMubm9kZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdHlsZXMpIHtcbiAgICB2YXIgc3RyaW5nZWRQcm9wZXJ0eSA9IFN0cmluZyhzdHlsZXNbcHJvcGVydHldKTtcbiAgICBpZiAodGhpc1tDdXJyZW50U3R5bGVdLmhhcyhwcm9wZXJ0eSkgJiYgdGhpc1tDdXJyZW50U3R5bGVdLmdldChwcm9wZXJ0eSkgPT09IHN0eWxlc1twcm9wZXJ0eV0gfHwgTnVtYmVyLmlzTmFOKHN0eWxlc1twcm9wZXJ0eV0pKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKHByb3BlcnR5WzBdID09PSAnLScpIHtcbiAgICAgIHRoaXMubm9kZS5zdHlsZS5zZXRQcm9wZXJ0eShwcm9wZXJ0eSwgc3RyaW5nZWRQcm9wZXJ0eSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubm9kZS5zdHlsZVtwcm9wZXJ0eV0gPSBzdHJpbmdlZFByb3BlcnR5O1xuICAgIH1cbiAgICBpZiAoc3R5bGVzW3Byb3BlcnR5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uc2V0KHByb3BlcnR5LCBzdHlsZXNbcHJvcGVydHldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLmRlbGV0ZShwcm9wZXJ0eSk7XG4gICAgfVxuICB9XG59O1xudmFyIGdldHRlciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIGlmICh0eXBlb2YgdGhpc1tuYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0aGlzW25hbWVdO1xuICB9XG4gIGlmICh0aGlzLm5vZGUgJiYgdHlwZW9mIHRoaXMubm9kZVtuYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0aGlzW25hbWVdID0gKC4uLmFyZ3MpID0+IHRoaXMubm9kZVtuYW1lXSguLi5hcmdzKTtcbiAgfVxuICBpZiAobmFtZSA9PT0gJ3N0eWxlJykge1xuICAgIHJldHVybiB0aGlzLnByb3h5LnN0eWxlO1xuICB9XG4gIGlmICh0aGlzLm5vZGUgJiYgbmFtZSBpbiB0aGlzLm5vZGUpIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlW25hbWVdO1xuICB9XG4gIHJldHVybiB0aGlzW25hbWVdO1xufTtcbmNsYXNzIFRhZyB7XG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIHBhcmVudCwgcmVmLCBpbmRleCwgZGlyZWN0KSB7XG4gICAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgdmFyIHN1YmRvYyA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KGVsZW1lbnQpO1xuICAgICAgZWxlbWVudCA9IHN1YmRvYy5maXJzdENoaWxkO1xuICAgIH1cbiAgICB0aGlzLmVsZW1lbnQgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKGVsZW1lbnQpO1xuICAgIHRoaXMubm9kZSA9IHRoaXMuZWxlbWVudDtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLmRpcmVjdCA9IGRpcmVjdDtcbiAgICB0aGlzLnJlZiA9IHJlZjtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5jbGVhbnVwID0gW107XG4gICAgdGhpc1tfQmluZGFibGUuQmluZGFibGUuT25BbGxHZXRdID0gZ2V0dGVyLmJpbmQodGhpcyk7XG4gICAgdGhpc1tDdXJyZW50U3R5bGVdID0gbmV3IE1hcCgpO1xuICAgIHRoaXNbQ3VycmVudEF0dHJzXSA9IG5ldyBNYXAoKTtcbiAgICB2YXIgYm91bmRTdHlsZXIgPSBfQmluZGFibGUuQmluZGFibGUubWFrZShzdHlsZXIuYmluZCh0aGlzKSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdzdHlsZScsIHtcbiAgICAgIHZhbHVlOiBib3VuZFN0eWxlclxuICAgIH0pO1xuICAgIHRoaXMucHJveHkgPSBfQmluZGFibGUuQmluZGFibGUubWFrZSh0aGlzKTtcbiAgICB0aGlzLnByb3h5LnN0eWxlLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgaWYgKHRoaXNbQ3VycmVudFN0eWxlXS5oYXMoaykgJiYgdGhpc1tDdXJyZW50U3R5bGVdLmdldChrKSA9PT0gdikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLm5vZGUuc3R5bGVba10gPSB2O1xuICAgICAgaWYgKCFkICYmIHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uc2V0KGssIHYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLmRlbGV0ZShrKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnByb3h5LmJpbmRUbygodiwgaykgPT4ge1xuICAgICAgaWYgKGsgPT09ICdpbmRleCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGsgaW4gZWxlbWVudCAmJiBlbGVtZW50W2tdICE9PSB2KSB7XG4gICAgICAgIGVsZW1lbnRba10gPSB2O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnByb3h5O1xuICB9XG4gIGF0dHIoYXR0cmlidXRlcykge1xuICAgIGZvciAodmFyIGF0dHJpYnV0ZSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICBpZiAodGhpc1tDdXJyZW50QXR0cnNdLmhhcyhhdHRyaWJ1dGUpICYmIGF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgICAgICAgdGhpc1tDdXJyZW50QXR0cnNdLmRlbGV0ZShhdHRyaWJ1dGUpO1xuICAgICAgfSBlbHNlIGlmICghdGhpc1tDdXJyZW50QXR0cnNdLmhhcyhhdHRyaWJ1dGUpIHx8IHRoaXNbQ3VycmVudEF0dHJzXS5nZXQoYXR0cmlidXRlKSAhPT0gYXR0cmlidXRlc1thdHRyaWJ1dGVdKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLm5vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZSwgJycpO1xuICAgICAgICAgIHRoaXNbQ3VycmVudEF0dHJzXS5zZXQoYXR0cmlidXRlLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5ub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsIGF0dHJpYnV0ZXNbYXR0cmlidXRlXSk7XG4gICAgICAgICAgdGhpc1tDdXJyZW50QXR0cnNdLnNldChhdHRyaWJ1dGUsIGF0dHJpYnV0ZXNbYXR0cmlidXRlXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgcmVtb3ZlKCkge1xuICAgIGlmICh0aGlzLm5vZGUpIHtcbiAgICAgIHRoaXMubm9kZS5yZW1vdmUoKTtcbiAgICB9XG4gICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcyk7XG4gICAgdmFyIGNsZWFudXA7XG4gICAgd2hpbGUgKGNsZWFudXAgPSB0aGlzLmNsZWFudXAuc2hpZnQoKSkge1xuICAgICAgY2xlYW51cCgpO1xuICAgIH1cbiAgICB0aGlzLmNsZWFyKCk7XG4gICAgaWYgKCF0aGlzLm5vZGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGRldGFjaEV2ZW50ID0gbmV3IEV2ZW50KCdjdkRvbURldGFjaGVkJyk7XG4gICAgdGhpcy5ub2RlLmRpc3BhdGNoRXZlbnQoZGV0YWNoRXZlbnQpO1xuICAgIHRoaXMubm9kZSA9IHRoaXMuZWxlbWVudCA9IHRoaXMucmVmID0gdGhpcy5wYXJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cbiAgY2xlYXIoKSB7XG4gICAgaWYgKCF0aGlzLm5vZGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGRldGFjaEV2ZW50ID0gbmV3IEV2ZW50KCdjdkRvbURldGFjaGVkJyk7XG4gICAgd2hpbGUgKHRoaXMubm9kZS5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLm5vZGUuZmlyc3RDaGlsZC5kaXNwYXRjaEV2ZW50KGRldGFjaEV2ZW50KTtcbiAgICAgIHRoaXMubm9kZS5yZW1vdmVDaGlsZCh0aGlzLm5vZGUuZmlyc3RDaGlsZCk7XG4gICAgfVxuICB9XG4gIHBhdXNlKHBhdXNlZCA9IHRydWUpIHt9XG4gIGxpc3RlbihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLm5vZGU7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIHZhciByZW1vdmUgPSAoKSA9PiB7XG4gICAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB2YXIgcmVtb3ZlciA9ICgpID0+IHtcbiAgICAgIHJlbW92ZSgpO1xuICAgICAgcmVtb3ZlID0gKCkgPT4gY29uc29sZS53YXJuKCdBbHJlYWR5IHJlbW92ZWQhJyk7XG4gICAgfTtcbiAgICB0aGlzLnBhcmVudC5vblJlbW92ZSgoKSA9PiByZW1vdmVyKCkpO1xuICAgIHJldHVybiByZW1vdmVyO1xuICB9XG59XG5leHBvcnRzLlRhZyA9IFRhZztcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1V1aWQuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlV1aWQgPSB2b2lkIDA7XG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkoZSwgciwgdCkgeyByZXR1cm4gKHIgPSBfdG9Qcm9wZXJ0eUtleShyKSkgaW4gZSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCByLCB7IHZhbHVlOiB0LCBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwIH0pIDogZVtyXSA9IHQsIGU7IH1cbmZ1bmN0aW9uIF90b1Byb3BlcnR5S2V5KHQpIHsgdmFyIGkgPSBfdG9QcmltaXRpdmUodCwgXCJzdHJpbmdcIik7IHJldHVybiBcInN5bWJvbFwiID09IHR5cGVvZiBpID8gaSA6IGkgKyBcIlwiOyB9XG5mdW5jdGlvbiBfdG9QcmltaXRpdmUodCwgcikgeyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgdCB8fCAhdCkgcmV0dXJuIHQ7IHZhciBlID0gdFtTeW1ib2wudG9QcmltaXRpdmVdOyBpZiAodm9pZCAwICE9PSBlKSB7IHZhciBpID0gZS5jYWxsKHQsIHIgfHwgXCJkZWZhdWx0XCIpOyBpZiAoXCJvYmplY3RcIiAhPSB0eXBlb2YgaSkgcmV0dXJuIGk7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJAQHRvUHJpbWl0aXZlIG11c3QgcmV0dXJuIGEgcHJpbWl0aXZlIHZhbHVlLlwiKTsgfSByZXR1cm4gKFwic3RyaW5nXCIgPT09IHIgPyBTdHJpbmcgOiBOdW1iZXIpKHQpOyB9XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbnZhciBjcnlwdG8gPSB3aW4uY3J5cHRvO1xuY2xhc3MgVXVpZCB7XG4gIGNvbnN0cnVjdG9yKHV1aWQgPSBudWxsLCB2ZXJzaW9uID0gNCkge1xuICAgIF9kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInV1aWRcIiwgbnVsbCk7XG4gICAgX2RlZmluZVByb3BlcnR5KHRoaXMsIFwidmVyc2lvblwiLCA0KTtcbiAgICBpZiAodXVpZCkge1xuICAgICAgaWYgKHR5cGVvZiB1dWlkICE9PSAnc3RyaW5nJyAmJiAhKHV1aWQgaW5zdGFuY2VvZiBVdWlkKSB8fCAhdXVpZC5tYXRjaCgvWzAtOUEtRmEtZl17OH0oLVswLTlBLUZhLWZdezR9KXszfS1bMC05QS1GYS1mXXsxMn0vKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgaW5wdXQgZm9yIFV1aWQ6IFwiJHt1dWlkfVwiYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnZlcnNpb24gPSB2ZXJzaW9uO1xuICAgICAgdGhpcy51dWlkID0gdXVpZDtcbiAgICB9IGVsc2UgaWYgKGNyeXB0byAmJiB0eXBlb2YgY3J5cHRvLnJhbmRvbVVVSUQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMudXVpZCA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBpbml0ID0gWzFlN10gKyAtMWUzICsgLTRlMyArIC04ZTMgKyAtMWUxMTtcbiAgICAgIHZhciByYW5kID0gY3J5cHRvICYmIHR5cGVvZiBjcnlwdG8ucmFuZG9tVVVJRCA9PT0gJ2Z1bmN0aW9uJyA/ICgpID0+IGNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQ4QXJyYXkoMSkpWzBdIDogKCkgPT4gTWF0aC50cnVuYyhNYXRoLnJhbmRvbSgpICogMjU2KTtcbiAgICAgIHRoaXMudXVpZCA9IGluaXQucmVwbGFjZSgvWzAxOF0vZywgYyA9PiAoYyBeIHJhbmQoKSAmIDE1ID4+IGMgLyA0KS50b1N0cmluZygxNikpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9XG4gIFtTeW1ib2wudG9QcmltaXRpdmVdKCkge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMudXVpZDtcbiAgfVxuICB0b0pzb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZlcnNpb246IHRoaXMudmVyc2lvbixcbiAgICAgIHV1aWQ6IHRoaXMudXVpZFxuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuVXVpZCA9IFV1aWQ7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9WaWV3LmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5WaWV3ID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIF9WaWV3TGlzdCA9IHJlcXVpcmUoXCIuL1ZpZXdMaXN0XCIpO1xudmFyIF9Sb3V0ZXIgPSByZXF1aXJlKFwiLi9Sb3V0ZXJcIik7XG52YXIgX1V1aWQgPSByZXF1aXJlKFwiLi9VdWlkXCIpO1xudmFyIF9Eb20gPSByZXF1aXJlKFwiLi9Eb21cIik7XG52YXIgX1RhZyA9IHJlcXVpcmUoXCIuL1RhZ1wiKTtcbnZhciBfQmFnID0gcmVxdWlyZShcIi4vQmFnXCIpO1xudmFyIF9SdWxlU2V0ID0gcmVxdWlyZShcIi4vUnVsZVNldFwiKTtcbnZhciBfTWl4aW4gPSByZXF1aXJlKFwiLi9NaXhpblwiKTtcbnZhciBfRXZlbnRUYXJnZXRNaXhpbiA9IHJlcXVpcmUoXCIuLi9taXhpbi9FdmVudFRhcmdldE1peGluXCIpO1xudmFyIGRvbnRQYXJzZSA9IFN5bWJvbCgnZG9udFBhcnNlJyk7XG52YXIgZXhwYW5kQmluZCA9IFN5bWJvbCgnZXhwYW5kQmluZCcpO1xudmFyIHV1aWQgPSBTeW1ib2woJ3V1aWQnKTtcbmNsYXNzIFZpZXcgZXh0ZW5kcyBfTWl4aW4uTWl4aW4ud2l0aChfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluKSB7XG4gIGdldCBfaWQoKSB7XG4gICAgcmV0dXJuIHRoaXNbdXVpZF07XG4gIH1cbiAgc3RhdGljIGZyb20odGVtcGxhdGUsIGFyZ3MgPSB7fSwgbWFpblZpZXcgPSBudWxsKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgdGhpcyhhcmdzLCBtYWluVmlldyk7XG4gICAgdmlldy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHJldHVybiB2aWV3O1xuICB9XG4gIGNvbnN0cnVjdG9yKGFyZ3MgPSB7fSwgbWFpblZpZXcgPSBudWxsKSB7XG4gICAgc3VwZXIoYXJncywgbWFpblZpZXcpO1xuICAgIHRoaXNbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gbWFpblZpZXc7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhcmdzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKGFyZ3MpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHV1aWQsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNvbnN0cnVjdG9yLnV1aWQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm9kZXNBdHRhY2hlZCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX0JhZy5CYWcoKGksIHMsIGEpID0+IHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm9kZXNEZXRhY2hlZCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX0JhZy5CYWcoKGksIHMsIGEpID0+IHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX29uUmVtb3ZlJywge1xuICAgICAgdmFsdWU6IG5ldyBfQmFnLkJhZygoaSwgcywgYSkgPT4ge30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjbGVhbnVwJywge1xuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwYXJlbnQnLCB7XG4gICAgICB2YWx1ZTogbWFpblZpZXcsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndmlld3MnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd2aWV3TGlzdHMnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd3aXRoVmlld3MnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd0YWdzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm9kZXMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoW10pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd0aW1lb3V0cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ludGVydmFscycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ZyYW1lcycsIHtcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncnVsZVNldCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX1J1bGVTZXQuUnVsZVNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVSdWxlU2V0Jywge1xuICAgICAgdmFsdWU6IG5ldyBfUnVsZVNldC5SdWxlU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N1YkJpbmRpbmdzJywge1xuICAgICAgdmFsdWU6IHt9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd0ZW1wbGF0ZXMnLCB7XG4gICAgICB2YWx1ZToge31cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3Bvc3RNYXBwaW5nJywge1xuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZXZlbnRDbGVhbnVwJywge1xuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd1bnBhdXNlQ2FsbGJhY2tzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaW50ZXJwb2xhdGVSZWdleCcsIHtcbiAgICAgIHZhbHVlOiAvKFxcW1xcWygoPzpcXCQrKT9bXFx3XFwuXFx8LV0rKVxcXVxcXSkvZ1xuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVuZGVyZWQnLCB7XG4gICAgICB2YWx1ZTogbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KSA9PiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbmRlckNvbXBsZXRlJywge1xuICAgICAgICB2YWx1ZTogYWNjZXB0XG4gICAgICB9KSlcbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIGlmICghdGhpc1tfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpc1tfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSBudWxsO1xuICAgIH0pO1xuICAgIHRoaXMuY29udHJvbGxlciA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IGBgO1xuICAgIHRoaXMuZmlyc3ROb2RlID0gbnVsbDtcbiAgICB0aGlzLmxhc3ROb2RlID0gbnVsbDtcbiAgICB0aGlzLnZpZXdMaXN0ID0gbnVsbDtcbiAgICB0aGlzLm1haW5WaWV3ID0gbnVsbDtcbiAgICB0aGlzLnByZXNlcnZlID0gZmFsc2U7XG4gICAgdGhpcy5yZW1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5sb2FkZWQgPSBQcm9taXNlLnJlc29sdmUodGhpcyk7XG5cbiAgICAvLyByZXR1cm4gQmluZGFibGUubWFrZSh0aGlzKTtcbiAgfVxuICBzdGF0aWMgaXNWaWV3KCkge1xuICAgIHJldHVybiBWaWV3O1xuICB9XG4gIG9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICB2YXIgc3RvcHBlZCA9IGZhbHNlO1xuICAgIHZhciBjYW5jZWwgPSAoKSA9PiB7XG4gICAgICBzdG9wcGVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIHZhciBjID0gdGltZXN0YW1wID0+IHtcbiAgICAgIGlmICh0aGlzLnJlbW92ZWQgfHwgc3RvcHBlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgICAgIGNhbGxiYWNrKERhdGUubm93KCkpO1xuICAgICAgfVxuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGMpO1xuICAgIH07XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGMoRGF0ZS5ub3coKSkpO1xuICAgIHRoaXMuZnJhbWVzLnB1c2goY2FuY2VsKTtcbiAgICByZXR1cm4gY2FuY2VsO1xuICB9XG4gIG9uTmV4dEZyYW1lKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSk7XG4gIH1cbiAgb25JZGxlKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHJlcXVlc3RJZGxlQ2FsbGJhY2soKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSkpO1xuICB9XG4gIG9uVGltZW91dCh0aW1lLCBjYWxsYmFjaykge1xuICAgIHZhciB0aW1lb3V0SW5mbyA9IHtcbiAgICAgIHRpbWVvdXQ6IG51bGwsXG4gICAgICBjYWxsYmFjazogbnVsbCxcbiAgICAgIHRpbWU6IHRpbWUsXG4gICAgICBmaXJlZDogZmFsc2UsXG4gICAgICBjcmVhdGVkOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgIHBhdXNlZDogZmFsc2VcbiAgICB9O1xuICAgIHZhciB3cmFwcGVkQ2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgICAgdGltZW91dEluZm8uZmlyZWQgPSB0cnVlO1xuICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dEluZm8udGltZW91dCk7XG4gICAgfTtcbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQod3JhcHBlZENhbGxiYWNrLCB0aW1lKTtcbiAgICB0aW1lb3V0SW5mby5jYWxsYmFjayA9IHdyYXBwZWRDYWxsYmFjaztcbiAgICB0aW1lb3V0SW5mby50aW1lb3V0ID0gdGltZW91dDtcbiAgICB0aGlzLnRpbWVvdXRzLnNldCh0aW1lb3V0SW5mby50aW1lb3V0LCB0aW1lb3V0SW5mbyk7XG4gICAgcmV0dXJuIHRpbWVvdXQ7XG4gIH1cbiAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpIHtcbiAgICBpZiAoIXRoaXMudGltZW91dHMuaGFzKHRpbWVvdXQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0SW5mbyA9IHRoaXMudGltZW91dHMuZ2V0KHRpbWVvdXQpO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgfVxuICBvbkludGVydmFsKHRpbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRJbnRlcnZhbChjYWxsYmFjaywgdGltZSk7XG4gICAgdGhpcy5pbnRlcnZhbHMuc2V0KHRpbWVvdXQsIHtcbiAgICAgIHRpbWVvdXQ6IHRpbWVvdXQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICB0aW1lOiB0aW1lLFxuICAgICAgcGF1c2VkOiBmYWxzZVxuICAgIH0pO1xuICAgIHJldHVybiB0aW1lb3V0O1xuICB9XG4gIGNsZWFySW50ZXJ2YWwodGltZW91dCkge1xuICAgIGlmICghdGhpcy5pbnRlcnZhbHMuaGFzKHRpbWVvdXQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0SW5mbyA9IHRoaXMuaW50ZXJ2YWxzLmdldCh0aW1lb3V0KTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dEluZm8udGltZW91dCk7XG4gICAgdGhpcy5pbnRlcnZhbHMuZGVsZXRlKHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICB9XG4gIHBhdXNlKHBhdXNlZCA9IHVuZGVmaW5lZCkge1xuICAgIGlmIChwYXVzZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wYXVzZWQgPSAhdGhpcy5wYXVzZWQ7XG4gICAgfVxuICAgIHRoaXMucGF1c2VkID0gcGF1c2VkO1xuICAgIGlmICh0aGlzLnBhdXNlZCkge1xuICAgICAgZm9yICh2YXIgW2NhbGxiYWNrLCB0aW1lb3V0XSBvZiB0aGlzLnRpbWVvdXRzKSB7XG4gICAgICAgIGlmICh0aW1lb3V0LmZpcmVkKSB7XG4gICAgICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dC50aW1lb3V0KTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dC50aW1lb3V0KTtcbiAgICAgICAgdGltZW91dC5wYXVzZWQgPSB0cnVlO1xuICAgICAgICB0aW1lb3V0LnRpbWUgPSBNYXRoLm1heCgwLCB0aW1lb3V0LnRpbWUgLSAoRGF0ZS5ub3coKSAtIHRpbWVvdXQuY3JlYXRlZCkpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgW19jYWxsYmFjaywgX3RpbWVvdXRdIG9mIHRoaXMuaW50ZXJ2YWxzKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoX3RpbWVvdXQudGltZW91dCk7XG4gICAgICAgIF90aW1lb3V0LnBhdXNlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIFtfY2FsbGJhY2syLCBfdGltZW91dDJdIG9mIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgaWYgKCFfdGltZW91dDIucGF1c2VkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF90aW1lb3V0Mi5maXJlZCkge1xuICAgICAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKF90aW1lb3V0Mi50aW1lb3V0KTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBfdGltZW91dDIudGltZW91dCA9IHNldFRpbWVvdXQoX3RpbWVvdXQyLmNhbGxiYWNrLCBfdGltZW91dDIudGltZSk7XG4gICAgICAgIF90aW1lb3V0Mi5wYXVzZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIFtfY2FsbGJhY2szLCBfdGltZW91dDNdIG9mIHRoaXMuaW50ZXJ2YWxzKSB7XG4gICAgICAgIGlmICghX3RpbWVvdXQzLnBhdXNlZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIF90aW1lb3V0My50aW1lb3V0ID0gc2V0SW50ZXJ2YWwoX3RpbWVvdXQzLmNhbGxiYWNrLCBfdGltZW91dDMudGltZSk7XG4gICAgICAgIF90aW1lb3V0My5wYXVzZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIFssIF9jYWxsYmFjazRdIG9mIHRoaXMudW5wYXVzZUNhbGxiYWNrcykge1xuICAgICAgICBfY2FsbGJhY2s0KCk7XG4gICAgICB9XG4gICAgICB0aGlzLnVucGF1c2VDYWxsYmFja3MuY2xlYXIoKTtcbiAgICB9XG4gICAgZm9yICh2YXIgW3RhZywgdmlld0xpc3RdIG9mIHRoaXMudmlld0xpc3RzKSB7XG4gICAgICB2aWV3TGlzdC5wYXVzZSghIXBhdXNlZCk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy50YWdzKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLnRhZ3NbaV0pKSB7XG4gICAgICAgIGZvciAodmFyIGogaW4gdGhpcy50YWdzW2ldKSB7XG4gICAgICAgICAgdGhpcy50YWdzW2ldW2pdLnBhdXNlKCEhcGF1c2VkKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMudGFnc1tpXS5wYXVzZSghIXBhdXNlZCk7XG4gICAgfVxuICB9XG4gIHJlbmRlcihwYXJlbnROb2RlID0gbnVsbCwgaW5zZXJ0UG9pbnQgPSBudWxsLCBvdXRlclZpZXcgPSBudWxsKSB7XG4gICAgdmFyIHtcbiAgICAgIGRvY3VtZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIGlmIChwYXJlbnROb2RlIGluc3RhbmNlb2YgVmlldykge1xuICAgICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUuZmlyc3ROb2RlLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIGlmIChpbnNlcnRQb2ludCBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgIGluc2VydFBvaW50ID0gaW5zZXJ0UG9pbnQuZmlyc3ROb2RlO1xuICAgIH1cbiAgICBpZiAodGhpcy5maXJzdE5vZGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlUmVuZGVyKHBhcmVudE5vZGUsIGluc2VydFBvaW50LCBvdXRlclZpZXcpO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW5kZXInKSk7XG4gICAgdmFyIHRlbXBsYXRlSXNGcmFnbWVudCA9IHR5cGVvZiB0aGlzLnRlbXBsYXRlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGhpcy50ZW1wbGF0ZS5jbG9uZU5vZGUgPT09ICdmdW5jdGlvbic7XG4gICAgdmFyIHRlbXBsYXRlUGFyc2VkID0gdGVtcGxhdGVJc0ZyYWdtZW50IHx8IFZpZXcudGVtcGxhdGVzLmhhcyh0aGlzLnRlbXBsYXRlKTtcbiAgICB2YXIgc3ViRG9jO1xuICAgIGlmICh0ZW1wbGF0ZVBhcnNlZCkge1xuICAgICAgaWYgKHRlbXBsYXRlSXNGcmFnbWVudCkge1xuICAgICAgICBzdWJEb2MgPSB0aGlzLnRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN1YkRvYyA9IFZpZXcudGVtcGxhdGVzLmdldCh0aGlzLnRlbXBsYXRlKS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1YkRvYyA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHRoaXMudGVtcGxhdGUpO1xuICAgIH1cbiAgICBpZiAoIXRlbXBsYXRlUGFyc2VkICYmICF0ZW1wbGF0ZUlzRnJhZ21lbnQpIHtcbiAgICAgIFZpZXcudGVtcGxhdGVzLnNldCh0aGlzLnRlbXBsYXRlLCBzdWJEb2MuY2xvbmVOb2RlKHRydWUpKTtcbiAgICB9XG4gICAgdGhpcy5tYWluVmlldyB8fCB0aGlzLnByZVJ1bGVTZXQuYXBwbHkoc3ViRG9jLCB0aGlzKTtcbiAgICB0aGlzLm1hcFRhZ3Moc3ViRG9jKTtcbiAgICB0aGlzLm1haW5WaWV3IHx8IHRoaXMucnVsZVNldC5hcHBseShzdWJEb2MsIHRoaXMpO1xuICAgIGlmIChnbG9iYWxUaGlzLmRldk1vZGUgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuZmlyc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChgVGVtcGxhdGUgJHt0aGlzLl9pZH0gU3RhcnRgKTtcbiAgICAgIHRoaXMubGFzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVDb21tZW50KGBUZW1wbGF0ZSAke3RoaXMuX2lkfSBFbmRgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5maXJzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICB0aGlzLmxhc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIH1cbiAgICB0aGlzLm5vZGVzLnB1c2godGhpcy5maXJzdE5vZGUsIC4uLkFycmF5LmZyb20oc3ViRG9jLmNoaWxkTm9kZXMpLCB0aGlzLmxhc3ROb2RlKTtcbiAgICB0aGlzLnBvc3RSZW5kZXIocGFyZW50Tm9kZSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVuZGVyZWQnKSk7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoQXR0YWNoKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgIGlmIChpbnNlcnRQb2ludCkge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgbnVsbCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIG51bGwpO1xuICAgICAgfVxuICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3ViRG9jLCB0aGlzLmxhc3ROb2RlKTtcbiAgICAgIHZhciByb290Tm9kZSA9IHBhcmVudE5vZGUuZ2V0Um9vdE5vZGUoKTtcbiAgICAgIGlmIChyb290Tm9kZS5pc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLmF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlLCBvdXRlclZpZXcpO1xuICAgICAgfSBlbHNlIGlmIChvdXRlclZpZXcpIHtcbiAgICAgICAgdmFyIGZpcnN0RG9tQXR0YWNoID0gZXZlbnQgPT4ge1xuICAgICAgICAgIHZhciByb290Tm9kZSA9IHBhcmVudE5vZGUuZ2V0Um9vdE5vZGUoKTtcbiAgICAgICAgICB0aGlzLmF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgICAgICB0aGlzLmRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUsIG91dGVyVmlldyk7XG4gICAgICAgICAgb3V0ZXJWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2F0dGFjaGVkJywgZmlyc3REb21BdHRhY2gpO1xuICAgICAgICB9O1xuICAgICAgICBvdXRlclZpZXcuYWRkRXZlbnRMaXN0ZW5lcignYXR0YWNoZWQnLCBmaXJzdERvbUF0dGFjaCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucmVuZGVyQ29tcGxldGUodGhpcy5ub2Rlcyk7XG4gICAgcmV0dXJuIHRoaXMubm9kZXM7XG4gIH1cbiAgZGlzcGF0Y2hBdHRhY2goKSB7XG4gICAgdmFyIHtcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhdHRhY2gnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgdGFyZ2V0OiB0aGlzXG4gICAgfSkpO1xuICB9XG4gIGRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUsIHZpZXcgPSB1bmRlZmluZWQpIHtcbiAgICB2YXIge1xuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYXR0YWNoZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICBub2RlOiBwYXJlbnROb2RlLFxuICAgICAgICByb290OiByb290Tm9kZSxcbiAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgdGhpcy5kaXNwYXRjaERvbUF0dGFjaGVkKHZpZXcpO1xuICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIHRoaXMubm9kZXNBdHRhY2hlZC5pdGVtcygpKSB7XG4gICAgICBjYWxsYmFjayhyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgfVxuICB9XG4gIGRpc3BhdGNoRG9tQXR0YWNoZWQodmlldykge1xuICAgIHZhciB7XG4gICAgICBOb2RlLFxuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdGhpcy5ub2Rlcy5maWx0ZXIobiA9PiBuLm5vZGVUeXBlICE9PSBOb2RlLkNPTU1FTlRfTk9ERSkuZm9yRWFjaChjaGlsZCA9PiB7XG4gICAgICBpZiAoIWNoaWxkLm1hdGNoZXMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2hpbGQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tQXR0YWNoZWQnLCB7XG4gICAgICAgIHRhcmdldDogY2hpbGQsXG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgICBfRG9tLkRvbS5tYXBUYWdzKGNoaWxkLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICAgIGlmICghdGFnLm1hdGNoZXMpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkRvbUF0dGFjaGVkJywge1xuICAgICAgICAgIHRhcmdldDogdGFnLFxuICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIHJlUmVuZGVyKHBhcmVudE5vZGUsIGluc2VydFBvaW50LCBvdXRlclZpZXcpIHtcbiAgICB2YXIge1xuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdmFyIHdpbGxSZVJlbmRlciA9IHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlUmVuZGVyJyksIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICB0YXJnZXQ6IHRoaXMsXG4gICAgICB2aWV3OiBvdXRlclZpZXdcbiAgICB9KTtcbiAgICBpZiAoIXdpbGxSZVJlbmRlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgc3ViRG9jID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBpZiAodGhpcy5maXJzdE5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHZhciBkZXRhY2ggPSB0aGlzLm5vZGVzRGV0YWNoZWQuaXRlbXMoKTtcbiAgICAgIGZvciAodmFyIGkgaW4gZGV0YWNoKSB7XG4gICAgICAgIGRldGFjaFtpXSgpO1xuICAgICAgfVxuICAgIH1cbiAgICBzdWJEb2MuYXBwZW5kKC4uLnRoaXMubm9kZXMpO1xuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICBpZiAoaW5zZXJ0UG9pbnQpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIG51bGwpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN1YkRvYywgdGhpcy5sYXN0Tm9kZSk7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZVJlbmRlcmVkJyksIHtcbiAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgICAgdGFyZ2V0OiB0aGlzLFxuICAgICAgICB2aWV3OiBvdXRlclZpZXdcbiAgICAgIH0pO1xuICAgICAgdmFyIHJvb3ROb2RlID0gcGFyZW50Tm9kZS5nZXRSb290Tm9kZSgpO1xuICAgICAgaWYgKHJvb3ROb2RlLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgfVxuICBtYXBUYWdzKHN1YkRvYykge1xuICAgIF9Eb20uRG9tLm1hcFRhZ3Moc3ViRG9jLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICBpZiAodGFnW2RvbnRQYXJzZV0pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRhZy5tYXRjaGVzKSB7XG4gICAgICAgIHRhZyA9IHRoaXMubWFwSW50ZXJwb2xhdGFibGVUYWcodGFnKTtcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi10ZW1wbGF0ZV0nKSAmJiB0aGlzLm1hcFRlbXBsYXRlVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXNsb3RdJykgJiYgdGhpcy5tYXBTbG90VGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXByZXJlbmRlcl0nKSAmJiB0aGlzLm1hcFByZW5kZXJlclRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1saW5rXScpICYmIHRoaXMubWFwTGlua1RhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1hdHRyXScpICYmIHRoaXMubWFwQXR0clRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1leHBhbmRdJykgJiYgdGhpcy5tYXBFeHBhbmRhYmxlVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXJlZl0nKSAmJiB0aGlzLm1hcFJlZlRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1vbl0nKSAmJiB0aGlzLm1hcE9uVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWVhY2hdJykgJiYgdGhpcy5tYXBFYWNoVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWJpbmRdJykgJiYgdGhpcy5tYXBCaW5kVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXdpdGhdJykgJiYgdGhpcy5tYXBXaXRoVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWlmXScpICYmIHRoaXMubWFwSWZUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytdmlld10nKSAmJiB0aGlzLm1hcFZpZXdUYWcodGFnKSB8fCB0YWc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YWcgPSB0aGlzLm1hcEludGVycG9sYXRhYmxlVGFnKHRhZyk7XG4gICAgICB9XG4gICAgICBpZiAodGFnICE9PSB3YWxrZXIuY3VycmVudE5vZGUpIHtcbiAgICAgICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gdGFnO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucG9zdE1hcHBpbmcuZm9yRWFjaChjID0+IGMoKSk7XG4gIH1cbiAgbWFwRXhwYW5kYWJsZVRhZyh0YWcpIHtcbiAgICAvLyBjb25zdCB0YWdDb21waWxlciA9IHRoaXMuY29tcGlsZUV4cGFuZGFibGVUYWcodGFnKTtcbiAgICAvLyBjb25zdCBuZXdUYWcgPSB0YWdDb21waWxlcih0aGlzKTtcbiAgICAvLyB0YWcucmVwbGFjZVdpdGgobmV3VGFnKTtcbiAgICAvLyByZXR1cm4gbmV3VGFnO1xuXG4gICAgdmFyIGV4aXN0aW5nID0gdGFnW2V4cGFuZEJpbmRdO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgZXhpc3RpbmcoKTtcbiAgICAgIHRhZ1tleHBhbmRCaW5kXSA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgW3Byb3h5LCBleHBhbmRQcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZSh0aGlzLmFyZ3MsIHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpLCB0cnVlKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1leHBhbmQnKTtcbiAgICBpZiAoIXByb3h5W2V4cGFuZFByb3BlcnR5XSkge1xuICAgICAgcHJveHlbZXhwYW5kUHJvcGVydHldID0ge307XG4gICAgfVxuICAgIHByb3h5W2V4cGFuZFByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHByb3h5W2V4cGFuZFByb3BlcnR5XSk7XG4gICAgdGhpcy5vblJlbW92ZSh0YWdbZXhwYW5kQmluZF0gPSBwcm94eVtleHBhbmRQcm9wZXJ0eV0uYmluZFRvKCh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICBpZiAoZCB8fCB2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGFnLnJlbW92ZUF0dHJpYnV0ZShrLCB2KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHYgPT09IG51bGwpIHtcbiAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShrLCAnJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoaywgdik7XG4gICAgfSkpO1xuXG4gICAgLy8gbGV0IGV4cGFuZFByb3BlcnR5ID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG4gICAgLy8gbGV0IGV4cGFuZEFyZyA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZShcbiAgICAvLyBcdHRoaXMuYXJnc1tleHBhbmRQcm9wZXJ0eV0gfHwge31cbiAgICAvLyApO1xuXG4gICAgLy8gdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG5cbiAgICAvLyBmb3IobGV0IGkgaW4gZXhwYW5kQXJnKVxuICAgIC8vIHtcbiAgICAvLyBcdGlmKGkgPT09ICduYW1lJyB8fCBpID09PSAndHlwZScpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdGNvbnRpbnVlO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRsZXQgZGViaW5kID0gZXhwYW5kQXJnLmJpbmRUbyhpLCAoKHRhZyxpKT0+KHYpPT57XG4gICAgLy8gXHRcdHRhZy5zZXRBdHRyaWJ1dGUoaSwgdik7XG4gICAgLy8gXHR9KSh0YWcsaSkpO1xuXG4gICAgLy8gXHR0aGlzLm9uUmVtb3ZlKCgpPT57XG4gICAgLy8gXHRcdGRlYmluZCgpO1xuICAgIC8vIFx0XHRpZihleHBhbmRBcmcuaXNCb3VuZCgpKVxuICAgIC8vIFx0XHR7XG4gICAgLy8gXHRcdFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyhleHBhbmRBcmcpO1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHR9KTtcbiAgICAvLyB9XG5cbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gY29tcGlsZUV4cGFuZGFibGVUYWcoc291cmNlVGFnKVxuICAvLyB7XG4gIC8vIFx0cmV0dXJuIChiaW5kaW5nVmlldykgPT4ge1xuXG4gIC8vIFx0XHRjb25zdCB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKHRydWUpO1xuXG4gIC8vIFx0XHRsZXQgZXhwYW5kUHJvcGVydHkgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1leHBhbmQnKTtcbiAgLy8gXHRcdGxldCBleHBhbmRBcmcgPSBCaW5kYWJsZS5tYWtlKFxuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5hcmdzW2V4cGFuZFByb3BlcnR5XSB8fCB7fVxuICAvLyBcdFx0KTtcblxuICAvLyBcdFx0dGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG5cbiAgLy8gXHRcdGZvcihsZXQgaSBpbiBleHBhbmRBcmcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdGlmKGkgPT09ICduYW1lJyB8fCBpID09PSAndHlwZScpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRjb250aW51ZTtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGxldCBkZWJpbmQgPSBleHBhbmRBcmcuYmluZFRvKGksICgodGFnLGkpPT4odik9PntcbiAgLy8gXHRcdFx0XHR0YWcuc2V0QXR0cmlidXRlKGksIHYpO1xuICAvLyBcdFx0XHR9KSh0YWcsaSkpO1xuXG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKCgpPT57XG4gIC8vIFx0XHRcdFx0ZGViaW5kKCk7XG4gIC8vIFx0XHRcdFx0aWYoZXhwYW5kQXJnLmlzQm91bmQoKSlcbiAgLy8gXHRcdFx0XHR7XG4gIC8vIFx0XHRcdFx0XHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKGV4cGFuZEFyZyk7XG4gIC8vIFx0XHRcdFx0fVxuICAvLyBcdFx0XHR9KTtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0cmV0dXJuIHRhZztcbiAgLy8gXHR9O1xuICAvLyB9XG5cbiAgbWFwQXR0clRhZyh0YWcpIHtcbiAgICB2YXIgdGFnQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVBdHRyVGFnKHRhZyk7XG4gICAgdmFyIG5ld1RhZyA9IHRhZ0NvbXBpbGVyKHRoaXMpO1xuICAgIHRhZy5yZXBsYWNlV2l0aChuZXdUYWcpO1xuICAgIHJldHVybiBuZXdUYWc7XG5cbiAgICAvLyBsZXQgYXR0clByb3BlcnR5ID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuXG4gICAgLy8gdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuXG4gICAgLy8gbGV0IHBhaXJzID0gYXR0clByb3BlcnR5LnNwbGl0KCcsJyk7XG4gICAgLy8gbGV0IGF0dHJzID0gcGFpcnMubWFwKChwKSA9PiBwLnNwbGl0KCc6JykpO1xuXG4gICAgLy8gZm9yIChsZXQgaSBpbiBhdHRycylcbiAgICAvLyB7XG4gICAgLy8gXHRsZXQgcHJveHkgICAgICAgID0gdGhpcy5hcmdzO1xuICAgIC8vIFx0bGV0IGJpbmRQcm9wZXJ0eSA9IGF0dHJzW2ldWzFdO1xuICAgIC8vIFx0bGV0IHByb3BlcnR5ICAgICA9IGJpbmRQcm9wZXJ0eTtcblxuICAgIC8vIFx0aWYoYmluZFByb3BlcnR5Lm1hdGNoKC9cXC4vKSlcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0W3Byb3h5LCBwcm9wZXJ0eV0gPSBCaW5kYWJsZS5yZXNvbHZlKFxuICAgIC8vIFx0XHRcdHRoaXMuYXJnc1xuICAgIC8vIFx0XHRcdCwgYmluZFByb3BlcnR5XG4gICAgLy8gXHRcdFx0LCB0cnVlXG4gICAgLy8gXHRcdCk7XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGxldCBhdHRyaWIgPSBhdHRyc1tpXVswXTtcblxuICAgIC8vIFx0dGhpcy5vblJlbW92ZShwcm94eS5iaW5kVG8oXG4gICAgLy8gXHRcdHByb3BlcnR5XG4gICAgLy8gXHRcdCwgKHYpPT57XG4gICAgLy8gXHRcdFx0aWYodiA9PSBudWxsKVxuICAgIC8vIFx0XHRcdHtcbiAgICAvLyBcdFx0XHRcdHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCAnJyk7XG4gICAgLy8gXHRcdFx0XHRyZXR1cm47XG4gICAgLy8gXHRcdFx0fVxuICAgIC8vIFx0XHRcdHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCB2KTtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0KSk7XG4gICAgLy8gfVxuXG4gICAgLy8gcmV0dXJuIHRhZztcbiAgfVxuICBjb21waWxlQXR0clRhZyhzb3VyY2VUYWcpIHtcbiAgICB2YXIgYXR0clByb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuICAgIHZhciBwYWlycyA9IGF0dHJQcm9wZXJ0eS5zcGxpdCgvWyw7XS8pO1xuICAgIHZhciBhdHRycyA9IHBhaXJzLm1hcChwID0+IHAuc3BsaXQoJzonKSk7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtYXR0cicpO1xuICAgIHJldHVybiBiaW5kaW5nVmlldyA9PiB7XG4gICAgICB2YXIgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGJpbmRQcm9wZXJ0eSA9IGF0dHJzW2ldWzFdIHx8IGF0dHJzW2ldWzBdO1xuICAgICAgICB2YXIgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShiaW5kaW5nVmlldy5hcmdzLCBiaW5kUHJvcGVydHksIHRydWUpO1xuICAgICAgICB2YXIgYXR0cmliID0gYXR0cnNbaV1bMF07XG4gICAgICAgIGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICBpZiAoZCB8fCB2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoYXR0cmliLCB2KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHYgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCAnJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmliLCB2KTtcbiAgICAgICAgfSkpO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIGkgaW4gYXR0cnMpIHtcbiAgICAgICAgX2xvb3AoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0YWc7XG4gICAgfTtcbiAgfVxuICBtYXBJbnRlcnBvbGF0YWJsZVRhZyh0YWcpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciByZWdleCA9IHRoaXMuaW50ZXJwb2xhdGVSZWdleDtcbiAgICB2YXIge1xuICAgICAgTm9kZSxcbiAgICAgIGRvY3VtZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIGlmICh0YWcubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICB2YXIgb3JpZ2luYWwgPSB0YWcubm9kZVZhbHVlO1xuICAgICAgaWYgKCF0aGlzLmludGVycG9sYXRhYmxlKG9yaWdpbmFsKSkge1xuICAgICAgICByZXR1cm4gdGFnO1xuICAgICAgfVxuICAgICAgdmFyIGhlYWRlciA9IDA7XG4gICAgICB2YXIgbWF0Y2g7XG4gICAgICB2YXIgX2xvb3AyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBiaW5kUHJvcGVydHkgPSBtYXRjaFsyXTtcbiAgICAgICAgICB2YXIgdW5zYWZlSHRtbCA9IGZhbHNlO1xuICAgICAgICAgIHZhciB1bnNhZmVWaWV3ID0gZmFsc2U7XG4gICAgICAgICAgdmFyIHByb3BlcnR5U3BsaXQgPSBiaW5kUHJvcGVydHkuc3BsaXQoJ3wnKTtcbiAgICAgICAgICB2YXIgdHJhbnNmb3JtZXIgPSBmYWxzZTtcbiAgICAgICAgICBpZiAocHJvcGVydHlTcGxpdC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IF90aGlzLnN0cmluZ1RyYW5zZm9ybWVyKHByb3BlcnR5U3BsaXQuc2xpY2UoMSkpO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gcHJvcGVydHlTcGxpdFswXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5zdWJzdHIoMCwgMikgPT09ICckJCcpIHtcbiAgICAgICAgICAgIHVuc2FmZUh0bWwgPSB0cnVlO1xuICAgICAgICAgICAgdW5zYWZlVmlldyA9IHRydWU7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBiaW5kUHJvcGVydHkuc3Vic3RyKDIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICAgICAgICB1bnNhZmVIdG1sID0gdHJ1ZTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkuc3Vic3RyKDAsIDMpID09PSAnMDAwJykge1xuICAgICAgICAgICAgZXhwYW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eS5zdWJzdHIoMyk7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHN0YXRpY1ByZWZpeCA9IG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIsIG1hdGNoLmluZGV4KTtcbiAgICAgICAgICBoZWFkZXIgPSBtYXRjaC5pbmRleCArIG1hdGNoWzFdLmxlbmd0aDtcbiAgICAgICAgICB2YXIgc3RhdGljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0YXRpY1ByZWZpeCk7XG4gICAgICAgICAgc3RhdGljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3RhdGljTm9kZSwgdGFnKTtcbiAgICAgICAgICB2YXIgZHluYW1pY05vZGU7XG4gICAgICAgICAgaWYgKHVuc2FmZUh0bWwpIHtcbiAgICAgICAgICAgIGR5bmFtaWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGR5bmFtaWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkeW5hbWljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgICAgICB2YXIgcHJveHkgPSBfdGhpcy5hcmdzO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eTtcbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5Lm1hdGNoKC9cXC4vKSkge1xuICAgICAgICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShfdGhpcy5hcmdzLCBiaW5kUHJvcGVydHksIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZHluYW1pY05vZGUsIHRhZyk7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwcm94eSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybiAxOyAvLyBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBwcm94eSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHByb3h5KTtcbiAgICAgICAgICB2YXIgZGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRba10gIT09IHYgJiYgKHRba10gaW5zdGFuY2VvZiBWaWV3IHx8IHRba10gaW5zdGFuY2VvZiBOb2RlIHx8IHRba10gaW5zdGFuY2VvZiBfVGFnLlRhZykpIHtcbiAgICAgICAgICAgICAgaWYgKCF0W2tdLnByZXNlcnZlKSB7XG4gICAgICAgICAgICAgICAgdFtrXS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHVuc2FmZVZpZXcgJiYgISh2IGluc3RhbmNlb2YgVmlldykpIHtcbiAgICAgICAgICAgICAgdmFyIHVuc2FmZVRlbXBsYXRlID0gdiAhPT0gbnVsbCAmJiB2ICE9PSB2b2lkIDAgPyB2IDogJyc7XG4gICAgICAgICAgICAgIHYgPSBuZXcgVmlldyhfdGhpcy5hcmdzLCBfdGhpcyk7XG4gICAgICAgICAgICAgIHYudGVtcGxhdGUgPSB1bnNhZmVUZW1wbGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lcikge1xuICAgICAgICAgICAgICB2ID0gdHJhbnNmb3JtZXIodik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodiBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgICAgICAgICAgIHZbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gX3RoaXM7XG4gICAgICAgICAgICAgIHYucmVuZGVyKHRhZy5wYXJlbnROb2RlLCBkeW5hbWljTm9kZSwgX3RoaXMpO1xuICAgICAgICAgICAgICB2YXIgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXYucHJlc2VydmUpIHtcbiAgICAgICAgICAgICAgICAgIHYucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBfdGhpcy5vblJlbW92ZShjbGVhbnVwKTtcbiAgICAgICAgICAgICAgdi5vblJlbW92ZSgoKSA9PiBfdGhpcy5fb25SZW1vdmUucmVtb3ZlKGNsZWFudXApKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh2LCBkeW5hbWljTm9kZSk7XG4gICAgICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKCgpID0+IHYucmVtb3ZlKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gJyc7XG4gICAgICAgICAgICAgIGlmICh2Lm5vZGUpIHtcbiAgICAgICAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodi5ub2RlLCBkeW5hbWljTm9kZSk7XG4gICAgICAgICAgICAgICAgX3RoaXMub25SZW1vdmUoKCkgPT4gdi5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBPYmplY3QgJiYgdi5fX3RvU3RyaW5nIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICB2ID0gdi5fX3RvU3RyaW5nKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHVuc2FmZUh0bWwpIHtcbiAgICAgICAgICAgICAgICBkeW5hbWljTm9kZS5pbm5lckhUTUwgPSB2O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9IHY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGR5bmFtaWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgICAgIH0sXG4gICAgICAgIF9yZXQ7XG4gICAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKG9yaWdpbmFsKSkge1xuICAgICAgICBfcmV0ID0gX2xvb3AyKCk7XG4gICAgICAgIGlmIChfcmV0ID09PSAwKSBjb250aW51ZTtcbiAgICAgICAgaWYgKF9yZXQgPT09IDEpIGJyZWFrO1xuICAgICAgfVxuICAgICAgdmFyIHN0YXRpY1N1ZmZpeCA9IG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIpO1xuICAgICAgdmFyIHN0YXRpY05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdGF0aWNTdWZmaXgpO1xuICAgICAgc3RhdGljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdGF0aWNOb2RlLCB0YWcpO1xuICAgICAgdGFnLm5vZGVWYWx1ZSA9ICcnO1xuICAgIH0gZWxzZSBpZiAodGFnLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgdmFyIF9sb29wMyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFfdGhpcy5pbnRlcnBvbGF0YWJsZSh0YWcuYXR0cmlidXRlc1tpXS52YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgaGVhZGVyID0gMDtcbiAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICB2YXIgb3JpZ2luYWwgPSB0YWcuYXR0cmlidXRlc1tpXS52YWx1ZTtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZSA9IHRhZy5hdHRyaWJ1dGVzW2ldO1xuICAgICAgICB2YXIgYmluZFByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgdmFyIHNlZ21lbnRzID0gW107XG4gICAgICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMob3JpZ2luYWwpKSB7XG4gICAgICAgICAgc2VnbWVudHMucHVzaChvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyLCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAgIGlmICghYmluZFByb3BlcnRpZXNbbWF0Y2hbMl1dKSB7XG4gICAgICAgICAgICBiaW5kUHJvcGVydGllc1ttYXRjaFsyXV0gPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYmluZFByb3BlcnRpZXNbbWF0Y2hbMl1dLnB1c2goc2VnbWVudHMubGVuZ3RoKTtcbiAgICAgICAgICBzZWdtZW50cy5wdXNoKG1hdGNoWzFdKTtcbiAgICAgICAgICBoZWFkZXIgPSBtYXRjaC5pbmRleCArIG1hdGNoWzFdLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBzZWdtZW50cy5wdXNoKG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIpKTtcbiAgICAgICAgdmFyIF9sb29wNCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgcHJveHkgPSBfdGhpcy5hcmdzO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IGo7XG4gICAgICAgICAgdmFyIHByb3BlcnR5U3BsaXQgPSBqLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgdmFyIHRyYW5zZm9ybWVyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGxvbmdQcm9wZXJ0eSA9IGo7XG4gICAgICAgICAgaWYgKHByb3BlcnR5U3BsaXQubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdHJhbnNmb3JtZXIgPSBfdGhpcy5zdHJpbmdUcmFuc2Zvcm1lcihwcm9wZXJ0eVNwbGl0LnNsaWNlKDEpKTtcbiAgICAgICAgICAgIHByb3BlcnR5ID0gcHJvcGVydHlTcGxpdFswXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHByb3BlcnR5Lm1hdGNoKC9cXC4vKSkge1xuICAgICAgICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShfdGhpcy5hcmdzLCBwcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBtYXRjaGluZyA9IFtdO1xuICAgICAgICAgIHZhciBiaW5kUHJvcGVydHkgPSBqO1xuICAgICAgICAgIHZhciBtYXRjaGluZ1NlZ21lbnRzID0gYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XTtcbiAgICAgICAgICBfdGhpcy5vblJlbW92ZShwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIpIHtcbiAgICAgICAgICAgICAgdiA9IHRyYW5zZm9ybWVyKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgX2kgaW4gYmluZFByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgX2ogaW4gYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgIHNlZ21lbnRzW2JpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV1bX2pdXSA9IHRbX2ldO1xuICAgICAgICAgICAgICAgIGlmIChrID09PSBwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgICAgc2VnbWVudHNbYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XVtfal1dID0gdjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghX3RoaXMucGF1c2VkKSB7XG4gICAgICAgICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLm5hbWUsIHNlZ21lbnRzLmpvaW4oJycpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF90aGlzLnVucGF1c2VDYWxsYmFja3Muc2V0KGF0dHJpYnV0ZSwgKCkgPT4gdGFnLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUubmFtZSwgc2VnbWVudHMuam9pbignJykpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH07XG4gICAgICAgIGZvciAodmFyIGogaW4gYmluZFByb3BlcnRpZXMpIHtcbiAgICAgICAgICBfbG9vcDQoKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKF9sb29wMygpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBSZWZUYWcodGFnKSB7XG4gICAgdmFyIHJlZkF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1yZWYnKTtcbiAgICB2YXIgW3JlZlByb3AsIHJlZkNsYXNzbmFtZSA9IG51bGwsIHJlZktleSA9IG51bGxdID0gcmVmQXR0ci5zcGxpdCgnOicpO1xuICAgIHZhciByZWZDbGFzcyA9IF9UYWcuVGFnO1xuICAgIGlmIChyZWZDbGFzc25hbWUpIHtcbiAgICAgIHJlZkNsYXNzID0gdGhpcy5zdHJpbmdUb0NsYXNzKHJlZkNsYXNzbmFtZSk7XG4gICAgfVxuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXJlZicpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YWcsICdfX190YWdfX18nLCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICB0YWcuX19fdGFnX19fID0gbnVsbDtcbiAgICAgIHRhZy5yZW1vdmUoKTtcbiAgICB9KTtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgZGlyZWN0ID0gdGhpcztcbiAgICBpZiAodGhpcy52aWV3TGlzdCkge1xuICAgICAgcGFyZW50ID0gdGhpcy52aWV3TGlzdC5wYXJlbnQ7XG4gICAgICAvLyBpZighdGhpcy52aWV3TGlzdC5wYXJlbnQudGFnc1tyZWZQcm9wXSlcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0dGhpcy52aWV3TGlzdC5wYXJlbnQudGFnc1tyZWZQcm9wXSA9IFtdO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBsZXQgcmVmS2V5VmFsID0gdGhpcy5hcmdzW3JlZktleV07XG5cbiAgICAgIC8vIHRoaXMudmlld0xpc3QucGFyZW50LnRhZ3NbcmVmUHJvcF1bcmVmS2V5VmFsXSA9IG5ldyByZWZDbGFzcyhcbiAgICAgIC8vIFx0dGFnLCB0aGlzLCByZWZQcm9wLCByZWZLZXlWYWxcbiAgICAgIC8vICk7XG4gICAgfVxuICAgIC8vIGVsc2VcbiAgICAvLyB7XG4gICAgLy8gXHR0aGlzLnRhZ3NbcmVmUHJvcF0gPSBuZXcgcmVmQ2xhc3MoXG4gICAgLy8gXHRcdHRhZywgdGhpcywgcmVmUHJvcFxuICAgIC8vIFx0KTtcbiAgICAvLyB9XG5cbiAgICB2YXIgdGFnT2JqZWN0ID0gbmV3IHJlZkNsYXNzKHRhZywgdGhpcywgcmVmUHJvcCwgdW5kZWZpbmVkLCBkaXJlY3QpO1xuICAgIHRhZy5fX190YWdfX18gPSB0YWdPYmplY3Q7XG4gICAgdGhpcy50YWdzW3JlZlByb3BdID0gdGFnT2JqZWN0O1xuICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgIHZhciByZWZLZXlWYWwgPSB0aGlzLmFyZ3NbcmVmS2V5XTtcbiAgICAgIGlmIChyZWZLZXlWYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoIXBhcmVudC50YWdzW3JlZlByb3BdKSB7XG4gICAgICAgICAgcGFyZW50LnRhZ3NbcmVmUHJvcF0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQudGFnc1tyZWZQcm9wXVtyZWZLZXlWYWxdID0gdGFnT2JqZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyZW50LnRhZ3NbcmVmUHJvcF0gPSB0YWdPYmplY3Q7XG4gICAgICB9XG4gICAgICBpZiAoIXBhcmVudC5wYXJlbnQpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcEJpbmRUYWcodGFnKSB7XG4gICAgdmFyIGJpbmRBcmcgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1iaW5kJyk7XG4gICAgdmFyIHByb3h5ID0gdGhpcy5hcmdzO1xuICAgIHZhciBwcm9wZXJ0eSA9IGJpbmRBcmc7XG4gICAgdmFyIHRvcCA9IG51bGw7XG4gICAgaWYgKGJpbmRBcmcubWF0Y2goL1xcLi8pKSB7XG4gICAgICBbcHJveHksIHByb3BlcnR5LCB0b3BdID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUodGhpcy5hcmdzLCBiaW5kQXJnLCB0cnVlKTtcbiAgICB9XG4gICAgaWYgKHByb3h5ICE9PSB0aGlzLmFyZ3MpIHtcbiAgICAgIHRoaXMuc3ViQmluZGluZ3NbYmluZEFyZ10gPSB0aGlzLnN1YkJpbmRpbmdzW2JpbmRBcmddIHx8IFtdO1xuICAgICAgdGhpcy5vblJlbW92ZSh0aGlzLmFyZ3MuYmluZFRvKHRvcCwgKCkgPT4ge1xuICAgICAgICB3aGlsZSAodGhpcy5zdWJCaW5kaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgICB0aGlzLnN1YkJpbmRpbmdzLnNoaWZ0KCkoKTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH1cbiAgICB2YXIgdW5zYWZlSHRtbCA9IGZhbHNlO1xuICAgIGlmIChwcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgcHJvcGVydHkgPSBwcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICB1bnNhZmVIdG1sID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGF1dG9FdmVudFN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB2YXIgZGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgaWYgKChwIGluc3RhbmNlb2YgVmlldyB8fCBwIGluc3RhbmNlb2YgTm9kZSB8fCBwIGluc3RhbmNlb2YgX1RhZy5UYWcpICYmIHAgIT09IHYpIHtcbiAgICAgICAgcC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGlmIChbJ0lOUFVUJywgJ1NFTEVDVCcsICdURVhUQVJFQSddLmluY2x1ZGVzKHRhZy50YWdOYW1lKSkge1xuICAgICAgICB2YXIgX3R5cGUgPSB0YWcuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgICAgIGlmIChfdHlwZSAmJiBfdHlwZS50b0xvd2VyQ2FzZSgpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgdGFnLmNoZWNrZWQgPSAhIXY7XG4gICAgICAgIH0gZWxzZSBpZiAoX3R5cGUgJiYgX3R5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgIHRhZy5jaGVja2VkID0gdiA9PSB0YWcudmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAoX3R5cGUgIT09ICdmaWxlJykge1xuICAgICAgICAgIGlmICh0YWcudGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RPcHRpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnLm9wdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0aW9uID0gdGFnLm9wdGlvbnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbi52YWx1ZSA9PSB2KSB7XG4gICAgICAgICAgICAgICAgICB0YWcuc2VsZWN0ZWRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2VsZWN0T3B0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLm5vZGVzQXR0YWNoZWQuYWRkKHNlbGVjdE9wdGlvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRhZy52YWx1ZSA9IHYgPT0gbnVsbCA/ICcnIDogdjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF1dG9FdmVudFN0YXJ0ZWQpIHtcbiAgICAgICAgICB0YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2QXV0b0NoYW5nZWQnLCB7XG4gICAgICAgICAgICBidWJibGVzOiB0cnVlXG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIGF1dG9FdmVudFN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICAgICAgZm9yICh2YXIgbm9kZSBvZiB0YWcuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdltfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSB0aGlzO1xuICAgICAgICAgIHYucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICB0YWcuaW5zZXJ0KHYpO1xuICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgICAgIHRhZy5hcHBlbmQodi5ub2RlKTtcbiAgICAgICAgfSBlbHNlIGlmICh1bnNhZmVIdG1sKSB7XG4gICAgICAgICAgaWYgKHRhZy5pbm5lckhUTUwgIT09IHYpIHtcbiAgICAgICAgICAgIHYgPSBTdHJpbmcodik7XG4gICAgICAgICAgICBpZiAodGFnLmlubmVySFRNTCA9PT0gdi5zdWJzdHJpbmcoMCwgdGFnLmlubmVySFRNTC5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgIHRhZy5pbm5lckhUTUwgKz0gdi5zdWJzdHJpbmcodGFnLmlubmVySFRNTC5sZW5ndGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgX25vZGUgb2YgdGFnLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICBfbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0YWcuaW5uZXJIVE1MID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9Eb20uRG9tLm1hcFRhZ3ModGFnLCBmYWxzZSwgdCA9PiB0W2RvbnRQYXJzZV0gPSB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRhZy50ZXh0Q29udGVudCAhPT0gdikge1xuICAgICAgICAgICAgZm9yICh2YXIgX25vZGUyIG9mIHRhZy5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgIF9ub2RlMi5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhZy50ZXh0Q29udGVudCA9IHY7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHByb3h5ICE9PSB0aGlzLmFyZ3MpIHtcbiAgICAgIHRoaXMuc3ViQmluZGluZ3NbYmluZEFyZ10ucHVzaChkZWJpbmQpO1xuICAgIH1cbiAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgdmFyIHR5cGUgPSB0YWcuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgdmFyIG11bHRpID0gdGFnLmdldEF0dHJpYnV0ZSgnbXVsdGlwbGUnKTtcbiAgICB2YXIgaW5wdXRMaXN0ZW5lciA9IGV2ZW50ID0+IHtcbiAgICAgIGlmIChldmVudC50YXJnZXQgIT09IHRhZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodHlwZSAmJiB0eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgaWYgKHRhZy5jaGVja2VkKSB7XG4gICAgICAgICAgcHJveHlbcHJvcGVydHldID0gZXZlbnQudGFyZ2V0LmdldEF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChldmVudC50YXJnZXQubWF0Y2hlcygnW2NvbnRlbnRlZGl0YWJsZT10cnVlXScpKSB7XG4gICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGV2ZW50LnRhcmdldC5pbm5lckhUTUw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdmaWxlJyAmJiBtdWx0aSkge1xuICAgICAgICB2YXIgZmlsZXMgPSBBcnJheS5mcm9tKGV2ZW50LnRhcmdldC5maWxlcyk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gcHJveHlbcHJvcGVydHldIHx8IF9CaW5kYWJsZS5CaW5kYWJsZS5vbkRlY2socHJveHksIHByb3BlcnR5KTtcbiAgICAgICAgaWYgKCFjdXJyZW50IHx8ICFmaWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBmaWxlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgX2xvb3A1ID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICAgIGlmIChmaWxlc1tpXSAhPT0gY3VycmVudFtpXSkge1xuICAgICAgICAgICAgICBmaWxlc1tpXS50b0pTT04gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGZpbGVbaV0ubmFtZSxcbiAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVbaV0uc2l6ZSxcbiAgICAgICAgICAgICAgICAgIHR5cGU6IGZpbGVbaV0udHlwZSxcbiAgICAgICAgICAgICAgICAgIGRhdGU6IGZpbGVbaV0ubGFzdE1vZGlmaWVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY3VycmVudFtpXSA9IGZpbGVzW2ldO1xuICAgICAgICAgICAgICByZXR1cm4gMTsgLy8gYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gZmlsZXMpIHtcbiAgICAgICAgICAgIGlmIChfbG9vcDUoaSkpIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZmlsZScgJiYgIW11bHRpICYmIGV2ZW50LnRhcmdldC5maWxlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIF9maWxlID0gZXZlbnQudGFyZ2V0LmZpbGVzLml0ZW0oMCk7XG4gICAgICAgIF9maWxlLnRvSlNPTiA9ICgpID0+IHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogX2ZpbGUubmFtZSxcbiAgICAgICAgICAgIHNpemU6IF9maWxlLnNpemUsXG4gICAgICAgICAgICB0eXBlOiBfZmlsZS50eXBlLFxuICAgICAgICAgICAgZGF0ZTogX2ZpbGUubGFzdE1vZGlmaWVkXG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgcHJveHlbcHJvcGVydHldID0gX2ZpbGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBldmVudC50YXJnZXQudmFsdWU7XG4gICAgICB9XG4gICAgfTtcbiAgICBpZiAodHlwZSA9PT0gJ2ZpbGUnIHx8IHR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcigndmFsdWUtY2hhbmdlZCcsIGlucHV0TGlzdGVuZXIpO1xuICAgIH1cbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIGlmICh0eXBlID09PSAnZmlsZScgfHwgdHlwZSA9PT0gJ3JhZGlvJykge1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcigndmFsdWUtY2hhbmdlZCcsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWJpbmQnKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcE9uVGFnKHRhZykge1xuICAgIHZhciByZWZlcmVudHMgPSBTdHJpbmcodGFnLmdldEF0dHJpYnV0ZSgnY3Ytb24nKSk7XG4gICAgcmVmZXJlbnRzLnNwbGl0KCc7JykubWFwKGEgPT4gYS5zcGxpdCgnOicpKS5mb3JFYWNoKGEgPT4ge1xuICAgICAgYSA9IGEubWFwKGEgPT4gYS50cmltKCkpO1xuICAgICAgdmFyIGFyZ0xlbiA9IGEubGVuZ3RoO1xuICAgICAgdmFyIGV2ZW50TmFtZSA9IFN0cmluZyhhLnNoaWZ0KCkpLnRyaW0oKTtcbiAgICAgIHZhciBjYWxsYmFja05hbWUgPSBTdHJpbmcoYS5zaGlmdCgpIHx8IGV2ZW50TmFtZSkudHJpbSgpO1xuICAgICAgdmFyIGV2ZW50RmxhZ3MgPSBTdHJpbmcoYS5zaGlmdCgpIHx8ICcnKS50cmltKCk7XG4gICAgICB2YXIgYXJnTGlzdCA9IFtdO1xuICAgICAgdmFyIGdyb3VwcyA9IC8oXFx3KykoPzpcXCgoWyRcXHdcXHMtJ1wiLF0rKVxcKSk/Ly5leGVjKGNhbGxiYWNrTmFtZSk7XG4gICAgICBpZiAoZ3JvdXBzKSB7XG4gICAgICAgIGNhbGxiYWNrTmFtZSA9IGdyb3Vwc1sxXS5yZXBsYWNlKC8oXltcXHNcXG5dK3xbXFxzXFxuXSskKS8sICcnKTtcbiAgICAgICAgaWYgKGdyb3Vwc1syXSkge1xuICAgICAgICAgIGFyZ0xpc3QgPSBncm91cHNbMl0uc3BsaXQoJywnKS5tYXAocyA9PiBzLnRyaW0oKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghYXJnTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgYXJnTGlzdC5wdXNoKCckZXZlbnQnKTtcbiAgICAgIH1cbiAgICAgIGlmICghZXZlbnROYW1lIHx8IGFyZ0xlbiA9PT0gMSkge1xuICAgICAgICBldmVudE5hbWUgPSBjYWxsYmFja05hbWU7XG4gICAgICB9XG4gICAgICB2YXIgZXZlbnRMaXN0ZW5lciA9IGV2ZW50ID0+IHtcbiAgICAgICAgdmFyIGV2ZW50TWV0aG9kO1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIF9sb29wNiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250cm9sbGVyID0gcGFyZW50LmNvbnRyb2xsZXI7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnRyb2xsZXJbY2FsbGJhY2tOYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICBldmVudE1ldGhvZCA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlcltjYWxsYmFja05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByZXR1cm4gMDsgLy8gYnJlYWtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhcmVudFtjYWxsYmFja05hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGV2ZW50TWV0aG9kID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICBwYXJlbnRbY2FsbGJhY2tOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFyZW50LnBhcmVudCkge1xuICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBfcmV0MjtcbiAgICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICAgIF9yZXQyID0gX2xvb3A2KCk7XG4gICAgICAgICAgaWYgKF9yZXQyID09PSAwKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB2YXIgYXJnUmVmcyA9IGFyZ0xpc3QubWFwKGFyZyA9PiB7XG4gICAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICAgIGlmIChOdW1iZXIoYXJnKSA9PSBhcmcpIHtcbiAgICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICdldmVudCcgfHwgYXJnID09PSAnJGV2ZW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHZpZXcnKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJGNvbnRyb2xsZXInKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udHJvbGxlcjtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyR0YWcnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHBhcmVudCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyRzdWJ2aWV3Jykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgaW4gdGhpcy5hcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcmdzW2FyZ107XG4gICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCA9IC9eWydcIl0oW1xcdy1dKz8pW1wiJ10kLy5leGVjKGFyZykpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoISh0eXBlb2YgZXZlbnRNZXRob2QgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2NhbGxiYWNrTmFtZX0gaXMgbm90IGRlZmluZWQgb24gVmlldyBvYmplY3QuYCArIFwiXFxuXCIgKyBgVGFnOmAgKyBcIlxcblwiICsgYCR7dGFnLm91dGVySFRNTH1gKTtcbiAgICAgICAgfVxuICAgICAgICBldmVudE1ldGhvZCguLi5hcmdSZWZzKTtcbiAgICAgIH07XG4gICAgICB2YXIgZXZlbnRPcHRpb25zID0ge307XG4gICAgICBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygncCcpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5wYXNzaXZlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnUCcpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5wYXNzaXZlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnYycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5jYXB0dXJlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnQycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5jYXB0dXJlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnbycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5vbmNlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGbGFncy5pbmNsdWRlcygnTycpKSB7XG4gICAgICAgIGV2ZW50T3B0aW9ucy5vbmNlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKGV2ZW50TmFtZSkge1xuICAgICAgICBjYXNlICdfaW5pdCc6XG4gICAgICAgICAgZXZlbnRMaXN0ZW5lcigpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdfYXR0YWNoJzpcbiAgICAgICAgICB0aGlzLm5vZGVzQXR0YWNoZWQuYWRkKGV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdfZGV0YWNoJzpcbiAgICAgICAgICB0aGlzLm5vZGVzRGV0YWNoZWQuYWRkKGV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZXZlbnRMaXN0ZW5lciwgZXZlbnRPcHRpb25zKTtcbiAgICAgICAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZXZlbnRMaXN0ZW5lciwgZXZlbnRPcHRpb25zKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHJldHVybiBbZXZlbnROYW1lLCBjYWxsYmFja05hbWUsIGFyZ0xpc3RdO1xuICAgIH0pO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LW9uJyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBMaW5rVGFnKHRhZykge1xuICAgIC8vIGNvbnN0IHRhZ0NvbXBpbGVyID0gdGhpcy5jb21waWxlTGlua1RhZyh0YWcpO1xuXG4gICAgLy8gY29uc3QgbmV3VGFnID0gdGFnQ29tcGlsZXIodGhpcyk7XG5cbiAgICAvLyB0YWcucmVwbGFjZVdpdGgobmV3VGFnKTtcblxuICAgIC8vIHJldHVybiBuZXdUYWc7XG5cbiAgICB2YXIgbGlua0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1saW5rJyk7XG4gICAgdGFnLnNldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmtBdHRyKTtcbiAgICB2YXIgbGlua0NsaWNrID0gZXZlbnQgPT4ge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChsaW5rQXR0ci5zdWJzdHJpbmcoMCwgNCkgPT09ICdodHRwJyB8fCBsaW5rQXR0ci5zdWJzdHJpbmcoMCwgMikgPT09ICcvLycpIHtcbiAgICAgICAgZ2xvYmFsVGhpcy5vcGVuKHRhZy5nZXRBdHRyaWJ1dGUoJ2hyZWYnLCBsaW5rQXR0cikpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBfUm91dGVyLlJvdXRlci5nbyh0YWcuZ2V0QXR0cmlidXRlKCdocmVmJykpO1xuICAgIH07XG4gICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlua0NsaWNrKTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgodGFnLCBldmVudExpc3RlbmVyKSA9PiAoKSA9PiB7XG4gICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudExpc3RlbmVyKTtcbiAgICAgIHRhZyA9IHVuZGVmaW5lZDtcbiAgICAgIGV2ZW50TGlzdGVuZXIgPSB1bmRlZmluZWQ7XG4gICAgfSkodGFnLCBsaW5rQ2xpY2spKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1saW5rJyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIGNvbXBpbGVMaW5rVGFnKHNvdXJjZVRhZylcbiAgLy8ge1xuICAvLyBcdGNvbnN0IGxpbmtBdHRyID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAvLyBcdHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgLy8gXHRyZXR1cm4gKGJpbmRpbmdWaWV3KSA9PiB7XG4gIC8vIFx0XHRjb25zdCB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKHRydWUpO1xuICAvLyBcdFx0dGFnLnNldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmtBdHRyKTtcbiAgLy8gXHRcdHJldHVybiB0YWc7XG4gIC8vIFx0fTtcbiAgLy8gfVxuXG4gIG1hcFByZW5kZXJlclRhZyh0YWcpIHtcbiAgICB2YXIgcHJlcmVuZGVyQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXByZXJlbmRlcicpO1xuICAgIHZhciBwcmVyZW5kZXJpbmcgPSBnbG9iYWxUaGlzLnByZXJlbmRlcmVyIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL3ByZXJlbmRlci9pKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1wcmVyZW5kZXInKTtcbiAgICBpZiAocHJlcmVuZGVyaW5nKSB7XG4gICAgICBnbG9iYWxUaGlzLnByZXJlbmRlcmVyID0gZ2xvYmFsVGhpcy5wcmVyZW5kZXJlciB8fCB0cnVlO1xuICAgIH1cbiAgICBpZiAocHJlcmVuZGVyQXR0ciA9PT0gJ25ldmVyJyAmJiBwcmVyZW5kZXJpbmcgfHwgcHJlcmVuZGVyQXR0ciA9PT0gJ29ubHknICYmICFwcmVyZW5kZXJpbmcpIHtcbiAgICAgIHRoaXMucG9zdE1hcHBpbmcuYWRkKCgpID0+IHRhZy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRhZykpO1xuICAgIH1cbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFdpdGhUYWcodGFnKSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG4gICAgdmFyIHdpdGhBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3Ytd2l0aCcpO1xuICAgIHZhciBjYXJyeUF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1jYXJyeScpO1xuICAgIHZhciB2aWV3QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi13aXRoJyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtY2FycnknKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHZpZXdBdHRyID8gdGhpcy5zdHJpbmdUb0NsYXNzKHZpZXdBdHRyKSA6IFZpZXc7XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4udGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIGNhcnJ5UHJvcHMgPSBbXTtcbiAgICBpZiAoY2FycnlBdHRyKSB7XG4gICAgICBjYXJyeVByb3BzID0gY2FycnlBdHRyLnNwbGl0KCcsJykubWFwKHMgPT4gcy50cmltKCkpO1xuICAgIH1cbiAgICB2YXIgZGViaW5kID0gdGhpcy5hcmdzLmJpbmRUbyh3aXRoQXR0ciwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgIGlmICh0aGlzLndpdGhWaWV3cy5oYXModGFnKSkge1xuICAgICAgICB0aGlzLndpdGhWaWV3cy5kZWxldGUodGFnKTtcbiAgICAgIH1cbiAgICAgIHdoaWxlICh0YWcuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YWcucmVtb3ZlQ2hpbGQodGFnLmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgICAgdmFyIHZpZXcgPSBuZXcgdmlld0NsYXNzKHt9LCB0aGlzKTtcbiAgICAgIHRoaXMub25SZW1vdmUoKHZpZXcgPT4gKCkgPT4ge1xuICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgfSkodmlldykpO1xuICAgICAgdmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAgICAgdmFyIF9sb29wNyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlYmluZCA9IF90aGlzMi5hcmdzLmJpbmRUbyhjYXJyeVByb3BzW2ldLCAodiwgaykgPT4ge1xuICAgICAgICAgIHZpZXcuYXJnc1trXSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICB2aWV3Lm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgICAgIF90aGlzMi5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgZGViaW5kKCk7XG4gICAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgaSBpbiBjYXJyeVByb3BzKSB7XG4gICAgICAgIF9sb29wNygpO1xuICAgICAgfVxuICAgICAgdmFyIF9sb29wOCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHYgPSBfQmluZGFibGUuQmluZGFibGUubWFrZSh2KTtcbiAgICAgICAgdmFyIGRlYmluZCA9IHYuYmluZFRvKF9pMiwgKHZ2LCBraywgdHQsIGRkKSA9PiB7XG4gICAgICAgICAgaWYgKCFkZCkge1xuICAgICAgICAgICAgdmlldy5hcmdzW2trXSA9IHZ2O1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2sgaW4gdmlldy5hcmdzKSB7XG4gICAgICAgICAgICBkZWxldGUgdmlldy5hcmdzW2trXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZGViaW5kVXAgPSB2aWV3LmFyZ3MuYmluZFRvKF9pMiwgKHZ2LCBraywgdHQsIGRkKSA9PiB7XG4gICAgICAgICAgaWYgKCFkZCkge1xuICAgICAgICAgICAgdltra10gPSB2djtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtrIGluIHYpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2W2trXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfdGhpczIub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIGRlYmluZCgpO1xuICAgICAgICAgIGlmICghdi5pc0JvdW5kKCkpIHtcbiAgICAgICAgICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHYpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmlldy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgZGViaW5kKCk7XG4gICAgICAgICAgaWYgKCF2LmlzQm91bmQoKSkge1xuICAgICAgICAgICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3Modik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBfaTIgaW4gdikge1xuICAgICAgICBpZiAoX2xvb3A4KCkpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmlldy5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICAgIHRoaXMud2l0aFZpZXdzLnNldCh0YWcsIHZpZXcpO1xuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgdGhpcy53aXRoVmlld3MuZGVsZXRlKHRhZyk7XG4gICAgICBkZWJpbmQoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFZpZXdUYWcodGFnKSB7XG4gICAgdmFyIHZpZXdBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi50YWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgcGFydHMgPSB2aWV3QXR0ci5zcGxpdCgnOicpO1xuICAgIHZhciB2aWV3TmFtZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHBhcnRzLmxlbmd0aCA/IHRoaXMuc3RyaW5nVG9DbGFzcyhwYXJ0c1swXSkgOiBWaWV3O1xuICAgIHZhciB2aWV3ID0gbmV3IHZpZXdDbGFzcyh0aGlzLmFyZ3MsIHRoaXMpO1xuICAgIHRoaXMudmlld3Muc2V0KHRhZywgdmlldyk7XG4gICAgdGhpcy52aWV3cy5zZXQodmlld05hbWUsIHZpZXcpO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgIHRoaXMudmlld3MuZGVsZXRlKHRhZyk7XG4gICAgICB0aGlzLnZpZXdzLmRlbGV0ZSh2aWV3TmFtZSk7XG4gICAgfSk7XG4gICAgdmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAgIHZpZXcucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBFYWNoVGFnKHRhZykge1xuICAgIHZhciBlYWNoQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWVhY2gnKTtcbiAgICB2YXIgdmlld0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZWFjaCcpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgdmlld0NsYXNzID0gdmlld0F0dHIgPyB0aGlzLnN0cmluZ1RvQ2xhc3Modmlld0F0dHIpIDogVmlldztcbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi50YWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgW2VhY2hQcm9wLCBhc1Byb3AsIGtleVByb3BdID0gZWFjaEF0dHIuc3BsaXQoJzonKTtcbiAgICB2YXIgcHJveHkgPSB0aGlzLmFyZ3M7XG4gICAgdmFyIHByb3BlcnR5ID0gZWFjaFByb3A7XG4gICAgaWYgKGVhY2hQcm9wLm1hdGNoKC9cXC4vKSkge1xuICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZSh0aGlzLmFyZ3MsIGVhY2hQcm9wLCB0cnVlKTtcbiAgICB9XG4gICAgdmFyIGRlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgIGlmICh2IGluc3RhbmNlb2YgX0JhZy5CYWcpIHtcbiAgICAgICAgdiA9IHYubGlzdDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnZpZXdMaXN0cy5oYXModGFnKSkge1xuICAgICAgICB0aGlzLnZpZXdMaXN0cy5nZXQodGFnKS5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIHZhciB2aWV3TGlzdCA9IG5ldyBfVmlld0xpc3QuVmlld0xpc3Qoc3ViVGVtcGxhdGUsIGFzUHJvcCwgdiwgdGhpcywga2V5UHJvcCwgdmlld0NsYXNzKTtcbiAgICAgIHZhciB2aWV3TGlzdFJlbW92ZXIgPSAoKSA9PiB2aWV3TGlzdC5yZW1vdmUoKTtcbiAgICAgIHRoaXMub25SZW1vdmUodmlld0xpc3RSZW1vdmVyKTtcbiAgICAgIHZpZXdMaXN0Lm9uUmVtb3ZlKCgpID0+IHRoaXMuX29uUmVtb3ZlLnJlbW92ZSh2aWV3TGlzdFJlbW92ZXIpKTtcbiAgICAgIHZhciBkZWJpbmRBID0gdGhpcy5hcmdzLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICBpZiAoayA9PT0gJ19pZCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkKSB7XG4gICAgICAgICAgdmlld0xpc3Quc3ViQXJnc1trXSA9IHY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGsgaW4gdmlld0xpc3Quc3ViQXJncykge1xuICAgICAgICAgICAgZGVsZXRlIHZpZXdMaXN0LnN1YkFyZ3Nba107XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZhciBkZWJpbmRCID0gdmlld0xpc3QuYXJncy5iaW5kVG8oKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgICAgaWYgKGsgPT09ICdfaWQnIHx8IGsgPT09ICd2YWx1ZScgfHwgU3RyaW5nKGspLnN1YnN0cmluZygwLCAzKSA9PT0gJ19fXycpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkKSB7XG4gICAgICAgICAgaWYgKGsgaW4gdGhpcy5hcmdzKSB7XG4gICAgICAgICAgICB0aGlzLmFyZ3Nba10gPSB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5hcmdzW2tdO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZpZXdMaXN0Lm9uUmVtb3ZlKGRlYmluZEEpO1xuICAgICAgdmlld0xpc3Qub25SZW1vdmUoZGViaW5kQik7XG4gICAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZEEpO1xuICAgICAgdGhpcy5vblJlbW92ZShkZWJpbmRCKTtcbiAgICAgIHdoaWxlICh0YWcuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YWcucmVtb3ZlQ2hpbGQodGFnLmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgICAgdGhpcy52aWV3TGlzdHMuc2V0KHRhZywgdmlld0xpc3QpO1xuICAgICAgdmlld0xpc3QucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgICBpZiAodGFnLnRhZ05hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICAgIHZpZXdMaXN0LnJlUmVuZGVyKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZShkZWJpbmQpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwSWZUYWcodGFnKSB7XG4gICAgdmFyIHNvdXJjZVRhZyA9IHRhZztcbiAgICB2YXIgdmlld1Byb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciBpZlByb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtaWYnKTtcbiAgICB2YXIgaXNQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWlzJyk7XG4gICAgdmFyIGludmVydGVkID0gZmFsc2U7XG4gICAgdmFyIGRlZmluZWQgPSBmYWxzZTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtaWYnKTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1pcycpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSB2aWV3UHJvcGVydHkgPyB0aGlzLnN0cmluZ1RvQ2xhc3Modmlld1Byb3BlcnR5KSA6IFZpZXc7XG4gICAgaWYgKGlmUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnIScpIHtcbiAgICAgIGlmUHJvcGVydHkgPSBpZlByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgIGludmVydGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlmUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnPycpIHtcbiAgICAgIGlmUHJvcGVydHkgPSBpZlByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgIGRlZmluZWQgPSB0cnVlO1xuICAgIH1cbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi5zb3VyY2VUYWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgYmluZGluZ1ZpZXcgPSB0aGlzO1xuICAgIHZhciBpZkRvYyA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICAvLyBsZXQgdmlldyA9IG5ldyB2aWV3Q2xhc3MoT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5hcmdzKSwgYmluZGluZ1ZpZXcpO1xuICAgIHZhciB2aWV3ID0gbmV3IHZpZXdDbGFzcyh0aGlzLmFyZ3MsIGJpbmRpbmdWaWV3KTtcbiAgICB2aWV3LnRhZ3MuYmluZFRvKCh2LCBrKSA9PiB0aGlzLnRhZ3Nba10gPSB2LCB7XG4gICAgICByZW1vdmVXaXRoOiB0aGlzXG4gICAgfSk7XG4gICAgdmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAgIHZhciBwcm94eSA9IGJpbmRpbmdWaWV3LmFyZ3M7XG4gICAgdmFyIHByb3BlcnR5ID0gaWZQcm9wZXJ0eTtcbiAgICBpZiAoaWZQcm9wZXJ0eS5tYXRjaCgvXFwuLykpIHtcbiAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoYmluZGluZ1ZpZXcuYXJncywgaWZQcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgfVxuICAgIHZpZXcucmVuZGVyKGlmRG9jLCBudWxsLCB0aGlzKTtcbiAgICB2YXIgcHJvcGVydHlEZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrKSA9PiB7XG4gICAgICB2YXIgbyA9IHY7XG4gICAgICBpZiAoZGVmaW5lZCkge1xuICAgICAgICB2ID0gdiAhPT0gbnVsbCAmJiB2ICE9PSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBpZiAodiBpbnN0YW5jZW9mIF9CYWcuQmFnKSB7XG4gICAgICAgIHYgPSB2Lmxpc3Q7XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgICB2ID0gISF2Lmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGlmIChpc1Byb3BlcnR5ICE9PSBudWxsKSB7XG4gICAgICAgIHYgPSBvID09IGlzUHJvcGVydHk7XG4gICAgICB9XG4gICAgICBpZiAoaW52ZXJ0ZWQpIHtcbiAgICAgICAgdiA9ICF2O1xuICAgICAgfVxuICAgICAgaWYgKHYpIHtcbiAgICAgICAgdGFnLmFwcGVuZENoaWxkKGlmRG9jKTtcbiAgICAgICAgWy4uLmlmRG9jLmNoaWxkTm9kZXNdLmZvckVhY2gobm9kZSA9PiBfRG9tLkRvbS5tYXBUYWdzKG5vZGUsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgICAgICBpZiAoIXRhZy5tYXRjaGVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZEb21BdHRhY2hlZCcsIHtcbiAgICAgICAgICAgIHRhcmdldDogdGFnLFxuICAgICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZpZXcubm9kZXMuZm9yRWFjaChuID0+IGlmRG9jLmFwcGVuZENoaWxkKG4pKTtcbiAgICAgICAgX0RvbS5Eb20ubWFwVGFncyhpZkRvYywgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgICAgIGlmICghdGFnLm1hdGNoZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3IEN1c3RvbUV2ZW50KCdjdkRvbURldGFjaGVkJywge1xuICAgICAgICAgICAgdGFyZ2V0OiB0YWcsXG4gICAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShwcm94eVtwcm9wZXJ0eV0pXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBwcm9wZXJ0eURlYmluZCA9IHRoaXMuYXJncy5iaW5kQ2hhaW4ocHJvcGVydHksIG9uVXBkYXRlKTtcblxuICAgIGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcblxuICAgIC8vIGNvbnN0IGRlYmluZEEgPSB0aGlzLmFyZ3MuYmluZFRvKCh2LGssdCxkKSA9PiB7XG4gICAgLy8gXHRpZihrID09PSAnX2lkJylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0cmV0dXJuO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRpZighZClcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0dmlldy5hcmdzW2tdID0gdjtcbiAgICAvLyBcdH1cbiAgICAvLyBcdGVsc2UgaWYoayBpbiB2aWV3LmFyZ3MpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdGRlbGV0ZSB2aWV3LmFyZ3Nba107XG4gICAgLy8gXHR9XG5cbiAgICAvLyB9KTtcblxuICAgIC8vIGNvbnN0IGRlYmluZEIgPSB2aWV3LmFyZ3MuYmluZFRvKCh2LGssdCxkLHApID0+IHtcbiAgICAvLyBcdGlmKGsgPT09ICdfaWQnIHx8IFN0cmluZyhrKS5zdWJzdHJpbmcoMCwzKSA9PT0gJ19fXycpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdHJldHVybjtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0aWYoayBpbiB0aGlzLmFyZ3MpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdGlmKCFkKVxuICAgIC8vIFx0XHR7XG4gICAgLy8gXHRcdFx0dGhpcy5hcmdzW2tdID0gdjtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0XHRlbHNlXG4gICAgLy8gXHRcdHtcbiAgICAvLyBcdFx0XHRkZWxldGUgdGhpcy5hcmdzW2tdO1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHR9XG4gICAgLy8gfSk7XG5cbiAgICB2YXIgdmlld0RlYmluZCA9ICgpID0+IHtcbiAgICAgIHByb3BlcnR5RGViaW5kKCk7XG4gICAgICAvLyBkZWJpbmRBKCk7XG4gICAgICAvLyBkZWJpbmRCKCk7XG4gICAgICBiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcbiAgICAgIC8vIGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUoYmluZGFibGVEZWJpbmQpO1xuICAgIH07XG4gICAgYmluZGluZ1ZpZXcub25SZW1vdmUodmlld0RlYmluZCk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAvLyBkZWJpbmRBKCk7XG4gICAgICAvLyBkZWJpbmRCKCk7XG4gICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgaWYgKGJpbmRpbmdWaWV3ICE9PSB0aGlzKSB7XG4gICAgICAgIGJpbmRpbmdWaWV3LnJlbW92ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBjb21waWxlSWZUYWcoc291cmNlVGFnKVxuICAvLyB7XG4gIC8vIFx0bGV0IGlmUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1pZicpO1xuICAvLyBcdGxldCBpbnZlcnRlZCAgID0gZmFsc2U7XG5cbiAgLy8gXHRzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1pZicpO1xuXG4gIC8vIFx0aWYoaWZQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICchJylcbiAgLy8gXHR7XG4gIC8vIFx0XHRpZlByb3BlcnR5ID0gaWZQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gIC8vIFx0XHRpbnZlcnRlZCAgID0gdHJ1ZTtcbiAgLy8gXHR9XG5cbiAgLy8gXHRjb25zdCBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50O1xuXG4gIC8vIFx0Wy4uLnNvdXJjZVRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKFxuICAvLyBcdFx0biA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuLmNsb25lTm9kZSh0cnVlKSlcbiAgLy8gXHQpO1xuXG4gIC8vIFx0cmV0dXJuIChiaW5kaW5nVmlldykgPT4ge1xuXG4gIC8vIFx0XHRjb25zdCB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKCk7XG5cbiAgLy8gXHRcdGNvbnN0IGlmRG9jID0gbmV3IERvY3VtZW50RnJhZ21lbnQ7XG5cbiAgLy8gXHRcdGxldCB2aWV3ID0gbmV3IFZpZXcoe30sIGJpbmRpbmdWaWV3KTtcblxuICAvLyBcdFx0dmlldy50ZW1wbGF0ZSA9IHN1YlRlbXBsYXRlO1xuICAvLyBcdFx0Ly8gdmlldy5wYXJlbnQgICA9IGJpbmRpbmdWaWV3O1xuXG4gIC8vIFx0XHRiaW5kaW5nVmlldy5zeW5jQmluZCh2aWV3KTtcblxuICAvLyBcdFx0bGV0IHByb3h5ICAgID0gYmluZGluZ1ZpZXcuYXJncztcbiAgLy8gXHRcdGxldCBwcm9wZXJ0eSA9IGlmUHJvcGVydHk7XG5cbiAgLy8gXHRcdGlmKGlmUHJvcGVydHkubWF0Y2goL1xcLi8pKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRbcHJveHksIHByb3BlcnR5XSA9IEJpbmRhYmxlLnJlc29sdmUoXG4gIC8vIFx0XHRcdFx0YmluZGluZ1ZpZXcuYXJnc1xuICAvLyBcdFx0XHRcdCwgaWZQcm9wZXJ0eVxuICAvLyBcdFx0XHRcdCwgdHJ1ZVxuICAvLyBcdFx0XHQpO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRsZXQgaGFzUmVuZGVyZWQgPSBmYWxzZTtcblxuICAvLyBcdFx0Y29uc3QgcHJvcGVydHlEZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LGspID0+IHtcblxuICAvLyBcdFx0XHRpZighaGFzUmVuZGVyZWQpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRjb25zdCByZW5kZXJEb2MgPSAoYmluZGluZ1ZpZXcuYXJnc1twcm9wZXJ0eV0gfHwgaW52ZXJ0ZWQpXG4gIC8vIFx0XHRcdFx0XHQ/IHRhZyA6IGlmRG9jO1xuXG4gIC8vIFx0XHRcdFx0dmlldy5yZW5kZXIocmVuZGVyRG9jKTtcblxuICAvLyBcdFx0XHRcdGhhc1JlbmRlcmVkID0gdHJ1ZTtcblxuICAvLyBcdFx0XHRcdHJldHVybjtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGlmKEFycmF5LmlzQXJyYXkodikpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR2ID0gISF2Lmxlbmd0aDtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGlmKGludmVydGVkKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0diA9ICF2O1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0aWYodilcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHRhZy5hcHBlbmRDaGlsZChpZkRvYyk7XG4gIC8vIFx0XHRcdH1cbiAgLy8gXHRcdFx0ZWxzZVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0dmlldy5ub2Rlcy5mb3JFYWNoKG49PmlmRG9jLmFwcGVuZENoaWxkKG4pKTtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHR9KTtcblxuICAvLyBcdFx0Ly8gbGV0IGNsZWFuZXIgPSBiaW5kaW5nVmlldztcblxuICAvLyBcdFx0Ly8gd2hpbGUoY2xlYW5lci5wYXJlbnQpXG4gIC8vIFx0XHQvLyB7XG4gIC8vIFx0XHQvLyBcdGNsZWFuZXIgPSBjbGVhbmVyLnBhcmVudDtcbiAgLy8gXHRcdC8vIH1cblxuICAvLyBcdFx0YmluZGluZ1ZpZXcub25SZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuXG4gIC8vIFx0XHRsZXQgYmluZGFibGVEZWJpbmQgPSAoKSA9PiB7XG5cbiAgLy8gXHRcdFx0aWYoIXByb3h5LmlzQm91bmQoKSlcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3MocHJveHkpO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdH07XG5cbiAgLy8gXHRcdGxldCB2aWV3RGViaW5kID0gKCk9PntcbiAgLy8gXHRcdFx0cHJvcGVydHlEZWJpbmQoKTtcbiAgLy8gXHRcdFx0YmluZGFibGVEZWJpbmQoKTtcbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUoYmluZGFibGVEZWJpbmQpO1xuICAvLyBcdFx0fTtcblxuICAvLyBcdFx0dmlldy5vblJlbW92ZSh2aWV3RGViaW5kKTtcblxuICAvLyBcdFx0cmV0dXJuIHRhZztcbiAgLy8gXHR9O1xuICAvLyB9XG5cbiAgbWFwVGVtcGxhdGVUYWcodGFnKSB7XG4gICAgLy8gY29uc3QgdGVtcGxhdGVOYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcblxuICAgIC8vIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG5cbiAgICAvLyB0aGlzLnRlbXBsYXRlc1sgdGVtcGxhdGVOYW1lIF0gPSB0YWcudGFnTmFtZSA9PT0gJ1RFTVBMQVRFJ1xuICAgIC8vIFx0PyB0YWcuY2xvbmVOb2RlKHRydWUpLmNvbnRlbnRcbiAgICAvLyBcdDogbmV3IERvY3VtZW50RnJhZ21lbnQodGFnLmlubmVySFRNTCk7XG5cbiAgICB2YXIgdGVtcGxhdGVOYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuICAgIHZhciBzb3VyY2UgPSB0YWcuaW5uZXJIVE1MO1xuICAgIGlmICghVmlldy50ZW1wbGF0ZXMuaGFzKHNvdXJjZSkpIHtcbiAgICAgIFZpZXcudGVtcGxhdGVzLnNldChzb3VyY2UsIGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHRhZy5pbm5lckhUTUwpKTtcbiAgICB9XG4gICAgdGhpcy50ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXSA9IFZpZXcudGVtcGxhdGVzLmdldChzb3VyY2UpO1xuICAgIHRoaXMucG9zdE1hcHBpbmcuYWRkKCgpID0+IHRhZy5yZW1vdmUoKSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBTbG90VGFnKHRhZykge1xuICAgIHZhciB0ZW1wbGF0ZU5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1zbG90Jyk7XG4gICAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXTtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgdGVtcGxhdGUgPSBwYXJlbnQudGVtcGxhdGVzW3RlbXBsYXRlTmFtZV07XG4gICAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICB9XG4gICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFRlbXBsYXRlICR7dGVtcGxhdGVOYW1lfSBub3QgZm91bmQuYCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3Ytc2xvdCcpO1xuICAgIHdoaWxlICh0YWcuZmlyc3RDaGlsZCkge1xuICAgICAgdGFnLmZpcnN0Q2hpbGQucmVtb3ZlKCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdGVtcGxhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAoIVZpZXcudGVtcGxhdGVzLmhhcyh0ZW1wbGF0ZSkpIHtcbiAgICAgICAgVmlldy50ZW1wbGF0ZXMuc2V0KHRlbXBsYXRlLCBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCh0ZW1wbGF0ZSkpO1xuICAgICAgfVxuICAgICAgdGVtcGxhdGUgPSBWaWV3LnRlbXBsYXRlcy5nZXQodGVtcGxhdGUpO1xuICAgIH1cbiAgICB0YWcuYXBwZW5kQ2hpbGQodGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gc3luY0JpbmQoc3ViVmlldylcbiAgLy8ge1xuICAvLyBcdGxldCBkZWJpbmRBID0gdGhpcy5hcmdzLmJpbmRUbygodixrLHQsZCk9PntcbiAgLy8gXHRcdGlmKGsgPT09ICdfaWQnKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRyZXR1cm47XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKHN1YlZpZXcuYXJnc1trXSAhPT0gdilcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0c3ViVmlldy5hcmdzW2tdID0gdjtcbiAgLy8gXHRcdH1cbiAgLy8gXHR9KTtcblxuICAvLyBcdGxldCBkZWJpbmRCID0gc3ViVmlldy5hcmdzLmJpbmRUbygodixrLHQsZCxwKT0+e1xuXG4gIC8vIFx0XHRpZihrID09PSAnX2lkJylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0cmV0dXJuO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRsZXQgbmV3UmVmID0gdjtcbiAgLy8gXHRcdGxldCBvbGRSZWYgPSBwO1xuXG4gIC8vIFx0XHRpZihuZXdSZWYgaW5zdGFuY2VvZiBWaWV3KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRuZXdSZWYgPSBuZXdSZWYuX19fcmVmX19fO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihvbGRSZWYgaW5zdGFuY2VvZiBWaWV3KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRvbGRSZWYgPSBvbGRSZWYuX19fcmVmX19fO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihuZXdSZWYgIT09IG9sZFJlZiAmJiBvbGRSZWYgaW5zdGFuY2VvZiBWaWV3KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRwLnJlbW92ZSgpO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihrIGluIHRoaXMuYXJncylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0dGhpcy5hcmdzW2tdID0gdjtcbiAgLy8gXHRcdH1cblxuICAvLyBcdH0pO1xuXG4gIC8vIFx0dGhpcy5vblJlbW92ZShkZWJpbmRBKTtcbiAgLy8gXHR0aGlzLm9uUmVtb3ZlKGRlYmluZEIpO1xuXG4gIC8vIFx0c3ViVmlldy5vblJlbW92ZSgoKT0+e1xuICAvLyBcdFx0dGhpcy5fb25SZW1vdmUucmVtb3ZlKGRlYmluZEEpO1xuICAvLyBcdFx0dGhpcy5fb25SZW1vdmUucmVtb3ZlKGRlYmluZEIpO1xuICAvLyBcdH0pO1xuICAvLyB9XG5cbiAgcG9zdFJlbmRlcihwYXJlbnROb2RlKSB7fVxuICBhdHRhY2hlZChwYXJlbnROb2RlKSB7fVxuICBpbnRlcnBvbGF0YWJsZShzdHIpIHtcbiAgICByZXR1cm4gISFTdHJpbmcoc3RyKS5tYXRjaCh0aGlzLmludGVycG9sYXRlUmVnZXgpO1xuICB9XG4gIHN0YXRpYyB1dWlkKCkge1xuICAgIHJldHVybiBuZXcgX1V1aWQuVXVpZCgpO1xuICB9XG4gIHJlbW92ZShub3cgPSBmYWxzZSkge1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVtb3ZlJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHZpZXc6IHRoaXNcbiAgICAgIH0sXG4gICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgfSkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZW1vdmVyID0gKCkgPT4ge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnRhZ3MpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy50YWdzW2ldKSkge1xuICAgICAgICAgIHRoaXMudGFnc1tpXSAmJiB0aGlzLnRhZ3NbaV0uZm9yRWFjaCh0ID0+IHQucmVtb3ZlKCkpO1xuICAgICAgICAgIHRoaXMudGFnc1tpXS5zcGxpY2UoMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy50YWdzW2ldICYmIHRoaXMudGFnc1tpXS5yZW1vdmUoKTtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pMyBpbiB0aGlzLm5vZGVzKSB7XG4gICAgICAgIHRoaXMubm9kZXNbX2kzXSAmJiB0aGlzLm5vZGVzW19pM10uZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2N2RG9tRGV0YWNoZWQnKSk7XG4gICAgICAgIHRoaXMubm9kZXNbX2kzXSAmJiB0aGlzLm5vZGVzW19pM10ucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMubm9kZXNbX2kzXSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHRoaXMubm9kZXMuc3BsaWNlKDApO1xuICAgICAgdGhpcy5maXJzdE5vZGUgPSB0aGlzLmxhc3ROb2RlID0gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgaWYgKG5vdykge1xuICAgICAgcmVtb3ZlcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVtb3Zlcik7XG4gICAgfVxuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9vblJlbW92ZS5pdGVtcygpO1xuICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIGNhbGxiYWNrcykge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICAgIHRoaXMuX29uUmVtb3ZlLnJlbW92ZShjYWxsYmFjayk7XG4gICAgfVxuICAgIGZvciAodmFyIGNsZWFudXAgb2YgdGhpcy5jbGVhbnVwKSB7XG4gICAgICBjbGVhbnVwICYmIGNsZWFudXAoKTtcbiAgICB9XG4gICAgdGhpcy5jbGVhbnVwLmxlbmd0aCA9IDA7XG4gICAgZm9yICh2YXIgW3RhZywgdmlld0xpc3RdIG9mIHRoaXMudmlld0xpc3RzKSB7XG4gICAgICB2aWV3TGlzdC5yZW1vdmUoKTtcbiAgICB9XG4gICAgdGhpcy52aWV3TGlzdHMuY2xlYXIoKTtcbiAgICBmb3IgKHZhciBbX2NhbGxiYWNrNSwgdGltZW91dF0gb2YgdGhpcy50aW1lb3V0cykge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQudGltZW91dCk7XG4gICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0LnRpbWVvdXQpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpbnRlcnZhbCBvZiB0aGlzLmludGVydmFscykge1xuICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgfVxuICAgIHRoaXMuaW50ZXJ2YWxzLmxlbmd0aCA9IDA7XG4gICAgZm9yICh2YXIgZnJhbWUgb2YgdGhpcy5mcmFtZXMpIHtcbiAgICAgIGZyYW1lKCk7XG4gICAgfVxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5wcmVSdWxlU2V0LnB1cmdlKCk7XG4gICAgdGhpcy5ydWxlU2V0LnB1cmdlKCk7XG4gICAgdGhpcy5yZW1vdmVkID0gdHJ1ZTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW1vdmVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHZpZXc6IHRoaXNcbiAgICAgIH0sXG4gICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgfSkpO1xuICB9XG4gIGZpbmRUYWcoc2VsZWN0b3IpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMubm9kZXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB2b2lkIDA7XG4gICAgICBpZiAoIXRoaXMubm9kZXNbaV0ucXVlcnlTZWxlY3Rvcikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm5vZGVzW2ldLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBuZXcgX1RhZy5UYWcodGhpcy5ub2Rlc1tpXSwgdGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCA9IHRoaXMubm9kZXNbaV0ucXVlcnlTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBfVGFnLlRhZyhyZXN1bHQsIHRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZmluZFRhZ3Moc2VsZWN0b3IpIHtcbiAgICB2YXIgdG9wTGV2ZWwgPSB0aGlzLm5vZGVzLmZpbHRlcihuID0+IG4ubWF0Y2hlcyAmJiBuLm1hdGNoZXMoc2VsZWN0b3IpKTtcbiAgICB2YXIgc3ViTGV2ZWwgPSB0aGlzLm5vZGVzLmZpbHRlcihuID0+IG4ucXVlcnlTZWxlY3RvckFsbCkubWFwKG4gPT4gWy4uLm4ucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcildKS5mbGF0KCkubWFwKG4gPT4gbmV3IF9UYWcuVGFnKG4sIHRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzKSkgfHwgW107XG4gICAgcmV0dXJuIHRvcExldmVsLmNvbmNhdChzdWJMZXZlbCk7XG4gIH1cbiAgb25SZW1vdmUoY2FsbGJhY2spIHtcbiAgICBpZiAoY2FsbGJhY2sgaW5zdGFuY2VvZiBFdmVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9vblJlbW92ZS5hZGQoY2FsbGJhY2spO1xuICB9XG4gIHVwZGF0ZSgpIHt9XG4gIGJlZm9yZVVwZGF0ZShhcmdzKSB7fVxuICBhZnRlclVwZGF0ZShhcmdzKSB7fVxuICBzdHJpbmdUcmFuc2Zvcm1lcihtZXRob2RzKSB7XG4gICAgcmV0dXJuIHggPT4ge1xuICAgICAgZm9yICh2YXIgbSBpbiBtZXRob2RzKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgbWV0aG9kID0gbWV0aG9kc1ttXTtcbiAgICAgICAgd2hpbGUgKHBhcmVudCAmJiAhcGFyZW50W21ldGhvZF0pIHtcbiAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICghcGFyZW50KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHggPSBwYXJlbnRbbWV0aG9kc1ttXV0oeCk7XG4gICAgICB9XG4gICAgICByZXR1cm4geDtcbiAgICB9O1xuICB9XG4gIHN0cmluZ1RvQ2xhc3MocmVmQ2xhc3NuYW1lKSB7XG4gICAgaWYgKFZpZXcucmVmQ2xhc3Nlcy5oYXMocmVmQ2xhc3NuYW1lKSkge1xuICAgICAgcmV0dXJuIFZpZXcucmVmQ2xhc3Nlcy5nZXQocmVmQ2xhc3NuYW1lKTtcbiAgICB9XG4gICAgdmFyIHJlZkNsYXNzU3BsaXQgPSByZWZDbGFzc25hbWUuc3BsaXQoJy8nKTtcbiAgICB2YXIgcmVmU2hvcnRDbGFzcyA9IHJlZkNsYXNzU3BsaXRbcmVmQ2xhc3NTcGxpdC5sZW5ndGggLSAxXTtcbiAgICB2YXIgcmVmQ2xhc3MgPSByZXF1aXJlKHJlZkNsYXNzbmFtZSk7XG4gICAgVmlldy5yZWZDbGFzc2VzLnNldChyZWZDbGFzc25hbWUsIHJlZkNsYXNzW3JlZlNob3J0Q2xhc3NdKTtcbiAgICByZXR1cm4gcmVmQ2xhc3NbcmVmU2hvcnRDbGFzc107XG4gIH1cbiAgcHJldmVudFBhcnNpbmcobm9kZSkge1xuICAgIG5vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZXMubWFwKG4gPT4gbi5vdXRlckhUTUwpLmpvaW4oJyAnKTtcbiAgfVxuICBsaXN0ZW4obm9kZSwgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdGlvbnMgPSBjYWxsYmFjaztcbiAgICAgIGNhbGxiYWNrID0gZXZlbnROYW1lO1xuICAgICAgZXZlbnROYW1lID0gbm9kZTtcbiAgICAgIG5vZGUgPSB0aGlzO1xuICAgIH1cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpc3Rlbihub2RlLm5vZGVzLCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLm1hcChuID0+IHRoaXMubGlzdGVuKG4sIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpKTtcbiAgICAgIC8vIC5mb3JFYWNoKHIgPT4gcigpKTtcbiAgICB9XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdGVuKG5vZGUuZWxlbWVudCwgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgfVxuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB2YXIgcmVtb3ZlID0gKCkgPT4gbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIHZhciByZW1vdmVyID0gKCkgPT4ge1xuICAgICAgcmVtb3ZlKCk7XG4gICAgICByZW1vdmUgPSAoKSA9PiB7fTtcbiAgICB9O1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4gcmVtb3ZlcigpKTtcbiAgICByZXR1cm4gcmVtb3ZlcjtcbiAgfVxuICBkZXRhY2goKSB7XG4gICAgZm9yICh2YXIgbiBpbiB0aGlzLm5vZGVzKSB7XG4gICAgICB0aGlzLm5vZGVzW25dLnJlbW92ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgfVxufVxuZXhwb3J0cy5WaWV3ID0gVmlldztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShWaWV3LCAndGVtcGxhdGVzJywge1xuICB2YWx1ZTogbmV3IE1hcCgpXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShWaWV3LCAncmVmQ2xhc3NlcycsIHtcbiAgdmFsdWU6IG5ldyBNYXAoKVxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9WaWV3TGlzdC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVmlld0xpc3QgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgX1NldE1hcCA9IHJlcXVpcmUoXCIuL1NldE1hcFwiKTtcbnZhciBfQmFnID0gcmVxdWlyZShcIi4vQmFnXCIpO1xuY2xhc3MgVmlld0xpc3Qge1xuICBjb25zdHJ1Y3Rvcih0ZW1wbGF0ZSwgc3ViUHJvcGVydHksIGxpc3QsIHBhcmVudCwga2V5UHJvcGVydHkgPSBudWxsLCB2aWV3Q2xhc3MgPSBudWxsKSB7XG4gICAgdGhpcy5yZW1vdmVkID0gZmFsc2U7XG4gICAgdGhpcy5hcmdzID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICB0aGlzLmFyZ3MudmFsdWUgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKGxpc3QgfHwgT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgdGhpcy5zdWJBcmdzID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICB0aGlzLnZpZXdzID0gW107XG4gICAgdGhpcy5jbGVhbnVwID0gW107XG4gICAgdGhpcy52aWV3Q2xhc3MgPSB2aWV3Q2xhc3M7XG4gICAgdGhpcy5fb25SZW1vdmUgPSBuZXcgX0JhZy5CYWcoKTtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgdGhpcy5zdWJQcm9wZXJ0eSA9IHN1YlByb3BlcnR5O1xuICAgIHRoaXMua2V5UHJvcGVydHkgPSBrZXlQcm9wZXJ0eTtcbiAgICB0aGlzLnRhZyA9IG51bGw7XG4gICAgdGhpcy5kb3duRGViaW5kID0gW107XG4gICAgdGhpcy51cERlYmluZCA9IFtdO1xuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy52aWV3Q291bnQgPSAwO1xuICAgIHRoaXMucmVuZGVyZWQgPSBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpID0+IHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVuZGVyQ29tcGxldGUnLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZTogYWNjZXB0XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLndpbGxSZVJlbmRlciA9IGZhbHNlO1xuICAgIHRoaXMuYXJncy5fX19iZWZvcmUoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgIGlmIChlID09ICdiaW5kVG8nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMucGF1c2VkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLmFyZ3MuX19fYWZ0ZXIoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgIGlmIChlID09ICdiaW5kVG8nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMucGF1c2VkID0gcy5sZW5ndGggPiAxO1xuICAgICAgdGhpcy5yZVJlbmRlcigpO1xuICAgIH0pO1xuICAgIHZhciBkZWJpbmQgPSB0aGlzLmFyZ3MudmFsdWUuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGtrID0gaztcbiAgICAgIGlmICh0eXBlb2YgayA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlzTmFOKGspKSB7XG4gICAgICAgIGtrID0gJ18nICsgaztcbiAgICAgIH1cbiAgICAgIGlmIChkKSB7XG4gICAgICAgIGlmICh0aGlzLnZpZXdzW2trXSkge1xuICAgICAgICAgIHRoaXMudmlld3Nba2tdLnJlbW92ZSh0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy52aWV3c1tra107XG4gICAgICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgICAgIGlmICghdGhpcy52aWV3c1tpXSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpc05hTihpKSkge1xuICAgICAgICAgICAgdGhpcy52aWV3c1tpXS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gaS5zdWJzdHIoMSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy52aWV3c1tpXS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gaTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghdGhpcy52aWV3c1tra10pIHtcbiAgICAgICAgaWYgKCF0aGlzLnZpZXdDb3VudCkge1xuICAgICAgICAgIHRoaXMucmVSZW5kZXIoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy53aWxsUmVSZW5kZXIgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLndpbGxSZVJlbmRlciA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMud2lsbFJlUmVuZGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgIHRoaXMucmVSZW5kZXIoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0aGlzLnZpZXdzW2trXSAmJiB0aGlzLnZpZXdzW2trXS5hcmdzKSB7XG4gICAgICAgIHRoaXMudmlld3Nba2tdLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBrO1xuICAgICAgICB0aGlzLnZpZXdzW2trXS5hcmdzW3RoaXMuc3ViUHJvcGVydHldID0gdjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICB3YWl0OiAwXG4gICAgfSk7XG4gICAgdGhpcy5fb25SZW1vdmUuYWRkKGRlYmluZCk7XG4gICAgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKHRoaXMpO1xuICB9XG4gIHJlbmRlcih0YWcpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciByZW5kZXJzID0gW107XG4gICAgdmFyIF9sb29wID0gZnVuY3Rpb24gKHZpZXcpIHtcbiAgICAgIHZpZXcudmlld0xpc3QgPSBfdGhpcztcbiAgICAgIHZpZXcucmVuZGVyKHRhZywgbnVsbCwgX3RoaXMucGFyZW50KTtcbiAgICAgIHJlbmRlcnMucHVzaCh2aWV3LnJlbmRlcmVkLnRoZW4oKCkgPT4gdmlldykpO1xuICAgIH07XG4gICAgZm9yICh2YXIgdmlldyBvZiB0aGlzLnZpZXdzKSB7XG4gICAgICBfbG9vcCh2aWV3KTtcbiAgICB9XG4gICAgdGhpcy50YWcgPSB0YWc7XG4gICAgUHJvbWlzZS5hbGwocmVuZGVycykudGhlbih2aWV3cyA9PiB0aGlzLnJlbmRlckNvbXBsZXRlKHZpZXdzKSk7XG4gICAgdGhpcy5wYXJlbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RSZW5kZXJlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBrZXk6IHRoaXMuc3ViUHJvcGVydHksXG4gICAgICAgICAgdmFsdWU6IHRoaXMuYXJncy52YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG4gIHJlUmVuZGVyKCkge1xuICAgIHZhciBfdGhpczIgPSB0aGlzO1xuICAgIGlmICh0aGlzLnBhdXNlZCB8fCAhdGhpcy50YWcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHZpZXdzID0gW107XG4gICAgdmFyIGV4aXN0aW5nVmlld3MgPSBuZXcgX1NldE1hcC5TZXRNYXAoKTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgIHZhciB2aWV3ID0gdGhpcy52aWV3c1tpXTtcbiAgICAgIGlmICh2aWV3ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmlld3NbaV0gPSB2aWV3O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciByYXdWYWx1ZSA9IHZpZXcuYXJnc1t0aGlzLnN1YlByb3BlcnR5XTtcbiAgICAgIGV4aXN0aW5nVmlld3MuYWRkKHJhd1ZhbHVlLCB2aWV3KTtcbiAgICAgIHZpZXdzW2ldID0gdmlldztcbiAgICB9XG4gICAgdmFyIGZpbmFsVmlld3MgPSBbXTtcbiAgICB2YXIgZmluYWxWaWV3U2V0ID0gbmV3IFNldCgpO1xuICAgIHRoaXMuZG93bkRlYmluZC5sZW5ndGggJiYgdGhpcy5kb3duRGViaW5kLmZvckVhY2goZCA9PiBkICYmIGQoKSk7XG4gICAgdGhpcy51cERlYmluZC5sZW5ndGggJiYgdGhpcy51cERlYmluZC5mb3JFYWNoKGQgPT4gZCAmJiBkKCkpO1xuICAgIHRoaXMudXBEZWJpbmQubGVuZ3RoID0gMDtcbiAgICB0aGlzLmRvd25EZWJpbmQubGVuZ3RoID0gMDtcbiAgICB2YXIgbWluS2V5ID0gSW5maW5pdHk7XG4gICAgdmFyIGFudGVNaW5LZXkgPSBJbmZpbml0eTtcbiAgICB2YXIgX2xvb3AyID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICB2YXIgayA9IF9pO1xuICAgICAgaWYgKGlzTmFOKGspKSB7XG4gICAgICAgIGsgPSAnXycgKyBfaTtcbiAgICAgIH0gZWxzZSBpZiAoU3RyaW5nKGspLmxlbmd0aCkge1xuICAgICAgICBrID0gTnVtYmVyKGspO1xuICAgICAgfVxuICAgICAgaWYgKF90aGlzMi5hcmdzLnZhbHVlW19pXSAhPT0gdW5kZWZpbmVkICYmIGV4aXN0aW5nVmlld3MuaGFzKF90aGlzMi5hcmdzLnZhbHVlW19pXSkpIHtcbiAgICAgICAgdmFyIGV4aXN0aW5nVmlldyA9IGV4aXN0aW5nVmlld3MuZ2V0T25lKF90aGlzMi5hcmdzLnZhbHVlW19pXSk7XG4gICAgICAgIGlmIChleGlzdGluZ1ZpZXcpIHtcbiAgICAgICAgICBleGlzdGluZ1ZpZXcuYXJnc1tfdGhpczIua2V5UHJvcGVydHldID0gX2k7XG4gICAgICAgICAgZmluYWxWaWV3c1trXSA9IGV4aXN0aW5nVmlldztcbiAgICAgICAgICBmaW5hbFZpZXdTZXQuYWRkKGV4aXN0aW5nVmlldyk7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIGlmICghaXNOYU4oaykpIHtcbiAgICAgICAgICAgIG1pbktleSA9IE1hdGgubWluKG1pbktleSwgayk7XG4gICAgICAgICAgICBrID4gMCAmJiAoYW50ZU1pbktleSA9IE1hdGgubWluKGFudGVNaW5LZXksIGspKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZXhpc3RpbmdWaWV3cy5yZW1vdmUoX3RoaXMyLmFyZ3MudmFsdWVbX2ldLCBleGlzdGluZ1ZpZXcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgIHZhciB2aWV3QXJncyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIHZhciBfdmlldyA9IGZpbmFsVmlld3Nba10gPSBuZXcgX3RoaXMyLnZpZXdDbGFzcyh2aWV3QXJncywgX3RoaXMyLnBhcmVudCk7XG4gICAgICAgIGlmICghaXNOYU4oaykpIHtcbiAgICAgICAgICBtaW5LZXkgPSBNYXRoLm1pbihtaW5LZXksIGspO1xuICAgICAgICAgIGsgPiAwICYmIChhbnRlTWluS2V5ID0gTWF0aC5taW4oYW50ZU1pbktleSwgaykpO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsVmlld3Nba10udGVtcGxhdGUgPSBfdGhpczIudGVtcGxhdGU7XG4gICAgICAgIGZpbmFsVmlld3Nba10udmlld0xpc3QgPSBfdGhpczI7XG4gICAgICAgIGZpbmFsVmlld3Nba10uYXJnc1tfdGhpczIua2V5UHJvcGVydHldID0gX2k7XG4gICAgICAgIGZpbmFsVmlld3Nba10uYXJnc1tfdGhpczIuc3ViUHJvcGVydHldID0gX3RoaXMyLmFyZ3MudmFsdWVbX2ldO1xuICAgICAgICBfdGhpczIudXBEZWJpbmRba10gPSB2aWV3QXJncy5iaW5kVG8oX3RoaXMyLnN1YlByb3BlcnR5LCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIHZhciBpbmRleCA9IHZpZXdBcmdzW190aGlzMi5rZXlQcm9wZXJ0eV07XG4gICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBfdGhpczIuYXJncy52YWx1ZVtpbmRleF07XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIF90aGlzMi5hcmdzLnZhbHVlW2luZGV4XSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICBfdGhpczIuZG93bkRlYmluZFtrXSA9IF90aGlzMi5zdWJBcmdzLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICBkZWxldGUgdmlld0FyZ3Nba107XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZpZXdBcmdzW2tdID0gdjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciB1cERlYmluZCA9ICgpID0+IHtcbiAgICAgICAgICBfdGhpczIudXBEZWJpbmQuZmlsdGVyKHggPT4geCkuZm9yRWFjaChkID0+IGQoKSk7XG4gICAgICAgICAgX3RoaXMyLnVwRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBkb3duRGViaW5kID0gKCkgPT4ge1xuICAgICAgICAgIF90aGlzMi5kb3duRGViaW5kLmZpbHRlcih4ID0+IHgpLmZvckVhY2goZCA9PiBkKCkpO1xuICAgICAgICAgIF90aGlzMi5kb3duRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgICAgIH07XG4gICAgICAgIF92aWV3Lm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBfdGhpczIuX29uUmVtb3ZlLnJlbW92ZSh1cERlYmluZCk7XG4gICAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5yZW1vdmUoZG93bkRlYmluZCk7XG4gICAgICAgICAgX3RoaXMyLnVwRGViaW5kW2tdICYmIF90aGlzMi51cERlYmluZFtrXSgpO1xuICAgICAgICAgIF90aGlzMi5kb3duRGViaW5kW2tdICYmIF90aGlzMi5kb3duRGViaW5kW2tdKCk7XG4gICAgICAgICAgZGVsZXRlIF90aGlzMi51cERlYmluZFtrXTtcbiAgICAgICAgICBkZWxldGUgX3RoaXMyLmRvd25EZWJpbmRba107XG4gICAgICAgIH0pO1xuICAgICAgICBfdGhpczIuX29uUmVtb3ZlLmFkZCh1cERlYmluZCk7XG4gICAgICAgIF90aGlzMi5fb25SZW1vdmUuYWRkKGRvd25EZWJpbmQpO1xuICAgICAgICB2aWV3QXJnc1tfdGhpczIuc3ViUHJvcGVydHldID0gX3RoaXMyLmFyZ3MudmFsdWVbX2ldO1xuICAgICAgfVxuICAgIH07XG4gICAgZm9yICh2YXIgX2kgaW4gdGhpcy5hcmdzLnZhbHVlKSB7XG4gICAgICBfbG9vcDIoKTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2kyIGluIHZpZXdzKSB7XG4gICAgICBpZiAodmlld3NbX2kyXSAmJiAhZmluYWxWaWV3U2V0Lmhhcyh2aWV3c1tfaTJdKSkge1xuICAgICAgICB2aWV3c1tfaTJdLnJlbW92ZSh0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5hcmdzLnZhbHVlKSkge1xuICAgICAgdmFyIGxvY2FsTWluID0gbWluS2V5ID09PSAwICYmIGZpbmFsVmlld3NbMV0gIT09IHVuZGVmaW5lZCAmJiBmaW5hbFZpZXdzLmxlbmd0aCA+IDEgfHwgYW50ZU1pbktleSA9PT0gSW5maW5pdHkgPyBtaW5LZXkgOiBhbnRlTWluS2V5O1xuICAgICAgdmFyIHJlbmRlclJlY3Vyc2UgPSAoaSA9IDApID0+IHtcbiAgICAgICAgdmFyIGlpID0gZmluYWxWaWV3cy5sZW5ndGggLSBpIC0gMTtcbiAgICAgICAgd2hpbGUgKGlpID4gbG9jYWxNaW4gJiYgZmluYWxWaWV3c1tpaV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlpLS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlpIDwgbG9jYWxNaW4pIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbmFsVmlld3NbaWldID09PSB0aGlzLnZpZXdzW2lpXSkge1xuICAgICAgICAgIGlmIChmaW5hbFZpZXdzW2lpXSAmJiAhZmluYWxWaWV3c1tpaV0uZmlyc3ROb2RlKSB7XG4gICAgICAgICAgICBmaW5hbFZpZXdzW2lpXS5yZW5kZXIodGhpcy50YWcsIGZpbmFsVmlld3NbaWkgKyAxXSwgdGhpcy5wYXJlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGZpbmFsVmlld3NbaWldLnJlbmRlcmVkLnRoZW4oKCkgPT4gcmVuZGVyUmVjdXJzZShOdW1iZXIoaSkgKyAxKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzcGxpdCA9IDUwMDtcbiAgICAgICAgICAgIGlmIChpID09PSAwIHx8IGkgJSBzcGxpdCkge1xuICAgICAgICAgICAgICByZXR1cm4gcmVuZGVyUmVjdXJzZShOdW1iZXIoaSkgKyAxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhY2NlcHQgPT4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGFjY2VwdChyZW5kZXJSZWN1cnNlKE51bWJlcihpKSArIDEpKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmaW5hbFZpZXdzW2lpXS5yZW5kZXIodGhpcy50YWcsIGZpbmFsVmlld3NbaWkgKyAxXSwgdGhpcy5wYXJlbnQpO1xuICAgICAgICB0aGlzLnZpZXdzLnNwbGljZShpaSwgMCwgZmluYWxWaWV3c1tpaV0pO1xuICAgICAgICByZXR1cm4gZmluYWxWaWV3c1tpaV0ucmVuZGVyZWQudGhlbigoKSA9PiByZW5kZXJSZWN1cnNlKGkgKyAxKSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5yZW5kZXJlZCA9IHJlbmRlclJlY3Vyc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHJlbmRlcnMgPSBbXTtcbiAgICAgIHZhciBsZWZ0b3ZlcnMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5jcmVhdGUobnVsbCksIGZpbmFsVmlld3MpO1xuICAgICAgdmFyIGlzSW50ID0geCA9PiBwYXJzZUludCh4KSA9PT0geCAtIDA7XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGZpbmFsVmlld3MpLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgaWYgKGlzSW50KGEpICYmIGlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIE1hdGguc2lnbihhIC0gYik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc0ludChhKSAmJiAhaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzSW50KGEpICYmIGlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0ludChhKSAmJiAhaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgX2xvb3AzID0gZnVuY3Rpb24gKF9pMykge1xuICAgICAgICBkZWxldGUgbGVmdG92ZXJzW19pM107XG4gICAgICAgIGlmIChmaW5hbFZpZXdzW19pM10uZmlyc3ROb2RlICYmIGZpbmFsVmlld3NbX2kzXSA9PT0gX3RoaXMyLnZpZXdzW19pM10pIHtcbiAgICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBmaW5hbFZpZXdzW19pM10ucmVuZGVyKF90aGlzMi50YWcsIG51bGwsIF90aGlzMi5wYXJlbnQpO1xuICAgICAgICByZW5kZXJzLnB1c2goZmluYWxWaWV3c1tfaTNdLnJlbmRlcmVkLnRoZW4oKCkgPT4gZmluYWxWaWV3c1tfaTNdKSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgX2kzIG9mIGtleXMpIHtcbiAgICAgICAgaWYgKF9sb29wMyhfaTMpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pNCBpbiBsZWZ0b3ZlcnMpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuYXJncy52aWV3c1tfaTRdO1xuICAgICAgICBsZWZ0b3ZlcnMucmVtb3ZlKHRydWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5yZW5kZXJlZCA9IFByb21pc2UuYWxsKHJlbmRlcnMpO1xuICAgIH1cbiAgICBmb3IgKHZhciBfaTUgaW4gZmluYWxWaWV3cykge1xuICAgICAgaWYgKGlzTmFOKF9pNSkpIHtcbiAgICAgICAgZmluYWxWaWV3c1tfaTVdLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBfaTUuc3Vic3RyKDEpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZpbmFsVmlld3NbX2k1XS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gX2k1O1xuICAgIH1cbiAgICB0aGlzLnZpZXdzID0gQXJyYXkuaXNBcnJheSh0aGlzLmFyZ3MudmFsdWUpID8gWy4uLmZpbmFsVmlld3NdIDogZmluYWxWaWV3cztcbiAgICB0aGlzLnZpZXdDb3VudCA9IGZpbmFsVmlld3MubGVuZ3RoO1xuICAgIGZpbmFsVmlld1NldC5jbGVhcigpO1xuICAgIHRoaXMud2lsbFJlUmVuZGVyID0gZmFsc2U7XG4gICAgdGhpcy5yZW5kZXJlZC50aGVuKCgpID0+IHtcbiAgICAgIHRoaXMucGFyZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsaXN0UmVuZGVyZWQnLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAga2V5OiB0aGlzLnN1YlByb3BlcnR5LFxuICAgICAgICAgICAgdmFsdWU6IHRoaXMuYXJncy52YWx1ZSxcbiAgICAgICAgICAgIHRhZzogdGhpcy50YWdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICAgIHRoaXMudGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsaXN0UmVuZGVyZWQnLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAga2V5OiB0aGlzLnN1YlByb3BlcnR5LFxuICAgICAgICAgICAgdmFsdWU6IHRoaXMuYXJncy52YWx1ZSxcbiAgICAgICAgICAgIHRhZzogdGhpcy50YWdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJlZDtcbiAgfVxuICBwYXVzZShwYXVzZSA9IHRydWUpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgIHRoaXMudmlld3NbaV0ucGF1c2UocGF1c2UpO1xuICAgIH1cbiAgfVxuICBvblJlbW92ZShjYWxsYmFjaykge1xuICAgIHRoaXMuX29uUmVtb3ZlLmFkZChjYWxsYmFjayk7XG4gIH1cbiAgcmVtb3ZlKCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgdGhpcy52aWV3c1tpXSAmJiB0aGlzLnZpZXdzW2ldLnJlbW92ZSh0cnVlKTtcbiAgICB9XG4gICAgdmFyIG9uUmVtb3ZlID0gdGhpcy5fb25SZW1vdmUuaXRlbXMoKTtcbiAgICBmb3IgKHZhciBfaTYgaW4gb25SZW1vdmUpIHtcbiAgICAgIHRoaXMuX29uUmVtb3ZlLnJlbW92ZShvblJlbW92ZVtfaTZdKTtcbiAgICAgIG9uUmVtb3ZlW19pNl0oKTtcbiAgICB9XG4gICAgdmFyIGNsZWFudXA7XG4gICAgd2hpbGUgKHRoaXMuY2xlYW51cC5sZW5ndGgpIHtcbiAgICAgIGNsZWFudXAgPSB0aGlzLmNsZWFudXAucG9wKCk7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfVxuICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICB3aGlsZSAodGhpcy50YWcgJiYgdGhpcy50YWcuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy50YWcucmVtb3ZlQ2hpbGQodGhpcy50YWcuZmlyc3RDaGlsZCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN1YkFyZ3MpIHtcbiAgICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMuc3ViQXJncyk7XG4gICAgfVxuICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMuYXJncyk7XG5cbiAgICAvLyBpZih0aGlzLmFyZ3MudmFsdWUgJiYgIXRoaXMuYXJncy52YWx1ZS5pc0JvdW5kKCkpXG4gICAgLy8ge1xuICAgIC8vIFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzLmFyZ3MudmFsdWUpO1xuICAgIC8vIH1cblxuICAgIHRoaXMucmVtb3ZlZCA9IHRydWU7XG4gIH1cbn1cbmV4cG9ydHMuVmlld0xpc3QgPSBWaWV3TGlzdDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9pbnB1dC9LZXlib2FyZC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuS2V5Ym9hcmQgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4uL2Jhc2UvQmluZGFibGVcIik7XG5jbGFzcyBLZXlib2FyZCB7XG4gIHN0YXRpYyBnZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlIHx8IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKG5ldyB0aGlzKCkpO1xuICB9XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubWF4RGVjYXkgPSAxMjA7XG4gICAgdGhpcy5jb21ib1RpbWUgPSA1MDA7XG4gICAgdGhpcy5saXN0ZW5pbmcgPSBmYWxzZTtcbiAgICB0aGlzLmZvY3VzRWxlbWVudCA9IGRvY3VtZW50LmJvZHk7XG4gICAgdGhpc1tfQmluZGFibGUuQmluZGFibGUuTm9HZXR0ZXJzXSA9IHRydWU7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjb21ibycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZShbXSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3doaWNocycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2NvZGVzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAna2V5cycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZXNzZWRXaGljaCcsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZXNzZWRDb2RlJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlc3NlZEtleScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbGVhc2VkV2hpY2gnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZWxlYXNlZENvZGUnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZWxlYXNlZEtleScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2tleVJlZnMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBldmVudCA9PiB7XG4gICAgICBpZiAoIXRoaXMubGlzdGVuaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghKHRoaXMua2V5c1tldmVudC5rZXldID4gMCkgJiYgdGhpcy5mb2N1c0VsZW1lbnQgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAhPT0gdGhpcy5mb2N1c0VsZW1lbnQgJiYgKCF0aGlzLmZvY3VzRWxlbWVudC5jb250YWlucyhkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB8fCBkb2N1bWVudC5hY3RpdmVFbGVtZW50Lm1hdGNoZXMoJ2lucHV0LHRleHRhcmVhJykpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnJlbGVhc2VkV2hpY2hbZXZlbnQud2hpY2hdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucmVsZWFzZWRDb2RlW2V2ZW50LmNvZGVdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucmVsZWFzZWRLZXlbZXZlbnQua2V5XSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLndoaWNoc1tldmVudC53aGljaF0gPSAtMTtcbiAgICAgIHRoaXMuY29kZXNbZXZlbnQuY29kZV0gPSAtMTtcbiAgICAgIHRoaXMua2V5c1tldmVudC5rZXldID0gLTE7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGV2ZW50ID0+IHtcbiAgICAgIGlmICghdGhpcy5saXN0ZW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZm9jdXNFbGVtZW50ICYmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgIT09IHRoaXMuZm9jdXNFbGVtZW50ICYmICghdGhpcy5mb2N1c0VsZW1lbnQuY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkgfHwgZG9jdW1lbnQuYWN0aXZlRWxlbWVudC5tYXRjaGVzKCdpbnB1dCx0ZXh0YXJlYScpKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGV2ZW50LnJlcGVhdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLmNvbWJvLnB1c2goZXZlbnQuY29kZSk7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jb21ib1RpbWVyKTtcbiAgICAgIHRoaXMuY29tYm9UaW1lciA9IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5jb21iby5zcGxpY2UoMCksIHRoaXMuY29tYm9UaW1lKTtcbiAgICAgIHRoaXMucHJlc3NlZFdoaWNoW2V2ZW50LndoaWNoXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnByZXNzZWRDb2RlW2V2ZW50LmNvZGVdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucHJlc3NlZEtleVtldmVudC5rZXldID0gRGF0ZS5ub3coKTtcbiAgICAgIGlmICh0aGlzLmtleXNbZXZlbnQua2V5XSA+IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy53aGljaHNbZXZlbnQud2hpY2hdID0gMTtcbiAgICAgIHRoaXMuY29kZXNbZXZlbnQuY29kZV0gPSAxO1xuICAgICAgdGhpcy5rZXlzW2V2ZW50LmtleV0gPSAxO1xuICAgIH0pO1xuICAgIHZhciB3aW5kb3dCbHVyID0gZXZlbnQgPT4ge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLmtleXMpIHtcbiAgICAgICAgaWYgKHRoaXMua2V5c1tpXSA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbGVhc2VkS2V5W2ldID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdGhpcy5rZXlzW2ldID0gLTE7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaSBpbiB0aGlzLmNvZGVzKSB7XG4gICAgICAgIGlmICh0aGlzLmNvZGVzW19pXSA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbGVhc2VkQ29kZVtfaV0gPSBEYXRlLm5vdygpO1xuICAgICAgICB0aGlzLmNvZGVzW19pXSA9IC0xO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2kyIGluIHRoaXMud2hpY2hzKSB7XG4gICAgICAgIGlmICh0aGlzLndoaWNoc1tfaTJdIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVsZWFzZWRXaGljaFtfaTJdID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdGhpcy53aGljaHNbX2kyXSA9IC0xO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCB3aW5kb3dCbHVyKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsICgpID0+IHtcbiAgICAgIGlmIChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPT09ICd2aXNpYmxlJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB3aW5kb3dCbHVyKCk7XG4gICAgfSk7XG4gIH1cbiAgZ2V0S2V5UmVmKGtleUNvZGUpIHtcbiAgICB2YXIga2V5UmVmID0gdGhpcy5rZXlSZWZzW2tleUNvZGVdID0gdGhpcy5rZXlSZWZzW2tleUNvZGVdIHx8IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KTtcbiAgICByZXR1cm4ga2V5UmVmO1xuICB9XG4gIGdldEtleVRpbWUoa2V5KSB7XG4gICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZEtleVtrZXldO1xuICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkS2V5W2tleV07XG4gICAgaWYgKCFwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gcHJlc3NlZDtcbiAgICB9XG4gICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gIH1cbiAgZ2V0Q29kZVRpbWUoY29kZSkge1xuICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRDb2RlW2NvZGVdO1xuICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkQ29kZVtjb2RlXTtcbiAgICBpZiAoIXByZXNzZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBwcmVzc2VkO1xuICAgIH1cbiAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgfVxuICBnZXRXaGljaFRpbWUoY29kZSkge1xuICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRXaGljaFtjb2RlXTtcbiAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZFdoaWNoW2NvZGVdO1xuICAgIGlmICghcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHByZXNzZWQ7XG4gICAgfVxuICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICB9XG4gIGdldEtleShrZXkpIHtcbiAgICBpZiAoIXRoaXMua2V5c1trZXldKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMua2V5c1trZXldO1xuICB9XG4gIGdldEtleUNvZGUoY29kZSkge1xuICAgIGlmICghdGhpcy5jb2Rlc1tjb2RlXSkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvZGVzW2NvZGVdO1xuICB9XG4gIHJlc2V0KCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5rZXlzKSB7XG4gICAgICBkZWxldGUgdGhpcy5rZXlzW2ldO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMuY29kZXMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmNvZGVzW2ldO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMud2hpY2hzKSB7XG4gICAgICBkZWxldGUgdGhpcy53aGljaHNbaV07XG4gICAgfVxuICB9XG4gIHVwZGF0ZSgpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMua2V5cykge1xuICAgICAgaWYgKHRoaXMua2V5c1tpXSA+IDApIHtcbiAgICAgICAgdGhpcy5rZXlzW2ldKys7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMua2V5c1tpXSA+IC10aGlzLm1heERlY2F5KSB7XG4gICAgICAgIHRoaXMua2V5c1tpXS0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMua2V5c1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmNvZGVzKSB7XG4gICAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkQ29kZVtpXTtcbiAgICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkQ29kZVtpXTtcbiAgICAgIHZhciBrZXlSZWYgPSB0aGlzLmdldEtleVJlZihpKTtcbiAgICAgIGlmICh0aGlzLmNvZGVzW2ldID4gMCkge1xuICAgICAgICBrZXlSZWYuZnJhbWVzID0gdGhpcy5jb2Rlc1tpXSsrO1xuICAgICAgICBrZXlSZWYudGltZSA9IHByZXNzZWQgPyBEYXRlLm5vdygpIC0gcHJlc3NlZCA6IDA7XG4gICAgICAgIGtleVJlZi5kb3duID0gdHJ1ZTtcbiAgICAgICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuY29kZXNbaV0gPiAtdGhpcy5tYXhEZWNheSkge1xuICAgICAgICBrZXlSZWYuZnJhbWVzID0gdGhpcy5jb2Rlc1tpXS0tO1xuICAgICAgICBrZXlSZWYudGltZSA9IHJlbGVhc2VkIC0gRGF0ZS5ub3coKTtcbiAgICAgICAga2V5UmVmLmRvd24gPSBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGtleVJlZi5mcmFtZXMgPSAwO1xuICAgICAgICBrZXlSZWYudGltZSA9IDA7XG4gICAgICAgIGtleVJlZi5kb3duID0gZmFsc2U7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvZGVzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMud2hpY2hzKSB7XG4gICAgICBpZiAodGhpcy53aGljaHNbaV0gPiAwKSB7XG4gICAgICAgIHRoaXMud2hpY2hzW2ldKys7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMud2hpY2hzW2ldID4gLXRoaXMubWF4RGVjYXkpIHtcbiAgICAgICAgdGhpcy53aGljaHNbaV0tLTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndoaWNoc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbmV4cG9ydHMuS2V5Ym9hcmQgPSBLZXlib2FyZDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5FdmVudFRhcmdldE1peGluID0gdm9pZCAwO1xudmFyIF9NaXhpbiA9IHJlcXVpcmUoXCIuLi9iYXNlL01peGluXCIpO1xudmFyIEV2ZW50VGFyZ2V0UGFyZW50ID0gU3ltYm9sKCdFdmVudFRhcmdldFBhcmVudCcpO1xudmFyIENhbGxIYW5kbGVyID0gU3ltYm9sKCdDYWxsSGFuZGxlcicpO1xudmFyIENhcHR1cmUgPSBTeW1ib2woJ0NhcHR1cmUnKTtcbnZhciBCdWJibGUgPSBTeW1ib2woJ0J1YmJsZScpO1xudmFyIFRhcmdldCA9IFN5bWJvbCgnVGFyZ2V0Jyk7XG52YXIgSGFuZGxlcnNCdWJibGUgPSBTeW1ib2woJ0hhbmRsZXJzQnViYmxlJyk7XG52YXIgSGFuZGxlcnNDYXB0dXJlID0gU3ltYm9sKCdIYW5kbGVyc0NhcHR1cmUnKTtcbnZhciBFdmVudFRhcmdldE1peGluID0gZXhwb3J0cy5FdmVudFRhcmdldE1peGluID0ge1xuICBbX01peGluLk1peGluLkNvbnN0cnVjdG9yXSgpIHtcbiAgICB0aGlzW0hhbmRsZXJzQ2FwdHVyZV0gPSBuZXcgTWFwKCk7XG4gICAgdGhpc1tIYW5kbGVyc0J1YmJsZV0gPSBuZXcgTWFwKCk7XG4gIH0sXG4gIGRpc3BhdGNoRXZlbnQoLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgaWYgKHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KGV2ZW50KTtcbiAgICAgIGFyZ3NbMF0gPSBldmVudDtcbiAgICB9XG4gICAgZXZlbnQuY3ZQYXRoID0gZXZlbnQuY3ZQYXRoIHx8IFtdO1xuICAgIGV2ZW50LmN2VGFyZ2V0ID0gZXZlbnQuY3ZDdXJyZW50VGFyZ2V0ID0gdGhpcztcbiAgICB2YXIgcmVzdWx0ID0gdGhpc1tDYXB0dXJlXSguLi5hcmdzKTtcbiAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICB2YXIgaGFuZGxlcnMgPSBbXTtcbiAgICBpZiAodGhpc1tIYW5kbGVyc0NhcHR1cmVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgdmFyIGhhbmRsZXJNYXAgPSB0aGlzW0hhbmRsZXJzQ2FwdHVyZV0uZ2V0KGV2ZW50LnR5cGUpO1xuICAgICAgdmFyIG5ld0hhbmRsZXJzID0gWy4uLmhhbmRsZXJNYXBdO1xuICAgICAgbmV3SGFuZGxlcnMuZm9yRWFjaChoID0+IGgucHVzaChoYW5kbGVyTWFwKSk7XG4gICAgICBoYW5kbGVycy5wdXNoKC4uLm5ld0hhbmRsZXJzKTtcbiAgICB9XG4gICAgaWYgKHRoaXNbSGFuZGxlcnNCdWJibGVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgdmFyIF9oYW5kbGVyTWFwID0gdGhpc1tIYW5kbGVyc0J1YmJsZV0uZ2V0KGV2ZW50LnR5cGUpO1xuICAgICAgdmFyIF9uZXdIYW5kbGVycyA9IFsuLi5faGFuZGxlck1hcF07XG4gICAgICBfbmV3SGFuZGxlcnMuZm9yRWFjaChoID0+IGgucHVzaChfaGFuZGxlck1hcCkpO1xuICAgICAgaGFuZGxlcnMucHVzaCguLi5fbmV3SGFuZGxlcnMpO1xuICAgIH1cbiAgICBoYW5kbGVycy5wdXNoKFsoKSA9PiB0aGlzW0NhbGxIYW5kbGVyXSguLi5hcmdzKSwge30sIG51bGxdKTtcbiAgICBmb3IgKHZhciBbaGFuZGxlciwgb3B0aW9ucywgbWFwXSBvZiBoYW5kbGVycykge1xuICAgICAgaWYgKG9wdGlvbnMub25jZSkge1xuICAgICAgICBtYXAuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gaGFuZGxlcihldmVudCk7XG4gICAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiByZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWV2ZW50LmNhbmNlbGFibGUgfHwgIWV2ZW50LmNhbmNlbEJ1YmJsZSAmJiByZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICB0aGlzW0J1YmJsZV0oLi4uYXJncyk7XG4gICAgfVxuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF0pIHtcbiAgICAgIE9iamVjdC5mcmVlemUoZXZlbnQuY3ZQYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIGV2ZW50LnJldHVyblZhbHVlO1xuICB9LFxuICBhZGRFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgdXNlQ2FwdHVyZTogdHJ1ZVxuICAgICAgfTtcbiAgICB9XG4gICAgdmFyIGhhbmRsZXJzID0gSGFuZGxlcnNCdWJibGU7XG4gICAgaWYgKG9wdGlvbnMudXNlQ2FwdHVyZSkge1xuICAgICAgaGFuZGxlcnMgPSBIYW5kbGVyc0NhcHR1cmU7XG4gICAgfVxuICAgIGlmICghdGhpc1toYW5kbGVyc10uaGFzKHR5cGUpKSB7XG4gICAgICB0aGlzW2hhbmRsZXJzXS5zZXQodHlwZSwgbmV3IE1hcCgpKTtcbiAgICB9XG4gICAgdGhpc1toYW5kbGVyc10uZ2V0KHR5cGUpLnNldChjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgaWYgKG9wdGlvbnMuc2lnbmFsKSB7XG4gICAgICBvcHRpb25zLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIGV2ZW50ID0+IHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgb3B0aW9ucyksIHtcbiAgICAgICAgb25jZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICByZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgdXNlQ2FwdHVyZTogdHJ1ZVxuICAgICAgfTtcbiAgICB9XG4gICAgdmFyIGhhbmRsZXJzID0gSGFuZGxlcnNCdWJibGU7XG4gICAgaWYgKG9wdGlvbnMudXNlQ2FwdHVyZSkge1xuICAgICAgaGFuZGxlcnMgPSBIYW5kbGVyc0NhcHR1cmU7XG4gICAgfVxuICAgIGlmICghdGhpc1toYW5kbGVyc10uaGFzKHR5cGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXNbaGFuZGxlcnNdLmdldCh0eXBlKS5kZWxldGUoY2FsbGJhY2spO1xuICB9LFxuICBbQ2FwdHVyZV0oLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgZXZlbnQuY3ZQYXRoLnB1c2godGhpcyk7XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQ2FwdHVyZV0oLi4uYXJncyk7XG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQ2FwdHVyZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGV2ZW50LmN2Q3VycmVudFRhcmdldCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdO1xuICAgIHZhciB7XG4gICAgICB0eXBlXG4gICAgfSA9IGV2ZW50O1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQ2FwdHVyZV0uZ2V0KHR5cGUpO1xuICAgIGZvciAodmFyIFtoYW5kbGVyLCBvcHRpb25zXSBvZiBoYW5kbGVycykge1xuICAgICAgaWYgKG9wdGlvbnMub25jZSkge1xuICAgICAgICBoYW5kbGVycy5kZWxldGUoaGFuZGxlcik7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG4gIFtCdWJibGVdKC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGlmICghZXZlbnQuYnViYmxlcyB8fCAhdGhpc1tFdmVudFRhcmdldFBhcmVudF0gfHwgZXZlbnQuY2FuY2VsQnViYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNCdWJibGVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgcmV0dXJuIHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0J1YmJsZV0oLi4uYXJncyk7XG4gICAgfVxuICAgIHZhciByZXN1bHQ7XG4gICAgZXZlbnQuY3ZDdXJyZW50VGFyZ2V0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF07XG4gICAgdmFyIHtcbiAgICAgIHR5cGVcbiAgICB9ID0gZXZlbnQ7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNCdWJibGVdLmdldChldmVudC50eXBlKTtcbiAgICBmb3IgKHZhciBbaGFuZGxlciwgb3B0aW9uc10gb2YgaGFuZGxlcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgaGFuZGxlcnMuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gaGFuZGxlcihldmVudCk7XG4gICAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiByZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJlc3VsdCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0NhbGxIYW5kbGVyXSguLi5hcmdzKTtcbiAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQnViYmxlXSguLi5hcmdzKTtcbiAgfSxcbiAgW0NhbGxIYW5kbGVyXSguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZGVmYXVsdEhhbmRsZXIgPSBgb24ke2V2ZW50LnR5cGVbMF0udG9VcHBlckNhc2UoKSArIGV2ZW50LnR5cGUuc2xpY2UoMSl9YDtcbiAgICBpZiAodHlwZW9mIHRoaXNbZGVmYXVsdEhhbmRsZXJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpc1tkZWZhdWx0SGFuZGxlcl0oZXZlbnQpO1xuICAgIH1cbiAgfVxufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFdmVudFRhcmdldE1peGluLCAnUGFyZW50Jywge1xuICB2YWx1ZTogRXZlbnRUYXJnZXRQYXJlbnRcbn0pO1xuICB9KSgpO1xufSk7IiwiZXhwb3J0IGNsYXNzIENvbmZpZyB7fTtcblxuQ29uZmlnLnRpdGxlID0gJ3dnbDJkJztcbi8vIENvbmZpZy4iLCJleHBvcnQgY2xhc3MgR2wyZFxue1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50KVxuXHR7XG5cdFx0dGhpcy5lbGVtZW50ICAgPSBlbGVtZW50IHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuY29udGV4dCAgID0gdGhpcy5lbGVtZW50LmdldENvbnRleHQoJ3dlYmdsJyk7XG5cdFx0dGhpcy5zY3JlZW5TY2FsZSA9IDE7XG5cdFx0dGhpcy56b29tTGV2ZWwgPSAyO1xuXHR9XG5cblx0Y2xlYW51cCgpXG5cdHtcblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXHR9XG5cblx0Y3JlYXRlU2hhZGVyKGxvY2F0aW9uKVxuXHR7XG5cdFx0Y29uc3QgZXh0ZW5zaW9uID0gbG9jYXRpb24uc3Vic3RyaW5nKGxvY2F0aW9uLmxhc3RJbmRleE9mKCcuJykrMSk7XG5cdFx0bGV0ICAgdHlwZSA9IG51bGw7XG5cblx0XHRzd2l0Y2goZXh0ZW5zaW9uLnRvVXBwZXJDYXNlKCkpXG5cdFx0e1xuXHRcdFx0Y2FzZSAnVkVSVCc6XG5cdFx0XHRcdHR5cGUgPSB0aGlzLmNvbnRleHQuVkVSVEVYX1NIQURFUjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdGUkFHJzpcblx0XHRcdFx0dHlwZSA9IHRoaXMuY29udGV4dC5GUkFHTUVOVF9TSEFERVI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNoYWRlciA9IHRoaXMuY29udGV4dC5jcmVhdGVTaGFkZXIodHlwZSk7XG5cdFx0Y29uc3Qgc291cmNlID0gcmVxdWlyZShsb2NhdGlvbik7XG5cblx0XHR0aGlzLmNvbnRleHQuc2hhZGVyU291cmNlKHNoYWRlciwgc291cmNlKTtcblx0XHR0aGlzLmNvbnRleHQuY29tcGlsZVNoYWRlcihzaGFkZXIpO1xuXG5cdFx0Y29uc3Qgc3VjY2VzcyA9IHRoaXMuY29udGV4dC5nZXRTaGFkZXJQYXJhbWV0ZXIoXG5cdFx0XHRzaGFkZXJcblx0XHRcdCwgdGhpcy5jb250ZXh0LkNPTVBJTEVfU1RBVFVTXG5cdFx0KTtcblxuXHRcdGlmKHN1Y2Nlc3MpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHNoYWRlcjtcblx0XHR9XG5cblx0XHRjb25zb2xlLmVycm9yKHRoaXMuY29udGV4dC5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcikpO1xuXG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVNoYWRlcihzaGFkZXIpO1xuXHR9XG5cblx0Y3JlYXRlUHJvZ3JhbSh2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyKVxuXHR7XG5cdFx0Y29uc3QgcHJvZ3JhbSA9IHRoaXMuY29udGV4dC5jcmVhdGVQcm9ncmFtKCk7XG5cblx0XHR0aGlzLmNvbnRleHQuYXR0YWNoU2hhZGVyKHByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmF0dGFjaFNoYWRlcihwcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XG5cblx0XHR0aGlzLmNvbnRleHQubGlua1Byb2dyYW0ocHJvZ3JhbSk7XG5cblx0XHR0aGlzLmNvbnRleHQuZGV0YWNoU2hhZGVyKHByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmRldGFjaFNoYWRlcihwcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVNoYWRlcih2ZXJ0ZXhTaGFkZXIpO1xuXHRcdHRoaXMuY29udGV4dC5kZWxldGVTaGFkZXIoZnJhZ21lbnRTaGFkZXIpO1xuXG5cdFx0aWYodGhpcy5jb250ZXh0LmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgdGhpcy5jb250ZXh0LkxJTktfU1RBVFVTKSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gcHJvZ3JhbTtcblx0XHR9XG5cblx0XHRjb25zb2xlLmVycm9yKHRoaXMuY29udGV4dC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG5cblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlUHJvZ3JhbShwcm9ncmFtKTtcblxuXHRcdHJldHVybiBwcm9ncmFtO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBWaWV3IGFzIEJhc2VWaWV3IH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvVmlldyc7XG5pbXBvcnQgeyBLZXlib2FyZCB9IGZyb20gJ2N1cnZhdHVyZS9pbnB1dC9LZXlib2FyZCdcbmltcG9ydCB7IEJhZyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JhZyc7XG5cbmltcG9ydCB7IENvbmZpZyB9IGZyb20gJ0NvbmZpZyc7XG5cbmltcG9ydCB7IE1hcCBhcyBXb3JsZE1hcCB9IGZyb20gJy4uL3dvcmxkL01hcCc7XG5cbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZVNoZWV0JztcbmltcG9ydCB7IFNwcml0ZUJvYXJkIH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZUJvYXJkJztcblxuaW1wb3J0IHsgQ29udHJvbGxlciBhcyBPblNjcmVlbkpveVBhZCB9IGZyb20gJy4uL3VpL0NvbnRyb2xsZXInO1xuaW1wb3J0IHsgTWFwRWRpdG9yICAgfSBmcm9tICcuLi91aS9NYXBFZGl0b3InO1xuXG5pbXBvcnQgeyBFbnRpdHkgfSBmcm9tICcuLi9tb2RlbC9FbnRpdHknO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi4vc3ByaXRlL0NhbWVyYSc7XG5cbmltcG9ydCB7IENvbnRyb2xsZXIgfSBmcm9tICcuLi9tb2RlbC9Db250cm9sbGVyJztcbmltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGUnO1xuXG5jb25zdCBBcHBsaWNhdGlvbiA9IHt9O1xuXG5BcHBsaWNhdGlvbi5vblNjcmVlbkpveVBhZCA9IG5ldyBPblNjcmVlbkpveVBhZDtcbkFwcGxpY2F0aW9uLmtleWJvYXJkID0gS2V5Ym9hcmQuZ2V0KCk7XG5cblxuZXhwb3J0IGNsYXNzIFZpZXcgZXh0ZW5kcyBCYXNlVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0d2luZG93LnNtUHJvZmlsaW5nID0gdHJ1ZTtcblx0XHRzdXBlcihhcmdzKTtcblx0XHR0aGlzLnRlbXBsYXRlICA9IHJlcXVpcmUoJy4vdmlldy50bXAnKTtcblx0XHR0aGlzLnJvdXRlcyAgICA9IFtdO1xuXG5cdFx0dGhpcy5lbnRpdGllcyAgPSBuZXcgQmFnO1xuXHRcdHRoaXMua2V5Ym9hcmQgID0gQXBwbGljYXRpb24ua2V5Ym9hcmQ7XG5cdFx0dGhpcy5zcGVlZCAgICAgPSAyNDtcblx0XHR0aGlzLm1heFNwZWVkICA9IHRoaXMuc3BlZWQ7XG5cblx0XHR0aGlzLmFyZ3MuY29udHJvbGxlciA9IEFwcGxpY2F0aW9uLm9uU2NyZWVuSm95UGFkO1xuXG5cdFx0dGhpcy5hcmdzLmZwcyAgPSAwO1xuXHRcdHRoaXMuYXJncy5zcHMgID0gMDtcblxuXHRcdHRoaXMuYXJncy5jYW1YID0gMDtcblx0XHR0aGlzLmFyZ3MuY2FtWSA9IDA7XG5cblx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrICAgICAgPSA2MDtcblx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPSA2MDtcblxuXHRcdHRoaXMuYXJncy5zaG93RWRpdG9yID0gZmFsc2U7XG5cblx0XHR0aGlzLmtleWJvYXJkLmxpc3RlbmluZyA9IHRydWU7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdlJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5tYXAuZXhwb3J0KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdFc2NhcGUnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPT09IC0xKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnVuc2VsZWN0KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdIb21lJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLmZyYW1lTG9jaysrO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnRW5kJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLmZyYW1lTG9jay0tO1xuXG5cdFx0XHRcdGlmKHRoaXMuYXJncy5mcmFtZUxvY2sgPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hcmdzLmZyYW1lTG9jayA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ1BhZ2VVcCcsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jaysrO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnUGFnZURvd24nLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2stLTtcblxuXHRcdFx0XHRpZih0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IG5ldyBTcHJpdGVTaGVldDtcblx0XHR0aGlzLm1hcCAgICAgICAgID0gbmV3IFdvcmxkTWFwO1xuXG5cdFx0dGhpcy5tYXAuaW1wb3J0KCk7XG5cblx0XHR0aGlzLmFyZ3MubWFwRWRpdG9yICA9IG5ldyBNYXBFZGl0b3Ioe1xuXHRcdFx0c3ByaXRlU2hlZXQ6IHRoaXMuc3ByaXRlU2hlZXRcblx0XHRcdCwgbWFwOiAgICAgICB0aGlzLm1hcFxuXHRcdH0pO1xuXHR9XG5cblx0b25SZW5kZXJlZCgpXG5cdHtcblx0XHRjb25zdCBzcHJpdGVCb2FyZCA9IG5ldyBTcHJpdGVCb2FyZChcblx0XHRcdHRoaXMudGFncy5jYW52YXMuZWxlbWVudFxuXHRcdFx0LCB0aGlzLm1hcFxuXHRcdCk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cblx0XHRjb25zdCBlbnRpdHkgPSBuZXcgRW50aXR5KHtcblx0XHRcdHNwcml0ZTogbmV3IFNwcml0ZSh7XG5cdFx0XHRcdHNyYzogdW5kZWZpbmVkLFxuXHRcdFx0XHRzcHJpdGVCb2FyZDogc3ByaXRlQm9hcmQsXG5cdFx0XHRcdHNwcml0ZVNoZWV0OiB0aGlzLnNwcml0ZVNoZWV0LFxuXHRcdFx0fSksXG5cdFx0XHRjb250cm9sbGVyOiBuZXcgQ29udHJvbGxlcih7XG5cdFx0XHRcdGtleWJvYXJkOiB0aGlzLmtleWJvYXJkLFxuXHRcdFx0XHRvblNjcmVlbkpveVBhZDogdGhpcy5hcmdzLmNvbnRyb2xsZXIsXG5cdFx0XHR9KSxcblx0XHRcdGNhbWVyYTogQ2FtZXJhLFxuXHRcdH0pO1xuXHRcdHRoaXMuZW50aXRpZXMuYWRkKGVudGl0eSk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5zcHJpdGVzLmFkZChlbnRpdHkuc3ByaXRlKTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nID0gZW50aXR5O1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnPScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuem9vbSgxKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJysnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnpvb20oMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCctJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy56b29tKC0xKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuYXJncy5tYXBFZGl0b3IuYXJncy5iaW5kVG8oJ3NlbGVjdGVkR3JhcGhpYycsICh2KT0+e1xuXHRcdFx0aWYoIXYgfHwgdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxYID09IG51bGwpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblxuXHRcdFx0bGV0IGkgID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5zdGFydEdsb2JhbFg7XG5cdFx0XHRsZXQgaWkgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFg7XG5cblx0XHRcdGlmKGlpIDwgaSlcblx0XHRcdHtcblx0XHRcdFx0W2lpLCBpXSA9IFtpLCBpaV07XG5cdFx0XHR9XG5cblx0XHRcdGZvcig7IGk8PSBpaTsgaSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRsZXQgaiAgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLnN0YXJ0R2xvYmFsWTtcblx0XHRcdFx0bGV0IGpqID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxZO1xuXHRcdFx0XHRpZihqaiA8IGopXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRbamosIGpdID0gW2osIGpqXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IoOyBqIDw9IGpqOyBqKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLm1hcC5zZXRUaWxlKGksIGosIHYpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMubWFwLnNldFRpbGUoXG5cdFx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWFxuXHRcdFx0XHQsIHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWVxuXHRcdFx0XHQsIHZcblx0XHRcdCk7XG5cblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzaXplKCk7XG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnVuc2VsZWN0KCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmJpbmRUbygodixrLHQsZCxwKT0+e1xuXHRcdFx0aWYodGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFggPT0gbnVsbClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy5tYXBFZGl0b3Iuc2VsZWN0KHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQpO1xuXG5cdFx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IHRydWU7XG5cblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzaXplKCk7XG5cdFx0fSx7d2FpdDowfSk7XG5cblx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IHRydWU7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCkgPT4gdGhpcy5yZXNpemUoKSk7XG5cblx0XHRsZXQgZlRoZW4gPSAwO1xuXHRcdGxldCBzVGhlbiA9IDA7XG5cblx0XHRsZXQgZlNhbXBsZXMgPSBbXTtcblx0XHRsZXQgc1NhbXBsZXMgPSBbXTtcblxuXHRcdGxldCBtYXhTYW1wbGVzID0gNTtcblxuXHRcdGNvbnN0IHNpbXVsYXRlID0gKG5vdykgPT4ge1xuXHRcdFx0bm93ID0gbm93IC8gMTAwMDtcblxuXHRcdFx0Y29uc3QgZGVsdGEgPSBub3cgLSBzVGhlbjtcblxuXHRcdFx0aWYodGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID09IDApXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzID0gWzBdO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmKGRlbHRhIDwgMS8odGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrKygxMCAqICh0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2svNjApKSkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c1RoZW4gPSBub3c7XG5cblx0XHRcdHRoaXMua2V5Ym9hcmQudXBkYXRlKCk7XG5cblx0XHRcdE9iamVjdC52YWx1ZXModGhpcy5lbnRpdGllcy5pdGVtcygpKS5tYXAoKGUpPT57XG5cdFx0XHRcdGUuc2ltdWxhdGUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyB0aGlzLnNwcml0ZUJvYXJkLnNpbXVsYXRlKCk7XG5cblx0XHRcdC8vIHRoaXMuYXJncy5sb2NhbFggID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MubG9jYWxZICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQubG9jYWxZO1xuXHRcdFx0Ly8gdGhpcy5hcmdzLmdsb2JhbFggPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MuZ2xvYmFsWSA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWTtcblxuXHRcdFx0dGhpcy5hcmdzLl9zcHMgPSAoMSAvIGRlbHRhKTtcblxuXHRcdFx0c1NhbXBsZXMucHVzaCh0aGlzLmFyZ3MuX3Nwcyk7XG5cblx0XHRcdHdoaWxlKHNTYW1wbGVzLmxlbmd0aCA+IG1heFNhbXBsZXMpXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzLnNoaWZ0KCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHRoaXMuc3ByaXRlQm9hcmQubW92ZUNhbWVyYShzcHJpdGUueCwgc3ByaXRlLnkpO1xuXHRcdH07XG5cblx0XHRjb25zdCB1cGRhdGUgPSAobm93KSA9Pntcblx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhdygpO1xuXG5cdFx0XHRjb25zdCBkZWx0YSA9IG5vdyAtIGZUaGVuO1xuXHRcdFx0ZlRoZW4gPSBub3c7XG5cdFx0XHRcblx0XHRcdHRoaXMuYXJncy5mcHMgPSAoMTAwMCAvIGRlbHRhKS50b0ZpeGVkKDMpO1xuXG5cdFx0XHR0aGlzLmFyZ3MuY2FtWCA9IE51bWJlcihDYW1lcmEueCkudG9GaXhlZCgzKTtcblx0XHRcdHRoaXMuYXJncy5jYW1ZID0gTnVtYmVyKENhbWVyYS55KS50b0ZpeGVkKDMpO1xuXHRcdH07XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsID0gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCAvIDEwMjQgKiAyO1xuXHRcdHRoaXMucmVzaXplKCk7XG5cblx0XHR1cGRhdGUocGVyZm9ybWFuY2Uubm93KCkpO1xuXG5cdFx0c2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdHNpbXVsYXRlKHBlcmZvcm1hbmNlLm5vdygpKTtcblx0XHR9LCAwKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRkb2N1bWVudC50aXRsZSA9IGAke0NvbmZpZy50aXRsZX0gJHt0aGlzLmFyZ3MuZnBzfSBGUFNgO1xuXHRcdH0sIDIyNy8zKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRjb25zdCBzcHMgPSBzU2FtcGxlcy5yZWR1Y2UoKGEsYik9PmErYiwgMCkgLyBzU2FtcGxlcy5sZW5ndGg7XG5cdFx0XHR0aGlzLmFyZ3Muc3BzID0gc3BzLnRvRml4ZWQoMykucGFkU3RhcnQoNSwgJyAnKTtcblx0XHR9LCAyMzEvMik7XG5cdH1cblxuXHRyZXNpemUoeCwgeSlcblx0e1xuXHRcdHRoaXMuYXJncy53aWR0aCAgPSB0aGlzLnRhZ3MuY2FudmFzLmVsZW1lbnQud2lkdGggICA9IHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aDtcblx0XHR0aGlzLmFyZ3MuaGVpZ2h0ID0gdGhpcy50YWdzLmNhbnZhcy5lbGVtZW50LmhlaWdodCAgPSB5IHx8IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0O1xuXG5cdFx0dGhpcy5hcmdzLnJ3aWR0aCAgPSBNYXRoLnRydW5jKFxuXHRcdFx0KHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgIC8gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHR0aGlzLmFyZ3MucmhlaWdodCA9IE1hdGgudHJ1bmMoXG5cdFx0XHQoeSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCkgLyB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0KTtcblxuXHRcdGNvbnN0IG9sZFNjYWxlID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGggLyAxMDI0O1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAqPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuc2NyZWVuU2NhbGUgLyBvbGRTY2FsZTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzaXplKCk7XG5cdH1cblxuXHRzY3JvbGwoZXZlbnQpXG5cdHtcblx0XHRsZXQgZGVsdGEgPSBldmVudC5kZWx0YVkgPiAwID8gLTEgOiAoXG5cdFx0XHRldmVudC5kZWx0YVkgPCAwID8gMSA6IDBcblx0XHQpO1xuXG5cdFx0dGhpcy56b29tKGRlbHRhKTtcblx0fVxuXG5cdHpvb20oZGVsdGEpXG5cdHtcblx0XHRjb25zdCBtYXggICA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSAqIDMyO1xuXHRcdGNvbnN0IG1pbiAgID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMC42NjY3O1xuXG5cdFx0Y29uc3Qgc3RlcCAgPSAwLjA1ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblxuXHRcdGxldCB6b29tTGV2ZWwgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICsgKGRlbHRhICogc3RlcCk7XG5cblx0XHRpZih6b29tTGV2ZWwgPCBtaW4pXG5cdFx0e1xuXHRcdFx0em9vbUxldmVsID0gbWluO1xuXHRcdH1cblx0XHRlbHNlIGlmKHpvb21MZXZlbCA+IG1heClcblx0XHR7XG5cdFx0XHR6b29tTGV2ZWwgPSBtYXg7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAhPT0gem9vbUxldmVsKVxuXHRcdHtcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgPSB6b29tTGV2ZWw7XG5cdFx0XHR0aGlzLnJlc2l6ZSgpO1xuXHRcdH1cblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxjYW52YXNcXG5cXHRjdi1yZWYgPSBcXFwiY2FudmFzOmN1cnZhdHVyZS9iYXNlL1RhZ1xcXCJcXG5cXHRjdi1vbiAgPSBcXFwid2hlZWw6c2Nyb2xsKGV2ZW50KTtcXFwiXFxuPjwvY2FudmFzPlxcbjxkaXYgY2xhc3MgPSBcXFwiaHVkIGZwc1xcXCI+XFxuIFtbc3BzXV0gc2ltdWxhdGlvbnMvcyAvIFtbc2ltdWxhdGlvbkxvY2tdXSBcXG4gW1tmcHNdXSBmcmFtZXMvcyAgICAgIC8gW1tmcmFtZUxvY2tdXSBcXG5cXG4gUmVzIFtbcndpZHRoXV0geCBbW3JoZWlnaHRdXVxcbiAgICAgW1t3aWR0aF1dIHggW1toZWlnaHRdXVxcbiBcXG4gUG9zIFtbY2FtWF1dIHggW1tjYW1ZXV1cXG5cXG4gzrQgU2ltOiAgIFBnIFVwIC8gRG5cXG4gzrQgRnJhbWU6IEhvbWUgLyBFbmQgXFxuIM60IFNjYWxlOiArIC8gLSBcXG5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzID0gXFxcInJldGljbGVcXFwiPjwvZGl2PlxcblxcbltbY29udHJvbGxlcl1dXFxuXFxuPGRpdiBjdi1pZiA9IFxcXCJzaG93RWRpdG9yXFxcIj5cXG5cXHRbW21hcEVkaXRvcl1dXFxuXFx0LS1cXG5cXHRbW21tbV1dXFxuPC9zcGFuPlxcblwiIiwiaW1wb3J0IHsgUm91dGVyIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvUm91dGVyJztcbmltcG9ydCB7IFZpZXcgICB9IGZyb20gJ2hvbWUvVmlldyc7XG5cbmlmKFByb3h5ICE9PSB1bmRlZmluZWQpXG57XG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG5cdFx0Y29uc3QgdmlldyA9IG5ldyBWaWV3KCk7XG5cdFx0XG5cdFx0Um91dGVyLmxpc3Rlbih2aWV3KTtcblx0XHRcblx0XHR2aWV3LnJlbmRlcihkb2N1bWVudC5ib2R5KTtcblx0fSk7XG59XG5lbHNlXG57XG5cdC8vIGRvY3VtZW50LndyaXRlKHJlcXVpcmUoJy4vRmFsbGJhY2svZmFsbGJhY2sudG1wJykpO1xufVxuIiwiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJy4vSW5qZWN0YWJsZSc7XG5cbmV4cG9ydCBjbGFzcyBDb250YWluZXIgZXh0ZW5kcyBJbmplY3RhYmxlXG57XG5cdGluamVjdChpbmplY3Rpb25zKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKE9iamVjdC5hc3NpZ24oe30sIHRoaXMsIGluamVjdGlvbnMpKTtcblx0fVxufVxuIiwibGV0IGNsYXNzZXMgPSB7fTtcbmxldCBvYmplY3RzID0ge307XG5cbmV4cG9ydCBjbGFzcyBJbmplY3RhYmxlXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdGxldCBpbmplY3Rpb25zID0gdGhpcy5jb25zdHJ1Y3Rvci5pbmplY3Rpb25zKCk7XG5cdFx0bGV0IGNvbnRleHQgICAgPSB0aGlzLmNvbnN0cnVjdG9yLmNvbnRleHQoKTtcblxuXHRcdGlmKCFjbGFzc2VzW2NvbnRleHRdKVxuXHRcdHtcblx0XHRcdGNsYXNzZXNbY29udGV4dF0gPSB7fTtcblx0XHR9XG5cblx0XHRpZighb2JqZWN0c1tjb250ZXh0XSlcblx0XHR7XG5cdFx0XHRvYmplY3RzW2NvbnRleHRdID0ge307XG5cdFx0fVxuXG5cdFx0Zm9yKGxldCBuYW1lIGluIGluamVjdGlvbnMpXG5cdFx0e1xuXHRcdFx0bGV0IGluamVjdGlvbiA9IGluamVjdGlvbnNbbmFtZV07XG5cblx0XHRcdGlmKGNsYXNzZXNbY29udGV4dF1bbmFtZV0gfHwgIWluamVjdGlvbi5wcm90b3R5cGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZigvW0EtWl0vLnRlc3QoU3RyaW5nKG5hbWUpWzBdKSlcblx0XHRcdHtcblx0XHRcdFx0Y2xhc3Nlc1tjb250ZXh0XVtuYW1lXSA9IGluamVjdGlvbjtcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGZvcihsZXQgbmFtZSBpbiBpbmplY3Rpb25zKVxuXHRcdHtcblx0XHRcdGxldCBpbnN0YW5jZSAgPSB1bmRlZmluZWQ7XG5cdFx0XHRsZXQgaW5qZWN0aW9uID0gY2xhc3Nlc1tjb250ZXh0XVtuYW1lXSB8fCBpbmplY3Rpb25zW25hbWVdO1xuXG5cdFx0XHRpZigvW0EtWl0vLnRlc3QoU3RyaW5nKG5hbWUpWzBdKSlcblx0XHRcdHtcblx0XHRcdFx0aWYoaW5qZWN0aW9uLnByb3RvdHlwZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmKCFvYmplY3RzW2NvbnRleHRdW25hbWVdKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG9iamVjdHNbY29udGV4dF1bbmFtZV0gPSBuZXcgaW5qZWN0aW9uO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRvYmplY3RzW2NvbnRleHRdW25hbWVdID0gaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aW5zdGFuY2UgPSBvYmplY3RzW2NvbnRleHRdW25hbWVdO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRpZihpbmplY3Rpb24ucHJvdG90eXBlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aW5zdGFuY2UgPSBuZXcgaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGluc3RhbmNlID0gaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBuYW1lLCB7XG5cdFx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0XHR3cml0YWJsZTogICBmYWxzZSxcblx0XHRcdFx0dmFsdWU6ICAgICAgaW5zdGFuY2Vcblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cblx0c3RhdGljIGluamVjdGlvbnMoKVxuXHR7XG5cdFx0cmV0dXJuIHt9O1xuXHR9XG5cblx0c3RhdGljIGNvbnRleHQoKVxuXHR7XG5cdFx0cmV0dXJuICcuJztcblx0fVxuXG5cdHN0YXRpYyBpbmplY3QoaW5qZWN0aW9ucywgY29udGV4dCA9ICcuJylcblx0e1xuXHRcdGlmKCEodGhpcy5wcm90b3R5cGUgaW5zdGFuY2VvZiBJbmplY3RhYmxlIHx8IHRoaXMgPT09IEluamVjdGFibGUpKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGFjY2VzcyBpbmplY3RhYmxlIHN1YmNsYXNzIVxuXG5BcmUgeW91IHRyeWluZyB0byBpbnN0YW50aWF0ZSBsaWtlIHRoaXM/XG5cblx0bmV3IFguaW5qZWN0KHsuLi59KTtcblxuSWYgc28gcGxlYXNlIHRyeTpcblxuXHRuZXcgKFguaW5qZWN0KHsuLi59KSk7XG5cblBsZWFzZSBub3RlIHRoZSBwYXJlbnRoZXNpcy5cbmApO1xuXHRcdH1cblxuXHRcdGxldCBleGlzdGluZ0luamVjdGlvbnMgPSB0aGlzLmluamVjdGlvbnMoKTtcblxuXHRcdHJldHVybiBjbGFzcyBleHRlbmRzIHRoaXMge1xuXHRcdFx0c3RhdGljIGluamVjdGlvbnMoKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgZXhpc3RpbmdJbmplY3Rpb25zLCBpbmplY3Rpb25zKTtcblx0XHRcdH1cblx0XHRcdHN0YXRpYyBjb250ZXh0KClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIGNvbnRleHQ7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxufVxuIiwiY2xhc3MgU2luZ2xlXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHRoaXMubmFtZSA9ICdzc3MuJyArIE1hdGgucmFuZG9tKCk7XG5cdH1cbn1cblxubGV0IHNpbmdsZSA9IG5ldyBTaW5nbGU7XG5cbmV4cG9ydCB7U2luZ2xlLCBzaW5nbGV9OyIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuXG5leHBvcnQgIGNsYXNzIENvbnRyb2xsZXJcbntcblx0dHJpZ2dlcnMgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUoe30pO1xuXHRheGlzICAgICA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh7fSk7XG5cdFxuXHRjb25zdHJ1Y3Rvcih7a2V5Ym9hcmQsIG9uU2NyZWVuSm95UGFkfSlcblx0e1xuXHRcdGtleWJvYXJkLmtleXMuYmluZFRvKCh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMua2V5UHJlc3Moayx2LHRba10pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmKHYgPT09IC0xKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmtleVJlbGVhc2Uoayx2LHRba10pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHR9KTtcblxuXHRcdG9uU2NyZWVuSm95UGFkLmFyZ3MuYmluZFRvKCd4JywgKHYpID0+IHtcblx0XHRcdHRoaXMuYXhpc1swXSA9IHYgLyA1MDtcblx0XHR9KTtcblxuXHRcdG9uU2NyZWVuSm95UGFkLmFyZ3MuYmluZFRvKCd5JywgKHYpID0+IHtcblx0XHRcdHRoaXMuYXhpc1sxXSA9IHYgLyA1MDtcblx0XHR9KTtcblx0fVxuXG5cdGtleVByZXNzKGtleSwgdmFsdWUsIHByZXYpXG5cdHtcblx0XHRpZigvXlswLTldJC8udGVzdChrZXkpKVxuXHRcdHtcblx0XHRcdHRoaXMudHJpZ2dlcnNba2V5XSA9IHRydWU7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c3dpdGNoKGtleSlcblx0XHR7XG5cdFx0XHRjYXNlICdBcnJvd1JpZ2h0Jzpcblx0XHRcdFx0dGhpcy5heGlzWzBdID0gMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93RG93bic6XG5cdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0xlZnQnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAtMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93VXAnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAtMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0a2V5UmVsZWFzZShrZXksIHZhbHVlLCBwcmV2KVxuXHR7XG5cdFx0aWYoL15bMC05XSQvLnRlc3Qoa2V5KSlcblx0XHR7XG5cdFx0XHR0aGlzLnRyaWdnZXJzW2tleV0gPSBmYWxzZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzd2l0Y2goa2V5KVxuXHRcdHtcblx0XHRcdGNhc2UgJ0Fycm93UmlnaHQnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMF0gPiAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0xlZnQnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMF0gPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dEb3duJzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzFdID4gMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dVcCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1sxXSA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxufVxuIiwiaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi4vc3ByaXRlL0NhbWVyYSc7XG5cbmV4cG9ydCBjbGFzcyBFbnRpdHlcbntcblx0Y29uc3RydWN0b3Ioe3Nwcml0ZSwgY29udHJvbGxlcn0pXG5cdHtcblx0XHR0aGlzLmRpcmVjdGlvbiA9ICdzb3V0aCc7XG5cdFx0dGhpcy5zdGF0ZSAgICAgPSAnc3RhbmRpbmcnO1xuXG5cdFx0dGhpcy5zcHJpdGUgPSBzcHJpdGU7XG5cdFx0dGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcblx0fVxuXG5cdGNyZWF0ZSgpXG5cdHtcblx0fVxuXG5cdHNpbXVsYXRlKClcblx0e1xuXHRcdGxldCBzcGVlZCA9IDQ7XG5cblx0XHRsZXQgeEF4aXMgPSB0aGlzLmNvbnRyb2xsZXIuYXhpc1swXSB8fCAwO1xuXHRcdGxldCB5QXhpcyA9IHRoaXMuY29udHJvbGxlci5heGlzWzFdIHx8IDA7XG5cblx0XHRmb3IobGV0IHQgaW4gdGhpcy5jb250cm9sbGVyLnRyaWdnZXJzKVxuXHRcdHtcblx0XHRcdGlmKCF0aGlzLmNvbnRyb2xsZXIudHJpZ2dlcnNbdF0pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zb2xlLmxvZyh0KTtcblx0XHR9XG5cblx0XHR4QXhpcyA9IE1hdGgubWluKDEsIE1hdGgubWF4KHhBeGlzLCAtMSkpO1xuXHRcdHlBeGlzID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoeUF4aXMsIC0xKSk7XG5cblx0XHR0aGlzLnNwcml0ZS54ICs9IHhBeGlzID4gMFxuXHRcdFx0PyBNYXRoLmNlaWwoc3BlZWQgKiB4QXhpcylcblx0XHRcdDogTWF0aC5mbG9vcihzcGVlZCAqIHhBeGlzKTtcblxuXHRcdHRoaXMuc3ByaXRlLnkgKz0geUF4aXMgPiAwXG5cdFx0XHQ/IE1hdGguY2VpbChzcGVlZCAqIHlBeGlzKVxuXHRcdFx0OiBNYXRoLmZsb29yKHNwZWVkICogeUF4aXMpO1xuXG5cdFx0bGV0IGhvcml6b250YWwgPSBmYWxzZTtcblxuXHRcdGlmKE1hdGguYWJzKHhBeGlzKSA+IE1hdGguYWJzKHlBeGlzKSlcblx0XHR7XG5cdFx0XHRob3Jpem9udGFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZihob3Jpem9udGFsKVxuXHRcdHtcblx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ3dlc3QnO1xuXG5cdFx0XHRpZih4QXhpcyA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ2Vhc3QnO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXRlID0gJ3dhbGtpbmcnO1xuXHRcdFx0XG5cdFx0fVxuXHRcdGVsc2UgaWYoeUF4aXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnbm9ydGgnO1xuXG5cdFx0XHRpZih5QXhpcyA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ3NvdXRoJztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zdGF0ZSA9ICd3YWxraW5nJztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHRoaXMuc3RhdGUgPSAnc3RhbmRpbmcnO1xuXHRcdH1cblxuXHRcdC8vIGlmKCF4QXhpcyAmJiAheUF4aXMpXG5cdFx0Ly8ge1xuXHRcdC8vIFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdC8vIH1cblxuXHRcdGxldCBmcmFtZXM7XG5cblx0XHRpZihmcmFtZXMgPSB0aGlzLnNwcml0ZVt0aGlzLnN0YXRlXVt0aGlzLmRpcmVjdGlvbl0pXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUuc2V0RnJhbWVzKGZyYW1lcyk7XG5cdFx0fVxuXHR9XG5cblx0ZGVzdHJveSgpXG5cdHtcblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xcblxcbnVuaWZvcm0gdmVjNCB1X2NvbG9yO1xcbnZhcnlpbmcgdmVjMiB2X3RleENvb3JkO1xcblxcbnZvaWQgbWFpbigpIHtcXG4gICAvLyBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodV9pbWFnZSwgdl90ZXhDb29yZCk7XFxuICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgxLjAsIDEuMCwgMC4wLCAwLjI1KTtcXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKClcXG57XFxuICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uO1xcbiAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wO1xcbiAgIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7XFxuICAgdl90ZXhDb29yZCAgPSBhX3RleENvb3JkO1xcbn1cXG5cIiIsImltcG9ydCB7IFN1cmZhY2UgfSBmcm9tICcuL1N1cmZhY2UnO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi9DYW1lcmEnO1xuaW1wb3J0IHsgU3ByaXRlU2hlZXQgfSBmcm9tICcuL1Nwcml0ZVNoZWV0JztcblxuZXhwb3J0ICBjbGFzcyBCYWNrZ3JvdW5kXG57XG5cdGNvbnN0cnVjdG9yKHNwcml0ZUJvYXJkLCBtYXAsIGxheWVyID0gMClcblx0e1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQgPSBzcHJpdGVCb2FyZDtcblx0XHR0aGlzLnNwcml0ZVNoZWV0ID0gbmV3IFNwcml0ZVNoZWV0O1xuXG5cdFx0dGhpcy5wYW5lcyAgICAgICA9IFtdO1xuXHRcdHRoaXMucGFuZXNYWSAgICAgPSB7fTtcblx0XHR0aGlzLm1heFBhbmVzICAgID0gOTtcblxuXHRcdHRoaXMubWFwICAgICAgICAgPSBtYXA7XG5cdFx0dGhpcy5sYXllciAgICAgICA9IGxheWVyO1xuXG5cdFx0dGhpcy50aWxlV2lkdGggICA9IDMyO1xuXHRcdHRoaXMudGlsZUhlaWdodCAgPSAzMjtcblxuXHRcdHRoaXMuc3VyZmFjZVdpZHRoID0gNTtcblx0XHR0aGlzLnN1cmZhY2VIZWlnaHQgPSA1O1xuXHR9XG5cblx0cmVuZGVyUGFuZSh4LCB5LCBmb3JjZVVwZGF0ZSlcblx0e1xuXHRcdGxldCBwYW5lO1xuXHRcdGxldCBwYW5lWCA9IHggKiB0aGlzLnRpbGVXaWR0aCAqIHRoaXMuc3VyZmFjZVdpZHRoICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblx0XHRsZXQgcGFuZVkgPSB5ICogdGhpcy50aWxlSGVpZ2h0ICogdGhpcy5zdXJmYWNlSGVpZ2h0ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblxuXHRcdGlmKHRoaXMucGFuZXNYWVtwYW5lWF0gJiYgdGhpcy5wYW5lc1hZW3BhbmVYXVtwYW5lWV0pXG5cdFx0e1xuXHRcdFx0cGFuZSA9IHRoaXMucGFuZXNYWVtwYW5lWF1bcGFuZVldO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0cGFuZSA9IG5ldyBTdXJmYWNlKFxuXHRcdFx0XHR0aGlzLnNwcml0ZUJvYXJkXG5cdFx0XHRcdCwgdGhpcy5zcHJpdGVTaGVldFxuXHRcdFx0XHQsIHRoaXMubWFwXG5cdFx0XHRcdCwgdGhpcy5zdXJmYWNlV2lkdGhcblx0XHRcdFx0LCB0aGlzLnN1cmZhY2VIZWlnaHRcblx0XHRcdFx0LCBwYW5lWFxuXHRcdFx0XHQsIHBhbmVZXG5cdFx0XHRcdCwgdGhpcy5sYXllclxuXHRcdFx0KTtcblxuXHRcdFx0aWYoIXRoaXMucGFuZXNYWVtwYW5lWF0pXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMucGFuZXNYWVtwYW5lWF0gPSB7fTtcblx0XHRcdH1cblxuXHRcdFx0aWYoIXRoaXMucGFuZXNYWVtwYW5lWF1bcGFuZVldKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnBhbmVzWFlbcGFuZVhdW3BhbmVZXSA9IHBhbmU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5wYW5lcy5wdXNoKHBhbmUpO1xuXG5cdFx0aWYodGhpcy5wYW5lcy5sZW5ndGggPiB0aGlzLm1heFBhbmVzKVxuXHRcdHtcblx0XHRcdHRoaXMucGFuZXMuc2hpZnQoKTtcblx0XHR9XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdHRoaXMucGFuZXMubGVuZ3RoID0gMDtcblxuXHRcdGNvbnN0IGNlbnRlclggPSBNYXRoLmZsb29yKFxuXHRcdFx0KENhbWVyYS54IC8gKHRoaXMuc3VyZmFjZVdpZHRoICogdGhpcy50aWxlV2lkdGggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsKSkgKyAwXG5cdFx0KTtcblxuXHRcdGNvbnN0IGNlbnRlclkgPSBNYXRoLmZsb29yKFxuXHRcdFx0Q2FtZXJhLnkgLyAodGhpcy5zdXJmYWNlSGVpZ2h0ICogdGhpcy50aWxlSGVpZ2h0ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCkgKyAwXG5cdFx0KTtcblxuXHRcdGxldCByYW5nZSA9IFstMSwgMCwgMV07XG5cblx0XHRmb3IobGV0IHggaW4gcmFuZ2UpXG5cdFx0e1xuXHRcdFx0Zm9yKGxldCB5IGluIHJhbmdlKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnJlbmRlclBhbmUoY2VudGVyWCArIHJhbmdlW3hdLCBjZW50ZXJZICsgcmFuZ2VbeV0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMucGFuZXMuZm9yRWFjaChwID0+IHAuZHJhdygpKTtcblx0fVxuXG5cdHJlc2l6ZSh4LCB5KVxuXHR7XG5cdFx0Zm9yKGxldCBpIGluIHRoaXMucGFuZXNYWSlcblx0XHR7XG5cdFx0XHRmb3IobGV0IGogaW4gdGhpcy5wYW5lc1hZW2ldKVxuXHRcdFx0e1xuXHRcdFx0XHRkZWxldGUgdGhpcy5wYW5lc1hZW2ldW2pdO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHdoaWxlKHRoaXMucGFuZXMubGVuZ3RoKVxuXHRcdHtcblx0XHRcdHRoaXMucGFuZXMucG9wKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zdXJmYWNlV2lkdGggPSBNYXRoLmNlaWwoKHggLyB0aGlzLnRpbGVXaWR0aCkpO1xuXHRcdHRoaXMuc3VyZmFjZUhlaWdodCA9IE1hdGguY2VpbCgoeSAvIHRoaXMudGlsZUhlaWdodCkpO1xuXG5cdFx0dGhpcy5kcmF3KCk7XG5cdH1cblxuXHRzaW11bGF0ZSgpXG5cdHtcblx0XHRcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIENhbWVyYVxue1xuXHRzdGF0aWMgeCA9IDA7XG5cdHN0YXRpYyB5ID0gMDtcblx0c3RhdGljIHdpZHRoICA9IDA7XG5cdHN0YXRpYyBoZWlnaHQgPSAwO1xufVxuIiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tIFwiY3VydmF0dXJlL2Jhc2UvQmluZGFibGVcIjtcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gXCIuL0NhbWVyYVwiO1xuXG5leHBvcnQgY2xhc3MgU3ByaXRlXG57XG5cdGNvbnN0cnVjdG9yKHtzcmMsIHNwcml0ZUJvYXJkLCBzcHJpdGVTaGVldH0pXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblx0XHRcblx0XHR0aGlzLnogICAgICA9IDA7XG5cdFx0dGhpcy54ICAgICAgPSAwO1xuXHRcdHRoaXMueSAgICAgID0gMDtcblxuXHRcdHRoaXMud2lkdGggID0gMDtcblx0XHR0aGlzLmhlaWdodCA9IDA7XG5cdFx0dGhpcy5zY2FsZSAgPSAxO1xuXG5cdFx0dGhpcy5mcmFtZXMgICAgICAgID0gW107XG5cdFx0dGhpcy5mcmFtZURlbGF5ICAgID0gNDtcblx0XHR0aGlzLmN1cnJlbnREZWxheSAgPSB0aGlzLmZyYW1lRGVsYXk7XG5cdFx0dGhpcy5jdXJyZW50RnJhbWUgID0gMDtcblx0XHR0aGlzLmN1cnJlbnRGcmFtZXMgPSAnJztcblxuXHRcdHRoaXMuc3BlZWQgICAgPSAwO1xuXHRcdHRoaXMubWF4U3BlZWQgPSA4O1xuXG5cdFx0dGhpcy5tb3ZpbmcgPSBmYWxzZTtcblxuXHRcdHRoaXMuUklHSFRcdD0gMDtcblx0XHR0aGlzLkRPV05cdD0gMTtcblx0XHR0aGlzLkxFRlRcdD0gMjtcblx0XHR0aGlzLlVQXHRcdD0gMztcblxuXHRcdHRoaXMuRUFTVFx0PSB0aGlzLlJJR0hUO1xuXHRcdHRoaXMuU09VVEhcdD0gdGhpcy5ET1dOO1xuXHRcdHRoaXMuV0VTVFx0PSB0aGlzLkxFRlQ7XG5cdFx0dGhpcy5OT1JUSFx0PSB0aGlzLlVQO1xuXG5cdFx0dGhpcy5zdGFuZGluZyA9IHtcblx0XHRcdCdub3J0aCc6IFtcblx0XHRcdFx0J3BsYXllcl9zdGFuZGluZ19ub3J0aC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdzb3V0aCc6IFtcblx0XHRcdFx0J3BsYXllcl9zdGFuZGluZ19zb3V0aC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICd3ZXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnZWFzdCc6IFtcblx0XHRcdFx0J3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdF1cblx0XHR9O1xuXG5cdFx0dGhpcy53YWxraW5nID0ge1xuXHRcdFx0J25vcnRoJzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19ub3J0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19ub3J0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX25vcnRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX25vcnRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19ub3J0aC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdzb3V0aCc6IFtcblx0XHRcdFx0J3BsYXllcl93YWxraW5nX3NvdXRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfc291dGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfc291dGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19zb3V0aDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19zb3V0aDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfc291dGgucG5nJ1xuXG5cdFx0XHRdXG5cdFx0XHQsICd3ZXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfd2VzdDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ193ZXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnZWFzdCc6IFtcblx0XHRcdFx0J3BsYXllcl93YWxraW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX2Vhc3QyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfZWFzdDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdF1cblx0XHR9O1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdHRoaXMudGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGV4dHVyZSk7XG5cblx0XHRjb25zdCByID0gKCk9PnBhcnNlSW50KE1hdGgucmFuZG9tKCkqMjU1KTtcblxuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCAxXG5cdFx0XHQsIDFcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbmV3IFVpbnQ4QXJyYXkoW3IoKSwgcigpLCAwLCAyNTVdKVxuXHRcdCk7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0ID0gc3ByaXRlU2hlZXQ7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oKHNoZWV0KT0+e1xuXHRcdFx0Y29uc3QgZnJhbWUgPSB0aGlzLnNwcml0ZVNoZWV0LmdldEZyYW1lKHNyYyk7XG5cblx0XHRcdGlmKGZyYW1lKVxuXHRcdFx0e1xuXHRcdFx0XHRTcHJpdGUubG9hZFRleHR1cmUodGhpcy5zcHJpdGVCb2FyZC5nbDJkLCBmcmFtZSkudGhlbigoYXJncyk9Pntcblx0XHRcdFx0XHR0aGlzLnRleHR1cmUgPSBhcmdzLnRleHR1cmU7XG5cdFx0XHRcdFx0dGhpcy53aWR0aCAgID0gYXJncy5pbWFnZS53aWR0aCAqIHRoaXMuc2NhbGU7XG5cdFx0XHRcdFx0dGhpcy5oZWlnaHQgID0gYXJncy5pbWFnZS5oZWlnaHQgKiB0aGlzLnNjYWxlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0dGhpcy5mcmFtZURlbGF5ID0gdGhpcy5tYXhTcGVlZCAtIE1hdGguYWJzKHRoaXMuc3BlZWQpO1xuXHRcdGlmKHRoaXMuZnJhbWVEZWxheSA+IHRoaXMubWF4U3BlZWQpXG5cdFx0e1xuXHRcdFx0dGhpcy5mcmFtZURlbGF5ID0gdGhpcy5tYXhTcGVlZDtcblx0XHR9XG5cblx0XHRpZih0aGlzLmN1cnJlbnREZWxheSA8PSAwKVxuXHRcdHtcblx0XHRcdHRoaXMuY3VycmVudERlbGF5ID0gdGhpcy5mcmFtZURlbGF5O1xuXHRcdFx0dGhpcy5jdXJyZW50RnJhbWUrKztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHRoaXMuY3VycmVudERlbGF5LS07XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5jdXJyZW50RnJhbWUgPj0gdGhpcy5mcmFtZXMubGVuZ3RoKVxuXHRcdHtcblx0XHRcdHRoaXMuY3VycmVudEZyYW1lID0gdGhpcy5jdXJyZW50RnJhbWUgLSB0aGlzLmZyYW1lcy5sZW5ndGg7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZnJhbWUgPSB0aGlzLmZyYW1lc1sgdGhpcy5jdXJyZW50RnJhbWUgXTtcblxuXHRcdGlmKGZyYW1lKVxuXHRcdHtcblx0XHRcdHRoaXMudGV4dHVyZSA9IGZyYW1lLnRleHR1cmU7XG5cdFx0XHR0aGlzLndpZHRoICA9IGZyYW1lLndpZHRoICogdGhpcy5zY2FsZTtcblx0XHRcdHRoaXMuaGVpZ2h0ID0gZnJhbWUuaGVpZ2h0ICogdGhpcy5zY2FsZTtcblx0XHR9XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50ZXh0dXJlKTtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLnRleENvb3JkQnVmZmVyKTtcblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHQwLjAsIDAuMCxcblx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0MC4wLCAxLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0MS4wLCAxLjAsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblxuXHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0dGhpcy54ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCArIC1DYW1lcmEueCArIChDYW1lcmEud2lkdGggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsIC8gMilcblx0XHRcdCwgdGhpcy55ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCArIC1DYW1lcmEueSArIChDYW1lcmEuaGVpZ2h0ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAvIDIpICsgLXRoaXMuaGVpZ2h0ICogMC41ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCB0aGlzLndpZHRoICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCB0aGlzLmhlaWdodCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWxcblx0XHQpO1xuXG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHR9XG5cblx0c2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpXG5cdHtcblx0XHRsZXQgZnJhbWVzSWQgPSBmcmFtZVNlbGVjdG9yLmpvaW4oJyAnKTtcblxuXHRcdGlmKHRoaXMuY3VycmVudEZyYW1lcyA9PT0gZnJhbWVzSWQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMuY3VycmVudEZyYW1lcyA9IGZyYW1lc0lkO1xuXG5cdFx0Y29uc3QgbG9hZFRleHR1cmUgPSBmcmFtZSA9PiBTcHJpdGUubG9hZFRleHR1cmUodGhpcy5zcHJpdGVCb2FyZC5nbDJkLCBmcmFtZSk7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oc2hlZXQgPT4ge1xuXHRcdFx0Y29uc3QgZnJhbWVzID0gc2hlZXQuZ2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpLm1hcChcblx0XHRcdFx0ZnJhbWUgPT4gbG9hZFRleHR1cmUoZnJhbWUpLnRoZW4oYXJncyA9PiAoe1xuXHRcdFx0XHRcdHRleHR1cmU6ICBhcmdzLnRleHR1cmVcblx0XHRcdFx0XHQsIHdpZHRoOiAgYXJncy5pbWFnZS53aWR0aFxuXHRcdFx0XHRcdCwgaGVpZ2h0OiBhcmdzLmltYWdlLmhlaWdodFxuXHRcdFx0XHR9KSlcblx0XHRcdCk7XG5cblx0XHRcdFByb21pc2UuYWxsKGZyYW1lcykudGhlbihmcmFtZXMgPT4gdGhpcy5mcmFtZXMgPSBmcmFtZXMpO1xuXG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgbG9hZFRleHR1cmUoZ2wyZCwgaW1hZ2VTcmMpXG5cdHtcblx0XHRjb25zdCBnbCA9IGdsMmQuY29udGV4dDtcblxuXHRcdGlmKCF0aGlzLnByb21pc2VzKVxuXHRcdHtcblx0XHRcdHRoaXMucHJvbWlzZXMgPSB7fTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnByb21pc2VzW2ltYWdlU3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm9taXNlc1tpbWFnZVNyY107XG5cdFx0fVxuXG5cdFx0dGhpcy5wcm9taXNlc1tpbWFnZVNyY10gPSBTcHJpdGUubG9hZEltYWdlKGltYWdlU3JjKS50aGVuKChpbWFnZSk9Pntcblx0XHRcdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG5cdFx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0XHQsIGltYWdlXG5cdFx0XHQpO1xuXG5cdFx0XHRyZXR1cm4ge2ltYWdlLCB0ZXh0dXJlfVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMucHJvbWlzZXNbaW1hZ2VTcmNdO1xuXHR9XG5cblx0c3RhdGljIGxvYWRJbWFnZShzcmMpXG5cdHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KT0+e1xuXHRcdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdGltYWdlLnNyYyAgID0gc3JjO1xuXHRcdFx0aW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldmVudCk9Pntcblx0XHRcdFx0YWNjZXB0KGltYWdlKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0c2V0UmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQucG9zaXRpb25CdWZmZXIpO1xuXG5cdFx0Y29uc3QgeDEgPSB4O1xuXHRcdGNvbnN0IHkxID0geTtcblx0XHRjb25zdCB4MiA9IHggKyB3aWR0aDtcblx0XHRjb25zdCB5MiA9IHkgKyBoZWlnaHQ7XG5cblx0XHQvLyBjb25zdCBzID0gLTgwICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAqIE1hdGguc2luKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCk7XG5cdFx0Y29uc3QgcyA9IDA7XG5cblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSArIHMsIHkxLCB0aGlzLnosXG5cdFx0XHR4MiArIHMsIHkxLCB0aGlzLnosXG5cdFx0XHR4MSwgICAgIHkyLCB0aGlzLnosXG5cdFx0XHR4MSwgICAgIHkyLCB0aGlzLnosXG5cdFx0XHR4MiArIHMsIHkxLCB0aGlzLnosXG5cdFx0XHR4MiwgeTIsIHRoaXMueixcblx0XHRdKSwgZ2wuU1RSRUFNX0RSQVcpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBCYWcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CYWcnO1xuaW1wb3J0IHsgQmFja2dyb3VuZCAgfSBmcm9tICcuL0JhY2tncm91bmQnO1xuXG5pbXBvcnQgeyBHbDJkIH0gZnJvbSAnLi4vZ2wyZC9HbDJkJztcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4vQ2FtZXJhJztcbmltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4vU3ByaXRlJztcbmltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuaW1wb3J0IHsgU3ByaXRlU2hlZXQgfSBmcm9tICcuL1Nwcml0ZVNoZWV0JztcblxuZXhwb3J0IGNsYXNzIFNwcml0ZUJvYXJkXG57XG5cdGNvbnN0cnVjdG9yKGVsZW1lbnQsIG1hcClcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXG5cdFx0dGhpcy5tYXAgPSBtYXA7XG5cblx0XHR0aGlzLm1vdXNlID0ge1xuXHRcdFx0eDogICAgICAgIG51bGxcblx0XHRcdCwgeTogICAgICBudWxsXG5cdFx0XHQsIGNsaWNrWDogbnVsbFxuXHRcdFx0LCBjbGlja1k6IG51bGxcblx0XHR9O1xuXG5cdFx0dGhpcy5zcHJpdGVzID0gbmV3IEJhZztcblxuXHRcdENhbWVyYS53aWR0aCAgPSBlbGVtZW50LndpZHRoO1xuXHRcdENhbWVyYS5oZWlnaHQgPSBlbGVtZW50LmhlaWdodDtcblxuXHRcdHRoaXMuZ2wyZCA9IG5ldyBHbDJkKGVsZW1lbnQpO1xuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xuXHRcdGdsLmVuYWJsZShnbC5CTEVORCk7XG5cblx0XHR0aGlzLnByb2dyYW0gPSB0aGlzLmdsMmQuY3JlYXRlUHJvZ3JhbShcblx0XHRcdHRoaXMuZ2wyZC5jcmVhdGVTaGFkZXIoJ3Nwcml0ZS90ZXh0dXJlLnZlcnQnKVxuXHRcdFx0LCB0aGlzLmdsMmQuY3JlYXRlU2hhZGVyKCdzcHJpdGUvdGV4dHVyZS5mcmFnJylcblx0XHQpO1xuXG5cdFx0dGhpcy5vdmVybGF5UHJvZ3JhbSA9IHRoaXMuZ2wyZC5jcmVhdGVQcm9ncmFtKFxuXHRcdFx0dGhpcy5nbDJkLmNyZWF0ZVNoYWRlcignb3ZlcmxheS9vdmVybGF5LnZlcnQnKVxuXHRcdFx0LCB0aGlzLmdsMmQuY3JlYXRlU2hhZGVyKCdvdmVybGF5L292ZXJsYXkuZnJhZycpXG5cdFx0KTtcblxuXHRcdGdsLnVzZVByb2dyYW0odGhpcy5wcm9ncmFtKTtcblxuXHRcdHRoaXMucG9zaXRpb25Mb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ2FfcG9zaXRpb24nKTtcblx0XHR0aGlzLnRleENvb3JkTG9jYXRpb24gPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLnByb2dyYW0sICdhX3RleENvb3JkJyk7XG5cblx0XHR0aGlzLnBvc2l0aW9uQnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG5cdFx0dGhpcy50ZXhDb29yZEJ1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuXG5cdFx0dGhpcy5yZXNvbHV0aW9uTG9jYXRpb24gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV9yZXNvbHV0aW9uJyk7XG5cdFx0dGhpcy50aWxlUG9zTG9jYXRpb24gICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV90aWxlTm8nKTtcblx0XHR0aGlzLmNvbG9yTG9jYXRpb24gICAgICA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sICd1X2NvbG9yJyk7XG5cblx0XHR0aGlzLm92ZXJsYXlMb2NhdGlvbiAgID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5vdmVybGF5UHJvZ3JhbSwgJ2FfcG9zaXRpb24nKTtcblx0XHR0aGlzLm92ZXJsYXlSZXNvbHV0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMub3ZlcmxheVByb2dyYW0sICd1X3Jlc29sdXRpb24nKTtcblx0XHR0aGlzLm92ZXJsYXlDb2xvciAgICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMub3ZlcmxheVByb2dyYW0sICd1X2NvbG9yJyk7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5wb3NpdGlvbkJ1ZmZlcik7XG5cdFx0Z2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy5wb3NpdGlvbkxvY2F0aW9uKTtcblx0XHRnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKFxuXHRcdFx0dGhpcy5wb3NpdGlvbkxvY2F0aW9uXG5cdFx0XHQsIDNcblx0XHRcdCwgZ2wuRkxPQVRcblx0XHRcdCwgZmFsc2Vcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHRoaXMudGV4Q29vcmRMb2NhdGlvbik7XG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMudGV4Q29vcmRCdWZmZXIpO1xuXHRcdGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoXG5cdFx0XHR0aGlzLnRleENvb3JkTG9jYXRpb25cblx0XHRcdCwgMlxuXHRcdFx0LCBnbC5GTE9BVFxuXHRcdFx0LCBmYWxzZVxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHQpO1xuXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcblx0XHRcdCdtb3VzZW1vdmUnLCAoZXZlbnQpPT57XG5cdFx0XHRcdHRoaXMubW91c2UueCA9IGV2ZW50LmNsaWVudFg7XG5cdFx0XHRcdHRoaXMubW91c2UueSA9IGV2ZW50LmNsaWVudFk7XG5cdFx0XHR9XG5cdFx0KTtcblxuXHRcdHRoaXMuc2VsZWN0ZWQgPSB7XG5cdFx0XHRsb2NhbFg6ICAgIG51bGxcblx0XHRcdCwgbG9jYWxZOiAgbnVsbFxuXHRcdFx0LCBnbG9iYWxYOiBudWxsXG5cdFx0XHQsIGdsb2JhbFk6IG51bGxcblx0XHRcdCwgc3RhcnRHbG9iYWxYOiBudWxsXG5cdFx0XHQsIHN0YXJ0R2xvYmFsWTogbnVsbFxuXHRcdH07XG5cblx0XHR0aGlzLnNlbGVjdGVkID0gQmluZGFibGUubWFrZUJpbmRhYmxlKHRoaXMuc2VsZWN0ZWQpO1xuXG5cdFx0dGhpcy5iYWNrZ3JvdW5kICA9IG5ldyBCYWNrZ3JvdW5kKHRoaXMsIG1hcCk7XG5cdFx0Y29uc3QgdyA9IDEyODtcblx0XHRjb25zdCBzcHJpdGVTaGVldCA9IG5ldyBTcHJpdGVTaGVldDtcblx0XHRcblx0XHRmb3IoY29uc3QgaSBpbiBBcnJheSgxNikuZmlsbCgpKVxuXHRcdHtcblx0XHRcdGNvbnN0IGJhcnJlbCA9IG5ldyBTcHJpdGUoe1xuXHRcdFx0XHRzcmM6ICdiYXJyZWwucG5nJyxcblx0XHRcdFx0c3ByaXRlQm9hcmQ6IHRoaXMsXG5cdFx0XHRcdHNwcml0ZVNoZWV0XG5cdFx0XHR9KTtcblx0XHRcdGJhcnJlbC54ID0gKGkgKiAzMikgJSB3O1xuXHRcdFx0YmFycmVsLnkgPSBNYXRoLnRydW5jKChpICogMzIpIC8gdykgKiAzMjtcblx0XHRcdHRoaXMuc3ByaXRlcy5hZGQoYmFycmVsKTtcblx0XHR9XG5cblx0XHR0aGlzLnNwcml0ZXMuYWRkKHRoaXMuYmFja2dyb3VuZCk7XG5cblx0XHR0aGlzLmZvbGxvd2luZyA9IG51bGw7XG5cdH1cblxuXHR1bnNlbGVjdCgpXG5cdHtcblx0XHRpZih0aGlzLnNlbGVjdGVkLmxvY2FsWCA9PT0gbnVsbClcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZWxlY3RlZC5sb2NhbFggID0gbnVsbDtcblx0XHR0aGlzLnNlbGVjdGVkLmxvY2FsWSAgPSBudWxsO1xuXHRcdHRoaXMuc2VsZWN0ZWQuZ2xvYmFsWCA9IG51bGw7XG5cdFx0dGhpcy5zZWxlY3RlZC5nbG9iYWxZID0gbnVsbDtcblxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHRpZih0aGlzLmZvbGxvd2luZylcblx0XHR7XG5cdFx0XHRDYW1lcmEueCA9ICgxNiArIHRoaXMuZm9sbG93aW5nLnNwcml0ZS54KSAqIHRoaXMuZ2wyZC56b29tTGV2ZWwgfHwgMDtcblx0XHRcdENhbWVyYS55ID0gKDE2ICsgdGhpcy5mb2xsb3dpbmcuc3ByaXRlLnkpICogdGhpcy5nbDJkLnpvb21MZXZlbCB8fCAwO1xuXHRcdH1cblx0XHRcdFxuXHRcdGNvbnN0IGdsID0gdGhpcy5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXHRcdGdsLnZpZXdwb3J0KDAsIDAsIGdsLmNhbnZhcy53aWR0aCwgZ2wuY2FudmFzLmhlaWdodCk7XG5cblx0XHRnbC51bmlmb3JtMmYoXG5cdFx0XHR0aGlzLnJlc29sdXRpb25Mb2NhdGlvblxuXHRcdFx0LCBnbC5jYW52YXMud2lkdGhcblx0XHRcdCwgZ2wuY2FudmFzLmhlaWdodFxuXHRcdCk7XG5cblx0XHQvLyBnbC5jbGVhckNvbG9yKDAsIDAsIDAsIDApO1xuXHRcdC8vIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuXG5cdFx0bGV0IHNwcml0ZXMgPSB0aGlzLnNwcml0ZXMuaXRlbXMoKTtcblxuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyAmJiBjb25zb2xlLnRpbWUoJ3NvcnQnKTtcblx0XHRcblx0XHRzcHJpdGVzLnNvcnQoKGEsYikgPT4ge1xuXHRcdFx0aWYoKGEgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSAmJiAhKGIgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXG5cdFx0XHRpZigoYiBpbnN0YW5jZW9mIEJhY2tncm91bmQpICYmICEoYSBpbnN0YW5jZW9mIEJhY2tncm91bmQpKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYS56ID09PSB1bmRlZmluZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHRcblx0XHRcdGlmKGIueiA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblx0XHRcblx0XHRcdHJldHVybiBhLnogLSBiLno7XG5cdFx0fSk7XG5cblx0XHRpZih3aW5kb3cuc21Qcm9maWxpbmcpXG5cdFx0e1xuXHRcdFx0Y29uc29sZS50aW1lRW5kKCdzb3J0Jyk7XG5cdFx0XHR3aW5kb3cuc21Qcm9maWxpbmcgPSBmYWxzZTtcblx0XHR9XG5cblx0XHRzcHJpdGVzLmZvckVhY2gocyA9PiB7XG5cdFx0XHRzLnogPSBzIGluc3RhbmNlb2YgQmFja2dyb3VuZCA/IC0xIDogcy55O1xuXHRcdFx0cy5kcmF3KCk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZXNpemUoeCwgeSlcblx0e1xuXHRcdHggPSB4IHx8IHRoaXMuZ2wyZC5lbGVtZW50LndpZHRoO1xuXHRcdHkgPSB5IHx8IHRoaXMuZ2wyZC5lbGVtZW50LmhlaWdodDtcblxuXHRcdENhbWVyYS54ICo9IHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cdFx0Q2FtZXJhLnkgKj0gdGhpcy5nbDJkLnpvb21MZXZlbDtcblxuXHRcdENhbWVyYS53aWR0aCAgPSB4IC8gdGhpcy5nbDJkLnpvb21MZXZlbDtcblx0XHRDYW1lcmEuaGVpZ2h0ID0geSAvIHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHR0aGlzLmJhY2tncm91bmQucmVzaXplKENhbWVyYS53aWR0aCwgQ2FtZXJhLmhlaWdodCk7XG5cdH1cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5wb3NpdGlvbkJ1ZmZlcik7XG5cblx0XHRjb25zdCB4MSA9IHg7XG5cdFx0Y29uc3QgeDIgPSB4ICsgd2lkdGg7XG5cdFx0Y29uc3QgeTEgPSB5O1xuXHRcdGNvbnN0IHkyID0geSArIGhlaWdodDtcblxuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdHgxLCB5MSwgdGhpcy56LFxuXHRcdFx0eDIsIHkxLCB0aGlzLnosXG5cdFx0XHR4MSwgeTIsIHRoaXMueixcblx0XHRcdHgxLCB5MiwgdGhpcy56LFxuXHRcdFx0eDIsIHkxLCB0aGlzLnosXG5cdFx0XHR4MiwgeTIsIHRoaXMueixcblx0XHRdKSwgZ2wuU1RSRUFNX0RSQVcpO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgU3ByaXRlU2hlZXRcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0dGhpcy5pbWFnZVVybCA9ICcvc3ByaXRlc2hlZXQucG5nJztcblx0XHR0aGlzLmJveGVzVXJsID0gJy9zcHJpdGVzaGVldC5qc29uJztcblx0XHR0aGlzLnZlcnRpY2VzID0ge307XG5cdFx0dGhpcy5mcmFtZXMgICA9IHt9O1xuXHRcdHRoaXMud2lkdGggICAgPSAwO1xuXHRcdHRoaXMuaGVpZ2h0ICAgPSAwO1xuXG5cdFx0bGV0IHJlcXVlc3QgICA9IG5ldyBSZXF1ZXN0KHRoaXMuYm94ZXNVcmwpO1xuXG5cdFx0bGV0IHNoZWV0TG9hZGVyID0gZmV0Y2gocmVxdWVzdClcblx0XHQudGhlbigocmVzcG9uc2UpPT5yZXNwb25zZS5qc29uKCkpXG5cdFx0LnRoZW4oKGJveGVzKSA9PiB0aGlzLmJveGVzID0gYm94ZXMpO1xuXG5cdFx0bGV0IGltYWdlTG9hZGVyID0gbmV3IFByb21pc2UoKGFjY2VwdCk9Pntcblx0XHRcdHRoaXMuaW1hZ2UgICAgICAgID0gbmV3IEltYWdlKCk7XG5cdFx0XHR0aGlzLmltYWdlLnNyYyAgICA9IHRoaXMuaW1hZ2VVcmw7XG5cdFx0XHR0aGlzLmltYWdlLm9ubG9hZCA9ICgpPT57XG5cdFx0XHRcdGFjY2VwdCgpO1xuXHRcdFx0fTtcblx0XHR9KTtcblxuXHRcdHRoaXMucmVhZHkgPSBQcm9taXNlLmFsbChbc2hlZXRMb2FkZXIsIGltYWdlTG9hZGVyXSlcblx0XHQudGhlbigoKSA9PiB0aGlzLnByb2Nlc3NJbWFnZSgpKVxuXHRcdC50aGVuKCgpID0+IHRoaXMpO1xuXHR9XG5cblx0cHJvY2Vzc0ltYWdlKClcblx0e1xuXHRcdGlmKCF0aGlzLmJveGVzIHx8ICF0aGlzLmJveGVzLmZyYW1lcylcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgY2FudmFzICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdFx0Y2FudmFzLndpZHRoICA9IHRoaXMuaW1hZ2Uud2lkdGg7XG5cdFx0Y2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2UuaGVpZ2h0O1xuXG5cdFx0Y29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIiwge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pO1xuXG5cdFx0Y29udGV4dC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgMCwgMCk7XG5cblx0XHRjb25zdCBmcmFtZVByb21pc2VzID0gW107XG5cblx0XHRmb3IobGV0IGkgaW4gdGhpcy5ib3hlcy5mcmFtZXMpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3ViQ2FudmFzICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdFx0XHRzdWJDYW52YXMud2lkdGggID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUudztcblx0XHRcdHN1YkNhbnZhcy5oZWlnaHQgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oO1xuXG5cdFx0XHRjb25zdCBzdWJDb250ZXh0ID0gc3ViQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblxuXHRcdFx0aWYodGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUpXG5cdFx0XHR7XG5cdFx0XHRcdHN1YkNvbnRleHQucHV0SW1hZ2VEYXRhKGNvbnRleHQuZ2V0SW1hZ2VEYXRhKFxuXHRcdFx0XHRcdHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnhcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnlcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLndcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmhcblx0XHRcdFx0KSwgMCwgMCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMuYm94ZXMuZnJhbWVzW2ldLnRleHQpXG5cdFx0XHR7XG5cdFx0XHRcdHN1YkNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uY29sb3IgfHwgJ3doaXRlJztcblxuXHRcdFx0XHRzdWJDb250ZXh0LmZvbnQgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mb250XG5cdFx0XHRcdFx0fHwgYCR7dGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaH1weCBzYW5zLXNlcmlmYDtcblx0XHRcdFx0c3ViQ29udGV4dC50ZXh0QWxpZ24gPSAnY2VudGVyJztcblxuXHRcdFx0XHRzdWJDb250ZXh0LmZpbGxUZXh0KFxuXHRcdFx0XHRcdHRoaXMuYm94ZXMuZnJhbWVzW2ldLnRleHRcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLncgLyAyXG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oXG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53XG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0c3ViQ29udGV4dC50ZXh0QWxpZ24gPSBudWxsO1xuXHRcdFx0XHRzdWJDb250ZXh0LmZvbnQgICAgICA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGZyYW1lUHJvbWlzZXMucHVzaChuZXcgUHJvbWlzZSgoYWNjZXB0KT0+e1xuXHRcdFx0XHRzdWJDYW52YXMudG9CbG9iKChibG9iKT0+e1xuXHRcdFx0XHRcdHRoaXMuZnJhbWVzW3RoaXMuYm94ZXMuZnJhbWVzW2ldLmZpbGVuYW1lXSA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cblx0XHRcdFx0XHRhY2NlcHQodGhpcy5mcmFtZXNbdGhpcy5ib3hlcy5mcmFtZXNbaV0uZmlsZW5hbWVdKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KSk7XG5cblxuXHRcdFx0Ly8gbGV0IHUxID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueCAvIHRoaXMuaW1hZ2Uud2lkdGg7XG5cdFx0XHQvLyBsZXQgdjEgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS55IC8gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHRcdC8vIGxldCB1MiA9ICh0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS54ICsgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUudylcblx0XHRcdC8vIFx0LyB0aGlzLmltYWdlLndpZHRoO1xuXG5cdFx0XHQvLyBsZXQgdjIgPSAodGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueSArIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmgpXG5cdFx0XHQvLyBcdC8gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHRcdC8vIHRoaXMudmVydGljZXNbdGhpcy5ib3hlcy5mcmFtZXNbaV0uZmlsZW5hbWVdID0ge1xuXHRcdFx0Ly8gXHR1MSx2MSx1Mix2MlxuXHRcdFx0Ly8gfTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwoZnJhbWVQcm9taXNlcyk7XG5cdH1cblxuXHRnZXRWZXJ0aWNlcyhmaWxlbmFtZSlcblx0e1xuXHRcdHJldHVybiB0aGlzLnZlcnRpY2VzW2ZpbGVuYW1lXTtcblx0fVxuXG5cdGdldEZyYW1lKGZpbGVuYW1lKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW2ZpbGVuYW1lXTtcblx0fVxuXG5cdGdldEZyYW1lcyhmcmFtZVNlbGVjdG9yKVxuXHR7XG5cdFx0aWYoQXJyYXkuaXNBcnJheShmcmFtZVNlbGVjdG9yKSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gZnJhbWVTZWxlY3Rvci5tYXAoKG5hbWUpPT50aGlzLmdldEZyYW1lKG5hbWUpKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5nZXRGcmFtZXNCeVByZWZpeChmcmFtZVNlbGVjdG9yKTtcblx0fVxuXG5cdGdldEZyYW1lc0J5UHJlZml4KHByZWZpeClcblx0e1xuXHRcdGxldCBmcmFtZXMgPSBbXTtcblxuXHRcdGZvcihsZXQgaSBpbiB0aGlzLmZyYW1lcylcblx0XHR7XG5cdFx0XHRpZihpLnN1YnN0cmluZygwLCBwcmVmaXgubGVuZ3RoKSAhPT0gcHJlZml4KVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0ZnJhbWVzLnB1c2godGhpcy5mcmFtZXNbaV0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBmcmFtZXM7XG5cdH1cblxuXHRzdGF0aWMgbG9hZFRleHR1cmUoZ2wyZCwgaW1hZ2VTcmMpXG5cdHtcblx0XHRjb25zdCBnbCA9IGdsMmQuY29udGV4dDtcblxuXHRcdGlmKCF0aGlzLnRleHR1cmVQcm9taXNlcylcblx0XHR7XG5cdFx0XHR0aGlzLnRleHR1cmVQcm9taXNlcyA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMudGV4dHVyZVByb21pc2VzW2ltYWdlU3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy50ZXh0dXJlUHJvbWlzZXNbaW1hZ2VTcmNdO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLnRleHR1cmVQcm9taXNlc1tpbWFnZVNyY10gPSB0aGlzLmxvYWRJbWFnZShpbWFnZVNyYykudGhlbigoaW1hZ2UpPT57XG5cdFx0XHRjb25zdCB0ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKTtcblxuXHRcdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdFx0LCBpbWFnZVxuXHRcdFx0KTtcblxuXHRcdFx0LyovXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0LyovXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5SRVBFQVQpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuUkVQRUFUKTtcblx0XHRcdC8vKi9cblxuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1x0XHRcdFxuXG5cdFx0XHRyZXR1cm4ge2ltYWdlLCB0ZXh0dXJlfVxuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIGxvYWRJbWFnZShzcmMpXG5cdHtcblx0XHRpZighdGhpcy5pbWFnZVByb21pc2VzKVxuXHRcdHtcblx0XHRcdHRoaXMuaW1hZ2VQcm9taXNlcyA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmltYWdlUHJvbWlzZXNbc3JjXTtcblx0XHR9XG5cblx0XHR0aGlzLmltYWdlUHJvbWlzZXNbc3JjXSA9IG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCk9Pntcblx0XHRcdGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG5cdFx0XHRpbWFnZS5zcmMgICA9IHNyYztcblx0XHRcdGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoZXZlbnQpPT57XG5cdFx0XHRcdGFjY2VwdChpbWFnZSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLmltYWdlUHJvbWlzZXNbc3JjXTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tICcuL0NhbWVyYSc7XG5cbmV4cG9ydCBjbGFzcyBTdXJmYWNlXG57XG5cdGNvbnN0cnVjdG9yKHNwcml0ZUJvYXJkLCBzcHJpdGVTaGVldCwgbWFwLCB4U2l6ZSA9IDIsIHlTaXplID0gMiwgeE9mZnNldCA9IDAsIHlPZmZzZXQgPSAwLCBsYXllciA9IDAsIHogPSAtMSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBzcHJpdGVTaGVldDtcblxuXHRcdHRoaXMueCA9IHhPZmZzZXQ7XG5cdFx0dGhpcy55ID0geU9mZnNldDtcblx0XHR0aGlzLnogPSB6O1xuXG5cdFx0dGhpcy5sYXllciA9IGxheWVyO1xuXHRcdHRoaXMueFNpemUgPSB4U2l6ZTtcblx0XHR0aGlzLnlTaXplID0geVNpemU7XG5cblx0XHR0aGlzLnRpbGVXaWR0aCAgPSAzMjtcblx0XHR0aGlzLnRpbGVIZWlnaHQgPSAzMjtcblxuXHRcdHRoaXMud2lkdGggID0gdGhpcy54U2l6ZSAqIHRoaXMudGlsZVdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gdGhpcy55U2l6ZSAqIHRoaXMudGlsZUhlaWdodDtcblxuXHRcdHRoaXMubWFwID0gbWFwO1xuXG5cdFx0dGhpcy50ZXhWZXJ0aWNlcyA9IFtdO1xuXG5cdFx0XG5cdFx0dGhpcy5zdWJUZXh0dXJlcyA9IHt9O1xuXHRcdFxuXHRcdHRoaXMuc3ByaXRlU2hlZXQucmVhZHkudGhlbihzaGVldCA9PiB0aGlzLmJ1aWxkVGlsZXMoKSk7XG5cdFx0XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblx0XHR0aGlzLnBhbmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cdFx0XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5wYW5lKTtcblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgdGhpcy53aWR0aFxuXHRcdFx0LCB0aGlzLmhlaWdodFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBudWxsXG5cdFx0KTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXG5cdFx0Ly8qL1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0LyovXG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUik7XG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLkxJTkVBUik7XG5cdFx0Ly8qL1xuXG5cdFx0dGhpcy5mcmFtZUJ1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmZyYW1lQnVmZmVyKTtcblx0XHRnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChcblx0XHRcdGdsLkZSQU1FQlVGRkVSXG5cdFx0XHQsIGdsLkNPTE9SX0FUVEFDSE1FTlQwXG5cdFx0XHQsIGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgdGhpcy5wYW5lXG5cdFx0XHQsIDBcblx0XHQpO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5wYW5lKTtcblxuXHRcdGNvbnN0IHggPSB0aGlzLnggKyAtQ2FtZXJhLnggKyAoQ2FtZXJhLndpZHRoICAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgLyAyKTtcblx0XHRjb25zdCB5ID0gdGhpcy55ICsgLUNhbWVyYS55ICsgKENhbWVyYS5oZWlnaHQgICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAvIDIpO1xuXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHR4XG5cdFx0XHQsIHlcblx0XHRcdCwgdGhpcy53aWR0aCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWxcblx0XHRcdCwgdGhpcy5oZWlnaHQgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHR9XG5cblx0YnVpbGRUaWxlcygpXG5cdHtcblx0XHRsZXQgdGV4dHVyZVByb21pc2VzID0gW107XG5cdFx0Y29uc3Qgc2l6ZSA9IHRoaXMueFNpemUgKiB0aGlzLnlTaXplO1xuXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKylcblx0XHR7XG5cdFx0XHRsZXQgbG9jYWxYICA9IGkgJSB0aGlzLnhTaXplO1xuXHRcdFx0bGV0IG9mZnNldFggPSBNYXRoLmZsb29yKHRoaXMueCAvIHRoaXMudGlsZVdpZHRoKTtcblx0XHRcdGxldCBnbG9iYWxYID0gbG9jYWxYICsgb2Zmc2V0WDtcblxuXHRcdFx0bGV0IGxvY2FsWSAgPSBNYXRoLmZsb29yKGkgLyB0aGlzLnhTaXplKTtcblx0XHRcdGxldCBvZmZzZXRZID0gTWF0aC5mbG9vcih0aGlzLnkgLyB0aGlzLnRpbGVIZWlnaHQpO1xuXHRcdFx0bGV0IGdsb2JhbFkgPSBsb2NhbFkgKyBvZmZzZXRZO1xuXG5cdFx0XHRsZXQgZnJhbWVzID0gdGhpcy5tYXAuZ2V0VGlsZShnbG9iYWxYLCBnbG9iYWxZLCB0aGlzLmxheWVyKTtcblxuXHRcdFx0Y29uc3QgbG9hZFRleHR1cmUgPSBmcmFtZSA9PiB0aGlzLnNwcml0ZVNoZWV0LmNvbnN0cnVjdG9yLmxvYWRUZXh0dXJlKHRoaXMuc3ByaXRlQm9hcmQuZ2wyZCwgZnJhbWUpO1xuXG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGZyYW1lcykpXG5cdFx0XHR7XG5cdFx0XHRcdGxldCBqID0gMDtcblx0XHRcdFx0dGhpcy5zdWJUZXh0dXJlc1tpXSA9IFtdO1xuXHRcdFx0XHR0ZXh0dXJlUHJvbWlzZXMucHVzaChcblx0XHRcdFx0XHRQcm9taXNlLmFsbChmcmFtZXMubWFwKChmcmFtZSk9PlxuXHRcdFx0XHRcdFx0bG9hZFRleHR1cmUoZnJhbWUpLnRoZW4oXG5cdFx0XHRcdFx0XHRcdGFyZ3MgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc3ViVGV4dHVyZXNbaV1bal0gPSBhcmdzLnRleHR1cmU7XG5cdFx0XHRcdFx0XHRcdFx0aisrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHQpKTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGV4dHVyZVByb21pc2VzLnB1c2goXG5cdFx0XHRcdFx0bG9hZFRleHR1cmUoZnJhbWVzKS50aGVuKGFyZ3MgPT4gdGhpcy5zdWJUZXh0dXJlc1tpXSA9IGFyZ3MudGV4dHVyZSlcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRQcm9taXNlLmFsbCh0ZXh0dXJlUHJvbWlzZXMpLnRoZW4oKCkgPT4gdGhpcy5hc3NlbWJsZSgpKTtcblx0fVxuXG5cdGFzc2VtYmxlKClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cdFx0XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5zdWJUZXh0dXJlc1swXVswXSk7XG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmZyYW1lQnVmZmVyKTtcblx0XHRnbC52aWV3cG9ydCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG5cdFx0Ly8gZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKTtcblx0XHRnbC5jbGVhckNvbG9yKE1hdGgucmFuZG9tKCksIE1hdGgucmFuZG9tKCksIE1hdGgucmFuZG9tKCksIDEpO1xuXHRcdGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQgfCBnbC5ERVBUSF9CVUZGRVJfQklUKTtcblxuXHRcdGdsLnVuaWZvcm00Zihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuY29sb3JMb2NhdGlvblxuXHRcdFx0LCAxXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAxXG5cdFx0KTtcblxuXHRcdGdsLnVuaWZvcm0zZihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQudGlsZVBvc0xvY2F0aW9uXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGdsLnVuaWZvcm0yZihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzb2x1dGlvbkxvY2F0aW9uXG5cdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHQpO1xuXG5cdFx0aWYodGhpcy5zdWJUZXh0dXJlc1swXVswXSlcblx0XHR7XG5cdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnN1YlRleHR1cmVzWzBdWzBdKTtcblx0XHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLnRleENvb3JkQnVmZmVyKTtcblx0XHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdFx0MC4wLCAgICAgICAgICAgICAgMC4wLFxuXHRcdFx0XHR0aGlzLndpZHRoIC8gMzIsICAwLjAsXG5cdFx0XHRcdDAuMCwgICAgICAgICAgICAgIC10aGlzLmhlaWdodCAvIDMyLFxuXHRcdFx0XHQwLjAsICAgICAgICAgICAgICAtdGhpcy5oZWlnaHQgLyAzMixcblx0XHRcdFx0dGhpcy53aWR0aCAvIDMyLCAgMC4wLFxuXHRcdFx0XHR0aGlzLndpZHRoIC8gMzIsICAtdGhpcy5oZWlnaHQgLyAzMixcblx0XHRcdF0pLCBnbC5TVEFUSUNfRFJBVyk7XG5cblx0XHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0XHQwXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdFx0LCB0aGlzLmhlaWdodFxuXHRcdFx0KTtcblxuXHRcdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHRcdH1cblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cblx0XHRyZXR1cm47XG5cblx0XHRmb3IobGV0IGkgaW4gdGhpcy5zdWJUZXh0dXJlcylcblx0XHR7XG5cdFx0XHRpID0gTnVtYmVyKGkpO1xuXHRcdFx0Y29uc3QgeCA9IChpICogdGhpcy50aWxlV2lkdGgpICUgdGhpcy53aWR0aDtcblx0XHRcdGNvbnN0IHkgPSBNYXRoLnRydW5jKGkgKiB0aGlzLnRpbGVXaWR0aCAvIHRoaXMud2lkdGgpICogdGhpcy50aWxlV2lkdGg7XG5cblx0XHRcdGlmKCFBcnJheS5pc0FycmF5KHRoaXMuc3ViVGV4dHVyZXNbaV0pKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnN1YlRleHR1cmVzW2ldID0gW3RoaXMuc3ViVGV4dHVyZXNbaV1dO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRmb3IobGV0IGogaW4gdGhpcy5zdWJUZXh0dXJlc1tpXSlcblx0XHRcdHtcblx0XHRcdFx0Z2wudW5pZm9ybTNmKFxuXHRcdFx0XHRcdHRoaXMuc3ByaXRlQm9hcmQudGlsZVBvc0xvY2F0aW9uXG5cdFx0XHRcdFx0LCBOdW1iZXIoaSlcblx0XHRcdFx0XHQsIE9iamVjdC5rZXlzKHRoaXMuc3ViVGV4dHVyZXMpLmxlbmd0aFxuXHRcdFx0XHRcdCwgMVxuXHRcdFx0XHQpO1x0XHRcdFx0XG5cdFx0XHRcdFxuXHRcdFx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC50ZXhDb29yZEJ1ZmZlcik7XG5cdFx0XHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdFx0XHQwLjAsIDAuMCxcblx0XHRcdFx0XHQxLjAsIDAuMCxcblx0XHRcdFx0XHQwLjAsIDEuMCxcblx0XHRcdFx0XHQwLjAsIDEuMCxcblx0XHRcdFx0XHQxLjAsIDAuMCxcblx0XHRcdFx0XHQxLjAsIDEuMCxcblx0XHRcdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblx0XHRcdFx0XG5cdFx0XHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0XHRcdHhcblx0XHRcdFx0XHQsIHkgKyB0aGlzLnRpbGVIZWlnaHRcblx0XHRcdFx0XHQsIHRoaXMudGlsZVdpZHRoXG5cdFx0XHRcdFx0LCAtdGhpcy50aWxlSGVpZ2h0XG5cdFx0XHRcdCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XHRcdFx0XHRcblx0XHRcdH1cblx0XHR9XG5cblx0XHRnbC51bmlmb3JtM2YoXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnRpbGVQb3NMb2NhdGlvblxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXHR9XG5cblx0c2V0UmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQucG9zaXRpb25CdWZmZXIpO1xuXG5cdFx0Y29uc3QgeDEgPSB4O1xuXHRcdGNvbnN0IHgyID0gKHggKyB3aWR0aCk7XG5cdFx0Y29uc3QgeTEgPSB5O1xuXHRcdGNvbnN0IHkyID0gKHkgKyBoZWlnaHQpO1xuXG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkyLCB0aGlzLnosXG5cdFx0XHR4MiwgeTIsIHRoaXMueixcblx0XHRcdHgxLCB5MSwgdGhpcy56LFxuXHRcdFx0eDEsIHkxLCB0aGlzLnosXG5cdFx0XHR4MiwgeTIsIHRoaXMueixcblx0XHRcdHgyLCB5MSwgdGhpcy56LFxuXHRcdF0pLCBnbC5TVEFUSUNfRFJBVyk7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBUZXh0dXJlQmFua1xue1xuXHRcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IFwiLy8gdGV4dHVyZS5mcmFnXFxuXFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTtcXG51bmlmb3JtIHZlYzQgdV9jb2xvcjtcXG52YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDtcXG51bmlmb3JtIHZlYzMgdV90aWxlTm87XFxuXFxuXFxudmVjMiByaXBwbGUodmVjMiB0ZXhDb29yZCwgZmxvYXQgcmlwcGxlLCBmbG9hdCBkaXNwKSB7XFxuICByZXR1cm4gdmVjMih2X3RleENvb3JkLnggKyBzaW4odl90ZXhDb29yZC55ICogcmlwcGxlKSAqIGRpc3AsIHZfdGV4Q29vcmQueSk7XFxufVxcblxcbnZvaWQgbWFpbigpIHtcXG4vKlxcbiAgdmVjMiB2X2Rpc3BsYWNlZCA9IHJpcHBsZSh2X3RleENvb3JkLCAwLjAsIDAuMCk7XFxuLyovXFxuICB2ZWMyIHZfZGlzcGxhY2VkID0gcmlwcGxlKHZfdGV4Q29vcmQsIDMuMTQxNSAqIDIuMCwgMC4wMjUpO1xcbiAgaWYgKHZfZGlzcGxhY2VkLnggPiAxLjApIHtcXG4gICAgdl9kaXNwbGFjZWQueCA9IDEuMCAtICh2X2Rpc3BsYWNlZC54IC0gMS4wKTtcXG4gIH1cXG4gIGlmICh2X2Rpc3BsYWNlZC54IDwgMC4wKSB7XFxuICAgIHZfZGlzcGxhY2VkLnggPSBhYnModl9kaXNwbGFjZWQueCk7XFxuICB9XFxuLy8qL1xcbiAgaWYgKHVfdGlsZU5vLnogPiAwLjApIHtcXG4gICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCh1X3RpbGVOby54IC8gdV90aWxlTm8ueSwgMCwgMCwgMS4wKTtcXG4gIH0gXFxuICBlbHNlIHtcXG4gICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHZfZGlzcGxhY2VkKTtcXG4gIH1cXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiLy8gdGV4dHVyZS52ZXJ0XFxuXFxuYXR0cmlidXRlIHZlYzMgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gICB2ZWMyIHVfcmVzb2x1dGlvbjtcXG5cXG52YXJ5aW5nICAgdmVjMiB2X3RleENvb3JkO1xcblxcbnZvaWQgbWFpbigpXFxue1xcbiAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uLnh5IC8gdV9yZXNvbHV0aW9uO1xcbiAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7XFxuICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDtcXG5cXG4gIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7XFxuICB2X3RleENvb3JkICA9IGFfdGV4Q29vcmQ7XFxufVxcblwiIiwiaW1wb3J0IHsgVmlldyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1ZpZXcnO1xuXG5leHBvcnQgY2xhc3MgQ29udHJvbGxlciBleHRlbmRzIFZpZXdcbntcblx0Y29uc3RydWN0b3IoYXJncylcblx0e1xuXHRcdHN1cGVyKGFyZ3MpO1xuXHRcdHRoaXMudGVtcGxhdGUgID0gcmVxdWlyZSgnLi9jb250cm9sbGVyLnRtcCcpO1xuXHRcdHRoaXMuZHJhZ1N0YXJ0ID0gZmFsc2U7XG5cblx0XHR0aGlzLmFyZ3MuZHJhZ2dpbmcgID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnggPSAwO1xuXHRcdHRoaXMuYXJncy55ID0gMDtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMubW92ZVN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLmRyb3BTdGljayhldmVudCk7XG5cdFx0fSk7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLm1vdmVTdGljayhldmVudCk7XG5cdFx0fSk7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMuZHJvcFN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblx0fVxuXG5cdGRyYWdTdGljayhldmVudClcblx0e1xuXHRcdGxldCBwb3MgPSBldmVudDtcblxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRpZihldmVudC50b3VjaGVzICYmIGV2ZW50LnRvdWNoZXNbMF0pXG5cdFx0e1xuXHRcdFx0cG9zID0gZXZlbnQudG91Y2hlc1swXTtcblx0XHR9XG5cblx0XHR0aGlzLmFyZ3MuZHJhZ2dpbmcgPSB0cnVlO1xuXHRcdHRoaXMuZHJhZ1N0YXJ0ICAgICA9IHtcblx0XHRcdHg6ICAgcG9zLmNsaWVudFhcblx0XHRcdCwgeTogcG9zLmNsaWVudFlcblx0XHR9O1xuXHR9XG5cblx0bW92ZVN0aWNrKGV2ZW50KVxuXHR7XG5cdFx0aWYodGhpcy5hcmdzLmRyYWdnaW5nKVxuXHRcdHtcblx0XHRcdGxldCBwb3MgPSBldmVudDtcblxuXHRcdFx0aWYoZXZlbnQudG91Y2hlcyAmJiBldmVudC50b3VjaGVzWzBdKVxuXHRcdFx0e1xuXHRcdFx0XHRwb3MgPSBldmVudC50b3VjaGVzWzBdO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFyZ3MueHggPSBwb3MuY2xpZW50WCAtIHRoaXMuZHJhZ1N0YXJ0Lng7XG5cdFx0XHR0aGlzLmFyZ3MueXkgPSBwb3MuY2xpZW50WSAtIHRoaXMuZHJhZ1N0YXJ0Lnk7XG5cblx0XHRcdGNvbnN0IGxpbWl0ID0gNTA7XG5cblx0XHRcdGlmKHRoaXMuYXJncy54eCA8IC1saW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnggPSAtbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHRoaXMuYXJncy54eCA+IGxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IGxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IHRoaXMuYXJncy54eDtcblx0XHRcdH1cblxuXHRcdFx0aWYodGhpcy5hcmdzLnl5IDwgLWxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueSA9IC1saW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYodGhpcy5hcmdzLnl5ID4gbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gdGhpcy5hcmdzLnl5O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGRyb3BTdGljayhldmVudClcblx0e1xuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyA9IGZhbHNlO1xuXHRcdHRoaXMuYXJncy54ID0gMDtcblx0XHR0aGlzLmFyZ3MueSA9IDA7XG5cdH1cbn1cbiIsImltcG9ydCB7IFZpZXcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9WaWV3JztcblxuZXhwb3J0IGNsYXNzIE1hcEVkaXRvciBleHRlbmRzIFZpZXdcbntcblx0Y29uc3RydWN0b3IoYXJncylcblx0e1xuXHRcdHN1cGVyKGFyZ3MpO1xuXHRcdHRoaXMudGVtcGxhdGUgID0gcmVxdWlyZSgnLi9tYXBFZGl0b3IudG1wJyk7XG5cblx0XHRhcmdzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oKHNoZWV0KT0+e1xuXHRcdFx0dGhpcy5hcmdzLnRpbGVzID0gc2hlZXQuZnJhbWVzO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5hcmdzLmJpbmRUbygnc2VsZWN0ZWRHcmFwaGljJywgKHYpPT57XG5cdFx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRHcmFwaGljID0gbnVsbDtcblx0XHR9LCB7d2FpdDowfSk7XG5cblx0XHR0aGlzLmFyZ3MubXVsdGlTZWxlY3QgICA9IGZhbHNlO1xuXHRcdHRoaXMuYXJncy5zZWxlY3Rpb24gICAgID0ge307XG5cdFx0dGhpcy5hcmdzLnNlbGVjdGVkSW1hZ2UgPSBudWxsXG5cdH1cblxuXHRzZWxlY3RHcmFwaGljKHNyYylcblx0e1xuXHRcdGNvbnNvbGUubG9nKHNyYyk7XG5cblx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRHcmFwaGljID0gc3JjO1xuXHR9XG5cblx0c2VsZWN0KHNlbGVjdGlvbilcblx0e1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5hcmdzLnNlbGVjdGlvbiwgc2VsZWN0aW9uKTtcblxuXHRcdGlmKHNlbGVjdGlvbi5nbG9iYWxYICE9PSBzZWxlY3Rpb24uc3RhcnRHbG9iYWxYXG5cdFx0XHR8fCBzZWxlY3Rpb24uZ2xvYmFsWSAhPT0gc2VsZWN0aW9uLnN0YXJ0R2xvYmFsWVxuXHRcdCl7XG5cdFx0XHR0aGlzLmFyZ3MubXVsdGlTZWxlY3QgPSB0cnVlO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5hcmdzLm11bHRpU2VsZWN0ID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYoIXRoaXMuYXJncy5tdWx0aVNlbGVjdClcblx0XHR7XG5cdFx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRJbWFnZXMgPSB0aGlzLmFyZ3MubWFwLmdldFRpbGUoc2VsZWN0aW9uLmdsb2JhbFgsIHNlbGVjdGlvbi5nbG9iYWxZKTtcblx0XHR9XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzID0gXFxcImNvbnRyb2xsZXJcXFwiPlxcblxcdDxkaXYgY2xhc3MgPSBcXFwiam95c3RpY2tcXFwiIGN2LW9uID0gXFxcIlxcblxcdFxcdHRvdWNoc3RhcnQ6ZHJhZ1N0aWNrKGV2ZW50KTtcXG5cXHRcXHRtb3VzZWRvd246ZHJhZ1N0aWNrKGV2ZW50KTtcXG5cXHRcXFwiPlxcblxcdFxcdDxkaXYgY2xhc3MgPSBcXFwicGFkXFxcIiBzdHlsZSA9IFxcXCJwb3NpdGlvbjogcmVsYXRpdmU7IHRyYW5zZm9ybTp0cmFuc2xhdGUoW1t4XV1weCxbW3ldXXB4KTtcXFwiPjwvZGl2PlxcblxcdDwvZGl2PlxcblxcblxcdDxkaXYgY2xhc3MgPSBcXFwiYnV0dG9uXFxcIj5BPC9kaXY+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJidXR0b25cXFwiPkI8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImJ1dHRvblxcXCI+QzwvZGl2PlxcbjwvZGl2PlwiIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3MgPSBcXFwidGFiLXBhZ2UgbWFwRWRpdG9yXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRhYnNcXFwiPlxcblxcdFxcdDxkaXY+VGlsZTwvZGl2PlxcblxcdFxcdDxkaXY+TGF5ZXI8L2Rpdj5cXG5cXHRcXHQ8ZGl2Pk9iamVjdDwvZGl2PlxcblxcdFxcdDxkaXY+VHJpZ2dlcjwvZGl2PlxcblxcdFxcdDxkaXY+TWFwPC9kaXY+XFxuXFx0PC9kaXY+XFxuXFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5cXG5cXHRcXHQ8ZGl2IGNsYXNzID0gXFxcInNlbGVjdGVkXFxcIj5cXG5cXHRcXHRcXHQ8ZGl2IGN2LWlmID0gXFxcIiFtdWx0aVNlbGVjdFxcXCI+XFxuXFx0XFx0XFx0XFx0PHAgc3R5bGUgPSBcXFwiZm9udC1zaXplOiBsYXJnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0KFtbc2VsZWN0aW9uLmdsb2JhbFhdXSwgW1tzZWxlY3Rpb24uZ2xvYmFsWV1dKVxcblxcdFxcdFxcdFxcdDwvcD5cXG5cXHRcXHRcXHRcXHQ8cCBjdi1lYWNoID0gXFxcInNlbGVjdGVkSW1hZ2VzOnNlbGVjdGVkSW1hZ2U6c0lcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxidXR0b24+LTwvYnV0dG9uPlxcblxcdFxcdFxcdFxcdFxcdDxpbWcgY2xhc3MgPSBcXFwiY3VycmVudFxcXCIgY3YtYXR0ciA9IFxcXCJzcmM6c2VsZWN0ZWRJbWFnZVxcXCI+XFxuXFx0XFx0XFx0XFx0PC9wPlxcblxcdFxcdFxcdFxcdDxidXR0b24+KzwvYnV0dG9uPlxcblxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdDxkaXYgY3YtaWYgPSBcXFwibXVsdGlTZWxlY3RcXFwiPlxcblxcdFxcdFxcdFxcdDxwIHN0eWxlID0gXFxcImZvbnQtc2l6ZTogbGFyZ2VcXFwiPlxcblxcdFxcdFxcdFxcdFxcdChbW3NlbGVjdGlvbi5zdGFydEdsb2JhbFhdXSwgW1tzZWxlY3Rpb24uc3RhcnRHbG9iYWxZXV0pIC0gKFtbc2VsZWN0aW9uLmdsb2JhbFhdXSwgW1tzZWxlY3Rpb24uZ2xvYmFsWV1dKVxcblxcdFxcdFxcdFxcdDwvcD5cXG5cXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHQ8L2Rpdj5cXG5cXHRcXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVzXFxcIiBjdi1lYWNoID0gXFxcInRpbGVzOnRpbGU6dFxcXCI+XFxuXFx0XFx0XFx0PGltZyBjdi1hdHRyID0gXFxcInNyYzp0aWxlLHRpdGxlOnRcXFwiIGN2LW9uID0gXFxcImNsaWNrOnNlbGVjdEdyYXBoaWModCk7XFxcIj5cXG5cXHRcXHQ8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG5cXHQ8IS0tIDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+T0JKRUNUIE1PREU8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVcXFwiPlRSSUdHRVIgTU9ERTwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+TUFQIE1PREU8L2Rpdj4gLS0+XFxuPC9kaXY+XCIiLCJpbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlJztcblxuZXhwb3J0IGNsYXNzIEZsb29yXG57XG5cdGNvbnN0cnVjdG9yKGdsMmQsIGFyZ3MpXG5cdHtcblx0XHR0aGlzLmdsMmQgICA9IGdsMmQ7XG5cdFx0dGhpcy5zcHJpdGVzID0gW107XG5cblx0XHQvLyB0aGlzLnJlc2l6ZSg2MCwgMzQpO1xuXHRcdHRoaXMucmVzaXplKDksIDkpO1xuXHRcdC8vIHRoaXMucmVzaXplKDYwKjIsIDM0KjIpO1xuXHR9XG5cblx0cmVzaXplKHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHR0aGlzLndpZHRoICA9IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0Zm9yKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspXG5cdFx0e1xuXHRcdFx0Zm9yKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBzcHJpdGUgPSBuZXcgU3ByaXRlKHRoaXMuZ2wyZCwgJy9mbG9vclRpbGUucG5nJyk7XG5cblx0XHRcdFx0c3ByaXRlLnggPSAzMiAqIHg7XG5cdFx0XHRcdHNwcml0ZS55ID0gMzIgKiB5O1xuXG5cdFx0XHRcdHRoaXMuc3ByaXRlcy5wdXNoKHNwcml0ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHR0aGlzLnNwcml0ZXMubWFwKHMgPT4gcy5kcmF3KCkpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGVTaGVldCc7XG5pbXBvcnQgeyBJbmplY3RhYmxlICB9IGZyb20gJy4uL2luamVjdC9JbmplY3RhYmxlJztcbmltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuXG5leHBvcnQgIGNsYXNzIE1hcFxuZXh0ZW5kcyBJbmplY3RhYmxlLmluamVjdCh7U3ByaXRlU2hlZXR9KVxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cblx0XHR0aGlzLnRpbGVzID0ge307XG5cdH1cblxuXHRnZXRUaWxlKHgsIHksIGxheWVyID0gMClcblx0e1xuXHRcdGlmKHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSlcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0bGV0IHNwbGl0ID0gNDtcblx0XHRsZXQgc2Vjb25kID0gJ3JvY2tfNC5wbmcnO1xuXG5cdFx0aWYoKHggJSBzcGxpdCA9PT0gMCkgJiYgKHkgJSBzcGxpdCA9PT0gMCkpXG5cdFx0e1xuXHRcdFx0c2Vjb25kID0gJ2NoZWVzZS5wbmcnXG5cdFx0fVxuXG5cdFx0aWYoeCA9PT0gLTEgJiYgeSA9PT0gLTEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0Ly8gdGhpcy5TcHJpdGVTaGVldC5nZXRGcmFtZSgnZmxvb3JUaWxlLnBuZycpXG5cdFx0XHRcdHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2JveF9mYWNlLnBuZycpXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdHJldHVybiBbXG5cdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKCdmbG9vclRpbGUucG5nJylcblx0XHRcdC8vIHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2JveF9mYWNlLnBuZycpXG5cdFx0XTtcblxuXHRcdHJldHVybiBbXG5cdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKCdmbG9vclRpbGUucG5nJylcblx0XHRcdCwgdGhpcy5TcHJpdGVTaGVldC5nZXRGcmFtZShzZWNvbmQpXG5cdFx0XTtcblx0fVxuXG5cdHNldFRpbGUoeCwgeSwgaW1hZ2UsIGxheWVyID0gMClcblx0e1xuXHRcdHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSA9IGltYWdlO1xuXHR9XG5cblx0ZXhwb3J0KClcblx0e1xuXHRcdGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRoaXMudGlsZXMpKTtcblx0fVxuXG5cdGltcG9ydChpbnB1dClcblx0e1xuXHRcdGlucHV0ID0gYHtcIi0yLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCIsXCItMSwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wiLFwiMCwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wifWA7XG5cblx0XHR0aGlzLnRpbGVzID0gSlNPTi5wYXJzZShpbnB1dCk7XG5cblx0XHQvLyBjb25zb2xlLmxvZyhKU09OLnBhcnNlKGlucHV0KSk7XG5cdH1cbn1cblxuXG4vLyB7XCItMiwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wiLFwiLTEsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIixcIjAsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIn0iLCIvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBXZWJTb2NrZXQgPSB3aW5kb3cuV2ViU29ja2V0IHx8IHdpbmRvdy5Nb3pXZWJTb2NrZXQ7XG4gIHZhciBiciA9IHdpbmRvdy5icnVuY2ggPSAod2luZG93LmJydW5jaCB8fCB7fSk7XG4gIHZhciBhciA9IGJyWydhdXRvLXJlbG9hZCddID0gKGJyWydhdXRvLXJlbG9hZCddIHx8IHt9KTtcbiAgaWYgKCFXZWJTb2NrZXQgfHwgYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgaWYgKHdpbmRvdy5fYXIpIHJldHVybjtcbiAgd2luZG93Ll9hciA9IHRydWU7XG5cbiAgdmFyIGNhY2hlQnVzdGVyID0gZnVuY3Rpb24odXJsKXtcbiAgICB2YXIgZGF0ZSA9IE1hdGgucm91bmQoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgdXJsID0gdXJsLnJlcGxhY2UoLyhcXCZ8XFxcXD8pY2FjaGVCdXN0ZXI9XFxkKi8sICcnKTtcbiAgICByZXR1cm4gdXJsICsgKHVybC5pbmRleE9mKCc/JykgPj0gMCA/ICcmJyA6ICc/JykgKydjYWNoZUJ1c3Rlcj0nICsgZGF0ZTtcbiAgfTtcblxuICB2YXIgYnJvd3NlciA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKTtcbiAgdmFyIGZvcmNlUmVwYWludCA9IGFyLmZvcmNlUmVwYWludCB8fCBicm93c2VyLmluZGV4T2YoJ2Nocm9tZScpID4gLTE7XG5cbiAgdmFyIHJlbG9hZGVycyA9IHtcbiAgICBwYWdlOiBmdW5jdGlvbigpe1xuICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcbiAgICB9LFxuXG4gICAgc3R5bGVzaGVldDogZnVuY3Rpb24oKXtcbiAgICAgIFtdLnNsaWNlXG4gICAgICAgIC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpbmtbcmVsPXN0eWxlc2hlZXRdJykpXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIHZhciB2YWwgPSBsaW5rLmdldEF0dHJpYnV0ZSgnZGF0YS1hdXRvcmVsb2FkJyk7XG4gICAgICAgICAgcmV0dXJuIGxpbmsuaHJlZiAmJiB2YWwgIT0gJ2ZhbHNlJztcbiAgICAgICAgfSlcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIGxpbmsuaHJlZiA9IGNhY2hlQnVzdGVyKGxpbmsuaHJlZik7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBIYWNrIHRvIGZvcmNlIHBhZ2UgcmVwYWludCBhZnRlciAyNW1zLlxuICAgICAgaWYgKGZvcmNlUmVwYWludCkgc2V0VGltZW91dChmdW5jdGlvbigpIHsgZG9jdW1lbnQuYm9keS5vZmZzZXRIZWlnaHQ7IH0sIDI1KTtcbiAgICB9LFxuXG4gICAgamF2YXNjcmlwdDogZnVuY3Rpb24oKXtcbiAgICAgIHZhciBzY3JpcHRzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQnKSk7XG4gICAgICB2YXIgdGV4dFNjcmlwdHMgPSBzY3JpcHRzLm1hcChmdW5jdGlvbihzY3JpcHQpIHsgcmV0dXJuIHNjcmlwdC50ZXh0IH0pLmZpbHRlcihmdW5jdGlvbih0ZXh0KSB7IHJldHVybiB0ZXh0Lmxlbmd0aCA+IDAgfSk7XG4gICAgICB2YXIgc3JjU2NyaXB0cyA9IHNjcmlwdHMuZmlsdGVyKGZ1bmN0aW9uKHNjcmlwdCkgeyByZXR1cm4gc2NyaXB0LnNyYyB9KTtcblxuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgYWxsID0gc3JjU2NyaXB0cy5sZW5ndGg7XG4gICAgICB2YXIgb25Mb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvYWRlZCA9IGxvYWRlZCArIDE7XG4gICAgICAgIGlmIChsb2FkZWQgPT09IGFsbCkge1xuICAgICAgICAgIHRleHRTY3JpcHRzLmZvckVhY2goZnVuY3Rpb24oc2NyaXB0KSB7IGV2YWwoc2NyaXB0KTsgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3JjU2NyaXB0c1xuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzY3JpcHQpIHtcbiAgICAgICAgICB2YXIgc3JjID0gc2NyaXB0LnNyYztcbiAgICAgICAgICBzY3JpcHQucmVtb3ZlKCk7XG4gICAgICAgICAgdmFyIG5ld1NjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICAgIG5ld1NjcmlwdC5zcmMgPSBjYWNoZUJ1c3RlcihzcmMpO1xuICAgICAgICAgIG5ld1NjcmlwdC5hc3luYyA9IHRydWU7XG4gICAgICAgICAgbmV3U2NyaXB0Lm9ubG9hZCA9IG9uTG9hZDtcbiAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKG5ld1NjcmlwdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfTtcbiAgdmFyIHBvcnQgPSBhci5wb3J0IHx8IDk0ODU7XG4gIHZhciBob3N0ID0gYnIuc2VydmVyIHx8IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSB8fCAnbG9jYWxob3N0JztcblxuICB2YXIgY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgV2ViU29ja2V0KCd3czovLycgKyBob3N0ICsgJzonICsgcG9ydCk7XG4gICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCl7XG4gICAgICBpZiAoYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgICAgIHZhciBtZXNzYWdlID0gZXZlbnQuZGF0YTtcbiAgICAgIHZhciByZWxvYWRlciA9IHJlbG9hZGVyc1ttZXNzYWdlXSB8fCByZWxvYWRlcnMucGFnZTtcbiAgICAgIHJlbG9hZGVyKCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuICAgICAgaWYgKGNvbm5lY3Rpb24ucmVhZHlTdGF0ZSkgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24oKXtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNvbm5lY3QsIDEwMDApO1xuICAgIH07XG4gIH07XG4gIGNvbm5lY3QoKTtcbn0pKCk7XG4vKiBqc2hpbnQgaWdub3JlOmVuZCAqL1xuIl19