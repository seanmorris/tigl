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
    var attributes = ['a_position', 'a_texCoord', 'a_effCoord'];
    var uniforms = ['u_image', 'u_effect', 'u_resolution', 'u_color', 'u_tileNo', 'u_ripple', 'u_size', 'u_scale', 'u_region', 'u_rect'];

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9CYWcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL0RvbS5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9NaXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1RhZy5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9VdWlkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzIiwiYXBwL0NvbmZpZy5qcyIsImFwcC9nbDJkL0dsMmQuanMiLCJhcHAvaG9tZS9WaWV3LmpzIiwiYXBwL2hvbWUvdmlldy50bXAuaHRtbCIsImFwcC9pbml0aWFsaXplLmpzIiwiYXBwL2luamVjdC9Db250YWluZXIuanMiLCJhcHAvaW5qZWN0L0luamVjdGFibGUuanMiLCJhcHAvaW5qZWN0L1NpbmdsZS5qcyIsImFwcC9tb2RlbC9Db250cm9sbGVyLmpzIiwiYXBwL21vZGVsL0VudGl0eS5qcyIsImFwcC9vdmVybGF5L292ZXJsYXkuZnJhZyIsImFwcC9vdmVybGF5L292ZXJsYXkudmVydCIsImFwcC9zcHJpdGUvQmFja2dyb3VuZC5qcyIsImFwcC9zcHJpdGUvQ2FtZXJhLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGUuanMiLCJhcHAvc3ByaXRlL1Nwcml0ZUJvYXJkLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGVTaGVldC5qcyIsImFwcC9zcHJpdGUvU3VyZmFjZS5qcyIsImFwcC9zcHJpdGUvVGV4dHVyZUJhbmsuanMiLCJhcHAvc3ByaXRlL3RleHR1cmUuZnJhZyIsImFwcC9zcHJpdGUvdGV4dHVyZS52ZXJ0IiwiYXBwL3VpL0NvbnRyb2xsZXIuanMiLCJhcHAvdWkvTWFwRWRpdG9yLmpzIiwiYXBwL3VpL2NvbnRyb2xsZXIudG1wLmh0bWwiLCJhcHAvdWkvbWFwRWRpdG9yLnRtcC5odG1sIiwiYXBwL3dvcmxkL0Zsb29yLmpzIiwiYXBwL3dvcmxkL01hcC5qcyIsIm5vZGVfbW9kdWxlcy9hdXRvLXJlbG9hZC1icnVuY2gvdmVuZG9yL2F1dG8tcmVsb2FkLmpzIl0sIm5hbWVzIjpbIkNvbmZpZyIsImV4cG9ydHMiLCJfY3JlYXRlQ2xhc3MiLCJfY2xhc3NDYWxsQ2hlY2siLCJ0aXRsZSIsIkdsMmQiLCJlbGVtZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY29udGV4dCIsImdldENvbnRleHQiLCJzY3JlZW5TY2FsZSIsInpvb21MZXZlbCIsImtleSIsInZhbHVlIiwiY2xlYW51cCIsImRlbGV0ZVByb2dyYW0iLCJwcm9ncmFtIiwiY3JlYXRlU2hhZGVyIiwibG9jYXRpb24iLCJleHRlbnNpb24iLCJzdWJzdHJpbmciLCJsYXN0SW5kZXhPZiIsInR5cGUiLCJ0b1VwcGVyQ2FzZSIsIlZFUlRFWF9TSEFERVIiLCJGUkFHTUVOVF9TSEFERVIiLCJzaGFkZXIiLCJzb3VyY2UiLCJyZXF1aXJlIiwic2hhZGVyU291cmNlIiwiY29tcGlsZVNoYWRlciIsInN1Y2Nlc3MiLCJnZXRTaGFkZXJQYXJhbWV0ZXIiLCJDT01QSUxFX1NUQVRVUyIsImNvbnNvbGUiLCJlcnJvciIsImdldFNoYWRlckluZm9Mb2ciLCJkZWxldGVTaGFkZXIiLCJjcmVhdGVQcm9ncmFtIiwidmVydGV4U2hhZGVyIiwiZnJhZ21lbnRTaGFkZXIiLCJhdHRhY2hTaGFkZXIiLCJsaW5rUHJvZ3JhbSIsImRldGFjaFNoYWRlciIsImdldFByb2dyYW1QYXJhbWV0ZXIiLCJMSU5LX1NUQVRVUyIsImdldFByb2dyYW1JbmZvTG9nIiwiX1ZpZXciLCJfS2V5Ym9hcmQiLCJfQmFnIiwiX0NvbmZpZyIsIl9NYXAiLCJfU3ByaXRlU2hlZXQiLCJfU3ByaXRlQm9hcmQiLCJfQ29udHJvbGxlciIsIl9NYXBFZGl0b3IiLCJfRW50aXR5IiwiX0NhbWVyYSIsIl9Db250cm9sbGVyMiIsIl9TcHJpdGUiLCJhIiwibiIsIlR5cGVFcnJvciIsIl9kZWZpbmVQcm9wZXJ0aWVzIiwiZSIsInIiLCJ0IiwibGVuZ3RoIiwibyIsImVudW1lcmFibGUiLCJjb25maWd1cmFibGUiLCJ3cml0YWJsZSIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiX3RvUHJvcGVydHlLZXkiLCJwcm90b3R5cGUiLCJpIiwiX3RvUHJpbWl0aXZlIiwiX3R5cGVvZiIsIlN5bWJvbCIsInRvUHJpbWl0aXZlIiwiY2FsbCIsIlN0cmluZyIsIk51bWJlciIsIl9jYWxsU3VwZXIiLCJfZ2V0UHJvdG90eXBlT2YiLCJfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybiIsIl9pc05hdGl2ZVJlZmxlY3RDb25zdHJ1Y3QiLCJSZWZsZWN0IiwiY29uc3RydWN0IiwiY29uc3RydWN0b3IiLCJhcHBseSIsIl9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQiLCJSZWZlcmVuY2VFcnJvciIsIkJvb2xlYW4iLCJ2YWx1ZU9mIiwic2V0UHJvdG90eXBlT2YiLCJnZXRQcm90b3R5cGVPZiIsImJpbmQiLCJfX3Byb3RvX18iLCJfaW5oZXJpdHMiLCJjcmVhdGUiLCJfc2V0UHJvdG90eXBlT2YiLCJBcHBsaWNhdGlvbiIsIm9uU2NyZWVuSm95UGFkIiwiT25TY3JlZW5Kb3lQYWQiLCJrZXlib2FyZCIsIktleWJvYXJkIiwiZ2V0IiwiVmlldyIsIl9CYXNlVmlldyIsImFyZ3MiLCJfdGhpcyIsIndpbmRvdyIsInNtUHJvZmlsaW5nIiwidGVtcGxhdGUiLCJyb3V0ZXMiLCJlbnRpdGllcyIsIkJhZyIsInNwZWVkIiwibWF4U3BlZWQiLCJjb250cm9sbGVyIiwiZnBzIiwic3BzIiwiY2FtWCIsImNhbVkiLCJmcmFtZUxvY2siLCJzaW11bGF0aW9uTG9jayIsInNob3dFZGl0b3IiLCJsaXN0ZW5pbmciLCJrZXlzIiwiYmluZFRvIiwidiIsImsiLCJkIiwibWFwIiwic3ByaXRlQm9hcmQiLCJ1bnNlbGVjdCIsInNwcml0ZVNoZWV0IiwiU3ByaXRlU2hlZXQiLCJXb3JsZE1hcCIsIm1hcEVkaXRvciIsIk1hcEVkaXRvciIsIm9uUmVuZGVyZWQiLCJfdGhpczIiLCJTcHJpdGVCb2FyZCIsInRhZ3MiLCJjYW52YXMiLCJlbnRpdHkiLCJFbnRpdHkiLCJzcHJpdGUiLCJTcHJpdGUiLCJzcmMiLCJ1bmRlZmluZWQiLCJ3aWR0aCIsImhlaWdodCIsIkNvbnRyb2xsZXIiLCJjYW1lcmEiLCJDYW1lcmEiLCJhZGQiLCJzcHJpdGVzIiwiZm9sbG93aW5nIiwiem9vbSIsInNlbGVjdGVkIiwiZ2xvYmFsWCIsInN0YXJ0R2xvYmFsWCIsImlpIiwiX3JlZiIsImoiLCJzdGFydEdsb2JhbFkiLCJqaiIsImdsb2JhbFkiLCJfcmVmMiIsInNldFRpbGUiLCJyZXNpemUiLCJwIiwibG9jYWxYIiwic2VsZWN0Iiwid2FpdCIsImFkZEV2ZW50TGlzdGVuZXIiLCJmVGhlbiIsInNUaGVuIiwiZlNhbXBsZXMiLCJzU2FtcGxlcyIsIm1heFNhbXBsZXMiLCJzaW11bGF0ZSIsIm5vdyIsImRlbHRhIiwidXBkYXRlIiwidmFsdWVzIiwiaXRlbXMiLCJfc3BzIiwicHVzaCIsInNoaWZ0IiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiZHJhdyIsInRvRml4ZWQiLCJ4IiwieSIsImdsMmQiLCJib2R5IiwiY2xpZW50SGVpZ2h0IiwicGVyZm9ybWFuY2UiLCJzZXRJbnRlcnZhbCIsImNvbmNhdCIsInJlZHVjZSIsImIiLCJwYWRTdGFydCIsImNsaWVudFdpZHRoIiwicndpZHRoIiwiTWF0aCIsInRydW5jIiwicmhlaWdodCIsIm9sZFNjYWxlIiwic2Nyb2xsIiwiZXZlbnQiLCJkZWx0YVkiLCJtYXgiLCJtaW4iLCJzdGVwIiwiQmFzZVZpZXciLCJfUm91dGVyIiwiUHJveHkiLCJ2aWV3IiwiUm91dGVyIiwibGlzdGVuIiwicmVuZGVyIiwiX0luamVjdGFibGUyIiwiQ29udGFpbmVyIiwiX0luamVjdGFibGUiLCJhcmd1bWVudHMiLCJpbmplY3QiLCJpbmplY3Rpb25zIiwiYXNzaWduIiwiSW5qZWN0YWJsZSIsImNsYXNzZXMiLCJvYmplY3RzIiwibmFtZSIsImluamVjdGlvbiIsInRlc3QiLCJpbnN0YW5jZSIsIkVycm9yIiwiZXhpc3RpbmdJbmplY3Rpb25zIiwiX2NsYXNzIiwiU2luZ2xlIiwicmFuZG9tIiwic2luZ2xlIiwiX0JpbmRhYmxlIiwiaXRlcmF0b3IiLCJfZGVmaW5lUHJvcGVydHkiLCJCaW5kYWJsZSIsIm1ha2VCaW5kYWJsZSIsImtleVByZXNzIiwia2V5UmVsZWFzZSIsImF4aXMiLCJwcmV2IiwidHJpZ2dlcnMiLCJmaXJlUmVnaW9uIiwid2F0ZXJSZWdpb24iLCJkaXJlY3Rpb24iLCJzdGF0ZSIsInJlZ2lvbiIsInhBeGlzIiwieUF4aXMiLCJsb2ciLCJjZWlsIiwiZmxvb3IiLCJob3Jpem9udGFsIiwiYWJzIiwiZnJhbWVzIiwic2V0RnJhbWVzIiwiZGVzdHJveSIsIl9TdXJmYWNlIiwiQmFja2dyb3VuZCIsImxheWVyIiwicGFuZXMiLCJwYW5lc1hZIiwibWF4UGFuZXMiLCJ0aWxlV2lkdGgiLCJ0aWxlSGVpZ2h0Iiwic3VyZmFjZVdpZHRoIiwic3VyZmFjZUhlaWdodCIsInJlbmRlclBhbmUiLCJmb3JjZVVwZGF0ZSIsInBhbmUiLCJwYW5lWCIsInBhbmVZIiwiU3VyZmFjZSIsImNlbnRlclgiLCJjZW50ZXJZIiwicmFuZ2UiLCJmb3JFYWNoIiwicG9wIiwiX2NyZWF0ZUZvck9mSXRlcmF0b3JIZWxwZXIiLCJBcnJheSIsImlzQXJyYXkiLCJfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkiLCJfbiIsIkYiLCJzIiwiZG9uZSIsImYiLCJ1IiwibmV4dCIsIl90b0NvbnN1bWFibGVBcnJheSIsIl9hcnJheVdpdGhvdXRIb2xlcyIsIl9pdGVyYWJsZVRvQXJyYXkiLCJfbm9uSXRlcmFibGVTcHJlYWQiLCJfYXJyYXlMaWtlVG9BcnJheSIsInRvU3RyaW5nIiwic2xpY2UiLCJmcm9tIiwiUHJldmVudCIsInoiLCJzY2FsZSIsImZyYW1lRGVsYXkiLCJjdXJyZW50RGVsYXkiLCJjdXJyZW50RnJhbWUiLCJjdXJyZW50RnJhbWVzIiwibW92aW5nIiwiUklHSFQiLCJET1dOIiwiTEVGVCIsIlVQIiwiRUFTVCIsIlNPVVRIIiwiV0VTVCIsIk5PUlRIIiwic3RhbmRpbmciLCJ3YWxraW5nIiwiZ2wiLCJ0ZXh0dXJlIiwiY3JlYXRlVGV4dHVyZSIsImJpbmRUZXh0dXJlIiwiVEVYVFVSRV8yRCIsInBhcnNlSW50IiwicGl4ZWwiLCJVaW50OEFycmF5IiwidGV4SW1hZ2UyRCIsIlJHQkEiLCJVTlNJR05FRF9CWVRFIiwicmVhZHkiLCJ0aGVuIiwic2hlZXQiLCJmcmFtZSIsImdldEZyYW1lIiwibG9hZFRleHR1cmUiLCJpbWFnZSIsImJpbmRCdWZmZXIiLCJBUlJBWV9CVUZGRVIiLCJ0ZXhDb29yZEJ1ZmZlciIsImJ1ZmZlckRhdGEiLCJGbG9hdDMyQXJyYXkiLCJTVEFUSUNfRFJBVyIsInVuaWZvcm00ZiIsInJlZ2lvbkxvY2F0aW9uIiwidW5pZm9ybTJmIiwic2l6ZUxvY2F0aW9uIiwic2V0UmVjdGFuZ2xlIiwiYmluZEZyYW1lYnVmZmVyIiwiRlJBTUVCVUZGRVIiLCJkcmF3QnVmZmVyIiwiZHJhd0FycmF5cyIsIlRSSUFOR0xFUyIsImVmZmVjdEJ1ZmZlciIsImZyYW1lU2VsZWN0b3IiLCJmcmFtZXNJZCIsImpvaW4iLCJnZXRGcmFtZXMiLCJQcm9taXNlIiwiYWxsIiwidHJhbnNmb3JtIiwicG9zaXRpb25CdWZmZXIiLCJ4MSIsInkxIiwieDIiLCJ5MiIsInBvaW50cyIsInhPZmYiLCJ5T2ZmIiwidGhldGEiLCJQSSIsIm1hdHJpeFRyYW5zZm9ybSIsIm1hdHJpeENvbXBvc2l0ZSIsIm1hdHJpeFRyYW5zbGF0ZSIsIlNUUkVBTV9EUkFXIiwibWF0cml4SWRlbnRpdHkiLCJkeCIsImR5IiwibWF0cml4U2NhbGUiLCJtYXRyaXhSb3RhdGUiLCJzaW4iLCJjIiwiY29zIiwibWF0cml4U2hlYXJYIiwibWF0cml4U2hlYXJZIiwibWF0cml4TXVsdGlwbHkiLCJtYXRBIiwibWF0QiIsIm91dHB1dCIsImZpbGwiLCJtYXRyaXgiLCJwb2ludCIsIl9pdGVyYXRvciIsIl9zdGVwIiwicm93IiwiZXJyIiwiZmlsdGVyIiwiXyIsImltYWdlU3JjIiwicHJvbWlzZXMiLCJsb2FkSW1hZ2UiLCJ0ZXhQYXJhbWV0ZXJpIiwiVEVYVFVSRV9XUkFQX1MiLCJDTEFNUF9UT19FREdFIiwiVEVYVFVSRV9XUkFQX1QiLCJURVhUVVJFX01JTl9GSUxURVIiLCJORUFSRVNUIiwiVEVYVFVSRV9NQUdfRklMVEVSIiwiYWNjZXB0IiwicmVqZWN0IiwiSW1hZ2UiLCJfQmFja2dyb3VuZCIsIl9HbDJkIiwibW91c2UiLCJjbGlja1giLCJjbGlja1kiLCJibGVuZEZ1bmMiLCJTUkNfQUxQSEEiLCJPTkVfTUlOVVNfU1JDX0FMUEhBIiwiZW5hYmxlIiwiQkxFTkQiLCJ1c2VQcm9ncmFtIiwiY3JlYXRlQnVmZmVyIiwiZWZmQ29vcmRCdWZmZXIiLCJwb3NpdGlvbkxvY2F0aW9uIiwiZ2V0QXR0cmliTG9jYXRpb24iLCJ0ZXhDb29yZExvY2F0aW9uIiwiZWZmQ29vcmRMb2NhdGlvbiIsImltYWdlTG9jYXRpb24iLCJnZXRVbmlmb3JtTG9jYXRpb24iLCJlZmZlY3RMb2NhdGlvbiIsInJlc29sdXRpb25Mb2NhdGlvbiIsImNvbG9yTG9jYXRpb24iLCJ0aWxlUG9zTG9jYXRpb24iLCJyaXBwbGVMb2NhdGlvbiIsInNjYWxlTG9jYXRpb24iLCJyZWN0TG9jYXRpb24iLCJhdHRyaWJ1dGVzIiwidW5pZm9ybXMiLCJlbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSIsInZlcnRleEF0dHJpYlBvaW50ZXIiLCJGTE9BVCIsImRyYXdMYXllciIsImVmZmVjdExheWVyIiwiY3JlYXRlRnJhbWVidWZmZXIiLCJmcmFtZWJ1ZmZlclRleHR1cmUyRCIsIkNPTE9SX0FUVEFDSE1FTlQwIiwiY2xpZW50WCIsImNsaWVudFkiLCJsb2NhbFkiLCJiYWNrZ3JvdW5kIiwidyIsImJhcnJlbCIsImNsZWFyQ29sb3IiLCJjbGVhciIsIkNPTE9SX0JVRkZFUl9CSVQiLCJ2aWV3cG9ydCIsInVuaWZvcm0zZiIsInRpbWUiLCJzb3J0IiwidGltZUVuZCIsImFjdGl2ZVRleHR1cmUiLCJURVhUVVJFMCIsInVuaWZvcm0xaSIsIlRFWFRVUkUxIiwiaW1hZ2VVcmwiLCJib3hlc1VybCIsInZlcnRpY2VzIiwicmVxdWVzdCIsIlJlcXVlc3QiLCJzaGVldExvYWRlciIsImZldGNoIiwicmVzcG9uc2UiLCJqc29uIiwiYm94ZXMiLCJpbWFnZUxvYWRlciIsIm9ubG9hZCIsInByb2Nlc3NJbWFnZSIsIndpbGxSZWFkRnJlcXVlbnRseSIsImRyYXdJbWFnZSIsImZyYW1lUHJvbWlzZXMiLCJfbG9vcCIsInN1YkNhbnZhcyIsImgiLCJzdWJDb250ZXh0IiwicHV0SW1hZ2VEYXRhIiwiZ2V0SW1hZ2VEYXRhIiwidGV4dCIsImZpbGxTdHlsZSIsImNvbG9yIiwiZm9udCIsInRleHRBbGlnbiIsImZpbGxUZXh0IiwidG9CbG9iIiwiYmxvYiIsImZpbGVuYW1lIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiZ2V0VmVydGljZXMiLCJfdGhpczMiLCJnZXRGcmFtZXNCeVByZWZpeCIsInByZWZpeCIsInRleHR1cmVQcm9taXNlcyIsIlJFUEVBVCIsImltYWdlUHJvbWlzZXMiLCJ4U2l6ZSIsInlTaXplIiwieE9mZnNldCIsInlPZmZzZXQiLCJ0ZXhWZXJ0aWNlcyIsInN1YlRleHR1cmVzIiwiYnVpbGRUaWxlcyIsImZyYW1lQnVmZmVyIiwic2l6ZSIsIm9mZnNldFgiLCJvZmZzZXRZIiwiZ2V0VGlsZSIsImFzc2VtYmxlIiwiREVQVEhfQlVGRkVSX0JJVCIsIlRleHR1cmVCYW5rIiwiX1ZpZXcyIiwiZHJhZ1N0YXJ0IiwiZHJhZ2dpbmciLCJtb3ZlU3RpY2siLCJkcm9wU3RpY2siLCJkcmFnU3RpY2siLCJwb3MiLCJwcmV2ZW50RGVmYXVsdCIsInRvdWNoZXMiLCJ4eCIsInl5IiwibGltaXQiLCJ0aWxlcyIsInNlbGVjdGVkR3JhcGhpYyIsIm11bHRpU2VsZWN0Iiwic2VsZWN0aW9uIiwic2VsZWN0ZWRJbWFnZSIsInNlbGVjdEdyYXBoaWMiLCJzZWxlY3RlZEltYWdlcyIsIkZsb29yIiwiTWFwIiwiX0luamVjdGFibGUkaW5qZWN0Iiwic3BsaXQiLCJzZWNvbmQiLCJleHBvcnQiLCJKU09OIiwic3RyaW5naWZ5IiwiaW1wb3J0IiwiaW5wdXQiLCJwYXJzZSIsIldlYlNvY2tldCIsIk1veldlYlNvY2tldCIsImJyIiwiYnJ1bmNoIiwiYXIiLCJkaXNhYmxlZCIsIl9hciIsImNhY2hlQnVzdGVyIiwidXJsIiwiZGF0ZSIsInJvdW5kIiwiRGF0ZSIsInJlcGxhY2UiLCJpbmRleE9mIiwiYnJvd3NlciIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsInRvTG93ZXJDYXNlIiwiZm9yY2VSZXBhaW50IiwicmVsb2FkZXJzIiwicGFnZSIsInJlbG9hZCIsInN0eWxlc2hlZXQiLCJxdWVyeVNlbGVjdG9yQWxsIiwibGluayIsInZhbCIsImdldEF0dHJpYnV0ZSIsImhyZWYiLCJzZXRUaW1lb3V0Iiwib2Zmc2V0SGVpZ2h0IiwiamF2YXNjcmlwdCIsInNjcmlwdHMiLCJ0ZXh0U2NyaXB0cyIsInNjcmlwdCIsInNyY1NjcmlwdHMiLCJsb2FkZWQiLCJvbkxvYWQiLCJldmFsIiwicmVtb3ZlIiwibmV3U2NyaXB0IiwiYXN5bmMiLCJoZWFkIiwiYXBwZW5kQ2hpbGQiLCJwb3J0IiwiaG9zdCIsInNlcnZlciIsImhvc3RuYW1lIiwiY29ubmVjdCIsImNvbm5lY3Rpb24iLCJvbm1lc3NhZ2UiLCJtZXNzYWdlIiwiZGF0YSIsInJlbG9hZGVyIiwib25lcnJvciIsInJlYWR5U3RhdGUiLCJjbG9zZSIsIm9uY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7OztJQzlLYUEsTUFBTSxHQUFBQyxPQUFBLENBQUFELE1BQUEsZ0JBQUFFLFlBQUEsVUFBQUYsT0FBQTtFQUFBRyxlQUFBLE9BQUFILE1BQUE7QUFBQTtBQUFHO0FBRXRCQSxNQUFNLENBQUNJLEtBQUssR0FBRyxPQUFPO0FBQ3RCOzs7Ozs7Ozs7Ozs7Ozs7O0lDSGFDLElBQUksR0FBQUosT0FBQSxDQUFBSSxJQUFBO0VBRWhCLFNBQUFBLEtBQVlDLE9BQU8sRUFDbkI7SUFBQUgsZUFBQSxPQUFBRSxJQUFBO0lBQ0MsSUFBSSxDQUFDQyxPQUFPLEdBQUtBLE9BQU8sSUFBSUMsUUFBUSxDQUFDQyxhQUFhLENBQUMsUUFBUSxDQUFDO0lBQzVELElBQUksQ0FBQ0MsT0FBTyxHQUFLLElBQUksQ0FBQ0gsT0FBTyxDQUFDSSxVQUFVLENBQUMsT0FBTyxDQUFDO0lBQ2pELElBQUksQ0FBQ0MsV0FBVyxHQUFHLENBQUM7SUFDcEIsSUFBSSxDQUFDQyxTQUFTLEdBQUcsQ0FBQztFQUNuQjtFQUFDLE9BQUFWLFlBQUEsQ0FBQUcsSUFBQTtJQUFBUSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBQyxPQUFPQSxDQUFBLEVBQ1A7TUFDQyxJQUFJLENBQUNOLE9BQU8sQ0FBQ08sYUFBYSxDQUFDLElBQUksQ0FBQ0MsT0FBTyxDQUFDO0lBQ3pDO0VBQUM7SUFBQUosR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQUksWUFBWUEsQ0FBQ0MsUUFBUSxFQUNyQjtNQUNDLElBQU1DLFNBQVMsR0FBR0QsUUFBUSxDQUFDRSxTQUFTLENBQUNGLFFBQVEsQ0FBQ0csV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQztNQUNqRSxJQUFNQyxJQUFJLEdBQUcsSUFBSTtNQUVqQixRQUFPSCxTQUFTLENBQUNJLFdBQVcsQ0FBQyxDQUFDO1FBRTdCLEtBQUssTUFBTTtVQUNWRCxJQUFJLEdBQUcsSUFBSSxDQUFDZCxPQUFPLENBQUNnQixhQUFhO1VBQ2pDO1FBQ0QsS0FBSyxNQUFNO1VBQ1ZGLElBQUksR0FBRyxJQUFJLENBQUNkLE9BQU8sQ0FBQ2lCLGVBQWU7VUFDbkM7TUFDRjtNQUVBLElBQU1DLE1BQU0sR0FBRyxJQUFJLENBQUNsQixPQUFPLENBQUNTLFlBQVksQ0FBQ0ssSUFBSSxDQUFDO01BQzlDLElBQU1LLE1BQU0sR0FBR0MsT0FBTyxDQUFDVixRQUFRLENBQUM7TUFFaEMsSUFBSSxDQUFDVixPQUFPLENBQUNxQixZQUFZLENBQUNILE1BQU0sRUFBRUMsTUFBTSxDQUFDO01BQ3pDLElBQUksQ0FBQ25CLE9BQU8sQ0FBQ3NCLGFBQWEsQ0FBQ0osTUFBTSxDQUFDO01BRWxDLElBQU1LLE9BQU8sR0FBRyxJQUFJLENBQUN2QixPQUFPLENBQUN3QixrQkFBa0IsQ0FDOUNOLE1BQU0sRUFDSixJQUFJLENBQUNsQixPQUFPLENBQUN5QixjQUNoQixDQUFDO01BRUQsSUFBR0YsT0FBTyxFQUNWO1FBQ0MsT0FBT0wsTUFBTTtNQUNkO01BRUFRLE9BQU8sQ0FBQ0MsS0FBSyxDQUFDLElBQUksQ0FBQzNCLE9BQU8sQ0FBQzRCLGdCQUFnQixDQUFDVixNQUFNLENBQUMsQ0FBQztNQUVwRCxJQUFJLENBQUNsQixPQUFPLENBQUM2QixZQUFZLENBQUNYLE1BQU0sQ0FBQztJQUNsQztFQUFDO0lBQUFkLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUF5QixhQUFhQSxDQUFDQyxZQUFZLEVBQUVDLGNBQWMsRUFDMUM7TUFDQyxJQUFNeEIsT0FBTyxHQUFHLElBQUksQ0FBQ1IsT0FBTyxDQUFDOEIsYUFBYSxDQUFDLENBQUM7TUFFNUMsSUFBSSxDQUFDOUIsT0FBTyxDQUFDaUMsWUFBWSxDQUFDekIsT0FBTyxFQUFFdUIsWUFBWSxDQUFDO01BQ2hELElBQUksQ0FBQy9CLE9BQU8sQ0FBQ2lDLFlBQVksQ0FBQ3pCLE9BQU8sRUFBRXdCLGNBQWMsQ0FBQztNQUVsRCxJQUFJLENBQUNoQyxPQUFPLENBQUNrQyxXQUFXLENBQUMxQixPQUFPLENBQUM7TUFFakMsSUFBSSxDQUFDUixPQUFPLENBQUNtQyxZQUFZLENBQUMzQixPQUFPLEVBQUV1QixZQUFZLENBQUM7TUFDaEQsSUFBSSxDQUFDL0IsT0FBTyxDQUFDbUMsWUFBWSxDQUFDM0IsT0FBTyxFQUFFd0IsY0FBYyxDQUFDO01BQ2xELElBQUksQ0FBQ2hDLE9BQU8sQ0FBQzZCLFlBQVksQ0FBQ0UsWUFBWSxDQUFDO01BQ3ZDLElBQUksQ0FBQy9CLE9BQU8sQ0FBQzZCLFlBQVksQ0FBQ0csY0FBYyxDQUFDO01BRXpDLElBQUcsSUFBSSxDQUFDaEMsT0FBTyxDQUFDb0MsbUJBQW1CLENBQUM1QixPQUFPLEVBQUUsSUFBSSxDQUFDUixPQUFPLENBQUNxQyxXQUFXLENBQUMsRUFDdEU7UUFDQyxPQUFPN0IsT0FBTztNQUNmO01BRUFrQixPQUFPLENBQUNDLEtBQUssQ0FBQyxJQUFJLENBQUMzQixPQUFPLENBQUNzQyxpQkFBaUIsQ0FBQzlCLE9BQU8sQ0FBQyxDQUFDO01BRXRELElBQUksQ0FBQ1IsT0FBTyxDQUFDTyxhQUFhLENBQUNDLE9BQU8sQ0FBQztNQUVuQyxPQUFPQSxPQUFPO0lBQ2Y7RUFBQztBQUFBOzs7Ozs7Ozs7OztBQzNFRixJQUFBK0IsS0FBQSxHQUFBbkIsT0FBQTtBQUNBLElBQUFvQixTQUFBLEdBQUFwQixPQUFBO0FBQ0EsSUFBQXFCLElBQUEsR0FBQXJCLE9BQUE7QUFFQSxJQUFBc0IsT0FBQSxHQUFBdEIsT0FBQTtBQUVBLElBQUF1QixJQUFBLEdBQUF2QixPQUFBO0FBRUEsSUFBQXdCLFlBQUEsR0FBQXhCLE9BQUE7QUFDQSxJQUFBeUIsWUFBQSxHQUFBekIsT0FBQTtBQUVBLElBQUEwQixXQUFBLEdBQUExQixPQUFBO0FBQ0EsSUFBQTJCLFVBQUEsR0FBQTNCLE9BQUE7QUFFQSxJQUFBNEIsT0FBQSxHQUFBNUIsT0FBQTtBQUNBLElBQUE2QixPQUFBLEdBQUE3QixPQUFBO0FBRUEsSUFBQThCLFlBQUEsR0FBQTlCLE9BQUE7QUFDQSxJQUFBK0IsT0FBQSxHQUFBL0IsT0FBQTtBQUEwQyxTQUFBMUIsZ0JBQUEwRCxDQUFBLEVBQUFDLENBQUEsVUFBQUQsQ0FBQSxZQUFBQyxDQUFBLGFBQUFDLFNBQUE7QUFBQSxTQUFBQyxrQkFBQUMsQ0FBQSxFQUFBQyxDQUFBLGFBQUFDLENBQUEsTUFBQUEsQ0FBQSxHQUFBRCxDQUFBLENBQUFFLE1BQUEsRUFBQUQsQ0FBQSxVQUFBRSxDQUFBLEdBQUFILENBQUEsQ0FBQUMsQ0FBQSxHQUFBRSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQVUsY0FBQSxDQUFBTixDQUFBLENBQUF4RCxHQUFBLEdBQUF3RCxDQUFBO0FBQUEsU0FBQW5FLGFBQUErRCxDQUFBLEVBQUFDLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFGLGlCQUFBLENBQUFDLENBQUEsQ0FBQVcsU0FBQSxFQUFBVixDQUFBLEdBQUFDLENBQUEsSUFBQUgsaUJBQUEsQ0FBQUMsQ0FBQSxFQUFBRSxDQUFBLEdBQUFNLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLGlCQUFBTyxRQUFBLFNBQUFQLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLFNBQUFrQixXQUFBbEIsQ0FBQSxFQUFBRSxDQUFBLEVBQUFKLENBQUEsV0FBQUksQ0FBQSxHQUFBaUIsZUFBQSxDQUFBakIsQ0FBQSxHQUFBa0IsMEJBQUEsQ0FBQXBCLENBQUEsRUFBQXFCLHlCQUFBLEtBQUFDLE9BQUEsQ0FBQUMsU0FBQSxDQUFBckIsQ0FBQSxFQUFBSixDQUFBLFFBQUFxQixlQUFBLENBQUFuQixDQUFBLEVBQUF3QixXQUFBLElBQUF0QixDQUFBLENBQUF1QixLQUFBLENBQUF6QixDQUFBLEVBQUFGLENBQUE7QUFBQSxTQUFBc0IsMkJBQUFwQixDQUFBLEVBQUFGLENBQUEsUUFBQUEsQ0FBQSxpQkFBQWMsT0FBQSxDQUFBZCxDQUFBLDBCQUFBQSxDQUFBLFVBQUFBLENBQUEsaUJBQUFBLENBQUEsWUFBQUYsU0FBQSxxRUFBQThCLHNCQUFBLENBQUExQixDQUFBO0FBQUEsU0FBQTBCLHVCQUFBNUIsQ0FBQSxtQkFBQUEsQ0FBQSxZQUFBNkIsY0FBQSxzRUFBQTdCLENBQUE7QUFBQSxTQUFBdUIsMEJBQUEsY0FBQXJCLENBQUEsSUFBQTRCLE9BQUEsQ0FBQW5CLFNBQUEsQ0FBQW9CLE9BQUEsQ0FBQWQsSUFBQSxDQUFBTyxPQUFBLENBQUFDLFNBQUEsQ0FBQUssT0FBQSxpQ0FBQTVCLENBQUEsYUFBQXFCLHlCQUFBLFlBQUFBLDBCQUFBLGFBQUFyQixDQUFBO0FBQUEsU0FBQW1CLGdCQUFBbkIsQ0FBQSxXQUFBbUIsZUFBQSxHQUFBYixNQUFBLENBQUF3QixjQUFBLEdBQUF4QixNQUFBLENBQUF5QixjQUFBLENBQUFDLElBQUEsZUFBQWhDLENBQUEsV0FBQUEsQ0FBQSxDQUFBaUMsU0FBQSxJQUFBM0IsTUFBQSxDQUFBeUIsY0FBQSxDQUFBL0IsQ0FBQSxNQUFBbUIsZUFBQSxDQUFBbkIsQ0FBQTtBQUFBLFNBQUFrQyxVQUFBbEMsQ0FBQSxFQUFBRixDQUFBLDZCQUFBQSxDQUFBLGFBQUFBLENBQUEsWUFBQUYsU0FBQSx3REFBQUksQ0FBQSxDQUFBUyxTQUFBLEdBQUFILE1BQUEsQ0FBQTZCLE1BQUEsQ0FBQXJDLENBQUEsSUFBQUEsQ0FBQSxDQUFBVyxTQUFBLElBQUFlLFdBQUEsSUFBQTdFLEtBQUEsRUFBQXFELENBQUEsRUFBQUssUUFBQSxNQUFBRCxZQUFBLFdBQUFFLE1BQUEsQ0FBQUMsY0FBQSxDQUFBUCxDQUFBLGlCQUFBSyxRQUFBLFNBQUFQLENBQUEsSUFBQXNDLGVBQUEsQ0FBQXBDLENBQUEsRUFBQUYsQ0FBQTtBQUFBLFNBQUFzQyxnQkFBQXBDLENBQUEsRUFBQUYsQ0FBQSxXQUFBc0MsZUFBQSxHQUFBOUIsTUFBQSxDQUFBd0IsY0FBQSxHQUFBeEIsTUFBQSxDQUFBd0IsY0FBQSxDQUFBRSxJQUFBLGVBQUFoQyxDQUFBLEVBQUFGLENBQUEsV0FBQUUsQ0FBQSxDQUFBaUMsU0FBQSxHQUFBbkMsQ0FBQSxFQUFBRSxDQUFBLEtBQUFvQyxlQUFBLENBQUFwQyxDQUFBLEVBQUFGLENBQUE7QUFFMUMsSUFBTXVDLFdBQVcsR0FBRyxDQUFDLENBQUM7QUFFdEJBLFdBQVcsQ0FBQ0MsY0FBYyxHQUFHLElBQUlDLHNCQUFjLENBQUQsQ0FBQztBQUMvQ0YsV0FBVyxDQUFDRyxRQUFRLEdBQUdDLGtCQUFRLENBQUNDLEdBQUcsQ0FBQyxDQUFDO0FBQUMsSUFHekJDLElBQUksR0FBQTdHLE9BQUEsQ0FBQTZHLElBQUEsMEJBQUFDLFNBQUE7RUFFaEIsU0FBQUQsS0FBWUUsSUFBSSxFQUNoQjtJQUFBLElBQUFDLEtBQUE7SUFBQTlHLGVBQUEsT0FBQTJHLElBQUE7SUFDQ0ksTUFBTSxDQUFDQyxXQUFXLEdBQUcsSUFBSTtJQUN6QkYsS0FBQSxHQUFBNUIsVUFBQSxPQUFBeUIsSUFBQSxHQUFNRSxJQUFJO0lBQ1ZDLEtBQUEsQ0FBS0csUUFBUSxHQUFJdkYsT0FBTyxDQUFDLFlBQVksQ0FBQztJQUN0Q29GLEtBQUEsQ0FBS0ksTUFBTSxHQUFNLEVBQUU7SUFFbkJKLEtBQUEsQ0FBS0ssUUFBUSxHQUFJLElBQUlDLFFBQUcsQ0FBRCxDQUFDO0lBQ3hCTixLQUFBLENBQUtOLFFBQVEsR0FBSUgsV0FBVyxDQUFDRyxRQUFRO0lBQ3JDTSxLQUFBLENBQUtPLEtBQUssR0FBTyxFQUFFO0lBQ25CUCxLQUFBLENBQUtRLFFBQVEsR0FBSVIsS0FBQSxDQUFLTyxLQUFLO0lBRTNCUCxLQUFBLENBQUtELElBQUksQ0FBQ1UsVUFBVSxHQUFHbEIsV0FBVyxDQUFDQyxjQUFjO0lBRWpEUSxLQUFBLENBQUtELElBQUksQ0FBQ1csR0FBRyxHQUFJLENBQUM7SUFDbEJWLEtBQUEsQ0FBS0QsSUFBSSxDQUFDWSxHQUFHLEdBQUksQ0FBQztJQUVsQlgsS0FBQSxDQUFLRCxJQUFJLENBQUNhLElBQUksR0FBRyxDQUFDO0lBQ2xCWixLQUFBLENBQUtELElBQUksQ0FBQ2MsSUFBSSxHQUFHLENBQUM7SUFFbEJiLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZSxTQUFTLEdBQVEsRUFBRTtJQUM3QmQsS0FBQSxDQUFLRCxJQUFJLENBQUNnQixjQUFjLEdBQUcsRUFBRTtJQUU3QmYsS0FBQSxDQUFLRCxJQUFJLENBQUNpQixVQUFVLEdBQUcsS0FBSztJQUU1QmhCLEtBQUEsQ0FBS04sUUFBUSxDQUFDdUIsU0FBUyxHQUFHLElBQUk7SUFFOUJqQixLQUFBLENBQUtOLFFBQVEsQ0FBQ3dCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLEdBQUcsRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ25FLENBQUMsRUFBQ29FLENBQUMsRUFBRztNQUN6QyxJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1FBQ0NwQixLQUFBLENBQUt1QixHQUFHLFVBQU8sQ0FBQyxDQUFDO01BQ2xCO0lBQ0QsQ0FBQyxDQUFDO0lBRUZ2QixLQUFBLENBQUtOLFFBQVEsQ0FBQ3dCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLFFBQVEsRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ25FLENBQUMsRUFBQ29FLENBQUMsRUFBRztNQUM5QyxJQUFHRixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQ1g7UUFDQ3BCLEtBQUEsQ0FBS3dCLFdBQVcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7TUFDNUI7SUFDRCxDQUFDLENBQUM7SUFFRnpCLEtBQUEsQ0FBS04sUUFBUSxDQUFDd0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsTUFBTSxFQUFFLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDbkUsQ0FBQyxFQUFDb0UsQ0FBQyxFQUFHO01BQzVDLElBQUdGLENBQUMsR0FBRyxDQUFDLEVBQ1I7UUFDQ3BCLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZSxTQUFTLEVBQUU7TUFDdEI7SUFDRCxDQUFDLENBQUM7SUFFRmQsS0FBQSxDQUFLTixRQUFRLENBQUN3QixJQUFJLENBQUNDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsVUFBQ0MsQ0FBQyxFQUFDQyxDQUFDLEVBQUNuRSxDQUFDLEVBQUNvRSxDQUFDLEVBQUc7TUFDM0MsSUFBR0YsQ0FBQyxHQUFHLENBQUMsRUFDUjtRQUNDcEIsS0FBQSxDQUFLRCxJQUFJLENBQUNlLFNBQVMsRUFBRTtRQUVyQixJQUFHZCxLQUFBLENBQUtELElBQUksQ0FBQ2UsU0FBUyxHQUFHLENBQUMsRUFDMUI7VUFDQ2QsS0FBQSxDQUFLRCxJQUFJLENBQUNlLFNBQVMsR0FBRyxDQUFDO1FBQ3hCO01BQ0Q7SUFDRCxDQUFDLENBQUM7SUFFRmQsS0FBQSxDQUFLTixRQUFRLENBQUN3QixJQUFJLENBQUNDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsVUFBQ0MsQ0FBQyxFQUFDQyxDQUFDLEVBQUNuRSxDQUFDLEVBQUNvRSxDQUFDLEVBQUc7TUFDOUMsSUFBR0YsQ0FBQyxHQUFHLENBQUMsRUFDUjtRQUNDcEIsS0FBQSxDQUFLRCxJQUFJLENBQUNnQixjQUFjLEVBQUU7TUFDM0I7SUFDRCxDQUFDLENBQUM7SUFFRmYsS0FBQSxDQUFLTixRQUFRLENBQUN3QixJQUFJLENBQUNDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsVUFBQ0MsQ0FBQyxFQUFDQyxDQUFDLEVBQUNuRSxDQUFDLEVBQUNvRSxDQUFDLEVBQUc7TUFDaEQsSUFBR0YsQ0FBQyxHQUFHLENBQUMsRUFDUjtRQUNDcEIsS0FBQSxDQUFLRCxJQUFJLENBQUNnQixjQUFjLEVBQUU7UUFFMUIsSUFBR2YsS0FBQSxDQUFLRCxJQUFJLENBQUNnQixjQUFjLEdBQUcsQ0FBQyxFQUMvQjtVQUNDZixLQUFBLENBQUtELElBQUksQ0FBQ2dCLGNBQWMsR0FBRyxDQUFDO1FBQzdCO01BQ0Q7SUFDRCxDQUFDLENBQUM7SUFFRmYsS0FBQSxDQUFLMEIsV0FBVyxHQUFHLElBQUlDLHdCQUFXLENBQUQsQ0FBQztJQUNsQzNCLEtBQUEsQ0FBS3VCLEdBQUcsR0FBVyxJQUFJSyxRQUFRLENBQUQsQ0FBQztJQUUvQjVCLEtBQUEsQ0FBS3VCLEdBQUcsVUFBTyxDQUFDLENBQUM7SUFFakJ2QixLQUFBLENBQUtELElBQUksQ0FBQzhCLFNBQVMsR0FBSSxJQUFJQyxvQkFBUyxDQUFDO01BQ3BDSixXQUFXLEVBQUUxQixLQUFBLENBQUswQixXQUFXO01BQzNCSCxHQUFHLEVBQVF2QixLQUFBLENBQUt1QjtJQUNuQixDQUFDLENBQUM7SUFBQyxPQUFBdkIsS0FBQTtFQUNKO0VBQUNaLFNBQUEsQ0FBQVMsSUFBQSxFQUFBQyxTQUFBO0VBQUEsT0FBQTdHLFlBQUEsQ0FBQTRHLElBQUE7SUFBQWpHLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFrSSxVQUFVQSxDQUFBLEVBQ1Y7TUFBQSxJQUFBQyxNQUFBO01BQ0MsSUFBTVIsV0FBVyxHQUFHLElBQUlTLHdCQUFXLENBQ2xDLElBQUksQ0FBQ0MsSUFBSSxDQUFDQyxNQUFNLENBQUM5SSxPQUFPLEVBQ3RCLElBQUksQ0FBQ2tJLEdBQ1IsQ0FBQztNQUVELElBQUksQ0FBQ0MsV0FBVyxHQUFHQSxXQUFXO01BRTlCLElBQU1ZLE1BQU0sR0FBRyxJQUFJQyxjQUFNLENBQUM7UUFDekJDLE1BQU0sRUFBRSxJQUFJQyxjQUFNLENBQUM7VUFDbEJDLEdBQUcsRUFBRUMsU0FBUztVQUNkakIsV0FBVyxFQUFFQSxXQUFXO1VBQ3hCRSxXQUFXLEVBQUUsSUFBSSxDQUFDQSxXQUFXO1VBQzdCZ0IsS0FBSyxFQUFFLEVBQUU7VUFDVEMsTUFBTSxFQUFFO1FBQ1QsQ0FBQyxDQUFDO1FBQ0ZsQyxVQUFVLEVBQUUsSUFBSW1DLHVCQUFVLENBQUM7VUFDMUJsRCxRQUFRLEVBQUUsSUFBSSxDQUFDQSxRQUFRO1VBQ3ZCRixjQUFjLEVBQUUsSUFBSSxDQUFDTyxJQUFJLENBQUNVO1FBQzNCLENBQUMsQ0FBQztRQUNGb0MsTUFBTSxFQUFFQztNQUNULENBQUMsQ0FBQztNQUVGLElBQUksQ0FBQ3pDLFFBQVEsQ0FBQzBDLEdBQUcsQ0FBQ1gsTUFBTSxDQUFDO01BQ3pCLElBQUksQ0FBQ1osV0FBVyxDQUFDd0IsT0FBTyxDQUFDRCxHQUFHLENBQUNYLE1BQU0sQ0FBQ0UsTUFBTSxDQUFDO01BRTNDLElBQUksQ0FBQ2QsV0FBVyxDQUFDeUIsU0FBUyxHQUFHYixNQUFNO01BRW5DLElBQUksQ0FBQzFDLFFBQVEsQ0FBQ3dCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLEdBQUcsRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ25FLENBQUMsRUFBQ29FLENBQUMsRUFBRztRQUN6QyxJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1VBQ0NZLE1BQUksQ0FBQ2tCLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDYjtNQUNELENBQUMsQ0FBQztNQUVGLElBQUksQ0FBQ3hELFFBQVEsQ0FBQ3dCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLEdBQUcsRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ25FLENBQUMsRUFBQ29FLENBQUMsRUFBRztRQUN6QyxJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1VBQ0NZLE1BQUksQ0FBQ2tCLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDYjtNQUNELENBQUMsQ0FBQztNQUVGLElBQUksQ0FBQ3hELFFBQVEsQ0FBQ3dCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLEdBQUcsRUFBRSxVQUFDQyxDQUFDLEVBQUNDLENBQUMsRUFBQ25FLENBQUMsRUFBQ29FLENBQUMsRUFBRztRQUN6QyxJQUFHRixDQUFDLEdBQUcsQ0FBQyxFQUNSO1VBQ0NZLE1BQUksQ0FBQ2tCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNkO01BQ0QsQ0FBQyxDQUFDO01BRUYsSUFBSSxDQUFDbkQsSUFBSSxDQUFDOEIsU0FBUyxDQUFDOUIsSUFBSSxDQUFDb0IsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFVBQUNDLENBQUMsRUFBRztRQUN2RCxJQUFHLENBQUNBLENBQUMsSUFBSVksTUFBSSxDQUFDUixXQUFXLENBQUMyQixRQUFRLENBQUNDLE9BQU8sSUFBSSxJQUFJLEVBQ2xEO1VBQ0M7UUFDRDtRQUVBcEIsTUFBSSxDQUFDakMsSUFBSSxDQUFDaUIsVUFBVSxHQUFHLEtBQUs7UUFFNUIsSUFBSXBELENBQUMsR0FBSW9FLE1BQUksQ0FBQ1IsV0FBVyxDQUFDMkIsUUFBUSxDQUFDRSxZQUFZO1FBQy9DLElBQUlDLEVBQUUsR0FBR3RCLE1BQUksQ0FBQ1IsV0FBVyxDQUFDMkIsUUFBUSxDQUFDQyxPQUFPO1FBRTFDLElBQUdFLEVBQUUsR0FBRzFGLENBQUMsRUFDVDtVQUFBLElBQUEyRixJQUFBLEdBQ1csQ0FBQzNGLENBQUMsRUFBRTBGLEVBQUUsQ0FBQztVQUFoQkEsRUFBRSxHQUFBQyxJQUFBO1VBQUUzRixDQUFDLEdBQUEyRixJQUFBO1FBQ1A7UUFFQSxPQUFNM0YsQ0FBQyxJQUFHMEYsRUFBRSxFQUFFMUYsQ0FBQyxFQUFFLEVBQ2pCO1VBQ0MsSUFBSTRGLENBQUMsR0FBSXhCLE1BQUksQ0FBQ1IsV0FBVyxDQUFDMkIsUUFBUSxDQUFDTSxZQUFZO1VBQy9DLElBQUlDLEVBQUUsR0FBRzFCLE1BQUksQ0FBQ1IsV0FBVyxDQUFDMkIsUUFBUSxDQUFDUSxPQUFPO1VBQzFDLElBQUdELEVBQUUsR0FBR0YsQ0FBQyxFQUNUO1lBQUEsSUFBQUksS0FBQSxHQUNXLENBQUNKLENBQUMsRUFBRUUsRUFBRSxDQUFDO1lBQWhCQSxFQUFFLEdBQUFFLEtBQUE7WUFBRUosQ0FBQyxHQUFBSSxLQUFBO1VBQ1A7VUFDQSxPQUFNSixDQUFDLElBQUlFLEVBQUUsRUFBRUYsQ0FBQyxFQUFFLEVBQ2xCO1lBQ0N4QixNQUFJLENBQUNULEdBQUcsQ0FBQ3NDLE9BQU8sQ0FBQ2pHLENBQUMsRUFBRTRGLENBQUMsRUFBRXBDLENBQUMsQ0FBQztVQUMxQjtRQUNEO1FBRUFZLE1BQUksQ0FBQ1QsR0FBRyxDQUFDc0MsT0FBTyxDQUNmN0IsTUFBSSxDQUFDUixXQUFXLENBQUMyQixRQUFRLENBQUNDLE9BQU8sRUFDL0JwQixNQUFJLENBQUNSLFdBQVcsQ0FBQzJCLFFBQVEsQ0FBQ1EsT0FBTyxFQUNqQ3ZDLENBQ0gsQ0FBQztRQUVEWSxNQUFJLENBQUNSLFdBQVcsQ0FBQ3NDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pCOUIsTUFBSSxDQUFDUixXQUFXLENBQUNDLFFBQVEsQ0FBQyxDQUFDO01BQzVCLENBQUMsQ0FBQztNQUVGLElBQUksQ0FBQ0QsV0FBVyxDQUFDMkIsUUFBUSxDQUFDaEMsTUFBTSxDQUFDLFVBQUNDLENBQUMsRUFBQ0MsQ0FBQyxFQUFDbkUsQ0FBQyxFQUFDb0UsQ0FBQyxFQUFDeUMsQ0FBQyxFQUFHO1FBQzdDLElBQUcvQixNQUFJLENBQUNSLFdBQVcsQ0FBQzJCLFFBQVEsQ0FBQ2EsTUFBTSxJQUFJLElBQUksRUFDM0M7VUFDQ2hDLE1BQUksQ0FBQ2pDLElBQUksQ0FBQ2lCLFVBQVUsR0FBRyxLQUFLO1VBQzVCO1FBQ0Q7UUFFQWdCLE1BQUksQ0FBQ2pDLElBQUksQ0FBQzhCLFNBQVMsQ0FBQ29DLE1BQU0sQ0FBQ2pDLE1BQUksQ0FBQ1IsV0FBVyxDQUFDMkIsUUFBUSxDQUFDO1FBRXJEbkIsTUFBSSxDQUFDakMsSUFBSSxDQUFDaUIsVUFBVSxHQUFHLElBQUk7UUFFM0JnQixNQUFJLENBQUNSLFdBQVcsQ0FBQ3NDLE1BQU0sQ0FBQyxDQUFDO01BQzFCLENBQUMsRUFBQztRQUFDSSxJQUFJLEVBQUM7TUFBQyxDQUFDLENBQUM7TUFFWCxJQUFJLENBQUNuRSxJQUFJLENBQUNpQixVQUFVLEdBQUcsSUFBSTtNQUUzQmYsTUFBTSxDQUFDa0UsZ0JBQWdCLENBQUMsUUFBUSxFQUFFO1FBQUEsT0FBTW5DLE1BQUksQ0FBQzhCLE1BQU0sQ0FBQyxDQUFDO01BQUEsRUFBQztNQUV0RCxJQUFJTSxLQUFLLEdBQUcsQ0FBQztNQUNiLElBQUlDLEtBQUssR0FBRyxDQUFDO01BRWIsSUFBSUMsUUFBUSxHQUFHLEVBQUU7TUFDakIsSUFBSUMsUUFBUSxHQUFHLEVBQUU7TUFFakIsSUFBSUMsVUFBVSxHQUFHLENBQUM7TUFFbEIsSUFBTUMsUUFBUSxHQUFHLFNBQVhBLFFBQVFBLENBQUlDLEdBQUcsRUFBSztRQUN6QkEsR0FBRyxHQUFHQSxHQUFHLEdBQUcsSUFBSTtRQUVoQixJQUFNQyxLQUFLLEdBQUdELEdBQUcsR0FBR0wsS0FBSztRQUV6QixJQUFHckMsTUFBSSxDQUFDakMsSUFBSSxDQUFDZ0IsY0FBYyxJQUFJLENBQUMsRUFDaEM7VUFDQ3dELFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztVQUNkO1FBQ0Q7UUFFQSxJQUFHSSxLQUFLLEdBQUcsQ0FBQyxJQUFFM0MsTUFBSSxDQUFDakMsSUFBSSxDQUFDZ0IsY0FBYyxHQUFFLEVBQUUsSUFBSWlCLE1BQUksQ0FBQ2pDLElBQUksQ0FBQ2dCLGNBQWMsR0FBQyxFQUFFLENBQUUsQ0FBQyxFQUM1RTtVQUNDO1FBQ0Q7UUFFQXNELEtBQUssR0FBR0ssR0FBRztRQUVYMUMsTUFBSSxDQUFDdEMsUUFBUSxDQUFDa0YsTUFBTSxDQUFDLENBQUM7UUFFdEJwSCxNQUFNLENBQUNxSCxNQUFNLENBQUM3QyxNQUFJLENBQUMzQixRQUFRLENBQUN5RSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUN2RCxHQUFHLENBQUMsVUFBQ3ZFLENBQUMsRUFBRztVQUM3Q0EsQ0FBQyxDQUFDeUgsUUFBUSxDQUFDLENBQUM7UUFDYixDQUFDLENBQUM7O1FBRUY7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7O1FBRUF6QyxNQUFJLENBQUNqQyxJQUFJLENBQUNnRixJQUFJLEdBQUksQ0FBQyxHQUFHSixLQUFNO1FBRTVCSixRQUFRLENBQUNTLElBQUksQ0FBQ2hELE1BQUksQ0FBQ2pDLElBQUksQ0FBQ2dGLElBQUksQ0FBQztRQUU3QixPQUFNUixRQUFRLENBQUNwSCxNQUFNLEdBQUdxSCxVQUFVLEVBQ2xDO1VBQ0NELFFBQVEsQ0FBQ1UsS0FBSyxDQUFDLENBQUM7UUFDakI7O1FBRUE7TUFDRCxDQUFDO01BRUQsSUFBTUwsT0FBTSxHQUFHLFNBQVRBLE1BQU1BLENBQUlGLEdBQUcsRUFBSTtRQUN0QnpFLE1BQU0sQ0FBQ2lGLHFCQUFxQixDQUFDTixPQUFNLENBQUM7UUFDcEM1QyxNQUFJLENBQUNSLFdBQVcsQ0FBQzJELElBQUksQ0FBQyxDQUFDO1FBRXZCLElBQU1SLEtBQUssR0FBR0QsR0FBRyxHQUFHTixLQUFLO1FBQ3pCQSxLQUFLLEdBQUdNLEdBQUc7UUFFWDFDLE1BQUksQ0FBQ2pDLElBQUksQ0FBQ1csR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHaUUsS0FBSyxFQUFFUyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRXpDcEQsTUFBSSxDQUFDakMsSUFBSSxDQUFDYSxJQUFJLEdBQUd6QyxNQUFNLENBQUMyRSxjQUFNLENBQUN1QyxDQUFDLENBQUMsQ0FBQ0QsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM1Q3BELE1BQUksQ0FBQ2pDLElBQUksQ0FBQ2MsSUFBSSxHQUFHMUMsTUFBTSxDQUFDMkUsY0FBTSxDQUFDd0MsQ0FBQyxDQUFDLENBQUNGLE9BQU8sQ0FBQyxDQUFDLENBQUM7TUFDN0MsQ0FBQztNQUVELElBQUksQ0FBQzVELFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsR0FBR0wsUUFBUSxDQUFDa00sSUFBSSxDQUFDQyxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUM7TUFDdkUsSUFBSSxDQUFDM0IsTUFBTSxDQUFDLENBQUM7TUFFYmMsT0FBTSxDQUFDYyxXQUFXLENBQUNoQixHQUFHLENBQUMsQ0FBQyxDQUFDO01BRXpCaUIsV0FBVyxDQUFDLFlBQUk7UUFDZmxCLFFBQVEsQ0FBQ2lCLFdBQVcsQ0FBQ2hCLEdBQUcsQ0FBQyxDQUFDLENBQUM7TUFDNUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztNQUVMaUIsV0FBVyxDQUFDLFlBQUk7UUFDZnJNLFFBQVEsQ0FBQ0gsS0FBSyxNQUFBeU0sTUFBQSxDQUFNN00sY0FBTSxDQUFDSSxLQUFLLE9BQUF5TSxNQUFBLENBQUk1RCxNQUFJLENBQUNqQyxJQUFJLENBQUNXLEdBQUcsU0FBTTtNQUN4RCxDQUFDLEVBQUUsR0FBRyxHQUFDLENBQUMsQ0FBQztNQUVUaUYsV0FBVyxDQUFDLFlBQUk7UUFDZixJQUFNaEYsR0FBRyxHQUFHNEQsUUFBUSxDQUFDc0IsTUFBTSxDQUFDLFVBQUNqSixDQUFDLEVBQUNrSixDQUFDO1VBQUEsT0FBR2xKLENBQUMsR0FBQ2tKLENBQUM7UUFBQSxHQUFFLENBQUMsQ0FBQyxHQUFHdkIsUUFBUSxDQUFDcEgsTUFBTTtRQUM1RDZFLE1BQUksQ0FBQ2pDLElBQUksQ0FBQ1ksR0FBRyxHQUFHQSxHQUFHLENBQUN5RSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUNXLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO01BQ2hELENBQUMsRUFBRSxHQUFHLEdBQUMsQ0FBQyxDQUFDO0lBQ1Y7RUFBQztJQUFBbk0sR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWlLLE1BQU1BLENBQUN1QixDQUFDLEVBQUVDLENBQUMsRUFDWDtNQUNDLElBQUksQ0FBQ3ZGLElBQUksQ0FBQzJDLEtBQUssR0FBSSxJQUFJLENBQUNSLElBQUksQ0FBQ0MsTUFBTSxDQUFDOUksT0FBTyxDQUFDcUosS0FBSyxHQUFLMkMsQ0FBQyxJQUFJL0wsUUFBUSxDQUFDa00sSUFBSSxDQUFDUSxXQUFXO01BQ3BGLElBQUksQ0FBQ2pHLElBQUksQ0FBQzRDLE1BQU0sR0FBRyxJQUFJLENBQUNULElBQUksQ0FBQ0MsTUFBTSxDQUFDOUksT0FBTyxDQUFDc0osTUFBTSxHQUFJMkMsQ0FBQyxJQUFJaE0sUUFBUSxDQUFDa00sSUFBSSxDQUFDQyxZQUFZO01BRXJGLElBQUksQ0FBQzFGLElBQUksQ0FBQ2tHLE1BQU0sR0FBSUMsSUFBSSxDQUFDQyxLQUFLLENBQzdCLENBQUNkLENBQUMsSUFBSS9MLFFBQVEsQ0FBQ2tNLElBQUksQ0FBQ1EsV0FBVyxJQUFLLElBQUksQ0FBQ3hFLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQzNELENBQUM7TUFFRCxJQUFJLENBQUNvRyxJQUFJLENBQUNxRyxPQUFPLEdBQUdGLElBQUksQ0FBQ0MsS0FBSyxDQUM3QixDQUFDYixDQUFDLElBQUloTSxRQUFRLENBQUNrTSxJQUFJLENBQUNDLFlBQVksSUFBSSxJQUFJLENBQUNqRSxXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUMzRCxDQUFDO01BRUQsSUFBTTBNLFFBQVEsR0FBRyxJQUFJLENBQUM3RSxXQUFXLENBQUMrRCxJQUFJLENBQUM3TCxXQUFXO01BQ2xELElBQUksQ0FBQzhILFdBQVcsQ0FBQytELElBQUksQ0FBQzdMLFdBQVcsR0FBR0osUUFBUSxDQUFDa00sSUFBSSxDQUFDQyxZQUFZLEdBQUcsSUFBSTtNQUVyRSxJQUFJLENBQUNqRSxXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLElBQUksSUFBSSxDQUFDNkgsV0FBVyxDQUFDK0QsSUFBSSxDQUFDN0wsV0FBVyxHQUFHMk0sUUFBUTtNQUUvRSxJQUFJLENBQUM3RSxXQUFXLENBQUNzQyxNQUFNLENBQUMsQ0FBQztJQUMxQjtFQUFDO0lBQUFsSyxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBeU0sTUFBTUEsQ0FBQ0MsS0FBSyxFQUNaO01BQ0MsSUFBSTVCLEtBQUssR0FBRzRCLEtBQUssQ0FBQ0MsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FDaENELEtBQUssQ0FBQ0MsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FDdkI7TUFFRCxJQUFJLENBQUN0RCxJQUFJLENBQUN5QixLQUFLLENBQUM7SUFDakI7RUFBQztJQUFBL0ssR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXFKLElBQUlBLENBQUN5QixLQUFLLEVBQ1Y7TUFDQyxJQUFNOEIsR0FBRyxHQUFHLElBQUksQ0FBQ2pGLFdBQVcsQ0FBQytELElBQUksQ0FBQzdMLFdBQVcsR0FBRyxFQUFFO01BQ2xELElBQU1nTixHQUFHLEdBQUcsSUFBSSxDQUFDbEYsV0FBVyxDQUFDK0QsSUFBSSxDQUFDN0wsV0FBVyxHQUFHLE1BQU07TUFDdEQsSUFBTWlOLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDbkYsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUztNQUVuRCxJQUFJQSxTQUFTLEdBQUcsSUFBSSxDQUFDNkgsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxHQUFJZ0wsS0FBSyxHQUFHZ0MsSUFBSztNQUVoRSxJQUFHaE4sU0FBUyxHQUFHK00sR0FBRyxFQUNsQjtRQUNDL00sU0FBUyxHQUFHK00sR0FBRztNQUNoQixDQUFDLE1BQ0ksSUFBRy9NLFNBQVMsR0FBRzhNLEdBQUcsRUFDdkI7UUFDQzlNLFNBQVMsR0FBRzhNLEdBQUc7TUFDaEI7TUFFQSxJQUFHLElBQUksQ0FBQ2pGLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsS0FBS0EsU0FBUyxFQUNoRDtRQUNDLElBQUksQ0FBQzZILFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVMsR0FBR0EsU0FBUztRQUMzQyxJQUFJLENBQUNtSyxNQUFNLENBQUMsQ0FBQztNQUNkO0lBQ0Q7RUFBQztBQUFBLEVBL1V3QjhDLFVBQVE7OztDQzFCbEM7QUFBQTtBQUFBO0FBQUE7Ozs7QUNBQSxJQUFBQyxPQUFBLEdBQUFqTSxPQUFBO0FBQ0EsSUFBQW1CLEtBQUEsR0FBQW5CLE9BQUE7QUFFQSxJQUFHa00sS0FBSyxLQUFLckUsU0FBUyxFQUN0QjtFQUNDbkosUUFBUSxDQUFDNkssZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsWUFBTTtJQUNuRCxJQUFNNEMsSUFBSSxHQUFHLElBQUlsSCxVQUFJLENBQUMsQ0FBQztJQUV2Qm1ILGNBQU0sQ0FBQ0MsTUFBTSxDQUFDRixJQUFJLENBQUM7SUFFbkJBLElBQUksQ0FBQ0csTUFBTSxDQUFDNU4sUUFBUSxDQUFDa00sSUFBSSxDQUFDO0VBQzNCLENBQUMsQ0FBQztBQUNILENBQUMsTUFFRDtFQUNDO0FBQUE7Ozs7Ozs7Ozs7O0FDZkQsSUFBQTJCLFlBQUEsR0FBQXZNLE9BQUE7QUFBMEMsU0FBQTFCLGdCQUFBMEQsQ0FBQSxFQUFBQyxDQUFBLFVBQUFELENBQUEsWUFBQUMsQ0FBQSxhQUFBQyxTQUFBO0FBQUEsU0FBQUMsa0JBQUFDLENBQUEsRUFBQUMsQ0FBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUQsQ0FBQSxDQUFBRSxNQUFBLEVBQUFELENBQUEsVUFBQUUsQ0FBQSxHQUFBSCxDQUFBLENBQUFDLENBQUEsR0FBQUUsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsQ0FBQUMsVUFBQSxRQUFBRCxDQUFBLENBQUFFLFlBQUEsa0JBQUFGLENBQUEsS0FBQUEsQ0FBQSxDQUFBRyxRQUFBLFFBQUFDLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLEVBQUFVLGNBQUEsQ0FBQU4sQ0FBQSxDQUFBeEQsR0FBQSxHQUFBd0QsQ0FBQTtBQUFBLFNBQUFuRSxhQUFBK0QsQ0FBQSxFQUFBQyxDQUFBLEVBQUFDLENBQUEsV0FBQUQsQ0FBQSxJQUFBRixpQkFBQSxDQUFBQyxDQUFBLENBQUFXLFNBQUEsRUFBQVYsQ0FBQSxHQUFBQyxDQUFBLElBQUFILGlCQUFBLENBQUFDLENBQUEsRUFBQUUsQ0FBQSxHQUFBTSxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxpQkFBQU8sUUFBQSxTQUFBUCxDQUFBO0FBQUEsU0FBQVUsZUFBQVIsQ0FBQSxRQUFBVSxDQUFBLEdBQUFDLFlBQUEsQ0FBQVgsQ0FBQSxnQ0FBQVksT0FBQSxDQUFBRixDQUFBLElBQUFBLENBQUEsR0FBQUEsQ0FBQTtBQUFBLFNBQUFDLGFBQUFYLENBQUEsRUFBQUQsQ0FBQSxvQkFBQWEsT0FBQSxDQUFBWixDQUFBLE1BQUFBLENBQUEsU0FBQUEsQ0FBQSxNQUFBRixDQUFBLEdBQUFFLENBQUEsQ0FBQWEsTUFBQSxDQUFBQyxXQUFBLGtCQUFBaEIsQ0FBQSxRQUFBWSxDQUFBLEdBQUFaLENBQUEsQ0FBQWlCLElBQUEsQ0FBQWYsQ0FBQSxFQUFBRCxDQUFBLGdDQUFBYSxPQUFBLENBQUFGLENBQUEsVUFBQUEsQ0FBQSxZQUFBZCxTQUFBLHlFQUFBRyxDQUFBLEdBQUFpQixNQUFBLEdBQUFDLE1BQUEsRUFBQWpCLENBQUE7QUFBQSxTQUFBa0IsV0FBQWxCLENBQUEsRUFBQUUsQ0FBQSxFQUFBSixDQUFBLFdBQUFJLENBQUEsR0FBQWlCLGVBQUEsQ0FBQWpCLENBQUEsR0FBQWtCLDBCQUFBLENBQUFwQixDQUFBLEVBQUFxQix5QkFBQSxLQUFBQyxPQUFBLENBQUFDLFNBQUEsQ0FBQXJCLENBQUEsRUFBQUosQ0FBQSxRQUFBcUIsZUFBQSxDQUFBbkIsQ0FBQSxFQUFBd0IsV0FBQSxJQUFBdEIsQ0FBQSxDQUFBdUIsS0FBQSxDQUFBekIsQ0FBQSxFQUFBRixDQUFBO0FBQUEsU0FBQXNCLDJCQUFBcEIsQ0FBQSxFQUFBRixDQUFBLFFBQUFBLENBQUEsaUJBQUFjLE9BQUEsQ0FBQWQsQ0FBQSwwQkFBQUEsQ0FBQSxVQUFBQSxDQUFBLGlCQUFBQSxDQUFBLFlBQUFGLFNBQUEscUVBQUE4QixzQkFBQSxDQUFBMUIsQ0FBQTtBQUFBLFNBQUEwQix1QkFBQTVCLENBQUEsbUJBQUFBLENBQUEsWUFBQTZCLGNBQUEsc0VBQUE3QixDQUFBO0FBQUEsU0FBQXVCLDBCQUFBLGNBQUFyQixDQUFBLElBQUE0QixPQUFBLENBQUFuQixTQUFBLENBQUFvQixPQUFBLENBQUFkLElBQUEsQ0FBQU8sT0FBQSxDQUFBQyxTQUFBLENBQUFLLE9BQUEsaUNBQUE1QixDQUFBLGFBQUFxQix5QkFBQSxZQUFBQSwwQkFBQSxhQUFBckIsQ0FBQTtBQUFBLFNBQUFtQixnQkFBQW5CLENBQUEsV0FBQW1CLGVBQUEsR0FBQWIsTUFBQSxDQUFBd0IsY0FBQSxHQUFBeEIsTUFBQSxDQUFBeUIsY0FBQSxDQUFBQyxJQUFBLGVBQUFoQyxDQUFBLFdBQUFBLENBQUEsQ0FBQWlDLFNBQUEsSUFBQTNCLE1BQUEsQ0FBQXlCLGNBQUEsQ0FBQS9CLENBQUEsTUFBQW1CLGVBQUEsQ0FBQW5CLENBQUE7QUFBQSxTQUFBa0MsVUFBQWxDLENBQUEsRUFBQUYsQ0FBQSw2QkFBQUEsQ0FBQSxhQUFBQSxDQUFBLFlBQUFGLFNBQUEsd0RBQUFJLENBQUEsQ0FBQVMsU0FBQSxHQUFBSCxNQUFBLENBQUE2QixNQUFBLENBQUFyQyxDQUFBLElBQUFBLENBQUEsQ0FBQVcsU0FBQSxJQUFBZSxXQUFBLElBQUE3RSxLQUFBLEVBQUFxRCxDQUFBLEVBQUFLLFFBQUEsTUFBQUQsWUFBQSxXQUFBRSxNQUFBLENBQUFDLGNBQUEsQ0FBQVAsQ0FBQSxpQkFBQUssUUFBQSxTQUFBUCxDQUFBLElBQUFzQyxlQUFBLENBQUFwQyxDQUFBLEVBQUFGLENBQUE7QUFBQSxTQUFBc0MsZ0JBQUFwQyxDQUFBLEVBQUFGLENBQUEsV0FBQXNDLGVBQUEsR0FBQTlCLE1BQUEsQ0FBQXdCLGNBQUEsR0FBQXhCLE1BQUEsQ0FBQXdCLGNBQUEsQ0FBQUUsSUFBQSxlQUFBaEMsQ0FBQSxFQUFBRixDQUFBLFdBQUFFLENBQUEsQ0FBQWlDLFNBQUEsR0FBQW5DLENBQUEsRUFBQUUsQ0FBQSxLQUFBb0MsZUFBQSxDQUFBcEMsQ0FBQSxFQUFBRixDQUFBO0FBQUEsSUFFN0JvSyxTQUFTLEdBQUFwTyxPQUFBLENBQUFvTyxTQUFBLDBCQUFBQyxXQUFBO0VBQUEsU0FBQUQsVUFBQTtJQUFBbE8sZUFBQSxPQUFBa08sU0FBQTtJQUFBLE9BQUFoSixVQUFBLE9BQUFnSixTQUFBLEVBQUFFLFNBQUE7RUFBQTtFQUFBbEksU0FBQSxDQUFBZ0ksU0FBQSxFQUFBQyxXQUFBO0VBQUEsT0FBQXBPLFlBQUEsQ0FBQW1PLFNBQUE7SUFBQXhOLEdBQUE7SUFBQUMsS0FBQSxFQUVyQixTQUFBME4sTUFBTUEsQ0FBQ0MsVUFBVSxFQUNqQjtNQUNDLE9BQU8sSUFBSSxJQUFJLENBQUM5SSxXQUFXLENBQUNsQixNQUFNLENBQUNpSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFRCxVQUFVLENBQUMsQ0FBQztJQUNqRTtFQUFDO0FBQUEsRUFMNkJFLHVCQUFVOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0Z6QyxJQUFJQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLElBQUlDLE9BQU8sR0FBRyxDQUFDLENBQUM7QUFBQyxJQUVKRixVQUFVLEdBQUExTyxPQUFBLENBQUEwTyxVQUFBO0VBRXRCLFNBQUFBLFdBQUEsRUFDQTtJQUFBeE8sZUFBQSxPQUFBd08sVUFBQTtJQUNDLElBQUlGLFVBQVUsR0FBRyxJQUFJLENBQUM5SSxXQUFXLENBQUM4SSxVQUFVLENBQUMsQ0FBQztJQUM5QyxJQUFJaE8sT0FBTyxHQUFNLElBQUksQ0FBQ2tGLFdBQVcsQ0FBQ2xGLE9BQU8sQ0FBQyxDQUFDO0lBRTNDLElBQUcsQ0FBQ21PLE9BQU8sQ0FBQ25PLE9BQU8sQ0FBQyxFQUNwQjtNQUNDbU8sT0FBTyxDQUFDbk8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RCO0lBRUEsSUFBRyxDQUFDb08sT0FBTyxDQUFDcE8sT0FBTyxDQUFDLEVBQ3BCO01BQ0NvTyxPQUFPLENBQUNwTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEI7SUFFQSxLQUFJLElBQUlxTyxJQUFJLElBQUlMLFVBQVUsRUFDMUI7TUFDQyxJQUFJTSxTQUFTLEdBQUdOLFVBQVUsQ0FBQ0ssSUFBSSxDQUFDO01BRWhDLElBQUdGLE9BQU8sQ0FBQ25PLE9BQU8sQ0FBQyxDQUFDcU8sSUFBSSxDQUFDLElBQUksQ0FBQ0MsU0FBUyxDQUFDbkssU0FBUyxFQUNqRDtRQUNDO01BQ0Q7TUFFQSxJQUFHLE9BQU8sQ0FBQ29LLElBQUksQ0FBQzdKLE1BQU0sQ0FBQzJKLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ2hDO1FBQ0NGLE9BQU8sQ0FBQ25PLE9BQU8sQ0FBQyxDQUFDcU8sSUFBSSxDQUFDLEdBQUdDLFNBQVM7TUFDbkM7SUFFRDtJQUVBLEtBQUksSUFBSUQsS0FBSSxJQUFJTCxVQUFVLEVBQzFCO01BQ0MsSUFBSVEsUUFBUSxHQUFJdkYsU0FBUztNQUN6QixJQUFJcUYsVUFBUyxHQUFHSCxPQUFPLENBQUNuTyxPQUFPLENBQUMsQ0FBQ3FPLEtBQUksQ0FBQyxJQUFJTCxVQUFVLENBQUNLLEtBQUksQ0FBQztNQUUxRCxJQUFHLE9BQU8sQ0FBQ0UsSUFBSSxDQUFDN0osTUFBTSxDQUFDMkosS0FBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDaEM7UUFDQyxJQUFHQyxVQUFTLENBQUNuSyxTQUFTLEVBQ3RCO1VBQ0MsSUFBRyxDQUFDaUssT0FBTyxDQUFDcE8sT0FBTyxDQUFDLENBQUNxTyxLQUFJLENBQUMsRUFDMUI7WUFDQ0QsT0FBTyxDQUFDcE8sT0FBTyxDQUFDLENBQUNxTyxLQUFJLENBQUMsR0FBRyxJQUFJQyxVQUFTLENBQUQsQ0FBQztVQUN2QztRQUNELENBQUMsTUFFRDtVQUNDRixPQUFPLENBQUNwTyxPQUFPLENBQUMsQ0FBQ3FPLEtBQUksQ0FBQyxHQUFHQyxVQUFTO1FBQ25DO1FBRUFFLFFBQVEsR0FBR0osT0FBTyxDQUFDcE8sT0FBTyxDQUFDLENBQUNxTyxLQUFJLENBQUM7TUFDbEMsQ0FBQyxNQUVEO1FBQ0MsSUFBR0MsVUFBUyxDQUFDbkssU0FBUyxFQUN0QjtVQUNDcUssUUFBUSxHQUFHLElBQUlGLFVBQVMsQ0FBRCxDQUFDO1FBQ3pCLENBQUMsTUFFRDtVQUNDRSxRQUFRLEdBQUdGLFVBQVM7UUFDckI7TUFDRDtNQUVBdEssTUFBTSxDQUFDQyxjQUFjLENBQUMsSUFBSSxFQUFFb0ssS0FBSSxFQUFFO1FBQ2pDeEssVUFBVSxFQUFFLEtBQUs7UUFDakJFLFFBQVEsRUFBSSxLQUFLO1FBQ2pCMUQsS0FBSyxFQUFPbU87TUFDYixDQUFDLENBQUM7SUFDSDtFQUVEO0VBQUMsT0FBQS9PLFlBQUEsQ0FBQXlPLFVBQUE7SUFBQTlOLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQU8yTixVQUFVQSxDQUFBLEVBQ2pCO01BQ0MsT0FBTyxDQUFDLENBQUM7SUFDVjtFQUFDO0lBQUE1TixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFPTCxPQUFPQSxDQUFBLEVBQ2Q7TUFDQyxPQUFPLEdBQUc7SUFDWDtFQUFDO0lBQUFJLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQU8wTixNQUFNQSxDQUFDQyxXQUFVLEVBQ3hCO01BQUEsSUFEMEJoTyxRQUFPLEdBQUE4TixTQUFBLENBQUFuSyxNQUFBLFFBQUFtSyxTQUFBLFFBQUE3RSxTQUFBLEdBQUE2RSxTQUFBLE1BQUcsR0FBRztNQUV0QyxJQUFHLEVBQUUsSUFBSSxDQUFDM0osU0FBUyxZQUFZK0osVUFBVSxJQUFJLElBQUksS0FBS0EsVUFBVSxDQUFDLEVBQ2pFO1FBQ0MsTUFBTSxJQUFJTyxLQUFLLDhMQVdqQixDQUFDO01BQ0E7TUFFQSxJQUFJQyxrQkFBa0IsR0FBRyxJQUFJLENBQUNWLFVBQVUsQ0FBQyxDQUFDO01BRTFDLDhCQUFBeEgsS0FBQTtRQUFBLFNBQUFtSSxPQUFBO1VBQUFqUCxlQUFBLE9BQUFpUCxNQUFBO1VBQUEsT0FBQS9KLFVBQUEsT0FBQStKLE1BQUEsRUFBQWIsU0FBQTtRQUFBO1FBQUFsSSxTQUFBLENBQUErSSxNQUFBLEVBQUFuSSxLQUFBO1FBQUEsT0FBQS9HLFlBQUEsQ0FBQWtQLE1BQUE7VUFBQXZPLEdBQUE7VUFBQUMsS0FBQSxFQUNDLFNBQU8yTixVQUFVQSxDQUFBLEVBQ2pCO1lBQ0MsT0FBT2hLLE1BQU0sQ0FBQ2lLLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRVMsa0JBQWtCLEVBQUVWLFdBQVUsQ0FBQztVQUN6RDtRQUFDO1VBQUE1TixHQUFBO1VBQUFDLEtBQUEsRUFDRCxTQUFPTCxPQUFPQSxDQUFBLEVBQ2Q7WUFDQyxPQUFPQSxRQUFPO1VBQ2Y7UUFBQztNQUFBLEVBUm1CLElBQUk7SUFVMUI7RUFBQztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7O0lDdEhJNE8sTUFBTSxHQUFBcFAsT0FBQSxDQUFBb1AsTUFBQSxnQkFBQW5QLFlBQUEsQ0FFWCxTQUFBbVAsT0FBQSxFQUNBO0VBQUFsUCxlQUFBLE9BQUFrUCxNQUFBO0VBQ0MsSUFBSSxDQUFDUCxJQUFJLEdBQUcsTUFBTSxHQUFHM0IsSUFBSSxDQUFDbUMsTUFBTSxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUdGLElBQUlDLE1BQU0sR0FBQXRQLE9BQUEsQ0FBQXNQLE1BQUEsR0FBRyxJQUFJRixNQUFNLENBQUQsQ0FBQzs7Ozs7Ozs7OztBQ1J2QixJQUFBRyxTQUFBLEdBQUEzTixPQUFBO0FBQW1ELFNBQUFrRCxRQUFBVixDQUFBLHNDQUFBVSxPQUFBLHdCQUFBQyxNQUFBLHVCQUFBQSxNQUFBLENBQUF5SyxRQUFBLGFBQUFwTCxDQUFBLGtCQUFBQSxDQUFBLGdCQUFBQSxDQUFBLFdBQUFBLENBQUEseUJBQUFXLE1BQUEsSUFBQVgsQ0FBQSxDQUFBc0IsV0FBQSxLQUFBWCxNQUFBLElBQUFYLENBQUEsS0FBQVcsTUFBQSxDQUFBSixTQUFBLHFCQUFBUCxDQUFBLEtBQUFVLE9BQUEsQ0FBQVYsQ0FBQTtBQUFBLFNBQUFsRSxnQkFBQTBELENBQUEsRUFBQUMsQ0FBQSxVQUFBRCxDQUFBLFlBQUFDLENBQUEsYUFBQUMsU0FBQTtBQUFBLFNBQUFDLGtCQUFBQyxDQUFBLEVBQUFDLENBQUEsYUFBQUMsQ0FBQSxNQUFBQSxDQUFBLEdBQUFELENBQUEsQ0FBQUUsTUFBQSxFQUFBRCxDQUFBLFVBQUFFLENBQUEsR0FBQUgsQ0FBQSxDQUFBQyxDQUFBLEdBQUFFLENBQUEsQ0FBQUMsVUFBQSxHQUFBRCxDQUFBLENBQUFDLFVBQUEsUUFBQUQsQ0FBQSxDQUFBRSxZQUFBLGtCQUFBRixDQUFBLEtBQUFBLENBQUEsQ0FBQUcsUUFBQSxRQUFBQyxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxFQUFBVSxjQUFBLENBQUFOLENBQUEsQ0FBQXhELEdBQUEsR0FBQXdELENBQUE7QUFBQSxTQUFBbkUsYUFBQStELENBQUEsRUFBQUMsQ0FBQSxFQUFBQyxDQUFBLFdBQUFELENBQUEsSUFBQUYsaUJBQUEsQ0FBQUMsQ0FBQSxDQUFBVyxTQUFBLEVBQUFWLENBQUEsR0FBQUMsQ0FBQSxJQUFBSCxpQkFBQSxDQUFBQyxDQUFBLEVBQUFFLENBQUEsR0FBQU0sTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsaUJBQUFPLFFBQUEsU0FBQVAsQ0FBQTtBQUFBLFNBQUF5TCxnQkFBQXpMLENBQUEsRUFBQUMsQ0FBQSxFQUFBQyxDQUFBLFlBQUFELENBQUEsR0FBQVMsY0FBQSxDQUFBVCxDQUFBLE1BQUFELENBQUEsR0FBQVEsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQUMsQ0FBQSxJQUFBcEQsS0FBQSxFQUFBcUQsQ0FBQSxFQUFBRyxVQUFBLE1BQUFDLFlBQUEsTUFBQUMsUUFBQSxVQUFBUCxDQUFBLENBQUFDLENBQUEsSUFBQUMsQ0FBQSxFQUFBRixDQUFBO0FBQUEsU0FBQVUsZUFBQVIsQ0FBQSxRQUFBVSxDQUFBLEdBQUFDLFlBQUEsQ0FBQVgsQ0FBQSxnQ0FBQVksT0FBQSxDQUFBRixDQUFBLElBQUFBLENBQUEsR0FBQUEsQ0FBQTtBQUFBLFNBQUFDLGFBQUFYLENBQUEsRUFBQUQsQ0FBQSxvQkFBQWEsT0FBQSxDQUFBWixDQUFBLE1BQUFBLENBQUEsU0FBQUEsQ0FBQSxNQUFBRixDQUFBLEdBQUFFLENBQUEsQ0FBQWEsTUFBQSxDQUFBQyxXQUFBLGtCQUFBaEIsQ0FBQSxRQUFBWSxDQUFBLEdBQUFaLENBQUEsQ0FBQWlCLElBQUEsQ0FBQWYsQ0FBQSxFQUFBRCxDQUFBLGdDQUFBYSxPQUFBLENBQUFGLENBQUEsVUFBQUEsQ0FBQSxZQUFBZCxTQUFBLHlFQUFBRyxDQUFBLEdBQUFpQixNQUFBLEdBQUFDLE1BQUEsRUFBQWpCLENBQUE7QUFBQSxJQUVyQzBGLFVBQVUsR0FBQTVKLE9BQUEsQ0FBQTRKLFVBQUE7RUFLdkIsU0FBQUEsV0FBQVcsSUFBQSxFQUNBO0lBQUEsSUFBQXZELEtBQUE7SUFBQSxJQURhTixRQUFRLEdBQUE2RCxJQUFBLENBQVI3RCxRQUFRO01BQUVGLGNBQWMsR0FBQStELElBQUEsQ0FBZC9ELGNBQWM7SUFBQXRHLGVBQUEsT0FBQTBKLFVBQUE7SUFBQTZGLGVBQUEsbUJBSDFCQyxrQkFBUSxDQUFDQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFBQUYsZUFBQSxlQUN6QkMsa0JBQVEsQ0FBQ0MsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBSW5DakosUUFBUSxDQUFDd0IsSUFBSSxDQUFDQyxNQUFNLENBQUMsVUFBQ0MsQ0FBQyxFQUFDQyxDQUFDLEVBQUNuRSxDQUFDLEVBQUNvRSxDQUFDLEVBQUc7TUFDL0IsSUFBR0YsQ0FBQyxHQUFHLENBQUMsRUFDUjtRQUNDcEIsS0FBSSxDQUFDNEksUUFBUSxDQUFDdkgsQ0FBQyxFQUFDRCxDQUFDLEVBQUNsRSxDQUFDLENBQUNtRSxDQUFDLENBQUMsQ0FBQztRQUN2QjtNQUNEO01BRUEsSUFBR0QsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUNYO1FBQ0NwQixLQUFJLENBQUM2SSxVQUFVLENBQUN4SCxDQUFDLEVBQUNELENBQUMsRUFBQ2xFLENBQUMsQ0FBQ21FLENBQUMsQ0FBQyxDQUFDO1FBQ3pCO01BQ0Q7SUFFRCxDQUFDLENBQUM7SUFFRjdCLGNBQWMsQ0FBQ08sSUFBSSxDQUFDb0IsTUFBTSxDQUFDLEdBQUcsRUFBRSxVQUFDQyxDQUFDLEVBQUs7TUFDdENwQixLQUFJLENBQUM4SSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcxSCxDQUFDLEdBQUcsRUFBRTtJQUN0QixDQUFDLENBQUM7SUFFRjVCLGNBQWMsQ0FBQ08sSUFBSSxDQUFDb0IsTUFBTSxDQUFDLEdBQUcsRUFBRSxVQUFDQyxDQUFDLEVBQUs7TUFDdENwQixLQUFJLENBQUM4SSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcxSCxDQUFDLEdBQUcsRUFBRTtJQUN0QixDQUFDLENBQUM7RUFDSDtFQUFDLE9BQUFuSSxZQUFBLENBQUEySixVQUFBO0lBQUFoSixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBK08sUUFBUUEsQ0FBQ2hQLEdBQUcsRUFBRUMsS0FBSyxFQUFFa1AsSUFBSSxFQUN6QjtNQUNDLElBQUcsU0FBUyxDQUFDaEIsSUFBSSxDQUFDbk8sR0FBRyxDQUFDLEVBQ3RCO1FBQ0MsSUFBSSxDQUFDb1AsUUFBUSxDQUFDcFAsR0FBRyxDQUFDLEdBQUcsSUFBSTtRQUN6QjtNQUNEO01BRUEsUUFBT0EsR0FBRztRQUVULEtBQUssWUFBWTtVQUNoQixJQUFJLENBQUNrUCxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztVQUNoQjtRQUVELEtBQUssV0FBVztVQUNmLElBQUksQ0FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7VUFDaEI7UUFFRCxLQUFLLFdBQVc7VUFDZixJQUFJLENBQUNBLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7VUFDakI7UUFFRCxLQUFLLFNBQVM7VUFDYixJQUFJLENBQUNBLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7VUFDakI7TUFDRjtJQUNEO0VBQUM7SUFBQWxQLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFnUCxVQUFVQSxDQUFDalAsR0FBRyxFQUFFQyxLQUFLLEVBQUVrUCxJQUFJLEVBQzNCO01BQ0MsSUFBRyxTQUFTLENBQUNoQixJQUFJLENBQUNuTyxHQUFHLENBQUMsRUFDdEI7UUFDQyxJQUFJLENBQUNvUCxRQUFRLENBQUNwUCxHQUFHLENBQUMsR0FBRyxLQUFLO1FBQzFCO01BQ0Q7TUFFQSxRQUFPQSxHQUFHO1FBRVQsS0FBSyxZQUFZO1VBQ2hCLElBQUcsSUFBSSxDQUFDa1AsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDbkI7WUFDQyxJQUFJLENBQUNBLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1VBQ2pCO1VBQ0EsSUFBSSxDQUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUVqQixLQUFLLFdBQVc7VUFDZixJQUFHLElBQUksQ0FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDbkI7WUFDQyxJQUFJLENBQUNBLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1VBQ2pCO1VBQ0E7UUFFRCxLQUFLLFdBQVc7VUFDZixJQUFHLElBQUksQ0FBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDbkI7WUFDQyxJQUFJLENBQUNBLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1VBQ2pCO1FBRUQsS0FBSyxTQUFTO1VBQ2IsSUFBRyxJQUFJLENBQUNBLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQ25CO1lBQ0MsSUFBSSxDQUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztVQUNqQjtVQUNBO01BQ0Y7SUFDRDtFQUFDO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUNsR0YsSUFBTUcsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUIsSUFBTUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7QUFBQyxJQUVqQjdHLE1BQU0sR0FBQXJKLE9BQUEsQ0FBQXFKLE1BQUE7RUFFbEIsU0FBQUEsT0FBQWtCLElBQUEsRUFDQTtJQUFBLElBRGFqQixNQUFNLEdBQUFpQixJQUFBLENBQU5qQixNQUFNO01BQUU3QixVQUFVLEdBQUE4QyxJQUFBLENBQVY5QyxVQUFVO0lBQUF2SCxlQUFBLE9BQUFtSixNQUFBO0lBRTlCLElBQUksQ0FBQzhHLFNBQVMsR0FBRyxPQUFPO0lBQ3hCLElBQUksQ0FBQ0MsS0FBSyxHQUFHLFVBQVU7SUFFdkIsSUFBSSxDQUFDOUcsTUFBTSxHQUFHQSxNQUFNO0lBQ3BCLElBQUksQ0FBQzdCLFVBQVUsR0FBR0EsVUFBVTtFQUM3QjtFQUFDLE9BQUF4SCxZQUFBLENBQUFvSixNQUFBO0lBQUF6SSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBd0YsTUFBTUEsQ0FBQSxFQUNOLENBQ0E7RUFBQztJQUFBekYsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQTRLLFFBQVFBLENBQUEsRUFDUjtNQUNDLElBQUd5QixJQUFJLENBQUNDLEtBQUssQ0FBQ1QsV0FBVyxDQUFDaEIsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUNsRDtRQUNDLElBQUksQ0FBQ3BDLE1BQU0sQ0FBQytHLE1BQU0sR0FBR0osVUFBVTtNQUNoQztNQUVBLElBQUcvQyxJQUFJLENBQUNDLEtBQUssQ0FBQ1QsV0FBVyxDQUFDaEIsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUNsRDtRQUNDLElBQUksQ0FBQ3BDLE1BQU0sQ0FBQytHLE1BQU0sR0FBR0gsV0FBVztNQUNqQztNQUVBLElBQUdoRCxJQUFJLENBQUNDLEtBQUssQ0FBQ1QsV0FBVyxDQUFDaEIsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUNuRDtRQUNDLElBQUksQ0FBQ3BDLE1BQU0sQ0FBQytHLE1BQU0sR0FBRyxJQUFJO01BQzFCO01BRUEsSUFBSTlJLEtBQUssR0FBRyxDQUFDO01BRWIsSUFBSStJLEtBQUssR0FBRyxJQUFJLENBQUM3SSxVQUFVLENBQUNxSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztNQUN4QyxJQUFJUyxLQUFLLEdBQUcsSUFBSSxDQUFDOUksVUFBVSxDQUFDcUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7TUFFeEMsS0FBSSxJQUFJNUwsQ0FBQyxJQUFJLElBQUksQ0FBQ3VELFVBQVUsQ0FBQ3VJLFFBQVEsRUFDckM7UUFDQyxJQUFHLENBQUMsSUFBSSxDQUFDdkksVUFBVSxDQUFDdUksUUFBUSxDQUFDOUwsQ0FBQyxDQUFDLEVBQy9CO1VBQ0M7UUFDRDtRQUVBaEMsT0FBTyxDQUFDc08sR0FBRyxDQUFDdE0sQ0FBQyxDQUFDO01BQ2Y7TUFFQW9NLEtBQUssR0FBR3BELElBQUksQ0FBQ1EsR0FBRyxDQUFDLENBQUMsRUFBRVIsSUFBSSxDQUFDTyxHQUFHLENBQUM2QyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUN4Q0MsS0FBSyxHQUFHckQsSUFBSSxDQUFDUSxHQUFHLENBQUMsQ0FBQyxFQUFFUixJQUFJLENBQUNPLEdBQUcsQ0FBQzhDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO01BRXhDLElBQUksQ0FBQ2pILE1BQU0sQ0FBQytDLENBQUMsSUFBSWlFLEtBQUssR0FBRyxDQUFDLEdBQ3ZCcEQsSUFBSSxDQUFDdUQsSUFBSSxDQUFDbEosS0FBSyxHQUFHK0ksS0FBSyxDQUFDLEdBQ3hCcEQsSUFBSSxDQUFDd0QsS0FBSyxDQUFDbkosS0FBSyxHQUFHK0ksS0FBSyxDQUFDO01BRTVCLElBQUksQ0FBQ2hILE1BQU0sQ0FBQ2dELENBQUMsSUFBSWlFLEtBQUssR0FBRyxDQUFDLEdBQ3ZCckQsSUFBSSxDQUFDdUQsSUFBSSxDQUFDbEosS0FBSyxHQUFHZ0osS0FBSyxDQUFDLEdBQ3hCckQsSUFBSSxDQUFDd0QsS0FBSyxDQUFDbkosS0FBSyxHQUFHZ0osS0FBSyxDQUFDO01BRTVCLElBQUlJLFVBQVUsR0FBRyxLQUFLO01BRXRCLElBQUd6RCxJQUFJLENBQUMwRCxHQUFHLENBQUNOLEtBQUssQ0FBQyxHQUFHcEQsSUFBSSxDQUFDMEQsR0FBRyxDQUFDTCxLQUFLLENBQUMsRUFDcEM7UUFDQ0ksVUFBVSxHQUFHLElBQUk7TUFDbEI7TUFFQSxJQUFHQSxVQUFVLEVBQ2I7UUFDQyxJQUFJLENBQUNSLFNBQVMsR0FBRyxNQUFNO1FBRXZCLElBQUdHLEtBQUssR0FBRyxDQUFDLEVBQ1o7VUFDQyxJQUFJLENBQUNILFNBQVMsR0FBRyxNQUFNO1FBQ3hCO1FBRUEsSUFBSSxDQUFDQyxLQUFLLEdBQUcsU0FBUztNQUV2QixDQUFDLE1BQ0ksSUFBR0csS0FBSyxFQUNiO1FBQ0MsSUFBSSxDQUFDSixTQUFTLEdBQUcsT0FBTztRQUV4QixJQUFHSSxLQUFLLEdBQUcsQ0FBQyxFQUNaO1VBQ0MsSUFBSSxDQUFDSixTQUFTLEdBQUcsT0FBTztRQUN6QjtRQUVBLElBQUksQ0FBQ0MsS0FBSyxHQUFHLFNBQVM7TUFDdkIsQ0FBQyxNQUVEO1FBQ0MsSUFBSSxDQUFDQSxLQUFLLEdBQUcsVUFBVTtNQUN4Qjs7TUFFQTtNQUNBO01BQ0E7TUFDQTs7TUFFQSxJQUFJUyxNQUFNO01BRVYsSUFBR0EsTUFBTSxHQUFHLElBQUksQ0FBQ3ZILE1BQU0sQ0FBQyxJQUFJLENBQUM4RyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUNELFNBQVMsQ0FBQyxFQUNuRDtRQUNDLElBQUksQ0FBQzdHLE1BQU0sQ0FBQ3dILFNBQVMsQ0FBQ0QsTUFBTSxDQUFDO01BQzlCO0lBQ0Q7RUFBQztJQUFBalEsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWtRLE9BQU9BLENBQUEsRUFDUCxDQUNBO0VBQUM7QUFBQTs7O0NDL0dGO0FBQUE7QUFBQTtBQUFBO0NDQUE7QUFBQTtBQUFBO0FBQUE7Ozs7Ozs7O0FDQUEsSUFBQUMsUUFBQSxHQUFBcFAsT0FBQTtBQUNBLElBQUE2QixPQUFBLEdBQUE3QixPQUFBO0FBQ0EsSUFBQXdCLFlBQUEsR0FBQXhCLE9BQUE7QUFBNEMsU0FBQWtELFFBQUFWLENBQUEsc0NBQUFVLE9BQUEsd0JBQUFDLE1BQUEsdUJBQUFBLE1BQUEsQ0FBQXlLLFFBQUEsYUFBQXBMLENBQUEsa0JBQUFBLENBQUEsZ0JBQUFBLENBQUEsV0FBQUEsQ0FBQSx5QkFBQVcsTUFBQSxJQUFBWCxDQUFBLENBQUFzQixXQUFBLEtBQUFYLE1BQUEsSUFBQVgsQ0FBQSxLQUFBVyxNQUFBLENBQUFKLFNBQUEscUJBQUFQLENBQUEsS0FBQVUsT0FBQSxDQUFBVixDQUFBO0FBQUEsU0FBQWxFLGdCQUFBMEQsQ0FBQSxFQUFBQyxDQUFBLFVBQUFELENBQUEsWUFBQUMsQ0FBQSxhQUFBQyxTQUFBO0FBQUEsU0FBQUMsa0JBQUFDLENBQUEsRUFBQUMsQ0FBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUQsQ0FBQSxDQUFBRSxNQUFBLEVBQUFELENBQUEsVUFBQUUsQ0FBQSxHQUFBSCxDQUFBLENBQUFDLENBQUEsR0FBQUUsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsQ0FBQUMsVUFBQSxRQUFBRCxDQUFBLENBQUFFLFlBQUEsa0JBQUFGLENBQUEsS0FBQUEsQ0FBQSxDQUFBRyxRQUFBLFFBQUFDLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLEVBQUFVLGNBQUEsQ0FBQU4sQ0FBQSxDQUFBeEQsR0FBQSxHQUFBd0QsQ0FBQTtBQUFBLFNBQUFuRSxhQUFBK0QsQ0FBQSxFQUFBQyxDQUFBLEVBQUFDLENBQUEsV0FBQUQsQ0FBQSxJQUFBRixpQkFBQSxDQUFBQyxDQUFBLENBQUFXLFNBQUEsRUFBQVYsQ0FBQSxHQUFBQyxDQUFBLElBQUFILGlCQUFBLENBQUFDLENBQUEsRUFBQUUsQ0FBQSxHQUFBTSxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxpQkFBQU8sUUFBQSxTQUFBUCxDQUFBO0FBQUEsU0FBQVUsZUFBQVIsQ0FBQSxRQUFBVSxDQUFBLEdBQUFDLFlBQUEsQ0FBQVgsQ0FBQSxnQ0FBQVksT0FBQSxDQUFBRixDQUFBLElBQUFBLENBQUEsR0FBQUEsQ0FBQTtBQUFBLFNBQUFDLGFBQUFYLENBQUEsRUFBQUQsQ0FBQSxvQkFBQWEsT0FBQSxDQUFBWixDQUFBLE1BQUFBLENBQUEsU0FBQUEsQ0FBQSxNQUFBRixDQUFBLEdBQUFFLENBQUEsQ0FBQWEsTUFBQSxDQUFBQyxXQUFBLGtCQUFBaEIsQ0FBQSxRQUFBWSxDQUFBLEdBQUFaLENBQUEsQ0FBQWlCLElBQUEsQ0FBQWYsQ0FBQSxFQUFBRCxDQUFBLGdDQUFBYSxPQUFBLENBQUFGLENBQUEsVUFBQUEsQ0FBQSxZQUFBZCxTQUFBLHlFQUFBRyxDQUFBLEdBQUFpQixNQUFBLEdBQUFDLE1BQUEsRUFBQWpCLENBQUE7QUFBQSxJQUU5QitNLFVBQVUsR0FBQWpSLE9BQUEsQ0FBQWlSLFVBQUE7RUFFdkIsU0FBQUEsV0FBWXpJLFdBQVcsRUFBRUQsR0FBRyxFQUM1QjtJQUFBLElBRDhCMkksS0FBSyxHQUFBNUMsU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLENBQUM7SUFBQXBPLGVBQUEsT0FBQStRLFVBQUE7SUFFdEMsSUFBSSxDQUFDekksV0FBVyxHQUFHQSxXQUFXO0lBQzlCLElBQUksQ0FBQ0UsV0FBVyxHQUFHLElBQUlDLHdCQUFXLENBQUQsQ0FBQztJQUVsQyxJQUFJLENBQUN3SSxLQUFLLEdBQVMsRUFBRTtJQUNyQixJQUFJLENBQUNDLE9BQU8sR0FBTyxDQUFDLENBQUM7SUFDckIsSUFBSSxDQUFDQyxRQUFRLEdBQU0sQ0FBQztJQUVwQixJQUFJLENBQUM5SSxHQUFHLEdBQVdBLEdBQUc7SUFDdEIsSUFBSSxDQUFDMkksS0FBSyxHQUFTQSxLQUFLO0lBRXhCLElBQUksQ0FBQ0ksU0FBUyxHQUFLLEVBQUU7SUFDckIsSUFBSSxDQUFDQyxVQUFVLEdBQUksRUFBRTtJQUVyQixJQUFJLENBQUNDLFlBQVksR0FBRyxDQUFDO0lBQ3JCLElBQUksQ0FBQ0MsYUFBYSxHQUFHLENBQUM7RUFDdkI7RUFBQyxPQUFBeFIsWUFBQSxDQUFBZ1IsVUFBQTtJQUFBclEsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQTZRLFVBQVVBLENBQUNyRixDQUFDLEVBQUVDLENBQUMsRUFBRXFGLFdBQVcsRUFDNUI7TUFDQyxJQUFJQyxJQUFJO01BQ1IsSUFBSUMsS0FBSyxHQUFHeEYsQ0FBQyxHQUFHLElBQUksQ0FBQ2lGLFNBQVMsR0FBRyxJQUFJLENBQUNFLFlBQVksR0FBRyxJQUFJLENBQUNoSixXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTO01BQ3BGLElBQUltUixLQUFLLEdBQUd4RixDQUFDLEdBQUcsSUFBSSxDQUFDaUYsVUFBVSxHQUFHLElBQUksQ0FBQ0UsYUFBYSxHQUFHLElBQUksQ0FBQ2pKLFdBQVcsQ0FBQytELElBQUksQ0FBQzVMLFNBQVM7TUFFdEYsSUFBRyxJQUFJLENBQUN5USxPQUFPLENBQUNTLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQ1QsT0FBTyxDQUFDUyxLQUFLLENBQUMsQ0FBQ0MsS0FBSyxDQUFDLEVBQ3BEO1FBQ0NGLElBQUksR0FBRyxJQUFJLENBQUNSLE9BQU8sQ0FBQ1MsS0FBSyxDQUFDLENBQUNDLEtBQUssQ0FBQztNQUNsQyxDQUFDLE1BRUQ7UUFDQ0YsSUFBSSxHQUFHLElBQUlHLGdCQUFPLENBQ2pCLElBQUksQ0FBQ3ZKLFdBQVcsRUFDZCxJQUFJLENBQUNFLFdBQVcsRUFDaEIsSUFBSSxDQUFDSCxHQUFHLEVBQ1IsSUFBSSxDQUFDaUosWUFBWSxFQUNqQixJQUFJLENBQUNDLGFBQWEsRUFDbEJJLEtBQUssRUFDTEMsS0FBSyxFQUNMLElBQUksQ0FBQ1osS0FDUixDQUFDO1FBRUQsSUFBRyxDQUFDLElBQUksQ0FBQ0UsT0FBTyxDQUFDUyxLQUFLLENBQUMsRUFDdkI7VUFDQyxJQUFJLENBQUNULE9BQU8sQ0FBQ1MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCO1FBRUEsSUFBRyxDQUFDLElBQUksQ0FBQ1QsT0FBTyxDQUFDUyxLQUFLLENBQUMsQ0FBQ0MsS0FBSyxDQUFDLEVBQzlCO1VBQ0MsSUFBSSxDQUFDVixPQUFPLENBQUNTLEtBQUssQ0FBQyxDQUFDQyxLQUFLLENBQUMsR0FBR0YsSUFBSTtRQUNsQztNQUNEO01BRUEsSUFBSSxDQUFDVCxLQUFLLENBQUNuRixJQUFJLENBQUM0RixJQUFJLENBQUM7TUFFckIsSUFBRyxJQUFJLENBQUNULEtBQUssQ0FBQ2hOLE1BQU0sR0FBRyxJQUFJLENBQUNrTixRQUFRLEVBQ3BDO1FBQ0MsSUFBSSxDQUFDRixLQUFLLENBQUNsRixLQUFLLENBQUMsQ0FBQztNQUNuQjtJQUNEO0VBQUM7SUFBQXJMLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFzTCxJQUFJQSxDQUFBLEVBQ0o7TUFDQyxJQUFJLENBQUNnRixLQUFLLENBQUNoTixNQUFNLEdBQUcsQ0FBQztNQUVyQixJQUFNNk4sT0FBTyxHQUFHOUUsSUFBSSxDQUFDd0QsS0FBSyxDQUN4QjVHLGNBQU0sQ0FBQ3VDLENBQUMsSUFBSSxJQUFJLENBQUNtRixZQUFZLEdBQUcsSUFBSSxDQUFDRixTQUFTLEdBQUcsSUFBSSxDQUFDOUksV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxDQUFDLEdBQUksQ0FDdkYsQ0FBQztNQUVELElBQU1zUixPQUFPLEdBQUcvRSxJQUFJLENBQUN3RCxLQUFLLENBQ3pCNUcsY0FBTSxDQUFDd0MsQ0FBQyxJQUFJLElBQUksQ0FBQ21GLGFBQWEsR0FBRyxJQUFJLENBQUNGLFVBQVUsR0FBRyxJQUFJLENBQUMvSSxXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLENBQUMsR0FBRyxDQUN2RixDQUFDO01BRUQsSUFBSXVSLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7TUFFdEIsS0FBSSxJQUFJN0YsQ0FBQyxJQUFJNkYsS0FBSyxFQUNsQjtRQUNDLEtBQUksSUFBSTVGLENBQUMsSUFBSTRGLEtBQUssRUFDbEI7VUFDQyxJQUFJLENBQUNSLFVBQVUsQ0FBQ00sT0FBTyxHQUFHRSxLQUFLLENBQUM3RixDQUFDLENBQUMsRUFBRTRGLE9BQU8sR0FBR0MsS0FBSyxDQUFDNUYsQ0FBQyxDQUFDLENBQUM7UUFDeEQ7TUFDRDtNQUVBLElBQUksQ0FBQzZFLEtBQUssQ0FBQ2dCLE9BQU8sQ0FBQyxVQUFBcEgsQ0FBQztRQUFBLE9BQUlBLENBQUMsQ0FBQ29CLElBQUksQ0FBQyxDQUFDO01BQUEsRUFBQztJQUNsQztFQUFDO0lBQUF2TCxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBaUssTUFBTUEsQ0FBQ3VCLENBQUMsRUFBRUMsQ0FBQyxFQUNYO01BQ0MsS0FBSSxJQUFJMUgsQ0FBQyxJQUFJLElBQUksQ0FBQ3dNLE9BQU8sRUFDekI7UUFDQyxLQUFJLElBQUk1RyxDQUFDLElBQUksSUFBSSxDQUFDNEcsT0FBTyxDQUFDeE0sQ0FBQyxDQUFDLEVBQzVCO1VBQ0MsT0FBTyxJQUFJLENBQUN3TSxPQUFPLENBQUN4TSxDQUFDLENBQUMsQ0FBQzRGLENBQUMsQ0FBQztRQUMxQjtNQUNEO01BRUEsT0FBTSxJQUFJLENBQUMyRyxLQUFLLENBQUNoTixNQUFNLEVBQ3ZCO1FBQ0MsSUFBSSxDQUFDZ04sS0FBSyxDQUFDaUIsR0FBRyxDQUFDLENBQUM7TUFDakI7TUFFQSxJQUFJLENBQUNaLFlBQVksR0FBR3RFLElBQUksQ0FBQ3VELElBQUksQ0FBRXBFLENBQUMsR0FBRyxJQUFJLENBQUNpRixTQUFVLENBQUM7TUFDbkQsSUFBSSxDQUFDRyxhQUFhLEdBQUd2RSxJQUFJLENBQUN1RCxJQUFJLENBQUVuRSxDQUFDLEdBQUcsSUFBSSxDQUFDaUYsVUFBVyxDQUFDO01BRXJELElBQUksQ0FBQ3BGLElBQUksQ0FBQyxDQUFDO0lBQ1o7RUFBQztJQUFBdkwsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQTRLLFFBQVFBLENBQUEsRUFDUixDQUVBO0VBQUM7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7SUNwSFczQixNQUFNLEdBQUE5SixPQUFBLENBQUE4SixNQUFBLGdCQUFBN0osWUFBQSxVQUFBNkosT0FBQTtFQUFBNUosZUFBQSxPQUFBNEosTUFBQTtBQUFBO0FBQUEyRixlQUFBLENBQU4zRixNQUFNLE9BRVAsQ0FBQztBQUFBMkYsZUFBQSxDQUZBM0YsTUFBTSxPQUdQLENBQUM7QUFBQTJGLGVBQUEsQ0FIQTNGLE1BQU0sV0FJRixDQUFDO0FBQUEyRixlQUFBLENBSkwzRixNQUFNLFlBS0YsQ0FBQzs7Ozs7Ozs7OztBQ0xsQixJQUFBeUYsU0FBQSxHQUFBM04sT0FBQTtBQUNBLElBQUE2QixPQUFBLEdBQUE3QixPQUFBO0FBQWtDLFNBQUFrRCxRQUFBVixDQUFBLHNDQUFBVSxPQUFBLHdCQUFBQyxNQUFBLHVCQUFBQSxNQUFBLENBQUF5SyxRQUFBLGFBQUFwTCxDQUFBLGtCQUFBQSxDQUFBLGdCQUFBQSxDQUFBLFdBQUFBLENBQUEseUJBQUFXLE1BQUEsSUFBQVgsQ0FBQSxDQUFBc0IsV0FBQSxLQUFBWCxNQUFBLElBQUFYLENBQUEsS0FBQVcsTUFBQSxDQUFBSixTQUFBLHFCQUFBUCxDQUFBLEtBQUFVLE9BQUEsQ0FBQVYsQ0FBQTtBQUFBLFNBQUFpTywyQkFBQXBPLENBQUEsRUFBQUQsQ0FBQSxRQUFBRSxDQUFBLHlCQUFBYSxNQUFBLElBQUFkLENBQUEsQ0FBQWMsTUFBQSxDQUFBeUssUUFBQSxLQUFBdkwsQ0FBQSxxQkFBQUMsQ0FBQSxRQUFBb08sS0FBQSxDQUFBQyxPQUFBLENBQUF0TyxDQUFBLE1BQUFDLENBQUEsR0FBQXNPLDJCQUFBLENBQUF2TyxDQUFBLE1BQUFELENBQUEsSUFBQUMsQ0FBQSx1QkFBQUEsQ0FBQSxDQUFBRSxNQUFBLElBQUFELENBQUEsS0FBQUQsQ0FBQSxHQUFBQyxDQUFBLE9BQUF1TyxFQUFBLE1BQUFDLENBQUEsWUFBQUEsRUFBQSxlQUFBQyxDQUFBLEVBQUFELENBQUEsRUFBQTdPLENBQUEsV0FBQUEsRUFBQSxXQUFBNE8sRUFBQSxJQUFBeE8sQ0FBQSxDQUFBRSxNQUFBLEtBQUF5TyxJQUFBLFdBQUFBLElBQUEsTUFBQS9SLEtBQUEsRUFBQW9ELENBQUEsQ0FBQXdPLEVBQUEsVUFBQXpPLENBQUEsV0FBQUEsRUFBQUMsQ0FBQSxVQUFBQSxDQUFBLEtBQUE0TyxDQUFBLEVBQUFILENBQUEsZ0JBQUE1TyxTQUFBLGlKQUFBTSxDQUFBLEVBQUFSLENBQUEsT0FBQWtQLENBQUEsZ0JBQUFILENBQUEsV0FBQUEsRUFBQSxJQUFBek8sQ0FBQSxHQUFBQSxDQUFBLENBQUFlLElBQUEsQ0FBQWhCLENBQUEsTUFBQUosQ0FBQSxXQUFBQSxFQUFBLFFBQUFJLENBQUEsR0FBQUMsQ0FBQSxDQUFBNk8sSUFBQSxXQUFBblAsQ0FBQSxHQUFBSyxDQUFBLENBQUEyTyxJQUFBLEVBQUEzTyxDQUFBLEtBQUFELENBQUEsV0FBQUEsRUFBQUMsQ0FBQSxJQUFBNk8sQ0FBQSxPQUFBMU8sQ0FBQSxHQUFBSCxDQUFBLEtBQUE0TyxDQUFBLFdBQUFBLEVBQUEsVUFBQWpQLENBQUEsWUFBQU0sQ0FBQSxjQUFBQSxDQUFBLDhCQUFBNE8sQ0FBQSxRQUFBMU8sQ0FBQTtBQUFBLFNBQUE0TyxtQkFBQS9PLENBQUEsV0FBQWdQLGtCQUFBLENBQUFoUCxDQUFBLEtBQUFpUCxnQkFBQSxDQUFBalAsQ0FBQSxLQUFBdU8sMkJBQUEsQ0FBQXZPLENBQUEsS0FBQWtQLGtCQUFBO0FBQUEsU0FBQUEsbUJBQUEsY0FBQXJQLFNBQUE7QUFBQSxTQUFBME8sNEJBQUF2TyxDQUFBLEVBQUFMLENBQUEsUUFBQUssQ0FBQSwyQkFBQUEsQ0FBQSxTQUFBbVAsaUJBQUEsQ0FBQW5QLENBQUEsRUFBQUwsQ0FBQSxPQUFBTSxDQUFBLE1BQUFtUCxRQUFBLENBQUFwTyxJQUFBLENBQUFoQixDQUFBLEVBQUFxUCxLQUFBLDZCQUFBcFAsQ0FBQSxJQUFBRCxDQUFBLENBQUF5QixXQUFBLEtBQUF4QixDQUFBLEdBQUFELENBQUEsQ0FBQXlCLFdBQUEsQ0FBQW1KLElBQUEsYUFBQTNLLENBQUEsY0FBQUEsQ0FBQSxHQUFBb08sS0FBQSxDQUFBaUIsSUFBQSxDQUFBdFAsQ0FBQSxvQkFBQUMsQ0FBQSwrQ0FBQTZLLElBQUEsQ0FBQTdLLENBQUEsSUFBQWtQLGlCQUFBLENBQUFuUCxDQUFBLEVBQUFMLENBQUE7QUFBQSxTQUFBc1AsaUJBQUFqUCxDQUFBLDhCQUFBYyxNQUFBLFlBQUFkLENBQUEsQ0FBQWMsTUFBQSxDQUFBeUssUUFBQSxhQUFBdkwsQ0FBQSx1QkFBQXFPLEtBQUEsQ0FBQWlCLElBQUEsQ0FBQXRQLENBQUE7QUFBQSxTQUFBZ1AsbUJBQUFoUCxDQUFBLFFBQUFxTyxLQUFBLENBQUFDLE9BQUEsQ0FBQXRPLENBQUEsVUFBQW1QLGlCQUFBLENBQUFuUCxDQUFBO0FBQUEsU0FBQW1QLGtCQUFBblAsQ0FBQSxFQUFBTCxDQUFBLGFBQUFBLENBQUEsSUFBQUEsQ0FBQSxHQUFBSyxDQUFBLENBQUFFLE1BQUEsTUFBQVAsQ0FBQSxHQUFBSyxDQUFBLENBQUFFLE1BQUEsWUFBQUgsQ0FBQSxNQUFBSCxDQUFBLEdBQUF5TyxLQUFBLENBQUExTyxDQUFBLEdBQUFJLENBQUEsR0FBQUosQ0FBQSxFQUFBSSxDQUFBLElBQUFILENBQUEsQ0FBQUcsQ0FBQSxJQUFBQyxDQUFBLENBQUFELENBQUEsVUFBQUgsQ0FBQTtBQUFBLFNBQUEzRCxnQkFBQTBELENBQUEsRUFBQUMsQ0FBQSxVQUFBRCxDQUFBLFlBQUFDLENBQUEsYUFBQUMsU0FBQTtBQUFBLFNBQUFDLGtCQUFBQyxDQUFBLEVBQUFDLENBQUEsYUFBQUMsQ0FBQSxNQUFBQSxDQUFBLEdBQUFELENBQUEsQ0FBQUUsTUFBQSxFQUFBRCxDQUFBLFVBQUFFLENBQUEsR0FBQUgsQ0FBQSxDQUFBQyxDQUFBLEdBQUFFLENBQUEsQ0FBQUMsVUFBQSxHQUFBRCxDQUFBLENBQUFDLFVBQUEsUUFBQUQsQ0FBQSxDQUFBRSxZQUFBLGtCQUFBRixDQUFBLEtBQUFBLENBQUEsQ0FBQUcsUUFBQSxRQUFBQyxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxFQUFBVSxjQUFBLENBQUFOLENBQUEsQ0FBQXhELEdBQUEsR0FBQXdELENBQUE7QUFBQSxTQUFBbkUsYUFBQStELENBQUEsRUFBQUMsQ0FBQSxFQUFBQyxDQUFBLFdBQUFELENBQUEsSUFBQUYsaUJBQUEsQ0FBQUMsQ0FBQSxDQUFBVyxTQUFBLEVBQUFWLENBQUEsR0FBQUMsQ0FBQSxJQUFBSCxpQkFBQSxDQUFBQyxDQUFBLEVBQUFFLENBQUEsR0FBQU0sTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsaUJBQUFPLFFBQUEsU0FBQVAsQ0FBQTtBQUFBLFNBQUFVLGVBQUFSLENBQUEsUUFBQVUsQ0FBQSxHQUFBQyxZQUFBLENBQUFYLENBQUEsZ0NBQUFZLE9BQUEsQ0FBQUYsQ0FBQSxJQUFBQSxDQUFBLEdBQUFBLENBQUE7QUFBQSxTQUFBQyxhQUFBWCxDQUFBLEVBQUFELENBQUEsb0JBQUFhLE9BQUEsQ0FBQVosQ0FBQSxNQUFBQSxDQUFBLFNBQUFBLENBQUEsTUFBQUYsQ0FBQSxHQUFBRSxDQUFBLENBQUFhLE1BQUEsQ0FBQUMsV0FBQSxrQkFBQWhCLENBQUEsUUFBQVksQ0FBQSxHQUFBWixDQUFBLENBQUFpQixJQUFBLENBQUFmLENBQUEsRUFBQUQsQ0FBQSxnQ0FBQWEsT0FBQSxDQUFBRixDQUFBLFVBQUFBLENBQUEsWUFBQWQsU0FBQSx5RUFBQUcsQ0FBQSxHQUFBaUIsTUFBQSxHQUFBQyxNQUFBLEVBQUFqQixDQUFBO0FBQUEsSUFFckJxRixNQUFNLEdBQUF2SixPQUFBLENBQUF1SixNQUFBO0VBRWxCLFNBQUFBLE9BQUFnQixJQUFBLEVBQ0E7SUFBQSxJQUFBdkQsS0FBQTtJQUFBLElBRGF3QyxHQUFHLEdBQUFlLElBQUEsQ0FBSGYsR0FBRztNQUFFaEIsV0FBVyxHQUFBK0IsSUFBQSxDQUFYL0IsV0FBVztNQUFFRSxXQUFXLEdBQUE2QixJQUFBLENBQVg3QixXQUFXO01BQUVnQixLQUFLLEdBQUFhLElBQUEsQ0FBTGIsS0FBSztNQUFFQyxNQUFNLEdBQUFZLElBQUEsQ0FBTlosTUFBTTtJQUFBekosZUFBQSxPQUFBcUosTUFBQTtJQUV4RCxJQUFJLENBQUNtRyxrQkFBUSxDQUFDOEQsT0FBTyxDQUFDLEdBQUcsSUFBSTtJQUU3QixJQUFJLENBQUNDLENBQUMsR0FBRyxDQUFDO0lBQ1YsSUFBSSxDQUFDcEgsQ0FBQyxHQUFHLENBQUM7SUFDVixJQUFJLENBQUNDLENBQUMsR0FBRyxDQUFDO0lBRVYsSUFBSSxDQUFDNUMsS0FBSyxHQUFJLEVBQUUsSUFBSUEsS0FBSztJQUN6QixJQUFJLENBQUNDLE1BQU0sR0FBRyxFQUFFLElBQUlBLE1BQU07SUFDMUIsSUFBSSxDQUFDK0osS0FBSyxHQUFJLENBQUM7SUFFZixJQUFJLENBQUM3QyxNQUFNLEdBQUcsRUFBRTtJQUNoQixJQUFJLENBQUM4QyxVQUFVLEdBQUcsQ0FBQztJQUNuQixJQUFJLENBQUNDLFlBQVksR0FBRyxJQUFJLENBQUNELFVBQVU7SUFDbkMsSUFBSSxDQUFDRSxZQUFZLEdBQUcsQ0FBQztJQUNyQixJQUFJLENBQUNDLGFBQWEsR0FBRyxFQUFFO0lBRXZCLElBQUksQ0FBQ3ZNLEtBQUssR0FBTSxDQUFDO0lBQ2pCLElBQUksQ0FBQ0MsUUFBUSxHQUFHLENBQUM7SUFFakIsSUFBSSxDQUFDdU0sTUFBTSxHQUFHLEtBQUs7SUFFbkIsSUFBSSxDQUFDQyxLQUFLLEdBQUcsQ0FBQztJQUNkLElBQUksQ0FBQ0MsSUFBSSxHQUFHLENBQUM7SUFDYixJQUFJLENBQUNDLElBQUksR0FBRyxDQUFDO0lBQ2IsSUFBSSxDQUFDQyxFQUFFLEdBQUksQ0FBQztJQUVaLElBQUksQ0FBQ0MsSUFBSSxHQUFHLElBQUksQ0FBQ0osS0FBSztJQUN0QixJQUFJLENBQUNLLEtBQUssR0FBRyxJQUFJLENBQUNKLElBQUk7SUFDdEIsSUFBSSxDQUFDSyxJQUFJLEdBQUcsSUFBSSxDQUFDSixJQUFJO0lBQ3JCLElBQUksQ0FBQ0ssS0FBSyxHQUFHLElBQUksQ0FBQ0osRUFBRTtJQUVwQixJQUFJLENBQUM5RCxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFMUIsSUFBSSxDQUFDbUUsUUFBUSxHQUFHO01BQ2YsT0FBTyxFQUFFLENBQ1IsMkJBQTJCLENBQzNCO01BQ0MsT0FBTyxFQUFFLENBQ1YsMkJBQTJCLENBQzNCO01BQ0MsTUFBTSxFQUFFLENBQ1QsMEJBQTBCLENBQzFCO01BQ0MsTUFBTSxFQUFFLENBQ1QsMEJBQTBCO0lBRTVCLENBQUM7SUFFRCxJQUFJLENBQUNDLE9BQU8sR0FBRztNQUNkLE9BQU8sRUFBRSxDQUNSLDBCQUEwQixFQUN4QiwwQkFBMEIsRUFDMUIsMkJBQTJCLEVBQzNCLDJCQUEyQixFQUMzQiwyQkFBMkIsRUFDM0IsMkJBQTJCLENBQzdCO01BQ0MsT0FBTyxFQUFFLENBQ1YsMEJBQTBCLEVBQ3hCLDBCQUEwQixFQUMxQiwyQkFBMkIsRUFDM0IsMkJBQTJCLEVBQzNCLDJCQUEyQixFQUMzQiwyQkFBMkIsQ0FFN0I7TUFDQyxNQUFNLEVBQUUsQ0FDVCx5QkFBeUIsRUFDdkIseUJBQXlCLEVBQ3pCLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsMEJBQTBCLENBQzVCO01BQ0MsTUFBTSxFQUFFLENBQ1QseUJBQXlCLEVBQ3ZCLHlCQUF5QixFQUN6QiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLDBCQUEwQjtJQUU5QixDQUFDO0lBRUQsSUFBSSxDQUFDak0sV0FBVyxHQUFHQSxXQUFXO0lBRTlCLElBQU1rTSxFQUFFLEdBQUcsSUFBSSxDQUFDbE0sV0FBVyxDQUFDK0QsSUFBSSxDQUFDL0wsT0FBTztJQUV4QyxJQUFJLENBQUNtVSxPQUFPLEdBQUdELEVBQUUsQ0FBQ0UsYUFBYSxDQUFDLENBQUM7SUFFakNGLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUNILE9BQU8sQ0FBQztJQUUzQyxJQUFNMVEsQ0FBQyxHQUFHLFNBQUpBLENBQUNBLENBQUE7TUFBQSxPQUFTOFEsUUFBUSxDQUFDN0gsSUFBSSxDQUFDbUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7SUFBQTtJQUM3QyxJQUFNMkYsS0FBSyxHQUFHLElBQUlDLFVBQVUsQ0FBQyxDQUFDaFIsQ0FBQyxDQUFDLENBQUMsRUFBRUEsQ0FBQyxDQUFDLENBQUMsRUFBRUEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUVsRHlRLEVBQUUsQ0FBQ1EsVUFBVSxDQUNaUixFQUFFLENBQUNJLFVBQVUsRUFDWCxDQUFDLEVBQ0RKLEVBQUUsQ0FBQ1MsSUFBSSxFQUNQLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNEVCxFQUFFLENBQUNTLElBQUksRUFDUFQsRUFBRSxDQUFDVSxhQUFhLEVBQ2hCSixLQUNILENBQUM7SUFFRCxJQUFJLENBQUN0TSxXQUFXLEdBQUdBLFdBQVc7SUFFOUIsSUFBSSxDQUFDQSxXQUFXLENBQUMyTSxLQUFLLENBQUNDLElBQUksQ0FBQyxVQUFDQyxLQUFLLEVBQUc7TUFDcEMsSUFBTUMsS0FBSyxHQUFHeE8sS0FBSSxDQUFDMEIsV0FBVyxDQUFDK00sUUFBUSxDQUFDak0sR0FBRyxDQUFDO01BRTVDLElBQUdnTSxLQUFLLEVBQ1I7UUFDQ2pNLE1BQU0sQ0FBQ21NLFdBQVcsQ0FBQzFPLEtBQUksQ0FBQ3dCLFdBQVcsQ0FBQytELElBQUksRUFBRWlKLEtBQUssQ0FBQyxDQUFDRixJQUFJLENBQUMsVUFBQXZPLElBQUksRUFBSTtVQUM3REMsS0FBSSxDQUFDMk4sT0FBTyxHQUFHNU4sSUFBSSxDQUFDNE4sT0FBTztVQUMzQjNOLEtBQUksQ0FBQzBDLEtBQUssR0FBRzNDLElBQUksQ0FBQzRPLEtBQUssQ0FBQ2pNLEtBQUssR0FBRzFDLEtBQUksQ0FBQzBNLEtBQUs7VUFDMUMxTSxLQUFJLENBQUMyQyxNQUFNLEdBQUc1QyxJQUFJLENBQUM0TyxLQUFLLENBQUNoTSxNQUFNLEdBQUczQyxLQUFJLENBQUMwTSxLQUFLO1FBQzdDLENBQUMsQ0FBQztNQUNIO0lBQ0QsQ0FBQyxDQUFDO0VBQ0g7RUFBQyxPQUFBelQsWUFBQSxDQUFBc0osTUFBQTtJQUFBM0ksR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXNMLElBQUlBLENBQUEsRUFDSjtNQUNDLElBQUksQ0FBQ3dILFVBQVUsR0FBRyxJQUFJLENBQUNuTSxRQUFRLEdBQUcwRixJQUFJLENBQUMwRCxHQUFHLENBQUMsSUFBSSxDQUFDckosS0FBSyxDQUFDO01BQ3RELElBQUcsSUFBSSxDQUFDb00sVUFBVSxHQUFHLElBQUksQ0FBQ25NLFFBQVEsRUFDbEM7UUFDQyxJQUFJLENBQUNtTSxVQUFVLEdBQUcsSUFBSSxDQUFDbk0sUUFBUTtNQUNoQztNQUVBLElBQUcsSUFBSSxDQUFDb00sWUFBWSxJQUFJLENBQUMsRUFDekI7UUFDQyxJQUFJLENBQUNBLFlBQVksR0FBRyxJQUFJLENBQUNELFVBQVU7UUFDbkMsSUFBSSxDQUFDRSxZQUFZLEVBQUU7TUFDcEIsQ0FBQyxNQUVEO1FBQ0MsSUFBSSxDQUFDRCxZQUFZLEVBQUU7TUFDcEI7TUFFQSxJQUFHLElBQUksQ0FBQ0MsWUFBWSxJQUFJLElBQUksQ0FBQ2hELE1BQU0sQ0FBQzFNLE1BQU0sRUFDMUM7UUFDQyxJQUFJLENBQUMwUCxZQUFZLEdBQUcsSUFBSSxDQUFDQSxZQUFZLEdBQUcsSUFBSSxDQUFDaEQsTUFBTSxDQUFDMU0sTUFBTTtNQUMzRDtNQUVBLElBQU1xUixLQUFLLEdBQUcsSUFBSSxDQUFDM0UsTUFBTSxDQUFFLElBQUksQ0FBQ2dELFlBQVksQ0FBRTtNQUU5QyxJQUFHMkIsS0FBSyxFQUNSO1FBQ0MsSUFBSSxDQUFDYixPQUFPLEdBQUdhLEtBQUssQ0FBQ2IsT0FBTztRQUM1QixJQUFJLENBQUNqTCxLQUFLLEdBQUk4TCxLQUFLLENBQUM5TCxLQUFLLEdBQUcsSUFBSSxDQUFDZ0ssS0FBSztRQUN0QyxJQUFJLENBQUMvSixNQUFNLEdBQUc2TCxLQUFLLENBQUM3TCxNQUFNLEdBQUcsSUFBSSxDQUFDK0osS0FBSztNQUN4QztNQUdBLElBQU1nQixFQUFFLEdBQUcsSUFBSSxDQUFDbE0sV0FBVyxDQUFDK0QsSUFBSSxDQUFDL0wsT0FBTztNQUN4Q2tVLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUNILE9BQU8sQ0FBQztNQUMzQ0QsRUFBRSxDQUFDa0IsVUFBVSxDQUFDbEIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUksQ0FBQ3JOLFdBQVcsQ0FBQ3NOLGNBQWMsQ0FBQztNQUMvRHBCLEVBQUUsQ0FBQ3FCLFVBQVUsQ0FBQ3JCLEVBQUUsQ0FBQ21CLFlBQVksRUFBRSxJQUFJRyxZQUFZLENBQUMsQ0FDL0MsR0FBRyxFQUFFLEdBQUcsRUFDUixHQUFHLEVBQUUsR0FBRyxFQUNSLEdBQUcsRUFBRSxHQUFHLEVBQ1IsR0FBRyxFQUFFLEdBQUcsRUFDUixHQUFHLEVBQUUsR0FBRyxFQUNSLEdBQUcsRUFBRSxHQUFHLENBQ1IsQ0FBQyxFQUFFdEIsRUFBRSxDQUFDdUIsV0FBVyxDQUFDO01BRW5CdkIsRUFBRSxDQUFDd0IsU0FBUyxDQUNYLElBQUksQ0FBQzFOLFdBQVcsQ0FBQzJOLGNBQWMsRUFDN0IsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FDSCxDQUFDO01BRUR6QixFQUFFLENBQUMwQixTQUFTLENBQ1gsSUFBSSxDQUFDQyxZQUFZLEVBQ2YsR0FBRyxFQUNILEdBQ0gsQ0FBQztNQUVELElBQUksQ0FBQ0MsWUFBWSxDQUNoQixJQUFJLENBQUNqSyxDQUFDLEdBQUcsSUFBSSxDQUFDN0QsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxHQUFHLENBQUNtSixjQUFNLENBQUN1QyxDQUFDLEdBQUl2QyxjQUFNLENBQUNKLEtBQUssR0FBRyxJQUFJLENBQUNsQixXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLEdBQUcsQ0FBRSxFQUN6RyxJQUFJLENBQUMyTCxDQUFDLEdBQUcsSUFBSSxDQUFDOUQsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxHQUFHLENBQUNtSixjQUFNLENBQUN3QyxDQUFDLEdBQUl4QyxjQUFNLENBQUNILE1BQU0sR0FBRyxJQUFJLENBQUNuQixXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLEdBQUcsQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUFDZ0osTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUNuQixXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLEVBQ25LLElBQUksQ0FBQytJLEtBQUssR0FBRyxJQUFJLENBQUNsQixXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLEVBQzVDLElBQUksQ0FBQ2dKLE1BQU0sR0FBRyxJQUFJLENBQUNuQixXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUN2QyxDQUFDO01BRUQrVCxFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDaE8sV0FBVyxDQUFDaU8sVUFBVSxDQUFDO01BQy9EL0IsRUFBRSxDQUFDZ0MsVUFBVSxDQUFDaEMsRUFBRSxDQUFDaUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7TUFFakNqQyxFQUFFLENBQUN3QixTQUFTLENBQUF2USxLQUFBLENBQVorTyxFQUFFLEdBQVcsSUFBSSxDQUFDbE0sV0FBVyxDQUFDMk4sY0FBYyxFQUFBdkosTUFBQSxDQUFBb0csa0JBQUEsQ0FBS3hPLE1BQU0sQ0FBQ2lLLE1BQU0sQ0FBQyxJQUFJLENBQUM0QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1FBQUMsQ0FBQyxFQUFFO01BQUMsQ0FBQyxDQUFDLEdBQUM7TUFFakdxRSxFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDaE8sV0FBVyxDQUFDb08sWUFBWSxDQUFDO01BQ2pFbEMsRUFBRSxDQUFDZ0MsVUFBVSxDQUFDaEMsRUFBRSxDQUFDaUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7TUFFakNqQyxFQUFFLENBQUN3QixTQUFTLENBQ1gsSUFBSSxDQUFDMU4sV0FBVyxDQUFDMk4sY0FBYyxFQUM3QixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUNILENBQUM7SUFDRjtFQUFDO0lBQUF2VixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBaVEsU0FBU0EsQ0FBQytGLGFBQWEsRUFDdkI7TUFBQSxJQUFBN04sTUFBQTtNQUNDLElBQUk4TixRQUFRLEdBQUdELGFBQWEsQ0FBQ0UsSUFBSSxDQUFDLEdBQUcsQ0FBQztNQUV0QyxJQUFHLElBQUksQ0FBQ2pELGFBQWEsS0FBS2dELFFBQVEsRUFDbEM7UUFDQztNQUNEO01BRUEsSUFBSSxDQUFDaEQsYUFBYSxHQUFHZ0QsUUFBUTtNQUU3QixJQUFNcEIsV0FBVyxHQUFHLFNBQWRBLFdBQVdBLENBQUdGLEtBQUs7UUFBQSxPQUFJak0sTUFBTSxDQUFDbU0sV0FBVyxDQUFDMU0sTUFBSSxDQUFDUixXQUFXLENBQUMrRCxJQUFJLEVBQUVpSixLQUFLLENBQUM7TUFBQTtNQUU3RSxJQUFJLENBQUM5TSxXQUFXLENBQUMyTSxLQUFLLENBQUNDLElBQUksQ0FBQyxVQUFBQyxLQUFLLEVBQUk7UUFDcEMsSUFBTTFFLE1BQU0sR0FBRzBFLEtBQUssQ0FBQ3lCLFNBQVMsQ0FBQ0gsYUFBYSxDQUFDLENBQUN0TyxHQUFHLENBQ2hELFVBQUFpTixLQUFLO1VBQUEsT0FBSUUsV0FBVyxDQUFDRixLQUFLLENBQUMsQ0FBQ0YsSUFBSSxDQUFDLFVBQUF2TyxJQUFJO1lBQUEsT0FBSztjQUN6QzROLE9BQU8sRUFBRzVOLElBQUksQ0FBQzROLE9BQU87Y0FDcEJqTCxLQUFLLEVBQUczQyxJQUFJLENBQUM0TyxLQUFLLENBQUNqTSxLQUFLO2NBQ3hCQyxNQUFNLEVBQUU1QyxJQUFJLENBQUM0TyxLQUFLLENBQUNoTTtZQUN0QixDQUFDO1VBQUEsQ0FBQyxDQUFDO1FBQUEsQ0FDSixDQUFDO1FBRURzTixPQUFPLENBQUNDLEdBQUcsQ0FBQ3JHLE1BQU0sQ0FBQyxDQUFDeUUsSUFBSSxDQUFDLFVBQUF6RSxNQUFNO1VBQUEsT0FBSTdILE1BQUksQ0FBQzZILE1BQU0sR0FBR0EsTUFBTTtRQUFBLEVBQUM7TUFFekQsQ0FBQyxDQUFDO0lBQ0g7RUFBQztJQUFBalEsR0FBQTtJQUFBQyxLQUFBLEVBb0RELFNBQUF5VixZQUFZQSxDQUFDakssQ0FBQyxFQUFFQyxDQUFDLEVBQUU1QyxLQUFLLEVBQUVDLE1BQU0sRUFDaEM7TUFBQSxJQURrQ3dOLFNBQVMsR0FBQTdJLFNBQUEsQ0FBQW5LLE1BQUEsUUFBQW1LLFNBQUEsUUFBQTdFLFNBQUEsR0FBQTZFLFNBQUEsTUFBRyxFQUFFO01BRS9DLElBQU1vRyxFQUFFLEdBQUcsSUFBSSxDQUFDbE0sV0FBVyxDQUFDK0QsSUFBSSxDQUFDL0wsT0FBTztNQUV4Q2tVLEVBQUUsQ0FBQ2tCLFVBQVUsQ0FBQ2xCLEVBQUUsQ0FBQ21CLFlBQVksRUFBRSxJQUFJLENBQUNyTixXQUFXLENBQUM0TyxjQUFjLENBQUM7TUFFL0QsSUFBTUMsRUFBRSxHQUFHaEwsQ0FBQztNQUNaLElBQU1pTCxFQUFFLEdBQUdoTCxDQUFDO01BQ1osSUFBTWlMLEVBQUUsR0FBR2xMLENBQUMsR0FBRzNDLEtBQUs7TUFDcEIsSUFBTThOLEVBQUUsR0FBR2xMLENBQUMsR0FBRzNDLE1BQU07TUFFckIsSUFBTThOLE1BQU0sR0FBRyxJQUFJekIsWUFBWSxDQUFDLENBQy9CcUIsRUFBRSxFQUFFQyxFQUFFLEVBQ05DLEVBQUUsRUFBRUQsRUFBRSxFQUNORCxFQUFFLEVBQUVHLEVBQUUsRUFDTkgsRUFBRSxFQUFFRyxFQUFFLEVBQ05ELEVBQUUsRUFBRUQsRUFBRSxFQUNOQyxFQUFFLEVBQUVDLEVBQUUsQ0FDTixDQUFDO01BRUYsSUFBTUUsSUFBSSxHQUFHckwsQ0FBQyxHQUFHM0MsS0FBSyxHQUFHLENBQUM7TUFDMUIsSUFBTWlPLElBQUksR0FBR3JMLENBQUMsR0FBRzNDLE1BQU0sR0FBRyxDQUFDO01BQzNCLElBQU1pTyxLQUFLLEdBQUdsTCxXQUFXLENBQUNoQixHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUd3QixJQUFJLENBQUMySyxFQUFFLENBQUM7TUFFdEQsSUFBTTNULENBQUMsR0FBRyxJQUFJLENBQUM0VCxlQUFlLENBQUNMLE1BQU0sRUFBRSxJQUFJLENBQUNNLGVBQWUsQ0FDMUQsSUFBSSxDQUFDQyxlQUFlLENBQUNOLElBQUksRUFBRUMsSUFBSTtNQUMvQjtNQUNBO01BQUEsRUFDRSxJQUFJLENBQUNLLGVBQWUsQ0FBQyxDQUFDTixJQUFJLEVBQUUsQ0FBQ0MsSUFBSSxDQUNwQyxDQUFDLENBQUM7TUFFRmpELEVBQUUsQ0FBQ3FCLFVBQVUsQ0FBQ3JCLEVBQUUsQ0FBQ21CLFlBQVksRUFBRTNSLENBQUMsRUFBRXdRLEVBQUUsQ0FBQ3VELFdBQVcsQ0FBQztJQUNsRDtFQUFDO0lBQUFyWCxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBcVgsY0FBY0EsQ0FBQSxFQUNkO01BQ0MsT0FBTyxDQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDVCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ1QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNUO0lBQ0Y7RUFBQztJQUFBdFgsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQW1YLGVBQWVBLENBQUNHLEVBQUUsRUFBRUMsRUFBRSxFQUN0QjtNQUNDLE9BQU8sQ0FDTixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUVELEVBQUUsQ0FBQyxFQUNWLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRUMsRUFBRSxDQUFDLEVBQ1YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsQ0FBQyxDQUNWO0lBQ0Y7RUFBQztJQUFBeFgsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXdYLFdBQVdBLENBQUNGLEVBQUUsRUFBRUMsRUFBRSxFQUNsQjtNQUNDLE9BQU8sQ0FDTixDQUFDRCxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNWLENBQUMsQ0FBQyxFQUFFQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ1YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsQ0FBQyxDQUNWO0lBQ0Y7RUFBQztJQUFBeFgsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXlYLFlBQVlBLENBQUNWLEtBQUssRUFDbEI7TUFDQyxJQUFNakYsQ0FBQyxHQUFHekYsSUFBSSxDQUFDcUwsR0FBRyxDQUFDWCxLQUFLLENBQUM7TUFDekIsSUFBTVksQ0FBQyxHQUFHdEwsSUFBSSxDQUFDdUwsR0FBRyxDQUFDYixLQUFLLENBQUM7TUFFekIsT0FBTyxDQUNOLENBQUNZLENBQUMsRUFBRSxDQUFDN0YsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNWLENBQUNBLENBQUMsRUFBRzZGLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDVixDQUFDLENBQUMsRUFBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ1Y7SUFDRjtFQUFDO0lBQUE1WCxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBNlgsWUFBWUEsQ0FBQy9GLENBQUMsRUFDZDtNQUNDLE9BQU8sQ0FDTixDQUFDLENBQUMsRUFBRUEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNULENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDVCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ1Q7SUFDRjtFQUFDO0lBQUEvUixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBOFgsWUFBWUEsQ0FBQ2hHLENBQUMsRUFDZDtNQUNDLE9BQU8sQ0FDTixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ1QsQ0FBQ0EsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDVCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ1Q7SUFDRjtFQUFDO0lBQUEvUixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBK1gsY0FBY0EsQ0FBQ0MsSUFBSSxFQUFFQyxJQUFJLEVBQ3pCO01BQ0MsSUFBR0QsSUFBSSxDQUFDMVUsTUFBTSxLQUFLMlUsSUFBSSxDQUFDM1UsTUFBTSxFQUM5QjtRQUNDLE1BQU0sSUFBSThLLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQztNQUNwQztNQUVBLElBQUc0SixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMxVSxNQUFNLEtBQUsyVSxJQUFJLENBQUMzVSxNQUFNLEVBQ2pDO1FBQ0MsTUFBTSxJQUFJOEssS0FBSyxDQUFDLHVCQUF1QixDQUFDO01BQ3pDO01BRUEsSUFBTThKLE1BQU0sR0FBR3pHLEtBQUssQ0FBQ3VHLElBQUksQ0FBQzFVLE1BQU0sQ0FBQyxDQUFDNlUsSUFBSSxDQUFDLENBQUMsQ0FBQ3pRLEdBQUcsQ0FBQztRQUFBLE9BQU0rSixLQUFLLENBQUN3RyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMzVSxNQUFNLENBQUMsQ0FBQzZVLElBQUksQ0FBQyxDQUFDLENBQUM7TUFBQSxFQUFDO01BRWpGLEtBQUksSUFBSXBVLENBQUMsR0FBRyxDQUFDLEVBQUVBLENBQUMsR0FBR2lVLElBQUksQ0FBQzFVLE1BQU0sRUFBRVMsQ0FBQyxFQUFFLEVBQ25DO1FBQ0MsS0FBSSxJQUFJNEYsQ0FBQyxHQUFHLENBQUMsRUFBRUEsQ0FBQyxHQUFHc08sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDM1UsTUFBTSxFQUFFcUcsQ0FBQyxFQUFFLEVBQ3RDO1VBQ0MsS0FBSSxJQUFJbkMsQ0FBQyxHQUFHLENBQUMsRUFBRUEsQ0FBQyxHQUFHd1EsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDMVUsTUFBTSxFQUFFa0UsQ0FBQyxFQUFFLEVBQ3RDO1lBQ0MwUSxNQUFNLENBQUNuVSxDQUFDLENBQUMsQ0FBQzRGLENBQUMsQ0FBQyxJQUFJcU8sSUFBSSxDQUFDalUsQ0FBQyxDQUFDLENBQUN5RCxDQUFDLENBQUMsR0FBR3lRLElBQUksQ0FBQ3pRLENBQUMsQ0FBQyxDQUFDbUMsQ0FBQyxDQUFDO1VBQ3hDO1FBQ0Q7TUFDRDtNQUVBLE9BQU91TyxNQUFNO0lBQ2Q7RUFBQztJQUFBblksR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWtYLGVBQWVBLENBQUEsRUFDZjtNQUNDLElBQUlnQixNQUFNLEdBQUcsSUFBSSxDQUFDYixjQUFjLENBQUMsQ0FBQztNQUVsQyxLQUFJLElBQUl0VCxDQUFDLEdBQUcsQ0FBQyxFQUFFQSxDQUFDLEdBQUcwSixTQUFBLENBQUtuSyxNQUFNLEVBQUVTLENBQUMsRUFBRSxFQUNuQztRQUNDbVUsTUFBTSxHQUFHLElBQUksQ0FBQ0gsY0FBYyxDQUFDRyxNQUFNLEVBQU9uVSxDQUFDLFFBQUEwSixTQUFBLENBQUFuSyxNQUFBLElBQURTLENBQUMsR0FBQTZFLFNBQUEsR0FBQTZFLFNBQUEsQ0FBRDFKLENBQUMsQ0FBQyxDQUFDO01BQzlDO01BRUEsT0FBT21VLE1BQU07SUFDZDtFQUFDO0lBQUFuWSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBaVgsZUFBZUEsQ0FBQ0wsTUFBTSxFQUFFd0IsTUFBTSxFQUM5QjtNQUNDLElBQU1GLE1BQU0sR0FBRyxFQUFFO01BRWpCLEtBQUksSUFBSW5VLENBQUMsR0FBRyxDQUFDLEVBQUVBLENBQUMsR0FBRzZTLE1BQU0sQ0FBQ3RULE1BQU0sRUFBRVMsQ0FBQyxJQUFJLENBQUMsRUFDeEM7UUFDQyxJQUFNc1UsS0FBSyxHQUFHLENBQUN6QixNQUFNLENBQUM3UyxDQUFDLENBQUMsRUFBRTZTLE1BQU0sQ0FBQzdTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFBQyxJQUFBdVUsU0FBQSxHQUFBOUcsMEJBQUEsQ0FFM0I0RyxNQUFNO1VBQUFHLEtBQUE7UUFBQTtVQUF2QixLQUFBRCxTQUFBLENBQUF4RyxDQUFBLE1BQUF5RyxLQUFBLEdBQUFELFNBQUEsQ0FBQXRWLENBQUEsSUFBQStPLElBQUEsR0FDQTtZQUFBLElBRFV5RyxHQUFHLEdBQUFELEtBQUEsQ0FBQXZZLEtBQUE7WUFFWmtZLE1BQU0sQ0FBQy9NLElBQUksQ0FDVmtOLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBR0csR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUNmSCxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUdHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FDakJILEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBR0csR0FBRyxDQUFDLENBQUMsQ0FDbkIsQ0FBQztVQUNGO1FBQUMsU0FBQUMsR0FBQTtVQUFBSCxTQUFBLENBQUFuVixDQUFBLENBQUFzVixHQUFBO1FBQUE7VUFBQUgsU0FBQSxDQUFBdEcsQ0FBQTtRQUFBO01BQ0Y7TUFFQSxPQUFPLElBQUltRCxZQUFZLENBQUMrQyxNQUFNLENBQUNRLE1BQU0sQ0FBQyxVQUFDQyxDQUFDLEVBQUVuUixDQUFDO1FBQUEsT0FBSyxDQUFDLENBQUMsR0FBR0EsQ0FBQyxJQUFJLENBQUM7TUFBQSxFQUFDLENBQUM7SUFDOUQ7RUFBQztJQUFBekgsR0FBQTtJQUFBQyxLQUFBLEVBeE1ELFNBQU82VSxXQUFXQSxDQUFDbkosSUFBSSxFQUFFa04sUUFBUSxFQUNqQztNQUNDLElBQU0vRSxFQUFFLEdBQUduSSxJQUFJLENBQUMvTCxPQUFPO01BRXZCLElBQUcsQ0FBQyxJQUFJLENBQUNrWixRQUFRLEVBQ2pCO1FBQ0MsSUFBSSxDQUFDQSxRQUFRLEdBQUcsQ0FBQyxDQUFDO01BQ25CO01BRUEsSUFBRyxJQUFJLENBQUNBLFFBQVEsQ0FBQ0QsUUFBUSxDQUFDLEVBQzFCO1FBQ0MsT0FBTyxJQUFJLENBQUNDLFFBQVEsQ0FBQ0QsUUFBUSxDQUFDO01BQy9CO01BRUEsSUFBSSxDQUFDQyxRQUFRLENBQUNELFFBQVEsQ0FBQyxHQUFHbFEsTUFBTSxDQUFDb1EsU0FBUyxDQUFDRixRQUFRLENBQUMsQ0FBQ25FLElBQUksQ0FBQyxVQUFDSyxLQUFLLEVBQUc7UUFDbEUsSUFBTWhCLE9BQU8sR0FBR0QsRUFBRSxDQUFDRSxhQUFhLENBQUMsQ0FBQztRQUVsQ0YsRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSCxPQUFPLENBQUM7UUFFdENELEVBQUUsQ0FBQ2tGLGFBQWEsQ0FBQ2xGLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUNtRixjQUFjLEVBQUVuRixFQUFFLENBQUNvRixhQUFhLENBQUM7UUFDcEVwRixFQUFFLENBQUNrRixhQUFhLENBQUNsRixFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDcUYsY0FBYyxFQUFFckYsRUFBRSxDQUFDb0YsYUFBYSxDQUFDO1FBQ3BFcEYsRUFBRSxDQUFDa0YsYUFBYSxDQUFDbEYsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQ3NGLGtCQUFrQixFQUFFdEYsRUFBRSxDQUFDdUYsT0FBTyxDQUFDO1FBQ2xFdkYsRUFBRSxDQUFDa0YsYUFBYSxDQUFDbEYsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQ3dGLGtCQUFrQixFQUFFeEYsRUFBRSxDQUFDdUYsT0FBTyxDQUFDO1FBRWxFdkYsRUFBRSxDQUFDUSxVQUFVLENBQ1pSLEVBQUUsQ0FBQ0ksVUFBVSxFQUNYLENBQUMsRUFDREosRUFBRSxDQUFDUyxJQUFJLEVBQ1BULEVBQUUsQ0FBQ1MsSUFBSSxFQUNQVCxFQUFFLENBQUNVLGFBQWEsRUFDaEJPLEtBQ0gsQ0FBQztRQUVELE9BQU87VUFBQ0EsS0FBSyxFQUFMQSxLQUFLO1VBQUVoQixPQUFPLEVBQVBBO1FBQU8sQ0FBQztNQUN4QixDQUFDLENBQUM7TUFFRixPQUFPLElBQUksQ0FBQytFLFFBQVEsQ0FBQ0QsUUFBUSxDQUFDO0lBQy9CO0VBQUM7SUFBQTdZLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQU84WSxTQUFTQSxDQUFDblEsR0FBRyxFQUNwQjtNQUNDLE9BQU8sSUFBSXlOLE9BQU8sQ0FBQyxVQUFDa0QsTUFBTSxFQUFFQyxNQUFNLEVBQUc7UUFDcEMsSUFBTXpFLEtBQUssR0FBRyxJQUFJMEUsS0FBSyxDQUFDLENBQUM7UUFDekIxRSxLQUFLLENBQUNuTSxHQUFHLEdBQUtBLEdBQUc7UUFDakJtTSxLQUFLLENBQUN4SyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsVUFBQ29DLEtBQUssRUFBRztVQUN2QzRNLE1BQU0sQ0FBQ3hFLEtBQUssQ0FBQztRQUNkLENBQUMsQ0FBQztNQUNILENBQUMsQ0FBQztJQUNIO0VBQUM7QUFBQTs7Ozs7Ozs7OztBQ3BTRixJQUFBMVMsSUFBQSxHQUFBckIsT0FBQTtBQUNBLElBQUEwWSxXQUFBLEdBQUExWSxPQUFBO0FBRUEsSUFBQTJZLEtBQUEsR0FBQTNZLE9BQUE7QUFDQSxJQUFBNkIsT0FBQSxHQUFBN0IsT0FBQTtBQUNBLElBQUErQixPQUFBLEdBQUEvQixPQUFBO0FBQ0EsSUFBQTJOLFNBQUEsR0FBQTNOLE9BQUE7QUFDQSxJQUFBd0IsWUFBQSxHQUFBeEIsT0FBQTtBQUE0QyxTQUFBa0QsUUFBQVYsQ0FBQSxzQ0FBQVUsT0FBQSx3QkFBQUMsTUFBQSx1QkFBQUEsTUFBQSxDQUFBeUssUUFBQSxhQUFBcEwsQ0FBQSxrQkFBQUEsQ0FBQSxnQkFBQUEsQ0FBQSxXQUFBQSxDQUFBLHlCQUFBVyxNQUFBLElBQUFYLENBQUEsQ0FBQXNCLFdBQUEsS0FBQVgsTUFBQSxJQUFBWCxDQUFBLEtBQUFXLE1BQUEsQ0FBQUosU0FBQSxxQkFBQVAsQ0FBQSxLQUFBVSxPQUFBLENBQUFWLENBQUE7QUFBQSxTQUFBbEUsZ0JBQUEwRCxDQUFBLEVBQUFDLENBQUEsVUFBQUQsQ0FBQSxZQUFBQyxDQUFBLGFBQUFDLFNBQUE7QUFBQSxTQUFBQyxrQkFBQUMsQ0FBQSxFQUFBQyxDQUFBLGFBQUFDLENBQUEsTUFBQUEsQ0FBQSxHQUFBRCxDQUFBLENBQUFFLE1BQUEsRUFBQUQsQ0FBQSxVQUFBRSxDQUFBLEdBQUFILENBQUEsQ0FBQUMsQ0FBQSxHQUFBRSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQVUsY0FBQSxDQUFBTixDQUFBLENBQUF4RCxHQUFBLEdBQUF3RCxDQUFBO0FBQUEsU0FBQW5FLGFBQUErRCxDQUFBLEVBQUFDLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFGLGlCQUFBLENBQUFDLENBQUEsQ0FBQVcsU0FBQSxFQUFBVixDQUFBLEdBQUFDLENBQUEsSUFBQUgsaUJBQUEsQ0FBQUMsQ0FBQSxFQUFBRSxDQUFBLEdBQUFNLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLGlCQUFBTyxRQUFBLFNBQUFQLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLElBRS9CK0UsV0FBVyxHQUFBakosT0FBQSxDQUFBaUosV0FBQTtFQUV2QixTQUFBQSxZQUFZNUksT0FBTyxFQUFFa0ksR0FBRyxFQUN4QjtJQUFBLElBQUF2QixLQUFBO0lBQUE5RyxlQUFBLE9BQUErSSxXQUFBO0lBQ0MsSUFBSSxDQUFDeUcsa0JBQVEsQ0FBQzhELE9BQU8sQ0FBQyxHQUFHLElBQUk7SUFFN0IsSUFBSSxDQUFDakwsR0FBRyxHQUFHQSxHQUFHO0lBQ2QsSUFBSSxDQUFDeUIsT0FBTyxHQUFHLElBQUkxQyxRQUFHLENBQUQsQ0FBQztJQUV0QixJQUFJLENBQUNrVCxLQUFLLEdBQUc7TUFDWm5PLENBQUMsRUFBRSxJQUFJO01BQ0xDLENBQUMsRUFBRSxJQUFJO01BQ1BtTyxNQUFNLEVBQUUsSUFBSTtNQUNaQyxNQUFNLEVBQUU7SUFDWCxDQUFDO0lBRUQ1USxjQUFNLENBQUNKLEtBQUssR0FBSXJKLE9BQU8sQ0FBQ3FKLEtBQUs7SUFDN0JJLGNBQU0sQ0FBQ0gsTUFBTSxHQUFHdEosT0FBTyxDQUFDc0osTUFBTTtJQUU5QixJQUFJLENBQUM0QyxJQUFJLEdBQUcsSUFBSW5NLFVBQUksQ0FBQ0MsT0FBTyxDQUFDO0lBRTdCLElBQU1xVSxFQUFFLEdBQUcsSUFBSSxDQUFDbkksSUFBSSxDQUFDL0wsT0FBTztJQUU1QmtVLEVBQUUsQ0FBQ2lHLFNBQVMsQ0FBQ2pHLEVBQUUsQ0FBQ2tHLFNBQVMsRUFBRWxHLEVBQUUsQ0FBQ21HLG1CQUFtQixDQUFDO0lBQ2xEbkcsRUFBRSxDQUFDb0csTUFBTSxDQUFDcEcsRUFBRSxDQUFDcUcsS0FBSyxDQUFDO0lBRW5CLElBQUksQ0FBQy9aLE9BQU8sR0FBRyxJQUFJLENBQUN1TCxJQUFJLENBQUNqSyxhQUFhLENBQ3JDLElBQUksQ0FBQ2lLLElBQUksQ0FBQ3RMLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxFQUMzQyxJQUFJLENBQUNzTCxJQUFJLENBQUN0TCxZQUFZLENBQUMscUJBQXFCLENBQy9DLENBQUM7O0lBRUQ7SUFDQTtJQUNBO0lBQ0E7O0lBRUF5VCxFQUFFLENBQUNzRyxVQUFVLENBQUMsSUFBSSxDQUFDaGEsT0FBTyxDQUFDO0lBRTNCLElBQUksQ0FBQ29XLGNBQWMsR0FBRzFDLEVBQUUsQ0FBQ3VHLFlBQVksQ0FBQyxDQUFDO0lBQ3ZDLElBQUksQ0FBQ25GLGNBQWMsR0FBR3BCLEVBQUUsQ0FBQ3VHLFlBQVksQ0FBQyxDQUFDO0lBQ3ZDLElBQUksQ0FBQ0MsY0FBYyxHQUFHeEcsRUFBRSxDQUFDdUcsWUFBWSxDQUFDLENBQUM7SUFFdkMsSUFBSSxDQUFDRSxnQkFBZ0IsR0FBR3pHLEVBQUUsQ0FBQzBHLGlCQUFpQixDQUFDLElBQUksQ0FBQ3BhLE9BQU8sRUFBRSxZQUFZLENBQUM7SUFDeEUsSUFBSSxDQUFDcWEsZ0JBQWdCLEdBQUczRyxFQUFFLENBQUMwRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUNwYSxPQUFPLEVBQUUsWUFBWSxDQUFDO0lBQ3hFLElBQUksQ0FBQ3NhLGdCQUFnQixHQUFHNUcsRUFBRSxDQUFDMEcsaUJBQWlCLENBQUMsSUFBSSxDQUFDcGEsT0FBTyxFQUFFLFlBQVksQ0FBQztJQUV4RSxJQUFJLENBQUN1YSxhQUFhLEdBQVE3RyxFQUFFLENBQUM4RyxrQkFBa0IsQ0FBQyxJQUFJLENBQUN4YSxPQUFPLEVBQUUsU0FBUyxDQUFDO0lBQ3hFLElBQUksQ0FBQ3lhLGNBQWMsR0FBTy9HLEVBQUUsQ0FBQzhHLGtCQUFrQixDQUFDLElBQUksQ0FBQ3hhLE9BQU8sRUFBRSxVQUFVLENBQUM7SUFDekUsSUFBSSxDQUFDMGEsa0JBQWtCLEdBQUdoSCxFQUFFLENBQUM4RyxrQkFBa0IsQ0FBQyxJQUFJLENBQUN4YSxPQUFPLEVBQUUsY0FBYyxDQUFDO0lBQzdFLElBQUksQ0FBQzJhLGFBQWEsR0FBUWpILEVBQUUsQ0FBQzhHLGtCQUFrQixDQUFDLElBQUksQ0FBQ3hhLE9BQU8sRUFBRSxTQUFTLENBQUM7SUFDeEUsSUFBSSxDQUFDNGEsZUFBZSxHQUFNbEgsRUFBRSxDQUFDOEcsa0JBQWtCLENBQUMsSUFBSSxDQUFDeGEsT0FBTyxFQUFFLFVBQVUsQ0FBQztJQUN6RSxJQUFJLENBQUM2YSxjQUFjLEdBQU9uSCxFQUFFLENBQUM4RyxrQkFBa0IsQ0FBQyxJQUFJLENBQUN4YSxPQUFPLEVBQUUsVUFBVSxDQUFDO0lBQ3pFLElBQUksQ0FBQ3FWLFlBQVksR0FBUzNCLEVBQUUsQ0FBQzhHLGtCQUFrQixDQUFDLElBQUksQ0FBQ3hhLE9BQU8sRUFBRSxRQUFRLENBQUM7SUFDdkUsSUFBSSxDQUFDOGEsYUFBYSxHQUFRcEgsRUFBRSxDQUFDOEcsa0JBQWtCLENBQUMsSUFBSSxDQUFDeGEsT0FBTyxFQUFFLFNBQVMsQ0FBQztJQUN4RSxJQUFJLENBQUNtVixjQUFjLEdBQU96QixFQUFFLENBQUM4RyxrQkFBa0IsQ0FBQyxJQUFJLENBQUN4YSxPQUFPLEVBQUUsVUFBVSxDQUFDO0lBQ3pFLElBQUksQ0FBQythLFlBQVksR0FBU3JILEVBQUUsQ0FBQzhHLGtCQUFrQixDQUFDLElBQUksQ0FBQ3hhLE9BQU8sRUFBRSxRQUFRLENBQUM7SUFFdkUsSUFBTWdiLFVBQVUsR0FBRyxDQUNsQixZQUFZLEVBQ1YsWUFBWSxFQUNaLFlBQVksQ0FDZDtJQUVELElBQU1DLFFBQVEsR0FBRyxDQUNoQixTQUFTLEVBQ1AsVUFBVSxFQUNWLGNBQWMsRUFDZCxTQUFTLEVBQ1QsVUFBVSxFQUNWLFVBQVUsRUFDVixRQUFRLEVBQ1IsU0FBUyxFQUNULFVBQVUsRUFDVixRQUFRLENBQ1Y7O0lBRUQ7SUFDQTtJQUNBOztJQUVBdkgsRUFBRSxDQUFDa0IsVUFBVSxDQUFDbEIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUksQ0FBQ3VCLGNBQWMsQ0FBQztJQUNuRDFDLEVBQUUsQ0FBQ3dILHVCQUF1QixDQUFDLElBQUksQ0FBQ2YsZ0JBQWdCLENBQUM7SUFDakR6RyxFQUFFLENBQUN5SCxtQkFBbUIsQ0FDckIsSUFBSSxDQUFDaEIsZ0JBQWdCLEVBQ25CLENBQUMsRUFDRHpHLEVBQUUsQ0FBQzBILEtBQUssRUFDUixLQUFLLEVBQ0wsQ0FBQyxFQUNELENBQ0gsQ0FBQztJQUVEMUgsRUFBRSxDQUFDd0gsdUJBQXVCLENBQUMsSUFBSSxDQUFDYixnQkFBZ0IsQ0FBQztJQUNqRDNHLEVBQUUsQ0FBQ2tCLFVBQVUsQ0FBQ2xCLEVBQUUsQ0FBQ21CLFlBQVksRUFBRSxJQUFJLENBQUNDLGNBQWMsQ0FBQztJQUNuRHBCLEVBQUUsQ0FBQ3lILG1CQUFtQixDQUNyQixJQUFJLENBQUNkLGdCQUFnQixFQUNuQixDQUFDLEVBQ0QzRyxFQUFFLENBQUMwSCxLQUFLLEVBQ1IsS0FBSyxFQUNMLENBQUMsRUFDRCxDQUNILENBQUM7SUFFRCxJQUFJLENBQUNDLFNBQVMsR0FBRzNILEVBQUUsQ0FBQ0UsYUFBYSxDQUFDLENBQUM7SUFDbkNGLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUN1SCxTQUFTLENBQUM7SUFDN0MzSCxFQUFFLENBQUNRLFVBQVUsQ0FDWlIsRUFBRSxDQUFDSSxVQUFVLEVBQ1gsQ0FBQyxFQUNESixFQUFFLENBQUNTLElBQUksRUFDUCxJQUFJLEVBQ0osSUFBSSxFQUNKLENBQUMsRUFDRFQsRUFBRSxDQUFDUyxJQUFJLEVBQ1BULEVBQUUsQ0FBQ1UsYUFBYSxFQUNoQixJQUNILENBQUM7SUFFRFYsRUFBRSxDQUFDa0YsYUFBYSxDQUFDbEYsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQ21GLGNBQWMsRUFBRW5GLEVBQUUsQ0FBQ29GLGFBQWEsQ0FBQztJQUNwRXBGLEVBQUUsQ0FBQ2tGLGFBQWEsQ0FBQ2xGLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUNxRixjQUFjLEVBQUVyRixFQUFFLENBQUNvRixhQUFhLENBQUM7SUFFcEVwRixFQUFFLENBQUNrRixhQUFhLENBQUNsRixFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDc0Ysa0JBQWtCLEVBQUV0RixFQUFFLENBQUN1RixPQUFPLENBQUM7SUFDbEV2RixFQUFFLENBQUNrRixhQUFhLENBQUNsRixFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDd0Ysa0JBQWtCLEVBQUV4RixFQUFFLENBQUN1RixPQUFPLENBQUM7SUFFbEUsSUFBSSxDQUFDcUMsV0FBVyxHQUFHNUgsRUFBRSxDQUFDRSxhQUFhLENBQUMsQ0FBQztJQUNyQ0YsRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQ3dILFdBQVcsQ0FBQztJQUMvQzVILEVBQUUsQ0FBQ1EsVUFBVSxDQUNaUixFQUFFLENBQUNJLFVBQVUsRUFDWCxDQUFDLEVBQ0RKLEVBQUUsQ0FBQ1MsSUFBSSxFQUNQLElBQUksRUFDSixJQUFJLEVBQ0osQ0FBQyxFQUNEVCxFQUFFLENBQUNTLElBQUksRUFDUFQsRUFBRSxDQUFDVSxhQUFhLEVBQ2hCLElBQ0gsQ0FBQztJQUVEVixFQUFFLENBQUNrRixhQUFhLENBQUNsRixFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDbUYsY0FBYyxFQUFFbkYsRUFBRSxDQUFDb0YsYUFBYSxDQUFDO0lBQ3BFcEYsRUFBRSxDQUFDa0YsYUFBYSxDQUFDbEYsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQ3FGLGNBQWMsRUFBRXJGLEVBQUUsQ0FBQ29GLGFBQWEsQ0FBQztJQUVwRXBGLEVBQUUsQ0FBQ2tGLGFBQWEsQ0FBQ2xGLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUNzRixrQkFBa0IsRUFBRXRGLEVBQUUsQ0FBQ3VGLE9BQU8sQ0FBQztJQUNsRXZGLEVBQUUsQ0FBQ2tGLGFBQWEsQ0FBQ2xGLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUN3RixrQkFBa0IsRUFBRXhGLEVBQUUsQ0FBQ3VGLE9BQU8sQ0FBQztJQUVsRSxJQUFJLENBQUN4RCxVQUFVLEdBQUcvQixFQUFFLENBQUM2SCxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3hDN0gsRUFBRSxDQUFDNkIsZUFBZSxDQUFDN0IsRUFBRSxDQUFDOEIsV0FBVyxFQUFFLElBQUksQ0FBQ0MsVUFBVSxDQUFDO0lBQ25EL0IsRUFBRSxDQUFDOEgsb0JBQW9CLENBQ3RCOUgsRUFBRSxDQUFDOEIsV0FBVyxFQUNaOUIsRUFBRSxDQUFDK0gsaUJBQWlCLEVBQ3BCL0gsRUFBRSxDQUFDSSxVQUFVLEVBQ2IsSUFBSSxDQUFDdUgsU0FBUyxFQUNkLENBQ0gsQ0FBQztJQUVELElBQUksQ0FBQ3pGLFlBQVksR0FBR2xDLEVBQUUsQ0FBQzZILGlCQUFpQixDQUFDLENBQUM7SUFDMUM3SCxFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDSSxZQUFZLENBQUM7SUFDckRsQyxFQUFFLENBQUM4SCxvQkFBb0IsQ0FDdEI5SCxFQUFFLENBQUM4QixXQUFXLEVBQ1o5QixFQUFFLENBQUMrSCxpQkFBaUIsRUFDcEIvSCxFQUFFLENBQUNJLFVBQVUsRUFDYixJQUFJLENBQUN3SCxXQUFXLEVBQ2hCLENBQ0gsQ0FBQztJQUVEaGMsUUFBUSxDQUFDNkssZ0JBQWdCLENBQ3hCLFdBQVcsRUFBRSxVQUFDb0MsS0FBSyxFQUFHO01BQ3JCdkcsS0FBSSxDQUFDd1QsS0FBSyxDQUFDbk8sQ0FBQyxHQUFHa0IsS0FBSyxDQUFDbVAsT0FBTztNQUM1QjFWLEtBQUksQ0FBQ3dULEtBQUssQ0FBQ2xPLENBQUMsR0FBR2lCLEtBQUssQ0FBQ29QLE9BQU87SUFDN0IsQ0FDRCxDQUFDO0lBRUQsSUFBSSxDQUFDeFMsUUFBUSxHQUFHO01BQ2ZhLE1BQU0sRUFBSyxJQUFJO01BQ2I0UixNQUFNLEVBQUcsSUFBSTtNQUNieFMsT0FBTyxFQUFFLElBQUk7TUFDYk8sT0FBTyxFQUFFLElBQUk7TUFDYk4sWUFBWSxFQUFFLElBQUk7TUFDbEJJLFlBQVksRUFBRTtJQUNqQixDQUFDO0lBRUQsSUFBSSxDQUFDTixRQUFRLEdBQUd1RixrQkFBUSxDQUFDQyxZQUFZLENBQUMsSUFBSSxDQUFDeEYsUUFBUSxDQUFDO0lBRXBELElBQUksQ0FBQzBTLFVBQVUsR0FBSSxJQUFJNUwsc0JBQVUsQ0FBQyxJQUFJLEVBQUUxSSxHQUFHLENBQUM7SUFDNUMsSUFBTXVVLENBQUMsR0FBRyxHQUFHO0lBQ2IsSUFBTXBVLFdBQVcsR0FBRyxJQUFJQyx3QkFBVyxDQUFELENBQUM7SUFFbkMsS0FBSSxJQUFNL0QsQ0FBQyxJQUFJME4sS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDMEcsSUFBSSxDQUFDLENBQUMsRUFDL0I7TUFDQyxJQUFNK0QsTUFBTSxHQUFHLElBQUl4VCxjQUFNLENBQUM7UUFDekJDLEdBQUcsRUFBRSxZQUFZO1FBQ2pCaEIsV0FBVyxFQUFFLElBQUk7UUFDakJFLFdBQVcsRUFBWEE7TUFDRCxDQUFDLENBQUM7TUFDRnFVLE1BQU0sQ0FBQzFRLENBQUMsR0FBRyxFQUFFLEdBQUl6SCxDQUFDLEdBQUcsRUFBRSxHQUFJa1ksQ0FBQztNQUM1QkMsTUFBTSxDQUFDelEsQ0FBQyxHQUFHWSxJQUFJLENBQUNDLEtBQUssQ0FBRXZJLENBQUMsR0FBRyxFQUFFLEdBQUlrWSxDQUFDLENBQUMsR0FBRyxFQUFFO01BQ3hDLElBQUksQ0FBQzlTLE9BQU8sQ0FBQ0QsR0FBRyxDQUFDZ1QsTUFBTSxDQUFDO0lBQ3pCO0lBRUEsSUFBSSxDQUFDL1MsT0FBTyxDQUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDOFMsVUFBVSxDQUFDO0lBRWpDLElBQUksQ0FBQzVTLFNBQVMsR0FBRyxJQUFJO0VBQ3RCO0VBQUMsT0FBQWhLLFlBQUEsQ0FBQWdKLFdBQUE7SUFBQXJJLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUE0SCxRQUFRQSxDQUFBLEVBQ1I7TUFDQyxJQUFHLElBQUksQ0FBQzBCLFFBQVEsQ0FBQ2EsTUFBTSxLQUFLLElBQUksRUFDaEM7UUFDQyxPQUFPLEtBQUs7TUFDYjtNQUVBLElBQUksQ0FBQ2IsUUFBUSxDQUFDYSxNQUFNLEdBQUksSUFBSTtNQUM1QixJQUFJLENBQUNiLFFBQVEsQ0FBQ3lTLE1BQU0sR0FBSSxJQUFJO01BQzVCLElBQUksQ0FBQ3pTLFFBQVEsQ0FBQ0MsT0FBTyxHQUFHLElBQUk7TUFDNUIsSUFBSSxDQUFDRCxRQUFRLENBQUNRLE9BQU8sR0FBRyxJQUFJO01BRTVCLE9BQU8sSUFBSTtJQUNaO0VBQUM7SUFBQS9KLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFzTCxJQUFJQSxDQUFBLEVBQ0o7TUFDQyxJQUFHLElBQUksQ0FBQ2xDLFNBQVMsRUFDakI7UUFDQ0gsY0FBTSxDQUFDdUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQ3BDLFNBQVMsQ0FBQ1gsTUFBTSxDQUFDK0MsQ0FBQyxJQUFJLElBQUksQ0FBQ0UsSUFBSSxDQUFDNUwsU0FBUyxJQUFJLENBQUM7UUFDcEVtSixjQUFNLENBQUN3QyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDckMsU0FBUyxDQUFDWCxNQUFNLENBQUNnRCxDQUFDLElBQUksSUFBSSxDQUFDQyxJQUFJLENBQUM1TCxTQUFTLElBQUksQ0FBQztNQUNyRTtNQUVBLElBQU0rVCxFQUFFLEdBQUcsSUFBSSxDQUFDbkksSUFBSSxDQUFDL0wsT0FBTztNQUU1QmtVLEVBQUUsQ0FBQzZCLGVBQWUsQ0FBQzdCLEVBQUUsQ0FBQzhCLFdBQVcsRUFBRSxJQUFJLENBQUNJLFlBQVksQ0FBQztNQUVyRGxDLEVBQUUsQ0FBQ3NJLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7TUFDekJ0SSxFQUFFLENBQUN1SSxLQUFLLENBQUN2SSxFQUFFLENBQUN3SSxnQkFBZ0IsQ0FBQztNQUU3QnhJLEVBQUUsQ0FBQzZCLGVBQWUsQ0FBQzdCLEVBQUUsQ0FBQzhCLFdBQVcsRUFBRSxJQUFJLENBQUNDLFVBQVUsQ0FBQztNQUVuRC9CLEVBQUUsQ0FBQ3lJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFekksRUFBRSxDQUFDdkwsTUFBTSxDQUFDTyxLQUFLLEVBQUVnTCxFQUFFLENBQUN2TCxNQUFNLENBQUNRLE1BQU0sQ0FBQztNQUVwRCtLLEVBQUUsQ0FBQzBCLFNBQVMsQ0FDWCxJQUFJLENBQUNzRixrQkFBa0IsRUFDckJoSCxFQUFFLENBQUN2TCxNQUFNLENBQUNPLEtBQUssRUFDZmdMLEVBQUUsQ0FBQ3ZMLE1BQU0sQ0FBQ1EsTUFDYixDQUFDO01BRUQrSyxFQUFFLENBQUMwSSxTQUFTLENBQ1gsSUFBSSxDQUFDdkIsY0FBYyxFQUNqQixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQ0gsQ0FBQztNQUVEbkgsRUFBRSxDQUFDMEIsU0FBUyxDQUNYLElBQUksQ0FBQ0MsWUFBWSxFQUNmdk0sY0FBTSxDQUFDSixLQUFLLEVBQ1pJLGNBQU0sQ0FBQ0gsTUFDVixDQUFDO01BRUQrSyxFQUFFLENBQUMwQixTQUFTLENBQ1gsSUFBSSxDQUFDMEYsYUFBYSxFQUNoQixJQUFJLENBQUN2UCxJQUFJLENBQUM1TCxTQUFTLEVBQ25CLElBQUksQ0FBQzRMLElBQUksQ0FBQzVMLFNBQ2IsQ0FBQztNQUVEK1QsRUFBRSxDQUFDd0IsU0FBUyxDQUNYLElBQUksQ0FBQ0MsY0FBYyxFQUNqQixDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUNILENBQUM7TUFFRHpCLEVBQUUsQ0FBQ3NJLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7TUFDekJ0SSxFQUFFLENBQUN1SSxLQUFLLENBQUN2SSxFQUFFLENBQUN3SSxnQkFBZ0IsQ0FBQztNQUU3QixJQUFJbFQsT0FBTyxHQUFHLElBQUksQ0FBQ0EsT0FBTyxDQUFDOEIsS0FBSyxDQUFDLENBQUM7TUFFbEM5QixPQUFPLENBQUNtSSxPQUFPLENBQUMsVUFBQVEsQ0FBQztRQUFBLE9BQUlBLENBQUMsQ0FBQ2MsQ0FBQyxHQUFHZCxDQUFDLFlBQVkxQixzQkFBVSxHQUFHLENBQUMsQ0FBQyxHQUFHMEIsQ0FBQyxDQUFDckcsQ0FBQztNQUFBLEVBQUM7TUFFOURyRixNQUFNLENBQUNDLFdBQVcsSUFBSWhGLE9BQU8sQ0FBQ21iLElBQUksQ0FBQyxNQUFNLENBQUM7TUFFMUNyVCxPQUFPLENBQUNzVCxJQUFJLENBQUMsVUFBQzFaLENBQUMsRUFBQ2tKLENBQUMsRUFBSztRQUNyQixJQUFJbEosQ0FBQyxZQUFZcU4sc0JBQVUsSUFBSyxFQUFFbkUsQ0FBQyxZQUFZbUUsc0JBQVUsQ0FBQyxFQUMxRDtVQUNDLE9BQU8sQ0FBQyxDQUFDO1FBQ1Y7UUFFQSxJQUFJbkUsQ0FBQyxZQUFZbUUsc0JBQVUsSUFBSyxFQUFFck4sQ0FBQyxZQUFZcU4sc0JBQVUsQ0FBQyxFQUMxRDtVQUNDLE9BQU8sQ0FBQztRQUNUO1FBRUEsSUFBR3JOLENBQUMsQ0FBQzZQLENBQUMsS0FBS2hLLFNBQVMsRUFDcEI7VUFDQyxPQUFPLENBQUMsQ0FBQztRQUNWO1FBRUEsSUFBR3FELENBQUMsQ0FBQzJHLENBQUMsS0FBS2hLLFNBQVMsRUFDcEI7VUFDQyxPQUFPLENBQUM7UUFDVDtRQUVBLE9BQU83RixDQUFDLENBQUM2UCxDQUFDLEdBQUczRyxDQUFDLENBQUMyRyxDQUFDO01BQ2pCLENBQUMsQ0FBQztNQUVGLElBQUd4TSxNQUFNLENBQUNDLFdBQVcsRUFDckI7UUFDQ2hGLE9BQU8sQ0FBQ3FiLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDdkJ0VyxNQUFNLENBQUNDLFdBQVcsR0FBRyxLQUFLO01BQzNCO01BRUE4QyxPQUFPLENBQUNtSSxPQUFPLENBQUMsVUFBQVEsQ0FBQztRQUFBLE9BQUlBLENBQUMsQ0FBQ3hHLElBQUksQ0FBQyxDQUFDO01BQUEsRUFBQztNQUU5QnVJLEVBQUUsQ0FBQzBJLFNBQVMsQ0FDWCxJQUFJLENBQUN2QixjQUFjLEVBQ2pCM08sSUFBSSxDQUFDMkssRUFBRSxHQUFHLENBQUMsRUFDWG5MLFdBQVcsQ0FBQ2hCLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO01BQUEsRUFDeEIsQ0FDSCxDQUFDO01BRURnSixFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDO01BRXhDOUIsRUFBRSxDQUFDOEksYUFBYSxDQUFDOUksRUFBRSxDQUFDK0ksUUFBUSxDQUFDO01BQzdCL0ksRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQ3VILFNBQVMsQ0FBQztNQUM3QzNILEVBQUUsQ0FBQ2dKLFNBQVMsQ0FBQyxJQUFJLENBQUNuQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO01BRW5DN0csRUFBRSxDQUFDOEksYUFBYSxDQUFDOUksRUFBRSxDQUFDaUosUUFBUSxDQUFDO01BQzdCakosRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQ3dILFdBQVcsQ0FBQztNQUMvQzVILEVBQUUsQ0FBQ2dKLFNBQVMsQ0FBQyxJQUFJLENBQUNqQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO01BRXBDLElBQUksQ0FBQ25GLFlBQVksQ0FDaEIsQ0FBQyxFQUNDLElBQUksQ0FBQy9KLElBQUksQ0FBQ2xNLE9BQU8sQ0FBQ3NKLE1BQU0sRUFDeEIsSUFBSSxDQUFDNEMsSUFBSSxDQUFDbE0sT0FBTyxDQUFDcUosS0FBSyxFQUN2QixDQUFDLElBQUksQ0FBQzZDLElBQUksQ0FBQ2xNLE9BQU8sQ0FBQ3NKLE1BQ3RCLENBQUM7TUFFRCtLLEVBQUUsQ0FBQ2dDLFVBQVUsQ0FBQ2hDLEVBQUUsQ0FBQ2lDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO01BRWpDakMsRUFBRSxDQUFDMEksU0FBUyxDQUNYLElBQUksQ0FBQ3ZCLGNBQWMsRUFDakIsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUNILENBQUM7TUFFRG5ILEVBQUUsQ0FBQzhJLGFBQWEsQ0FBQzlJLEVBQUUsQ0FBQytJLFFBQVEsQ0FBQztNQUM3Qi9JLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUM7TUFDbkNKLEVBQUUsQ0FBQ2dKLFNBQVMsQ0FBQyxJQUFJLENBQUNuQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO01BRW5DN0csRUFBRSxDQUFDOEksYUFBYSxDQUFDOUksRUFBRSxDQUFDaUosUUFBUSxDQUFDO01BQzdCakosRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQztNQUNuQ0osRUFBRSxDQUFDZ0osU0FBUyxDQUFDLElBQUksQ0FBQ2pDLGNBQWMsRUFBRSxDQUFDLENBQUM7TUFFcEMvRyxFQUFFLENBQUM4SSxhQUFhLENBQUM5SSxFQUFFLENBQUMrSSxRQUFRLENBQUM7SUFFOUI7RUFBQztJQUFBN2MsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWlLLE1BQU1BLENBQUNwQixLQUFLLEVBQUVDLE1BQU0sRUFDcEI7TUFDQyxJQUFNK0ssRUFBRSxHQUFHLElBQUksQ0FBQ25JLElBQUksQ0FBQy9MLE9BQU87TUFFNUJrSixLQUFLLEdBQUlBLEtBQUssSUFBSyxJQUFJLENBQUM2QyxJQUFJLENBQUNsTSxPQUFPLENBQUNxSixLQUFLO01BQzFDQyxNQUFNLEdBQUdBLE1BQU0sSUFBSSxJQUFJLENBQUM0QyxJQUFJLENBQUNsTSxPQUFPLENBQUNzSixNQUFNO01BRTNDRyxjQUFNLENBQUN1QyxDQUFDLElBQUksSUFBSSxDQUFDRSxJQUFJLENBQUM1TCxTQUFTO01BQy9CbUosY0FBTSxDQUFDd0MsQ0FBQyxJQUFJLElBQUksQ0FBQ0MsSUFBSSxDQUFDNUwsU0FBUztNQUUvQm1KLGNBQU0sQ0FBQ0osS0FBSyxHQUFJQSxLQUFLLEdBQUksSUFBSSxDQUFDNkMsSUFBSSxDQUFDNUwsU0FBUztNQUM1Q21KLGNBQU0sQ0FBQ0gsTUFBTSxHQUFHQSxNQUFNLEdBQUcsSUFBSSxDQUFDNEMsSUFBSSxDQUFDNUwsU0FBUztNQUU1QyxJQUFJLENBQUNrYyxVQUFVLENBQUMvUixNQUFNLENBQUNoQixjQUFNLENBQUNKLEtBQUssRUFBRUksY0FBTSxDQUFDSCxNQUFNLENBQUM7TUFFbkQrSyxFQUFFLENBQUNHLFdBQVcsQ0FBQ0gsRUFBRSxDQUFDSSxVQUFVLEVBQUUsSUFBSSxDQUFDdUgsU0FBUyxDQUFDO01BQzdDM0gsRUFBRSxDQUFDUSxVQUFVLENBQ1pSLEVBQUUsQ0FBQ0ksVUFBVSxFQUNYLENBQUMsRUFDREosRUFBRSxDQUFDUyxJQUFJLEVBQ1ByTCxjQUFNLENBQUNKLEtBQUssR0FBRyxJQUFJLENBQUM2QyxJQUFJLENBQUM1TCxTQUFTLEVBQ2xDbUosY0FBTSxDQUFDSCxNQUFNLEdBQUcsSUFBSSxDQUFDNEMsSUFBSSxDQUFDNUwsU0FBUyxFQUNuQyxDQUFDLEVBQ0QrVCxFQUFFLENBQUNTLElBQUksRUFDUFQsRUFBRSxDQUFDVSxhQUFhLEVBQ2hCLElBQ0gsQ0FBQztNQUVEVixFQUFFLENBQUNHLFdBQVcsQ0FBQ0gsRUFBRSxDQUFDSSxVQUFVLEVBQUUsSUFBSSxDQUFDd0gsV0FBVyxDQUFDO01BQy9DNUgsRUFBRSxDQUFDUSxVQUFVLENBQ1pSLEVBQUUsQ0FBQ0ksVUFBVSxFQUNYLENBQUMsRUFDREosRUFBRSxDQUFDUyxJQUFJLEVBQ1ByTCxjQUFNLENBQUNKLEtBQUssR0FBRyxJQUFJLENBQUM2QyxJQUFJLENBQUM1TCxTQUFTLEVBQ2xDbUosY0FBTSxDQUFDSCxNQUFNLEdBQUcsSUFBSSxDQUFDNEMsSUFBSSxDQUFDNUwsU0FBUyxFQUNuQyxDQUFDLEVBQ0QrVCxFQUFFLENBQUNTLElBQUksRUFDUFQsRUFBRSxDQUFDVSxhQUFhLEVBQ2hCLElBQ0gsQ0FBQztJQUNGO0VBQUM7SUFBQXhVLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUF5VixZQUFZQSxDQUFDakssQ0FBQyxFQUFFQyxDQUFDLEVBQUU1QyxLQUFLLEVBQUVDLE1BQU0sRUFDaEM7TUFDQyxJQUFNK0ssRUFBRSxHQUFHLElBQUksQ0FBQ25JLElBQUksQ0FBQy9MLE9BQU87TUFFNUJrVSxFQUFFLENBQUNrQixVQUFVLENBQUNsQixFQUFFLENBQUNtQixZQUFZLEVBQUUsSUFBSSxDQUFDdUIsY0FBYyxDQUFDO01BRW5ELElBQU1DLEVBQUUsR0FBR2hMLENBQUM7TUFDWixJQUFNa0wsRUFBRSxHQUFHbEwsQ0FBQyxHQUFHM0MsS0FBSztNQUNwQixJQUFNNE4sRUFBRSxHQUFHaEwsQ0FBQztNQUNaLElBQU1rTCxFQUFFLEdBQUdsTCxDQUFDLEdBQUczQyxNQUFNO01BRXJCK0ssRUFBRSxDQUFDcUIsVUFBVSxDQUFDckIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUlHLFlBQVksQ0FBQyxDQUMvQ3FCLEVBQUUsRUFBRUMsRUFBRSxFQUNOQyxFQUFFLEVBQUVELEVBQUUsRUFDTkQsRUFBRSxFQUFFRyxFQUFFLEVBQ05ILEVBQUUsRUFBRUcsRUFBRSxFQUNORCxFQUFFLEVBQUVELEVBQUUsRUFDTkMsRUFBRSxFQUFFQyxFQUFFLENBQ04sQ0FBQyxFQUFFOUMsRUFBRSxDQUFDdUQsV0FBVyxDQUFDO0lBQ3BCO0VBQUM7QUFBQTs7Ozs7Ozs7Ozs7Ozs7OztJQ3hhV3RQLFdBQVcsR0FBQTNJLE9BQUEsQ0FBQTJJLFdBQUE7RUFFdkIsU0FBQUEsWUFBQSxFQUNBO0lBQUEsSUFBQTNCLEtBQUE7SUFBQTlHLGVBQUEsT0FBQXlJLFdBQUE7SUFDQyxJQUFJLENBQUNpVixRQUFRLEdBQUcsa0JBQWtCO0lBQ2xDLElBQUksQ0FBQ0MsUUFBUSxHQUFHLG1CQUFtQjtJQUNuQyxJQUFJLENBQUNDLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDbEIsSUFBSSxDQUFDak4sTUFBTSxHQUFLLENBQUMsQ0FBQztJQUNsQixJQUFJLENBQUNuSCxLQUFLLEdBQU0sQ0FBQztJQUNqQixJQUFJLENBQUNDLE1BQU0sR0FBSyxDQUFDO0lBRWpCLElBQUlvVSxPQUFPLEdBQUssSUFBSUMsT0FBTyxDQUFDLElBQUksQ0FBQ0gsUUFBUSxDQUFDO0lBRTFDLElBQUlJLFdBQVcsR0FBR0MsS0FBSyxDQUFDSCxPQUFPLENBQUMsQ0FDL0J6SSxJQUFJLENBQUMsVUFBQzZJLFFBQVE7TUFBQSxPQUFHQSxRQUFRLENBQUNDLElBQUksQ0FBQyxDQUFDO0lBQUEsRUFBQyxDQUNqQzlJLElBQUksQ0FBQyxVQUFDK0ksS0FBSztNQUFBLE9BQUtyWCxLQUFJLENBQUNxWCxLQUFLLEdBQUdBLEtBQUs7SUFBQSxFQUFDO0lBRXBDLElBQUlDLFdBQVcsR0FBRyxJQUFJckgsT0FBTyxDQUFDLFVBQUNrRCxNQUFNLEVBQUc7TUFDdkNuVCxLQUFJLENBQUMyTyxLQUFLLEdBQVUsSUFBSTBFLEtBQUssQ0FBQyxDQUFDO01BQy9CclQsS0FBSSxDQUFDMk8sS0FBSyxDQUFDbk0sR0FBRyxHQUFNeEMsS0FBSSxDQUFDNFcsUUFBUTtNQUNqQzVXLEtBQUksQ0FBQzJPLEtBQUssQ0FBQzRJLE1BQU0sR0FBRyxZQUFJO1FBQ3ZCcEUsTUFBTSxDQUFDLENBQUM7TUFDVCxDQUFDO0lBQ0YsQ0FBQyxDQUFDO0lBRUYsSUFBSSxDQUFDOUUsS0FBSyxHQUFHNEIsT0FBTyxDQUFDQyxHQUFHLENBQUMsQ0FBQytHLFdBQVcsRUFBRUssV0FBVyxDQUFDLENBQUMsQ0FDbkRoSixJQUFJLENBQUM7TUFBQSxPQUFNdE8sS0FBSSxDQUFDd1gsWUFBWSxDQUFDLENBQUM7SUFBQSxFQUFDLENBQy9CbEosSUFBSSxDQUFDO01BQUEsT0FBTXRPLEtBQUk7SUFBQSxFQUFDO0VBQ2xCO0VBQUMsT0FBQS9HLFlBQUEsQ0FBQTBJLFdBQUE7SUFBQS9ILEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUEyZCxZQUFZQSxDQUFBLEVBQ1o7TUFBQSxJQUFBeFYsTUFBQTtNQUNDLElBQUcsQ0FBQyxJQUFJLENBQUNxVixLQUFLLElBQUksQ0FBQyxJQUFJLENBQUNBLEtBQUssQ0FBQ3hOLE1BQU0sRUFDcEM7UUFDQztNQUNEO01BRUEsSUFBTTFILE1BQU0sR0FBSTdJLFFBQVEsQ0FBQ0MsYUFBYSxDQUFDLFFBQVEsQ0FBQztNQUVoRDRJLE1BQU0sQ0FBQ08sS0FBSyxHQUFJLElBQUksQ0FBQ2lNLEtBQUssQ0FBQ2pNLEtBQUs7TUFDaENQLE1BQU0sQ0FBQ1EsTUFBTSxHQUFHLElBQUksQ0FBQ2dNLEtBQUssQ0FBQ2hNLE1BQU07TUFFakMsSUFBTW5KLE9BQU8sR0FBRzJJLE1BQU0sQ0FBQzFJLFVBQVUsQ0FBQyxJQUFJLEVBQUU7UUFBQ2dlLGtCQUFrQixFQUFFO01BQUksQ0FBQyxDQUFDO01BRW5FamUsT0FBTyxDQUFDa2UsU0FBUyxDQUFDLElBQUksQ0FBQy9JLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO01BRW5DLElBQU1nSixhQUFhLEdBQUcsRUFBRTtNQUFDLElBQUFDLEtBQUEsWUFBQUEsTUFBQWhhLENBQUEsRUFHekI7UUFDQyxJQUFNaWEsU0FBUyxHQUFJdmUsUUFBUSxDQUFDQyxhQUFhLENBQUMsUUFBUSxDQUFDO1FBRW5Ec2UsU0FBUyxDQUFDblYsS0FBSyxHQUFJVixNQUFJLENBQUNxVixLQUFLLENBQUN4TixNQUFNLENBQUNqTSxDQUFDLENBQUMsQ0FBQzRRLEtBQUssQ0FBQ3NILENBQUM7UUFDL0MrQixTQUFTLENBQUNsVixNQUFNLEdBQUdYLE1BQUksQ0FBQ3FWLEtBQUssQ0FBQ3hOLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDNFEsS0FBSyxDQUFDc0osQ0FBQztRQUUvQyxJQUFNQyxVQUFVLEdBQUdGLFNBQVMsQ0FBQ3BlLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFFN0MsSUFBR3VJLE1BQUksQ0FBQ3FWLEtBQUssQ0FBQ3hOLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDNFEsS0FBSyxFQUM3QjtVQUNDdUosVUFBVSxDQUFDQyxZQUFZLENBQUN4ZSxPQUFPLENBQUN5ZSxZQUFZLENBQzNDalcsTUFBSSxDQUFDcVYsS0FBSyxDQUFDeE4sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0USxLQUFLLENBQUNuSixDQUFDLEVBQzFCckQsTUFBSSxDQUFDcVYsS0FBSyxDQUFDeE4sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0USxLQUFLLENBQUNsSixDQUFDLEVBQzVCdEQsTUFBSSxDQUFDcVYsS0FBSyxDQUFDeE4sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0USxLQUFLLENBQUNzSCxDQUFDLEVBQzVCOVQsTUFBSSxDQUFDcVYsS0FBSyxDQUFDeE4sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0USxLQUFLLENBQUNzSixDQUM5QixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNUO1FBRUEsSUFBRzlWLE1BQUksQ0FBQ3FWLEtBQUssQ0FBQ3hOLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDc2EsSUFBSSxFQUM1QjtVQUNDSCxVQUFVLENBQUNJLFNBQVMsR0FBR25XLE1BQUksQ0FBQ3FWLEtBQUssQ0FBQ3hOLE1BQU0sQ0FBQ2pNLENBQUMsQ0FBQyxDQUFDd2EsS0FBSyxJQUFJLE9BQU87VUFFNURMLFVBQVUsQ0FBQ00sSUFBSSxHQUFHclcsTUFBSSxDQUFDcVYsS0FBSyxDQUFDeE4sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUN5YSxJQUFJLE9BQUF6UyxNQUFBLENBQ3BDNUQsTUFBSSxDQUFDcVYsS0FBSyxDQUFDeE4sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0USxLQUFLLENBQUNzSixDQUFDLGtCQUFlO1VBQ2xEQyxVQUFVLENBQUNPLFNBQVMsR0FBRyxRQUFRO1VBRS9CUCxVQUFVLENBQUNRLFFBQVEsQ0FDbEJ2VyxNQUFJLENBQUNxVixLQUFLLENBQUN4TixNQUFNLENBQUNqTSxDQUFDLENBQUMsQ0FBQ3NhLElBQUksRUFDdkJsVyxNQUFJLENBQUNxVixLQUFLLENBQUN4TixNQUFNLENBQUNqTSxDQUFDLENBQUMsQ0FBQzRRLEtBQUssQ0FBQ3NILENBQUMsR0FBRyxDQUFDLEVBQ2hDOVQsTUFBSSxDQUFDcVYsS0FBSyxDQUFDeE4sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0USxLQUFLLENBQUNzSixDQUFDLEVBQzVCOVYsTUFBSSxDQUFDcVYsS0FBSyxDQUFDeE4sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM0USxLQUFLLENBQUNzSCxDQUM5QixDQUFDO1VBRURpQyxVQUFVLENBQUNPLFNBQVMsR0FBRyxJQUFJO1VBQzNCUCxVQUFVLENBQUNNLElBQUksR0FBUSxJQUFJO1FBQzVCO1FBRUFWLGFBQWEsQ0FBQzNTLElBQUksQ0FBQyxJQUFJaUwsT0FBTyxDQUFDLFVBQUNrRCxNQUFNLEVBQUc7VUFDeEMwRSxTQUFTLENBQUNXLE1BQU0sQ0FBQyxVQUFDQyxJQUFJLEVBQUc7WUFDeEJ6VyxNQUFJLENBQUM2SCxNQUFNLENBQUM3SCxNQUFJLENBQUNxVixLQUFLLENBQUN4TixNQUFNLENBQUNqTSxDQUFDLENBQUMsQ0FBQzhhLFFBQVEsQ0FBQyxHQUFHQyxHQUFHLENBQUNDLGVBQWUsQ0FBQ0gsSUFBSSxDQUFDO1lBRXRFdEYsTUFBTSxDQUFDblIsTUFBSSxDQUFDNkgsTUFBTSxDQUFDN0gsTUFBSSxDQUFDcVYsS0FBSyxDQUFDeE4sTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM4YSxRQUFRLENBQUMsQ0FBQztVQUNuRCxDQUFDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQzs7UUFHSDtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7TUFDRCxDQUFDO01BM0RELEtBQUksSUFBSTlhLENBQUMsSUFBSSxJQUFJLENBQUN5WixLQUFLLENBQUN4TixNQUFNO1FBQUErTixLQUFBLENBQUFoYSxDQUFBO01BQUE7TUE2RDlCLE9BQU9xUyxPQUFPLENBQUNDLEdBQUcsQ0FBQ3lILGFBQWEsQ0FBQztJQUNsQztFQUFDO0lBQUEvZCxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBZ2YsV0FBV0EsQ0FBQ0gsUUFBUSxFQUNwQjtNQUNDLE9BQU8sSUFBSSxDQUFDNUIsUUFBUSxDQUFDNEIsUUFBUSxDQUFDO0lBQy9CO0VBQUM7SUFBQTllLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUE0VSxRQUFRQSxDQUFDaUssUUFBUSxFQUNqQjtNQUNDLE9BQU8sSUFBSSxDQUFDN08sTUFBTSxDQUFDNk8sUUFBUSxDQUFDO0lBQzdCO0VBQUM7SUFBQTllLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFtVyxTQUFTQSxDQUFDSCxhQUFhLEVBQ3ZCO01BQUEsSUFBQWlKLE1BQUE7TUFDQyxJQUFHeE4sS0FBSyxDQUFDQyxPQUFPLENBQUNzRSxhQUFhLENBQUMsRUFDL0I7UUFDQyxPQUFPQSxhQUFhLENBQUN0TyxHQUFHLENBQUMsVUFBQ3NHLElBQUk7VUFBQSxPQUFHaVIsTUFBSSxDQUFDckssUUFBUSxDQUFDNUcsSUFBSSxDQUFDO1FBQUEsRUFBQztNQUN0RDtNQUVBLE9BQU8sSUFBSSxDQUFDa1IsaUJBQWlCLENBQUNsSixhQUFhLENBQUM7SUFDN0M7RUFBQztJQUFBalcsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWtmLGlCQUFpQkEsQ0FBQ0MsTUFBTSxFQUN4QjtNQUNDLElBQUluUCxNQUFNLEdBQUcsRUFBRTtNQUVmLEtBQUksSUFBSWpNLENBQUMsSUFBSSxJQUFJLENBQUNpTSxNQUFNLEVBQ3hCO1FBQ0MsSUFBR2pNLENBQUMsQ0FBQ3hELFNBQVMsQ0FBQyxDQUFDLEVBQUU0ZSxNQUFNLENBQUM3YixNQUFNLENBQUMsS0FBSzZiLE1BQU0sRUFDM0M7VUFDQztRQUNEO1FBRUFuUCxNQUFNLENBQUM3RSxJQUFJLENBQUMsSUFBSSxDQUFDNkUsTUFBTSxDQUFDak0sQ0FBQyxDQUFDLENBQUM7TUFDNUI7TUFFQSxPQUFPaU0sTUFBTTtJQUNkO0VBQUM7SUFBQWpRLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQU82VSxXQUFXQSxDQUFDbkosSUFBSSxFQUFFa04sUUFBUSxFQUNqQztNQUNDLElBQU0vRSxFQUFFLEdBQUduSSxJQUFJLENBQUMvTCxPQUFPO01BRXZCLElBQUcsQ0FBQyxJQUFJLENBQUN5ZixlQUFlLEVBQ3hCO1FBQ0MsSUFBSSxDQUFDQSxlQUFlLEdBQUcsQ0FBQyxDQUFDO01BQzFCO01BRUEsSUFBRyxJQUFJLENBQUNBLGVBQWUsQ0FBQ3hHLFFBQVEsQ0FBQyxFQUNqQztRQUNDLE9BQU8sSUFBSSxDQUFDd0csZUFBZSxDQUFDeEcsUUFBUSxDQUFDO01BQ3RDO01BRUEsSUFBTTlFLE9BQU8sR0FBR0QsRUFBRSxDQUFDRSxhQUFhLENBQUMsQ0FBQztNQUVsQyxPQUFPLElBQUksQ0FBQ3FMLGVBQWUsQ0FBQ3hHLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQ0UsU0FBUyxDQUFDRixRQUFRLENBQUMsQ0FBQ25FLElBQUksQ0FBQyxVQUFBSyxLQUFLLEVBQUk7UUFDOUVqQixFQUFFLENBQUNHLFdBQVcsQ0FBQ0gsRUFBRSxDQUFDSSxVQUFVLEVBQUVILE9BQU8sQ0FBQztRQUV0Q0QsRUFBRSxDQUFDUSxVQUFVLENBQ1pSLEVBQUUsQ0FBQ0ksVUFBVSxFQUNYLENBQUMsRUFDREosRUFBRSxDQUFDUyxJQUFJLEVBQ1BULEVBQUUsQ0FBQ1MsSUFBSSxFQUNQVCxFQUFFLENBQUNVLGFBQWEsRUFDaEJPLEtBQ0gsQ0FBQzs7UUFFRDtBQUNIO0FBQ0E7QUFDQTtRQUNHakIsRUFBRSxDQUFDa0YsYUFBYSxDQUFDbEYsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQ21GLGNBQWMsRUFBRW5GLEVBQUUsQ0FBQ3dMLE1BQU0sQ0FBQztRQUM3RHhMLEVBQUUsQ0FBQ2tGLGFBQWEsQ0FBQ2xGLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUNxRixjQUFjLEVBQUVyRixFQUFFLENBQUN3TCxNQUFNLENBQUM7UUFDN0Q7O1FBRUF4TCxFQUFFLENBQUNrRixhQUFhLENBQUNsRixFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDc0Ysa0JBQWtCLEVBQUV0RixFQUFFLENBQUN1RixPQUFPLENBQUM7UUFDbEV2RixFQUFFLENBQUNrRixhQUFhLENBQUNsRixFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDd0Ysa0JBQWtCLEVBQUV4RixFQUFFLENBQUN1RixPQUFPLENBQUM7UUFFbEUsT0FBTztVQUFDdEUsS0FBSyxFQUFMQSxLQUFLO1VBQUVoQixPQUFPLEVBQVBBO1FBQU8sQ0FBQztNQUN4QixDQUFDLENBQUM7SUFDSDtFQUFDO0lBQUEvVCxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFPOFksU0FBU0EsQ0FBQ25RLEdBQUcsRUFDcEI7TUFDQyxJQUFHLENBQUMsSUFBSSxDQUFDMlcsYUFBYSxFQUN0QjtRQUNDLElBQUksQ0FBQ0EsYUFBYSxHQUFHLENBQUMsQ0FBQztNQUN4QjtNQUVBLElBQUcsSUFBSSxDQUFDQSxhQUFhLENBQUMzVyxHQUFHLENBQUMsRUFDMUI7UUFDQyxPQUFPLElBQUksQ0FBQzJXLGFBQWEsQ0FBQzNXLEdBQUcsQ0FBQztNQUMvQjtNQUVBLElBQUksQ0FBQzJXLGFBQWEsQ0FBQzNXLEdBQUcsQ0FBQyxHQUFHLElBQUl5TixPQUFPLENBQUMsVUFBQ2tELE1BQU0sRUFBRUMsTUFBTSxFQUFHO1FBQ3ZELElBQU16RSxLQUFLLEdBQUcsSUFBSTBFLEtBQUssQ0FBQyxDQUFDO1FBQ3pCMUUsS0FBSyxDQUFDbk0sR0FBRyxHQUFLQSxHQUFHO1FBQ2pCbU0sS0FBSyxDQUFDeEssZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFVBQUNvQyxLQUFLLEVBQUc7VUFDdkM0TSxNQUFNLENBQUN4RSxLQUFLLENBQUM7UUFDZCxDQUFDLENBQUM7TUFDSCxDQUFDLENBQUM7TUFFRixPQUFPLElBQUksQ0FBQ3dLLGFBQWEsQ0FBQzNXLEdBQUcsQ0FBQztJQUMvQjtFQUFDO0FBQUE7Ozs7Ozs7Ozs7QUNyTkYsSUFBQStGLFNBQUEsR0FBQTNOLE9BQUE7QUFDQSxJQUFBNkIsT0FBQSxHQUFBN0IsT0FBQTtBQUFrQyxTQUFBa0QsUUFBQVYsQ0FBQSxzQ0FBQVUsT0FBQSx3QkFBQUMsTUFBQSx1QkFBQUEsTUFBQSxDQUFBeUssUUFBQSxhQUFBcEwsQ0FBQSxrQkFBQUEsQ0FBQSxnQkFBQUEsQ0FBQSxXQUFBQSxDQUFBLHlCQUFBVyxNQUFBLElBQUFYLENBQUEsQ0FBQXNCLFdBQUEsS0FBQVgsTUFBQSxJQUFBWCxDQUFBLEtBQUFXLE1BQUEsQ0FBQUosU0FBQSxxQkFBQVAsQ0FBQSxLQUFBVSxPQUFBLENBQUFWLENBQUE7QUFBQSxTQUFBbEUsZ0JBQUEwRCxDQUFBLEVBQUFDLENBQUEsVUFBQUQsQ0FBQSxZQUFBQyxDQUFBLGFBQUFDLFNBQUE7QUFBQSxTQUFBQyxrQkFBQUMsQ0FBQSxFQUFBQyxDQUFBLGFBQUFDLENBQUEsTUFBQUEsQ0FBQSxHQUFBRCxDQUFBLENBQUFFLE1BQUEsRUFBQUQsQ0FBQSxVQUFBRSxDQUFBLEdBQUFILENBQUEsQ0FBQUMsQ0FBQSxHQUFBRSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQVUsY0FBQSxDQUFBTixDQUFBLENBQUF4RCxHQUFBLEdBQUF3RCxDQUFBO0FBQUEsU0FBQW5FLGFBQUErRCxDQUFBLEVBQUFDLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFGLGlCQUFBLENBQUFDLENBQUEsQ0FBQVcsU0FBQSxFQUFBVixDQUFBLEdBQUFDLENBQUEsSUFBQUgsaUJBQUEsQ0FBQUMsQ0FBQSxFQUFBRSxDQUFBLEdBQUFNLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLGlCQUFBTyxRQUFBLFNBQUFQLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLElBRXJCNk4sT0FBTyxHQUFBL1IsT0FBQSxDQUFBK1IsT0FBQTtFQUVuQixTQUFBQSxRQUFZdkosV0FBVyxFQUFFRSxXQUFXLEVBQUVILEdBQUcsRUFDekM7SUFBQSxJQUFBdkIsS0FBQTtJQUFBLElBRDJDb1osS0FBSyxHQUFBOVIsU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLENBQUM7SUFBQSxJQUFFK1IsS0FBSyxHQUFBL1IsU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLENBQUM7SUFBQSxJQUFFZ1MsT0FBTyxHQUFBaFMsU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLENBQUM7SUFBQSxJQUFFaVMsT0FBTyxHQUFBalMsU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLENBQUM7SUFBQSxJQUFFNEMsS0FBSyxHQUFBNUMsU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLENBQUM7SUFBQSxJQUFFbUYsQ0FBQyxHQUFBbkYsU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLENBQUMsQ0FBQztJQUFBcE8sZUFBQSxPQUFBNlIsT0FBQTtJQUUzRyxJQUFJLENBQUNyQyxrQkFBUSxDQUFDOEQsT0FBTyxDQUFDLEdBQUcsSUFBSTtJQUU3QixJQUFJLENBQUNoTCxXQUFXLEdBQUdBLFdBQVc7SUFDOUIsSUFBSSxDQUFDRSxXQUFXLEdBQUdBLFdBQVc7SUFFOUIsSUFBSSxDQUFDMkQsQ0FBQyxHQUFHaVUsT0FBTztJQUNoQixJQUFJLENBQUNoVSxDQUFDLEdBQUdpVSxPQUFPO0lBQ2hCLElBQUksQ0FBQzlNLENBQUMsR0FBR0EsQ0FBQztJQUVWLElBQUksQ0FBQ3ZDLEtBQUssR0FBR0EsS0FBSztJQUNsQixJQUFJLENBQUNrUCxLQUFLLEdBQUdBLEtBQUs7SUFDbEIsSUFBSSxDQUFDQyxLQUFLLEdBQUdBLEtBQUs7SUFFbEIsSUFBSSxDQUFDL08sU0FBUyxHQUFJLEVBQUU7SUFDcEIsSUFBSSxDQUFDQyxVQUFVLEdBQUcsRUFBRTtJQUVwQixJQUFJLENBQUM3SCxLQUFLLEdBQUksSUFBSSxDQUFDMFcsS0FBSyxHQUFHLElBQUksQ0FBQzlPLFNBQVM7SUFDekMsSUFBSSxDQUFDM0gsTUFBTSxHQUFHLElBQUksQ0FBQzBXLEtBQUssR0FBRyxJQUFJLENBQUM5TyxVQUFVO0lBRTFDLElBQUksQ0FBQ2hKLEdBQUcsR0FBR0EsR0FBRztJQUVkLElBQUksQ0FBQ2lZLFdBQVcsR0FBRyxFQUFFO0lBR3JCLElBQUksQ0FBQ0MsV0FBVyxHQUFHLENBQUMsQ0FBQztJQUVyQixJQUFJLENBQUMvWCxXQUFXLENBQUMyTSxLQUFLLENBQUNDLElBQUksQ0FBQyxVQUFBQyxLQUFLO01BQUEsT0FBSXZPLEtBQUksQ0FBQzBaLFVBQVUsQ0FBQyxDQUFDO0lBQUEsRUFBQztJQUV2RCxJQUFNaE0sRUFBRSxHQUFHLElBQUksQ0FBQ2xNLFdBQVcsQ0FBQytELElBQUksQ0FBQy9MLE9BQU87SUFFeEMsSUFBSSxDQUFDb1IsSUFBSSxHQUFHOEMsRUFBRSxDQUFDRSxhQUFhLENBQUMsQ0FBQztJQUU5QkYsRUFBRSxDQUFDRyxXQUFXLENBQUNILEVBQUUsQ0FBQ0ksVUFBVSxFQUFFLElBQUksQ0FBQ2xELElBQUksQ0FBQztJQUV4QyxJQUFNM04sQ0FBQyxHQUFHLFNBQUpBLENBQUNBLENBQUE7TUFBQSxPQUFTOFEsUUFBUSxDQUFDN0gsSUFBSSxDQUFDbUMsTUFBTSxDQUFDLENBQUMsR0FBQyxHQUFHLENBQUM7SUFBQTtJQUMzQyxJQUFNMkYsS0FBSyxHQUFHLElBQUlDLFVBQVUsQ0FBQyxDQUFDaFIsQ0FBQyxDQUFDLENBQUMsRUFBRUEsQ0FBQyxDQUFDLENBQUMsRUFBRUEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNsRHlRLEVBQUUsQ0FBQ1EsVUFBVSxDQUNaUixFQUFFLENBQUNJLFVBQVUsRUFDWCxDQUFDLEVBQ0RKLEVBQUUsQ0FBQ1MsSUFBSSxFQUNQLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNEVCxFQUFFLENBQUNTLElBQUksRUFDUFQsRUFBRSxDQUFDVSxhQUFhLEVBQ2hCSixLQUNILENBQUM7SUFFRE4sRUFBRSxDQUFDa0YsYUFBYSxDQUFDbEYsRUFBRSxDQUFDSSxVQUFVLEVBQUVKLEVBQUUsQ0FBQ21GLGNBQWMsRUFBRW5GLEVBQUUsQ0FBQ29GLGFBQWEsQ0FBQztJQUNwRXBGLEVBQUUsQ0FBQ2tGLGFBQWEsQ0FBQ2xGLEVBQUUsQ0FBQ0ksVUFBVSxFQUFFSixFQUFFLENBQUNxRixjQUFjLEVBQUVyRixFQUFFLENBQUNvRixhQUFhLENBQUM7O0lBRXBFO0lBQ0FwRixFQUFFLENBQUNrRixhQUFhLENBQUNsRixFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDc0Ysa0JBQWtCLEVBQUV0RixFQUFFLENBQUN1RixPQUFPLENBQUM7SUFDbEV2RixFQUFFLENBQUNrRixhQUFhLENBQUNsRixFQUFFLENBQUNJLFVBQVUsRUFBRUosRUFBRSxDQUFDd0Ysa0JBQWtCLEVBQUV4RixFQUFFLENBQUN1RixPQUFPLENBQUM7SUFDbEU7QUFDRjtBQUNBO0FBQ0E7O0lBRUUsSUFBSSxDQUFDMEcsV0FBVyxHQUFHak0sRUFBRSxDQUFDNkgsaUJBQWlCLENBQUMsQ0FBQztJQUN6QzdILEVBQUUsQ0FBQzZCLGVBQWUsQ0FBQzdCLEVBQUUsQ0FBQzhCLFdBQVcsRUFBRSxJQUFJLENBQUNtSyxXQUFXLENBQUM7SUFDcERqTSxFQUFFLENBQUM4SCxvQkFBb0IsQ0FDdEI5SCxFQUFFLENBQUM4QixXQUFXLEVBQ1o5QixFQUFFLENBQUMrSCxpQkFBaUIsRUFDcEIvSCxFQUFFLENBQUNJLFVBQVUsRUFDYixJQUFJLENBQUNsRCxJQUFJLEVBQ1QsQ0FDSCxDQUFDO0VBQ0Y7RUFBQyxPQUFBM1IsWUFBQSxDQUFBOFIsT0FBQTtJQUFBblIsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXNMLElBQUlBLENBQUEsRUFDSjtNQUNDLElBQU11SSxFQUFFLEdBQUcsSUFBSSxDQUFDbE0sV0FBVyxDQUFDK0QsSUFBSSxDQUFDL0wsT0FBTztNQUV4Q2tVLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUNsRCxJQUFJLENBQUM7TUFFeEMsSUFBTXZGLENBQUMsR0FBRyxJQUFJLENBQUNBLENBQUMsR0FBRyxDQUFDdkMsY0FBTSxDQUFDdUMsQ0FBQyxHQUFJdkMsY0FBTSxDQUFDSixLQUFLLEdBQUksSUFBSSxDQUFDbEIsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxHQUFHLENBQUU7TUFDcEYsSUFBTTJMLENBQUMsR0FBRyxJQUFJLENBQUNBLENBQUMsR0FBRyxDQUFDeEMsY0FBTSxDQUFDd0MsQ0FBQyxHQUFJeEMsY0FBTSxDQUFDSCxNQUFNLEdBQUksSUFBSSxDQUFDbkIsV0FBVyxDQUFDK0QsSUFBSSxDQUFDNUwsU0FBUyxHQUFHLENBQUU7TUFFckYsSUFBSSxDQUFDMlYsWUFBWSxDQUNoQmpLLENBQUMsRUFDQ0MsQ0FBQyxFQUNELElBQUksQ0FBQzVDLEtBQUssR0FBRyxJQUFJLENBQUNsQixXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUFTLEVBQzVDLElBQUksQ0FBQ2dKLE1BQU0sR0FBRyxJQUFJLENBQUNuQixXQUFXLENBQUMrRCxJQUFJLENBQUM1TCxTQUN2QyxDQUFDO01BRUQrVCxFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDaE8sV0FBVyxDQUFDaU8sVUFBVSxDQUFDO01BQy9EL0IsRUFBRSxDQUFDZ0MsVUFBVSxDQUFDaEMsRUFBRSxDQUFDaUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbEM7RUFBQztJQUFBL1YsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQTZmLFVBQVVBLENBQUEsRUFDVjtNQUFBLElBQUExWCxNQUFBO01BQ0MsSUFBSWlYLGVBQWUsR0FBRyxFQUFFO01BQ3hCLElBQU1XLElBQUksR0FBRyxJQUFJLENBQUNSLEtBQUssR0FBRyxJQUFJLENBQUNDLEtBQUs7TUFBQyxJQUFBekIsS0FBQSxZQUFBQSxNQUFBaGEsQ0FBQSxFQUdyQztRQUNDLElBQUlvRyxNQUFNLEdBQUlwRyxDQUFDLEdBQUdvRSxNQUFJLENBQUNvWCxLQUFLO1FBQzVCLElBQUlTLE9BQU8sR0FBRzNULElBQUksQ0FBQ3dELEtBQUssQ0FBQzFILE1BQUksQ0FBQ3FELENBQUMsR0FBR3JELE1BQUksQ0FBQ3NJLFNBQVMsQ0FBQztRQUNqRCxJQUFJbEgsT0FBTyxHQUFHWSxNQUFNLEdBQUc2VixPQUFPO1FBRTlCLElBQUlqRSxNQUFNLEdBQUkxUCxJQUFJLENBQUN3RCxLQUFLLENBQUM5TCxDQUFDLEdBQUdvRSxNQUFJLENBQUNvWCxLQUFLLENBQUM7UUFDeEMsSUFBSVUsT0FBTyxHQUFHNVQsSUFBSSxDQUFDd0QsS0FBSyxDQUFDMUgsTUFBSSxDQUFDc0QsQ0FBQyxHQUFHdEQsTUFBSSxDQUFDdUksVUFBVSxDQUFDO1FBQ2xELElBQUk1RyxPQUFPLEdBQUdpUyxNQUFNLEdBQUdrRSxPQUFPO1FBRTlCLElBQUlqUSxNQUFNLEdBQUc3SCxNQUFJLENBQUNULEdBQUcsQ0FBQ3dZLE9BQU8sQ0FBQzNXLE9BQU8sRUFBRU8sT0FBTyxFQUFFM0IsTUFBSSxDQUFDa0ksS0FBSyxDQUFDO1FBRTNELElBQU13RSxXQUFXLEdBQUcsU0FBZEEsV0FBV0EsQ0FBR0YsS0FBSztVQUFBLE9BQUl4TSxNQUFJLENBQUNOLFdBQVcsQ0FBQ2hELFdBQVcsQ0FBQ2dRLFdBQVcsQ0FBQzFNLE1BQUksQ0FBQ1IsV0FBVyxDQUFDK0QsSUFBSSxFQUFFaUosS0FBSyxDQUFDO1FBQUE7UUFFbkcsSUFBR2xELEtBQUssQ0FBQ0MsT0FBTyxDQUFDMUIsTUFBTSxDQUFDLEVBQ3hCO1VBQ0MsSUFBSXJHLENBQUMsR0FBRyxDQUFDO1VBQ1R4QixNQUFJLENBQUN5WCxXQUFXLENBQUM3YixDQUFDLENBQUMsR0FBRyxFQUFFO1VBQ3hCcWIsZUFBZSxDQUFDalUsSUFBSSxDQUNuQmlMLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDckcsTUFBTSxDQUFDdEksR0FBRyxDQUFDLFVBQUNpTixLQUFLO1lBQUEsT0FDNUJFLFdBQVcsQ0FBQ0YsS0FBSyxDQUFDLENBQUNGLElBQUksQ0FDdEIsVUFBQXZPLElBQUksRUFBSTtjQUNQaUMsTUFBSSxDQUFDeVgsV0FBVyxDQUFDN2IsQ0FBQyxDQUFDLENBQUM0RixDQUFDLENBQUMsR0FBR3pELElBQUksQ0FBQzROLE9BQU87Y0FDckNuSyxDQUFDLEVBQUU7WUFDSixDQUNELENBQUM7VUFBQSxDQUNGLENBQ0QsQ0FBQyxDQUFDO1FBQ0gsQ0FBQyxNQUVEO1VBQ0N5VixlQUFlLENBQUNqVSxJQUFJLENBQ25CMEosV0FBVyxDQUFDN0UsTUFBTSxDQUFDLENBQUN5RSxJQUFJLENBQUMsVUFBQXZPLElBQUk7WUFBQSxPQUFJaUMsTUFBSSxDQUFDeVgsV0FBVyxDQUFDN2IsQ0FBQyxDQUFDLEdBQUdtQyxJQUFJLENBQUM0TixPQUFPO1VBQUEsRUFDcEUsQ0FBQztRQUNGO01BQ0QsQ0FBQztNQW5DRCxLQUFJLElBQUkvUCxDQUFDLEdBQUcsQ0FBQyxFQUFFQSxDQUFDLEdBQUdnYyxJQUFJLEVBQUVoYyxDQUFDLEVBQUU7UUFBQWdhLEtBQUEsQ0FBQWhhLENBQUE7TUFBQTtNQXFDNUJxUyxPQUFPLENBQUNDLEdBQUcsQ0FBQytJLGVBQWUsQ0FBQyxDQUFDM0ssSUFBSSxDQUFDO1FBQUEsT0FBTXRNLE1BQUksQ0FBQ2dZLFFBQVEsQ0FBQyxDQUFDO01BQUEsRUFBQztJQUN6RDtFQUFDO0lBQUFwZ0IsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQW1nQixRQUFRQSxDQUFBLEVBQ1I7TUFDQyxJQUFNdE0sRUFBRSxHQUFHLElBQUksQ0FBQ2xNLFdBQVcsQ0FBQytELElBQUksQ0FBQy9MLE9BQU87TUFFeENrVSxFQUFFLENBQUNHLFdBQVcsQ0FBQ0gsRUFBRSxDQUFDSSxVQUFVLEVBQUUsSUFBSSxDQUFDbEQsSUFBSSxDQUFDO01BRXhDOEMsRUFBRSxDQUFDUSxVQUFVLENBQ1pSLEVBQUUsQ0FBQ0ksVUFBVSxFQUNiLENBQUMsRUFDREosRUFBRSxDQUFDUyxJQUFJLEVBQ1AsSUFBSSxDQUFDekwsS0FBSyxFQUNWLElBQUksQ0FBQ0MsTUFBTSxFQUNYLENBQUMsRUFDRCtLLEVBQUUsQ0FBQ1MsSUFBSSxFQUNQVCxFQUFFLENBQUNVLGFBQWEsRUFDaEIsSUFDRCxDQUFDO01BRURWLEVBQUUsQ0FBQ0csV0FBVyxDQUFDSCxFQUFFLENBQUNJLFVBQVUsRUFBRSxJQUFJLENBQUMyTCxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDckQvTCxFQUFFLENBQUM2QixlQUFlLENBQUM3QixFQUFFLENBQUM4QixXQUFXLEVBQUUsSUFBSSxDQUFDbUssV0FBVyxDQUFDO01BQ3BEak0sRUFBRSxDQUFDeUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDelQsS0FBSyxFQUFFLElBQUksQ0FBQ0MsTUFBTSxDQUFDO01BQzFDO01BQ0ErSyxFQUFFLENBQUNzSSxVQUFVLENBQUM5UCxJQUFJLENBQUNtQyxNQUFNLENBQUMsQ0FBQyxFQUFFbkMsSUFBSSxDQUFDbUMsTUFBTSxDQUFDLENBQUMsRUFBRW5DLElBQUksQ0FBQ21DLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO01BQzdEcUYsRUFBRSxDQUFDdUksS0FBSyxDQUFDdkksRUFBRSxDQUFDd0ksZ0JBQWdCLEdBQUd4SSxFQUFFLENBQUN1TSxnQkFBZ0IsQ0FBQztNQUVuRHZNLEVBQUUsQ0FBQ3dCLFNBQVMsQ0FDWCxJQUFJLENBQUMxTixXQUFXLENBQUNtVCxhQUFhLEVBQzVCLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FBQyxFQUNELENBQ0gsQ0FBQztNQUVEakgsRUFBRSxDQUFDMEksU0FBUyxDQUNYLElBQUksQ0FBQzVVLFdBQVcsQ0FBQ29ULGVBQWUsRUFDOUIsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUNILENBQUM7TUFFRGxILEVBQUUsQ0FBQzBCLFNBQVMsQ0FDWCxJQUFJLENBQUM1TixXQUFXLENBQUNrVCxrQkFBa0IsRUFDakMsSUFBSSxDQUFDaFMsS0FBSyxFQUNWLElBQUksQ0FBQ0MsTUFDUixDQUFDO01BRUQrSyxFQUFFLENBQUMwQixTQUFTLENBQ1gsSUFBSSxDQUFDNU4sV0FBVyxDQUFDNk4sWUFBWSxFQUMzQixJQUFJLENBQUMzTSxLQUFLLEVBQ1YsSUFBSSxDQUFDQyxNQUNSLENBQUM7TUFFRCtLLEVBQUUsQ0FBQzBJLFNBQVMsQ0FDWCxJQUFJLENBQUM1VSxXQUFXLENBQUNxVCxjQUFjLEVBQzdCLENBQUMsRUFDRCxDQUFDLEVBQ0QsQ0FDSCxDQUFDO01BRUQsSUFBRyxJQUFJLENBQUM0RSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3pCO1FBQ0MvTCxFQUFFLENBQUNHLFdBQVcsQ0FBQ0gsRUFBRSxDQUFDSSxVQUFVLEVBQUUsSUFBSSxDQUFDMkwsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JEL0wsRUFBRSxDQUFDa0IsVUFBVSxDQUFDbEIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUksQ0FBQ3JOLFdBQVcsQ0FBQ3NOLGNBQWMsQ0FBQztRQUMvRHBCLEVBQUUsQ0FBQ3FCLFVBQVUsQ0FBQ3JCLEVBQUUsQ0FBQ21CLFlBQVksRUFBRSxJQUFJRyxZQUFZLENBQUMsQ0FDL0MsR0FBRyxFQUFlLEdBQUcsRUFDckIsSUFBSSxDQUFDdE0sS0FBSyxHQUFHLEVBQUUsRUFBRyxHQUFHLEVBQ3JCLEdBQUcsRUFBZSxDQUFDLElBQUksQ0FBQ0MsTUFBTSxHQUFHLEVBQUUsRUFDbkMsR0FBRyxFQUFlLENBQUMsSUFBSSxDQUFDQSxNQUFNLEdBQUcsRUFBRSxFQUNuQyxJQUFJLENBQUNELEtBQUssR0FBRyxFQUFFLEVBQUcsR0FBRyxFQUNyQixJQUFJLENBQUNBLEtBQUssR0FBRyxFQUFFLEVBQUcsQ0FBQyxJQUFJLENBQUNDLE1BQU0sR0FBRyxFQUFFLENBQ25DLENBQUMsRUFBRStLLEVBQUUsQ0FBQ3VCLFdBQVcsQ0FBQztRQUVuQixJQUFJLENBQUNLLFlBQVksQ0FDaEIsQ0FBQyxFQUNDLENBQUMsRUFDRCxJQUFJLENBQUM1TSxLQUFLLEVBQ1YsSUFBSSxDQUFDQyxNQUNSLENBQUM7UUFFRCtLLEVBQUUsQ0FBQ2dDLFVBQVUsQ0FBQ2hDLEVBQUUsQ0FBQ2lDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO01BQ2xDOztNQUVBO01BQ0E7TUFFQSxLQUFJLElBQUkvUixDQUFDLElBQUksSUFBSSxDQUFDNmIsV0FBVyxFQUM3QjtRQUNDN2IsQ0FBQyxHQUFHTyxNQUFNLENBQUNQLENBQUMsQ0FBQztRQUNiLElBQU15SCxDQUFDLEdBQUl6SCxDQUFDLEdBQUcsSUFBSSxDQUFDME0sU0FBUyxHQUFJLElBQUksQ0FBQzVILEtBQUs7UUFDM0MsSUFBTTRDLENBQUMsR0FBR1ksSUFBSSxDQUFDQyxLQUFLLENBQUN2SSxDQUFDLEdBQUcsSUFBSSxDQUFDME0sU0FBUyxHQUFHLElBQUksQ0FBQzVILEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQzRILFNBQVM7UUFFdEUsSUFBRyxDQUFDZ0IsS0FBSyxDQUFDQyxPQUFPLENBQUMsSUFBSSxDQUFDa08sV0FBVyxDQUFDN2IsQ0FBQyxDQUFDLENBQUMsRUFDdEM7VUFDQyxJQUFJLENBQUM2YixXQUFXLENBQUM3YixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQzZiLFdBQVcsQ0FBQzdiLENBQUMsQ0FBQyxDQUFDO1FBQzVDO1FBRUEsS0FBSSxJQUFJNEYsQ0FBQyxJQUFJLElBQUksQ0FBQ2lXLFdBQVcsQ0FBQzdiLENBQUMsQ0FBQyxFQUNoQztVQUNDOFAsRUFBRSxDQUFDMEksU0FBUyxDQUNYLElBQUksQ0FBQzVVLFdBQVcsQ0FBQ29ULGVBQWUsRUFDOUJ6VyxNQUFNLENBQUNQLENBQUMsQ0FBQyxFQUNUSixNQUFNLENBQUMwRCxJQUFJLENBQUMsSUFBSSxDQUFDdVksV0FBVyxDQUFDLENBQUN0YyxNQUFNLEVBQ3BDLENBQ0gsQ0FBQztVQUVEdVEsRUFBRSxDQUFDa0IsVUFBVSxDQUFDbEIsRUFBRSxDQUFDbUIsWUFBWSxFQUFFLElBQUksQ0FBQ3JOLFdBQVcsQ0FBQ3NOLGNBQWMsQ0FBQztVQUMvRHBCLEVBQUUsQ0FBQ3FCLFVBQVUsQ0FBQ3JCLEVBQUUsQ0FBQ21CLFlBQVksRUFBRSxJQUFJRyxZQUFZLENBQUMsQ0FDL0MsR0FBRyxFQUFFLEdBQUcsRUFDUixHQUFHLEVBQUUsR0FBRyxFQUNSLEdBQUcsRUFBRSxHQUFHLEVBQ1IsR0FBRyxFQUFFLEdBQUcsRUFDUixHQUFHLEVBQUUsR0FBRyxFQUNSLEdBQUcsRUFBRSxHQUFHLENBQ1IsQ0FBQyxFQUFFdEIsRUFBRSxDQUFDdUIsV0FBVyxDQUFDO1VBRW5CLElBQUksQ0FBQ0ssWUFBWSxDQUNoQmpLLENBQUMsRUFDQ0MsQ0FBQyxHQUFHLElBQUksQ0FBQ2lGLFVBQVUsRUFDbkIsSUFBSSxDQUFDRCxTQUFTLEVBQ2QsQ0FBQyxJQUFJLENBQUNDLFVBQ1QsQ0FBQztVQUVEbUQsRUFBRSxDQUFDZ0MsVUFBVSxDQUFDaEMsRUFBRSxDQUFDaUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEM7TUFDRDtNQUVBakMsRUFBRSxDQUFDMEksU0FBUyxDQUNYLElBQUksQ0FBQzVVLFdBQVcsQ0FBQ29ULGVBQWUsRUFDOUIsQ0FBQyxFQUNELENBQUMsRUFDRCxDQUNILENBQUM7TUFFRGxILEVBQUUsQ0FBQzZCLGVBQWUsQ0FBQzdCLEVBQUUsQ0FBQzhCLFdBQVcsRUFBRSxJQUFJLENBQUM7SUFDekM7RUFBQztJQUFBNVYsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQXlWLFlBQVlBLENBQUNqSyxDQUFDLEVBQUVDLENBQUMsRUFBRTVDLEtBQUssRUFBRUMsTUFBTSxFQUNoQztNQUNDLElBQU0rSyxFQUFFLEdBQUcsSUFBSSxDQUFDbE0sV0FBVyxDQUFDK0QsSUFBSSxDQUFDL0wsT0FBTztNQUV4Q2tVLEVBQUUsQ0FBQ2tCLFVBQVUsQ0FBQ2xCLEVBQUUsQ0FBQ21CLFlBQVksRUFBRSxJQUFJLENBQUNyTixXQUFXLENBQUM0TyxjQUFjLENBQUM7TUFFL0QsSUFBTUMsRUFBRSxHQUFHaEwsQ0FBQztNQUNaLElBQU1rTCxFQUFFLEdBQUlsTCxDQUFDLEdBQUczQyxLQUFNO01BQ3RCLElBQU00TixFQUFFLEdBQUdoTCxDQUFDO01BQ1osSUFBTWtMLEVBQUUsR0FBSWxMLENBQUMsR0FBRzNDLE1BQU87TUFFdkIrSyxFQUFFLENBQUNxQixVQUFVLENBQUNyQixFQUFFLENBQUNtQixZQUFZLEVBQUUsSUFBSUcsWUFBWSxDQUFDLENBQy9DcUIsRUFBRSxFQUFFRyxFQUFFLEVBQ05ELEVBQUUsRUFBRUMsRUFBRSxFQUNOSCxFQUFFLEVBQUVDLEVBQUUsRUFDTkQsRUFBRSxFQUFFQyxFQUFFLEVBQ05DLEVBQUUsRUFBRUMsRUFBRSxFQUNORCxFQUFFLEVBQUVELEVBQUUsQ0FDTixDQUFDLEVBQUU1QyxFQUFFLENBQUN1QixXQUFXLENBQUM7SUFDcEI7RUFBQztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7O0lDelNXaUwsV0FBVyxHQUFBbGhCLE9BQUEsQ0FBQWtoQixXQUFBLGdCQUFBamhCLFlBQUEsVUFBQWloQixZQUFBO0VBQUFoaEIsZUFBQSxPQUFBZ2hCLFdBQUE7QUFBQTs7O0NDQXhCO0FBQUE7QUFBQTtBQUFBO0NDQUE7QUFBQTtBQUFBO0FBQUE7Ozs7Ozs7OztBQ0FBLElBQUFDLE1BQUEsR0FBQXZmLE9BQUE7QUFBMkMsU0FBQTFCLGdCQUFBMEQsQ0FBQSxFQUFBQyxDQUFBLFVBQUFELENBQUEsWUFBQUMsQ0FBQSxhQUFBQyxTQUFBO0FBQUEsU0FBQUMsa0JBQUFDLENBQUEsRUFBQUMsQ0FBQSxhQUFBQyxDQUFBLE1BQUFBLENBQUEsR0FBQUQsQ0FBQSxDQUFBRSxNQUFBLEVBQUFELENBQUEsVUFBQUUsQ0FBQSxHQUFBSCxDQUFBLENBQUFDLENBQUEsR0FBQUUsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsQ0FBQUMsVUFBQSxRQUFBRCxDQUFBLENBQUFFLFlBQUEsa0JBQUFGLENBQUEsS0FBQUEsQ0FBQSxDQUFBRyxRQUFBLFFBQUFDLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLEVBQUFVLGNBQUEsQ0FBQU4sQ0FBQSxDQUFBeEQsR0FBQSxHQUFBd0QsQ0FBQTtBQUFBLFNBQUFuRSxhQUFBK0QsQ0FBQSxFQUFBQyxDQUFBLEVBQUFDLENBQUEsV0FBQUQsQ0FBQSxJQUFBRixpQkFBQSxDQUFBQyxDQUFBLENBQUFXLFNBQUEsRUFBQVYsQ0FBQSxHQUFBQyxDQUFBLElBQUFILGlCQUFBLENBQUFDLENBQUEsRUFBQUUsQ0FBQSxHQUFBTSxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxpQkFBQU8sUUFBQSxTQUFBUCxDQUFBO0FBQUEsU0FBQVUsZUFBQVIsQ0FBQSxRQUFBVSxDQUFBLEdBQUFDLFlBQUEsQ0FBQVgsQ0FBQSxnQ0FBQVksT0FBQSxDQUFBRixDQUFBLElBQUFBLENBQUEsR0FBQUEsQ0FBQTtBQUFBLFNBQUFDLGFBQUFYLENBQUEsRUFBQUQsQ0FBQSxvQkFBQWEsT0FBQSxDQUFBWixDQUFBLE1BQUFBLENBQUEsU0FBQUEsQ0FBQSxNQUFBRixDQUFBLEdBQUFFLENBQUEsQ0FBQWEsTUFBQSxDQUFBQyxXQUFBLGtCQUFBaEIsQ0FBQSxRQUFBWSxDQUFBLEdBQUFaLENBQUEsQ0FBQWlCLElBQUEsQ0FBQWYsQ0FBQSxFQUFBRCxDQUFBLGdDQUFBYSxPQUFBLENBQUFGLENBQUEsVUFBQUEsQ0FBQSxZQUFBZCxTQUFBLHlFQUFBRyxDQUFBLEdBQUFpQixNQUFBLEdBQUFDLE1BQUEsRUFBQWpCLENBQUE7QUFBQSxTQUFBa0IsV0FBQWxCLENBQUEsRUFBQUUsQ0FBQSxFQUFBSixDQUFBLFdBQUFJLENBQUEsR0FBQWlCLGVBQUEsQ0FBQWpCLENBQUEsR0FBQWtCLDBCQUFBLENBQUFwQixDQUFBLEVBQUFxQix5QkFBQSxLQUFBQyxPQUFBLENBQUFDLFNBQUEsQ0FBQXJCLENBQUEsRUFBQUosQ0FBQSxRQUFBcUIsZUFBQSxDQUFBbkIsQ0FBQSxFQUFBd0IsV0FBQSxJQUFBdEIsQ0FBQSxDQUFBdUIsS0FBQSxDQUFBekIsQ0FBQSxFQUFBRixDQUFBO0FBQUEsU0FBQXNCLDJCQUFBcEIsQ0FBQSxFQUFBRixDQUFBLFFBQUFBLENBQUEsaUJBQUFjLE9BQUEsQ0FBQWQsQ0FBQSwwQkFBQUEsQ0FBQSxVQUFBQSxDQUFBLGlCQUFBQSxDQUFBLFlBQUFGLFNBQUEscUVBQUE4QixzQkFBQSxDQUFBMUIsQ0FBQTtBQUFBLFNBQUEwQix1QkFBQTVCLENBQUEsbUJBQUFBLENBQUEsWUFBQTZCLGNBQUEsc0VBQUE3QixDQUFBO0FBQUEsU0FBQXVCLDBCQUFBLGNBQUFyQixDQUFBLElBQUE0QixPQUFBLENBQUFuQixTQUFBLENBQUFvQixPQUFBLENBQUFkLElBQUEsQ0FBQU8sT0FBQSxDQUFBQyxTQUFBLENBQUFLLE9BQUEsaUNBQUE1QixDQUFBLGFBQUFxQix5QkFBQSxZQUFBQSwwQkFBQSxhQUFBckIsQ0FBQTtBQUFBLFNBQUFtQixnQkFBQW5CLENBQUEsV0FBQW1CLGVBQUEsR0FBQWIsTUFBQSxDQUFBd0IsY0FBQSxHQUFBeEIsTUFBQSxDQUFBeUIsY0FBQSxDQUFBQyxJQUFBLGVBQUFoQyxDQUFBLFdBQUFBLENBQUEsQ0FBQWlDLFNBQUEsSUFBQTNCLE1BQUEsQ0FBQXlCLGNBQUEsQ0FBQS9CLENBQUEsTUFBQW1CLGVBQUEsQ0FBQW5CLENBQUE7QUFBQSxTQUFBa0MsVUFBQWxDLENBQUEsRUFBQUYsQ0FBQSw2QkFBQUEsQ0FBQSxhQUFBQSxDQUFBLFlBQUFGLFNBQUEsd0RBQUFJLENBQUEsQ0FBQVMsU0FBQSxHQUFBSCxNQUFBLENBQUE2QixNQUFBLENBQUFyQyxDQUFBLElBQUFBLENBQUEsQ0FBQVcsU0FBQSxJQUFBZSxXQUFBLElBQUE3RSxLQUFBLEVBQUFxRCxDQUFBLEVBQUFLLFFBQUEsTUFBQUQsWUFBQSxXQUFBRSxNQUFBLENBQUFDLGNBQUEsQ0FBQVAsQ0FBQSxpQkFBQUssUUFBQSxTQUFBUCxDQUFBLElBQUFzQyxlQUFBLENBQUFwQyxDQUFBLEVBQUFGLENBQUE7QUFBQSxTQUFBc0MsZ0JBQUFwQyxDQUFBLEVBQUFGLENBQUEsV0FBQXNDLGVBQUEsR0FBQTlCLE1BQUEsQ0FBQXdCLGNBQUEsR0FBQXhCLE1BQUEsQ0FBQXdCLGNBQUEsQ0FBQUUsSUFBQSxlQUFBaEMsQ0FBQSxFQUFBRixDQUFBLFdBQUFFLENBQUEsQ0FBQWlDLFNBQUEsR0FBQW5DLENBQUEsRUFBQUUsQ0FBQSxLQUFBb0MsZUFBQSxDQUFBcEMsQ0FBQSxFQUFBRixDQUFBO0FBQUEsSUFFOUI0RixVQUFVLEdBQUE1SixPQUFBLENBQUE0SixVQUFBLDBCQUFBN0csS0FBQTtFQUV0QixTQUFBNkcsV0FBWTdDLElBQUksRUFDaEI7SUFBQSxJQUFBQyxLQUFBO0lBQUE5RyxlQUFBLE9BQUEwSixVQUFBO0lBQ0M1QyxLQUFBLEdBQUE1QixVQUFBLE9BQUF3RSxVQUFBLEdBQU03QyxJQUFJO0lBQ1ZDLEtBQUEsQ0FBS0csUUFBUSxHQUFJdkYsT0FBTyxDQUFDLGtCQUFrQixDQUFDO0lBQzVDb0YsS0FBQSxDQUFLb2EsU0FBUyxHQUFHLEtBQUs7SUFFdEJwYSxLQUFBLENBQUtELElBQUksQ0FBQ3NhLFFBQVEsR0FBSSxLQUFLO0lBQzNCcmEsS0FBQSxDQUFLRCxJQUFJLENBQUNzRixDQUFDLEdBQUcsQ0FBQztJQUNmckYsS0FBQSxDQUFLRCxJQUFJLENBQUN1RixDQUFDLEdBQUcsQ0FBQztJQUVmckYsTUFBTSxDQUFDa0UsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFVBQUNvQyxLQUFLLEVBQUs7TUFDL0N2RyxLQUFBLENBQUtzYSxTQUFTLENBQUMvVCxLQUFLLENBQUM7SUFDdEIsQ0FBQyxDQUFDO0lBRUZ0RyxNQUFNLENBQUNrRSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsVUFBQ29DLEtBQUssRUFBSztNQUM3Q3ZHLEtBQUEsQ0FBS3VhLFNBQVMsQ0FBQ2hVLEtBQUssQ0FBQztJQUN0QixDQUFDLENBQUM7SUFFRnRHLE1BQU0sQ0FBQ2tFLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxVQUFDb0MsS0FBSyxFQUFLO01BQy9DdkcsS0FBQSxDQUFLc2EsU0FBUyxDQUFDL1QsS0FBSyxDQUFDO0lBQ3RCLENBQUMsQ0FBQztJQUVGdEcsTUFBTSxDQUFDa0UsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFVBQUNvQyxLQUFLLEVBQUs7TUFDOUN2RyxLQUFBLENBQUt1YSxTQUFTLENBQUNoVSxLQUFLLENBQUM7SUFDdEIsQ0FBQyxDQUFDO0lBQUMsT0FBQXZHLEtBQUE7RUFDSjtFQUFDWixTQUFBLENBQUF3RCxVQUFBLEVBQUE3RyxLQUFBO0VBQUEsT0FBQTlDLFlBQUEsQ0FBQTJKLFVBQUE7SUFBQWhKLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUEyZ0IsU0FBU0EsQ0FBQ2pVLEtBQUssRUFDZjtNQUNDLElBQUlrVSxHQUFHLEdBQUdsVSxLQUFLO01BRWZBLEtBQUssQ0FBQ21VLGNBQWMsQ0FBQyxDQUFDO01BRXRCLElBQUduVSxLQUFLLENBQUNvVSxPQUFPLElBQUlwVSxLQUFLLENBQUNvVSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQ3BDO1FBQ0NGLEdBQUcsR0FBR2xVLEtBQUssQ0FBQ29VLE9BQU8sQ0FBQyxDQUFDLENBQUM7TUFDdkI7TUFFQSxJQUFJLENBQUM1YSxJQUFJLENBQUNzYSxRQUFRLEdBQUcsSUFBSTtNQUN6QixJQUFJLENBQUNELFNBQVMsR0FBTztRQUNwQi9VLENBQUMsRUFBSW9WLEdBQUcsQ0FBQy9FLE9BQU87UUFDZHBRLENBQUMsRUFBRW1WLEdBQUcsQ0FBQzlFO01BQ1YsQ0FBQztJQUNGO0VBQUM7SUFBQS9iLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUF5Z0IsU0FBU0EsQ0FBQy9ULEtBQUssRUFDZjtNQUNDLElBQUcsSUFBSSxDQUFDeEcsSUFBSSxDQUFDc2EsUUFBUSxFQUNyQjtRQUNDLElBQUlJLEdBQUcsR0FBR2xVLEtBQUs7UUFFZixJQUFHQSxLQUFLLENBQUNvVSxPQUFPLElBQUlwVSxLQUFLLENBQUNvVSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQ3BDO1VBQ0NGLEdBQUcsR0FBR2xVLEtBQUssQ0FBQ29VLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDdkI7UUFFQSxJQUFJLENBQUM1YSxJQUFJLENBQUM2YSxFQUFFLEdBQUdILEdBQUcsQ0FBQy9FLE9BQU8sR0FBRyxJQUFJLENBQUMwRSxTQUFTLENBQUMvVSxDQUFDO1FBQzdDLElBQUksQ0FBQ3RGLElBQUksQ0FBQzhhLEVBQUUsR0FBR0osR0FBRyxDQUFDOUUsT0FBTyxHQUFHLElBQUksQ0FBQ3lFLFNBQVMsQ0FBQzlVLENBQUM7UUFFN0MsSUFBTXdWLEtBQUssR0FBRyxFQUFFO1FBRWhCLElBQUcsSUFBSSxDQUFDL2EsSUFBSSxDQUFDNmEsRUFBRSxHQUFHLENBQUNFLEtBQUssRUFDeEI7VUFDQyxJQUFJLENBQUMvYSxJQUFJLENBQUNzRixDQUFDLEdBQUcsQ0FBQ3lWLEtBQUs7UUFDckIsQ0FBQyxNQUNJLElBQUcsSUFBSSxDQUFDL2EsSUFBSSxDQUFDNmEsRUFBRSxHQUFHRSxLQUFLLEVBQzVCO1VBQ0MsSUFBSSxDQUFDL2EsSUFBSSxDQUFDc0YsQ0FBQyxHQUFHeVYsS0FBSztRQUNwQixDQUFDLE1BRUQ7VUFDQyxJQUFJLENBQUMvYSxJQUFJLENBQUNzRixDQUFDLEdBQUcsSUFBSSxDQUFDdEYsSUFBSSxDQUFDNmEsRUFBRTtRQUMzQjtRQUVBLElBQUcsSUFBSSxDQUFDN2EsSUFBSSxDQUFDOGEsRUFBRSxHQUFHLENBQUNDLEtBQUssRUFDeEI7VUFDQyxJQUFJLENBQUMvYSxJQUFJLENBQUN1RixDQUFDLEdBQUcsQ0FBQ3dWLEtBQUs7UUFDckIsQ0FBQyxNQUNJLElBQUcsSUFBSSxDQUFDL2EsSUFBSSxDQUFDOGEsRUFBRSxHQUFHQyxLQUFLLEVBQzVCO1VBQ0MsSUFBSSxDQUFDL2EsSUFBSSxDQUFDdUYsQ0FBQyxHQUFHd1YsS0FBSztRQUNwQixDQUFDLE1BRUQ7VUFDQyxJQUFJLENBQUMvYSxJQUFJLENBQUN1RixDQUFDLEdBQUcsSUFBSSxDQUFDdkYsSUFBSSxDQUFDOGEsRUFBRTtRQUMzQjtNQUNEO0lBQ0Q7RUFBQztJQUFBamhCLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUEwZ0IsU0FBU0EsQ0FBQ2hVLEtBQUssRUFDZjtNQUNDLElBQUksQ0FBQ3hHLElBQUksQ0FBQ3NhLFFBQVEsR0FBRyxLQUFLO01BQzFCLElBQUksQ0FBQ3RhLElBQUksQ0FBQ3NGLENBQUMsR0FBRyxDQUFDO01BQ2YsSUFBSSxDQUFDdEYsSUFBSSxDQUFDdUYsQ0FBQyxHQUFHLENBQUM7SUFDaEI7RUFBQztBQUFBLEVBaEc4QnpGLFdBQUk7Ozs7Ozs7Ozs7O0FDRnBDLElBQUFzYSxNQUFBLEdBQUF2ZixPQUFBO0FBQTJDLFNBQUExQixnQkFBQTBELENBQUEsRUFBQUMsQ0FBQSxVQUFBRCxDQUFBLFlBQUFDLENBQUEsYUFBQUMsU0FBQTtBQUFBLFNBQUFDLGtCQUFBQyxDQUFBLEVBQUFDLENBQUEsYUFBQUMsQ0FBQSxNQUFBQSxDQUFBLEdBQUFELENBQUEsQ0FBQUUsTUFBQSxFQUFBRCxDQUFBLFVBQUFFLENBQUEsR0FBQUgsQ0FBQSxDQUFBQyxDQUFBLEdBQUFFLENBQUEsQ0FBQUMsVUFBQSxHQUFBRCxDQUFBLENBQUFDLFVBQUEsUUFBQUQsQ0FBQSxDQUFBRSxZQUFBLGtCQUFBRixDQUFBLEtBQUFBLENBQUEsQ0FBQUcsUUFBQSxRQUFBQyxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxFQUFBVSxjQUFBLENBQUFOLENBQUEsQ0FBQXhELEdBQUEsR0FBQXdELENBQUE7QUFBQSxTQUFBbkUsYUFBQStELENBQUEsRUFBQUMsQ0FBQSxFQUFBQyxDQUFBLFdBQUFELENBQUEsSUFBQUYsaUJBQUEsQ0FBQUMsQ0FBQSxDQUFBVyxTQUFBLEVBQUFWLENBQUEsR0FBQUMsQ0FBQSxJQUFBSCxpQkFBQSxDQUFBQyxDQUFBLEVBQUFFLENBQUEsR0FBQU0sTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsaUJBQUFPLFFBQUEsU0FBQVAsQ0FBQTtBQUFBLFNBQUFVLGVBQUFSLENBQUEsUUFBQVUsQ0FBQSxHQUFBQyxZQUFBLENBQUFYLENBQUEsZ0NBQUFZLE9BQUEsQ0FBQUYsQ0FBQSxJQUFBQSxDQUFBLEdBQUFBLENBQUE7QUFBQSxTQUFBQyxhQUFBWCxDQUFBLEVBQUFELENBQUEsb0JBQUFhLE9BQUEsQ0FBQVosQ0FBQSxNQUFBQSxDQUFBLFNBQUFBLENBQUEsTUFBQUYsQ0FBQSxHQUFBRSxDQUFBLENBQUFhLE1BQUEsQ0FBQUMsV0FBQSxrQkFBQWhCLENBQUEsUUFBQVksQ0FBQSxHQUFBWixDQUFBLENBQUFpQixJQUFBLENBQUFmLENBQUEsRUFBQUQsQ0FBQSxnQ0FBQWEsT0FBQSxDQUFBRixDQUFBLFVBQUFBLENBQUEsWUFBQWQsU0FBQSx5RUFBQUcsQ0FBQSxHQUFBaUIsTUFBQSxHQUFBQyxNQUFBLEVBQUFqQixDQUFBO0FBQUEsU0FBQWtCLFdBQUFsQixDQUFBLEVBQUFFLENBQUEsRUFBQUosQ0FBQSxXQUFBSSxDQUFBLEdBQUFpQixlQUFBLENBQUFqQixDQUFBLEdBQUFrQiwwQkFBQSxDQUFBcEIsQ0FBQSxFQUFBcUIseUJBQUEsS0FBQUMsT0FBQSxDQUFBQyxTQUFBLENBQUFyQixDQUFBLEVBQUFKLENBQUEsUUFBQXFCLGVBQUEsQ0FBQW5CLENBQUEsRUFBQXdCLFdBQUEsSUFBQXRCLENBQUEsQ0FBQXVCLEtBQUEsQ0FBQXpCLENBQUEsRUFBQUYsQ0FBQTtBQUFBLFNBQUFzQiwyQkFBQXBCLENBQUEsRUFBQUYsQ0FBQSxRQUFBQSxDQUFBLGlCQUFBYyxPQUFBLENBQUFkLENBQUEsMEJBQUFBLENBQUEsVUFBQUEsQ0FBQSxpQkFBQUEsQ0FBQSxZQUFBRixTQUFBLHFFQUFBOEIsc0JBQUEsQ0FBQTFCLENBQUE7QUFBQSxTQUFBMEIsdUJBQUE1QixDQUFBLG1CQUFBQSxDQUFBLFlBQUE2QixjQUFBLHNFQUFBN0IsQ0FBQTtBQUFBLFNBQUF1QiwwQkFBQSxjQUFBckIsQ0FBQSxJQUFBNEIsT0FBQSxDQUFBbkIsU0FBQSxDQUFBb0IsT0FBQSxDQUFBZCxJQUFBLENBQUFPLE9BQUEsQ0FBQUMsU0FBQSxDQUFBSyxPQUFBLGlDQUFBNUIsQ0FBQSxhQUFBcUIseUJBQUEsWUFBQUEsMEJBQUEsYUFBQXJCLENBQUE7QUFBQSxTQUFBbUIsZ0JBQUFuQixDQUFBLFdBQUFtQixlQUFBLEdBQUFiLE1BQUEsQ0FBQXdCLGNBQUEsR0FBQXhCLE1BQUEsQ0FBQXlCLGNBQUEsQ0FBQUMsSUFBQSxlQUFBaEMsQ0FBQSxXQUFBQSxDQUFBLENBQUFpQyxTQUFBLElBQUEzQixNQUFBLENBQUF5QixjQUFBLENBQUEvQixDQUFBLE1BQUFtQixlQUFBLENBQUFuQixDQUFBO0FBQUEsU0FBQWtDLFVBQUFsQyxDQUFBLEVBQUFGLENBQUEsNkJBQUFBLENBQUEsYUFBQUEsQ0FBQSxZQUFBRixTQUFBLHdEQUFBSSxDQUFBLENBQUFTLFNBQUEsR0FBQUgsTUFBQSxDQUFBNkIsTUFBQSxDQUFBckMsQ0FBQSxJQUFBQSxDQUFBLENBQUFXLFNBQUEsSUFBQWUsV0FBQSxJQUFBN0UsS0FBQSxFQUFBcUQsQ0FBQSxFQUFBSyxRQUFBLE1BQUFELFlBQUEsV0FBQUUsTUFBQSxDQUFBQyxjQUFBLENBQUFQLENBQUEsaUJBQUFLLFFBQUEsU0FBQVAsQ0FBQSxJQUFBc0MsZUFBQSxDQUFBcEMsQ0FBQSxFQUFBRixDQUFBO0FBQUEsU0FBQXNDLGdCQUFBcEMsQ0FBQSxFQUFBRixDQUFBLFdBQUFzQyxlQUFBLEdBQUE5QixNQUFBLENBQUF3QixjQUFBLEdBQUF4QixNQUFBLENBQUF3QixjQUFBLENBQUFFLElBQUEsZUFBQWhDLENBQUEsRUFBQUYsQ0FBQSxXQUFBRSxDQUFBLENBQUFpQyxTQUFBLEdBQUFuQyxDQUFBLEVBQUFFLENBQUEsS0FBQW9DLGVBQUEsQ0FBQXBDLENBQUEsRUFBQUYsQ0FBQTtBQUFBLElBRTlCOEUsU0FBUyxHQUFBOUksT0FBQSxDQUFBOEksU0FBQSwwQkFBQS9GLEtBQUE7RUFFckIsU0FBQStGLFVBQVkvQixJQUFJLEVBQ2hCO0lBQUEsSUFBQUMsS0FBQTtJQUFBOUcsZUFBQSxPQUFBNEksU0FBQTtJQUNDOUIsS0FBQSxHQUFBNUIsVUFBQSxPQUFBMEQsU0FBQSxHQUFNL0IsSUFBSTtJQUNWQyxLQUFBLENBQUtHLFFBQVEsR0FBSXZGLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztJQUUzQ21GLElBQUksQ0FBQzJCLFdBQVcsQ0FBQzJNLEtBQUssQ0FBQ0MsSUFBSSxDQUFDLFVBQUNDLEtBQUssRUFBRztNQUNwQ3ZPLEtBQUEsQ0FBS0QsSUFBSSxDQUFDZ2IsS0FBSyxHQUFHeE0sS0FBSyxDQUFDMUUsTUFBTTtJQUMvQixDQUFDLENBQUM7SUFFRjdKLEtBQUEsQ0FBS0QsSUFBSSxDQUFDb0IsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFVBQUNDLENBQUMsRUFBRztNQUN4Q3BCLEtBQUEsQ0FBS0QsSUFBSSxDQUFDaWIsZUFBZSxHQUFHLElBQUk7SUFDakMsQ0FBQyxFQUFFO01BQUM5VyxJQUFJLEVBQUM7SUFBQyxDQUFDLENBQUM7SUFFWmxFLEtBQUEsQ0FBS0QsSUFBSSxDQUFDa2IsV0FBVyxHQUFLLEtBQUs7SUFDL0JqYixLQUFBLENBQUtELElBQUksQ0FBQ21iLFNBQVMsR0FBTyxDQUFDLENBQUM7SUFDNUJsYixLQUFBLENBQUtELElBQUksQ0FBQ29iLGFBQWEsR0FBRyxJQUFJO0lBQUEsT0FBQW5iLEtBQUE7RUFDL0I7RUFBQ1osU0FBQSxDQUFBMEMsU0FBQSxFQUFBL0YsS0FBQTtFQUFBLE9BQUE5QyxZQUFBLENBQUE2SSxTQUFBO0lBQUFsSSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBdWhCLGFBQWFBLENBQUM1WSxHQUFHLEVBQ2pCO01BQ0N0SCxPQUFPLENBQUNzTyxHQUFHLENBQUNoSCxHQUFHLENBQUM7TUFFaEIsSUFBSSxDQUFDekMsSUFBSSxDQUFDaWIsZUFBZSxHQUFHeFksR0FBRztJQUNoQztFQUFDO0lBQUE1SSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBb0ssTUFBTUEsQ0FBQ2lYLFNBQVMsRUFDaEI7TUFDQzFkLE1BQU0sQ0FBQ2lLLE1BQU0sQ0FBQyxJQUFJLENBQUMxSCxJQUFJLENBQUNtYixTQUFTLEVBQUVBLFNBQVMsQ0FBQztNQUU3QyxJQUFHQSxTQUFTLENBQUM5WCxPQUFPLEtBQUs4WCxTQUFTLENBQUM3WCxZQUFZLElBQzNDNlgsU0FBUyxDQUFDdlgsT0FBTyxLQUFLdVgsU0FBUyxDQUFDelgsWUFBWSxFQUMvQztRQUNBLElBQUksQ0FBQzFELElBQUksQ0FBQ2tiLFdBQVcsR0FBRyxJQUFJO01BQzdCLENBQUMsTUFFRDtRQUNDLElBQUksQ0FBQ2xiLElBQUksQ0FBQ2tiLFdBQVcsR0FBRyxLQUFLO01BQzlCO01BRUEsSUFBRyxDQUFDLElBQUksQ0FBQ2xiLElBQUksQ0FBQ2tiLFdBQVcsRUFDekI7UUFDQyxJQUFJLENBQUNsYixJQUFJLENBQUNzYixjQUFjLEdBQUcsSUFBSSxDQUFDdGIsSUFBSSxDQUFDd0IsR0FBRyxDQUFDd1ksT0FBTyxDQUFDbUIsU0FBUyxDQUFDOVgsT0FBTyxFQUFFOFgsU0FBUyxDQUFDdlgsT0FBTyxDQUFDO01BQ3ZGO0lBQ0Q7RUFBQztBQUFBLEVBN0M2QjlELFdBQUk7OztDQ0ZuQztBQUFBO0FBQUE7QUFBQTtDQ0FBO0FBQUE7QUFBQTtBQUFBOzs7Ozs7Ozs7Ozs7QUNBQSxJQUFBbEQsT0FBQSxHQUFBL0IsT0FBQTtBQUEwQyxTQUFBa0QsUUFBQVYsQ0FBQSxzQ0FBQVUsT0FBQSx3QkFBQUMsTUFBQSx1QkFBQUEsTUFBQSxDQUFBeUssUUFBQSxhQUFBcEwsQ0FBQSxrQkFBQUEsQ0FBQSxnQkFBQUEsQ0FBQSxXQUFBQSxDQUFBLHlCQUFBVyxNQUFBLElBQUFYLENBQUEsQ0FBQXNCLFdBQUEsS0FBQVgsTUFBQSxJQUFBWCxDQUFBLEtBQUFXLE1BQUEsQ0FBQUosU0FBQSxxQkFBQVAsQ0FBQSxLQUFBVSxPQUFBLENBQUFWLENBQUE7QUFBQSxTQUFBbEUsZ0JBQUEwRCxDQUFBLEVBQUFDLENBQUEsVUFBQUQsQ0FBQSxZQUFBQyxDQUFBLGFBQUFDLFNBQUE7QUFBQSxTQUFBQyxrQkFBQUMsQ0FBQSxFQUFBQyxDQUFBLGFBQUFDLENBQUEsTUFBQUEsQ0FBQSxHQUFBRCxDQUFBLENBQUFFLE1BQUEsRUFBQUQsQ0FBQSxVQUFBRSxDQUFBLEdBQUFILENBQUEsQ0FBQUMsQ0FBQSxHQUFBRSxDQUFBLENBQUFDLFVBQUEsR0FBQUQsQ0FBQSxDQUFBQyxVQUFBLFFBQUFELENBQUEsQ0FBQUUsWUFBQSxrQkFBQUYsQ0FBQSxLQUFBQSxDQUFBLENBQUFHLFFBQUEsUUFBQUMsTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsRUFBQVUsY0FBQSxDQUFBTixDQUFBLENBQUF4RCxHQUFBLEdBQUF3RCxDQUFBO0FBQUEsU0FBQW5FLGFBQUErRCxDQUFBLEVBQUFDLENBQUEsRUFBQUMsQ0FBQSxXQUFBRCxDQUFBLElBQUFGLGlCQUFBLENBQUFDLENBQUEsQ0FBQVcsU0FBQSxFQUFBVixDQUFBLEdBQUFDLENBQUEsSUFBQUgsaUJBQUEsQ0FBQUMsQ0FBQSxFQUFBRSxDQUFBLEdBQUFNLE1BQUEsQ0FBQUMsY0FBQSxDQUFBVCxDQUFBLGlCQUFBTyxRQUFBLFNBQUFQLENBQUE7QUFBQSxTQUFBVSxlQUFBUixDQUFBLFFBQUFVLENBQUEsR0FBQUMsWUFBQSxDQUFBWCxDQUFBLGdDQUFBWSxPQUFBLENBQUFGLENBQUEsSUFBQUEsQ0FBQSxHQUFBQSxDQUFBO0FBQUEsU0FBQUMsYUFBQVgsQ0FBQSxFQUFBRCxDQUFBLG9CQUFBYSxPQUFBLENBQUFaLENBQUEsTUFBQUEsQ0FBQSxTQUFBQSxDQUFBLE1BQUFGLENBQUEsR0FBQUUsQ0FBQSxDQUFBYSxNQUFBLENBQUFDLFdBQUEsa0JBQUFoQixDQUFBLFFBQUFZLENBQUEsR0FBQVosQ0FBQSxDQUFBaUIsSUFBQSxDQUFBZixDQUFBLEVBQUFELENBQUEsZ0NBQUFhLE9BQUEsQ0FBQUYsQ0FBQSxVQUFBQSxDQUFBLFlBQUFkLFNBQUEseUVBQUFHLENBQUEsR0FBQWlCLE1BQUEsR0FBQUMsTUFBQSxFQUFBakIsQ0FBQTtBQUFBLElBRTdCb2UsS0FBSyxHQUFBdGlCLE9BQUEsQ0FBQXNpQixLQUFBO0VBRWpCLFNBQUFBLE1BQVkvVixJQUFJLEVBQUV4RixJQUFJLEVBQ3RCO0lBQUE3RyxlQUFBLE9BQUFvaUIsS0FBQTtJQUNDLElBQUksQ0FBQy9WLElBQUksR0FBS0EsSUFBSTtJQUNsQixJQUFJLENBQUN2QyxPQUFPLEdBQUcsRUFBRTs7SUFFakI7SUFDQSxJQUFJLENBQUNjLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2pCO0VBQ0Q7RUFBQyxPQUFBN0ssWUFBQSxDQUFBcWlCLEtBQUE7SUFBQTFoQixHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBaUssTUFBTUEsQ0FBQ3BCLEtBQUssRUFBRUMsTUFBTSxFQUNwQjtNQUNDLElBQUksQ0FBQ0QsS0FBSyxHQUFJQSxLQUFLO01BQ25CLElBQUksQ0FBQ0MsTUFBTSxHQUFHQSxNQUFNO01BRXBCLEtBQUksSUFBSTBDLENBQUMsR0FBRyxDQUFDLEVBQUVBLENBQUMsR0FBRzNDLEtBQUssRUFBRTJDLENBQUMsRUFBRSxFQUM3QjtRQUNDLEtBQUksSUFBSUMsQ0FBQyxHQUFHLENBQUMsRUFBRUEsQ0FBQyxHQUFHM0MsTUFBTSxFQUFFMkMsQ0FBQyxFQUFFLEVBQzlCO1VBQ0MsSUFBTWhELE1BQU0sR0FBRyxJQUFJQyxjQUFNLENBQUMsSUFBSSxDQUFDZ0QsSUFBSSxFQUFFLGdCQUFnQixDQUFDO1VBRXREakQsTUFBTSxDQUFDK0MsQ0FBQyxHQUFHLEVBQUUsR0FBR0EsQ0FBQztVQUNqQi9DLE1BQU0sQ0FBQ2dELENBQUMsR0FBRyxFQUFFLEdBQUdBLENBQUM7VUFFakIsSUFBSSxDQUFDdEMsT0FBTyxDQUFDZ0MsSUFBSSxDQUFDMUMsTUFBTSxDQUFDO1FBQzFCO01BQ0Q7SUFDRDtFQUFDO0lBQUExSSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBc0wsSUFBSUEsQ0FBQSxFQUNKO01BQ0MsSUFBSSxDQUFDbkMsT0FBTyxDQUFDekIsR0FBRyxDQUFDLFVBQUFvSyxDQUFDO1FBQUEsT0FBSUEsQ0FBQyxDQUFDeEcsSUFBSSxDQUFDLENBQUM7TUFBQSxFQUFDO0lBQ2hDO0VBQUM7QUFBQTs7Ozs7Ozs7Ozs7QUNwQ0YsSUFBQS9JLFlBQUEsR0FBQXhCLE9BQUE7QUFDQSxJQUFBeU0sV0FBQSxHQUFBek0sT0FBQTtBQUNBLElBQUEyTixTQUFBLEdBQUEzTixPQUFBO0FBQW1ELFNBQUExQixnQkFBQTBELENBQUEsRUFBQUMsQ0FBQSxVQUFBRCxDQUFBLFlBQUFDLENBQUEsYUFBQUMsU0FBQTtBQUFBLFNBQUFDLGtCQUFBQyxDQUFBLEVBQUFDLENBQUEsYUFBQUMsQ0FBQSxNQUFBQSxDQUFBLEdBQUFELENBQUEsQ0FBQUUsTUFBQSxFQUFBRCxDQUFBLFVBQUFFLENBQUEsR0FBQUgsQ0FBQSxDQUFBQyxDQUFBLEdBQUFFLENBQUEsQ0FBQUMsVUFBQSxHQUFBRCxDQUFBLENBQUFDLFVBQUEsUUFBQUQsQ0FBQSxDQUFBRSxZQUFBLGtCQUFBRixDQUFBLEtBQUFBLENBQUEsQ0FBQUcsUUFBQSxRQUFBQyxNQUFBLENBQUFDLGNBQUEsQ0FBQVQsQ0FBQSxFQUFBVSxjQUFBLENBQUFOLENBQUEsQ0FBQXhELEdBQUEsR0FBQXdELENBQUE7QUFBQSxTQUFBbkUsYUFBQStELENBQUEsRUFBQUMsQ0FBQSxFQUFBQyxDQUFBLFdBQUFELENBQUEsSUFBQUYsaUJBQUEsQ0FBQUMsQ0FBQSxDQUFBVyxTQUFBLEVBQUFWLENBQUEsR0FBQUMsQ0FBQSxJQUFBSCxpQkFBQSxDQUFBQyxDQUFBLEVBQUFFLENBQUEsR0FBQU0sTUFBQSxDQUFBQyxjQUFBLENBQUFULENBQUEsaUJBQUFPLFFBQUEsU0FBQVAsQ0FBQTtBQUFBLFNBQUFVLGVBQUFSLENBQUEsUUFBQVUsQ0FBQSxHQUFBQyxZQUFBLENBQUFYLENBQUEsZ0NBQUFZLE9BQUEsQ0FBQUYsQ0FBQSxJQUFBQSxDQUFBLEdBQUFBLENBQUE7QUFBQSxTQUFBQyxhQUFBWCxDQUFBLEVBQUFELENBQUEsb0JBQUFhLE9BQUEsQ0FBQVosQ0FBQSxNQUFBQSxDQUFBLFNBQUFBLENBQUEsTUFBQUYsQ0FBQSxHQUFBRSxDQUFBLENBQUFhLE1BQUEsQ0FBQUMsV0FBQSxrQkFBQWhCLENBQUEsUUFBQVksQ0FBQSxHQUFBWixDQUFBLENBQUFpQixJQUFBLENBQUFmLENBQUEsRUFBQUQsQ0FBQSxnQ0FBQWEsT0FBQSxDQUFBRixDQUFBLFVBQUFBLENBQUEsWUFBQWQsU0FBQSx5RUFBQUcsQ0FBQSxHQUFBaUIsTUFBQSxHQUFBQyxNQUFBLEVBQUFqQixDQUFBO0FBQUEsU0FBQWtCLFdBQUFsQixDQUFBLEVBQUFFLENBQUEsRUFBQUosQ0FBQSxXQUFBSSxDQUFBLEdBQUFpQixlQUFBLENBQUFqQixDQUFBLEdBQUFrQiwwQkFBQSxDQUFBcEIsQ0FBQSxFQUFBcUIseUJBQUEsS0FBQUMsT0FBQSxDQUFBQyxTQUFBLENBQUFyQixDQUFBLEVBQUFKLENBQUEsUUFBQXFCLGVBQUEsQ0FBQW5CLENBQUEsRUFBQXdCLFdBQUEsSUFBQXRCLENBQUEsQ0FBQXVCLEtBQUEsQ0FBQXpCLENBQUEsRUFBQUYsQ0FBQTtBQUFBLFNBQUFzQiwyQkFBQXBCLENBQUEsRUFBQUYsQ0FBQSxRQUFBQSxDQUFBLGlCQUFBYyxPQUFBLENBQUFkLENBQUEsMEJBQUFBLENBQUEsVUFBQUEsQ0FBQSxpQkFBQUEsQ0FBQSxZQUFBRixTQUFBLHFFQUFBOEIsc0JBQUEsQ0FBQTFCLENBQUE7QUFBQSxTQUFBMEIsdUJBQUE1QixDQUFBLG1CQUFBQSxDQUFBLFlBQUE2QixjQUFBLHNFQUFBN0IsQ0FBQTtBQUFBLFNBQUF1QiwwQkFBQSxjQUFBckIsQ0FBQSxJQUFBNEIsT0FBQSxDQUFBbkIsU0FBQSxDQUFBb0IsT0FBQSxDQUFBZCxJQUFBLENBQUFPLE9BQUEsQ0FBQUMsU0FBQSxDQUFBSyxPQUFBLGlDQUFBNUIsQ0FBQSxhQUFBcUIseUJBQUEsWUFBQUEsMEJBQUEsYUFBQXJCLENBQUE7QUFBQSxTQUFBbUIsZ0JBQUFuQixDQUFBLFdBQUFtQixlQUFBLEdBQUFiLE1BQUEsQ0FBQXdCLGNBQUEsR0FBQXhCLE1BQUEsQ0FBQXlCLGNBQUEsQ0FBQUMsSUFBQSxlQUFBaEMsQ0FBQSxXQUFBQSxDQUFBLENBQUFpQyxTQUFBLElBQUEzQixNQUFBLENBQUF5QixjQUFBLENBQUEvQixDQUFBLE1BQUFtQixlQUFBLENBQUFuQixDQUFBO0FBQUEsU0FBQWtDLFVBQUFsQyxDQUFBLEVBQUFGLENBQUEsNkJBQUFBLENBQUEsYUFBQUEsQ0FBQSxZQUFBRixTQUFBLHdEQUFBSSxDQUFBLENBQUFTLFNBQUEsR0FBQUgsTUFBQSxDQUFBNkIsTUFBQSxDQUFBckMsQ0FBQSxJQUFBQSxDQUFBLENBQUFXLFNBQUEsSUFBQWUsV0FBQSxJQUFBN0UsS0FBQSxFQUFBcUQsQ0FBQSxFQUFBSyxRQUFBLE1BQUFELFlBQUEsV0FBQUUsTUFBQSxDQUFBQyxjQUFBLENBQUFQLENBQUEsaUJBQUFLLFFBQUEsU0FBQVAsQ0FBQSxJQUFBc0MsZUFBQSxDQUFBcEMsQ0FBQSxFQUFBRixDQUFBO0FBQUEsU0FBQXNDLGdCQUFBcEMsQ0FBQSxFQUFBRixDQUFBLFdBQUFzQyxlQUFBLEdBQUE5QixNQUFBLENBQUF3QixjQUFBLEdBQUF4QixNQUFBLENBQUF3QixjQUFBLENBQUFFLElBQUEsZUFBQWhDLENBQUEsRUFBQUYsQ0FBQSxXQUFBRSxDQUFBLENBQUFpQyxTQUFBLEdBQUFuQyxDQUFBLEVBQUFFLENBQUEsS0FBQW9DLGVBQUEsQ0FBQXBDLENBQUEsRUFBQUYsQ0FBQTtBQUFBLElBRXJDdWUsR0FBRyxHQUFBdmlCLE9BQUEsQ0FBQXVpQixHQUFBLDBCQUFBQyxrQkFBQTtFQUdoQixTQUFBRCxJQUFBLEVBQ0E7SUFBQSxJQUFBdmIsS0FBQTtJQUFBOUcsZUFBQSxPQUFBcWlCLEdBQUE7SUFDQ3ZiLEtBQUEsR0FBQTVCLFVBQUEsT0FBQW1kLEdBQUE7SUFFQXZiLEtBQUEsQ0FBSzBJLGtCQUFRLENBQUM4RCxPQUFPLENBQUMsR0FBRyxJQUFJO0lBRTdCeE0sS0FBQSxDQUFLK2EsS0FBSyxHQUFHLENBQUMsQ0FBQztJQUFDLE9BQUEvYSxLQUFBO0VBQ2pCO0VBQUNaLFNBQUEsQ0FBQW1jLEdBQUEsRUFBQUMsa0JBQUE7RUFBQSxPQUFBdmlCLFlBQUEsQ0FBQXNpQixHQUFBO0lBQUEzaEIsR0FBQTtJQUFBQyxLQUFBLEVBRUQsU0FBQWtnQixPQUFPQSxDQUFDMVUsQ0FBQyxFQUFFQyxDQUFDLEVBQ1o7TUFBQSxJQURjNEUsS0FBSyxHQUFBNUMsU0FBQSxDQUFBbkssTUFBQSxRQUFBbUssU0FBQSxRQUFBN0UsU0FBQSxHQUFBNkUsU0FBQSxNQUFHLENBQUM7TUFFdEIsSUFBRyxJQUFJLENBQUN5VCxLQUFLLElBQUFuVixNQUFBLENBQUlQLENBQUMsT0FBQU8sTUFBQSxDQUFJTixDQUFDLFFBQUFNLE1BQUEsQ0FBS3NFLEtBQUssRUFBRyxFQUNwQztRQUNDLE9BQU8sQ0FDTixJQUFJLENBQUN2SSxXQUFXLENBQUM4TSxRQUFRLENBQUMsSUFBSSxDQUFDc00sS0FBSyxJQUFBblYsTUFBQSxDQUFJUCxDQUFDLE9BQUFPLE1BQUEsQ0FBSU4sQ0FBQyxRQUFBTSxNQUFBLENBQUtzRSxLQUFLLEVBQUcsQ0FBQyxDQUM1RDtNQUNGO01BRUEsSUFBSXVSLEtBQUssR0FBRyxDQUFDO01BQ2IsSUFBSUMsTUFBTSxHQUFHLFlBQVk7TUFFekIsSUFBSXJXLENBQUMsR0FBR29XLEtBQUssS0FBSyxDQUFDLElBQU1uVyxDQUFDLEdBQUdtVyxLQUFLLEtBQUssQ0FBRSxFQUN6QztRQUNDQyxNQUFNLEdBQUcsWUFBWTtNQUN0QjtNQUVBLElBQUdyVyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUlDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFDdkI7UUFDQyxPQUFPO1FBQ047UUFDQSxJQUFJLENBQUMzRCxXQUFXLENBQUM4TSxRQUFRLENBQUMsY0FBYyxDQUFDLENBQ3pDO01BQ0Y7TUFFQSxPQUFPLENBQ04sSUFBSSxDQUFDOU0sV0FBVyxDQUFDOE0sUUFBUSxDQUFDLGVBQWU7TUFDekM7TUFBQSxDQUNBO01BRUQsT0FBTyxDQUNOLElBQUksQ0FBQzlNLFdBQVcsQ0FBQzhNLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFDeEMsSUFBSSxDQUFDOU0sV0FBVyxDQUFDOE0sUUFBUSxDQUFDaU4sTUFBTSxDQUFDLENBQ25DO0lBQ0Y7RUFBQztJQUFBOWhCLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFnSyxPQUFPQSxDQUFDd0IsQ0FBQyxFQUFFQyxDQUFDLEVBQUVxSixLQUFLLEVBQ25CO01BQUEsSUFEcUJ6RSxLQUFLLEdBQUE1QyxTQUFBLENBQUFuSyxNQUFBLFFBQUFtSyxTQUFBLFFBQUE3RSxTQUFBLEdBQUE2RSxTQUFBLE1BQUcsQ0FBQztNQUU3QixJQUFJLENBQUN5VCxLQUFLLElBQUFuVixNQUFBLENBQUlQLENBQUMsT0FBQU8sTUFBQSxDQUFJTixDQUFDLFFBQUFNLE1BQUEsQ0FBS3NFLEtBQUssRUFBRyxHQUFHeUUsS0FBSztJQUMxQztFQUFDO0lBQUEvVSxHQUFBO0lBQUFDLEtBQUEsRUFFRCxTQUFBOGhCLE9BQU1BLENBQUEsRUFDTjtNQUNDemdCLE9BQU8sQ0FBQ3NPLEdBQUcsQ0FBQ29TLElBQUksQ0FBQ0MsU0FBUyxDQUFDLElBQUksQ0FBQ2QsS0FBSyxDQUFDLENBQUM7SUFDeEM7RUFBQztJQUFBbmhCLEdBQUE7SUFBQUMsS0FBQSxFQUVELFNBQUFpaUIsT0FBTUEsQ0FBQ0MsS0FBSyxFQUNaO01BQ0NBLEtBQUssb0hBQXdHO01BRTdHLElBQUksQ0FBQ2hCLEtBQUssR0FBR2EsSUFBSSxDQUFDSSxLQUFLLENBQUNELEtBQUssQ0FBQzs7TUFFOUI7SUFDRDtFQUFDO0FBQUEsRUFoRU1yVSxzQkFBVSxDQUFDSCxNQUFNLENBQUM7RUFBQzVGLFdBQVcsRUFBWEE7QUFBVyxDQUFDLENBQUMsR0FvRXhDOzs7Ozs7Ozs7QUN6RUE7QUFDQSxDQUFDLFlBQVc7RUFDVixJQUFJc2EsU0FBUyxHQUFHaGMsTUFBTSxDQUFDZ2MsU0FBUyxJQUFJaGMsTUFBTSxDQUFDaWMsWUFBWTtFQUN2RCxJQUFJQyxFQUFFLEdBQUdsYyxNQUFNLENBQUNtYyxNQUFNLEdBQUluYyxNQUFNLENBQUNtYyxNQUFNLElBQUksQ0FBQyxDQUFFO0VBQzlDLElBQUlDLEVBQUUsR0FBR0YsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFJQSxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFFO0VBQ3RELElBQUksQ0FBQ0YsU0FBUyxJQUFJSSxFQUFFLENBQUNDLFFBQVEsRUFBRTtFQUMvQixJQUFJcmMsTUFBTSxDQUFDc2MsR0FBRyxFQUFFO0VBQ2hCdGMsTUFBTSxDQUFDc2MsR0FBRyxHQUFHLElBQUk7RUFFakIsSUFBSUMsV0FBVyxHQUFHLFNBQWRBLFdBQVdBLENBQVlDLEdBQUcsRUFBQztJQUM3QixJQUFJQyxJQUFJLEdBQUd4VyxJQUFJLENBQUN5VyxLQUFLLENBQUNDLElBQUksQ0FBQ2xZLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMySCxRQUFRLENBQUMsQ0FBQztJQUNuRG9RLEdBQUcsR0FBR0EsR0FBRyxDQUFDSSxPQUFPLENBQUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDO0lBQ2hELE9BQU9KLEdBQUcsSUFBSUEsR0FBRyxDQUFDSyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRSxjQUFjLEdBQUdKLElBQUk7RUFDekUsQ0FBQztFQUVELElBQUlLLE9BQU8sR0FBR0MsU0FBUyxDQUFDQyxTQUFTLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0VBQy9DLElBQUlDLFlBQVksR0FBR2QsRUFBRSxDQUFDYyxZQUFZLElBQUlKLE9BQU8sQ0FBQ0QsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUVwRSxJQUFJTSxTQUFTLEdBQUc7SUFDZEMsSUFBSSxFQUFFLFNBQU5BLElBQUlBLENBQUEsRUFBWTtNQUNkcGQsTUFBTSxDQUFDL0YsUUFBUSxDQUFDb2pCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDOUIsQ0FBQztJQUVEQyxVQUFVLEVBQUUsU0FBWkEsVUFBVUEsQ0FBQSxFQUFZO01BQ3BCLEVBQUUsQ0FBQ2pSLEtBQUssQ0FDTHJPLElBQUksQ0FBQzNFLFFBQVEsQ0FBQ2trQixnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQ3ZEakwsTUFBTSxDQUFDLFVBQVNrTCxJQUFJLEVBQUU7UUFDckIsSUFBSUMsR0FBRyxHQUFHRCxJQUFJLENBQUNFLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztRQUM5QyxPQUFPRixJQUFJLENBQUNHLElBQUksSUFBSUYsR0FBRyxJQUFJLE9BQU87TUFDcEMsQ0FBQyxDQUFDLENBQ0R2UyxPQUFPLENBQUMsVUFBU3NTLElBQUksRUFBRTtRQUN0QkEsSUFBSSxDQUFDRyxJQUFJLEdBQUdwQixXQUFXLENBQUNpQixJQUFJLENBQUNHLElBQUksQ0FBQztNQUNwQyxDQUFDLENBQUM7O01BRUo7TUFDQSxJQUFJVCxZQUFZLEVBQUVVLFVBQVUsQ0FBQyxZQUFXO1FBQUV2a0IsUUFBUSxDQUFDa00sSUFBSSxDQUFDc1ksWUFBWTtNQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7SUFDOUUsQ0FBQztJQUVEQyxVQUFVLEVBQUUsU0FBWkEsVUFBVUEsQ0FBQSxFQUFZO01BQ3BCLElBQUlDLE9BQU8sR0FBRyxFQUFFLENBQUMxUixLQUFLLENBQUNyTyxJQUFJLENBQUMzRSxRQUFRLENBQUNra0IsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7TUFDaEUsSUFBSVMsV0FBVyxHQUFHRCxPQUFPLENBQUN6YyxHQUFHLENBQUMsVUFBUzJjLE1BQU0sRUFBRTtRQUFFLE9BQU9BLE1BQU0sQ0FBQ2hHLElBQUk7TUFBQyxDQUFDLENBQUMsQ0FBQzNGLE1BQU0sQ0FBQyxVQUFTMkYsSUFBSSxFQUFFO1FBQUUsT0FBT0EsSUFBSSxDQUFDL2EsTUFBTSxHQUFHLENBQUM7TUFBQyxDQUFDLENBQUM7TUFDeEgsSUFBSWdoQixVQUFVLEdBQUdILE9BQU8sQ0FBQ3pMLE1BQU0sQ0FBQyxVQUFTMkwsTUFBTSxFQUFFO1FBQUUsT0FBT0EsTUFBTSxDQUFDMWIsR0FBRztNQUFDLENBQUMsQ0FBQztNQUV2RSxJQUFJNGIsTUFBTSxHQUFHLENBQUM7TUFDZCxJQUFJbE8sR0FBRyxHQUFHaU8sVUFBVSxDQUFDaGhCLE1BQU07TUFDM0IsSUFBSWtoQixNQUFNLEdBQUcsU0FBVEEsTUFBTUEsQ0FBQSxFQUFjO1FBQ3RCRCxNQUFNLEdBQUdBLE1BQU0sR0FBRyxDQUFDO1FBQ25CLElBQUlBLE1BQU0sS0FBS2xPLEdBQUcsRUFBRTtVQUNsQitOLFdBQVcsQ0FBQzlTLE9BQU8sQ0FBQyxVQUFTK1MsTUFBTSxFQUFFO1lBQUVJLElBQUksQ0FBQ0osTUFBTSxDQUFDO1VBQUUsQ0FBQyxDQUFDO1FBQ3pEO01BQ0YsQ0FBQztNQUVEQyxVQUFVLENBQ1BoVCxPQUFPLENBQUMsVUFBUytTLE1BQU0sRUFBRTtRQUN4QixJQUFJMWIsR0FBRyxHQUFHMGIsTUFBTSxDQUFDMWIsR0FBRztRQUNwQjBiLE1BQU0sQ0FBQ0ssTUFBTSxDQUFDLENBQUM7UUFDZixJQUFJQyxTQUFTLEdBQUdsbEIsUUFBUSxDQUFDQyxhQUFhLENBQUMsUUFBUSxDQUFDO1FBQ2hEaWxCLFNBQVMsQ0FBQ2hjLEdBQUcsR0FBR2dhLFdBQVcsQ0FBQ2hhLEdBQUcsQ0FBQztRQUNoQ2djLFNBQVMsQ0FBQ0MsS0FBSyxHQUFHLElBQUk7UUFDdEJELFNBQVMsQ0FBQ2pILE1BQU0sR0FBRzhHLE1BQU07UUFDekIva0IsUUFBUSxDQUFDb2xCLElBQUksQ0FBQ0MsV0FBVyxDQUFDSCxTQUFTLENBQUM7TUFDdEMsQ0FBQyxDQUFDO0lBQ047RUFDRixDQUFDO0VBQ0QsSUFBSUksSUFBSSxHQUFHdkMsRUFBRSxDQUFDdUMsSUFBSSxJQUFJLElBQUk7RUFDMUIsSUFBSUMsSUFBSSxHQUFHMUMsRUFBRSxDQUFDMkMsTUFBTSxJQUFJN2UsTUFBTSxDQUFDL0YsUUFBUSxDQUFDNmtCLFFBQVEsSUFBSSxXQUFXO0VBRS9ELElBQUlDLFFBQU8sR0FBRyxTQUFWQSxPQUFPQSxDQUFBLEVBQWE7SUFDdEIsSUFBSUMsVUFBVSxHQUFHLElBQUloRCxTQUFTLENBQUMsT0FBTyxHQUFHNEMsSUFBSSxHQUFHLEdBQUcsR0FBR0QsSUFBSSxDQUFDO0lBQzNESyxVQUFVLENBQUNDLFNBQVMsR0FBRyxVQUFTM1ksS0FBSyxFQUFDO01BQ3BDLElBQUk4VixFQUFFLENBQUNDLFFBQVEsRUFBRTtNQUNqQixJQUFJNkMsT0FBTyxHQUFHNVksS0FBSyxDQUFDNlksSUFBSTtNQUN4QixJQUFJQyxRQUFRLEdBQUdqQyxTQUFTLENBQUMrQixPQUFPLENBQUMsSUFBSS9CLFNBQVMsQ0FBQ0MsSUFBSTtNQUNuRGdDLFFBQVEsQ0FBQyxDQUFDO0lBQ1osQ0FBQztJQUNESixVQUFVLENBQUNLLE9BQU8sR0FBRyxZQUFVO01BQzdCLElBQUlMLFVBQVUsQ0FBQ00sVUFBVSxFQUFFTixVQUFVLENBQUNPLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFDRFAsVUFBVSxDQUFDUSxPQUFPLEdBQUcsWUFBVTtNQUM3QnhmLE1BQU0sQ0FBQzRkLFVBQVUsQ0FBQ21CLFFBQU8sRUFBRSxJQUFJLENBQUM7SUFDbEMsQ0FBQztFQUNILENBQUM7RUFDREEsUUFBTyxDQUFDLENBQUM7QUFDWCxDQUFDLEVBQUUsQ0FBQztBQUNKIiwiZmlsZSI6ImRvY3MvYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQmFnLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5CYWcgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgX01peGluID0gcmVxdWlyZShcIi4vTWl4aW5cIik7XG52YXIgX0V2ZW50VGFyZ2V0TWl4aW4gPSByZXF1aXJlKFwiLi4vbWl4aW4vRXZlbnRUYXJnZXRNaXhpblwiKTtcbnZhciB0b0lkID0gaW50ID0+IE51bWJlcihpbnQpO1xudmFyIGZyb21JZCA9IGlkID0+IHBhcnNlSW50KGlkKTtcbnZhciBNYXBwZWQgPSBTeW1ib2woJ01hcHBlZCcpO1xudmFyIEhhcyA9IFN5bWJvbCgnSGFzJyk7XG52YXIgQWRkID0gU3ltYm9sKCdBZGQnKTtcbnZhciBSZW1vdmUgPSBTeW1ib2woJ1JlbW92ZScpO1xudmFyIERlbGV0ZSA9IFN5bWJvbCgnRGVsZXRlJyk7XG5jbGFzcyBCYWcgZXh0ZW5kcyBfTWl4aW4uTWl4aW4ud2l0aChfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluKSB7XG4gIGNvbnN0cnVjdG9yKGNoYW5nZUNhbGxiYWNrID0gdW5kZWZpbmVkKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmNoYW5nZUNhbGxiYWNrID0gY2hhbmdlQ2FsbGJhY2s7XG4gICAgdGhpcy5jb250ZW50ID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMubGlzdCA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoW10pO1xuICAgIHRoaXMubWV0YSA9IFN5bWJvbCgnbWV0YScpO1xuICAgIHRoaXMudHlwZSA9IHVuZGVmaW5lZDtcbiAgfVxuICBoYXMoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0uaGFzKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tIYXNdKGl0ZW0pO1xuICB9XG4gIFtIYXNdKGl0ZW0pIHtcbiAgICByZXR1cm4gdGhpcy5jb250ZW50LmhhcyhpdGVtKTtcbiAgfVxuICBhZGQoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0uYWRkKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tBZGRdKGl0ZW0pO1xuICB9XG4gIFtBZGRdKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkIHx8ICEoaXRlbSBpbnN0YW5jZW9mIE9iamVjdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBvYmplY3RzIG1heSBiZSBhZGRlZCB0byBCYWdzLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy50eXBlICYmICEoaXRlbSBpbnN0YW5jZW9mIHRoaXMudHlwZSkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy50eXBlLCBpdGVtKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgT25seSBvYmplY3RzIG9mIHR5cGUgJHt0aGlzLnR5cGV9IG1heSBiZSBhZGRlZCB0byB0aGlzIEJhZy5gKTtcbiAgICB9XG4gICAgaXRlbSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKGl0ZW0pO1xuICAgIGlmICh0aGlzLmNvbnRlbnQuaGFzKGl0ZW0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBhZGRpbmcgPSBuZXcgQ3VzdG9tRXZlbnQoJ2FkZGluZycsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQoYWRkaW5nKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaWQgPSB0b0lkKHRoaXMuY3VycmVudCsrKTtcbiAgICB0aGlzLmNvbnRlbnQuc2V0KGl0ZW0sIGlkKTtcbiAgICB0aGlzLmxpc3RbaWRdID0gaXRlbTtcbiAgICBpZiAodGhpcy5jaGFuZ2VDYWxsYmFjaykge1xuICAgICAgdGhpcy5jaGFuZ2VDYWxsYmFjayhpdGVtLCB0aGlzLm1ldGEsIEJhZy5JVEVNX0FEREVELCBpZCk7XG4gICAgfVxuICAgIHZhciBhZGQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2FkZGVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW0sXG4gICAgICAgIGlkXG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGFkZCk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLnNpemU7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIHJlbW92ZShpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5yZW1vdmUoaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW1JlbW92ZV0oaXRlbSk7XG4gIH1cbiAgW1JlbW92ZV0oaXRlbSkge1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQgfHwgIShpdGVtIGluc3RhbmNlb2YgT2JqZWN0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9iamVjdHMgbWF5IGJlIHJlbW92ZWQgZnJvbSBCYWdzLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy50eXBlICYmICEoaXRlbSBpbnN0YW5jZW9mIHRoaXMudHlwZSkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy50eXBlLCBpdGVtKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgT25seSBvYmplY3RzIG9mIHR5cGUgJHt0aGlzLnR5cGV9IG1heSBiZSByZW1vdmVkIGZyb20gdGhpcyBCYWcuYCk7XG4gICAgfVxuICAgIGl0ZW0gPSBfQmluZGFibGUuQmluZGFibGUubWFrZShpdGVtKTtcbiAgICBpZiAoIXRoaXMuY29udGVudC5oYXMoaXRlbSkpIHtcbiAgICAgIGlmICh0aGlzLmNoYW5nZUNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2soaXRlbSwgdGhpcy5tZXRhLCAwLCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZpbmcgPSBuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92aW5nJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChyZW1vdmluZykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGlkID0gdGhpcy5jb250ZW50LmdldChpdGVtKTtcbiAgICBkZWxldGUgdGhpcy5saXN0W2lkXTtcbiAgICB0aGlzLmNvbnRlbnQuZGVsZXRlKGl0ZW0pO1xuICAgIGlmICh0aGlzLmNoYW5nZUNhbGxiYWNrKSB7XG4gICAgICB0aGlzLmNoYW5nZUNhbGxiYWNrKGl0ZW0sIHRoaXMubWV0YSwgQmFnLklURU1fUkVNT1ZFRCwgaWQpO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZlID0gbmV3IEN1c3RvbUV2ZW50KCdyZW1vdmVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW0sXG4gICAgICAgIGlkXG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KHJlbW92ZSk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLnNpemU7XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cbiAgZGVsZXRlKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLmRlbGV0ZShpdGVtKTtcbiAgICB9XG4gICAgdGhpc1tEZWxldGVdKGl0ZW0pO1xuICB9XG4gIFtEZWxldGVdKGl0ZW0pIHtcbiAgICB0aGlzLnJlbW92ZShpdGVtKTtcbiAgfVxuICBtYXAobWFwcGVyID0geCA9PiB4LCBmaWx0ZXIgPSB4ID0+IHgpIHtcbiAgICB2YXIgbWFwcGVkSXRlbXMgPSBuZXcgV2Vha01hcCgpO1xuICAgIHZhciBtYXBwZWRCYWcgPSBuZXcgQmFnKCk7XG4gICAgbWFwcGVkQmFnW01hcHBlZF0gPSB0aGlzO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignYWRkZWQnLCBldmVudCA9PiB7XG4gICAgICB2YXIgaXRlbSA9IGV2ZW50LmRldGFpbC5pdGVtO1xuICAgICAgaWYgKCFmaWx0ZXIoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKG1hcHBlZEl0ZW1zLmhhcyhpdGVtKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgbWFwcGVkID0gbWFwcGVyKGl0ZW0pO1xuICAgICAgbWFwcGVkSXRlbXMuc2V0KGl0ZW0sIG1hcHBlZCk7XG4gICAgICBtYXBwZWRCYWdbQWRkXShtYXBwZWQpO1xuICAgIH0pO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigncmVtb3ZlZCcsIGV2ZW50ID0+IHtcbiAgICAgIHZhciBpdGVtID0gZXZlbnQuZGV0YWlsLml0ZW07XG4gICAgICBpZiAoIW1hcHBlZEl0ZW1zLmhhcyhpdGVtKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgbWFwcGVkID0gbWFwcGVkSXRlbXMuZ2V0KGl0ZW0pO1xuICAgICAgbWFwcGVkSXRlbXMuZGVsZXRlKGl0ZW0pO1xuICAgICAgbWFwcGVkQmFnW1JlbW92ZV0obWFwcGVkKTtcbiAgICB9KTtcbiAgICByZXR1cm4gbWFwcGVkQmFnO1xuICB9XG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLmNvbnRlbnQuc2l6ZTtcbiAgfVxuICBpdGVtcygpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbnRlbnQuZW50cmllcygpKS5tYXAoZW50cnkgPT4gZW50cnlbMF0pO1xuICB9XG59XG5leHBvcnRzLkJhZyA9IEJhZztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCYWcsICdJVEVNX0FEREVEJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiAxXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCYWcsICdJVEVNX1JFTU9WRUQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IC0xXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0JpbmRhYmxlLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5CaW5kYWJsZSA9IHZvaWQgMDtcbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShlLCByLCB0KSB7IHJldHVybiAociA9IF90b1Byb3BlcnR5S2V5KHIpKSBpbiBlID8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsIHIsIHsgdmFsdWU6IHQsIGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAgfSkgOiBlW3JdID0gdCwgZTsgfVxuZnVuY3Rpb24gX3RvUHJvcGVydHlLZXkodCkgeyB2YXIgaSA9IF90b1ByaW1pdGl2ZSh0LCBcInN0cmluZ1wiKTsgcmV0dXJuIFwic3ltYm9sXCIgPT0gdHlwZW9mIGkgPyBpIDogaSArIFwiXCI7IH1cbmZ1bmN0aW9uIF90b1ByaW1pdGl2ZSh0LCByKSB7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiB0IHx8ICF0KSByZXR1cm4gdDsgdmFyIGUgPSB0W1N5bWJvbC50b1ByaW1pdGl2ZV07IGlmICh2b2lkIDAgIT09IGUpIHsgdmFyIGkgPSBlLmNhbGwodCwgciB8fCBcImRlZmF1bHRcIik7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiBpKSByZXR1cm4gaTsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkBAdG9QcmltaXRpdmUgbXVzdCByZXR1cm4gYSBwcmltaXRpdmUgdmFsdWUuXCIpOyB9IHJldHVybiAoXCJzdHJpbmdcIiA9PT0gciA/IFN0cmluZyA6IE51bWJlcikodCk7IH1cbnZhciBSZWYgPSBTeW1ib2woJ3JlZicpO1xudmFyIE9yaWdpbmFsID0gU3ltYm9sKCdvcmlnaW5hbCcpO1xudmFyIERlY2sgPSBTeW1ib2woJ2RlY2snKTtcbnZhciBCaW5kaW5nID0gU3ltYm9sKCdiaW5kaW5nJyk7XG52YXIgU3ViQmluZGluZyA9IFN5bWJvbCgnc3ViQmluZGluZycpO1xudmFyIEJpbmRpbmdBbGwgPSBTeW1ib2woJ2JpbmRpbmdBbGwnKTtcbnZhciBJc0JpbmRhYmxlID0gU3ltYm9sKCdpc0JpbmRhYmxlJyk7XG52YXIgV3JhcHBpbmcgPSBTeW1ib2woJ3dyYXBwaW5nJyk7XG52YXIgTmFtZXMgPSBTeW1ib2woJ05hbWVzJyk7XG52YXIgRXhlY3V0aW5nID0gU3ltYm9sKCdleGVjdXRpbmcnKTtcbnZhciBTdGFjayA9IFN5bWJvbCgnc3RhY2snKTtcbnZhciBPYmpTeW1ib2wgPSBTeW1ib2woJ29iamVjdCcpO1xudmFyIFdyYXBwZWQgPSBTeW1ib2woJ3dyYXBwZWQnKTtcbnZhciBVbndyYXBwZWQgPSBTeW1ib2woJ3Vud3JhcHBlZCcpO1xudmFyIEdldFByb3RvID0gU3ltYm9sKCdnZXRQcm90bycpO1xudmFyIE9uR2V0ID0gU3ltYm9sKCdvbkdldCcpO1xudmFyIE9uQWxsR2V0ID0gU3ltYm9sKCdvbkFsbEdldCcpO1xudmFyIEJpbmRDaGFpbiA9IFN5bWJvbCgnYmluZENoYWluJyk7XG52YXIgRGVzY3JpcHRvcnMgPSBTeW1ib2woJ0Rlc2NyaXB0b3JzJyk7XG52YXIgQmVmb3JlID0gU3ltYm9sKCdCZWZvcmUnKTtcbnZhciBBZnRlciA9IFN5bWJvbCgnQWZ0ZXInKTtcbnZhciBOb0dldHRlcnMgPSBTeW1ib2woJ05vR2V0dGVycycpO1xudmFyIFByZXZlbnQgPSBTeW1ib2woJ1ByZXZlbnQnKTtcbnZhciBUeXBlZEFycmF5ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKEludDhBcnJheSk7XG52YXIgU2V0SXRlcmF0b3IgPSBTZXQucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl07XG52YXIgTWFwSXRlcmF0b3IgPSBNYXAucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl07XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbnZhciBpc0V4Y2x1ZGVkID0gb2JqZWN0ID0+IHR5cGVvZiB3aW4uTWFwID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5NYXAgfHwgdHlwZW9mIHdpbi5TZXQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlNldCB8fCB0eXBlb2Ygd2luLk5vZGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLk5vZGUgfHwgdHlwZW9mIHdpbi5XZWFrTWFwID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5XZWFrTWFwIHx8IHR5cGVvZiB3aW4uTG9jYXRpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkxvY2F0aW9uIHx8IHR5cGVvZiB3aW4uU3RvcmFnZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uU3RvcmFnZSB8fCB0eXBlb2Ygd2luLldlYWtTZXQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLldlYWtTZXQgfHwgdHlwZW9mIHdpbi5BcnJheUJ1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uQXJyYXlCdWZmZXIgfHwgdHlwZW9mIHdpbi5Qcm9taXNlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5Qcm9taXNlIHx8IHR5cGVvZiB3aW4uRmlsZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uRmlsZSB8fCB0eXBlb2Ygd2luLkV2ZW50ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5FdmVudCB8fCB0eXBlb2Ygd2luLkN1c3RvbUV2ZW50ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5DdXN0b21FdmVudCB8fCB0eXBlb2Ygd2luLkdhbWVwYWQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkdhbWVwYWQgfHwgdHlwZW9mIHdpbi5SZXNpemVPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUmVzaXplT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5NdXRhdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5NdXRhdGlvbk9ic2VydmVyIHx8IHR5cGVvZiB3aW4uUGVyZm9ybWFuY2VPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUGVyZm9ybWFuY2VPYnNlcnZlciB8fCB0eXBlb2Ygd2luLkludGVyc2VjdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JbnRlcnNlY3Rpb25PYnNlcnZlciB8fCB0eXBlb2Ygd2luLklEQkN1cnNvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCQ3Vyc29yIHx8IHR5cGVvZiB3aW4uSURCQ3Vyc29yV2l0aFZhbHVlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJDdXJzb3JXaXRoVmFsdWUgfHwgdHlwZW9mIHdpbi5JREJEYXRhYmFzZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCRGF0YWJhc2UgfHwgdHlwZW9mIHdpbi5JREJGYWN0b3J5ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJGYWN0b3J5IHx8IHR5cGVvZiB3aW4uSURCSW5kZXggPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkluZGV4IHx8IHR5cGVvZiB3aW4uSURCS2V5UmFuZ2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQktleVJhbmdlIHx8IHR5cGVvZiB3aW4uSURCT2JqZWN0U3RvcmUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQk9iamVjdFN0b3JlIHx8IHR5cGVvZiB3aW4uSURCT3BlbkRCUmVxdWVzdCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCT3BlbkRCUmVxdWVzdCB8fCB0eXBlb2Ygd2luLklEQlJlcXVlc3QgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQlJlcXVlc3QgfHwgdHlwZW9mIHdpbi5JREJUcmFuc2FjdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCVHJhbnNhY3Rpb24gfHwgdHlwZW9mIHdpbi5JREJWZXJzaW9uQ2hhbmdlRXZlbnQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQlZlcnNpb25DaGFuZ2VFdmVudCB8fCB0eXBlb2Ygd2luLkZpbGVTeXN0ZW1GaWxlSGFuZGxlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5GaWxlU3lzdGVtRmlsZUhhbmRsZSB8fCB0eXBlb2Ygd2luLlJUQ1BlZXJDb25uZWN0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5SVENQZWVyQ29ubmVjdGlvbiB8fCB0eXBlb2Ygd2luLlNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24gfHwgdHlwZW9mIHdpbi5XZWJHTFRleHR1cmUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLldlYkdMVGV4dHVyZTtcbmNsYXNzIEJpbmRhYmxlIHtcbiAgc3RhdGljIGlzQmluZGFibGUob2JqZWN0KSB7XG4gICAgaWYgKCFvYmplY3QgfHwgIW9iamVjdFtJc0JpbmRhYmxlXSB8fCAhb2JqZWN0W1ByZXZlbnRdKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RbSXNCaW5kYWJsZV0gPT09IEJpbmRhYmxlO1xuICB9XG4gIHN0YXRpYyBvbkRlY2sob2JqZWN0LCBrZXkpIHtcbiAgICByZXR1cm4gb2JqZWN0W0RlY2tdLmdldChrZXkpIHx8IGZhbHNlO1xuICB9XG4gIHN0YXRpYyByZWYob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdFtSZWZdIHx8IG9iamVjdCB8fCBmYWxzZTtcbiAgfVxuICBzdGF0aWMgbWFrZUJpbmRhYmxlKG9iamVjdCkge1xuICAgIHJldHVybiB0aGlzLm1ha2Uob2JqZWN0KTtcbiAgfVxuICBzdGF0aWMgc2h1Y2sob3JpZ2luYWwsIHNlZW4pIHtcbiAgICBzZWVuID0gc2VlbiB8fCBuZXcgTWFwKCk7XG4gICAgdmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh7fSk7XG4gICAgaWYgKG9yaWdpbmFsIGluc3RhbmNlb2YgVHlwZWRBcnJheSB8fCBvcmlnaW5hbCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICB2YXIgX2Nsb25lID0gb3JpZ2luYWwuc2xpY2UoMCk7XG4gICAgICBzZWVuLnNldChvcmlnaW5hbCwgX2Nsb25lKTtcbiAgICAgIHJldHVybiBfY2xvbmU7XG4gICAgfVxuICAgIHZhciBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMob3JpZ2luYWwpO1xuICAgIGZvciAodmFyIGkgaW4gcHJvcGVydGllcykge1xuICAgICAgdmFyIGlpID0gcHJvcGVydGllc1tpXTtcbiAgICAgIGlmIChpaS5zdWJzdHJpbmcoMCwgMykgPT09ICdfX18nKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIGFscmVhZHlDbG9uZWQgPSBzZWVuLmdldChvcmlnaW5hbFtpaV0pO1xuICAgICAgaWYgKGFscmVhZHlDbG9uZWQpIHtcbiAgICAgICAgY2xvbmVbaWldID0gYWxyZWFkeUNsb25lZDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWxbaWldID09PSBvcmlnaW5hbCkge1xuICAgICAgICBzZWVuLnNldChvcmlnaW5hbFtpaV0sIGNsb25lKTtcbiAgICAgICAgY2xvbmVbaWldID0gY2xvbmU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9yaWdpbmFsW2lpXSAmJiB0eXBlb2Ygb3JpZ2luYWxbaWldID09PSAnb2JqZWN0Jykge1xuICAgICAgICB2YXIgb3JpZ2luYWxQcm9wID0gb3JpZ2luYWxbaWldO1xuICAgICAgICBpZiAoQmluZGFibGUuaXNCaW5kYWJsZShvcmlnaW5hbFtpaV0pKSB7XG4gICAgICAgICAgb3JpZ2luYWxQcm9wID0gb3JpZ2luYWxbaWldW09yaWdpbmFsXTtcbiAgICAgICAgfVxuICAgICAgICBjbG9uZVtpaV0gPSB0aGlzLnNodWNrKG9yaWdpbmFsUHJvcCwgc2Vlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbG9uZVtpaV0gPSBvcmlnaW5hbFtpaV07XG4gICAgICB9XG4gICAgICBzZWVuLnNldChvcmlnaW5hbFtpaV0sIGNsb25lW2lpXSk7XG4gICAgfVxuICAgIGlmIChCaW5kYWJsZS5pc0JpbmRhYmxlKG9yaWdpbmFsKSkge1xuICAgICAgZGVsZXRlIGNsb25lLmJpbmRUbztcbiAgICAgIGRlbGV0ZSBjbG9uZS5pc0JvdW5kO1xuICAgIH1cbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cbiAgc3RhdGljIG1ha2Uob2JqZWN0KSB7XG4gICAgaWYgKG9iamVjdFtQcmV2ZW50XSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKCFvYmplY3QgfHwgIVsnZnVuY3Rpb24nLCAnb2JqZWN0J10uaW5jbHVkZXModHlwZW9mIG9iamVjdCkpIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmIChSZWYgaW4gb2JqZWN0KSB7XG4gICAgICByZXR1cm4gb2JqZWN0W1JlZl07XG4gICAgfVxuICAgIGlmIChvYmplY3RbSXNCaW5kYWJsZV0pIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmIChPYmplY3QuaXNTZWFsZWQob2JqZWN0KSB8fCBPYmplY3QuaXNGcm96ZW4ob2JqZWN0KSB8fCAhT2JqZWN0LmlzRXh0ZW5zaWJsZShvYmplY3QpIHx8IGlzRXhjbHVkZWQob2JqZWN0KSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgSXNCaW5kYWJsZSwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IEJpbmRhYmxlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgUmVmLCB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6IGZhbHNlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgT3JpZ2luYWwsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBvYmplY3RcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBEZWNrLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmluZGluZywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5jcmVhdGUobnVsbClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTdWJCaW5kaW5nLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmluZGluZ0FsbCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEV4ZWN1dGluZywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFdyYXBwaW5nLCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgU3RhY2ssIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJlZm9yZSwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEFmdGVyLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgV3JhcHBlZCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhuZXcgTWFwKCkpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgVW53cmFwcGVkLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG5ldyBNYXAoKSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBEZXNjcmlwdG9ycywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhuZXcgTWFwKCkpXG4gICAgfSk7XG4gICAgdmFyIGJpbmRUbyA9IChwcm9wZXJ0eSwgY2FsbGJhY2sgPSBudWxsLCBvcHRpb25zID0ge30pID0+IHtcbiAgICAgIHZhciBiaW5kVG9BbGwgPSBmYWxzZTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BlcnR5KSkge1xuICAgICAgICB2YXIgZGViaW5kZXJzID0gcHJvcGVydHkubWFwKHAgPT4gYmluZFRvKHAsIGNhbGxiYWNrLCBvcHRpb25zKSk7XG4gICAgICAgIHJldHVybiAoKSA9PiBkZWJpbmRlcnMuZm9yRWFjaChkID0+IGQoKSk7XG4gICAgICB9XG4gICAgICBpZiAocHJvcGVydHkgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICBvcHRpb25zID0gY2FsbGJhY2sgfHwge307XG4gICAgICAgIGNhbGxiYWNrID0gcHJvcGVydHk7XG4gICAgICAgIGJpbmRUb0FsbCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5kZWxheSA+PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwRGVsYXlDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy5kZWxheSk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy50aHJvdHRsZSA+PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwVGhyb3R0bGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy50aHJvdHRsZSk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy53YWl0ID49IDApIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBXYWl0Q2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMud2FpdCk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5mcmFtZSkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcEZyYW1lQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMuZnJhbWUpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuaWRsZSkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcElkbGVDYWxsYmFjayhjYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAoYmluZFRvQWxsKSB7XG4gICAgICAgIG9iamVjdFtCaW5kaW5nQWxsXS5hZGQoY2FsbGJhY2spO1xuICAgICAgICBpZiAoISgnbm93JyBpbiBvcHRpb25zKSB8fCBvcHRpb25zLm5vdykge1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhvYmplY3RbaV0sIGksIG9iamVjdCwgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIG9iamVjdFtCaW5kaW5nQWxsXS5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKCFvYmplY3RbQmluZGluZ11bcHJvcGVydHldKSB7XG4gICAgICAgIG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0gPSBuZXcgU2V0KCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGxldCBiaW5kSW5kZXggPSBvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmxlbmd0aDtcblxuICAgICAgaWYgKG9wdGlvbnMuY2hpbGRyZW4pIHtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICB2YXIgdiA9IGFyZ3NbMF07XG4gICAgICAgICAgdmFyIHN1YkRlYmluZCA9IG9iamVjdFtTdWJCaW5kaW5nXS5nZXQob3JpZ2luYWwpO1xuICAgICAgICAgIGlmIChzdWJEZWJpbmQpIHtcbiAgICAgICAgICAgIG9iamVjdFtTdWJCaW5kaW5nXS5kZWxldGUob3JpZ2luYWwpO1xuICAgICAgICAgICAgc3ViRGViaW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsKC4uLmFyZ3MpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgdnYgPSBCaW5kYWJsZS5tYWtlKHYpO1xuICAgICAgICAgIGlmIChCaW5kYWJsZS5pc0JpbmRhYmxlKHZ2KSkge1xuICAgICAgICAgICAgb2JqZWN0W1N1YkJpbmRpbmddLnNldChvcmlnaW5hbCwgdnYuYmluZFRvKCguLi5zdWJBcmdzKSA9PiBvcmlnaW5hbCguLi5hcmdzLCAuLi5zdWJBcmdzKSwgT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgICAgICAgICBjaGlsZHJlbjogZmFsc2VcbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9yaWdpbmFsKC4uLmFyZ3MpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5hZGQoY2FsbGJhY2spO1xuICAgICAgaWYgKCEoJ25vdycgaW4gb3B0aW9ucykgfHwgb3B0aW9ucy5ub3cpIHtcbiAgICAgICAgY2FsbGJhY2sob2JqZWN0W3Byb3BlcnR5XSwgcHJvcGVydHksIG9iamVjdCwgZmFsc2UpO1xuICAgICAgfVxuICAgICAgdmFyIGRlYmluZGVyID0gKCkgPT4ge1xuICAgICAgICB2YXIgc3ViRGViaW5kID0gb2JqZWN0W1N1YkJpbmRpbmddLmdldChjYWxsYmFjayk7XG4gICAgICAgIGlmIChzdWJEZWJpbmQpIHtcbiAgICAgICAgICBvYmplY3RbU3ViQmluZGluZ10uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgICBzdWJEZWJpbmQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmhhcyhjYWxsYmFjaykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgfTtcbiAgICAgIGlmIChvcHRpb25zLnJlbW92ZVdpdGggJiYgb3B0aW9ucy5yZW1vdmVXaXRoIGluc3RhbmNlb2YgVmlldykge1xuICAgICAgICBvcHRpb25zLnJlbW92ZVdpdGgub25SZW1vdmUoKCkgPT4gZGViaW5kZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlYmluZGVyO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ2JpbmRUbycsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBiaW5kVG9cbiAgICB9KTtcbiAgICB2YXIgX19fYmVmb3JlID0gY2FsbGJhY2sgPT4ge1xuICAgICAgb2JqZWN0W0JlZm9yZV0uYWRkKGNhbGxiYWNrKTtcbiAgICAgIHJldHVybiAoKSA9PiBvYmplY3RbQmVmb3JlXS5kZWxldGUoY2FsbGJhY2spO1xuICAgIH07XG4gICAgdmFyIF9fX2FmdGVyID0gY2FsbGJhY2sgPT4ge1xuICAgICAgb2JqZWN0W0FmdGVyXS5hZGQoY2FsbGJhY2spO1xuICAgICAgcmV0dXJuICgpID0+IG9iamVjdFtBZnRlcl0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJpbmRDaGFpbiwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IChwYXRoLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICAgIHZhciBub2RlID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgdmFyIHN1YlBhcnRzID0gcGFydHMuc2xpY2UoMCk7XG4gICAgICAgIHZhciBkZWJpbmQgPSBbXTtcbiAgICAgICAgZGViaW5kLnB1c2gob2JqZWN0LmJpbmRUbyhub2RlLCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIHZhciByZXN0ID0gc3ViUGFydHMuam9pbignLicpO1xuICAgICAgICAgIGlmIChzdWJQYXJ0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHYsIGssIHQsIGQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2ID0gdFtrXSA9IHRoaXMubWFrZSh7fSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlYmluZCA9IGRlYmluZC5jb25jYXQodltCaW5kQ2hhaW5dKHJlc3QsIGNhbGxiYWNrKSk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgcmV0dXJuICgpID0+IGRlYmluZC5mb3JFYWNoKHggPT4geCgpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnX19fYmVmb3JlJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IF9fX2JlZm9yZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdfX19hZnRlcicsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBfX19hZnRlclxuICAgIH0pO1xuICAgIHZhciBpc0JvdW5kID0gKCkgPT4ge1xuICAgICAgaWYgKG9iamVjdFtCaW5kaW5nQWxsXS5zaXplKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgY2FsbGJhY2tzIG9mIE9iamVjdC52YWx1ZXMob2JqZWN0W0JpbmRpbmddKSkge1xuICAgICAgICBpZiAoY2FsbGJhY2tzLnNpemUpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3IobGV0IGNhbGxiYWNrIG9mIGNhbGxiYWNrcylcbiAgICAgICAgLy8ge1xuICAgICAgICAvLyBcdGlmKGNhbGxiYWNrKVxuICAgICAgICAvLyBcdHtcbiAgICAgICAgLy8gXHRcdHJldHVybiB0cnVlO1xuICAgICAgICAvLyBcdH1cbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ2lzQm91bmQnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogaXNCb3VuZFxuICAgIH0pO1xuICAgIGZvciAodmFyIGkgaW4gb2JqZWN0KSB7XG4gICAgICAvLyBjb25zdCBkZXNjcmlwdG9ycyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iamVjdCk7XG5cbiAgICAgIGlmICghb2JqZWN0W2ldIHx8IHR5cGVvZiBvYmplY3RbaV0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9iamVjdFtpXVtSZWZdIHx8IG9iamVjdFtpXSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUob2JqZWN0W2ldKSB8fCBPYmplY3QuaXNTZWFsZWQob2JqZWN0W2ldKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNFeGNsdWRlZChvYmplY3RbaV0pKSB7XG4gICAgICAgIG9iamVjdFtpXSA9IEJpbmRhYmxlLm1ha2Uob2JqZWN0W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGRlc2NyaXB0b3JzID0gb2JqZWN0W0Rlc2NyaXB0b3JzXTtcbiAgICB2YXIgd3JhcHBlZCA9IG9iamVjdFtXcmFwcGVkXTtcbiAgICB2YXIgc3RhY2sgPSBvYmplY3RbU3RhY2tdO1xuICAgIHZhciBzZXQgPSAodGFyZ2V0LCBrZXksIHZhbHVlKSA9PiB7XG4gICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICB2YWx1ZSA9IEJpbmRhYmxlLm1ha2UodmFsdWUpO1xuICAgICAgICBpZiAodGFyZ2V0W2tleV0gPT09IHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3cmFwcGVkLmhhcyhrZXkpKSB7XG4gICAgICAgIHdyYXBwZWQuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgICB2YXIgb25EZWNrID0gb2JqZWN0W0RlY2tdO1xuICAgICAgdmFyIGlzT25EZWNrID0gb25EZWNrLmhhcyhrZXkpO1xuICAgICAgdmFyIHZhbE9uRGVjayA9IGlzT25EZWNrICYmIG9uRGVjay5nZXQoa2V5KTtcblxuICAgICAgLy8gaWYob25EZWNrW2tleV0gIT09IHVuZGVmaW5lZCAmJiBvbkRlY2tba2V5XSA9PT0gdmFsdWUpXG4gICAgICBpZiAoaXNPbkRlY2sgJiYgdmFsT25EZWNrID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkuc2xpY2UgJiYga2V5LnNsaWNlKC0zKSA9PT0gJ19fXycpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodGFyZ2V0W2tleV0gPT09IHZhbHVlIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgaXNOYU4odmFsT25EZWNrKSAmJiBpc05hTih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBvbkRlY2suc2V0KGtleSwgdmFsdWUpO1xuICAgICAgZm9yICh2YXIgY2FsbGJhY2sgb2Ygb2JqZWN0W0JpbmRpbmdBbGxdKSB7XG4gICAgICAgIGNhbGxiYWNrKHZhbHVlLCBrZXksIHRhcmdldCwgZmFsc2UpO1xuICAgICAgfVxuICAgICAgaWYgKGtleSBpbiBvYmplY3RbQmluZGluZ10pIHtcbiAgICAgICAgZm9yICh2YXIgX2NhbGxiYWNrIG9mIG9iamVjdFtCaW5kaW5nXVtrZXldKSB7XG4gICAgICAgICAgX2NhbGxiYWNrKHZhbHVlLCBrZXksIHRhcmdldCwgZmFsc2UsIHRhcmdldFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb25EZWNrLmRlbGV0ZShrZXkpO1xuICAgICAgdmFyIGV4Y2x1ZGVkID0gd2luLkZpbGUgJiYgdGFyZ2V0IGluc3RhbmNlb2Ygd2luLkZpbGUgJiYga2V5ID09ICdsYXN0TW9kaWZpZWREYXRlJztcbiAgICAgIGlmICghZXhjbHVkZWQpIHtcbiAgICAgICAgUmVmbGVjdC5zZXQodGFyZ2V0LCBrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkgJiYgb2JqZWN0W0JpbmRpbmddWydsZW5ndGgnXSkge1xuICAgICAgICBmb3IgKHZhciBfaSBpbiBvYmplY3RbQmluZGluZ11bJ2xlbmd0aCddKSB7XG4gICAgICAgICAgdmFyIF9jYWxsYmFjazIgPSBvYmplY3RbQmluZGluZ11bJ2xlbmd0aCddW19pXTtcbiAgICAgICAgICBfY2FsbGJhY2syKHRhcmdldC5sZW5ndGgsICdsZW5ndGgnLCB0YXJnZXQsIGZhbHNlLCB0YXJnZXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICB2YXIgZGVsZXRlUHJvcGVydHkgPSAodGFyZ2V0LCBrZXkpID0+IHtcbiAgICAgIHZhciBvbkRlY2sgPSBvYmplY3RbRGVja107XG4gICAgICB2YXIgaXNPbkRlY2sgPSBvbkRlY2suaGFzKGtleSk7XG4gICAgICBpZiAoaXNPbkRlY2spIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoIShrZXkgaW4gdGFyZ2V0KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChkZXNjcmlwdG9ycy5oYXMoa2V5KSkge1xuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JzLmdldChrZXkpO1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5jb25maWd1cmFibGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZGVzY3JpcHRvcnMuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgICBvbkRlY2suc2V0KGtleSwgbnVsbCk7XG4gICAgICBpZiAod3JhcHBlZC5oYXMoa2V5KSkge1xuICAgICAgICB3cmFwcGVkLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgY2FsbGJhY2sgb2Ygb2JqZWN0W0JpbmRpbmdBbGxdKSB7XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwga2V5LCB0YXJnZXQsIHRydWUsIHRhcmdldFtrZXldKTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgaW4gb2JqZWN0W0JpbmRpbmddKSB7XG4gICAgICAgIGZvciAodmFyIGJpbmRpbmcgb2Ygb2JqZWN0W0JpbmRpbmddW2tleV0pIHtcbiAgICAgICAgICBiaW5kaW5nKHVuZGVmaW5lZCwga2V5LCB0YXJnZXQsIHRydWUsIHRhcmdldFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIGtleSk7XG4gICAgICBvbkRlY2suZGVsZXRlKGtleSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3QgPSAodGFyZ2V0LCBhcmdzKSA9PiB7XG4gICAgICB2YXIga2V5ID0gJ2NvbnN0cnVjdG9yJztcbiAgICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIHRhcmdldFtCZWZvcmVdKSB7XG4gICAgICAgIGNhbGxiYWNrKHRhcmdldCwga2V5LCBvYmplY3RbU3RhY2tdLCB1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgdmFyIGluc3RhbmNlID0gQmluZGFibGUubWFrZShuZXcgdGFyZ2V0W09yaWdpbmFsXSguLi5hcmdzKSk7XG4gICAgICBmb3IgKHZhciBfY2FsbGJhY2szIG9mIHRhcmdldFtBZnRlcl0pIHtcbiAgICAgICAgX2NhbGxiYWNrMyh0YXJnZXQsIGtleSwgb2JqZWN0W1N0YWNrXSwgaW5zdGFuY2UsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH07XG4gICAgdmFyIGdldCA9ICh0YXJnZXQsIGtleSkgPT4ge1xuICAgICAgaWYgKHdyYXBwZWQuaGFzKGtleSkpIHtcbiAgICAgICAgcmV0dXJuIHdyYXBwZWQuZ2V0KGtleSk7XG4gICAgICB9XG4gICAgICBpZiAoa2V5ID09PSBSZWYgfHwga2V5ID09PSBPcmlnaW5hbCB8fCBrZXkgPT09ICdhcHBseScgfHwga2V5ID09PSAnaXNCb3VuZCcgfHwga2V5ID09PSAnYmluZFRvJyB8fCBrZXkgPT09ICdfX3Byb3RvX18nIHx8IGtleSA9PT0gJ2NvbnN0cnVjdG9yJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgICB2YXIgZGVzY3JpcHRvcjtcbiAgICAgIGlmIChkZXNjcmlwdG9ycy5oYXMoa2V5KSkge1xuICAgICAgICBkZXNjcmlwdG9yID0gZGVzY3JpcHRvcnMuZ2V0KGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIGtleSk7XG4gICAgICAgIGRlc2NyaXB0b3JzLnNldChrZXksIGRlc2NyaXB0b3IpO1xuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgIH1cbiAgICAgIGlmIChPbkFsbEdldCBpbiBvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtPbkFsbEdldF0oa2V5KTtcbiAgICAgIH1cbiAgICAgIGlmIChPbkdldCBpbiBvYmplY3QgJiYgIShrZXkgaW4gb2JqZWN0KSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W09uR2V0XShrZXkpO1xuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgIHdyYXBwZWQuc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG9iamVjdFtrZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGlmIChOYW1lcyBpbiBvYmplY3Rba2V5XSkge1xuICAgICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBvYmplY3RbVW53cmFwcGVkXS5zZXQoa2V5LCBvYmplY3Rba2V5XSk7XG4gICAgICAgIHZhciBwcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTtcbiAgICAgICAgdmFyIGlzTWV0aG9kID0gcHJvdG90eXBlW2tleV0gPT09IG9iamVjdFtrZXldO1xuICAgICAgICB2YXIgb2JqUmVmID1cbiAgICAgICAgLy8gKHR5cGVvZiBQcm9taXNlID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBQcm9taXNlKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFN0b3JhZ2UgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFN0b3JhZ2UpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgTWFwID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgTWFwKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFNldCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFNldClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBXZWFrTWFwID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBXZWFrTWFwKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFdlYWtTZXQgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFdlYWtTZXQpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgQXJyYXlCdWZmZXIgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgUmVzaXplT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgUmVzaXplT2JzZXJ2ZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgTXV0YXRpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgTXV0YXRpb25PYnNlcnZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBQZXJmb3JtYW5jZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBQZXJmb3JtYW5jZU9ic2VydmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIEludGVyc2VjdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIEludGVyc2VjdGlvbk9ic2VydmVyKVxuICAgICAgICBpc0V4Y2x1ZGVkKG9iamVjdCkgfHwgdHlwZW9mIG9iamVjdFtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nICYmIGtleSA9PT0gJ25leHQnIHx8IHR5cGVvZiBUeXBlZEFycmF5ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIFR5cGVkQXJyYXkgfHwgdHlwZW9mIEV2ZW50VGFyZ2V0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIEV2ZW50VGFyZ2V0IHx8IHR5cGVvZiBEYXRlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIERhdGUgfHwgdHlwZW9mIE1hcEl0ZXJhdG9yID09PSAnZnVuY3Rpb24nICYmIG9iamVjdC5wcm90b3R5cGUgPT09IE1hcEl0ZXJhdG9yIHx8IHR5cGVvZiBTZXRJdGVyYXRvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QucHJvdG90eXBlID09PSBTZXRJdGVyYXRvciA/IG9iamVjdCA6IG9iamVjdFtSZWZdO1xuICAgICAgICB2YXIgd3JhcHBlZE1ldGhvZCA9IGZ1bmN0aW9uICguLi5wcm92aWRlZEFyZ3MpIHtcbiAgICAgICAgICBvYmplY3RbRXhlY3V0aW5nXSA9IGtleTtcbiAgICAgICAgICBzdGFjay51bnNoaWZ0KGtleSk7XG4gICAgICAgICAgZm9yICh2YXIgYmVmb3JlQ2FsbGJhY2sgb2Ygb2JqZWN0W0JlZm9yZV0pIHtcbiAgICAgICAgICAgIGJlZm9yZUNhbGxiYWNrKG9iamVjdCwga2V5LCBzdGFjaywgb2JqZWN0LCBwcm92aWRlZEFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmV0O1xuICAgICAgICAgIGlmIChuZXcudGFyZ2V0KSB7XG4gICAgICAgICAgICByZXQgPSBuZXcgKG9iamVjdFtVbndyYXBwZWRdLmdldChrZXkpKSguLi5wcm92aWRlZEFyZ3MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IG9iamVjdFtVbndyYXBwZWRdLmdldChrZXkpO1xuICAgICAgICAgICAgaWYgKGlzTWV0aG9kKSB7XG4gICAgICAgICAgICAgIHJldCA9IGZ1bmMuYXBwbHkob2JqUmVmIHx8IG9iamVjdCwgcHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldCA9IGZ1bmMoLi4ucHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yICh2YXIgYWZ0ZXJDYWxsYmFjayBvZiBvYmplY3RbQWZ0ZXJdKSB7XG4gICAgICAgICAgICBhZnRlckNhbGxiYWNrKG9iamVjdCwga2V5LCBzdGFjaywgb2JqZWN0LCBwcm92aWRlZEFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvYmplY3RbRXhlY3V0aW5nXSA9IG51bGw7XG4gICAgICAgICAgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9O1xuICAgICAgICB3cmFwcGVkTWV0aG9kW09uQWxsR2V0XSA9IF9rZXkgPT4gb2JqZWN0W2tleV1bX2tleV07XG4gICAgICAgIHZhciByZXN1bHQgPSBCaW5kYWJsZS5tYWtlKHdyYXBwZWRNZXRob2QpO1xuICAgICAgICB3cmFwcGVkLnNldChrZXksIHJlc3VsdCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgfTtcbiAgICB2YXIgZ2V0UHJvdG90eXBlT2YgPSB0YXJnZXQgPT4ge1xuICAgICAgaWYgKEdldFByb3RvIGluIG9iamVjdCkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W0dldFByb3RvXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZWZsZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCk7XG4gICAgfTtcbiAgICB2YXIgaGFuZGxlckRlZiA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgaGFuZGxlckRlZi5zZXQgPSBzZXQ7XG4gICAgaGFuZGxlckRlZi5jb25zdHJ1Y3QgPSBjb25zdHJ1Y3Q7XG4gICAgaGFuZGxlckRlZi5kZWxldGVQcm9wZXJ0eSA9IGRlbGV0ZVByb3BlcnR5O1xuICAgIGlmICghb2JqZWN0W05vR2V0dGVyc10pIHtcbiAgICAgIGhhbmRsZXJEZWYuZ2V0UHJvdG90eXBlT2YgPSBnZXRQcm90b3R5cGVPZjtcbiAgICAgIGhhbmRsZXJEZWYuZ2V0ID0gZ2V0O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBSZWYsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgUHJveHkob2JqZWN0LCBoYW5kbGVyRGVmKVxuICAgIH0pO1xuICAgIHJldHVybiBvYmplY3RbUmVmXTtcbiAgfVxuICBzdGF0aWMgY2xlYXJCaW5kaW5ncyhvYmplY3QpIHtcbiAgICB2YXIgbWFwcyA9IGZ1bmMgPT4gKC4uLm9zKSA9PiBvcy5tYXAoZnVuYyk7XG4gICAgdmFyIGNsZWFyT2JqID0gbyA9PiBPYmplY3Qua2V5cyhvKS5tYXAoayA9PiBkZWxldGUgb1trXSk7XG4gICAgdmFyIGNsZWFyT2JqcyA9IG1hcHMoY2xlYXJPYmopO1xuICAgIG9iamVjdFtCaW5kaW5nQWxsXS5jbGVhcigpO1xuICAgIGNsZWFyT2JqcyhvYmplY3RbV3JhcHBlZF0sIG9iamVjdFtCaW5kaW5nXSwgb2JqZWN0W0FmdGVyXSwgb2JqZWN0W0JlZm9yZV0pO1xuICB9XG4gIHN0YXRpYyByZXNvbHZlKG9iamVjdCwgcGF0aCwgb3duZXIgPSBmYWxzZSkge1xuICAgIHZhciBub2RlO1xuICAgIHZhciBwYXRoUGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgdmFyIHRvcCA9IHBhdGhQYXJ0c1swXTtcbiAgICB3aGlsZSAocGF0aFBhcnRzLmxlbmd0aCkge1xuICAgICAgaWYgKG93bmVyICYmIHBhdGhQYXJ0cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgdmFyIG9iaiA9IHRoaXMubWFrZShvYmplY3QpO1xuICAgICAgICByZXR1cm4gW29iaiwgcGF0aFBhcnRzLnNoaWZ0KCksIHRvcF07XG4gICAgICB9XG4gICAgICBub2RlID0gcGF0aFBhcnRzLnNoaWZ0KCk7XG4gICAgICBpZiAoIShub2RlIGluIG9iamVjdCkgfHwgIW9iamVjdFtub2RlXSB8fCAhKHR5cGVvZiBvYmplY3Rbbm9kZV0gPT09ICdvYmplY3QnKSkge1xuICAgICAgICBvYmplY3Rbbm9kZV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgfVxuICAgICAgb2JqZWN0ID0gdGhpcy5tYWtlKG9iamVjdFtub2RlXSk7XG4gICAgfVxuICAgIHJldHVybiBbdGhpcy5tYWtlKG9iamVjdCksIG5vZGUsIHRvcF07XG4gIH1cbiAgc3RhdGljIHdyYXBEZWxheUNhbGxiYWNrKGNhbGxiYWNrLCBkZWxheSkge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSwgZGVsYXkpO1xuICB9XG4gIHN0YXRpYyB3cmFwVGhyb3R0bGVDYWxsYmFjayhjYWxsYmFjaywgdGhyb3R0bGUpIHtcbiAgICB0aGlzLnRocm90dGxlcy5zZXQoY2FsbGJhY2ssIGZhbHNlKTtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICh0aGlzLnRocm90dGxlcy5nZXQoY2FsbGJhY2ssIHRydWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgICAgdGhpcy50aHJvdHRsZXMuc2V0KGNhbGxiYWNrLCB0cnVlKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnRocm90dGxlcy5zZXQoY2FsbGJhY2ssIGZhbHNlKTtcbiAgICAgIH0sIHRocm90dGxlKTtcbiAgICB9O1xuICB9XG4gIHN0YXRpYyB3cmFwV2FpdENhbGxiYWNrKGNhbGxiYWNrLCB3YWl0KSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICB2YXIgd2FpdGVyO1xuICAgICAgaWYgKHdhaXRlciA9IHRoaXMud2FpdGVycy5nZXQoY2FsbGJhY2spKSB7XG4gICAgICAgIHRoaXMud2FpdGVycy5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICBjbGVhclRpbWVvdXQod2FpdGVyKTtcbiAgICAgIH1cbiAgICAgIHdhaXRlciA9IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soLi4uYXJncyksIHdhaXQpO1xuICAgICAgdGhpcy53YWl0ZXJzLnNldChjYWxsYmFjaywgd2FpdGVyKTtcbiAgICB9O1xuICB9XG4gIHN0YXRpYyB3cmFwRnJhbWVDYWxsYmFjayhjYWxsYmFjaywgZnJhbWVzKSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gY2FsbGJhY2soLi4uYXJncykpO1xuICAgIH07XG4gIH1cbiAgc3RhdGljIHdyYXBJZGxlQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIC8vIENvbXBhdGliaWxpdHkgZm9yIFNhZmFyaSAwOC8yMDIwXG4gICAgICB2YXIgcmVxID0gd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2sgfHwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuICAgICAgcmVxKCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpKTtcbiAgICB9O1xuICB9XG59XG5leHBvcnRzLkJpbmRhYmxlID0gQmluZGFibGU7XG5fZGVmaW5lUHJvcGVydHkoQmluZGFibGUsIFwid2FpdGVyc1wiLCBuZXcgV2Vha01hcCgpKTtcbl9kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgXCJ0aHJvdHRsZXNcIiwgbmV3IFdlYWtNYXAoKSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdQcmV2ZW50Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogUHJldmVudFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdPbkdldCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE9uR2V0XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ05vR2V0dGVycycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE5vR2V0dGVyc1xufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdHZXRQcm90bycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEdldFByb3RvXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ09uQWxsR2V0Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogT25BbGxHZXRcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkNhY2hlID0gdm9pZCAwO1xuY2xhc3MgQ2FjaGUge1xuICBzdGF0aWMgc3RvcmUoa2V5LCB2YWx1ZSwgZXhwaXJ5LCBidWNrZXQgPSAnc3RhbmRhcmQnKSB7XG4gICAgdmFyIGV4cGlyYXRpb24gPSAwO1xuICAgIGlmIChleHBpcnkpIHtcbiAgICAgIGV4cGlyYXRpb24gPSBleHBpcnkgKiAxMDAwICsgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5idWNrZXRzKSB7XG4gICAgICB0aGlzLmJ1Y2tldHMgPSBuZXcgTWFwKCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5idWNrZXRzLmhhcyhidWNrZXQpKSB7XG4gICAgICB0aGlzLmJ1Y2tldHMuc2V0KGJ1Y2tldCwgbmV3IE1hcCgpKTtcbiAgICB9XG4gICAgdmFyIGV2ZW50RW5kID0gbmV3IEN1c3RvbUV2ZW50KCdjdkNhY2hlU3RvcmUnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGtleSxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIGV4cGlyeSxcbiAgICAgICAgYnVja2V0XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRFbmQpKSB7XG4gICAgICB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuc2V0KGtleSwge1xuICAgICAgICB2YWx1ZSxcbiAgICAgICAgZXhwaXJhdGlvblxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBsb2FkKGtleSwgZGVmYXVsdHZhbHVlID0gZmFsc2UsIGJ1Y2tldCA9ICdzdGFuZGFyZCcpIHtcbiAgICB2YXIgZXZlbnRFbmQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Q2FjaGVMb2FkJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBrZXksXG4gICAgICAgIGRlZmF1bHR2YWx1ZSxcbiAgICAgICAgYnVja2V0XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50RW5kKSkge1xuICAgICAgcmV0dXJuIGRlZmF1bHR2YWx1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuYnVja2V0cyAmJiB0aGlzLmJ1Y2tldHMuaGFzKGJ1Y2tldCkgJiYgdGhpcy5idWNrZXRzLmdldChidWNrZXQpLmhhcyhrZXkpKSB7XG4gICAgICB2YXIgZW50cnkgPSB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuZ2V0KGtleSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmJ1Y2tldFtidWNrZXRdW2tleV0uZXhwaXJhdGlvbiwgKG5ldyBEYXRlKS5nZXRUaW1lKCkpO1xuICAgICAgaWYgKGVudHJ5LmV4cGlyYXRpb24gPT09IDAgfHwgZW50cnkuZXhwaXJhdGlvbiA+IG5ldyBEYXRlKCkuZ2V0VGltZSgpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuZ2V0KGtleSkudmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZWZhdWx0dmFsdWU7XG4gIH1cbn1cbmV4cG9ydHMuQ2FjaGUgPSBDYWNoZTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0NvbmZpZy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQ29uZmlnID0gdm9pZCAwO1xudmFyIEFwcENvbmZpZyA9IHt9O1xudmFyIF9yZXF1aXJlID0gcmVxdWlyZTtcbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xudHJ5IHtcbiAgQXBwQ29uZmlnID0gX3JlcXVpcmUoJy9Db25maWcnKS5Db25maWc7XG59IGNhdGNoIChlcnJvcikge1xuICB3aW4uZGV2TW9kZSA9PT0gdHJ1ZSAmJiBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgQXBwQ29uZmlnID0ge307XG59XG5jbGFzcyBDb25maWcge1xuICBzdGF0aWMgZ2V0KG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWdzW25hbWVdO1xuICB9XG4gIHN0YXRpYyBzZXQobmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLmNvbmZpZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBzdGF0aWMgZHVtcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWdzO1xuICB9XG4gIHN0YXRpYyBpbml0KC4uLmNvbmZpZ3MpIHtcbiAgICBmb3IgKHZhciBpIGluIGNvbmZpZ3MpIHtcbiAgICAgIHZhciBjb25maWcgPSBjb25maWdzW2ldO1xuICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIG5hbWUgaW4gY29uZmlnKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGNvbmZpZ1tuYW1lXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuZXhwb3J0cy5Db25maWcgPSBDb25maWc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQ29uZmlnLCAnY29uZmlncycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEFwcENvbmZpZ1xufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Eb20uanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkRvbSA9IHZvaWQgMDtcbnZhciB0cmF2ZXJzYWxzID0gMDtcbmNsYXNzIERvbSB7XG4gIHN0YXRpYyBtYXBUYWdzKGRvYywgc2VsZWN0b3IsIGNhbGxiYWNrLCBzdGFydE5vZGUsIGVuZE5vZGUpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIHN0YXJ0ZWQgPSB0cnVlO1xuICAgIGlmIChzdGFydE5vZGUpIHtcbiAgICAgIHN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGVuZGVkID0gZmFsc2U7XG4gICAgdmFyIHtcbiAgICAgIE5vZGUsXG4gICAgICBFbGVtZW50LFxuICAgICAgTm9kZUZpbHRlcixcbiAgICAgIGRvY3VtZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHZhciB0cmVlV2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihkb2MsIE5vZGVGaWx0ZXIuU0hPV19FTEVNRU5UIHwgTm9kZUZpbHRlci5TSE9XX1RFWFQsIHtcbiAgICAgIGFjY2VwdE5vZGU6IChub2RlLCB3YWxrZXIpID0+IHtcbiAgICAgICAgaWYgKCFzdGFydGVkKSB7XG4gICAgICAgICAgaWYgKG5vZGUgPT09IHN0YXJ0Tm9kZSkge1xuICAgICAgICAgICAgc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5kTm9kZSAmJiBub2RlID09PSBlbmROb2RlKSB7XG4gICAgICAgICAgZW5kZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmRlZCkge1xuICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKG5vZGUubWF0Y2hlcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX0FDQ0VQVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX1NLSVA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX0FDQ0VQVDtcbiAgICAgIH1cbiAgICB9LCBmYWxzZSk7XG4gICAgdmFyIHRyYXZlcnNhbCA9IHRyYXZlcnNhbHMrKztcbiAgICB3aGlsZSAodHJlZVdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICByZXN1bHQucHVzaChjYWxsYmFjayh0cmVlV2Fsa2VyLmN1cnJlbnROb2RlLCB0cmVlV2Fsa2VyKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgc3RhdGljIGRpc3BhdGNoRXZlbnQoZG9jLCBldmVudCkge1xuICAgIGRvYy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB0aGlzLm1hcFRhZ3MoZG9jLCBmYWxzZSwgbm9kZSA9PiB7XG4gICAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIH0pO1xuICB9XG59XG5leHBvcnRzLkRvbSA9IERvbTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL01peGluLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5NaXhpbiA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBDb25zdHJ1Y3RvciA9IFN5bWJvbCgnY29uc3RydWN0b3InKTtcbnZhciBNaXhpbkxpc3QgPSBTeW1ib2woJ21peGluTGlzdCcpO1xuY2xhc3MgTWl4aW4ge1xuICBzdGF0aWMgZnJvbShiYXNlQ2xhc3MsIC4uLm1peGlucykge1xuICAgIHZhciBuZXdDbGFzcyA9IGNsYXNzIGV4dGVuZHMgYmFzZUNsYXNzIHtcbiAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3MpIHtcbiAgICAgICAgdmFyIGluc3RhbmNlID0gYmFzZUNsYXNzLmNvbnN0cnVjdG9yID8gc3VwZXIoLi4uYXJncykgOiBudWxsO1xuICAgICAgICBmb3IgKHZhciBtaXhpbiBvZiBtaXhpbnMpIHtcbiAgICAgICAgICBpZiAobWl4aW5bTWl4aW4uQ29uc3RydWN0b3JdKSB7XG4gICAgICAgICAgICBtaXhpbltNaXhpbi5Db25zdHJ1Y3Rvcl0uYXBwbHkodGhpcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN3aXRjaCAodHlwZW9mIG1peGluKSB7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgIE1peGluLm1peENsYXNzKG1peGluLCBuZXdDbGFzcyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgTWl4aW4ubWl4T2JqZWN0KG1peGluLCB0aGlzKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBuZXdDbGFzcztcbiAgfVxuICBzdGF0aWMgbWFrZSguLi5jbGFzc2VzKSB7XG4gICAgdmFyIGJhc2UgPSBjbGFzc2VzLnBvcCgpO1xuICAgIHJldHVybiBNaXhpbi50byhiYXNlLCAuLi5jbGFzc2VzKTtcbiAgfVxuICBzdGF0aWMgdG8oYmFzZSwgLi4ubWl4aW5zKSB7XG4gICAgdmFyIGRlc2NyaXB0b3JzID0ge307XG4gICAgbWl4aW5zLm1hcChtaXhpbiA9PiB7XG4gICAgICBzd2l0Y2ggKHR5cGVvZiBtaXhpbikge1xuICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oZGVzY3JpcHRvcnMsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG1peGluKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGRlc2NyaXB0b3JzLCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhtaXhpbi5wcm90b3R5cGUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSBkZXNjcmlwdG9ycy5jb25zdHJ1Y3RvcjtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGJhc2UucHJvdG90eXBlLCBkZXNjcmlwdG9ycyk7XG4gICAgfSk7XG4gIH1cbiAgc3RhdGljIHdpdGgoLi4ubWl4aW5zKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbShjbGFzcyB7XG4gICAgICBjb25zdHJ1Y3RvcigpIHt9XG4gICAgfSwgLi4ubWl4aW5zKTtcbiAgfVxuICBzdGF0aWMgbWl4T2JqZWN0KG1peGluLCBpbnN0YW5jZSkge1xuICAgIGZvciAodmFyIGZ1bmMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobWl4aW4pKSB7XG4gICAgICBpZiAodHlwZW9mIG1peGluW2Z1bmNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGluc3RhbmNlW2Z1bmNdID0gbWl4aW5bZnVuY10uYmluZChpbnN0YW5jZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW5zdGFuY2VbZnVuY10gPSBtaXhpbltmdW5jXTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2Z1bmMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhtaXhpbikpIHtcbiAgICAgIGlmICh0eXBlb2YgbWl4aW5bX2Z1bmNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGluc3RhbmNlW19mdW5jXSA9IG1peGluW19mdW5jXS5iaW5kKGluc3RhbmNlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnN0YW5jZVtfZnVuY10gPSBtaXhpbltfZnVuY107XG4gICAgfVxuICB9XG4gIHN0YXRpYyBtaXhDbGFzcyhjbHMsIG5ld0NsYXNzKSB7XG4gICAgZm9yICh2YXIgZnVuYyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjbHMucHJvdG90eXBlKSkge1xuICAgICAgaWYgKFsnbmFtZScsICdwcm90b3R5cGUnLCAnbGVuZ3RoJ10uaW5jbHVkZXMoZnVuYykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobmV3Q2xhc3MsIGZ1bmMpO1xuICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGNsc1tmdW5jXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBuZXdDbGFzcy5wcm90b3R5cGVbZnVuY10gPSBjbHMucHJvdG90eXBlW2Z1bmNdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtmdW5jXSA9IGNscy5wcm90b3R5cGVbZnVuY10uYmluZChuZXdDbGFzcy5wcm90b3R5cGUpO1xuICAgIH1cbiAgICBmb3IgKHZhciBfZnVuYzIgb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhjbHMucHJvdG90eXBlKSkge1xuICAgICAgaWYgKHR5cGVvZiBjbHNbX2Z1bmMyXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBuZXdDbGFzcy5wcm90b3R5cGVbX2Z1bmMyXSA9IGNscy5wcm90b3R5cGVbX2Z1bmMyXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBuZXdDbGFzcy5wcm90b3R5cGVbX2Z1bmMyXSA9IGNscy5wcm90b3R5cGVbX2Z1bmMyXS5iaW5kKG5ld0NsYXNzLnByb3RvdHlwZSk7XG4gICAgfVxuICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKFsnbmFtZScsICdwcm90b3R5cGUnLCAnbGVuZ3RoJ10uaW5jbHVkZXMoX2Z1bmMzKSkge1xuICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihuZXdDbGFzcywgX2Z1bmMzKTtcbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGNsc1tfZnVuYzNdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgbmV3Q2xhc3NbX2Z1bmMzXSA9IGNsc1tfZnVuYzNdO1xuICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHZhciBwcmV2ID0gbmV3Q2xhc3NbX2Z1bmMzXSB8fCBmYWxzZTtcbiAgICAgICAgdmFyIG1ldGggPSBjbHNbX2Z1bmMzXS5iaW5kKG5ld0NsYXNzKTtcbiAgICAgICAgbmV3Q2xhc3NbX2Z1bmMzXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgcHJldiAmJiBwcmV2KC4uLmFyZ3MpO1xuICAgICAgICAgIHJldHVybiBtZXRoKC4uLmFyZ3MpO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIF9yZXQ7XG4gICAgZm9yICh2YXIgX2Z1bmMzIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNscykpIHtcbiAgICAgIF9yZXQgPSBfbG9vcCgpO1xuICAgICAgaWYgKF9yZXQgPT09IDApIGNvbnRpbnVlO1xuICAgIH1cbiAgICB2YXIgX2xvb3AyID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHR5cGVvZiBjbHNbX2Z1bmM0XSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBuZXdDbGFzcy5wcm90b3R5cGVbX2Z1bmM0XSA9IGNsc1tfZnVuYzRdO1xuICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgIH1cbiAgICAgIHZhciBwcmV2ID0gbmV3Q2xhc3NbX2Z1bmM0XSB8fCBmYWxzZTtcbiAgICAgIHZhciBtZXRoID0gY2xzW19mdW5jNF0uYmluZChuZXdDbGFzcyk7XG4gICAgICBuZXdDbGFzc1tfZnVuYzRdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgcHJldiAmJiBwcmV2KC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWV0aCguLi5hcmdzKTtcbiAgICAgIH07XG4gICAgfTtcbiAgICBmb3IgKHZhciBfZnVuYzQgb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhjbHMpKSB7XG4gICAgICBpZiAoX2xvb3AyKCkpIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgbWl4KG1peGluVG8pIHtcbiAgICB2YXIgY29uc3RydWN0b3JzID0gW107XG4gICAgdmFyIGFsbFN0YXRpYyA9IHt9O1xuICAgIHZhciBhbGxJbnN0YW5jZSA9IHt9O1xuICAgIHZhciBtaXhhYmxlID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShtaXhpblRvKTtcbiAgICB2YXIgX2xvb3AzID0gZnVuY3Rpb24gKGJhc2UpIHtcbiAgICAgIHZhciBpbnN0YW5jZU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYmFzZS5wcm90b3R5cGUpO1xuICAgICAgdmFyIHN0YXRpY05hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYmFzZSk7XG4gICAgICB2YXIgcHJlZml4ID0gL14oYmVmb3JlfGFmdGVyKV9fKC4rKS87XG4gICAgICB2YXIgX2xvb3A1ID0gZnVuY3Rpb24gKF9tZXRob2ROYW1lMikge1xuICAgICAgICAgIHZhciBtYXRjaCA9IF9tZXRob2ROYW1lMi5tYXRjaChwcmVmaXgpO1xuICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgc3dpdGNoIChtYXRjaFsxXSkge1xuICAgICAgICAgICAgICBjYXNlICdiZWZvcmUnOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYmVmb3JlKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2VbX21ldGhvZE5hbWUyXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnYWZ0ZXInOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYWZ0ZXIoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZVtfbWV0aG9kTmFtZTJdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhbGxTdGF0aWNbX21ldGhvZE5hbWUyXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgYmFzZVtfbWV0aG9kTmFtZTJdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgYWxsU3RhdGljW19tZXRob2ROYW1lMl0gPSBiYXNlW19tZXRob2ROYW1lMl07XG4gICAgICAgIH0sXG4gICAgICAgIF9yZXQyO1xuICAgICAgZm9yICh2YXIgX21ldGhvZE5hbWUyIG9mIHN0YXRpY05hbWVzKSB7XG4gICAgICAgIF9yZXQyID0gX2xvb3A1KF9tZXRob2ROYW1lMik7XG4gICAgICAgIGlmIChfcmV0MiA9PT0gMCkgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgX2xvb3A2ID0gZnVuY3Rpb24gKF9tZXRob2ROYW1lMykge1xuICAgICAgICAgIHZhciBtYXRjaCA9IF9tZXRob2ROYW1lMy5tYXRjaChwcmVmaXgpO1xuICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgc3dpdGNoIChtYXRjaFsxXSkge1xuICAgICAgICAgICAgICBjYXNlICdiZWZvcmUnOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYmVmb3JlKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM10uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FmdGVyJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2FmdGVyKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM10uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFsbEluc3RhbmNlW19tZXRob2ROYW1lM10pIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBhbGxJbnN0YW5jZVtfbWV0aG9kTmFtZTNdID0gYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXTtcbiAgICAgICAgfSxcbiAgICAgICAgX3JldDM7XG4gICAgICBmb3IgKHZhciBfbWV0aG9kTmFtZTMgb2YgaW5zdGFuY2VOYW1lcykge1xuICAgICAgICBfcmV0MyA9IF9sb29wNihfbWV0aG9kTmFtZTMpO1xuICAgICAgICBpZiAoX3JldDMgPT09IDApIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH07XG4gICAgZm9yICh2YXIgYmFzZSA9IHRoaXM7IGJhc2UgJiYgYmFzZS5wcm90b3R5cGU7IGJhc2UgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYmFzZSkpIHtcbiAgICAgIF9sb29wMyhiYXNlKTtcbiAgICB9XG4gICAgZm9yICh2YXIgbWV0aG9kTmFtZSBpbiBhbGxTdGF0aWMpIHtcbiAgICAgIG1peGluVG9bbWV0aG9kTmFtZV0gPSBhbGxTdGF0aWNbbWV0aG9kTmFtZV0uYmluZChtaXhpblRvKTtcbiAgICB9XG4gICAgdmFyIF9sb29wNCA9IGZ1bmN0aW9uIChfbWV0aG9kTmFtZSkge1xuICAgICAgbWl4aW5Uby5wcm90b3R5cGVbX21ldGhvZE5hbWVdID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGFsbEluc3RhbmNlW19tZXRob2ROYW1lXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH07XG4gICAgfTtcbiAgICBmb3IgKHZhciBfbWV0aG9kTmFtZSBpbiBhbGxJbnN0YW5jZSkge1xuICAgICAgX2xvb3A0KF9tZXRob2ROYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIG1peGFibGU7XG4gIH1cbn1cbmV4cG9ydHMuTWl4aW4gPSBNaXhpbjtcbk1peGluLkNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJvdXRlciA9IHZvaWQgMDtcbnZhciBfVmlldyA9IHJlcXVpcmUoXCIuL1ZpZXdcIik7XG52YXIgX0NhY2hlID0gcmVxdWlyZShcIi4vQ2FjaGVcIik7XG52YXIgX0NvbmZpZyA9IHJlcXVpcmUoXCIuL0NvbmZpZ1wiKTtcbnZhciBfUm91dGVzID0gcmVxdWlyZShcIi4vUm91dGVzXCIpO1xudmFyIF93aW4kQ3VzdG9tRXZlbnQ7XG52YXIgTm90Rm91bmRFcnJvciA9IFN5bWJvbCgnTm90Rm91bmQnKTtcbnZhciBJbnRlcm5hbEVycm9yID0gU3ltYm9sKCdJbnRlcm5hbCcpO1xudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG53aW4uQ3VzdG9tRXZlbnQgPSAoX3dpbiRDdXN0b21FdmVudCA9IHdpbi5DdXN0b21FdmVudCkgIT09IG51bGwgJiYgX3dpbiRDdXN0b21FdmVudCAhPT0gdm9pZCAwID8gX3dpbiRDdXN0b21FdmVudCA6IHdpbi5FdmVudDtcbmNsYXNzIFJvdXRlciB7XG4gIHN0YXRpYyB3YWl0KHZpZXcsIGV2ZW50ID0gJ0RPTUNvbnRlbnRMb2FkZWQnLCBub2RlID0gZG9jdW1lbnQpIHtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsICgpID0+IHtcbiAgICAgIHRoaXMubGlzdGVuKHZpZXcpO1xuICAgIH0pO1xuICB9XG4gIHN0YXRpYyBsaXN0ZW4obGlzdGVuZXIsIHJvdXRlcyA9IGZhbHNlKSB7XG4gICAgdGhpcy5saXN0ZW5lciA9IGxpc3RlbmVyIHx8IHRoaXMubGlzdGVuZXI7XG4gICAgdGhpcy5yb3V0ZXMgPSByb3V0ZXMgfHwgbGlzdGVuZXIucm91dGVzO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5xdWVyeSwgdGhpcy5xdWVyeU92ZXIoe30pKTtcbiAgICB2YXIgbGlzdGVuID0gZXZlbnQgPT4ge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChldmVudC5zdGF0ZSAmJiAncm91dGVkSWQnIGluIGV2ZW50LnN0YXRlKSB7XG4gICAgICAgIGlmIChldmVudC5zdGF0ZS5yb3V0ZWRJZCA8PSB0aGlzLnJvdXRlQ291bnQpIHtcbiAgICAgICAgICB0aGlzLmhpc3Rvcnkuc3BsaWNlKGV2ZW50LnN0YXRlLnJvdXRlZElkKTtcbiAgICAgICAgICB0aGlzLnJvdXRlQ291bnQgPSBldmVudC5zdGF0ZS5yb3V0ZWRJZDtcbiAgICAgICAgfSBlbHNlIGlmIChldmVudC5zdGF0ZS5yb3V0ZWRJZCA+IHRoaXMucm91dGVDb3VudCkge1xuICAgICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKGV2ZW50LnN0YXRlLnByZXYpO1xuICAgICAgICAgIHRoaXMucm91dGVDb3VudCA9IGV2ZW50LnN0YXRlLnJvdXRlZElkO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdGUgPSBldmVudC5zdGF0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLnByZXZQYXRoICE9PSBudWxsICYmIHRoaXMucHJldlBhdGggIT09IGxvY2F0aW9uLnBhdGhuYW1lKSB7XG4gICAgICAgICAgdGhpcy5oaXN0b3J5LnB1c2godGhpcy5wcmV2UGF0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pKSB7XG4gICAgICAgIHRoaXMubWF0Y2gobG9jYXRpb24ucGF0aG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubWF0Y2godGhpcy5uZXh0UGF0aCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2N2VXJsQ2hhbmdlZCcsIGxpc3Rlbik7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgbGlzdGVuKTtcbiAgICB2YXIgcm91dGUgPSAhdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pID8gbG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5zZWFyY2ggOiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSAmJiBsb2NhdGlvbi5oYXNoKSB7XG4gICAgICByb3V0ZSArPSBsb2NhdGlvbi5oYXNoO1xuICAgIH1cbiAgICB2YXIgc3RhdGUgPSB7XG4gICAgICByb3V0ZWRJZDogdGhpcy5yb3V0ZUNvdW50LFxuICAgICAgdXJsOiBsb2NhdGlvbi5wYXRobmFtZSxcbiAgICAgIHByZXY6IHRoaXMucHJldlBhdGhcbiAgICB9O1xuICAgIGlmICghdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pKSB7XG4gICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShzdGF0ZSwgbnVsbCwgbG9jYXRpb24ucGF0aG5hbWUpO1xuICAgIH1cbiAgICB0aGlzLmdvKHJvdXRlICE9PSBmYWxzZSA/IHJvdXRlIDogJy8nKTtcbiAgfVxuICBzdGF0aWMgZ28ocGF0aCwgc2lsZW50ID0gZmFsc2UpIHtcbiAgICB2YXIgY29uZmlnVGl0bGUgPSBfQ29uZmlnLkNvbmZpZy5nZXQoJ3RpdGxlJyk7XG4gICAgaWYgKGNvbmZpZ1RpdGxlKSB7XG4gICAgICBkb2N1bWVudC50aXRsZSA9IGNvbmZpZ1RpdGxlO1xuICAgIH1cbiAgICB2YXIgc3RhdGUgPSB7XG4gICAgICByb3V0ZWRJZDogdGhpcy5yb3V0ZUNvdW50LFxuICAgICAgcHJldjogdGhpcy5wcmV2UGF0aCxcbiAgICAgIHVybDogbG9jYXRpb24ucGF0aG5hbWVcbiAgICB9O1xuICAgIGlmIChzaWxlbnQgPT09IC0xKSB7XG4gICAgICB0aGlzLm1hdGNoKHBhdGgsIHRoaXMubGlzdGVuZXIsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pKSB7XG4gICAgICB0aGlzLm5leHRQYXRoID0gcGF0aDtcbiAgICB9IGVsc2UgaWYgKHNpbGVudCA9PT0gMiAmJiBsb2NhdGlvbi5wYXRobmFtZSAhPT0gcGF0aCkge1xuICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoc3RhdGUsIG51bGwsIHBhdGgpO1xuICAgIH0gZWxzZSBpZiAobG9jYXRpb24ucGF0aG5hbWUgIT09IHBhdGgpIHtcbiAgICAgIGhpc3RvcnkucHVzaFN0YXRlKHN0YXRlLCBudWxsLCBwYXRoKTtcbiAgICB9XG4gICAgaWYgKCFzaWxlbnQgfHwgc2lsZW50IDwgMCkge1xuICAgICAgaWYgKHNpbGVudCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5wYXRoID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgIGlmIChwYXRoLnN1YnN0cmluZygwLCAxKSA9PT0gJyMnKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEhhc2hDaGFuZ2VFdmVudCgnaGFzaGNoYW5nZScpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2VXJsQ2hhbmdlZCcpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnByZXZQYXRoID0gcGF0aDtcbiAgfVxuICBzdGF0aWMgcHJvY2Vzc1JvdXRlKHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKHR5cGVvZiByb3V0ZXNbc2VsZWN0ZWRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAocm91dGVzW3NlbGVjdGVkXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIHJlc3VsdCA9IG5ldyByb3V0ZXNbc2VsZWN0ZWRdKGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gcm91dGVzW3NlbGVjdGVkXShhcmdzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gcm91dGVzW3NlbGVjdGVkXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBzdGF0aWMgaGFuZGxlRXJyb3IoZXJyb3IsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGxpc3RlbmVyLCBwYXRoLCBwcmV2LCBmb3JjZVJlZnJlc2gpIHtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGVFcnJvcicsIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgcGF0aCxcbiAgICAgICAgICBwcmV2LFxuICAgICAgICAgIHZpZXc6IGxpc3RlbmVyLFxuICAgICAgICAgIHJvdXRlcyxcbiAgICAgICAgICBzZWxlY3RlZFxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSB3aW5bJ2Rldk1vZGUnXSA/ICdVbmV4cGVjdGVkIGVycm9yOiAnICsgU3RyaW5nKGVycm9yKSA6ICdVbmV4cGVjdGVkIGVycm9yLic7XG4gICAgaWYgKHJvdXRlc1tJbnRlcm5hbEVycm9yXSkge1xuICAgICAgYXJnc1tJbnRlcm5hbEVycm9yXSA9IGVycm9yO1xuICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzUm91dGUocm91dGVzLCBJbnRlcm5hbEVycm9yLCBhcmdzKTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKTtcbiAgfVxuICBzdGF0aWMgbWF0Y2gocGF0aCwgbGlzdGVuZXIsIG9wdGlvbnMgPSBmYWxzZSkge1xuICAgIHZhciBldmVudCA9IG51bGwsXG4gICAgICByZXF1ZXN0ID0gbnVsbCxcbiAgICAgIGZvcmNlUmVmcmVzaCA9IGZhbHNlO1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBmb3JjZVJlZnJlc2ggPSBvcHRpb25zO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvcmNlUmVmcmVzaCA9IG9wdGlvbnMuZm9yY2VSZWZyZXNoO1xuICAgICAgZXZlbnQgPSBvcHRpb25zLmV2ZW50O1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnBhdGggPT09IHBhdGggJiYgIWZvcmNlUmVmcmVzaCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgb3JpZ2luID0gJ2h0dHA6Ly9leGFtcGxlLmNvbSc7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIG9yaWdpbiA9IHRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSA/IG9yaWdpbiA6IGxvY2F0aW9uLm9yaWdpbjtcbiAgICAgIHRoaXMucXVlcnlTdHJpbmcgPSBsb2NhdGlvbi5zZWFyY2g7XG4gICAgfVxuICAgIHZhciB1cmwgPSBuZXcgVVJMKHBhdGgsIG9yaWdpbik7XG4gICAgcGF0aCA9IHRoaXMucGF0aCA9IHVybC5wYXRobmFtZTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5xdWVyeVN0cmluZyA9IHVybC5zZWFyY2g7XG4gICAgfVxuICAgIHZhciBwcmV2ID0gdGhpcy5wcmV2UGF0aDtcbiAgICB2YXIgY3VycmVudCA9IGxpc3RlbmVyICYmIGxpc3RlbmVyLmFyZ3MgPyBsaXN0ZW5lci5hcmdzLmNvbnRlbnQgOiBudWxsO1xuICAgIHZhciByb3V0ZXMgPSB0aGlzLnJvdXRlcyB8fCBsaXN0ZW5lciAmJiBsaXN0ZW5lci5yb3V0ZXMgfHwgX1JvdXRlcy5Sb3V0ZXMuZHVtcCgpO1xuICAgIHZhciBxdWVyeSA9IG5ldyBVUkxTZWFyY2hQYXJhbXModGhpcy5xdWVyeVN0cmluZyk7XG4gICAgaWYgKGV2ZW50ICYmIGV2ZW50LnJlcXVlc3QpIHtcbiAgICAgIHRoaXMucmVxdWVzdCA9IGV2ZW50LnJlcXVlc3Q7XG4gICAgfVxuICAgIGZvciAodmFyIGtleSBpbiBPYmplY3Qua2V5cyh0aGlzLnF1ZXJ5KSkge1xuICAgICAgZGVsZXRlIHRoaXMucXVlcnlba2V5XTtcbiAgICB9XG4gICAgZm9yICh2YXIgW19rZXksIHZhbHVlXSBvZiBxdWVyeSkge1xuICAgICAgdGhpcy5xdWVyeVtfa2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgICB2YXIgYXJncyA9IHt9LFxuICAgICAgc2VsZWN0ZWQgPSBmYWxzZSxcbiAgICAgIHJlc3VsdCA9ICcnO1xuICAgIGlmIChwYXRoLnN1YnN0cmluZygwLCAxKSA9PT0gJy8nKSB7XG4gICAgICBwYXRoID0gcGF0aC5zdWJzdHJpbmcoMSk7XG4gICAgfVxuICAgIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnF1ZXJ5KSB7XG4gICAgICBhcmdzW2ldID0gdGhpcy5xdWVyeVtpXTtcbiAgICB9XG4gICAgTDE6IGZvciAodmFyIF9pIGluIHJvdXRlcykge1xuICAgICAgdmFyIHJvdXRlID0gX2kuc3BsaXQoJy8nKTtcbiAgICAgIGlmIChyb3V0ZS5sZW5ndGggPCBwYXRoLmxlbmd0aCAmJiByb3V0ZVtyb3V0ZS5sZW5ndGggLSAxXSAhPT0gJyonKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgTDI6IGZvciAodmFyIGogaW4gcm91dGUpIHtcbiAgICAgICAgaWYgKHJvdXRlW2pdLnN1YnN0cigwLCAxKSA9PSAnJScpIHtcbiAgICAgICAgICB2YXIgYXJnTmFtZSA9IG51bGw7XG4gICAgICAgICAgdmFyIGdyb3VwcyA9IC9eJShcXHcrKVxcPz8vLmV4ZWMocm91dGVbal0pO1xuICAgICAgICAgIGlmIChncm91cHMgJiYgZ3JvdXBzWzFdKSB7XG4gICAgICAgICAgICBhcmdOYW1lID0gZ3JvdXBzWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWFyZ05hbWUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtyb3V0ZVtqXX0gaXMgbm90IGEgdmFsaWQgYXJndW1lbnQgc2VnbWVudCBpbiByb3V0ZSBcIiR7X2l9XCJgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFwYXRoW2pdKSB7XG4gICAgICAgICAgICBpZiAocm91dGVbal0uc3Vic3RyKHJvdXRlW2pdLmxlbmd0aCAtIDEsIDEpID09ICc/Jykge1xuICAgICAgICAgICAgICBhcmdzW2FyZ05hbWVdID0gJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250aW51ZSBMMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXJnc1thcmdOYW1lXSA9IHBhdGhbal07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJvdXRlW2pdICE9PSAnKicgJiYgcGF0aFtqXSAhPT0gcm91dGVbal0pIHtcbiAgICAgICAgICBjb250aW51ZSBMMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2VsZWN0ZWQgPSBfaTtcbiAgICAgIHJlc3VsdCA9IHJvdXRlc1tfaV07XG4gICAgICBpZiAocm91dGVbcm91dGUubGVuZ3RoIC0gMV0gPT09ICcqJykge1xuICAgICAgICBhcmdzLnBhdGhwYXJ0cyA9IHBhdGguc2xpY2Uocm91dGUubGVuZ3RoIC0gMSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgdmFyIGV2ZW50U3RhcnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGVTdGFydCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcHJldixcbiAgICAgICAgcm9vdDogbGlzdGVuZXIsXG4gICAgICAgIHNlbGVjdGVkLFxuICAgICAgICByb3V0ZXNcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKCFkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50U3RhcnQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFmb3JjZVJlZnJlc2ggJiYgbGlzdGVuZXIgJiYgY3VycmVudCAmJiB0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0JyAmJiBjdXJyZW50LmNvbnN0cnVjdG9yID09PSByZXN1bHQuY29uc3RydWN0b3IgJiYgIShyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSAmJiBjdXJyZW50LnVwZGF0ZShhcmdzKSkge1xuICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50ID0gY3VycmVudDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoIShzZWxlY3RlZCBpbiByb3V0ZXMpKSB7XG4gICAgICByb3V0ZXNbc2VsZWN0ZWRdID0gcm91dGVzW05vdEZvdW5kRXJyb3JdO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzUm91dGUocm91dGVzLCBzZWxlY3RlZCwgYXJncyk7XG4gICAgICBpZiAocmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NSb3V0ZShyb3V0ZXMsIE5vdEZvdW5kRXJyb3IsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKCEocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIGlmICghKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKHJlYWxSZXN1bHQgPT4gdGhpcy51cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlYWxSZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCkpLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgdGhpcy5oYW5kbGVFcnJvcihlcnJvciwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgbGlzdGVuZXIsIHBhdGgsIHByZXYsIGZvcmNlUmVmcmVzaCk7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5oYW5kbGVFcnJvcihlcnJvciwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgbGlzdGVuZXIsIHBhdGgsIHByZXYsIGZvcmNlUmVmcmVzaCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyB1cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKSB7XG4gICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcHJldiA9IHRoaXMucHJldlBhdGg7XG4gICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICByZXN1bHQsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIHByZXYsXG4gICAgICAgIHZpZXc6IGxpc3RlbmVyLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHNlbGVjdGVkXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgIGlmIChsaXN0ZW5lci5hcmdzLmNvbnRlbnQgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudC5wYXVzZSh0cnVlKTtcbiAgICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50LnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgaWYgKGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudCA9IHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIHJlc3VsdC5wYXVzZShmYWxzZSk7XG4gICAgICAgIHJlc3VsdC51cGRhdGUoYXJncywgZm9yY2VSZWZyZXNoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGV2ZW50RW5kID0gbmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlRW5kJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICByZXN1bHQsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIHByZXYsXG4gICAgICAgIHZpZXc6IGxpc3RlbmVyLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHNlbGVjdGVkXG4gICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudEVuZCk7XG4gIH1cbiAgc3RhdGljIGlzT3JpZ2luTGltaXRlZCh7XG4gICAgb3JpZ2luXG4gIH0pIHtcbiAgICByZXR1cm4gb3JpZ2luID09PSAnbnVsbCcgfHwgb3JpZ2luID09PSAnZmlsZTovLyc7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5T3ZlcihhcmdzID0ge30pIHtcbiAgICB2YXIgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpO1xuICAgIHZhciBmaW5hbEFyZ3MgPSB7fTtcbiAgICB2YXIgcXVlcnkgPSB7fTtcbiAgICBmb3IgKHZhciBwYWlyIG9mIHBhcmFtcykge1xuICAgICAgcXVlcnlbcGFpclswXV0gPSBwYWlyWzFdO1xuICAgIH1cbiAgICBmaW5hbEFyZ3MgPSBPYmplY3QuYXNzaWduKGZpbmFsQXJncywgcXVlcnksIGFyZ3MpO1xuICAgIGRlbGV0ZSBmaW5hbEFyZ3NbJ2FwaSddO1xuICAgIHJldHVybiBmaW5hbEFyZ3M7XG5cbiAgICAvLyBmb3IobGV0IGkgaW4gcXVlcnkpXG4gICAgLy8ge1xuICAgIC8vIFx0ZmluYWxBcmdzW2ldID0gcXVlcnlbaV07XG4gICAgLy8gfVxuXG4gICAgLy8gZm9yKGxldCBpIGluIGFyZ3MpXG4gICAgLy8ge1xuICAgIC8vIFx0ZmluYWxBcmdzW2ldID0gYXJnc1tpXTtcbiAgICAvLyB9XG4gIH1cbiAgc3RhdGljIHF1ZXJ5VG9TdHJpbmcoYXJncyA9IHt9LCBmcmVzaCA9IGZhbHNlKSB7XG4gICAgdmFyIHBhcnRzID0gW10sXG4gICAgICBmaW5hbEFyZ3MgPSBhcmdzO1xuICAgIGlmICghZnJlc2gpIHtcbiAgICAgIGZpbmFsQXJncyA9IHRoaXMucXVlcnlPdmVyKGFyZ3MpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIGZpbmFsQXJncykge1xuICAgICAgaWYgKGZpbmFsQXJnc1tpXSA9PT0gJycpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBwYXJ0cy5wdXNoKGkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoZmluYWxBcmdzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBwYXJ0cy5qb2luKCcmJyk7XG4gIH1cbiAgc3RhdGljIHNldFF1ZXJ5KG5hbWUsIHZhbHVlLCBzaWxlbnQpIHtcbiAgICB2YXIgYXJncyA9IHRoaXMucXVlcnlPdmVyKCk7XG4gICAgYXJnc1tuYW1lXSA9IHZhbHVlO1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBkZWxldGUgYXJnc1tuYW1lXTtcbiAgICB9XG4gICAgdmFyIHF1ZXJ5U3RyaW5nID0gdGhpcy5xdWVyeVRvU3RyaW5nKGFyZ3MsIHRydWUpO1xuICAgIHRoaXMuZ28obG9jYXRpb24ucGF0aG5hbWUgKyAocXVlcnlTdHJpbmcgPyAnPycgKyBxdWVyeVN0cmluZyA6ICc/JyksIHNpbGVudCk7XG4gIH1cbn1cbmV4cG9ydHMuUm91dGVyID0gUm91dGVyO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3F1ZXJ5Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZToge31cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ2hpc3RvcnknLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBbXVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncm91dGVDb3VudCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogMFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncHJldlBhdGgnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IG51bGxcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3F1ZXJ5U3RyaW5nJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiBudWxsXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdJbnRlcm5hbEVycm9yJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogSW50ZXJuYWxFcnJvclxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAnTm90Rm91bmRFcnJvcicsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE5vdEZvdW5kRXJyb3Jcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Sb3V0ZXMgPSB2b2lkIDA7XG52YXIgQXBwUm91dGVzID0ge307XG52YXIgX3JlcXVpcmUgPSByZXF1aXJlO1xudmFyIGltcG9ydGVkID0gZmFsc2U7XG52YXIgcnVuSW1wb3J0ID0gKCkgPT4ge1xuICBpZiAoaW1wb3J0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgO1xuICB0cnkge1xuICAgIE9iamVjdC5hc3NpZ24oQXBwUm91dGVzLCBfcmVxdWlyZSgnUm91dGVzJykuUm91dGVzIHx8IHt9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBnbG9iYWxUaGlzLmRldk1vZGUgPT09IHRydWUgJiYgY29uc29sZS53YXJuKGVycm9yKTtcbiAgfVxuICBpbXBvcnRlZCA9IHRydWU7XG59O1xuY2xhc3MgUm91dGVzIHtcbiAgc3RhdGljIGdldChuYW1lKSB7XG4gICAgcnVuSW1wb3J0KCk7XG4gICAgcmV0dXJuIHRoaXMucm91dGVzW25hbWVdO1xuICB9XG4gIHN0YXRpYyBkdW1wKCkge1xuICAgIHJ1bkltcG9ydCgpO1xuICAgIHJldHVybiB0aGlzLnJvdXRlcztcbiAgfVxufVxuZXhwb3J0cy5Sb3V0ZXMgPSBSb3V0ZXM7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVzLCAncm91dGVzJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogQXBwUm91dGVzXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJ1bGVTZXQgPSB2b2lkIDA7XG52YXIgX0RvbSA9IHJlcXVpcmUoXCIuL0RvbVwiKTtcbnZhciBfVGFnID0gcmVxdWlyZShcIi4vVGFnXCIpO1xudmFyIF9WaWV3ID0gcmVxdWlyZShcIi4vVmlld1wiKTtcbmNsYXNzIFJ1bGVTZXQge1xuICBzdGF0aWMgYWRkKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHRoaXMuZ2xvYmFsUnVsZXMgPSB0aGlzLmdsb2JhbFJ1bGVzIHx8IHt9O1xuICAgIHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdID0gdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0gfHwgW107XG4gICAgdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0ucHVzaChjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgc3RhdGljIGFwcGx5KGRvYyA9IGRvY3VtZW50LCB2aWV3ID0gbnVsbCkge1xuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIHRoaXMuZ2xvYmFsUnVsZXMpIHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl1baV07XG4gICAgICAgIHZhciB3cmFwcGVkID0gdGhpcy53cmFwKGRvYywgY2FsbGJhY2ssIHZpZXcpO1xuICAgICAgICB2YXIgbm9kZXMgPSBkb2MucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGZvciAodmFyIG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICB3cmFwcGVkKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGFkZChzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICB0aGlzLnJ1bGVzID0gdGhpcy5ydWxlcyB8fCB7fTtcbiAgICB0aGlzLnJ1bGVzW3NlbGVjdG9yXSA9IHRoaXMucnVsZXNbc2VsZWN0b3JdIHx8IFtdO1xuICAgIHRoaXMucnVsZXNbc2VsZWN0b3JdLnB1c2goY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIGFwcGx5KGRvYyA9IGRvY3VtZW50LCB2aWV3ID0gbnVsbCkge1xuICAgIFJ1bGVTZXQuYXBwbHkoZG9jLCB2aWV3KTtcbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiB0aGlzLnJ1bGVzKSB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMucnVsZXNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHRoaXMucnVsZXNbc2VsZWN0b3JdW2ldO1xuICAgICAgICB2YXIgd3JhcHBlZCA9IFJ1bGVTZXQud3JhcChkb2MsIGNhbGxiYWNrLCB2aWV3KTtcbiAgICAgICAgdmFyIG5vZGVzID0gZG9jLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBmb3IgKHZhciBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgd3JhcHBlZChub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBwdXJnZSgpIHtcbiAgICBpZiAoIXRoaXMucnVsZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yICh2YXIgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMucnVsZXMpKSB7XG4gICAgICBpZiAoIXRoaXMucnVsZXNba10pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBrayBpbiB0aGlzLnJ1bGVzW2tdKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnJ1bGVzW2tdW2trXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgc3RhdGljIHdhaXQoZXZlbnQgPSAnRE9NQ29udGVudExvYWRlZCcsIG5vZGUgPSBkb2N1bWVudCkge1xuICAgIHZhciBsaXN0ZW5lciA9ICgoZXZlbnQsIG5vZGUpID0+ICgpID0+IHtcbiAgICAgIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXMuYXBwbHkoKTtcbiAgICB9KShldmVudCwgbm9kZSk7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gIH1cbiAgc3RhdGljIHdyYXAoZG9jLCBvcmlnaW5hbENhbGxiYWNrLCB2aWV3ID0gbnVsbCkge1xuICAgIHZhciBjYWxsYmFjayA9IG9yaWdpbmFsQ2FsbGJhY2s7XG4gICAgaWYgKG9yaWdpbmFsQ2FsbGJhY2sgaW5zdGFuY2VvZiBfVmlldy5WaWV3IHx8IG9yaWdpbmFsQ2FsbGJhY2sgJiYgb3JpZ2luYWxDYWxsYmFjay5wcm90b3R5cGUgJiYgb3JpZ2luYWxDYWxsYmFjay5wcm90b3R5cGUgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICBjYWxsYmFjayA9ICgpID0+IG9yaWdpbmFsQ2FsbGJhY2s7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50ID0+IHtcbiAgICAgIGlmICh0eXBlb2YgZWxlbWVudC5fX19jdkFwcGxpZWRfX18gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlbGVtZW50LCAnX19fY3ZBcHBsaWVkX19fJywge1xuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICB2YWx1ZTogbmV3IFdlYWtTZXQoKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChlbGVtZW50Ll9fX2N2QXBwbGllZF9fXy5oYXMob3JpZ2luYWxDYWxsYmFjaykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGRpcmVjdCwgcGFyZW50VmlldztcbiAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgIGRpcmVjdCA9IHBhcmVudFZpZXcgPSB2aWV3O1xuICAgICAgICBpZiAodmlldy52aWV3TGlzdCkge1xuICAgICAgICAgIHBhcmVudFZpZXcgPSB2aWV3LnZpZXdMaXN0LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIHRhZyA9IG5ldyBfVGFnLlRhZyhlbGVtZW50LCBwYXJlbnRWaWV3LCBudWxsLCB1bmRlZmluZWQsIGRpcmVjdCk7XG4gICAgICB2YXIgcGFyZW50ID0gdGFnLmVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgIHZhciBzaWJsaW5nID0gdGFnLmVsZW1lbnQubmV4dFNpYmxpbmc7XG4gICAgICB2YXIgcmVzdWx0ID0gY2FsbGJhY2sodGFnKTtcbiAgICAgIGlmIChyZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICAgIGVsZW1lbnQuX19fY3ZBcHBsaWVkX19fLmFkZChvcmlnaW5hbENhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICByZXN1bHQgPSBuZXcgX1RhZy5UYWcocmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgICBpZiAoIXJlc3VsdC5lbGVtZW50LmNvbnRhaW5zKHRhZy5lbGVtZW50KSkge1xuICAgICAgICAgIHdoaWxlICh0YWcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICByZXN1bHQuZWxlbWVudC5hcHBlbmRDaGlsZCh0YWcuZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaWJsaW5nKSB7XG4gICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShyZXN1bHQuZWxlbWVudCwgc2libGluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKHJlc3VsdC5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQucHJvdG90eXBlICYmIHJlc3VsdC5wcm90b3R5cGUgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIHJlc3VsdCA9IG5ldyByZXN1bHQoe30sIHZpZXcpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICB2aWV3LmNsZWFudXAucHVzaCgoKSA9PiByZXN1bHQucmVtb3ZlKCkpO1xuICAgICAgICAgIHZpZXcuY2xlYW51cC5wdXNoKHZpZXcuYXJncy5iaW5kVG8oKHYsIGssIHQpID0+IHtcbiAgICAgICAgICAgIHRba10gPSB2O1xuICAgICAgICAgICAgcmVzdWx0LmFyZ3Nba10gPSB2O1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgICB2aWV3LmNsZWFudXAucHVzaChyZXN1bHQuYXJncy5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICAgIHRba10gPSB2O1xuICAgICAgICAgICAgdmlldy5hcmdzW2tdID0gdjtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgdGFnLmNsZWFyKCk7XG4gICAgICAgIHJlc3VsdC5yZW5kZXIodGFnLmVsZW1lbnQpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuUnVsZVNldCA9IFJ1bGVTZXQ7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9TZXRNYXAuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlNldE1hcCA9IHZvaWQgMDtcbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShlLCByLCB0KSB7IHJldHVybiAociA9IF90b1Byb3BlcnR5S2V5KHIpKSBpbiBlID8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsIHIsIHsgdmFsdWU6IHQsIGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAgfSkgOiBlW3JdID0gdCwgZTsgfVxuZnVuY3Rpb24gX3RvUHJvcGVydHlLZXkodCkgeyB2YXIgaSA9IF90b1ByaW1pdGl2ZSh0LCBcInN0cmluZ1wiKTsgcmV0dXJuIFwic3ltYm9sXCIgPT0gdHlwZW9mIGkgPyBpIDogaSArIFwiXCI7IH1cbmZ1bmN0aW9uIF90b1ByaW1pdGl2ZSh0LCByKSB7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiB0IHx8ICF0KSByZXR1cm4gdDsgdmFyIGUgPSB0W1N5bWJvbC50b1ByaW1pdGl2ZV07IGlmICh2b2lkIDAgIT09IGUpIHsgdmFyIGkgPSBlLmNhbGwodCwgciB8fCBcImRlZmF1bHRcIik7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiBpKSByZXR1cm4gaTsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkBAdG9QcmltaXRpdmUgbXVzdCByZXR1cm4gYSBwcmltaXRpdmUgdmFsdWUuXCIpOyB9IHJldHVybiAoXCJzdHJpbmdcIiA9PT0gciA/IFN0cmluZyA6IE51bWJlcikodCk7IH1cbmNsYXNzIFNldE1hcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIF9kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIl9tYXBcIiwgbmV3IE1hcCgpKTtcbiAgfVxuICBoYXMoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5oYXMoa2V5KTtcbiAgfVxuICBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgfVxuICBnZXRPbmUoa2V5KSB7XG4gICAgdmFyIHNldCA9IHRoaXMuZ2V0KGtleSk7XG4gICAgZm9yICh2YXIgZW50cnkgb2Ygc2V0KSB7XG4gICAgICByZXR1cm4gZW50cnk7XG4gICAgfVxuICB9XG4gIGFkZChrZXksIHZhbHVlKSB7XG4gICAgdmFyIHNldCA9IHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgICBpZiAoIXNldCkge1xuICAgICAgdGhpcy5fbWFwLnNldChrZXksIHNldCA9IG5ldyBTZXQoKSk7XG4gICAgfVxuICAgIHJldHVybiBzZXQuYWRkKHZhbHVlKTtcbiAgfVxuICByZW1vdmUoa2V5LCB2YWx1ZSkge1xuICAgIHZhciBzZXQgPSB0aGlzLl9tYXAuZ2V0KGtleSk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlcyA9IHNldC5kZWxldGUodmFsdWUpO1xuICAgIGlmICghc2V0LnNpemUpIHtcbiAgICAgIHRoaXMuX21hcC5kZWxldGUoa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuICB2YWx1ZXMoKSB7XG4gICAgcmV0dXJuIG5ldyBTZXQoLi4uWy4uLnRoaXMuX21hcC52YWx1ZXMoKV0ubWFwKHNldCA9PiBbLi4uc2V0LnZhbHVlcygpXSkpO1xuICB9XG59XG5leHBvcnRzLlNldE1hcCA9IFNldE1hcDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1RhZy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVGFnID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIEN1cnJlbnRTdHlsZSA9IFN5bWJvbCgnQ3VycmVudFN0eWxlJyk7XG52YXIgQ3VycmVudEF0dHJzID0gU3ltYm9sKCdDdXJyZW50QXR0cnMnKTtcbnZhciBzdHlsZXIgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gIGlmICghdGhpcy5ub2RlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAodmFyIHByb3BlcnR5IGluIHN0eWxlcykge1xuICAgIHZhciBzdHJpbmdlZFByb3BlcnR5ID0gU3RyaW5nKHN0eWxlc1twcm9wZXJ0eV0pO1xuICAgIGlmICh0aGlzW0N1cnJlbnRTdHlsZV0uaGFzKHByb3BlcnR5KSAmJiB0aGlzW0N1cnJlbnRTdHlsZV0uZ2V0KHByb3BlcnR5KSA9PT0gc3R5bGVzW3Byb3BlcnR5XSB8fCBOdW1iZXIuaXNOYU4oc3R5bGVzW3Byb3BlcnR5XSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAocHJvcGVydHlbMF0gPT09ICctJykge1xuICAgICAgdGhpcy5ub2RlLnN0eWxlLnNldFByb3BlcnR5KHByb3BlcnR5LCBzdHJpbmdlZFByb3BlcnR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ub2RlLnN0eWxlW3Byb3BlcnR5XSA9IHN0cmluZ2VkUHJvcGVydHk7XG4gICAgfVxuICAgIGlmIChzdHlsZXNbcHJvcGVydHldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5zZXQocHJvcGVydHksIHN0eWxlc1twcm9wZXJ0eV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uZGVsZXRlKHByb3BlcnR5KTtcbiAgICB9XG4gIH1cbn07XG52YXIgZ2V0dGVyID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgaWYgKHR5cGVvZiB0aGlzW25hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHRoaXNbbmFtZV07XG4gIH1cbiAgaWYgKHRoaXMubm9kZSAmJiB0eXBlb2YgdGhpcy5ub2RlW25hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHRoaXNbbmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5ub2RlW25hbWVdKC4uLmFyZ3MpO1xuICB9XG4gIGlmIChuYW1lID09PSAnc3R5bGUnKSB7XG4gICAgcmV0dXJuIHRoaXMucHJveHkuc3R5bGU7XG4gIH1cbiAgaWYgKHRoaXMubm9kZSAmJiBuYW1lIGluIHRoaXMubm9kZSkge1xuICAgIHJldHVybiB0aGlzLm5vZGVbbmFtZV07XG4gIH1cbiAgcmV0dXJuIHRoaXNbbmFtZV07XG59O1xuY2xhc3MgVGFnIHtcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgcGFyZW50LCByZWYsIGluZGV4LCBkaXJlY3QpIHtcbiAgICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIgc3ViZG9jID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQoZWxlbWVudCk7XG4gICAgICBlbGVtZW50ID0gc3ViZG9jLmZpcnN0Q2hpbGQ7XG4gICAgfVxuICAgIHRoaXMuZWxlbWVudCA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoZWxlbWVudCk7XG4gICAgdGhpcy5ub2RlID0gdGhpcy5lbGVtZW50O1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuZGlyZWN0ID0gZGlyZWN0O1xuICAgIHRoaXMucmVmID0gcmVmO1xuICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICB0aGlzLmNsZWFudXAgPSBbXTtcbiAgICB0aGlzW19CaW5kYWJsZS5CaW5kYWJsZS5PbkFsbEdldF0gPSBnZXR0ZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzW0N1cnJlbnRTdHlsZV0gPSBuZXcgTWFwKCk7XG4gICAgdGhpc1tDdXJyZW50QXR0cnNdID0gbmV3IE1hcCgpO1xuICAgIHZhciBib3VuZFN0eWxlciA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHN0eWxlci5iaW5kKHRoaXMpKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N0eWxlJywge1xuICAgICAgdmFsdWU6IGJvdW5kU3R5bGVyXG4gICAgfSk7XG4gICAgdGhpcy5wcm94eSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHRoaXMpO1xuICAgIHRoaXMucHJveHkuc3R5bGUuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICBpZiAodGhpc1tDdXJyZW50U3R5bGVdLmhhcyhrKSAmJiB0aGlzW0N1cnJlbnRTdHlsZV0uZ2V0KGspID09PSB2KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMubm9kZS5zdHlsZVtrXSA9IHY7XG4gICAgICBpZiAoIWQgJiYgdiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5zZXQoaywgdik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uZGVsZXRlKGspO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucHJveHkuYmluZFRvKCh2LCBrKSA9PiB7XG4gICAgICBpZiAoayA9PT0gJ2luZGV4Jykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoayBpbiBlbGVtZW50ICYmIGVsZW1lbnRba10gIT09IHYpIHtcbiAgICAgICAgZWxlbWVudFtrXSA9IHY7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucHJveHk7XG4gIH1cbiAgYXR0cihhdHRyaWJ1dGVzKSB7XG4gICAgZm9yICh2YXIgYXR0cmlidXRlIGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgIGlmICh0aGlzW0N1cnJlbnRBdHRyc10uaGFzKGF0dHJpYnV0ZSkgJiYgYXR0cmlidXRlc1thdHRyaWJ1dGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5ub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICAgICAgICB0aGlzW0N1cnJlbnRBdHRyc10uZGVsZXRlKGF0dHJpYnV0ZSk7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzW0N1cnJlbnRBdHRyc10uaGFzKGF0dHJpYnV0ZSkgfHwgdGhpc1tDdXJyZW50QXR0cnNdLmdldChhdHRyaWJ1dGUpICE9PSBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pIHtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9PT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMubm9kZS5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCAnJyk7XG4gICAgICAgICAgdGhpc1tDdXJyZW50QXR0cnNdLnNldChhdHRyaWJ1dGUsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLm5vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZSwgYXR0cmlidXRlc1thdHRyaWJ1dGVdKTtcbiAgICAgICAgICB0aGlzW0N1cnJlbnRBdHRyc10uc2V0KGF0dHJpYnV0ZSwgYXR0cmlidXRlc1thdHRyaWJ1dGVdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICByZW1vdmUoKSB7XG4gICAgaWYgKHRoaXMubm9kZSkge1xuICAgICAgdGhpcy5ub2RlLnJlbW92ZSgpO1xuICAgIH1cbiAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzKTtcbiAgICB2YXIgY2xlYW51cDtcbiAgICB3aGlsZSAoY2xlYW51cCA9IHRoaXMuY2xlYW51cC5zaGlmdCgpKSB7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfVxuICAgIHRoaXMuY2xlYXIoKTtcbiAgICBpZiAoIXRoaXMubm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZGV0YWNoRXZlbnQgPSBuZXcgRXZlbnQoJ2N2RG9tRGV0YWNoZWQnKTtcbiAgICB0aGlzLm5vZGUuZGlzcGF0Y2hFdmVudChkZXRhY2hFdmVudCk7XG4gICAgdGhpcy5ub2RlID0gdGhpcy5lbGVtZW50ID0gdGhpcy5yZWYgPSB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZDtcbiAgfVxuICBjbGVhcigpIHtcbiAgICBpZiAoIXRoaXMubm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZGV0YWNoRXZlbnQgPSBuZXcgRXZlbnQoJ2N2RG9tRGV0YWNoZWQnKTtcbiAgICB3aGlsZSAodGhpcy5ub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMubm9kZS5maXJzdENoaWxkLmRpc3BhdGNoRXZlbnQoZGV0YWNoRXZlbnQpO1xuICAgICAgdGhpcy5ub2RlLnJlbW92ZUNoaWxkKHRoaXMubm9kZS5maXJzdENoaWxkKTtcbiAgICB9XG4gIH1cbiAgcGF1c2UocGF1c2VkID0gdHJ1ZSkge31cbiAgbGlzdGVuKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMubm9kZTtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgdmFyIHJlbW92ZSA9ICgpID0+IHtcbiAgICAgIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHZhciByZW1vdmVyID0gKCkgPT4ge1xuICAgICAgcmVtb3ZlKCk7XG4gICAgICByZW1vdmUgPSAoKSA9PiBjb25zb2xlLndhcm4oJ0FscmVhZHkgcmVtb3ZlZCEnKTtcbiAgICB9O1xuICAgIHRoaXMucGFyZW50Lm9uUmVtb3ZlKCgpID0+IHJlbW92ZXIoKSk7XG4gICAgcmV0dXJuIHJlbW92ZXI7XG4gIH1cbn1cbmV4cG9ydHMuVGFnID0gVGFnO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVXVpZC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVXVpZCA9IHZvaWQgMDtcbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShlLCByLCB0KSB7IHJldHVybiAociA9IF90b1Byb3BlcnR5S2V5KHIpKSBpbiBlID8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsIHIsIHsgdmFsdWU6IHQsIGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAgfSkgOiBlW3JdID0gdCwgZTsgfVxuZnVuY3Rpb24gX3RvUHJvcGVydHlLZXkodCkgeyB2YXIgaSA9IF90b1ByaW1pdGl2ZSh0LCBcInN0cmluZ1wiKTsgcmV0dXJuIFwic3ltYm9sXCIgPT0gdHlwZW9mIGkgPyBpIDogaSArIFwiXCI7IH1cbmZ1bmN0aW9uIF90b1ByaW1pdGl2ZSh0LCByKSB7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiB0IHx8ICF0KSByZXR1cm4gdDsgdmFyIGUgPSB0W1N5bWJvbC50b1ByaW1pdGl2ZV07IGlmICh2b2lkIDAgIT09IGUpIHsgdmFyIGkgPSBlLmNhbGwodCwgciB8fCBcImRlZmF1bHRcIik7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiBpKSByZXR1cm4gaTsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkBAdG9QcmltaXRpdmUgbXVzdCByZXR1cm4gYSBwcmltaXRpdmUgdmFsdWUuXCIpOyB9IHJldHVybiAoXCJzdHJpbmdcIiA9PT0gciA/IFN0cmluZyA6IE51bWJlcikodCk7IH1cbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xudmFyIGNyeXB0byA9IHdpbi5jcnlwdG87XG5jbGFzcyBVdWlkIHtcbiAgY29uc3RydWN0b3IodXVpZCA9IG51bGwsIHZlcnNpb24gPSA0KSB7XG4gICAgX2RlZmluZVByb3BlcnR5KHRoaXMsIFwidXVpZFwiLCBudWxsKTtcbiAgICBfZGVmaW5lUHJvcGVydHkodGhpcywgXCJ2ZXJzaW9uXCIsIDQpO1xuICAgIGlmICh1dWlkKSB7XG4gICAgICBpZiAodHlwZW9mIHV1aWQgIT09ICdzdHJpbmcnICYmICEodXVpZCBpbnN0YW5jZW9mIFV1aWQpIHx8ICF1dWlkLm1hdGNoKC9bMC05QS1GYS1mXXs4fSgtWzAtOUEtRmEtZl17NH0pezN9LVswLTlBLUZhLWZdezEyfS8pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBpbnB1dCBmb3IgVXVpZDogXCIke3V1aWR9XCJgKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudmVyc2lvbiA9IHZlcnNpb247XG4gICAgICB0aGlzLnV1aWQgPSB1dWlkO1xuICAgIH0gZWxzZSBpZiAoY3J5cHRvICYmIHR5cGVvZiBjcnlwdG8ucmFuZG9tVVVJRCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy51dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGluaXQgPSBbMWU3XSArIC0xZTMgKyAtNGUzICsgLThlMyArIC0xZTExO1xuICAgICAgdmFyIHJhbmQgPSBjcnlwdG8gJiYgdHlwZW9mIGNyeXB0by5yYW5kb21VVUlEID09PSAnZnVuY3Rpb24nID8gKCkgPT4gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDhBcnJheSgxKSlbMF0gOiAoKSA9PiBNYXRoLnRydW5jKE1hdGgucmFuZG9tKCkgKiAyNTYpO1xuICAgICAgdGhpcy51dWlkID0gaW5pdC5yZXBsYWNlKC9bMDE4XS9nLCBjID0+IChjIF4gcmFuZCgpICYgMTUgPj4gYyAvIDQpLnRvU3RyaW5nKDE2KSk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH1cbiAgW1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbiAgfVxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy51dWlkO1xuICB9XG4gIHRvSnNvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuICAgICAgdXVpZDogdGhpcy51dWlkXG4gICAgfTtcbiAgfVxufVxuZXhwb3J0cy5VdWlkID0gVXVpZDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1ZpZXcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlZpZXcgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgX1ZpZXdMaXN0ID0gcmVxdWlyZShcIi4vVmlld0xpc3RcIik7XG52YXIgX1JvdXRlciA9IHJlcXVpcmUoXCIuL1JvdXRlclwiKTtcbnZhciBfVXVpZCA9IHJlcXVpcmUoXCIuL1V1aWRcIik7XG52YXIgX0RvbSA9IHJlcXVpcmUoXCIuL0RvbVwiKTtcbnZhciBfVGFnID0gcmVxdWlyZShcIi4vVGFnXCIpO1xudmFyIF9CYWcgPSByZXF1aXJlKFwiLi9CYWdcIik7XG52YXIgX1J1bGVTZXQgPSByZXF1aXJlKFwiLi9SdWxlU2V0XCIpO1xudmFyIF9NaXhpbiA9IHJlcXVpcmUoXCIuL01peGluXCIpO1xudmFyIF9FdmVudFRhcmdldE1peGluID0gcmVxdWlyZShcIi4uL21peGluL0V2ZW50VGFyZ2V0TWl4aW5cIik7XG52YXIgZG9udFBhcnNlID0gU3ltYm9sKCdkb250UGFyc2UnKTtcbnZhciBleHBhbmRCaW5kID0gU3ltYm9sKCdleHBhbmRCaW5kJyk7XG52YXIgdXVpZCA9IFN5bWJvbCgndXVpZCcpO1xuY2xhc3MgVmlldyBleHRlbmRzIF9NaXhpbi5NaXhpbi53aXRoKF9FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4pIHtcbiAgZ2V0IF9pZCgpIHtcbiAgICByZXR1cm4gdGhpc1t1dWlkXTtcbiAgfVxuICBzdGF0aWMgZnJvbSh0ZW1wbGF0ZSwgYXJncyA9IHt9LCBtYWluVmlldyA9IG51bGwpIHtcbiAgICB2YXIgdmlldyA9IG5ldyB0aGlzKGFyZ3MsIG1haW5WaWV3KTtcbiAgICB2aWV3LnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgcmV0dXJuIHZpZXc7XG4gIH1cbiAgY29uc3RydWN0b3IoYXJncyA9IHt9LCBtYWluVmlldyA9IG51bGwpIHtcbiAgICBzdXBlcihhcmdzLCBtYWluVmlldyk7XG4gICAgdGhpc1tfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSBtYWluVmlldztcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2FyZ3MnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoYXJncylcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgdXVpZCwge1xuICAgICAgdmFsdWU6IHRoaXMuY29uc3RydWN0b3IudXVpZCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdub2Rlc0F0dGFjaGVkJywge1xuICAgICAgdmFsdWU6IG5ldyBfQmFnLkJhZygoaSwgcywgYSkgPT4ge30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdub2Rlc0RldGFjaGVkJywge1xuICAgICAgdmFsdWU6IG5ldyBfQmFnLkJhZygoaSwgcywgYSkgPT4ge30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfb25SZW1vdmUnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9CYWcuQmFnKChpLCBzLCBhKSA9PiB7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2NsZWFudXAnLCB7XG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3BhcmVudCcsIHtcbiAgICAgIHZhbHVlOiBtYWluVmlldyxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd2aWV3cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ZpZXdMaXN0cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3dpdGhWaWV3cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RhZ3MnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdub2RlcycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZShbXSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RpbWVvdXRzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaW50ZXJ2YWxzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZnJhbWVzJywge1xuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdydWxlU2V0Jywge1xuICAgICAgdmFsdWU6IG5ldyBfUnVsZVNldC5SdWxlU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZVJ1bGVTZXQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9SdWxlU2V0LlJ1bGVTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc3ViQmluZGluZ3MnLCB7XG4gICAgICB2YWx1ZToge31cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RlbXBsYXRlcycsIHtcbiAgICAgIHZhbHVlOiB7fVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncG9zdE1hcHBpbmcnLCB7XG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdldmVudENsZWFudXAnLCB7XG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3VucGF1c2VDYWxsYmFja3MnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdpbnRlcnBvbGF0ZVJlZ2V4Jywge1xuICAgICAgdmFsdWU6IC8oXFxbXFxbKCg/OlxcJCspP1tcXHdcXC5cXHwtXSspXFxdXFxdKS9nXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZW5kZXJlZCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpID0+IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVuZGVyQ29tcGxldGUnLCB7XG4gICAgICAgIHZhbHVlOiBhY2NlcHRcbiAgICAgIH0pKVxuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzW19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzW19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IG51bGw7XG4gICAgfSk7XG4gICAgdGhpcy5jb250cm9sbGVyID0gdGhpcztcbiAgICB0aGlzLnRlbXBsYXRlID0gYGA7XG4gICAgdGhpcy5maXJzdE5vZGUgPSBudWxsO1xuICAgIHRoaXMubGFzdE5vZGUgPSBudWxsO1xuICAgIHRoaXMudmlld0xpc3QgPSBudWxsO1xuICAgIHRoaXMubWFpblZpZXcgPSBudWxsO1xuICAgIHRoaXMucHJlc2VydmUgPSBmYWxzZTtcbiAgICB0aGlzLnJlbW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxvYWRlZCA9IFByb21pc2UucmVzb2x2ZSh0aGlzKTtcblxuICAgIC8vIHJldHVybiBCaW5kYWJsZS5tYWtlKHRoaXMpO1xuICB9XG4gIHN0YXRpYyBpc1ZpZXcoKSB7XG4gICAgcmV0dXJuIFZpZXc7XG4gIH1cbiAgb25GcmFtZShjYWxsYmFjaykge1xuICAgIHZhciBzdG9wcGVkID0gZmFsc2U7XG4gICAgdmFyIGNhbmNlbCA9ICgpID0+IHtcbiAgICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgIH07XG4gICAgdmFyIGMgPSB0aW1lc3RhbXAgPT4ge1xuICAgICAgaWYgKHRoaXMucmVtb3ZlZCB8fCBzdG9wcGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgY2FsbGJhY2soRGF0ZS5ub3coKSk7XG4gICAgICB9XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYyk7XG4gICAgfTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gYyhEYXRlLm5vdygpKSk7XG4gICAgdGhpcy5mcmFtZXMucHVzaChjYW5jZWwpO1xuICAgIHJldHVybiBjYW5jZWw7XG4gIH1cbiAgb25OZXh0RnJhbWUoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGNhbGxiYWNrKERhdGUubm93KCkpKTtcbiAgfVxuICBvbklkbGUoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gcmVxdWVzdElkbGVDYWxsYmFjaygoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSk7XG4gIH1cbiAgb25UaW1lb3V0KHRpbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRpbWVvdXRJbmZvID0ge1xuICAgICAgdGltZW91dDogbnVsbCxcbiAgICAgIGNhbGxiYWNrOiBudWxsLFxuICAgICAgdGltZTogdGltZSxcbiAgICAgIGZpcmVkOiBmYWxzZSxcbiAgICAgIGNyZWF0ZWQ6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgcGF1c2VkOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIHdyYXBwZWRDYWxsYmFjayA9ICgpID0+IHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB0aW1lb3V0SW5mby5maXJlZCA9IHRydWU7XG4gICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgICB9O1xuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dCh3cmFwcGVkQ2FsbGJhY2ssIHRpbWUpO1xuICAgIHRpbWVvdXRJbmZvLmNhbGxiYWNrID0gd3JhcHBlZENhbGxiYWNrO1xuICAgIHRpbWVvdXRJbmZvLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgIHRoaXMudGltZW91dHMuc2V0KHRpbWVvdXRJbmZvLnRpbWVvdXQsIHRpbWVvdXRJbmZvKTtcbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxuICBjbGVhclRpbWVvdXQodGltZW91dCkge1xuICAgIGlmICghdGhpcy50aW1lb3V0cy5oYXModGltZW91dCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXRJbmZvID0gdGhpcy50aW1lb3V0cy5nZXQodGltZW91dCk7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICB9XG4gIG9uSW50ZXJ2YWwodGltZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgdGltZW91dCA9IHNldEludGVydmFsKGNhbGxiYWNrLCB0aW1lKTtcbiAgICB0aGlzLmludGVydmFscy5zZXQodGltZW91dCwge1xuICAgICAgdGltZW91dDogdGltZW91dCxcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcbiAgICAgIHRpbWU6IHRpbWUsXG4gICAgICBwYXVzZWQ6IGZhbHNlXG4gICAgfSk7XG4gICAgcmV0dXJuIHRpbWVvdXQ7XG4gIH1cbiAgY2xlYXJJbnRlcnZhbCh0aW1lb3V0KSB7XG4gICAgaWYgKCF0aGlzLmludGVydmFscy5oYXModGltZW91dCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXRJbmZvID0gdGhpcy5pbnRlcnZhbHMuZ2V0KHRpbWVvdXQpO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgICB0aGlzLmludGVydmFscy5kZWxldGUodGltZW91dEluZm8udGltZW91dCk7XG4gIH1cbiAgcGF1c2UocGF1c2VkID0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHBhdXNlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnBhdXNlZCA9ICF0aGlzLnBhdXNlZDtcbiAgICB9XG4gICAgdGhpcy5wYXVzZWQgPSBwYXVzZWQ7XG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICBmb3IgKHZhciBbY2FsbGJhY2ssIHRpbWVvdXRdIG9mIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgaWYgKHRpbWVvdXQuZmlyZWQpIHtcbiAgICAgICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0LnBhdXNlZCA9IHRydWU7XG4gICAgICAgIHRpbWVvdXQudGltZSA9IE1hdGgubWF4KDAsIHRpbWVvdXQudGltZSAtIChEYXRlLm5vdygpIC0gdGltZW91dC5jcmVhdGVkKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBbX2NhbGxiYWNrLCBfdGltZW91dF0gb2YgdGhpcy5pbnRlcnZhbHMpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChfdGltZW91dC50aW1lb3V0KTtcbiAgICAgICAgX3RpbWVvdXQucGF1c2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgW19jYWxsYmFjazIsIF90aW1lb3V0Ml0gb2YgdGhpcy50aW1lb3V0cykge1xuICAgICAgICBpZiAoIV90aW1lb3V0Mi5wYXVzZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoX3RpbWVvdXQyLmZpcmVkKSB7XG4gICAgICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUoX3RpbWVvdXQyLnRpbWVvdXQpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIF90aW1lb3V0Mi50aW1lb3V0ID0gc2V0VGltZW91dChfdGltZW91dDIuY2FsbGJhY2ssIF90aW1lb3V0Mi50aW1lKTtcbiAgICAgICAgX3RpbWVvdXQyLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgW19jYWxsYmFjazMsIF90aW1lb3V0M10gb2YgdGhpcy5pbnRlcnZhbHMpIHtcbiAgICAgICAgaWYgKCFfdGltZW91dDMucGF1c2VkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgX3RpbWVvdXQzLnRpbWVvdXQgPSBzZXRJbnRlcnZhbChfdGltZW91dDMuY2FsbGJhY2ssIF90aW1lb3V0My50aW1lKTtcbiAgICAgICAgX3RpbWVvdXQzLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgWywgX2NhbGxiYWNrNF0gb2YgdGhpcy51bnBhdXNlQ2FsbGJhY2tzKSB7XG4gICAgICAgIF9jYWxsYmFjazQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudW5wYXVzZUNhbGxiYWNrcy5jbGVhcigpO1xuICAgIH1cbiAgICBmb3IgKHZhciBbdGFnLCB2aWV3TGlzdF0gb2YgdGhpcy52aWV3TGlzdHMpIHtcbiAgICAgIHZpZXdMaXN0LnBhdXNlKCEhcGF1c2VkKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnRhZ3MpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMudGFnc1tpXSkpIHtcbiAgICAgICAgZm9yICh2YXIgaiBpbiB0aGlzLnRhZ3NbaV0pIHtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV1bal0ucGF1c2UoISFwYXVzZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy50YWdzW2ldLnBhdXNlKCEhcGF1c2VkKTtcbiAgICB9XG4gIH1cbiAgcmVuZGVyKHBhcmVudE5vZGUgPSBudWxsLCBpbnNlcnRQb2ludCA9IG51bGwsIG91dGVyVmlldyA9IG51bGwpIHtcbiAgICB2YXIge1xuICAgICAgZG9jdW1lbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgaWYgKHBhcmVudE5vZGUgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5maXJzdE5vZGUucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgaWYgKGluc2VydFBvaW50IGluc3RhbmNlb2YgVmlldykge1xuICAgICAgaW5zZXJ0UG9pbnQgPSBpbnNlcnRQb2ludC5maXJzdE5vZGU7XG4gICAgfVxuICAgIGlmICh0aGlzLmZpcnN0Tm9kZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVSZW5kZXIocGFyZW50Tm9kZSwgaW5zZXJ0UG9pbnQsIG91dGVyVmlldyk7XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbmRlcicpKTtcbiAgICB2YXIgdGVtcGxhdGVJc0ZyYWdtZW50ID0gdHlwZW9mIHRoaXMudGVtcGxhdGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiB0aGlzLnRlbXBsYXRlLmNsb25lTm9kZSA9PT0gJ2Z1bmN0aW9uJztcbiAgICB2YXIgdGVtcGxhdGVQYXJzZWQgPSB0ZW1wbGF0ZUlzRnJhZ21lbnQgfHwgVmlldy50ZW1wbGF0ZXMuaGFzKHRoaXMudGVtcGxhdGUpO1xuICAgIHZhciBzdWJEb2M7XG4gICAgaWYgKHRlbXBsYXRlUGFyc2VkKSB7XG4gICAgICBpZiAodGVtcGxhdGVJc0ZyYWdtZW50KSB7XG4gICAgICAgIHN1YkRvYyA9IHRoaXMudGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3ViRG9jID0gVmlldy50ZW1wbGF0ZXMuZ2V0KHRoaXMudGVtcGxhdGUpLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3ViRG9jID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQodGhpcy50ZW1wbGF0ZSk7XG4gICAgfVxuICAgIGlmICghdGVtcGxhdGVQYXJzZWQgJiYgIXRlbXBsYXRlSXNGcmFnbWVudCkge1xuICAgICAgVmlldy50ZW1wbGF0ZXMuc2V0KHRoaXMudGVtcGxhdGUsIHN1YkRvYy5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIH1cbiAgICB0aGlzLm1haW5WaWV3IHx8IHRoaXMucHJlUnVsZVNldC5hcHBseShzdWJEb2MsIHRoaXMpO1xuICAgIHRoaXMubWFwVGFncyhzdWJEb2MpO1xuICAgIHRoaXMubWFpblZpZXcgfHwgdGhpcy5ydWxlU2V0LmFwcGx5KHN1YkRvYywgdGhpcyk7XG4gICAgaWYgKGdsb2JhbFRoaXMuZGV2TW9kZSA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5maXJzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVDb21tZW50KGBUZW1wbGF0ZSAke3RoaXMuX2lkfSBTdGFydGApO1xuICAgICAgdGhpcy5sYXN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoYFRlbXBsYXRlICR7dGhpcy5faWR9IEVuZGApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZpcnN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIHRoaXMubGFzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuICAgIHRoaXMubm9kZXMucHVzaCh0aGlzLmZpcnN0Tm9kZSwgLi4uQXJyYXkuZnJvbShzdWJEb2MuY2hpbGROb2RlcyksIHRoaXMubGFzdE5vZGUpO1xuICAgIHRoaXMucG9zdFJlbmRlcihwYXJlbnROb2RlKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW5kZXJlZCcpKTtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hBdHRhY2goKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgaWYgKGluc2VydFBvaW50KSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBudWxsKTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgbnVsbCk7XG4gICAgICB9XG4gICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShzdWJEb2MsIHRoaXMubGFzdE5vZGUpO1xuICAgICAgdmFyIHJvb3ROb2RlID0gcGFyZW50Tm9kZS5nZXRSb290Tm9kZSgpO1xuICAgICAgaWYgKHJvb3ROb2RlLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUsIG91dGVyVmlldyk7XG4gICAgICB9IGVsc2UgaWYgKG91dGVyVmlldykge1xuICAgICAgICB2YXIgZmlyc3REb21BdHRhY2ggPSBldmVudCA9PiB7XG4gICAgICAgICAgdmFyIHJvb3ROb2RlID0gcGFyZW50Tm9kZS5nZXRSb290Tm9kZSgpO1xuICAgICAgICAgIHRoaXMuYXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgICAgIHRoaXMuZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSwgb3V0ZXJWaWV3KTtcbiAgICAgICAgICBvdXRlclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcignYXR0YWNoZWQnLCBmaXJzdERvbUF0dGFjaCk7XG4gICAgICAgIH07XG4gICAgICAgIG91dGVyVmlldy5hZGRFdmVudExpc3RlbmVyKCdhdHRhY2hlZCcsIGZpcnN0RG9tQXR0YWNoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5yZW5kZXJDb21wbGV0ZSh0aGlzLm5vZGVzKTtcbiAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgfVxuICBkaXNwYXRjaEF0dGFjaCgpIHtcbiAgICB2YXIge1xuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2F0dGFjaCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICB0YXJnZXQ6IHRoaXNcbiAgICB9KSk7XG4gIH1cbiAgZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSwgdmlldyA9IHVuZGVmaW5lZCkge1xuICAgIHZhciB7XG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhdHRhY2hlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgIG5vZGU6IHBhcmVudE5vZGUsXG4gICAgICAgIHJvb3Q6IHJvb3ROb2RlLFxuICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgfVxuICAgIH0pKTtcbiAgICB0aGlzLmRpc3BhdGNoRG9tQXR0YWNoZWQodmlldyk7XG4gICAgZm9yICh2YXIgY2FsbGJhY2sgb2YgdGhpcy5ub2Rlc0F0dGFjaGVkLml0ZW1zKCkpIHtcbiAgICAgIGNhbGxiYWNrKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICB9XG4gIH1cbiAgZGlzcGF0Y2hEb21BdHRhY2hlZCh2aWV3KSB7XG4gICAgdmFyIHtcbiAgICAgIE5vZGUsXG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB0aGlzLm5vZGVzLmZpbHRlcihuID0+IG4ubm9kZVR5cGUgIT09IE5vZGUuQ09NTUVOVF9OT0RFKS5mb3JFYWNoKGNoaWxkID0+IHtcbiAgICAgIGlmICghY2hpbGQubWF0Y2hlcykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjaGlsZC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZEb21BdHRhY2hlZCcsIHtcbiAgICAgICAgdGFyZ2V0OiBjaGlsZCxcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICAgIF9Eb20uRG9tLm1hcFRhZ3MoY2hpbGQsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgICAgaWYgKCF0YWcubWF0Y2hlcykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tQXR0YWNoZWQnLCB7XG4gICAgICAgICAgdGFyZ2V0OiB0YWcsXG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmVSZW5kZXIocGFyZW50Tm9kZSwgaW5zZXJ0UG9pbnQsIG91dGVyVmlldykge1xuICAgIHZhciB7XG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB2YXIgd2lsbFJlUmVuZGVyID0gdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVSZW5kZXInKSwge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIHRhcmdldDogdGhpcyxcbiAgICAgIHZpZXc6IG91dGVyVmlld1xuICAgIH0pO1xuICAgIGlmICghd2lsbFJlUmVuZGVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBzdWJEb2MgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIGlmICh0aGlzLmZpcnN0Tm9kZS5pc0Nvbm5lY3RlZCkge1xuICAgICAgdmFyIGRldGFjaCA9IHRoaXMubm9kZXNEZXRhY2hlZC5pdGVtcygpO1xuICAgICAgZm9yICh2YXIgaSBpbiBkZXRhY2gpIHtcbiAgICAgICAgZGV0YWNoW2ldKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHN1YkRvYy5hcHBlbmQoLi4udGhpcy5ub2Rlcyk7XG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgIGlmIChpbnNlcnRQb2ludCkge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgbnVsbCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIG51bGwpO1xuICAgICAgfVxuICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3ViRG9jLCB0aGlzLmxhc3ROb2RlKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlUmVuZGVyZWQnKSwge1xuICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICB0YXJnZXQ6IHRoaXMsXG4gICAgICAgIHZpZXc6IG91dGVyVmlld1xuICAgICAgfSk7XG4gICAgICB2YXIgcm9vdE5vZGUgPSBwYXJlbnROb2RlLmdldFJvb3ROb2RlKCk7XG4gICAgICBpZiAocm9vdE5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICB9XG4gIG1hcFRhZ3Moc3ViRG9jKSB7XG4gICAgX0RvbS5Eb20ubWFwVGFncyhzdWJEb2MsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgIGlmICh0YWdbZG9udFBhcnNlXSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGFnLm1hdGNoZXMpIHtcbiAgICAgICAgdGFnID0gdGhpcy5tYXBJbnRlcnBvbGF0YWJsZVRhZyh0YWcpO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXRlbXBsYXRlXScpICYmIHRoaXMubWFwVGVtcGxhdGVUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytc2xvdF0nKSAmJiB0aGlzLm1hcFNsb3RUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtcHJlcmVuZGVyXScpICYmIHRoaXMubWFwUHJlbmRlcmVyVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWxpbmtdJykgJiYgdGhpcy5tYXBMaW5rVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWF0dHJdJykgJiYgdGhpcy5tYXBBdHRyVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWV4cGFuZF0nKSAmJiB0aGlzLm1hcEV4cGFuZGFibGVUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtcmVmXScpICYmIHRoaXMubWFwUmVmVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LW9uXScpICYmIHRoaXMubWFwT25UYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtZWFjaF0nKSAmJiB0aGlzLm1hcEVhY2hUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtYmluZF0nKSAmJiB0aGlzLm1hcEJpbmRUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytd2l0aF0nKSAmJiB0aGlzLm1hcFdpdGhUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtaWZdJykgJiYgdGhpcy5tYXBJZlRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi12aWV3XScpICYmIHRoaXMubWFwVmlld1RhZyh0YWcpIHx8IHRhZztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhZyA9IHRoaXMubWFwSW50ZXJwb2xhdGFibGVUYWcodGFnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0YWcgIT09IHdhbGtlci5jdXJyZW50Tm9kZSkge1xuICAgICAgICB3YWxrZXIuY3VycmVudE5vZGUgPSB0YWc7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wb3N0TWFwcGluZy5mb3JFYWNoKGMgPT4gYygpKTtcbiAgfVxuICBtYXBFeHBhbmRhYmxlVGFnKHRhZykge1xuICAgIC8vIGNvbnN0IHRhZ0NvbXBpbGVyID0gdGhpcy5jb21waWxlRXhwYW5kYWJsZVRhZyh0YWcpO1xuICAgIC8vIGNvbnN0IG5ld1RhZyA9IHRhZ0NvbXBpbGVyKHRoaXMpO1xuICAgIC8vIHRhZy5yZXBsYWNlV2l0aChuZXdUYWcpO1xuICAgIC8vIHJldHVybiBuZXdUYWc7XG5cbiAgICB2YXIgZXhpc3RpbmcgPSB0YWdbZXhwYW5kQmluZF07XG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICBleGlzdGluZygpO1xuICAgICAgdGFnW2V4cGFuZEJpbmRdID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBbcHJveHksIGV4cGFuZFByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKHRoaXMuYXJncywgdGFnLmdldEF0dHJpYnV0ZSgnY3YtZXhwYW5kJyksIHRydWUpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuICAgIGlmICghcHJveHlbZXhwYW5kUHJvcGVydHldKSB7XG4gICAgICBwcm94eVtleHBhbmRQcm9wZXJ0eV0gPSB7fTtcbiAgICB9XG4gICAgcHJveHlbZXhwYW5kUHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UocHJveHlbZXhwYW5kUHJvcGVydHldKTtcbiAgICB0aGlzLm9uUmVtb3ZlKHRhZ1tleHBhbmRCaW5kXSA9IHByb3h5W2V4cGFuZFByb3BlcnR5XS5iaW5kVG8oKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgIGlmIChkIHx8IHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0YWcucmVtb3ZlQXR0cmlidXRlKGssIHYpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodiA9PT0gbnVsbCkge1xuICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGssICcnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGFnLnNldEF0dHJpYnV0ZShrLCB2KTtcbiAgICB9KSk7XG5cbiAgICAvLyBsZXQgZXhwYW5kUHJvcGVydHkgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1leHBhbmQnKTtcbiAgICAvLyBsZXQgZXhwYW5kQXJnID0gQmluZGFibGUubWFrZUJpbmRhYmxlKFxuICAgIC8vIFx0dGhpcy5hcmdzW2V4cGFuZFByb3BlcnR5XSB8fCB7fVxuICAgIC8vICk7XG5cbiAgICAvLyB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1leHBhbmQnKTtcblxuICAgIC8vIGZvcihsZXQgaSBpbiBleHBhbmRBcmcpXG4gICAgLy8ge1xuICAgIC8vIFx0aWYoaSA9PT0gJ25hbWUnIHx8IGkgPT09ICd0eXBlJylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0Y29udGludWU7XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGxldCBkZWJpbmQgPSBleHBhbmRBcmcuYmluZFRvKGksICgodGFnLGkpPT4odik9PntcbiAgICAvLyBcdFx0dGFnLnNldEF0dHJpYnV0ZShpLCB2KTtcbiAgICAvLyBcdH0pKHRhZyxpKSk7XG5cbiAgICAvLyBcdHRoaXMub25SZW1vdmUoKCk9PntcbiAgICAvLyBcdFx0ZGViaW5kKCk7XG4gICAgLy8gXHRcdGlmKGV4cGFuZEFyZy5pc0JvdW5kKCkpXG4gICAgLy8gXHRcdHtcbiAgICAvLyBcdFx0XHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKGV4cGFuZEFyZyk7XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdH0pO1xuICAgIC8vIH1cblxuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBjb21waWxlRXhwYW5kYWJsZVRhZyhzb3VyY2VUYWcpXG4gIC8vIHtcbiAgLy8gXHRyZXR1cm4gKGJpbmRpbmdWaWV3KSA9PiB7XG5cbiAgLy8gXHRcdGNvbnN0IHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUodHJ1ZSk7XG5cbiAgLy8gXHRcdGxldCBleHBhbmRQcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuICAvLyBcdFx0bGV0IGV4cGFuZEFyZyA9IEJpbmRhYmxlLm1ha2UoXG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3LmFyZ3NbZXhwYW5kUHJvcGVydHldIHx8IHt9XG4gIC8vIFx0XHQpO1xuXG4gIC8vIFx0XHR0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1leHBhbmQnKTtcblxuICAvLyBcdFx0Zm9yKGxldCBpIGluIGV4cGFuZEFyZylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0aWYoaSA9PT0gJ25hbWUnIHx8IGkgPT09ICd0eXBlJylcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdGNvbnRpbnVlO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0bGV0IGRlYmluZCA9IGV4cGFuZEFyZy5iaW5kVG8oaSwgKCh0YWcsaSk9Pih2KT0+e1xuICAvLyBcdFx0XHRcdHRhZy5zZXRBdHRyaWJ1dGUoaSwgdik7XG4gIC8vIFx0XHRcdH0pKHRhZyxpKSk7XG5cbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcub25SZW1vdmUoKCk9PntcbiAgLy8gXHRcdFx0XHRkZWJpbmQoKTtcbiAgLy8gXHRcdFx0XHRpZihleHBhbmRBcmcuaXNCb3VuZCgpKVxuICAvLyBcdFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3MoZXhwYW5kQXJnKTtcbiAgLy8gXHRcdFx0XHR9XG4gIC8vIFx0XHRcdH0pO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRyZXR1cm4gdGFnO1xuICAvLyBcdH07XG4gIC8vIH1cblxuICBtYXBBdHRyVGFnKHRhZykge1xuICAgIHZhciB0YWdDb21waWxlciA9IHRoaXMuY29tcGlsZUF0dHJUYWcodGFnKTtcbiAgICB2YXIgbmV3VGFnID0gdGFnQ29tcGlsZXIodGhpcyk7XG4gICAgdGFnLnJlcGxhY2VXaXRoKG5ld1RhZyk7XG4gICAgcmV0dXJuIG5ld1RhZztcblxuICAgIC8vIGxldCBhdHRyUHJvcGVydHkgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1hdHRyJyk7XG5cbiAgICAvLyB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1hdHRyJyk7XG5cbiAgICAvLyBsZXQgcGFpcnMgPSBhdHRyUHJvcGVydHkuc3BsaXQoJywnKTtcbiAgICAvLyBsZXQgYXR0cnMgPSBwYWlycy5tYXAoKHApID0+IHAuc3BsaXQoJzonKSk7XG5cbiAgICAvLyBmb3IgKGxldCBpIGluIGF0dHJzKVxuICAgIC8vIHtcbiAgICAvLyBcdGxldCBwcm94eSAgICAgICAgPSB0aGlzLmFyZ3M7XG4gICAgLy8gXHRsZXQgYmluZFByb3BlcnR5ID0gYXR0cnNbaV1bMV07XG4gICAgLy8gXHRsZXQgcHJvcGVydHkgICAgID0gYmluZFByb3BlcnR5O1xuXG4gICAgLy8gXHRpZihiaW5kUHJvcGVydHkubWF0Y2goL1xcLi8pKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRbcHJveHksIHByb3BlcnR5XSA9IEJpbmRhYmxlLnJlc29sdmUoXG4gICAgLy8gXHRcdFx0dGhpcy5hcmdzXG4gICAgLy8gXHRcdFx0LCBiaW5kUHJvcGVydHlcbiAgICAvLyBcdFx0XHQsIHRydWVcbiAgICAvLyBcdFx0KTtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0bGV0IGF0dHJpYiA9IGF0dHJzW2ldWzBdO1xuXG4gICAgLy8gXHR0aGlzLm9uUmVtb3ZlKHByb3h5LmJpbmRUbyhcbiAgICAvLyBcdFx0cHJvcGVydHlcbiAgICAvLyBcdFx0LCAodik9PntcbiAgICAvLyBcdFx0XHRpZih2ID09IG51bGwpXG4gICAgLy8gXHRcdFx0e1xuICAgIC8vIFx0XHRcdFx0dGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsICcnKTtcbiAgICAvLyBcdFx0XHRcdHJldHVybjtcbiAgICAvLyBcdFx0XHR9XG4gICAgLy8gXHRcdFx0dGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsIHYpO1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHQpKTtcbiAgICAvLyB9XG5cbiAgICAvLyByZXR1cm4gdGFnO1xuICB9XG4gIGNvbXBpbGVBdHRyVGFnKHNvdXJjZVRhZykge1xuICAgIHZhciBhdHRyUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1hdHRyJyk7XG4gICAgdmFyIHBhaXJzID0gYXR0clByb3BlcnR5LnNwbGl0KC9bLDtdLyk7XG4gICAgdmFyIGF0dHJzID0gcGFpcnMubWFwKHAgPT4gcC5zcGxpdCgnOicpKTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1hdHRyJyk7XG4gICAgcmV0dXJuIGJpbmRpbmdWaWV3ID0+IHtcbiAgICAgIHZhciB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgdmFyIF9sb29wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYmluZFByb3BlcnR5ID0gYXR0cnNbaV1bMV0gfHwgYXR0cnNbaV1bMF07XG4gICAgICAgIHZhciBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKGJpbmRpbmdWaWV3LmFyZ3MsIGJpbmRQcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgICAgIHZhciBhdHRyaWIgPSBhdHRyc1tpXVswXTtcbiAgICAgICAgYmluZGluZ1ZpZXcub25SZW1vdmUocHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIGlmIChkIHx8IHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFnLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWIsIHYpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsICcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsIHYpO1xuICAgICAgICB9KSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgaSBpbiBhdHRycykge1xuICAgICAgICBfbG9vcCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRhZztcbiAgICB9O1xuICB9XG4gIG1hcEludGVycG9sYXRhYmxlVGFnKHRhZykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyIHJlZ2V4ID0gdGhpcy5pbnRlcnBvbGF0ZVJlZ2V4O1xuICAgIHZhciB7XG4gICAgICBOb2RlLFxuICAgICAgZG9jdW1lbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgaWYgKHRhZy5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICAgIHZhciBvcmlnaW5hbCA9IHRhZy5ub2RlVmFsdWU7XG4gICAgICBpZiAoIXRoaXMuaW50ZXJwb2xhdGFibGUob3JpZ2luYWwpKSB7XG4gICAgICAgIHJldHVybiB0YWc7XG4gICAgICB9XG4gICAgICB2YXIgaGVhZGVyID0gMDtcbiAgICAgIHZhciBtYXRjaDtcbiAgICAgIHZhciBfbG9vcDIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGJpbmRQcm9wZXJ0eSA9IG1hdGNoWzJdO1xuICAgICAgICAgIHZhciB1bnNhZmVIdG1sID0gZmFsc2U7XG4gICAgICAgICAgdmFyIHVuc2FmZVZpZXcgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgcHJvcGVydHlTcGxpdCA9IGJpbmRQcm9wZXJ0eS5zcGxpdCgnfCcpO1xuICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IGZhbHNlO1xuICAgICAgICAgIGlmIChwcm9wZXJ0eVNwbGl0Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyID0gX3RoaXMuc3RyaW5nVHJhbnNmb3JtZXIocHJvcGVydHlTcGxpdC5zbGljZSgxKSk7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBwcm9wZXJ0eVNwbGl0WzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5LnN1YnN0cigwLCAyKSA9PT0gJyQkJykge1xuICAgICAgICAgICAgdW5zYWZlSHRtbCA9IHRydWU7XG4gICAgICAgICAgICB1bnNhZmVWaWV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eS5zdWJzdHIoMik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgICAgICAgIHVuc2FmZUh0bWwgPSB0cnVlO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gYmluZFByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5zdWJzdHIoMCwgMykgPT09ICcwMDAnKSB7XG4gICAgICAgICAgICBleHBhbmQgPSB0cnVlO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gYmluZFByb3BlcnR5LnN1YnN0cigzKTtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgc3RhdGljUHJlZml4ID0gb3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlciwgbWF0Y2guaW5kZXgpO1xuICAgICAgICAgIGhlYWRlciA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMV0ubGVuZ3RoO1xuICAgICAgICAgIHZhciBzdGF0aWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RhdGljUHJlZml4KTtcbiAgICAgICAgICBzdGF0aWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdGF0aWNOb2RlLCB0YWcpO1xuICAgICAgICAgIHZhciBkeW5hbWljTm9kZTtcbiAgICAgICAgICBpZiAodW5zYWZlSHRtbCkge1xuICAgICAgICAgICAgZHluYW1pY05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHluYW1pY05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGR5bmFtaWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgICAgIHZhciBwcm94eSA9IF90aGlzLmFyZ3M7XG4gICAgICAgICAgdmFyIHByb3BlcnR5ID0gYmluZFByb3BlcnR5O1xuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkubWF0Y2goL1xcLi8pKSB7XG4gICAgICAgICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKF90aGlzLmFyZ3MsIGJpbmRQcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkeW5hbWljTm9kZSwgdGFnKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHByb3h5ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcmV0dXJuIDE7IC8vIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIHByb3h5ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UocHJveHkpO1xuICAgICAgICAgIHZhciBkZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0KSA9PiB7XG4gICAgICAgICAgICBpZiAodFtrXSAhPT0gdiAmJiAodFtrXSBpbnN0YW5jZW9mIFZpZXcgfHwgdFtrXSBpbnN0YW5jZW9mIE5vZGUgfHwgdFtrXSBpbnN0YW5jZW9mIF9UYWcuVGFnKSkge1xuICAgICAgICAgICAgICBpZiAoIXRba10ucHJlc2VydmUpIHtcbiAgICAgICAgICAgICAgICB0W2tdLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodW5zYWZlVmlldyAmJiAhKHYgaW5zdGFuY2VvZiBWaWV3KSkge1xuICAgICAgICAgICAgICB2YXIgdW5zYWZlVGVtcGxhdGUgPSB2ICE9PSBudWxsICYmIHYgIT09IHZvaWQgMCA/IHYgOiAnJztcbiAgICAgICAgICAgICAgdiA9IG5ldyBWaWV3KF90aGlzLmFyZ3MsIF90aGlzKTtcbiAgICAgICAgICAgICAgdi50ZW1wbGF0ZSA9IHVuc2FmZVRlbXBsYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyKSB7XG4gICAgICAgICAgICAgIHYgPSB0cmFuc2Zvcm1lcih2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgVmlldykge1xuICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgdltfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSBfdGhpcztcbiAgICAgICAgICAgICAgdi5yZW5kZXIodGFnLnBhcmVudE5vZGUsIGR5bmFtaWNOb2RlLCBfdGhpcyk7XG4gICAgICAgICAgICAgIHZhciBjbGVhbnVwID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdi5wcmVzZXJ2ZSkge1xuICAgICAgICAgICAgICAgICAgdi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKGNsZWFudXApO1xuICAgICAgICAgICAgICB2Lm9uUmVtb3ZlKCgpID0+IF90aGlzLl9vblJlbW92ZS5yZW1vdmUoY2xlYW51cCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHYsIGR5bmFtaWNOb2RlKTtcbiAgICAgICAgICAgICAgX3RoaXMub25SZW1vdmUoKCkgPT4gdi5yZW1vdmUoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgaWYgKHYubm9kZSkge1xuICAgICAgICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh2Lm5vZGUsIGR5bmFtaWNOb2RlKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5vblJlbW92ZSgoKSA9PiB2LnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2LnJlbW92ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAodiBpbnN0YW5jZW9mIE9iamVjdCAmJiB2Ll9fdG9TdHJpbmcgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgIHYgPSB2Ll9fdG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAodW5zYWZlSHRtbCkge1xuICAgICAgICAgICAgICAgIGR5bmFtaWNOb2RlLmlubmVySFRNTCA9IHY7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gdjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHluYW1pY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgX3RoaXMub25SZW1vdmUoZGViaW5kKTtcbiAgICAgICAgfSxcbiAgICAgICAgX3JldDtcbiAgICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMob3JpZ2luYWwpKSB7XG4gICAgICAgIF9yZXQgPSBfbG9vcDIoKTtcbiAgICAgICAgaWYgKF9yZXQgPT09IDApIGNvbnRpbnVlO1xuICAgICAgICBpZiAoX3JldCA9PT0gMSkgYnJlYWs7XG4gICAgICB9XG4gICAgICB2YXIgc3RhdGljU3VmZml4ID0gb3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlcik7XG4gICAgICB2YXIgc3RhdGljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0YXRpY1N1ZmZpeCk7XG4gICAgICBzdGF0aWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN0YXRpY05vZGUsIHRhZyk7XG4gICAgICB0YWcubm9kZVZhbHVlID0gJyc7XG4gICAgfSBlbHNlIGlmICh0YWcubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICB2YXIgX2xvb3AzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIV90aGlzLmludGVycG9sYXRhYmxlKHRhZy5hdHRyaWJ1dGVzW2ldLnZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHZhciBoZWFkZXIgPSAwO1xuICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IHRhZy5hdHRyaWJ1dGVzW2ldLnZhbHVlO1xuICAgICAgICB2YXIgYXR0cmlidXRlID0gdGFnLmF0dHJpYnV0ZXNbaV07XG4gICAgICAgIHZhciBiaW5kUHJvcGVydGllcyA9IHt9O1xuICAgICAgICB2YXIgc2VnbWVudHMgPSBbXTtcbiAgICAgICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhvcmlnaW5hbCkpIHtcbiAgICAgICAgICBzZWdtZW50cy5wdXNoKG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgICAgaWYgKCFiaW5kUHJvcGVydGllc1ttYXRjaFsyXV0pIHtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0aWVzW21hdGNoWzJdXSA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBiaW5kUHJvcGVydGllc1ttYXRjaFsyXV0ucHVzaChzZWdtZW50cy5sZW5ndGgpO1xuICAgICAgICAgIHNlZ21lbnRzLnB1c2gobWF0Y2hbMV0pO1xuICAgICAgICAgIGhlYWRlciA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMV0ubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHNlZ21lbnRzLnB1c2gob3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlcikpO1xuICAgICAgICB2YXIgX2xvb3A0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBwcm94eSA9IF90aGlzLmFyZ3M7XG4gICAgICAgICAgdmFyIHByb3BlcnR5ID0gajtcbiAgICAgICAgICB2YXIgcHJvcGVydHlTcGxpdCA9IGouc3BsaXQoJ3wnKTtcbiAgICAgICAgICB2YXIgdHJhbnNmb3JtZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgbG9uZ1Byb3BlcnR5ID0gajtcbiAgICAgICAgICBpZiAocHJvcGVydHlTcGxpdC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IF90aGlzLnN0cmluZ1RyYW5zZm9ybWVyKHByb3BlcnR5U3BsaXQuc2xpY2UoMSkpO1xuICAgICAgICAgICAgcHJvcGVydHkgPSBwcm9wZXJ0eVNwbGl0WzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocHJvcGVydHkubWF0Y2goL1xcLi8pKSB7XG4gICAgICAgICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKF90aGlzLmFyZ3MsIHByb3BlcnR5LCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG1hdGNoaW5nID0gW107XG4gICAgICAgICAgdmFyIGJpbmRQcm9wZXJ0eSA9IGo7XG4gICAgICAgICAgdmFyIG1hdGNoaW5nU2VnbWVudHMgPSBiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldO1xuICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lcikge1xuICAgICAgICAgICAgICB2ID0gdHJhbnNmb3JtZXIodik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBfaSBpbiBiaW5kUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBmb3IgKHZhciBfaiBpbiBiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldKSB7XG4gICAgICAgICAgICAgICAgc2VnbWVudHNbYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XVtfal1dID0gdFtfaV07XG4gICAgICAgICAgICAgICAgaWYgKGsgPT09IHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgICBzZWdtZW50c1tiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldW19qXV0gPSB2O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUubmFtZSwgc2VnbWVudHMuam9pbignJykpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgX3RoaXMudW5wYXVzZUNhbGxiYWNrcy5zZXQoYXR0cmlidXRlLCAoKSA9PiB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBzZWdtZW50cy5qb2luKCcnKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfTtcbiAgICAgICAgZm9yICh2YXIgaiBpbiBiaW5kUHJvcGVydGllcykge1xuICAgICAgICAgIF9sb29wNCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWcuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoX2xvb3AzKCkpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFJlZlRhZyh0YWcpIHtcbiAgICB2YXIgcmVmQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXJlZicpO1xuICAgIHZhciBbcmVmUHJvcCwgcmVmQ2xhc3NuYW1lID0gbnVsbCwgcmVmS2V5ID0gbnVsbF0gPSByZWZBdHRyLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHJlZkNsYXNzID0gX1RhZy5UYWc7XG4gICAgaWYgKHJlZkNsYXNzbmFtZSkge1xuICAgICAgcmVmQ2xhc3MgPSB0aGlzLnN0cmluZ1RvQ2xhc3MocmVmQ2xhc3NuYW1lKTtcbiAgICB9XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtcmVmJyk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhZywgJ19fX3RhZ19fXycsIHtcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIHRhZy5fX190YWdfX18gPSBudWxsO1xuICAgICAgdGFnLnJlbW92ZSgpO1xuICAgIH0pO1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIHZhciBkaXJlY3QgPSB0aGlzO1xuICAgIGlmICh0aGlzLnZpZXdMaXN0KSB7XG4gICAgICBwYXJlbnQgPSB0aGlzLnZpZXdMaXN0LnBhcmVudDtcbiAgICAgIC8vIGlmKCF0aGlzLnZpZXdMaXN0LnBhcmVudC50YWdzW3JlZlByb3BdKVxuICAgICAgLy8ge1xuICAgICAgLy8gXHR0aGlzLnZpZXdMaXN0LnBhcmVudC50YWdzW3JlZlByb3BdID0gW107XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIGxldCByZWZLZXlWYWwgPSB0aGlzLmFyZ3NbcmVmS2V5XTtcblxuICAgICAgLy8gdGhpcy52aWV3TGlzdC5wYXJlbnQudGFnc1tyZWZQcm9wXVtyZWZLZXlWYWxdID0gbmV3IHJlZkNsYXNzKFxuICAgICAgLy8gXHR0YWcsIHRoaXMsIHJlZlByb3AsIHJlZktleVZhbFxuICAgICAgLy8gKTtcbiAgICB9XG4gICAgLy8gZWxzZVxuICAgIC8vIHtcbiAgICAvLyBcdHRoaXMudGFnc1tyZWZQcm9wXSA9IG5ldyByZWZDbGFzcyhcbiAgICAvLyBcdFx0dGFnLCB0aGlzLCByZWZQcm9wXG4gICAgLy8gXHQpO1xuICAgIC8vIH1cblxuICAgIHZhciB0YWdPYmplY3QgPSBuZXcgcmVmQ2xhc3ModGFnLCB0aGlzLCByZWZQcm9wLCB1bmRlZmluZWQsIGRpcmVjdCk7XG4gICAgdGFnLl9fX3RhZ19fXyA9IHRhZ09iamVjdDtcbiAgICB0aGlzLnRhZ3NbcmVmUHJvcF0gPSB0YWdPYmplY3Q7XG4gICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgdmFyIHJlZktleVZhbCA9IHRoaXMuYXJnc1tyZWZLZXldO1xuICAgICAgaWYgKHJlZktleVZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICghcGFyZW50LnRhZ3NbcmVmUHJvcF0pIHtcbiAgICAgICAgICBwYXJlbnQudGFnc1tyZWZQcm9wXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudC50YWdzW3JlZlByb3BdW3JlZktleVZhbF0gPSB0YWdPYmplY3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJlbnQudGFnc1tyZWZQcm9wXSA9IHRhZ09iamVjdDtcbiAgICAgIH1cbiAgICAgIGlmICghcGFyZW50LnBhcmVudCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwQmluZFRhZyh0YWcpIHtcbiAgICB2YXIgYmluZEFyZyA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWJpbmQnKTtcbiAgICB2YXIgcHJveHkgPSB0aGlzLmFyZ3M7XG4gICAgdmFyIHByb3BlcnR5ID0gYmluZEFyZztcbiAgICB2YXIgdG9wID0gbnVsbDtcbiAgICBpZiAoYmluZEFyZy5tYXRjaCgvXFwuLykpIHtcbiAgICAgIFtwcm94eSwgcHJvcGVydHksIHRvcF0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZSh0aGlzLmFyZ3MsIGJpbmRBcmcsIHRydWUpO1xuICAgIH1cbiAgICBpZiAocHJveHkgIT09IHRoaXMuYXJncykge1xuICAgICAgdGhpcy5zdWJCaW5kaW5nc1tiaW5kQXJnXSA9IHRoaXMuc3ViQmluZGluZ3NbYmluZEFyZ10gfHwgW107XG4gICAgICB0aGlzLm9uUmVtb3ZlKHRoaXMuYXJncy5iaW5kVG8odG9wLCAoKSA9PiB7XG4gICAgICAgIHdoaWxlICh0aGlzLnN1YkJpbmRpbmdzLmxlbmd0aCkge1xuICAgICAgICAgIHRoaXMuc3ViQmluZGluZ3Muc2hpZnQoKSgpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHZhciB1bnNhZmVIdG1sID0gZmFsc2U7XG4gICAgaWYgKHByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICBwcm9wZXJ0eSA9IHByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgIHVuc2FmZUh0bWwgPSB0cnVlO1xuICAgIH1cbiAgICB2YXIgYXV0b0V2ZW50U3RhcnRlZCA9IGZhbHNlO1xuICAgIHZhciBkZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICBpZiAoKHAgaW5zdGFuY2VvZiBWaWV3IHx8IHAgaW5zdGFuY2VvZiBOb2RlIHx8IHAgaW5zdGFuY2VvZiBfVGFnLlRhZykgJiYgcCAhPT0gdikge1xuICAgICAgICBwLnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgaWYgKFsnSU5QVVQnLCAnU0VMRUNUJywgJ1RFWFRBUkVBJ10uaW5jbHVkZXModGFnLnRhZ05hbWUpKSB7XG4gICAgICAgIHZhciBfdHlwZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcbiAgICAgICAgaWYgKF90eXBlICYmIF90eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICB0YWcuY2hlY2tlZCA9ICEhdjtcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSAmJiBfdHlwZS50b0xvd2VyQ2FzZSgpID09PSAncmFkaW8nKSB7XG4gICAgICAgICAgdGFnLmNoZWNrZWQgPSB2ID09IHRhZy52YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSAhPT0gJ2ZpbGUnKSB7XG4gICAgICAgICAgaWYgKHRhZy50YWdOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgICAgICAgdmFyIHNlbGVjdE9wdGlvbiA9ICgpID0+IHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWcub3B0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb24gPSB0YWcub3B0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uLnZhbHVlID09IHYpIHtcbiAgICAgICAgICAgICAgICAgIHRhZy5zZWxlY3RlZEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzZWxlY3RPcHRpb24oKTtcbiAgICAgICAgICAgIHRoaXMubm9kZXNBdHRhY2hlZC5hZGQoc2VsZWN0T3B0aW9uKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGFnLnZhbHVlID0gdiA9PSBudWxsID8gJycgOiB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoYXV0b0V2ZW50U3RhcnRlZCkge1xuICAgICAgICAgIHRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZBdXRvQ2hhbmdlZCcsIHtcbiAgICAgICAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgYXV0b0V2ZW50U3RhcnRlZCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodiBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgICAgICBmb3IgKHZhciBub2RlIG9mIHRhZy5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICBub2RlLnJlbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2W19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IHRoaXM7XG4gICAgICAgICAgdi5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICAgIHRhZy5pbnNlcnQodik7XG4gICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICAgICAgdGFnLmFwcGVuZCh2Lm5vZGUpO1xuICAgICAgICB9IGVsc2UgaWYgKHVuc2FmZUh0bWwpIHtcbiAgICAgICAgICBpZiAodGFnLmlubmVySFRNTCAhPT0gdikge1xuICAgICAgICAgICAgdiA9IFN0cmluZyh2KTtcbiAgICAgICAgICAgIGlmICh0YWcuaW5uZXJIVE1MID09PSB2LnN1YnN0cmluZygwLCB0YWcuaW5uZXJIVE1MLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgdGFnLmlubmVySFRNTCArPSB2LnN1YnN0cmluZyh0YWcuaW5uZXJIVE1MLmxlbmd0aCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3IgKHZhciBfbm9kZSBvZiB0YWcuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgIF9ub2RlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHRhZy5pbm5lckhUTUwgPSB2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX0RvbS5Eb20ubWFwVGFncyh0YWcsIGZhbHNlLCB0ID0+IHRbZG9udFBhcnNlXSA9IHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGFnLnRleHRDb250ZW50ICE9PSB2KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBfbm9kZTIgb2YgdGFnLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgX25vZGUyLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFnLnRleHRDb250ZW50ID0gdjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAocHJveHkgIT09IHRoaXMuYXJncykge1xuICAgICAgdGhpcy5zdWJCaW5kaW5nc1tiaW5kQXJnXS5wdXNoKGRlYmluZCk7XG4gICAgfVxuICAgIHRoaXMub25SZW1vdmUoZGViaW5kKTtcbiAgICB2YXIgdHlwZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcbiAgICB2YXIgbXVsdGkgPSB0YWcuZ2V0QXR0cmlidXRlKCdtdWx0aXBsZScpO1xuICAgIHZhciBpbnB1dExpc3RlbmVyID0gZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50LnRhcmdldCAhPT0gdGFnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlICYmIHR5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICBpZiAodGFnLmNoZWNrZWQpIHtcbiAgICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBldmVudC50YXJnZXQuZ2V0QXR0cmlidXRlKCd2YWx1ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50LnRhcmdldC5tYXRjaGVzKCdbY29udGVudGVkaXRhYmxlPXRydWVdJykpIHtcbiAgICAgICAgcHJveHlbcHJvcGVydHldID0gZXZlbnQudGFyZ2V0LmlubmVySFRNTDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2ZpbGUnICYmIG11bHRpKSB7XG4gICAgICAgIHZhciBmaWxlcyA9IEFycmF5LmZyb20oZXZlbnQudGFyZ2V0LmZpbGVzKTtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBwcm94eVtwcm9wZXJ0eV0gfHwgX0JpbmRhYmxlLkJpbmRhYmxlLm9uRGVjayhwcm94eSwgcHJvcGVydHkpO1xuICAgICAgICBpZiAoIWN1cnJlbnQgfHwgIWZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGZpbGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBfbG9vcDUgPSBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgaWYgKGZpbGVzW2ldICE9PSBjdXJyZW50W2ldKSB7XG4gICAgICAgICAgICAgIGZpbGVzW2ldLnRvSlNPTiA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgbmFtZTogZmlsZVtpXS5uYW1lLFxuICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZVtpXS5zaXplLFxuICAgICAgICAgICAgICAgICAgdHlwZTogZmlsZVtpXS50eXBlLFxuICAgICAgICAgICAgICAgICAgZGF0ZTogZmlsZVtpXS5sYXN0TW9kaWZpZWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjdXJyZW50W2ldID0gZmlsZXNbaV07XG4gICAgICAgICAgICAgIHJldHVybiAxOyAvLyBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgZm9yICh2YXIgaSBpbiBmaWxlcykge1xuICAgICAgICAgICAgaWYgKF9sb29wNShpKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdmaWxlJyAmJiAhbXVsdGkgJiYgZXZlbnQudGFyZ2V0LmZpbGVzLmxlbmd0aCkge1xuICAgICAgICB2YXIgX2ZpbGUgPSBldmVudC50YXJnZXQuZmlsZXMuaXRlbSgwKTtcbiAgICAgICAgX2ZpbGUudG9KU09OID0gKCkgPT4ge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBfZmlsZS5uYW1lLFxuICAgICAgICAgICAgc2l6ZTogX2ZpbGUuc2l6ZSxcbiAgICAgICAgICAgIHR5cGU6IF9maWxlLnR5cGUsXG4gICAgICAgICAgICBkYXRlOiBfZmlsZS5sYXN0TW9kaWZpZWRcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBfZmlsZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGlmICh0eXBlID09PSAnZmlsZScgfHwgdHlwZSA9PT0gJ3JhZGlvJykge1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCd2YWx1ZS1jaGFuZ2VkJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgfVxuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgaWYgKHR5cGUgPT09ICdmaWxlJyB8fCB0eXBlID09PSAncmFkaW8nKSB7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdpbnB1dCcsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCd2YWx1ZS1jaGFuZ2VkJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtYmluZCcpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwT25UYWcodGFnKSB7XG4gICAgdmFyIHJlZmVyZW50cyA9IFN0cmluZyh0YWcuZ2V0QXR0cmlidXRlKCdjdi1vbicpKTtcbiAgICByZWZlcmVudHMuc3BsaXQoJzsnKS5tYXAoYSA9PiBhLnNwbGl0KCc6JykpLmZvckVhY2goYSA9PiB7XG4gICAgICBhID0gYS5tYXAoYSA9PiBhLnRyaW0oKSk7XG4gICAgICB2YXIgYXJnTGVuID0gYS5sZW5ndGg7XG4gICAgICB2YXIgZXZlbnROYW1lID0gU3RyaW5nKGEuc2hpZnQoKSkudHJpbSgpO1xuICAgICAgdmFyIGNhbGxiYWNrTmFtZSA9IFN0cmluZyhhLnNoaWZ0KCkgfHwgZXZlbnROYW1lKS50cmltKCk7XG4gICAgICB2YXIgZXZlbnRGbGFncyA9IFN0cmluZyhhLnNoaWZ0KCkgfHwgJycpLnRyaW0oKTtcbiAgICAgIHZhciBhcmdMaXN0ID0gW107XG4gICAgICB2YXIgZ3JvdXBzID0gLyhcXHcrKSg/OlxcKChbJFxcd1xccy0nXCIsXSspXFwpKT8vLmV4ZWMoY2FsbGJhY2tOYW1lKTtcbiAgICAgIGlmIChncm91cHMpIHtcbiAgICAgICAgY2FsbGJhY2tOYW1lID0gZ3JvdXBzWzFdLnJlcGxhY2UoLyheW1xcc1xcbl0rfFtcXHNcXG5dKyQpLywgJycpO1xuICAgICAgICBpZiAoZ3JvdXBzWzJdKSB7XG4gICAgICAgICAgYXJnTGlzdCA9IGdyb3Vwc1syXS5zcGxpdCgnLCcpLm1hcChzID0+IHMudHJpbSgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFhcmdMaXN0Lmxlbmd0aCkge1xuICAgICAgICBhcmdMaXN0LnB1c2goJyRldmVudCcpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudE5hbWUgfHwgYXJnTGVuID09PSAxKSB7XG4gICAgICAgIGV2ZW50TmFtZSA9IGNhbGxiYWNrTmFtZTtcbiAgICAgIH1cbiAgICAgIHZhciBldmVudExpc3RlbmVyID0gZXZlbnQgPT4ge1xuICAgICAgICB2YXIgZXZlbnRNZXRob2Q7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgX2xvb3A2ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXIgPSBwYXJlbnQuY29udHJvbGxlcjtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udHJvbGxlcltjYWxsYmFja05hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGV2ZW50TWV0aG9kID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyW2NhbGxiYWNrTmFtZV0oLi4uYXJncyk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIHJldHVybiAwOyAvLyBicmVha1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyZW50W2NhbGxiYWNrTmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgZXZlbnRNZXRob2QgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgICAgIHBhcmVudFtjYWxsYmFja05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByZXR1cm4gMDsgLy8gYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwYXJlbnQucGFyZW50KSB7XG4gICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gMDsgLy8gYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIF9yZXQyO1xuICAgICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgICAgX3JldDIgPSBfbG9vcDYoKTtcbiAgICAgICAgICBpZiAoX3JldDIgPT09IDApIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhcmdSZWZzID0gYXJnTGlzdC5tYXAoYXJnID0+IHtcbiAgICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgICAgaWYgKE51bWJlcihhcmcpID09IGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJ2V2ZW50JyB8fCBhcmcgPT09ICckZXZlbnQnKSB7XG4gICAgICAgICAgICByZXR1cm4gZXZlbnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckdmlldycpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckY29udHJvbGxlcicpIHtcbiAgICAgICAgICAgIHJldHVybiBjb250cm9sbGVyO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHRhZycpIHtcbiAgICAgICAgICAgIHJldHVybiB0YWc7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckcGFyZW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHN1YnZpZXcnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyBpbiB0aGlzLmFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFyZ3NbYXJnXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoID0gL15bJ1wiXShbXFx3LV0rPylbXCInXSQvLmV4ZWMoYXJnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghKHR5cGVvZiBldmVudE1ldGhvZCA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7Y2FsbGJhY2tOYW1lfSBpcyBub3QgZGVmaW5lZCBvbiBWaWV3IG9iamVjdC5gICsgXCJcXG5cIiArIGBUYWc6YCArIFwiXFxuXCIgKyBgJHt0YWcub3V0ZXJIVE1MfWApO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50TWV0aG9kKC4uLmFyZ1JlZnMpO1xuICAgICAgfTtcbiAgICAgIHZhciBldmVudE9wdGlvbnMgPSB7fTtcbiAgICAgIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdwJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLnBhc3NpdmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdQJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLnBhc3NpdmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdjJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLmNhcHR1cmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdDJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLmNhcHR1cmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdvJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLm9uY2UgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdPJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLm9uY2UgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHN3aXRjaCAoZXZlbnROYW1lKSB7XG4gICAgICAgIGNhc2UgJ19pbml0JzpcbiAgICAgICAgICBldmVudExpc3RlbmVyKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ19hdHRhY2gnOlxuICAgICAgICAgIHRoaXMubm9kZXNBdHRhY2hlZC5hZGQoZXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ19kZXRhY2gnOlxuICAgICAgICAgIHRoaXMubm9kZXNEZXRhY2hlZC5hZGQoZXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBldmVudExpc3RlbmVyLCBldmVudE9wdGlvbnMpO1xuICAgICAgICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBldmVudExpc3RlbmVyLCBldmVudE9wdGlvbnMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtldmVudE5hbWUsIGNhbGxiYWNrTmFtZSwgYXJnTGlzdF07XG4gICAgfSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3Ytb24nKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcExpbmtUYWcodGFnKSB7XG4gICAgLy8gY29uc3QgdGFnQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVMaW5rVGFnKHRhZyk7XG5cbiAgICAvLyBjb25zdCBuZXdUYWcgPSB0YWdDb21waWxlcih0aGlzKTtcblxuICAgIC8vIHRhZy5yZXBsYWNlV2l0aChuZXdUYWcpO1xuXG4gICAgLy8gcmV0dXJuIG5ld1RhZztcblxuICAgIHZhciBsaW5rQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgICB0YWcuc2V0QXR0cmlidXRlKCdocmVmJywgbGlua0F0dHIpO1xuICAgIHZhciBsaW5rQ2xpY2sgPSBldmVudCA9PiB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGxpbmtBdHRyLnN1YnN0cmluZygwLCA0KSA9PT0gJ2h0dHAnIHx8IGxpbmtBdHRyLnN1YnN0cmluZygwLCAyKSA9PT0gJy8vJykge1xuICAgICAgICBnbG9iYWxUaGlzLm9wZW4odGFnLmdldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmtBdHRyKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIF9Sb3V0ZXIuUm91dGVyLmdvKHRhZy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSk7XG4gICAgfTtcbiAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaW5rQ2xpY2spO1xuICAgIHRoaXMub25SZW1vdmUoKCh0YWcsIGV2ZW50TGlzdGVuZXIpID0+ICgpID0+IHtcbiAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50TGlzdGVuZXIpO1xuICAgICAgdGFnID0gdW5kZWZpbmVkO1xuICAgICAgZXZlbnRMaXN0ZW5lciA9IHVuZGVmaW5lZDtcbiAgICB9KSh0YWcsIGxpbmtDbGljaykpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gY29tcGlsZUxpbmtUYWcoc291cmNlVGFnKVxuICAvLyB7XG4gIC8vIFx0Y29uc3QgbGlua0F0dHIgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1saW5rJyk7XG4gIC8vIFx0c291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAvLyBcdHJldHVybiAoYmluZGluZ1ZpZXcpID0+IHtcbiAgLy8gXHRcdGNvbnN0IHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUodHJ1ZSk7XG4gIC8vIFx0XHR0YWcuc2V0QXR0cmlidXRlKCdocmVmJywgbGlua0F0dHIpO1xuICAvLyBcdFx0cmV0dXJuIHRhZztcbiAgLy8gXHR9O1xuICAvLyB9XG5cbiAgbWFwUHJlbmRlcmVyVGFnKHRhZykge1xuICAgIHZhciBwcmVyZW5kZXJBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtcHJlcmVuZGVyJyk7XG4gICAgdmFyIHByZXJlbmRlcmluZyA9IGdsb2JhbFRoaXMucHJlcmVuZGVyZXIgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvcHJlcmVuZGVyL2kpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXByZXJlbmRlcicpO1xuICAgIGlmIChwcmVyZW5kZXJpbmcpIHtcbiAgICAgIGdsb2JhbFRoaXMucHJlcmVuZGVyZXIgPSBnbG9iYWxUaGlzLnByZXJlbmRlcmVyIHx8IHRydWU7XG4gICAgfVxuICAgIGlmIChwcmVyZW5kZXJBdHRyID09PSAnbmV2ZXInICYmIHByZXJlbmRlcmluZyB8fCBwcmVyZW5kZXJBdHRyID09PSAnb25seScgJiYgIXByZXJlbmRlcmluZykge1xuICAgICAgdGhpcy5wb3N0TWFwcGluZy5hZGQoKCkgPT4gdGFnLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGFnKSk7XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwV2l0aFRhZyh0YWcpIHtcbiAgICB2YXIgX3RoaXMyID0gdGhpcztcbiAgICB2YXIgd2l0aEF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi13aXRoJyk7XG4gICAgdmFyIGNhcnJ5QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWNhcnJ5Jyk7XG4gICAgdmFyIHZpZXdBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXdpdGgnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1jYXJyeScpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgdmlld0NsYXNzID0gdmlld0F0dHIgPyB0aGlzLnN0cmluZ1RvQ2xhc3Modmlld0F0dHIpIDogVmlldztcbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi50YWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgY2FycnlQcm9wcyA9IFtdO1xuICAgIGlmIChjYXJyeUF0dHIpIHtcbiAgICAgIGNhcnJ5UHJvcHMgPSBjYXJyeUF0dHIuc3BsaXQoJywnKS5tYXAocyA9PiBzLnRyaW0oKSk7XG4gICAgfVxuICAgIHZhciBkZWJpbmQgPSB0aGlzLmFyZ3MuYmluZFRvKHdpdGhBdHRyLCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgaWYgKHRoaXMud2l0aFZpZXdzLmhhcyh0YWcpKSB7XG4gICAgICAgIHRoaXMud2l0aFZpZXdzLmRlbGV0ZSh0YWcpO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHRhZy5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhZy5yZW1vdmVDaGlsZCh0YWcuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgICB2YXIgdmlldyA9IG5ldyB2aWV3Q2xhc3Moe30sIHRoaXMpO1xuICAgICAgdGhpcy5vblJlbW92ZSgodmlldyA9PiAoKSA9PiB7XG4gICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICB9KSh2aWV3KSk7XG4gICAgICB2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gICAgICB2YXIgX2xvb3A3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGViaW5kID0gX3RoaXMyLmFyZ3MuYmluZFRvKGNhcnJ5UHJvcHNbaV0sICh2LCBrKSA9PiB7XG4gICAgICAgICAgdmlldy5hcmdzW2tdID0gdjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZpZXcub25SZW1vdmUoZGViaW5kKTtcbiAgICAgICAgX3RoaXMyLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBkZWJpbmQoKTtcbiAgICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBpIGluIGNhcnJ5UHJvcHMpIHtcbiAgICAgICAgX2xvb3A3KCk7XG4gICAgICB9XG4gICAgICB2YXIgX2xvb3A4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdiA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHYpO1xuICAgICAgICB2YXIgZGViaW5kID0gdi5iaW5kVG8oX2kyLCAodnYsIGtrLCB0dCwgZGQpID0+IHtcbiAgICAgICAgICBpZiAoIWRkKSB7XG4gICAgICAgICAgICB2aWV3LmFyZ3Nba2tdID0gdnY7XG4gICAgICAgICAgfSBlbHNlIGlmIChrayBpbiB2aWV3LmFyZ3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2aWV3LmFyZ3Nba2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkZWJpbmRVcCA9IHZpZXcuYXJncy5iaW5kVG8oX2kyLCAodnYsIGtrLCB0dCwgZGQpID0+IHtcbiAgICAgICAgICBpZiAoIWRkKSB7XG4gICAgICAgICAgICB2W2trXSA9IHZ2O1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2sgaW4gdikge1xuICAgICAgICAgICAgZGVsZXRlIHZba2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzMi5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgZGViaW5kKCk7XG4gICAgICAgICAgaWYgKCF2LmlzQm91bmQoKSkge1xuICAgICAgICAgICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3Modik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB2aWV3Lm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBkZWJpbmQoKTtcbiAgICAgICAgICBpZiAoIXYuaXNCb3VuZCgpKSB7XG4gICAgICAgICAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh2KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIF9pMiBpbiB2KSB7XG4gICAgICAgIGlmIChfbG9vcDgoKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICB2aWV3LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgICAgdGhpcy53aXRoVmlld3Muc2V0KHRhZywgdmlldyk7XG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICB0aGlzLndpdGhWaWV3cy5kZWxldGUodGFnKTtcbiAgICAgIGRlYmluZCgpO1xuICAgIH0pO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwVmlld1RhZyh0YWcpIHtcbiAgICB2YXIgdmlld0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBwYXJ0cyA9IHZpZXdBdHRyLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHZpZXdOYW1lID0gcGFydHMuc2hpZnQoKTtcbiAgICB2YXIgdmlld0NsYXNzID0gcGFydHMubGVuZ3RoID8gdGhpcy5zdHJpbmdUb0NsYXNzKHBhcnRzWzBdKSA6IFZpZXc7XG4gICAgdmFyIHZpZXcgPSBuZXcgdmlld0NsYXNzKHRoaXMuYXJncywgdGhpcyk7XG4gICAgdGhpcy52aWV3cy5zZXQodGFnLCB2aWV3KTtcbiAgICB0aGlzLnZpZXdzLnNldCh2aWV3TmFtZSwgdmlldyk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgdGhpcy52aWV3cy5kZWxldGUodGFnKTtcbiAgICAgIHRoaXMudmlld3MuZGVsZXRlKHZpZXdOYW1lKTtcbiAgICB9KTtcbiAgICB2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gICAgdmlldy5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcEVhY2hUYWcodGFnKSB7XG4gICAgdmFyIGVhY2hBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtZWFjaCcpO1xuICAgIHZhciB2aWV3QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1lYWNoJyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSB2aWV3QXR0ciA/IHRoaXMuc3RyaW5nVG9DbGFzcyh2aWV3QXR0cikgOiBWaWV3O1xuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBbZWFjaFByb3AsIGFzUHJvcCwga2V5UHJvcF0gPSBlYWNoQXR0ci5zcGxpdCgnOicpO1xuICAgIHZhciBwcm94eSA9IHRoaXMuYXJncztcbiAgICB2YXIgcHJvcGVydHkgPSBlYWNoUHJvcDtcbiAgICBpZiAoZWFjaFByb3AubWF0Y2goL1xcLi8pKSB7XG4gICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKHRoaXMuYXJncywgZWFjaFByb3AsIHRydWUpO1xuICAgIH1cbiAgICB2YXIgZGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgaWYgKHYgaW5zdGFuY2VvZiBfQmFnLkJhZykge1xuICAgICAgICB2ID0gdi5saXN0O1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMudmlld0xpc3RzLmhhcyh0YWcpKSB7XG4gICAgICAgIHRoaXMudmlld0xpc3RzLmdldCh0YWcpLnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgdmFyIHZpZXdMaXN0ID0gbmV3IF9WaWV3TGlzdC5WaWV3TGlzdChzdWJUZW1wbGF0ZSwgYXNQcm9wLCB2LCB0aGlzLCBrZXlQcm9wLCB2aWV3Q2xhc3MpO1xuICAgICAgdmFyIHZpZXdMaXN0UmVtb3ZlciA9ICgpID0+IHZpZXdMaXN0LnJlbW92ZSgpO1xuICAgICAgdGhpcy5vblJlbW92ZSh2aWV3TGlzdFJlbW92ZXIpO1xuICAgICAgdmlld0xpc3Qub25SZW1vdmUoKCkgPT4gdGhpcy5fb25SZW1vdmUucmVtb3ZlKHZpZXdMaXN0UmVtb3ZlcikpO1xuICAgICAgdmFyIGRlYmluZEEgPSB0aGlzLmFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgIGlmIChrID09PSAnX2lkJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWQpIHtcbiAgICAgICAgICB2aWV3TGlzdC5zdWJBcmdzW2tdID0gdjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoayBpbiB2aWV3TGlzdC5zdWJBcmdzKSB7XG4gICAgICAgICAgICBkZWxldGUgdmlld0xpc3Quc3ViQXJnc1trXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIGRlYmluZEIgPSB2aWV3TGlzdC5hcmdzLmJpbmRUbygodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgICBpZiAoayA9PT0gJ19pZCcgfHwgayA9PT0gJ3ZhbHVlJyB8fCBTdHJpbmcoaykuc3Vic3RyaW5nKDAsIDMpID09PSAnX19fJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWQpIHtcbiAgICAgICAgICBpZiAoayBpbiB0aGlzLmFyZ3MpIHtcbiAgICAgICAgICAgIHRoaXMuYXJnc1trXSA9IHY7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLmFyZ3Nba107XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmlld0xpc3Qub25SZW1vdmUoZGViaW5kQSk7XG4gICAgICB2aWV3TGlzdC5vblJlbW92ZShkZWJpbmRCKTtcbiAgICAgIHRoaXMub25SZW1vdmUoZGViaW5kQSk7XG4gICAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZEIpO1xuICAgICAgd2hpbGUgKHRhZy5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhZy5yZW1vdmVDaGlsZCh0YWcuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgICB0aGlzLnZpZXdMaXN0cy5zZXQodGFnLCB2aWV3TGlzdCk7XG4gICAgICB2aWV3TGlzdC5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICAgIGlmICh0YWcudGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHtcbiAgICAgICAgdmlld0xpc3QucmVSZW5kZXIoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBJZlRhZyh0YWcpIHtcbiAgICB2YXIgc291cmNlVGFnID0gdGFnO1xuICAgIHZhciB2aWV3UHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIGlmUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1pZicpO1xuICAgIHZhciBpc1Byb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtaXMnKTtcbiAgICB2YXIgaW52ZXJ0ZWQgPSBmYWxzZTtcbiAgICB2YXIgZGVmaW5lZCA9IGZhbHNlO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1pZicpO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWlzJyk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHZpZXdQcm9wZXJ0eSA/IHRoaXMuc3RyaW5nVG9DbGFzcyh2aWV3UHJvcGVydHkpIDogVmlldztcbiAgICBpZiAoaWZQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICchJykge1xuICAgICAgaWZQcm9wZXJ0eSA9IGlmUHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgaW52ZXJ0ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaWZQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICc/Jykge1xuICAgICAgaWZQcm9wZXJ0eSA9IGlmUHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgZGVmaW5lZCA9IHRydWU7XG4gICAgfVxuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnNvdXJjZVRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBiaW5kaW5nVmlldyA9IHRoaXM7XG4gICAgdmFyIGlmRG9jID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgIC8vIGxldCB2aWV3ID0gbmV3IHZpZXdDbGFzcyhPYmplY3QuYXNzaWduKHt9LCB0aGlzLmFyZ3MpLCBiaW5kaW5nVmlldyk7XG4gICAgdmFyIHZpZXcgPSBuZXcgdmlld0NsYXNzKHRoaXMuYXJncywgYmluZGluZ1ZpZXcpO1xuICAgIHZpZXcudGFncy5iaW5kVG8oKHYsIGspID0+IHRoaXMudGFnc1trXSA9IHYsIHtcbiAgICAgIHJlbW92ZVdpdGg6IHRoaXNcbiAgICB9KTtcbiAgICB2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gICAgdmFyIHByb3h5ID0gYmluZGluZ1ZpZXcuYXJncztcbiAgICB2YXIgcHJvcGVydHkgPSBpZlByb3BlcnR5O1xuICAgIGlmIChpZlByb3BlcnR5Lm1hdGNoKC9cXC4vKSkge1xuICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShiaW5kaW5nVmlldy5hcmdzLCBpZlByb3BlcnR5LCB0cnVlKTtcbiAgICB9XG4gICAgdmlldy5yZW5kZXIoaWZEb2MsIG51bGwsIHRoaXMpO1xuICAgIHZhciBwcm9wZXJ0eURlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGspID0+IHtcbiAgICAgIHZhciBvID0gdjtcbiAgICAgIGlmIChkZWZpbmVkKSB7XG4gICAgICAgIHYgPSB2ICE9PSBudWxsICYmIHYgIT09IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGlmICh2IGluc3RhbmNlb2YgX0JhZy5CYWcpIHtcbiAgICAgICAgdiA9IHYubGlzdDtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHYpKSB7XG4gICAgICAgIHYgPSAhIXYubGVuZ3RoO1xuICAgICAgfVxuICAgICAgaWYgKGlzUHJvcGVydHkgIT09IG51bGwpIHtcbiAgICAgICAgdiA9IG8gPT0gaXNQcm9wZXJ0eTtcbiAgICAgIH1cbiAgICAgIGlmIChpbnZlcnRlZCkge1xuICAgICAgICB2ID0gIXY7XG4gICAgICB9XG4gICAgICBpZiAodikge1xuICAgICAgICB0YWcuYXBwZW5kQ2hpbGQoaWZEb2MpO1xuICAgICAgICBbLi4uaWZEb2MuY2hpbGROb2Rlc10uZm9yRWFjaChub2RlID0+IF9Eb20uRG9tLm1hcFRhZ3Mobm9kZSwgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgICAgIGlmICghdGFnLm1hdGNoZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkRvbUF0dGFjaGVkJywge1xuICAgICAgICAgICAgdGFyZ2V0OiB0YWcsXG4gICAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmlldy5ub2Rlcy5mb3JFYWNoKG4gPT4gaWZEb2MuYXBwZW5kQ2hpbGQobikpO1xuICAgICAgICBfRG9tLkRvbS5tYXBUYWdzKGlmRG9jLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICAgICAgaWYgKCF0YWcubWF0Y2hlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tRGV0YWNoZWQnLCB7XG4gICAgICAgICAgICB0YXJnZXQ6IHRhZyxcbiAgICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KHByb3h5W3Byb3BlcnR5XSlcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IHByb3BlcnR5RGViaW5kID0gdGhpcy5hcmdzLmJpbmRDaGFpbihwcm9wZXJ0eSwgb25VcGRhdGUpO1xuXG4gICAgYmluZGluZ1ZpZXcub25SZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuXG4gICAgLy8gY29uc3QgZGViaW5kQSA9IHRoaXMuYXJncy5iaW5kVG8oKHYsayx0LGQpID0+IHtcbiAgICAvLyBcdGlmKGsgPT09ICdfaWQnKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRyZXR1cm47XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGlmKCFkKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHR2aWV3LmFyZ3Nba10gPSB2O1xuICAgIC8vIFx0fVxuICAgIC8vIFx0ZWxzZSBpZihrIGluIHZpZXcuYXJncylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0ZGVsZXRlIHZpZXcuYXJnc1trXTtcbiAgICAvLyBcdH1cblxuICAgIC8vIH0pO1xuXG4gICAgLy8gY29uc3QgZGViaW5kQiA9IHZpZXcuYXJncy5iaW5kVG8oKHYsayx0LGQscCkgPT4ge1xuICAgIC8vIFx0aWYoayA9PT0gJ19pZCcgfHwgU3RyaW5nKGspLnN1YnN0cmluZygwLDMpID09PSAnX19fJylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0cmV0dXJuO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRpZihrIGluIHRoaXMuYXJncylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0aWYoIWQpXG4gICAgLy8gXHRcdHtcbiAgICAvLyBcdFx0XHR0aGlzLmFyZ3Nba10gPSB2O1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHRcdGVsc2VcbiAgICAvLyBcdFx0e1xuICAgIC8vIFx0XHRcdGRlbGV0ZSB0aGlzLmFyZ3Nba107XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdH1cbiAgICAvLyB9KTtcblxuICAgIHZhciB2aWV3RGViaW5kID0gKCkgPT4ge1xuICAgICAgcHJvcGVydHlEZWJpbmQoKTtcbiAgICAgIC8vIGRlYmluZEEoKTtcbiAgICAgIC8vIGRlYmluZEIoKTtcbiAgICAgIGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuICAgICAgLy8gYmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShiaW5kYWJsZURlYmluZCk7XG4gICAgfTtcbiAgICBiaW5kaW5nVmlldy5vblJlbW92ZSh2aWV3RGViaW5kKTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIC8vIGRlYmluZEEoKTtcbiAgICAgIC8vIGRlYmluZEIoKTtcbiAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICBpZiAoYmluZGluZ1ZpZXcgIT09IHRoaXMpIHtcbiAgICAgICAgYmluZGluZ1ZpZXcucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIGNvbXBpbGVJZlRhZyhzb3VyY2VUYWcpXG4gIC8vIHtcbiAgLy8gXHRsZXQgaWZQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWlmJyk7XG4gIC8vIFx0bGV0IGludmVydGVkICAgPSBmYWxzZTtcblxuICAvLyBcdHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWlmJyk7XG5cbiAgLy8gXHRpZihpZlByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyEnKVxuICAvLyBcdHtcbiAgLy8gXHRcdGlmUHJvcGVydHkgPSBpZlByb3BlcnR5LnN1YnN0cigxKTtcbiAgLy8gXHRcdGludmVydGVkICAgPSB0cnVlO1xuICAvLyBcdH1cblxuICAvLyBcdGNvbnN0IHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQ7XG5cbiAgLy8gXHRbLi4uc291cmNlVGFnLmNoaWxkTm9kZXNdLmZvckVhY2goXG4gIC8vIFx0XHRuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4uY2xvbmVOb2RlKHRydWUpKVxuICAvLyBcdCk7XG5cbiAgLy8gXHRyZXR1cm4gKGJpbmRpbmdWaWV3KSA9PiB7XG5cbiAgLy8gXHRcdGNvbnN0IHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUoKTtcblxuICAvLyBcdFx0Y29uc3QgaWZEb2MgPSBuZXcgRG9jdW1lbnRGcmFnbWVudDtcblxuICAvLyBcdFx0bGV0IHZpZXcgPSBuZXcgVmlldyh7fSwgYmluZGluZ1ZpZXcpO1xuXG4gIC8vIFx0XHR2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gIC8vIFx0XHQvLyB2aWV3LnBhcmVudCAgID0gYmluZGluZ1ZpZXc7XG5cbiAgLy8gXHRcdGJpbmRpbmdWaWV3LnN5bmNCaW5kKHZpZXcpO1xuXG4gIC8vIFx0XHRsZXQgcHJveHkgICAgPSBiaW5kaW5nVmlldy5hcmdzO1xuICAvLyBcdFx0bGV0IHByb3BlcnR5ID0gaWZQcm9wZXJ0eTtcblxuICAvLyBcdFx0aWYoaWZQcm9wZXJ0eS5tYXRjaCgvXFwuLykpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdFtwcm94eSwgcHJvcGVydHldID0gQmluZGFibGUucmVzb2x2ZShcbiAgLy8gXHRcdFx0XHRiaW5kaW5nVmlldy5hcmdzXG4gIC8vIFx0XHRcdFx0LCBpZlByb3BlcnR5XG4gIC8vIFx0XHRcdFx0LCB0cnVlXG4gIC8vIFx0XHRcdCk7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGxldCBoYXNSZW5kZXJlZCA9IGZhbHNlO1xuXG4gIC8vIFx0XHRjb25zdCBwcm9wZXJ0eURlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsaykgPT4ge1xuXG4gIC8vIFx0XHRcdGlmKCFoYXNSZW5kZXJlZClcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdGNvbnN0IHJlbmRlckRvYyA9IChiaW5kaW5nVmlldy5hcmdzW3Byb3BlcnR5XSB8fCBpbnZlcnRlZClcbiAgLy8gXHRcdFx0XHRcdD8gdGFnIDogaWZEb2M7XG5cbiAgLy8gXHRcdFx0XHR2aWV3LnJlbmRlcihyZW5kZXJEb2MpO1xuXG4gIC8vIFx0XHRcdFx0aGFzUmVuZGVyZWQgPSB0cnVlO1xuXG4gIC8vIFx0XHRcdFx0cmV0dXJuO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0aWYoQXJyYXkuaXNBcnJheSh2KSlcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHYgPSAhIXYubGVuZ3RoO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0aWYoaW52ZXJ0ZWQpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR2ID0gIXY7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRpZih2KVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0dGFnLmFwcGVuZENoaWxkKGlmRG9jKTtcbiAgLy8gXHRcdFx0fVxuICAvLyBcdFx0XHRlbHNlXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR2aWV3Lm5vZGVzLmZvckVhY2gobj0+aWZEb2MuYXBwZW5kQ2hpbGQobikpO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdH0pO1xuXG4gIC8vIFx0XHQvLyBsZXQgY2xlYW5lciA9IGJpbmRpbmdWaWV3O1xuXG4gIC8vIFx0XHQvLyB3aGlsZShjbGVhbmVyLnBhcmVudClcbiAgLy8gXHRcdC8vIHtcbiAgLy8gXHRcdC8vIFx0Y2xlYW5lciA9IGNsZWFuZXIucGFyZW50O1xuICAvLyBcdFx0Ly8gfVxuXG4gIC8vIFx0XHRiaW5kaW5nVmlldy5vblJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG5cbiAgLy8gXHRcdGxldCBiaW5kYWJsZURlYmluZCA9ICgpID0+IHtcblxuICAvLyBcdFx0XHRpZighcHJveHkuaXNCb3VuZCgpKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyhwcm94eSk7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0fTtcblxuICAvLyBcdFx0bGV0IHZpZXdEZWJpbmQgPSAoKT0+e1xuICAvLyBcdFx0XHRwcm9wZXJ0eURlYmluZCgpO1xuICAvLyBcdFx0XHRiaW5kYWJsZURlYmluZCgpO1xuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShiaW5kYWJsZURlYmluZCk7XG4gIC8vIFx0XHR9O1xuXG4gIC8vIFx0XHR2aWV3Lm9uUmVtb3ZlKHZpZXdEZWJpbmQpO1xuXG4gIC8vIFx0XHRyZXR1cm4gdGFnO1xuICAvLyBcdH07XG4gIC8vIH1cblxuICBtYXBUZW1wbGF0ZVRhZyh0YWcpIHtcbiAgICAvLyBjb25zdCB0ZW1wbGF0ZU5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuXG4gICAgLy8gdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcblxuICAgIC8vIHRoaXMudGVtcGxhdGVzWyB0ZW1wbGF0ZU5hbWUgXSA9IHRhZy50YWdOYW1lID09PSAnVEVNUExBVEUnXG4gICAgLy8gXHQ/IHRhZy5jbG9uZU5vZGUodHJ1ZSkuY29udGVudFxuICAgIC8vIFx0OiBuZXcgRG9jdW1lbnRGcmFnbWVudCh0YWcuaW5uZXJIVE1MKTtcblxuICAgIHZhciB0ZW1wbGF0ZU5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG4gICAgdmFyIHNvdXJjZSA9IHRhZy5pbm5lckhUTUw7XG4gICAgaWYgKCFWaWV3LnRlbXBsYXRlcy5oYXMoc291cmNlKSkge1xuICAgICAgVmlldy50ZW1wbGF0ZXMuc2V0KHNvdXJjZSwgZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQodGFnLmlubmVySFRNTCkpO1xuICAgIH1cbiAgICB0aGlzLnRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdID0gVmlldy50ZW1wbGF0ZXMuZ2V0KHNvdXJjZSk7XG4gICAgdGhpcy5wb3N0TWFwcGluZy5hZGQoKCkgPT4gdGFnLnJlbW92ZSgpKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFNsb3RUYWcodGFnKSB7XG4gICAgdmFyIHRlbXBsYXRlTmFtZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXNsb3QnKTtcbiAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdO1xuICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICB0ZW1wbGF0ZSA9IHBhcmVudC50ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXTtcbiAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgIH1cbiAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgVGVtcGxhdGUgJHt0ZW1wbGF0ZU5hbWV9IG5vdCBmb3VuZC5gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1zbG90Jyk7XG4gICAgd2hpbGUgKHRhZy5maXJzdENoaWxkKSB7XG4gICAgICB0YWcuZmlyc3RDaGlsZC5yZW1vdmUoKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmICghVmlldy50ZW1wbGF0ZXMuaGFzKHRlbXBsYXRlKSkge1xuICAgICAgICBWaWV3LnRlbXBsYXRlcy5zZXQodGVtcGxhdGUsIGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHRlbXBsYXRlKSk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZSA9IFZpZXcudGVtcGxhdGVzLmdldCh0ZW1wbGF0ZSk7XG4gICAgfVxuICAgIHRhZy5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBzeW5jQmluZChzdWJWaWV3KVxuICAvLyB7XG4gIC8vIFx0bGV0IGRlYmluZEEgPSB0aGlzLmFyZ3MuYmluZFRvKCh2LGssdCxkKT0+e1xuICAvLyBcdFx0aWYoayA9PT0gJ19pZCcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHJldHVybjtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYoc3ViVmlldy5hcmdzW2tdICE9PSB2KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRzdWJWaWV3LmFyZ3Nba10gPSB2O1xuICAvLyBcdFx0fVxuICAvLyBcdH0pO1xuXG4gIC8vIFx0bGV0IGRlYmluZEIgPSBzdWJWaWV3LmFyZ3MuYmluZFRvKCh2LGssdCxkLHApPT57XG5cbiAgLy8gXHRcdGlmKGsgPT09ICdfaWQnKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRyZXR1cm47XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGxldCBuZXdSZWYgPSB2O1xuICAvLyBcdFx0bGV0IG9sZFJlZiA9IHA7XG5cbiAgLy8gXHRcdGlmKG5ld1JlZiBpbnN0YW5jZW9mIFZpZXcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdG5ld1JlZiA9IG5ld1JlZi5fX19yZWZfX187XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKG9sZFJlZiBpbnN0YW5jZW9mIFZpZXcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdG9sZFJlZiA9IG9sZFJlZi5fX19yZWZfX187XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKG5ld1JlZiAhPT0gb2xkUmVmICYmIG9sZFJlZiBpbnN0YW5jZW9mIFZpZXcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHAucmVtb3ZlKCk7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKGsgaW4gdGhpcy5hcmdzKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHR0aGlzLmFyZ3Nba10gPSB2O1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0fSk7XG5cbiAgLy8gXHR0aGlzLm9uUmVtb3ZlKGRlYmluZEEpO1xuICAvLyBcdHRoaXMub25SZW1vdmUoZGViaW5kQik7XG5cbiAgLy8gXHRzdWJWaWV3Lm9uUmVtb3ZlKCgpPT57XG4gIC8vIFx0XHR0aGlzLl9vblJlbW92ZS5yZW1vdmUoZGViaW5kQSk7XG4gIC8vIFx0XHR0aGlzLl9vblJlbW92ZS5yZW1vdmUoZGViaW5kQik7XG4gIC8vIFx0fSk7XG4gIC8vIH1cblxuICBwb3N0UmVuZGVyKHBhcmVudE5vZGUpIHt9XG4gIGF0dGFjaGVkKHBhcmVudE5vZGUpIHt9XG4gIGludGVycG9sYXRhYmxlKHN0cikge1xuICAgIHJldHVybiAhIVN0cmluZyhzdHIpLm1hdGNoKHRoaXMuaW50ZXJwb2xhdGVSZWdleCk7XG4gIH1cbiAgc3RhdGljIHV1aWQoKSB7XG4gICAgcmV0dXJuIG5ldyBfVXVpZC5VdWlkKCk7XG4gIH1cbiAgcmVtb3ZlKG5vdyA9IGZhbHNlKSB7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW1vdmUnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgdmlldzogdGhpc1xuICAgICAgfSxcbiAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICB9KSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlbW92ZXIgPSAoKSA9PiB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMudGFncykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLnRhZ3NbaV0pKSB7XG4gICAgICAgICAgdGhpcy50YWdzW2ldICYmIHRoaXMudGFnc1tpXS5mb3JFYWNoKHQgPT4gdC5yZW1vdmUoKSk7XG4gICAgICAgICAgdGhpcy50YWdzW2ldLnNwbGljZSgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0gJiYgdGhpcy50YWdzW2ldLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMudGFnc1tpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2kzIGluIHRoaXMubm9kZXMpIHtcbiAgICAgICAgdGhpcy5ub2Rlc1tfaTNdICYmIHRoaXMubm9kZXNbX2kzXS5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY3ZEb21EZXRhY2hlZCcpKTtcbiAgICAgICAgdGhpcy5ub2Rlc1tfaTNdICYmIHRoaXMubm9kZXNbX2kzXS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5ub2Rlc1tfaTNdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgdGhpcy5ub2Rlcy5zcGxpY2UoMCk7XG4gICAgICB0aGlzLmZpcnN0Tm9kZSA9IHRoaXMubGFzdE5vZGUgPSB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICBpZiAobm93KSB7XG4gICAgICByZW1vdmVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShyZW1vdmVyKTtcbiAgICB9XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX29uUmVtb3ZlLml0ZW1zKCk7XG4gICAgZm9yICh2YXIgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgICAgdGhpcy5fb25SZW1vdmUucmVtb3ZlKGNhbGxiYWNrKTtcbiAgICB9XG4gICAgZm9yICh2YXIgY2xlYW51cCBvZiB0aGlzLmNsZWFudXApIHtcbiAgICAgIGNsZWFudXAgJiYgY2xlYW51cCgpO1xuICAgIH1cbiAgICB0aGlzLmNsZWFudXAubGVuZ3RoID0gMDtcbiAgICBmb3IgKHZhciBbdGFnLCB2aWV3TGlzdF0gb2YgdGhpcy52aWV3TGlzdHMpIHtcbiAgICAgIHZpZXdMaXN0LnJlbW92ZSgpO1xuICAgIH1cbiAgICB0aGlzLnZpZXdMaXN0cy5jbGVhcigpO1xuICAgIGZvciAodmFyIFtfY2FsbGJhY2s1LCB0aW1lb3V0XSBvZiB0aGlzLnRpbWVvdXRzKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dC50aW1lb3V0KTtcbiAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXQudGltZW91dCk7XG4gICAgfVxuICAgIGZvciAodmFyIGludGVydmFsIG9mIHRoaXMuaW50ZXJ2YWxzKSB7XG4gICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICB9XG4gICAgdGhpcy5pbnRlcnZhbHMubGVuZ3RoID0gMDtcbiAgICBmb3IgKHZhciBmcmFtZSBvZiB0aGlzLmZyYW1lcykge1xuICAgICAgZnJhbWUoKTtcbiAgICB9XG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLnByZVJ1bGVTZXQucHVyZ2UoKTtcbiAgICB0aGlzLnJ1bGVTZXQucHVyZ2UoKTtcbiAgICB0aGlzLnJlbW92ZWQgPSB0cnVlO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92ZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgdmlldzogdGhpc1xuICAgICAgfSxcbiAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICB9KSk7XG4gIH1cbiAgZmluZFRhZyhzZWxlY3Rvcikge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5ub2Rlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IHZvaWQgMDtcbiAgICAgIGlmICghdGhpcy5ub2Rlc1tpXS5xdWVyeVNlbGVjdG9yKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubm9kZXNbaV0ubWF0Y2hlcyhzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBfVGFnLlRhZyh0aGlzLm5vZGVzW2ldLCB0aGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcyk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0ID0gdGhpcy5ub2Rlc1tpXS5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IF9UYWcuVGFnKHJlc3VsdCwgdGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBmaW5kVGFncyhzZWxlY3Rvcikge1xuICAgIHZhciB0b3BMZXZlbCA9IHRoaXMubm9kZXMuZmlsdGVyKG4gPT4gbi5tYXRjaGVzICYmIG4ubWF0Y2hlcyhzZWxlY3RvcikpO1xuICAgIHZhciBzdWJMZXZlbCA9IHRoaXMubm9kZXMuZmlsdGVyKG4gPT4gbi5xdWVyeVNlbGVjdG9yQWxsKS5tYXAobiA9PiBbLi4ubi5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKV0pLmZsYXQoKS5tYXAobiA9PiBuZXcgX1RhZy5UYWcobiwgdGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMpKSB8fCBbXTtcbiAgICByZXR1cm4gdG9wTGV2ZWwuY29uY2F0KHN1YkxldmVsKTtcbiAgfVxuICBvblJlbW92ZShjYWxsYmFjaykge1xuICAgIGlmIChjYWxsYmFjayBpbnN0YW5jZW9mIEV2ZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX29uUmVtb3ZlLmFkZChjYWxsYmFjayk7XG4gIH1cbiAgdXBkYXRlKCkge31cbiAgYmVmb3JlVXBkYXRlKGFyZ3MpIHt9XG4gIGFmdGVyVXBkYXRlKGFyZ3MpIHt9XG4gIHN0cmluZ1RyYW5zZm9ybWVyKG1ldGhvZHMpIHtcbiAgICByZXR1cm4geCA9PiB7XG4gICAgICBmb3IgKHZhciBtIGluIG1ldGhvZHMpIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBtZXRob2QgPSBtZXRob2RzW21dO1xuICAgICAgICB3aGlsZSAocGFyZW50ICYmICFwYXJlbnRbbWV0aG9kXSkge1xuICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFwYXJlbnQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgeCA9IHBhcmVudFttZXRob2RzW21dXSh4KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB4O1xuICAgIH07XG4gIH1cbiAgc3RyaW5nVG9DbGFzcyhyZWZDbGFzc25hbWUpIHtcbiAgICBpZiAoVmlldy5yZWZDbGFzc2VzLmhhcyhyZWZDbGFzc25hbWUpKSB7XG4gICAgICByZXR1cm4gVmlldy5yZWZDbGFzc2VzLmdldChyZWZDbGFzc25hbWUpO1xuICAgIH1cbiAgICB2YXIgcmVmQ2xhc3NTcGxpdCA9IHJlZkNsYXNzbmFtZS5zcGxpdCgnLycpO1xuICAgIHZhciByZWZTaG9ydENsYXNzID0gcmVmQ2xhc3NTcGxpdFtyZWZDbGFzc1NwbGl0Lmxlbmd0aCAtIDFdO1xuICAgIHZhciByZWZDbGFzcyA9IHJlcXVpcmUocmVmQ2xhc3NuYW1lKTtcbiAgICBWaWV3LnJlZkNsYXNzZXMuc2V0KHJlZkNsYXNzbmFtZSwgcmVmQ2xhc3NbcmVmU2hvcnRDbGFzc10pO1xuICAgIHJldHVybiByZWZDbGFzc1tyZWZTaG9ydENsYXNzXTtcbiAgfVxuICBwcmV2ZW50UGFyc2luZyhub2RlKSB7XG4gICAgbm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgfVxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5ub2Rlcy5tYXAobiA9PiBuLm91dGVySFRNTCkuam9pbignICcpO1xuICB9XG4gIGxpc3Rlbihub2RlLCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBldmVudE5hbWU7XG4gICAgICBldmVudE5hbWUgPSBub2RlO1xuICAgICAgbm9kZSA9IHRoaXM7XG4gICAgfVxuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVmlldykge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdGVuKG5vZGUubm9kZXMsIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUubWFwKG4gPT4gdGhpcy5saXN0ZW4obiwgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucykpO1xuICAgICAgLy8gLmZvckVhY2gociA9PiByKCkpO1xuICAgIH1cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0ZW4obm9kZS5lbGVtZW50LCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIHZhciByZW1vdmUgPSAoKSA9PiBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgdmFyIHJlbW92ZXIgPSAoKSA9PiB7XG4gICAgICByZW1vdmUoKTtcbiAgICAgIHJlbW92ZSA9ICgpID0+IHt9O1xuICAgIH07XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiByZW1vdmVyKCkpO1xuICAgIHJldHVybiByZW1vdmVyO1xuICB9XG4gIGRldGFjaCgpIHtcbiAgICBmb3IgKHZhciBuIGluIHRoaXMubm9kZXMpIHtcbiAgICAgIHRoaXMubm9kZXNbbl0ucmVtb3ZlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICB9XG59XG5leHBvcnRzLlZpZXcgPSBWaWV3O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFZpZXcsICd0ZW1wbGF0ZXMnLCB7XG4gIHZhbHVlOiBuZXcgTWFwKClcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFZpZXcsICdyZWZDbGFzc2VzJywge1xuICB2YWx1ZTogbmV3IE1hcCgpXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1ZpZXdMaXN0LmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5WaWV3TGlzdCA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBfU2V0TWFwID0gcmVxdWlyZShcIi4vU2V0TWFwXCIpO1xudmFyIF9CYWcgPSByZXF1aXJlKFwiLi9CYWdcIik7XG5jbGFzcyBWaWV3TGlzdCB7XG4gIGNvbnN0cnVjdG9yKHRlbXBsYXRlLCBzdWJQcm9wZXJ0eSwgbGlzdCwgcGFyZW50LCBrZXlQcm9wZXJ0eSA9IG51bGwsIHZpZXdDbGFzcyA9IG51bGwpIHtcbiAgICB0aGlzLnJlbW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmFyZ3MgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgIHRoaXMuYXJncy52YWx1ZSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUobGlzdCB8fCBPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICB0aGlzLnN1YkFyZ3MgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICB0aGlzLmNsZWFudXAgPSBbXTtcbiAgICB0aGlzLnZpZXdDbGFzcyA9IHZpZXdDbGFzcztcbiAgICB0aGlzLl9vblJlbW92ZSA9IG5ldyBfQmFnLkJhZygpO1xuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICB0aGlzLnN1YlByb3BlcnR5ID0gc3ViUHJvcGVydHk7XG4gICAgdGhpcy5rZXlQcm9wZXJ0eSA9IGtleVByb3BlcnR5O1xuICAgIHRoaXMudGFnID0gbnVsbDtcbiAgICB0aGlzLmRvd25EZWJpbmQgPSBbXTtcbiAgICB0aGlzLnVwRGViaW5kID0gW107XG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLnZpZXdDb3VudCA9IDA7XG4gICAgdGhpcy5yZW5kZXJlZCA9IG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCkgPT4ge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZW5kZXJDb21wbGV0ZScsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIHZhbHVlOiBhY2NlcHRcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMud2lsbFJlUmVuZGVyID0gZmFsc2U7XG4gICAgdGhpcy5hcmdzLl9fX2JlZm9yZSgodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgaWYgKGUgPT0gJ2JpbmRUbycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXVzZWQgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMuYXJncy5fX19hZnRlcigodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgaWYgKGUgPT0gJ2JpbmRUbycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXVzZWQgPSBzLmxlbmd0aCA+IDE7XG4gICAgICB0aGlzLnJlUmVuZGVyKCk7XG4gICAgfSk7XG4gICAgdmFyIGRlYmluZCA9IHRoaXMuYXJncy52YWx1ZS5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgIGlmICh0aGlzLnBhdXNlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIga2sgPSBrO1xuICAgICAgaWYgKHR5cGVvZiBrID09PSAnc3ltYm9sJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoaXNOYU4oaykpIHtcbiAgICAgICAga2sgPSAnXycgKyBrO1xuICAgICAgfVxuICAgICAgaWYgKGQpIHtcbiAgICAgICAgaWYgKHRoaXMudmlld3Nba2tdKSB7XG4gICAgICAgICAgdGhpcy52aWV3c1tra10ucmVtb3ZlKHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSB0aGlzLnZpZXdzW2trXTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLnZpZXdzW2ldKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlzTmFOKGkpKSB7XG4gICAgICAgICAgICB0aGlzLnZpZXdzW2ldLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBpLnN1YnN0cigxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnZpZXdzW2ldLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLnZpZXdzW2trXSkge1xuICAgICAgICBpZiAoIXRoaXMudmlld0NvdW50KSB7XG4gICAgICAgICAgdGhpcy5yZVJlbmRlcigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0aGlzLndpbGxSZVJlbmRlciA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMud2lsbFJlUmVuZGVyID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy53aWxsUmVSZW5kZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgdGhpcy5yZVJlbmRlcigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudmlld3Nba2tdICYmIHRoaXMudmlld3Nba2tdLmFyZ3MpIHtcbiAgICAgICAgdGhpcy52aWV3c1tra10uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IGs7XG4gICAgICAgIHRoaXMudmlld3Nba2tdLmFyZ3NbdGhpcy5zdWJQcm9wZXJ0eV0gPSB2O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHdhaXQ6IDBcbiAgICB9KTtcbiAgICB0aGlzLl9vblJlbW92ZS5hZGQoZGViaW5kKTtcbiAgICBPYmplY3QucHJldmVudEV4dGVuc2lvbnModGhpcyk7XG4gIH1cbiAgcmVuZGVyKHRhZykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyIHJlbmRlcnMgPSBbXTtcbiAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAodmlldykge1xuICAgICAgdmlldy52aWV3TGlzdCA9IF90aGlzO1xuICAgICAgdmlldy5yZW5kZXIodGFnLCBudWxsLCBfdGhpcy5wYXJlbnQpO1xuICAgICAgcmVuZGVycy5wdXNoKHZpZXcucmVuZGVyZWQudGhlbigoKSA9PiB2aWV3KSk7XG4gICAgfTtcbiAgICBmb3IgKHZhciB2aWV3IG9mIHRoaXMudmlld3MpIHtcbiAgICAgIF9sb29wKHZpZXcpO1xuICAgIH1cbiAgICB0aGlzLnRhZyA9IHRhZztcbiAgICBQcm9taXNlLmFsbChyZW5kZXJzKS50aGVuKHZpZXdzID0+IHRoaXMucmVuZGVyQ29tcGxldGUodmlld3MpKTtcbiAgICB0aGlzLnBhcmVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdFJlbmRlcmVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGtleTogdGhpcy5zdWJQcm9wZXJ0eSxcbiAgICAgICAgICB2YWx1ZTogdGhpcy5hcmdzLnZhbHVlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbiAgcmVSZW5kZXIoKSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG4gICAgaWYgKHRoaXMucGF1c2VkIHx8ICF0aGlzLnRhZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdmlld3MgPSBbXTtcbiAgICB2YXIgZXhpc3RpbmdWaWV3cyA9IG5ldyBfU2V0TWFwLlNldE1hcCgpO1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgdmFyIHZpZXcgPSB0aGlzLnZpZXdzW2ldO1xuICAgICAgaWYgKHZpZXcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2aWV3c1tpXSA9IHZpZXc7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIHJhd1ZhbHVlID0gdmlldy5hcmdzW3RoaXMuc3ViUHJvcGVydHldO1xuICAgICAgZXhpc3RpbmdWaWV3cy5hZGQocmF3VmFsdWUsIHZpZXcpO1xuICAgICAgdmlld3NbaV0gPSB2aWV3O1xuICAgIH1cbiAgICB2YXIgZmluYWxWaWV3cyA9IFtdO1xuICAgIHZhciBmaW5hbFZpZXdTZXQgPSBuZXcgU2V0KCk7XG4gICAgdGhpcy5kb3duRGViaW5kLmxlbmd0aCAmJiB0aGlzLmRvd25EZWJpbmQuZm9yRWFjaChkID0+IGQgJiYgZCgpKTtcbiAgICB0aGlzLnVwRGViaW5kLmxlbmd0aCAmJiB0aGlzLnVwRGViaW5kLmZvckVhY2goZCA9PiBkICYmIGQoKSk7XG4gICAgdGhpcy51cERlYmluZC5sZW5ndGggPSAwO1xuICAgIHRoaXMuZG93bkRlYmluZC5sZW5ndGggPSAwO1xuICAgIHZhciBtaW5LZXkgPSBJbmZpbml0eTtcbiAgICB2YXIgYW50ZU1pbktleSA9IEluZmluaXR5O1xuICAgIHZhciBfbG9vcDIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICAgIHZhciBrID0gX2k7XG4gICAgICBpZiAoaXNOYU4oaykpIHtcbiAgICAgICAgayA9ICdfJyArIF9pO1xuICAgICAgfSBlbHNlIGlmIChTdHJpbmcoaykubGVuZ3RoKSB7XG4gICAgICAgIGsgPSBOdW1iZXIoayk7XG4gICAgICB9XG4gICAgICBpZiAoX3RoaXMyLmFyZ3MudmFsdWVbX2ldICE9PSB1bmRlZmluZWQgJiYgZXhpc3RpbmdWaWV3cy5oYXMoX3RoaXMyLmFyZ3MudmFsdWVbX2ldKSkge1xuICAgICAgICB2YXIgZXhpc3RpbmdWaWV3ID0gZXhpc3RpbmdWaWV3cy5nZXRPbmUoX3RoaXMyLmFyZ3MudmFsdWVbX2ldKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nVmlldykge1xuICAgICAgICAgIGV4aXN0aW5nVmlldy5hcmdzW190aGlzMi5rZXlQcm9wZXJ0eV0gPSBfaTtcbiAgICAgICAgICBmaW5hbFZpZXdzW2tdID0gZXhpc3RpbmdWaWV3O1xuICAgICAgICAgIGZpbmFsVmlld1NldC5hZGQoZXhpc3RpbmdWaWV3KTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgaWYgKCFpc05hTihrKSkge1xuICAgICAgICAgICAgbWluS2V5ID0gTWF0aC5taW4obWluS2V5LCBrKTtcbiAgICAgICAgICAgIGsgPiAwICYmIChhbnRlTWluS2V5ID0gTWF0aC5taW4oYW50ZU1pbktleSwgaykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBleGlzdGluZ1ZpZXdzLnJlbW92ZShfdGhpczIuYXJncy52YWx1ZVtfaV0sIGV4aXN0aW5nVmlldyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgdmFyIHZpZXdBcmdzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgdmFyIF92aWV3ID0gZmluYWxWaWV3c1trXSA9IG5ldyBfdGhpczIudmlld0NsYXNzKHZpZXdBcmdzLCBfdGhpczIucGFyZW50KTtcbiAgICAgICAgaWYgKCFpc05hTihrKSkge1xuICAgICAgICAgIG1pbktleSA9IE1hdGgubWluKG1pbktleSwgayk7XG4gICAgICAgICAgayA+IDAgJiYgKGFudGVNaW5LZXkgPSBNYXRoLm1pbihhbnRlTWluS2V5LCBrKSk7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxWaWV3c1trXS50ZW1wbGF0ZSA9IF90aGlzMi50ZW1wbGF0ZTtcbiAgICAgICAgZmluYWxWaWV3c1trXS52aWV3TGlzdCA9IF90aGlzMjtcbiAgICAgICAgZmluYWxWaWV3c1trXS5hcmdzW190aGlzMi5rZXlQcm9wZXJ0eV0gPSBfaTtcbiAgICAgICAgZmluYWxWaWV3c1trXS5hcmdzW190aGlzMi5zdWJQcm9wZXJ0eV0gPSBfdGhpczIuYXJncy52YWx1ZVtfaV07XG4gICAgICAgIF90aGlzMi51cERlYmluZFtrXSA9IHZpZXdBcmdzLmJpbmRUbyhfdGhpczIuc3ViUHJvcGVydHksICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgdmFyIGluZGV4ID0gdmlld0FyZ3NbX3RoaXMyLmtleVByb3BlcnR5XTtcbiAgICAgICAgICBpZiAoZCkge1xuICAgICAgICAgICAgZGVsZXRlIF90aGlzMi5hcmdzLnZhbHVlW2luZGV4XTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgX3RoaXMyLmFyZ3MudmFsdWVbaW5kZXhdID0gdjtcbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzMi5kb3duRGViaW5kW2tdID0gX3RoaXMyLnN1YkFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2aWV3QXJnc1trXTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmlld0FyZ3Nba10gPSB2O1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHVwRGViaW5kID0gKCkgPT4ge1xuICAgICAgICAgIF90aGlzMi51cERlYmluZC5maWx0ZXIoeCA9PiB4KS5mb3JFYWNoKGQgPT4gZCgpKTtcbiAgICAgICAgICBfdGhpczIudXBEZWJpbmQubGVuZ3RoID0gMDtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGRvd25EZWJpbmQgPSAoKSA9PiB7XG4gICAgICAgICAgX3RoaXMyLmRvd25EZWJpbmQuZmlsdGVyKHggPT4geCkuZm9yRWFjaChkID0+IGQoKSk7XG4gICAgICAgICAgX3RoaXMyLmRvd25EZWJpbmQubGVuZ3RoID0gMDtcbiAgICAgICAgfTtcbiAgICAgICAgX3ZpZXcub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIF90aGlzMi5fb25SZW1vdmUucmVtb3ZlKHVwRGViaW5kKTtcbiAgICAgICAgICBfdGhpczIuX29uUmVtb3ZlLnJlbW92ZShkb3duRGViaW5kKTtcbiAgICAgICAgICBfdGhpczIudXBEZWJpbmRba10gJiYgX3RoaXMyLnVwRGViaW5kW2tdKCk7XG4gICAgICAgICAgX3RoaXMyLmRvd25EZWJpbmRba10gJiYgX3RoaXMyLmRvd25EZWJpbmRba10oKTtcbiAgICAgICAgICBkZWxldGUgX3RoaXMyLnVwRGViaW5kW2tdO1xuICAgICAgICAgIGRlbGV0ZSBfdGhpczIuZG93bkRlYmluZFtrXTtcbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzMi5fb25SZW1vdmUuYWRkKHVwRGViaW5kKTtcbiAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5hZGQoZG93bkRlYmluZCk7XG4gICAgICAgIHZpZXdBcmdzW190aGlzMi5zdWJQcm9wZXJ0eV0gPSBfdGhpczIuYXJncy52YWx1ZVtfaV07XG4gICAgICB9XG4gICAgfTtcbiAgICBmb3IgKHZhciBfaSBpbiB0aGlzLmFyZ3MudmFsdWUpIHtcbiAgICAgIF9sb29wMigpO1xuICAgIH1cbiAgICBmb3IgKHZhciBfaTIgaW4gdmlld3MpIHtcbiAgICAgIGlmICh2aWV3c1tfaTJdICYmICFmaW5hbFZpZXdTZXQuaGFzKHZpZXdzW19pMl0pKSB7XG4gICAgICAgIHZpZXdzW19pMl0ucmVtb3ZlKHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmFyZ3MudmFsdWUpKSB7XG4gICAgICB2YXIgbG9jYWxNaW4gPSBtaW5LZXkgPT09IDAgJiYgZmluYWxWaWV3c1sxXSAhPT0gdW5kZWZpbmVkICYmIGZpbmFsVmlld3MubGVuZ3RoID4gMSB8fCBhbnRlTWluS2V5ID09PSBJbmZpbml0eSA/IG1pbktleSA6IGFudGVNaW5LZXk7XG4gICAgICB2YXIgcmVuZGVyUmVjdXJzZSA9IChpID0gMCkgPT4ge1xuICAgICAgICB2YXIgaWkgPSBmaW5hbFZpZXdzLmxlbmd0aCAtIGkgLSAxO1xuICAgICAgICB3aGlsZSAoaWkgPiBsb2NhbE1pbiAmJiBmaW5hbFZpZXdzW2lpXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWktLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWkgPCBsb2NhbE1pbikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmluYWxWaWV3c1tpaV0gPT09IHRoaXMudmlld3NbaWldKSB7XG4gICAgICAgICAgaWYgKGZpbmFsVmlld3NbaWldICYmICFmaW5hbFZpZXdzW2lpXS5maXJzdE5vZGUpIHtcbiAgICAgICAgICAgIGZpbmFsVmlld3NbaWldLnJlbmRlcih0aGlzLnRhZywgZmluYWxWaWV3c1tpaSArIDFdLCB0aGlzLnBhcmVudCk7XG4gICAgICAgICAgICByZXR1cm4gZmluYWxWaWV3c1tpaV0ucmVuZGVyZWQudGhlbigoKSA9PiByZW5kZXJSZWN1cnNlKE51bWJlcihpKSArIDEpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHNwbGl0ID0gNTAwO1xuICAgICAgICAgICAgaWYgKGkgPT09IDAgfHwgaSAlIHNwbGl0KSB7XG4gICAgICAgICAgICAgIHJldHVybiByZW5kZXJSZWN1cnNlKE51bWJlcihpKSArIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFjY2VwdCA9PiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gYWNjZXB0KHJlbmRlclJlY3Vyc2UoTnVtYmVyKGkpICsgMSkpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZpbmFsVmlld3NbaWldLnJlbmRlcih0aGlzLnRhZywgZmluYWxWaWV3c1tpaSArIDFdLCB0aGlzLnBhcmVudCk7XG4gICAgICAgIHRoaXMudmlld3Muc3BsaWNlKGlpLCAwLCBmaW5hbFZpZXdzW2lpXSk7XG4gICAgICAgIHJldHVybiBmaW5hbFZpZXdzW2lpXS5yZW5kZXJlZC50aGVuKCgpID0+IHJlbmRlclJlY3Vyc2UoaSArIDEpKTtcbiAgICAgIH07XG4gICAgICB0aGlzLnJlbmRlcmVkID0gcmVuZGVyUmVjdXJzZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVuZGVycyA9IFtdO1xuICAgICAgdmFyIGxlZnRvdmVycyA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmNyZWF0ZShudWxsKSwgZmluYWxWaWV3cyk7XG4gICAgICB2YXIgaXNJbnQgPSB4ID0+IHBhcnNlSW50KHgpID09PSB4IC0gMDtcbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZmluYWxWaWV3cykuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICBpZiAoaXNJbnQoYSkgJiYgaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gTWF0aC5zaWduKGEgLSBiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzSW50KGEpICYmICFpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNJbnQoYSkgJiYgaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzSW50KGEpICYmICFpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZhciBfbG9vcDMgPSBmdW5jdGlvbiAoX2kzKSB7XG4gICAgICAgIGRlbGV0ZSBsZWZ0b3ZlcnNbX2kzXTtcbiAgICAgICAgaWYgKGZpbmFsVmlld3NbX2kzXS5maXJzdE5vZGUgJiYgZmluYWxWaWV3c1tfaTNdID09PSBfdGhpczIudmlld3NbX2kzXSkge1xuICAgICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGZpbmFsVmlld3NbX2kzXS5yZW5kZXIoX3RoaXMyLnRhZywgbnVsbCwgX3RoaXMyLnBhcmVudCk7XG4gICAgICAgIHJlbmRlcnMucHVzaChmaW5hbFZpZXdzW19pM10ucmVuZGVyZWQudGhlbigoKSA9PiBmaW5hbFZpZXdzW19pM10pKTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBfaTMgb2Yga2V5cykge1xuICAgICAgICBpZiAoX2xvb3AzKF9pMykpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2k0IGluIGxlZnRvdmVycykge1xuICAgICAgICBkZWxldGUgdGhpcy5hcmdzLnZpZXdzW19pNF07XG4gICAgICAgIGxlZnRvdmVycy5yZW1vdmUodHJ1ZSk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlbmRlcmVkID0gUHJvbWlzZS5hbGwocmVuZGVycyk7XG4gICAgfVxuICAgIGZvciAodmFyIF9pNSBpbiBmaW5hbFZpZXdzKSB7XG4gICAgICBpZiAoaXNOYU4oX2k1KSkge1xuICAgICAgICBmaW5hbFZpZXdzW19pNV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IF9pNS5zdWJzdHIoMSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZmluYWxWaWV3c1tfaTVdLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBfaTU7XG4gICAgfVxuICAgIHRoaXMudmlld3MgPSBBcnJheS5pc0FycmF5KHRoaXMuYXJncy52YWx1ZSkgPyBbLi4uZmluYWxWaWV3c10gOiBmaW5hbFZpZXdzO1xuICAgIHRoaXMudmlld0NvdW50ID0gZmluYWxWaWV3cy5sZW5ndGg7XG4gICAgZmluYWxWaWV3U2V0LmNsZWFyKCk7XG4gICAgdGhpcy53aWxsUmVSZW5kZXIgPSBmYWxzZTtcbiAgICB0aGlzLnJlbmRlcmVkLnRoZW4oKCkgPT4ge1xuICAgICAgdGhpcy5wYXJlbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RSZW5kZXJlZCcsIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICBrZXk6IHRoaXMuc3ViUHJvcGVydHksXG4gICAgICAgICAgICB2YWx1ZTogdGhpcy5hcmdzLnZhbHVlLFxuICAgICAgICAgICAgdGFnOiB0aGlzLnRhZ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgICAgdGhpcy50YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RSZW5kZXJlZCcsIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICBrZXk6IHRoaXMuc3ViUHJvcGVydHksXG4gICAgICAgICAgICB2YWx1ZTogdGhpcy5hcmdzLnZhbHVlLFxuICAgICAgICAgICAgdGFnOiB0aGlzLnRhZ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlbmRlcmVkO1xuICB9XG4gIHBhdXNlKHBhdXNlID0gdHJ1ZSkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgdGhpcy52aWV3c1tpXS5wYXVzZShwYXVzZSk7XG4gICAgfVxuICB9XG4gIG9uUmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fb25SZW1vdmUuYWRkKGNhbGxiYWNrKTtcbiAgfVxuICByZW1vdmUoKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICB0aGlzLnZpZXdzW2ldICYmIHRoaXMudmlld3NbaV0ucmVtb3ZlKHRydWUpO1xuICAgIH1cbiAgICB2YXIgb25SZW1vdmUgPSB0aGlzLl9vblJlbW92ZS5pdGVtcygpO1xuICAgIGZvciAodmFyIF9pNiBpbiBvblJlbW92ZSkge1xuICAgICAgdGhpcy5fb25SZW1vdmUucmVtb3ZlKG9uUmVtb3ZlW19pNl0pO1xuICAgICAgb25SZW1vdmVbX2k2XSgpO1xuICAgIH1cbiAgICB2YXIgY2xlYW51cDtcbiAgICB3aGlsZSAodGhpcy5jbGVhbnVwLmxlbmd0aCkge1xuICAgICAgY2xlYW51cCA9IHRoaXMuY2xlYW51cC5wb3AoKTtcbiAgICAgIGNsZWFudXAoKTtcbiAgICB9XG4gICAgdGhpcy52aWV3cyA9IFtdO1xuICAgIHdoaWxlICh0aGlzLnRhZyAmJiB0aGlzLnRhZy5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnRhZy5yZW1vdmVDaGlsZCh0aGlzLnRhZy5maXJzdENoaWxkKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3ViQXJncykge1xuICAgICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcy5zdWJBcmdzKTtcbiAgICB9XG4gICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcy5hcmdzKTtcblxuICAgIC8vIGlmKHRoaXMuYXJncy52YWx1ZSAmJiAhdGhpcy5hcmdzLnZhbHVlLmlzQm91bmQoKSlcbiAgICAvLyB7XG4gICAgLy8gXHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMuYXJncy52YWx1ZSk7XG4gICAgLy8gfVxuXG4gICAgdGhpcy5yZW1vdmVkID0gdHJ1ZTtcbiAgfVxufVxuZXhwb3J0cy5WaWV3TGlzdCA9IFZpZXdMaXN0O1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5LZXlib2FyZCA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi4vYmFzZS9CaW5kYWJsZVwiKTtcbmNsYXNzIEtleWJvYXJkIHtcbiAgc3RhdGljIGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy5pbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2UgfHwgX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UobmV3IHRoaXMoKSk7XG4gIH1cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5tYXhEZWNheSA9IDEyMDtcbiAgICB0aGlzLmNvbWJvVGltZSA9IDUwMDtcbiAgICB0aGlzLmxpc3RlbmluZyA9IGZhbHNlO1xuICAgIHRoaXMuZm9jdXNFbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcbiAgICB0aGlzW19CaW5kYWJsZS5CaW5kYWJsZS5Ob0dldHRlcnNdID0gdHJ1ZTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2NvbWJvJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKFtdKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2hpY2hzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY29kZXMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdrZXlzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlc3NlZFdoaWNoJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlc3NlZENvZGUnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVzc2VkS2V5Jywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVsZWFzZWRXaGljaCcsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbGVhc2VkQ29kZScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbGVhc2VkS2V5Jywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAna2V5UmVmcycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGV2ZW50ID0+IHtcbiAgICAgIGlmICghdGhpcy5saXN0ZW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCEodGhpcy5rZXlzW2V2ZW50LmtleV0gPiAwKSAmJiB0aGlzLmZvY3VzRWxlbWVudCAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ICE9PSB0aGlzLmZvY3VzRWxlbWVudCAmJiAoIXRoaXMuZm9jdXNFbGVtZW50LmNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHx8IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQubWF0Y2hlcygnaW5wdXQsdGV4dGFyZWEnKSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMucmVsZWFzZWRXaGljaFtldmVudC53aGljaF0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5yZWxlYXNlZENvZGVbZXZlbnQuY29kZV0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5yZWxlYXNlZEtleVtldmVudC5rZXldID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMud2hpY2hzW2V2ZW50LndoaWNoXSA9IC0xO1xuICAgICAgdGhpcy5jb2Rlc1tldmVudC5jb2RlXSA9IC0xO1xuICAgICAgdGhpcy5rZXlzW2V2ZW50LmtleV0gPSAtMTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZXZlbnQgPT4ge1xuICAgICAgaWYgKCF0aGlzLmxpc3RlbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5mb2N1c0VsZW1lbnQgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAhPT0gdGhpcy5mb2N1c0VsZW1lbnQgJiYgKCF0aGlzLmZvY3VzRWxlbWVudC5jb250YWlucyhkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB8fCBkb2N1bWVudC5hY3RpdmVFbGVtZW50Lm1hdGNoZXMoJ2lucHV0LHRleHRhcmVhJykpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoZXZlbnQucmVwZWF0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuY29tYm8ucHVzaChldmVudC5jb2RlKTtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNvbWJvVGltZXIpO1xuICAgICAgdGhpcy5jb21ib1RpbWVyID0gc2V0VGltZW91dCgoKSA9PiB0aGlzLmNvbWJvLnNwbGljZSgwKSwgdGhpcy5jb21ib1RpbWUpO1xuICAgICAgdGhpcy5wcmVzc2VkV2hpY2hbZXZlbnQud2hpY2hdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucHJlc3NlZENvZGVbZXZlbnQuY29kZV0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5wcmVzc2VkS2V5W2V2ZW50LmtleV0gPSBEYXRlLm5vdygpO1xuICAgICAgaWYgKHRoaXMua2V5c1tldmVudC5rZXldID4gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLndoaWNoc1tldmVudC53aGljaF0gPSAxO1xuICAgICAgdGhpcy5jb2Rlc1tldmVudC5jb2RlXSA9IDE7XG4gICAgICB0aGlzLmtleXNbZXZlbnQua2V5XSA9IDE7XG4gICAgfSk7XG4gICAgdmFyIHdpbmRvd0JsdXIgPSBldmVudCA9PiB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMua2V5cykge1xuICAgICAgICBpZiAodGhpcy5rZXlzW2ldIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVsZWFzZWRLZXlbaV0gPSBEYXRlLm5vdygpO1xuICAgICAgICB0aGlzLmtleXNbaV0gPSAtMTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pIGluIHRoaXMuY29kZXMpIHtcbiAgICAgICAgaWYgKHRoaXMuY29kZXNbX2ldIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVsZWFzZWRDb2RlW19pXSA9IERhdGUubm93KCk7XG4gICAgICAgIHRoaXMuY29kZXNbX2ldID0gLTE7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaTIgaW4gdGhpcy53aGljaHMpIHtcbiAgICAgICAgaWYgKHRoaXMud2hpY2hzW19pMl0gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWxlYXNlZFdoaWNoW19pMl0gPSBEYXRlLm5vdygpO1xuICAgICAgICB0aGlzLndoaWNoc1tfaTJdID0gLTE7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIHdpbmRvd0JsdXIpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgKCkgPT4ge1xuICAgICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gJ3Zpc2libGUnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHdpbmRvd0JsdXIoKTtcbiAgICB9KTtcbiAgfVxuICBnZXRLZXlSZWYoa2V5Q29kZSkge1xuICAgIHZhciBrZXlSZWYgPSB0aGlzLmtleVJlZnNba2V5Q29kZV0gPSB0aGlzLmtleVJlZnNba2V5Q29kZV0gfHwgX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pO1xuICAgIHJldHVybiBrZXlSZWY7XG4gIH1cbiAgZ2V0S2V5VGltZShrZXkpIHtcbiAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkS2V5W2tleV07XG4gICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRLZXlba2V5XTtcbiAgICBpZiAoIXByZXNzZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBwcmVzc2VkO1xuICAgIH1cbiAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgfVxuICBnZXRDb2RlVGltZShjb2RlKSB7XG4gICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZENvZGVbY29kZV07XG4gICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRDb2RlW2NvZGVdO1xuICAgIGlmICghcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHByZXNzZWQ7XG4gICAgfVxuICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICB9XG4gIGdldFdoaWNoVGltZShjb2RlKSB7XG4gICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZFdoaWNoW2NvZGVdO1xuICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkV2hpY2hbY29kZV07XG4gICAgaWYgKCFwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gcHJlc3NlZDtcbiAgICB9XG4gICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gIH1cbiAgZ2V0S2V5KGtleSkge1xuICAgIGlmICghdGhpcy5rZXlzW2tleV0pIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5rZXlzW2tleV07XG4gIH1cbiAgZ2V0S2V5Q29kZShjb2RlKSB7XG4gICAgaWYgKCF0aGlzLmNvZGVzW2NvZGVdKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29kZXNbY29kZV07XG4gIH1cbiAgcmVzZXQoKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmtleXMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmtleXNbaV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5jb2Rlcykge1xuICAgICAgZGVsZXRlIHRoaXMuY29kZXNbaV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy53aGljaHMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLndoaWNoc1tpXTtcbiAgICB9XG4gIH1cbiAgdXBkYXRlKCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5rZXlzKSB7XG4gICAgICBpZiAodGhpcy5rZXlzW2ldID4gMCkge1xuICAgICAgICB0aGlzLmtleXNbaV0rKztcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5rZXlzW2ldID4gLXRoaXMubWF4RGVjYXkpIHtcbiAgICAgICAgdGhpcy5rZXlzW2ldLS07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy5rZXlzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMuY29kZXMpIHtcbiAgICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRDb2RlW2ldO1xuICAgICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRDb2RlW2ldO1xuICAgICAgdmFyIGtleVJlZiA9IHRoaXMuZ2V0S2V5UmVmKGkpO1xuICAgICAgaWYgKHRoaXMuY29kZXNbaV0gPiAwKSB7XG4gICAgICAgIGtleVJlZi5mcmFtZXMgPSB0aGlzLmNvZGVzW2ldKys7XG4gICAgICAgIGtleVJlZi50aW1lID0gcHJlc3NlZCA/IERhdGUubm93KCkgLSBwcmVzc2VkIDogMDtcbiAgICAgICAga2V5UmVmLmRvd24gPSB0cnVlO1xuICAgICAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5jb2Rlc1tpXSA+IC10aGlzLm1heERlY2F5KSB7XG4gICAgICAgIGtleVJlZi5mcmFtZXMgPSB0aGlzLmNvZGVzW2ldLS07XG4gICAgICAgIGtleVJlZi50aW1lID0gcmVsZWFzZWQgLSBEYXRlLm5vdygpO1xuICAgICAgICBrZXlSZWYuZG93biA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAga2V5UmVmLmZyYW1lcyA9IDA7XG4gICAgICAgIGtleVJlZi50aW1lID0gMDtcbiAgICAgICAga2V5UmVmLmRvd24gPSBmYWxzZTtcbiAgICAgICAgZGVsZXRlIHRoaXMuY29kZXNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy53aGljaHMpIHtcbiAgICAgIGlmICh0aGlzLndoaWNoc1tpXSA+IDApIHtcbiAgICAgICAgdGhpcy53aGljaHNbaV0rKztcbiAgICAgIH0gZWxzZSBpZiAodGhpcy53aGljaHNbaV0gPiAtdGhpcy5tYXhEZWNheSkge1xuICAgICAgICB0aGlzLndoaWNoc1tpXS0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMud2hpY2hzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuZXhwb3J0cy5LZXlib2FyZCA9IEtleWJvYXJkO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL21peGluL0V2ZW50VGFyZ2V0TWl4aW4uanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkV2ZW50VGFyZ2V0TWl4aW4gPSB2b2lkIDA7XG52YXIgX01peGluID0gcmVxdWlyZShcIi4uL2Jhc2UvTWl4aW5cIik7XG52YXIgRXZlbnRUYXJnZXRQYXJlbnQgPSBTeW1ib2woJ0V2ZW50VGFyZ2V0UGFyZW50Jyk7XG52YXIgQ2FsbEhhbmRsZXIgPSBTeW1ib2woJ0NhbGxIYW5kbGVyJyk7XG52YXIgQ2FwdHVyZSA9IFN5bWJvbCgnQ2FwdHVyZScpO1xudmFyIEJ1YmJsZSA9IFN5bWJvbCgnQnViYmxlJyk7XG52YXIgVGFyZ2V0ID0gU3ltYm9sKCdUYXJnZXQnKTtcbnZhciBIYW5kbGVyc0J1YmJsZSA9IFN5bWJvbCgnSGFuZGxlcnNCdWJibGUnKTtcbnZhciBIYW5kbGVyc0NhcHR1cmUgPSBTeW1ib2woJ0hhbmRsZXJzQ2FwdHVyZScpO1xudmFyIEV2ZW50VGFyZ2V0TWl4aW4gPSBleHBvcnRzLkV2ZW50VGFyZ2V0TWl4aW4gPSB7XG4gIFtfTWl4aW4uTWl4aW4uQ29uc3RydWN0b3JdKCkge1xuICAgIHRoaXNbSGFuZGxlcnNDYXB0dXJlXSA9IG5ldyBNYXAoKTtcbiAgICB0aGlzW0hhbmRsZXJzQnViYmxlXSA9IG5ldyBNYXAoKTtcbiAgfSxcbiAgZGlzcGF0Y2hFdmVudCguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBpZiAodHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoZXZlbnQpO1xuICAgICAgYXJnc1swXSA9IGV2ZW50O1xuICAgIH1cbiAgICBldmVudC5jdlBhdGggPSBldmVudC5jdlBhdGggfHwgW107XG4gICAgZXZlbnQuY3ZUYXJnZXQgPSBldmVudC5jdkN1cnJlbnRUYXJnZXQgPSB0aGlzO1xuICAgIHZhciByZXN1bHQgPSB0aGlzW0NhcHR1cmVdKC4uLmFyZ3MpO1xuICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgIGlmICh0aGlzW0hhbmRsZXJzQ2FwdHVyZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICB2YXIgaGFuZGxlck1hcCA9IHRoaXNbSGFuZGxlcnNDYXB0dXJlXS5nZXQoZXZlbnQudHlwZSk7XG4gICAgICB2YXIgbmV3SGFuZGxlcnMgPSBbLi4uaGFuZGxlck1hcF07XG4gICAgICBuZXdIYW5kbGVycy5mb3JFYWNoKGggPT4gaC5wdXNoKGhhbmRsZXJNYXApKTtcbiAgICAgIGhhbmRsZXJzLnB1c2goLi4ubmV3SGFuZGxlcnMpO1xuICAgIH1cbiAgICBpZiAodGhpc1tIYW5kbGVyc0J1YmJsZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICB2YXIgX2hhbmRsZXJNYXAgPSB0aGlzW0hhbmRsZXJzQnViYmxlXS5nZXQoZXZlbnQudHlwZSk7XG4gICAgICB2YXIgX25ld0hhbmRsZXJzID0gWy4uLl9oYW5kbGVyTWFwXTtcbiAgICAgIF9uZXdIYW5kbGVycy5mb3JFYWNoKGggPT4gaC5wdXNoKF9oYW5kbGVyTWFwKSk7XG4gICAgICBoYW5kbGVycy5wdXNoKC4uLl9uZXdIYW5kbGVycyk7XG4gICAgfVxuICAgIGhhbmRsZXJzLnB1c2goWygpID0+IHRoaXNbQ2FsbEhhbmRsZXJdKC4uLmFyZ3MpLCB7fSwgbnVsbF0pO1xuICAgIGZvciAodmFyIFtoYW5kbGVyLCBvcHRpb25zLCBtYXBdIG9mIGhhbmRsZXJzKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgIG1hcC5kZWxldGUoaGFuZGxlcik7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghZXZlbnQuY2FuY2VsYWJsZSB8fCAhZXZlbnQuY2FuY2VsQnViYmxlICYmIHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgIHRoaXNbQnViYmxlXSguLi5hcmdzKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XSkge1xuICAgICAgT2JqZWN0LmZyZWV6ZShldmVudC5jdlBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gZXZlbnQucmV0dXJuVmFsdWU7XG4gIH0sXG4gIGFkZEV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICB1c2VDYXB0dXJlOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgaGFuZGxlcnMgPSBIYW5kbGVyc0J1YmJsZTtcbiAgICBpZiAob3B0aW9ucy51c2VDYXB0dXJlKSB7XG4gICAgICBoYW5kbGVycyA9IEhhbmRsZXJzQ2FwdHVyZTtcbiAgICB9XG4gICAgaWYgKCF0aGlzW2hhbmRsZXJzXS5oYXModHlwZSkpIHtcbiAgICAgIHRoaXNbaGFuZGxlcnNdLnNldCh0eXBlLCBuZXcgTWFwKCkpO1xuICAgIH1cbiAgICB0aGlzW2hhbmRsZXJzXS5nZXQodHlwZSkuc2V0KGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucy5zaWduYWwpIHtcbiAgICAgIG9wdGlvbnMuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0JywgZXZlbnQgPT4gdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zKSwge1xuICAgICAgICBvbmNlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gIHJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICB1c2VDYXB0dXJlOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgaGFuZGxlcnMgPSBIYW5kbGVyc0J1YmJsZTtcbiAgICBpZiAob3B0aW9ucy51c2VDYXB0dXJlKSB7XG4gICAgICBoYW5kbGVycyA9IEhhbmRsZXJzQ2FwdHVyZTtcbiAgICB9XG4gICAgaWYgKCF0aGlzW2hhbmRsZXJzXS5oYXModHlwZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpc1toYW5kbGVyc10uZ2V0KHR5cGUpLmRlbGV0ZShjYWxsYmFjayk7XG4gIH0sXG4gIFtDYXB0dXJlXSguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBldmVudC5jdlBhdGgucHVzaCh0aGlzKTtcbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtDYXB0dXJlXSguLi5hcmdzKTtcbiAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNDYXB0dXJlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZXZlbnQuY3ZDdXJyZW50VGFyZ2V0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF07XG4gICAgdmFyIHtcbiAgICAgIHR5cGVcbiAgICB9ID0gZXZlbnQ7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNDYXB0dXJlXS5nZXQodHlwZSk7XG4gICAgZm9yICh2YXIgW2hhbmRsZXIsIG9wdGlvbnNdIG9mIGhhbmRsZXJzKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgIGhhbmRsZXJzLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgW0J1YmJsZV0oLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgaWYgKCFldmVudC5idWJibGVzIHx8ICF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XSB8fCBldmVudC5jYW5jZWxCdWJibGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0J1YmJsZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICByZXR1cm4gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQnViYmxlXSguLi5hcmdzKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdDtcbiAgICBldmVudC5jdkN1cnJlbnRUYXJnZXQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XTtcbiAgICB2YXIge1xuICAgICAgdHlwZVxuICAgIH0gPSBldmVudDtcbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0J1YmJsZV0uZ2V0KGV2ZW50LnR5cGUpO1xuICAgIGZvciAodmFyIFtoYW5kbGVyLCBvcHRpb25zXSBvZiBoYW5kbGVycykge1xuICAgICAgaWYgKG9wdGlvbnMub25jZSkge1xuICAgICAgICBoYW5kbGVycy5kZWxldGUoaGFuZGxlcik7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmVzdWx0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQ2FsbEhhbmRsZXJdKC4uLmFyZ3MpO1xuICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtCdWJibGVdKC4uLmFyZ3MpO1xuICB9LFxuICBbQ2FsbEhhbmRsZXJdKC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkZWZhdWx0SGFuZGxlciA9IGBvbiR7ZXZlbnQudHlwZVswXS50b1VwcGVyQ2FzZSgpICsgZXZlbnQudHlwZS5zbGljZSgxKX1gO1xuICAgIGlmICh0eXBlb2YgdGhpc1tkZWZhdWx0SGFuZGxlcl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzW2RlZmF1bHRIYW5kbGVyXShldmVudCk7XG4gICAgfVxuICB9XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEV2ZW50VGFyZ2V0TWl4aW4sICdQYXJlbnQnLCB7XG4gIHZhbHVlOiBFdmVudFRhcmdldFBhcmVudFxufSk7XG4gIH0pKCk7XG59KTsiLCJleHBvcnQgY2xhc3MgQ29uZmlnIHt9O1xuXG5Db25maWcudGl0bGUgPSAnd2dsMmQnO1xuLy8gQ29uZmlnLiIsImV4cG9ydCBjbGFzcyBHbDJkXG57XG5cdGNvbnN0cnVjdG9yKGVsZW1lbnQpXG5cdHtcblx0XHR0aGlzLmVsZW1lbnQgICA9IGVsZW1lbnQgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5jb250ZXh0ICAgPSB0aGlzLmVsZW1lbnQuZ2V0Q29udGV4dCgnd2ViZ2wnKTtcblx0XHR0aGlzLnNjcmVlblNjYWxlID0gMTtcblx0XHR0aGlzLnpvb21MZXZlbCA9IDI7XG5cdH1cblxuXHRjbGVhbnVwKClcblx0e1xuXHRcdHRoaXMuY29udGV4dC5kZWxldGVQcm9ncmFtKHRoaXMucHJvZ3JhbSk7XG5cdH1cblxuXHRjcmVhdGVTaGFkZXIobG9jYXRpb24pXG5cdHtcblx0XHRjb25zdCBleHRlbnNpb24gPSBsb2NhdGlvbi5zdWJzdHJpbmcobG9jYXRpb24ubGFzdEluZGV4T2YoJy4nKSsxKTtcblx0XHRsZXQgICB0eXBlID0gbnVsbDtcblxuXHRcdHN3aXRjaChleHRlbnNpb24udG9VcHBlckNhc2UoKSlcblx0XHR7XG5cdFx0XHRjYXNlICdWRVJUJzpcblx0XHRcdFx0dHlwZSA9IHRoaXMuY29udGV4dC5WRVJURVhfU0hBREVSO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0ZSQUcnOlxuXHRcdFx0XHR0eXBlID0gdGhpcy5jb250ZXh0LkZSQUdNRU5UX1NIQURFUjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2hhZGVyID0gdGhpcy5jb250ZXh0LmNyZWF0ZVNoYWRlcih0eXBlKTtcblx0XHRjb25zdCBzb3VyY2UgPSByZXF1aXJlKGxvY2F0aW9uKTtcblxuXHRcdHRoaXMuY29udGV4dC5zaGFkZXJTb3VyY2Uoc2hhZGVyLCBzb3VyY2UpO1xuXHRcdHRoaXMuY29udGV4dC5jb21waWxlU2hhZGVyKHNoYWRlcik7XG5cblx0XHRjb25zdCBzdWNjZXNzID0gdGhpcy5jb250ZXh0LmdldFNoYWRlclBhcmFtZXRlcihcblx0XHRcdHNoYWRlclxuXHRcdFx0LCB0aGlzLmNvbnRleHQuQ09NUElMRV9TVEFUVVNcblx0XHQpO1xuXG5cdFx0aWYoc3VjY2Vzcylcblx0XHR7XG5cdFx0XHRyZXR1cm4gc2hhZGVyO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5jb250ZXh0LmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSk7XG5cblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlU2hhZGVyKHNoYWRlcik7XG5cdH1cblxuXHRjcmVhdGVQcm9ncmFtKHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXIpXG5cdHtcblx0XHRjb25zdCBwcm9ncmFtID0gdGhpcy5jb250ZXh0LmNyZWF0ZVByb2dyYW0oKTtcblxuXHRcdHRoaXMuY29udGV4dC5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgdmVydGV4U2hhZGVyKTtcblx0XHR0aGlzLmNvbnRleHQuYXR0YWNoU2hhZGVyKHByb2dyYW0sIGZyYWdtZW50U2hhZGVyKTtcblxuXHRcdHRoaXMuY29udGV4dC5saW5rUHJvZ3JhbShwcm9ncmFtKTtcblxuXHRcdHRoaXMuY29udGV4dC5kZXRhY2hTaGFkZXIocHJvZ3JhbSwgdmVydGV4U2hhZGVyKTtcblx0XHR0aGlzLmNvbnRleHQuZGV0YWNoU2hhZGVyKHByb2dyYW0sIGZyYWdtZW50U2hhZGVyKTtcblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlU2hhZGVyKHZlcnRleFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVNoYWRlcihmcmFnbWVudFNoYWRlcik7XG5cblx0XHRpZih0aGlzLmNvbnRleHQuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCB0aGlzLmNvbnRleHQuTElOS19TVEFUVVMpKVxuXHRcdHtcblx0XHRcdHJldHVybiBwcm9ncmFtO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5jb250ZXh0LmdldFByb2dyYW1JbmZvTG9nKHByb2dyYW0pKTtcblxuXHRcdHRoaXMuY29udGV4dC5kZWxldGVQcm9ncmFtKHByb2dyYW0pO1xuXG5cdFx0cmV0dXJuIHByb2dyYW07XG5cdH1cbn1cbiIsImltcG9ydCB7IFZpZXcgYXMgQmFzZVZpZXcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9WaWV3JztcbmltcG9ydCB7IEtleWJvYXJkIH0gZnJvbSAnY3VydmF0dXJlL2lucHV0L0tleWJvYXJkJ1xuaW1wb3J0IHsgQmFnIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmFnJztcblxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSAnQ29uZmlnJztcblxuaW1wb3J0IHsgTWFwIGFzIFdvcmxkTWFwIH0gZnJvbSAnLi4vd29ybGQvTWFwJztcblxuaW1wb3J0IHsgU3ByaXRlU2hlZXQgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlU2hlZXQnO1xuaW1wb3J0IHsgU3ByaXRlQm9hcmQgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlQm9hcmQnO1xuXG5pbXBvcnQgeyBDb250cm9sbGVyIGFzIE9uU2NyZWVuSm95UGFkIH0gZnJvbSAnLi4vdWkvQ29udHJvbGxlcic7XG5pbXBvcnQgeyBNYXBFZGl0b3IgICB9IGZyb20gJy4uL3VpL01hcEVkaXRvcic7XG5cbmltcG9ydCB7IEVudGl0eSB9IGZyb20gJy4uL21vZGVsL0VudGl0eSc7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tICcuLi9zcHJpdGUvQ2FtZXJhJztcblxuaW1wb3J0IHsgQ29udHJvbGxlciB9IGZyb20gJy4uL21vZGVsL0NvbnRyb2xsZXInO1xuaW1wb3J0IHsgU3ByaXRlIH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZSc7XG5cbmNvbnN0IEFwcGxpY2F0aW9uID0ge307XG5cbkFwcGxpY2F0aW9uLm9uU2NyZWVuSm95UGFkID0gbmV3IE9uU2NyZWVuSm95UGFkO1xuQXBwbGljYXRpb24ua2V5Ym9hcmQgPSBLZXlib2FyZC5nZXQoKTtcblxuXG5leHBvcnQgY2xhc3MgVmlldyBleHRlbmRzIEJhc2VWaWV3XG57XG5cdGNvbnN0cnVjdG9yKGFyZ3MpXG5cdHtcblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgPSB0cnVlO1xuXHRcdHN1cGVyKGFyZ3MpO1xuXHRcdHRoaXMudGVtcGxhdGUgID0gcmVxdWlyZSgnLi92aWV3LnRtcCcpO1xuXHRcdHRoaXMucm91dGVzICAgID0gW107XG5cblx0XHR0aGlzLmVudGl0aWVzICA9IG5ldyBCYWc7XG5cdFx0dGhpcy5rZXlib2FyZCAgPSBBcHBsaWNhdGlvbi5rZXlib2FyZDtcblx0XHR0aGlzLnNwZWVkICAgICA9IDI0O1xuXHRcdHRoaXMubWF4U3BlZWQgID0gdGhpcy5zcGVlZDtcblxuXHRcdHRoaXMuYXJncy5jb250cm9sbGVyID0gQXBwbGljYXRpb24ub25TY3JlZW5Kb3lQYWQ7XG5cblx0XHR0aGlzLmFyZ3MuZnBzICA9IDA7XG5cdFx0dGhpcy5hcmdzLnNwcyAgPSAwO1xuXG5cdFx0dGhpcy5hcmdzLmNhbVggPSAwO1xuXHRcdHRoaXMuYXJncy5jYW1ZID0gMDtcblxuXHRcdHRoaXMuYXJncy5mcmFtZUxvY2sgICAgICA9IDYwO1xuXHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA9IDYwO1xuXG5cdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblxuXHRcdHRoaXMua2V5Ym9hcmQubGlzdGVuaW5nID0gdHJ1ZTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ2UnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLm1hcC5leHBvcnQoKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0VzY2FwZScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA9PT0gLTEpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuc3ByaXRlQm9hcmQudW5zZWxlY3QoKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0hvbWUnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrKys7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdFbmQnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrLS07XG5cblx0XHRcdFx0aWYodGhpcy5hcmdzLmZyYW1lTG9jayA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnUGFnZVVwJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrKys7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdQYWdlRG93bicsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jay0tO1xuXG5cdFx0XHRcdGlmKHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0ID0gbmV3IFNwcml0ZVNoZWV0O1xuXHRcdHRoaXMubWFwICAgICAgICAgPSBuZXcgV29ybGRNYXA7XG5cblx0XHR0aGlzLm1hcC5pbXBvcnQoKTtcblxuXHRcdHRoaXMuYXJncy5tYXBFZGl0b3IgID0gbmV3IE1hcEVkaXRvcih7XG5cdFx0XHRzcHJpdGVTaGVldDogdGhpcy5zcHJpdGVTaGVldFxuXHRcdFx0LCBtYXA6ICAgICAgIHRoaXMubWFwXG5cdFx0fSk7XG5cdH1cblxuXHRvblJlbmRlcmVkKClcblx0e1xuXHRcdGNvbnN0IHNwcml0ZUJvYXJkID0gbmV3IFNwcml0ZUJvYXJkKFxuXHRcdFx0dGhpcy50YWdzLmNhbnZhcy5lbGVtZW50XG5cdFx0XHQsIHRoaXMubWFwXG5cdFx0KTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQgPSBzcHJpdGVCb2FyZDtcblxuXHRcdGNvbnN0IGVudGl0eSA9IG5ldyBFbnRpdHkoe1xuXHRcdFx0c3ByaXRlOiBuZXcgU3ByaXRlKHtcblx0XHRcdFx0c3JjOiB1bmRlZmluZWQsXG5cdFx0XHRcdHNwcml0ZUJvYXJkOiBzcHJpdGVCb2FyZCxcblx0XHRcdFx0c3ByaXRlU2hlZXQ6IHRoaXMuc3ByaXRlU2hlZXQsXG5cdFx0XHRcdHdpZHRoOiAzMixcblx0XHRcdFx0aGVpZ2h0OiA0OCxcblx0XHRcdH0pLFxuXHRcdFx0Y29udHJvbGxlcjogbmV3IENvbnRyb2xsZXIoe1xuXHRcdFx0XHRrZXlib2FyZDogdGhpcy5rZXlib2FyZCxcblx0XHRcdFx0b25TY3JlZW5Kb3lQYWQ6IHRoaXMuYXJncy5jb250cm9sbGVyLFxuXHRcdFx0fSksXG5cdFx0XHRjYW1lcmE6IENhbWVyYSxcblx0XHR9KTtcblxuXHRcdHRoaXMuZW50aXRpZXMuYWRkKGVudGl0eSk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5zcHJpdGVzLmFkZChlbnRpdHkuc3ByaXRlKTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nID0gZW50aXR5O1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnPScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuem9vbSgxKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJysnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnpvb20oMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCctJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy56b29tKC0xKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuYXJncy5tYXBFZGl0b3IuYXJncy5iaW5kVG8oJ3NlbGVjdGVkR3JhcGhpYycsICh2KT0+e1xuXHRcdFx0aWYoIXYgfHwgdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxYID09IG51bGwpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblxuXHRcdFx0bGV0IGkgID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5zdGFydEdsb2JhbFg7XG5cdFx0XHRsZXQgaWkgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFg7XG5cblx0XHRcdGlmKGlpIDwgaSlcblx0XHRcdHtcblx0XHRcdFx0W2lpLCBpXSA9IFtpLCBpaV07XG5cdFx0XHR9XG5cblx0XHRcdGZvcig7IGk8PSBpaTsgaSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRsZXQgaiAgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLnN0YXJ0R2xvYmFsWTtcblx0XHRcdFx0bGV0IGpqID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxZO1xuXHRcdFx0XHRpZihqaiA8IGopXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRbamosIGpdID0gW2osIGpqXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IoOyBqIDw9IGpqOyBqKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLm1hcC5zZXRUaWxlKGksIGosIHYpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMubWFwLnNldFRpbGUoXG5cdFx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWFxuXHRcdFx0XHQsIHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWVxuXHRcdFx0XHQsIHZcblx0XHRcdCk7XG5cblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzaXplKCk7XG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnVuc2VsZWN0KCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmJpbmRUbygodixrLHQsZCxwKT0+e1xuXHRcdFx0aWYodGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFggPT0gbnVsbClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy5tYXBFZGl0b3Iuc2VsZWN0KHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQpO1xuXG5cdFx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IHRydWU7XG5cblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzaXplKCk7XG5cdFx0fSx7d2FpdDowfSk7XG5cblx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IHRydWU7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCkgPT4gdGhpcy5yZXNpemUoKSk7XG5cblx0XHRsZXQgZlRoZW4gPSAwO1xuXHRcdGxldCBzVGhlbiA9IDA7XG5cblx0XHRsZXQgZlNhbXBsZXMgPSBbXTtcblx0XHRsZXQgc1NhbXBsZXMgPSBbXTtcblxuXHRcdGxldCBtYXhTYW1wbGVzID0gNTtcblxuXHRcdGNvbnN0IHNpbXVsYXRlID0gKG5vdykgPT4ge1xuXHRcdFx0bm93ID0gbm93IC8gMTAwMDtcblxuXHRcdFx0Y29uc3QgZGVsdGEgPSBub3cgLSBzVGhlbjtcblxuXHRcdFx0aWYodGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID09IDApXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzID0gWzBdO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmKGRlbHRhIDwgMS8odGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrKygxMCAqICh0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2svNjApKSkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c1RoZW4gPSBub3c7XG5cblx0XHRcdHRoaXMua2V5Ym9hcmQudXBkYXRlKCk7XG5cblx0XHRcdE9iamVjdC52YWx1ZXModGhpcy5lbnRpdGllcy5pdGVtcygpKS5tYXAoKGUpPT57XG5cdFx0XHRcdGUuc2ltdWxhdGUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyB0aGlzLnNwcml0ZUJvYXJkLnNpbXVsYXRlKCk7XG5cblx0XHRcdC8vIHRoaXMuYXJncy5sb2NhbFggID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MubG9jYWxZICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQubG9jYWxZO1xuXHRcdFx0Ly8gdGhpcy5hcmdzLmdsb2JhbFggPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MuZ2xvYmFsWSA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWTtcblxuXHRcdFx0dGhpcy5hcmdzLl9zcHMgPSAoMSAvIGRlbHRhKTtcblxuXHRcdFx0c1NhbXBsZXMucHVzaCh0aGlzLmFyZ3MuX3Nwcyk7XG5cblx0XHRcdHdoaWxlKHNTYW1wbGVzLmxlbmd0aCA+IG1heFNhbXBsZXMpXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzLnNoaWZ0KCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHRoaXMuc3ByaXRlQm9hcmQubW92ZUNhbWVyYShzcHJpdGUueCwgc3ByaXRlLnkpO1xuXHRcdH07XG5cblx0XHRjb25zdCB1cGRhdGUgPSAobm93KSA9Pntcblx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhdygpO1xuXG5cdFx0XHRjb25zdCBkZWx0YSA9IG5vdyAtIGZUaGVuO1xuXHRcdFx0ZlRoZW4gPSBub3c7XG5cblx0XHRcdHRoaXMuYXJncy5mcHMgPSAoMTAwMCAvIGRlbHRhKS50b0ZpeGVkKDMpO1xuXG5cdFx0XHR0aGlzLmFyZ3MuY2FtWCA9IE51bWJlcihDYW1lcmEueCkudG9GaXhlZCgzKTtcblx0XHRcdHRoaXMuYXJncy5jYW1ZID0gTnVtYmVyKENhbWVyYS55KS50b0ZpeGVkKDMpO1xuXHRcdH07XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQgLyAxMDI0ICogNDtcblx0XHR0aGlzLnJlc2l6ZSgpO1xuXG5cdFx0dXBkYXRlKHBlcmZvcm1hbmNlLm5vdygpKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRzaW11bGF0ZShwZXJmb3JtYW5jZS5ub3coKSk7XG5cdFx0fSwgMCk7XG5cblx0XHRzZXRJbnRlcnZhbCgoKT0+e1xuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSBgJHtDb25maWcudGl0bGV9ICR7dGhpcy5hcmdzLmZwc30gRlBTYDtcblx0XHR9LCAyMjcvMyk7XG5cblx0XHRzZXRJbnRlcnZhbCgoKT0+e1xuXHRcdFx0Y29uc3Qgc3BzID0gc1NhbXBsZXMucmVkdWNlKChhLGIpPT5hK2IsIDApIC8gc1NhbXBsZXMubGVuZ3RoO1xuXHRcdFx0dGhpcy5hcmdzLnNwcyA9IHNwcy50b0ZpeGVkKDMpLnBhZFN0YXJ0KDUsICcgJyk7XG5cdFx0fSwgMjMxLzIpO1xuXHR9XG5cblx0cmVzaXplKHgsIHkpXG5cdHtcblx0XHR0aGlzLmFyZ3Mud2lkdGggID0gdGhpcy50YWdzLmNhbnZhcy5lbGVtZW50LndpZHRoICAgPSB4IHx8IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XG5cdFx0dGhpcy5hcmdzLmhlaWdodCA9IHRoaXMudGFncy5jYW52YXMuZWxlbWVudC5oZWlnaHQgID0geSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodDtcblxuXHRcdHRoaXMuYXJncy5yd2lkdGggID0gTWF0aC50cnVuYyhcblx0XHRcdCh4IHx8IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpICAvIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWxcblx0XHQpO1xuXG5cdFx0dGhpcy5hcmdzLnJoZWlnaHQgPSBNYXRoLnRydW5jKFxuXHRcdFx0KHkgfHwgZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQpIC8gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHRjb25zdCBvbGRTY2FsZSA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuc2NyZWVuU2NhbGUgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAvIDEwMjQ7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICo9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSAvIG9sZFNjYWxlO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5yZXNpemUoKTtcblx0fVxuXG5cdHNjcm9sbChldmVudClcblx0e1xuXHRcdGxldCBkZWx0YSA9IGV2ZW50LmRlbHRhWSA+IDAgPyAtMSA6IChcblx0XHRcdGV2ZW50LmRlbHRhWSA8IDAgPyAxIDogMFxuXHRcdCk7XG5cblx0XHR0aGlzLnpvb20oZGVsdGEpO1xuXHR9XG5cblx0em9vbShkZWx0YSlcblx0e1xuXHRcdGNvbnN0IG1heCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSAqIDMyO1xuXHRcdGNvbnN0IG1pbiA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSAqIDAuNjY2Nztcblx0XHRjb25zdCBzdGVwID0gMC4wNSAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRsZXQgem9vbUxldmVsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCArIChkZWx0YSAqIHN0ZXApO1xuXG5cdFx0aWYoem9vbUxldmVsIDwgbWluKVxuXHRcdHtcblx0XHRcdHpvb21MZXZlbCA9IG1pbjtcblx0XHR9XG5cdFx0ZWxzZSBpZih6b29tTGV2ZWwgPiBtYXgpXG5cdFx0e1xuXHRcdFx0em9vbUxldmVsID0gbWF4O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgIT09IHpvb21MZXZlbClcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsID0gem9vbUxldmVsO1xuXHRcdFx0dGhpcy5yZXNpemUoKTtcblx0XHR9XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8Y2FudmFzXFxuXFx0Y3YtcmVmID0gXFxcImNhbnZhczpjdXJ2YXR1cmUvYmFzZS9UYWdcXFwiXFxuXFx0Y3Ytb24gID0gXFxcIndoZWVsOnNjcm9sbChldmVudCk7XFxcIlxcbj48L2NhbnZhcz5cXG48ZGl2IGNsYXNzID0gXFxcImh1ZCBmcHNcXFwiPlxcbiBbW3Nwc11dIHNpbXVsYXRpb25zL3MgLyBbW3NpbXVsYXRpb25Mb2NrXV0gXFxuIFtbZnBzXV0gZnJhbWVzL3MgICAgICAvIFtbZnJhbWVMb2NrXV0gXFxuXFxuIFJlcyBbW3J3aWR0aF1dIHggW1tyaGVpZ2h0XV1cXG4gICAgIFtbd2lkdGhdXSB4IFtbaGVpZ2h0XV1cXG4gXFxuIFBvcyBbW2NhbVhdXSB4IFtbY2FtWV1dXFxuXFxuIM60IFNpbTogICBQZyBVcCAvIERuXFxuIM60IEZyYW1lOiBIb21lIC8gRW5kIFxcbiDOtCBTY2FsZTogKyAvIC0gXFxuXFxuPC9kaXY+XFxuPGRpdiBjbGFzcyA9IFxcXCJyZXRpY2xlXFxcIj48L2Rpdj5cXG5cXG5bW2NvbnRyb2xsZXJdXVxcblxcbjxkaXYgY3YtaWYgPSBcXFwic2hvd0VkaXRvclxcXCI+XFxuXFx0W1ttYXBFZGl0b3JdXVxcblxcdC0tXFxuXFx0W1ttbW1dXVxcbjwvc3Bhbj5cXG5cIiIsImltcG9ydCB7IFJvdXRlciB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1JvdXRlcic7XG5pbXBvcnQgeyBWaWV3ICAgfSBmcm9tICdob21lL1ZpZXcnO1xuXG5pZihQcm94eSAhPT0gdW5kZWZpbmVkKVxue1xuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuXHRcdGNvbnN0IHZpZXcgPSBuZXcgVmlldygpO1xuXHRcdFxuXHRcdFJvdXRlci5saXN0ZW4odmlldyk7XG5cdFx0XG5cdFx0dmlldy5yZW5kZXIoZG9jdW1lbnQuYm9keSk7XG5cdH0pO1xufVxuZWxzZVxue1xuXHQvLyBkb2N1bWVudC53cml0ZShyZXF1aXJlKCcuL0ZhbGxiYWNrL2ZhbGxiYWNrLnRtcCcpKTtcbn1cbiIsImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICcuL0luamVjdGFibGUnO1xuXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgSW5qZWN0YWJsZVxue1xuXHRpbmplY3QoaW5qZWN0aW9ucylcblx0e1xuXHRcdHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3RvcihPYmplY3QuYXNzaWduKHt9LCB0aGlzLCBpbmplY3Rpb25zKSk7XG5cdH1cbn1cbiIsImxldCBjbGFzc2VzID0ge307XG5sZXQgb2JqZWN0cyA9IHt9O1xuXG5leHBvcnQgY2xhc3MgSW5qZWN0YWJsZVxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRsZXQgaW5qZWN0aW9ucyA9IHRoaXMuY29uc3RydWN0b3IuaW5qZWN0aW9ucygpO1xuXHRcdGxldCBjb250ZXh0ICAgID0gdGhpcy5jb25zdHJ1Y3Rvci5jb250ZXh0KCk7XG5cblx0XHRpZighY2xhc3Nlc1tjb250ZXh0XSlcblx0XHR7XG5cdFx0XHRjbGFzc2VzW2NvbnRleHRdID0ge307XG5cdFx0fVxuXG5cdFx0aWYoIW9iamVjdHNbY29udGV4dF0pXG5cdFx0e1xuXHRcdFx0b2JqZWN0c1tjb250ZXh0XSA9IHt9O1xuXHRcdH1cblxuXHRcdGZvcihsZXQgbmFtZSBpbiBpbmplY3Rpb25zKVxuXHRcdHtcblx0XHRcdGxldCBpbmplY3Rpb24gPSBpbmplY3Rpb25zW25hbWVdO1xuXG5cdFx0XHRpZihjbGFzc2VzW2NvbnRleHRdW25hbWVdIHx8ICFpbmplY3Rpb24ucHJvdG90eXBlKVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0aWYoL1tBLVpdLy50ZXN0KFN0cmluZyhuYW1lKVswXSkpXG5cdFx0XHR7XG5cdFx0XHRcdGNsYXNzZXNbY29udGV4dF1bbmFtZV0gPSBpbmplY3Rpb247XG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRmb3IobGV0IG5hbWUgaW4gaW5qZWN0aW9ucylcblx0XHR7XG5cdFx0XHRsZXQgaW5zdGFuY2UgID0gdW5kZWZpbmVkO1xuXHRcdFx0bGV0IGluamVjdGlvbiA9IGNsYXNzZXNbY29udGV4dF1bbmFtZV0gfHwgaW5qZWN0aW9uc1tuYW1lXTtcblxuXHRcdFx0aWYoL1tBLVpdLy50ZXN0KFN0cmluZyhuYW1lKVswXSkpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKGluamVjdGlvbi5wcm90b3R5cGUpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZighb2JqZWN0c1tjb250ZXh0XVtuYW1lXSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRvYmplY3RzW2NvbnRleHRdW25hbWVdID0gbmV3IGluamVjdGlvbjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0b2JqZWN0c1tjb250ZXh0XVtuYW1lXSA9IGluamVjdGlvbjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGluc3RhbmNlID0gb2JqZWN0c1tjb250ZXh0XVtuYW1lXTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0aWYoaW5qZWN0aW9uLnByb3RvdHlwZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGluc3RhbmNlID0gbmV3IGluamVjdGlvbjtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpbnN0YW5jZSA9IGluamVjdGlvbjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuXHRcdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdFx0d3JpdGFibGU6ICAgZmFsc2UsXG5cdFx0XHRcdHZhbHVlOiAgICAgIGluc3RhbmNlXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG5cdHN0YXRpYyBpbmplY3Rpb25zKClcblx0e1xuXHRcdHJldHVybiB7fTtcblx0fVxuXG5cdHN0YXRpYyBjb250ZXh0KClcblx0e1xuXHRcdHJldHVybiAnLic7XG5cdH1cblxuXHRzdGF0aWMgaW5qZWN0KGluamVjdGlvbnMsIGNvbnRleHQgPSAnLicpXG5cdHtcblx0XHRpZighKHRoaXMucHJvdG90eXBlIGluc3RhbmNlb2YgSW5qZWN0YWJsZSB8fCB0aGlzID09PSBJbmplY3RhYmxlKSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBhY2Nlc3MgaW5qZWN0YWJsZSBzdWJjbGFzcyFcblxuQXJlIHlvdSB0cnlpbmcgdG8gaW5zdGFudGlhdGUgbGlrZSB0aGlzP1xuXG5cdG5ldyBYLmluamVjdCh7Li4ufSk7XG5cbklmIHNvIHBsZWFzZSB0cnk6XG5cblx0bmV3IChYLmluamVjdCh7Li4ufSkpO1xuXG5QbGVhc2Ugbm90ZSB0aGUgcGFyZW50aGVzaXMuXG5gKTtcblx0XHR9XG5cblx0XHRsZXQgZXhpc3RpbmdJbmplY3Rpb25zID0gdGhpcy5pbmplY3Rpb25zKCk7XG5cblx0XHRyZXR1cm4gY2xhc3MgZXh0ZW5kcyB0aGlzIHtcblx0XHRcdHN0YXRpYyBpbmplY3Rpb25zKClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGV4aXN0aW5nSW5qZWN0aW9ucywgaW5qZWN0aW9ucyk7XG5cdFx0XHR9XG5cdFx0XHRzdGF0aWMgY29udGV4dCgpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBjb250ZXh0O1xuXHRcdFx0fVxuXHRcdH07XG5cdH1cbn1cbiIsImNsYXNzIFNpbmdsZVxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLm5hbWUgPSAnc3NzLicgKyBNYXRoLnJhbmRvbSgpO1xuXHR9XG59XG5cbmxldCBzaW5nbGUgPSBuZXcgU2luZ2xlO1xuXG5leHBvcnQge1NpbmdsZSwgc2luZ2xlfTsiLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcblxuZXhwb3J0ICBjbGFzcyBDb250cm9sbGVyXG57XG5cdHRyaWdnZXJzID0gQmluZGFibGUubWFrZUJpbmRhYmxlKHt9KTtcblx0YXhpcyAgICAgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUoe30pO1xuXHRcblx0Y29uc3RydWN0b3Ioe2tleWJvYXJkLCBvblNjcmVlbkpveVBhZH0pXG5cdHtcblx0XHRrZXlib2FyZC5rZXlzLmJpbmRUbygodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmtleVByZXNzKGssdix0W2tdKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih2ID09PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5rZXlSZWxlYXNlKGssdix0W2tdKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cblx0XHRvblNjcmVlbkpveVBhZC5hcmdzLmJpbmRUbygneCcsICh2KSA9PiB7XG5cdFx0XHR0aGlzLmF4aXNbMF0gPSB2IC8gNTA7XG5cdFx0fSk7XG5cblx0XHRvblNjcmVlbkpveVBhZC5hcmdzLmJpbmRUbygneScsICh2KSA9PiB7XG5cdFx0XHR0aGlzLmF4aXNbMV0gPSB2IC8gNTA7XG5cdFx0fSk7XG5cdH1cblxuXHRrZXlQcmVzcyhrZXksIHZhbHVlLCBwcmV2KVxuXHR7XG5cdFx0aWYoL15bMC05XSQvLnRlc3Qoa2V5KSlcblx0XHR7XG5cdFx0XHR0aGlzLnRyaWdnZXJzW2tleV0gPSB0cnVlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHN3aXRjaChrZXkpXG5cdFx0e1xuXHRcdFx0Y2FzZSAnQXJyb3dSaWdodCc6XG5cdFx0XHRcdHRoaXMuYXhpc1swXSA9IDE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0Rvd24nOlxuXHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAxO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dMZWZ0Jzpcblx0XHRcdFx0dGhpcy5heGlzWzBdID0gLTE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd1VwJzpcblx0XHRcdFx0dGhpcy5heGlzWzFdID0gLTE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdGtleVJlbGVhc2Uoa2V5LCB2YWx1ZSwgcHJldilcblx0e1xuXHRcdGlmKC9eWzAtOV0kLy50ZXN0KGtleSkpXG5cdFx0e1xuXHRcdFx0dGhpcy50cmlnZ2Vyc1trZXldID0gZmFsc2U7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c3dpdGNoKGtleSlcblx0XHR7XG5cdFx0XHRjYXNlICdBcnJvd1JpZ2h0Jzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzBdID4gMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1swXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dMZWZ0Jzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzBdIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1swXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93RG93bic6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1sxXSA+IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93VXAnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMV0gPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzFdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH1cbn1cbiIsImNvbnN0IGZpcmVSZWdpb24gPSBbMSwgMCwgMF07XG5jb25zdCB3YXRlclJlZ2lvbiA9IFswLCAxLCAxXTtcblxuZXhwb3J0IGNsYXNzIEVudGl0eVxue1xuXHRjb25zdHJ1Y3Rvcih7c3ByaXRlLCBjb250cm9sbGVyfSlcblx0e1xuXHRcdHRoaXMuZGlyZWN0aW9uID0gJ3NvdXRoJztcblx0XHR0aGlzLnN0YXRlID0gJ3N0YW5kaW5nJztcblxuXHRcdHRoaXMuc3ByaXRlID0gc3ByaXRlO1xuXHRcdHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG5cdH1cblxuXHRjcmVhdGUoKVxuXHR7XG5cdH1cblxuXHRzaW11bGF0ZSgpXG5cdHtcblx0XHRpZihNYXRoLnRydW5jKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkgJSAxNSA9PT0gMClcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5yZWdpb24gPSBmaXJlUmVnaW9uO1xuXHRcdH1cblxuXHRcdGlmKE1hdGgudHJ1bmMocGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKSAlIDE1ID09PSA1KVxuXHRcdHtcblx0XHRcdHRoaXMuc3ByaXRlLnJlZ2lvbiA9IHdhdGVyUmVnaW9uO1xuXHRcdH1cblxuXHRcdGlmKE1hdGgudHJ1bmMocGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKSAlIDE1ID09PSAxMClcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5yZWdpb24gPSBudWxsO1xuXHRcdH1cblxuXHRcdGxldCBzcGVlZCA9IDQ7XG5cblx0XHRsZXQgeEF4aXMgPSB0aGlzLmNvbnRyb2xsZXIuYXhpc1swXSB8fCAwO1xuXHRcdGxldCB5QXhpcyA9IHRoaXMuY29udHJvbGxlci5heGlzWzFdIHx8IDA7XG5cblx0XHRmb3IobGV0IHQgaW4gdGhpcy5jb250cm9sbGVyLnRyaWdnZXJzKVxuXHRcdHtcblx0XHRcdGlmKCF0aGlzLmNvbnRyb2xsZXIudHJpZ2dlcnNbdF0pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zb2xlLmxvZyh0KTtcblx0XHR9XG5cblx0XHR4QXhpcyA9IE1hdGgubWluKDEsIE1hdGgubWF4KHhBeGlzLCAtMSkpO1xuXHRcdHlBeGlzID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoeUF4aXMsIC0xKSk7XG5cblx0XHR0aGlzLnNwcml0ZS54ICs9IHhBeGlzID4gMFxuXHRcdFx0PyBNYXRoLmNlaWwoc3BlZWQgKiB4QXhpcylcblx0XHRcdDogTWF0aC5mbG9vcihzcGVlZCAqIHhBeGlzKTtcblxuXHRcdHRoaXMuc3ByaXRlLnkgKz0geUF4aXMgPiAwXG5cdFx0XHQ/IE1hdGguY2VpbChzcGVlZCAqIHlBeGlzKVxuXHRcdFx0OiBNYXRoLmZsb29yKHNwZWVkICogeUF4aXMpO1xuXG5cdFx0bGV0IGhvcml6b250YWwgPSBmYWxzZTtcblxuXHRcdGlmKE1hdGguYWJzKHhBeGlzKSA+IE1hdGguYWJzKHlBeGlzKSlcblx0XHR7XG5cdFx0XHRob3Jpem9udGFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZihob3Jpem9udGFsKVxuXHRcdHtcblx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ3dlc3QnO1xuXG5cdFx0XHRpZih4QXhpcyA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ2Vhc3QnO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXRlID0gJ3dhbGtpbmcnO1xuXG5cdFx0fVxuXHRcdGVsc2UgaWYoeUF4aXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnbm9ydGgnO1xuXG5cdFx0XHRpZih5QXhpcyA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ3NvdXRoJztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zdGF0ZSA9ICd3YWxraW5nJztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHRoaXMuc3RhdGUgPSAnc3RhbmRpbmcnO1xuXHRcdH1cblxuXHRcdC8vIGlmKCF4QXhpcyAmJiAheUF4aXMpXG5cdFx0Ly8ge1xuXHRcdC8vIFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdC8vIH1cblxuXHRcdGxldCBmcmFtZXM7XG5cblx0XHRpZihmcmFtZXMgPSB0aGlzLnNwcml0ZVt0aGlzLnN0YXRlXVt0aGlzLmRpcmVjdGlvbl0pXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUuc2V0RnJhbWVzKGZyYW1lcyk7XG5cdFx0fVxuXHR9XG5cblx0ZGVzdHJveSgpXG5cdHtcblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xcblxcbnVuaWZvcm0gdmVjNCB1X2NvbG9yO1xcbnZhcnlpbmcgdmVjMiB2X3RleENvb3JkO1xcblxcbnZvaWQgbWFpbigpIHtcXG4gIC8vIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB2X3RleENvb3JkKTtcXG4gIGdsX0ZyYWdDb2xvciA9IHZlYzQoMS4wLCAxLjAsIDAuMCwgMC4yNSk7XFxufVxcblwiIiwibW9kdWxlLmV4cG9ydHMgPSBcImF0dHJpYnV0ZSB2ZWMyIGFfcG9zaXRpb247XFxuYXR0cmlidXRlIHZlYzIgYV90ZXhDb29yZDtcXG5cXG51bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uO1xcbnZhcnlpbmcgdmVjMiB2X3RleENvb3JkO1xcblxcbnZvaWQgbWFpbigpXFxue1xcbiAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uO1xcbiAgdmVjMiB6ZXJvVG9Ud28gPSB6ZXJvVG9PbmUgKiAyLjA7XFxuICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDtcXG5cXG4gIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7XFxuICB2X3RleENvb3JkICA9IGFfdGV4Q29vcmQ7XFxufVxcblwiIiwiaW1wb3J0IHsgU3VyZmFjZSB9IGZyb20gJy4vU3VyZmFjZSc7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tICcuL0NhbWVyYSc7XG5pbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4vU3ByaXRlU2hlZXQnO1xuXG5leHBvcnQgIGNsYXNzIEJhY2tncm91bmRcbntcblx0Y29uc3RydWN0b3Ioc3ByaXRlQm9hcmQsIG1hcCwgbGF5ZXIgPSAwKVxuXHR7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cblx0XHR0aGlzLnBhbmVzICAgICAgID0gW107XG5cdFx0dGhpcy5wYW5lc1hZICAgICA9IHt9O1xuXHRcdHRoaXMubWF4UGFuZXMgICAgPSA5O1xuXG5cdFx0dGhpcy5tYXAgICAgICAgICA9IG1hcDtcblx0XHR0aGlzLmxheWVyICAgICAgID0gbGF5ZXI7XG5cblx0XHR0aGlzLnRpbGVXaWR0aCAgID0gMzI7XG5cdFx0dGhpcy50aWxlSGVpZ2h0ICA9IDMyO1xuXG5cdFx0dGhpcy5zdXJmYWNlV2lkdGggPSA1O1xuXHRcdHRoaXMuc3VyZmFjZUhlaWdodCA9IDU7XG5cdH1cblxuXHRyZW5kZXJQYW5lKHgsIHksIGZvcmNlVXBkYXRlKVxuXHR7XG5cdFx0bGV0IHBhbmU7XG5cdFx0bGV0IHBhbmVYID0geCAqIHRoaXMudGlsZVdpZHRoICogdGhpcy5zdXJmYWNlV2lkdGggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXHRcdGxldCBwYW5lWSA9IHkgKiB0aGlzLnRpbGVIZWlnaHQgKiB0aGlzLnN1cmZhY2VIZWlnaHQgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0aWYodGhpcy5wYW5lc1hZW3BhbmVYXSAmJiB0aGlzLnBhbmVzWFlbcGFuZVhdW3BhbmVZXSlcblx0XHR7XG5cdFx0XHRwYW5lID0gdGhpcy5wYW5lc1hZW3BhbmVYXVtwYW5lWV07XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRwYW5lID0gbmV3IFN1cmZhY2UoXG5cdFx0XHRcdHRoaXMuc3ByaXRlQm9hcmRcblx0XHRcdFx0LCB0aGlzLnNwcml0ZVNoZWV0XG5cdFx0XHRcdCwgdGhpcy5tYXBcblx0XHRcdFx0LCB0aGlzLnN1cmZhY2VXaWR0aFxuXHRcdFx0XHQsIHRoaXMuc3VyZmFjZUhlaWdodFxuXHRcdFx0XHQsIHBhbmVYXG5cdFx0XHRcdCwgcGFuZVlcblx0XHRcdFx0LCB0aGlzLmxheWVyXG5cdFx0XHQpO1xuXG5cdFx0XHRpZighdGhpcy5wYW5lc1hZW3BhbmVYXSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5wYW5lc1hZW3BhbmVYXSA9IHt9O1xuXHRcdFx0fVxuXG5cdFx0XHRpZighdGhpcy5wYW5lc1hZW3BhbmVYXVtwYW5lWV0pXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMucGFuZXNYWVtwYW5lWF1bcGFuZVldID0gcGFuZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnBhbmVzLnB1c2gocGFuZSk7XG5cblx0XHRpZih0aGlzLnBhbmVzLmxlbmd0aCA+IHRoaXMubWF4UGFuZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5wYW5lcy5zaGlmdCgpO1xuXHRcdH1cblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0dGhpcy5wYW5lcy5sZW5ndGggPSAwO1xuXG5cdFx0Y29uc3QgY2VudGVyWCA9IE1hdGguZmxvb3IoXG5cdFx0XHQoQ2FtZXJhLnggLyAodGhpcy5zdXJmYWNlV2lkdGggKiB0aGlzLnRpbGVXaWR0aCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwpKSArIDBcblx0XHQpO1xuXG5cdFx0Y29uc3QgY2VudGVyWSA9IE1hdGguZmxvb3IoXG5cdFx0XHRDYW1lcmEueSAvICh0aGlzLnN1cmZhY2VIZWlnaHQgKiB0aGlzLnRpbGVIZWlnaHQgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsKSArIDBcblx0XHQpO1xuXG5cdFx0bGV0IHJhbmdlID0gWy0xLCAwLCAxXTtcblxuXHRcdGZvcihsZXQgeCBpbiByYW5nZSlcblx0XHR7XG5cdFx0XHRmb3IobGV0IHkgaW4gcmFuZ2UpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMucmVuZGVyUGFuZShjZW50ZXJYICsgcmFuZ2VbeF0sIGNlbnRlclkgKyByYW5nZVt5XSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5wYW5lcy5mb3JFYWNoKHAgPT4gcC5kcmF3KCkpO1xuXHR9XG5cblx0cmVzaXplKHgsIHkpXG5cdHtcblx0XHRmb3IobGV0IGkgaW4gdGhpcy5wYW5lc1hZKVxuXHRcdHtcblx0XHRcdGZvcihsZXQgaiBpbiB0aGlzLnBhbmVzWFlbaV0pXG5cdFx0XHR7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnBhbmVzWFlbaV1bal07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0d2hpbGUodGhpcy5wYW5lcy5sZW5ndGgpXG5cdFx0e1xuXHRcdFx0dGhpcy5wYW5lcy5wb3AoKTtcblx0XHR9XG5cblx0XHR0aGlzLnN1cmZhY2VXaWR0aCA9IE1hdGguY2VpbCgoeCAvIHRoaXMudGlsZVdpZHRoKSk7XG5cdFx0dGhpcy5zdXJmYWNlSGVpZ2h0ID0gTWF0aC5jZWlsKCh5IC8gdGhpcy50aWxlSGVpZ2h0KSk7XG5cblx0XHR0aGlzLmRyYXcoKTtcblx0fVxuXG5cdHNpbXVsYXRlKClcblx0e1xuXHRcdFxuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQ2FtZXJhXG57XG5cdHN0YXRpYyB4ID0gMDtcblx0c3RhdGljIHkgPSAwO1xuXHRzdGF0aWMgd2lkdGggID0gMDtcblx0c3RhdGljIGhlaWdodCA9IDA7XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gXCJjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZVwiO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSBcIi4vQ2FtZXJhXCI7XG5cbmV4cG9ydCBjbGFzcyBTcHJpdGVcbntcblx0Y29uc3RydWN0b3Ioe3NyYywgc3ByaXRlQm9hcmQsIHNwcml0ZVNoZWV0LCB3aWR0aCwgaGVpZ2h0fSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXG5cdFx0dGhpcy56ID0gMDtcblx0XHR0aGlzLnggPSAwO1xuXHRcdHRoaXMueSA9IDA7XG5cblx0XHR0aGlzLndpZHRoICA9IDMyIHx8IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gMzIgfHwgaGVpZ2h0O1xuXHRcdHRoaXMuc2NhbGUgID0gMTtcblxuXHRcdHRoaXMuZnJhbWVzID0gW107XG5cdFx0dGhpcy5mcmFtZURlbGF5ID0gNDtcblx0XHR0aGlzLmN1cnJlbnREZWxheSA9IHRoaXMuZnJhbWVEZWxheTtcblx0XHR0aGlzLmN1cnJlbnRGcmFtZSA9IDA7XG5cdFx0dGhpcy5jdXJyZW50RnJhbWVzID0gJyc7XG5cblx0XHR0aGlzLnNwZWVkICAgID0gMDtcblx0XHR0aGlzLm1heFNwZWVkID0gODtcblxuXHRcdHRoaXMubW92aW5nID0gZmFsc2U7XG5cblx0XHR0aGlzLlJJR0hUXHQ9IDA7XG5cdFx0dGhpcy5ET1dOXHQ9IDE7XG5cdFx0dGhpcy5MRUZUXHQ9IDI7XG5cdFx0dGhpcy5VUFx0XHQ9IDM7XG5cblx0XHR0aGlzLkVBU1RcdD0gdGhpcy5SSUdIVDtcblx0XHR0aGlzLlNPVVRIXHQ9IHRoaXMuRE9XTjtcblx0XHR0aGlzLldFU1RcdD0gdGhpcy5MRUZUO1xuXHRcdHRoaXMuTk9SVEhcdD0gdGhpcy5VUDtcblxuXHRcdHRoaXMucmVnaW9uID0gWzAsIDAsIDAsIDFdO1xuXG5cdFx0dGhpcy5zdGFuZGluZyA9IHtcblx0XHRcdCdub3J0aCc6IFtcblx0XHRcdFx0J3BsYXllcl9zdGFuZGluZ19ub3J0aC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdzb3V0aCc6IFtcblx0XHRcdFx0J3BsYXllcl9zdGFuZGluZ19zb3V0aC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICd3ZXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnZWFzdCc6IFtcblx0XHRcdFx0J3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdF1cblx0XHR9O1xuXG5cdFx0dGhpcy53YWxraW5nID0ge1xuXHRcdFx0J25vcnRoJzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfbm9ydGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19ub3J0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19ub3J0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX25vcnRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX25vcnRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19ub3J0aC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdzb3V0aCc6IFtcblx0XHRcdFx0J3BsYXllcl93YWxraW5nX3NvdXRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfc291dGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfc291dGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19zb3V0aDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19zb3V0aDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfc291dGgucG5nJ1xuXG5cdFx0XHRdXG5cdFx0XHQsICd3ZXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfd2VzdDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ193ZXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XVxuXHRcdFx0LCAnZWFzdCc6IFtcblx0XHRcdFx0J3BsYXllcl93YWxraW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX2Vhc3QyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfZWFzdDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdF1cblx0XHR9O1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdHRoaXMudGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGV4dHVyZSk7XG5cblx0XHRjb25zdCByID0gKCkgPT4gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDI1NSk7XG5cdFx0Y29uc3QgcGl4ZWwgPSBuZXcgVWludDhBcnJheShbcigpLCByKCksIHIoKSwgMjU1XSk7XG5cblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgMVxuXHRcdFx0LCAxXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIHBpeGVsXG5cdFx0KTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBzcHJpdGVTaGVldDtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQucmVhZHkudGhlbigoc2hlZXQpPT57XG5cdFx0XHRjb25zdCBmcmFtZSA9IHRoaXMuc3ByaXRlU2hlZXQuZ2V0RnJhbWUoc3JjKTtcblxuXHRcdFx0aWYoZnJhbWUpXG5cdFx0XHR7XG5cdFx0XHRcdFNwcml0ZS5sb2FkVGV4dHVyZSh0aGlzLnNwcml0ZUJvYXJkLmdsMmQsIGZyYW1lKS50aGVuKGFyZ3MgPT4ge1xuXHRcdFx0XHRcdHRoaXMudGV4dHVyZSA9IGFyZ3MudGV4dHVyZTtcblx0XHRcdFx0XHR0aGlzLndpZHRoID0gYXJncy5pbWFnZS53aWR0aCAqIHRoaXMuc2NhbGU7XG5cdFx0XHRcdFx0dGhpcy5oZWlnaHQgPSBhcmdzLmltYWdlLmhlaWdodCAqIHRoaXMuc2NhbGU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHR0aGlzLmZyYW1lRGVsYXkgPSB0aGlzLm1heFNwZWVkIC0gTWF0aC5hYnModGhpcy5zcGVlZCk7XG5cdFx0aWYodGhpcy5mcmFtZURlbGF5ID4gdGhpcy5tYXhTcGVlZClcblx0XHR7XG5cdFx0XHR0aGlzLmZyYW1lRGVsYXkgPSB0aGlzLm1heFNwZWVkO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuY3VycmVudERlbGF5IDw9IDApXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXkgPSB0aGlzLmZyYW1lRGVsYXk7XG5cdFx0XHR0aGlzLmN1cnJlbnRGcmFtZSsrO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXktLTtcblx0XHR9XG5cblx0XHRpZih0aGlzLmN1cnJlbnRGcmFtZSA+PSB0aGlzLmZyYW1lcy5sZW5ndGgpXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RnJhbWUgPSB0aGlzLmN1cnJlbnRGcmFtZSAtIHRoaXMuZnJhbWVzLmxlbmd0aDtcblx0XHR9XG5cblx0XHRjb25zdCBmcmFtZSA9IHRoaXMuZnJhbWVzWyB0aGlzLmN1cnJlbnRGcmFtZSBdO1xuXG5cdFx0aWYoZnJhbWUpXG5cdFx0e1xuXHRcdFx0dGhpcy50ZXh0dXJlID0gZnJhbWUudGV4dHVyZTtcblx0XHRcdHRoaXMud2lkdGggID0gZnJhbWUud2lkdGggKiB0aGlzLnNjYWxlO1xuXHRcdFx0dGhpcy5oZWlnaHQgPSBmcmFtZS5oZWlnaHQgKiB0aGlzLnNjYWxlO1xuXHRcdH1cblxuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnRleHR1cmUpO1xuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLnRleENvb3JkQnVmZmVyKTtcblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHQwLjAsIDAuMCxcblx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0MC4wLCAxLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0MS4wLCAxLjAsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblxuXHRcdGdsLnVuaWZvcm00Zihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVnaW9uTG9jYXRpb25cblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRnbC51bmlmb3JtMmYoXG5cdFx0XHR0aGlzLnNpemVMb2NhdGlvblxuXHRcdFx0LCAxLjBcblx0XHRcdCwgMS4wXG5cdFx0KTtcblxuXHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0dGhpcy54ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCArIC1DYW1lcmEueCArIChDYW1lcmEud2lkdGggKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsIC8gMilcblx0XHRcdCwgdGhpcy55ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCArIC1DYW1lcmEueSArIChDYW1lcmEuaGVpZ2h0ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAvIDIpICsgLXRoaXMuaGVpZ2h0ICogMC41ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCB0aGlzLndpZHRoICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdFx0LCB0aGlzLmhlaWdodCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWxcblx0XHQpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmRyYXdCdWZmZXIpO1xuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblxuXHRcdGdsLnVuaWZvcm00Zih0aGlzLnNwcml0ZUJvYXJkLnJlZ2lvbkxvY2F0aW9uLCAuLi5PYmplY3QuYXNzaWduKHRoaXMucmVnaW9uIHx8IFswLCAwLCAwXSwgezM6IDF9KSk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZWZmZWN0QnVmZmVyKTtcblx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cblx0XHRnbC51bmlmb3JtNGYoXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlZ2lvbkxvY2F0aW9uXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHQpO1xuXHR9XG5cblx0c2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpXG5cdHtcblx0XHRsZXQgZnJhbWVzSWQgPSBmcmFtZVNlbGVjdG9yLmpvaW4oJyAnKTtcblxuXHRcdGlmKHRoaXMuY3VycmVudEZyYW1lcyA9PT0gZnJhbWVzSWQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMuY3VycmVudEZyYW1lcyA9IGZyYW1lc0lkO1xuXG5cdFx0Y29uc3QgbG9hZFRleHR1cmUgPSBmcmFtZSA9PiBTcHJpdGUubG9hZFRleHR1cmUodGhpcy5zcHJpdGVCb2FyZC5nbDJkLCBmcmFtZSk7XG5cblx0XHR0aGlzLnNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oc2hlZXQgPT4ge1xuXHRcdFx0Y29uc3QgZnJhbWVzID0gc2hlZXQuZ2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpLm1hcChcblx0XHRcdFx0ZnJhbWUgPT4gbG9hZFRleHR1cmUoZnJhbWUpLnRoZW4oYXJncyA9PiAoe1xuXHRcdFx0XHRcdHRleHR1cmU6ICBhcmdzLnRleHR1cmVcblx0XHRcdFx0XHQsIHdpZHRoOiAgYXJncy5pbWFnZS53aWR0aFxuXHRcdFx0XHRcdCwgaGVpZ2h0OiBhcmdzLmltYWdlLmhlaWdodFxuXHRcdFx0XHR9KSlcblx0XHRcdCk7XG5cblx0XHRcdFByb21pc2UuYWxsKGZyYW1lcykudGhlbihmcmFtZXMgPT4gdGhpcy5mcmFtZXMgPSBmcmFtZXMpO1xuXG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgbG9hZFRleHR1cmUoZ2wyZCwgaW1hZ2VTcmMpXG5cdHtcblx0XHRjb25zdCBnbCA9IGdsMmQuY29udGV4dDtcblxuXHRcdGlmKCF0aGlzLnByb21pc2VzKVxuXHRcdHtcblx0XHRcdHRoaXMucHJvbWlzZXMgPSB7fTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnByb21pc2VzW2ltYWdlU3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm9taXNlc1tpbWFnZVNyY107XG5cdFx0fVxuXG5cdFx0dGhpcy5wcm9taXNlc1tpbWFnZVNyY10gPSBTcHJpdGUubG9hZEltYWdlKGltYWdlU3JjKS50aGVuKChpbWFnZSk9Pntcblx0XHRcdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUpO1xuXG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG5cdFx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0XHQsIGltYWdlXG5cdFx0XHQpO1xuXG5cdFx0XHRyZXR1cm4ge2ltYWdlLCB0ZXh0dXJlfVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMucHJvbWlzZXNbaW1hZ2VTcmNdO1xuXHR9XG5cblx0c3RhdGljIGxvYWRJbWFnZShzcmMpXG5cdHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KT0+e1xuXHRcdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdGltYWdlLnNyYyAgID0gc3JjO1xuXHRcdFx0aW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldmVudCk9Pntcblx0XHRcdFx0YWNjZXB0KGltYWdlKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0c2V0UmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRyYW5zZm9ybSA9IFtdKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLnBvc2l0aW9uQnVmZmVyKTtcblxuXHRcdGNvbnN0IHgxID0geDtcblx0XHRjb25zdCB5MSA9IHk7XG5cdFx0Y29uc3QgeDIgPSB4ICsgd2lkdGg7XG5cdFx0Y29uc3QgeTIgPSB5ICsgaGVpZ2h0O1xuXG5cdFx0Y29uc3QgcG9pbnRzID0gbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XSk7XG5cblx0XHRjb25zdCB4T2ZmID0geCArIHdpZHRoIC8gMjtcblx0XHRjb25zdCB5T2ZmID0geSArIGhlaWdodCAvIDI7XG5cdFx0Y29uc3QgdGhldGEgPSBwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDAgJSAoMiAqIE1hdGguUEkpO1xuXG5cdFx0Y29uc3QgdCA9IHRoaXMubWF0cml4VHJhbnNmb3JtKHBvaW50cywgdGhpcy5tYXRyaXhDb21wb3NpdGUoXG5cdFx0XHR0aGlzLm1hdHJpeFRyYW5zbGF0ZSh4T2ZmLCB5T2ZmKVxuXHRcdFx0Ly8gLCB0aGlzLm1hdHJpeFNjYWxlKE1hdGguc2luKHRoZXRhKSwgTWF0aC5jb3ModGhldGEpKVxuXHRcdFx0Ly8gLCB0aGlzLm1hdHJpeFJvdGF0ZSh0aGV0YSlcblx0XHRcdCwgdGhpcy5tYXRyaXhUcmFuc2xhdGUoLXhPZmYsIC15T2ZmKVxuXHRcdCkpXG5cblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgdCwgZ2wuU1RSRUFNX0RSQVcpO1xuXHR9XG5cblx0bWF0cml4SWRlbnRpdHkoKVxuXHR7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFsxLCAwLCAwXSxcblx0XHRcdFswLCAxLCAwXSxcblx0XHRcdFswLCAwLCAxXSxcblx0XHRdO1xuXHR9XG5cblx0bWF0cml4VHJhbnNsYXRlKGR4LCBkeSlcblx0e1xuXHRcdHJldHVybiBbXG5cdFx0XHRbMSwgMCwgZHhdLFxuXHRcdFx0WzAsIDEsIGR5XSxcblx0XHRcdFswLCAwLCAgMV0sXG5cdFx0XTtcblx0fVxuXG5cdG1hdHJpeFNjYWxlKGR4LCBkeSlcblx0e1xuXHRcdHJldHVybiBbXG5cdFx0XHRbZHgsIDAsIDBdLFxuXHRcdFx0WzAsIGR5LCAwXSxcblx0XHRcdFswLCAwLCAgMV0sXG5cdFx0XTtcblx0fVxuXG5cdG1hdHJpeFJvdGF0ZSh0aGV0YSlcblx0e1xuXHRcdGNvbnN0IHMgPSBNYXRoLnNpbih0aGV0YSk7XG5cdFx0Y29uc3QgYyA9IE1hdGguY29zKHRoZXRhKTtcblxuXHRcdHJldHVybiBbXG5cdFx0XHRbYywgLXMsIDBdLFxuXHRcdFx0W3MsICBjLCAwXSxcblx0XHRcdFswLCAgMCwgMV0sXG5cdFx0XTtcblx0fVxuXG5cdG1hdHJpeFNoZWFyWChzKVxuXHR7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFsxLCBzLCAwXSxcblx0XHRcdFswLCAxLCAwXSxcblx0XHRcdFswLCAwLCAxXSxcblx0XHRdO1xuXHR9XG5cblx0bWF0cml4U2hlYXJZKHMpXG5cdHtcblx0XHRyZXR1cm4gW1xuXHRcdFx0WzEsIDAsIDBdLFxuXHRcdFx0W3MsIDEsIDBdLFxuXHRcdFx0WzAsIDAsIDFdLFxuXHRcdF07XG5cdH1cblxuXHRtYXRyaXhNdWx0aXBseShtYXRBLCBtYXRCKVxuXHR7XG5cdFx0aWYobWF0QS5sZW5ndGggIT09IG1hdEIubGVuZ3RoKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBtYXRyaWNlcycpO1xuXHRcdH1cblxuXHRcdGlmKG1hdEFbMF0ubGVuZ3RoICE9PSBtYXRCLmxlbmd0aClcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0luY29tcGF0aWJsZSBtYXRyaWNlcycpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG91dHB1dCA9IEFycmF5KG1hdEEubGVuZ3RoKS5maWxsKCkubWFwKCgpID0+IEFycmF5KG1hdEJbMF0ubGVuZ3RoKS5maWxsKDApKTtcblxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCBtYXRBLmxlbmd0aDsgaSsrKVxuXHRcdHtcblx0XHRcdGZvcihsZXQgaiA9IDA7IGogPCBtYXRCWzBdLmxlbmd0aDsgaisrKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IobGV0IGsgPSAwOyBrIDwgbWF0QVswXS5sZW5ndGg7IGsrKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG91dHB1dFtpXVtqXSArPSBtYXRBW2ldW2tdICogbWF0QltrXVtqXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRtYXRyaXhDb21wb3NpdGUoLi4ubWF0cylcblx0e1xuXHRcdGxldCBvdXRwdXQgPSB0aGlzLm1hdHJpeElkZW50aXR5KCk7XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgbWF0cy5sZW5ndGg7IGkrKylcblx0XHR7XG5cdFx0XHRvdXRwdXQgPSB0aGlzLm1hdHJpeE11bHRpcGx5KG91dHB1dCwgbWF0c1tpXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdG1hdHJpeFRyYW5zZm9ybShwb2ludHMsIG1hdHJpeClcblx0e1xuXHRcdGNvbnN0IG91dHB1dCA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkgKz0gMilcblx0XHR7XG5cdFx0XHRjb25zdCBwb2ludCA9IFtwb2ludHNbaV0sIHBvaW50c1tpICsgMV0sIDFdO1xuXG5cdFx0XHRmb3IoY29uc3Qgcm93IG9mIG1hdHJpeClcblx0XHRcdHtcblx0XHRcdFx0b3V0cHV0LnB1c2goXG5cdFx0XHRcdFx0cG9pbnRbMF0gKiByb3dbMF1cblx0XHRcdFx0XHQrIHBvaW50WzFdICogcm93WzFdXG5cdFx0XHRcdFx0KyBwb2ludFsyXSAqIHJvd1syXVxuXHRcdFx0XHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkob3V0cHV0LmZpbHRlcigoXywgaykgPT4gKDEgKyBrKSAlIDMpKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmFnIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmFnJztcbmltcG9ydCB7IEJhY2tncm91bmQgIH0gZnJvbSAnLi9CYWNrZ3JvdW5kJztcblxuaW1wb3J0IHsgR2wyZCB9IGZyb20gJy4uL2dsMmQvR2wyZCc7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tICcuL0NhbWVyYSc7XG5pbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuL1Nwcml0ZSc7XG5pbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi9TcHJpdGVTaGVldCc7XG5cbmV4cG9ydCBjbGFzcyBTcHJpdGVCb2FyZFxue1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50LCBtYXApXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblxuXHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdHRoaXMuc3ByaXRlcyA9IG5ldyBCYWc7XG5cblx0XHR0aGlzLm1vdXNlID0ge1xuXHRcdFx0eDogbnVsbFxuXHRcdFx0LCB5OiBudWxsXG5cdFx0XHQsIGNsaWNrWDogbnVsbFxuXHRcdFx0LCBjbGlja1k6IG51bGxcblx0XHR9O1xuXG5cdFx0Q2FtZXJhLndpZHRoICA9IGVsZW1lbnQud2lkdGg7XG5cdFx0Q2FtZXJhLmhlaWdodCA9IGVsZW1lbnQuaGVpZ2h0O1xuXG5cdFx0dGhpcy5nbDJkID0gbmV3IEdsMmQoZWxlbWVudCk7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG5cdFx0Z2wuZW5hYmxlKGdsLkJMRU5EKTtcblxuXHRcdHRoaXMucHJvZ3JhbSA9IHRoaXMuZ2wyZC5jcmVhdGVQcm9ncmFtKFxuXHRcdFx0dGhpcy5nbDJkLmNyZWF0ZVNoYWRlcignc3ByaXRlL3RleHR1cmUudmVydCcpXG5cdFx0XHQsIHRoaXMuZ2wyZC5jcmVhdGVTaGFkZXIoJ3Nwcml0ZS90ZXh0dXJlLmZyYWcnKVxuXHRcdCk7XG5cblx0XHQvLyB0aGlzLm92ZXJsYXlQcm9ncmFtID0gdGhpcy5nbDJkLmNyZWF0ZVByb2dyYW0oXG5cdFx0Ly8gXHR0aGlzLmdsMmQuY3JlYXRlU2hhZGVyKCdvdmVybGF5L292ZXJsYXkudmVydCcpXG5cdFx0Ly8gXHQsIHRoaXMuZ2wyZC5jcmVhdGVTaGFkZXIoJ292ZXJsYXkvb3ZlcmxheS5mcmFnJylcblx0XHQvLyApO1xuXG5cdFx0Z2wudXNlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXG5cdFx0dGhpcy5wb3NpdGlvbkJ1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuXHRcdHRoaXMudGV4Q29vcmRCdWZmZXIgPSBnbC5jcmVhdGVCdWZmZXIoKTtcblx0XHR0aGlzLmVmZkNvb3JkQnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG5cblx0XHR0aGlzLnBvc2l0aW9uTG9jYXRpb24gPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLnByb2dyYW0sICdhX3Bvc2l0aW9uJyk7XG5cdFx0dGhpcy50ZXhDb29yZExvY2F0aW9uID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5wcm9ncmFtLCAnYV90ZXhDb29yZCcpO1xuXHRcdHRoaXMuZWZmQ29vcmRMb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ2FfZWZmQ29vcmQnKTtcblxuXHRcdHRoaXMuaW1hZ2VMb2NhdGlvbiAgICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfaW1hZ2UnKTtcblx0XHR0aGlzLmVmZmVjdExvY2F0aW9uICAgICA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sICd1X2VmZmVjdCcpO1xuXHRcdHRoaXMucmVzb2x1dGlvbkxvY2F0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfcmVzb2x1dGlvbicpO1xuXHRcdHRoaXMuY29sb3JMb2NhdGlvbiAgICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfY29sb3InKTtcblx0XHR0aGlzLnRpbGVQb3NMb2NhdGlvbiAgICA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sICd1X3RpbGVObycpO1xuXHRcdHRoaXMucmlwcGxlTG9jYXRpb24gICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfcmlwcGxlJyk7XG5cdFx0dGhpcy5zaXplTG9jYXRpb24gICAgICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV9zaXplJyk7XG5cdFx0dGhpcy5zY2FsZUxvY2F0aW9uICAgICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV9zY2FsZScpO1xuXHRcdHRoaXMucmVnaW9uTG9jYXRpb24gICAgID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfcmVnaW9uJyk7XG5cdFx0dGhpcy5yZWN0TG9jYXRpb24gICAgICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV9yZWN0Jyk7XG5cblx0XHRjb25zdCBhdHRyaWJ1dGVzID0gW1xuXHRcdFx0J2FfcG9zaXRpb24nXG5cdFx0XHQsICdhX3RleENvb3JkJ1xuXHRcdFx0LCAnYV9lZmZDb29yZCdcblx0XHRdO1xuXG5cdFx0Y29uc3QgdW5pZm9ybXMgPSBbXG5cdFx0XHQndV9pbWFnZSdcblx0XHRcdCwgJ3VfZWZmZWN0J1xuXHRcdFx0LCAndV9yZXNvbHV0aW9uJ1xuXHRcdFx0LCAndV9jb2xvcidcblx0XHRcdCwgJ3VfdGlsZU5vJ1xuXHRcdFx0LCAndV9yaXBwbGUnXG5cdFx0XHQsICd1X3NpemUnXG5cdFx0XHQsICd1X3NjYWxlJ1xuXHRcdFx0LCAndV9yZWdpb24nXG5cdFx0XHQsICd1X3JlY3QnXG5cdFx0XTtcblxuXHRcdC8vIHRoaXMub3ZlcmxheUxvY2F0aW9uICAgPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLm92ZXJsYXlQcm9ncmFtLCAnYV9wb3NpdGlvbicpO1xuXHRcdC8vIHRoaXMub3ZlcmxheVJlc29sdXRpb24gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5vdmVybGF5UHJvZ3JhbSwgJ3VfcmVzb2x1dGlvbicpO1xuXHRcdC8vIHRoaXMub3ZlcmxheUNvbG9yICAgICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5vdmVybGF5UHJvZ3JhbSwgJ3VfY29sb3InKTtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnBvc2l0aW9uQnVmZmVyKTtcblx0XHRnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSh0aGlzLnBvc2l0aW9uTG9jYXRpb24pO1xuXHRcdGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoXG5cdFx0XHR0aGlzLnBvc2l0aW9uTG9jYXRpb25cblx0XHRcdCwgMlxuXHRcdFx0LCBnbC5GTE9BVFxuXHRcdFx0LCBmYWxzZVxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHQpO1xuXG5cdFx0Z2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy50ZXhDb29yZExvY2F0aW9uKTtcblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy50ZXhDb29yZEJ1ZmZlcik7XG5cdFx0Z2wudmVydGV4QXR0cmliUG9pbnRlcihcblx0XHRcdHRoaXMudGV4Q29vcmRMb2NhdGlvblxuXHRcdFx0LCAyXG5cdFx0XHQsIGdsLkZMT0FUXG5cdFx0XHQsIGZhbHNlXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHR0aGlzLmRyYXdMYXllciA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLmRyYXdMYXllcik7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIDEwMDBcblx0XHRcdCwgMTAwMFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBudWxsXG5cdFx0KTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcblxuXHRcdHRoaXMuZWZmZWN0TGF5ZXIgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5lZmZlY3RMYXllcik7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIDEwMDBcblx0XHRcdCwgMTAwMFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBudWxsXG5cdFx0KTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcblxuXHRcdHRoaXMuZHJhd0J1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmRyYXdCdWZmZXIpO1xuXHRcdGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKFxuXHRcdFx0Z2wuRlJBTUVCVUZGRVJcblx0XHRcdCwgZ2wuQ09MT1JfQVRUQUNITUVOVDBcblx0XHRcdCwgZ2wuVEVYVFVSRV8yRFxuXHRcdFx0LCB0aGlzLmRyYXdMYXllclxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdHRoaXMuZWZmZWN0QnVmZmVyID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKTtcblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuZWZmZWN0QnVmZmVyKTtcblx0XHRnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChcblx0XHRcdGdsLkZSQU1FQlVGRkVSXG5cdFx0XHQsIGdsLkNPTE9SX0FUVEFDSE1FTlQwXG5cdFx0XHQsIGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgdGhpcy5lZmZlY3RMYXllclxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHQnbW91c2Vtb3ZlJywgKGV2ZW50KT0+e1xuXHRcdFx0XHR0aGlzLm1vdXNlLnggPSBldmVudC5jbGllbnRYO1xuXHRcdFx0XHR0aGlzLm1vdXNlLnkgPSBldmVudC5jbGllbnRZO1xuXHRcdFx0fVxuXHRcdCk7XG5cblx0XHR0aGlzLnNlbGVjdGVkID0ge1xuXHRcdFx0bG9jYWxYOiAgICBudWxsXG5cdFx0XHQsIGxvY2FsWTogIG51bGxcblx0XHRcdCwgZ2xvYmFsWDogbnVsbFxuXHRcdFx0LCBnbG9iYWxZOiBudWxsXG5cdFx0XHQsIHN0YXJ0R2xvYmFsWDogbnVsbFxuXHRcdFx0LCBzdGFydEdsb2JhbFk6IG51bGxcblx0XHR9O1xuXG5cdFx0dGhpcy5zZWxlY3RlZCA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh0aGlzLnNlbGVjdGVkKTtcblxuXHRcdHRoaXMuYmFja2dyb3VuZCAgPSBuZXcgQmFja2dyb3VuZCh0aGlzLCBtYXApO1xuXHRcdGNvbnN0IHcgPSAxMjg7XG5cdFx0Y29uc3Qgc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cblx0XHRmb3IoY29uc3QgaSBpbiBBcnJheSgxNikuZmlsbCgpKVxuXHRcdHtcblx0XHRcdGNvbnN0IGJhcnJlbCA9IG5ldyBTcHJpdGUoe1xuXHRcdFx0XHRzcmM6ICdiYXJyZWwucG5nJyxcblx0XHRcdFx0c3ByaXRlQm9hcmQ6IHRoaXMsXG5cdFx0XHRcdHNwcml0ZVNoZWV0XG5cdFx0XHR9KTtcblx0XHRcdGJhcnJlbC54ID0gMzIgKyAoaSAqIDMyKSAlIHc7XG5cdFx0XHRiYXJyZWwueSA9IE1hdGgudHJ1bmMoKGkgKiAzMikgLyB3KSAqIDMyO1xuXHRcdFx0dGhpcy5zcHJpdGVzLmFkZChiYXJyZWwpO1xuXHRcdH1cblxuXHRcdHRoaXMuc3ByaXRlcy5hZGQodGhpcy5iYWNrZ3JvdW5kKTtcblxuXHRcdHRoaXMuZm9sbG93aW5nID0gbnVsbDtcblx0fVxuXG5cdHVuc2VsZWN0KClcblx0e1xuXHRcdGlmKHRoaXMuc2VsZWN0ZWQubG9jYWxYID09PSBudWxsKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR0aGlzLnNlbGVjdGVkLmxvY2FsWCAgPSBudWxsO1xuXHRcdHRoaXMuc2VsZWN0ZWQubG9jYWxZICA9IG51bGw7XG5cdFx0dGhpcy5zZWxlY3RlZC5nbG9iYWxYID0gbnVsbDtcblx0XHR0aGlzLnNlbGVjdGVkLmdsb2JhbFkgPSBudWxsO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdGlmKHRoaXMuZm9sbG93aW5nKVxuXHRcdHtcblx0XHRcdENhbWVyYS54ID0gKDE2ICsgdGhpcy5mb2xsb3dpbmcuc3ByaXRlLngpICogdGhpcy5nbDJkLnpvb21MZXZlbCB8fCAwO1xuXHRcdFx0Q2FtZXJhLnkgPSAoMTYgKyB0aGlzLmZvbGxvd2luZy5zcHJpdGUueSkgKiB0aGlzLmdsMmQuem9vbUxldmVsIHx8IDA7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5lZmZlY3RCdWZmZXIpO1xuXG5cdFx0Z2wuY2xlYXJDb2xvcigwLCAwLCAwLCAwKTtcblx0XHRnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5kcmF3QnVmZmVyKTtcblxuXHRcdGdsLnZpZXdwb3J0KDAsIDAsIGdsLmNhbnZhcy53aWR0aCwgZ2wuY2FudmFzLmhlaWdodCk7XG5cblx0XHRnbC51bmlmb3JtMmYoXG5cdFx0XHR0aGlzLnJlc29sdXRpb25Mb2NhdGlvblxuXHRcdFx0LCBnbC5jYW52YXMud2lkdGhcblx0XHRcdCwgZ2wuY2FudmFzLmhlaWdodFxuXHRcdCk7XG5cblx0XHRnbC51bmlmb3JtM2YoXG5cdFx0XHR0aGlzLnJpcHBsZUxvY2F0aW9uXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGdsLnVuaWZvcm0yZihcblx0XHRcdHRoaXMuc2l6ZUxvY2F0aW9uXG5cdFx0XHQsIENhbWVyYS53aWR0aFxuXHRcdFx0LCBDYW1lcmEuaGVpZ2h0XG5cdFx0KTtcblxuXHRcdGdsLnVuaWZvcm0yZihcblx0XHRcdHRoaXMuc2NhbGVMb2NhdGlvblxuXHRcdFx0LCB0aGlzLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIHRoaXMuZ2wyZC56b29tTGV2ZWxcblx0XHQpO1xuXG5cdFx0Z2wudW5pZm9ybTRmKFxuXHRcdFx0dGhpcy5yZWdpb25Mb2NhdGlvblxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMCk7XG5cdFx0Z2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVCk7XG5cblx0XHRsZXQgc3ByaXRlcyA9IHRoaXMuc3ByaXRlcy5pdGVtcygpO1xuXG5cdFx0c3ByaXRlcy5mb3JFYWNoKHMgPT4gcy56ID0gcyBpbnN0YW5jZW9mIEJhY2tncm91bmQgPyAtMSA6IHMueSk7XG5cblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgJiYgY29uc29sZS50aW1lKCdzb3J0Jyk7XG5cblx0XHRzcHJpdGVzLnNvcnQoKGEsYikgPT4ge1xuXHRcdFx0aWYoKGEgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSAmJiAhKGIgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXG5cdFx0XHRpZigoYiBpbnN0YW5jZW9mIEJhY2tncm91bmQpICYmICEoYSBpbnN0YW5jZW9mIEJhY2tncm91bmQpKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYS56ID09PSB1bmRlZmluZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYi56ID09PSB1bmRlZmluZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYS56IC0gYi56O1xuXHRcdH0pO1xuXG5cdFx0aWYod2luZG93LnNtUHJvZmlsaW5nKVxuXHRcdHtcblx0XHRcdGNvbnNvbGUudGltZUVuZCgnc29ydCcpO1xuXHRcdFx0d2luZG93LnNtUHJvZmlsaW5nID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0c3ByaXRlcy5mb3JFYWNoKHMgPT4gcy5kcmF3KCkpO1xuXG5cdFx0Z2wudW5pZm9ybTNmKFxuXHRcdFx0dGhpcy5yaXBwbGVMb2NhdGlvblxuXHRcdFx0LCBNYXRoLlBJIC8gOFxuXHRcdFx0LCBwZXJmb3JtYW5jZS5ub3coKSAvIDIwMCAvLyArIC1DYW1lcmEueVxuXHRcdFx0LCAxXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLmRyYXdMYXllcik7XG5cdFx0Z2wudW5pZm9ybTFpKHRoaXMuaW1hZ2VMb2NhdGlvbiwgMCk7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLmVmZmVjdExheWVyKTtcblx0XHRnbC51bmlmb3JtMWkodGhpcy5lZmZlY3RMb2NhdGlvbiwgMSk7XG5cblx0XHR0aGlzLnNldFJlY3RhbmdsZShcblx0XHRcdDBcblx0XHRcdCwgdGhpcy5nbDJkLmVsZW1lbnQuaGVpZ2h0XG5cdFx0XHQsIHRoaXMuZ2wyZC5lbGVtZW50LndpZHRoXG5cdFx0XHQsIC10aGlzLmdsMmQuZWxlbWVudC5oZWlnaHRcblx0XHQpO1xuXG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXG5cdFx0Z2wudW5pZm9ybTNmKFxuXHRcdFx0dGhpcy5yaXBwbGVMb2NhdGlvblxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0XHRnbC51bmlmb3JtMWkodGhpcy5pbWFnZUxvY2F0aW9uLCAwKTtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTEpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHRcdGdsLnVuaWZvcm0xaSh0aGlzLmVmZmVjdExvY2F0aW9uLCAxKTtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApO1xuXG5cdH1cblxuXHRyZXNpemUod2lkdGgsIGhlaWdodClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5nbDJkLmNvbnRleHQ7XG5cblx0XHR3aWR0aCAgPSB3aWR0aCAgfHwgdGhpcy5nbDJkLmVsZW1lbnQud2lkdGg7XG5cdFx0aGVpZ2h0ID0gaGVpZ2h0IHx8IHRoaXMuZ2wyZC5lbGVtZW50LmhlaWdodDtcblxuXHRcdENhbWVyYS54ICo9IHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cdFx0Q2FtZXJhLnkgKj0gdGhpcy5nbDJkLnpvb21MZXZlbDtcblxuXHRcdENhbWVyYS53aWR0aCAgPSB3aWR0aCAgLyB0aGlzLmdsMmQuem9vbUxldmVsO1xuXHRcdENhbWVyYS5oZWlnaHQgPSBoZWlnaHQgLyB0aGlzLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0dGhpcy5iYWNrZ3JvdW5kLnJlc2l6ZShDYW1lcmEud2lkdGgsIENhbWVyYS5oZWlnaHQpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5kcmF3TGF5ZXIpO1xuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBDYW1lcmEud2lkdGggKiB0aGlzLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIENhbWVyYS5oZWlnaHQgKiB0aGlzLmdsMmQuem9vbUxldmVsXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIG51bGxcblx0XHQpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5lZmZlY3RMYXllcik7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIENhbWVyYS53aWR0aCAqIHRoaXMuZ2wyZC56b29tTGV2ZWxcblx0XHRcdCwgQ2FtZXJhLmhlaWdodCAqIHRoaXMuZ2wyZC56b29tTGV2ZWxcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbnVsbFxuXHRcdCk7XG5cdH1cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5nbDJkLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5wb3NpdGlvbkJ1ZmZlcik7XG5cblx0XHRjb25zdCB4MSA9IHg7XG5cdFx0Y29uc3QgeDIgPSB4ICsgd2lkdGg7XG5cdFx0Y29uc3QgeTEgPSB5O1xuXHRcdGNvbnN0IHkyID0geSArIGhlaWdodDtcblxuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgyLCB5Mixcblx0XHRdKSwgZ2wuU1RSRUFNX0RSQVcpO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgU3ByaXRlU2hlZXRcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0dGhpcy5pbWFnZVVybCA9ICcvc3ByaXRlc2hlZXQucG5nJztcblx0XHR0aGlzLmJveGVzVXJsID0gJy9zcHJpdGVzaGVldC5qc29uJztcblx0XHR0aGlzLnZlcnRpY2VzID0ge307XG5cdFx0dGhpcy5mcmFtZXMgICA9IHt9O1xuXHRcdHRoaXMud2lkdGggICAgPSAwO1xuXHRcdHRoaXMuaGVpZ2h0ICAgPSAwO1xuXG5cdFx0bGV0IHJlcXVlc3QgICA9IG5ldyBSZXF1ZXN0KHRoaXMuYm94ZXNVcmwpO1xuXG5cdFx0bGV0IHNoZWV0TG9hZGVyID0gZmV0Y2gocmVxdWVzdClcblx0XHQudGhlbigocmVzcG9uc2UpPT5yZXNwb25zZS5qc29uKCkpXG5cdFx0LnRoZW4oKGJveGVzKSA9PiB0aGlzLmJveGVzID0gYm94ZXMpO1xuXG5cdFx0bGV0IGltYWdlTG9hZGVyID0gbmV3IFByb21pc2UoKGFjY2VwdCk9Pntcblx0XHRcdHRoaXMuaW1hZ2UgICAgICAgID0gbmV3IEltYWdlKCk7XG5cdFx0XHR0aGlzLmltYWdlLnNyYyAgICA9IHRoaXMuaW1hZ2VVcmw7XG5cdFx0XHR0aGlzLmltYWdlLm9ubG9hZCA9ICgpPT57XG5cdFx0XHRcdGFjY2VwdCgpO1xuXHRcdFx0fTtcblx0XHR9KTtcblxuXHRcdHRoaXMucmVhZHkgPSBQcm9taXNlLmFsbChbc2hlZXRMb2FkZXIsIGltYWdlTG9hZGVyXSlcblx0XHQudGhlbigoKSA9PiB0aGlzLnByb2Nlc3NJbWFnZSgpKVxuXHRcdC50aGVuKCgpID0+IHRoaXMpO1xuXHR9XG5cblx0cHJvY2Vzc0ltYWdlKClcblx0e1xuXHRcdGlmKCF0aGlzLmJveGVzIHx8ICF0aGlzLmJveGVzLmZyYW1lcylcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgY2FudmFzICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdFx0Y2FudmFzLndpZHRoICA9IHRoaXMuaW1hZ2Uud2lkdGg7XG5cdFx0Y2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2UuaGVpZ2h0O1xuXG5cdFx0Y29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIiwge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pO1xuXG5cdFx0Y29udGV4dC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgMCwgMCk7XG5cblx0XHRjb25zdCBmcmFtZVByb21pc2VzID0gW107XG5cblx0XHRmb3IobGV0IGkgaW4gdGhpcy5ib3hlcy5mcmFtZXMpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3ViQ2FudmFzICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdFx0XHRzdWJDYW52YXMud2lkdGggID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUudztcblx0XHRcdHN1YkNhbnZhcy5oZWlnaHQgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oO1xuXG5cdFx0XHRjb25zdCBzdWJDb250ZXh0ID0gc3ViQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblxuXHRcdFx0aWYodGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUpXG5cdFx0XHR7XG5cdFx0XHRcdHN1YkNvbnRleHQucHV0SW1hZ2VEYXRhKGNvbnRleHQuZ2V0SW1hZ2VEYXRhKFxuXHRcdFx0XHRcdHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnhcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnlcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLndcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmhcblx0XHRcdFx0KSwgMCwgMCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMuYm94ZXMuZnJhbWVzW2ldLnRleHQpXG5cdFx0XHR7XG5cdFx0XHRcdHN1YkNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uY29sb3IgfHwgJ3doaXRlJztcblxuXHRcdFx0XHRzdWJDb250ZXh0LmZvbnQgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mb250XG5cdFx0XHRcdFx0fHwgYCR7dGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaH1weCBzYW5zLXNlcmlmYDtcblx0XHRcdFx0c3ViQ29udGV4dC50ZXh0QWxpZ24gPSAnY2VudGVyJztcblxuXHRcdFx0XHRzdWJDb250ZXh0LmZpbGxUZXh0KFxuXHRcdFx0XHRcdHRoaXMuYm94ZXMuZnJhbWVzW2ldLnRleHRcblx0XHRcdFx0XHQsIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLncgLyAyXG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oXG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53XG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0c3ViQ29udGV4dC50ZXh0QWxpZ24gPSBudWxsO1xuXHRcdFx0XHRzdWJDb250ZXh0LmZvbnQgICAgICA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGZyYW1lUHJvbWlzZXMucHVzaChuZXcgUHJvbWlzZSgoYWNjZXB0KT0+e1xuXHRcdFx0XHRzdWJDYW52YXMudG9CbG9iKChibG9iKT0+e1xuXHRcdFx0XHRcdHRoaXMuZnJhbWVzW3RoaXMuYm94ZXMuZnJhbWVzW2ldLmZpbGVuYW1lXSA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cblx0XHRcdFx0XHRhY2NlcHQodGhpcy5mcmFtZXNbdGhpcy5ib3hlcy5mcmFtZXNbaV0uZmlsZW5hbWVdKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KSk7XG5cblxuXHRcdFx0Ly8gbGV0IHUxID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueCAvIHRoaXMuaW1hZ2Uud2lkdGg7XG5cdFx0XHQvLyBsZXQgdjEgPSB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS55IC8gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHRcdC8vIGxldCB1MiA9ICh0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS54ICsgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUudylcblx0XHRcdC8vIFx0LyB0aGlzLmltYWdlLndpZHRoO1xuXG5cdFx0XHQvLyBsZXQgdjIgPSAodGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueSArIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmgpXG5cdFx0XHQvLyBcdC8gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHRcdC8vIHRoaXMudmVydGljZXNbdGhpcy5ib3hlcy5mcmFtZXNbaV0uZmlsZW5hbWVdID0ge1xuXHRcdFx0Ly8gXHR1MSx2MSx1Mix2MlxuXHRcdFx0Ly8gfTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwoZnJhbWVQcm9taXNlcyk7XG5cdH1cblxuXHRnZXRWZXJ0aWNlcyhmaWxlbmFtZSlcblx0e1xuXHRcdHJldHVybiB0aGlzLnZlcnRpY2VzW2ZpbGVuYW1lXTtcblx0fVxuXG5cdGdldEZyYW1lKGZpbGVuYW1lKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuZnJhbWVzW2ZpbGVuYW1lXTtcblx0fVxuXG5cdGdldEZyYW1lcyhmcmFtZVNlbGVjdG9yKVxuXHR7XG5cdFx0aWYoQXJyYXkuaXNBcnJheShmcmFtZVNlbGVjdG9yKSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gZnJhbWVTZWxlY3Rvci5tYXAoKG5hbWUpPT50aGlzLmdldEZyYW1lKG5hbWUpKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5nZXRGcmFtZXNCeVByZWZpeChmcmFtZVNlbGVjdG9yKTtcblx0fVxuXG5cdGdldEZyYW1lc0J5UHJlZml4KHByZWZpeClcblx0e1xuXHRcdGxldCBmcmFtZXMgPSBbXTtcblxuXHRcdGZvcihsZXQgaSBpbiB0aGlzLmZyYW1lcylcblx0XHR7XG5cdFx0XHRpZihpLnN1YnN0cmluZygwLCBwcmVmaXgubGVuZ3RoKSAhPT0gcHJlZml4KVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0ZnJhbWVzLnB1c2godGhpcy5mcmFtZXNbaV0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBmcmFtZXM7XG5cdH1cblxuXHRzdGF0aWMgbG9hZFRleHR1cmUoZ2wyZCwgaW1hZ2VTcmMpXG5cdHtcblx0XHRjb25zdCBnbCA9IGdsMmQuY29udGV4dDtcblxuXHRcdGlmKCF0aGlzLnRleHR1cmVQcm9taXNlcylcblx0XHR7XG5cdFx0XHR0aGlzLnRleHR1cmVQcm9taXNlcyA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMudGV4dHVyZVByb21pc2VzW2ltYWdlU3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy50ZXh0dXJlUHJvbWlzZXNbaW1hZ2VTcmNdO1xuXHRcdH1cblxuXHRcdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRyZXR1cm4gdGhpcy50ZXh0dXJlUHJvbWlzZXNbaW1hZ2VTcmNdID0gdGhpcy5sb2FkSW1hZ2UoaW1hZ2VTcmMpLnRoZW4oaW1hZ2UgPT4ge1xuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cblx0XHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHRcdCwgaW1hZ2Vcblx0XHRcdCk7XG5cblx0XHRcdC8qL1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdC8qL1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuUkVQRUFUKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLlJFUEVBVCk7XG5cdFx0XHQvLyovXG5cblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcblxuXHRcdFx0cmV0dXJuIHtpbWFnZSwgdGV4dHVyZX1cblx0XHR9KTtcblx0fVxuXG5cdHN0YXRpYyBsb2FkSW1hZ2Uoc3JjKVxuXHR7XG5cdFx0aWYoIXRoaXMuaW1hZ2VQcm9taXNlcylcblx0XHR7XG5cdFx0XHR0aGlzLmltYWdlUHJvbWlzZXMgPSB7fTtcblx0XHR9XG5cblx0XHRpZih0aGlzLmltYWdlUHJvbWlzZXNbc3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbWFnZVByb21pc2VzW3NyY107XG5cdFx0fVxuXG5cdFx0dGhpcy5pbWFnZVByb21pc2VzW3NyY10gPSBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpPT57XG5cdFx0XHRjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0aW1hZ2Uuc3JjICAgPSBzcmM7XG5cdFx0XHRpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKGV2ZW50KT0+e1xuXHRcdFx0XHRhY2NlcHQoaW1hZ2UpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcy5pbWFnZVByb21pc2VzW3NyY107XG5cdH1cbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi9DYW1lcmEnO1xuXG5leHBvcnQgY2xhc3MgU3VyZmFjZVxue1xuXHRjb25zdHJ1Y3RvcihzcHJpdGVCb2FyZCwgc3ByaXRlU2hlZXQsIG1hcCwgeFNpemUgPSAyLCB5U2l6ZSA9IDIsIHhPZmZzZXQgPSAwLCB5T2Zmc2V0ID0gMCwgbGF5ZXIgPSAwLCB6ID0gLTEpXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQgPSBzcHJpdGVCb2FyZDtcblx0XHR0aGlzLnNwcml0ZVNoZWV0ID0gc3ByaXRlU2hlZXQ7XG5cblx0XHR0aGlzLnggPSB4T2Zmc2V0O1xuXHRcdHRoaXMueSA9IHlPZmZzZXQ7XG5cdFx0dGhpcy56ID0gejtcblxuXHRcdHRoaXMubGF5ZXIgPSBsYXllcjtcblx0XHR0aGlzLnhTaXplID0geFNpemU7XG5cdFx0dGhpcy55U2l6ZSA9IHlTaXplO1xuXG5cdFx0dGhpcy50aWxlV2lkdGggID0gMzI7XG5cdFx0dGhpcy50aWxlSGVpZ2h0ID0gMzI7XG5cblx0XHR0aGlzLndpZHRoICA9IHRoaXMueFNpemUgKiB0aGlzLnRpbGVXaWR0aDtcblx0XHR0aGlzLmhlaWdodCA9IHRoaXMueVNpemUgKiB0aGlzLnRpbGVIZWlnaHQ7XG5cblx0XHR0aGlzLm1hcCA9IG1hcDtcblxuXHRcdHRoaXMudGV4VmVydGljZXMgPSBbXTtcblxuXG5cdFx0dGhpcy5zdWJUZXh0dXJlcyA9IHt9O1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldC5yZWFkeS50aGVuKHNoZWV0ID0+IHRoaXMuYnVpbGRUaWxlcygpKTtcblxuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHR0aGlzLnBhbmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnBhbmUpO1xuXG5cdFx0Y29uc3QgciA9ICgpID0+IHBhcnNlSW50KE1hdGgucmFuZG9tKCkqMjU1KTtcblx0XHRjb25zdCBwaXhlbCA9IG5ldyBVaW50OEFycmF5KFtyKCksIHIoKSwgcigpLCAyNTVdKTtcblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgMVxuXHRcdFx0LCAxXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIHBpeGVsXG5cdFx0KTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXG5cdFx0Ly8qL1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0LyovXG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUik7XG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLkxJTkVBUik7XG5cdFx0Ly8qL1xuXG5cdFx0dGhpcy5mcmFtZUJ1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmZyYW1lQnVmZmVyKTtcblx0XHRnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChcblx0XHRcdGdsLkZSQU1FQlVGRkVSXG5cdFx0XHQsIGdsLkNPTE9SX0FUVEFDSE1FTlQwXG5cdFx0XHQsIGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgdGhpcy5wYW5lXG5cdFx0XHQsIDBcblx0XHQpO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5wYW5lKTtcblxuXHRcdGNvbnN0IHggPSB0aGlzLnggKyAtQ2FtZXJhLnggKyAoQ2FtZXJhLndpZHRoICAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgLyAyKTtcblx0XHRjb25zdCB5ID0gdGhpcy55ICsgLUNhbWVyYS55ICsgKENhbWVyYS5oZWlnaHQgICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAvIDIpO1xuXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHR4XG5cdFx0XHQsIHlcblx0XHRcdCwgdGhpcy53aWR0aCAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWxcblx0XHRcdCwgdGhpcy5oZWlnaHQgKiB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3QnVmZmVyKTtcblx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cdH1cblxuXHRidWlsZFRpbGVzKClcblx0e1xuXHRcdGxldCB0ZXh0dXJlUHJvbWlzZXMgPSBbXTtcblx0XHRjb25zdCBzaXplID0gdGhpcy54U2l6ZSAqIHRoaXMueVNpemU7XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKVxuXHRcdHtcblx0XHRcdGxldCBsb2NhbFggID0gaSAlIHRoaXMueFNpemU7XG5cdFx0XHRsZXQgb2Zmc2V0WCA9IE1hdGguZmxvb3IodGhpcy54IC8gdGhpcy50aWxlV2lkdGgpO1xuXHRcdFx0bGV0IGdsb2JhbFggPSBsb2NhbFggKyBvZmZzZXRYO1xuXG5cdFx0XHRsZXQgbG9jYWxZICA9IE1hdGguZmxvb3IoaSAvIHRoaXMueFNpemUpO1xuXHRcdFx0bGV0IG9mZnNldFkgPSBNYXRoLmZsb29yKHRoaXMueSAvIHRoaXMudGlsZUhlaWdodCk7XG5cdFx0XHRsZXQgZ2xvYmFsWSA9IGxvY2FsWSArIG9mZnNldFk7XG5cblx0XHRcdGxldCBmcmFtZXMgPSB0aGlzLm1hcC5nZXRUaWxlKGdsb2JhbFgsIGdsb2JhbFksIHRoaXMubGF5ZXIpO1xuXG5cdFx0XHRjb25zdCBsb2FkVGV4dHVyZSA9IGZyYW1lID0+IHRoaXMuc3ByaXRlU2hlZXQuY29uc3RydWN0b3IubG9hZFRleHR1cmUodGhpcy5zcHJpdGVCb2FyZC5nbDJkLCBmcmFtZSk7XG5cblx0XHRcdGlmKEFycmF5LmlzQXJyYXkoZnJhbWVzKSlcblx0XHRcdHtcblx0XHRcdFx0bGV0IGogPSAwO1xuXHRcdFx0XHR0aGlzLnN1YlRleHR1cmVzW2ldID0gW107XG5cdFx0XHRcdHRleHR1cmVQcm9taXNlcy5wdXNoKFxuXHRcdFx0XHRcdFByb21pc2UuYWxsKGZyYW1lcy5tYXAoKGZyYW1lKT0+XG5cdFx0XHRcdFx0XHRsb2FkVGV4dHVyZShmcmFtZSkudGhlbihcblx0XHRcdFx0XHRcdFx0YXJncyA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zdWJUZXh0dXJlc1tpXVtqXSA9IGFyZ3MudGV4dHVyZTtcblx0XHRcdFx0XHRcdFx0XHRqKys7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHQpXG5cdFx0XHRcdCkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0ZXh0dXJlUHJvbWlzZXMucHVzaChcblx0XHRcdFx0XHRsb2FkVGV4dHVyZShmcmFtZXMpLnRoZW4oYXJncyA9PiB0aGlzLnN1YlRleHR1cmVzW2ldID0gYXJncy50ZXh0dXJlKVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdFByb21pc2UuYWxsKHRleHR1cmVQcm9taXNlcykudGhlbigoKSA9PiB0aGlzLmFzc2VtYmxlKCkpO1xuXHR9XG5cblx0YXNzZW1ibGUoKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMucGFuZSk7XG5cblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRCxcblx0XHRcdDAsXG5cdFx0XHRnbC5SR0JBLFxuXHRcdFx0dGhpcy53aWR0aCxcblx0XHRcdHRoaXMuaGVpZ2h0LFxuXHRcdFx0MCxcblx0XHRcdGdsLlJHQkEsXG5cdFx0XHRnbC5VTlNJR05FRF9CWVRFLFxuXHRcdFx0bnVsbCxcblx0XHQpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5zdWJUZXh0dXJlc1swXVswXSk7XG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmZyYW1lQnVmZmVyKTtcblx0XHRnbC52aWV3cG9ydCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG5cdFx0Ly8gZ2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKTtcblx0XHRnbC5jbGVhckNvbG9yKE1hdGgucmFuZG9tKCksIE1hdGgucmFuZG9tKCksIE1hdGgucmFuZG9tKCksIDEpO1xuXHRcdGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQgfCBnbC5ERVBUSF9CVUZGRVJfQklUKTtcblxuXHRcdGdsLnVuaWZvcm00Zihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuY29sb3JMb2NhdGlvblxuXHRcdFx0LCAxXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAxXG5cdFx0KTtcblxuXHRcdGdsLnVuaWZvcm0zZihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQudGlsZVBvc0xvY2F0aW9uXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGdsLnVuaWZvcm0yZihcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQucmVzb2x1dGlvbkxvY2F0aW9uXG5cdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHQpO1xuXG5cdFx0Z2wudW5pZm9ybTJmKFxuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5zaXplTG9jYXRpb25cblx0XHRcdCwgdGhpcy53aWR0aFxuXHRcdFx0LCB0aGlzLmhlaWdodFxuXHRcdCk7XG5cblx0XHRnbC51bmlmb3JtM2YoXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnJpcHBsZUxvY2F0aW9uXG5cdFx0XHQsIDBcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGlmKHRoaXMuc3ViVGV4dHVyZXNbMF1bMF0pXG5cdFx0e1xuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5zdWJUZXh0dXJlc1swXVswXSk7XG5cdFx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC50ZXhDb29yZEJ1ZmZlcik7XG5cdFx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHRcdDAuMCwgICAgICAgICAgICAgIDAuMCxcblx0XHRcdFx0dGhpcy53aWR0aCAvIDMyLCAgMC4wLFxuXHRcdFx0XHQwLjAsICAgICAgICAgICAgICAtdGhpcy5oZWlnaHQgLyAzMixcblx0XHRcdFx0MC4wLCAgICAgICAgICAgICAgLXRoaXMuaGVpZ2h0IC8gMzIsXG5cdFx0XHRcdHRoaXMud2lkdGggLyAzMiwgIDAuMCxcblx0XHRcdFx0dGhpcy53aWR0aCAvIDMyLCAgLXRoaXMuaGVpZ2h0IC8gMzIsXG5cdFx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cdFx0XHR0aGlzLnNldFJlY3RhbmdsZShcblx0XHRcdFx0MFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCB0aGlzLndpZHRoXG5cdFx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHRcdCk7XG5cblx0XHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblx0XHR9XG5cblx0XHQvLyBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXHRcdHJldHVybjtcblxuXHRcdGZvcihsZXQgaSBpbiB0aGlzLnN1YlRleHR1cmVzKVxuXHRcdHtcblx0XHRcdGkgPSBOdW1iZXIoaSk7XG5cdFx0XHRjb25zdCB4ID0gKGkgKiB0aGlzLnRpbGVXaWR0aCkgJSB0aGlzLndpZHRoO1xuXHRcdFx0Y29uc3QgeSA9IE1hdGgudHJ1bmMoaSAqIHRoaXMudGlsZVdpZHRoIC8gdGhpcy53aWR0aCkgKiB0aGlzLnRpbGVXaWR0aDtcblxuXHRcdFx0aWYoIUFycmF5LmlzQXJyYXkodGhpcy5zdWJUZXh0dXJlc1tpXSkpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuc3ViVGV4dHVyZXNbaV0gPSBbdGhpcy5zdWJUZXh0dXJlc1tpXV07XG5cdFx0XHR9XG5cblx0XHRcdGZvcihsZXQgaiBpbiB0aGlzLnN1YlRleHR1cmVzW2ldKVxuXHRcdFx0e1xuXHRcdFx0XHRnbC51bmlmb3JtM2YoXG5cdFx0XHRcdFx0dGhpcy5zcHJpdGVCb2FyZC50aWxlUG9zTG9jYXRpb25cblx0XHRcdFx0XHQsIE51bWJlcihpKVxuXHRcdFx0XHRcdCwgT2JqZWN0LmtleXModGhpcy5zdWJUZXh0dXJlcykubGVuZ3RoXG5cdFx0XHRcdFx0LCAxXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQudGV4Q29vcmRCdWZmZXIpO1xuXHRcdFx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHRcdFx0MC4wLCAwLjAsXG5cdFx0XHRcdFx0MS4wLCAwLjAsXG5cdFx0XHRcdFx0MC4wLCAxLjAsXG5cdFx0XHRcdFx0MC4wLCAxLjAsXG5cdFx0XHRcdFx0MS4wLCAwLjAsXG5cdFx0XHRcdFx0MS4wLCAxLjAsXG5cdFx0XHRcdF0pLCBnbC5TVEFUSUNfRFJBVyk7XG5cblx0XHRcdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHRcdFx0eFxuXHRcdFx0XHRcdCwgeSArIHRoaXMudGlsZUhlaWdodFxuXHRcdFx0XHRcdCwgdGhpcy50aWxlV2lkdGhcblx0XHRcdFx0XHQsIC10aGlzLnRpbGVIZWlnaHRcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Z2wudW5pZm9ybTNmKFxuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC50aWxlUG9zTG9jYXRpb25cblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHQpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLnBvc2l0aW9uQnVmZmVyKTtcblxuXHRcdGNvbnN0IHgxID0geDtcblx0XHRjb25zdCB4MiA9ICh4ICsgd2lkdGgpO1xuXHRcdGNvbnN0IHkxID0geTtcblx0XHRjb25zdCB5MiA9ICh5ICsgaGVpZ2h0KTtcblxuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgyLCB5Mixcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgyLCB5Mixcblx0XHRcdHgyLCB5MSxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgVGV4dHVyZUJhbmtcbntcblx0XG59IiwibW9kdWxlLmV4cG9ydHMgPSBcIi8vIHRleHR1cmUuZnJhZ1xcbiNkZWZpbmUgTV9QSSAzLjE0MTU5MjY1MzU4OTc5MzIzODQ2MjY0MzM4MzI3OTVcXG4jZGVmaW5lIE1fVEFVIE1fUEkgLyAyLjBcXG5wcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcXG5cXG51bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlO1xcbnVuaWZvcm0gc2FtcGxlcjJEIHVfZWZmZWN0O1xcblxcbnZhcnlpbmcgdmVjMiB2X3RleENvb3JkO1xcbnZhcnlpbmcgdmVjMiB2X3Bvc2l0aW9uO1xcblxcbnVuaWZvcm0gdmVjNCB1X2NvbG9yO1xcbnVuaWZvcm0gdmVjMyB1X3RpbGVObztcXG51bmlmb3JtIHZlYzMgdV9yaXBwbGU7XFxudW5pZm9ybSB2ZWMyIHVfc2l6ZTtcXG51bmlmb3JtIHZlYzIgdV9yZWN0O1xcbnVuaWZvcm0gdmVjMiB1X3NjYWxlO1xcbnVuaWZvcm0gdmVjNCB1X3JlZ2lvbjtcXG5cXG5mbG9hdCBtYXNrZWQgPSAwLjA7XFxuZmxvYXQgc29ydGVkID0gMS4wO1xcbmZsb2F0IGRpc3BsYWNlID0gMS4wO1xcbmZsb2F0IGJsdXIgPSAxLjA7XFxuXFxudmVjMiByaXBwbGVYKHZlYzIgdGV4Q29vcmQsIGZsb2F0IGEsIGZsb2F0IGIsIGZsb2F0IGMpIHtcXG4gIHZlYzIgcmlwcGxlZCA9IHZlYzIoXFxuICAgIHZfdGV4Q29vcmQueCArIHNpbih2X3RleENvb3JkLnkgKiAoYSAqIHVfc2l6ZS55KSArIGIpICogYyAvIHVfc2l6ZS54LFxcbiAgICB2X3RleENvb3JkLnlcXG4gICk7XFxuXFxuICBpZiAocmlwcGxlZC54IDwgMC4wKSB7XFxuICAgIHJpcHBsZWQueCA9IGFicyhyaXBwbGVkLngpO1xcbiAgfVxcbiAgZWxzZSBpZiAocmlwcGxlZC54ID4gdV9zaXplLngpIHtcXG4gICAgcmlwcGxlZC54ID0gdV9zaXplLnggLSAocmlwcGxlZC54IC0gdV9zaXplLngpO1xcbiAgfVxcblxcbiAgcmV0dXJuIHJpcHBsZWQ7XFxufVxcblxcbnZlYzIgcmlwcGxlWSh2ZWMyIHRleENvb3JkLCBmbG9hdCBhLCBmbG9hdCBiLCBmbG9hdCBjKSB7XFxuICB2ZWMyIHJpcHBsZWQgPSB2ZWMyKHZfdGV4Q29vcmQueCwgdl90ZXhDb29yZC55ICsgc2luKHZfdGV4Q29vcmQueCAqIChhICogdV9zaXplLngpICsgYikgKiBjIC8gdV9zaXplLnkpO1xcblxcbiAgaWYgKHJpcHBsZWQueSA8IDAuMCkge1xcbiAgICByaXBwbGVkLnggPSBhYnMocmlwcGxlZC54KTtcXG4gIH1cXG4gIGVsc2UgaWYgKHJpcHBsZWQueSA+IHVfc2l6ZS55KSB7XFxuICAgIHJpcHBsZWQueSA9IHVfc2l6ZS55IC0gKHJpcHBsZWQueSAtIHVfc2l6ZS55KTtcXG4gIH1cXG5cXG4gIHJldHVybiByaXBwbGVkO1xcbn1cXG5cXG52ZWM0IG1vdGlvbkJsdXIoc2FtcGxlcjJEIGltYWdlLCBmbG9hdCBhbmdsZSwgZmxvYXQgbWFnbml0dWRlLCB2ZWMyIHRleHRDb29yZCkge1xcbiAgdmVjNCBvcmlnaW5hbENvbG9yID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQpO1xcbiAgdmVjNCBkaXNwQ29sb3IgPSBvcmlnaW5hbENvbG9yO1xcblxcbiAgY29uc3QgZmxvYXQgbWF4ID0gMTAuMDtcXG4gIGZsb2F0IHdlaWdodCA9IDAuODU7XFxuXFxuICBmb3IgKGZsb2F0IGkgPSAwLjA7IGkgPCBtYXg7IGkgKz0gMS4wKSB7XFxuICAgIGlmKGkgPiBhYnMobWFnbml0dWRlKSB8fCBvcmlnaW5hbENvbG9yLmEgPCAxLjApIHtcXG4gICAgICBicmVhaztcXG4gICAgfVxcbiAgICB2ZWM0IGRpc3BDb2xvckRvd24gPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCArIHZlYzIoXFxuICAgICAgY29zKGFuZ2xlKSAqIGkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueCxcXG4gICAgICBzaW4oYW5nbGUpICogaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS55XFxuICAgICkpO1xcbiAgICBkaXNwQ29sb3IgPSBkaXNwQ29sb3IgKiAoMS4wIC0gd2VpZ2h0KSArIGRpc3BDb2xvckRvd24gKiB3ZWlnaHQ7XFxuICAgIHdlaWdodCAqPSAwLjg7XFxuICB9XFxuXFxuICByZXR1cm4gZGlzcENvbG9yO1xcbn1cXG5cXG52ZWM0IGxpbmVhckJsdXIoc2FtcGxlcjJEIGltYWdlLCBmbG9hdCBhbmdsZSwgZmxvYXQgbWFnbml0dWRlLCB2ZWMyIHRleHRDb29yZCkge1xcbiAgdmVjNCBvcmlnaW5hbENvbG9yID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQpO1xcbiAgdmVjNCBkaXNwQ29sb3IgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCk7XFxuXFxuICBjb25zdCBmbG9hdCBtYXggPSAxMC4wO1xcbiAgZmxvYXQgd2VpZ2h0ID0gMC42NTtcXG5cXG4gIGZvciAoZmxvYXQgaSA9IDAuMDsgaSA8IG1heDsgaSArPSAwLjI1KSB7XFxuICAgIGlmKGkgPiBhYnMobWFnbml0dWRlKSkge1xcbiAgICAgIGJyZWFrO1xcbiAgICB9XFxuICAgIHZlYzQgZGlzcENvbG9yVXAgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCArIHZlYzIoXFxuICAgICAgY29zKGFuZ2xlKSAqIC1pICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLngsXFxuICAgICAgc2luKGFuZ2xlKSAqIC1pICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLnlcXG4gICAgKSk7XFxuICAgIHZlYzQgZGlzcENvbG9yRG93biA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkICsgdmVjMihcXG4gICAgICBjb3MoYW5nbGUpICogaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS54LFxcbiAgICAgIHNpbihhbmdsZSkgKiBpICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLnlcXG4gICAgKSk7XFxuICAgIGRpc3BDb2xvciA9IGRpc3BDb2xvciAqICgxLjAgLSB3ZWlnaHQpICsgZGlzcENvbG9yRG93biAqIHdlaWdodCAqIDAuNSArIGRpc3BDb2xvclVwICogd2VpZ2h0ICogMC41O1xcbiAgICB3ZWlnaHQgKj0gMC43MDtcXG4gIH1cXG5cXG4gIHJldHVybiBkaXNwQ29sb3I7XFxufVxcblxcbnZvaWQgbWFpbigpIHtcXG4gIHZlYzQgb3JpZ2luYWxDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB2X3RleENvb3JkKTtcXG4gIHZlYzQgZWZmZWN0Q29sb3IgPSB0ZXh0dXJlMkQodV9lZmZlY3QsIHZfdGV4Q29vcmQpO1xcbiAgZ2xfRnJhZ0NvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG5cXG4gIGlmICh1X3JlZ2lvbi5yID4gMC4wIHx8IHVfcmVnaW9uLmcgPiAwLjAgfHwgdV9yZWdpb24uYiA+IDAuMCkge1xcbiAgICBpZiAobWFza2VkIDwgMS4wIHx8IG9yaWdpbmFsQ29sb3IuYSA+IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHVfcmVnaW9uO1xcbiAgICB9XFxuICAgIHJldHVybjtcXG4gIH1cXG4gIGVsc2UgaWYgKHVfcmVnaW9uLmEgPiAwLjApIHtcXG4gICAgaWYgKHNvcnRlZCA+IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMCwgMCwgMCwgb3JpZ2luYWxDb2xvci5hID4gMC4wID8gMS4wIDogMC4wKTtcXG4gICAgfVxcbiAgICBlbHNlIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAsIDAsIDAsIDAuMCk7XFxuICAgIH1cXG4gICAgcmV0dXJuO1xcbiAgfVxcblxcbiAgaWYgKGVmZmVjdENvbG9yID09IHZlYzQoMCwgMSwgMSwgMSkpIHsgLy8gV2F0ZXIgcmVnaW9uXFxuICAgIHZlYzIgdGV4Q29vcmQgPSB2X3RleENvb3JkO1xcbiAgICB2ZWM0IHZfYmx1cnJlZENvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG4gICAgaWYgKGRpc3BsYWNlID4gMC4wKSB7XFxuICAgICAgdGV4Q29vcmQgPSByaXBwbGVYKHZfdGV4Q29vcmQsIHVfcmlwcGxlLngsIHVfcmlwcGxlLnksIHVfcmlwcGxlLnopO1xcbiAgICAgIHZfYmx1cnJlZENvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHRleENvb3JkKTtcXG4gICAgfVxcbiAgICBpZiAoYmx1ciA+IDAuMCkge1xcbiAgICAgIHZfYmx1cnJlZENvbG9yID0gbGluZWFyQmx1cih1X2ltYWdlLCAwLjAsIDEuMCwgdGV4Q29vcmQpO1xcbiAgICB9XFxuICAgIGdsX0ZyYWdDb2xvciA9IHZfYmx1cnJlZENvbG9yICogMC42NSArIGVmZmVjdENvbG9yICogMC4zNTtcXG4gIH1cXG4gIGVsc2UgaWYgKGVmZmVjdENvbG9yID09IHZlYzQoMSwgMCwgMCwgMSkpIHsgLy8gRmlyZSByZWdpb25cXG4gICAgdmVjMiB2X2Rpc3BsYWNlbWVudCA9IHJpcHBsZVkodl90ZXhDb29yZCwgdV9yaXBwbGUueCAqIDIuMCwgdV9yaXBwbGUueSAqIDEuNSwgdV9yaXBwbGUueiAqIDAuMSk7XFxuICAgIHZlYzQgdl9ibHVycmVkQ29sb3IgPSBvcmlnaW5hbENvbG9yO1xcbiAgICBpZiAoZGlzcGxhY2UgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB2X2Rpc3BsYWNlbWVudCk7XFxuICAgIH1cXG4gICAgaWYgKGJsdXIgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IG1vdGlvbkJsdXIodV9pbWFnZSwgLU1fVEFVLCAxLjAsIHZfZGlzcGxhY2VtZW50KTtcXG4gICAgfVxcbiAgICBnbF9GcmFnQ29sb3IgPSB2X2JsdXJyZWRDb2xvciAqIDAuNzUgKyBlZmZlY3RDb2xvciAqIDAuMjU7XFxuICB9XFxuICBlbHNlIHsgLy8gTnVsbCByZWdpb25cXG4gICAgZ2xfRnJhZ0NvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG4gIH1cXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiLy8gdGV4dHVyZS52ZXJ0XFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxuYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxuXFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxudmFyeWluZyB2ZWMyIHZfcG9zaXRpb247XFxuXFxudm9pZCBtYWluKClcXG57XFxuICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24ueHkgLyB1X3Jlc29sdXRpb247XFxuICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDtcXG4gIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTtcXG4gIHZfdGV4Q29vcmQgID0gYV90ZXhDb29yZDtcXG4gIHZfcG9zaXRpb24gID0gYV9wb3NpdGlvbi54eTtcXG59XFxuXCIiLCJpbXBvcnQgeyBWaWV3IH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvVmlldyc7XG5cbmV4cG9ydCBjbGFzcyBDb250cm9sbGVyIGV4dGVuZHMgVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXIudG1wJyk7XG5cdFx0dGhpcy5kcmFnU3RhcnQgPSBmYWxzZTtcblxuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyAgPSBmYWxzZTtcblx0XHR0aGlzLmFyZ3MueCA9IDA7XG5cdFx0dGhpcy5hcmdzLnkgPSAwO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5tb3ZlU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMuZHJvcFN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMubW92ZVN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5kcm9wU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZHJhZ1N0aWNrKGV2ZW50KVxuXHR7XG5cdFx0bGV0IHBvcyA9IGV2ZW50O1xuXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuXHRcdGlmKGV2ZW50LnRvdWNoZXMgJiYgZXZlbnQudG91Y2hlc1swXSlcblx0XHR7XG5cdFx0XHRwb3MgPSBldmVudC50b3VjaGVzWzBdO1xuXHRcdH1cblxuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyA9IHRydWU7XG5cdFx0dGhpcy5kcmFnU3RhcnQgICAgID0ge1xuXHRcdFx0eDogICBwb3MuY2xpZW50WFxuXHRcdFx0LCB5OiBwb3MuY2xpZW50WVxuXHRcdH07XG5cdH1cblxuXHRtb3ZlU3RpY2soZXZlbnQpXG5cdHtcblx0XHRpZih0aGlzLmFyZ3MuZHJhZ2dpbmcpXG5cdFx0e1xuXHRcdFx0bGV0IHBvcyA9IGV2ZW50O1xuXG5cdFx0XHRpZihldmVudC50b3VjaGVzICYmIGV2ZW50LnRvdWNoZXNbMF0pXG5cdFx0XHR7XG5cdFx0XHRcdHBvcyA9IGV2ZW50LnRvdWNoZXNbMF07XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy54eCA9IHBvcy5jbGllbnRYIC0gdGhpcy5kcmFnU3RhcnQueDtcblx0XHRcdHRoaXMuYXJncy55eSA9IHBvcy5jbGllbnRZIC0gdGhpcy5kcmFnU3RhcnQueTtcblxuXHRcdFx0Y29uc3QgbGltaXQgPSA1MDtcblxuXHRcdFx0aWYodGhpcy5hcmdzLnh4IDwgLWxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IC1saW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYodGhpcy5hcmdzLnh4ID4gbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gdGhpcy5hcmdzLnh4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLmFyZ3MueXkgPCAtbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gLWxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZih0aGlzLmFyZ3MueXkgPiBsaW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSBsaW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSB0aGlzLmFyZ3MueXk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJvcFN0aWNrKGV2ZW50KVxuXHR7XG5cdFx0dGhpcy5hcmdzLmRyYWdnaW5nID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnggPSAwO1xuXHRcdHRoaXMuYXJncy55ID0gMDtcblx0fVxufVxuIiwiaW1wb3J0IHsgVmlldyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1ZpZXcnO1xuXG5leHBvcnQgY2xhc3MgTWFwRWRpdG9yIGV4dGVuZHMgVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL21hcEVkaXRvci50bXAnKTtcblxuXHRcdGFyZ3Muc3ByaXRlU2hlZXQucmVhZHkudGhlbigoc2hlZXQpPT57XG5cdFx0XHR0aGlzLmFyZ3MudGlsZXMgPSBzaGVldC5mcmFtZXM7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmFyZ3MuYmluZFRvKCdzZWxlY3RlZEdyYXBoaWMnLCAodik9Pntcblx0XHRcdHRoaXMuYXJncy5zZWxlY3RlZEdyYXBoaWMgPSBudWxsO1xuXHRcdH0sIHt3YWl0OjB9KTtcblxuXHRcdHRoaXMuYXJncy5tdWx0aVNlbGVjdCAgID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnNlbGVjdGlvbiAgICAgPSB7fTtcblx0XHR0aGlzLmFyZ3Muc2VsZWN0ZWRJbWFnZSA9IG51bGxcblx0fVxuXG5cdHNlbGVjdEdyYXBoaWMoc3JjKVxuXHR7XG5cdFx0Y29uc29sZS5sb2coc3JjKTtcblxuXHRcdHRoaXMuYXJncy5zZWxlY3RlZEdyYXBoaWMgPSBzcmM7XG5cdH1cblxuXHRzZWxlY3Qoc2VsZWN0aW9uKVxuXHR7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLmFyZ3Muc2VsZWN0aW9uLCBzZWxlY3Rpb24pO1xuXG5cdFx0aWYoc2VsZWN0aW9uLmdsb2JhbFggIT09IHNlbGVjdGlvbi5zdGFydEdsb2JhbFhcblx0XHRcdHx8IHNlbGVjdGlvbi5nbG9iYWxZICE9PSBzZWxlY3Rpb24uc3RhcnRHbG9iYWxZXG5cdFx0KXtcblx0XHRcdHRoaXMuYXJncy5tdWx0aVNlbGVjdCA9IHRydWU7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR0aGlzLmFyZ3MubXVsdGlTZWxlY3QgPSBmYWxzZTtcblx0XHR9XG5cblx0XHRpZighdGhpcy5hcmdzLm11bHRpU2VsZWN0KVxuXHRcdHtcblx0XHRcdHRoaXMuYXJncy5zZWxlY3RlZEltYWdlcyA9IHRoaXMuYXJncy5tYXAuZ2V0VGlsZShzZWxlY3Rpb24uZ2xvYmFsWCwgc2VsZWN0aW9uLmdsb2JhbFkpO1xuXHRcdH1cblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3MgPSBcXFwiY29udHJvbGxlclxcXCI+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJqb3lzdGlja1xcXCIgY3Ytb24gPSBcXFwiXFxuXFx0XFx0dG91Y2hzdGFydDpkcmFnU3RpY2soZXZlbnQpO1xcblxcdFxcdG1vdXNlZG93bjpkcmFnU3RpY2soZXZlbnQpO1xcblxcdFxcXCI+XFxuXFx0XFx0PGRpdiBjbGFzcyA9IFxcXCJwYWRcXFwiIHN0eWxlID0gXFxcInBvc2l0aW9uOiByZWxhdGl2ZTsgdHJhbnNmb3JtOnRyYW5zbGF0ZShbW3hdXXB4LFtbeV1dcHgpO1xcXCI+PC9kaXY+XFxuXFx0PC9kaXY+XFxuXFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJidXR0b25cXFwiPkE8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImJ1dHRvblxcXCI+QjwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwiYnV0dG9uXFxcIj5DPC9kaXY+XFxuPC9kaXY+XCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcyA9IFxcXCJ0YWItcGFnZSBtYXBFZGl0b3JcXFwiPlxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGFic1xcXCI+XFxuXFx0XFx0PGRpdj5UaWxlPC9kaXY+XFxuXFx0XFx0PGRpdj5MYXllcjwvZGl2PlxcblxcdFxcdDxkaXY+T2JqZWN0PC9kaXY+XFxuXFx0XFx0PGRpdj5UcmlnZ2VyPC9kaXY+XFxuXFx0XFx0PGRpdj5NYXA8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVcXFwiPlxcblxcdFxcdDxkaXYgY2xhc3MgPSBcXFwic2VsZWN0ZWRcXFwiPlxcblxcdFxcdFxcdDxkaXYgY3YtaWYgPSBcXFwiIW11bHRpU2VsZWN0XFxcIj5cXG5cXHRcXHRcXHRcXHQ8cCBzdHlsZSA9IFxcXCJmb250LXNpemU6IGxhcmdlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQoW1tzZWxlY3Rpb24uZ2xvYmFsWF1dLCBbW3NlbGVjdGlvbi5nbG9iYWxZXV0pXFxuXFx0XFx0XFx0XFx0PC9wPlxcblxcdFxcdFxcdFxcdDxwIGN2LWVhY2ggPSBcXFwic2VsZWN0ZWRJbWFnZXM6c2VsZWN0ZWRJbWFnZTpzSVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGJ1dHRvbj4tPC9idXR0b24+XFxuXFx0XFx0XFx0XFx0XFx0PGltZyBjbGFzcyA9IFxcXCJjdXJyZW50XFxcIiBjdi1hdHRyID0gXFxcInNyYzpzZWxlY3RlZEltYWdlXFxcIj5cXG5cXHRcXHRcXHRcXHQ8L3A+XFxuXFx0XFx0XFx0XFx0PGJ1dHRvbj4rPC9idXR0b24+XFxuXFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0PGRpdiBjdi1pZiA9IFxcXCJtdWx0aVNlbGVjdFxcXCI+XFxuXFx0XFx0XFx0XFx0PHAgc3R5bGUgPSBcXFwiZm9udC1zaXplOiBsYXJnZVxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0KFtbc2VsZWN0aW9uLnN0YXJ0R2xvYmFsWF1dLCBbW3NlbGVjdGlvbi5zdGFydEdsb2JhbFldXSkgLSAoW1tzZWxlY3Rpb24uZ2xvYmFsWF1dLCBbW3NlbGVjdGlvbi5nbG9iYWxZXV0pXFxuXFx0XFx0XFx0XFx0PC9wPlxcblxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdDwvZGl2PlxcblxcdFxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZXNcXFwiIGN2LWVhY2ggPSBcXFwidGlsZXM6dGlsZTp0XFxcIj5cXG5cXHRcXHRcXHQ8aW1nIGN2LWF0dHIgPSBcXFwic3JjOnRpbGUsdGl0bGU6dFxcXCIgY3Ytb24gPSBcXFwiY2xpY2s6c2VsZWN0R3JhcGhpYyh0KTtcXFwiPlxcblxcdFxcdDwvZGl2PlxcblxcdDwvZGl2PlxcblxcdDwhLS0gPGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5PQkpFQ1QgTU9ERTwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+VFJJR0dFUiBNT0RFPC9kaXY+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5NQVAgTU9ERTwvZGl2PiAtLT5cXG48L2Rpdj5cIiIsImltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGUnO1xuXG5leHBvcnQgY2xhc3MgRmxvb3Jcbntcblx0Y29uc3RydWN0b3IoZ2wyZCwgYXJncylcblx0e1xuXHRcdHRoaXMuZ2wyZCAgID0gZ2wyZDtcblx0XHR0aGlzLnNwcml0ZXMgPSBbXTtcblxuXHRcdC8vIHRoaXMucmVzaXplKDYwLCAzNCk7XG5cdFx0dGhpcy5yZXNpemUoOSwgOSk7XG5cdFx0Ly8gdGhpcy5yZXNpemUoNjAqMiwgMzQqMik7XG5cdH1cblxuXHRyZXNpemUod2lkdGgsIGhlaWdodClcblx0e1xuXHRcdHRoaXMud2lkdGggID0gd2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG5cblx0XHRmb3IobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKylcblx0XHR7XG5cdFx0XHRmb3IobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHNwcml0ZSA9IG5ldyBTcHJpdGUodGhpcy5nbDJkLCAnL2Zsb29yVGlsZS5wbmcnKTtcblxuXHRcdFx0XHRzcHJpdGUueCA9IDMyICogeDtcblx0XHRcdFx0c3ByaXRlLnkgPSAzMiAqIHk7XG5cblx0XHRcdFx0dGhpcy5zcHJpdGVzLnB1c2goc3ByaXRlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdHRoaXMuc3ByaXRlcy5tYXAocyA9PiBzLmRyYXcoKSk7XG5cdH1cbn1cbiIsImltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZVNoZWV0JztcbmltcG9ydCB7IEluamVjdGFibGUgIH0gZnJvbSAnLi4vaW5qZWN0L0luamVjdGFibGUnO1xuaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5cbmV4cG9ydCAgY2xhc3MgTWFwXG5leHRlbmRzIEluamVjdGFibGUuaW5qZWN0KHtTcHJpdGVTaGVldH0pXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblxuXHRcdHRoaXMudGlsZXMgPSB7fTtcblx0fVxuXG5cdGdldFRpbGUoeCwgeSwgbGF5ZXIgPSAwKVxuXHR7XG5cdFx0aWYodGhpcy50aWxlc1tgJHt4fSwke3l9LS0ke2xheWVyfWBdKVxuXHRcdHtcblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUodGhpcy50aWxlc1tgJHt4fSwke3l9LS0ke2xheWVyfWBdKVxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRsZXQgc3BsaXQgPSA0O1xuXHRcdGxldCBzZWNvbmQgPSAncm9ja180LnBuZyc7XG5cblx0XHRpZigoeCAlIHNwbGl0ID09PSAwKSAmJiAoeSAlIHNwbGl0ID09PSAwKSlcblx0XHR7XG5cdFx0XHRzZWNvbmQgPSAnY2hlZXNlLnBuZydcblx0XHR9XG5cblx0XHRpZih4ID09PSAtMSAmJiB5ID09PSAtMSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHQvLyB0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKCdmbG9vclRpbGUucG5nJylcblx0XHRcdFx0dGhpcy5TcHJpdGVTaGVldC5nZXRGcmFtZSgnYm94X2ZhY2UucG5nJylcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFtcblx0XHRcdHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2Zsb29yVGlsZS5wbmcnKVxuXHRcdFx0Ly8gdGhpcy5TcHJpdGVTaGVldC5nZXRGcmFtZSgnYm94X2ZhY2UucG5nJylcblx0XHRdO1xuXG5cdFx0cmV0dXJuIFtcblx0XHRcdHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2Zsb29yVGlsZS5wbmcnKVxuXHRcdFx0LCB0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKHNlY29uZClcblx0XHRdO1xuXHR9XG5cblx0c2V0VGlsZSh4LCB5LCBpbWFnZSwgbGF5ZXIgPSAwKVxuXHR7XG5cdFx0dGhpcy50aWxlc1tgJHt4fSwke3l9LS0ke2xheWVyfWBdID0gaW1hZ2U7XG5cdH1cblxuXHRleHBvcnQoKVxuXHR7XG5cdFx0Y29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodGhpcy50aWxlcykpO1xuXHR9XG5cblx0aW1wb3J0KGlucHV0KVxuXHR7XG5cdFx0aW5wdXQgPSBge1wiLTIsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIixcIi0xLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCIsXCIwLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCJ9YDtcblxuXHRcdHRoaXMudGlsZXMgPSBKU09OLnBhcnNlKGlucHV0KTtcblxuXHRcdC8vIGNvbnNvbGUubG9nKEpTT04ucGFyc2UoaW5wdXQpKTtcblx0fVxufVxuXG5cbi8vIHtcIi0yLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCIsXCItMSwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wiLFwiMCwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wifSIsIi8qIGpzaGludCBpZ25vcmU6c3RhcnQgKi9cbihmdW5jdGlvbigpIHtcbiAgdmFyIFdlYlNvY2tldCA9IHdpbmRvdy5XZWJTb2NrZXQgfHwgd2luZG93Lk1veldlYlNvY2tldDtcbiAgdmFyIGJyID0gd2luZG93LmJydW5jaCA9ICh3aW5kb3cuYnJ1bmNoIHx8IHt9KTtcbiAgdmFyIGFyID0gYnJbJ2F1dG8tcmVsb2FkJ10gPSAoYnJbJ2F1dG8tcmVsb2FkJ10gfHwge30pO1xuICBpZiAoIVdlYlNvY2tldCB8fCBhci5kaXNhYmxlZCkgcmV0dXJuO1xuICBpZiAod2luZG93Ll9hcikgcmV0dXJuO1xuICB3aW5kb3cuX2FyID0gdHJ1ZTtcblxuICB2YXIgY2FjaGVCdXN0ZXIgPSBmdW5jdGlvbih1cmwpe1xuICAgIHZhciBkYXRlID0gTWF0aC5yb3VuZChEYXRlLm5vdygpIC8gMTAwMCkudG9TdHJpbmcoKTtcbiAgICB1cmwgPSB1cmwucmVwbGFjZSgvKFxcJnxcXFxcPyljYWNoZUJ1c3Rlcj1cXGQqLywgJycpO1xuICAgIHJldHVybiB1cmwgKyAodXJsLmluZGV4T2YoJz8nKSA+PSAwID8gJyYnIDogJz8nKSArJ2NhY2hlQnVzdGVyPScgKyBkYXRlO1xuICB9O1xuXG4gIHZhciBicm93c2VyID0gbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpO1xuICB2YXIgZm9yY2VSZXBhaW50ID0gYXIuZm9yY2VSZXBhaW50IHx8IGJyb3dzZXIuaW5kZXhPZignY2hyb21lJykgPiAtMTtcblxuICB2YXIgcmVsb2FkZXJzID0ge1xuICAgIHBhZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgIH0sXG5cbiAgICBzdHlsZXNoZWV0OiBmdW5jdGlvbigpe1xuICAgICAgW10uc2xpY2VcbiAgICAgICAgLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnbGlua1tyZWw9c3R5bGVzaGVldF0nKSlcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgICAgdmFyIHZhbCA9IGxpbmsuZ2V0QXR0cmlidXRlKCdkYXRhLWF1dG9yZWxvYWQnKTtcbiAgICAgICAgICByZXR1cm4gbGluay5ocmVmICYmIHZhbCAhPSAnZmFsc2UnO1xuICAgICAgICB9KVxuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgICAgbGluay5ocmVmID0gY2FjaGVCdXN0ZXIobGluay5ocmVmKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIC8vIEhhY2sgdG8gZm9yY2UgcGFnZSByZXBhaW50IGFmdGVyIDI1bXMuXG4gICAgICBpZiAoZm9yY2VSZXBhaW50KSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBkb2N1bWVudC5ib2R5Lm9mZnNldEhlaWdodDsgfSwgMjUpO1xuICAgIH0sXG5cbiAgICBqYXZhc2NyaXB0OiBmdW5jdGlvbigpe1xuICAgICAgdmFyIHNjcmlwdHMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdCcpKTtcbiAgICAgIHZhciB0ZXh0U2NyaXB0cyA9IHNjcmlwdHMubWFwKGZ1bmN0aW9uKHNjcmlwdCkgeyByZXR1cm4gc2NyaXB0LnRleHQgfSkuZmlsdGVyKGZ1bmN0aW9uKHRleHQpIHsgcmV0dXJuIHRleHQubGVuZ3RoID4gMCB9KTtcbiAgICAgIHZhciBzcmNTY3JpcHRzID0gc2NyaXB0cy5maWx0ZXIoZnVuY3Rpb24oc2NyaXB0KSB7IHJldHVybiBzY3JpcHQuc3JjIH0pO1xuXG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciBhbGwgPSBzcmNTY3JpcHRzLmxlbmd0aDtcbiAgICAgIHZhciBvbkxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9hZGVkID0gbG9hZGVkICsgMTtcbiAgICAgICAgaWYgKGxvYWRlZCA9PT0gYWxsKSB7XG4gICAgICAgICAgdGV4dFNjcmlwdHMuZm9yRWFjaChmdW5jdGlvbihzY3JpcHQpIHsgZXZhbChzY3JpcHQpOyB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzcmNTY3JpcHRzXG4gICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKHNjcmlwdCkge1xuICAgICAgICAgIHZhciBzcmMgPSBzY3JpcHQuc3JjO1xuICAgICAgICAgIHNjcmlwdC5yZW1vdmUoKTtcbiAgICAgICAgICB2YXIgbmV3U2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgICAgICAgbmV3U2NyaXB0LnNyYyA9IGNhY2hlQnVzdGVyKHNyYyk7XG4gICAgICAgICAgbmV3U2NyaXB0LmFzeW5jID0gdHJ1ZTtcbiAgICAgICAgICBuZXdTY3JpcHQub25sb2FkID0gb25Mb2FkO1xuICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQobmV3U2NyaXB0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9O1xuICB2YXIgcG9ydCA9IGFyLnBvcnQgfHwgOTQ4NTtcbiAgdmFyIGhvc3QgPSBici5zZXJ2ZXIgfHwgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lIHx8ICdsb2NhbGhvc3QnO1xuXG4gIHZhciBjb25uZWN0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyBXZWJTb2NrZXQoJ3dzOi8vJyArIGhvc3QgKyAnOicgKyBwb3J0KTtcbiAgICBjb25uZWN0aW9uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgIGlmIChhci5kaXNhYmxlZCkgcmV0dXJuO1xuICAgICAgdmFyIG1lc3NhZ2UgPSBldmVudC5kYXRhO1xuICAgICAgdmFyIHJlbG9hZGVyID0gcmVsb2FkZXJzW21lc3NhZ2VdIHx8IHJlbG9hZGVycy5wYWdlO1xuICAgICAgcmVsb2FkZXIoKTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoY29ubmVjdGlvbi5yZWFkeVN0YXRlKSBjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uY2xvc2UgPSBmdW5jdGlvbigpe1xuICAgICAgd2luZG93LnNldFRpbWVvdXQoY29ubmVjdCwgMTAwMCk7XG4gICAgfTtcbiAgfTtcbiAgY29ubmVjdCgpO1xufSkoKTtcbi8qIGpzaGludCBpZ25vcmU6ZW5kICovXG4iXX0=