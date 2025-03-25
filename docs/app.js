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

require.register("import-mapper/ImportMapper.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "import-mapper");
  (function() {
    const globalImports = globalThis['##IMPORTS##'] = globalThis['##IMPORTS##'] ?? {};
const schema = 'data:application/javascript;charset=utf-8,';

const processIterable = Symbol('processRequires');
const forceDefault    = Symbol('forceDefault');

const wrapRequire   = (names, path) => schema + encodeURIComponent(`export const { ${names.join(',')} } = globalThis.require(${JSON.stringify(path)});`);
const wrapScalar    = (scalar)      => schema + encodeURIComponent(`export default ${JSON.stringify(scalar)};`);
const wrapSomething = (names, something) => {
	let type = typeof something;

	if(names[0] === forceDefault)
	{
		type = 'default-object';
	}

	const uuid = crypto.randomUUID();

	if(type === 'object')
	{
		globalImports[uuid] = something;
		return schema + encodeURIComponent(`export const { ${names.join(',')} } = globalThis['##IMPORTS##']['${uuid}'];`);
	}

	globalImports[uuid] = something;
	return schema + encodeURIComponent(`export default globalThis['##IMPORTS##']['${uuid}'];`);
};

module.exports.ImportMapper = class ImportMapper
{
	constructor(imports, options)
	{
		if(imports)
		{
			if(typeof imports[Symbol.iterator] !== 'function')
			{
				imports = Object.entries(imports);
			}

			Object.assign(this.imports = {}, this[processIterable](imports));
		}
	}

	add(name, module)
	{
		this.imports[name] = module;
	}

	generate()
	{
		const script  = document.createElement('script');
		const imports = this.imports;

		script.setAttribute('type', 'importmap');
		script.innerHTML = JSON.stringify({imports}, null, 4);
		return script;
	}

	register()
	{
		const importMap = this.generate();
		document.head.append(importMap);
		importMap.remove();
	}

	[processIterable](list)
	{
		const pairs = [...list].map(path => {

			if(Array.isArray(path) && path.length === 2)
			{
				let names = Object.keys(path[1]);

				if(typeof path[1] === 'object' && path[1][ forceDefault ])
				{
					path[1] = path[1][ forceDefault ];
					names   = [forceDefault];
				}

				return [path[0], wrapSomething(names, path[1])];
			}

			const stuff = globalThis.require(path);
			const names = Object.keys(stuff);

			if(!names.length)
			{
				return;
			}

			if(typeof stuff === 'object' || typeof stuff === 'function')
			{
				return [path, wrapRequire(names, path)];
			}
			else
			{
				return [path, wrapScalar(stuff)];
			}
		});

		return Object.fromEntries(pairs.filter(x => x));
	}

	static forceDefault(object)
	{
		return {[forceDefault]: object};
	}
}
  })();
});
require.register("Config.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = void 0;
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
let Config = exports.Config = /*#__PURE__*/_createClass(function Config() {
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
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Program = /*#__PURE__*/function () {
  function Program(_ref) {
    let gl = _ref.gl,
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
    for (const uniform of uniforms) {
      const location = gl.getUniformLocation(this.program, uniform);
      if (location === null) {
        console.warn(`Uniform ${uniform} not found.`);
        continue;
      }
      this.uniforms[uniform] = location;
    }
    for (const attribute of attributes) {
      const location = gl.getAttribLocation(this.program, attribute);
      if (location === null) {
        console.warn(`Attribute ${attribute} not found.`);
        continue;
      }
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
      this.attributes[attribute] = location;
      this.buffers[attribute] = buffer;
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
      const gl = this.context;
      for (var _len = arguments.length, floats = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        floats[_key - 1] = arguments[_key];
      }
      gl[`uniform${floats.length}f`](this.uniforms[name], ...floats);
    }
  }, {
    key: "uniformI",
    value: function uniformI(name) {
      const gl = this.context;
      for (var _len2 = arguments.length, ints = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        ints[_key2 - 1] = arguments[_key2];
      }
      gl[`uniform${ints.length}i`](this.uniforms[name], ...ints);
    }
  }]);
}();
let Gl2d = exports.Gl2d = /*#__PURE__*/function () {
  function Gl2d(element) {
    _classCallCheck(this, Gl2d);
    this.element = element || document.createElement('canvas');
    this.context = this.element.getContext('webgl');
  }
  return _createClass(Gl2d, [{
    key: "createShader",
    value: function createShader(location) {
      const extension = location.substring(location.lastIndexOf('.') + 1);
      let type = null;
      switch (extension.toUpperCase()) {
        case 'VERT':
          type = this.context.VERTEX_SHADER;
          break;
        case 'FRAG':
          type = this.context.FRAGMENT_SHADER;
          break;
      }
      const shader = this.context.createShader(type);
      const source = require(location);
      this.context.shaderSource(shader, source);
      this.context.compileShader(shader);
      const success = this.context.getShaderParameter(shader, this.context.COMPILE_STATUS);
      if (success) {
        return shader;
      }
      console.error(this.context.getShaderInfoLog(shader));
      this.context.deleteShader(shader);
    }
  }, {
    key: "createProgram",
    value: function createProgram(_ref2) {
      let vertexShader = _ref2.vertexShader,
        fragmentShader = _ref2.fragmentShader,
        uniforms = _ref2.uniforms,
        attributes = _ref2.attributes;
      const gl = this.context;
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
      const gl = this.context;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return texture;
    }
  }, {
    key: "createFramebuffer",
    value: function createFramebuffer(texture) {
      const gl = this.context;
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return framebuffer;
    }
  }, {
    key: "enableBlending",
    value: function enableBlending() {
      const gl = this.context;
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
    }
  }]);
}();
});

;require.register("home/View.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.View = void 0;
var _View = require("curvature/base/View");
var _Camera = require("../sprite/Camera");
var _OnScreenJoyPad = require("../ui/OnScreenJoyPad");
var _Keyboard = require("curvature/input/Keyboard");
var _Session = require("../session/Session");
var _Config = require("Config");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == typeof e || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
const Application = {};
Application.onScreenJoyPad = new _OnScreenJoyPad.OnScreenJoyPad();
Application.keyboard = _Keyboard.Keyboard.get();
let View = exports.View = /*#__PURE__*/function (_BaseView) {
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
    _this.args.joypad = Application.onScreenJoyPad;
    _this.args.fps = 0;
    _this.args.sps = 0;
    _this.args.camX = 0;
    _this.args.camY = 0;
    _this.args.showEditor = false;
    _this.keyboard.listening = true;
    _this.keyboard.keys.bindTo('Home', (v, k, t, d) => {
      if (!_this.session || v < 0) return;
      if (v % 5 === 0) {
        _this.session.frameLock++;
        _this.args.frameLock = _this.session.frameLock;
      }
    });
    _this.keyboard.keys.bindTo('End', (v, k, t, d) => {
      if (!_this.session || v < 0) return;
      if (v % 5 === 0) {
        _this.session.frameLock--;
        if (_this.session.frameLock < 0) {
          _this.session.frameLock = 0;
        }
        _this.args.frameLock = _this.session.frameLock;
      }
    });
    _this.keyboard.keys.bindTo('PageUp', (v, k, t, d) => {
      if (!_this.session || v < 0) return;
      if (v % 5 === 0) {
        _this.session.simulationLock++;
      }
      _this.args.simulationLock = _this.session.simulationLock;
    });
    _this.keyboard.keys.bindTo('PageDown', (v, k, t, d) => {
      if (!_this.session || v < 0) return;
      if (v % 5 === 0) {
        _this.session.simulationLock--;
        if (_this.session.simulationLock < 0) {
          _this.session.simulationLock = 0;
        }
      }
      _this.args.simulationLock = _this.session.simulationLock;
    });
    _this.keyboard.keys.bindTo('=', (v, k, t, d) => {
      if (v > 0) {
        _this.zoom(1);
      }
    });
    _this.keyboard.keys.bindTo('+', (v, k, t, d) => {
      if (v > 0) {
        _this.zoom(1);
      }
    });
    _this.keyboard.keys.bindTo('-', (v, k, t, d) => {
      if (v > 0) {
        _this.zoom(-1);
      }
    });
    _this.keyboard.keys.bindTo('0', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 0;
      }
    });
    _this.keyboard.keys.bindTo('1', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 1;
      }
    });
    _this.keyboard.keys.bindTo('2', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 2;
      }
    });
    _this.keyboard.keys.bindTo('3', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 3;
      }
    });
    _this.keyboard.keys.bindTo('4', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 4;
      }
    });
    _this.keyboard.keys.bindTo('5', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 5;
      }
    });
    _this.keyboard.keys.bindTo('6', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 6;
      }
    });
    _this.keyboard.keys.bindTo('7', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 7;
      }
    });
    _this.keyboard.keys.bindTo('8', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 8;
      }
    });
    _this.keyboard.keys.bindTo('9', (v, k, t, d) => {
      if (v > 0) {
        _this.session.spriteBoard.renderMode = 9;
      }
    });
    return _this;
  }
  _inherits(View, _BaseView);
  return _createClass(View, [{
    key: "onRendered",
    value: function onRendered() {
      this.session = new _Session.Session({
        onScreenJoyPad: this.args.joypad,
        keyboard: this.keyboard
        // , worldSrc: '/tile-world.world'
        ,
        worldSrc: '/compiled.world',
        element: this.tags.canvas.element
      });
      this.args.frameLock = this.session.frameLock;
      this.args.simulationLock = this.session.simulationLock;
      window.addEventListener('resize', () => this.resize());
      let fThen = 0;
      let sThen = 0;
      const simulate = now => {
        if (document.hidden) {
          return;
        }
        if (!this.session.simulate(now)) {
          return;
        }
        this.args.sps = (1000 / (now - sThen)).toFixed(3);
        sThen = now;
      };
      const draw = now => {
        if (document.hidden) {
          window.requestAnimationFrame(draw);
          return;
        }
        window.requestAnimationFrame(draw);
        if (!this.session.draw(now)) {
          return;
        }
        this.args.fps = (1000 / (now - fThen)).toFixed(3);
        this.args.camX = Number(_Camera.Camera.x).toFixed(3);
        this.args.camY = Number(_Camera.Camera.y).toFixed(3);
        fThen = now;
        if (this.session.spriteBoard.following) {
          this.args.posX = Number(this.session.spriteBoard.following.x).toFixed(3);
          this.args.posY = Number(this.session.spriteBoard.following.y).toFixed(3);
        }
      };
      this.session.spriteBoard.zoomLevel = document.body.clientHeight / 1280 * 1.5;
      this.resize();
      setInterval(() => simulate(performance.now()), 0);
      draw(performance.now());
    }
  }, {
    key: "resize",
    value: function resize(x, y) {
      const oldScale = this.session.spriteBoard.screenScale;
      this.session.spriteBoard.screenScale = document.body.clientHeight / 1280;
      this.session.spriteBoard.zoomLevel *= this.session.spriteBoard.screenScale / oldScale;
      this.args.width = this.tags.canvas.element.width = x || document.body.clientWidth;
      this.args.height = this.tags.canvas.element.height = y || document.body.clientHeight;
      this.args.rwidth = Math.trunc((x || document.body.clientWidth) / this.session.spriteBoard.zoomLevel);
      this.args.rheight = Math.trunc((y || document.body.clientHeight) / this.session.spriteBoard.zoomLevel);
      this.session.spriteBoard.resize();
    }
  }, {
    key: "scroll",
    value: function scroll(event) {
      this.zoom(-Math.sign(event.deltaY));
    }
  }, {
    key: "zoom",
    value: function zoom(delta) {
      if (!this.session) {
        return;
      }
      this.session.spriteBoard.zoom(delta);
    }
  }]);
}(_View.View);
});

;require.register("home/view.tmp.html", function(exports, require, module) {
module.exports = "<canvas\n\tcv-ref = \"canvas:curvature/base/Tag\"\n\tcv-on  = \"wheel:scroll(event):p;\"\n></canvas>\n\n<div class = \"hud fps\">[[sps]] simulations/s / [[simulationLock]]\n[[fps]] frames/s      / [[frameLock]]\n\nRes [[rwidth]] x [[rheight]]\n    [[width]] x [[height]]\n\nCam [[camX]] x [[camY]]\nPos [[posX]] x [[posY]]\n\n𝚫 Sim:   Pg Up / Dn\n𝚫 Frame: Home / End\n𝚫 Scale: + / -\n</div>\n<div class = \"reticle\"></div>\n\n[[joypad]]\n"
});

;require.register("initialize.js", function(exports, require, module) {
"use strict";

var _Router = require("curvature/base/Router");
var _View = require("home/View");
var _ImportMapper = require("import-mapper/ImportMapper");
const importMapper = new _ImportMapper.ImportMapper(globalThis.require.list());
const view = new _View.View();
_Router.Router.listen(view, {
  '*': function _() {
    // console.log(args);
  }
});
document.addEventListener('DOMContentLoaded', () => {
  importMapper.register();
  view.render(document.body);
});
});

