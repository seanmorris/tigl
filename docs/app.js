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
var _SpriteBoard = require("../sprite/SpriteBoard");
var _Controller = require("../ui/Controller");
var _Camera = require("../sprite/Camera");
var _Controller2 = require("../model/Controller");
var _Sprite = require("../sprite/Sprite");
var _World = require("../world/World");
var _Quadtree = require("../math/Quadtree");
var _Rectangle = require("../math/Rectangle");
var _SMTree = require("../math/SMTree");
var _Player = require("../model/Player");
var _SpriteSheet = require("../sprite/SpriteSheet");
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

var mapTree = new _SMTree.SMTree();

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
    _this.world = new _World.World({
      src: './world.json'
    });
    _this.map = new _TileMap.TileMap({
      src: './map.json'
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
      var player = new _Player.Player({
        sprite: new _Sprite.Sprite({
          x: 0,
          //48,
          y: 0,
          //64,
          // src: undefined,
          spriteSet: new _SpriteSheet.SpriteSheet({
            source: './player.tsj'
          }),
          spriteBoard: spriteBoard,
          width: 32,
          height: 48
        }),
        controller: new _Controller2.Controller({
          keyboard: this.keyboard,
          onScreenJoyPad: this.args.controller
        }),
        camera: _Camera.Camera
      });
      this.entities.add(player);
      this.spriteBoard.sprites.add(player.sprite);
      this.spriteBoard.following = player;
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
      var _draw = function draw(now) {
        if (document.hidden) {
          window.requestAnimationFrame(_draw);
          return;
        }
        var delta = now - fThen;
        fThen = now;
        simulate(performance.now());
        window.requestAnimationFrame(_draw);
        _this2.spriteBoard.draw(delta);
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
      _draw(performance.now());

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
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
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
      var speed = 4;
      var xAxis = Math.min(1, Math.max(this.controller.axis[0] || 0, -1)) || 0;
      var yAxis = Math.min(1, Math.max(this.controller.axis[1] || 0, -1)) || 0;
      this.sprite.x += Math.abs(xAxis) * Math.sign(xAxis) * speed;
      this.sprite.y += Math.abs(yAxis) * Math.sign(yAxis) * speed;
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
  function Player() {
    _classCallCheck(this, Player);
    return _callSuper(this, Player, arguments);
  }
  _inherits(Player, _Entity);
  return _createClass(Player, [{
    key: "simulate",
    value: function simulate() {
      _superPropGet(Player, "simulate", this, 3)([]);
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
var _Sprite = require("./Sprite");
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
    var w = 1280;
    for (var i in Array(2).fill()) {
      var barrel = new _Sprite.Sprite({
        src: './barrel.png',
        spriteBoard: this
      });
      barrel.x = 32 + i * 64 % w - 16;
      barrel.y = Math.trunc(i * 32 / w) * 32 + 32;
      this.sprites.add(barrel);
    }
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
        return s.draw(delta);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9CYWcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL0RvbS5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9NaXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1RhZy5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9VdWlkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzIiwiYXBwL0NvbmZpZy5qcyIsImFwcC9nbDJkL0dsMmQuanMiLCJhcHAvaG9tZS9WaWV3LmpzIiwiYXBwL2hvbWUvdmlldy50bXAuaHRtbCIsImFwcC9pbml0aWFsaXplLmpzIiwiYXBwL2luamVjdC9Db250YWluZXIuanMiLCJhcHAvaW5qZWN0L0luamVjdGFibGUuanMiLCJhcHAvaW5qZWN0L1NpbmdsZS5qcyIsImFwcC9tYXRoL0dlb21ldHJ5LmpzIiwiYXBwL21hdGgvTWF0cml4LmpzIiwiYXBwL21hdGgvUXVhZHRyZWUuanMiLCJhcHAvbWF0aC9SZWN0YW5nbGUuanMiLCJhcHAvbWF0aC9TTVRyZWUuanMiLCJhcHAvbWF0aC9TcGxpdC5qcyIsImFwcC9tb2RlbC9Db250cm9sbGVyLmpzIiwiYXBwL21vZGVsL0VudGl0eS5qcyIsImFwcC9tb2RlbC9QbGF5ZXIuanMiLCJhcHAvb3ZlcmxheS9vdmVybGF5LmZyYWciLCJhcHAvb3ZlcmxheS9vdmVybGF5LnZlcnQiLCJhcHAvc3ByaXRlL0NhbWVyYS5qcyIsImFwcC9zcHJpdGUvTWFwUmVuZGVyZXIuanMiLCJhcHAvc3ByaXRlL1BhcmFsbGF4LmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGUuanMiLCJhcHAvc3ByaXRlL1Nwcml0ZUJvYXJkLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGVTaGVldC5qcyIsImFwcC9zcHJpdGUvVGV4dHVyZUJhbmsuanMiLCJhcHAvc3ByaXRlL1RpbGVzZXQuanMiLCJhcHAvc3ByaXRlL3RleHR1cmUuZnJhZyIsImFwcC9zcHJpdGUvdGV4dHVyZS52ZXJ0IiwiYXBwL3VpL0NvbnRyb2xsZXIuanMiLCJhcHAvdWkvY29udHJvbGxlci50bXAuaHRtbCIsImFwcC93b3JsZC9GbG9vci5qcyIsImFwcC93b3JsZC9UaWxlTWFwLmpzIiwiYXBwL3dvcmxkL1dvcmxkLmpzIiwibm9kZV9tb2R1bGVzL2F1dG8tcmVsb2FkLWJydW5jaC92ZW5kb3IvYXV0by1yZWxvYWQuanMiXSwibmFtZXMiOlsiQ29uZmlnIiwiZXhwb3J0cyIsIl9jcmVhdGVDbGFzcyIsIl9jbGFzc0NhbGxDaGVjayIsInRpdGxlIiwiUHJvZ3JhbSIsIl9yZWYiLCJnbCIsInZlcnRleFNoYWRlciIsImZyYWdtZW50U2hhZGVyIiwidW5pZm9ybXMiLCJhdHRyaWJ1dGVzIiwiX2RlZmluZVByb3BlcnR5IiwiY29udGV4dCIsInByb2dyYW0iLCJjcmVhdGVQcm9ncmFtIiwiYXR0YWNoU2hhZGVyIiwibGlua1Byb2dyYW0iLCJkZXRhY2hTaGFkZXIiLCJkZWxldGVTaGFkZXIiLCJnZXRQcm9ncmFtUGFyYW1ldGVyIiwiTElOS19TVEFUVVMiLCJjb25zb2xlIiwiZXJyb3IiLCJnZXRQcm9ncmFtSW5mb0xvZyIsImRlbGV0ZVByb2dyYW0iLCJfaXRlcmF0b3IiLCJfY3JlYXRlRm9yT2ZJdGVyYXRvckhlbHBlciIsIl9zdGVwIiwicyIsIm4iLCJkb25lIiwidW5pZm9ybSIsInZhbHVlIiwibG9jYXRpb24iLCJnZXRVbmlmb3JtTG9jYXRpb24iLCJ3YXJuIiwiY29uY2F0IiwiZXJyIiwiZSIsImYiLCJfaXRlcmF0b3IyIiwiX3N0ZXAyIiwiYXR0cmlidXRlIiwiZ2V0QXR0cmliTG9jYXRpb24iLCJidWZmZXIiLCJjcmVhdGVCdWZmZXIiLCJiaW5kQnVmZmVyIiwiQVJSQVlfQlVGRkVSIiwiZW5hYmxlVmVydGV4QXR0cmliQXJyYXkiLCJ2ZXJ0ZXhBdHRyaWJQb2ludGVyIiwiRkxPQVQiLCJidWZmZXJzIiwia2V5IiwidXNlIiwidXNlUHJvZ3JhbSIsInVuaWZvcm1GIiwibmFtZSIsIl9sZW4iLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJmbG9hdHMiLCJBcnJheSIsIl9rZXkiLCJhcHBseSIsInVuaWZvcm1JIiwiX2xlbjIiLCJpbnRzIiwiX2tleTIiLCJHbDJkIiwiZWxlbWVudCIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImdldENvbnRleHQiLCJzY3JlZW5TY2FsZSIsInpvb21MZXZlbCIsImNyZWF0ZVNoYWRlciIsImV4dGVuc2lvbiIsInN1YnN0cmluZyIsImxhc3RJbmRleE9mIiwidHlwZSIsInRvVXBwZXJDYXNlIiwiVkVSVEVYX1NIQURFUiIsIkZSQUdNRU5UX1NIQURFUiIsInNoYWRlciIsInNvdXJjZSIsInJlcXVpcmUiLCJzaGFkZXJTb3VyY2UiLCJjb21waWxlU2hhZGVyIiwic3VjY2VzcyIsImdldFNoYWRlclBhcmFtZXRlciIsIkNPTVBJTEVfU1RBVFVTIiwiZ2V0U2hhZGVySW5mb0xvZyIsIl9yZWYyIiwiY3JlYXRlVGV4dHVyZSIsIndpZHRoIiwiaGVpZ2h0IiwidGV4dHVyZSIsImJpbmRUZXh0dXJlIiwiVEVYVFVSRV8yRCIsInRleEltYWdlMkQiLCJSR0JBIiwiVU5TSUdORURfQllURSIsInRleFBhcmFtZXRlcmkiLCJURVhUVVJFX1dSQVBfUyIsIkNMQU1QX1RPX0VER0UiLCJURVhUVVJFX1dSQVBfVCIsIlRFWFRVUkVfTUlOX0ZJTFRFUiIsIk5FQVJFU1QiLCJURVhUVVJFX01BR19GSUxURVIiLCJjcmVhdGVGcmFtZWJ1ZmZlciIsImZyYW1lYnVmZmVyIiwiYmluZEZyYW1lYnVmZmVyIiwiRlJBTUVCVUZGRVIiLCJmcmFtZWJ1ZmZlclRleHR1cmUyRCIsIkNPTE9SX0FUVEFDSE1FTlQwIiwiZW5hYmxlQmxlbmRpbmciLCJibGVuZEZ1bmMiLCJTUkNfQUxQSEEiLCJPTkVfTUlOVVNfU1JDX0FMUEhBIiwiZW5hYmxlIiwiQkxFTkQiLCJfVmlldyIsIl9LZXlib2FyZCIsIl9CYWciLCJfQ29uZmlnIiwiX1RpbGVNYXAiLCJfU3ByaXRlQm9hcmQiLCJfQ29udHJvbGxlciIsIl9DYW1lcmEiLCJfQ29udHJvbGxlcjIiLCJfU3ByaXRlIiwiX1dvcmxkIiwiX1F1YWR0cmVlIiwiX1JlY3RhbmdsZSIsIl9TTVRyZWUiLCJfUGxheWVyIiwiX1Nwcml0ZVNoZWV0IiwiYSIsIlR5cGVFcnJvciIsIl9kZWZpbmVQcm9wZXJ0aWVzIiwiciIsInQiLCJvIiwiZW51bWVyYWJsZSIsImNvbmZpZ3VyYWJsZSIsIndyaXRhYmxlIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJfdG9Qcm9wZXJ0eUtleSIsInByb3RvdHlwZSIsImkiLCJfdG9QcmltaXRpdmUiLCJfdHlwZW9mIiwiU3ltYm9sIiwidG9QcmltaXRpdmUiLCJjYWxsIiwiU3RyaW5nIiwiTnVtYmVyIiwiX2NhbGxTdXBlciIsIl9nZXRQcm90b3R5cGVPZiIsIl9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuIiwiX2lzTmF0aXZlUmVmbGVjdENvbnN0cnVjdCIsIlJlZmxlY3QiLCJjb25zdHJ1Y3QiLCJjb25zdHJ1Y3RvciIsIl9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQiLCJSZWZlcmVuY2VFcnJvciIsIkJvb2xlYW4iLCJ2YWx1ZU9mIiwic2V0UHJvdG90eXBlT2YiLCJnZXRQcm90b3R5cGVPZiIsImJpbmQiLCJfX3Byb3RvX18iLCJfaW5oZXJpdHMiLCJjcmVhdGUiLCJfc2V0UHJvdG90eXBlT2YiLCJBcHBsaWNhdGlvbiIsIm9uU2NyZWVuSm95UGFkIiwiT25TY3JlZW5Kb3lQYWQiLCJrZXlib2FyZCIsIktleWJvYXJkIiwiZ2V0IiwicXVhZCIsIlF1YWR0cmVlIiwiaW5zZXJ0IiwieCIsInkiLCJtYXBUcmVlIiwiU01UcmVlIiwiVmlldyIsIl9CYXNlVmlldyIsImFyZ3MiLCJfdGhpcyIsIndpbmRvdyIsInNtUHJvZmlsaW5nIiwidGVtcGxhdGUiLCJyb3V0ZXMiLCJlbnRpdGllcyIsIkJhZyIsInNwZWVkIiwibWF4U3BlZWQiLCJjb250cm9sbGVyIiwiZnBzIiwic3BzIiwiY2FtWCIsImNhbVkiLCJmcmFtZUxvY2siLCJzaW11bGF0aW9uTG9jayIsInNob3dFZGl0b3IiLCJsaXN0ZW5pbmciLCJrZXlzIiwiYmluZFRvIiwidiIsImsiLCJkIiwic3ByaXRlQm9hcmQiLCJ1bnNlbGVjdCIsIndvcmxkIiwiV29ybGQiLCJzcmMiLCJtYXAiLCJUaWxlTWFwIiwib25SZW5kZXJlZCIsIl90aGlzMiIsIlNwcml0ZUJvYXJkIiwidGFncyIsImNhbnZhcyIsInBsYXllciIsIlBsYXllciIsInNwcml0ZSIsIlNwcml0ZSIsInNwcml0ZVNldCIsIlNwcml0ZVNoZWV0IiwiQ29udHJvbGxlciIsImNhbWVyYSIsIkNhbWVyYSIsImFkZCIsInNwcml0ZXMiLCJmb2xsb3dpbmciLCJ6b29tIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlc2l6ZSIsImZUaGVuIiwic1RoZW4iLCJmU2FtcGxlcyIsInNTYW1wbGVzIiwibWF4U2FtcGxlcyIsInNpbXVsYXRlIiwibm93IiwiZGVsdGEiLCJ1cGRhdGUiLCJ2YWx1ZXMiLCJpdGVtcyIsIl9zcHMiLCJwdXNoIiwic2hpZnQiLCJkcmF3IiwiaGlkZGVuIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwicGVyZm9ybWFuY2UiLCJ0b0ZpeGVkIiwicG9zWCIsInBvc1kiLCJnbDJkIiwiYm9keSIsImNsaWVudEhlaWdodCIsInNldEludGVydmFsIiwicmVkdWNlIiwiYiIsInBhZFN0YXJ0IiwiY2xpZW50V2lkdGgiLCJyd2lkdGgiLCJNYXRoIiwidHJ1bmMiLCJyaGVpZ2h0Iiwib2xkU2NhbGUiLCJzY3JvbGwiLCJldmVudCIsImRlbHRhWSIsIm1heCIsIm1pbiIsInN0ZXAiLCJhYnMiLCJCYXNlVmlldyIsIl9Sb3V0ZXIiLCJQcm94eSIsInVuZGVmaW5lZCIsInZpZXciLCJSb3V0ZXIiLCJsaXN0ZW4iLCJyZW5kZXIiLCJfSW5qZWN0YWJsZTIiLCJDb250YWluZXIiLCJfSW5qZWN0YWJsZSIsImluamVjdCIsImluamVjdGlvbnMiLCJhc3NpZ24iLCJJbmplY3RhYmxlIiwiY2xhc3NlcyIsIm9iamVjdHMiLCJpbmplY3Rpb24iLCJ0ZXN0IiwiaW5zdGFuY2UiLCJFcnJvciIsImV4aXN0aW5nSW5qZWN0aW9ucyIsIl9jbGFzcyIsIlNpbmdsZSIsInJhbmRvbSIsInNpbmdsZSIsIkdlb21ldHJ5IiwibGluZUludGVyc2VjdHNMaW5lIiwieDFhIiwieTFhIiwieDJhIiwieTJhIiwieDFiIiwieTFiIiwieDJiIiwieTJiIiwiYXgiLCJheSIsImJ4IiwiYnkiLCJjcm9zc1Byb2R1Y3QiLCJjeCIsImN5IiwiTWF0cml4IiwiaWRlbnRpdHkiLCJ0cmFuc2xhdGUiLCJkeCIsImR5Iiwic2NhbGUiLCJyb3RhdGUiLCJ0aGV0YSIsInNpbiIsImMiLCJjb3MiLCJzaGVhclgiLCJzaGVhclkiLCJtdWx0aXBseSIsIm1hdEEiLCJtYXRCIiwib3V0cHV0IiwiZmlsbCIsImoiLCJjb21wb3NpdGUiLCJ0cmFuc2Zvcm0iLCJwb2ludHMiLCJtYXRyaXgiLCJwb2ludCIsInJvdyIsIkZsb2F0MzJBcnJheSIsImZpbHRlciIsIl8iLCJfUmVjdGFuZ2xlMiIsIl90b0NvbnN1bWFibGVBcnJheSIsIl9hcnJheVdpdGhvdXRIb2xlcyIsIl9pdGVyYWJsZVRvQXJyYXkiLCJfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkiLCJfbm9uSXRlcmFibGVTcHJlYWQiLCJpdGVyYXRvciIsImZyb20iLCJpc0FycmF5IiwiX2FycmF5TGlrZVRvQXJyYXkiLCJfbiIsIkYiLCJ1IiwibmV4dCIsInRvU3RyaW5nIiwic2xpY2UiLCJ4MSIsInkxIiwieDIiLCJ5MiIsIm1pblNpemUiLCJzcGxpdCIsIlNldCIsInVsQ2VsbCIsInVyQ2VsbCIsImJsQ2VsbCIsImJyQ2VsbCIsImVudGl0eSIsImNvbnRhaW5zIiwieFNpemUiLCJ5U2l6ZSIsInNpemUiLCJ4U2l6ZUhhbGYiLCJ5U2l6ZUhhbGYiLCJpdGVtIiwiZmluZExlYWYiLCJfdGhpcyR1bENlbGwkZmluZExlYWYiLCJoYXMiLCJzZWxlY3QiLCJ3IiwiaCIsInhNYXgiLCJ5TWF4IiwiZHVtcCIsIlJlY3RhbmdsZSIsImlzT3ZlcmxhcHBpbmciLCJvdGhlciIsImlzRmx1c2hXaXRoIiwiaW50ZXJzZWN0aW9uIiwiaXNJbnNpZGUiLCJpc091dHNpZGUiLCJ0b1RyaWFuZ2xlcyIsImRpbSIsIlNlZ21lbnQiLCJzdGFydCIsImVuZCIsInByZXYiLCJkZXB0aCIsInJlY3RhbmdsZXMiLCJzdWJUcmVlIiwiYXQiLCJSYW5nZUVycm9yIiwicmVjdGFuZ2xlIiwicmVjdE1pbiIsInJlY3RNYXgiLCJmcmVlemUiLCJkZWxldGUiLCJlbXB0eSIsIkluZmluaXR5IiwiaXNSZWN0YW5nbGUiLCJvYmplY3QiLCJzZWdtZW50cyIsInN0YXJ0SW5kZXgiLCJmaW5kU2VnbWVudCIsInNwbGl0U2VnbWVudCIsImVuZEluZGV4Iiwic3BsaWNlIiwicXVlcnkiLCJyZXN1bHRzIiwieFN0YXJ0SW5kZXgiLCJ4RW5kSW5kZXgiLCJzZWdtZW50IiwieVN0YXJ0SW5kZXgiLCJ5RW5kSW5kZXgiLCJyZXN1bHQiLCJpbmRleCIsIl90aGlzJHNlZ21lbnRzIiwic3BsaXRTZWdtZW50cyIsImxvIiwiaGkiLCJjdXJyZW50IiwiZmxvb3IiLCJTcGxpdCIsImludFRvQnl0ZXMiLCJieXRlcyIsIl9TcGxpdCIsIlVpbnQ4Q2xhbXBlZEFycmF5IiwiVWludDE2QXJyYXkiLCJVaW50MzJBcnJheSIsIl9CaW5kYWJsZSIsIkJpbmRhYmxlIiwibWFrZUJpbmRhYmxlIiwia2V5UHJlc3MiLCJrZXlSZWxlYXNlIiwiYXhpcyIsInRyaWdnZXJzIiwiRW50aXR5IiwiZGlyZWN0aW9uIiwic3RhdGUiLCJyZW5kZXJNb2RlIiwieEF4aXMiLCJ5QXhpcyIsInNpZ24iLCJob3Jpem9udGFsIiwiY2hhbmdlQW5pbWF0aW9uIiwiZGVzdHJveSIsIl9FbnRpdHkyIiwiX3N1cGVyUHJvcEdldCIsInAiLCJfZ2V0IiwiX3N1cGVyUHJvcEJhc2UiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJoYXNPd25Qcm9wZXJ0eSIsImZpcmVSZWdpb24iLCJ3YXRlclJlZ2lvbiIsIl9FbnRpdHkiLCJyZWdpb24iLCJtYXBzIiwiZ2V0TWFwc0ZvclBvaW50IiwiZm9yRWFjaCIsIm0iLCJsb2ciLCJNYXBSZW5kZXJlciIsIlByZXZlbnQiLCJsb2FkZWQiLCJ0aWxlV2lkdGgiLCJ0aWxlSGVpZ2h0IiwieE9mZnNldCIsInlPZmZzZXQiLCJ0aWxlTWFwcGluZyIsInRpbGVUZXh0dXJlIiwicGFyc2VJbnQiLCJwaXhlbCIsIlVpbnQ4QXJyYXkiLCJyZWFkeSIsInRoZW4iLCJ0aWxlU2V0V2lkdGgiLCJ0aWxlU2V0SGVpZ2h0IiwicGl4ZWxzIiwibmVnU2FmZU1vZCIsImhhbGZUaWxlV2lkdGgiLCJoYWxmVGlsZUhlaWdodCIsInRpbGVzV2lkZSIsInRpbGVzSGlnaCIsInhUaWxlIiwieFdvcmxkIiwieVRpbGUiLCJ5V29ybGQiLCJ4UG9zIiwieVBvcyIsImRyYXdQcm9ncmFtIiwiYWN0aXZlVGV4dHVyZSIsIlRFWFRVUkUyIiwiVEVYVFVSRTMiLCJ0aWxlUGl4ZWxMYXllcnMiLCJnZXRTbGljZSIsInRpbGVQaXhlbHMiLCJzZXRSZWN0YW5nbGUiLCJkcmF3QnVmZmVyIiwiZHJhd0FycmF5cyIsIlRSSUFOR0xFUyIsIlRFWFRVUkUwIiwiY2VpbCIsImFfdGV4Q29vcmQiLCJidWZmZXJEYXRhIiwiU1RBVElDX0RSQVciLCJhX3Bvc2l0aW9uIiwiUGFyYWxsYXhMYXllciIsIlBhcmFsbGF4Iiwic2xpY2VzIiwicGFyYWxsYXhMYXllcnMiLCJ0ZXh0dXJlcyIsImFzc2VtYmxlIiwibG9hZFNsaWNlcyIsImltYWdlTGF5ZXJzIiwibGF5ZXJEYXRhIiwibG9hZEltYWdlIiwiaW1hZ2UiLCJfbGF5ZXJEYXRhJG9mZnNldHkiLCJfbGF5ZXJEYXRhJHBhcmFsbGF4eCIsImxheWVyIiwibGF5ZXJCb3R0b20iLCJvZmZzZXR5Iiwib2Zmc2V0IiwicGFyYWxsYXgiLCJwYXJhbGxheHgiLCJSRVBFQVQiLCJQcm9taXNlIiwiYWxsIiwicmF0aW8iLCJpbWFnZVByb21pc2VzIiwiYWNjZXB0IiwicmVqZWN0IiwiSW1hZ2UiLCJfTWF0cml4IiwieiIsImN1cnJlbnRBbmltYXRpb24iLCJmcmFtZXMiLCJjdXJyZW50RGVsYXkiLCJjdXJyZW50RnJhbWUiLCJjdXJyZW50RnJhbWVzIiwibW92aW5nIiwiUklHSFQiLCJET1dOIiwiTEVGVCIsIlVQIiwiRUFTVCIsIlNPVVRIIiwiV0VTVCIsIk5PUlRIIiwiZ2V0RnJhbWUiLCJ0aWxlQ291bnQiLCJfdGhpcyRzcHJpdGVCb2FyZCRkcmEiLCJhbmltYXRpb25zIiwiYW5pbWF0aW9uIiwidGV4dHVyZUlkIiwidGlsZWlkIiwiZHVyYXRpb24iLCJlZmZlY3RCdWZmZXIiLCJ4T2ZmIiwieU9mZiIsIl9HbDJkIiwiX01hcFJlbmRlcmVyIiwiX1BhcmFsbGF4IiwibW91c2UiLCJjbGlja1giLCJjbGlja1kiLCJjb2xvckxvY2F0aW9uIiwidV9jb2xvciIsInRpbGVQb3NMb2NhdGlvbiIsInVfdGlsZU5vIiwicmVnaW9uTG9jYXRpb24iLCJ1X3JlZ2lvbiIsImRyYXdMYXllciIsImVmZmVjdExheWVyIiwiY2xpZW50WCIsImNsaWVudFkiLCJtYXBSZW5kZXJlcnMiLCJNYXAiLCJiYXJyZWwiLCJ2aXNpYmxlTWFwcyIsImdldE1hcHNGb3JSZWN0IiwicmVuZGVyZXIiLCJzZXQiLCJkaWZmZXJlbmNlIiwidmlld3BvcnQiLCJjbGVhckNvbG9yIiwiY2xlYXIiLCJDT0xPUl9CVUZGRVJfQklUIiwiYmFja2dyb3VuZENvbG9yIiwiY29sb3IiLCJzdWJzdHIiLCJnIiwidGltZSIsInRpbWVFbmQiLCJtciIsInNvcnQiLCJURVhUVVJFMSIsIlRFWFRVUkU0IiwiU1RSRUFNX0RSQVciLCJfVGlsZXNldDIiLCJfVGlsZXNldCIsInRpbGVzZXREYXRhIiwid2lsbFJlYWRGcmVxdWVudGx5IiwicHJvY2Vzc0ltYWdlIiwidGlsZXMiLCJ0aWxlIiwiaWQiLCJkcmF3SW1hZ2UiLCJmcmFtZUlkIiwiY29sdW1ucyIsImdldEltYWdlRGF0YSIsImRhdGEiLCJUaWxlc2V0IiwiVGV4dHVyZUJhbmsiLCJfcmVnZW5lcmF0b3JSdW50aW1lIiwiYXN5bmNJdGVyYXRvciIsInRvU3RyaW5nVGFnIiwiZGVmaW5lIiwid3JhcCIsIkdlbmVyYXRvciIsIkNvbnRleHQiLCJtYWtlSW52b2tlTWV0aG9kIiwidHJ5Q2F0Y2giLCJhcmciLCJsIiwiR2VuZXJhdG9yRnVuY3Rpb24iLCJHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSIsImRlZmluZUl0ZXJhdG9yTWV0aG9kcyIsIl9pbnZva2UiLCJBc3luY0l0ZXJhdG9yIiwiaW52b2tlIiwicmVzb2x2ZSIsIl9fYXdhaXQiLCJjYWxsSW52b2tlV2l0aE1ldGhvZEFuZEFyZyIsIm1ldGhvZCIsImRlbGVnYXRlIiwibWF5YmVJbnZva2VEZWxlZ2F0ZSIsInNlbnQiLCJfc2VudCIsImRpc3BhdGNoRXhjZXB0aW9uIiwiYWJydXB0IiwicmVzdWx0TmFtZSIsIm5leHRMb2MiLCJwdXNoVHJ5RW50cnkiLCJ0cnlMb2MiLCJjYXRjaExvYyIsImZpbmFsbHlMb2MiLCJhZnRlckxvYyIsInRyeUVudHJpZXMiLCJyZXNldFRyeUVudHJ5IiwiY29tcGxldGlvbiIsInJlc2V0IiwiaXNOYU4iLCJkaXNwbGF5TmFtZSIsImlzR2VuZXJhdG9yRnVuY3Rpb24iLCJtYXJrIiwiYXdyYXAiLCJhc3luYyIsInJldmVyc2UiLCJwb3AiLCJjaGFyQXQiLCJzdG9wIiwicnZhbCIsImhhbmRsZSIsImNvbXBsZXRlIiwiZmluaXNoIiwiX2NhdGNoIiwiZGVsZWdhdGVZaWVsZCIsImFzeW5jR2VuZXJhdG9yU3RlcCIsIl9hc3luY1RvR2VuZXJhdG9yIiwiX25leHQiLCJfdGhyb3ciLCJmaXJzdGdpZCIsImltYWdlaGVpZ2h0IiwiaW1hZ2V3aWR0aCIsIm1hcmdpbiIsInNwYWNpbmciLCJ0aWxlY291bnQiLCJ0aWxlaGVpZ2h0IiwidGlsZXdpZHRoIiwiZmlyc3RHaWQiLCJnZXRSZWFkeSIsIl9nZXRSZWFkeSIsIl9jYWxsZWUiLCJfeWllbGQkeWllbGQkZmV0Y2gkanMiLCJfY2FsbGVlJCIsIl9jb250ZXh0IiwiZmV0Y2giLCJqc29uIiwib25sb2FkIiwiaW1hZ2VXaWR0aCIsImltYWdlSGVpZ2h0Iiwicm93cyIsIl94IiwiX1ZpZXcyIiwiZHJhZ1N0YXJ0IiwiZHJhZ2dpbmciLCJtb3ZlU3RpY2siLCJkcm9wU3RpY2siLCJkcmFnU3RpY2siLCJwb3MiLCJwcmV2ZW50RGVmYXVsdCIsInRvdWNoZXMiLCJ4eCIsInl5IiwibGltaXQiLCJGbG9vciIsInByb3BlcnRpZXMiLCJjYW52YXNlcyIsImNvbnRleHRzIiwidGlsZUxheWVycyIsIm9iamVjdExheWVycyIsIm1hcERhdGEiLCJwcm9wZXJ0eSIsInRpbGVzZXRzIiwibGF5ZXJzIiwiYmFja2dyb3VuZGNvbG9yIiwidGlsZVRvdGFsIiwic3FydCIsImRlc3RpbmF0aW9uIiwiY3R4RGVzdGluYXRpb24iLCJ4RGVzdGluYXRpb24iLCJ5RGVzdGluYXRpb24iLCJ0aWxlc2V0IiwieFNvdXJjZSIsInlTb3VyY2UiLCJjdHhTb3VyY2UiLCJwdXRJbWFnZURhdGEiLCJ0b0Jsb2IiLCJibG9iIiwidXJsIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwicmV2b2tlT2JqZWN0VVJMIiwiX2l0ZXJhdG9yMyIsIl9zdGVwMyIsIl9pdGVyYXRvcjUiLCJfc3RlcDUiLCJ0aWxlRGF0YSIsIl9pdGVyYXRvcjQiLCJfc3RlcDQiLCJ0aWxlVmFsdWVzIiwiSW1hZ2VEYXRhIiwibVRyZWUiLCJyZWN0TWFwIiwid29ybGREYXRhIiwiZmlsZU5hbWUiLCJyZWN0IiwicmVjdHMiLCJXZWJTb2NrZXQiLCJNb3pXZWJTb2NrZXQiLCJiciIsImJydW5jaCIsImFyIiwiZGlzYWJsZWQiLCJfYXIiLCJjYWNoZUJ1c3RlciIsImRhdGUiLCJyb3VuZCIsIkRhdGUiLCJyZXBsYWNlIiwiaW5kZXhPZiIsImJyb3dzZXIiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJ0b0xvd2VyQ2FzZSIsImZvcmNlUmVwYWludCIsInJlbG9hZGVycyIsInBhZ2UiLCJyZWxvYWQiLCJzdHlsZXNoZWV0IiwicXVlcnlTZWxlY3RvckFsbCIsImxpbmsiLCJ2YWwiLCJnZXRBdHRyaWJ1dGUiLCJocmVmIiwic2V0VGltZW91dCIsIm9mZnNldEhlaWdodCIsImphdmFzY3JpcHQiLCJzY3JpcHRzIiwidGV4dFNjcmlwdHMiLCJzY3JpcHQiLCJ0ZXh0Iiwic3JjU2NyaXB0cyIsIm9uTG9hZCIsImV2YWwiLCJyZW1vdmUiLCJuZXdTY3JpcHQiLCJoZWFkIiwiYXBwZW5kQ2hpbGQiLCJwb3J0IiwiaG9zdCIsInNlcnZlciIsImhvc3RuYW1lIiwiY29ubmVjdCIsImNvbm5lY3Rpb24iLCJvbm1lc3NhZ2UiLCJtZXNzYWdlIiwicmVsb2FkZXIiLCJvbmVycm9yIiwicmVhZHlTdGF0ZSIsImNsb3NlIiwib25jbG9zZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3IzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0lDOUthQSxNQUFNLEdBQUFDLE9BQUEsQ0FBQUQsTUFBQSxnQkFBQUUsWUFBQSxVQUFBRixPQUFBO0VBQUFHLGVBQUEsT0FBQUgsTUFBQTtBQUFBO0FBQUc7QUFFdEJBLE1BQU0sQ0FBQ0ksS0FBSyxHQUFHLE9BQU87QUFDdEI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lDSE1DLE9BQU87RUFTWixTQUFBQSxRQUFBQyxJQUFBLEVBQ0E7SUFBQSxJQURhQyxFQUFFLEdBQUFELElBQUEsQ0FBRkMsRUFBRTtNQUFFQyxZ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a0IsUUFBTyxFQUFFLElBQUksQ0FBQztJQUNsQyxDQUFDO0VBQ0gsQ0FBQztFQUNEQSxRQUFPLENBQUMsQ0FBQztBQUNYLENBQUMsRUFBRSxDQUFDO0FBQ0oiLCJmaWxlIjoiZG9jcy9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9CYWcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkJhZyA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBfTWl4aW4gPSByZXF1aXJlKFwiLi9NaXhpblwiKTtcbnZhciBfRXZlbnRUYXJnZXRNaXhpbiA9IHJlcXVpcmUoXCIuLi9taXhpbi9FdmVudFRhcmdldE1peGluXCIpO1xudmFyIHRvSWQgPSBpbnQgPT4gTnVtYmVyKGludCk7XG52YXIgZnJvbUlkID0gaWQgPT4gcGFyc2VJbnQoaWQpO1xudmFyIE1hcHBlZCA9IFN5bWJvbCgnTWFwcGVkJyk7XG52YXIgSGFzID0gU3ltYm9sKCdIYXMnKTtcbnZhciBBZGQgPSBTeW1ib2woJ0FkZCcpO1xudmFyIFJlbW92ZSA9IFN5bWJvbCgnUmVtb3ZlJyk7XG52YXIgRGVsZXRlID0gU3ltYm9sKCdEZWxldGUnKTtcbmNsYXNzIEJhZyBleHRlbmRzIF9NaXhpbi5NaXhpbi53aXRoKF9FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4pIHtcbiAgY29uc3RydWN0b3IoY2hhbmdlQ2FsbGJhY2sgPSB1bmRlZmluZWQpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2sgPSBjaGFuZ2VDYWxsYmFjaztcbiAgICB0aGlzLmNvbnRlbnQgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5saXN0ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShbXSk7XG4gICAgdGhpcy5tZXRhID0gU3ltYm9sKCdtZXRhJyk7XG4gICAgdGhpcy50eXBlID0gdW5kZWZpbmVkO1xuICB9XG4gIGhhcyhpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5oYXMoaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW0hhc10oaXRlbSk7XG4gIH1cbiAgW0hhc10oaXRlbSkge1xuICAgIHJldHVybiB0aGlzLmNvbnRlbnQuaGFzKGl0ZW0pO1xuICB9XG4gIGFkZChpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5hZGQoaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW0FkZF0oaXRlbSk7XG4gIH1cbiAgW0FkZF0oaXRlbSkge1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQgfHwgIShpdGVtIGluc3RhbmNlb2YgT2JqZWN0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9iamVjdHMgbWF5IGJlIGFkZGVkIHRvIEJhZ3MuJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnR5cGUgJiYgIShpdGVtIGluc3RhbmNlb2YgdGhpcy50eXBlKSkge1xuICAgICAgY29uc29sZS5lcnJvcih0aGlzLnR5cGUsIGl0ZW0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbmx5IG9iamVjdHMgb2YgdHlwZSAke3RoaXMudHlwZX0gbWF5IGJlIGFkZGVkIHRvIHRoaXMgQmFnLmApO1xuICAgIH1cbiAgICBpdGVtID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoaXRlbSk7XG4gICAgaWYgKHRoaXMuY29udGVudC5oYXMoaXRlbSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGFkZGluZyA9IG5ldyBDdXN0b21FdmVudCgnYWRkaW5nJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChhZGRpbmcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpZCA9IHRvSWQodGhpcy5jdXJyZW50KyspO1xuICAgIHRoaXMuY29udGVudC5zZXQoaXRlbSwgaWQpO1xuICAgIHRoaXMubGlzdFtpZF0gPSBpdGVtO1xuICAgIGlmICh0aGlzLmNoYW5nZUNhbGxiYWNrKSB7XG4gICAgICB0aGlzLmNoYW5nZUNhbGxiYWNrKGl0ZW0sIHRoaXMubWV0YSwgQmFnLklURU1fQURERUQsIGlkKTtcbiAgICB9XG4gICAgdmFyIGFkZCA9IG5ldyBDdXN0b21FdmVudCgnYWRkZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbSxcbiAgICAgICAgaWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoYWRkKTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuc2l6ZTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgcmVtb3ZlKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLnJlbW92ZShpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbUmVtb3ZlXShpdGVtKTtcbiAgfVxuICBbUmVtb3ZlXShpdGVtKSB7XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCB8fCAhKGl0ZW0gaW5zdGFuY2VvZiBPYmplY3QpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgb2JqZWN0cyBtYXkgYmUgcmVtb3ZlZCBmcm9tIEJhZ3MuJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnR5cGUgJiYgIShpdGVtIGluc3RhbmNlb2YgdGhpcy50eXBlKSkge1xuICAgICAgY29uc29sZS5lcnJvcih0aGlzLnR5cGUsIGl0ZW0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbmx5IG9iamVjdHMgb2YgdHlwZSAke3RoaXMudHlwZX0gbWF5IGJlIHJlbW92ZWQgZnJvbSB0aGlzIEJhZy5gKTtcbiAgICB9XG4gICAgaXRlbSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKGl0ZW0pO1xuICAgIGlmICghdGhpcy5jb250ZW50LmhhcyhpdGVtKSkge1xuICAgICAgaWYgKHRoaXMuY2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5jaGFuZ2VDYWxsYmFjayhpdGVtLCB0aGlzLm1ldGEsIDAsIHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciByZW1vdmluZyA9IG5ldyBDdXN0b21FdmVudCgncmVtb3ZpbmcnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KHJlbW92aW5nKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaWQgPSB0aGlzLmNvbnRlbnQuZ2V0KGl0ZW0pO1xuICAgIGRlbGV0ZSB0aGlzLmxpc3RbaWRdO1xuICAgIHRoaXMuY29udGVudC5kZWxldGUoaXRlbSk7XG4gICAgaWYgKHRoaXMuY2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2soaXRlbSwgdGhpcy5tZXRhLCBCYWcuSVRFTV9SRU1PVkVELCBpZCk7XG4gICAgfVxuICAgIHZhciByZW1vdmUgPSBuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92ZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbSxcbiAgICAgICAgaWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQocmVtb3ZlKTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuc2l6ZTtcbiAgICByZXR1cm4gaXRlbTtcbiAgfVxuICBkZWxldGUoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0uZGVsZXRlKGl0ZW0pO1xuICAgIH1cbiAgICB0aGlzW0RlbGV0ZV0oaXRlbSk7XG4gIH1cbiAgW0RlbGV0ZV0oaXRlbSkge1xuICAgIHRoaXMucmVtb3ZlKGl0ZW0pO1xuICB9XG4gIG1hcChtYXBwZXIgPSB4ID0+IHgsIGZpbHRlciA9IHggPT4geCkge1xuICAgIHZhciBtYXBwZWRJdGVtcyA9IG5ldyBXZWFrTWFwKCk7XG4gICAgdmFyIG1hcHBlZEJhZyA9IG5ldyBCYWcoKTtcbiAgICBtYXBwZWRCYWdbTWFwcGVkXSA9IHRoaXM7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdhZGRlZCcsIGV2ZW50ID0+IHtcbiAgICAgIHZhciBpdGVtID0gZXZlbnQuZGV0YWlsLml0ZW07XG4gICAgICBpZiAoIWZpbHRlcihpdGVtKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAobWFwcGVkSXRlbXMuaGFzKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBtYXBwZWQgPSBtYXBwZXIoaXRlbSk7XG4gICAgICBtYXBwZWRJdGVtcy5zZXQoaXRlbSwgbWFwcGVkKTtcbiAgICAgIG1hcHBlZEJhZ1tBZGRdKG1hcHBlZCk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdyZW1vdmVkJywgZXZlbnQgPT4ge1xuICAgICAgdmFyIGl0ZW0gPSBldmVudC5kZXRhaWwuaXRlbTtcbiAgICAgIGlmICghbWFwcGVkSXRlbXMuaGFzKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBtYXBwZWQgPSBtYXBwZWRJdGVtcy5nZXQoaXRlbSk7XG4gICAgICBtYXBwZWRJdGVtcy5kZWxldGUoaXRlbSk7XG4gICAgICBtYXBwZWRCYWdbUmVtb3ZlXShtYXBwZWQpO1xuICAgIH0pO1xuICAgIHJldHVybiBtYXBwZWRCYWc7XG4gIH1cbiAgZ2V0IHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29udGVudC5zaXplO1xuICB9XG4gIGl0ZW1zKCkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuY29udGVudC5lbnRyaWVzKCkpLm1hcChlbnRyeSA9PiBlbnRyeVswXSk7XG4gIH1cbn1cbmV4cG9ydHMuQmFnID0gQmFnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJhZywgJ0lURU1fQURERUQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IDFcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJhZywgJ0lURU1fUkVNT1ZFRCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogLTFcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkJpbmRhYmxlID0gdm9pZCAwO1xuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KGUsIHIsIHQpIHsgcmV0dXJuIChyID0gX3RvUHJvcGVydHlLZXkocikpIGluIGUgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgciwgeyB2YWx1ZTogdCwgZW51bWVyYWJsZTogITAsIGNvbmZpZ3VyYWJsZTogITAsIHdyaXRhYmxlOiAhMCB9KSA6IGVbcl0gPSB0LCBlOyB9XG5mdW5jdGlvbiBfdG9Qcm9wZXJ0eUtleSh0KSB7IHZhciBpID0gX3RvUHJpbWl0aXZlKHQsIFwic3RyaW5nXCIpOyByZXR1cm4gXCJzeW1ib2xcIiA9PSB0eXBlb2YgaSA/IGkgOiBpICsgXCJcIjsgfVxuZnVuY3Rpb24gX3RvUHJpbWl0aXZlKHQsIHIpIHsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIHQgfHwgIXQpIHJldHVybiB0OyB2YXIgZSA9IHRbU3ltYm9sLnRvUHJpbWl0aXZlXTsgaWYgKHZvaWQgMCAhPT0gZSkgeyB2YXIgaSA9IGUuY2FsbCh0LCByIHx8IFwiZGVmYXVsdFwiKTsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIGkpIHJldHVybiBpOyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQEB0b1ByaW1pdGl2ZSBtdXN0IHJldHVybiBhIHByaW1pdGl2ZSB2YWx1ZS5cIik7IH0gcmV0dXJuIChcInN0cmluZ1wiID09PSByID8gU3RyaW5nIDogTnVtYmVyKSh0KTsgfVxudmFyIFJlZiA9IFN5bWJvbCgncmVmJyk7XG52YXIgT3JpZ2luYWwgPSBTeW1ib2woJ29yaWdpbmFsJyk7XG52YXIgRGVjayA9IFN5bWJvbCgnZGVjaycpO1xudmFyIEJpbmRpbmcgPSBTeW1ib2woJ2JpbmRpbmcnKTtcbnZhciBTdWJCaW5kaW5nID0gU3ltYm9sKCdzdWJCaW5kaW5nJyk7XG52YXIgQmluZGluZ0FsbCA9IFN5bWJvbCgnYmluZGluZ0FsbCcpO1xudmFyIElzQmluZGFibGUgPSBTeW1ib2woJ2lzQmluZGFibGUnKTtcbnZhciBXcmFwcGluZyA9IFN5bWJvbCgnd3JhcHBpbmcnKTtcbnZhciBOYW1lcyA9IFN5bWJvbCgnTmFtZXMnKTtcbnZhciBFeGVjdXRpbmcgPSBTeW1ib2woJ2V4ZWN1dGluZycpO1xudmFyIFN0YWNrID0gU3ltYm9sKCdzdGFjaycpO1xudmFyIE9ialN5bWJvbCA9IFN5bWJvbCgnb2JqZWN0Jyk7XG52YXIgV3JhcHBlZCA9IFN5bWJvbCgnd3JhcHBlZCcpO1xudmFyIFVud3JhcHBlZCA9IFN5bWJvbCgndW53cmFwcGVkJyk7XG52YXIgR2V0UHJvdG8gPSBTeW1ib2woJ2dldFByb3RvJyk7XG52YXIgT25HZXQgPSBTeW1ib2woJ29uR2V0Jyk7XG52YXIgT25BbGxHZXQgPSBTeW1ib2woJ29uQWxsR2V0Jyk7XG52YXIgQmluZENoYWluID0gU3ltYm9sKCdiaW5kQ2hhaW4nKTtcbnZhciBEZXNjcmlwdG9ycyA9IFN5bWJvbCgnRGVzY3JpcHRvcnMnKTtcbnZhciBCZWZvcmUgPSBTeW1ib2woJ0JlZm9yZScpO1xudmFyIEFmdGVyID0gU3ltYm9sKCdBZnRlcicpO1xudmFyIE5vR2V0dGVycyA9IFN5bWJvbCgnTm9HZXR0ZXJzJyk7XG52YXIgUHJldmVudCA9IFN5bWJvbCgnUHJldmVudCcpO1xudmFyIFR5cGVkQXJyYXkgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoSW50OEFycmF5KTtcbnZhciBTZXRJdGVyYXRvciA9IFNldC5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXTtcbnZhciBNYXBJdGVyYXRvciA9IE1hcC5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXTtcbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xudmFyIGlzRXhjbHVkZWQgPSBvYmplY3QgPT4gdHlwZW9mIHdpbi5NYXAgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLk1hcCB8fCB0eXBlb2Ygd2luLlNldCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uU2V0IHx8IHR5cGVvZiB3aW4uTm9kZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTm9kZSB8fCB0eXBlb2Ygd2luLldlYWtNYXAgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLldlYWtNYXAgfHwgdHlwZW9mIHdpbi5Mb2NhdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTG9jYXRpb24gfHwgdHlwZW9mIHdpbi5TdG9yYWdlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5TdG9yYWdlIHx8IHR5cGVvZiB3aW4uV2Vha1NldCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uV2Vha1NldCB8fCB0eXBlb2Ygd2luLkFycmF5QnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5BcnJheUJ1ZmZlciB8fCB0eXBlb2Ygd2luLlByb21pc2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlByb21pc2UgfHwgdHlwZW9mIHdpbi5GaWxlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5GaWxlIHx8IHR5cGVvZiB3aW4uRXZlbnQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkV2ZW50IHx8IHR5cGVvZiB3aW4uQ3VzdG9tRXZlbnQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkN1c3RvbUV2ZW50IHx8IHR5cGVvZiB3aW4uR2FtZXBhZCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uR2FtZXBhZCB8fCB0eXBlb2Ygd2luLlJlc2l6ZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5SZXNpemVPYnNlcnZlciB8fCB0eXBlb2Ygd2luLk11dGF0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLk11dGF0aW9uT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5QZXJmb3JtYW5jZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5QZXJmb3JtYW5jZU9ic2VydmVyIHx8IHR5cGVvZiB3aW4uSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkludGVyc2VjdGlvbk9ic2VydmVyIHx8IHR5cGVvZiB3aW4uSURCQ3Vyc29yID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJDdXJzb3IgfHwgdHlwZW9mIHdpbi5JREJDdXJzb3JXaXRoVmFsdWUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkN1cnNvcldpdGhWYWx1ZSB8fCB0eXBlb2Ygd2luLklEQkRhdGFiYXNlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJEYXRhYmFzZSB8fCB0eXBlb2Ygd2luLklEQkZhY3RvcnkgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkZhY3RvcnkgfHwgdHlwZW9mIHdpbi5JREJJbmRleCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCSW5kZXggfHwgdHlwZW9mIHdpbi5JREJLZXlSYW5nZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCS2V5UmFuZ2UgfHwgdHlwZW9mIHdpbi5JREJPYmplY3RTdG9yZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCT2JqZWN0U3RvcmUgfHwgdHlwZW9mIHdpbi5JREJPcGVuREJSZXF1ZXN0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJPcGVuREJSZXF1ZXN0IHx8IHR5cGVvZiB3aW4uSURCUmVxdWVzdCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCUmVxdWVzdCB8fCB0eXBlb2Ygd2luLklEQlRyYW5zYWN0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJUcmFuc2FjdGlvbiB8fCB0eXBlb2Ygd2luLklEQlZlcnNpb25DaGFuZ2VFdmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCVmVyc2lvbkNoYW5nZUV2ZW50IHx8IHR5cGVvZiB3aW4uRmlsZVN5c3RlbUZpbGVIYW5kbGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkZpbGVTeXN0ZW1GaWxlSGFuZGxlIHx8IHR5cGVvZiB3aW4uUlRDUGVlckNvbm5lY3Rpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlJUQ1BlZXJDb25uZWN0aW9uIHx8IHR5cGVvZiB3aW4uU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbiB8fCB0eXBlb2Ygd2luLldlYkdMVGV4dHVyZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uV2ViR0xUZXh0dXJlO1xuY2xhc3MgQmluZGFibGUge1xuICBzdGF0aWMgaXNCaW5kYWJsZShvYmplY3QpIHtcbiAgICBpZiAoIW9iamVjdCB8fCAhb2JqZWN0W0lzQmluZGFibGVdIHx8ICFvYmplY3RbUHJldmVudF0pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdFtJc0JpbmRhYmxlXSA9PT0gQmluZGFibGU7XG4gIH1cbiAgc3RhdGljIG9uRGVjayhvYmplY3QsIGtleSkge1xuICAgIHJldHVybiBvYmplY3RbRGVja10uZ2V0KGtleSkgfHwgZmFsc2U7XG4gIH1cbiAgc3RhdGljIHJlZihvYmplY3QpIHtcbiAgICByZXR1cm4gb2JqZWN0W1JlZl0gfHwgb2JqZWN0IHx8IGZhbHNlO1xuICB9XG4gIHN0YXRpYyBtYWtlQmluZGFibGUob2JqZWN0KSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZShvYmplY3QpO1xuICB9XG4gIHN0YXRpYyBzaHVjayhvcmlnaW5hbCwgc2Vlbikge1xuICAgIHNlZW4gPSBzZWVuIHx8IG5ldyBNYXAoKTtcbiAgICB2YXIgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHt9KTtcbiAgICBpZiAob3JpZ2luYWwgaW5zdGFuY2VvZiBUeXBlZEFycmF5IHx8IG9yaWdpbmFsIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIHZhciBfY2xvbmUgPSBvcmlnaW5hbC5zbGljZSgwKTtcbiAgICAgIHNlZW4uc2V0KG9yaWdpbmFsLCBfY2xvbmUpO1xuICAgICAgcmV0dXJuIF9jbG9uZTtcbiAgICB9XG4gICAgdmFyIHByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhvcmlnaW5hbCk7XG4gICAgZm9yICh2YXIgaSBpbiBwcm9wZXJ0aWVzKSB7XG4gICAgICB2YXIgaWkgPSBwcm9wZXJ0aWVzW2ldO1xuICAgICAgaWYgKGlpLnN1YnN0cmluZygwLCAzKSA9PT0gJ19fXycpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgYWxyZWFkeUNsb25lZCA9IHNlZW4uZ2V0KG9yaWdpbmFsW2lpXSk7XG4gICAgICBpZiAoYWxyZWFkeUNsb25lZCkge1xuICAgICAgICBjbG9uZVtpaV0gPSBhbHJlYWR5Q2xvbmVkO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcmlnaW5hbFtpaV0gPT09IG9yaWdpbmFsKSB7XG4gICAgICAgIHNlZW4uc2V0KG9yaWdpbmFsW2lpXSwgY2xvbmUpO1xuICAgICAgICBjbG9uZVtpaV0gPSBjbG9uZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWxbaWldICYmIHR5cGVvZiBvcmlnaW5hbFtpaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhciBvcmlnaW5hbFByb3AgPSBvcmlnaW5hbFtpaV07XG4gICAgICAgIGlmIChCaW5kYWJsZS5pc0JpbmRhYmxlKG9yaWdpbmFsW2lpXSkpIHtcbiAgICAgICAgICBvcmlnaW5hbFByb3AgPSBvcmlnaW5hbFtpaV1bT3JpZ2luYWxdO1xuICAgICAgICB9XG4gICAgICAgIGNsb25lW2lpXSA9IHRoaXMuc2h1Y2sob3JpZ2luYWxQcm9wLCBzZWVuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNsb25lW2lpXSA9IG9yaWdpbmFsW2lpXTtcbiAgICAgIH1cbiAgICAgIHNlZW4uc2V0KG9yaWdpbmFsW2lpXSwgY2xvbmVbaWldKTtcbiAgICB9XG4gICAgaWYgKEJpbmRhYmxlLmlzQmluZGFibGUob3JpZ2luYWwpKSB7XG4gICAgICBkZWxldGUgY2xvbmUuYmluZFRvO1xuICAgICAgZGVsZXRlIGNsb25lLmlzQm91bmQ7XG4gICAgfVxuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuICBzdGF0aWMgbWFrZShvYmplY3QpIHtcbiAgICBpZiAob2JqZWN0W1ByZXZlbnRdKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoIW9iamVjdCB8fCAhWydmdW5jdGlvbicsICdvYmplY3QnXS5pbmNsdWRlcyh0eXBlb2Ygb2JqZWN0KSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKFJlZiBpbiBvYmplY3QpIHtcbiAgICAgIHJldHVybiBvYmplY3RbUmVmXTtcbiAgICB9XG4gICAgaWYgKG9iamVjdFtJc0JpbmRhYmxlXSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKE9iamVjdC5pc1NlYWxlZChvYmplY3QpIHx8IE9iamVjdC5pc0Zyb3plbihvYmplY3QpIHx8ICFPYmplY3QuaXNFeHRlbnNpYmxlKG9iamVjdCkgfHwgaXNFeGNsdWRlZChvYmplY3QpKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBJc0JpbmRhYmxlLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogQmluZGFibGVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBSZWYsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICB2YWx1ZTogZmFsc2VcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBPcmlnaW5hbCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG9iamVjdFxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIERlY2ssIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCaW5kaW5nLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFN1YkJpbmRpbmcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCaW5kaW5nQWxsLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgRXhlY3V0aW5nLCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgV3JhcHBpbmcsIHtcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTdGFjaywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmVmb3JlLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQWZ0ZXIsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBXcmFwcGVkLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG5ldyBNYXAoKSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBVbndyYXBwZWQsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobmV3IE1hcCgpKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIERlc2NyaXB0b3JzLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG5ldyBNYXAoKSlcbiAgICB9KTtcbiAgICB2YXIgYmluZFRvID0gKHByb3BlcnR5LCBjYWxsYmFjayA9IG51bGwsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgdmFyIGJpbmRUb0FsbCA9IGZhbHNlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcGVydHkpKSB7XG4gICAgICAgIHZhciBkZWJpbmRlcnMgPSBwcm9wZXJ0eS5tYXAocCA9PiBiaW5kVG8ocCwgY2FsbGJhY2ssIG9wdGlvbnMpKTtcbiAgICAgICAgcmV0dXJuICgpID0+IGRlYmluZGVycy5mb3JFYWNoKGQgPT4gZCgpKTtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9wZXJ0eSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIG9wdGlvbnMgPSBjYWxsYmFjayB8fCB7fTtcbiAgICAgICAgY2FsbGJhY2sgPSBwcm9wZXJ0eTtcbiAgICAgICAgYmluZFRvQWxsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmRlbGF5ID49IDApIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBEZWxheUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLmRlbGF5KTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnRocm90dGxlID49IDApIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBUaHJvdHRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLnRocm90dGxlKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLndhaXQgPj0gMCkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcFdhaXRDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy53YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZyYW1lKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwRnJhbWVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy5mcmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5pZGxlKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwSWRsZUNhbGxiYWNrKGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChiaW5kVG9BbGwpIHtcbiAgICAgICAgb2JqZWN0W0JpbmRpbmdBbGxdLmFkZChjYWxsYmFjayk7XG4gICAgICAgIGlmICghKCdub3cnIGluIG9wdGlvbnMpIHx8IG9wdGlvbnMubm93KSB7XG4gICAgICAgICAgZm9yICh2YXIgaSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG9iamVjdFtpXSwgaSwgb2JqZWN0LCBmYWxzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgb2JqZWN0W0JpbmRpbmdBbGxdLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBpZiAoIW9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0pIHtcbiAgICAgICAgb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XSA9IG5ldyBTZXQoKTtcbiAgICAgIH1cblxuICAgICAgLy8gbGV0IGJpbmRJbmRleCA9IG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0ubGVuZ3RoO1xuXG4gICAgICBpZiAob3B0aW9ucy5jaGlsZHJlbikge1xuICAgICAgICB2YXIgb3JpZ2luYWwgPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2sgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgIHZhciB2ID0gYXJnc1swXTtcbiAgICAgICAgICB2YXIgc3ViRGViaW5kID0gb2JqZWN0W1N1YkJpbmRpbmddLmdldChvcmlnaW5hbCk7XG4gICAgICAgICAgaWYgKHN1YkRlYmluZCkge1xuICAgICAgICAgICAgb2JqZWN0W1N1YkJpbmRpbmddLmRlbGV0ZShvcmlnaW5hbCk7XG4gICAgICAgICAgICBzdWJEZWJpbmQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgb3JpZ2luYWwoLi4uYXJncyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciB2diA9IEJpbmRhYmxlLm1ha2Uodik7XG4gICAgICAgICAgaWYgKEJpbmRhYmxlLmlzQmluZGFibGUodnYpKSB7XG4gICAgICAgICAgICBvYmplY3RbU3ViQmluZGluZ10uc2V0KG9yaWdpbmFsLCB2di5iaW5kVG8oKC4uLnN1YkFyZ3MpID0+IG9yaWdpbmFsKC4uLmFyZ3MsIC4uLnN1YkFyZ3MpLCBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgIGNoaWxkcmVuOiBmYWxzZVxuICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3JpZ2luYWwoLi4uYXJncyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmFkZChjYWxsYmFjayk7XG4gICAgICBpZiAoISgnbm93JyBpbiBvcHRpb25zKSB8fCBvcHRpb25zLm5vdykge1xuICAgICAgICBjYWxsYmFjayhvYmplY3RbcHJvcGVydHldLCBwcm9wZXJ0eSwgb2JqZWN0LCBmYWxzZSk7XG4gICAgICB9XG4gICAgICB2YXIgZGViaW5kZXIgPSAoKSA9PiB7XG4gICAgICAgIHZhciBzdWJEZWJpbmQgPSBvYmplY3RbU3ViQmluZGluZ10uZ2V0KGNhbGxiYWNrKTtcbiAgICAgICAgaWYgKHN1YkRlYmluZCkge1xuICAgICAgICAgIG9iamVjdFtTdWJCaW5kaW5nXS5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICAgIHN1YkRlYmluZCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0uaGFzKGNhbGxiYWNrKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICB9O1xuICAgICAgaWYgKG9wdGlvbnMucmVtb3ZlV2l0aCAmJiBvcHRpb25zLnJlbW92ZVdpdGggaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICAgIG9wdGlvbnMucmVtb3ZlV2l0aC5vblJlbW92ZSgoKSA9PiBkZWJpbmRlcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGViaW5kZXI7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnYmluZFRvJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IGJpbmRUb1xuICAgIH0pO1xuICAgIHZhciBfX19iZWZvcmUgPSBjYWxsYmFjayA9PiB7XG4gICAgICBvYmplY3RbQmVmb3JlXS5hZGQoY2FsbGJhY2spO1xuICAgICAgcmV0dXJuICgpID0+IG9iamVjdFtCZWZvcmVdLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgfTtcbiAgICB2YXIgX19fYWZ0ZXIgPSBjYWxsYmFjayA9PiB7XG4gICAgICBvYmplY3RbQWZ0ZXJdLmFkZChjYWxsYmFjayk7XG4gICAgICByZXR1cm4gKCkgPT4gb2JqZWN0W0FmdGVyXS5kZWxldGUoY2FsbGJhY2spO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmluZENoYWluLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogKHBhdGgsIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICAgICAgdmFyIG5vZGUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICB2YXIgc3ViUGFydHMgPSBwYXJ0cy5zbGljZSgwKTtcbiAgICAgICAgdmFyIGRlYmluZCA9IFtdO1xuICAgICAgICBkZWJpbmQucHVzaChvYmplY3QuYmluZFRvKG5vZGUsICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgdmFyIHJlc3QgPSBzdWJQYXJ0cy5qb2luKCcuJyk7XG4gICAgICAgICAgaWYgKHN1YlBhcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbGJhY2sodiwgaywgdCwgZCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHYgPSB0W2tdID0gdGhpcy5tYWtlKHt9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGViaW5kID0gZGViaW5kLmNvbmNhdCh2W0JpbmRDaGFpbl0ocmVzdCwgY2FsbGJhY2spKTtcbiAgICAgICAgfSkpO1xuICAgICAgICByZXR1cm4gKCkgPT4gZGViaW5kLmZvckVhY2goeCA9PiB4KCkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdfX19iZWZvcmUnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogX19fYmVmb3JlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ19fX2FmdGVyJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IF9fX2FmdGVyXG4gICAgfSk7XG4gICAgdmFyIGlzQm91bmQgPSAoKSA9PiB7XG4gICAgICBpZiAob2JqZWN0W0JpbmRpbmdBbGxdLnNpemUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBjYWxsYmFja3Mgb2YgT2JqZWN0LnZhbHVlcyhvYmplY3RbQmluZGluZ10pKSB7XG4gICAgICAgIGlmIChjYWxsYmFja3Muc2l6ZSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcihsZXQgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKVxuICAgICAgICAvLyB7XG4gICAgICAgIC8vIFx0aWYoY2FsbGJhY2spXG4gICAgICAgIC8vIFx0e1xuICAgICAgICAvLyBcdFx0cmV0dXJuIHRydWU7XG4gICAgICAgIC8vIFx0fVxuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnaXNCb3VuZCcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBpc0JvdW5kXG4gICAgfSk7XG4gICAgZm9yICh2YXIgaSBpbiBvYmplY3QpIHtcbiAgICAgIC8vIGNvbnN0IGRlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob2JqZWN0KTtcblxuICAgICAgaWYgKCFvYmplY3RbaV0gfHwgdHlwZW9mIG9iamVjdFtpXSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAob2JqZWN0W2ldW1JlZl0gfHwgb2JqZWN0W2ldIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZShvYmplY3RbaV0pIHx8IE9iamVjdC5pc1NlYWxlZChvYmplY3RbaV0pKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0V4Y2x1ZGVkKG9iamVjdFtpXSkpIHtcbiAgICAgICAgb2JqZWN0W2ldID0gQmluZGFibGUubWFrZShvYmplY3RbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZGVzY3JpcHRvcnMgPSBvYmplY3RbRGVzY3JpcHRvcnNdO1xuICAgIHZhciB3cmFwcGVkID0gb2JqZWN0W1dyYXBwZWRdO1xuICAgIHZhciBzdGFjayA9IG9iamVjdFtTdGFja107XG4gICAgdmFyIHNldCA9ICh0YXJnZXQsIGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhbHVlID0gQmluZGFibGUubWFrZSh2YWx1ZSk7XG4gICAgICAgIGlmICh0YXJnZXRba2V5XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdyYXBwZWQuaGFzKGtleSkpIHtcbiAgICAgICAgd3JhcHBlZC5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICAgIHZhciBvbkRlY2sgPSBvYmplY3RbRGVja107XG4gICAgICB2YXIgaXNPbkRlY2sgPSBvbkRlY2suaGFzKGtleSk7XG4gICAgICB2YXIgdmFsT25EZWNrID0gaXNPbkRlY2sgJiYgb25EZWNrLmdldChrZXkpO1xuXG4gICAgICAvLyBpZihvbkRlY2tba2V5XSAhPT0gdW5kZWZpbmVkICYmIG9uRGVja1trZXldID09PSB2YWx1ZSlcbiAgICAgIGlmIChpc09uRGVjayAmJiB2YWxPbkRlY2sgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGtleS5zbGljZSAmJiBrZXkuc2xpY2UoLTMpID09PSAnX19fJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0YXJnZXRba2V5XSA9PT0gdmFsdWUgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBpc05hTih2YWxPbkRlY2spICYmIGlzTmFOKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIG9uRGVjay5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICBmb3IgKHZhciBjYWxsYmFjayBvZiBvYmplY3RbQmluZGluZ0FsbF0pIHtcbiAgICAgICAgY2FsbGJhY2sodmFsdWUsIGtleSwgdGFyZ2V0LCBmYWxzZSk7XG4gICAgICB9XG4gICAgICBpZiAoa2V5IGluIG9iamVjdFtCaW5kaW5nXSkge1xuICAgICAgICBmb3IgKHZhciBfY2FsbGJhY2sgb2Ygb2JqZWN0W0JpbmRpbmddW2tleV0pIHtcbiAgICAgICAgICBfY2FsbGJhY2sodmFsdWUsIGtleSwgdGFyZ2V0LCBmYWxzZSwgdGFyZ2V0W2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvbkRlY2suZGVsZXRlKGtleSk7XG4gICAgICB2YXIgZXhjbHVkZWQgPSB3aW4uRmlsZSAmJiB0YXJnZXQgaW5zdGFuY2VvZiB3aW4uRmlsZSAmJiBrZXkgPT0gJ2xhc3RNb2RpZmllZERhdGUnO1xuICAgICAgaWYgKCFleGNsdWRlZCkge1xuICAgICAgICBSZWZsZWN0LnNldCh0YXJnZXQsIGtleSwgdmFsdWUpO1xuICAgICAgfVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSAmJiBvYmplY3RbQmluZGluZ11bJ2xlbmd0aCddKSB7XG4gICAgICAgIGZvciAodmFyIF9pIGluIG9iamVjdFtCaW5kaW5nXVsnbGVuZ3RoJ10pIHtcbiAgICAgICAgICB2YXIgX2NhbGxiYWNrMiA9IG9iamVjdFtCaW5kaW5nXVsnbGVuZ3RoJ11bX2ldO1xuICAgICAgICAgIF9jYWxsYmFjazIodGFyZ2V0Lmxlbmd0aCwgJ2xlbmd0aCcsIHRhcmdldCwgZmFsc2UsIHRhcmdldC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIHZhciBkZWxldGVQcm9wZXJ0eSA9ICh0YXJnZXQsIGtleSkgPT4ge1xuICAgICAgdmFyIG9uRGVjayA9IG9iamVjdFtEZWNrXTtcbiAgICAgIHZhciBpc09uRGVjayA9IG9uRGVjay5oYXMoa2V5KTtcbiAgICAgIGlmIChpc09uRGVjaykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghKGtleSBpbiB0YXJnZXQpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0b3JzLmhhcyhrZXkpKSB7XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvcnMuZ2V0KGtleSk7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBkZXNjcmlwdG9ycy5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICAgIG9uRGVjay5zZXQoa2V5LCBudWxsKTtcbiAgICAgIGlmICh3cmFwcGVkLmhhcyhrZXkpKSB7XG4gICAgICAgIHdyYXBwZWQuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBjYWxsYmFjayBvZiBvYmplY3RbQmluZGluZ0FsbF0pIHtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBrZXksIHRhcmdldCwgdHJ1ZSwgdGFyZ2V0W2tleV0pO1xuICAgICAgfVxuICAgICAgaWYgKGtleSBpbiBvYmplY3RbQmluZGluZ10pIHtcbiAgICAgICAgZm9yICh2YXIgYmluZGluZyBvZiBvYmplY3RbQmluZGluZ11ba2V5XSkge1xuICAgICAgICAgIGJpbmRpbmcodW5kZWZpbmVkLCBrZXksIHRhcmdldCwgdHJ1ZSwgdGFyZ2V0W2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwga2V5KTtcbiAgICAgIG9uRGVjay5kZWxldGUoa2V5KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgdmFyIGNvbnN0cnVjdCA9ICh0YXJnZXQsIGFyZ3MpID0+IHtcbiAgICAgIHZhciBrZXkgPSAnY29uc3RydWN0b3InO1xuICAgICAgZm9yICh2YXIgY2FsbGJhY2sgb2YgdGFyZ2V0W0JlZm9yZV0pIHtcbiAgICAgICAgY2FsbGJhY2sodGFyZ2V0LCBrZXksIG9iamVjdFtTdGFja10sIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICB9XG4gICAgICB2YXIgaW5zdGFuY2UgPSBCaW5kYWJsZS5tYWtlKG5ldyB0YXJnZXRbT3JpZ2luYWxdKC4uLmFyZ3MpKTtcbiAgICAgIGZvciAodmFyIF9jYWxsYmFjazMgb2YgdGFyZ2V0W0FmdGVyXSkge1xuICAgICAgICBfY2FsbGJhY2szKHRhcmdldCwga2V5LCBvYmplY3RbU3RhY2tdLCBpbnN0YW5jZSwgYXJncyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfTtcbiAgICB2YXIgZ2V0ID0gKHRhcmdldCwga2V5KSA9PiB7XG4gICAgICBpZiAod3JhcHBlZC5oYXMoa2V5KSkge1xuICAgICAgICByZXR1cm4gd3JhcHBlZC5nZXQoa2V5KTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgPT09IFJlZiB8fCBrZXkgPT09IE9yaWdpbmFsIHx8IGtleSA9PT0gJ2FwcGx5JyB8fCBrZXkgPT09ICdpc0JvdW5kJyB8fCBrZXkgPT09ICdiaW5kVG8nIHx8IGtleSA9PT0gJ19fcHJvdG9fXycgfHwga2V5ID09PSAnY29uc3RydWN0b3InKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgIH1cbiAgICAgIHZhciBkZXNjcmlwdG9yO1xuICAgICAgaWYgKGRlc2NyaXB0b3JzLmhhcyhrZXkpKSB7XG4gICAgICAgIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ycy5nZXQoa2V5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwga2V5KTtcbiAgICAgICAgZGVzY3JpcHRvcnMuc2V0KGtleSwgZGVzY3JpcHRvcik7XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5jb25maWd1cmFibGUgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgICAgaWYgKE9uQWxsR2V0IGluIG9iamVjdCkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W09uQWxsR2V0XShrZXkpO1xuICAgICAgfVxuICAgICAgaWYgKE9uR2V0IGluIG9iamVjdCAmJiAhKGtleSBpbiBvYmplY3QpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RbT25HZXRdKGtleSk7XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5jb25maWd1cmFibGUgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgd3JhcHBlZC5zZXQoa2V5LCBvYmplY3Rba2V5XSk7XG4gICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2Ygb2JqZWN0W2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaWYgKE5hbWVzIGluIG9iamVjdFtrZXldKSB7XG4gICAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgICB9XG4gICAgICAgIG9iamVjdFtVbndyYXBwZWRdLnNldChrZXksIG9iamVjdFtrZXldKTtcbiAgICAgICAgdmFyIHByb3RvdHlwZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpO1xuICAgICAgICB2YXIgaXNNZXRob2QgPSBwcm90b3R5cGVba2V5XSA9PT0gb2JqZWN0W2tleV07XG4gICAgICAgIHZhciBvYmpSZWYgPVxuICAgICAgICAvLyAodHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFByb21pc2UpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgU3RvcmFnZSA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgU3RvcmFnZSlcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBNYXAgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBNYXApXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgU2V0ID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgU2V0KVxuICAgICAgICAvLyB8fCAodHlwZW9mIFdlYWtNYXAgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFdlYWtNYXApXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgV2Vha1NldCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgV2Vha1NldClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBSZXNpemVPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBSZXNpemVPYnNlcnZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBNdXRhdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBNdXRhdGlvbk9ic2VydmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFBlcmZvcm1hbmNlT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFBlcmZvcm1hbmNlT2JzZXJ2ZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIpXG4gICAgICAgIGlzRXhjbHVkZWQob2JqZWN0KSB8fCB0eXBlb2Ygb2JqZWN0W1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbicgJiYga2V5ID09PSAnbmV4dCcgfHwgdHlwZW9mIFR5cGVkQXJyYXkgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2YgVHlwZWRBcnJheSB8fCB0eXBlb2YgRXZlbnRUYXJnZXQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2YgRXZlbnRUYXJnZXQgfHwgdHlwZW9mIERhdGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2YgRGF0ZSB8fCB0eXBlb2YgTWFwSXRlcmF0b3IgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0LnByb3RvdHlwZSA9PT0gTWFwSXRlcmF0b3IgfHwgdHlwZW9mIFNldEl0ZXJhdG9yID09PSAnZnVuY3Rpb24nICYmIG9iamVjdC5wcm90b3R5cGUgPT09IFNldEl0ZXJhdG9yID8gb2JqZWN0IDogb2JqZWN0W1JlZl07XG4gICAgICAgIHZhciB3cmFwcGVkTWV0aG9kID0gZnVuY3Rpb24gKC4uLnByb3ZpZGVkQXJncykge1xuICAgICAgICAgIG9iamVjdFtFeGVjdXRpbmddID0ga2V5O1xuICAgICAgICAgIHN0YWNrLnVuc2hpZnQoa2V5KTtcbiAgICAgICAgICBmb3IgKHZhciBiZWZvcmVDYWxsYmFjayBvZiBvYmplY3RbQmVmb3JlXSkge1xuICAgICAgICAgICAgYmVmb3JlQ2FsbGJhY2sob2JqZWN0LCBrZXksIHN0YWNrLCBvYmplY3QsIHByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZXQ7XG4gICAgICAgICAgaWYgKG5ldy50YXJnZXQpIHtcbiAgICAgICAgICAgIHJldCA9IG5ldyAob2JqZWN0W1Vud3JhcHBlZF0uZ2V0KGtleSkpKC4uLnByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBmdW5jID0gb2JqZWN0W1Vud3JhcHBlZF0uZ2V0KGtleSk7XG4gICAgICAgICAgICBpZiAoaXNNZXRob2QpIHtcbiAgICAgICAgICAgICAgcmV0ID0gZnVuYy5hcHBseShvYmpSZWYgfHwgb2JqZWN0LCBwcm92aWRlZEFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0ID0gZnVuYyguLi5wcm92aWRlZEFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKHZhciBhZnRlckNhbGxiYWNrIG9mIG9iamVjdFtBZnRlcl0pIHtcbiAgICAgICAgICAgIGFmdGVyQ2FsbGJhY2sob2JqZWN0LCBrZXksIHN0YWNrLCBvYmplY3QsIHByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9iamVjdFtFeGVjdXRpbmddID0gbnVsbDtcbiAgICAgICAgICBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH07XG4gICAgICAgIHdyYXBwZWRNZXRob2RbT25BbGxHZXRdID0gX2tleSA9PiBvYmplY3Rba2V5XVtfa2V5XTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IEJpbmRhYmxlLm1ha2Uod3JhcHBlZE1ldGhvZCk7XG4gICAgICAgIHdyYXBwZWQuc2V0KGtleSwgcmVzdWx0KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICB9O1xuICAgIHZhciBnZXRQcm90b3R5cGVPZiA9IHRhcmdldCA9PiB7XG4gICAgICBpZiAoR2V0UHJvdG8gaW4gb2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBvYmplY3RbR2V0UHJvdG9dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFJlZmxlY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcbiAgICB9O1xuICAgIHZhciBoYW5kbGVyRGVmID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBoYW5kbGVyRGVmLnNldCA9IHNldDtcbiAgICBoYW5kbGVyRGVmLmNvbnN0cnVjdCA9IGNvbnN0cnVjdDtcbiAgICBoYW5kbGVyRGVmLmRlbGV0ZVByb3BlcnR5ID0gZGVsZXRlUHJvcGVydHk7XG4gICAgaWYgKCFvYmplY3RbTm9HZXR0ZXJzXSkge1xuICAgICAgaGFuZGxlckRlZi5nZXRQcm90b3R5cGVPZiA9IGdldFByb3RvdHlwZU9mO1xuICAgICAgaGFuZGxlckRlZi5nZXQgPSBnZXQ7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFJlZiwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBQcm94eShvYmplY3QsIGhhbmRsZXJEZWYpXG4gICAgfSk7XG4gICAgcmV0dXJuIG9iamVjdFtSZWZdO1xuICB9XG4gIHN0YXRpYyBjbGVhckJpbmRpbmdzKG9iamVjdCkge1xuICAgIHZhciBtYXBzID0gZnVuYyA9PiAoLi4ub3MpID0+IG9zLm1hcChmdW5jKTtcbiAgICB2YXIgY2xlYXJPYmogPSBvID0+IE9iamVjdC5rZXlzKG8pLm1hcChrID0+IGRlbGV0ZSBvW2tdKTtcbiAgICB2YXIgY2xlYXJPYmpzID0gbWFwcyhjbGVhck9iaik7XG4gICAgb2JqZWN0W0JpbmRpbmdBbGxdLmNsZWFyKCk7XG4gICAgY2xlYXJPYmpzKG9iamVjdFtXcmFwcGVkXSwgb2JqZWN0W0JpbmRpbmddLCBvYmplY3RbQWZ0ZXJdLCBvYmplY3RbQmVmb3JlXSk7XG4gIH1cbiAgc3RhdGljIHJlc29sdmUob2JqZWN0LCBwYXRoLCBvd25lciA9IGZhbHNlKSB7XG4gICAgdmFyIG5vZGU7XG4gICAgdmFyIHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICB2YXIgdG9wID0gcGF0aFBhcnRzWzBdO1xuICAgIHdoaWxlIChwYXRoUGFydHMubGVuZ3RoKSB7XG4gICAgICBpZiAob3duZXIgJiYgcGF0aFBhcnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICB2YXIgb2JqID0gdGhpcy5tYWtlKG9iamVjdCk7XG4gICAgICAgIHJldHVybiBbb2JqLCBwYXRoUGFydHMuc2hpZnQoKSwgdG9wXTtcbiAgICAgIH1cbiAgICAgIG5vZGUgPSBwYXRoUGFydHMuc2hpZnQoKTtcbiAgICAgIGlmICghKG5vZGUgaW4gb2JqZWN0KSB8fCAhb2JqZWN0W25vZGVdIHx8ICEodHlwZW9mIG9iamVjdFtub2RlXSA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgIG9iamVjdFtub2RlXSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICB9XG4gICAgICBvYmplY3QgPSB0aGlzLm1ha2Uob2JqZWN0W25vZGVdKTtcbiAgICB9XG4gICAgcmV0dXJuIFt0aGlzLm1ha2Uob2JqZWN0KSwgbm9kZSwgdG9wXTtcbiAgfVxuICBzdGF0aWMgd3JhcERlbGF5Q2FsbGJhY2soY2FsbGJhY2ssIGRlbGF5KSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiBzZXRUaW1lb3V0KCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpLCBkZWxheSk7XG4gIH1cbiAgc3RhdGljIHdyYXBUaHJvdHRsZUNhbGxiYWNrKGNhbGxiYWNrLCB0aHJvdHRsZSkge1xuICAgIHRoaXMudGhyb3R0bGVzLnNldChjYWxsYmFjaywgZmFsc2UpO1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMudGhyb3R0bGVzLmdldChjYWxsYmFjaywgdHJ1ZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgICB0aGlzLnRocm90dGxlcy5zZXQoY2FsbGJhY2ssIHRydWUpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMudGhyb3R0bGVzLnNldChjYWxsYmFjaywgZmFsc2UpO1xuICAgICAgfSwgdGhyb3R0bGUpO1xuICAgIH07XG4gIH1cbiAgc3RhdGljIHdyYXBXYWl0Q2FsbGJhY2soY2FsbGJhY2ssIHdhaXQpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIHZhciB3YWl0ZXI7XG4gICAgICBpZiAod2FpdGVyID0gdGhpcy53YWl0ZXJzLmdldChjYWxsYmFjaykpIHtcbiAgICAgICAgdGhpcy53YWl0ZXJzLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgIGNsZWFyVGltZW91dCh3YWl0ZXIpO1xuICAgICAgfVxuICAgICAgd2FpdGVyID0gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSwgd2FpdCk7XG4gICAgICB0aGlzLndhaXRlcnMuc2V0KGNhbGxiYWNrLCB3YWl0ZXIpO1xuICAgIH07XG4gIH1cbiAgc3RhdGljIHdyYXBGcmFtZUNhbGxiYWNrKGNhbGxiYWNrLCBmcmFtZXMpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSk7XG4gICAgfTtcbiAgfVxuICBzdGF0aWMgd3JhcElkbGVDYWxsYmFjayhjYWxsYmFjaykge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgLy8gQ29tcGF0aWJpbGl0eSBmb3IgU2FmYXJpIDA4LzIwMjBcbiAgICAgIHZhciByZXEgPSB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFjayB8fCByZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG4gICAgICByZXEoKCkgPT4gY2FsbGJhY2soLi4uYXJncykpO1xuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuQmluZGFibGUgPSBCaW5kYWJsZTtcbl9kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgXCJ3YWl0ZXJzXCIsIG5ldyBXZWFrTWFwKCkpO1xuX2RlZmluZVByb3BlcnR5KEJpbmRhYmxlLCBcInRocm90dGxlc1wiLCBuZXcgV2Vha01hcCgpKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ1ByZXZlbnQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBQcmV2ZW50XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ09uR2V0Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogT25HZXRcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnTm9HZXR0ZXJzJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogTm9HZXR0ZXJzXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ0dldFByb3RvJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogR2V0UHJvdG9cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnT25BbGxHZXQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBPbkFsbEdldFxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9DYWNoZS5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQ2FjaGUgPSB2b2lkIDA7XG5jbGFzcyBDYWNoZSB7XG4gIHN0YXRpYyBzdG9yZShrZXksIHZhbHVlLCBleHBpcnksIGJ1Y2tldCA9ICdzdGFuZGFyZCcpIHtcbiAgICB2YXIgZXhwaXJhdGlvbiA9IDA7XG4gICAgaWYgKGV4cGlyeSkge1xuICAgICAgZXhwaXJhdGlvbiA9IGV4cGlyeSAqIDEwMDAgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmJ1Y2tldHMpIHtcbiAgICAgIHRoaXMuYnVja2V0cyA9IG5ldyBNYXAoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmJ1Y2tldHMuaGFzKGJ1Y2tldCkpIHtcbiAgICAgIHRoaXMuYnVja2V0cy5zZXQoYnVja2V0LCBuZXcgTWFwKCkpO1xuICAgIH1cbiAgICB2YXIgZXZlbnRFbmQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Q2FjaGVTdG9yZScsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAga2V5LFxuICAgICAgICB2YWx1ZSxcbiAgICAgICAgZXhwaXJ5LFxuICAgICAgICBidWNrZXRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudEVuZCkpIHtcbiAgICAgIHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5zZXQoa2V5LCB7XG4gICAgICAgIHZhbHVlLFxuICAgICAgICBleHBpcmF0aW9uXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIGxvYWQoa2V5LCBkZWZhdWx0dmFsdWUgPSBmYWxzZSwgYnVja2V0ID0gJ3N0YW5kYXJkJykge1xuICAgIHZhciBldmVudEVuZCA9IG5ldyBDdXN0b21FdmVudCgnY3ZDYWNoZUxvYWQnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGtleSxcbiAgICAgICAgZGVmYXVsdHZhbHVlLFxuICAgICAgICBidWNrZXRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRFbmQpKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdHZhbHVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5idWNrZXRzICYmIHRoaXMuYnVja2V0cy5oYXMoYnVja2V0KSAmJiB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuaGFzKGtleSkpIHtcbiAgICAgIHZhciBlbnRyeSA9IHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5nZXQoa2V5KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuYnVja2V0W2J1Y2tldF1ba2V5XS5leHBpcmF0aW9uLCAobmV3IERhdGUpLmdldFRpbWUoKSk7XG4gICAgICBpZiAoZW50cnkuZXhwaXJhdGlvbiA9PT0gMCB8fCBlbnRyeS5leHBpcmF0aW9uID4gbmV3IERhdGUoKS5nZXRUaW1lKCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5nZXQoa2V5KS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlZmF1bHR2YWx1ZTtcbiAgfVxufVxuZXhwb3J0cy5DYWNoZSA9IENhY2hlO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Db25maWcgPSB2b2lkIDA7XG52YXIgQXBwQ29uZmlnID0ge307XG52YXIgX3JlcXVpcmUgPSByZXF1aXJlO1xudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG50cnkge1xuICBBcHBDb25maWcgPSBfcmVxdWlyZSgnL0NvbmZpZycpLkNvbmZpZztcbn0gY2F0Y2ggKGVycm9yKSB7XG4gIHdpbi5kZXZNb2RlID09PSB0cnVlICYmIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICBBcHBDb25maWcgPSB7fTtcbn1cbmNsYXNzIENvbmZpZyB7XG4gIHN0YXRpYyBnZXQobmFtZSkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZ3NbbmFtZV07XG4gIH1cbiAgc3RhdGljIHNldChuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuY29uZmlnc1tuYW1lXSA9IHZhbHVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHN0YXRpYyBkdW1wKCkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZ3M7XG4gIH1cbiAgc3RhdGljIGluaXQoLi4uY29uZmlncykge1xuICAgIGZvciAodmFyIGkgaW4gY29uZmlncykge1xuICAgICAgdmFyIGNvbmZpZyA9IGNvbmZpZ3NbaV07XG4gICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uZmlnID0gSlNPTi5wYXJzZShjb25maWcpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgbmFtZSBpbiBjb25maWcpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gY29uZmlnW25hbWVdO1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWdzW25hbWVdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5leHBvcnRzLkNvbmZpZyA9IENvbmZpZztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb25maWcsICdjb25maWdzJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogQXBwQ29uZmlnXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0RvbS5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuRG9tID0gdm9pZCAwO1xudmFyIHRyYXZlcnNhbHMgPSAwO1xuY2xhc3MgRG9tIHtcbiAgc3RhdGljIG1hcFRhZ3MoZG9jLCBzZWxlY3RvciwgY2FsbGJhY2ssIHN0YXJ0Tm9kZSwgZW5kTm9kZSkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgc3RhcnRlZCA9IHRydWU7XG4gICAgaWYgKHN0YXJ0Tm9kZSkge1xuICAgICAgc3RhcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgZW5kZWQgPSBmYWxzZTtcbiAgICB2YXIge1xuICAgICAgTm9kZSxcbiAgICAgIEVsZW1lbnQsXG4gICAgICBOb2RlRmlsdGVyLFxuICAgICAgZG9jdW1lbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdmFyIHRyZWVXYWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGRvYywgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQgfCBOb2RlRmlsdGVyLlNIT1dfVEVYVCwge1xuICAgICAgYWNjZXB0Tm9kZTogKG5vZGUsIHdhbGtlcikgPT4ge1xuICAgICAgICBpZiAoIXN0YXJ0ZWQpIHtcbiAgICAgICAgICBpZiAobm9kZSA9PT0gc3RhcnROb2RlKSB7XG4gICAgICAgICAgICBzdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX1NLSVA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChlbmROb2RlICYmIG5vZGUgPT09IGVuZE5vZGUpIHtcbiAgICAgICAgICBlbmRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuZGVkKSB7XG4gICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX1NLSVA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgICAgICAgICBpZiAobm9kZS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfQUNDRVBUO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfU0tJUDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfQUNDRVBUO1xuICAgICAgfVxuICAgIH0sIGZhbHNlKTtcbiAgICB2YXIgdHJhdmVyc2FsID0gdHJhdmVyc2FscysrO1xuICAgIHdoaWxlICh0cmVlV2Fsa2VyLm5leHROb2RlKCkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGNhbGxiYWNrKHRyZWVXYWxrZXIuY3VycmVudE5vZGUsIHRyZWVXYWxrZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBzdGF0aWMgZGlzcGF0Y2hFdmVudChkb2MsIGV2ZW50KSB7XG4gICAgZG9jLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIHRoaXMubWFwVGFncyhkb2MsIGZhbHNlLCBub2RlID0+IHtcbiAgICAgIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgfSk7XG4gIH1cbn1cbmV4cG9ydHMuRG9tID0gRG9tO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvTWl4aW4uanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk1peGluID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIENvbnN0cnVjdG9yID0gU3ltYm9sKCdjb25zdHJ1Y3RvcicpO1xudmFyIE1peGluTGlzdCA9IFN5bWJvbCgnbWl4aW5MaXN0Jyk7XG5jbGFzcyBNaXhpbiB7XG4gIHN0YXRpYyBmcm9tKGJhc2VDbGFzcywgLi4ubWl4aW5zKSB7XG4gICAgdmFyIG5ld0NsYXNzID0gY2xhc3MgZXh0ZW5kcyBiYXNlQ2xhc3Mge1xuICAgICAgY29uc3RydWN0b3IoLi4uYXJncykge1xuICAgICAgICB2YXIgaW5zdGFuY2UgPSBiYXNlQ2xhc3MuY29uc3RydWN0b3IgPyBzdXBlciguLi5hcmdzKSA6IG51bGw7XG4gICAgICAgIGZvciAodmFyIG1peGluIG9mIG1peGlucykge1xuICAgICAgICAgIGlmIChtaXhpbltNaXhpbi5Db25zdHJ1Y3Rvcl0pIHtcbiAgICAgICAgICAgIG1peGluW01peGluLkNvbnN0cnVjdG9yXS5hcHBseSh0aGlzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3dpdGNoICh0eXBlb2YgbWl4aW4pIHtcbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgTWl4aW4ubWl4Q2xhc3MobWl4aW4sIG5ld0NsYXNzKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICBNaXhpbi5taXhPYmplY3QobWl4aW4sIHRoaXMpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIG5ld0NsYXNzO1xuICB9XG4gIHN0YXRpYyBtYWtlKC4uLmNsYXNzZXMpIHtcbiAgICB2YXIgYmFzZSA9IGNsYXNzZXMucG9wKCk7XG4gICAgcmV0dXJuIE1peGluLnRvKGJhc2UsIC4uLmNsYXNzZXMpO1xuICB9XG4gIHN0YXRpYyB0byhiYXNlLCAuLi5taXhpbnMpIHtcbiAgICB2YXIgZGVzY3JpcHRvcnMgPSB7fTtcbiAgICBtaXhpbnMubWFwKG1peGluID0+IHtcbiAgICAgIHN3aXRjaCAodHlwZW9mIG1peGluKSB7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihkZXNjcmlwdG9ycywgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMobWl4aW4pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oZGVzY3JpcHRvcnMsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG1peGluLnByb3RvdHlwZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVsZXRlIGRlc2NyaXB0b3JzLmNvbnN0cnVjdG9yO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoYmFzZS5wcm90b3R5cGUsIGRlc2NyaXB0b3JzKTtcbiAgICB9KTtcbiAgfVxuICBzdGF0aWMgd2l0aCguLi5taXhpbnMpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tKGNsYXNzIHtcbiAgICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICB9LCAuLi5taXhpbnMpO1xuICB9XG4gIHN0YXRpYyBtaXhPYmplY3QobWl4aW4sIGluc3RhbmNlKSB7XG4gICAgZm9yICh2YXIgZnVuYyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhtaXhpbikpIHtcbiAgICAgIGlmICh0eXBlb2YgbWl4aW5bZnVuY10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaW5zdGFuY2VbZnVuY10gPSBtaXhpbltmdW5jXS5iaW5kKGluc3RhbmNlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnN0YW5jZVtmdW5jXSA9IG1peGluW2Z1bmNdO1xuICAgIH1cbiAgICBmb3IgKHZhciBfZnVuYyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG1peGluKSkge1xuICAgICAgaWYgKHR5cGVvZiBtaXhpbltfZnVuY10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaW5zdGFuY2VbX2Z1bmNdID0gbWl4aW5bX2Z1bmNdLmJpbmQoaW5zdGFuY2UpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGluc3RhbmNlW19mdW5jXSA9IG1peGluW19mdW5jXTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIG1peENsYXNzKGNscywgbmV3Q2xhc3MpIHtcbiAgICBmb3IgKHZhciBmdW5jIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNscy5wcm90b3R5cGUpKSB7XG4gICAgICBpZiAoWyduYW1lJywgJ3Byb3RvdHlwZScsICdsZW5ndGgnXS5pbmNsdWRlcyhmdW5jKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihuZXdDbGFzcywgZnVuYyk7XG4gICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgY2xzW2Z1bmNdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtmdW5jXSA9IGNscy5wcm90b3R5cGVbZnVuY107XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW2Z1bmNdID0gY2xzLnByb3RvdHlwZVtmdW5jXS5iaW5kKG5ld0NsYXNzLnByb3RvdHlwZSk7XG4gICAgfVxuICAgIGZvciAodmFyIF9mdW5jMiBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGNscy5wcm90b3R5cGUpKSB7XG4gICAgICBpZiAodHlwZW9mIGNsc1tfZnVuYzJdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtfZnVuYzJdID0gY2xzLnByb3RvdHlwZVtfZnVuYzJdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtfZnVuYzJdID0gY2xzLnByb3RvdHlwZVtfZnVuYzJdLmJpbmQobmV3Q2xhc3MucHJvdG90eXBlKTtcbiAgICB9XG4gICAgdmFyIF9sb29wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoWyduYW1lJywgJ3Byb3RvdHlwZScsICdsZW5ndGgnXS5pbmNsdWRlcyhfZnVuYzMpKSB7XG4gICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5ld0NsYXNzLCBfZnVuYzMpO1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgY2xzW19mdW5jM10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBuZXdDbGFzc1tfZnVuYzNdID0gY2xzW19mdW5jM107XG4gICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByZXYgPSBuZXdDbGFzc1tfZnVuYzNdIHx8IGZhbHNlO1xuICAgICAgICB2YXIgbWV0aCA9IGNsc1tfZnVuYzNdLmJpbmQobmV3Q2xhc3MpO1xuICAgICAgICBuZXdDbGFzc1tfZnVuYzNdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICBwcmV2ICYmIHByZXYoLi4uYXJncyk7XG4gICAgICAgICAgcmV0dXJuIG1ldGgoLi4uYXJncyk7XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgX3JldDtcbiAgICBmb3IgKHZhciBfZnVuYzMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2xzKSkge1xuICAgICAgX3JldCA9IF9sb29wKCk7XG4gICAgICBpZiAoX3JldCA9PT0gMCkgY29udGludWU7XG4gICAgfVxuICAgIHZhciBfbG9vcDIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodHlwZW9mIGNsc1tfZnVuYzRdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtfZnVuYzRdID0gY2xzW19mdW5jNF07XG4gICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgfVxuICAgICAgdmFyIHByZXYgPSBuZXdDbGFzc1tfZnVuYzRdIHx8IGZhbHNlO1xuICAgICAgdmFyIG1ldGggPSBjbHNbX2Z1bmM0XS5iaW5kKG5ld0NsYXNzKTtcbiAgICAgIG5ld0NsYXNzW19mdW5jNF0gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICBwcmV2ICYmIHByZXYoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtZXRoKC4uLmFyZ3MpO1xuICAgICAgfTtcbiAgICB9O1xuICAgIGZvciAodmFyIF9mdW5jNCBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGNscykpIHtcbiAgICAgIGlmIChfbG9vcDIoKSkgY29udGludWU7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBtaXgobWl4aW5Ubykge1xuICAgIHZhciBjb25zdHJ1Y3RvcnMgPSBbXTtcbiAgICB2YXIgYWxsU3RhdGljID0ge307XG4gICAgdmFyIGFsbEluc3RhbmNlID0ge307XG4gICAgdmFyIG1peGFibGUgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKG1peGluVG8pO1xuICAgIHZhciBfbG9vcDMgPSBmdW5jdGlvbiAoYmFzZSkge1xuICAgICAgdmFyIGluc3RhbmNlTmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiYXNlLnByb3RvdHlwZSk7XG4gICAgICB2YXIgc3RhdGljTmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiYXNlKTtcbiAgICAgIHZhciBwcmVmaXggPSAvXihiZWZvcmV8YWZ0ZXIpX18oLispLztcbiAgICAgIHZhciBfbG9vcDUgPSBmdW5jdGlvbiAoX21ldGhvZE5hbWUyKSB7XG4gICAgICAgICAgdmFyIG1hdGNoID0gX21ldGhvZE5hbWUyLm1hdGNoKHByZWZpeCk7XG4gICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2JlZm9yZSc6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19iZWZvcmUoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZVtfbWV0aG9kTmFtZTJdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdhZnRlcic6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19hZnRlcigodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlW19tZXRob2ROYW1lMl0uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFsbFN0YXRpY1tfbWV0aG9kTmFtZTJdKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBiYXNlW19tZXRob2ROYW1lMl0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBhbGxTdGF0aWNbX21ldGhvZE5hbWUyXSA9IGJhc2VbX21ldGhvZE5hbWUyXTtcbiAgICAgICAgfSxcbiAgICAgICAgX3JldDI7XG4gICAgICBmb3IgKHZhciBfbWV0aG9kTmFtZTIgb2Ygc3RhdGljTmFtZXMpIHtcbiAgICAgICAgX3JldDIgPSBfbG9vcDUoX21ldGhvZE5hbWUyKTtcbiAgICAgICAgaWYgKF9yZXQyID09PSAwKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBfbG9vcDYgPSBmdW5jdGlvbiAoX21ldGhvZE5hbWUzKSB7XG4gICAgICAgICAgdmFyIG1hdGNoID0gX21ldGhvZE5hbWUzLm1hdGNoKHByZWZpeCk7XG4gICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2JlZm9yZSc6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19iZWZvcmUoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnYWZ0ZXInOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYWZ0ZXIoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYWxsSW5zdGFuY2VbX21ldGhvZE5hbWUzXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGFsbEluc3RhbmNlW19tZXRob2ROYW1lM10gPSBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdO1xuICAgICAgICB9LFxuICAgICAgICBfcmV0MztcbiAgICAgIGZvciAodmFyIF9tZXRob2ROYW1lMyBvZiBpbnN0YW5jZU5hbWVzKSB7XG4gICAgICAgIF9yZXQzID0gX2xvb3A2KF9tZXRob2ROYW1lMyk7XG4gICAgICAgIGlmIChfcmV0MyA9PT0gMCkgY29udGludWU7XG4gICAgICB9XG4gICAgfTtcbiAgICBmb3IgKHZhciBiYXNlID0gdGhpczsgYmFzZSAmJiBiYXNlLnByb3RvdHlwZTsgYmFzZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihiYXNlKSkge1xuICAgICAgX2xvb3AzKGJhc2UpO1xuICAgIH1cbiAgICBmb3IgKHZhciBtZXRob2ROYW1lIGluIGFsbFN0YXRpYykge1xuICAgICAgbWl4aW5Ub1ttZXRob2ROYW1lXSA9IGFsbFN0YXRpY1ttZXRob2ROYW1lXS5iaW5kKG1peGluVG8pO1xuICAgIH1cbiAgICB2YXIgX2xvb3A0ID0gZnVuY3Rpb24gKF9tZXRob2ROYW1lKSB7XG4gICAgICBtaXhpblRvLnByb3RvdHlwZVtfbWV0aG9kTmFtZV0gPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICByZXR1cm4gYWxsSW5zdGFuY2VbX21ldGhvZE5hbWVdLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfTtcbiAgICB9O1xuICAgIGZvciAodmFyIF9tZXRob2ROYW1lIGluIGFsbEluc3RhbmNlKSB7XG4gICAgICBfbG9vcDQoX21ldGhvZE5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gbWl4YWJsZTtcbiAgfVxufVxuZXhwb3J0cy5NaXhpbiA9IE1peGluO1xuTWl4aW4uQ29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1JvdXRlci5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUm91dGVyID0gdm9pZCAwO1xudmFyIF9WaWV3ID0gcmVxdWlyZShcIi4vVmlld1wiKTtcbnZhciBfQ2FjaGUgPSByZXF1aXJlKFwiLi9DYWNoZVwiKTtcbnZhciBfQ29uZmlnID0gcmVxdWlyZShcIi4vQ29uZmlnXCIpO1xudmFyIF9Sb3V0ZXMgPSByZXF1aXJlKFwiLi9Sb3V0ZXNcIik7XG52YXIgX3dpbiRDdXN0b21FdmVudDtcbnZhciBOb3RGb3VuZEVycm9yID0gU3ltYm9sKCdOb3RGb3VuZCcpO1xudmFyIEludGVybmFsRXJyb3IgPSBTeW1ib2woJ0ludGVybmFsJyk7XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbndpbi5DdXN0b21FdmVudCA9IChfd2luJEN1c3RvbUV2ZW50ID0gd2luLkN1c3RvbUV2ZW50KSAhPT0gbnVsbCAmJiBfd2luJEN1c3RvbUV2ZW50ICE9PSB2b2lkIDAgPyBfd2luJEN1c3RvbUV2ZW50IDogd2luLkV2ZW50O1xuY2xhc3MgUm91dGVyIHtcbiAgc3RhdGljIHdhaXQodmlldywgZXZlbnQgPSAnRE9NQ29udGVudExvYWRlZCcsIG5vZGUgPSBkb2N1bWVudCkge1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgKCkgPT4ge1xuICAgICAgdGhpcy5saXN0ZW4odmlldyk7XG4gICAgfSk7XG4gIH1cbiAgc3RhdGljIGxpc3RlbihsaXN0ZW5lciwgcm91dGVzID0gZmFsc2UpIHtcbiAgICB0aGlzLmxpc3RlbmVyID0gbGlzdGVuZXIgfHwgdGhpcy5saXN0ZW5lcjtcbiAgICB0aGlzLnJvdXRlcyA9IHJvdXRlcyB8fCBsaXN0ZW5lci5yb3V0ZXM7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLnF1ZXJ5LCB0aGlzLnF1ZXJ5T3Zlcih7fSkpO1xuICAgIHZhciBsaXN0ZW4gPSBldmVudCA9PiB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGV2ZW50LnN0YXRlICYmICdyb3V0ZWRJZCcgaW4gZXZlbnQuc3RhdGUpIHtcbiAgICAgICAgaWYgKGV2ZW50LnN0YXRlLnJvdXRlZElkIDw9IHRoaXMucm91dGVDb3VudCkge1xuICAgICAgICAgIHRoaXMuaGlzdG9yeS5zcGxpY2UoZXZlbnQuc3RhdGUucm91dGVkSWQpO1xuICAgICAgICAgIHRoaXMucm91dGVDb3VudCA9IGV2ZW50LnN0YXRlLnJvdXRlZElkO1xuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LnN0YXRlLnJvdXRlZElkID4gdGhpcy5yb3V0ZUNvdW50KSB7XG4gICAgICAgICAgdGhpcy5oaXN0b3J5LnB1c2goZXZlbnQuc3RhdGUucHJldik7XG4gICAgICAgICAgdGhpcy5yb3V0ZUNvdW50ID0gZXZlbnQuc3RhdGUucm91dGVkSWQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGV2ZW50LnN0YXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMucHJldlBhdGggIT09IG51bGwgJiYgdGhpcy5wcmV2UGF0aCAhPT0gbG9jYXRpb24ucGF0aG5hbWUpIHtcbiAgICAgICAgICB0aGlzLmhpc3RvcnkucHVzaCh0aGlzLnByZXZQYXRoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikpIHtcbiAgICAgICAgdGhpcy5tYXRjaChsb2NhdGlvbi5wYXRobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5tYXRjaCh0aGlzLm5leHRQYXRoLCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY3ZVcmxDaGFuZ2VkJywgbGlzdGVuKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBsaXN0ZW4pO1xuICAgIHZhciByb3V0ZSA9ICF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikgPyBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaCA6IGZhbHNlO1xuICAgIGlmICghdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pICYmIGxvY2F0aW9uLmhhc2gpIHtcbiAgICAgIHJvdXRlICs9IGxvY2F0aW9uLmhhc2g7XG4gICAgfVxuICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgIHJvdXRlZElkOiB0aGlzLnJvdXRlQ291bnQsXG4gICAgICB1cmw6IGxvY2F0aW9uLnBhdGhuYW1lLFxuICAgICAgcHJldjogdGhpcy5wcmV2UGF0aFxuICAgIH07XG4gICAgaWYgKCF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikpIHtcbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlLCBudWxsLCBsb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgfVxuICAgIHRoaXMuZ28ocm91dGUgIT09IGZhbHNlID8gcm91dGUgOiAnLycpO1xuICB9XG4gIHN0YXRpYyBnbyhwYXRoLCBzaWxlbnQgPSBmYWxzZSkge1xuICAgIHZhciBjb25maWdUaXRsZSA9IF9Db25maWcuQ29uZmlnLmdldCgndGl0bGUnKTtcbiAgICBpZiAoY29uZmlnVGl0bGUpIHtcbiAgICAgIGRvY3VtZW50LnRpdGxlID0gY29uZmlnVGl0bGU7XG4gICAgfVxuICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgIHJvdXRlZElkOiB0aGlzLnJvdXRlQ291bnQsXG4gICAgICBwcmV2OiB0aGlzLnByZXZQYXRoLFxuICAgICAgdXJsOiBsb2NhdGlvbi5wYXRobmFtZVxuICAgIH07XG4gICAgaWYgKHNpbGVudCA9PT0gLTEpIHtcbiAgICAgIHRoaXMubWF0Y2gocGF0aCwgdGhpcy5saXN0ZW5lciwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikpIHtcbiAgICAgIHRoaXMubmV4dFBhdGggPSBwYXRoO1xuICAgIH0gZWxzZSBpZiAoc2lsZW50ID09PSAyICYmIGxvY2F0aW9uLnBhdGhuYW1lICE9PSBwYXRoKSB7XG4gICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShzdGF0ZSwgbnVsbCwgcGF0aCk7XG4gICAgfSBlbHNlIGlmIChsb2NhdGlvbi5wYXRobmFtZSAhPT0gcGF0aCkge1xuICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoc3RhdGUsIG51bGwsIHBhdGgpO1xuICAgIH1cbiAgICBpZiAoIXNpbGVudCB8fCBzaWxlbnQgPCAwKSB7XG4gICAgICBpZiAoc2lsZW50ID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLnBhdGggPSBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgaWYgKHBhdGguc3Vic3RyaW5nKDAsIDEpID09PSAnIycpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgSGFzaENoYW5nZUV2ZW50KCdoYXNoY2hhbmdlJykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZVcmxDaGFuZ2VkJykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucHJldlBhdGggPSBwYXRoO1xuICB9XG4gIHN0YXRpYyBwcm9jZXNzUm91dGUocm91dGVzLCBzZWxlY3RlZCwgYXJncykge1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAodHlwZW9mIHJvdXRlc1tzZWxlY3RlZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChyb3V0ZXNbc2VsZWN0ZWRdLnByb3RvdHlwZSBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IHJvdXRlc1tzZWxlY3RlZF0oYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSByb3V0ZXNbc2VsZWN0ZWRdKGFyZ3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSByb3V0ZXNbc2VsZWN0ZWRdO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHN0YXRpYyBoYW5kbGVFcnJvcihlcnJvciwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgbGlzdGVuZXIsIHBhdGgsIHByZXYsIGZvcmNlUmVmcmVzaCkge1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZUVycm9yJywge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBlcnJvcixcbiAgICAgICAgICBwYXRoLFxuICAgICAgICAgIHByZXYsXG4gICAgICAgICAgdmlldzogbGlzdGVuZXIsXG4gICAgICAgICAgcm91dGVzLFxuICAgICAgICAgIHNlbGVjdGVkXG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHdpblsnZGV2TW9kZSddID8gJ1VuZXhwZWN0ZWQgZXJyb3I6ICcgKyBTdHJpbmcoZXJyb3IpIDogJ1VuZXhwZWN0ZWQgZXJyb3IuJztcbiAgICBpZiAocm91dGVzW0ludGVybmFsRXJyb3JdKSB7XG4gICAgICBhcmdzW0ludGVybmFsRXJyb3JdID0gZXJyb3I7XG4gICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NSb3V0ZShyb3V0ZXMsIEludGVybmFsRXJyb3IsIGFyZ3MpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpO1xuICB9XG4gIHN0YXRpYyBtYXRjaChwYXRoLCBsaXN0ZW5lciwgb3B0aW9ucyA9IGZhbHNlKSB7XG4gICAgdmFyIGV2ZW50ID0gbnVsbCxcbiAgICAgIHJlcXVlc3QgPSBudWxsLFxuICAgICAgZm9yY2VSZWZyZXNoID0gZmFsc2U7XG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIGZvcmNlUmVmcmVzaCA9IG9wdGlvbnM7XG4gICAgfVxuICAgIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yY2VSZWZyZXNoID0gb3B0aW9ucy5mb3JjZVJlZnJlc2g7XG4gICAgICBldmVudCA9IG9wdGlvbnMuZXZlbnQ7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHRoaXMucGF0aCA9PT0gcGF0aCAmJiAhZm9yY2VSZWZyZXNoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBvcmlnaW4gPSAnaHR0cDovL2V4YW1wbGUuY29tJztcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgb3JpZ2luID0gdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pID8gb3JpZ2luIDogbG9jYXRpb24ub3JpZ2luO1xuICAgICAgdGhpcy5xdWVyeVN0cmluZyA9IGxvY2F0aW9uLnNlYXJjaDtcbiAgICB9XG4gICAgdmFyIHVybCA9IG5ldyBVUkwocGF0aCwgb3JpZ2luKTtcbiAgICBwYXRoID0gdGhpcy5wYXRoID0gdXJsLnBhdGhuYW1lO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnF1ZXJ5U3RyaW5nID0gdXJsLnNlYXJjaDtcbiAgICB9XG4gICAgdmFyIHByZXYgPSB0aGlzLnByZXZQYXRoO1xuICAgIHZhciBjdXJyZW50ID0gbGlzdGVuZXIgJiYgbGlzdGVuZXIuYXJncyA/IGxpc3RlbmVyLmFyZ3MuY29udGVudCA6IG51bGw7XG4gICAgdmFyIHJvdXRlcyA9IHRoaXMucm91dGVzIHx8IGxpc3RlbmVyICYmIGxpc3RlbmVyLnJvdXRlcyB8fCBfUm91dGVzLlJvdXRlcy5kdW1wKCk7XG4gICAgdmFyIHF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh0aGlzLnF1ZXJ5U3RyaW5nKTtcbiAgICBpZiAoZXZlbnQgJiYgZXZlbnQucmVxdWVzdCkge1xuICAgICAgdGhpcy5yZXF1ZXN0ID0gZXZlbnQucmVxdWVzdDtcbiAgICB9XG4gICAgZm9yICh2YXIga2V5IGluIE9iamVjdC5rZXlzKHRoaXMucXVlcnkpKSB7XG4gICAgICBkZWxldGUgdGhpcy5xdWVyeVtrZXldO1xuICAgIH1cbiAgICBmb3IgKHZhciBbX2tleSwgdmFsdWVdIG9mIHF1ZXJ5KSB7XG4gICAgICB0aGlzLnF1ZXJ5W19rZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHZhciBhcmdzID0ge30sXG4gICAgICBzZWxlY3RlZCA9IGZhbHNlLFxuICAgICAgcmVzdWx0ID0gJyc7XG4gICAgaWYgKHBhdGguc3Vic3RyaW5nKDAsIDEpID09PSAnLycpIHtcbiAgICAgIHBhdGggPSBwYXRoLnN1YnN0cmluZygxKTtcbiAgICB9XG4gICAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucXVlcnkpIHtcbiAgICAgIGFyZ3NbaV0gPSB0aGlzLnF1ZXJ5W2ldO1xuICAgIH1cbiAgICBMMTogZm9yICh2YXIgX2kgaW4gcm91dGVzKSB7XG4gICAgICB2YXIgcm91dGUgPSBfaS5zcGxpdCgnLycpO1xuICAgICAgaWYgKHJvdXRlLmxlbmd0aCA8IHBhdGgubGVuZ3RoICYmIHJvdXRlW3JvdXRlLmxlbmd0aCAtIDFdICE9PSAnKicpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBMMjogZm9yICh2YXIgaiBpbiByb3V0ZSkge1xuICAgICAgICBpZiAocm91dGVbal0uc3Vic3RyKDAsIDEpID09ICclJykge1xuICAgICAgICAgIHZhciBhcmdOYW1lID0gbnVsbDtcbiAgICAgICAgICB2YXIgZ3JvdXBzID0gL14lKFxcdyspXFw/Py8uZXhlYyhyb3V0ZVtqXSk7XG4gICAgICAgICAgaWYgKGdyb3VwcyAmJiBncm91cHNbMV0pIHtcbiAgICAgICAgICAgIGFyZ05hbWUgPSBncm91cHNbMV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYXJnTmFtZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3JvdXRlW2pdfSBpcyBub3QgYSB2YWxpZCBhcmd1bWVudCBzZWdtZW50IGluIHJvdXRlIFwiJHtfaX1cImApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXBhdGhbal0pIHtcbiAgICAgICAgICAgIGlmIChyb3V0ZVtqXS5zdWJzdHIocm91dGVbal0ubGVuZ3RoIC0gMSwgMSkgPT0gJz8nKSB7XG4gICAgICAgICAgICAgIGFyZ3NbYXJnTmFtZV0gPSAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlIEwxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcmdzW2FyZ05hbWVdID0gcGF0aFtqXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocm91dGVbal0gIT09ICcqJyAmJiBwYXRoW2pdICE9PSByb3V0ZVtqXSkge1xuICAgICAgICAgIGNvbnRpbnVlIEwxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzZWxlY3RlZCA9IF9pO1xuICAgICAgcmVzdWx0ID0gcm91dGVzW19pXTtcbiAgICAgIGlmIChyb3V0ZVtyb3V0ZS5sZW5ndGggLSAxXSA9PT0gJyonKSB7XG4gICAgICAgIGFyZ3MucGF0aHBhcnRzID0gcGF0aC5zbGljZShyb3V0ZS5sZW5ndGggLSAxKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB2YXIgZXZlbnRTdGFydCA9IG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZVN0YXJ0Jywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBwYXRoLFxuICAgICAgICBwcmV2LFxuICAgICAgICByb290OiBsaXN0ZW5lcixcbiAgICAgICAgc2VsZWN0ZWQsXG4gICAgICAgIHJvdXRlc1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZiAoIWRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRTdGFydCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWZvcmNlUmVmcmVzaCAmJiBsaXN0ZW5lciAmJiBjdXJyZW50ICYmIHR5cGVvZiByZXN1bHQgPT09ICdvYmplY3QnICYmIGN1cnJlbnQuY29uc3RydWN0b3IgPT09IHJlc3VsdC5jb25zdHJ1Y3RvciAmJiAhKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpICYmIGN1cnJlbnQudXBkYXRlKGFyZ3MpKSB7XG4gICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQgPSBjdXJyZW50O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICghKHNlbGVjdGVkIGluIHJvdXRlcykpIHtcbiAgICAgIHJvdXRlc1tzZWxlY3RlZF0gPSByb3V0ZXNbTm90Rm91bmRFcnJvcl07XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NSb3V0ZShyb3V0ZXMsIHNlbGVjdGVkLCBhcmdzKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc1JvdXRlKHJvdXRlcywgTm90Rm91bmRFcnJvciwgYXJncyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAoIShyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgaWYgKCEocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0LnRoZW4ocmVhbFJlc3VsdCA9PiB0aGlzLnVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVhbFJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZUVycm9yKGVycm9yLCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBsaXN0ZW5lciwgcGF0aCwgcHJldiwgZm9yY2VSZWZyZXNoKTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmhhbmRsZUVycm9yKGVycm9yLCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBsaXN0ZW5lciwgcGF0aCwgcHJldiwgZm9yY2VSZWZyZXNoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIHVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpIHtcbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBwcmV2ID0gdGhpcy5wcmV2UGF0aDtcbiAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGUnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHJlc3VsdCxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcHJldixcbiAgICAgICAgdmlldzogbGlzdGVuZXIsXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgc2VsZWN0ZWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAocmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgaWYgKGxpc3RlbmVyLmFyZ3MuY29udGVudCBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50LnBhdXNlKHRydWUpO1xuICAgICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICBpZiAoZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcbiAgICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50ID0gcmVzdWx0O1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgcmVzdWx0LnBhdXNlKGZhbHNlKTtcbiAgICAgICAgcmVzdWx0LnVwZGF0ZShhcmdzLCBmb3JjZVJlZnJlc2gpO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZXZlbnRFbmQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGVFbmQnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHJlc3VsdCxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcHJldixcbiAgICAgICAgdmlldzogbGlzdGVuZXIsXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgc2VsZWN0ZWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50RW5kKTtcbiAgfVxuICBzdGF0aWMgaXNPcmlnaW5MaW1pdGVkKHtcbiAgICBvcmlnaW5cbiAgfSkge1xuICAgIHJldHVybiBvcmlnaW4gPT09ICdudWxsJyB8fCBvcmlnaW4gPT09ICdmaWxlOi8vJztcbiAgfVxuICBzdGF0aWMgcXVlcnlPdmVyKGFyZ3MgPSB7fSkge1xuICAgIHZhciBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgdmFyIGZpbmFsQXJncyA9IHt9O1xuICAgIHZhciBxdWVyeSA9IHt9O1xuICAgIGZvciAodmFyIHBhaXIgb2YgcGFyYW1zKSB7XG4gICAgICBxdWVyeVtwYWlyWzBdXSA9IHBhaXJbMV07XG4gICAgfVxuICAgIGZpbmFsQXJncyA9IE9iamVjdC5hc3NpZ24oZmluYWxBcmdzLCBxdWVyeSwgYXJncyk7XG4gICAgZGVsZXRlIGZpbmFsQXJnc1snYXBpJ107XG4gICAgcmV0dXJuIGZpbmFsQXJncztcblxuICAgIC8vIGZvcihsZXQgaSBpbiBxdWVyeSlcbiAgICAvLyB7XG4gICAgLy8gXHRmaW5hbEFyZ3NbaV0gPSBxdWVyeVtpXTtcbiAgICAvLyB9XG5cbiAgICAvLyBmb3IobGV0IGkgaW4gYXJncylcbiAgICAvLyB7XG4gICAgLy8gXHRmaW5hbEFyZ3NbaV0gPSBhcmdzW2ldO1xuICAgIC8vIH1cbiAgfVxuICBzdGF0aWMgcXVlcnlUb1N0cmluZyhhcmdzID0ge30sIGZyZXNoID0gZmFsc2UpIHtcbiAgICB2YXIgcGFydHMgPSBbXSxcbiAgICAgIGZpbmFsQXJncyA9IGFyZ3M7XG4gICAgaWYgKCFmcmVzaCkge1xuICAgICAgZmluYWxBcmdzID0gdGhpcy5xdWVyeU92ZXIoYXJncyk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gZmluYWxBcmdzKSB7XG4gICAgICBpZiAoZmluYWxBcmdzW2ldID09PSAnJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHBhcnRzLnB1c2goaSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChmaW5hbEFyZ3NbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oJyYnKTtcbiAgfVxuICBzdGF0aWMgc2V0UXVlcnkobmFtZSwgdmFsdWUsIHNpbGVudCkge1xuICAgIHZhciBhcmdzID0gdGhpcy5xdWVyeU92ZXIoKTtcbiAgICBhcmdzW25hbWVdID0gdmFsdWU7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGRlbGV0ZSBhcmdzW25hbWVdO1xuICAgIH1cbiAgICB2YXIgcXVlcnlTdHJpbmcgPSB0aGlzLnF1ZXJ5VG9TdHJpbmcoYXJncywgdHJ1ZSk7XG4gICAgdGhpcy5nbyhsb2NhdGlvbi5wYXRobmFtZSArIChxdWVyeVN0cmluZyA/ICc/JyArIHF1ZXJ5U3RyaW5nIDogJz8nKSwgc2lsZW50KTtcbiAgfVxufVxuZXhwb3J0cy5Sb3V0ZXIgPSBSb3V0ZXI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncXVlcnknLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiB7fVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAnaGlzdG9yeScsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IFtdXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdyb3V0ZUNvdW50Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiAwXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdwcmV2UGF0aCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogbnVsbFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncXVlcnlTdHJpbmcnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IG51bGxcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ0ludGVybmFsRXJyb3InLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBJbnRlcm5hbEVycm9yXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdOb3RGb3VuZEVycm9yJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogTm90Rm91bmRFcnJvclxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Sb3V0ZXMuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJvdXRlcyA9IHZvaWQgMDtcbnZhciBBcHBSb3V0ZXMgPSB7fTtcbnZhciBfcmVxdWlyZSA9IHJlcXVpcmU7XG52YXIgaW1wb3J0ZWQgPSBmYWxzZTtcbnZhciBydW5JbXBvcnQgPSAoKSA9PiB7XG4gIGlmIChpbXBvcnRlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICA7XG4gIHRyeSB7XG4gICAgT2JqZWN0LmFzc2lnbihBcHBSb3V0ZXMsIF9yZXF1aXJlKCdSb3V0ZXMnKS5Sb3V0ZXMgfHwge30pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGdsb2JhbFRoaXMuZGV2TW9kZSA9PT0gdHJ1ZSAmJiBjb25zb2xlLndhcm4oZXJyb3IpO1xuICB9XG4gIGltcG9ydGVkID0gdHJ1ZTtcbn07XG5jbGFzcyBSb3V0ZXMge1xuICBzdGF0aWMgZ2V0KG5hbWUpIHtcbiAgICBydW5JbXBvcnQoKTtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXNbbmFtZV07XG4gIH1cbiAgc3RhdGljIGR1bXAoKSB7XG4gICAgcnVuSW1wb3J0KCk7XG4gICAgcmV0dXJuIHRoaXMucm91dGVzO1xuICB9XG59XG5leHBvcnRzLlJvdXRlcyA9IFJvdXRlcztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXMsICdyb3V0ZXMnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBBcHBSb3V0ZXNcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvUnVsZVNldC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUnVsZVNldCA9IHZvaWQgMDtcbnZhciBfRG9tID0gcmVxdWlyZShcIi4vRG9tXCIpO1xudmFyIF9UYWcgPSByZXF1aXJlKFwiLi9UYWdcIik7XG52YXIgX1ZpZXcgPSByZXF1aXJlKFwiLi9WaWV3XCIpO1xuY2xhc3MgUnVsZVNldCB7XG4gIHN0YXRpYyBhZGQoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5nbG9iYWxSdWxlcyA9IHRoaXMuZ2xvYmFsUnVsZXMgfHwge307XG4gICAgdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0gPSB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXSB8fCBbXTtcbiAgICB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXS5wdXNoKGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBzdGF0aWMgYXBwbHkoZG9jID0gZG9jdW1lbnQsIHZpZXcgPSBudWxsKSB7XG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gdGhpcy5nbG9iYWxSdWxlcykge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXSkge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXVtpXTtcbiAgICAgICAgdmFyIHdyYXBwZWQgPSB0aGlzLndyYXAoZG9jLCBjYWxsYmFjaywgdmlldyk7XG4gICAgICAgIHZhciBub2RlcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZm9yICh2YXIgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgIHdyYXBwZWQobm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYWRkKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHRoaXMucnVsZXMgPSB0aGlzLnJ1bGVzIHx8IHt9O1xuICAgIHRoaXMucnVsZXNbc2VsZWN0b3JdID0gdGhpcy5ydWxlc1tzZWxlY3Rvcl0gfHwgW107XG4gICAgdGhpcy5ydWxlc1tzZWxlY3Rvcl0ucHVzaChjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgYXBwbHkoZG9jID0gZG9jdW1lbnQsIHZpZXcgPSBudWxsKSB7XG4gICAgUnVsZVNldC5hcHBseShkb2MsIHZpZXcpO1xuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIHRoaXMucnVsZXMpIHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5ydWxlc1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5ydWxlc1tzZWxlY3Rvcl1baV07XG4gICAgICAgIHZhciB3cmFwcGVkID0gUnVsZVNldC53cmFwKGRvYywgY2FsbGJhY2ssIHZpZXcpO1xuICAgICAgICB2YXIgbm9kZXMgPSBkb2MucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGZvciAodmFyIG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICB3cmFwcGVkKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHB1cmdlKCkge1xuICAgIGlmICghdGhpcy5ydWxlcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKHZhciBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5ydWxlcykpIHtcbiAgICAgIGlmICghdGhpcy5ydWxlc1trXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtrIGluIHRoaXMucnVsZXNba10pIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucnVsZXNba11ba2tdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBzdGF0aWMgd2FpdChldmVudCA9ICdET01Db250ZW50TG9hZGVkJywgbm9kZSA9IGRvY3VtZW50KSB7XG4gICAgdmFyIGxpc3RlbmVyID0gKChldmVudCwgbm9kZSkgPT4gKCkgPT4ge1xuICAgICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcy5hcHBseSgpO1xuICAgIH0pKGV2ZW50LCBub2RlKTtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcbiAgfVxuICBzdGF0aWMgd3JhcChkb2MsIG9yaWdpbmFsQ2FsbGJhY2ssIHZpZXcgPSBudWxsKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gb3JpZ2luYWxDYWxsYmFjaztcbiAgICBpZiAob3JpZ2luYWxDYWxsYmFjayBpbnN0YW5jZW9mIF9WaWV3LlZpZXcgfHwgb3JpZ2luYWxDYWxsYmFjayAmJiBvcmlnaW5hbENhbGxiYWNrLnByb3RvdHlwZSAmJiBvcmlnaW5hbENhbGxiYWNrLnByb3RvdHlwZSBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgIGNhbGxiYWNrID0gKCkgPT4gb3JpZ2luYWxDYWxsYmFjaztcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBlbGVtZW50Ll9fX2N2QXBwbGllZF9fXyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVsZW1lbnQsICdfX19jdkFwcGxpZWRfX18nLCB7XG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICAgIHZhbHVlOiBuZXcgV2Vha1NldCgpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGVsZW1lbnQuX19fY3ZBcHBsaWVkX19fLmhhcyhvcmlnaW5hbENhbGxiYWNrKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgZGlyZWN0LCBwYXJlbnRWaWV3O1xuICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgZGlyZWN0ID0gcGFyZW50VmlldyA9IHZpZXc7XG4gICAgICAgIGlmICh2aWV3LnZpZXdMaXN0KSB7XG4gICAgICAgICAgcGFyZW50VmlldyA9IHZpZXcudmlld0xpc3QucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgdGFnID0gbmV3IF9UYWcuVGFnKGVsZW1lbnQsIHBhcmVudFZpZXcsIG51bGwsIHVuZGVmaW5lZCwgZGlyZWN0KTtcbiAgICAgIHZhciBwYXJlbnQgPSB0YWcuZWxlbWVudC5wYXJlbnROb2RlO1xuICAgICAgdmFyIHNpYmxpbmcgPSB0YWcuZWxlbWVudC5uZXh0U2libGluZztcbiAgICAgIHZhciByZXN1bHQgPSBjYWxsYmFjayh0YWcpO1xuICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgZWxlbWVudC5fX19jdkFwcGxpZWRfX18uYWRkKG9yaWdpbmFsQ2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHJlc3VsdCA9IG5ldyBfVGFnLlRhZyhyZXN1bHQpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICAgIGlmICghcmVzdWx0LmVsZW1lbnQuY29udGFpbnModGFnLmVsZW1lbnQpKSB7XG4gICAgICAgICAgd2hpbGUgKHRhZy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5lbGVtZW50LmFwcGVuZENoaWxkKHRhZy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNpYmxpbmcpIHtcbiAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHJlc3VsdC5lbGVtZW50LCBzaWJsaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQocmVzdWx0LmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5wcm90b3R5cGUgJiYgcmVzdWx0LnByb3RvdHlwZSBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IHJlc3VsdCh7fSwgdmlldyk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgIHZpZXcuY2xlYW51cC5wdXNoKCgpID0+IHJlc3VsdC5yZW1vdmUoKSk7XG4gICAgICAgICAgdmlldy5jbGVhbnVwLnB1c2godmlldy5hcmdzLmJpbmRUbygodiwgaywgdCkgPT4ge1xuICAgICAgICAgICAgdFtrXSA9IHY7XG4gICAgICAgICAgICByZXN1bHQuYXJnc1trXSA9IHY7XG4gICAgICAgICAgfSkpO1xuICAgICAgICAgIHZpZXcuY2xlYW51cC5wdXNoKHJlc3VsdC5hcmdzLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgICAgdFtrXSA9IHY7XG4gICAgICAgICAgICB2aWV3LmFyZ3Nba10gPSB2O1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICB0YWcuY2xlYXIoKTtcbiAgICAgICAgcmVzdWx0LnJlbmRlcih0YWcuZWxlbWVudCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuZXhwb3J0cy5SdWxlU2V0ID0gUnVsZVNldDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1NldE1hcC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuU2V0TWFwID0gdm9pZCAwO1xuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KGUsIHIsIHQpIHsgcmV0dXJuIChyID0gX3RvUHJvcGVydHlLZXkocikpIGluIGUgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgciwgeyB2YWx1ZTogdCwgZW51bWVyYWJsZTogITAsIGNvbmZpZ3VyYWJsZTogITAsIHdyaXRhYmxlOiAhMCB9KSA6IGVbcl0gPSB0LCBlOyB9XG5mdW5jdGlvbiBfdG9Qcm9wZXJ0eUtleSh0KSB7IHZhciBpID0gX3RvUHJpbWl0aXZlKHQsIFwic3RyaW5nXCIpOyByZXR1cm4gXCJzeW1ib2xcIiA9PSB0eXBlb2YgaSA/IGkgOiBpICsgXCJcIjsgfVxuZnVuY3Rpb24gX3RvUHJpbWl0aXZlKHQsIHIpIHsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIHQgfHwgIXQpIHJldHVybiB0OyB2YXIgZSA9IHRbU3ltYm9sLnRvUHJpbWl0aXZlXTsgaWYgKHZvaWQgMCAhPT0gZSkgeyB2YXIgaSA9IGUuY2FsbCh0LCByIHx8IFwiZGVmYXVsdFwiKTsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIGkpIHJldHVybiBpOyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQEB0b1ByaW1pdGl2ZSBtdXN0IHJldHVybiBhIHByaW1pdGl2ZSB2YWx1ZS5cIik7IH0gcmV0dXJuIChcInN0cmluZ1wiID09PSByID8gU3RyaW5nIDogTnVtYmVyKSh0KTsgfVxuY2xhc3MgU2V0TWFwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgX2RlZmluZVByb3BlcnR5KHRoaXMsIFwiX21hcFwiLCBuZXcgTWFwKCkpO1xuICB9XG4gIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmhhcyhrZXkpO1xuICB9XG4gIGdldChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmdldChrZXkpO1xuICB9XG4gIGdldE9uZShrZXkpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy5nZXQoa2V5KTtcbiAgICBmb3IgKHZhciBlbnRyeSBvZiBzZXQpIHtcbiAgICAgIHJldHVybiBlbnRyeTtcbiAgICB9XG4gIH1cbiAgYWRkKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy5fbWFwLmdldChrZXkpO1xuICAgIGlmICghc2V0KSB7XG4gICAgICB0aGlzLl9tYXAuc2V0KGtleSwgc2V0ID0gbmV3IFNldCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHNldC5hZGQodmFsdWUpO1xuICB9XG4gIHJlbW92ZShrZXksIHZhbHVlKSB7XG4gICAgdmFyIHNldCA9IHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgICBpZiAoIXNldCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVzID0gc2V0LmRlbGV0ZSh2YWx1ZSk7XG4gICAgaWYgKCFzZXQuc2l6ZSkge1xuICAgICAgdGhpcy5fbWFwLmRlbGV0ZShrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG4gIHZhbHVlcygpIHtcbiAgICByZXR1cm4gbmV3IFNldCguLi5bLi4udGhpcy5fbWFwLnZhbHVlcygpXS5tYXAoc2V0ID0+IFsuLi5zZXQudmFsdWVzKCldKSk7XG4gIH1cbn1cbmV4cG9ydHMuU2V0TWFwID0gU2V0TWFwO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVGFnLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5UYWcgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgQ3VycmVudFN0eWxlID0gU3ltYm9sKCdDdXJyZW50U3R5bGUnKTtcbnZhciBDdXJyZW50QXR0cnMgPSBTeW1ib2woJ0N1cnJlbnRBdHRycycpO1xudmFyIHN0eWxlciA9IGZ1bmN0aW9uIChzdHlsZXMpIHtcbiAgaWYgKCF0aGlzLm5vZGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgZm9yICh2YXIgcHJvcGVydHkgaW4gc3R5bGVzKSB7XG4gICAgdmFyIHN0cmluZ2VkUHJvcGVydHkgPSBTdHJpbmcoc3R5bGVzW3Byb3BlcnR5XSk7XG4gICAgaWYgKHRoaXNbQ3VycmVudFN0eWxlXS5oYXMocHJvcGVydHkpICYmIHRoaXNbQ3VycmVudFN0eWxlXS5nZXQocHJvcGVydHkpID09PSBzdHlsZXNbcHJvcGVydHldIHx8IE51bWJlci5pc05hTihzdHlsZXNbcHJvcGVydHldKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChwcm9wZXJ0eVswXSA9PT0gJy0nKSB7XG4gICAgICB0aGlzLm5vZGUuc3R5bGUuc2V0UHJvcGVydHkocHJvcGVydHksIHN0cmluZ2VkUHJvcGVydHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm5vZGUuc3R5bGVbcHJvcGVydHldID0gc3RyaW5nZWRQcm9wZXJ0eTtcbiAgICB9XG4gICAgaWYgKHN0eWxlc1twcm9wZXJ0eV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLnNldChwcm9wZXJ0eSwgc3R5bGVzW3Byb3BlcnR5XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5kZWxldGUocHJvcGVydHkpO1xuICAgIH1cbiAgfVxufTtcbnZhciBnZXR0ZXIgPSBmdW5jdGlvbiAobmFtZSkge1xuICBpZiAodHlwZW9mIHRoaXNbbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpc1tuYW1lXTtcbiAgfVxuICBpZiAodGhpcy5ub2RlICYmIHR5cGVvZiB0aGlzLm5vZGVbbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpc1tuYW1lXSA9ICguLi5hcmdzKSA9PiB0aGlzLm5vZGVbbmFtZV0oLi4uYXJncyk7XG4gIH1cbiAgaWYgKG5hbWUgPT09ICdzdHlsZScpIHtcbiAgICByZXR1cm4gdGhpcy5wcm94eS5zdHlsZTtcbiAgfVxuICBpZiAodGhpcy5ub2RlICYmIG5hbWUgaW4gdGhpcy5ub2RlKSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZVtuYW1lXTtcbiAgfVxuICByZXR1cm4gdGhpc1tuYW1lXTtcbn07XG5jbGFzcyBUYWcge1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBwYXJlbnQsIHJlZiwgaW5kZXgsIGRpcmVjdCkge1xuICAgIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBzdWJkb2MgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChlbGVtZW50KTtcbiAgICAgIGVsZW1lbnQgPSBzdWJkb2MuZmlyc3RDaGlsZDtcbiAgICB9XG4gICAgdGhpcy5lbGVtZW50ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShlbGVtZW50KTtcbiAgICB0aGlzLm5vZGUgPSB0aGlzLmVsZW1lbnQ7XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5kaXJlY3QgPSBkaXJlY3Q7XG4gICAgdGhpcy5yZWYgPSByZWY7XG4gICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgIHRoaXMuY2xlYW51cCA9IFtdO1xuICAgIHRoaXNbX0JpbmRhYmxlLkJpbmRhYmxlLk9uQWxsR2V0XSA9IGdldHRlci5iaW5kKHRoaXMpO1xuICAgIHRoaXNbQ3VycmVudFN0eWxlXSA9IG5ldyBNYXAoKTtcbiAgICB0aGlzW0N1cnJlbnRBdHRyc10gPSBuZXcgTWFwKCk7XG4gICAgdmFyIGJvdW5kU3R5bGVyID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoc3R5bGVyLmJpbmQodGhpcykpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc3R5bGUnLCB7XG4gICAgICB2YWx1ZTogYm91bmRTdHlsZXJcbiAgICB9KTtcbiAgICB0aGlzLnByb3h5ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UodGhpcyk7XG4gICAgdGhpcy5wcm94eS5zdHlsZS5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgIGlmICh0aGlzW0N1cnJlbnRTdHlsZV0uaGFzKGspICYmIHRoaXNbQ3VycmVudFN0eWxlXS5nZXQoaykgPT09IHYpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5ub2RlLnN0eWxlW2tdID0gdjtcbiAgICAgIGlmICghZCAmJiB2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLnNldChrLCB2KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5kZWxldGUoayk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wcm94eS5iaW5kVG8oKHYsIGspID0+IHtcbiAgICAgIGlmIChrID09PSAnaW5kZXgnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChrIGluIGVsZW1lbnQgJiYgZWxlbWVudFtrXSAhPT0gdikge1xuICAgICAgICBlbGVtZW50W2tdID0gdjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5wcm94eTtcbiAgfVxuICBhdHRyKGF0dHJpYnV0ZXMpIHtcbiAgICBmb3IgKHZhciBhdHRyaWJ1dGUgaW4gYXR0cmlidXRlcykge1xuICAgICAgaWYgKHRoaXNbQ3VycmVudEF0dHJzXS5oYXMoYXR0cmlidXRlKSAmJiBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLm5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gICAgICAgIHRoaXNbQ3VycmVudEF0dHJzXS5kZWxldGUoYXR0cmlidXRlKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXNbQ3VycmVudEF0dHJzXS5oYXMoYXR0cmlidXRlKSB8fCB0aGlzW0N1cnJlbnRBdHRyc10uZ2V0KGF0dHJpYnV0ZSkgIT09IGF0dHJpYnV0ZXNbYXR0cmlidXRlXSkge1xuICAgICAgICBpZiAoYXR0cmlidXRlc1thdHRyaWJ1dGVdID09PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5ub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsICcnKTtcbiAgICAgICAgICB0aGlzW0N1cnJlbnRBdHRyc10uc2V0KGF0dHJpYnV0ZSwgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubm9kZS5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pO1xuICAgICAgICAgIHRoaXNbQ3VycmVudEF0dHJzXS5zZXQoYXR0cmlidXRlLCBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHJlbW92ZSgpIHtcbiAgICBpZiAodGhpcy5ub2RlKSB7XG4gICAgICB0aGlzLm5vZGUucmVtb3ZlKCk7XG4gICAgfVxuICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMpO1xuICAgIHZhciBjbGVhbnVwO1xuICAgIHdoaWxlIChjbGVhbnVwID0gdGhpcy5jbGVhbnVwLnNoaWZ0KCkpIHtcbiAgICAgIGNsZWFudXAoKTtcbiAgICB9XG4gICAgdGhpcy5jbGVhcigpO1xuICAgIGlmICghdGhpcy5ub2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkZXRhY2hFdmVudCA9IG5ldyBFdmVudCgnY3ZEb21EZXRhY2hlZCcpO1xuICAgIHRoaXMubm9kZS5kaXNwYXRjaEV2ZW50KGRldGFjaEV2ZW50KTtcbiAgICB0aGlzLm5vZGUgPSB0aGlzLmVsZW1lbnQgPSB0aGlzLnJlZiA9IHRoaXMucGFyZW50ID0gdW5kZWZpbmVkO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIGlmICghdGhpcy5ub2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkZXRhY2hFdmVudCA9IG5ldyBFdmVudCgnY3ZEb21EZXRhY2hlZCcpO1xuICAgIHdoaWxlICh0aGlzLm5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy5ub2RlLmZpcnN0Q2hpbGQuZGlzcGF0Y2hFdmVudChkZXRhY2hFdmVudCk7XG4gICAgICB0aGlzLm5vZGUucmVtb3ZlQ2hpbGQodGhpcy5ub2RlLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgfVxuICBwYXVzZShwYXVzZWQgPSB0cnVlKSB7fVxuICBsaXN0ZW4oZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIHZhciBub2RlID0gdGhpcy5ub2RlO1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB2YXIgcmVtb3ZlID0gKCkgPT4ge1xuICAgICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdmFyIHJlbW92ZXIgPSAoKSA9PiB7XG4gICAgICByZW1vdmUoKTtcbiAgICAgIHJlbW92ZSA9ICgpID0+IGNvbnNvbGUud2FybignQWxyZWFkeSByZW1vdmVkIScpO1xuICAgIH07XG4gICAgdGhpcy5wYXJlbnQub25SZW1vdmUoKCkgPT4gcmVtb3ZlcigpKTtcbiAgICByZXR1cm4gcmVtb3ZlcjtcbiAgfVxufVxuZXhwb3J0cy5UYWcgPSBUYWc7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9VdWlkLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5VdWlkID0gdm9pZCAwO1xuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KGUsIHIsIHQpIHsgcmV0dXJuIChyID0gX3RvUHJvcGVydHlLZXkocikpIGluIGUgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgciwgeyB2YWx1ZTogdCwgZW51bWVyYWJsZTogITAsIGNvbmZpZ3VyYWJsZTogITAsIHdyaXRhYmxlOiAhMCB9KSA6IGVbcl0gPSB0LCBlOyB9XG5mdW5jdGlvbiBfdG9Qcm9wZXJ0eUtleSh0KSB7IHZhciBpID0gX3RvUHJpbWl0aXZlKHQsIFwic3RyaW5nXCIpOyByZXR1cm4gXCJzeW1ib2xcIiA9PSB0eXBlb2YgaSA/IGkgOiBpICsgXCJcIjsgfVxuZnVuY3Rpb24gX3RvUHJpbWl0aXZlKHQsIHIpIHsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIHQgfHwgIXQpIHJldHVybiB0OyB2YXIgZSA9IHRbU3ltYm9sLnRvUHJpbWl0aXZlXTsgaWYgKHZvaWQgMCAhPT0gZSkgeyB2YXIgaSA9IGUuY2FsbCh0LCByIHx8IFwiZGVmYXVsdFwiKTsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIGkpIHJldHVybiBpOyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQEB0b1ByaW1pdGl2ZSBtdXN0IHJldHVybiBhIHByaW1pdGl2ZSB2YWx1ZS5cIik7IH0gcmV0dXJuIChcInN0cmluZ1wiID09PSByID8gU3RyaW5nIDogTnVtYmVyKSh0KTsgfVxudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG52YXIgY3J5cHRvID0gd2luLmNyeXB0bztcbmNsYXNzIFV1aWQge1xuICBjb25zdHJ1Y3Rvcih1dWlkID0gbnVsbCwgdmVyc2lvbiA9IDQpIHtcbiAgICBfZGVmaW5lUHJvcGVydHkodGhpcywgXCJ1dWlkXCIsIG51bGwpO1xuICAgIF9kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInZlcnNpb25cIiwgNCk7XG4gICAgaWYgKHV1aWQpIHtcbiAgICAgIGlmICh0eXBlb2YgdXVpZCAhPT0gJ3N0cmluZycgJiYgISh1dWlkIGluc3RhbmNlb2YgVXVpZCkgfHwgIXV1aWQubWF0Y2goL1swLTlBLUZhLWZdezh9KC1bMC05QS1GYS1mXXs0fSl7M30tWzAtOUEtRmEtZl17MTJ9LykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGlucHV0IGZvciBVdWlkOiBcIiR7dXVpZH1cImApO1xuICAgICAgfVxuICAgICAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgIHRoaXMudXVpZCA9IHV1aWQ7XG4gICAgfSBlbHNlIGlmIChjcnlwdG8gJiYgdHlwZW9mIGNyeXB0by5yYW5kb21VVUlEID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnV1aWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaW5pdCA9IFsxZTddICsgLTFlMyArIC00ZTMgKyAtOGUzICsgLTFlMTE7XG4gICAgICB2YXIgcmFuZCA9IGNyeXB0byAmJiB0eXBlb2YgY3J5cHRvLnJhbmRvbVVVSUQgPT09ICdmdW5jdGlvbicgPyAoKSA9PiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50OEFycmF5KDEpKVswXSA6ICgpID0+IE1hdGgudHJ1bmMoTWF0aC5yYW5kb20oKSAqIDI1Nik7XG4gICAgICB0aGlzLnV1aWQgPSBpbml0LnJlcGxhY2UoL1swMThdL2csIGMgPT4gKGMgXiByYW5kKCkgJiAxNSA+PiBjIC8gNCkudG9TdHJpbmcoMTYpKTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfVxuICBbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHtcbiAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICB9XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnV1aWQ7XG4gIH1cbiAgdG9Kc29uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB2ZXJzaW9uOiB0aGlzLnZlcnNpb24sXG4gICAgICB1dWlkOiB0aGlzLnV1aWRcbiAgICB9O1xuICB9XG59XG5leHBvcnRzLlV1aWQgPSBVdWlkO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVmlldy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVmlldyA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBfVmlld0xpc3QgPSByZXF1aXJlKFwiLi9WaWV3TGlzdFwiKTtcbnZhciBfUm91dGVyID0gcmVxdWlyZShcIi4vUm91dGVyXCIpO1xudmFyIF9VdWlkID0gcmVxdWlyZShcIi4vVXVpZFwiKTtcbnZhciBfRG9tID0gcmVxdWlyZShcIi4vRG9tXCIpO1xudmFyIF9UYWcgPSByZXF1aXJlKFwiLi9UYWdcIik7XG52YXIgX0JhZyA9IHJlcXVpcmUoXCIuL0JhZ1wiKTtcbnZhciBfUnVsZVNldCA9IHJlcXVpcmUoXCIuL1J1bGVTZXRcIik7XG52YXIgX01peGluID0gcmVxdWlyZShcIi4vTWl4aW5cIik7XG52YXIgX0V2ZW50VGFyZ2V0TWl4aW4gPSByZXF1aXJlKFwiLi4vbWl4aW4vRXZlbnRUYXJnZXRNaXhpblwiKTtcbnZhciBkb250UGFyc2UgPSBTeW1ib2woJ2RvbnRQYXJzZScpO1xudmFyIGV4cGFuZEJpbmQgPSBTeW1ib2woJ2V4cGFuZEJpbmQnKTtcbnZhciB1dWlkID0gU3ltYm9sKCd1dWlkJyk7XG5jbGFzcyBWaWV3IGV4dGVuZHMgX01peGluLk1peGluLndpdGgoX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbikge1xuICBnZXQgX2lkKCkge1xuICAgIHJldHVybiB0aGlzW3V1aWRdO1xuICB9XG4gIHN0YXRpYyBmcm9tKHRlbXBsYXRlLCBhcmdzID0ge30sIG1haW5WaWV3ID0gbnVsbCkge1xuICAgIHZhciB2aWV3ID0gbmV3IHRoaXMoYXJncywgbWFpblZpZXcpO1xuICAgIHZpZXcudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICByZXR1cm4gdmlldztcbiAgfVxuICBjb25zdHJ1Y3RvcihhcmdzID0ge30sIG1haW5WaWV3ID0gbnVsbCkge1xuICAgIHN1cGVyKGFyZ3MsIG1haW5WaWV3KTtcbiAgICB0aGlzW19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IG1haW5WaWV3O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnYXJncycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZShhcmdzKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCB1dWlkLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jb25zdHJ1Y3Rvci51dWlkKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ25vZGVzQXR0YWNoZWQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9CYWcuQmFnKChpLCBzLCBhKSA9PiB7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ25vZGVzRGV0YWNoZWQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9CYWcuQmFnKChpLCBzLCBhKSA9PiB7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19vblJlbW92ZScsIHtcbiAgICAgIHZhbHVlOiBuZXcgX0JhZy5CYWcoKGksIHMsIGEpID0+IHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY2xlYW51cCcsIHtcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncGFyZW50Jywge1xuICAgICAgdmFsdWU6IG1haW5WaWV3LFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ZpZXdzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndmlld0xpc3RzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2l0aFZpZXdzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndGFncycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ25vZGVzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKFtdKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndGltZW91dHMnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdpbnRlcnZhbHMnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdmcmFtZXMnLCB7XG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3J1bGVTZXQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9SdWxlU2V0LlJ1bGVTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlUnVsZVNldCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX1J1bGVTZXQuUnVsZVNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdzdWJCaW5kaW5ncycsIHtcbiAgICAgIHZhbHVlOiB7fVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndGVtcGxhdGVzJywge1xuICAgICAgdmFsdWU6IHt9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwb3N0TWFwcGluZycsIHtcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2V2ZW50Q2xlYW51cCcsIHtcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndW5wYXVzZUNhbGxiYWNrcycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ludGVycG9sYXRlUmVnZXgnLCB7XG4gICAgICB2YWx1ZTogLyhcXFtcXFsoKD86XFwkKyk/W1xcd1xcLlxcfC1dKylcXF1cXF0pL2dcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbmRlcmVkJywge1xuICAgICAgdmFsdWU6IG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCkgPT4gT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZW5kZXJDb21wbGV0ZScsIHtcbiAgICAgICAgdmFsdWU6IGFjY2VwdFxuICAgICAgfSkpXG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICBpZiAoIXRoaXNbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXNbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gbnVsbDtcbiAgICB9KTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSB0aGlzO1xuICAgIHRoaXMudGVtcGxhdGUgPSBgYDtcbiAgICB0aGlzLmZpcnN0Tm9kZSA9IG51bGw7XG4gICAgdGhpcy5sYXN0Tm9kZSA9IG51bGw7XG4gICAgdGhpcy52aWV3TGlzdCA9IG51bGw7XG4gICAgdGhpcy5tYWluVmlldyA9IG51bGw7XG4gICAgdGhpcy5wcmVzZXJ2ZSA9IGZhbHNlO1xuICAgIHRoaXMucmVtb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMubG9hZGVkID0gUHJvbWlzZS5yZXNvbHZlKHRoaXMpO1xuXG4gICAgLy8gcmV0dXJuIEJpbmRhYmxlLm1ha2UodGhpcyk7XG4gIH1cbiAgc3RhdGljIGlzVmlldygpIHtcbiAgICByZXR1cm4gVmlldztcbiAgfVxuICBvbkZyYW1lKGNhbGxiYWNrKSB7XG4gICAgdmFyIHN0b3BwZWQgPSBmYWxzZTtcbiAgICB2YXIgY2FuY2VsID0gKCkgPT4ge1xuICAgICAgc3RvcHBlZCA9IHRydWU7XG4gICAgfTtcbiAgICB2YXIgYyA9IHRpbWVzdGFtcCA9PiB7XG4gICAgICBpZiAodGhpcy5yZW1vdmVkIHx8IHN0b3BwZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgICAgICBjYWxsYmFjayhEYXRlLm5vdygpKTtcbiAgICAgIH1cbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShjKTtcbiAgICB9O1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjKERhdGUubm93KCkpKTtcbiAgICB0aGlzLmZyYW1lcy5wdXNoKGNhbmNlbCk7XG4gICAgcmV0dXJuIGNhbmNlbDtcbiAgfVxuICBvbk5leHRGcmFtZShjYWxsYmFjaykge1xuICAgIHJldHVybiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSkpO1xuICB9XG4gIG9uSWRsZShjYWxsYmFjaykge1xuICAgIHJldHVybiByZXF1ZXN0SWRsZUNhbGxiYWNrKCgpID0+IGNhbGxiYWNrKERhdGUubm93KCkpKTtcbiAgfVxuICBvblRpbWVvdXQodGltZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgdGltZW91dEluZm8gPSB7XG4gICAgICB0aW1lb3V0OiBudWxsLFxuICAgICAgY2FsbGJhY2s6IG51bGwsXG4gICAgICB0aW1lOiB0aW1lLFxuICAgICAgZmlyZWQ6IGZhbHNlLFxuICAgICAgY3JlYXRlZDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICBwYXVzZWQ6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgd3JhcHBlZENhbGxiYWNrID0gKCkgPT4ge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICAgIHRpbWVvdXRJbmZvLmZpcmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICAgIH07XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHdyYXBwZWRDYWxsYmFjaywgdGltZSk7XG4gICAgdGltZW91dEluZm8uY2FsbGJhY2sgPSB3cmFwcGVkQ2FsbGJhY2s7XG4gICAgdGltZW91dEluZm8udGltZW91dCA9IHRpbWVvdXQ7XG4gICAgdGhpcy50aW1lb3V0cy5zZXQodGltZW91dEluZm8udGltZW91dCwgdGltZW91dEluZm8pO1xuICAgIHJldHVybiB0aW1lb3V0O1xuICB9XG4gIGNsZWFyVGltZW91dCh0aW1lb3V0KSB7XG4gICAgaWYgKCF0aGlzLnRpbWVvdXRzLmhhcyh0aW1lb3V0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dEluZm8gPSB0aGlzLnRpbWVvdXRzLmdldCh0aW1lb3V0KTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dEluZm8udGltZW91dCk7XG4gICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dEluZm8udGltZW91dCk7XG4gIH1cbiAgb25JbnRlcnZhbCh0aW1lLCBjYWxsYmFjaykge1xuICAgIHZhciB0aW1lb3V0ID0gc2V0SW50ZXJ2YWwoY2FsbGJhY2ssIHRpbWUpO1xuICAgIHRoaXMuaW50ZXJ2YWxzLnNldCh0aW1lb3V0LCB7XG4gICAgICB0aW1lb3V0OiB0aW1lb3V0LFxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgdGltZTogdGltZSxcbiAgICAgIHBhdXNlZDogZmFsc2VcbiAgICB9KTtcbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxuICBjbGVhckludGVydmFsKHRpbWVvdXQpIHtcbiAgICBpZiAoIXRoaXMuaW50ZXJ2YWxzLmhhcyh0aW1lb3V0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dEluZm8gPSB0aGlzLmludGVydmFscy5nZXQodGltZW91dCk7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICAgIHRoaXMuaW50ZXJ2YWxzLmRlbGV0ZSh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgfVxuICBwYXVzZShwYXVzZWQgPSB1bmRlZmluZWQpIHtcbiAgICBpZiAocGF1c2VkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucGF1c2VkID0gIXRoaXMucGF1c2VkO1xuICAgIH1cbiAgICB0aGlzLnBhdXNlZCA9IHBhdXNlZDtcbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgIGZvciAodmFyIFtjYWxsYmFjaywgdGltZW91dF0gb2YgdGhpcy50aW1lb3V0cykge1xuICAgICAgICBpZiAodGltZW91dC5maXJlZCkge1xuICAgICAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXQudGltZW91dCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQudGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgdGltZW91dC50aW1lID0gTWF0aC5tYXgoMCwgdGltZW91dC50aW1lIC0gKERhdGUubm93KCkgLSB0aW1lb3V0LmNyZWF0ZWQpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIFtfY2FsbGJhY2ssIF90aW1lb3V0XSBvZiB0aGlzLmludGVydmFscykge1xuICAgICAgICBjbGVhckludGVydmFsKF90aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgICBfdGltZW91dC5wYXVzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBbX2NhbGxiYWNrMiwgX3RpbWVvdXQyXSBvZiB0aGlzLnRpbWVvdXRzKSB7XG4gICAgICAgIGlmICghX3RpbWVvdXQyLnBhdXNlZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChfdGltZW91dDIuZmlyZWQpIHtcbiAgICAgICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZShfdGltZW91dDIudGltZW91dCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgX3RpbWVvdXQyLnRpbWVvdXQgPSBzZXRUaW1lb3V0KF90aW1lb3V0Mi5jYWxsYmFjaywgX3RpbWVvdXQyLnRpbWUpO1xuICAgICAgICBfdGltZW91dDIucGF1c2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBbX2NhbGxiYWNrMywgX3RpbWVvdXQzXSBvZiB0aGlzLmludGVydmFscykge1xuICAgICAgICBpZiAoIV90aW1lb3V0My5wYXVzZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBfdGltZW91dDMudGltZW91dCA9IHNldEludGVydmFsKF90aW1lb3V0My5jYWxsYmFjaywgX3RpbWVvdXQzLnRpbWUpO1xuICAgICAgICBfdGltZW91dDMucGF1c2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBbLCBfY2FsbGJhY2s0XSBvZiB0aGlzLnVucGF1c2VDYWxsYmFja3MpIHtcbiAgICAgICAgX2NhbGxiYWNrNCgpO1xuICAgICAgfVxuICAgICAgdGhpcy51bnBhdXNlQ2FsbGJhY2tzLmNsZWFyKCk7XG4gICAgfVxuICAgIGZvciAodmFyIFt0YWcsIHZpZXdMaXN0XSBvZiB0aGlzLnZpZXdMaXN0cykge1xuICAgICAgdmlld0xpc3QucGF1c2UoISFwYXVzZWQpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMudGFncykge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy50YWdzW2ldKSkge1xuICAgICAgICBmb3IgKHZhciBqIGluIHRoaXMudGFnc1tpXSkge1xuICAgICAgICAgIHRoaXMudGFnc1tpXVtqXS5wYXVzZSghIXBhdXNlZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB0aGlzLnRhZ3NbaV0ucGF1c2UoISFwYXVzZWQpO1xuICAgIH1cbiAgfVxuICByZW5kZXIocGFyZW50Tm9kZSA9IG51bGwsIGluc2VydFBvaW50ID0gbnVsbCwgb3V0ZXJWaWV3ID0gbnVsbCkge1xuICAgIHZhciB7XG4gICAgICBkb2N1bWVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICBpZiAocGFyZW50Tm9kZSBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgIHBhcmVudE5vZGUgPSBwYXJlbnROb2RlLmZpcnN0Tm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICBpZiAoaW5zZXJ0UG9pbnQgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICBpbnNlcnRQb2ludCA9IGluc2VydFBvaW50LmZpcnN0Tm9kZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmlyc3ROb2RlKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZVJlbmRlcihwYXJlbnROb2RlLCBpbnNlcnRQb2ludCwgb3V0ZXJWaWV3KTtcbiAgICB9XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVuZGVyJykpO1xuICAgIHZhciB0ZW1wbGF0ZUlzRnJhZ21lbnQgPSB0eXBlb2YgdGhpcy50ZW1wbGF0ZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHRoaXMudGVtcGxhdGUuY2xvbmVOb2RlID09PSAnZnVuY3Rpb24nO1xuICAgIHZhciB0ZW1wbGF0ZVBhcnNlZCA9IHRlbXBsYXRlSXNGcmFnbWVudCB8fCBWaWV3LnRlbXBsYXRlcy5oYXModGhpcy50ZW1wbGF0ZSk7XG4gICAgdmFyIHN1YkRvYztcbiAgICBpZiAodGVtcGxhdGVQYXJzZWQpIHtcbiAgICAgIGlmICh0ZW1wbGF0ZUlzRnJhZ21lbnQpIHtcbiAgICAgICAgc3ViRG9jID0gdGhpcy50ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWJEb2MgPSBWaWV3LnRlbXBsYXRlcy5nZXQodGhpcy50ZW1wbGF0ZSkuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdWJEb2MgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCh0aGlzLnRlbXBsYXRlKTtcbiAgICB9XG4gICAgaWYgKCF0ZW1wbGF0ZVBhcnNlZCAmJiAhdGVtcGxhdGVJc0ZyYWdtZW50KSB7XG4gICAgICBWaWV3LnRlbXBsYXRlcy5zZXQodGhpcy50ZW1wbGF0ZSwgc3ViRG9jLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgfVxuICAgIHRoaXMubWFpblZpZXcgfHwgdGhpcy5wcmVSdWxlU2V0LmFwcGx5KHN1YkRvYywgdGhpcyk7XG4gICAgdGhpcy5tYXBUYWdzKHN1YkRvYyk7XG4gICAgdGhpcy5tYWluVmlldyB8fCB0aGlzLnJ1bGVTZXQuYXBwbHkoc3ViRG9jLCB0aGlzKTtcbiAgICBpZiAoZ2xvYmFsVGhpcy5kZXZNb2RlID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmZpcnN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoYFRlbXBsYXRlICR7dGhpcy5faWR9IFN0YXJ0YCk7XG4gICAgICB0aGlzLmxhc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChgVGVtcGxhdGUgJHt0aGlzLl9pZH0gRW5kYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZmlyc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgdGhpcy5sYXN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICB9XG4gICAgdGhpcy5ub2Rlcy5wdXNoKHRoaXMuZmlyc3ROb2RlLCAuLi5BcnJheS5mcm9tKHN1YkRvYy5jaGlsZE5vZGVzKSwgdGhpcy5sYXN0Tm9kZSk7XG4gICAgdGhpcy5wb3N0UmVuZGVyKHBhcmVudE5vZGUpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbmRlcmVkJykpO1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEF0dGFjaCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICBpZiAoaW5zZXJ0UG9pbnQpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIG51bGwpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN1YkRvYywgdGhpcy5sYXN0Tm9kZSk7XG4gICAgICB2YXIgcm9vdE5vZGUgPSBwYXJlbnROb2RlLmdldFJvb3ROb2RlKCk7XG4gICAgICBpZiAocm9vdE5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSwgb3V0ZXJWaWV3KTtcbiAgICAgIH0gZWxzZSBpZiAob3V0ZXJWaWV3KSB7XG4gICAgICAgIHZhciBmaXJzdERvbUF0dGFjaCA9IGV2ZW50ID0+IHtcbiAgICAgICAgICB2YXIgcm9vdE5vZGUgPSBwYXJlbnROb2RlLmdldFJvb3ROb2RlKCk7XG4gICAgICAgICAgdGhpcy5hdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICAgICAgdGhpcy5kaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlLCBvdXRlclZpZXcpO1xuICAgICAgICAgIG91dGVyVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdhdHRhY2hlZCcsIGZpcnN0RG9tQXR0YWNoKTtcbiAgICAgICAgfTtcbiAgICAgICAgb3V0ZXJWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2F0dGFjaGVkJywgZmlyc3REb21BdHRhY2gpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJlbmRlckNvbXBsZXRlKHRoaXMubm9kZXMpO1xuICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICB9XG4gIGRpc3BhdGNoQXR0YWNoKCkge1xuICAgIHZhciB7XG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYXR0YWNoJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIHRhcmdldDogdGhpc1xuICAgIH0pKTtcbiAgfVxuICBkaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlLCB2aWV3ID0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIHtcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2F0dGFjaGVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgbm9kZTogcGFyZW50Tm9kZSxcbiAgICAgICAgcm9vdDogcm9vdE5vZGUsXG4gICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICB9XG4gICAgfSkpO1xuICAgIHRoaXMuZGlzcGF0Y2hEb21BdHRhY2hlZCh2aWV3KTtcbiAgICBmb3IgKHZhciBjYWxsYmFjayBvZiB0aGlzLm5vZGVzQXR0YWNoZWQuaXRlbXMoKSkge1xuICAgICAgY2FsbGJhY2socm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgIH1cbiAgfVxuICBkaXNwYXRjaERvbUF0dGFjaGVkKHZpZXcpIHtcbiAgICB2YXIge1xuICAgICAgTm9kZSxcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHRoaXMubm9kZXMuZmlsdGVyKG4gPT4gbi5ub2RlVHlwZSAhPT0gTm9kZS5DT01NRU5UX05PREUpLmZvckVhY2goY2hpbGQgPT4ge1xuICAgICAgaWYgKCFjaGlsZC5tYXRjaGVzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNoaWxkLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkRvbUF0dGFjaGVkJywge1xuICAgICAgICB0YXJnZXQ6IGNoaWxkLFxuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgICAgX0RvbS5Eb20ubWFwVGFncyhjaGlsZCwgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgICBpZiAoIXRhZy5tYXRjaGVzKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZEb21BdHRhY2hlZCcsIHtcbiAgICAgICAgICB0YXJnZXQ6IHRhZyxcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZVJlbmRlcihwYXJlbnROb2RlLCBpbnNlcnRQb2ludCwgb3V0ZXJWaWV3KSB7XG4gICAgdmFyIHtcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHZhciB3aWxsUmVSZW5kZXIgPSB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZVJlbmRlcicpLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgdGFyZ2V0OiB0aGlzLFxuICAgICAgdmlldzogb3V0ZXJWaWV3XG4gICAgfSk7XG4gICAgaWYgKCF3aWxsUmVSZW5kZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHN1YkRvYyA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgaWYgKHRoaXMuZmlyc3ROb2RlLmlzQ29ubmVjdGVkKSB7XG4gICAgICB2YXIgZGV0YWNoID0gdGhpcy5ub2Rlc0RldGFjaGVkLml0ZW1zKCk7XG4gICAgICBmb3IgKHZhciBpIGluIGRldGFjaCkge1xuICAgICAgICBkZXRhY2hbaV0oKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3ViRG9jLmFwcGVuZCguLi50aGlzLm5vZGVzKTtcbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgaWYgKGluc2VydFBvaW50KSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBudWxsKTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgbnVsbCk7XG4gICAgICB9XG4gICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShzdWJEb2MsIHRoaXMubGFzdE5vZGUpO1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVSZW5kZXJlZCcpLCB7XG4gICAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICAgIHRhcmdldDogdGhpcyxcbiAgICAgICAgdmlldzogb3V0ZXJWaWV3XG4gICAgICB9KTtcbiAgICAgIHZhciByb290Tm9kZSA9IHBhcmVudE5vZGUuZ2V0Um9vdE5vZGUoKTtcbiAgICAgIGlmIChyb290Tm9kZS5pc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLmF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9kZXM7XG4gIH1cbiAgbWFwVGFncyhzdWJEb2MpIHtcbiAgICBfRG9tLkRvbS5tYXBUYWdzKHN1YkRvYywgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgaWYgKHRhZ1tkb250UGFyc2VdKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0YWcubWF0Y2hlcykge1xuICAgICAgICB0YWcgPSB0aGlzLm1hcEludGVycG9sYXRhYmxlVGFnKHRhZyk7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtdGVtcGxhdGVdJykgJiYgdGhpcy5tYXBUZW1wbGF0ZVRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1zbG90XScpICYmIHRoaXMubWFwU2xvdFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1wcmVyZW5kZXJdJykgJiYgdGhpcy5tYXBQcmVuZGVyZXJUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtbGlua10nKSAmJiB0aGlzLm1hcExpbmtUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtYXR0cl0nKSAmJiB0aGlzLm1hcEF0dHJUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtZXhwYW5kXScpICYmIHRoaXMubWFwRXhwYW5kYWJsZVRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1yZWZdJykgJiYgdGhpcy5tYXBSZWZUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytb25dJykgJiYgdGhpcy5tYXBPblRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1lYWNoXScpICYmIHRoaXMubWFwRWFjaFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1iaW5kXScpICYmIHRoaXMubWFwQmluZFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi13aXRoXScpICYmIHRoaXMubWFwV2l0aFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1pZl0nKSAmJiB0aGlzLm1hcElmVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXZpZXddJykgJiYgdGhpcy5tYXBWaWV3VGFnKHRhZykgfHwgdGFnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFnID0gdGhpcy5tYXBJbnRlcnBvbGF0YWJsZVRhZyh0YWcpO1xuICAgICAgfVxuICAgICAgaWYgKHRhZyAhPT0gd2Fsa2VyLmN1cnJlbnROb2RlKSB7XG4gICAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHRhZztcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnBvc3RNYXBwaW5nLmZvckVhY2goYyA9PiBjKCkpO1xuICB9XG4gIG1hcEV4cGFuZGFibGVUYWcodGFnKSB7XG4gICAgLy8gY29uc3QgdGFnQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVFeHBhbmRhYmxlVGFnKHRhZyk7XG4gICAgLy8gY29uc3QgbmV3VGFnID0gdGFnQ29tcGlsZXIodGhpcyk7XG4gICAgLy8gdGFnLnJlcGxhY2VXaXRoKG5ld1RhZyk7XG4gICAgLy8gcmV0dXJuIG5ld1RhZztcblxuICAgIHZhciBleGlzdGluZyA9IHRhZ1tleHBhbmRCaW5kXTtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGV4aXN0aW5nKCk7XG4gICAgICB0YWdbZXhwYW5kQmluZF0gPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIFtwcm94eSwgZXhwYW5kUHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUodGhpcy5hcmdzLCB0YWcuZ2V0QXR0cmlidXRlKCdjdi1leHBhbmQnKSwgdHJ1ZSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG4gICAgaWYgKCFwcm94eVtleHBhbmRQcm9wZXJ0eV0pIHtcbiAgICAgIHByb3h5W2V4cGFuZFByb3BlcnR5XSA9IHt9O1xuICAgIH1cbiAgICBwcm94eVtleHBhbmRQcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUubWFrZShwcm94eVtleHBhbmRQcm9wZXJ0eV0pO1xuICAgIHRoaXMub25SZW1vdmUodGFnW2V4cGFuZEJpbmRdID0gcHJveHlbZXhwYW5kUHJvcGVydHldLmJpbmRUbygodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgaWYgKGQgfHwgdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoaywgdik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh2ID09PSBudWxsKSB7XG4gICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoaywgJycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0YWcuc2V0QXR0cmlidXRlKGssIHYpO1xuICAgIH0pKTtcblxuICAgIC8vIGxldCBleHBhbmRQcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuICAgIC8vIGxldCBleHBhbmRBcmcgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUoXG4gICAgLy8gXHR0aGlzLmFyZ3NbZXhwYW5kUHJvcGVydHldIHx8IHt9XG4gICAgLy8gKTtcblxuICAgIC8vIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuXG4gICAgLy8gZm9yKGxldCBpIGluIGV4cGFuZEFyZylcbiAgICAvLyB7XG4gICAgLy8gXHRpZihpID09PSAnbmFtZScgfHwgaSA9PT0gJ3R5cGUnKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRjb250aW51ZTtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0bGV0IGRlYmluZCA9IGV4cGFuZEFyZy5iaW5kVG8oaSwgKCh0YWcsaSk9Pih2KT0+e1xuICAgIC8vIFx0XHR0YWcuc2V0QXR0cmlidXRlKGksIHYpO1xuICAgIC8vIFx0fSkodGFnLGkpKTtcblxuICAgIC8vIFx0dGhpcy5vblJlbW92ZSgoKT0+e1xuICAgIC8vIFx0XHRkZWJpbmQoKTtcbiAgICAvLyBcdFx0aWYoZXhwYW5kQXJnLmlzQm91bmQoKSlcbiAgICAvLyBcdFx0e1xuICAgIC8vIFx0XHRcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3MoZXhwYW5kQXJnKTtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0fSk7XG4gICAgLy8gfVxuXG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIGNvbXBpbGVFeHBhbmRhYmxlVGFnKHNvdXJjZVRhZylcbiAgLy8ge1xuICAvLyBcdHJldHVybiAoYmluZGluZ1ZpZXcpID0+IHtcblxuICAvLyBcdFx0Y29uc3QgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSh0cnVlKTtcblxuICAvLyBcdFx0bGV0IGV4cGFuZFByb3BlcnR5ID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG4gIC8vIFx0XHRsZXQgZXhwYW5kQXJnID0gQmluZGFibGUubWFrZShcbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcuYXJnc1tleHBhbmRQcm9wZXJ0eV0gfHwge31cbiAgLy8gXHRcdCk7XG5cbiAgLy8gXHRcdHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuXG4gIC8vIFx0XHRmb3IobGV0IGkgaW4gZXhwYW5kQXJnKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRpZihpID09PSAnbmFtZScgfHwgaSA9PT0gJ3R5cGUnKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0Y29udGludWU7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRsZXQgZGViaW5kID0gZXhwYW5kQXJnLmJpbmRUbyhpLCAoKHRhZyxpKT0+KHYpPT57XG4gIC8vIFx0XHRcdFx0dGFnLnNldEF0dHJpYnV0ZShpLCB2KTtcbiAgLy8gXHRcdFx0fSkodGFnLGkpKTtcblxuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5vblJlbW92ZSgoKT0+e1xuICAvLyBcdFx0XHRcdGRlYmluZCgpO1xuICAvLyBcdFx0XHRcdGlmKGV4cGFuZEFyZy5pc0JvdW5kKCkpXG4gIC8vIFx0XHRcdFx0e1xuICAvLyBcdFx0XHRcdFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyhleHBhbmRBcmcpO1xuICAvLyBcdFx0XHRcdH1cbiAgLy8gXHRcdFx0fSk7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdHJldHVybiB0YWc7XG4gIC8vIFx0fTtcbiAgLy8gfVxuXG4gIG1hcEF0dHJUYWcodGFnKSB7XG4gICAgdmFyIHRhZ0NvbXBpbGVyID0gdGhpcy5jb21waWxlQXR0clRhZyh0YWcpO1xuICAgIHZhciBuZXdUYWcgPSB0YWdDb21waWxlcih0aGlzKTtcbiAgICB0YWcucmVwbGFjZVdpdGgobmV3VGFnKTtcbiAgICByZXR1cm4gbmV3VGFnO1xuXG4gICAgLy8gbGV0IGF0dHJQcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcblxuICAgIC8vIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcblxuICAgIC8vIGxldCBwYWlycyA9IGF0dHJQcm9wZXJ0eS5zcGxpdCgnLCcpO1xuICAgIC8vIGxldCBhdHRycyA9IHBhaXJzLm1hcCgocCkgPT4gcC5zcGxpdCgnOicpKTtcblxuICAgIC8vIGZvciAobGV0IGkgaW4gYXR0cnMpXG4gICAgLy8ge1xuICAgIC8vIFx0bGV0IHByb3h5ICAgICAgICA9IHRoaXMuYXJncztcbiAgICAvLyBcdGxldCBiaW5kUHJvcGVydHkgPSBhdHRyc1tpXVsxXTtcbiAgICAvLyBcdGxldCBwcm9wZXJ0eSAgICAgPSBiaW5kUHJvcGVydHk7XG5cbiAgICAvLyBcdGlmKGJpbmRQcm9wZXJ0eS5tYXRjaCgvXFwuLykpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdFtwcm94eSwgcHJvcGVydHldID0gQmluZGFibGUucmVzb2x2ZShcbiAgICAvLyBcdFx0XHR0aGlzLmFyZ3NcbiAgICAvLyBcdFx0XHQsIGJpbmRQcm9wZXJ0eVxuICAgIC8vIFx0XHRcdCwgdHJ1ZVxuICAgIC8vIFx0XHQpO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRsZXQgYXR0cmliID0gYXR0cnNbaV1bMF07XG5cbiAgICAvLyBcdHRoaXMub25SZW1vdmUocHJveHkuYmluZFRvKFxuICAgIC8vIFx0XHRwcm9wZXJ0eVxuICAgIC8vIFx0XHQsICh2KT0+e1xuICAgIC8vIFx0XHRcdGlmKHYgPT0gbnVsbClcbiAgICAvLyBcdFx0XHR7XG4gICAgLy8gXHRcdFx0XHR0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgJycpO1xuICAgIC8vIFx0XHRcdFx0cmV0dXJuO1xuICAgIC8vIFx0XHRcdH1cbiAgICAvLyBcdFx0XHR0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgdik7XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdCkpO1xuICAgIC8vIH1cblxuICAgIC8vIHJldHVybiB0YWc7XG4gIH1cbiAgY29tcGlsZUF0dHJUYWcoc291cmNlVGFnKSB7XG4gICAgdmFyIGF0dHJQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcbiAgICB2YXIgcGFpcnMgPSBhdHRyUHJvcGVydHkuc3BsaXQoL1ssO10vKTtcbiAgICB2YXIgYXR0cnMgPSBwYWlycy5tYXAocCA9PiBwLnNwbGl0KCc6JykpO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcbiAgICByZXR1cm4gYmluZGluZ1ZpZXcgPT4ge1xuICAgICAgdmFyIHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBiaW5kUHJvcGVydHkgPSBhdHRyc1tpXVsxXSB8fCBhdHRyc1tpXVswXTtcbiAgICAgICAgdmFyIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoYmluZGluZ1ZpZXcuYXJncywgYmluZFByb3BlcnR5LCB0cnVlKTtcbiAgICAgICAgdmFyIGF0dHJpYiA9IGF0dHJzW2ldWzBdO1xuICAgICAgICBiaW5kaW5nVmlldy5vblJlbW92ZShwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgaWYgKGQgfHwgdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YWcucmVtb3ZlQXR0cmlidXRlKGF0dHJpYiwgdik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2ID09PSBudWxsKSB7XG4gICAgICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgJycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgdik7XG4gICAgICAgIH0pKTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBpIGluIGF0dHJzKSB7XG4gICAgICAgIF9sb29wKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGFnO1xuICAgIH07XG4gIH1cbiAgbWFwSW50ZXJwb2xhdGFibGVUYWcodGFnKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgcmVnZXggPSB0aGlzLmludGVycG9sYXRlUmVnZXg7XG4gICAgdmFyIHtcbiAgICAgIE5vZGUsXG4gICAgICBkb2N1bWVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICBpZiAodGFnLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xuICAgICAgdmFyIG9yaWdpbmFsID0gdGFnLm5vZGVWYWx1ZTtcbiAgICAgIGlmICghdGhpcy5pbnRlcnBvbGF0YWJsZShvcmlnaW5hbCkpIHtcbiAgICAgICAgcmV0dXJuIHRhZztcbiAgICAgIH1cbiAgICAgIHZhciBoZWFkZXIgPSAwO1xuICAgICAgdmFyIG1hdGNoO1xuICAgICAgdmFyIF9sb29wMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgYmluZFByb3BlcnR5ID0gbWF0Y2hbMl07XG4gICAgICAgICAgdmFyIHVuc2FmZUh0bWwgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgdW5zYWZlVmlldyA9IGZhbHNlO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eVNwbGl0ID0gYmluZFByb3BlcnR5LnNwbGl0KCd8Jyk7XG4gICAgICAgICAgdmFyIHRyYW5zZm9ybWVyID0gZmFsc2U7XG4gICAgICAgICAgaWYgKHByb3BlcnR5U3BsaXQubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdHJhbnNmb3JtZXIgPSBfdGhpcy5zdHJpbmdUcmFuc2Zvcm1lcihwcm9wZXJ0eVNwbGl0LnNsaWNlKDEpKTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IHByb3BlcnR5U3BsaXRbMF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkuc3Vic3RyKDAsIDIpID09PSAnJCQnKSB7XG4gICAgICAgICAgICB1bnNhZmVIdG1sID0gdHJ1ZTtcbiAgICAgICAgICAgIHVuc2FmZVZpZXcgPSB0cnVlO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gYmluZFByb3BlcnR5LnN1YnN0cigyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgICAgICAgdW5zYWZlSHRtbCA9IHRydWU7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBiaW5kUHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5LnN1YnN0cigwLCAzKSA9PT0gJzAwMCcpIHtcbiAgICAgICAgICAgIGV4cGFuZCA9IHRydWU7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBiaW5kUHJvcGVydHkuc3Vic3RyKDMpO1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzdGF0aWNQcmVmaXggPSBvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyLCBtYXRjaC5pbmRleCk7XG4gICAgICAgICAgaGVhZGVyID0gbWF0Y2guaW5kZXggKyBtYXRjaFsxXS5sZW5ndGg7XG4gICAgICAgICAgdmFyIHN0YXRpY05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdGF0aWNQcmVmaXgpO1xuICAgICAgICAgIHN0YXRpY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN0YXRpY05vZGUsIHRhZyk7XG4gICAgICAgICAgdmFyIGR5bmFtaWNOb2RlO1xuICAgICAgICAgIGlmICh1bnNhZmVIdG1sKSB7XG4gICAgICAgICAgICBkeW5hbWljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkeW5hbWljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZHluYW1pY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICAgICAgdmFyIHByb3h5ID0gX3RoaXMuYXJncztcbiAgICAgICAgICB2YXIgcHJvcGVydHkgPSBiaW5kUHJvcGVydHk7XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5tYXRjaCgvXFwuLykpIHtcbiAgICAgICAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoX3RoaXMuYXJncywgYmluZFByb3BlcnR5LCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGR5bmFtaWNOb2RlLCB0YWcpO1xuICAgICAgICAgIGlmICh0eXBlb2YgcHJveHkgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZXR1cm4gMTsgLy8gYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJveHkgPSBfQmluZGFibGUuQmluZGFibGUubWFrZShwcm94eSk7XG4gICAgICAgICAgdmFyIGRlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQpID0+IHtcbiAgICAgICAgICAgIGlmICh0W2tdICE9PSB2ICYmICh0W2tdIGluc3RhbmNlb2YgVmlldyB8fCB0W2tdIGluc3RhbmNlb2YgTm9kZSB8fCB0W2tdIGluc3RhbmNlb2YgX1RhZy5UYWcpKSB7XG4gICAgICAgICAgICAgIGlmICghdFtrXS5wcmVzZXJ2ZSkge1xuICAgICAgICAgICAgICAgIHRba10ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh1bnNhZmVWaWV3ICYmICEodiBpbnN0YW5jZW9mIFZpZXcpKSB7XG4gICAgICAgICAgICAgIHZhciB1bnNhZmVUZW1wbGF0ZSA9IHYgIT09IG51bGwgJiYgdiAhPT0gdm9pZCAwID8gdiA6ICcnO1xuICAgICAgICAgICAgICB2ID0gbmV3IFZpZXcoX3RoaXMuYXJncywgX3RoaXMpO1xuICAgICAgICAgICAgICB2LnRlbXBsYXRlID0gdW5zYWZlVGVtcGxhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIpIHtcbiAgICAgICAgICAgICAgdiA9IHRyYW5zZm9ybWVyKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICB2W19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IF90aGlzO1xuICAgICAgICAgICAgICB2LnJlbmRlcih0YWcucGFyZW50Tm9kZSwgZHluYW1pY05vZGUsIF90aGlzKTtcbiAgICAgICAgICAgICAgdmFyIGNsZWFudXAgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF2LnByZXNlcnZlKSB7XG4gICAgICAgICAgICAgICAgICB2LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgX3RoaXMub25SZW1vdmUoY2xlYW51cCk7XG4gICAgICAgICAgICAgIHYub25SZW1vdmUoKCkgPT4gX3RoaXMuX29uUmVtb3ZlLnJlbW92ZShjbGVhbnVwKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodiwgZHluYW1pY05vZGUpO1xuICAgICAgICAgICAgICBfdGhpcy5vblJlbW92ZSgoKSA9PiB2LnJlbW92ZSgpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICBpZiAodi5ub2RlKSB7XG4gICAgICAgICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHYubm9kZSwgZHluYW1pY05vZGUpO1xuICAgICAgICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKCgpID0+IHYucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHYucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgT2JqZWN0ICYmIHYuX190b1N0cmluZyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdiA9IHYuX190b1N0cmluZygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICh1bnNhZmVIdG1sKSB7XG4gICAgICAgICAgICAgICAgZHluYW1pY05vZGUuaW5uZXJIVE1MID0gdjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSB2O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkeW5hbWljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBfdGhpcy5vblJlbW92ZShkZWJpbmQpO1xuICAgICAgICB9LFxuICAgICAgICBfcmV0O1xuICAgICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhvcmlnaW5hbCkpIHtcbiAgICAgICAgX3JldCA9IF9sb29wMigpO1xuICAgICAgICBpZiAoX3JldCA9PT0gMCkgY29udGludWU7XG4gICAgICAgIGlmIChfcmV0ID09PSAxKSBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhciBzdGF0aWNTdWZmaXggPSBvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyKTtcbiAgICAgIHZhciBzdGF0aWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RhdGljU3VmZml4KTtcbiAgICAgIHN0YXRpY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3RhdGljTm9kZSwgdGFnKTtcbiAgICAgIHRhZy5ub2RlVmFsdWUgPSAnJztcbiAgICB9IGVsc2UgaWYgKHRhZy5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgIHZhciBfbG9vcDMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghX3RoaXMuaW50ZXJwb2xhdGFibGUodGFnLmF0dHJpYnV0ZXNbaV0udmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGhlYWRlciA9IDA7XG4gICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gdGFnLmF0dHJpYnV0ZXNbaV0udmFsdWU7XG4gICAgICAgIHZhciBhdHRyaWJ1dGUgPSB0YWcuYXR0cmlidXRlc1tpXTtcbiAgICAgICAgdmFyIGJpbmRQcm9wZXJ0aWVzID0ge307XG4gICAgICAgIHZhciBzZWdtZW50cyA9IFtdO1xuICAgICAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKG9yaWdpbmFsKSkge1xuICAgICAgICAgIHNlZ21lbnRzLnB1c2gob3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlciwgbWF0Y2guaW5kZXgpKTtcbiAgICAgICAgICBpZiAoIWJpbmRQcm9wZXJ0aWVzW21hdGNoWzJdXSkge1xuICAgICAgICAgICAgYmluZFByb3BlcnRpZXNbbWF0Y2hbMl1dID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGJpbmRQcm9wZXJ0aWVzW21hdGNoWzJdXS5wdXNoKHNlZ21lbnRzLmxlbmd0aCk7XG4gICAgICAgICAgc2VnbWVudHMucHVzaChtYXRjaFsxXSk7XG4gICAgICAgICAgaGVhZGVyID0gbWF0Y2guaW5kZXggKyBtYXRjaFsxXS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgc2VnbWVudHMucHVzaChvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyKSk7XG4gICAgICAgIHZhciBfbG9vcDQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHByb3h5ID0gX3RoaXMuYXJncztcbiAgICAgICAgICB2YXIgcHJvcGVydHkgPSBqO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eVNwbGl0ID0gai5zcGxpdCgnfCcpO1xuICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IGZhbHNlO1xuICAgICAgICAgIHZhciBsb25nUHJvcGVydHkgPSBqO1xuICAgICAgICAgIGlmIChwcm9wZXJ0eVNwbGl0Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyID0gX3RoaXMuc3RyaW5nVHJhbnNmb3JtZXIocHJvcGVydHlTcGxpdC5zbGljZSgxKSk7XG4gICAgICAgICAgICBwcm9wZXJ0eSA9IHByb3BlcnR5U3BsaXRbMF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwcm9wZXJ0eS5tYXRjaCgvXFwuLykpIHtcbiAgICAgICAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoX3RoaXMuYXJncywgcHJvcGVydHksIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbWF0Y2hpbmcgPSBbXTtcbiAgICAgICAgICB2YXIgYmluZFByb3BlcnR5ID0gajtcbiAgICAgICAgICB2YXIgbWF0Y2hpbmdTZWdtZW50cyA9IGJpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV07XG4gICAgICAgICAgX3RoaXMub25SZW1vdmUocHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyKSB7XG4gICAgICAgICAgICAgIHYgPSB0cmFuc2Zvcm1lcih2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIF9pIGluIGJpbmRQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgIGZvciAodmFyIF9qIGluIGJpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV0pIHtcbiAgICAgICAgICAgICAgICBzZWdtZW50c1tiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldW19qXV0gPSB0W19pXTtcbiAgICAgICAgICAgICAgICBpZiAoayA9PT0gcHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgIHNlZ21lbnRzW2JpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV1bX2pdXSA9IHY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV90aGlzLnBhdXNlZCkge1xuICAgICAgICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBzZWdtZW50cy5qb2luKCcnKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBfdGhpcy51bnBhdXNlQ2FsbGJhY2tzLnNldChhdHRyaWJ1dGUsICgpID0+IHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLm5hbWUsIHNlZ21lbnRzLmpvaW4oJycpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9O1xuICAgICAgICBmb3IgKHZhciBqIGluIGJpbmRQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgX2xvb3A0KCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZy5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChfbG9vcDMoKSkgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwUmVmVGFnKHRhZykge1xuICAgIHZhciByZWZBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtcmVmJyk7XG4gICAgdmFyIFtyZWZQcm9wLCByZWZDbGFzc25hbWUgPSBudWxsLCByZWZLZXkgPSBudWxsXSA9IHJlZkF0dHIuc3BsaXQoJzonKTtcbiAgICB2YXIgcmVmQ2xhc3MgPSBfVGFnLlRhZztcbiAgICBpZiAocmVmQ2xhc3NuYW1lKSB7XG4gICAgICByZWZDbGFzcyA9IHRoaXMuc3RyaW5nVG9DbGFzcyhyZWZDbGFzc25hbWUpO1xuICAgIH1cbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1yZWYnKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFnLCAnX19fdGFnX19fJywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgdGFnLl9fX3RhZ19fXyA9IG51bGw7XG4gICAgICB0YWcucmVtb3ZlKCk7XG4gICAgfSk7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgdmFyIGRpcmVjdCA9IHRoaXM7XG4gICAgaWYgKHRoaXMudmlld0xpc3QpIHtcbiAgICAgIHBhcmVudCA9IHRoaXMudmlld0xpc3QucGFyZW50O1xuICAgICAgLy8gaWYoIXRoaXMudmlld0xpc3QucGFyZW50LnRhZ3NbcmVmUHJvcF0pXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHRoaXMudmlld0xpc3QucGFyZW50LnRhZ3NbcmVmUHJvcF0gPSBbXTtcbiAgICAgIC8vIH1cblxuICAgICAgLy8gbGV0IHJlZktleVZhbCA9IHRoaXMuYXJnc1tyZWZLZXldO1xuXG4gICAgICAvLyB0aGlzLnZpZXdMaXN0LnBhcmVudC50YWdzW3JlZlByb3BdW3JlZktleVZhbF0gPSBuZXcgcmVmQ2xhc3MoXG4gICAgICAvLyBcdHRhZywgdGhpcywgcmVmUHJvcCwgcmVmS2V5VmFsXG4gICAgICAvLyApO1xuICAgIH1cbiAgICAvLyBlbHNlXG4gICAgLy8ge1xuICAgIC8vIFx0dGhpcy50YWdzW3JlZlByb3BdID0gbmV3IHJlZkNsYXNzKFxuICAgIC8vIFx0XHR0YWcsIHRoaXMsIHJlZlByb3BcbiAgICAvLyBcdCk7XG4gICAgLy8gfVxuXG4gICAgdmFyIHRhZ09iamVjdCA9IG5ldyByZWZDbGFzcyh0YWcsIHRoaXMsIHJlZlByb3AsIHVuZGVmaW5lZCwgZGlyZWN0KTtcbiAgICB0YWcuX19fdGFnX19fID0gdGFnT2JqZWN0O1xuICAgIHRoaXMudGFnc1tyZWZQcm9wXSA9IHRhZ09iamVjdDtcbiAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICB2YXIgcmVmS2V5VmFsID0gdGhpcy5hcmdzW3JlZktleV07XG4gICAgICBpZiAocmVmS2V5VmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKCFwYXJlbnQudGFnc1tyZWZQcm9wXSkge1xuICAgICAgICAgIHBhcmVudC50YWdzW3JlZlByb3BdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50LnRhZ3NbcmVmUHJvcF1bcmVmS2V5VmFsXSA9IHRhZ09iamVjdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudC50YWdzW3JlZlByb3BdID0gdGFnT2JqZWN0O1xuICAgICAgfVxuICAgICAgaWYgKCFwYXJlbnQucGFyZW50KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICB9XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBCaW5kVGFnKHRhZykge1xuICAgIHZhciBiaW5kQXJnID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtYmluZCcpO1xuICAgIHZhciBwcm94eSA9IHRoaXMuYXJncztcbiAgICB2YXIgcHJvcGVydHkgPSBiaW5kQXJnO1xuICAgIHZhciB0b3AgPSBudWxsO1xuICAgIGlmIChiaW5kQXJnLm1hdGNoKC9cXC4vKSkge1xuICAgICAgW3Byb3h5LCBwcm9wZXJ0eSwgdG9wXSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKHRoaXMuYXJncywgYmluZEFyZywgdHJ1ZSk7XG4gICAgfVxuICAgIGlmIChwcm94eSAhPT0gdGhpcy5hcmdzKSB7XG4gICAgICB0aGlzLnN1YkJpbmRpbmdzW2JpbmRBcmddID0gdGhpcy5zdWJCaW5kaW5nc1tiaW5kQXJnXSB8fCBbXTtcbiAgICAgIHRoaXMub25SZW1vdmUodGhpcy5hcmdzLmJpbmRUbyh0b3AsICgpID0+IHtcbiAgICAgICAgd2hpbGUgKHRoaXMuc3ViQmluZGluZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5zdWJCaW5kaW5ncy5zaGlmdCgpKCk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgdmFyIHVuc2FmZUh0bWwgPSBmYWxzZTtcbiAgICBpZiAocHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgIHByb3BlcnR5ID0gcHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgdW5zYWZlSHRtbCA9IHRydWU7XG4gICAgfVxuICAgIHZhciBhdXRvRXZlbnRTdGFydGVkID0gZmFsc2U7XG4gICAgdmFyIGRlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgIGlmICgocCBpbnN0YW5jZW9mIFZpZXcgfHwgcCBpbnN0YW5jZW9mIE5vZGUgfHwgcCBpbnN0YW5jZW9mIF9UYWcuVGFnKSAmJiBwICE9PSB2KSB7XG4gICAgICAgIHAucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICBpZiAoWydJTlBVVCcsICdTRUxFQ1QnLCAnVEVYVEFSRUEnXS5pbmNsdWRlcyh0YWcudGFnTmFtZSkpIHtcbiAgICAgICAgdmFyIF90eXBlID0gdGFnLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgICAgICBpZiAoX3R5cGUgJiYgX3R5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgIHRhZy5jaGVja2VkID0gISF2O1xuICAgICAgICB9IGVsc2UgaWYgKF90eXBlICYmIF90eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICB0YWcuY2hlY2tlZCA9IHYgPT0gdGFnLnZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKF90eXBlICE9PSAnZmlsZScpIHtcbiAgICAgICAgICBpZiAodGFnLnRhZ05hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0T3B0aW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZy5vcHRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvbiA9IHRhZy5vcHRpb25zW2ldO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb24udmFsdWUgPT0gdikge1xuICAgICAgICAgICAgICAgICAgdGFnLnNlbGVjdGVkSW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNlbGVjdE9wdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5ub2Rlc0F0dGFjaGVkLmFkZChzZWxlY3RPcHRpb24pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YWcudmFsdWUgPSB2ID09IG51bGwgPyAnJyA6IHY7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChhdXRvRXZlbnRTdGFydGVkKSB7XG4gICAgICAgICAgdGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkF1dG9DaGFuZ2VkJywge1xuICAgICAgICAgICAgYnViYmxlczogdHJ1ZVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICBhdXRvRXZlbnRTdGFydGVkID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh2IGluc3RhbmNlb2YgVmlldykge1xuICAgICAgICAgIGZvciAodmFyIG5vZGUgb2YgdGFnLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gdGhpcztcbiAgICAgICAgICB2LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgdGFnLmluc2VydCh2KTtcbiAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgICAgICB0YWcuYXBwZW5kKHYubm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodW5zYWZlSHRtbCkge1xuICAgICAgICAgIGlmICh0YWcuaW5uZXJIVE1MICE9PSB2KSB7XG4gICAgICAgICAgICB2ID0gU3RyaW5nKHYpO1xuICAgICAgICAgICAgaWYgKHRhZy5pbm5lckhUTUwgPT09IHYuc3Vic3RyaW5nKDAsIHRhZy5pbm5lckhUTUwubGVuZ3RoKSkge1xuICAgICAgICAgICAgICB0YWcuaW5uZXJIVE1MICs9IHYuc3Vic3RyaW5nKHRhZy5pbm5lckhUTUwubGVuZ3RoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvciAodmFyIF9ub2RlIG9mIHRhZy5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgX25vZGUucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdGFnLmlubmVySFRNTCA9IHY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfRG9tLkRvbS5tYXBUYWdzKHRhZywgZmFsc2UsIHQgPT4gdFtkb250UGFyc2VdID0gdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0YWcudGV4dENvbnRlbnQgIT09IHYpIHtcbiAgICAgICAgICAgIGZvciAodmFyIF9ub2RlMiBvZiB0YWcuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICBfbm9kZTIucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0YWcudGV4dENvbnRlbnQgPSB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChwcm94eSAhPT0gdGhpcy5hcmdzKSB7XG4gICAgICB0aGlzLnN1YkJpbmRpbmdzW2JpbmRBcmddLnB1c2goZGViaW5kKTtcbiAgICB9XG4gICAgdGhpcy5vblJlbW92ZShkZWJpbmQpO1xuICAgIHZhciB0eXBlID0gdGFnLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgIHZhciBtdWx0aSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ211bHRpcGxlJyk7XG4gICAgdmFyIGlucHV0TGlzdGVuZXIgPSBldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnQudGFyZ2V0ICE9PSB0YWcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGUgJiYgdHlwZS50b0xvd2VyQ2FzZSgpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgIGlmICh0YWcuY2hlY2tlZCkge1xuICAgICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcHJveHlbcHJvcGVydHldID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZXZlbnQudGFyZ2V0Lm1hdGNoZXMoJ1tjb250ZW50ZWRpdGFibGU9dHJ1ZV0nKSkge1xuICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBldmVudC50YXJnZXQuaW5uZXJIVE1MO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZmlsZScgJiYgbXVsdGkpIHtcbiAgICAgICAgdmFyIGZpbGVzID0gQXJyYXkuZnJvbShldmVudC50YXJnZXQuZmlsZXMpO1xuICAgICAgICB2YXIgY3VycmVudCA9IHByb3h5W3Byb3BlcnR5XSB8fCBfQmluZGFibGUuQmluZGFibGUub25EZWNrKHByb3h5LCBwcm9wZXJ0eSk7XG4gICAgICAgIGlmICghY3VycmVudCB8fCAhZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgcHJveHlbcHJvcGVydHldID0gZmlsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIF9sb29wNSA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgICBpZiAoZmlsZXNbaV0gIT09IGN1cnJlbnRbaV0pIHtcbiAgICAgICAgICAgICAgZmlsZXNbaV0udG9KU09OID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICBuYW1lOiBmaWxlW2ldLm5hbWUsXG4gICAgICAgICAgICAgICAgICBzaXplOiBmaWxlW2ldLnNpemUsXG4gICAgICAgICAgICAgICAgICB0eXBlOiBmaWxlW2ldLnR5cGUsXG4gICAgICAgICAgICAgICAgICBkYXRlOiBmaWxlW2ldLmxhc3RNb2RpZmllZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGN1cnJlbnRbaV0gPSBmaWxlc1tpXTtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7IC8vIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICBmb3IgKHZhciBpIGluIGZpbGVzKSB7XG4gICAgICAgICAgICBpZiAoX2xvb3A1KGkpKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2ZpbGUnICYmICFtdWx0aSAmJiBldmVudC50YXJnZXQuZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBfZmlsZSA9IGV2ZW50LnRhcmdldC5maWxlcy5pdGVtKDApO1xuICAgICAgICBfZmlsZS50b0pTT04gPSAoKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IF9maWxlLm5hbWUsXG4gICAgICAgICAgICBzaXplOiBfZmlsZS5zaXplLFxuICAgICAgICAgICAgdHlwZTogX2ZpbGUudHlwZSxcbiAgICAgICAgICAgIGRhdGU6IF9maWxlLmxhc3RNb2RpZmllZFxuICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IF9maWxlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJveHlbcHJvcGVydHldID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgfVxuICAgIH07XG4gICAgaWYgKHR5cGUgPT09ICdmaWxlJyB8fCB0eXBlID09PSAncmFkaW8nKSB7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ3ZhbHVlLWNoYW5nZWQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICB9XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICBpZiAodHlwZSA9PT0gJ2ZpbGUnIHx8IHR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2lucHV0JywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3ZhbHVlLWNoYW5nZWQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1iaW5kJyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBPblRhZyh0YWcpIHtcbiAgICB2YXIgcmVmZXJlbnRzID0gU3RyaW5nKHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LW9uJykpO1xuICAgIHJlZmVyZW50cy5zcGxpdCgnOycpLm1hcChhID0+IGEuc3BsaXQoJzonKSkuZm9yRWFjaChhID0+IHtcbiAgICAgIGEgPSBhLm1hcChhID0+IGEudHJpbSgpKTtcbiAgICAgIHZhciBhcmdMZW4gPSBhLmxlbmd0aDtcbiAgICAgIHZhciBldmVudE5hbWUgPSBTdHJpbmcoYS5zaGlmdCgpKS50cmltKCk7XG4gICAgICB2YXIgY2FsbGJhY2tOYW1lID0gU3RyaW5nKGEuc2hpZnQoKSB8fCBldmVudE5hbWUpLnRyaW0oKTtcbiAgICAgIHZhciBldmVudEZsYWdzID0gU3RyaW5nKGEuc2hpZnQoKSB8fCAnJykudHJpbSgpO1xuICAgICAgdmFyIGFyZ0xpc3QgPSBbXTtcbiAgICAgIHZhciBncm91cHMgPSAvKFxcdyspKD86XFwoKFskXFx3XFxzLSdcIixdKylcXCkpPy8uZXhlYyhjYWxsYmFja05hbWUpO1xuICAgICAgaWYgKGdyb3Vwcykge1xuICAgICAgICBjYWxsYmFja05hbWUgPSBncm91cHNbMV0ucmVwbGFjZSgvKF5bXFxzXFxuXSt8W1xcc1xcbl0rJCkvLCAnJyk7XG4gICAgICAgIGlmIChncm91cHNbMl0pIHtcbiAgICAgICAgICBhcmdMaXN0ID0gZ3JvdXBzWzJdLnNwbGl0KCcsJykubWFwKHMgPT4gcy50cmltKCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWFyZ0xpc3QubGVuZ3RoKSB7XG4gICAgICAgIGFyZ0xpc3QucHVzaCgnJGV2ZW50Jyk7XG4gICAgICB9XG4gICAgICBpZiAoIWV2ZW50TmFtZSB8fCBhcmdMZW4gPT09IDEpIHtcbiAgICAgICAgZXZlbnROYW1lID0gY2FsbGJhY2tOYW1lO1xuICAgICAgfVxuICAgICAgdmFyIGV2ZW50TGlzdGVuZXIgPSBldmVudCA9PiB7XG4gICAgICAgIHZhciBldmVudE1ldGhvZDtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBfbG9vcDYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29udHJvbGxlciA9IHBhcmVudC5jb250cm9sbGVyO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb250cm9sbGVyW2NhbGxiYWNrTmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgZXZlbnRNZXRob2QgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJbY2FsbGJhY2tOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGJyZWFrXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXJlbnRbY2FsbGJhY2tOYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICBldmVudE1ldGhvZCA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgcGFyZW50W2NhbGxiYWNrTmFtZV0oLi4uYXJncyk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIHJldHVybiAwOyAvLyBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHBhcmVudC5wYXJlbnQpIHtcbiAgICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiAwOyAvLyBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgX3JldDI7XG4gICAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgICBfcmV0MiA9IF9sb29wNigpO1xuICAgICAgICAgIGlmIChfcmV0MiA9PT0gMCkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFyZ1JlZnMgPSBhcmdMaXN0Lm1hcChhcmcgPT4ge1xuICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICBpZiAoTnVtYmVyKGFyZykgPT0gYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnZXZlbnQnIHx8IGFyZyA9PT0gJyRldmVudCcpIHtcbiAgICAgICAgICAgIHJldHVybiBldmVudDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyR2aWV3Jykge1xuICAgICAgICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyRjb250cm9sbGVyJykge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXI7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckdGFnJykge1xuICAgICAgICAgICAgcmV0dXJuIHRhZztcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyRwYXJlbnQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckc3VidmlldycpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnIGluIHRoaXMuYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXJnc1thcmddO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2ggPSAvXlsnXCJdKFtcXHctXSs/KVtcIiddJC8uZXhlYyhhcmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hbMV07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCEodHlwZW9mIGV2ZW50TWV0aG9kID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtjYWxsYmFja05hbWV9IGlzIG5vdCBkZWZpbmVkIG9uIFZpZXcgb2JqZWN0LmAgKyBcIlxcblwiICsgYFRhZzpgICsgXCJcXG5cIiArIGAke3RhZy5vdXRlckhUTUx9YCk7XG4gICAgICAgIH1cbiAgICAgICAgZXZlbnRNZXRob2QoLi4uYXJnUmVmcyk7XG4gICAgICB9O1xuICAgICAgdmFyIGV2ZW50T3B0aW9ucyA9IHt9O1xuICAgICAgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ3AnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMucGFzc2l2ZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ1AnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMucGFzc2l2ZSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ2MnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMuY2FwdHVyZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ0MnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMuY2FwdHVyZSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ28nKSkge1xuICAgICAgICBldmVudE9wdGlvbnMub25jZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ08nKSkge1xuICAgICAgICBldmVudE9wdGlvbnMub25jZSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgc3dpdGNoIChldmVudE5hbWUpIHtcbiAgICAgICAgY2FzZSAnX2luaXQnOlxuICAgICAgICAgIGV2ZW50TGlzdGVuZXIoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnX2F0dGFjaCc6XG4gICAgICAgICAgdGhpcy5ub2Rlc0F0dGFjaGVkLmFkZChldmVudExpc3RlbmVyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnX2RldGFjaCc6XG4gICAgICAgICAgdGhpcy5ub2Rlc0RldGFjaGVkLmFkZChldmVudExpc3RlbmVyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGV2ZW50TGlzdGVuZXIsIGV2ZW50T3B0aW9ucyk7XG4gICAgICAgICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGV2ZW50TGlzdGVuZXIsIGV2ZW50T3B0aW9ucyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICByZXR1cm4gW2V2ZW50TmFtZSwgY2FsbGJhY2tOYW1lLCBhcmdMaXN0XTtcbiAgICB9KTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1vbicpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwTGlua1RhZyh0YWcpIHtcbiAgICAvLyBjb25zdCB0YWdDb21waWxlciA9IHRoaXMuY29tcGlsZUxpbmtUYWcodGFnKTtcblxuICAgIC8vIGNvbnN0IG5ld1RhZyA9IHRhZ0NvbXBpbGVyKHRoaXMpO1xuXG4gICAgLy8gdGFnLnJlcGxhY2VXaXRoKG5ld1RhZyk7XG5cbiAgICAvLyByZXR1cm4gbmV3VGFnO1xuXG4gICAgdmFyIGxpbmtBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAgIHRhZy5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBsaW5rQXR0cik7XG4gICAgdmFyIGxpbmtDbGljayA9IGV2ZW50ID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAobGlua0F0dHIuc3Vic3RyaW5nKDAsIDQpID09PSAnaHR0cCcgfHwgbGlua0F0dHIuc3Vic3RyaW5nKDAsIDIpID09PSAnLy8nKSB7XG4gICAgICAgIGdsb2JhbFRoaXMub3Blbih0YWcuZ2V0QXR0cmlidXRlKCdocmVmJywgbGlua0F0dHIpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgX1JvdXRlci5Sb3V0ZXIuZ28odGFnLmdldEF0dHJpYnV0ZSgnaHJlZicpKTtcbiAgICB9O1xuICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGxpbmtDbGljayk7XG4gICAgdGhpcy5vblJlbW92ZSgoKHRhZywgZXZlbnRMaXN0ZW5lcikgPT4gKCkgPT4ge1xuICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZXZlbnRMaXN0ZW5lcik7XG4gICAgICB0YWcgPSB1bmRlZmluZWQ7XG4gICAgICBldmVudExpc3RlbmVyID0gdW5kZWZpbmVkO1xuICAgIH0pKHRhZywgbGlua0NsaWNrKSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBjb21waWxlTGlua1RhZyhzb3VyY2VUYWcpXG4gIC8vIHtcbiAgLy8gXHRjb25zdCBsaW5rQXR0ciA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgLy8gXHRzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1saW5rJyk7XG4gIC8vIFx0cmV0dXJuIChiaW5kaW5nVmlldykgPT4ge1xuICAvLyBcdFx0Y29uc3QgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSh0cnVlKTtcbiAgLy8gXHRcdHRhZy5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBsaW5rQXR0cik7XG4gIC8vIFx0XHRyZXR1cm4gdGFnO1xuICAvLyBcdH07XG4gIC8vIH1cblxuICBtYXBQcmVuZGVyZXJUYWcodGFnKSB7XG4gICAgdmFyIHByZXJlbmRlckF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1wcmVyZW5kZXInKTtcbiAgICB2YXIgcHJlcmVuZGVyaW5nID0gZ2xvYmFsVGhpcy5wcmVyZW5kZXJlciB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9wcmVyZW5kZXIvaSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtcHJlcmVuZGVyJyk7XG4gICAgaWYgKHByZXJlbmRlcmluZykge1xuICAgICAgZ2xvYmFsVGhpcy5wcmVyZW5kZXJlciA9IGdsb2JhbFRoaXMucHJlcmVuZGVyZXIgfHwgdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHByZXJlbmRlckF0dHIgPT09ICduZXZlcicgJiYgcHJlcmVuZGVyaW5nIHx8IHByZXJlbmRlckF0dHIgPT09ICdvbmx5JyAmJiAhcHJlcmVuZGVyaW5nKSB7XG4gICAgICB0aGlzLnBvc3RNYXBwaW5nLmFkZCgoKSA9PiB0YWcucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YWcpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBXaXRoVGFnKHRhZykge1xuICAgIHZhciBfdGhpczIgPSB0aGlzO1xuICAgIHZhciB3aXRoQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXdpdGgnKTtcbiAgICB2YXIgY2FycnlBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtY2FycnknKTtcbiAgICB2YXIgdmlld0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3Ytd2l0aCcpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWNhcnJ5Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSB2aWV3QXR0ciA/IHRoaXMuc3RyaW5nVG9DbGFzcyh2aWV3QXR0cikgOiBWaWV3O1xuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBjYXJyeVByb3BzID0gW107XG4gICAgaWYgKGNhcnJ5QXR0cikge1xuICAgICAgY2FycnlQcm9wcyA9IGNhcnJ5QXR0ci5zcGxpdCgnLCcpLm1hcChzID0+IHMudHJpbSgpKTtcbiAgICB9XG4gICAgdmFyIGRlYmluZCA9IHRoaXMuYXJncy5iaW5kVG8od2l0aEF0dHIsICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICBpZiAodGhpcy53aXRoVmlld3MuaGFzKHRhZykpIHtcbiAgICAgICAgdGhpcy53aXRoVmlld3MuZGVsZXRlKHRhZyk7XG4gICAgICB9XG4gICAgICB3aGlsZSAodGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGFnLnJlbW92ZUNoaWxkKHRhZy5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICAgIHZhciB2aWV3ID0gbmV3IHZpZXdDbGFzcyh7fSwgdGhpcyk7XG4gICAgICB0aGlzLm9uUmVtb3ZlKCh2aWV3ID0+ICgpID0+IHtcbiAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgIH0pKHZpZXcpKTtcbiAgICAgIHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgICAgIHZhciBfbG9vcDcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWJpbmQgPSBfdGhpczIuYXJncy5iaW5kVG8oY2FycnlQcm9wc1tpXSwgKHYsIGspID0+IHtcbiAgICAgICAgICB2aWV3LmFyZ3Nba10gPSB2O1xuICAgICAgICB9KTtcbiAgICAgICAgdmlldy5vblJlbW92ZShkZWJpbmQpO1xuICAgICAgICBfdGhpczIub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIGRlYmluZCgpO1xuICAgICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIGkgaW4gY2FycnlQcm9wcykge1xuICAgICAgICBfbG9vcDcoKTtcbiAgICAgIH1cbiAgICAgIHZhciBfbG9vcDggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uodik7XG4gICAgICAgIHZhciBkZWJpbmQgPSB2LmJpbmRUbyhfaTIsICh2diwga2ssIHR0LCBkZCkgPT4ge1xuICAgICAgICAgIGlmICghZGQpIHtcbiAgICAgICAgICAgIHZpZXcuYXJnc1tra10gPSB2djtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtrIGluIHZpZXcuYXJncykge1xuICAgICAgICAgICAgZGVsZXRlIHZpZXcuYXJnc1tra107XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRlYmluZFVwID0gdmlldy5hcmdzLmJpbmRUbyhfaTIsICh2diwga2ssIHR0LCBkZCkgPT4ge1xuICAgICAgICAgIGlmICghZGQpIHtcbiAgICAgICAgICAgIHZba2tdID0gdnY7XG4gICAgICAgICAgfSBlbHNlIGlmIChrayBpbiB2KSB7XG4gICAgICAgICAgICBkZWxldGUgdltra107XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMyLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBkZWJpbmQoKTtcbiAgICAgICAgICBpZiAoIXYuaXNCb3VuZCgpKSB7XG4gICAgICAgICAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh2KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZpZXcub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIGRlYmluZCgpO1xuICAgICAgICAgIGlmICghdi5pc0JvdW5kKCkpIHtcbiAgICAgICAgICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHYpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgX2kyIGluIHYpIHtcbiAgICAgICAgaWYgKF9sb29wOCgpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZpZXcucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgICB0aGlzLndpdGhWaWV3cy5zZXQodGFnLCB2aWV3KTtcbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIHRoaXMud2l0aFZpZXdzLmRlbGV0ZSh0YWcpO1xuICAgICAgZGViaW5kKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBWaWV3VGFnKHRhZykge1xuICAgIHZhciB2aWV3QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4udGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIHBhcnRzID0gdmlld0F0dHIuc3BsaXQoJzonKTtcbiAgICB2YXIgdmlld05hbWUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSBwYXJ0cy5sZW5ndGggPyB0aGlzLnN0cmluZ1RvQ2xhc3MocGFydHNbMF0pIDogVmlldztcbiAgICB2YXIgdmlldyA9IG5ldyB2aWV3Q2xhc3ModGhpcy5hcmdzLCB0aGlzKTtcbiAgICB0aGlzLnZpZXdzLnNldCh0YWcsIHZpZXcpO1xuICAgIHRoaXMudmlld3Muc2V0KHZpZXdOYW1lLCB2aWV3KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICB0aGlzLnZpZXdzLmRlbGV0ZSh0YWcpO1xuICAgICAgdGhpcy52aWV3cy5kZWxldGUodmlld05hbWUpO1xuICAgIH0pO1xuICAgIHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgICB2aWV3LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwRWFjaFRhZyh0YWcpIHtcbiAgICB2YXIgZWFjaEF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1lYWNoJyk7XG4gICAgdmFyIHZpZXdBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWVhY2gnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHZpZXdBdHRyID8gdGhpcy5zdHJpbmdUb0NsYXNzKHZpZXdBdHRyKSA6IFZpZXc7XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4udGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIFtlYWNoUHJvcCwgYXNQcm9wLCBrZXlQcm9wXSA9IGVhY2hBdHRyLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHByb3h5ID0gdGhpcy5hcmdzO1xuICAgIHZhciBwcm9wZXJ0eSA9IGVhY2hQcm9wO1xuICAgIGlmIChlYWNoUHJvcC5tYXRjaCgvXFwuLykpIHtcbiAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUodGhpcy5hcmdzLCBlYWNoUHJvcCwgdHJ1ZSk7XG4gICAgfVxuICAgIHZhciBkZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICBpZiAodiBpbnN0YW5jZW9mIF9CYWcuQmFnKSB7XG4gICAgICAgIHYgPSB2Lmxpc3Q7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy52aWV3TGlzdHMuaGFzKHRhZykpIHtcbiAgICAgICAgdGhpcy52aWV3TGlzdHMuZ2V0KHRhZykucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICB2YXIgdmlld0xpc3QgPSBuZXcgX1ZpZXdMaXN0LlZpZXdMaXN0KHN1YlRlbXBsYXRlLCBhc1Byb3AsIHYsIHRoaXMsIGtleVByb3AsIHZpZXdDbGFzcyk7XG4gICAgICB2YXIgdmlld0xpc3RSZW1vdmVyID0gKCkgPT4gdmlld0xpc3QucmVtb3ZlKCk7XG4gICAgICB0aGlzLm9uUmVtb3ZlKHZpZXdMaXN0UmVtb3Zlcik7XG4gICAgICB2aWV3TGlzdC5vblJlbW92ZSgoKSA9PiB0aGlzLl9vblJlbW92ZS5yZW1vdmUodmlld0xpc3RSZW1vdmVyKSk7XG4gICAgICB2YXIgZGViaW5kQSA9IHRoaXMuYXJncy5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgaWYgKGsgPT09ICdfaWQnKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZCkge1xuICAgICAgICAgIHZpZXdMaXN0LnN1YkFyZ3Nba10gPSB2O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChrIGluIHZpZXdMaXN0LnN1YkFyZ3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2aWV3TGlzdC5zdWJBcmdzW2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgZGViaW5kQiA9IHZpZXdMaXN0LmFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICAgIGlmIChrID09PSAnX2lkJyB8fCBrID09PSAndmFsdWUnIHx8IFN0cmluZyhrKS5zdWJzdHJpbmcoMCwgMykgPT09ICdfX18nKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZCkge1xuICAgICAgICAgIGlmIChrIGluIHRoaXMuYXJncykge1xuICAgICAgICAgICAgdGhpcy5hcmdzW2tdID0gdjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuYXJnc1trXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2aWV3TGlzdC5vblJlbW92ZShkZWJpbmRBKTtcbiAgICAgIHZpZXdMaXN0Lm9uUmVtb3ZlKGRlYmluZEIpO1xuICAgICAgdGhpcy5vblJlbW92ZShkZWJpbmRBKTtcbiAgICAgIHRoaXMub25SZW1vdmUoZGViaW5kQik7XG4gICAgICB3aGlsZSAodGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGFnLnJlbW92ZUNoaWxkKHRhZy5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudmlld0xpc3RzLnNldCh0YWcsIHZpZXdMaXN0KTtcbiAgICAgIHZpZXdMaXN0LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgICAgaWYgKHRhZy50YWdOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgICB2aWV3TGlzdC5yZVJlbmRlcigpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoZGViaW5kKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcElmVGFnKHRhZykge1xuICAgIHZhciBzb3VyY2VUYWcgPSB0YWc7XG4gICAgdmFyIHZpZXdQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgaWZQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWlmJyk7XG4gICAgdmFyIGlzUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1pcycpO1xuICAgIHZhciBpbnZlcnRlZCA9IGZhbHNlO1xuICAgIHZhciBkZWZpbmVkID0gZmFsc2U7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWlmJyk7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtaXMnKTtcbiAgICB2YXIgdmlld0NsYXNzID0gdmlld1Byb3BlcnR5ID8gdGhpcy5zdHJpbmdUb0NsYXNzKHZpZXdQcm9wZXJ0eSkgOiBWaWV3O1xuICAgIGlmIChpZlByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyEnKSB7XG4gICAgICBpZlByb3BlcnR5ID0gaWZQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICBpbnZlcnRlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChpZlByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJz8nKSB7XG4gICAgICBpZlByb3BlcnR5ID0gaWZQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICBkZWZpbmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4uc291cmNlVGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIGJpbmRpbmdWaWV3ID0gdGhpcztcbiAgICB2YXIgaWZEb2MgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgLy8gbGV0IHZpZXcgPSBuZXcgdmlld0NsYXNzKE9iamVjdC5hc3NpZ24oe30sIHRoaXMuYXJncyksIGJpbmRpbmdWaWV3KTtcbiAgICB2YXIgdmlldyA9IG5ldyB2aWV3Q2xhc3ModGhpcy5hcmdzLCBiaW5kaW5nVmlldyk7XG4gICAgdmlldy50YWdzLmJpbmRUbygodiwgaykgPT4gdGhpcy50YWdzW2tdID0gdiwge1xuICAgICAgcmVtb3ZlV2l0aDogdGhpc1xuICAgIH0pO1xuICAgIHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgICB2YXIgcHJveHkgPSBiaW5kaW5nVmlldy5hcmdzO1xuICAgIHZhciBwcm9wZXJ0eSA9IGlmUHJvcGVydHk7XG4gICAgaWYgKGlmUHJvcGVydHkubWF0Y2goL1xcLi8pKSB7XG4gICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKGJpbmRpbmdWaWV3LmFyZ3MsIGlmUHJvcGVydHksIHRydWUpO1xuICAgIH1cbiAgICB2aWV3LnJlbmRlcihpZkRvYywgbnVsbCwgdGhpcyk7XG4gICAgdmFyIHByb3BlcnR5RGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaykgPT4ge1xuICAgICAgdmFyIG8gPSB2O1xuICAgICAgaWYgKGRlZmluZWQpIHtcbiAgICAgICAgdiA9IHYgIT09IG51bGwgJiYgdiAhPT0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgaWYgKHYgaW5zdGFuY2VvZiBfQmFnLkJhZykge1xuICAgICAgICB2ID0gdi5saXN0O1xuICAgICAgfVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodikpIHtcbiAgICAgICAgdiA9ICEhdi5sZW5ndGg7XG4gICAgICB9XG4gICAgICBpZiAoaXNQcm9wZXJ0eSAhPT0gbnVsbCkge1xuICAgICAgICB2ID0gbyA9PSBpc1Byb3BlcnR5O1xuICAgICAgfVxuICAgICAgaWYgKGludmVydGVkKSB7XG4gICAgICAgIHYgPSAhdjtcbiAgICAgIH1cbiAgICAgIGlmICh2KSB7XG4gICAgICAgIHRhZy5hcHBlbmRDaGlsZChpZkRvYyk7XG4gICAgICAgIFsuLi5pZkRvYy5jaGlsZE5vZGVzXS5mb3JFYWNoKG5vZGUgPT4gX0RvbS5Eb20ubWFwVGFncyhub2RlLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICAgICAgaWYgKCF0YWcubWF0Y2hlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tQXR0YWNoZWQnLCB7XG4gICAgICAgICAgICB0YXJnZXQ6IHRhZyxcbiAgICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3Lm5vZGVzLmZvckVhY2gobiA9PiBpZkRvYy5hcHBlbmRDaGlsZChuKSk7XG4gICAgICAgIF9Eb20uRG9tLm1hcFRhZ3MoaWZEb2MsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgICAgICBpZiAoIXRhZy5tYXRjaGVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ldyBDdXN0b21FdmVudCgnY3ZEb21EZXRhY2hlZCcsIHtcbiAgICAgICAgICAgIHRhcmdldDogdGFnLFxuICAgICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAgY2hpbGRyZW46IEFycmF5LmlzQXJyYXkocHJveHlbcHJvcGVydHldKVxuICAgIH0pO1xuXG4gICAgLy8gY29uc3QgcHJvcGVydHlEZWJpbmQgPSB0aGlzLmFyZ3MuYmluZENoYWluKHByb3BlcnR5LCBvblVwZGF0ZSk7XG5cbiAgICBiaW5kaW5nVmlldy5vblJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG5cbiAgICAvLyBjb25zdCBkZWJpbmRBID0gdGhpcy5hcmdzLmJpbmRUbygodixrLHQsZCkgPT4ge1xuICAgIC8vIFx0aWYoayA9PT0gJ19pZCcpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdHJldHVybjtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0aWYoIWQpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdHZpZXcuYXJnc1trXSA9IHY7XG4gICAgLy8gXHR9XG4gICAgLy8gXHRlbHNlIGlmKGsgaW4gdmlldy5hcmdzKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRkZWxldGUgdmlldy5hcmdzW2tdO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gfSk7XG5cbiAgICAvLyBjb25zdCBkZWJpbmRCID0gdmlldy5hcmdzLmJpbmRUbygodixrLHQsZCxwKSA9PiB7XG4gICAgLy8gXHRpZihrID09PSAnX2lkJyB8fCBTdHJpbmcoaykuc3Vic3RyaW5nKDAsMykgPT09ICdfX18nKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRyZXR1cm47XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGlmKGsgaW4gdGhpcy5hcmdzKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRpZighZClcbiAgICAvLyBcdFx0e1xuICAgIC8vIFx0XHRcdHRoaXMuYXJnc1trXSA9IHY7XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdFx0ZWxzZVxuICAgIC8vIFx0XHR7XG4gICAgLy8gXHRcdFx0ZGVsZXRlIHRoaXMuYXJnc1trXTtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0fVxuICAgIC8vIH0pO1xuXG4gICAgdmFyIHZpZXdEZWJpbmQgPSAoKSA9PiB7XG4gICAgICBwcm9wZXJ0eURlYmluZCgpO1xuICAgICAgLy8gZGViaW5kQSgpO1xuICAgICAgLy8gZGViaW5kQigpO1xuICAgICAgYmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG4gICAgICAvLyBiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKGJpbmRhYmxlRGViaW5kKTtcbiAgICB9O1xuICAgIGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHZpZXdEZWJpbmQpO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgLy8gZGViaW5kQSgpO1xuICAgICAgLy8gZGViaW5kQigpO1xuICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgIGlmIChiaW5kaW5nVmlldyAhPT0gdGhpcykge1xuICAgICAgICBiaW5kaW5nVmlldy5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gY29tcGlsZUlmVGFnKHNvdXJjZVRhZylcbiAgLy8ge1xuICAvLyBcdGxldCBpZlByb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtaWYnKTtcbiAgLy8gXHRsZXQgaW52ZXJ0ZWQgICA9IGZhbHNlO1xuXG4gIC8vIFx0c291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtaWYnKTtcblxuICAvLyBcdGlmKGlmUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnIScpXG4gIC8vIFx0e1xuICAvLyBcdFx0aWZQcm9wZXJ0eSA9IGlmUHJvcGVydHkuc3Vic3RyKDEpO1xuICAvLyBcdFx0aW52ZXJ0ZWQgICA9IHRydWU7XG4gIC8vIFx0fVxuXG4gIC8vIFx0Y29uc3Qgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudDtcblxuICAvLyBcdFsuLi5zb3VyY2VUYWcuY2hpbGROb2Rlc10uZm9yRWFjaChcbiAgLy8gXHRcdG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobi5jbG9uZU5vZGUodHJ1ZSkpXG4gIC8vIFx0KTtcblxuICAvLyBcdHJldHVybiAoYmluZGluZ1ZpZXcpID0+IHtcblxuICAvLyBcdFx0Y29uc3QgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSgpO1xuXG4gIC8vIFx0XHRjb25zdCBpZkRvYyA9IG5ldyBEb2N1bWVudEZyYWdtZW50O1xuXG4gIC8vIFx0XHRsZXQgdmlldyA9IG5ldyBWaWV3KHt9LCBiaW5kaW5nVmlldyk7XG5cbiAgLy8gXHRcdHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgLy8gXHRcdC8vIHZpZXcucGFyZW50ICAgPSBiaW5kaW5nVmlldztcblxuICAvLyBcdFx0YmluZGluZ1ZpZXcuc3luY0JpbmQodmlldyk7XG5cbiAgLy8gXHRcdGxldCBwcm94eSAgICA9IGJpbmRpbmdWaWV3LmFyZ3M7XG4gIC8vIFx0XHRsZXQgcHJvcGVydHkgPSBpZlByb3BlcnR5O1xuXG4gIC8vIFx0XHRpZihpZlByb3BlcnR5Lm1hdGNoKC9cXC4vKSlcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0W3Byb3h5LCBwcm9wZXJ0eV0gPSBCaW5kYWJsZS5yZXNvbHZlKFxuICAvLyBcdFx0XHRcdGJpbmRpbmdWaWV3LmFyZ3NcbiAgLy8gXHRcdFx0XHQsIGlmUHJvcGVydHlcbiAgLy8gXHRcdFx0XHQsIHRydWVcbiAgLy8gXHRcdFx0KTtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0bGV0IGhhc1JlbmRlcmVkID0gZmFsc2U7XG5cbiAgLy8gXHRcdGNvbnN0IHByb3BlcnR5RGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodixrKSA9PiB7XG5cbiAgLy8gXHRcdFx0aWYoIWhhc1JlbmRlcmVkKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0Y29uc3QgcmVuZGVyRG9jID0gKGJpbmRpbmdWaWV3LmFyZ3NbcHJvcGVydHldIHx8IGludmVydGVkKVxuICAvLyBcdFx0XHRcdFx0PyB0YWcgOiBpZkRvYztcblxuICAvLyBcdFx0XHRcdHZpZXcucmVuZGVyKHJlbmRlckRvYyk7XG5cbiAgLy8gXHRcdFx0XHRoYXNSZW5kZXJlZCA9IHRydWU7XG5cbiAgLy8gXHRcdFx0XHRyZXR1cm47XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRpZihBcnJheS5pc0FycmF5KHYpKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0diA9ICEhdi5sZW5ndGg7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRpZihpbnZlcnRlZClcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHYgPSAhdjtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGlmKHYpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR0YWcuYXBwZW5kQ2hpbGQoaWZEb2MpO1xuICAvLyBcdFx0XHR9XG4gIC8vIFx0XHRcdGVsc2VcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHZpZXcubm9kZXMuZm9yRWFjaChuPT5pZkRvYy5hcHBlbmRDaGlsZChuKSk7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0fSk7XG5cbiAgLy8gXHRcdC8vIGxldCBjbGVhbmVyID0gYmluZGluZ1ZpZXc7XG5cbiAgLy8gXHRcdC8vIHdoaWxlKGNsZWFuZXIucGFyZW50KVxuICAvLyBcdFx0Ly8ge1xuICAvLyBcdFx0Ly8gXHRjbGVhbmVyID0gY2xlYW5lci5wYXJlbnQ7XG4gIC8vIFx0XHQvLyB9XG5cbiAgLy8gXHRcdGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcblxuICAvLyBcdFx0bGV0IGJpbmRhYmxlRGViaW5kID0gKCkgPT4ge1xuXG4gIC8vIFx0XHRcdGlmKCFwcm94eS5pc0JvdW5kKCkpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKHByb3h5KTtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHR9O1xuXG4gIC8vIFx0XHRsZXQgdmlld0RlYmluZCA9ICgpPT57XG4gIC8vIFx0XHRcdHByb3BlcnR5RGViaW5kKCk7XG4gIC8vIFx0XHRcdGJpbmRhYmxlRGViaW5kKCk7XG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKGJpbmRhYmxlRGViaW5kKTtcbiAgLy8gXHRcdH07XG5cbiAgLy8gXHRcdHZpZXcub25SZW1vdmUodmlld0RlYmluZCk7XG5cbiAgLy8gXHRcdHJldHVybiB0YWc7XG4gIC8vIFx0fTtcbiAgLy8gfVxuXG4gIG1hcFRlbXBsYXRlVGFnKHRhZykge1xuICAgIC8vIGNvbnN0IHRlbXBsYXRlTmFtZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG5cbiAgICAvLyB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuXG4gICAgLy8gdGhpcy50ZW1wbGF0ZXNbIHRlbXBsYXRlTmFtZSBdID0gdGFnLnRhZ05hbWUgPT09ICdURU1QTEFURSdcbiAgICAvLyBcdD8gdGFnLmNsb25lTm9kZSh0cnVlKS5jb250ZW50XG4gICAgLy8gXHQ6IG5ldyBEb2N1bWVudEZyYWdtZW50KHRhZy5pbm5lckhUTUwpO1xuXG4gICAgdmFyIHRlbXBsYXRlTmFtZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcbiAgICB2YXIgc291cmNlID0gdGFnLmlubmVySFRNTDtcbiAgICBpZiAoIVZpZXcudGVtcGxhdGVzLmhhcyhzb3VyY2UpKSB7XG4gICAgICBWaWV3LnRlbXBsYXRlcy5zZXQoc291cmNlLCBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCh0YWcuaW5uZXJIVE1MKSk7XG4gICAgfVxuICAgIHRoaXMudGVtcGxhdGVzW3RlbXBsYXRlTmFtZV0gPSBWaWV3LnRlbXBsYXRlcy5nZXQoc291cmNlKTtcbiAgICB0aGlzLnBvc3RNYXBwaW5nLmFkZCgoKSA9PiB0YWcucmVtb3ZlKCkpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwU2xvdFRhZyh0YWcpIHtcbiAgICB2YXIgdGVtcGxhdGVOYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnY3Ytc2xvdCcpO1xuICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGVzW3RlbXBsYXRlTmFtZV07XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgIHRlbXBsYXRlID0gcGFyZW50LnRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdO1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgfVxuICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBUZW1wbGF0ZSAke3RlbXBsYXRlTmFtZX0gbm90IGZvdW5kLmApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXNsb3QnKTtcbiAgICB3aGlsZSAodGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRhZy5maXJzdENoaWxkLnJlbW92ZSgpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHRlbXBsYXRlID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKCFWaWV3LnRlbXBsYXRlcy5oYXModGVtcGxhdGUpKSB7XG4gICAgICAgIFZpZXcudGVtcGxhdGVzLnNldCh0ZW1wbGF0ZSwgZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQodGVtcGxhdGUpKTtcbiAgICAgIH1cbiAgICAgIHRlbXBsYXRlID0gVmlldy50ZW1wbGF0ZXMuZ2V0KHRlbXBsYXRlKTtcbiAgICB9XG4gICAgdGFnLmFwcGVuZENoaWxkKHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIHN5bmNCaW5kKHN1YlZpZXcpXG4gIC8vIHtcbiAgLy8gXHRsZXQgZGViaW5kQSA9IHRoaXMuYXJncy5iaW5kVG8oKHYsayx0LGQpPT57XG4gIC8vIFx0XHRpZihrID09PSAnX2lkJylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0cmV0dXJuO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihzdWJWaWV3LmFyZ3Nba10gIT09IHYpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHN1YlZpZXcuYXJnc1trXSA9IHY7XG4gIC8vIFx0XHR9XG4gIC8vIFx0fSk7XG5cbiAgLy8gXHRsZXQgZGViaW5kQiA9IHN1YlZpZXcuYXJncy5iaW5kVG8oKHYsayx0LGQscCk9PntcblxuICAvLyBcdFx0aWYoayA9PT0gJ19pZCcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHJldHVybjtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0bGV0IG5ld1JlZiA9IHY7XG4gIC8vIFx0XHRsZXQgb2xkUmVmID0gcDtcblxuICAvLyBcdFx0aWYobmV3UmVmIGluc3RhbmNlb2YgVmlldylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0bmV3UmVmID0gbmV3UmVmLl9fX3JlZl9fXztcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYob2xkUmVmIGluc3RhbmNlb2YgVmlldylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0b2xkUmVmID0gb2xkUmVmLl9fX3JlZl9fXztcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYobmV3UmVmICE9PSBvbGRSZWYgJiYgb2xkUmVmIGluc3RhbmNlb2YgVmlldylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0cC5yZW1vdmUoKTtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYoayBpbiB0aGlzLmFyZ3MpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHRoaXMuYXJnc1trXSA9IHY7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHR9KTtcblxuICAvLyBcdHRoaXMub25SZW1vdmUoZGViaW5kQSk7XG4gIC8vIFx0dGhpcy5vblJlbW92ZShkZWJpbmRCKTtcblxuICAvLyBcdHN1YlZpZXcub25SZW1vdmUoKCk9PntcbiAgLy8gXHRcdHRoaXMuX29uUmVtb3ZlLnJlbW92ZShkZWJpbmRBKTtcbiAgLy8gXHRcdHRoaXMuX29uUmVtb3ZlLnJlbW92ZShkZWJpbmRCKTtcbiAgLy8gXHR9KTtcbiAgLy8gfVxuXG4gIHBvc3RSZW5kZXIocGFyZW50Tm9kZSkge31cbiAgYXR0YWNoZWQocGFyZW50Tm9kZSkge31cbiAgaW50ZXJwb2xhdGFibGUoc3RyKSB7XG4gICAgcmV0dXJuICEhU3RyaW5nKHN0cikubWF0Y2godGhpcy5pbnRlcnBvbGF0ZVJlZ2V4KTtcbiAgfVxuICBzdGF0aWMgdXVpZCgpIHtcbiAgICByZXR1cm4gbmV3IF9VdWlkLlV1aWQoKTtcbiAgfVxuICByZW1vdmUobm93ID0gZmFsc2UpIHtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92ZScsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICB2aWV3OiB0aGlzXG4gICAgICB9LFxuICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgIH0pKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZlciA9ICgpID0+IHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy50YWdzKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMudGFnc1tpXSkpIHtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0gJiYgdGhpcy50YWdzW2ldLmZvckVhY2godCA9PiB0LnJlbW92ZSgpKTtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0uc3BsaWNlKDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudGFnc1tpXSAmJiB0aGlzLnRhZ3NbaV0ucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy50YWdzW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaTMgaW4gdGhpcy5ub2Rlcykge1xuICAgICAgICB0aGlzLm5vZGVzW19pM10gJiYgdGhpcy5ub2Rlc1tfaTNdLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjdkRvbURldGFjaGVkJykpO1xuICAgICAgICB0aGlzLm5vZGVzW19pM10gJiYgdGhpcy5ub2Rlc1tfaTNdLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLm5vZGVzW19pM10gPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICB0aGlzLm5vZGVzLnNwbGljZSgwKTtcbiAgICAgIHRoaXMuZmlyc3ROb2RlID0gdGhpcy5sYXN0Tm9kZSA9IHVuZGVmaW5lZDtcbiAgICB9O1xuICAgIGlmIChub3cpIHtcbiAgICAgIHJlbW92ZXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbW92ZXIpO1xuICAgIH1cbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fb25SZW1vdmUuaXRlbXMoKTtcbiAgICBmb3IgKHZhciBjYWxsYmFjayBvZiBjYWxsYmFja3MpIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB0aGlzLl9vblJlbW92ZS5yZW1vdmUoY2FsbGJhY2spO1xuICAgIH1cbiAgICBmb3IgKHZhciBjbGVhbnVwIG9mIHRoaXMuY2xlYW51cCkge1xuICAgICAgY2xlYW51cCAmJiBjbGVhbnVwKCk7XG4gICAgfVxuICAgIHRoaXMuY2xlYW51cC5sZW5ndGggPSAwO1xuICAgIGZvciAodmFyIFt0YWcsIHZpZXdMaXN0XSBvZiB0aGlzLnZpZXdMaXN0cykge1xuICAgICAgdmlld0xpc3QucmVtb3ZlKCk7XG4gICAgfVxuICAgIHRoaXMudmlld0xpc3RzLmNsZWFyKCk7XG4gICAgZm9yICh2YXIgW19jYWxsYmFjazUsIHRpbWVvdXRdIG9mIHRoaXMudGltZW91dHMpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dC50aW1lb3V0KTtcbiAgICB9XG4gICAgZm9yICh2YXIgaW50ZXJ2YWwgb2YgdGhpcy5pbnRlcnZhbHMpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgIH1cbiAgICB0aGlzLmludGVydmFscy5sZW5ndGggPSAwO1xuICAgIGZvciAodmFyIGZyYW1lIG9mIHRoaXMuZnJhbWVzKSB7XG4gICAgICBmcmFtZSgpO1xuICAgIH1cbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSAwO1xuICAgIHRoaXMucHJlUnVsZVNldC5wdXJnZSgpO1xuICAgIHRoaXMucnVsZVNldC5wdXJnZSgpO1xuICAgIHRoaXMucmVtb3ZlZCA9IHRydWU7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVtb3ZlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICB2aWV3OiB0aGlzXG4gICAgICB9LFxuICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgIH0pKTtcbiAgfVxuICBmaW5kVGFnKHNlbGVjdG9yKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLm5vZGVzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdm9pZCAwO1xuICAgICAgaWYgKCF0aGlzLm5vZGVzW2ldLnF1ZXJ5U2VsZWN0b3IpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5ub2Rlc1tpXS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IF9UYWcuVGFnKHRoaXMubm9kZXNbaV0sIHRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgPSB0aGlzLm5vZGVzW2ldLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBuZXcgX1RhZy5UYWcocmVzdWx0LCB0aGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGZpbmRUYWdzKHNlbGVjdG9yKSB7XG4gICAgdmFyIHRvcExldmVsID0gdGhpcy5ub2Rlcy5maWx0ZXIobiA9PiBuLm1hdGNoZXMgJiYgbi5tYXRjaGVzKHNlbGVjdG9yKSk7XG4gICAgdmFyIHN1YkxldmVsID0gdGhpcy5ub2Rlcy5maWx0ZXIobiA9PiBuLnF1ZXJ5U2VsZWN0b3JBbGwpLm1hcChuID0+IFsuLi5uLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpXSkuZmxhdCgpLm1hcChuID0+IG5ldyBfVGFnLlRhZyhuLCB0aGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcykpIHx8IFtdO1xuICAgIHJldHVybiB0b3BMZXZlbC5jb25jYXQoc3ViTGV2ZWwpO1xuICB9XG4gIG9uUmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgaWYgKGNhbGxiYWNrIGluc3RhbmNlb2YgRXZlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fb25SZW1vdmUuYWRkKGNhbGxiYWNrKTtcbiAgfVxuICB1cGRhdGUoKSB7fVxuICBiZWZvcmVVcGRhdGUoYXJncykge31cbiAgYWZ0ZXJVcGRhdGUoYXJncykge31cbiAgc3RyaW5nVHJhbnNmb3JtZXIobWV0aG9kcykge1xuICAgIHJldHVybiB4ID0+IHtcbiAgICAgIGZvciAodmFyIG0gaW4gbWV0aG9kcykge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIG1ldGhvZCA9IG1ldGhvZHNbbV07XG4gICAgICAgIHdoaWxlIChwYXJlbnQgJiYgIXBhcmVudFttZXRob2RdKSB7XG4gICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB4ID0gcGFyZW50W21ldGhvZHNbbV1dKHgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHg7XG4gICAgfTtcbiAgfVxuICBzdHJpbmdUb0NsYXNzKHJlZkNsYXNzbmFtZSkge1xuICAgIGlmIChWaWV3LnJlZkNsYXNzZXMuaGFzKHJlZkNsYXNzbmFtZSkpIHtcbiAgICAgIHJldHVybiBWaWV3LnJlZkNsYXNzZXMuZ2V0KHJlZkNsYXNzbmFtZSk7XG4gICAgfVxuICAgIHZhciByZWZDbGFzc1NwbGl0ID0gcmVmQ2xhc3NuYW1lLnNwbGl0KCcvJyk7XG4gICAgdmFyIHJlZlNob3J0Q2xhc3MgPSByZWZDbGFzc1NwbGl0W3JlZkNsYXNzU3BsaXQubGVuZ3RoIC0gMV07XG4gICAgdmFyIHJlZkNsYXNzID0gcmVxdWlyZShyZWZDbGFzc25hbWUpO1xuICAgIFZpZXcucmVmQ2xhc3Nlcy5zZXQocmVmQ2xhc3NuYW1lLCByZWZDbGFzc1tyZWZTaG9ydENsYXNzXSk7XG4gICAgcmV0dXJuIHJlZkNsYXNzW3JlZlNob3J0Q2xhc3NdO1xuICB9XG4gIHByZXZlbnRQYXJzaW5nKG5vZGUpIHtcbiAgICBub2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICB9XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLm5vZGVzLm1hcChuID0+IG4ub3V0ZXJIVE1MKS5qb2luKCcgJyk7XG4gIH1cbiAgbGlzdGVuKG5vZGUsIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBvcHRpb25zID0gY2FsbGJhY2s7XG4gICAgICBjYWxsYmFjayA9IGV2ZW50TmFtZTtcbiAgICAgIGV2ZW50TmFtZSA9IG5vZGU7XG4gICAgICBub2RlID0gdGhpcztcbiAgICB9XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0ZW4obm9kZS5ub2RlcywgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5tYXAobiA9PiB0aGlzLmxpc3RlbihuLCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSk7XG4gICAgICAvLyAuZm9yRWFjaChyID0+IHIoKSk7XG4gICAgfVxuICAgIGlmIChub2RlIGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpc3Rlbihub2RlLmVsZW1lbnQsIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIH1cbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgdmFyIHJlbW92ZSA9ICgpID0+IG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB2YXIgcmVtb3ZlciA9ICgpID0+IHtcbiAgICAgIHJlbW92ZSgpO1xuICAgICAgcmVtb3ZlID0gKCkgPT4ge307XG4gICAgfTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHJlbW92ZXIoKSk7XG4gICAgcmV0dXJuIHJlbW92ZXI7XG4gIH1cbiAgZGV0YWNoKCkge1xuICAgIGZvciAodmFyIG4gaW4gdGhpcy5ub2Rlcykge1xuICAgICAgdGhpcy5ub2Rlc1tuXS5yZW1vdmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9kZXM7XG4gIH1cbn1cbmV4cG9ydHMuVmlldyA9IFZpZXc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVmlldywgJ3RlbXBsYXRlcycsIHtcbiAgdmFsdWU6IG5ldyBNYXAoKVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVmlldywgJ3JlZkNsYXNzZXMnLCB7XG4gIHZhbHVlOiBuZXcgTWFwKClcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlZpZXdMaXN0ID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIF9TZXRNYXAgPSByZXF1aXJlKFwiLi9TZXRNYXBcIik7XG52YXIgX0JhZyA9IHJlcXVpcmUoXCIuL0JhZ1wiKTtcbmNsYXNzIFZpZXdMaXN0IHtcbiAgY29uc3RydWN0b3IodGVtcGxhdGUsIHN1YlByb3BlcnR5LCBsaXN0LCBwYXJlbnQsIGtleVByb3BlcnR5ID0gbnVsbCwgdmlld0NsYXNzID0gbnVsbCkge1xuICAgIHRoaXMucmVtb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuYXJncyA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgdGhpcy5hcmdzLnZhbHVlID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShsaXN0IHx8IE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgIHRoaXMuc3ViQXJncyA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgdGhpcy52aWV3cyA9IFtdO1xuICAgIHRoaXMuY2xlYW51cCA9IFtdO1xuICAgIHRoaXMudmlld0NsYXNzID0gdmlld0NsYXNzO1xuICAgIHRoaXMuX29uUmVtb3ZlID0gbmV3IF9CYWcuQmFnKCk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHRoaXMuc3ViUHJvcGVydHkgPSBzdWJQcm9wZXJ0eTtcbiAgICB0aGlzLmtleVByb3BlcnR5ID0ga2V5UHJvcGVydHk7XG4gICAgdGhpcy50YWcgPSBudWxsO1xuICAgIHRoaXMuZG93bkRlYmluZCA9IFtdO1xuICAgIHRoaXMudXBEZWJpbmQgPSBbXTtcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMudmlld0NvdW50ID0gMDtcbiAgICB0aGlzLnJlbmRlcmVkID0gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KSA9PiB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbmRlckNvbXBsZXRlJywge1xuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgdmFsdWU6IGFjY2VwdFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy53aWxsUmVSZW5kZXIgPSBmYWxzZTtcbiAgICB0aGlzLmFyZ3MuX19fYmVmb3JlKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICBpZiAoZSA9PSAnYmluZFRvJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLnBhdXNlZCA9IHRydWU7XG4gICAgfSk7XG4gICAgdGhpcy5hcmdzLl9fX2FmdGVyKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICBpZiAoZSA9PSAnYmluZFRvJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLnBhdXNlZCA9IHMubGVuZ3RoID4gMTtcbiAgICAgIHRoaXMucmVSZW5kZXIoKTtcbiAgICB9KTtcbiAgICB2YXIgZGViaW5kID0gdGhpcy5hcmdzLnZhbHVlLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBrayA9IGs7XG4gICAgICBpZiAodHlwZW9mIGsgPT09ICdzeW1ib2wnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChpc05hTihrKSkge1xuICAgICAgICBrayA9ICdfJyArIGs7XG4gICAgICB9XG4gICAgICBpZiAoZCkge1xuICAgICAgICBpZiAodGhpcy52aWV3c1tra10pIHtcbiAgICAgICAgICB0aGlzLnZpZXdzW2trXS5yZW1vdmUodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHRoaXMudmlld3Nba2tdO1xuICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgICAgICBpZiAoIXRoaXMudmlld3NbaV0pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNOYU4oaSkpIHtcbiAgICAgICAgICAgIHRoaXMudmlld3NbaV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IGkuc3Vic3RyKDEpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudmlld3NbaV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IGk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMudmlld3Nba2tdKSB7XG4gICAgICAgIGlmICghdGhpcy52aWV3Q291bnQpIHtcbiAgICAgICAgICB0aGlzLnJlUmVuZGVyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRoaXMud2lsbFJlUmVuZGVyID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy53aWxsUmVSZW5kZXIgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICAgICAgICB0aGlzLndpbGxSZVJlbmRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICB0aGlzLnJlUmVuZGVyKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpcy52aWV3c1tra10gJiYgdGhpcy52aWV3c1tra10uYXJncykge1xuICAgICAgICB0aGlzLnZpZXdzW2trXS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gaztcbiAgICAgICAgdGhpcy52aWV3c1tra10uYXJnc1t0aGlzLnN1YlByb3BlcnR5XSA9IHY7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAgd2FpdDogMFxuICAgIH0pO1xuICAgIHRoaXMuX29uUmVtb3ZlLmFkZChkZWJpbmQpO1xuICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyh0aGlzKTtcbiAgfVxuICByZW5kZXIodGFnKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgcmVuZGVycyA9IFtdO1xuICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uICh2aWV3KSB7XG4gICAgICB2aWV3LnZpZXdMaXN0ID0gX3RoaXM7XG4gICAgICB2aWV3LnJlbmRlcih0YWcsIG51bGwsIF90aGlzLnBhcmVudCk7XG4gICAgICByZW5kZXJzLnB1c2godmlldy5yZW5kZXJlZC50aGVuKCgpID0+IHZpZXcpKTtcbiAgICB9O1xuICAgIGZvciAodmFyIHZpZXcgb2YgdGhpcy52aWV3cykge1xuICAgICAgX2xvb3Aodmlldyk7XG4gICAgfVxuICAgIHRoaXMudGFnID0gdGFnO1xuICAgIFByb21pc2UuYWxsKHJlbmRlcnMpLnRoZW4odmlld3MgPT4gdGhpcy5yZW5kZXJDb21wbGV0ZSh2aWV3cykpO1xuICAgIHRoaXMucGFyZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsaXN0UmVuZGVyZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAga2V5OiB0aGlzLnN1YlByb3BlcnR5LFxuICAgICAgICAgIHZhbHVlOiB0aGlzLmFyZ3MudmFsdWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuICByZVJlbmRlcigpIHtcbiAgICB2YXIgX3RoaXMyID0gdGhpcztcbiAgICBpZiAodGhpcy5wYXVzZWQgfHwgIXRoaXMudGFnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB2aWV3cyA9IFtdO1xuICAgIHZhciBleGlzdGluZ1ZpZXdzID0gbmV3IF9TZXRNYXAuU2V0TWFwKCk7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICB2YXIgdmlldyA9IHRoaXMudmlld3NbaV07XG4gICAgICBpZiAodmlldyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZpZXdzW2ldID0gdmlldztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgcmF3VmFsdWUgPSB2aWV3LmFyZ3NbdGhpcy5zdWJQcm9wZXJ0eV07XG4gICAgICBleGlzdGluZ1ZpZXdzLmFkZChyYXdWYWx1ZSwgdmlldyk7XG4gICAgICB2aWV3c1tpXSA9IHZpZXc7XG4gICAgfVxuICAgIHZhciBmaW5hbFZpZXdzID0gW107XG4gICAgdmFyIGZpbmFsVmlld1NldCA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLmRvd25EZWJpbmQubGVuZ3RoICYmIHRoaXMuZG93bkRlYmluZC5mb3JFYWNoKGQgPT4gZCAmJiBkKCkpO1xuICAgIHRoaXMudXBEZWJpbmQubGVuZ3RoICYmIHRoaXMudXBEZWJpbmQuZm9yRWFjaChkID0+IGQgJiYgZCgpKTtcbiAgICB0aGlzLnVwRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5kb3duRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgdmFyIG1pbktleSA9IEluZmluaXR5O1xuICAgIHZhciBhbnRlTWluS2V5ID0gSW5maW5pdHk7XG4gICAgdmFyIF9sb29wMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgICAgdmFyIGsgPSBfaTtcbiAgICAgIGlmIChpc05hTihrKSkge1xuICAgICAgICBrID0gJ18nICsgX2k7XG4gICAgICB9IGVsc2UgaWYgKFN0cmluZyhrKS5sZW5ndGgpIHtcbiAgICAgICAgayA9IE51bWJlcihrKTtcbiAgICAgIH1cbiAgICAgIGlmIChfdGhpczIuYXJncy52YWx1ZVtfaV0gIT09IHVuZGVmaW5lZCAmJiBleGlzdGluZ1ZpZXdzLmhhcyhfdGhpczIuYXJncy52YWx1ZVtfaV0pKSB7XG4gICAgICAgIHZhciBleGlzdGluZ1ZpZXcgPSBleGlzdGluZ1ZpZXdzLmdldE9uZShfdGhpczIuYXJncy52YWx1ZVtfaV0pO1xuICAgICAgICBpZiAoZXhpc3RpbmdWaWV3KSB7XG4gICAgICAgICAgZXhpc3RpbmdWaWV3LmFyZ3NbX3RoaXMyLmtleVByb3BlcnR5XSA9IF9pO1xuICAgICAgICAgIGZpbmFsVmlld3Nba10gPSBleGlzdGluZ1ZpZXc7XG4gICAgICAgICAgZmluYWxWaWV3U2V0LmFkZChleGlzdGluZ1ZpZXcpO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoIWlzTmFOKGspKSB7XG4gICAgICAgICAgICBtaW5LZXkgPSBNYXRoLm1pbihtaW5LZXksIGspO1xuICAgICAgICAgICAgayA+IDAgJiYgKGFudGVNaW5LZXkgPSBNYXRoLm1pbihhbnRlTWluS2V5LCBrKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV4aXN0aW5nVmlld3MucmVtb3ZlKF90aGlzMi5hcmdzLnZhbHVlW19pXSwgZXhpc3RpbmdWaWV3KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICB2YXIgdmlld0FyZ3MgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICB2YXIgX3ZpZXcgPSBmaW5hbFZpZXdzW2tdID0gbmV3IF90aGlzMi52aWV3Q2xhc3Modmlld0FyZ3MsIF90aGlzMi5wYXJlbnQpO1xuICAgICAgICBpZiAoIWlzTmFOKGspKSB7XG4gICAgICAgICAgbWluS2V5ID0gTWF0aC5taW4obWluS2V5LCBrKTtcbiAgICAgICAgICBrID4gMCAmJiAoYW50ZU1pbktleSA9IE1hdGgubWluKGFudGVNaW5LZXksIGspKTtcbiAgICAgICAgfVxuICAgICAgICBmaW5hbFZpZXdzW2tdLnRlbXBsYXRlID0gX3RoaXMyLnRlbXBsYXRlO1xuICAgICAgICBmaW5hbFZpZXdzW2tdLnZpZXdMaXN0ID0gX3RoaXMyO1xuICAgICAgICBmaW5hbFZpZXdzW2tdLmFyZ3NbX3RoaXMyLmtleVByb3BlcnR5XSA9IF9pO1xuICAgICAgICBmaW5hbFZpZXdzW2tdLmFyZ3NbX3RoaXMyLnN1YlByb3BlcnR5XSA9IF90aGlzMi5hcmdzLnZhbHVlW19pXTtcbiAgICAgICAgX3RoaXMyLnVwRGViaW5kW2tdID0gdmlld0FyZ3MuYmluZFRvKF90aGlzMi5zdWJQcm9wZXJ0eSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICB2YXIgaW5kZXggPSB2aWV3QXJnc1tfdGhpczIua2V5UHJvcGVydHldO1xuICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICBkZWxldGUgX3RoaXMyLmFyZ3MudmFsdWVbaW5kZXhdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfdGhpczIuYXJncy52YWx1ZVtpbmRleF0gPSB2O1xuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMyLmRvd25EZWJpbmRba10gPSBfdGhpczIuc3ViQXJncy5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICBpZiAoZCkge1xuICAgICAgICAgICAgZGVsZXRlIHZpZXdBcmdzW2tdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2aWV3QXJnc1trXSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgdXBEZWJpbmQgPSAoKSA9PiB7XG4gICAgICAgICAgX3RoaXMyLnVwRGViaW5kLmZpbHRlcih4ID0+IHgpLmZvckVhY2goZCA9PiBkKCkpO1xuICAgICAgICAgIF90aGlzMi51cERlYmluZC5sZW5ndGggPSAwO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZG93bkRlYmluZCA9ICgpID0+IHtcbiAgICAgICAgICBfdGhpczIuZG93bkRlYmluZC5maWx0ZXIoeCA9PiB4KS5mb3JFYWNoKGQgPT4gZCgpKTtcbiAgICAgICAgICBfdGhpczIuZG93bkRlYmluZC5sZW5ndGggPSAwO1xuICAgICAgICB9O1xuICAgICAgICBfdmlldy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5yZW1vdmUodXBEZWJpbmQpO1xuICAgICAgICAgIF90aGlzMi5fb25SZW1vdmUucmVtb3ZlKGRvd25EZWJpbmQpO1xuICAgICAgICAgIF90aGlzMi51cERlYmluZFtrXSAmJiBfdGhpczIudXBEZWJpbmRba10oKTtcbiAgICAgICAgICBfdGhpczIuZG93bkRlYmluZFtrXSAmJiBfdGhpczIuZG93bkRlYmluZFtrXSgpO1xuICAgICAgICAgIGRlbGV0ZSBfdGhpczIudXBEZWJpbmRba107XG4gICAgICAgICAgZGVsZXRlIF90aGlzMi5kb3duRGViaW5kW2tdO1xuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5hZGQodXBEZWJpbmQpO1xuICAgICAgICBfdGhpczIuX29uUmVtb3ZlLmFkZChkb3duRGViaW5kKTtcbiAgICAgICAgdmlld0FyZ3NbX3RoaXMyLnN1YlByb3BlcnR5XSA9IF90aGlzMi5hcmdzLnZhbHVlW19pXTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZvciAodmFyIF9pIGluIHRoaXMuYXJncy52YWx1ZSkge1xuICAgICAgX2xvb3AyKCk7XG4gICAgfVxuICAgIGZvciAodmFyIF9pMiBpbiB2aWV3cykge1xuICAgICAgaWYgKHZpZXdzW19pMl0gJiYgIWZpbmFsVmlld1NldC5oYXModmlld3NbX2kyXSkpIHtcbiAgICAgICAgdmlld3NbX2kyXS5yZW1vdmUodHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMuYXJncy52YWx1ZSkpIHtcbiAgICAgIHZhciBsb2NhbE1pbiA9IG1pbktleSA9PT0gMCAmJiBmaW5hbFZpZXdzWzFdICE9PSB1bmRlZmluZWQgJiYgZmluYWxWaWV3cy5sZW5ndGggPiAxIHx8IGFudGVNaW5LZXkgPT09IEluZmluaXR5ID8gbWluS2V5IDogYW50ZU1pbktleTtcbiAgICAgIHZhciByZW5kZXJSZWN1cnNlID0gKGkgPSAwKSA9PiB7XG4gICAgICAgIHZhciBpaSA9IGZpbmFsVmlld3MubGVuZ3RoIC0gaSAtIDE7XG4gICAgICAgIHdoaWxlIChpaSA+IGxvY2FsTWluICYmIGZpbmFsVmlld3NbaWldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpaS0tO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpaSA8IGxvY2FsTWluKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaW5hbFZpZXdzW2lpXSA9PT0gdGhpcy52aWV3c1tpaV0pIHtcbiAgICAgICAgICBpZiAoZmluYWxWaWV3c1tpaV0gJiYgIWZpbmFsVmlld3NbaWldLmZpcnN0Tm9kZSkge1xuICAgICAgICAgICAgZmluYWxWaWV3c1tpaV0ucmVuZGVyKHRoaXMudGFnLCBmaW5hbFZpZXdzW2lpICsgMV0sIHRoaXMucGFyZW50KTtcbiAgICAgICAgICAgIHJldHVybiBmaW5hbFZpZXdzW2lpXS5yZW5kZXJlZC50aGVuKCgpID0+IHJlbmRlclJlY3Vyc2UoTnVtYmVyKGkpICsgMSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgc3BsaXQgPSA1MDA7XG4gICAgICAgICAgICBpZiAoaSA9PT0gMCB8fCBpICUgc3BsaXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlbmRlclJlY3Vyc2UoTnVtYmVyKGkpICsgMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYWNjZXB0ID0+IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBhY2NlcHQocmVuZGVyUmVjdXJzZShOdW1iZXIoaSkgKyAxKSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxWaWV3c1tpaV0ucmVuZGVyKHRoaXMudGFnLCBmaW5hbFZpZXdzW2lpICsgMV0sIHRoaXMucGFyZW50KTtcbiAgICAgICAgdGhpcy52aWV3cy5zcGxpY2UoaWksIDAsIGZpbmFsVmlld3NbaWldKTtcbiAgICAgICAgcmV0dXJuIGZpbmFsVmlld3NbaWldLnJlbmRlcmVkLnRoZW4oKCkgPT4gcmVuZGVyUmVjdXJzZShpICsgMSkpO1xuICAgICAgfTtcbiAgICAgIHRoaXMucmVuZGVyZWQgPSByZW5kZXJSZWN1cnNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciByZW5kZXJzID0gW107XG4gICAgICB2YXIgbGVmdG92ZXJzID0gT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKG51bGwpLCBmaW5hbFZpZXdzKTtcbiAgICAgIHZhciBpc0ludCA9IHggPT4gcGFyc2VJbnQoeCkgPT09IHggLSAwO1xuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhmaW5hbFZpZXdzKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIGlmIChpc0ludChhKSAmJiBpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiBNYXRoLnNpZ24oYSAtIGIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNJbnQoYSkgJiYgIWlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc0ludChhKSAmJiBpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNJbnQoYSkgJiYgIWlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIF9sb29wMyA9IGZ1bmN0aW9uIChfaTMpIHtcbiAgICAgICAgZGVsZXRlIGxlZnRvdmVyc1tfaTNdO1xuICAgICAgICBpZiAoZmluYWxWaWV3c1tfaTNdLmZpcnN0Tm9kZSAmJiBmaW5hbFZpZXdzW19pM10gPT09IF90aGlzMi52aWV3c1tfaTNdKSB7XG4gICAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgZmluYWxWaWV3c1tfaTNdLnJlbmRlcihfdGhpczIudGFnLCBudWxsLCBfdGhpczIucGFyZW50KTtcbiAgICAgICAgcmVuZGVycy5wdXNoKGZpbmFsVmlld3NbX2kzXS5yZW5kZXJlZC50aGVuKCgpID0+IGZpbmFsVmlld3NbX2kzXSkpO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIF9pMyBvZiBrZXlzKSB7XG4gICAgICAgIGlmIChfbG9vcDMoX2kzKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaTQgaW4gbGVmdG92ZXJzKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmFyZ3Mudmlld3NbX2k0XTtcbiAgICAgICAgbGVmdG92ZXJzLnJlbW92ZSh0cnVlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVuZGVyZWQgPSBQcm9taXNlLmFsbChyZW5kZXJzKTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2k1IGluIGZpbmFsVmlld3MpIHtcbiAgICAgIGlmIChpc05hTihfaTUpKSB7XG4gICAgICAgIGZpbmFsVmlld3NbX2k1XS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gX2k1LnN1YnN0cigxKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmaW5hbFZpZXdzW19pNV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IF9pNTtcbiAgICB9XG4gICAgdGhpcy52aWV3cyA9IEFycmF5LmlzQXJyYXkodGhpcy5hcmdzLnZhbHVlKSA/IFsuLi5maW5hbFZpZXdzXSA6IGZpbmFsVmlld3M7XG4gICAgdGhpcy52aWV3Q291bnQgPSBmaW5hbFZpZXdzLmxlbmd0aDtcbiAgICBmaW5hbFZpZXdTZXQuY2xlYXIoKTtcbiAgICB0aGlzLndpbGxSZVJlbmRlciA9IGZhbHNlO1xuICAgIHRoaXMucmVuZGVyZWQudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLnBhcmVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdFJlbmRlcmVkJywge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIGtleTogdGhpcy5zdWJQcm9wZXJ0eSxcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLmFyZ3MudmFsdWUsXG4gICAgICAgICAgICB0YWc6IHRoaXMudGFnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgICB0aGlzLnRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdFJlbmRlcmVkJywge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIGtleTogdGhpcy5zdWJQcm9wZXJ0eSxcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLmFyZ3MudmFsdWUsXG4gICAgICAgICAgICB0YWc6IHRoaXMudGFnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyZWQ7XG4gIH1cbiAgcGF1c2UocGF1c2UgPSB0cnVlKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICB0aGlzLnZpZXdzW2ldLnBhdXNlKHBhdXNlKTtcbiAgICB9XG4gIH1cbiAgb25SZW1vdmUoY2FsbGJhY2spIHtcbiAgICB0aGlzLl9vblJlbW92ZS5hZGQoY2FsbGJhY2spO1xuICB9XG4gIHJlbW92ZSgpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgIHRoaXMudmlld3NbaV0gJiYgdGhpcy52aWV3c1tpXS5yZW1vdmUodHJ1ZSk7XG4gICAgfVxuICAgIHZhciBvblJlbW92ZSA9IHRoaXMuX29uUmVtb3ZlLml0ZW1zKCk7XG4gICAgZm9yICh2YXIgX2k2IGluIG9uUmVtb3ZlKSB7XG4gICAgICB0aGlzLl9vblJlbW92ZS5yZW1vdmUob25SZW1vdmVbX2k2XSk7XG4gICAgICBvblJlbW92ZVtfaTZdKCk7XG4gICAgfVxuICAgIHZhciBjbGVhbnVwO1xuICAgIHdoaWxlICh0aGlzLmNsZWFudXAubGVuZ3RoKSB7XG4gICAgICBjbGVhbnVwID0gdGhpcy5jbGVhbnVwLnBvcCgpO1xuICAgICAgY2xlYW51cCgpO1xuICAgIH1cbiAgICB0aGlzLnZpZXdzID0gW107XG4gICAgd2hpbGUgKHRoaXMudGFnICYmIHRoaXMudGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMudGFnLnJlbW92ZUNoaWxkKHRoaXMudGFnLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdWJBcmdzKSB7XG4gICAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzLnN1YkFyZ3MpO1xuICAgIH1cbiAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzLmFyZ3MpO1xuXG4gICAgLy8gaWYodGhpcy5hcmdzLnZhbHVlICYmICF0aGlzLmFyZ3MudmFsdWUuaXNCb3VuZCgpKVxuICAgIC8vIHtcbiAgICAvLyBcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcy5hcmdzLnZhbHVlKTtcbiAgICAvLyB9XG5cbiAgICB0aGlzLnJlbW92ZWQgPSB0cnVlO1xuICB9XG59XG5leHBvcnRzLlZpZXdMaXN0ID0gVmlld0xpc3Q7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvaW5wdXQvS2V5Ym9hcmQuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLktleWJvYXJkID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuLi9iYXNlL0JpbmRhYmxlXCIpO1xuY2xhc3MgS2V5Ym9hcmQge1xuICBzdGF0aWMgZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlID0gdGhpcy5pbnN0YW5jZSB8fCBfQmluZGFibGUuQmluZGFibGUubWFrZShuZXcgdGhpcygpKTtcbiAgfVxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm1heERlY2F5ID0gMTIwO1xuICAgIHRoaXMuY29tYm9UaW1lID0gNTAwO1xuICAgIHRoaXMubGlzdGVuaW5nID0gZmFsc2U7XG4gICAgdGhpcy5mb2N1c0VsZW1lbnQgPSBkb2N1bWVudC5ib2R5O1xuICAgIHRoaXNbX0JpbmRhYmxlLkJpbmRhYmxlLk5vR2V0dGVyc10gPSB0cnVlO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY29tYm8nLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoW10pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd3aGljaHMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjb2RlcycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2tleXMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVzc2VkV2hpY2gnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVzc2VkQ29kZScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZXNzZWRLZXknLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZWxlYXNlZFdoaWNoJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVsZWFzZWRDb2RlJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVsZWFzZWRLZXknLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdrZXlSZWZzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZXZlbnQgPT4ge1xuICAgICAgaWYgKCF0aGlzLmxpc3RlbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoISh0aGlzLmtleXNbZXZlbnQua2V5XSA+IDApICYmIHRoaXMuZm9jdXNFbGVtZW50ICYmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgIT09IHRoaXMuZm9jdXNFbGVtZW50ICYmICghdGhpcy5mb2N1c0VsZW1lbnQuY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkgfHwgZG9jdW1lbnQuYWN0aXZlRWxlbWVudC5tYXRjaGVzKCdpbnB1dCx0ZXh0YXJlYScpKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5yZWxlYXNlZFdoaWNoW2V2ZW50LndoaWNoXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnJlbGVhc2VkQ29kZVtldmVudC5jb2RlXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnJlbGVhc2VkS2V5W2V2ZW50LmtleV0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy53aGljaHNbZXZlbnQud2hpY2hdID0gLTE7XG4gICAgICB0aGlzLmNvZGVzW2V2ZW50LmNvZGVdID0gLTE7XG4gICAgICB0aGlzLmtleXNbZXZlbnQua2V5XSA9IC0xO1xuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBldmVudCA9PiB7XG4gICAgICBpZiAoIXRoaXMubGlzdGVuaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmZvY3VzRWxlbWVudCAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ICE9PSB0aGlzLmZvY3VzRWxlbWVudCAmJiAoIXRoaXMuZm9jdXNFbGVtZW50LmNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHx8IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQubWF0Y2hlcygnaW5wdXQsdGV4dGFyZWEnKSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChldmVudC5yZXBlYXQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5jb21iby5wdXNoKGV2ZW50LmNvZGUpO1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY29tYm9UaW1lcik7XG4gICAgICB0aGlzLmNvbWJvVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuY29tYm8uc3BsaWNlKDApLCB0aGlzLmNvbWJvVGltZSk7XG4gICAgICB0aGlzLnByZXNzZWRXaGljaFtldmVudC53aGljaF0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5wcmVzc2VkQ29kZVtldmVudC5jb2RlXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnByZXNzZWRLZXlbZXZlbnQua2V5XSA9IERhdGUubm93KCk7XG4gICAgICBpZiAodGhpcy5rZXlzW2V2ZW50LmtleV0gPiAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMud2hpY2hzW2V2ZW50LndoaWNoXSA9IDE7XG4gICAgICB0aGlzLmNvZGVzW2V2ZW50LmNvZGVdID0gMTtcbiAgICAgIHRoaXMua2V5c1tldmVudC5rZXldID0gMTtcbiAgICB9KTtcbiAgICB2YXIgd2luZG93Qmx1ciA9IGV2ZW50ID0+IHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5rZXlzKSB7XG4gICAgICAgIGlmICh0aGlzLmtleXNbaV0gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWxlYXNlZEtleVtpXSA9IERhdGUubm93KCk7XG4gICAgICAgIHRoaXMua2V5c1tpXSA9IC0xO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2kgaW4gdGhpcy5jb2Rlcykge1xuICAgICAgICBpZiAodGhpcy5jb2Rlc1tfaV0gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWxlYXNlZENvZGVbX2ldID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdGhpcy5jb2Rlc1tfaV0gPSAtMTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pMiBpbiB0aGlzLndoaWNocykge1xuICAgICAgICBpZiAodGhpcy53aGljaHNbX2kyXSA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbGVhc2VkV2hpY2hbX2kyXSA9IERhdGUubm93KCk7XG4gICAgICAgIHRoaXMud2hpY2hzW19pMl0gPSAtMTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgd2luZG93Qmx1cik7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBpZiAoZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlID09PSAndmlzaWJsZScpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgd2luZG93Qmx1cigpO1xuICAgIH0pO1xuICB9XG4gIGdldEtleVJlZihrZXlDb2RlKSB7XG4gICAgdmFyIGtleVJlZiA9IHRoaXMua2V5UmVmc1trZXlDb2RlXSA9IHRoaXMua2V5UmVmc1trZXlDb2RlXSB8fCBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSk7XG4gICAgcmV0dXJuIGtleVJlZjtcbiAgfVxuICBnZXRLZXlUaW1lKGtleSkge1xuICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRLZXlba2V5XTtcbiAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZEtleVtrZXldO1xuICAgIGlmICghcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHByZXNzZWQ7XG4gICAgfVxuICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICB9XG4gIGdldENvZGVUaW1lKGNvZGUpIHtcbiAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkQ29kZVtjb2RlXTtcbiAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZENvZGVbY29kZV07XG4gICAgaWYgKCFwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gcHJlc3NlZDtcbiAgICB9XG4gICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gIH1cbiAgZ2V0V2hpY2hUaW1lKGNvZGUpIHtcbiAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkV2hpY2hbY29kZV07XG4gICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRXaGljaFtjb2RlXTtcbiAgICBpZiAoIXByZXNzZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBwcmVzc2VkO1xuICAgIH1cbiAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgfVxuICBnZXRLZXkoa2V5KSB7XG4gICAgaWYgKCF0aGlzLmtleXNba2V5XSkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmtleXNba2V5XTtcbiAgfVxuICBnZXRLZXlDb2RlKGNvZGUpIHtcbiAgICBpZiAoIXRoaXMuY29kZXNbY29kZV0pIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb2Rlc1tjb2RlXTtcbiAgfVxuICByZXNldCgpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMua2V5cykge1xuICAgICAgZGVsZXRlIHRoaXMua2V5c1tpXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmNvZGVzKSB7XG4gICAgICBkZWxldGUgdGhpcy5jb2Rlc1tpXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLndoaWNocykge1xuICAgICAgZGVsZXRlIHRoaXMud2hpY2hzW2ldO1xuICAgIH1cbiAgfVxuICB1cGRhdGUoKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmtleXMpIHtcbiAgICAgIGlmICh0aGlzLmtleXNbaV0gPiAwKSB7XG4gICAgICAgIHRoaXMua2V5c1tpXSsrO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmtleXNbaV0gPiAtdGhpcy5tYXhEZWNheSkge1xuICAgICAgICB0aGlzLmtleXNbaV0tLTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmtleXNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5jb2Rlcykge1xuICAgICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZENvZGVbaV07XG4gICAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZENvZGVbaV07XG4gICAgICB2YXIga2V5UmVmID0gdGhpcy5nZXRLZXlSZWYoaSk7XG4gICAgICBpZiAodGhpcy5jb2Rlc1tpXSA+IDApIHtcbiAgICAgICAga2V5UmVmLmZyYW1lcyA9IHRoaXMuY29kZXNbaV0rKztcbiAgICAgICAga2V5UmVmLnRpbWUgPSBwcmVzc2VkID8gRGF0ZS5ub3coKSAtIHByZXNzZWQgOiAwO1xuICAgICAgICBrZXlSZWYuZG93biA9IHRydWU7XG4gICAgICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmNvZGVzW2ldID4gLXRoaXMubWF4RGVjYXkpIHtcbiAgICAgICAga2V5UmVmLmZyYW1lcyA9IHRoaXMuY29kZXNbaV0tLTtcbiAgICAgICAga2V5UmVmLnRpbWUgPSByZWxlYXNlZCAtIERhdGUubm93KCk7XG4gICAgICAgIGtleVJlZi5kb3duID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBrZXlSZWYuZnJhbWVzID0gMDtcbiAgICAgICAga2V5UmVmLnRpbWUgPSAwO1xuICAgICAgICBrZXlSZWYuZG93biA9IGZhbHNlO1xuICAgICAgICBkZWxldGUgdGhpcy5jb2Rlc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLndoaWNocykge1xuICAgICAgaWYgKHRoaXMud2hpY2hzW2ldID4gMCkge1xuICAgICAgICB0aGlzLndoaWNoc1tpXSsrO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLndoaWNoc1tpXSA+IC10aGlzLm1heERlY2F5KSB7XG4gICAgICAgIHRoaXMud2hpY2hzW2ldLS07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy53aGljaHNbaV07XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5leHBvcnRzLktleWJvYXJkID0gS2V5Ym9hcmQ7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvbWl4aW4vRXZlbnRUYXJnZXRNaXhpbi5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuRXZlbnRUYXJnZXRNaXhpbiA9IHZvaWQgMDtcbnZhciBfTWl4aW4gPSByZXF1aXJlKFwiLi4vYmFzZS9NaXhpblwiKTtcbnZhciBFdmVudFRhcmdldFBhcmVudCA9IFN5bWJvbCgnRXZlbnRUYXJnZXRQYXJlbnQnKTtcbnZhciBDYWxsSGFuZGxlciA9IFN5bWJvbCgnQ2FsbEhhbmRsZXInKTtcbnZhciBDYXB0dXJlID0gU3ltYm9sKCdDYXB0dXJlJyk7XG52YXIgQnViYmxlID0gU3ltYm9sKCdCdWJibGUnKTtcbnZhciBUYXJnZXQgPSBTeW1ib2woJ1RhcmdldCcpO1xudmFyIEhhbmRsZXJzQnViYmxlID0gU3ltYm9sKCdIYW5kbGVyc0J1YmJsZScpO1xudmFyIEhhbmRsZXJzQ2FwdHVyZSA9IFN5bWJvbCgnSGFuZGxlcnNDYXB0dXJlJyk7XG52YXIgRXZlbnRUYXJnZXRNaXhpbiA9IGV4cG9ydHMuRXZlbnRUYXJnZXRNaXhpbiA9IHtcbiAgW19NaXhpbi5NaXhpbi5Db25zdHJ1Y3Rvcl0oKSB7XG4gICAgdGhpc1tIYW5kbGVyc0NhcHR1cmVdID0gbmV3IE1hcCgpO1xuICAgIHRoaXNbSGFuZGxlcnNCdWJibGVdID0gbmV3IE1hcCgpO1xuICB9LFxuICBkaXNwYXRjaEV2ZW50KC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGlmICh0eXBlb2YgZXZlbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBldmVudCA9IG5ldyBDdXN0b21FdmVudChldmVudCk7XG4gICAgICBhcmdzWzBdID0gZXZlbnQ7XG4gICAgfVxuICAgIGV2ZW50LmN2UGF0aCA9IGV2ZW50LmN2UGF0aCB8fCBbXTtcbiAgICBldmVudC5jdlRhcmdldCA9IGV2ZW50LmN2Q3VycmVudFRhcmdldCA9IHRoaXM7XG4gICAgdmFyIHJlc3VsdCA9IHRoaXNbQ2FwdHVyZV0oLi4uYXJncyk7XG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgaWYgKHRoaXNbSGFuZGxlcnNDYXB0dXJlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHZhciBoYW5kbGVyTWFwID0gdGhpc1tIYW5kbGVyc0NhcHR1cmVdLmdldChldmVudC50eXBlKTtcbiAgICAgIHZhciBuZXdIYW5kbGVycyA9IFsuLi5oYW5kbGVyTWFwXTtcbiAgICAgIG5ld0hhbmRsZXJzLmZvckVhY2goaCA9PiBoLnB1c2goaGFuZGxlck1hcCkpO1xuICAgICAgaGFuZGxlcnMucHVzaCguLi5uZXdIYW5kbGVycyk7XG4gICAgfVxuICAgIGlmICh0aGlzW0hhbmRsZXJzQnViYmxlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHZhciBfaGFuZGxlck1hcCA9IHRoaXNbSGFuZGxlcnNCdWJibGVdLmdldChldmVudC50eXBlKTtcbiAgICAgIHZhciBfbmV3SGFuZGxlcnMgPSBbLi4uX2hhbmRsZXJNYXBdO1xuICAgICAgX25ld0hhbmRsZXJzLmZvckVhY2goaCA9PiBoLnB1c2goX2hhbmRsZXJNYXApKTtcbiAgICAgIGhhbmRsZXJzLnB1c2goLi4uX25ld0hhbmRsZXJzKTtcbiAgICB9XG4gICAgaGFuZGxlcnMucHVzaChbKCkgPT4gdGhpc1tDYWxsSGFuZGxlcl0oLi4uYXJncyksIHt9LCBudWxsXSk7XG4gICAgZm9yICh2YXIgW2hhbmRsZXIsIG9wdGlvbnMsIG1hcF0gb2YgaGFuZGxlcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgbWFwLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgcmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFldmVudC5jYW5jZWxhYmxlIHx8ICFldmVudC5jYW5jZWxCdWJibGUgJiYgcmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgdGhpc1tCdWJibGVdKC4uLmFyZ3MpO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdKSB7XG4gICAgICBPYmplY3QuZnJlZXplKGV2ZW50LmN2UGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBldmVudC5yZXR1cm5WYWx1ZTtcbiAgfSxcbiAgYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgIHVzZUNhcHR1cmU6IHRydWVcbiAgICAgIH07XG4gICAgfVxuICAgIHZhciBoYW5kbGVycyA9IEhhbmRsZXJzQnViYmxlO1xuICAgIGlmIChvcHRpb25zLnVzZUNhcHR1cmUpIHtcbiAgICAgIGhhbmRsZXJzID0gSGFuZGxlcnNDYXB0dXJlO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbaGFuZGxlcnNdLmhhcyh0eXBlKSkge1xuICAgICAgdGhpc1toYW5kbGVyc10uc2V0KHR5cGUsIG5ldyBNYXAoKSk7XG4gICAgfVxuICAgIHRoaXNbaGFuZGxlcnNdLmdldCh0eXBlKS5zZXQoY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIGlmIChvcHRpb25zLnNpZ25hbCkge1xuICAgICAgb3B0aW9ucy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBldmVudCA9PiB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMpLCB7XG4gICAgICAgIG9uY2U6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgcmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgIHVzZUNhcHR1cmU6IHRydWVcbiAgICAgIH07XG4gICAgfVxuICAgIHZhciBoYW5kbGVycyA9IEhhbmRsZXJzQnViYmxlO1xuICAgIGlmIChvcHRpb25zLnVzZUNhcHR1cmUpIHtcbiAgICAgIGhhbmRsZXJzID0gSGFuZGxlcnNDYXB0dXJlO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbaGFuZGxlcnNdLmhhcyh0eXBlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzW2hhbmRsZXJzXS5nZXQodHlwZSkuZGVsZXRlKGNhbGxiYWNrKTtcbiAgfSxcbiAgW0NhcHR1cmVdKC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGV2ZW50LmN2UGF0aC5wdXNoKHRoaXMpO1xuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0NhcHR1cmVdKC4uLmFyZ3MpO1xuICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0NhcHR1cmVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBldmVudC5jdkN1cnJlbnRUYXJnZXQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XTtcbiAgICB2YXIge1xuICAgICAgdHlwZVxuICAgIH0gPSBldmVudDtcbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0NhcHR1cmVdLmdldCh0eXBlKTtcbiAgICBmb3IgKHZhciBbaGFuZGxlciwgb3B0aW9uc10gb2YgaGFuZGxlcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgaGFuZGxlcnMuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gaGFuZGxlcihldmVudCk7XG4gICAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuICBbQnViYmxlXSguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBpZiAoIWV2ZW50LmJ1YmJsZXMgfHwgIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQnViYmxlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHJldHVybiB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtCdWJibGVdKC4uLmFyZ3MpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0O1xuICAgIGV2ZW50LmN2Q3VycmVudFRhcmdldCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdO1xuICAgIHZhciB7XG4gICAgICB0eXBlXG4gICAgfSA9IGV2ZW50O1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQnViYmxlXS5nZXQoZXZlbnQudHlwZSk7XG4gICAgZm9yICh2YXIgW2hhbmRsZXIsIG9wdGlvbnNdIG9mIGhhbmRsZXJzKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgIGhhbmRsZXJzLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgcmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXN1bHQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtDYWxsSGFuZGxlcl0oLi4uYXJncyk7XG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0J1YmJsZV0oLi4uYXJncyk7XG4gIH0sXG4gIFtDYWxsSGFuZGxlcl0oLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgaWYgKGV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGRlZmF1bHRIYW5kbGVyID0gYG9uJHtldmVudC50eXBlWzBdLnRvVXBwZXJDYXNlKCkgKyBldmVudC50eXBlLnNsaWNlKDEpfWA7XG4gICAgaWYgKHR5cGVvZiB0aGlzW2RlZmF1bHRIYW5kbGVyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXNbZGVmYXVsdEhhbmRsZXJdKGV2ZW50KTtcbiAgICB9XG4gIH1cbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRXZlbnRUYXJnZXRNaXhpbiwgJ1BhcmVudCcsIHtcbiAgdmFsdWU6IEV2ZW50VGFyZ2V0UGFyZW50XG59KTtcbiAgfSkoKTtcbn0pOyIsImV4cG9ydCBjbGFzcyBDb25maWcge307XG5cbkNvbmZpZy50aXRsZSA9ICd3Z2wyZCc7XG4vLyBDb25maWcuIiwiY2xhc3MgUHJvZ3JhbVxue1xuXHRjb250ZXh0ID0gbnVsbDtcblx0cHJvZ3JhbSA9IG51bGw7XG5cblx0YXR0cmlidXRlcyA9IHt9O1xuXHRidWZmZXJzID0ge307XG5cdHVuaWZvcm1zID0ge307XG5cblx0Y29uc3RydWN0b3Ioe2dsLCB2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyLCB1bmlmb3JtcywgYXR0cmlidXRlc30pXG5cdHtcblx0XHR0aGlzLmNvbnRleHQgPSBnbDtcblx0XHR0aGlzLnByb2dyYW0gPSBnbC5jcmVhdGVQcm9ncmFtKCk7XG5cblx0XHRnbC5hdHRhY2hTaGFkZXIodGhpcy5wcm9ncmFtLCB2ZXJ0ZXhTaGFkZXIpO1xuXHRcdGdsLmF0dGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIGZyYWdtZW50U2hhZGVyKTtcblxuXHRcdGdsLmxpbmtQcm9ncmFtKHRoaXMucHJvZ3JhbSk7XG5cblx0XHRnbC5kZXRhY2hTaGFkZXIodGhpcy5wcm9ncmFtLCB2ZXJ0ZXhTaGFkZXIpO1xuXHRcdGdsLmRldGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIGZyYWdtZW50U2hhZGVyKTtcblxuXHRcdGdsLmRlbGV0ZVNoYWRlcih2ZXJ0ZXhTaGFkZXIpO1xuXHRcdGdsLmRlbGV0ZVNoYWRlcihmcmFnbWVudFNoYWRlcik7XG5cblx0XHRpZighZ2wuZ2V0UHJvZ3JhbVBhcmFtZXRlcih0aGlzLnByb2dyYW0sIGdsLkxJTktfU1RBVFVTKSlcblx0XHR7XG5cdFx0XHRjb25zb2xlLmVycm9yKGdsLmdldFByb2dyYW1JbmZvTG9nKHRoaXMucHJvZ3JhbSkpO1xuXHRcdFx0Z2wuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXHRcdH1cblxuXHRcdGZvcihjb25zdCB1bmlmb3JtIG9mIHVuaWZvcm1zKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxvY2F0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgdW5pZm9ybSk7XG5cblx0XHRcdGlmKGxvY2F0aW9uID09PSBudWxsKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zb2xlLndhcm4oYFVuaWZvcm0gJHt1bmlmb3JtfSBub3QgZm91bmQuYCk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnVuaWZvcm1zW3VuaWZvcm1dID0gbG9jYXRpb247XG5cdFx0fVxuXG5cdFx0Zm9yKGNvbnN0IGF0dHJpYnV0ZSBvZiBhdHRyaWJ1dGVzKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxvY2F0aW9uID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5wcm9ncmFtLCBhdHRyaWJ1dGUpO1xuXG5cdFx0XHRpZihsb2NhdGlvbiA9PT0gbnVsbClcblx0XHRcdHtcblx0XHRcdFx0Y29uc29sZS53YXJuKGBBdHRyaWJ1dGUgJHthdHRyaWJ1dGV9IG5vdCBmb3VuZC5gKTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGJ1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuXG5cdFx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgYnVmZmVyKTtcblx0XHRcdGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGxvY2F0aW9uKTtcblx0XHRcdGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoXG5cdFx0XHRcdGxvY2F0aW9uXG5cdFx0XHRcdCwgMlxuXHRcdFx0XHQsIGdsLkZMT0FUXG5cdFx0XHRcdCwgZmFsc2Vcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgMFxuXHRcdFx0KTtcblxuXHRcdFx0dGhpcy5hdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPSBsb2NhdGlvbjtcblx0XHRcdHRoaXMuYnVmZmVyc1thdHRyaWJ1dGVdID0gYnVmZmVyO1xuXHRcdH1cblx0fVxuXG5cdHVzZSgpXG5cdHtcblx0XHR0aGlzLmNvbnRleHQudXNlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXHR9XG5cblx0dW5pZm9ybUYobmFtZSwgLi4uZmxvYXRzKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmNvbnRleHQ7XG5cdFx0Z2xbYHVuaWZvcm0ke2Zsb2F0cy5sZW5ndGh9ZmBdKHRoaXMudW5pZm9ybXNbbmFtZV0sIC4uLmZsb2F0cyk7XG5cdH1cblxuXHR1bmlmb3JtSShuYW1lLCAuLi5pbnRzKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmNvbnRleHQ7XG5cdFx0Z2xbYHVuaWZvcm0ke2ludHMubGVuZ3RofWlgXSh0aGlzLnVuaWZvcm1zW25hbWVdLCAuLi5pbnRzKTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgR2wyZFxue1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50KVxuXHR7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudCB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHR0aGlzLmNvbnRleHQgPSB0aGlzLmVsZW1lbnQuZ2V0Q29udGV4dCgnd2ViZ2wnKTtcblx0XHR0aGlzLnNjcmVlblNjYWxlID0gMTtcblx0XHR0aGlzLnpvb21MZXZlbCA9IDI7XG5cdH1cblxuXHRjcmVhdGVTaGFkZXIobG9jYXRpb24pXG5cdHtcblx0XHRjb25zdCBleHRlbnNpb24gPSBsb2NhdGlvbi5zdWJzdHJpbmcobG9jYXRpb24ubGFzdEluZGV4T2YoJy4nKSsxKTtcblx0XHRsZXQgICB0eXBlID0gbnVsbDtcblxuXHRcdHN3aXRjaChleHRlbnNpb24udG9VcHBlckNhc2UoKSlcblx0XHR7XG5cdFx0XHRjYXNlICdWRVJUJzpcblx0XHRcdFx0dHlwZSA9IHRoaXMuY29udGV4dC5WRVJURVhfU0hBREVSO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0ZSQUcnOlxuXHRcdFx0XHR0eXBlID0gdGhpcy5jb250ZXh0LkZSQUdNRU5UX1NIQURFUjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2hhZGVyID0gdGhpcy5jb250ZXh0LmNyZWF0ZVNoYWRlcih0eXBlKTtcblx0XHRjb25zdCBzb3VyY2UgPSByZXF1aXJlKGxvY2F0aW9uKTtcblxuXHRcdHRoaXMuY29udGV4dC5zaGFkZXJTb3VyY2Uoc2hhZGVyLCBzb3VyY2UpO1xuXHRcdHRoaXMuY29udGV4dC5jb21waWxlU2hhZGVyKHNoYWRlcik7XG5cblx0XHRjb25zdCBzdWNjZXNzID0gdGhpcy5jb250ZXh0LmdldFNoYWRlclBhcmFtZXRlcihcblx0XHRcdHNoYWRlclxuXHRcdFx0LCB0aGlzLmNvbnRleHQuQ09NUElMRV9TVEFUVVNcblx0XHQpO1xuXG5cdFx0aWYoc3VjY2Vzcylcblx0XHR7XG5cdFx0XHRyZXR1cm4gc2hhZGVyO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUuZXJyb3IodGhpcy5jb250ZXh0LmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSk7XG5cblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlU2hhZGVyKHNoYWRlcik7XG5cdH1cblxuXHRjcmVhdGVQcm9ncmFtKHt2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyLCB1bmlmb3JtcywgYXR0cmlidXRlc30pXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblxuXHRcdHJldHVybiBuZXcgUHJvZ3JhbSh7Z2wsIHZlcnRleFNoYWRlciwgZnJhZ21lbnRTaGFkZXIsIHVuaWZvcm1zLCBhdHRyaWJ1dGVzfSk7XG5cdH1cblxuXHRjcmVhdGVUZXh0dXJlKHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblx0XHRjb25zdCB0ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIHdpZHRoXG5cdFx0XHQsIGhlaWdodFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBudWxsXG5cdFx0KTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXG5cdFx0Ly8gZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUik7XG5cdFx0Ly8gZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLkxJTkVBUik7XG5cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG5cblx0XHRyZXR1cm4gdGV4dHVyZTtcblx0fVxuXG5cdGNyZWF0ZUZyYW1lYnVmZmVyKHRleHR1cmUpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblxuXHRcdGNvbnN0IGZyYW1lYnVmZmVyID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgZnJhbWVidWZmZXIpO1xuXG5cdFx0Z2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoXG5cdFx0XHRnbC5GUkFNRUJVRkZFUlxuXHRcdFx0LCBnbC5DT0xPUl9BVFRBQ0hNRU5UMFxuXHRcdFx0LCBnbC5URVhUVVJFXzJEXG5cdFx0XHQsIHRleHR1cmVcblx0XHRcdCwgMFxuXHRcdCk7XG5cblx0XHRyZXR1cm4gZnJhbWVidWZmZXI7XG5cdH1cblxuXHRlbmFibGVCbGVuZGluZygpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblx0XHRnbC5ibGVuZEZ1bmMoZ2wuU1JDX0FMUEhBLCBnbC5PTkVfTUlOVVNfU1JDX0FMUEhBKTtcblx0XHRnbC5lbmFibGUoZ2wuQkxFTkQpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBWaWV3IGFzIEJhc2VWaWV3IH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvVmlldyc7XG5pbXBvcnQgeyBLZXlib2FyZCB9IGZyb20gJ2N1cnZhdHVyZS9pbnB1dC9LZXlib2FyZCdcbmltcG9ydCB7IEJhZyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JhZyc7XG5cbmltcG9ydCB7IENvbmZpZyB9IGZyb20gJ0NvbmZpZyc7XG5cbmltcG9ydCB7IFRpbGVNYXAgfSBmcm9tICcuLi93b3JsZC9UaWxlTWFwJztcblxuaW1wb3J0IHsgU3ByaXRlQm9hcmQgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlQm9hcmQnO1xuXG5pbXBvcnQgeyBDb250cm9sbGVyIGFzIE9uU2NyZWVuSm95UGFkIH0gZnJvbSAnLi4vdWkvQ29udHJvbGxlcic7XG5cbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4uL3Nwcml0ZS9DYW1lcmEnO1xuXG5pbXBvcnQgeyBDb250cm9sbGVyIH0gZnJvbSAnLi4vbW9kZWwvQ29udHJvbGxlcic7XG5pbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlJztcbmltcG9ydCB7IFdvcmxkIH0gZnJvbSAnLi4vd29ybGQvV29ybGQnO1xuaW1wb3J0IHsgUXVhZHRyZWUgfSBmcm9tICcuLi9tYXRoL1F1YWR0cmVlJztcbmltcG9ydCB7IFJlY3RhbmdsZSB9IGZyb20gJy4uL21hdGgvUmVjdGFuZ2xlJztcbmltcG9ydCB7IFNNVHJlZSB9IGZyb20gJy4uL21hdGgvU01UcmVlJztcbmltcG9ydCB7IFBsYXllciB9IGZyb20gJy4uL21vZGVsL1BsYXllcic7XG5pbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGVTaGVldCc7XG5cbmNvbnN0IEFwcGxpY2F0aW9uID0ge307XG5cbkFwcGxpY2F0aW9uLm9uU2NyZWVuSm95UGFkID0gbmV3IE9uU2NyZWVuSm95UGFkO1xuQXBwbGljYXRpb24ua2V5Ym9hcmQgPSBLZXlib2FyZC5nZXQoKTtcblxuXG5jb25zdCBxdWFkID0gbmV3IFF1YWR0cmVlKDAsIDAsIDEwMCwgMTAwLCAwLjI1KTtcbnF1YWQuaW5zZXJ0KHt4OiAxMCwgeTogMTB9KTtcbnF1YWQuaW5zZXJ0KHt4OiAyMCwgeTogMjB9KTtcbnF1YWQuaW5zZXJ0KHt4OiAyMCwgeTogMjV9KTtcbnF1YWQuaW5zZXJ0KHt4OiAyNSwgeTogMjV9KTtcblxuLy8gY29uc29sZS5sb2cocXVhZCk7XG4vLyBjb25zb2xlLmxvZyhxdWFkLmZpbmRMZWFmKDc1LCA3NSkpO1xuLy8gY29uc29sZS5sb2cocXVhZC5zZWxlY3QoMCAsIDAsIDIwLCAyMCkpO1xuXG5jb25zdCBtYXBUcmVlID0gbmV3IFNNVHJlZTtcblxuLy8gY29uc3QgcmVjdDEgPSBuZXcgUmVjdGFuZ2xlKCAwLCAwLCA1MCwgIDIwKTtcbi8vIGNvbnN0IHJlY3QyID0gbmV3IFJlY3RhbmdsZSgyNSwgMCwgNzUsICAxMCk7XG4vLyBjb25zdCByZWN0MyA9IG5ldyBSZWN0YW5nbGUoNTAsIDAsIDc1LCAgMTApO1xuLy8gY29uc3QgcmVjdDQgPSBuZXcgUmVjdGFuZ2xlKDUwLCAwLCAxMDAsIDEwMCk7XG4vLyBjb25zdCByZWN0NSA9IG5ldyBSZWN0YW5nbGUoMTQwLCAwLCAxNjAsIDApO1xuLy8gY29uc29sZS5sb2coe3JlY3QxLCByZWN0MiwgcmVjdDMsIHJlY3Q0fSk7XG4vLyBtYXBUcmVlLmFkZChyZWN0MSk7XG4vLyBtYXBUcmVlLmFkZChyZWN0Mik7XG4vLyBtYXBUcmVlLmFkZChyZWN0Myk7XG4vLyBtYXBUcmVlLmFkZChyZWN0NCk7XG4vLyBtYXBUcmVlLmFkZChyZWN0NSk7XG5cblxuLy8gY29uc29sZS5sb2cobWFwVHJlZS5zZWdtZW50cyk7XG4vLyBjb25zb2xlLmxvZyhtYXBUcmVlLnF1ZXJ5KDAsIDAsIDEwMCwgMTAwKSk7XG5cbmV4cG9ydCBjbGFzcyBWaWV3IGV4dGVuZHMgQmFzZVZpZXdcbntcblx0Y29uc3RydWN0b3IoYXJncylcblx0e1xuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyA9IHRydWU7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL3ZpZXcudG1wJyk7XG5cdFx0dGhpcy5yb3V0ZXMgICAgPSBbXTtcblxuXHRcdHRoaXMuZW50aXRpZXMgID0gbmV3IEJhZztcblx0XHR0aGlzLmtleWJvYXJkICA9IEFwcGxpY2F0aW9uLmtleWJvYXJkO1xuXHRcdHRoaXMuc3BlZWQgICAgID0gMjQ7XG5cdFx0dGhpcy5tYXhTcGVlZCAgPSB0aGlzLnNwZWVkO1xuXG5cdFx0dGhpcy5hcmdzLmNvbnRyb2xsZXIgPSBBcHBsaWNhdGlvbi5vblNjcmVlbkpveVBhZDtcblxuXHRcdHRoaXMuYXJncy5mcHMgID0gMDtcblx0XHR0aGlzLmFyZ3Muc3BzICA9IDA7XG5cblx0XHR0aGlzLmFyZ3MuY2FtWCA9IDA7XG5cdFx0dGhpcy5hcmdzLmNhbVkgPSAwO1xuXG5cdFx0dGhpcy5hcmdzLmZyYW1lTG9jayA9IDYwO1xuXHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA9IDYwO1xuXG5cdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSBmYWxzZTtcblxuXHRcdHRoaXMua2V5Ym9hcmQubGlzdGVuaW5nID0gdHJ1ZTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0VzY2FwZScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA9PT0gLTEpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuc3ByaXRlQm9hcmQudW5zZWxlY3QoKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0hvbWUnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrKys7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdFbmQnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrLS07XG5cblx0XHRcdFx0aWYodGhpcy5hcmdzLmZyYW1lTG9jayA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmFyZ3MuZnJhbWVMb2NrID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnUGFnZVVwJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrKys7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdQYWdlRG93bicsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jay0tO1xuXG5cdFx0XHRcdGlmKHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2sgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLndvcmxkID0gbmV3IFdvcmxkKHtzcmM6ICcuL3dvcmxkLmpzb24nfSk7XG5cdFx0dGhpcy5tYXAgPSBuZXcgVGlsZU1hcCh7c3JjOiAnLi9tYXAuanNvbid9KTtcblx0fVxuXG5cdG9uUmVuZGVyZWQoKVxuXHR7XG5cdFx0Y29uc3Qgc3ByaXRlQm9hcmQgPSBuZXcgU3ByaXRlQm9hcmQoe1xuXHRcdFx0ZWxlbWVudDogdGhpcy50YWdzLmNhbnZhcy5lbGVtZW50XG5cdFx0XHQsIHdvcmxkOiB0aGlzLndvcmxkXG5cdFx0XHQsIG1hcDogdGhpcy5tYXBcblx0XHR9KTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQgPSBzcHJpdGVCb2FyZDtcblxuXHRcdGNvbnN0IHBsYXllciA9IG5ldyBQbGF5ZXIoe1xuXHRcdFx0c3ByaXRlOiBuZXcgU3ByaXRlKHtcblx0XHRcdFx0eDogMCwvLzQ4LFxuXHRcdFx0XHR5OiAwLC8vNjQsXG5cdFx0XHRcdC8vIHNyYzogdW5kZWZpbmVkLFxuXHRcdFx0XHRzcHJpdGVTZXQ6IG5ldyBTcHJpdGVTaGVldCh7c291cmNlOiAnLi9wbGF5ZXIudHNqJ30pLFxuXHRcdFx0XHRzcHJpdGVCb2FyZDogc3ByaXRlQm9hcmQsXG5cdFx0XHRcdHdpZHRoOiAzMixcblx0XHRcdFx0aGVpZ2h0OiA0OCxcblx0XHRcdH0pLFxuXHRcdFx0Y29udHJvbGxlcjogbmV3IENvbnRyb2xsZXIoe1xuXHRcdFx0XHRrZXlib2FyZDogdGhpcy5rZXlib2FyZCxcblx0XHRcdFx0b25TY3JlZW5Kb3lQYWQ6IHRoaXMuYXJncy5jb250cm9sbGVyLFxuXHRcdFx0fSksXG5cdFx0XHRjYW1lcmE6IENhbWVyYSxcblx0XHR9KTtcblxuXHRcdHRoaXMuZW50aXRpZXMuYWRkKHBsYXllcik7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5zcHJpdGVzLmFkZChwbGF5ZXIuc3ByaXRlKTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZyA9IHBsYXllcjtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJz0nLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnpvb20oMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCcrJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy56b29tKDEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnLScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuem9vbSgtMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCkgPT4gdGhpcy5yZXNpemUoKSk7XG5cblx0XHRsZXQgZlRoZW4gPSAwO1xuXHRcdGxldCBzVGhlbiA9IDA7XG5cblx0XHRsZXQgZlNhbXBsZXMgPSBbXTtcblx0XHRsZXQgc1NhbXBsZXMgPSBbXTtcblxuXHRcdGxldCBtYXhTYW1wbGVzID0gNTtcblxuXHRcdGNvbnN0IHNpbXVsYXRlID0gKG5vdykgPT4ge1xuXHRcdFx0bm93ID0gbm93IC8gMTAwMDtcblxuXHRcdFx0Y29uc3QgZGVsdGEgPSBub3cgLSBzVGhlbjtcblxuXHRcdFx0aWYodGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID09IDApXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzID0gWzBdO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmKGRlbHRhIDwgMS8odGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrKygxMCAqICh0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2svNjApKSkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c1RoZW4gPSBub3c7XG5cblx0XHRcdHRoaXMua2V5Ym9hcmQudXBkYXRlKCk7XG5cblx0XHRcdE9iamVjdC52YWx1ZXModGhpcy5lbnRpdGllcy5pdGVtcygpKS5tYXAoKGUpPT57XG5cdFx0XHRcdGUuc2ltdWxhdGUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyB0aGlzLnNwcml0ZUJvYXJkLnNpbXVsYXRlKCk7XG5cdFx0XHQvLyB0aGlzLmFyZ3MubG9jYWxYICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQubG9jYWxYO1xuXHRcdFx0Ly8gdGhpcy5hcmdzLmxvY2FsWSAgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmxvY2FsWTtcblx0XHRcdC8vIHRoaXMuYXJncy5nbG9iYWxYID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxYO1xuXHRcdFx0Ly8gdGhpcy5hcmdzLmdsb2JhbFkgPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFk7XG5cblx0XHRcdHRoaXMuYXJncy5fc3BzID0gKDEgLyBkZWx0YSk7XG5cblx0XHRcdHNTYW1wbGVzLnB1c2godGhpcy5hcmdzLl9zcHMpO1xuXG5cdFx0XHR3aGlsZShzU2FtcGxlcy5sZW5ndGggPiBtYXhTYW1wbGVzKVxuXHRcdFx0e1xuXHRcdFx0XHRzU2FtcGxlcy5zaGlmdCgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyB0aGlzLnNwcml0ZUJvYXJkLm1vdmVDYW1lcmEoc3ByaXRlLngsIHNwcml0ZS55KTtcblx0XHR9O1xuXG5cdFx0Y29uc3QgZHJhdyA9IG5vdyA9PiB7XG5cblx0XHRcdGlmKGRvY3VtZW50LmhpZGRlbilcblx0XHRcdHtcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBkZWx0YSA9IG5vdyAtIGZUaGVuO1xuXHRcdFx0ZlRoZW4gPSBub3c7XG5cblx0XHRcdHNpbXVsYXRlKHBlcmZvcm1hbmNlLm5vdygpKTtcblx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhdyk7XG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXcoZGVsdGEpO1xuXG5cdFx0XHR0aGlzLmFyZ3MuZnBzID0gKDEwMDAgLyBkZWx0YSkudG9GaXhlZCgzKTtcblxuXHRcdFx0dGhpcy5hcmdzLmNhbVggPSBOdW1iZXIoQ2FtZXJhLngpLnRvRml4ZWQoMyk7XG5cdFx0XHR0aGlzLmFyZ3MuY2FtWSA9IE51bWJlcihDYW1lcmEueSkudG9GaXhlZCgzKTtcblxuXHRcdFx0aWYodGhpcy5zcHJpdGVCb2FyZC5mb2xsb3dpbmcpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5wb3NYID0gTnVtYmVyKHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nLnNwcml0ZS54KS50b0ZpeGVkKDMpO1xuXHRcdFx0XHR0aGlzLmFyZ3MucG9zWSA9IE51bWJlcih0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZy5zcHJpdGUueSkudG9GaXhlZCgzKTtcblx0XHRcdH1cblxuXHRcdH07XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQgLyAxMDI0ICogNDtcblx0XHR0aGlzLnJlc2l6ZSgpO1xuXG5cdFx0ZHJhdyhwZXJmb3JtYW5jZS5ub3coKSk7XG5cblx0XHQvLyBzZXRJbnRlcnZhbCgoKT0+e1xuXHRcdC8vIH0sIDApO1xuXG5cdFx0c2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gYCR7Q29uZmlnLnRpdGxlfSAke3RoaXMuYXJncy5mcHN9IEZQU2A7XG5cdFx0fSwgMjI3LzMpO1xuXG5cdFx0c2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdGNvbnN0IHNwcyA9IHNTYW1wbGVzLnJlZHVjZSgoYSxiKT0+YStiLCAwKSAvIHNTYW1wbGVzLmxlbmd0aDtcblx0XHRcdHRoaXMuYXJncy5zcHMgPSBzcHMudG9GaXhlZCgzKS5wYWRTdGFydCg1LCAnICcpO1xuXHRcdH0sIDIzMS8yKTtcblx0fVxuXG5cdHJlc2l6ZSh4LCB5KVxuXHR7XG5cdFx0dGhpcy5hcmdzLndpZHRoICA9IHRoaXMudGFncy5jYW52YXMuZWxlbWVudC53aWR0aCAgID0geCB8fCBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoO1xuXHRcdHRoaXMuYXJncy5oZWlnaHQgPSB0aGlzLnRhZ3MuY2FudmFzLmVsZW1lbnQuaGVpZ2h0ICA9IHkgfHwgZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQ7XG5cblx0XHR0aGlzLmFyZ3MucndpZHRoID0gTWF0aC50cnVuYyhcblx0XHRcdCh4IHx8IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpICAvIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWxcblx0XHQpO1xuXG5cdFx0dGhpcy5hcmdzLnJoZWlnaHQgPSBNYXRoLnRydW5jKFxuXHRcdFx0KHkgfHwgZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQpIC8gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHRjb25zdCBvbGRTY2FsZSA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuc2NyZWVuU2NhbGUgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAvIDEwMjQ7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsICo9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSAvIG9sZFNjYWxlO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5yZXNpemUoKTtcblx0fVxuXG5cdHNjcm9sbChldmVudClcblx0e1xuXHRcdGxldCBkZWx0YSA9IGV2ZW50LmRlbHRhWSA+IDAgPyAtMSA6IChcblx0XHRcdGV2ZW50LmRlbHRhWSA8IDAgPyAxIDogMFxuXHRcdCk7XG5cblx0XHR0aGlzLnpvb20oZGVsdGEpO1xuXHR9XG5cblx0em9vbShkZWx0YSlcblx0e1xuXHRcdGNvbnN0IG1heCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSAqIDMyO1xuXHRcdGNvbnN0IG1pbiA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5zY3JlZW5TY2FsZSAqIDAuMjtcblx0XHRjb25zdCBzdGVwID0gMC4wNSAqIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRsZXQgem9vbUxldmVsID0gKGRlbHRhICogc3RlcCArIHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwpLnRvRml4ZWQoMik7XG5cblx0XHRpZih6b29tTGV2ZWwgPCBtaW4pXG5cdFx0e1xuXHRcdFx0em9vbUxldmVsID0gbWluO1xuXHRcdH1cblx0XHRlbHNlIGlmKHpvb21MZXZlbCA+IG1heClcblx0XHR7XG5cdFx0XHR6b29tTGV2ZWwgPSBtYXg7XG5cdFx0fVxuXG5cdFx0aWYoTWF0aC5hYnMoem9vbUxldmVsIC0gMSkgPCAwLjA1KVxuXHRcdHtcblx0XHRcdHpvb21MZXZlbCA9IDE7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbCAhPT0gem9vbUxldmVsKVxuXHRcdHtcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWwgPSB6b29tTGV2ZWw7XG5cdFx0XHR0aGlzLnJlc2l6ZSgpO1xuXHRcdH1cblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxjYW52YXNcXG5cXHRjdi1yZWYgPSBcXFwiY2FudmFzOmN1cnZhdHVyZS9iYXNlL1RhZ1xcXCJcXG5cXHRjdi1vbiAgPSBcXFwid2hlZWw6c2Nyb2xsKGV2ZW50KTtcXFwiXFxuPjwvY2FudmFzPlxcbjxkaXYgY2xhc3MgPSBcXFwiaHVkIGZwc1xcXCI+XFxuIFtbc3BzXV0gc2ltdWxhdGlvbnMvcyAvIFtbc2ltdWxhdGlvbkxvY2tdXVxcbiBbW2Zwc11dIGZyYW1lcy9zICAgICAgLyBbW2ZyYW1lTG9ja11dXFxuXFxuIFJlcyBbW3J3aWR0aF1dIHggW1tyaGVpZ2h0XV1cXG4gICAgIFtbd2lkdGhdXSB4IFtbaGVpZ2h0XV1cXG5cXG4gQ2FtIFtbY2FtWF1dIHggW1tjYW1ZXV1cXG4gUG9zIFtbcG9zWF1dIHggW1twb3NZXV1cXG5cXG4gzrQgU2ltOiAgIFBnIFVwIC8gRG5cXG4gzrQgRnJhbWU6IEhvbWUgLyBFbmRcXG4gzrQgU2NhbGU6ICsgLyAtXFxuXFxuPC9kaXY+XFxuPGRpdiBjbGFzcyA9IFxcXCJyZXRpY2xlXFxcIj48L2Rpdj5cXG5cXG5bW2NvbnRyb2xsZXJdXVxcblxcbjxkaXYgY3YtaWYgPSBcXFwic2hvd0VkaXRvclxcXCI+XFxuXFx0W1ttYXBFZGl0b3JdXVxcblxcdC0tXFxuXFx0W1ttbW1dXVxcbjwvc3Bhbj5cXG5cIiIsImltcG9ydCB7IFJvdXRlciB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL1JvdXRlcic7XG5pbXBvcnQgeyBWaWV3ICAgfSBmcm9tICdob21lL1ZpZXcnO1xuXG5pZihQcm94eSAhPT0gdW5kZWZpbmVkKVxue1xuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuXHRcdGNvbnN0IHZpZXcgPSBuZXcgVmlldygpO1xuXHRcdFxuXHRcdFJvdXRlci5saXN0ZW4odmlldyk7XG5cdFx0XG5cdFx0dmlldy5yZW5kZXIoZG9jdW1lbnQuYm9keSk7XG5cdH0pO1xufVxuZWxzZVxue1xuXHQvLyBkb2N1bWVudC53cml0ZShyZXF1aXJlKCcuL0ZhbGxiYWNrL2ZhbGxiYWNrLnRtcCcpKTtcbn1cbiIsImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICcuL0luamVjdGFibGUnO1xuXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgSW5qZWN0YWJsZVxue1xuXHRpbmplY3QoaW5qZWN0aW9ucylcblx0e1xuXHRcdHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3RvcihPYmplY3QuYXNzaWduKHt9LCB0aGlzLCBpbmplY3Rpb25zKSk7XG5cdH1cbn1cbiIsImxldCBjbGFzc2VzID0ge307XG5sZXQgb2JqZWN0cyA9IHt9O1xuXG5leHBvcnQgY2xhc3MgSW5qZWN0YWJsZVxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRsZXQgaW5qZWN0aW9ucyA9IHRoaXMuY29uc3RydWN0b3IuaW5qZWN0aW9ucygpO1xuXHRcdGxldCBjb250ZXh0ICAgID0gdGhpcy5jb25zdHJ1Y3Rvci5jb250ZXh0KCk7XG5cblx0XHRpZighY2xhc3Nlc1tjb250ZXh0XSlcblx0XHR7XG5cdFx0XHRjbGFzc2VzW2NvbnRleHRdID0ge307XG5cdFx0fVxuXG5cdFx0aWYoIW9iamVjdHNbY29udGV4dF0pXG5cdFx0e1xuXHRcdFx0b2JqZWN0c1tjb250ZXh0XSA9IHt9O1xuXHRcdH1cblxuXHRcdGZvcihsZXQgbmFtZSBpbiBpbmplY3Rpb25zKVxuXHRcdHtcblx0XHRcdGxldCBpbmplY3Rpb24gPSBpbmplY3Rpb25zW25hbWVdO1xuXG5cdFx0XHRpZihjbGFzc2VzW2NvbnRleHRdW25hbWVdIHx8ICFpbmplY3Rpb24ucHJvdG90eXBlKVxuXHRcdFx0e1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0aWYoL1tBLVpdLy50ZXN0KFN0cmluZyhuYW1lKVswXSkpXG5cdFx0XHR7XG5cdFx0XHRcdGNsYXNzZXNbY29udGV4dF1bbmFtZV0gPSBpbmplY3Rpb247XG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRmb3IobGV0IG5hbWUgaW4gaW5qZWN0aW9ucylcblx0XHR7XG5cdFx0XHRsZXQgaW5zdGFuY2UgID0gdW5kZWZpbmVkO1xuXHRcdFx0bGV0IGluamVjdGlvbiA9IGNsYXNzZXNbY29udGV4dF1bbmFtZV0gfHwgaW5qZWN0aW9uc1tuYW1lXTtcblxuXHRcdFx0aWYoL1tBLVpdLy50ZXN0KFN0cmluZyhuYW1lKVswXSkpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKGluamVjdGlvbi5wcm90b3R5cGUpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZighb2JqZWN0c1tjb250ZXh0XVtuYW1lXSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRvYmplY3RzW2NvbnRleHRdW25hbWVdID0gbmV3IGluamVjdGlvbjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0b2JqZWN0c1tjb250ZXh0XVtuYW1lXSA9IGluamVjdGlvbjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGluc3RhbmNlID0gb2JqZWN0c1tjb250ZXh0XVtuYW1lXTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0aWYoaW5qZWN0aW9uLnByb3RvdHlwZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGluc3RhbmNlID0gbmV3IGluamVjdGlvbjtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpbnN0YW5jZSA9IGluamVjdGlvbjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuXHRcdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdFx0d3JpdGFibGU6ICAgZmFsc2UsXG5cdFx0XHRcdHZhbHVlOiAgICAgIGluc3RhbmNlXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG5cdHN0YXRpYyBpbmplY3Rpb25zKClcblx0e1xuXHRcdHJldHVybiB7fTtcblx0fVxuXG5cdHN0YXRpYyBjb250ZXh0KClcblx0e1xuXHRcdHJldHVybiAnLic7XG5cdH1cblxuXHRzdGF0aWMgaW5qZWN0KGluamVjdGlvbnMsIGNvbnRleHQgPSAnLicpXG5cdHtcblx0XHRpZighKHRoaXMucHJvdG90eXBlIGluc3RhbmNlb2YgSW5qZWN0YWJsZSB8fCB0aGlzID09PSBJbmplY3RhYmxlKSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBhY2Nlc3MgaW5qZWN0YWJsZSBzdWJjbGFzcyFcblxuQXJlIHlvdSB0cnlpbmcgdG8gaW5zdGFudGlhdGUgbGlrZSB0aGlzP1xuXG5cdG5ldyBYLmluamVjdCh7Li4ufSk7XG5cbklmIHNvIHBsZWFzZSB0cnk6XG5cblx0bmV3IChYLmluamVjdCh7Li4ufSkpO1xuXG5QbGVhc2Ugbm90ZSB0aGUgcGFyZW50aGVzaXMuXG5gKTtcblx0XHR9XG5cblx0XHRsZXQgZXhpc3RpbmdJbmplY3Rpb25zID0gdGhpcy5pbmplY3Rpb25zKCk7XG5cblx0XHRyZXR1cm4gY2xhc3MgZXh0ZW5kcyB0aGlzIHtcblx0XHRcdHN0YXRpYyBpbmplY3Rpb25zKClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGV4aXN0aW5nSW5qZWN0aW9ucywgaW5qZWN0aW9ucyk7XG5cdFx0XHR9XG5cdFx0XHRzdGF0aWMgY29udGV4dCgpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBjb250ZXh0O1xuXHRcdFx0fVxuXHRcdH07XG5cdH1cbn1cbiIsImNsYXNzIFNpbmdsZVxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLm5hbWUgPSAnc3NzLicgKyBNYXRoLnJhbmRvbSgpO1xuXHR9XG59XG5cbmxldCBzaW5nbGUgPSBuZXcgU2luZ2xlO1xuXG5leHBvcnQge1NpbmdsZSwgc2luZ2xlfTsiLCJleHBvcnQgY2xhc3MgR2VvbWV0cnlcbntcblx0bGluZUludGVyc2VjdHNMaW5lKHgxYSwgeTFhLCB4MmEsIHkyYSwgeDFiLCB5MWIsIHgyYiwgeTJiKVxuXHR7XG5cdFx0Y29uc3QgYXggPSB4MmEgLSB4MWE7XG5cdFx0Y29uc3QgYXkgPSB5MmEgLSB5MWE7XG5cblx0XHRjb25zdCBieCA9IHgyYiAtIHgxYjtcblx0XHRjb25zdCBieSA9IHkyYiAtIHkxYjtcblxuXHRcdGNvbnN0IGNyb3NzUHJvZHVjdCA9IGF4ICogYnkgLSBheSAqIGJ4O1xuXG5cdFx0Ly8gUGFyYWxsZWwgTGluZXMgY2Fubm90IGludGVyc2VjdFxuXHRcdGlmKGNyb3NzUHJvZHVjdCA9PT0gMClcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY3ggPSB4MWIgLSB4MWE7XG5cdFx0Y29uc3QgY3kgPSB5MWIgLSB5MWE7XG5cblx0XHQvLyBJcyBvdXIgcG9pbnQgd2l0aGluIHRoZSBib3VuZHMgb2YgbGluZSBhP1xuXHRcdGNvbnN0IGQgPSAoY3ggKiBheSAtIGN5ICogYXgpIC8gY3Jvc3NQcm9kdWN0O1xuXHRcdGlmKGQgPCAwIHx8IGQgPiAxKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBJcyBvdXIgcG9pbnQgd2l0aGluIHRoZSBib3VuZHMgb2YgbGluZSBiP1xuXHRcdGNvbnN0IGUgPSAoY3ggKiBieSAtIGN5ICogYngpIC8gY3Jvc3NQcm9kdWN0O1xuXHRcdGlmKGUgPCAwIHx8IGUgPiAxKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gW3gxYSArIGUgKiBheCwgeTFhICsgZSAqIGF5XTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIE1hdHJpeFxue1xuXHRzdGF0aWMgaWRlbnRpdHkoKVxuXHR7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFsxLCAwLCAwXSxcblx0XHRcdFswLCAxLCAwXSxcblx0XHRcdFswLCAwLCAxXSxcblx0XHRdO1xuXHR9XG5cblx0c3RhdGljIHRyYW5zbGF0ZShkeCwgZHkpXG5cdHtcblx0XHRyZXR1cm4gW1xuXHRcdFx0WzEsIDAsIGR4XSxcblx0XHRcdFswLCAxLCBkeV0sXG5cdFx0XHRbMCwgMCwgIDFdLFxuXHRcdF07XG5cdH1cblxuXHRzdGF0aWMgc2NhbGUoZHgsIGR5KVxuXHR7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFtkeCwgMCwgMF0sXG5cdFx0XHRbMCwgZHksIDBdLFxuXHRcdFx0WzAsIDAsICAxXSxcblx0XHRdO1xuXHR9XG5cblx0c3RhdGljIHJvdGF0ZSh0aGV0YSlcblx0e1xuXHRcdGNvbnN0IHMgPSBNYXRoLnNpbih0aGV0YSk7XG5cdFx0Y29uc3QgYyA9IE1hdGguY29zKHRoZXRhKTtcblxuXHRcdHJldHVybiBbXG5cdFx0XHRbYywgLXMsIDBdLFxuXHRcdFx0W3MsICBjLCAwXSxcblx0XHRcdFswLCAgMCwgMV0sXG5cdFx0XTtcblx0fVxuXG5cdHN0YXRpYyBzaGVhclgocylcblx0e1xuXHRcdHJldHVybiBbXG5cdFx0XHRbMSwgcywgMF0sXG5cdFx0XHRbMCwgMSwgMF0sXG5cdFx0XHRbMCwgMCwgMV0sXG5cdFx0XTtcblx0fVxuXG5cdHN0YXRpYyBzaGVhclkocylcblx0e1xuXHRcdHJldHVybiBbXG5cdFx0XHRbMSwgMCwgMF0sXG5cdFx0XHRbcywgMSwgMF0sXG5cdFx0XHRbMCwgMCwgMV0sXG5cdFx0XTtcblx0fVxuXG5cdHN0YXRpYyBtdWx0aXBseShtYXRBLCBtYXRCKVxuXHR7XG5cdFx0aWYobWF0QS5sZW5ndGggIT09IG1hdEIubGVuZ3RoKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBtYXRyaWNlcycpO1xuXHRcdH1cblxuXHRcdGlmKG1hdEFbMF0ubGVuZ3RoICE9PSBtYXRCLmxlbmd0aClcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0luY29tcGF0aWJsZSBtYXRyaWNlcycpO1xuXHRcdH1cblxuXHRcdGNvbnN0IG91dHB1dCA9IEFycmF5KG1hdEEubGVuZ3RoKS5maWxsKCkubWFwKCgpID0+IEFycmF5KG1hdEJbMF0ubGVuZ3RoKS5maWxsKDApKTtcblxuXHRcdGZvcihsZXQgaSA9IDA7IGkgPCBtYXRBLmxlbmd0aDsgaSsrKVxuXHRcdHtcblx0XHRcdGZvcihsZXQgaiA9IDA7IGogPCBtYXRCWzBdLmxlbmd0aDsgaisrKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IobGV0IGsgPSAwOyBrIDwgbWF0QVswXS5sZW5ndGg7IGsrKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG91dHB1dFtpXVtqXSArPSBtYXRBW2ldW2tdICogbWF0QltrXVtqXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRzdGF0aWMgY29tcG9zaXRlKC4uLm1hdHMpXG5cdHtcblx0XHRsZXQgb3V0cHV0ID0gdGhpcy5pZGVudGl0eSgpO1xuXG5cdFx0Zm9yKGxldCBpID0gMDsgaSA8IG1hdHMubGVuZ3RoOyBpKyspXG5cdFx0e1xuXHRcdFx0b3V0cHV0ID0gdGhpcy5tdWx0aXBseShvdXRwdXQsIG1hdHNbaV0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRzdGF0aWMgdHJhbnNmb3JtKHBvaW50cywgbWF0cml4KVxuXHR7XG5cdFx0Y29uc3Qgb3V0cHV0ID0gW107XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSArPSAyKVxuXHRcdHtcblx0XHRcdGNvbnN0IHBvaW50ID0gW3BvaW50c1tpXSwgcG9pbnRzW2kgKyAxXSwgMV07XG5cblx0XHRcdGZvcihjb25zdCByb3cgb2YgbWF0cml4KVxuXHRcdFx0e1xuXHRcdFx0XHRvdXRwdXQucHVzaChcblx0XHRcdFx0XHRwb2ludFswXSAqIHJvd1swXVxuXHRcdFx0XHRcdCsgcG9pbnRbMV0gKiByb3dbMV1cblx0XHRcdFx0XHQrIHBvaW50WzJdICogcm93WzJdXG5cdFx0XHRcdClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gbmV3IEZsb2F0MzJBcnJheShvdXRwdXQuZmlsdGVyKChfLCBrKSA9PiAoMSArIGspICUgMykpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBSZWN0YW5nbGUgfSBmcm9tIFwiLi9SZWN0YW5nbGVcIjtcblxuZXhwb3J0IGNsYXNzIFF1YWR0cmVlIGV4dGVuZHMgUmVjdGFuZ2xlXG57XG5cdGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBtaW5TaXplKVxuXHR7XG5cdFx0c3VwZXIoeDEsIHkxLCB4MiwgeTIpO1xuXG5cdFx0dGhpcy5zcGxpdCA9IGZhbHNlO1xuXHRcdHRoaXMuaXRlbXMgPSBuZXcgU2V0O1xuXHRcdHRoaXMubWluU2l6ZSA9IG1pblNpemU7XG5cblx0XHR0aGlzLnVsQ2VsbCA9IG51bGw7XG5cdFx0dGhpcy51ckNlbGwgPSBudWxsO1xuXHRcdHRoaXMuYmxDZWxsID0gbnVsbDtcblx0XHR0aGlzLmJyQ2VsbCA9IG51bGw7XG5cdH1cblxuXHRpbnNlcnQoZW50aXR5KVxuXHR7XG5cdFx0aWYoIXRoaXMuY29udGFpbnMoZW50aXR5LngsIGVudGl0eS55KSlcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgeFNpemUgPSB0aGlzLngyIC0gdGhpcy54MTtcblx0XHRjb25zdCB5U2l6ZSA9IHRoaXMueTIgLSB0aGlzLnkxO1xuXG5cdFx0aWYodGhpcy5pdGVtcy5zaXplICYmIHhTaXplID4gdGhpcy5taW5TaXplICYmIHlTaXplID4gdGhpcy5taW5TaXplKVxuXHRcdHtcblx0XHRcdGlmKCF0aGlzLnNwbGl0KVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB4U2l6ZUhhbGYgPSAwLjUgKiB4U2l6ZTtcblx0XHRcdFx0Y29uc3QgeVNpemVIYWxmID0gMC41ICogeVNpemU7XG5cblx0XHRcdFx0dGhpcy51bENlbGwgPSBuZXcgUXVhZHRyZWUodGhpcy54MSwgdGhpcy55MSwgICAgICAgICAgICAgdGhpcy54MSArIHhTaXplSGFsZiwgdGhpcy55MSArIHlTaXplSGFsZiwgdGhpcy5taW5TaXplKTtcblx0XHRcdFx0dGhpcy5ibENlbGwgPSBuZXcgUXVhZHRyZWUodGhpcy54MSwgdGhpcy55MSArIHlTaXplSGFsZiwgdGhpcy54MSArIHhTaXplSGFsZiwgdGhpcy55MiwgICAgICAgICAgICAgdGhpcy5taW5TaXplKTtcblxuXHRcdFx0XHR0aGlzLnVyQ2VsbCA9IG5ldyBRdWFkdHJlZSh0aGlzLngxICsgeFNpemVIYWxmLCB0aGlzLnkxLCAgICAgICAgICAgICB0aGlzLngyLCB0aGlzLnkxICsgeVNpemVIYWxmLCB0aGlzLm1pblNpemUpO1xuXHRcdFx0XHR0aGlzLmJyQ2VsbCA9IG5ldyBRdWFkdHJlZSh0aGlzLngxICsgeFNpemVIYWxmLCB0aGlzLnkxICsgeVNpemVIYWxmLCB0aGlzLngyLCB0aGlzLnkyLCAgICAgICAgICAgICB0aGlzLm1pblNpemUpO1xuXG5cdFx0XHRcdHRoaXMuc3BsaXQgID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yKGNvbnN0IGl0ZW0gb2YgdGhpcy5pdGVtcylcblx0XHRcdHtcblx0XHRcdFx0dGhpcy51bENlbGwuaW5zZXJ0KGl0ZW0pO1xuXHRcdFx0XHR0aGlzLnVyQ2VsbC5pbnNlcnQoaXRlbSk7XG5cdFx0XHRcdHRoaXMuYmxDZWxsLmluc2VydChpdGVtKTtcblx0XHRcdFx0dGhpcy5ickNlbGwuaW5zZXJ0KGl0ZW0pO1xuXG5cdFx0XHRcdHRoaXMuaXRlbXMuZGVsZXRlKGl0ZW0pO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnVsQ2VsbC5pbnNlcnQoZW50aXR5KTtcblx0XHRcdHRoaXMudXJDZWxsLmluc2VydChlbnRpdHkpO1xuXHRcdFx0dGhpcy5ibENlbGwuaW5zZXJ0KGVudGl0eSk7XG5cdFx0XHR0aGlzLmJyQ2VsbC5pbnNlcnQoZW50aXR5KTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHRoaXMuaXRlbXMuYWRkKGVudGl0eSk7XG5cdFx0fVxuXHR9XG5cblx0ZmluZExlYWYoeCwgeSlcblx0e1xuXHRcdGlmKCF0aGlzLmNvbnRhaW5zKHgsIHkpKVxuXHRcdHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdGlmKCF0aGlzLnNwbGl0KVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLnVsQ2VsbC5maW5kTGVhZih4LCB5KVxuXHRcdFx0Pz8gdGhpcy51ckNlbGwuZmluZExlYWYoeCwgeSlcblx0XHRcdD8/IHRoaXMuYmxDZWxsLmZpbmRMZWFmKHgsIHkpXG5cdFx0XHQ/PyB0aGlzLmJyQ2VsbC5maW5kTGVhZih4LCB5KTtcblx0fVxuXG5cdGhhcyhlbnRpdHkpXG5cdHtcblx0XHRpZih0aGlzLnNwbGl0KVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnVsQ2VsbC5oYXMoZW50aXR5KVxuXHRcdFx0XHR8fCB0aGlzLnVyQ2VsbC5oYXMoZW50aXR5KVxuXHRcdFx0XHR8fCB0aGlzLmJsQ2VsbC5oYXMoZW50aXR5KVxuXHRcdFx0XHR8fCB0aGlzLmJyQ2VsbC5oYXMoZW50aXR5KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5pdGVtcy5oYXMoZW50aXR5KTtcblx0fVxuXG5cdHNlbGVjdCh4LCB5LCB3LCBoKVxuXHR7XG5cdFx0Y29uc3QgeE1heCA9IHggKyB3O1xuXHRcdGNvbnN0IHlNYXggPSB5ICsgaDtcblxuXHRcdGlmKHhNYXggPCB0aGlzLngxIHx8IHggPiB0aGlzLngyKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgU2V0O1xuXHRcdH1cblxuXHRcdGlmKHlNYXggPCB0aGlzLnkxIHx8IHkgPiB0aGlzLnkyKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgU2V0O1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuc3BsaXQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBTZXQoW1xuXHRcdFx0XHQuLi50aGlzLnVsQ2VsbC5zZWxlY3QoeCwgeSwgdywgaClcblx0XHRcdFx0LCAuLi50aGlzLnVyQ2VsbC5zZWxlY3QoeCwgeSwgdywgaClcblx0XHRcdFx0LCAuLi50aGlzLmJsQ2VsbC5zZWxlY3QoeCwgeSwgdywgaClcblx0XHRcdFx0LCAuLi50aGlzLmJyQ2VsbC5zZWxlY3QoeCwgeSwgdywgaClcblx0XHRcdF0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLml0ZW1zO1xuXHR9XG5cblx0ZHVtcCgpXG5cdHtcblx0XHRpZih0aGlzLnNwbGl0KVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgU2V0KFtcblx0XHRcdFx0Li4udGhpcy51bENlbGwuZHVtcCgpXG5cdFx0XHRcdCwgLi4udGhpcy51ckNlbGwuZHVtcCgpXG5cdFx0XHRcdCwgLi4udGhpcy5ibENlbGwuZHVtcCgpXG5cdFx0XHRcdCwgLi4udGhpcy5ickNlbGwuZHVtcCgpXG5cdFx0XHRdKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5pdGVtcztcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIFJlY3RhbmdsZVxue1xuXHRjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5Milcblx0e1xuXHRcdHRoaXMueDEgPSB4MTtcblx0XHR0aGlzLnkxID0geTE7XG5cdFx0dGhpcy54MiA9IHgyO1xuXHRcdHRoaXMueTIgPSB5Mjtcblx0fVxuXG5cdGNvbnRhaW5zKHgsIHkpXG5cdHtcblx0XHRpZih4IDw9IHRoaXMueDEgfHwgeCA+PSB0aGlzLngyKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZih5IDw9IHRoaXMueTEgfHwgeSA+PSB0aGlzLnkyKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGlzT3ZlcmxhcHBpbmcob3RoZXIpXG5cdHtcblx0XHRpZih0aGlzLngxID49IG90aGVyLngyIHx8IHRoaXMueDIgPD0gb3RoZXIueDEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMueTEgPj0gb3RoZXIueTIgfHwgdGhpcy55MiA8PSBvdGhlci55MSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRpc0ZsdXNoV2l0aChvdGhlcilcblx0e1xuXHRcdGlmKHRoaXMueDEgPiBvdGhlci54MiB8fCBvdGhlci54MSA+IHRoaXMueDIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMueTEgPiBvdGhlci55MiB8fCBvdGhlci55MSA+IHRoaXMueTIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMueDEgPT09IG90aGVyLngyIHx8IG90aGVyLngxID09PSB0aGlzLngyKVxuXHRcdHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMueTEgPT09IG90aGVyLnkyIHx8IG90aGVyLnkxID09PSB0aGlzLnkyKVxuXHRcdHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0fVxuXG5cdGludGVyc2VjdGlvbihvdGhlcilcblx0e1xuXHRcdGlmKCF0aGlzLmlzT3ZlcmxhcHBpbmcob3RoZXIpKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4gbmV3ICh0aGlzLmNvbnN0cnVjdG9yKShcblx0XHRcdE1hdGgubWF4KHRoaXMueDEsIG90aGVyLngxKSwgTWF0aC5tYXgodGhpcy55MSwgb3RoZXIueTEpXG5cdFx0XHQsIE1hdGgubWluKHRoaXMueDIsIG90aGVyLngyKSwgTWF0aC5taW4odGhpcy55Miwgb3RoZXIueTIpXG5cdFx0KTtcblx0fVxuXG5cdGlzSW5zaWRlKG90aGVyKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMueDEgPj0gb3RoZXIueDFcblx0XHRcdCYmIHRoaXMueTEgPj0gb3RoZXIueTFcblx0XHRcdCYmIHRoaXMueDIgPD0gb3RoZXIueDJcblx0XHRcdCYmIHRoaXMueTIgPD0gb3RoZXIueTI7XG5cdH1cblxuXHRpc091dHNpZGUob3RoZXIpXG5cdHtcblx0XHRyZXR1cm4gb3RoZXIuaXNJbnNpZGUodGhpcyk7XG5cdH1cblxuXHR0b1RyaWFuZ2xlcyhkaW0gPSAyKVxuXHR7XG5cdFx0aWYoZGltID09PSAyKVxuXHRcdHtcblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdHRoaXMueDEsIHRoaXMueTEsXG5cdFx0XHRcdHRoaXMueDIsIHRoaXMueTEsXG5cdFx0XHRcdHRoaXMueDEsIHRoaXMueTIsXG5cdFx0XHRcdHRoaXMueDEsIHRoaXMueTIsXG5cdFx0XHRcdHRoaXMueDIsIHRoaXMueTEsXG5cdFx0XHRcdHRoaXMueDIsIHRoaXMueTIsXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdGlmKGRpbSA9PT0gMylcblx0XHR7XG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHR0aGlzLngxLCB0aGlzLnkxLCAxLFxuXHRcdFx0XHR0aGlzLngyLCB0aGlzLnkxLCAxLFxuXHRcdFx0XHR0aGlzLngxLCB0aGlzLnkyLCAxLFxuXHRcdFx0XHR0aGlzLngxLCB0aGlzLnkyLCAxLFxuXHRcdFx0XHR0aGlzLngyLCB0aGlzLnkxLCAxLFxuXHRcdFx0XHR0aGlzLngyLCB0aGlzLnkyLCAxLFxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHRpZihkaW0gPT09IDQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0dGhpcy54MSwgdGhpcy55MSwgMCwgMSxcblx0XHRcdFx0dGhpcy54MiwgdGhpcy55MSwgMCwgMSxcblx0XHRcdFx0dGhpcy54MSwgdGhpcy55MiwgMCwgMSxcblx0XHRcdFx0dGhpcy54MSwgdGhpcy55MiwgMCwgMSxcblx0XHRcdFx0dGhpcy54MiwgdGhpcy55MSwgMCwgMSxcblx0XHRcdFx0dGhpcy54MiwgdGhpcy55MiwgMCwgMSxcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFtcblx0XHRcdHRoaXMueDEsIHRoaXMueTEsIC4uLihkaW0gPiAyID8gQXJyYXkoLTIrZGltKS5maWxsKDApOiBbXSksXG5cdFx0XHR0aGlzLngyLCB0aGlzLnkxLCAuLi4oZGltID4gMiA/IEFycmF5KC0yK2RpbSkuZmlsbCgwKTogW10pLFxuXHRcdFx0dGhpcy54MSwgdGhpcy55MiwgLi4uKGRpbSA+IDIgPyBBcnJheSgtMitkaW0pLmZpbGwoMCk6IFtdKSxcblx0XHRcdHRoaXMueDEsIHRoaXMueTIsIC4uLihkaW0gPiAyID8gQXJyYXkoLTIrZGltKS5maWxsKDApOiBbXSksXG5cdFx0XHR0aGlzLngyLCB0aGlzLnkxLCAuLi4oZGltID4gMiA/IEFycmF5KC0yK2RpbSkuZmlsbCgwKTogW10pLFxuXHRcdFx0dGhpcy54MiwgdGhpcy55MiwgLi4uKGRpbSA+IDIgPyBBcnJheSgtMitkaW0pLmZpbGwoMCk6IFtdKSxcblx0XHRdO1xuXHR9XG59XG4iLCJjbGFzcyBTZWdtZW50XG57XG5cdGNvbnN0cnVjdG9yKHN0YXJ0LCBlbmQsIHByZXYsIGRlcHRoID0gMClcblx0e1xuXHRcdHRoaXMuc3RhcnQgPSBzdGFydDtcblx0XHR0aGlzLmVuZCAgID0gZW5kO1xuXHRcdHRoaXMuZGVwdGggPSBkZXB0aDtcblx0XHR0aGlzLnNpemUgID0gMDtcblxuXHRcdHRoaXMucmVjdGFuZ2xlcyA9IG5ldyBTZXQ7XG5cdFx0dGhpcy5zdWJUcmVlID0gZGVwdGggPCAxXG5cdFx0XHQ/IG5ldyBTTVRyZWUoMSArIGRlcHRoKVxuXHRcdFx0OiBudWxsO1xuXG5cdFx0dGhpcy5wcmV2ICA9IHByZXY7XG5cdH1cblxuXHRzcGxpdChhdClcblx0e1xuXHRcdGlmKGF0IDwgdGhpcy5zdGFydCB8fCBhdCA+IHRoaXMuZW5kKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBSYW5nZUVycm9yKCdTcGxpdHRpbmcgc2VnbWVudCBvdXQgb2YgYm91bmRzIScpO1xuXHRcdH1cblxuXHRcdGlmKGF0ID09PSB0aGlzLnN0YXJ0KVxuXHRcdHtcblx0XHRcdHJldHVybiBbdGhpc107XG5cdFx0fVxuXG5cdFx0aWYoYXQgPT09IHRoaXMuZW5kKVxuXHRcdHtcblx0XHRcdHJldHVybiBbdGhpc107XG5cdFx0fVxuXG5cdFx0Y29uc3QgYSA9IG5ldyBTZWdtZW50KHRoaXMuc3RhcnQsIGF0LCB0aGlzLnByZXYsIHRoaXMuZGVwdGgpO1xuXHRcdGNvbnN0IGIgPSBuZXcgU2VnbWVudChhdCwgdGhpcy5lbmQsIGEsIHRoaXMuZGVwdGgpO1xuXG5cdFx0Zm9yKGNvbnN0IHJlY3RhbmdsZSBvZiB0aGlzLnJlY3RhbmdsZXMpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVjdE1pbiA9IHRoaXMuZGVwdGggPT09IDAgPyByZWN0YW5nbGUueDEgOiByZWN0YW5nbGUueTE7XG5cdFx0XHRjb25zdCByZWN0TWF4ID0gdGhpcy5kZXB0aCA9PT0gMCA/IHJlY3RhbmdsZS54MiA6IHJlY3RhbmdsZS55MjtcblxuXHRcdFx0aWYocmVjdE1heCA8IGF0KVxuXHRcdFx0e1xuXHRcdFx0XHRhLmFkZChyZWN0YW5nbGUpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0aWYocmVjdE1pbiA+IGF0KVxuXHRcdFx0e1xuXHRcdFx0XHRiLmFkZChyZWN0YW5nbGUpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0YS5hZGQocmVjdGFuZ2xlKTtcblx0XHRcdGIuYWRkKHJlY3RhbmdsZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFthLCBiXTtcblx0fVxuXG5cdGFkZChyZWN0YW5nbGUpXG5cdHtcblx0XHRPYmplY3QuZnJlZXplKHJlY3RhbmdsZSk7XG5cblx0XHRpZih0aGlzLnN1YlRyZWUpXG5cdFx0e1xuXHRcdFx0dGhpcy5zdWJUcmVlLmFkZChyZWN0YW5nbGUpO1xuXHRcdH1cblxuXHRcdHRoaXMucmVjdGFuZ2xlcy5hZGQocmVjdGFuZ2xlKTtcblx0XHR0aGlzLnNpemUgPSB0aGlzLnJlY3RhbmdsZXMuc2l6ZTtcblx0fVxuXG5cdGRlbGV0ZShyZWN0YW5nbGUpXG5cdHtcblx0XHRpZih0aGlzLnN1YlRyZWUpXG5cdFx0e1xuXHRcdFx0dGhpcy5zdWJUcmVlLmRlbGV0ZShyZWN0YW5nbGUpO1xuXHRcdH1cblxuXHRcdHRoaXMucmVjdGFuZ2xlcy5kZWxldGUocmVjdGFuZ2xlKTtcblx0XHR0aGlzLnNpemUgPSB0aGlzLnJlY3RhbmdsZXMuc2l6ZTtcblxuXHRcdGNvbnN0IGVtcHR5ID0gKCF0aGlzLnJlY3RhbmdsZXMuc2l6ZSkgJiYgdGhpcy5zdGFydCA+IC1JbmZpbml0eTtcblxuXHRcdHJldHVybiBlbXB0eTtcblx0fVxufVxuXG5jb25zdCBpc1JlY3RhbmdsZSA9IChvYmplY3QpID0+IHtcblx0cmV0dXJuICd4MScgaW4gb2JqZWN0XG5cdFx0JiYgJ3kxJyBpbiBvYmplY3Rcblx0XHQmJiAneDInIGluIG9iamVjdFxuXHRcdCYmICd5MicgaW4gb2JqZWN0O1xufTtcblxuZXhwb3J0IGNsYXNzIFNNVHJlZVxue1xuXHRjb25zdHJ1Y3RvcihkZXB0aCA9IDApXG5cdHtcblx0XHR0aGlzLmRlcHRoID0gZGVwdGg7XG5cdFx0dGhpcy5zZWdtZW50cyA9IFtuZXcgU2VnbWVudCgtSW5maW5pdHksIEluZmluaXR5LCBudWxsLCB0aGlzLmRlcHRoKV07XG5cdH1cblxuXHRhZGQocmVjdGFuZ2xlKVxuXHR7XG5cdFx0aWYoIWlzUmVjdGFuZ2xlKHJlY3RhbmdsZSkpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdPYmplY3Qgc3VwcGxpZWQgaXMgbm90IGEgUmVjdGFuZ2xlLiBNdXN0IGhhdmUgcHJvcGVydGllczogeDEsIHkxLCB4MiwgeTEuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcmVjdE1pbiA9IHRoaXMuZGVwdGggPT09IDAgPyByZWN0YW5nbGUueDEgOiByZWN0YW5nbGUueTE7XG5cdFx0Y29uc3QgcmVjdE1heCA9IHRoaXMuZGVwdGggPT09IDAgPyByZWN0YW5nbGUueDIgOiByZWN0YW5nbGUueTI7XG5cblx0XHRjb25zdCBzdGFydEluZGV4ID0gdGhpcy5maW5kU2VnbWVudChyZWN0TWluKTtcblx0XHR0aGlzLnNwbGl0U2VnbWVudChzdGFydEluZGV4LCByZWN0TWluKTtcblxuXHRcdGNvbnN0IGVuZEluZGV4ID0gdGhpcy5maW5kU2VnbWVudChyZWN0TWF4KTtcblx0XHR0aGlzLnNwbGl0U2VnbWVudChlbmRJbmRleCwgcmVjdE1heCk7XG5cblx0XHRpZihzdGFydEluZGV4ID09PSBlbmRJbmRleClcblx0XHR7XG5cdFx0XHR0aGlzLnNlZ21lbnRzW3N0YXJ0SW5kZXhdLmFkZChyZWN0YW5nbGUpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGZvcihsZXQgaSA9IDEgKyBzdGFydEluZGV4OyBpIDw9IGVuZEluZGV4OyBpKyspXG5cdFx0e1xuXHRcdFx0dGhpcy5zZWdtZW50c1tpXS5hZGQocmVjdGFuZ2xlKTtcblx0XHR9XG5cdH1cblxuXHRkZWxldGUocmVjdGFuZ2xlKVxuXHR7XG5cdFx0aWYoIWlzUmVjdGFuZ2xlKHJlY3RhbmdsZSkpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdPYmplY3Qgc3VwcGxpZWQgaXMgbm90IGEgUmVjdGFuZ2xlLiBNdXN0IGhhdmUgcHJvcGVydGllczogeDEsIHkxLCB4MiwgeTEuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcmVjdE1pbiA9IHRoaXMuZGVwdGggPT09IDAgPyByZWN0YW5nbGUueDEgOiByZWN0YW5nbGUueTE7XG5cdFx0Y29uc3QgcmVjdE1heCA9IHRoaXMuZGVwdGggPT09IDAgPyByZWN0YW5nbGUueDIgOiByZWN0YW5nbGUueTI7XG5cblx0XHRjb25zdCBzdGFydEluZGV4ID0gdGhpcy5maW5kU2VnbWVudChyZWN0TWluKTtcblx0XHRjb25zdCBlbmRJbmRleCA9IHRoaXMuZmluZFNlZ21lbnQocmVjdE1heCk7XG5cblx0XHRjb25zdCBlbXB0eSA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpID0gc3RhcnRJbmRleDsgaSA8PSBlbmRJbmRleDsgaSsrKVxuXHRcdHtcblx0XHRcdGlmKHRoaXMuc2VnbWVudHNbaV0uZGVsZXRlKHJlY3RhbmdsZSkpXG5cdFx0XHR7XG5cdFx0XHRcdGVtcHR5LnB1c2goaSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Zm9yKGxldCBpID0gLTEgKyBlbXB0eS5sZW5ndGg7IGkgPj0gMDsgaS0tKVxuXHRcdHtcblx0XHRcdGNvbnN0IGUgPSBlbXB0eVtpXTtcblxuXHRcdFx0aWYoIXRoaXMuc2VnbWVudHNbLTEgKyBlXSlcblx0XHRcdHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGVsZXRlIHNlZ21lbnQgd2l0aG91dCBwcmVkZWNlc3Nvci4nKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNlZ21lbnRzWy0xICsgZV0uZW5kID0gdGhpcy5zZWdtZW50c1tlXS5lbmQ7XG5cdFx0XHR0aGlzLnNlZ21lbnRzWzEgKyBlXS5wcmV2ID0gdGhpcy5zZWdtZW50c1stMSArIGVdO1xuXHRcdFx0dGhpcy5zZWdtZW50cy5zcGxpY2UoZSwgMSk7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5zZWdtZW50cy5sZW5ndGggPT09IDIgJiYgdGhpcy5zZWdtZW50c1swXS5zaXplID09IDAgJiYgdGhpcy5zZWdtZW50c1sxXS5zaXplID09PSAwKVxuXHRcdHtcblx0XHRcdHRoaXMuc2VnbWVudHNbMF0uZW5kID0gdGhpcy5zZWdtZW50c1sxXS5lbmQ7XG5cdFx0XHR0aGlzLnNlZ21lbnRzLmxlbmd0aCA9IDE7XG5cdFx0fVxuXHR9XG5cblx0cXVlcnkoeDEsIHkxLCB4MiwgeTIpXG5cdHtcblx0XHRjb25zdCByZXN1bHRzID0gbmV3IFNldDtcblxuXHRcdGNvbnN0IHhTdGFydEluZGV4ID0gdGhpcy5maW5kU2VnbWVudCh4MSk7XG5cdFx0Y29uc3QgeEVuZEluZGV4ID0gdGhpcy5maW5kU2VnbWVudCh4Mik7XG5cblx0XHRmb3IobGV0IGkgPSB4U3RhcnRJbmRleDsgaSA8PSB4RW5kSW5kZXg7IGkrKylcblx0XHR7XG5cdFx0XHRjb25zdCBzZWdtZW50ID0gdGhpcy5zZWdtZW50c1tpXTtcblxuXHRcdFx0aWYoIXNlZ21lbnQuc3ViVHJlZSlcblx0XHRcdHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHlTdGFydEluZGV4ID0gc2VnbWVudC5zdWJUcmVlLmZpbmRTZWdtZW50KHkxKTtcblx0XHRcdGNvbnN0IHlFbmRJbmRleCA9IHNlZ21lbnQuc3ViVHJlZS5maW5kU2VnbWVudCh5Mik7XG5cblx0XHRcdGZvcihsZXQgaiA9IHlTdGFydEluZGV4OyBqIDw9IHlFbmRJbmRleDsgaisrKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IoY29uc3QgcmVzdWx0IG9mIHNlZ21lbnQuc3ViVHJlZS5zZWdtZW50c1tqXS5yZWN0YW5nbGVzKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cmVzdWx0cy5hZGQocmVzdWx0KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHRzcGxpdFNlZ21lbnQoaW5kZXgsIGF0KVxuXHR7XG5cdFx0aWYoYXQgPD0gdGhpcy5zZWdtZW50c1tpbmRleF0uc3RhcnQgfHwgYXQgPj0gdGhpcy5zZWdtZW50c1tpbmRleF0uZW5kKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBzcGxpdFNlZ21lbnRzID0gdGhpcy5zZWdtZW50c1tpbmRleF0uc3BsaXQoYXQpO1xuXG5cdFx0dGhpcy5zZWdtZW50cy5zcGxpY2UoaW5kZXgsIDEsIC4uLnNwbGl0U2VnbWVudHMpO1xuXHR9XG5cblx0ZmluZFNlZ21lbnQoYXQpXG5cdHtcblx0XHRsZXQgbG8gPSAwO1xuXHRcdGxldCBoaSA9IC0xICsgdGhpcy5zZWdtZW50cy5sZW5ndGg7XG5cblx0XHRkb1xuXHRcdHtcblx0XHRcdGNvbnN0IGN1cnJlbnQgPSBNYXRoLmZsb29yKChsbyArIGhpKSAqIDAuNSk7XG5cdFx0XHRjb25zdCBzZWdtZW50ID0gdGhpcy5zZWdtZW50c1tjdXJyZW50XTtcblxuXHRcdFx0aWYoc2VnbWVudC5zdGFydCA8IGF0ICYmIHNlZ21lbnQuZW5kID49IGF0KVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudDtcblx0XHRcdH1cblxuXHRcdFx0aWYoc2VnbWVudC5zdGFydCA8IGF0KVxuXHRcdFx0e1xuXHRcdFx0XHRsbyA9IDEgKyBjdXJyZW50O1xuXHRcdFx0fVxuXG5cdFx0XHRpZihzZWdtZW50LmVuZCA+IGF0KVxuXHRcdFx0e1xuXHRcdFx0XHRoaSA9IC0xICsgY3VycmVudDtcblx0XHRcdH1cblx0XHR9IHdoaWxlKGxvIDw9IGhpKTtcblxuXHRcdHJldHVybiAtMTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIFNwbGl0XG57XG5cdHN0YXRpYyBieXRlcyA9IG5ldyBVaW50OENsYW1wZWRBcnJheSg0KTtcblx0c3RhdGljIHdvcmRzID0gbmV3IFVpbnQxNkFycmF5KHRoaXMuYnl0ZXMuYnVmZmVyKTtcblx0c3RhdGljIHZhbHVlID0gbmV3IFVpbnQzMkFycmF5KHRoaXMuYnl0ZXMuYnVmZmVyKTtcblxuXHRzdGF0aWMgaW50VG9CeXRlcyh2YWx1ZSlcblx0e1xuXHRcdHRoaXMudmFsdWVbMF0gPSB2YWx1ZTtcblxuXHRcdHJldHVybiBbLi4udGhpcy5ieXRlc107XG5cdH1cbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuXG5leHBvcnQgIGNsYXNzIENvbnRyb2xsZXJcbntcblx0dHJpZ2dlcnMgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUoe30pO1xuXHRheGlzICAgICA9IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh7fSk7XG5cdFxuXHRjb25zdHJ1Y3Rvcih7a2V5Ym9hcmQsIG9uU2NyZWVuSm95UGFkfSlcblx0e1xuXHRcdGtleWJvYXJkLmtleXMuYmluZFRvKCh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMua2V5UHJlc3Moayx2LHRba10pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmKHYgPT09IC0xKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmtleVJlbGVhc2Uoayx2LHRba10pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHR9KTtcblxuXHRcdG9uU2NyZWVuSm95UGFkLmFyZ3MuYmluZFRvKCd4JywgKHYpID0+IHtcblx0XHRcdHRoaXMuYXhpc1swXSA9IHYgLyA1MDtcblx0XHR9KTtcblxuXHRcdG9uU2NyZWVuSm95UGFkLmFyZ3MuYmluZFRvKCd5JywgKHYpID0+IHtcblx0XHRcdHRoaXMuYXhpc1sxXSA9IHYgLyA1MDtcblx0XHR9KTtcblx0fVxuXG5cdGtleVByZXNzKGtleSwgdmFsdWUsIHByZXYpXG5cdHtcblx0XHRpZigvXlswLTldJC8udGVzdChrZXkpKVxuXHRcdHtcblx0XHRcdHRoaXMudHJpZ2dlcnNba2V5XSA9IHRydWU7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c3dpdGNoKGtleSlcblx0XHR7XG5cdFx0XHRjYXNlICdBcnJvd1JpZ2h0Jzpcblx0XHRcdFx0dGhpcy5heGlzWzBdID0gMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93RG93bic6XG5cdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0xlZnQnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAtMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93VXAnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAtMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0a2V5UmVsZWFzZShrZXksIHZhbHVlLCBwcmV2KVxuXHR7XG5cdFx0aWYoL15bMC05XSQvLnRlc3Qoa2V5KSlcblx0XHR7XG5cdFx0XHR0aGlzLnRyaWdnZXJzW2tleV0gPSBmYWxzZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzd2l0Y2goa2V5KVxuXHRcdHtcblx0XHRcdGNhc2UgJ0Fycm93UmlnaHQnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMF0gPiAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0xlZnQnOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMF0gPCAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzBdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dEb3duJzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzFdID4gMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dVcCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1sxXSA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMV0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIEVudGl0eVxue1xuXHRjb25zdHJ1Y3Rvcih7c3ByaXRlLCBjb250cm9sbGVyLCB4LCB5fSlcblx0e1xuXHRcdHRoaXMuZGlyZWN0aW9uID0gJ3NvdXRoJztcblx0XHR0aGlzLnN0YXRlID0gJ3N0YW5kaW5nJztcblxuXHRcdHRoaXMuc3ByaXRlID0gc3ByaXRlO1xuXHRcdHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG5cblx0XHR0aGlzLnggPSB4O1xuXHRcdHRoaXMueSA9IHk7XG5cblx0XHR0aGlzLnNwcml0ZS5zcHJpdGVCb2FyZC5yZW5kZXJNb2RlID0gMDtcblx0fVxuXG5cdGNyZWF0ZSgpXG5cdHtcblx0fVxuXG5cdHNpbXVsYXRlKClcblx0e1xuXHRcdGxldCBzcGVlZCA9IDQ7XG5cblx0XHRjb25zdCB4QXhpcyA9IE1hdGgubWluKDEsIE1hdGgubWF4KHRoaXMuY29udHJvbGxlci5heGlzWzBdIHx8IDAsIC0xKSkgfHwgMDtcblx0XHRjb25zdCB5QXhpcyA9IE1hdGgubWluKDEsIE1hdGgubWF4KHRoaXMuY29udHJvbGxlci5heGlzWzFdIHx8IDAsIC0xKSkgfHwgMDtcblxuXHRcdHRoaXMuc3ByaXRlLnggKz0gTWF0aC5hYnMoeEF4aXMpICogTWF0aC5zaWduKHhBeGlzKSAqIHNwZWVkO1xuXHRcdHRoaXMuc3ByaXRlLnkgKz0gTWF0aC5hYnMoeUF4aXMpICogTWF0aC5zaWduKHlBeGlzKSAqIHNwZWVkO1xuXG5cdFx0bGV0IGhvcml6b250YWwgPSBmYWxzZTtcblxuXHRcdGlmKE1hdGguYWJzKHhBeGlzKSA+IE1hdGguYWJzKHlBeGlzKSlcblx0XHR7XG5cdFx0XHRob3Jpem9udGFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZihob3Jpem9udGFsKVxuXHRcdHtcblx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ3dlc3QnO1xuXG5cdFx0XHRpZih4QXhpcyA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ2Vhc3QnO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXRlID0gJ3dhbGtpbmcnO1xuXG5cdFx0fVxuXHRcdGVsc2UgaWYoeUF4aXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnbm9ydGgnO1xuXG5cdFx0XHRpZih5QXhpcyA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZGlyZWN0aW9uID0gJ3NvdXRoJztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zdGF0ZSA9ICd3YWxraW5nJztcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHRoaXMuc3RhdGUgPSAnc3RhbmRpbmcnO1xuXHRcdH1cblxuXHRcdHRoaXMuc3ByaXRlLmNoYW5nZUFuaW1hdGlvbihgJHt0aGlzLnN0YXRlfS0ke3RoaXMuZGlyZWN0aW9ufWApO1xuXHR9XG5cblx0ZGVzdHJveSgpXG5cdHtcblx0fVxufVxuIiwiaW1wb3J0IHsgRW50aXR5IH0gZnJvbSBcIi4vRW50aXR5XCI7XG5cbmNvbnN0IGZpcmVSZWdpb24gPSBbMSwgMCwgMF07XG5jb25zdCB3YXRlclJlZ2lvbiA9IFswLCAxLCAxXTtcblxuZXhwb3J0IGNsYXNzIFBsYXllciBleHRlbmRzIEVudGl0eVxue1xuXHRzaW11bGF0ZSgpXG5cdHtcblx0XHRzdXBlci5zaW11bGF0ZSgpO1xuXG5cdFx0aWYoTWF0aC50cnVuYyhwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApICUgMTUgPT09IDApXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUucmVnaW9uID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZihNYXRoLnRydW5jKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkgJSAxNSA9PT0gNSlcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5yZWdpb24gPSB3YXRlclJlZ2lvbjtcblx0XHR9XG5cblx0XHRpZihNYXRoLnRydW5jKHBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkgJSAxNSA9PT0gMTApXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGUucmVnaW9uID0gZmlyZVJlZ2lvbjtcblx0XHR9XG5cblx0XHRmb3IobGV0IHQgaW4gdGhpcy5jb250cm9sbGVyLnRyaWdnZXJzKVxuXHRcdHtcblx0XHRcdGlmKCF0aGlzLmNvbnRyb2xsZXIudHJpZ2dlcnNbdF0pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNwcml0ZS5zcHJpdGVCb2FyZC5yZW5kZXJNb2RlID0gdDtcblxuXHRcdFx0aWYodCA9PT0gJzknKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBtYXBzID0gdGhpcy5zcHJpdGUuc3ByaXRlQm9hcmQud29ybGQuZ2V0TWFwc0ZvclBvaW50KFxuXHRcdFx0XHRcdHRoaXMuc3ByaXRlLngsIHRoaXMuc3ByaXRlLnksXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0bWFwcy5mb3JFYWNoKG0gPT4gY29uc29sZS5sb2cobS5zcmMpKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcXG5cXG51bmlmb3JtIHZlYzQgdV9jb2xvcjtcXG52YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDtcXG5cXG52b2lkIG1haW4oKSB7XFxuICAvLyBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodV9pbWFnZSwgdl90ZXhDb29yZCk7XFxuICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDEuMCwgMS4wLCAwLjAsIDAuMjUpO1xcbn1cXG5cIiIsIm1vZHVsZS5leHBvcnRzID0gXCJhdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uO1xcbmF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7XFxuXFxudW5pZm9ybSB2ZWMyIHVfcmVzb2x1dGlvbjtcXG52YXJ5aW5nIHZlYzIgdl90ZXhDb29yZDtcXG5cXG52b2lkIG1haW4oKVxcbntcXG4gIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjtcXG4gIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wO1xcbiAgdmVjMiBjbGlwU3BhY2UgPSB6ZXJvVG9Ud28gLSAxLjA7XFxuXFxuICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpO1xcbiAgdl90ZXhDb29yZCAgPSBhX3RleENvb3JkO1xcbn1cXG5cIiIsImV4cG9ydCBjbGFzcyBDYW1lcmFcbntcblx0c3RhdGljIHggPSAwO1xuXHRzdGF0aWMgeSA9IDA7XG5cdHN0YXRpYyB3aWR0aCAgPSAwO1xuXHRzdGF0aWMgaGVpZ2h0ID0gMDtcbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuXG5leHBvcnQgY2xhc3MgTWFwUmVuZGVyZXJcbntcblx0Y29uc3RydWN0b3Ioe3Nwcml0ZUJvYXJkLCBtYXB9KVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXG5cdFx0dGhpcy5sb2FkZWQgPSBmYWxzZTtcblxuXHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdHRoaXMud2lkdGggID0gMDtcblx0XHR0aGlzLmhlaWdodCA9IDA7XG5cblx0XHR0aGlzLnRpbGVXaWR0aCAgPSAwO1xuXHRcdHRoaXMudGlsZUhlaWdodCA9IDA7XG5cblx0XHR0aGlzLnhPZmZzZXQgPSAwO1xuXHRcdHRoaXMueU9mZnNldCA9IDA7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0dGhpcy50aWxlTWFwcGluZyA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jcmVhdGVUZXh0dXJlKDEsIDEpO1xuXHRcdHRoaXMudGlsZVRleHR1cmUgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY3JlYXRlVGV4dHVyZSgxLCAxKTtcblxuXHRcdGNvbnN0IHIgPSAoKSA9PiBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRik7XG5cdFx0Y29uc3QgcGl4ZWwgPSBuZXcgVWludDhBcnJheShbcigpLCByKCksIHIoKSwgMHhGRl0pO1xuXG5cdFx0bWFwLnJlYWR5LnRoZW4oKCkgPT4ge1xuXHRcdFx0dGhpcy5sb2FkZWQgPSB0cnVlO1xuXHRcdFx0dGhpcy50aWxlV2lkdGggID0gbWFwLnRpbGVXaWR0aDtcblx0XHRcdHRoaXMudGlsZUhlaWdodCA9IG1hcC50aWxlSGVpZ2h0O1xuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50aWxlVGV4dHVyZSk7XG5cdFx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBtYXAudGlsZVNldFdpZHRoXG5cdFx0XHRcdCwgbWFwLnRpbGVTZXRIZWlnaHRcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdFx0LCBtYXAucGl4ZWxzXG5cdFx0XHQpO1xuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG5cblx0XHR9KTtcblx0fVxuXG5cdG5lZ1NhZmVNb2QoYSxiKVxuXHR7XG5cdFx0aWYoYSA+PSAwKSByZXR1cm4gYSAlIGI7XG5cdFx0cmV0dXJuIChiICsgYSAlIGIpICUgYjtcblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0aWYoIXRoaXMubG9hZGVkKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Y29uc3QgeCA9IHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nLnNwcml0ZS54O1xuXHRcdGNvbnN0IHkgPSB0aGlzLnNwcml0ZUJvYXJkLmZvbGxvd2luZy5zcHJpdGUueTtcblxuXHRcdGNvbnN0IHpvb20gPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0Y29uc3QgaGFsZlRpbGVXaWR0aCAgPSB0aGlzLnRpbGVXaWR0aCAgKiAwLjU7XG5cdFx0Y29uc3QgaGFsZlRpbGVIZWlnaHQgPSB0aGlzLnRpbGVIZWlnaHQgKiAwLjU7XG5cblx0XHRjb25zdCB0aWxlc1dpZGUgPSBNYXRoLmZsb29yKHRoaXMud2lkdGggLyB0aGlzLnRpbGVXaWR0aCk7XG5cdFx0Y29uc3QgdGlsZXNIaWdoID0gTWF0aC5mbG9vcih0aGlzLmhlaWdodCAvIHRoaXMudGlsZUhlaWdodCk7XG5cblx0XHRjb25zdCB4T2Zmc2V0ID0gTWF0aC5mbG9vcihNYXRoLmZsb29yKCgwLjUgKiB0aGlzLndpZHRoKSAgLyA2NCkgKyAwKSAqIDY0O1xuXHRcdGNvbnN0IHlPZmZzZXQgPSBNYXRoLmZsb29yKE1hdGguZmxvb3IoKDAuNSAqIHRoaXMuaGVpZ2h0KSAvIDY0KSArIDApICogNjQ7XG5cblx0XHRjb25zdCB4VGlsZSA9ICh4K2hhbGZUaWxlV2lkdGgpL3RoaXMudGlsZVdpZHRoXG5cdFx0XHQrIC10aGlzLm5lZ1NhZmVNb2QoIHggKyBoYWxmVGlsZVdpZHRoLCA2NCApIC8gdGhpcy50aWxlV2lkdGhcblx0XHRcdCsgLXRoaXMubWFwLnhXb3JsZCAvIHRoaXMudGlsZVdpZHRoXG5cdFx0XHQrIC14T2Zmc2V0IC8gdGhpcy50aWxlV2lkdGg7XG5cblx0XHRjb25zdCB5VGlsZSA9ICh5K2hhbGZUaWxlSGVpZ2h0KS90aGlzLnRpbGVIZWlnaHRcblx0XHRcdCsgLXRoaXMubmVnU2FmZU1vZCggeSArIGhhbGZUaWxlSGVpZ2h0LCA2NCApIC8gdGhpcy50aWxlSGVpZ2h0XG5cdFx0XHQrIC10aGlzLm1hcC55V29ybGQgLyB0aGlzLnRpbGVIZWlnaHRcblx0XHRcdCsgLXlPZmZzZXQgLyB0aGlzLnRpbGVIZWlnaHQ7XG5cblx0XHRpZih4VGlsZSArIHRpbGVzV2lkZSA8IDAgfHwgeVRpbGUgKyB0aWxlc0hpZ2ggPCAwKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCB4UG9zID0gem9vbSAqIChcblx0XHRcdCh0aGlzLndpZHRoICsgdGhpcy54T2Zmc2V0KSAqIDAuNVxuXHRcdFx0KyAtdGhpcy5uZWdTYWZlTW9kKCB4ICsgaGFsZlRpbGVXaWR0aCwgNjQgKVxuXHRcdFx0KyAteE9mZnNldFxuXHRcdCk7XG5cblx0XHRjb25zdCB5UG9zID0gem9vbSAqIChcblx0XHRcdCh0aGlzLmhlaWdodCArIHRoaXMueU9mZnNldCkgKiAwLjVcblx0XHRcdCsgLXRoaXMubmVnU2FmZU1vZCggeSArIGhhbGZUaWxlSGVpZ2h0LCA2NCApXG5cdFx0XHQrIC15T2Zmc2V0XG5cdFx0KTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3Vfc2l6ZScsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3RpbGVTaXplJywgdGhpcy50aWxlV2lkdGgsIHRoaXMudGlsZUhlaWdodCk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9tYXBUZXh0dXJlU2l6ZScsIHRoaXMubWFwLnRpbGVTZXRXaWR0aCwgdGhpcy5tYXAudGlsZVNldEhlaWdodCk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtSSgndV9yZW5kZXJUaWxlcycsIDEpO1xuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMik7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50aWxlVGV4dHVyZSk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtSSgndV90aWxlcycsIDIpO1xuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMyk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50aWxlTWFwcGluZyk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtSSgndV90aWxlTWFwcGluZycsIDMpO1xuXG5cdFx0Y29uc3QgdGlsZVBpeGVsTGF5ZXJzID0gdGhpcy5tYXAuZ2V0U2xpY2UoeFRpbGUsIHlUaWxlLCB0aWxlc1dpZGUsIHRpbGVzSGlnaCwgcGVyZm9ybWFuY2Uubm93KCkvMTAwMCk7XG5cblx0XHRmb3IoY29uc3QgdGlsZVBpeGVscyBvZiB0aWxlUGl4ZWxMYXllcnMpXG5cdFx0e1xuXHRcdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgdGlsZXNXaWRlXG5cdFx0XHRcdCwgdGlsZXNIaWdoXG5cdFx0XHRcdCwgMFxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHRcdCwgdGlsZVBpeGVsc1xuXHRcdFx0KTtcblxuXHRcdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHRcdHhQb3MgKyB0aGlzLnRpbGVXaWR0aCAqIDAuNSAqIHpvb21cblx0XHRcdFx0LCB5UG9zICsgdGhpcy50aWxlSGVpZ2h0ICogem9vbVxuXHRcdFx0XHQsIHRoaXMud2lkdGggKiB6b29tXG5cdFx0XHRcdCwgdGhpcy5oZWlnaHQgKiB6b29tXG5cdFx0XHQpO1xuXG5cdFx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd0J1ZmZlcik7XG5cdFx0XHRnbC5kcmF3QXJyYXlzKGdsLlRSSUFOR0xFUywgMCwgNik7XG5cdFx0fVxuXG5cdFx0Ly8gQ2xlYW51cC4uLlxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUkoJ3VfcmVuZGVyVGlsZXMnLCAwKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUyKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTMpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXG5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0fVxuXG5cdHJlc2l6ZSh4LCB5KVxuXHR7XG5cdFx0dGhpcy53aWR0aCA9ICB4ICsgMDtcblx0XHR0aGlzLmhlaWdodCA9IHkgKyAwO1xuXG5cdFx0dGhpcy53aWR0aCA9ICBNYXRoLmNlaWwoeCAvIDEyOCkgKiAxMjggKyAxMjg7XG5cdFx0dGhpcy5oZWlnaHQgPSBNYXRoLmNlaWwoeSAvIDEyOCkgKiAxMjggKyAxMjg7XG5cblx0XHR0aGlzLnhPZmZzZXQgPSB4IC0gdGhpcy53aWR0aDtcblx0XHR0aGlzLnlPZmZzZXQgPSB5IC0gdGhpcy5oZWlnaHQ7XG5cdH1cblxuXHRzaW11bGF0ZSgpXG5cdHt9XG5cblx0c2V0UmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0uYnVmZmVycy5hX3RleENvb3JkKTtcblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHQwLjAsIDAuMCxcblx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0MC4wLCAxLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDEuMCwgMC4wLFxuXHRcdFx0MS4wLCAxLjAsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblxuXHRcdGNvbnN0IHgxID0geDtcblx0XHRjb25zdCB4MiA9IHggKyB3aWR0aDtcblx0XHRjb25zdCB5MSA9IHk7XG5cdFx0Y29uc3QgeTIgPSB5ICsgaGVpZ2h0O1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0uYnVmZmVycy5hX3Bvc2l0aW9uKTtcblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmluZGFibGUgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tICcuL0NhbWVyYSc7XG5cbmNsYXNzIFBhcmFsbGF4TGF5ZXJcbntcblx0dGV4dHVyZSA9IG51bGw7XG5cdHdpZHRoID0gMDtcblx0aGVpZ2h0ID0gMDtcblx0b2Zmc2V0ID0gMDtcblx0cGFyYWxsYXggPSAwO1xufVxuXG5leHBvcnQgY2xhc3MgUGFyYWxsYXhcbntcblx0Y29uc3RydWN0b3Ioe3Nwcml0ZUJvYXJkLCBtYXB9KVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IHNwcml0ZUJvYXJkO1xuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblxuXHRcdHRoaXMubWFwID0gbWFwO1xuXHRcdHRoaXMudGV4dHVyZSA9IG51bGw7XG5cblx0XHR0aGlzLmhlaWdodCA9IDA7XG5cblx0XHR0aGlzLnNsaWNlcyA9IFtcblx0XHRcdCdwYXJhbGxheC9tb3VudGFpbnMtMC5wbmcnXG5cdFx0XHQsICdwYXJhbGxheC9za3ktMC1yZWNvbG9yLnBuZydcblx0XHRcdCwgJ3BhcmFsbGF4L3NreS0xLXJlY29sb3IucG5nJ1xuXHRcdFx0LCAncGFyYWxsYXgvc2t5LTFiLXJlY29sb3IucG5nJ1xuXHRcdFx0LCAncGFyYWxsYXgvc2t5LTItcmVjb2xvci5wbmcnXG5cdFx0XTtcblxuXHRcdHRoaXMucGFyYWxsYXhMYXllcnMgPSBbXTtcblx0XHR0aGlzLnRleHR1cmVzID0gW107XG5cblx0XHRtYXAucmVhZHkudGhlbigoKSA9PiB0aGlzLmFzc2VtYmxlKG1hcCkpLnRoZW4oKCkgPT4ge1xuXHRcdFx0dGhpcy5sb2FkZWQgPSB0cnVlO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5sb2FkZWQgPSBmYWxzZTtcblxuXHRcdHRoaXMueCA9IDA7XG5cdFx0dGhpcy55ID0gMDtcblx0fVxuXG5cdGFzc2VtYmxlKClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRjb25zdCBsb2FkU2xpY2VzID0gdGhpcy5tYXAuaW1hZ2VMYXllcnMubWFwKFxuXHRcdFx0KGxheWVyRGF0YSwgaW5kZXgpID0+IHRoaXMuY29uc3RydWN0b3IubG9hZEltYWdlKGxheWVyRGF0YS5pbWFnZSkudGhlbihpbWFnZSA9PiB7XG5cdFx0XHRcdGNvbnN0IHRleHR1cmUgPSB0aGlzLnRleHR1cmVzW2luZGV4XSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblx0XHRcdFx0Y29uc3QgbGF5ZXIgPSB0aGlzLnBhcmFsbGF4TGF5ZXJzW2luZGV4XSA9IG5ldyBQYXJhbGxheExheWVyO1xuXG5cdFx0XHRcdGNvbnN0IGxheWVyQm90dG9tID0gaW1hZ2UuaGVpZ2h0ICsgbGF5ZXJEYXRhLm9mZnNldHk7XG5cblx0XHRcdFx0aWYodGhpcy5oZWlnaHQgPCBsYXllckJvdHRvbSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuaGVpZ2h0ID0gbGF5ZXJCb3R0b207XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsYXllci50ZXh0dXJlID0gdGV4dHVyZTtcblx0XHRcdFx0bGF5ZXIud2lkdGggPSBpbWFnZS53aWR0aDtcblx0XHRcdFx0bGF5ZXIuaGVpZ2h0ID0gaW1hZ2UuaGVpZ2h0O1xuXHRcdFx0XHRsYXllci5vZmZzZXQgPSBsYXllckRhdGEub2Zmc2V0eSA/PyAwO1xuXHRcdFx0XHRsYXllci5wYXJhbGxheCA9IGxheWVyRGF0YS5wYXJhbGxheHggPz8gMTtcblxuXHRcdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKTtcblxuXHRcdFx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdFx0XHQsIDBcblx0XHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdFx0XHQsIGltYWdlXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuUkVQRUFUKTtcblx0XHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cblx0XHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLk5FQVJFU1QpO1xuXHRcdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0XHR9XG5cdFx0KSk7XG5cblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwobG9hZFNsaWNlcyk7XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdGlmKCF0aGlzLmxvYWRlZClcblx0XHR7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLnNwcml0ZUJvYXJkLmdsMmQuY29udGV4dDtcblx0XHRjb25zdCB6b29tID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblxuXHRcdHRoaXMueCA9IHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nLnNwcml0ZS54ICsgLXRoaXMuc3ByaXRlQm9hcmQud2lkdGggLyB6b29tICogMC41O1xuXHRcdHRoaXMueSA9IHRoaXMuc3ByaXRlQm9hcmQuZm9sbG93aW5nLnNwcml0ZS55O1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtSSgndV9yZW5kZXJQYXJhbGxheCcsIDEpO1xuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3Vfc2Nyb2xsJywgdGhpcy54LCB0aGlzLnkpO1xuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCk7XG5cblx0XHRmb3IoY29uc3QgbGF5ZXIgb2YgdGhpcy5wYXJhbGxheExheWVycylcblx0XHR7XG5cdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBsYXllci50ZXh0dXJlKTtcblxuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9zaXplJywgbGF5ZXIud2lkdGgsIGxheWVyLndpZHRoKTtcblx0XHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfcGFyYWxsYXgnLCBsYXllci5wYXJhbGxheCwgMCk7XG5cblx0XHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0XHQwXG5cdFx0XHRcdCwgdGhpcy5zcHJpdGVCb2FyZC5oZWlnaHQgKyAoLXRoaXMuaGVpZ2h0ICsgbGF5ZXIub2Zmc2V0KSAqIHpvb21cblx0XHRcdFx0LCBsYXllci53aWR0aCAqIHpvb21cblx0XHRcdFx0LCBsYXllci5oZWlnaHQgKiB6b29tXG5cdFx0XHRcdCwgbGF5ZXIud2lkdGhcblx0XHRcdCk7XG5cblx0XHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3QnVmZmVyKTtcblx0XHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblx0XHR9XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X3JlbmRlclBhcmFsbGF4JywgMCk7XG5cblx0XHQvLyBDbGVhbnVwLi4uXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0fVxuXG5cdHN0YXRpYyBsb2FkSW1hZ2Uoc3JjKVxuXHR7XG5cdFx0aWYoIXRoaXMuaW1hZ2VQcm9taXNlcylcblx0XHR7XG5cdFx0XHR0aGlzLmltYWdlUHJvbWlzZXMgPSB7fTtcblx0XHR9XG5cblx0XHRpZih0aGlzLmltYWdlUHJvbWlzZXNbc3JjXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbWFnZVByb21pc2VzW3NyY107XG5cdFx0fVxuXG5cdFx0dGhpcy5pbWFnZVByb21pc2VzW3NyY10gPSBuZXcgUHJvbWlzZSgoYWNjZXB0LCByZWplY3QpPT57XG5cdFx0XHRjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdFx0aW1hZ2Uuc3JjICAgPSBzcmM7XG5cdFx0XHRpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKGV2ZW50KT0+e1xuXHRcdFx0XHRhY2NlcHQoaW1hZ2UpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcy5pbWFnZVByb21pc2VzW3NyY107XG5cdH1cblxuXHRzZXRSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodClcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cblx0XHRjb25zdCByYXRpbyA9IHRoaXMuc3ByaXRlQm9hcmQud2lkdGggLyB3aWR0aDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLmJ1ZmZlcnMuYV90ZXhDb29yZCk7XG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0MC4wLCAwLjAsXG5cdFx0XHRyYXRpbywgMC4wLFxuXHRcdFx0MC4wLCAxLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdHJhdGlvLCAwLjAsXG5cdFx0XHRyYXRpbywgMS4wLFxuXHRcdF0pLCBnbC5TVEFUSUNfRFJBVyk7XG5cblx0XHRjb25zdCB4MSA9IHggLSAwO1xuXHRcdGNvbnN0IHgyID0geCArIHRoaXMuc3ByaXRlQm9hcmQud2lkdGg7XG5cdFx0Y29uc3QgeTEgPSB5O1xuXHRcdGNvbnN0IHkyID0geSArIGhlaWdodDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLmJ1ZmZlcnMuYV9wb3NpdGlvbik7XG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDIsIHkyLFxuXHRcdFx0eDEsIHkxLFxuXHRcdFx0eDEsIHkxLFxuXHRcdFx0eDIsIHkyLFxuXHRcdFx0eDIsIHkxLFxuXHRcdF0pLCBnbC5TVEFUSUNfRFJBVyk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSBcImN1cnZhdHVyZS9iYXNlL0JpbmRhYmxlXCI7XG5pbXBvcnQgeyBDYW1lcmEgfSBmcm9tIFwiLi9DYW1lcmFcIjtcbmltcG9ydCB7IFNwbGl0IH0gZnJvbSBcIi4uL21hdGgvU3BsaXRcIjtcbmltcG9ydCB7IE1hdHJpeCB9IGZyb20gXCIuLi9tYXRoL01hdHJpeFwiO1xuaW1wb3J0IHsgU3ByaXRlU2hlZXQgfSBmcm9tIFwiLi9TcHJpdGVTaGVldFwiO1xuXG5leHBvcnQgY2xhc3MgU3ByaXRlXG57XG5cdGNvbnN0cnVjdG9yKHtzcmMsIHNwcml0ZUJvYXJkLCBzcHJpdGVTZXQsIHdpZHRoLCBoZWlnaHQsIHgsIHksIHp9KVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cblx0XHR0aGlzLnggPSB4IHx8IDA7XG5cdFx0dGhpcy55ID0geSB8fCAwO1xuXHRcdHRoaXMueiA9IHogfHwgMDtcblxuXHRcdHRoaXMuY3VycmVudEFuaW1hdGlvbiA9IG51bGw7XG5cblx0XHR0aGlzLndpZHRoICA9IDMyIHx8IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gMzIgfHwgaGVpZ2h0O1xuXHRcdHRoaXMuc2NhbGUgID0gMTtcblxuXHRcdHRoaXMudGV4dHVyZXMgPSBbXTtcblxuXHRcdHRoaXMuZnJhbWVzID0gW107XG5cdFx0dGhpcy5jdXJyZW50RGVsYXkgPSAwO1xuXHRcdHRoaXMuY3VycmVudEZyYW1lID0gMDtcblx0XHR0aGlzLmN1cnJlbnRGcmFtZXMgPSAnJztcblxuXHRcdHRoaXMuc3BlZWQgICAgPSAwO1xuXHRcdHRoaXMubWF4U3BlZWQgPSA0O1xuXG5cdFx0dGhpcy5tb3ZpbmcgPSBmYWxzZTtcblxuXHRcdHRoaXMuUklHSFRcdD0gMDtcblx0XHR0aGlzLkRPV05cdD0gMTtcblx0XHR0aGlzLkxFRlRcdD0gMjtcblx0XHR0aGlzLlVQXHRcdD0gMztcblxuXHRcdHRoaXMuRUFTVFx0PSB0aGlzLlJJR0hUO1xuXHRcdHRoaXMuU09VVEhcdD0gdGhpcy5ET1dOO1xuXHRcdHRoaXMuV0VTVFx0PSB0aGlzLkxFRlQ7XG5cdFx0dGhpcy5OT1JUSFx0PSB0aGlzLlVQO1xuXG5cdFx0dGhpcy5yZWdpb24gPSBbMCwgMCwgMCwgMV07XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkID0gc3ByaXRlQm9hcmQ7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0dGhpcy50ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGV4dHVyZSk7XG5cblx0XHRjb25zdCByID0gKCkgPT4gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDI1NSk7XG5cdFx0Y29uc3QgcGl4ZWwgPSBuZXcgVWludDhBcnJheShbcigpLCByKCksIHIoKSwgMjU1XSk7XG5cblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgMVxuXHRcdFx0LCAxXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIHBpeGVsXG5cdFx0KTtcblxuXHRcdGlmKHNyYyAmJiAhc3ByaXRlU2V0KVxuXHRcdHtcblx0XHRcdHNwcml0ZVNldCA9IG5ldyBTcHJpdGVTaGVldCh7aW1hZ2U6IHNyY30pO1xuXG5cdFx0XHRjb25zb2xlLmxvZyhzcHJpdGVTZXQpO1xuXHRcdH1cblxuXHRcdHRoaXMuc3ByaXRlU2V0ID0gc3ByaXRlU2V0O1xuXG5cdFx0aWYoc3ByaXRlU2V0KVxuXHRcdHtcblx0XHRcdHNwcml0ZVNldC5yZWFkeS50aGVuKCgpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coc3ByaXRlU2V0KTtcblx0XHRcdFx0dGhpcy53aWR0aCA9IHNwcml0ZVNldC50aWxlV2lkdGg7XG5cdFx0XHRcdHRoaXMuaGVpZ2h0ID0gc3ByaXRlU2V0LnRpbGVIZWlnaHQ7XG5cdFx0XHRcdHRoaXMudGV4dHVyZSA9IHRoaXMuY3JlYXRlVGV4dHVyZSggc3ByaXRlU2V0LmdldEZyYW1lKDApICk7XG5cblx0XHRcdFx0Zm9yKGxldCBpID0gMDsgaSA8IHNwcml0ZVNldC50aWxlQ291bnQ7IGkrKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMudGV4dHVyZXNbaV0gPSB0aGlzLmNyZWF0ZVRleHR1cmUoIHNwcml0ZVNldC5nZXRGcmFtZShpKSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpcy5jaGFuZ2VBbmltYXRpb24oJ2RlZmF1bHQnKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdGRyYXcoZGVsdGEpXG5cdHtcblx0XHRpZih0aGlzLmN1cnJlbnREZWxheSA+IDApXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXkgLT0gZGVsdGE7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnJlbnRGcmFtZSsrO1xuXG5cdFx0XHRpZih0aGlzLnNwcml0ZVNldCAmJiB0aGlzLnNwcml0ZVNldC5hbmltYXRpb25zW3RoaXMuY3VycmVudEFuaW1hdGlvbl0pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGFuaW1hdGlvbiA9IHRoaXMuc3ByaXRlU2V0LmFuaW1hdGlvbnNbdGhpcy5jdXJyZW50QW5pbWF0aW9uXTtcblxuXHRcdFx0XHRpZih0aGlzLmN1cnJlbnRGcmFtZSA+PSBhbmltYXRpb24ubGVuZ3RoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RnJhbWUgPSB0aGlzLmN1cnJlbnRGcmFtZSAlIGFuaW1hdGlvbi5sZW5ndGg7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCB0ZXh0dXJlSWQgPSBhbmltYXRpb25bdGhpcy5jdXJyZW50RnJhbWVdLnRpbGVpZDtcblxuXHRcdFx0XHRjb25zdCB0ZXh0dXJlID0gdGhpcy50ZXh0dXJlc1sgdGV4dHVyZUlkIF07XG5cblx0XHRcdFx0aWYodGV4dHVyZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuY3VycmVudERlbGF5ID0gYW5pbWF0aW9uW3RoaXMuY3VycmVudEZyYW1lXS5kdXJhdGlvbjtcblx0XHRcdFx0XHR0aGlzLnRleHR1cmUgPSB0ZXh0dXJlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCk7XG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50ZXh0dXJlKTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfcmVnaW9uJywgMCwgMCwgMCwgMCk7XG5cblx0XHRjb25zdCB6b29tID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLnpvb21MZXZlbDtcblxuXHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0dGhpcy54ICogem9vbSArIC1DYW1lcmEueCArICh0aGlzLnNwcml0ZUJvYXJkLndpZHRoIC8gMilcblx0XHRcdCwgdGhpcy55ICogem9vbSArIC1DYW1lcmEueSArICh0aGlzLnNwcml0ZUJvYXJkLmhlaWdodCAvIDIpICsgLXRoaXMuaGVpZ2h0ICogem9vbVxuXHRcdFx0LCB0aGlzLndpZHRoICogem9vbVxuXHRcdFx0LCB0aGlzLmhlaWdodCAqIHpvb21cblx0XHQpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmRyYXdCdWZmZXIpO1xuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblxuXHRcdHRoaXMuc3ByaXRlQm9hcmQuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfcmVnaW9uJywgLi4uT2JqZWN0LmFzc2lnbih0aGlzLnJlZ2lvbiB8fCBbMCwgMCwgMF0sIHszOiAxfSkpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmVmZmVjdEJ1ZmZlcik7XG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS51bmlmb3JtRigndV9yZWdpb24nLCAwLCAwLCAwLCAwKTtcblxuXHRcdC8vIENsZWFudXAuLi5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNoYW5nZUFuaW1hdGlvbihuYW1lKVxuXHR7XG5cdFx0aWYoIXRoaXMuc3ByaXRlU2V0IHx8IXRoaXMuc3ByaXRlU2V0LmFuaW1hdGlvbnNbbmFtZV0pXG5cdFx0e1xuXHRcdFx0Y29uc29sZS53YXJuKGBBbmltYXRpb24gJHtuYW1lfSBub3QgZm91bmQuYCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5jdXJyZW50QW5pbWF0aW9uICE9PSBuYW1lKVxuXHRcdHtcblx0XHRcdHRoaXMuY3VycmVudEFuaW1hdGlvbiA9IG5hbWU7XG5cdFx0XHR0aGlzLmN1cnJlbnREZWxheSA9IDA7XG5cdFx0fVxuXHR9XG5cblx0Y3JlYXRlVGV4dHVyZShwaXhlbHMpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC5jb250ZXh0O1xuXHRcdGNvbnN0IHRleHR1cmUgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKTtcblxuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cblx0XHRnbC50ZXhJbWFnZTJEKFxuXHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgdGhpcy53aWR0aFxuXHRcdFx0LCB0aGlzLmhlaWdodFxuXHRcdFx0LCAwXG5cdFx0XHQsIGdsLlJHQkFcblx0XHRcdCwgZ2wuVU5TSUdORURfQllURVxuXHRcdFx0LCBwaXhlbHNcblx0XHQpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG5cblx0XHRyZXR1cm4gdGV4dHVyZTtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0cmFuc2Zvcm0gPSBbXSlcblx0e1xuXHRcdGNvbnN0IGdsID0gdGhpcy5zcHJpdGVCb2FyZC5nbDJkLmNvbnRleHQ7XG5cdFx0Y29uc3Qgem9vbSA9IHRoaXMuc3ByaXRlQm9hcmQuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zcHJpdGVCb2FyZC5kcmF3UHJvZ3JhbS5idWZmZXJzLmFfdGV4Q29vcmQpO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdDAuMCwgMC4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQwLjAsIDEuMCxcblx0XHRcdDAuMCwgMS4wLFxuXHRcdFx0MS4wLCAwLjAsXG5cdFx0XHQxLjAsIDEuMCxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cblx0XHRjb25zdCB4MSA9IHg7XG5cdFx0Y29uc3QgeTEgPSB5ICsgMzIgKiB6b29tO1xuXHRcdGNvbnN0IHgyID0geCArIHdpZHRoO1xuXHRcdGNvbnN0IHkyID0geSArIGhlaWdodCArIDMyICogem9vbTtcblxuXHRcdGNvbnN0IHBvaW50cyA9IG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkxLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDIsIHkyLFxuXHRcdF0pO1xuXG5cdFx0Y29uc3QgeE9mZiA9IHggKyB3aWR0aCAgKiAwLjU7XG5cdFx0Y29uc3QgeU9mZiA9IHkgKyBoZWlnaHQgKiAwLjU7XG5cblxuXHRcdGNvbnN0IHQgPSBNYXRyaXgudHJhbnNmb3JtKHBvaW50cywgTWF0cml4LmNvbXBvc2l0ZShcblx0XHRcdE1hdHJpeC50cmFuc2xhdGUoeE9mZiwgeU9mZilcblx0XHRcdC8vICwgTWF0cml4LnNjYWxlKE1hdGguc2luKHRoZXRhKSwgTWF0aC5jb3ModGhldGEpKVxuXHRcdFx0Ly8gLCBNYXRyaXgucm90YXRlKHRoZXRhKVxuXHRcdFx0LCBNYXRyaXgudHJhbnNsYXRlKC14T2ZmLCAteU9mZilcblx0XHQpKTtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnNwcml0ZUJvYXJkLmRyYXdQcm9ncmFtLmJ1ZmZlcnMuYV9wb3NpdGlvbik7XG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIHQsIGdsLlNUQVRJQ19EUkFXKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQmFnIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmFnJztcbmltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuXG5pbXBvcnQgeyBHbDJkIH0gZnJvbSAnLi4vZ2wyZC9HbDJkJztcbmltcG9ydCB7IENhbWVyYSB9IGZyb20gJy4vQ2FtZXJhJztcbmltcG9ydCB7IFNwcml0ZSB9IGZyb20gJy4vU3ByaXRlJztcbmltcG9ydCB7IE1hcFJlbmRlcmVyIH0gZnJvbSAnLi9NYXBSZW5kZXJlcic7XG5pbXBvcnQgeyBQYXJhbGxheCB9IGZyb20gJy4vUGFyYWxsYXgnO1xuaW1wb3J0IHsgU3BsaXQgfSBmcm9tICcuLi9tYXRoL1NwbGl0JztcblxuZXhwb3J0IGNsYXNzIFNwcml0ZUJvYXJkXG57XG5cdGNvbnN0cnVjdG9yKHtlbGVtZW50LCB3b3JsZCwgbWFwfSlcblx0e1xuXHRcdHRoaXNbQmluZGFibGUuUHJldmVudF0gPSB0cnVlO1xuXG5cdFx0Y29uc29sZS5sb2coU3BsaXQuaW50VG9CeXRlcygweEZGXzAwKSk7XG5cblx0XHR0aGlzLm1hcCA9IG1hcDtcblx0XHR0aGlzLm1hcHMgPSBbXTtcblx0XHR0aGlzLndvcmxkID0gd29ybGQ7XG5cdFx0dGhpcy5zcHJpdGVzID0gbmV3IEJhZztcblxuXHRcdHRoaXMubW91c2UgPSB7XG5cdFx0XHR4OiBudWxsXG5cdFx0XHQsIHk6IG51bGxcblx0XHRcdCwgY2xpY2tYOiBudWxsXG5cdFx0XHQsIGNsaWNrWTogbnVsbFxuXHRcdH07XG5cblx0XHR0aGlzLndpZHRoID0gZWxlbWVudC53aWR0aDtcblx0XHR0aGlzLmhlaWdodCA9IGVsZW1lbnQuaGVpZ2h0O1xuXG5cdFx0Q2FtZXJhLndpZHRoICA9IGVsZW1lbnQud2lkdGg7XG5cdFx0Q2FtZXJhLmhlaWdodCA9IGVsZW1lbnQuaGVpZ2h0O1xuXG5cdFx0dGhpcy5nbDJkID0gbmV3IEdsMmQoZWxlbWVudCk7XG5cblx0XHR0aGlzLmdsMmQuZW5hYmxlQmxlbmRpbmcoKTtcblxuXHRcdGNvbnN0IGF0dHJpYnV0ZXMgPSBbJ2FfcG9zaXRpb24nLCAnYV90ZXhDb29yZCddO1xuXHRcdGNvbnN0IHVuaWZvcm1zID0gW1xuXHRcdFx0J3VfaW1hZ2UnXG5cdFx0XHQsICd1X2VmZmVjdCdcblx0XHRcdCwgJ3VfdGlsZXMnXG5cdFx0XHQsICd1X3RpbGVNYXBwaW5nJ1xuXG5cdFx0XHQsICd1X3NpemUnXG5cdFx0XHQsICd1X3NjYWxlJ1xuXHRcdFx0LCAndV9zY3JvbGwnXG5cdFx0XHQsICd1X3N0cmV0Y2gnXG5cdFx0XHQsICd1X3RpbGVTaXplJ1xuXHRcdFx0LCAndV9yZXNvbHV0aW9uJ1xuXHRcdFx0LCAndV9tYXBUZXh0dXJlU2l6ZSdcblxuXHRcdFx0LCAndV9yZWdpb24nXG5cdFx0XHQsICd1X3BhcmFsbGF4J1xuXHRcdFx0LCAndV90aW1lJ1xuXG5cdFx0XHQsICd1X3JlbmRlclRpbGVzJ1xuXHRcdFx0LCAndV9yZW5kZXJQYXJhbGxheCdcblx0XHRcdCwgJ3VfcmVuZGVyTW9kZSdcblx0XHRdO1xuXG5cdFx0dGhpcy5yZW5kZXJNb2RlID0gMDtcblxuXHRcdHRoaXMuZHJhd1Byb2dyYW0gPSB0aGlzLmdsMmQuY3JlYXRlUHJvZ3JhbSh7XG5cdFx0XHR2ZXJ0ZXhTaGFkZXI6IHRoaXMuZ2wyZC5jcmVhdGVTaGFkZXIoJ3Nwcml0ZS90ZXh0dXJlLnZlcnQnKVxuXHRcdFx0LCBmcmFnbWVudFNoYWRlcjogdGhpcy5nbDJkLmNyZWF0ZVNoYWRlcignc3ByaXRlL3RleHR1cmUuZnJhZycpXG5cdFx0XHQsIGF0dHJpYnV0ZXNcblx0XHRcdCwgdW5pZm9ybXNcblx0XHR9KTtcblxuXHRcdHRoaXMuZHJhd1Byb2dyYW0udXNlKCk7XG5cblx0XHR0aGlzLmNvbG9yTG9jYXRpb24gICA9IHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybXMudV9jb2xvcjtcblx0XHR0aGlzLnRpbGVQb3NMb2NhdGlvbiA9IHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybXMudV90aWxlTm87XG5cdFx0dGhpcy5yZWdpb25Mb2NhdGlvbiAgPSB0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1zLnVfcmVnaW9uO1xuXG5cdFx0dGhpcy5kcmF3TGF5ZXIgPSB0aGlzLmdsMmQuY3JlYXRlVGV4dHVyZSgxMDAwLCAxMDAwKTtcblx0XHR0aGlzLmVmZmVjdExheWVyID0gdGhpcy5nbDJkLmNyZWF0ZVRleHR1cmUoMTAwMCwgMTAwMCk7XG5cblx0XHR0aGlzLmRyYXdCdWZmZXIgPSB0aGlzLmdsMmQuY3JlYXRlRnJhbWVidWZmZXIodGhpcy5kcmF3TGF5ZXIpO1xuXHRcdHRoaXMuZWZmZWN0QnVmZmVyID0gdGhpcy5nbDJkLmNyZWF0ZUZyYW1lYnVmZmVyKHRoaXMuZWZmZWN0TGF5ZXIpO1xuXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcblx0XHRcdCdtb3VzZW1vdmUnLCAoZXZlbnQpPT57XG5cdFx0XHRcdHRoaXMubW91c2UueCA9IGV2ZW50LmNsaWVudFg7XG5cdFx0XHRcdHRoaXMubW91c2UueSA9IGV2ZW50LmNsaWVudFk7XG5cdFx0XHR9XG5cdFx0KTtcblxuXHRcdHRoaXMubWFwUmVuZGVyZXJzID0gbmV3IE1hcDtcblxuXHRcdHRoaXMucGFyYWxsYXggPSBuZXcgUGFyYWxsYXgoe3Nwcml0ZUJvYXJkOiB0aGlzLCBtYXB9KTtcblxuXHRcdGNvbnN0IHcgPSAxMjgwO1xuXG5cdFx0Zm9yKGNvbnN0IGkgaW4gQXJyYXkoMikuZmlsbCgpKVxuXHRcdHtcblx0XHRcdGNvbnN0IGJhcnJlbCA9IG5ldyBTcHJpdGUoe1xuXHRcdFx0XHRzcmM6ICcuL2JhcnJlbC5wbmcnLFxuXHRcdFx0XHRzcHJpdGVCb2FyZDogdGhpcyxcblx0XHRcdH0pO1xuXHRcdFx0YmFycmVsLnggPSAzMiArIChpICogNjQpICUgdyAtIDE2O1xuXHRcdFx0YmFycmVsLnkgPSBNYXRoLnRydW5jKChpICogMzIpIC8gdykgKiAzMiArIDMyO1xuXHRcdFx0dGhpcy5zcHJpdGVzLmFkZChiYXJyZWwpO1xuXHRcdH1cblxuXHRcdHRoaXMuZm9sbG93aW5nID0gbnVsbDtcblx0fVxuXG5cdGRyYXcoZGVsdGEpXG5cdHtcblx0XHRpZih0aGlzLmZvbGxvd2luZylcblx0XHR7XG5cdFx0XHRDYW1lcmEueCA9ICgxNiArIHRoaXMuZm9sbG93aW5nLnNwcml0ZS54KSAqIHRoaXMuZ2wyZC56b29tTGV2ZWwgfHwgMDtcblx0XHRcdENhbWVyYS55ID0gKDE2ICsgdGhpcy5mb2xsb3dpbmcuc3ByaXRlLnkpICogdGhpcy5nbDJkLnpvb21MZXZlbCB8fCAwO1xuXHRcdH1cblxuXHRcdGNvbnN0IHZpc2libGVNYXBzID0gdGhpcy53b3JsZC5nZXRNYXBzRm9yUmVjdChcblx0XHRcdHRoaXMuZm9sbG93aW5nLnNwcml0ZS54XG5cdFx0XHQsIHRoaXMuZm9sbG93aW5nLnNwcml0ZS55XG5cdFx0XHQsIDY0Ly9DYW1lcmEud2lkdGggKiAwLjEyNVxuXHRcdFx0LCA2NC8vQ2FtZXJhLmhlaWdodCAqIDAuMTI1XG5cdFx0KTtcblxuXHRcdGNvbnN0IG1hcFJlbmRlcmVycyA9IG5ldyBTZXQ7XG5cblx0XHR2aXNpYmxlTWFwcy5mb3JFYWNoKG1hcCA9PiB7XG5cdFx0XHRpZih0aGlzLm1hcFJlbmRlcmVycy5oYXMobWFwKSlcblx0XHRcdHtcblx0XHRcdFx0bWFwUmVuZGVyZXJzLmFkZCh0aGlzLm1hcFJlbmRlcmVycy5nZXQobWFwKSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGNvbnN0IHJlbmRlcmVyID0gbmV3IE1hcFJlbmRlcmVyKHtzcHJpdGVCb2FyZDogdGhpcywgbWFwfSk7XG5cdFx0XHRtYXBSZW5kZXJlcnMuYWRkKHJlbmRlcmVyKTtcblx0XHRcdHJlbmRlcmVyLnJlc2l6ZShDYW1lcmEud2lkdGgsIENhbWVyYS5oZWlnaHQpO1xuXHRcdFx0dGhpcy5tYXBSZW5kZXJlcnMuc2V0KG1hcCwgcmVuZGVyZXIpO1xuXHRcdH0pO1xuXG5cdFx0bmV3IFNldCh0aGlzLm1hcFJlbmRlcmVycy5rZXlzKCkpXG5cdFx0XHQuZGlmZmVyZW5jZSh2aXNpYmxlTWFwcylcblx0XHRcdC5mb3JFYWNoKG0gPT4gdGhpcy5tYXBSZW5kZXJlcnMuZGVsZXRlKG0pKTtcblxuXHRcdGNvbnN0IGdsID0gdGhpcy5nbDJkLmNvbnRleHQ7XG5cblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3NpemUnLCBDYW1lcmEud2lkdGgsIENhbWVyYS5oZWlnaHQpO1xuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfcmVzb2x1dGlvbicsIGdsLmNhbnZhcy53aWR0aCwgZ2wuY2FudmFzLmhlaWdodCk7XG5cdFx0dGhpcy5kcmF3UHJvZ3JhbS51bmlmb3JtSSgndV9yZW5kZXJNb2RlJywgdGhpcy5yZW5kZXJNb2RlKTtcblxuXHRcdHRoaXMuZHJhd1Byb2dyYW0udW5pZm9ybUYoJ3VfdGltZScsIHBlcmZvcm1hbmNlLm5vdygpKTtcblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3JlZ2lvbicsIDAsIDAsIDAsIDApO1xuXG5cdFx0Z2wudmlld3BvcnQoMCwgMCwgZ2wuY2FudmFzLndpZHRoLCBnbC5jYW52YXMuaGVpZ2h0KTtcblx0XHRnbC5jbGVhckNvbG9yKDAsIDAsIDAsIDEpO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmVmZmVjdEJ1ZmZlcik7XG5cdFx0Z2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuZHJhd0J1ZmZlcik7XG5cdFx0Z2wuY2xlYXJDb2xvcigwLCAwLCAwLCAwKTtcblx0XHRnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKTtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cblx0XHRpZih0aGlzLm1hcC5iYWNrZ3JvdW5kQ29sb3IpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY29sb3IgPSB0aGlzLm1hcC5iYWNrZ3JvdW5kQ29sb3Iuc3Vic3RyKDEpO1xuXG5cdFx0XHRjb25zdCByID0gcGFyc2VJbnQoY29sb3Iuc3Vic3RyKC02LCAyKSwgMTYpIC8gMjU1O1xuXHRcdFx0Y29uc3QgYiA9IHBhcnNlSW50KGNvbG9yLnN1YnN0cigtNCwgMiksIDE2KSAvIDI1NTtcblx0XHRcdGNvbnN0IGcgPSBwYXJzZUludChjb2xvci5zdWJzdHIoLTIsIDIpLCAxNikgLyAyNTU7XG5cdFx0XHRjb25zdCBhID0gY29sb3IubGVuZ3RoID09PSA4ID8gcGFyc2VJbnQoY29sb3Iuc3Vic3RyKC04LCAyKSwgMTYpIC8gMjU1IDogMTtcblxuXHRcdFx0Z2wuY2xlYXJDb2xvcihyLCBnLCBiLCBhKTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMSk7XG5cdFx0fVxuXG5cdFx0Z2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVCk7XG5cblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgJiYgY29uc29sZS50aW1lKCdkcmF3LXBhcmFsbGF4Jyk7XG5cdFx0dGhpcy5wYXJhbGxheCAmJiB0aGlzLnBhcmFsbGF4LmRyYXcoKTtcblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgJiYgY29uc29sZS50aW1lRW5kKCdkcmF3LXBhcmFsbGF4Jyk7XG5cblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1GKCd1X3NpemUnLCBDYW1lcmEud2lkdGgsIENhbWVyYS5oZWlnaHQpO1xuXG5cblx0XHR3aW5kb3cuc21Qcm9maWxpbmcgJiYgY29uc29sZS50aW1lKCdkcmF3LXRpbGVzJyk7XG5cdFx0dGhpcy5tYXBSZW5kZXJlcnMudmFsdWVzKCkuZm9yRWFjaChtciA9PiBtci5kcmF3KCkpO1xuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyAmJiBjb25zb2xlLnRpbWVFbmQoJ2RyYXctdGlsZXMnKTtcblxuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyAmJiBjb25zb2xlLnRpbWUoJ2RyYXctc3ByaXRlcycpO1xuXHRcdGxldCBzcHJpdGVzID0gdGhpcy5zcHJpdGVzLml0ZW1zKCk7XG5cdFx0Ly8gc3ByaXRlcy5mb3JFYWNoKHMgPT4gcy56ID0gcy55KTtcblx0XHRzcHJpdGVzLnNvcnQoKGEsYikgPT4ge1xuXHRcdFx0aWYoYS55ID09PSB1bmRlZmluZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYi55ID09PSB1bmRlZmluZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYS55IC0gYi55O1xuXHRcdH0pO1xuXHRcdHNwcml0ZXMuZm9yRWFjaChzID0+IHMuZHJhdyhkZWx0YSkpO1xuXHRcdHdpbmRvdy5zbVByb2ZpbGluZyAmJiBjb25zb2xlLnRpbWVFbmQoJ2RyYXctc3ByaXRlcycpO1xuXG5cdFx0aWYod2luZG93LnNtUHJvZmlsaW5nKVxuXHRcdHtcblx0XHRcdHdpbmRvdy5zbVByb2ZpbGluZyA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIFNldCB0aGUgcmVjdGFuZ2xlIGZvciBib3RoIGxheWVyc1xuXHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0MFxuXHRcdFx0LCB0aGlzLmdsMmQuZWxlbWVudC5oZWlnaHRcblx0XHRcdCwgdGhpcy5nbDJkLmVsZW1lbnQud2lkdGhcblx0XHRcdCwgLXRoaXMuZ2wyZC5lbGVtZW50LmhlaWdodFxuXHRcdCk7XG5cblx0XHQvLyBTd2l0Y2ggdG8gdGhlIG1haW4gZnJhbWVidWZmZXJcblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXG5cdFx0Ly8gUHV0IHRoZSBkcmF3TGF5ZXIgaW4gdGV4MFxuXHRcdGdsLmFjdGl2ZVRleHR1cmUoZ2wuVEVYVFVSRTApO1xuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuZHJhd0xheWVyKTtcblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X2ltYWdlJywgMCk7XG5cblx0XHQvLyBQdXQgdGhlIGVmZmVjdExheWVyIGluIHRleDFcblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0aGlzLmVmZmVjdExheWVyKTtcblx0XHR0aGlzLmRyYXdQcm9ncmFtLnVuaWZvcm1JKCd1X2VmZmVjdCcsIDEpO1xuXG5cdFx0Ly8gRHJhd1xuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblxuXHRcdC8vIENsZWFudXAuLi5cblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUxKTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0XHRnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkU0KTtcblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0fVxuXG5cdHJlc2l6ZSh3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdHdpZHRoICA9IHdpZHRoICB8fCB0aGlzLmdsMmQuZWxlbWVudC53aWR0aDtcblx0XHRoZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5nbDJkLmVsZW1lbnQuaGVpZ2h0O1xuXG5cdFx0dGhpcy53aWR0aCA9IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0Q2FtZXJhLnggKj0gdGhpcy5nbDJkLnpvb21MZXZlbDtcblx0XHRDYW1lcmEueSAqPSB0aGlzLmdsMmQuem9vbUxldmVsO1xuXG5cdFx0Q2FtZXJhLndpZHRoICA9IHdpZHRoICAvIHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cdFx0Q2FtZXJhLmhlaWdodCA9IGhlaWdodCAvIHRoaXMuZ2wyZC56b29tTGV2ZWw7XG5cblx0XHR0aGlzLm1hcFJlbmRlcmVycy52YWx1ZXMoKS5mb3JFYWNoKG1yID0+IG1yLnJlc2l6ZShDYW1lcmEud2lkdGgsIENhbWVyYS5oZWlnaHQpKVxuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5kcmF3TGF5ZXIpO1xuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCB0aGlzLndpZHRoXG5cdFx0XHQsIHRoaXMuaGVpZ2h0XG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIG51bGxcblx0XHQpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5lZmZlY3RMYXllcik7XG5cdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbnVsbFxuXHRcdCk7XG5cblx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCBudWxsKTtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLmRyYXdQcm9ncmFtLmJ1ZmZlcnMuYV9wb3NpdGlvbik7XG5cblx0XHRjb25zdCB4MSA9IHg7XG5cdFx0Y29uc3QgeDIgPSB4ICsgd2lkdGg7XG5cdFx0Y29uc3QgeTEgPSB5O1xuXHRcdGNvbnN0IHkyID0geSArIGhlaWdodDtcblxuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgyLCB5Mixcblx0XHRdKSwgZ2wuU1RSRUFNX0RSQVcpO1xuXHR9XG5cblx0Ly8gdW5zZWxlY3QoKVxuXHQvLyB7XG5cdC8vIFx0aWYodGhpcy5zZWxlY3RlZC5sb2NhbFggPT09IG51bGwpXG5cdC8vIFx0e1xuXHQvLyBcdFx0cmV0dXJuIGZhbHNlO1xuXHQvLyBcdH1cblxuXHQvLyBcdHRoaXMuc2VsZWN0ZWQubG9jYWxYICA9IG51bGw7XG5cdC8vIFx0dGhpcy5zZWxlY3RlZC5sb2NhbFkgID0gbnVsbDtcblx0Ly8gXHR0aGlzLnNlbGVjdGVkLmdsb2JhbFggPSBudWxsO1xuXHQvLyBcdHRoaXMuc2VsZWN0ZWQuZ2xvYmFsWSA9IG51bGw7XG5cblx0Ly8gXHRyZXR1cm4gdHJ1ZTtcblx0Ly8gfVxufVxuIiwiaW1wb3J0IHsgVGlsZXNldCB9IGZyb20gXCIuL1RpbGVzZXRcIjtcblxuZXhwb3J0IGNsYXNzIFNwcml0ZVNoZWV0IGV4dGVuZHMgVGlsZXNldFxue1xuXHRjb25zdHJ1Y3Rvcih0aWxlc2V0RGF0YSlcblx0e1xuXHRcdHN1cGVyKHRpbGVzZXREYXRhKTtcblxuXHRcdHRoaXMuZnJhbWVzID0gW107XG5cdFx0dGhpcy5hbmltYXRpb25zID0ge1xuXHRcdFx0ZGVmYXVsdDogW3t0aWxlaWQ6IDAsIGR1cmF0aW9uOiBJbmZpbml0eX1dXG5cdFx0fTtcblxuXHRcdHRoaXMuY2FudmFzICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiLCB7d2lsbFJlYWRGcmVxdWVudGx5OiB0cnVlfSk7XG5cblx0XHR0aGlzLnJlYWR5ID0gdGhpcy5yZWFkeS50aGVuKCgpID0+IHtcblx0XHRcdHRoaXMucHJvY2Vzc0ltYWdlKCk7XG5cblx0XHRcdGZvcihjb25zdCB0aWxlIG9mIHRoaXMudGlsZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKHRpbGUuYW5pbWF0aW9uKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hbmltYXRpb25zW3RpbGUudHlwZV0gPSB0aWxlLmFuaW1hdGlvbjtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmKHRpbGUudHlwZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYW5pbWF0aW9uc1t0aWxlLnR5cGVdID0gW3tkdXJhdGlvbjogSW5maW5pdHksIHRpbGVpZDogdGlsZS5pZH1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRwcm9jZXNzSW1hZ2UoKVxuXHR7XG5cdFx0dGhpcy5jYW52YXMud2lkdGggID0gdGhpcy5pbWFnZS53aWR0aDtcblx0XHR0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlLmhlaWdodDtcblxuXHRcdHRoaXMuY29udGV4dC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgMCwgMCk7XG5cblx0XHRmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy50aWxlQ291bnQ7IGkrKylcblx0XHR7XG5cdFx0XHR0aGlzLmZyYW1lc1tpXSA9IHRoaXMuZ2V0RnJhbWUoaSlcblx0XHR9XG5cdH1cblxuXHRnZXRGcmFtZShmcmFtZUlkKVxuXHR7XG5cdFx0ZnJhbWVJZCA9IGZyYW1lSWQgJSB0aGlzLnRpbGVDb3VudDtcblx0XHRjb25zdCBpID0gZnJhbWVJZCAlIHRoaXMuY29sdW1ucztcblx0XHRjb25zdCBqID0gTWF0aC5mbG9vcihmcmFtZUlkIC8gdGhpcy5jb2x1bW5zKTtcblxuXHRcdHJldHVybiB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKFxuXHRcdFx0aSAqIHRoaXMudGlsZVdpZHRoXG5cdFx0XHQsIGogKiB0aGlzLnRpbGVIZWlnaHRcblx0XHRcdCwgdGhpcy50aWxlV2lkdGhcblx0XHRcdCwgdGhpcy50aWxlSGVpZ2h0XG5cdFx0KS5kYXRhO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgVGV4dHVyZUJhbmtcbntcblx0XG59IiwiZXhwb3J0IGNsYXNzIFRpbGVzZXRcbntcblx0Y29uc3RydWN0b3Ioe1xuXHRcdHNvdXJjZSwgZmlyc3RnaWQsIGNvbHVtbnMsIGltYWdlLCBpbWFnZWhlaWdodCwgaW1hZ2V3aWR0aCwgbWFyZ2luXG5cdFx0LCBuYW1lLCBzcGFjaW5nLCB0aWxlY291bnQsIHRpbGVoZWlnaHQsIHRpbGV3aWR0aCwgdGlsZXNcblx0fSl7XG5cdFx0dGhpcy5maXJzdEdpZCA9IGZpcnN0Z2lkID8/IDA7XG5cdFx0dGhpcy50aWxlQ291bnQgID0gdGlsZWNvdW50ID8/IDA7XG5cdFx0dGhpcy50aWxlSGVpZ2h0ID0gdGlsZWhlaWdodCA/PyAwO1xuXHRcdHRoaXMudGlsZVdpZHRoICA9IHRpbGV3aWR0aCA/PyAwO1xuXG5cdFx0dGhpcy5yZWFkeSA9IHRoaXMuZ2V0UmVhZHkoe1xuXHRcdFx0c291cmNlLCBjb2x1bW5zLCBpbWFnZSwgaW1hZ2VoZWlnaHQsIGltYWdld2lkdGgsIG1hcmdpblxuXHRcdFx0LCBuYW1lLCBzcGFjaW5nLCB0aWxlY291bnQsIHRpbGVoZWlnaHQsIHRpbGV3aWR0aCwgdGlsZXNcblx0XHR9KTtcblx0fVxuXG5cdGFzeW5jIGdldFJlYWR5KHtcblx0XHRzb3VyY2UsIGNvbHVtbnMsIGltYWdlLCBpbWFnZWhlaWdodCwgaW1hZ2V3aWR0aCwgbWFyZ2luLCBuYW1lXG5cdFx0LCBzcGFjaW5nLCB0aWxlY291bnQsIHRpbGVoZWlnaHQsIHRpbGV3aWR0aCwgdGlsZXNcblx0fSl7XG5cdFx0aWYoc291cmNlKVxuXHRcdHtcblx0XHRcdCh7Y29sdW1ucywgaW1hZ2UsIGltYWdlaGVpZ2h0LCBpbWFnZXdpZHRoLCBtYXJnaW4sIG5hbWUsXG5cdFx0XHRcdHNwYWNpbmcsIHRpbGVjb3VudCwgdGlsZWhlaWdodCwgdGlsZXdpZHRoLCB0aWxlc1xuXHRcdFx0fSA9IGF3YWl0IChhd2FpdCBmZXRjaChzb3VyY2UpKS5qc29uKCkpO1xuXG5cdFx0XHRmb3IoY29uc3QgdGlsZSBvZiB0aWxlcylcblx0XHRcdHtcblx0XHRcdFx0dGlsZS5pZCArPSB0aGlzLmZpcnN0R2lkO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuY29sdW1ucyA9IGNvbHVtbnMgPz8gMTtcblx0XHR0aGlzLm1hcmdpbiAgPSBtYXJnaW4gPz8gMDtcblx0XHR0aGlzLm5hbWUgICAgPSBuYW1lID8/IGltYWdlO1xuXHRcdHRoaXMuc3BhY2luZyA9IHNwYWNpbmcgPz8gMDtcblx0XHR0aGlzLnRpbGVzICAgPSB0aWxlcyA/PyBbXTtcblxuXHRcdHRoaXMudGlsZUNvdW50ICA9IHRpbGVjb3VudCA/PyAxO1xuXG5cdFx0dGhpcy5pbWFnZSA9IG5ldyBJbWFnZTtcblx0XHR0aGlzLmltYWdlLnNyYyA9IGltYWdlO1xuXG5cdFx0YXdhaXQgbmV3IFByb21pc2UoYWNjZXB0ID0+IHRoaXMuaW1hZ2Uub25sb2FkID0gKCkgPT4gYWNjZXB0KCkpO1xuXG5cdFx0dGhpcy5pbWFnZVdpZHRoICA9IGltYWdld2lkdGggPz8gdGhpcy5pbWFnZS53aWR0aDtcblx0XHR0aGlzLmltYWdlSGVpZ2h0ID0gaW1hZ2VoZWlnaHQgPz8gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHR0aGlzLnRpbGVXaWR0aCAgPSB0aWxld2lkdGggPz8gdGhpcy5pbWFnZVdpZHRoO1xuXHRcdHRoaXMudGlsZUhlaWdodCA9IHRpbGVoZWlnaHQgPz8gdGhpcy5pbWFnZUhlaWdodDtcblxuXHRcdHRoaXMucm93cyA9IE1hdGguY2VpbChpbWFnZWhlaWdodCAvIHRpbGVoZWlnaHQpIHx8IDE7XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCIvLyB0ZXh0dXJlLmZyYWdcXG4jZGVmaW5lIE1fUEkgMy4xNDE1OTI2NTM1ODk3OTMyMzg0NjI2NDMzODMyNzk1XFxuI2RlZmluZSBNX1RBVSBNX1BJIC8gMi4wXFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxudmFyeWluZyB2ZWMyIHZfcG9zaXRpb247XFxuXFxudW5pZm9ybSBzYW1wbGVyMkQgdV9pbWFnZTtcXG51bmlmb3JtIHNhbXBsZXIyRCB1X2VmZmVjdDtcXG51bmlmb3JtIHNhbXBsZXIyRCB1X3RpbGVzO1xcbnVuaWZvcm0gc2FtcGxlcjJEIHVfdGlsZU1hcHBpbmc7XFxuXFxudW5pZm9ybSB2ZWMyIHVfc2l6ZTtcXG51bmlmb3JtIHZlYzIgdV90aWxlU2l6ZTtcXG51bmlmb3JtIHZlYzIgdV9yZXNvbHV0aW9uO1xcbnVuaWZvcm0gdmVjMiB1X21hcFRleHR1cmVTaXplO1xcblxcbnVuaWZvcm0gdmVjNCB1X2NvbG9yO1xcbnVuaWZvcm0gdmVjNCB1X3JlZ2lvbjtcXG51bmlmb3JtIHZlYzIgdV9wYXJhbGxheDtcXG51bmlmb3JtIHZlYzIgdV9zY3JvbGw7XFxudW5pZm9ybSB2ZWMyIHVfc3RyZXRjaDtcXG5cXG51bmlmb3JtIGZsb2F0IHVfdGltZTtcXG51bmlmb3JtIGZsb2F0IHVfc2NhbGU7XFxuXFxudW5pZm9ybSBpbnQgdV9yZW5kZXJUaWxlcztcXG51bmlmb3JtIGludCB1X3JlbmRlclBhcmFsbGF4O1xcbnVuaWZvcm0gaW50IHVfcmVuZGVyTW9kZTtcXG5cXG5mbG9hdCBtYXNrZWQgPSAwLjA7XFxuZmxvYXQgc29ydGVkID0gMS4wO1xcbmZsb2F0IGRpc3BsYWNlID0gMS4wO1xcbmZsb2F0IGJsdXIgPSAxLjA7XFxuXFxudmVjMiByaXBwbGVYKHZlYzIgdGV4Q29vcmQsIGZsb2F0IGEsIGZsb2F0IGIsIGZsb2F0IGMpIHtcXG4gIHZlYzIgcmlwcGxlZCA9IHZlYzIoXFxuICAgIHZfdGV4Q29vcmQueCArIHNpbih2X3RleENvb3JkLnkgKiAoYSAqIHVfc2l6ZS55KSArIGIpICogYyAvIHVfc2l6ZS54LFxcbiAgICB2X3RleENvb3JkLnlcXG4gICk7XFxuXFxuICBpZiAocmlwcGxlZC54IDwgMC4wKSB7XFxuICAgIHJpcHBsZWQueCA9IGFicyhyaXBwbGVkLngpO1xcbiAgfVxcbiAgZWxzZSBpZiAocmlwcGxlZC54ID4gdV9zaXplLngpIHtcXG4gICAgcmlwcGxlZC54ID0gdV9zaXplLnggLSAocmlwcGxlZC54IC0gdV9zaXplLngpO1xcbiAgfVxcblxcbiAgcmV0dXJuIHJpcHBsZWQ7XFxufVxcblxcbnZlYzIgcmlwcGxlWSh2ZWMyIHRleENvb3JkLCBmbG9hdCBhLCBmbG9hdCBiLCBmbG9hdCBjKSB7XFxuICB2ZWMyIHJpcHBsZWQgPSB2ZWMyKHZfdGV4Q29vcmQueCwgdl90ZXhDb29yZC55ICsgc2luKHZfdGV4Q29vcmQueCAqIChhICogdV9zaXplLngpICsgYikgKiBjIC8gdV9zaXplLnkpO1xcblxcbiAgaWYgKHJpcHBsZWQueSA8IDAuMCkge1xcbiAgICByaXBwbGVkLnggPSBhYnMocmlwcGxlZC54KTtcXG4gIH1cXG4gIGVsc2UgaWYgKHJpcHBsZWQueSA+IHVfc2l6ZS55KSB7XFxuICAgIHJpcHBsZWQueSA9IHVfc2l6ZS55IC0gKHJpcHBsZWQueSAtIHVfc2l6ZS55KTtcXG4gIH1cXG5cXG4gIHJldHVybiByaXBwbGVkO1xcbn1cXG5cXG52ZWM0IG1vdGlvbkJsdXIoc2FtcGxlcjJEIGltYWdlLCBmbG9hdCBhbmdsZSwgZmxvYXQgbWFnbml0dWRlLCB2ZWMyIHRleHRDb29yZCkge1xcbiAgdmVjNCBvcmlnaW5hbENvbG9yID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQpO1xcbiAgdmVjNCBkaXNwQ29sb3IgPSBvcmlnaW5hbENvbG9yO1xcblxcbiAgY29uc3QgZmxvYXQgbWF4ID0gMTAuMDtcXG4gIGZsb2F0IHdlaWdodCA9IDAuODU7XFxuXFxuICBmb3IgKGZsb2F0IGkgPSAwLjA7IGkgPCBtYXg7IGkgKz0gMS4wKSB7XFxuICAgIGlmKGkgPiBhYnMobWFnbml0dWRlKSB8fCBvcmlnaW5hbENvbG9yLmEgPCAxLjApIHtcXG4gICAgICBicmVhaztcXG4gICAgfVxcbiAgICB2ZWM0IGRpc3BDb2xvckRvd24gPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCArIHZlYzIoXFxuICAgICAgY29zKGFuZ2xlKSAqIGkgKiBzaWduKG1hZ25pdHVkZSkgLyB1X3NpemUueCxcXG4gICAgICBzaW4oYW5nbGUpICogaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS55XFxuICAgICkpO1xcbiAgICBkaXNwQ29sb3IgPSBkaXNwQ29sb3IgKiAoMS4wIC0gd2VpZ2h0KSArIGRpc3BDb2xvckRvd24gKiB3ZWlnaHQ7XFxuICAgIHdlaWdodCAqPSAwLjg7XFxuICB9XFxuXFxuICByZXR1cm4gZGlzcENvbG9yO1xcbn1cXG5cXG52ZWM0IGxpbmVhckJsdXIoc2FtcGxlcjJEIGltYWdlLCBmbG9hdCBhbmdsZSwgZmxvYXQgbWFnbml0dWRlLCB2ZWMyIHRleHRDb29yZCkge1xcbiAgdmVjNCBvcmlnaW5hbENvbG9yID0gdGV4dHVyZTJEKGltYWdlLCB0ZXh0Q29vcmQpO1xcbiAgdmVjNCBkaXNwQ29sb3IgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCk7XFxuXFxuICBjb25zdCBmbG9hdCBtYXggPSAxMC4wO1xcbiAgZmxvYXQgd2VpZ2h0ID0gMC42NTtcXG5cXG4gIGZvciAoZmxvYXQgaSA9IDAuMDsgaSA8IG1heDsgaSArPSAwLjI1KSB7XFxuICAgIGlmKGkgPiBhYnMobWFnbml0dWRlKSkge1xcbiAgICAgIGJyZWFrO1xcbiAgICB9XFxuICAgIHZlYzQgZGlzcENvbG9yVXAgPSB0ZXh0dXJlMkQoaW1hZ2UsIHRleHRDb29yZCArIHZlYzIoXFxuICAgICAgY29zKGFuZ2xlKSAqIC1pICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLngsXFxuICAgICAgc2luKGFuZ2xlKSAqIC1pICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLnlcXG4gICAgKSk7XFxuICAgIHZlYzQgZGlzcENvbG9yRG93biA9IHRleHR1cmUyRChpbWFnZSwgdGV4dENvb3JkICsgdmVjMihcXG4gICAgICBjb3MoYW5nbGUpICogaSAqIHNpZ24obWFnbml0dWRlKSAvIHVfc2l6ZS54LFxcbiAgICAgIHNpbihhbmdsZSkgKiBpICogc2lnbihtYWduaXR1ZGUpIC8gdV9zaXplLnlcXG4gICAgKSk7XFxuICAgIGRpc3BDb2xvciA9IGRpc3BDb2xvciAqICgxLjAgLSB3ZWlnaHQpICsgZGlzcENvbG9yRG93biAqIHdlaWdodCAqIDAuNSArIGRpc3BDb2xvclVwICogd2VpZ2h0ICogMC41O1xcbiAgICB3ZWlnaHQgKj0gMC43MDtcXG4gIH1cXG5cXG4gIHJldHVybiBkaXNwQ29sb3I7XFxufVxcblxcbnZvaWQgbWFpbigpIHtcXG4gIHZlYzQgb3JpZ2luYWxDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB2X3RleENvb3JkKTtcXG4gIHZlYzQgZWZmZWN0Q29sb3IgPSB0ZXh0dXJlMkQodV9lZmZlY3QsICB2X3RleENvb3JkKTtcXG5cXG4gIC8vIFRoaXMgb25seSBhcHBsaWVzIHdoZW4gZHJhd2luZyB0aGUgcGFyYWxsYXggYmFja2dyb3VuZFxcbiAgaWYgKHVfcmVuZGVyUGFyYWxsYXggPT0gMSkge1xcblxcbiAgICBmbG9hdCB0ZXhlbFNpemUgPSAxLjAgLyB1X3NpemUueDtcXG5cXG4gICAgdmVjMiBwYXJhbGxheENvb3JkID0gdl90ZXhDb29yZCAqIHZlYzIoMS4wLCAtMS4wKSArIHZlYzIoMC4wLCAxLjApXFxuICAgICAgKyB2ZWMyKHVfc2Nyb2xsLnggKiB0ZXhlbFNpemUgKiB1X3BhcmFsbGF4LngsIDAuMCk7XFxuICAgICAgLy8gKyB2ZWMyKHVfdGltZSAvIDEwMDAwLjAsIDAuMCk7XFxuICAgICAgLy8gKyB2ZWMyKCwgMC4wKTtcXG4gICAgICA7XFxuXFxuICAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCAgcGFyYWxsYXhDb29yZCk7XFxuXFxuICAgIHJldHVybjtcXG4gIH1cXG5cXG4gIC8vIFRoaXMgb25seSBhcHBsaWVzIHdoZW4gZHJhd2luZyB0aWxlcy5cXG4gIGlmICh1X3JlbmRlclRpbGVzID09IDEpIHtcXG4gICAgZmxvYXQgeFRpbGVzID0gZmxvb3IodV9zaXplLnggLyB1X3RpbGVTaXplLngpO1xcbiAgICBmbG9hdCB5VGlsZXMgPSBmbG9vcih1X3NpemUueSAvIHVfdGlsZVNpemUueSk7XFxuXFxuICAgIGZsb2F0IHhUID0gKHZfdGV4Q29vcmQueCAqIHVfc2l6ZS54KSAvIHVfdGlsZVNpemUueDtcXG4gICAgZmxvYXQgeVQgPSAodl90ZXhDb29yZC55ICogdV9zaXplLnkpIC8gdV90aWxlU2l6ZS55O1xcblxcbiAgICBmbG9hdCBpbnZfeFRpbGVzID0gMS4wIC8geFRpbGVzO1xcbiAgICBmbG9hdCBpbnZfeVRpbGVzID0gMS4wIC8geVRpbGVzO1xcblxcbiAgICBmbG9hdCB4VGlsZSA9IGZsb29yKHhUKSAqIGludl94VGlsZXM7XFxuICAgIGZsb2F0IHlUaWxlID0gZmxvb3IoeVQpICogaW52X3lUaWxlcztcXG5cXG4gICAgZmxvYXQgeE9mZiA9ICh4VCAqIGludl94VGlsZXMgLSB4VGlsZSkgKiB4VGlsZXM7XFxuICAgIGZsb2F0IHlPZmYgPSAoeVQgKiBpbnZfeVRpbGVzIC0geVRpbGUpICogeVRpbGVzICogLTEuMCArIDEuMDtcXG5cXG4gICAgZmxvYXQgeFdyYXAgPSB1X21hcFRleHR1cmVTaXplLnggLyB1X3RpbGVTaXplLng7XFxuICAgIGZsb2F0IHlXcmFwID0gdV9tYXBUZXh0dXJlU2l6ZS55IC8gdV90aWxlU2l6ZS55O1xcblxcbiAgICAvLyBNb2RlIDEgZHJhd3MgdGlsZXMnIHgveSB2YWx1ZXMgYXMgcmVkICYgZ3JlZW5cXG4gICAgaWYgKHVfcmVuZGVyTW9kZSA9PSAxKSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCh4VGlsZSwgeVRpbGUsIDAsIDEuMCk7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIC8vIE1vZGUgMiBpcyB0aGUgc2FtZSBhcyBtb2RlIDEgYnV0IGFkZHMgY29tYmluZXNcXG4gICAgLy8gaW50ZXJuYWwgdGlsZSB4L3kgdG8gdGhlIGJsdWUgY2hhbm5lbFxcbiAgICBpZiAodV9yZW5kZXJNb2RlID09IDIpIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KHhUaWxlLCB5VGlsZSwgKHhPZmYgKyB5T2ZmKSAqIDAuNSwgMS4wKTtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG5cXG4gICAgdmVjNCB0aWxlID0gdGV4dHVyZTJEKHVfdGlsZU1hcHBpbmcsIHZfdGV4Q29vcmQgKiB2ZWMyKDEuMCwgLTEuMCkgKyB2ZWMyKDAuMCwgMS4wKSk7XFxuXFxuICAgIGZsb2F0IGxvID0gdGlsZS5yICogMjU2LjA7XFxuICAgIGZsb2F0IGhpID0gdGlsZS5nICogMjU2LjAgKiAyNTYuMDtcXG5cXG4gICAgZmxvYXQgdGlsZU51bWJlciA9IGxvICsgaGk7XFxuXFxuICAgIGlmICh0aWxlTnVtYmVyID09IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvci5hID0gMC4wO1xcbiAgICAgIHJldHVybjtcXG4gICAgfVxcblxcbiAgICAvLyBNb2RlIDMgdXNlcyB0aGUgdGlsZSBudW1iZXIgZm9yIHRoZSByZWQvZ3JlZW4gY2hhbm5lbHNcXG4gICAgaWYgKHVfcmVuZGVyTW9kZSA9PSAzKSB7XFxuICAgICAgZ2xfRnJhZ0NvbG9yID0gdGlsZTtcXG4gICAgICBnbF9GcmFnQ29sb3IuYiA9IDAuNTtcXG4gICAgICBnbF9GcmFnQ29sb3IuYSA9IDEuMDtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG5cXG4gICAgLy8gTW9kZSA0IG5vcm1hbGl6ZXMgdGhlIHRpbGUgbnVtYmVyIHRvIGFsbCBjaGFubmVsc1xcbiAgICBpZiAodV9yZW5kZXJNb2RlID09IDQpIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KFxcbiAgICAgICAgbW9kKHRpbGVOdW1iZXIsIDI1Ni4wKSAvIDI1Ni4wXFxuICAgICAgICAsIG1vZCh0aWxlTnVtYmVyLCAyNTYuMCkgLyAyNTYuMFxcbiAgICAgICAgLCBtb2QodGlsZU51bWJlciwgMjU2LjApIC8gMjU2LjBcXG4gICAgICAgICwgMS4wXFxuICAgICAgKTtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG5cXG4gICAgZmxvYXQgdGlsZVNldFggPSBmbG9vcihtb2QoKC0xLjAgKyB0aWxlTnVtYmVyKSwgeFdyYXApKTtcXG4gICAgZmxvYXQgdGlsZVNldFkgPSBmbG9vcigoLTEuMCArIHRpbGVOdW1iZXIpIC8geFdyYXApO1xcblxcbiAgICB2ZWM0IHRpbGVDb2xvciA9IHRleHR1cmUyRCh1X3RpbGVzLCB2ZWMyKFxcbiAgICAgIHhPZmYgLyB4V3JhcCArIHRpbGVTZXRYICogKHVfdGlsZVNpemUueSAvIHVfbWFwVGV4dHVyZVNpemUueSlcXG4gICAgICAsIHlPZmYgLyB5V3JhcCArIHRpbGVTZXRZICogKHVfdGlsZVNpemUueSAvIHVfbWFwVGV4dHVyZVNpemUueSlcXG4gICAgKSk7XFxuXFxuICAgIGdsX0ZyYWdDb2xvciA9IHRpbGVDb2xvcjtcXG5cXG4gICAgcmV0dXJuO1xcbiAgfVxcblxcbiAgLy8gVGhpcyBpZi9lbHNlIGJsb2NrIG9ubHkgYXBwbGllc1xcbiAgLy8gd2hlbiB3ZSdyZSBkcmF3aW5nIHRoZSBlZmZlY3RCdWZmZXJcXG4gIGlmICh1X3JlZ2lvbi5yID4gMC4wIHx8IHVfcmVnaW9uLmcgPiAwLjAgfHwgdV9yZWdpb24uYiA+IDAuMCkge1xcbiAgICBpZiAobWFza2VkIDwgMS4wIHx8IG9yaWdpbmFsQ29sb3IuYSA+IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHVfcmVnaW9uO1xcbiAgICB9XFxuICAgIHJldHVybjtcXG4gIH1cXG4gIGVsc2UgaWYgKHVfcmVnaW9uLmEgPiAwLjApIHtcXG4gICAgaWYgKHNvcnRlZCA+IDAuMCkge1xcbiAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMCwgMCwgMCwgb3JpZ2luYWxDb2xvci5hID4gMC4wID8gMS4wIDogMC4wKTtcXG4gICAgfVxcbiAgICBlbHNlIHtcXG4gICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAsIDAsIDAsIDAuMCk7XFxuICAgIH1cXG4gICAgcmV0dXJuO1xcbiAgfTtcXG5cXG4gIC8vIE1vZGUgNSBkcmF3cyB0aGUgZWZmZWN0IGJ1ZmZlciB0byB0aGUgc2NyZWVuXFxuICBpZiAodV9yZW5kZXJNb2RlID09IDUpIHtcXG4gICAgZ2xfRnJhZ0NvbG9yID0gZWZmZWN0Q29sb3I7XFxuICAgIHJldHVybjtcXG4gIH1cXG5cXG4gIHZlYzMgcmlwcGxlID0gdmVjMyhNX1BJLzguMCwgdV90aW1lIC8gMjAwLjAsIDEuMCk7XFxuXFxuICAvLyBUaGlzIGlmL2Vsc2UgYmxvY2sgb25seSBhcHBsaWVzXFxuICAvLyB3aGVuIHdlJ3JlIGRyYXdpbmcgdGhlIGRyYXdCdWZmZXJcXG4gIGlmIChlZmZlY3RDb2xvciA9PSB2ZWM0KDAsIDEsIDEsIDEpKSB7IC8vIFdhdGVyIHJlZ2lvblxcbiAgICB2ZWMyIHRleENvb3JkID0gdl90ZXhDb29yZDtcXG4gICAgdmVjNCB2X2JsdXJyZWRDb2xvciA9IG9yaWdpbmFsQ29sb3I7XFxuICAgIGlmIChkaXNwbGFjZSA+IDAuMCkge1xcbiAgICAgIHRleENvb3JkID0gcmlwcGxlWCh2X3RleENvb3JkLCByaXBwbGUueCwgcmlwcGxlLnksIHJpcHBsZS56KTtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB0ZXhDb29yZCk7XFxuICAgIH1cXG4gICAgaWYgKGJsdXIgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IGxpbmVhckJsdXIodV9pbWFnZSwgMC4wLCAxLjAsIHRleENvb3JkKTtcXG4gICAgfVxcbiAgICBnbF9GcmFnQ29sb3IgPSB2X2JsdXJyZWRDb2xvciAqIDAuNjUgKyBlZmZlY3RDb2xvciAqIDAuMzU7XFxuICB9XFxuICBlbHNlIGlmIChlZmZlY3RDb2xvciA9PSB2ZWM0KDEsIDAsIDAsIDEpKSB7IC8vIEZpcmUgcmVnaW9uXFxuICAgIHZlYzIgdl9kaXNwbGFjZW1lbnQgPSByaXBwbGVZKHZfdGV4Q29vcmQsIHJpcHBsZS54ICogMy4wLCByaXBwbGUueSAqIDEuNSwgcmlwcGxlLnogKiAwLjMzMyk7XFxuICAgIHZlYzQgdl9ibHVycmVkQ29sb3IgPSBvcmlnaW5hbENvbG9yO1xcbiAgICBpZiAoZGlzcGxhY2UgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB2X2Rpc3BsYWNlbWVudCk7XFxuICAgIH1cXG4gICAgaWYgKGJsdXIgPiAwLjApIHtcXG4gICAgICB2X2JsdXJyZWRDb2xvciA9IG1vdGlvbkJsdXIodV9pbWFnZSwgLU1fVEFVLCAxLjAsIHZfZGlzcGxhY2VtZW50KTtcXG4gICAgfVxcbiAgICBnbF9GcmFnQ29sb3IgPSB2X2JsdXJyZWRDb2xvciAqIDAuNzUgKyBlZmZlY3RDb2xvciAqIDAuMjU7XFxuICB9XFxuICBlbHNlIHsgLy8gTnVsbCByZWdpb25cXG4gICAgZ2xfRnJhZ0NvbG9yID0gb3JpZ2luYWxDb2xvcjtcXG4gIH1cXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiLy8gdGV4dHVyZS52ZXJ0XFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxuYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gdmVjMiB1X3Jlc29sdXRpb247XFxuXFxudmFyeWluZyB2ZWMyIHZfdGV4Q29vcmQ7XFxudmFyeWluZyB2ZWMyIHZfcG9zaXRpb247XFxuXFxudm9pZCBtYWluKClcXG57XFxuICB2ZWMyIHplcm9Ub09uZSA9IGFfcG9zaXRpb24gLyB1X3Jlc29sdXRpb247XFxuICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDtcXG4gIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgZ2xfUG9zaXRpb24gPSB2ZWM0KGNsaXBTcGFjZSAqIHZlYzIoMSwgLTEpLCAwLCAxKTtcXG4gIHZfdGV4Q29vcmQgID0gYV90ZXhDb29yZDtcXG4gIHZfcG9zaXRpb24gID0gYV9wb3NpdGlvbjtcXG59XFxuXCIiLCJpbXBvcnQgeyBWaWV3IH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvVmlldyc7XG5cbmV4cG9ydCBjbGFzcyBDb250cm9sbGVyIGV4dGVuZHMgVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXIudG1wJyk7XG5cdFx0dGhpcy5kcmFnU3RhcnQgPSBmYWxzZTtcblxuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyAgPSBmYWxzZTtcblx0XHR0aGlzLmFyZ3MueCA9IDA7XG5cdFx0dGhpcy5hcmdzLnkgPSAwO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5tb3ZlU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMuZHJvcFN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCAoZXZlbnQpID0+IHtcblx0XHRcdHRoaXMubW92ZVN0aWNrKGV2ZW50KTtcblx0XHR9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5kcm9wU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZHJhZ1N0aWNrKGV2ZW50KVxuXHR7XG5cdFx0bGV0IHBvcyA9IGV2ZW50O1xuXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuXHRcdGlmKGV2ZW50LnRvdWNoZXMgJiYgZXZlbnQudG91Y2hlc1swXSlcblx0XHR7XG5cdFx0XHRwb3MgPSBldmVudC50b3VjaGVzWzBdO1xuXHRcdH1cblxuXHRcdHRoaXMuYXJncy5kcmFnZ2luZyA9IHRydWU7XG5cdFx0dGhpcy5kcmFnU3RhcnQgICAgID0ge1xuXHRcdFx0eDogICBwb3MuY2xpZW50WFxuXHRcdFx0LCB5OiBwb3MuY2xpZW50WVxuXHRcdH07XG5cdH1cblxuXHRtb3ZlU3RpY2soZXZlbnQpXG5cdHtcblx0XHRpZih0aGlzLmFyZ3MuZHJhZ2dpbmcpXG5cdFx0e1xuXHRcdFx0bGV0IHBvcyA9IGV2ZW50O1xuXG5cdFx0XHRpZihldmVudC50b3VjaGVzICYmIGV2ZW50LnRvdWNoZXNbMF0pXG5cdFx0XHR7XG5cdFx0XHRcdHBvcyA9IGV2ZW50LnRvdWNoZXNbMF07XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy54eCA9IHBvcy5jbGllbnRYIC0gdGhpcy5kcmFnU3RhcnQueDtcblx0XHRcdHRoaXMuYXJncy55eSA9IHBvcy5jbGllbnRZIC0gdGhpcy5kcmFnU3RhcnQueTtcblxuXHRcdFx0Y29uc3QgbGltaXQgPSA1MDtcblxuXHRcdFx0aWYodGhpcy5hcmdzLnh4IDwgLWxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueCA9IC1saW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYodGhpcy5hcmdzLnh4ID4gbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gdGhpcy5hcmdzLnh4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLmFyZ3MueXkgPCAtbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy55ID0gLWxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZih0aGlzLmFyZ3MueXkgPiBsaW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSBsaW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSB0aGlzLmFyZ3MueXk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJvcFN0aWNrKGV2ZW50KVxuXHR7XG5cdFx0dGhpcy5hcmdzLmRyYWdnaW5nID0gZmFsc2U7XG5cdFx0dGhpcy5hcmdzLnggPSAwO1xuXHRcdHRoaXMuYXJncy55ID0gMDtcblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3MgPSBcXFwiY29udHJvbGxlclxcXCI+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJqb3lzdGlja1xcXCIgY3Ytb24gPSBcXFwiXFxuXFx0XFx0dG91Y2hzdGFydDpkcmFnU3RpY2soZXZlbnQpO1xcblxcdFxcdG1vdXNlZG93bjpkcmFnU3RpY2soZXZlbnQpO1xcblxcdFxcXCI+XFxuXFx0XFx0PGRpdiBjbGFzcyA9IFxcXCJwYWRcXFwiIHN0eWxlID0gXFxcInBvc2l0aW9uOiByZWxhdGl2ZTsgdHJhbnNmb3JtOnRyYW5zbGF0ZShbW3hdXXB4LFtbeV1dcHgpO1xcXCI+PC9kaXY+XFxuXFx0PC9kaXY+XFxuXFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJidXR0b25cXFwiPkE8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImJ1dHRvblxcXCI+QjwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwiYnV0dG9uXFxcIj5DPC9kaXY+XFxuPC9kaXY+XCIiLCJpbXBvcnQgeyBTcHJpdGUgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlJztcblxuZXhwb3J0IGNsYXNzIEZsb29yXG57XG5cdGNvbnN0cnVjdG9yKGdsMmQsIGFyZ3MpXG5cdHtcblx0XHR0aGlzLmdsMmQgICA9IGdsMmQ7XG5cdFx0dGhpcy5zcHJpdGVzID0gW107XG5cblx0XHQvLyB0aGlzLnJlc2l6ZSg2MCwgMzQpO1xuXHRcdHRoaXMucmVzaXplKDksIDkpO1xuXHRcdC8vIHRoaXMucmVzaXplKDYwKjIsIDM0KjIpO1xuXHR9XG5cblx0cmVzaXplKHdpZHRoLCBoZWlnaHQpXG5cdHtcblx0XHR0aGlzLndpZHRoICA9IHdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0Zm9yKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspXG5cdFx0e1xuXHRcdFx0Zm9yKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBzcHJpdGUgPSBuZXcgU3ByaXRlKHRoaXMuZ2wyZCwgJy9mbG9vclRpbGUucG5nJyk7XG5cblx0XHRcdFx0c3ByaXRlLnggPSAzMiAqIHg7XG5cdFx0XHRcdHNwcml0ZS55ID0gMzIgKiB5O1xuXG5cdFx0XHRcdHRoaXMuc3ByaXRlcy5wdXNoKHNwcml0ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHR0aGlzLnNwcml0ZXMubWFwKHMgPT4gcy5kcmF3KCkpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBCaW5kYWJsZSB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IFRpbGVzZXQgfSBmcm9tICcuLi9zcHJpdGUvVGlsZXNldCc7XG5cbmV4cG9ydCBjbGFzcyBUaWxlTWFwXG57XG5cdGNvbnN0cnVjdG9yKHtzcmN9KVxuXHR7XG5cdFx0dGhpc1tCaW5kYWJsZS5QcmV2ZW50XSA9IHRydWU7XG5cdFx0dGhpcy5pbWFnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdHRoaXMuc3JjID0gc3JjO1xuXHRcdHRoaXMucGl4ZWxzID0gW107XG5cdFx0dGhpcy50aWxlQ291bnQgPSAwO1xuXG5cdFx0dGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSBudWxsO1xuXG5cdFx0dGhpcy5wcm9wZXJ0aWVzID0ge307XG5cblx0XHR0aGlzLmNhbnZhc2VzID0gbmV3IE1hcDtcblx0XHR0aGlzLmNvbnRleHRzID0gbmV3IE1hcDtcblxuXHRcdHRoaXMudGlsZUxheWVycyAgID0gW107XG5cdFx0dGhpcy5pbWFnZUxheWVycyAgPSBbXTtcblx0XHR0aGlzLm9iamVjdExheWVycyA9IFtdO1xuXG5cdFx0dGhpcy54V29ybGQgPSAwO1xuXHRcdHRoaXMueVdvcmxkID0gMDtcblxuXHRcdHRoaXMud2lkdGggID0gMDtcblx0XHR0aGlzLmhlaWdodCA9IDA7XG5cblx0XHR0aGlzLnRpbGVXaWR0aCAgPSAwO1xuXHRcdHRoaXMudGlsZUhlaWdodCA9IDA7XG5cblx0XHR0aGlzLnRpbGVTZXRXaWR0aCAgPSAwO1xuXHRcdHRoaXMudGlsZVNldEhlaWdodCA9IDA7XG5cblx0XHR0aGlzLnJlYWR5ID0gdGhpcy5nZXRSZWFkeShzcmMpO1xuXG5cdFx0dGhpcy5hbmltYXRpb25zID0gbmV3IE1hcDtcblx0fVxuXG5cdGFzeW5jIGdldFJlYWR5KHNyYylcblx0e1xuXHRcdGNvbnN0IG1hcERhdGEgPSBhd2FpdCAoYXdhaXQgZmV0Y2goc3JjKSkuanNvbigpO1xuXG5cdFx0dGhpcy50aWxlTGF5ZXJzICAgPSBtYXBEYXRhLmxheWVycy5maWx0ZXIobGF5ZXIgPT4gbGF5ZXIudHlwZSA9PT0gJ3RpbGVsYXllcicpO1xuXHRcdHRoaXMuaW1hZ2VMYXllcnMgID0gbWFwRGF0YS5sYXllcnMuZmlsdGVyKGxheWVyID0+IGxheWVyLnR5cGUgPT09ICdpbWFnZWxheWVyJyk7XG5cdFx0dGhpcy5vYmplY3RMYXllcnMgPSBtYXBEYXRhLmxheWVycy5maWx0ZXIobGF5ZXIgPT4gbGF5ZXIudHlwZSA9PT0gJ29iamVjdGxheWVyJyk7XG5cblx0XHR0aGlzLmJhY2tncm91bmRDb2xvciA9IG1hcERhdGEuYmFja2dyb3VuZGNvbG9yO1xuXG5cdFx0aWYobWFwRGF0YS5wcm9wZXJ0aWVzKVxuXHRcdGZvcihjb25zdCBwcm9wZXJ0eSBvZiBtYXBEYXRhLnByb3BlcnRpZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5wcm9wZXJ0aWVzWyBwcm9wZXJ0eS5uYW1lIF0gPSBwcm9wZXJ0eS52YWx1ZTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnByb3BlcnRpZXMuYmFja2dyb3VuZENvbG9yKVxuXHRcdHtcblx0XHRcdHRoaXMuYmFja2dyb3VuZENvbG9yID0gdGhpcy5wcm9wZXJ0aWVzLmJhY2tncm91bmRDb2xvcjtcblx0XHR9XG5cblx0XHRjb25zdCB0aWxlc2V0cyA9IG1hcERhdGEudGlsZXNldHMubWFwKHQgPT4gbmV3IFRpbGVzZXQodCkpO1xuXG5cdFx0dGhpcy53aWR0aCAgPSBtYXBEYXRhLndpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ID0gbWFwRGF0YS5oZWlnaHQ7XG5cblx0XHR0aGlzLnRpbGVXaWR0aCAgPSBtYXBEYXRhLnRpbGV3aWR0aDtcblx0XHR0aGlzLnRpbGVIZWlnaHQgPSBtYXBEYXRhLnRpbGVoZWlnaHQ7XG5cblx0XHRhd2FpdCBQcm9taXNlLmFsbCh0aWxlc2V0cy5tYXAodCA9PiB0LnJlYWR5KSk7XG5cblx0XHR0aGlzLmFzc2VtYmxlKHRpbGVzZXRzKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0YXNzZW1ibGUodGlsZXNldHMpXG5cdHtcblx0XHR0aWxlc2V0cy5zb3J0KChhLCBiKSA9PiBhLmZpcnN0R2lkIC0gYi5maXJzdEdpZCk7XG5cblx0XHRjb25zdCB0aWxlVG90YWwgPSB0aGlzLnRpbGVDb3VudCA9IHRpbGVzZXRzLnJlZHVjZSgoYSwgYikgPT4gYS50aWxlQ291bnQgKyBiLnRpbGVDb3VudCwge3RpbGVDb3VudDogMH0pO1xuXG5cdFx0Y29uc3Qgc2l6ZSA9IE1hdGguY2VpbChNYXRoLnNxcnQodGlsZVRvdGFsKSk7XG5cblx0XHRjb25zdCBkZXN0aW5hdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMudGlsZVNldFdpZHRoICA9IGRlc3RpbmF0aW9uLndpZHRoICA9IHNpemUgKiB0aGlzLnRpbGVXaWR0aDtcblx0XHR0aGlzLnRpbGVTZXRIZWlnaHQgPSBkZXN0aW5hdGlvbi5oZWlnaHQgPSBNYXRoLmNlaWwodGlsZVRvdGFsIC8gc2l6ZSkgKiB0aGlzLnRpbGVIZWlnaHQ7XG5cblx0XHRjb25zdCBjdHhEZXN0aW5hdGlvbiA9IGRlc3RpbmF0aW9uLmdldENvbnRleHQoJzJkJyk7XG5cblx0XHRsZXQgeERlc3RpbmF0aW9uID0gMDtcblx0XHRsZXQgeURlc3RpbmF0aW9uID0gMDtcblxuXHRcdGZvcihjb25zdCB0aWxlc2V0IG9mIHRpbGVzZXRzKVxuXHRcdHtcblx0XHRcdGxldCB4U291cmNlID0gMDtcblx0XHRcdGxldCB5U291cmNlID0gMDtcblx0XHRcdGNvbnN0IGltYWdlID0gdGlsZXNldC5pbWFnZTtcblx0XHRcdGNvbnN0IHNvdXJjZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdFx0XHRzb3VyY2Uud2lkdGggPSBpbWFnZS53aWR0aDtcblx0XHRcdHNvdXJjZS5oZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XG5cblx0XHRcdGNvbnN0IGN0eFNvdXJjZSA9IHNvdXJjZS5nZXRDb250ZXh0KCcyZCcsIHt3aWxsUmVhZEZyZXF1ZW50bHk6IHRydWV9KTtcblxuXHRcdFx0Y3R4U291cmNlLmRyYXdJbWFnZShpbWFnZSwgMCwgMCk7XG5cblx0XHRcdGZvcihsZXQgaSA9IDA7IGkgPCB0aWxlc2V0LnRpbGVDb3VudDsgaSsrKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB0aWxlID0gY3R4U291cmNlLmdldEltYWdlRGF0YSh4U291cmNlLCB5U291cmNlLCB0aGlzLnRpbGVXaWR0aCwgdGhpcy50aWxlSGVpZ2h0KTtcblxuXHRcdFx0XHRjdHhEZXN0aW5hdGlvbi5wdXRJbWFnZURhdGEodGlsZSwgeERlc3RpbmF0aW9uLCB5RGVzdGluYXRpb24pO1xuXG5cdFx0XHRcdHhTb3VyY2UgKz0gdGhpcy50aWxlV2lkdGg7XG5cdFx0XHRcdHhEZXN0aW5hdGlvbiArPSB0aGlzLnRpbGVXaWR0aDtcblxuXHRcdFx0XHRpZih4U291cmNlID49IHRpbGVzZXQuaW1hZ2VXaWR0aClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHhTb3VyY2UgPSAwO1xuXHRcdFx0XHRcdHlTb3VyY2UgKz0gdGhpcy50aWxlSGVpZ2h0O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYoeERlc3RpbmF0aW9uID49IGRlc3RpbmF0aW9uLndpZHRoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eERlc3RpbmF0aW9uID0gMDtcblx0XHRcdFx0XHR5RGVzdGluYXRpb24gKz0gdGhpcy50aWxlSGVpZ2h0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5waXhlbHMgPSBjdHhEZXN0aW5hdGlvbi5nZXRJbWFnZURhdGEoMCwgMCwgZGVzdGluYXRpb24ud2lkdGgsIGRlc3RpbmF0aW9uLmhlaWdodCkuZGF0YTtcblxuXHRcdGRlc3RpbmF0aW9uLnRvQmxvYihibG9iID0+IHtcblx0XHRcdGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHR0aGlzLmltYWdlLm9ubG9hZCA9ICgpID0+IFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcblx0XHRcdHRoaXMuaW1hZ2Uuc3JjID0gdXJsO1xuXHRcdH0pO1xuXG5cdFx0Zm9yKGNvbnN0IHRpbGVzZXQgb2YgdGlsZXNldHMpXG5cdFx0e1xuXHRcdFx0Zm9yKGNvbnN0IHRpbGVEYXRhIG9mIHRpbGVzZXQudGlsZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKHRpbGVEYXRhLmFuaW1hdGlvbilcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYW5pbWF0aW9ucy5zZXQodGlsZURhdGEuaWQsIHRpbGVEYXRhLmFuaW1hdGlvbik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRmb3IoY29uc3QgbGF5ZXIgb2YgdGhpcy50aWxlTGF5ZXJzKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdFx0Y29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcsIHt3aWxsUmVhZEZyZXF1ZW50bHk6IHRydWV9KTtcblxuXHRcdFx0dGhpcy5jYW52YXNlcy5zZXQobGF5ZXIsIGNhbnZhcyk7XG5cdFx0XHR0aGlzLmNvbnRleHRzLnNldChsYXllciwgY29udGV4dCk7XG5cblx0XHRcdGNvbnN0IHRpbGVWYWx1ZXMgPSBuZXcgVWludDMyQXJyYXkobGF5ZXIuZGF0YS5tYXAodCA9PiAwICsgdCkpO1xuXHRcdFx0Y29uc3QgdGlsZVBpeGVscyA9IG5ldyBVaW50OENsYW1wZWRBcnJheSh0aWxlVmFsdWVzLmJ1ZmZlcik7XG5cblx0XHRcdGZvcihjb25zdCBpIGluIHRpbGVWYWx1ZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHRpbGUgPSB0aWxlVmFsdWVzW2ldO1xuXG5cdFx0XHRcdGlmKHRoaXMuYW5pbWF0aW9ucy5oYXModGlsZSkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyh7aSwgdGlsZX0sIHRoaXMuYW5pbWF0aW9ucy5nZXQodGlsZSkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGZvcihsZXQgaSA9IDM7IGkgPCB0aWxlUGl4ZWxzLmxlbmd0aDsgaSArPTQpXG5cdFx0XHR7XG5cdFx0XHRcdHRpbGVQaXhlbHNbaV0gPSAweEZGO1xuXHRcdFx0fVxuXG5cdFx0XHRjYW52YXMud2lkdGggPSB0aGlzLndpZHRoO1xuXHRcdFx0Y2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xuXHRcdFx0Y29udGV4dC5wdXRJbWFnZURhdGEobmV3IEltYWdlRGF0YSh0aWxlUGl4ZWxzLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCksIDAsIDApO1xuXHRcdH1cblx0fVxuXG5cdGdldFNsaWNlKHgsIHksIHcsIGgsIHQgPSAwKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuY29udGV4dHMudmFsdWVzKCkubWFwKGNvbnRleHQgPT4gY29udGV4dC5nZXRJbWFnZURhdGEoeCwgeSwgdywgaCkuZGF0YSk7XG5cdH1cbn1cbiIsImltcG9ydCB7IEJpbmRhYmxlIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvQmluZGFibGUnO1xuaW1wb3J0IHsgVGlsZXNldCB9IGZyb20gJy4uL3Nwcml0ZS9UaWxlc2V0JztcbmltcG9ydCB7IFRpbGVNYXAgfSBmcm9tICcuL1RpbGVNYXAnO1xuaW1wb3J0IHsgUmVjdGFuZ2xlIH0gZnJvbSAnLi4vbWF0aC9SZWN0YW5nbGUnO1xuaW1wb3J0IHsgU01UcmVlIH0gZnJvbSAnLi4vbWF0aC9TTVRyZWUnO1xuXG5leHBvcnQgY2xhc3MgV29ybGRcbntcblx0Y29uc3RydWN0b3Ioe3NyY30pXG5cdHtcblx0XHR0aGlzW0JpbmRhYmxlLlByZXZlbnRdID0gdHJ1ZTtcblx0XHR0aGlzLnJlYWR5ID0gdGhpcy5nZXRSZWFkeShzcmMpO1xuXHRcdHRoaXMubWFwcyA9IFtdO1xuXHRcdHRoaXMubVRyZWUgPSBuZXcgU01UcmVlO1xuXHRcdHRoaXMucmVjdE1hcCA9IG5ldyBNYXA7XG5cdH1cblxuXHRhc3luYyBnZXRSZWFkeShzcmMpXG5cdHtcblx0XHRjb25zdCB3b3JsZERhdGEgPSBhd2FpdCAoYXdhaXQgZmV0Y2goc3JjKSkuanNvbigpO1xuXHRcdHJldHVybiBhd2FpdCBQcm9taXNlLmFsbCh3b3JsZERhdGEubWFwcy5tYXAoKG0sIGkpID0+IHtcblx0XHRcdGNvbnN0IG1hcCA9IG5ldyBUaWxlTWFwKHtzcmM6IG0uZmlsZU5hbWV9KTtcblxuXHRcdFx0bWFwLnhXb3JsZCA9IG0ueDtcblx0XHRcdG1hcC55V29ybGQgPSBtLnk7XG5cdFx0XHR0aGlzLm1hcHNbaV0gPSBtYXA7XG5cblx0XHRcdGNvbnN0IHJlY3QgPSBuZXcgUmVjdGFuZ2xlKG0ueCwgbS55LCBtLnggKyBtLndpZHRoLCBtLnkgKyBtLmhlaWdodCk7XG5cblx0XHRcdHRoaXMucmVjdE1hcC5zZXQocmVjdCwgbWFwKTtcblxuXHRcdFx0dGhpcy5tVHJlZS5hZGQocmVjdCk7XG5cblx0XHRcdHJldHVybiBtYXAucmVhZHk7XG5cdFx0fSkpO1xuXHR9XG5cblx0Z2V0TWFwc0ZvclBvaW50KHgsIHkpXG5cdHtcblx0XHRjb25zdCByZWN0cyA9IHRoaXMubVRyZWUucXVlcnkoeCwgeSwgeCwgeSk7XG5cdFx0Y29uc3QgbWFwcyA9IG5ldyBTZXQ7XG5cblx0XHRmb3IoY29uc3QgcmVjdCBvZiByZWN0cylcblx0XHR7XG5cdFx0XHRjb25zdCBtYXAgPSB0aGlzLnJlY3RNYXAuZ2V0KHJlY3QpO1xuXHRcdFx0bWFwcy5hZGQobWFwKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbWFwcztcblx0fVxuXG5cdGdldE1hcHNGb3JSZWN0KHgsIHksIHcsIGgpXG5cdHtcblx0XHRjb25zdCByZWN0cyA9IHRoaXMubVRyZWUucXVlcnkoeCArIC13KjAuNSwgeSArIC1oKjAuNSwgeCArIHcqMC41LCB5ICsgaCowLjUpO1xuXHRcdGNvbnN0IG1hcHMgPSBuZXcgU2V0O1xuXG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZSgncXVlcnkgbWFwVHJlZScpO1xuXG5cdFx0Zm9yKGNvbnN0IHJlY3Qgb2YgcmVjdHMpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbWFwID0gdGhpcy5yZWN0TWFwLmdldChyZWN0KTtcblx0XHRcdG1hcHMuYWRkKG1hcCk7XG5cdFx0fVxuXG5cdFx0d2luZG93LnNtUHJvZmlsaW5nICYmIGNvbnNvbGUudGltZUVuZCgncXVlcnkgbWFwVHJlZScpO1xuXG5cdFx0cmV0dXJuIG1hcHM7XG5cdH1cbn1cbiIsIi8qIGpzaGludCBpZ25vcmU6c3RhcnQgKi9cbihmdW5jdGlvbigpIHtcbiAgdmFyIFdlYlNvY2tldCA9IHdpbmRvdy5XZWJTb2NrZXQgfHwgd2luZG93Lk1veldlYlNvY2tldDtcbiAgdmFyIGJyID0gd2luZG93LmJydW5jaCA9ICh3aW5kb3cuYnJ1bmNoIHx8IHt9KTtcbiAgdmFyIGFyID0gYnJbJ2F1dG8tcmVsb2FkJ10gPSAoYnJbJ2F1dG8tcmVsb2FkJ10gfHwge30pO1xuICBpZiAoIVdlYlNvY2tldCB8fCBhci5kaXNhYmxlZCkgcmV0dXJuO1xuICBpZiAod2luZG93Ll9hcikgcmV0dXJuO1xuICB3aW5kb3cuX2FyID0gdHJ1ZTtcblxuICB2YXIgY2FjaGVCdXN0ZXIgPSBmdW5jdGlvbih1cmwpe1xuICAgIHZhciBkYXRlID0gTWF0aC5yb3VuZChEYXRlLm5vdygpIC8gMTAwMCkudG9TdHJpbmcoKTtcbiAgICB1cmwgPSB1cmwucmVwbGFjZSgvKFxcJnxcXFxcPyljYWNoZUJ1c3Rlcj1cXGQqLywgJycpO1xuICAgIHJldHVybiB1cmwgKyAodXJsLmluZGV4T2YoJz8nKSA+PSAwID8gJyYnIDogJz8nKSArJ2NhY2hlQnVzdGVyPScgKyBkYXRlO1xuICB9O1xuXG4gIHZhciBicm93c2VyID0gbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpO1xuICB2YXIgZm9yY2VSZXBhaW50ID0gYXIuZm9yY2VSZXBhaW50IHx8IGJyb3dzZXIuaW5kZXhPZignY2hyb21lJykgPiAtMTtcblxuICB2YXIgcmVsb2FkZXJzID0ge1xuICAgIHBhZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgIH0sXG5cbiAgICBzdHlsZXNoZWV0OiBmdW5jdGlvbigpe1xuICAgICAgW10uc2xpY2VcbiAgICAgICAgLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnbGlua1tyZWw9c3R5bGVzaGVldF0nKSlcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgICAgdmFyIHZhbCA9IGxpbmsuZ2V0QXR0cmlidXRlKCdkYXRhLWF1dG9yZWxvYWQnKTtcbiAgICAgICAgICByZXR1cm4gbGluay5ocmVmICYmIHZhbCAhPSAnZmFsc2UnO1xuICAgICAgICB9KVxuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgICAgbGluay5ocmVmID0gY2FjaGVCdXN0ZXIobGluay5ocmVmKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIC8vIEhhY2sgdG8gZm9yY2UgcGFnZSByZXBhaW50IGFmdGVyIDI1bXMuXG4gICAgICBpZiAoZm9yY2VSZXBhaW50KSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBkb2N1bWVudC5ib2R5Lm9mZnNldEhlaWdodDsgfSwgMjUpO1xuICAgIH0sXG5cbiAgICBqYXZhc2NyaXB0OiBmdW5jdGlvbigpe1xuICAgICAgdmFyIHNjcmlwdHMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdCcpKTtcbiAgICAgIHZhciB0ZXh0U2NyaXB0cyA9IHNjcmlwdHMubWFwKGZ1bmN0aW9uKHNjcmlwdCkgeyByZXR1cm4gc2NyaXB0LnRleHQgfSkuZmlsdGVyKGZ1bmN0aW9uKHRleHQpIHsgcmV0dXJuIHRleHQubGVuZ3RoID4gMCB9KTtcbiAgICAgIHZhciBzcmNTY3JpcHRzID0gc2NyaXB0cy5maWx0ZXIoZnVuY3Rpb24oc2NyaXB0KSB7IHJldHVybiBzY3JpcHQuc3JjIH0pO1xuXG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciBhbGwgPSBzcmNTY3JpcHRzLmxlbmd0aDtcbiAgICAgIHZhciBvbkxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9hZGVkID0gbG9hZGVkICsgMTtcbiAgICAgICAgaWYgKGxvYWRlZCA9PT0gYWxsKSB7XG4gICAgICAgICAgdGV4dFNjcmlwdHMuZm9yRWFjaChmdW5jdGlvbihzY3JpcHQpIHsgZXZhbChzY3JpcHQpOyB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzcmNTY3JpcHRzXG4gICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKHNjcmlwdCkge1xuICAgICAgICAgIHZhciBzcmMgPSBzY3JpcHQuc3JjO1xuICAgICAgICAgIHNjcmlwdC5yZW1vdmUoKTtcbiAgICAgICAgICB2YXIgbmV3U2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgICAgICAgbmV3U2NyaXB0LnNyYyA9IGNhY2hlQnVzdGVyKHNyYyk7XG4gICAgICAgICAgbmV3U2NyaXB0LmFzeW5jID0gdHJ1ZTtcbiAgICAgICAgICBuZXdTY3JpcHQub25sb2FkID0gb25Mb2FkO1xuICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQobmV3U2NyaXB0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9O1xuICB2YXIgcG9ydCA9IGFyLnBvcnQgfHwgOTQ4NTtcbiAgdmFyIGhvc3QgPSBici5zZXJ2ZXIgfHwgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lIHx8ICdsb2NhbGhvc3QnO1xuXG4gIHZhciBjb25uZWN0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyBXZWJTb2NrZXQoJ3dzOi8vJyArIGhvc3QgKyAnOicgKyBwb3J0KTtcbiAgICBjb25uZWN0aW9uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgIGlmIChhci5kaXNhYmxlZCkgcmV0dXJuO1xuICAgICAgdmFyIG1lc3NhZ2UgPSBldmVudC5kYXRhO1xuICAgICAgdmFyIHJlbG9hZGVyID0gcmVsb2FkZXJzW21lc3NhZ2VdIHx8IHJlbG9hZGVycy5wYWdlO1xuICAgICAgcmVsb2FkZXIoKTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoY29ubmVjdGlvbi5yZWFkeVN0YXRlKSBjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uY2xvc2UgPSBmdW5jdGlvbigpe1xuICAgICAgd2luZG93LnNldFRpbWVvdXQoY29ubmVjdCwgMTAwMCk7XG4gICAgfTtcbiAgfTtcbiAgY29ubmVjdCgpO1xufSkoKTtcbi8qIGpzaGludCBpZ25vcmU6ZW5kICovXG4iXX0=