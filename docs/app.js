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
      if (Math.trunc(performance.now() / 1000) % 15 === 0) {
        this.sprite.region = fireRegion;
      }
      if (Math.trunc(performance.now() / 1000) % 15 === 5) {
        this.sprite.region = waterRegion;
      }
      if (Math.trunc(performance.now() / 1000) % 15 === 10) {
        this.sprite.region = null;
      }
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
      height = _ref.height;
    _classCallCheck(this, Sprite);
    this[_Bindable.Bindable.Prevent] = true;
    this.z = 0;
    this.x = 0;
    this.y = 0;
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
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
      gl.uniform4f(this.spriteBoard.regionLocation, 0, 0, 0, 0);
      gl.uniform2f(this.sizeLocation, 1.0, 1.0);
      this.setRectangle(this.x * this.spriteBoard.gl2d.zoomLevel + -_Camera.Camera.x + _Camera.Camera.width * this.spriteBoard.gl2d.zoomLevel / 2, this.y * this.spriteBoard.gl2d.zoomLevel + -_Camera.Camera.y + _Camera.Camera.height * this.spriteBoard.gl2d.zoomLevel / 2 + -this.height * 0.5 * this.spriteBoard.gl2d.zoomLevel, this.width * this.spriteBoard.gl2d.zoomLevel, this.height * this.spriteBoard.gl2d.zoomLevel);
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
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.positionBuffer);
      var x1 = x;
      var y1 = y;
      var x2 = x + width;
      var y2 = y + height;

      // const s = -80 * this.spriteBoard.gl2d.zoomLevel * Math.sin(performance.now() / 500);
      var s = 0;
      var points = new Float32Array([x1 + s, y1, x2 + s, y1, x1, y2, x1, y2, x2 + s, y1, x2, y2]);

      // const o = this.translate(points, -x + -width / 2, -y + -height/ 2);
      // const r = this.rotate(o, performance.now() / 1000 % (2 * Math.PI));
      // const t = this.translate(r, x + width / 2, y + height/ 2);

      gl.bufferData(gl.ARRAY_BUFFER, points, gl.STREAM_DRAW);
    }
  }, {
    key: "translate",
    value: function translate(points, dx, dy) {
      var matrix = [[1, 0, dx], [0, 1, dy], [0, 0, 1]];
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
  }, {
    key: "rotate",
    value: function rotate(points, theta) {
      var s = Math.sin(theta);
      var c = Math.cos(theta);
      var matrix = [[c, -s, 0], [s, c, 0], [0, 0, 1]];
      var output = [];
      for (var i = 0; i < points.length; i += 2) {
        var point = [points[i], points[i + 1], 1];
        var _iterator2 = _createForOfIteratorHelper(matrix),
          _step2;
        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var row = _step2.value;
            output.push(point[0] * row[0] + point[1] * row[1] + point[2] * row[2]);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }
      return new Float32Array(output.filter(function (_, k) {
        return (1 + k) % 3;
      }));
    }
  }, {
    key: "sheer",
    value: function sheer() {}
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
    var gl = this.gl2d.context;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    this.program = this.gl2d.createProgram(this.gl2d.createShader('sprite/texture.vert'), this.gl2d.createShader('sprite/texture.frag'));

    // this.overlayProgram = this.gl2d.createProgram(
    // 	this.gl2d.createShader('overlay/overlay.vert')
    // 	, this.gl2d.createShader('overlay/overlay.frag')
    // );

    gl.useProgram(this.program);
    this.positionBuffer = gl.createBuffer();
    this.texCoordBuffer = gl.createBuffer();
    this.effCoordBuffer = gl.createBuffer();
    this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
    this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    this.effCoordLocation = gl.getAttribLocation(this.program, 'a_effCoord');
    this.imageLocation = gl.getUniformLocation(this.program, 'u_image');
    this.effectLocation = gl.getUniformLocation(this.program, 'u_effect');
    this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
    this.colorLocation = gl.getUniformLocation(this.program, 'u_color');
    this.tilePosLocation = gl.getUniformLocation(this.program, 'u_tileNo');
    this.rippleLocation = gl.getUniformLocation(this.program, 'u_ripple');
    this.sizeLocation = gl.getUniformLocation(this.program, 'u_size');
    this.scaleLocation = gl.getUniformLocation(this.program, 'u_scale');
    this.regionLocation = gl.getUniformLocation(this.program, 'u_region');
    this.rectLocation = gl.getUniformLocation(this.program, 'u_rect');

    // this.overlayLocation   = gl.getAttribLocation(this.overlayProgram, 'a_position');
    // this.overlayResolution = gl.getUniformLocation(this.overlayProgram, 'u_resolution');
    // this.overlayColor      = gl.getUniformLocation(this.overlayProgram, 'u_color');

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    this.drawLayer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1000, 1000, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.effectLayer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1000, 1000, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.drawBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.drawLayer, 0);
    this.effectBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.effectLayer, 0);
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
      barrel.x = 32 + i * 32 % w;
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
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectBuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
      gl.uniform3f(this.rippleLocation, 0, 0, 0);
      gl.uniform2f(this.sizeLocation, _Camera.Camera.width, _Camera.Camera.height);
      gl.uniform2f(this.scaleLocation, this.gl2d.zoomLevel, this.gl2d.zoomLevel);
      gl.uniform4f(this.regionLocation, 0, 0, 0, 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
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
      gl.uniform3f(this.rippleLocation, Math.PI / 8, performance.now() / 200 // + -Camera.y
      , 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
      gl.uniform1i(this.imageLocation, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
      gl.uniform1i(this.effectLocation, 1);
      this.setRectangle(0, this.gl2d.element.height, this.gl2d.element.width, -this.gl2d.element.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.uniform3f(this.rippleLocation, 0, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.uniform1i(this.imageLocation, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.uniform1i(this.effectLocation, 1);
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
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
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
    var r = function r() {
      return parseInt(Math.random() * 255);
    };
    var pixel = new Uint8Array([r(), r(), r(), 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
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
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
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
      gl.bindTexture(gl.TEXTURE_2D, this.pane);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindTexture(gl.TEXTURE_2D, this.subTextures[0][0]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
      gl.viewport(0, 0, this.width, this.height);
      // gl.clearColor(0, 0, 0, 1);
      gl.clearColor(Math.random(), Math.random(), Math.random(), 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform4f(this.spriteBoard.colorLocation, 1, 0, 0, 1);
      gl.uniform3f(this.spriteBoard.tilePosLocation, 0, 0, 0);
      gl.uniform2f(this.spriteBoard.resolutionLocation, this.width, this.height);
      gl.uniform2f(this.spriteBoard.sizeLocation, this.width, this.height);
      gl.uniform3f(this.spriteBoard.rippleLocation, 0, 0, 0);
      if (this.subTextures[0][0]) {
        gl.bindTexture(gl.TEXTURE_2D, this.subTextures[0][0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, this.width / 32, 0.0, 0.0, -this.height / 32, 0.0, -this.height / 32, this.width / 32, 0.0, this.width / 32, -this.height / 32]), gl.STATIC_DRAW);
        this.setRectangle(0, 0, this.width, this.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y2, x2, y2, x1, y1, x1, y1, x2, y2, x2, y1]), gl.STATIC_DRAW);
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
module.exports = "// texture.frag\n#define M_PI 3.1415926535897932384626433832795\n#define M_TAU M_PI / 2.0\nprecision mediump float;\n\nuniform sampler2D u_image;\nuniform sampler2D u_effect;\n\nvarying vec2 v_texCoord;\nvarying vec2 v_position;\n\nuniform vec4 u_color;\nuniform vec3 u_tileNo;\nuniform vec3 u_ripple;\nuniform vec2 u_size;\nuniform vec2 u_rect;\nuniform vec2 u_scale;\nuniform vec4 u_region;\n\nfloat masked = 0.0;\nfloat sorted = 1.0;\nfloat displace = 1.0;\nfloat blur = 1.0;\n\nvec2 rippleX(vec2 texCoord, float a, float b, float c) {\n  vec2 rippled = vec2(\n    v_texCoord.x + sin(v_texCoord.y * (a * u_size.y) + b) * c / u_size.x,\n    v_texCoord.y\n  );\n\n  if (rippled.x < 0.0) {\n    rippled.x = abs(rippled.x);\n  }\n  else if (rippled.x > u_size.x) {\n    rippled.x = u_size.x - (rippled.x - u_size.x);\n  }\n\n  return rippled;\n}\n\nvec2 rippleY(vec2 texCoord, float a, float b, float c) {\n  vec2 rippled = vec2(v_texCoord.x, v_texCoord.y + sin(v_texCoord.x * (a * u_size.x) + b) * c / u_size.y);\n\n  if (rippled.y < 0.0) {\n    rippled.x = abs(rippled.x);\n  }\n  else if (rippled.y > u_size.y) {\n    rippled.y = u_size.y - (rippled.y - u_size.y);\n  }\n\n  return rippled;\n}\n\nvec4 motionBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {\n  vec4 originalColor = texture2D(image, textCoord);\n  vec4 dispColor = originalColor;\n\n  const float max = 10.0;\n  float weight = 0.85;\n\n  for (float i = 0.0; i < max; i += 1.0) {\n    if(i > abs(magnitude) || originalColor.a < 1.0) {\n      break;\n    }\n    vec4 dispColorDown = texture2D(image, textCoord + vec2(\n      cos(angle) * i * sign(magnitude) / u_size.x,\n      sin(angle) * i * sign(magnitude) / u_size.y\n    ));\n    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight;\n    weight *= 0.8;\n  }\n\n  return dispColor;\n}\n\nvec4 linearBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {\n  vec4 originalColor = texture2D(image, textCoord);\n  vec4 dispColor = texture2D(image, textCoord);\n\n  const float max = 10.0;\n  float weight = 0.65;\n\n  for (float i = 0.0; i < max; i += 0.25) {\n    if(i > abs(magnitude)) {\n      break;\n    }\n    vec4 dispColorUp = texture2D(image, textCoord + vec2(\n      cos(angle) * -i * sign(magnitude) / u_size.x,\n      sin(angle) * -i * sign(magnitude) / u_size.y\n    ));\n    vec4 dispColorDown = texture2D(image, textCoord + vec2(\n      cos(angle) * i * sign(magnitude) / u_size.x,\n      sin(angle) * i * sign(magnitude) / u_size.y\n    ));\n    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight * 0.5 + dispColorUp * weight * 0.5;\n    weight *= 0.70;\n  }\n\n  return dispColor;\n}\n\nvoid main() {\n  vec4 originalColor = texture2D(u_image, v_texCoord);\n  vec4 effectColor = texture2D(u_effect, v_texCoord);\n  gl_FragColor = originalColor;\n\n  if (u_region.r > 0.0 || u_region.g > 0.0 || u_region.b > 0.0) {\n    if (masked < 1.0 || originalColor.a > 0.0) {\n      gl_FragColor = u_region;\n    }\n    return;\n  }\n  else if (u_region.a > 0.0) {\n    if (sorted > 0.0) {\n      gl_FragColor = vec4(0, 0, 0, originalColor.a > 0.0 ? 1.0 : 0.0);\n    }\n    else {\n      gl_FragColor = vec4(0, 0, 0, 0.0);\n    }\n    return;\n  }\n\n  if (effectColor == vec4(0, 1, 1, 1)) { // Water region\n    vec2 texCoord = v_texCoord;\n    vec4 v_blurredColor = originalColor;\n    if (displace > 0.0) {\n      texCoord = rippleX(v_texCoord, u_ripple.x, u_ripple.y, u_ripple.z);\n      v_blurredColor = texture2D(u_image, texCoord);\n    }\n    if (blur > 0.0) {\n      v_blurredColor = linearBlur(u_image, 0.0, 1.0, texCoord);\n    }\n    gl_FragColor = v_blurredColor * 0.65 + effectColor * 0.35;\n  }\n  else if (effectColor == vec4(1, 0, 0, 1)) { // Fire region\n    vec2 v_displacement = rippleY(v_texCoord, u_ripple.x * 2.0, u_ripple.y * 1.5, u_ripple.z * 0.1);\n    vec4 v_blurredColor = originalColor;\n    if (displace > 0.0) {\n      v_blurredColor = texture2D(u_image, v_displacement);\n    }\n    if (blur > 0.0) {\n      v_blurredColor = motionBlur(u_image, -M_TAU, 1.0, v_displacement);\n    }\n    gl_FragColor = v_blurredColor * 0.75 + effectColor * 0.25;\n  }\n  else { // Null region\n    gl_FragColor = originalColor;\n  }\n}\n"
});

;require.register("sprite/texture.vert", function(exports, require, module) {
module.exports = "// texture.vert\nprecision mediump float;\n\nattribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform vec2 u_resolution;\n\nvarying vec2 v_texCoord;\nvarying vec2 v_position;\n\nvoid main()\n{\n  vec2 zeroToOne = a_position.xy / u_resolution;\n  vec2 zeroToTwo = zeroToOne * 2.0;\n  vec2 clipSpace = zeroToTwo - 1.0;\n\n  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n  v_texCoord  = a_texCoord;\n  v_position  = a_position.xy;\n}\n"
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9CYWcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL0RvbS5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9NaXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1RhZy5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9VdWlkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzIiwiYXBwL0NvbmZpZy5qcyIsImFwcC9nbDJkL0dsMmQuanMiLCJhcHAvaG9tZS9WaWV3LmpzIiwiYXBwL2hvbWUvdmlldy50bXAuaHRtbCIsImFwcC9pbml0aWFsaXplLmpzIiwiYXBwL2luamVjdC9Db250YWluZXIuanMiLCJhcHAvaW5qZWN0L0luamVjdGFibGUuanMiLCJhcHAvaW5qZWN0L1NpbmdsZS5qcyIsImFwcC9tb2RlbC9Db250cm9sbGVyLmpzIiwiYXBwL21vZGVsL0VudGl0eS5qcyIsImFwcC9vdmVybGF5L292ZXJsYXkuZnJhZyIsImFwcC9vdmVybGF5L292ZXJsYXkudmVydCIsImFwcC9zcHJpdGUvQmFja2dyb3VuZC5qcyIsImFwcC9zcHJpdGUvQ2FtZXJhLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGUuanMiLCJhcHAvc3ByaXRlL1Nwcml0ZUJvYXJkLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGVTaGVldC5qcyIsImFwcC9zcHJpdGUvU3VyZmFjZS5qcyIsImFwcC9zcHJpdGUvVGV4dHVyZUJhbmsuanMiLCJhcHAvc3ByaXRlL3RleHR1cmUuZnJhZyIsImFwcC9zcHJpdGUvdGV4dHVyZS52ZXJ0IiwiYXBwL3VpL0NvbnRyb2xsZXIuanMiLCJhcHAvdWkvTWFwRWRpdG9yLmpzIiwiYXBwL3VpL2NvbnRyb2xsZXIudG1wLmh0bWwiLCJhcHAvdWkvbWFwRWRpdG9yLnRtcC5odG1sIiwiYXBwL3dvcmxkL0Zsb29yLmpzIiwiYXBwL3dvcmxkL01hcC5qcyIsIm5vZGVfbW9kdWxlcy9hdXRvLXJlbG9hZC1icnVuY2gvdmVuZG9yL2F1dG8tcmVsb2FkLmpzIl0sIm5hbWVzIjpbIkNvbmZpZyIsImV4cG9ydHMiLCJfY3JlYXRlQ2xhc3MiLCJfY2xhc3NDYWxsQ2hlY2siLCJ0aXRsZSIsIkdsMmQiLCJlbGVtZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY29udGV4dCIsImdldENvbnRleHQiLCJzY3JlZW5TY2FsZSIsInpvb21MZXZlbCIsImtleSIsInZhbHVlIiwiY2xlYW51cCIsImRlbGV0ZVByb2dyYW0iLCJwcm9ncmFtIiwiY3JlYXRlU2hhZGVyIiwibG9jYXRpb24iLCJleHRlbnNpb24iLCJzdWJzdHJpbmciLCJsYXN0SW5kZXhPZiIsInR5cGUiLCJ0b1VwcGVyQ2FzZSIsIlZFUlRFWF9TSEFERVIiLCJGUkFHTUVOVF9TSEFERVIiLCJzaGFkZXIiLCJzb3VyY2UiLCJyZXF1aXJlIiwic2hhZGVyU291cmNlIiwiY29tcGlsZVNoYWRlciIsInN1Y2Nlc3MiLCJnZXRTaGFkZXJQYXJhbWV0ZXIiLCJDT01QSUxFX1NUQVRVUyIsImNvbnNvbGUiLCJlcnJvciIsImdldFNoYWRlckluZm9Mb2ciLCJkZWxldGVTaGFkZXIiLCJjcmVhdGVQcm9ncmFtIiwidmVydGV4U2hhZGVyIiwiZnJhZ21lbnRTaGFkZXIiLCJhdHRhY2hTaGFkZXIiLCJsaW5rUHJvZ3JhbSIsImRldGFjaFNoYWRlciIsImdldFByb2dyYW1QYXJhbWV0ZXIiLCJMSU5LX1NUQVRVUyIsImdldFByb2dyYW1JbmZvTG9nIiwiX1ZpZXciLCJfS2V5Ym9hcmQiLCJfQmFnIiwiX0NvbmZpZyIsIl9NYXAiLCJfU3ByaXRlU2hlZXQiLCJfU3ByaXRlQm9hcmQiLCJfQ29udHJvbGxlciIsIl9NYXBFZGl0b3IiLCJfRW50aXR5IiwiX0NhbWVyYSIsIl9Db250cm9sbGVyMiIsIl9TcHJpdGUiLCJhIiwibiIsIlR5cGVFcnJvciIsIl9kZWZpbmVQcm9wZXJ0aWVzIiwiZSIsInIiLCJ0IiwibGVuZ3RoIiwibyIsImVudW1lcmFibGUiLCJjb25maWd1cmFibGUiLCJ3cml0YWJsZSIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiX3RvUHJvcGVydHlLZXkiLCJwcm90b3R5cGUiLCJpIiwiX3RvUHJpbWl0aXZlIiwiX3R5cGVvZiIsIlN5bWJvbCIsInRvUHJpbWl0aXZlIiwiY2FsbCIsIlN0cmluZyIsIk51bWJlciIsIl9jYWxsU3VwZXIiLCJfZ2V0UHJvdG90eXBlT2YiLCJfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybiIsIl9pc05hdGl2ZVJlZmxlY3RDb25zdHJ1Y3QiLCJSZWZsZWN0IiwiY29uc3RydWN0IiwiY29uc3RydWN0b3IiLCJhcHBseSIsIl9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQiLCJSZWZlcmVuY2VFcnJvciIsIkJvb2xlYW4iLCJ2YWx1ZU9mIiwic2V0UHJvdG90eXBlT2YiLCJnZXRQcm90b3R5cGVPZiIsImJpbmQiLCJfX3Byb3RvX18iLCJfaW5oZXJpdHMiLCJjcmVhdGUiLCJfc2V0UHJvdG90eXBlT2YiLCJBcHBsaWNhdGlvbiIsIm9uU2NyZWVuSm95UGFkIiwiT25TY3JlZW5Kb3lQYWQiLCJrZXlib2FyZCIsIktleWJvYXJkIiwiZ2V0IiwiVmlldyIsIl9CYXNlVmlldyIsImFyZ3MiLCJfdGhpcyIsIndpbmRvdyIsInNtUHJvZmlsaW5nIiwidGVtcGxhdGUiLCJyb3V0ZXMiLCJlbnRpdGllcyIsIkJhZyIsInNwZWVkIiwibWF4U3BlZWQiLCJjb250cm9sbGVyIiwiZnBzIiwic3BzIiwiY2FtWCIsImNhbVkiLCJmcmFtZUxvY2siLCJzaW11bGF0aW9uTG9jayIsInNob3dFZGl0b3IiLCJsaXN0ZW5pbmciLCJrZXlzIiwiYmluZFRvIiwidiIsImsiLCJkIiwibWFwIiwic3ByaXRlQm9hcmQiLCJ1bnNlbGVjdCIsInNwcml0ZVNoZWV0IiwiU3ByaXRlU2hlZXQiLCJXb3JsZE1hcCIsIm1hcEVkaXRvciIsIk1hcEVkaXRvciIsIm9uUmVuZGVyZWQiLCJfdGhpczIiLCJTcHJpdGVCb2FyZCIsInRhZ3MiLCJjYW52YXMiLCJlbnRpdHkiLCJFbnRpdHkiLCJzcHJpdGUiLCJTcHJpdGUiLCJzcmMiLCJ1bmRlZmluZWQiLCJ3aWR0aCIsImhlaWdodCIsIkNvbnRyb2xsZXIiLCJjYW1lcmEiLCJDYW1lcmEiLCJhZGQiLCJzcHJpdGVzIiwiZm9sbG93aW5nIiwiem9vbSIsInNlbGVjdGVkIiwiZ2xvYmFsWCIsInN0YXJ0R2xvYmFsWCIsImlpIiwiX3JlZiIsImoiLCJzdGFydEdsb2JhbFkiLCJqaiIsImdsb2JhbFkiLCJfcmVmMiIsInNldFRpbGUiLCJyZXNpemUiLCJwIiwibG9jYWxYIiwic2VsZWN0Iiwid2FpdCIsImFkZEV2ZW50TGlzdGVuZXIiLCJmVGhlbiIsInNUaGVuIiwiZlNhbXBsZXMiLCJzU2FtcGxlcyIsIm1heFNhbXBsZXMiLCJzaW11bGF0ZSIsIm5vdyIsImRlbHRhIiwidXBkYXRlIiwidmFsdWVzIiwiaXRlbXMiLCJfc3BzIiwicHVzaCIsInNoaWZ0IiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiZHJhdyIsInRvRml4ZWQiLCJ4IiwieSIsImdsMmQiLCJib2R5IiwiY2xpZW50SGVpZ2h0IiwicGVyZm9ybWFuY2UiLCJzZXRJbnRlcnZhbCIsImNvbmNhdCIsInJlZHVjZSIsImIiLCJwYWRTdGFydCIsImNsaWVudFdpZHRoIiwicndpZHRoIiwiTWF0aCIsInRydW5jIiwicmhlaWdodCIsIm9sZFNjYWxlIiwic2Nyb2xsIiwiZXZlbnQiLCJkZWx0YVkiLCJtYXgiLCJtaW4iLCJzdGVwIiwiQmFzZVZpZXciLCJfUm91dGVyIiwiUHJveHkiLCJ2aWV3IiwiUm91dGVyIiwibGlzdGVuIiwicmVuZGVyIiwiX0luamVjdGFibGUyIiwiQ29udGFpbmVyIiwiX0luamVjdGFibGUiLCJhcmd1bWVudHMiLCJpbmplY3QiLCJpbmplY3Rpb25zIiwiYXNzaWduIiwiSW5qZWN0YWJsZSIsImNsYXNzZXMiLCJvYmplY3RzIiwibmFtZSIsImluamVjdGlvbiIsInRlc3QiLCJpbnN0YW5jZSIsIkVycm9yIiwiZXhpc3RpbmdJbmplY3Rpb25zIiwiX2NsYXNzIiwiU2luZ2xlIiwicmFuZG9tIiwic2luZ2xlIiwiX0JpbmRhYmxlIiwiaXRlcmF0b3IiLCJfZGVmaW5lUHJvcGVydHkiLCJCaW5kYWJsZSIsIm1ha2VCaW5kYWJsZSIsImtleVByZXNzIiwia2V5UmVsZWFzZSIsImF4aXMiLCJwcmV2IiwidHJpZ2dlcnMiLCJmaXJlUmVnaW9uIiwid2F0ZXJSZWdpb24iLCJkaXJlY3Rpb24iLCJzdGF0ZSIsInJlZ2lvbiIsInhBeGlzIiwieUF4aXMiLCJsb2ciLCJjZWlsIiwiZmxvb3IiLCJob3Jpem9udGFsIiwiYWJzIiwiZnJhbWVzIiwic2V0RnJhbWVzIiwiZGVzdHJveSIsIl9TdXJmYWNlIiwiQmFja2dyb3VuZCIsImxheWVyIiwicGFuZXMiLCJwYW5lc1hZIiwibWF4UGFuZXMiLCJ0aWxlV2lkdGgiLCJ0aWxlSGVpZ2h0Iiwic3VyZmFjZVdpZHRoIiwic3VyZmFjZUhlaWdodCIsInJlbmRlclBhbmUiLCJmb3JjZVVwZGF0ZSIsInBhbmUiLCJwYW5lWCIsInBhbmVZIiwiU3VyZmFjZSIsImNlbnRlclgiLCJjZW50ZXJZIiwicmFuZ2UiLCJmb3JFYWNoIiwicG9wIiwiX2NyZWF0ZUZvck9mSXRlcmF0b3JIZWxwZXIiLCJBcnJheSIsImlzQXJyYXkiLCJfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkiLCJfbiIsIkYiLCJzIiwiZG9uZSIsImYiLCJ1IiwibmV4dCIsIl90b0NvbnN1bWFibGVBcnJheSIsIl9hcnJheVdpdGhvdXRIb2xlcyIsIl9pdGVyYWJsZVRvQXJyYXkiLCJfbm9uSXRlcmFibGVTcHJlYWQiLCJfYXJyYXlMaWtlVG9BcnJheSIsInRvU3RyaW5nIiwic2xpY2UiLCJmcm9tIiwiUHJldmVudCIsInoiLCJzY2FsZSIsImZyYW1lRGVsYXkiLCJjdXJyZW50RGVsYXkiLCJjdXJyZW50RnJhbWUiLCJjdXJyZW50RnJhbWVzIiwibW92aW5nIiwiUklHSFQiLCJET1dOIiwiTEVGVCIsIlVQIiwiRUFTVCIsIlNPVVRIIiwiV0VTVCIsIk5PUlRIIiwic3RhbmRpbmciLCJ3YWxraW5nIiwiZ2wiLCJ0ZXh0dXJlIiwiY3JlYXRlVGV4dHVyZSIsImJpbmRUZXh0dXJlIiwiVEVYVFVSRV8yRCIsInBhcnNlSW50IiwicGl4ZWwiLCJVaW50OEFycmF5IiwidGV4SW1hZ2UyRCIsIlJHQkEiLCJVTlNJR05FRF9CWVRFIiwicmVhZHkiLCJ0aGVuIiwic2hlZXQiLCJmcmFtZSIsImdldEZyYW1lIiwibG9hZFRleHR1cmUiLCJpbWFnZSIsImJpbmRCdWZmZXIiLCJBUlJBWV9CVUZGRVIiLCJ0ZXhDb29yZEJ1ZmZlciIsImJ1ZmZlckRhdGEiLCJGbG9hdDMyQXJyYXkiLCJTVEFUSUNfRFJBVyIsInVuaWZvcm00ZiIsInJlZ2lvbkxvY2F0aW9uIiwidW5pZm9ybTJmIiwic2l6ZUxvY2F0aW9uIiwic2V0UmVjdGFuZ2xlIiwiYmluZEZyYW1lYnVmZmVyIiwiRlJBTUVCVUZGRVIiLCJkcmF3QnVmZmVyIiwiZHJhd0FycmF5cyIsIlRSSUFOR0xFUyIsImVmZmVjdEJ1ZmZlciIsImZyYW1lU2VsZWN0b3IiLCJmcmFtZXNJZCIsImpvaW4iLCJnZXRGcmFtZXMiLCJQcm9taXNlIiwiYWxsIiwidHJhbnNmb3JtIiwicG9zaXRpb25CdWZmZXIiLCJ4MSIsInkxIiwieDIiLCJ5MiIsInBvaW50cyIsIlNUUkVBTV9EUkFXIiwidHJhbnNsYXRlIiwiZHgiLCJkeSIsIm1hdHJpeCIsIm91dHB1dCIsInBvaW50IiwiX2l0ZXJhdG9yIiwiX3N0ZXAiLCJyb3ciLCJlcnIiLCJmaWx0ZXIiLCJfIiwicm90YXRlIiwidGhldGEiLCJzaW4iLCJjIiwiY29zIiwiX2l0ZXJhdG9yMiIsIl9zdGVwMiIsInNoZWVyIiwiaW1hZ2VTcmMiLCJwcm9taXNlcyIsImxvYWRJbWFnZSIsInRleFBhcmFtZXRlcmkiLCJURVhUVVJFX1dSQVBfUyIsIkNMQU1QX1RPX0VER0UiLCJURVhUVVJFX1dSQVBfVCIsIlRFWFRVUkVfTUlOX0ZJTFRFUiIsIk5FQVJFU1QiLCJURVhUVVJFX01BR19GSUxURVIiLCJhY2NlcHQiLCJyZWplY3QiLCJJbWFnZSIsIl9CYWNrZ3JvdW5kIiwiX0dsMmQiLCJtb3VzZSIsImNsaWNrWCIsImNsaWNrWSIsImJsZW5kRnVuYyIsIlNSQ19BTFBIQSIsIk9ORV9NSU5VU19TUkNfQUxQSEEiLCJlbmFibGUiLCJCTEVORCIsInVzZVByb2dyYW0iLCJjcmVhdGVCdWZmZXIiLCJlZmZDb29yZEJ1ZmZlciIsInBvc2l0aW9uTG9jYXRpb24iLCJnZXRBdHRyaWJMb2NhdGlvbiIsInRleENvb3JkTG9jYXRpb24iLCJlZmZDb29yZExvY2F0aW9uIiwiaW1hZ2VMb2NhdGlvbiIsImdldFVuaWZvcm1Mb2NhdGlvbiIsImVmZmVjdExvY2F0aW9uIiwicmVzb2x1dGlvbkxvY2F0aW9uIiwiY29sb3JMb2NhdGlvbiIsInRpbGVQb3NMb2NhdGlvbiIsInJpcHBsZUxvY2F0aW9uIiwic2NhbGVMb2NhdGlvbiIsInJlY3RMb2NhdGlvbiIsImVuYWJsZVZlcnRleEF0dHJpYkFycmF5IiwidmVydGV4QXR0cmliUG9pbnRlciIsIkZMT0FUIiwiZHJhd0xheWVyIiwiZWZmZWN0TGF5ZXIiLCJjcmVhdGVGcmFtZWJ1ZmZlciIsImZyYW1lYnVmZmVyVGV4dHVyZTJEIiwiQ09MT1JfQVRUQUNITUVOVDAiLCJjbGllbnRYIiwiY2xpZW50WSIsImxvY2FsWSIsImJhY2tncm91bmQiLCJ3IiwiZmlsbCIsImJhcnJlbCIsImNsZWFyQ29sb3IiLCJjbGVhciIsIkNPTE9SX0JVRkZFUl9CSVQiLCJ2aWV3cG9ydCIsInVuaWZvcm0zZiIsInRpbWUiLCJzb3J0IiwidGltZUVuZCIsIlBJIiwiYWN0aXZlVGV4dHVyZSIsIlRFWFRVUkUwIiwidW5pZm9ybTFpIiwiVEVYVFVSRTEiLCJpbWFnZVVybCIsImJveGVzVXJsIiwidmVydGljZXMiLCJyZXF1ZXN0IiwiUmVxdWVzdCIsInNoZWV0TG9hZGVyIiwiZmV0Y2giLCJyZXNwb25zZSIsImpzb24iLCJib3hlcyIsImltYWdlTG9hZGVyIiwib25sb2FkIiwicHJvY2Vzc0ltYWdlIiwid2lsbFJlYWRGcmVxdWVudGx5IiwiZHJhd0ltYWdlIiwiZnJhbWVQcm9taXNlcyIsIl9sb29wIiwic3ViQ2FudmFzIiwiaCIsInN1YkNvbnRleHQiLCJwdXRJbWFnZURhdGEiLCJnZXRJbWFnZURhdGEiLCJ0ZXh0IiwiZmlsbFN0eWxlIiwiY29sb3IiLCJmb250IiwidGV4dEFsaWduIiwiZmlsbFRleHQiLCJ0b0Jsb2IiLCJibG9iIiwiZmlsZW5hbWUiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJnZXRWZXJ0aWNlcyIsIl90aGlzMyIsImdldEZyYW1lc0J5UHJlZml4IiwicHJlZml4IiwidGV4dHVyZVByb21pc2VzIiwiUkVQRUFUIiwiaW1hZ2VQcm9taXNlcyIsInhTaXplIiwieVNpemUiLCJ4T2Zmc2V0IiwieU9mZnNldCIsInRleFZlcnRpY2VzIiwic3ViVGV4dHVyZXMiLCJidWlsZFRpbGVzIiwiZnJhbWVCdWZmZXIiLCJzaXplIiwib2Zmc2V0WCIsIm9mZnNldFkiLCJnZXRUaWxlIiwiYXNzZW1ibGUiLCJERVBUSF9CVUZGRVJfQklUIiwiVGV4dHVyZUJhbmsiLCJfVmlldzIiLCJkcmFnU3RhcnQiLCJkcmFnZ2luZyIsIm1vdmVTdGljayIsImRyb3BTdGljayIsImRyYWdTdGljayIsInBvcyIsInByZXZlbnREZWZhdWx0IiwidG91Y2hlcyIsInh4IiwieXkiLCJsaW1pdCIsInRpbGVzIiwic2VsZWN0ZWRHcmFwaGljIiwibXVsdGlTZWxlY3QiLCJzZWxlY3Rpb24iLCJzZWxlY3RlZEltYWdlIiwic2VsZWN0R3JhcGhpYyIsInNlbGVjdGVkSW1hZ2VzIiwiRmxvb3IiLCJNYXAiLCJfSW5qZWN0YWJsZSRpbmplY3QiLCJzcGxpdCIsInNlY29uZCIsImV4cG9ydCIsIkpTT04iLCJzdHJpbmdpZnkiLCJpbXBvcnQiLCJpbnB1dCIsInBhcnNlIiwiV2ViU29ja2V0IiwiTW96V2ViU29ja2V0IiwiYnIiLCJicnVuY2giLCJhciIsImRpc2FibGVkIiwiX2FyIiwiY2FjaGVCdXN0ZXIiLCJ1cmwiLCJkYXRlIiwicm91bmQiLCJEYXRlIiwicmVwbGFjZSIsImluZGV4T2YiLCJicm93c2VyIiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwidG9Mb3dlckNhc2UiLCJmb3JjZVJlcGFpbnQiLCJyZWxvYWRlcnMiLCJwYWdlIiwicmVsb2FkIiwic3R5bGVzaGVldCIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJsaW5rIiwidmFsIiwiZ2V0QXR0cmlidXRlIiwiaHJlZiIsInNldFRpbWVvdXQiLCJvZmZzZXRIZWlnaHQiLCJqYXZhc2NyaXB0Iiwic2NyaXB0cyIsInRleHRTY3JpcHRzIiwic2NyaXB0Iiwic3JjU2NyaXB0cyIsImxvYWRlZCIsIm9uTG9hZCIsImV2YWwiLCJyZW1vdmUiLCJuZXdTY3JpcHQiLCJhc3luYyIsImhlYWQiLCJhcHBlbmRDaGlsZCIsInBvcnQiLCJob3N0Iiwic2VydmVyIiwiaG9zdG5hbWUiLCJjb25uZWN0IiwiY29ubmVjdGlvbiIsIm9ubWVzc2FnZSIsIm1lc3NhZ2UiLCJkYXRhIiwicmVsb2FkZXIiLCJvbmVycm9yIiwicmVhZHlTdGF0ZSIsImNsb3NlIiwib25jbG9zZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3IzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0lDOUthQSxNQUFNLEdBQUFDLE9BQUEsQ0FBQUQsTUFBQSxnQkFBQUUsWUFBQSxVQUFBRixPQUFBO0VBQUFHLGVBQUEsT0FBQUgsTUFBQTtBQUFBO0FBQUc7QUFFdEJBLE1BQU0sQ0FBQ0ksS0FBSyxHQUFHLE9BQU87QUFDdEI7Ozs7Ozs7Ozs7Ozs7Ozs7SUNIYUMsSUFBSSxHQUFBSixPQUFBLENBQUFJLElBQUE7RUFFaEIsU0FBQUEsS0FBWUMsT0FBTyxFQUNuQjtJQUFBSCxlQUFBLE9BQUFFLElBQUE7SUFDQyxJQUFJLENBQUNDLE9BQU8sR0FBS0EsT0FBTyxJQUFJQyxRQUFRLENBQUNDLGFBQWEsQ0FBQyxRQUFRLENBQUM7SUFDNUQsSUFBSSxDQUFDQyxPQUFPLEdBQUssSUFBSSxDQUFDSCxPQUFPLENBQUNJLFVBQVUsQ0FBQyxPQUFPLENBQUM7SUFDakQsSUFBSSxDQUFDQyxXQUFXLEdBQUcsQ0FBQztJQUNwQixJQUFJLENBQUNDLFNBQVMsR0FBRyxDQUFDO0VBQ25CO0VBQUMsT0FBQVYsWUFBQSxDQUFBRyxJQUFBO0lBQUFRLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFDLE9BQU9BLENBQUEsRUFDUDtNQUNDLElBQUksQ0FBQ04sT0FBTyxDQUFDTyxhQUFhLENBQUMsSUFBSSxDQUFDQyxPQUFPLENBQUM7SUFDekM7RUFBQztJQUFBSixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBSSxZQUFZQSxDQUFDQyxRQUFRLEVBQ3JCO01BQ0MsSUFBTUMsU0FBUyxHQUFHRCxRQUFRLENBQUNFLFNBQVMsQ0FBQ0YsUUFBUSxDQUFDRyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDO01BQ2pFLElBQU1DLElBQUksR0FBRyxJQUFJO01BRWpCLFFBQU9ILFNBQVMsQ0FBQ0ksV0FBVyxDQUFDLENBQUM7UUFFN0IsS0FBSyxNQUFNO1VBQ1ZELElBQUksR0FBRyxJQUFJLENBQUNkLE9BQU8sQ0FBQ2dCLGFBQWE7VUFDakM7UUFDRCxLQUFLLE1BQU07VUFDVkYsSUFBSSxHQUFHLElBQUksQ0FBQ2QsT0FBTyxDQUFDaUIsZUFBZTtVQUNuQztNQUNGO01BRUEsSUFBTUMsTUFBTSxHQUFHLElBQUksQ0FBQ2xCLE9BQU8sQ0FBQ1MsWUFBWSxDQUFDSyxJQUFJLENBQUM7TUFDOUMsSUFBTUssTUFBTSxHQUFHQyxPQUFPLENBQUNWLFFBQVEsQ0FBQztNQUVoQyxJQUFJLENBQUNWLE9BQU8sQ0FBQ3FCLFlBQVksQ0FBQ0gsTUFBTSxFQUFFQyxNQUFNLENBQUM7TUFDekMsSUFBSSxDQUFDbkIsT0FBTyxDQUFDc0IsYUFBYSxDQUFDSixNQUFNLENBQUM7TUFFbEMsSUFBTUssT0FBTyxHQUFHLElBQUksQ0FBQ3ZCLE9BQU8sQ0FBQ3dCLGtCQUFrQixDQUM5Q04sTUFBTSxFQUNKLElBQUksQ0FBQ2xCLE9BQU8sQ0FBQ3lCLGNBQ2hCLENBQUM7TUFFRCxJQUFHRixPQUFPLEVBQ1Y7UUFDQyxPQUFPTCxNQUFNO01BQ2Q7TUFFQVEsT0FBTyxDQUFDQyxLQUFLLENBQUMsSUFBSSxDQUFDM0IsT0FBTyxDQUFDNEIsZ0JBQWdCLENBQUNWLE1BQU0sQ0FBQyxDQUFDO01BRXBELElBQUksQ0FBQ2xCLE9BQU8sQ0FBQzZCLFlBQVksQ0FBQ1gsTUFBTSxDQUFDO0lBQ2xDO0VBQUM7SUFBQWQsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXlCLGFBQWFBLENBQUNDLFlBQVksRUFBRUMsY0FBYyxFQUMxQztNQUNDLElBQU14QixPQUFPLEdBQUcsSUFBSSxDQUFDUixPQUFPLENBQUM4QixhQUFhLENBQUMsQ0FBQztNQUU1QyxJQUFJLENBQUM5QixPQUFPLENBQUNpQyxZQUFZLENBQUN6QixPQUFPLEVBQUV1QixZQUFZLENBQUM7TUFDaEQsSUFBSSxDQUFDL0IsT0FBTyxDQUFDaUMsWUFBWSxDQUFDekIsT0FBTyxFQUFFd0IsY0FBYyxDQUFDO01BRWxELElBQUksQ0FBQ2hDLE9BQU8sQ0FBQ2tDLFdBQVcsQ0FBQzFCLE9BQU8sQ0FBQztNQUVqQyxJQUFJLENBQUNSLE9BQU8sQ0FBQ21DLFlBQVksQ0FBQzNCLE9BQU8sRUFBRXVCLFlBQVksQ0FBQztNQUNoRCxJQUFJLENBQUMvQixPQUFPLENBQUNtQyxZQUFZLENBQUMzQixPQUFPLEVBQUV3QixjQUFjLENBQUM7TUFDbEQsSUFBSSxDQUFDaEMsT0FBTyxDQUFDNkIsWUFBWSxDQUFDRSxZQUFZLENBQUM7TUFDdkMsSUFBSSxDQUFDL0IsT0FBTyxDQUFDNkIsWUFBWSxDQUFDRyxjQUFjLENBQUM7TUFFekMsSUFBRyxJQUFJLENBQUNoQyxPQUFPLENBQUNvQyxtQkFBbUIsQ0FBQzVCLE9BQU8sRUFBRSxJQUFJLENBQUNSLE9BQU8sQ0FBQ3FDLFdBQVcsQ0FBQyxFQUN0RTtRQUNDLE9BQU83QixPQUFPO01BQ2Y7TUFFQWtCLE9BQU8sQ0FBQ0MsS0FBSyxDQUFDLElBQUksQ0FBQzNCLE9BQU8sQ0FBQ3NDLGlCQUFpQixDQUFDOUIsT0FBTyxDQUFDLENBQUM7TUFFdEQsSUFBSSxDQUFDUixPQUFPLENBQUNPLGFBQWEsQ0FBQ0MsT0FBTyxDQUFDO01BRW5DLE9BQU9BLE9BQU87SUFDZjtFQUFDO0FBQUE7Ozs7Ozs7Ozs7O0FDM0VGLElBQUErQixLQUFBLEdBQUFuQixPQUFBO0FBQ0EsSUFBQW9CLFNBQUEsR0FBQXBCLE9BQUE7QUFDQSxJQUFBcUIsSUFBQSxHQUFBckIsT0FBQTtBQUVBLElBQUFzQixPQUFBLEdBQUF0QixPQUFBO0FBRUEsSUFBQXVCLElBQUEsR0FBQXZCLE9BQUE7QUFFQSxJQUFBd0IsWUFBQSxHQUFBeEIsT0FBQTtBQUNBLElBQUF5QixZQUFBLEdBQUF6QixPQUFBO0FBRUEsSUFBQTBCLFdBQUEsR0FBQTFCLE9BQUE7QUFDQSxJQUFBMkIsVUFBQSxHQUFBM0IsT0FBQTtBQUVBLElBQUE0QixPQUFBLEdBQUE1QixPQUFBO0FBQ0EsSUFBQTZCLE9BQUEsR0FBQTdCLE9BQUE7QUFFQSxJQUFBOEIsWUFBQSxHQUFBOUIsT0FBQTtBQUNBLElBQUErQixPQUFBLEdBQUEvQixPQUFBO0FBQTBDLFNBQUExQixnQkFBQTBELENBQUEsRUFBQUMsQ0FBQSxVQUFBRCxDQUFBLFlBQUFDLENBQUEsYUFBQUMsU0FBQTtBQUFBLFNBQUFDLGtCQUFBQyxDQUFBLEVBQUFDLENBQUEsYUFBQUMsQ0FBQSxNQUFBQSxDQUFBLEdBQUFELENBQUEsQ0FBQUUsTUFBQSxFQUFBRCxDQUFBLFVBQUFFLENBQUEsR0FBQUgsQ0FBQSxDQUFBQyxDQUFBLEdBQUFFLENBQUEsQ0FBQUMsVUFBQSxHQUFBRCxDQUFBLENBQUFDLFVBQUEsUUFBQUQsQ0FBQSxDQUFBRSxZQUFBLGtCQUFBRixDQUFBLEtBQUFBLENBQUEsQ0FBQUcsUUFBQSxRQUFBQyxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxFQUFBVSxjQUFBLENBQUFOLENBQUEsQ0FBQXhELEdBQUEsR0FBQXdELENBQUE7QUFBQSxTQUFBbkUsYUFBQStELENBQUEsRUFBQUMsQ0FBQSxFQUFBQyxDQUFBLFdBQUFELENBQUEsSUFBQUYsaUJBQUEsQ0FBQUMsQ0FBQSxDQUFBVyxTQUFBLEVBQUFWLENBQUEsR0FBQUMsQ0FBQSxJQUFBSCxpQkFBQSxDQUFBQyxDQUFBLEVBQUFFLENBQUEsR0FBQU0sTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsaUJBQUFPLFFBQUEsU0FBQVAsQ0FBQTtBQUFBLFNBQUFVLGVBQUFSLENBQUEsUUFBQVUsQ0FBQSxHQUFBQyxZQUFBLENBQUFYLENBQUEsZ0NBQUFZLE9BQUEsQ0FBQUYsQ0FBQSxJQUFBQSxDQUFBLEdBQUFBLENBQUE7QUFBQSxTQUFBQyxhQUFBWCxDQUFBLEVBQUFELENBQUEsb0JBQUFhLE9BQUEsQ0FBQVosQ0FBQSxNQUFBQSxDQUFBLFNBQUFBLENBQUEsTUFBQUYsQ0FBQSxHQUFBRSxDQUFBLENBQUFhLE1BQUEsQ0FBQUMsV0FBQSxrQkFBQWhCLENBQUEsUUFBQVksQ0FBQSxHQUFBWixDQUFBLENBQUFpQixJQUFBLENBQUFmLENBQUEsRUFBQUQsQ0FBQSxnQ0FBQWEsT0FBQSxDQUFBRixDQUFBLFVBQUFBLENBQUEsWUFBQWQsU0FBQSx5RUFBQUcsQ0FBQSxHQUFBaUIsTUFBQSxHQUFBQyxNQUFBLEVBQUFqQixDQUFBO0FBQUEsU0FBQWtCLFdBQUFsQixDQUFBLEVBQUFFLENBQUEsRUFBQUosQ0FBQSxXQUFBSSxDQUFBLEdBQUFpQixlQUFBLENBQUFqQixDQUFBLEdBQUFrQiwwQkFBQSxDQUFBcEIsQ0FBQSxFQUFBcUIseUJBQUEsS0FBQUMsT0FBQSxDQUFBQyxTQUFBLENBQUFyQixDQUFBLEVBQUFKLENBQUEsUUFBQXFCLGVBQUEsQ0FBQW5CLENBQUEsRUFBQXdCLFdBQUEsSUFBQXRCLENBQUEsQ0FBQXVCLEtBQUEsQ0FBQXpCLENBQUEsRUFBQUYsQ0FBQTtBQUFBLFNBQUFzQiwyQkFBQXBCLENBQUEsRUFBQUYsQ0FBQSxRQUFBQSxDQUFBLGlCQUFBYyxPQUFBLENBQUFkLENBQUEsMEJBQUFBLENBQUEsVUFBQUEsQ0FBQSxpQkFBQUEsQ0FBQSxZQUFBRixTQUFBLHFFQUFBOEIsc0JBQUEsQ0FBQTFCLENBQUE7QUFBQSxTQUFBMEIsdUJBQUE1QixDQUFBLG1CQUFBQSxDQUFBLFlBQUE2QixjQUFBLHNFQUFBN0IsQ0FBQTtBQUFBLFNBQUF1QiwwQkFBQSxjQUFBckIsQ0FBQSxJQUFBNEIsT0FBQSxDQUFBbkIsU0FBQSxDQUFBb0IsT0FBQSxDQUFBZCxJQUFBLENBQUFPLE9BQUEsQ0FBQUMsU0FBQSxDQUFBSyxPQUFBLGlDQUFBNUIsQ0FBQSxhQUFBcUIseUJBQUEsWUFBQUEsMEJBQUEsYUFBQXJCLENBQUE7QUFBQSxTQUFBbUIsZ0JBQUFuQixDQUFBLFdBQUFtQixlQUFBLEdBQUFiLE1BQUEsQ0FBQXdCLGNBQUEsR0FBQXhCLE1BQUEsQ0FBQXlCLGNBQUEsQ0FBQUMsSUFBQSxlQUFBaEMsQ0FBQSxXQUFBQSxDQUFBLENBQUFpQyxTQUFBLElBQUEzQixNQUFBLENBQUF5QixjQUFBLENBQUEvQixDQUFBLE1BQUFtQixlQUFBLENBQUFuQixDQUFBO0FBQUEsU0FBQWtDLFVBQUFsQyxDQUFBLEVBQUFGLENBQUEsNkJBQUFBLENBQUEsYUFBQUEsQ0FBQSxZQUFBRixTQUFBLHdEQUFBSSxDQUFBLENBQUFTLFNBQUEsR0FBQUgsTUFBQSxDQUFBNkIsTUFBQSxDQUFBckMsQ0FBQSxJQUFBQSxDQUFBLENBQUFXLFNBQUEsSUFBQWUsV0FBQSxJQUFBN0UsS0FBQSxFQUFBcUQsQ0FBQSxFQUFBSyxRQUFBLE1BQUFELFlBQUEsV0FBQUUsTUFBQSxDQUFBQyxjQUFBLENBQUFQLENBQUEsaUJBQUFLLFFBQUEsU0FBQVAsQ0FBQSxJQUFBc0MsZUFBQSxDQUFBcEMsQ0FBQSxFQUFBRixDQUFBO0FBQUEsU0FBQXNDLGdCQUFBcEMsQ0FBQSxFQUFBRixDQUFBLFdBQUFzQyxlQUFBLEdBQUE5QixNQUFBLENBQUF3QixjQUFBLEdBQUF4QixNQUFBLENBQUF3QixjQUFBLENBQUFFLElBQUEsZUFBQWhDLENBQUEsRUFBQUYsQ0FBQSxXQUFBRSxDQUFBLENBQUFpQyxTQUFBLEdBQUFuQyxDQUFBLEVBQUFFLENBQUEsS0FBQW9DLGVBQUEsQ0FBQXBDLENBQUEsRUFBQUYsQ0FBQTtBQUUxQyxJQUFNdUMsV0FBVyxHQUFHLENBQUMsQ0FBQztBQUV0QkEsV0FBVyxDQUFDQyxjQUFjLEdBQUcsSUFBSUMsc0JBQWMsQ0FBRCxDQUFDO0FBQy9DRixXQUFXLENBQUNHLFFBQVEsR0FBR0Msa0JBQVEsQ0FBQ0MsR0FBRyxDQUFDLENBQUM7QUFBQyxJQUd6QkMsSUFBSSxHQUFBN0csT0FBQSxDQUFBNkcsSUFBQSwwQkFBQUMsU0FBQTtFQUVoQixTQUFBRCxLQUFZRSxJQUFJLEVBQ2hCO0lBQUEsSUFBQUMsS0FBQTtJQUFBOUcsZUFBQSxPQUFBMkcsSUFBQTtJQUNDSSxNQUFNLENBQUNDLFdBQVcsR0FBRyxJQUFJO0lBQ3pCRixLQUFBLEdBQUE1QixVQUFBLE9BQUF5QixJQUFBLEdBQU1FLElBQUk7SUFDVkMsS0FBQSxDQUFLRyxRQUFRLEdBQUl2RixPQUFPLENBQUMsWUFBWSxDQUFDO0lBQ3RDb0YsS0FBQSxDQUFLSSxNQUFNLEdBQU0sRUFBRTtJQUVuQkosS0FBQSxDQUFLSyxRQUFRLEdBQUksSUFBSUMsUUFBRyxDQUFELENBQUM7SUFDeEJOLEtBQUEsQ0FBS04sUUFBUSxHQUFJSCxXQUFXLENBQUNHLFFBQVE7SUFDckNNLEtBQUEsQ0FBS08sS0FBSyxHQUFPLEVBQUU7SUFDbkJQLEtBQUEsQ0FBS1EsUUFBUSxHQUFJUixLQUFBLENBQUtPLEtBQUs7SUFFM0JQLEtBQUEsQ0FBS0QsSUFBSSxDQUFDVSxVQUFVLEdBQUdsQixXQUFXLENBQUNDLGNBQWM7SUFFakRRLEtBQUEsQ0FBS0QsSUFBSSxDQUFDVyxHQUFHLEdBQUksQ0FBQztJQUNsQlYsS0FBQSxDQUFLRCxJQUFJLENBQUNZLEdBQUcsR0FBSSxDQUFDO0lBRWxCWCxLQUFBLENBQUtELElBQUksQ0FBQ2EsSUFBSSxHQUFHLENBQUM7SUFDbEJaLEtBQUEsQ0FBS0QsSUFBSSxDQUFDYyxJQUFJLEdBQUcsQ0FBQztJQUVsQmIsS0FBQSxDQUFLRCxJQUFJLENBQUNlLFNBQVMsR0FBUSxFQUFFO0lBQzdCZCxLQUFBLENBQUtELElBQUksQ0FBQ2dCLGNBQWMsR0FBRyxFQUFFO0lBRTdCZixLQUFBLENBQUtELElBQUksQ0FBQ2lCLFVBQVUsR0FBRyxLQUFLO0lBRTVCaEIsS0FBQSxDQUFLTixRQUFRLENBQUN1QixTQUFTLEdBQUcsSUFBSTtJQUU5QmpCLEtBQUEsQ0FBS04sUUFBUSxDQUFDd0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsR0FBRyxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDbkUsQ0FBQyxFQUFDb0UsQ0FBQyxFQUFHO01BQ3pDLElBQUdGLENBQUMsR0FBRyxDQUFDLEVBQ1I7UUFDQ3BCLEtBQUEsQ0FBS3VCLEdBQUcsVUFBTyxDQUFDLENBQUM7TUFDbEI7SUFDRCxDQUFDLENBQUM7SUFFRnZCLEtBQUEsQ0FBS04sUUFBUSxDQUFDd0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDbkUsQ0FBQyxFQUFDb0UsQ0FBQyxFQUFHO01BQzlDLElBQUdGLENBQUMsS0FBSyxDQUFDLENBQUMsRUFDWDtRQUNDcEIsS0FBQSxDQUFLd0IsV0FBVyxDQUFDQyxRQUFRLENBQUMsQ0FBQztNQUM1QjtJQUNELENBQUMsQ0FBQztJQUVGekIsS0FBQSxDQUFLTixRQUFRLENBQUN3QixJQUFJLENBQUNDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBQ0MsQ0FBQyxFQUFDQyxDQUFDLEVBQUNuRSxDQUFDLEVBQUNvRSxDQUFDLEVBQUc7TUFDNUMsSUFBR0YsQ0FBQyxHQUFHLENBQUMsRUFDUjtRQUNDcEIsS0FBQSxDQUFLRCxJQUFJLENBQUNlLFNBQVMsRUFBRTtNQUN0QjtJQUNELENBQUMsQ0FBQztJQUVGZCxLQUFBLENBQUtOLFFBQVEsQ0FBQ3dCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLEtBQUssRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ25FLENBQUMsRUFBQ29FLENBQUMsRUFBRztNQUMzQyxJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1FBQ0NwQixLQUFBLENBQUtELElBQUksQ0FBQ2UsU0FBUyxFQUFFO1FBRXJCLElBQUdkLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZSxTQUFTLEdBQUcsQ0FBQyxFQUMxQjtVQUNDZCxLQUFBLENBQUtELElBQUksQ0FBQ2UsU0FBUyxHQUFHLENBQUM7UUFDeEI7TUFDRDtJQUNELENBQUMsQ0FBQztJQUVGZCxLQUFBLENBQUtOLFFBQVEsQ0FBQ3dCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLFFBQVEsRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ25FLENBQUMsRUFBQ29FLENBQUMsRUFBRztNQUM5QyxJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1FBQ0NwQixLQUFBLENBQUtELElBQUksQ0FBQ2dCLGNBQWMsRUFBRTtNQUMzQjtJQUNELENBQUMsQ0FBQztJQUVGZixLQUFBLENBQUtOLFFBQVEsQ0FBQ3dCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLFVBQVUsRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ25FLENBQUMsRUFBQ29FLENBQUMsRUFBRztNQUNoRCxJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1FBQ0NwQixLQUFBLENBQUtELElBQUksQ0FBQ2dCLGNBQWMsRUFBRTtRQUUxQixJQUFHZixLQUFBLENBQUtELElBQUksQ0FBQ2dCLGNBQWMsR0FBRyxDQUFDLEVBQy9CO1VBQ0NmLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZ0IsY0FBYyxHQUFHLENBQUM7UUFDN0I7TUFDRDtJQUNELENBQUMsQ0FBQztJQUVGZixLQUFBLENBQUswQixXQUFXLEdBQUcsSUFBSUMsd0JBQVcsQ0FBRCxDQUFDO0lBQ2xDM0IsS0FBQSxDQUFLdUIsR0FBRyxHQUFXLElBQUlLLFFBQVEsQ0FBRCxDQUFDO0lBRS9CNUIsS0FBQSxDQUFLdUIsR0FBRyxVQUFPLENBQUMsQ0FBQztJQUVqQnZCLEtBQUEsQ0FBS0QsSUFBSSxDQUFDOEIsU0FBUyxHQUFJLElBQUlDLG9CQUFTLENBQUM7TUFDcENKLFdBQVcsRUFBRTFCLEtBQUEsQ0FBSzBCLFdBQVc7TUFDM0JILEdBQUcsRUFBUXZCLEtBQUEsQ0FBS3VCO0lBQ25CLENBQUMsQ0FBQztJQUFDLE9BQUF2QixLQUFBO0VBQ0o7RUFBQ1osU0FBQSxDQUFBUyxJQUFBLEVBQUFDLFNBQUE7RUFBQSxPQUFBN0csWUFBQSxDQUFBNEcsSUFBQTtJQUFBakcsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWtJLFVBQVVBLENBQUEsRUFDVjtNQUFBLElBQUFDLE1BQUE7TUFDQyxJQUFNUixXQUFXLEdBQUcsSUFBSVMsd0JBQVcsQ0FDbEMsSUFBSSxDQUFDQyxJQUFJLENBQUNDLE1BQU0sQ0FBQzlJLE9BQU8sRUFDdEIsSUFBSSxDQUFDa0ksR0FDUixDQUFDO01BRUQsSUFBSSxDQUFDQyxXQUFXLEdBQUdBLFdBQVc7TUFFOUIsSUFBTVksTUFBTSxHQUFHLElBQUlDLGNBQU0sQ0FBQztRQUN6QkMsTUFBTSxFQUFFLElBQUlDLGNBQU0sQ0FBQztVQUNsQkMsR0FBRyxFQUFFQyxTQUFTO1VBQ2RqQixXQUFXLEVBQUVBLFdBQVc7VUFDeEJFLFdBQVcsRUFBRSxJQUFJLENBQUNBLFdBQVc7VUFDN0JnQixLQUFLLEVBQUUsRUFBRTtVQUNUQyxNQUFNLEVBQUU7UUFDVCxDQUFDLENBQUM7UUFDRmxDLFVBQVUsRUFBRSxJQUFJbUMsdUJBQVUsQ0FBQztVQUMxQmxELFFBQVEsRUFBRSxJQUFJLENBQUNBLFFBQVE7VUFDdkJGLGNBQWMsRUFBRSxJQUFJLENBQUNPLElBQUksQ0FBQ1U7UUFDM0IsQ0FBQyxDQUFDO1FBQ0ZvQyxNQUFNLEVBQUVDO01BQ1QsQ0FBQyxDQUFDO01BRUYsSUFBSSxDQUFDekMsUUFBUSxDQUFDMEMsR0FBRyxDQUFDWCxNQUFNLENBQUM7TUFDekIsSUFBSSxDQUFDWixXQUFXLENBQUN3QixPQUFPLENBQUNELEdBQUcsQ0FBQ1gsTUFBTSxDQUFDRSxNQUFNLENBQUM7TUFFM0MsSUFBSSxDQUFDZCxXQUFXLENBQUN5QixTQUFTLEdBQUdiLE1BQU07TUFFbkMsSUFBSSxDQUFDMUMsUUFBUSxDQUFDd0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsR0FBRyxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDbkUsQ0FBQyxFQUFDb0UsQ0FBQyxFQUFHO1FBQ3pDLElBQUdGLENBQUMsR0FBRyxDQUFDLEVBQ1I7VUFDQ1ksTUFBSSxDQUFDa0IsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNiO01BQ0QsQ0FBQyxDQUFDO01BRUYsSUFBSSxDQUFDeEQsUUFBUSxDQUFDd0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsR0FBRyxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDbkUsQ0FBQyxFQUFDb0UsQ0FBQyxFQUFHO1FBQ3pDLElBQUdGLENBQUMsR0FBRyxDQUFDLEVBQ1I7VUFDQ1ksTUFBSSxDQUFDa0IsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNiO01BQ0QsQ0FBQyxDQUFDO01BRUYsSUFBSSxDQUFDeEQsUUFBUSxDQUFDd0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsR0FBRyxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDbkUsQ0FBQyxFQUFDb0UsQ0FBQyxFQUFHO1FBQ3pDLElBQUdGLENBQUMsR0FBRyxDQUFDLEVBQ1I7VUFDQ1ksTUFBSSxDQUFDa0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2Q7TUFDRCxDQUFDLENBQUM7TUFFRixJQUFJLENBQUNuRCxJQUFJLENBQUM4QixTQUFTLENBQUM5QixJQUFJLENBQUNvQixNQUFNLENBQUMsaUJBQWlCLEVBQUUsVUFBQ0MsQ0FBQyxFQUFHO1FBQ3ZELElBQUcsQ0FBQ0EsQ0FBQyxJQUFJWSxNQUFJLENBQUNSLFdBQVcsQ0FBQzJCLFFBQVEsQ0FBQ0MsT0FBTyxJQUFJLElBQUksRUFDbEQ7VUFDQztRQUNEO1FBRUFwQixNQUFJLENBQUNqQyxJQUFJLENBQUNpQixVQUFVLEdBQUcsS0FBSztRQUU1QixJQUFJcEQsQ0FBQyxHQUFJb0UsTUFBSSxDQUFDUixXQUFXLENBQUMyQixRQUFRLENBQUNFLFlBQVk7UUFDL0MsSUFBSUMsRUFBRSxHQUFHdEIsTUFBSSxDQUFDUixXQUFXLENBQUMyQixRQUFRLENBQUNDLE9BQU87UUFFMUMsSUFBR0UsRUFBRSxHQUFHMUYsQ0FBQyxFQUNUO1VBQUEsSUFBQTJGLElBQUEsR0FDVyxDQUFDM0YsQ0FBQyxFQUFFMEYsRUFBRSxDQUFDO1VBQWhCQSxFQUFFLEdBQUFDLElBQUE7VUFBRTNGLENBQUMsR0FBQTJGLElBQUE7UUFDUDtRQUVBLE9BQU0zRixDQUFDLElBQUcwRixFQUFFLEVBQUUxRixDQUFDLEVBQUUsRUFDakI7VUFDQyxJQUFJNEYsQ0FBQyxHQUFJeEIsTUFBSSxDQUFDUixXQUFXLENBQUMyQixRQUFRLENBQUNNLFlBQVk7VUFDL0MsSUFBSUMsRUFBRSxHQUFHMUIsTUFBSSxDQUFDUixXQUFXLENBQUMyQixRQUFRLENBQUNRLE9BQU87VUFDMUMsSUFBR0QsRUFBRSxHQUFHRixDQUFDLEVBQ1Q7WUFBQSxJQUFBSSxLQUFBLEdBQ1csQ0FBQ0osQ0FBQyxFQUFFRSxFQUFFLENBQUM7WUFBaEJBLEVBQUUsR0FBQUUsS0FBQTtZQUFFSixDQUFDLEdBQUFJLEtBQUE7VUFDUDtVQUNBLE9BQU1KLENBQUMsSUFBSUUsRUFBRSxFQUFFRixDQUFDLEVBQUUsRUFDbEI7WUFDQ3hCLE1BQUksQ0FBQ1QsR0FBRyxDQUFDc0MsT0FBTyxDQUFDakcsQ0FBQyxFQUFFNEYsQ0FBQyxFQUFFcEMsQ0FBQyxDQUFDO1VBQzFCO1FBQ0Q7UUFFQVksTUFBSSxDQUFDVCxHQUFHLENBQUNzQyxPQUFPLENBQ2Y3QixNQUFJLENBQUNSLFdBQVcsQ0FBQzJCLFFBQVEsQ0FBQ0MsT0FBTyxFQUMvQnBCLE1BQUksQ0FBQ1IsV0FBVyxDQUFDMkIsUUFBUSxDQUFDUSxPQUFPLEVBQ2pDdkMsQ0FDSCxDQUFDO1FBRURZLE1BQUksQ0FBQ1IsV0FBVyxDQUFDc0MsTUFBTSxDQUFDLENBQUM7UUFDekI5QixNQUFJLENBQUNSLFdBQVcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7TUFDNUIsQ0FBQyxDQUFDO01BRUYsSUFBSSxDQUFDRCxXQUFXLENBQUMyQixRQUFRLENBQUNoQyxNQUFNLENBQUMsVUFBQ0MsQ0FBQyxFQUFDQyxDQUFDLEVBQUNuRSxDQUFDLEVBQUNvRSxDQUFDLEVBQUN5QyxDQUFDLEVBQUc7UUFDN0MsSUFBRy9CLE1BQUksQ0FBQ1IsV0FBVyxDQUFDMkIsUUFBUSxDQUFDYSxNQUFNLElBQUksSUFBSSxFQUMzQztVQUNDaEMsTUFBSSxDQUFDakMsSUFBSSxDQUFDaUIsVUFBVSxHQUFHLEtBQUs7VUFDNUI7UUFDRDtRQUVBZ0IsTUFBSSxDQUFDakMsSUFBSSxDQUFDOEIsU0FBUyxDQUFDb0MsTUFBTSxDQUFDakMsTUFBSSxDQUFDUixXQUFXLENBQUMyQixRQUFRLENBQUM7UUFFckRuQixNQUFJLENBQUNqQyxJQUFJLENBQUNpQixVQUFVLEdBQUcsSUFBSTtRQUUzQmdCLE1BQUksQ0FBQ1IsV0FBVyxDQUFDc0MsTUFBTSxDQUFDLENBQUM7TUFDMUIsQ0FBQyxFQUFDO1FBQUNJLElBQUksRUFBQztNQUFDLENBQUMsQ0FBQztNQUVYLElBQUksQ0FBQ25FLElBQUksQ0FBQ2lCLFVBQVUsR0FBRyxJQUFJO01BRTNCZixNQUFNLENBQUNrRSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUU7UUFBQSxPQUFNbkMsTUFBSSxDQUFDOEIsTUFBTSxDQUFDLENBQUM7TUFBQSxFQUFDO01BRXRELElBQUlNLEtBQUssR0FBRyxDQUFDO01BQ2IsSUFBSUMsS0FBSyxHQUFHLENBQUM7TUFFYixJQUFJQyxRQUFRLEdBQUcsRUFBRTtNQUNqQixJQUFJQyxRQUFRLEdBQUcsRUFBRTtNQUVqQixJQUFJQyxVQUFVLEdBQUcsQ0FBQztNQUVsQixJQUFNQyxRQUFRLEdBQUcsU0FBWEEsUUFBUUEsQ0FBSUMsR0FBRyxFQUFLO1FBQ3pCQSxHQUFHLEdBQUdBLEdBQUcsR0FBRyxJQUFJO1FBRWhCLElBQU1DLEtBQUssR0FBR0QsR0FBRyxHQUFHTCxLQUFLO1FBRXpCLElBQUdyQyxNQUFJLENBQUNqQyxJQUFJLENBQUNnQixjQUFjLElBQUksQ0FBQyxFQUNoQztVQUNDd0QsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDO1VBQ2Q7UUFDRDtRQUVBLElBQUdJLEtBQUssR0FBRyxDQUFDLElBQUUzQyxNQUFJLENBQUNqQyxJQUFJLENBQUNnQixjQUFjLEdBQUUsRUFBRSxJQUFJaUIsTUFBSSxDQUFDakMsSUFBSSxDQUFDZ0IsY0FBYyxHQUFDLEVBQUUsQ0FBRSxDQUFDLEVBQzVFO1VBQ0M7UUFDRDtRQUVBc0QsS0FBSyxHQUFHSyxHQUFHO1FBRVgxQyxNQUFJLENBQUN0QyxRQUFRLENBQUNrRixNQUFNLENBQUMsQ0FBQztRQUV0QnBILE1BQU0sQ0FBQ3FILE1BQU0sQ0FBQzdDLE1BQUksQ0FBQzNCLFFBQVEsQ0FBQ3lFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ3ZELEdBQUcsQ0FBQyxVQUFDdkUsQ0FBQyxFQUFHO1VBQzdDQSxDQUFDLENBQUN5SCxRQUFRLENBQUMsQ0FBQztRQUNiLENBQUMsQ0FBQzs7UUFFRjs7UUFFQTtRQUNBO1FBQ0E7UUFDQTs7UUFFQXpDLE1BQUksQ0FBQ2pDLElBQUksQ0FBQ2dGLElBQUksR0FBSSxDQUFDLEdBQUdKLEtBQU07UUFFNUJKLFFBQVEsQ0FBQ1MsSUFBSSxDQUFDaEQsTUFBSSxDQUFDakMsSUFBSSxDQUFDZ0YsSUFBSSxDQUFDO1FBRTdCLE9BQU1SLFFBQVEsQ0FBQ3BILE1BQU0sR0FBR3FILFVBQVUsRUFDbEM7VUFDQ0QsUUFBUSxDQUFDVSxLQUFLLENBQUMsQ0FBQztRQUNqQjs7UUFFQTtNQUNELENBQUM7TUFFRCxJQUFNTCxPQUFNLEdBQUcsU0FBVEEsTUFBTUEsQ0FBSUYsR0FBRyxFQUFJO1FBQ3RCekUsTUFBTSxDQUFDaUYscUJBQXFCLENBQUNOLE9BQU0sQ0FBQztRQUNwQzVDLE1BQUksQ0FBQ1IsV0FBVyxDQUFDMkQsSUFBSSxDQUFDLENBQUM7UUFFdkIsSUFBTVIsS0FBSyxHQUFHRCxHQUFHLEdBQUdOLEtBQUs7UUFDekJBLEtBQUssR0FBR00sR0FBRztRQUVYMUMsTUFBSSxDQUFDakMsSUFBSSxDQUFDVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUdpRSxLQUFLLEVBQUVTLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFekNwRCxNQUFJLENBQUNqQyxJQUFJLENBQUNhLElBQUksR0FBR3pDLE1BQU0sQ0FBQzJFLGNBQU0sQ0FBQ3VDLENBQUMsQ0FBQyxDQUFDRCxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzVDcEQsTUFBSSxDQUFDakMsSUFBSSxDQUFDYyxJQUFJLEdBQUcxQyxNQUFNLENBQUMyRSxjQUFNLENBQUN3QyxDQUFDLENBQUMsQ0FBQ0YsT0FBTyxDQUFDLENBQUMsQ0FBQztNQUM3QyxDQUFDO01BRUQsSUFBSSxDQUFDNUQsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxHQUFHTCxRQUFRLENBQUNrTSxJQUFJLENBQUNDLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQztNQUN2RSxJQUFJLENBQUMzQixNQUFNLENBQUMsQ0FBQztNQUViYyxPQUFNLENBQUNjLFdBQVcsQ0FBQ2hCLEdBQUcsQ0FBQyxDQUFDLENBQUM7TUFFekJpQixXQUFXLENBQUMsWUFBSTtRQUNmbEIsUUFBUSxDQUFDaUIsV0FBVyxDQUFDaEIsR0FBRyxDQUFDLENBQUMsQ0FBQztNQUM1QixDQUFDLEVBQUUsQ0FBQyxDQUFDO01BRUxpQixXQUFXLENBQUMsWUFBSTtRQUNmck0sUUFBUSxDQUFDSCxLQUFLLE1BQUF5TSxNQUFBLENBQU03TSxjQUFNLENBQUNJLEtBQUssT0FBQXlNLE1BQUEsQ0FBSTVELE1BQUksQ0FBQ2pDLElBQUksQ0FBQ1csR0FBRyxTQUFNO01BQ3hELENBQUMsRUFBRSxHQUFHLEdBQUMsQ0FBQyxDQUFDO01BRVRpRixXQUFXLENBQUMsWUFBSTtRQUNmLElBQU1oRixHQUFHLEdBQUc0RCxRQUFRLENBQUNzQixNQUFNLENBQUMsVUFBQ2pKLENBQUMsRUFBQ2tKLENBQUM7VUFBQSxPQUFHbEosQ0FBQyxHQUFDa0osQ0FBQztRQUFBLEdBQUUsQ0FBQyxDQUFDLEdBQUd2QixRQUFRLENBQUNwSCxNQUFNO1FBQzVENkUsTUFBSSxDQUFDakMsSUFBSSxDQUFDWSxHQUFHLEdBQUdBLEdBQUcsQ0FBQ3lFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQ1csUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7TUFDaEQsQ0FBQyxFQUFFLEdBQUcsR0FBQyxDQUFDLENBQUM7SUFDVjtFQUFDO0lBQUFuTSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBaUssTUFBTUEsQ0FBQ3VCLENBQUMsRUFBRUMsQ0FBQyxFQUNYO01BQ0MsSUFBSSxDQUFDdkYsSUFBSSxDQUFDMkMsS0FBSyxHQUFJLElBQUksQ0FBQ1IsSUFBSSxDQUFDQyxNQUFNLENBQUM5SSxPQUFPLENBQUNxSixLQUFLLEdBQUsyQyxDQUFDLElBQUkvTCxRQUFRLENBQUNrTSxJQUFJLENBQUNRLFdBQVc7TUFDcEYsSUFBSSxDQUFDakcsSUFBSSxDQUFDNEMsTUFBTSxHQUFHLElBQUksQ0FBQ1QsSUFBSSxDQUFDQyxNQUFNLENBQUM5SSxPQUFPLENBQUNzSixNQUFNLEdBQUkyQyxDQUFDLElBQUloTSxRQUFRLENBQUNrTSxJQUFJLENBQUNDLFlBQVk7TUFFckYsSUFBSSxDQUFDMUYsSUFBSSxDQUFDa0csTUFBTSxHQUFJQyxJQUFJLENBQUNDLEtBQUssQ0FDN0IsQ0FBQ2QsQ0FBQyxJQUFJL0wsUUFBUSxDQUFDa00sSUFBSSxDQUFDUSxXQUFXLElBQUssSUFBSSxDQUFDeEUsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FDM0QsQ0FBQztNQUVELElBQUksQ0FBQ29HLElBQUksQ0FBQ3FHLE9BQU8sR0FBR0YsSUFBSSxDQUFDQyxLQUFLLENBQzdCLENBQUNiLENBQUMsSUFBSWhNLFFBQVEsQ0FBQ2tNLElBQUksQ0FBQ0MsWUFBWSxJQUFJLElBQUksQ0FBQ2pFLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQzNELENBQUM7TUFFRCxJQUFNME0sUUFBUSxHQUFHLElBQUksQ0FBQzdFLFdBQVcsQ0FBQytELElBQUksQ0FBQzdMLFdBQVc7TUFDbEQsSUFBSSxDQUFDOEgsV0FBVyxDQUFDK0QsSUFBSSxDQUFDN0wsV0FBVyxHQUFHSixRQUFRLENBQUNrTSxJQUFJLENBQUNDLFlBQVksR0FBRyxJQUFJO01BRXJFLElBQUksQ0FBQ2pFLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsSUFBSSxJQUFJLENBQUM2SCxXQUFXLENBQUMrRCxJQUFJLENBQUM3TCxXQUFXLEdBQUcyTSxRQUFRO01BRS9FLElBQUksQ0FBQzdFLFdBQVcsQ0FBQ3NDLE1BQU0sQ0FBQyxDQUFDO0lBQzFCO0VBQUM7SUFBQWxLLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUF5TSxNQUFNQSxDQUFDQyxLQUFLLEVBQ1o7TUFDQyxJQUFJNUIsS0FBSyxHQUFHNEIsS0FBSyxDQUFDQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUNoQ0QsS0FBSyxDQUFDQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUN2QjtNQUVELElBQUksQ0FBQ3RELElBQUksQ0FBQ3lCLEtBQUssQ0FBQztJQUNqQjtFQUFDO0lBQUEvSyxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBcUosSUFBSUEsQ0FBQ3lCLEtBQUssRUFDVjtNQUNDLElBQU04QixHQUFHLEdBQUcsSUFBSSxDQUFDakYsV0FBVyxDQUFDK0QsSUFBSSxDQUFDN0wsV0FBVyxHQUFHLEVBQUU7TUFDbEQsSUFBTWdOLEdBQUcsR0FBRyxJQUFJLENBQUNsRixXQUFXLENBQUMrRCxJQUFJLENBQUM3TCxXQUFXLEdBQUcsTUFBTTtNQUN0RCxJQUFNaU4sSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUNuRixXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTO01BRW5ELElBQUlBLFNBQVMsR0FBRyxJQUFJLENBQUM2SCxXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLEdBQUlnTCxLQUFLLEdBQUdnQyxJQUFLO01BRWhFLElBQUdoTixTQUFTLEdBQUcrTSxHQUFHLEVBQ2xCO1FBQ0MvTSxTQUFTLEdBQUcrTSxHQUFHO01BQ2hCLENBQUMsTUFDSSxJQUFHL00sU0FBUyxHQUFHOE0sR0FBRyxFQUN2QjtRQUNDOU0sU0FBUyxHQUFHOE0sR0FBRztNQUNoQjtNQUVBLElBQUcsSUFBSSxDQUFDakYsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxLQUFLQSxTQUFTLEVBQ2hEO1FBQ0MsSUFBSSxDQUFDNkgsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxHQUFHQSxTQUFTO1FBQzNDLElBQUksQ0FBQ21LLE1BQU0sQ0FBQyxDQUFDO01BQ2Q7SUFDRDtFQUFDO0FBQUEsRUEvVXdCOEMsVUFBUTs7O0NDMUJsQztBQUFBO0FBQUE7QUFBQTs7OztBQ0FBLElBQUFDLE9BQUEsR0FBQWpNLE9BQUE7QUFDQSxJQUFBbUIsS0FBQSxHQUFBbkIsT0FBQTtBQUVBLElBQUdrTSxLQUFLLEtBQUtyRSxTQUFTLEVBQ3RCO0VBQ0NuSixRQUFRLENBQUM2SyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxZQUFNO0lBQ25ELElBQU00QyxJQUFJLEdBQUcsSUFBSWxILFVBQUksQ0FBQyxDQUFDO0lBRXZCbUgsY0FBTSxDQUFDQyxNQUFNLENBQUNGLElBQUksQ0FBQztJQUVuQkEsSUFBSSxDQUFDRyxNQUFNLENBQUM1TixRQUFRLENBQUNrTSxJQUFJLENBQUM7RUFDM0IsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxNQUVEO0VBQ0M7QUFBQTs7Ozs7Ozs7Ozs7QUNmRCxJQUFBMkIsWUFBQSxHQUFBdk0sT0FBQTtBQUEwQyxTQUFBMUIsZ0JBQUEwRCxDQUFBLEVBQUFDLENBQUEsVUFBQUQsQ0FBQSxZQUFBQyxDQUFBLGFBQUFDLFNBQUE7QUFBQSxTQUFBQyxrQkFBQUMsQ0FBQSxFQUFBQyxDQUFBLGFBQUFDLENBQUEsTUFBQUEsQ0FBQSxHQUFBRCxDQUFBLENBQUFFLE1BQUEsRUFBQUQsQ0FBQSxVQUFBRSxDQUFBLEdBQUFILENBQUEsQ0FBQUMsQ0FBQSxHQUFBRSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQVUsY0FBQSxDQUFBTixDQUFBLENBQUF4RCxHQUFBLEdBQUF3RCxDQUFBO0FBQUEsU0FBQW5FLGFBQUErRCxDQUFBLEVBQUFDLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFGLGlCQUFBLENBQUFDLENBQUEsQ0FBQVcsU0FBQSxFQUFBVixDQUFBLEdBQUFDLENBQUEsSUFBQUgsaUJBQUEsQ0FBQUMsQ0FBQSxFQUFBRSxDQUFBLEdBQUFNLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLGlCQUFBTyxRQUFBLFNBQUFQLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLFNBQUFrQixXQUFBbEIsQ0FBQSxFQUFBRSxDQUFBLEVBQUFKLENBQUEsV0FBQUksQ0FBQSxHQUFBaUIsZUFBQSxDQUFBakIsQ0FBQSxHQUFBa0IsMEJBQUEsQ0FBQXBCLENBQUEsRUFBQXFCLHlCQUFBLEtBQUFDLE9BQUEsQ0FBQUMsU0FBQSxDQUFBckIsQ0FBQSxFQUFBSixDQUFBLFFBQUFxQixlQUFBLENBQUFuQixDQUFBLEVBQUF3QixXQUFBLElBQUF0QixDQUFBLENBQUF1QixLQUFBLENBQUF6QixDQUFBLEVBQUFGLENBQUE7QUFBQSxTQUFBc0IsMkJBQUFwQixDQUFBLEVBQUFGLENBQUEsUUFBQUEsQ0FBQSxpQkFBQWMsT0FBQSxDQUFBZCxDQUFBLDBCQUFBQSxDQUFBLFVBQUFBLENBQUEsaUJBQUFBLENBQUEsWUFBQUYsU0FBQSxxRUFBQThCLHNCQUFBLENBQUExQixDQUFBO0FBQUEsU0FBQTBCLHVCQUFBNUIsQ0FBQSxtQkFBQUEsQ0FBQSxZQUFBNkIsY0FBQSxzRUFBQTdCLENBQUE7QUFBQSxTQUFBdUIsMEJBQUEsY0FBQXJCLENBQUEsSUFBQTRCLE9BQUEsQ0FBQW5CLFNBQUEsQ0FBQW9CLE9BQUEsQ0FBQWQsSUFBQSxDQUFBTyxPQUFBLENBQUFDLFNBQUEsQ0FBQUssT0FBQSxpQ0FBQTVCLENBQUEsYUFBQXFCLHlCQUFBLFlBQUFBLDBCQUFBLGFBQUFyQixDQUFBO0FBQUEsU0FBQW1CLGdCQUFBbkIsQ0FBQSxXQUFBbUIsZUFBQSxHQUFBYixNQUFBLENBQUF3QixjQUFBLEdBQUF4QixNQUFBLENBQUF5QixjQUFBLENBQUFDLElBQUEsZUFBQWhDLENBQUEsV0FBQUEsQ0FBQSxDQUFBaUMsU0FBQSxJQUFBM0IsTUFBQSxDQUFBeUIsY0FBQSxDQUFBL0IsQ0FBQSxNQUFBbUIsZUFBQSxDQUFBbkIsQ0FBQTtBQUFBLFNBQUFrQyxVQUFBbEMsQ0FBQSxFQUFBRixDQUFBLDZCQUFBQSxDQUFBLGFBQUFBLENBQUEsWUFBQUYsU0FBQSx3REFBQUksQ0FBQSxDQUFBUyxTQUFBLEdBQUFILE1BQUEsQ0FBQTZCLE1BQUEsQ0FBQXJDLENBQUEsSUFBQUEsQ0FBQSxDQUFBVyxTQUFBLElBQUFlLFdBQUEsSUFBQTdFLEtBQUEsRUFBQXFELENBQUEsRUFBQUssUUFBQSxNQUFBRCxZQUFBLFdBQUFFLE1BQUEsQ0FBQUMsY0FBQSxDQUFBUCxDQUFBLGlCQUFBSyxRQUFBLFNBQUFQLENBQUEsSUFBQXNDLGVBQUEsQ0FBQXBDLENBQUEsRUFBQUYsQ0FBQTtBQUFBLFNBQUFzQyxnQkFBQXBDLENBQUEsRUFBQUYsQ0FBQSxXQUFBc0MsZUFBQSxHQUFBOUIsTUFBQSxDQUFBd0IsY0FBQSxHQUFBeEIsTUFBQSxDQUFBd0IsY0FBQSxDQUFBRSxJQUFBLGVBQUFoQyxDQUFBLEVBQUFGLENBQUEsV0FBQUUsQ0FBQSxDQUFBaUMsU0FBQSxHQUFBbkMsQ0FBQSxFQUFBRSxDQUFBLEtBQUFvQyxlQUFBLENBQUFwQyxDQUFBLEVBQUFGLENBQUE7QUFBQSxJQUU3Qm9LLFNBQVMsR0FBQXBPLE9BQUEsQ0FBQW9PLFNBQUEsMEJBQUFDLFdBQUE7RUFBQSxTQUFBRCxVQUFBO0lBQUFsTyxlQUFBLE9BQUFrTyxTQUFBO0lBQUEsT0FBQWhKLFVBQUEsT0FBQWdKLFNBQUEsRUFBQUUsU0FBQTtFQUFBO0VBQUFsSSxTQUFBLENBQUFnSSxTQUFBLEVBQUFDLFdBQUE7RUFBQSxPQUFBcE8sWUFBQSxDQUFBbU8sU0FBQTtJQUFBeE4sR0FBQTtJQUFBQyxLQUFBLEVBRXJCLFNBQUEwTixNQUFNQSxDQUFDQyxVQUFVLEVBQ2pCO01BQ0MsT0FBTyxJQUFJLElBQUksQ0FBQzlJLFdBQVcsQ0FBQ2xCLE1BQU0sQ0FBQ2lLLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUVELFVBQVUsQ0FBQyxDQUFDO0lBQ2pFO0VBQUM7QUFBQSxFQUw2QkUsdUJBQVU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDRnpDLElBQUlDLE9BQU8sR0FBRyxDQUFDLENBQUM7QUFDaEIsSUFBSUMsT0FBTyxHQUFHLENBQUMsQ0FBQztBQUFDLElBRUpGLFVBQVUsR0FBQTFPLE9BQUEsQ0FBQTBPLFVBQUE7RUFFdEIsU0FBQUEsV0FBQSxFQUNBO0lBQUF4TyxlQUFBLE9BQUF3TyxVQUFBO0lBQ0MsSUFBSUYsVUFBVSxHQUFHLElBQUksQ0FBQzlJLFdBQVcsQ0FBQzhJLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLElBQUloTyxPQUFPLEdBQU0sSUFBSSxDQUFDa0YsV0FBVyxDQUFDbEYsT0FBTyxDQUFDLENBQUM7SUFFM0MsSUFBRyxDQUFDbU8sT0FBTyxDQUFDbk8sT0FBTyxDQUFDLEVBQ3BCO01BQ0NtTyxPQUFPLENBQUNuTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEI7SUFFQSxJQUFHLENBQUNvTyxPQUFPLENBQUNwTyxPQUFPLENBQUMsRUFDcEI7TUFDQ29PLE9BQU8sQ0FBQ3BPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QjtJQUVBLEtBQUksSUFBSXFPLElBQUksSUFBSUwsVUFBVSxFQUMxQjtNQUNDLElBQUlNLFNBQVMsR0FBR04sVUFBVSxDQUFDSyxJQUFJLENBQUM7TUFFaEMsSUFBR0YsT0FBTyxDQUFDbk8sT0FBTyxDQUFDLENBQUNxTyxJQUFJLENBQUMsSUFBSSxDQUFDQyxTQUFTLENBQUNuSyxTQUFTLEVBQ2pEO1FBQ0M7TUFDRDtNQUVBLElBQUcsT0FBTyxDQUFDb0ssSUFBSSxDQUFDN0osTUFBTSxDQUFDMkosSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDaEM7UUFDQ0YsT0FBTyxDQUFDbk8sT0FBTyxDQUFDLENBQUNxTyxJQUFJLENBQUMsR0FBR0MsU0FBUztNQUNuQztJQUVEO0lBRUEsS0FBSSxJQUFJRCxLQUFJLElBQUlMLFVBQVUsRUFDMUI7TUFDQyxJQUFJUSxRQUFRLEdBQUl2RixTQUFTO01BQ3pCLElBQUlxRixVQUFTLEdBQUdILE9BQU8sQ0FBQ25PLE9BQU8sQ0FBQyxDQUFDcU8sS0FBSSxDQUFDLElBQUlMLFVBQVUsQ0FBQ0ssS0FBSSxDQUFDO01BRTFELElBQUcsT0FBTyxDQUFDRSxJQUFJLENBQUM3SixNQUFNLENBQUMySixLQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNoQztRQUNDLElBQUdDLFVBQVMsQ0FBQ25LLFNBQVMsRUFDdEI7VUFDQyxJQUFHLENBQUNpSyxPQUFPLENBQUNwTyxPQUFPLENBQUMsQ0FBQ3FPLEtBQUksQ0FBQyxFQUMxQjtZQUNDRCxPQUFPLENBQUNwTyxPQUFPLENBQUMsQ0FBQ3FPLEtBQUksQ0FBQyxHQUFHLElBQUlDLFVBQVMsQ0FBRCxDQUFDO1VBQ3ZDO1FBQ0QsQ0FBQyxNQUVEO1VBQ0NGLE9BQU8sQ0FBQ3BPLE9BQU8sQ0FBQyxDQUFDcU8sS0FBSSxDQUFDLEdBQUdDLFVBQVM7UUFDbkM7UUFFQUUsUUFBUSxHQUFHSixPQUFPLENBQUNwTyxPQUFPLENBQUMsQ0FBQ3FPLEtBQUksQ0FBQztNQUNsQyxDQUFDLE1BRUQ7UUFDQyxJQUFHQyxVQUFTLENBQUNuSyxTQUFTLEVBQ3RCO1VBQ0NxSyxRQUFRLEdBQUcsSUFBSUYsVUFBUyxDQUFELENBQUM7UUFDekIsQ0FBQyxNQUVEO1VBQ0NFLFFBQVEsR0FBR0YsVUFBUztRQUNyQjtNQUNEO01BRUF0SyxNQUFNLENBQUNDLGNBQWMsQ0FBQyxJQUFJLEVBQUVvSyxLQUFJLEVBQUU7UUFDakN4SyxVQUFVLEVBQUUsS0FBSztRQUNqQkUsUUFBUSxFQUFJLEtBQUs7UUFDakIxRCxLQUFLLEVBQU9tTztNQUNiLENBQUMsQ0FBQztJQUNIO0VBRUQ7RUFBQyxPQUFBL08sWUFBQSxDQUFBeU8sVUFBQTtJQUFBOU4sR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBTzJOLFVBQVVBLENBQUEsRUFDakI7TUFDQyxPQUFPLENBQUMsQ0FBQztJQUNWO0VBQUM7SUFBQTVOLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQU9MLE9BQU9BLENBQUEsRUFDZDtNQUNDLE9BQU8sR0FBRztJQUNYO0VBQUM7SUFBQUksR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBTzBOLE1BQU1BLENBQUNDLFdBQVUsRUFDeEI7TUFBQSxJQUQwQmhPLFFBQU8sR0FBQThOLFNBQUEsQ0FBQW5LLE1BQUEsUUFBQW1LLFNBQUEsUUFBQTdFLFNBQUEsR0FBQTZFLFNBQUEsTUFBRyxHQUFHO01BRXRDLElBQUcsRUFBRSxJQUFJLENBQUMzSixTQUFTLFlBQVkrSixVQUFVLElBQUksSUFBSSxLQUFLQSxVQUFVLENBQUMsRUFDakU7UUFDQyxNQUFNLElBQUlPLEtBQUssOExBV2pCLENBQUM7TUFDQTtNQUVBLElBQUlDLGtCQUFrQixHQUFHLElBQUksQ0FBQ1YsVUFBVSxDQUFDLENBQUM7TUFFMUMsOEJBQUF4SCxLQUFBO1FBQUEsU0FBQW1JLE9BQUE7VUFBQWpQLGVBQUEsT0FBQWlQLE1BQUE7VUFBQSxPQUFBL0osVUFBQSxPQUFBK0osTUFBQSxFQUFBYixTQUFBO1FBQUE7UUFBQWxJLFNBQUEsQ0FBQStJLE1BQUEsRUFBQW5JLEtBQUE7UUFBQSxPQUFBL0csWUFBQSxDQUFBa1AsTUFBQTtVQUFBdk8sR0FBQTtVQUFBQyxLQUFBLEVBQ0MsU0FBTzJOLFVBQVVBLENBQUEsRUFDakI7WUFDQyxPQUFPaEssTUFBTSxDQUFDaUssTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFUyxrQkFBa0IsRUFBRVYsV0FBVSxDQUFDO1VBQ3pEO1FBQUM7VUFBQTVOLEdBQUE7VUFBQUMsS0FBQSxFQUNELFNBQU9MLE9BQU9BLENBQUEsRUFDZDtZQUNDLE9BQU9BLFFBQU87VUFDZjtRQUFDO01BQUEsRUFSbUIsSUFBSTtJQVUxQjtFQUFDO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7SUN0SEk0TyxNQUFNLEdBQUFwUCxPQUFBLENBQUFvUCxNQUFBLGdCQUFBblAsWUFBQSxDQUVYLFNBQUFtUCxPQUFBLEVBQ0E7RUFBQWxQLGVBQUEsT0FBQWtQLE1BQUE7RUFDQyxJQUFJLENBQUNQLElBQUksR0FBRyxNQUFNLEdBQUczQixJQUFJLENBQUNtQyxNQUFNLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBR0YsSUFBSUMsTUFBTSxHQUFBdFAsT0FBQSxDQUFBc1AsTUFBQSxHQUFHLElBQUlGLE1BQU0sQ0FBRCxDQUFDOzs7Ozs7Ozs7O0FDUnZCLElBQUFHLFNBQUEsR0FBQTNOLE9BQUE7QUFBbUQsU0FBQWtELFFBQUFWLENBQUEsc0NBQUFVLE9BQUEsd0JBQUFDLE1BQUEsdUJBQUFBLE1BQUEsQ0FBQXlLLFFBQUEsYUFBQXBMLENBQUEsa0JBQUFBLENBQUEsZ0JBQUFBLENBQUEsV0FBQUEsQ0FBQSx5QkFBQVcsTUFBQSxJQUFBWCxDQUFBLENBQUFzQixXQUFBLEtBQUFYLE1BQUEsSUFBQVgsQ0FBQSxLQUFBVyxNQUFBLENBQUFKLFNBQUEscUJBQUFQLENBQUEsS0FBQVUsT0FBQSxDQUFBVixDQUFBO0FBQUEsU0FBQWxFLGdCQUFBMEQsQ0FBQSxFQUFBQyxDQUFBLFVBQUFELENBQUEsWUFBQUMsQ0FBQSxhQUFBQyxTQUFBO0FBQUEsU0FBQUMsa0JBQUFDLENBQUEsRUFBQUMsQ0FBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUQsQ0FBQSxDQUFBRSxNQUFBLEVBQUFELENBQUEsVUFBQUUsQ0FBQSxHQUFBSCxDQUFBLENBQUFDLENBQUEsR0FBQUUsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsQ0FBQUMsVUFBQSxRQUFBRCxDQUFBLENBQUFFLFlBQUEsa0JBQUFGLENBQUEsS0FBQUEsQ0FBQSxDQUFBRyxRQUFBLFFBQUFDLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLEVBQUFVLGNBQUEsQ0FBQU4sQ0FBQSxDQUFBeEQsR0FBQSxHQUFBd0QsQ0FBQTtBQUFBLFNBQUFuRSxhQUFBK0QsQ0FBQSxFQUFBQyxDQUFBLEVBQUFDLENBQUEsV0FBQUQsQ0FBQSxJQUFBRixpQkFBQSxDQUFBQyxDQUFBLENBQUFXLFNBQUEsRUFBQVYsQ0FBQSxHQUFBQyxDQUFBLElBQUFILGlCQUFBLENBQUFDLENBQUEsRUFBQUUsQ0FBQSxHQUFBTSxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxpQkFBQU8sUUFBQSxTQUFBUCxDQUFBO0FBQUEsU0FBQXlMLGdCQUFBekwsQ0FBQSxFQUFBQyxDQUFBLEVBQUFDLENBQUEsWUFBQUQsQ0FBQSxHQUFBUyxjQUFBLENBQUFULENBQUEsTUFBQUQsQ0FBQSxHQUFBUSxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxFQUFBQyxDQUFBLElBQUFwRCxLQUFBLEVBQUFxRCxDQUFBLEVBQUFHLFVBQUEsTUFBQUMsWUFBQSxNQUFBQyxRQUFBLFVBQUFQLENBQUEsQ0FBQUMsQ0FBQSxJQUFBQyxDQUFBLEVBQUFGLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLElBRXJDMEYsVUFBVSxHQUFBNUosT0FBQSxDQUFBNEosVUFBQTtFQUt2QixTQUFBQSxXQUFBVyxJQUFBLEVBQ0E7SUFBQSxJQUFBdkQsS0FBQTtJQUFBLElBRGFOLFFBQVEsR0FBQTZELElBQUEsQ0FBUjdELFFBQVE7TUFBRUYsY0FBYyxHQUFBK0QsSUFBQSxDQUFkL0QsY0FBYztJQUFBdEcsZUFBQSxPQUFBMEosVUFBQTtJQUFBNkYsZUFBQSxtQkFIMUJDLGtCQUFRLENBQUNDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUFBRixlQUFBLGVBQ3pCQyxrQkFBUSxDQUFDQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFJbkNqSixRQUFRLENBQUN3QixJQUFJLENBQUNDLE1BQU0sQ0FBQyxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ25FLENBQUMsRUFBQ29FLENBQUMsRUFBRztNQUMvQixJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1FBQ0NwQixLQUFJLENBQUM0SSxRQUFRLENBQUN2SCxDQUFDLEVBQUNELENBQUMsRUFBQ2xFLENBQUMsQ0FBQ21FLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCO01BQ0Q7TUFFQSxJQUFHRCxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQ1g7UUFDQ3BCLEtBQUksQ0FBQzZJLFVBQVUsQ0FBQ3hILENBQUMsRUFBQ0QsQ0FBQyxFQUFDbEUsQ0FBQyxDQUFDbUUsQ0FBQyxDQUFDLENBQUM7UUFDekI7TUFDRDtJQUVELENBQUMsQ0FBQztJQUVGN0IsY0FBYyxDQUFDTyxJQUFJLENBQUNvQixNQUFNLENBQUMsR0FBRyxFQUFFLFVBQUNDLENBQUMsRUFBSztNQUN0Q3BCLEtBQUksQ0FBQzhJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRzFILENBQUMsR0FBRyxFQUFFO0lBQ3RCLENBQUMsQ0FBQztJQUVGNUIsY0FBYyxDQUFDTyxJQUFJLENBQUNvQixNQUFNLENBQUMsR0FBRyxFQUFFLFVBQUNDLENBQUMsRUFBSztNQUN0Q3BCLEtBQUksQ0FBQzhJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRzFILENBQUMsR0FBRyxFQUFFO0lBQ3RCLENBQUMsQ0FBQztFQUNIO0VBQUMsT0FBQW5JLFlBQUEsQ0FBQTJKLFVBQUE7SUFBQWhKLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUErTyxRQUFRQSxDQUFDaFAsR0FBRyxFQUFFQyxLQUFLLEVBQUVrUCxJQUFJLEVBQ3pCO01BQ0MsSUFBRyxTQUFTLENBQUNoQixJQUFJLENBQUNuTyxHQUFHLENBQUMsRUFDdEI7UUFDQyxJQUFJLENBQUNvUCxRQUFRLENBQUNwUCxHQUFHLENBQUMsR0FBRyxJQUFJO1FBQ3pCO01BQ0Q7TUFFQSxRQUFPQSxHQUFHO1FBRVQsS0FBSyxZQUFZO1VBQ2hCLElBQUksQ0FBQ2tQLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1VBQ2hCO1FBRUQsS0FBSyxXQUFXO1VBQ2YsSUFBSSxDQUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztVQUNoQjtRQUVELEtBQUssV0FBVztVQUNmLElBQUksQ0FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztVQUNqQjtRQUVELEtBQUssU0FBUztVQUNiLElBQUksQ0FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztVQUNqQjtNQUNGO0lBQ0Q7RUFBQztJQUFBbFAsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWdQLFVBQVVBLENBQUNqUCxHQUFHLEVBQUVDLEtBQUssRUFBRWtQLElBQUksRUFDM0I7TUFDQyxJQUFHLFNBQVMsQ0FBQ2hCLElBQUksQ0FBQ25PLEdBQUcsQ0FBQyxFQUN0QjtRQUNDLElBQUksQ0FBQ29QLFFBQVEsQ0FBQ3BQLEdBQUcsQ0FBQyxHQUFHLEtBQUs7UUFDMUI7TUFDRDtNQUVBLFFBQU9BLEdBQUc7UUFFVCxLQUFLLFlBQVk7VUFDaEIsSUFBRyxJQUFJLENBQUNrUCxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUNuQjtZQUNDLElBQUksQ0FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7VUFDakI7VUFDQSxJQUFJLENBQUNBLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBRWpCLEtBQUssV0FBVztVQUNmLElBQUcsSUFBSSxDQUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUNuQjtZQUNDLElBQUksQ0FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7VUFDakI7VUFDQTtRQUVELEtBQUssV0FBVztVQUNmLElBQUcsSUFBSSxDQUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUNuQjtZQUNDLElBQUksQ0FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7VUFDakI7UUFFRCxLQUFLLFNBQVM7VUFDYixJQUFHLElBQUksQ0FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDbkI7WUFDQyxJQUFJLENBQUNBLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1VBQ2pCO1VBQ0E7TUFDRjtJQUNEO0VBQUM7QUFBQTs7Ozs7Ozs7Ozs7Ozs7OztBQ2xHRixJQUFNRyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QixJQUFNQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUFDLElBRWpCN0csTUFBTSxHQUFBckosT0FBQSxDQUFBcUosTUFBQTtFQUVsQixTQUFBQSxPQUFBa0IsSUFBQSxFQUNBO0lBQUEsSUFEYWpCLE1BQU0sR0FBQWlCLElBQUEsQ0FBTmpCLE1BQU07TUFBRTdCLFVBQVUsR0FBQThDLElBQUEsQ0FBVjlDLFVBQVU7SUFBQXZILGVBQUEsT0FBQW1KLE1BQUE7SUFFOUIsSUFBSSxDQUFDOEcsU0FBUyxHQUFHLE9BQU87SUFDeEIsSUFBSSxDQUFDQyxLQUFLLEdBQUcsVUFBVTtJQUV2QixJQUFJLENBQUM5RyxNQUFNLEdBQUdBLE1BQU07SUFDcEIsSUFBSSxDQUFDN0IsVUFBVSxHQUFHQSxVQUFVO0VBQzdCO0VBQUMsT0FBQXhILFlBQUEsQ0FBQW9KLE1BQUE7SUFBQXpJLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUF3RixNQUFNQSxDQUFBLEVBQ04sQ0FDQTtFQUFDO0lBQUF6RixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBNEssUUFBUUEsQ0FBQSxFQUNSO01BQ0MsSUFBR3lCLElBQUksQ0FBQ0MsS0FBSyxDQUFDVCxXQUFXLENBQUNoQixHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQ2xEO1FBQ0MsSUFBSSxDQUFDcEMsTUFBTSxDQUFDK0csTUFBTSxHQUFHSixVQUFVO01BQ2hDO01BRUEsSUFBRy9DLElBQUksQ0FBQ0MsS0FBSyxDQUFDVCxXQUFXLENBQUNoQixHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQ2xEO1FBQ0MsSUFBSSxDQUFDcEMsTUFBTSxDQUFDK0csTUFBTSxHQUFHSCxXQUFXO01BQ2pDO01BRUEsSUFBR2hELElBQUksQ0FBQ0MsS0FBSyxDQUFDVCxXQUFXLENBQUNoQixHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQ25EO1FBQ0MsSUFBSSxDQUFDcEMsTUFBTSxDQUFDK0csTUFBTSxHQUFHLElBQUk7TUFDMUI7TUFFQSxJQUFJOUksS0FBSyxHQUFHLENBQUM7TUFFYixJQUFJK0ksS0FBSyxHQUFHLElBQUksQ0FBQzdJLFVBQVUsQ0FBQ3FJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO01BQ3hDLElBQUlTLEtBQUssR0FBRyxJQUFJLENBQUM5SSxVQUFVLENBQUNxSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztNQUV4QyxLQUFJLElBQUk1TCxDQUFDLElBQUksSUFBSSxDQUFDdUQsVUFBVSxDQUFDdUksUUFBUSxFQUNyQztRQUNDLElBQUcsQ0FBQyxJQUFJLENBQUN2SSxVQUFVLENBQUN1SSxRQUFRLENBQUM5TCxDQUFDLENBQUMsRUFDL0I7VUFDQztRQUNEO1FBRUFoQyxPQUFPLENBQUNzTyxHQUFHLENBQUN0TSxDQUFDLENBQUM7TUFDZjtNQUVBb00sS0FBSyxHQUFHcEQsSUFBSSxDQUFDUSxHQUFHLENBQUMsQ0FBQyxFQUFFUixJQUFJLENBQUNPLEdBQUcsQ0FBQzZDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ3hDQyxLQUFLLEdBQUdyRCxJQUFJLENBQUNRLEdBQUcsQ0FBQyxDQUFDLEVBQUVSLElBQUksQ0FBQ08sR0FBRyxDQUFDOEMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFFeEMsSUFBSSxDQUFDakgsTUFBTSxDQUFDK0MsQ0FBQyxJQUFJaUUsS0FBSyxHQUFHLENBQUMsR0FDdkJwRCxJQUFJLENBQUN1RCxJQUFJLENBQUNsSixLQUFLLEdBQUcrSSxLQUFLLENBQUMsR0FDeEJwRCxJQUFJLENBQUN3RCxLQUFLLENBQUNuSixLQUFLLEdBQUcrSSxLQUFLLENBQUM7TUFFNUIsSUFBSSxDQUFDaEgsTUFBTSxDQUFDZ0QsQ0FBQyxJQUFJaUUsS0FBSyxHQUFHLENBQUMsR0FDdkJyRCxJQUFJLENBQUN1RCxJQUFJLENBQUNsSixLQUFLLEdBQUdnSixLQUFLLENBQUMsR0FDeEJyRCxJQUFJLENBQUN3RCxLQUFLLENBQUNuSixLQUFLLEdBQUdnSixLQUFLLENBQUM7TUFFNUIsSUFBSUksVUFBVSxHQUFHLEtBQUs7TUFFdEIsSUFBR3pELElBQUksQ0FBQzBELEdBQUcsQ0FBQ04sS0FBSyxDQUFDLEdBQUdwRCxJQUFJLENBQUMwRCxHQUFHLENBQUNMLEtBQUssQ0FBQyxFQUNwQztRQUNDSSxVQUFVLEdBQUcsSUFBSTtNQUNsQjtNQUVBLElBQUdBLFVBQVUsRUFDYjtRQUNDLElBQUksQ0FBQ1IsU0FBUyxHQUFHLE1BQU07UUFFdkIsSUFBR0csS0FBSyxHQUFHLENBQUMsRUFDWjtVQUNDLElBQUksQ0FBQ0gsU0FBUyxHQUFHLE1BQU07UUFDeEI7UUFFQSxJQUFJLENBQUNDLEtBQUssR0FBRyxTQUFTO01BRXZCLENBQUMsTUFDSSxJQUFHRyxLQUFLLEVBQ2I7UUFDQyxJQUFJLENBQUNKLFNBQVMsR0FBRyxPQUFPO1FBRXhCLElBQUdJLEtBQUssR0FBRyxDQUFDLEVBQ1o7VUFDQyxJQUFJLENBQUNKLFNBQVMsR0FBRyxPQUFPO1FBQ3pCO1FBRUEsSUFBSSxDQUFDQyxLQUFLLEdBQUcsU0FBUztNQUN2QixDQUFDLE1BRUQ7UUFDQyxJQUFJLENBQUNBLEtBQUssR0FBRyxVQUFVO01BQ3hCOztNQUVBO01BQ0E7TUFDQTtNQUNBOztNQUVBLElBQUlTLE1BQU07TUFFVixJQUFHQSxNQUFNLEdBQUcsSUFBSSxDQUFDdkgsTUFBTSxDQUFDLElBQUksQ0FBQzhHLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQ0QsU0FBUyxDQUFDLEVBQ25EO1FBQ0MsSUFBSSxDQUFDN0csTUFBTSxDQUFDd0gsU0FBUyxDQUFDRCxNQUFNLENBQUM7TUFDOUI7SUFDRDtFQUFDO0lBQUFqUSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBa1EsT0FBT0EsQ0FBQSxFQUNQLENBQ0E7RUFBQztBQUFBOzs7Q0MvR0Y7QUFBQTtBQUFBO0FBQUE7Q0NBQTtBQUFBO0FBQUE7QUFBQTs7Ozs7Ozs7QUNBQSxJQUFBQyxRQUFBLEdBQUFwUCxPQUFBO0FBQ0EsSUFBQTZCLE9BQUEsR0FBQTdCLE9BQUE7QUFDQSxJQUFBd0IsWUFBQSxHQUFBeEIsT0FBQTtBQUE0QyxTQUFBa0QsUUFBQVYsQ0FBQSxzQ0FBQVUsT0FBQSx3QkFBQUMsTUFBQSx1QkFBQUEsTUFBQSxDQUFBeUssUUFBQSxhQUFBcEwsQ0FBQSxrQkFBQUEsQ0FBQSxnQkFBQUEsQ0FBQSxXQUFBQSxDQUFBLHlCQUFBVyxNQUFBLElBQUFYLENBQUEsQ0FBQXNCLFdBQUEsS0FBQVgsTUFBQSxJQUFBWCxDQUFBLEtBQUFXLE1BQUEsQ0FBQUosU0FBQSxxQkFBQVAsQ0FBQSxLQUFBVSxPQUFBLENBQUFWLENBQUE7QUFBQSxTQUFBbEUsZ0JBQUEwRCxDQUFBLEVBQUFDLENBQUEsVUFBQUQsQ0FBQSxZQUFBQyxDQUFBLGFBQUFDLFNBQUE7QUFBQSxTQUFBQyxrQkFBQUMsQ0FBQSxFQUFBQyxDQUFBLGFBQUFDLENBQUEsTUFBQUEsQ0FBQSxHQUFBRCxDQUFBLENBQUFFLE1BQUEsRUFBQUQsQ0FBQSxVQUFBRSxDQUFBLEdBQUFILENBQUEsQ0FBQUMsQ0FBQSxHQUFBRSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQVUsY0FBQSxDQUFBTixDQUFBLENBQUF4RCxHQUFBLEdBQUF3RCxDQUFBO0FBQUEsU0FBQW5FLGFBQUErRCxDQUFBLEVBQUFDLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFGLGlCQUFBLENBQUFDLENBQUEsQ0FBQVcsU0FBQSxFQUFBVixDQUFBLEdBQUFDLENBQUEsSUFBQUgsaUJBQUEsQ0FBQUMsQ0FBQSxFQUFBRSxDQUFBLEdBQUFNLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLGlCQUFBTyxRQUFBLFNBQUFQLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLElBRTlCK00sVUFBVSxHQUFBalIsT0FBQSxDQUFBaVIsVUFBQTtFQUV2QixTQUFBQSxXQUFZekksV0FBVyxFQUFFRCxHQUFHLEVBQzVCO0lBQUEsSUFEOEIySSxLQUFLLEdBQUE1QyxTQUFBLENBQUFuSyxNQUFBLFFBQUFtSyxTQUFBLFFBQUE3RSxTQUFBLEdBQUE2RSxTQUFBLE1BQUcsQ0FBQztJQUFBcE8sZUFBQSxPQUFBK1EsVUFBQTtJQUV0QyxJQUFJLENBQUN6SSxXQUFXLEdBQUdBLFdBQVc7SUFDOUIsSUFBSSxDQUFDRSxXQUFXLEdBQUcsSUFBSUMsd0JBQVcsQ0FBRCxDQUFDO0lBRWxDLElBQUksQ0FBQ3dJLEtBQUssR0FBUyxFQUFFO0lBQ3JCLElBQUksQ0FBQ0MsT0FBTyxHQUFPLENBQUMsQ0FBQztJQUNyQixJQUFJLENBQUNDLFFBQVEsR0FBTSxDQUFDO0lBRXBCLElBQUksQ0FBQzlJLEdBQUcsR0FBV0EsR0FBRztJQUN0QixJQUFJLENBQUMySSxLQUFLLEdBQVNBLEtBQUs7SUFFeEIsSUFBSSxDQUFDSSxTQUFTLEdBQUssRUFBRTtJQUNyQixJQUFJLENBQUNDLFVBQVUsR0FBSSxFQUFFO0lBRXJCLElBQUksQ0FBQ0MsWUFBWSxHQUFHLENBQUM7SUFDckIsSUFBSSxDQUFDQyxhQUFhLEdBQUcsQ0FBQztFQUN2QjtFQUFDLE9BQUF4UixZQUFBLENBQUFnUixVQUFBO0lBQUFyUSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBNlEsVUFBVUEsQ0FBQ3JGLENBQUMsRUFBRUMsQ0FBQyxFQUFFcUYsV0FBVyxFQUM1QjtNQUNDLElBQUlDLElBQUk7TUFDUixJQUFJQyxLQUFLLEdBQUd4RixDQUFDLEdBQUcsSUFBSSxDQUFDaUYsU0FBUyxHQUFHLElBQUksQ0FBQ0UsWUFBWSxHQUFHLElBQUksQ0FBQ2hKLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVM7TUFDcEYsSUFBSW1SLEtBQUssR0FBR3hGLENBQUMsR0FBRyxJQUFJLENBQUNpRixVQUFVLEdBQUcsSUFBSSxDQUFDRSxhQUFhLEdBQUcsSUFBSSxDQUFDakosV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUztNQUV0RixJQUFHLElBQUksQ0FBQ3lRLE9BQU8sQ0FBQ1MsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDVCxPQUFPLENBQUNTLEtBQUssQ0FBQyxDQUFDQyxLQUFLLENBQUMsRUFDcEQ7UUFDQ0YsSUFBSSxHQUFHLElBQUksQ0FBQ1IsT0FBTyxDQUFDUyxLQUFLLENBQUMsQ0FBQ0MsS0FBSyxDQUFDO01BQ2xDLENBQUMsTUFFRDtRQUNDRixJQUFJLEdBQUcsSUFBSUcsZ0JBQU8sQ0FDakIsSUFBSSxDQUFDdkosV0FBVyxFQUNkLElBQUksQ0FBQ0UsV0FBVyxFQUNoQixJQUFJLENBQUNILEdBQUcsRUFDUixJQUFJLENBQUNpSixZQUFZLEVBQ2pCLElBQUksQ0FBQ0MsYUFBYSxFQUNsQkksS0FBSyxFQUNMQyxLQUFLLEVBQ0wsSUFBSSxDQUFDWixLQUNSLENBQUM7UUFFRCxJQUFHLENBQUMsSUFBSSxDQUFDRSxPQUFPLENBQUNTLEtBQUssQ0FBQyxFQUN2QjtVQUNDLElBQUksQ0FBQ1QsT0FBTyxDQUFDUyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekI7UUFFQSxJQUFHLENBQUMsSUFBSSxDQUFDVCxPQUFPLENBQUNTLEtBQUssQ0FBQyxDQUFDQyxLQUFLLENBQUMsRUFDOUI7VUFDQyxJQUFJLENBQUNWLE9BQU8sQ0FBQ1MsS0FBSyxDQUFDLENBQUNDLEtBQUssQ0FBQyxHQUFHRixJQUFJO1FBQ2xDO01BQ0Q7TUFFQSxJQUFJLENBQUNULEtBQUssQ0FBQ25GLElBQUksQ0FBQzRGLElBQUksQ0FBQztNQUVyQixJQUFHLElBQUksQ0FBQ1QsS0FBSyxDQUFDaE4sTUFBTSxHQUFHLElBQUksQ0FBQ2tOLFFBQVEsRUFDcEM7UUFDQyxJQUFJLENBQUNGLEtBQUssQ0FBQ2xGLEtBQUssQ0FBQyxDQUFDO01BQ25CO0lBQ0Q7RUFBQztJQUFBckwsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXNMLElBQUlBLENBQUEsRUFDSjtNQUNDLElBQUksQ0FBQ2dGLEtBQUssQ0FBQ2hOLE1BQU0sR0FBRyxDQUFDO01BRXJCLElBQU02TixPQUFPLEdBQUc5RSxJQUFJLENBQUN3RCxLQUFLLENBQ3hCNUcsY0FBTSxDQUFDdUMsQ0FBQyxJQUFJLElBQUksQ0FBQ21GLFlBQVksR0FBRyxJQUFJLENBQUNGLFNBQVMsR0FBRyxJQUFJLENBQUM5SSxXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLENBQUMsR0FBSSxDQUN2RixDQUFDO01BRUQsSUFBTXNSLE9BQU8sR0FBRy9FLElBQUksQ0FBQ3dELEtBQUssQ0FDekI1RyxjQUFNLENBQUN3QyxDQUFDLElBQUksSUFBSSxDQUFDbUYsYUFBYSxHQUFHLElBQUksQ0FBQ0YsVUFBVSxHQUFHLElBQUksQ0FBQy9JLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsQ0FBQyxHQUFHLENBQ3ZGLENBQUM7TUFFRCxJQUFJdVIsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztNQUV0QixLQUFJLElBQUk3RixDQUFDLElBQUk2RixLQUFLLEVBQ2xCO1FBQ0MsS0FBSSxJQUFJNUYsQ0FBQyxJQUFJNEYsS0FBSyxFQUNsQjtVQUNDLElBQUksQ0FBQ1IsVUFBVSxDQUFDTSxPQUFPLEdBQUdFLEtBQUssQ0FBQzdGLENBQUMsQ0FBQyxFQUFFNEYsT0FBTyxHQUFHQyxLQUFLLENBQUM1RixDQUFDLENBQUMsQ0FBQztRQUN4RDtNQUNEO01BRUEsSUFBSSxDQUFDNkUsS0FBSyxDQUFDZ0IsT0FBTyxDQUFDLFVBQUFwSCxDQUFDO1FBQUEsT0FBSUEsQ0FBQyxDQUFDb0IsSUFBSSxDQUFDLENBQUM7TUFBQSxFQUFDO0lBQ2xDO0VBQUM7SUFBQXZMLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFpSyxNQUFNQSxDQUFDdUIsQ0FBQyxFQUFFQyxDQUFDLEVBQ1g7TUFDQyxLQUFJLElBQUkxSCxDQUFDLElBQUksSUFBSSxDQUFDd00sT0FBTyxFQUN6QjtRQUNDLEtBQUksSUFBSTVHLENBQUMsSUFBSSxJQUFJLENBQUM0RyxPQUFPLENBQUN4TSxDQUFDLENBQUMsRUFDNUI7VUFDQyxPQUFPLElBQUksQ0FBQ3dNLE9BQU8sQ0FBQ3hNLENBQUMsQ0FBQyxDQUFDNEYsQ0FBQyxDQUFDO1FBQzFCO01BQ0Q7TUFFQSxPQUFNLElBQUksQ0FBQzJHLEtBQUssQ0FBQ2hOLE1BQU0sRUFDdkI7UUFDQyxJQUFJLENBQUNnTixLQUFLLENBQUNpQixHQUFHLENBQUMsQ0FBQztNQUNqQjtNQUVBLElBQUksQ0FBQ1osWUFBWSxHQUFHdEUsSUFBSSxDQUFDdUQsSUFBSSxDQUFFcEUsQ0FBQyxHQUFHLElBQUksQ0FBQ2lGLFNBQVUsQ0FBQztNQUNuRCxJQUFJLENBQUNHLGFBQWEsR0FBR3ZFLElBQUksQ0FBQ3VELElBQUksQ0FBRW5FLENBQUMsR0FBRyxJQUFJLENBQUNpRixVQUFXLENBQUM7TUFFckQsSUFBSSxDQUFDcEYsSUFBSSxDQUFDLENBQUM7SUFDWjtFQUFDO0lBQUF2TCxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBNEssUUFBUUEsQ0FBQSxFQUNSLENBRUE7RUFBQztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7OztJQ3BIVzNCLE1BQU0sR0FBQTlKLE9BQUEsQ0FBQThKLE1BQUEsZ0JBQUE3SixZQUFBLFVBQUE2SixPQUFBO0VBQUE1SixlQUFBLE9BQUE0SixNQUFBO0FBQUE7QUFBQTJGLGVBQUEsQ0FBTjNGLE1BQU0sT0FFUCxDQUFDO0FBQUEyRixlQUFBLENBRkEzRixNQUFNLE9BR1AsQ0FBQztBQUFBMkYsZUFBQSxDQUhBM0YsTUFBTSxXQUlGLENBQUM7QUFBQTJGLGVBQUEsQ0FKTDNGLE1BQU0sWUFLRixDQUFDOzs7Ozs7Ozs7O0FDTGxCLElBQUF5RixTQUFBLEdBQUEzTixPQUFBO0FBQ0EsSUFBQTZCLE9BQUEsR0FBQTdCLE9BQUE7QUFBa0MsU0FBQWtELFFBQUFWLENBQUEsc0NBQUFVLE9BQUEsd0JBQUFDLE1BQUEsdUJBQUFBLE1BQUEsQ0FBQXlLLFFBQUEsYUFBQXBMLENBQUEsa0JBQUFBLENBQUEsZ0JBQUFBLENBQUEsV0FBQUEsQ0FBQSx5QkFBQVcsTUFBQSxJQUFBWCxDQUFBLENBQUFzQixXQUFBLEtBQUFYLE1BQUEsSUFBQVgsQ0FBQSxLQUFBVyxNQUFBLENBQUFKLFNBQUEscUJBQUFQLENBQUEsS0FBQVUsT0FBQSxDQUFBVixDQUFBO0FBQUEsU0FBQWlPLDJCQUFBcE8sQ0FBQSxFQUFBRCxDQUFBLFFBQUFFLENBQUEseUJBQUFhLE1BQUEsSUFBQWQsQ0FBQSxDQUFBYyxNQUFBLENBQUF5SyxRQUFBLEtBQUF2TCxDQUFBLHFCQUFBQyxDQUFBLFFBQUFvTyxLQUFBLENBQUFDLE9BQUEsQ0FBQXRPLENBQUEsTUFBQUMsQ0FBQSxHQUFBc08sMkJBQUEsQ0FBQXZPLENBQUEsTUFBQUQsQ0FBQSxJQUFBQyxDQUFBLHVCQUFBQSxDQUFBLENBQUFFLE1BQUEsSUFBQUQsQ0FBQSxLQUFBRCxDQUFBLEdBQUFDLENBQUEsT0FBQXVPLEVBQUEsTUFBQUMsQ0FBQSxZQUFBQSxFQUFBLGVBQUFDLENBQUEsRUFBQUQsQ0FBQSxFQUFBN08sQ0FBQSxXQUFBQSxFQUFBLFdBQUE0TyxFQUFBLElBQUF4TyxDQUFBLENBQUFFLE1BQUEsS0FBQXlPLElBQUEsV0FBQUEsSUFBQSxNQUFBL1IsS0FBQSxFQUFBb0QsQ0FBQSxDQUFBd08sRUFBQSxVQUFBek8sQ0FBQSxXQUFBQSxFQUFBQyxDQUFBLFVBQUFBLENBQUEsS0FBQTRPLENBQUEsRUFBQUgsQ0FBQSxnQkFBQTVPLFNBQUEsaUpBQUFNLENBQUEsRUFBQVIsQ0FBQSxPQUFBa1AsQ0FBQSxnQkFBQUgsQ0FBQSxXQUFBQSxFQUFBLElBQUF6TyxDQUFBLEdBQUFBLENBQUEsQ0FBQWUsSUFBQSxDQUFBaEIsQ0FBQSxNQUFBSixDQUFBLFdBQUFBLEVBQUEsUUFBQUksQ0FBQSxHQUFBQyxDQUFBLENBQUE2TyxJQUFBLFdBQUFuUCxDQUFBLEdBQUFLLENBQUEsQ0FBQTJPLElBQUEsRUFBQTNPLENBQUEsS0FBQUQsQ0FBQSxXQUFBQSxFQUFBQyxDQUFBLElBQUE2TyxDQUFBLE9BQUExTyxDQUFBLEdBQUFILENBQUEsS0FBQTRPLENBQUEsV0FBQUEsRUFBQSxVQUFBalAsQ0FBQSxZQUFBTSxDQUFBLGNBQUFBLENBQUEsOEJBQUE0TyxDQUFBLFFBQUExTyxDQUFBO0FBQUEsU0FBQTRPLG1CQUFBL08sQ0FBQSxXQUFBZ1Asa0JBQUEsQ0FBQWhQLENBQUEsS0FBQWlQLGdCQUFBLENBQUFqUCxDQUFBLEtBQUF1TywyQkFBQSxDQUFBdk8sQ0FBQSxLQUFBa1Asa0JBQUE7QUFBQSxTQUFBQSxtQkFBQSxjQUFBclAsU0FBQTtBQUFBLFNBQUEwTyw0QkFBQXZPLENBQUEsRUFBQUwsQ0FBQSxRQUFBSyxDQUFBLDJCQUFBQSxDQUFBLFNBQUFtUCxpQkFBQSxDQUFBblAsQ0FBQSxFQUFBTCxDQUFBLE9BQUFNLENBQUEsTUFBQW1QLFFBQUEsQ0FBQXBPLElBQUEsQ0FBQWhCLENBQUEsRUFBQXFQLEtBQUEsNkJBQUFwUCxDQUFBLElBQUFELENBQUEsQ0FBQXlCLFdBQUEsS0FBQXhCLENBQUEsR0FBQUQsQ0FBQSxDQUFBeUIsV0FBQSxDQUFBbUosSUFBQSxhQUFBM0ssQ0FBQSxjQUFBQSxDQUFBLEdBQUFvTyxLQUFBLENBQUFpQixJQUFBLENBQUF0UCxDQUFBLG9CQUFBQyxDQUFBLCtDQUFBNkssSUFBQSxDQUFBN0ssQ0FBQSxJQUFBa1AsaUJBQUEsQ0FBQW5QLENBQUEsRUFBQUwsQ0FBQTtBQUFBLFNBQUFzUCxpQkFBQWpQLENBQUEsOEJBQUFjLE1BQUEsWUFBQWQsQ0FBQSxDQUFBYyxNQUFBLENBQUF5SyxRQUFBLGFBQUF2TCxDQUFBLHVCQUFBcU8sS0FBQSxDQUFBaUIsSUFBQSxDQUFBdFAsQ0FBQTtBQUFBLFNBQUFnUCxtQkFBQWhQLENBQUEsUUFBQXFPLEtBQUEsQ0FBQUMsT0FBQSxDQUFBdE8sQ0FBQSxVQUFBbVAsaUJBQUEsQ0FBQW5QLENBQUE7QUFBQSxTQUFBbVAsa0JBQUFuUCxDQUFBLEVBQUFMLENBQUEsYUFBQUEsQ0FBQSxJQUFBQSxDQUFBLEdBQUFLLENBQUEsQ0FBQUUsTUFBQSxNQUFBUCxDQUFBLEdBQUFLLENBQUEsQ0FBQUUsTUFBQSxZQUFBSCxDQUFBLE1BQUFILENBQUEsR0FBQXlPLEtBQUEsQ0FBQTFPLENBQUEsR0FBQUksQ0FBQSxHQUFBSixDQUFBLEVBQUFJLENBQUEsSUFBQUgsQ0FBQSxDQUFBRyxDQUFBLElBQUFDLENBQUEsQ0FBQUQsQ0FBQSxVQUFBSCxDQUFBO0FBQUEsU0FBQTNELGdCQUFBMEQsQ0FBQSxFQUFBQyxDQUFBLFVBQUFELENBQUEsWUFBQUMsQ0FBQSxhQUFBQyxTQUFBO0FBQUEsU0FBQUMsa0JBQUFDLENBQUEsRUFBQUMsQ0FBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUQsQ0FBQSxDQUFBRSxNQUFBLEVBQUFELENBQUEsVUFBQUUsQ0FBQSxHQUFBSCxDQUFBLENBQUFDLENBQUEsR0FBQUUsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsQ0FBQUMsVUFBQSxRQUFBRCxDQUFBLENBQUFFLFlBQUEsa0JBQUFGLENBQUEsS0FBQUEsQ0FBQSxDQUFBRyxRQUFBLFFBQUFDLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLEVBQUFVLGNBQUEsQ0FBQU4sQ0FBQSxDQUFBeEQsR0FBQSxHQUFBd0QsQ0FBQTtBQUFBLFNBQUFuRSxhQUFBK0QsQ0FBQSxFQUFBQyxDQUFBLEVBQUFDLENBQUEsV0FBQUQsQ0FBQSxJQUFBRixpQkFBQSxDQUFBQyxDQUFBLENBQUFXLFNBQUEsRUFBQVYsQ0FBQSxHQUFBQyxDQUFBLElBQUFILGlCQUFBLENBQUFDLENBQUEsRUFBQUUsQ0FBQSxHQUFBTSxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxpQkFBQU8sUUFBQSxTQUFBUCxDQUFBO0FBQUEsU0FBQVUsZUFBQVIsQ0FBQSxRQUFBVSxDQUFBLEdBQUFDLFlBQUEsQ0FBQVgsQ0FBQSxnQ0FBQVksT0FBQSxDQUFBRixDQUFBLElBQUFBLENBQUEsR0FBQUEsQ0FBQTtBQUFBLFNBQUFDLGFBQUFYLENBQUEsRUFBQUQsQ0FBQSxvQkFBQWEsT0FBQSxDQUFBWixDQUFBLE1BQUFBLENBQUEsU0FBQUEsQ0FBQSxNQUFBRixDQUFBLEdBQUFFLENBQUEsQ0FBQWEsTUFBQSxDQUFBQyxXQUFBLGtCQUFBaEIsQ0FBQSxRQUFBWSxDQUFBLEdBQUFaLENBQUEsQ0FBQWlCLElBQUEsQ0FBQWYsQ0FBQSxFQUFBRCxDQUFBLGdDQUFBYSxPQUFBLENBQUFGLENBQUEsVUFBQUEsQ0FBQSxZQUFBZCxTQUFBLHlFQUFBRyxDQUFBLEdBQUFpQixNQUFBLEdBQUFDLE1BQUEsRUFBQWpCLENBQUE7QUFBQSxJQUVyQnFGLE1BQU0sR0FBQXZKLE9BQUEsQ0FBQXVKLE1BQUE7RUFFbEIsU0FBQUEsT0FBQWdCLElBQUEsRUFDQTtJQUFBLElBQUF2RCxLQUFBO0lBQUEsSUFEYXdDLEdBQUcsR0FBQWUsSUFBQSxDQUFIZixHQUFHO01BQUVoQixXQUFXLEdBQUErQixJQUFBLENBQVgvQixXQUFXO01BQUVFLFdBQVcsR0FBQTZCLElBQUEsQ0FBWDdCLFdBQVc7TUFBRWdCLEtBQUssR0FBQWEsSUFBQSxDQUFMYixLQUFLO01BQUVDLE1BQU0sR0FBQVksSUFBQSxDQUFOWixNQUFNO0lBQUF6SixlQUFBLE9BQUFxSixNQUFBO0lBRXhELElBQUksQ0FBQ21HLGtCQUFRLENBQUM4RCxPQUFPLENBQUMsR0FBRyxJQUFJO0lBRTdCLElBQUksQ0FBQ0MsQ0FBQyxHQUFHLENBQUM7SUFDVixJQUFJLENBQUNwSCxDQUFDLEdBQUcsQ0FBQztJQUNWLElBQUksQ0FBQ0MsQ0FBQyxHQUFHLENBQUM7SUFFVixJQUFJLENBQUM1QyxLQUFLLEdBQUksRUFBRSxJQUFJQSxLQUFLO0lBQ3pCLElBQUksQ0FBQ0MsTUFBTSxHQUFHLEVBQUUsSUFBSUEsTUFBTTtJQUMxQixJQUFJLENBQUMrSixLQUFLLEdBQUksQ0FBQztJQUVmLElBQUksQ0FBQzdDLE1BQU0sR0FBRyxFQUFFO0lBQ2hCLElBQUksQ0FBQzhDLFVBQVUsR0FBRyxDQUFDO0lBQ25CLElBQUksQ0FBQ0MsWUFBWSxHQUFHLElBQUksQ0FBQ0QsVUFBVTtJQUNuQyxJQUFJLENBQUNFLFlBQVksR0FBRyxDQUFDO0lBQ3JCLElBQUksQ0FBQ0MsYUFBYSxHQUFHLEVBQUU7SUFFdkIsSUFBSSxDQUFDdk0sS0FBSyxHQUFNLENBQUM7SUFDakIsSUFBSSxDQUFDQyxRQUFRLEdBQUcsQ0FBQztJQUVqQixJQUFJLENBQUN1TSxNQUFNLEdBQUcsS0FBSztJQUVuQixJQUFJLENBQUNDLEtBQUssR0FBRyxDQUFDO0lBQ2QsSUFBSSxDQUFDQyxJQUFJLEdBQUcsQ0FBQztJQUNiLElBQUksQ0FBQ0MsSUFBSSxHQUFHLENBQUM7SUFDYixJQUFJLENBQUNDLEVBQUUsR0FBSSxDQUFDO0lBRVosSUFBSSxDQUFDQyxJQUFJLEdBQUcsSUFBSSxDQUFDSixLQUFLO0lBQ3RCLElBQUksQ0FBQ0ssS0FBSyxHQUFHLElBQUksQ0FBQ0osSUFBSTtJQUN0QixJQUFJLENBQUNLLElBQUksR0FBRyxJQUFJLENBQUNKLElBQUk7SUFDckIsSUFBSSxDQUFDSyxLQUFLLEdBQUcsSUFBSSxDQUFDSixFQUFFO0lBRXBCLElBQUksQ0FBQzlELE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUUxQixJQUFJLENBQUNtRSxRQUFRLEdBQUc7TUFDZixPQUFPLEVBQUUsQ0FDUiwyQkFBMkIsQ0FDM0I7TUFDQyxPQUFPLEVBQUUsQ0FDViwyQkFBMkIsQ0FDM0I7TUFDQyxNQUFNLEVBQUUsQ0FDVCwwQkFBMEIsQ0FDMUI7TUFDQyxNQUFNLEVBQUUsQ0FDVCwwQkFBMEI7SUFFNUIsQ0FBQztJQUVELElBQUksQ0FBQ0MsT0FBTyxHQUFHO01BQ2QsT0FBTyxFQUFFLENBQ1IsMEJBQTBCLEVBQ3hCLDBCQUEwQixFQUMxQiwyQkFBMkIsRUFDM0IsMkJBQTJCLEVBQzNCLDJCQUEyQixFQUMzQiwyQkFBMkIsQ0FDN0I7TUFDQyxPQUFPLEVBQUUsQ0FDViwwQkFBMEIsRUFDeEIsMEJBQTBCLEVBQzFCLDJCQUEyQixFQUMzQiwyQkFBMkIsRUFDM0IsMkJBQTJCLEVBQzNCLDJCQUEyQixDQUU3QjtNQUNDLE1BQU0sRUFBRSxDQUNULHlCQUF5QixFQUN2Qix5QkFBeUIsRUFDekIsMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQiwwQkFBMEIsQ0FDNUI7TUFDQyxNQUFNLEVBQUUsQ0FDVCx5QkFBeUIsRUFDdkIseUJBQXlCLEVBQ3pCLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsMEJBQTBCO0lBRTlCLENBQUM7SUFFRCxJQUFJLENBQUNqTSxXQUFXLEdBQUdBLFdBQVc7SUFFOUIsSUFBTWtNLEVBQUUsR0FBRyxJQUFJLENBQUNsTSxXQUFXLENBQUMrRCxJQUFJLENBQUMvTCxPQUFPO0lBRXhDLElBQUksQ0FBQ21VLE9BQU8sR0FBR0QsRUFBRSxDQUFDRSxhQUFhLENBQUMsQ0FBQztJQUVqQ0YsRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQ0gsT0FBTyxDQUFDO0lBRTNDLElBQU0xUSxDQUFDLEdBQUcsU0FBSkEsQ0FBQ0EsQ0FBQTtNQUFBLE9BQVM4USxRQUFRLENBQUM3SCxJQUFJLENBQUNtQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUFBO0lBQzdDLElBQU0yRixLQUFLLEdBQUcsSUFBSUMsVUFBVSxDQUFDLENBQUNoUixDQUFDLENBQUMsQ0FBQyxFQUFFQSxDQUFDLENBQUMsQ0FBQyxFQUFFQSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRWxEeVEsRUFBRSxDQUFDUSxVQUFVLENBQ1pSLEVBQUUsQ0FBQ0ksVUFBVSxFQUNYLENBQUMsRUFDREosRUFBRSxDQUFDUyxJQUFJLEVBQ1AsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0RULEVBQUUsQ0FBQ1MsSUFBSSxFQUNQVCxFQUFFLENBQUNVLGFBQWEsRUFDaEJKLEtBQ0gsQ0FBQztJQUVELElBQUksQ0FBQ3RNLFdBQVcsR0FBR0EsV0FBVztJQUU5QixJQUFJLENBQUNBLFdBQVcsQ0FBQzJNLEtBQUssQ0FBQ0MsSUFBSSxDQUFDLFVBQUNDLEtBQUssRUFBRztNQUNwQyxJQUFNQyxLQUFLLEdBQUd4TyxLQUFJLENBQUMwQixXQUFXLENBQUMrTSxRQUFRLENBQUNqTSxHQUFHLENBQUM7TUFFNUMsSUFBR2dNLEtBQUssRUFDUjtRQUNDak0sTUFBTSxDQUFDbU0sV0FBVyxDQUFDMU8sS0FBSSxDQUFDd0IsV0FBVyxDQUFDK0QsSUFBSSxFQUFFaUosS0FBSyxDQUFDLENBQUNGLElBQUksQ0FBQyxVQUFBdk8sSUFBSSxFQUFJO1VBQzdEQyxLQUFJLENBQUMyTixPQUFPLEdBQUc1TixJQUFJLENBQUM0TixPQUFPO1VBQzNCM04sS0FBSSxDQUFDMEMsS0FBSyxHQUFHM0MsSUFBSSxDQUFDNE8sS0FBSyxDQUFDak0sS0FBSyxHQUFHMUMsS0FBSSxDQUFDME0sS0FBSztVQUMxQzFNLEtBQUksQ0FBQzJDLE1BQU0sR0FBRzVDLElBQUksQ0FBQzRPLEtBQUssQ0FBQ2hNLE1BQU0sR0FBRzNDLEtBQUksQ0FBQzBNLEtBQUs7UUFDN0MsQ0FBQyxDQUFDO01BQ0g7SUFDRCxDQUFDLENBQUM7RUFDSDtFQUFDLE9BQUF6VCxZQUFBLENBQUFzSixNQUFBO0lBQUEzSSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBc0wsSUFBSUEsQ0FBQSxFQUNKO01BQ0MsSUFBSSxDQUFDd0gsVUFBVSxHQUFHLElBQUksQ0FBQ25NLFFBQVEsR0FBRzBGLElBQUksQ0FBQzBELEdBQUcsQ0FBQyxJQUFJLENBQUNySixLQUFLLENBQUM7TUFDdEQsSUFBRyxJQUFJLENBQUNvTSxVQUFVLEdBQUcsSUFBSSxDQUFDbk0sUUFBUSxFQUNsQztRQUNDLElBQUksQ0FBQ21NLFVBQVUsR0FBRyxJQUFJLENBQUNuTSxRQUFRO01BQ2hDO01BRUEsSUFBRyxJQUFJLENBQUNvTSxZQUFZLElBQUksQ0FBQyxFQUN6QjtRQUNDLElBQUksQ0FBQ0EsWUFBWSxHQUFHLElBQUksQ0FBQ0QsVUFBVTtRQUNuQyxJQUFJLENBQUNFLFlBQVksRUFBRTtNQUNwQixDQUFDLE1BRUQ7UUFDQyxJQUFJLENBQUNELFlBQVksRUFBRTtNQUNwQjtNQUVBLElBQUcsSUFBSSxDQUFDQyxZQUFZLElBQUksSUFBSSxDQUFDaEQsTUFBTSxDQUFDMU0sTUFBTSxFQUMxQztRQUNDLElBQUksQ0FBQzBQLFlBQVksR0FBRyxJQUFJLENBQUNBLFlBQVksR0FBRyxJQUFJLENBQUNoRCxNQUFNLENBQUMxTSxNQUFNO01BQzNEO01BRUEsSUFBTXFSLEtBQUssR0FBRyxJQUFJLENBQUMzRSxNQUFNLENBQUUsSUFBSSxDQUFDZ0QsWUFBWSxDQUFFO01BRTlDLElBQUcyQixLQUFLLEVBQ1I7UUFDQyxJQUFJLENBQUNiLE9BQU8sR0FBR2EsS0FBSyxDQUFDYixPQUFPO1FBQzVCLElBQUksQ0FBQ2pMLEtBQUssR0FBSThMLEtBQUssQ0FBQzlMLEtBQUssR0FBRyxJQUFJLENBQUNnSyxLQUFLO1FBQ3RDLElBQUksQ0FBQy9KLE1BQU0sR0FBRzZMLEtBQUssQ0FBQzdMLE1BQU0sR0FBRyxJQUFJLENBQUMrSixLQUFLO01BQ3hDO01BR0EsSUFBTWdCLEVBQUUsR0FBRyxJQUFJLENBQUNsTSxXQUFXLENBQUMrRCxJQUFJLENBQUMvTCxPQUFPO01BQ3hDa1UsRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQ0gsT0FBTyxDQUFDO01BQzNDRCxFQUFFLENBQUNrQixVQUFVLENBQUNsQixFQUFFLENBQUNtQixZQUFZLEVBQUUsSUFBSSxDQUFDck4sV0FBVyxDQUFDc04sY0FBYyxDQUFDO01BQy9EcEIsRUFBRSxDQUFDcUIsVUFBVSxDQUFDckIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUlHLFlBQVksQ0FBQyxDQUMvQyxHQUFHLEVBQUUsR0FBRyxFQUNSLEdBQUcsRUFBRSxHQUFHLEVBQ1IsR0FBRyxFQUFFLEdBQUcsRUFDUixHQUFHLEVBQUUsR0FBRyxFQUNSLEdBQUcsRUFBRSxHQUFHLEVBQ1IsR0FBRyxFQUFFLEdBQUcsQ0FDUixDQUFDLEVBQUV0QixFQUFFLENBQUN1QixXQUFXLENBQUM7TUFFbkJ2QixFQUFFLENBQUN3QixTQUFTLENBQ1gsSUFBSSxDQUFDMU4sV0FBVyxDQUFDMk4sY0FBYyxFQUM3QixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUNILENBQUM7TUFFRHpCLEVBQUUsQ0FBQzBCLFNBQVMsQ0FDWCxJQUFJLENBQUNDLFlBQVksRUFDZixHQUFHLEVBQ0gsR0FDSCxDQUFDO01BRUQsSUFBSSxDQUFDQyxZQUFZLENBQ2hCLElBQUksQ0FBQ2pLLENBQUMsR0FBRyxJQUFJLENBQUM3RCxXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLEdBQUcsQ0FBQ21KLGNBQU0sQ0FBQ3VDLENBQUMsR0FBSXZDLGNBQU0sQ0FBQ0osS0FBSyxHQUFHLElBQUksQ0FBQ2xCLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsR0FBRyxDQUFFLEVBQ3pHLElBQUksQ0FBQzJMLENBQUMsR0FBRyxJQUFJLENBQUM5RCxXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLEdBQUcsQ0FBQ21KLGNBQU0sQ0FBQ3dDLENBQUMsR0FBSXhDLGNBQU0sQ0FBQ0gsTUFBTSxHQUFHLElBQUksQ0FBQ25CLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsR0FBRyxDQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUNnSixNQUFNLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQ25CLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsRUFDbkssSUFBSSxDQUFDK0ksS0FBSyxHQUFHLElBQUksQ0FBQ2xCLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsRUFDNUMsSUFBSSxDQUFDZ0osTUFBTSxHQUFHLElBQUksQ0FBQ25CLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQ3ZDLENBQUM7TUFFRCtULEVBQUUsQ0FBQzZCLGVBQWUsQ0FBQzdCLEVBQUUsQ0FBQzhCLFdBQVcsRUFBRSxJQUFJLENBQUNoTyxXQUFXLENBQUNpTyxVQUFVLENBQUM7TUFDL0QvQixFQUFFLENBQUNnQyxVQUFVLENBQUNoQyxFQUFFLENBQUNpQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztNQUVqQ2pDLEVBQUUsQ0FBQ3dCLFNBQVMsQ0FBQXZRLEtBQUEsQ0FBWitPLEVBQUUsR0FBVyxJQUFJLENBQUNsTSxXQUFXLENBQUMyTixjQUFjLEVBQUF2SixNQUFBLENBQUFvRyxrQkFBQSxDQUFLeE8sTUFBTSxDQUFDaUssTUFBTSxDQUFDLElBQUksQ0FBQzRCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7UUFBQyxDQUFDLEVBQUU7TUFBQyxDQUFDLENBQUMsR0FBQztNQUVqR3FFLEVBQUUsQ0FBQzZCLGVBQWUsQ0FBQzdCLEVBQUUsQ0FBQzhCLFdBQVcsRUFBRSxJQUFJLENBQUNoTyxXQUFXLENBQUNvTyxZQUFZLENBQUM7TUFDakVsQyxFQUFFLENBQUNnQyxVQUFVLENBQUNoQyxFQUFFLENBQUNpQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztNQUVqQ2pDLEVBQUUsQ0FBQ3dCLFNBQVMsQ0FDWCxJQUFJLENBQUMxTixXQUFXLENBQUMyTixjQUFjLEVBQzdCLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQ0gsQ0FBQztJQUNGO0VBQUM7SUFBQXZWLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFpUSxTQUFTQSxDQUFDK0YsYUFBYSxFQUN2QjtNQUFBLElBQUE3TixNQUFBO01BQ0MsSUFBSThOLFFBQVEsR0FBR0QsYUFBYSxDQUFDRSxJQUFJLENBQUMsR0FBRyxDQUFDO01BRXRDLElBQUcsSUFBSSxDQUFDakQsYUFBYSxLQUFLZ0QsUUFBUSxFQUNsQztRQUNDO01BQ0Q7TUFFQSxJQUFJLENBQUNoRCxhQUFhLEdBQUdnRCxRQUFRO01BRTdCLElBQU1wQixXQUFXLEdBQUcsU0FBZEEsV0FBV0EsQ0FBR0YsS0FBSztRQUFBLE9BQUlqTSxNQUFNLENBQUNtTSxXQUFXLENBQUMxTSxNQUFJLENBQUNSLFdBQVcsQ0FBQytELElBQUksRUFBRWlKLEtBQUssQ0FBQztNQUFBO01BRTdFLElBQUksQ0FBQzlNLFdBQVcsQ0FBQzJNLEtBQUssQ0FBQ0MsSUFBSSxDQUFDLFVBQUFDLEtBQUssRUFBSTtRQUNwQyxJQUFNMUUsTUFBTSxHQUFHMEUsS0FBSyxDQUFDeUIsU0FBUyxDQUFDSCxhQUFhLENBQUMsQ0FBQ3RPLEdBQUcsQ0FDaEQsVUFBQWlOLEtBQUs7VUFBQSxPQUFJRSxXQUFXLENBQUNGLEtBQUssQ0FBQyxDQUFDRixJQUFJLENBQUMsVUFBQXZPLElBQUk7WUFBQSxPQUFLO2NBQ3pDNE4sT0FBTyxFQUFHNU4sSUFBSSxDQUFDNE4sT0FBTztjQUNwQmpMLEtBQUssRUFBRzNDLElBQUksQ0FBQzRPLEtBQUssQ0FBQ2pNLEtBQUs7Y0FDeEJDLE1BQU0sRUFBRTVDLElBQUksQ0FBQzRPLEtBQUssQ0FBQ2hNO1lBQ3RCLENBQUM7VUFBQSxDQUFDLENBQUM7UUFBQSxDQUNKLENBQUM7UUFFRHNOLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDckcsTUFBTSxDQUFDLENBQUN5RSxJQUFJLENBQUMsVUFBQXpFLE1BQU07VUFBQSxPQUFJN0gsTUFBSSxDQUFDNkgsTUFBTSxHQUFHQSxNQUFNO1FBQUEsRUFBQztNQUV6RCxDQUFDLENBQUM7SUFDSDtFQUFDO0lBQUFqUSxHQUFBO0lBQUFDLEtBQUEsRUFvREQsU0FBQXlWLFlBQVlBLENBQUNqSyxDQUFDLEVBQUVDLENBQUMsRUFBRTVDLEtBQUssRUFBRUMsTUFBTSxFQUNoQztNQUFBLElBRGtDd04sU0FBUyxHQUFBN0ksU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLEVBQUU7TUFFL0MsSUFBTW9HLEVBQUUsR0FBRyxJQUFJLENBQUNsTSxXQUFXLENBQUMrRCxJQUFJLENBQUMvTCxPQUFPO01BRXhDa1UsRUFBRSxDQUFDa0IsVUFBVSxDQUFDbEIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUksQ0FBQ3JOLFdBQVcsQ0FBQzRPLGNBQWMsQ0FBQztNQUUvRCxJQUFNQyxFQUFFLEdBQUdoTCxDQUFDO01BQ1osSUFBTWlMLEVBQUUsR0FBR2hMLENBQUM7TUFDWixJQUFNaUwsRUFBRSxHQUFHbEwsQ0FBQyxHQUFHM0MsS0FBSztNQUNwQixJQUFNOE4sRUFBRSxHQUFHbEwsQ0FBQyxHQUFHM0MsTUFBTTs7TUFFckI7TUFDQSxJQUFNZ0osQ0FBQyxHQUFHLENBQUM7TUFFWCxJQUFNOEUsTUFBTSxHQUFHLElBQUl6QixZQUFZLENBQUMsQ0FDL0JxQixFQUFFLEdBQUcxRSxDQUFDLEVBQUUyRSxFQUFFLEVBQ1ZDLEVBQUUsR0FBRzVFLENBQUMsRUFBRTJFLEVBQUUsRUFDVkQsRUFBRSxFQUFNRyxFQUFFLEVBQ1ZILEVBQUUsRUFBTUcsRUFBRSxFQUNWRCxFQUFFLEdBQUc1RSxDQUFDLEVBQUUyRSxFQUFFLEVBQ1ZDLEVBQUUsRUFBTUMsRUFBRSxDQUNWLENBQUM7O01BRUY7TUFDQTtNQUNBOztNQUVBOUMsRUFBRSxDQUFDcUIsVUFBVSxDQUFDckIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFNEIsTUFBTSxFQUFFL0MsRUFBRSxDQUFDZ0QsV0FBVyxDQUFDO0lBQ3ZEO0VBQUM7SUFBQTlXLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUE4VyxTQUFTQSxDQUFDRixNQUFNLEVBQUVHLEVBQUUsRUFBRUMsRUFBRSxFQUN4QjtNQUNDLElBQU1DLE1BQU0sR0FBRyxDQUNkLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRUYsRUFBRSxDQUFDLEVBQ1YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFQyxFQUFFLENBQUMsRUFDVixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUcsQ0FBQyxDQUFDLENBQ1Y7TUFFRCxJQUFNRSxNQUFNLEdBQUcsRUFBRTtNQUVqQixLQUFJLElBQUluVCxDQUFDLEdBQUcsQ0FBQyxFQUFFQSxDQUFDLEdBQUc2UyxNQUFNLENBQUN0VCxNQUFNLEVBQUVTLENBQUMsSUFBSSxDQUFDLEVBQ3hDO1FBQ0MsSUFBTW9ULEtBQUssR0FBRyxDQUFDUCxNQUFNLENBQUM3UyxDQUFDLENBQUMsRUFBRTZTLE1BQU0sQ0FBQzdTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFBQyxJQUFBcVQsU0FBQSxHQUFBNUYsMEJBQUEsQ0FFM0J5RixNQUFNO1VBQUFJLEtBQUE7UUFBQTtVQUF2QixLQUFBRCxTQUFBLENBQUF0RixDQUFBLE1BQUF1RixLQUFBLEdBQUFELFNBQUEsQ0FBQXBVLENBQUEsSUFBQStPLElBQUEsR0FDQTtZQUFBLElBRFV1RixHQUFHLEdBQUFELEtBQUEsQ0FBQXJYLEtBQUE7WUFFWmtYLE1BQU0sQ0FBQy9MLElBQUksQ0FDVmdNLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBR0csR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUNmSCxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUdHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FDakJILEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBR0csR0FBRyxDQUFDLENBQUMsQ0FDbkIsQ0FBQztVQUNGO1FBQUMsU0FBQUMsR0FBQTtVQUFBSCxTQUFBLENBQUFqVSxDQUFBLENBQUFvVSxHQUFBO1FBQUE7VUFBQUgsU0FBQSxDQUFBcEYsQ0FBQTtRQUFBO01BQ0Y7TUFFQSxPQUFPLElBQUltRCxZQUFZLENBQUMrQixNQUFNLENBQUNNLE1BQU0sQ0FBQyxVQUFDQyxDQUFDLEVBQUVqUSxDQUFDO1FBQUEsT0FBSyxDQUFDLENBQUMsR0FBR0EsQ0FBQyxJQUFJLENBQUM7TUFBQSxFQUFDLENBQUM7SUFDOUQ7RUFBQztJQUFBekgsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQTBYLE1BQU1BLENBQUNkLE1BQU0sRUFBRWUsS0FBSyxFQUNwQjtNQUNDLElBQU03RixDQUFDLEdBQUd6RixJQUFJLENBQUN1TCxHQUFHLENBQUNELEtBQUssQ0FBQztNQUN6QixJQUFNRSxDQUFDLEdBQUd4TCxJQUFJLENBQUN5TCxHQUFHLENBQUNILEtBQUssQ0FBQztNQUV6QixJQUFNVixNQUFNLEdBQUcsQ0FDZCxDQUFDWSxDQUFDLEVBQUUsQ0FBQy9GLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDVixDQUFDQSxDQUFDLEVBQUcrRixDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ1YsQ0FBQyxDQUFDLEVBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNWO01BRUQsSUFBTVgsTUFBTSxHQUFHLEVBQUU7TUFFakIsS0FBSSxJQUFJblQsQ0FBQyxHQUFHLENBQUMsRUFBRUEsQ0FBQyxHQUFHNlMsTUFBTSxDQUFDdFQsTUFBTSxFQUFFUyxDQUFDLElBQUksQ0FBQyxFQUN4QztRQUNDLElBQU1vVCxLQUFLLEdBQUcsQ0FBQ1AsTUFBTSxDQUFDN1MsQ0FBQyxDQUFDLEVBQUU2UyxNQUFNLENBQUM3UyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQUMsSUFBQWdVLFVBQUEsR0FBQXZHLDBCQUFBLENBRTNCeUYsTUFBTTtVQUFBZSxNQUFBO1FBQUE7VUFBdkIsS0FBQUQsVUFBQSxDQUFBakcsQ0FBQSxNQUFBa0csTUFBQSxHQUFBRCxVQUFBLENBQUEvVSxDQUFBLElBQUErTyxJQUFBLEdBQ0E7WUFBQSxJQURVdUYsR0FBRyxHQUFBVSxNQUFBLENBQUFoWSxLQUFBO1lBRVprWCxNQUFNLENBQUMvTCxJQUFJLENBQ1ZnTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUdHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FDZkgsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQ2pCSCxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUdHLEdBQUcsQ0FBQyxDQUFDLENBQ25CLENBQUM7VUFDRjtRQUFDLFNBQUFDLEdBQUE7VUFBQVEsVUFBQSxDQUFBNVUsQ0FBQSxDQUFBb1UsR0FBQTtRQUFBO1VBQUFRLFVBQUEsQ0FBQS9GLENBQUE7UUFBQTtNQUNGO01BRUEsT0FBTyxJQUFJbUQsWUFBWSxDQUFDK0IsTUFBTSxDQUFDTSxNQUFNLENBQUMsVUFBQ0MsQ0FBQyxFQUFFalEsQ0FBQztRQUFBLE9BQUssQ0FBQyxDQUFDLEdBQUdBLENBQUMsSUFBSSxDQUFDO01BQUEsRUFBQyxDQUFDO0lBQzlEO0VBQUM7SUFBQXpILEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFpWSxLQUFLQSxDQUFBLEVBQ0wsQ0FFQTtFQUFDO0lBQUFsWSxHQUFBO0lBQUFDLEtBQUEsRUE1SUQsU0FBTzZVLFdBQVdBLENBQUNuSixJQUFJLEVBQUV3TSxRQUFRLEVBQ2pDO01BQ0MsSUFBTXJFLEVBQUUsR0FBR25JLElBQUksQ0FBQy9MLE9BQU87TUFFdkIsSUFBRyxDQUFDLElBQUksQ0FBQ3dZLFFBQVEsRUFDakI7UUFDQyxJQUFJLENBQUNBLFFBQVEsR0FBRyxDQUFDLENBQUM7TUFDbkI7TUFFQSxJQUFHLElBQUksQ0FBQ0EsUUFBUSxDQUFDRCxRQUFRLENBQUMsRUFDMUI7UUFDQyxPQUFPLElBQUksQ0FBQ0MsUUFBUSxDQUFDRCxRQUFRLENBQUM7TUFDL0I7TUFFQSxJQUFJLENBQUNDLFFBQVEsQ0FBQ0QsUUFBUSxDQUFDLEdBQUd4UCxNQUFNLENBQUMwUCxTQUFTLENBQUNGLFFBQVEsQ0FBQyxDQUFDekQsSUFBSSxDQUFDLFVBQUNLLEtBQUssRUFBRztRQUNsRSxJQUFNaEIsT0FBTyxHQUFHRCxFQUFFLENBQUNFLGFBQWEsQ0FBQyxDQUFDO1FBRWxDRixFQUFFLENBQUNHLFdBQVcsQ0FBQ0gsRUFBRSxDQUFDSSxVQUFVLEVBQUVILE9BQU8sQ0FBQztRQUV0Q0QsRUFBRSxDQUFDd0UsYUFBYSxDQUFDeEUsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQ3lFLGNBQWMsRUFBRXpFLEVBQUUsQ0FBQzBFLGFBQWEsQ0FBQztRQUNwRTFFLEVBQUUsQ0FBQ3dFLGFBQWEsQ0FBQ3hFLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUMyRSxjQUFjLEVBQUUzRSxFQUFFLENBQUMwRSxhQUFhLENBQUM7UUFDcEUxRSxFQUFFLENBQUN3RSxhQUFhLENBQUN4RSxFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDNEUsa0JBQWtCLEVBQUU1RSxFQUFFLENBQUM2RSxPQUFPLENBQUM7UUFDbEU3RSxFQUFFLENBQUN3RSxhQUFhLENBQUN4RSxFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDOEUsa0JBQWtCLEVBQUU5RSxFQUFFLENBQUM2RSxPQUFPLENBQUM7UUFFbEU3RSxFQUFFLENBQUNRLFVBQVUsQ0FDWlIsRUFBRSxDQUFDSSxVQUFVLEVBQ1gsQ0FBQyxFQUNESixFQUFFLENBQUNTLElBQUksRUFDUFQsRUFBRSxDQUFDUyxJQUFJLEVBQ1BULEVBQUUsQ0FBQ1UsYUFBYSxFQUNoQk8sS0FDSCxDQUFDO1FBRUQsT0FBTztVQUFDQSxLQUFLLEVBQUxBLEtBQUs7VUFBRWhCLE9BQU8sRUFBUEE7UUFBTyxDQUFDO01BQ3hCLENBQUMsQ0FBQztNQUVGLE9BQU8sSUFBSSxDQUFDcUUsUUFBUSxDQUFDRCxRQUFRLENBQUM7SUFDL0I7RUFBQztJQUFBblksR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBT29ZLFNBQVNBLENBQUN6UCxHQUFHLEVBQ3BCO01BQ0MsT0FBTyxJQUFJeU4sT0FBTyxDQUFDLFVBQUN3QyxNQUFNLEVBQUVDLE1BQU0sRUFBRztRQUNwQyxJQUFNL0QsS0FBSyxHQUFHLElBQUlnRSxLQUFLLENBQUMsQ0FBQztRQUN6QmhFLEtBQUssQ0FBQ25NLEdBQUcsR0FBS0EsR0FBRztRQUNqQm1NLEtBQUssQ0FBQ3hLLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxVQUFDb0MsS0FBSyxFQUFHO1VBQ3ZDa00sTUFBTSxDQUFDOUQsS0FBSyxDQUFDO1FBQ2QsQ0FBQyxDQUFDO01BQ0gsQ0FBQyxDQUFDO0lBQ0g7RUFBQztBQUFBOzs7Ozs7Ozs7O0FDcFNGLElBQUExUyxJQUFBLEdBQUFyQixPQUFBO0FBQ0EsSUFBQWdZLFdBQUEsR0FBQWhZLE9BQUE7QUFFQSxJQUFBaVksS0FBQSxHQUFBalksT0FBQTtBQUNBLElBQUE2QixPQUFBLEdBQUE3QixPQUFBO0FBQ0EsSUFBQStCLE9BQUEsR0FBQS9CLE9BQUE7QUFDQSxJQUFBMk4sU0FBQSxHQUFBM04sT0FBQTtBQUNBLElBQUF3QixZQUFBLEdBQUF4QixPQUFBO0FBQTRDLFNBQUFrRCxRQUFBVixDQUFBLHNDQUFBVSxPQUFBLHdCQUFBQyxNQUFBLHVCQUFBQSxNQUFBLENBQUF5SyxRQUFBLGFBQUFwTCxDQUFBLGtCQUFBQSxDQUFBLGdCQUFBQSxDQUFBLFdBQUFBLENBQUEseUJBQUFXLE1BQUEsSUFBQVgsQ0FBQSxDQUFBc0IsV0FBQSxLQUFBWCxNQUFBLElBQUFYLENBQUEsS0FBQVcsTUFBQSxDQUFBSixTQUFBLHFCQUFBUCxDQUFBLEtBQUFVLE9BQUEsQ0FBQVYsQ0FBQTtBQUFBLFNBQUFsRSxnQkFBQTBELENBQUEsRUFBQUMsQ0FBQSxVQUFBRCxDQUFBLFlBQUFDLENBQUEsYUFBQUMsU0FBQTtBQUFBLFNBQUFDLGtCQUFBQyxDQUFBLEVBQUFDLENBQUEsYUFBQUMsQ0FBQSxNQUFBQSxDQUFBLEdBQUFELENBQUEsQ0FBQUUsTUFBQSxFQUFBRCxDQUFBLFVBQUFFLENBQUEsR0FBQUgsQ0FBQSxDQUFBQyxDQUFBLEdBQUFFLENBQUEsQ0FBQUMsVUFBQSxHQUFBRCxDQUFBLENBQUFDLFVBQUEsUUFBQUQsQ0FBQSxDQUFBRSxZQUFBLGtCQUFBRixDQUFBLEtBQUFBLENBQUEsQ0FBQUcsUUFBQSxRQUFBQyxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxFQUFBVSxjQUFBLENBQUFOLENBQUEsQ0FBQXhELEdBQUEsR0FBQXdELENBQUE7QUFBQSxTQUFBbkUsYUFBQStELENBQUEsRUFBQUMsQ0FBQSxFQUFBQyxDQUFBLFdBQUFELENBQUEsSUFBQUYsaUJBQUEsQ0FBQUMsQ0FBQSxDQUFBVyxTQUFBLEVBQUFWLENBQUEsR0FBQUMsQ0FBQSxJQUFBSCxpQkFBQSxDQUFBQyxDQUFBLEVBQUFFLENBQUEsR0FBQU0sTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsaUJBQUFPLFFBQUEsU0FBQVAsQ0FBQTtBQUFBLFNBQUFVLGVBQUFSLENBQUEsUUFBQVUsQ0FBQSxHQUFBQyxZQUFBLENBQUFYLENBQUEsZ0NBQUFZLE9BQUEsQ0FBQUYsQ0FBQSxJQUFBQSxDQUFBLEdBQUFBLENBQUE7QUFBQSxTQUFBQyxhQUFBWCxDQUFBLEVBQUFELENBQUEsb0JBQUFhLE9BQUEsQ0FBQVosQ0FBQSxNQUFBQSxDQUFBLFNBQUFBLENBQUEsTUFBQUYsQ0FBQSxHQUFBRSxDQUFBLENBQUFhLE1BQUEsQ0FBQUMsV0FBQSxrQkFBQWhCLENBQUEsUUFBQVksQ0FBQSxHQUFBWixDQUFBLENBQUFpQixJQUFBLENBQUFmLENBQUEsRUFBQUQsQ0FBQSxnQ0FBQWEsT0FBQSxDQUFBRixDQUFBLFVBQUFBLENBQUEsWUFBQWQsU0FBQSx5RUFBQUcsQ0FBQSxHQUFBaUIsTUFBQSxHQUFBQyxNQUFBLEVBQUFqQixDQUFBO0FBQUEsSUFFL0IrRSxXQUFXLEdBQUFqSixPQUFBLENBQUFpSixXQUFBO0VBRXZCLFNBQUFBLFlBQVk1SSxPQUFPLEVBQUVrSSxHQUFHLEVBQ3hCO0lBQUEsSUFBQXZCLEtBQUE7SUFBQTlHLGVBQUEsT0FBQStJLFdBQUE7SUFDQyxJQUFJLENBQUN5RyxrQkFBUSxDQUFDOEQsT0FBTyxDQUFDLEdBQUcsSUFBSTtJQUU3QixJQUFJLENBQUNqTCxHQUFHLEdBQUdBLEdBQUc7SUFDZCxJQUFJLENBQUN5QixPQUFPLEdBQUcsSUFBSTFDLFFBQUcsQ0FBRCxDQUFDO0lBRXRCLElBQUksQ0FBQ3dTLEtBQUssR0FBRztNQUNaek4sQ0FBQyxFQUFFLElBQUk7TUFDTEMsQ0FBQyxFQUFFLElBQUk7TUFDUHlOLE1BQU0sRUFBRSxJQUFJO01BQ1pDLE1BQU0sRUFBRTtJQUNYLENBQUM7SUFFRGxRLGNBQU0sQ0FBQ0osS0FBSyxHQUFJckosT0FBTyxDQUFDcUosS0FBSztJQUM3QkksY0FBTSxDQUFDSCxNQUFNLEdBQUd0SixPQUFPLENBQUNzSixNQUFNO0lBRTlCLElBQUksQ0FBQzRDLElBQUksR0FBRyxJQUFJbk0sVUFBSSxDQUFDQyxPQUFPLENBQUM7SUFFN0IsSUFBTXFVLEVBQUUsR0FBRyxJQUFJLENBQUNuSSxJQUFJLENBQUMvTCxPQUFPO0lBRTVCa1UsRUFBRSxDQUFDdUYsU0FBUyxDQUFDdkYsRUFBRSxDQUFDd0YsU0FBUyxFQUFFeEYsRUFBRSxDQUFDeUYsbUJBQW1CLENBQUM7SUFDbER6RixFQUFFLENBQUMwRixNQUFNLENBQUMxRixFQUFFLENBQUMyRixLQUFLLENBQUM7SUFFbkIsSUFBSSxDQUFDclosT0FBTyxHQUFHLElBQUksQ0FBQ3VMLElBQUksQ0FBQ2pLLGFBQWEsQ0FDckMsSUFBSSxDQUFDaUssSUFBSSxDQUFDdEwsWUFBWSxDQUFDLHFCQUFxQixDQUFDLEVBQzNDLElBQUksQ0FBQ3NMLElBQUksQ0FBQ3RMLFlBQVksQ0FBQyxxQkFBcUIsQ0FDL0MsQ0FBQzs7SUFFRDtJQUNBO0lBQ0E7SUFDQTs7SUFFQXlULEVBQUUsQ0FBQzRGLFVBQVUsQ0FBQyxJQUFJLENBQUN0WixPQUFPLENBQUM7SUFFM0IsSUFBSSxDQUFDb1csY0FBYyxHQUFHMUMsRUFBRSxDQUFDNkYsWUFBWSxDQUFDLENBQUM7SUFDdkMsSUFBSSxDQUFDekUsY0FBYyxHQUFHcEIsRUFBRSxDQUFDNkYsWUFBWSxDQUFDLENBQUM7SUFDdkMsSUFBSSxDQUFDQyxjQUFjLEdBQUc5RixFQUFFLENBQUM2RixZQUFZLENBQUMsQ0FBQztJQUV2QyxJQUFJLENBQUNFLGdCQUFnQixHQUFHL0YsRUFBRSxDQUFDZ0csaUJBQWlCLENBQUMsSUFBSSxDQUFDMVosT0FBTyxFQUFFLFlBQVksQ0FBQztJQUN4RSxJQUFJLENBQUMyWixnQkFBZ0IsR0FBR2pHLEVBQUUsQ0FBQ2dHLGlCQUFpQixDQUFDLElBQUksQ0FBQzFaLE9BQU8sRUFBRSxZQUFZLENBQUM7SUFDeEUsSUFBSSxDQUFDNFosZ0JBQWdCLEdBQUdsRyxFQUFFLENBQUNnRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMxWixPQUFPLEVBQUUsWUFBWSxDQUFDO0lBRXhFLElBQUksQ0FBQzZaLGFBQWEsR0FBUW5HLEVBQUUsQ0FBQ29HLGtCQUFrQixDQUFDLElBQUksQ0FBQzlaLE9BQU8sRUFBRSxTQUFTLENBQUM7SUFDeEUsSUFBSSxDQUFDK1osY0FBYyxHQUFPckcsRUFBRSxDQUFDb0csa0JBQWtCLENBQUMsSUFBSSxDQUFDOVosT0FBTyxFQUFFLFVBQVUsQ0FBQztJQUN6RSxJQUFJLENBQUNnYSxrQkFBa0IsR0FBR3RHLEVBQUUsQ0FBQ29HLGtCQUFrQixDQUFDLElBQUksQ0FBQzlaLE9BQU8sRUFBRSxjQUFjLENBQUM7SUFDN0UsSUFBSSxDQUFDaWEsYUFBYSxHQUFRdkcsRUFBRSxDQUFDb0csa0JBQWtCLENBQUMsSUFBSSxDQUFDOVosT0FBTyxFQUFFLFNBQVMsQ0FBQztJQUN4RSxJQUFJLENBQUNrYSxlQUFlLEdBQU14RyxFQUFFLENBQUNvRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM5WixPQUFPLEVBQUUsVUFBVSxDQUFDO0lBQ3pFLElBQUksQ0FBQ21hLGNBQWMsR0FBT3pHLEVBQUUsQ0FBQ29HLGtCQUFrQixDQUFDLElBQUksQ0FBQzlaLE9BQU8sRUFBRSxVQUFVLENBQUM7SUFDekUsSUFBSSxDQUFDcVYsWUFBWSxHQUFTM0IsRUFBRSxDQUFDb0csa0JBQWtCLENBQUMsSUFBSSxDQUFDOVosT0FBTyxFQUFFLFFBQVEsQ0FBQztJQUN2RSxJQUFJLENBQUNvYSxhQUFhLEdBQVExRyxFQUFFLENBQUNvRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM5WixPQUFPLEVBQUUsU0FBUyxDQUFDO0lBQ3hFLElBQUksQ0FBQ21WLGNBQWMsR0FBT3pCLEVBQUUsQ0FBQ29HLGtCQUFrQixDQUFDLElBQUksQ0FBQzlaLE9BQU8sRUFBRSxVQUFVLENBQUM7SUFDekUsSUFBSSxDQUFDcWEsWUFBWSxHQUFTM0csRUFBRSxDQUFDb0csa0JBQWtCLENBQUMsSUFBSSxDQUFDOVosT0FBTyxFQUFFLFFBQVEsQ0FBQzs7SUFFdkU7SUFDQTtJQUNBOztJQUVBMFQsRUFBRSxDQUFDa0IsVUFBVSxDQUFDbEIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUksQ0FBQ3VCLGNBQWMsQ0FBQztJQUNuRDFDLEVBQUUsQ0FBQzRHLHVCQUF1QixDQUFDLElBQUksQ0FBQ2IsZ0JBQWdCLENBQUM7SUFDakQvRixFQUFFLENBQUM2RyxtQkFBbUIsQ0FDckIsSUFBSSxDQUFDZCxnQkFBZ0IsRUFDbkIsQ0FBQyxFQUNEL0YsRUFBRSxDQUFDOEcsS0FBSyxFQUNSLEtBQUssRUFDTCxDQUFDLEVBQ0QsQ0FDSCxDQUFDO0lBRUQ5RyxFQUFFLENBQUM0Ryx1QkFBdUIsQ0FBQyxJQUFJLENBQUNYLGdCQUFnQixDQUFDO0lBQ2pEakcsRUFBRSxDQUFDa0IsVUFBVSxDQUFDbEIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUksQ0FBQ0MsY0FBYyxDQUFDO0lBQ25EcEIsRUFBRSxDQUFDNkcsbUJBQW1CLENBQ3JCLElBQUksQ0FBQ1osZ0JBQWdCLEVBQ25CLENBQUMsRUFDRGpHLEVBQUUsQ0FBQzhHLEtBQUssRUFDUixLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQ0gsQ0FBQztJQUVELElBQUksQ0FBQ0MsU0FBUyxHQUFHL0csRUFBRSxDQUFDRSxhQUFhLENBQUMsQ0FBQztJQUNuQ0YsRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQzJHLFNBQVMsQ0FBQztJQUM3Qy9HLEVBQUUsQ0FBQ1EsVUFBVSxDQUNaUixFQUFFLENBQUNJLFVBQVUsRUFDWCxDQUFDLEVBQ0RKLEVBQUUsQ0FBQ1MsSUFBSSxFQUNQLElBQUksRUFDSixJQUFJLEVBQ0osQ0FBQyxFQUNEVCxFQUFFLENBQUNTLElBQUksRUFDUFQsRUFBRSxDQUFDVSxhQUFhLEVBQ2hCLElBQ0gsQ0FBQztJQUVEVixFQUFFLENBQUN3RSxhQUFhLENBQUN4RSxFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDeUUsY0FBYyxFQUFFekUsRUFBRSxDQUFDMEUsYUFBYSxDQUFDO0lBQ3BFMUUsRUFBRSxDQUFDd0UsYUFBYSxDQUFDeEUsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQzJFLGNBQWMsRUFBRTNFLEVBQUUsQ0FBQzBFLGFBQWEsQ0FBQztJQUVwRTFFLEVBQUUsQ0FBQ3dFLGFBQWEsQ0FBQ3hFLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUM0RSxrQkFBa0IsRUFBRTVFLEVBQUUsQ0FBQzZFLE9BQU8sQ0FBQztJQUNsRTdFLEVBQUUsQ0FBQ3dFLGFBQWEsQ0FBQ3hFLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUM4RSxrQkFBa0IsRUFBRTlFLEVBQUUsQ0FBQzZFLE9BQU8sQ0FBQztJQUVsRSxJQUFJLENBQUNtQyxXQUFXLEdBQUdoSCxFQUFFLENBQUNFLGFBQWEsQ0FBQyxDQUFDO0lBQ3JDRixFQUFFLENBQUNHLFdBQVcsQ0FBQ0gsRUFBRSxDQUFDSSxVQUFVLEVBQUUsSUFBSSxDQUFDNEcsV0FBVyxDQUFDO0lBQy9DaEgsRUFBRSxDQUFDUSxVQUFVLENBQ1pSLEVBQUUsQ0FBQ0ksVUFBVSxFQUNYLENBQUMsRUFDREosRUFBRSxDQUFDUyxJQUFJLEVBQ1AsSUFBSSxFQUNKLElBQUksRUFDSixDQUFDLEVBQ0RULEVBQUUsQ0FBQ1MsSUFBSSxFQUNQVCxFQUFFLENBQUNVLGFBQWEsRUFDaEIsSUFDSCxDQUFDO0lBRURWLEVBQUUsQ0FBQ3dFLGFBQWEsQ0FBQ3hFLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUN5RSxjQUFjLEVBQUV6RSxFQUFFLENBQUMwRSxhQUFhLENBQUM7SUFDcEUxRSxFQUFFLENBQUN3RSxhQUFhLENBQUN4RSxFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDMkUsY0FBYyxFQUFFM0UsRUFBRSxDQUFDMEUsYUFBYSxDQUFDO0lBRXBFMUUsRUFBRSxDQUFDd0UsYUFBYSxDQUFDeEUsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQzRFLGtCQUFrQixFQUFFNUUsRUFBRSxDQUFDNkUsT0FBTyxDQUFDO0lBQ2xFN0UsRUFBRSxDQUFDd0UsYUFBYSxDQUFDeEUsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQzhFLGtCQUFrQixFQUFFOUUsRUFBRSxDQUFDNkUsT0FBTyxDQUFDO0lBRWxFLElBQUksQ0FBQzlDLFVBQVUsR0FBRy9CLEVBQUUsQ0FBQ2lILGlCQUFpQixDQUFDLENBQUM7SUFDeENqSCxFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDQyxVQUFVLENBQUM7SUFDbkQvQixFQUFFLENBQUNrSCxvQkFBb0IsQ0FDdEJsSCxFQUFFLENBQUM4QixXQUFXLEVBQ1o5QixFQUFFLENBQUNtSCxpQkFBaUIsRUFDcEJuSCxFQUFFLENBQUNJLFVBQVUsRUFDYixJQUFJLENBQUMyRyxTQUFTLEVBQ2QsQ0FDSCxDQUFDO0lBRUQsSUFBSSxDQUFDN0UsWUFBWSxHQUFHbEMsRUFBRSxDQUFDaUgsaUJBQWlCLENBQUMsQ0FBQztJQUMxQ2pILEVBQUUsQ0FBQzZCLGVBQWUsQ0FBQzdCLEVBQUUsQ0FBQzhCLFdBQVcsRUFBRSxJQUFJLENBQUNJLFlBQVksQ0FBQztJQUNyRGxDLEVBQUUsQ0FBQ2tILG9CQUFvQixDQUN0QmxILEVBQUUsQ0FBQzhCLFdBQVcsRUFDWjlCLEVBQUUsQ0FBQ21ILGlCQUFpQixFQUNwQm5ILEVBQUUsQ0FBQ0ksVUFBVSxFQUNiLElBQUksQ0FBQzRHLFdBQVcsRUFDaEIsQ0FDSCxDQUFDO0lBRURwYixRQUFRLENBQUM2SyxnQkFBZ0IsQ0FDeEIsV0FBVyxFQUFFLFVBQUNvQyxLQUFLLEVBQUc7TUFDckJ2RyxLQUFJLENBQUM4UyxLQUFLLENBQUN6TixDQUFDLEdBQUdrQixLQUFLLENBQUN1TyxPQUFPO01BQzVCOVUsS0FBSSxDQUFDOFMsS0FBSyxDQUFDeE4sQ0FBQyxHQUFHaUIsS0FBSyxDQUFDd08sT0FBTztJQUM3QixDQUNELENBQUM7SUFFRCxJQUFJLENBQUM1UixRQUFRLEdBQUc7TUFDZmEsTUFBTSxFQUFLLElBQUk7TUFDYmdSLE1BQU0sRUFBRyxJQUFJO01BQ2I1UixPQUFPLEVBQUUsSUFBSTtNQUNiTyxPQUFPLEVBQUUsSUFBSTtNQUNiTixZQUFZLEVBQUUsSUFBSTtNQUNsQkksWUFBWSxFQUFFO0lBQ2pCLENBQUM7SUFFRCxJQUFJLENBQUNOLFFBQVEsR0FBR3VGLGtCQUFRLENBQUNDLFlBQVksQ0FBQyxJQUFJLENBQUN4RixRQUFRLENBQUM7SUFFcEQsSUFBSSxDQUFDOFIsVUFBVSxHQUFJLElBQUloTCxzQkFBVSxDQUFDLElBQUksRUFBRTFJLEdBQUcsQ0FBQztJQUM1QyxJQUFNMlQsQ0FBQyxHQUFHLEdBQUc7SUFDYixJQUFNeFQsV0FBVyxHQUFHLElBQUlDLHdCQUFXLENBQUQsQ0FBQztJQUVuQyxLQUFJLElBQU0vRCxDQUFDLElBQUkwTixLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM2SixJQUFJLENBQUMsQ0FBQyxFQUMvQjtNQUNDLElBQU1DLE1BQU0sR0FBRyxJQUFJN1MsY0FBTSxDQUFDO1FBQ3pCQyxHQUFHLEVBQUUsWUFBWTtRQUNqQmhCLFdBQVcsRUFBRSxJQUFJO1FBQ2pCRSxXQUFXLEVBQVhBO01BQ0QsQ0FBQyxDQUFDO01BQ0YwVCxNQUFNLENBQUMvUCxDQUFDLEdBQUcsRUFBRSxHQUFJekgsQ0FBQyxHQUFHLEVBQUUsR0FBSXNYLENBQUM7TUFDNUJFLE1BQU0sQ0FBQzlQLENBQUMsR0FBR1ksSUFBSSxDQUFDQyxLQUFLLENBQUV2SSxDQUFDLEdBQUcsRUFBRSxHQUFJc1gsQ0FBQyxDQUFDLEdBQUcsRUFBRTtNQUN4QyxJQUFJLENBQUNsUyxPQUFPLENBQUNELEdBQUcsQ0FBQ3FTLE1BQU0sQ0FBQztJQUN6QjtJQUVBLElBQUksQ0FBQ3BTLE9BQU8sQ0FBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQ2tTLFVBQVUsQ0FBQztJQUVqQyxJQUFJLENBQUNoUyxTQUFTLEdBQUcsSUFBSTtFQUN0QjtFQUFDLE9BQUFoSyxZQUFBLENBQUFnSixXQUFBO0lBQUFySSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBNEgsUUFBUUEsQ0FBQSxFQUNSO01BQ0MsSUFBRyxJQUFJLENBQUMwQixRQUFRLENBQUNhLE1BQU0sS0FBSyxJQUFJLEVBQ2hDO1FBQ0MsT0FBTyxLQUFLO01BQ2I7TUFFQSxJQUFJLENBQUNiLFFBQVEsQ0FBQ2EsTUFBTSxHQUFJLElBQUk7TUFDNUIsSUFBSSxDQUFDYixRQUFRLENBQUM2UixNQUFNLEdBQUksSUFBSTtNQUM1QixJQUFJLENBQUM3UixRQUFRLENBQUNDLE9BQU8sR0FBRyxJQUFJO01BQzVCLElBQUksQ0FBQ0QsUUFBUSxDQUFDUSxPQUFPLEdBQUcsSUFBSTtNQUU1QixPQUFPLElBQUk7SUFDWjtFQUFDO0lBQUEvSixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBc0wsSUFBSUEsQ0FBQSxFQUNKO01BQ0MsSUFBRyxJQUFJLENBQUNsQyxTQUFTLEVBQ2pCO1FBQ0NILGNBQU0sQ0FBQ3VDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUNwQyxTQUFTLENBQUNYLE1BQU0sQ0FBQytDLENBQUMsSUFBSSxJQUFJLENBQUNFLElBQUksQ0FBQzVMLFNBQVMsSUFBSSxDQUFDO1FBQ3BFbUosY0FBTSxDQUFDd0MsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQ3JDLFNBQVMsQ0FBQ1gsTUFBTSxDQUFDZ0QsQ0FBQyxJQUFJLElBQUksQ0FBQ0MsSUFBSSxDQUFDNUwsU0FBUyxJQUFJLENBQUM7TUFDckU7TUFFQSxJQUFNK1QsRUFBRSxHQUFHLElBQUksQ0FBQ25JLElBQUksQ0FBQy9MLE9BQU87TUFFNUJrVSxFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDSSxZQUFZLENBQUM7TUFFckRsQyxFQUFFLENBQUMySCxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO01BQ3pCM0gsRUFBRSxDQUFDNEgsS0FBSyxDQUFDNUgsRUFBRSxDQUFDNkgsZ0JBQWdCLENBQUM7TUFFN0I3SCxFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDQyxVQUFVLENBQUM7TUFFbkQvQixFQUFFLENBQUM4SCxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTlILEVBQUUsQ0FBQ3ZMLE1BQU0sQ0FBQ08sS0FBSyxFQUFFZ0wsRUFBRSxDQUFDdkwsTUFBTSxDQUFDUSxNQUFNLENBQUM7TUFFcEQrSyxFQUFFLENBQUMwQixTQUFTLENBQ1gsSUFBSSxDQUFDNEUsa0JBQWtCLEVBQ3JCdEcsRUFBRSxDQUFDdkwsTUFBTSxDQUFDTyxLQUFLLEVBQ2ZnTCxFQUFFLENBQUN2TCxNQUFNLENBQUNRLE1BQ2IsQ0FBQztNQUVEK0ssRUFBRSxDQUFDK0gsU0FBUyxDQUNYLElBQUksQ0FBQ3RCLGNBQWMsRUFDakIsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUNILENBQUM7TUFFRHpHLEVBQUUsQ0FBQzBCLFNBQVMsQ0FDWCxJQUFJLENBQUNDLFlBQVksRUFDZnZNLGNBQU0sQ0FBQ0osS0FBSyxFQUNaSSxjQUFNLENBQUNILE1BQ1YsQ0FBQztNQUVEK0ssRUFBRSxDQUFDMEIsU0FBUyxDQUNYLElBQUksQ0FBQ2dGLGFBQWEsRUFDaEIsSUFBSSxDQUFDN08sSUFBSSxDQUFDNUwsU0FBUyxFQUNuQixJQUFJLENBQUM0TCxJQUFJLENBQUM1TCxTQUNiLENBQUM7TUFFRCtULEVBQUUsQ0FBQ3dCLFNBQVMsQ0FDWCxJQUFJLENBQUNDLGNBQWMsRUFDakIsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FDSCxDQUFDO01BRUR6QixFQUFFLENBQUMySCxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO01BQ3pCM0gsRUFBRSxDQUFDNEgsS0FBSyxDQUFDNUgsRUFBRSxDQUFDNkgsZ0JBQWdCLENBQUM7TUFFN0IsSUFBSXZTLE9BQU8sR0FBRyxJQUFJLENBQUNBLE9BQU8sQ0FBQzhCLEtBQUssQ0FBQyxDQUFDO01BRWxDOUIsT0FBTyxDQUFDbUksT0FBTyxDQUFDLFVBQUFRLENBQUM7UUFBQSxPQUFJQSxDQUFDLENBQUNjLENBQUMsR0FBR2QsQ0FBQyxZQUFZMUIsc0JBQVUsR0FBRyxDQUFDLENBQUMsR0FBRzBCLENBQUMsQ0FBQ3JHLENBQUM7TUFBQSxFQUFDO01BRTlEckYsTUFBTSxDQUFDQyxXQUFXLElBQUloRixPQUFPLENBQUN3YSxJQUFJLENBQUMsTUFBTSxDQUFDO01BRTFDMVMsT0FBTyxDQUFDMlMsSUFBSSxDQUFDLFVBQUMvWSxDQUFDLEVBQUNrSixDQUFDLEVBQUs7UUFDckIsSUFBSWxKLENBQUMsWUFBWXFOLHNCQUFVLElBQUssRUFBRW5FLENBQUMsWUFBWW1FLHNCQUFVLENBQUMsRUFDMUQ7VUFDQyxPQUFPLENBQUMsQ0FBQztRQUNWO1FBRUEsSUFBSW5FLENBQUMsWUFBWW1FLHNCQUFVLElBQUssRUFBRXJOLENBQUMsWUFBWXFOLHNCQUFVLENBQUMsRUFDMUQ7VUFDQyxPQUFPLENBQUM7UUFDVDtRQUVBLElBQUdyTixDQUFDLENBQUM2UCxDQUFDLEtBQUtoSyxTQUFTLEVBQ3BCO1VBQ0MsT0FBTyxDQUFDLENBQUM7UUFDVjtRQUVBLElBQUdxRCxDQUFDLENBQUMyRyxDQUFDLEtBQUtoSyxTQUFTLEVBQ3BCO1VBQ0MsT0FBTyxDQUFDO1FBQ1Q7UUFFQSxPQUFPN0YsQ0FBQyxDQUFDNlAsQ0FBQyxHQUFHM0csQ0FBQyxDQUFDMkcsQ0FBQztNQUNqQixDQUFDLENBQUM7TUFFRixJQUFHeE0sTUFBTSxDQUFDQyxXQUFXLEVBQ3JCO1FBQ0NoRixPQUFPLENBQUMwYSxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ3ZCM1YsTUFBTSxDQUFDQyxXQUFXLEdBQUcsS0FBSztNQUMzQjtNQUVBOEMsT0FBTyxDQUFDbUksT0FBTyxDQUFDLFVBQUFRLENBQUM7UUFBQSxPQUFJQSxDQUFDLENBQUN4RyxJQUFJLENBQUMsQ0FBQztNQUFBLEVBQUM7TUFFOUJ1SSxFQUFFLENBQUMrSCxTQUFTLENBQ1gsSUFBSSxDQUFDdEIsY0FBYyxFQUNqQmpPLElBQUksQ0FBQzJQLEVBQUUsR0FBRyxDQUFDLEVBQ1huUSxXQUFXLENBQUNoQixHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztNQUFBLEVBQ3hCLENBQ0gsQ0FBQztNQUVEZ0osRUFBRSxDQUFDNkIsZUFBZSxDQUFDN0IsRUFBRSxDQUFDOEIsV0FBVyxFQUFFLElBQUksQ0FBQztNQUV4QzlCLEVBQUUsQ0FBQ29JLGFBQWEsQ0FBQ3BJLEVBQUUsQ0FBQ3FJLFFBQVEsQ0FBQztNQUM3QnJJLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUMyRyxTQUFTLENBQUM7TUFDN0MvRyxFQUFFLENBQUNzSSxTQUFTLENBQUMsSUFBSSxDQUFDbkMsYUFBYSxFQUFFLENBQUMsQ0FBQztNQUVuQ25HLEVBQUUsQ0FBQ29JLGFBQWEsQ0FBQ3BJLEVBQUUsQ0FBQ3VJLFFBQVEsQ0FBQztNQUM3QnZJLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUM0RyxXQUFXLENBQUM7TUFDL0NoSCxFQUFFLENBQUNzSSxTQUFTLENBQUMsSUFBSSxDQUFDakMsY0FBYyxFQUFFLENBQUMsQ0FBQztNQUVwQyxJQUFJLENBQUN6RSxZQUFZLENBQ2hCLENBQUMsRUFDQyxJQUFJLENBQUMvSixJQUFJLENBQUNsTSxPQUFPLENBQUNzSixNQUFNLEVBQ3hCLElBQUksQ0FBQzRDLElBQUksQ0FBQ2xNLE9BQU8sQ0FBQ3FKLEtBQUssRUFDdkIsQ0FBQyxJQUFJLENBQUM2QyxJQUFJLENBQUNsTSxPQUFPLENBQUNzSixNQUN0QixDQUFDO01BRUQrSyxFQUFFLENBQUNnQyxVQUFVLENBQUNoQyxFQUFFLENBQUNpQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztNQUVqQ2pDLEVBQUUsQ0FBQytILFNBQVMsQ0FDWCxJQUFJLENBQUN0QixjQUFjLEVBQ2pCLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FDSCxDQUFDO01BRUR6RyxFQUFFLENBQUNvSSxhQUFhLENBQUNwSSxFQUFFLENBQUNxSSxRQUFRLENBQUM7TUFDN0JySSxFQUFFLENBQUNHLFdBQVcsQ0FBQ0gsRUFBRSxDQUFDSSxVQUFVLEVBQUUsSUFBSSxDQUFDO01BQ25DSixFQUFFLENBQUNzSSxTQUFTLENBQUMsSUFBSSxDQUFDbkMsYUFBYSxFQUFFLENBQUMsQ0FBQztNQUVuQ25HLEVBQUUsQ0FBQ29JLGFBQWEsQ0FBQ3BJLEVBQUUsQ0FBQ3VJLFFBQVEsQ0FBQztNQUM3QnZJLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUM7TUFDbkNKLEVBQUUsQ0FBQ3NJLFNBQVMsQ0FBQyxJQUFJLENBQUNqQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO01BRXBDckcsRUFBRSxDQUFDb0ksYUFBYSxDQUFDcEksRUFBRSxDQUFDcUksUUFBUSxDQUFDO0lBRTlCO0VBQUM7SUFBQW5jLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFpSyxNQUFNQSxDQUFDcEIsS0FBSyxFQUFFQyxNQUFNLEVBQ3BCO01BQ0MsSUFBTStLLEVBQUUsR0FBRyxJQUFJLENBQUNuSSxJQUFJLENBQUMvTCxPQUFPO01BRTVCa0osS0FBSyxHQUFJQSxLQUFLLElBQUssSUFBSSxDQUFDNkMsSUFBSSxDQUFDbE0sT0FBTyxDQUFDcUosS0FBSztNQUMxQ0MsTUFBTSxHQUFHQSxNQUFNLElBQUksSUFBSSxDQUFDNEMsSUFBSSxDQUFDbE0sT0FBTyxDQUFDc0osTUFBTTtNQUUzQ0csY0FBTSxDQUFDdUMsQ0FBQyxJQUFJLElBQUksQ0FBQ0UsSUFBSSxDQUFDNUwsU0FBUztNQUMvQm1KLGNBQU0sQ0FBQ3dDLENBQUMsSUFBSSxJQUFJLENBQUNDLElBQUksQ0FBQzVMLFNBQVM7TUFFL0JtSixjQUFNLENBQUNKLEtBQUssR0FBSUEsS0FBSyxHQUFJLElBQUksQ0FBQzZDLElBQUksQ0FBQzVMLFNBQVM7TUFDNUNtSixjQUFNLENBQUNILE1BQU0sR0FBR0EsTUFBTSxHQUFHLElBQUksQ0FBQzRDLElBQUksQ0FBQzVMLFNBQVM7TUFFNUMsSUFBSSxDQUFDc2IsVUFBVSxDQUFDblIsTUFBTSxDQUFDaEIsY0FBTSxDQUFDSixLQUFLLEVBQUVJLGNBQU0sQ0FBQ0gsTUFBTSxDQUFDO01BRW5EK0ssRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQzJHLFNBQVMsQ0FBQztNQUM3Qy9HLEVBQUUsQ0FBQ1EsVUFBVSxDQUNaUixFQUFFLENBQUNJLFVBQVUsRUFDWCxDQUFDLEVBQ0RKLEVBQUUsQ0FBQ1MsSUFBSSxFQUNQckwsY0FBTSxDQUFDSixLQUFLLEdBQUcsSUFBSSxDQUFDNkMsSUFBSSxDQUFDNUwsU0FBUyxFQUNsQ21KLGNBQU0sQ0FBQ0gsTUFBTSxHQUFHLElBQUksQ0FBQzRDLElBQUksQ0FBQzVMLFNBQVMsRUFDbkMsQ0FBQyxFQUNEK1QsRUFBRSxDQUFDUyxJQUFJLEVBQ1BULEVBQUUsQ0FBQ1UsYUFBYSxFQUNoQixJQUNILENBQUM7TUFFRFYsRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQzRHLFdBQVcsQ0FBQztNQUMvQ2hILEVBQUUsQ0FBQ1EsVUFBVSxDQUNaUixFQUFFLENBQUNJLFVBQVUsRUFDWCxDQUFDLEVBQ0RKLEVBQUUsQ0FBQ1MsSUFBSSxFQUNQckwsY0FBTSxDQUFDSixLQUFLLEdBQUcsSUFBSSxDQUFDNkMsSUFBSSxDQUFDNUwsU0FBUyxFQUNsQ21KLGNBQU0sQ0FBQ0gsTUFBTSxHQUFHLElBQUksQ0FBQzRDLElBQUksQ0FBQzVMLFNBQVMsRUFDbkMsQ0FBQyxFQUNEK1QsRUFBRSxDQUFDUyxJQUFJLEVBQ1BULEVBQUUsQ0FBQ1UsYUFBYSxFQUNoQixJQUNILENBQUM7SUFDRjtFQUFDO0lBQUF4VSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBeVYsWUFBWUEsQ0FBQ2pLLENBQUMsRUFBRUMsQ0FBQyxFQUFFNUMsS0FBSyxFQUFFQyxNQUFNLEVBQ2hDO01BQ0MsSUFBTStLLEVBQUUsR0FBRyxJQUFJLENBQUNuSSxJQUFJLENBQUMvTCxPQUFPO01BRTVCa1UsRUFBRSxDQUFDa0IsVUFBVSxDQUFDbEIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUksQ0FBQ3VCLGNBQWMsQ0FBQztNQUVuRCxJQUFNQyxFQUFFLEdBQUdoTCxDQUFDO01BQ1osSUFBTWtMLEVBQUUsR0FBR2xMLENBQUMsR0FBRzNDLEtBQUs7TUFDcEIsSUFBTTROLEVBQUUsR0FBR2hMLENBQUM7TUFDWixJQUFNa0wsRUFBRSxHQUFHbEwsQ0FBQyxHQUFHM0MsTUFBTTtNQUVyQitLLEVBQUUsQ0FBQ3FCLFVBQVUsQ0FBQ3JCLEVBQUUsQ0FBQ21CLFlBQVksRUFBRSxJQUFJRyxZQUFZLENBQUMsQ0FDL0NxQixFQUFFLEVBQUVDLEVBQUUsRUFDTkMsRUFBRSxFQUFFRCxFQUFFLEVBQ05ELEVBQUUsRUFBRUcsRUFBRSxFQUNOSCxFQUFFLEVBQUVHLEVBQUUsRUFDTkQsRUFBRSxFQUFFRCxFQUFFLEVBQ05DLEVBQUUsRUFBRUMsRUFBRSxDQUNOLENBQUMsRUFBRTlDLEVBQUUsQ0FBQ2dELFdBQVcsQ0FBQztJQUNwQjtFQUFDO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7SUNyWlcvTyxXQUFXLEdBQUEzSSxPQUFBLENBQUEySSxXQUFBO0VBRXZCLFNBQUFBLFlBQUEsRUFDQTtJQUFBLElBQUEzQixLQUFBO0lBQUE5RyxlQUFBLE9BQUF5SSxXQUFBO0lBQ0MsSUFBSSxDQUFDdVUsUUFBUSxHQUFHLGtCQUFrQjtJQUNsQyxJQUFJLENBQUNDLFFBQVEsR0FBRyxtQkFBbUI7SUFDbkMsSUFBSSxDQUFDQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLElBQUksQ0FBQ3ZNLE1BQU0sR0FBSyxDQUFDLENBQUM7SUFDbEIsSUFBSSxDQUFDbkgsS0FBSyxHQUFNLENBQUM7SUFDakIsSUFBSSxDQUFDQyxNQUFNLEdBQUssQ0FBQztJQUVqQixJQUFJMFQsT0FBTyxHQUFLLElBQUlDLE9BQU8sQ0FBQyxJQUFJLENBQUNILFFBQVEsQ0FBQztJQUUxQyxJQUFJSSxXQUFXLEdBQUdDLEtBQUssQ0FBQ0gsT0FBTyxDQUFDLENBQy9CL0gsSUFBSSxDQUFDLFVBQUNtSSxRQUFRO01BQUEsT0FBR0EsUUFBUSxDQUFDQyxJQUFJLENBQUMsQ0FBQztJQUFBLEVBQUMsQ0FDakNwSSxJQUFJLENBQUMsVUFBQ3FJLEtBQUs7TUFBQSxPQUFLM1csS0FBSSxDQUFDMlcsS0FBSyxHQUFHQSxLQUFLO0lBQUEsRUFBQztJQUVwQyxJQUFJQyxXQUFXLEdBQUcsSUFBSTNHLE9BQU8sQ0FBQyxVQUFDd0MsTUFBTSxFQUFHO01BQ3ZDelMsS0FBSSxDQUFDMk8sS0FBSyxHQUFVLElBQUlnRSxLQUFLLENBQUMsQ0FBQztNQUMvQjNTLEtBQUksQ0FBQzJPLEtBQUssQ0FBQ25NLEdBQUcsR0FBTXhDLEtBQUksQ0FBQ2tXLFFBQVE7TUFDakNsVyxLQUFJLENBQUMyTyxLQUFLLENBQUNrSSxNQUFNLEdBQUcsWUFBSTtRQUN2QnBFLE1BQU0sQ0FBQyxDQUFDO01BQ1QsQ0FBQztJQUNGLENBQUMsQ0FBQztJQUVGLElBQUksQ0FBQ3BFLEtBQUssR0FBRzRCLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDLENBQUNxRyxXQUFXLEVBQUVLLFdBQVcsQ0FBQyxDQUFDLENBQ25EdEksSUFBSSxDQUFDO01BQUEsT0FBTXRPLEtBQUksQ0FBQzhXLFlBQVksQ0FBQyxDQUFDO0lBQUEsRUFBQyxDQUMvQnhJLElBQUksQ0FBQztNQUFBLE9BQU10TyxLQUFJO0lBQUEsRUFBQztFQUNsQjtFQUFDLE9BQUEvRyxZQUFBLENBQUEwSSxXQUFBO0lBQUEvSCxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBaWQsWUFBWUEsQ0FBQSxFQUNaO01BQUEsSUFBQTlVLE1BQUE7TUFDQyxJQUFHLENBQUMsSUFBSSxDQUFDMlUsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDQSxLQUFLLENBQUM5TSxNQUFNLEVBQ3BDO1FBQ0M7TUFDRDtNQUVBLElBQU0xSCxNQUFNLEdBQUk3SSxRQUFRLENBQUNDLGFBQWEsQ0FBQyxRQUFRLENBQUM7TUFFaEQ0SSxNQUFNLENBQUNPLEtBQUssR0FBSSxJQUFJLENBQUNpTSxLQUFLLENBQUNqTSxLQUFLO01BQ2hDUCxNQUFNLENBQUNRLE1BQU0sR0FBRyxJQUFJLENBQUNnTSxLQUFLLENBQUNoTSxNQUFNO01BRWpDLElBQU1uSixPQUFPLEdBQUcySSxNQUFNLENBQUMxSSxVQUFVLENBQUMsSUFBSSxFQUFFO1FBQUNzZCxrQkFBa0IsRUFBRTtNQUFJLENBQUMsQ0FBQztNQUVuRXZkLE9BQU8sQ0FBQ3dkLFNBQVMsQ0FBQyxJQUFJLENBQUNySSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztNQUVuQyxJQUFNc0ksYUFBYSxHQUFHLEVBQUU7TUFBQyxJQUFBQyxLQUFBLFlBQUFBLE1BQUF0WixDQUFBLEVBR3pCO1FBQ0MsSUFBTXVaLFNBQVMsR0FBSTdkLFFBQVEsQ0FBQ0MsYUFBYSxDQUFDLFFBQVEsQ0FBQztRQUVuRDRkLFNBQVMsQ0FBQ3pVLEtBQUssR0FBSVYsTUFBSSxDQUFDMlUsS0FBSyxDQUFDOU0sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0USxLQUFLLENBQUMwRyxDQUFDO1FBQy9DaUMsU0FBUyxDQUFDeFUsTUFBTSxHQUFHWCxNQUFJLENBQUMyVSxLQUFLLENBQUM5TSxNQUFNLENBQUNqTSxDQUFDLENBQUMsQ0FBQzRRLEtBQUssQ0FBQzRJLENBQUM7UUFFL0MsSUFBTUMsVUFBVSxHQUFHRixTQUFTLENBQUMxZCxVQUFVLENBQUMsSUFBSSxDQUFDO1FBRTdDLElBQUd1SSxNQUFJLENBQUMyVSxLQUFLLENBQUM5TSxNQUFNLENBQUNqTSxDQUFDLENBQUMsQ0FBQzRRLEtBQUssRUFDN0I7VUFDQzZJLFVBQVUsQ0FBQ0MsWUFBWSxDQUFDOWQsT0FBTyxDQUFDK2QsWUFBWSxDQUMzQ3ZWLE1BQUksQ0FBQzJVLEtBQUssQ0FBQzlNLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDNFEsS0FBSyxDQUFDbkosQ0FBQyxFQUMxQnJELE1BQUksQ0FBQzJVLEtBQUssQ0FBQzlNLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDNFEsS0FBSyxDQUFDbEosQ0FBQyxFQUM1QnRELE1BQUksQ0FBQzJVLEtBQUssQ0FBQzlNLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDNFEsS0FBSyxDQUFDMEcsQ0FBQyxFQUM1QmxULE1BQUksQ0FBQzJVLEtBQUssQ0FBQzlNLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDNFEsS0FBSyxDQUFDNEksQ0FDOUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDVDtRQUVBLElBQUdwVixNQUFJLENBQUMyVSxLQUFLLENBQUM5TSxNQUFNLENBQUNqTSxDQUFDLENBQUMsQ0FBQzRaLElBQUksRUFDNUI7VUFDQ0gsVUFBVSxDQUFDSSxTQUFTLEdBQUd6VixNQUFJLENBQUMyVSxLQUFLLENBQUM5TSxNQUFNLENBQUNqTSxDQUFDLENBQUMsQ0FBQzhaLEtBQUssSUFBSSxPQUFPO1VBRTVETCxVQUFVLENBQUNNLElBQUksR0FBRzNWLE1BQUksQ0FBQzJVLEtBQUssQ0FBQzlNLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDK1osSUFBSSxPQUFBL1IsTUFBQSxDQUNwQzVELE1BQUksQ0FBQzJVLEtBQUssQ0FBQzlNLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDNFEsS0FBSyxDQUFDNEksQ0FBQyxrQkFBZTtVQUNsREMsVUFBVSxDQUFDTyxTQUFTLEdBQUcsUUFBUTtVQUUvQlAsVUFBVSxDQUFDUSxRQUFRLENBQ2xCN1YsTUFBSSxDQUFDMlUsS0FBSyxDQUFDOU0sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0WixJQUFJLEVBQ3ZCeFYsTUFBSSxDQUFDMlUsS0FBSyxDQUFDOU0sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0USxLQUFLLENBQUMwRyxDQUFDLEdBQUcsQ0FBQyxFQUNoQ2xULE1BQUksQ0FBQzJVLEtBQUssQ0FBQzlNLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDNFEsS0FBSyxDQUFDNEksQ0FBQyxFQUM1QnBWLE1BQUksQ0FBQzJVLEtBQUssQ0FBQzlNLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDNFEsS0FBSyxDQUFDMEcsQ0FDOUIsQ0FBQztVQUVEbUMsVUFBVSxDQUFDTyxTQUFTLEdBQUcsSUFBSTtVQUMzQlAsVUFBVSxDQUFDTSxJQUFJLEdBQVEsSUFBSTtRQUM1QjtRQUVBVixhQUFhLENBQUNqUyxJQUFJLENBQUMsSUFBSWlMLE9BQU8sQ0FBQyxVQUFDd0MsTUFBTSxFQUFHO1VBQ3hDMEUsU0FBUyxDQUFDVyxNQUFNLENBQUMsVUFBQ0MsSUFBSSxFQUFHO1lBQ3hCL1YsTUFBSSxDQUFDNkgsTUFBTSxDQUFDN0gsTUFBSSxDQUFDMlUsS0FBSyxDQUFDOU0sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUNvYSxRQUFRLENBQUMsR0FBR0MsR0FBRyxDQUFDQyxlQUFlLENBQUNILElBQUksQ0FBQztZQUV0RXRGLE1BQU0sQ0FBQ3pRLE1BQUksQ0FBQzZILE1BQU0sQ0FBQzdILE1BQUksQ0FBQzJVLEtBQUssQ0FBQzlNLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDb2EsUUFBUSxDQUFDLENBQUM7VUFDbkQsQ0FBQyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7O1FBR0g7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO01BQ0QsQ0FBQztNQTNERCxLQUFJLElBQUlwYSxDQUFDLElBQUksSUFBSSxDQUFDK1ksS0FBSyxDQUFDOU0sTUFBTTtRQUFBcU4sS0FBQSxDQUFBdFosQ0FBQTtNQUFBO01BNkQ5QixPQUFPcVMsT0FBTyxDQUFDQyxHQUFHLENBQUMrRyxhQUFhLENBQUM7SUFDbEM7RUFBQztJQUFBcmQsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXNlLFdBQVdBLENBQUNILFFBQVEsRUFDcEI7TUFDQyxPQUFPLElBQUksQ0FBQzVCLFFBQVEsQ0FBQzRCLFFBQVEsQ0FBQztJQUMvQjtFQUFDO0lBQUFwZSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBNFUsUUFBUUEsQ0FBQ3VKLFFBQVEsRUFDakI7TUFDQyxPQUFPLElBQUksQ0FBQ25PLE1BQU0sQ0FBQ21PLFFBQVEsQ0FBQztJQUM3QjtFQUFDO0lBQUFwZSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBbVcsU0FBU0EsQ0FBQ0gsYUFBYSxFQUN2QjtNQUFBLElBQUF1SSxNQUFBO01BQ0MsSUFBRzlNLEtBQUssQ0FBQ0MsT0FBTyxDQUFDc0UsYUFBYSxDQUFDLEVBQy9CO1FBQ0MsT0FBT0EsYUFBYSxDQUFDdE8sR0FBRyxDQUFDLFVBQUNzRyxJQUFJO1VBQUEsT0FBR3VRLE1BQUksQ0FBQzNKLFFBQVEsQ0FBQzVHLElBQUksQ0FBQztRQUFBLEVBQUM7TUFDdEQ7TUFFQSxPQUFPLElBQUksQ0FBQ3dRLGlCQUFpQixDQUFDeEksYUFBYSxDQUFDO0lBQzdDO0VBQUM7SUFBQWpXLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUF3ZSxpQkFBaUJBLENBQUNDLE1BQU0sRUFDeEI7TUFDQyxJQUFJek8sTUFBTSxHQUFHLEVBQUU7TUFFZixLQUFJLElBQUlqTSxDQUFDLElBQUksSUFBSSxDQUFDaU0sTUFBTSxFQUN4QjtRQUNDLElBQUdqTSxDQUFDLENBQUN4RCxTQUFTLENBQUMsQ0FBQyxFQUFFa2UsTUFBTSxDQUFDbmIsTUFBTSxDQUFDLEtBQUttYixNQUFNLEVBQzNDO1VBQ0M7UUFDRDtRQUVBek8sTUFBTSxDQUFDN0UsSUFBSSxDQUFDLElBQUksQ0FBQzZFLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDO01BQzVCO01BRUEsT0FBT2lNLE1BQU07SUFDZDtFQUFDO0lBQUFqUSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFPNlUsV0FBV0EsQ0FBQ25KLElBQUksRUFBRXdNLFFBQVEsRUFDakM7TUFDQyxJQUFNckUsRUFBRSxHQUFHbkksSUFBSSxDQUFDL0wsT0FBTztNQUV2QixJQUFHLENBQUMsSUFBSSxDQUFDK2UsZUFBZSxFQUN4QjtRQUNDLElBQUksQ0FBQ0EsZUFBZSxHQUFHLENBQUMsQ0FBQztNQUMxQjtNQUVBLElBQUcsSUFBSSxDQUFDQSxlQUFlLENBQUN4RyxRQUFRLENBQUMsRUFDakM7UUFDQyxPQUFPLElBQUksQ0FBQ3dHLGVBQWUsQ0FBQ3hHLFFBQVEsQ0FBQztNQUN0QztNQUVBLElBQU1wRSxPQUFPLEdBQUdELEVBQUUsQ0FBQ0UsYUFBYSxDQUFDLENBQUM7TUFFbEMsT0FBTyxJQUFJLENBQUMySyxlQUFlLENBQUN4RyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUNFLFNBQVMsQ0FBQ0YsUUFBUSxDQUFDLENBQUN6RCxJQUFJLENBQUMsVUFBQUssS0FBSyxFQUFJO1FBQzlFakIsRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSCxPQUFPLENBQUM7UUFFdENELEVBQUUsQ0FBQ1EsVUFBVSxDQUNaUixFQUFFLENBQUNJLFVBQVUsRUFDWCxDQUFDLEVBQ0RKLEVBQUUsQ0FBQ1MsSUFBSSxFQUNQVCxFQUFFLENBQUNTLElBQUksRUFDUFQsRUFBRSxDQUFDVSxhQUFhLEVBQ2hCTyxLQUNILENBQUM7O1FBRUQ7QUFDSDtBQUNBO0FBQ0E7UUFDR2pCLEVBQUUsQ0FBQ3dFLGFBQWEsQ0FBQ3hFLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUN5RSxjQUFjLEVBQUV6RSxFQUFFLENBQUM4SyxNQUFNLENBQUM7UUFDN0Q5SyxFQUFFLENBQUN3RSxhQUFhLENBQUN4RSxFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDMkUsY0FBYyxFQUFFM0UsRUFBRSxDQUFDOEssTUFBTSxDQUFDO1FBQzdEOztRQUVBOUssRUFBRSxDQUFDd0UsYUFBYSxDQUFDeEUsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQzRFLGtCQUFrQixFQUFFNUUsRUFBRSxDQUFDNkUsT0FBTyxDQUFDO1FBQ2xFN0UsRUFBRSxDQUFDd0UsYUFBYSxDQUFDeEUsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQzhFLGtCQUFrQixFQUFFOUUsRUFBRSxDQUFDNkUsT0FBTyxDQUFDO1FBRWxFLE9BQU87VUFBQzVELEtBQUssRUFBTEEsS0FBSztVQUFFaEIsT0FBTyxFQUFQQTtRQUFPLENBQUM7TUFDeEIsQ0FBQyxDQUFDO0lBQ0g7RUFBQztJQUFBL1QsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBT29ZLFNBQVNBLENBQUN6UCxHQUFHLEVBQ3BCO01BQ0MsSUFBRyxDQUFDLElBQUksQ0FBQ2lXLGFBQWEsRUFDdEI7UUFDQyxJQUFJLENBQUNBLGFBQWEsR0FBRyxDQUFDLENBQUM7TUFDeEI7TUFFQSxJQUFHLElBQUksQ0FBQ0EsYUFBYSxDQUFDalcsR0FBRyxDQUFDLEVBQzFCO1FBQ0MsT0FBTyxJQUFJLENBQUNpVyxhQUFhLENBQUNqVyxHQUFHLENBQUM7TUFDL0I7TUFFQSxJQUFJLENBQUNpVyxhQUFhLENBQUNqVyxHQUFHLENBQUMsR0FBRyxJQUFJeU4sT0FBTyxDQUFDLFVBQUN3QyxNQUFNLEVBQUVDLE1BQU0sRUFBRztRQUN2RCxJQUFNL0QsS0FBSyxHQUFHLElBQUlnRSxLQUFLLENBQUMsQ0FBQztRQUN6QmhFLEtBQUssQ0FBQ25NLEdBQUcsR0FBS0EsR0FBRztRQUNqQm1NLEtBQUssQ0FBQ3hLLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxVQUFDb0MsS0FBSyxFQUFHO1VBQ3ZDa00sTUFBTSxDQUFDOUQsS0FBSyxDQUFDO1FBQ2QsQ0FBQyxDQUFDO01BQ0gsQ0FBQyxDQUFDO01BRUYsT0FBTyxJQUFJLENBQUM4SixhQUFhLENBQUNqVyxHQUFHLENBQUM7SUFDL0I7RUFBQztBQUFBOzs7Ozs7Ozs7O0FDck5GLElBQUErRixTQUFBLEdBQUEzTixPQUFBO0FBQ0EsSUFBQTZCLE9BQUEsR0FBQTdCLE9BQUE7QUFBa0MsU0FBQWtELFFBQUFWLENBQUEsc0NBQUFVLE9BQUEsd0JBQUFDLE1BQUEsdUJBQUFBLE1BQUEsQ0FBQXlLLFFBQUEsYUFBQXBMLENBQUEsa0JBQUFBLENBQUEsZ0JBQUFBLENBQUEsV0FBQUEsQ0FBQSx5QkFBQVcsTUFBQSxJQUFBWCxDQUFBLENBQUFzQixXQUFBLEtBQUFYLE1BQUEsSUFBQVgsQ0FBQSxLQUFBVyxNQUFBLENBQUFKLFNBQUEscUJBQUFQLENBQUEsS0FBQVUsT0FBQSxDQUFBVixDQUFBO0FBQUEsU0FBQWxFLGdCQUFBMEQsQ0FBQSxFQUFBQyxDQUFBLFVBQUFELENBQUEsWUFBQUMsQ0FBQSxhQUFBQyxTQUFBO0FBQUEsU0FBQUMsa0JBQUFDLENBQUEsRUFBQUMsQ0FBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUQsQ0FBQSxDQUFBRSxNQUFBLEVBQUFELENBQUEsVUFBQUUsQ0FBQSxHQUFBSCxDQUFBLENBQUFDLENBQUEsR0FBQUUsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsQ0FBQUMsVUFBQSxRQUFBRCxDQUFBLENBQUFFLFlBQUEsa0JBQUFGLENBQUEsS0FBQUEsQ0FBQSxDQUFBRyxRQUFBLFFBQUFDLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLEVBQUFVLGNBQUEsQ0FBQU4sQ0FBQSxDQUFBeEQsR0FBQSxHQUFBd0QsQ0FBQTtBQUFBLFNBQUFuRSxhQUFBK0QsQ0FBQSxFQUFBQyxDQUFBLEVBQUFDLENBQUEsV0FBQUQsQ0FBQSxJQUFBRixpQkFBQSxDQUFBQyxDQUFBLENBQUFXLFNBQUEsRUFBQVYsQ0FBQSxHQUFBQyxDQUFBLElBQUFILGlCQUFBLENBQUFDLENBQUEsRUFBQUUsQ0FBQSxHQUFBTSxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxpQkFBQU8sUUFBQSxTQUFBUCxDQUFBO0FBQUEsU0FBQVUsZUFBQVIsQ0FBQSxRQUFBVSxDQUFBLEdBQUFDLFlBQUEsQ0FBQVgsQ0FBQSxnQ0FBQVksT0FBQSxDQUFBRixDQUFBLElBQUFBLENBQUEsR0FBQUEsQ0FBQTtBQUFBLFNBQUFDLGFBQUFYLENBQUEsRUFBQUQsQ0FBQSxvQkFBQWEsT0FBQSxDQUFBWixDQUFBLE1BQUFBLENBQUEsU0FBQUEsQ0FBQSxNQUFBRixDQUFBLEdBQUFFLENBQUEsQ0FBQWEsTUFBQSxDQUFBQyxXQUFBLGtCQUFBaEIsQ0FBQSxRQUFBWSxDQUFBLEdBQUFaLENBQUEsQ0FBQWlCLElBQUEsQ0FBQWYsQ0FBQSxFQUFBRCxDQUFBLGdDQUFBYSxPQUFBLENBQUFGLENBQUEsVUFBQUEsQ0FBQSxZQUFBZCxTQUFBLHlFQUFBRyxDQUFBLEdBQUFpQixNQUFBLEdBQUFDLE1BQUEsRUFBQWpCLENBQUE7QUFBQSxJQUVyQjZOLE9BQU8sR0FBQS9SLE9BQUEsQ0FBQStSLE9BQUE7RUFFbkIsU0FBQUEsUUFBWXZKLFdBQVcsRUFBRUUsV0FBVyxFQUFFSCxHQUFHLEVBQ3pDO0lBQUEsSUFBQXZCLEtBQUE7SUFBQSxJQUQyQzBZLEtBQUssR0FBQXBSLFNBQUEsQ0FBQW5LLE1BQUEsUUFBQW1LLFNBQUEsUUFBQTdFLFNBQUEsR0FBQTZFLFNBQUEsTUFBRyxDQUFDO0lBQUEsSUFBRXFSLEtBQUssR0FBQXJSLFNBQUEsQ0FBQW5LLE1BQUEsUUFBQW1LLFNBQUEsUUFBQTdFLFNBQUEsR0FBQTZFLFNBQUEsTUFBRyxDQUFDO0lBQUEsSUFBRXNSLE9BQU8sR0FBQXRSLFNBQUEsQ0FBQW5LLE1BQUEsUUFBQW1LLFNBQUEsUUFBQTdFLFNBQUEsR0FBQTZFLFNBQUEsTUFBRyxDQUFDO0lBQUEsSUFBRXVSLE9BQU8sR0FBQXZSLFNBQUEsQ0FBQW5LLE1BQUEsUUFBQW1LLFNBQUEsUUFBQTdFLFNBQUEsR0FBQTZFLFNBQUEsTUFBRyxDQUFDO0lBQUEsSUFBRTRDLEtBQUssR0FBQTVDLFNBQUEsQ0FBQW5LLE1BQUEsUUFBQW1LLFNBQUEsUUFBQTdFLFNBQUEsR0FBQTZFLFNBQUEsTUFBRyxDQUFDO0lBQUEsSUFBRW1GLENBQUMsR0FBQW5GLFNBQUEsQ0FBQW5LLE1BQUEsUUFBQW1LLFNBQUEsUUFBQTdFLFNBQUEsR0FBQTZFLFNBQUEsTUFBRyxDQUFDLENBQUM7SUFBQXBPLGVBQUEsT0FBQTZSLE9BQUE7SUFFM0csSUFBSSxDQUFDckMsa0JBQVEsQ0FBQzhELE9BQU8sQ0FBQyxHQUFHLElBQUk7SUFFN0IsSUFBSSxDQUFDaEwsV0FBVyxHQUFHQSxXQUFXO0lBQzlCLElBQUksQ0FBQ0UsV0FBVyxHQUFHQSxXQUFXO0lBRTlCLElBQUksQ0FBQzJELENBQUMsR0FBR3VULE9BQU87SUFDaEIsSUFBSSxDQUFDdFQsQ0FBQyxHQUFHdVQsT0FBTztJQUNoQixJQUFJLENBQUNwTSxDQUFDLEdBQUdBLENBQUM7SUFFVixJQUFJLENBQUN2QyxLQUFLLEdBQUdBLEtBQUs7SUFDbEIsSUFBSSxDQUFDd08sS0FBSyxHQUFHQSxLQUFLO0lBQ2xCLElBQUksQ0FBQ0MsS0FBSyxHQUFHQSxLQUFLO0lBRWxCLElBQUksQ0FBQ3JPLFNBQVMsR0FBSSxFQUFFO0lBQ3BCLElBQUksQ0FBQ0MsVUFBVSxHQUFHLEVBQUU7SUFFcEIsSUFBSSxDQUFDN0gsS0FBSyxHQUFJLElBQUksQ0FBQ2dXLEtBQUssR0FBRyxJQUFJLENBQUNwTyxTQUFTO0lBQ3pDLElBQUksQ0FBQzNILE1BQU0sR0FBRyxJQUFJLENBQUNnVyxLQUFLLEdBQUcsSUFBSSxDQUFDcE8sVUFBVTtJQUUxQyxJQUFJLENBQUNoSixHQUFHLEdBQUdBLEdBQUc7SUFFZCxJQUFJLENBQUN1WCxXQUFXLEdBQUcsRUFBRTtJQUdyQixJQUFJLENBQUNDLFdBQVcsR0FBRyxDQUFDLENBQUM7SUFFckIsSUFBSSxDQUFDclgsV0FBVyxDQUFDMk0sS0FBSyxDQUFDQyxJQUFJLENBQUMsVUFBQUMsS0FBSztNQUFBLE9BQUl2TyxLQUFJLENBQUNnWixVQUFVLENBQUMsQ0FBQztJQUFBLEVBQUM7SUFFdkQsSUFBTXRMLEVBQUUsR0FBRyxJQUFJLENBQUNsTSxXQUFXLENBQUMrRCxJQUFJLENBQUMvTCxPQUFPO0lBRXhDLElBQUksQ0FBQ29SLElBQUksR0FBRzhDLEVBQUUsQ0FBQ0UsYUFBYSxDQUFDLENBQUM7SUFFOUJGLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUNsRCxJQUFJLENBQUM7SUFFeEMsSUFBTTNOLENBQUMsR0FBRyxTQUFKQSxDQUFDQSxDQUFBO01BQUEsT0FBUzhRLFFBQVEsQ0FBQzdILElBQUksQ0FBQ21DLE1BQU0sQ0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDO0lBQUE7SUFDM0MsSUFBTTJGLEtBQUssR0FBRyxJQUFJQyxVQUFVLENBQUMsQ0FBQ2hSLENBQUMsQ0FBQyxDQUFDLEVBQUVBLENBQUMsQ0FBQyxDQUFDLEVBQUVBLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbER5USxFQUFFLENBQUNRLFVBQVUsQ0FDWlIsRUFBRSxDQUFDSSxVQUFVLEVBQ1gsQ0FBQyxFQUNESixFQUFFLENBQUNTLElBQUksRUFDUCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRFQsRUFBRSxDQUFDUyxJQUFJLEVBQ1BULEVBQUUsQ0FBQ1UsYUFBYSxFQUNoQkosS0FDSCxDQUFDO0lBRUROLEVBQUUsQ0FBQ3dFLGFBQWEsQ0FBQ3hFLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUN5RSxjQUFjLEVBQUV6RSxFQUFFLENBQUMwRSxhQUFhLENBQUM7SUFDcEUxRSxFQUFFLENBQUN3RSxhQUFhLENBQUN4RSxFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDMkUsY0FBYyxFQUFFM0UsRUFBRSxDQUFDMEUsYUFBYSxDQUFDOztJQUVwRTtJQUNBMUUsRUFBRSxDQUFDd0UsYUFBYSxDQUFDeEUsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQzRFLGtCQUFrQixFQUFFNUUsRUFBRSxDQUFDNkUsT0FBTyxDQUFDO0lBQ2xFN0UsRUFBRSxDQUFDd0UsYUFBYSxDQUFDeEUsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQzhFLGtCQUFrQixFQUFFOUUsRUFBRSxDQUFDNkUsT0FBTyxDQUFDO0lBQ2xFO0FBQ0Y7QUFDQTtBQUNBOztJQUVFLElBQUksQ0FBQzBHLFdBQVcsR0FBR3ZMLEVBQUUsQ0FBQ2lILGlCQUFpQixDQUFDLENBQUM7SUFDekNqSCxFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDeUosV0FBVyxDQUFDO0lBQ3BEdkwsRUFBRSxDQUFDa0gsb0JBQW9CLENBQ3RCbEgsRUFBRSxDQUFDOEIsV0FBVyxFQUNaOUIsRUFBRSxDQUFDbUgsaUJBQWlCLEVBQ3BCbkgsRUFBRSxDQUFDSSxVQUFVLEVBQ2IsSUFBSSxDQUFDbEQsSUFBSSxFQUNULENBQ0gsQ0FBQztFQUNGO0VBQUMsT0FBQTNSLFlBQUEsQ0FBQThSLE9BQUE7SUFBQW5SLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFzTCxJQUFJQSxDQUFBLEVBQ0o7TUFDQyxJQUFNdUksRUFBRSxHQUFHLElBQUksQ0FBQ2xNLFdBQVcsQ0FBQytELElBQUksQ0FBQy9MLE9BQU87TUFFeENrVSxFQUFFLENBQUNHLFdBQVcsQ0FBQ0gsRUFBRSxDQUFDSSxVQUFVLEVBQUUsSUFBSSxDQUFDbEQsSUFBSSxDQUFDO01BRXhDLElBQU12RixDQUFDLEdBQUcsSUFBSSxDQUFDQSxDQUFDLEdBQUcsQ0FBQ3ZDLGNBQU0sQ0FBQ3VDLENBQUMsR0FBSXZDLGNBQU0sQ0FBQ0osS0FBSyxHQUFJLElBQUksQ0FBQ2xCLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsR0FBRyxDQUFFO01BQ3BGLElBQU0yTCxDQUFDLEdBQUcsSUFBSSxDQUFDQSxDQUFDLEdBQUcsQ0FBQ3hDLGNBQU0sQ0FBQ3dDLENBQUMsR0FBSXhDLGNBQU0sQ0FBQ0gsTUFBTSxHQUFJLElBQUksQ0FBQ25CLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsR0FBRyxDQUFFO01BRXJGLElBQUksQ0FBQzJWLFlBQVksQ0FDaEJqSyxDQUFDLEVBQ0NDLENBQUMsRUFDRCxJQUFJLENBQUM1QyxLQUFLLEdBQUcsSUFBSSxDQUFDbEIsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxFQUM1QyxJQUFJLENBQUNnSixNQUFNLEdBQUcsSUFBSSxDQUFDbkIsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FDdkMsQ0FBQztNQUVEK1QsRUFBRSxDQUFDNkIsZUFBZSxDQUFDN0IsRUFBRSxDQUFDOEIsV0FBVyxFQUFFLElBQUksQ0FBQ2hPLFdBQVcsQ0FBQ2lPLFVBQVUsQ0FBQztNQUMvRC9CLEVBQUUsQ0FBQ2dDLFVBQVUsQ0FBQ2hDLEVBQUUsQ0FBQ2lDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xDO0VBQUM7SUFBQS9WLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFtZixVQUFVQSxDQUFBLEVBQ1Y7TUFBQSxJQUFBaFgsTUFBQTtNQUNDLElBQUl1VyxlQUFlLEdBQUcsRUFBRTtNQUN4QixJQUFNVyxJQUFJLEdBQUcsSUFBSSxDQUFDUixLQUFLLEdBQUcsSUFBSSxDQUFDQyxLQUFLO01BQUMsSUFBQXpCLEtBQUEsWUFBQUEsTUFBQXRaLENBQUEsRUFHckM7UUFDQyxJQUFJb0csTUFBTSxHQUFJcEcsQ0FBQyxHQUFHb0UsTUFBSSxDQUFDMFcsS0FBSztRQUM1QixJQUFJUyxPQUFPLEdBQUdqVCxJQUFJLENBQUN3RCxLQUFLLENBQUMxSCxNQUFJLENBQUNxRCxDQUFDLEdBQUdyRCxNQUFJLENBQUNzSSxTQUFTLENBQUM7UUFDakQsSUFBSWxILE9BQU8sR0FBR1ksTUFBTSxHQUFHbVYsT0FBTztRQUU5QixJQUFJbkUsTUFBTSxHQUFJOU8sSUFBSSxDQUFDd0QsS0FBSyxDQUFDOUwsQ0FBQyxHQUFHb0UsTUFBSSxDQUFDMFcsS0FBSyxDQUFDO1FBQ3hDLElBQUlVLE9BQU8sR0FBR2xULElBQUksQ0FBQ3dELEtBQUssQ0FBQzFILE1BQUksQ0FBQ3NELENBQUMsR0FBR3RELE1BQUksQ0FBQ3VJLFVBQVUsQ0FBQztRQUNsRCxJQUFJNUcsT0FBTyxHQUFHcVIsTUFBTSxHQUFHb0UsT0FBTztRQUU5QixJQUFJdlAsTUFBTSxHQUFHN0gsTUFBSSxDQUFDVCxHQUFHLENBQUM4WCxPQUFPLENBQUNqVyxPQUFPLEVBQUVPLE9BQU8sRUFBRTNCLE1BQUksQ0FBQ2tJLEtBQUssQ0FBQztRQUUzRCxJQUFNd0UsV0FBVyxHQUFHLFNBQWRBLFdBQVdBLENBQUdGLEtBQUs7VUFBQSxPQUFJeE0sTUFBSSxDQUFDTixXQUFXLENBQUNoRCxXQUFXLENBQUNnUSxXQUFXLENBQUMxTSxNQUFJLENBQUNSLFdBQVcsQ0FBQytELElBQUksRUFBRWlKLEtBQUssQ0FBQztRQUFBO1FBRW5HLElBQUdsRCxLQUFLLENBQUNDLE9BQU8sQ0FBQzFCLE1BQU0sQ0FBQyxFQUN4QjtVQUNDLElBQUlyRyxDQUFDLEdBQUcsQ0FBQztVQUNUeEIsTUFBSSxDQUFDK1csV0FBVyxDQUFDbmIsQ0FBQyxDQUFDLEdBQUcsRUFBRTtVQUN4QjJhLGVBQWUsQ0FBQ3ZULElBQUksQ0FDbkJpTCxPQUFPLENBQUNDLEdBQUcsQ0FBQ3JHLE1BQU0sQ0FBQ3RJLEdBQUcsQ0FBQyxVQUFDaU4sS0FBSztZQUFBLE9BQzVCRSxXQUFXLENBQUNGLEtBQUssQ0FBQyxDQUFDRixJQUFJLENBQ3RCLFVBQUF2TyxJQUFJLEVBQUk7Y0FDUGlDLE1BQUksQ0FBQytXLFdBQVcsQ0FBQ25iLENBQUMsQ0FBQyxDQUFDNEYsQ0FBQyxDQUFDLEdBQUd6RCxJQUFJLENBQUM0TixPQUFPO2NBQ3JDbkssQ0FBQyxFQUFFO1lBQ0osQ0FDRCxDQUFDO1VBQUEsQ0FDRixDQUNELENBQUMsQ0FBQztRQUNILENBQUMsTUFFRDtVQUNDK1UsZUFBZSxDQUFDdlQsSUFBSSxDQUNuQjBKLFdBQVcsQ0FBQzdFLE1BQU0sQ0FBQyxDQUFDeUUsSUFBSSxDQUFDLFVBQUF2TyxJQUFJO1lBQUEsT0FBSWlDLE1BQUksQ0FBQytXLFdBQVcsQ0FBQ25iLENBQUMsQ0FBQyxHQUFHbUMsSUFBSSxDQUFDNE4sT0FBTztVQUFBLEVBQ3BFLENBQUM7UUFDRjtNQUNELENBQUM7TUFuQ0QsS0FBSSxJQUFJL1AsQ0FBQyxHQUFHLENBQUMsRUFBRUEsQ0FBQyxHQUFHc2IsSUFBSSxFQUFFdGIsQ0FBQyxFQUFFO1FBQUFzWixLQUFBLENBQUF0WixDQUFBO01BQUE7TUFxQzVCcVMsT0FBTyxDQUFDQyxHQUFHLENBQUNxSSxlQUFlLENBQUMsQ0FBQ2pLLElBQUksQ0FBQztRQUFBLE9BQU10TSxNQUFJLENBQUNzWCxRQUFRLENBQUMsQ0FBQztNQUFBLEVBQUM7SUFDekQ7RUFBQztJQUFBMWYsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXlmLFFBQVFBLENBQUEsRUFDUjtNQUNDLElBQU01TCxFQUFFLEdBQUcsSUFBSSxDQUFDbE0sV0FBVyxDQUFDK0QsSUFBSSxDQUFDL0wsT0FBTztNQUV4Q2tVLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUNsRCxJQUFJLENBQUM7TUFFeEM4QyxFQUFFLENBQUNRLFVBQVUsQ0FDWlIsRUFBRSxDQUFDSSxVQUFVLEVBQ2IsQ0FBQyxFQUNESixFQUFFLENBQUNTLElBQUksRUFDUCxJQUFJLENBQUN6TCxLQUFLLEVBQ1YsSUFBSSxDQUFDQyxNQUFNLEVBQ1gsQ0FBQyxFQUNEK0ssRUFBRSxDQUFDUyxJQUFJLEVBQ1BULEVBQUUsQ0FBQ1UsYUFBYSxFQUNoQixJQUNELENBQUM7TUFFRFYsRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQ2lMLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUNyRHJMLEVBQUUsQ0FBQzZCLGVBQWUsQ0FBQzdCLEVBQUUsQ0FBQzhCLFdBQVcsRUFBRSxJQUFJLENBQUN5SixXQUFXLENBQUM7TUFDcER2TCxFQUFFLENBQUM4SCxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUM5UyxLQUFLLEVBQUUsSUFBSSxDQUFDQyxNQUFNLENBQUM7TUFDMUM7TUFDQStLLEVBQUUsQ0FBQzJILFVBQVUsQ0FBQ25QLElBQUksQ0FBQ21DLE1BQU0sQ0FBQyxDQUFDLEVBQUVuQyxJQUFJLENBQUNtQyxNQUFNLENBQUMsQ0FBQyxFQUFFbkMsSUFBSSxDQUFDbUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7TUFDN0RxRixFQUFFLENBQUM0SCxLQUFLLENBQUM1SCxFQUFFLENBQUM2SCxnQkFBZ0IsR0FBRzdILEVBQUUsQ0FBQzZMLGdCQUFnQixDQUFDO01BRW5EN0wsRUFBRSxDQUFDd0IsU0FBUyxDQUNYLElBQUksQ0FBQzFOLFdBQVcsQ0FBQ3lTLGFBQWEsRUFDNUIsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FDSCxDQUFDO01BRUR2RyxFQUFFLENBQUMrSCxTQUFTLENBQ1gsSUFBSSxDQUFDalUsV0FBVyxDQUFDMFMsZUFBZSxFQUM5QixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQ0gsQ0FBQztNQUVEeEcsRUFBRSxDQUFDMEIsU0FBUyxDQUNYLElBQUksQ0FBQzVOLFdBQVcsQ0FBQ3dTLGtCQUFrQixFQUNqQyxJQUFJLENBQUN0UixLQUFLLEVBQ1YsSUFBSSxDQUFDQyxNQUNSLENBQUM7TUFFRCtLLEVBQUUsQ0FBQzBCLFNBQVMsQ0FDWCxJQUFJLENBQUM1TixXQUFXLENBQUM2TixZQUFZLEVBQzNCLElBQUksQ0FBQzNNLEtBQUssRUFDVixJQUFJLENBQUNDLE1BQ1IsQ0FBQztNQUVEK0ssRUFBRSxDQUFDK0gsU0FBUyxDQUNYLElBQUksQ0FBQ2pVLFdBQVcsQ0FBQzJTLGNBQWMsRUFDN0IsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUNILENBQUM7TUFFRCxJQUFHLElBQUksQ0FBQzRFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDekI7UUFDQ3JMLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUNpTCxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckRyTCxFQUFFLENBQUNrQixVQUFVLENBQUNsQixFQUFFLENBQUNtQixZQUFZLEVBQUUsSUFBSSxDQUFDck4sV0FBVyxDQUFDc04sY0FBYyxDQUFDO1FBQy9EcEIsRUFBRSxDQUFDcUIsVUFBVSxDQUFDckIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUlHLFlBQVksQ0FBQyxDQUMvQyxHQUFHLEVBQWUsR0FBRyxFQUNyQixJQUFJLENBQUN0TSxLQUFLLEdBQUcsRUFBRSxFQUFHLEdBQUcsRUFDckIsR0FBRyxFQUFlLENBQUMsSUFBSSxDQUFDQyxNQUFNLEdBQUcsRUFBRSxFQUNuQyxHQUFHLEVBQWUsQ0FBQyxJQUFJLENBQUNBLE1BQU0sR0FBRyxFQUFFLEVBQ25DLElBQUksQ0FBQ0QsS0FBSyxHQUFHLEVBQUUsRUFBRyxHQUFHLEVBQ3JCLElBQUksQ0FBQ0EsS0FBSyxHQUFHLEVBQUUsRUFBRyxDQUFDLElBQUksQ0FBQ0MsTUFBTSxHQUFHLEVBQUUsQ0FDbkMsQ0FBQyxFQUFFK0ssRUFBRSxDQUFDdUIsV0FBVyxDQUFDO1FBRW5CLElBQUksQ0FBQ0ssWUFBWSxDQUNoQixDQUFDLEVBQ0MsQ0FBQyxFQUNELElBQUksQ0FBQzVNLEtBQUssRUFDVixJQUFJLENBQUNDLE1BQ1IsQ0FBQztRQUVEK0ssRUFBRSxDQUFDZ0MsVUFBVSxDQUFDaEMsRUFBRSxDQUFDaUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7TUFDbEM7O01BRUE7TUFDQTtNQUVBLEtBQUksSUFBSS9SLENBQUMsSUFBSSxJQUFJLENBQUNtYixXQUFXLEVBQzdCO1FBQ0NuYixDQUFDLEdBQUdPLE1BQU0sQ0FBQ1AsQ0FBQyxDQUFDO1FBQ2IsSUFBTXlILENBQUMsR0FBSXpILENBQUMsR0FBRyxJQUFJLENBQUMwTSxTQUFTLEdBQUksSUFBSSxDQUFDNUgsS0FBSztRQUMzQyxJQUFNNEMsQ0FBQyxHQUFHWSxJQUFJLENBQUNDLEtBQUssQ0FBQ3ZJLENBQUMsR0FBRyxJQUFJLENBQUMwTSxTQUFTLEdBQUcsSUFBSSxDQUFDNUgsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDNEgsU0FBUztRQUV0RSxJQUFHLENBQUNnQixLQUFLLENBQUNDLE9BQU8sQ0FBQyxJQUFJLENBQUN3TixXQUFXLENBQUNuYixDQUFDLENBQUMsQ0FBQyxFQUN0QztVQUNDLElBQUksQ0FBQ21iLFdBQVcsQ0FBQ25iLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDbWIsV0FBVyxDQUFDbmIsQ0FBQyxDQUFDLENBQUM7UUFDNUM7UUFFQSxLQUFJLElBQUk0RixDQUFDLElBQUksSUFBSSxDQUFDdVYsV0FBVyxDQUFDbmIsQ0FBQyxDQUFDLEVBQ2hDO1VBQ0M4UCxFQUFFLENBQUMrSCxTQUFTLENBQ1gsSUFBSSxDQUFDalUsV0FBVyxDQUFDMFMsZUFBZSxFQUM5Qi9WLE1BQU0sQ0FBQ1AsQ0FBQyxDQUFDLEVBQ1RKLE1BQU0sQ0FBQzBELElBQUksQ0FBQyxJQUFJLENBQUM2WCxXQUFXLENBQUMsQ0FBQzViLE1BQU0sRUFDcEMsQ0FDSCxDQUFDO1VBRUR1USxFQUFFLENBQUNrQixVQUFVLENBQUNsQixFQUFFLENBQUNtQixZQUFZLEVBQUUsSUFBSSxDQUFDck4sV0FBVyxDQUFDc04sY0FBYyxDQUFDO1VBQy9EcEIsRUFBRSxDQUFDcUIsVUFBVSxDQUFDckIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUlHLFlBQVksQ0FBQyxDQUMvQyxHQUFHLEVBQUUsR0FBRyxFQUNSLEdBQUcsRUFBRSxHQUFHLEVBQ1IsR0FBRyxFQUFFLEdBQUcsRUFDUixHQUFHLEVBQUUsR0FBRyxFQUNSLEdBQUcsRUFBRSxHQUFHLEVBQ1IsR0FBRyxFQUFFLEdBQUcsQ0FDUixDQUFDLEVBQUV0QixFQUFFLENBQUN1QixXQUFXLENBQUM7VUFFbkIsSUFBSSxDQUFDSyxZQUFZLENBQ2hCakssQ0FBQyxFQUNDQyxDQUFDLEdBQUcsSUFBSSxDQUFDaUYsVUFBVSxFQUNuQixJQUFJLENBQUNELFNBQVMsRUFDZCxDQUFDLElBQUksQ0FBQ0MsVUFDVCxDQUFDO1VBRURtRCxFQUFFLENBQUNnQyxVQUFVLENBQUNoQyxFQUFFLENBQUNpQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQztNQUNEO01BRUFqQyxFQUFFLENBQUMrSCxTQUFTLENBQ1gsSUFBSSxDQUFDalUsV0FBVyxDQUFDMFMsZUFBZSxFQUM5QixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQ0gsQ0FBQztNQUVEeEcsRUFBRSxDQUFDNkIsZUFBZSxDQUFDN0IsRUFBRSxDQUFDOEIsV0FBVyxFQUFFLElBQUksQ0FBQztJQUN6QztFQUFDO0lBQUE1VixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBeVYsWUFBWUEsQ0FBQ2pLLENBQUMsRUFBRUMsQ0FBQyxFQUFFNUMsS0FBSyxFQUFFQyxNQUFNLEVBQ2hDO01BQ0MsSUFBTStLLEVBQUUsR0FBRyxJQUFJLENBQUNsTSxXQUFXLENBQUMrRCxJQUFJLENBQUMvTCxPQUFPO01BRXhDa1UsRUFBRSxDQUFDa0IsVUFBVSxDQUFDbEIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUksQ0FBQ3JOLFdBQVcsQ0FBQzRPLGNBQWMsQ0FBQztNQUUvRCxJQUFNQyxFQUFFLEdBQUdoTCxDQUFDO01BQ1osSUFBTWtMLEVBQUUsR0FBSWxMLENBQUMsR0FBRzNDLEtBQU07TUFDdEIsSUFBTTROLEVBQUUsR0FBR2hMLENBQUM7TUFDWixJQUFNa0wsRUFBRSxHQUFJbEwsQ0FBQyxHQUFHM0MsTUFBTztNQUV2QitLLEVBQUUsQ0FBQ3FCLFVBQVUsQ0FBQ3JCLEVBQUUsQ0FBQ21CLFlBQVksRUFBRSxJQUFJRyxZQUFZLENBQUMsQ0FDL0NxQixFQUFFLEVBQUVHLEVBQUUsRUFDTkQsRUFBRSxFQUFFQyxFQUFFLEVBQ05ILEVBQUUsRUFBRUMsRUFBRSxFQUNORCxFQUFFLEVBQUVDLEVBQUUsRUFDTkMsRUFBRSxFQUFFQyxFQUFFLEVBQ05ELEVBQUUsRUFBRUQsRUFBRSxDQUNOLENBQUMsRUFBRTVDLEVBQUUsQ0FBQ3VCLFdBQVcsQ0FBQztJQUNwQjtFQUFDO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7SUN6U1d1SyxXQUFXLEdBQUF4Z0IsT0FBQSxDQUFBd2dCLFdBQUEsZ0JBQUF2Z0IsWUFBQSxVQUFBdWdCLFlBQUE7RUFBQXRnQixlQUFBLE9BQUFzZ0IsV0FBQTtBQUFBOzs7Q0NBeEI7QUFBQTtBQUFBO0FBQUE7Q0NBQTtBQUFBO0FBQUE7QUFBQTs7Ozs7Ozs7O0FDQUEsSUFBQUMsTUFBQSxHQUFBN2UsT0FBQTtBQUEyQyxTQUFBMUIsZ0JBQUEwRCxDQUFBLEVBQUFDLENBQUEsVUFBQUQsQ0FBQSxZQUFBQyxDQUFBLGFBQUFDLFNBQUE7QUFBQSxTQUFBQyxrQkFBQUMsQ0FBQSxFQUFBQyxDQUFBLGFBQUFDLENBQUEsTUFBQUEsQ0FBQSxHQUFBRCxDQUFBLENBQUFFLE1BQUEsRUFBQUQsQ0FBQSxVQUFBRSxDQUFBLEdBQUFILENBQUEsQ0FBQUMsQ0FBQSxHQUFBRSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQVUsY0FBQSxDQUFBTixDQUFBLENBQUF4RCxHQUFBLEdBQUF3RCxDQUFBO0FBQUEsU0FBQW5FLGFBQUErRCxDQUFBLEVBQUFDLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFGLGlCQUFBLENBQUFDLENBQUEsQ0FBQVcsU0FBQSxFQUFBVixDQUFBLEdBQUFDLENBQUEsSUFBQUgsaUJBQUEsQ0FBQUMsQ0FBQSxFQUFBRSxDQUFBLEdBQUFNLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLGlCQUFBTyxRQUFBLFNBQUFQLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLFNBQUFrQixXQUFBbEIsQ0FBQSxFQUFBRSxDQUFBLEVBQUFKLENBQUEsV0FBQUksQ0FBQSxHQUFBaUIsZUFBQSxDQUFBakIsQ0FBQSxHQUFBa0IsMEJBQUEsQ0FBQXBCLENBQUEsRUFBQXFCLHlCQUFBLEtBQUFDLE9BQUEsQ0FBQUMsU0FBQSxDQUFBckIsQ0FBQSxFQUFBSixDQUFBLFFBQUFxQixlQUFBLENBQUFuQixDQUFBLEVBQUF3QixXQUFBLElBQUF0QixDQUFBLENBQUF1QixLQUFBLENBQUF6QixDQUFBLEVBQUFGLENBQUE7QUFBQSxTQUFBc0IsMkJBQUFwQixDQUFBLEVBQUFGLENBQUEsUUFBQUEsQ0FBQSxpQkFBQWMsT0FBQSxDQUFBZCxDQUFBLDBCQUFBQSxDQUFBLFVBQUFBLENBQUEsaUJBQUFBLENBQUEsWUFBQUYsU0FBQSxxRUFBQThCLHNCQUFBLENBQUExQixDQUFBO0FBQUEsU0FBQTBCLHVCQUFBNUIsQ0FBQSxtQkFBQUEsQ0FBQSxZQUFBNkIsY0FBQSxzRUFBQTdCLENBQUE7QUFBQSxTQUFBdUIsMEJBQUEsY0FBQXJCLENBQUEsSUFBQTRCLE9BQUEsQ0FBQW5CLFNBQUEsQ0FBQW9CLE9BQUEsQ0FBQWQsSUFBQSxDQUFBTyxPQUFBLENBQUFDLFNBQUEsQ0FBQUssT0FBQSxpQ0FBQTVCLENBQUEsYUFBQXFCLHlCQUFBLFlBQUFBLDBCQUFBLGFBQUFyQixDQUFBO0FBQUEsU0FBQW1CLGdCQUFBbkIsQ0FBQSxXQUFBbUIsZUFBQSxHQUFBYixNQUFBLENBQUF3QixjQUFBLEdBQUF4QixNQUFBLENBQUF5QixjQUFBLENBQUFDLElBQUEsZUFBQWhDLENBQUEsV0FBQUEsQ0FBQSxDQUFBaUMsU0FBQSxJQUFBM0IsTUFBQSxDQUFBeUIsY0FBQSxDQUFBL0IsQ0FBQSxNQUFBbUIsZUFBQSxDQUFBbkIsQ0FBQTtBQUFBLFNBQUFrQyxVQUFBbEMsQ0FBQSxFQUFBRixDQUFBLDZCQUFBQSxDQUFBLGFBQUFBLENBQUEsWUFBQUYsU0FBQSx3REFBQUksQ0FBQSxDQUFBUyxTQUFBLEdBQUFILE1BQUEsQ0FBQTZCLE1BQUEsQ0FBQXJDLENBQUEsSUFBQUEsQ0FBQSxDQUFBVyxTQUFBLElBQUFlLFdBQUEsSUFBQTdFLEtBQUEsRUFBQXFELENBQUEsRUFBQUssUUFBQSxNQUFBRCxZQUFBLFdBQUFFLE1BQUEsQ0FBQUMsY0FBQSxDQUFBUCxDQUFBLGlCQUFBSyxRQUFBLFNBQUFQLENBQUEsSUFBQXNDLGVBQUEsQ0FBQXBDLENBQUEsRUFBQUYsQ0FBQTtBQUFBLFNBQUFzQyxnQkFBQXBDLENBQUEsRUFBQUYsQ0FBQSxXQUFBc0MsZUFBQSxHQUFBOUIsTUFBQSxDQUFBd0IsY0FBQSxHQUFBeEIsTUFBQSxDQUFBd0IsY0FBQSxDQUFBRSxJQUFBLGVBQUFoQyxDQUFBLEVBQUFGLENBQUEsV0FBQUUsQ0FBQSxDQUFBaUMsU0FBQSxHQUFBbkMsQ0FBQSxFQUFBRSxDQUFBLEtBQUFvQyxlQUFBLENBQUFwQyxDQUFBLEVBQUFGLENBQUE7QUFBQSxJQUU5QjRGLFVBQVUsR0FBQTVKLE9BQUEsQ0FBQTRKLFVBQUEsMEJBQUE3RyxLQUFBO0VBRXRCLFNBQUE2RyxXQUFZN0MsSUFBSSxFQUNoQjtJQUFBLElBQUFDLEtBQUE7SUFBQTlHLGVBQUEsT0FBQTBKLFVBQUE7SUFDQzVDLEtBQUEsR0FBQTVCLFVBQUEsT0FBQXdFLFVBQUEsR0FBTTdDLElBQUk7SUFDVkMsS0FBQSxDQUFLRyxRQUFRLEdBQUl2RixPQUFPLENBQUMsa0JBQWtCLENBQUM7SUFDNUNvRixLQUFBLENBQUswWixTQUFTLEdBQUcsS0FBSztJQUV0QjFaLEtBQUEsQ0FBS0QsSUFBSSxDQUFDNFosUUFBUSxHQUFJLEtBQUs7SUFDM0IzWixLQUFBLENBQUtELElBQUksQ0FBQ3NGLENBQUMsR0FBRyxDQUFDO0lBQ2ZyRixLQUFBLENBQUtELElBQUksQ0FBQ3VGLENBQUMsR0FBRyxDQUFDO0lBRWZyRixNQUFNLENBQUNrRSxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsVUFBQ29DLEtBQUssRUFBSztNQUMvQ3ZHLEtBQUEsQ0FBSzRaLFNBQVMsQ0FBQ3JULEtBQUssQ0FBQztJQUN0QixDQUFDLENBQUM7SUFFRnRHLE1BQU0sQ0FBQ2tFLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxVQUFDb0MsS0FBSyxFQUFLO01BQzdDdkcsS0FBQSxDQUFLNlosU0FBUyxDQUFDdFQsS0FBSyxDQUFDO0lBQ3RCLENBQUMsQ0FBQztJQUVGdEcsTUFBTSxDQUFDa0UsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFVBQUNvQyxLQUFLLEVBQUs7TUFDL0N2RyxLQUFBLENBQUs0WixTQUFTLENBQUNyVCxLQUFLLENBQUM7SUFDdEIsQ0FBQyxDQUFDO0lBRUZ0RyxNQUFNLENBQUNrRSxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsVUFBQ29DLEtBQUssRUFBSztNQUM5Q3ZHLEtBQUEsQ0FBSzZaLFNBQVMsQ0FBQ3RULEtBQUssQ0FBQztJQUN0QixDQUFDLENBQUM7SUFBQyxPQUFBdkcsS0FBQTtFQUNKO0VBQUNaLFNBQUEsQ0FBQXdELFVBQUEsRUFBQTdHLEtBQUE7RUFBQSxPQUFBOUMsWUFBQSxDQUFBMkosVUFBQTtJQUFBaEosR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWlnQixTQUFTQSxDQUFDdlQsS0FBSyxFQUNmO01BQ0MsSUFBSXdULEdBQUcsR0FBR3hULEtBQUs7TUFFZkEsS0FBSyxDQUFDeVQsY0FBYyxDQUFDLENBQUM7TUFFdEIsSUFBR3pULEtBQUssQ0FBQzBULE9BQU8sSUFBSTFULEtBQUssQ0FBQzBULE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFDcEM7UUFDQ0YsR0FBRyxHQUFHeFQsS0FBSyxDQUFDMFQsT0FBTyxDQUFDLENBQUMsQ0FBQztNQUN2QjtNQUVBLElBQUksQ0FBQ2xhLElBQUksQ0FBQzRaLFFBQVEsR0FBRyxJQUFJO01BQ3pCLElBQUksQ0FBQ0QsU0FBUyxHQUFPO1FBQ3BCclUsQ0FBQyxFQUFJMFUsR0FBRyxDQUFDakYsT0FBTztRQUNkeFAsQ0FBQyxFQUFFeVUsR0FBRyxDQUFDaEY7TUFDVixDQUFDO0lBQ0Y7RUFBQztJQUFBbmIsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQStmLFNBQVNBLENBQUNyVCxLQUFLLEVBQ2Y7TUFDQyxJQUFHLElBQUksQ0FBQ3hHLElBQUksQ0FBQzRaLFFBQVEsRUFDckI7UUFDQyxJQUFJSSxHQUFHLEdBQUd4VCxLQUFLO1FBRWYsSUFBR0EsS0FBSyxDQUFDMFQsT0FBTyxJQUFJMVQsS0FBSyxDQUFDMFQsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUNwQztVQUNDRixHQUFHLEdBQUd4VCxLQUFLLENBQUMwVCxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCO1FBRUEsSUFBSSxDQUFDbGEsSUFBSSxDQUFDbWEsRUFBRSxHQUFHSCxHQUFHLENBQUNqRixPQUFPLEdBQUcsSUFBSSxDQUFDNEUsU0FBUyxDQUFDclUsQ0FBQztRQUM3QyxJQUFJLENBQUN0RixJQUFJLENBQUNvYSxFQUFFLEdBQUdKLEdBQUcsQ0FBQ2hGLE9BQU8sR0FBRyxJQUFJLENBQUMyRSxTQUFTLENBQUNwVSxDQUFDO1FBRTdDLElBQU04VSxLQUFLLEdBQUcsRUFBRTtRQUVoQixJQUFHLElBQUksQ0FBQ3JhLElBQUksQ0FBQ21hLEVBQUUsR0FBRyxDQUFDRSxLQUFLLEVBQ3hCO1VBQ0MsSUFBSSxDQUFDcmEsSUFBSSxDQUFDc0YsQ0FBQyxHQUFHLENBQUMrVSxLQUFLO1FBQ3JCLENBQUMsTUFDSSxJQUFHLElBQUksQ0FBQ3JhLElBQUksQ0FBQ21hLEVBQUUsR0FBR0UsS0FBSyxFQUM1QjtVQUNDLElBQUksQ0FBQ3JhLElBQUksQ0FBQ3NGLENBQUMsR0FBRytVLEtBQUs7UUFDcEIsQ0FBQyxNQUVEO1VBQ0MsSUFBSSxDQUFDcmEsSUFBSSxDQUFDc0YsQ0FBQyxHQUFHLElBQUksQ0FBQ3RGLElBQUksQ0FBQ21hLEVBQUU7UUFDM0I7UUFFQSxJQUFHLElBQUksQ0FBQ25hLElBQUksQ0FBQ29hLEVBQUUsR0FBRyxDQUFDQyxLQUFLLEVBQ3hCO1VBQ0MsSUFBSSxDQUFDcmEsSUFBSSxDQUFDdUYsQ0FBQyxHQUFHLENBQUM4VSxLQUFLO1FBQ3JCLENBQUMsTUFDSSxJQUFHLElBQUksQ0FBQ3JhLElBQUksQ0FBQ29hLEVBQUUsR0FBR0MsS0FBSyxFQUM1QjtVQUNDLElBQUksQ0FBQ3JhLElBQUksQ0FBQ3VGLENBQUMsR0FBRzhVLEtBQUs7UUFDcEIsQ0FBQyxNQUVEO1VBQ0MsSUFBSSxDQUFDcmEsSUFBSSxDQUFDdUYsQ0FBQyxHQUFHLElBQUksQ0FBQ3ZGLElBQUksQ0FBQ29hLEVBQUU7UUFDM0I7TUFDRDtJQUNEO0VBQUM7SUFBQXZnQixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBZ2dCLFNBQVNBLENBQUN0VCxLQUFLLEVBQ2Y7TUFDQyxJQUFJLENBQUN4RyxJQUFJLENBQUM0WixRQUFRLEdBQUcsS0FBSztNQUMxQixJQUFJLENBQUM1WixJQUFJLENBQUNzRixDQUFDLEdBQUcsQ0FBQztNQUNmLElBQUksQ0FBQ3RGLElBQUksQ0FBQ3VGLENBQUMsR0FBRyxDQUFDO0lBQ2hCO0VBQUM7QUFBQSxFQWhHOEJ6RixXQUFJOzs7Ozs7Ozs7OztBQ0ZwQyxJQUFBNFosTUFBQSxHQUFBN2UsT0FBQTtBQUEyQyxTQUFBMUIsZ0JBQUEwRCxDQUFBLEVBQUFDLENBQUEsVUFBQUQsQ0FBQSxZQUFBQyxDQUFBLGFBQUFDLFNBQUE7QUFBQSxTQUFBQyxrQkFBQUMsQ0FBQSxFQUFBQyxDQUFBLGFBQUFDLENBQUEsTUFBQUEsQ0FBQSxHQUFBRCxDQUFBLENBQUFFLE1BQUEsRUFBQUQsQ0FBQSxVQUFBRSxDQUFBLEdBQUFILENBQUEsQ0FBQUMsQ0FBQSxHQUFBRSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQVUsY0FBQSxDQUFBTixDQUFBLENBQUF4RCxHQUFBLEdBQUF3RCxDQUFBO0FBQUEsU0FBQW5FLGFBQUErRCxDQUFBLEVBQUFDLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFGLGlCQUFBLENBQUFDLENBQUEsQ0FBQVcsU0FBQSxFQUFBVixDQUFBLEdBQUFDLENBQUEsSUFBQUgsaUJBQUEsQ0FBQUMsQ0FBQSxFQUFBRSxDQUFBLEdBQUFNLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLGlCQUFBTyxRQUFBLFNBQUFQLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLFNBQUFrQixXQUFBbEIsQ0FBQSxFQUFBRSxDQUFBLEVBQUFKLENBQUEsV0FBQUksQ0FBQSxHQUFBaUIsZUFBQSxDQUFBakIsQ0FBQSxHQUFBa0IsMEJBQUEsQ0FBQXBCLENBQUEsRUFBQXFCLHlCQUFBLEtBQUFDLE9BQUEsQ0FBQUMsU0FBQSxDQUFBckIsQ0FBQSxFQUFBSixDQUFBLFFBQUFxQixlQUFBLENBQUFuQixDQUFBLEVBQUF3QixXQUFBLElBQUF0QixDQUFBLENBQUF1QixLQUFBLENBQUF6QixDQUFBLEVBQUFGLENBQUE7QUFBQSxTQUFBc0IsMkJBQUFwQixDQUFBLEVBQUFGLENBQUEsUUFBQUEsQ0FBQSxpQkFBQWMsT0FBQSxDQUFBZCxDQUFBLDBCQUFBQSxDQUFBLFVBQUFBLENBQUEsaUJBQUFBLENBQUEsWUFBQUYsU0FBQSxxRUFBQThCLHNCQUFBLENBQUExQixDQUFBO0FBQUEsU0FBQTBCLHVCQUFBNUIsQ0FBQSxtQkFBQUEsQ0FBQSxZQUFBNkIsY0FBQSxzRUFBQTdCLENBQUE7QUFBQSxTQUFBdUIsMEJBQUEsY0FBQXJCLENBQUEsSUFBQTRCLE9BQUEsQ0FBQW5CLFNBQUEsQ0FBQW9CLE9BQUEsQ0FBQWQsSUFBQSxDQUFBTyxPQUFBLENBQUFDLFNBQUEsQ0FBQUssT0FBQSxpQ0FBQTVCLENBQUEsYUFBQXFCLHlCQUFBLFlBQUFBLDBCQUFBLGFBQUFyQixDQUFBO0FBQUEsU0FBQW1CLGdCQUFBbkIsQ0FBQSxXQUFBbUIsZUFBQSxHQUFBYixNQUFBLENBQUF3QixjQUFBLEdBQUF4QixNQUFBLENBQUF5QixjQUFBLENBQUFDLElBQUEsZUFBQWhDLENBQUEsV0FBQUEsQ0FBQSxDQUFBaUMsU0FBQSxJQUFBM0IsTUFBQSxDQUFBeUIsY0FBQSxDQUFBL0IsQ0FBQSxNQUFBbUIsZUFBQSxDQUFBbkIsQ0FBQTtBQUFBLFNBQUFrQyxVQUFBbEMsQ0FBQSxFQUFBRixDQUFBLDZCQUFBQSxDQUFBLGFBQUFBLENBQUEsWUFBQUYsU0FBQSx3REFBQUksQ0FBQSxDQUFBUyxTQUFBLEdBQUFILE1BQUEsQ0FBQTZCLE1BQUEsQ0FBQXJDLENBQUEsSUFBQUEsQ0FBQSxDQUFBVyxTQUFBLElBQUFlLFdBQUEsSUFBQTdFLEtBQUEsRUFBQXFELENBQUEsRUFBQUssUUFBQSxNQUFBRCxZQUFBLFdBQUFFLE1BQUEsQ0FBQUMsY0FBQSxDQUFBUCxDQUFBLGlCQUFBSyxRQUFBLFNBQUFQLENBQUEsSUFBQXNDLGVBQUEsQ0FBQXBDLENBQUEsRUFBQUYsQ0FBQTtBQUFBLFNBQUFzQyxnQkFBQXBDLENBQUEsRUFBQUYsQ0FBQSxXQUFBc0MsZUFBQSxHQUFBOUIsTUFBQSxDQUFBd0IsY0FBQSxHQUFBeEIsTUFBQSxDQUFBd0IsY0FBQSxDQUFBRSxJQUFBLGVBQUFoQyxDQUFBLEVBQUFGLENBQUEsV0FBQUUsQ0FBQSxDQUFBaUMsU0FBQSxHQUFBbkMsQ0FBQSxFQUFBRSxDQUFBLEtBQUFvQyxlQUFBLENBQUFwQyxDQUFBLEVBQUFGLENBQUE7QUFBQSxJQUU5QjhFLFNBQVMsR0FBQTlJLE9BQUEsQ0FBQThJLFNBQUEsMEJBQUEvRixLQUFBO0VBRXJCLFNBQUErRixVQUFZL0IsSUFBSSxFQUNoQjtJQUFBLElBQUFDLEtBQUE7SUFBQTlHLGVBQUEsT0FBQTRJLFNBQUE7SUFDQzlCLEtBQUEsR0FBQTVCLFVBQUEsT0FBQTBELFNBQUEsR0FBTS9CLElBQUk7SUFDVkMsS0FBQSxDQUFLRyxRQUFRLEdBQUl2RixPQUFPLENBQUMsaUJBQWlCLENBQUM7SUFFM0NtRixJQUFJLENBQUMyQixXQUFXLENBQUMyTSxLQUFLLENBQUNDLElBQUksQ0FBQyxVQUFDQyxLQUFLLEVBQUc7TUFDcEN2TyxLQUFBLENBQUtELElBQUksQ0FBQ3NhLEtBQUssR0FBRzlMLEtBQUssQ0FBQzFFLE1BQU07SUFDL0IsQ0FBQyxDQUFDO0lBRUY3SixLQUFBLENBQUtELElBQUksQ0FBQ29CLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxVQUFDQyxDQUFDLEVBQUc7TUFDeENwQixLQUFBLENBQUtELElBQUksQ0FBQ3VhLGVBQWUsR0FBRyxJQUFJO0lBQ2pDLENBQUMsRUFBRTtNQUFDcFcsSUFBSSxFQUFDO0lBQUMsQ0FBQyxDQUFDO0lBRVpsRSxLQUFBLENBQUtELElBQUksQ0FBQ3dhLFdBQVcsR0FBSyxLQUFLO0lBQy9CdmEsS0FBQSxDQUFLRCxJQUFJLENBQUN5YSxTQUFTLEdBQU8sQ0FBQyxDQUFDO0lBQzVCeGEsS0FBQSxDQUFLRCxJQUFJLENBQUMwYSxhQUFhLEdBQUcsSUFBSTtJQUFBLE9BQUF6YSxLQUFBO0VBQy9CO0VBQUNaLFNBQUEsQ0FBQTBDLFNBQUEsRUFBQS9GLEtBQUE7RUFBQSxPQUFBOUMsWUFBQSxDQUFBNkksU0FBQTtJQUFBbEksR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQTZnQixhQUFhQSxDQUFDbFksR0FBRyxFQUNqQjtNQUNDdEgsT0FBTyxDQUFDc08sR0FBRyxDQUFDaEgsR0FBRyxDQUFDO01BRWhCLElBQUksQ0FBQ3pDLElBQUksQ0FBQ3VhLGVBQWUsR0FBRzlYLEdBQUc7SUFDaEM7RUFBQztJQUFBNUksR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQW9LLE1BQU1BLENBQUN1VyxTQUFTLEVBQ2hCO01BQ0NoZCxNQUFNLENBQUNpSyxNQUFNLENBQUMsSUFBSSxDQUFDMUgsSUFBSSxDQUFDeWEsU0FBUyxFQUFFQSxTQUFTLENBQUM7TUFFN0MsSUFBR0EsU0FBUyxDQUFDcFgsT0FBTyxLQUFLb1gsU0FBUyxDQUFDblgsWUFBWSxJQUMzQ21YLFNBQVMsQ0FBQzdXLE9BQU8sS0FBSzZXLFNBQVMsQ0FBQy9XLFlBQVksRUFDL0M7UUFDQSxJQUFJLENBQUMxRCxJQUFJLENBQUN3YSxXQUFXLEdBQUcsSUFBSTtNQUM3QixDQUFDLE1BRUQ7UUFDQyxJQUFJLENBQUN4YSxJQUFJLENBQUN3YSxXQUFXLEdBQUcsS0FBSztNQUM5QjtNQUVBLElBQUcsQ0FBQyxJQUFJLENBQUN4YSxJQUFJLENBQUN3YSxXQUFXLEVBQ3pCO1FBQ0MsSUFBSSxDQUFDeGEsSUFBSSxDQUFDNGEsY0FBYyxHQUFHLElBQUksQ0FBQzVhLElBQUksQ0FBQ3dCLEdBQUcsQ0FBQzhYLE9BQU8sQ0FBQ21CLFNBQVMsQ0FBQ3BYLE9BQU8sRUFBRW9YLFNBQVMsQ0FBQzdXLE9BQU8sQ0FBQztNQUN2RjtJQUNEO0VBQUM7QUFBQSxFQTdDNkI5RCxXQUFJOzs7Q0NGbkM7QUFBQTtBQUFBO0FBQUE7Q0NBQTtBQUFBO0FBQUE7QUFBQTs7Ozs7Ozs7Ozs7O0FDQUEsSUFBQWxELE9BQUEsR0FBQS9CLE9BQUE7QUFBMEMsU0FBQWtELFFBQUFWLENBQUEsc0NBQUFVLE9BQUEsd0JBQUFDLE1BQUEsdUJBQUFBLE1BQUEsQ0FBQXlLLFFBQUEsYUFBQXBMLENBQUEsa0JBQUFBLENBQUEsZ0JBQUFBLENBQUEsV0FBQUEsQ0FBQSx5QkFBQVcsTUFBQSxJQUFBWCxDQUFBLENBQUFzQixXQUFBLEtBQUFYLE1BQUEsSUFBQVgsQ0FBQSxLQUFBVyxNQUFBLENBQUFKLFNBQUEscUJBQUFQLENBQUEsS0FBQVUsT0FBQSxDQUFBVixDQUFBO0FBQUEsU0FBQWxFLGdCQUFBMEQsQ0FBQSxFQUFBQyxDQUFBLFVBQUFELENBQUEsWUFBQUMsQ0FBQSxhQUFBQyxTQUFBO0FBQUEsU0FBQUMsa0JBQUFDLENBQUEsRUFBQUMsQ0FBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUQsQ0FBQSxDQUFBRSxNQUFBLEVBQUFELENBQUEsVUFBQUUsQ0FBQSxHQUFBSCxDQUFBLENBQUFDLENBQUEsR0FBQUUsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsQ0FBQUMsVUFBQSxRQUFBRCxDQUFBLENBQUFFLFlBQUEsa0JBQUFGLENBQUEsS0FBQUEsQ0FBQSxDQUFBRyxRQUFBLFFBQUFDLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLEVBQUFVLGNBQUEsQ0FBQU4sQ0FBQSxDQUFBeEQsR0FBQSxHQUFBd0QsQ0FBQTtBQUFBLFNBQUFuRSxhQUFBK0QsQ0FBQSxFQUFBQyxDQUFBLEVBQUFDLENBQUEsV0FBQUQsQ0FBQSxJQUFBRixpQkFBQSxDQUFBQyxDQUFBLENBQUFXLFNBQUEsRUFBQVYsQ0FBQSxHQUFBQyxDQUFBLElBQUFILGlCQUFBLENBQUFDLENBQUEsRUFBQUUsQ0FBQSxHQUFBTSxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxpQkFBQU8sUUFBQSxTQUFBUCxDQUFBO0FBQUEsU0FBQVUsZUFBQVIsQ0FBQSxRQUFBVSxDQUFBLEdBQUFDLFlBQUEsQ0FBQVgsQ0FBQSxnQ0FBQVksT0FBQSxDQUFBRixDQUFBLElBQUFBLENBQUEsR0FBQUEsQ0FBQTtBQUFBLFNBQUFDLGFBQUFYLENBQUEsRUFBQUQsQ0FBQSxvQkFBQWEsT0FBQSxDQUFBWixDQUFBLE1BQUFBLENBQUEsU0FBQUEsQ0FBQSxNQUFBRixDQUFBLEdBQUFFLENBQUEsQ0FBQWEsTUFBQSxDQUFBQyxXQUFBLGtCQUFBaEIsQ0FBQSxRQUFBWSxDQUFBLEdBQUFaLENBQUEsQ0FBQWlCLElBQUEsQ0FBQWYsQ0FBQSxFQUFBRCxDQUFBLGdDQUFBYSxPQUFBLENBQUFGLENBQUEsVUFBQUEsQ0FBQSxZQUFBZCxTQUFBLHlFQUFBRyxDQUFBLEdBQUFpQixNQUFBLEdBQUFDLE1BQUEsRUFBQWpCLENBQUE7QUFBQSxJQUU3QjBkLEtBQUssR0FBQTVoQixPQUFBLENBQUE0aEIsS0FBQTtFQUVqQixTQUFBQSxNQUFZclYsSUFBSSxFQUFFeEYsSUFBSSxFQUN0QjtJQUFBN0csZUFBQSxPQUFBMGhCLEtBQUE7SUFDQyxJQUFJLENBQUNyVixJQUFJLEdBQUtBLElBQUk7SUFDbEIsSUFBSSxDQUFDdkMsT0FBTyxHQUFHLEVBQUU7O0lBRWpCO0lBQ0EsSUFBSSxDQUFDYyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNqQjtFQUNEO0VBQUMsT0FBQTdLLFlBQUEsQ0FBQTJoQixLQUFBO0lBQUFoaEIsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWlLLE1BQU1BLENBQUNwQixLQUFLLEVBQUVDLE1BQU0sRUFDcEI7TUFDQyxJQUFJLENBQUNELEtBQUssR0FBSUEsS0FBSztNQUNuQixJQUFJLENBQUNDLE1BQU0sR0FBR0EsTUFBTTtNQUVwQixLQUFJLElBQUkwQyxDQUFDLEdBQUcsQ0FBQyxFQUFFQSxDQUFDLEdBQUczQyxLQUFLLEVBQUUyQyxDQUFDLEVBQUUsRUFDN0I7UUFDQyxLQUFJLElBQUlDLENBQUMsR0FBRyxDQUFDLEVBQUVBLENBQUMsR0FBRzNDLE1BQU0sRUFBRTJDLENBQUMsRUFBRSxFQUM5QjtVQUNDLElBQU1oRCxNQUFNLEdBQUcsSUFBSUMsY0FBTSxDQUFDLElBQUksQ0FBQ2dELElBQUksRUFBRSxnQkFBZ0IsQ0FBQztVQUV0RGpELE1BQU0sQ0FBQytDLENBQUMsR0FBRyxFQUFFLEdBQUdBLENBQUM7VUFDakIvQyxNQUFNLENBQUNnRCxDQUFDLEdBQUcsRUFBRSxHQUFHQSxDQUFDO1VBRWpCLElBQUksQ0FBQ3RDLE9BQU8sQ0FBQ2dDLElBQUksQ0FBQzFDLE1BQU0sQ0FBQztRQUMxQjtNQUNEO0lBQ0Q7RUFBQztJQUFBMUksR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXNMLElBQUlBLENBQUEsRUFDSjtNQUNDLElBQUksQ0FBQ25DLE9BQU8sQ0FBQ3pCLEdBQUcsQ0FBQyxVQUFBb0ssQ0FBQztRQUFBLE9BQUlBLENBQUMsQ0FBQ3hHLElBQUksQ0FBQyxDQUFDO01BQUEsRUFBQztJQUNoQztFQUFDO0FBQUE7Ozs7Ozs7Ozs7O0FDcENGLElBQUEvSSxZQUFBLEdBQUF4QixPQUFBO0FBQ0EsSUFBQXlNLFdBQUEsR0FBQXpNLE9BQUE7QUFDQSxJQUFBMk4sU0FBQSxHQUFBM04sT0FBQTtBQUFtRCxTQUFBMUIsZ0JBQUEwRCxDQUFBLEVBQUFDLENBQUEsVUFBQUQsQ0FBQSxZQUFBQyxDQUFBLGFBQUFDLFNBQUE7QUFBQSxTQUFBQyxrQkFBQUMsQ0FBQSxFQUFBQyxDQUFBLGFBQUFDLENBQUEsTUFBQUEsQ0FBQSxHQUFBRCxDQUFBLENBQUFFLE1BQUEsRUFBQUQsQ0FBQSxVQUFBRSxDQUFBLEdBQUFILENBQUEsQ0FBQUMsQ0FBQSxHQUFBRSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQVUsY0FBQSxDQUFBTixDQUFBLENBQUF4RCxHQUFBLEdBQUF3RCxDQUFBO0FBQUEsU0FBQW5FLGFBQUErRCxDQUFBLEVBQUFDLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFGLGlCQUFBLENBQUFDLENBQUEsQ0FBQVcsU0FBQSxFQUFBVixDQUFBLEdBQUFDLENBQUEsSUFBQUgsaUJBQUEsQ0FBQUMsQ0FBQSxFQUFBRSxDQUFBLEdBQUFNLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLGlCQUFBTyxRQUFBLFNBQUFQLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLFNBQUFrQixXQUFBbEIsQ0FBQSxFQUFBRSxDQUFBLEVBQUFKLENBQUEsV0FBQUksQ0FBQSxHQUFBaUIsZUFBQSxDQUFBakIsQ0FBQSxHQUFBa0IsMEJBQUEsQ0FBQXBCLENBQUEsRUFBQXFCLHlCQUFBLEtBQUFDLE9BQUEsQ0FBQUMsU0FBQSxDQUFBckIsQ0FBQSxFQUFBSixDQUFBLFFBQUFxQixlQUFBLENBQUFuQixDQUFBLEVBQUF3QixXQUFBLElBQUF0QixDQUFBLENBQUF1QixLQUFBLENBQUF6QixDQUFBLEVBQUFGLENBQUE7QUFBQSxTQUFBc0IsMkJBQUFwQixDQUFBLEVBQUFGLENBQUEsUUFBQUEsQ0FBQSxpQkFBQWMsT0FBQSxDQUFBZCxDQUFBLDBCQUFBQSxDQUFBLFVBQUFBLENBQUEsaUJBQUFBLENBQUEsWUFBQUYsU0FBQSxxRUFBQThCLHNCQUFBLENBQUExQixDQUFBO0FBQUEsU0FBQTBCLHVCQUFBNUIsQ0FBQSxtQkFBQUEsQ0FBQSxZQUFBNkIsY0FBQSxzRUFBQTdCLENBQUE7QUFBQSxTQUFBdUIsMEJBQUEsY0FBQXJCLENBQUEsSUFBQTRCLE9BQUEsQ0FBQW5CLFNBQUEsQ0FBQW9CLE9BQUEsQ0FBQWQsSUFBQSxDQUFBTyxPQUFBLENBQUFDLFNBQUEsQ0FBQUssT0FBQSxpQ0FBQTVCLENBQUEsYUFBQXFCLHlCQUFBLFlBQUFBLDBCQUFBLGFBQUFyQixDQUFBO0FBQUEsU0FBQW1CLGdCQUFBbkIsQ0FBQSxXQUFBbUIsZUFBQSxHQUFBYixNQUFBLENBQUF3QixjQUFBLEdBQUF4QixNQUFBLENBQUF5QixjQUFBLENBQUFDLElBQUEsZUFBQWhDLENBQUEsV0FBQUEsQ0FBQSxDQUFBaUMsU0FBQSxJQUFBM0IsTUFBQSxDQUFBeUIsY0FBQSxDQUFBL0IsQ0FBQSxNQUFBbUIsZUFBQSxDQUFBbkIsQ0FBQTtBQUFBLFNBQUFrQyxVQUFBbEMsQ0FBQSxFQUFBRixDQUFBLDZCQUFBQSxDQUFBLGFBQUFBLENBQUEsWUFBQUYsU0FBQSx3REFBQUksQ0FBQSxDQUFBUyxTQUFBLEdBQUFILE1BQUEsQ0FBQTZCLE1BQUEsQ0FBQXJDLENBQUEsSUFBQUEsQ0FBQSxDQUFBVyxTQUFBLElBQUFlLFdBQUEsSUFBQTdFLEtBQUEsRUFBQXFELENBQUEsRUFBQUssUUFBQSxNQUFBRCxZQUFBLFdBQUFFLE1BQUEsQ0FBQUMsY0FBQSxDQUFBUCxDQUFBLGlCQUFBSyxRQUFBLFNBQUFQLENBQUEsSUFBQXNDLGVBQUEsQ0FBQXBDLENBQUEsRUFBQUYsQ0FBQTtBQUFBLFNBQUFzQyxnQkFBQXBDLENBQUEsRUFBQUYsQ0FBQSxXQUFBc0MsZUFBQSxHQUFBOUIsTUFBQSxDQUFBd0IsY0FBQSxHQUFBeEIsTUFBQSxDQUFBd0IsY0FBQSxDQUFBRSxJQUFBLGVBQUFoQyxDQUFBLEVBQUFGLENBQUEsV0FBQUUsQ0FBQSxDQUFBaUMsU0FBQSxHQUFBbkMsQ0FBQSxFQUFBRSxDQUFBLEtBQUFvQyxlQUFBLENBQUFwQyxDQUFBLEVBQUFGLENBQUE7QUFBQSxJQUVyQzZkLEdBQUcsR0FBQTdoQixPQUFBLENBQUE2aEIsR0FBQSwwQkFBQUMsa0JBQUE7RUFHaEIsU0FBQUQsSUFBQSxFQUNBO0lBQUEsSUFBQTdhLEtBQUE7SUFBQTlHLGVBQUEsT0FBQTJoQixHQUFBO0lBQ0M3YSxLQUFBLEdBQUE1QixVQUFBLE9BQUF5YyxHQUFBO0lBRUE3YSxLQUFBLENBQUswSSxrQkFBUSxDQUFDOEQsT0FBTyxDQUFDLEdBQUcsSUFBSTtJQUU3QnhNLEtBQUEsQ0FBS3FhLEtBQUssR0FBRyxDQUFDLENBQUM7SUFBQyxPQUFBcmEsS0FBQTtFQUNqQjtFQUFDWixTQUFBLENBQUF5YixHQUFBLEVBQUFDLGtCQUFBO0VBQUEsT0FBQTdoQixZQUFBLENBQUE0aEIsR0FBQTtJQUFBamhCLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUF3ZixPQUFPQSxDQUFDaFUsQ0FBQyxFQUFFQyxDQUFDLEVBQ1o7TUFBQSxJQURjNEUsS0FBSyxHQUFBNUMsU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLENBQUM7TUFFdEIsSUFBRyxJQUFJLENBQUMrUyxLQUFLLElBQUF6VSxNQUFBLENBQUlQLENBQUMsT0FBQU8sTUFBQSxDQUFJTixDQUFDLFFBQUFNLE1BQUEsQ0FBS3NFLEtBQUssRUFBRyxFQUNwQztRQUNDLE9BQU8sQ0FDTixJQUFJLENBQUN2SSxXQUFXLENBQUM4TSxRQUFRLENBQUMsSUFBSSxDQUFDNEwsS0FBSyxJQUFBelUsTUFBQSxDQUFJUCxDQUFDLE9BQUFPLE1BQUEsQ0FBSU4sQ0FBQyxRQUFBTSxNQUFBLENBQUtzRSxLQUFLLEVBQUcsQ0FBQyxDQUM1RDtNQUNGO01BRUEsSUFBSTZRLEtBQUssR0FBRyxDQUFDO01BQ2IsSUFBSUMsTUFBTSxHQUFHLFlBQVk7TUFFekIsSUFBSTNWLENBQUMsR0FBRzBWLEtBQUssS0FBSyxDQUFDLElBQU16VixDQUFDLEdBQUd5VixLQUFLLEtBQUssQ0FBRSxFQUN6QztRQUNDQyxNQUFNLEdBQUcsWUFBWTtNQUN0QjtNQUVBLElBQUczVixDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUlDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFDdkI7UUFDQyxPQUFPO1FBQ047UUFDQSxJQUFJLENBQUMzRCxXQUFXLENBQUM4TSxRQUFRLENBQUMsY0FBYyxDQUFDLENBQ3pDO01BQ0Y7TUFFQSxPQUFPLENBQ04sSUFBSSxDQUFDOU0sV0FBVyxDQUFDOE0sUUFBUSxDQUFDLGVBQWU7TUFDekM7TUFBQSxDQUNBO01BRUQsT0FBTyxDQUNOLElBQUksQ0FBQzlNLFdBQVcsQ0FBQzhNLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFDeEMsSUFBSSxDQUFDOU0sV0FBVyxDQUFDOE0sUUFBUSxDQUFDdU0sTUFBTSxDQUFDLENBQ25DO0lBQ0Y7RUFBQztJQUFBcGhCLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFnSyxPQUFPQSxDQUFDd0IsQ0FBQyxFQUFFQyxDQUFDLEVBQUVxSixLQUFLLEVBQ25CO01BQUEsSUFEcUJ6RSxLQUFLLEdBQUE1QyxTQUFBLENBQUFuSyxNQUFBLFFBQUFtSyxTQUFBLFFBQUE3RSxTQUFBLEdBQUE2RSxTQUFBLE1BQUcsQ0FBQztNQUU3QixJQUFJLENBQUMrUyxLQUFLLElBQUF6VSxNQUFBLENBQUlQLENBQUMsT0FBQU8sTUFBQSxDQUFJTixDQUFDLFFBQUFNLE1BQUEsQ0FBS3NFLEtBQUssRUFBRyxHQUFHeUUsS0FBSztJQUMxQztFQUFDO0lBQUEvVSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBb2hCLE9BQU1BLENBQUEsRUFDTjtNQUNDL2YsT0FBTyxDQUFDc08sR0FBRyxDQUFDMFIsSUFBSSxDQUFDQyxTQUFTLENBQUMsSUFBSSxDQUFDZCxLQUFLLENBQUMsQ0FBQztJQUN4QztFQUFDO0lBQUF6Z0IsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXVoQixPQUFNQSxDQUFDQyxLQUFLLEVBQ1o7TUFDQ0EsS0FBSyxvSEFBd0c7TUFFN0csSUFBSSxDQUFDaEIsS0FBSyxHQUFHYSxJQUFJLENBQUNJLEtBQUssQ0FBQ0QsS0FBSyxDQUFDOztNQUU5QjtJQUNEO0VBQUM7QUFBQSxFQWhFTTNULHNCQUFVLENBQUNILE1BQU0sQ0FBQztFQUFDNUYsV0FBVyxFQUFYQTtBQUFXLENBQUMsQ0FBQyxHQW9FeEM7Ozs7Ozs7OztBQ3pFQTtBQUNBLENBQUMsWUFBVztFQUNWLElBQUk0WixTQUFTLEdBQUd0YixNQUFNLENBQUNzYixTQUFTLElBQUl0YixNQUFNLENBQUN1YixZQUFZO0VBQ3ZELElBQUlDLEVBQUUsR0FBR3hiLE1BQU0sQ0FBQ3liLE1BQU0sR0FBSXpiLE1BQU0sQ0FBQ3liLE1BQU0sSUFBSSxDQUFDLENBQUU7RUFDOUMsSUFBSUMsRUFBRSxHQUFHRixFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUlBLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUU7RUFDdEQsSUFBSSxDQUFDRixTQUFTLElBQUlJLEVBQUUsQ0FBQ0MsUUFBUSxFQUFFO0VBQy9CLElBQUkzYixNQUFNLENBQUM0YixHQUFHLEVBQUU7RUFDaEI1YixNQUFNLENBQUM0YixHQUFHLEdBQUcsSUFBSTtFQUVqQixJQUFJQyxXQUFXLEdBQUcsU0FBZEEsV0FBV0EsQ0FBWUMsR0FBRyxFQUFDO0lBQzdCLElBQUlDLElBQUksR0FBRzlWLElBQUksQ0FBQytWLEtBQUssQ0FBQ0MsSUFBSSxDQUFDeFgsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzJILFFBQVEsQ0FBQyxDQUFDO0lBQ25EMFAsR0FBRyxHQUFHQSxHQUFHLENBQUNJLE9BQU8sQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLENBQUM7SUFDaEQsT0FBT0osR0FBRyxJQUFJQSxHQUFHLENBQUNLLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFFLGNBQWMsR0FBR0osSUFBSTtFQUN6RSxDQUFDO0VBRUQsSUFBSUssT0FBTyxHQUFHQyxTQUFTLENBQUNDLFNBQVMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7RUFDL0MsSUFBSUMsWUFBWSxHQUFHZCxFQUFFLENBQUNjLFlBQVksSUFBSUosT0FBTyxDQUFDRCxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBRXBFLElBQUlNLFNBQVMsR0FBRztJQUNkQyxJQUFJLEVBQUUsU0FBTkEsSUFBSUEsQ0FBQSxFQUFZO01BQ2QxYyxNQUFNLENBQUMvRixRQUFRLENBQUMwaUIsTUFBTSxDQUFDLElBQUksQ0FBQztJQUM5QixDQUFDO0lBRURDLFVBQVUsRUFBRSxTQUFaQSxVQUFVQSxDQUFBLEVBQVk7TUFDcEIsRUFBRSxDQUFDdlEsS0FBSyxDQUNMck8sSUFBSSxDQUFDM0UsUUFBUSxDQUFDd2pCLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FDdkR6TCxNQUFNLENBQUMsVUFBUzBMLElBQUksRUFBRTtRQUNyQixJQUFJQyxHQUFHLEdBQUdELElBQUksQ0FBQ0UsWUFBWSxDQUFDLGlCQUFpQixDQUFDO1FBQzlDLE9BQU9GLElBQUksQ0FBQ0csSUFBSSxJQUFJRixHQUFHLElBQUksT0FBTztNQUNwQyxDQUFDLENBQUMsQ0FDRDdSLE9BQU8sQ0FBQyxVQUFTNFIsSUFBSSxFQUFFO1FBQ3RCQSxJQUFJLENBQUNHLElBQUksR0FBR3BCLFdBQVcsQ0FBQ2lCLElBQUksQ0FBQ0csSUFBSSxDQUFDO01BQ3BDLENBQUMsQ0FBQzs7TUFFSjtNQUNBLElBQUlULFlBQVksRUFBRVUsVUFBVSxDQUFDLFlBQVc7UUFBRTdqQixRQUFRLENBQUNrTSxJQUFJLENBQUM0WCxZQUFZO01BQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztJQUM5RSxDQUFDO0lBRURDLFVBQVUsRUFBRSxTQUFaQSxVQUFVQSxDQUFBLEVBQVk7TUFDcEIsSUFBSUMsT0FBTyxHQUFHLEVBQUUsQ0FBQ2hSLEtBQUssQ0FBQ3JPLElBQUksQ0FBQzNFLFFBQVEsQ0FBQ3dqQixnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztNQUNoRSxJQUFJUyxXQUFXLEdBQUdELE9BQU8sQ0FBQy9iLEdBQUcsQ0FBQyxVQUFTaWMsTUFBTSxFQUFFO1FBQUUsT0FBT0EsTUFBTSxDQUFDaEcsSUFBSTtNQUFDLENBQUMsQ0FBQyxDQUFDbkcsTUFBTSxDQUFDLFVBQVNtRyxJQUFJLEVBQUU7UUFBRSxPQUFPQSxJQUFJLENBQUNyYSxNQUFNLEdBQUcsQ0FBQztNQUFDLENBQUMsQ0FBQztNQUN4SCxJQUFJc2dCLFVBQVUsR0FBR0gsT0FBTyxDQUFDak0sTUFBTSxDQUFDLFVBQVNtTSxNQUFNLEVBQUU7UUFBRSxPQUFPQSxNQUFNLENBQUNoYixHQUFHO01BQUMsQ0FBQyxDQUFDO01BRXZFLElBQUlrYixNQUFNLEdBQUcsQ0FBQztNQUNkLElBQUl4TixHQUFHLEdBQUd1TixVQUFVLENBQUN0Z0IsTUFBTTtNQUMzQixJQUFJd2dCLE1BQU0sR0FBRyxTQUFUQSxNQUFNQSxDQUFBLEVBQWM7UUFDdEJELE1BQU0sR0FBR0EsTUFBTSxHQUFHLENBQUM7UUFDbkIsSUFBSUEsTUFBTSxLQUFLeE4sR0FBRyxFQUFFO1VBQ2xCcU4sV0FBVyxDQUFDcFMsT0FBTyxDQUFDLFVBQVNxUyxNQUFNLEVBQUU7WUFBRUksSUFBSSxDQUFDSixNQUFNLENBQUM7VUFBRSxDQUFDLENBQUM7UUFDekQ7TUFDRixDQUFDO01BRURDLFVBQVUsQ0FDUHRTLE9BQU8sQ0FBQyxVQUFTcVMsTUFBTSxFQUFFO1FBQ3hCLElBQUloYixHQUFHLEdBQUdnYixNQUFNLENBQUNoYixHQUFHO1FBQ3BCZ2IsTUFBTSxDQUFDSyxNQUFNLENBQUMsQ0FBQztRQUNmLElBQUlDLFNBQVMsR0FBR3hrQixRQUFRLENBQUNDLGFBQWEsQ0FBQyxRQUFRLENBQUM7UUFDaER1a0IsU0FBUyxDQUFDdGIsR0FBRyxHQUFHc1osV0FBVyxDQUFDdFosR0FBRyxDQUFDO1FBQ2hDc2IsU0FBUyxDQUFDQyxLQUFLLEdBQUcsSUFBSTtRQUN0QkQsU0FBUyxDQUFDakgsTUFBTSxHQUFHOEcsTUFBTTtRQUN6QnJrQixRQUFRLENBQUMwa0IsSUFBSSxDQUFDQyxXQUFXLENBQUNILFNBQVMsQ0FBQztNQUN0QyxDQUFDLENBQUM7SUFDTjtFQUNGLENBQUM7RUFDRCxJQUFJSSxJQUFJLEdBQUd2QyxFQUFFLENBQUN1QyxJQUFJLElBQUksSUFBSTtFQUMxQixJQUFJQyxJQUFJLEdBQUcxQyxFQUFFLENBQUMyQyxNQUFNLElBQUluZSxNQUFNLENBQUMvRixRQUFRLENBQUNta0IsUUFBUSxJQUFJLFdBQVc7RUFFL0QsSUFBSUMsUUFBTyxHQUFHLFNBQVZBLE9BQU9BLENBQUEsRUFBYTtJQUN0QixJQUFJQyxVQUFVLEdBQUcsSUFBSWhELFNBQVMsQ0FBQyxPQUFPLEdBQUc0QyxJQUFJLEdBQUcsR0FBRyxHQUFHRCxJQUFJLENBQUM7SUFDM0RLLFVBQVUsQ0FBQ0MsU0FBUyxHQUFHLFVBQVNqWSxLQUFLLEVBQUM7TUFDcEMsSUFBSW9WLEVBQUUsQ0FBQ0MsUUFBUSxFQUFFO01BQ2pCLElBQUk2QyxPQUFPLEdBQUdsWSxLQUFLLENBQUNtWSxJQUFJO01BQ3hCLElBQUlDLFFBQVEsR0FBR2pDLFNBQVMsQ0FBQytCLE9BQU8sQ0FBQyxJQUFJL0IsU0FBUyxDQUFDQyxJQUFJO01BQ25EZ0MsUUFBUSxDQUFDLENBQUM7SUFDWixDQUFDO0lBQ0RKLFVBQVUsQ0FBQ0ssT0FBTyxHQUFHLFlBQVU7TUFDN0IsSUFBSUwsVUFBVSxDQUFDTSxVQUFVLEVBQUVOLFVBQVUsQ0FBQ08sS0FBSyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUNEUCxVQUFVLENBQUNRLE9BQU8sR0FBRyxZQUFVO01BQzdCOWUsTUFBTSxDQUFDa2QsVUFBVSxDQUFDbUIsUUFBTyxFQUFFLElBQUksQ0FBQztJQUNsQyxDQUFDO0VBQ0gsQ0FBQztFQUNEQSxRQUFPLENBQUMsQ0FBQztBQUNYLENBQUMsRUFBRSxDQUFDO0FBQ0oiLCJmaWxlIjoiZG9jcy9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9CYWcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkJhZyA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBfTWl4aW4gPSByZXF1aXJlKFwiLi9NaXhpblwiKTtcbnZhciBfRXZlbnRUYXJnZXRNaXhpbiA9IHJlcXVpcmUoXCIuLi9taXhpbi9FdmVudFRhcmdldE1peGluXCIpO1xudmFyIHRvSWQgPSBpbnQgPT4gTnVtYmVyKGludCk7XG52YXIgZnJvbUlkID0gaWQgPT4gcGFyc2VJbnQoaWQpO1xudmFyIE1hcHBlZCA9IFN5bWJvbCgnTWFwcGVkJyk7XG52YXIgSGFzID0gU3ltYm9sKCdIYXMnKTtcbnZhciBBZGQgPSBTeW1ib2woJ0FkZCcpO1xudmFyIFJlbW92ZSA9IFN5bWJvbCgnUmVtb3ZlJyk7XG52YXIgRGVsZXRlID0gU3ltYm9sKCdEZWxldGUnKTtcbmNsYXNzIEJhZyBleHRlbmRzIF9NaXhpbi5NaXhpbi53aXRoKF9FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4pIHtcbiAgY29uc3RydWN0b3IoY2hhbmdlQ2FsbGJhY2sgPSB1bmRlZmluZWQpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2sgPSBjaGFuZ2VDYWxsYmFjaztcbiAgICB0aGlzLmNvbnRlbnQgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5saXN0ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShbXSk7XG4gICAgdGhpcy5tZXRhID0gU3ltYm9sKCdtZXRhJyk7XG4gICAgdGhpcy50eXBlID0gdW5kZWZpbmVkO1xuICB9XG4gIGhhcyhpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5oYXMoaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW0hhc10oaXRlbSk7XG4gIH1cbiAgW0hhc10oaXRlbSkge1xuICAgIHJldHVybiB0aGlzLmNvbnRlbnQuaGFzKGl0ZW0pO1xuICB9XG4gIGFkZChpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5hZGQoaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW0FkZF0oaXRlbSk7XG4gIH1cbiAgW0FkZF0oaXRlbSkge1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQgfHwgIShpdGVtIGluc3RhbmNlb2YgT2JqZWN0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9iamVjdHMgbWF5IGJlIGFkZGVkIHRvIEJhZ3MuJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnR5cGUgJiYgIShpdGVtIGluc3RhbmNlb2YgdGhpcy50eXBlKSkge1xuICAgICAgY29uc29sZS5lcnJvcih0aGlzLnR5cGUsIGl0ZW0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbmx5IG9iamVjdHMgb2YgdHlwZSAke3RoaXMudHlwZX0gbWF5IGJlIGFkZGVkIHRvIHRoaXMgQmFnLmApO1xuICAgIH1cbiAgICBpdGVtID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoaXRlbSk7XG4gICAgaWYgKHRoaXMuY29udGVudC5oYXMoaXRlbSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGFkZGluZyA9IG5ldyBDdXN0b21FdmVudCgnYWRkaW5nJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChhZGRpbmcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpZCA9IHRvSWQodGhpcy5jdXJyZW50KyspO1xuICAgIHRoaXMuY29udGVudC5zZXQoaXRlbSwgaWQpO1xuICAgIHRoaXMubGlzdFtpZF0gPSBpdGVtO1xuICAgIGlmICh0aGlzLmNoYW5nZUNhbGxiYWNrKSB7XG4gICAgICB0aGlzLmNoYW5nZUNhbGxiYWNrKGl0ZW0sIHRoaXMubWV0YSwgQmFnLklURU1fQURERUQsIGlkKTtcbiAgICB9XG4gICAgdmFyIGFkZCA9IG5ldyBDdXN0b21FdmVudCgnYWRkZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbSxcbiAgICAgICAgaWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoYWRkKTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuc2l6ZTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgcmVtb3ZlKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLnJlbW92ZShpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbUmVtb3ZlXShpdGVtKTtcbiAgfVxuICBbUmVtb3ZlXShpdGVtKSB7XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCB8fCAhKGl0ZW0gaW5zdGFuY2VvZiBPYmplY3QpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgb2JqZWN0cyBtYXkgYmUgcmVtb3ZlZCBmcm9tIEJhZ3MuJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnR5cGUgJiYgIShpdGVtIGluc3RhbmNlb2YgdGhpcy50eXBlKSkge1xuICAgICAgY29uc29sZS5lcnJvcih0aGlzLnR5cGUsIGl0ZW0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbmx5IG9iamVjdHMgb2YgdHlwZSAke3RoaXMudHlwZX0gbWF5IGJlIHJlbW92ZWQgZnJvbSB0aGlzIEJhZy5gKTtcbiAgICB9XG4gICAgaXRlbSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKGl0ZW0pO1xuICAgIGlmICghdGhpcy5jb250ZW50LmhhcyhpdGVtKSkge1xuICAgICAgaWYgKHRoaXMuY2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5jaGFuZ2VDYWxsYmFjayhpdGVtLCB0aGlzLm1ldGEsIDAsIHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciByZW1vdmluZyA9IG5ldyBDdXN0b21FdmVudCgncmVtb3ZpbmcnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KHJlbW92aW5nKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaWQgPSB0aGlzLmNvbnRlbnQuZ2V0KGl0ZW0pO1xuICAgIGRlbGV0ZSB0aGlzLmxpc3RbaWRdO1xuICAgIHRoaXMuY29udGVudC5kZWxldGUoaXRlbSk7XG4gICAgaWYgKHRoaXMuY2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2soaXRlbSwgdGhpcy5tZXRhLCBCYWcuSVRFTV9SRU1PVkVELCBpZCk7XG4gICAgfVxuICAgIHZhciByZW1vdmUgPSBuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92ZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbSxcbiAgICAgICAgaWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQocmVtb3ZlKTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuc2l6ZTtcbiAgICByZXR1cm4gaXRlbTtcbiAgfVxuICBkZWxldGUoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0uZGVsZXRlKGl0ZW0pO1xuICAgIH1cbiAgICB0aGlzW0RlbGV0ZV0oaXRlbSk7XG4gIH1cbiAgW0RlbGV0ZV0oaXRlbSkge1xuICAgIHRoaXMucmVtb3ZlKGl0ZW0pO1xuICB9XG4gIG1hcChtYXBwZXIgPSB4ID0+IHgsIGZpbHRlciA9IHggPT4geCkge1xuICAgIHZhciBtYXBwZWRJdGVtcyA9IG5ldyBXZWFrTWFwKCk7XG4gICAgdmFyIG1hcHBlZEJhZyA9IG5ldyBCYWcoKTtcbiAgICBtYXBwZWRCYWdbTWFwcGVkXSA9IHRoaXM7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdhZGRlZCcsIGV2ZW50ID0+IHtcbiAgICAgIHZhciBpdGVtID0gZXZlbnQuZGV0YWlsLml0ZW07XG4gICAgICBpZiAoIWZpbHRlcihpdGVtKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAobWFwcGVkSXRlbXMuaGFzKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBtYXBwZWQgPSBtYXBwZXIoaXRlbSk7XG4gICAgICBtYXBwZWRJdGVtcy5zZXQoaXRlbSwgbWFwcGVkKTtcbiAgICAgIG1hcHBlZEJhZ1tBZGRdKG1hcHBlZCk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdyZW1vdmVkJywgZXZlbnQgPT4ge1xuICAgICAgdmFyIGl0ZW0gPSBldmVudC5kZXRhaWwuaXRlbTtcbiAgICAgIGlmICghbWFwcGVkSXRlbXMuaGFzKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBtYXBwZWQgPSBtYXBwZWRJdGVtcy5nZXQoaXRlbSk7XG4gICAgICBtYXBwZWRJdGVtcy5kZWxldGUoaXRlbSk7XG4gICAgICBtYXBwZWRCYWdbUmVtb3ZlXShtYXBwZWQpO1xuICAgIH0pO1xuICAgIHJldHVybiBtYXBwZWRCYWc7XG4gIH1cbiAgZ2V0IHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29udGVudC5zaXplO1xuICB9XG4gIGl0ZW1zKCkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuY29udGVudC5lbnRyaWVzKCkpLm1hcChlbnRyeSA9PiBlbnRyeVswXSk7XG4gIH1cbn1cbmV4cG9ydHMuQmFnID0gQmFnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJhZywgJ0lURU1fQURERUQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IDFcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJhZywgJ0lURU1fUkVNT1ZFRCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogLTFcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkJpbmRhYmxlID0gdm9pZCAwO1xuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KGUsIHIsIHQpIHsgcmV0dXJuIChyID0gX3RvUHJvcGVydHlLZXkocikpIGluIGUgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgciwgeyB2YWx1ZTogdCwgZW51bWVyYWJsZTogITAsIGNvbmZpZ3VyYWJsZTogITAsIHdyaXRhYmxlOiAhMCB9KSA6IGVbcl0gPSB0LCBlOyB9XG5mdW5jdGlvbiBfdG9Qcm9wZXJ0eUtleSh0KSB7IHZhciBpID0gX3RvUHJpbWl0aXZlKHQsIFwic3RyaW5nXCIpOyByZXR1cm4gXCJzeW1ib2xcIiA9PSB0eXBlb2YgaSA/IGkgOiBpICsgXCJcIjsgfVxuZnVuY3Rpb24gX3RvUHJpbWl0aXZlKHQsIHIpIHsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIHQgfHwgIXQpIHJldHVybiB0OyB2YXIgZSA9IHRbU3ltYm9sLnRvUHJpbWl0aXZlXTsgaWYgKHZvaWQgMCAhPT0gZSkgeyB2YXIgaSA9IGUuY2FsbCh0LCByIHx8IFwiZGVmYXVsdFwiKTsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIGkpIHJldHVybiBpOyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQEB0b1ByaW1pdGl2ZSBtdXN0IHJldHVybiBhIHByaW1pdGl2ZSB2YWx1ZS5cIik7IH0gcmV0dXJuIChcInN0cmluZ1wiID09PSByID8gU3RyaW5nIDogTnVtYmVyKSh0KTsgfVxudmFyIFJlZiA9IFN5bWJvbCgncmVmJyk7XG52YXIgT3JpZ2luYWwgPSBTeW1ib2woJ29yaWdpbmFsJyk7XG52YXIgRGVjayA9IFN5bWJvbCgnZGVjaycpO1xudmFyIEJpbmRpbmcgPSBTeW1ib2woJ2JpbmRpbmcnKTtcbnZhciBTdWJCaW5kaW5nID0gU3ltYm9sKCdzdWJCaW5kaW5nJyk7XG52YXIgQmluZGluZ0FsbCA9IFN5bWJvbCgnYmluZGluZ0FsbCcpO1xudmFyIElzQmluZGFibGUgPSBTeW1ib2woJ2lzQmluZGFibGUnKTtcbnZhciBXcmFwcGluZyA9IFN5bWJvbCgnd3JhcHBpbmcnKTtcbnZhciBOYW1lcyA9IFN5bWJvbCgnTmFtZXMnKTtcbnZhciBFeGVjdXRpbmcgPSBTeW1ib2woJ2V4ZWN1dGluZycpO1xudmFyIFN0YWNrID0gU3ltYm9sKCdzdGFjaycpO1xudmFyIE9ialN5bWJvbCA9IFN5bWJvbCgnb2JqZWN0Jyk7XG52YXIgV3JhcHBlZCA9IFN5bWJvbCgnd3JhcHBlZCcpO1xudmFyIFVud3JhcHBlZCA9IFN5bWJvbCgndW53cmFwcGVkJyk7XG52YXIgR2V0UHJvdG8gPSBTeW1ib2woJ2dldFByb3RvJyk7XG52YXIgT25HZXQgPSBTeW1ib2woJ29uR2V0Jyk7XG52YXIgT25BbGxHZXQgPSBTeW1ib2woJ29uQWxsR2V0Jyk7XG52YXIgQmluZENoYWluID0gU3ltYm9sKCdiaW5kQ2hhaW4nKTtcbnZhciBEZXNjcmlwdG9ycyA9IFN5bWJvbCgnRGVzY3JpcHRvcnMnKTtcbnZhciBCZWZvcmUgPSBTeW1ib2woJ0JlZm9yZScpO1xudmFyIEFmdGVyID0gU3ltYm9sKCdBZnRlcicpO1xudmFyIE5vR2V0dGVycyA9IFN5bWJvbCgnTm9HZXR0ZXJzJyk7XG52YXIgUHJldmVudCA9IFN5bWJvbCgnUHJldmVudCcpO1xudmFyIFR5cGVkQXJyYXkgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoSW50OEFycmF5KTtcbnZhciBTZXRJdGVyYXRvciA9IFNldC5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXTtcbnZhciBNYXBJdGVyYXRvciA9IE1hcC5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXTtcbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xudmFyIGlzRXhjbHVkZWQgPSBvYmplY3QgPT4gdHlwZW9mIHdpbi5NYXAgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLk1hcCB8fCB0eXBlb2Ygd2luLlNldCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uU2V0IHx8IHR5cGVvZiB3aW4uTm9kZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTm9kZSB8fCB0eXBlb2Ygd2luLldlYWtNYXAgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLldlYWtNYXAgfHwgdHlwZW9mIHdpbi5Mb2NhdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTG9jYXRpb24gfHwgdHlwZW9mIHdpbi5TdG9yYWdlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5TdG9yYWdlIHx8IHR5cGVvZiB3aW4uV2Vha1NldCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uV2Vha1NldCB8fCB0eXBlb2Ygd2luLkFycmF5QnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5BcnJheUJ1ZmZlciB8fCB0eXBlb2Ygd2luLlByb21pc2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlByb21pc2UgfHwgdHlwZW9mIHdpbi5GaWxlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5GaWxlIHx8IHR5cGVvZiB3aW4uRXZlbnQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkV2ZW50IHx8IHR5cGVvZiB3aW4uQ3VzdG9tRXZlbnQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkN1c3RvbUV2ZW50IHx8IHR5cGVvZiB3aW4uR2FtZXBhZCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uR2FtZXBhZCB8fCB0eXBlb2Ygd2luLlJlc2l6ZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5SZXNpemVPYnNlcnZlciB8fCB0eXBlb2Ygd2luLk11dGF0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLk11dGF0aW9uT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5QZXJmb3JtYW5jZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5QZXJmb3JtYW5jZU9ic2VydmVyIHx8IHR5cGVvZiB3aW4uSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkludGVyc2VjdGlvbk9ic2VydmVyIHx8IHR5cGVvZiB3aW4uSURCQ3Vyc29yID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJDdXJzb3IgfHwgdHlwZW9mIHdpbi5JREJDdXJzb3JXaXRoVmFsdWUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkN1cnNvcldpdGhWYWx1ZSB8fCB0eXBlb2Ygd2luLklEQkRhdGFiYXNlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJEYXRhYmFzZSB8fCB0eXBlb2Ygd2luLklEQkZhY3RvcnkgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkZhY3RvcnkgfHwgdHlwZW9mIHdpbi5JREJJbmRleCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCSW5kZXggfHwgdHlwZW9mIHdpbi5JREJLZXlSYW5nZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCS2V5UmFuZ2UgfHwgdHlwZW9mIHdpbi5JREJPYmplY3RTdG9yZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCT2JqZWN0U3RvcmUgfHwgdHlwZW9mIHdpbi5JREJPcGVuREJSZXF1ZXN0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJPcGVuREJSZXF1ZXN0IHx8IHR5cGVvZiB3aW4uSURCUmVxdWVzdCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCUmVxdWVzdCB8fCB0eXBlb2Ygd2luLklEQlRyYW5zYWN0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJUcmFuc2FjdGlvbiB8fCB0eXBlb2Ygd2luLklEQlZlcnNpb25DaGFuZ2VFdmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCVmVyc2lvbkNoYW5nZUV2ZW50IHx8IHR5cGVvZiB3aW4uRmlsZVN5c3RlbUZpbGVIYW5kbGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkZpbGVTeXN0ZW1GaWxlSGFuZGxlIHx8IHR5cGVvZiB3aW4uUlRDUGVlckNvbm5lY3Rpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlJUQ1BlZXJDb25uZWN0aW9uIHx8IHR5cGVvZiB3aW4uU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbiB8fCB0eXBlb2Ygd2luLldlYkdMVGV4dHVyZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uV2ViR0xUZXh0dXJlO1xuY2xhc3MgQmluZGFibGUge1xuICBzdGF0aWMgaXNCaW5kYWJsZShvYmplY3QpIHtcbiAgICBpZiAoIW9iamVjdCB8fCAhb2JqZWN0W0lzQmluZGFibGVdIHx8ICFvYmplY3RbUHJldmVudF0pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdFtJc0JpbmRhYmxlXSA9PT0gQmluZGFibGU7XG4gIH1cbiAgc3RhdGljIG9uRGVjayhvYmplY3QsIGtleSkge1xuICAgIHJldHVybiBvYmplY3RbRGVja10uZ2V0KGtleSkgfHwgZmFsc2U7XG4gIH1cbiAgc3RhdGljIHJlZihvYmplY3QpIHtcbiAgICByZXR1cm4gb2JqZWN0W1JlZl0gfHwgb2JqZWN0IHx8IGZhbHNlO1xuICB9XG4gIHN0YXRpYyBtYWtlQmluZGFibGUob2JqZWN0KSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZShvYmplY3QpO1xuICB9XG4gIHN0YXRpYyBzaHVjayhvcmlnaW5hbCwgc2Vlbikge1xuICAgIHNlZW4gPSBzZWVuIHx8IG5ldyBNYXAoKTtcbiAgICB2YXIgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHt9KTtcbiAgICBpZiAob3JpZ2luYWwgaW5zdGFuY2VvZiBUeXBlZEFycmF5IHx8IG9yaWdpbmFsIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIHZhciBfY2xvbmUgPSBvcmlnaW5hbC5zbGljZSgwKTtcbiAgICAgIHNlZW4uc2V0KG9yaWdpbmFsLCBfY2xvbmUpO1xuICAgICAgcmV0dXJuIF9jbG9uZTtcbiAgICB9XG4gICAgdmFyIHByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhvcmlnaW5hbCk7XG4gICAgZm9yICh2YXIgaSBpbiBwcm9wZXJ0aWVzKSB7XG4gICAgICB2YXIgaWkgPSBwcm9wZXJ0aWVzW2ldO1xuICAgICAgaWYgKGlpLnN1YnN0cmluZygwLCAzKSA9PT0gJ19fXycpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgYWxyZWFkeUNsb25lZCA9IHNlZW4uZ2V0KG9yaWdpbmFsW2lpXSk7XG4gICAgICBpZiAoYWxyZWFkeUNsb25lZCkge1xuICAgICAgICBjbG9uZVtpaV0gPSBhbHJlYWR5Q2xvbmVkO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcmlnaW5hbFtpaV0gPT09IG9yaWdpbmFsKSB7XG4gICAgICAgIHNlZW4uc2V0KG9yaWdpbmFsW2lpXSwgY2xvbmUpO1xuICAgICAgICBjbG9uZVtpaV0gPSBjbG9uZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWxbaWldICYmIHR5cGVvZiBvcmlnaW5hbFtpaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhciBvcmlnaW5hbFByb3AgPSBvcmlnaW5hbFtpaV07XG4gICAgICAgIGlmIChCaW5kYWJsZS5pc0JpbmRhYmxlKG9yaWdpbmFsW2lpXSkpIHtcbiAgICAgICAgICBvcmlnaW5hbFByb3AgPSBvcmlnaW5hbFtpaV1bT3JpZ2luYWxdO1xuICAgICAgICB9XG4gICAgICAgIGNsb25lW2lpXSA9IHRoaXMuc2h1Y2sob3JpZ2luYWxQcm9wLCBzZWVuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNsb25lW2lpXSA9IG9yaWdpbmFsW2lpXTtcbiAgICAgIH1cbiAgICAgIHNlZW4uc2V0KG9yaWdpbmFsW2lpXSwgY2xvbmVbaWldKTtcbiAgICB9XG4gICAgaWYgKEJpbmRhYmxlLmlzQmluZGFibGUob3JpZ2luYWwpKSB7XG4gICAgICBkZWxldGUgY2xvbmUuYmluZFRvO1xuICAgICAgZGVsZXRlIGNsb25lLmlzQm91bmQ7XG4gICAgfVxuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuICBzdGF0aWMgbWFrZShvYmplY3QpIHtcbiAgICBpZiAob2JqZWN0W1ByZXZlbnRdKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoIW9iamVjdCB8fCAhWydmdW5jdGlvbicsICdvYmplY3QnXS5pbmNsdWRlcyh0eXBlb2Ygb2JqZWN0KSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKFJlZiBpbiBvYmplY3QpIHtcbiAgICAgIHJldHVybiBvYmplY3RbUmVmXTtcbiAgICB9XG4gICAgaWYgKG9iamVjdFtJc0JpbmRhYmxlXSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKE9iamVjdC5pc1NlYWxlZChvYmplY3QpIHx8IE9iamVjdC5pc0Zyb3plbihvYmplY3QpIHx8ICFPYmplY3QuaXNFeHRlbnNpYmxlKG9iamVjdCkgfHwgaXNFeGNsdWRlZChvYmplY3QpKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBJc0JpbmRhYmxlLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogQmluZGFibGVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBSZWYsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICB2YWx1ZTogZmFsc2VcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBPcmlnaW5hbCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG9iamVjdFxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIERlY2ssIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCaW5kaW5nLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFN1YkJpbmRpbmcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCaW5kaW5nQWxsLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgRXhlY3V0aW5nLCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgV3JhcHBpbmcsIHtcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTdGFjaywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmVmb3JlLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQWZ0ZXIsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBXcmFwcGVkLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG5ldyBNYXAoKSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBVbndyYXBwZWQsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobmV3IE1hcCgpKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIERlc2NyaXB0b3JzLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG5ldyBNYXAoKSlcbiAgICB9KTtcbiAgICB2YXIgYmluZFRvID0gKHByb3BlcnR5LCBjYWxsYmFjayA9IG51bGwsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgdmFyIGJpbmRUb0FsbCA9IGZhbHNlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcGVydHkpKSB7XG4gICAgICAgIHZhciBkZWJpbmRlcnMgPSBwcm9wZXJ0eS5tYXAocCA9PiBiaW5kVG8ocCwgY2FsbGJhY2ssIG9wdGlvbnMpKTtcbiAgICAgICAgcmV0dXJuICgpID0+IGRlYmluZGVycy5mb3JFYWNoKGQgPT4gZCgpKTtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9wZXJ0eSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIG9wdGlvbnMgPSBjYWxsYmFjayB8fCB7fTtcbiAgICAgICAgY2FsbGJhY2sgPSBwcm9wZXJ0eTtcbiAgICAgICAgYmluZFRvQWxsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmRlbGF5ID49IDApIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBEZWxheUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLmRlbGF5KTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnRocm90dGxlID49IDApIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBUaHJvdHRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLnRocm90dGxlKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLndhaXQgPj0gMCkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcFdhaXRDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy53YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZyYW1lKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwRnJhbWVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy5mcmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5pZGxlKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwSWRsZUNhbGxiYWNrKGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChiaW5kVG9BbGwpIHtcbiAgICAgICAgb2JqZWN0W0JpbmRpbmdBbGxdLmFkZChjYWxsYmFjayk7XG4gICAgICAgIGlmICghKCdub3cnIGluIG9wdGlvbnMpIHx8IG9wdGlvbnMubm93KSB7XG4gICAgICAgICAgZm9yICh2YXIgaSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG9iamVjdFtpXSwgaSwgb2JqZWN0LCBmYWxzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgb2JqZWN0W0JpbmRpbmdBbGxdLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBpZiAoIW9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0pIHtcbiAgICAgICAgb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XSA9IG5ldyBTZXQoKTtcbiAgICAgIH1cblxuICAgICAgLy8gbGV0IGJpbmRJbmRleCA9IG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0ubGVuZ3RoO1xuXG4gICAgICBpZiAob3B0aW9ucy5jaGlsZHJlbikge1xuICAgICAgICB2YXIgb3JpZ2luYWwgPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2sgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgIHZhciB2ID0gYXJnc1swXTtcbiAgICAgICAgICB2YXIgc3ViRGViaW5kID0gb2JqZWN0W1N1YkJpbmRpbmddLmdldChvcmlnaW5hbCk7XG4gICAgICAgICAgaWYgKHN1YkRlYmluZCkge1xuICAgICAgICAgICAgb2JqZWN0W1N1YkJpbmRpbmddLmRlbGV0ZShvcmlnaW5hbCk7XG4gICAgICAgICAgICBzdWJEZWJpbmQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgb3JpZ2luYWwoLi4uYXJncyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciB2diA9IEJpbmRhYmxlLm1ha2Uodik7XG4gICAgICAgICAgaWYgKEJpbmRhYmxlLmlzQmluZGFibGUodnYpKSB7XG4gICAgICAgICAgICBvYmplY3RbU3ViQmluZGluZ10uc2V0KG9yaWdpbmFsLCB2di5iaW5kVG8oKC4uLnN1YkFyZ3MpID0+IG9yaWdpbmFsKC4uLmFyZ3MsIC4uLnN1YkFyZ3MpLCBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgIGNoaWxkcmVuOiBmYWxzZVxuICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3JpZ2luYWwoLi4uYXJncyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmFkZChjYWxsYmFjayk7XG4gICAgICBpZiAoISgnbm93JyBpbiBvcHRpb25zKSB8fCBvcHRpb25zLm5vdykge1xuICAgICAgICBjYWxsYmFjayhvYmplY3RbcHJvcGVydHldLCBwcm9wZXJ0eSwgb2JqZWN0LCBmYWxzZSk7XG4gICAgICB9XG4gICAgICB2YXIgZGViaW5kZXIgPSAoKSA9PiB7XG4gICAgICAgIHZhciBzdWJEZWJpbmQgPSBvYmplY3RbU3ViQmluZGluZ10uZ2V0KGNhbGxiYWNrKTtcbiAgICAgICAgaWYgKHN1YkRlYmluZCkge1xuICAgICAgICAgIG9iamVjdFtTdWJCaW5kaW5nXS5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICAgIHN1YkRlYmluZCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0uaGFzKGNhbGxiYWNrKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICB9O1xuICAgICAgaWYgKG9wdGlvbnMucmVtb3ZlV2l0aCAmJiBvcHRpb25zLnJlbW92ZVdpdGggaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICAgIG9wdGlvbnMucmVtb3ZlV2l0aC5vblJlbW92ZSgoKSA9PiBkZWJpbmRlcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGViaW5kZXI7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnYmluZFRvJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IGJpbmRUb1xuICAgIH0pO1xuICAgIHZhciBfX19iZWZvcmUgPSBjYWxsYmFjayA9PiB7XG4gICAgICBvYmplY3RbQmVmb3JlXS5hZGQoY2FsbGJhY2spO1xuICAgICAgcmV0dXJuICgpID0+IG9iamVjdFtCZWZvcmVdLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgfTtcbiAgICB2YXIgX19fYWZ0ZXIgPSBjYWxsYmFjayA9PiB7XG4gICAgICBvYmplY3RbQWZ0ZXJdLmFkZChjYWxsYmFjayk7XG4gICAgICByZXR1cm4gKCkgPT4gb2JqZWN0W0FmdGVyXS5kZWxldGUoY2FsbGJhY2spO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmluZENoYWluLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogKHBhdGgsIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICAgICAgdmFyIG5vZGUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICB2YXIgc3ViUGFydHMgPSBwYXJ0cy5zbGljZSgwKTtcbiAgICAgICAgdmFyIGRlYmluZCA9IFtdO1xuICAgICAgICBkZWJpbmQucHVzaChvYmplY3QuYmluZFRvKG5vZGUsICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgdmFyIHJlc3QgPSBzdWJQYXJ0cy5qb2luKCcuJyk7XG4gICAgICAgICAgaWYgKHN1YlBhcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbGJhY2sodiwgaywgdCwgZCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHYgPSB0W2tdID0gdGhpcy5tYWtlKHt9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGViaW5kID0gZGViaW5kLmNvbmNhdCh2W0JpbmRDaGFpbl0ocmVzdCwgY2FsbGJhY2spKTtcbiAgICAgICAgfSkpO1xuICAgICAgICByZXR1cm4gKCkgPT4gZGViaW5kLmZvckVhY2goeCA9PiB4KCkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdfX19iZWZvcmUnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogX19fYmVmb3JlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ19fX2FmdGVyJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IF9fX2FmdGVyXG4gICAgfSk7XG4gICAgdmFyIGlzQm91bmQgPSAoKSA9PiB7XG4gICAgICBpZiAob2JqZWN0W0JpbmRpbmdBbGxdLnNpemUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBjYWxsYmFja3Mgb2YgT2JqZWN0LnZhbHVlcyhvYmplY3RbQmluZGluZ10pKSB7XG4gICAgICAgIGlmIChjYWxsYmFja3Muc2l6ZSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcihsZXQgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKVxuICAgICAgICAvLyB7XG4gICAgICAgIC8vIFx0aWYoY2FsbGJhY2spXG4gICAgICAgIC8vIFx0e1xuICAgICAgICAvLyBcdFx0cmV0dXJuIHRydWU7XG4gICAgICAgIC8vIFx0fVxuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnaXNCb3VuZCcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBpc0JvdW5kXG4gICAgfSk7XG4gICAgZm9yICh2YXIgaSBpbiBvYmplY3QpIHtcbiAgICAgIC8vIGNvbnN0IGRlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob2JqZWN0KTtcblxuICAgICAgaWYgKCFvYmplY3RbaV0gfHwgdHlwZW9mIG9iamVjdFtpXSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAob2JqZWN0W2ldW1JlZl0gfHwgb2JqZWN0W2ldIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZShvYmplY3RbaV0pIHx8IE9iamVjdC5pc1NlYWxlZChvYmplY3RbaV0pKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0V4Y2x1ZGVkKG9iamVjdFtpXSkpIHtcbiAgICAgICAgb2JqZWN0W2ldID0gQmluZGFibGUubWFrZShvYmplY3RbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZGVzY3JpcHRvcnMgPSBvYmplY3RbRGVzY3JpcHRvcnNdO1xuICAgIHZhciB3cmFwcGVkID0gb2JqZWN0W1dyYXBwZWRdO1xuICAgIHZhciBzdGFjayA9IG9iamVjdFtTdGFja107XG4gICAgdmFyIHNldCA9ICh0YXJnZXQsIGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhbHVlID0gQmluZGFibGUubWFrZSh2YWx1ZSk7XG4gICAgICAgIGlmICh0YXJnZXRba2V5XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdyYXBwZWQuaGFzKGtleSkpIHtcbiAgICAgICAgd3JhcHBlZC5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICAgIHZhciBvbkRlY2sgPSBvYmplY3RbRGVja107XG4gICAgICB2YXIgaXNPbkRlY2sgPSBvbkRlY2suaGFzKGtleSk7XG4gICAgICB2YXIgdmFsT25EZWNrID0gaXNPbkRlY2sgJiYgb25EZWNrLmdldChrZXkpO1xuXG4gICAgICAvLyBpZihvbkRlY2tba2V5XSAhPT0gdW5kZWZpbmVkICYmIG9uRGVja1trZXldID09PSB2YWx1ZSlcbiAgICAgIGlmIChpc09uRGVjayAmJiB2YWxPbkRlY2sgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGtleS5zbGljZSAmJiBrZXkuc2xpY2UoLTMpID09PSAnX19fJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0YXJnZXRba2V5XSA9PT0gdmFsdWUgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBpc05hTih2YWxPbkRlY2spICYmIGlzTmFOKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIG9uRGVjay5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICBmb3IgKHZhciBjYWxsYmFjayBvZiBvYmplY3RbQmluZGluZ0FsbF0pIHtcbiAgICAgICAgY2FsbGJhY2sodmFsdWUsIGtleSwgdGFyZ2V0LCBmYWxzZSk7XG4gICAgICB9XG4gICAgICBpZiAoa2V5IGluIG9iamVjdFtCaW5kaW5nXSkge1xuICAgICAgICBmb3IgKHZhciBfY2FsbGJhY2sgb2Ygb2JqZWN0W0JpbmRpbmddW2tleV0pIHtcbiAgICAgICAgICBfY2FsbGJhY2sodmFsdWUsIGtleSwgdGFyZ2V0LCBmYWxzZSwgdGFyZ2V0W2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvbkRlY2suZGVsZXRlKGtleSk7XG4gICAgICB2YXIgZXhjbHVkZWQgPSB3aW4uRmlsZSAmJiB0YXJnZXQgaW5zdGFuY2VvZiB3aW4uRmlsZSAmJiBrZXkgPT0gJ2xhc3RNb2RpZmllZERhdGUnO1xuICAgICAgaWYgKCFleGNsdWRlZCkge1xuICAgICAgICBSZWZsZWN0LnNldCh0YXJnZXQsIGtleSwgdmFsdWUpO1xuICAgICAgfVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSAmJiBvYmplY3RbQmluZGluZ11bJ2xlbmd0aCddKSB7XG4gICAgICAgIGZvciAodmFyIF9pIGluIG9iamVjdFtCaW5kaW5nXVsnbGVuZ3RoJ10pIHtcbiAgICAgICAgICB2YXIgX2NhbGxiYWNrMiA9IG9iamVjdFtCaW5kaW5nXVsnbGVuZ3RoJ11bX2ldO1xuICAgICAgICAgIF9jYWxsYmFjazIodGFyZ2V0Lmxlbmd0aCwgJ2xlbmd0aCcsIHRhcmdldCwgZmFsc2UsIHRhcmdldC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIHZhciBkZWxldGVQcm9wZXJ0eSA9ICh0YXJnZXQsIGtleSkgPT4ge1xuICAgICAgdmFyIG9uRGVjayA9IG9iamVjdFtEZWNrXTtcbiAgICAgIHZhciBpc09uRGVjayA9IG9uRGVjay5oYXMoa2V5KTtcbiAgICAgIGlmIChpc09uRGVjaykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghKGtleSBpbiB0YXJnZXQpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0b3JzLmhhcyhrZXkpKSB7XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvcnMuZ2V0KGtleSk7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBkZXNjcmlwdG9ycy5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICAgIG9uRGVjay5zZXQoa2V5LCBudWxsKTtcbiAgICAgIGlmICh3cmFwcGVkLmhhcyhrZXkpKSB7XG4gICAgICAgIHdyYXBwZWQuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBjYWxsYmFjayBvZiBvYmplY3RbQmluZGluZ0FsbF0pIHtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBrZXksIHRhcmdldCwgdHJ1ZSwgdGFyZ2V0W2tleV0pO1xuICAgICAgfVxuICAgICAgaWYgKGtleSBpbiBvYmplY3RbQmluZGluZ10pIHtcbiAgICAgICAgZm9yICh2YXIgYmluZGluZyBvZiBvYmplY3RbQmluZGluZ11ba2V5XSkge1xuICAgICAgICAgIGJpbmRpbmcodW5kZWZpbmVkLCBrZXksIHRhcmdldCwgdHJ1ZSwgdGFyZ2V0W2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwga2V5KTtcbiAgICAgIG9uRGVjay5kZWxldGUoa2V5KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgdmFyIGNvbnN0cnVjdCA9ICh0YXJnZXQsIGFyZ3MpID0+IHtcbiAgICAgIHZhciBrZXkgPSAnY29uc3RydWN0b3InO1xuICAgICAgZm9yICh2YXIgY2FsbGJhY2sgb2YgdGFyZ2V0W0JlZm9yZV0pIHtcbiAgICAgICAgY2FsbGJhY2sodGFyZ2V0LCBrZXksIG9iamVjdFtTdGFja10sIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICB9XG4gICAgICB2YXIgaW5zdGFuY2UgPSBCaW5kYWJsZS5tYWtlKG5ldyB0YXJnZXRbT3JpZ2luYWxdKC4uLmFyZ3MpKTtcbiAgICAgIGZvciAodmFyIF9jYWxsYmFjazMgb2YgdGFyZ2V0W0FmdGVyXSkge1xuICAgICAgICBfY2FsbGJhY2szKHRhcmdldCwga2V5LCBvYmplY3RbU3RhY2tdLCBpbnN0YW5jZSwgYXJncyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfTtcbiAgICB2YXIgZ2V0ID0gKHRhcmdldCwga2V5KSA9PiB7XG4gICAgICBpZiAod3JhcHBlZC5oYXMoa2V5KSkge1xuICAgICAgICByZXR1cm4gd3JhcHBlZC5nZXQoa2V5KTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgPT09IFJlZiB8fCBrZXkgPT09IE9yaWdpbmFsIHx8IGtleSA9PT0gJ2FwcGx5JyB8fCBrZXkgPT09ICdpc0JvdW5kJyB8fCBrZXkgPT09ICdiaW5kVG8nIHx8IGtleSA9PT0gJ19fcHJvdG9fXycgfHwga2V5ID09PSAnY29uc3RydWN0b3InKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgIH1cbiAgICAgIHZhciBkZXNjcmlwdG9yO1xuICAgICAgaWYgKGRlc2NyaXB0b3JzLmhhcyhrZXkpKSB7XG4gICAgICAgIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ycy5nZXQoa2V5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwga2V5KTtcbiAgICAgICAgZGVzY3JpcHRvcnMuc2V0KGtleSwgZGVzY3JpcHRvcik7XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5jb25maWd1cmFibGUgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgICAgaWYgKE9uQWxsR2V0IGluIG9iamVjdCkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W09uQWxsR2V0XShrZXkpO1xuICAgICAgfVxuICAgICAgaWYgKE9uR2V0IGluIG9iamVjdCAmJiAhKGtleSBpbiBvYmplY3QpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RbT25HZXRdKGtleSk7XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5jb25maWd1cmFibGUgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgd3JhcHBlZC5zZXQoa2V5LCBvYmplY3Rba2V5XSk7XG4gICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2Ygb2JqZWN0W2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaWYgKE5hbWVzIGluIG9iamVjdFtrZXldKSB7XG4gICAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgICB9XG4gICAgICAgIG9iamVjdFtVbndyYXBwZWRdLnNldChrZXksIG9iamVjdFtrZXldKTtcbiAgICAgICAgdmFyIHByb3RvdHlwZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpO1xuICAgICAgICB2YXIgaXNNZXRob2QgPSBwcm90b3R5cGVba2V5XSA9PT0gb2JqZWN0W2tleV07XG4gICAgICAgIHZhciBvYmpSZWYgPVxuICAgICAgICAvLyAodHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFByb21pc2UpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgU3RvcmFnZSA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgU3RvcmFnZSlcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBNYXAgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBNYXApXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgU2V0ID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgU2V0KVxuICAgICAgICAvLyB8fCAodHlwZW9mIFdlYWtNYXAgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFdlYWtNYXApXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgV2Vha1NldCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgV2Vha1NldClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBSZXNpemVPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBSZXNpemVPYnNlcnZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBNdXRhdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBNdXRhdGlvbk9ic2VydmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFBlcmZvcm1hbmNlT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFBlcmZvcm1hbmNlT2JzZXJ2ZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIpXG4gICAgICAgIGlzRXhjbHVkZWQob2JqZWN0KSB8fCB0eXBlb2Ygb2JqZWN0W1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbicgJiYga2V5ID09PSAnbmV4dCcgfHwgdHlwZW9mIFR5cGVkQXJyYXkgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2YgVHlwZWRBcnJheSB8fCB0eXBlb2YgRXZlbnRUYXJnZXQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2YgRXZlbnRUYXJnZXQgfHwgdHlwZW9mIERhdGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2YgRGF0ZSB8fCB0eXBlb2YgTWFwSXRlcmF0b3IgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0LnByb3RvdHlwZSA9PT0gTWFwSXRlcmF0b3IgfHwgdHlwZW9mIFNldEl0ZXJhdG9yID09PSAnZnVuY3Rpb24nICYmIG9iamVjdC5wcm90b3R5cGUgPT09IFNldEl0ZXJhdG9yID8gb2JqZWN0IDogb2JqZWN0W1JlZl07XG4gICAgICAgIHZhciB3cmFwcGVkTWV0aG9kID0gZnVuY3Rpb24gKC4uLnByb3ZpZGVkQXJncykge1xuICAgICAgICAgIG9iamVjdFtFeGVjdXRpbmddID0ga2V5O1xuICAgICAgICAgIHN0YWNrLnVuc2hpZnQoa2V5KTtcbiAgICAgICAgICBmb3IgKHZhciBiZWZvcmVDYWxsYmFjayBvZiBvYmplY3RbQmVmb3JlXSkge1xuICAgICAgICAgICAgYmVmb3JlQ2FsbGJhY2sob2JqZWN0LCBrZXksIHN0YWNrLCBvYmplY3QsIHByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZXQ7XG4gICAgICAgICAgaWYgKG5ldy50YXJnZXQpIHtcbiAgICAgICAgICAgIHJldCA9IG5ldyAob2JqZWN0W1Vud3JhcHBlZF0uZ2V0KGtleSkpKC4uLnByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBmdW5jID0gb2JqZWN0W1Vud3JhcHBlZF0uZ2V0KGtleSk7XG4gICAgICAgICAgICBpZiAoaXNNZXRob2QpIHtcbiAgICAgICAgICAgICAgcmV0ID0gZnVuYy5hcHBseShvYmpSZWYgfHwgb2JqZWN0LCBwcm92aWRlZEFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0ID0gZnVuYyguLi5wcm92aWRlZEFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKHZhciBhZnRlckNhbGxiYWNrIG9mIG9iamVjdFtBZnRlcl0pIHtcbiAgICAgICAgICAgIGFmdGVyQ2FsbGJhY2sob2JqZWN0LCBrZXksIHN0YWNrLCBvYmplY3QsIHByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9iamVjdFtFeGVjdXRpbmddID0gbnVsbDtcbiAgICAgICAgICBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH07XG4gICAgICAgIHdyYXBwZWRNZXRob2RbT25BbGxHZXRdID0gX2tleSA9PiBvYmplY3Rba2V5XVtfa2V5XTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IEJpbmRhYmxlLm1ha2Uod3JhcHBlZE1ldGhvZCk7XG4gICAgICAgIHdyYXBwZWQuc2V0KGtleSwgcmVzdWx0KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICB9O1xuICAgIHZhciBnZXRQcm90b3R5cGVPZiA9IHRhcmdldCA9PiB7XG4gICAgICBpZiAoR2V0UHJvdG8gaW4gb2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBvYmplY3RbR2V0UHJvdG9dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFJlZmxlY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcbiAgICB9O1xuICAgIHZhciBoYW5kbGVyRGVmID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBoYW5kbGVyRGVmLnNldCA9IHNldDtcbiAgICBoYW5kbGVyRGVmLmNvbnN0cnVjdCA9IGNvbnN0cnVjdDtcbiAgICBoYW5kbGVyRGVmLmRlbGV0ZVByb3BlcnR5ID0gZGVsZXRlUHJvcGVydHk7XG4gICAgaWYgKCFvYmplY3RbTm9HZXR0ZXJzXSkge1xuICAgICAgaGFuZGxlckRlZi5nZXRQcm90b3R5cGVPZiA9IGdldFByb3RvdHlwZU9mO1xuICAgICAgaGFuZGxlckRlZi5nZXQgPSBnZXQ7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFJlZiwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBQcm94eShvYmplY3QsIGhhbmRsZXJEZWYpXG4gICAgfSk7XG4gICAgcmV0dXJuIG9iamVjdFtSZWZdO1xuICB9XG4gIHN0YXRpYyBjbGVhckJpbmRpbmdzKG9iamVjdCkge1xuICAgIHZhciBtYXBzID0gZnVuYyA9PiAoLi4ub3MpID0+IG9zLm1hcChmdW5jKTtcbiAgICB2YXIgY2xlYXJPYmogPSBvID0+IE9iamVjdC5rZXlzKG8pLm1hcChrID0+IGRlbGV0ZSBvW2tdKTtcbiAgICB2YXIgY2xlYXJPYmpzID0gbWFwcyhjbGVhck9iaik7XG4gICAgb2JqZWN0W0JpbmRpbmdBbGxdLmNsZWFyKCk7XG4gICAgY2xlYXJPYmpzKG9iamVjdFtXcmFwcGVkXSwgb2JqZWN0W0JpbmRpbmddLCBvYmplY3RbQWZ0ZXJdLCBvYmplY3RbQmVmb3JlXSk7XG4gIH1cbiAgc3RhdGljIHJlc29sdmUob2JqZWN0LCBwYXRoLCBvd25lciA9IGZhbHNlKSB7XG4gICAgdmFyIG5vZGU7XG4gICAgdmFyIHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICB2YXIgdG9wID0gcGF0aFBhcnRzWzBdO1xuICAgIHdoaWxlIChwYXRoUGFydHMubGVuZ3RoKSB7XG4gICAgICBpZiAob3duZXIgJiYgcGF0aFBhcnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICB2YXIgb2JqID0gdGhpcy5tYWtlKG9iamVjdCk7XG4gICAgICAgIHJldHVybiBbb2JqLCBwYXRoUGFydHMuc2hpZnQoKSwgdG9wXTtcbiAgICAgIH1cbiAgICAgIG5vZGUgPSBwYXRoUGFydHMuc2hpZnQoKTtcbiAgICAgIGlmICghKG5vZGUgaW4gb2JqZWN0KSB8fCAhb2JqZWN0W25vZGVdIHx8ICEodHlwZW9mIG9iamVjdFtub2RlXSA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgIG9iamVjdFtub2RlXSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICB9XG4gICAgICBvYmplY3QgPSB0aGlzLm1ha2Uob2JqZWN0W25vZGVdKTtcbiAgICB9XG4gICAgcmV0dXJuIFt0aGlzLm1ha2Uob2JqZWN0KSwgbm9kZSwgdG9wXTtcbiAgfVxuICBzdGF0aWMgd3JhcERlbGF5Q2FsbGJhY2soY2FsbGJhY2ssIGRlbGF5KSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiBzZXRUaW1lb3V0KCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpLCBkZWxheSk7XG4gIH1cbiAgc3RhdGljIHdyYXBUaHJvdHRsZUNhbGxiYWNrKGNhbGxiYWNrLCB0aHJvdHRsZSkge1xuICAgIHRoaXMudGhyb3R0bGVzLnNldChjYWxsYmFjaywgZmFsc2UpO1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMudGhyb3R0bGVzLmdldChjYWxsYmFjaywgdHJ1ZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgICB0aGlzLnRocm90dGxlcy5zZXQoY2FsbGJhY2ssIHRydWUpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMudGhyb3R0bGVzLnNldChjYWxsYmFjaywgZmFsc2UpO1xuICAgICAgfSwgdGhyb3R0bGUpO1xuICAgIH07XG4gIH1cbiAgc3RhdGljIHdyYXBXYWl0Q2FsbGJhY2soY2FsbGJhY2ssIHdhaXQpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIHZhciB3YWl0ZXI7XG4gICAgICBpZiAod2FpdGVyID0gdGhpcy53YWl0ZXJzLmdldChjYWxsYmFjaykpIHtcbiAgICAgICAgdGhpcy53YWl0ZXJzLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgIGNsZWFyVGltZW91dCh3YWl0ZXIpO1xuICAgICAgfVxuICAgICAgd2FpdGVyID0gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSwgd2FpdCk7XG4gICAgICB0aGlzLndhaXRlcnMuc2V0KGNhbGxiYWNrLCB3YWl0ZXIpO1xuICAgIH07XG4gIH1cbiAgc3RhdGljIHdyYXBGcmFtZUNhbGxiYWNrKGNhbGxiYWNrLCBmcmFtZXMpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSk7XG4gICAgfTtcbiAgfVxuICBzdGF0aWMgd3JhcElkbGVDYWxsYmFjayhjYWxsYmFjaykge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgLy8gQ29tcGF0aWJpbGl0eSBmb3IgU2FmYXJpIDA4LzIwMjBcbiAgICAgIHZhciByZXEgPSB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFjayB8fCByZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG4gICAgICByZXEoKCkgPT4gY2FsbGJhY2soLi4uYXJncykpO1xuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuQmluZGFibGUgPSBCaW5kYWJsZTtcbl9kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgXCJ3YWl0ZXJzXCIsIG5ldyBXZWFrTWFwKCkpO1xuX2RlZmluZVByb3BlcnR5KEJpbmRhYmxlLCBcInRocm90dGxlc1wiLCBuZXcgV2Vha01hcCgpKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ1ByZXZlbnQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBQcmV2ZW50XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ09uR2V0Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogT25HZXRcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnTm9HZXR0ZXJzJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogTm9HZXR0ZXJzXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ0dldFByb3RvJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogR2V0UHJvdG9cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnT25BbGxHZXQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBPbkFsbEdldFxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9DYWNoZS5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQ2FjaGUgPSB2b2lkIDA7XG5jbGFzcyBDYWNoZSB7XG4gIHN0YXRpYyBzdG9yZShrZXksIHZhbHVlLCBleHBpcnksIGJ1Y2tldCA9ICdzdGFuZGFyZCcpIHtcbiAgICB2YXIgZXhwaXJhdGlvbiA9IDA7XG4gICAgaWYgKGV4cGlyeSkge1xuICAgICAgZXhwaXJhdGlvbiA9IGV4cGlyeSAqIDEwMDAgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmJ1Y2tldHMpIHtcbiAgICAgIHRoaXMuYnVja2V0cyA9IG5ldyBNYXAoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmJ1Y2tldHMuaGFzKGJ1Y2tldCkpIHtcbiAgICAgIHRoaXMuYnVja2V0cy5zZXQoYnVja2V0LCBuZXcgTWFwKCkpO1xuICAgIH1cbiAgICB2YXIgZXZlbnRFbmQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Q2FjaGVTdG9yZScsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAga2V5LFxuICAgICAgICB2YWx1ZSxcbiAgICAgICAgZXhwaXJ5LFxuICAgICAgICBidWNrZXRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudEVuZCkpIHtcbiAgICAgIHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5zZXQoa2V5LCB7XG4gICAgICAgIHZhbHVlLFxuICAgICAgICBleHBpcmF0aW9uXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIGxvYWQoa2V5LCBkZWZhdWx0dmFsdWUgPSBmYWxzZSwgYnVja2V0ID0gJ3N0YW5kYXJkJykge1xuICAgIHZhciBldmVudEVuZCA9IG5ldyBDdXN0b21FdmVudCgnY3ZDYWNoZUxvYWQnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGtleSxcbiAgICAgICAgZGVmYXVsdHZhbHVlLFxuICAgICAgICBidWNrZXRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRFbmQpKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdHZhbHVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5idWNrZXRzICYmIHRoaXMuYnVja2V0cy5oYXMoYnVja2V0KSAmJiB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuaGFzKGtleSkpIHtcbiAgICAgIHZhciBlbnRyeSA9IHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5nZXQoa2V5KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuYnVja2V0W2J1Y2tldF1ba2V5XS5leHBpcmF0aW9uLCAobmV3IERhdGUpLmdldFRpbWUoKSk7XG4gICAgICBpZiAoZW50cnkuZXhwaXJhdGlvbiA9PT0gMCB8fCBlbnRyeS5leHBpcmF0aW9uID4gbmV3IERhdGUoKS5nZXRUaW1lKCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5nZXQoa2V5KS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlZmF1bHR2YWx1ZTtcbiAgfVxufVxuZXhwb3J0cy5DYWNoZSA9IENhY2hlO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Db25maWcgPSB2b2lkIDA7XG52YXIgQXBwQ29uZmlnID0ge307XG52YXIgX3JlcXVpcmUgPSByZXF1aXJlO1xudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG50cnkge1xuICBBcHBDb25maWcgPSBfcmVxdWlyZSgnL0NvbmZpZycpLkNvbmZpZztcbn0gY2F0Y2ggKGVycm9yKSB7XG4gIHdpbi5kZXZNb2RlID09PSB0cnVlICYmIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICBBcHBDb25maWcgPSB7fTtcbn1cbmNsYXNzIENvbmZpZyB7XG4gIHN0YXRpYyBnZXQobmFtZSkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZ3NbbmFtZV07XG4gIH1cbiAgc3RhdGljIHNldChuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuY29uZmlnc1tuYW1lXSA9IHZhbHVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHN0YXRpYyBkdW1wKCkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZ3M7XG4gIH1cbiAgc3RhdGljIGluaXQoLi4uY29uZmlncykge1xuICAgIGZvciAodmFyIGkgaW4gY29uZmlncykge1xuICAgICAgdmFyIGNvbmZpZyA9IGNvbmZpZ3NbaV07XG4gICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uZmlnID0gSlNPTi5wYXJzZShjb25maWcpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgbmFtZSBpbiBjb25maWcpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gY29uZmlnW25hbWVdO1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWdzW25hbWVdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5leHBvcnRzLkNvbmZpZyA9IENvbmZpZztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb25maWcsICdjb25maWdzJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogQXBwQ29uZmlnXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0RvbS5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuRG9tID0gdm9pZCAwO1xudmFyIHRyYXZlcnNhbHMgPSAwO1xuY2xhc3MgRG9tIHtcbiAgc3RhdGljIG1hcFRhZ3MoZG9jLCBzZWxlY3RvciwgY2FsbGJhY2ssIHN0YXJ0Tm9kZSwgZW5kTm9kZSkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgc3RhcnRlZCA9IHRydWU7XG4gICAgaWYgKHN0YXJ0Tm9kZSkge1xuICAgICAgc3RhcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgZW5kZWQgPSBmYWxzZTtcbiAgICB2YXIge1xuICAgICAgTm9kZSxcbiAgICAgIEVsZW1lbnQsXG4gICAgICBOb2RlRmlsdGVyLFxuICAgICAgZG9jdW1lbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdmFyIHRyZWVXYWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGRvYywgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQgfCBOb2RlRmlsdGVyLlNIT1dfVEVYVCwge1xuICAgICAgYWNjZXB0Tm9kZTogKG5vZGUsIHdhbGtlcikgPT4ge1xuICAgICAgICBpZiAoIXN0YXJ0ZWQpIHtcbiAgICAgICAgICBpZiAobm9kZSA9PT0gc3RhcnROb2RlKSB7XG4gICAgICAgICAgICBzdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX1NLSVA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChlbmROb2RlICYmIG5vZGUgPT09IGVuZE5vZGUpIHtcbiAgICAgICAgICBlbmRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuZGVkKSB7XG4gICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX1NLSVA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgICAgICAgICBpZiAobm9kZS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfQUNDRVBUO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfU0tJUDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfQUNDRVBUO1xuICAgICAgfVxuICAgIH0sIGZhbHNlKTtcbiAgICB2YXIgdHJhdmVyc2FsID0gdHJhdmVyc2FscysrO1xuICAgIHdoaWxlICh0cmVlV2Fsa2VyLm5leHROb2RlKCkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGNhbGxiYWNrKHRyZWVXYWxrZXIuY3VycmVudE5vZGUsIHRyZWVXYWxrZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBzdGF0aWMgZGlzcGF0Y2hFdmVudChkb2MsIGV2ZW50KSB7XG4gICAgZG9jLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIHRoaXMubWFwVGFncyhkb2MsIGZhbHNlLCBub2RlID0+IHtcbiAgICAgIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgfSk7XG4gIH1cbn1cbmV4cG9ydHMuRG9tID0gRG9tO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvTWl4aW4uanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk1peGluID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIENvbnN0cnVjdG9yID0gU3ltYm9sKCdjb25zdHJ1Y3RvcicpO1xudmFyIE1peGluTGlzdCA9IFN5bWJvbCgnbWl4aW5MaXN0Jyk7XG5jbGFzcyBNaXhpbiB7XG4gIHN0YXRpYyBmcm9tKGJhc2VDbGFzcywgLi4ubWl4aW5zKSB7XG4gICAgdmFyIG5ld0NsYXNzID0gY2xhc3MgZXh0ZW5kcyBiYXNlQ2xhc3Mge1xuICAgICAgY29uc3RydWN0b3IoLi4uYXJncykge1xuICAgICAgICB2YXIgaW5zdGFuY2UgPSBiYXNlQ2xhc3MuY29uc3RydWN0b3IgPyBzdXBlciguLi5hcmdzKSA6IG51bGw7XG4gICAgICAgIGZvciAodmFyIG1peGluIG9mIG1peGlucykge1xuICAgICAgICAgIGlmIChtaXhpbltNaXhpbi5Db25zdHJ1Y3Rvcl0pIHtcbiAgICAgICAgICAgIG1peGluW01peGluLkNvbnN0cnVjdG9yXS5hcHBseSh0aGlzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3dpdGNoICh0eXBlb2YgbWl4aW4pIHtcbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgTWl4aW4ubWl4Q2xhc3MobWl4aW4sIG5ld0NsYXNzKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICBNaXhpbi5taXhPYmplY3QobWl4aW4sIHRoaXMpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIG5ld0NsYXNzO1xuICB9XG4gIHN0YXRpYyBtYWtlKC4uLmNsYXNzZXMpIHtcbiAgICB2YXIgYmFzZSA9IGNsYXNzZXMucG9wKCk7XG4gICAgcmV0dXJuIE1peGluLnRvKGJhc2UsIC4uLmNsYXNzZXMpO1xuICB9XG4gIHN0YXRpYyB0byhiYXNlLCAuLi5taXhpbnMpIHtcbiAgICB2YXIgZGVzY3JpcHRvcnMgPSB7fTtcbiAgICBtaXhpbnMubWFwKG1peGluID0+IHtcbiAgICAgIHN3aXRjaCAodHlwZW9mIG1peGluKSB7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihkZXNjcmlwdG9ycywgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMobWl4aW4pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oZGVzY3JpcHRvcnMsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG1peGluLnByb3RvdHlwZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVsZXRlIGRlc2NyaXB0b3JzLmNvbnN0cnVjdG9yO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoYmFzZS5wcm90b3R5cGUsIGRlc2NyaXB0b3JzKTtcbiAgICB9KTtcbiAgfVxuICBzdGF0aWMgd2l0aCguLi5taXhpbnMpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tKGNsYXNzIHtcbiAgICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICB9LCAuLi5taXhpbnMpO1xuICB9XG4gIHN0YXRpYyBtaXhPYmplY3QobWl4aW4sIGluc3RhbmNlKSB7XG4gICAgZm9yICh2YXIgZnVuYyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhtaXhpbikpIHtcbiAgICAgIGlmICh0eXBlb2YgbWl4aW5bZnVuY10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaW5zdGFuY2VbZnVuY10gPSBtaXhpbltmdW5jXS5iaW5kKGluc3RhbmNlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnN0YW5jZVtmdW5jXSA9IG1peGluW2Z1bmNdO1xuICAgIH1cbiAgICBmb3IgKHZhciBfZnVuYyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG1peGluKSkge1xuICAgICAgaWYgKHR5cGVvZiBtaXhpbltfZnVuY10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaW5zdGFuY2VbX2Z1bmNdID0gbWl4aW5bX2Z1bmNdLmJpbmQoaW5zdGFuY2UpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGluc3RhbmNlW19mdW5jXSA9IG1peGluW19mdW5jXTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIG1peENsYXNzKGNscywgbmV3Q2xhc3MpIHtcbiAgICBmb3IgKHZhciBmdW5jIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNscy5wcm90b3R5cGUpKSB7XG4gICAgICBpZiAoWyduYW1lJywgJ3Byb3RvdHlwZScsICdsZW5ndGgnXS5pbmNsdWRlcyhmdW5jKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihuZXdDbGFzcywgZnVuYyk7XG4gICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgY2xzW2Z1bmNdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtmdW5jXSA9IGNscy5wcm90b3R5cGVbZnVuY107XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW2Z1bmNdID0gY2xzLnByb3RvdHlwZVtmdW5jXS5iaW5kKG5ld0NsYXNzLnByb3RvdHlwZSk7XG4gICAgfVxuICAgIGZvciAodmFyIF9mdW5jMiBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGNscy5wcm90b3R5cGUpKSB7XG4gICAgICBpZiAodHlwZW9mIGNsc1tfZnVuYzJdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtfZnVuYzJdID0gY2xzLnByb3RvdHlwZVtfZnVuYzJdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtfZnVuYzJdID0gY2xzLnByb3RvdHlwZVtfZnVuYzJdLmJpbmQobmV3Q2xhc3MucHJvdG90eXBlKTtcbiAgICB9XG4gICAgdmFyIF9sb29wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoWyduYW1lJywgJ3Byb3RvdHlwZScsICdsZW5ndGgnXS5pbmNsdWRlcyhfZnVuYzMpKSB7XG4gICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5ld0NsYXNzLCBfZnVuYzMpO1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgY2xzW19mdW5jM10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBuZXdDbGFzc1tfZnVuYzNdID0gY2xzW19mdW5jM107XG4gICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByZXYgPSBuZXdDbGFzc1tfZnVuYzNdIHx8IGZhbHNlO1xuICAgICAgICB2YXIgbWV0aCA9IGNsc1tfZnVuYzNdLmJpbmQobmV3Q2xhc3MpO1xuICAgICAgICBuZXdDbGFzc1tfZnVuYzNdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICBwcmV2ICYmIHByZXYoLi4uYXJncyk7XG4gICAgICAgICAgcmV0dXJuIG1ldGgoLi4uYXJncyk7XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgX3JldDtcbiAgICBmb3IgKHZhciBfZnVuYzMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2xzKSkge1xuICAgICAgX3JldCA9IF9sb29wKCk7XG4gICAgICBpZiAoX3JldCA9PT0gMCkgY29udGludWU7XG4gICAgfVxuICAgIHZhciBfbG9vcDIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodHlwZW9mIGNsc1tfZnVuYzRdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtfZnVuYzRdID0gY2xzW19mdW5jNF07XG4gICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgfVxuICAgICAgdmFyIHByZXYgPSBuZXdDbGFzc1tfZnVuYzRdIHx8IGZhbHNlO1xuICAgICAgdmFyIG1ldGggPSBjbHNbX2Z1bmM0XS5iaW5kKG5ld0NsYXNzKTtcbiAgICAgIG5ld0NsYXNzW19mdW5jNF0gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICBwcmV2ICYmIHByZXYoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtZXRoKC4uLmFyZ3MpO1xuICAgICAgfTtcbiAgICB9O1xuICAgIGZvciAodmFyIF9mdW5jNCBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGNscykpIHtcbiAgICAgIGlmIChfbG9vcDIoKSkgY29udGludWU7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBtaXgobWl4aW5Ubykge1xuICAgIHZhciBjb25zdHJ1Y3RvcnMgPSBbXTtcbiAgICB2YXIgYWxsU3RhdGljID0ge307XG4gICAgdmFyIGFsbEluc3RhbmNlID0ge307XG4gICAgdmFyIG1peGFibGUgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKG1peGluVG8pO1xuICAgIHZhciBfbG9vcDMgPSBmdW5jdGlvbiAoYmFzZSkge1xuICAgICAgdmFyIGluc3RhbmNlTmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiYXNlLnByb3RvdHlwZSk7XG4gICAgICB2YXIgc3RhdGljTmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiYXNlKTtcbiAgICAgIHZhciBwcmVmaXggPSAvXihiZWZvcmV8YWZ0ZXIpX18oLispLztcbiAgICAgIHZhciBfbG9vcDUgPSBmdW5jdGlvbiAoX21ldGhvZE5hbWUyKSB7XG4gICAgICAgICAgdmFyIG1hdGNoID0gX21ldGhvZE5hbWUyLm1hdGNoKHByZWZpeCk7XG4gICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2JlZm9yZSc6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19iZWZvcmUoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZVtfbWV0aG9kTmFtZTJdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdhZnRlcic6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19hZnRlcigodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlW19tZXRob2ROYW1lMl0uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFsbFN0YXRpY1tfbWV0aG9kTmFtZTJdKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBiYXNlW19tZXRob2ROYW1lMl0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBhbGxTdGF0aWNbX21ldGhvZE5hbWUyXSA9IGJhc2VbX21ldGhvZE5hbWUyXTtcbiAgICAgICAgfSxcbiAgICAgICAgX3JldDI7XG4gICAgICBmb3IgKHZhciBfbWV0aG9kTmFtZTIgb2Ygc3RhdGljTmFtZXMpIHtcbiAgICAgICAgX3JldDIgPSBfbG9vcDUoX21ldGhvZE5hbWUyKTtcbiAgICAgICAgaWYgKF9yZXQyID09PSAwKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBfbG9vcDYgPSBmdW5jdGlvbiAoX21ldGhvZE5hbWUzKSB7XG4gICAgICAgICAgdmFyIG1hdGNoID0gX21ldGhvZE5hbWUzLm1hdGNoKHByZWZpeCk7XG4gICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2JlZm9yZSc6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19iZWZvcmUoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnYWZ0ZXInOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYWZ0ZXIoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYWxsSW5zdGFuY2VbX21ldGhvZE5hbWUzXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGFsbEluc3RhbmNlW19tZXRob2ROYW1lM10gPSBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdO1xuICAgICAgICB9LFxuICAgICAgICBfcmV0MztcbiAgICAgIGZvciAodmFyIF9tZXRob2ROYW1lMyBvZiBpbnN0YW5jZU5hbWVzKSB7XG4gICAgICAgIF9yZXQzID0gX2xvb3A2KF9tZXRob2ROYW1lMyk7XG4gICAgICAgIGlmIChfcmV0MyA9PT0gMCkgY29udGludWU7XG4gICAgICB9XG4gICAgfTtcbiAgICBmb3IgKHZhciBiYXNlID0gdGhpczsgYmFzZSAmJiBiYXNlLnByb3RvdHlwZTsgYmFzZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihiYXNlKSkge1xuICAgICAgX2xvb3AzKGJhc2UpO1xuICAgIH1cbiAgICBmb3IgKHZhciBtZXRob2ROYW1lIGluIGFsbFN0YXRpYykge1xuICAgICAgbWl4aW5Ub1ttZXRob2ROYW1lXSA9IGFsbFN0YXRpY1ttZXRob2ROYW1lXS5iaW5kKG1peGluVG8pO1xuICAgIH1cbiAgICB2YXIgX2xvb3A0ID0gZnVuY3Rpb24gKF9tZXRob2ROYW1lKSB7XG4gICAgICBtaXhpblRvLnByb3RvdHlwZVtfbWV0aG9kTmFtZV0gPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICByZXR1cm4gYWxsSW5zdGFuY2VbX21ldGhvZE5hbWVdLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfTtcbiAgICB9O1xuICAgIGZvciAodmFyIF9tZXRob2ROYW1lIGluIGFsbEluc3RhbmNlKSB7XG4gICAgICBfbG9vcDQoX21ldGhvZE5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gbWl4YWJsZTtcbiAgfVxufVxuZXhwb3J0cy5NaXhpbiA9IE1peGluO1xuTWl4aW4uQ29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1JvdXRlci5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUm91dGVyID0gdm9pZCAwO1xudmFyIF9WaWV3ID0gcmVxdWlyZShcIi4vVmlld1wiKTtcbnZhciBfQ2FjaGUgPSByZXF1aXJlKFwiLi9DYWNoZVwiKTtcbnZhciBfQ29uZmlnID0gcmVxdWlyZShcIi4vQ29uZmlnXCIpO1xudmFyIF9Sb3V0ZXMgPSByZXF1aXJlKFwiLi9Sb3V0ZXNcIik7XG52YXIgX3dpbiRDdXN0b21FdmVudDtcbnZhciBOb3RGb3VuZEVycm9yID0gU3ltYm9sKCdOb3RGb3VuZCcpO1xudmFyIEludGVybmFsRXJyb3IgPSBTeW1ib2woJ0ludGVybmFsJyk7XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbndpbi5DdXN0b21FdmVudCA9IChfd2luJEN1c3RvbUV2ZW50ID0gd2luLkN1c3RvbUV2ZW50KSAhPT0gbnVsbCAmJiBfd2luJEN1c3RvbUV2ZW50ICE9PSB2b2lkIDAgPyBfd2luJEN1c3RvbUV2ZW50IDogd2luLkV2ZW50O1xuY2xhc3MgUm91dGVyIHtcbiAgc3RhdGljIHdhaXQodmlldywgZXZlbnQgPSAnRE9NQ29udGVudExvYWRlZCcsIG5vZGUgPSBkb2N1bWVudCkge1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgKCkgPT4ge1xuICAgICAgdGhpcy5saXN0ZW4odmlldyk7XG4gICAgfSk7XG4gIH1cbiAgc3RhdGljIGxpc3RlbihsaXN0ZW5lciwgcm91dGVzID0gZmFsc2UpIHtcbiAgICB0aGlzLmxpc3RlbmVyID0gbGlzdGVuZXIgfHwgdGhpcy5saXN0ZW5lcjtcbiAgICB0aGlzLnJvdXRlcyA9IHJvdXRlcyB8fCBsaXN0ZW5lci5yb3V0ZXM7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLnF1ZXJ5LCB0aGlzLnF1ZXJ5T3Zlcih7fSkpO1xuICAgIHZhciBsaXN0ZW4gPSBldmVudCA9PiB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGV2ZW50LnN0YXRlICYmICdyb3V0ZWRJZCcgaW4gZXZlbnQuc3RhdGUpIHtcbiAgICAgICAgaWYgKGV2ZW50LnN0YXRlLnJvdXRlZElkIDw9IHRoaXMucm91dGVDb3VudCkge1xuICAgICAgICAgIHRoaXMuaGlzdG9yeS5zcGxpY2UoZXZlbnQuc3RhdGUucm91dGVkSWQpO1xuICAgICAgICAgIHRoaXMucm91dGVDb3VudCA9IGV2ZW50LnN0YXRlLnJvdXRlZElkO1xuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LnN0YXRlLnJvdXRlZElkID4gdGhpcy5yb3V0ZUNvdW50KSB7XG4gICAgICAgICAgdGhpcy5oaXN0b3J5LnB1c2goZXZlbnQuc3RhdGUucHJldik7XG4gICAgICAgICAgdGhpcy5yb3V0ZUNvdW50ID0gZXZlbnQuc3RhdGUucm91dGVkSWQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGV2ZW50LnN0YXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMucHJldlBhdGggIT09IG51bGwgJiYgdGhpcy5wcmV2UGF0aCAhPT0gbG9jYXRpb24ucGF0aG5hbWUpIHtcbiAgICAgICAgICB0aGlzLmhpc3RvcnkucHVzaCh0aGlzLnByZXZQYXRoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikpIHtcbiAgICAgICAgdGhpcy5tYXRjaChsb2NhdGlvbi5wYXRobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5tYXRjaCh0aGlzLm5leHRQYXRoLCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY3ZVcmxDaGFuZ2VkJywgbGlzdGVuKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBsaXN0ZW4pO1xuICAgIHZhciByb3V0ZSA9ICF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikgPyBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaCA6IGZhbHNlO1xuICAgIGlmICghdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pICYmIGxvY2F0aW9uLmhhc2gpIHtcbiAgICAgIHJvdXRlICs9IGxvY2F0aW9uLmhhc2g7XG4gICAgfVxuICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgIHJvdXRlZElkOiB0aGlzLnJvdXRlQ291bnQsXG4gICAgICB1cmw6IGxvY2F0aW9uLnBhdGhuYW1lLFxuICAgICAgcHJldjogdGhpcy5wcmV2UGF0aFxuICAgIH07XG4gICAgaWYgKCF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikpIHtcbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlLCBudWxsLCBsb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgfVxuICAgIHRoaXMuZ28ocm91dGUgIT09IGZhbHNlID8gcm91dGUgOiAnLycpO1xuICB9XG4gIHN0YXRpYyBnbyhwYXRoLCBzaWxlbnQgPSBmYWxzZSkge1xuICAgIHZhciBjb25maWdUaXRsZSA9IF9Db25maWcuQ29uZmlnLmdldCgndGl0bGUnKTtcbiAgICBpZiAoY29uZmlnVGl0bGUpIHtcbiAgICAgIGRvY3VtZW50LnRpdGxlID0gY29uZmlnVGl0bGU7XG4gICAgfVxuICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgIHJvdXRlZElkOiB0aGlzLnJvdXRlQ291bnQsXG4gICAgICBwcmV2OiB0aGlzLnByZXZQYXRoLFxuICAgICAgdXJsOiBsb2NhdGlvbi5wYXRobmFtZVxuICAgIH07XG4gICAgaWYgKHNpbGVudCA9PT0gLTEpIHtcbiAgICAgIHRoaXMubWF0Y2gocGF0aCwgdGhpcy5saXN0ZW5lciwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikpIHtcbiAgICAgIHRoaXMubmV4dFBhdGggPSBwYXRoO1xuICAgIH0gZWxzZSBpZiAoc2lsZW50ID09PSAyICYmIGxvY2F0aW9uLnBhdGhuYW1lICE9PSBwYXRoKSB7XG4gICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShzdGF0ZSwgbnVsbCwgcGF0aCk7XG4gICAgfSBlbHNlIGlmIChsb2NhdGlvbi5wYXRobmFtZSAhPT0gcGF0aCkge1xuICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoc3RhdGUsIG51bGwsIHBhdGgpO1xuICAgIH1cbiAgICBpZiAoIXNpbGVudCB8fCBzaWxlbnQgPCAwKSB7XG4gICAgICBpZiAoc2lsZW50ID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLnBhdGggPSBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgaWYgKHBhdGguc3Vic3RyaW5nKDAsIDEpID09PSAnIycpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgSGFzaENoYW5nZUV2ZW50KCdoYXNoY2hhbmdlJykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZVcmxDaGFuZ2VkJykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucHJldlBhdGggPSBwYXRoO1xuICB9XG4gIHN0YXRpYyBwcm9jZXNzUm91dGUocm91dGVzLCBzZWxlY3RlZCwgYXJncykge1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAodHlwZW9mIHJvdXRlc1tzZWxlY3RlZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChyb3V0ZXNbc2VsZWN0ZWRdLnByb3RvdHlwZSBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IHJvdXRlc1tzZWxlY3RlZF0oYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSByb3V0ZXNbc2VsZWN0ZWRdKGFyZ3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSByb3V0ZXNbc2VsZWN0ZWRdO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHN0YXRpYyBoYW5kbGVFcnJvcihlcnJvciwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgbGlzdGVuZXIsIHBhdGgsIHByZXYsIGZvcmNlUmVmcmVzaCkge1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZUVycm9yJywge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBlcnJvcixcbiAgICAgICAgICBwYXRoLFxuICAgICAgICAgIHByZXYsXG4gICAgICAgICAgdmlldzogbGlzdGVuZXIsXG4gICAgICAgICAgcm91dGVzLFxuICAgICAgICAgIHNlbGVjdGVkXG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHdpblsnZGV2TW9kZSddID8gJ1VuZXhwZWN0ZWQgZXJyb3I6ICcgKyBTdHJpbmcoZXJyb3IpIDogJ1VuZXhwZWN0ZWQgZXJyb3IuJztcbiAgICBpZiAocm91dGVzW0ludGVybmFsRXJyb3JdKSB7XG4gICAgICBhcmdzW0ludGVybmFsRXJyb3JdID0gZXJyb3I7XG4gICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NSb3V0ZShyb3V0ZXMsIEludGVybmFsRXJyb3IsIGFyZ3MpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpO1xuICB9XG4gIHN0YXRpYyBtYXRjaChwYXRoLCBsaXN0ZW5lciwgb3B0aW9ucyA9IGZhbHNlKSB7XG4gICAgdmFyIGV2ZW50ID0gbnVsbCxcbiAgICAgIHJlcXVlc3QgPSBudWxsLFxuICAgICAgZm9yY2VSZWZyZXNoID0gZmFsc2U7XG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIGZvcmNlUmVmcmVzaCA9IG9wdGlvbnM7XG4gICAgfVxuICAgIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yY2VSZWZyZXNoID0gb3B0aW9ucy5mb3JjZVJlZnJlc2g7XG4gICAgICBldmVudCA9IG9wdGlvbnMuZXZlbnQ7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHRoaXMucGF0aCA9PT0gcGF0aCAmJiAhZm9yY2VSZWZyZXNoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBvcmlnaW4gPSAnaHR0cDovL2V4YW1wbGUuY29tJztcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgb3JpZ2luID0gdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pID8gb3JpZ2luIDogbG9jYXRpb24ub3JpZ2luO1xuICAgICAgdGhpcy5xdWVyeVN0cmluZyA9IGxvY2F0aW9uLnNlYXJjaDtcbiAgICB9XG4gICAgdmFyIHVybCA9IG5ldyBVUkwocGF0aCwgb3JpZ2luKTtcbiAgICBwYXRoID0gdGhpcy5wYXRoID0gdXJsLnBhdGhuYW1lO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnF1ZXJ5U3RyaW5nID0gdXJsLnNlYXJjaDtcbiAgICB9XG4gICAgdmFyIHByZXYgPSB0aGlzLnByZXZQYXRoO1xuICAgIHZhciBjdXJyZW50ID0gbGlzdGVuZXIgJiYgbGlzdGVuZXIuYXJncyA/IGxpc3RlbmVyLmFyZ3MuY29udGVudCA6IG51bGw7XG4gICAgdmFyIHJvdXRlcyA9IHRoaXMucm91dGVzIHx8IGxpc3RlbmVyICYmIGxpc3RlbmVyLnJvdXRlcyB8fCBfUm91dGVzLlJvdXRlcy5kdW1wKCk7XG4gICAgdmFyIHF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh0aGlzLnF1ZXJ5U3RyaW5nKTtcbiAgICBpZiAoZXZlbnQgJiYgZXZlbnQucmVxdWVzdCkge1xuICAgICAgdGhpcy5yZXF1ZXN0ID0gZXZlbnQucmVxdWVzdDtcbiAgICB9XG4gICAgZm9yICh2YXIga2V5IGluIE9iamVjdC5rZXlzKHRoaXMucXVlcnkpKSB7XG4gICAgICBkZWxldGUgdGhpcy5xdWVyeVtrZXldO1xuICAgIH1cbiAgICBmb3IgKHZhciBbX2tleSwgdmFsdWVdIG9mIHF1ZXJ5KSB7XG4gICAgICB0aGlzLnF1ZXJ5W19rZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHZhciBhcmdzID0ge30sXG4gICAgICBzZWxlY3RlZCA9IGZhbHNlLFxuICAgICAgcmVzdWx0ID0gJyc7XG4gICAgaWYgKHBhdGguc3Vic3RyaW5nKDAsIDEpID09PSAnLycpIHtcbiAgICAgIHBhdGggPSBwYXRoLnN1YnN0cmluZygxKTtcbiAgICB9XG4gICAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucXVlcnkpIHtcbiAgICAgIGFyZ3NbaV0gPSB0aGlzLnF1ZXJ5W2ldO1xuICAgIH1cbiAgICBMMTogZm9yICh2YXIgX2kgaW4gcm91dGVzKSB7XG4gICAgICB2YXIgcm91dGUgPSBfaS5zcGxpdCgnLycpO1xuICAgICAgaWYgKHJvdXRlLmxlbmd0aCA8IHBhdGgubGVuZ3RoICYmIHJvdXRlW3JvdXRlLmxlbmd0aCAtIDFdICE9PSAnKicpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBMMjogZm9yICh2YXIgaiBpbiByb3V0ZSkge1xuICAgICAgICBpZiAocm91dGVbal0uc3Vic3RyKDAsIDEpID09ICclJykge1xuICAgICAgICAgIHZhciBhcmdOYW1lID0gbnVsbDtcbiAgICAgICAgICB2YXIgZ3JvdXBzID0gL14lKFxcdyspXFw/Py8uZXhlYyhyb3V0ZVtqXSk7XG4gICAgICAgICAgaWYgKGdyb3VwcyAmJiBncm91cHNbMV0pIHtcbiAgICAgICAgICAgIGFyZ05hbWUgPSBncm91cHNbMV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYXJnTmFtZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3JvdXRlW2pdfSBpcyBub3QgYSB2YWxpZCBhcmd1bWVudCBzZWdtZW50IGluIHJvdXRlIFwiJHtfaX1cImApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXBhdGhbal0pIHtcbiAgICAgICAgICAgIGlmIChyb3V0ZVtqXS5zdWJzdHIocm91dGVbal0ubGVuZ3RoIC0gMSwgMSkgPT0gJz8nKSB7XG4gICAgICAgICAgICAgIGFyZ3NbYXJnTmFtZV0gPSAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlIEwxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcmdzW2FyZ05hbWVdID0gcGF0aFtqXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocm91dGVbal0gIT09ICcqJyAmJiBwYXRoW2pdICE9PSByb3V0ZVtqXSkge1xuICAgICAgICAgIGNvbnRpbnVlIEwxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzZWxlY3RlZCA9IF9pO1xuICAgICAgcmVzdWx0ID0gcm91dGVzW19pXTtcbiAgICAgIGlmIChyb3V0ZVtyb3V0ZS5sZW5ndGggLSAxXSA9PT0gJyonKSB7XG4gICAgICAgIGFyZ3MucGF0aHBhcnRzID0gcGF0aC5zbGljZShyb3V0ZS5sZW5ndGggLSAxKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB2YXIgZXZlbnRTdGFydCA9IG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZVN0YXJ0Jywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBwYXRoLFxuICAgICAgICBwcmV2LFxuICAgICAgICByb290OiBsaXN0ZW5lcixcbiAgICAgICAgc2VsZWN0ZWQsXG4gICAgICAgIHJvdXRlc1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZiAoIWRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRTdGFydCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWZvcmNlUmVmcmVzaCAmJiBsaXN0ZW5lciAmJiBjdXJyZW50ICYmIHR5cGVvZiByZXN1bHQgPT09ICdvYmplY3QnICYmIGN1cnJlbnQuY29uc3RydWN0b3IgPT09IHJlc3VsdC5jb25zdHJ1Y3RvciAmJiAhKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpICYmIGN1cnJlbnQudXBkYXRlKGFyZ3MpKSB7XG4gICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQgPSBjdXJyZW50O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICghKHNlbGVjdGVkIGluIHJvdXRlcykpIHtcbiAgICAgIHJvdXRlc1tzZWxlY3RlZF0gPSByb3V0ZXNbTm90Rm91bmRFcnJvcl07XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NSb3V0ZShyb3V0ZXMsIHNlbGVjdGVkLCBhcmdzKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc1JvdXRlKHJvdXRlcywgTm90Rm91bmRFcnJvciwgYXJncyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAoIShyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgaWYgKCEocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0LnRoZW4ocmVhbFJlc3VsdCA9PiB0aGlzLnVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVhbFJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZUVycm9yKGVycm9yLCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBsaXN0ZW5lciwgcGF0aCwgcHJldiwgZm9yY2VSZWZyZXNoKTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmhhbmRsZUVycm9yKGVycm9yLCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBsaXN0ZW5lciwgcGF0aCwgcHJldiwgZm9yY2VSZWZyZXNoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIHVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpIHtcbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBwcmV2ID0gdGhpcy5wcmV2UGF0aDtcbiAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGUnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHJlc3VsdCxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcHJldixcbiAgICAgICAgdmlldzogbGlzdGVuZXIsXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgc2VsZWN0ZWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAocmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgaWYgKGxpc3RlbmVyLmFyZ3MuY29udGVudCBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50LnBhdXNlKHRydWUpO1xuICAgICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICBpZiAoZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcbiAgICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50ID0gcmVzdWx0O1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgcmVzdWx0LnBhdXNlKGZhbHNlKTtcbiAgICAgICAgcmVzdWx0LnVwZGF0ZShhcmdzLCBmb3JjZVJlZnJlc2gpO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZXZlbnRFbmQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGVFbmQnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHJlc3VsdCxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcHJldixcbiAgICAgICAgdmlldzogbGlzdGVuZXIsXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgc2VsZWN0ZWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50RW5kKTtcbiAgfVxuICBzdGF0aWMgaXNPcmlnaW5MaW1pdGVkKHtcbiAgICBvcmlnaW5cbiAgfSkge1xuICAgIHJldHVybiBvcmlnaW4gPT09ICdudWxsJyB8fCBvcmlnaW4gPT09ICdmaWxlOi8vJztcbiAgfVxuICBzdGF0aWMgcXVlcnlPdmVyKGFyZ3MgPSB7fSkge1xuICAgIHZhciBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgdmFyIGZpbmFsQXJncyA9IHt9O1xuICAgIHZhciBxdWVyeSA9IHt9O1xuICAgIGZvciAodmFyIHBhaXIgb2YgcGFyYW1zKSB7XG4gICAgICBxdWVyeVtwYWlyWzBdXSA9IHBhaXJbMV07XG4gICAgfVxuICAgIGZpbmFsQXJncyA9IE9iamVjdC5hc3NpZ24oZmluYWxBcmdzLCBxdWVyeSwgYXJncyk7XG4gICAgZGVsZXRlIGZpbmFsQXJnc1snYXBpJ107XG4gICAgcmV0dXJuIGZpbmFsQXJncztcblxuICAgIC8vIGZvcihsZXQgaSBpbiBxdWVyeSlcbiAgICAvLyB7XG4gICAgLy8gXHRmaW5hbEFyZ3NbaV0gPSBxdWVyeVtpXTtcbiAgICAvLyB9XG5cbiAgICAvLyBmb3IobGV0IGkgaW4gYXJncylcbiAgICAvLyB7XG4gICAgLy8gXHRmaW5hbEFyZ3NbaV0gPSBhcmdzW2ldO1xuICAgIC8vIH1cbiAgfVxuICBzdGF0aWMgcXVlcnlUb1N0cmluZyhhcmdzID0ge30sIGZyZXNoID0gZmFsc2UpIHtcbiAgICB2YXIgcGFydHMgPSBbXSxcbiAgICAgIGZpbmFsQXJncyA9IGFyZ3M7XG4gICAgaWYgKCFmcmVzaCkge1xuICAgICAgZmluYWxBcmdzID0gdGhpcy5xdWVyeU92ZXIoYXJncyk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gZmluYWxBcmdzKSB7XG4gICAgICBpZiAoZmluYWxBcmdzW2ldID09PSAnJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHBhcnRzLnB1c2goaSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChmaW5hbEFyZ3NbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oJyYnKTtcbiAgfVxuICBzdGF0aWMgc2V0UXVlcnkobmFtZSwgdmFsdWUsIHNpbGVudCkge1xuICAgIHZhciBhcmdzID0gdGhpcy5xdWVyeU92ZXIoKTtcbiAgICBhcmdzW25hbWVdID0gdmFsdWU7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGRlbGV0ZSBhcmdzW25hbWVdO1xuICAgIH1cbiAgICB2YXIgcXVlcnlTdHJpbmcgPSB0aGlzLnF1ZXJ5VG9TdHJpbmcoYXJncywgdHJ1ZSk7XG4gICAgdGhpcy5nbyhsb2NhdGlvbi5wYXRobmFtZSArIChxdWVyeVN0cmluZyA/ICc/JyArIHF1ZXJ5U3RyaW5nIDogJz8nKSwgc2lsZW50KTtcbiAgfVxufVxuZXhwb3J0cy5Sb3V0ZXIgPSBSb3V0ZXI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncXVlcnknLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiB7fVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAnaGlzdG9yeScsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IFtdXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdyb3V0ZUNvdW50Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiAwXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdwcmV2UGF0aCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogbnVsbFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncXVlcnlTdHJpbmcnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IG51bGxcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ0ludGVybmFsRXJyb3InLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBJbnRlcm5hbEVycm9yXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdOb3RGb3VuZEVycm9yJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogTm90Rm91bmRFcnJvclxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Sb3V0ZXMuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJvdXRlcyA9IHZvaWQgMDtcbnZhciBBcHBSb3V0ZXMgPSB7fTtcbnZhciBfcmVxdWlyZSA9IHJlcXVpcmU7XG52YXIgaW1wb3J0ZWQgPSBmYWxzZTtcbnZhciBydW5JbXBvcnQgPSAoKSA9PiB7XG4gIGlmIChpbXBvcnRlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICA7XG4gIHRyeSB7XG4gICAgT2JqZWN0LmFzc2lnbihBcHBSb3V0ZXMsIF9yZXF1aXJlKCdSb3V0ZXMnKS5Sb3V0ZXMgfHwge30pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGdsb2JhbFRoaXMuZGV2TW9kZSA9PT0gdHJ1ZSAmJiBjb25zb2xlLndhcm4oZXJyb3IpO1xuICB9XG4gIGltcG9ydGVkID0gdHJ1ZTtcbn07XG5jbGFzcyBSb3V0ZXMge1xuICBzdGF0aWMgZ2V0KG5hbWUpIHtcbiAgICBydW5JbXBvcnQoKTtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXNbbmFtZV07XG4gIH1cbiAgc3RhdGljIGR1bXAoKSB7XG4gICAgcnVuSW1wb3J0KCk7XG4gICAgcmV0dXJuIHRoaXMucm91dGVzO1xuICB9XG59XG5leHBvcnRzLlJvdXRlcyA9IFJvdXRlcztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXMsICdyb3V0ZXMnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBBcHBSb3V0ZXNcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvUnVsZVNldC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUnVsZVNldCA9IHZvaWQgMDtcbnZhciBfRG9tID0gcmVxdWlyZShcIi4vRG9tXCIpO1xudmFyIF9UYWcgPSByZXF1aXJlKFwiLi9UYWdcIik7XG52YXIgX1ZpZXcgPSByZXF1aXJlKFwiLi9WaWV3XCIpO1xuY2xhc3MgUnVsZVNldCB7XG4gIHN0YXRpYyBhZGQoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5nbG9iYWxSdWxlcyA9IHRoaXMuZ2xvYmFsUnVsZXMgfHwge307XG4gICAgdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0gPSB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXSB8fCBbXTtcbiAgICB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXS5wdXNoKGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBzdGF0aWMgYXBwbHkoZG9jID0gZG9jdW1lbnQsIHZpZXcgPSBudWxsKSB7XG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gdGhpcy5nbG9iYWxSdWxlcykge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXSkge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXVtpXTtcbiAgICAgICAgdmFyIHdyYXBwZWQgPSB0aGlzLndyYXAoZG9jLCBjYWxsYmFjaywgdmlldyk7XG4gICAgICAgIHZhciBub2RlcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZm9yICh2YXIgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgIHdyYXBwZWQobm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYWRkKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHRoaXMucnVsZXMgPSB0aGlzLnJ1bGVzIHx8IHt9O1xuICAgIHRoaXMucnVsZXNbc2VsZWN0b3JdID0gdGhpcy5ydWxlc1tzZWxlY3Rvcl0gfHwgW107XG4gICAgdGhpcy5ydWxlc1tzZWxlY3Rvcl0ucHVzaChjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgYXBwbHkoZG9jID0gZG9jdW1lbnQsIHZpZXcgPSBudWxsKSB7XG4gICAgUnVsZVNldC5hcHBseShkb2MsIHZpZXcpO1xuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIHRoaXMucnVsZXMpIHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5ydWxlc1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5ydWxlc1tzZWxlY3Rvcl1baV07XG4gICAgICAgIHZhciB3cmFwcGVkID0gUnVsZVNldC53cmFwKGRvYywgY2FsbGJhY2ssIHZpZXcpO1xuICAgICAgICB2YXIgbm9kZXMgPSBkb2MucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGZvciAodmFyIG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICB3cmFwcGVkKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHB1cmdlKCkge1xuICAgIGlmICghdGhpcy5ydWxlcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKHZhciBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5ydWxlcykpIHtcbiAgICAgIGlmICghdGhpcy5ydWxlc1trXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtrIGluIHRoaXMucnVsZXNba10pIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucnVsZXNba11ba2tdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBzdGF0aWMgd2FpdChldmVudCA9ICdET01Db250ZW50TG9hZGVkJywgbm9kZSA9IGRvY3VtZW50KSB7XG4gICAgdmFyIGxpc3RlbmVyID0gKChldmVudCwgbm9kZSkgPT4gKCkgPT4ge1xuICAgICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcy5hcHBseSgpO1xuICAgIH0pKGV2ZW50LCBub2RlKTtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcbiAgfVxuICBzdGF0aWMgd3JhcChkb2MsIG9yaWdpbmFsQ2FsbGJhY2ssIHZpZXcgPSBudWxsKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gb3JpZ2luYWxDYWxsYmFjaztcbiAgICBpZiAob3JpZ2luYWxDYWxsYmFjayBpbnN0YW5jZW9mIF9WaWV3LlZpZXcgfHwgb3JpZ2luYWxDYWxsYmFjayAmJiBvcmlnaW5hbENhbGxiYWNrLnByb3RvdHlwZSAmJiBvcmlnaW5hbENhbGxiYWNrLnByb3RvdHlwZSBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgIGNhbGxiYWNrID0gKCkgPT4gb3JpZ2luYWxDYWxsYmFjaztcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBlbGVtZW50Ll9fX2N2QXBwbGllZF9fXyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVsZW1lbnQsICdfX19jdkFwcGxpZWRfX18nLCB7XG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICAgIHZhbHVlOiBuZXcgV2Vha1NldCgpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGVsZW1lbnQuX19fY3ZBcHBsaWVkX19fLmhhcyhvcmlnaW5hbENhbGxiYWNrKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgZGlyZWN0LCBwYXJlbnRWaWV3O1xuICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgZGlyZWN0ID0gcGFyZW50VmlldyA9IHZpZXc7XG4gICAgICAgIGlmICh2aWV3LnZpZXdMaXN0KSB7XG4gICAgICAgICAgcGFyZW50VmlldyA9IHZpZXcudmlld0xpc3QucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgdGFnID0gbmV3IF9UYWcuVGFnKGVsZW1lbnQsIHBhcmVudFZpZXcsIG51bGwsIHVuZGVmaW5lZCwgZGlyZWN0KTtcbiAgICAgIHZhciBwYXJlbnQgPSB0YWcuZWxlbWVudC5wYXJlbnROb2RlO1xuICAgICAgdmFyIHNpYmxpbmcgPSB0YWcuZWxlbWVudC5uZXh0U2libGluZztcbiAgICAgIHZhciByZXN1bHQgPSBjYWxsYmFjayh0YWcpO1xuICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgZWxlbWVudC5fX19jdkFwcGxpZWRfX18uYWRkKG9yaWdpbmFsQ2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHJlc3VsdCA9IG5ldyBfVGFnLlRhZyhyZXN1bHQpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICAgIGlmICghcmVzdWx0LmVsZW1lbnQuY29udGFpbnModGFnLmVsZW1lbnQpKSB7XG4gICAgICAgICAgd2hpbGUgKHRhZy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5lbGVtZW50LmFwcGVuZENoaWxkKHRhZy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNpYmxpbmcpIHtcbiAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHJlc3VsdC5lbGVtZW50LCBzaWJsaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQocmVzdWx0LmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5wcm90b3R5cGUgJiYgcmVzdWx0LnByb3RvdHlwZSBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IHJlc3VsdCh7fSwgdmlldyk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgIHZpZXcuY2xlYW51cC5wdXNoKCgpID0+IHJlc3VsdC5yZW1vdmUoKSk7XG4gICAgICAgICAgdmlldy5jbGVhbnVwLnB1c2godmlldy5hcmdzLmJpbmRUbygodiwgaywgdCkgPT4ge1xuICAgICAgICAgICAgdFtrXSA9IHY7XG4gICAgICAgICAgICByZXN1bHQuYXJnc1trXSA9IHY7XG4gICAgICAgICAgfSkpO1xuICAgICAgICAgIHZpZXcuY2xlYW51cC5wdXNoKHJlc3VsdC5hcmdzLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgICAgdFtrXSA9IHY7XG4gICAgICAgICAgICB2aWV3LmFyZ3Nba10gPSB2O1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICB0YWcuY2xlYXIoKTtcbiAgICAgICAgcmVzdWx0LnJlbmRlcih0YWcuZWxlbWVudCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuZXhwb3J0cy5SdWxlU2V0ID0gUnVsZVNldDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1NldE1hcC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuU2V0TWFwID0gdm9pZCAwO1xuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KGUsIHIsIHQpIHsgcmV0dXJuIChyID0gX3RvUHJvcGVydHlLZXkocikpIGluIGUgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgciwgeyB2YWx1ZTogdCwgZW51bWVyYWJsZTogITAsIGNvbmZpZ3VyYWJsZTogITAsIHdyaXRhYmxlOiAhMCB9KSA6IGVbcl0gPSB0LCBlOyB9XG5mdW5jdGlvbiBfdG9Qcm9wZXJ0eUtleSh0KSB7IHZhciBpID0gX3RvUHJpbWl0aXZlKHQsIFwic3RyaW5nXCIpOyByZXR1cm4gXCJzeW1ib2xcIiA9PSB0eXBlb2YgaSA/IGkgOiBpICsgXCJcIjsgfVxuZnVuY3Rpb24gX3RvUHJpbWl0aXZlKHQsIHIpIHsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIHQgfHwgIXQpIHJldHVybiB0OyB2YXIgZSA9IHRbU3ltYm9sLnRvUHJpbWl0aXZlXTsgaWYgKHZvaWQgMCAhPT0gZSkgeyB2YXIgaSA9IGUuY2FsbCh0LCByIHx8IFwiZGVmYXVsdFwiKTsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIGkpIHJldHVybiBpOyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQEB0b1ByaW1pdGl2ZSBtdXN0IHJldHVybiBhIHByaW1pdGl2ZSB2YWx1ZS5cIik7IH0gcmV0dXJuIChcInN0cmluZ1wiID09PSByID8gU3RyaW5nIDogTnVtYmVyKSh0KTsgfVxuY2xhc3MgU2V0TWFwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgX2RlZmluZVByb3BlcnR5KHRoaXMsIFwiX21hcFwiLCBuZXcgTWFwKCkpO1xuICB9XG4gIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmhhcyhrZXkpO1xuICB9XG4gIGdldChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmdldChrZXkpO1xuICB9XG4gIGdldE9uZShrZXkpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy5nZXQoa2V5KTtcbiAgICBmb3IgKHZhciBlbnRyeSBvZiBzZXQpIHtcbiAgICAgIHJldHVybiBlbnRyeTtcbiAgICB9XG4gIH1cbiAgYWRkKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy5fbWFwLmdldChrZXkpO1xuICAgIGlmICghc2V0KSB7XG4gICAgICB0aGlzLl9tYXAuc2V0KGtleSwgc2V0ID0gbmV3IFNldCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHNldC5hZGQodmFsdWUpO1xuICB9XG4gIHJlbW92ZShrZXksIHZhbHVlKSB7XG4gICAgdmFyIHNldCA9IHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgICBpZiAoIXNldCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVzID0gc2V0LmRlbGV0ZSh2YWx1ZSk7XG4gICAgaWYgKCFzZXQuc2l6ZSkge1xuICAgICAgdGhpcy5fbWFwLmRlbGV0ZShrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG4gIHZhbHVlcygpIHtcbiAgICByZXR1cm4gbmV3IFNldCguLi5bLi4udGhpcy5fbWFwLnZhbHVlcygpXS5tYXAoc2V0ID0+IFsuLi5zZXQudmFsdWVzKCldKSk7XG4gIH1cbn1cbmV4cG9ydHMuU2V0TWFwID0gU2V0TWFwO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVGFnLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5UYWcgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgQ3VycmVudFN0eWxlID0gU3ltYm9sKCdDdXJyZW50U3R5bGUnKTtcbnZhciBDdXJyZW50QXR0cnMgPSBTeW1ib2woJ0N1cnJlbnRBdHRycycpO1xudmFyIHN0eWxlciA9IGZ1bmN0aW9uIChzdHlsZXMpIHtcbiAgaWYgKCF0aGlzLm5vZGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgZm9yICh2YXIgcHJvcGVydHkgaW4gc3R5bGVzKSB7XG4gICAgdmFyIHN0cmluZ2VkUHJvcGVydHkgPSBTdHJpbmcoc3R5bGVzW3Byb3BlcnR5XSk7XG4gICAgaWYgKHRoaXNbQ3VycmVudFN0eWxlXS5oYXMocHJvcGVydHkpICYmIHRoaXNbQ3VycmVudFN0eWxlXS5nZXQocHJvcGVydHkpID09PSBzdHlsZXNbcHJvcGVydHldIHx8IE51bWJlci5pc05hTihzdHlsZXNbcHJvcGVydHldKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChwcm9wZXJ0eVswXSA9PT0gJy0nKSB7XG4gICAgICB0aGlzLm5vZGUuc3R5bGUuc2V0UHJvcGVydHkocHJvcGVydHksIHN0cmluZ2VkUHJvcGVydHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm5vZGUuc3R5bGVbcHJvcGVydHldID0gc3RyaW5nZWRQcm9wZXJ0eTtcbiAgICB9XG4gICAgaWYgKHN0eWxlc1twcm9wZXJ0eV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLnNldChwcm9wZXJ0eSwgc3R5bGVzW3Byb3BlcnR5XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5kZWxldGUocHJvcGVydHkpO1xuICAgIH1cbiAgfVxufTtcbnZhciBnZXR0ZXIgPSBmdW5jdGlvbiAobmFtZSkge1xuICBpZiAodHlwZW9mIHRoaXNbbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpc1tuYW1lXTtcbiAgfVxuICBpZiAodGhpcy5ub2RlICYmIHR5cGVvZiB0aGlzLm5vZGVbbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpc1tuYW1lXSA9ICguLi5hcmdzKSA9PiB0aGlzLm5vZGVbbmFtZV0oLi4uYXJncyk7XG4gIH1cbiAgaWYgKG5hbWUgPT09ICdzdHlsZScpIHtcbiAgICByZXR1cm4gdGhpcy5wcm94eS5zdHlsZTtcbiAgfVxuICBpZiAodGhpcy5ub2RlICYmIG5hbWUgaW4gdGhpcy5ub2RlKSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZVtuYW1lXTtcbiAgfVxuICByZXR1cm4gdGhpc1tuYW1lXTtcbn07XG5jbGFzcyBUYWcge1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBwYXJlbnQsIHJlZiwgaW5kZXgsIGRpcmVjdCkge1xuICAgIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBzdWJkb2MgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChlbGVtZW50KTtcbiAgICAgIGVsZW1lbnQgPSBzdWJkb2MuZmlyc3RDaGlsZDtcbiAgICB9XG4gICAgdGhpcy5lbGVtZW50ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShlbGVtZW50KTtcbiAgICB0aGlzLm5vZGUgPSB0aGlzLmVsZW1lbnQ7XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5kaXJlY3QgPSBkaXJlY3Q7XG4gICAgdGhpcy5yZWYgPSByZWY7XG4gICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgIHRoaXMuY2xlYW51cCA9IFtdO1xuICAgIHRoaXNbX0JpbmRhYmxlLkJpbmRhYmxlLk9uQWxsR2V0XSA9IGdldHRlci5iaW5kKHRoaXMpO1xuICAgIHRoaXNbQ3VycmVudFN0eWxlXSA9IG5ldyBNYXAoKTtcbiAgICB0aGlzW0N1cnJlbnRBdHRyc10gPSBuZXcgTWFwKCk7XG4gICAgdmFyIGJvdW5kU3R5bGVyID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoc3R5bGVyLmJpbmQodGhpcykpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc3R5bGUnLCB7XG4gICAgICB2YWx1ZTogYm91bmRTdHlsZXJcbiAgICB9KTtcbiAgICB0aGlzLnByb3h5ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UodGhpcyk7XG4gICAgdGhpcy5wcm94eS5zdHlsZS5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgIGlmICh0aGlzW0N1cnJlbnRTdHlsZV0uaGFzKGspICYmIHRoaXNbQ3VycmVudFN0eWxlXS5nZXQoaykgPT09IHYpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5ub2RlLnN0eWxlW2tdID0gdjtcbiAgICAgIGlmICghZCAmJiB2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLnNldChrLCB2KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5kZWxldGUoayk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wcm94eS5iaW5kVG8oKHYsIGspID0+IHtcbiAgICAgIGlmIChrID09PSAnaW5kZXgnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChrIGluIGVsZW1lbnQgJiYgZWxlbWVudFtrXSAhPT0gdikge1xuICAgICAgICBlbGVtZW50W2tdID0gdjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5wcm94eTtcbiAgfVxuICBhdHRyKGF0dHJpYnV0ZXMpIHtcbiAgICBmb3IgKHZhciBhdHRyaWJ1dGUgaW4gYXR0cmlidXRlcykge1xuICAgICAgaWYgKHRoaXNbQ3VycmVudEF0dHJzXS5oYXMoYXR0cmlidXRlKSAmJiBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLm5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gICAgICAgIHRoaXNbQ3VycmVudEF0dHJzXS5kZWxldGUoYXR0cmlidXRlKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXNbQ3VycmVudEF0dHJzXS5oYXMoYXR0cmlidXRlKSB8fCB0aGlzW0N1cnJlbnRBdHRyc10uZ2V0KGF0dHJpYnV0ZSkgIT09IGF0dHJpYnV0ZXNbYXR0cmlidXRlXSkge1xuICAgICAgICBpZiAoYXR0cmlidXRlc1thdHRyaWJ1dGVdID09PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5ub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsICcnKTtcbiAgICAgICAgICB0aGlzW0N1cnJlbnRBdHRyc10uc2V0KGF0dHJpYnV0ZSwgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubm9kZS5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pO1xuICAgICAgICAgIHRoaXNbQ3VycmVudEF0dHJzXS5zZXQoYXR0cmlidXRlLCBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHJlbW92ZSgpIHtcbiAgICBpZiAodGhpcy5ub2RlKSB7XG4gICAgICB0aGlzLm5vZGUucmVtb3ZlKCk7XG4gICAgfVxuICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMpO1xuICAgIHZhciBjbGVhbnVwO1xuICAgIHdoaWxlIChjbGVhbnVwID0gdGhpcy5jbGVhbnVwLnNoaWZ0KCkpIHtcbiAgICAgIGNsZWFudXAoKTtcbiAgICB9XG4gICAgdGhpcy5jbGVhcigpO1xuICAgIGlmICghdGhpcy5ub2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkZXRhY2hFdmVudCA9IG5ldyBFdmVudCgnY3ZEb21EZXRhY2hlZCcpO1xuICAgIHRoaXMubm9kZS5kaXNwYXRjaEV2ZW50KGRldGFjaEV2ZW50KTtcbiAgICB0aGlzLm5vZGUgPSB0aGlzLmVsZW1lbnQgPSB0aGlzLnJlZiA9IHRoaXMucGFyZW50ID0gdW5kZWZpbmVkO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIGlmICghdGhpcy5ub2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkZXRhY2hFdmVudCA9IG5ldyBFdmVudCgnY3ZEb21EZXRhY2hlZCcpO1xuICAgIHdoaWxlICh0aGlzLm5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy5ub2RlLmZpcnN0Q2hpbGQuZGlzcGF0Y2hFdmVudChkZXRhY2hFdmVudCk7XG4gICAgICB0aGlzLm5vZGUucmVtb3ZlQ2hpbGQodGhpcy5ub2RlLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgfVxuICBwYXVzZShwYXVzZWQgPSB0cnVlKSB7fVxuICBsaXN0ZW4oZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIHZhciBub2RlID0gdGhpcy5ub2RlO1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB2YXIgcmVtb3ZlID0gKCkgPT4ge1xuICAgICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdmFyIHJlbW92ZXIgPSAoKSA9PiB7XG4gICAgICByZW1vdmUoKTtcbiAgICAgIHJlbW92ZSA9ICgpID0+IGNvbnNvbGUud2FybignQWxyZWFkeSByZW1vdmVkIScpO1xuICAgIH07XG4gICAgdGhpcy5wYXJlbnQub25SZW1vdmUoKCkgPT4gcmVtb3ZlcigpKTtcbiAgICByZXR1cm4gcmVtb3ZlcjtcbiAgfVxufVxuZXhwb3J0cy5UYWcgPSBUYWc7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9VdWlkLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5VdWlkID0gdm9pZCAwO1xuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KGUsIHIsIHQpIHsgcmV0dXJuIChyID0gX3RvUHJvcGVydHlLZXkocikpIGluIGUgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgciwgeyB2YWx1ZTogdCwgZW51bWVyYWJsZTogITAsIGNvbmZpZ3VyYWJsZTogITAsIHdyaXRhYmxlOiAhMCB9KSA6IGVbcl0gPSB0LCBlOyB9XG5mdW5jdGlvbiBfdG9Qcm9wZXJ0eUtleSh0KSB7IHZhciBpID0gX3RvUHJpbWl0aXZlKHQsIFwic3RyaW5nXCIpOyByZXR1cm4gXCJzeW1ib2xcIiA9PSB0eXBlb2YgaSA/IGkgOiBpICsgXCJcIjsgfVxuZnVuY3Rpb24gX3RvUHJpbWl0aXZlKHQsIHIpIHsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIHQgfHwgIXQpIHJldHVybiB0OyB2YXIgZSA9IHRbU3ltYm9sLnRvUHJpbWl0aXZlXTsgaWYgKHZvaWQgMCAhPT0gZSkgeyB2YXIgaSA9IGUuY2FsbCh0LCByIHx8IFwiZGVmYXVsdFwiKTsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIGkpIHJldHVybiBpOyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQEB0b1ByaW1pdGl2ZSBtdXN0IHJldHVybiBhIHByaW1pdGl2ZSB2YWx1ZS5cIik7IH0gcmV0dXJuIChcInN0cmluZ1wiID09PSByID8gU3RyaW5nIDogTnVtYmVyKSh0KTsgfVxudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG52YXIgY3J5cHRvID0gd2luLmNyeXB0bztcbmNsYXNzIFV1aWQge1xuICBjb25zdHJ1Y3Rvcih1dWlkID0gbnVsbCwgdmVyc2lvbiA9IDQpIHtcbiAgICBfZGVmaW5lUHJvcGVydHkodGhpcywgXCJ1dWlkXCIsIG51bGwpO1xuICAgIF9kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInZlcnNpb25cIiwgNCk7XG4gICAgaWYgKHV1aWQpIHtcbiAgICAgIGlmICh0eXBlb2YgdXVpZCAhPT0gJ3N0cmluZycgJiYgISh1dWlkIGluc3RhbmNlb2YgVXVpZCkgfHwgIXV1aWQubWF0Y2goL1swLTlBLUZhLWZdezh9KC1bMC05QS1GYS1mXXs0fSl7M30tWzAtOUEtRmEtZl17MTJ9LykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGlucHV0IGZvciBVdWlkOiBcIiR7dXVpZH1cImApO1xuICAgICAgfVxuICAgICAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgIHRoaXMudXVpZCA9IHV1aWQ7XG4gICAgfSBlbHNlIGlmIChjcnlwdG8gJiYgdHlwZW9mIGNyeXB0by5yYW5kb21VVUlEID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnV1aWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaW5pdCA9IFsxZTddICsgLTFlMyArIC00ZTMgKyAtOGUzICsgLTFlMTE7XG4gICAgICB2YXIgcmFuZCA9IGNyeXB0byAmJiB0eXBlb2YgY3J5cHRvLnJhbmRvbVVVSUQgPT09ICdmdW5jdGlvbicgPyAoKSA9PiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50OEFycmF5KDEpKVswXSA6ICgpID0+IE1hdGgudHJ1bmMoTWF0aC5yYW5kb20oKSAqIDI1Nik7XG4gICAgICB0aGlzLnV1aWQgPSBpbml0LnJlcGxhY2UoL1swMThdL2csIGMgPT4gKGMgXiByYW5kKCkgJiAxNSA+PiBjIC8gNCkudG9TdHJpbmcoMTYpKTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfVxuICBbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHtcbiAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICB9XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnV1aWQ7XG4gIH1cbiAgdG9Kc29uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB2ZXJzaW9uOiB0aGlzLnZlcnNpb24sXG4gICAgICB1dWlkOiB0aGlzLnV1aWRcbiAgICB9O1xuICB9XG59XG5leHBvcnRzLlV1aWQgPSBVdWlkO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVmlldy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVmlldyA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBfVmlld0xpc3QgPSByZXF1aXJlKFwiLi9WaWV3TGlzdFwiKTtcbnZhciBfUm91dGVyID0gcmVxdWlyZShcIi4vUm91dGVyXCIpO1xudmFyIF9VdWlkID0gcmVxdWlyZShcIi4vVXVpZFwiKTtcbnZhciBfRG9tID0gcmVxdWlyZShcIi4vRG9tXCIpO1xudmFyIF9UYWcgPSByZXF1aXJlKFwiLi9UYWdcIik7XG52YXIgX0JhZyA9IHJlcXVpcmUoXCIuL0JhZ1wiKTtcbnZhciBfUnVsZVNldCA9IHJlcXVpcmUoXCIuL1J1bGVTZXRcIik7XG52YXIgX01peGluID0gcmVxdWlyZShcIi4vTWl4aW5cIik7XG52YXIgX0V2ZW50VGFyZ2V0TWl4aW4gPSByZXF1aXJlKFwiLi4vbWl4aW4vRXZlbnRUYXJnZXRNaXhpblwiKTtcbnZhciBkb250UGFyc2UgPSBTeW1ib2woJ2RvbnRQYXJzZScpO1xudmFyIGV4cGFuZEJpbmQgPSBTeW1ib2woJ2V4cGFuZEJpbmQnKTtcbnZhciB1dWlkID0gU3ltYm9sKCd1dWlkJyk7XG5jbGFzcyBWaWV3IGV4dGVuZHMgX01peGluLk1peGluLndpdGgoX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbikge1xuICBnZXQgX2lkKCkge1xuICAgIHJldHVybiB0aGlzW3V1aWRdO1xuICB9XG4gIHN0YXRpYyBmcm9tKHRlbXBsYXRlLCBhcmdzID0ge30sIG1haW5WaWV3ID0gbnVsbCkge1xuICAgIHZhciB2aWV3ID0gbmV3IHRoaXMoYXJncywgbWFpblZpZXcpO1xuICAgIHZpZXcudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICByZXR1cm4gdmlldztcbiAgfVxuICBjb25zdHJ1Y3RvcihhcmdzID0ge30sIG1haW5WaWV3ID0gbnVsbCkge1xuICAgIHN1cGVyKGFyZ3MsIG1haW5WaWV3KTtcbiAgICB0aGlzW19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IG1haW5WaWV3O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnYXJncycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZShhcmdzKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCB1dWlkLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jb25zdHJ1Y3Rvci51dWlkKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ25vZGVzQXR0YWNoZWQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9CYWcuQmFnKChpLCBzLCBhKSA9PiB7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ25vZGVzRGV0YWNoZWQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9CYWcuQmFnKChpLCBzLCBhKSA9PiB7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19vblJlbW92ZScsIHtcbiAgICAgIHZhbHVlOiBuZXcgX0JhZy5CYWcoKGksIHMsIGEpID0+IHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY2xlYW51cCcsIHtcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncGFyZW50Jywge1xuICAgICAgdmFsdWU6IG1haW5WaWV3LFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ZpZXdzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndmlld0xpc3RzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2l0aFZpZXdzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndGFncycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ25vZGVzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKFtdKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndGltZW91dHMnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdpbnRlcnZhbHMnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdmcmFtZXMnLCB7XG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3J1bGVTZXQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9SdWxlU2V0LlJ1bGVTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlUnVsZVNldCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX1J1bGVTZXQuUnVsZVNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdzdWJCaW5kaW5ncycsIHtcbiAgICAgIHZhbHVlOiB7fVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndGVtcGxhdGVzJywge1xuICAgICAgdmFsdWU6IHt9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwb3N0TWFwcGluZycsIHtcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2V2ZW50Q2xlYW51cCcsIHtcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndW5wYXVzZUNhbGxiYWNrcycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ludGVycG9sYXRlUmVnZXgnLCB7XG4gICAgICB2YWx1ZTogLyhcXFtcXFsoKD86XFwkKyk/W1xcd1xcLlxcfC1dKylcXF1cXF0pL2dcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbmRlcmVkJywge1xuICAgICAgdmFsdWU6IG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCkgPT4gT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZW5kZXJDb21wbGV0ZScsIHtcbiAgICAgICAgdmFsdWU6IGFjY2VwdFxuICAgICAgfSkpXG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICBpZiAoIXRoaXNbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXNbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gbnVsbDtcbiAgICB9KTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSB0aGlzO1xuICAgIHRoaXMudGVtcGxhdGUgPSBgYDtcbiAgICB0aGlzLmZpcnN0Tm9kZSA9IG51bGw7XG4gICAgdGhpcy5sYXN0Tm9kZSA9IG51bGw7XG4gICAgdGhpcy52aWV3TGlzdCA9IG51bGw7XG4gICAgdGhpcy5tYWluVmlldyA9IG51bGw7XG4gICAgdGhpcy5wcmVzZXJ2ZSA9IGZhbHNlO1xuICAgIHRoaXMucmVtb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMubG9hZGVkID0gUHJvbWlzZS5yZXNvbHZlKHRoaXMpO1xuXG4gICAgLy8gcmV0dXJuIEJpbmRhYmxlLm1ha2UodGhpcyk7XG4gIH1cbiAgc3RhdGljIGlzVmlldygpIHtcbiAgICByZXR1cm4gVmlldztcbiAgfVxuICBvbkZyYW1lKGNhbGxiYWNrKSB7XG4gICAgdmFyIHN0b3BwZWQgPSBmYWxzZTtcbiAgICB2YXIgY2FuY2VsID0gKCkgPT4ge1xuICAgICAgc3RvcHBlZCA9IHRydWU7XG4gICAgfTtcbiAgICB2YXIgYyA9IHRpbWVzdGFtcCA9PiB7XG4gICAgICBpZiAodGhpcy5yZW1vdmVkIHx8IHN0b3BwZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgICAgICBjYWxsYmFjayhEYXRlLm5vdygpKTtcbiAgICAgIH1cbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShjKTtcbiAgICB9O1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjKERhdGUubm93KCkpKTtcbiAgICB0aGlzLmZyYW1lcy5wdXNoKGNhbmNlbCk7XG4gICAgcmV0dXJuIGNhbmNlbDtcbiAgfVxuICBvbk5leHRGcmFtZShjYWxsYmFjaykge1xuICAgIHJldHVybiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSkpO1xuICB9XG4gIG9uSWRsZShjYWxsYmFjaykge1xuICAgIHJldHVybiByZXF1ZXN0SWRsZUNhbGxiYWNrKCgpID0+IGNhbGxiYWNrKERhdGUubm93KCkpKTtcbiAgfVxuICBvblRpbWVvdXQodGltZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgdGltZW91dEluZm8gPSB7XG4gICAgICB0aW1lb3V0OiBudWxsLFxuICAgICAgY2FsbGJhY2s6IG51bGwsXG4gICAgICB0aW1lOiB0aW1lLFxuICAgICAgZmlyZWQ6IGZhbHNlLFxuICAgICAgY3JlYXRlZDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICBwYXVzZWQ6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgd3JhcHBlZENhbGxiYWNrID0gKCkgPT4ge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICAgIHRpbWVvdXRJbmZvLmZpcmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICAgIH07XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHdyYXBwZWRDYWxsYmFjaywgdGltZSk7XG4gICAgdGltZW91dEluZm8uY2FsbGJhY2sgPSB3cmFwcGVkQ2FsbGJhY2s7XG4gICAgdGltZW91dEluZm8udGltZW91dCA9IHRpbWVvdXQ7XG4gICAgdGhpcy50aW1lb3V0cy5zZXQodGltZW91dEluZm8udGltZW91dCwgdGltZW91dEluZm8pO1xuICAgIHJldHVybiB0aW1lb3V0O1xuICB9XG4gIGNsZWFyVGltZW91dCh0aW1lb3V0KSB7XG4gICAgaWYgKCF0aGlzLnRpbWVvdXRzLmhhcyh0aW1lb3V0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dEluZm8gPSB0aGlzLnRpbWVvdXRzLmdldCh0aW1lb3V0KTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dEluZm8udGltZW91dCk7XG4gICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dEluZm8udGltZW91dCk7XG4gIH1cbiAgb25JbnRlcnZhbCh0aW1lLCBjYWxsYmFjaykge1xuICAgIHZhciB0aW1lb3V0ID0gc2V0SW50ZXJ2YWwoY2FsbGJhY2ssIHRpbWUpO1xuICAgIHRoaXMuaW50ZXJ2YWxzLnNldCh0aW1lb3V0LCB7XG4gICAgICB0aW1lb3V0OiB0aW1lb3V0LFxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgdGltZTogdGltZSxcbiAgICAgIHBhdXNlZDogZmFsc2VcbiAgICB9KTtcbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxuICBjbGVhckludGVydmFsKHRpbWVvdXQpIHtcbiAgICBpZiAoIXRoaXMuaW50ZXJ2YWxzLmhhcyh0aW1lb3V0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dEluZm8gPSB0aGlzLmludGVydmFscy5nZXQodGltZW91dCk7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICAgIHRoaXMuaW50ZXJ2YWxzLmRlbGV0ZSh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgfVxuICBwYXVzZShwYXVzZWQgPSB1bmRlZmluZWQpIHtcbiAgICBpZiAocGF1c2VkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucGF1c2VkID0gIXRoaXMucGF1c2VkO1xuICAgIH1cbiAgICB0aGlzLnBhdXNlZCA9IHBhdXNlZDtcbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgIGZvciAodmFyIFtjYWxsYmFjaywgdGltZW91dF0gb2YgdGhpcy50aW1lb3V0cykge1xuICAgICAgICBpZiAodGltZW91dC5maXJlZCkge1xuICAgICAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXQudGltZW91dCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQudGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgdGltZW91dC50aW1lID0gTWF0aC5tYXgoMCwgdGltZW91dC50aW1lIC0gKERhdGUubm93KCkgLSB0aW1lb3V0LmNyZWF0ZWQpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIFtfY2FsbGJhY2ssIF90aW1lb3V0XSBvZiB0aGlzLmludGVydmFscykge1xuICAgICAgICBjbGVhckludGVydmFsKF90aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgICBfdGltZW91dC5wYXVzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBbX2NhbGxiYWNrMiwgX3RpbWVvdXQyXSBvZiB0aGlzLnRpbWVvdXRzKSB7XG4gICAgICAgIGlmICghX3RpbWVvdXQyLnBhdXNlZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChfdGltZW91dDIuZmlyZWQpIHtcbiAgICAgICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZShfdGltZW91dDIudGltZW91dCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgX3RpbWVvdXQyLnRpbWVvdXQgPSBzZXRUaW1lb3V0KF90aW1lb3V0Mi5jYWxsYmFjaywgX3RpbWVvdXQyLnRpbWUpO1xuICAgICAgICBfdGltZW91dDIucGF1c2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBbX2NhbGxiYWNrMywgX3RpbWVvdXQzXSBvZiB0aGlzLmludGVydmFscykge1xuICAgICAgICBpZiAoIV90aW1lb3V0My5wYXVzZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBfdGltZW91dDMudGltZW91dCA9IHNldEludGVydmFsKF90aW1lb3V0My5jYWxsYmFjaywgX3RpbWVvdXQzLnRpbWUpO1xuICAgICAgICBfdGltZW91dDMucGF1c2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBbLCBfY2FsbGJhY2s0XSBvZiB0aGlzLnVucGF1c2VDYWxsYmFja3MpIHtcbiAgICAgICAgX2NhbGxiYWNrNCgpO1xuICAgICAgfVxuICAgICAgdGhpcy51bnBhdXNlQ2FsbGJhY2tzLmNsZWFyKCk7XG4gICAgfVxuICAgIGZvciAodmFyIFt0YWcsIHZpZXdMaXN0XSBvZiB0aGlzLnZpZXdMaXN0cykge1xuICAgICAgdmlld0xpc3QucGF1c2UoISFwYXVzZWQpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMudGFncykge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy50YWdzW2ldKSkge1xuICAgICAgICBmb3IgKHZhciBqIGluIHRoaXMudGFnc1tpXSkge1xuICAgICAgICAgIHRoaXMudGFnc1tpXVtqXS5wYXVzZSghIXBhdXNlZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB0aGlzLnRhZ3NbaV0ucGF1c2UoISFwYXVzZWQpO1xuICAgIH1cbiAgfVxuICByZW5kZXIocGFyZW50Tm9kZSA9IG51bGwsIGluc2VydFBvaW50ID0gbnVsbCwgb3V0ZXJWaWV3ID0gbnVsbCkge1xuICAgIHZhciB7XG4gICAgICBkb2N1bWVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICBpZiAocGFyZW50Tm9kZSBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgIHBhcmVudE5vZGUgPSBwYXJlbnROb2RlLmZpcnN0Tm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICBpZiAoaW5zZXJ0UG9pbnQgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICBpbnNlcnRQb2ludCA9IGluc2VydFBvaW50LmZpcnN0Tm9kZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmlyc3ROb2RlKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZVJlbmRlcihwYXJlbnROb2RlLCBpbnNlcnRQb2ludCwgb3V0ZXJWaWV3KTtcbiAgICB9XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVuZGVyJykpO1xuICAgIHZhciB0ZW1wbGF0ZUlzRnJhZ21lbnQgPSB0eXBlb2YgdGhpcy50ZW1wbGF0ZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHRoaXMudGVtcGxhdGUuY2xvbmVOb2RlID09PSAnZnVuY3Rpb24nO1xuICAgIHZhciB0ZW1wbGF0ZVBhcnNlZCA9IHRlbXBsYXRlSXNGcmFnbWVudCB8fCBWaWV3LnRlbXBsYXRlcy5oYXModGhpcy50ZW1wbGF0ZSk7XG4gICAgdmFyIHN1YkRvYztcbiAgICBpZiAodGVtcGxhdGVQYXJzZWQpIHtcbiAgICAgIGlmICh0ZW1wbGF0ZUlzRnJhZ21lbnQpIHtcbiAgICAgICAgc3ViRG9jID0gdGhpcy50ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWJEb2MgPSBWaWV3LnRlbXBsYXRlcy5nZXQodGhpcy50ZW1wbGF0ZSkuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdWJEb2MgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCh0aGlzLnRlbXBsYXRlKTtcbiAgICB9XG4gICAgaWYgKCF0ZW1wbGF0ZVBhcnNlZCAmJiAhdGVtcGxhdGVJc0ZyYWdtZW50KSB7XG4gICAgICBWaWV3LnRlbXBsYXRlcy5zZXQodGhpcy50ZW1wbGF0ZSwgc3ViRG9jLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgfVxuICAgIHRoaXMubWFpblZpZXcgfHwgdGhpcy5wcmVSdWxlU2V0LmFwcGx5KHN1YkRvYywgdGhpcyk7XG4gICAgdGhpcy5tYXBUYWdzKHN1YkRvYyk7XG4gICAgdGhpcy5tYWluVmlldyB8fCB0aGlzLnJ1bGVTZXQuYXBwbHkoc3ViRG9jLCB0aGlzKTtcbiAgICBpZiAoZ2xvYmFsVGhpcy5kZXZNb2RlID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmZpcnN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoYFRlbXBsYXRlICR7dGhpcy5faWR9IFN0YXJ0YCk7XG4gICAgICB0aGlzLmxhc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChgVGVtcGxhdGUgJHt0aGlzLl9pZH0gRW5kYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZmlyc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgdGhpcy5sYXN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICB9XG4gICAgdGhpcy5ub2Rlcy5wdXNoKHRoaXMuZmlyc3ROb2RlLCAuLi5BcnJheS5mcm9tKHN1YkRvYy5jaGlsZE5vZGVzKSwgdGhpcy5sYXN0Tm9kZSk7XG4gICAgdGhpcy5wb3N0UmVuZGVyKHBhcmVudE5vZGUpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbmRlcmVkJykpO1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEF0dGFjaCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICBpZiAoaW5zZXJ0UG9pbnQpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIG51bGwpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN1YkRvYywgdGhpcy5sYXN0Tm9kZSk7XG4gICAgICB2YXIgcm9vdE5vZGUgPSBwYXJlbnROb2RlLmdldFJvb3ROb2RlKCk7XG4gICAgICBpZiAocm9vdE5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSwgb3V0ZXJWaWV3KTtcbiAgICAgIH0gZWxzZSBpZiAob3V0ZXJWaWV3KSB7XG4gICAgICAgIHZhciBmaXJzdERvbUF0dGFjaCA9IGV2ZW50ID0+IHtcbiAgICAgICAgICB2YXIgcm9vdE5vZGUgPSBwYXJlbnROb2RlLmdldFJvb3ROb2RlKCk7XG4gICAgICAgICAgdGhpcy5hdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICAgICAgdGhpcy5kaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlLCBvdXRlclZpZXcpO1xuICAgICAgICAgIG91dGVyVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdhdHRhY2hlZCcsIGZpcnN0RG9tQXR0YWNoKTtcbiAgICAgICAgfTtcbiAgICAgICAgb3V0ZXJWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2F0dGFjaGVkJywgZmlyc3REb21BdHRhY2gpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJlbmRlckNvbXBsZXRlKHRoaXMubm9kZXMpO1xuICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICB9XG4gIGRpc3BhdGNoQXR0YWNoKCkge1xuICAgIHZhciB7XG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYXR0YWNoJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIHRhcmdldDogdGhpc1xuICAgIH0pKTtcbiAgfVxuICBkaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlLCB2aWV3ID0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIHtcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2F0dGFjaGVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgbm9kZTogcGFyZW50Tm9kZSxcbiAgICAgICAgcm9vdDogcm9vdE5vZGUsXG4gICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICB9XG4gICAgfSkpO1xuICAgIHRoaXMuZGlzcGF0Y2hEb21BdHRhY2hlZCh2aWV3KTtcbiAgICBmb3IgKHZhciBjYWxsYmFjayBvZiB0aGlzLm5vZGVzQXR0YWNoZWQuaXRlbXMoKSkge1xuICAgICAgY2FsbGJhY2socm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgIH1cbiAgfVxuICBkaXNwYXRjaERvbUF0dGFjaGVkKHZpZXcpIHtcbiAgICB2YXIge1xuICAgICAgTm9kZSxcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHRoaXMubm9kZXMuZmlsdGVyKG4gPT4gbi5ub2RlVHlwZSAhPT0gTm9kZS5DT01NRU5UX05PREUpLmZvckVhY2goY2hpbGQgPT4ge1xuICAgICAgaWYgKCFjaGlsZC5tYXRjaGVzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNoaWxkLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkRvbUF0dGFjaGVkJywge1xuICAgICAgICB0YXJnZXQ6IGNoaWxkLFxuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgICAgX0RvbS5Eb20ubWFwVGFncyhjaGlsZCwgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgICBpZiAoIXRhZy5tYXRjaGVzKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZEb21BdHRhY2hlZCcsIHtcbiAgICAgICAgICB0YXJnZXQ6IHRhZyxcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZVJlbmRlcihwYXJlbnROb2RlLCBpbnNlcnRQb2ludCwgb3V0ZXJWaWV3KSB7XG4gICAgdmFyIHtcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHZhciB3aWxsUmVSZW5kZXIgPSB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZVJlbmRlcicpLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgdGFyZ2V0OiB0aGlzLFxuICAgICAgdmlldzogb3V0ZXJWaWV3XG4gICAgfSk7XG4gICAgaWYgKCF3aWxsUmVSZW5kZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHN1YkRvYyA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgaWYgKHRoaXMuZmlyc3ROb2RlLmlzQ29ubmVjdGVkKSB7XG4gICAgICB2YXIgZGV0YWNoID0gdGhpcy5ub2Rlc0RldGFjaGVkLml0ZW1zKCk7XG4gICAgICBmb3IgKHZhciBpIGluIGRldGFjaCkge1xuICAgICAgICBkZXRhY2hbaV0oKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3ViRG9jLmFwcGVuZCguLi50aGlzLm5vZGVzKTtcbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgaWYgKGluc2VydFBvaW50KSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBudWxsKTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgbnVsbCk7XG4gICAgICB9XG4gICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShzdWJEb2MsIHRoaXMubGFzdE5vZGUpO1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVSZW5kZXJlZCcpLCB7XG4gICAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICAgIHRhcmdldDogdGhpcyxcbiAgICAgICAgdmlldzogb3V0ZXJWaWV3XG4gICAgICB9KTtcbiAgICAgIHZhciByb290Tm9kZSA9IHBhcmVudE5vZGUuZ2V0Um9vdE5vZGUoKTtcbiAgICAgIGlmIChyb290Tm9kZS5pc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLmF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9kZXM7XG4gIH1cbiAgbWFwVGFncyhzdWJEb2MpIHtcbiAgICBfRG9tLkRvbS5tYXBUYWdzKHN1YkRvYywgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgaWYgKHRhZ1tkb250UGFyc2VdKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0YWcubWF0Y2hlcykge1xuICAgICAgICB0YWcgPSB0aGlzLm1hcEludGVycG9sYXRhYmxlVGFnKHRhZyk7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtdGVtcGxhdGVdJykgJiYgdGhpcy5tYXBUZW1wbGF0ZVRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1zbG90XScpICYmIHRoaXMubWFwU2xvdFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1wcmVyZW5kZXJdJykgJiYgdGhpcy5tYXBQcmVuZGVyZXJUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtbGlua10nKSAmJiB0aGlzLm1hcExpbmtUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtYXR0cl0nKSAmJiB0aGlzLm1hcEF0dHJUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtZXhwYW5kXScpICYmIHRoaXMubWFwRXhwYW5kYWJsZVRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1yZWZdJykgJiYgdGhpcy5tYXBSZWZUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytb25dJykgJiYgdGhpcy5tYXBPblRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1lYWNoXScpICYmIHRoaXMubWFwRWFjaFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1iaW5kXScpICYmIHRoaXMubWFwQmluZFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi13aXRoXScpICYmIHRoaXMubWFwV2l0aFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1pZl0nKSAmJiB0aGlzLm1hcElmVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXZpZXddJykgJiYgdGhpcy5tYXBWaWV3VGFnKHRhZykgfHwgdGFnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFnID0gdGhpcy5tYXBJbnRlcnBvbGF0YWJsZVRhZyh0YWcpO1xuICAgICAgfVxuICAgICAgaWYgKHRhZyAhPT0gd2Fsa2VyLmN1cnJlbnROb2RlKSB7XG4gICAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHRhZztcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnBvc3RNYXBwaW5nLmZvckVhY2goYyA9PiBjKCkpO1xuICB9XG4gIG1hcEV4cGFuZGFibGVUYWcodGFnKSB7XG4gICAgLy8gY29uc3QgdGFnQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVFeHBhbmRhYmxlVGFnKHRhZyk7XG4gICAgLy8gY29uc3QgbmV3VGFnID0gdGFnQ29tcGlsZXIodGhpcyk7XG4gICAgLy8gdGFnLnJlcGxhY2VXaXRoKG5ld1RhZyk7XG4gICAgLy8gcmV0dXJuIG5ld1RhZztcblxuICAgIHZhciBleGlzdGluZyA9IHRhZ1tleHBhbmRCaW5kXTtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGV4aXN0aW5nKCk7XG4gICAgICB0YWdbZXhwYW5kQmluZF0gPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIFtwcm94eSwgZXhwYW5kUHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUodGhpcy5hcmdzLCB0YWcuZ2V0QXR0cmlidXRlKCdjdi1leHBhbmQnKSwgdHJ1ZSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG4gICAgaWYgKCFwcm94eVtleHBhbmRQcm9wZXJ0eV0pIHtcbiAgICAgIHByb3h5W2V4cGFuZFByb3BlcnR5XSA9IHt9O1xuICAgIH1cbiAgICBwcm94eVtleHBhbmRQcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUubWFrZShwcm94eVtleHBhbmRQcm9wZXJ0eV0pO1xuICAgIHRoaXMub25SZW1vdmUodGFnW2V4cGFuZEJpbmRdID0gcHJveHlbZXhwYW5kUHJvcGVydHldLmJpbmRUbygodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgaWYgKGQgfHwgdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoaywgdik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh2ID09PSBudWxsKSB7XG4gICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoaywgJycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0YWcuc2V0QXR0cmlidXRlKGssIHYpO1xuICAgIH0pKTtcblxuICAgIC8vIGxldCBleHBhbmRQcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuICAgIC8vIGxldCBleHBhbmRBcmcgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUoXG4gICAgLy8gXHR0aGlzLmFyZ3NbZXhwYW5kUHJvcGVydHldIHx8IHt9XG4gICAgLy8gKTtcblxuICAgIC8vIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuXG4gICAgLy8gZm9yKGxldCBpIGluIGV4cGFuZEFyZylcbiAgICAvLyB7XG4gICAgLy8gXHRpZihpID09PSAnbmFtZScgfHwgaSA9PT0gJ3R5cGUnKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRjb250aW51ZTtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0bGV0IGRlYmluZCA9IGV4cGFuZEFyZy5iaW5kVG8oaSwgKCh0YWcsaSk9Pih2KT0+e1xuICAgIC8vIFx0XHR0YWcuc2V0QXR0cmlidXRlKGksIHYpO1xuICAgIC8vIFx0fSkodGFnLGkpKTtcblxuICAgIC8vIFx0dGhpcy5vblJlbW92ZSgoKT0+e1xuICAgIC8vIFx0XHRkZWJpbmQoKTtcbiAgICAvLyBcdFx0aWYoZXhwYW5kQXJnLmlzQm91bmQoKSlcbiAgICAvLyBcdFx0e1xuICAgIC8vIFx0XHRcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3MoZXhwYW5kQXJnKTtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0fSk7XG4gICAgLy8gfVxuXG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIGNvbXBpbGVFeHBhbmRhYmxlVGFnKHNvdXJjZVRhZylcbiAgLy8ge1xuICAvLyBcdHJldHVybiAoYmluZGluZ1ZpZXcpID0+IHtcblxuICAvLyBcdFx0Y29uc3QgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSh0cnVlKTtcblxuICAvLyBcdFx0bGV0IGV4cGFuZFByb3BlcnR5ID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG4gIC8vIFx0XHRsZXQgZXhwYW5kQXJnID0gQmluZGFibGUubWFrZShcbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcuYXJnc1tleHBhbmRQcm9wZXJ0eV0gfHwge31cbiAgLy8gXHRcdCk7XG5cbiAgLy8gXHRcdHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuXG4gIC8vIFx0XHRmb3IobGV0IGkgaW4gZXhwYW5kQXJnKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRpZihpID09PSAnbmFtZScgfHwgaSA9PT0gJ3R5cGUnKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0Y29udGludWU7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRsZXQgZGViaW5kID0gZXhwYW5kQXJnLmJpbmRUbyhpLCAoKHRhZyxpKT0+KHYpPT57XG4gIC8vIFx0XHRcdFx0dGFnLnNldEF0dHJpYnV0ZShpLCB2KTtcbiAgLy8gXHRcdFx0fSkodGFnLGkpKTtcblxuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5vblJlbW92ZSgoKT0+e1xuICAvLyBcdFx0XHRcdGRlYmluZCgpO1xuICAvLyBcdFx0XHRcdGlmKGV4cGFuZEFyZy5pc0JvdW5kKCkpXG4gIC8vIFx0XHRcdFx0e1xuICAvLyBcdFx0XHRcdFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyhleHBhbmRBcmcpO1xuICAvLyBcdFx0XHRcdH1cbiAgLy8gXHRcdFx0fSk7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdHJldHVybiB0YWc7XG4gIC8vIFx0fTtcbiAgLy8gfVxuXG4gIG1hcEF0dHJUYWcodGFnKSB7XG4gICAgdmFyIHRhZ0NvbXBpbGVyID0gdGhpcy5jb21waWxlQXR0clRhZyh0YWcpO1xuICAgIHZhciBuZXdUYWcgPSB0YWdDb21waWxlcih0aGlzKTtcbiAgICB0YWcucmVwbGFjZVdpdGgobmV3VGFnKTtcbiAgICByZXR1cm4gbmV3VGFnO1xuXG4gICAgLy8gbGV0IGF0dHJQcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcblxuICAgIC8vIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcblxuICAgIC8vIGxldCBwYWlycyA9IGF0dHJQcm9wZXJ0eS5zcGxpdCgnLCcpO1xuICAgIC8vIGxldCBhdHRycyA9IHBhaXJzLm1hcCgocCkgPT4gcC5zcGxpdCgnOicpKTtcblxuICAgIC8vIGZvciAobGV0IGkgaW4gYXR0cnMpXG4gICAgLy8ge1xuICAgIC8vIFx0bGV0IHByb3h5ICAgICAgICA9IHRoaXMuYXJncztcbiAgICAvLyBcdGxldCBiaW5kUHJvcGVydHkgPSBhdHRyc1tpXVsxXTtcbiAgICAvLyBcdGxldCBwcm9wZXJ0eSAgICAgPSBiaW5kUHJvcGVydHk7XG5cbiAgICAvLyBcdGlmKGJpbmRQcm9wZXJ0eS5tYXRjaCgvXFwuLykpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdFtwcm94eSwgcHJvcGVydHldID0gQmluZGFibGUucmVzb2x2ZShcbiAgICAvLyBcdFx0XHR0aGlzLmFyZ3NcbiAgICAvLyBcdFx0XHQsIGJpbmRQcm9wZXJ0eVxuICAgIC8vIFx0XHRcdCwgdHJ1ZVxuICAgIC8vIFx0XHQpO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRsZXQgYXR0cmliID0gYXR0cnNbaV1bMF07XG5cbiAgICAvLyBcdHRoaXMub25SZW1vdmUocHJveHkuYmluZFRvKFxuICAgIC8vIFx0XHRwcm9wZXJ0eVxuICAgIC8vIFx0XHQsICh2KT0+e1xuICAgIC8vIFx0XHRcdGlmKHYgPT0gbnVsbClcbiAgICAvLyBcdFx0XHR7XG4gICAgLy8gXHRcdFx0XHR0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgJycpO1xuICAgIC8vIFx0XHRcdFx0cmV0dXJuO1xuICAgIC8vIFx0XHRcdH1cbiAgICAvLyBcdFx0XHR0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgdik7XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdCkpO1xuICAgIC8vIH1cblxuICAgIC8vIHJldHVybiB0YWc7XG4gIH1cbiAgY29tcGlsZUF0dHJUYWcoc291cmNlVGFnKSB7XG4gICAgdmFyIGF0dHJQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcbiAgICB2YXIgcGFpcnMgPSBhdHRyUHJvcGVydHkuc3BsaXQoL1ssO10vKTtcbiAgICB2YXIgYXR0cnMgPSBwYWlycy5tYXAocCA9PiBwLnNwbGl0KCc6JykpO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcbiAgICByZXR1cm4gYmluZGluZ1ZpZXcgPT4ge1xuICAgICAgdmFyIHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBiaW5kUHJvcGVydHkgPSBhdHRyc1tpXVsxXSB8fCBhdHRyc1tpXVswXTtcbiAgICAgICAgdmFyIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoYmluZGluZ1ZpZXcuYXJncywgYmluZFByb3BlcnR5LCB0cnVlKTtcbiAgICAgICAgdmFyIGF0dHJpYiA9IGF0dHJzW2ldWzBdO1xuICAgICAgICBiaW5kaW5nVmlldy5vblJlbW92ZShwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgaWYgKGQgfHwgdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YWcucmVtb3ZlQXR0cmlidXRlKGF0dHJpYiwgdik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2ID09PSBudWxsKSB7XG4gICAgICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgJycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgdik7XG4gICAgICAgIH0pKTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBpIGluIGF0dHJzKSB7XG4gICAgICAgIF9sb29wKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGFnO1xuICAgIH07XG4gIH1cbiAgbWFwSW50ZXJwb2xhdGFibGVUYWcodGFnKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgcmVnZXggPSB0aGlzLmludGVycG9sYXRlUmVnZXg7XG4gICAgdmFyIHtcbiAgICAgIE5vZGUsXG4gICAgICBkb2N1bWVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICBpZiAodGFnLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xuICAgICAgdmFyIG9yaWdpbmFsID0gdGFnLm5vZGVWYWx1ZTtcbiAgICAgIGlmICghdGhpcy5pbnRlcnBvbGF0YWJsZShvcmlnaW5hbCkpIHtcbiAgICAgICAgcmV0dXJuIHRhZztcbiAgICAgIH1cbiAgICAgIHZhciBoZWFkZXIgPSAwO1xuICAgICAgdmFyIG1hdGNoO1xuICAgICAgdmFyIF9sb29wMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgYmluZFByb3BlcnR5ID0gbWF0Y2hbMl07XG4gICAgICAgICAgdmFyIHVuc2FmZUh0bWwgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgdW5zYWZlVmlldyA9IGZhbHNlO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eVNwbGl0ID0gYmluZFByb3BlcnR5LnNwbGl0KCd8Jyk7XG4gICAgICAgICAgdmFyIHRyYW5zZm9ybWVyID0gZmFsc2U7XG4gICAgICAgICAgaWYgKHByb3BlcnR5U3BsaXQubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdHJhbnNmb3JtZXIgPSBfdGhpcy5zdHJpbmdUcmFuc2Zvcm1lcihwcm9wZXJ0eVNwbGl0LnNsaWNlKDEpKTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IHByb3BlcnR5U3BsaXRbMF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkuc3Vic3RyKDAsIDIpID09PSAnJCQnKSB7XG4gICAgICAgICAgICB1bnNhZmVIdG1sID0gdHJ1ZTtcbiAgICAgICAgICAgIHVuc2FmZVZpZXcgPSB0cnVlO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gYmluZFByb3BlcnR5LnN1YnN0cigyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgICAgICAgdW5zYWZlSHRtbCA9IHRydWU7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBiaW5kUHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5LnN1YnN0cigwLCAzKSA9PT0gJzAwMCcpIHtcbiAgICAgICAgICAgIGV4cGFuZCA9IHRydWU7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBiaW5kUHJvcGVydHkuc3Vic3RyKDMpO1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzdGF0aWNQcmVmaXggPSBvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyLCBtYXRjaC5pbmRleCk7XG4gICAgICAgICAgaGVhZGVyID0gbWF0Y2guaW5kZXggKyBtYXRjaFsxXS5sZW5ndGg7XG4gICAgICAgICAgdmFyIHN0YXRpY05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdGF0aWNQcmVmaXgpO1xuICAgICAgICAgIHN0YXRpY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN0YXRpY05vZGUsIHRhZyk7XG4gICAgICAgICAgdmFyIGR5bmFtaWNOb2RlO1xuICAgICAgICAgIGlmICh1bnNhZmVIdG1sKSB7XG4gICAgICAgICAgICBkeW5hbWljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkeW5hbWljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZHluYW1pY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICAgICAgdmFyIHByb3h5ID0gX3RoaXMuYXJncztcbiAgICAgICAgICB2YXIgcHJvcGVydHkgPSBiaW5kUHJvcGVydHk7XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5tYXRjaCgvXFwuLykpIHtcbiAgICAgICAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoX3RoaXMuYXJncywgYmluZFByb3BlcnR5LCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGR5bmFtaWNOb2RlLCB0YWcpO1xuICAgICAgICAgIGlmICh0eXBlb2YgcHJveHkgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZXR1cm4gMTsgLy8gYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJveHkgPSBfQmluZGFibGUuQmluZGFibGUubWFrZShwcm94eSk7XG4gICAgICAgICAgdmFyIGRlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQpID0+IHtcbiAgICAgICAgICAgIGlmICh0W2tdICE9PSB2ICYmICh0W2tdIGluc3RhbmNlb2YgVmlldyB8fCB0W2tdIGluc3RhbmNlb2YgTm9kZSB8fCB0W2tdIGluc3RhbmNlb2YgX1RhZy5UYWcpKSB7XG4gICAgICAgICAgICAgIGlmICghdFtrXS5wcmVzZXJ2ZSkge1xuICAgICAgICAgICAgICAgIHRba10ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh1bnNhZmVWaWV3ICYmICEodiBpbnN0YW5jZW9mIFZpZXcpKSB7XG4gICAgICAgICAgICAgIHZhciB1bnNhZmVUZW1wbGF0ZSA9IHYgIT09IG51bGwgJiYgdiAhPT0gdm9pZCAwID8gdiA6ICcnO1xuICAgICAgICAgICAgICB2ID0gbmV3IFZpZXcoX3RoaXMuYXJncywgX3RoaXMpO1xuICAgICAgICAgICAgICB2LnRlbXBsYXRlID0gdW5zYWZlVGVtcGxhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIpIHtcbiAgICAgICAgICAgICAgdiA9IHRyYW5zZm9ybWVyKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICB2W19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IF90aGlzO1xuICAgICAgICAgICAgICB2LnJlbmRlcih0YWcucGFyZW50Tm9kZSwgZHluYW1pY05vZGUsIF90aGlzKTtcbiAgICAgICAgICAgICAgdmFyIGNsZWFudXAgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF2LnByZXNlcnZlKSB7XG4gICAgICAgICAgICAgICAgICB2LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgX3RoaXMub25SZW1vdmUoY2xlYW51cCk7XG4gICAgICAgICAgICAgIHYub25SZW1vdmUoKCkgPT4gX3RoaXMuX29uUmVtb3ZlLnJlbW92ZShjbGVhbnVwKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodiwgZHluYW1pY05vZGUpO1xuICAgICAgICAgICAgICBfdGhpcy5vblJlbW92ZSgoKSA9PiB2LnJlbW92ZSgpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICBpZiAodi5ub2RlKSB7XG4gICAgICAgICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHYubm9kZSwgZHluYW1pY05vZGUpO1xuICAgICAgICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKCgpID0+IHYucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHYucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgT2JqZWN0ICYmIHYuX190b1N0cmluZyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdiA9IHYuX190b1N0cmluZygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICh1bnNhZmVIdG1sKSB7XG4gICAgICAgICAgICAgICAgZHluYW1pY05vZGUuaW5uZXJIVE1MID0gdjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSB2O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkeW5hbWljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBfdGhpcy5vblJlbW92ZShkZWJpbmQpO1xuICAgICAgICB9LFxuICAgICAgICBfcmV0O1xuICAgICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhvcmlnaW5hbCkpIHtcbiAgICAgICAgX3JldCA9IF9sb29wMigpO1xuICAgICAgICBpZiAoX3JldCA9PT0gMCkgY29udGludWU7XG4gICAgICAgIGlmIChfcmV0ID09PSAxKSBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhciBzdGF0aWNTdWZmaXggPSBvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyKTtcbiAgICAgIHZhciBzdGF0aWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RhdGljU3VmZml4KTtcbiAgICAgIHN0YXRpY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3RhdGljTm9kZSwgdGFnKTtcbiAgICAgIHRhZy5ub2RlVmFsdWUgPSAnJztcbiAgICB9IGVsc2UgaWYgKHRhZy5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgIHZhciBfbG9vcDMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghX3RoaXMuaW50ZXJwb2xhdGFibGUodGFnLmF0dHJpYnV0ZXNbaV0udmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGhlYWRlciA9IDA7XG4gICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gdGFnLmF0dHJpYnV0ZXNbaV0udmFsdWU7XG4gICAgICAgIHZhciBhdHRyaWJ1dGUgPSB0YWcuYXR0cmlidXRlc1tpXTtcbiAgICAgICAgdmFyIGJpbmRQcm9wZXJ0aWVzID0ge307XG4gICAgICAgIHZhciBzZWdtZW50cyA9IFtdO1xuICAgICAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKG9yaWdpbmFsKSkge1xuICAgICAgICAgIHNlZ21lbnRzLnB1c2gob3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlciwgbWF0Y2guaW5kZXgpKTtcbiAgICAgICAgICBpZiAoIWJpbmRQcm9wZXJ0aWVzW21hdGNoWzJdXSkge1xuICAgICAgICAgICAgYmluZFByb3BlcnRpZXNbbWF0Y2hbMl1dID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGJpbmRQcm9wZXJ0aWVzW21hdGNoWzJdXS5wdXNoKHNlZ21lbnRzLmxlbmd0aCk7XG4gICAgICAgICAgc2VnbWVudHMucHVzaChtYXRjaFsxXSk7XG4gICAgICAgICAgaGVhZGVyID0gbWF0Y2guaW5kZXggKyBtYXRjaFsxXS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgc2VnbWVudHMucHVzaChvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyKSk7XG4gICAgICAgIHZhciBfbG9vcDQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHByb3h5ID0gX3RoaXMuYXJncztcbiAgICAgICAgICB2YXIgcHJvcGVydHkgPSBqO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eVNwbGl0ID0gai5zcGxpdCgnfCcpO1xuICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IGZhbHNlO1xuICAgICAgICAgIHZhciBsb25nUHJvcGVydHkgPSBqO1xuICAgICAgICAgIGlmIChwcm9wZXJ0eVNwbGl0Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyID0gX3RoaXMuc3RyaW5nVHJhbnNmb3JtZXIocHJvcGVydHlTcGxpdC5zbGljZSgxKSk7XG4gICAgICAgICAgICBwcm9wZXJ0eSA9IHByb3BlcnR5U3BsaXRbMF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwcm9wZXJ0eS5tYXRjaCgvXFwuLykpIHtcbiAgICAgICAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoX3RoaXMuYXJncywgcHJvcGVydHksIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbWF0Y2hpbmcgPSBbXTtcbiAgICAgICAgICB2YXIgYmluZFByb3BlcnR5ID0gajtcbiAgICAgICAgICB2YXIgbWF0Y2hpbmdTZWdtZW50cyA9IGJpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV07XG4gICAgICAgICAgX3RoaXMub25SZW1vdmUocHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyKSB7XG4gICAgICAgICAgICAgIHYgPSB0cmFuc2Zvcm1lcih2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIF9pIGluIGJpbmRQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgIGZvciAodmFyIF9qIGluIGJpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV0pIHtcbiAgICAgICAgICAgICAgICBzZWdtZW50c1tiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldW19qXV0gPSB0W19pXTtcbiAgICAgICAgICAgICAgICBpZiAoayA9PT0gcHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgIHNlZ21lbnRzW2JpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV1bX2pdXSA9IHY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV90aGlzLnBhdXNlZCkge1xuICAgICAgICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBzZWdtZW50cy5qb2luKCcnKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBfdGhpcy51bnBhdXNlQ2FsbGJhY2tzLnNldChhdHRyaWJ1dGUsICgpID0+IHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLm5hbWUsIHNlZ21lbnRzLmpvaW4oJycpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9O1xuICAgICAgICBmb3IgKHZhciBqIGluIGJpbmRQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgX2xvb3A0KCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZy5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChfbG9vcDMoKSkgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwUmVmVGFnKHRhZykge1xuICAgIHZhciByZWZBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtcmVmJyk7XG4gICAgdmFyIFtyZWZQcm9wLCByZWZDbGFzc25hbWUgPSBudWxsLCByZWZLZXkgPSBudWxsXSA9IHJlZkF0dHIuc3BsaXQoJzonKTtcbiAgICB2YXIgcmVmQ2xhc3MgPSBfVGFnLlRhZztcbiAgICBpZiAocmVmQ2xhc3NuYW1lKSB7XG4gICAgICByZWZDbGFzcyA9IHRoaXMuc3RyaW5nVG9DbGFzcyhyZWZDbGFzc25hbWUpO1xuICAgIH1cbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1yZWYnKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFnLCAnX19fdGFnX19fJywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgdGFnLl9fX3RhZ19fXyA9IG51bGw7XG4gICAgICB0YWcucmVtb3ZlKCk7XG4gICAgfSk7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgdmFyIGRpcmVjdCA9IHRoaXM7XG4gICAgaWYgKHRoaXMudmlld0xpc3QpIHtcbiAgICAgIHBhcmVudCA9IHRoaXMudmlld0xpc3QucGFyZW50O1xuICAgICAgLy8gaWYoIXRoaXMudmlld0xpc3QucGFyZW50LnRhZ3NbcmVmUHJvcF0pXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHRoaXMudmlld0xpc3QucGFyZW50LnRhZ3NbcmVmUHJvcF0gPSBbXTtcbiAgICAgIC8vIH1cblxuICAgICAgLy8gbGV0IHJlZktleVZhbCA9IHRoaXMuYXJnc1tyZWZLZXldO1xuXG4gICAgICAvLyB0aGlzLnZpZXdMaXN0LnBhcmVudC50YWdzW3JlZlByb3BdW3JlZktleVZhbF0gPSBuZXcgcmVmQ2xhc3MoXG4gICAgICAvLyBcdHRhZywgdGhpcywgcmVmUHJvcCwgcmVmS2V5VmFsXG4gICAgICAvLyApO1xuICAgIH1cbiAgICAvLyBlbHNlXG4gICAgLy8ge1xuICAgIC8vIFx0dGhpcy50YWdzW3JlZlByb3BdID0gbmV3IHJlZkNsYXNzKFxuICAgIC8vIFx0XHR0YWcsIHRoaXMsIHJlZlByb3BcbiAgICAvLyBcdCk7XG4gICAgLy8gfVxuXG4gICAgdmFyIHRhZ09iamVjdCA9IG5ldyByZWZDbGFzcyh0YWcsIHRoaXMsIHJlZlByb3AsIHVuZGVmaW5lZCwgZGlyZWN0KTtcbiAgICB0YWcuX19fdGFnX19fID0gdGFnT2JqZWN0O1xuICAgIHRoaXMudGFnc1tyZWZQcm9wXSA9IHRhZ09iamVjdDtcbiAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICB2YXIgcmVmS2V5VmFsID0gdGhpcy5hcmdzW3JlZktleV07XG4gICAgICBpZiAocmVmS2V5VmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKCFwYXJlbnQudGFnc1tyZWZQcm9wXSkge1xuICAgICAgICAgIHBhcmVudC50YWdzW3JlZlByb3BdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50LnRhZ3NbcmVmUHJvcF1bcmVmS2V5VmFsXSA9IHRhZ09iamVjdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudC50YWdzW3JlZlByb3BdID0gdGFnT2JqZWN0O1xuICAgICAgfVxuICAgICAgaWYgKCFwYXJlbnQucGFyZW50KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICB9XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBCaW5kVGFnKHRhZykge1xuICAgIHZhciBiaW5kQXJnID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtYmluZCcpO1xuICAgIHZhciBwcm94eSA9IHRoaXMuYXJncztcbiAgICB2YXIgcHJvcGVydHkgPSBiaW5kQXJnO1xuICAgIHZhciB0b3AgPSBudWxsO1xuICAgIGlmIChiaW5kQXJnLm1hdGNoKC9cXC4vKSkge1xuICAgICAgW3Byb3h5LCBwcm9wZXJ0eSwgdG9wXSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKHRoaXMuYXJncywgYmluZEFyZywgdHJ1ZSk7XG4gICAgfVxuICAgIGlmIChwcm94eSAhPT0gdGhpcy5hcmdzKSB7XG4gICAgICB0aGlzLnN1YkJpbmRpbmdzW2JpbmRBcmddID0gdGhpcy5zdWJCaW5kaW5nc1tiaW5kQXJnXSB8fCBbXTtcbiAgICAgIHRoaXMub25SZW1vdmUodGhpcy5hcmdzLmJpbmRUbyh0b3AsICgpID0+IHtcbiAgICAgICAgd2hpbGUgKHRoaXMuc3ViQmluZGluZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5zdWJCaW5kaW5ncy5zaGlmdCgpKCk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgdmFyIHVuc2FmZUh0bWwgPSBmYWxzZTtcbiAgICBpZiAocHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgIHByb3BlcnR5ID0gcHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgdW5zYWZlSHRtbCA9IHRydWU7XG4gICAgfVxuICAgIHZhciBhdXRvRXZlbnRTdGFydGVkID0gZmFsc2U7XG4gICAgdmFyIGRlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgIGlmICgocCBpbnN0YW5jZW9mIFZpZXcgfHwgcCBpbnN0YW5jZW9mIE5vZGUgfHwgcCBpbnN0YW5jZW9mIF9UYWcuVGFnKSAmJiBwICE9PSB2KSB7XG4gICAgICAgIHAucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICBpZiAoWydJTlBVVCcsICdTRUxFQ1QnLCAnVEVYVEFSRUEnXS5pbmNsdWRlcyh0YWcudGFnTmFtZSkpIHtcbiAgICAgICAgdmFyIF90eXBlID0gdGFnLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgICAgICBpZiAoX3R5cGUgJiYgX3R5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgIHRhZy5jaGVja2VkID0gISF2O1xuICAgICAgICB9IGVsc2UgaWYgKF90eXBlICYmIF90eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICB0YWcuY2hlY2tlZCA9IHYgPT0gdGFnLnZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKF90eXBlICE9PSAnZmlsZScpIHtcbiAgICAgICAgICBpZiAodGFnLnRhZ05hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0T3B0aW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZy5vcHRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvbiA9IHRhZy5vcHRpb25zW2ldO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb24udmFsdWUgPT0gdikge1xuICAgICAgICAgICAgICAgICAgdGFnLnNlbGVjdGVkSW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNlbGVjdE9wdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5ub2Rlc0F0dGFjaGVkLmFkZChzZWxlY3RPcHRpb24pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YWcudmFsdWUgPSB2ID09IG51bGwgPyAnJyA6IHY7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChhdXRvRXZlbnRTdGFydGVkKSB7XG4gICAgICAgICAgdGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkF1dG9DaGFuZ2VkJywge1xuICAgICAgICAgICAgYnViYmxlczogdHJ1ZVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICBhdXRvRXZlbnRTdGFydGVkID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh2IGluc3RhbmNlb2YgVmlldykge1xuICAgICAgICAgIGZvciAodmFyIG5vZGUgb2YgdGFnLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gdGhpcztcbiAgICAgICAgICB2LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgdGFnLmluc2VydCh2KTtcbiAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgICAgICB0YWcuYXBwZW5kKHYubm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodW5zYWZlSHRtbCkge1xuICAgICAgICAgIGlmICh0YWcuaW5uZXJIVE1MICE9PSB2KSB7XG4gICAgICAgICAgICB2ID0gU3RyaW5nKHYpO1xuICAgICAgICAgICAgaWYgKHRhZy5pbm5lckhUTUwgPT09IHYuc3Vic3RyaW5nKDAsIHRhZy5pbm5lckhUTUwubGVuZ3RoKSkge1xuICAgICAgICAgICAgICB0YWcuaW5uZXJIVE1MICs9IHYuc3Vic3RyaW5nKHRhZy5pbm5lckhUTUwubGVuZ3RoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvciAodmFyIF9ub2RlIG9mIHRhZy5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgX25vZGUucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdGFnLmlubmVySFRNTCA9IHY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfRG9tLkRvbS5tYXBUYWdzKHRhZywgZmFsc2UsIHQgPT4gdFtkb250UGFyc2VdID0gdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0YWcudGV4dENvbnRlbnQgIT09IHYpIHtcbiAgICAgICAgICAgIGZvciAodmFyIF9ub2RlMiBvZiB0YWcuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICBfbm9kZTIucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0YWcudGV4dENvbnRlbnQgPSB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChwcm94eSAhPT0gdGhpcy5hcmdzKSB7XG4gICAgICB0aGlzLnN1YkJpbmRpbmdzW2JpbmRBcmddLnB1c2goZGViaW5kKTtcbiAgICB9XG4gICAgdGhpcy5vblJlbW92ZShkZWJpbmQpO1xuICAgIHZhciB0eXBlID0gdGFnLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgIHZhciBtdWx0aSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ211bHRpcGxlJyk7XG4gICAgdmFyIGlucHV0TGlzdGVuZXIgPSBldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnQudGFyZ2V0ICE9PSB0YWcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGUgJiYgdHlwZS50b0xvd2VyQ2FzZSgpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgIGlmICh0YWcuY2hlY2tlZCkge1xuICAgICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcHJveHlbcHJvcGVydHldID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZXZlbnQudGFyZ2V0Lm1hdGNoZXMoJ1tjb250ZW50ZWRpdGFibGU9dHJ1ZV0nKSkge1xuICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBldmVudC50YXJnZXQuaW5uZXJIVE1MO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZmlsZScgJiYgbXVsdGkpIHtcbiAgICAgICAgdmFyIGZpbGVzID0gQXJyYXkuZnJvbShldmVudC50YXJnZXQuZmlsZXMpO1xuICAgICAgICB2YXIgY3VycmVudCA9IHByb3h5W3Byb3BlcnR5XSB8fCBfQmluZGFibGUuQmluZGFibGUub25EZWNrKHByb3h5LCBwcm9wZXJ0eSk7XG4gICAgICAgIGlmICghY3VycmVudCB8fCAhZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgcHJveHlbcHJvcGVydHldID0gZmlsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIF9sb29wNSA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgICBpZiAoZmlsZXNbaV0gIT09IGN1cnJlbnRbaV0pIHtcbiAgICAgICAgICAgICAgZmlsZXNbaV0udG9KU09OID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICBuYW1lOiBmaWxlW2ldLm5hbWUsXG4gICAgICAgICAgICAgICAgICBzaXplOiBmaWxlW2ldLnNpemUsXG4gICAgICAgICAgICAgICAgICB0eXBlOiBmaWxlW2ldLnR5cGUsXG4gICAgICAgICAgICAgICAgICBkYXRlOiBmaWxlW2ldLmxhc3RNb2RpZmllZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGN1cnJlbnRbaV0gPSBmaWxlc1tpXTtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7IC8vIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICBmb3IgKHZhciBpIGluIGZpbGVzKSB7XG4gICAgICAgICAgICBpZiAoX2xvb3A1KGkpKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2ZpbGUnICYmICFtdWx0aSAmJiBldmVudC50YXJnZXQuZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBfZmlsZSA9IGV2ZW50LnRhcmdldC5maWxlcy5pdGVtKDApO1xuICAgICAgICBfZmlsZS50b0pTT04gPSAoKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IF9maWxlLm5hbWUsXG4gICAgICAgICAgICBzaXplOiBfZmlsZS5zaXplLFxuICAgICAgICAgICAgdHlwZTogX2ZpbGUudHlwZSxcbiAgICAgICAgICAgIGRhdGU6IF9maWxlLmxhc3RNb2RpZmllZFxuICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IF9maWxlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJveHlbcHJvcGVydHldID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgfVxuICAgIH07XG4gICAgaWYgKHR5cGUgPT09ICdmaWxlJyB8fCB0eXBlID09PSAncmFkaW8nKSB7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ3ZhbHVlLWNoYW5nZWQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICB9XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICBpZiAodHlwZSA9PT0gJ2ZpbGUnIHx8IHR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2lucHV0JywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3ZhbHVlLWNoYW5nZWQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1iaW5kJyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBPblRhZyh0YWcpIHtcbiAgICB2YXIgcmVmZXJlbnRzID0gU3RyaW5nKHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LW9uJykpO1xuICAgIHJlZmVyZW50cy5zcGxpdCgnOycpLm1hcChhID0+IGEuc3BsaXQoJzonKSkuZm9yRWFjaChhID0+IHtcbiAgICAgIGEgPSBhLm1hcChhID0+IGEudHJpbSgpKTtcbiAgICAgIHZhciBhcmdMZW4gPSBhLmxlbmd0aDtcbiAgICAgIHZhciBldmVudE5hbWUgPSBTdHJpbmcoYS5zaGlmdCgpKS50cmltKCk7XG4gICAgICB2YXIgY2FsbGJhY2tOYW1lID0gU3RyaW5nKGEuc2hpZnQoKSB8fCBldmVudE5hbWUpLnRyaW0oKTtcbiAgICAgIHZhciBldmVudEZsYWdzID0gU3RyaW5nKGEuc2hpZnQoKSB8fCAnJykudHJpbSgpO1xuICAgICAgdmFyIGFyZ0xpc3QgPSBbXTtcbiAgICAgIHZhciBncm91cHMgPSAvKFxcdyspKD86XFwoKFskXFx3XFxzLSdcIixdKylcXCkpPy8uZXhlYyhjYWxsYmFja05hbWUpO1xuICAgICAgaWYgKGdyb3Vwcykge1xuICAgICAgICBjYWxsYmFja05hbWUgPSBncm91cHNbMV0ucmVwbGFjZSgvKF5bXFxzXFxuXSt8W1xcc1xcbl0rJCkvLCAnJyk7XG4gICAgICAgIGlmIChncm91cHNbMl0pIHtcbiAgICAgICAgICBhcmdMaXN0ID0gZ3JvdXBzWzJdLnNwbGl0KCcsJykubWFwKHMgPT4gcy50cmltKCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWFyZ0xpc3QubGVuZ3RoKSB7XG4gICAgICAgIGFyZ0xpc3QucHVzaCgnJGV2ZW50Jyk7XG4gICAgICB9XG4gICAgICBpZiAoIWV2ZW50TmFtZSB8fCBhcmdMZW4gPT09IDEpIHtcbiAgICAgICAgZXZlbnROYW1lID0gY2FsbGJhY2tOYW1lO1xuICAgICAgfVxuICAgICAgdmFyIGV2ZW50TGlzdGVuZXIgPSBldmVudCA9PiB7XG4gICAgICAgIHZhciBldmVudE1ldGhvZDtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBfbG9vcDYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29udHJvbGxlciA9IHBhcmVudC5jb250cm9sbGVyO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb250cm9sbGVyW2NhbGxiYWNrTmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgZXZlbnRNZXRob2QgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJbY2FsbGJhY2tOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGJyZWFrXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXJlbnRbY2FsbGJhY2tOYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICBldmVudE1ldGhvZCA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgcGFyZW50W2NhbGxiYWNrTmFtZV0oLi4uYXJncyk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIHJldHVybiAwOyAvLyBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHBhcmVudC5wYXJlbnQpIHtcbiAgICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiAwOyAvLyBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgX3JldDI7XG4gICAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgICBfcmV0MiA9IF9sb29wNigpO1xuICAgICAgICAgIGlmIChfcmV0MiA9PT0gMCkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFyZ1JlZnMgPSBhcmdMaXN0Lm1hcChhcmcgPT4ge1xuICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICBpZiAoTnVtYmVyKGFyZykgPT0gYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnZXZlbnQnIHx8IGFyZyA9PT0gJyRldmVudCcpIHtcbiAgICAgICAgICAgIHJldHVybiBldmVudDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyR2aWV3Jykge1xuICAgICAgICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyRjb250cm9sbGVyJykge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXI7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckdGFnJykge1xuICAgICAgICAgICAgcmV0dXJuIHRhZztcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyRwYXJlbnQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckc3VidmlldycpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnIGluIHRoaXMuYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXJnc1thcmddO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2ggPSAvXlsnXCJdKFtcXHctXSs/KVtcIiddJC8uZXhlYyhhcmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hbMV07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCEodHlwZW9mIGV2ZW50TWV0aG9kID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtjYWxsYmFja05hbWV9IGlzIG5vdCBkZWZpbmVkIG9uIFZpZXcgb2JqZWN0LmAgKyBcIlxcblwiICsgYFRhZzpgICsgXCJcXG5cIiArIGAke3RhZy5vdXRlckhUTUx9YCk7XG4gICAgICAgIH1cbiAgICAgICAgZXZlbnRNZXRob2QoLi4uYXJnUmVmcyk7XG4gICAgICB9O1xuICAgICAgdmFyIGV2ZW50T3B0aW9ucyA9IHt9O1xuICAgICAgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ3AnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMucGFzc2l2ZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ1AnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMucGFzc2l2ZSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ2MnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMuY2FwdHVyZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ0MnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMuY2FwdHVyZSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ28nKSkge1xuICAgICAgICBldmVudE9wdGlvbnMub25jZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ08nKSkge1xuICAgICAgICBldmVudE9wdGlvbnMub25jZSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgc3dpdGNoIChldmVudE5hbWUpIHtcbiAgICAgICAgY2FzZSAnX2luaXQnOlxuICAgICAgICAgIGV2ZW50TGlzdGVuZXIoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnX2F0dGFjaCc6XG4gICAgICAgICAgdGhpcy5ub2Rlc0F0dGFjaGVkLmFkZChldmVudExpc3RlbmVyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnX2RldGFjaCc6XG4gICAgICAgICAgdGhpcy5ub2Rlc0RldGFjaGVkLmFkZChldmVudExpc3RlbmVyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGV2ZW50TGlzdGVuZXIsIGV2ZW50T3B0aW9ucyk7XG4gICAgICAgICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGV2ZW50TGlzdGVuZXIsIGV2ZW50T3B0aW9ucyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICByZXR1cm4gW2V2ZW50TmFtZSwgY2FsbGJhY2tOYW1lLCBhcmdMaXN0XTtcbiAgICB9KTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1vbicpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwTGlua1RhZyh0YWcpIHtcbiAgICAvLyBjb25zdCB0YWdDb21waWxlciA9IHRoaXMuY29tcGlsZUxpbmtUYWcodGFnKTtcblxuICAgIC8vIGNvbnN0IG5ld1RhZyA9IHRhZ0NvbXBpbGVyKHRoaXMpO1xuXG4gICAgLy8gdGFnLnJlcGxhY2VXaXRoKG5ld1RhZyk7XG5cbiAgICAvLyByZXR1cm4gbmV3VGFnO1xuXG4gICAgdmFyIGxpbmtBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAgIHRhZy5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBsaW5rQXR0cik7XG4gICAgdmFyIGxpbmtDbGljayA9IGV2ZW50ID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAobGlua0F0dHIuc3Vic3RyaW5nKDAsIDQpID09PSAnaHR0cCcgfHwgbGlua0F0dHIuc3Vic3RyaW5nKDAsIDIpID09PSAnLy8nKSB7XG4gICAgICAgIGdsb2JhbFRoaXMub3Blbih0YWcuZ2V0QXR0cmlidXRlKCdocmVmJywgbGlua0F0dHIpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgX1JvdXRlci5Sb3V0ZXIuZ28odGFnLmdldEF0dHJpYnV0ZSgnaHJlZicpKTtcbiAgICB9O1xuICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGxpbmtDbGljayk7XG4gICAgdGhpcy5vblJlbW92ZSgoKHRhZywgZXZlbnRMaXN0ZW5lcikgPT4gKCkgPT4ge1xuICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZXZlbnRMaXN0ZW5lcik7XG4gICAgICB0YWcgPSB1bmRlZmluZWQ7XG4gICAgICBldmVudExpc3RlbmVyID0gdW5kZWZpbmVkO1xuICAgIH0pKHRhZywgbGlua0NsaWNrKSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBjb21waWxlTGlua1RhZyhzb3VyY2VUYWcpXG4gIC8vIHtcbiAgLy8gXHRjb25zdCBsaW5rQXR0ciA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgLy8gXHRzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1saW5rJyk7XG4gIC8vIFx0cmV0dXJuIChiaW5kaW5nVmlldykgPT4ge1xuICAvLyBcdFx0Y29uc3QgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSh0cnVlKTtcbiAgLy8gXHRcdHRhZy5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBsaW5rQXR0cik7XG4gIC8vIFx0XHRyZXR1cm4gdGFnO1xuICAvLyBcdH07XG4gIC8vIH1cblxuICBtYXBQcmVuZGVyZXJUYWcodGFnKSB7XG4gICAgdmFyIHByZXJlbmRlckF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1wcmVyZW5kZXInKTtcbiAgICB2YXIgcHJlcmVuZGVyaW5nID0gZ2xvYmFsVGhpcy5wcmVyZW5kZXJlciB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9wcmVyZW5kZXIvaSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtcHJlcmVuZGVyJyk7XG4gICAgaWYgKHByZXJlbmRlcmluZykge1xuICAgICAgZ2xvYmFsVGhpcy5wcmVyZW5kZXJlciA9IGdsb2JhbFRoaXMucHJlcmVuZGVyZXIgfHwgdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHByZXJlbmRlckF0dHIgPT09ICduZXZlcicgJiYgcHJlcmVuZGVyaW5nIHx8IHByZXJlbmRlckF0dHIgPT09ICdvbmx5JyAmJiAhcHJlcmVuZGVyaW5nKSB7XG4gICAgICB0aGlzLnBvc3RNYXBwaW5nLmFkZCgoKSA9PiB0YWcucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YWcpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBXaXRoVGFnKHRhZykge1xuICAgIHZhciBfdGhpczIgPSB0aGlzO1xuICAgIHZhciB3aXRoQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXdpdGgnKTtcbiAgICB2YXIgY2FycnlBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtY2FycnknKTtcbiAgICB2YXIgdmlld0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3Ytd2l0aCcpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWNhcnJ5Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSB2aWV3QXR0ciA/IHRoaXMuc3RyaW5nVG9DbGFzcyh2aWV3QXR0cikgOiBWaWV3O1xuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBjYXJyeVByb3BzID0gW107XG4gICAgaWYgKGNhcnJ5QXR0cikge1xuICAgICAgY2FycnlQcm9wcyA9IGNhcnJ5QXR0ci5zcGxpdCgnLCcpLm1hcChzID0+IHMudHJpbSgpKTtcbiAgICB9XG4gICAgdmFyIGRlYmluZCA9IHRoaXMuYXJncy5iaW5kVG8od2l0aEF0dHIsICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICBpZiAodGhpcy53aXRoVmlld3MuaGFzKHRhZykpIHtcbiAgICAgICAgdGhpcy53aXRoVmlld3MuZGVsZXRlKHRhZyk7XG4gICAgICB9XG4gICAgICB3aGlsZSAodGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGFnLnJlbW92ZUNoaWxkKHRhZy5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICAgIHZhciB2aWV3ID0gbmV3IHZpZXdDbGFzcyh7fSwgdGhpcyk7XG4gICAgICB0aGlzLm9uUmVtb3ZlKCh2aWV3ID0+ICgpID0+IHtcbiAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgIH0pKHZpZXcpKTtcbiAgICAgIHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgICAgIHZhciBfbG9vcDcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWJpbmQgPSBfdGhpczIuYXJncy5iaW5kVG8oY2FycnlQcm9wc1tpXSwgKHYsIGspID0+IHtcbiAgICAgICAgICB2aWV3LmFyZ3Nba10gPSB2O1xuICAgICAgICB9KTtcbiAgICAgICAgdmlldy5vblJlbW92ZShkZWJpbmQpO1xuICAgICAgICBfdGhpczIub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIGRlYmluZCgpO1xuICAgICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIGkgaW4gY2FycnlQcm9wcykge1xuICAgICAgICBfbG9vcDcoKTtcbiAgICAgIH1cbiAgICAgIHZhciBfbG9vcDggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uodik7XG4gICAgICAgIHZhciBkZWJpbmQgPSB2LmJpbmRUbyhfaTIsICh2diwga2ssIHR0LCBkZCkgPT4ge1xuICAgICAgICAgIGlmICghZGQpIHtcbiAgICAgICAgICAgIHZpZXcuYXJnc1tra10gPSB2djtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtrIGluIHZpZXcuYXJncykge1xuICAgICAgICAgICAgZGVsZXRlIHZpZXcuYXJnc1tra107XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRlYmluZFVwID0gdmlldy5hcmdzLmJpbmRUbyhfaTIsICh2diwga2ssIHR0LCBkZCkgPT4ge1xuICAgICAgICAgIGlmICghZGQpIHtcbiAgICAgICAgICAgIHZba2tdID0gdnY7XG4gICAgICAgICAgfSBlbHNlIGlmIChrayBpbiB2KSB7XG4gICAgICAgICAgICBkZWxldGUgdltra107XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMyLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBkZWJpbmQoKTtcbiAgICAgICAgICBpZiAoIXYuaXNCb3VuZCgpKSB7XG4gICAgICAgICAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh2KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZpZXcub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIGRlYmluZCgpO1xuICAgICAgICAgIGlmICghdi5pc0JvdW5kKCkpIHtcbiAgICAgICAgICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHYpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgX2kyIGluIHYpIHtcbiAgICAgICAgaWYgKF9sb29wOCgpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZpZXcucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgICB0aGlzLndpdGhWaWV3cy5zZXQodGFnLCB2aWV3KTtcbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIHRoaXMud2l0aFZpZXdzLmRlbGV0ZSh0YWcpO1xuICAgICAgZGViaW5kKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBWaWV3VGFnKHRhZykge1xuICAgIHZhciB2aWV3QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4udGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIHBhcnRzID0gdmlld0F0dHIuc3BsaXQoJzonKTtcbiAgICB2YXIgdmlld05hbWUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSBwYXJ0cy5sZW5ndGggPyB0aGlzLnN0cmluZ1RvQ2xhc3MocGFydHNbMF0pIDogVmlldztcbiAgICB2YXIgdmlldyA9IG5ldyB2aWV3Q2xhc3ModGhpcy5hcmdzLCB0aGlzKTtcbiAgICB0aGlzLnZpZXdzLnNldCh0YWcsIHZpZXcpO1xuICAgIHRoaXMudmlld3Muc2V0KHZpZXdOYW1lLCB2aWV3KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICB0aGlzLnZpZXdzLmRlbGV0ZSh0YWcpO1xuICAgICAgdGhpcy52aWV3cy5kZWxldGUodmlld05hbWUpO1xuICAgIH0pO1xuICAgIHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgICB2aWV3LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwRWFjaFRhZyh0YWcpIHtcbiAgICB2YXIgZWFjaEF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1lYWNoJyk7XG4gICAgdmFyIHZpZXdBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWVhY2gnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHZpZXdBdHRyID8gdGhpcy5zdHJpbmdUb0NsYXNzKHZpZXdBdHRyKSA6IFZpZXc7XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4udGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIFtlYWNoUHJvcCwgYXNQcm9wLCBrZXlQcm9wXSA9IGVhY2hBdHRyLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHByb3h5ID0gdGhpcy5hcmdzO1xuICAgIHZhciBwcm9wZXJ0eSA9IGVhY2hQcm9wO1xuICAgIGlmIChlYWNoUHJvcC5tYXRjaCgvXFwuLykpIHtcbiAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUodGhpcy5hcmdzLCBlYWNoUHJvcCwgdHJ1ZSk7XG4gICAgfVxuICAgIHZhciBkZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICBpZiAodiBpbnN0YW5jZW9mIF9CYWcuQmFnKSB7XG4gICAgICAgIHYgPSB2Lmxpc3Q7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy52aWV3TGlzdHMuaGFzKHRhZykpIHtcbiAgICAgICAgdGhpcy52aWV3TGlzdHMuZ2V0KHRhZykucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICB2YXIgdmlld0xpc3QgPSBuZXcgX1ZpZXdMaXN0LlZpZXdMaXN0KHN1YlRlbXBsYXRlLCBhc1Byb3AsIHYsIHRoaXMsIGtleVByb3AsIHZpZXdDbGFzcyk7XG4gICAgICB2YXIgdmlld0xpc3RSZW1vdmVyID0gKCkgPT4gdmlld0xpc3QucmVtb3ZlKCk7XG4gICAgICB0aGlzLm9uUmVtb3ZlKHZpZXdMaXN0UmVtb3Zlcik7XG4gICAgICB2aWV3TGlzdC5vblJlbW92ZSgoKSA9PiB0aGlzLl9vblJlbW92ZS5yZW1vdmUodmlld0xpc3RSZW1vdmVyKSk7XG4gICAgICB2YXIgZGViaW5kQSA9IHRoaXMuYXJncy5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgaWYgKGsgPT09ICdfaWQnKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZCkge1xuICAgICAgICAgIHZpZXdMaXN0LnN1YkFyZ3Nba10gPSB2O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChrIGluIHZpZXdMaXN0LnN1YkFyZ3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2aWV3TGlzdC5zdWJBcmdzW2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgZGViaW5kQiA9IHZpZXdMaXN0LmFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICAgIGlmIChrID09PSAnX2lkJyB8fCBrID09PSAndmFsdWUnIHx8IFN0cmluZyhrKS5zdWJzdHJpbmcoMCwgMykgPT09ICdfX18nKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZCkge1xuICAgICAgICAgIGlmIChrIGluIHRoaXMuYXJncykge1xuICAgICAgICAgICAgdGhpcy5hcmdzW2tdID0gdjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuYXJnc1trXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2aWV3TGlzdC5vblJlbW92ZShkZWJpbmRBKTtcbiAgICAgIHZpZXdMaXN0Lm9uUmVtb3ZlKGRlYmluZEIpO1xuICAgICAgdGhpcy5vblJlbW92ZShkZWJpbmRBKTtcbiAgICAgIHRoaXMub25SZW1vdmUoZGViaW5kQik7XG4gICAgICB3aGlsZSAodGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGFnLnJlbW92ZUNoaWxkKHRhZy5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudmlld0xpc3RzLnNldCh0YWcsIHZpZXdMaXN0KTtcbiAgICAgIHZpZXdMaXN0LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgICAgaWYgKHRhZy50YWdOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgICB2aWV3TGlzdC5yZVJlbmRlcigpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoZGViaW5kKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcElmVGFnKHRhZykge1xuICAgIHZhciBzb3VyY2VUYWcgPSB0YWc7XG4gICAgdmFyIHZpZXdQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgaWZQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWlmJyk7XG4gICAgdmFyIGlzUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1pcycpO1xuICAgIHZhciBpbnZlcnRlZCA9IGZhbHNlO1xuICAgIHZhciBkZWZpbmVkID0gZmFsc2U7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWlmJyk7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtaXMnKTtcbiAgICB2YXIgdmlld0NsYXNzID0gdmlld1Byb3BlcnR5ID8gdGhpcy5zdHJpbmdUb0NsYXNzKHZpZXdQcm9wZXJ0eSkgOiBWaWV3O1xuICAgIGlmIChpZlByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyEnKSB7XG4gICAgICBpZlByb3BlcnR5ID0gaWZQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICBpbnZlcnRlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChpZlByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJz8nKSB7XG4gICAgICBpZlByb3BlcnR5ID0gaWZQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICBkZWZpbmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4uc291cmNlVGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIGJpbmRpbmdWaWV3ID0gdGhpcztcbiAgICB2YXIgaWZEb2MgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgLy8gbGV0IHZpZXcgPSBuZXcgdmlld0NsYXNzKE9iamVjdC5hc3NpZ24oe30sIHRoaXMuYXJncyksIGJpbmRpbmdWaWV3KTtcbiAgICB2YXIgdmlldyA9IG5ldyB2aWV3Q2xhc3ModGhpcy5hcmdzLCBiaW5kaW5nVmlldyk7XG4gICAgdmlldy50YWdzLmJpbmRUbygodiwgaykgPT4gdGhpcy50YWdzW2tdID0gdiwge1xuICAgICAgcmVtb3ZlV2l0aDogdGhpc1xuICAgIH0pO1xuICAgIHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgICB2YXIgcHJveHkgPSBiaW5kaW5nVmlldy5hcmdzO1xuICAgIHZhciBwcm9wZXJ0eSA9IGlmUHJvcGVydHk7XG4gICAgaWYgKGlmUHJvcGVydHkubWF0Y2goL1xcLi8pKSB7XG4gICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKGJpbmRpbmdWaWV3LmFyZ3MsIGlmUHJvcGVydHksIHRydWUpO1xuICAgIH1cbiAgICB2aWV3LnJlbmRlcihpZkRvYywgbnVsbCwgdGhpcyk7XG4gICAgdmFyIHByb3BlcnR5RGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaykgPT4ge1xuICAgICAgdmFyIG8gPSB2O1xuICAgICAgaWYgKGRlZmluZWQpIHtcbiAgICAgICAgdiA9IHYgIT09IG51bGwgJiYgdiAhPT0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgaWYgKHYgaW5zdGFuY2VvZiBfQmFnLkJhZykge1xuICAgICAgICB2ID0gdi5saXN0O1xuICAgICAgfVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodikpIHtcbiAgICAgICAgdiA9ICEhdi5sZW5ndGg7XG4gICAgICB9XG4gICAgICBpZiAoaXNQcm9wZXJ0eSAhPT0gbnVsbCkge1xuICAgICAgICB2ID0gbyA9PSBpc1Byb3BlcnR5O1xuICAgICAgfVxuICAgICAgaWYgKGludmVydGVkKSB7XG4gICAgICAgIHYgPSAhdjtcbiAgICAgIH1cbiAgICAgIGlmICh2KSB7XG4gICAgICAgIHRhZy5hcHBlbmRDaGlsZChpZkRvYyk7XG4gICAgICAgIFsuLi5pZkRvYy5jaGlsZE5vZGVzXS5mb3JFYWNoKG5vZGUgPT4gX0RvbS5Eb20ubWFwVGFncyhub2RlLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICAgICAgaWYgKCF0YWcubWF0Y2hlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tQXR0YWNoZWQnLCB7XG4gICAgICAgICAgICB0YXJnZXQ6IHRhZyxcbiAgICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3Lm5vZGVzLmZvckVhY2gobiA9PiBpZkRvYy5hcHBlbmRDaGlsZChuKSk7XG4gICAgICAgIF9Eb20uRG9tLm1hcFRhZ3MoaWZEb2MsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgICAgICBpZiAoIXRhZy5tYXRjaGVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ldyBDdXN0b21FdmVudCgnY3ZEb21EZXRhY2hlZCcsIHtcbiAgICAgICAgICAgIHRhcmdldDogdGFnLFxuICAgICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAgY2hpbGRyZW46IEFycmF5LmlzQXJyYXkocHJveHlbcHJvcGVydHldKVxuICAgIH0pO1xuXG4gICAgLy8gY29uc3QgcHJvcGVydHlEZWJpbmQgPSB0aGlzLmFyZ3MuYmluZENoYWluKHByb3BlcnR5LCBvblVwZGF0ZSk7XG5cbiAgICBiaW5kaW5nVmlldy5vblJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG5cbiAgICAvLyBjb25zdCBkZWJpbmRBID0gdGhpcy5hcmdzLmJpbmRUbygodixrLHQsZCkgPT4ge1xuICAgIC8vIFx0aWYoayA9PT0gJ19pZCcpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdHJldHVybjtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0aWYoIWQpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdHZpZXcuYXJnc1trXSA9IHY7XG4gICAgLy8gXHR9XG4gICAgLy8gXHRlbHNlIGlmKGsgaW4gdmlldy5hcmdzKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRkZWxldGUgdmlldy5hcmdzW2tdO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gfSk7XG5cbiAgICAvLyBjb25zdCBkZWJpbmRCID0gdmlldy5hcmdzLmJpbmRUbygodixrLHQsZCxwKSA9PiB7XG4gICAgLy8gXHRpZihrID09PSAnX2lkJyB8fCBTdHJpbmcoaykuc3Vic3RyaW5nKDAsMykgPT09ICdfX18nKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRyZXR1cm47XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGlmKGsgaW4gdGhpcy5hcmdzKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRpZighZClcbiAgICAvLyBcdFx0e1xuICAgIC8vIFx0XHRcdHRoaXMuYXJnc1trXSA9IHY7XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdFx0ZWxzZVxuICAgIC8vIFx0XHR7XG4gICAgLy8gXHRcdFx0ZGVsZXRlIHRoaXMuYXJnc1trXTtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0fVxuICAgIC8vIH0pO1xuXG4gICAgdmFyIHZpZXdEZWJpbmQgPSAoKSA9PiB7XG4gICAgICBwcm9wZXJ0eURlYmluZCgpO1xuICAgICAgLy8gZGViaW5kQSgpO1xuICAgICAgLy8gZGViaW5kQigpO1xuICAgICAgYmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG4gICAgICAvLyBiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKGJpbmRhYmxlRGViaW5kKTtcbiAgICB9O1xuICAgIGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHZpZXdEZWJpbmQpO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgLy8gZGViaW5kQSgpO1xuICAgICAgLy8gZGViaW5kQigpO1xuICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgIGlmIChiaW5kaW5nVmlldyAhPT0gdGhpcykge1xuICAgICAgICBiaW5kaW5nVmlldy5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gY29tcGlsZUlmVGFnKHNvdXJjZVRhZylcbiAgLy8ge1xuICAvLyBcdGxldCBpZlByb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtaWYnKTtcbiAgLy8gXHRsZXQgaW52ZXJ0ZWQgICA9IGZhbHNlO1xuXG4gIC8vIFx0c291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtaWYnKTtcblxuICAvLyBcdGlmKGlmUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnIScpXG4gIC8vIFx0e1xuICAvLyBcdFx0aWZQcm9wZXJ0eSA9IGlmUHJvcGVydHkuc3Vic3RyKDEpO1xuICAvLyBcdFx0aW52ZXJ0ZWQgICA9IHRydWU7XG4gIC8vIFx0fVxuXG4gIC8vIFx0Y29uc3Qgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudDtcblxuICAvLyBcdFsuLi5zb3VyY2VUYWcuY2hpbGROb2Rlc10uZm9yRWFjaChcbiAgLy8gXHRcdG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobi5jbG9uZU5vZGUodHJ1ZSkpXG4gIC8vIFx0KTtcblxuICAvLyBcdHJldHVybiAoYmluZGluZ1ZpZXcpID0+IHtcblxuICAvLyBcdFx0Y29uc3QgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSgpO1xuXG4gIC8vIFx0XHRjb25zdCBpZkRvYyA9IG5ldyBEb2N1bWVudEZyYWdtZW50O1xuXG4gIC8vIFx0XHRsZXQgdmlldyA9IG5ldyBWaWV3KHt9LCBiaW5kaW5nVmlldyk7XG5cbiAgLy8gXHRcdHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgLy8gXHRcdC8vIHZpZXcucGFyZW50ICAgPSBiaW5kaW5nVmlldztcblxuICAvLyBcdFx0YmluZGluZ1ZpZXcuc3luY0JpbmQodmlldyk7XG5cbiAgLy8gXHRcdGxldCBwcm94eSAgICA9IGJpbmRpbmdWaWV3LmFyZ3M7XG4gIC8vIFx0XHRsZXQgcHJvcGVydHkgPSBpZlByb3BlcnR5O1xuXG4gIC8vIFx0XHRpZihpZlByb3BlcnR5Lm1hdGNoKC9cXC4vKSlcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0W3Byb3h5LCBwcm9wZXJ0eV0gPSBCaW5kYWJsZS5yZXNvbHZlKFxuICAvLyBcdFx0XHRcdGJpbmRpbmdWaWV3LmFyZ3NcbiAgLy8gXHRcdFx0XHQsIGlmUHJvcGVydHlcbiAgLy8gXHRcdFx0XHQsIHRydWVcbiAgLy8gXHRcdFx0KTtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0bGV0IGhhc1JlbmRlcmVkID0gZmFsc2U7XG5cbiAgLy8gXHRcdGNvbnN0IHByb3BlcnR5RGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodixrKSA9PiB7XG5cbiAgLy8gXHRcdFx0aWYoIWhhc1JlbmRlcmVkKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0Y29uc3QgcmVuZGVyRG9jID0gKGJpbmRpbmdWaWV3LmFyZ3NbcHJvcGVydHldIHx8IGludmVydGVkKVxuICAvLyBcdFx0XHRcdFx0PyB0YWcgOiBpZkRvYztcblxuICAvLyBcdFx0XHRcdHZpZXcucmVuZGVyKHJlbmRlckRvYyk7XG5cbiAgLy8gXHRcdFx0XHRoYXNSZW5kZXJlZCA9IHRydWU7XG5cbiAgLy8gXHRcdFx0XHRyZXR1cm47XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRpZihBcnJheS5pc0FycmF5KHYpKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0diA9ICEhdi5sZW5ndGg7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRpZihpbnZlcnRlZClcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHYgPSAhdjtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGlmKHYpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR0YWcuYXBwZW5kQ2hpbGQoaWZEb2MpO1xuICAvLyBcdFx0XHR9XG4gIC8vIFx0XHRcdGVsc2VcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHZpZXcubm9kZXMuZm9yRWFjaChuPT5pZkRvYy5hcHBlbmRDaGlsZChuKSk7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0fSk7XG5cbiAgLy8gXHRcdC8vIGxldCBjbGVhbmVyID0gYmluZGluZ1ZpZXc7XG5cbiAgLy8gXHRcdC8vIHdoaWxlKGNsZWFuZXIucGFyZW50KVxuICAvLyBcdFx0Ly8ge1xuICAvLyBcdFx0Ly8gXHRjbGVhbmVyID0gY2xlYW5lci5wYXJlbnQ7XG4gIC8vIFx0XHQvLyB9XG5cbiAgLy8gXHRcdGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcblxuICAvLyBcdFx0bGV0IGJpbmRhYmxlRGViaW5kID0gKCkgPT4ge1xuXG4gIC8vIFx0XHRcdGlmKCFwcm94eS5pc0JvdW5kKCkpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKHByb3h5KTtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHR9O1xuXG4gIC8vIFx0XHRsZXQgdmlld0RlYmluZCA9ICgpPT57XG4gIC8vIFx0XHRcdHByb3BlcnR5RGViaW5kKCk7XG4gIC8vIFx0XHRcdGJpbmRhYmxlRGViaW5kKCk7XG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKGJpbmRhYmxlRGViaW5kKTtcbiAgLy8gXHRcdH07XG5cbiAgLy8gXHRcdHZpZXcub25SZW1vdmUodmlld0RlYmluZCk7XG5cbiAgLy8gXHRcdHJldHVybiB0YWc7XG4gIC8vIFx0fTtcbiAgLy8gfVxuXG4gIG1hcFRlbXBsYXRlVGFnKHRhZykge1xuICAgIC8vIGNvbnN0IHRlbXBsYXRlTmFtZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG5cbiAgICAvLyB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuXG4gICAgLy8gdGhpcy50ZW1wbGF0ZXNbIHRlbXBsYXRlTmFtZSBdID0gdGFnLnRhZ05hbWUgPT09ICdURU1QTEFURSdcbiAgICAvLyBcdD8gdGFnLmNsb25lTm9kZSh0cnVlKS5jb250ZW50XG4gICAgLy8gXHQ6IG5ldyBEb2N1bWVudEZyYWdtZW50KHRhZy5pbm5lckhUTUwpO1xuXG4gICAgdmFyIHRlbXBsYXRlTmFtZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcbiAgICB2YXIgc291cmNlID0gdGFnLmlubmVySFRNTDtcbiAgICBpZiAoIVZpZXcudGVtcGxhdGVzLmhhcyhzb3VyY2UpKSB7XG4gICAgICBWaWV3LnRlbXBsYXRlcy5zZXQoc291cmNlLCBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCh0YWcuaW5uZXJIVE1MKSk7XG4gICAgfVxuICAgIHRoaXMudGVtcGxhdGVzW3RlbXBsYXRlTmFtZV0gPSBWaWV3LnRlbXBsYXRlcy5nZXQoc291cmNlKTtcbiAgICB0aGlzLnBvc3RNYXBwaW5nLmFkZCgoKSA9PiB0YWcucmVtb3ZlKCkpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwU2xvdFRhZyh0YWcpIHtcbiAgICB2YXIgdGVtcGxhdGVOYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnY3Ytc2xvdCcpO1xuICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGVzW3RlbXBsYXRlTmFtZV07XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgIHRlbXBsYXRlID0gcGFyZW50LnRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdO1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgfVxuICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBUZW1wbGF0ZSAke3RlbXBsYXRlTmFtZX0gbm90IGZvdW5kLmApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXNsb3QnKTtcbiAgICB3aGlsZSAodGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRhZy5maXJzdENoaWxkLnJlbW92ZSgpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHRlbXBsYXRlID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKCFWaWV3LnRlbXBsYXRlcy5oYXModGVtcGxhdGUpKSB7XG4gICAgICAgIFZpZXcudGVtcGxhdGVzLnNldCh0ZW1wbGF0ZSwgZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQodGVtcGxhdGUpKTtcbiAgICAgIH1cbiAgICAgIHRlbXBsYXRlID0gVmlldy50ZW1wbGF0ZXMuZ2V0KHRlbXBsYXRlKTtcbiAgICB9XG4gICAgdGFnLmFwcGVuZENoaWxkKHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIHN5bmNCaW5kKHN1YlZpZXcpXG4gIC8vIHtcbiAgLy8gXHRsZXQgZGViaW5kQSA9IHRoaXMuYXJncy5iaW5kVG8oKHYsayx0LGQpPT57XG4gIC8vIFx0XHRpZihrID09PSAnX2lkJylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0cmV0dXJuO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihzdWJWaWV3LmFyZ3Nba10gIT09IHYpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHN1YlZpZXcuYXJnc1trXSA9IHY7XG4gIC8vIFx0XHR9XG4gIC8vIFx0fSk7XG5cbiAgLy8gXHRsZXQgZGViaW5kQiA9IHN1YlZpZXcuYXJncy5iaW5kVG8oKHYsayx0LGQscCk9PntcblxuICAvLyBcdFx0aWYoayA9PT0gJ19pZCcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHJldHVybjtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0bGV0IG5ld1JlZiA9IHY7XG4gIC8vIFx0XHRsZXQgb2xkUmVmID0gcDtcblxuICAvLyBcdFx0aWYobmV3UmVmIGluc3RhbmNlb2YgVmlldylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0bmV3UmVmID0gbmV3UmVmLl9fX3JlZl9fXztcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYob2xkUmVmIGluc3RhbmNlb2YgVmlldylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0b2xkUmVmID0gb2xkUmVmLl9fX3JlZl9fXztcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYobmV3UmVmICE9PSBvbGRSZWYgJiYgb2xkUmVmIGluc3RhbmNlb2YgVmlldylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0cC5yZW1vdmUoKTtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYoayBpbiB0aGlzLmFyZ3MpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHRoaXMuYXJnc1trXSA9IHY7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHR9KTtcblxuICAvLyBcdHRoaXMub25SZW1vdmUoZGViaW5kQSk7XG4gIC8vIFx0dGhpcy5vblJlbW92ZShkZWJpbmRCKTtcblxuICAvLyBcdHN1YlZpZXcub25SZW1vdmUoKCk9PntcbiAgLy8gXHRcdHRoaXMuX29uUmVtb3ZlLnJlbW92ZShkZWJpbmRBKTtcbiAgLy8gXHRcdHRoaXMuX29uUmVtb3ZlLnJlbW92ZShkZWJpbmRCKTtcbiAgLy8gXHR9KTtcbiAgLy8gfVxuXG4gIHBvc3RSZW5kZXIocGFyZW50Tm9kZSkge31cbiAgYXR0YWNoZWQocGFyZW50Tm9kZSkge31cbiAgaW50ZXJwb2xhdGFibGUoc3RyKSB7XG4gICAgcmV0dXJuICEhU3RyaW5nKHN0cikubWF0Y2godGhpcy5pbnRlcnBvbGF0ZVJlZ2V4KTtcbiAgfVxuICBzdGF0aWMgdXVpZCgpIHtcbiAgICByZXR1cm4gbmV3IF9VdWlkLlV1aWQoKTtcbiAgfVxuICByZW1vdmUobm93ID0gZmFsc2UpIHtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92ZScsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICB2aWV3OiB0aGlzXG4gICAgICB9LFxuICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgIH0pKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZlciA9ICgpID0+IHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy50YWdzKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMudGFnc1tpXSkpIHtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0gJiYgdGhpcy50YWdzW2ldLmZvckVhY2godCA9PiB0LnJlbW92ZSgpKTtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0uc3BsaWNlKDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudGFnc1tpXSAmJiB0aGlzLnRhZ3NbaV0ucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy50YWdzW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaTMgaW4gdGhpcy5ub2Rlcykge1xuICAgICAgICB0aGlzLm5vZGVzW19pM10gJiYgdGhpcy5ub2Rlc1tfaTNdLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjdkRvbURldGFjaGVkJykpO1xuICAgICAgICB0aGlzLm5vZGVzW19pM10gJiYgdGhpcy5ub2Rlc1tfaTNdLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLm5vZGVzW19pM10gPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICB0aGlzLm5vZGVzLnNwbGljZSgwKTtcbiAgICAgIHRoaXMuZmlyc3ROb2RlID0gdGhpcy5sYXN0Tm9kZSA9IHVuZGVmaW5lZDtcbiAgICB9O1xuICAgIGlmIChub3cpIHtcbiAgICAgIHJlbW92ZXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbW92ZXIpO1xuICAgIH1cbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fb25SZW1vdmUuaXRlbXMoKTtcbiAgICBmb3IgKHZhciBjYWxsYmFjayBvZiBjYWxsYmFja3MpIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB0aGlzLl9vblJlbW92ZS5yZW1vdmUoY2FsbGJhY2spO1xuICAgIH1cbiAgICBmb3IgKHZhciBjbGVhbnVwIG9mIHRoaXMuY2xlYW51cCkge1xuICAgICAgY2xlYW51cCAmJiBjbGVhbnVwKCk7XG4gICAgfVxuICAgIHRoaXMuY2xlYW51cC5sZW5ndGggPSAwO1xuICAgIGZvciAodmFyIFt0YWcsIHZpZXdMaXN0XSBvZiB0aGlzLnZpZXdMaXN0cykge1xuICAgICAgdmlld0xpc3QucmVtb3ZlKCk7XG4gICAgfVxuICAgIHRoaXMudmlld0xpc3RzLmNsZWFyKCk7XG4gICAgZm9yICh2YXIgW19jYWxsYmFjazUsIHRpbWVvdXRdIG9mIHRoaXMudGltZW91dHMpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dC50aW1lb3V0KTtcbiAgICB9XG4gICAgZm9yICh2YXIgaW50ZXJ2YWwgb2YgdGhpcy5pbnRlcnZhbHMpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgIH1cbiAgICB0aGlzLmludGVydmFscy5sZW5ndGggPSAwO1xuICAgIGZvciAodmFyIGZyYW1lIG9mIHRoaXMuZnJhbWVzKSB7XG4gICAgICBmcmFtZSgpO1xuICAgIH1cbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSAwO1xuICAgIHRoaXMucHJlUnVsZVNldC5wdXJnZSgpO1xuICAgIHRoaXMucnVsZVNldC5wdXJnZSgpO1xuICAgIHRoaXMucmVtb3ZlZCA9IHRydWU7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVtb3ZlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICB2aWV3OiB0aGlzXG4gICAgICB9LFxuICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgIH0pKTtcbiAgfVxuICBmaW5kVGFnKHNlbGVjdG9yKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLm5vZGVzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdm9pZCAwO1xuICAgICAgaWYgKCF0aGlzLm5vZGVzW2ldLnF1ZXJ5U2VsZWN0b3IpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5ub2Rlc1tpXS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IF9UYWcuVGFnKHRoaXMubm9kZXNbaV0sIHRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgPSB0aGlzLm5vZGVzW2ldLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBuZXcgX1RhZy5UYWcocmVzdWx0LCB0aGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGZpbmRUYWdzKHNlbGVjdG9yKSB7XG4gICAgdmFyIHRvcExldmVsID0gdGhpcy5ub2Rlcy5maWx0ZXIobiA9PiBuLm1hdGNoZXMgJiYgbi5tYXRjaGVzKHNlbGVjdG9yKSk7XG4gICAgdmFyIHN1YkxldmVsID0gdGhpcy5ub2Rlcy5maWx0ZXIobiA9PiBuLnF1ZXJ5U2VsZWN0b3JBbGwpLm1hcChuID0+IFsuLi5uLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpXSkuZmxhdCgpLm1hcChuID0+IG5ldyBfVGFnLlRhZyhuLCB0aGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcykpIHx8IFtdO1xuICAgIHJldHVybiB0b3BMZXZlbC5jb25jYXQoc3ViTGV2ZWwpO1xuICB9XG4gIG9uUmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgaWYgKGNhbGxiYWNrIGluc3RhbmNlb2YgRXZlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fb25SZW1vdmUuYWRkKGNhbGxiYWNrKTtcbiAgfVxuICB1cGRhdGUoKSB7fVxuICBiZWZvcmVVcGRhdGUoYXJncykge31cbiAgYWZ0ZXJVcGRhdGUoYXJncykge31cbiAgc3RyaW5nVHJhbnNmb3JtZXIobWV0aG9kcykge1xuICAgIHJldHVybiB4ID0+IHtcbiAgICAgIGZvciAodmFyIG0gaW4gbWV0aG9kcykge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIG1ldGhvZCA9IG1ldGhvZHNbbV07XG4gICAgICAgIHdoaWxlIChwYXJlbnQgJiYgIXBhcmVudFttZXRob2RdKSB7XG4gICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB4ID0gcGFyZW50W21ldGhvZHNbbV1dKHgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHg7XG4gICAgfTtcbiAgfVxuICBzdHJpbmdUb0NsYXNzKHJlZkNsYXNzbmFtZSkge1xuICAgIGlmIChWaWV3LnJlZkNsYXNzZXMuaGFzKHJlZkNsYXNzbmFtZSkpIHtcbiAgICAgIHJldHVybiBWaWV3LnJlZkNsYXNzZXMuZ2V0KHJlZkNsYXNzbmFtZSk7XG4gICAgfVxuICAgIHZhciByZWZDbGFzc1NwbGl0ID0gcmVmQ2xhc3NuYW1lLnNwbGl0KCcvJyk7XG4gICAgdmFyIHJlZlNob3J0Q2xhc3MgPSByZWZDbGFzc1NwbGl0W3JlZkNsYXNzU3BsaXQubGVuZ3RoIC0gMV07XG4gICAgdmFyIHJlZkNsYXNzID0gcmVxdWlyZShyZWZDbGFzc25hbWUpO1xuICAgIFZpZXcucmVmQ2xhc3Nlcy5zZXQocmVmQ2xhc3NuYW1lLCByZWZDbGFzc1tyZWZTaG9ydENsYXNzXSk7XG4gICAgcmV0dXJuIHJlZkNsYXNzW3JlZlNob3J0Q2xhc3NdO1xuICB9XG4gIHByZXZlbnRQYXJzaW5nKG5vZGUpIHtcbiAgICBub2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICB9XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLm5vZGVzLm1hcChuID0+IG4ub3V0ZXJIVE1MKS5qb2luKCcgJyk7XG4gIH1cbiAgbGlzdGVuKG5vZGUsIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBvcHRpb25zID0gY2FsbGJhY2s7XG4gICAgICBjYWxsYmFjayA9IGV2ZW50TmFtZTtcbiAgICAgIGV2ZW50TmFtZSA9IG5vZGU7XG4gICAgICBub2RlID0gdGhpcztcbiAgICB9XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0ZW4obm9kZS5ub2RlcywgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5tYXAobiA9PiB0aGlzLmxpc3RlbihuLCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSk7XG4gICAgICAvLyAuZm9yRWFjaChyID0+IHIoKSk7XG4gICAgfVxuICAgIGlmIChub2RlIGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpc3Rlbihub2RlLmVsZW1lbnQsIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIH1cbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgdmFyIHJlbW92ZSA9ICgpID0+IG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB2YXIgcmVtb3ZlciA9ICgpID0+IHtcbiAgICAgIHJlbW92ZSgpO1xuICAgICAgcmVtb3ZlID0gKCkgPT4ge307XG4gICAgfTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHJlbW92ZXIoKSk7XG4gICAgcmV0dXJuIHJlbW92ZXI7XG4gIH1cbiAgZGV0YWNoKCkge1xuICAgIGZvciAodmFyIG4gaW4gdGhpcy5ub2Rlcykge1xuICAgICAgdGhpcy5ub2Rlc1tuXS5yZW1vdmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9kZXM7XG4gIH1cbn1cbmV4cG9ydHMuVmlldyA9IFZpZXc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVmlldywgJ3RlbXBsYXRlcycsIHtcbiAgdmFsdWU6IG5ldyBNYXAoKVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVmlldywgJ3JlZkNsYXNzZXMnLCB7XG4gIHZhbHVlOiBuZXcgTWFwKClcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlZpZXdMaXN0ID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIF9TZXRNYXAgPSByZXF1aXJlKFwiLi9TZXRNYXBcIik7XG52YXIgX0JhZyA9IHJlcXVpcmUoXCIuL0JhZ1wiKTtcbmNsYXNzIFZpZXdMaXN0IHtcbiAgY29uc3RydWN0b3IodGVtcGxhdGUsIHN1YlByb3BlcnR5LCBsaXN0LCBwYXJlbnQsIGtleVByb3BlcnR5ID0gbnVsbCwgdmlld0NsYXNzID0gbnVsbCkge1xuICAgIHRoaXMucmVtb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuYXJncyA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgdGhpcy5hcmdzLnZhbHVlID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShsaXN0IHx8IE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgIHRoaXMuc3ViQXJncyA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgdGhpcy52aWV3cyA9IFtdO1xuICAgIHRoaXMuY2xlYW51cCA9IFtdO1xuICAgIHRoaXMudmlld0NsYXNzID0gdmlld0NsYXNzO1xuICAgIHRoaXMuX29uUmVtb3ZlID0gbmV3IF9CYWcuQmFnKCk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHRoaXMuc3ViUHJvcGVydHkgPSBzdWJQcm9wZXJ0eTtcbiAgICB0aGlzLmtleVByb3BlcnR5ID0ga2V5UHJvcGVydHk7XG4gICAgdGhpcy50YWcgPSBudWxsO1xuICAgIHRoaXMuZG93bkRlYmluZCA9IFtdO1xuICAgIHRoaXMudXBEZWJpbmQgPSBbXTtcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMudmlld0NvdW50ID0gMDtcbiAgICB0aGlzLnJlbmRlcmVkID0gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KSA9PiB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbmRlckNvbXBsZXRlJywge1xuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgdmFsdWU6IGFjY2VwdFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy53aWxsUmVSZW5kZXIgPSBmYWxzZTtcbiAgICB0aGlzLmFyZ3MuX19fYmVmb3JlKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICBpZiAoZSA9PSAnYmluZFRvJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLnBhdXNlZCA9IHRydWU7XG4gICAgfSk7XG4gICAgdGhpcy5hcmdzLl9fX2FmdGVyKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICBpZiAoZSA9PSAnYmluZFRvJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLnBhdXNlZCA9IHMubGVuZ3RoID4gMTtcbiAgICAgIHRoaXMucmVSZW5kZXIoKTtcbiAgICB9KTtcbiAgICB2YXIgZGViaW5kID0gdGhpcy5hcmdzLnZhbHVlLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBrayA9IGs7XG4gICAgICBpZiAodHlwZW9mIGsgPT09ICdzeW1ib2wnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChpc05hTihrKSkge1xuICAgICAgICBrayA9ICdfJyArIGs7XG4gICAgICB9XG4gICAgICBpZiAoZCkge1xuICAgICAgICBpZiAodGhpcy52aWV3c1tra10pIHtcbiAgICAgICAgICB0aGlzLnZpZXdzW2trXS5yZW1vdmUodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHRoaXMudmlld3Nba2tdO1xuICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgICAgICBpZiAoIXRoaXMudmlld3NbaV0pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNOYU4oaSkpIHtcbiAgICAgICAgICAgIHRoaXMudmlld3NbaV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IGkuc3Vic3RyKDEpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudmlld3NbaV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IGk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMudmlld3Nba2tdKSB7XG4gICAgICAgIGlmICghdGhpcy52aWV3Q291bnQpIHtcbiAgICAgICAgICB0aGlzLnJlUmVuZGVyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRoaXMud2lsbFJlUmVuZGVyID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy53aWxsUmVSZW5kZXIgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICAgICAgICB0aGlzLndpbGxSZVJlbmRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICB0aGlzLnJlUmVuZGVyKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpcy52aWV3c1tra10gJiYgdGhpcy52aWV3c1tra10uYXJncykge1xuICAgICAgICB0aGlzLnZpZXdzW2trXS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gaztcbiAgICAgICAgdGhpcy52aWV3c1tra10uYXJnc1t0aGlzLnN1YlByb3BlcnR5XSA9IHY7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAgd2FpdDogMFxuICAgIH0pO1xuICAgIHRoaXMuX29uUmVtb3ZlLmFkZChkZWJpbmQpO1xuICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyh0aGlzKTtcbiAgfVxuICByZW5kZXIodGFnKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgcmVuZGVycyA9IFtdO1xuICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uICh2aWV3KSB7XG4gICAgICB2aWV3LnZpZXdMaXN0ID0gX3RoaXM7XG4gICAgICB2aWV3LnJlbmRlcih0YWcsIG51bGwsIF90aGlzLnBhcmVudCk7XG4gICAgICByZW5kZXJzLnB1c2godmlldy5yZW5kZXJlZC50aGVuKCgpID0+IHZpZXcpKTtcbiAgICB9O1xuICAgIGZvciAodmFyIHZpZXcgb2YgdGhpcy52aWV3cykge1xuICAgICAgX2xvb3Aodmlldyk7XG4gICAgfVxuICAgIHRoaXMudGFnID0gdGFnO1xuICAgIFByb21pc2UuYWxsKHJlbmRlcnMpLnRoZW4odmlld3MgPT4gdGhpcy5yZW5kZXJDb21wbGV0ZSh2aWV3cykpO1xuICAgIHRoaXMucGFyZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsaXN0UmVuZGVyZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAga2V5OiB0aGlzLnN1YlByb3BlcnR5LFxuICAgICAgICAgIHZhbHVlOiB0aGlzLmFyZ3MudmFsdWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuICByZVJlbmRlcigpIHtcbiAgICB2YXIgX3RoaXMyID0gdGhpcztcbiAgICBpZiAodGhpcy5wYXVzZWQgfHwgIXRoaXMudGFnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB2aWV3cyA9IFtdO1xuICAgIHZhciBleGlzdGluZ1ZpZXdzID0gbmV3IF9TZXRNYXAuU2V0TWFwKCk7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICB2YXIgdmlldyA9IHRoaXMudmlld3NbaV07XG4gICAgICBpZiAodmlldyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZpZXdzW2ldID0gdmlldztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgcmF3VmFsdWUgPSB2aWV3LmFyZ3NbdGhpcy5zdWJQcm9wZXJ0eV07XG4gICAgICBleGlzdGluZ1ZpZXdzLmFkZChyYXdWYWx1ZSwgdmlldyk7XG4gICAgICB2aWV3c1tpXSA9IHZpZXc7XG4gICAgfVxuICAgIHZhciBmaW5hbFZpZXdzID0gW107XG4gICAgdmFyIGZpbmFsVmlld1NldCA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLmRvd25EZWJpbmQubGVuZ3RoICYmIHRoaXMuZG93bkRlYmluZC5mb3JFYWNoKGQgPT4gZCAmJiBkKCkpO1xuICAgIHRoaXMudXBEZWJpbmQubGVuZ3RoICYmIHRoaXMudXBEZWJpbmQuZm9yRWFjaChkID0+IGQgJiYgZCgpKTtcbiAgICB0aGlzLnVwRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5kb3duRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgdmFyIG1pbktleSA9IEluZmluaXR5O1xuICAgIHZhciBhbnRlTWluS2V5ID0gSW5maW5pdHk7XG4gICAgdmFyIF9sb29wMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgICAgdmFyIGsgPSBfaTtcbiAgICAgIGlmIChpc05hTihrKSkge1xuICAgICAgICBrID0gJ18nICsgX2k7XG4gICAgICB9IGVsc2UgaWYgKFN0cmluZyhrKS5sZW5ndGgpIHtcbiAgICAgICAgayA9IE51bWJlcihrKTtcbiAgICAgIH1cbiAgICAgIGlmIChfdGhpczIuYXJncy52YWx1ZVtfaV0gIT09IHVuZGVmaW5lZCAmJiBleGlzdGluZ1ZpZXdzLmhhcyhfdGhpczIuYXJncy52YWx1ZVtfaV0pKSB7XG4gICAgICAgIHZhciBleGlzdGluZ1ZpZXcgPSBleGlzdGluZ1ZpZXdzLmdldE9uZShfdGhpczIuYXJncy52YWx1ZVtfaV0pO1xuICAgICAgICBpZiAoZXhpc3RpbmdWaWV3KSB7XG4gICAgICAgICAgZXhpc3RpbmdWaWV3LmFyZ3NbX3RoaXMyLmtleVByb3BlcnR5XSA9IF9pO1xuICAgICAgICAgIGZpbmFsVmlld3Nba10gPSBleGlzdGluZ1ZpZXc7XG4gICAgICAgICAgZmluYWxWaWV3U2V0LmFkZChleGlzdGluZ1ZpZXcpO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoIWlzTmFOKGspKSB7XG4gICAgICAgICAgICBtaW5LZXkgPSBNYXRoLm1pbihtaW5LZXksIGspO1xuICAgICAgICAgICAgayA+IDAgJiYgKGFudGVNaW5LZXkgPSBNYXRoLm1pbihhbnRlTWluS2V5LCBrKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV4aXN0aW5nVmlld3MucmVtb3ZlKF90aGlzMi5hcmdzLnZhbHVlW19pXSwgZXhpc3RpbmdWaWV3KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICB2YXIgdmlld0FyZ3MgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICB2YXIgX3ZpZXcgPSBmaW5hbFZpZXdzW2tdID0gbmV3IF90aGlzMi52aWV3Q2xhc3Modmlld0FyZ3MsIF90aGlzMi5wYXJlbnQpO1xuICAgICAgICBpZiAoIWlzTmFOKGspKSB7XG4gICAgICAgICAgbWluS2V5ID0gTWF0aC5taW4obWluS2V5LCBrKTtcbiAgICAgICAgICBrID4gMCAmJiAoYW50ZU1pbktleSA9IE1hdGgubWluKGFudGVNaW5LZXksIGspKTtcbiAgICAgICAgfVxuICAgICAgICBmaW5hbFZpZXdzW2tdLnRlbXBsYXRlID0gX3RoaXMyLnRlbXBsYXRlO1xuICAgICAgICBmaW5hbFZpZXdzW2tdLnZpZXdMaXN0ID0gX3RoaXMyO1xuICAgICAgICBmaW5hbFZpZXdzW2tdLmFyZ3NbX3RoaXMyLmtleVByb3BlcnR5XSA9IF9pO1xuICAgICAgICBmaW5hbFZpZXdzW2tdLmFyZ3NbX3RoaXMyLnN1YlByb3BlcnR5XSA9IF90aGlzMi5hcmdzLnZhbHVlW19pXTtcbiAgICAgICAgX3RoaXMyLnVwRGViaW5kW2tdID0gdmlld0FyZ3MuYmluZFRvKF90aGlzMi5zdWJQcm9wZXJ0eSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICB2YXIgaW5kZXggPSB2aWV3QXJnc1tfdGhpczIua2V5UHJvcGVydHldO1xuICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICBkZWxldGUgX3RoaXMyLmFyZ3MudmFsdWVbaW5kZXhdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfdGhpczIuYXJncy52YWx1ZVtpbmRleF0gPSB2O1xuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMyLmRvd25EZWJpbmRba10gPSBfdGhpczIuc3ViQXJncy5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICBpZiAoZCkge1xuICAgICAgICAgICAgZGVsZXRlIHZpZXdBcmdzW2tdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2aWV3QXJnc1trXSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgdXBEZWJpbmQgPSAoKSA9PiB7XG4gICAgICAgICAgX3RoaXMyLnVwRGViaW5kLmZpbHRlcih4ID0+IHgpLmZvckVhY2goZCA9PiBkKCkpO1xuICAgICAgICAgIF90aGlzMi51cERlYmluZC5sZW5ndGggPSAwO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZG93bkRlYmluZCA9ICgpID0+IHtcbiAgICAgICAgICBfdGhpczIuZG93bkRlYmluZC5maWx0ZXIoeCA9PiB4KS5mb3JFYWNoKGQgPT4gZCgpKTtcbiAgICAgICAgICBfdGhpczIuZG93bkRlYmluZC5sZW5ndGggPSAwO1xuICAgICAgICB9O1xuICAgICAgICBfdmlldy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5yZW1vdmUodXBEZWJpbmQpO1xuICAgICAgICAgIF90aGlzMi5fb25SZW1vdmUucmVtb3ZlKGRvd25EZWJpbmQpO1xuICAgICAgICAgIF90aGlzMi51cERlYmluZFtrXSAmJiBfdGhpczIudXBEZWJpbmRba10oKTtcbiAgICAgICAgICBfdGhpczIuZG93bkRlYmluZFtrXSAmJiBfdGhpczIuZG93bkRlYmluZFtrXSgpO1xuICAgICAgICAgIGRlbGV0ZSBfdGhpczIudXBEZWJpbmRba107XG4gICAgICAgICAgZGVsZXRlIF90aGlzMi5kb3duRGViaW5kW2tdO1xuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5hZGQodXBEZWJpbmQpO1xuICAgICAgICBfdGhpczIuX29uUmVtb3ZlLmFkZChkb3duRGViaW5kKTtcbiAgICAgICAgdmlld0FyZ3NbX3RoaXMyLnN1YlByb3BlcnR5XSA9IF90aGlzMi5hcmdzLnZhbHVlW19pXTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZvciAodmFyIF9pIGluIHRoaXMuYXJncy52YWx1ZSkge1xuICAgICAgX2xvb3AyKCk7XG4gICAgfVxuICAgIGZvciAodmFyIF9pMiBpbiB2aWV3cykge1xuICAgICAgaWYgKHZpZXdzW19pMl0gJiYgIWZpbmFsVmlld1NldC5oYXModmlld3NbX2kyXSkpIHtcbiAgICAgICAgdmlld3NbX2kyXS5yZW1vdmUodHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMuYXJncy52YWx1ZSkpIHtcbiAgICAgIHZhciBsb2NhbE1pbiA9IG1pbktleSA9PT0gMCAmJiBmaW5hbFZpZXdzWzFdICE9PSB1bmRlZmluZWQgJiYgZmluYWxWaWV3cy5sZW5ndGggPiAxIHx8IGFudGVNaW5LZXkgPT09IEluZmluaXR5ID8gbWluS2V5IDogYW50ZU1pbktleTtcbiAgICAgIHZhciByZW5kZXJSZWN1cnNlID0gKGkgPSAwKSA9PiB7XG4gICAgICAgIHZhciBpaSA9IGZpbmFsVmlld3MubGVuZ3RoIC0gaSAtIDE7XG4gICAgICAgIHdoaWxlIChpaSA+IGxvY2FsTWluICYmIGZpbmFsVmlld3NbaWldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpaS0tO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpaSA8IGxvY2FsTWluKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaW5hbFZpZXdzW2lpXSA9PT0gdGhpcy52aWV3c1tpaV0pIHtcbiAgICAgICAgICBpZiAoZmluYWxWaWV3c1tpaV0gJiYgIWZpbmFsVmlld3NbaWldLmZpcnN0Tm9kZSkge1xuICAgICAgICAgICAgZmluYWxWaWV3c1tpaV0ucmVuZGVyKHRoaXMudGFnLCBmaW5hbFZpZXdzW2lpICsgMV0sIHRoaXMucGFyZW50KTtcbiAgICAgICAgICAgIHJldHVybiBmaW5hbFZpZXdzW2lpXS5yZW5kZXJlZC50aGVuKCgpID0+IHJlbmRlclJlY3Vyc2UoTnVtYmVyKGkpICsgMSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgc3BsaXQgPSA1MDA7XG4gICAgICAgICAgICBpZiAoaSA9PT0gMCB8fCBpICUgc3BsaXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlbmRlclJlY3Vyc2UoTnVtYmVyKGkpICsgMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYWNjZXB0ID0+IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBhY2NlcHQocmVuZGVyUmVjdXJzZShOdW1iZXIoaSkgKyAxKSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxWaWV3c1tpaV0ucmVuZGVyKHRoaXMudGFnLCBmaW5hbFZpZXdzW2lpICsgMV0sIHRoaXMucGFyZW50KTtcbiAgICAgICAgdGhpcy52aWV3cy5zcGxpY2UoaWksIDAsIGZpbmFsVmlld3NbaWldKTtcbiAgICAgICAgcmV0dXJuIGZpbmFsVmlld3NbaWldLnJlbmRlcmVkLnRoZW4oKCkgPT4gcmVuZGVyUmVjdXJzZShpICsgMSkpO1xuICAgICAgfTtcbiAgICAgIHRoaXMucmVuZGVyZWQgPSByZW5kZXJSZWN1cnNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciByZW5kZXJzID0gW107XG4gICAgICB2YXIgbGVmdG92ZXJzID0gT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKG51bGwpLCBmaW5hbFZpZXdzKTtcbiAgICAgIHZhciBpc0ludCA9IHggPT4gcGFyc2VJbnQoeCkgPT09IHggLSAwO1xuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhmaW5hbFZpZXdzKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIGlmIChpc0ludChhKSAmJiBpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiBNYXRoLnNpZ24oYSAtIGIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNJbnQoYSkgJiYgIWlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc0ludChhKSAmJiBpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNJbnQoYSkgJiYgIWlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIF9sb29wMyA9IGZ1bmN0aW9uIChfaTMpIHtcbiAgICAgICAgZGVsZXRlIGxlZnRvdmVyc1tfaTNdO1xuICAgICAgICBpZiAoZmluYWxWaWV3c1tfaTNdLmZpcnN0Tm9kZSAmJiBmaW5hbFZpZXdzW19pM10gPT09IF90aGlzMi52aWV3c1tfaTNdKSB7XG4gICAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgZmluYWxWaWV3c1tfaTNdLnJlbmRlcihfdGhpczIudGFnLCBudWxsLCBfdGhpczIucGFyZW50KTtcbiAgICAgICAgcmVuZGVycy5wdXNoKGZpbmFsVmlld3NbX2kzXS5yZW5kZXJlZC50aGVuKCgpID0+IGZpbmFsVmlld3NbX2kzXSkpO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIF9pMyBvZiBrZXlzKSB7XG4gICAgICAgIGlmIChfbG9vcDMoX2kzKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaTQgaW4gbGVmdG92ZXJzKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmFyZ3Mudmlld3NbX2k0XTtcbiAgICAgICAgbGVmdG92ZXJzLnJlbW92ZSh0cnVlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVuZGVyZWQgPSBQcm9taXNlLmFsbChyZW5kZXJzKTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2k1IGluIGZpbmFsVmlld3MpIHtcbiAgICAgIGlmIChpc05hTihfaTUpKSB7XG4gICAgICAgIGZpbmFsVmlld3NbX2k1XS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gX2k1LnN1YnN0cigxKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmaW5hbFZpZXdzW19pNV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IF9pNTtcbiAgICB9XG4gICAgdGhpcy52aWV3cyA9IEFycmF5LmlzQXJyYXkodGhpcy5hcmdzLnZhbHVlKSA/IFsuLi5maW5hbFZpZXdzXSA6IGZpbmFsVmlld3M7XG4gICAgdGhpcy52aWV3Q291bnQgPSBmaW5hbFZpZXdzLmxlbmd0aDtcbiAgICBmaW5hbFZpZXdTZXQuY2xlYXIoKTtcbiAgICB0aGlzLndpbGxSZVJlbmRlciA9IGZhbHNlO1xuICAgIHRoaXMucmVuZGVyZWQudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLnBhcmVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdFJlbmRlcmVkJywge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIGtleTogdGhpcy5zdWJQcm9wZXJ0eSxcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLmFyZ3MudmFsdWUsXG4gICAgICAgICAgICB0YWc6IHRoaXMudGFnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgICB0aGlzLnRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdFJlbmRlcmVkJywge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIGtleTogdGhpcy5zdWJQcm9wZXJ0eSxcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLmFyZ3MudmFsdWUsXG4gICAgICAgICAgICB0YWc6IHRoaXMudGFnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyZWQ7XG4gIH1cbiAgcGF1c2UocGF1c2UgPSB0cnVlKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICB0aGlzLnZpZXdzW2ldLnBhdXNlKHBhdXNlKTtcbiAgICB9XG4gIH1cbiAgb25SZW1vdmUoY2FsbGJhY2spIHtcbiAgICB0aGlzLl9vblJlbW92ZS5hZGQoY2FsbGJhY2spO1xuICB9XG4gIHJlbW92ZSgpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgIHRoaXMudmlld3NbaV0gJiYgdGhpcy52aWV3c1tpXS5yZW1vdmUodHJ1ZSk7XG4gICAgfVxuICAgIHZhciBvblJlbW92ZSA9IHRoaXMuX29uUmVtb3ZlLml0ZW1zKCk7XG4gICAgZm9yICh2YXIgX2k2IGluIG9uUmVtb3ZlKSB7XG4gICAgICB0aGlzLl9vblJlbW92ZS5yZW1vdmUob25SZW1vdmVbX2k2XSk7XG4gICAgICBvblJlbW92ZVtfaTZdKCk7XG4gICAgfVxuICAgIHZhciBjbGVhbnVwO1xuICAgIHdoaWxlICh0aGlzLmNsZWFudXAubGVuZ3RoKSB7XG4gICAgICBjbGVhbnVwID0gdGhpcy5jbGVhbnVwLnBvcCgpO1xuICAgICAgY2xlYW51cCgpO1xuICAgIH1cbiAgICB0aGlzLnZpZXdzID0gW107XG4gICAgd2hpbGUgKHRoaXMudGFnICYmIHRoaXMudGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMudGFnLnJlbW92ZUNoaWxkKHRoaXMudGFnLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdWJBcmdzKSB7XG4gICAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzLnN1YkFyZ3MpO1xuICAgIH1cbiAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzLmFyZ3MpO1xuXG4gICAgLy8gaWYodGhpcy5hcmdzLnZhbHVlICYmICF0aGlzLmFyZ3MudmFsdWUuaXNCb3VuZCgpKVxuICAgIC8vIHtcbiAgICAvLyBcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcy5hcmdzLnZhbHVlKTtcbiAgICAvLyB9XG5cbiAgICB0aGlzLnJlbW92ZWQgPSB0cnVlO1xuICB9XG59XG5leHBvcnRzLlZpZXdMaXN0ID0gVmlld0xpc3Q7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvaW5wdXQvS2V5Ym9hcmQuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLktleWJvYXJkID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuLi9iYXNlL0JpbmRhYmxlXCIpO1xuY2xhc3MgS2V5Ym9hcmQge1xuICBzdGF0aWMgZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlID0gdGhpcy5pbnN0YW5jZSB8fCBfQmluZGFibGUuQmluZGFibGUubWFrZShuZXcgdGhpcygpKTtcbiAgfVxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm1heERlY2F5ID0gMTIwO1xuICAgIHRoaXMuY29tYm9UaW1lID0gNTAwO1xuICAgIHRoaXMubGlzdGVuaW5nID0gZmFsc2U7XG4gICAgdGhpcy5mb2N1c0VsZW1lbnQgPSBkb2N1bWVudC5ib2R5O1xuICAgIHRoaXNbX0JpbmRhYmxlLkJpbmRhYmxlLk5vR2V0dGVyc10gPSB0cnVlO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY29tYm8nLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoW10pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd3aGljaHMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjb2RlcycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2tleXMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVzc2VkV2hpY2gnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVzc2VkQ29kZScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZXNzZWRLZXknLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZWxlYXNlZFdoaWNoJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVsZWFzZWRDb2RlJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVsZWFzZWRLZXknLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdrZXlSZWZzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZXZlbnQgPT4ge1xuICAgICAgaWYgKCF0aGlzLmxpc3RlbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoISh0aGlzLmtleXNbZXZlbnQua2V5XSA+IDApICYmIHRoaXMuZm9jdXNFbGVtZW50ICYmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgIT09IHRoaXMuZm9jdXNFbGVtZW50ICYmICghdGhpcy5mb2N1c0VsZW1lbnQuY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkgfHwgZG9jdW1lbnQuYWN0aXZlRWxlbWVudC5tYXRjaGVzKCdpbnB1dCx0ZXh0YXJlYScpKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5yZWxlYXNlZFdoaWNoW2V2ZW50LndoaWNoXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnJlbGVhc2VkQ29kZVtldmVudC5jb2RlXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnJlbGVhc2VkS2V5W2V2ZW50LmtleV0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy53aGljaHNbZXZlbnQud2hpY2hdID0gLTE7XG4gICAgICB0aGlzLmNvZGVzW2V2ZW50LmNvZGVdID0gLTE7XG4gICAgICB0aGlzLmtleXNbZXZlbnQua2V5XSA9IC0xO1xuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBldmVudCA9PiB7XG4gICAgICBpZiAoIXRoaXMubGlzdGVuaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmZvY3VzRWxlbWVudCAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ICE9PSB0aGlzLmZvY3VzRWxlbWVudCAmJiAoIXRoaXMuZm9jdXNFbGVtZW50LmNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHx8IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQubWF0Y2hlcygnaW5wdXQsdGV4dGFyZWEnKSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChldmVudC5yZXBlYXQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5jb21iby5wdXNoKGV2ZW50LmNvZGUpO1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY29tYm9UaW1lcik7XG4gICAgICB0aGlzLmNvbWJvVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuY29tYm8uc3BsaWNlKDApLCB0aGlzLmNvbWJvVGltZSk7XG4gICAgICB0aGlzLnByZXNzZWRXaGljaFtldmVudC53aGljaF0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5wcmVzc2VkQ29kZVtldmVudC5jb2RlXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnByZXNzZWRLZXlbZXZlbnQua2V5XSA9IERhdGUubm93KCk7XG4gICAgICBpZiAodGhpcy5rZXlzW2V2ZW50LmtleV0gPiAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMud2hpY2hzW2V2ZW50LndoaWNoXSA9IDE7XG4gICAgICB0aGlzLmNvZGVzW2V2ZW50LmNvZGVdID0gMTtcbiAgICAgIHRoaXMua2V5c1tldmVudC5rZXldID0gMTtcbiAgICB9KTtcbiAgICB2YXIgd2luZG93Qmx1ciA9IGV2ZW50ID0+IHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5rZXlzKSB7XG4gICAgICAgIGlmICh0aGlzLmtleXNbaV0gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWxlYXNlZEtleVtpXSA9IERhdGUubm93KCk7XG4gICAgICAgIHRoaXMua2V5c1tpXSA9IC0xO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2kgaW4gdGhpcy5jb2Rlcykge1xuICAgICAgICBpZiAodGhpcy5jb2Rlc1tfaV0gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWxlYXNlZENvZGVbX2ldID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdGhpcy5jb2Rlc1tfaV0gPSAtMTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pMiBpbiB0aGlzLndoaWNocykge1xuICAgICAgICBpZiAodGhpcy53aGljaHNbX2kyXSA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbGVhc2VkV2hpY2hbX2kyXSA9IERhdGUubm93KCk7XG4gICAgICAgIHRoaXMud2hpY2hzW19pMl0gPSAtMTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgd2luZG93Qmx1cik7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBpZiAoZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlID09PSAndmlzaWJsZScpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgd2luZG93Qmx1cigpO1xuICAgIH0pO1xuICB9XG4gIGdldEtleVJlZihrZXlDb2RlKSB7XG4gICAgdmFyIGtleVJlZiA9IHRoaXMua2V5UmVmc1trZXlDb2RlXSA9IHRoaXMua2V5UmVmc1trZXlDb2RlXSB8fCBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSk7XG4gICAgcmV0dXJuIGtleVJlZjtcbiAgfVxuICBnZXRLZXlUaW1lKGtleSkge1xuICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRLZXlba2V5XTtcbiAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZEtleVtrZXldO1xuICAgIGlmICghcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHByZXNzZWQ7XG4gICAgfVxuICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICB9XG4gIGdldENvZGVUaW1lKGNvZGUpIHtcbiAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkQ29kZVtjb2RlXTtcbiAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZENvZGVbY29kZV07XG4gICAgaWYgKCFwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gcHJlc3NlZDtcbiAgICB9XG4gICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gIH1cbiAgZ2V0V2hpY2hUaW1lKGNvZGUpIHtcbiAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkV2hpY2hbY29kZV07XG4gICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRXaGljaFtjb2RlXTtcbiAgICBpZiAoIXByZXNzZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBwcmVzc2VkO1xuICAgIH1cbiAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgfVxuICBnZXRLZXkoa2V5KSB7XG4gICAgaWYgKCF0aGlzLmtleXNba2V5XSkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmtleXNba2V5XTtcbiAgfVxuICBnZXRLZXlDb2RlKGNvZGUpIHtcbiAgICBpZiAoIXRoaXMuY29kZXNbY29kZV0pIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb2Rlc1tjb2RlXTtcbiAgfVxuICByZXNldCgpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMua2V5cykge1xuICAgICAgZGVsZXRlIHRoaXMua2V5c1tpXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmNvZGVzKSB7XG4gICAgICBkZWxldGUgdGhpcy5jb2Rlc1tpXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLndoaWNocykge1xuICAgICAgZGVsZXRlIHRoaXMud2hpY2hzW2ldO1xuICAgIH1cbiAgfVxuICB1cGRhdGUoKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmtleXMpIHtcbiAgICAgIGlmICh0aGlzLmtleXNbaV0gPiAwKSB7XG4gICAgICAgIHRoaXMua2V5c1tpXSsrO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmtleXNbaV0gPiAtdGhpcy5tYXhEZWNheSkge1xuICAgICAgICB0aGlzLmtleXNbaV0tLTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmtleXNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5jb2Rlcykge1xuICAgICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZENvZGVbaV07XG4gICAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZENvZGVbaV07XG4gICAgICB2YXIga2V5UmVmID0gdGhpcy5nZXRLZXlSZWYoaSk7XG4gICAgICBpZiAodGhpcy5jb2Rlc1tpXSA+IDApIHtcbiAgICAgICAga2V5UmVmLmZyYW1lcyA9IHRoaXMuY29kZXNbaV0rKztcbiAgICAgICAga2V5UmVmLnRpbWUgPSBwcmVzc2VkID8gRGF0ZS5ub3coKSAtIHByZXNzZWQgOiAwO1xuICAgICAgICBrZXlSZWYuZG93biA9IHRydWU7XG4gICAgICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmNvZGVzW2ldID4gLXRoaXMubWF4RGVjYXkpIHtcbiAgICAgICAga2V5UmVmLmZyYW1lcyA9IHRoaXMuY29kZXNbaV0tLTtcbiAgICAgICAga2V5UmVmLnRpbWUgPSByZWxlYXNlZCAtIERhdGUubm93KCk7XG4gICAgICAgIGtleVJlZi5kb3duID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBrZXlSZWYuZnJhbWVzID0gMDtcbiAgICAgICAga2V5UmVmLnRpbWUgPSAwO1xuICAgICAgICBrZXlSZWYuZG93biA9IGZhbHNlO1xuICAgICAgICBkZWxldGUgdGhpcy5jb2Rlc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLndoaWNocykge1xuICAgICAgaWYgKHRoaXMud2hpY2hzW2ldID4gMCkge1xuICAgICAgICB0aGlzLndoaWNoc1tpXSsrO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLndoaWNoc1tpXSA+IC10aGlzLm1heERlY2F5KSB7XG4gICAgICAgIHRoaXMud2hpY2hzW2ldLS07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy53aGljaHNbaV07XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5leHBvcnRzLktleWJvYXJkID0gS2V5Ym9hcmQ7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvbWl4aW4vRXZlbnRUYXJnZXRNaXhpbi5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuRXZlbnRUYXJnZXRNaXhpbiA9IHZvaWQgMDtcbnZhciBfTWl4aW4gPSByZXF1aXJlKFwiLi4vYmFzZS9NaXhpblwiKTtcbnZhciBFdmVudFRhcmdldFBhcmVudCA9IFN5bWJvbCgnRXZlbnRUYXJnZXRQYXJlbnQnKTtcbnZhciBDYWxsSGFuZGxlciA9IFN5bWJvbCgnQ2FsbEhhbmRsZXInKTtcbnZhciBDYXB0dXJlID0gU3ltYm9sKCdDYXB0dXJlJyk7XG52YXIgQnViYmxlID0gU3ltYm9sKCdCdWJibGUnKTtcbnZhciBUYXJnZXQgPSBTeW1ib2woJ1RhcmdldCcpO1xudmFyIEhhbmRsZXJzQnViYmxlID0gU3ltYm9sKCdIYW5kbGVyc0J1YmJsZScpO1xudmFyIEhhbmRsZXJzQ2FwdHVyZSA9IFN5bWJvbCgnSGFuZGxlcnNDYXB0dXJlJyk7XG52YXIgRXZlbnRUYXJnZXRNaXhpbiA9IGV4cG9ydHMuRXZlbnRUYXJnZXRNaXhpbiA9IHtcbiAgW19NaXhpbi5NaXhpbi5Db25zdHJ1Y3Rvcl0oKSB7XG4gICAgdGhpc1tIYW5kbGVyc0NhcHR1cmVdID0gbmV3IE1hcCgpO1xuICAgIHRoaXNbSGFuZGxlcnNCdWJibGVdID0gbmV3IE1hcCgpO1xuICB9LFxuICBkaXNwYXRjaEV2ZW50KC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGlmICh0eXBlb2YgZXZlbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBldmVudCA9IG5ldyBDdXN0b21FdmVudChldmVudCk7XG4gICAgICBhcmdzWzBdID0gZXZlbnQ7XG4gICAgfVxuICAgIGV2ZW50LmN2UGF0aCA9IGV2ZW50LmN2UGF0aCB8fCBbXTtcbiAgICBldmVudC5jdlRhcmdldCA9IGV2ZW50LmN2Q3VycmVudFRhcmdldCA9IHRoaXM7XG4gICAgdmFyIHJlc3VsdCA9IHRoaXNbQ2FwdHVyZV0oLi4uYXJncyk7XG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgaWYgKHRoaXNbSGFuZGxlcnNDYXB0dXJlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHZhciBoYW5kbGVyTWFwID0gdGhpc1tIYW5kbGVyc0NhcHR1cmVdLmdldChldmVudC50eXBlKTtcbiAgICAgIHZhciBuZXdIYW5kbGVycyA9IFsuLi5oYW5kbGVyTWFwXTtcbiAgICAgIG5ld0hhbmRsZXJzLmZvckVhY2goaCA9PiBoLnB1c2goaGFuZGxlck1hcCkpO1xuICAgICAgaGFuZGxlcnMucHVzaCguLi5uZXdIYW5kbGVycyk7XG4gICAgfVxuICAgIGlmICh0aGlzW0hhbmRsZXJzQnViYmxlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHZhciBfaGFuZGxlck1hcCA9IHRoaXNbSGFuZGxlcnNCdWJibGVdLmdldChldmVudC50eXBlKTtcbiAgICAgIHZhciBfbmV3SGFuZGxlcnMgPSBbLi4uX2hhbmRsZXJNYXBdO1xuICAgICAgX25ld0hhbmRsZXJzLmZvckVhY2goaCA9PiBoLnB1c2goX2hhbmRsZXJNYXApKTtcbiAgICAgIGhhbmRsZXJzLnB1c2goLi4uX25ld0hhbmRsZXJzKTtcbiAgICB9XG4gICAgaGFuZGxlcnMucHVzaChbKCkgPT4gdGhpc1tDYWxsSGFuZGxlcl0oLi4uYXJncyksIHt9LCBudWxsXSk7XG4gICAgZm9yICh2YXIgW2hhbmRsZXIsIG9wdGlvbnMsIG1hcF0gb2YgaGFuZGxlcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgbWFwLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgcmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFldmVudC5jYW5jZWxhYmxlIHx8ICFldmVudC5jYW5jZWxCdWJibGUgJiYgcmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgdGhpc1tCdWJibGVdKC4uLmFyZ3MpO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdKSB7XG4gICAgICBPYmplY3QuZnJlZXplKGV2ZW50LmN2UGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBldmVudC5yZXR1cm5WYWx1ZTtcbiAgfSxcbiAgYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgIHVzZUNhcHR1cmU6IHRydWVcbiAgICAgIH07XG4gICAgfVxuICAgIHZhciBoYW5kbGVycyA9IEhhbmRsZXJzQnViYmxlO1xuICAgIGlmIChvcHRpb25zLnVzZUNhcHR1cmUpIHtcbiAgICAgIGhhbmRsZXJzID0gSGFuZGxlcnNDYXB0dXJlO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbaGFuZGxlcnNdLmhhcyh0eXBlKSkge1xuICAgICAgdGhpc1toYW5kbGVyc10uc2V0KHR5cGUsIG5ldyBNYXAoKSk7XG4gICAgfVxuICAgIHRoaXNbaGFuZGxlcnNdLmdldCh0eXBlKS5zZXQoY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIGlmIChvcHRpb25zLnNpZ25hbCkge1xuICAgICAgb3B0aW9ucy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBldmVudCA9PiB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMpLCB7XG4gICAgICAgIG9uY2U6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgcmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgIHVzZUNhcHR1cmU6IHRydWVcbiAgICAgIH07XG4gICAgfVxuICAgIHZhciBoYW5kbGVycyA9IEhhbmRsZXJzQnViYmxlO1xuICAgIGlmIChvcHRpb25zLnVzZUNhcHR1cmUpIHtcbiAgICAgIGhhbmRsZXJzID0gSGFuZGxlcnNDYXB0dXJlO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbaGFuZGxlcnNdLmhhcyh0eXBlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzW2hhbmRsZXJzXS5nZXQodHlwZSkuZGVsZXRlKGNhbGxiYWNrKTtcbiAgfSxcbiAgW0NhcHR1cmVdKC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGV2ZW50LmN2UGF0aC5wdXNoKHRoaXMpO1xuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0NhcHR1cmVdKC4uLmFyZ3MpO1xuICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0NhcHR1cmVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBldmVudC5jdkN1cnJlbnRUYXJnZXQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XTtcbiAgICB2YXIge1xuICAgICAgdHlwZVxuICAgIH0gPSBldmVudDtcbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0NhcHR1cmVdLmdldCh0eXBlKTtcbiAgICBmb3IgKHZhciBbaGFuZGxlciwgb3B0aW9uc10gb2YgaGFuZGxlcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgaGFuZGxlcnMuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gaGFuZGxlcihldmVudCk7XG4gICAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuICBbQnViYmxlXSguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBpZiAoIWV2ZW50LmJ1YmJsZXMgfHwgIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQnViYmxlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHJldHVybiB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtCdWJibGVdKC4uLmFyZ3MpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0O1xuICAgIGV2ZW50LmN2Q3VycmVudFRhcmdldCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdO1xuICAgIHZhciB7XG4gICAgICB0eXBlXG4gICAgfSA9IGV2ZW50O1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQnViYmxlXS5nZXQoZXZlbnQudHlwZSk7XG4gICAgZm9yICh2YXIgW2hhbmRsZXIsIG9wdGlvbnNdIG9mIGhhbmRsZXJzKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgIGhhbmRsZXJzLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgcmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXN1bHQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtDYWxsSGFuZGxlcl0oLi4uYXJncyk7XG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0J1YmJsZV0oLi4uYXJncyk7XG4gIH0sXG4gIFtDYWxsSGFuZGxlcl0oLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgaWYgKGV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGRlZmF1bHRIYW5kbGVyID0gYG9uJHtldmVudC50eXBlWzBdLnRvVXBwZXJDYXNlKCkgKyBldmVudC50eXBlLnNsaWNlKDEpfWA7XG4gICAgaWYgKHR5cGVvZiB0aGlzW2RlZmF1bHRIYW5kbGVyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXNbZGVmYXVsdEhhbmRsZXJdKGV2ZW50KTtcbiAgICB9XG4gIH1cbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRXZlbnRUYXJnZXRNaXhpbiwgJ1BhcmVudCcsIHtcbiAgdmFsdWU6IEV2ZW50VGFyZ2V0UGFyZW50XG59KTtcbiAgfSkoKTtcbn0pOyIsImV4cG9ydCBjbGFzcyBDb25maWcge307XG5cbkNvbmZpZy50aXRsZSA9ICd3Z2wyZCc7XG4vLyBDb25maWcuIiwiZXhwb3J0IGNsYXNzIEdsMmRcbntcblx0Y29uc3RydWN0b3IoZWxlbWVudClcblx0e1xuXHRcdHRoaXMuZWxlbWVudCAgID0gZWxlbWVudCB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHR0aGlzLmNvbnRleHQgICA9IHRoaXMuZWxlbWVudC5nZXRDb250ZXh0KCd3ZWJnbCcpO1xuXHRcdHRoaXMuc2NyZWVuU2NhbGUgPSAxO1xuXHRcdHRoaXMuem9vbUxldmVsID0gMjtcblx0fVxuXG5cdGNsZWFudXAoKVxuXHR7XG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVByb2dyYW0odGhpcy5wcm9ncmFtKTtcblx0fVxuXG5cdGNyZWF0ZVNoYWRlcihsb2NhdGlvbilcblx0e1xuXHRcdGNvbnN0IGV4dGVuc2lvbiA9IGxvY2F0aW9uLnN1YnN0cmluZyhsb2NhdGlvbi5sYXN0SW5kZXhPZignLicpKzEpO1xuXHRcdGxldCAgIHR5cGUgPSBudWxsO1xuXG5cdFx0c3dpdGNoKGV4dGVuc2lvbi50b1VwcGVyQ2FzZSgpKVxuXHRcdHtcblx0XHRcdGNhc2UgJ1ZFUlQnOlxuXHRcdFx0XHR0eXBlID0gdGhpcy5jb250ZXh0LlZFUlRFWF9TSEFERVI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnRlJBRyc6XG5cdFx0XHRcdHR5cGUgPSB0aGlzLmNvbnRleHQuRlJBR01FTlRfU0hBREVSO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRjb25zdCBzaGFkZXIgPSB0aGlzLmNvbnRleHQuY3JlYXRlU2hhZGVyKHR5cGUpO1xuXHRcdGNvbnN0IHNvdXJjZSA9IHJlcXVpcmUobG9jYXRpb24pO1xuXG5cdFx0dGhpcy5jb250ZXh0LnNoYWRlclNvdXJjZShzaGFkZXIsIHNvdXJjZSk7XG5cdFx0dGhpcy5jb250ZXh0LmNvbXBpbGVTaGFkZXIoc2hhZGVyKTtcblxuXHRcdGNvbnN0IHN1Y2Nlc3MgPSB0aGlzLmNvbnRleHQuZ2V0U2hhZGVyUGFyYW1ldGVyKFxuXHRcdFx0c2hhZGVyXG5cdFx0XHQsIHRoaXMuY29udGV4dC5DT01QSUxFX1NUQVRVU1xuXHRcdCk7XG5cblx0XHRpZihzdWNjZXNzKVxuXHRcdHtcblx0XHRcdHJldHVybiBzaGFkZXI7XG5cdFx0fVxuXG5cdFx0Y29uc29sZS5lcnJvcih0aGlzLmNvbnRleHQuZ2V0U2hhZGVySW5mb0xvZyhzaGFkZXIpKTtcblxuXHRcdHRoaXMuY29udGV4dC5kZWxldGVTaGFkZXIoc2hhZGVyKTtcblx0fVxuXG5cdGNyZWF0ZVByb2dyYW0odmVydGV4U2hhZGVyLCBmcmFnbWVudFNoYWRlcilcblx0e1xuXHRcdGNvbnN0IHByb2dyYW0gPSB0aGlzLmNvbnRleHQuY3JlYXRlUHJvZ3JhbSgpO1xuXG5cdFx0dGhpcy5jb250ZXh0LmF0dGFjaFNoYWRlcihwcm9ncmFtLCB2ZXJ0ZXhTaGFkZXIpO1xuXHRcdHRoaXMuY29udGV4dC5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xuXG5cdFx0dGhpcy5jb250ZXh0LmxpbmtQcm9ncmFtKHByb2dyYW0pO1xuXG5cdFx0dGhpcy5jb250ZXh0LmRldGFjaFNoYWRlcihwcm9ncmFtLCB2ZXJ0ZXhTaGFkZXIpO1xuXHRcdHRoaXMuY29udGV4dC5kZXRhY2hTaGFkZXIocHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xuXHRcdHRoaXMuY29udGV4dC5kZWxldGVTaGFkZXIodmVydGV4U2hhZGVyKTtcblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlU2hhZGVyKGZyYWdtZW50U2hhZGVyKTtcblxuXHRcdGlmKHRoaXMuY29udGV4dC5nZXRQcm9ncmFtUGFyYW1ldGVyKHByb2dyYW0sIHRoaXMuY29udGV4dC5MSU5LX1NUQVRVUykpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHByb2dyYW07XG5cdFx0fVxuXG5cdFx0Y29uc29sZS5lcnJvcih0aGlzLmNvbnRleHQuZ2V0UHJvZ3JhbUluZm9Mb2cocHJvZ3JhbSkpO1xuXG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVByb2dyYW0ocHJvZ3JhbSk7XG5cblx0XHRyZXR1cm4gcHJvZ3JhbTtcblx0fVxufVxuIiwiaW1wb3J0IHsgVmlldyBhcyBCYXNlVmlldyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1ZpZXcnO1xuaW1wb3J0IHsgS2V5Ym9hcmQgfSBmcm9tICdjdXJ2YXR1cmUvaW5wdXQvS2V5Ym9hcmQnXG5pbXBvcnQgeyBCYWcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CYWcnO1xuXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tICdDb25maWcnO1xuXG5pbXBvcnQgeyBNYXAgYXMgV29ybGRNYXAgfSBmcm9tICcuLi93b3JsZC9NYXAnO1xuXG5pbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGVTaGVldCc7XG5pbXBvcnQgeyBTcHJpdGVCb2FyZCB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGVCb2FyZCc7XG5cbmltcG9ydCB7IENvbnRyb2xsZXIgYXMgT25TY3JlZW5Kb3lQYWQgfSBmcm9tICcuLi91aS9Db250cm9sbGVyJztcbmltcG9ydCB7IE1hcEVkaXRvciAgIH0gZnJvbSAnLi4vdWkvTWFwRWRpdG9yJztcblxuaW1wb3J0IHsgRW50aXR5IH0gZnJvbSAnLi4vbW9kZWwvRW50aXR5JztcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4uL3Nwcml0ZS9DYW1lcmEnO1xuXG5pbXBvcnQgeyBDb250cm9sbGVyIH0gZnJvbSAnLi4vbW9kZWwvQ29udHJvbGxlcic7XG5pbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlJztcblxuY29uc3QgQXBwbGljYXRpb24gPSB7fTtcblxuQXBwbGljYXRpb24ub25TY3JlZW5Kb3lQYWQgPSBuZXcgT25TY3JlZW5Kb3lQYWQ7XG5BcHBsaWNhdGlvbi5rZXlib2FyZCA9IEtleWJvYXJkLmdldCgpO1xuXG5cbmV4cG9ydCBjbGFzcyBWaWV3IGV4dGVuZHMgQmFzZVZpZXdcbntcblx0Y29uc3RydWN0b3IoYXJncylcblx0e1xuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyA9IHRydWU7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL3ZpZXcudG1wJyk7XG5cdFx0dGhpcy5yb3V0ZXMgICAgPSBbXTtcblxuXHRcdHRoaXMuZW50aXRpZXMgID0gbmV3IEJhZztcblx0XHR0aGlzLmtleWJvYXJkICA9IEFwcGxpY2F0aW9uLmtleWJvYXJkO1xuXHRcdHRoaXMuc3BlZWQgICAgID0gMjQ7XG5cdFx0dGhpcy5tYXhTcGVlZCAgPSB0aGlzLnNwZWVkO1xuXG5cdFx0dGhpcy5hcmdzLmNvbnRyb2xsZXIgPSBBcHBsaWNhdGlvbi5vblNjcmVlbkpveVBhZDtcblxuXHRcdHRoaXMuYXJncy5mcHMgID0gMDtcblx0XHR0aGlzLmFyZ3Muc3BzICA9IDA7XG5cblx0XHR0aGlzLmFyZ3MuY2FtWCA9IDA7XG5cdFx0dGhpcy5hcmdzLmNhbVkgPSAwO1xuXG5cdFx0dGhpcy5hcmdzLmZyYW1lTG9jayAgICAgID0gNjA7XG5cdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID0gNjA7XG5cblx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IGZhbHNlO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5saXN0ZW5pbmcgPSB0cnVlO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnZScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMubWFwLmV4cG9ydCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnRXNjYXBlJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID09PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5zcHJpdGVCb2FyZC51bnNlbGVjdCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnSG9tZScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2srKztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0VuZCcsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2stLTtcblxuXHRcdFx0XHRpZih0aGlzLmFyZ3MuZnJhbWVMb2NrIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2sgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdQYWdlVXAnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2srKztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ1BhZ2VEb3duJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrLS07XG5cblx0XHRcdFx0aWYodGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cdFx0dGhpcy5tYXAgICAgICAgICA9IG5ldyBXb3JsZE1hcDtcblxuXHRcdHRoaXMubWFwLmltcG9ydCgpO1xuXG5cdFx0dGhpcy5hcmdzLm1hcEVkaXRvciAgPSBuZXcgTWFwRWRpdG9yKHtcblx0XHRcdHNwcml0ZVNoZWV0OiB0aGlzLnNwcml0ZVNoZWV0XG5cdFx0XHQsIG1hcDogICAgICAgdGhpcy5tYXBcblx0XHR9KTtcblx0fVxuXG5cdG9uUmVuZGVyZWQoKVxuXHR7XG5cdFx0Y29uc3Qgc3ByaXRlQm9hcmQgPSBuZXcgU3ByaXRlQm9hcmQoXG5cdFx0XHR0aGlzLnRhZ3MuY2FudmFzLmVsZW1lbnRcblx0XHRcdCwgdGhpcy5tYXBcblx0XHQpO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXG5cdFx0Y29uc3QgZW50aXR5ID0gbmV3IEVudGl0eSh7XG5cdFx0XHRzcHJpdGU6IG5ldyBTcHJpdGUoe1xuXHRcdFx0XHRzcmM6IHVuZGVmaW5lZCxcblx0XHRcdFx0c3ByaXRlQm9hcmQ6IHNwcml0ZUJvYXJkLFxuXHRcdFx0XHRzcHJpdGVTaGVldDogdGhpcy5zcHJpdGVTaGVldCxcblx0XHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0XHRoZWlnaHQ6IDQ4LFxuXHRcdFx0fSksXG5cdFx0XHRjb250cm9sbGVyOiBuZXcgQ29udHJvbGxlcih7XG5cdFx0XHRcdGtleWJvYXJkOiB0aGlzLmtleWJvYXJkLFxuXHRcdFx0XHRvblNjcmVlbkpveVBhZDogdGhpcy5hcmdzLmNvbnRyb2xsZXIsXG5cdFx0XHR9KSxcblx0XHRcdGNhbWVyYTogQ2FtZXJhLFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5lbnRpdGllcy5hZGQoZW50aXR5KTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLnNwcml0ZXMuYWRkKGVudGl0eS5zcHJpdGUpO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5mb2xsb3dpbmcgPSBlbnRpdHk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCc9JywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy56b29tKDEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnKycsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuem9vbSgxKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJy0nLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnpvb20oLTEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hcmdzLm1hcEVkaXRvci5hcmdzLmJpbmRUbygnc2VsZWN0ZWRHcmFwaGljJywgKHYpPT57XG5cdFx0XHRpZighdiB8fCB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFggPT0gbnVsbClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IGZhbHNlO1xuXG5cdFx0XHRsZXQgaSAgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLnN0YXJ0R2xvYmFsWDtcblx0XHRcdGxldCBpaSA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWDtcblxuXHRcdFx0aWYoaWkgPCBpKVxuXHRcdFx0e1xuXHRcdFx0XHRbaWksIGldID0gW2ksIGlpXTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yKDsgaTw9IGlpOyBpKyspXG5cdFx0XHR7XG5cdFx0XHRcdGxldCBqICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuc3RhcnRHbG9iYWxZO1xuXHRcdFx0XHRsZXQgamogPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFk7XG5cdFx0XHRcdGlmKGpqIDwgailcblx0XHRcdFx0e1xuXHRcdFx0XHRcdFtqaiwgal0gPSBbaiwgampdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGZvcig7IGogPD0gamo7IGorKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMubWFwLnNldFRpbGUoaSwgaiwgdik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5tYXAuc2V0VGlsZShcblx0XHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxYXG5cdFx0XHRcdCwgdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxZXG5cdFx0XHRcdCwgdlxuXHRcdFx0KTtcblxuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5yZXNpemUoKTtcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQudW5zZWxlY3QoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuYmluZFRvKCh2LGssdCxkLHApPT57XG5cdFx0XHRpZih0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmxvY2FsWCA9PSBudWxsKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IGZhbHNlO1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hcmdzLm1hcEVkaXRvci5zZWxlY3QodGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZCk7XG5cblx0XHRcdHRoaXMuYXJncy5zaG93RWRpdG9yID0gdHJ1ZTtcblxuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5yZXNpemUoKTtcblx0XHR9LHt3YWl0OjB9KTtcblxuXHRcdHRoaXMuYXJncy5zaG93RWRpdG9yID0gdHJ1ZTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCAoKSA9PiB0aGlzLnJlc2l6ZSgpKTtcblxuXHRcdGxldCBmVGhlbiA9IDA7XG5cdFx0bGV0IHNUaGVuID0gMDtcblxuXHRcdGxldCBmU2FtcGxlcyA9IFtdO1xuXHRcdGxldCBzU2FtcGxlcyA9IFtdO1xuXG5cdFx0bGV0IG1heFNhbXBsZXMgPSA1O1xuXG5cdFx0Y29uc3Qgc2ltdWxhdGUgPSAobm93KSA9PiB7XG5cdFx0XHRub3cgPSBub3cgLyAxMDAwO1xuXG5cdFx0XHRjb25zdCBkZWx0YSA9IG5vdyAtIHNUaGVuO1xuXG5cdFx0XHRpZih0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPT0gMClcblx0XHRcdHtcblx0XHRcdFx0c1NhbXBsZXMgPSBbMF07XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYoZGVsdGEgPCAxLyh0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2srKDEwICogKHRoaXMuYXJncy5zaW11bGF0aW9uTG9jay82MCkpKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzVGhlbiA9IG5vdztcblxuXHRcdFx0dGhpcy5rZXlib2FyZC51cGRhdGUoKTtcblxuXHRcdFx0T2JqZWN0LnZhbHVlcyh0aGlzLmVudGl0aWVzLml0ZW1zKCkpLm1hcCgoZSk9Pntcblx0XHRcdFx0ZS5zaW11bGF0ZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIHRoaXMuc3ByaXRlQm9hcmQuc2ltdWxhdGUoKTtcblxuXHRcdFx0Ly8gdGhpcy5hcmdzLmxvY2FsWCAgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmxvY2FsWDtcblx0XHRcdC8vIHRoaXMuYXJncy5sb2NhbFkgID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFk7XG5cdFx0XHQvLyB0aGlzLmFyZ3MuZ2xvYmFsWCA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWDtcblx0XHRcdC8vIHRoaXMuYXJncy5nbG9iYWxZID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxZO1xuXG5cdFx0XHR0aGlzLmFyZ3MuX3NwcyA9ICgxIC8gZGVsdGEpO1xuXG5cdFx0XHRzU2FtcGxlcy5wdXNoKHRoaXMuYXJncy5fc3BzKTtcblxuXHRcdFx0d2hpbGUoc1NhbXBsZXMubGVuZ3RoID4gbWF4U2FtcGxlcylcblx0XHRcdHtcblx0XHRcdFx0c1NhbXBsZXMuc2hpZnQoKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gdGhpcy5zcHJpdGVCb2FyZC5tb3ZlQ2FtZXJhKHNwcml0ZS54LCBzcHJpdGUueSk7XG5cdFx0fTtcblxuXHRcdGNvbnN0IHVwZGF0ZSA9IChub3cpID0+e1xuXHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3KCk7XG5cblx0XHRcdGNvbnN0IGRlbHRhID0gbm93IC0gZlRoZW47XG5cdFx0XHRmVGhlbiA9IG5vdztcblxuXHRcdFx0dGhpcy5hcmdzLmZwcyA9ICgxMDAwIC8gZGVsdGEpLnRvRml4ZWQoMyk7XG5cblx0XHRcdHRoaXMuYXJncy5jYW1YID0gTnVtYmVyKENhbWVyYS54KS50b0ZpeGVkKDMpO1xuXHRcdFx0dGhpcy5hcmdzLmNhbVkgPSBOdW1iZXIoQ2FtZXJhLnkpLnRvRml4ZWQoMyk7XG5cdFx0fTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAvIDEwMjQgKiA0O1xuXHRcdHRoaXMucmVzaXplKCk7XG5cblx0XHR1cGRhdGUocGVyZm9ybWFuY2Uubm93KCkpO1xuXG5cdFx0c2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdHNpbXVsYXRlKHBlcmZvcm1hbmNlLm5vdygpKTtcblx0XHR9LCAwKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRkb2N1bWVudC50aXRsZSA9IGAke0NvbmZpZy50aXRsZX0gJHt0aGlzLmFyZ3MuZnBzfSBGUFNgO1xuXHRcdH0sIDIyNy8zKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRjb25zdCBzcHMgPSBzU2FtcGxlcy5yZWR1Y2UoKGEsYik9PmErYiwgMCkgLyBzU2FtcGxlcy5sZW5ndGg7XG5cdFx0XHR0aGlzLmFyZ3Muc3BzID0gc3BzLnRvRml4ZWQoMykucGFkU3RhcnQoNSwgJyAnKTtcblx0XHR9LCAyMzEvMik7XG5cdH1cblxuXHRyZXNpemUoeCwgeSlcblx0e1xuXHRcdHRoaXMuYXJncy53aWR0aCAgPSB0aGlzLnRhZ3MuY2FudmFzLmVsZW1lbnQud2lkdGggICA9IHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aDtcblx0XHR0aGlzLmFyZ3MuaGVpZ2h0ID0gdGhpcy50YWdzLmNhbnZhcy5lbGVtZW50LmhlaWdodCAgPSB5IHx8IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0O1xuXG5cdFx0dGhpcy5hcmdzLnJ3aWR0aCAgPSBNYXRoLnRydW5jKFxuXHRcdFx0KHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgIC8gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHR0aGlzLmFyZ3MucmhlaWdodCA9IE1hdGgudHJ1bmMoXG5cdFx0XHQoeSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCkgLyB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0KTtcblxuXHRcdGNvbnN0IG9sZFNjYWxlID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSA9IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0IC8gMTAyNDtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgKj0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlIC8gb2xkU2NhbGU7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHR9XG5cblx0c2Nyb2xsKGV2ZW50KVxuXHR7XG5cdFx0bGV0IGRlbHRhID0gZXZlbnQuZGVsdGFZID4gMCA/IC0xIDogKFxuXHRcdFx0ZXZlbnQuZGVsdGFZIDwgMCA/IDEgOiAwXG5cdFx0KTtcblxuXHRcdHRoaXMuem9vbShkZWx0YSk7XG5cdH1cblxuXHR6b29tKGRlbHRhKVxuXHR7XG5cdFx0Y29uc3QgbWF4ID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMzI7XG5cdFx0Y29uc3QgbWluID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMC42NjY3O1xuXHRcdGNvbnN0IHN0ZXAgPSAwLjA1ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblxuXHRcdGxldCB6b29tTGV2ZWwgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICsgKGRlbHRhICogc3RlcCk7XG5cblx0XHRpZih6b29tTGV2ZWwgPCBtaW4pXG5cdFx0e1xuXHRcdFx0em9vbUxldmVsID0gbWluO1xuXHRcdH1cblx0XHRlbHNlIGlmKHpvb21MZXZlbCA+IG1heClcblx0XHR7XG5cdFx0XHR6b29tTGV2ZWwgPSBtYXg7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAhPT0gem9vbUxldmVsKVxuXHRcdHtcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgPSB6b29tTGV2ZWw7XG5cdFx0XHR0aGlzLnJlc2l6ZSgpO1xuXHRcdH1cblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxjYW52YXNcXG5cXHRjdi1yZWYgPSBcXFwiY2FudmFzOmN1cnZhdHVyZS9iYXNlL1RhZ1xcXCJcXG5cXHRjdi1vbiAgPSBcXFwid2hlZWw6c2Nyb2xsKGV2ZW50KTtcXFwiXFxuPjwvY2FudmFzPlxcbjxkaXYgY2xhc3MgPSBcXFwiaHVkIGZwc1xcXCI+XFxuIFtbc3BzXV0gc2ltdWxhdGlvbnMvcyAvIFtbc2ltdWxhdGlvbkxvY2tdXSBcXG4gW1tmcHNdXSBmcmFtZXMvcyAgICAgIC8gW1tmcmFtZUxvY2tdXSBcXG5cXG4gUmVzIFtbcndpZHRoXV0geCBbW3JoZWlnaHRdXVxcbiAgICAgW1t3aWR0aF1dIHggW1toZWlnaHRdXVxcbiBcXG4gUG9zIFtbY2FtWF1dIHggW1tjYW1ZXV1cXG5cXG4gzrQgU2ltOiAgIFBnIFVwIC8gRG5cXG4gzrQgRnJhbWU6IEhvbWUgLyBFbmQgXFxuIM60IFNjYWxlOiArIC8gLSBcXG5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzID0gXFxcInJldGljbGVcXFwiPjwvZGl2PlxcblxcbltbY29udHJvbGxlcl1dXFxuXFxuPGRpdiBjdi1pZiA9IFxcXCJzaG93RWRpdG9yXFxcIj5cXG5cXHRbW21hcEVkaXRvcl1dXFxuXFx0LS1cXG5cXHRbW21tbV1dXFxuPC9zcGFuPlxcblwiIiwiaW1wb3J0IHsgUm91dGVyIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvUm91dGVyJztcbmltcG9ydCB7IFZpZXcgICB9IGZyb20gJ2hvbWUvVmlldyc7XG5cbmlmKFByb3h5ICE9PSB1bmRlZmluZWQpXG57XG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG5cdFx0Y29uc3QgdmlldyA9IG5ldyBWaWV3KCk7XG5cdFx0XG5cdFx0Um91dGVyLmxpc3Rlbih2aWV3KTtcblx0XHRcblx0XHR2aWV3LnJlbmRlcihkb2N1bWVudC5ib2R5KTtcblx0fSk7XG59XG5lbHNlXG57XG5cdC8vIGRvY3VtZW50LndyaXRlKHJlcXVpcmUoJy4vRmFsbGJhY2svZmFsbGJhY2sudG1wJykpO1xufVxuIiwiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJy4vSW5qZWN0YWJsZSc7XG5cbmV4cG9ydCBjbGFzcyBDb250YWluZXIgZXh0ZW5kcyBJbmplY3RhYmxlXG57XG5cdGluamVjdChpbmplY3Rpb25zKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKE9iamVjdC5hc3NpZ24oe30sIHRoaXMsIGluamVjdGlvbnMpKTtcblx0fVxufVxuIiwibGV0IGNsYXNzZXMgPSB7fTtcbmxldCBvYmplY3RzID0ge307XG5cbmV4cG9ydCBjbGFzcyBJbmplY3RhYmxlXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdGxldCBpbmplY3Rpb25zID0gdGhpcy5jb25zdHJ1Y3Rvci5pbmplY3Rpb25zKCk7XG5cdFx0bGV0IGNvbnRleHQgICAgPSB0aGlzLmNvbnN0cnVjdG9yLmNvbnRleHQoKTtcblxuXHRcdGlmKCFjbGFzc2VzW2NvbnRleHRdKVxuXHRcdHtcblx0XHRcdGNsYXNzZXNbY29udGV4dF0gPSB7fTtcblx0XHR9XG5cblx0XHRpZighb2JqZWN0c1tjb250ZXh0XSlcblx0XHR7XG5cdFx0XHRvYmplY3RzW2NvbnRleHRdID0ge307XG5cdFx0fVxuXG5cdFx0Zm9yKGxldCBuYW1lIGluIGluamVjdGlvbnMpXG5cdFx0e1xuXHRcdFx0bGV0IGluamVjdGlvbiA9IGluamVjdGlvbnNbbmFtZV07XG5cblx0XHRcdGlmKGNsYXNzZXNbY29udGV4dF1bbmFtZV0gfHwgIWluamVjdGlvbi5wcm90b3R5cGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZigvW0EtWl0vLnRlc3QoU3RyaW5nKG5hbWUpWzBdKSlcblx0XHRcdHtcblx0XHRcdFx0Y2xhc3Nlc1tjb250ZXh0XVtuYW1lXSA9IGluamVjdGlvbjtcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGZvcihsZXQgbmFtZSBpbiBpbmplY3Rpb25zKVxuXHRcdHtcblx0XHRcdGxldCBpbnN0YW5jZSAgPSB1bmRlZmluZWQ7XG5cdFx0XHRsZXQgaW5qZWN0aW9uID0gY2xhc3Nlc1tjb250ZXh0XVtuYW1lXSB8fCBpbmplY3Rpb25zW25hbWVdO1xuXG5cdFx0XHRpZigvW0EtWl0vLnRlc3QoU3RyaW5nKG5hbWUpWzBdKSlcblx0XHRcdHtcblx0XHRcdFx0aWYoaW5qZWN0aW9uLnByb3RvdHlwZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmKCFvYmplY3RzW2NvbnRleHRdW25hbWVdKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG9iamVjdHNbY29udGV4dF1bbmFtZV0gPSBuZXcgaW5qZWN0aW9uO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRvYmplY3RzW2NvbnRleHRdW25hbWVdID0gaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aW5zdGFuY2UgPSBvYmplY3RzW2NvbnRleHRdW25hbWVdO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRpZihpbmplY3Rpb24ucHJvdG90eXBlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aW5zdGFuY2UgPSBuZXcgaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGluc3RhbmNlID0gaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBuYW1lLCB7XG5cdFx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0XHR3cml0YWJsZTogICBmYWxzZSxcblx0XHRcdFx0dmFsdWU6ICAgICAgaW5zdGFuY2Vcblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cblx0c3RhdGljIGluamVjdGlvbnMoKVxuXHR7XG5cdFx0cmV0dXJuIHt9O1xuXHR9XG5cblx0c3RhdGljIGNvbnRleHQoKVxuXHR7XG5cdFx0cmV0dXJuICcuJztcblx0fVxuXG5cdHN0YXRpYyBpbmplY3QoaW5qZWN0aW9ucywgY29udGV4dCA9ICcuJylcblx0e1xuXHRcdGlmKCEodGhpcy5wcm90b3R5cGUgaW5zdGFuY2VvZiBJbmplY3RhYmxlIHx8IHRoaXMgPT09IEluamVjdGFibGUpKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGFjY2VzcyBpbmplY3RhYmxlIHN1YmNsYXNzIVxuXG5BcmUgeW91IHRyeWluZyB0byBpbnN0YW50aWF0ZSBsaWtlIHRoaXM/XG5cblx0bmV3IFguaW5qZWN0KHsuLi59KTtcblxuSWYgc28gcGxlYXNlIHRyeTpcblxuXHRuZXcgKFguaW5qZWN0KHsuLi59KSk7XG5cblBsZWFzZSBub3RlIHRoZSBwYXJlbnRoZXNpcy5cbmApO1xuXHRcdH1cblxuXHRcdGxldCBleGlzdGluZ0luamVjdGlvbnMgPSB0aGlzLmluamVjdGlvbnMoKTtcblxuXHRcdHJldHVybiBjbGFzcyBleHRlbmRzIHRoaXMge1xuXHRcdFx0c3RhdGljIGluamVjdGlvbnMoKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgZXhpc3RpbmdJbmplY3Rpb25zLCBpbmplY3Rpb25zKTtcblx0XHRcdH1cblx0XHRcdHN0YXRpYyBjb250ZXh0KClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIGNvbnRleHQ7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxufVxuIiwiY2xhc3MgU2luZ2xlXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHRoaXMubmFtZSA9ICdzc3MuJyArIE1hdGgucmFuZG9tKCk7XG5cdH1cbn1cblxubGV0IHNpbmdsZSA9IG5ldyBTaW5nbGU7XG5cbmV4cG9ydCB7U2luZ2xlLCBzaW5nbGV9OyIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuXG5leHBvcnQgIGNsYXNzIENvbnRyb2xsZXJcbntcblx0dHJpZ2dlcnMgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUoe30pO1xuXHRheGlzICAgICA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh7fSk7XG5cdFxuXHRjb25zdHJ1Y3Rvcih7a2V5Ym9hcmQsIG9uU2NyZWVuSm95UGFkfSlcblx0e1xuXHRcdGtleWJvYXJkLmtleXMuYmluZFRvKCh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMua2V5UHJlc3Moayx2LHRba10pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmKHYgPT09IC0xKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmtleVJlbGVhc2Uoayx2LHRba10pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHR9KTtcblxuXHRcdG9uU2NyZWVuSm95UGFkLmFyZ3MuYmluZFRvKCd4JywgKHYpID0+IHtcblx0XHRcdHRoaXMuYXhpc1swXSA9IHYgLyA1MDtcblx0XHR9KTtcblxuXHRcdG9uU2NyZWVuSm95UGFkLmFyZ3MuYmluZFRvKCd5JywgKHYpID0+IHtcblx0XHRcdHRoaXMuYXhpc1sxXSA9IHYgLyA1MDtcblx0XHR9KTtcblx0fVxuXG5cdGtleVByZXNzKGtleSwgdmFsdWUsIHByZXYpXG5cdHtcblx0XHRpZigvXlswLTldJC8udGVzdChrZXkpKVxuXHRcdHtcblx0XHRcdHRoaXMudHJpZ2dlcnNba2V5XSA9IHRydWU7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c3dpdGNoKGtleSlcblx0XHR7XG5cdFx0XHRjYXNlICdBcnJvd1JpZ2h0Jzpcblx0XHRcdFx0dGhpcy5heGlzWzBdID0gMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93RG93bic6XG5cdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0xlZnQnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAtMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93VXAnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAtMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0a2V5UmVsZWFzZShrZXksIHZhbHVlLCBwcmV2KVxuXHR7XG5cdFx0aWYoL15bMC05XSQvLnRlc3Qoa2V5KSlcblx0XHR7XG5cdFx0XHR0aGlzLnRyaWdnZXJzW2tleV0gPSBmYWxzZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzd2l0Y2goa2V5KVxuXHRcdHtcblx0XHRcdGNhc2UgJ0Fycm93UmlnaHQnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMF0gPiAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0xlZnQnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMF0gPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dEb3duJzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzFdID4gMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dVcCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1sxXSA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxufVxuIiwiY29uc3QgZmlyZVJlZ2lvbiA9IFsxLCAwLCAwXTtcbmNvbnN0IHdhdGVyUmVnaW9uID0gWzAsIDEsIDFdO1xuXG5leHBvcnQgY2xhc3MgRW50aXR5XG57XG5cdGNvbnN0cnVjdG9yKHtzcHJpdGUsIGNvbnRyb2xsZXJ9KVxuXHR7XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdHRoaXMuc3RhdGUgPSAnc3RhbmRpbmcnO1xuXG5cdFx0dGhpcy5zcHJpdGUgPSBzcHJpdGU7XG5cdFx0dGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcblx0fVxuXG5cdGNyZWF0ZSgpXG5cdHtcblx0fVxuXG5cdHNpbXVsYXRlKClcblx0e1xuXHRcdGlmKE1hdGgudHJ1bmMocGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKSAlIDE1ID09PSAwKVxuXHRcdHtcblx0XHRcdHRoaXMuc3ByaXRlLnJlZ2lvbiA9IGZpcmVSZWdpb247XG5cdFx0fVxuXG5cdFx0aWYoTWF0aC50cnVuYyhwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApICUgMTUgPT09IDUpXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUucmVnaW9uID0gd2F0ZXJSZWdpb247XG5cdFx0fVxuXG5cdFx0aWYoTWF0aC50cnVuYyhwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApICUgMTUgPT09IDEwKVxuXHRcdHtcblx0XHRcdHRoaXMuc3ByaXRlLnJlZ2lvbiA9IG51bGw7XG5cdFx0fVxuXG5cdFx0bGV0IHNwZWVkID0gNDtcblxuXHRcdGxldCB4QXhpcyA9IHRoaXMuY29udHJvbGxlci5heGlzWzBdIHx8IDA7XG5cdFx0bGV0IHlBeGlzID0gdGhpcy5jb250cm9sbGVyLmF4aXNbMV0gfHwgMDtcblxuXHRcdGZvcihsZXQgdCBpbiB0aGlzLmNvbnRyb2xsZXIudHJpZ2dlcnMpXG5cdFx0e1xuXHRcdFx0aWYoIXRoaXMuY29udHJvbGxlci50cmlnZ2Vyc1t0XSlcblx0XHRcdHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnNvbGUubG9nKHQpO1xuXHRcdH1cblxuXHRcdHhBeGlzID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoeEF4aXMsIC0xKSk7XG5cdFx0eUF4aXMgPSBNYXRoLm1pbigxLCBNYXRoLm1heCh5QXhpcywgLTEpKTtcblxuXHRcdHRoaXMuc3ByaXRlLnggKz0geEF4aXMgPiAwXG5cdFx0XHQ/IE1hdGguY2VpbChzcGVlZCAqIHhBeGlzKVxuXHRcdFx0OiBNYXRoLmZsb29yKHNwZWVkICogeEF4aXMpO1xuXG5cdFx0dGhpcy5zcHJpdGUueSArPSB5QXhpcyA+IDBcblx0XHRcdD8gTWF0aC5jZWlsKHNwZWVkICogeUF4aXMpXG5cdFx0XHQ6IE1hdGguZmxvb3Ioc3BlZWQgKiB5QXhpcyk7XG5cblx0XHRsZXQgaG9yaXpvbnRhbCA9IGZhbHNlO1xuXG5cdFx0aWYoTWF0aC5hYnMoeEF4aXMpID4gTWF0aC5hYnMoeUF4aXMpKVxuXHRcdHtcblx0XHRcdGhvcml6b250YWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmKGhvcml6b250YWwpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnd2VzdCc7XG5cblx0XHRcdGlmKHhBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnZWFzdCc7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc3RhdGUgPSAnd2Fsa2luZyc7XG5cblx0XHR9XG5cdFx0ZWxzZSBpZih5QXhpcylcblx0XHR7XG5cdFx0XHR0aGlzLmRpcmVjdGlvbiA9ICdub3J0aCc7XG5cblx0XHRcdGlmKHlBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXRlID0gJ3dhbGtpbmcnO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5zdGF0ZSA9ICdzdGFuZGluZyc7XG5cdFx0fVxuXG5cdFx0Ly8gaWYoIXhBeGlzICYmICF5QXhpcylcblx0XHQvLyB7XG5cdFx0Ly8gXHR0aGlzLmRpcmVjdGlvbiA9ICdzb3V0aCc7XG5cdFx0Ly8gfVxuXG5cdFx0bGV0IGZyYW1lcztcblxuXHRcdGlmKGZyYW1lcyA9IHRoaXMuc3ByaXRlW3RoaXMuc3RhdGVdW3RoaXMuZGlyZWN0aW9uXSlcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5zZXRGcmFtZXMoZnJhbWVzKTtcblx0XHR9XG5cdH1cblxuXHRkZXN0cm95KClcblx0e1xuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudW5pZm9ybSB2ZWM0IHVfY29sb3I7XFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKCkge1xcbiAgLy8gZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHZfdGV4Q29vcmQpO1xcbiAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgxLjAsIDEuMCwgMC4wLCAwLjI1KTtcXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKClcXG57XFxuICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247XFxuICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDtcXG4gIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTtcXG4gIHZfdGV4Q29vcmQgID0gYV90ZXhDb29yZDtcXG59XFxuXCIiLCJpbXBvcnQgeyBTdXJmYWNlIH0gZnJvbSAnLi9TdXJmYWNlJztcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4vQ2FtZXJhJztcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi9TcHJpdGVTaGVldCc7XG5cbmV4cG9ydCAgY2xhc3MgQmFja2dyb3VuZFxue1xuXHRjb25zdHJ1Y3RvcihzcHJpdGVCb2FyZCwgbWFwLCBsYXllciA9IDApXG5cdHtcblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IG5ldyBTcHJpdGVTaGVldDtcblxuXHRcdHRoaXMucGFuZXMgICAgICAgPSBbXTtcblx0XHR0aGlzLnBhbmVzWFkgICAgID0ge307XG5cdFx0dGhpcy5tYXhQYW5lcyAgICA9IDk7XG5cblx0XHR0aGlzLm1hcCAgICAgICAgID0gbWFwO1xuXHRcdHRoaXMubGF5ZXIgICAgICAgPSBsYXllcjtcblxuXHRcdHRoaXMudGlsZVdpZHRoICAgPSAzMjtcblx0XHR0aGlzLnRpbGVIZWlnaHQgID0gMzI7XG5cblx0XHR0aGlzLnN1cmZhY2VXaWR0aCA9IDU7XG5cdFx0dGhpcy5zdXJmYWNlSGVpZ2h0ID0gNTtcblx0fVxuXG5cdHJlbmRlclBhbmUoeCwgeSwgZm9yY2VVcGRhdGUpXG5cdHtcblx0XHRsZXQgcGFuZTtcblx0XHRsZXQgcGFuZVggPSB4ICogdGhpcy50aWxlV2lkdGggKiB0aGlzLnN1cmZhY2VXaWR0aCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cdFx0bGV0IHBhbmVZID0geSAqIHRoaXMudGlsZUhlaWdodCAqIHRoaXMuc3VyZmFjZUhlaWdodCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRpZih0aGlzLnBhbmVzWFlbcGFuZVhdICYmIHRoaXMucGFuZXNYWVtwYW5lWF1bcGFuZVldKVxuXHRcdHtcblx0XHRcdHBhbmUgPSB0aGlzLnBhbmVzWFlbcGFuZVhdW3BhbmVZXTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHBhbmUgPSBuZXcgU3VyZmFjZShcblx0XHRcdFx0dGhpcy5zcHJpdGVCb2FyZFxuXHRcdFx0XHQsIHRoaXMuc3ByaXRlU2hlZXRcblx0XHRcdFx0LCB0aGlzLm1hcFxuXHRcdFx0XHQsIHRoaXMuc3VyZmFjZVdpZHRoXG5cdFx0XHRcdCwgdGhpcy5zdXJmYWNlSGVpZ2h0XG5cdFx0XHRcdCwgcGFuZVhcblx0XHRcdFx0LCBwYW5lWVxuXHRcdFx0XHQsIHRoaXMubGF5ZXJcblx0XHRcdCk7XG5cblx0XHRcdGlmKCF0aGlzLnBhbmVzWFlbcGFuZVhdKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnBhbmVzWFlbcGFuZVhdID0ge307XG5cdFx0XHR9XG5cblx0XHRcdGlmKCF0aGlzLnBhbmVzWFlbcGFuZVhdW3BhbmVZXSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5wYW5lc1hZW3BhbmVYXVtwYW5lWV0gPSBwYW5lO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMucGFuZXMucHVzaChwYW5lKTtcblxuXHRcdGlmKHRoaXMucGFuZXMubGVuZ3RoID4gdGhpcy5tYXhQYW5lcylcblx0XHR7XG5cdFx0XHR0aGlzLnBhbmVzLnNoaWZ0KCk7XG5cdFx0fVxuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHR0aGlzLnBhbmVzLmxlbmd0aCA9IDA7XG5cblx0XHRjb25zdCBjZW50ZXJYID0gTWF0aC5mbG9vcihcblx0XHRcdChDYW1lcmEueCAvICh0aGlzLnN1cmZhY2VXaWR0aCAqIHRoaXMudGlsZVdpZHRoICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCkpICsgMFxuXHRcdCk7XG5cblx0XHRjb25zdCBjZW50ZXJZID0gTWF0aC5mbG9vcihcblx0XHRcdENhbWVyYS55IC8gKHRoaXMuc3VyZmFjZUhlaWdodCAqIHRoaXMudGlsZUhlaWdodCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwpICsgMFxuXHRcdCk7XG5cblx0XHRsZXQgcmFuZ2UgPSBbLTEsIDAsIDFdO1xuXG5cdFx0Zm9yKGxldCB4IGluIHJhbmdlKVxuXHRcdHtcblx0XHRcdGZvcihsZXQgeSBpbiByYW5nZSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5yZW5kZXJQYW5lKGNlbnRlclggKyByYW5nZVt4XSwgY2VudGVyWSArIHJhbmdlW3ldKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnBhbmVzLmZvckVhY2gocCA9PiBwLmRyYXcoKSk7XG5cdH1cblxuXHRyZXNpemUoeCwgeSlcblx0e1xuXHRcdGZvcihsZXQgaSBpbiB0aGlzLnBhbmVzWFkpXG5cdFx0e1xuXHRcdFx0Zm9yKGxldCBqIGluIHRoaXMucGFuZXNYWVtpXSlcblx0XHRcdHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMucGFuZXNYWVtpXVtqXTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR3aGlsZSh0aGlzLnBhbmVzLmxlbmd0aClcblx0XHR7XG5cdFx0XHR0aGlzLnBhbmVzLnBvcCgpO1xuXHRcdH1cblxuXHRcdHRoaXMuc3VyZmFjZVdpZHRoID0gTWF0aC5jZWlsKCh4IC8gdGhpcy50aWxlV2lkdGgpKTtcblx0XHR0aGlzLnN1cmZhY2VIZWlnaHQgPSBNYXRoLmNlaWwoKHkgLyB0aGlzLnRpbGVIZWlnaHQpKTtcblxuXHRcdHRoaXMuZHJhdygpO1xuXHR9XG5cblx0c2ltdWxhdGUoKVxuXHR7XG5cdFx0XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBDYW1lcmFcbntcblx0c3RhdGljIHggPSAwO1xuXHRzdGF0aWMgeSA9IDA7XG5cdHN0YXRpYyB3aWR0aCAgPSAwO1xuXHRzdGF0aWMgaGVpZ2h0ID0gMDtcbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSBcImN1cnZhdHVyZS9iYXNlL0JpbmRhYmxlXCI7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tIFwiLi9DYW1lcmFcIjtcblxuZXhwb3J0IGNsYXNzIFNwcml0ZVxue1xuXHRjb25zdHJ1Y3Rvcih7c3JjLCBzcHJpdGVCb2FyZCwgc3ByaXRlU2hlZXQsIHdpZHRoLCBoZWlnaHR9KVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cblx0XHR0aGlzLnogPSAwO1xuXHRcdHRoaXMueCA9IDA7XG5cdFx0dGhpcy55ID0gMDtcblxuXHRcdHRoaXMud2lkdGggID0gMzIgfHwgd2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSAzMiB8fCBoZWlnaHQ7XG5cdFx0dGhpcy5zY2FsZSAgPSAxO1xuXG5cdFx0dGhpcy5mcmFtZXMgPSBbXTtcblx0XHR0aGlzLmZyYW1lRGVsYXkgPSA0O1xuXHRcdHRoaXMuY3VycmVudERlbGF5ID0gdGhpcy5mcmFtZURlbGF5O1xuXHRcdHRoaXMuY3VycmVudEZyYW1lID0gMDtcblx0XHR0aGlzLmN1cnJlbnRGcmFtZXMgPSAnJztcblxuXHRcdHRoaXMuc3BlZWQgICAgPSAwO1xuXHRcdHRoaXMubWF4U3BlZWQgPSA4O1xuXG5cdFx0dGhpcy5tb3ZpbmcgPSBmYWxzZTtcblxuXHRcdHRoaXMuUklHSFRcdD0gMDtcblx0XHR0aGlzLkRPV05cdD0gMTtcblx0XHR0aGlzLkxFRlRcdD0gMjtcblx0XHR0aGlzLlVQXHRcdD0gMztcblxuXHRcdHRoaXMuRUFTVFx0PSB0aGlzLlJJR0hUO1xuXHRcdHRoaXMuU09VVEhcdD0gdGhpcy5ET1dOO1xuXHRcdHRoaXMuV0VTVFx0PSB0aGlzLkxFRlQ7XG5cdFx0dGhpcy5OT1JUSFx0PSB0aGlzLlVQO1xuXG5cdFx0dGhpcy5yZWdpb24gPSBbMCwgMCwgMCwgMV07XG5cblx0XHR0aGlzLnN0YW5kaW5nID0ge1xuXHRcdFx0J25vcnRoJzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX25vcnRoLnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ3NvdXRoJzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX3NvdXRoLnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ3dlc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdlYXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XVxuXHRcdH07XG5cblx0XHR0aGlzLndhbGtpbmcgPSB7XG5cdFx0XHQnbm9ydGgnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ19ub3J0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX25vcnRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX25vcnRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfbm9ydGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfbm9ydGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX25vcnRoLnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ3NvdXRoJzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfc291dGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19zb3V0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19zb3V0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3NvdXRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3NvdXRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19zb3V0aC5wbmcnXG5cblx0XHRcdF1cblx0XHRcdCwgJ3dlc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ193ZXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3dlc3QyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdlYXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfZWFzdDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19lYXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XVxuXHRcdH07XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0dGhpcy50ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50ZXh0dXJlKTtcblxuXHRcdGNvbnN0IHIgPSAoKSA9PiBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMjU1KTtcblx0XHRjb25zdCBwaXhlbCA9IG5ldyBVaW50OEFycmF5KFtyKCksIHIoKSwgcigpLCAyNTVdKTtcblxuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCAxXG5cdFx0XHQsIDFcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgcGl4ZWxcblx0XHQpO1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IHNwcml0ZVNoZWV0O1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldC5yZWFkeS50aGVuKChzaGVldCk9Pntcblx0XHRcdGNvbnN0IGZyYW1lID0gdGhpcy5zcHJpdGVTaGVldC5nZXRGcmFtZShzcmMpO1xuXG5cdFx0XHRpZihmcmFtZSlcblx0XHRcdHtcblx0XHRcdFx0U3ByaXRlLmxvYWRUZXh0dXJlKHRoaXMuc3ByaXRlQm9hcmQuZ2wyZCwgZnJhbWUpLnRoZW4oYXJncyA9PiB7XG5cdFx0XHRcdFx0dGhpcy50ZXh0dXJlID0gYXJncy50ZXh0dXJlO1xuXHRcdFx0XHRcdHRoaXMud2lkdGggPSBhcmdzLmltYWdlLndpZHRoICogdGhpcy5zY2FsZTtcblx0XHRcdFx0XHR0aGlzLmhlaWdodCA9IGFyZ3MuaW1hZ2UuaGVpZ2h0ICogdGhpcy5zY2FsZTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdHRoaXMuZnJhbWVEZWxheSA9IHRoaXMubWF4U3BlZWQgLSBNYXRoLmFicyh0aGlzLnNwZWVkKTtcblx0XHRpZih0aGlzLmZyYW1lRGVsYXkgPiB0aGlzLm1heFNwZWVkKVxuXHRcdHtcblx0XHRcdHRoaXMuZnJhbWVEZWxheSA9IHRoaXMubWF4U3BlZWQ7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5jdXJyZW50RGVsYXkgPD0gMClcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnJlbnREZWxheSA9IHRoaXMuZnJhbWVEZWxheTtcblx0XHRcdHRoaXMuY3VycmVudEZyYW1lKys7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnJlbnREZWxheS0tO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuY3VycmVudEZyYW1lID49IHRoaXMuZnJhbWVzLmxlbmd0aClcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnJlbnRGcmFtZSA9IHRoaXMuY3VycmVudEZyYW1lIC0gdGhpcy5mcmFtZXMubGVuZ3RoO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZyYW1lID0gdGhpcy5mcmFtZXNbIHRoaXMuY3VycmVudEZyYW1lIF07XG5cblx0XHRpZihmcmFtZSlcblx0XHR7XG5cdFx0XHR0aGlzLnRleHR1cmUgPSBmcmFtZS50ZXh0dXJlO1xuXHRcdFx0dGhpcy53aWR0aCAgPSBmcmFtZS53aWR0aCAqIHRoaXMuc2NhbGU7XG5cdFx0XHR0aGlzLmhlaWdodCA9IGZyYW1lLmhlaWdodCAqIHRoaXMuc2NhbGU7XG5cdFx0fVxuXG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGV4dHVyZSk7XG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQudGV4Q29vcmRCdWZmZXIpO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdDAuMCwgMC4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQxLjAsIDEuMCxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cdFx0Z2wudW5pZm9ybTRmKFxuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5yZWdpb25Mb2NhdGlvblxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGdsLnVuaWZvcm0yZihcblx0XHRcdHRoaXMuc2l6ZUxvY2F0aW9uXG5cdFx0XHQsIDEuMFxuXHRcdFx0LCAxLjBcblx0XHQpO1xuXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHR0aGlzLnggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICsgLUNhbWVyYS54ICsgKENhbWVyYS53aWR0aCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgLyAyKVxuXHRcdFx0LCB0aGlzLnkgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICsgLUNhbWVyYS55ICsgKENhbWVyYS5oZWlnaHQgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsIC8gMikgKyAtdGhpcy5oZWlnaHQgKiAwLjUgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIHRoaXMud2lkdGggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIHRoaXMuaGVpZ2h0ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd0J1ZmZlcik7XG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXG5cdFx0Z2wudW5pZm9ybTRmKHRoaXMuc3ByaXRlQm9hcmQucmVnaW9uTG9jYXRpb24sIC4uLk9iamVjdC5hc3NpZ24odGhpcy5yZWdpb24gfHwgWzAsIDAsIDBdLCB7MzogMX0pKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5lZmZlY3RCdWZmZXIpO1xuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblxuXHRcdGdsLnVuaWZvcm00Zihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVnaW9uTG9jYXRpb25cblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cdH1cblxuXHRzZXRGcmFtZXMoZnJhbWVTZWxlY3Rvcilcblx0e1xuXHRcdGxldCBmcmFtZXNJZCA9IGZyYW1lU2VsZWN0b3Iuam9pbignICcpO1xuXG5cdFx0aWYodGhpcy5jdXJyZW50RnJhbWVzID09PSBmcmFtZXNJZClcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5jdXJyZW50RnJhbWVzID0gZnJhbWVzSWQ7XG5cblx0XHRjb25zdCBsb2FkVGV4dHVyZSA9IGZyYW1lID0+IFNwcml0ZS5sb2FkVGV4dHVyZSh0aGlzLnNwcml0ZUJvYXJkLmdsMmQsIGZyYW1lKTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQucmVhZHkudGhlbihzaGVldCA9PiB7XG5cdFx0XHRjb25zdCBmcmFtZXMgPSBzaGVldC5nZXRGcmFtZXMoZnJhbWVTZWxlY3RvcikubWFwKFxuXHRcdFx0XHRmcmFtZSA9PiBsb2FkVGV4dHVyZShmcmFtZSkudGhlbihhcmdzID0+ICh7XG5cdFx0XHRcdFx0dGV4dHVyZTogIGFyZ3MudGV4dHVyZVxuXHRcdFx0XHRcdCwgd2lkdGg6ICBhcmdzLmltYWdlLndpZHRoXG5cdFx0XHRcdFx0LCBoZWlnaHQ6IGFyZ3MuaW1hZ2UuaGVpZ2h0XG5cdFx0XHRcdH0pKVxuXHRcdFx0KTtcblxuXHRcdFx0UHJvbWlzZS5hbGwoZnJhbWVzKS50aGVuKGZyYW1lcyA9PiB0aGlzLmZyYW1lcyA9IGZyYW1lcyk7XG5cblx0XHR9KTtcblx0fVxuXG5cdHN0YXRpYyBsb2FkVGV4dHVyZShnbDJkLCBpbWFnZVNyYylcblx0e1xuXHRcdGNvbnN0IGdsID0gZ2wyZC5jb250ZXh0O1xuXG5cdFx0aWYoIXRoaXMucHJvbWlzZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5wcm9taXNlcyA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMucHJvbWlzZXNbaW1hZ2VTcmNdKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb21pc2VzW2ltYWdlU3JjXTtcblx0XHR9XG5cblx0XHR0aGlzLnByb21pc2VzW2ltYWdlU3JjXSA9IFNwcml0ZS5sb2FkSW1hZ2UoaW1hZ2VTcmMpLnRoZW4oKGltYWdlKT0+e1xuXHRcdFx0Y29uc3QgdGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblxuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cblx0XHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHRcdCwgaW1hZ2Vcblx0XHRcdCk7XG5cblx0XHRcdHJldHVybiB7aW1hZ2UsIHRleHR1cmV9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcy5wcm9taXNlc1tpbWFnZVNyY107XG5cdH1cblxuXHRzdGF0aWMgbG9hZEltYWdlKHNyYylcblx0e1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpPT57XG5cdFx0XHRjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0aW1hZ2Uuc3JjICAgPSBzcmM7XG5cdFx0XHRpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKGV2ZW50KT0+e1xuXHRcdFx0XHRhY2NlcHQoaW1hZ2UpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodCwgdHJhbnNmb3JtID0gW10pXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQucG9zaXRpb25CdWZmZXIpO1xuXG5cdFx0Y29uc3QgeDEgPSB4O1xuXHRcdGNvbnN0IHkxID0geTtcblx0XHRjb25zdCB4MiA9IHggKyB3aWR0aDtcblx0XHRjb25zdCB5MiA9IHkgKyBoZWlnaHQ7XG5cblx0XHQvLyBjb25zdCBzID0gLTgwICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAqIE1hdGguc2luKHBlcmZvcm1hbmNlLm5vdygpIC8gNTAwKTtcblx0XHRjb25zdCBzID0gMDtcblxuXHRcdGNvbnN0IHBvaW50cyA9IG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEgKyBzLCB5MSxcblx0XHRcdHgyICsgcywgeTEsXG5cdFx0XHR4MSwgICAgIHkyLFxuXHRcdFx0eDEsICAgICB5Mixcblx0XHRcdHgyICsgcywgeTEsXG5cdFx0XHR4MiwgICAgIHkyLFxuXHRcdF0pO1xuXG5cdFx0Ly8gY29uc3QgbyA9IHRoaXMudHJhbnNsYXRlKHBvaW50cywgLXggKyAtd2lkdGggLyAyLCAteSArIC1oZWlnaHQvIDIpO1xuXHRcdC8vIGNvbnN0IHIgPSB0aGlzLnJvdGF0ZShvLCBwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDAgJSAoMiAqIE1hdGguUEkpKTtcblx0XHQvLyBjb25zdCB0ID0gdGhpcy50cmFuc2xhdGUociwgeCArIHdpZHRoIC8gMiwgeSArIGhlaWdodC8gMik7XG5cblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgcG9pbnRzLCBnbC5TVFJFQU1fRFJBVyk7XG5cdH1cblxuXHR0cmFuc2xhdGUocG9pbnRzLCBkeCwgZHkpXG5cdHtcblx0XHRjb25zdCBtYXRyaXggPSBbXG5cdFx0XHRbMSwgMCwgZHhdLFxuXHRcdFx0WzAsIDEsIGR5XSxcblx0XHRcdFswLCAwLCAgMV0sXG5cdFx0XTtcblxuXHRcdGNvbnN0IG91dHB1dCA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkgKz0gMilcblx0XHR7XG5cdFx0XHRjb25zdCBwb2ludCA9IFtwb2ludHNbaV0sIHBvaW50c1tpICsgMV0sIDFdO1xuXG5cdFx0XHRmb3IoY29uc3Qgcm93IG9mIG1hdHJpeClcblx0XHRcdHtcblx0XHRcdFx0b3V0cHV0LnB1c2goXG5cdFx0XHRcdFx0cG9pbnRbMF0gKiByb3dbMF1cblx0XHRcdFx0XHQrIHBvaW50WzFdICogcm93WzFdXG5cdFx0XHRcdFx0KyBwb2ludFsyXSAqIHJvd1syXVxuXHRcdFx0XHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkob3V0cHV0LmZpbHRlcigoXywgaykgPT4gKDEgKyBrKSAlIDMpKTtcblx0fVxuXG5cdHJvdGF0ZShwb2ludHMsIHRoZXRhKVxuXHR7XG5cdFx0Y29uc3QgcyA9IE1hdGguc2luKHRoZXRhKTtcblx0XHRjb25zdCBjID0gTWF0aC5jb3ModGhldGEpO1xuXG5cdFx0Y29uc3QgbWF0cml4ID0gW1xuXHRcdFx0W2MsIC1zLCAwXSxcblx0XHRcdFtzLCAgYywgMF0sXG5cdFx0XHRbMCwgIDAsIDFdLFxuXHRcdF07XG5cblx0XHRjb25zdCBvdXRwdXQgPSBbXTtcblxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpICs9IDIpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcG9pbnQgPSBbcG9pbnRzW2ldLCBwb2ludHNbaSArIDFdLCAxXTtcblxuXHRcdFx0Zm9yKGNvbnN0IHJvdyBvZiBtYXRyaXgpXG5cdFx0XHR7XG5cdFx0XHRcdG91dHB1dC5wdXNoKFxuXHRcdFx0XHRcdHBvaW50WzBdICogcm93WzBdXG5cdFx0XHRcdFx0KyBwb2ludFsxXSAqIHJvd1sxXVxuXHRcdFx0XHRcdCsgcG9pbnRbMl0gKiByb3dbMl1cblx0XHRcdFx0KVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBuZXcgRmxvYXQzMkFycmF5KG91dHB1dC5maWx0ZXIoKF8sIGspID0+ICgxICsgaykgJSAzKSk7XG5cdH1cblxuXHRzaGVlcigpXG5cdHtcblxuXHR9XG5cblxufVxuIiwiaW1wb3J0IHsgQmFnIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmFnJztcbmltcG9ydCB7IEJhY2tncm91bmQgIH0gZnJvbSAnLi9CYWNrZ3JvdW5kJztcblxuaW1wb3J0IHsgR2wyZCB9IGZyb20gJy4uL2dsMmQvR2wyZCc7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tICcuL0NhbWVyYSc7XG5pbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuL1Nwcml0ZSc7XG5pbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi9TcHJpdGVTaGVldCc7XG5cbmV4cG9ydCBjbGFzcyBTcHJpdGVCb2FyZFxue1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50LCBtYXApXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblxuXHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdHRoaXMuc3ByaXRlcyA9IG5ldyBCYWc7XG5cblx0XHR0aGlzLm1vdXNlID0ge1xuXHRcdFx0eDogbnVsbFxuXHRcdFx0LCB5OiBudWxsXG5cdFx0XHQsIGNsaWNrWDogbnVsbFxuXHRcdFx0LCBjbGlja1k6IG51bGxcblx0XHR9O1xuXG5cdFx0Q2FtZXJhLndpZHRoICA9IGVsZW1lbnQud2lkdGg7XG5cdFx0Q2FtZXJhLmhlaWdodCA9IGVsZW1lbnQuaGVpZ2h0O1xuXG5cdFx0dGhpcy5nbDJkID0gbmV3IEdsMmQoZWxlbWVudCk7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG5cdFx0Z2wuZW5hYmxlKGdsLkJMRU5EKTtcblxuXHRcdHRoaXMucHJvZ3JhbSA9IHRoaXMuZ2wyZC5jcmVhdGVQcm9ncmFtKFxuXHRcdFx0dGhpcy5nbDJkLmNyZWF0ZVNoYWRlcignc3ByaXRlL3RleHR1cmUudmVydCcpXG5cdFx0XHQsIHRoaXMuZ2wyZC5jcmVhdGVTaGFkZXIoJ3Nwcml0ZS90ZXh0dXJlLmZyYWcnKVxuXHRcdCk7XG5cblx0XHQvLyB0aGlzLm92ZXJsYXlQcm9ncmFtID0gdGhpcy5nbDJkLmNyZWF0ZVByb2dyYW0oXG5cdFx0Ly8gXHR0aGlzLmdsMmQuY3JlYXRlU2hhZGVyKCdvdmVybGF5L292ZXJsYXkudmVydCcpXG5cdFx0Ly8gXHQsIHRoaXMuZ2wyZC5jcmVhdGVTaGFkZXIoJ292ZXJsYXkvb3ZlcmxheS5mcmFnJylcblx0XHQvLyApO1xuXG5cdFx0Z2wudXNlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXG5cdFx0dGhpcy5wb3NpdGlvbkJ1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuXHRcdHRoaXMudGV4Q29vcmRCdWZmZXIgPSBnbC5jcmVhdGVCdWZmZXIoKTtcblx0XHR0aGlzLmVmZkNvb3JkQnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG5cblx0XHR0aGlzLnBvc2l0aW9uTG9jYXRpb24gPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLnByb2dyYW0sICdhX3Bvc2l0aW9uJyk7XG5cdFx0dGhpcy50ZXhDb29yZExvY2F0aW9uID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5wcm9ncmFtLCAnYV90ZXhDb29yZCcpO1xuXHRcdHRoaXMuZWZmQ29vcmRMb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ2FfZWZmQ29vcmQnKTtcblxuXHRcdHRoaXMuaW1hZ2VMb2NhdGlvbiAgICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfaW1hZ2UnKTtcblx0XHR0aGlzLmVmZmVjdExvY2F0aW9uICAgICA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sICd1X2VmZmVjdCcpO1xuXHRcdHRoaXMucmVzb2x1dGlvbkxvY2F0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfcmVzb2x1dGlvbicpO1xuXHRcdHRoaXMuY29sb3JMb2NhdGlvbiAgICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfY29sb3InKTtcblx0XHR0aGlzLnRpbGVQb3NMb2NhdGlvbiAgICA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sICd1X3RpbGVObycpO1xuXHRcdHRoaXMucmlwcGxlTG9jYXRpb24gICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfcmlwcGxlJyk7XG5cdFx0dGhpcy5zaXplTG9jYXRpb24gICAgICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV9zaXplJyk7XG5cdFx0dGhpcy5zY2FsZUxvY2F0aW9uICAgICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV9zY2FsZScpO1xuXHRcdHRoaXMucmVnaW9uTG9jYXRpb24gICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfcmVnaW9uJyk7XG5cdFx0dGhpcy5yZWN0TG9jYXRpb24gICAgICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV9yZWN0Jyk7XG5cblx0XHQvLyB0aGlzLm92ZXJsYXlMb2NhdGlvbiAgID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5vdmVybGF5UHJvZ3JhbSwgJ2FfcG9zaXRpb24nKTtcblx0XHQvLyB0aGlzLm92ZXJsYXlSZXNvbHV0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMub3ZlcmxheVByb2dyYW0sICd1X3Jlc29sdXRpb24nKTtcblx0XHQvLyB0aGlzLm92ZXJsYXlDb2xvciAgICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMub3ZlcmxheVByb2dyYW0sICd1X2NvbG9yJyk7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5wb3NpdGlvbkJ1ZmZlcik7XG5cdFx0Z2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy5wb3NpdGlvbkxvY2F0aW9uKTtcblx0XHRnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKFxuXHRcdFx0dGhpcy5wb3NpdGlvbkxvY2F0aW9uXG5cdFx0XHQsIDJcblx0XHRcdCwgZ2wuRkxPQVRcblx0XHRcdCwgZmFsc2Vcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHRoaXMudGV4Q29vcmRMb2NhdGlvbik7XG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMudGV4Q29vcmRCdWZmZXIpO1xuXHRcdGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoXG5cdFx0XHR0aGlzLnRleENvb3JkTG9jYXRpb25cblx0XHRcdCwgMlxuXHRcdFx0LCBnbC5GTE9BVFxuXHRcdFx0LCBmYWxzZVxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHQpO1xuXG5cdFx0dGhpcy5kcmF3TGF5ZXIgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5kcmF3TGF5ZXIpO1xuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCAxMDAwXG5cdFx0XHQsIDEwMDBcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbnVsbFxuXHRcdCk7XG5cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cblx0XHR0aGlzLmVmZmVjdExheWVyID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuZWZmZWN0TGF5ZXIpO1xuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCAxMDAwXG5cdFx0XHQsIDEwMDBcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbnVsbFxuXHRcdCk7XG5cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cblx0XHR0aGlzLmRyYXdCdWZmZXIgPSBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpO1xuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5kcmF3QnVmZmVyKTtcblx0XHRnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChcblx0XHRcdGdsLkZSQU1FQlVGRkVSXG5cdFx0XHQsIGdsLkNPTE9SX0FUVEFDSE1FTlQwXG5cdFx0XHQsIGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgdGhpcy5kcmF3TGF5ZXJcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHR0aGlzLmVmZmVjdEJ1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmVmZmVjdEJ1ZmZlcik7XG5cdFx0Z2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoXG5cdFx0XHRnbC5GUkFNRUJVRkZFUlxuXHRcdFx0LCBnbC5DT0xPUl9BVFRBQ0hNRU5UMFxuXHRcdFx0LCBnbC5URVhUVVJFXzJEXG5cdFx0XHQsIHRoaXMuZWZmZWN0TGF5ZXJcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxuXHRcdFx0J21vdXNlbW92ZScsIChldmVudCk9Pntcblx0XHRcdFx0dGhpcy5tb3VzZS54ID0gZXZlbnQuY2xpZW50WDtcblx0XHRcdFx0dGhpcy5tb3VzZS55ID0gZXZlbnQuY2xpZW50WTtcblx0XHRcdH1cblx0XHQpO1xuXG5cdFx0dGhpcy5zZWxlY3RlZCA9IHtcblx0XHRcdGxvY2FsWDogICAgbnVsbFxuXHRcdFx0LCBsb2NhbFk6ICBudWxsXG5cdFx0XHQsIGdsb2JhbFg6IG51bGxcblx0XHRcdCwgZ2xvYmFsWTogbnVsbFxuXHRcdFx0LCBzdGFydEdsb2JhbFg6IG51bGxcblx0XHRcdCwgc3RhcnRHbG9iYWxZOiBudWxsXG5cdFx0fTtcblxuXHRcdHRoaXMuc2VsZWN0ZWQgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUodGhpcy5zZWxlY3RlZCk7XG5cblx0XHR0aGlzLmJhY2tncm91bmQgID0gbmV3IEJhY2tncm91bmQodGhpcywgbWFwKTtcblx0XHRjb25zdCB3ID0gMTI4O1xuXHRcdGNvbnN0IHNwcml0ZVNoZWV0ID0gbmV3IFNwcml0ZVNoZWV0O1xuXG5cdFx0Zm9yKGNvbnN0IGkgaW4gQXJyYXkoMTYpLmZpbGwoKSlcblx0XHR7XG5cdFx0XHRjb25zdCBiYXJyZWwgPSBuZXcgU3ByaXRlKHtcblx0XHRcdFx0c3JjOiAnYmFycmVsLnBuZycsXG5cdFx0XHRcdHNwcml0ZUJvYXJkOiB0aGlzLFxuXHRcdFx0XHRzcHJpdGVTaGVldFxuXHRcdFx0fSk7XG5cdFx0XHRiYXJyZWwueCA9IDMyICsgKGkgKiAzMikgJSB3O1xuXHRcdFx0YmFycmVsLnkgPSBNYXRoLnRydW5jKChpICogMzIpIC8gdykgKiAzMjtcblx0XHRcdHRoaXMuc3ByaXRlcy5hZGQoYmFycmVsKTtcblx0XHR9XG5cblx0XHR0aGlzLnNwcml0ZXMuYWRkKHRoaXMuYmFja2dyb3VuZCk7XG5cblx0XHR0aGlzLmZvbGxvd2luZyA9IG51bGw7XG5cdH1cblxuXHR1bnNlbGVjdCgpXG5cdHtcblx0XHRpZih0aGlzLnNlbGVjdGVkLmxvY2FsWCA9PT0gbnVsbClcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZWxlY3RlZC5sb2NhbFggID0gbnVsbDtcblx0XHR0aGlzLnNlbGVjdGVkLmxvY2FsWSAgPSBudWxsO1xuXHRcdHRoaXMuc2VsZWN0ZWQuZ2xvYmFsWCA9IG51bGw7XG5cdFx0dGhpcy5zZWxlY3RlZC5nbG9iYWxZID0gbnVsbDtcblxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHRpZih0aGlzLmZvbGxvd2luZylcblx0XHR7XG5cdFx0XHRDYW1lcmEueCA9ICgxNiArIHRoaXMuZm9sbG93aW5nLnNwcml0ZS54KSAqIHRoaXMuZ2wyZC56b29tTGV2ZWwgfHwgMDtcblx0XHRcdENhbWVyYS55ID0gKDE2ICsgdGhpcy5mb2xsb3dpbmcuc3ByaXRlLnkpICogdGhpcy5nbDJkLnpvb21MZXZlbCB8fCAwO1xuXHRcdH1cblxuXHRcdGNvbnN0IGdsID0gdGhpcy5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuZWZmZWN0QnVmZmVyKTtcblxuXHRcdGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMCk7XG5cdFx0Z2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuZHJhd0J1ZmZlcik7XG5cblx0XHRnbC52aWV3cG9ydCgwLCAwLCBnbC5jYW52YXMud2lkdGgsIGdsLmNhbnZhcy5oZWlnaHQpO1xuXG5cdFx0Z2wudW5pZm9ybTJmKFxuXHRcdFx0dGhpcy5yZXNvbHV0aW9uTG9jYXRpb25cblx0XHRcdCwgZ2wuY2FudmFzLndpZHRoXG5cdFx0XHQsIGdsLmNhbnZhcy5oZWlnaHRcblx0XHQpO1xuXG5cdFx0Z2wudW5pZm9ybTNmKFxuXHRcdFx0dGhpcy5yaXBwbGVMb2NhdGlvblxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRnbC51bmlmb3JtMmYoXG5cdFx0XHR0aGlzLnNpemVMb2NhdGlvblxuXHRcdFx0LCBDYW1lcmEud2lkdGhcblx0XHRcdCwgQ2FtZXJhLmhlaWdodFxuXHRcdCk7XG5cblx0XHRnbC51bmlmb3JtMmYoXG5cdFx0XHR0aGlzLnNjYWxlTG9jYXRpb25cblx0XHRcdCwgdGhpcy5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCB0aGlzLmdsMmQuem9vbUxldmVsXG5cdFx0KTtcblxuXHRcdGdsLnVuaWZvcm00Zihcblx0XHRcdHRoaXMucmVnaW9uTG9jYXRpb25cblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRnbC5jbGVhckNvbG9yKDAsIDAsIDAsIDApO1xuXHRcdGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuXG5cdFx0bGV0IHNwcml0ZXMgPSB0aGlzLnNwcml0ZXMuaXRlbXMoKTtcblxuXHRcdHNwcml0ZXMuZm9yRWFjaChzID0+IHMueiA9IHMgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kID8gLTEgOiBzLnkpO1xuXG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZSgnc29ydCcpO1xuXG5cdFx0c3ByaXRlcy5zb3J0KChhLGIpID0+IHtcblx0XHRcdGlmKChhIGluc3RhbmNlb2YgQmFja2dyb3VuZCkgJiYgIShiIGluc3RhbmNlb2YgQmFja2dyb3VuZCkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblxuXHRcdFx0aWYoKGIgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSAmJiAhKGEgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGEueiA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGIueiA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGEueiAtIGIuejtcblx0XHR9KTtcblxuXHRcdGlmKHdpbmRvdy5zbVByb2ZpbGluZylcblx0XHR7XG5cdFx0XHRjb25zb2xlLnRpbWVFbmQoJ3NvcnQnKTtcblx0XHRcdHdpbmRvdy5zbVByb2ZpbGluZyA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdHNwcml0ZXMuZm9yRWFjaChzID0+IHMuZHJhdygpKTtcblxuXHRcdGdsLnVuaWZvcm0zZihcblx0XHRcdHRoaXMucmlwcGxlTG9jYXRpb25cblx0XHRcdCwgTWF0aC5QSSAvIDhcblx0XHRcdCwgcGVyZm9ybWFuY2Uubm93KCkgLyAyMDAgLy8gKyAtQ2FtZXJhLnlcblx0XHRcdCwgMVxuXHRcdCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5kcmF3TGF5ZXIpO1xuXHRcdGdsLnVuaWZvcm0xaSh0aGlzLmltYWdlTG9jYXRpb24sIDApO1xuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMSk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5lZmZlY3RMYXllcik7XG5cdFx0Z2wudW5pZm9ybTFpKHRoaXMuZWZmZWN0TG9jYXRpb24sIDEpO1xuXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHQwXG5cdFx0XHQsIHRoaXMuZ2wyZC5lbGVtZW50LmhlaWdodFxuXHRcdFx0LCB0aGlzLmdsMmQuZWxlbWVudC53aWR0aFxuXHRcdFx0LCAtdGhpcy5nbDJkLmVsZW1lbnQuaGVpZ2h0XG5cdFx0KTtcblxuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblxuXHRcdGdsLnVuaWZvcm0zZihcblx0XHRcdHRoaXMucmlwcGxlTG9jYXRpb25cblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHQpO1xuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG5cdFx0Z2wudW5pZm9ybTFpKHRoaXMuaW1hZ2VMb2NhdGlvbiwgMCk7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0XHRnbC51bmlmb3JtMWkodGhpcy5lZmZlY3RMb2NhdGlvbiwgMSk7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKTtcblxuXHR9XG5cblx0cmVzaXplKHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0d2lkdGggID0gd2lkdGggIHx8IHRoaXMuZ2wyZC5lbGVtZW50LndpZHRoO1xuXHRcdGhlaWdodCA9IGhlaWdodCB8fCB0aGlzLmdsMmQuZWxlbWVudC5oZWlnaHQ7XG5cblx0XHRDYW1lcmEueCAqPSB0aGlzLmdsMmQuem9vbUxldmVsO1xuXHRcdENhbWVyYS55ICo9IHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRDYW1lcmEud2lkdGggID0gd2lkdGggIC8gdGhpcy5nbDJkLnpvb21MZXZlbDtcblx0XHRDYW1lcmEuaGVpZ2h0ID0gaGVpZ2h0IC8gdGhpcy5nbDJkLnpvb21MZXZlbDtcblxuXHRcdHRoaXMuYmFja2dyb3VuZC5yZXNpemUoQ2FtZXJhLndpZHRoLCBDYW1lcmEuaGVpZ2h0KTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuZHJhd0xheWVyKTtcblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgQ2FtZXJhLndpZHRoICogdGhpcy5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCBDYW1lcmEuaGVpZ2h0ICogdGhpcy5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBudWxsXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuZWZmZWN0TGF5ZXIpO1xuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBDYW1lcmEud2lkdGggKiB0aGlzLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIENhbWVyYS5oZWlnaHQgKiB0aGlzLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIG51bGxcblx0XHQpO1xuXHR9XG5cblx0c2V0UmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMucG9zaXRpb25CdWZmZXIpO1xuXG5cdFx0Y29uc3QgeDEgPSB4O1xuXHRcdGNvbnN0IHgyID0geCArIHdpZHRoO1xuXHRcdGNvbnN0IHkxID0geTtcblx0XHRjb25zdCB5MiA9IHkgKyBoZWlnaHQ7XG5cblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XSksIGdsLlNUUkVBTV9EUkFXKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIFNwcml0ZVNoZWV0XG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHRoaXMuaW1hZ2VVcmwgPSAnL3Nwcml0ZXNoZWV0LnBuZyc7XG5cdFx0dGhpcy5ib3hlc1VybCA9ICcvc3ByaXRlc2hlZXQuanNvbic7XG5cdFx0dGhpcy52ZXJ0aWNlcyA9IHt9O1xuXHRcdHRoaXMuZnJhbWVzICAgPSB7fTtcblx0XHR0aGlzLndpZHRoICAgID0gMDtcblx0XHR0aGlzLmhlaWdodCAgID0gMDtcblxuXHRcdGxldCByZXF1ZXN0ICAgPSBuZXcgUmVxdWVzdCh0aGlzLmJveGVzVXJsKTtcblxuXHRcdGxldCBzaGVldExvYWRlciA9IGZldGNoKHJlcXVlc3QpXG5cdFx0LnRoZW4oKHJlc3BvbnNlKT0+cmVzcG9uc2UuanNvbigpKVxuXHRcdC50aGVuKChib3hlcykgPT4gdGhpcy5ib3hlcyA9IGJveGVzKTtcblxuXHRcdGxldCBpbWFnZUxvYWRlciA9IG5ldyBQcm9taXNlKChhY2NlcHQpPT57XG5cdFx0XHR0aGlzLmltYWdlICAgICAgICA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0dGhpcy5pbWFnZS5zcmMgICAgPSB0aGlzLmltYWdlVXJsO1xuXHRcdFx0dGhpcy5pbWFnZS5vbmxvYWQgPSAoKT0+e1xuXHRcdFx0XHRhY2NlcHQoKTtcblx0XHRcdH07XG5cdFx0fSk7XG5cblx0XHR0aGlzLnJlYWR5ID0gUHJvbWlzZS5hbGwoW3NoZWV0TG9hZGVyLCBpbWFnZUxvYWRlcl0pXG5cdFx0LnRoZW4oKCkgPT4gdGhpcy5wcm9jZXNzSW1hZ2UoKSlcblx0XHQudGhlbigoKSA9PiB0aGlzKTtcblx0fVxuXG5cdHByb2Nlc3NJbWFnZSgpXG5cdHtcblx0XHRpZighdGhpcy5ib3hlcyB8fCAhdGhpcy5ib3hlcy5mcmFtZXMpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNhbnZhcyAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblxuXHRcdGNhbnZhcy53aWR0aCAgPSB0aGlzLmltYWdlLndpZHRoO1xuXHRcdGNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlLmhlaWdodDtcblxuXHRcdGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIsIHt3aWxsUmVhZEZyZXF1ZW50bHk6IHRydWV9KTtcblxuXHRcdGNvbnRleHQuZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIDAsIDApO1xuXG5cdFx0Y29uc3QgZnJhbWVQcm9taXNlcyA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpIGluIHRoaXMuYm94ZXMuZnJhbWVzKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN1YkNhbnZhcyAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblxuXHRcdFx0c3ViQ2FudmFzLndpZHRoICA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnc7XG5cdFx0XHRzdWJDYW52YXMuaGVpZ2h0ID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaDtcblxuXHRcdFx0Y29uc3Qgc3ViQ29udGV4dCA9IHN1YkNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cblx0XHRcdGlmKHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lKVxuXHRcdFx0e1xuXHRcdFx0XHRzdWJDb250ZXh0LnB1dEltYWdlRGF0YShjb250ZXh0LmdldEltYWdlRGF0YShcblx0XHRcdFx0XHR0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS54XG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS55XG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53XG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oXG5cdFx0XHRcdCksIDAsIDApO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLmJveGVzLmZyYW1lc1tpXS50ZXh0KVxuXHRcdFx0e1xuXHRcdFx0XHRzdWJDb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmNvbG9yIHx8ICd3aGl0ZSc7XG5cblx0XHRcdFx0c3ViQ29udGV4dC5mb250ID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZm9udFxuXHRcdFx0XHRcdHx8IGAke3RoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmh9cHggc2Fucy1zZXJpZmA7XG5cdFx0XHRcdHN1YkNvbnRleHQudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cblx0XHRcdFx0c3ViQ29udGV4dC5maWxsVGV4dChcblx0XHRcdFx0XHR0aGlzLmJveGVzLmZyYW1lc1tpXS50ZXh0XG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53IC8gMlxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaFxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUud1xuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdHN1YkNvbnRleHQudGV4dEFsaWduID0gbnVsbDtcblx0XHRcdFx0c3ViQ29udGV4dC5mb250ICAgICAgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRmcmFtZVByb21pc2VzLnB1c2gobmV3IFByb21pc2UoKGFjY2VwdCk9Pntcblx0XHRcdFx0c3ViQ2FudmFzLnRvQmxvYigoYmxvYik9Pntcblx0XHRcdFx0XHR0aGlzLmZyYW1lc1t0aGlzLmJveGVzLmZyYW1lc1tpXS5maWxlbmFtZV0gPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXG5cdFx0XHRcdFx0YWNjZXB0KHRoaXMuZnJhbWVzW3RoaXMuYm94ZXMuZnJhbWVzW2ldLmZpbGVuYW1lXSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSkpO1xuXG5cblx0XHRcdC8vIGxldCB1MSA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnggLyB0aGlzLmltYWdlLndpZHRoO1xuXHRcdFx0Ly8gbGV0IHYxID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueSAvIHRoaXMuaW1hZ2UuaGVpZ2h0O1xuXG5cdFx0XHQvLyBsZXQgdTIgPSAodGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueCArIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLncpXG5cdFx0XHQvLyBcdC8gdGhpcy5pbWFnZS53aWR0aDtcblxuXHRcdFx0Ly8gbGV0IHYyID0gKHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnkgKyB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oKVxuXHRcdFx0Ly8gXHQvIHRoaXMuaW1hZ2UuaGVpZ2h0O1xuXG5cdFx0XHQvLyB0aGlzLnZlcnRpY2VzW3RoaXMuYm94ZXMuZnJhbWVzW2ldLmZpbGVuYW1lXSA9IHtcblx0XHRcdC8vIFx0dTEsdjEsdTIsdjJcblx0XHRcdC8vIH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKGZyYW1lUHJvbWlzZXMpO1xuXHR9XG5cblx0Z2V0VmVydGljZXMoZmlsZW5hbWUpXG5cdHtcblx0XHRyZXR1cm4gdGhpcy52ZXJ0aWNlc1tmaWxlbmFtZV07XG5cdH1cblxuXHRnZXRGcmFtZShmaWxlbmFtZSlcblx0e1xuXHRcdHJldHVybiB0aGlzLmZyYW1lc1tmaWxlbmFtZV07XG5cdH1cblxuXHRnZXRGcmFtZXMoZnJhbWVTZWxlY3Rvcilcblx0e1xuXHRcdGlmKEFycmF5LmlzQXJyYXkoZnJhbWVTZWxlY3RvcikpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZyYW1lU2VsZWN0b3IubWFwKChuYW1lKT0+dGhpcy5nZXRGcmFtZShuYW1lKSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuZ2V0RnJhbWVzQnlQcmVmaXgoZnJhbWVTZWxlY3Rvcik7XG5cdH1cblxuXHRnZXRGcmFtZXNCeVByZWZpeChwcmVmaXgpXG5cdHtcblx0XHRsZXQgZnJhbWVzID0gW107XG5cblx0XHRmb3IobGV0IGkgaW4gdGhpcy5mcmFtZXMpXG5cdFx0e1xuXHRcdFx0aWYoaS5zdWJzdHJpbmcoMCwgcHJlZml4Lmxlbmd0aCkgIT09IHByZWZpeClcblx0XHRcdHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGZyYW1lcy5wdXNoKHRoaXMuZnJhbWVzW2ldKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZnJhbWVzO1xuXHR9XG5cblx0c3RhdGljIGxvYWRUZXh0dXJlKGdsMmQsIGltYWdlU3JjKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSBnbDJkLmNvbnRleHQ7XG5cblx0XHRpZighdGhpcy50ZXh0dXJlUHJvbWlzZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy50ZXh0dXJlUHJvbWlzZXMgPSB7fTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnRleHR1cmVQcm9taXNlc1tpbWFnZVNyY10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudGV4dHVyZVByb21pc2VzW2ltYWdlU3JjXTtcblx0XHR9XG5cblx0XHRjb25zdCB0ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0cmV0dXJuIHRoaXMudGV4dHVyZVByb21pc2VzW2ltYWdlU3JjXSA9IHRoaXMubG9hZEltYWdlKGltYWdlU3JjKS50aGVuKGltYWdlID0+IHtcblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG5cdFx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0XHQsIGltYWdlXG5cdFx0XHQpO1xuXG5cdFx0XHQvKi9cblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0XHQvKi9cblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLlJFUEVBVCk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5SRVBFQVQpO1xuXHRcdFx0Ly8qL1xuXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cblx0XHRcdHJldHVybiB7aW1hZ2UsIHRleHR1cmV9XG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgbG9hZEltYWdlKHNyYylcblx0e1xuXHRcdGlmKCF0aGlzLmltYWdlUHJvbWlzZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5pbWFnZVByb21pc2VzID0ge307XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5pbWFnZVByb21pc2VzW3NyY10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdO1xuXHRcdH1cblxuXHRcdHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdID0gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KT0+e1xuXHRcdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdGltYWdlLnNyYyAgID0gc3JjO1xuXHRcdFx0aW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldmVudCk9Pntcblx0XHRcdFx0YWNjZXB0KGltYWdlKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4vQ2FtZXJhJztcblxuZXhwb3J0IGNsYXNzIFN1cmZhY2Vcbntcblx0Y29uc3RydWN0b3Ioc3ByaXRlQm9hcmQsIHNwcml0ZVNoZWV0LCBtYXAsIHhTaXplID0gMiwgeVNpemUgPSAyLCB4T2Zmc2V0ID0gMCwgeU9mZnNldCA9IDAsIGxheWVyID0gMCwgeiA9IC0xKVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IHNwcml0ZVNoZWV0O1xuXG5cdFx0dGhpcy54ID0geE9mZnNldDtcblx0XHR0aGlzLnkgPSB5T2Zmc2V0O1xuXHRcdHRoaXMueiA9IHo7XG5cblx0XHR0aGlzLmxheWVyID0gbGF5ZXI7XG5cdFx0dGhpcy54U2l6ZSA9IHhTaXplO1xuXHRcdHRoaXMueVNpemUgPSB5U2l6ZTtcblxuXHRcdHRoaXMudGlsZVdpZHRoICA9IDMyO1xuXHRcdHRoaXMudGlsZUhlaWdodCA9IDMyO1xuXG5cdFx0dGhpcy53aWR0aCAgPSB0aGlzLnhTaXplICogdGhpcy50aWxlV2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSB0aGlzLnlTaXplICogdGhpcy50aWxlSGVpZ2h0O1xuXG5cdFx0dGhpcy5tYXAgPSBtYXA7XG5cblx0XHR0aGlzLnRleFZlcnRpY2VzID0gW107XG5cblxuXHRcdHRoaXMuc3ViVGV4dHVyZXMgPSB7fTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQucmVhZHkudGhlbihzaGVldCA9PiB0aGlzLmJ1aWxkVGlsZXMoKSk7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0dGhpcy5wYW5lID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5wYW5lKTtcblxuXHRcdGNvbnN0IHIgPSAoKSA9PiBwYXJzZUludChNYXRoLnJhbmRvbSgpKjI1NSk7XG5cdFx0Y29uc3QgcGl4ZWwgPSBuZXcgVWludDhBcnJheShbcigpLCByKCksIHIoKSwgMjU1XSk7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIDFcblx0XHRcdCwgMVxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBwaXhlbFxuXHRcdCk7XG5cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblxuXHRcdC8vKi9cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdC8qL1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5MSU5FQVIpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5MSU5FQVIpO1xuXHRcdC8vKi9cblxuXHRcdHRoaXMuZnJhbWVCdWZmZXIgPSBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpO1xuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5mcmFtZUJ1ZmZlcik7XG5cdFx0Z2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoXG5cdFx0XHRnbC5GUkFNRUJVRkZFUlxuXHRcdFx0LCBnbC5DT0xPUl9BVFRBQ0hNRU5UMFxuXHRcdFx0LCBnbC5URVhUVVJFXzJEXG5cdFx0XHQsIHRoaXMucGFuZVxuXHRcdFx0LCAwXG5cdFx0KTtcblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMucGFuZSk7XG5cblx0XHRjb25zdCB4ID0gdGhpcy54ICsgLUNhbWVyYS54ICsgKENhbWVyYS53aWR0aCAgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsIC8gMik7XG5cdFx0Y29uc3QgeSA9IHRoaXMueSArIC1DYW1lcmEueSArIChDYW1lcmEuaGVpZ2h0ICAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgLyAyKTtcblxuXHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0eFxuXHRcdFx0LCB5XG5cdFx0XHQsIHRoaXMud2lkdGggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIHRoaXMuaGVpZ2h0ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd0J1ZmZlcik7XG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHR9XG5cblx0YnVpbGRUaWxlcygpXG5cdHtcblx0XHRsZXQgdGV4dHVyZVByb21pc2VzID0gW107XG5cdFx0Y29uc3Qgc2l6ZSA9IHRoaXMueFNpemUgKiB0aGlzLnlTaXplO1xuXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKylcblx0XHR7XG5cdFx0XHRsZXQgbG9jYWxYICA9IGkgJSB0aGlzLnhTaXplO1xuXHRcdFx0bGV0IG9mZnNldFggPSBNYXRoLmZsb29yKHRoaXMueCAvIHRoaXMudGlsZVdpZHRoKTtcblx0XHRcdGxldCBnbG9iYWxYID0gbG9jYWxYICsgb2Zmc2V0WDtcblxuXHRcdFx0bGV0IGxvY2FsWSAgPSBNYXRoLmZsb29yKGkgLyB0aGlzLnhTaXplKTtcblx0XHRcdGxldCBvZmZzZXRZID0gTWF0aC5mbG9vcih0aGlzLnkgLyB0aGlzLnRpbGVIZWlnaHQpO1xuXHRcdFx0bGV0IGdsb2JhbFkgPSBsb2NhbFkgKyBvZmZzZXRZO1xuXG5cdFx0XHRsZXQgZnJhbWVzID0gdGhpcy5tYXAuZ2V0VGlsZShnbG9iYWxYLCBnbG9iYWxZLCB0aGlzLmxheWVyKTtcblxuXHRcdFx0Y29uc3QgbG9hZFRleHR1cmUgPSBmcmFtZSA9PiB0aGlzLnNwcml0ZVNoZWV0LmNvbnN0cnVjdG9yLmxvYWRUZXh0dXJlKHRoaXMuc3ByaXRlQm9hcmQuZ2wyZCwgZnJhbWUpO1xuXG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGZyYW1lcykpXG5cdFx0XHR7XG5cdFx0XHRcdGxldCBqID0gMDtcblx0XHRcdFx0dGhpcy5zdWJUZXh0dXJlc1tpXSA9IFtdO1xuXHRcdFx0XHR0ZXh0dXJlUHJvbWlzZXMucHVzaChcblx0XHRcdFx0XHRQcm9taXNlLmFsbChmcmFtZXMubWFwKChmcmFtZSk9PlxuXHRcdFx0XHRcdFx0bG9hZFRleHR1cmUoZnJhbWUpLnRoZW4oXG5cdFx0XHRcdFx0XHRcdGFyZ3MgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc3ViVGV4dHVyZXNbaV1bal0gPSBhcmdzLnRleHR1cmU7XG5cdFx0XHRcdFx0XHRcdFx0aisrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHQpKTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGV4dHVyZVByb21pc2VzLnB1c2goXG5cdFx0XHRcdFx0bG9hZFRleHR1cmUoZnJhbWVzKS50aGVuKGFyZ3MgPT4gdGhpcy5zdWJUZXh0dXJlc1tpXSA9IGFyZ3MudGV4dHVyZSlcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRQcm9taXNlLmFsbCh0ZXh0dXJlUHJvbWlzZXMpLnRoZW4oKCkgPT4gdGhpcy5hc3NlbWJsZSgpKTtcblx0fVxuXG5cdGFzc2VtYmxlKClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnBhbmUpO1xuXG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkQsXG5cdFx0XHQwLFxuXHRcdFx0Z2wuUkdCQSxcblx0XHRcdHRoaXMud2lkdGgsXG5cdFx0XHR0aGlzLmhlaWdodCxcblx0XHRcdDAsXG5cdFx0XHRnbC5SR0JBLFxuXHRcdFx0Z2wuVU5TSUdORURfQllURSxcblx0XHRcdG51bGwsXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuc3ViVGV4dHVyZXNbMF1bMF0pO1xuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5mcmFtZUJ1ZmZlcik7XG5cdFx0Z2wudmlld3BvcnQoMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuXHRcdC8vIGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMSk7XG5cdFx0Z2wuY2xlYXJDb2xvcihNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpLCAxKTtcblx0XHRnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUIHwgZ2wuREVQVEhfQlVGRkVSX0JJVCk7XG5cblx0XHRnbC51bmlmb3JtNGYoXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmNvbG9yTG9jYXRpb25cblx0XHRcdCwgMVxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMVxuXHRcdCk7XG5cblx0XHRnbC51bmlmb3JtM2YoXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnRpbGVQb3NMb2NhdGlvblxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRnbC51bmlmb3JtMmYoXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc29sdXRpb25Mb2NhdGlvblxuXHRcdFx0LCB0aGlzLndpZHRoXG5cdFx0XHQsIHRoaXMuaGVpZ2h0XG5cdFx0KTtcblxuXHRcdGdsLnVuaWZvcm0yZihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuc2l6ZUxvY2F0aW9uXG5cdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHQpO1xuXG5cdFx0Z2wudW5pZm9ybTNmKFxuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5yaXBwbGVMb2NhdGlvblxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRpZih0aGlzLnN1YlRleHR1cmVzWzBdWzBdKVxuXHRcdHtcblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuc3ViVGV4dHVyZXNbMF1bMF0pO1xuXHRcdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQudGV4Q29vcmRCdWZmZXIpO1xuXHRcdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0XHQwLjAsICAgICAgICAgICAgICAwLjAsXG5cdFx0XHRcdHRoaXMud2lkdGggLyAzMiwgIDAuMCxcblx0XHRcdFx0MC4wLCAgICAgICAgICAgICAgLXRoaXMuaGVpZ2h0IC8gMzIsXG5cdFx0XHRcdDAuMCwgICAgICAgICAgICAgIC10aGlzLmhlaWdodCAvIDMyLFxuXHRcdFx0XHR0aGlzLndpZHRoIC8gMzIsICAwLjAsXG5cdFx0XHRcdHRoaXMud2lkdGggLyAzMiwgIC10aGlzLmhlaWdodCAvIDMyLFxuXHRcdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblxuXHRcdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHRcdDBcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgdGhpcy53aWR0aFxuXHRcdFx0XHQsIHRoaXMuaGVpZ2h0XG5cdFx0XHQpO1xuXG5cdFx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cdFx0fVxuXG5cdFx0Ly8gZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcblx0XHRyZXR1cm47XG5cblx0XHRmb3IobGV0IGkgaW4gdGhpcy5zdWJUZXh0dXJlcylcblx0XHR7XG5cdFx0XHRpID0gTnVtYmVyKGkpO1xuXHRcdFx0Y29uc3QgeCA9IChpICogdGhpcy50aWxlV2lkdGgpICUgdGhpcy53aWR0aDtcblx0XHRcdGNvbnN0IHkgPSBNYXRoLnRydW5jKGkgKiB0aGlzLnRpbGVXaWR0aCAvIHRoaXMud2lkdGgpICogdGhpcy50aWxlV2lkdGg7XG5cblx0XHRcdGlmKCFBcnJheS5pc0FycmF5KHRoaXMuc3ViVGV4dHVyZXNbaV0pKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnN1YlRleHR1cmVzW2ldID0gW3RoaXMuc3ViVGV4dHVyZXNbaV1dO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IobGV0IGogaW4gdGhpcy5zdWJUZXh0dXJlc1tpXSlcblx0XHRcdHtcblx0XHRcdFx0Z2wudW5pZm9ybTNmKFxuXHRcdFx0XHRcdHRoaXMuc3ByaXRlQm9hcmQudGlsZVBvc0xvY2F0aW9uXG5cdFx0XHRcdFx0LCBOdW1iZXIoaSlcblx0XHRcdFx0XHQsIE9iamVjdC5rZXlzKHRoaXMuc3ViVGV4dHVyZXMpLmxlbmd0aFxuXHRcdFx0XHRcdCwgMVxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLnRleENvb3JkQnVmZmVyKTtcblx0XHRcdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0XHRcdDAuMCwgMC4wLFxuXHRcdFx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0XHRcdDEuMCwgMS4wLFxuXHRcdFx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cdFx0XHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0XHRcdHhcblx0XHRcdFx0XHQsIHkgKyB0aGlzLnRpbGVIZWlnaHRcblx0XHRcdFx0XHQsIHRoaXMudGlsZVdpZHRoXG5cdFx0XHRcdFx0LCAtdGhpcy50aWxlSGVpZ2h0XG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGdsLnVuaWZvcm0zZihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQudGlsZVBvc0xvY2F0aW9uXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cdH1cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5wb3NpdGlvbkJ1ZmZlcik7XG5cblx0XHRjb25zdCB4MSA9IHg7XG5cdFx0Y29uc3QgeDIgPSAoeCArIHdpZHRoKTtcblx0XHRjb25zdCB5MSA9IHk7XG5cdFx0Y29uc3QgeTIgPSAoeSArIGhlaWdodCk7XG5cblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIFRleHR1cmVCYW5rXG57XG5cdFxufSIsIm1vZHVsZS5leHBvcnRzID0gXCIvLyB0ZXh0dXJlLmZyYWdcXG4jZGVmaW5lIE1fUEkgMy4xNDE1OTI2NTM1ODk3OTMyMzg0NjI2NDMzODMyNzk1XFxuI2RlZmluZSBNX1RBVSBNX1BJIC8gMi4wXFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTtcXG51bmlmb3JtIHNhbXBsZXIyRCB1X2VmZmVjdDtcXG5cXG52YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDtcXG52YXJ5aW5nIHZlYzIgdl9wb3NpdGlvbjtcXG5cXG51bmlmb3JtIHZlYzQgdV9jb2xvcjtcXG51bmlmb3JtIHZlYzMgdV90aWxlTm87XFxudW5pZm9ybSB2ZWMzIHVfcmlwcGxlO1xcbnVuaWZvcm0gdmVjMiB1X3NpemU7XFxudW5pZm9ybSB2ZWMyIHVfcmVjdDtcXG51bmlmb3JtIHZlYzIgdV9zY2FsZTtcXG51bmlmb3JtIHZlYzQgdV9yZWdpb247XFxuXFxuZmxvYXQgbWFza2VkID0gMC4wO1xcbmZsb2F0IHNvcnRlZCA9IDEuMDtcXG5mbG9hdCBkaXNwbGFjZSA9IDEuMDtcXG5mbG9hdCBibHVyID0gMS4wO1xcblxcbnZlYzIgcmlwcGxlWCh2ZWMyIHRleENvb3JkLCBmbG9hdCBhLCBmbG9hdCBiLCBmbG9hdCBjKSB7XFxuICB2ZWMyIHJpcHBsZWQgPSB2ZWMyKFxcbiAgICB2X3RleENvb3JkLnggKyBzaW4odl90ZXhDb29yZC55ICogKGEgKiB1X3NpemUueSkgKyBiKSAqIGMgLyB1X3NpemUueCxcXG4gICAgdl90ZXhDb29yZC55XFxuICApO1xcblxcbiAgaWYgKHJpcHBsZWQueCA8IDAuMCkge1xcbiAgICByaXBwbGVkLnggPSBhYnMocmlwcGxlZC54KTtcXG4gIH1cXG4gIGVsc2UgaWYgKHJpcHBsZWQueCA+IHVfc2l6ZS54KSB7XFxuICAgIHJpcHBsZWQueCA9IHVfc2l6ZS54IC0gKHJpcHBsZWQueCAtIHVfc2l6ZS54KTtcXG4gIH1cXG5cXG4gIHJldHVybiByaXBwbGVkO1xcbn1cXG5cXG52ZWMyIHJpcHBsZVkodmVjMiB0ZXhDb29yZCwgZmxvYXQgYSwgZmxvYXQgYiwgZmxvYXQgYykge1xcbiAgdmVjMiByaXBwbGVkID0gdmVjMih2X3RleENvb3JkLngsIHZfdGV4Q29vcmQueSArIHNpbih2X3RleENvb3JkLnggKiAoYSAqIHVfc2l6ZS54KSArIGIpICogYyAvIHVfc2l6ZS55KTtcXG5cXG4gIGlmIChyaXBwbGVkLnkgPCAwLjApIHtcXG4gICAgcmlwcGxlZC54ID0gYWJzKHJpcHBsZWQueCk7XFxuICB9XFxuICBlbHNlIGlmIChyaXBwbGVkLnkgPiB1X3NpemUueSkge1xcbiAgICByaXBwbGVkLnkgPSB1X3NpemUueSAtIChyaXBwbGVkLnkgLSB1X3NpemUueSk7XFxuICB9XFxuXFxuICByZXR1cm4gcmlwcGxlZDtcXG59XFxuXFxudmVjNCBtb3Rpb25CbHVyKHNhbXBsZXIyRCBpbWFnZSwgZmxvYXQgYW5nbGUsIGZsb2F0IG1hZ25pdHVkZSwgdmVjMiB0ZXh0Q29vcmQpIHtcXG4gIHZlYzQgb3JpZ2luYWxDb2xvciA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkKTtcXG4gIHZlYzQgZGlzcENvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG5cXG4gIGNvbnN0IGZsb2F0IG1heCA9IDEwLjA7XFxuICBmbG9hdCB3ZWlnaHQgPSAwLjg1O1xcblxcbiAgZm9yIChmbG9hdCBpID0gMC4wOyBpIDwgbWF4OyBpICs9IDEuMCkge1xcbiAgICBpZihpID4gYWJzKG1hZ25pdHVkZSkgfHwgb3JpZ2luYWxDb2xvci5hIDwgMS4wKSB7XFxuICAgICAgYnJlYWs7XFxuICAgIH1cXG4gICAgdmVjNCBkaXNwQ29sb3JEb3duID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQgKyB2ZWMyKFxcbiAgICAgIGNvcyhhbmdsZSkgKiBpICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLngsXFxuICAgICAgc2luKGFuZ2xlKSAqIGkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueVxcbiAgICApKTtcXG4gICAgZGlzcENvbG9yID0gZGlzcENvbG9yICogKDEuMCAtIHdlaWdodCkgKyBkaXNwQ29sb3JEb3duICogd2VpZ2h0O1xcbiAgICB3ZWlnaHQgKj0gMC44O1xcbiAgfVxcblxcbiAgcmV0dXJuIGRpc3BDb2xvcjtcXG59XFxuXFxudmVjNCBsaW5lYXJCbHVyKHNhbXBsZXIyRCBpbWFnZSwgZmxvYXQgYW5nbGUsIGZsb2F0IG1hZ25pdHVkZSwgdmVjMiB0ZXh0Q29vcmQpIHtcXG4gIHZlYzQgb3JpZ2luYWxDb2xvciA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkKTtcXG4gIHZlYzQgZGlzcENvbG9yID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQpO1xcblxcbiAgY29uc3QgZmxvYXQgbWF4ID0gMTAuMDtcXG4gIGZsb2F0IHdlaWdodCA9IDAuNjU7XFxuXFxuICBmb3IgKGZsb2F0IGkgPSAwLjA7IGkgPCBtYXg7IGkgKz0gMC4yNSkge1xcbiAgICBpZihpID4gYWJzKG1hZ25pdHVkZSkpIHtcXG4gICAgICBicmVhaztcXG4gICAgfVxcbiAgICB2ZWM0IGRpc3BDb2xvclVwID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQgKyB2ZWMyKFxcbiAgICAgIGNvcyhhbmdsZSkgKiAtaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS54LFxcbiAgICAgIHNpbihhbmdsZSkgKiAtaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS55XFxuICAgICkpO1xcbiAgICB2ZWM0IGRpc3BDb2xvckRvd24gPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCArIHZlYzIoXFxuICAgICAgY29zKGFuZ2xlKSAqIGkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueCxcXG4gICAgICBzaW4oYW5nbGUpICogaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS55XFxuICAgICkpO1xcbiAgICBkaXNwQ29sb3IgPSBkaXNwQ29sb3IgKiAoMS4wIC0gd2VpZ2h0KSArIGRpc3BDb2xvckRvd24gKiB3ZWlnaHQgKiAwLjUgKyBkaXNwQ29sb3JVcCAqIHdlaWdodCAqIDAuNTtcXG4gICAgd2VpZ2h0ICo9IDAuNzA7XFxuICB9XFxuXFxuICByZXR1cm4gZGlzcENvbG9yO1xcbn1cXG5cXG52b2lkIG1haW4oKSB7XFxuICB2ZWM0IG9yaWdpbmFsQ29sb3IgPSB0ZXh0dXJlMkQodV9pbWFnZSwgdl90ZXhDb29yZCk7XFxuICB2ZWM0IGVmZmVjdENvbG9yID0gdGV4dHVyZTJEKHVfZWZmZWN0LCB2X3RleENvb3JkKTtcXG4gIGdsX0ZyYWdDb2xvciA9IG9yaWdpbmFsQ29sb3I7XFxuXFxuICBpZiAodV9yZWdpb24uciA+IDAuMCB8fCB1X3JlZ2lvbi5nID4gMC4wIHx8IHVfcmVnaW9uLmIgPiAwLjApIHtcXG4gICAgaWYgKG1hc2tlZCA8IDEuMCB8fCBvcmlnaW5hbENvbG9yLmEgPiAwLjApIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB1X3JlZ2lvbjtcXG4gICAgfVxcbiAgICByZXR1cm47XFxuICB9XFxuICBlbHNlIGlmICh1X3JlZ2lvbi5hID4gMC4wKSB7XFxuICAgIGlmIChzb3J0ZWQgPiAwLjApIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAsIDAsIDAsIG9yaWdpbmFsQ29sb3IuYSA+IDAuMCA/IDEuMCA6IDAuMCk7XFxuICAgIH1cXG4gICAgZWxzZSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgwLCAwLCAwLCAwLjApO1xcbiAgICB9XFxuICAgIHJldHVybjtcXG4gIH1cXG5cXG4gIGlmIChlZmZlY3RDb2xvciA9PSB2ZWM0KDAsIDEsIDEsIDEpKSB7IC8vIFdhdGVyIHJlZ2lvblxcbiAgICB2ZWMyIHRleENvb3JkID0gdl90ZXhDb29yZDtcXG4gICAgdmVjNCB2X2JsdXJyZWRDb2xvciA9IG9yaWdpbmFsQ29sb3I7XFxuICAgIGlmIChkaXNwbGFjZSA+IDAuMCkge1xcbiAgICAgIHRleENvb3JkID0gcmlwcGxlWCh2X3RleENvb3JkLCB1X3JpcHBsZS54LCB1X3JpcHBsZS55LCB1X3JpcHBsZS56KTtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB0ZXhDb29yZCk7XFxuICAgIH1cXG4gICAgaWYgKGJsdXIgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IGxpbmVhckJsdXIodV9pbWFnZSwgMC4wLCAxLjAsIHRleENvb3JkKTtcXG4gICAgfVxcbiAgICBnbF9GcmFnQ29sb3IgPSB2X2JsdXJyZWRDb2xvciAqIDAuNjUgKyBlZmZlY3RDb2xvciAqIDAuMzU7XFxuICB9XFxuICBlbHNlIGlmIChlZmZlY3RDb2xvciA9PSB2ZWM0KDEsIDAsIDAsIDEpKSB7IC8vIEZpcmUgcmVnaW9uXFxuICAgIHZlYzIgdl9kaXNwbGFjZW1lbnQgPSByaXBwbGVZKHZfdGV4Q29vcmQsIHVfcmlwcGxlLnggKiAyLjAsIHVfcmlwcGxlLnkgKiAxLjUsIHVfcmlwcGxlLnogKiAwLjEpO1xcbiAgICB2ZWM0IHZfYmx1cnJlZENvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG4gICAgaWYgKGRpc3BsYWNlID4gMC4wKSB7XFxuICAgICAgdl9ibHVycmVkQ29sb3IgPSB0ZXh0dXJlMkQodV9pbWFnZSwgdl9kaXNwbGFjZW1lbnQpO1xcbiAgICB9XFxuICAgIGlmIChibHVyID4gMC4wKSB7XFxuICAgICAgdl9ibHVycmVkQ29sb3IgPSBtb3Rpb25CbHVyKHVfaW1hZ2UsIC1NX1RBVSwgMS4wLCB2X2Rpc3BsYWNlbWVudCk7XFxuICAgIH1cXG4gICAgZ2xfRnJhZ0NvbG9yID0gdl9ibHVycmVkQ29sb3IgKiAwLjc1ICsgZWZmZWN0Q29sb3IgKiAwLjI1O1xcbiAgfVxcbiAgZWxzZSB7IC8vIE51bGwgcmVnaW9uXFxuICAgIGdsX0ZyYWdDb2xvciA9IG9yaWdpbmFsQ29sb3I7XFxuICB9XFxufVxcblwiIiwibW9kdWxlLmV4cG9ydHMgPSBcIi8vIHRleHR1cmUudmVydFxcbnByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xcblxcbmF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247XFxuYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDtcXG5cXG51bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uO1xcblxcbnZhcnlpbmcgdmVjMiB2X3RleENvb3JkO1xcbnZhcnlpbmcgdmVjMiB2X3Bvc2l0aW9uO1xcblxcbnZvaWQgbWFpbigpXFxue1xcbiAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uLnh5IC8gdV9yZXNvbHV0aW9uO1xcbiAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7XFxuICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDtcXG5cXG4gIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7XFxuICB2X3RleENvb3JkICA9IGFfdGV4Q29vcmQ7XFxuICB2X3Bvc2l0aW9uICA9IGFfcG9zaXRpb24ueHk7XFxufVxcblwiIiwiaW1wb3J0IHsgVmlldyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1ZpZXcnO1xuXG5leHBvcnQgY2xhc3MgQ29udHJvbGxlciBleHRlbmRzIFZpZXdcbntcblx0Y29uc3RydWN0b3IoYXJncylcblx0e1xuXHRcdHN1cGVyKGFyZ3MpO1xuXHRcdHRoaXMudGVtcGxhdGUgID0gcmVxdWlyZSgnLi9jb250cm9sbGVyLnRtcCcpO1xuXHRcdHRoaXMuZHJhZ1N0YXJ0ID0gZmFsc2U7XG5cblx0XHR0aGlzLmFyZ3MuZHJhZ2dpbmcgID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnggPSAwO1xuXHRcdHRoaXMuYXJncy55ID0gMDtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMubW92ZVN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLmRyb3BTdGljayhldmVudCk7XG5cdFx0fSk7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLm1vdmVTdGljayhldmVudCk7XG5cdFx0fSk7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMuZHJvcFN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblx0fVxuXG5cdGRyYWdTdGljayhldmVudClcblx0e1xuXHRcdGxldCBwb3MgPSBldmVudDtcblxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRpZihldmVudC50b3VjaGVzICYmIGV2ZW50LnRvdWNoZXNbMF0pXG5cdFx0e1xuXHRcdFx0cG9zID0gZXZlbnQudG91Y2hlc1swXTtcblx0XHR9XG5cblx0XHR0aGlzLmFyZ3MuZHJhZ2dpbmcgPSB0cnVlO1xuXHRcdHRoaXMuZHJhZ1N0YXJ0ICAgICA9IHtcblx0XHRcdHg6ICAgcG9zLmNsaWVudFhcblx0XHRcdCwgeTogcG9zLmNsaWVudFlcblx0XHR9O1xuXHR9XG5cblx0bW92ZVN0aWNrKGV2ZW50KVxuXHR7XG5cdFx0aWYodGhpcy5hcmdzLmRyYWdnaW5nKVxuXHRcdHtcblx0XHRcdGxldCBwb3MgPSBldmVudDtcblxuXHRcdFx0aWYoZXZlbnQudG91Y2hlcyAmJiBldmVudC50b3VjaGVzWzBdKVxuXHRcdFx0e1xuXHRcdFx0XHRwb3MgPSBldmVudC50b3VjaGVzWzBdO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFyZ3MueHggPSBwb3MuY2xpZW50WCAtIHRoaXMuZHJhZ1N0YXJ0Lng7XG5cdFx0XHR0aGlzLmFyZ3MueXkgPSBwb3MuY2xpZW50WSAtIHRoaXMuZHJhZ1N0YXJ0Lnk7XG5cblx0XHRcdGNvbnN0IGxpbWl0ID0gNTA7XG5cblx0XHRcdGlmKHRoaXMuYXJncy54eCA8IC1saW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnggPSAtbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHRoaXMuYXJncy54eCA+IGxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IGxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IHRoaXMuYXJncy54eDtcblx0XHRcdH1cblxuXHRcdFx0aWYodGhpcy5hcmdzLnl5IDwgLWxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueSA9IC1saW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYodGhpcy5hcmdzLnl5ID4gbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gdGhpcy5hcmdzLnl5O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGRyb3BTdGljayhldmVudClcblx0e1xuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyA9IGZhbHNlO1xuXHRcdHRoaXMuYXJncy54ID0gMDtcblx0XHR0aGlzLmFyZ3MueSA9IDA7XG5cdH1cbn1cbiIsImltcG9ydCB7IFZpZXcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9WaWV3JztcblxuZXhwb3J0IGNsYXNzIE1hcEVkaXRvciBleHRlbmRzIFZpZXdcbntcblx0Y29uc3RydWN0b3IoYXJncylcblx0e1xuXHRcdHN1cGVyKGFyZ3MpO1xuXHRcdHRoaXMudGVtcGxhdGUgID0gcmVxdWlyZSgnLi9tYXBFZGl0b3IudG1wJyk7XG5cblx0XHRhcmdzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oKHNoZWV0KT0+e1xuXHRcdFx0dGhpcy5hcmdzLnRpbGVzID0gc2hlZXQuZnJhbWVzO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5hcmdzLmJpbmRUbygnc2VsZWN0ZWRHcmFwaGljJywgKHYpPT57XG5cdFx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRHcmFwaGljID0gbnVsbDtcblx0XHR9LCB7d2FpdDowfSk7XG5cblx0XHR0aGlzLmFyZ3MubXVsdGlTZWxlY3QgICA9IGZhbHNlO1xuXHRcdHRoaXMuYXJncy5zZWxlY3Rpb24gICAgID0ge307XG5cdFx0dGhpcy5hcmdzLnNlbGVjdGVkSW1hZ2UgPSBudWxsXG5cdH1cblxuXHRzZWxlY3RHcmFwaGljKHNyYylcblx0e1xuXHRcdGNvbnNvbGUubG9nKHNyYyk7XG5cblx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRHcmFwaGljID0gc3JjO1xuXHR9XG5cblx0c2VsZWN0KHNlbGVjdGlvbilcblx0e1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5hcmdzLnNlbGVjdGlvbiwgc2VsZWN0aW9uKTtcblxuXHRcdGlmKHNlbGVjdGlvbi5nbG9iYWxYICE9PSBzZWxlY3Rpb24uc3RhcnRHbG9iYWxYXG5cdFx0XHR8fCBzZWxlY3Rpb24uZ2xvYmFsWSAhPT0gc2VsZWN0aW9uLnN0YXJ0R2xvYmFsWVxuXHRcdCl7XG5cdFx0XHR0aGlzLmFyZ3MubXVsdGlTZWxlY3QgPSB0cnVlO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5hcmdzLm11bHRpU2VsZWN0ID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYoIXRoaXMuYXJncy5tdWx0aVNlbGVjdClcblx0XHR7XG5cdFx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRJbWFnZXMgPSB0aGlzLmFyZ3MubWFwLmdldFRpbGUoc2VsZWN0aW9uLmdsb2JhbFgsIHNlbGVjdGlvbi5nbG9iYWxZKTtcblx0XHR9XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzID0gXFxcImNvbnRyb2xsZXJcXFwiPlxcblxcdDxkaXYgY2xhc3MgPSBcXFwiam95c3RpY2tcXFwiIGN2LW9uID0gXFxcIlxcblxcdFxcdHRvdWNoc3RhcnQ6ZHJhZ1N0aWNrKGV2ZW50KTtcXG5cXHRcXHRtb3VzZWRvd246ZHJhZ1N0aWNrKGV2ZW50KTtcXG5cXHRcXFwiPlxcblxcdFxcdDxkaXYgY2xhc3MgPSBcXFwicGFkXFxcIiBzdHlsZSA9IFxcXCJwb3NpdGlvbjogcmVsYXRpdmU7IHRyYW5zZm9ybTp0cmFuc2xhdGUoW1t4XV1weCxbW3ldXXB4KTtcXFwiPjwvZGl2PlxcblxcdDwvZGl2PlxcblxcblxcdDxkaXYgY2xhc3MgPSBcXFwiYnV0dG9uXFxcIj5BPC9kaXY+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJidXR0b25cXFwiPkI8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImJ1dHRvblxcXCI+QzwvZGl2PlxcbjwvZGl2PlwiIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3MgPSBcXFwidGFiLXBhZ2UgbWFwRWRpdG9yXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRhYnNcXFwiPlxcblxcdFxcdDxkaXY+VGlsZTwvZGl2PlxcblxcdFxcdDxkaXY+TGF5ZXI8L2Rpdj5cXG5cXHRcXHQ8ZGl2Pk9iamVjdDwvZGl2PlxcblxcdFxcdDxkaXY+VHJpZ2dlcjwvZGl2PlxcblxcdFxcdDxkaXY+TWFwPC9kaXY+XFxuXFx0PC9kaXY+XFxuXFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5cXG5cXHRcXHQ8ZGl2IGNsYXNzID0gXFxcInNlbGVjdGVkXFxcIj5cXG5cXHRcXHRcXHQ8ZGl2IGN2LWlmID0gXFxcIiFtdWx0aVNlbGVjdFxcXCI+XFxuXFx0XFx0XFx0XFx0PHAgc3R5bGUgPSBcXFwiZm9udC1zaXplOiBsYXJnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0KFtbc2VsZWN0aW9uLmdsb2JhbFhdXSwgW1tzZWxlY3Rpb24uZ2xvYmFsWV1dKVxcblxcdFxcdFxcdFxcdDwvcD5cXG5cXHRcXHRcXHRcXHQ8cCBjdi1lYWNoID0gXFxcInNlbGVjdGVkSW1hZ2VzOnNlbGVjdGVkSW1hZ2U6c0lcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxidXR0b24+LTwvYnV0dG9uPlxcblxcdFxcdFxcdFxcdFxcdDxpbWcgY2xhc3MgPSBcXFwiY3VycmVudFxcXCIgY3YtYXR0ciA9IFxcXCJzcmM6c2VsZWN0ZWRJbWFnZVxcXCI+XFxuXFx0XFx0XFx0XFx0PC9wPlxcblxcdFxcdFxcdFxcdDxidXR0b24+KzwvYnV0dG9uPlxcblxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdDxkaXYgY3YtaWYgPSBcXFwibXVsdGlTZWxlY3RcXFwiPlxcblxcdFxcdFxcdFxcdDxwIHN0eWxlID0gXFxcImZvbnQtc2l6ZTogbGFyZ2VcXFwiPlxcblxcdFxcdFxcdFxcdFxcdChbW3NlbGVjdGlvbi5zdGFydEdsb2JhbFhdXSwgW1tzZWxlY3Rpb24uc3RhcnRHbG9iYWxZXV0pIC0gKFtbc2VsZWN0aW9uLmdsb2JhbFhdXSwgW1tzZWxlY3Rpb24uZ2xvYmFsWV1dKVxcblxcdFxcdFxcdFxcdDwvcD5cXG5cXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHQ8L2Rpdj5cXG5cXHRcXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVzXFxcIiBjdi1lYWNoID0gXFxcInRpbGVzOnRpbGU6dFxcXCI+XFxuXFx0XFx0XFx0PGltZyBjdi1hdHRyID0gXFxcInNyYzp0aWxlLHRpdGxlOnRcXFwiIGN2LW9uID0gXFxcImNsaWNrOnNlbGVjdEdyYXBoaWModCk7XFxcIj5cXG5cXHRcXHQ8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG5cXHQ8IS0tIDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+T0JKRUNUIE1PREU8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVcXFwiPlRSSUdHRVIgTU9ERTwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+TUFQIE1PREU8L2Rpdj4gLS0+XFxuPC9kaXY+XCIiLCJpbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlJztcblxuZXhwb3J0IGNsYXNzIEZsb29yXG57XG5cdGNvbnN0cnVjdG9yKGdsMmQsIGFyZ3MpXG5cdHtcblx0XHR0aGlzLmdsMmQgICA9IGdsMmQ7XG5cdFx0dGhpcy5zcHJpdGVzID0gW107XG5cblx0XHQvLyB0aGlzLnJlc2l6ZSg2MCwgMzQpO1xuXHRcdHRoaXMucmVzaXplKDksIDkpO1xuXHRcdC8vIHRoaXMucmVzaXplKDYwKjIsIDM0KjIpO1xuXHR9XG5cblx0cmVzaXplKHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHR0aGlzLndpZHRoICA9IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0Zm9yKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspXG5cdFx0e1xuXHRcdFx0Zm9yKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBzcHJpdGUgPSBuZXcgU3ByaXRlKHRoaXMuZ2wyZCwgJy9mbG9vclRpbGUucG5nJyk7XG5cblx0XHRcdFx0c3ByaXRlLnggPSAzMiAqIHg7XG5cdFx0XHRcdHNwcml0ZS55ID0gMzIgKiB5O1xuXG5cdFx0XHRcdHRoaXMuc3ByaXRlcy5wdXNoKHNwcml0ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHR0aGlzLnNwcml0ZXMubWFwKHMgPT4gcy5kcmF3KCkpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGVTaGVldCc7XG5pbXBvcnQgeyBJbmplY3RhYmxlICB9IGZyb20gJy4uL2luamVjdC9JbmplY3RhYmxlJztcbmltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuXG5leHBvcnQgIGNsYXNzIE1hcFxuZXh0ZW5kcyBJbmplY3RhYmxlLmluamVjdCh7U3ByaXRlU2hlZXR9KVxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cblx0XHR0aGlzLnRpbGVzID0ge307XG5cdH1cblxuXHRnZXRUaWxlKHgsIHksIGxheWVyID0gMClcblx0e1xuXHRcdGlmKHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSlcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0bGV0IHNwbGl0ID0gNDtcblx0XHRsZXQgc2Vjb25kID0gJ3JvY2tfNC5wbmcnO1xuXG5cdFx0aWYoKHggJSBzcGxpdCA9PT0gMCkgJiYgKHkgJSBzcGxpdCA9PT0gMCkpXG5cdFx0e1xuXHRcdFx0c2Vjb25kID0gJ2NoZWVzZS5wbmcnXG5cdFx0fVxuXG5cdFx0aWYoeCA9PT0gLTEgJiYgeSA9PT0gLTEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0Ly8gdGhpcy5TcHJpdGVTaGVldC5nZXRGcmFtZSgnZmxvb3JUaWxlLnBuZycpXG5cdFx0XHRcdHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2JveF9mYWNlLnBuZycpXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdHJldHVybiBbXG5cdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKCdmbG9vclRpbGUucG5nJylcblx0XHRcdC8vIHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2JveF9mYWNlLnBuZycpXG5cdFx0XTtcblxuXHRcdHJldHVybiBbXG5cdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKCdmbG9vclRpbGUucG5nJylcblx0XHRcdCwgdGhpcy5TcHJpdGVTaGVldC5nZXRGcmFtZShzZWNvbmQpXG5cdFx0XTtcblx0fVxuXG5cdHNldFRpbGUoeCwgeSwgaW1hZ2UsIGxheWVyID0gMClcblx0e1xuXHRcdHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSA9IGltYWdlO1xuXHR9XG5cblx0ZXhwb3J0KClcblx0e1xuXHRcdGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRoaXMudGlsZXMpKTtcblx0fVxuXG5cdGltcG9ydChpbnB1dClcblx0e1xuXHRcdGlucHV0ID0gYHtcIi0yLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCIsXCItMSwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wiLFwiMCwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wifWA7XG5cblx0XHR0aGlzLnRpbGVzID0gSlNPTi5wYXJzZShpbnB1dCk7XG5cblx0XHQvLyBjb25zb2xlLmxvZyhKU09OLnBhcnNlKGlucHV0KSk7XG5cdH1cbn1cblxuXG4vLyB7XCItMiwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wiLFwiLTEsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIixcIjAsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIn0iLCIvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBXZWJTb2NrZXQgPSB3aW5kb3cuV2ViU29ja2V0IHx8IHdpbmRvdy5Nb3pXZWJTb2NrZXQ7XG4gIHZhciBiciA9IHdpbmRvdy5icnVuY2ggPSAod2luZG93LmJydW5jaCB8fCB7fSk7XG4gIHZhciBhciA9IGJyWydhdXRvLXJlbG9hZCddID0gKGJyWydhdXRvLXJlbG9hZCddIHx8IHt9KTtcbiAgaWYgKCFXZWJTb2NrZXQgfHwgYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgaWYgKHdpbmRvdy5fYXIpIHJldHVybjtcbiAgd2luZG93Ll9hciA9IHRydWU7XG5cbiAgdmFyIGNhY2hlQnVzdGVyID0gZnVuY3Rpb24odXJsKXtcbiAgICB2YXIgZGF0ZSA9IE1hdGgucm91bmQoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgdXJsID0gdXJsLnJlcGxhY2UoLyhcXCZ8XFxcXD8pY2FjaGVCdXN0ZXI9XFxkKi8sICcnKTtcbiAgICByZXR1cm4gdXJsICsgKHVybC5pbmRleE9mKCc/JykgPj0gMCA/ICcmJyA6ICc/JykgKydjYWNoZUJ1c3Rlcj0nICsgZGF0ZTtcbiAgfTtcblxuICB2YXIgYnJvd3NlciA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKTtcbiAgdmFyIGZvcmNlUmVwYWludCA9IGFyLmZvcmNlUmVwYWludCB8fCBicm93c2VyLmluZGV4T2YoJ2Nocm9tZScpID4gLTE7XG5cbiAgdmFyIHJlbG9hZGVycyA9IHtcbiAgICBwYWdlOiBmdW5jdGlvbigpe1xuICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcbiAgICB9LFxuXG4gICAgc3R5bGVzaGVldDogZnVuY3Rpb24oKXtcbiAgICAgIFtdLnNsaWNlXG4gICAgICAgIC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpbmtbcmVsPXN0eWxlc2hlZXRdJykpXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIHZhciB2YWwgPSBsaW5rLmdldEF0dHJpYnV0ZSgnZGF0YS1hdXRvcmVsb2FkJyk7XG4gICAgICAgICAgcmV0dXJuIGxpbmsuaHJlZiAmJiB2YWwgIT0gJ2ZhbHNlJztcbiAgICAgICAgfSlcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIGxpbmsuaHJlZiA9IGNhY2hlQnVzdGVyKGxpbmsuaHJlZik7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBIYWNrIHRvIGZvcmNlIHBhZ2UgcmVwYWludCBhZnRlciAyNW1zLlxuICAgICAgaWYgKGZvcmNlUmVwYWludCkgc2V0VGltZW91dChmdW5jdGlvbigpIHsgZG9jdW1lbnQuYm9keS5vZmZzZXRIZWlnaHQ7IH0sIDI1KTtcbiAgICB9LFxuXG4gICAgamF2YXNjcmlwdDogZnVuY3Rpb24oKXtcbiAgICAgIHZhciBzY3JpcHRzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQnKSk7XG4gICAgICB2YXIgdGV4dFNjcmlwdHMgPSBzY3JpcHRzLm1hcChmdW5jdGlvbihzY3JpcHQpIHsgcmV0dXJuIHNjcmlwdC50ZXh0IH0pLmZpbHRlcihmdW5jdGlvbih0ZXh0KSB7IHJldHVybiB0ZXh0Lmxlbmd0aCA+IDAgfSk7XG4gICAgICB2YXIgc3JjU2NyaXB0cyA9IHNjcmlwdHMuZmlsdGVyKGZ1bmN0aW9uKHNjcmlwdCkgeyByZXR1cm4gc2NyaXB0LnNyYyB9KTtcblxuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgYWxsID0gc3JjU2NyaXB0cy5sZW5ndGg7XG4gICAgICB2YXIgb25Mb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvYWRlZCA9IGxvYWRlZCArIDE7XG4gICAgICAgIGlmIChsb2FkZWQgPT09IGFsbCkge1xuICAgICAgICAgIHRleHRTY3JpcHRzLmZvckVhY2goZnVuY3Rpb24oc2NyaXB0KSB7IGV2YWwoc2NyaXB0KTsgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3JjU2NyaXB0c1xuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzY3JpcHQpIHtcbiAgICAgICAgICB2YXIgc3JjID0gc2NyaXB0LnNyYztcbiAgICAgICAgICBzY3JpcHQucmVtb3ZlKCk7XG4gICAgICAgICAgdmFyIG5ld1NjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICAgIG5ld1NjcmlwdC5zcmMgPSBjYWNoZUJ1c3RlcihzcmMpO1xuICAgICAgICAgIG5ld1NjcmlwdC5hc3luYyA9IHRydWU7XG4gICAgICAgICAgbmV3U2NyaXB0Lm9ubG9hZCA9IG9uTG9hZDtcbiAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKG5ld1NjcmlwdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfTtcbiAgdmFyIHBvcnQgPSBhci5wb3J0IHx8IDk0ODU7XG4gIHZhciBob3N0ID0gYnIuc2VydmVyIHx8IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSB8fCAnbG9jYWxob3N0JztcblxuICB2YXIgY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgV2ViU29ja2V0KCd3czovLycgKyBob3N0ICsgJzonICsgcG9ydCk7XG4gICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCl7XG4gICAgICBpZiAoYXIuZGlzYWJsZWQpIHJldHVybjtcbiAgICAgIHZhciBtZXNzYWdlID0gZXZlbnQuZGF0YTtcbiAgICAgIHZhciByZWxvYWRlciA9IHJlbG9hZGVyc1ttZXNzYWdlXSB8fCByZWxvYWRlcnMucGFnZTtcbiAgICAgIHJlbG9hZGVyKCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuICAgICAgaWYgKGNvbm5lY3Rpb24ucmVhZHlTdGF0ZSkgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24oKXtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGNvbm5lY3QsIDEwMDApO1xuICAgIH07XG4gIH07XG4gIGNvbm5lY3QoKTtcbn0pKCk7XG4vKiBqc2hpbnQgaWdub3JlOmVuZCAqL1xuIl19