require.register("inject/Container.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Container = void 0;
var _Injectable2 = require("./Injectable");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == typeof e || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
let Container = exports.Container = /*#__PURE__*/function (_Injectable) {
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
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == typeof e || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let classes = {};
let objects = {};
let Injectable = exports.Injectable = /*#__PURE__*/function () {
  function Injectable() {
    _classCallCheck(this, Injectable);
    let injections = this.constructor.injections();
    let context = this.constructor.context();
    if (!classes[context]) {
      classes[context] = {};
    }
    if (!objects[context]) {
      objects[context] = {};
    }
    for (let name in injections) {
      let injection = injections[name];
      if (classes[context][name] || !injection.prototype) {
        continue;
      }
      if (/[A-Z]/.test(String(name)[0])) {
        classes[context][name] = injection;
      }
    }
    for (let name in injections) {
      let instance = undefined;
      let injection = classes[context][name] || injections[name];
      if (/[A-Z]/.test(String(name)[0])) {
        if (injection.prototype) {
          if (!objects[context][name]) {
            objects[context][name] = new injection();
          }
        } else {
          objects[context][name] = injection;
        }
        instance = objects[context][name];
      } else {
        if (injection.prototype) {
          instance = new injection();
        } else {
          instance = injection;
        }
      }
      Object.defineProperty(this, name, {
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
      let _context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '.';
      if (!(this.prototype instanceof Injectable || this === Injectable)) {
        throw new Error(`Cannot access injectable subclass!

Are you trying to instantiate like this?

	new X.inject({...});

If so please try:

	new (X.inject({...}));

Please note the parenthesis.
`);
      }
      let existingInjections = this.injections();
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

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.single = exports.Single = void 0;
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
let Single = exports.Single = /*#__PURE__*/_createClass(function Single() {
  _classCallCheck(this, Single);
  this.name = 'sss.' + Math.random();
});
let single = exports.single = new Single();
});

require.register("input/Axis.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Axis = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Axis = exports.Axis = /*#__PURE__*/function () {
  function Axis(_ref) {
    let _ref$deadZone = _ref.deadZone,
      deadZone = _ref$deadZone === void 0 ? 0 : _ref$deadZone,
      _ref$proportional = _ref.proportional,
      proportional = _ref$proportional === void 0 ? true : _ref$proportional;
    _classCallCheck(this, Axis);
    _defineProperty(this, "magnitude", 0);
    _defineProperty(this, "delta", 0);
    if (deadZone) {
      this.proportional = proportional;
      this.deadZone = deadZone;
    }
  }
  return _createClass(Axis, [{
    key: "tilt",
    value: function tilt(magnitude) {
      if (this.deadZone && Math.abs(magnitude) >= this.deadZone) {
        magnitude = (Math.abs(magnitude) - this.deadZone) / (1 - this.deadZone) * Math.sign(magnitude);
      } else {
        magnitude = 0;
      }
      this.delta = Number(magnitude - this.magnitude).toFixed(3) - 0;
      this.magnitude = Number(magnitude).toFixed(3) - 0;
    }
  }, {
    key: "zero",
    value: function zero() {
      this.magnitude = this.delta = 0;
    }
  }]);
}();
});

;require.register("input/Button.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Button = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Button = exports.Button = /*#__PURE__*/function () {
  function Button() {
    _classCallCheck(this, Button);
    _defineProperty(this, "active", false);
    _defineProperty(this, "pressure", 0);
    _defineProperty(this, "delta", 0);
    _defineProperty(this, "time", 0);
  }
  return _createClass(Button, [{
    key: "update",
    value: function update() {
      let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      if (this.pressure) {
        this.time++;
      } else if (!this.pressure && this.time > 0) {
        this.time = -1;
      } else if (!this.pressure && this.time < 0) {
        this.time--;
      }
      if (this.time < -1 && this.delta === -1) {
        this.delta = 0;
      }
    }
  }, {
    key: "press",
    value: function press(pressure) {
      this.delta = Number(pressure - this.pressure).toFixed(3) - 0;
      this.pressure = Number(pressure).toFixed(3) - 0;
      this.active = true;
      this.time = this.time > 0 ? this.time : 0;
    }
  }, {
    key: "release",
    value: function release() {
      // if(!this.active)
      // {
      // 	return;
      // }

      this.delta = Number(-this.pressure).toFixed(3) - 0;
      this.pressure = 0;
      this.active = false;
    }
  }, {
    key: "zero",
    value: function zero() {
      this.pressure = this.delta = 0;
      this.active = false;
    }
  }]);
}();
});

;require.register("input/Controller.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Controller = void 0;
var _Axis = require("./Axis");
var _Button = require("./Button");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const keys = {
  'Space': 0,
  'Enter': 0,
  'NumpadEnter': 0,
  'ControlLeft': 1,
  'ControlRight': 1,
  'ShiftLeft': 2,
  'ShiftRight': 2,
  'KeyZ': 3,
  'KeyQ': 4,
  'KeyE': 5,
  'Digit1': 6,
  'Digit3': 7,
  'KeyBackspace': 8,
  'KeyW': 12,
  'KeyA': 14,
  'KeyS': 13,
  'KeyD': 15,
  'KeyH': 112,
  'KeyJ': 113,
  'KeyK': 114,
  'KeyL': 115,
  'KeyP': 1020,
  'KeyO': 1209,
  'Pause': 1020,
  'Tab': 11,
  'ArrowUp': 12,
  'ArrowDown': 13,
  'ArrowLeft': 14,
  'ArrowRight': 15,
  'KeyMeta': 16,
  'Numpad4': 112,
  'Numpad2': 113,
  'Numpad8': 114,
  'Numpad6': 115,
  'Backquote': 1010,
  'NumpadAdd': 1011,
  'NumpadSubtract': 1012,
  'NumpadMultiply': 1013,
  'NumpadDivide': 1014,
  'PageUp': 1022,
  'PageDown': 1023,
  'Home': 1024,
  'End': 1025,
  'Escape': [1020, 1050],
  'KeyB': 1201
};
[...Array(12)].map((x, fn) => keys[`F${fn}`] = 2000 + fn);
const axisMap = {
  12: -1,
  13: +1,
  14: -0,
  15: +0,
  112: -2,
  113: +3,
  114: -3,
  115: +2
};
const buttonMap = {
  '-6': 14,
  '+6': 15,
  '-7': 12,
  '+7': 13
};
const buttonRemap = {
  0: 1200,
  1: 1201,
  9: 1020,
  4: 1022,
  5: 1023
};
let Controller = exports.Controller = /*#__PURE__*/function () {
  function Controller(_ref) {
    let _ref$keys = _ref.keys,
      keys = _ref$keys === void 0 ? {} : _ref$keys,
      _ref$deadZone = _ref.deadZone,
      deadZone = _ref$deadZone === void 0 ? 0 : _ref$deadZone,
      _ref$gamepad = _ref.gamepad,
      gamepad = _ref$gamepad === void 0 ? null : _ref$gamepad,
      _ref$keyboard = _ref.keyboard,
      keyboard = _ref$keyboard === void 0 ? null : _ref$keyboard;
    _classCallCheck(this, Controller);
    this.deadZone = deadZone;
    Object.defineProperties(this, {
      buttons: {
        value: {}
      },
      pressure: {
        value: {}
      },
      axes: {
        value: {}
      },
      keys: {
        value: {}
      }
    });
  }
  return _createClass(Controller, [{
    key: "update",
    value: function update() {
      let _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        gamepad = _ref2.gamepad;
      for (const i in this.buttons) {
        const button = this.buttons[i];
        button.update();
      }
      if (gamepad && this.willRumble) {
        // let vibeFactor = 1;

        if (typeof this.willRumble !== 'object') {
          this.willRumble = {
            duration: 1000,
            strongMagnitude: 1.0,
            weakMagnitude: 1.0
          };
        }
        if (gamepad.id && String(gamepad.id).match(/playstation.{0,5}3/i)) {
          if (this.willRumble.duration < 100 && this.willRumble.strongMagnitude < 0.75) {
            this.willRumble.duration = 0;
            this.willRumble.weakMagnitude = 0;
            this.willRumble.strongMagnitude = 0;
          }
          const stopVibing = () => {
            if (this.willRumble) {
              return;
            }
            gamepad.vibrationActuator.playEffect("dual-rumble", {
              duration: 0,
              weakMagnitude: 0,
              strongMagnitude: 0
            });
          };
          setTimeout(stopVibing, this.willRumble.duration + -1);
        }

        // console.log({...this.willRumble, id: gamepad.id});

        if (gamepad.vibrationActuator && gamepad.vibrationActuator.playEffect) {
          gamepad.vibrationActuator.playEffect("dual-rumble", this.willRumble);
        }
        this.willRumble = false;
      }
    }
  }, {
    key: "rumble",
    value: function rumble() {
      let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
      this.willRumble = options;
    }
  }, {
    key: "readInput",
    value: function readInput(_ref3) {
      let keyboard = _ref3.keyboard,
        _ref3$gamepads = _ref3.gamepads,
        gamepads = _ref3$gamepads === void 0 ? [] : _ref3$gamepads;
      const tilted = {};
      const pressed = {};
      const released = {};
      const tookInput = new Set();
      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (!gamepad) {
          continue;
        }
        for (const i in gamepad.buttons) {
          const button = gamepad.buttons[i];
          if (button.pressed) {
            this.press(i, button.value);
            pressed[i] = true;
            tookInput.add(gamepad);
          }
        }
      }
      if (keyboard) {
        for (const i in [...Array(10)]) {
          if (pressed[i]) {
            continue;
          }
          if (keyboard.getKeyCode(i) > 0) {
            this.press(i, 1);
            pressed[i] = true;
            tookInput.add(keyboard);
          }
        }
        for (let keycode in keys) {
          if (pressed[keycode]) {
            continue;
          }
          let buttonIds = keys[keycode];
          if (!Array.isArray(buttonIds)) {
            buttonIds = keys[keycode] = [buttonIds];
          }
          for (const buttonId of buttonIds) {
            if (keyboard.getKeyCode(keycode) > 0) {
              this.press(buttonId, 1);
              pressed[buttonId] = true;
            }
          }
        }
      }
      for (const gamepad of gamepads) {
        if (!gamepad) {
          continue;
        }
        for (const i in gamepad.buttons) {
          if (released[i]) {
            continue;
          }
          if (pressed[i]) {
            continue;
          }
          const button = gamepad.buttons[i];
          if (this.buttons[i] && !button.pressed && this.buttons[i].active) {
            this.release(i);
            released[i] = true;
          }
        }
      }
      if (keyboard) {
        for (const i in [...Array(10)]) {
          if (released[i]) {
            continue;
          }
          if (pressed[i]) {
            continue;
          }
          if (keyboard.getKeyCode(i) < 0) {
            this.release(i);
            released[i] = true;
          }
        }
        for (let keycode in keys) {
          let buttonIds = keys[keycode];
          if (!Array.isArray(buttonIds)) {
            buttonIds = keys[keycode] = [buttonIds];
          }
          for (const buttonId of buttonIds) {
            if (released[buttonId]) {
              continue;
            }
            if (pressed[buttonId]) {
              continue;
            }
            if (keyboard.getKeyCode(keycode) < 0) {
              this.release(buttonId);
              released[keycode] = true;
            }
          }
        }
      }
      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (!gamepad) {
          continue;
        }
        for (const i in gamepad.axes) {
          const axis = gamepad.axes[i];
          if (Math.abs(axis) < this.deadZone) {
            if (!tilted[i]) {
              this.tilt(i, 0);
            }
            continue;
          }
          tilted[i] = true;
          this.tilt(i, axis);
        }
      }
      for (let inputId in axisMap) {
        if (!this.buttons[inputId]) {
          this.buttons[inputId] = new _Button.Button();
        }
        const axis = axisMap[inputId];
        const value = Math.sign(1 / axis);
        const axisId = Math.abs(axis);
        if (tilted[axisId]) {
          continue;
        }
        if (this.buttons[inputId].active) {
          tilted[axisId] = true;
          this.tilt(axisId, value);
        } else if (!tilted[axisId]) {
          this.tilt(axisId, 0);
        }
      }
      for (let axisMove in buttonMap) {
        const buttonId = buttonMap[axisMove];
        if (released[buttonId]) {
          continue;
        }
        if (pressed[buttonId]) {
          continue;
        }
        const _ref4 = [axisMove.slice(0, 1), axisMove.slice(1)],
          move = _ref4[0],
          axisId = _ref4[1];
        if (!this.axes[axisId]) {
          this.axes[axisId] = new _Axis.Axis({
            deadZone: this.deadZone
          });
        }
        const axis = this.axes[axisId];
        if (axis.magnitude && Math.sign(axisMove) !== Math.sign(axis.magnitude)) {
          continue;
        }
        const pressure = Math.abs(axis.magnitude);
        if (pressure) {
          this.press(buttonId, pressure);
          pressed[buttonId] = true;
        } else {
          this.release(buttonId, pressure);
          released[buttonId] = true;
        }
      }
      for (const concreteId in buttonRemap) {
        const abstractId = buttonRemap[concreteId];
        if (released[abstractId]) {
          continue;
        }
        if (pressed[abstractId]) {
          continue;
        }
        if (!this.buttons[abstractId]) {
          this.buttons[abstractId] = new _Button.Button();
        }
        if (!this.buttons[concreteId]) {
          this.buttons[concreteId] = new _Button.Button();
        }
        if (this.buttons[concreteId].active) {
          this.press(abstractId, this.buttons[concreteId].pressure);
          pressed[abstractId] = true;
        } else if (!pressed[abstractId]) {
          this.release(abstractId, this.buttons[concreteId].pressure);
          released[abstractId] = true;
        }
      }
      return tookInput;
    }
  }, {
    key: "tilt",
    value: function tilt(axisId, magnitude) {
      if (!this.axes[axisId]) {
        this.axes[axisId] = new _Axis.Axis({
          deadZone: this.deadZone
        });
      }
      this.axes[axisId].tilt(magnitude);
    }
  }, {
    key: "press",
    value: function press(buttonId) {
      let pressure = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      if (!this.buttons[buttonId]) {
        this.buttons[buttonId] = new _Button.Button();
      }
      this.buttons[buttonId].press(pressure);
    }
  }, {
    key: "release",
    value: function release(buttonId) {
      if (!this.buttons[buttonId]) {
        this.buttons[buttonId] = new _Button.Button();
      }
      this.buttons[buttonId].release();
    }
  }, {
    key: "serialize",
    value: function serialize() {
      const buttons = {};
      for (const i in this.buttons) {
        buttons[i] = this.buttons[i].pressure;
      }
      const axes = {};
      for (const i in this.axes) {
        axes[i] = this.axes[i].magnitude;
      }
      return {
        axes: axes,
        buttons: buttons
      };
    }
  }, {
    key: "replay",
    value: function replay(input) {
      if (input.buttons) {
        for (const i in input.buttons) {
          if (input.buttons[i] > 0) {
            this.press(i, input.buttons[i]);
          } else {
            this.release(i);
          }
        }
      }
      if (input.axes) {
        for (const i in input.axes) {
          if (input.axes[i].magnitude !== input.axes[i]) {
            this.tilt(i, input.axes[i]);
          }
        }
      }
    }
  }, {
    key: "zero",
    value: function zero() {
      for (const i in this.axes) {
        this.axes[i].zero();
      }
      for (const i in this.buttons) {
        this.buttons[i].zero();
      }
    }
  }, {
    key: "buttonIsMapped",
    value: function buttonIsMapped(buttonId) {
      return buttonId in buttonRemap;
    }
  }, {
    key: "keyIsMapped",
    value: function keyIsMapped(keyCode) {
      return keyCode in keys;
    }
  }]);
}();
});

;require.register("math/Geometry.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Geometry = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Geometry = exports.Geometry = /*#__PURE__*/function () {
  function Geometry() {
    _classCallCheck(this, Geometry);
  }
  return _createClass(Geometry, null, [{
    key: "lineIntersectsLine",
    value: function lineIntersectsLine(x1a, y1a, x2a, y2a, x1b, y1b, x2b, y2b) {
      const ax = x2a - x1a;
      const ay = y2a - y1a;
      const bx = x2b - x1b;
      const by = y2b - y1b;
      const crossProduct = ax * by - ay * bx;

      // Parallel Lines cannot intersect
      if (crossProduct === 0) {
        return false;
      }
      const cx = x1b - x1a;
      const cy = y1b - y1a;

      // Is our point within the bounds of line a?
      const d = (cx * ay - cy * ax) / crossProduct;
      if (d < 0 || d > 1) {
        return false;
      }

      // Is our point within the bounds of line b?
      const e = (cx * by - cy * bx) / crossProduct;
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
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Matrix = exports.Matrix = /*#__PURE__*/function () {
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
      const s = Math.sin(theta);
      const c = Math.cos(theta);
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
      const output = Array(matA.length).fill().map(() => Array(matB[0].length).fill(0));
      for (let i = 0; i < matA.length; i++) {
        for (let j = 0; j < matB[0].length; j++) {
          for (let k = 0; k < matA[0].length; k++) {
            output[i][j] += matA[i][k] * matB[k][j];
          }
        }
      }
      return output;
    }
  }, {
    key: "composite",
    value: function composite() {
      let output = this.identity();
      for (let i = 0; i < arguments.length; i++) {
        output = this.multiply(output, i < 0 || arguments.length <= i ? undefined : arguments[i]);
      }
      return output;
    }
  }, {
    key: "transform",
    value: function transform(points, matrix) {
      const output = [];
      for (let i = 0; i < points.length; i += 2) {
        const point = [points[i], points[i + 1], 1];
        for (const row of matrix) {
          output.push(point[0] * row[0] + point[1] * row[1] + point[2] * row[2]);
        }
      }
      return new Float32Array(output.filter((_, k) => (1 + k) % 3));
    }
  }]);
}();
});

;require.register("math/MotionGraph.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MotionGraph = void 0;
var _Entity = require("../model/Entity");
var _Region = require("../sprite/Region");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let MotionGraph = exports.MotionGraph = /*#__PURE__*/function () {
  function MotionGraph() {
    _classCallCheck(this, MotionGraph);
    _defineProperty(this, "backmap", new WeakMap());
    _defineProperty(this, "entities", new Map());
  }
  return _createClass(MotionGraph, [{
    key: "add",
    value: function add(entity, parent) {
      if (this.backmap.has(entity)) {
        this.entities.get(this.backmap.get(entity)).delete(entity);
      }
      if (!this.entities.has(parent)) {
        this.entities.set(parent, new Set());
      }
      this.entities.get(parent).add(entity);
      this.backmap.set(entity, parent);
      if (!this.constructor.globalMap.has(entity)) {
        this.constructor.globalMap.set(entity, new Set());
      }
      this.constructor.globalMap.get(entity).add(this);
    }
  }, {
    key: "getParent",
    value: function getParent(entity) {
      return this.backmap.get(entity);
    }
  }, {
    key: "delete",
    value: function _delete(entity) {
      if (!this.backmap.has(entity)) {
        return;
      }
      this.entities.get(this.backmap.get(entity)).delete(entity);
      this.backmap.delete(entity);
    }
  }, {
    key: "moveChildren",
    value: function moveChildren(entity, x, y) {
      if (!this.entities.has(entity)) {
        return new Set();
      }
      if (x === 0 && y === 0) {
        return new Set();
      }
      let children = this.entities.get(entity);
      for (const child of children) {
        if (entity.session.removed.has(child)) {
          continue;
        }
        child.x += x;
        child.y += y;
        const maps = entity.session.world.getMapsForPoint(child.x, child.y);
        if (child instanceof _Entity.Entity) {
          maps.forEach(map => map.moveEntity(child));
        } else if (child instanceof _Region.Region) {
          maps.forEach(map => map.regionTree.move(child.rect));
        }
        this.moveChildren(child, x, y);
      }
      return children;
    }
  }], [{
    key: "deleteFromAllGraphs",
    value: function deleteFromAllGraphs(entity) {
      if (!this.globalMap.has(entity)) {
        return;
      }
      const graphs = this.globalMap.get(entity);
      for (const graph of graphs) {
        graph.delete(entity);
      }
    }
  }]);
}();
_defineProperty(MotionGraph, "globalMap", new WeakMap());
});

;require.register("math/QuadTree.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QuadTree = void 0;
var _Bindable = require("curvature/base/Bindable");
var _Rectangle2 = require("./Rectangle");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == typeof e || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
let QuadTree = exports.QuadTree = /*#__PURE__*/function (_Rectangle) {
  function QuadTree(x1, y1, x2, y2) {
    var _this;
    let minSize = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
    let parent = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
    _classCallCheck(this, QuadTree);
    _this = _callSuper(this, QuadTree, [x1, y1, x2, y2]);
    _this[_Bindable.Bindable.Prevent] = true;
    _this.items = new Set();
    _this.split = false;
    _this.minSize = minSize || 10;
    _this.backMap = parent ? parent.backMap : new Map();
    _this.parent = parent;
    _this.ulCell = null;
    _this.urCell = null;
    _this.blCell = null;
    _this.brCell = null;
    _this.count = 0;
    return _this;
  }
  _inherits(QuadTree, _Rectangle);
  return _createClass(QuadTree, [{
    key: "add",
    value: function add(entity) {
      let xOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      let yOffset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      if (!this.contains(entity.x + xOffset, entity.y + yOffset)) {
        if (!this.parent) {
          console.warn('No QuadTree cell found!');
        }
        return false;
      }
      const xSize = this.x2 - this.x1;
      const ySize = this.y2 - this.y1;
      if (this.split) {
        return this.ulCell.add(entity, xOffset, yOffset) || this.urCell.add(entity, xOffset, yOffset) || this.blCell.add(entity, xOffset, yOffset) || this.brCell.add(entity, xOffset, yOffset);
      } else if (this.items.size && xSize > this.minSize && ySize > this.minSize) {
        this.split = true;
        const xSizeHalf = 0.5 * xSize;
        const ySizeHalf = 0.5 * ySize;
        this.ulCell = new QuadTree(this.x1, this.y1, this.x1 + xSizeHalf, this.y1 + ySizeHalf, this.minSize, this);
        this.blCell = new QuadTree(this.x1, this.y1 + ySizeHalf, this.x1 + xSizeHalf, this.y2, this.minSize, this);
        this.urCell = new QuadTree(this.x1 + xSizeHalf, this.y1, this.x2, this.y1 + ySizeHalf, this.minSize, this);
        this.brCell = new QuadTree(this.x1 + xSizeHalf, this.y1 + ySizeHalf, this.x2, this.y2, this.minSize, this);
        let parent = this;
        while (parent) {
          parent.count -= this.items.size;
          parent = parent.parent;
        }
        for (const item of this.items) {
          let parent = this;
          let added = false;
          while (parent) {
            added = parent.ulCell.add(item, xOffset, yOffset) || parent.urCell.add(item, xOffset, yOffset) || parent.blCell.add(item, xOffset, yOffset) || parent.brCell.add(item, xOffset, yOffset);
            if (added) break;
            parent = parent.parent;
          }
          if (!added) {
            console.warn('Bad split!');
          }
          this.items.delete(item);
        }
        return this.ulCell.add(entity, xOffset, yOffset) || this.urCell.add(entity, xOffset, yOffset) || this.blCell.add(entity, xOffset, yOffset) || this.brCell.add(entity, xOffset, yOffset);
      } else {
        if (!this.items.has(entity)) {
          let parent = this;
          while (parent) {
            parent.count++;
            parent = parent.parent;
          }
        }
        this.backMap.set(entity, this);
        this.items.add(entity);
        return true;
      }
    }
  }, {
    key: "move",
    value: function move(entity) {
      let xOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      let yOffset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      if (!this.backMap.has(entity)) {
        // console.warn('Entity not in QuadTree.');
        return this.add(entity, xOffset, yOffset);
      }
      const startCell = this.backMap.get(entity);
      let cell = startCell;
      while (cell && !cell.contains(entity.x + xOffset, entity.y + yOffset)) {
        cell = cell.parent;
      }
      if (!cell) {
        console.warn('No QuadTree cell found!');
        startCell.delete(entity);
        return false;
      }
      if (cell !== startCell) {
        startCell.delete(entity);
        cell.add(entity, xOffset, yOffset);
      }
      return true;
    }
  }, {
    key: "delete",
    value: function _delete(entity) {
      if (!this.backMap.has(entity)) {
        console.warn('Entity not in QuadTree.');
        return false;
      }
      const cell = this.backMap.get(entity);
      cell.items.delete(entity);
      if (cell.parent) {
        cell.parent.prune();
      }
      this.backMap.delete(entity);
      let parent = cell;
      while (parent) {
        parent.count--;
        parent = parent.parent;
      }
      return true;
    }
  }, {
    key: "isPrunable",
    value: function isPrunable() {
      if (this.split) {
        return this.ulCell.isPrunable() && this.urCell.isPrunable() && this.blCell.isPrunable() && this.brCell.isPrunable();
      } else {
        return this.items.size === 0;
      }
    }
  }, {
    key: "prune",
    value: function prune() {
      if (!this.isPrunable()) {
        return false;
      }
      this.split = false;
      this.ulCell = null;
      this.urCell = null;
      this.blCell = null;
      this.brCell = null;
      return true;
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
    value: function select(x1, y1, x2, y2) {
      if (x1 > this.x2 || x2 < this.x1) {
        return new Set();
      }
      if (y1 > this.y2 || y2 < this.y1) {
        return new Set();
      }
      if (this.split) {
        return new Set([...this.ulCell.select(x1, y1, x2, y2), ...this.urCell.select(x1, y1, x2, y2), ...this.blCell.select(x1, y1, x2, y2), ...this.brCell.select(x1, y1, x2, y2)]);
      }
      return new Set(this.items);
    }
  }, {
    key: "dump",
    value: function dump() {
      if (this.split) {
        return new Set([...this.ulCell.dump(), ...this.urCell.dump(), ...this.blCell.dump(), ...this.brCell.dump()]);
      }
      return new Set(this.items);
    }
  }]);
}(_Rectangle2.Rectangle);
});

