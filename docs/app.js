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
Config.title = 'tigl';
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
var _SpriteBoard = require("../sprite/SpriteBoard");
var _Controller = require("../ui/Controller");
var _Camera = require("../sprite/Camera");
var _World = require("../world/World");
var _Session = require("../session/Session");
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
    _this.keyboard = Application.keyboard;
    _this.speed = 24;
    _this.maxSpeed = _this.speed;
    _this.args.controller = Application.onScreenJoyPad;
    _this.args.fps = 0;
    _this.args.sps = 0;
    _this.args.camX = 0;
    _this.args.camY = 0;
    _this.args.showEditor = false;
    _this.keyboard.listening = true;
    _this.keyboard.keys.bindTo('Home', function (v, k, t, d) {
      if (!_this.session || v < 0) return;
      if (v % 5 === 0) {
        _this.session.frameLock++;
        _this.args.frameLock = _this.session.frameLock;
      }
    });
    _this.keyboard.keys.bindTo('End', function (v, k, t, d) {
      if (!_this.session || v < 0) return;
      if (v % 5 === 0) {
        _this.session.frameLock--;
        if (_this.session.frameLock < 0) {
          _this.session.frameLock = 0;
        }
        _this.args.frameLock = _this.session.frameLock;
      }
    });
    _this.keyboard.keys.bindTo('PageUp', function (v, k, t, d) {
      if (!_this.session || v < 0) return;
      if (v % 5 === 0) {
        _this.session.simulationLock++;
      }
      _this.args.simulationLock = _this.session.simulationLock;
    });
    _this.keyboard.keys.bindTo('PageDown', function (v, k, t, d) {
      if (!_this.session || v < 0) return;
      if (v % 5 === 0) {
        _this.session.simulationLock--;
        if (_this.session.simulationLock < 0) {
          _this.session.simulationLock = 0;
        }
      }
      _this.args.simulationLock = _this.session.simulationLock;
    });
    _this.keyboard.keys.bindTo('=', function (v, k, t, d) {
      if (v > 0) {
        _this.zoom(1);
      }
    });
    _this.keyboard.keys.bindTo('+', function (v, k, t, d) {
      if (v > 0) {
        _this.zoom(1);
      }
    });
    _this.keyboard.keys.bindTo('-', function (v, k, t, d) {
      if (v > 0) {
        _this.zoom(-1);
      }
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
        world: new _World.World({
          src: './world.json'
        }),
        map: new _TileMap.TileMap({
          src: './map.json'
        })
      });
      this.spriteBoard = spriteBoard;
      this.session = new _Session.Session({
        spriteBoard: spriteBoard,
        keyboard: this.keyboard,
        onScreenJoyPad: this.args.controller
      });
      this.args.frameLock = this.session.frameLock;
      this.args.simulationLock = this.session.simulationLock;
      window.addEventListener('resize', function () {
        return _this2.resize();
      });
      var fThen = 0;
      var sThen = 0;
      var simulate = function simulate(now) {
        if (document.hidden) {
          return;
        }
        if (!_this2.session.simulate(now)) {
          return;
        }
        _this2.args.sps = (1000 / (now - sThen)).toFixed(3);
        sThen = now;
      };
      var _draw = function draw(now) {
        if (document.hidden) {
          window.requestAnimationFrame(_draw);
          return;
        }
        window.requestAnimationFrame(_draw);
        if (!_this2.session.draw(now)) {
          return;
        }
        _this2.args.fps = (1000 / (now - fThen)).toFixed(3);
        _this2.args.camX = Number(_Camera.Camera.x).toFixed(3);
        _this2.args.camY = Number(_Camera.Camera.y).toFixed(3);
        fThen = now;
        if (_this2.spriteBoard.following) {
          _this2.args.posX = Number(_this2.spriteBoard.following.sprite.x).toFixed(3);
          _this2.args.posY = Number(_this2.spriteBoard.following.sprite.y).toFixed(3);
        }
      };
      this.spriteBoard.gl2d.zoomLevel = document.body.clientHeight / 1024 * 4;
      this.resize();
      setInterval(function () {
        return simulate(performance.now());
      }, 0);
      _draw(performance.now());
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
      if (!this.session) {
        return;
      }
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
module.exports = "<canvas\n\tcv-ref = \"canvas:curvature/base/Tag\"\n\tcv-on  = \"wheel:scroll(event);\"\n></canvas>\n\n<div class = \"hud fps\">[[sps]] simulations/s / [[simulationLock]]\n[[fps]] frames/s      / [[frameLock]]\n\nRes [[rwidth]] x [[rheight]]\n    [[width]] x [[height]]\n\nCam [[camX]] x [[camY]]\nPos [[posX]] x [[posY]]\n\n𝚫 Sim:   Pg Up / Dn\n𝚫 Frame: Home / End\n𝚫 Scale: + / -\n</div>\n<div class = \"reticle\"></div>\n\n[[controller]]\n"
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

require.register("math/Geometry.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Geometry = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Geometry = exports.Geometry = /*#__PURE__*/function () {
  function Geometry() {
    _classCallCheck(this, Geometry);
  }
  return _createClass(Geometry, [{
    key: "lineIntersectsLine",
    value: function lineIntersectsLine(x1a, y1a, x2a, y2a, x1b, y1b, x2b, y2b) {
      var ax = x2a - x1a;
      var ay = y2a - y1a;
      var bx = x2b - x1b;
      var by = y2b - y1b;
      var crossProduct = ax * by - ay * bx;

      // Parallel Lines cannot intersect
      if (crossProduct === 0) {
        return false;
      }
      var cx = x1b - x1a;
      var cy = y1b - y1a;

      // Is our point within the bounds of line a?
      var d = (cx * ay - cy * ax) / crossProduct;
      if (d < 0 || d > 1) {
        return false;
      }

      // Is our point within the bounds of line b?
      var e = (cx * by - cy * bx) / crossProduct;
      if (e < 0 || e > 1) {
        return false;
      }
      return [x1a + e * ax, y1a + e * ay];
    }
  }]);
}();
});

;require.register("math/Matrix.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Matrix = void 0;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Matrix = exports.Matrix = /*#__PURE__*/function () {
  function Matrix() {
    _classCallCheck(this, Matrix);
  }
  return _createClass(Matrix, null, [{
    key: "identity",
    value: function identity() {
      return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }
  }, {
    key: "translate",
    value: function translate(dx, dy) {
      return [[1, 0, dx], [0, 1, dy], [0, 0, 1]];
    }
  }, {
    key: "scale",
    value: function scale(dx, dy) {
      return [[dx, 0, 0], [0, dy, 0], [0, 0, 1]];
    }
  }, {
    key: "rotate",
    value: function rotate(theta) {
      var s = Math.sin(theta);
      var c = Math.cos(theta);
      return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
    }
  }, {
    key: "shearX",
    value: function shearX(s) {
      return [[1, s, 0], [0, 1, 0], [0, 0, 1]];
    }
  }, {
    key: "shearY",
    value: function shearY(s) {
      return [[1, 0, 0], [s, 1, 0], [0, 0, 1]];
    }
  }, {
    key: "multiply",
    value: function multiply(matA, matB) {
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
    key: "composite",
    value: function composite() {
      var output = this.identity();
      for (var i = 0; i < arguments.length; i++) {
        output = this.multiply(output, i < 0 || arguments.length <= i ? undefined : arguments[i]);
      }
      return output;
    }
  }, {
    key: "transform",
    value: function transform(points, matrix) {
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
var _Bindable = require("curvature/base/Bindable");
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
  function Quadtree(x1, y1, x2, y2) {
    var _this;
    var minSize = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
    var parent = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
    _classCallCheck(this, Quadtree);
    _this = _callSuper(this, Quadtree, [x1, y1, x2, y2]);
    _this[_Bindable.Bindable.Prevent] = true;
    _this.items = new Set();
    _this.split = false;
    _this.minSize = minSize;
    _this.backMap = parent ? parent.backMap : new Map();
    _this.parent = parent;
    _this.ulCell = null;
    _this.urCell = null;
    _this.blCell = null;
    _this.brCell = null;
    return _this;
  }
  _inherits(Quadtree, _Rectangle);
  return _createClass(Quadtree, [{
    key: "add",
    value: function add(entity) {
      if (!this.contains(entity.x, entity.y)) {
        return;
      }
      var xSize = this.x2 - this.x1;
      var ySize = this.y2 - this.y1;
      if (this.split || this.items.size && xSize > this.minSize && ySize > this.minSize) {
        if (!this.split) {
          var xSizeHalf = 0.5 * xSize;
          var ySizeHalf = 0.5 * ySize;
          this.ulCell = new Quadtree(this.x1, this.y1, this.x1 + xSizeHalf, this.y1 + ySizeHalf, this.minSize, this);
          this.blCell = new Quadtree(this.x1, this.y1 + ySizeHalf, this.x1 + xSizeHalf, this.y2, this.minSize, this);
          this.urCell = new Quadtree(this.x1 + xSizeHalf, this.y1, this.x2, this.y1 + ySizeHalf, this.minSize, this);
          this.brCell = new Quadtree(this.x1 + xSizeHalf, this.y1 + ySizeHalf, this.x2, this.y2, this.minSize, this);
          var _iterator = _createForOfIteratorHelper(this.items),
            _step;
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var item = _step.value;
              this.items["delete"](item);
              this.ulCell.add(item);
              this.urCell.add(item);
              this.blCell.add(item);
              this.brCell.add(item);
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
          this.split = true;
        }
        this.ulCell.add(entity);
        this.urCell.add(entity);
        this.blCell.add(entity);
        this.brCell.add(entity);
      } else if (this.split) {
        this.ulCell.add(entity);
        this.urCell.add(entity);
        this.blCell.add(entity);
        this.brCell.add(entity);
      } else {
        this.backMap.set(entity, this);
        this.items.add(entity);
      }
    }
  }, {
    key: "move",
    value: function move(entity) {
      if (!this.backMap.has(entity)) {
        // console.warn('Entity not in Quadtree.');
        this.add(entity);
        return;
      }
      var startCell = this.backMap.get(entity);
      var cell = startCell;
      while (cell && !cell.contains(entity.x, entity.y)) {
        cell = cell.parent;
      }
      if (!cell) {
        // console.warn('No QuadTree cell found!');
        startCell["delete"](entity);
        return;
      }
      if (cell !== startCell) {
        startCell["delete"](entity);
        cell.add(entity);
      }
    }
  }, {
    key: "delete",
    value: function _delete(entity) {
      if (!this.backMap.has(entity)) {
        console.warn('Entity not in Quadtree.');
        return;
      }
      var cell = this.backMap.get(entity);
      this.backMap["delete"](entity);
      cell.items["delete"](entity);
      if (cell.parent) {
        cell.parent.prune();
      }
    }
  }, {
    key: "isPrunable",
    value: function isPrunable() {
      return !this.ulCell.split && this.ulCell.items.size === 0 && !this.urCell.split && this.urCell.items.size === 0 && !this.blCell.split && this.blCell.items.size === 0 && !this.brCell.split && this.brCell.items.size === 0;
    }
  }, {
    key: "prune",
    value: function prune() {
      if (!this.isPrunable()) {
        return;
      }
      this.split = false;
      this.ulCell = null;
      this.urCell = null;
      this.blCell = null;
      this.brCell = null;
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
      if (x <= this.x1 || x >= this.x2) {
        return false;
      }
      if (y <= this.y1 || y >= this.y2) {
        return false;
      }
      return true;
    }
  }, {
    key: "isOverlapping",
    value: function isOverlapping(other) {
      if (this.x1 >= other.x2 || this.x2 <= other.x1) {
        return false;
      }
      if (this.y1 >= other.y2 || this.y2 <= other.y1) {
        return false;
      }
      return true;
    }
  }, {
    key: "isFlushWith",
    value: function isFlushWith(other) {
      if (this.x1 > other.x2 || other.x1 > this.x2) {
        return false;
      }
      if (this.y1 > other.y2 || other.y1 > this.y2) {
        return false;
      }
      if (this.x1 === other.x2 || other.x1 === this.x2) {
        return true;
      }
      if (this.y1 === other.y2 || other.y1 === this.y2) {
        return true;
      }
    }
  }, {
    key: "intersection",
    value: function intersection(other) {
      if (!this.isOverlapping(other)) {
        return;
      }
      return new this.constructor(Math.max(this.x1, other.x1), Math.max(this.y1, other.y1), Math.min(this.x2, other.x2), Math.min(this.y2, other.y2));
    }
  }, {
    key: "isInside",
    value: function isInside(other) {
      return this.x1 >= other.x1 && this.y1 >= other.y1 && this.x2 <= other.x2 && this.y2 <= other.y2;
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

;require.register("math/SMTree.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SMTree = void 0;
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
    this.subTree = depth < 1 ? new SMTree(1 + depth) : null;
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
      Object.freeze(rectangle);
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
var isRectangle = function isRectangle(object) {
  return 'x1' in object && 'y1' in object && 'x2' in object && 'y2' in object;
};
var SMTree = exports.SMTree = /*#__PURE__*/function () {
  function SMTree() {
    var depth = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    _classCallCheck(this, SMTree);
    this.depth = depth;
    this.segments = [new Segment(-Infinity, Infinity, null, this.depth)];
  }
  return _createClass(SMTree, [{
    key: "add",
    value: function add(rectangle) {
      if (!isRectangle(rectangle)) {
        throw new Error('Object supplied is not a Rectangle. Must have properties: x1, y1, x2, y1.');
      }
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
      if (!isRectangle(rectangle)) {
        throw new Error('Object supplied is not a Rectangle. Must have properties: x1, y1, x2, y1.');
      }
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
      var results = new Set();
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
              var result = _step2.value;
              results.add(result);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      }
      return results;
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
        if (segment.start < at && segment.end >= at) {
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
var _Bindable = require("curvature/base/Bindable");
var _Rectangle = require("../math/Rectangle");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Entity = exports.Entity = /*#__PURE__*/function () {
  function Entity(_ref) {
    var controller = _ref.controller,
      sprite = _ref.sprite,
      _ref$x = _ref.x,
      x = _ref$x === void 0 ? 0 : _ref$x,
      _ref$y = _ref.y,
      y = _ref$y === void 0 ? 0 : _ref$y,
      _ref$width = _ref.width,
      width = _ref$width === void 0 ? 32 : _ref$width,
      _ref$height = _ref.height,
      height = _ref$height === void 0 ? 32 : _ref$height;
    _classCallCheck(this, Entity);
    this[_Bindable.Bindable.Prevent] = true;
    this.controller = controller;
    this.sprite = sprite;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.rect = new _Rectangle.Rectangle(x - width * 0.5, y - height, x + width * 0.5, y);
  }
  return _createClass(Entity, [{
    key: "create",
    value: function create() {}
  }, {
    key: "simulate",
    value: function simulate() {
      this.rect.x1 = this.x - this.width * 0.5;
      this.rect.x2 = this.x + this.width * 0.5;
      this.rect.y1 = this.y - this.height;
      this.rect.y2 = this.y;
      this.sprite.x = this.x;
      this.sprite.y = this.y;
    }
  }, {
    key: "destroy",
    value: function destroy() {}
  }]);
}();
});

;require.register("model/Player.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Player = void 0;
var _Entity2 = require("./Entity");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _superPropGet(t, o, e, r) { var p = _get(_getPrototypeOf(1 & r ? t.prototype : t), o, e); return 2 & r && "function" == typeof p ? function (t) { return p.apply(e, t); } : p; }
function _get() { return _get = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function (e, t, r) { var p = _superPropBase(e, t); if (p) { var n = Object.getOwnPropertyDescriptor(p, t); return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value; } }, _get.apply(null, arguments); }
function _superPropBase(t, o) { for (; !{}.hasOwnProperty.call(t, o) && null !== (t = _getPrototypeOf(t));); return t; }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var fireRegion = [1, 0, 0];
var waterRegion = [0, 1, 1];
var Player = exports.Player = /*#__PURE__*/function (_Entity) {
  function Player(entityData) {
    var _this;
    _classCallCheck(this, Player);
    _this = _callSuper(this, Player, [entityData]);
    _this.direction = 'south';
    _this.state = 'standing';
    return _this;
  }
  _inherits(Player, _Entity);
  return _createClass(Player, [{
    key: "simulate",
    value: function simulate() {
      var speed = 4;
      var xAxis = Math.min(1, Math.max(this.controller.axis[0] || 0, -1)) || 0;
      var yAxis = Math.min(1, Math.max(this.controller.axis[1] || 0, -1)) || 0;
      this.x += Math.abs(xAxis) * Math.sign(xAxis) * speed;
      this.y += Math.abs(yAxis) * Math.sign(yAxis) * speed;
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
      this.sprite.changeAnimation("".concat(this.state, "-").concat(this.direction));
      if (Math.trunc(performance.now() / 1000) % 15 === 0) {
        this.sprite.region = null;
      }
      if (Math.trunc(performance.now() / 1000) % 15 === 5) {
        this.sprite.region = waterRegion;
      }
      if (Math.trunc(performance.now() / 1000) % 15 === 10) {
        this.sprite.region = fireRegion;
      }
      for (var t in this.controller.triggers) {
        if (!this.controller.triggers[t]) {
          continue;
        }
        this.sprite.spriteBoard.renderMode = t;
        if (t === '9') {
          var maps = this.sprite.spriteBoard.world.getMapsForPoint(this.sprite.x, this.sprite.y);
          maps.forEach(function (m) {
            return console.log(m.src);
          });
        }
      }
      _superPropGet(Player, "simulate", this, 3)([]);
    }
  }]);
}(_Entity2.Entity);
});

;require.register("model/Pushable.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Pushable = void 0;
var _Entity2 = require("./Entity");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _superPropGet(t, o, e, r) { var p = _get(_getPrototypeOf(1 & r ? t.prototype : t), o, e); return 2 & r && "function" == typeof p ? function (t) { return p.apply(e, t); } : p; }
function _get() { return _get = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function (e, t, r) { var p = _superPropBase(e, t); if (p) { var n = Object.getOwnPropertyDescriptor(p, t); return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value; } }, _get.apply(null, arguments); }
function _superPropBase(t, o) { for (; !{}.hasOwnProperty.call(t, o) && null !== (t = _getPrototypeOf(t));); return t; }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var fireRegion = [1, 0, 0];
var waterRegion = [0, 1, 1];
var Pushable = exports.Pushable = /*#__PURE__*/function (_Entity) {
  function Pushable() {
    _classCallCheck(this, Pushable);
    return _callSuper(this, Pushable, arguments);
  }
  _inherits(Pushable, _Entity);
  return _createClass(Pushable, [{
    key: "simulate",
    value: function simulate() {
      _superPropGet(Pushable, "simulate", this, 3)([]);
    }
  }]);
}(_Entity2.Entity);
});

;require.register("overlay/overlay.frag", function(exports, require, module) {
module.exports = "precision mediump float;\n\nuniform vec4 u_color;\nvarying vec2 v_texCoord;\n\nvoid main() {\n  // gl_FragColor = texture2D(u_image, v_texCoord);\n  gl_FragColor = vec4(1.0, 1.0, 0.0, 0.25);\n}\n"
});

;require.register("overlay/overlay.vert", function(exports, require, module) {
module.exports = "attribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform vec2 u_resolution;\nvarying vec2 v_texCoord;\n\nvoid main()\n{\n  vec2 zeroToOne = a_position / u_resolution;\n  vec2 zeroToTwo = zeroToOne * 2.0;\n  vec2 clipSpace = zeroToTwo - 1.0;\n\n  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n  v_texCoord  = a_texCoord;\n}\n"
});

;require.register("session/Session.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Session = void 0;
var _Bag = require("curvature/base/Bag");
var _Camera = require("../sprite/Camera");
var _Controller = require("../model/Controller");
var _Sprite = require("../sprite/Sprite");
var _Quadtree = require("../math/Quadtree");
var _SpriteSheet = require("../sprite/SpriteSheet");
var _Player = require("../model/Player");
var _Pushable = require("../model/Pushable");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Session = exports.Session = /*#__PURE__*/function () {
  function Session(_ref) {
    var spriteBoard = _ref.spriteBoard,
      keyboard = _ref.keyboard,
      onScreenJoyPad = _ref.onScreenJoyPad;
    _classCallCheck(this, Session);
    this.fThen = 0;
    this.sThen = 0;
    this.frameLock = 60;
    this.simulationLock = 60;
    this.entities = new _Bag.Bag();
    this.quadTree = new _Quadtree.Quadtree(0, 0, 10000, 10000);
    this.keyboard = keyboard;
    var player = this.player = new _Player.Player({
      x: 48,
      y: 64,
      sprite: new _Sprite.Sprite({
        // src: undefined,
        spriteSet: new _SpriteSheet.SpriteSheet({
          source: './player.tsj'
        }),
        spriteBoard: spriteBoard,
        width: 32,
        height: 48
      }),
      controller: new _Controller.Controller({
        keyboard: keyboard,
        onScreenJoyPad: onScreenJoyPad
      }),
      camera: _Camera.Camera
    });
    this.spriteBoard = spriteBoard;
    this.spriteBoard.following = player;
    this.entities.add(player);
    this.quadTree.add(player);
    this.spriteBoard.sprites.add(player.sprite);
    var w = 1280;
    for (var i in Array(2).fill()) {
      var barrel = new _Pushable.Pushable({
        sprite: new _Sprite.Sprite({
          spriteBoard: this.spriteBoard,
          src: './barrel.png'
        })
      });
      barrel.x = 32 + i * 64 % w - 16;
      barrel.y = Math.trunc(i * 32 / w) * 32 + 32;
      this.entities.add(barrel);
      this.quadTree.add(barrel);
      this.spriteBoard.sprites.add(barrel.sprite);
    }
  }
  return _createClass(Session, [{
    key: "simulate",
    value: function simulate(now) {
      var _this = this;
      var delta = now - this.sThen;
      if (this.simulationLock == 0) {
        return false;
      }
      if (delta < 1000 / this.simulationLock) {
        return false;
      }
      this.sThen = now;
      this.keyboard.update();
      var player = this.player;
      Object.values(this.entities.items()).forEach(function (entity) {
        entity.simulate(delta);
        _this.quadTree.move(entity);
        entity.sprite.visible = false;
      });
      var nearBy = this.quadTree.select(player.x - 50, player.y - 50, player.x + 50, player.y + 50);
      nearBy.forEach(function (e) {
        return e.sprite.visible = true;
      });
      return true;
    }
  }, {
    key: "draw",
    value: function draw(now) {
      var delta = now - this.fThen;
      if (this.frameLock == 0) {
        return false;
      }
      if (0.2 + delta < 1000 / this.frameLock) {
        return false;
      }
      this.spriteBoard.draw(delta);
      this.fThen = now;
      return true;
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

;require.register("sprite/MapRenderer.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MapRenderer = void 0;
var _Bindable = require("curvature/base/Bindable");
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
var _Matrix = require("../math/Matrix");
var _SpriteSheet = require("./SpriteSheet");
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
var Sprite = exports.Sprite = /*#__PURE__*/function () {
  function Sprite(_ref) {
    var _this = this;
    var src = _ref.src,
      spriteBoard = _ref.spriteBoard,
      spriteSet = _ref.spriteSet,
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
    this.currentAnimation = null;
    this.width = 32 || width;
    this.height = 32 || height;
    this.scale = 1;
    this.visible = false;
    this.textures = [];
    this.frames = [];
    this.currentDelay = 0;
    this.currentFrame = 0;
    this.currentFrames = '';
    this.speed = 0;
    this.maxSpeed = 4;
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
    this.spriteBoard = spriteBoard;
    var gl = this.spriteBoard.gl2d.context;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var r = function r() {
      return parseInt(Math.random() * 255);
    };
    var pixel = new Uint8Array([r(), r(), r(), 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    if (src && !spriteSet) {
      spriteSet = new _SpriteSheet.SpriteSheet({
        image: src
      });
      console.log(spriteSet);
    }
    this.spriteSet = spriteSet;
    if (spriteSet) {
      spriteSet.ready.then(function () {
        console.log(spriteSet);
        _this.width = spriteSet.tileWidth;
        _this.height = spriteSet.tileHeight;
        _this.texture = _this.createTexture(spriteSet.getFrame(0));
        for (var i = 0; i < spriteSet.tileCount; i++) {
          _this.textures[i] = _this.createTexture(spriteSet.getFrame(i));
        }
        _this.changeAnimation('default');
      });
    }
  }
  return _createClass(Sprite, [{
    key: "draw",
    value: function draw(delta) {
      var _this$spriteBoard$dra;
      if (this.currentDelay > 0) {
        this.currentDelay -= delta;
      } else {
        this.currentFrame++;
        if (this.spriteSet && this.spriteSet.animations[this.currentAnimation]) {
          var animation = this.spriteSet.animations[this.currentAnimation];
          if (this.currentFrame >= animation.length) {
            this.currentFrame = this.currentFrame % animation.length;
          }
          var textureId = animation[this.currentFrame].tileid;
          var texture = this.textures[textureId];
          if (texture) {
            this.currentDelay = animation[this.currentFrame].duration;
            this.texture = texture;
          }
        }
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
    key: "changeAnimation",
    value: function changeAnimation(name) {
      if (!this.spriteSet || !this.spriteSet.animations[name]) {
        console.warn("Animation ".concat(name, " not found."));
        return;
      }
      if (this.currentAnimation !== name) {
        this.currentAnimation = name;
        this.currentDelay = 0;
      }
    }
  }, {
    key: "createTexture",
    value: function createTexture(pixels) {
      var gl = this.spriteBoard.gl2d.context;
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return texture;
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
      var t = _Matrix.Matrix.transform(points, _Matrix.Matrix.composite(_Matrix.Matrix.translate(xOff, yOff)
      // , Matrix.scale(Math.sin(theta), Math.cos(theta))
      // , Matrix.rotate(theta)
      , _Matrix.Matrix.translate(-xOff, -yOff)));
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
      gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
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
var _MapRenderer = require("./MapRenderer");
var _Parallax = require("./Parallax");
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
    this.map = map;
    this.maps = [];
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
    this.mapRenderers = new Map();
    this.parallax = new _Parallax.Parallax({
      spriteBoard: this,
      map: map
    });
    this.following = null;
  }
  return _createClass(SpriteBoard, [{
    key: "draw",
    value: function draw(delta) {
      var _this2 = this;
      if (this.following) {
        _Camera.Camera.x = (16 + this.following.sprite.x) * this.gl2d.zoomLevel || 0;
        _Camera.Camera.y = (16 + this.following.sprite.y) * this.gl2d.zoomLevel || 0;
      }
      var visibleMaps = this.world.getMapsForRect(this.following.sprite.x, this.following.sprite.y, 64 //Camera.width * 0.125
      , 64 //Camera.height * 0.125
      );
      var mapRenderers = new Set();
      visibleMaps.forEach(function (map) {
        if (_this2.mapRenderers.has(map)) {
          mapRenderers.add(_this2.mapRenderers.get(map));
          return;
        }
        var renderer = new _MapRenderer.MapRenderer({
          spriteBoard: _this2,
          map: map
        });
        mapRenderers.add(renderer);
        renderer.resize(_Camera.Camera.width, _Camera.Camera.height);
        _this2.mapRenderers.set(map, renderer);
      });
      new Set(this.mapRenderers.keys()).difference(visibleMaps).forEach(function (m) {
        return _this2.mapRenderers["delete"](m);
      });
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
      this.mapRenderers.values().forEach(function (mr) {
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
        return s.visible && s.draw(delta);
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
      this.mapRenderers.values().forEach(function (mr) {
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
  }]);
}();
});

;require.register("sprite/SpriteSheet.js", function(exports, require, module) {
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SpriteSheet = void 0;
var _Tileset2 = require("./Tileset");
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
var SpriteSheet = exports.SpriteSheet = /*#__PURE__*/function (_Tileset) {
  function SpriteSheet(tilesetData) {
    var _this;
    _classCallCheck(this, SpriteSheet);
    _this = _callSuper(this, SpriteSheet, [tilesetData]);
    _this.frames = [];
    _this.animations = {
      "default": [{
        tileid: 0,
        duration: Infinity
      }]
    };
    _this.canvas = document.createElement('canvas');
    _this.context = _this.canvas.getContext("2d", {
      willReadFrequently: true
    });
    _this.ready = _this.ready.then(function () {
      _this.processImage();
      var _iterator = _createForOfIteratorHelper(_this.tiles),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var tile = _step.value;
          if (tile.animation) {
            _this.animations[tile.type] = tile.animation;
          } else if (tile.type) {
            _this.animations[tile.type] = [{
              duration: Infinity,
              tileid: tile.id
            }];
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    });
    return _this;
  }
  _inherits(SpriteSheet, _Tileset);
  return _createClass(SpriteSheet, [{
    key: "processImage",
    value: function processImage() {
      this.canvas.width = this.image.width;
      this.canvas.height = this.image.height;
      this.context.drawImage(this.image, 0, 0);
      for (var i = 0; i < this.tileCount; i++) {
        this.frames[i] = this.getFrame(i);
      }
    }
  }, {
    key: "getFrame",
    value: function getFrame(frameId) {
      frameId = frameId % this.tileCount;
      var i = frameId % this.columns;
      var j = Math.floor(frameId / this.columns);
      return this.context.getImageData(i * this.tileWidth, j * this.tileHeight, this.tileWidth, this.tileHeight).data;
    }
  }]);
}(_Tileset2.Tileset);
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
    this.firstGid = firstgid !== null && firstgid !== void 0 ? firstgid : 0;
    this.tileCount = tilecount !== null && tilecount !== void 0 ? tilecount : 0;
    this.tileHeight = tileheight !== null && tileheight !== void 0 ? tileheight : 0;
    this.tileWidth = tilewidth !== null && tilewidth !== void 0 ? tilewidth : 0;
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
              this.columns = columns !== null && columns !== void 0 ? columns : 1;
              this.margin = margin !== null && margin !== void 0 ? margin : 0;
              this.name = name !== null && name !== void 0 ? name : image;
              this.spacing = spacing !== null && spacing !== void 0 ? spacing : 0;
              this.tiles = tiles !== null && tiles !== void 0 ? tiles : [];
              this.tileCount = tilecount !== null && tilecount !== void 0 ? tilecount : 1;
              this.image = new Image();
              this.image.src = image;
              _context.next = 30;
              return new Promise(function (accept) {
                return _this.image.onload = function () {
                  return accept();
                };
              });
            case 30:
              this.imageWidth = imagewidth !== null && imagewidth !== void 0 ? imagewidth : this.image.width;
              this.imageHeight = imageheight !== null && imageheight !== void 0 ? imageheight : this.image.height;
              this.tileWidth = tilewidth !== null && tilewidth !== void 0 ? tilewidth : this.imageWidth;
              this.tileHeight = tileheight !== null && tileheight !== void 0 ? tileheight : this.imageHeight;
              this.rows = Math.ceil(imageheight / tileheight) || 1;
            case 35:
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

;require.register("ui/controller.tmp.html", function(exports, require, module) {
module.exports = "<div class = \"controller\">\n\t<div class = \"joystick\" cv-on = \"\n\t\ttouchstart:dragStick(event);\n\t\tmousedown:dragStick(event);\n\t\">\n\t\t<div class = \"pad\" style = \"position: relative; transform:translate([[x]]px,[[y]]px);\"></div>\n\t</div>\n\n\t<div class = \"button\">A</div>\n\t<div class = \"button\">B</div>\n\t<div class = \"button\">C</div>\n</div>"
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
var _SMTree = require("../math/SMTree");
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
    this.mTree = new _SMTree.SMTree();
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
  }, {
    key: "getMapsForRect",
    value: function getMapsForRect(x, y, w, h) {
      var rects = this.mTree.query(x + -w * 0.5, y + -h * 0.5, x + w * 0.5, y + h * 0.5);
      var maps = new Set();
      window.smProfiling && console.time('query mapTree');
      var _iterator2 = _createForOfIteratorHelper(rects),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var rect = _step2.value;
          var map = this.rectMap.get(rect);
          maps.add(map);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      window.smProfiling && console.timeEnd('query mapTree');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9CYWcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL0RvbS5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9NaXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1RhZy5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9VdWlkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzIiwiYXBwL0NvbmZpZy5qcyIsImFwcC9nbDJkL0dsMmQuanMiLCJhcHAvaG9tZS9WaWV3LmpzIiwiYXBwL2hvbWUvdmlldy50bXAuaHRtbCIsImFwcC9pbml0aWFsaXplLmpzIiwiYXBwL2luamVjdC9Db250YWluZXIuanMiLCJhcHAvaW5qZWN0L0luamVjdGFibGUuanMiLCJhcHAvaW5qZWN0L1NpbmdsZS5qcyIsImFwcC9tYXRoL0dlb21ldHJ5LmpzIiwiYXBwL21hdGgvTWF0cml4LmpzIiwiYXBwL21hdGgvUXVhZHRyZWUuanMiLCJhcHAvbWF0aC9SZWN0YW5nbGUuanMiLCJhcHAvbWF0aC9TTVRyZWUuanMiLCJhcHAvbWF0aC9TcGxpdC5qcyIsImFwcC9tb2RlbC9Db250cm9sbGVyLmpzIiwiYXBwL21vZGVsL0VudGl0eS5qcyIsImFwcC9tb2RlbC9QbGF5ZXIuanMiLCJhcHAvbW9kZWwvUHVzaGFibGUuanMiLCJhcHAvb3ZlcmxheS9vdmVybGF5LmZyYWciLCJhcHAvb3ZlcmxheS9vdmVybGF5LnZlcnQiLCJhcHAvc2Vzc2lvbi9TZXNzaW9uLmpzIiwiYXBwL3Nwcml0ZS9DYW1lcmEuanMiLCJhcHAvc3ByaXRlL01hcFJlbmRlcmVyLmpzIiwiYXBwL3Nwcml0ZS9QYXJhbGxheC5qcyIsImFwcC9zcHJpdGUvU3ByaXRlLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGVCb2FyZC5qcyIsImFwcC9zcHJpdGUvU3ByaXRlU2hlZXQuanMiLCJhcHAvc3ByaXRlL1RleHR1cmVCYW5rLmpzIiwiYXBwL3Nwcml0ZS9UaWxlc2V0LmpzIiwiYXBwL3Nwcml0ZS90ZXh0dXJlLmZyYWciLCJhcHAvc3ByaXRlL3RleHR1cmUudmVydCIsImFwcC91aS9Db250cm9sbGVyLmpzIiwiYXBwL3VpL2NvbnRyb2xsZXIudG1wLmh0bWwiLCJhcHAvd29ybGQvRmxvb3IuanMiLCJhcHAvd29ybGQvVGlsZU1hcC5qcyIsImFwcC93b3JsZC9Xb3JsZC5qcyIsIm5vZGVfbW9kdWxlcy9hdXRvLXJlbG9hZC1icnVuY2gvdmVuZG9yL2F1dG8tcmVsb2FkLmpzIl0sIm5hbWVzIjpbIkNvbmZpZyIsImV4cG9ydHMiLCJfY3JlYXRlQ2xhc3MiLCJfY2xhc3NDYWxsQ2hlY2siLCJ0aXRsZSIsIlByb2dyYW0iLCJfcmVmIiwiZ2wiLCJ2ZXJ0ZXhTaGFkZXIiLCJmcmFnbWVudFNoYWRlciIsInVuaWZvcm1zIiwiYXR0cmlidXRlcyIsIl9kZWZpbmVQcm9wZXJ0eSIsImNvbnRleHQiLCJwcm9ncmFtIiwiY3JlYXRlUHJvZ3JhbSIsImF0dGFjaFNoYWRlciIsImxpbmtQcm9ncmFtIiwiZGV0YWNoU2hhZGVyIiwiZGVsZXRlU2hhZGVyIiwiZ2V0UHJvZ3JhbVBhcmFtZXRlciIsIkxJTktfU1RBVFVTIiwiY29uc29sZSIsImVycm9yIiwiZ2V0UHJvZ3JhbUluZm9Mb2ciLCJkZWxldGVQcm9ncmFtIiwiX2l0ZXJhdG9yIiwiX2NyZWF0ZUZvck9mSXRlcmF0b3JIZWxwZXIiLCJfc3RlcCIsInMiLCJuIiwiZG9uZSIsInVuaWZvcm0iLCJ2YWx1ZSIsImxvY2F0aW9uIiwiZ2V0VW5pZm9ybUxvY2F0aW9uIiwid2FybiIsImNvbmNhdCIsImVyciIsImUiLCJmIiwiX2l0ZXJhdG9yMiIsIl9zdGVwMiIsImF0dHJpYnV0ZSIsImdldEF0dHJpYkxvY2F0aW9uIiwiYnVmZmVyIiwiY3JlYXRlQnVmZmVyIiwiYmluZEJ1ZmZlciIsIkFSUkFZX0JVRkZFUiIsImVuYWJsZVZlcnRleEF0dHJpYkFycmF5IiwidmVydGV4QXR0cmliUG9pbnRlciIsIkZMT0FUIiwiYnVmZmVycyIsImtleSIsInVzZSIsInVzZVByb2dyYW0iLCJ1bmlmb3JtRiIsIm5hbWUiLCJfbGVuIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiZmxvYXRzIiwiQXJyYXkiLCJfa2V5IiwiYXBwbHkiLCJ1bmlmb3JtSSIsIl9sZW4yIiwiaW50cyIsIl9rZXkyIiwiR2wyZCIsImVsZW1lbnQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJnZXRDb250ZXh0Iiwic2NyZWVuU2NhbGUiLCJ6b29tTGV2ZWwiLCJjcmVhdGVTaGFkZXIiLCJleHRlbnNpb24iLCJzdWJzdHJpbmciLCJsYXN0SW5kZXhPZiIsInR5cGUiLCJ0b1VwcGVyQ2FzZSIsIlZFUlRFWF9TSEFERVIiLCJGUkFHTUVOVF9TSEFERVIiLCJzaGFkZXIiLCJzb3VyY2UiLCJyZXF1aXJlIiwic2hhZGVyU291cmNlIiwiY29tcGlsZVNoYWRlciIsInN1Y2Nlc3MiLCJnZXRTaGFkZXJQYXJhbWV0ZXIiLCJDT01QSUxFX1NUQVRVUyIsImdldFNoYWRlckluZm9Mb2ciLCJfcmVmMiIsImNyZWF0ZVRleHR1cmUiLCJ3aWR0aCIsImhlaWdodCIsInRleHR1cmUiLCJiaW5kVGV4dHVyZSIsIlRFWFRVUkVfMkQiLCJ0ZXhJbWFnZTJEIiwiUkdCQSIsIlVOU0lHTkVEX0JZVEUiLCJ0ZXhQYXJhbWV0ZXJpIiwiVEVYVFVSRV9XUkFQX1MiLCJDTEFNUF9UT19FREdFIiwiVEVYVFVSRV9XUkFQX1QiLCJURVhUVVJFX01JTl9GSUxURVIiLCJORUFSRVNUIiwiVEVYVFVSRV9NQUdfRklMVEVSIiwiY3JlYXRlRnJhbWVidWZmZXIiLCJmcmFtZWJ1ZmZlciIsImJpbmRGcmFtZWJ1ZmZlciIsIkZSQU1FQlVGRkVSIiwiZnJhbWVidWZmZXJUZXh0dXJlMkQiLCJDT0xPUl9BVFRBQ0hNRU5UMCIsImVuYWJsZUJsZW5kaW5nIiwiYmxlbmRGdW5jIiwiU1JDX0FMUEhBIiwiT05FX01JTlVTX1NSQ19BTFBIQSIsImVuYWJsZSIsIkJMRU5EIiwiX1ZpZXciLCJfS2V5Ym9hcmQiLCJfQmFnIiwiX0NvbmZpZyIsIl9UaWxlTWFwIiwiX1Nwcml0ZUJvYXJkIiwiX0NvbnRyb2xsZXIiLCJfQ2FtZXJhIiwiX1dvcmxkIiwiX1Nlc3Npb24iLCJhIiwiVHlwZUVycm9yIiwiX2RlZmluZVByb3BlcnRpZXMiLCJyIiwidCIsIm8iLCJlbnVtZXJhYmxlIiwiY29uZmlndXJhYmxlIiwid3JpdGFibGUiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsIl90b1Byb3BlcnR5S2V5IiwicHJvdG90eXBlIiwiaSIsIl90b1ByaW1pdGl2ZSIsIl90eXBlb2YiLCJTeW1ib2wiLCJ0b1ByaW1pdGl2ZSIsImNhbGwiLCJTdHJpbmciLCJOdW1iZXIiLCJfY2FsbFN1cGVyIiwiX2dldFByb3RvdHlwZU9mIiwiX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4iLCJfaXNOYXRpdmVSZWZsZWN0Q29uc3RydWN0IiwiUmVmbGVjdCIsImNvbnN0cnVjdCIsImNvbnN0cnVjdG9yIiwiX2Fzc2VydFRoaXNJbml0aWFsaXplZCIsIlJlZmVyZW5jZUVycm9yIiwiQm9vbGVhbiIsInZhbHVlT2YiLCJzZXRQcm90b3R5cGVPZiIsImdldFByb3RvdHlwZU9mIiwiYmluZCIsIl9fcHJvdG9fXyIsIl9pbmhlcml0cyIsImNyZWF0ZSIsIl9zZXRQcm90b3R5cGVPZiIsIkFwcGxpY2F0aW9uIiwib25TY3JlZW5Kb3lQYWQiLCJPblNjcmVlbkpveVBhZCIsImtleWJvYXJkIiwiS2V5Ym9hcmQiLCJnZXQiLCJWaWV3IiwiX0Jhc2VWaWV3IiwiYXJncyIsIl90aGlzIiwid2luZG93Iiwic21Qcm9maWxpbmciLCJ0ZW1wbGF0ZSIsInJvdXRlcyIsInNwZWVkIiwibWF4U3BlZWQiLCJjb250cm9sbGVyIiwiZnBzIiwic3BzIiwiY2FtWCIsImNhbVkiLCJzaG93RWRpdG9yIiwibGlzdGVuaW5nIiwia2V5cyIsImJpbmRUbyIsInYiLCJrIiwiZCIsInNlc3Npb24iLCJmcmFtZUxvY2siLCJzaW11bGF0aW9uTG9jayIsInpvb20iLCJvblJlbmRlcmVkIiwiX3RoaXMyIiwic3ByaXRlQm9hcmQiLCJTcHJpdGVCb2FyZCIsInRhZ3MiLCJjYW52YXMiLCJ3b3JsZCIsIldvcmxkIiwic3JjIiwibWFwIiwiVGlsZU1hcCIsIlNlc3Npb24iLCJhZGRFdmVudExpc3RlbmVyIiwicmVzaXplIiwiZlRoZW4iLCJzVGhlbiIsInNpbXVsYXRlIiwibm93IiwiaGlkZGVuIiwidG9GaXhlZCIsImRyYXciLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJDYW1lcmEiLCJ4IiwieSIsImZvbGxvd2luZyIsInBvc1giLCJzcHJpdGUiLCJwb3NZIiwiZ2wyZCIsImJvZHkiLCJjbGllbnRIZWlnaHQiLCJzZXRJbnRlcnZhbCIsInBlcmZvcm1hbmNlIiwiY2xpZW50V2lkdGgiLCJyd2lkdGgiLCJNYXRoIiwidHJ1bmMiLCJyaGVpZ2h0Iiwib2xkU2NhbGUiLCJzY3JvbGwiLCJldmVudCIsImRlbHRhIiwiZGVsdGFZIiwibWF4IiwibWluIiwic3RlcCIsImFicyIsIkJhc2VWaWV3IiwiX1JvdXRlciIsIlByb3h5IiwidW5kZWZpbmVkIiwidmlldyIsIlJvdXRlciIsImxpc3RlbiIsInJlbmRlciIsIl9JbmplY3RhYmxlMiIsIkNvbnRhaW5lciIsIl9JbmplY3RhYmxlIiwiaW5qZWN0IiwiaW5qZWN0aW9ucyIsImFzc2lnbiIsIkluamVjdGFibGUiLCJjbGFzc2VzIiwib2JqZWN0cyIsImluamVjdGlvbiIsInRlc3QiLCJpbnN0YW5jZSIsIkVycm9yIiwiZXhpc3RpbmdJbmplY3Rpb25zIiwiX2NsYXNzIiwiU2luZ2xlIiwicmFuZG9tIiwic2luZ2xlIiwiR2VvbWV0cnkiLCJsaW5lSW50ZXJzZWN0c0xpbmUiLCJ4MWEiLCJ5MWEiLCJ4MmEiLCJ5MmEiLCJ4MWIiLCJ5MWIiLCJ4MmIiLCJ5MmIiLCJheCIsImF5IiwiYngiLCJieSIsImNyb3NzUHJvZHVjdCIsImN4IiwiY3kiLCJNYXRyaXgiLCJpZGVudGl0eSIsInRyYW5zbGF0ZSIsImR4IiwiZHkiLCJzY2FsZSIsInJvdGF0ZSIsInRoZXRhIiwic2luIiwiYyIsImNvcyIsInNoZWFyWCIsInNoZWFyWSIsIm11bHRpcGx5IiwibWF0QSIsIm1hdEIiLCJvdXRwdXQiLCJmaWxsIiwiaiIsImNvbXBvc2l0ZSIsInRyYW5zZm9ybSIsInBvaW50cyIsIm1hdHJpeCIsInBvaW50Iiwicm93IiwicHVzaCIsIkZsb2F0MzJBcnJheSIsImZpbHRlciIsIl8iLCJfQmluZGFibGUiLCJfUmVjdGFuZ2xlMiIsIl90b0NvbnN1bWFibGVBcnJheSIsIl9hcnJheVdpdGhvdXRIb2xlcyIsIl9pdGVyYWJsZVRvQXJyYXkiLCJfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkiLCJfbm9uSXRlcmFibGVTcHJlYWQiLCJpdGVyYXRvciIsImZyb20iLCJpc0FycmF5IiwiX2FycmF5TGlrZVRvQXJyYXkiLCJfbiIsIkYiLCJ1IiwibmV4dCIsInRvU3RyaW5nIiwic2xpY2UiLCJRdWFkdHJlZSIsIl9SZWN0YW5nbGUiLCJ4MSIsInkxIiwieDIiLCJ5MiIsIm1pblNpemUiLCJwYXJlbnQiLCJCaW5kYWJsZSIsIlByZXZlbnQiLCJpdGVtcyIsIlNldCIsInNwbGl0IiwiYmFja01hcCIsIk1hcCIsInVsQ2VsbCIsInVyQ2VsbCIsImJsQ2VsbCIsImJyQ2VsbCIsImFkZCIsImVudGl0eSIsImNvbnRhaW5zIiwieFNpemUiLCJ5U2l6ZSIsInNpemUiLCJ4U2l6ZUhhbGYiLCJ5U2l6ZUhhbGYiLCJpdGVtIiwic2V0IiwibW92ZSIsImhhcyIsInN0YXJ0Q2VsbCIsImNlbGwiLCJkZWxldGUiLCJwcnVuZSIsImlzUHJ1bmFibGUiLCJmaW5kTGVhZiIsIl90aGlzJHVsQ2VsbCRmaW5kTGVhZiIsInNlbGVjdCIsInciLCJoIiwieE1heCIsInlNYXgiLCJkdW1wIiwiUmVjdGFuZ2xlIiwiaXNPdmVybGFwcGluZyIsIm90aGVyIiwiaXNGbHVzaFdpdGgiLCJpbnRlcnNlY3Rpb24iLCJpc0luc2lkZSIsImlzT3V0c2lkZSIsInRvVHJpYW5nbGVzIiwiZGltIiwiU2VnbWVudCIsInN0YXJ0IiwiZW5kIiwicHJldiIsImRlcHRoIiwicmVjdGFuZ2xlcyIsInN1YlRyZWUiLCJTTVRyZWUiLCJhdCIsIlJhbmdlRXJyb3IiLCJiIiwicmVjdGFuZ2xlIiwicmVjdE1pbiIsInJlY3RNYXgiLCJmcmVlemUiLCJlbXB0eSIsIkluZmluaXR5IiwiaXNSZWN0YW5nbGUiLCJvYmplY3QiLCJzZWdtZW50cyIsInN0YXJ0SW5kZXgiLCJmaW5kU2VnbWVudCIsInNwbGl0U2VnbWVudCIsImVuZEluZGV4Iiwic3BsaWNlIiwicXVlcnkiLCJyZXN1bHRzIiwieFN0YXJ0SW5kZXgiLCJ4RW5kSW5kZXgiLCJzZWdtZW50IiwieVN0YXJ0SW5kZXgiLCJ5RW5kSW5kZXgiLCJyZXN1bHQiLCJpbmRleCIsIl90aGlzJHNlZ21lbnRzIiwic3BsaXRTZWdtZW50cyIsImxvIiwiaGkiLCJjdXJyZW50IiwiZmxvb3IiLCJTcGxpdCIsImludFRvQnl0ZXMiLCJieXRlcyIsIl9TcGxpdCIsIlVpbnQ4Q2xhbXBlZEFycmF5IiwiVWludDE2QXJyYXkiLCJVaW50MzJBcnJheSIsIkNvbnRyb2xsZXIiLCJtYWtlQmluZGFibGUiLCJrZXlQcmVzcyIsImtleVJlbGVhc2UiLCJheGlzIiwidHJpZ2dlcnMiLCJFbnRpdHkiLCJfcmVmJHgiLCJfcmVmJHkiLCJfcmVmJHdpZHRoIiwiX3JlZiRoZWlnaHQiLCJyZWN0IiwiZGVzdHJveSIsIl9FbnRpdHkyIiwiX3N1cGVyUHJvcEdldCIsInAiLCJfZ2V0IiwiX3N1cGVyUHJvcEJhc2UiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJoYXNPd25Qcm9wZXJ0eSIsImZpcmVSZWdpb24iLCJ3YXRlclJlZ2lvbiIsIlBsYXllciIsIl9FbnRpdHkiLCJlbnRpdHlEYXRhIiwiZGlyZWN0aW9uIiwic3RhdGUiLCJ4QXhpcyIsInlBeGlzIiwic2lnbiIsImhvcml6b250YWwiLCJjaGFuZ2VBbmltYXRpb24iLCJyZWdpb24iLCJyZW5kZXJNb2RlIiwibWFwcyIsImdldE1hcHNGb3JQb2ludCIsImZvckVhY2giLCJtIiwibG9nIiwiUHVzaGFibGUiLCJfU3ByaXRlIiwiX1F1YWR0cmVlIiwiX1Nwcml0ZVNoZWV0IiwiX1BsYXllciIsIl9QdXNoYWJsZSIsImVudGl0aWVzIiwiQmFnIiwicXVhZFRyZWUiLCJwbGF5ZXIiLCJTcHJpdGUiLCJzcHJpdGVTZXQiLCJTcHJpdGVTaGVldCIsImNhbWVyYSIsInNwcml0ZXMiLCJiYXJyZWwiLCJ1cGRhdGUiLCJ2YWx1ZXMiLCJ2aXNpYmxlIiwibmVhckJ5IiwiTWFwUmVuZGVyZXIiLCJsb2FkZWQiLCJ0aWxlV2lkdGgiLCJ0aWxlSGVpZ2h0IiwieE9mZnNldCIsInlPZmZzZXQiLCJ0aWxlTWFwcGluZyIsInRpbGVUZXh0dXJlIiwicGFyc2VJbnQiLCJwaXhlbCIsIlVpbnQ4QXJyYXkiLCJyZWFkeSIsInRoZW4iLCJ0aWxlU2V0V2lkdGgiLCJ0aWxlU2V0SGVpZ2h0IiwicGl4ZWxzIiwibmVnU2FmZU1vZCIsImhhbGZUaWxlV2lkdGgiLCJoYWxmVGlsZUhlaWdodCIsInRpbGVzV2lkZSIsInRpbGVzSGlnaCIsInhUaWxlIiwieFdvcmxkIiwieVRpbGUiLCJ5V29ybGQiLCJ4UG9zIiwieVBvcyIsImRyYXdQcm9ncmFtIiwiYWN0aXZlVGV4dHVyZSIsIlRFWFRVUkUyIiwiVEVYVFVSRTMiLCJ0aWxlUGl4ZWxMYXllcnMiLCJnZXRTbGljZSIsInRpbGVQaXhlbHMiLCJzZXRSZWN0YW5nbGUiLCJkcmF3QnVmZmVyIiwiZHJhd0FycmF5cyIsIlRSSUFOR0xFUyIsIlRFWFRVUkUwIiwiY2VpbCIsImFfdGV4Q29vcmQiLCJidWZmZXJEYXRhIiwiU1RBVElDX0RSQVciLCJhX3Bvc2l0aW9uIiwiUGFyYWxsYXhMYXllciIsIlBhcmFsbGF4Iiwic2xpY2VzIiwicGFyYWxsYXhMYXllcnMiLCJ0ZXh0dXJlcyIsImFzc2VtYmxlIiwibG9hZFNsaWNlcyIsImltYWdlTGF5ZXJzIiwibGF5ZXJEYXRhIiwibG9hZEltYWdlIiwiaW1hZ2UiLCJfbGF5ZXJEYXRhJG9mZnNldHkiLCJfbGF5ZXJEYXRhJHBhcmFsbGF4eCIsImxheWVyIiwibGF5ZXJCb3R0b20iLCJvZmZzZXR5Iiwib2Zmc2V0IiwicGFyYWxsYXgiLCJwYXJhbGxheHgiLCJSRVBFQVQiLCJQcm9taXNlIiwiYWxsIiwicmF0aW8iLCJpbWFnZVByb21pc2VzIiwiYWNjZXB0IiwicmVqZWN0IiwiSW1hZ2UiLCJfTWF0cml4IiwieiIsImN1cnJlbnRBbmltYXRpb24iLCJmcmFtZXMiLCJjdXJyZW50RGVsYXkiLCJjdXJyZW50RnJhbWUiLCJjdXJyZW50RnJhbWVzIiwibW92aW5nIiwiUklHSFQiLCJET1dOIiwiTEVGVCIsIlVQIiwiRUFTVCIsIlNPVVRIIiwiV0VTVCIsIk5PUlRIIiwiZ2V0RnJhbWUiLCJ0aWxlQ291bnQiLCJfdGhpcyRzcHJpdGVCb2FyZCRkcmEiLCJhbmltYXRpb25zIiwiYW5pbWF0aW9uIiwidGV4dHVyZUlkIiwidGlsZWlkIiwiZHVyYXRpb24iLCJlZmZlY3RCdWZmZXIiLCJ4T2ZmIiwieU9mZiIsIl9HbDJkIiwiX01hcFJlbmRlcmVyIiwiX1BhcmFsbGF4IiwibW91c2UiLCJjbGlja1giLCJjbGlja1kiLCJjb2xvckxvY2F0aW9uIiwidV9jb2xvciIsInRpbGVQb3NMb2NhdGlvbiIsInVfdGlsZU5vIiwicmVnaW9uTG9jYXRpb24iLCJ1X3JlZ2lvbiIsImRyYXdMYXllciIsImVmZmVjdExheWVyIiwiY2xpZW50WCIsImNsaWVudFkiLCJtYXBSZW5kZXJlcnMiLCJ2aXNpYmxlTWFwcyIsImdldE1hcHNGb3JSZWN0IiwicmVuZGVyZXIiLCJkaWZmZXJlbmNlIiwidmlld3BvcnQiLCJjbGVhckNvbG9yIiwiY2xlYXIiLCJDT0xPUl9CVUZGRVJfQklUIiwiYmFja2dyb3VuZENvbG9yIiwiY29sb3IiLCJzdWJzdHIiLCJnIiwidGltZSIsInRpbWVFbmQiLCJtciIsInNvcnQiLCJURVhUVVJFMSIsIlRFWFRVUkU0IiwiU1RSRUFNX0RSQVciLCJfVGlsZXNldDIiLCJfVGlsZXNldCIsInRpbGVzZXREYXRhIiwid2lsbFJlYWRGcmVxdWVudGx5IiwicHJvY2Vzc0ltYWdlIiwidGlsZXMiLCJ0aWxlIiwiaWQiLCJkcmF3SW1hZ2UiLCJmcmFtZUlkIiwiY29sdW1ucyIsImdldEltYWdlRGF0YSIsImRhdGEiLCJUaWxlc2V0IiwiVGV4dHVyZUJhbmsiLCJfcmVnZW5lcmF0b3JSdW50aW1lIiwiYXN5bmNJdGVyYXRvciIsInRvU3RyaW5nVGFnIiwiZGVmaW5lIiwid3JhcCIsIkdlbmVyYXRvciIsIkNvbnRleHQiLCJtYWtlSW52b2tlTWV0aG9kIiwidHJ5Q2F0Y2giLCJhcmciLCJsIiwiR2VuZXJhdG9yRnVuY3Rpb24iLCJHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSIsImRlZmluZUl0ZXJhdG9yTWV0aG9kcyIsIl9pbnZva2UiLCJBc3luY0l0ZXJhdG9yIiwiaW52b2tlIiwicmVzb2x2ZSIsIl9fYXdhaXQiLCJjYWxsSW52b2tlV2l0aE1ldGhvZEFuZEFyZyIsIm1ldGhvZCIsImRlbGVnYXRlIiwibWF5YmVJbnZva2VEZWxlZ2F0ZSIsInNlbnQiLCJfc2VudCIsImRpc3BhdGNoRXhjZXB0aW9uIiwiYWJydXB0IiwicmVzdWx0TmFtZSIsIm5leHRMb2MiLCJwdXNoVHJ5RW50cnkiLCJ0cnlMb2MiLCJjYXRjaExvYyIsImZpbmFsbHlMb2MiLCJhZnRlckxvYyIsInRyeUVudHJpZXMiLCJyZXNldFRyeUVudHJ5IiwiY29tcGxldGlvbiIsInJlc2V0IiwiaXNOYU4iLCJkaXNwbGF5TmFtZSIsImlzR2VuZXJhdG9yRnVuY3Rpb24iLCJtYXJrIiwiYXdyYXAiLCJhc3luYyIsInJldmVyc2UiLCJwb3AiLCJjaGFyQXQiLCJzdG9wIiwicnZhbCIsImhhbmRsZSIsImNvbXBsZXRlIiwiZmluaXNoIiwiX2NhdGNoIiwiZGVsZWdhdGVZaWVsZCIsImFzeW5jR2VuZXJhdG9yU3RlcCIsIl9hc3luY1RvR2VuZXJhdG9yIiwiX25leHQiLCJfdGhyb3ciLCJmaXJzdGdpZCIsImltYWdlaGVpZ2h0IiwiaW1hZ2V3aWR0aCIsIm1hcmdpbiIsInNwYWNpbmciLCJ0aWxlY291bnQiLCJ0aWxlaGVpZ2h0IiwidGlsZXdpZHRoIiwiZmlyc3RHaWQiLCJnZXRSZWFkeSIsIl9nZXRSZWFkeSIsIl9jYWxsZWUiLCJfeWllbGQkeWllbGQkZmV0Y2gkanMiLCJfY2FsbGVlJCIsIl9jb250ZXh0IiwiZmV0Y2giLCJqc29uIiwib25sb2FkIiwiaW1hZ2VXaWR0aCIsImltYWdlSGVpZ2h0Iiwicm93cyIsIl94IiwiX1ZpZXcyIiwiZHJhZ1N0YXJ0IiwiZHJhZ2dpbmciLCJtb3ZlU3RpY2siLCJkcm9wU3RpY2siLCJkcmFnU3RpY2siLCJwb3MiLCJwcmV2ZW50RGVmYXVsdCIsInRvdWNoZXMiLCJ4eCIsInl5IiwibGltaXQiLCJGbG9vciIsInByb3BlcnRpZXMiLCJjYW52YXNlcyIsImNvbnRleHRzIiwidGlsZUxheWVycyIsIm9iamVjdExheWVycyIsIm1hcERhdGEiLCJwcm9wZXJ0eSIsInRpbGVzZXRzIiwibGF5ZXJzIiwiYmFja2dyb3VuZGNvbG9yIiwidGlsZVRvdGFsIiwicmVkdWNlIiwic3FydCIsImRlc3RpbmF0aW9uIiwiY3R4RGVzdGluYXRpb24iLCJ4RGVzdGluYXRpb24iLCJ5RGVzdGluYXRpb24iLCJ0aWxlc2V0IiwieFNvdXJjZSIsInlTb3VyY2UiLCJjdHhTb3VyY2UiLCJwdXRJbWFnZURhdGEiLCJ0b0Jsb2IiLCJibG9iIiwidXJsIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwicmV2b2tlT2JqZWN0VVJMIiwiX2l0ZXJhdG9yMyIsIl9zdGVwMyIsIl9pdGVyYXRvcjUiLCJfc3RlcDUiLCJ0aWxlRGF0YSIsIl9pdGVyYXRvcjQiLCJfc3RlcDQiLCJ0aWxlVmFsdWVzIiwiSW1hZ2VEYXRhIiwiX1NNVHJlZSIsIm1UcmVlIiwicmVjdE1hcCIsIndvcmxkRGF0YSIsImZpbGVOYW1lIiwicmVjdHMiLCJXZWJTb2NrZXQiLCJNb3pXZWJTb2NrZXQiLCJiciIsImJydW5jaCIsImFyIiwiZGlzYWJsZWQiLCJfYXIiLCJjYWNoZUJ1c3RlciIsImRhdGUiLCJyb3VuZCIsIkRhdGUiLCJyZXBsYWNlIiwiaW5kZXhPZiIsImJyb3dzZXIiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJ0b0xvd2VyQ2FzZSIsImZvcmNlUmVwYWludCIsInJlbG9hZGVycyIsInBhZ2UiLCJyZWxvYWQiLCJzdHlsZXNoZWV0IiwicXVlcnlTZWxlY3RvckFsbCIsImxpbmsiLCJ2YWwiLCJnZXRBdHRyaWJ1dGUiLCJocmVmIiwic2V0VGltZW91dCIsIm9mZnNldEhlaWdodCIsImphdmFzY3JpcHQiLCJzY3JpcHRzIiwidGV4dFNjcmlwdHMiLCJzY3JpcHQiLCJ0ZXh0Iiwic3JjU2NyaXB0cyIsIm9uTG9hZCIsImV2YWwiLCJyZW1vdmUiLCJuZXdTY3JpcHQiLCJoZWFkIiwiYXBwZW5kQ2hpbGQiLCJwb3J0IiwiaG9zdCIsInNlcnZlciIsImhvc3RuYW1lIiwiY29ubmVjdCIsImNvbm5lY3Rpb24iLCJvbm1lc3NhZ2UiLCJtZXNzYWdlIiwicmVsb2FkZXIiLCJvbmVycm9yIiwicmVhZHlTdGF0ZSIsImNsb3NlIiwib25jbG9zZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3IzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0lDOUthQSxNQUFNLEdBQUFDLE9BQUEsQ0FBQUQsTUFBQSxnQkFBQUUsWUFBQSxVQUFBRixPQUFBO0VBQUFHLGVBQUEsT0FBQUgsTUFBQTtBQUFBO0FB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Q0FBQztBQUNKIiwiZmlsZSI6ImRvY3MvYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQmFnLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5CYWcgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgX01peGluID0gcmVxdWlyZShcIi4vTWl4aW5cIik7XG52YXIgX0V2ZW50VGFyZ2V0TWl4aW4gPSByZXF1aXJlKFwiLi4vbWl4aW4vRXZlbnRUYXJnZXRNaXhpblwiKTtcbnZhciB0b0lkID0gaW50ID0+IE51bWJlcihpbnQpO1xudmFyIGZyb21JZCA9IGlkID0+IHBhcnNlSW50KGlkKTtcbnZhciBNYXBwZWQgPSBTeW1ib2woJ01hcHBlZCcpO1xudmFyIEhhcyA9IFN5bWJvbCgnSGFzJyk7XG52YXIgQWRkID0gU3ltYm9sKCdBZGQnKTtcbnZhciBSZW1vdmUgPSBTeW1ib2woJ1JlbW92ZScpO1xudmFyIERlbGV0ZSA9IFN5bWJvbCgnRGVsZXRlJyk7XG5jbGFzcyBCYWcgZXh0ZW5kcyBfTWl4aW4uTWl4aW4ud2l0aChfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluKSB7XG4gIGNvbnN0cnVjdG9yKGNoYW5nZUNhbGxiYWNrID0gdW5kZWZpbmVkKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmNoYW5nZUNhbGxiYWNrID0gY2hhbmdlQ2FsbGJhY2s7XG4gICAgdGhpcy5jb250ZW50ID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMubGlzdCA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoW10pO1xuICAgIHRoaXMubWV0YSA9IFN5bWJvbCgnbWV0YScpO1xuICAgIHRoaXMudHlwZSA9IHVuZGVmaW5lZDtcbiAgfVxuICBoYXMoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0uaGFzKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tIYXNdKGl0ZW0pO1xuICB9XG4gIFtIYXNdKGl0ZW0pIHtcbiAgICByZXR1cm4gdGhpcy5jb250ZW50LmhhcyhpdGVtKTtcbiAgfVxuICBhZGQoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0uYWRkKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpc1tBZGRdKGl0ZW0pO1xuICB9XG4gIFtBZGRdKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkIHx8ICEoaXRlbSBpbnN0YW5jZW9mIE9iamVjdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBvYmplY3RzIG1heSBiZSBhZGRlZCB0byBCYWdzLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy50eXBlICYmICEoaXRlbSBpbnN0YW5jZW9mIHRoaXMudHlwZSkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy50eXBlLCBpdGVtKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgT25seSBvYmplY3RzIG9mIHR5cGUgJHt0aGlzLnR5cGV9IG1heSBiZSBhZGRlZCB0byB0aGlzIEJhZy5gKTtcbiAgICB9XG4gICAgaXRlbSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKGl0ZW0pO1xuICAgIGlmICh0aGlzLmNvbnRlbnQuaGFzKGl0ZW0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBhZGRpbmcgPSBuZXcgQ3VzdG9tRXZlbnQoJ2FkZGluZycsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBpdGVtXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQoYWRkaW5nKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaWQgPSB0b0lkKHRoaXMuY3VycmVudCsrKTtcbiAgICB0aGlzLmNvbnRlbnQuc2V0KGl0ZW0sIGlkKTtcbiAgICB0aGlzLmxpc3RbaWRdID0gaXRlbTtcbiAgICBpZiAodGhpcy5jaGFuZ2VDYWxsYmFjaykge1xuICAgICAgdGhpcy5jaGFuZ2VDYWxsYmFjayhpdGVtLCB0aGlzLm1ldGEsIEJhZy5JVEVNX0FEREVELCBpZCk7XG4gICAgfVxuICAgIHZhciBhZGQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2FkZGVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW0sXG4gICAgICAgIGlkXG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGFkZCk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLnNpemU7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIHJlbW92ZShpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5yZW1vdmUoaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW1JlbW92ZV0oaXRlbSk7XG4gIH1cbiAgW1JlbW92ZV0oaXRlbSkge1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQgfHwgIShpdGVtIGluc3RhbmNlb2YgT2JqZWN0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9iamVjdHMgbWF5IGJlIHJlbW92ZWQgZnJvbSBCYWdzLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy50eXBlICYmICEoaXRlbSBpbnN0YW5jZW9mIHRoaXMudHlwZSkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy50eXBlLCBpdGVtKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgT25seSBvYmplY3RzIG9mIHR5cGUgJHt0aGlzLnR5cGV9IG1heSBiZSByZW1vdmVkIGZyb20gdGhpcyBCYWcuYCk7XG4gICAgfVxuICAgIGl0ZW0gPSBfQmluZGFibGUuQmluZGFibGUubWFrZShpdGVtKTtcbiAgICBpZiAoIXRoaXMuY29udGVudC5oYXMoaXRlbSkpIHtcbiAgICAgIGlmICh0aGlzLmNoYW5nZUNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2soaXRlbSwgdGhpcy5tZXRhLCAwLCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZpbmcgPSBuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92aW5nJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChyZW1vdmluZykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGlkID0gdGhpcy5jb250ZW50LmdldChpdGVtKTtcbiAgICBkZWxldGUgdGhpcy5saXN0W2lkXTtcbiAgICB0aGlzLmNvbnRlbnQuZGVsZXRlKGl0ZW0pO1xuICAgIGlmICh0aGlzLmNoYW5nZUNhbGxiYWNrKSB7XG4gICAgICB0aGlzLmNoYW5nZUNhbGxiYWNrKGl0ZW0sIHRoaXMubWV0YSwgQmFnLklURU1fUkVNT1ZFRCwgaWQpO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZlID0gbmV3IEN1c3RvbUV2ZW50KCdyZW1vdmVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW0sXG4gICAgICAgIGlkXG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KHJlbW92ZSk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLnNpemU7XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cbiAgZGVsZXRlKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLmRlbGV0ZShpdGVtKTtcbiAgICB9XG4gICAgdGhpc1tEZWxldGVdKGl0ZW0pO1xuICB9XG4gIFtEZWxldGVdKGl0ZW0pIHtcbiAgICB0aGlzLnJlbW92ZShpdGVtKTtcbiAgfVxuICBtYXAobWFwcGVyID0geCA9PiB4LCBmaWx0ZXIgPSB4ID0+IHgpIHtcbiAgICB2YXIgbWFwcGVkSXRlbXMgPSBuZXcgV2Vha01hcCgpO1xuICAgIHZhciBtYXBwZWRCYWcgPSBuZXcgQmFnKCk7XG4gICAgbWFwcGVkQmFnW01hcHBlZF0gPSB0aGlzO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignYWRkZWQnLCBldmVudCA9PiB7XG4gICAgICB2YXIgaXRlbSA9IGV2ZW50LmRldGFpbC5pdGVtO1xuICAgICAgaWYgKCFmaWx0ZXIoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKG1hcHBlZEl0ZW1zLmhhcyhpdGVtKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgbWFwcGVkID0gbWFwcGVyKGl0ZW0pO1xuICAgICAgbWFwcGVkSXRlbXMuc2V0KGl0ZW0sIG1hcHBlZCk7XG4gICAgICBtYXBwZWRCYWdbQWRkXShtYXBwZWQpO1xuICAgIH0pO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigncmVtb3ZlZCcsIGV2ZW50ID0+IHtcbiAgICAgIHZhciBpdGVtID0gZXZlbnQuZGV0YWlsLml0ZW07XG4gICAgICBpZiAoIW1hcHBlZEl0ZW1zLmhhcyhpdGVtKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgbWFwcGVkID0gbWFwcGVkSXRlbXMuZ2V0KGl0ZW0pO1xuICAgICAgbWFwcGVkSXRlbXMuZGVsZXRlKGl0ZW0pO1xuICAgICAgbWFwcGVkQmFnW1JlbW92ZV0obWFwcGVkKTtcbiAgICB9KTtcbiAgICByZXR1cm4gbWFwcGVkQmFnO1xuICB9XG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLmNvbnRlbnQuc2l6ZTtcbiAgfVxuICBpdGVtcygpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbnRlbnQuZW50cmllcygpKS5tYXAoZW50cnkgPT4gZW50cnlbMF0pO1xuICB9XG59XG5leHBvcnRzLkJhZyA9IEJhZztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCYWcsICdJVEVNX0FEREVEJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiAxXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCYWcsICdJVEVNX1JFTU9WRUQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IC0xXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0JpbmRhYmxlLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5CaW5kYWJsZSA9IHZvaWQgMDtcbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShlLCByLCB0KSB7IHJldHVybiAociA9IF90b1Byb3BlcnR5S2V5KHIpKSBpbiBlID8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsIHIsIHsgdmFsdWU6IHQsIGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAgfSkgOiBlW3JdID0gdCwgZTsgfVxuZnVuY3Rpb24gX3RvUHJvcGVydHlLZXkodCkgeyB2YXIgaSA9IF90b1ByaW1pdGl2ZSh0LCBcInN0cmluZ1wiKTsgcmV0dXJuIFwic3ltYm9sXCIgPT0gdHlwZW9mIGkgPyBpIDogaSArIFwiXCI7IH1cbmZ1bmN0aW9uIF90b1ByaW1pdGl2ZSh0LCByKSB7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiB0IHx8ICF0KSByZXR1cm4gdDsgdmFyIGUgPSB0W1N5bWJvbC50b1ByaW1pdGl2ZV07IGlmICh2b2lkIDAgIT09IGUpIHsgdmFyIGkgPSBlLmNhbGwodCwgciB8fCBcImRlZmF1bHRcIik7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiBpKSByZXR1cm4gaTsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkBAdG9QcmltaXRpdmUgbXVzdCByZXR1cm4gYSBwcmltaXRpdmUgdmFsdWUuXCIpOyB9IHJldHVybiAoXCJzdHJpbmdcIiA9PT0gciA/IFN0cmluZyA6IE51bWJlcikodCk7IH1cbnZhciBSZWYgPSBTeW1ib2woJ3JlZicpO1xudmFyIE9yaWdpbmFsID0gU3ltYm9sKCdvcmlnaW5hbCcpO1xudmFyIERlY2sgPSBTeW1ib2woJ2RlY2snKTtcbnZhciBCaW5kaW5nID0gU3ltYm9sKCdiaW5kaW5nJyk7XG52YXIgU3ViQmluZGluZyA9IFN5bWJvbCgnc3ViQmluZGluZycpO1xudmFyIEJpbmRpbmdBbGwgPSBTeW1ib2woJ2JpbmRpbmdBbGwnKTtcbnZhciBJc0JpbmRhYmxlID0gU3ltYm9sKCdpc0JpbmRhYmxlJyk7XG52YXIgV3JhcHBpbmcgPSBTeW1ib2woJ3dyYXBwaW5nJyk7XG52YXIgTmFtZXMgPSBTeW1ib2woJ05hbWVzJyk7XG52YXIgRXhlY3V0aW5nID0gU3ltYm9sKCdleGVjdXRpbmcnKTtcbnZhciBTdGFjayA9IFN5bWJvbCgnc3RhY2snKTtcbnZhciBPYmpTeW1ib2wgPSBTeW1ib2woJ29iamVjdCcpO1xudmFyIFdyYXBwZWQgPSBTeW1ib2woJ3dyYXBwZWQnKTtcbnZhciBVbndyYXBwZWQgPSBTeW1ib2woJ3Vud3JhcHBlZCcpO1xudmFyIEdldFByb3RvID0gU3ltYm9sKCdnZXRQcm90bycpO1xudmFyIE9uR2V0ID0gU3ltYm9sKCdvbkdldCcpO1xudmFyIE9uQWxsR2V0ID0gU3ltYm9sKCdvbkFsbEdldCcpO1xudmFyIEJpbmRDaGFpbiA9IFN5bWJvbCgnYmluZENoYWluJyk7XG52YXIgRGVzY3JpcHRvcnMgPSBTeW1ib2woJ0Rlc2NyaXB0b3JzJyk7XG52YXIgQmVmb3JlID0gU3ltYm9sKCdCZWZvcmUnKTtcbnZhciBBZnRlciA9IFN5bWJvbCgnQWZ0ZXInKTtcbnZhciBOb0dldHRlcnMgPSBTeW1ib2woJ05vR2V0dGVycycpO1xudmFyIFByZXZlbnQgPSBTeW1ib2woJ1ByZXZlbnQnKTtcbnZhciBUeXBlZEFycmF5ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKEludDhBcnJheSk7XG52YXIgU2V0SXRlcmF0b3IgPSBTZXQucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl07XG52YXIgTWFwSXRlcmF0b3IgPSBNYXAucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl07XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbnZhciBpc0V4Y2x1ZGVkID0gb2JqZWN0ID0+IHR5cGVvZiB3aW4uTWFwID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5NYXAgfHwgdHlwZW9mIHdpbi5TZXQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlNldCB8fCB0eXBlb2Ygd2luLk5vZGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLk5vZGUgfHwgdHlwZW9mIHdpbi5XZWFrTWFwID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5XZWFrTWFwIHx8IHR5cGVvZiB3aW4uTG9jYXRpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkxvY2F0aW9uIHx8IHR5cGVvZiB3aW4uU3RvcmFnZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uU3RvcmFnZSB8fCB0eXBlb2Ygd2luLldlYWtTZXQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLldlYWtTZXQgfHwgdHlwZW9mIHdpbi5BcnJheUJ1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uQXJyYXlCdWZmZXIgfHwgdHlwZW9mIHdpbi5Qcm9taXNlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5Qcm9taXNlIHx8IHR5cGVvZiB3aW4uRmlsZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uRmlsZSB8fCB0eXBlb2Ygd2luLkV2ZW50ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5FdmVudCB8fCB0eXBlb2Ygd2luLkN1c3RvbUV2ZW50ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5DdXN0b21FdmVudCB8fCB0eXBlb2Ygd2luLkdhbWVwYWQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkdhbWVwYWQgfHwgdHlwZW9mIHdpbi5SZXNpemVPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUmVzaXplT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5NdXRhdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5NdXRhdGlvbk9ic2VydmVyIHx8IHR5cGVvZiB3aW4uUGVyZm9ybWFuY2VPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uUGVyZm9ybWFuY2VPYnNlcnZlciB8fCB0eXBlb2Ygd2luLkludGVyc2VjdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JbnRlcnNlY3Rpb25PYnNlcnZlciB8fCB0eXBlb2Ygd2luLklEQkN1cnNvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCQ3Vyc29yIHx8IHR5cGVvZiB3aW4uSURCQ3Vyc29yV2l0aFZhbHVlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJDdXJzb3JXaXRoVmFsdWUgfHwgdHlwZW9mIHdpbi5JREJEYXRhYmFzZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCRGF0YWJhc2UgfHwgdHlwZW9mIHdpbi5JREJGYWN0b3J5ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJGYWN0b3J5IHx8IHR5cGVvZiB3aW4uSURCSW5kZXggPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkluZGV4IHx8IHR5cGVvZiB3aW4uSURCS2V5UmFuZ2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQktleVJhbmdlIHx8IHR5cGVvZiB3aW4uSURCT2JqZWN0U3RvcmUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQk9iamVjdFN0b3JlIHx8IHR5cGVvZiB3aW4uSURCT3BlbkRCUmVxdWVzdCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCT3BlbkRCUmVxdWVzdCB8fCB0eXBlb2Ygd2luLklEQlJlcXVlc3QgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQlJlcXVlc3QgfHwgdHlwZW9mIHdpbi5JREJUcmFuc2FjdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCVHJhbnNhY3Rpb24gfHwgdHlwZW9mIHdpbi5JREJWZXJzaW9uQ2hhbmdlRXZlbnQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQlZlcnNpb25DaGFuZ2VFdmVudCB8fCB0eXBlb2Ygd2luLkZpbGVTeXN0ZW1GaWxlSGFuZGxlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5GaWxlU3lzdGVtRmlsZUhhbmRsZSB8fCB0eXBlb2Ygd2luLlJUQ1BlZXJDb25uZWN0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5SVENQZWVyQ29ubmVjdGlvbiB8fCB0eXBlb2Ygd2luLlNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlNlcnZpY2VXb3JrZXJSZWdpc3RyYXRpb24gfHwgdHlwZW9mIHdpbi5XZWJHTFRleHR1cmUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLldlYkdMVGV4dHVyZTtcbmNsYXNzIEJpbmRhYmxlIHtcbiAgc3RhdGljIGlzQmluZGFibGUob2JqZWN0KSB7XG4gICAgaWYgKCFvYmplY3QgfHwgIW9iamVjdFtJc0JpbmRhYmxlXSB8fCAhb2JqZWN0W1ByZXZlbnRdKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RbSXNCaW5kYWJsZV0gPT09IEJpbmRhYmxlO1xuICB9XG4gIHN0YXRpYyBvbkRlY2sob2JqZWN0LCBrZXkpIHtcbiAgICByZXR1cm4gb2JqZWN0W0RlY2tdLmdldChrZXkpIHx8IGZhbHNlO1xuICB9XG4gIHN0YXRpYyByZWYob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdFtSZWZdIHx8IG9iamVjdCB8fCBmYWxzZTtcbiAgfVxuICBzdGF0aWMgbWFrZUJpbmRhYmxlKG9iamVjdCkge1xuICAgIHJldHVybiB0aGlzLm1ha2Uob2JqZWN0KTtcbiAgfVxuICBzdGF0aWMgc2h1Y2sob3JpZ2luYWwsIHNlZW4pIHtcbiAgICBzZWVuID0gc2VlbiB8fCBuZXcgTWFwKCk7XG4gICAgdmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh7fSk7XG4gICAgaWYgKG9yaWdpbmFsIGluc3RhbmNlb2YgVHlwZWRBcnJheSB8fCBvcmlnaW5hbCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICB2YXIgX2Nsb25lID0gb3JpZ2luYWwuc2xpY2UoMCk7XG4gICAgICBzZWVuLnNldChvcmlnaW5hbCwgX2Nsb25lKTtcbiAgICAgIHJldHVybiBfY2xvbmU7XG4gICAgfVxuICAgIHZhciBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMob3JpZ2luYWwpO1xuICAgIGZvciAodmFyIGkgaW4gcHJvcGVydGllcykge1xuICAgICAgdmFyIGlpID0gcHJvcGVydGllc1tpXTtcbiAgICAgIGlmIChpaS5zdWJzdHJpbmcoMCwgMykgPT09ICdfX18nKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIGFscmVhZHlDbG9uZWQgPSBzZWVuLmdldChvcmlnaW5hbFtpaV0pO1xuICAgICAgaWYgKGFscmVhZHlDbG9uZWQpIHtcbiAgICAgICAgY2xvbmVbaWldID0gYWxyZWFkeUNsb25lZDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWxbaWldID09PSBvcmlnaW5hbCkge1xuICAgICAgICBzZWVuLnNldChvcmlnaW5hbFtpaV0sIGNsb25lKTtcbiAgICAgICAgY2xvbmVbaWldID0gY2xvbmU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9yaWdpbmFsW2lpXSAmJiB0eXBlb2Ygb3JpZ2luYWxbaWldID09PSAnb2JqZWN0Jykge1xuICAgICAgICB2YXIgb3JpZ2luYWxQcm9wID0gb3JpZ2luYWxbaWldO1xuICAgICAgICBpZiAoQmluZGFibGUuaXNCaW5kYWJsZShvcmlnaW5hbFtpaV0pKSB7XG4gICAgICAgICAgb3JpZ2luYWxQcm9wID0gb3JpZ2luYWxbaWldW09yaWdpbmFsXTtcbiAgICAgICAgfVxuICAgICAgICBjbG9uZVtpaV0gPSB0aGlzLnNodWNrKG9yaWdpbmFsUHJvcCwgc2Vlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbG9uZVtpaV0gPSBvcmlnaW5hbFtpaV07XG4gICAgICB9XG4gICAgICBzZWVuLnNldChvcmlnaW5hbFtpaV0sIGNsb25lW2lpXSk7XG4gICAgfVxuICAgIGlmIChCaW5kYWJsZS5pc0JpbmRhYmxlKG9yaWdpbmFsKSkge1xuICAgICAgZGVsZXRlIGNsb25lLmJpbmRUbztcbiAgICAgIGRlbGV0ZSBjbG9uZS5pc0JvdW5kO1xuICAgIH1cbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cbiAgc3RhdGljIG1ha2Uob2JqZWN0KSB7XG4gICAgaWYgKG9iamVjdFtQcmV2ZW50XSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKCFvYmplY3QgfHwgIVsnZnVuY3Rpb24nLCAnb2JqZWN0J10uaW5jbHVkZXModHlwZW9mIG9iamVjdCkpIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmIChSZWYgaW4gb2JqZWN0KSB7XG4gICAgICByZXR1cm4gb2JqZWN0W1JlZl07XG4gICAgfVxuICAgIGlmIChvYmplY3RbSXNCaW5kYWJsZV0pIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGlmIChPYmplY3QuaXNTZWFsZWQob2JqZWN0KSB8fCBPYmplY3QuaXNGcm96ZW4ob2JqZWN0KSB8fCAhT2JqZWN0LmlzRXh0ZW5zaWJsZShvYmplY3QpIHx8IGlzRXhjbHVkZWQob2JqZWN0KSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgSXNCaW5kYWJsZSwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IEJpbmRhYmxlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgUmVmLCB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6IGZhbHNlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgT3JpZ2luYWwsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBvYmplY3RcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBEZWNrLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmluZGluZywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5jcmVhdGUobnVsbClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTdWJCaW5kaW5nLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmluZGluZ0FsbCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEV4ZWN1dGluZywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFdyYXBwaW5nLCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgU3RhY2ssIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJlZm9yZSwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEFmdGVyLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgV3JhcHBlZCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhuZXcgTWFwKCkpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgVW53cmFwcGVkLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG5ldyBNYXAoKSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBEZXNjcmlwdG9ycywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhuZXcgTWFwKCkpXG4gICAgfSk7XG4gICAgdmFyIGJpbmRUbyA9IChwcm9wZXJ0eSwgY2FsbGJhY2sgPSBudWxsLCBvcHRpb25zID0ge30pID0+IHtcbiAgICAgIHZhciBiaW5kVG9BbGwgPSBmYWxzZTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BlcnR5KSkge1xuICAgICAgICB2YXIgZGViaW5kZXJzID0gcHJvcGVydHkubWFwKHAgPT4gYmluZFRvKHAsIGNhbGxiYWNrLCBvcHRpb25zKSk7XG4gICAgICAgIHJldHVybiAoKSA9PiBkZWJpbmRlcnMuZm9yRWFjaChkID0+IGQoKSk7XG4gICAgICB9XG4gICAgICBpZiAocHJvcGVydHkgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICBvcHRpb25zID0gY2FsbGJhY2sgfHwge307XG4gICAgICAgIGNhbGxiYWNrID0gcHJvcGVydHk7XG4gICAgICAgIGJpbmRUb0FsbCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5kZWxheSA+PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwRGVsYXlDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy5kZWxheSk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy50aHJvdHRsZSA+PSAwKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwVGhyb3R0bGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy50aHJvdHRsZSk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy53YWl0ID49IDApIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBXYWl0Q2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMud2FpdCk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5mcmFtZSkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcEZyYW1lQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMuZnJhbWUpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMuaWRsZSkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcElkbGVDYWxsYmFjayhjYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAoYmluZFRvQWxsKSB7XG4gICAgICAgIG9iamVjdFtCaW5kaW5nQWxsXS5hZGQoY2FsbGJhY2spO1xuICAgICAgICBpZiAoISgnbm93JyBpbiBvcHRpb25zKSB8fCBvcHRpb25zLm5vdykge1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhvYmplY3RbaV0sIGksIG9iamVjdCwgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIG9iamVjdFtCaW5kaW5nQWxsXS5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKCFvYmplY3RbQmluZGluZ11bcHJvcGVydHldKSB7XG4gICAgICAgIG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0gPSBuZXcgU2V0KCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGxldCBiaW5kSW5kZXggPSBvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmxlbmd0aDtcblxuICAgICAgaWYgKG9wdGlvbnMuY2hpbGRyZW4pIHtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICB2YXIgdiA9IGFyZ3NbMF07XG4gICAgICAgICAgdmFyIHN1YkRlYmluZCA9IG9iamVjdFtTdWJCaW5kaW5nXS5nZXQob3JpZ2luYWwpO1xuICAgICAgICAgIGlmIChzdWJEZWJpbmQpIHtcbiAgICAgICAgICAgIG9iamVjdFtTdWJCaW5kaW5nXS5kZWxldGUob3JpZ2luYWwpO1xuICAgICAgICAgICAgc3ViRGViaW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsKC4uLmFyZ3MpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgdnYgPSBCaW5kYWJsZS5tYWtlKHYpO1xuICAgICAgICAgIGlmIChCaW5kYWJsZS5pc0JpbmRhYmxlKHZ2KSkge1xuICAgICAgICAgICAgb2JqZWN0W1N1YkJpbmRpbmddLnNldChvcmlnaW5hbCwgdnYuYmluZFRvKCguLi5zdWJBcmdzKSA9PiBvcmlnaW5hbCguLi5hcmdzLCAuLi5zdWJBcmdzKSwgT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgICAgICAgICBjaGlsZHJlbjogZmFsc2VcbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9yaWdpbmFsKC4uLmFyZ3MpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5hZGQoY2FsbGJhY2spO1xuICAgICAgaWYgKCEoJ25vdycgaW4gb3B0aW9ucykgfHwgb3B0aW9ucy5ub3cpIHtcbiAgICAgICAgY2FsbGJhY2sob2JqZWN0W3Byb3BlcnR5XSwgcHJvcGVydHksIG9iamVjdCwgZmFsc2UpO1xuICAgICAgfVxuICAgICAgdmFyIGRlYmluZGVyID0gKCkgPT4ge1xuICAgICAgICB2YXIgc3ViRGViaW5kID0gb2JqZWN0W1N1YkJpbmRpbmddLmdldChjYWxsYmFjayk7XG4gICAgICAgIGlmIChzdWJEZWJpbmQpIHtcbiAgICAgICAgICBvYmplY3RbU3ViQmluZGluZ10uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgICBzdWJEZWJpbmQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmhhcyhjYWxsYmFjaykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XS5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgfTtcbiAgICAgIGlmIChvcHRpb25zLnJlbW92ZVdpdGggJiYgb3B0aW9ucy5yZW1vdmVXaXRoIGluc3RhbmNlb2YgVmlldykge1xuICAgICAgICBvcHRpb25zLnJlbW92ZVdpdGgub25SZW1vdmUoKCkgPT4gZGViaW5kZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlYmluZGVyO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ2JpbmRUbycsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBiaW5kVG9cbiAgICB9KTtcbiAgICB2YXIgX19fYmVmb3JlID0gY2FsbGJhY2sgPT4ge1xuICAgICAgb2JqZWN0W0JlZm9yZV0uYWRkKGNhbGxiYWNrKTtcbiAgICAgIHJldHVybiAoKSA9PiBvYmplY3RbQmVmb3JlXS5kZWxldGUoY2FsbGJhY2spO1xuICAgIH07XG4gICAgdmFyIF9fX2FmdGVyID0gY2FsbGJhY2sgPT4ge1xuICAgICAgb2JqZWN0W0FmdGVyXS5hZGQoY2FsbGJhY2spO1xuICAgICAgcmV0dXJuICgpID0+IG9iamVjdFtBZnRlcl0uZGVsZXRlKGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIEJpbmRDaGFpbiwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IChwYXRoLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICAgIHZhciBub2RlID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgdmFyIHN1YlBhcnRzID0gcGFydHMuc2xpY2UoMCk7XG4gICAgICAgIHZhciBkZWJpbmQgPSBbXTtcbiAgICAgICAgZGViaW5kLnB1c2gob2JqZWN0LmJpbmRUbyhub2RlLCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIHZhciByZXN0ID0gc3ViUGFydHMuam9pbignLicpO1xuICAgICAgICAgIGlmIChzdWJQYXJ0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHYsIGssIHQsIGQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2ID0gdFtrXSA9IHRoaXMubWFrZSh7fSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlYmluZCA9IGRlYmluZC5jb25jYXQodltCaW5kQ2hhaW5dKHJlc3QsIGNhbGxiYWNrKSk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgcmV0dXJuICgpID0+IGRlYmluZC5mb3JFYWNoKHggPT4geCgpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnX19fYmVmb3JlJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IF9fX2JlZm9yZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdfX19hZnRlcicsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBfX19hZnRlclxuICAgIH0pO1xuICAgIHZhciBpc0JvdW5kID0gKCkgPT4ge1xuICAgICAgaWYgKG9iamVjdFtCaW5kaW5nQWxsXS5zaXplKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgY2FsbGJhY2tzIG9mIE9iamVjdC52YWx1ZXMob2JqZWN0W0JpbmRpbmddKSkge1xuICAgICAgICBpZiAoY2FsbGJhY2tzLnNpemUpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3IobGV0IGNhbGxiYWNrIG9mIGNhbGxiYWNrcylcbiAgICAgICAgLy8ge1xuICAgICAgICAvLyBcdGlmKGNhbGxiYWNrKVxuICAgICAgICAvLyBcdHtcbiAgICAgICAgLy8gXHRcdHJldHVybiB0cnVlO1xuICAgICAgICAvLyBcdH1cbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ2lzQm91bmQnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogaXNCb3VuZFxuICAgIH0pO1xuICAgIGZvciAodmFyIGkgaW4gb2JqZWN0KSB7XG4gICAgICAvLyBjb25zdCBkZXNjcmlwdG9ycyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iamVjdCk7XG5cbiAgICAgIGlmICghb2JqZWN0W2ldIHx8IHR5cGVvZiBvYmplY3RbaV0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG9iamVjdFtpXVtSZWZdIHx8IG9iamVjdFtpXSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUob2JqZWN0W2ldKSB8fCBPYmplY3QuaXNTZWFsZWQob2JqZWN0W2ldKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNFeGNsdWRlZChvYmplY3RbaV0pKSB7XG4gICAgICAgIG9iamVjdFtpXSA9IEJpbmRhYmxlLm1ha2Uob2JqZWN0W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGRlc2NyaXB0b3JzID0gb2JqZWN0W0Rlc2NyaXB0b3JzXTtcbiAgICB2YXIgd3JhcHBlZCA9IG9iamVjdFtXcmFwcGVkXTtcbiAgICB2YXIgc3RhY2sgPSBvYmplY3RbU3RhY2tdO1xuICAgIHZhciBzZXQgPSAodGFyZ2V0LCBrZXksIHZhbHVlKSA9PiB7XG4gICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICB2YWx1ZSA9IEJpbmRhYmxlLm1ha2UodmFsdWUpO1xuICAgICAgICBpZiAodGFyZ2V0W2tleV0gPT09IHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3cmFwcGVkLmhhcyhrZXkpKSB7XG4gICAgICAgIHdyYXBwZWQuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgICB2YXIgb25EZWNrID0gb2JqZWN0W0RlY2tdO1xuICAgICAgdmFyIGlzT25EZWNrID0gb25EZWNrLmhhcyhrZXkpO1xuICAgICAgdmFyIHZhbE9uRGVjayA9IGlzT25EZWNrICYmIG9uRGVjay5nZXQoa2V5KTtcblxuICAgICAgLy8gaWYob25EZWNrW2tleV0gIT09IHVuZGVmaW5lZCAmJiBvbkRlY2tba2V5XSA9PT0gdmFsdWUpXG4gICAgICBpZiAoaXNPbkRlY2sgJiYgdmFsT25EZWNrID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkuc2xpY2UgJiYga2V5LnNsaWNlKC0zKSA9PT0gJ19fXycpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodGFyZ2V0W2tleV0gPT09IHZhbHVlIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgaXNOYU4odmFsT25EZWNrKSAmJiBpc05hTih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBvbkRlY2suc2V0KGtleSwgdmFsdWUpO1xuICAgICAgZm9yICh2YXIgY2FsbGJhY2sgb2Ygb2JqZWN0W0JpbmRpbmdBbGxdKSB7XG4gICAgICAgIGNhbGxiYWNrKHZhbHVlLCBrZXksIHRhcmdldCwgZmFsc2UpO1xuICAgICAgfVxuICAgICAgaWYgKGtleSBpbiBvYmplY3RbQmluZGluZ10pIHtcbiAgICAgICAgZm9yICh2YXIgX2NhbGxiYWNrIG9mIG9iamVjdFtCaW5kaW5nXVtrZXldKSB7XG4gICAgICAgICAgX2NhbGxiYWNrKHZhbHVlLCBrZXksIHRhcmdldCwgZmFsc2UsIHRhcmdldFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb25EZWNrLmRlbGV0ZShrZXkpO1xuICAgICAgdmFyIGV4Y2x1ZGVkID0gd2luLkZpbGUgJiYgdGFyZ2V0IGluc3RhbmNlb2Ygd2luLkZpbGUgJiYga2V5ID09ICdsYXN0TW9kaWZpZWREYXRlJztcbiAgICAgIGlmICghZXhjbHVkZWQpIHtcbiAgICAgICAgUmVmbGVjdC5zZXQodGFyZ2V0LCBrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkgJiYgb2JqZWN0W0JpbmRpbmddWydsZW5ndGgnXSkge1xuICAgICAgICBmb3IgKHZhciBfaSBpbiBvYmplY3RbQmluZGluZ11bJ2xlbmd0aCddKSB7XG4gICAgICAgICAgdmFyIF9jYWxsYmFjazIgPSBvYmplY3RbQmluZGluZ11bJ2xlbmd0aCddW19pXTtcbiAgICAgICAgICBfY2FsbGJhY2syKHRhcmdldC5sZW5ndGgsICdsZW5ndGgnLCB0YXJnZXQsIGZhbHNlLCB0YXJnZXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICB2YXIgZGVsZXRlUHJvcGVydHkgPSAodGFyZ2V0LCBrZXkpID0+IHtcbiAgICAgIHZhciBvbkRlY2sgPSBvYmplY3RbRGVja107XG4gICAgICB2YXIgaXNPbkRlY2sgPSBvbkRlY2suaGFzKGtleSk7XG4gICAgICBpZiAoaXNPbkRlY2spIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoIShrZXkgaW4gdGFyZ2V0KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChkZXNjcmlwdG9ycy5oYXMoa2V5KSkge1xuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JzLmdldChrZXkpO1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5jb25maWd1cmFibGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZGVzY3JpcHRvcnMuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgICBvbkRlY2suc2V0KGtleSwgbnVsbCk7XG4gICAgICBpZiAod3JhcHBlZC5oYXMoa2V5KSkge1xuICAgICAgICB3cmFwcGVkLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgY2FsbGJhY2sgb2Ygb2JqZWN0W0JpbmRpbmdBbGxdKSB7XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwga2V5LCB0YXJnZXQsIHRydWUsIHRhcmdldFtrZXldKTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgaW4gb2JqZWN0W0JpbmRpbmddKSB7XG4gICAgICAgIGZvciAodmFyIGJpbmRpbmcgb2Ygb2JqZWN0W0JpbmRpbmddW2tleV0pIHtcbiAgICAgICAgICBiaW5kaW5nKHVuZGVmaW5lZCwga2V5LCB0YXJnZXQsIHRydWUsIHRhcmdldFtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIGtleSk7XG4gICAgICBvbkRlY2suZGVsZXRlKGtleSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIHZhciBjb25zdHJ1Y3QgPSAodGFyZ2V0LCBhcmdzKSA9PiB7XG4gICAgICB2YXIga2V5ID0gJ2NvbnN0cnVjdG9yJztcbiAgICAgIGZvciAodmFyIGNhbGxiYWNrIG9mIHRhcmdldFtCZWZvcmVdKSB7XG4gICAgICAgIGNhbGxiYWNrKHRhcmdldCwga2V5LCBvYmplY3RbU3RhY2tdLCB1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgdmFyIGluc3RhbmNlID0gQmluZGFibGUubWFrZShuZXcgdGFyZ2V0W09yaWdpbmFsXSguLi5hcmdzKSk7XG4gICAgICBmb3IgKHZhciBfY2FsbGJhY2szIG9mIHRhcmdldFtBZnRlcl0pIHtcbiAgICAgICAgX2NhbGxiYWNrMyh0YXJnZXQsIGtleSwgb2JqZWN0W1N0YWNrXSwgaW5zdGFuY2UsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH07XG4gICAgdmFyIGdldCA9ICh0YXJnZXQsIGtleSkgPT4ge1xuICAgICAgaWYgKHdyYXBwZWQuaGFzKGtleSkpIHtcbiAgICAgICAgcmV0dXJuIHdyYXBwZWQuZ2V0KGtleSk7XG4gICAgICB9XG4gICAgICBpZiAoa2V5ID09PSBSZWYgfHwga2V5ID09PSBPcmlnaW5hbCB8fCBrZXkgPT09ICdhcHBseScgfHwga2V5ID09PSAnaXNCb3VuZCcgfHwga2V5ID09PSAnYmluZFRvJyB8fCBrZXkgPT09ICdfX3Byb3RvX18nIHx8IGtleSA9PT0gJ2NvbnN0cnVjdG9yJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgICB2YXIgZGVzY3JpcHRvcjtcbiAgICAgIGlmIChkZXNjcmlwdG9ycy5oYXMoa2V5KSkge1xuICAgICAgICBkZXNjcmlwdG9yID0gZGVzY3JpcHRvcnMuZ2V0KGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIGtleSk7XG4gICAgICAgIGRlc2NyaXB0b3JzLnNldChrZXksIGRlc2NyaXB0b3IpO1xuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgIH1cbiAgICAgIGlmIChPbkFsbEdldCBpbiBvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtPbkFsbEdldF0oa2V5KTtcbiAgICAgIH1cbiAgICAgIGlmIChPbkdldCBpbiBvYmplY3QgJiYgIShrZXkgaW4gb2JqZWN0KSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W09uR2V0XShrZXkpO1xuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlICYmICFkZXNjcmlwdG9yLndyaXRhYmxlKSB7XG4gICAgICAgIHdyYXBwZWQuc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG9iamVjdFtrZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGlmIChOYW1lcyBpbiBvYmplY3Rba2V5XSkge1xuICAgICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBvYmplY3RbVW53cmFwcGVkXS5zZXQoa2V5LCBvYmplY3Rba2V5XSk7XG4gICAgICAgIHZhciBwcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTtcbiAgICAgICAgdmFyIGlzTWV0aG9kID0gcHJvdG90eXBlW2tleV0gPT09IG9iamVjdFtrZXldO1xuICAgICAgICB2YXIgb2JqUmVmID1cbiAgICAgICAgLy8gKHR5cGVvZiBQcm9taXNlID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBQcm9taXNlKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFN0b3JhZ2UgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFN0b3JhZ2UpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgTWFwID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgTWFwKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFNldCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFNldClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBXZWFrTWFwID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBXZWFrTWFwKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFdlYWtTZXQgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFdlYWtTZXQpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgQXJyYXlCdWZmZXIgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgUmVzaXplT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgUmVzaXplT2JzZXJ2ZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgTXV0YXRpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgTXV0YXRpb25PYnNlcnZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBQZXJmb3JtYW5jZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBQZXJmb3JtYW5jZU9ic2VydmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIEludGVyc2VjdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIEludGVyc2VjdGlvbk9ic2VydmVyKVxuICAgICAgICBpc0V4Y2x1ZGVkKG9iamVjdCkgfHwgdHlwZW9mIG9iamVjdFtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nICYmIGtleSA9PT0gJ25leHQnIHx8IHR5cGVvZiBUeXBlZEFycmF5ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIFR5cGVkQXJyYXkgfHwgdHlwZW9mIEV2ZW50VGFyZ2V0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIEV2ZW50VGFyZ2V0IHx8IHR5cGVvZiBEYXRlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIERhdGUgfHwgdHlwZW9mIE1hcEl0ZXJhdG9yID09PSAnZnVuY3Rpb24nICYmIG9iamVjdC5wcm90b3R5cGUgPT09IE1hcEl0ZXJhdG9yIHx8IHR5cGVvZiBTZXRJdGVyYXRvciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QucHJvdG90eXBlID09PSBTZXRJdGVyYXRvciA/IG9iamVjdCA6IG9iamVjdFtSZWZdO1xuICAgICAgICB2YXIgd3JhcHBlZE1ldGhvZCA9IGZ1bmN0aW9uICguLi5wcm92aWRlZEFyZ3MpIHtcbiAgICAgICAgICBvYmplY3RbRXhlY3V0aW5nXSA9IGtleTtcbiAgICAgICAgICBzdGFjay51bnNoaWZ0KGtleSk7XG4gICAgICAgICAgZm9yICh2YXIgYmVmb3JlQ2FsbGJhY2sgb2Ygb2JqZWN0W0JlZm9yZV0pIHtcbiAgICAgICAgICAgIGJlZm9yZUNhbGxiYWNrKG9iamVjdCwga2V5LCBzdGFjaywgb2JqZWN0LCBwcm92aWRlZEFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmV0O1xuICAgICAgICAgIGlmIChuZXcudGFyZ2V0KSB7XG4gICAgICAgICAgICByZXQgPSBuZXcgKG9iamVjdFtVbndyYXBwZWRdLmdldChrZXkpKSguLi5wcm92aWRlZEFyZ3MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IG9iamVjdFtVbndyYXBwZWRdLmdldChrZXkpO1xuICAgICAgICAgICAgaWYgKGlzTWV0aG9kKSB7XG4gICAgICAgICAgICAgIHJldCA9IGZ1bmMuYXBwbHkob2JqUmVmIHx8IG9iamVjdCwgcHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldCA9IGZ1bmMoLi4ucHJvdmlkZWRBcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yICh2YXIgYWZ0ZXJDYWxsYmFjayBvZiBvYmplY3RbQWZ0ZXJdKSB7XG4gICAgICAgICAgICBhZnRlckNhbGxiYWNrKG9iamVjdCwga2V5LCBzdGFjaywgb2JqZWN0LCBwcm92aWRlZEFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvYmplY3RbRXhlY3V0aW5nXSA9IG51bGw7XG4gICAgICAgICAgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9O1xuICAgICAgICB3cmFwcGVkTWV0aG9kW09uQWxsR2V0XSA9IF9rZXkgPT4gb2JqZWN0W2tleV1bX2tleV07XG4gICAgICAgIHZhciByZXN1bHQgPSBCaW5kYWJsZS5tYWtlKHdyYXBwZWRNZXRob2QpO1xuICAgICAgICB3cmFwcGVkLnNldChrZXksIHJlc3VsdCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqZWN0W2tleV07XG4gICAgfTtcbiAgICB2YXIgZ2V0UHJvdG90eXBlT2YgPSB0YXJnZXQgPT4ge1xuICAgICAgaWYgKEdldFByb3RvIGluIG9iamVjdCkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W0dldFByb3RvXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZWZsZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCk7XG4gICAgfTtcbiAgICB2YXIgaGFuZGxlckRlZiA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgaGFuZGxlckRlZi5zZXQgPSBzZXQ7XG4gICAgaGFuZGxlckRlZi5jb25zdHJ1Y3QgPSBjb25zdHJ1Y3Q7XG4gICAgaGFuZGxlckRlZi5kZWxldGVQcm9wZXJ0eSA9IGRlbGV0ZVByb3BlcnR5O1xuICAgIGlmICghb2JqZWN0W05vR2V0dGVyc10pIHtcbiAgICAgIGhhbmRsZXJEZWYuZ2V0UHJvdG90eXBlT2YgPSBnZXRQcm90b3R5cGVPZjtcbiAgICAgIGhhbmRsZXJEZWYuZ2V0ID0gZ2V0O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBSZWYsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgUHJveHkob2JqZWN0LCBoYW5kbGVyRGVmKVxuICAgIH0pO1xuICAgIHJldHVybiBvYmplY3RbUmVmXTtcbiAgfVxuICBzdGF0aWMgY2xlYXJCaW5kaW5ncyhvYmplY3QpIHtcbiAgICB2YXIgbWFwcyA9IGZ1bmMgPT4gKC4uLm9zKSA9PiBvcy5tYXAoZnVuYyk7XG4gICAgdmFyIGNsZWFyT2JqID0gbyA9PiBPYmplY3Qua2V5cyhvKS5tYXAoayA9PiBkZWxldGUgb1trXSk7XG4gICAgdmFyIGNsZWFyT2JqcyA9IG1hcHMoY2xlYXJPYmopO1xuICAgIG9iamVjdFtCaW5kaW5nQWxsXS5jbGVhcigpO1xuICAgIGNsZWFyT2JqcyhvYmplY3RbV3JhcHBlZF0sIG9iamVjdFtCaW5kaW5nXSwgb2JqZWN0W0FmdGVyXSwgb2JqZWN0W0JlZm9yZV0pO1xuICB9XG4gIHN0YXRpYyByZXNvbHZlKG9iamVjdCwgcGF0aCwgb3duZXIgPSBmYWxzZSkge1xuICAgIHZhciBub2RlO1xuICAgIHZhciBwYXRoUGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgdmFyIHRvcCA9IHBhdGhQYXJ0c1swXTtcbiAgICB3aGlsZSAocGF0aFBhcnRzLmxlbmd0aCkge1xuICAgICAgaWYgKG93bmVyICYmIHBhdGhQYXJ0cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgdmFyIG9iaiA9IHRoaXMubWFrZShvYmplY3QpO1xuICAgICAgICByZXR1cm4gW29iaiwgcGF0aFBhcnRzLnNoaWZ0KCksIHRvcF07XG4gICAgICB9XG4gICAgICBub2RlID0gcGF0aFBhcnRzLnNoaWZ0KCk7XG4gICAgICBpZiAoIShub2RlIGluIG9iamVjdCkgfHwgIW9iamVjdFtub2RlXSB8fCAhKHR5cGVvZiBvYmplY3Rbbm9kZV0gPT09ICdvYmplY3QnKSkge1xuICAgICAgICBvYmplY3Rbbm9kZV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgfVxuICAgICAgb2JqZWN0ID0gdGhpcy5tYWtlKG9iamVjdFtub2RlXSk7XG4gICAgfVxuICAgIHJldHVybiBbdGhpcy5tYWtlKG9iamVjdCksIG5vZGUsIHRvcF07XG4gIH1cbiAgc3RhdGljIHdyYXBEZWxheUNhbGxiYWNrKGNhbGxiYWNrLCBkZWxheSkge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSwgZGVsYXkpO1xuICB9XG4gIHN0YXRpYyB3cmFwVGhyb3R0bGVDYWxsYmFjayhjYWxsYmFjaywgdGhyb3R0bGUpIHtcbiAgICB0aGlzLnRocm90dGxlcy5zZXQoY2FsbGJhY2ssIGZhbHNlKTtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICh0aGlzLnRocm90dGxlcy5nZXQoY2FsbGJhY2ssIHRydWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgICAgdGhpcy50aHJvdHRsZXMuc2V0KGNhbGxiYWNrLCB0cnVlKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnRocm90dGxlcy5zZXQoY2FsbGJhY2ssIGZhbHNlKTtcbiAgICAgIH0sIHRocm90dGxlKTtcbiAgICB9O1xuICB9XG4gIHN0YXRpYyB3cmFwV2FpdENhbGxiYWNrKGNhbGxiYWNrLCB3YWl0KSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICB2YXIgd2FpdGVyO1xuICAgICAgaWYgKHdhaXRlciA9IHRoaXMud2FpdGVycy5nZXQoY2FsbGJhY2spKSB7XG4gICAgICAgIHRoaXMud2FpdGVycy5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICBjbGVhclRpbWVvdXQod2FpdGVyKTtcbiAgICAgIH1cbiAgICAgIHdhaXRlciA9IHNldFRpbWVvdXQoKCkgPT4gY2FsbGJhY2soLi4uYXJncyksIHdhaXQpO1xuICAgICAgdGhpcy53YWl0ZXJzLnNldChjYWxsYmFjaywgd2FpdGVyKTtcbiAgICB9O1xuICB9XG4gIHN0YXRpYyB3cmFwRnJhbWVDYWxsYmFjayhjYWxsYmFjaywgZnJhbWVzKSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gY2FsbGJhY2soLi4uYXJncykpO1xuICAgIH07XG4gIH1cbiAgc3RhdGljIHdyYXBJZGxlQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIC8vIENvbXBhdGliaWxpdHkgZm9yIFNhZmFyaSAwOC8yMDIwXG4gICAgICB2YXIgcmVxID0gd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2sgfHwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuICAgICAgcmVxKCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpKTtcbiAgICB9O1xuICB9XG59XG5leHBvcnRzLkJpbmRhYmxlID0gQmluZGFibGU7XG5fZGVmaW5lUHJvcGVydHkoQmluZGFibGUsIFwid2FpdGVyc1wiLCBuZXcgV2Vha01hcCgpKTtcbl9kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgXCJ0aHJvdHRsZXNcIiwgbmV3IFdlYWtNYXAoKSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdQcmV2ZW50Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogUHJldmVudFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdPbkdldCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE9uR2V0XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ05vR2V0dGVycycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE5vR2V0dGVyc1xufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQmluZGFibGUsICdHZXRQcm90bycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEdldFByb3RvXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ09uQWxsR2V0Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogT25BbGxHZXRcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkNhY2hlID0gdm9pZCAwO1xuY2xhc3MgQ2FjaGUge1xuICBzdGF0aWMgc3RvcmUoa2V5LCB2YWx1ZSwgZXhwaXJ5LCBidWNrZXQgPSAnc3RhbmRhcmQnKSB7XG4gICAgdmFyIGV4cGlyYXRpb24gPSAwO1xuICAgIGlmIChleHBpcnkpIHtcbiAgICAgIGV4cGlyYXRpb24gPSBleHBpcnkgKiAxMDAwICsgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5idWNrZXRzKSB7XG4gICAgICB0aGlzLmJ1Y2tldHMgPSBuZXcgTWFwKCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5idWNrZXRzLmhhcyhidWNrZXQpKSB7XG4gICAgICB0aGlzLmJ1Y2tldHMuc2V0KGJ1Y2tldCwgbmV3IE1hcCgpKTtcbiAgICB9XG4gICAgdmFyIGV2ZW50RW5kID0gbmV3IEN1c3RvbUV2ZW50KCdjdkNhY2hlU3RvcmUnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGtleSxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIGV4cGlyeSxcbiAgICAgICAgYnVja2V0XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRFbmQpKSB7XG4gICAgICB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuc2V0KGtleSwge1xuICAgICAgICB2YWx1ZSxcbiAgICAgICAgZXhwaXJhdGlvblxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBsb2FkKGtleSwgZGVmYXVsdHZhbHVlID0gZmFsc2UsIGJ1Y2tldCA9ICdzdGFuZGFyZCcpIHtcbiAgICB2YXIgZXZlbnRFbmQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Q2FjaGVMb2FkJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBrZXksXG4gICAgICAgIGRlZmF1bHR2YWx1ZSxcbiAgICAgICAgYnVja2V0XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50RW5kKSkge1xuICAgICAgcmV0dXJuIGRlZmF1bHR2YWx1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuYnVja2V0cyAmJiB0aGlzLmJ1Y2tldHMuaGFzKGJ1Y2tldCkgJiYgdGhpcy5idWNrZXRzLmdldChidWNrZXQpLmhhcyhrZXkpKSB7XG4gICAgICB2YXIgZW50cnkgPSB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuZ2V0KGtleSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmJ1Y2tldFtidWNrZXRdW2tleV0uZXhwaXJhdGlvbiwgKG5ldyBEYXRlKS5nZXRUaW1lKCkpO1xuICAgICAgaWYgKGVudHJ5LmV4cGlyYXRpb24gPT09IDAgfHwgZW50cnkuZXhwaXJhdGlvbiA+IG5ldyBEYXRlKCkuZ2V0VGltZSgpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuZ2V0KGtleSkudmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZWZhdWx0dmFsdWU7XG4gIH1cbn1cbmV4cG9ydHMuQ2FjaGUgPSBDYWNoZTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0NvbmZpZy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQ29uZmlnID0gdm9pZCAwO1xudmFyIEFwcENvbmZpZyA9IHt9O1xudmFyIF9yZXF1aXJlID0gcmVxdWlyZTtcbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xudHJ5IHtcbiAgQXBwQ29uZmlnID0gX3JlcXVpcmUoJy9Db25maWcnKS5Db25maWc7XG59IGNhdGNoIChlcnJvcikge1xuICB3aW4uZGV2TW9kZSA9PT0gdHJ1ZSAmJiBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgQXBwQ29uZmlnID0ge307XG59XG5jbGFzcyBDb25maWcge1xuICBzdGF0aWMgZ2V0KG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWdzW25hbWVdO1xuICB9XG4gIHN0YXRpYyBzZXQobmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLmNvbmZpZ3NbbmFtZV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBzdGF0aWMgZHVtcCgpIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWdzO1xuICB9XG4gIHN0YXRpYyBpbml0KC4uLmNvbmZpZ3MpIHtcbiAgICBmb3IgKHZhciBpIGluIGNvbmZpZ3MpIHtcbiAgICAgIHZhciBjb25maWcgPSBjb25maWdzW2ldO1xuICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIG5hbWUgaW4gY29uZmlnKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGNvbmZpZ1tuYW1lXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuZXhwb3J0cy5Db25maWcgPSBDb25maWc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQ29uZmlnLCAnY29uZmlncycsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IEFwcENvbmZpZ1xufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Eb20uanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkRvbSA9IHZvaWQgMDtcbnZhciB0cmF2ZXJzYWxzID0gMDtcbmNsYXNzIERvbSB7XG4gIHN0YXRpYyBtYXBUYWdzKGRvYywgc2VsZWN0b3IsIGNhbGxiYWNrLCBzdGFydE5vZGUsIGVuZE5vZGUpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIHN0YXJ0ZWQgPSB0cnVlO1xuICAgIGlmIChzdGFydE5vZGUpIHtcbiAgICAgIHN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGVuZGVkID0gZmFsc2U7XG4gICAgdmFyIHtcbiAgICAgIE5vZGUsXG4gICAgICBFbGVtZW50LFxuICAgICAgTm9kZUZpbHRlcixcbiAgICAgIGRvY3VtZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHZhciB0cmVlV2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihkb2MsIE5vZGVGaWx0ZXIuU0hPV19FTEVNRU5UIHwgTm9kZUZpbHRlci5TSE9XX1RFWFQsIHtcbiAgICAgIGFjY2VwdE5vZGU6IChub2RlLCB3YWxrZXIpID0+IHtcbiAgICAgICAgaWYgKCFzdGFydGVkKSB7XG4gICAgICAgICAgaWYgKG5vZGUgPT09IHN0YXJ0Tm9kZSkge1xuICAgICAgICAgICAgc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5kTm9kZSAmJiBub2RlID09PSBlbmROb2RlKSB7XG4gICAgICAgICAgZW5kZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmRlZCkge1xuICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKG5vZGUubWF0Y2hlcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX0FDQ0VQVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX1NLSVA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX0FDQ0VQVDtcbiAgICAgIH1cbiAgICB9LCBmYWxzZSk7XG4gICAgdmFyIHRyYXZlcnNhbCA9IHRyYXZlcnNhbHMrKztcbiAgICB3aGlsZSAodHJlZVdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICByZXN1bHQucHVzaChjYWxsYmFjayh0cmVlV2Fsa2VyLmN1cnJlbnROb2RlLCB0cmVlV2Fsa2VyKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgc3RhdGljIGRpc3BhdGNoRXZlbnQoZG9jLCBldmVudCkge1xuICAgIGRvYy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB0aGlzLm1hcFRhZ3MoZG9jLCBmYWxzZSwgbm9kZSA9PiB7XG4gICAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIH0pO1xuICB9XG59XG5leHBvcnRzLkRvbSA9IERvbTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL01peGluLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5NaXhpbiA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBDb25zdHJ1Y3RvciA9IFN5bWJvbCgnY29uc3RydWN0b3InKTtcbnZhciBNaXhpbkxpc3QgPSBTeW1ib2woJ21peGluTGlzdCcpO1xuY2xhc3MgTWl4aW4ge1xuICBzdGF0aWMgZnJvbShiYXNlQ2xhc3MsIC4uLm1peGlucykge1xuICAgIHZhciBuZXdDbGFzcyA9IGNsYXNzIGV4dGVuZHMgYmFzZUNsYXNzIHtcbiAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3MpIHtcbiAgICAgICAgdmFyIGluc3RhbmNlID0gYmFzZUNsYXNzLmNvbnN0cnVjdG9yID8gc3VwZXIoLi4uYXJncykgOiBudWxsO1xuICAgICAgICBmb3IgKHZhciBtaXhpbiBvZiBtaXhpbnMpIHtcbiAgICAgICAgICBpZiAobWl4aW5bTWl4aW4uQ29uc3RydWN0b3JdKSB7XG4gICAgICAgICAgICBtaXhpbltNaXhpbi5Db25zdHJ1Y3Rvcl0uYXBwbHkodGhpcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN3aXRjaCAodHlwZW9mIG1peGluKSB7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgIE1peGluLm1peENsYXNzKG1peGluLCBuZXdDbGFzcyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgTWl4aW4ubWl4T2JqZWN0KG1peGluLCB0aGlzKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBuZXdDbGFzcztcbiAgfVxuICBzdGF0aWMgbWFrZSguLi5jbGFzc2VzKSB7XG4gICAgdmFyIGJhc2UgPSBjbGFzc2VzLnBvcCgpO1xuICAgIHJldHVybiBNaXhpbi50byhiYXNlLCAuLi5jbGFzc2VzKTtcbiAgfVxuICBzdGF0aWMgdG8oYmFzZSwgLi4ubWl4aW5zKSB7XG4gICAgdmFyIGRlc2NyaXB0b3JzID0ge307XG4gICAgbWl4aW5zLm1hcChtaXhpbiA9PiB7XG4gICAgICBzd2l0Y2ggKHR5cGVvZiBtaXhpbikge1xuICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oZGVzY3JpcHRvcnMsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG1peGluKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGRlc2NyaXB0b3JzLCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhtaXhpbi5wcm90b3R5cGUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSBkZXNjcmlwdG9ycy5jb25zdHJ1Y3RvcjtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGJhc2UucHJvdG90eXBlLCBkZXNjcmlwdG9ycyk7XG4gICAgfSk7XG4gIH1cbiAgc3RhdGljIHdpdGgoLi4ubWl4aW5zKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbShjbGFzcyB7XG4gICAgICBjb25zdHJ1Y3RvcigpIHt9XG4gICAgfSwgLi4ubWl4aW5zKTtcbiAgfVxuICBzdGF0aWMgbWl4T2JqZWN0KG1peGluLCBpbnN0YW5jZSkge1xuICAgIGZvciAodmFyIGZ1bmMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobWl4aW4pKSB7XG4gICAgICBpZiAodHlwZW9mIG1peGluW2Z1bmNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGluc3RhbmNlW2Z1bmNdID0gbWl4aW5bZnVuY10uYmluZChpbnN0YW5jZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW5zdGFuY2VbZnVuY10gPSBtaXhpbltmdW5jXTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2Z1bmMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhtaXhpbikpIHtcbiAgICAgIGlmICh0eXBlb2YgbWl4aW5bX2Z1bmNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGluc3RhbmNlW19mdW5jXSA9IG1peGluW19mdW5jXS5iaW5kKGluc3RhbmNlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnN0YW5jZVtfZnVuY10gPSBtaXhpbltfZnVuY107XG4gICAgfVxuICB9XG4gIHN0YXRpYyBtaXhDbGFzcyhjbHMsIG5ld0NsYXNzKSB7XG4gICAgZm9yICh2YXIgZnVuYyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjbHMucHJvdG90eXBlKSkge1xuICAgICAgaWYgKFsnbmFtZScsICdwcm90b3R5cGUnLCAnbGVuZ3RoJ10uaW5jbHVkZXMoZnVuYykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobmV3Q2xhc3MsIGZ1bmMpO1xuICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGNsc1tmdW5jXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBuZXdDbGFzcy5wcm90b3R5cGVbZnVuY10gPSBjbHMucHJvdG90eXBlW2Z1bmNdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtmdW5jXSA9IGNscy5wcm90b3R5cGVbZnVuY10uYmluZChuZXdDbGFzcy5wcm90b3R5cGUpO1xuICAgIH1cbiAgICBmb3IgKHZhciBfZnVuYzIgb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhjbHMucHJvdG90eXBlKSkge1xuICAgICAgaWYgKHR5cGVvZiBjbHNbX2Z1bmMyXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBuZXdDbGFzcy5wcm90b3R5cGVbX2Z1bmMyXSA9IGNscy5wcm90b3R5cGVbX2Z1bmMyXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBuZXdDbGFzcy5wcm90b3R5cGVbX2Z1bmMyXSA9IGNscy5wcm90b3R5cGVbX2Z1bmMyXS5iaW5kKG5ld0NsYXNzLnByb3RvdHlwZSk7XG4gICAgfVxuICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKFsnbmFtZScsICdwcm90b3R5cGUnLCAnbGVuZ3RoJ10uaW5jbHVkZXMoX2Z1bmMzKSkge1xuICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihuZXdDbGFzcywgX2Z1bmMzKTtcbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGNsc1tfZnVuYzNdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgbmV3Q2xhc3NbX2Z1bmMzXSA9IGNsc1tfZnVuYzNdO1xuICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHZhciBwcmV2ID0gbmV3Q2xhc3NbX2Z1bmMzXSB8fCBmYWxzZTtcbiAgICAgICAgdmFyIG1ldGggPSBjbHNbX2Z1bmMzXS5iaW5kKG5ld0NsYXNzKTtcbiAgICAgICAgbmV3Q2xhc3NbX2Z1bmMzXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgcHJldiAmJiBwcmV2KC4uLmFyZ3MpO1xuICAgICAgICAgIHJldHVybiBtZXRoKC4uLmFyZ3MpO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIF9yZXQ7XG4gICAgZm9yICh2YXIgX2Z1bmMzIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNscykpIHtcbiAgICAgIF9yZXQgPSBfbG9vcCgpO1xuICAgICAgaWYgKF9yZXQgPT09IDApIGNvbnRpbnVlO1xuICAgIH1cbiAgICB2YXIgX2xvb3AyID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHR5cGVvZiBjbHNbX2Z1bmM0XSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBuZXdDbGFzcy5wcm90b3R5cGVbX2Z1bmM0XSA9IGNsc1tfZnVuYzRdO1xuICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgIH1cbiAgICAgIHZhciBwcmV2ID0gbmV3Q2xhc3NbX2Z1bmM0XSB8fCBmYWxzZTtcbiAgICAgIHZhciBtZXRoID0gY2xzW19mdW5jNF0uYmluZChuZXdDbGFzcyk7XG4gICAgICBuZXdDbGFzc1tfZnVuYzRdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgcHJldiAmJiBwcmV2KC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWV0aCguLi5hcmdzKTtcbiAgICAgIH07XG4gICAgfTtcbiAgICBmb3IgKHZhciBfZnVuYzQgb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhjbHMpKSB7XG4gICAgICBpZiAoX2xvb3AyKCkpIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgbWl4KG1peGluVG8pIHtcbiAgICB2YXIgY29uc3RydWN0b3JzID0gW107XG4gICAgdmFyIGFsbFN0YXRpYyA9IHt9O1xuICAgIHZhciBhbGxJbnN0YW5jZSA9IHt9O1xuICAgIHZhciBtaXhhYmxlID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShtaXhpblRvKTtcbiAgICB2YXIgX2xvb3AzID0gZnVuY3Rpb24gKGJhc2UpIHtcbiAgICAgIHZhciBpbnN0YW5jZU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYmFzZS5wcm90b3R5cGUpO1xuICAgICAgdmFyIHN0YXRpY05hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYmFzZSk7XG4gICAgICB2YXIgcHJlZml4ID0gL14oYmVmb3JlfGFmdGVyKV9fKC4rKS87XG4gICAgICB2YXIgX2xvb3A1ID0gZnVuY3Rpb24gKF9tZXRob2ROYW1lMikge1xuICAgICAgICAgIHZhciBtYXRjaCA9IF9tZXRob2ROYW1lMi5tYXRjaChwcmVmaXgpO1xuICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgc3dpdGNoIChtYXRjaFsxXSkge1xuICAgICAgICAgICAgICBjYXNlICdiZWZvcmUnOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYmVmb3JlKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2VbX21ldGhvZE5hbWUyXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnYWZ0ZXInOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYWZ0ZXIoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZVtfbWV0aG9kTmFtZTJdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhbGxTdGF0aWNbX21ldGhvZE5hbWUyXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgYmFzZVtfbWV0aG9kTmFtZTJdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgYWxsU3RhdGljW19tZXRob2ROYW1lMl0gPSBiYXNlW19tZXRob2ROYW1lMl07XG4gICAgICAgIH0sXG4gICAgICAgIF9yZXQyO1xuICAgICAgZm9yICh2YXIgX21ldGhvZE5hbWUyIG9mIHN0YXRpY05hbWVzKSB7XG4gICAgICAgIF9yZXQyID0gX2xvb3A1KF9tZXRob2ROYW1lMik7XG4gICAgICAgIGlmIChfcmV0MiA9PT0gMCkgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgX2xvb3A2ID0gZnVuY3Rpb24gKF9tZXRob2ROYW1lMykge1xuICAgICAgICAgIHZhciBtYXRjaCA9IF9tZXRob2ROYW1lMy5tYXRjaChwcmVmaXgpO1xuICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgc3dpdGNoIChtYXRjaFsxXSkge1xuICAgICAgICAgICAgICBjYXNlICdiZWZvcmUnOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYmVmb3JlKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM10uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FmdGVyJzpcbiAgICAgICAgICAgICAgICBtaXhhYmxlLl9fX2FmdGVyKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZSAhPT0gbWF0Y2hbMl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM10uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFsbEluc3RhbmNlW19tZXRob2ROYW1lM10pIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGJhc2UucHJvdG90eXBlW19tZXRob2ROYW1lM10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBhbGxJbnN0YW5jZVtfbWV0aG9kTmFtZTNdID0gYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXTtcbiAgICAgICAgfSxcbiAgICAgICAgX3JldDM7XG4gICAgICBmb3IgKHZhciBfbWV0aG9kTmFtZTMgb2YgaW5zdGFuY2VOYW1lcykge1xuICAgICAgICBfcmV0MyA9IF9sb29wNihfbWV0aG9kTmFtZTMpO1xuICAgICAgICBpZiAoX3JldDMgPT09IDApIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH07XG4gICAgZm9yICh2YXIgYmFzZSA9IHRoaXM7IGJhc2UgJiYgYmFzZS5wcm90b3R5cGU7IGJhc2UgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYmFzZSkpIHtcbiAgICAgIF9sb29wMyhiYXNlKTtcbiAgICB9XG4gICAgZm9yICh2YXIgbWV0aG9kTmFtZSBpbiBhbGxTdGF0aWMpIHtcbiAgICAgIG1peGluVG9bbWV0aG9kTmFtZV0gPSBhbGxTdGF0aWNbbWV0aG9kTmFtZV0uYmluZChtaXhpblRvKTtcbiAgICB9XG4gICAgdmFyIF9sb29wNCA9IGZ1bmN0aW9uIChfbWV0aG9kTmFtZSkge1xuICAgICAgbWl4aW5Uby5wcm90b3R5cGVbX21ldGhvZE5hbWVdID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGFsbEluc3RhbmNlW19tZXRob2ROYW1lXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH07XG4gICAgfTtcbiAgICBmb3IgKHZhciBfbWV0aG9kTmFtZSBpbiBhbGxJbnN0YW5jZSkge1xuICAgICAgX2xvb3A0KF9tZXRob2ROYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIG1peGFibGU7XG4gIH1cbn1cbmV4cG9ydHMuTWl4aW4gPSBNaXhpbjtcbk1peGluLkNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJvdXRlciA9IHZvaWQgMDtcbnZhciBfVmlldyA9IHJlcXVpcmUoXCIuL1ZpZXdcIik7XG52YXIgX0NhY2hlID0gcmVxdWlyZShcIi4vQ2FjaGVcIik7XG52YXIgX0NvbmZpZyA9IHJlcXVpcmUoXCIuL0NvbmZpZ1wiKTtcbnZhciBfUm91dGVzID0gcmVxdWlyZShcIi4vUm91dGVzXCIpO1xudmFyIF93aW4kQ3VzdG9tRXZlbnQ7XG52YXIgTm90Rm91bmRFcnJvciA9IFN5bWJvbCgnTm90Rm91bmQnKTtcbnZhciBJbnRlcm5hbEVycm9yID0gU3ltYm9sKCdJbnRlcm5hbCcpO1xudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG53aW4uQ3VzdG9tRXZlbnQgPSAoX3dpbiRDdXN0b21FdmVudCA9IHdpbi5DdXN0b21FdmVudCkgIT09IG51bGwgJiYgX3dpbiRDdXN0b21FdmVudCAhPT0gdm9pZCAwID8gX3dpbiRDdXN0b21FdmVudCA6IHdpbi5FdmVudDtcbmNsYXNzIFJvdXRlciB7XG4gIHN0YXRpYyB3YWl0KHZpZXcsIGV2ZW50ID0gJ0RPTUNvbnRlbnRMb2FkZWQnLCBub2RlID0gZG9jdW1lbnQpIHtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsICgpID0+IHtcbiAgICAgIHRoaXMubGlzdGVuKHZpZXcpO1xuICAgIH0pO1xuICB9XG4gIHN0YXRpYyBsaXN0ZW4obGlzdGVuZXIsIHJvdXRlcyA9IGZhbHNlKSB7XG4gICAgdGhpcy5saXN0ZW5lciA9IGxpc3RlbmVyIHx8IHRoaXMubGlzdGVuZXI7XG4gICAgdGhpcy5yb3V0ZXMgPSByb3V0ZXMgfHwgbGlzdGVuZXIucm91dGVzO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5xdWVyeSwgdGhpcy5xdWVyeU92ZXIoe30pKTtcbiAgICB2YXIgbGlzdGVuID0gZXZlbnQgPT4ge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChldmVudC5zdGF0ZSAmJiAncm91dGVkSWQnIGluIGV2ZW50LnN0YXRlKSB7XG4gICAgICAgIGlmIChldmVudC5zdGF0ZS5yb3V0ZWRJZCA8PSB0aGlzLnJvdXRlQ291bnQpIHtcbiAgICAgICAgICB0aGlzLmhpc3Rvcnkuc3BsaWNlKGV2ZW50LnN0YXRlLnJvdXRlZElkKTtcbiAgICAgICAgICB0aGlzLnJvdXRlQ291bnQgPSBldmVudC5zdGF0ZS5yb3V0ZWRJZDtcbiAgICAgICAgfSBlbHNlIGlmIChldmVudC5zdGF0ZS5yb3V0ZWRJZCA+IHRoaXMucm91dGVDb3VudCkge1xuICAgICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKGV2ZW50LnN0YXRlLnByZXYpO1xuICAgICAgICAgIHRoaXMucm91dGVDb3VudCA9IGV2ZW50LnN0YXRlLnJvdXRlZElkO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdGUgPSBldmVudC5zdGF0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLnByZXZQYXRoICE9PSBudWxsICYmIHRoaXMucHJldlBhdGggIT09IGxvY2F0aW9uLnBhdGhuYW1lKSB7XG4gICAgICAgICAgdGhpcy5oaXN0b3J5LnB1c2godGhpcy5wcmV2UGF0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pKSB7XG4gICAgICAgIHRoaXMubWF0Y2gobG9jYXRpb24ucGF0aG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubWF0Y2godGhpcy5uZXh0UGF0aCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2N2VXJsQ2hhbmdlZCcsIGxpc3Rlbik7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgbGlzdGVuKTtcbiAgICB2YXIgcm91dGUgPSAhdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pID8gbG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5zZWFyY2ggOiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSAmJiBsb2NhdGlvbi5oYXNoKSB7XG4gICAgICByb3V0ZSArPSBsb2NhdGlvbi5oYXNoO1xuICAgIH1cbiAgICB2YXIgc3RhdGUgPSB7XG4gICAgICByb3V0ZWRJZDogdGhpcy5yb3V0ZUNvdW50LFxuICAgICAgdXJsOiBsb2NhdGlvbi5wYXRobmFtZSxcbiAgICAgIHByZXY6IHRoaXMucHJldlBhdGhcbiAgICB9O1xuICAgIGlmICghdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pKSB7XG4gICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShzdGF0ZSwgbnVsbCwgbG9jYXRpb24ucGF0aG5hbWUpO1xuICAgIH1cbiAgICB0aGlzLmdvKHJvdXRlICE9PSBmYWxzZSA/IHJvdXRlIDogJy8nKTtcbiAgfVxuICBzdGF0aWMgZ28ocGF0aCwgc2lsZW50ID0gZmFsc2UpIHtcbiAgICB2YXIgY29uZmlnVGl0bGUgPSBfQ29uZmlnLkNvbmZpZy5nZXQoJ3RpdGxlJyk7XG4gICAgaWYgKGNvbmZpZ1RpdGxlKSB7XG4gICAgICBkb2N1bWVudC50aXRsZSA9IGNvbmZpZ1RpdGxlO1xuICAgIH1cbiAgICB2YXIgc3RhdGUgPSB7XG4gICAgICByb3V0ZWRJZDogdGhpcy5yb3V0ZUNvdW50LFxuICAgICAgcHJldjogdGhpcy5wcmV2UGF0aCxcbiAgICAgIHVybDogbG9jYXRpb24ucGF0aG5hbWVcbiAgICB9O1xuICAgIGlmIChzaWxlbnQgPT09IC0xKSB7XG4gICAgICB0aGlzLm1hdGNoKHBhdGgsIHRoaXMubGlzdGVuZXIsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pKSB7XG4gICAgICB0aGlzLm5leHRQYXRoID0gcGF0aDtcbiAgICB9IGVsc2UgaWYgKHNpbGVudCA9PT0gMiAmJiBsb2NhdGlvbi5wYXRobmFtZSAhPT0gcGF0aCkge1xuICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoc3RhdGUsIG51bGwsIHBhdGgpO1xuICAgIH0gZWxzZSBpZiAobG9jYXRpb24ucGF0aG5hbWUgIT09IHBhdGgpIHtcbiAgICAgIGhpc3RvcnkucHVzaFN0YXRlKHN0YXRlLCBudWxsLCBwYXRoKTtcbiAgICB9XG4gICAgaWYgKCFzaWxlbnQgfHwgc2lsZW50IDwgMCkge1xuICAgICAgaWYgKHNpbGVudCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5wYXRoID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgIGlmIChwYXRoLnN1YnN0cmluZygwLCAxKSA9PT0gJyMnKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEhhc2hDaGFuZ2VFdmVudCgnaGFzaGNoYW5nZScpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2VXJsQ2hhbmdlZCcpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnByZXZQYXRoID0gcGF0aDtcbiAgfVxuICBzdGF0aWMgcHJvY2Vzc1JvdXRlKHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKHR5cGVvZiByb3V0ZXNbc2VsZWN0ZWRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAocm91dGVzW3NlbGVjdGVkXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIHJlc3VsdCA9IG5ldyByb3V0ZXNbc2VsZWN0ZWRdKGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gcm91dGVzW3NlbGVjdGVkXShhcmdzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gcm91dGVzW3NlbGVjdGVkXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBzdGF0aWMgaGFuZGxlRXJyb3IoZXJyb3IsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGxpc3RlbmVyLCBwYXRoLCBwcmV2LCBmb3JjZVJlZnJlc2gpIHtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGVFcnJvcicsIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgcGF0aCxcbiAgICAgICAgICBwcmV2LFxuICAgICAgICAgIHZpZXc6IGxpc3RlbmVyLFxuICAgICAgICAgIHJvdXRlcyxcbiAgICAgICAgICBzZWxlY3RlZFxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSB3aW5bJ2Rldk1vZGUnXSA/ICdVbmV4cGVjdGVkIGVycm9yOiAnICsgU3RyaW5nKGVycm9yKSA6ICdVbmV4cGVjdGVkIGVycm9yLic7XG4gICAgaWYgKHJvdXRlc1tJbnRlcm5hbEVycm9yXSkge1xuICAgICAgYXJnc1tJbnRlcm5hbEVycm9yXSA9IGVycm9yO1xuICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzUm91dGUocm91dGVzLCBJbnRlcm5hbEVycm9yLCBhcmdzKTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKTtcbiAgfVxuICBzdGF0aWMgbWF0Y2gocGF0aCwgbGlzdGVuZXIsIG9wdGlvbnMgPSBmYWxzZSkge1xuICAgIHZhciBldmVudCA9IG51bGwsXG4gICAgICByZXF1ZXN0ID0gbnVsbCxcbiAgICAgIGZvcmNlUmVmcmVzaCA9IGZhbHNlO1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBmb3JjZVJlZnJlc2ggPSBvcHRpb25zO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvcmNlUmVmcmVzaCA9IG9wdGlvbnMuZm9yY2VSZWZyZXNoO1xuICAgICAgZXZlbnQgPSBvcHRpb25zLmV2ZW50O1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnBhdGggPT09IHBhdGggJiYgIWZvcmNlUmVmcmVzaCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgb3JpZ2luID0gJ2h0dHA6Ly9leGFtcGxlLmNvbSc7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIG9yaWdpbiA9IHRoaXMuaXNPcmlnaW5MaW1pdGVkKGxvY2F0aW9uKSA/IG9yaWdpbiA6IGxvY2F0aW9uLm9yaWdpbjtcbiAgICAgIHRoaXMucXVlcnlTdHJpbmcgPSBsb2NhdGlvbi5zZWFyY2g7XG4gICAgfVxuICAgIHZhciB1cmwgPSBuZXcgVVJMKHBhdGgsIG9yaWdpbik7XG4gICAgcGF0aCA9IHRoaXMucGF0aCA9IHVybC5wYXRobmFtZTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5xdWVyeVN0cmluZyA9IHVybC5zZWFyY2g7XG4gICAgfVxuICAgIHZhciBwcmV2ID0gdGhpcy5wcmV2UGF0aDtcbiAgICB2YXIgY3VycmVudCA9IGxpc3RlbmVyICYmIGxpc3RlbmVyLmFyZ3MgPyBsaXN0ZW5lci5hcmdzLmNvbnRlbnQgOiBudWxsO1xuICAgIHZhciByb3V0ZXMgPSB0aGlzLnJvdXRlcyB8fCBsaXN0ZW5lciAmJiBsaXN0ZW5lci5yb3V0ZXMgfHwgX1JvdXRlcy5Sb3V0ZXMuZHVtcCgpO1xuICAgIHZhciBxdWVyeSA9IG5ldyBVUkxTZWFyY2hQYXJhbXModGhpcy5xdWVyeVN0cmluZyk7XG4gICAgaWYgKGV2ZW50ICYmIGV2ZW50LnJlcXVlc3QpIHtcbiAgICAgIHRoaXMucmVxdWVzdCA9IGV2ZW50LnJlcXVlc3Q7XG4gICAgfVxuICAgIGZvciAodmFyIGtleSBpbiBPYmplY3Qua2V5cyh0aGlzLnF1ZXJ5KSkge1xuICAgICAgZGVsZXRlIHRoaXMucXVlcnlba2V5XTtcbiAgICB9XG4gICAgZm9yICh2YXIgW19rZXksIHZhbHVlXSBvZiBxdWVyeSkge1xuICAgICAgdGhpcy5xdWVyeVtfa2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgICB2YXIgYXJncyA9IHt9LFxuICAgICAgc2VsZWN0ZWQgPSBmYWxzZSxcbiAgICAgIHJlc3VsdCA9ICcnO1xuICAgIGlmIChwYXRoLnN1YnN0cmluZygwLCAxKSA9PT0gJy8nKSB7XG4gICAgICBwYXRoID0gcGF0aC5zdWJzdHJpbmcoMSk7XG4gICAgfVxuICAgIHBhdGggPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnF1ZXJ5KSB7XG4gICAgICBhcmdzW2ldID0gdGhpcy5xdWVyeVtpXTtcbiAgICB9XG4gICAgTDE6IGZvciAodmFyIF9pIGluIHJvdXRlcykge1xuICAgICAgdmFyIHJvdXRlID0gX2kuc3BsaXQoJy8nKTtcbiAgICAgIGlmIChyb3V0ZS5sZW5ndGggPCBwYXRoLmxlbmd0aCAmJiByb3V0ZVtyb3V0ZS5sZW5ndGggLSAxXSAhPT0gJyonKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgTDI6IGZvciAodmFyIGogaW4gcm91dGUpIHtcbiAgICAgICAgaWYgKHJvdXRlW2pdLnN1YnN0cigwLCAxKSA9PSAnJScpIHtcbiAgICAgICAgICB2YXIgYXJnTmFtZSA9IG51bGw7XG4gICAgICAgICAgdmFyIGdyb3VwcyA9IC9eJShcXHcrKVxcPz8vLmV4ZWMocm91dGVbal0pO1xuICAgICAgICAgIGlmIChncm91cHMgJiYgZ3JvdXBzWzFdKSB7XG4gICAgICAgICAgICBhcmdOYW1lID0gZ3JvdXBzWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWFyZ05hbWUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtyb3V0ZVtqXX0gaXMgbm90IGEgdmFsaWQgYXJndW1lbnQgc2VnbWVudCBpbiByb3V0ZSBcIiR7X2l9XCJgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFwYXRoW2pdKSB7XG4gICAgICAgICAgICBpZiAocm91dGVbal0uc3Vic3RyKHJvdXRlW2pdLmxlbmd0aCAtIDEsIDEpID09ICc/Jykge1xuICAgICAgICAgICAgICBhcmdzW2FyZ05hbWVdID0gJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250aW51ZSBMMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXJnc1thcmdOYW1lXSA9IHBhdGhbal07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJvdXRlW2pdICE9PSAnKicgJiYgcGF0aFtqXSAhPT0gcm91dGVbal0pIHtcbiAgICAgICAgICBjb250aW51ZSBMMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2VsZWN0ZWQgPSBfaTtcbiAgICAgIHJlc3VsdCA9IHJvdXRlc1tfaV07XG4gICAgICBpZiAocm91dGVbcm91dGUubGVuZ3RoIC0gMV0gPT09ICcqJykge1xuICAgICAgICBhcmdzLnBhdGhwYXJ0cyA9IHBhdGguc2xpY2Uocm91dGUubGVuZ3RoIC0gMSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgdmFyIGV2ZW50U3RhcnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGVTdGFydCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcHJldixcbiAgICAgICAgcm9vdDogbGlzdGVuZXIsXG4gICAgICAgIHNlbGVjdGVkLFxuICAgICAgICByb3V0ZXNcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKCFkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50U3RhcnQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFmb3JjZVJlZnJlc2ggJiYgbGlzdGVuZXIgJiYgY3VycmVudCAmJiB0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0JyAmJiBjdXJyZW50LmNvbnN0cnVjdG9yID09PSByZXN1bHQuY29uc3RydWN0b3IgJiYgIShyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSAmJiBjdXJyZW50LnVwZGF0ZShhcmdzKSkge1xuICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50ID0gY3VycmVudDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoIShzZWxlY3RlZCBpbiByb3V0ZXMpKSB7XG4gICAgICByb3V0ZXNbc2VsZWN0ZWRdID0gcm91dGVzW05vdEZvdW5kRXJyb3JdO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gdGhpcy5wcm9jZXNzUm91dGUocm91dGVzLCBzZWxlY3RlZCwgYXJncyk7XG4gICAgICBpZiAocmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NSb3V0ZShyb3V0ZXMsIE5vdEZvdW5kRXJyb3IsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKCEocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIGlmICghKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKHJlYWxSZXN1bHQgPT4gdGhpcy51cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlYWxSZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCkpLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgdGhpcy5oYW5kbGVFcnJvcihlcnJvciwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgbGlzdGVuZXIsIHBhdGgsIHByZXYsIGZvcmNlUmVmcmVzaCk7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5oYW5kbGVFcnJvcihlcnJvciwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgbGlzdGVuZXIsIHBhdGgsIHByZXYsIGZvcmNlUmVmcmVzaCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyB1cGRhdGUobGlzdGVuZXIsIHBhdGgsIHJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKSB7XG4gICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcHJldiA9IHRoaXMucHJldlBhdGg7XG4gICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICByZXN1bHQsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIHByZXYsXG4gICAgICAgIHZpZXc6IGxpc3RlbmVyLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHNlbGVjdGVkXG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgIGlmIChsaXN0ZW5lci5hcmdzLmNvbnRlbnQgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudC5wYXVzZSh0cnVlKTtcbiAgICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50LnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgaWYgKGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIGxpc3RlbmVyLmFyZ3MuY29udGVudCA9IHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIHJlc3VsdC5wYXVzZShmYWxzZSk7XG4gICAgICAgIHJlc3VsdC51cGRhdGUoYXJncywgZm9yY2VSZWZyZXNoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGV2ZW50RW5kID0gbmV3IEN1c3RvbUV2ZW50KCdjdlJvdXRlRW5kJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICByZXN1bHQsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIHByZXYsXG4gICAgICAgIHZpZXc6IGxpc3RlbmVyLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHNlbGVjdGVkXG4gICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudEVuZCk7XG4gIH1cbiAgc3RhdGljIGlzT3JpZ2luTGltaXRlZCh7XG4gICAgb3JpZ2luXG4gIH0pIHtcbiAgICByZXR1cm4gb3JpZ2luID09PSAnbnVsbCcgfHwgb3JpZ2luID09PSAnZmlsZTovLyc7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5T3ZlcihhcmdzID0ge30pIHtcbiAgICB2YXIgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpO1xuICAgIHZhciBmaW5hbEFyZ3MgPSB7fTtcbiAgICB2YXIgcXVlcnkgPSB7fTtcbiAgICBmb3IgKHZhciBwYWlyIG9mIHBhcmFtcykge1xuICAgICAgcXVlcnlbcGFpclswXV0gPSBwYWlyWzFdO1xuICAgIH1cbiAgICBmaW5hbEFyZ3MgPSBPYmplY3QuYXNzaWduKGZpbmFsQXJncywgcXVlcnksIGFyZ3MpO1xuICAgIGRlbGV0ZSBmaW5hbEFyZ3NbJ2FwaSddO1xuICAgIHJldHVybiBmaW5hbEFyZ3M7XG5cbiAgICAvLyBmb3IobGV0IGkgaW4gcXVlcnkpXG4gICAgLy8ge1xuICAgIC8vIFx0ZmluYWxBcmdzW2ldID0gcXVlcnlbaV07XG4gICAgLy8gfVxuXG4gICAgLy8gZm9yKGxldCBpIGluIGFyZ3MpXG4gICAgLy8ge1xuICAgIC8vIFx0ZmluYWxBcmdzW2ldID0gYXJnc1tpXTtcbiAgICAvLyB9XG4gIH1cbiAgc3RhdGljIHF1ZXJ5VG9TdHJpbmcoYXJncyA9IHt9LCBmcmVzaCA9IGZhbHNlKSB7XG4gICAgdmFyIHBhcnRzID0gW10sXG4gICAgICBmaW5hbEFyZ3MgPSBhcmdzO1xuICAgIGlmICghZnJlc2gpIHtcbiAgICAgIGZpbmFsQXJncyA9IHRoaXMucXVlcnlPdmVyKGFyZ3MpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIGZpbmFsQXJncykge1xuICAgICAgaWYgKGZpbmFsQXJnc1tpXSA9PT0gJycpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBwYXJ0cy5wdXNoKGkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoZmluYWxBcmdzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBwYXJ0cy5qb2luKCcmJyk7XG4gIH1cbiAgc3RhdGljIHNldFF1ZXJ5KG5hbWUsIHZhbHVlLCBzaWxlbnQpIHtcbiAgICB2YXIgYXJncyA9IHRoaXMucXVlcnlPdmVyKCk7XG4gICAgYXJnc1tuYW1lXSA9IHZhbHVlO1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBkZWxldGUgYXJnc1tuYW1lXTtcbiAgICB9XG4gICAgdmFyIHF1ZXJ5U3RyaW5nID0gdGhpcy5xdWVyeVRvU3RyaW5nKGFyZ3MsIHRydWUpO1xuICAgIHRoaXMuZ28obG9jYXRpb24ucGF0aG5hbWUgKyAocXVlcnlTdHJpbmcgPyAnPycgKyBxdWVyeVN0cmluZyA6ICc/JyksIHNpbGVudCk7XG4gIH1cbn1cbmV4cG9ydHMuUm91dGVyID0gUm91dGVyO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3F1ZXJ5Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZToge31cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ2hpc3RvcnknLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBbXVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncm91dGVDb3VudCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogMFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncHJldlBhdGgnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IG51bGxcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ3F1ZXJ5U3RyaW5nJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiBudWxsXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdJbnRlcm5hbEVycm9yJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogSW50ZXJuYWxFcnJvclxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAnTm90Rm91bmRFcnJvcicsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IE5vdEZvdW5kRXJyb3Jcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Sb3V0ZXMgPSB2b2lkIDA7XG52YXIgQXBwUm91dGVzID0ge307XG52YXIgX3JlcXVpcmUgPSByZXF1aXJlO1xudmFyIGltcG9ydGVkID0gZmFsc2U7XG52YXIgcnVuSW1wb3J0ID0gKCkgPT4ge1xuICBpZiAoaW1wb3J0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgO1xuICB0cnkge1xuICAgIE9iamVjdC5hc3NpZ24oQXBwUm91dGVzLCBfcmVxdWlyZSgnUm91dGVzJykuUm91dGVzIHx8IHt9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBnbG9iYWxUaGlzLmRldk1vZGUgPT09IHRydWUgJiYgY29uc29sZS53YXJuKGVycm9yKTtcbiAgfVxuICBpbXBvcnRlZCA9IHRydWU7XG59O1xuY2xhc3MgUm91dGVzIHtcbiAgc3RhdGljIGdldChuYW1lKSB7XG4gICAgcnVuSW1wb3J0KCk7XG4gICAgcmV0dXJuIHRoaXMucm91dGVzW25hbWVdO1xuICB9XG4gIHN0YXRpYyBkdW1wKCkge1xuICAgIHJ1bkltcG9ydCgpO1xuICAgIHJldHVybiB0aGlzLnJvdXRlcztcbiAgfVxufVxuZXhwb3J0cy5Sb3V0ZXMgPSBSb3V0ZXM7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVzLCAncm91dGVzJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogQXBwUm91dGVzXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJ1bGVTZXQgPSB2b2lkIDA7XG52YXIgX0RvbSA9IHJlcXVpcmUoXCIuL0RvbVwiKTtcbnZhciBfVGFnID0gcmVxdWlyZShcIi4vVGFnXCIpO1xudmFyIF9WaWV3ID0gcmVxdWlyZShcIi4vVmlld1wiKTtcbmNsYXNzIFJ1bGVTZXQge1xuICBzdGF0aWMgYWRkKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHRoaXMuZ2xvYmFsUnVsZXMgPSB0aGlzLmdsb2JhbFJ1bGVzIHx8IHt9O1xuICAgIHRoaXMuZ2xvYmFsUnVsZXNbc2VsZWN0b3JdID0gdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0gfHwgW107XG4gICAgdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0ucHVzaChjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgc3RhdGljIGFwcGx5KGRvYyA9IGRvY3VtZW50LCB2aWV3ID0gbnVsbCkge1xuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIHRoaXMuZ2xvYmFsUnVsZXMpIHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl1baV07XG4gICAgICAgIHZhciB3cmFwcGVkID0gdGhpcy53cmFwKGRvYywgY2FsbGJhY2ssIHZpZXcpO1xuICAgICAgICB2YXIgbm9kZXMgPSBkb2MucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGZvciAodmFyIG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICB3cmFwcGVkKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGFkZChzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICB0aGlzLnJ1bGVzID0gdGhpcy5ydWxlcyB8fCB7fTtcbiAgICB0aGlzLnJ1bGVzW3NlbGVjdG9yXSA9IHRoaXMucnVsZXNbc2VsZWN0b3JdIHx8IFtdO1xuICAgIHRoaXMucnVsZXNbc2VsZWN0b3JdLnB1c2goY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIGFwcGx5KGRvYyA9IGRvY3VtZW50LCB2aWV3ID0gbnVsbCkge1xuICAgIFJ1bGVTZXQuYXBwbHkoZG9jLCB2aWV3KTtcbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiB0aGlzLnJ1bGVzKSB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMucnVsZXNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHRoaXMucnVsZXNbc2VsZWN0b3JdW2ldO1xuICAgICAgICB2YXIgd3JhcHBlZCA9IFJ1bGVTZXQud3JhcChkb2MsIGNhbGxiYWNrLCB2aWV3KTtcbiAgICAgICAgdmFyIG5vZGVzID0gZG9jLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBmb3IgKHZhciBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgd3JhcHBlZChub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBwdXJnZSgpIHtcbiAgICBpZiAoIXRoaXMucnVsZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yICh2YXIgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMucnVsZXMpKSB7XG4gICAgICBpZiAoIXRoaXMucnVsZXNba10pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBrayBpbiB0aGlzLnJ1bGVzW2tdKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnJ1bGVzW2tdW2trXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgc3RhdGljIHdhaXQoZXZlbnQgPSAnRE9NQ29udGVudExvYWRlZCcsIG5vZGUgPSBkb2N1bWVudCkge1xuICAgIHZhciBsaXN0ZW5lciA9ICgoZXZlbnQsIG5vZGUpID0+ICgpID0+IHtcbiAgICAgIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXMuYXBwbHkoKTtcbiAgICB9KShldmVudCwgbm9kZSk7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gIH1cbiAgc3RhdGljIHdyYXAoZG9jLCBvcmlnaW5hbENhbGxiYWNrLCB2aWV3ID0gbnVsbCkge1xuICAgIHZhciBjYWxsYmFjayA9IG9yaWdpbmFsQ2FsbGJhY2s7XG4gICAgaWYgKG9yaWdpbmFsQ2FsbGJhY2sgaW5zdGFuY2VvZiBfVmlldy5WaWV3IHx8IG9yaWdpbmFsQ2FsbGJhY2sgJiYgb3JpZ2luYWxDYWxsYmFjay5wcm90b3R5cGUgJiYgb3JpZ2luYWxDYWxsYmFjay5wcm90b3R5cGUgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICBjYWxsYmFjayA9ICgpID0+IG9yaWdpbmFsQ2FsbGJhY2s7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50ID0+IHtcbiAgICAgIGlmICh0eXBlb2YgZWxlbWVudC5fX19jdkFwcGxpZWRfX18gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlbGVtZW50LCAnX19fY3ZBcHBsaWVkX19fJywge1xuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgICB2YWx1ZTogbmV3IFdlYWtTZXQoKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChlbGVtZW50Ll9fX2N2QXBwbGllZF9fXy5oYXMob3JpZ2luYWxDYWxsYmFjaykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGRpcmVjdCwgcGFyZW50VmlldztcbiAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgIGRpcmVjdCA9IHBhcmVudFZpZXcgPSB2aWV3O1xuICAgICAgICBpZiAodmlldy52aWV3TGlzdCkge1xuICAgICAgICAgIHBhcmVudFZpZXcgPSB2aWV3LnZpZXdMaXN0LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIHRhZyA9IG5ldyBfVGFnLlRhZyhlbGVtZW50LCBwYXJlbnRWaWV3LCBudWxsLCB1bmRlZmluZWQsIGRpcmVjdCk7XG4gICAgICB2YXIgcGFyZW50ID0gdGFnLmVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgIHZhciBzaWJsaW5nID0gdGFnLmVsZW1lbnQubmV4dFNpYmxpbmc7XG4gICAgICB2YXIgcmVzdWx0ID0gY2FsbGJhY2sodGFnKTtcbiAgICAgIGlmIChyZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICAgIGVsZW1lbnQuX19fY3ZBcHBsaWVkX19fLmFkZChvcmlnaW5hbENhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICByZXN1bHQgPSBuZXcgX1RhZy5UYWcocmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgICBpZiAoIXJlc3VsdC5lbGVtZW50LmNvbnRhaW5zKHRhZy5lbGVtZW50KSkge1xuICAgICAgICAgIHdoaWxlICh0YWcuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICByZXN1bHQuZWxlbWVudC5hcHBlbmRDaGlsZCh0YWcuZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaWJsaW5nKSB7XG4gICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShyZXN1bHQuZWxlbWVudCwgc2libGluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKHJlc3VsdC5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQucHJvdG90eXBlICYmIHJlc3VsdC5wcm90b3R5cGUgaW5zdGFuY2VvZiBfVmlldy5WaWV3KSB7XG4gICAgICAgIHJlc3VsdCA9IG5ldyByZXN1bHQoe30sIHZpZXcpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICB2aWV3LmNsZWFudXAucHVzaCgoKSA9PiByZXN1bHQucmVtb3ZlKCkpO1xuICAgICAgICAgIHZpZXcuY2xlYW51cC5wdXNoKHZpZXcuYXJncy5iaW5kVG8oKHYsIGssIHQpID0+IHtcbiAgICAgICAgICAgIHRba10gPSB2O1xuICAgICAgICAgICAgcmVzdWx0LmFyZ3Nba10gPSB2O1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgICB2aWV3LmNsZWFudXAucHVzaChyZXN1bHQuYXJncy5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICAgIHRba10gPSB2O1xuICAgICAgICAgICAgdmlldy5hcmdzW2tdID0gdjtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgdGFnLmNsZWFyKCk7XG4gICAgICAgIHJlc3VsdC5yZW5kZXIodGFnLmVsZW1lbnQpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuUnVsZVNldCA9IFJ1bGVTZXQ7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9TZXRNYXAuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlNldE1hcCA9IHZvaWQgMDtcbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShlLCByLCB0KSB7IHJldHVybiAociA9IF90b1Byb3BlcnR5S2V5KHIpKSBpbiBlID8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsIHIsIHsgdmFsdWU6IHQsIGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAgfSkgOiBlW3JdID0gdCwgZTsgfVxuZnVuY3Rpb24gX3RvUHJvcGVydHlLZXkodCkgeyB2YXIgaSA9IF90b1ByaW1pdGl2ZSh0LCBcInN0cmluZ1wiKTsgcmV0dXJuIFwic3ltYm9sXCIgPT0gdHlwZW9mIGkgPyBpIDogaSArIFwiXCI7IH1cbmZ1bmN0aW9uIF90b1ByaW1pdGl2ZSh0LCByKSB7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiB0IHx8ICF0KSByZXR1cm4gdDsgdmFyIGUgPSB0W1N5bWJvbC50b1ByaW1pdGl2ZV07IGlmICh2b2lkIDAgIT09IGUpIHsgdmFyIGkgPSBlLmNhbGwodCwgciB8fCBcImRlZmF1bHRcIik7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiBpKSByZXR1cm4gaTsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkBAdG9QcmltaXRpdmUgbXVzdCByZXR1cm4gYSBwcmltaXRpdmUgdmFsdWUuXCIpOyB9IHJldHVybiAoXCJzdHJpbmdcIiA9PT0gciA/IFN0cmluZyA6IE51bWJlcikodCk7IH1cbmNsYXNzIFNldE1hcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIF9kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIl9tYXBcIiwgbmV3IE1hcCgpKTtcbiAgfVxuICBoYXMoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5oYXMoa2V5KTtcbiAgfVxuICBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgfVxuICBnZXRPbmUoa2V5KSB7XG4gICAgdmFyIHNldCA9IHRoaXMuZ2V0KGtleSk7XG4gICAgZm9yICh2YXIgZW50cnkgb2Ygc2V0KSB7XG4gICAgICByZXR1cm4gZW50cnk7XG4gICAgfVxuICB9XG4gIGFkZChrZXksIHZhbHVlKSB7XG4gICAgdmFyIHNldCA9IHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgICBpZiAoIXNldCkge1xuICAgICAgdGhpcy5fbWFwLnNldChrZXksIHNldCA9IG5ldyBTZXQoKSk7XG4gICAgfVxuICAgIHJldHVybiBzZXQuYWRkKHZhbHVlKTtcbiAgfVxuICByZW1vdmUoa2V5LCB2YWx1ZSkge1xuICAgIHZhciBzZXQgPSB0aGlzLl9tYXAuZ2V0KGtleSk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlcyA9IHNldC5kZWxldGUodmFsdWUpO1xuICAgIGlmICghc2V0LnNpemUpIHtcbiAgICAgIHRoaXMuX21hcC5kZWxldGUoa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuICB2YWx1ZXMoKSB7XG4gICAgcmV0dXJuIG5ldyBTZXQoLi4uWy4uLnRoaXMuX21hcC52YWx1ZXMoKV0ubWFwKHNldCA9PiBbLi4uc2V0LnZhbHVlcygpXSkpO1xuICB9XG59XG5leHBvcnRzLlNldE1hcCA9IFNldE1hcDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1RhZy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVGFnID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIEN1cnJlbnRTdHlsZSA9IFN5bWJvbCgnQ3VycmVudFN0eWxlJyk7XG52YXIgQ3VycmVudEF0dHJzID0gU3ltYm9sKCdDdXJyZW50QXR0cnMnKTtcbnZhciBzdHlsZXIgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gIGlmICghdGhpcy5ub2RlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAodmFyIHByb3BlcnR5IGluIHN0eWxlcykge1xuICAgIHZhciBzdHJpbmdlZFByb3BlcnR5ID0gU3RyaW5nKHN0eWxlc1twcm9wZXJ0eV0pO1xuICAgIGlmICh0aGlzW0N1cnJlbnRTdHlsZV0uaGFzKHByb3BlcnR5KSAmJiB0aGlzW0N1cnJlbnRTdHlsZV0uZ2V0KHByb3BlcnR5KSA9PT0gc3R5bGVzW3Byb3BlcnR5XSB8fCBOdW1iZXIuaXNOYU4oc3R5bGVzW3Byb3BlcnR5XSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAocHJvcGVydHlbMF0gPT09ICctJykge1xuICAgICAgdGhpcy5ub2RlLnN0eWxlLnNldFByb3BlcnR5KHByb3BlcnR5LCBzdHJpbmdlZFByb3BlcnR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ub2RlLnN0eWxlW3Byb3BlcnR5XSA9IHN0cmluZ2VkUHJvcGVydHk7XG4gICAgfVxuICAgIGlmIChzdHlsZXNbcHJvcGVydHldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5zZXQocHJvcGVydHksIHN0eWxlc1twcm9wZXJ0eV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uZGVsZXRlKHByb3BlcnR5KTtcbiAgICB9XG4gIH1cbn07XG52YXIgZ2V0dGVyID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgaWYgKHR5cGVvZiB0aGlzW25hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHRoaXNbbmFtZV07XG4gIH1cbiAgaWYgKHRoaXMubm9kZSAmJiB0eXBlb2YgdGhpcy5ub2RlW25hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHRoaXNbbmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5ub2RlW25hbWVdKC4uLmFyZ3MpO1xuICB9XG4gIGlmIChuYW1lID09PSAnc3R5bGUnKSB7XG4gICAgcmV0dXJuIHRoaXMucHJveHkuc3R5bGU7XG4gIH1cbiAgaWYgKHRoaXMubm9kZSAmJiBuYW1lIGluIHRoaXMubm9kZSkge1xuICAgIHJldHVybiB0aGlzLm5vZGVbbmFtZV07XG4gIH1cbiAgcmV0dXJuIHRoaXNbbmFtZV07XG59O1xuY2xhc3MgVGFnIHtcbiAgY29uc3RydWN0b3IoZWxlbWVudCwgcGFyZW50LCByZWYsIGluZGV4LCBkaXJlY3QpIHtcbiAgICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIgc3ViZG9jID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQoZWxlbWVudCk7XG4gICAgICBlbGVtZW50ID0gc3ViZG9jLmZpcnN0Q2hpbGQ7XG4gICAgfVxuICAgIHRoaXMuZWxlbWVudCA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoZWxlbWVudCk7XG4gICAgdGhpcy5ub2RlID0gdGhpcy5lbGVtZW50O1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuZGlyZWN0ID0gZGlyZWN0O1xuICAgIHRoaXMucmVmID0gcmVmO1xuICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICB0aGlzLmNsZWFudXAgPSBbXTtcbiAgICB0aGlzW19CaW5kYWJsZS5CaW5kYWJsZS5PbkFsbEdldF0gPSBnZXR0ZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzW0N1cnJlbnRTdHlsZV0gPSBuZXcgTWFwKCk7XG4gICAgdGhpc1tDdXJyZW50QXR0cnNdID0gbmV3IE1hcCgpO1xuICAgIHZhciBib3VuZFN0eWxlciA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHN0eWxlci5iaW5kKHRoaXMpKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N0eWxlJywge1xuICAgICAgdmFsdWU6IGJvdW5kU3R5bGVyXG4gICAgfSk7XG4gICAgdGhpcy5wcm94eSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHRoaXMpO1xuICAgIHRoaXMucHJveHkuc3R5bGUuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICBpZiAodGhpc1tDdXJyZW50U3R5bGVdLmhhcyhrKSAmJiB0aGlzW0N1cnJlbnRTdHlsZV0uZ2V0KGspID09PSB2KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMubm9kZS5zdHlsZVtrXSA9IHY7XG4gICAgICBpZiAoIWQgJiYgdiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5zZXQoaywgdik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzW0N1cnJlbnRTdHlsZV0uZGVsZXRlKGspO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucHJveHkuYmluZFRvKCh2LCBrKSA9PiB7XG4gICAgICBpZiAoayA9PT0gJ2luZGV4Jykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoayBpbiBlbGVtZW50ICYmIGVsZW1lbnRba10gIT09IHYpIHtcbiAgICAgICAgZWxlbWVudFtrXSA9IHY7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucHJveHk7XG4gIH1cbiAgYXR0cihhdHRyaWJ1dGVzKSB7XG4gICAgZm9yICh2YXIgYXR0cmlidXRlIGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgIGlmICh0aGlzW0N1cnJlbnRBdHRyc10uaGFzKGF0dHJpYnV0ZSkgJiYgYXR0cmlidXRlc1thdHRyaWJ1dGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5ub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICAgICAgICB0aGlzW0N1cnJlbnRBdHRyc10uZGVsZXRlKGF0dHJpYnV0ZSk7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzW0N1cnJlbnRBdHRyc10uaGFzKGF0dHJpYnV0ZSkgfHwgdGhpc1tDdXJyZW50QXR0cnNdLmdldChhdHRyaWJ1dGUpICE9PSBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pIHtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9PT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMubm9kZS5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCAnJyk7XG4gICAgICAgICAgdGhpc1tDdXJyZW50QXR0cnNdLnNldChhdHRyaWJ1dGUsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLm5vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZSwgYXR0cmlidXRlc1thdHRyaWJ1dGVdKTtcbiAgICAgICAgICB0aGlzW0N1cnJlbnRBdHRyc10uc2V0KGF0dHJpYnV0ZSwgYXR0cmlidXRlc1thdHRyaWJ1dGVdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICByZW1vdmUoKSB7XG4gICAgaWYgKHRoaXMubm9kZSkge1xuICAgICAgdGhpcy5ub2RlLnJlbW92ZSgpO1xuICAgIH1cbiAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzKTtcbiAgICB2YXIgY2xlYW51cDtcbiAgICB3aGlsZSAoY2xlYW51cCA9IHRoaXMuY2xlYW51cC5zaGlmdCgpKSB7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfVxuICAgIHRoaXMuY2xlYXIoKTtcbiAgICBpZiAoIXRoaXMubm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZGV0YWNoRXZlbnQgPSBuZXcgRXZlbnQoJ2N2RG9tRGV0YWNoZWQnKTtcbiAgICB0aGlzLm5vZGUuZGlzcGF0Y2hFdmVudChkZXRhY2hFdmVudCk7XG4gICAgdGhpcy5ub2RlID0gdGhpcy5lbGVtZW50ID0gdGhpcy5yZWYgPSB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZDtcbiAgfVxuICBjbGVhcigpIHtcbiAgICBpZiAoIXRoaXMubm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZGV0YWNoRXZlbnQgPSBuZXcgRXZlbnQoJ2N2RG9tRGV0YWNoZWQnKTtcbiAgICB3aGlsZSAodGhpcy5ub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMubm9kZS5maXJzdENoaWxkLmRpc3BhdGNoRXZlbnQoZGV0YWNoRXZlbnQpO1xuICAgICAgdGhpcy5ub2RlLnJlbW92ZUNoaWxkKHRoaXMubm9kZS5maXJzdENoaWxkKTtcbiAgICB9XG4gIH1cbiAgcGF1c2UocGF1c2VkID0gdHJ1ZSkge31cbiAgbGlzdGVuKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMubm9kZTtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgdmFyIHJlbW92ZSA9ICgpID0+IHtcbiAgICAgIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHZhciByZW1vdmVyID0gKCkgPT4ge1xuICAgICAgcmVtb3ZlKCk7XG4gICAgICByZW1vdmUgPSAoKSA9PiBjb25zb2xlLndhcm4oJ0FscmVhZHkgcmVtb3ZlZCEnKTtcbiAgICB9O1xuICAgIHRoaXMucGFyZW50Lm9uUmVtb3ZlKCgpID0+IHJlbW92ZXIoKSk7XG4gICAgcmV0dXJuIHJlbW92ZXI7XG4gIH1cbn1cbmV4cG9ydHMuVGFnID0gVGFnO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVXVpZC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVXVpZCA9IHZvaWQgMDtcbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShlLCByLCB0KSB7IHJldHVybiAociA9IF90b1Byb3BlcnR5S2V5KHIpKSBpbiBlID8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsIHIsIHsgdmFsdWU6IHQsIGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAgfSkgOiBlW3JdID0gdCwgZTsgfVxuZnVuY3Rpb24gX3RvUHJvcGVydHlLZXkodCkgeyB2YXIgaSA9IF90b1ByaW1pdGl2ZSh0LCBcInN0cmluZ1wiKTsgcmV0dXJuIFwic3ltYm9sXCIgPT0gdHlwZW9mIGkgPyBpIDogaSArIFwiXCI7IH1cbmZ1bmN0aW9uIF90b1ByaW1pdGl2ZSh0LCByKSB7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiB0IHx8ICF0KSByZXR1cm4gdDsgdmFyIGUgPSB0W1N5bWJvbC50b1ByaW1pdGl2ZV07IGlmICh2b2lkIDAgIT09IGUpIHsgdmFyIGkgPSBlLmNhbGwodCwgciB8fCBcImRlZmF1bHRcIik7IGlmIChcIm9iamVjdFwiICE9IHR5cGVvZiBpKSByZXR1cm4gaTsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkBAdG9QcmltaXRpdmUgbXVzdCByZXR1cm4gYSBwcmltaXRpdmUgdmFsdWUuXCIpOyB9IHJldHVybiAoXCJzdHJpbmdcIiA9PT0gciA/IFN0cmluZyA6IE51bWJlcikodCk7IH1cbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xudmFyIGNyeXB0byA9IHdpbi5jcnlwdG87XG5jbGFzcyBVdWlkIHtcbiAgY29uc3RydWN0b3IodXVpZCA9IG51bGwsIHZlcnNpb24gPSA0KSB7XG4gICAgX2RlZmluZVByb3BlcnR5KHRoaXMsIFwidXVpZFwiLCBudWxsKTtcbiAgICBfZGVmaW5lUHJvcGVydHkodGhpcywgXCJ2ZXJzaW9uXCIsIDQpO1xuICAgIGlmICh1dWlkKSB7XG4gICAgICBpZiAodHlwZW9mIHV1aWQgIT09ICdzdHJpbmcnICYmICEodXVpZCBpbnN0YW5jZW9mIFV1aWQpIHx8ICF1dWlkLm1hdGNoKC9bMC05QS1GYS1mXXs4fSgtWzAtOUEtRmEtZl17NH0pezN9LVswLTlBLUZhLWZdezEyfS8pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBpbnB1dCBmb3IgVXVpZDogXCIke3V1aWR9XCJgKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudmVyc2lvbiA9IHZlcnNpb247XG4gICAgICB0aGlzLnV1aWQgPSB1dWlkO1xuICAgIH0gZWxzZSBpZiAoY3J5cHRvICYmIHR5cGVvZiBjcnlwdG8ucmFuZG9tVVVJRCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy51dWlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGluaXQgPSBbMWU3XSArIC0xZTMgKyAtNGUzICsgLThlMyArIC0xZTExO1xuICAgICAgdmFyIHJhbmQgPSBjcnlwdG8gJiYgdHlwZW9mIGNyeXB0by5yYW5kb21VVUlEID09PSAnZnVuY3Rpb24nID8gKCkgPT4gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDhBcnJheSgxKSlbMF0gOiAoKSA9PiBNYXRoLnRydW5jKE1hdGgucmFuZG9tKCkgKiAyNTYpO1xuICAgICAgdGhpcy51dWlkID0gaW5pdC5yZXBsYWNlKC9bMDE4XS9nLCBjID0+IChjIF4gcmFuZCgpICYgMTUgPj4gYyAvIDQpLnRvU3RyaW5nKDE2KSk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH1cbiAgW1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbiAgfVxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy51dWlkO1xuICB9XG4gIHRvSnNvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuICAgICAgdXVpZDogdGhpcy51dWlkXG4gICAgfTtcbiAgfVxufVxuZXhwb3J0cy5VdWlkID0gVXVpZDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1ZpZXcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlZpZXcgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgX1ZpZXdMaXN0ID0gcmVxdWlyZShcIi4vVmlld0xpc3RcIik7XG52YXIgX1JvdXRlciA9IHJlcXVpcmUoXCIuL1JvdXRlclwiKTtcbnZhciBfVXVpZCA9IHJlcXVpcmUoXCIuL1V1aWRcIik7XG52YXIgX0RvbSA9IHJlcXVpcmUoXCIuL0RvbVwiKTtcbnZhciBfVGFnID0gcmVxdWlyZShcIi4vVGFnXCIpO1xudmFyIF9CYWcgPSByZXF1aXJlKFwiLi9CYWdcIik7XG52YXIgX1J1bGVTZXQgPSByZXF1aXJlKFwiLi9SdWxlU2V0XCIpO1xudmFyIF9NaXhpbiA9IHJlcXVpcmUoXCIuL01peGluXCIpO1xudmFyIF9FdmVudFRhcmdldE1peGluID0gcmVxdWlyZShcIi4uL21peGluL0V2ZW50VGFyZ2V0TWl4aW5cIik7XG52YXIgZG9udFBhcnNlID0gU3ltYm9sKCdkb250UGFyc2UnKTtcbnZhciBleHBhbmRCaW5kID0gU3ltYm9sKCdleHBhbmRCaW5kJyk7XG52YXIgdXVpZCA9IFN5bWJvbCgndXVpZCcpO1xuY2xhc3MgVmlldyBleHRlbmRzIF9NaXhpbi5NaXhpbi53aXRoKF9FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4pIHtcbiAgZ2V0IF9pZCgpIHtcbiAgICByZXR1cm4gdGhpc1t1dWlkXTtcbiAgfVxuICBzdGF0aWMgZnJvbSh0ZW1wbGF0ZSwgYXJncyA9IHt9LCBtYWluVmlldyA9IG51bGwpIHtcbiAgICB2YXIgdmlldyA9IG5ldyB0aGlzKGFyZ3MsIG1haW5WaWV3KTtcbiAgICB2aWV3LnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgcmV0dXJuIHZpZXc7XG4gIH1cbiAgY29uc3RydWN0b3IoYXJncyA9IHt9LCBtYWluVmlldyA9IG51bGwpIHtcbiAgICBzdXBlcihhcmdzLCBtYWluVmlldyk7XG4gICAgdGhpc1tfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSBtYWluVmlldztcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2FyZ3MnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoYXJncylcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgdXVpZCwge1xuICAgICAgdmFsdWU6IHRoaXMuY29uc3RydWN0b3IudXVpZCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdub2Rlc0F0dGFjaGVkJywge1xuICAgICAgdmFsdWU6IG5ldyBfQmFnLkJhZygoaSwgcywgYSkgPT4ge30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdub2Rlc0RldGFjaGVkJywge1xuICAgICAgdmFsdWU6IG5ldyBfQmFnLkJhZygoaSwgcywgYSkgPT4ge30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfb25SZW1vdmUnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9CYWcuQmFnKChpLCBzLCBhKSA9PiB7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2NsZWFudXAnLCB7XG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3BhcmVudCcsIHtcbiAgICAgIHZhbHVlOiBtYWluVmlldyxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd2aWV3cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ZpZXdMaXN0cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3dpdGhWaWV3cycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RhZ3MnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdub2RlcycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZShbXSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RpbWVvdXRzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaW50ZXJ2YWxzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZnJhbWVzJywge1xuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdydWxlU2V0Jywge1xuICAgICAgdmFsdWU6IG5ldyBfUnVsZVNldC5SdWxlU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZVJ1bGVTZXQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9SdWxlU2V0LlJ1bGVTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc3ViQmluZGluZ3MnLCB7XG4gICAgICB2YWx1ZToge31cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RlbXBsYXRlcycsIHtcbiAgICAgIHZhbHVlOiB7fVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncG9zdE1hcHBpbmcnLCB7XG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdldmVudENsZWFudXAnLCB7XG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3VucGF1c2VDYWxsYmFja3MnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdpbnRlcnBvbGF0ZVJlZ2V4Jywge1xuICAgICAgdmFsdWU6IC8oXFxbXFxbKCg/OlxcJCspP1tcXHdcXC5cXHwtXSspXFxdXFxdKS9nXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZW5kZXJlZCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpID0+IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVuZGVyQ29tcGxldGUnLCB7XG4gICAgICAgIHZhbHVlOiBhY2NlcHRcbiAgICAgIH0pKVxuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzW19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzW19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IG51bGw7XG4gICAgfSk7XG4gICAgdGhpcy5jb250cm9sbGVyID0gdGhpcztcbiAgICB0aGlzLnRlbXBsYXRlID0gYGA7XG4gICAgdGhpcy5maXJzdE5vZGUgPSBudWxsO1xuICAgIHRoaXMubGFzdE5vZGUgPSBudWxsO1xuICAgIHRoaXMudmlld0xpc3QgPSBudWxsO1xuICAgIHRoaXMubWFpblZpZXcgPSBudWxsO1xuICAgIHRoaXMucHJlc2VydmUgPSBmYWxzZTtcbiAgICB0aGlzLnJlbW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxvYWRlZCA9IFByb21pc2UucmVzb2x2ZSh0aGlzKTtcblxuICAgIC8vIHJldHVybiBCaW5kYWJsZS5tYWtlKHRoaXMpO1xuICB9XG4gIHN0YXRpYyBpc1ZpZXcoKSB7XG4gICAgcmV0dXJuIFZpZXc7XG4gIH1cbiAgb25GcmFtZShjYWxsYmFjaykge1xuICAgIHZhciBzdG9wcGVkID0gZmFsc2U7XG4gICAgdmFyIGNhbmNlbCA9ICgpID0+IHtcbiAgICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgIH07XG4gICAgdmFyIGMgPSB0aW1lc3RhbXAgPT4ge1xuICAgICAgaWYgKHRoaXMucmVtb3ZlZCB8fCBzdG9wcGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgY2FsbGJhY2soRGF0ZS5ub3coKSk7XG4gICAgICB9XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYyk7XG4gICAgfTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gYyhEYXRlLm5vdygpKSk7XG4gICAgdGhpcy5mcmFtZXMucHVzaChjYW5jZWwpO1xuICAgIHJldHVybiBjYW5jZWw7XG4gIH1cbiAgb25OZXh0RnJhbWUoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGNhbGxiYWNrKERhdGUubm93KCkpKTtcbiAgfVxuICBvbklkbGUoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gcmVxdWVzdElkbGVDYWxsYmFjaygoKSA9PiBjYWxsYmFjayhEYXRlLm5vdygpKSk7XG4gIH1cbiAgb25UaW1lb3V0KHRpbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRpbWVvdXRJbmZvID0ge1xuICAgICAgdGltZW91dDogbnVsbCxcbiAgICAgIGNhbGxiYWNrOiBudWxsLFxuICAgICAgdGltZTogdGltZSxcbiAgICAgIGZpcmVkOiBmYWxzZSxcbiAgICAgIGNyZWF0ZWQ6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgcGF1c2VkOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIHdyYXBwZWRDYWxsYmFjayA9ICgpID0+IHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB0aW1lb3V0SW5mby5maXJlZCA9IHRydWU7XG4gICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgICB9O1xuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dCh3cmFwcGVkQ2FsbGJhY2ssIHRpbWUpO1xuICAgIHRpbWVvdXRJbmZvLmNhbGxiYWNrID0gd3JhcHBlZENhbGxiYWNrO1xuICAgIHRpbWVvdXRJbmZvLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgIHRoaXMudGltZW91dHMuc2V0KHRpbWVvdXRJbmZvLnRpbWVvdXQsIHRpbWVvdXRJbmZvKTtcbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxuICBjbGVhclRpbWVvdXQodGltZW91dCkge1xuICAgIGlmICghdGhpcy50aW1lb3V0cy5oYXModGltZW91dCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXRJbmZvID0gdGhpcy50aW1lb3V0cy5nZXQodGltZW91dCk7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICB9XG4gIG9uSW50ZXJ2YWwodGltZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgdGltZW91dCA9IHNldEludGVydmFsKGNhbGxiYWNrLCB0aW1lKTtcbiAgICB0aGlzLmludGVydmFscy5zZXQodGltZW91dCwge1xuICAgICAgdGltZW91dDogdGltZW91dCxcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcbiAgICAgIHRpbWU6IHRpbWUsXG4gICAgICBwYXVzZWQ6IGZhbHNlXG4gICAgfSk7XG4gICAgcmV0dXJuIHRpbWVvdXQ7XG4gIH1cbiAgY2xlYXJJbnRlcnZhbCh0aW1lb3V0KSB7XG4gICAgaWYgKCF0aGlzLmludGVydmFscy5oYXModGltZW91dCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXRJbmZvID0gdGhpcy5pbnRlcnZhbHMuZ2V0KHRpbWVvdXQpO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgICB0aGlzLmludGVydmFscy5kZWxldGUodGltZW91dEluZm8udGltZW91dCk7XG4gIH1cbiAgcGF1c2UocGF1c2VkID0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHBhdXNlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnBhdXNlZCA9ICF0aGlzLnBhdXNlZDtcbiAgICB9XG4gICAgdGhpcy5wYXVzZWQgPSBwYXVzZWQ7XG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICBmb3IgKHZhciBbY2FsbGJhY2ssIHRpbWVvdXRdIG9mIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgaWYgKHRpbWVvdXQuZmlyZWQpIHtcbiAgICAgICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0LnBhdXNlZCA9IHRydWU7XG4gICAgICAgIHRpbWVvdXQudGltZSA9IE1hdGgubWF4KDAsIHRpbWVvdXQudGltZSAtIChEYXRlLm5vdygpIC0gdGltZW91dC5jcmVhdGVkKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBbX2NhbGxiYWNrLCBfdGltZW91dF0gb2YgdGhpcy5pbnRlcnZhbHMpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChfdGltZW91dC50aW1lb3V0KTtcbiAgICAgICAgX3RpbWVvdXQucGF1c2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgW19jYWxsYmFjazIsIF90aW1lb3V0Ml0gb2YgdGhpcy50aW1lb3V0cykge1xuICAgICAgICBpZiAoIV90aW1lb3V0Mi5wYXVzZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoX3RpbWVvdXQyLmZpcmVkKSB7XG4gICAgICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUoX3RpbWVvdXQyLnRpbWVvdXQpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIF90aW1lb3V0Mi50aW1lb3V0ID0gc2V0VGltZW91dChfdGltZW91dDIuY2FsbGJhY2ssIF90aW1lb3V0Mi50aW1lKTtcbiAgICAgICAgX3RpbWVvdXQyLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgW19jYWxsYmFjazMsIF90aW1lb3V0M10gb2YgdGhpcy5pbnRlcnZhbHMpIHtcbiAgICAgICAgaWYgKCFfdGltZW91dDMucGF1c2VkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgX3RpbWVvdXQzLnRpbWVvdXQgPSBzZXRJbnRlcnZhbChfdGltZW91dDMuY2FsbGJhY2ssIF90aW1lb3V0My50aW1lKTtcbiAgICAgICAgX3RpbWVvdXQzLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgWywgX2NhbGxiYWNrNF0gb2YgdGhpcy51bnBhdXNlQ2FsbGJhY2tzKSB7XG4gICAgICAgIF9jYWxsYmFjazQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudW5wYXVzZUNhbGxiYWNrcy5jbGVhcigpO1xuICAgIH1cbiAgICBmb3IgKHZhciBbdGFnLCB2aWV3TGlzdF0gb2YgdGhpcy52aWV3TGlzdHMpIHtcbiAgICAgIHZpZXdMaXN0LnBhdXNlKCEhcGF1c2VkKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnRhZ3MpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMudGFnc1tpXSkpIHtcbiAgICAgICAgZm9yICh2YXIgaiBpbiB0aGlzLnRhZ3NbaV0pIHtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV1bal0ucGF1c2UoISFwYXVzZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy50YWdzW2ldLnBhdXNlKCEhcGF1c2VkKTtcbiAgICB9XG4gIH1cbiAgcmVuZGVyKHBhcmVudE5vZGUgPSBudWxsLCBpbnNlcnRQb2ludCA9IG51bGwsIG91dGVyVmlldyA9IG51bGwpIHtcbiAgICB2YXIge1xuICAgICAgZG9jdW1lbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgaWYgKHBhcmVudE5vZGUgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5maXJzdE5vZGUucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgaWYgKGluc2VydFBvaW50IGluc3RhbmNlb2YgVmlldykge1xuICAgICAgaW5zZXJ0UG9pbnQgPSBpbnNlcnRQb2ludC5maXJzdE5vZGU7XG4gICAgfVxuICAgIGlmICh0aGlzLmZpcnN0Tm9kZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVSZW5kZXIocGFyZW50Tm9kZSwgaW5zZXJ0UG9pbnQsIG91dGVyVmlldyk7XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbmRlcicpKTtcbiAgICB2YXIgdGVtcGxhdGVJc0ZyYWdtZW50ID0gdHlwZW9mIHRoaXMudGVtcGxhdGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiB0aGlzLnRlbXBsYXRlLmNsb25lTm9kZSA9PT0gJ2Z1bmN0aW9uJztcbiAgICB2YXIgdGVtcGxhdGVQYXJzZWQgPSB0ZW1wbGF0ZUlzRnJhZ21lbnQgfHwgVmlldy50ZW1wbGF0ZXMuaGFzKHRoaXMudGVtcGxhdGUpO1xuICAgIHZhciBzdWJEb2M7XG4gICAgaWYgKHRlbXBsYXRlUGFyc2VkKSB7XG4gICAgICBpZiAodGVtcGxhdGVJc0ZyYWdtZW50KSB7XG4gICAgICAgIHN1YkRvYyA9IHRoaXMudGVtcGxhdGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3ViRG9jID0gVmlldy50ZW1wbGF0ZXMuZ2V0KHRoaXMudGVtcGxhdGUpLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3ViRG9jID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQodGhpcy50ZW1wbGF0ZSk7XG4gICAgfVxuICAgIGlmICghdGVtcGxhdGVQYXJzZWQgJiYgIXRlbXBsYXRlSXNGcmFnbWVudCkge1xuICAgICAgVmlldy50ZW1wbGF0ZXMuc2V0KHRoaXMudGVtcGxhdGUsIHN1YkRvYy5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIH1cbiAgICB0aGlzLm1haW5WaWV3IHx8IHRoaXMucHJlUnVsZVNldC5hcHBseShzdWJEb2MsIHRoaXMpO1xuICAgIHRoaXMubWFwVGFncyhzdWJEb2MpO1xuICAgIHRoaXMubWFpblZpZXcgfHwgdGhpcy5ydWxlU2V0LmFwcGx5KHN1YkRvYywgdGhpcyk7XG4gICAgaWYgKGdsb2JhbFRoaXMuZGV2TW9kZSA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5maXJzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVDb21tZW50KGBUZW1wbGF0ZSAke3RoaXMuX2lkfSBTdGFydGApO1xuICAgICAgdGhpcy5sYXN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoYFRlbXBsYXRlICR7dGhpcy5faWR9IEVuZGApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZpcnN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIHRoaXMubGFzdE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfVxuICAgIHRoaXMubm9kZXMucHVzaCh0aGlzLmZpcnN0Tm9kZSwgLi4uQXJyYXkuZnJvbShzdWJEb2MuY2hpbGROb2RlcyksIHRoaXMubGFzdE5vZGUpO1xuICAgIHRoaXMucG9zdFJlbmRlcihwYXJlbnROb2RlKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW5kZXJlZCcpKTtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hBdHRhY2goKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgaWYgKGluc2VydFBvaW50KSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBudWxsKTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgbnVsbCk7XG4gICAgICB9XG4gICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShzdWJEb2MsIHRoaXMubGFzdE5vZGUpO1xuICAgICAgdmFyIHJvb3ROb2RlID0gcGFyZW50Tm9kZS5nZXRSb290Tm9kZSgpO1xuICAgICAgaWYgKHJvb3ROb2RlLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoQXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUsIG91dGVyVmlldyk7XG4gICAgICB9IGVsc2UgaWYgKG91dGVyVmlldykge1xuICAgICAgICB2YXIgZmlyc3REb21BdHRhY2ggPSBldmVudCA9PiB7XG4gICAgICAgICAgdmFyIHJvb3ROb2RlID0gcGFyZW50Tm9kZS5nZXRSb290Tm9kZSgpO1xuICAgICAgICAgIHRoaXMuYXR0YWNoZWQocm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgICAgICAgIHRoaXMuZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSwgb3V0ZXJWaWV3KTtcbiAgICAgICAgICBvdXRlclZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcignYXR0YWNoZWQnLCBmaXJzdERvbUF0dGFjaCk7XG4gICAgICAgIH07XG4gICAgICAgIG91dGVyVmlldy5hZGRFdmVudExpc3RlbmVyKCdhdHRhY2hlZCcsIGZpcnN0RG9tQXR0YWNoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5yZW5kZXJDb21wbGV0ZSh0aGlzLm5vZGVzKTtcbiAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgfVxuICBkaXNwYXRjaEF0dGFjaCgpIHtcbiAgICB2YXIge1xuICAgICAgQ3VzdG9tRXZlbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2F0dGFjaCcsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICB0YXJnZXQ6IHRoaXNcbiAgICB9KSk7XG4gIH1cbiAgZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSwgdmlldyA9IHVuZGVmaW5lZCkge1xuICAgIHZhciB7XG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhdHRhY2hlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgIG5vZGU6IHBhcmVudE5vZGUsXG4gICAgICAgIHJvb3Q6IHJvb3ROb2RlLFxuICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgfVxuICAgIH0pKTtcbiAgICB0aGlzLmRpc3BhdGNoRG9tQXR0YWNoZWQodmlldyk7XG4gICAgZm9yICh2YXIgY2FsbGJhY2sgb2YgdGhpcy5ub2Rlc0F0dGFjaGVkLml0ZW1zKCkpIHtcbiAgICAgIGNhbGxiYWNrKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICB9XG4gIH1cbiAgZGlzcGF0Y2hEb21BdHRhY2hlZCh2aWV3KSB7XG4gICAgdmFyIHtcbiAgICAgIE5vZGUsXG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB0aGlzLm5vZGVzLmZpbHRlcihuID0+IG4ubm9kZVR5cGUgIT09IE5vZGUuQ09NTUVOVF9OT0RFKS5mb3JFYWNoKGNoaWxkID0+IHtcbiAgICAgIGlmICghY2hpbGQubWF0Y2hlcykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjaGlsZC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZEb21BdHRhY2hlZCcsIHtcbiAgICAgICAgdGFyZ2V0OiBjaGlsZCxcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICAgIF9Eb20uRG9tLm1hcFRhZ3MoY2hpbGQsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgICAgaWYgKCF0YWcubWF0Y2hlcykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tQXR0YWNoZWQnLCB7XG4gICAgICAgICAgdGFyZ2V0OiB0YWcsXG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmVSZW5kZXIocGFyZW50Tm9kZSwgaW5zZXJ0UG9pbnQsIG91dGVyVmlldykge1xuICAgIHZhciB7XG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICB2YXIgd2lsbFJlUmVuZGVyID0gdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVSZW5kZXInKSwge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIHRhcmdldDogdGhpcyxcbiAgICAgIHZpZXc6IG91dGVyVmlld1xuICAgIH0pO1xuICAgIGlmICghd2lsbFJlUmVuZGVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBzdWJEb2MgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIGlmICh0aGlzLmZpcnN0Tm9kZS5pc0Nvbm5lY3RlZCkge1xuICAgICAgdmFyIGRldGFjaCA9IHRoaXMubm9kZXNEZXRhY2hlZC5pdGVtcygpO1xuICAgICAgZm9yICh2YXIgaSBpbiBkZXRhY2gpIHtcbiAgICAgICAgZGV0YWNoW2ldKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHN1YkRvYy5hcHBlbmQoLi4udGhpcy5ub2Rlcyk7XG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgIGlmIChpbnNlcnRQb2ludCkge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmZpcnN0Tm9kZSwgbnVsbCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIG51bGwpO1xuICAgICAgfVxuICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3ViRG9jLCB0aGlzLmxhc3ROb2RlKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlUmVuZGVyZWQnKSwge1xuICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICB0YXJnZXQ6IHRoaXMsXG4gICAgICAgIHZpZXc6IG91dGVyVmlld1xuICAgICAgfSk7XG4gICAgICB2YXIgcm9vdE5vZGUgPSBwYXJlbnROb2RlLmdldFJvb3ROb2RlKCk7XG4gICAgICBpZiAocm9vdE5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICB9XG4gIG1hcFRhZ3Moc3ViRG9jKSB7XG4gICAgX0RvbS5Eb20ubWFwVGFncyhzdWJEb2MsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgIGlmICh0YWdbZG9udFBhcnNlXSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGFnLm1hdGNoZXMpIHtcbiAgICAgICAgdGFnID0gdGhpcy5tYXBJbnRlcnBvbGF0YWJsZVRhZyh0YWcpO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXRlbXBsYXRlXScpICYmIHRoaXMubWFwVGVtcGxhdGVUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytc2xvdF0nKSAmJiB0aGlzLm1hcFNsb3RUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtcHJlcmVuZGVyXScpICYmIHRoaXMubWFwUHJlbmRlcmVyVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWxpbmtdJykgJiYgdGhpcy5tYXBMaW5rVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWF0dHJdJykgJiYgdGhpcy5tYXBBdHRyVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LWV4cGFuZF0nKSAmJiB0aGlzLm1hcEV4cGFuZGFibGVUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtcmVmXScpICYmIHRoaXMubWFwUmVmVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LW9uXScpICYmIHRoaXMubWFwT25UYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtZWFjaF0nKSAmJiB0aGlzLm1hcEVhY2hUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtYmluZF0nKSAmJiB0aGlzLm1hcEJpbmRUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytd2l0aF0nKSAmJiB0aGlzLm1hcFdpdGhUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtaWZdJykgJiYgdGhpcy5tYXBJZlRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi12aWV3XScpICYmIHRoaXMubWFwVmlld1RhZyh0YWcpIHx8IHRhZztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhZyA9IHRoaXMubWFwSW50ZXJwb2xhdGFibGVUYWcodGFnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0YWcgIT09IHdhbGtlci5jdXJyZW50Tm9kZSkge1xuICAgICAgICB3YWxrZXIuY3VycmVudE5vZGUgPSB0YWc7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wb3N0TWFwcGluZy5mb3JFYWNoKGMgPT4gYygpKTtcbiAgfVxuICBtYXBFeHBhbmRhYmxlVGFnKHRhZykge1xuICAgIC8vIGNvbnN0IHRhZ0NvbXBpbGVyID0gdGhpcy5jb21waWxlRXhwYW5kYWJsZVRhZyh0YWcpO1xuICAgIC8vIGNvbnN0IG5ld1RhZyA9IHRhZ0NvbXBpbGVyKHRoaXMpO1xuICAgIC8vIHRhZy5yZXBsYWNlV2l0aChuZXdUYWcpO1xuICAgIC8vIHJldHVybiBuZXdUYWc7XG5cbiAgICB2YXIgZXhpc3RpbmcgPSB0YWdbZXhwYW5kQmluZF07XG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICBleGlzdGluZygpO1xuICAgICAgdGFnW2V4cGFuZEJpbmRdID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBbcHJveHksIGV4cGFuZFByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKHRoaXMuYXJncywgdGFnLmdldEF0dHJpYnV0ZSgnY3YtZXhwYW5kJyksIHRydWUpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuICAgIGlmICghcHJveHlbZXhwYW5kUHJvcGVydHldKSB7XG4gICAgICBwcm94eVtleHBhbmRQcm9wZXJ0eV0gPSB7fTtcbiAgICB9XG4gICAgcHJveHlbZXhwYW5kUHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UocHJveHlbZXhwYW5kUHJvcGVydHldKTtcbiAgICB0aGlzLm9uUmVtb3ZlKHRhZ1tleHBhbmRCaW5kXSA9IHByb3h5W2V4cGFuZFByb3BlcnR5XS5iaW5kVG8oKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgIGlmIChkIHx8IHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0YWcucmVtb3ZlQXR0cmlidXRlKGssIHYpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodiA9PT0gbnVsbCkge1xuICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGssICcnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGFnLnNldEF0dHJpYnV0ZShrLCB2KTtcbiAgICB9KSk7XG5cbiAgICAvLyBsZXQgZXhwYW5kUHJvcGVydHkgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1leHBhbmQnKTtcbiAgICAvLyBsZXQgZXhwYW5kQXJnID0gQmluZGFibGUubWFrZUJpbmRhYmxlKFxuICAgIC8vIFx0dGhpcy5hcmdzW2V4cGFuZFByb3BlcnR5XSB8fCB7fVxuICAgIC8vICk7XG5cbiAgICAvLyB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1leHBhbmQnKTtcblxuICAgIC8vIGZvcihsZXQgaSBpbiBleHBhbmRBcmcpXG4gICAgLy8ge1xuICAgIC8vIFx0aWYoaSA9PT0gJ25hbWUnIHx8IGkgPT09ICd0eXBlJylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0Y29udGludWU7XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGxldCBkZWJpbmQgPSBleHBhbmRBcmcuYmluZFRvKGksICgodGFnLGkpPT4odik9PntcbiAgICAvLyBcdFx0dGFnLnNldEF0dHJpYnV0ZShpLCB2KTtcbiAgICAvLyBcdH0pKHRhZyxpKSk7XG5cbiAgICAvLyBcdHRoaXMub25SZW1vdmUoKCk9PntcbiAgICAvLyBcdFx0ZGViaW5kKCk7XG4gICAgLy8gXHRcdGlmKGV4cGFuZEFyZy5pc0JvdW5kKCkpXG4gICAgLy8gXHRcdHtcbiAgICAvLyBcdFx0XHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKGV4cGFuZEFyZyk7XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdH0pO1xuICAgIC8vIH1cblxuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBjb21waWxlRXhwYW5kYWJsZVRhZyhzb3VyY2VUYWcpXG4gIC8vIHtcbiAgLy8gXHRyZXR1cm4gKGJpbmRpbmdWaWV3KSA9PiB7XG5cbiAgLy8gXHRcdGNvbnN0IHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUodHJ1ZSk7XG5cbiAgLy8gXHRcdGxldCBleHBhbmRQcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuICAvLyBcdFx0bGV0IGV4cGFuZEFyZyA9IEJpbmRhYmxlLm1ha2UoXG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3LmFyZ3NbZXhwYW5kUHJvcGVydHldIHx8IHt9XG4gIC8vIFx0XHQpO1xuXG4gIC8vIFx0XHR0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1leHBhbmQnKTtcblxuICAvLyBcdFx0Zm9yKGxldCBpIGluIGV4cGFuZEFyZylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0aWYoaSA9PT0gJ25hbWUnIHx8IGkgPT09ICd0eXBlJylcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdGNvbnRpbnVlO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0bGV0IGRlYmluZCA9IGV4cGFuZEFyZy5iaW5kVG8oaSwgKCh0YWcsaSk9Pih2KT0+e1xuICAvLyBcdFx0XHRcdHRhZy5zZXRBdHRyaWJ1dGUoaSwgdik7XG4gIC8vIFx0XHRcdH0pKHRhZyxpKSk7XG5cbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcub25SZW1vdmUoKCk9PntcbiAgLy8gXHRcdFx0XHRkZWJpbmQoKTtcbiAgLy8gXHRcdFx0XHRpZihleHBhbmRBcmcuaXNCb3VuZCgpKVxuICAvLyBcdFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3MoZXhwYW5kQXJnKTtcbiAgLy8gXHRcdFx0XHR9XG4gIC8vIFx0XHRcdH0pO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRyZXR1cm4gdGFnO1xuICAvLyBcdH07XG4gIC8vIH1cblxuICBtYXBBdHRyVGFnKHRhZykge1xuICAgIHZhciB0YWdDb21waWxlciA9IHRoaXMuY29tcGlsZUF0dHJUYWcodGFnKTtcbiAgICB2YXIgbmV3VGFnID0gdGFnQ29tcGlsZXIodGhpcyk7XG4gICAgdGFnLnJlcGxhY2VXaXRoKG5ld1RhZyk7XG4gICAgcmV0dXJuIG5ld1RhZztcblxuICAgIC8vIGxldCBhdHRyUHJvcGVydHkgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1hdHRyJyk7XG5cbiAgICAvLyB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1hdHRyJyk7XG5cbiAgICAvLyBsZXQgcGFpcnMgPSBhdHRyUHJvcGVydHkuc3BsaXQoJywnKTtcbiAgICAvLyBsZXQgYXR0cnMgPSBwYWlycy5tYXAoKHApID0+IHAuc3BsaXQoJzonKSk7XG5cbiAgICAvLyBmb3IgKGxldCBpIGluIGF0dHJzKVxuICAgIC8vIHtcbiAgICAvLyBcdGxldCBwcm94eSAgICAgICAgPSB0aGlzLmFyZ3M7XG4gICAgLy8gXHRsZXQgYmluZFByb3BlcnR5ID0gYXR0cnNbaV1bMV07XG4gICAgLy8gXHRsZXQgcHJvcGVydHkgICAgID0gYmluZFByb3BlcnR5O1xuXG4gICAgLy8gXHRpZihiaW5kUHJvcGVydHkubWF0Y2goL1xcLi8pKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRbcHJveHksIHByb3BlcnR5XSA9IEJpbmRhYmxlLnJlc29sdmUoXG4gICAgLy8gXHRcdFx0dGhpcy5hcmdzXG4gICAgLy8gXHRcdFx0LCBiaW5kUHJvcGVydHlcbiAgICAvLyBcdFx0XHQsIHRydWVcbiAgICAvLyBcdFx0KTtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0bGV0IGF0dHJpYiA9IGF0dHJzW2ldWzBdO1xuXG4gICAgLy8gXHR0aGlzLm9uUmVtb3ZlKHByb3h5LmJpbmRUbyhcbiAgICAvLyBcdFx0cHJvcGVydHlcbiAgICAvLyBcdFx0LCAodik9PntcbiAgICAvLyBcdFx0XHRpZih2ID09IG51bGwpXG4gICAgLy8gXHRcdFx0e1xuICAgIC8vIFx0XHRcdFx0dGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsICcnKTtcbiAgICAvLyBcdFx0XHRcdHJldHVybjtcbiAgICAvLyBcdFx0XHR9XG4gICAgLy8gXHRcdFx0dGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsIHYpO1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHQpKTtcbiAgICAvLyB9XG5cbiAgICAvLyByZXR1cm4gdGFnO1xuICB9XG4gIGNvbXBpbGVBdHRyVGFnKHNvdXJjZVRhZykge1xuICAgIHZhciBhdHRyUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1hdHRyJyk7XG4gICAgdmFyIHBhaXJzID0gYXR0clByb3BlcnR5LnNwbGl0KC9bLDtdLyk7XG4gICAgdmFyIGF0dHJzID0gcGFpcnMubWFwKHAgPT4gcC5zcGxpdCgnOicpKTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1hdHRyJyk7XG4gICAgcmV0dXJuIGJpbmRpbmdWaWV3ID0+IHtcbiAgICAgIHZhciB0YWcgPSBzb3VyY2VUYWcuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgdmFyIF9sb29wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYmluZFByb3BlcnR5ID0gYXR0cnNbaV1bMV0gfHwgYXR0cnNbaV1bMF07XG4gICAgICAgIHZhciBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKGJpbmRpbmdWaWV3LmFyZ3MsIGJpbmRQcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgICAgIHZhciBhdHRyaWIgPSBhdHRyc1tpXVswXTtcbiAgICAgICAgYmluZGluZ1ZpZXcub25SZW1vdmUocHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgIGlmIChkIHx8IHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFnLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWIsIHYpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsICcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShhdHRyaWIsIHYpO1xuICAgICAgICB9KSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgaSBpbiBhdHRycykge1xuICAgICAgICBfbG9vcCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRhZztcbiAgICB9O1xuICB9XG4gIG1hcEludGVycG9sYXRhYmxlVGFnKHRhZykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyIHJlZ2V4ID0gdGhpcy5pbnRlcnBvbGF0ZVJlZ2V4O1xuICAgIHZhciB7XG4gICAgICBOb2RlLFxuICAgICAgZG9jdW1lbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgaWYgKHRhZy5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICAgIHZhciBvcmlnaW5hbCA9IHRhZy5ub2RlVmFsdWU7XG4gICAgICBpZiAoIXRoaXMuaW50ZXJwb2xhdGFibGUob3JpZ2luYWwpKSB7XG4gICAgICAgIHJldHVybiB0YWc7XG4gICAgICB9XG4gICAgICB2YXIgaGVhZGVyID0gMDtcbiAgICAgIHZhciBtYXRjaDtcbiAgICAgIHZhciBfbG9vcDIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGJpbmRQcm9wZXJ0eSA9IG1hdGNoWzJdO1xuICAgICAgICAgIHZhciB1bnNhZmVIdG1sID0gZmFsc2U7XG4gICAgICAgICAgdmFyIHVuc2FmZVZpZXcgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgcHJvcGVydHlTcGxpdCA9IGJpbmRQcm9wZXJ0eS5zcGxpdCgnfCcpO1xuICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IGZhbHNlO1xuICAgICAgICAgIGlmIChwcm9wZXJ0eVNwbGl0Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyID0gX3RoaXMuc3RyaW5nVHJhbnNmb3JtZXIocHJvcGVydHlTcGxpdC5zbGljZSgxKSk7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBwcm9wZXJ0eVNwbGl0WzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5LnN1YnN0cigwLCAyKSA9PT0gJyQkJykge1xuICAgICAgICAgICAgdW5zYWZlSHRtbCA9IHRydWU7XG4gICAgICAgICAgICB1bnNhZmVWaWV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IGJpbmRQcm9wZXJ0eS5zdWJzdHIoMik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgICAgICAgIHVuc2FmZUh0bWwgPSB0cnVlO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gYmluZFByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5zdWJzdHIoMCwgMykgPT09ICcwMDAnKSB7XG4gICAgICAgICAgICBleHBhbmQgPSB0cnVlO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gYmluZFByb3BlcnR5LnN1YnN0cigzKTtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgc3RhdGljUHJlZml4ID0gb3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlciwgbWF0Y2guaW5kZXgpO1xuICAgICAgICAgIGhlYWRlciA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMV0ubGVuZ3RoO1xuICAgICAgICAgIHZhciBzdGF0aWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RhdGljUHJlZml4KTtcbiAgICAgICAgICBzdGF0aWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdGF0aWNOb2RlLCB0YWcpO1xuICAgICAgICAgIHZhciBkeW5hbWljTm9kZTtcbiAgICAgICAgICBpZiAodW5zYWZlSHRtbCkge1xuICAgICAgICAgICAgZHluYW1pY05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHluYW1pY05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGR5bmFtaWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgICAgIHZhciBwcm94eSA9IF90aGlzLmFyZ3M7XG4gICAgICAgICAgdmFyIHByb3BlcnR5ID0gYmluZFByb3BlcnR5O1xuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkubWF0Y2goL1xcLi8pKSB7XG4gICAgICAgICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKF90aGlzLmFyZ3MsIGJpbmRQcm9wZXJ0eSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkeW5hbWljTm9kZSwgdGFnKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHByb3h5ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcmV0dXJuIDE7IC8vIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIHByb3h5ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UocHJveHkpO1xuICAgICAgICAgIHZhciBkZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0KSA9PiB7XG4gICAgICAgICAgICBpZiAodFtrXSAhPT0gdiAmJiAodFtrXSBpbnN0YW5jZW9mIFZpZXcgfHwgdFtrXSBpbnN0YW5jZW9mIE5vZGUgfHwgdFtrXSBpbnN0YW5jZW9mIF9UYWcuVGFnKSkge1xuICAgICAgICAgICAgICBpZiAoIXRba10ucHJlc2VydmUpIHtcbiAgICAgICAgICAgICAgICB0W2tdLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodW5zYWZlVmlldyAmJiAhKHYgaW5zdGFuY2VvZiBWaWV3KSkge1xuICAgICAgICAgICAgICB2YXIgdW5zYWZlVGVtcGxhdGUgPSB2ICE9PSBudWxsICYmIHYgIT09IHZvaWQgMCA/IHYgOiAnJztcbiAgICAgICAgICAgICAgdiA9IG5ldyBWaWV3KF90aGlzLmFyZ3MsIF90aGlzKTtcbiAgICAgICAgICAgICAgdi50ZW1wbGF0ZSA9IHVuc2FmZVRlbXBsYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyKSB7XG4gICAgICAgICAgICAgIHYgPSB0cmFuc2Zvcm1lcih2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgVmlldykge1xuICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgdltfRXZlbnRUYXJnZXRNaXhpbi5FdmVudFRhcmdldE1peGluLlBhcmVudF0gPSBfdGhpcztcbiAgICAgICAgICAgICAgdi5yZW5kZXIodGFnLnBhcmVudE5vZGUsIGR5bmFtaWNOb2RlLCBfdGhpcyk7XG4gICAgICAgICAgICAgIHZhciBjbGVhbnVwID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdi5wcmVzZXJ2ZSkge1xuICAgICAgICAgICAgICAgICAgdi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKGNsZWFudXApO1xuICAgICAgICAgICAgICB2Lm9uUmVtb3ZlKCgpID0+IF90aGlzLl9vblJlbW92ZS5yZW1vdmUoY2xlYW51cCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHYsIGR5bmFtaWNOb2RlKTtcbiAgICAgICAgICAgICAgX3RoaXMub25SZW1vdmUoKCkgPT4gdi5yZW1vdmUoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBfVGFnLlRhZykge1xuICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgaWYgKHYubm9kZSkge1xuICAgICAgICAgICAgICAgIHRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh2Lm5vZGUsIGR5bmFtaWNOb2RlKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5vblJlbW92ZSgoKSA9PiB2LnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2LnJlbW92ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAodiBpbnN0YW5jZW9mIE9iamVjdCAmJiB2Ll9fdG9TdHJpbmcgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgIHYgPSB2Ll9fdG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAodW5zYWZlSHRtbCkge1xuICAgICAgICAgICAgICAgIGR5bmFtaWNOb2RlLmlubmVySFRNTCA9IHY7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZHluYW1pY05vZGUubm9kZVZhbHVlID0gdjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHluYW1pY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgX3RoaXMub25SZW1vdmUoZGViaW5kKTtcbiAgICAgICAgfSxcbiAgICAgICAgX3JldDtcbiAgICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMob3JpZ2luYWwpKSB7XG4gICAgICAgIF9yZXQgPSBfbG9vcDIoKTtcbiAgICAgICAgaWYgKF9yZXQgPT09IDApIGNvbnRpbnVlO1xuICAgICAgICBpZiAoX3JldCA9PT0gMSkgYnJlYWs7XG4gICAgICB9XG4gICAgICB2YXIgc3RhdGljU3VmZml4ID0gb3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlcik7XG4gICAgICB2YXIgc3RhdGljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0YXRpY1N1ZmZpeCk7XG4gICAgICBzdGF0aWNOb2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN0YXRpY05vZGUsIHRhZyk7XG4gICAgICB0YWcubm9kZVZhbHVlID0gJyc7XG4gICAgfSBlbHNlIGlmICh0YWcubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICB2YXIgX2xvb3AzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIV90aGlzLmludGVycG9sYXRhYmxlKHRhZy5hdHRyaWJ1dGVzW2ldLnZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIHZhciBoZWFkZXIgPSAwO1xuICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IHRhZy5hdHRyaWJ1dGVzW2ldLnZhbHVlO1xuICAgICAgICB2YXIgYXR0cmlidXRlID0gdGFnLmF0dHJpYnV0ZXNbaV07XG4gICAgICAgIHZhciBiaW5kUHJvcGVydGllcyA9IHt9O1xuICAgICAgICB2YXIgc2VnbWVudHMgPSBbXTtcbiAgICAgICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhvcmlnaW5hbCkpIHtcbiAgICAgICAgICBzZWdtZW50cy5wdXNoKG9yaWdpbmFsLnN1YnN0cmluZyhoZWFkZXIsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgICAgaWYgKCFiaW5kUHJvcGVydGllc1ttYXRjaFsyXV0pIHtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0aWVzW21hdGNoWzJdXSA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBiaW5kUHJvcGVydGllc1ttYXRjaFsyXV0ucHVzaChzZWdtZW50cy5sZW5ndGgpO1xuICAgICAgICAgIHNlZ21lbnRzLnB1c2gobWF0Y2hbMV0pO1xuICAgICAgICAgIGhlYWRlciA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMV0ubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHNlZ21lbnRzLnB1c2gob3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlcikpO1xuICAgICAgICB2YXIgX2xvb3A0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBwcm94eSA9IF90aGlzLmFyZ3M7XG4gICAgICAgICAgdmFyIHByb3BlcnR5ID0gajtcbiAgICAgICAgICB2YXIgcHJvcGVydHlTcGxpdCA9IGouc3BsaXQoJ3wnKTtcbiAgICAgICAgICB2YXIgdHJhbnNmb3JtZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgbG9uZ1Byb3BlcnR5ID0gajtcbiAgICAgICAgICBpZiAocHJvcGVydHlTcGxpdC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IF90aGlzLnN0cmluZ1RyYW5zZm9ybWVyKHByb3BlcnR5U3BsaXQuc2xpY2UoMSkpO1xuICAgICAgICAgICAgcHJvcGVydHkgPSBwcm9wZXJ0eVNwbGl0WzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocHJvcGVydHkubWF0Y2goL1xcLi8pKSB7XG4gICAgICAgICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKF90aGlzLmFyZ3MsIHByb3BlcnR5LCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG1hdGNoaW5nID0gW107XG4gICAgICAgICAgdmFyIGJpbmRQcm9wZXJ0eSA9IGo7XG4gICAgICAgICAgdmFyIG1hdGNoaW5nU2VnbWVudHMgPSBiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldO1xuICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lcikge1xuICAgICAgICAgICAgICB2ID0gdHJhbnNmb3JtZXIodik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBfaSBpbiBiaW5kUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBmb3IgKHZhciBfaiBpbiBiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldKSB7XG4gICAgICAgICAgICAgICAgc2VnbWVudHNbYmluZFByb3BlcnRpZXNbbG9uZ1Byb3BlcnR5XVtfal1dID0gdFtfaV07XG4gICAgICAgICAgICAgICAgaWYgKGsgPT09IHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgICBzZWdtZW50c1tiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldW19qXV0gPSB2O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgICAgICAgdGFnLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUubmFtZSwgc2VnbWVudHMuam9pbignJykpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgX3RoaXMudW5wYXVzZUNhbGxiYWNrcy5zZXQoYXR0cmlidXRlLCAoKSA9PiB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBzZWdtZW50cy5qb2luKCcnKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfTtcbiAgICAgICAgZm9yICh2YXIgaiBpbiBiaW5kUHJvcGVydGllcykge1xuICAgICAgICAgIF9sb29wNCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWcuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoX2xvb3AzKCkpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFJlZlRhZyh0YWcpIHtcbiAgICB2YXIgcmVmQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXJlZicpO1xuICAgIHZhciBbcmVmUHJvcCwgcmVmQ2xhc3NuYW1lID0gbnVsbCwgcmVmS2V5ID0gbnVsbF0gPSByZWZBdHRyLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHJlZkNsYXNzID0gX1RhZy5UYWc7XG4gICAgaWYgKHJlZkNsYXNzbmFtZSkge1xuICAgICAgcmVmQ2xhc3MgPSB0aGlzLnN0cmluZ1RvQ2xhc3MocmVmQ2xhc3NuYW1lKTtcbiAgICB9XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtcmVmJyk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhZywgJ19fX3RhZ19fXycsIHtcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIHRhZy5fX190YWdfX18gPSBudWxsO1xuICAgICAgdGFnLnJlbW92ZSgpO1xuICAgIH0pO1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIHZhciBkaXJlY3QgPSB0aGlzO1xuICAgIGlmICh0aGlzLnZpZXdMaXN0KSB7XG4gICAgICBwYXJlbnQgPSB0aGlzLnZpZXdMaXN0LnBhcmVudDtcbiAgICAgIC8vIGlmKCF0aGlzLnZpZXdMaXN0LnBhcmVudC50YWdzW3JlZlByb3BdKVxuICAgICAgLy8ge1xuICAgICAgLy8gXHR0aGlzLnZpZXdMaXN0LnBhcmVudC50YWdzW3JlZlByb3BdID0gW107XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIGxldCByZWZLZXlWYWwgPSB0aGlzLmFyZ3NbcmVmS2V5XTtcblxuICAgICAgLy8gdGhpcy52aWV3TGlzdC5wYXJlbnQudGFnc1tyZWZQcm9wXVtyZWZLZXlWYWxdID0gbmV3IHJlZkNsYXNzKFxuICAgICAgLy8gXHR0YWcsIHRoaXMsIHJlZlByb3AsIHJlZktleVZhbFxuICAgICAgLy8gKTtcbiAgICB9XG4gICAgLy8gZWxzZVxuICAgIC8vIHtcbiAgICAvLyBcdHRoaXMudGFnc1tyZWZQcm9wXSA9IG5ldyByZWZDbGFzcyhcbiAgICAvLyBcdFx0dGFnLCB0aGlzLCByZWZQcm9wXG4gICAgLy8gXHQpO1xuICAgIC8vIH1cblxuICAgIHZhciB0YWdPYmplY3QgPSBuZXcgcmVmQ2xhc3ModGFnLCB0aGlzLCByZWZQcm9wLCB1bmRlZmluZWQsIGRpcmVjdCk7XG4gICAgdGFnLl9fX3RhZ19fXyA9IHRhZ09iamVjdDtcbiAgICB0aGlzLnRhZ3NbcmVmUHJvcF0gPSB0YWdPYmplY3Q7XG4gICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgdmFyIHJlZktleVZhbCA9IHRoaXMuYXJnc1tyZWZLZXldO1xuICAgICAgaWYgKHJlZktleVZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICghcGFyZW50LnRhZ3NbcmVmUHJvcF0pIHtcbiAgICAgICAgICBwYXJlbnQudGFnc1tyZWZQcm9wXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudC50YWdzW3JlZlByb3BdW3JlZktleVZhbF0gPSB0YWdPYmplY3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJlbnQudGFnc1tyZWZQcm9wXSA9IHRhZ09iamVjdDtcbiAgICAgIH1cbiAgICAgIGlmICghcGFyZW50LnBhcmVudCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwQmluZFRhZyh0YWcpIHtcbiAgICB2YXIgYmluZEFyZyA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWJpbmQnKTtcbiAgICB2YXIgcHJveHkgPSB0aGlzLmFyZ3M7XG4gICAgdmFyIHByb3BlcnR5ID0gYmluZEFyZztcbiAgICB2YXIgdG9wID0gbnVsbDtcbiAgICBpZiAoYmluZEFyZy5tYXRjaCgvXFwuLykpIHtcbiAgICAgIFtwcm94eSwgcHJvcGVydHksIHRvcF0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZSh0aGlzLmFyZ3MsIGJpbmRBcmcsIHRydWUpO1xuICAgIH1cbiAgICBpZiAocHJveHkgIT09IHRoaXMuYXJncykge1xuICAgICAgdGhpcy5zdWJCaW5kaW5nc1tiaW5kQXJnXSA9IHRoaXMuc3ViQmluZGluZ3NbYmluZEFyZ10gfHwgW107XG4gICAgICB0aGlzLm9uUmVtb3ZlKHRoaXMuYXJncy5iaW5kVG8odG9wLCAoKSA9PiB7XG4gICAgICAgIHdoaWxlICh0aGlzLnN1YkJpbmRpbmdzLmxlbmd0aCkge1xuICAgICAgICAgIHRoaXMuc3ViQmluZGluZ3Muc2hpZnQoKSgpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfVxuICAgIHZhciB1bnNhZmVIdG1sID0gZmFsc2U7XG4gICAgaWYgKHByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICBwcm9wZXJ0eSA9IHByb3BlcnR5LnN1YnN0cigxKTtcbiAgICAgIHVuc2FmZUh0bWwgPSB0cnVlO1xuICAgIH1cbiAgICB2YXIgYXV0b0V2ZW50U3RhcnRlZCA9IGZhbHNlO1xuICAgIHZhciBkZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICBpZiAoKHAgaW5zdGFuY2VvZiBWaWV3IHx8IHAgaW5zdGFuY2VvZiBOb2RlIHx8IHAgaW5zdGFuY2VvZiBfVGFnLlRhZykgJiYgcCAhPT0gdikge1xuICAgICAgICBwLnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgaWYgKFsnSU5QVVQnLCAnU0VMRUNUJywgJ1RFWFRBUkVBJ10uaW5jbHVkZXModGFnLnRhZ05hbWUpKSB7XG4gICAgICAgIHZhciBfdHlwZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcbiAgICAgICAgaWYgKF90eXBlICYmIF90eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICB0YWcuY2hlY2tlZCA9ICEhdjtcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSAmJiBfdHlwZS50b0xvd2VyQ2FzZSgpID09PSAncmFkaW8nKSB7XG4gICAgICAgICAgdGFnLmNoZWNrZWQgPSB2ID09IHRhZy52YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSAhPT0gJ2ZpbGUnKSB7XG4gICAgICAgICAgaWYgKHRhZy50YWdOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgICAgICAgdmFyIHNlbGVjdE9wdGlvbiA9ICgpID0+IHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWcub3B0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb24gPSB0YWcub3B0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uLnZhbHVlID09IHYpIHtcbiAgICAgICAgICAgICAgICAgIHRhZy5zZWxlY3RlZEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzZWxlY3RPcHRpb24oKTtcbiAgICAgICAgICAgIHRoaXMubm9kZXNBdHRhY2hlZC5hZGQoc2VsZWN0T3B0aW9uKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGFnLnZhbHVlID0gdiA9PSBudWxsID8gJycgOiB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoYXV0b0V2ZW50U3RhcnRlZCkge1xuICAgICAgICAgIHRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZBdXRvQ2hhbmdlZCcsIHtcbiAgICAgICAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgYXV0b0V2ZW50U3RhcnRlZCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodiBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgICAgICBmb3IgKHZhciBub2RlIG9mIHRhZy5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICBub2RlLnJlbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2W19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IHRoaXM7XG4gICAgICAgICAgdi5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICAgIHRhZy5pbnNlcnQodik7XG4gICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICAgICAgdGFnLmFwcGVuZCh2Lm5vZGUpO1xuICAgICAgICB9IGVsc2UgaWYgKHVuc2FmZUh0bWwpIHtcbiAgICAgICAgICBpZiAodGFnLmlubmVySFRNTCAhPT0gdikge1xuICAgICAgICAgICAgdiA9IFN0cmluZyh2KTtcbiAgICAgICAgICAgIGlmICh0YWcuaW5uZXJIVE1MID09PSB2LnN1YnN0cmluZygwLCB0YWcuaW5uZXJIVE1MLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgdGFnLmlubmVySFRNTCArPSB2LnN1YnN0cmluZyh0YWcuaW5uZXJIVE1MLmxlbmd0aCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3IgKHZhciBfbm9kZSBvZiB0YWcuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgIF9ub2RlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHRhZy5pbm5lckhUTUwgPSB2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX0RvbS5Eb20ubWFwVGFncyh0YWcsIGZhbHNlLCB0ID0+IHRbZG9udFBhcnNlXSA9IHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGFnLnRleHRDb250ZW50ICE9PSB2KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBfbm9kZTIgb2YgdGFnLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgX25vZGUyLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFnLnRleHRDb250ZW50ID0gdjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAocHJveHkgIT09IHRoaXMuYXJncykge1xuICAgICAgdGhpcy5zdWJCaW5kaW5nc1tiaW5kQXJnXS5wdXNoKGRlYmluZCk7XG4gICAgfVxuICAgIHRoaXMub25SZW1vdmUoZGViaW5kKTtcbiAgICB2YXIgdHlwZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcbiAgICB2YXIgbXVsdGkgPSB0YWcuZ2V0QXR0cmlidXRlKCdtdWx0aXBsZScpO1xuICAgIHZhciBpbnB1dExpc3RlbmVyID0gZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50LnRhcmdldCAhPT0gdGFnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlICYmIHR5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICBpZiAodGFnLmNoZWNrZWQpIHtcbiAgICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBldmVudC50YXJnZXQuZ2V0QXR0cmlidXRlKCd2YWx1ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50LnRhcmdldC5tYXRjaGVzKCdbY29udGVudGVkaXRhYmxlPXRydWVdJykpIHtcbiAgICAgICAgcHJveHlbcHJvcGVydHldID0gZXZlbnQudGFyZ2V0LmlubmVySFRNTDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2ZpbGUnICYmIG11bHRpKSB7XG4gICAgICAgIHZhciBmaWxlcyA9IEFycmF5LmZyb20oZXZlbnQudGFyZ2V0LmZpbGVzKTtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBwcm94eVtwcm9wZXJ0eV0gfHwgX0JpbmRhYmxlLkJpbmRhYmxlLm9uRGVjayhwcm94eSwgcHJvcGVydHkpO1xuICAgICAgICBpZiAoIWN1cnJlbnQgfHwgIWZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGZpbGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBfbG9vcDUgPSBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgaWYgKGZpbGVzW2ldICE9PSBjdXJyZW50W2ldKSB7XG4gICAgICAgICAgICAgIGZpbGVzW2ldLnRvSlNPTiA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgbmFtZTogZmlsZVtpXS5uYW1lLFxuICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZVtpXS5zaXplLFxuICAgICAgICAgICAgICAgICAgdHlwZTogZmlsZVtpXS50eXBlLFxuICAgICAgICAgICAgICAgICAgZGF0ZTogZmlsZVtpXS5sYXN0TW9kaWZpZWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjdXJyZW50W2ldID0gZmlsZXNbaV07XG4gICAgICAgICAgICAgIHJldHVybiAxOyAvLyBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgZm9yICh2YXIgaSBpbiBmaWxlcykge1xuICAgICAgICAgICAgaWYgKF9sb29wNShpKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdmaWxlJyAmJiAhbXVsdGkgJiYgZXZlbnQudGFyZ2V0LmZpbGVzLmxlbmd0aCkge1xuICAgICAgICB2YXIgX2ZpbGUgPSBldmVudC50YXJnZXQuZmlsZXMuaXRlbSgwKTtcbiAgICAgICAgX2ZpbGUudG9KU09OID0gKCkgPT4ge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBfZmlsZS5uYW1lLFxuICAgICAgICAgICAgc2l6ZTogX2ZpbGUuc2l6ZSxcbiAgICAgICAgICAgIHR5cGU6IF9maWxlLnR5cGUsXG4gICAgICAgICAgICBkYXRlOiBfZmlsZS5sYXN0TW9kaWZpZWRcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBfZmlsZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGlmICh0eXBlID09PSAnZmlsZScgfHwgdHlwZSA9PT0gJ3JhZGlvJykge1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCd2YWx1ZS1jaGFuZ2VkJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgfVxuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgaWYgKHR5cGUgPT09ICdmaWxlJyB8fCB0eXBlID09PSAncmFkaW8nKSB7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdpbnB1dCcsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCd2YWx1ZS1jaGFuZ2VkJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtYmluZCcpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwT25UYWcodGFnKSB7XG4gICAgdmFyIHJlZmVyZW50cyA9IFN0cmluZyh0YWcuZ2V0QXR0cmlidXRlKCdjdi1vbicpKTtcbiAgICByZWZlcmVudHMuc3BsaXQoJzsnKS5tYXAoYSA9PiBhLnNwbGl0KCc6JykpLmZvckVhY2goYSA9PiB7XG4gICAgICBhID0gYS5tYXAoYSA9PiBhLnRyaW0oKSk7XG4gICAgICB2YXIgYXJnTGVuID0gYS5sZW5ndGg7XG4gICAgICB2YXIgZXZlbnROYW1lID0gU3RyaW5nKGEuc2hpZnQoKSkudHJpbSgpO1xuICAgICAgdmFyIGNhbGxiYWNrTmFtZSA9IFN0cmluZyhhLnNoaWZ0KCkgfHwgZXZlbnROYW1lKS50cmltKCk7XG4gICAgICB2YXIgZXZlbnRGbGFncyA9IFN0cmluZyhhLnNoaWZ0KCkgfHwgJycpLnRyaW0oKTtcbiAgICAgIHZhciBhcmdMaXN0ID0gW107XG4gICAgICB2YXIgZ3JvdXBzID0gLyhcXHcrKSg/OlxcKChbJFxcd1xccy0nXCIsXSspXFwpKT8vLmV4ZWMoY2FsbGJhY2tOYW1lKTtcbiAgICAgIGlmIChncm91cHMpIHtcbiAgICAgICAgY2FsbGJhY2tOYW1lID0gZ3JvdXBzWzFdLnJlcGxhY2UoLyheW1xcc1xcbl0rfFtcXHNcXG5dKyQpLywgJycpO1xuICAgICAgICBpZiAoZ3JvdXBzWzJdKSB7XG4gICAgICAgICAgYXJnTGlzdCA9IGdyb3Vwc1syXS5zcGxpdCgnLCcpLm1hcChzID0+IHMudHJpbSgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFhcmdMaXN0Lmxlbmd0aCkge1xuICAgICAgICBhcmdMaXN0LnB1c2goJyRldmVudCcpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudE5hbWUgfHwgYXJnTGVuID09PSAxKSB7XG4gICAgICAgIGV2ZW50TmFtZSA9IGNhbGxiYWNrTmFtZTtcbiAgICAgIH1cbiAgICAgIHZhciBldmVudExpc3RlbmVyID0gZXZlbnQgPT4ge1xuICAgICAgICB2YXIgZXZlbnRNZXRob2Q7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgX2xvb3A2ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXIgPSBwYXJlbnQuY29udHJvbGxlcjtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udHJvbGxlcltjYWxsYmFja05hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGV2ZW50TWV0aG9kID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyW2NhbGxiYWNrTmFtZV0oLi4uYXJncyk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIHJldHVybiAwOyAvLyBicmVha1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyZW50W2NhbGxiYWNrTmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgZXZlbnRNZXRob2QgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgICAgIHBhcmVudFtjYWxsYmFja05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByZXR1cm4gMDsgLy8gYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwYXJlbnQucGFyZW50KSB7XG4gICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gMDsgLy8gYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIF9yZXQyO1xuICAgICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgICAgX3JldDIgPSBfbG9vcDYoKTtcbiAgICAgICAgICBpZiAoX3JldDIgPT09IDApIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhcmdSZWZzID0gYXJnTGlzdC5tYXAoYXJnID0+IHtcbiAgICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgICAgaWYgKE51bWJlcihhcmcpID09IGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJ2V2ZW50JyB8fCBhcmcgPT09ICckZXZlbnQnKSB7XG4gICAgICAgICAgICByZXR1cm4gZXZlbnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckdmlldycpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckY29udHJvbGxlcicpIHtcbiAgICAgICAgICAgIHJldHVybiBjb250cm9sbGVyO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHRhZycpIHtcbiAgICAgICAgICAgIHJldHVybiB0YWc7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckcGFyZW50Jykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnJHN1YnZpZXcnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyBpbiB0aGlzLmFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFyZ3NbYXJnXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoID0gL15bJ1wiXShbXFx3LV0rPylbXCInXSQvLmV4ZWMoYXJnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghKHR5cGVvZiBldmVudE1ldGhvZCA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7Y2FsbGJhY2tOYW1lfSBpcyBub3QgZGVmaW5lZCBvbiBWaWV3IG9iamVjdC5gICsgXCJcXG5cIiArIGBUYWc6YCArIFwiXFxuXCIgKyBgJHt0YWcub3V0ZXJIVE1MfWApO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50TWV0aG9kKC4uLmFyZ1JlZnMpO1xuICAgICAgfTtcbiAgICAgIHZhciBldmVudE9wdGlvbnMgPSB7fTtcbiAgICAgIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdwJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLnBhc3NpdmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdQJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLnBhc3NpdmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdjJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLmNhcHR1cmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdDJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLmNhcHR1cmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdvJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLm9uY2UgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZsYWdzLmluY2x1ZGVzKCdPJykpIHtcbiAgICAgICAgZXZlbnRPcHRpb25zLm9uY2UgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHN3aXRjaCAoZXZlbnROYW1lKSB7XG4gICAgICAgIGNhc2UgJ19pbml0JzpcbiAgICAgICAgICBldmVudExpc3RlbmVyKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ19hdHRhY2gnOlxuICAgICAgICAgIHRoaXMubm9kZXNBdHRhY2hlZC5hZGQoZXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ19kZXRhY2gnOlxuICAgICAgICAgIHRoaXMubm9kZXNEZXRhY2hlZC5hZGQoZXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBldmVudExpc3RlbmVyLCBldmVudE9wdGlvbnMpO1xuICAgICAgICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBldmVudExpc3RlbmVyLCBldmVudE9wdGlvbnMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtldmVudE5hbWUsIGNhbGxiYWNrTmFtZSwgYXJnTGlzdF07XG4gICAgfSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3Ytb24nKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcExpbmtUYWcodGFnKSB7XG4gICAgLy8gY29uc3QgdGFnQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVMaW5rVGFnKHRhZyk7XG5cbiAgICAvLyBjb25zdCBuZXdUYWcgPSB0YWdDb21waWxlcih0aGlzKTtcblxuICAgIC8vIHRhZy5yZXBsYWNlV2l0aChuZXdUYWcpO1xuXG4gICAgLy8gcmV0dXJuIG5ld1RhZztcblxuICAgIHZhciBsaW5rQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgICB0YWcuc2V0QXR0cmlidXRlKCdocmVmJywgbGlua0F0dHIpO1xuICAgIHZhciBsaW5rQ2xpY2sgPSBldmVudCA9PiB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGxpbmtBdHRyLnN1YnN0cmluZygwLCA0KSA9PT0gJ2h0dHAnIHx8IGxpbmtBdHRyLnN1YnN0cmluZygwLCAyKSA9PT0gJy8vJykge1xuICAgICAgICBnbG9iYWxUaGlzLm9wZW4odGFnLmdldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmtBdHRyKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIF9Sb3V0ZXIuUm91dGVyLmdvKHRhZy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSk7XG4gICAgfTtcbiAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaW5rQ2xpY2spO1xuICAgIHRoaXMub25SZW1vdmUoKCh0YWcsIGV2ZW50TGlzdGVuZXIpID0+ICgpID0+IHtcbiAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50TGlzdGVuZXIpO1xuICAgICAgdGFnID0gdW5kZWZpbmVkO1xuICAgICAgZXZlbnRMaXN0ZW5lciA9IHVuZGVmaW5lZDtcbiAgICB9KSh0YWcsIGxpbmtDbGljaykpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gY29tcGlsZUxpbmtUYWcoc291cmNlVGFnKVxuICAvLyB7XG4gIC8vIFx0Y29uc3QgbGlua0F0dHIgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1saW5rJyk7XG4gIC8vIFx0c291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAvLyBcdHJldHVybiAoYmluZGluZ1ZpZXcpID0+IHtcbiAgLy8gXHRcdGNvbnN0IHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUodHJ1ZSk7XG4gIC8vIFx0XHR0YWcuc2V0QXR0cmlidXRlKCdocmVmJywgbGlua0F0dHIpO1xuICAvLyBcdFx0cmV0dXJuIHRhZztcbiAgLy8gXHR9O1xuICAvLyB9XG5cbiAgbWFwUHJlbmRlcmVyVGFnKHRhZykge1xuICAgIHZhciBwcmVyZW5kZXJBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtcHJlcmVuZGVyJyk7XG4gICAgdmFyIHByZXJlbmRlcmluZyA9IGdsb2JhbFRoaXMucHJlcmVuZGVyZXIgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvcHJlcmVuZGVyL2kpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXByZXJlbmRlcicpO1xuICAgIGlmIChwcmVyZW5kZXJpbmcpIHtcbiAgICAgIGdsb2JhbFRoaXMucHJlcmVuZGVyZXIgPSBnbG9iYWxUaGlzLnByZXJlbmRlcmVyIHx8IHRydWU7XG4gICAgfVxuICAgIGlmIChwcmVyZW5kZXJBdHRyID09PSAnbmV2ZXInICYmIHByZXJlbmRlcmluZyB8fCBwcmVyZW5kZXJBdHRyID09PSAnb25seScgJiYgIXByZXJlbmRlcmluZykge1xuICAgICAgdGhpcy5wb3N0TWFwcGluZy5hZGQoKCkgPT4gdGFnLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGFnKSk7XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwV2l0aFRhZyh0YWcpIHtcbiAgICB2YXIgX3RoaXMyID0gdGhpcztcbiAgICB2YXIgd2l0aEF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi13aXRoJyk7XG4gICAgdmFyIGNhcnJ5QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWNhcnJ5Jyk7XG4gICAgdmFyIHZpZXdBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXdpdGgnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1jYXJyeScpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgdmlld0NsYXNzID0gdmlld0F0dHIgPyB0aGlzLnN0cmluZ1RvQ2xhc3Modmlld0F0dHIpIDogVmlldztcbiAgICB2YXIgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsuLi50YWcuY2hpbGROb2Rlc10uZm9yRWFjaChuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4pKTtcbiAgICB2YXIgY2FycnlQcm9wcyA9IFtdO1xuICAgIGlmIChjYXJyeUF0dHIpIHtcbiAgICAgIGNhcnJ5UHJvcHMgPSBjYXJyeUF0dHIuc3BsaXQoJywnKS5tYXAocyA9PiBzLnRyaW0oKSk7XG4gICAgfVxuICAgIHZhciBkZWJpbmQgPSB0aGlzLmFyZ3MuYmluZFRvKHdpdGhBdHRyLCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgaWYgKHRoaXMud2l0aFZpZXdzLmhhcyh0YWcpKSB7XG4gICAgICAgIHRoaXMud2l0aFZpZXdzLmRlbGV0ZSh0YWcpO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHRhZy5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhZy5yZW1vdmVDaGlsZCh0YWcuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgICB2YXIgdmlldyA9IG5ldyB2aWV3Q2xhc3Moe30sIHRoaXMpO1xuICAgICAgdGhpcy5vblJlbW92ZSgodmlldyA9PiAoKSA9PiB7XG4gICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICB9KSh2aWV3KSk7XG4gICAgICB2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gICAgICB2YXIgX2xvb3A3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGViaW5kID0gX3RoaXMyLmFyZ3MuYmluZFRvKGNhcnJ5UHJvcHNbaV0sICh2LCBrKSA9PiB7XG4gICAgICAgICAgdmlldy5hcmdzW2tdID0gdjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZpZXcub25SZW1vdmUoZGViaW5kKTtcbiAgICAgICAgX3RoaXMyLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBkZWJpbmQoKTtcbiAgICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBpIGluIGNhcnJ5UHJvcHMpIHtcbiAgICAgICAgX2xvb3A3KCk7XG4gICAgICB9XG4gICAgICB2YXIgX2xvb3A4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodHlwZW9mIHYgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdiA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHYpO1xuICAgICAgICB2YXIgZGViaW5kID0gdi5iaW5kVG8oX2kyLCAodnYsIGtrLCB0dCwgZGQpID0+IHtcbiAgICAgICAgICBpZiAoIWRkKSB7XG4gICAgICAgICAgICB2aWV3LmFyZ3Nba2tdID0gdnY7XG4gICAgICAgICAgfSBlbHNlIGlmIChrayBpbiB2aWV3LmFyZ3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2aWV3LmFyZ3Nba2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkZWJpbmRVcCA9IHZpZXcuYXJncy5iaW5kVG8oX2kyLCAodnYsIGtrLCB0dCwgZGQpID0+IHtcbiAgICAgICAgICBpZiAoIWRkKSB7XG4gICAgICAgICAgICB2W2trXSA9IHZ2O1xuICAgICAgICAgIH0gZWxzZSBpZiAoa2sgaW4gdikge1xuICAgICAgICAgICAgZGVsZXRlIHZba2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzMi5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgZGViaW5kKCk7XG4gICAgICAgICAgaWYgKCF2LmlzQm91bmQoKSkge1xuICAgICAgICAgICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3Modik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB2aWV3Lm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBkZWJpbmQoKTtcbiAgICAgICAgICBpZiAoIXYuaXNCb3VuZCgpKSB7XG4gICAgICAgICAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh2KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIF9pMiBpbiB2KSB7XG4gICAgICAgIGlmIChfbG9vcDgoKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICB2aWV3LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgICAgdGhpcy53aXRoVmlld3Muc2V0KHRhZywgdmlldyk7XG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICB0aGlzLndpdGhWaWV3cy5kZWxldGUodGFnKTtcbiAgICAgIGRlYmluZCgpO1xuICAgIH0pO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwVmlld1RhZyh0YWcpIHtcbiAgICB2YXIgdmlld0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBwYXJ0cyA9IHZpZXdBdHRyLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHZpZXdOYW1lID0gcGFydHMuc2hpZnQoKTtcbiAgICB2YXIgdmlld0NsYXNzID0gcGFydHMubGVuZ3RoID8gdGhpcy5zdHJpbmdUb0NsYXNzKHBhcnRzWzBdKSA6IFZpZXc7XG4gICAgdmFyIHZpZXcgPSBuZXcgdmlld0NsYXNzKHRoaXMuYXJncywgdGhpcyk7XG4gICAgdGhpcy52aWV3cy5zZXQodGFnLCB2aWV3KTtcbiAgICB0aGlzLnZpZXdzLnNldCh2aWV3TmFtZSwgdmlldyk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgdGhpcy52aWV3cy5kZWxldGUodGFnKTtcbiAgICAgIHRoaXMudmlld3MuZGVsZXRlKHZpZXdOYW1lKTtcbiAgICB9KTtcbiAgICB2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gICAgdmlldy5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcEVhY2hUYWcodGFnKSB7XG4gICAgdmFyIGVhY2hBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtZWFjaCcpO1xuICAgIHZhciB2aWV3QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1lYWNoJyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSB2aWV3QXR0ciA/IHRoaXMuc3RyaW5nVG9DbGFzcyh2aWV3QXR0cikgOiBWaWV3O1xuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBbZWFjaFByb3AsIGFzUHJvcCwga2V5UHJvcF0gPSBlYWNoQXR0ci5zcGxpdCgnOicpO1xuICAgIHZhciBwcm94eSA9IHRoaXMuYXJncztcbiAgICB2YXIgcHJvcGVydHkgPSBlYWNoUHJvcDtcbiAgICBpZiAoZWFjaFByb3AubWF0Y2goL1xcLi8pKSB7XG4gICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKHRoaXMuYXJncywgZWFjaFByb3AsIHRydWUpO1xuICAgIH1cbiAgICB2YXIgZGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgaWYgKHYgaW5zdGFuY2VvZiBfQmFnLkJhZykge1xuICAgICAgICB2ID0gdi5saXN0O1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMudmlld0xpc3RzLmhhcyh0YWcpKSB7XG4gICAgICAgIHRoaXMudmlld0xpc3RzLmdldCh0YWcpLnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgdmFyIHZpZXdMaXN0ID0gbmV3IF9WaWV3TGlzdC5WaWV3TGlzdChzdWJUZW1wbGF0ZSwgYXNQcm9wLCB2LCB0aGlzLCBrZXlQcm9wLCB2aWV3Q2xhc3MpO1xuICAgICAgdmFyIHZpZXdMaXN0UmVtb3ZlciA9ICgpID0+IHZpZXdMaXN0LnJlbW92ZSgpO1xuICAgICAgdGhpcy5vblJlbW92ZSh2aWV3TGlzdFJlbW92ZXIpO1xuICAgICAgdmlld0xpc3Qub25SZW1vdmUoKCkgPT4gdGhpcy5fb25SZW1vdmUucmVtb3ZlKHZpZXdMaXN0UmVtb3ZlcikpO1xuICAgICAgdmFyIGRlYmluZEEgPSB0aGlzLmFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgIGlmIChrID09PSAnX2lkJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWQpIHtcbiAgICAgICAgICB2aWV3TGlzdC5zdWJBcmdzW2tdID0gdjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoayBpbiB2aWV3TGlzdC5zdWJBcmdzKSB7XG4gICAgICAgICAgICBkZWxldGUgdmlld0xpc3Quc3ViQXJnc1trXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIGRlYmluZEIgPSB2aWV3TGlzdC5hcmdzLmJpbmRUbygodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgICBpZiAoayA9PT0gJ19pZCcgfHwgayA9PT0gJ3ZhbHVlJyB8fCBTdHJpbmcoaykuc3Vic3RyaW5nKDAsIDMpID09PSAnX19fJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWQpIHtcbiAgICAgICAgICBpZiAoayBpbiB0aGlzLmFyZ3MpIHtcbiAgICAgICAgICAgIHRoaXMuYXJnc1trXSA9IHY7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLmFyZ3Nba107XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmlld0xpc3Qub25SZW1vdmUoZGViaW5kQSk7XG4gICAgICB2aWV3TGlzdC5vblJlbW92ZShkZWJpbmRCKTtcbiAgICAgIHRoaXMub25SZW1vdmUoZGViaW5kQSk7XG4gICAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZEIpO1xuICAgICAgd2hpbGUgKHRhZy5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhZy5yZW1vdmVDaGlsZCh0YWcuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgICB0aGlzLnZpZXdMaXN0cy5zZXQodGFnLCB2aWV3TGlzdCk7XG4gICAgICB2aWV3TGlzdC5yZW5kZXIodGFnLCBudWxsLCB0aGlzKTtcbiAgICAgIGlmICh0YWcudGFnTmFtZSA9PT0gJ1NFTEVDVCcpIHtcbiAgICAgICAgdmlld0xpc3QucmVSZW5kZXIoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKGRlYmluZCk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBJZlRhZyh0YWcpIHtcbiAgICB2YXIgc291cmNlVGFnID0gdGFnO1xuICAgIHZhciB2aWV3UHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIGlmUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1pZicpO1xuICAgIHZhciBpc1Byb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtaXMnKTtcbiAgICB2YXIgaW52ZXJ0ZWQgPSBmYWxzZTtcbiAgICB2YXIgZGVmaW5lZCA9IGZhbHNlO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICBzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1pZicpO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWlzJyk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHZpZXdQcm9wZXJ0eSA/IHRoaXMuc3RyaW5nVG9DbGFzcyh2aWV3UHJvcGVydHkpIDogVmlldztcbiAgICBpZiAoaWZQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICchJykge1xuICAgICAgaWZQcm9wZXJ0eSA9IGlmUHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgaW52ZXJ0ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaWZQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICc/Jykge1xuICAgICAgaWZQcm9wZXJ0eSA9IGlmUHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgZGVmaW5lZCA9IHRydWU7XG4gICAgfVxuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnNvdXJjZVRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBiaW5kaW5nVmlldyA9IHRoaXM7XG4gICAgdmFyIGlmRG9jID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgIC8vIGxldCB2aWV3ID0gbmV3IHZpZXdDbGFzcyhPYmplY3QuYXNzaWduKHt9LCB0aGlzLmFyZ3MpLCBiaW5kaW5nVmlldyk7XG4gICAgdmFyIHZpZXcgPSBuZXcgdmlld0NsYXNzKHRoaXMuYXJncywgYmluZGluZ1ZpZXcpO1xuICAgIHZpZXcudGFncy5iaW5kVG8oKHYsIGspID0+IHRoaXMudGFnc1trXSA9IHYsIHtcbiAgICAgIHJlbW92ZVdpdGg6IHRoaXNcbiAgICB9KTtcbiAgICB2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gICAgdmFyIHByb3h5ID0gYmluZGluZ1ZpZXcuYXJncztcbiAgICB2YXIgcHJvcGVydHkgPSBpZlByb3BlcnR5O1xuICAgIGlmIChpZlByb3BlcnR5Lm1hdGNoKC9cXC4vKSkge1xuICAgICAgW3Byb3h5LCBwcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUucmVzb2x2ZShiaW5kaW5nVmlldy5hcmdzLCBpZlByb3BlcnR5LCB0cnVlKTtcbiAgICB9XG4gICAgdmlldy5yZW5kZXIoaWZEb2MsIG51bGwsIHRoaXMpO1xuICAgIHZhciBwcm9wZXJ0eURlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGspID0+IHtcbiAgICAgIHZhciBvID0gdjtcbiAgICAgIGlmIChkZWZpbmVkKSB7XG4gICAgICAgIHYgPSB2ICE9PSBudWxsICYmIHYgIT09IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGlmICh2IGluc3RhbmNlb2YgX0JhZy5CYWcpIHtcbiAgICAgICAgdiA9IHYubGlzdDtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHYpKSB7XG4gICAgICAgIHYgPSAhIXYubGVuZ3RoO1xuICAgICAgfVxuICAgICAgaWYgKGlzUHJvcGVydHkgIT09IG51bGwpIHtcbiAgICAgICAgdiA9IG8gPT0gaXNQcm9wZXJ0eTtcbiAgICAgIH1cbiAgICAgIGlmIChpbnZlcnRlZCkge1xuICAgICAgICB2ID0gIXY7XG4gICAgICB9XG4gICAgICBpZiAodikge1xuICAgICAgICB0YWcuYXBwZW5kQ2hpbGQoaWZEb2MpO1xuICAgICAgICBbLi4uaWZEb2MuY2hpbGROb2Rlc10uZm9yRWFjaChub2RlID0+IF9Eb20uRG9tLm1hcFRhZ3Mobm9kZSwgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgICAgIGlmICghdGFnLm1hdGNoZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkRvbUF0dGFjaGVkJywge1xuICAgICAgICAgICAgdGFyZ2V0OiB0YWcsXG4gICAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgICAgdmlldzogdmlldyB8fCB0aGlzLFxuICAgICAgICAgICAgICBtYWluVmlldzogdGhpc1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmlldy5ub2Rlcy5mb3JFYWNoKG4gPT4gaWZEb2MuYXBwZW5kQ2hpbGQobikpO1xuICAgICAgICBfRG9tLkRvbS5tYXBUYWdzKGlmRG9jLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICAgICAgaWYgKCF0YWcubWF0Y2hlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tRGV0YWNoZWQnLCB7XG4gICAgICAgICAgICB0YXJnZXQ6IHRhZyxcbiAgICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KHByb3h5W3Byb3BlcnR5XSlcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IHByb3BlcnR5RGViaW5kID0gdGhpcy5hcmdzLmJpbmRDaGFpbihwcm9wZXJ0eSwgb25VcGRhdGUpO1xuXG4gICAgYmluZGluZ1ZpZXcub25SZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuXG4gICAgLy8gY29uc3QgZGViaW5kQSA9IHRoaXMuYXJncy5iaW5kVG8oKHYsayx0LGQpID0+IHtcbiAgICAvLyBcdGlmKGsgPT09ICdfaWQnKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRyZXR1cm47XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGlmKCFkKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHR2aWV3LmFyZ3Nba10gPSB2O1xuICAgIC8vIFx0fVxuICAgIC8vIFx0ZWxzZSBpZihrIGluIHZpZXcuYXJncylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0ZGVsZXRlIHZpZXcuYXJnc1trXTtcbiAgICAvLyBcdH1cblxuICAgIC8vIH0pO1xuXG4gICAgLy8gY29uc3QgZGViaW5kQiA9IHZpZXcuYXJncy5iaW5kVG8oKHYsayx0LGQscCkgPT4ge1xuICAgIC8vIFx0aWYoayA9PT0gJ19pZCcgfHwgU3RyaW5nKGspLnN1YnN0cmluZygwLDMpID09PSAnX19fJylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0cmV0dXJuO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRpZihrIGluIHRoaXMuYXJncylcbiAgICAvLyBcdHtcbiAgICAvLyBcdFx0aWYoIWQpXG4gICAgLy8gXHRcdHtcbiAgICAvLyBcdFx0XHR0aGlzLmFyZ3Nba10gPSB2O1xuICAgIC8vIFx0XHR9XG4gICAgLy8gXHRcdGVsc2VcbiAgICAvLyBcdFx0e1xuICAgIC8vIFx0XHRcdGRlbGV0ZSB0aGlzLmFyZ3Nba107XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdH1cbiAgICAvLyB9KTtcblxuICAgIHZhciB2aWV3RGViaW5kID0gKCkgPT4ge1xuICAgICAgcHJvcGVydHlEZWJpbmQoKTtcbiAgICAgIC8vIGRlYmluZEEoKTtcbiAgICAgIC8vIGRlYmluZEIoKTtcbiAgICAgIGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuICAgICAgLy8gYmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShiaW5kYWJsZURlYmluZCk7XG4gICAgfTtcbiAgICBiaW5kaW5nVmlldy5vblJlbW92ZSh2aWV3RGViaW5kKTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIC8vIGRlYmluZEEoKTtcbiAgICAgIC8vIGRlYmluZEIoKTtcbiAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICBpZiAoYmluZGluZ1ZpZXcgIT09IHRoaXMpIHtcbiAgICAgICAgYmluZGluZ1ZpZXcucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIGNvbXBpbGVJZlRhZyhzb3VyY2VUYWcpXG4gIC8vIHtcbiAgLy8gXHRsZXQgaWZQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWlmJyk7XG4gIC8vIFx0bGV0IGludmVydGVkICAgPSBmYWxzZTtcblxuICAvLyBcdHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWlmJyk7XG5cbiAgLy8gXHRpZihpZlByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyEnKVxuICAvLyBcdHtcbiAgLy8gXHRcdGlmUHJvcGVydHkgPSBpZlByb3BlcnR5LnN1YnN0cigxKTtcbiAgLy8gXHRcdGludmVydGVkICAgPSB0cnVlO1xuICAvLyBcdH1cblxuICAvLyBcdGNvbnN0IHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQ7XG5cbiAgLy8gXHRbLi4uc291cmNlVGFnLmNoaWxkTm9kZXNdLmZvckVhY2goXG4gIC8vIFx0XHRuID0+IHN1YlRlbXBsYXRlLmFwcGVuZENoaWxkKG4uY2xvbmVOb2RlKHRydWUpKVxuICAvLyBcdCk7XG5cbiAgLy8gXHRyZXR1cm4gKGJpbmRpbmdWaWV3KSA9PiB7XG5cbiAgLy8gXHRcdGNvbnN0IHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUoKTtcblxuICAvLyBcdFx0Y29uc3QgaWZEb2MgPSBuZXcgRG9jdW1lbnRGcmFnbWVudDtcblxuICAvLyBcdFx0bGV0IHZpZXcgPSBuZXcgVmlldyh7fSwgYmluZGluZ1ZpZXcpO1xuXG4gIC8vIFx0XHR2aWV3LnRlbXBsYXRlID0gc3ViVGVtcGxhdGU7XG4gIC8vIFx0XHQvLyB2aWV3LnBhcmVudCAgID0gYmluZGluZ1ZpZXc7XG5cbiAgLy8gXHRcdGJpbmRpbmdWaWV3LnN5bmNCaW5kKHZpZXcpO1xuXG4gIC8vIFx0XHRsZXQgcHJveHkgICAgPSBiaW5kaW5nVmlldy5hcmdzO1xuICAvLyBcdFx0bGV0IHByb3BlcnR5ID0gaWZQcm9wZXJ0eTtcblxuICAvLyBcdFx0aWYoaWZQcm9wZXJ0eS5tYXRjaCgvXFwuLykpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdFtwcm94eSwgcHJvcGVydHldID0gQmluZGFibGUucmVzb2x2ZShcbiAgLy8gXHRcdFx0XHRiaW5kaW5nVmlldy5hcmdzXG4gIC8vIFx0XHRcdFx0LCBpZlByb3BlcnR5XG4gIC8vIFx0XHRcdFx0LCB0cnVlXG4gIC8vIFx0XHRcdCk7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGxldCBoYXNSZW5kZXJlZCA9IGZhbHNlO1xuXG4gIC8vIFx0XHRjb25zdCBwcm9wZXJ0eURlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsaykgPT4ge1xuXG4gIC8vIFx0XHRcdGlmKCFoYXNSZW5kZXJlZClcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdGNvbnN0IHJlbmRlckRvYyA9IChiaW5kaW5nVmlldy5hcmdzW3Byb3BlcnR5XSB8fCBpbnZlcnRlZClcbiAgLy8gXHRcdFx0XHRcdD8gdGFnIDogaWZEb2M7XG5cbiAgLy8gXHRcdFx0XHR2aWV3LnJlbmRlcihyZW5kZXJEb2MpO1xuXG4gIC8vIFx0XHRcdFx0aGFzUmVuZGVyZWQgPSB0cnVlO1xuXG4gIC8vIFx0XHRcdFx0cmV0dXJuO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0aWYoQXJyYXkuaXNBcnJheSh2KSlcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHYgPSAhIXYubGVuZ3RoO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdFx0aWYoaW52ZXJ0ZWQpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR2ID0gIXY7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRpZih2KVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0dGFnLmFwcGVuZENoaWxkKGlmRG9jKTtcbiAgLy8gXHRcdFx0fVxuICAvLyBcdFx0XHRlbHNlXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR2aWV3Lm5vZGVzLmZvckVhY2gobj0+aWZEb2MuYXBwZW5kQ2hpbGQobikpO1xuICAvLyBcdFx0XHR9XG5cbiAgLy8gXHRcdH0pO1xuXG4gIC8vIFx0XHQvLyBsZXQgY2xlYW5lciA9IGJpbmRpbmdWaWV3O1xuXG4gIC8vIFx0XHQvLyB3aGlsZShjbGVhbmVyLnBhcmVudClcbiAgLy8gXHRcdC8vIHtcbiAgLy8gXHRcdC8vIFx0Y2xlYW5lciA9IGNsZWFuZXIucGFyZW50O1xuICAvLyBcdFx0Ly8gfVxuXG4gIC8vIFx0XHRiaW5kaW5nVmlldy5vblJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG5cbiAgLy8gXHRcdGxldCBiaW5kYWJsZURlYmluZCA9ICgpID0+IHtcblxuICAvLyBcdFx0XHRpZighcHJveHkuaXNCb3VuZCgpKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyhwcm94eSk7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0fTtcblxuICAvLyBcdFx0bGV0IHZpZXdEZWJpbmQgPSAoKT0+e1xuICAvLyBcdFx0XHRwcm9wZXJ0eURlYmluZCgpO1xuICAvLyBcdFx0XHRiaW5kYWJsZURlYmluZCgpO1xuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShiaW5kYWJsZURlYmluZCk7XG4gIC8vIFx0XHR9O1xuXG4gIC8vIFx0XHR2aWV3Lm9uUmVtb3ZlKHZpZXdEZWJpbmQpO1xuXG4gIC8vIFx0XHRyZXR1cm4gdGFnO1xuICAvLyBcdH07XG4gIC8vIH1cblxuICBtYXBUZW1wbGF0ZVRhZyh0YWcpIHtcbiAgICAvLyBjb25zdCB0ZW1wbGF0ZU5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuXG4gICAgLy8gdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcblxuICAgIC8vIHRoaXMudGVtcGxhdGVzWyB0ZW1wbGF0ZU5hbWUgXSA9IHRhZy50YWdOYW1lID09PSAnVEVNUExBVEUnXG4gICAgLy8gXHQ/IHRhZy5jbG9uZU5vZGUodHJ1ZSkuY29udGVudFxuICAgIC8vIFx0OiBuZXcgRG9jdW1lbnRGcmFnbWVudCh0YWcuaW5uZXJIVE1MKTtcblxuICAgIHZhciB0ZW1wbGF0ZU5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG4gICAgdmFyIHNvdXJjZSA9IHRhZy5pbm5lckhUTUw7XG4gICAgaWYgKCFWaWV3LnRlbXBsYXRlcy5oYXMoc291cmNlKSkge1xuICAgICAgVmlldy50ZW1wbGF0ZXMuc2V0KHNvdXJjZSwgZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQodGFnLmlubmVySFRNTCkpO1xuICAgIH1cbiAgICB0aGlzLnRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdID0gVmlldy50ZW1wbGF0ZXMuZ2V0KHNvdXJjZSk7XG4gICAgdGhpcy5wb3N0TWFwcGluZy5hZGQoKCkgPT4gdGFnLnJlbW92ZSgpKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcFNsb3RUYWcodGFnKSB7XG4gICAgdmFyIHRlbXBsYXRlTmFtZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXNsb3QnKTtcbiAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdO1xuICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICB0ZW1wbGF0ZSA9IHBhcmVudC50ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXTtcbiAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgIH1cbiAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgVGVtcGxhdGUgJHt0ZW1wbGF0ZU5hbWV9IG5vdCBmb3VuZC5gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1zbG90Jyk7XG4gICAgd2hpbGUgKHRhZy5maXJzdENoaWxkKSB7XG4gICAgICB0YWcuZmlyc3RDaGlsZC5yZW1vdmUoKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmICghVmlldy50ZW1wbGF0ZXMuaGFzKHRlbXBsYXRlKSkge1xuICAgICAgICBWaWV3LnRlbXBsYXRlcy5zZXQodGVtcGxhdGUsIGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHRlbXBsYXRlKSk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZSA9IFZpZXcudGVtcGxhdGVzLmdldCh0ZW1wbGF0ZSk7XG4gICAgfVxuICAgIHRhZy5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBzeW5jQmluZChzdWJWaWV3KVxuICAvLyB7XG4gIC8vIFx0bGV0IGRlYmluZEEgPSB0aGlzLmFyZ3MuYmluZFRvKCh2LGssdCxkKT0+e1xuICAvLyBcdFx0aWYoayA9PT0gJ19pZCcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHJldHVybjtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYoc3ViVmlldy5hcmdzW2tdICE9PSB2KVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRzdWJWaWV3LmFyZ3Nba10gPSB2O1xuICAvLyBcdFx0fVxuICAvLyBcdH0pO1xuXG4gIC8vIFx0bGV0IGRlYmluZEIgPSBzdWJWaWV3LmFyZ3MuYmluZFRvKCh2LGssdCxkLHApPT57XG5cbiAgLy8gXHRcdGlmKGsgPT09ICdfaWQnKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRyZXR1cm47XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGxldCBuZXdSZWYgPSB2O1xuICAvLyBcdFx0bGV0IG9sZFJlZiA9IHA7XG5cbiAgLy8gXHRcdGlmKG5ld1JlZiBpbnN0YW5jZW9mIFZpZXcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdG5ld1JlZiA9IG5ld1JlZi5fX19yZWZfX187XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKG9sZFJlZiBpbnN0YW5jZW9mIFZpZXcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdG9sZFJlZiA9IG9sZFJlZi5fX19yZWZfX187XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKG5ld1JlZiAhPT0gb2xkUmVmICYmIG9sZFJlZiBpbnN0YW5jZW9mIFZpZXcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHAucmVtb3ZlKCk7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdGlmKGsgaW4gdGhpcy5hcmdzKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHR0aGlzLmFyZ3Nba10gPSB2O1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0fSk7XG5cbiAgLy8gXHR0aGlzLm9uUmVtb3ZlKGRlYmluZEEpO1xuICAvLyBcdHRoaXMub25SZW1vdmUoZGViaW5kQik7XG5cbiAgLy8gXHRzdWJWaWV3Lm9uUmVtb3ZlKCgpPT57XG4gIC8vIFx0XHR0aGlzLl9vblJlbW92ZS5yZW1vdmUoZGViaW5kQSk7XG4gIC8vIFx0XHR0aGlzLl9vblJlbW92ZS5yZW1vdmUoZGViaW5kQik7XG4gIC8vIFx0fSk7XG4gIC8vIH1cblxuICBwb3N0UmVuZGVyKHBhcmVudE5vZGUpIHt9XG4gIGF0dGFjaGVkKHBhcmVudE5vZGUpIHt9XG4gIGludGVycG9sYXRhYmxlKHN0cikge1xuICAgIHJldHVybiAhIVN0cmluZyhzdHIpLm1hdGNoKHRoaXMuaW50ZXJwb2xhdGVSZWdleCk7XG4gIH1cbiAgc3RhdGljIHV1aWQoKSB7XG4gICAgcmV0dXJuIG5ldyBfVXVpZC5VdWlkKCk7XG4gIH1cbiAgcmVtb3ZlKG5vdyA9IGZhbHNlKSB7XG4gICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZW1vdmUnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgdmlldzogdGhpc1xuICAgICAgfSxcbiAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICB9KSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlbW92ZXIgPSAoKSA9PiB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMudGFncykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLnRhZ3NbaV0pKSB7XG4gICAgICAgICAgdGhpcy50YWdzW2ldICYmIHRoaXMudGFnc1tpXS5mb3JFYWNoKHQgPT4gdC5yZW1vdmUoKSk7XG4gICAgICAgICAgdGhpcy50YWdzW2ldLnNwbGljZSgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0gJiYgdGhpcy50YWdzW2ldLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMudGFnc1tpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2kzIGluIHRoaXMubm9kZXMpIHtcbiAgICAgICAgdGhpcy5ub2Rlc1tfaTNdICYmIHRoaXMubm9kZXNbX2kzXS5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY3ZEb21EZXRhY2hlZCcpKTtcbiAgICAgICAgdGhpcy5ub2Rlc1tfaTNdICYmIHRoaXMubm9kZXNbX2kzXS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5ub2Rlc1tfaTNdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgdGhpcy5ub2Rlcy5zcGxpY2UoMCk7XG4gICAgICB0aGlzLmZpcnN0Tm9kZSA9IHRoaXMubGFzdE5vZGUgPSB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICBpZiAobm93KSB7XG4gICAgICByZW1vdmVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShyZW1vdmVyKTtcbiAgICB9XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX29uUmVtb3ZlLml0ZW1zKCk7XG4gICAgZm9yICh2YXIgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgICAgdGhpcy5fb25SZW1vdmUucmVtb3ZlKGNhbGxiYWNrKTtcbiAgICB9XG4gICAgZm9yICh2YXIgY2xlYW51cCBvZiB0aGlzLmNsZWFudXApIHtcbiAgICAgIGNsZWFudXAgJiYgY2xlYW51cCgpO1xuICAgIH1cbiAgICB0aGlzLmNsZWFudXAubGVuZ3RoID0gMDtcbiAgICBmb3IgKHZhciBbdGFnLCB2aWV3TGlzdF0gb2YgdGhpcy52aWV3TGlzdHMpIHtcbiAgICAgIHZpZXdMaXN0LnJlbW92ZSgpO1xuICAgIH1cbiAgICB0aGlzLnZpZXdMaXN0cy5jbGVhcigpO1xuICAgIGZvciAodmFyIFtfY2FsbGJhY2s1LCB0aW1lb3V0XSBvZiB0aGlzLnRpbWVvdXRzKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dC50aW1lb3V0KTtcbiAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXQudGltZW91dCk7XG4gICAgfVxuICAgIGZvciAodmFyIGludGVydmFsIG9mIHRoaXMuaW50ZXJ2YWxzKSB7XG4gICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICB9XG4gICAgdGhpcy5pbnRlcnZhbHMubGVuZ3RoID0gMDtcbiAgICBmb3IgKHZhciBmcmFtZSBvZiB0aGlzLmZyYW1lcykge1xuICAgICAgZnJhbWUoKTtcbiAgICB9XG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLnByZVJ1bGVTZXQucHVyZ2UoKTtcbiAgICB0aGlzLnJ1bGVTZXQucHVyZ2UoKTtcbiAgICB0aGlzLnJlbW92ZWQgPSB0cnVlO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92ZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgdmlldzogdGhpc1xuICAgICAgfSxcbiAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICB9KSk7XG4gIH1cbiAgZmluZFRhZyhzZWxlY3Rvcikge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5ub2Rlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IHZvaWQgMDtcbiAgICAgIGlmICghdGhpcy5ub2Rlc1tpXS5xdWVyeVNlbGVjdG9yKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubm9kZXNbaV0ubWF0Y2hlcyhzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBfVGFnLlRhZyh0aGlzLm5vZGVzW2ldLCB0aGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcyk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0ID0gdGhpcy5ub2Rlc1tpXS5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IF9UYWcuVGFnKHJlc3VsdCwgdGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBmaW5kVGFncyhzZWxlY3Rvcikge1xuICAgIHZhciB0b3BMZXZlbCA9IHRoaXMubm9kZXMuZmlsdGVyKG4gPT4gbi5tYXRjaGVzICYmIG4ubWF0Y2hlcyhzZWxlY3RvcikpO1xuICAgIHZhciBzdWJMZXZlbCA9IHRoaXMubm9kZXMuZmlsdGVyKG4gPT4gbi5xdWVyeVNlbGVjdG9yQWxsKS5tYXAobiA9PiBbLi4ubi5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKV0pLmZsYXQoKS5tYXAobiA9PiBuZXcgX1RhZy5UYWcobiwgdGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMpKSB8fCBbXTtcbiAgICByZXR1cm4gdG9wTGV2ZWwuY29uY2F0KHN1YkxldmVsKTtcbiAgfVxuICBvblJlbW92ZShjYWxsYmFjaykge1xuICAgIGlmIChjYWxsYmFjayBpbnN0YW5jZW9mIEV2ZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX29uUmVtb3ZlLmFkZChjYWxsYmFjayk7XG4gIH1cbiAgdXBkYXRlKCkge31cbiAgYmVmb3JlVXBkYXRlKGFyZ3MpIHt9XG4gIGFmdGVyVXBkYXRlKGFyZ3MpIHt9XG4gIHN0cmluZ1RyYW5zZm9ybWVyKG1ldGhvZHMpIHtcbiAgICByZXR1cm4geCA9PiB7XG4gICAgICBmb3IgKHZhciBtIGluIG1ldGhvZHMpIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBtZXRob2QgPSBtZXRob2RzW21dO1xuICAgICAgICB3aGlsZSAocGFyZW50ICYmICFwYXJlbnRbbWV0aG9kXSkge1xuICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFwYXJlbnQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgeCA9IHBhcmVudFttZXRob2RzW21dXSh4KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB4O1xuICAgIH07XG4gIH1cbiAgc3RyaW5nVG9DbGFzcyhyZWZDbGFzc25hbWUpIHtcbiAgICBpZiAoVmlldy5yZWZDbGFzc2VzLmhhcyhyZWZDbGFzc25hbWUpKSB7XG4gICAgICByZXR1cm4gVmlldy5yZWZDbGFzc2VzLmdldChyZWZDbGFzc25hbWUpO1xuICAgIH1cbiAgICB2YXIgcmVmQ2xhc3NTcGxpdCA9IHJlZkNsYXNzbmFtZS5zcGxpdCgnLycpO1xuICAgIHZhciByZWZTaG9ydENsYXNzID0gcmVmQ2xhc3NTcGxpdFtyZWZDbGFzc1NwbGl0Lmxlbmd0aCAtIDFdO1xuICAgIHZhciByZWZDbGFzcyA9IHJlcXVpcmUocmVmQ2xhc3NuYW1lKTtcbiAgICBWaWV3LnJlZkNsYXNzZXMuc2V0KHJlZkNsYXNzbmFtZSwgcmVmQ2xhc3NbcmVmU2hvcnRDbGFzc10pO1xuICAgIHJldHVybiByZWZDbGFzc1tyZWZTaG9ydENsYXNzXTtcbiAgfVxuICBwcmV2ZW50UGFyc2luZyhub2RlKSB7XG4gICAgbm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgfVxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5ub2Rlcy5tYXAobiA9PiBuLm91dGVySFRNTCkuam9pbignICcpO1xuICB9XG4gIGxpc3Rlbihub2RlLCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBldmVudE5hbWU7XG4gICAgICBldmVudE5hbWUgPSBub2RlO1xuICAgICAgbm9kZSA9IHRoaXM7XG4gICAgfVxuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVmlldykge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdGVuKG5vZGUubm9kZXMsIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUubWFwKG4gPT4gdGhpcy5saXN0ZW4obiwgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucykpO1xuICAgICAgLy8gLmZvckVhY2gociA9PiByKCkpO1xuICAgIH1cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0ZW4obm9kZS5lbGVtZW50LCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIHZhciByZW1vdmUgPSAoKSA9PiBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgdmFyIHJlbW92ZXIgPSAoKSA9PiB7XG4gICAgICByZW1vdmUoKTtcbiAgICAgIHJlbW92ZSA9ICgpID0+IHt9O1xuICAgIH07XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiByZW1vdmVyKCkpO1xuICAgIHJldHVybiByZW1vdmVyO1xuICB9XG4gIGRldGFjaCgpIHtcbiAgICBmb3IgKHZhciBuIGluIHRoaXMubm9kZXMpIHtcbiAgICAgIHRoaXMubm9kZXNbbl0ucmVtb3ZlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICB9XG59XG5leHBvcnRzLlZpZXcgPSBWaWV3O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFZpZXcsICd0ZW1wbGF0ZXMnLCB7XG4gIHZhbHVlOiBuZXcgTWFwKClcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFZpZXcsICdyZWZDbGFzc2VzJywge1xuICB2YWx1ZTogbmV3IE1hcCgpXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1ZpZXdMaXN0LmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5WaWV3TGlzdCA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBfU2V0TWFwID0gcmVxdWlyZShcIi4vU2V0TWFwXCIpO1xudmFyIF9CYWcgPSByZXF1aXJlKFwiLi9CYWdcIik7XG5jbGFzcyBWaWV3TGlzdCB7XG4gIGNvbnN0cnVjdG9yKHRlbXBsYXRlLCBzdWJQcm9wZXJ0eSwgbGlzdCwgcGFyZW50LCBrZXlQcm9wZXJ0eSA9IG51bGwsIHZpZXdDbGFzcyA9IG51bGwpIHtcbiAgICB0aGlzLnJlbW92ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmFyZ3MgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgIHRoaXMuYXJncy52YWx1ZSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUobGlzdCB8fCBPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICB0aGlzLnN1YkFyZ3MgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICB0aGlzLmNsZWFudXAgPSBbXTtcbiAgICB0aGlzLnZpZXdDbGFzcyA9IHZpZXdDbGFzcztcbiAgICB0aGlzLl9vblJlbW92ZSA9IG5ldyBfQmFnLkJhZygpO1xuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICB0aGlzLnN1YlByb3BlcnR5ID0gc3ViUHJvcGVydHk7XG4gICAgdGhpcy5rZXlQcm9wZXJ0eSA9IGtleVByb3BlcnR5O1xuICAgIHRoaXMudGFnID0gbnVsbDtcbiAgICB0aGlzLmRvd25EZWJpbmQgPSBbXTtcbiAgICB0aGlzLnVwRGViaW5kID0gW107XG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLnZpZXdDb3VudCA9IDA7XG4gICAgdGhpcy5yZW5kZXJlZCA9IG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCkgPT4ge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZW5kZXJDb21wbGV0ZScsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIHZhbHVlOiBhY2NlcHRcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMud2lsbFJlUmVuZGVyID0gZmFsc2U7XG4gICAgdGhpcy5hcmdzLl9fX2JlZm9yZSgodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgaWYgKGUgPT0gJ2JpbmRUbycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXVzZWQgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMuYXJncy5fX19hZnRlcigodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgaWYgKGUgPT0gJ2JpbmRUbycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXVzZWQgPSBzLmxlbmd0aCA+IDE7XG4gICAgICB0aGlzLnJlUmVuZGVyKCk7XG4gICAgfSk7XG4gICAgdmFyIGRlYmluZCA9IHRoaXMuYXJncy52YWx1ZS5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgIGlmICh0aGlzLnBhdXNlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIga2sgPSBrO1xuICAgICAgaWYgKHR5cGVvZiBrID09PSAnc3ltYm9sJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoaXNOYU4oaykpIHtcbiAgICAgICAga2sgPSAnXycgKyBrO1xuICAgICAgfVxuICAgICAgaWYgKGQpIHtcbiAgICAgICAgaWYgKHRoaXMudmlld3Nba2tdKSB7XG4gICAgICAgICAgdGhpcy52aWV3c1tra10ucmVtb3ZlKHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSB0aGlzLnZpZXdzW2trXTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLnZpZXdzW2ldKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlzTmFOKGkpKSB7XG4gICAgICAgICAgICB0aGlzLnZpZXdzW2ldLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBpLnN1YnN0cigxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnZpZXdzW2ldLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLnZpZXdzW2trXSkge1xuICAgICAgICBpZiAoIXRoaXMudmlld0NvdW50KSB7XG4gICAgICAgICAgdGhpcy5yZVJlbmRlcigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0aGlzLndpbGxSZVJlbmRlciA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMud2lsbFJlUmVuZGVyID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy53aWxsUmVSZW5kZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgdGhpcy5yZVJlbmRlcigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudmlld3Nba2tdICYmIHRoaXMudmlld3Nba2tdLmFyZ3MpIHtcbiAgICAgICAgdGhpcy52aWV3c1tra10uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IGs7XG4gICAgICAgIHRoaXMudmlld3Nba2tdLmFyZ3NbdGhpcy5zdWJQcm9wZXJ0eV0gPSB2O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIHdhaXQ6IDBcbiAgICB9KTtcbiAgICB0aGlzLl9vblJlbW92ZS5hZGQoZGViaW5kKTtcbiAgICBPYmplY3QucHJldmVudEV4dGVuc2lvbnModGhpcyk7XG4gIH1cbiAgcmVuZGVyKHRhZykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyIHJlbmRlcnMgPSBbXTtcbiAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAodmlldykge1xuICAgICAgdmlldy52aWV3TGlzdCA9IF90aGlzO1xuICAgICAgdmlldy5yZW5kZXIodGFnLCBudWxsLCBfdGhpcy5wYXJlbnQpO1xuICAgICAgcmVuZGVycy5wdXNoKHZpZXcucmVuZGVyZWQudGhlbigoKSA9PiB2aWV3KSk7XG4gICAgfTtcbiAgICBmb3IgKHZhciB2aWV3IG9mIHRoaXMudmlld3MpIHtcbiAgICAgIF9sb29wKHZpZXcpO1xuICAgIH1cbiAgICB0aGlzLnRhZyA9IHRhZztcbiAgICBQcm9taXNlLmFsbChyZW5kZXJzKS50aGVuKHZpZXdzID0+IHRoaXMucmVuZGVyQ29tcGxldGUodmlld3MpKTtcbiAgICB0aGlzLnBhcmVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdFJlbmRlcmVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGtleTogdGhpcy5zdWJQcm9wZXJ0eSxcbiAgICAgICAgICB2YWx1ZTogdGhpcy5hcmdzLnZhbHVlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbiAgcmVSZW5kZXIoKSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG4gICAgaWYgKHRoaXMucGF1c2VkIHx8ICF0aGlzLnRhZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdmlld3MgPSBbXTtcbiAgICB2YXIgZXhpc3RpbmdWaWV3cyA9IG5ldyBfU2V0TWFwLlNldE1hcCgpO1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgdmFyIHZpZXcgPSB0aGlzLnZpZXdzW2ldO1xuICAgICAgaWYgKHZpZXcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2aWV3c1tpXSA9IHZpZXc7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIHJhd1ZhbHVlID0gdmlldy5hcmdzW3RoaXMuc3ViUHJvcGVydHldO1xuICAgICAgZXhpc3RpbmdWaWV3cy5hZGQocmF3VmFsdWUsIHZpZXcpO1xuICAgICAgdmlld3NbaV0gPSB2aWV3O1xuICAgIH1cbiAgICB2YXIgZmluYWxWaWV3cyA9IFtdO1xuICAgIHZhciBmaW5hbFZpZXdTZXQgPSBuZXcgU2V0KCk7XG4gICAgdGhpcy5kb3duRGViaW5kLmxlbmd0aCAmJiB0aGlzLmRvd25EZWJpbmQuZm9yRWFjaChkID0+IGQgJiYgZCgpKTtcbiAgICB0aGlzLnVwRGViaW5kLmxlbmd0aCAmJiB0aGlzLnVwRGViaW5kLmZvckVhY2goZCA9PiBkICYmIGQoKSk7XG4gICAgdGhpcy51cERlYmluZC5sZW5ndGggPSAwO1xuICAgIHRoaXMuZG93bkRlYmluZC5sZW5ndGggPSAwO1xuICAgIHZhciBtaW5LZXkgPSBJbmZpbml0eTtcbiAgICB2YXIgYW50ZU1pbktleSA9IEluZmluaXR5O1xuICAgIHZhciBfbG9vcDIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICAgIHZhciBrID0gX2k7XG4gICAgICBpZiAoaXNOYU4oaykpIHtcbiAgICAgICAgayA9ICdfJyArIF9pO1xuICAgICAgfSBlbHNlIGlmIChTdHJpbmcoaykubGVuZ3RoKSB7XG4gICAgICAgIGsgPSBOdW1iZXIoayk7XG4gICAgICB9XG4gICAgICBpZiAoX3RoaXMyLmFyZ3MudmFsdWVbX2ldICE9PSB1bmRlZmluZWQgJiYgZXhpc3RpbmdWaWV3cy5oYXMoX3RoaXMyLmFyZ3MudmFsdWVbX2ldKSkge1xuICAgICAgICB2YXIgZXhpc3RpbmdWaWV3ID0gZXhpc3RpbmdWaWV3cy5nZXRPbmUoX3RoaXMyLmFyZ3MudmFsdWVbX2ldKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nVmlldykge1xuICAgICAgICAgIGV4aXN0aW5nVmlldy5hcmdzW190aGlzMi5rZXlQcm9wZXJ0eV0gPSBfaTtcbiAgICAgICAgICBmaW5hbFZpZXdzW2tdID0gZXhpc3RpbmdWaWV3O1xuICAgICAgICAgIGZpbmFsVmlld1NldC5hZGQoZXhpc3RpbmdWaWV3KTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgaWYgKCFpc05hTihrKSkge1xuICAgICAgICAgICAgbWluS2V5ID0gTWF0aC5taW4obWluS2V5LCBrKTtcbiAgICAgICAgICAgIGsgPiAwICYmIChhbnRlTWluS2V5ID0gTWF0aC5taW4oYW50ZU1pbktleSwgaykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBleGlzdGluZ1ZpZXdzLnJlbW92ZShfdGhpczIuYXJncy52YWx1ZVtfaV0sIGV4aXN0aW5nVmlldyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgdmFyIHZpZXdBcmdzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgdmFyIF92aWV3ID0gZmluYWxWaWV3c1trXSA9IG5ldyBfdGhpczIudmlld0NsYXNzKHZpZXdBcmdzLCBfdGhpczIucGFyZW50KTtcbiAgICAgICAgaWYgKCFpc05hTihrKSkge1xuICAgICAgICAgIG1pbktleSA9IE1hdGgubWluKG1pbktleSwgayk7XG4gICAgICAgICAgayA+IDAgJiYgKGFudGVNaW5LZXkgPSBNYXRoLm1pbihhbnRlTWluS2V5LCBrKSk7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxWaWV3c1trXS50ZW1wbGF0ZSA9IF90aGlzMi50ZW1wbGF0ZTtcbiAgICAgICAgZmluYWxWaWV3c1trXS52aWV3TGlzdCA9IF90aGlzMjtcbiAgICAgICAgZmluYWxWaWV3c1trXS5hcmdzW190aGlzMi5rZXlQcm9wZXJ0eV0gPSBfaTtcbiAgICAgICAgZmluYWxWaWV3c1trXS5hcmdzW190aGlzMi5zdWJQcm9wZXJ0eV0gPSBfdGhpczIuYXJncy52YWx1ZVtfaV07XG4gICAgICAgIF90aGlzMi51cERlYmluZFtrXSA9IHZpZXdBcmdzLmJpbmRUbyhfdGhpczIuc3ViUHJvcGVydHksICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgdmFyIGluZGV4ID0gdmlld0FyZ3NbX3RoaXMyLmtleVByb3BlcnR5XTtcbiAgICAgICAgICBpZiAoZCkge1xuICAgICAgICAgICAgZGVsZXRlIF90aGlzMi5hcmdzLnZhbHVlW2luZGV4XTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgX3RoaXMyLmFyZ3MudmFsdWVbaW5kZXhdID0gdjtcbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzMi5kb3duRGViaW5kW2tdID0gX3RoaXMyLnN1YkFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2aWV3QXJnc1trXTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmlld0FyZ3Nba10gPSB2O1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHVwRGViaW5kID0gKCkgPT4ge1xuICAgICAgICAgIF90aGlzMi51cERlYmluZC5maWx0ZXIoeCA9PiB4KS5mb3JFYWNoKGQgPT4gZCgpKTtcbiAgICAgICAgICBfdGhpczIudXBEZWJpbmQubGVuZ3RoID0gMDtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGRvd25EZWJpbmQgPSAoKSA9PiB7XG4gICAgICAgICAgX3RoaXMyLmRvd25EZWJpbmQuZmlsdGVyKHggPT4geCkuZm9yRWFjaChkID0+IGQoKSk7XG4gICAgICAgICAgX3RoaXMyLmRvd25EZWJpbmQubGVuZ3RoID0gMDtcbiAgICAgICAgfTtcbiAgICAgICAgX3ZpZXcub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIF90aGlzMi5fb25SZW1vdmUucmVtb3ZlKHVwRGViaW5kKTtcbiAgICAgICAgICBfdGhpczIuX29uUmVtb3ZlLnJlbW92ZShkb3duRGViaW5kKTtcbiAgICAgICAgICBfdGhpczIudXBEZWJpbmRba10gJiYgX3RoaXMyLnVwRGViaW5kW2tdKCk7XG4gICAgICAgICAgX3RoaXMyLmRvd25EZWJpbmRba10gJiYgX3RoaXMyLmRvd25EZWJpbmRba10oKTtcbiAgICAgICAgICBkZWxldGUgX3RoaXMyLnVwRGViaW5kW2tdO1xuICAgICAgICAgIGRlbGV0ZSBfdGhpczIuZG93bkRlYmluZFtrXTtcbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzMi5fb25SZW1vdmUuYWRkKHVwRGViaW5kKTtcbiAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5hZGQoZG93bkRlYmluZCk7XG4gICAgICAgIHZpZXdBcmdzW190aGlzMi5zdWJQcm9wZXJ0eV0gPSBfdGhpczIuYXJncy52YWx1ZVtfaV07XG4gICAgICB9XG4gICAgfTtcbiAgICBmb3IgKHZhciBfaSBpbiB0aGlzLmFyZ3MudmFsdWUpIHtcbiAgICAgIF9sb29wMigpO1xuICAgIH1cbiAgICBmb3IgKHZhciBfaTIgaW4gdmlld3MpIHtcbiAgICAgIGlmICh2aWV3c1tfaTJdICYmICFmaW5hbFZpZXdTZXQuaGFzKHZpZXdzW19pMl0pKSB7XG4gICAgICAgIHZpZXdzW19pMl0ucmVtb3ZlKHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmFyZ3MudmFsdWUpKSB7XG4gICAgICB2YXIgbG9jYWxNaW4gPSBtaW5LZXkgPT09IDAgJiYgZmluYWxWaWV3c1sxXSAhPT0gdW5kZWZpbmVkICYmIGZpbmFsVmlld3MubGVuZ3RoID4gMSB8fCBhbnRlTWluS2V5ID09PSBJbmZpbml0eSA/IG1pbktleSA6IGFudGVNaW5LZXk7XG4gICAgICB2YXIgcmVuZGVyUmVjdXJzZSA9IChpID0gMCkgPT4ge1xuICAgICAgICB2YXIgaWkgPSBmaW5hbFZpZXdzLmxlbmd0aCAtIGkgLSAxO1xuICAgICAgICB3aGlsZSAoaWkgPiBsb2NhbE1pbiAmJiBmaW5hbFZpZXdzW2lpXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWktLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWkgPCBsb2NhbE1pbikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmluYWxWaWV3c1tpaV0gPT09IHRoaXMudmlld3NbaWldKSB7XG4gICAgICAgICAgaWYgKGZpbmFsVmlld3NbaWldICYmICFmaW5hbFZpZXdzW2lpXS5maXJzdE5vZGUpIHtcbiAgICAgICAgICAgIGZpbmFsVmlld3NbaWldLnJlbmRlcih0aGlzLnRhZywgZmluYWxWaWV3c1tpaSArIDFdLCB0aGlzLnBhcmVudCk7XG4gICAgICAgICAgICByZXR1cm4gZmluYWxWaWV3c1tpaV0ucmVuZGVyZWQudGhlbigoKSA9PiByZW5kZXJSZWN1cnNlKE51bWJlcihpKSArIDEpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHNwbGl0ID0gNTAwO1xuICAgICAgICAgICAgaWYgKGkgPT09IDAgfHwgaSAlIHNwbGl0KSB7XG4gICAgICAgICAgICAgIHJldHVybiByZW5kZXJSZWN1cnNlKE51bWJlcihpKSArIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFjY2VwdCA9PiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gYWNjZXB0KHJlbmRlclJlY3Vyc2UoTnVtYmVyKGkpICsgMSkpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZpbmFsVmlld3NbaWldLnJlbmRlcih0aGlzLnRhZywgZmluYWxWaWV3c1tpaSArIDFdLCB0aGlzLnBhcmVudCk7XG4gICAgICAgIHRoaXMudmlld3Muc3BsaWNlKGlpLCAwLCBmaW5hbFZpZXdzW2lpXSk7XG4gICAgICAgIHJldHVybiBmaW5hbFZpZXdzW2lpXS5yZW5kZXJlZC50aGVuKCgpID0+IHJlbmRlclJlY3Vyc2UoaSArIDEpKTtcbiAgICAgIH07XG4gICAgICB0aGlzLnJlbmRlcmVkID0gcmVuZGVyUmVjdXJzZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVuZGVycyA9IFtdO1xuICAgICAgdmFyIGxlZnRvdmVycyA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmNyZWF0ZShudWxsKSwgZmluYWxWaWV3cyk7XG4gICAgICB2YXIgaXNJbnQgPSB4ID0+IHBhcnNlSW50KHgpID09PSB4IC0gMDtcbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZmluYWxWaWV3cykuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICBpZiAoaXNJbnQoYSkgJiYgaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gTWF0aC5zaWduKGEgLSBiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzSW50KGEpICYmICFpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNJbnQoYSkgJiYgaXNJbnQoYikpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzSW50KGEpICYmICFpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZhciBfbG9vcDMgPSBmdW5jdGlvbiAoX2kzKSB7XG4gICAgICAgIGRlbGV0ZSBsZWZ0b3ZlcnNbX2kzXTtcbiAgICAgICAgaWYgKGZpbmFsVmlld3NbX2kzXS5maXJzdE5vZGUgJiYgZmluYWxWaWV3c1tfaTNdID09PSBfdGhpczIudmlld3NbX2kzXSkge1xuICAgICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGZpbmFsVmlld3NbX2kzXS5yZW5kZXIoX3RoaXMyLnRhZywgbnVsbCwgX3RoaXMyLnBhcmVudCk7XG4gICAgICAgIHJlbmRlcnMucHVzaChmaW5hbFZpZXdzW19pM10ucmVuZGVyZWQudGhlbigoKSA9PiBmaW5hbFZpZXdzW19pM10pKTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBfaTMgb2Yga2V5cykge1xuICAgICAgICBpZiAoX2xvb3AzKF9pMykpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2k0IGluIGxlZnRvdmVycykge1xuICAgICAgICBkZWxldGUgdGhpcy5hcmdzLnZpZXdzW19pNF07XG4gICAgICAgIGxlZnRvdmVycy5yZW1vdmUodHJ1ZSk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlbmRlcmVkID0gUHJvbWlzZS5hbGwocmVuZGVycyk7XG4gICAgfVxuICAgIGZvciAodmFyIF9pNSBpbiBmaW5hbFZpZXdzKSB7XG4gICAgICBpZiAoaXNOYU4oX2k1KSkge1xuICAgICAgICBmaW5hbFZpZXdzW19pNV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IF9pNS5zdWJzdHIoMSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZmluYWxWaWV3c1tfaTVdLmFyZ3NbdGhpcy5rZXlQcm9wZXJ0eV0gPSBfaTU7XG4gICAgfVxuICAgIHRoaXMudmlld3MgPSBBcnJheS5pc0FycmF5KHRoaXMuYXJncy52YWx1ZSkgPyBbLi4uZmluYWxWaWV3c10gOiBmaW5hbFZpZXdzO1xuICAgIHRoaXMudmlld0NvdW50ID0gZmluYWxWaWV3cy5sZW5ndGg7XG4gICAgZmluYWxWaWV3U2V0LmNsZWFyKCk7XG4gICAgdGhpcy53aWxsUmVSZW5kZXIgPSBmYWxzZTtcbiAgICB0aGlzLnJlbmRlcmVkLnRoZW4oKCkgPT4ge1xuICAgICAgdGhpcy5wYXJlbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RSZW5kZXJlZCcsIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICBrZXk6IHRoaXMuc3ViUHJvcGVydHksXG4gICAgICAgICAgICB2YWx1ZTogdGhpcy5hcmdzLnZhbHVlLFxuICAgICAgICAgICAgdGFnOiB0aGlzLnRhZ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgICAgdGhpcy50YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2xpc3RSZW5kZXJlZCcsIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICBrZXk6IHRoaXMuc3ViUHJvcGVydHksXG4gICAgICAgICAgICB2YWx1ZTogdGhpcy5hcmdzLnZhbHVlLFxuICAgICAgICAgICAgdGFnOiB0aGlzLnRhZ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlbmRlcmVkO1xuICB9XG4gIHBhdXNlKHBhdXNlID0gdHJ1ZSkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy52aWV3cykge1xuICAgICAgdGhpcy52aWV3c1tpXS5wYXVzZShwYXVzZSk7XG4gICAgfVxuICB9XG4gIG9uUmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fb25SZW1vdmUuYWRkKGNhbGxiYWNrKTtcbiAgfVxuICByZW1vdmUoKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICB0aGlzLnZpZXdzW2ldICYmIHRoaXMudmlld3NbaV0ucmVtb3ZlKHRydWUpO1xuICAgIH1cbiAgICB2YXIgb25SZW1vdmUgPSB0aGlzLl9vblJlbW92ZS5pdGVtcygpO1xuICAgIGZvciAodmFyIF9pNiBpbiBvblJlbW92ZSkge1xuICAgICAgdGhpcy5fb25SZW1vdmUucmVtb3ZlKG9uUmVtb3ZlW19pNl0pO1xuICAgICAgb25SZW1vdmVbX2k2XSgpO1xuICAgIH1cbiAgICB2YXIgY2xlYW51cDtcbiAgICB3aGlsZSAodGhpcy5jbGVhbnVwLmxlbmd0aCkge1xuICAgICAgY2xlYW51cCA9IHRoaXMuY2xlYW51cC5wb3AoKTtcbiAgICAgIGNsZWFudXAoKTtcbiAgICB9XG4gICAgdGhpcy52aWV3cyA9IFtdO1xuICAgIHdoaWxlICh0aGlzLnRhZyAmJiB0aGlzLnRhZy5maXJzdENoaWxkKSB7XG4gICAgICB0aGlzLnRhZy5yZW1vdmVDaGlsZCh0aGlzLnRhZy5maXJzdENoaWxkKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3ViQXJncykge1xuICAgICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcy5zdWJBcmdzKTtcbiAgICB9XG4gICAgX0JpbmRhYmxlLkJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcy5hcmdzKTtcblxuICAgIC8vIGlmKHRoaXMuYXJncy52YWx1ZSAmJiAhdGhpcy5hcmdzLnZhbHVlLmlzQm91bmQoKSlcbiAgICAvLyB7XG4gICAgLy8gXHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMuYXJncy52YWx1ZSk7XG4gICAgLy8gfVxuXG4gICAgdGhpcy5yZW1vdmVkID0gdHJ1ZTtcbiAgfVxufVxuZXhwb3J0cy5WaWV3TGlzdCA9IFZpZXdMaXN0O1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5LZXlib2FyZCA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi4vYmFzZS9CaW5kYWJsZVwiKTtcbmNsYXNzIEtleWJvYXJkIHtcbiAgc3RhdGljIGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy5pbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2UgfHwgX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UobmV3IHRoaXMoKSk7XG4gIH1cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5tYXhEZWNheSA9IDEyMDtcbiAgICB0aGlzLmNvbWJvVGltZSA9IDUwMDtcbiAgICB0aGlzLmxpc3RlbmluZyA9IGZhbHNlO1xuICAgIHRoaXMuZm9jdXNFbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcbiAgICB0aGlzW19CaW5kYWJsZS5CaW5kYWJsZS5Ob0dldHRlcnNdID0gdHJ1ZTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2NvbWJvJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKFtdKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2hpY2hzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY29kZXMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdrZXlzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlc3NlZFdoaWNoJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlc3NlZENvZGUnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVzc2VkS2V5Jywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVsZWFzZWRXaGljaCcsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbGVhc2VkQ29kZScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbGVhc2VkS2V5Jywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAna2V5UmVmcycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGV2ZW50ID0+IHtcbiAgICAgIGlmICghdGhpcy5saXN0ZW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCEodGhpcy5rZXlzW2V2ZW50LmtleV0gPiAwKSAmJiB0aGlzLmZvY3VzRWxlbWVudCAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ICE9PSB0aGlzLmZvY3VzRWxlbWVudCAmJiAoIXRoaXMuZm9jdXNFbGVtZW50LmNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHx8IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQubWF0Y2hlcygnaW5wdXQsdGV4dGFyZWEnKSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMucmVsZWFzZWRXaGljaFtldmVudC53aGljaF0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5yZWxlYXNlZENvZGVbZXZlbnQuY29kZV0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5yZWxlYXNlZEtleVtldmVudC5rZXldID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMud2hpY2hzW2V2ZW50LndoaWNoXSA9IC0xO1xuICAgICAgdGhpcy5jb2Rlc1tldmVudC5jb2RlXSA9IC0xO1xuICAgICAgdGhpcy5rZXlzW2V2ZW50LmtleV0gPSAtMTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZXZlbnQgPT4ge1xuICAgICAgaWYgKCF0aGlzLmxpc3RlbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5mb2N1c0VsZW1lbnQgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAhPT0gdGhpcy5mb2N1c0VsZW1lbnQgJiYgKCF0aGlzLmZvY3VzRWxlbWVudC5jb250YWlucyhkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB8fCBkb2N1bWVudC5hY3RpdmVFbGVtZW50Lm1hdGNoZXMoJ2lucHV0LHRleHRhcmVhJykpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAoZXZlbnQucmVwZWF0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuY29tYm8ucHVzaChldmVudC5jb2RlKTtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNvbWJvVGltZXIpO1xuICAgICAgdGhpcy5jb21ib1RpbWVyID0gc2V0VGltZW91dCgoKSA9PiB0aGlzLmNvbWJvLnNwbGljZSgwKSwgdGhpcy5jb21ib1RpbWUpO1xuICAgICAgdGhpcy5wcmVzc2VkV2hpY2hbZXZlbnQud2hpY2hdID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMucHJlc3NlZENvZGVbZXZlbnQuY29kZV0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5wcmVzc2VkS2V5W2V2ZW50LmtleV0gPSBEYXRlLm5vdygpO1xuICAgICAgaWYgKHRoaXMua2V5c1tldmVudC5rZXldID4gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLndoaWNoc1tldmVudC53aGljaF0gPSAxO1xuICAgICAgdGhpcy5jb2Rlc1tldmVudC5jb2RlXSA9IDE7XG4gICAgICB0aGlzLmtleXNbZXZlbnQua2V5XSA9IDE7XG4gICAgfSk7XG4gICAgdmFyIHdpbmRvd0JsdXIgPSBldmVudCA9PiB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMua2V5cykge1xuICAgICAgICBpZiAodGhpcy5rZXlzW2ldIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVsZWFzZWRLZXlbaV0gPSBEYXRlLm5vdygpO1xuICAgICAgICB0aGlzLmtleXNbaV0gPSAtMTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pIGluIHRoaXMuY29kZXMpIHtcbiAgICAgICAgaWYgKHRoaXMuY29kZXNbX2ldIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVsZWFzZWRDb2RlW19pXSA9IERhdGUubm93KCk7XG4gICAgICAgIHRoaXMuY29kZXNbX2ldID0gLTE7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaTIgaW4gdGhpcy53aGljaHMpIHtcbiAgICAgICAgaWYgKHRoaXMud2hpY2hzW19pMl0gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWxlYXNlZFdoaWNoW19pMl0gPSBEYXRlLm5vdygpO1xuICAgICAgICB0aGlzLndoaWNoc1tfaTJdID0gLTE7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIHdpbmRvd0JsdXIpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgKCkgPT4ge1xuICAgICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gJ3Zpc2libGUnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHdpbmRvd0JsdXIoKTtcbiAgICB9KTtcbiAgfVxuICBnZXRLZXlSZWYoa2V5Q29kZSkge1xuICAgIHZhciBrZXlSZWYgPSB0aGlzLmtleVJlZnNba2V5Q29kZV0gPSB0aGlzLmtleVJlZnNba2V5Q29kZV0gfHwgX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pO1xuICAgIHJldHVybiBrZXlSZWY7XG4gIH1cbiAgZ2V0S2V5VGltZShrZXkpIHtcbiAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkS2V5W2tleV07XG4gICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRLZXlba2V5XTtcbiAgICBpZiAoIXByZXNzZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBwcmVzc2VkO1xuICAgIH1cbiAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgfVxuICBnZXRDb2RlVGltZShjb2RlKSB7XG4gICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZENvZGVbY29kZV07XG4gICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRDb2RlW2NvZGVdO1xuICAgIGlmICghcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHByZXNzZWQ7XG4gICAgfVxuICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICB9XG4gIGdldFdoaWNoVGltZShjb2RlKSB7XG4gICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZFdoaWNoW2NvZGVdO1xuICAgIHZhciBwcmVzc2VkID0gdGhpcy5wcmVzc2VkV2hpY2hbY29kZV07XG4gICAgaWYgKCFwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gcHJlc3NlZDtcbiAgICB9XG4gICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gIH1cbiAgZ2V0S2V5KGtleSkge1xuICAgIGlmICghdGhpcy5rZXlzW2tleV0pIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5rZXlzW2tleV07XG4gIH1cbiAgZ2V0S2V5Q29kZShjb2RlKSB7XG4gICAgaWYgKCF0aGlzLmNvZGVzW2NvZGVdKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29kZXNbY29kZV07XG4gIH1cbiAgcmVzZXQoKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmtleXMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmtleXNbaV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5jb2Rlcykge1xuICAgICAgZGVsZXRlIHRoaXMuY29kZXNbaV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy53aGljaHMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLndoaWNoc1tpXTtcbiAgICB9XG4gIH1cbiAgdXBkYXRlKCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5rZXlzKSB7XG4gICAgICBpZiAodGhpcy5rZXlzW2ldID4gMCkge1xuICAgICAgICB0aGlzLmtleXNbaV0rKztcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5rZXlzW2ldID4gLXRoaXMubWF4RGVjYXkpIHtcbiAgICAgICAgdGhpcy5rZXlzW2ldLS07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy5rZXlzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMuY29kZXMpIHtcbiAgICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRDb2RlW2ldO1xuICAgICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRDb2RlW2ldO1xuICAgICAgdmFyIGtleVJlZiA9IHRoaXMuZ2V0S2V5UmVmKGkpO1xuICAgICAgaWYgKHRoaXMuY29kZXNbaV0gPiAwKSB7XG4gICAgICAgIGtleVJlZi5mcmFtZXMgPSB0aGlzLmNvZGVzW2ldKys7XG4gICAgICAgIGtleVJlZi50aW1lID0gcHJlc3NlZCA/IERhdGUubm93KCkgLSBwcmVzc2VkIDogMDtcbiAgICAgICAga2V5UmVmLmRvd24gPSB0cnVlO1xuICAgICAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5jb2Rlc1tpXSA+IC10aGlzLm1heERlY2F5KSB7XG4gICAgICAgIGtleVJlZi5mcmFtZXMgPSB0aGlzLmNvZGVzW2ldLS07XG4gICAgICAgIGtleVJlZi50aW1lID0gcmVsZWFzZWQgLSBEYXRlLm5vdygpO1xuICAgICAgICBrZXlSZWYuZG93biA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAga2V5UmVmLmZyYW1lcyA9IDA7XG4gICAgICAgIGtleVJlZi50aW1lID0gMDtcbiAgICAgICAga2V5UmVmLmRvd24gPSBmYWxzZTtcbiAgICAgICAgZGVsZXRlIHRoaXMuY29kZXNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy53aGljaHMpIHtcbiAgICAgIGlmICh0aGlzLndoaWNoc1tpXSA+IDApIHtcbiAgICAgICAgdGhpcy53aGljaHNbaV0rKztcbiAgICAgIH0gZWxzZSBpZiAodGhpcy53aGljaHNbaV0gPiAtdGhpcy5tYXhEZWNheSkge1xuICAgICAgICB0aGlzLndoaWNoc1tpXS0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMud2hpY2hzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuZXhwb3J0cy5LZXlib2FyZCA9IEtleWJvYXJkO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL21peGluL0V2ZW50VGFyZ2V0TWl4aW4uanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkV2ZW50VGFyZ2V0TWl4aW4gPSB2b2lkIDA7XG52YXIgX01peGluID0gcmVxdWlyZShcIi4uL2Jhc2UvTWl4aW5cIik7XG52YXIgRXZlbnRUYXJnZXRQYXJlbnQgPSBTeW1ib2woJ0V2ZW50VGFyZ2V0UGFyZW50Jyk7XG52YXIgQ2FsbEhhbmRsZXIgPSBTeW1ib2woJ0NhbGxIYW5kbGVyJyk7XG52YXIgQ2FwdHVyZSA9IFN5bWJvbCgnQ2FwdHVyZScpO1xudmFyIEJ1YmJsZSA9IFN5bWJvbCgnQnViYmxlJyk7XG52YXIgVGFyZ2V0ID0gU3ltYm9sKCdUYXJnZXQnKTtcbnZhciBIYW5kbGVyc0J1YmJsZSA9IFN5bWJvbCgnSGFuZGxlcnNCdWJibGUnKTtcbnZhciBIYW5kbGVyc0NhcHR1cmUgPSBTeW1ib2woJ0hhbmRsZXJzQ2FwdHVyZScpO1xudmFyIEV2ZW50VGFyZ2V0TWl4aW4gPSBleHBvcnRzLkV2ZW50VGFyZ2V0TWl4aW4gPSB7XG4gIFtfTWl4aW4uTWl4aW4uQ29uc3RydWN0b3JdKCkge1xuICAgIHRoaXNbSGFuZGxlcnNDYXB0dXJlXSA9IG5ldyBNYXAoKTtcbiAgICB0aGlzW0hhbmRsZXJzQnViYmxlXSA9IG5ldyBNYXAoKTtcbiAgfSxcbiAgZGlzcGF0Y2hFdmVudCguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBpZiAodHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoZXZlbnQpO1xuICAgICAgYXJnc1swXSA9IGV2ZW50O1xuICAgIH1cbiAgICBldmVudC5jdlBhdGggPSBldmVudC5jdlBhdGggfHwgW107XG4gICAgZXZlbnQuY3ZUYXJnZXQgPSBldmVudC5jdkN1cnJlbnRUYXJnZXQgPSB0aGlzO1xuICAgIHZhciByZXN1bHQgPSB0aGlzW0NhcHR1cmVdKC4uLmFyZ3MpO1xuICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgIGlmICh0aGlzW0hhbmRsZXJzQ2FwdHVyZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICB2YXIgaGFuZGxlck1hcCA9IHRoaXNbSGFuZGxlcnNDYXB0dXJlXS5nZXQoZXZlbnQudHlwZSk7XG4gICAgICB2YXIgbmV3SGFuZGxlcnMgPSBbLi4uaGFuZGxlck1hcF07XG4gICAgICBuZXdIYW5kbGVycy5mb3JFYWNoKGggPT4gaC5wdXNoKGhhbmRsZXJNYXApKTtcbiAgICAgIGhhbmRsZXJzLnB1c2goLi4ubmV3SGFuZGxlcnMpO1xuICAgIH1cbiAgICBpZiAodGhpc1tIYW5kbGVyc0J1YmJsZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICB2YXIgX2hhbmRsZXJNYXAgPSB0aGlzW0hhbmRsZXJzQnViYmxlXS5nZXQoZXZlbnQudHlwZSk7XG4gICAgICB2YXIgX25ld0hhbmRsZXJzID0gWy4uLl9oYW5kbGVyTWFwXTtcbiAgICAgIF9uZXdIYW5kbGVycy5mb3JFYWNoKGggPT4gaC5wdXNoKF9oYW5kbGVyTWFwKSk7XG4gICAgICBoYW5kbGVycy5wdXNoKC4uLl9uZXdIYW5kbGVycyk7XG4gICAgfVxuICAgIGhhbmRsZXJzLnB1c2goWygpID0+IHRoaXNbQ2FsbEhhbmRsZXJdKC4uLmFyZ3MpLCB7fSwgbnVsbF0pO1xuICAgIGZvciAodmFyIFtoYW5kbGVyLCBvcHRpb25zLCBtYXBdIG9mIGhhbmRsZXJzKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgIG1hcC5kZWxldGUoaGFuZGxlcik7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghZXZlbnQuY2FuY2VsYWJsZSB8fCAhZXZlbnQuY2FuY2VsQnViYmxlICYmIHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgIHRoaXNbQnViYmxlXSguLi5hcmdzKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XSkge1xuICAgICAgT2JqZWN0LmZyZWV6ZShldmVudC5jdlBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gZXZlbnQucmV0dXJuVmFsdWU7XG4gIH0sXG4gIGFkZEV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICB1c2VDYXB0dXJlOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgaGFuZGxlcnMgPSBIYW5kbGVyc0J1YmJsZTtcbiAgICBpZiAob3B0aW9ucy51c2VDYXB0dXJlKSB7XG4gICAgICBoYW5kbGVycyA9IEhhbmRsZXJzQ2FwdHVyZTtcbiAgICB9XG4gICAgaWYgKCF0aGlzW2hhbmRsZXJzXS5oYXModHlwZSkpIHtcbiAgICAgIHRoaXNbaGFuZGxlcnNdLnNldCh0eXBlLCBuZXcgTWFwKCkpO1xuICAgIH1cbiAgICB0aGlzW2hhbmRsZXJzXS5nZXQodHlwZSkuc2V0KGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucy5zaWduYWwpIHtcbiAgICAgIG9wdGlvbnMuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0JywgZXZlbnQgPT4gdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zKSwge1xuICAgICAgICBvbmNlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gIHJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICB1c2VDYXB0dXJlOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgaGFuZGxlcnMgPSBIYW5kbGVyc0J1YmJsZTtcbiAgICBpZiAob3B0aW9ucy51c2VDYXB0dXJlKSB7XG4gICAgICBoYW5kbGVycyA9IEhhbmRsZXJzQ2FwdHVyZTtcbiAgICB9XG4gICAgaWYgKCF0aGlzW2hhbmRsZXJzXS5oYXModHlwZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpc1toYW5kbGVyc10uZ2V0KHR5cGUpLmRlbGV0ZShjYWxsYmFjayk7XG4gIH0sXG4gIFtDYXB0dXJlXSguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBldmVudC5jdlBhdGgucHVzaCh0aGlzKTtcbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtDYXB0dXJlXSguLi5hcmdzKTtcbiAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNDYXB0dXJlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZXZlbnQuY3ZDdXJyZW50VGFyZ2V0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF07XG4gICAgdmFyIHtcbiAgICAgIHR5cGVcbiAgICB9ID0gZXZlbnQ7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bSGFuZGxlcnNDYXB0dXJlXS5nZXQodHlwZSk7XG4gICAgZm9yICh2YXIgW2hhbmRsZXIsIG9wdGlvbnNdIG9mIGhhbmRsZXJzKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgIGhhbmRsZXJzLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgW0J1YmJsZV0oLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgaWYgKCFldmVudC5idWJibGVzIHx8ICF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XSB8fCBldmVudC5jYW5jZWxCdWJibGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0J1YmJsZV0uaGFzKGV2ZW50LnR5cGUpKSB7XG4gICAgICByZXR1cm4gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQnViYmxlXSguLi5hcmdzKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdDtcbiAgICBldmVudC5jdkN1cnJlbnRUYXJnZXQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XTtcbiAgICB2YXIge1xuICAgICAgdHlwZVxuICAgIH0gPSBldmVudDtcbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0J1YmJsZV0uZ2V0KGV2ZW50LnR5cGUpO1xuICAgIGZvciAodmFyIFtoYW5kbGVyLCBvcHRpb25zXSBvZiBoYW5kbGVycykge1xuICAgICAgaWYgKG9wdGlvbnMub25jZSkge1xuICAgICAgICBoYW5kbGVycy5kZWxldGUoaGFuZGxlcik7XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIHJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmVzdWx0ID0gdGhpc1tFdmVudFRhcmdldFBhcmVudF1bQ2FsbEhhbmRsZXJdKC4uLmFyZ3MpO1xuICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtCdWJibGVdKC4uLmFyZ3MpO1xuICB9LFxuICBbQ2FsbEhhbmRsZXJdKC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkZWZhdWx0SGFuZGxlciA9IGBvbiR7ZXZlbnQudHlwZVswXS50b1VwcGVyQ2FzZSgpICsgZXZlbnQudHlwZS5zbGljZSgxKX1gO1xuICAgIGlmICh0eXBlb2YgdGhpc1tkZWZhdWx0SGFuZGxlcl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzW2RlZmF1bHRIYW5kbGVyXShldmVudCk7XG4gICAgfVxuICB9XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEV2ZW50VGFyZ2V0TWl4aW4sICdQYXJlbnQnLCB7XG4gIHZhbHVlOiBFdmVudFRhcmdldFBhcmVudFxufSk7XG4gIH0pKCk7XG59KTsiLCJleHBvcnQgY2xhc3MgQ29uZmlnIHt9O1xuXG5Db25maWcudGl0bGUgPSAndGlnbCc7XG4vLyBDb25maWcuXG4iLCJjbGFzcyBQcm9ncmFtXG57XG5cdGNvbnRleHQgPSBudWxsO1xuXHRwcm9ncmFtID0gbnVsbDtcblxuXHRhdHRyaWJ1dGVzID0ge307XG5cdGJ1ZmZlcnMgPSB7fTtcblx0dW5pZm9ybXMgPSB7fTtcblxuXHRjb25zdHJ1Y3Rvcih7Z2wsIHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXIsIHVuaWZvcm1zLCBhdHRyaWJ1dGVzfSlcblx0e1xuXHRcdHRoaXMuY29udGV4dCA9IGdsO1xuXHRcdHRoaXMucHJvZ3JhbSA9IGdsLmNyZWF0ZVByb2dyYW0oKTtcblxuXHRcdGdsLmF0dGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0Z2wuYXR0YWNoU2hhZGVyKHRoaXMucHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xuXG5cdFx0Z2wubGlua1Byb2dyYW0odGhpcy5wcm9ncmFtKTtcblxuXHRcdGdsLmRldGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0Z2wuZGV0YWNoU2hhZGVyKHRoaXMucHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xuXG5cdFx0Z2wuZGVsZXRlU2hhZGVyKHZlcnRleFNoYWRlcik7XG5cdFx0Z2wuZGVsZXRlU2hhZGVyKGZyYWdtZW50U2hhZGVyKTtcblxuXHRcdGlmKCFnbC5nZXRQcm9ncmFtUGFyYW1ldGVyKHRoaXMucHJvZ3JhbSwgZ2wuTElOS19TVEFUVVMpKVxuXHRcdHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZ2wuZ2V0UHJvZ3JhbUluZm9Mb2codGhpcy5wcm9ncmFtKSk7XG5cdFx0XHRnbC5kZWxldGVQcm9ncmFtKHRoaXMucHJvZ3JhbSk7XG5cdFx0fVxuXG5cdFx0Zm9yKGNvbnN0IHVuaWZvcm0gb2YgdW5pZm9ybXMpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbG9jYXRpb24gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCB1bmlmb3JtKTtcblxuXHRcdFx0aWYobG9jYXRpb24gPT09IG51bGwpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnNvbGUud2FybihgVW5pZm9ybSAke3VuaWZvcm19IG5vdCBmb3VuZC5gKTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudW5pZm9ybXNbdW5pZm9ybV0gPSBsb2NhdGlvbjtcblx0XHR9XG5cblx0XHRmb3IoY29uc3QgYXR0cmlidXRlIG9mIGF0dHJpYnV0ZXMpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbG9jYXRpb24gPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLnByb2dyYW0sIGF0dHJpYnV0ZSk7XG5cblx0XHRcdGlmKGxvY2F0aW9uID09PSBudWxsKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zb2xlLndhcm4oYEF0dHJpYnV0ZSAke2F0dHJpYnV0ZX0gbm90IGZvdW5kLmApO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgYnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG5cblx0XHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCBidWZmZXIpO1xuXHRcdFx0Z2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkobG9jYXRpb24pO1xuXHRcdFx0Z2wudmVydGV4QXR0cmliUG9pbnRlcihcblx0XHRcdFx0bG9jYXRpb25cblx0XHRcdFx0LCAyXG5cdFx0XHRcdCwgZ2wuRkxPQVRcblx0XHRcdFx0LCBmYWxzZVxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCAwXG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLmF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9IGxvY2F0aW9uO1xuXHRcdFx0dGhpcy5idWZmZXJzW2F0dHJpYnV0ZV0gPSBidWZmZXI7XG5cdFx0fVxuXHR9XG5cblx0dXNlKClcblx0e1xuXHRcdHRoaXMuY29udGV4dC51c2VQcm9ncmFtKHRoaXMucHJvZ3JhbSk7XG5cdH1cblxuXHR1bmlmb3JtRihuYW1lLCAuLi5mbG9hdHMpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblx0XHRnbFtgdW5pZm9ybSR7ZmxvYXRzLmxlbmd0aH1mYF0odGhpcy51bmlmb3Jtc1tuYW1lXSwgLi4uZmxvYXRzKTtcblx0fVxuXG5cdHVuaWZvcm1JKG5hbWUsIC4uLmludHMpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblx0XHRnbFtgdW5pZm9ybSR7aW50cy5sZW5ndGh9aWBdKHRoaXMudW5pZm9ybXNbbmFtZV0sIC4uLmludHMpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBHbDJkXG57XG5cdGNvbnN0cnVjdG9yKGVsZW1lbnQpXG5cdHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50IHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuY29udGV4dCA9IHRoaXMuZWxlbWVudC5nZXRDb250ZXh0KCd3ZWJnbCcpO1xuXHRcdHRoaXMuc2NyZWVuU2NhbGUgPSAxO1xuXHRcdHRoaXMuem9vbUxldmVsID0gMjtcblx0fVxuXG5cdGNyZWF0ZVNoYWRlcihsb2NhdGlvbilcblx0e1xuXHRcdGNvbnN0IGV4dGVuc2lvbiA9IGxvY2F0aW9uLnN1YnN0cmluZyhsb2NhdGlvbi5sYXN0SW5kZXhPZignLicpKzEpO1xuXHRcdGxldCAgIHR5cGUgPSBudWxsO1xuXG5cdFx0c3dpdGNoKGV4dGVuc2lvbi50b1VwcGVyQ2FzZSgpKVxuXHRcdHtcblx0XHRcdGNhc2UgJ1ZFUlQnOlxuXHRcdFx0XHR0eXBlID0gdGhpcy5jb250ZXh0LlZFUlRFWF9TSEFERVI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnRlJBRyc6XG5cdFx0XHRcdHR5cGUgPSB0aGlzLmNvbnRleHQuRlJBR01FTlRfU0hBREVSO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRjb25zdCBzaGFkZXIgPSB0aGlzLmNvbnRleHQuY3JlYXRlU2hhZGVyKHR5cGUpO1xuXHRcdGNvbnN0IHNvdXJjZSA9IHJlcXVpcmUobG9jYXRpb24pO1xuXG5cdFx0dGhpcy5jb250ZXh0LnNoYWRlclNvdXJjZShzaGFkZXIsIHNvdXJjZSk7XG5cdFx0dGhpcy5jb250ZXh0LmNvbXBpbGVTaGFkZXIoc2hhZGVyKTtcblxuXHRcdGNvbnN0IHN1Y2Nlc3MgPSB0aGlzLmNvbnRleHQuZ2V0U2hhZGVyUGFyYW1ldGVyKFxuXHRcdFx0c2hhZGVyXG5cdFx0XHQsIHRoaXMuY29udGV4dC5DT01QSUxFX1NUQVRVU1xuXHRcdCk7XG5cblx0XHRpZihzdWNjZXNzKVxuXHRcdHtcblx0XHRcdHJldHVybiBzaGFkZXI7XG5cdFx0fVxuXG5cdFx0Y29uc29sZS5lcnJvcih0aGlzLmNvbnRleHQuZ2V0U2hhZGVySW5mb0xvZyhzaGFkZXIpKTtcblxuXHRcdHRoaXMuY29udGV4dC5kZWxldGVTaGFkZXIoc2hhZGVyKTtcblx0fVxuXG5cdGNyZWF0ZVByb2dyYW0oe3ZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXIsIHVuaWZvcm1zLCBhdHRyaWJ1dGVzfSlcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5jb250ZXh0O1xuXG5cdFx0cmV0dXJuIG5ldyBQcm9ncmFtKHtnbCwgdmVydGV4U2hhZGVyLCBmcmFnbWVudFNoYWRlciwgdW5pZm9ybXMsIGF0dHJpYnV0ZXN9KTtcblx0fVxuXG5cdGNyZWF0ZVRleHR1cmUod2lkdGgsIGhlaWdodClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5jb250ZXh0O1xuXHRcdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKTtcblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgd2lkdGhcblx0XHRcdCwgaGVpZ2h0XG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIG51bGxcblx0XHQpO1xuXG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cblx0XHQvLyBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTElORUFSKTtcblx0XHQvLyBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTElORUFSKTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cblxuXHRcdHJldHVybiB0ZXh0dXJlO1xuXHR9XG5cblx0Y3JlYXRlRnJhbWVidWZmZXIodGV4dHVyZSlcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5jb250ZXh0O1xuXG5cdFx0Y29uc3QgZnJhbWVidWZmZXIgPSBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBmcmFtZWJ1ZmZlcik7XG5cblx0XHRnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChcblx0XHRcdGdsLkZSQU1FQlVGRkVSXG5cdFx0XHQsIGdsLkNPTE9SX0FUVEFDSE1FTlQwXG5cdFx0XHQsIGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgdGV4dHVyZVxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdHJldHVybiBmcmFtZWJ1ZmZlcjtcblx0fVxuXG5cdGVuYWJsZUJsZW5kaW5nKClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5jb250ZXh0O1xuXHRcdGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xuXHRcdGdsLmVuYWJsZShnbC5CTEVORCk7XG5cdH1cbn1cbiIsImltcG9ydCB7IFZpZXcgYXMgQmFzZVZpZXcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9WaWV3JztcbmltcG9ydCB7IEtleWJvYXJkIH0gZnJvbSAnY3VydmF0dXJlL2lucHV0L0tleWJvYXJkJ1xuaW1wb3J0IHsgQmFnIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmFnJztcblxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSAnQ29uZmlnJztcblxuaW1wb3J0IHsgVGlsZU1hcCB9IGZyb20gJy4uL3dvcmxkL1RpbGVNYXAnO1xuXG5pbXBvcnQgeyBTcHJpdGVCb2FyZCB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGVCb2FyZCc7XG5cbmltcG9ydCB7IENvbnRyb2xsZXIgYXMgT25TY3JlZW5Kb3lQYWQgfSBmcm9tICcuLi91aS9Db250cm9sbGVyJztcblxuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi4vc3ByaXRlL0NhbWVyYSc7XG5cbmltcG9ydCB7IFdvcmxkIH0gZnJvbSAnLi4vd29ybGQvV29ybGQnO1xuXG5pbXBvcnQgeyBTZXNzaW9uIH0gZnJvbSAnLi4vc2Vzc2lvbi9TZXNzaW9uJztcblxuY29uc3QgQXBwbGljYXRpb24gPSB7fTtcblxuQXBwbGljYXRpb24ub25TY3JlZW5Kb3lQYWQgPSBuZXcgT25TY3JlZW5Kb3lQYWQ7XG5BcHBsaWNhdGlvbi5rZXlib2FyZCA9IEtleWJvYXJkLmdldCgpO1xuXG5leHBvcnQgY2xhc3MgVmlldyBleHRlbmRzIEJhc2VWaWV3XG57XG5cdGNvbnN0cnVjdG9yKGFyZ3MpXG5cdHtcblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgPSB0cnVlO1xuXHRcdHN1cGVyKGFyZ3MpO1xuXHRcdHRoaXMudGVtcGxhdGUgID0gcmVxdWlyZSgnLi92aWV3LnRtcCcpO1xuXHRcdHRoaXMucm91dGVzICAgID0gW107XG5cblx0XHR0aGlzLmtleWJvYXJkICA9IEFwcGxpY2F0aW9uLmtleWJvYXJkO1xuXHRcdHRoaXMuc3BlZWQgICAgID0gMjQ7XG5cdFx0dGhpcy5tYXhTcGVlZCAgPSB0aGlzLnNwZWVkO1xuXG5cdFx0dGhpcy5hcmdzLmNvbnRyb2xsZXIgPSBBcHBsaWNhdGlvbi5vblNjcmVlbkpveVBhZDtcblxuXHRcdHRoaXMuYXJncy5mcHMgID0gMDtcblx0XHR0aGlzLmFyZ3Muc3BzICA9IDA7XG5cblx0XHR0aGlzLmFyZ3MuY2FtWCA9IDA7XG5cdFx0dGhpcy5hcmdzLmNhbVkgPSAwO1xuXG5cdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblxuXHRcdHRoaXMua2V5Ym9hcmQubGlzdGVuaW5nID0gdHJ1ZTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0hvbWUnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKCF0aGlzLnNlc3Npb24gfHwgdiA8IDApIHJldHVybjtcblxuXHRcdFx0aWYodiAlIDUgPT09IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuc2Vzc2lvbi5mcmFtZUxvY2srKztcblxuXHRcdFx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrID0gdGhpcy5zZXNzaW9uLmZyYW1lTG9jaztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0VuZCcsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYoIXRoaXMuc2Vzc2lvbiB8fCB2IDwgMCkgcmV0dXJuO1xuXG5cdFx0XHRpZih2ICUgNSA9PT0gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5zZXNzaW9uLmZyYW1lTG9jay0tO1xuXG5cdFx0XHRcdGlmKHRoaXMuc2Vzc2lvbi5mcmFtZUxvY2sgPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5zZXNzaW9uLmZyYW1lTG9jayA9IDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrID0gdGhpcy5zZXNzaW9uLmZyYW1lTG9jaztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ1BhZ2VVcCcsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYoIXRoaXMuc2Vzc2lvbiB8fCB2IDwgMCkgcmV0dXJuO1xuXG5cdFx0XHRpZih2ICUgNSA9PT0gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5zZXNzaW9uLnNpbXVsYXRpb25Mb2NrKys7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA9IHRoaXMuc2Vzc2lvbi5zaW11bGF0aW9uTG9jaztcblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ1BhZ2VEb3duJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZighdGhpcy5zZXNzaW9uIHx8IHYgPCAwKSByZXR1cm47XG5cblx0XHRcdGlmKHYgJSA1ID09PSAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnNlc3Npb24uc2ltdWxhdGlvbkxvY2stLTtcblxuXHRcdFx0XHRpZih0aGlzLnNlc3Npb24uc2ltdWxhdGlvbkxvY2sgPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5zZXNzaW9uLnNpbXVsYXRpb25Mb2NrID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPSB0aGlzLnNlc3Npb24uc2ltdWxhdGlvbkxvY2s7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCc9JywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy56b29tKDEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnKycsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuem9vbSgxKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJy0nLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnpvb20oLTEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdH1cblxuXHRvblJlbmRlcmVkKClcblx0e1xuXHRcdGNvbnN0IHNwcml0ZUJvYXJkID0gbmV3IFNwcml0ZUJvYXJkKHtcblx0XHRcdGVsZW1lbnQ6IHRoaXMudGFncy5jYW52YXMuZWxlbWVudFxuXHRcdFx0LCB3b3JsZDogbmV3IFdvcmxkKHtzcmM6ICcuL3dvcmxkLmpzb24nfSlcblx0XHRcdCwgbWFwOiAgIG5ldyBUaWxlTWFwKHtzcmM6ICcuL21hcC5qc29uJ30pXG5cdFx0fSk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cblx0XHR0aGlzLnNlc3Npb24gPSBuZXcgU2Vzc2lvbih7XG5cdFx0XHRzcHJpdGVCb2FyZFxuXHRcdFx0LCBrZXlib2FyZDogdGhpcy5rZXlib2FyZFxuXHRcdFx0LCBvblNjcmVlbkpveVBhZDogdGhpcy5hcmdzLmNvbnRyb2xsZXJcblx0XHR9KTtcblxuXHRcdHRoaXMuYXJncy5mcmFtZUxvY2sgPSB0aGlzLnNlc3Npb24uZnJhbWVMb2NrO1xuXHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA9IHRoaXMuc2Vzc2lvbi5zaW11bGF0aW9uTG9jaztcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCAoKSA9PiB0aGlzLnJlc2l6ZSgpKTtcblxuXHRcdGxldCBmVGhlbiA9IDA7XG5cdFx0bGV0IHNUaGVuID0gMDtcblxuXHRcdGNvbnN0IHNpbXVsYXRlID0gbm93ID0+IHtcblx0XHRcdGlmKGRvY3VtZW50LmhpZGRlbilcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZighdGhpcy5zZXNzaW9uLnNpbXVsYXRlKG5vdykpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hcmdzLnNwcyA9ICgxMDAwIC8gKG5vdyAtIHNUaGVuKSkudG9GaXhlZCgzKTtcblx0XHRcdHNUaGVuID0gbm93O1xuXHRcdH07XG5cblx0XHRjb25zdCBkcmF3ID0gbm93ID0+IHtcblx0XHRcdGlmKGRvY3VtZW50LmhpZGRlbilcblx0XHRcdHtcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXcpO1xuXG5cdFx0XHRpZighdGhpcy5zZXNzaW9uLmRyYXcobm93KSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFyZ3MuZnBzID0gKDEwMDAgLyAobm93IC0gZlRoZW4pKS50b0ZpeGVkKDMpO1xuXHRcdFx0dGhpcy5hcmdzLmNhbVggPSBOdW1iZXIoQ2FtZXJhLngpLnRvRml4ZWQoMyk7XG5cdFx0XHR0aGlzLmFyZ3MuY2FtWSA9IE51bWJlcihDYW1lcmEueSkudG9GaXhlZCgzKTtcblxuXHRcdFx0ZlRoZW4gPSBub3c7XG5cblx0XHRcdGlmKHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MucG9zWCA9IE51bWJlcih0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZy5zcHJpdGUueCkudG9GaXhlZCgzKTtcblx0XHRcdFx0dGhpcy5hcmdzLnBvc1kgPSBOdW1iZXIodGhpcy5zcHJpdGVCb2FyZC5mb2xsb3dpbmcuc3ByaXRlLnkpLnRvRml4ZWQoMyk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAvIDEwMjQgKiA0O1xuXHRcdHRoaXMucmVzaXplKCk7XG5cblx0XHRzZXRJbnRlcnZhbCgoKSA9PiBzaW11bGF0ZShwZXJmb3JtYW5jZS5ub3coKSksIDApO1xuXHRcdGRyYXcocGVyZm9ybWFuY2Uubm93KCkpO1xuXHR9XG5cblx0cmVzaXplKHgsIHkpXG5cdHtcblx0XHR0aGlzLmFyZ3Mud2lkdGggID0gdGhpcy50YWdzLmNhbnZhcy5lbGVtZW50LndpZHRoICAgPSB4IHx8IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XG5cdFx0dGhpcy5hcmdzLmhlaWdodCA9IHRoaXMudGFncy5jYW52YXMuZWxlbWVudC5oZWlnaHQgID0geSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodDtcblxuXHRcdHRoaXMuYXJncy5yd2lkdGggPSBNYXRoLnRydW5jKFxuXHRcdFx0KHggfHwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgIC8gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHR0aGlzLmFyZ3MucmhlaWdodCA9IE1hdGgudHJ1bmMoXG5cdFx0XHQoeSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCkgLyB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsXG5cdFx0KTtcblxuXHRcdGNvbnN0IG9sZFNjYWxlID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSA9IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0IC8gMTAyNDtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgKj0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlIC8gb2xkU2NhbGU7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHR9XG5cblx0c2Nyb2xsKGV2ZW50KVxuXHR7XG5cdFx0bGV0IGRlbHRhID0gZXZlbnQuZGVsdGFZID4gMCA/IC0xIDogKFxuXHRcdFx0ZXZlbnQuZGVsdGFZIDwgMCA/IDEgOiAwXG5cdFx0KTtcblxuXHRcdHRoaXMuem9vbShkZWx0YSk7XG5cdH1cblxuXHR6b29tKGRlbHRhKVxuXHR7XG5cdFx0aWYoIXRoaXMuc2Vzc2lvbilcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWF4ID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMzI7XG5cdFx0Y29uc3QgbWluID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnNjcmVlblNjYWxlICogMC4yO1xuXHRcdGNvbnN0IHN0ZXAgPSAwLjA1ICogdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblxuXHRcdGxldCB6b29tTGV2ZWwgPSAoZGVsdGEgKiBzdGVwICsgdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCkudG9GaXhlZCgyKTtcblxuXHRcdGlmKHpvb21MZXZlbCA8IG1pbilcblx0XHR7XG5cdFx0XHR6b29tTGV2ZWwgPSBtaW47XG5cdFx0fVxuXHRcdGVsc2UgaWYoem9vbUxldmVsID4gbWF4KVxuXHRcdHtcblx0XHRcdHpvb21MZXZlbCA9IG1heDtcblx0XHR9XG5cblx0XHRpZihNYXRoLmFicyh6b29tTGV2ZWwgLSAxKSA8IDAuMDUpXG5cdFx0e1xuXHRcdFx0em9vbUxldmVsID0gMTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICE9PSB6b29tTGV2ZWwpXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCA9IHpvb21MZXZlbDtcblx0XHRcdHRoaXMucmVzaXplKCk7XG5cdFx0fVxuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGNhbnZhc1xcblxcdGN2LXJlZiA9IFxcXCJjYW52YXM6Y3VydmF0dXJlL2Jhc2UvVGFnXFxcIlxcblxcdGN2LW9uICA9IFxcXCJ3aGVlbDpzY3JvbGwoZXZlbnQpO1xcXCJcXG4+PC9jYW52YXM+XFxuXFxuPGRpdiBjbGFzcyA9IFxcXCJodWQgZnBzXFxcIj5bW3Nwc11dIHNpbXVsYXRpb25zL3MgLyBbW3NpbXVsYXRpb25Mb2NrXV1cXG5bW2Zwc11dIGZyYW1lcy9zICAgICAgLyBbW2ZyYW1lTG9ja11dXFxuXFxuUmVzIFtbcndpZHRoXV0geCBbW3JoZWlnaHRdXVxcbiAgICBbW3dpZHRoXV0geCBbW2hlaWdodF1dXFxuXFxuQ2FtIFtbY2FtWF1dIHggW1tjYW1ZXV1cXG5Qb3MgW1twb3NYXV0geCBbW3Bvc1ldXVxcblxcbvCdmqsgU2ltOiAgIFBnIFVwIC8gRG5cXG7wnZqrIEZyYW1lOiBIb21lIC8gRW5kXFxu8J2aqyBTY2FsZTogKyAvIC1cXG48L2Rpdj5cXG48ZGl2IGNsYXNzID0gXFxcInJldGljbGVcXFwiPjwvZGl2PlxcblxcbltbY29udHJvbGxlcl1dXFxuXCIiLCJpbXBvcnQgeyBSb3V0ZXIgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9Sb3V0ZXInO1xuaW1wb3J0IHsgVmlldyAgIH0gZnJvbSAnaG9tZS9WaWV3JztcblxuaWYoUHJveHkgIT09IHVuZGVmaW5lZClcbntcblx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcblx0XHRjb25zdCB2aWV3ID0gbmV3IFZpZXcoKTtcblx0XHRcblx0XHRSb3V0ZXIubGlzdGVuKHZpZXcpO1xuXHRcdFxuXHRcdHZpZXcucmVuZGVyKGRvY3VtZW50LmJvZHkpO1xuXHR9KTtcbn1cbmVsc2Vcbntcblx0Ly8gZG9jdW1lbnQud3JpdGUocmVxdWlyZSgnLi9GYWxsYmFjay9mYWxsYmFjay50bXAnKSk7XG59XG4iLCJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnLi9JbmplY3RhYmxlJztcblxuZXhwb3J0IGNsYXNzIENvbnRhaW5lciBleHRlbmRzIEluamVjdGFibGVcbntcblx0aW5qZWN0KGluamVjdGlvbnMpXG5cdHtcblx0XHRyZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IoT2JqZWN0LmFzc2lnbih7fSwgdGhpcywgaW5qZWN0aW9ucykpO1xuXHR9XG59XG4iLCJsZXQgY2xhc3NlcyA9IHt9O1xubGV0IG9iamVjdHMgPSB7fTtcblxuZXhwb3J0IGNsYXNzIEluamVjdGFibGVcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0bGV0IGluamVjdGlvbnMgPSB0aGlzLmNvbnN0cnVjdG9yLmluamVjdGlvbnMoKTtcblx0XHRsZXQgY29udGV4dCAgICA9IHRoaXMuY29uc3RydWN0b3IuY29udGV4dCgpO1xuXG5cdFx0aWYoIWNsYXNzZXNbY29udGV4dF0pXG5cdFx0e1xuXHRcdFx0Y2xhc3Nlc1tjb250ZXh0XSA9IHt9O1xuXHRcdH1cblxuXHRcdGlmKCFvYmplY3RzW2NvbnRleHRdKVxuXHRcdHtcblx0XHRcdG9iamVjdHNbY29udGV4dF0gPSB7fTtcblx0XHR9XG5cblx0XHRmb3IobGV0IG5hbWUgaW4gaW5qZWN0aW9ucylcblx0XHR7XG5cdFx0XHRsZXQgaW5qZWN0aW9uID0gaW5qZWN0aW9uc1tuYW1lXTtcblxuXHRcdFx0aWYoY2xhc3Nlc1tjb250ZXh0XVtuYW1lXSB8fCAhaW5qZWN0aW9uLnByb3RvdHlwZSlcblx0XHRcdHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmKC9bQS1aXS8udGVzdChTdHJpbmcobmFtZSlbMF0pKVxuXHRcdFx0e1xuXHRcdFx0XHRjbGFzc2VzW2NvbnRleHRdW25hbWVdID0gaW5qZWN0aW9uO1xuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0Zm9yKGxldCBuYW1lIGluIGluamVjdGlvbnMpXG5cdFx0e1xuXHRcdFx0bGV0IGluc3RhbmNlICA9IHVuZGVmaW5lZDtcblx0XHRcdGxldCBpbmplY3Rpb24gPSBjbGFzc2VzW2NvbnRleHRdW25hbWVdIHx8IGluamVjdGlvbnNbbmFtZV07XG5cblx0XHRcdGlmKC9bQS1aXS8udGVzdChTdHJpbmcobmFtZSlbMF0pKVxuXHRcdFx0e1xuXHRcdFx0XHRpZihpbmplY3Rpb24ucHJvdG90eXBlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYoIW9iamVjdHNbY29udGV4dF1bbmFtZV0pXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0b2JqZWN0c1tjb250ZXh0XVtuYW1lXSA9IG5ldyBpbmplY3Rpb247XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG9iamVjdHNbY29udGV4dF1bbmFtZV0gPSBpbmplY3Rpb247XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpbnN0YW5jZSA9IG9iamVjdHNbY29udGV4dF1bbmFtZV07XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGlmKGluamVjdGlvbi5wcm90b3R5cGUpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpbnN0YW5jZSA9IG5ldyBpbmplY3Rpb247XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aW5zdGFuY2UgPSBpbmplY3Rpb247XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIG5hbWUsIHtcblx0XHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRcdHdyaXRhYmxlOiAgIGZhbHNlLFxuXHRcdFx0XHR2YWx1ZTogICAgICBpbnN0YW5jZVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxuXHRzdGF0aWMgaW5qZWN0aW9ucygpXG5cdHtcblx0XHRyZXR1cm4ge307XG5cdH1cblxuXHRzdGF0aWMgY29udGV4dCgpXG5cdHtcblx0XHRyZXR1cm4gJy4nO1xuXHR9XG5cblx0c3RhdGljIGluamVjdChpbmplY3Rpb25zLCBjb250ZXh0ID0gJy4nKVxuXHR7XG5cdFx0aWYoISh0aGlzLnByb3RvdHlwZSBpbnN0YW5jZW9mIEluamVjdGFibGUgfHwgdGhpcyA9PT0gSW5qZWN0YWJsZSkpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgYWNjZXNzIGluamVjdGFibGUgc3ViY2xhc3MhXG5cbkFyZSB5b3UgdHJ5aW5nIHRvIGluc3RhbnRpYXRlIGxpa2UgdGhpcz9cblxuXHRuZXcgWC5pbmplY3Qoey4uLn0pO1xuXG5JZiBzbyBwbGVhc2UgdHJ5OlxuXG5cdG5ldyAoWC5pbmplY3Qoey4uLn0pKTtcblxuUGxlYXNlIG5vdGUgdGhlIHBhcmVudGhlc2lzLlxuYCk7XG5cdFx0fVxuXG5cdFx0bGV0IGV4aXN0aW5nSW5qZWN0aW9ucyA9IHRoaXMuaW5qZWN0aW9ucygpO1xuXG5cdFx0cmV0dXJuIGNsYXNzIGV4dGVuZHMgdGhpcyB7XG5cdFx0XHRzdGF0aWMgaW5qZWN0aW9ucygpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBleGlzdGluZ0luamVjdGlvbnMsIGluamVjdGlvbnMpO1xuXHRcdFx0fVxuXHRcdFx0c3RhdGljIGNvbnRleHQoKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gY29udGV4dDtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG59XG4iLCJjbGFzcyBTaW5nbGVcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0dGhpcy5uYW1lID0gJ3Nzcy4nICsgTWF0aC5yYW5kb20oKTtcblx0fVxufVxuXG5sZXQgc2luZ2xlID0gbmV3IFNpbmdsZTtcblxuZXhwb3J0IHtTaW5nbGUsIHNpbmdsZX07IiwiZXhwb3J0IGNsYXNzIEdlb21ldHJ5XG57XG5cdGxpbmVJbnRlcnNlY3RzTGluZSh4MWEsIHkxYSwgeDJhLCB5MmEsIHgxYiwgeTFiLCB4MmIsIHkyYilcblx0e1xuXHRcdGNvbnN0IGF4ID0geDJhIC0geDFhO1xuXHRcdGNvbnN0IGF5ID0geTJhIC0geTFhO1xuXG5cdFx0Y29uc3QgYnggPSB4MmIgLSB4MWI7XG5cdFx0Y29uc3QgYnkgPSB5MmIgLSB5MWI7XG5cblx0XHRjb25zdCBjcm9zc1Byb2R1Y3QgPSBheCAqIGJ5IC0gYXkgKiBieDtcblxuXHRcdC8vIFBhcmFsbGVsIExpbmVzIGNhbm5vdCBpbnRlcnNlY3Rcblx0XHRpZihjcm9zc1Byb2R1Y3QgPT09IDApXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNvbnN0IGN4ID0geDFiIC0geDFhO1xuXHRcdGNvbnN0IGN5ID0geTFiIC0geTFhO1xuXG5cdFx0Ly8gSXMgb3VyIHBvaW50IHdpdGhpbiB0aGUgYm91bmRzIG9mIGxpbmUgYT9cblx0XHRjb25zdCBkID0gKGN4ICogYXkgLSBjeSAqIGF4KSAvIGNyb3NzUHJvZHVjdDtcblx0XHRpZihkIDwgMCB8fCBkID4gMSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gSXMgb3VyIHBvaW50IHdpdGhpbiB0aGUgYm91bmRzIG9mIGxpbmUgYj9cblx0XHRjb25zdCBlID0gKGN4ICogYnkgLSBjeSAqIGJ4KSAvIGNyb3NzUHJvZHVjdDtcblx0XHRpZihlIDwgMCB8fCBlID4gMSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFt4MWEgKyBlICogYXgsIHkxYSArIGUgKiBheV07XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBNYXRyaXhcbntcblx0c3RhdGljIGlkZW50aXR5KClcblx0e1xuXHRcdHJldHVybiBbXG5cdFx0XHRbMSwgMCwgMF0sXG5cdFx0XHRbMCwgMSwgMF0sXG5cdFx0XHRbMCwgMCwgMV0sXG5cdFx0XTtcblx0fVxuXG5cdHN0YXRpYyB0cmFuc2xhdGUoZHgsIGR5KVxuXHR7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFsxLCAwLCBkeF0sXG5cdFx0XHRbMCwgMSwgZHldLFxuXHRcdFx0WzAsIDAsICAxXSxcblx0XHRdO1xuXHR9XG5cblx0c3RhdGljIHNjYWxlKGR4LCBkeSlcblx0e1xuXHRcdHJldHVybiBbXG5cdFx0XHRbZHgsIDAsIDBdLFxuXHRcdFx0WzAsIGR5LCAwXSxcblx0XHRcdFswLCAwLCAgMV0sXG5cdFx0XTtcblx0fVxuXG5cdHN0YXRpYyByb3RhdGUodGhldGEpXG5cdHtcblx0XHRjb25zdCBzID0gTWF0aC5zaW4odGhldGEpO1xuXHRcdGNvbnN0IGMgPSBNYXRoLmNvcyh0aGV0YSk7XG5cblx0XHRyZXR1cm4gW1xuXHRcdFx0W2MsIC1zLCAwXSxcblx0XHRcdFtzLCAgYywgMF0sXG5cdFx0XHRbMCwgIDAsIDFdLFxuXHRcdF07XG5cdH1cblxuXHRzdGF0aWMgc2hlYXJYKHMpXG5cdHtcblx0XHRyZXR1cm4gW1xuXHRcdFx0WzEsIHMsIDBdLFxuXHRcdFx0WzAsIDEsIDBdLFxuXHRcdFx0WzAsIDAsIDFdLFxuXHRcdF07XG5cdH1cblxuXHRzdGF0aWMgc2hlYXJZKHMpXG5cdHtcblx0XHRyZXR1cm4gW1xuXHRcdFx0WzEsIDAsIDBdLFxuXHRcdFx0W3MsIDEsIDBdLFxuXHRcdFx0WzAsIDAsIDFdLFxuXHRcdF07XG5cdH1cblxuXHRzdGF0aWMgbXVsdGlwbHkobWF0QSwgbWF0Qilcblx0e1xuXHRcdGlmKG1hdEEubGVuZ3RoICE9PSBtYXRCLmxlbmd0aClcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgbWF0cmljZXMnKTtcblx0XHR9XG5cblx0XHRpZihtYXRBWzBdLmxlbmd0aCAhPT0gbWF0Qi5sZW5ndGgpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbmNvbXBhdGlibGUgbWF0cmljZXMnKTtcblx0XHR9XG5cblx0XHRjb25zdCBvdXRwdXQgPSBBcnJheShtYXRBLmxlbmd0aCkuZmlsbCgpLm1hcCgoKSA9PiBBcnJheShtYXRCWzBdLmxlbmd0aCkuZmlsbCgwKSk7XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgbWF0QS5sZW5ndGg7IGkrKylcblx0XHR7XG5cdFx0XHRmb3IobGV0IGogPSAwOyBqIDwgbWF0QlswXS5sZW5ndGg7IGorKylcblx0XHRcdHtcblx0XHRcdFx0Zm9yKGxldCBrID0gMDsgayA8IG1hdEFbMF0ubGVuZ3RoOyBrKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRvdXRwdXRbaV1bal0gKz0gbWF0QVtpXVtrXSAqIG1hdEJba11bal07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0c3RhdGljIGNvbXBvc2l0ZSguLi5tYXRzKVxuXHR7XG5cdFx0bGV0IG91dHB1dCA9IHRoaXMuaWRlbnRpdHkoKTtcblxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCBtYXRzLmxlbmd0aDsgaSsrKVxuXHRcdHtcblx0XHRcdG91dHB1dCA9IHRoaXMubXVsdGlwbHkob3V0cHV0LCBtYXRzW2ldKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0c3RhdGljIHRyYW5zZm9ybShwb2ludHMsIG1hdHJpeClcblx0e1xuXHRcdGNvbnN0IG91dHB1dCA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkgKz0gMilcblx0XHR7XG5cdFx0XHRjb25zdCBwb2ludCA9IFtwb2ludHNbaV0sIHBvaW50c1tpICsgMV0sIDFdO1xuXG5cdFx0XHRmb3IoY29uc3Qgcm93IG9mIG1hdHJpeClcblx0XHRcdHtcblx0XHRcdFx0b3V0cHV0LnB1c2goXG5cdFx0XHRcdFx0cG9pbnRbMF0gKiByb3dbMF1cblx0XHRcdFx0XHQrIHBvaW50WzFdICogcm93WzFdXG5cdFx0XHRcdFx0KyBwb2ludFsyXSAqIHJvd1syXVxuXHRcdFx0XHQpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkob3V0cHV0LmZpbHRlcigoXywgaykgPT4gKDEgKyBrKSAlIDMpKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tIFwiY3VydmF0dXJlL2Jhc2UvQmluZGFibGVcIjtcbmltcG9ydCB7IFJlY3RhbmdsZSB9IGZyb20gXCIuL1JlY3RhbmdsZVwiO1xuXG5leHBvcnQgY2xhc3MgUXVhZHRyZWUgZXh0ZW5kcyBSZWN0YW5nbGVcbntcblx0Y29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIG1pblNpemUgPSAwLCBwYXJlbnQgPSBudWxsKVxuXHR7XG5cdFx0c3VwZXIoeDEsIHkxLCB4MiwgeTIpO1xuXG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cblx0XHR0aGlzLml0ZW1zID0gbmV3IFNldDtcblx0XHR0aGlzLnNwbGl0ID0gZmFsc2U7XG5cdFx0dGhpcy5taW5TaXplID0gbWluU2l6ZTtcblx0XHR0aGlzLmJhY2tNYXAgPSBwYXJlbnQgPyBwYXJlbnQuYmFja01hcCA6IG5ldyBNYXBcblx0XHR0aGlzLnBhcmVudCA9IHBhcmVudDtcblxuXHRcdHRoaXMudWxDZWxsID0gbnVsbDtcblx0XHR0aGlzLnVyQ2VsbCA9IG51bGw7XG5cdFx0dGhpcy5ibENlbGwgPSBudWxsO1xuXHRcdHRoaXMuYnJDZWxsID0gbnVsbDtcblx0fVxuXG5cdGFkZChlbnRpdHkpXG5cdHtcblx0XHRpZighdGhpcy5jb250YWlucyhlbnRpdHkueCwgZW50aXR5LnkpKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCB4U2l6ZSA9IHRoaXMueDIgLSB0aGlzLngxO1xuXHRcdGNvbnN0IHlTaXplID0gdGhpcy55MiAtIHRoaXMueTE7XG5cblx0XHRpZih0aGlzLnNwbGl0IHx8IHRoaXMuaXRlbXMuc2l6ZSAmJiB4U2l6ZSA+IHRoaXMubWluU2l6ZSAmJiB5U2l6ZSA+IHRoaXMubWluU2l6ZSlcblx0XHR7XG5cdFx0XHRpZighdGhpcy5zcGxpdClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgeFNpemVIYWxmID0gMC41ICogeFNpemU7XG5cdFx0XHRcdGNvbnN0IHlTaXplSGFsZiA9IDAuNSAqIHlTaXplO1xuXG5cdFx0XHRcdHRoaXMudWxDZWxsID0gbmV3IFF1YWR0cmVlKHRoaXMueDEsIHRoaXMueTEsICAgICAgICAgICAgIHRoaXMueDEgKyB4U2l6ZUhhbGYsIHRoaXMueTEgKyB5U2l6ZUhhbGYsIHRoaXMubWluU2l6ZSwgdGhpcyk7XG5cdFx0XHRcdHRoaXMuYmxDZWxsID0gbmV3IFF1YWR0cmVlKHRoaXMueDEsIHRoaXMueTEgKyB5U2l6ZUhhbGYsIHRoaXMueDEgKyB4U2l6ZUhhbGYsIHRoaXMueTIsICAgICAgICAgICAgIHRoaXMubWluU2l6ZSwgdGhpcyk7XG5cblx0XHRcdFx0dGhpcy51ckNlbGwgPSBuZXcgUXVhZHRyZWUodGhpcy54MSArIHhTaXplSGFsZiwgdGhpcy55MSwgICAgICAgICAgICAgdGhpcy54MiwgdGhpcy55MSArIHlTaXplSGFsZiwgdGhpcy5taW5TaXplLCB0aGlzKTtcblx0XHRcdFx0dGhpcy5ickNlbGwgPSBuZXcgUXVhZHRyZWUodGhpcy54MSArIHhTaXplSGFsZiwgdGhpcy55MSArIHlTaXplSGFsZiwgdGhpcy54MiwgdGhpcy55MiwgICAgICAgICAgICAgdGhpcy5taW5TaXplLCB0aGlzKTtcblxuXHRcdFx0XHRmb3IoY29uc3QgaXRlbSBvZiB0aGlzLml0ZW1zKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5pdGVtcy5kZWxldGUoaXRlbSk7XG5cblx0XHRcdFx0XHR0aGlzLnVsQ2VsbC5hZGQoaXRlbSk7XG5cdFx0XHRcdFx0dGhpcy51ckNlbGwuYWRkKGl0ZW0pO1xuXHRcdFx0XHRcdHRoaXMuYmxDZWxsLmFkZChpdGVtKTtcblx0XHRcdFx0XHR0aGlzLmJyQ2VsbC5hZGQoaXRlbSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzLnNwbGl0ICA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudWxDZWxsLmFkZChlbnRpdHkpO1xuXHRcdFx0dGhpcy51ckNlbGwuYWRkKGVudGl0eSk7XG5cdFx0XHR0aGlzLmJsQ2VsbC5hZGQoZW50aXR5KTtcblx0XHRcdHRoaXMuYnJDZWxsLmFkZChlbnRpdHkpO1xuXHRcdH1cblx0XHRlbHNlIGlmKHRoaXMuc3BsaXQpXG5cdFx0e1xuXHRcdFx0dGhpcy51bENlbGwuYWRkKGVudGl0eSk7XG5cdFx0XHR0aGlzLnVyQ2VsbC5hZGQoZW50aXR5KTtcblx0XHRcdHRoaXMuYmxDZWxsLmFkZChlbnRpdHkpO1xuXHRcdFx0dGhpcy5ickNlbGwuYWRkKGVudGl0eSk7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR0aGlzLmJhY2tNYXAuc2V0KGVudGl0eSwgdGhpcyk7XG5cdFx0XHR0aGlzLml0ZW1zLmFkZChlbnRpdHkpO1xuXHRcdH1cblx0fVxuXG5cdG1vdmUoZW50aXR5KVxuXHR7XG5cdFx0aWYoIXRoaXMuYmFja01hcC5oYXMoZW50aXR5KSlcblx0XHR7XG5cdFx0XHQvLyBjb25zb2xlLndhcm4oJ0VudGl0eSBub3QgaW4gUXVhZHRyZWUuJyk7XG5cdFx0XHR0aGlzLmFkZChlbnRpdHkpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN0YXJ0Q2VsbCA9IHRoaXMuYmFja01hcC5nZXQoZW50aXR5KTtcblx0XHRsZXQgY2VsbCA9IHN0YXJ0Q2VsbDtcblxuXHRcdHdoaWxlKGNlbGwgJiYgIWNlbGwuY29udGFpbnMoZW50aXR5LngsIGVudGl0eS55KSlcblx0XHR7XG5cdFx0XHRjZWxsID0gY2VsbC5wYXJlbnQ7XG5cdFx0fVxuXG5cdFx0aWYoIWNlbGwpXG5cdFx0e1xuXHRcdFx0Ly8gY29uc29sZS53YXJuKCdObyBRdWFkVHJlZSBjZWxsIGZvdW5kIScpO1xuXHRcdFx0c3RhcnRDZWxsLmRlbGV0ZShlbnRpdHkpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmKGNlbGwgIT09IHN0YXJ0Q2VsbClcblx0XHR7XG5cdFx0XHRzdGFydENlbGwuZGVsZXRlKGVudGl0eSk7XG5cdFx0XHRjZWxsLmFkZChlbnRpdHkpO1xuXHRcdH1cblx0fVxuXG5cdGRlbGV0ZShlbnRpdHkpXG5cdHtcblx0XHRpZighdGhpcy5iYWNrTWFwLmhhcyhlbnRpdHkpKVxuXHRcdHtcblx0XHRcdGNvbnNvbGUud2FybignRW50aXR5IG5vdCBpbiBRdWFkdHJlZS4nKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBjZWxsID0gdGhpcy5iYWNrTWFwLmdldChlbnRpdHkpO1xuXHRcdHRoaXMuYmFja01hcC5kZWxldGUoZW50aXR5KTtcblxuXHRcdGNlbGwuaXRlbXMuZGVsZXRlKGVudGl0eSk7XG5cblx0XHRpZihjZWxsLnBhcmVudClcblx0XHR7XG5cdFx0XHRjZWxsLnBhcmVudC5wcnVuZSgpO1xuXHRcdH1cblx0fVxuXG5cdGlzUHJ1bmFibGUoKVxuXHR7XG5cdFx0cmV0dXJuICF0aGlzLnVsQ2VsbC5zcGxpdCAmJiB0aGlzLnVsQ2VsbC5pdGVtcy5zaXplID09PSAwXG5cdFx0XHQmJiAhdGhpcy51ckNlbGwuc3BsaXQgJiYgdGhpcy51ckNlbGwuaXRlbXMuc2l6ZSA9PT0gMFxuXHRcdFx0JiYgIXRoaXMuYmxDZWxsLnNwbGl0ICYmIHRoaXMuYmxDZWxsLml0ZW1zLnNpemUgPT09IDBcblx0XHRcdCYmICF0aGlzLmJyQ2VsbC5zcGxpdCAmJiB0aGlzLmJyQ2VsbC5pdGVtcy5zaXplID09PSAwO1xuXHR9XG5cblx0cHJ1bmUoKVxuXHR7XG5cdFx0aWYoIXRoaXMuaXNQcnVuYWJsZSgpKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0aGlzLnNwbGl0ID0gZmFsc2U7XG5cblx0XHR0aGlzLnVsQ2VsbCA9IG51bGw7XG5cdFx0dGhpcy51ckNlbGwgPSBudWxsO1xuXHRcdHRoaXMuYmxDZWxsID0gbnVsbDtcblx0XHR0aGlzLmJyQ2VsbCA9IG51bGw7XG5cdH1cblxuXHRmaW5kTGVhZih4LCB5KVxuXHR7XG5cdFx0aWYoIXRoaXMuY29udGFpbnMoeCwgeSkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXG5cdFx0aWYoIXRoaXMuc3BsaXQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMudWxDZWxsLmZpbmRMZWFmKHgsIHkpXG5cdFx0XHQ/PyB0aGlzLnVyQ2VsbC5maW5kTGVhZih4LCB5KVxuXHRcdFx0Pz8gdGhpcy5ibENlbGwuZmluZExlYWYoeCwgeSlcblx0XHRcdD8/IHRoaXMuYnJDZWxsLmZpbmRMZWFmKHgsIHkpO1xuXHR9XG5cblx0aGFzKGVudGl0eSlcblx0e1xuXHRcdGlmKHRoaXMuc3BsaXQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudWxDZWxsLmhhcyhlbnRpdHkpXG5cdFx0XHRcdHx8IHRoaXMudXJDZWxsLmhhcyhlbnRpdHkpXG5cdFx0XHRcdHx8IHRoaXMuYmxDZWxsLmhhcyhlbnRpdHkpXG5cdFx0XHRcdHx8IHRoaXMuYnJDZWxsLmhhcyhlbnRpdHkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLml0ZW1zLmhhcyhlbnRpdHkpO1xuXHR9XG5cblx0c2VsZWN0KHgsIHksIHcsIGgpXG5cdHtcblx0XHRjb25zdCB4TWF4ID0geCArIHc7XG5cdFx0Y29uc3QgeU1heCA9IHkgKyBoO1xuXG5cdFx0aWYoeE1heCA8IHRoaXMueDEgfHwgeCA+IHRoaXMueDIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBTZXQ7XG5cdFx0fVxuXG5cdFx0aWYoeU1heCA8IHRoaXMueTEgfHwgeSA+IHRoaXMueTIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBTZXQ7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5zcGxpdClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFNldChbXG5cdFx0XHRcdC4uLnRoaXMudWxDZWxsLnNlbGVjdCh4LCB5LCB3LCBoKVxuXHRcdFx0XHQsIC4uLnRoaXMudXJDZWxsLnNlbGVjdCh4LCB5LCB3LCBoKVxuXHRcdFx0XHQsIC4uLnRoaXMuYmxDZWxsLnNlbGVjdCh4LCB5LCB3LCBoKVxuXHRcdFx0XHQsIC4uLnRoaXMuYnJDZWxsLnNlbGVjdCh4LCB5LCB3LCBoKVxuXHRcdFx0XSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuaXRlbXM7XG5cdH1cblxuXHRkdW1wKClcblx0e1xuXHRcdGlmKHRoaXMuc3BsaXQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBTZXQoW1xuXHRcdFx0XHQuLi50aGlzLnVsQ2VsbC5kdW1wKClcblx0XHRcdFx0LCAuLi50aGlzLnVyQ2VsbC5kdW1wKClcblx0XHRcdFx0LCAuLi50aGlzLmJsQ2VsbC5kdW1wKClcblx0XHRcdFx0LCAuLi50aGlzLmJyQ2VsbC5kdW1wKClcblx0XHRcdF0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLml0ZW1zO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgUmVjdGFuZ2xlXG57XG5cdGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyKVxuXHR7XG5cdFx0dGhpcy54MSA9IHgxO1xuXHRcdHRoaXMueTEgPSB5MTtcblx0XHR0aGlzLngyID0geDI7XG5cdFx0dGhpcy55MiA9IHkyO1xuXHR9XG5cblx0Y29udGFpbnMoeCwgeSlcblx0e1xuXHRcdGlmKHggPD0gdGhpcy54MSB8fCB4ID49IHRoaXMueDIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKHkgPD0gdGhpcy55MSB8fCB5ID49IHRoaXMueTIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aXNPdmVybGFwcGluZyhvdGhlcilcblx0e1xuXHRcdGlmKHRoaXMueDEgPj0gb3RoZXIueDIgfHwgdGhpcy54MiA8PSBvdGhlci54MSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy55MSA+PSBvdGhlci55MiB8fCB0aGlzLnkyIDw9IG90aGVyLnkxKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGlzRmx1c2hXaXRoKG90aGVyKVxuXHR7XG5cdFx0aWYodGhpcy54MSA+IG90aGVyLngyIHx8IG90aGVyLngxID4gdGhpcy54Milcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy55MSA+IG90aGVyLnkyIHx8IG90aGVyLnkxID4gdGhpcy55Milcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy54MSA9PT0gb3RoZXIueDIgfHwgb3RoZXIueDEgPT09IHRoaXMueDIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy55MSA9PT0gb3RoZXIueTIgfHwgb3RoZXIueTEgPT09IHRoaXMueTIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHR9XG5cblx0aW50ZXJzZWN0aW9uKG90aGVyKVxuXHR7XG5cdFx0aWYoIXRoaXMuaXNPdmVybGFwcGluZyhvdGhlcikpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHJldHVybiBuZXcgKHRoaXMuY29uc3RydWN0b3IpKFxuXHRcdFx0TWF0aC5tYXgodGhpcy54MSwgb3RoZXIueDEpLCBNYXRoLm1heCh0aGlzLnkxLCBvdGhlci55MSlcblx0XHRcdCwgTWF0aC5taW4odGhpcy54Miwgb3RoZXIueDIpLCBNYXRoLm1pbih0aGlzLnkyLCBvdGhlci55Milcblx0XHQpO1xuXHR9XG5cblx0aXNJbnNpZGUob3RoZXIpXG5cdHtcblx0XHRyZXR1cm4gdGhpcy54MSA+PSBvdGhlci54MVxuXHRcdFx0JiYgdGhpcy55MSA+PSBvdGhlci55MVxuXHRcdFx0JiYgdGhpcy54MiA8PSBvdGhlci54MlxuXHRcdFx0JiYgdGhpcy55MiA8PSBvdGhlci55Mjtcblx0fVxuXG5cdGlzT3V0c2lkZShvdGhlcilcblx0e1xuXHRcdHJldHVybiBvdGhlci5pc0luc2lkZSh0aGlzKTtcblx0fVxuXG5cdHRvVHJpYW5nbGVzKGRpbSA9IDIpXG5cdHtcblx0XHRpZihkaW0gPT09IDIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0dGhpcy54MSwgdGhpcy55MSxcblx0XHRcdFx0dGhpcy54MiwgdGhpcy55MSxcblx0XHRcdFx0dGhpcy54MSwgdGhpcy55Mixcblx0XHRcdFx0dGhpcy54MSwgdGhpcy55Mixcblx0XHRcdFx0dGhpcy54MiwgdGhpcy55MSxcblx0XHRcdFx0dGhpcy54MiwgdGhpcy55Mixcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0aWYoZGltID09PSAzKVxuXHRcdHtcblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdHRoaXMueDEsIHRoaXMueTEsIDEsXG5cdFx0XHRcdHRoaXMueDIsIHRoaXMueTEsIDEsXG5cdFx0XHRcdHRoaXMueDEsIHRoaXMueTIsIDEsXG5cdFx0XHRcdHRoaXMueDEsIHRoaXMueTIsIDEsXG5cdFx0XHRcdHRoaXMueDIsIHRoaXMueTEsIDEsXG5cdFx0XHRcdHRoaXMueDIsIHRoaXMueTIsIDEsXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdGlmKGRpbSA9PT0gNClcblx0XHR7XG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHR0aGlzLngxLCB0aGlzLnkxLCAwLCAxLFxuXHRcdFx0XHR0aGlzLngyLCB0aGlzLnkxLCAwLCAxLFxuXHRcdFx0XHR0aGlzLngxLCB0aGlzLnkyLCAwLCAxLFxuXHRcdFx0XHR0aGlzLngxLCB0aGlzLnkyLCAwLCAxLFxuXHRcdFx0XHR0aGlzLngyLCB0aGlzLnkxLCAwLCAxLFxuXHRcdFx0XHR0aGlzLngyLCB0aGlzLnkyLCAwLCAxLFxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRyZXR1cm4gW1xuXHRcdFx0dGhpcy54MSwgdGhpcy55MSwgLi4uKGRpbSA+IDIgPyBBcnJheSgtMitkaW0pLmZpbGwoMCk6IFtdKSxcblx0XHRcdHRoaXMueDIsIHRoaXMueTEsIC4uLihkaW0gPiAyID8gQXJyYXkoLTIrZGltKS5maWxsKDApOiBbXSksXG5cdFx0XHR0aGlzLngxLCB0aGlzLnkyLCAuLi4oZGltID4gMiA/IEFycmF5KC0yK2RpbSkuZmlsbCgwKTogW10pLFxuXHRcdFx0dGhpcy54MSwgdGhpcy55MiwgLi4uKGRpbSA+IDIgPyBBcnJheSgtMitkaW0pLmZpbGwoMCk6IFtdKSxcblx0XHRcdHRoaXMueDIsIHRoaXMueTEsIC4uLihkaW0gPiAyID8gQXJyYXkoLTIrZGltKS5maWxsKDApOiBbXSksXG5cdFx0XHR0aGlzLngyLCB0aGlzLnkyLCAuLi4oZGltID4gMiA/IEFycmF5KC0yK2RpbSkuZmlsbCgwKTogW10pLFxuXHRcdF07XG5cdH1cbn1cbiIsImNsYXNzIFNlZ21lbnRcbntcblx0Y29uc3RydWN0b3Ioc3RhcnQsIGVuZCwgcHJldiwgZGVwdGggPSAwKVxuXHR7XG5cdFx0dGhpcy5zdGFydCA9IHN0YXJ0O1xuXHRcdHRoaXMuZW5kICAgPSBlbmQ7XG5cdFx0dGhpcy5kZXB0aCA9IGRlcHRoO1xuXHRcdHRoaXMuc2l6ZSAgPSAwO1xuXG5cdFx0dGhpcy5yZWN0YW5nbGVzID0gbmV3IFNldDtcblx0XHR0aGlzLnN1YlRyZWUgPSBkZXB0aCA8IDFcblx0XHRcdD8gbmV3IFNNVHJlZSgxICsgZGVwdGgpXG5cdFx0XHQ6IG51bGw7XG5cblx0XHR0aGlzLnByZXYgID0gcHJldjtcblx0fVxuXG5cdHNwbGl0KGF0KVxuXHR7XG5cdFx0aWYoYXQgPCB0aGlzLnN0YXJ0IHx8IGF0ID4gdGhpcy5lbmQpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1NwbGl0dGluZyBzZWdtZW50IG91dCBvZiBib3VuZHMhJyk7XG5cdFx0fVxuXG5cdFx0aWYoYXQgPT09IHRoaXMuc3RhcnQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFt0aGlzXTtcblx0XHR9XG5cblx0XHRpZihhdCA9PT0gdGhpcy5lbmQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFt0aGlzXTtcblx0XHR9XG5cblx0XHRjb25zdCBhID0gbmV3IFNlZ21lbnQodGhpcy5zdGFydCwgYXQsIHRoaXMucHJldiwgdGhpcy5kZXB0aCk7XG5cdFx0Y29uc3QgYiA9IG5ldyBTZWdtZW50KGF0LCB0aGlzLmVuZCwgYSwgdGhpcy5kZXB0aCk7XG5cblx0XHRmb3IoY29uc3QgcmVjdGFuZ2xlIG9mIHRoaXMucmVjdGFuZ2xlcylcblx0XHR7XG5cdFx0XHRjb25zdCByZWN0TWluID0gdGhpcy5kZXB0aCA9PT0gMCA/IHJlY3RhbmdsZS54MSA6IHJlY3RhbmdsZS55MTtcblx0XHRcdGNvbnN0IHJlY3RNYXggPSB0aGlzLmRlcHRoID09PSAwID8gcmVjdGFuZ2xlLngyIDogcmVjdGFuZ2xlLnkyO1xuXG5cdFx0XHRpZihyZWN0TWF4IDwgYXQpXG5cdFx0XHR7XG5cdFx0XHRcdGEuYWRkKHJlY3RhbmdsZSk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihyZWN0TWluID4gYXQpXG5cdFx0XHR7XG5cdFx0XHRcdGIuYWRkKHJlY3RhbmdsZSk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRhLmFkZChyZWN0YW5nbGUpO1xuXHRcdFx0Yi5hZGQocmVjdGFuZ2xlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gW2EsIGJdO1xuXHR9XG5cblx0YWRkKHJlY3RhbmdsZSlcblx0e1xuXHRcdE9iamVjdC5mcmVlemUocmVjdGFuZ2xlKTtcblxuXHRcdGlmKHRoaXMuc3ViVHJlZSlcblx0XHR7XG5cdFx0XHR0aGlzLnN1YlRyZWUuYWRkKHJlY3RhbmdsZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5yZWN0YW5nbGVzLmFkZChyZWN0YW5nbGUpO1xuXHRcdHRoaXMuc2l6ZSA9IHRoaXMucmVjdGFuZ2xlcy5zaXplO1xuXHR9XG5cblx0ZGVsZXRlKHJlY3RhbmdsZSlcblx0e1xuXHRcdGlmKHRoaXMuc3ViVHJlZSlcblx0XHR7XG5cdFx0XHR0aGlzLnN1YlRyZWUuZGVsZXRlKHJlY3RhbmdsZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5yZWN0YW5nbGVzLmRlbGV0ZShyZWN0YW5nbGUpO1xuXHRcdHRoaXMuc2l6ZSA9IHRoaXMucmVjdGFuZ2xlcy5zaXplO1xuXG5cdFx0Y29uc3QgZW1wdHkgPSAoIXRoaXMucmVjdGFuZ2xlcy5zaXplKSAmJiB0aGlzLnN0YXJ0ID4gLUluZmluaXR5O1xuXG5cdFx0cmV0dXJuIGVtcHR5O1xuXHR9XG59XG5cbmNvbnN0IGlzUmVjdGFuZ2xlID0gKG9iamVjdCkgPT4ge1xuXHRyZXR1cm4gJ3gxJyBpbiBvYmplY3Rcblx0XHQmJiAneTEnIGluIG9iamVjdFxuXHRcdCYmICd4MicgaW4gb2JqZWN0XG5cdFx0JiYgJ3kyJyBpbiBvYmplY3Q7XG59O1xuXG5leHBvcnQgY2xhc3MgU01UcmVlXG57XG5cdGNvbnN0cnVjdG9yKGRlcHRoID0gMClcblx0e1xuXHRcdHRoaXMuZGVwdGggPSBkZXB0aDtcblx0XHR0aGlzLnNlZ21lbnRzID0gW25ldyBTZWdtZW50KC1JbmZpbml0eSwgSW5maW5pdHksIG51bGwsIHRoaXMuZGVwdGgpXTtcblx0fVxuXG5cdGFkZChyZWN0YW5nbGUpXG5cdHtcblx0XHRpZighaXNSZWN0YW5nbGUocmVjdGFuZ2xlKSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ09iamVjdCBzdXBwbGllZCBpcyBub3QgYSBSZWN0YW5nbGUuIE11c3QgaGF2ZSBwcm9wZXJ0aWVzOiB4MSwgeTEsIHgyLCB5MS4nKTtcblx0XHR9XG5cblx0XHRjb25zdCByZWN0TWluID0gdGhpcy5kZXB0aCA9PT0gMCA/IHJlY3RhbmdsZS54MSA6IHJlY3RhbmdsZS55MTtcblx0XHRjb25zdCByZWN0TWF4ID0gdGhpcy5kZXB0aCA9PT0gMCA/IHJlY3RhbmdsZS54MiA6IHJlY3RhbmdsZS55MjtcblxuXHRcdGNvbnN0IHN0YXJ0SW5kZXggPSB0aGlzLmZpbmRTZWdtZW50KHJlY3RNaW4pO1xuXHRcdHRoaXMuc3BsaXRTZWdtZW50KHN0YXJ0SW5kZXgsIHJlY3RNaW4pO1xuXG5cdFx0Y29uc3QgZW5kSW5kZXggPSB0aGlzLmZpbmRTZWdtZW50KHJlY3RNYXgpO1xuXHRcdHRoaXMuc3BsaXRTZWdtZW50KGVuZEluZGV4LCByZWN0TWF4KTtcblxuXHRcdGlmKHN0YXJ0SW5kZXggPT09IGVuZEluZGV4KVxuXHRcdHtcblx0XHRcdHRoaXMuc2VnbWVudHNbc3RhcnRJbmRleF0uYWRkKHJlY3RhbmdsZSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Zm9yKGxldCBpID0gMSArIHN0YXJ0SW5kZXg7IGkgPD0gZW5kSW5kZXg7IGkrKylcblx0XHR7XG5cdFx0XHR0aGlzLnNlZ21lbnRzW2ldLmFkZChyZWN0YW5nbGUpO1xuXHRcdH1cblx0fVxuXG5cdGRlbGV0ZShyZWN0YW5nbGUpXG5cdHtcblx0XHRpZighaXNSZWN0YW5nbGUocmVjdGFuZ2xlKSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ09iamVjdCBzdXBwbGllZCBpcyBub3QgYSBSZWN0YW5nbGUuIE11c3QgaGF2ZSBwcm9wZXJ0aWVzOiB4MSwgeTEsIHgyLCB5MS4nKTtcblx0XHR9XG5cblx0XHRjb25zdCByZWN0TWluID0gdGhpcy5kZXB0aCA9PT0gMCA/IHJlY3RhbmdsZS54MSA6IHJlY3RhbmdsZS55MTtcblx0XHRjb25zdCByZWN0TWF4ID0gdGhpcy5kZXB0aCA9PT0gMCA/IHJlY3RhbmdsZS54MiA6IHJlY3RhbmdsZS55MjtcblxuXHRcdGNvbnN0IHN0YXJ0SW5kZXggPSB0aGlzLmZpbmRTZWdtZW50KHJlY3RNaW4pO1xuXHRcdGNvbnN0IGVuZEluZGV4ID0gdGhpcy5maW5kU2VnbWVudChyZWN0TWF4KTtcblxuXHRcdGNvbnN0IGVtcHR5ID0gW107XG5cblx0XHRmb3IobGV0IGkgPSBzdGFydEluZGV4OyBpIDw9IGVuZEluZGV4OyBpKyspXG5cdFx0e1xuXHRcdFx0aWYodGhpcy5zZWdtZW50c1tpXS5kZWxldGUocmVjdGFuZ2xlKSlcblx0XHRcdHtcblx0XHRcdFx0ZW1wdHkucHVzaChpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmb3IobGV0IGkgPSAtMSArIGVtcHR5Lmxlbmd0aDsgaSA+PSAwOyBpLS0pXG5cdFx0e1xuXHRcdFx0Y29uc3QgZSA9IGVtcHR5W2ldO1xuXG5cdFx0XHRpZighdGhpcy5zZWdtZW50c1stMSArIGVdKVxuXHRcdFx0e1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBkZWxldGUgc2VnbWVudCB3aXRob3V0IHByZWRlY2Vzc29yLicpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VnbWVudHNbLTEgKyBlXS5lbmQgPSB0aGlzLnNlZ21lbnRzW2VdLmVuZDtcblx0XHRcdHRoaXMuc2VnbWVudHNbMSArIGVdLnByZXYgPSB0aGlzLnNlZ21lbnRzWy0xICsgZV07XG5cdFx0XHR0aGlzLnNlZ21lbnRzLnNwbGljZShlLCAxKTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnNlZ21lbnRzLmxlbmd0aCA9PT0gMiAmJiB0aGlzLnNlZ21lbnRzWzBdLnNpemUgPT0gMCAmJiB0aGlzLnNlZ21lbnRzWzFdLnNpemUgPT09IDApXG5cdFx0e1xuXHRcdFx0dGhpcy5zZWdtZW50c1swXS5lbmQgPSB0aGlzLnNlZ21lbnRzWzFdLmVuZDtcblx0XHRcdHRoaXMuc2VnbWVudHMubGVuZ3RoID0gMTtcblx0XHR9XG5cdH1cblxuXHRxdWVyeSh4MSwgeTEsIHgyLCB5Milcblx0e1xuXHRcdGNvbnN0IHJlc3VsdHMgPSBuZXcgU2V0O1xuXG5cdFx0Y29uc3QgeFN0YXJ0SW5kZXggPSB0aGlzLmZpbmRTZWdtZW50KHgxKTtcblx0XHRjb25zdCB4RW5kSW5kZXggPSB0aGlzLmZpbmRTZWdtZW50KHgyKTtcblxuXHRcdGZvcihsZXQgaSA9IHhTdGFydEluZGV4OyBpIDw9IHhFbmRJbmRleDsgaSsrKVxuXHRcdHtcblx0XHRcdGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzW2ldO1xuXG5cdFx0XHRpZighc2VnbWVudC5zdWJUcmVlKVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgeVN0YXJ0SW5kZXggPSBzZWdtZW50LnN1YlRyZWUuZmluZFNlZ21lbnQoeTEpO1xuXHRcdFx0Y29uc3QgeUVuZEluZGV4ID0gc2VnbWVudC5zdWJUcmVlLmZpbmRTZWdtZW50KHkyKTtcblxuXHRcdFx0Zm9yKGxldCBqID0geVN0YXJ0SW5kZXg7IGogPD0geUVuZEluZGV4OyBqKyspXG5cdFx0XHR7XG5cdFx0XHRcdGZvcihjb25zdCByZXN1bHQgb2Ygc2VnbWVudC5zdWJUcmVlLnNlZ21lbnRzW2pdLnJlY3RhbmdsZXMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXN1bHRzLmFkZChyZXN1bHQpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0cztcblx0fVxuXG5cdHNwbGl0U2VnbWVudChpbmRleCwgYXQpXG5cdHtcblx0XHRpZihhdCA8PSB0aGlzLnNlZ21lbnRzW2luZGV4XS5zdGFydCB8fCBhdCA+PSB0aGlzLnNlZ21lbnRzW2luZGV4XS5lbmQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNwbGl0U2VnbWVudHMgPSB0aGlzLnNlZ21lbnRzW2luZGV4XS5zcGxpdChhdCk7XG5cblx0XHR0aGlzLnNlZ21lbnRzLnNwbGljZShpbmRleCwgMSwgLi4uc3BsaXRTZWdtZW50cyk7XG5cdH1cblxuXHRmaW5kU2VnbWVudChhdClcblx0e1xuXHRcdGxldCBsbyA9IDA7XG5cdFx0bGV0IGhpID0gLTEgKyB0aGlzLnNlZ21lbnRzLmxlbmd0aDtcblxuXHRcdGRvXG5cdFx0e1xuXHRcdFx0Y29uc3QgY3VycmVudCA9IE1hdGguZmxvb3IoKGxvICsgaGkpICogMC41KTtcblx0XHRcdGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzW2N1cnJlbnRdO1xuXG5cdFx0XHRpZihzZWdtZW50LnN0YXJ0IDwgYXQgJiYgc2VnbWVudC5lbmQgPj0gYXQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBjdXJyZW50O1xuXHRcdFx0fVxuXG5cdFx0XHRpZihzZWdtZW50LnN0YXJ0IDwgYXQpXG5cdFx0XHR7XG5cdFx0XHRcdGxvID0gMSArIGN1cnJlbnQ7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHNlZ21lbnQuZW5kID4gYXQpXG5cdFx0XHR7XG5cdFx0XHRcdGhpID0gLTEgKyBjdXJyZW50O1xuXHRcdFx0fVxuXHRcdH0gd2hpbGUobG8gPD0gaGkpO1xuXG5cdFx0cmV0dXJuIC0xO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgU3BsaXRcbntcblx0c3RhdGljIGJ5dGVzID0gbmV3IFVpbnQ4Q2xhbXBlZEFycmF5KDQpO1xuXHRzdGF0aWMgd29yZHMgPSBuZXcgVWludDE2QXJyYXkodGhpcy5ieXRlcy5idWZmZXIpO1xuXHRzdGF0aWMgdmFsdWUgPSBuZXcgVWludDMyQXJyYXkodGhpcy5ieXRlcy5idWZmZXIpO1xuXG5cdHN0YXRpYyBpbnRUb0J5dGVzKHZhbHVlKVxuXHR7XG5cdFx0dGhpcy52YWx1ZVswXSA9IHZhbHVlO1xuXG5cdFx0cmV0dXJuIFsuLi50aGlzLmJ5dGVzXTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5cbmV4cG9ydCAgY2xhc3MgQ29udHJvbGxlclxue1xuXHR0cmlnZ2VycyA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh7fSk7XG5cdGF4aXMgICAgID0gQmluZGFibGUubWFrZUJpbmRhYmxlKHt9KTtcblx0XG5cdGNvbnN0cnVjdG9yKHtrZXlib2FyZCwgb25TY3JlZW5Kb3lQYWR9KVxuXHR7XG5cdFx0a2V5Ym9hcmQua2V5cy5iaW5kVG8oKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5rZXlQcmVzcyhrLHYsdFtrXSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYodiA9PT0gLTEpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMua2V5UmVsZWFzZShrLHYsdFtrXSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdH0pO1xuXG5cdFx0b25TY3JlZW5Kb3lQYWQuYXJncy5iaW5kVG8oJ3gnLCAodikgPT4ge1xuXHRcdFx0dGhpcy5heGlzWzBdID0gdiAvIDUwO1xuXHRcdH0pO1xuXG5cdFx0b25TY3JlZW5Kb3lQYWQuYXJncy5iaW5kVG8oJ3knLCAodikgPT4ge1xuXHRcdFx0dGhpcy5heGlzWzFdID0gdiAvIDUwO1xuXHRcdH0pO1xuXHR9XG5cblx0a2V5UHJlc3Moa2V5LCB2YWx1ZSwgcHJldilcblx0e1xuXHRcdGlmKC9eWzAtOV0kLy50ZXN0KGtleSkpXG5cdFx0e1xuXHRcdFx0dGhpcy50cmlnZ2Vyc1trZXldID0gdHJ1ZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzd2l0Y2goa2V5KVxuXHRcdHtcblx0XHRcdGNhc2UgJ0Fycm93UmlnaHQnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAxO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dEb3duJzpcblx0XHRcdFx0dGhpcy5heGlzWzFdID0gMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93TGVmdCc6XG5cdFx0XHRcdHRoaXMuYXhpc1swXSA9IC0xO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dVcCc6XG5cdFx0XHRcdHRoaXMuYXhpc1sxXSA9IC0xO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblxuXHRrZXlSZWxlYXNlKGtleSwgdmFsdWUsIHByZXYpXG5cdHtcblx0XHRpZigvXlswLTldJC8udGVzdChrZXkpKVxuXHRcdHtcblx0XHRcdHRoaXMudHJpZ2dlcnNba2V5XSA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHN3aXRjaChrZXkpXG5cdFx0e1xuXHRcdFx0Y2FzZSAnQXJyb3dSaWdodCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1swXSA+IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuYXhpc1swXSA9IDA7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93TGVmdCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1swXSA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0Rvd24nOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMV0gPiAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzFdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd1VwJzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzFdIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gXCJjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZVwiO1xuaW1wb3J0IHsgUmVjdGFuZ2xlIH0gZnJvbSBcIi4uL21hdGgvUmVjdGFuZ2xlXCI7XG5cbmV4cG9ydCBjbGFzcyBFbnRpdHlcbntcblx0Y29uc3RydWN0b3Ioe2NvbnRyb2xsZXIsIHNwcml0ZSwgeCA9IDAsIHkgPSAwLCB3aWR0aCA9IDMyLCBoZWlnaHQgPSAzMn0pXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblxuXHRcdHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG5cdFx0dGhpcy5zcHJpdGUgPSBzcHJpdGU7XG5cblx0XHR0aGlzLnggPSB4O1xuXHRcdHRoaXMueSA9IHk7XG5cblx0XHR0aGlzLndpZHRoICA9IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0dGhpcy5yZWN0ID0gbmV3IFJlY3RhbmdsZShcblx0XHRcdHggLSB3aWR0aCAqIDAuNSwgeSAtIGhlaWdodCxcblx0XHRcdHggKyB3aWR0aCAqIDAuNSwgeVxuXHRcdCk7XG5cdH1cblxuXHRjcmVhdGUoKVxuXHR7fVxuXG5cdHNpbXVsYXRlKClcblx0e1xuXHRcdHRoaXMucmVjdC54MSA9IHRoaXMueCAtIHRoaXMud2lkdGggKiAwLjU7XG5cdFx0dGhpcy5yZWN0LngyID0gdGhpcy54ICsgdGhpcy53aWR0aCAqIDAuNTtcblxuXHRcdHRoaXMucmVjdC55MSA9IHRoaXMueSAtIHRoaXMuaGVpZ2h0O1xuXHRcdHRoaXMucmVjdC55MiA9IHRoaXMueTtcblxuXHRcdHRoaXMuc3ByaXRlLnggPSB0aGlzLng7XG5cdFx0dGhpcy5zcHJpdGUueSA9IHRoaXMueTtcblx0fVxuXG5cdGRlc3Ryb3koKVxuXHR7fVxufVxuIiwiaW1wb3J0IHsgRW50aXR5IH0gZnJvbSBcIi4vRW50aXR5XCI7XG5cbmNvbnN0IGZpcmVSZWdpb24gID0gWzEsIDAsIDBdO1xuY29uc3Qgd2F0ZXJSZWdpb24gPSBbMCwgMSwgMV07XG5cbmV4cG9ydCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBFbnRpdHlcbntcblx0Y29uc3RydWN0b3IoZW50aXR5RGF0YSlcblx0e1xuXHRcdHN1cGVyKGVudGl0eURhdGEpO1xuXG5cdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdHRoaXMuc3RhdGUgPSAnc3RhbmRpbmcnO1xuXHR9XG5cblx0c2ltdWxhdGUoKVxuXHR7XG5cdFx0Y29uc3Qgc3BlZWQgPSA0O1xuXG5cdFx0Y29uc3QgeEF4aXMgPSBNYXRoLm1pbigxLCBNYXRoLm1heCh0aGlzLmNvbnRyb2xsZXIuYXhpc1swXSB8fCAwLCAtMSkpIHx8IDA7XG5cdFx0Y29uc3QgeUF4aXMgPSBNYXRoLm1pbigxLCBNYXRoLm1heCh0aGlzLmNvbnRyb2xsZXIuYXhpc1sxXSB8fCAwLCAtMSkpIHx8IDA7XG5cblx0XHR0aGlzLnggKz0gTWF0aC5hYnMoeEF4aXMpICogTWF0aC5zaWduKHhBeGlzKSAqIHNwZWVkO1xuXHRcdHRoaXMueSArPSBNYXRoLmFicyh5QXhpcykgKiBNYXRoLnNpZ24oeUF4aXMpICogc3BlZWQ7XG5cblx0XHRsZXQgaG9yaXpvbnRhbCA9IGZhbHNlO1xuXG5cdFx0aWYoTWF0aC5hYnMoeEF4aXMpID4gTWF0aC5hYnMoeUF4aXMpKVxuXHRcdHtcblx0XHRcdGhvcml6b250YWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmKGhvcml6b250YWwpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnd2VzdCc7XG5cblx0XHRcdGlmKHhBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnZWFzdCc7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc3RhdGUgPSAnd2Fsa2luZyc7XG5cblx0XHR9XG5cdFx0ZWxzZSBpZih5QXhpcylcblx0XHR7XG5cdFx0XHR0aGlzLmRpcmVjdGlvbiA9ICdub3J0aCc7XG5cblx0XHRcdGlmKHlBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXRlID0gJ3dhbGtpbmcnO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5zdGF0ZSA9ICdzdGFuZGluZyc7XG5cdFx0fVxuXG5cdFx0dGhpcy5zcHJpdGUuY2hhbmdlQW5pbWF0aW9uKGAke3RoaXMuc3RhdGV9LSR7dGhpcy5kaXJlY3Rpb259YCk7XG5cblx0XHRpZihNYXRoLnRydW5jKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkgJSAxNSA9PT0gMClcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5yZWdpb24gPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmKE1hdGgudHJ1bmMocGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKSAlIDE1ID09PSA1KVxuXHRcdHtcblx0XHRcdHRoaXMuc3ByaXRlLnJlZ2lvbiA9IHdhdGVyUmVnaW9uO1xuXHRcdH1cblxuXHRcdGlmKE1hdGgudHJ1bmMocGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKSAlIDE1ID09PSAxMClcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5yZWdpb24gPSBmaXJlUmVnaW9uO1xuXHRcdH1cblxuXHRcdGZvcihsZXQgdCBpbiB0aGlzLmNvbnRyb2xsZXIudHJpZ2dlcnMpXG5cdFx0e1xuXHRcdFx0aWYoIXRoaXMuY29udHJvbGxlci50cmlnZ2Vyc1t0XSlcblx0XHRcdHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc3ByaXRlLnNwcml0ZUJvYXJkLnJlbmRlck1vZGUgPSB0O1xuXG5cdFx0XHRpZih0ID09PSAnOScpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG1hcHMgPSB0aGlzLnNwcml0ZS5zcHJpdGVCb2FyZC53b3JsZC5nZXRNYXBzRm9yUG9pbnQoXG5cdFx0XHRcdFx0dGhpcy5zcHJpdGUueCwgdGhpcy5zcHJpdGUueSxcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRtYXBzLmZvckVhY2gobSA9PiBjb25zb2xlLmxvZyhtLnNyYykpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHN1cGVyLnNpbXVsYXRlKCk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEVudGl0eSB9IGZyb20gXCIuL0VudGl0eVwiO1xuXG5jb25zdCBmaXJlUmVnaW9uID0gWzEsIDAsIDBdO1xuY29uc3Qgd2F0ZXJSZWdpb24gPSBbMCwgMSwgMV07XG5cbmV4cG9ydCBjbGFzcyBQdXNoYWJsZSBleHRlbmRzIEVudGl0eVxue1xuXHRzaW11bGF0ZSgpXG5cdHtcblx0XHRzdXBlci5zaW11bGF0ZSgpO1xuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudW5pZm9ybSB2ZWM0IHVfY29sb3I7XFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKCkge1xcbiAgLy8gZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHZfdGV4Q29vcmQpO1xcbiAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgxLjAsIDEuMCwgMC4wLCAwLjI1KTtcXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKClcXG57XFxuICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247XFxuICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDtcXG4gIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTtcXG4gIHZfdGV4Q29vcmQgID0gYV90ZXhDb29yZDtcXG59XFxuXCIiLCJpbXBvcnQgeyBCYWcgfSBmcm9tIFwiY3VydmF0dXJlL2Jhc2UvQmFnXCI7XG5cbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4uL3Nwcml0ZS9DYW1lcmEnO1xuXG5pbXBvcnQgeyBDb250cm9sbGVyIH0gZnJvbSAnLi4vbW9kZWwvQ29udHJvbGxlcic7XG5pbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlJztcblxuaW1wb3J0IHsgUXVhZHRyZWUgfSBmcm9tICcuLi9tYXRoL1F1YWR0cmVlJztcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZVNoZWV0JztcblxuaW1wb3J0IHsgUGxheWVyIH0gZnJvbSAnLi4vbW9kZWwvUGxheWVyJztcbmltcG9ydCB7IFB1c2hhYmxlIH0gZnJvbSAnLi4vbW9kZWwvUHVzaGFibGUnO1xuXG5leHBvcnQgY2xhc3MgU2Vzc2lvblxue1xuXHRjb25zdHJ1Y3Rvcih7c3ByaXRlQm9hcmQsIGtleWJvYXJkLCBvblNjcmVlbkpveVBhZH0pXG5cdHtcblx0XHR0aGlzLmZUaGVuID0gMDtcblx0XHR0aGlzLnNUaGVuID0gMDtcblxuXHRcdHRoaXMuZnJhbWVMb2NrID0gNjA7XG5cdFx0dGhpcy5zaW11bGF0aW9uTG9jayA9IDYwO1xuXG5cdFx0dGhpcy5lbnRpdGllcyAgPSBuZXcgQmFnO1xuXHRcdHRoaXMucXVhZFRyZWUgPSBuZXcgUXVhZHRyZWUoMCwgMCwgMTAwMDAsIDEwMDAwKTtcblxuXHRcdHRoaXMua2V5Ym9hcmQgPSBrZXlib2FyZDtcblxuXHRcdGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyID0gbmV3IFBsYXllcih7XG5cdFx0XHR4OiA0OCxcblx0XHRcdHk6IDY0LFxuXHRcdFx0c3ByaXRlOiBuZXcgU3ByaXRlKHtcblx0XHRcdFx0Ly8gc3JjOiB1bmRlZmluZWQsXG5cdFx0XHRcdHNwcml0ZVNldDogbmV3IFNwcml0ZVNoZWV0KHtzb3VyY2U6ICcuL3BsYXllci50c2onfSksXG5cdFx0XHRcdHNwcml0ZUJvYXJkOiBzcHJpdGVCb2FyZCxcblx0XHRcdFx0d2lkdGg6IDMyLFxuXHRcdFx0XHRoZWlnaHQ6IDQ4LFxuXHRcdFx0fSksXG5cdFx0XHRjb250cm9sbGVyOiBuZXcgQ29udHJvbGxlcih7a2V5Ym9hcmQsIG9uU2NyZWVuSm95UGFkfSksXG5cdFx0XHRjYW1lcmE6IENhbWVyYSxcblx0XHR9KTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQgPSBzcHJpdGVCb2FyZDtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nID0gcGxheWVyO1xuXG5cdFx0dGhpcy5lbnRpdGllcy5hZGQocGxheWVyKTtcblx0XHR0aGlzLnF1YWRUcmVlLmFkZChwbGF5ZXIpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuc3ByaXRlcy5hZGQocGxheWVyLnNwcml0ZSk7XG5cblx0XHRjb25zdCB3ID0gMTI4MDtcblx0XHRmb3IoY29uc3QgaSBpbiBBcnJheSgyKS5maWxsKCkpXG5cdFx0e1xuXHRcdFx0Y29uc3QgYmFycmVsID0gbmV3IFB1c2hhYmxlKHtcblx0XHRcdFx0c3ByaXRlOiBuZXcgU3ByaXRlKHtcblx0XHRcdFx0XHRzcHJpdGVCb2FyZDogdGhpcy5zcHJpdGVCb2FyZCxcblx0XHRcdFx0XHRzcmM6ICcuL2JhcnJlbC5wbmcnLFxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblxuXHRcdFx0YmFycmVsLnggPSAzMiArIChpICogNjQpICUgdyAtIDE2O1xuXHRcdFx0YmFycmVsLnkgPSBNYXRoLnRydW5jKChpICogMzIpIC8gdykgKiAzMiArIDMyO1xuXG5cdFx0XHR0aGlzLmVudGl0aWVzLmFkZChiYXJyZWwpO1xuXHRcdFx0dGhpcy5xdWFkVHJlZS5hZGQoYmFycmVsKTtcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuc3ByaXRlcy5hZGQoYmFycmVsLnNwcml0ZSk7XG5cdFx0fVxuXHR9XG5cblx0c2ltdWxhdGUobm93KVxuXHR7XG5cdFx0Y29uc3QgZGVsdGEgPSBub3cgLSB0aGlzLnNUaGVuO1xuXG5cdFx0aWYodGhpcy5zaW11bGF0aW9uTG9jayA9PSAwKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZihkZWx0YSA8ICgxMDAwIC8gdGhpcy5zaW11bGF0aW9uTG9jaykpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHRoaXMuc1RoZW4gPSBub3c7XG5cblx0XHR0aGlzLmtleWJvYXJkLnVwZGF0ZSgpO1xuXG5cdFx0Y29uc3QgcGxheWVyID0gdGhpcy5wbGF5ZXI7XG5cblx0XHRPYmplY3QudmFsdWVzKHRoaXMuZW50aXRpZXMuaXRlbXMoKSkuZm9yRWFjaChlbnRpdHkgPT4ge1xuXHRcdFx0ZW50aXR5LnNpbXVsYXRlKGRlbHRhKTtcblx0XHRcdHRoaXMucXVhZFRyZWUubW92ZShlbnRpdHkpO1xuXHRcdFx0ZW50aXR5LnNwcml0ZS52aXNpYmxlID0gZmFsc2U7XG5cdFx0fSk7XG5cblx0XHRjb25zdCBuZWFyQnkgPSB0aGlzLnF1YWRUcmVlLnNlbGVjdChwbGF5ZXIueCAtIDUwLCBwbGF5ZXIueSAtIDUwLCBwbGF5ZXIueCArIDUwLCBwbGF5ZXIueSArIDUwKTtcblxuXHRcdG5lYXJCeS5mb3JFYWNoKGUgPT4gZS5zcHJpdGUudmlzaWJsZSA9IHRydWUpO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRkcmF3KG5vdylcblx0e1xuXHRcdGNvbnN0IGRlbHRhID0gbm93IC0gdGhpcy5mVGhlbjtcblxuXHRcdGlmKHRoaXMuZnJhbWVMb2NrID09IDApXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKDAuMiArIGRlbHRhIDwgKDEwMDAgLyB0aGlzLmZyYW1lTG9jaykpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhdyhkZWx0YSk7XG5cdFx0dGhpcy5mVGhlbiA9IG5vdztcblxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQ2FtZXJhXG57XG5cdHN0YXRpYyB4ID0gMDtcblx0c3RhdGljIHkgPSAwO1xuXHRzdGF0aWMgd2lkdGggID0gMDtcblx0c3RhdGljIGhlaWdodCA9IDA7XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcblxuZXhwb3J0IGNsYXNzIE1hcFJlbmRlcmVyXG57XG5cdGNvbnN0cnVjdG9yKHtzcHJpdGVCb2FyZCwgbWFwfSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQgPSBzcHJpdGVCb2FyZDtcblxuXHRcdHRoaXMubG9hZGVkID0gZmFsc2U7XG5cblx0XHR0aGlzLm1hcCA9IG1hcDtcblx0XHR0aGlzLndpZHRoICA9IDA7XG5cdFx0dGhpcy5oZWlnaHQgPSAwO1xuXG5cdFx0dGhpcy50aWxlV2lkdGggID0gMDtcblx0XHR0aGlzLnRpbGVIZWlnaHQgPSAwO1xuXG5cdFx0dGhpcy54T2Zmc2V0ID0gMDtcblx0XHR0aGlzLnlPZmZzZXQgPSAwO1xuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdHRoaXMudGlsZU1hcHBpbmcgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY3JlYXRlVGV4dHVyZSgxLCAxKTtcblx0XHR0aGlzLnRpbGVUZXh0dXJlID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNyZWF0ZVRleHR1cmUoMSwgMSk7XG5cblx0XHRjb25zdCByID0gKCkgPT4gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkYpO1xuXHRcdGNvbnN0IHBpeGVsID0gbmV3IFVpbnQ4QXJyYXkoW3IoKSwgcigpLCByKCksIDB4RkZdKTtcblxuXHRcdG1hcC5yZWFkeS50aGVuKCgpID0+IHtcblx0XHRcdHRoaXMubG9hZGVkID0gdHJ1ZTtcblx0XHRcdHRoaXMudGlsZVdpZHRoICA9IG1hcC50aWxlV2lkdGg7XG5cdFx0XHR0aGlzLnRpbGVIZWlnaHQgPSBtYXAudGlsZUhlaWdodDtcblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGlsZVRleHR1cmUpO1xuXHRcdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgbWFwLnRpbGVTZXRXaWR0aFxuXHRcdFx0XHQsIG1hcC50aWxlU2V0SGVpZ2h0XG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHRcdCwgbWFwLnBpeGVsc1xuXHRcdFx0KTtcblx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXG5cdFx0fSk7XG5cdH1cblxuXHRuZWdTYWZlTW9kKGEsYilcblx0e1xuXHRcdGlmKGEgPj0gMCkgcmV0dXJuIGEgJSBiO1xuXHRcdHJldHVybiAoYiArIGEgJSBiKSAlIGI7XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdGlmKCF0aGlzLmxvYWRlZClcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGNvbnN0IHggPSB0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZy5zcHJpdGUueDtcblx0XHRjb25zdCB5ID0gdGhpcy5zcHJpdGVCb2FyZC5mb2xsb3dpbmcuc3ByaXRlLnk7XG5cblx0XHRjb25zdCB6b29tID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblxuXHRcdGNvbnN0IGhhbGZUaWxlV2lkdGggID0gdGhpcy50aWxlV2lkdGggICogMC41O1xuXHRcdGNvbnN0IGhhbGZUaWxlSGVpZ2h0ID0gdGhpcy50aWxlSGVpZ2h0ICogMC41O1xuXG5cdFx0Y29uc3QgdGlsZXNXaWRlID0gTWF0aC5mbG9vcih0aGlzLndpZHRoIC8gdGhpcy50aWxlV2lkdGgpO1xuXHRcdGNvbnN0IHRpbGVzSGlnaCA9IE1hdGguZmxvb3IodGhpcy5oZWlnaHQgLyB0aGlzLnRpbGVIZWlnaHQpO1xuXG5cdFx0Y29uc3QgeE9mZnNldCA9IE1hdGguZmxvb3IoTWF0aC5mbG9vcigoMC41ICogdGhpcy53aWR0aCkgIC8gNjQpICsgMCkgKiA2NDtcblx0XHRjb25zdCB5T2Zmc2V0ID0gTWF0aC5mbG9vcihNYXRoLmZsb29yKCgwLjUgKiB0aGlzLmhlaWdodCkgLyA2NCkgKyAwKSAqIDY0O1xuXG5cdFx0Y29uc3QgeFRpbGUgPSAoeCtoYWxmVGlsZVdpZHRoKS90aGlzLnRpbGVXaWR0aFxuXHRcdFx0KyAtdGhpcy5uZWdTYWZlTW9kKCB4ICsgaGFsZlRpbGVXaWR0aCwgNjQgKSAvIHRoaXMudGlsZVdpZHRoXG5cdFx0XHQrIC10aGlzLm1hcC54V29ybGQgLyB0aGlzLnRpbGVXaWR0aFxuXHRcdFx0KyAteE9mZnNldCAvIHRoaXMudGlsZVdpZHRoO1xuXG5cdFx0Y29uc3QgeVRpbGUgPSAoeStoYWxmVGlsZUhlaWdodCkvdGhpcy50aWxlSGVpZ2h0XG5cdFx0XHQrIC10aGlzLm5lZ1NhZmVNb2QoIHkgKyBoYWxmVGlsZUhlaWdodCwgNjQgKSAvIHRoaXMudGlsZUhlaWdodFxuXHRcdFx0KyAtdGhpcy5tYXAueVdvcmxkIC8gdGhpcy50aWxlSGVpZ2h0XG5cdFx0XHQrIC15T2Zmc2V0IC8gdGhpcy50aWxlSGVpZ2h0O1xuXG5cdFx0aWYoeFRpbGUgKyB0aWxlc1dpZGUgPCAwIHx8IHlUaWxlICsgdGlsZXNIaWdoIDwgMClcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgeFBvcyA9IHpvb20gKiAoXG5cdFx0XHQodGhpcy53aWR0aCArIHRoaXMueE9mZnNldCkgKiAwLjVcblx0XHRcdCsgLXRoaXMubmVnU2FmZU1vZCggeCArIGhhbGZUaWxlV2lkdGgsIDY0IClcblx0XHRcdCsgLXhPZmZzZXRcblx0XHQpO1xuXG5cdFx0Y29uc3QgeVBvcyA9IHpvb20gKiAoXG5cdFx0XHQodGhpcy5oZWlnaHQgKyB0aGlzLnlPZmZzZXQpICogMC41XG5cdFx0XHQrIC10aGlzLm5lZ1NhZmVNb2QoIHkgKyBoYWxmVGlsZUhlaWdodCwgNjQgKVxuXHRcdFx0KyAteU9mZnNldFxuXHRcdCk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3NpemUnLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV90aWxlU2l6ZScsIHRoaXMudGlsZVdpZHRoLCB0aGlzLnRpbGVIZWlnaHQpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfbWFwVGV4dHVyZVNpemUnLCB0aGlzLm1hcC50aWxlU2V0V2lkdGgsIHRoaXMubWFwLnRpbGVTZXRIZWlnaHQpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfcmVuZGVyVGlsZXMnLCAxKTtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTIpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGlsZVRleHR1cmUpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfdGlsZXMnLCAyKTtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTMpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGlsZU1hcHBpbmcpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfdGlsZU1hcHBpbmcnLCAzKTtcblxuXHRcdGNvbnN0IHRpbGVQaXhlbExheWVycyA9IHRoaXMubWFwLmdldFNsaWNlKHhUaWxlLCB5VGlsZSwgdGlsZXNXaWRlLCB0aWxlc0hpZ2gsIHBlcmZvcm1hbmNlLm5vdygpLzEwMDApO1xuXG5cdFx0Zm9yKGNvbnN0IHRpbGVQaXhlbHMgb2YgdGlsZVBpeGVsTGF5ZXJzKVxuXHRcdHtcblx0XHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIHRpbGVzV2lkZVxuXHRcdFx0XHQsIHRpbGVzSGlnaFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0XHQsIHRpbGVQaXhlbHNcblx0XHRcdCk7XG5cblx0XHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0XHR4UG9zICsgdGhpcy50aWxlV2lkdGggKiAwLjUgKiB6b29tXG5cdFx0XHRcdCwgeVBvcyArIHRoaXMudGlsZUhlaWdodCAqIHpvb21cblx0XHRcdFx0LCB0aGlzLndpZHRoICogem9vbVxuXHRcdFx0XHQsIHRoaXMuaGVpZ2h0ICogem9vbVxuXHRcdFx0KTtcblxuXHRcdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmRyYXdCdWZmZXIpO1xuXHRcdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHRcdH1cblxuXHRcdC8vIENsZWFudXAuLi5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X3JlbmRlclRpbGVzJywgMCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMik7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUzKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblxuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG5cdH1cblxuXHRyZXNpemUoeCwgeSlcblx0e1xuXHRcdHRoaXMud2lkdGggPSAgeCArIDA7XG5cdFx0dGhpcy5oZWlnaHQgPSB5ICsgMDtcblxuXHRcdHRoaXMud2lkdGggPSAgTWF0aC5jZWlsKHggLyAxMjgpICogMTI4ICsgMTI4O1xuXHRcdHRoaXMuaGVpZ2h0ID0gTWF0aC5jZWlsKHkgLyAxMjgpICogMTI4ICsgMTI4O1xuXG5cdFx0dGhpcy54T2Zmc2V0ID0geCAtIHRoaXMud2lkdGg7XG5cdFx0dGhpcy55T2Zmc2V0ID0geSAtIHRoaXMuaGVpZ2h0O1xuXHR9XG5cblx0c2ltdWxhdGUoKVxuXHR7fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLmJ1ZmZlcnMuYV90ZXhDb29yZCk7XG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0MC4wLCAwLjAsXG5cdFx0XHQxLjAsIDAuMCxcblx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0MC4wLCAxLjAsXG5cdFx0XHQxLjAsIDAuMCxcblx0XHRcdDEuMCwgMS4wLFxuXHRcdF0pLCBnbC5TVEFUSUNfRFJBVyk7XG5cblx0XHRjb25zdCB4MSA9IHg7XG5cdFx0Y29uc3QgeDIgPSB4ICsgd2lkdGg7XG5cdFx0Y29uc3QgeTEgPSB5O1xuXHRcdGNvbnN0IHkyID0geSArIGhlaWdodDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLmJ1ZmZlcnMuYV9wb3NpdGlvbik7XG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDIsIHkyLFxuXHRcdFx0eDEsIHkxLFxuXHRcdFx0eDEsIHkxLFxuXHRcdFx0eDIsIHkyLFxuXHRcdFx0eDIsIHkxLFxuXHRcdF0pLCBnbC5TVEFUSUNfRFJBVyk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSAnLi9DYW1lcmEnO1xuXG5jbGFzcyBQYXJhbGxheExheWVyXG57XG5cdHRleHR1cmUgPSBudWxsO1xuXHR3aWR0aCA9IDA7XG5cdGhlaWdodCA9IDA7XG5cdG9mZnNldCA9IDA7XG5cdHBhcmFsbGF4ID0gMDtcbn1cblxuZXhwb3J0IGNsYXNzIFBhcmFsbGF4XG57XG5cdGNvbnN0cnVjdG9yKHtzcHJpdGVCb2FyZCwgbWFwfSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQgPSBzcHJpdGVCb2FyZDtcblxuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHR0aGlzLm1hcCA9IG1hcDtcblx0XHR0aGlzLnRleHR1cmUgPSBudWxsO1xuXG5cdFx0dGhpcy5oZWlnaHQgPSAwO1xuXG5cdFx0dGhpcy5zbGljZXMgPSBbXG5cdFx0XHQncGFyYWxsYXgvbW91bnRhaW5zLTAucG5nJ1xuXHRcdFx0LCAncGFyYWxsYXgvc2t5LTAtcmVjb2xvci5wbmcnXG5cdFx0XHQsICdwYXJhbGxheC9za3ktMS1yZWNvbG9yLnBuZydcblx0XHRcdCwgJ3BhcmFsbGF4L3NreS0xYi1yZWNvbG9yLnBuZydcblx0XHRcdCwgJ3BhcmFsbGF4L3NreS0yLXJlY29sb3IucG5nJ1xuXHRcdF07XG5cblx0XHR0aGlzLnBhcmFsbGF4TGF5ZXJzID0gW107XG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtdO1xuXG5cdFx0bWFwLnJlYWR5LnRoZW4oKCkgPT4gdGhpcy5hc3NlbWJsZShtYXApKS50aGVuKCgpID0+IHtcblx0XHRcdHRoaXMubG9hZGVkID0gdHJ1ZTtcblx0XHR9KTtcblxuXHRcdHRoaXMubG9hZGVkID0gZmFsc2U7XG5cblx0XHR0aGlzLnggPSAwO1xuXHRcdHRoaXMueSA9IDA7XG5cdH1cblxuXHRhc3NlbWJsZSgpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Y29uc3QgbG9hZFNsaWNlcyA9IHRoaXMubWFwLmltYWdlTGF5ZXJzLm1hcChcblx0XHRcdChsYXllckRhdGEsIGluZGV4KSA9PiB0aGlzLmNvbnN0cnVjdG9yLmxvYWRJbWFnZShsYXllckRhdGEuaW1hZ2UpLnRoZW4oaW1hZ2UgPT4ge1xuXHRcdFx0XHRjb25zdCB0ZXh0dXJlID0gdGhpcy50ZXh0dXJlc1tpbmRleF0gPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cdFx0XHRcdGNvbnN0IGxheWVyID0gdGhpcy5wYXJhbGxheExheWVyc1tpbmRleF0gPSBuZXcgUGFyYWxsYXhMYXllcjtcblxuXHRcdFx0XHRjb25zdCBsYXllckJvdHRvbSA9IGltYWdlLmhlaWdodCArIGxheWVyRGF0YS5vZmZzZXR5O1xuXG5cdFx0XHRcdGlmKHRoaXMuaGVpZ2h0IDwgbGF5ZXJCb3R0b20pXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmhlaWdodCA9IGxheWVyQm90dG9tO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGF5ZXIudGV4dHVyZSA9IHRleHR1cmU7XG5cdFx0XHRcdGxheWVyLndpZHRoID0gaW1hZ2Uud2lkdGg7XG5cdFx0XHRcdGxheWVyLmhlaWdodCA9IGltYWdlLmhlaWdodDtcblx0XHRcdFx0bGF5ZXIub2Zmc2V0ID0gbGF5ZXJEYXRhLm9mZnNldHkgPz8gMDtcblx0XHRcdFx0bGF5ZXIucGFyYWxsYXggPSBsYXllckRhdGEucGFyYWxsYXh4ID8/IDE7XG5cblx0XHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cblx0XHRcdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHRcdFx0LCAwXG5cdFx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHRcdFx0LCBpbWFnZVxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLlJFUEVBVCk7XG5cdFx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXG5cdFx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdFx0fVxuXHRcdCkpO1xuXG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKGxvYWRTbGljZXMpO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHRpZighdGhpcy5sb2FkZWQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cdFx0Y29uc3Qgem9vbSA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHR0aGlzLnggPSB0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZy5zcHJpdGUueCArIC10aGlzLnNwcml0ZUJvYXJkLndpZHRoIC8gem9vbSAqIDAuNTtcblx0XHR0aGlzLnkgPSB0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZy5zcHJpdGUueTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfcmVuZGVyUGFyYWxsYXgnLCAxKTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3Njcm9sbCcsIHRoaXMueCwgdGhpcy55KTtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApO1xuXG5cdFx0Zm9yKGNvbnN0IGxheWVyIG9mIHRoaXMucGFyYWxsYXhMYXllcnMpXG5cdFx0e1xuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbGF5ZXIudGV4dHVyZSk7XG5cblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3Vfc2l6ZScsIGxheWVyLndpZHRoLCBsYXllci53aWR0aCk7XG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3BhcmFsbGF4JywgbGF5ZXIucGFyYWxsYXgsIDApO1xuXG5cdFx0XHR0aGlzLnNldFJlY3RhbmdsZShcblx0XHRcdFx0MFxuXHRcdFx0XHQsIHRoaXMuc3ByaXRlQm9hcmQuaGVpZ2h0ICsgKC10aGlzLmhlaWdodCArIGxheWVyLm9mZnNldCkgKiB6b29tXG5cdFx0XHRcdCwgbGF5ZXIud2lkdGggKiB6b29tXG5cdFx0XHRcdCwgbGF5ZXIuaGVpZ2h0ICogem9vbVxuXHRcdFx0XHQsIGxheWVyLndpZHRoXG5cdFx0XHQpO1xuXG5cdFx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd0J1ZmZlcik7XG5cdFx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cdFx0fVxuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtSSgndV9yZW5kZXJQYXJhbGxheCcsIDApO1xuXG5cdFx0Ly8gQ2xlYW51cC4uLlxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG5cdH1cblxuXHRzdGF0aWMgbG9hZEltYWdlKHNyYylcblx0e1xuXHRcdGlmKCF0aGlzLmltYWdlUHJvbWlzZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5pbWFnZVByb21pc2VzID0ge307XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5pbWFnZVByb21pc2VzW3NyY10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdO1xuXHRcdH1cblxuXHRcdHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdID0gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KT0+e1xuXHRcdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdGltYWdlLnNyYyAgID0gc3JjO1xuXHRcdFx0aW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldmVudCk9Pntcblx0XHRcdFx0YWNjZXB0KGltYWdlKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdO1xuXHR9XG5cblx0c2V0UmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Y29uc3QgcmF0aW8gPSB0aGlzLnNwcml0ZUJvYXJkLndpZHRoIC8gd2lkdGg7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfdGV4Q29vcmQpO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdDAuMCwgMC4wLFxuXHRcdFx0cmF0aW8sIDAuMCxcblx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0MC4wLCAxLjAsXG5cdFx0XHRyYXRpbywgMC4wLFxuXHRcdFx0cmF0aW8sIDEuMCxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cdFx0Y29uc3QgeDEgPSB4IC0gMDtcblx0XHRjb25zdCB4MiA9IHggKyB0aGlzLnNwcml0ZUJvYXJkLndpZHRoO1xuXHRcdGNvbnN0IHkxID0geTtcblx0XHRjb25zdCB5MiA9IHkgKyBoZWlnaHQ7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfcG9zaXRpb24pO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgyLCB5Mixcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgyLCB5Mixcblx0XHRcdHgyLCB5MSxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gXCJjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZVwiO1xuaW1wb3J0IHsgQ2FtZXJhIH0gZnJvbSBcIi4vQ2FtZXJhXCI7XG5pbXBvcnQgeyBTcGxpdCB9IGZyb20gXCIuLi9tYXRoL1NwbGl0XCI7XG5pbXBvcnQgeyBNYXRyaXggfSBmcm9tIFwiLi4vbWF0aC9NYXRyaXhcIjtcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSBcIi4vU3ByaXRlU2hlZXRcIjtcblxuZXhwb3J0IGNsYXNzIFNwcml0ZVxue1xuXHRjb25zdHJ1Y3Rvcih7c3JjLCBzcHJpdGVCb2FyZCwgc3ByaXRlU2V0LCB3aWR0aCwgaGVpZ2h0LCB4LCB5LCB6fSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXG5cdFx0dGhpcy54ID0geCB8fCAwO1xuXHRcdHRoaXMueSA9IHkgfHwgMDtcblx0XHR0aGlzLnogPSB6IHx8IDA7XG5cblx0XHR0aGlzLmN1cnJlbnRBbmltYXRpb24gPSBudWxsO1xuXG5cdFx0dGhpcy53aWR0aCAgPSAzMiB8fCB3aWR0aDtcblx0XHR0aGlzLmhlaWdodCA9IDMyIHx8IGhlaWdodDtcblx0XHR0aGlzLnNjYWxlICA9IDE7XG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cblx0XHR0aGlzLnRleHR1cmVzID0gW107XG5cblx0XHR0aGlzLmZyYW1lcyA9IFtdO1xuXHRcdHRoaXMuY3VycmVudERlbGF5ID0gMDtcblx0XHR0aGlzLmN1cnJlbnRGcmFtZSA9IDA7XG5cdFx0dGhpcy5jdXJyZW50RnJhbWVzID0gJyc7XG5cblx0XHR0aGlzLnNwZWVkICAgID0gMDtcblx0XHR0aGlzLm1heFNwZWVkID0gNDtcblxuXHRcdHRoaXMubW92aW5nID0gZmFsc2U7XG5cblx0XHR0aGlzLlJJR0hUXHQ9IDA7XG5cdFx0dGhpcy5ET1dOXHQ9IDE7XG5cdFx0dGhpcy5MRUZUXHQ9IDI7XG5cdFx0dGhpcy5VUFx0XHQ9IDM7XG5cblx0XHR0aGlzLkVBU1RcdD0gdGhpcy5SSUdIVDtcblx0XHR0aGlzLlNPVVRIXHQ9IHRoaXMuRE9XTjtcblx0XHR0aGlzLldFU1RcdD0gdGhpcy5MRUZUO1xuXHRcdHRoaXMuTk9SVEhcdD0gdGhpcy5VUDtcblxuXHRcdHRoaXMucmVnaW9uID0gWzAsIDAsIDAsIDFdO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdHRoaXMudGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLnRleHR1cmUpO1xuXG5cdFx0Y29uc3QgciA9ICgpID0+IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAyNTUpO1xuXHRcdGNvbnN0IHBpeGVsID0gbmV3IFVpbnQ4QXJyYXkoW3IoKSwgcigpLCByKCksIDI1NV0pO1xuXG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIDFcblx0XHRcdCwgMVxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBwaXhlbFxuXHRcdCk7XG5cblx0XHRpZihzcmMgJiYgIXNwcml0ZVNldClcblx0XHR7XG5cdFx0XHRzcHJpdGVTZXQgPSBuZXcgU3ByaXRlU2hlZXQoe2ltYWdlOiBzcmN9KTtcblxuXHRcdFx0Y29uc29sZS5sb2coc3ByaXRlU2V0KTtcblx0XHR9XG5cblx0XHR0aGlzLnNwcml0ZVNldCA9IHNwcml0ZVNldDtcblxuXHRcdGlmKHNwcml0ZVNldClcblx0XHR7XG5cdFx0XHRzcHJpdGVTZXQucmVhZHkudGhlbigoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKHNwcml0ZVNldCk7XG5cdFx0XHRcdHRoaXMud2lkdGggPSBzcHJpdGVTZXQudGlsZVdpZHRoO1xuXHRcdFx0XHR0aGlzLmhlaWdodCA9IHNwcml0ZVNldC50aWxlSGVpZ2h0O1xuXHRcdFx0XHR0aGlzLnRleHR1cmUgPSB0aGlzLmNyZWF0ZVRleHR1cmUoIHNwcml0ZVNldC5nZXRGcmFtZSgwKSApO1xuXG5cdFx0XHRcdGZvcihsZXQgaSA9IDA7IGkgPCBzcHJpdGVTZXQudGlsZUNvdW50OyBpKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLnRleHR1cmVzW2ldID0gdGhpcy5jcmVhdGVUZXh0dXJlKCBzcHJpdGVTZXQuZ2V0RnJhbWUoaSkgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMuY2hhbmdlQW5pbWF0aW9uKCdkZWZhdWx0Jyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRkcmF3KGRlbHRhKVxuXHR7XG5cdFx0aWYodGhpcy5jdXJyZW50RGVsYXkgPiAwKVxuXHRcdHtcblx0XHRcdHRoaXMuY3VycmVudERlbGF5IC09IGRlbHRhO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RnJhbWUrKztcblxuXHRcdFx0aWYodGhpcy5zcHJpdGVTZXQgJiYgdGhpcy5zcHJpdGVTZXQuYW5pbWF0aW9uc1t0aGlzLmN1cnJlbnRBbmltYXRpb25dKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhbmltYXRpb24gPSB0aGlzLnNwcml0ZVNldC5hbmltYXRpb25zW3RoaXMuY3VycmVudEFuaW1hdGlvbl07XG5cblx0XHRcdFx0aWYodGhpcy5jdXJyZW50RnJhbWUgPj0gYW5pbWF0aW9uLmxlbmd0aClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuY3VycmVudEZyYW1lID0gdGhpcy5jdXJyZW50RnJhbWUgJSBhbmltYXRpb24ubGVuZ3RoO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgdGV4dHVyZUlkID0gYW5pbWF0aW9uW3RoaXMuY3VycmVudEZyYW1lXS50aWxlaWQ7XG5cblx0XHRcdFx0Y29uc3QgdGV4dHVyZSA9IHRoaXMudGV4dHVyZXNbIHRleHR1cmVJZCBdO1xuXG5cdFx0XHRcdGlmKHRleHR1cmUpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnREZWxheSA9IGFuaW1hdGlvblt0aGlzLmN1cnJlbnRGcmFtZV0uZHVyYXRpb247XG5cdFx0XHRcdFx0dGhpcy50ZXh0dXJlID0gdGV4dHVyZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGV4dHVyZSk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3JlZ2lvbicsIDAsIDAsIDAsIDApO1xuXG5cdFx0Y29uc3Qgem9vbSA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHR0aGlzLnNldFJlY3RhbmdsZShcblx0XHRcdHRoaXMueCAqIHpvb20gKyAtQ2FtZXJhLnggKyAodGhpcy5zcHJpdGVCb2FyZC53aWR0aCAvIDIpXG5cdFx0XHQsIHRoaXMueSAqIHpvb20gKyAtQ2FtZXJhLnkgKyAodGhpcy5zcHJpdGVCb2FyZC5oZWlnaHQgLyAyKSArIC10aGlzLmhlaWdodCAqIHpvb21cblx0XHRcdCwgdGhpcy53aWR0aCAqIHpvb21cblx0XHRcdCwgdGhpcy5oZWlnaHQgKiB6b29tXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3QnVmZmVyKTtcblx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3JlZ2lvbicsIC4uLk9iamVjdC5hc3NpZ24odGhpcy5yZWdpb24gfHwgWzAsIDAsIDBdLCB7MzogMX0pKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5lZmZlY3RCdWZmZXIpO1xuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfcmVnaW9uJywgMCwgMCwgMCwgMCk7XG5cblx0XHQvLyBDbGVhbnVwLi4uXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjaGFuZ2VBbmltYXRpb24obmFtZSlcblx0e1xuXHRcdGlmKCF0aGlzLnNwcml0ZVNldCB8fCF0aGlzLnNwcml0ZVNldC5hbmltYXRpb25zW25hbWVdKVxuXHRcdHtcblx0XHRcdGNvbnNvbGUud2FybihgQW5pbWF0aW9uICR7bmFtZX0gbm90IGZvdW5kLmApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuY3VycmVudEFuaW1hdGlvbiAhPT0gbmFtZSlcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnJlbnRBbmltYXRpb24gPSBuYW1lO1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXkgPSAwO1xuXHRcdH1cblx0fVxuXG5cdGNyZWF0ZVRleHR1cmUocGl4ZWxzKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblx0XHRjb25zdCB0ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgcGl4ZWxzXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXG5cdFx0cmV0dXJuIHRleHR1cmU7XG5cdH1cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodCwgdHJhbnNmb3JtID0gW10pXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXHRcdGNvbnN0IHpvb20gPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0uYnVmZmVycy5hX3RleENvb3JkKTtcblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHQwLjAsIDAuMCxcblx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0MC4wLCAxLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0MS4wLCAxLjAsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblxuXG5cdFx0Y29uc3QgeDEgPSB4O1xuXHRcdGNvbnN0IHkxID0geSArIDMyICogem9vbTtcblx0XHRjb25zdCB4MiA9IHggKyB3aWR0aDtcblx0XHRjb25zdCB5MiA9IHkgKyBoZWlnaHQgKyAzMiAqIHpvb207XG5cblx0XHRjb25zdCBwb2ludHMgPSBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgyLCB5Mixcblx0XHRdKTtcblxuXHRcdGNvbnN0IHhPZmYgPSB4ICsgd2lkdGggICogMC41O1xuXHRcdGNvbnN0IHlPZmYgPSB5ICsgaGVpZ2h0ICogMC41O1xuXG5cblx0XHRjb25zdCB0ID0gTWF0cml4LnRyYW5zZm9ybShwb2ludHMsIE1hdHJpeC5jb21wb3NpdGUoXG5cdFx0XHRNYXRyaXgudHJhbnNsYXRlKHhPZmYsIHlPZmYpXG5cdFx0XHQvLyAsIE1hdHJpeC5zY2FsZShNYXRoLnNpbih0aGV0YSksIE1hdGguY29zKHRoZXRhKSlcblx0XHRcdC8vICwgTWF0cml4LnJvdGF0ZSh0aGV0YSlcblx0XHRcdCwgTWF0cml4LnRyYW5zbGF0ZSgteE9mZiwgLXlPZmYpXG5cdFx0KSk7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfcG9zaXRpb24pO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCB0LCBnbC5TVEFUSUNfRFJBVyk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEJhZyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JhZyc7XG5pbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcblxuaW1wb3J0IHsgR2wyZCB9IGZyb20gJy4uL2dsMmQvR2wyZCc7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tICcuL0NhbWVyYSc7XG5pbXBvcnQgeyBNYXBSZW5kZXJlciB9IGZyb20gJy4vTWFwUmVuZGVyZXInO1xuaW1wb3J0IHsgUGFyYWxsYXggfSBmcm9tICcuL1BhcmFsbGF4JztcblxuZXhwb3J0IGNsYXNzIFNwcml0ZUJvYXJkXG57XG5cdGNvbnN0cnVjdG9yKHtlbGVtZW50LCB3b3JsZCwgbWFwfSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXG5cdFx0dGhpcy5tYXAgPSBtYXA7XG5cdFx0dGhpcy5tYXBzID0gW107XG5cblx0XHR0aGlzLndvcmxkID0gd29ybGQ7XG5cdFx0dGhpcy5zcHJpdGVzID0gbmV3IEJhZztcblxuXG5cdFx0dGhpcy5tb3VzZSA9IHtcblx0XHRcdHg6IG51bGxcblx0XHRcdCwgeTogbnVsbFxuXHRcdFx0LCBjbGlja1g6IG51bGxcblx0XHRcdCwgY2xpY2tZOiBudWxsXG5cdFx0fTtcblxuXHRcdHRoaXMud2lkdGggPSBlbGVtZW50LndpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gZWxlbWVudC5oZWlnaHQ7XG5cblx0XHRDYW1lcmEud2lkdGggID0gZWxlbWVudC53aWR0aDtcblx0XHRDYW1lcmEuaGVpZ2h0ID0gZWxlbWVudC5oZWlnaHQ7XG5cblx0XHR0aGlzLmdsMmQgPSBuZXcgR2wyZChlbGVtZW50KTtcblxuXHRcdHRoaXMuZ2wyZC5lbmFibGVCbGVuZGluZygpO1xuXG5cdFx0Y29uc3QgYXR0cmlidXRlcyA9IFsnYV9wb3NpdGlvbicsICdhX3RleENvb3JkJ107XG5cdFx0Y29uc3QgdW5pZm9ybXMgPSBbXG5cdFx0XHQndV9pbWFnZSdcblx0XHRcdCwgJ3VfZWZmZWN0J1xuXHRcdFx0LCAndV90aWxlcydcblx0XHRcdCwgJ3VfdGlsZU1hcHBpbmcnXG5cblx0XHRcdCwgJ3Vfc2l6ZSdcblx0XHRcdCwgJ3Vfc2NhbGUnXG5cdFx0XHQsICd1X3Njcm9sbCdcblx0XHRcdCwgJ3Vfc3RyZXRjaCdcblx0XHRcdCwgJ3VfdGlsZVNpemUnXG5cdFx0XHQsICd1X3Jlc29sdXRpb24nXG5cdFx0XHQsICd1X21hcFRleHR1cmVTaXplJ1xuXG5cdFx0XHQsICd1X3JlZ2lvbidcblx0XHRcdCwgJ3VfcGFyYWxsYXgnXG5cdFx0XHQsICd1X3RpbWUnXG5cblx0XHRcdCwgJ3VfcmVuZGVyVGlsZXMnXG5cdFx0XHQsICd1X3JlbmRlclBhcmFsbGF4J1xuXHRcdFx0LCAndV9yZW5kZXJNb2RlJ1xuXHRcdF07XG5cblx0XHR0aGlzLnJlbmRlck1vZGUgPSAwO1xuXG5cdFx0dGhpcy5kcmF3UHJvZ3JhbSA9IHRoaXMuZ2wyZC5jcmVhdGVQcm9ncmFtKHtcblx0XHRcdHZlcnRleFNoYWRlcjogdGhpcy5nbDJkLmNyZWF0ZVNoYWRlcignc3ByaXRlL3RleHR1cmUudmVydCcpXG5cdFx0XHQsIGZyYWdtZW50U2hhZGVyOiB0aGlzLmdsMmQuY3JlYXRlU2hhZGVyKCdzcHJpdGUvdGV4dHVyZS5mcmFnJylcblx0XHRcdCwgYXR0cmlidXRlc1xuXHRcdFx0LCB1bmlmb3Jtc1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51c2UoKTtcblxuXHRcdHRoaXMuY29sb3JMb2NhdGlvbiAgID0gdGhpcy5kcmF3UHJvZ3JhbS51bmlmb3Jtcy51X2NvbG9yO1xuXHRcdHRoaXMudGlsZVBvc0xvY2F0aW9uID0gdGhpcy5kcmF3UHJvZ3JhbS51bmlmb3Jtcy51X3RpbGVObztcblx0XHR0aGlzLnJlZ2lvbkxvY2F0aW9uICA9IHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybXMudV9yZWdpb247XG5cblx0XHR0aGlzLmRyYXdMYXllciA9IHRoaXMuZ2wyZC5jcmVhdGVUZXh0dXJlKDEwMDAsIDEwMDApO1xuXHRcdHRoaXMuZWZmZWN0TGF5ZXIgPSB0aGlzLmdsMmQuY3JlYXRlVGV4dHVyZSgxMDAwLCAxMDAwKTtcblxuXHRcdHRoaXMuZHJhd0J1ZmZlciA9IHRoaXMuZ2wyZC5jcmVhdGVGcmFtZWJ1ZmZlcih0aGlzLmRyYXdMYXllcik7XG5cdFx0dGhpcy5lZmZlY3RCdWZmZXIgPSB0aGlzLmdsMmQuY3JlYXRlRnJhbWVidWZmZXIodGhpcy5lZmZlY3RMYXllcik7XG5cblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxuXHRcdFx0J21vdXNlbW92ZScsIChldmVudCk9Pntcblx0XHRcdFx0dGhpcy5tb3VzZS54ID0gZXZlbnQuY2xpZW50WDtcblx0XHRcdFx0dGhpcy5tb3VzZS55ID0gZXZlbnQuY2xpZW50WTtcblx0XHRcdH1cblx0XHQpO1xuXG5cdFx0dGhpcy5tYXBSZW5kZXJlcnMgPSBuZXcgTWFwO1xuXG5cdFx0dGhpcy5wYXJhbGxheCA9IG5ldyBQYXJhbGxheCh7c3ByaXRlQm9hcmQ6IHRoaXMsIG1hcH0pO1xuXG5cdFx0dGhpcy5mb2xsb3dpbmcgPSBudWxsO1xuXHR9XG5cblx0ZHJhdyhkZWx0YSlcblx0e1xuXHRcdGlmKHRoaXMuZm9sbG93aW5nKVxuXHRcdHtcblx0XHRcdENhbWVyYS54ID0gKDE2ICsgdGhpcy5mb2xsb3dpbmcuc3ByaXRlLngpICogdGhpcy5nbDJkLnpvb21MZXZlbCB8fCAwO1xuXHRcdFx0Q2FtZXJhLnkgPSAoMTYgKyB0aGlzLmZvbGxvd2luZy5zcHJpdGUueSkgKiB0aGlzLmdsMmQuem9vbUxldmVsIHx8IDA7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdmlzaWJsZU1hcHMgPSB0aGlzLndvcmxkLmdldE1hcHNGb3JSZWN0KFxuXHRcdFx0dGhpcy5mb2xsb3dpbmcuc3ByaXRlLnhcblx0XHRcdCwgdGhpcy5mb2xsb3dpbmcuc3ByaXRlLnlcblx0XHRcdCwgNjQvL0NhbWVyYS53aWR0aCAqIDAuMTI1XG5cdFx0XHQsIDY0Ly9DYW1lcmEuaGVpZ2h0ICogMC4xMjVcblx0XHQpO1xuXG5cdFx0Y29uc3QgbWFwUmVuZGVyZXJzID0gbmV3IFNldDtcblxuXHRcdHZpc2libGVNYXBzLmZvckVhY2gobWFwID0+IHtcblx0XHRcdGlmKHRoaXMubWFwUmVuZGVyZXJzLmhhcyhtYXApKVxuXHRcdFx0e1xuXHRcdFx0XHRtYXBSZW5kZXJlcnMuYWRkKHRoaXMubWFwUmVuZGVyZXJzLmdldChtYXApKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgcmVuZGVyZXIgPSBuZXcgTWFwUmVuZGVyZXIoe3Nwcml0ZUJvYXJkOiB0aGlzLCBtYXB9KTtcblx0XHRcdG1hcFJlbmRlcmVycy5hZGQocmVuZGVyZXIpO1xuXHRcdFx0cmVuZGVyZXIucmVzaXplKENhbWVyYS53aWR0aCwgQ2FtZXJhLmhlaWdodCk7XG5cdFx0XHR0aGlzLm1hcFJlbmRlcmVycy5zZXQobWFwLCByZW5kZXJlcik7XG5cdFx0fSk7XG5cblx0XHRuZXcgU2V0KHRoaXMubWFwUmVuZGVyZXJzLmtleXMoKSlcblx0XHRcdC5kaWZmZXJlbmNlKHZpc2libGVNYXBzKVxuXHRcdFx0LmZvckVhY2gobSA9PiB0aGlzLm1hcFJlbmRlcmVycy5kZWxldGUobSkpO1xuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3Vfc2l6ZScsIENhbWVyYS53aWR0aCwgQ2FtZXJhLmhlaWdodCk7XG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9yZXNvbHV0aW9uJywgZ2wuY2FudmFzLndpZHRoLCBnbC5jYW52YXMuaGVpZ2h0KTtcblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X3JlbmRlck1vZGUnLCB0aGlzLnJlbmRlck1vZGUpO1xuXG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV90aW1lJywgcGVyZm9ybWFuY2Uubm93KCkpO1xuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfcmVnaW9uJywgMCwgMCwgMCwgMCk7XG5cblx0XHRnbC52aWV3cG9ydCgwLCAwLCBnbC5jYW52YXMud2lkdGgsIGdsLmNhbnZhcy5oZWlnaHQpO1xuXHRcdGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMSk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuZWZmZWN0QnVmZmVyKTtcblx0XHRnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5kcmF3QnVmZmVyKTtcblx0XHRnbC5jbGVhckNvbG9yKDAsIDAsIDAsIDApO1xuXHRcdGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcblxuXHRcdGlmKHRoaXMubWFwLmJhY2tncm91bmRDb2xvcilcblx0XHR7XG5cdFx0XHRjb25zdCBjb2xvciA9IHRoaXMubWFwLmJhY2tncm91bmRDb2xvci5zdWJzdHIoMSk7XG5cblx0XHRcdGNvbnN0IHIgPSBwYXJzZUludChjb2xvci5zdWJzdHIoLTYsIDIpLCAxNikgLyAyNTU7XG5cdFx0XHRjb25zdCBiID0gcGFyc2VJbnQoY29sb3Iuc3Vic3RyKC00LCAyKSwgMTYpIC8gMjU1O1xuXHRcdFx0Y29uc3QgZyA9IHBhcnNlSW50KGNvbG9yLnN1YnN0cigtMiwgMiksIDE2KSAvIDI1NTtcblx0XHRcdGNvbnN0IGEgPSBjb2xvci5sZW5ndGggPT09IDggPyBwYXJzZUludChjb2xvci5zdWJzdHIoLTgsIDIpLCAxNikgLyAyNTUgOiAxO1xuXG5cdFx0XHRnbC5jbGVhckNvbG9yKHIsIGcsIGIsIGEpO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Z2wuY2xlYXJDb2xvcigwLCAwLCAwLCAxKTtcblx0XHR9XG5cblx0XHRnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKTtcblxuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyAmJiBjb25zb2xlLnRpbWUoJ2RyYXctcGFyYWxsYXgnKTtcblx0XHR0aGlzLnBhcmFsbGF4ICYmIHRoaXMucGFyYWxsYXguZHJhdygpO1xuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyAmJiBjb25zb2xlLnRpbWVFbmQoJ2RyYXctcGFyYWxsYXgnKTtcblxuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3Vfc2l6ZScsIENhbWVyYS53aWR0aCwgQ2FtZXJhLmhlaWdodCk7XG5cblxuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyAmJiBjb25zb2xlLnRpbWUoJ2RyYXctdGlsZXMnKTtcblx0XHR0aGlzLm1hcFJlbmRlcmVycy52YWx1ZXMoKS5mb3JFYWNoKG1yID0+IG1yLmRyYXcoKSk7XG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZUVuZCgnZHJhdy10aWxlcycpO1xuXG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZSgnZHJhdy1zcHJpdGVzJyk7XG5cdFx0bGV0IHNwcml0ZXMgPSB0aGlzLnNwcml0ZXMuaXRlbXMoKTtcblx0XHQvLyBzcHJpdGVzLmZvckVhY2gocyA9PiBzLnogPSBzLnkpO1xuXHRcdHNwcml0ZXMuc29ydCgoYSxiKSA9PiB7XG5cdFx0XHRpZihhLnkgPT09IHVuZGVmaW5lZClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihiLnkgPT09IHVuZGVmaW5lZClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBhLnkgLSBiLnk7XG5cdFx0fSk7XG5cdFx0c3ByaXRlcy5mb3JFYWNoKHMgPT4gcy52aXNpYmxlICYmIHMuZHJhdyhkZWx0YSkpO1xuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyAmJiBjb25zb2xlLnRpbWVFbmQoJ2RyYXctc3ByaXRlcycpO1xuXG5cdFx0aWYod2luZG93LnNtUHJvZmlsaW5nKVxuXHRcdHtcblx0XHRcdHdpbmRvdy5zbVByb2ZpbGluZyA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIFNldCB0aGUgcmVjdGFuZ2xlIGZvciBib3RoIGxheWVyc1xuXHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0MFxuXHRcdFx0LCB0aGlzLmdsMmQuZWxlbWVudC5oZWlnaHRcblx0XHRcdCwgdGhpcy5nbDJkLmVsZW1lbnQud2lkdGhcblx0XHRcdCwgLXRoaXMuZ2wyZC5lbGVtZW50LmhlaWdodFxuXHRcdCk7XG5cblx0XHQvLyBTd2l0Y2ggdG8gdGhlIG1haW4gZnJhbWVidWZmZXJcblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXG5cdFx0Ly8gUHV0IHRoZSBkcmF3TGF5ZXIgaW4gdGV4MFxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuZHJhd0xheWVyKTtcblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X2ltYWdlJywgMCk7XG5cblx0XHQvLyBQdXQgdGhlIGVmZmVjdExheWVyIGluIHRleDFcblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLmVmZmVjdExheWVyKTtcblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X2VmZmVjdCcsIDEpO1xuXG5cdFx0Ly8gRHJhd1xuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblxuXHRcdC8vIENsZWFudXAuLi5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkU0KTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0fVxuXG5cdHJlc2l6ZSh3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdHdpZHRoICA9IHdpZHRoICB8fCB0aGlzLmdsMmQuZWxlbWVudC53aWR0aDtcblx0XHRoZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5nbDJkLmVsZW1lbnQuaGVpZ2h0O1xuXG5cdFx0dGhpcy53aWR0aCA9IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0Q2FtZXJhLnggKj0gdGhpcy5nbDJkLnpvb21MZXZlbDtcblx0XHRDYW1lcmEueSAqPSB0aGlzLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0Q2FtZXJhLndpZHRoICA9IHdpZHRoICAvIHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cdFx0Q2FtZXJhLmhlaWdodCA9IGhlaWdodCAvIHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHR0aGlzLm1hcFJlbmRlcmVycy52YWx1ZXMoKS5mb3JFYWNoKG1yID0+IG1yLnJlc2l6ZShDYW1lcmEud2lkdGgsIENhbWVyYS5oZWlnaHQpKVxuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5kcmF3TGF5ZXIpO1xuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCB0aGlzLndpZHRoXG5cdFx0XHQsIHRoaXMuaGVpZ2h0XG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIG51bGxcblx0XHQpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5lZmZlY3RMYXllcik7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbnVsbFxuXHRcdCk7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLmRyYXdQcm9ncmFtLmJ1ZmZlcnMuYV9wb3NpdGlvbik7XG5cblx0XHRjb25zdCB4MSA9IHg7XG5cdFx0Y29uc3QgeDIgPSB4ICsgd2lkdGg7XG5cdFx0Y29uc3QgeTEgPSB5O1xuXHRcdGNvbnN0IHkyID0geSArIGhlaWdodDtcblxuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgyLCB5Mixcblx0XHRdKSwgZ2wuU1RSRUFNX0RSQVcpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBUaWxlc2V0IH0gZnJvbSBcIi4vVGlsZXNldFwiO1xuXG5leHBvcnQgY2xhc3MgU3ByaXRlU2hlZXQgZXh0ZW5kcyBUaWxlc2V0XG57XG5cdGNvbnN0cnVjdG9yKHRpbGVzZXREYXRhKVxuXHR7XG5cdFx0c3VwZXIodGlsZXNldERhdGEpO1xuXG5cdFx0dGhpcy5mcmFtZXMgPSBbXTtcblx0XHR0aGlzLmFuaW1hdGlvbnMgPSB7XG5cdFx0XHRkZWZhdWx0OiBbe3RpbGVpZDogMCwgZHVyYXRpb246IEluZmluaXR5fV1cblx0XHR9O1xuXG5cdFx0dGhpcy5jYW52YXMgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIsIHt3aWxsUmVhZEZyZXF1ZW50bHk6IHRydWV9KTtcblxuXHRcdHRoaXMucmVhZHkgPSB0aGlzLnJlYWR5LnRoZW4oKCkgPT4ge1xuXHRcdFx0dGhpcy5wcm9jZXNzSW1hZ2UoKTtcblxuXHRcdFx0Zm9yKGNvbnN0IHRpbGUgb2YgdGhpcy50aWxlcylcblx0XHRcdHtcblx0XHRcdFx0aWYodGlsZS5hbmltYXRpb24pXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmFuaW1hdGlvbnNbdGlsZS50eXBlXSA9IHRpbGUuYW5pbWF0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYodGlsZS50eXBlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hbmltYXRpb25zW3RpbGUudHlwZV0gPSBbe2R1cmF0aW9uOiBJbmZpbml0eSwgdGlsZWlkOiB0aWxlLmlkfV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHByb2Nlc3NJbWFnZSgpXG5cdHtcblx0XHR0aGlzLmNhbnZhcy53aWR0aCAgPSB0aGlzLmltYWdlLndpZHRoO1xuXHRcdHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2UuaGVpZ2h0O1xuXG5cdFx0dGhpcy5jb250ZXh0LmRyYXdJbWFnZSh0aGlzLmltYWdlLCAwLCAwKTtcblxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLnRpbGVDb3VudDsgaSsrKVxuXHRcdHtcblx0XHRcdHRoaXMuZnJhbWVzW2ldID0gdGhpcy5nZXRGcmFtZShpKVxuXHRcdH1cblx0fVxuXG5cdGdldEZyYW1lKGZyYW1lSWQpXG5cdHtcblx0XHRmcmFtZUlkID0gZnJhbWVJZCAlIHRoaXMudGlsZUNvdW50O1xuXHRcdGNvbnN0IGkgPSBmcmFtZUlkICUgdGhpcy5jb2x1bW5zO1xuXHRcdGNvbnN0IGogPSBNYXRoLmZsb29yKGZyYW1lSWQgLyB0aGlzLmNvbHVtbnMpO1xuXG5cdFx0cmV0dXJuIHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoXG5cdFx0XHRpICogdGhpcy50aWxlV2lkdGhcblx0XHRcdCwgaiAqIHRoaXMudGlsZUhlaWdodFxuXHRcdFx0LCB0aGlzLnRpbGVXaWR0aFxuXHRcdFx0LCB0aGlzLnRpbGVIZWlnaHRcblx0XHQpLmRhdGE7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBUZXh0dXJlQmFua1xue1xuXHRcbn0iLCJleHBvcnQgY2xhc3MgVGlsZXNldFxue1xuXHRjb25zdHJ1Y3Rvcih7XG5cdFx0c291cmNlLCBmaXJzdGdpZCwgY29sdW1ucywgaW1hZ2UsIGltYWdlaGVpZ2h0LCBpbWFnZXdpZHRoLCBtYXJnaW5cblx0XHQsIG5hbWUsIHNwYWNpbmcsIHRpbGVjb3VudCwgdGlsZWhlaWdodCwgdGlsZXdpZHRoLCB0aWxlc1xuXHR9KXtcblx0XHR0aGlzLmZpcnN0R2lkID0gZmlyc3RnaWQgPz8gMDtcblx0XHR0aGlzLnRpbGVDb3VudCAgPSB0aWxlY291bnQgPz8gMDtcblx0XHR0aGlzLnRpbGVIZWlnaHQgPSB0aWxlaGVpZ2h0ID8/IDA7XG5cdFx0dGhpcy50aWxlV2lkdGggID0gdGlsZXdpZHRoID8/IDA7XG5cblx0XHR0aGlzLnJlYWR5ID0gdGhpcy5nZXRSZWFkeSh7XG5cdFx0XHRzb3VyY2UsIGNvbHVtbnMsIGltYWdlLCBpbWFnZWhlaWdodCwgaW1hZ2V3aWR0aCwgbWFyZ2luXG5cdFx0XHQsIG5hbWUsIHNwYWNpbmcsIHRpbGVjb3VudCwgdGlsZWhlaWdodCwgdGlsZXdpZHRoLCB0aWxlc1xuXHRcdH0pO1xuXHR9XG5cblx0YXN5bmMgZ2V0UmVhZHkoe1xuXHRcdHNvdXJjZSwgY29sdW1ucywgaW1hZ2UsIGltYWdlaGVpZ2h0LCBpbWFnZXdpZHRoLCBtYXJnaW4sIG5hbWVcblx0XHQsIHNwYWNpbmcsIHRpbGVjb3VudCwgdGlsZWhlaWdodCwgdGlsZXdpZHRoLCB0aWxlc1xuXHR9KXtcblx0XHRpZihzb3VyY2UpXG5cdFx0e1xuXHRcdFx0KHtjb2x1bW5zLCBpbWFnZSwgaW1hZ2VoZWlnaHQsIGltYWdld2lkdGgsIG1hcmdpbiwgbmFtZSxcblx0XHRcdFx0c3BhY2luZywgdGlsZWNvdW50LCB0aWxlaGVpZ2h0LCB0aWxld2lkdGgsIHRpbGVzXG5cdFx0XHR9ID0gYXdhaXQgKGF3YWl0IGZldGNoKHNvdXJjZSkpLmpzb24oKSk7XG5cblx0XHRcdGZvcihjb25zdCB0aWxlIG9mIHRpbGVzKVxuXHRcdFx0e1xuXHRcdFx0XHR0aWxlLmlkICs9IHRoaXMuZmlyc3RHaWQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5jb2x1bW5zID0gY29sdW1ucyA/PyAxO1xuXHRcdHRoaXMubWFyZ2luICA9IG1hcmdpbiA/PyAwO1xuXHRcdHRoaXMubmFtZSAgICA9IG5hbWUgPz8gaW1hZ2U7XG5cdFx0dGhpcy5zcGFjaW5nID0gc3BhY2luZyA/PyAwO1xuXHRcdHRoaXMudGlsZXMgICA9IHRpbGVzID8/IFtdO1xuXG5cdFx0dGhpcy50aWxlQ291bnQgID0gdGlsZWNvdW50ID8/IDE7XG5cblx0XHR0aGlzLmltYWdlID0gbmV3IEltYWdlO1xuXHRcdHRoaXMuaW1hZ2Uuc3JjID0gaW1hZ2U7XG5cblx0XHRhd2FpdCBuZXcgUHJvbWlzZShhY2NlcHQgPT4gdGhpcy5pbWFnZS5vbmxvYWQgPSAoKSA9PiBhY2NlcHQoKSk7XG5cblx0XHR0aGlzLmltYWdlV2lkdGggID0gaW1hZ2V3aWR0aCA/PyB0aGlzLmltYWdlLndpZHRoO1xuXHRcdHRoaXMuaW1hZ2VIZWlnaHQgPSBpbWFnZWhlaWdodCA/PyB0aGlzLmltYWdlLmhlaWdodDtcblxuXHRcdHRoaXMudGlsZVdpZHRoICA9IHRpbGV3aWR0aCA/PyB0aGlzLmltYWdlV2lkdGg7XG5cdFx0dGhpcy50aWxlSGVpZ2h0ID0gdGlsZWhlaWdodCA/PyB0aGlzLmltYWdlSGVpZ2h0O1xuXG5cdFx0dGhpcy5yb3dzID0gTWF0aC5jZWlsKGltYWdlaGVpZ2h0IC8gdGlsZWhlaWdodCkgfHwgMTtcblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIi8vIHRleHR1cmUuZnJhZ1xcbiNkZWZpbmUgTV9QSSAzLjE0MTU5MjY1MzU4OTc5MzIzODQ2MjY0MzM4MzI3OTVcXG4jZGVmaW5lIE1fVEFVIE1fUEkgLyAyLjBcXG5wcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcXG5cXG52YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDtcXG52YXJ5aW5nIHZlYzIgdl9wb3NpdGlvbjtcXG5cXG51bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlO1xcbnVuaWZvcm0gc2FtcGxlcjJEIHVfZWZmZWN0O1xcbnVuaWZvcm0gc2FtcGxlcjJEIHVfdGlsZXM7XFxudW5pZm9ybSBzYW1wbGVyMkQgdV90aWxlTWFwcGluZztcXG5cXG51bmlmb3JtIHZlYzIgdV9zaXplO1xcbnVuaWZvcm0gdmVjMiB1X3RpbGVTaXplO1xcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxudW5pZm9ybSB2ZWMyIHVfbWFwVGV4dHVyZVNpemU7XFxuXFxudW5pZm9ybSB2ZWM0IHVfY29sb3I7XFxudW5pZm9ybSB2ZWM0IHVfcmVnaW9uO1xcbnVuaWZvcm0gdmVjMiB1X3BhcmFsbGF4O1xcbnVuaWZvcm0gdmVjMiB1X3Njcm9sbDtcXG51bmlmb3JtIHZlYzIgdV9zdHJldGNoO1xcblxcbnVuaWZvcm0gZmxvYXQgdV90aW1lO1xcbnVuaWZvcm0gZmxvYXQgdV9zY2FsZTtcXG5cXG51bmlmb3JtIGludCB1X3JlbmRlclRpbGVzO1xcbnVuaWZvcm0gaW50IHVfcmVuZGVyUGFyYWxsYXg7XFxudW5pZm9ybSBpbnQgdV9yZW5kZXJNb2RlO1xcblxcbmZsb2F0IG1hc2tlZCA9IDAuMDtcXG5mbG9hdCBzb3J0ZWQgPSAxLjA7XFxuZmxvYXQgZGlzcGxhY2UgPSAxLjA7XFxuZmxvYXQgYmx1ciA9IDEuMDtcXG5cXG52ZWMyIHJpcHBsZVgodmVjMiB0ZXhDb29yZCwgZmxvYXQgYSwgZmxvYXQgYiwgZmxvYXQgYykge1xcbiAgdmVjMiByaXBwbGVkID0gdmVjMihcXG4gICAgdl90ZXhDb29yZC54ICsgc2luKHZfdGV4Q29vcmQueSAqIChhICogdV9zaXplLnkpICsgYikgKiBjIC8gdV9zaXplLngsXFxuICAgIHZfdGV4Q29vcmQueVxcbiAgKTtcXG5cXG4gIGlmIChyaXBwbGVkLnggPCAwLjApIHtcXG4gICAgcmlwcGxlZC54ID0gYWJzKHJpcHBsZWQueCk7XFxuICB9XFxuICBlbHNlIGlmIChyaXBwbGVkLnggPiB1X3NpemUueCkge1xcbiAgICByaXBwbGVkLnggPSB1X3NpemUueCAtIChyaXBwbGVkLnggLSB1X3NpemUueCk7XFxuICB9XFxuXFxuICByZXR1cm4gcmlwcGxlZDtcXG59XFxuXFxudmVjMiByaXBwbGVZKHZlYzIgdGV4Q29vcmQsIGZsb2F0IGEsIGZsb2F0IGIsIGZsb2F0IGMpIHtcXG4gIHZlYzIgcmlwcGxlZCA9IHZlYzIodl90ZXhDb29yZC54LCB2X3RleENvb3JkLnkgKyBzaW4odl90ZXhDb29yZC54ICogKGEgKiB1X3NpemUueCkgKyBiKSAqIGMgLyB1X3NpemUueSk7XFxuXFxuICBpZiAocmlwcGxlZC55IDwgMC4wKSB7XFxuICAgIHJpcHBsZWQueCA9IGFicyhyaXBwbGVkLngpO1xcbiAgfVxcbiAgZWxzZSBpZiAocmlwcGxlZC55ID4gdV9zaXplLnkpIHtcXG4gICAgcmlwcGxlZC55ID0gdV9zaXplLnkgLSAocmlwcGxlZC55IC0gdV9zaXplLnkpO1xcbiAgfVxcblxcbiAgcmV0dXJuIHJpcHBsZWQ7XFxufVxcblxcbnZlYzQgbW90aW9uQmx1cihzYW1wbGVyMkQgaW1hZ2UsIGZsb2F0IGFuZ2xlLCBmbG9hdCBtYWduaXR1ZGUsIHZlYzIgdGV4dENvb3JkKSB7XFxuICB2ZWM0IG9yaWdpbmFsQ29sb3IgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCk7XFxuICB2ZWM0IGRpc3BDb2xvciA9IG9yaWdpbmFsQ29sb3I7XFxuXFxuICBjb25zdCBmbG9hdCBtYXggPSAxMC4wO1xcbiAgZmxvYXQgd2VpZ2h0ID0gMC44NTtcXG5cXG4gIGZvciAoZmxvYXQgaSA9IDAuMDsgaSA8IG1heDsgaSArPSAxLjApIHtcXG4gICAgaWYoaSA+IGFicyhtYWduaXR1ZGUpIHx8IG9yaWdpbmFsQ29sb3IuYSA8IDEuMCkge1xcbiAgICAgIGJyZWFrO1xcbiAgICB9XFxuICAgIHZlYzQgZGlzcENvbG9yRG93biA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkICsgdmVjMihcXG4gICAgICBjb3MoYW5nbGUpICogaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS54LFxcbiAgICAgIHNpbihhbmdsZSkgKiBpICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLnlcXG4gICAgKSk7XFxuICAgIGRpc3BDb2xvciA9IGRpc3BDb2xvciAqICgxLjAgLSB3ZWlnaHQpICsgZGlzcENvbG9yRG93biAqIHdlaWdodDtcXG4gICAgd2VpZ2h0ICo9IDAuODtcXG4gIH1cXG5cXG4gIHJldHVybiBkaXNwQ29sb3I7XFxufVxcblxcbnZlYzQgbGluZWFyQmx1cihzYW1wbGVyMkQgaW1hZ2UsIGZsb2F0IGFuZ2xlLCBmbG9hdCBtYWduaXR1ZGUsIHZlYzIgdGV4dENvb3JkKSB7XFxuICB2ZWM0IG9yaWdpbmFsQ29sb3IgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCk7XFxuICB2ZWM0IGRpc3BDb2xvciA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkKTtcXG5cXG4gIGNvbnN0IGZsb2F0IG1heCA9IDEwLjA7XFxuICBmbG9hdCB3ZWlnaHQgPSAwLjY1O1xcblxcbiAgZm9yIChmbG9hdCBpID0gMC4wOyBpIDwgbWF4OyBpICs9IDAuMjUpIHtcXG4gICAgaWYoaSA+IGFicyhtYWduaXR1ZGUpKSB7XFxuICAgICAgYnJlYWs7XFxuICAgIH1cXG4gICAgdmVjNCBkaXNwQ29sb3JVcCA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkICsgdmVjMihcXG4gICAgICBjb3MoYW5nbGUpICogLWkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueCxcXG4gICAgICBzaW4oYW5nbGUpICogLWkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueVxcbiAgICApKTtcXG4gICAgdmVjNCBkaXNwQ29sb3JEb3duID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQgKyB2ZWMyKFxcbiAgICAgIGNvcyhhbmdsZSkgKiBpICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLngsXFxuICAgICAgc2luKGFuZ2xlKSAqIGkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueVxcbiAgICApKTtcXG4gICAgZGlzcENvbG9yID0gZGlzcENvbG9yICogKDEuMCAtIHdlaWdodCkgKyBkaXNwQ29sb3JEb3duICogd2VpZ2h0ICogMC41ICsgZGlzcENvbG9yVXAgKiB3ZWlnaHQgKiAwLjU7XFxuICAgIHdlaWdodCAqPSAwLjcwO1xcbiAgfVxcblxcbiAgcmV0dXJuIGRpc3BDb2xvcjtcXG59XFxuXFxudm9pZCBtYWluKCkge1xcbiAgdmVjNCBvcmlnaW5hbENvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHZfdGV4Q29vcmQpO1xcbiAgdmVjNCBlZmZlY3RDb2xvciA9IHRleHR1cmUyRCh1X2VmZmVjdCwgIHZfdGV4Q29vcmQpO1xcblxcbiAgLy8gVGhpcyBvbmx5IGFwcGxpZXMgd2hlbiBkcmF3aW5nIHRoZSBwYXJhbGxheCBiYWNrZ3JvdW5kXFxuICBpZiAodV9yZW5kZXJQYXJhbGxheCA9PSAxKSB7XFxuXFxuICAgIGZsb2F0IHRleGVsU2l6ZSA9IDEuMCAvIHVfc2l6ZS54O1xcblxcbiAgICB2ZWMyIHBhcmFsbGF4Q29vcmQgPSB2X3RleENvb3JkICogdmVjMigxLjAsIC0xLjApICsgdmVjMigwLjAsIDEuMClcXG4gICAgICArIHZlYzIodV9zY3JvbGwueCAqIHRleGVsU2l6ZSAqIHVfcGFyYWxsYXgueCwgMC4wKTtcXG4gICAgICAvLyArIHZlYzIodV90aW1lIC8gMTAwMDAuMCwgMC4wKTtcXG4gICAgICAvLyArIHZlYzIoLCAwLjApO1xcbiAgICAgIDtcXG5cXG4gICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsICBwYXJhbGxheENvb3JkKTtcXG5cXG4gICAgcmV0dXJuO1xcbiAgfVxcblxcbiAgLy8gVGhpcyBvbmx5IGFwcGxpZXMgd2hlbiBkcmF3aW5nIHRpbGVzLlxcbiAgaWYgKHVfcmVuZGVyVGlsZXMgPT0gMSkge1xcbiAgICBmbG9hdCB4VGlsZXMgPSBmbG9vcih1X3NpemUueCAvIHVfdGlsZVNpemUueCk7XFxuICAgIGZsb2F0IHlUaWxlcyA9IGZsb29yKHVfc2l6ZS55IC8gdV90aWxlU2l6ZS55KTtcXG5cXG4gICAgZmxvYXQgeFQgPSAodl90ZXhDb29yZC54ICogdV9zaXplLngpIC8gdV90aWxlU2l6ZS54O1xcbiAgICBmbG9hdCB5VCA9ICh2X3RleENvb3JkLnkgKiB1X3NpemUueSkgLyB1X3RpbGVTaXplLnk7XFxuXFxuICAgIGZsb2F0IGludl94VGlsZXMgPSAxLjAgLyB4VGlsZXM7XFxuICAgIGZsb2F0IGludl95VGlsZXMgPSAxLjAgLyB5VGlsZXM7XFxuXFxuICAgIGZsb2F0IHhUaWxlID0gZmxvb3IoeFQpICogaW52X3hUaWxlcztcXG4gICAgZmxvYXQgeVRpbGUgPSBmbG9vcih5VCkgKiBpbnZfeVRpbGVzO1xcblxcbiAgICBmbG9hdCB4T2ZmID0gKHhUICogaW52X3hUaWxlcyAtIHhUaWxlKSAqIHhUaWxlcztcXG4gICAgZmxvYXQgeU9mZiA9ICh5VCAqIGludl95VGlsZXMgLSB5VGlsZSkgKiB5VGlsZXMgKiAtMS4wICsgMS4wO1xcblxcbiAgICBmbG9hdCB4V3JhcCA9IHVfbWFwVGV4dHVyZVNpemUueCAvIHVfdGlsZVNpemUueDtcXG4gICAgZmxvYXQgeVdyYXAgPSB1X21hcFRleHR1cmVTaXplLnkgLyB1X3RpbGVTaXplLnk7XFxuXFxuICAgIC8vIE1vZGUgMSBkcmF3cyB0aWxlcycgeC95IHZhbHVlcyBhcyByZWQgJiBncmVlblxcbiAgICBpZiAodV9yZW5kZXJNb2RlID09IDEpIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KHhUaWxlLCB5VGlsZSwgMCwgMS4wKTtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG5cXG4gICAgLy8gTW9kZSAyIGlzIHRoZSBzYW1lIGFzIG1vZGUgMSBidXQgYWRkcyBjb21iaW5lc1xcbiAgICAvLyBpbnRlcm5hbCB0aWxlIHgveSB0byB0aGUgYmx1ZSBjaGFubmVsXFxuICAgIGlmICh1X3JlbmRlck1vZGUgPT0gMikge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoeFRpbGUsIHlUaWxlLCAoeE9mZiArIHlPZmYpICogMC41LCAxLjApO1xcbiAgICAgIHJldHVybjtcXG4gICAgfVxcblxcbiAgICB2ZWM0IHRpbGUgPSB0ZXh0dXJlMkQodV90aWxlTWFwcGluZywgdl90ZXhDb29yZCAqIHZlYzIoMS4wLCAtMS4wKSArIHZlYzIoMC4wLCAxLjApKTtcXG5cXG4gICAgZmxvYXQgbG8gPSB0aWxlLnIgKiAyNTYuMDtcXG4gICAgZmxvYXQgaGkgPSB0aWxlLmcgKiAyNTYuMCAqIDI1Ni4wO1xcblxcbiAgICBmbG9hdCB0aWxlTnVtYmVyID0gbG8gKyBoaTtcXG5cXG4gICAgaWYgKHRpbGVOdW1iZXIgPT0gMC4wKSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yLmEgPSAwLjA7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIC8vIE1vZGUgMyB1c2VzIHRoZSB0aWxlIG51bWJlciBmb3IgdGhlIHJlZC9ncmVlbiBjaGFubmVsc1xcbiAgICBpZiAodV9yZW5kZXJNb2RlID09IDMpIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB0aWxlO1xcbiAgICAgIGdsX0ZyYWdDb2xvci5iID0gMC41O1xcbiAgICAgIGdsX0ZyYWdDb2xvci5hID0gMS4wO1xcbiAgICAgIHJldHVybjtcXG4gICAgfVxcblxcbiAgICAvLyBNb2RlIDQgbm9ybWFsaXplcyB0aGUgdGlsZSBudW1iZXIgdG8gYWxsIGNoYW5uZWxzXFxuICAgIGlmICh1X3JlbmRlck1vZGUgPT0gNCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoXFxuICAgICAgICBtb2QodGlsZU51bWJlciwgMjU2LjApIC8gMjU2LjBcXG4gICAgICAgICwgbW9kKHRpbGVOdW1iZXIsIDI1Ni4wKSAvIDI1Ni4wXFxuICAgICAgICAsIG1vZCh0aWxlTnVtYmVyLCAyNTYuMCkgLyAyNTYuMFxcbiAgICAgICAgLCAxLjBcXG4gICAgICApO1xcbiAgICAgIHJldHVybjtcXG4gICAgfVxcblxcbiAgICBmbG9hdCB0aWxlU2V0WCA9IGZsb29yKG1vZCgoLTEuMCArIHRpbGVOdW1iZXIpLCB4V3JhcCkpO1xcbiAgICBmbG9hdCB0aWxlU2V0WSA9IGZsb29yKCgtMS4wICsgdGlsZU51bWJlcikgLyB4V3JhcCk7XFxuXFxuICAgIHZlYzQgdGlsZUNvbG9yID0gdGV4dHVyZTJEKHVfdGlsZXMsIHZlYzIoXFxuICAgICAgeE9mZiAvIHhXcmFwICsgdGlsZVNldFggKiAodV90aWxlU2l6ZS55IC8gdV9tYXBUZXh0dXJlU2l6ZS55KVxcbiAgICAgICwgeU9mZiAvIHlXcmFwICsgdGlsZVNldFkgKiAodV90aWxlU2l6ZS55IC8gdV9tYXBUZXh0dXJlU2l6ZS55KVxcbiAgICApKTtcXG5cXG4gICAgZ2xfRnJhZ0NvbG9yID0gdGlsZUNvbG9yO1xcblxcbiAgICByZXR1cm47XFxuICB9XFxuXFxuICAvLyBUaGlzIGlmL2Vsc2UgYmxvY2sgb25seSBhcHBsaWVzXFxuICAvLyB3aGVuIHdlJ3JlIGRyYXdpbmcgdGhlIGVmZmVjdEJ1ZmZlclxcbiAgaWYgKHVfcmVnaW9uLnIgPiAwLjAgfHwgdV9yZWdpb24uZyA+IDAuMCB8fCB1X3JlZ2lvbi5iID4gMC4wKSB7XFxuICAgIGlmIChtYXNrZWQgPCAxLjAgfHwgb3JpZ2luYWxDb2xvci5hID4gMC4wKSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdV9yZWdpb247XFxuICAgIH1cXG4gICAgcmV0dXJuO1xcbiAgfVxcbiAgZWxzZSBpZiAodV9yZWdpb24uYSA+IDAuMCkge1xcbiAgICBpZiAoc29ydGVkID4gMC4wKSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgwLCAwLCAwLCBvcmlnaW5hbENvbG9yLmEgPiAwLjAgPyAxLjAgOiAwLjApO1xcbiAgICB9XFxuICAgIGVsc2Uge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMCwgMCwgMCwgMC4wKTtcXG4gICAgfVxcbiAgICByZXR1cm47XFxuICB9O1xcblxcbiAgLy8gTW9kZSA1IGRyYXdzIHRoZSBlZmZlY3QgYnVmZmVyIHRvIHRoZSBzY3JlZW5cXG4gIGlmICh1X3JlbmRlck1vZGUgPT0gNSkge1xcbiAgICBnbF9GcmFnQ29sb3IgPSBlZmZlY3RDb2xvcjtcXG4gICAgcmV0dXJuO1xcbiAgfVxcblxcbiAgdmVjMyByaXBwbGUgPSB2ZWMzKE1fUEkvOC4wLCB1X3RpbWUgLyAyMDAuMCwgMS4wKTtcXG5cXG4gIC8vIFRoaXMgaWYvZWxzZSBibG9jayBvbmx5IGFwcGxpZXNcXG4gIC8vIHdoZW4gd2UncmUgZHJhd2luZyB0aGUgZHJhd0J1ZmZlclxcbiAgaWYgKGVmZmVjdENvbG9yID09IHZlYzQoMCwgMSwgMSwgMSkpIHsgLy8gV2F0ZXIgcmVnaW9uXFxuICAgIHZlYzIgdGV4Q29vcmQgPSB2X3RleENvb3JkO1xcbiAgICB2ZWM0IHZfYmx1cnJlZENvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG4gICAgaWYgKGRpc3BsYWNlID4gMC4wKSB7XFxuICAgICAgdGV4Q29vcmQgPSByaXBwbGVYKHZfdGV4Q29vcmQsIHJpcHBsZS54LCByaXBwbGUueSwgcmlwcGxlLnopO1xcbiAgICAgIHZfYmx1cnJlZENvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHRleENvb3JkKTtcXG4gICAgfVxcbiAgICBpZiAoYmx1ciA+IDAuMCkge1xcbiAgICAgIHZfYmx1cnJlZENvbG9yID0gbGluZWFyQmx1cih1X2ltYWdlLCAwLjAsIDEuMCwgdGV4Q29vcmQpO1xcbiAgICB9XFxuICAgIGdsX0ZyYWdDb2xvciA9IHZfYmx1cnJlZENvbG9yICogMC42NSArIGVmZmVjdENvbG9yICogMC4zNTtcXG4gIH1cXG4gIGVsc2UgaWYgKGVmZmVjdENvbG9yID09IHZlYzQoMSwgMCwgMCwgMSkpIHsgLy8gRmlyZSByZWdpb25cXG4gICAgdmVjMiB2X2Rpc3BsYWNlbWVudCA9IHJpcHBsZVkodl90ZXhDb29yZCwgcmlwcGxlLnggKiAzLjAsIHJpcHBsZS55ICogMS41LCByaXBwbGUueiAqIDAuMzMzKTtcXG4gICAgdmVjNCB2X2JsdXJyZWRDb2xvciA9IG9yaWdpbmFsQ29sb3I7XFxuICAgIGlmIChkaXNwbGFjZSA+IDAuMCkge1xcbiAgICAgIHZfYmx1cnJlZENvbG9yID0gdGV4dHVyZTJEKHVfaW1hZ2UsIHZfZGlzcGxhY2VtZW50KTtcXG4gICAgfVxcbiAgICBpZiAoYmx1ciA+IDAuMCkge1xcbiAgICAgIHZfYmx1cnJlZENvbG9yID0gbW90aW9uQmx1cih1X2ltYWdlLCAtTV9UQVUsIDEuMCwgdl9kaXNwbGFjZW1lbnQpO1xcbiAgICB9XFxuICAgIGdsX0ZyYWdDb2xvciA9IHZfYmx1cnJlZENvbG9yICogMC43NSArIGVmZmVjdENvbG9yICogMC4yNTtcXG4gIH1cXG4gIGVsc2UgeyAvLyBOdWxsIHJlZ2lvblxcbiAgICBnbF9GcmFnQ29sb3IgPSBvcmlnaW5hbENvbG9yO1xcbiAgfVxcbn1cXG5cIiIsIm1vZHVsZS5leHBvcnRzID0gXCIvLyB0ZXh0dXJlLnZlcnRcXG5wcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcXG5cXG5hdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uO1xcbmF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7XFxuXFxudW5pZm9ybSB2ZWMyIHVfcmVzb2x1dGlvbjtcXG5cXG52YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDtcXG52YXJ5aW5nIHZlYzIgdl9wb3NpdGlvbjtcXG5cXG52b2lkIG1haW4oKVxcbntcXG4gIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjtcXG4gIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wO1xcbiAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7XFxuXFxuICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpO1xcbiAgdl90ZXhDb29yZCAgPSBhX3RleENvb3JkO1xcbiAgdl9wb3NpdGlvbiAgPSBhX3Bvc2l0aW9uO1xcbn1cXG5cIiIsImltcG9ydCB7IFZpZXcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9WaWV3JztcblxuZXhwb3J0IGNsYXNzIENvbnRyb2xsZXIgZXh0ZW5kcyBWaWV3XG57XG5cdGNvbnN0cnVjdG9yKGFyZ3MpXG5cdHtcblx0XHRzdXBlcihhcmdzKTtcblx0XHR0aGlzLnRlbXBsYXRlICA9IHJlcXVpcmUoJy4vY29udHJvbGxlci50bXAnKTtcblx0XHR0aGlzLmRyYWdTdGFydCA9IGZhbHNlO1xuXG5cdFx0dGhpcy5hcmdzLmRyYWdnaW5nICA9IGZhbHNlO1xuXHRcdHRoaXMuYXJncy54ID0gMDtcblx0XHR0aGlzLmFyZ3MueSA9IDA7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLm1vdmVTdGljayhldmVudCk7XG5cdFx0fSk7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5kcm9wU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5tb3ZlU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLmRyb3BTdGljayhldmVudCk7XG5cdFx0fSk7XG5cdH1cblxuXHRkcmFnU3RpY2soZXZlbnQpXG5cdHtcblx0XHRsZXQgcG9zID0gZXZlbnQ7XG5cblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0aWYoZXZlbnQudG91Y2hlcyAmJiBldmVudC50b3VjaGVzWzBdKVxuXHRcdHtcblx0XHRcdHBvcyA9IGV2ZW50LnRvdWNoZXNbMF07XG5cdFx0fVxuXG5cdFx0dGhpcy5hcmdzLmRyYWdnaW5nID0gdHJ1ZTtcblx0XHR0aGlzLmRyYWdTdGFydCAgICAgPSB7XG5cdFx0XHR4OiAgIHBvcy5jbGllbnRYXG5cdFx0XHQsIHk6IHBvcy5jbGllbnRZXG5cdFx0fTtcblx0fVxuXG5cdG1vdmVTdGljayhldmVudClcblx0e1xuXHRcdGlmKHRoaXMuYXJncy5kcmFnZ2luZylcblx0XHR7XG5cdFx0XHRsZXQgcG9zID0gZXZlbnQ7XG5cblx0XHRcdGlmKGV2ZW50LnRvdWNoZXMgJiYgZXZlbnQudG91Y2hlc1swXSlcblx0XHRcdHtcblx0XHRcdFx0cG9zID0gZXZlbnQudG91Y2hlc1swXTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hcmdzLnh4ID0gcG9zLmNsaWVudFggLSB0aGlzLmRyYWdTdGFydC54O1xuXHRcdFx0dGhpcy5hcmdzLnl5ID0gcG9zLmNsaWVudFkgLSB0aGlzLmRyYWdTdGFydC55O1xuXG5cdFx0XHRjb25zdCBsaW1pdCA9IDUwO1xuXG5cdFx0XHRpZih0aGlzLmFyZ3MueHggPCAtbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gLWxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZih0aGlzLmFyZ3MueHggPiBsaW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnggPSBsaW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnggPSB0aGlzLmFyZ3MueHg7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMuYXJncy55eSA8IC1saW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSAtbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHRoaXMuYXJncy55eSA+IGxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueSA9IGxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueSA9IHRoaXMuYXJncy55eTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRkcm9wU3RpY2soZXZlbnQpXG5cdHtcblx0XHR0aGlzLmFyZ3MuZHJhZ2dpbmcgPSBmYWxzZTtcblx0XHR0aGlzLmFyZ3MueCA9IDA7XG5cdFx0dGhpcy5hcmdzLnkgPSAwO1xuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcyA9IFxcXCJjb250cm9sbGVyXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImpveXN0aWNrXFxcIiBjdi1vbiA9IFxcXCJcXG5cXHRcXHR0b3VjaHN0YXJ0OmRyYWdTdGljayhldmVudCk7XFxuXFx0XFx0bW91c2Vkb3duOmRyYWdTdGljayhldmVudCk7XFxuXFx0XFxcIj5cXG5cXHRcXHQ8ZGl2IGNsYXNzID0gXFxcInBhZFxcXCIgc3R5bGUgPSBcXFwicG9zaXRpb246IHJlbGF0aXZlOyB0cmFuc2Zvcm06dHJhbnNsYXRlKFtbeF1dcHgsW1t5XV1weCk7XFxcIj48L2Rpdj5cXG5cXHQ8L2Rpdj5cXG5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImJ1dHRvblxcXCI+QTwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwiYnV0dG9uXFxcIj5CPC9kaXY+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJidXR0b25cXFwiPkM8L2Rpdj5cXG48L2Rpdj5cIiIsImltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGUnO1xuXG5leHBvcnQgY2xhc3MgRmxvb3Jcbntcblx0Y29uc3RydWN0b3IoZ2wyZCwgYXJncylcblx0e1xuXHRcdHRoaXMuZ2wyZCAgID0gZ2wyZDtcblx0XHR0aGlzLnNwcml0ZXMgPSBbXTtcblxuXHRcdC8vIHRoaXMucmVzaXplKDYwLCAzNCk7XG5cdFx0dGhpcy5yZXNpemUoOSwgOSk7XG5cdFx0Ly8gdGhpcy5yZXNpemUoNjAqMiwgMzQqMik7XG5cdH1cblxuXHRyZXNpemUod2lkdGgsIGhlaWdodClcblx0e1xuXHRcdHRoaXMud2lkdGggID0gd2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG5cblx0XHRmb3IobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKylcblx0XHR7XG5cdFx0XHRmb3IobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHNwcml0ZSA9IG5ldyBTcHJpdGUodGhpcy5nbDJkLCAnL2Zsb29yVGlsZS5wbmcnKTtcblxuXHRcdFx0XHRzcHJpdGUueCA9IDMyICogeDtcblx0XHRcdFx0c3ByaXRlLnkgPSAzMiAqIHk7XG5cblx0XHRcdFx0dGhpcy5zcHJpdGVzLnB1c2goc3ByaXRlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdHRoaXMuc3ByaXRlcy5tYXAocyA9PiBzLmRyYXcoKSk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuaW1wb3J0IHsgVGlsZXNldCB9IGZyb20gJy4uL3Nwcml0ZS9UaWxlc2V0JztcblxuZXhwb3J0IGNsYXNzIFRpbGVNYXBcbntcblx0Y29uc3RydWN0b3Ioe3NyY30pXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblx0XHR0aGlzLmltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0dGhpcy5zcmMgPSBzcmM7XG5cdFx0dGhpcy5waXhlbHMgPSBbXTtcblx0XHR0aGlzLnRpbGVDb3VudCA9IDA7XG5cblx0XHR0aGlzLmJhY2tncm91bmRDb2xvciA9IG51bGw7XG5cblx0XHR0aGlzLnByb3BlcnRpZXMgPSB7fTtcblxuXHRcdHRoaXMuY2FudmFzZXMgPSBuZXcgTWFwO1xuXHRcdHRoaXMuY29udGV4dHMgPSBuZXcgTWFwO1xuXG5cdFx0dGhpcy50aWxlTGF5ZXJzICAgPSBbXTtcblx0XHR0aGlzLmltYWdlTGF5ZXJzICA9IFtdO1xuXHRcdHRoaXMub2JqZWN0TGF5ZXJzID0gW107XG5cblx0XHR0aGlzLnhXb3JsZCA9IDA7XG5cdFx0dGhpcy55V29ybGQgPSAwO1xuXG5cdFx0dGhpcy53aWR0aCAgPSAwO1xuXHRcdHRoaXMuaGVpZ2h0ID0gMDtcblxuXHRcdHRoaXMudGlsZVdpZHRoICA9IDA7XG5cdFx0dGhpcy50aWxlSGVpZ2h0ID0gMDtcblxuXHRcdHRoaXMudGlsZVNldFdpZHRoICA9IDA7XG5cdFx0dGhpcy50aWxlU2V0SGVpZ2h0ID0gMDtcblxuXHRcdHRoaXMucmVhZHkgPSB0aGlzLmdldFJlYWR5KHNyYyk7XG5cblx0XHR0aGlzLmFuaW1hdGlvbnMgPSBuZXcgTWFwO1xuXHR9XG5cblx0YXN5bmMgZ2V0UmVhZHkoc3JjKVxuXHR7XG5cdFx0Y29uc3QgbWFwRGF0YSA9IGF3YWl0IChhd2FpdCBmZXRjaChzcmMpKS5qc29uKCk7XG5cblx0XHR0aGlzLnRpbGVMYXllcnMgICA9IG1hcERhdGEubGF5ZXJzLmZpbHRlcihsYXllciA9PiBsYXllci50eXBlID09PSAndGlsZWxheWVyJyk7XG5cdFx0dGhpcy5pbWFnZUxheWVycyAgPSBtYXBEYXRhLmxheWVycy5maWx0ZXIobGF5ZXIgPT4gbGF5ZXIudHlwZSA9PT0gJ2ltYWdlbGF5ZXInKTtcblx0XHR0aGlzLm9iamVjdExheWVycyA9IG1hcERhdGEubGF5ZXJzLmZpbHRlcihsYXllciA9PiBsYXllci50eXBlID09PSAnb2JqZWN0bGF5ZXInKTtcblxuXHRcdHRoaXMuYmFja2dyb3VuZENvbG9yID0gbWFwRGF0YS5iYWNrZ3JvdW5kY29sb3I7XG5cblx0XHRpZihtYXBEYXRhLnByb3BlcnRpZXMpXG5cdFx0Zm9yKGNvbnN0IHByb3BlcnR5IG9mIG1hcERhdGEucHJvcGVydGllcylcblx0XHR7XG5cdFx0XHR0aGlzLnByb3BlcnRpZXNbIHByb3BlcnR5Lm5hbWUgXSA9IHByb3BlcnR5LnZhbHVlO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMucHJvcGVydGllcy5iYWNrZ3JvdW5kQ29sb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLnByb3BlcnRpZXMuYmFja2dyb3VuZENvbG9yO1xuXHRcdH1cblxuXHRcdGNvbnN0IHRpbGVzZXRzID0gbWFwRGF0YS50aWxlc2V0cy5tYXAodCA9PiBuZXcgVGlsZXNldCh0KSk7XG5cblx0XHR0aGlzLndpZHRoICA9IG1hcERhdGEud2lkdGg7XG5cdFx0dGhpcy5oZWlnaHQgPSBtYXBEYXRhLmhlaWdodDtcblxuXHRcdHRoaXMudGlsZVdpZHRoICA9IG1hcERhdGEudGlsZXdpZHRoO1xuXHRcdHRoaXMudGlsZUhlaWdodCA9IG1hcERhdGEudGlsZWhlaWdodDtcblxuXHRcdGF3YWl0IFByb21pc2UuYWxsKHRpbGVzZXRzLm1hcCh0ID0+IHQucmVhZHkpKTtcblxuXHRcdHRoaXMuYXNzZW1ibGUodGlsZXNldHMpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRhc3NlbWJsZSh0aWxlc2V0cylcblx0e1xuXHRcdHRpbGVzZXRzLnNvcnQoKGEsIGIpID0+IGEuZmlyc3RHaWQgLSBiLmZpcnN0R2lkKTtcblxuXHRcdGNvbnN0IHRpbGVUb3RhbCA9IHRoaXMudGlsZUNvdW50ID0gdGlsZXNldHMucmVkdWNlKChhLCBiKSA9PiBhLnRpbGVDb3VudCArIGIudGlsZUNvdW50LCB7dGlsZUNvdW50OiAwfSk7XG5cblx0XHRjb25zdCBzaXplID0gTWF0aC5jZWlsKE1hdGguc3FydCh0aWxlVG90YWwpKTtcblxuXHRcdGNvbnN0IGRlc3RpbmF0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy50aWxlU2V0V2lkdGggID0gZGVzdGluYXRpb24ud2lkdGggID0gc2l6ZSAqIHRoaXMudGlsZVdpZHRoO1xuXHRcdHRoaXMudGlsZVNldEhlaWdodCA9IGRlc3RpbmF0aW9uLmhlaWdodCA9IE1hdGguY2VpbCh0aWxlVG90YWwgLyBzaXplKSAqIHRoaXMudGlsZUhlaWdodDtcblxuXHRcdGNvbnN0IGN0eERlc3RpbmF0aW9uID0gZGVzdGluYXRpb24uZ2V0Q29udGV4dCgnMmQnKTtcblxuXHRcdGxldCB4RGVzdGluYXRpb24gPSAwO1xuXHRcdGxldCB5RGVzdGluYXRpb24gPSAwO1xuXG5cdFx0Zm9yKGNvbnN0IHRpbGVzZXQgb2YgdGlsZXNldHMpXG5cdFx0e1xuXHRcdFx0bGV0IHhTb3VyY2UgPSAwO1xuXHRcdFx0bGV0IHlTb3VyY2UgPSAwO1xuXHRcdFx0Y29uc3QgaW1hZ2UgPSB0aWxlc2V0LmltYWdlO1xuXHRcdFx0Y29uc3Qgc291cmNlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0XHRcdHNvdXJjZS53aWR0aCA9IGltYWdlLndpZHRoO1xuXHRcdFx0c291cmNlLmhlaWdodCA9IGltYWdlLmhlaWdodDtcblxuXHRcdFx0Y29uc3QgY3R4U291cmNlID0gc291cmNlLmdldENvbnRleHQoJzJkJywge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pO1xuXG5cdFx0XHRjdHhTb3VyY2UuZHJhd0ltYWdlKGltYWdlLCAwLCAwKTtcblxuXHRcdFx0Zm9yKGxldCBpID0gMDsgaSA8IHRpbGVzZXQudGlsZUNvdW50OyBpKyspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHRpbGUgPSBjdHhTb3VyY2UuZ2V0SW1hZ2VEYXRhKHhTb3VyY2UsIHlTb3VyY2UsIHRoaXMudGlsZVdpZHRoLCB0aGlzLnRpbGVIZWlnaHQpO1xuXG5cdFx0XHRcdGN0eERlc3RpbmF0aW9uLnB1dEltYWdlRGF0YSh0aWxlLCB4RGVzdGluYXRpb24sIHlEZXN0aW5hdGlvbik7XG5cblx0XHRcdFx0eFNvdXJjZSArPSB0aGlzLnRpbGVXaWR0aDtcblx0XHRcdFx0eERlc3RpbmF0aW9uICs9IHRoaXMudGlsZVdpZHRoO1xuXG5cdFx0XHRcdGlmKHhTb3VyY2UgPj0gdGlsZXNldC5pbWFnZVdpZHRoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eFNvdXJjZSA9IDA7XG5cdFx0XHRcdFx0eVNvdXJjZSArPSB0aGlzLnRpbGVIZWlnaHQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZih4RGVzdGluYXRpb24gPj0gZGVzdGluYXRpb24ud2lkdGgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR4RGVzdGluYXRpb24gPSAwO1xuXHRcdFx0XHRcdHlEZXN0aW5hdGlvbiArPSB0aGlzLnRpbGVIZWlnaHQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnBpeGVscyA9IGN0eERlc3RpbmF0aW9uLmdldEltYWdlRGF0YSgwLCAwLCBkZXN0aW5hdGlvbi53aWR0aCwgZGVzdGluYXRpb24uaGVpZ2h0KS5kYXRhO1xuXG5cdFx0ZGVzdGluYXRpb24udG9CbG9iKGJsb2IgPT4ge1xuXHRcdFx0Y29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdHRoaXMuaW1hZ2Uub25sb2FkID0gKCkgPT4gVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuXHRcdFx0dGhpcy5pbWFnZS5zcmMgPSB1cmw7XG5cdFx0fSk7XG5cblx0XHRmb3IoY29uc3QgdGlsZXNldCBvZiB0aWxlc2V0cylcblx0XHR7XG5cdFx0XHRmb3IoY29uc3QgdGlsZURhdGEgb2YgdGlsZXNldC50aWxlcylcblx0XHRcdHtcblx0XHRcdFx0aWYodGlsZURhdGEuYW5pbWF0aW9uKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hbmltYXRpb25zLnNldCh0aWxlRGF0YS5pZCwgdGlsZURhdGEuYW5pbWF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZvcihjb25zdCBsYXllciBvZiB0aGlzLnRpbGVMYXllcnMpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0XHRjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJywge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pO1xuXG5cdFx0XHR0aGlzLmNhbnZhc2VzLnNldChsYXllciwgY2FudmFzKTtcblx0XHRcdHRoaXMuY29udGV4dHMuc2V0KGxheWVyLCBjb250ZXh0KTtcblxuXHRcdFx0Y29uc3QgdGlsZVZhbHVlcyA9IG5ldyBVaW50MzJBcnJheShsYXllci5kYXRhLm1hcCh0ID0+IDAgKyB0KSk7XG5cdFx0XHRjb25zdCB0aWxlUGl4ZWxzID0gbmV3IFVpbnQ4Q2xhbXBlZEFycmF5KHRpbGVWYWx1ZXMuYnVmZmVyKTtcblxuXHRcdFx0Zm9yKGNvbnN0IGkgaW4gdGlsZVZhbHVlcylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdGlsZSA9IHRpbGVWYWx1ZXNbaV07XG5cblx0XHRcdFx0aWYodGhpcy5hbmltYXRpb25zLmhhcyh0aWxlKSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHtpLCB0aWxlfSwgdGhpcy5hbmltYXRpb25zLmdldCh0aWxlKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Zm9yKGxldCBpID0gMzsgaSA8IHRpbGVQaXhlbHMubGVuZ3RoOyBpICs9NClcblx0XHRcdHtcblx0XHRcdFx0dGlsZVBpeGVsc1tpXSA9IDB4RkY7XG5cdFx0XHR9XG5cblx0XHRcdGNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGg7XG5cdFx0XHRjYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XG5cdFx0XHRjb250ZXh0LnB1dEltYWdlRGF0YShuZXcgSW1hZ2VEYXRhKHRpbGVQaXhlbHMsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSwgMCwgMCk7XG5cdFx0fVxuXHR9XG5cblx0Z2V0U2xpY2UoeCwgeSwgdywgaCwgdCA9IDApXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5jb250ZXh0cy52YWx1ZXMoKS5tYXAoY29udGV4dCA9PiBjb250ZXh0LmdldEltYWdlRGF0YSh4LCB5LCB3LCBoKS5kYXRhKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5pbXBvcnQgeyBUaWxlc2V0IH0gZnJvbSAnLi4vc3ByaXRlL1RpbGVzZXQnO1xuaW1wb3J0IHsgVGlsZU1hcCB9IGZyb20gJy4vVGlsZU1hcCc7XG5pbXBvcnQgeyBSZWN0YW5nbGUgfSBmcm9tICcuLi9tYXRoL1JlY3RhbmdsZSc7XG5pbXBvcnQgeyBTTVRyZWUgfSBmcm9tICcuLi9tYXRoL1NNVHJlZSc7XG5cbmV4cG9ydCBjbGFzcyBXb3JsZFxue1xuXHRjb25zdHJ1Y3Rvcih7c3JjfSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXHRcdHRoaXMucmVhZHkgPSB0aGlzLmdldFJlYWR5KHNyYyk7XG5cdFx0dGhpcy5tYXBzID0gW107XG5cdFx0dGhpcy5tVHJlZSA9IG5ldyBTTVRyZWU7XG5cdFx0dGhpcy5yZWN0TWFwID0gbmV3IE1hcDtcblx0fVxuXG5cdGFzeW5jIGdldFJlYWR5KHNyYylcblx0e1xuXHRcdGNvbnN0IHdvcmxkRGF0YSA9IGF3YWl0IChhd2FpdCBmZXRjaChzcmMpKS5qc29uKCk7XG5cdFx0cmV0dXJuIGF3YWl0IFByb21pc2UuYWxsKHdvcmxkRGF0YS5tYXBzLm1hcCgobSwgaSkgPT4ge1xuXHRcdFx0Y29uc3QgbWFwID0gbmV3IFRpbGVNYXAoe3NyYzogbS5maWxlTmFtZX0pO1xuXG5cdFx0XHRtYXAueFdvcmxkID0gbS54O1xuXHRcdFx0bWFwLnlXb3JsZCA9IG0ueTtcblx0XHRcdHRoaXMubWFwc1tpXSA9IG1hcDtcblxuXHRcdFx0Y29uc3QgcmVjdCA9IG5ldyBSZWN0YW5nbGUobS54LCBtLnksIG0ueCArIG0ud2lkdGgsIG0ueSArIG0uaGVpZ2h0KTtcblxuXHRcdFx0dGhpcy5yZWN0TWFwLnNldChyZWN0LCBtYXApO1xuXG5cdFx0XHR0aGlzLm1UcmVlLmFkZChyZWN0KTtcblxuXHRcdFx0cmV0dXJuIG1hcC5yZWFkeTtcblx0XHR9KSk7XG5cdH1cblxuXHRnZXRNYXBzRm9yUG9pbnQoeCwgeSlcblx0e1xuXHRcdGNvbnN0IHJlY3RzID0gdGhpcy5tVHJlZS5xdWVyeSh4LCB5LCB4LCB5KTtcblx0XHRjb25zdCBtYXBzID0gbmV3IFNldDtcblxuXHRcdGZvcihjb25zdCByZWN0IG9mIHJlY3RzKVxuXHRcdHtcblx0XHRcdGNvbnN0IG1hcCA9IHRoaXMucmVjdE1hcC5nZXQocmVjdCk7XG5cdFx0XHRtYXBzLmFkZChtYXApO1xuXHRcdH1cblxuXHRcdHJldHVybiBtYXBzO1xuXHR9XG5cblx0Z2V0TWFwc0ZvclJlY3QoeCwgeSwgdywgaClcblx0e1xuXHRcdGNvbnN0IHJlY3RzID0gdGhpcy5tVHJlZS5xdWVyeSh4ICsgLXcqMC41LCB5ICsgLWgqMC41LCB4ICsgdyowLjUsIHkgKyBoKjAuNSk7XG5cdFx0Y29uc3QgbWFwcyA9IG5ldyBTZXQ7XG5cblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgJiYgY29uc29sZS50aW1lKCdxdWVyeSBtYXBUcmVlJyk7XG5cblx0XHRmb3IoY29uc3QgcmVjdCBvZiByZWN0cylcblx0XHR7XG5cdFx0XHRjb25zdCBtYXAgPSB0aGlzLnJlY3RNYXAuZ2V0KHJlY3QpO1xuXHRcdFx0bWFwcy5hZGQobWFwKTtcblx0XHR9XG5cblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgJiYgY29uc29sZS50aW1lRW5kKCdxdWVyeSBtYXBUcmVlJyk7XG5cblx0XHRyZXR1cm4gbWFwcztcblx0fVxufVxuIiwiLyoganNoaW50IGlnbm9yZTpzdGFydCAqL1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgV2ViU29ja2V0ID0gd2luZG93LldlYlNvY2tldCB8fCB3aW5kb3cuTW96V2ViU29ja2V0O1xuICB2YXIgYnIgPSB3aW5kb3cuYnJ1bmNoID0gKHdpbmRvdy5icnVuY2ggfHwge30pO1xuICB2YXIgYXIgPSBiclsnYXV0by1yZWxvYWQnXSA9IChiclsnYXV0by1yZWxvYWQnXSB8fCB7fSk7XG4gIGlmICghV2ViU29ja2V0IHx8IGFyLmRpc2FibGVkKSByZXR1cm47XG4gIGlmICh3aW5kb3cuX2FyKSByZXR1cm47XG4gIHdpbmRvdy5fYXIgPSB0cnVlO1xuXG4gIHZhciBjYWNoZUJ1c3RlciA9IGZ1bmN0aW9uKHVybCl7XG4gICAgdmFyIGRhdGUgPSBNYXRoLnJvdW5kKERhdGUubm93KCkgLyAxMDAwKS50b1N0cmluZygpO1xuICAgIHVybCA9IHVybC5yZXBsYWNlKC8oXFwmfFxcXFw/KWNhY2hlQnVzdGVyPVxcZCovLCAnJyk7XG4gICAgcmV0dXJuIHVybCArICh1cmwuaW5kZXhPZignPycpID49IDAgPyAnJicgOiAnPycpICsnY2FjaGVCdXN0ZXI9JyArIGRhdGU7XG4gIH07XG5cbiAgdmFyIGJyb3dzZXIgPSBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCk7XG4gIHZhciBmb3JjZVJlcGFpbnQgPSBhci5mb3JjZVJlcGFpbnQgfHwgYnJvd3Nlci5pbmRleE9mKCdjaHJvbWUnKSA+IC0xO1xuXG4gIHZhciByZWxvYWRlcnMgPSB7XG4gICAgcGFnZTogZnVuY3Rpb24oKXtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQodHJ1ZSk7XG4gICAgfSxcblxuICAgIHN0eWxlc2hlZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICBbXS5zbGljZVxuICAgICAgICAuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdsaW5rW3JlbD1zdHlsZXNoZWV0XScpKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICB2YXIgdmFsID0gbGluay5nZXRBdHRyaWJ1dGUoJ2RhdGEtYXV0b3JlbG9hZCcpO1xuICAgICAgICAgIHJldHVybiBsaW5rLmhyZWYgJiYgdmFsICE9ICdmYWxzZSc7XG4gICAgICAgIH0pXG4gICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICBsaW5rLmhyZWYgPSBjYWNoZUJ1c3RlcihsaW5rLmhyZWYpO1xuICAgICAgICB9KTtcblxuICAgICAgLy8gSGFjayB0byBmb3JjZSBwYWdlIHJlcGFpbnQgYWZ0ZXIgMjVtcy5cbiAgICAgIGlmIChmb3JjZVJlcGFpbnQpIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGRvY3VtZW50LmJvZHkub2Zmc2V0SGVpZ2h0OyB9LCAyNSk7XG4gICAgfSxcblxuICAgIGphdmFzY3JpcHQ6IGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgc2NyaXB0cyA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnc2NyaXB0JykpO1xuICAgICAgdmFyIHRleHRTY3JpcHRzID0gc2NyaXB0cy5tYXAoZnVuY3Rpb24oc2NyaXB0KSB7IHJldHVybiBzY3JpcHQudGV4dCB9KS5maWx0ZXIoZnVuY3Rpb24odGV4dCkgeyByZXR1cm4gdGV4dC5sZW5ndGggPiAwIH0pO1xuICAgICAgdmFyIHNyY1NjcmlwdHMgPSBzY3JpcHRzLmZpbHRlcihmdW5jdGlvbihzY3JpcHQpIHsgcmV0dXJuIHNjcmlwdC5zcmMgfSk7XG5cbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgdmFyIGFsbCA9IHNyY1NjcmlwdHMubGVuZ3RoO1xuICAgICAgdmFyIG9uTG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2FkZWQgPSBsb2FkZWQgKyAxO1xuICAgICAgICBpZiAobG9hZGVkID09PSBhbGwpIHtcbiAgICAgICAgICB0ZXh0U2NyaXB0cy5mb3JFYWNoKGZ1bmN0aW9uKHNjcmlwdCkgeyBldmFsKHNjcmlwdCk7IH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHNyY1NjcmlwdHNcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oc2NyaXB0KSB7XG4gICAgICAgICAgdmFyIHNyYyA9IHNjcmlwdC5zcmM7XG4gICAgICAgICAgc2NyaXB0LnJlbW92ZSgpO1xuICAgICAgICAgIHZhciBuZXdTY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgICAgICBuZXdTY3JpcHQuc3JjID0gY2FjaGVCdXN0ZXIoc3JjKTtcbiAgICAgICAgICBuZXdTY3JpcHQuYXN5bmMgPSB0cnVlO1xuICAgICAgICAgIG5ld1NjcmlwdC5vbmxvYWQgPSBvbkxvYWQ7XG4gICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChuZXdTY3JpcHQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH07XG4gIHZhciBwb3J0ID0gYXIucG9ydCB8fCA5NDg1O1xuICB2YXIgaG9zdCA9IGJyLnNlcnZlciB8fCB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgfHwgJ2xvY2FsaG9zdCc7XG5cbiAgdmFyIGNvbm5lY3QgPSBmdW5jdGlvbigpe1xuICAgIHZhciBjb25uZWN0aW9uID0gbmV3IFdlYlNvY2tldCgnd3M6Ly8nICsgaG9zdCArICc6JyArIHBvcnQpO1xuICAgIGNvbm5lY3Rpb24ub25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgaWYgKGFyLmRpc2FibGVkKSByZXR1cm47XG4gICAgICB2YXIgbWVzc2FnZSA9IGV2ZW50LmRhdGE7XG4gICAgICB2YXIgcmVsb2FkZXIgPSByZWxvYWRlcnNbbWVzc2FnZV0gfHwgcmVsb2FkZXJzLnBhZ2U7XG4gICAgICByZWxvYWRlcigpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24oKXtcbiAgICAgIGlmIChjb25uZWN0aW9uLnJlYWR5U3RhdGUpIGNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25jbG9zZSA9IGZ1bmN0aW9uKCl7XG4gICAgICB3aW5kb3cuc2V0VGltZW91dChjb25uZWN0LCAxMDAwKTtcbiAgICB9O1xuICB9O1xuICBjb25uZWN0KCk7XG59KSgpO1xuLyoganNoaW50IGlnbm9yZTplbmQgKi9cbiJdfQ==