;require.register("math/QuickTree.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QuickTree = void 0;
var _QuadTree2 = require("./QuadTree");
var _Rectangle = require("./Rectangle");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == typeof e || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _superPropGet(t, o, e, r) { var p = _get(_getPrototypeOf(1 & r ? t.prototype : t), o, e); return 2 & r && "function" == typeof p ? function (t) { return p.apply(e, t); } : p; }
function _get() { return _get = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function (e, t, r) { var p = _superPropBase(e, t); if (p) { var n = Object.getOwnPropertyDescriptor(p, t); return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value; } }, _get.apply(null, arguments); }
function _superPropBase(t, o) { for (; !{}.hasOwnProperty.call(t, o) && null !== (t = _getPrototypeOf(t));); return t; }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
const registry = new WeakMap();
let QuickTree = exports.QuickTree = /*#__PURE__*/function (_QuadTree) {
  function QuickTree() {
    _classCallCheck(this, QuickTree);
    return _callSuper(this, QuickTree, arguments);
  }
  _inherits(QuickTree, _QuadTree);
  return _createClass(QuickTree, [{
    key: "add",
    value: function add(entity) {
      let xOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      let yOffset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      if (!_superPropGet(QuickTree, "add", this, 3)([entity, xOffset, yOffset])) {
        if (!this.parent) {
          console.warn('Failed to add object to QuickTree.');
        }
        return;
      }
      if (!registry.has(entity)) {
        registry.set(entity, new Set());
      }
      registry.get(entity).add(this);
    }
  }, {
    key: "delete",
    value: function _delete(entity) {
      if (!_superPropGet(QuickTree, "delete", this, 3)([entity])) {
        return;
      }
      if (registry.has(entity)) {
        registry.get(entity).delete(this);
      }
    }
  }, {
    key: "select",
    value: function select(x1, y1, x2, y2) {
      let xO = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
      let yO = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
      const selectRect = new _Rectangle.Rectangle(x1, y1, x2, y2);
      const result = _superPropGet(QuickTree, "select", this, 3)([x1, y1, x2, y2]);
      for (const entity of result) {
        if (!selectRect.contains(entity.x + xO, entity.y + yO)) {
          result.delete(entity);
        }
      }
      return result;
    }
  }], [{
    key: "deleteFromAllTrees",
    value: function deleteFromAllTrees(entity) {
      if (!registry.has(entity)) {
        return;
      }
      registry.get(entity).forEach(tree => tree.delete(entity));
    }
  }]);
}(_QuadTree2.QuadTree);
});

;require.register("math/Ray.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Ray = void 0;
var _Geometry = require("./Geometry");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Ray = exports.Ray = /*#__PURE__*/function () {
  function Ray() {
    _classCallCheck(this, Ray);
  }
  return _createClass(Ray, null, [{
    key: "cast",
    value: function cast(world, startX, startY, layerId, angle) {
      let maxDistance = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 320;
      let rayFlags = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : this.DEFAULT_FLAGS;
      const terrain = this.castTerrain(world, startX, startY, layerId, angle, maxDistance, rayFlags);
      const entities = this.castEntity(world, startX, startY, layerId, angle, maxDistance, rayFlags);
      return {
        terrain: terrain,
        entities: entities
      };
    }
  }, {
    key: "castEntity",
    value: function castEntity(world, startX, startY, layerId, angle, maxDistance) {
      let rayFlags = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : this.DEFAULT_FLAGS;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const endX = startX + (Math.abs(cos) > Number.EPSILON ? cos : 0) * maxDistance;
      const endY = startY + (Math.abs(sin) > Number.EPSILON ? sin : 0) * maxDistance;
      const centerX = (startX + endX) * 0.5;
      const centerY = (startY + endY) * 0.5;
      const sizeX = Math.max(320, Math.abs(startX - endX));
      const sizeY = Math.max(320, Math.abs(startY - endY));
      const candidates = world.getEntitiesForRect(centerX, centerY, sizeX, sizeY);
      const collisions = new Map();
      for (const candidate of candidates) {
        const points = candidate.rect.toLines();
        for (let i = 0; i < points.length; i += 4) {
          const x1 = points[i + 0];
          const y1 = points[i + 1];
          const x2 = points[i + 2];
          const y2 = points[i + 3];
          const intersection = _Geometry.Geometry.lineIntersectsLine(x1, y1, x2, y2, startX, startY, endX, endY);
          if (intersection) {
            if (collisions.has(candidate)) {
              const existing = collisions.get(candidate);
              if (Math.hypot(startX - intersection[0], startY - intersection[1]) < Math.hypot(startX - existing[0], startY - existing[1])) {
                collisions.set(candidate, intersection);
              }
            } else {
              collisions.set(candidate, intersection);
            }
          }
        }
      }
      return collisions;
    }
  }, {
    key: "castTerrain",
    value: function castTerrain(world, startX, startY, layerId, angle) {
      let maxDistance = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 320;
      let rayFlags = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : this.DEFAULT_FLAGS;
      maxDistance = Math.ceil(maxDistance);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const endX = startX + (Math.abs(cos) > Number.EPSILON ? cos : 0) * maxDistance;
      const endY = startY + (Math.abs(sin) > Number.EPSILON ? sin : 0) * maxDistance;
      const bs = 32;
      const dx = endX - startX;
      const dy = endY - startY;
      const ox = Math.sign(dx);
      const oy = Math.sign(dy);
      const sx = dx ? Math.hypot(1, dy / dx) : 0;
      const sy = dy ? Math.hypot(1, dx / dy) : 0;
      let currentDistance = 0;
      if (world.getSolid(startX, startY, layerId)) {
        return [startX, startY];
      }
      const startTile = world.getCollisionTile(startX, startY, layerId);
      const initMode = startTile === null ? 0 : 1;
      let modeX = initMode;
      let modeY = initMode;
      let oldModeX = false;
      let oldModeY = false;
      let bf = initMode ? 1 : 1;
      const ax = ox > 0 ? bs - startX % bs : startX % bs + 1;
      const ay = oy > 0 ? bs - startY % bs : startY % bs + 1;
      let checkX = initMode ? 0 : ax;
      let checkY = initMode ? 0 : ay;
      let rayX = checkX * sx * ox;
      let rayY = checkY * sy * oy;
      const solidsX = new Set();
      const solidsY = new Set();
      window.logPoints && console.time('rayCast');
      let iterations = 0;
      while (Math.abs(currentDistance) < maxDistance && !solidsX.size && !solidsY.size) {
        if (ox && (!oy || Math.abs(rayX) < Math.abs(rayY))) {
          const mag = Math.abs(rayX);
          let px = startX + mag * cos;
          let py = startY + mag * sin;
          if (ox >= 0 && px % 1 > 0.99999) px = Math.round(px);
          if (oy >= 0 && py % 1 > 0.99999) py = Math.round(py);
          if (ox <= 0 && px % 1 < 0.00001) px = Math.round(px);
          if (oy <= 0 && py % 1 < 0.00001) py = Math.round(py);
          oldModeX = modeX;
          modeX = world.getCollisionTile(px, py, layerId);
          bf = modeX ? 1 : bs;
          if (!modeX && oldModeX) {
            bf = ox < 0 ? (startX + -checkX + 1) % bs : bs - (startX + checkX) % bs;
          }
          if (world.getSolid(px, py, layerId)) {
            solidsX.add([px, py]);
            break;
          }
          currentDistance = Math.abs(rayX);
          checkX += bf;
          rayX = checkX * sx * ox;
        } else {
          const mag = Math.abs(rayY);
          let px = startX + mag * cos;
          let py = startY + mag * sin;
          if (ox >= 0 && px % 1 > 0.99999) px = Math.round(px);
          if (oy >= 0 && py % 1 > 0.99999) py = Math.round(py);
          if (ox <= 0 && px % 1 < 0.00001) px = Math.round(px);
          if (oy <= 0 && py % 1 < 0.00001) py = Math.round(py);
          oldModeY = modeY;
          modeY = world.getCollisionTile(px, py, layerId);
          bf = modeY ? 1 : bs;
          if (!modeY && oldModeY) {
            bf = oy < 0 ? (startY + -checkY + 1) % bs : bs - (startY + checkY) % bs;
          }
          if (world.getSolid(px, py, layerId)) {
            solidsY.add([px, py]);
            break;
          }
          currentDistance = Math.abs(rayY);
          checkY += bf;
          rayY = checkY * sy * oy;
        }
        iterations++;
      }
      const points = [...solidsX, ...solidsY];
      if (rayFlags & this.ALL_POINTS) {
        return new solidsX.union(solidsY);
      }
      const distSquares = points.map(s => Math.pow(s[0] - startX, 2) + Math.pow(s[1] - startY, 2));
      const minDistSq = Math.min(...distSquares);
      const nearest = points[distSquares.indexOf(minDistSq)];
      if (nearest) {
        if (ox > 0 && nearest[0] % 1 > 0.99999) nearest[0] = Math.round(nearest[0]);
        if (ox < 0 && nearest[0] % 1 < 0.00001) nearest[0] = Math.round(nearest[0]);
        if (oy > 0 && nearest[1] % 1 > 0.99999) nearest[1] = Math.round(nearest[1]);
        if (oy < 0 && nearest[1] % 1 < 0.00001) nearest[1] = Math.round(nearest[1]);
      }
      if (Math.sqrt(minDistSq) > maxDistance) {
        return;
      }
      if (rayFlags & this.T_LAST_EMPTY) {
        if (!nearest) {
          return;
        }
        return [nearest[0] + -cos * Math.sign(rayX), nearest[1] + -sin * Math.sign(rayY)];
      }
      return nearest;
    }
  }]);
}();
_defineProperty(Ray, "T_LAST_EMPTY", 1);
_defineProperty(Ray, "T_ALL_POINTS", 2);
// static E_ALL_ENTITIES = 0b0000_0001_0000_0000;
_defineProperty(Ray, "DEFAULT_FLAGS", 0);
});

;require.register("math/Rectangle.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Rectangle = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Rectangle = exports.Rectangle = /*#__PURE__*/function () {
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
    key: "isOverlapping",
    value: function isOverlapping(other) {
      if (this.x1 >= other.x2 || other.x1 >= this.x2) {
        return false;
      }
      if (this.y1 >= other.y2 || other.y1 >= this.y2) {
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
    key: "toLines",
    value: function toLines() {
      return [this.x1, this.y1, this.x2, this.y1,
      // Top
      this.x2, this.y1, this.x2, this.y2,
      // Right
      this.x1, this.y2, this.x2, this.y2,
      // Bottom
      this.x1, this.y1, this.x1, this.y2 // Left
      ];
    }
  }, {
    key: "toTriangles",
    value: function toTriangles() {
      let dim = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 2;
      if (dim === 2) {
        return [this.x1, this.y1, this.x2, this.y1, this.x1, this.y2, this.x1, this.y2, this.x2, this.y1, this.x2, this.y2];
      }
      if (dim === 3) {
        return [this.x1, this.y1, 1, this.x2, this.y1, 1, this.x1, this.y2, 1, this.x1, this.y2, 1, this.x2, this.y1, 1, this.x2, this.y2, 1];
      }
      if (dim === 4) {
        return [this.x1, this.y1, 0, 1, this.x2, this.y1, 0, 1, this.x1, this.y2, 0, 1, this.x1, this.y2, 0, 1, this.x2, this.y1, 0, 1, this.x2, this.y2, 0, 1];
      }
      return [this.x1, this.y1, ...(dim > 2 ? Array(-2 + dim).fill(0) : []), this.x2, this.y1, ...(dim > 2 ? Array(-2 + dim).fill(0) : []), this.x1, this.y2, ...(dim > 2 ? Array(-2 + dim).fill(0) : []), this.x1, this.y2, ...(dim > 2 ? Array(-2 + dim).fill(0) : []), this.x2, this.y1, ...(dim > 2 ? Array(-2 + dim).fill(0) : []), this.x2, this.y2, ...(dim > 2 ? Array(-2 + dim).fill(0) : [])];
    }
  }], [{
    key: "clone",
    value: function clone(rectangle) {
      return new Rectangle(rectangle.x1, rectangle.y1, rectangle.x2, rectangle.y2);
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
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const depthSymbol = Symbol('depth');
let Segment = /*#__PURE__*/function () {
  function Segment(start, end, prev) {
    let dimension = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 2;
    let depth = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
    _classCallCheck(this, Segment);
    this.start = start;
    this.end = end;
    this.depth = depth;
    this.dimension = dimension;
    this.size = 0;
    this.rectangles = new Set();
    this.subTree = depth < 1 ? new SMTree(_defineProperty({
      dimension: dimension
    }, depthSymbol, 1 + depth)) : null;
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
      const a = new Segment(this.start, at, this.prev, this.dimension, this.depth);
      const b = new Segment(at, this.end, a, this.dimension, this.depth);
      for (const rectangle of this.rectangles) {
        const rectMin = this.depth === 0 ? rectangle.x1 : rectangle.y1;
        const rectMax = this.depth === 0 ? rectangle.x2 : rectangle.y2;
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
        this.subTree.delete(rectangle);
      }
      this.rectangles.delete(rectangle);
      this.size = this.rectangles.size;
      const empty = !this.rectangles.size && this.start > -Infinity;
      return empty;
    }
  }]);
}();
const isRectangle = object => {
  return 'x1' in object && 'y1' in object && 'x2' in object && 'y2' in object && object.x1 < object.x2 && object.y1 < object.y2;
};
let SMTree = exports.SMTree = /*#__PURE__*/function () {
  function SMTree() {
    let args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _defineProperty({
      dimension: 2
    }, depthSymbol, 0);
    _classCallCheck(this, SMTree);
    this.depth = args[depthSymbol];
    this.dimension = args.dimension;
    this.segments = [new Segment(-Infinity, Infinity, null, this.dimension, this.depth)];
    this.rectangles = new WeakSet();
    this.snapshots = new WeakMap();
  }
  return _createClass(SMTree, [{
    key: "add",
    value: function add(rectangle) {
      if (!isRectangle(rectangle)) {
        throw new Error('Object supplied is not a Rectangle. Must have properties: x1, y1, x2, y2.');
      }
      this.rectangles.add(rectangle);
      this.snapshots.set(rectangle, {
        x1: rectangle.x1,
        y1: rectangle.y1,
        x2: rectangle.x2,
        y2: rectangle.y2
      });
      const rectMin = this.depth === 0 ? rectangle.x1 : rectangle.y1;
      const rectMax = this.depth === 0 ? rectangle.x2 : rectangle.y2;
      const startIndex = this.findSegment(rectMin);
      this.splitSegment(startIndex, rectMin);
      const endIndex = this.findSegment(rectMax);
      this.splitSegment(endIndex, rectMax);
      if (startIndex === endIndex) {
        this.segments[startIndex].add(rectangle);
        return;
      }
      for (let i = 1 + startIndex; i <= endIndex; i++) {
        this.segments[i].add(rectangle);
      }
    }
  }, {
    key: "delete",
    value: function _delete(rectangle) {
      if (!isRectangle(rectangle)) {
        throw new Error('Object supplied is not a Rectangle. Must have properties: x1, y1, x2, y2.');
      }
      if (!this.rectangles.has(rectangle)) {
        console.warn('Rectangle not in tree!');
        return;
      }
      const snapshot = this.snapshots.get(rectangle);
      this.rectangles.delete(rectangle);
      this.snapshots.delete(rectangle);
      const rectMin = this.depth === 0 ? snapshot.x1 : snapshot.y1;
      const rectMax = this.depth === 0 ? snapshot.x2 : snapshot.y2;
      const startIndex = this.findSegment(rectMin);
      let endIndex = this.findSegment(rectMax);
      for (let i = startIndex; i <= endIndex; i++) {
        const rects = this.segments[i].rectangles;
        const last = this.segments[i - 1].rectangles;
        rects.delete(rectangle);
        if (rects.size !== last.size) {
          continue;
        }
        if (rects.symmetricDifference(last).size > 0) {
          continue;
        }
        this.segments[i - 1].end = this.segments[i].end;
        if (this.segments[i + 1]) {
          this.segments[i + 1].prev = this.segments[i - 1];
        }
        this.segments.splice(i, 1);
        endIndex--;
        i--;
      }
    }
  }, {
    key: "move",
    value: function move(rectangle) {
      this.delete(rectangle);
      this.add(rectangle);
    }
  }, {
    key: "query",
    value: function query(x1, y1, x2, y2) {
      const xStartIndex = this.findSegment(x1);
      const xEndIndex = this.findSegment(x2);
      let results = new Set();
      for (let i = xStartIndex; i <= xEndIndex; i++) {
        const segment = this.segments[i];
        if (!segment.subTree) {
          continue;
        }
        const yStartIndex = segment.subTree.findSegment(y1);
        const yEndIndex = segment.subTree.findSegment(y2);
        for (let j = yStartIndex; j <= yEndIndex; j++) {
          results = results.union(segment.subTree.segments[j].rectangles);
        }
      }
      return results;
    }
  }, {
    key: "splitSegment",
    value: function splitSegment(index, at) {
      if (at <= this.segments[index].start || at >= this.segments[index].end) {
        return;
      }
      const splitSegments = this.segments[index].split(at);
      this.segments.splice(index, 1, ...splitSegments);
    }
  }, {
    key: "findSegment",
    value: function findSegment(at) {
      if (isNaN(at)) {
        throw new Error('World.findSegment takes a number param.');
      }
      let lo = 0;
      let hi = -1 + this.segments.length;
      do {
        const current = Math.floor((lo + hi) * 0.5);
        const segment = this.segments[current];
        if (segment.start <= at && segment.end > at) {
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
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Split = exports.Split = /*#__PURE__*/function () {
  function Split() {
    _classCallCheck(this, Split);
  }
  return _createClass(Split, null, [{
    key: "intToBytes",
    value: function intToBytes(value) {
      this.value[0] = value;
      return [...this.bytes];
    }
  }, {
    key: "bytesToInt",
    value: function bytesToInt(bytes) {
      this.bytes[0] = bytes[0];
      this.bytes[1] = bytes[1];
      this.bytes[2] = bytes[2];
      this.bytes[3] = bytes[3];
      return this.value[0];
    }
  }, {
    key: "bytesToInt3",
    value: function bytesToInt3(bytes) {
      this.bytes[0] = bytes[0];
      this.bytes[1] = bytes[1];
      this.bytes[2] = bytes[2];
      this.bytes[3] = 0;
      return this.value[0];
    }
  }]);
}();
_Split = Split;
_defineProperty(Split, "bytes", new Uint8ClampedArray(4));
_defineProperty(Split, "words", new Uint16Array(_Split.bytes.buffer));
_defineProperty(Split, "value", new Uint32Array(_Split.bytes.buffer));
});

;require.register("model/BallController.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BallController = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let BallController = exports.BallController = /*#__PURE__*/function () {
  function BallController() {
    _classCallCheck(this, BallController);
  }
  return _createClass(BallController, [{
    key: "create",
    value: function create(entity, entityData) {
      entity.xSpeed = 0;
      entity.ySpeed = 0;
      entity.height = 32;
      entity.width = 32;
    }
  }, {
    key: "simulate",
    value: function simulate(entity) {
      const world = entity.session.world;
      if (entity.xSpeed || entity.ySpeed) {
        let xMove = entity.xSpeed;
        let yMove = entity.ySpeed;
        const h = world.castTerrainRay(entity.x + 0, entity.y + -16, 0, entity.xSpeed < 0 ? Math.PI : 0, Math.abs(entity.xSpeed) + 16, 0x01);
        const v = world.castTerrainRay(entity.x + 0, entity.y + -16, 0, Math.PI * 0.5 * Math.sign(entity.ySpeed), Math.abs(entity.ySpeed) + 16, 0x1);
        if (h) {
          const actualDistance = h[0] - entity.x;
          xMove = actualDistance + -16 * Math.sign(entity.xSpeed);
          entity.xSpeed = -entity.xSpeed;
        }
        if (v) {
          const actualDistance = v[1] - (entity.y + -16);
          yMove = actualDistance + -16 * Math.sign(entity.ySpeed);
          entity.ySpeed = -entity.ySpeed;
        }
        entity.x += xMove;
        entity.y += yMove;
      } else {
        const a = Math.PI * 2 * Math.random();
        const s = 6;
        entity.xSpeed = Math.cos(a) * s;
        entity.ySpeed = Math.sin(a) * s;
      }
    }
  }]);
}();
_defineProperty(BallController, "spriteImage", './sphere.png');
});

;require.register("model/BarrelController.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BarrelController = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let BarrelController = exports.BarrelController = /*#__PURE__*/function () {
  function BarrelController() {
    _classCallCheck(this, BarrelController);
  }
  return _createClass(BarrelController, [{
    key: "create",
    value: function create(entity, entityData) {
      entity.xSpeed = 0;
      entity.ySpeed = 0;
      entity.height = 48;
      entity.width = 32;
      entity.ySpriteOffset = 6;
      this.grounded = true;
      this.shot = false;
    }
  }, {
    key: "simulate",
    value: function simulate(entity) {
      const world = entity.session.world;
      if (!world.getSolid(entity.x, entity.y + 1)) {
        entity.ySpeed = Math.min(8, entity.ySpeed + 0.5);
        this.grounded = false;
      } else {
        entity.ySpeed = Math.min(0, entity.ySpeed);
        this.grounded = true;
      }
      if (entity.xSpeed || entity.ySpeed) {
        const direction = Math.atan2(entity.ySpeed, entity.xSpeed);
        const distance = Math.hypot(entity.ySpeed, entity.xSpeed);
        const hit = world.castRay(entity.x, entity.y + -entity.height * 0.5, 0, direction, distance, 0x01);
        let xMove = entity.xSpeed;
        let yMove = entity.ySpeed;
        if (hit.terrain) {
          const actualDistance = Math.hypot(entity.x - hit.terrain[0], entity.y - hit.terrain[1]);
          xMove = Math.cos(direction) * actualDistance;
          yMove = Math.sin(direction) * actualDistance;
        }
        entity.x += xMove;
        entity.y += yMove;
        if (!this.shot) {
          entity.xSpeed *= 0.9;
        }
      } else {
        entity.shot = false;
      }
      if (world.getSolid(entity.x, entity.y) && !world.getSolid(entity.x, entity.y - 1)) {
        entity.ySpeed = 0;
        entity.y--;
      }
      while (world.getSolid(entity.x, entity.y + -entity.height) && !world.getSolid(entity.x, entity.y)) {
        entity.ySpeed = 0;
        entity.y++;
      }
      while (world.getSolid(entity.x + -entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x + entity.width * 0.5, entity.y + -8)) {
        this.stop(entity, entity.xSpeed);
        entity.xSpeed = 0;
        entity.x++;
      }
      while (world.getSolid(entity.x + entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x - entity.width * 0.5, entity.y + -8)) {
        this.stop(entity, entity.xSpeed);
        entity.xSpeed = 0;
        entity.x--;
      }
    }
  }, {
    key: "stop",
    value: function stop(entity) {
      entity.xSpeed && console.log(entity.xSpeed);
      if (entity.xSpeed > 10) {
        entity.session.removeEntity(entity);
      }
    }
  }, {
    key: "collide",
    value: function collide(entity, other, point) {
      if (Math.sign(entity.x - other.x) === Math.sign(other.xSpeed)) {
        entity.xSpeed = other.xSpeed;
        const min = 0.5 * (other.width + entity.width);
        if (Math.abs(other.x + other.xSpeed + -entity.x) < min) {
          entity.xSpeed += -Math.sign(other.x + other.xSpeed + -entity.x);
        }
        if (other.controller) {
          other.controller.pushing = entity;
        }
      }
    }
  }, {
    key: "destroy",
    value: function destroy() {}
  }]);
}();
_defineProperty(BarrelController, "spriteImage", '/barrel.png');
});

;require.register("model/BoxController.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BoxController = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let BoxController = exports.BoxController = /*#__PURE__*/function () {
  function BoxController() {
    _classCallCheck(this, BoxController);
    _defineProperty(this, "frames", 0);
  }
  return _createClass(BoxController, [{
    key: "create",
    value: function create(entity, entityData) {
      if (entityData.gid) {
        entity.x = entityData.x + entityData.width * 0.5;
        entity.y = entityData.y + -1;
      } else {
        entity.x = entityData.x + entityData.width * 0.5;
        entity.y = entityData.y + entityData.height + -1;
      }
      this.xOriginal = entity.x;
      this.yOriginal = entity.y;
      entity.flags |= 0x1;
    }
  }, {
    key: "simulate",
    value: function simulate(entity) {
      entity.sprite.width = entity.width;
      entity.sprite.height = entity.height;
      if (entity.props.has('xOscillate')) {
        var _entity$props$get;
        const range = entity.props.get('xOscillate');
        const delay = (_entity$props$get = entity.props.get('delay')) !== null && _entity$props$get !== void 0 ? _entity$props$get : 1500;
        const age = entity.session.world.age;
        const current = Math.pow(Math.cos(Math.pow(Math.sin(age / delay), 5)), 16);
        const mapOffset = entity.lastMap ? entity.lastMap.x - entity.lastMap.xOrigin : 0;
        entity.x = mapOffset + this.xOriginal + current * range;
      }
      if (entity.props.has('yOscillate')) {
        var _entity$props$get2;
        const range = entity.props.get('yOscillate');
        const delay = (_entity$props$get2 = entity.props.get('delay')) !== null && _entity$props$get2 !== void 0 ? _entity$props$get2 : 1500;
        const age = entity.session.world.age;
        const current = Math.pow(Math.cos(Math.pow(Math.sin(age / delay), 5)), 16);
        const mapOffset = entity.lastMap ? entity.lastMap.y - entity.lastMap.yOrigin : 0;
        const yNew = this.yOriginal + mapOffset + current * range;
        if (yNew < entity.y) {
          const above = entity.session.world.getEntitiesForRect(entity.x, yNew + -entity.height * 0.5 + -(entity.y - yNew) * 0.5, entity.width, yNew + -yNew + entity.height);
          above.forEach(other => {
            if (other.ySpeed < 0) return;
            other.y = entity.y - entity.height;
          });
        }
        entity.y = yNew;
      }
    }
  }, {
    key: "collide",
    value: function collide() {}
  }]);
}();
_defineProperty(BoxController, "spriteColor", [0, 0, 0, 255]);
});

;require.register("model/Entity.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Entity = void 0;
var _Bindable = require("curvature/base/Bindable");
var _Rectangle = require("../math/Rectangle");
var _Sprite = require("../sprite/Sprite");
var _Properties = require("../world/Properties");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Entity = exports.Entity = /*#__PURE__*/function () {
  function Entity(entityData) {
    var _entityData$propertie;
    _classCallCheck(this, Entity);
    this[_Bindable.Bindable.Prevent] = true;
    const controller = entityData.controller,
      session = entityData.session,
      inputManager = entityData.inputManager,
      sprite = entityData.sprite,
      _entityData$x = entityData.x,
      x = _entityData$x === void 0 ? 0 : _entityData$x,
      _entityData$y = entityData.y,
      y = _entityData$y === void 0 ? 0 : _entityData$y,
      _entityData$width = entityData.width,
      width = _entityData$width === void 0 ? 32 : _entityData$width,
      _entityData$height = entityData.height,
      height = _entityData$height === void 0 ? 32 : _entityData$height;
    this.controller = controller;
    this.props = new _Properties.Properties((_entityData$propertie = entityData.properties) !== null && _entityData$propertie !== void 0 ? _entityData$propertie : [], this);
    this.xSpriteOffset = 0;
    this.ySpriteOffset = sprite ? 0 : 15;
    this.flags = 0;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    controller && controller.create(this, entityData);
    this.sprite = sprite || new _Sprite.Sprite({
      session: session,
      src: '/thing.png',
      width: 32,
      height: 32
    });
    this.inputManager = inputManager;
    this.session = session;
    this.rect = new _Rectangle.Rectangle(x - width * 0.5, y - height, x + width * 0.5, y);
    this.xOrigin = x;
    this.yOrigin = x;
  }
  return _createClass(Entity, [{
    key: "simulate",
    value: function simulate() {
      const startX = this.x;
      const startY = this.y;
      this.controller && this.controller.simulate(this);
      this.session.world.motionGraph.moveChildren(this, this.x - startX, this.y - startY);
      this.rect.x1 = this.x - this.width * 0.5;
      this.rect.x2 = this.x + this.width * 0.5;
      this.rect.y1 = this.y - this.height;
      this.rect.y2 = this.y;
      if (this.sprite) {
        this.sprite.x = this.x + this.xSpriteOffset;
        this.sprite.y = this.y + this.ySpriteOffset;
      }
      this.fixFPE();
    }
  }, {
    key: "collide",
    value: function collide(other, point) {
      this.controller && this.controller.collide(this, other, point);
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.controller && this.controller.destroy(this);
    }
  }, {
    key: "fixFPE",
    value: function fixFPE() {
      if (this.x % 1 > 0.99999) this.x = Math.round(this.x);
      if (this.y % 1 > 0.99999) this.y = Math.round(this.y);
      if (this.x % 1 < 0.00001) this.x = Math.round(this.x);
      if (this.y % 1 < 0.00001) this.y = Math.round(this.y);
    }
  }]);
}();
_defineProperty(Entity, "E_SOLID", 1);
});

;require.register("model/InputManager.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InputManager = void 0;
var _Bindable = require("curvature/base/Bindable");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let InputManager = exports.InputManager = /*#__PURE__*/function () {
  function InputManager(_ref) {
    let keyboard = _ref.keyboard,
      onScreenJoyPad = _ref.onScreenJoyPad;
    _classCallCheck(this, InputManager);
    _defineProperty(this, "triggers", _Bindable.Bindable.makeBindable({}));
    _defineProperty(this, "axis", _Bindable.Bindable.makeBindable({}));
    keyboard.keys.bindTo((v, k, t, d) => {
      if (v > 0) {
        this.keyPress(k, v, t[k]);
        return;
      }
      if (v === -1) {
        this.keyRelease(k, v, t[k]);
        return;
      }
    });
    onScreenJoyPad.args.bindTo('x', v => {
      this.axis[0] = v / 50;
    });
    onScreenJoyPad.args.bindTo('y', v => {
      this.axis[1] = v / 50;
    });
  }
  return _createClass(InputManager, [{
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
        case ' ':
          this.triggers[0] = true;
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
        case ' ':
          this.triggers[0] = false;
          break;
      }
    }
  }]);
}();
});

;require.register("model/MapMover.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MapMover = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let MapMover = exports.MapMover = /*#__PURE__*/function () {
  function MapMover() {
    _classCallCheck(this, MapMover);
  }
  return _createClass(MapMover, [{
    key: "create",
    value: function create(map) {
      this.yOriginal = map.y;
    }
  }, {
    key: "simulate",
    value: function simulate(map, delta) {
      if (map.props.get('yOscillate')) {
        var _map$props$get;
        const range = map.props.get('yOscillate');
        const delay = (_map$props$get = map.props.get('delay')) !== null && _map$props$get !== void 0 ? _map$props$get : 1500;
        const age = map.session.world.age;
        const current = Math.pow(Math.cos(Math.pow(Math.sin(age / delay), 5)), 16);
        map.y = this.yOriginal + current * range;
      }
    }
  }]);
}();
});

;require.register("model/PlayerController.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PlayerController = void 0;
var _Ray = require("../math/Ray");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const fireRegion = [1, 0, 0];
const waterRegion = [0, 1, 1];
let PlayerController = exports.PlayerController = /*#__PURE__*/function () {
  function PlayerController() {
    _classCallCheck(this, PlayerController);
  }
  return _createClass(PlayerController, [{
    key: "create",
    value: function create(entity, entityData) {
      this.direction = 'south';
      this.state = 'standing';
      entity.xSpeed = 0;
      entity.ySpeed = 0;
      entity.height = 34;
      entity.width = 24;
      this.grounded = true;
      this.grounded = 0;
      this.gravity = 0.5;
      this.lastMap = null;
      this.pushing = null;
    }
  }, {
    key: "simulate",
    value: function simulate(entity) {
      if (this.state === 'jumping') {
        entity.height = 24;
      } else {
        entity.height = 34;
      }
      const xAxis = entity.inputManager ? Math.min(1, Math.max(entity.inputManager.axes[0].magnitude || 0, -1)) || 0 : 0;
      const yAxis = entity.inputManager ? Math.min(1, Math.max(entity.inputManager.axes[1].magnitude || 0, -1)) || 0 : 0;
      const world = entity.session.world;
      const solidTerrain = world.getSolid(entity.x, entity.y + 1);
      const solidEntities = [...world.getEntitiesForPoint(entity.x, entity.y + 1)].filter(entity => entity.flags & 0x1);
      const regions = world.getRegionsForPoint(entity.x, entity.y);
      const maps = world.getMapsForPoint(entity.x, entity.y);
      const firstMap = [...maps][0];
      let gravity = this.gravity;
      regions.forEach(region => {
        var _region$gravity;
        gravity *= (_region$gravity = region.gravity) !== null && _region$gravity !== void 0 ? _region$gravity : 1;
      });
      if (!solidTerrain) {
        entity.ySpeed = Math.min(8, entity.ySpeed + gravity);
        this.grounded = false;
      } else if (entity.ySpeed >= 0) {
        entity.ySpeed = Math.min(0, entity.ySpeed);
        this.grounded = true;
      }
      if (solidTerrain) {
        world.motionGraph.add(entity, firstMap);
        this.lastMap = firstMap;
      } else if (solidEntities.length) {
        const otherTop = solidEntities[0].y - solidEntities[0].height;
        if (entity.ySpeed >= 0 && entity.y < otherTop + 16) {
          entity.y = otherTop;
          entity.ySpeed = Math.min(0, entity.ySpeed);
          this.grounded = true;
          world.motionGraph.add(entity, solidEntities[0]);
        }
      } else if (maps.has(this.lastMap)) {
        world.motionGraph.add(entity, this.lastMap);
      } else if (!maps.has(this.lastMap)) {
        world.motionGraph.delete(entity);
      }
      if (xAxis) {
        this.xDirection = Math.sign(xAxis);
        if (!world.getSolid(entity.x + Math.sign(xAxis) * entity.width * 0.5 + Math.sign(xAxis), entity.y)) {
          entity.xSpeed += xAxis * (this.grounded ? 0.2 : 0.3);
        }
        if (Math.abs(entity.xSpeed) > 8) {
          entity.xSpeed = 8 * Math.sign(entity.xSpeed);
        }
        if (this.grounded && xAxis && Math.sign(xAxis) !== Math.sign(entity.xSpeed)) {
          entity.xSpeed *= 0.75;
        }
      } else if (this.grounded) {
        entity.xSpeed *= 0.9;
      } else {
        entity.xSpeed *= 0.99;
      }
      if (this.pushing) {
        if (entity.xSpeed && Math.sign(entity.xSpeed) !== Math.sign(this.pushing.x - entity.x)) {
          this.pushing = null;
        }
        if (!this.grounded) {
          this.pushing = null;
        }
      }
      const direction = Math.atan2(entity.ySpeed, entity.xSpeed);
      const distance = Math.hypot(entity.ySpeed, entity.xSpeed);
      const entities = _Ray.Ray.castEntity(world, entity.x, entity.y + -entity.height * 0.5, 0, this.xDirection < 0 ? Math.PI : 0, distance + entity.width * 0.5, _Ray.Ray.T_LAST_EMPTY);
      if (entities) {
        entities.delete(entity);
        entities.forEach((point, other) => {
          other.collide(entity, point);
          entity.collide(other, point);
        });
      }
      if (entity.xSpeed || entity.ySpeed) {
        regions.forEach(region => {
          entity.xSpeed *= region.drag;
          if (entity.ySpeed > 0) {
            entity.ySpeed *= region.drag;
          }
        });
        const terrain = _Ray.Ray.castTerrain(world, entity.x, entity.y, 0, direction, distance, _Ray.Ray.T_LAST_EMPTY);
        let xMove = entity.xSpeed;
        let yMove = entity.ySpeed;
        if (terrain) {
          const actualDistance = Math.hypot(entity.x - terrain[0], entity.y - terrain[1]);
          xMove = Math.cos(direction) * actualDistance;
          yMove = Math.sin(direction) * actualDistance;
        }
        entity.x += xMove;
        entity.y += yMove;
      }
      if (world.getSolid(entity.x, entity.y) && !world.getSolid(entity.x, entity.y + -entity.height)) {
        entity.ySpeed = 0;
        entity.y--;
      }
      while (world.getSolid(entity.x, entity.y + -entity.height) && !world.getSolid(entity.x, entity.y)) {
        entity.ySpeed = 0;
        entity.y++;
      }
      while (world.getSolid(entity.x + -entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x + entity.width * 0.5, entity.y + -8)) {
        entity.xSpeed = 0;
        entity.x++;
      }
      while (world.getSolid(entity.x + entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x - entity.width * 0.5, entity.y + -8)) {
        entity.xSpeed = 0;
        entity.x--;
      }
      if (this.grounded) {
        this.state = xAxis ? 'walking' : 'standing';
        if (xAxis < 0) {
          this.direction = 'west';
        } else if (xAxis > 0) {
          this.direction = 'east';
        }
      }
      if (entity.inputManager) {
        if (this.grounded && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === 1) {
          this.grounded = false;
          this.state = 'jumping';
          entity.ySpeed = -10;
        }
        if (!this.grounded && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === -1) {
          entity.ySpeed = Math.max(-4, entity.ySpeed);
        }
        if (this.pushing && entity.inputManager.buttons[1] && entity.inputManager.buttons[1].time === 1) {
          this.pushing.controller.shot = true;
          this.pushing.xSpeed *= 4;
          this.pushing = null;
        }
      }
      if (entity.sprite) {
        if (this.state === 'jumping') {
          entity.sprite.scaleX = this.xDirection;
          entity.sprite.changeAnimation(`${this.state}`);
        } else {
          entity.sprite.scaleX = 1;
          entity.sprite.changeAnimation(`${this.state}-${this.direction}`);
        }
      }
      if (this.state === 'jumping' && this.direction === 'south') {
        this.xDirection = 1;
        this.direction = 'east';
      }
    }
  }, {
    key: "collide",
    value: function collide(entity, other, point) {
      if (other.flags & 0x1) {
        const otherTop = other.y - other.height;
        if (entity.ySpeed > 0 && entity.y < otherTop + 16) {
          entity.ySpeed = 0;
          this.grounded = true;
          this.y = otherTop;
        }
      }
    }
  }]);
}();
_defineProperty(PlayerController, "spriteSheet", '/player.tsj');
});

;require.register("model/Spawner.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Spawner = void 0;
var _SpriteSheet = require("../sprite/SpriteSheet");
var _Sprite = require("../sprite/Sprite");
var _Entity2 = require("./Entity");
var _Properties = require("../world/Properties");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == typeof e || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _superPropGet(t, o, e, r) { var p = _get(_getPrototypeOf(1 & r ? t.prototype : t), o, e); return 2 & r && "function" == typeof p ? function (t) { return p.apply(e, t); } : p; }
function _get() { return _get = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function (e, t, r) { var p = _superPropBase(e, t); if (p) { var n = Object.getOwnPropertyDescriptor(p, t); return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value; } }, _get.apply(null, arguments); }
function _superPropBase(t, o) { for (; !{}.hasOwnProperty.call(t, o) && null !== (t = _getPrototypeOf(t));); return t; }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
let Spawner = exports.Spawner = /*#__PURE__*/function (_Entity) {
  function Spawner(spawnData) {
    var _spawnData$properties;
    var _this;
    _classCallCheck(this, Spawner);
    _this = _callSuper(this, Spawner, [spawnData]);
    _this.spawnData = spawnData;
    _this.spawnType = spawnData.spawnType;
    _this.spawnClass = spawnData.spawnClass;
    _this.session = spawnData.session;
    _this.props = new _Properties.Properties((_spawnData$properties = spawnData.properties) !== null && _spawnData$properties !== void 0 ? _spawnData$properties : [], _this);
    return _this;
  }
  _inherits(Spawner, _Entity);
  return _createClass(Spawner, [{
    key: "simulate",
    value: function simulate() {
      const spawnClass = this.spawnData.spawnClass;
      const entityDef = _objectSpread({}, this.spawnData.entityDef);
      const controller = new spawnClass();
      if (!entityDef.sprite) {
        if (spawnClass.spriteSheet) {
          entityDef.sprite = new _Sprite.Sprite({
            session: this.spawnData.session,
            spriteSheet: new _SpriteSheet.SpriteSheet({
              src: spawnClass.spriteSheet
            })
          });
        } else if (spawnClass.spriteImage) {
          entityDef.sprite = new _Sprite.Sprite({
            session: this.spawnData.session,
            src: spawnClass.spriteImage
          });
        } else if (this.spawnData.gid) {
          entityDef.sprite = new _Sprite.Sprite({
            session: this.spawnData.session,
            src: this.spawnData.map.getTileImage(this.spawnData.gid),
            tiled: true
          });
        } else if (this.props.has('color')) {
          entityDef.sprite = new _Sprite.Sprite({
            session: this.spawnData.session,
            color: this.props.get('color'),
            width: this.width,
            height: this.height
          });
        } else if (spawnClass.spriteColor) {
          entityDef.sprite = new _Sprite.Sprite({
            session: this.spawnData.session,
            color: spawnClass.spriteColor,
            width: this.width,
            height: this.height
          });
        }
      }
      const map = this.spawnData.map;
      const entity = new _Entity2.Entity(_objectSpread(_objectSpread({}, entityDef), {}, {
        controller: controller,
        session: this.session,
        x: this.x,
        y: this.y,
        map: map
      }));
      this.session.world.motionGraph.add(entity, map);
      entity.lastMap = map;
      this.session.removeEntity(this);
      this.session.addEntity(entity);
      _superPropGet(Spawner, "simulate", this, 3)([]);
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
var _QuickTree = require("../math/QuickTree");
var _SpriteBoard = require("../sprite/SpriteBoard");
var _SpriteSheet = require("../sprite/SpriteSheet");
var _Sprite = require("../sprite/Sprite");
var _Entity = require("../model/Entity");
var _Camera = require("../sprite/Camera");
var _World = require("../world/World");
var _Controller = require("../input/Controller");
var _Pallet = require("../world/Pallet");
var _PlayerController = require("../model/PlayerController");
var _BallController = require("../model/BallController");
var _BarrelController = require("../model/BarrelController");
var _BoxController = require("../model/BoxController");
var _MapMover = require("../model/MapMover");
var _MotionGraph = require("../math/MotionGraph");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const input = new URLSearchParams(location.search);
const warpStart = input.has('start') ? input.get('start').split(',').map(Number) : [];
console.log(location.search, input, warpStart);
let Session = exports.Session = /*#__PURE__*/function () {
  function Session(_ref) {
    let element = _ref.element,
      worldSrc = _ref.worldSrc,
      keyboard = _ref.keyboard,
      onScreenJoyPad = _ref.onScreenJoyPad;
    _classCallCheck(this, Session);
    this.entityPallet = new _Pallet.Pallet();
    this.mapPallet = new _Pallet.Pallet();
    this.entityPallet.register('@basic-platformer', _PlayerController.PlayerController);
    this.entityPallet.register('@barrel', _BarrelController.BarrelController);
    this.entityPallet.register('@ball', _BallController.BallController);
    this.entityPallet.register('@box', _BoxController.BoxController);
    this.mapPallet.register('@moving-map', _MapMover.MapMover);
    this.fThen = 0;
    this.sThen = 0;
    this.frameLock = 60;
    this.simulationLock = 60;
    this.entities = new Set();
    this.removed = new WeakSet();
    this.paused = false;
    this.loaded = false;
    this.overscan = 640;
    this.world = new _World.World({
      src: worldSrc,
      session: this
    });
    this.spriteBoard = new _SpriteBoard.SpriteBoard({
      element: element,
      world: this.world,
      session: this
    });
    this.keyboard = keyboard;
    this.world.ready.then(() => this.initialize({
      keyboard: keyboard,
      onScreenJoyPad: onScreenJoyPad
    }));
    this.controller = new _Controller.Controller({
      deadZone: 0.2
    });
    this.controller.zero();
    this.gamepad = null;
    window.addEventListener('gamepadconnected', event => {
      this.gamepad = event.gamepad;
    });
    window.addEventListener('gamepaddisconnected', event => {
      if (!this.gamepad) return;
      this.gamepad = null;
    });
  }
  return _createClass(Session, [{
    key: "initialize",
    value: async function initialize() {
      this.loaded = true;
      for (const map of this.world.maps) {
        var _warpStart$, _warpStart$2;
        if (!map.loaded) {
          continue;
        }
        if (!map.props.has('player-start')) {
          continue;
        }
        const startId = map.props.get('player-start');
        const startDef = map.entityDefs[startId];
        const playerClass = await this.entityPallet.resolve(startDef.type);
        const startX = (_warpStart$ = warpStart[0]) !== null && _warpStart$ !== void 0 ? _warpStart$ : startDef.x;
        const startY = (_warpStart$2 = warpStart[1]) !== null && _warpStart$2 !== void 0 ? _warpStart$2 : startDef.y;
        const player = this.player = new _Entity.Entity({
          controller: new playerClass(),
          session: this,
          x: startX,
          y: startY,
          inputManager: this.controller,
          sprite: new _Sprite.Sprite({
            session: this,
            spriteSheet: new _SpriteSheet.SpriteSheet({
              src: '/player.tsj'
            })
          }),
          camera: _Camera.Camera
        });
        this.spriteBoard.following = player;
        this.addEntity(player);
      }
    }
  }, {
    key: "addEntity",
    value: function addEntity(entity) {
      if (this.entities.has(entity)) {
        return;
      }
      this.entities.add(entity);
      const maps = this.world.getMapsForPoint(entity.x, entity.y);
      maps.forEach(map => map.addEntity(entity));
    }
  }, {
    key: "removeEntity",
    value: function removeEntity(entity) {
      entity.destroy();
      this.entities.delete(entity);
      this.spriteBoard.sprites.delete(entity.sprite);
      _QuickTree.QuickTree.deleteFromAllTrees(entity);
      _MotionGraph.MotionGraph.deleteFromAllGraphs(entity);
      this.removed.add(entity);
    }
  }, {
    key: "simulate",
    value: function simulate(now) {
      if (!this.loaded) {
        return false;
      }
      const delta = now - this.sThen;
      if (this.simulationLock == 0 || 0.2 + delta < 1000 / this.simulationLock) {
        return false;
      }
      this.sThen = now;
      this.keyboard.update();
      this.controller.update({
        gamepad: this.gamepad
      });
      this.controller.readInput({
        onScreenJoyPad: this.onScreenJoyPad,
        gamepads: navigator.getGamepads(),
        keyboard: this.keyboard
      });
      if (this.controller.buttons[1020] && this.controller.buttons[1020].time === 1) {
        this.paused = !this.paused;
      }
      if (this.paused || !this.player) {
        return false;
      }
      this.entities.forEach(entity => {
        if (entity.sprite) entity.sprite.visible = false;
      });
      const player = this.player;
      this.spriteBoard.sprites.clear();
      this.spriteBoard.regions.clear();
      this.world.simulate(delta);
      const visibleMaps = this.world.getMapsForRect(player.x, player.y, _Camera.Camera.width, _Camera.Camera.height);
      visibleMaps.forEach(map => {
        map.simulate(delta);
        const mapRegions = map.getRegionsForRect(player.x + -(_Camera.Camera.width * 1.0) + 64, player.y + -(_Camera.Camera.height * 1.0) + 64, player.x + _Camera.Camera.width * 1.0 + 64, player.y + _Camera.Camera.height * 1.0 + 64);
        mapRegions.forEach(r => this.spriteBoard.regions.add(r));
      });
      const entities = this.world.getEntitiesForRect(player.x, player.y
      // , (Camera.width * 1.0) + 64
      // , (Camera.height * 1.0) + 64
      , _Camera.Camera.width * 1 + this.overscan, _Camera.Camera.height * 1 + this.overscan);
      entities.delete(player);
      entities.add(player);
      entities.forEach(entity => {
        entity.simulate(delta);
        if (this.removed.has(entity)) return;
        const maps = this.world.getMapsForPoint(entity.x, entity.y);
        maps.forEach(map => map.moveEntity(entity));
        if (entity.sprite) {
          this.spriteBoard.sprites.add(entity.sprite);
          entity.sprite.visible = true;
        }
      });
      return true;
    }
  }, {
    key: "draw",
    value: function draw(now) {
      if (!this.loaded) {
        return;
      }
      const delta = now - this.fThen;
      if (this.frameLock == 0 || 0.2 + delta < 1000 / this.frameLock) {
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
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Camera = exports.Camera = /*#__PURE__*/_createClass(function Camera() {
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
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let MapRenderer = exports.MapRenderer = /*#__PURE__*/function () {
  function MapRenderer(_ref) {
    let spriteBoard = _ref.spriteBoard,
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
    const gl = this.spriteBoard.gl2d.context;
    this.tileMapping = this.spriteBoard.gl2d.createTexture(1, 1);
    this.tileTexture = this.spriteBoard.gl2d.createTexture(1, 1);
    map.initialize();
    map.ready.then(() => {
      this.loaded = true;
      this.tileWidth = map.tileWidth;
      this.tileHeight = map.tileHeight;
      gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
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
    value: function draw(delta, priority) {
      if (!this.loaded) {
        return;
      }
      const gl = this.spriteBoard.gl2d.context;
      const x = -this.map.x + this.spriteBoard.following.x;
      const y = -this.map.y + this.spriteBoard.following.y;
      const zoom = this.spriteBoard.zoomLevel;
      const halfTileWidth = this.tileWidth * 0.5;
      const halfTileHeight = this.tileHeight * 0.5;
      const tilesWide = Math.floor(this.width / this.tileWidth);
      const tilesHigh = Math.floor(this.height / this.tileHeight);
      const xOffset = Math.floor(Math.floor(0.5 * this.width / 64) + 0) * 64;
      const yOffset = Math.floor(Math.floor(0.5 * this.height / 64) + 0) * 64;
      const xTile = (x + halfTileWidth) / this.tileWidth + -this.negSafeMod(x + halfTileWidth, 64) / this.tileWidth + -xOffset / this.tileWidth;
      const yTile = (y + halfTileHeight) / this.tileHeight + -this.negSafeMod(y + halfTileHeight, 64) / this.tileHeight + -yOffset / this.tileHeight;
      if (xTile + tilesWide < 0 || yTile + tilesHigh < 0) {
        return;
      }
      const xPos = zoom * ((this.width + this.xOffset) * 0.5 + -this.negSafeMod(x + halfTileWidth, 64) + -xOffset);
      const yPos = zoom * ((this.height + this.yOffset) * 0.5 + -this.negSafeMod(y + halfTileHeight, 64) + -yOffset);
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
      const tilePixelLayers = this.map.getSlice(priority, xTile, yTile, tilesWide, tilesHigh, delta);
      for (const tilePixels of tilePixelLayers) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tilesWide, tilesHigh, 0, gl.RGBA, gl.UNSIGNED_BYTE, tilePixels);
        this.setRectangle(xPos + this.tileWidth * 0.5 * zoom, yPos + this.tileHeight * zoom, this.width * zoom, this.height * zoom);
        if (priority === 'foreground') {
          this.spriteBoard.drawProgram.uniformF('u_region', 1, 1, 1, 0);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.effectBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Cleanup...
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
      const gl = this.spriteBoard.gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
      const x1 = x;
      const x2 = x + width;
      const y1 = y;
      const y2 = y + height;
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
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let ParallaxLayer = /*#__PURE__*/_createClass(function ParallaxLayer() {
  _classCallCheck(this, ParallaxLayer);
  _defineProperty(this, "texture", null);
  _defineProperty(this, "width", 0);
  _defineProperty(this, "height", 0);
  _defineProperty(this, "offset", 0);
  _defineProperty(this, "parallax", 0);
});
let Parallax = exports.Parallax = /*#__PURE__*/function () {
  function Parallax(_ref) {
    let spriteBoard = _ref.spriteBoard,
      map = _ref.map;
    _classCallCheck(this, Parallax);
    this[_Bindable.Bindable.Prevent] = true;
    this.spriteBoard = spriteBoard;
    const gl = this.spriteBoard.gl2d.context;
    this.map = map;
    this.texture = null;
    this.height = 0;
    this.slices = ['parallax/mountains-0.png', 'parallax/sky-0-recolor.png', 'parallax/sky-1-recolor.png', 'parallax/sky-1b-recolor.png', 'parallax/sky-2-recolor.png'];
    this.parallaxLayers = [];
    this.textures = [];
    this.ready = map.ready.then(() => this.assemble(map)).then(() => {
      this.loaded = true;
    });
    this.loaded = false;
    this.x = 0;
    this.y = 0;
  }
  return _createClass(Parallax, [{
    key: "assemble",
    value: function assemble() {
      const gl = this.spriteBoard.gl2d.context;
      const loadSlices = this.map.imageLayers.map((layerData, index) => this.constructor.loadImage(new URL(layerData.image, this.map.src)).then(image => {
        var _layerData$offsety, _layerData$parallaxx;
        const texture = this.textures[index] = gl.createTexture();
        const layer = this.parallaxLayers[index] = new ParallaxLayer();
        const layerBottom = image.height + layerData.offsety;
        if (this.height < layerBottom) {
          this.height = layerBottom;
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
      }));
      return Promise.all(loadSlices);
    }
  }, {
    key: "draw",
    value: function draw() {
      if (!this.loaded) {
        return;
      }
      const gl = this.spriteBoard.gl2d.context;
      const zoom = this.spriteBoard.zoomLevel;
      this.x = this.spriteBoard.following.x + -this.spriteBoard.width / zoom * 0.5;
      this.y = this.spriteBoard.following.y;
      this.spriteBoard.drawProgram.uniformI('u_renderParallax', 1);
      this.spriteBoard.drawProgram.uniformF('u_scroll', this.x, this.y);
      gl.activeTexture(gl.TEXTURE0);
      for (const layer of this.parallaxLayers) {
        gl.bindTexture(gl.TEXTURE_2D, layer.texture);
        this.spriteBoard.drawProgram.uniformF('u_size', layer.width, layer.width);
        this.spriteBoard.drawProgram.uniformF('u_parallax', layer.parallax, 0);
        this.setRectangle(0, this.spriteBoard.height + (-this.height + layer.offset) * zoom, layer.width * zoom, layer.height * zoom, layer.width);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      this.spriteBoard.drawProgram.uniformI('u_renderParallax', 0);

      // Cleanup...
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      const gl = this.spriteBoard.gl2d.context;
      const ratio = this.spriteBoard.width / width;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, ratio, 0.0, 0.0, 1.0, 0.0, 1.0, ratio, 0.0, ratio, 1.0]), gl.STATIC_DRAW);
      const x1 = x - 0;
      const x2 = x + this.spriteBoard.width;
      const y1 = y;
      const y2 = y + height;
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
      this.imagePromises[src] = new Promise((accept, reject) => {
        const image = new Image();
        image.src = src;
        image.addEventListener('load', event => {
          accept(image);
        });
      });
      return this.imagePromises[src];
    }
  }]);
}();
});

;require.register("sprite/Region.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Region = void 0;
var _Bindable = require("curvature/base/Bindable");
var _SpriteSheet = require("./SpriteSheet");
var _Matrix = require("../math/Matrix");
var _Camera = require("./Camera");
var _Rectangle = require("../math/Rectangle");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const rectMap = new WeakMap();
let Region = exports.Region = /*#__PURE__*/function () {
  function Region(_ref) {
    let x = _ref.x,
      y = _ref.y,
      z = _ref.z,
      width = _ref.width,
      height = _ref.height,
      spriteBoard = _ref.spriteBoard;
    _classCallCheck(this, Region);
    this[_Bindable.Bindable.Prevent] = true;
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.width = width || 32;
    this.height = height || 32;
    this.visible = false;
    this.gravity = 0.5;
    this.drag = 0.95;
    this.rect = new _Rectangle.Rectangle(this.x, this.y, this.x + this.width, this.y + this.height);
    rectMap.set(this.rect, this);
    this.spriteBoard = spriteBoard;

    // this.region = [0, 0, 0, 1];
    this.region = [0, 1, 1, 1];
    const gl = this.spriteBoard.gl2d.context;
    this.texture = gl.createTexture();
    const singlePixel = new Uint8ClampedArray([this.region[0] * 255, this.region[1] * 255, this.region[2] * 255, this.region[3] * 255]);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, singlePixel);
  }
  return _createClass(Region, [{
    key: "draw",
    value: function draw(delta) {
      const gl = this.spriteBoard.gl2d.context;
      const zoom = this.spriteBoard.zoomLevel;
      this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      this.setRectangle(this.x * zoom + -_Camera.Camera.x + this.spriteBoard.width / 2, this.y * zoom + -_Camera.Camera.y + this.spriteBoard.height / 2, this.width * zoom, this.height * zoom);

      // gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
      // gl.drawArrays(gl.TRIANGLES, 0, 6);

      this.spriteBoard.drawProgram.uniformF('u_region', ...Object.assign(this.region || [0, 0, 0], {
        3: 1
      }));
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.effectBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

      // Cleanup...
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      const gl = this.spriteBoard.gl2d.context;
      const zoom = this.spriteBoard.zoomLevel;
      const xra = 1.0;
      const yra = 1.0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, xra, 0.0, 0.0, yra, 0.0, yra, xra, 0.0, xra, yra]), gl.STATIC_DRAW);
      const x1 = x;
      const y1 = y;
      const x2 = x + width;
      const y2 = y + height;
      const points = new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]);
      const xOff = x + width;
      const yOff = y + height;

      // this.theta = performance.now() / 1000;

      const t = _Matrix.Matrix.transform(points, _Matrix.Matrix.composite(_Matrix.Matrix.translate(xOff + -width * 0.0, yOff + zoom + 16 * zoom)
      // , Matrix.shearX(this.shearX)
      // , Matrix.shearX(this.shearY)
      // , Matrix.scale(this.scale * this.scaleX, this.scale * this.scaleY)
      // , Matrix.rotate(this.theta)
      , _Matrix.Matrix.translate(-xOff, -yOff)));
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
      gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
    }
  }], [{
    key: "fromRect",
    value: function fromRect(rect) {
      return rectMap.get(rect);
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
var _SpriteSheet = require("./SpriteSheet");
var _Matrix = require("../math/Matrix");
var _Camera = require("./Camera");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Sprite = exports.Sprite = /*#__PURE__*/function () {
  function Sprite(_ref) {
    let src = _ref.src,
      color = _ref.color,
      pixels = _ref.pixels,
      session = _ref.session,
      spriteSheet = _ref.spriteSheet,
      x = _ref.x,
      y = _ref.y,
      z = _ref.z,
      width = _ref.width,
      height = _ref.height,
      originalWidth = _ref.originalWidth,
      originalHeight = _ref.originalHeight,
      _ref$tiled = _ref.tiled,
      tiled = _ref$tiled === void 0 ? false : _ref$tiled;
    _classCallCheck(this, Sprite);
    this[_Bindable.Bindable.Prevent] = true;
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.currentAnimation = null;
    this.width = width || 32;
    this.height = height || 32;
    this.originalWidth = originalWidth !== null && originalWidth !== void 0 ? originalWidth : this.width;
    this.originalHeight = originalHeight !== null && originalHeight !== void 0 ? originalHeight : this.height;
    this.tiled = tiled;
    this.scale = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.theta = 0;
    this.shearX = 0;
    this.shearY = 0;
    this.xCenter = 0.5;
    this.yCenter = 1.0;
    this.visible = false;
    this.textures = [];
    this.frames = [];
    this.currentDelay = 0;
    this.currentFrame = 0;
    this.currentFrames = '';
    this.speed = 0;
    this.maxSpeed = 4;
    this.RIGHT = 0;
    this.DOWN = 1;
    this.LEFT = 2;
    this.UP = 3;
    this.EAST = this.RIGHT;
    this.SOUTH = this.DOWN;
    this.WEST = this.LEFT;
    this.NORTH = this.UP;
    this.region = [0, 0, 0, 1];
    this.spriteBoard = session.spriteBoard;
    const gl = this.spriteBoard.gl2d.context;
    this.texture = gl.createTexture();
    const singlePixel = color ? new Uint8Array(color) : new Uint8Array([Math.trunc(Math.random() * 255), Math.trunc(Math.random() * 255), Math.trunc(Math.random() * 255), 255]);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, singlePixel);
    if (src && !spriteSheet) {
      spriteSheet = new _SpriteSheet.SpriteSheet({
        image: src
      });
    }
    this.spriteSheet = spriteSheet;
    if (spriteSheet) {
      spriteSheet.ready.then(() => {
        this.width = spriteSheet.tileWidth;
        this.height = spriteSheet.tileHeight;
        this.originalWidth = originalWidth !== null && originalWidth !== void 0 ? originalWidth : this.width;
        this.originalHeight = originalHeight !== null && originalHeight !== void 0 ? originalHeight : this.height;
        this.texture = this.createTexture(spriteSheet.getFrame(0));
        for (let i = 0; i < spriteSheet.tileCount; i++) {
          this.textures[i] = this.createTexture(spriteSheet.getFrame(i));
        }
        this.changeAnimation('default');
      });
    }
  }
  return _createClass(Sprite, [{
    key: "draw",
    value: function draw(delta) {
      if (this.currentDelay > 0) {
        this.currentDelay -= delta;
      } else {
        this.currentFrame++;
        if (this.spriteSheet && this.spriteSheet.animations[this.currentAnimation]) {
          const animation = this.spriteSheet.animations[this.currentAnimation];
          if (this.currentFrame >= animation.length) {
            this.currentFrame = this.currentFrame % animation.length;
          }
          const textureId = animation[this.currentFrame].tileid;
          const texture = this.textures[textureId];
          if (texture) {
            this.currentDelay = animation[this.currentFrame].duration;
            this.texture = texture;
          }
        }
      }
      const gl = this.spriteBoard.gl2d.context;
      const zoom = this.spriteBoard.zoomLevel;
      this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      this.setRectangle(this.x * zoom + -_Camera.Camera.x + this.spriteBoard.width / 2, this.y * zoom + -_Camera.Camera.y + this.spriteBoard.height / 2 + -this.height * zoom, this.width * zoom, this.height * zoom);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.spriteBoard.drawProgram.uniformF('u_region', ...Object.assign(this.region || [0, 0, 0], {
        3: 1
      }));
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.effectBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

      // Cleanup...
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }, {
    key: "changeAnimation",
    value: function changeAnimation(name) {
      if (!this.spriteSheet || !this.spriteSheet.animations[name]) {
        // console.warn(`Animation ${name} not found.`);
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
      const gl = this.spriteBoard.gl2d.context;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (this.tiled) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return texture;
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      const gl = this.spriteBoard.gl2d.context;
      const zoom = this.spriteBoard.zoomLevel;
      const xra = this.width / this.originalWidth;
      const yra = this.height / this.originalHeight;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, xra, 0.0, 0.0, yra, 0.0, yra, xra, 0.0, xra, yra]), gl.STATIC_DRAW);
      const x1 = x;
      const y1 = y;
      const x2 = x + width;
      const y2 = y + height;
      const points = new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]);
      const xOff = x + width * this.xCenter;
      const yOff = y + height * this.yCenter;

      // this.theta = performance.now() / 1000;

      const t = _Matrix.Matrix.transform(points, _Matrix.Matrix.composite(_Matrix.Matrix.translate(xOff + -width * 0.5, yOff + zoom + 16 * zoom), _Matrix.Matrix.shearX(this.shearX), _Matrix.Matrix.shearX(this.shearY), _Matrix.Matrix.scale(this.scale * this.scaleX, this.scale * this.scaleY), _Matrix.Matrix.rotate(this.theta), _Matrix.Matrix.translate(-xOff, -yOff)));
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
var _Bindable = require("curvature/base/Bindable");
var _MapRenderer = require("./MapRenderer");
var _Parallax = require("./Parallax");
var _Gl2d = require("../gl2d/Gl2d");
var _Camera = require("./Camera");
var _Region = require("./Region");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let SpriteBoard = exports.SpriteBoard = /*#__PURE__*/function () {
  function SpriteBoard(_ref) {
    let element = _ref.element,
      world = _ref.world;
    _classCallCheck(this, SpriteBoard);
    this[_Bindable.Bindable.Prevent] = true;
    this.maps = [];
    this.currentMap = null;
    this.world = world;
    this.sprites = new Set();
    this.regions = new Set();
    this.screenScale = 1;
    this.zoomLevel = 2;
    this.mouse = {
      x: null,
      y: null,
      clickX: null,
      clickY: null
    };
    this.parallax = null;
    this.width = element.width;
    this.height = element.height;
    _Camera.Camera.width = element.width;
    _Camera.Camera.height = element.height;
    this.gl2d = new _Gl2d.Gl2d(element);
    this.gl2d.enableBlending();
    const attributes = ['a_position', 'a_texCoord'];
    const uniforms = ['u_image', 'u_effect', 'u_tiles', 'u_tileMapping', 'u_size', 'u_scroll', 'u_tileSize', 'u_resolution', 'u_mapTextureSize', 'u_region', 'u_parallax', 'u_time', 'u_renderTiles', 'u_renderParallax', 'u_renderMode'];
    this.renderMode = 0;
    this.drawProgram = this.gl2d.createProgram({
      vertexShader: this.gl2d.createShader('sprite/texture.vert'),
      fragmentShader: this.gl2d.createShader('sprite/texture.frag'),
      attributes: attributes,
      uniforms: uniforms
    });
    this.drawProgram.use();
    this.drawLayer = this.gl2d.createTexture(1000, 1000);
    this.effectLayer = this.gl2d.createTexture(1000, 1000);
    this.drawBuffer = this.gl2d.createFramebuffer(this.drawLayer);
    this.effectBuffer = this.gl2d.createFramebuffer(this.effectLayer);
    document.addEventListener('mousemove', event => {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    });
    this.mapRenderers = new Map();
    this.following = null;
  }
  return _createClass(SpriteBoard, [{
    key: "draw",
    value: function draw(delta) {
      if (this.following) {
        _Camera.Camera.x = this.following.x * this.zoomLevel || 0;
        _Camera.Camera.y = this.following.y * this.zoomLevel || 0;
        const maps = [...this.world.getMapsForPoint(this.following.x, this.following.y)];
        if (maps[0] && this.currentMap !== maps[0]) {
          const parallax = this.nextParallax = new _Parallax.Parallax({
            spriteBoard: this,
            map: maps[0]
          });
          this.nextParallax.ready.then(() => {
            if (this.nextParallax === parallax) {
              this.parallax = parallax;
            }
          });
          this.currentMap = maps[0];
        }
        const visibleMaps = this.world.getMapsForRect(this.following.x, this.following.y, _Camera.Camera.width, _Camera.Camera.height);
        const mapRenderers = new Set();
        visibleMaps.forEach(map => {
          map.visible = true;
          if (this.mapRenderers.has(map)) {
            mapRenderers.add(this.mapRenderers.get(map));
            return;
          }
          const renderer = new _MapRenderer.MapRenderer({
            spriteBoard: this,
            map: map
          });
          mapRenderers.add(renderer);
          renderer.resize(_Camera.Camera.width, _Camera.Camera.height);
          this.mapRenderers.set(map, renderer);
        });
        new Set(this.mapRenderers.keys()).difference(visibleMaps).forEach(map => {
          this.mapRenderers.delete(map);
          map.visible = false;
        });
      }
      const gl = this.gl2d.context;
      this.drawProgram.uniformF('u_size', _Camera.Camera.width, _Camera.Camera.height);
      this.drawProgram.uniformF('u_resolution', gl.canvas.width, gl.canvas.height);
      this.drawProgram.uniformI('u_renderMode', this.renderMode);
      this.drawProgram.uniformF('u_time', performance.now());
      this.drawProgram.uniformF('u_region', 0, 0, 0, 0);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectBuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (this.currentMap && this.currentMap.backgroundColor) {
        // const color = this.currentMap.backgroundColor.substr(1);
        const color = this.currentMap.backgroundColor;
        const r = color[0] / 255; //parseInt(color.substr(-6, 2), 16) / 255;
        const b = color[1] / 255; //parseInt(color.substr(-4, 2), 16) / 255;
        const g = color[2] / 255; //parseInt(color.substr(-2, 2), 16) / 255;
        const a = color[3] / 255; //color.length === 8 ? parseInt(color.substr(-8, 2), 16) / 255 : 1;

        gl.clearColor(r, g, b, a);
      } else {
        gl.clearColor(0, 0, 0, 1);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.clearColor(0, 0, 0, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawProgram.uniformF('u_size', _Camera.Camera.width, _Camera.Camera.height);
      let sprites = [...this.sprites];
      sprites.sort((a, b) => {
        if (a.y === undefined) {
          return -1;
        }
        if (b.y === undefined) {
          return 1;
        }
        return a.y - b.y;
      });
      this.parallax && this.parallax.draw();
      this.mapRenderers.forEach(mr => mr.draw(delta, 'background'));
      sprites.forEach(s => s.visible && s.draw(delta));
      this.mapRenderers.forEach(mr => mr.draw(delta, 'midground'));
      this.regions.forEach(r => r.draw());
      this.mapRenderers.forEach(mr => mr.draw(delta, 'foreground'));

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
      const gl = this.gl2d.context;
      width = width || this.gl2d.element.width;
      height = height || this.gl2d.element.height;
      this.width = width;
      this.height = height;
      _Camera.Camera.x *= this.zoomLevel;
      _Camera.Camera.y *= this.zoomLevel;
      _Camera.Camera.width = width / this.zoomLevel;
      _Camera.Camera.height = height / this.zoomLevel;
      this.mapRenderers.forEach(mr => mr.resize(_Camera.Camera.width, _Camera.Camera.height));
      gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }, {
    key: "zoom",
    value: function zoom(delta) {
      const max = this.screenScale * 32;
      const min = this.screenScale * 0.2;
      const step = 0.05 * this.zoomLevel;
      let zoomLevel = delta * step + this.zoomLevel;
      if (zoomLevel < min) {
        zoomLevel = min;
      } else if (zoomLevel > max) {
        zoomLevel = max;
      }
      if (Math.abs(zoomLevel - 1) < 0.05) {
        zoomLevel = 1;
      }
      if (this.zoomLevel !== zoomLevel) {
        this.zoomLevel = zoomLevel;
        this.resize();
      }
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      const gl = this.gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.drawProgram.buffers.a_texCoord);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
      const x1 = x;
      const x2 = x + width;
      const y1 = y;
      const y2 = y + height;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.drawProgram.buffers.a_position);
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
var _Tileset2 = require("./Tileset");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == typeof e || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
let SpriteSheet = exports.SpriteSheet = /*#__PURE__*/function (_Tileset) {
  function SpriteSheet(tilesetData) {
    var _this;
    _classCallCheck(this, SpriteSheet);
    _this = _callSuper(this, SpriteSheet, [tilesetData]);
    _this.animations = {
      default: [{
        tileid: 0,
        duration: Infinity
      }]
    };
    _this.canvas = document.createElement('canvas');
    _this.context = _this.canvas.getContext("2d", {
      willReadFrequently: true
    });
    _this.frames = [];
    _this.ready = _this.ready.then(() => {
      _this.processImage();
      for (const tile of _this.tiles) {
        if (tile.animation) {
          _this.animations[tile.type] = tile.animation;
        } else if (tile.type) {
          _this.animations[tile.type] = [{
            duration: Infinity,
            tileid: tile.id
          }];
        }
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
      for (let i = 0; i < this.tileCount; i++) {
        this.frames[i] = this.getFrame(i);
      }
    }
  }, {
    key: "getFrame",
    value: function getFrame(frameId) {
      frameId = frameId % this.tileCount;
      const i = frameId % this.columns;
      const j = Math.floor(frameId / this.columns);
      return this.context.getImageData(i * this.tileWidth, j * this.tileHeight, this.tileWidth, this.tileHeight).data;
    }
  }]);
}(_Tileset2.Tileset);
});

;require.register("sprite/TextureBank.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TextureBank = void 0;
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
let TextureBank = exports.TextureBank = /*#__PURE__*/_createClass(function TextureBank() {
  _classCallCheck(this, TextureBank);
});
});

;require.register("sprite/Tileset.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tileset = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const cache = new Map();
let Tileset = exports.Tileset = /*#__PURE__*/function () {
  function Tileset(_ref) {
    let source = _ref.source,
      src = _ref.src,
      map = _ref.map,
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
    src = src !== null && src !== void 0 ? src : source;
    if (src) {
      this.src = new URL(src, location);
    }
    this.map = map;
    this.animations = {};
    this.ready = this.getReady({
      src: src,
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
    value: async function getReady(_ref2) {
      let src = _ref2.src,
        columns = _ref2.columns,
        image = _ref2.image,
        imageheight = _ref2.imageheight,
        imagewidth = _ref2.imagewidth,
        margin = _ref2.margin,
        name = _ref2.name,
        spacing = _ref2.spacing,
        tilecount = _ref2.tilecount,
        tileheight = _ref2.tileheight,
        tilewidth = _ref2.tilewidth,
        tiles = _ref2.tiles;
      if (src) {
        if (!cache.has(src)) {
          console.log(src);
          cache.set(src, fetch(src));
        }
        var _await$await$cache$ge = await (await cache.get(src)).clone().json();
        columns = _await$await$cache$ge.columns;
        image = _await$await$cache$ge.image;
        imageheight = _await$await$cache$ge.imageheight;
        imagewidth = _await$await$cache$ge.imagewidth;
        margin = _await$await$cache$ge.margin;
        name = _await$await$cache$ge.name;
        spacing = _await$await$cache$ge.spacing;
        tilecount = _await$await$cache$ge.tilecount;
        tileheight = _await$await$cache$ge.tileheight;
        tilewidth = _await$await$cache$ge.tilewidth;
        tiles = _await$await$cache$ge.tiles;
        for (const tile of tiles) {
          tile.id += this.firstGid;
        }
      }
      this.columns = columns !== null && columns !== void 0 ? columns : 1;
      this.margin = margin !== null && margin !== void 0 ? margin : 0;
      this.name = name !== null && name !== void 0 ? name : image;
      this.spacing = spacing !== null && spacing !== void 0 ? spacing : 0;
      this.tiles = tiles !== null && tiles !== void 0 ? tiles : [];
      this.tileCount = tilecount !== null && tilecount !== void 0 ? tilecount : 1;
      let imgSrc = null;
      if (this.src) {
        imgSrc = new URL(image, this.src);
      } else if (this.map) {
        imgSrc = new URL(image, this.map.src);
      } else {
        imgSrc = new URL(image, location);
      }
      if (!cache.has(imgSrc.href)) {
        const image = new Image();
        image.src = imgSrc;
        cache.set(imgSrc.href, new Promise(accept => image.onload = () => accept(image)));
      }
      this.image = await cache.get(imgSrc.href);
      this.imageWidth = imagewidth !== null && imagewidth !== void 0 ? imagewidth : this.image.width;
      this.imageHeight = imageheight !== null && imageheight !== void 0 ? imageheight : this.image.height;
      this.tileWidth = tilewidth !== null && tilewidth !== void 0 ? tilewidth : this.imageWidth;
      this.tileHeight = tileheight !== null && tileheight !== void 0 ? tileheight : this.imageHeight;
      this.rows = Math.ceil(imageheight / tileheight) || 1;
      for (const tile of this.tiles) {
        if (tile.animation) {
          this.animations[tile.id] = tile.animation;
        }
      }
    }
  }]);
}();
});

;require.register("sprite/texture.frag", function(exports, require, module) {
module.exports = "// texture.frag\n#define M_PI 3.1415926535897932384626433832795\n#define M_TAU M_PI / 2.0\nprecision mediump float;\n\nvarying vec2 v_texCoord;\nvarying vec2 v_position;\n\nuniform sampler2D u_image;\nuniform sampler2D u_effect;\nuniform sampler2D u_tiles;\nuniform sampler2D u_tileMapping;\n\nuniform vec2 u_size;\nuniform vec2 u_tileSize;\nuniform vec2 u_resolution;\nuniform vec2 u_mapTextureSize;\n\nuniform vec4 u_color;\nuniform vec4 u_region;\nuniform vec2 u_parallax;\nuniform vec2 u_scroll;\n\nuniform float u_time;\nuniform int u_renderTiles;\nuniform int u_renderParallax;\nuniform int u_renderMode;\n\nfloat masked = 0.0;\nfloat sorted = 1.0;\nfloat displace = 1.0;\nfloat blur = 1.0;\n\nvec2 rippleX(vec2 texCoord, float a, float b, float c) {\n  vec2 rippled = vec2(\n    v_texCoord.x + sin(v_texCoord.y * (a * u_size.y) + b) * c / u_size.x,\n    v_texCoord.y\n  );\n\n  if (rippled.x < 0.0) {\n    rippled.x = abs(rippled.x);\n  }\n  else if (rippled.x > u_size.x) {\n    rippled.x = u_size.x - (rippled.x - u_size.x);\n  }\n\n  return rippled;\n}\n\nvec2 rippleY(vec2 texCoord, float a, float b, float c) {\n  vec2 rippled = vec2(v_texCoord.x, v_texCoord.y + sin(v_texCoord.x * (a * u_size.x) + b) * c / u_size.y);\n\n  if (rippled.y < 0.0) {\n    rippled.x = abs(rippled.x);\n  }\n  else if (rippled.y > u_size.y) {\n    rippled.y = u_size.y - (rippled.y - u_size.y);\n  }\n\n  return rippled;\n}\n\nvec4 motionBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {\n  vec4 originalColor = texture2D(image, textCoord);\n  vec4 dispColor = originalColor;\n\n  const float max = 10.0;\n  float weight = 0.85;\n\n  for (float i = 0.0; i < max; i += 1.0) {\n    if(i > abs(magnitude) || originalColor.a < 1.0) {\n      break;\n    }\n    vec4 dispColorDown = texture2D(image, textCoord + vec2(\n      cos(angle) * i * sign(magnitude) / u_size.x,\n      sin(angle) * i * sign(magnitude) / u_size.y\n    ));\n    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight;\n    weight *= 0.8;\n  }\n\n  return dispColor;\n}\n\nvec4 linearBlur(sampler2D image, float angle, float magnitude, vec2 textCoord) {\n  vec4 originalColor = texture2D(image, textCoord);\n  vec4 dispColor = texture2D(image, textCoord);\n\n  const float max = 10.0;\n  float weight = 0.65;\n\n  for (float i = 0.0; i < max; i += 0.25) {\n    if(i > abs(magnitude)) {\n      break;\n    }\n    vec4 dispColorUp = texture2D(image, textCoord + vec2(\n      cos(angle) * -i * sign(magnitude) / u_size.x,\n      sin(angle) * -i * sign(magnitude) / u_size.y\n    ));\n    vec4 dispColorDown = texture2D(image, textCoord + vec2(\n      cos(angle) * i * sign(magnitude) / u_size.x,\n      sin(angle) * i * sign(magnitude) / u_size.y\n    ));\n    dispColor = dispColor * (1.0 - weight) + dispColorDown * weight * 0.5 + dispColorUp * weight * 0.5;\n    weight *= 0.70;\n  }\n\n  return dispColor;\n}\n\nvoid main() {\n  vec4 originalColor = texture2D(u_image, v_texCoord);\n  vec4 effectColor = texture2D(u_effect,  v_texCoord);\n\n  // This only applies when drawing the parallax background\n  if (u_renderParallax == 1) {\n\n    float texelSize = 1.0 / u_size.x;\n\n    vec2 parallaxCoord = v_texCoord * vec2(1.0, -1.0) + vec2(0.0, 1.0)\n      + vec2(u_scroll.x * texelSize * u_parallax.x, 0.0);\n      // + vec2(u_time / 10000.0, 0.0);\n      // + vec2(, 0.0);\n      ;\n\n    gl_FragColor = texture2D(u_image,  parallaxCoord);\n\n    return;\n  }\n\n  // This only applies when drawing tiles.\n  if (u_renderTiles == 1) {\n    float xTiles = floor(u_size.x / u_tileSize.x);\n    float yTiles = floor(u_size.y / u_tileSize.y);\n\n    float xT = (v_texCoord.x * u_size.x) / u_tileSize.x;\n    float yT = (v_texCoord.y * u_size.y) / u_tileSize.y;\n\n    float inv_xTiles = 1.0 / xTiles;\n    float inv_yTiles = 1.0 / yTiles;\n\n    float xTile = floor(xT) * inv_xTiles;\n    float yTile = floor(yT) * inv_yTiles;\n\n    float xOff = (xT * inv_xTiles - xTile) * xTiles;\n    float yOff = (yT * inv_yTiles - yTile) * yTiles * -1.0 + 1.0;\n\n    float xWrap = u_mapTextureSize.x / u_tileSize.x;\n    float yWrap = u_mapTextureSize.y / u_tileSize.y;\n\n    // Mode 1 draws tiles' x/y values as red & green\n    if (u_renderMode == 1) {\n      gl_FragColor = vec4(xTile, yTile, 0, 1.0);\n      return;\n    }\n\n    // Mode 2 is the same as mode 1 but adds combines\n    // internal tile x/y to the blue channel\n    if (u_renderMode == 2) {\n      gl_FragColor = vec4(xTile, yTile, (xOff + yOff) * 0.5, 1.0);\n      return;\n    }\n\n    vec4 tile = texture2D(u_tileMapping, v_texCoord * vec2(1.0, -1.0) + vec2(0.0, 1.0));\n\n    float lo = tile.r * 256.0;\n    float hi = tile.g * 256.0 * 256.0;\n\n    float tileNumber = lo + hi;\n\n    if (tileNumber == 0.0) {\n      gl_FragColor.a = 0.0;\n      return;\n    }\n\n    // Mode 3 uses the tile number for the red/green channels\n    if (u_renderMode == 3) {\n      gl_FragColor = tile;\n      gl_FragColor.b = 0.5;\n      gl_FragColor.a = 1.0;\n      return;\n    }\n\n    // Mode 4 normalizes the tile number to all channels\n    if (u_renderMode == 4) {\n      gl_FragColor = vec4(\n        mod(tileNumber, 256.0) / 256.0\n        , mod(tileNumber, 256.0) / 256.0\n        , mod(tileNumber, 256.0) / 256.0\n        , 1.0\n      );\n      return;\n    }\n\n    float tileSetX = floor(mod((-1.0 + tileNumber), xWrap));\n    float tileSetY = floor((-1.0 + tileNumber) / xWrap);\n\n    vec4 tileColor = texture2D(u_tiles, vec2(\n      xOff / xWrap + tileSetX * (u_tileSize.y / u_mapTextureSize.y)\n      , yOff / yWrap + tileSetY * (u_tileSize.y / u_mapTextureSize.y)\n    ));\n\n    if(tileColor.a > 0.0 && u_region == vec4(1.0, 1.0, 1.0, 0.0)) {\n      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n      return;\n    }\n\n    gl_FragColor = tileColor;\n\n    return;\n  }\n\n  // This if/else block only applies\n  // when we're drawing the effectBuffer\n  if (u_region.r > 0.0 || u_region.g > 0.0 || u_region.b > 0.0) { // We have an effect color\n    if (masked < 1.0 || originalColor.a > 0.0) { // Use the provided color\n      gl_FragColor = u_region;\n    }\n    return;\n  }\n  else if (u_region.a > 0.0) {\n    if (sorted > 0.0) {\n      gl_FragColor = vec4(0.0, 0.0, 0.0, originalColor.a > 0.0 ? 1.0 : 0.0);\n    }\n    else {\n      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);\n    }\n    return;\n  };\n\n  // Mode 5 draws the effect buffer to the screen\n  if (u_renderMode == 5) {\n    gl_FragColor = effectColor;\n    return;\n  }\n\n  vec3 ripple = vec3(M_PI/8.0, u_time / 200.0, 1.0);\n\n  // This if/else block only applies\n  // when we're drawing the drawBuffer\n  if (effectColor == vec4(0, 1, 1, 1)) { // Water effect\n    vec2 texCoord = v_texCoord;\n    vec4 v_blurredColor = originalColor;\n    if (displace > 0.0) {\n      texCoord = rippleX(v_texCoord, ripple.x * 0.1, ripple.y, ripple.z * 2.0);\n      v_blurredColor = texture2D(u_image, texCoord);\n    }\n    if (blur > 0.0) {\n      v_blurredColor = linearBlur(u_image, 0.0, 1.0, texCoord);\n    }\n    gl_FragColor = v_blurredColor * 0.65 + effectColor * 0.35;\n  }\n  else if (effectColor == vec4(1, 0, 0, 1)) { // Fire effect\n    vec2 v_displacement = rippleY(v_texCoord, ripple.x * 3.0, ripple.y * 1.5, ripple.z * 0.333);\n    vec4 v_blurredColor = originalColor;\n    if (displace > 0.0) {\n      v_blurredColor = texture2D(u_image, v_displacement);\n    }\n    if (blur > 0.0) {\n      v_blurredColor = motionBlur(u_image, -M_TAU, 1.0, v_displacement);\n    }\n    gl_FragColor = v_blurredColor * 0.75 + effectColor * 0.25;\n  }\n  else { // Null effect\n    gl_FragColor = originalColor;\n  }\n}\n"
});

;require.register("sprite/texture.vert", function(exports, require, module) {
module.exports = "// texture.vert\nprecision mediump float;\n\nattribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform vec2 u_resolution;\n\nvarying vec2 v_texCoord;\nvarying vec2 v_position;\n\nvoid main()\n{\n  vec2 zeroToOne = a_position / u_resolution;\n  vec2 zeroToTwo = zeroToOne * 2.0;\n  vec2 clipSpace = zeroToTwo - 1.0;\n\n  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n  v_texCoord  = a_texCoord;\n  v_position  = a_position;\n}\n"
});

;require.register("ui/OnScreenJoyPad.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OnScreenJoyPad = void 0;
var _View2 = require("curvature/base/View");
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == typeof e || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
let OnScreenJoyPad = exports.OnScreenJoyPad = /*#__PURE__*/function (_View) {
  function OnScreenJoyPad(args) {
    var _this;
    _classCallCheck(this, OnScreenJoyPad);
    _this = _callSuper(this, OnScreenJoyPad, [args]);
    _this.template = require('./onScreenJoyPad.tmp');
    _this.dragStart = false;
    _this.args.dragging = false;
    _this.args.x = 0;
    _this.args.y = 0;
    window.addEventListener('mousemove', event => {
      _this.moveStick(event);
    });
    window.addEventListener('mouseup', event => {
      _this.dropStick(event);
    });
    window.addEventListener('touchmove', event => {
      _this.moveStick(event);
    });
    window.addEventListener('touchend', event => {
      _this.dropStick(event);
    });
    return _this;
  }
  _inherits(OnScreenJoyPad, _View);
  return _createClass(OnScreenJoyPad, [{
    key: "dragStick",
    value: function dragStick(event) {
      let pos = event;
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
        let pos = event;
        if (event.touches && event.touches[0]) {
          pos = event.touches[0];
        }
        this.args.xx = pos.clientX - this.dragStart.x;
        this.args.yy = pos.clientY - this.dragStart.y;
        const limit = 50;
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

;require.register("ui/onScreenJoyPad.tmp.html", function(exports, require, module) {
module.exports = "<div class = \"controller\">\n\t<div class = \"joystick\" cv-on = \"\n\t\ttouchstart:dragStick(event):p;\n\t\tmousedown:dragStick(event):p;\n\t\">\n\t\t<div class = \"pad\" style = \"position: relative; transform:translate([[x]]px,[[y]]px);\"></div>\n\t</div>\n\n\t<div class = \"button\">A</div>\n\t<div class = \"button\">B</div>\n\t<div class = \"button\">C</div>\n</div>"
});

;require.register("world/Pallet.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Pallet = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Pallet = exports.Pallet = /*#__PURE__*/function () {
  function Pallet() {
    _classCallCheck(this, Pallet);
    _defineProperty(this, "objectPallet", {});
  }
  return _createClass(Pallet, [{
    key: "resolve",
    value: async function resolve(typeName) {
      if (typeName[0] === '@') {
        if (this.objectPallet[typeName]) {
          return this.objectPallet[typeName];
        }
      } else if (typeName === 'http://' || typeName === 'https://') {
        return (await import(typeName)).default;
      }
    }
  }, {
    key: "register",
    value: function register(typeName, spawnClass) {
      if (this.objectPallet[typeName]) {
        console.warn(`Overwriting spawnclass!`);
      }
      this.objectPallet[typeName] = spawnClass;
    }
  }]);
}();
});

;require.register("world/Properties.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Properties = void 0;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let Properties = exports.Properties = /*#__PURE__*/function () {
  function Properties(properties, owner) {
    _classCallCheck(this, Properties);
    this.properties = {};
    this.owner = owner;
    this.add(...properties);
  }
  return _createClass(Properties, [{
    key: "get",
    value: function get(name) {
      let index = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      if (!this.properties[name]) {
        return;
      }
      return this.properties[name][index];
    }
  }, {
    key: "has",
    value: function has(name) {
      return !!this.properties[name];
    }
  }, {
    key: "add",
    value: function add() {
      for (var _len = arguments.length, properties = new Array(_len), _key = 0; _key < _len; _key++) {
        properties[_key] = arguments[_key];
      }
      for (const property of properties) {
        if (!this.properties[property.name]) {
          this.properties[property.name] = [];
        }
        switch (property.type) {
          case 'color':
            this.properties[property.name].push(new Uint8ClampedArray([parseInt(property.value.substr(3, 2), 16), parseInt(property.value.substr(5, 2), 16), parseInt(property.value.substr(7, 2), 16), parseInt(property.value.substr(1, 2), 16)]));
            break;
          case 'file':
            this.properties[property.name].push([new URL(property.value, this.owner.src)]);
            break;
          default:
            this.properties[property.name].push(property.value);
        }
      }
    }
  }, {
    key: "getAll",
    value: function getAll(name) {
      return [...this.properties[name]];
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
var _QuickTree = require("../math/QuickTree");
var _Spawner = require("../model/Spawner");
var _SMTree = require("../math/SMTree");
var _Region = require("../sprite/Region");
var _Rectangle = require("../math/Rectangle");
var _Properties = require("./Properties");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const cache = new Map();
let Animation = /*#__PURE__*/function () {
  function Animation(_ref) {
    let frames = _ref.frames,
      x = _ref.x,
      y = _ref.y;
    _classCallCheck(this, Animation);
    this.x = x;
    this.y = y;
    this.acc = 0;
    this.current = 0;
    this.frames = frames;
  }
  return _createClass(Animation, [{
    key: "animate",
    value: function animate(delta) {
      this.acc += delta;
      while (this.acc > this.frames[this.current].duration) {
        this.acc -= this.frames[this.current].duration;
        this.current++;
        if (this.current > -1 + this.frames.length) {
          this.current = 0;
        }
      }
      return 1 + this.frames[this.current].tileid;
    }
  }]);
}();
let TileMap = exports.TileMap = /*#__PURE__*/function () {
  function TileMap(mapData) {
    var _mapData$properties;
    _classCallCheck(this, TileMap);
    const fileName = mapData.fileName,
      session = mapData.session,
      x = mapData.x,
      y = mapData.y,
      width = mapData.width,
      height = mapData.height;
    this[_Bindable.Bindable.Prevent] = true;
    this.src = fileName;
    this.backgroundColor = null;
    this.tileCount = 0;
    this.x = x;
    this.y = y;
    this.loaded = false;
    this.worldWidth = width;
    this.worldHeight = height;
    this.rect = new _Rectangle.Rectangle(this.x, this.y, this.x + this.worldWidth, this.y + this.worldHeight);
    this.tileWidth = 0;
    this.tileHeight = 0;
    this.tileSetWidth = 0;
    this.tileSetHeight = 0;
    this.props = new _Properties.Properties((_mapData$properties = mapData.properties) !== null && _mapData$properties !== void 0 ? _mapData$properties : [], this);
    this.pixels = [];
    this.image = document.createElement('img');
    this.session = session;
    this.entityDefs = {};
    this.emptyTiles = new Set();
    this.tilesIndexes = new Map();
    this.canvases = new Map();
    this.contexts = new Map();
    this.tiles = null;
    this.xOrigin = x;
    this.yOrigin = y;
    this.tileLayers = [];
    this.imageLayers = [];
    this.objectLayers = [];
    this.visible = false;
    this.age = 0;
    this.quadTree = new _QuickTree.QuickTree(0, 0, this.worldWidth, this.worldHeight);
    this.regionTree = new _SMTree.SMTree();
    this.animationTrees = new Map();
    this.entityMap = new Map();
    this.animatedTiles = new Map();
    this.animations = new Map();

    // this.ready = this.getReady(fileName);
  }
  return _createClass(TileMap, [{
    key: "initialize",
    value: function initialize() {
      if (this.ready) {
        return this.ready;
      }
      return this.ready = this.getReady(this.src);
    }
  }, {
    key: "selectEntities",
    value: function selectEntities(wx1, wy1, wx2, wy2) {
      return this.quadTree.select(wx1 - this.x, wy1 - this.y, wx2 - this.x, wy2 - this.y, -this.x, -this.y);
    }
  }, {
    key: "addEntity",
    value: function addEntity(entity) {
      return this.quadTree.add(entity, -this.x, -this.y);
    }
  }, {
    key: "moveEntity",
    value: function moveEntity(entity) {
      return this.quadTree.move(entity, -this.x, -this.y);
    }
  }, {
    key: "getReady",
    value: async function getReady(src) {
      var _mapData$properties2;
      if (!cache.has(src)) {
        cache.set(src, fetch(src));
      }
      const mapData = await (await cache.get(src)).clone().json();
      this.props.add(...((_mapData$properties2 = mapData.properties) !== null && _mapData$properties2 !== void 0 ? _mapData$properties2 : []));
      mapData.layers.forEach(layer => {
        var _layer$properties;
        layer.props = new _Properties.Properties((_layer$properties = layer.properties) !== null && _layer$properties !== void 0 ? _layer$properties : [], this);
      });
      this.collisionLayers = mapData.layers.filter(layer => layer.type === 'tilelayer' && layer.class === 'collision');
      this.tileLayers = mapData.layers.filter(layer => layer.type === 'tilelayer' && layer.class !== 'collision');
      this.imageLayers = mapData.layers.filter(layer => layer.type === 'imagelayer');
      this.objectLayers = mapData.layers.filter(layer => layer.type === 'objectgroup');
      this.backgroundColor = mapData.backgroundcolor;
      if (mapData.class) {
        this.controller = new (await this.session.mapPallet.resolve(mapData.class))();
        this.controller.create(this);
      }
      if (this.props.has('backgroundColor')) {
        this.backgroundColor = this.props.get('backgroundColor');
      }
      const tilesets = mapData.tilesets.map(tilesetData => {
        if (tilesetData.source) {
          tilesetData.source = new URL(tilesetData.source, src).href;
        } else {
          tilesetData.map = this;
        }
        return new _Tileset.Tileset(tilesetData);
      });
      this.width = mapData.width;
      this.height = mapData.height;
      this.tileWidth = mapData.tilewidth;
      this.tileHeight = mapData.tileheight;
      await Promise.all(tilesets.map(t => t.ready));
      this.assemble(tilesets);
      await this.spawn();
      this.loaded = true;
      return this;
    }
  }, {
    key: "assemble",
    value: function assemble(tilesets) {
      tilesets.sort((a, b) => a.firstGid - b.firstGid);
      const tileTotal = this.tileCount = tilesets.reduce((a, b) => a + b.tileCount, 0);
      const size = Math.ceil(Math.sqrt(tileTotal));
      const destination = document.createElement('canvas');
      this.tileSetWidth = destination.width = size * this.tileWidth;
      this.tileSetHeight = destination.height = Math.ceil(tileTotal / size) * this.tileHeight;
      const ctxDestination = destination.getContext('2d', {
        willReadFrequently: true
      });
      for (const tileset of tilesets) {
        const image = tileset.image;
        const source = document.createElement('canvas');
        source.width = image.width;
        source.height = image.height;
        const ctxSource = source.getContext('2d', {
          willReadFrequently: true
        });
        ctxSource.drawImage(image, 0, 0);
        for (let i = 0; i < tileset.tileCount; i++) {
          const xSource = i * this.tileWidth % tileset.imageWidth;
          const ySource = Math.floor(i * this.tileWidth / tileset.imageWidth) * this.tileHeight;
          const xDestination = i * this.tileWidth % destination.width;
          const yDestination = Math.floor(i * this.tileWidth / destination.width) * this.tileHeight;
          const tile = ctxSource.getImageData(xSource, ySource, this.tileWidth, this.tileHeight);
          ctxDestination.putImageData(tile, xDestination, yDestination);
          const pixels = new Uint32Array(tile.data.buffer);
          let empty = true;
          for (const pixel of pixels) {
            if (pixel > 0) {
              empty = false;
            }
          }
          if (empty) {
            this.emptyTiles.add(i);
          }
        }
        for (const tileData of tileset.tiles) {
          if (tileData.animation) {
            this.animatedTiles.set(tileData.id, tileData.animation);
          }
        }
      }
      this.pixels = ctxDestination.getImageData(0, 0, destination.width, destination.height).data;
      this.tiles = ctxDestination;
      for (const layer of [...this.tileLayers, ...this.collisionLayers]) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', {
          willReadFrequently: true
        });
        this.canvases.set(layer, canvas);
        this.contexts.set(layer, context);
        const tileValues = new Uint32Array(layer.data.map(t => 0 + t));
        const tilePixels = new Uint8ClampedArray(tileValues.buffer);
        for (const i in tileValues) {
          const tile = tileValues[i];
          if (this.animatedTiles.has(tile)) {
            if (!this.animationTrees.has(layer)) {
              this.animationTrees.set(layer, new _QuickTree.QuickTree(0, 0, this.width, this.height, 0.1));
            }
            const tree = this.animationTrees.get(layer);
            const frames = this.animatedTiles.get(tile);
            const x = i % this.width;
            const y = Math.floor(i / this.width);
            const animation = new Animation({
              frames: frames,
              x: x,
              y: y
            });
            tree.add(animation);
          }
        }
        for (let i = 3; i < tilePixels.length; i += 4) {
          tilePixels[i] = 0xFF;
        }
        this.tilesIndexes.set(layer, tileValues);
        canvas.width = this.width;
        canvas.height = this.height;
        context.putImageData(new ImageData(tilePixels, this.width, this.height), 0, 0);
      }
    }
  }, {
    key: "spawn",
    value: async function spawn() {
      for (const layer of this.objectLayers) {
        const entityDefs = layer.objects;
        for (const entityDef of entityDefs) {
          this.entityDefs[entityDef.id] = _objectSpread({}, entityDef);
          entityDef.x += this.xOrigin;
          entityDef.y += this.yOrigin;
          if (!entityDef.type || entityDef.name === '#player-start') {
            continue;
          }
          if (entityDef.name === '#region') {
            const region = new _Region.Region(_objectSpread({
              spriteBoard: this.session.spriteBoard,
              session: this.session
            }, entityDef));
            this.session.world.motionGraph.add(region, this);
            this.session.spriteBoard.regions.add(region);
            this.regionTree.add(region.rect);
            continue;
          }
          const spawnClass = await this.session.entityPallet.resolve(entityDef.type);
          if (!spawnClass) {
            console.warn(`SpawnClass not found: ${entityDef.type}`);
            continue;
          }
          const spawner = new _Spawner.Spawner(_objectSpread(_objectSpread({
            spawnType: entityDef.type,
            spawnClass: spawnClass,
            entityDef: entityDef
          }, entityDef), {}, {
            spriteBoard: this.session.spriteBoard,
            session: this.session,
            world: this.session.world,
            map: this,
            x: entityDef.x + (this.x - this.xOrigin),
            y: entityDef.y + (this.y - this.yOrigin)
          }));
          this.session.world.motionGraph.add(spawner, this);
          spawner.lastMap = this;
          this.session.addEntity(spawner);
          this.addEntity(spawner);
        }
      }
    }
  }, {
    key: "simulate",
    value: function simulate(delta) {
      if (!this.loaded) {
        return;
      }
      const startX = this.x;
      const startY = this.y;
      this.age += delta;
      this.controller && this.controller.simulate(this, delta);
      this.session.world.motionGraph.moveChildren(this, this.x - startX, this.y - startY);
      this.rect.x1 = this.x;
      this.rect.y1 = this.y;
      this.rect.x2 = this.x + this.width * this.tileWidth;
      this.rect.y2 = this.x + this.height * this.tileHeight;
      if (startX !== this.x || startY !== this.y) {
        this.session.world.mapTree.move(this.session.world.mapRects.get(this));
      }
    }
  }, {
    key: "getCollisionTile",
    value: function getCollisionTile(x, y, z) {
      if (!this.loaded) {
        return true;
      }
      if (!this.collisionLayers || !this.collisionLayers[z]) {
        return false;
      }
      return this.getTileFromLayer(this.collisionLayers[z], x, y);
    }
  }, {
    key: "getColor",
    value: function getColor(x, y) {
      let z = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      return this.getPixel(this.tileLayers[z], x, y, z);
    }
  }, {
    key: "getSolid",
    value: function getSolid(x, y) {
      let z = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      if (!this.loaded) {
        return true;
      }
      if (!this.collisionLayers || !this.collisionLayers[z]) {
        return false;
      }
      const pixel = this.getPixel(this.collisionLayers[z], x, y, z);
      if (pixel === 0) {
        return true;
      }
      return pixel;
    }
  }, {
    key: "getPixel",
    value: function getPixel(layer, x, y) {
      if (!this.loaded) {
        return false;
      }
      const gid = this.getTileFromLayer(layer, x, y);
      if (gid === false || gid === -1) {
        return false;
      }
      const offsetX = Math.trunc(x % this.tileWidth);
      const offsetY = Math.trunc(y % this.tileHeight);
      const tileSetX = gid * this.tileWidth % this.tileSetWidth;
      const tileSetY = Math.floor(gid * this.tileWidth / this.tileSetWidth);
      return this.pixels[tileSetX + offsetX + (tileSetY + offsetY) * this.tileSetWidth];
    }
  }, {
    key: "getTileFromLayer",
    value: function getTileFromLayer(layer, x, y) {
      if (!this.loaded) {
        return false;
      }
      const localX = -this.x + x;
      const localY = -this.y + y;
      if (localX < 0 || localX >= this.width * this.tileWidth || localY < 0 || localY >= this.height * this.tileWidth) {
        return false;
      }
      const tileX = Math.floor(localX / this.tileWidth);
      const tileY = Math.floor(localY / this.tileHeight);
      return -1 + layer.data[tileX + tileY * this.width];
    }
  }, {
    key: "getSlice",
    value: function getSlice(p, x, y, w, h) {
      let delta = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
      if (!this.loaded) {
        return [];
      }
      return this.tileLayers.filter(layer => {
        var _layer$props$get;
        return p === ((_layer$props$get = layer.props.get('priority')) !== null && _layer$props$get !== void 0 ? _layer$props$get : 'background');
      }).map(layer => {
        const context = this.contexts.get(layer);
        const pixels = context.getImageData(x, y, w, h).data;
        const tree = this.animationTrees.get(layer);
        if (tree) {
          const values = new Uint32Array(pixels.buffer);
          const animations = tree.select(x, y, x + w, y + h);
          for (const animation of animations) {
            const xLocal = animation.x - x;
            const yLocal = animation.y - y;
            if (xLocal < w) {
              const iLocal = xLocal + yLocal * w;
              values[iLocal] = animation.animate(delta);
            }
          }
        }
        return pixels;
      });
    }
  }, {
    key: "getTileImage",
    value: function getTileImage(gid) {
      gid = -1 + gid;
      const tileSetX = gid * this.tileWidth % this.tileSetWidth;
      const tileSetY = Math.floor(gid * this.tileWidth / this.tileSetWidth) * this.tileHeight;
      const imageData = this.tiles.getImageData(tileSetX, tileSetY, this.tileWidth, this.tileHeight);
      const c = document.createElement('canvas');
      const cc = c.getContext('2d');
      c.width = this.tileWidth;
      c.height = this.tileHeight;
      cc.putImageData(imageData, 0, 0);
      return c.toDataURL();
    }
  }, {
    key: "getRegionsForPoint",
    value: function getRegionsForPoint(x, y) {
      const results = new Set();
      if (!this.loaded) {
        return results;
      }
      const rects = this.regionTree.query(x, y, x, y);
      rects.forEach(r => {
        if (!r.contains(x, y)) {
          return;
        }
        results.add(_Region.Region.fromRect(r));
      });
      return results;
    }
  }, {
    key: "getRegionsForRect",
    value: function getRegionsForRect(x1, y1, x2, y2) {
      const results = new Set();
      if (!this.loaded) {
        return results;
      }
      const searchRect = new _Rectangle.Rectangle(x1, y1, x2, y2);
      const rects = this.regionTree.query(x1, y1, x2, y2);
      rects.forEach(r => {
        if (!searchRect.isOverlapping(r)) {
          return;
        }
        results.add(_Region.Region.fromRect(r));
      });
      return results;
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
var _MotionGraph = require("../math/MotionGraph");
var _TileMap = require("./TileMap");
var _SMTree = require("../math/SMTree");
var _Ray = require("../math/Ray");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const cache = new Map();
let World = exports.World = /*#__PURE__*/function () {
  function World(_ref) {
    let src = _ref.src,
      session = _ref.session;
    _classCallCheck(this, World);
    this[_Bindable.Bindable.Prevent] = true;
    this.src = new URL(src, location);
    this.ready = this.getReady(this.src);
    this.maps = [];
    this.motionGraph = new _MotionGraph.MotionGraph();
    this.rectMap = new Map();
    this.mapRects = new Map();
    this.mapTree = new _SMTree.SMTree();
    this.session = session;
    this.async = false;
    this.age = 0;
  }
  return _createClass(World, [{
    key: "simulate",
    value: function simulate(delta) {
      this.age += delta;
    }
  }, {
    key: "getReady",
    value: async function getReady(src) {
      if (!cache.has(src)) {
        cache.set(src, fetch(src));
      }
      const worldData = await (await cache.get(src)).clone().json();
      return await Promise.all(worldData.maps.map((m, i) => {
        m.fileName = new URL(m.fileName, src).href;
        const map = new _TileMap.TileMap(_objectSpread(_objectSpread({}, m), {}, {
          session: this.session
        }));
        this.maps[i] = map;
        this.mapRects.set(map, map.rect);
        this.rectMap.set(map.rect, map);
        this.mapTree.add(map.rect);
        if (!worldData.async || map.props.has('player-start')) {
          return map.initialize();
        }
        return Promise.resolve();
      }));
    }
  }, {
    key: "getMapsForPoint",
    value: function getMapsForPoint(x, y) {
      const rects = this.mapTree.query(x, y, x, y);
      const maps = new Set();
      for (const rect of rects) {
        const map = this.rectMap.get(rect);
        maps.add(map);
      }
      return maps;
    }
  }, {
    key: "getMapsForRect",
    value: function getMapsForRect(x, y, w, h) {
      const result = new Set();
      const rects = this.mapTree.query(x + -w * 0.5, y + -h * 0.5, x + w * 0.5, y + h * 0.5);
      for (const rect of rects) {
        result.add(this.rectMap.get(rect));
      }
      return result;
    }
  }, {
    key: "getSolid",
    value: function getSolid(x, y, z) {
      const maps = this.getMapsForPoint(x, y);
      for (const map of maps) {
        const solid = map.getSolid(x, y, z);
        if (solid) {
          return solid;
        }
      }
      return null;
    }
  }, {
    key: "getCollisionTile",
    value: function getCollisionTile(x, y, z) {
      const maps = this.getMapsForPoint(x, y);
      for (const map of maps) {
        const tile = map.getCollisionTile(x, y, z);
        if (tile > 0) {
          return tile;
        }
      }
      return null;
    }
  }, {
    key: "getEntitiesForPoint",
    value: function getEntitiesForPoint(x, y) {
      const tilemaps = this.getMapsForPoint(x, y);
      let result = new Set();
      for (const tilemap of tilemaps) {
        if (!tilemap.visible) {
          continue;
        }
        const w = 500;
        const h = 500;
        const entities = tilemap.selectEntities(x + -w * 0.5, y + -h * 0.5, x + w * 0.5, y + h * 0.5);
        for (const entity of entities) {
          if (entity.rect.contains(x, y)) {
            result.add(entity);
          }
        }
      }
      return result;
    }
  }, {
    key: "getEntitiesForRect",
    value: function getEntitiesForRect(x, y, w, h) {
      const tilemaps = this.getMapsForRect(x, y, w, h);
      let result = new Set();
      for (const tilemap of tilemaps) {
        if (!tilemap.visible) {
          continue;
        }
        result = result.union(tilemap.selectEntities(x + -w * 0.5, y + -h * 0.5, x + w * 0.5, y + h * 0.5));
      }
      return result;
    }
  }, {
    key: "getRegionsForPoint",
    value: function getRegionsForPoint(x, y) {
      const tilemaps = this.getMapsForPoint(x, y);
      let result = new Set();
      for (const tilemap of tilemaps) {
        if (!tilemap.visible) {
          continue;
        }
        result = result.union(tilemap.getRegionsForPoint(x, y));
      }
      return result;
    }
  }, {
    key: "castRay",
    value: function castRay(startX, startY, layerId, angle) {
      let maxDistance = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 320;
      let rayFlags = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : _Ray.Ray.DEFAULT_FLAGS;
      return _Ray.Ray.cast(this, startX, startY, layerId, angle, maxDistance, rayFlags);
    }
  }, {
    key: "castTerrainRay",
    value: function castTerrainRay(startX, startY, layerId, angle) {
      let maxDistance = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 320;
      let rayFlags = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : _Ray.Ray.DEFAULT_FLAGS;
      return _Ray.Ray.castTerrain(this, startX, startY, layerId, angle, maxDistance, rayFlags);
    }
  }, {
    key: "castEntityRay",
    value: function castEntityRay(startX, startY, layerId, angle) {
      let maxDistance = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 320;
      let rayFlags = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : _Ray.Ray.DEFAULT_FLAGS;
      return _Ray.Ray.castEntity(this, startX, startY, layerId, angle, maxDistance, endY, rayFlags);
    }
  }]);
}();
});

;require.alias("import-mapper/ImportMapper.js", "import-mapper");require.register("___globals___", function(exports, require, module) {
  
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
//# sourceMappingURL=app.js.map