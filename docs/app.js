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

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Gl2d = void 0;

var _Bindable = require("curvature/base/Bindable");

var _Injectable2 = require("../inject/Injectable");

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

var Gl2d = /*#__PURE__*/function (_Injectable) {
  _inherits(Gl2d, _Injectable);

  var _super = _createSuper(Gl2d);

  function Gl2d(element) {
    var _this;

    _classCallCheck(this, Gl2d);

    _this = _super.call(this);
    new (_Injectable2.Injectable.inject({
      Gl2d: _assertThisInitialized(_this)
    }))();
    _this.element = element; // || document.createElement('canvas');

    _this.context = _this.element.getContext('webgl');
    _this.zoomLevel = 1;
    return _this;
  }

  _createClass(Gl2d, [{
    key: "resize",
    value: function resize(x, y) {
      x = (x || this.element.width) / this.zoomLevel;
      y = (y || this.element.height) / this.zoomLevel;
      var gl = this.context;
      gl.viewport(0, 0, x, y);
    }
  }, {
    key: "draw",
    value: function draw() {
      var gl = this.context;
      gl.useProgram(this.program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }, {
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
}(_Injectable2.Injectable);

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

var _Injectable = require("../inject/Injectable");

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

      this.spriteBoard = new _SpriteBoard.SpriteBoard(this.tags.canvas.element, this.map);
      var entity = new _Entity.Entity();
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
      this.args.showEditor = true; // this.args.controller.args.bindTo((v,k,t,d,p)=>{
      // 	if(v === 0)
      // 	{
      // 		// sprite.moving = false;
      // 		// sprite.speed  = 0;
      // 		return;
      // 	}
      // 	if(k !== 'x' && k !== 'y')
      // 	{
      // 		return;
      // 	}
      // 	let horizontal = false;
      // 	let magnitude  = t['y'];
      // 	if(Math.abs(t['x']) > Math.abs(t['y']))
      // 	{
      // 		horizontal = true;
      // 		magnitude  = t['x'];
      // 	}
      // 	if(horizontal && magnitude > 0)
      // 	{
      // 		// sprite.setFrames(sprite.walking.east);
      // 		// sprite.direction = sprite.RIGHT;
      // 	}
      // 	else if(horizontal && magnitude < 0)
      // 	{
      // 		// sprite.setFrames(sprite.walking.west);
      // 		// sprite.direction = sprite.LEFT;
      // 	}
      // 	else if(magnitude > 0){
      // 		// sprite.setFrames(sprite.walking.south);
      // 		// sprite.direction = sprite.DOWN;
      // 	}
      // 	else if(magnitude < 0){
      // 		// sprite.setFrames(sprite.walking.north);
      // 		// sprite.direction = sprite.UP;
      // 	}
      // 	magnitude = Math.round(magnitude / 6.125);
      // 	// sprite.speed = magnitude < 8 ? magnitude : 8;
      // 	if(magnitude < -8)
      // 	{
      // 		sprite.speed = -8;
      // 	}
      // 	// sprite.moving = !!magnitude;
      // });

      window.addEventListener('resize', function () {
        _this2.resize();

        update();
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
        _this2.args.camX = _this2.spriteBoard.Camera.x;
        _this2.args.camY = _this2.spriteBoard.Camera.y;
      };

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
      this.args.rwidth = Math.floor((x || document.body.clientWidth) / this.spriteBoard.zoomLevel);
      this.args.rheight = Math.floor((y || document.body.clientHeight) / this.spriteBoard.zoomLevel);
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
      var min = 0.35;
      var step = 0.05;

      if (delta > 0 || delta < 0 && this.spriteBoard.zoomLevel > min) {
        this.spriteBoard.zoomLevel += delta * step;
        this.resize();
      } else {
        this.spriteBoard.zoomLevel = min;
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

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Controller = void 0;

var _Bindable = require("curvature/base/Bindable");

var _Injectable = require("../inject/Injectable");

var _Keyboard = require("curvature/input/Keyboard");

var _Controller = require("../ui/Controller");

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

var Controller = /*#__PURE__*/function (_Injectable$inject) {
  _inherits(Controller, _Injectable$inject);

  var _super = _createSuper(Controller);

  function Controller() {
    var _this;

    _classCallCheck(this, Controller);

    _this = _super.call(this);

    _Keyboard.Keyboard.get().keys.bindTo(function (v, k, t, d) {
      if (v > 0) {
        _this.keyPress(k, v, t[k]);

        return;
      }

      if (v === -1) {
        _this.keyRelease(k, v, t[k]);

        return;
      }
    });

    _this.OnScreenJoyPad.args.bindTo('x', function (v) {
      _this.axis[0] = v / 50;
    });

    _this.OnScreenJoyPad.args.bindTo('y', function (v) {
      _this.axis[1] = v / 50;
    });

    return _this;
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
}(_Injectable.Injectable.inject({
  Keyboard: _Keyboard.Keyboard,
  OnScreenJoyPad: _Controller.Controller,
  triggers: _Bindable.Bindable.makeBindable({}),
  axis: _Bindable.Bindable.makeBindable({})
}));

exports.Controller = Controller;
});

;require.register("model/Entity.js", function(exports, require, module) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Entity = void 0;

var _Injectable = require("../inject/Injectable");

var _Sprite = require("../sprite/Sprite");

var _Controller = require("./Controller");

var _Camera = require("../sprite/Camera");

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

var Entity = /*#__PURE__*/function (_Injectable$inject) {
  _inherits(Entity, _Injectable$inject);

  var _super = _createSuper(Entity);

  function Entity() {
    var _this;

    _classCallCheck(this, Entity);

    _this = _super.call(this);
    _this.direction = 'south';
    _this.state = 'standing';
    return _this;
  }

  _createClass(Entity, [{
    key: "create",
    value: function create() {}
  }, {
    key: "simulate",
    value: function simulate() {
      var speed = 4;
      var xAxis = this.Controller.axis[0] || 0;
      var yAxis = this.Controller.axis[1] || 0;

      for (var t in this.Controller.triggers) {
        if (!this.Controller.triggers[t]) {
          continue;
        }

        console.log(t);
      }

      xAxis = Math.min(1, Math.max(xAxis, -1));
      yAxis = Math.min(1, Math.max(yAxis, -1));
      this.sprite.x += xAxis > 0 ? Math.ceil(speed * xAxis) : Math.floor(speed * xAxis);
      this.sprite.y += yAxis > 0 ? Math.ceil(speed * yAxis) : Math.floor(speed * yAxis);
      this.Camera.x = this.sprite.x;
      this.Camera.y = this.sprite.y;
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
}(_Injectable.Injectable.inject({
  sprite: _Sprite.Sprite,
  Controller: _Controller.Controller,
  Camera: _Camera.Camera
}));

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

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Background = void 0;

var _Bindable = require("curvature/base/Bindable");

var _Gl2d = require("../gl2d/Gl2d");

var _Injectable = require("../inject/Injectable");

var _Surface = require("./Surface");

var _Camera = require("./Camera");

var _SpriteSheet = require("./SpriteSheet");

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

var Background = /*#__PURE__*/function (_Injectable$inject) {
  _inherits(Background, _Injectable$inject);

  var _super = _createSuper(Background);

  function Background(gl2d, map) {
    var _this;

    var layer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

    _classCallCheck(this, Background);

    _this = _super.call(this);

    _Bindable.Bindable.makeBindable(_assertThisInitialized(_this));

    _this.panes = [];
    _this.panesXY = {};
    _this.maxPanes = 9;
    _this.surfaceX = 5;
    _this.surfaceY = 5;
    _this.spriteSheet = new _SpriteSheet.SpriteSheet();
    _this.tileWidth = 32;
    _this.tileHeight = 32;
    _this.map = map;
    _this.layer = layer;
    return _this;
  }

  _createClass(Background, [{
    key: "renderPane",
    value: function renderPane(x, y, forceUpdate) {
      var pane;
      var gl2d = this.Gl2d;
      var paneX = x * (this.tileWidth * this.surfaceX);
      var paneY = y * (this.tileHeight * this.surfaceY);

      if (this.panesXY[paneX] && this.panesXY[paneX][paneY]) {
        pane = this.panesXY[paneX][paneY];
      } else {
        pane = new _Surface.Surface(gl2d, this.map, this.surfaceX, this.surfaceY, paneX, paneY, this.layer);

        if (!this.panesXY[paneX]) {
          this.panesXY[paneX] = {};
        }

        if (!this.panesXY[paneX][paneY]) {
          this.panesXY[paneX][paneY] = pane;
        }
      }

      this.panes.unshift(pane);

      if (this.panes.length > this.maxPanes) {
        this.panes.pop();
      }
    }
  }, {
    key: "draw",
    value: function draw() {
      var centerX = Math.floor(this.Camera.x / (this.surfaceX * this.tileWidth));
      var centerY = Math.floor(this.Camera.y / (this.surfaceY * this.tileHeight));
      var range = [-1, 0, 1]; // let range = [-2,-1,0,1,2];

      for (var x in range) {
        for (var y in range) {
          this.renderPane(centerX + range[x], centerY + range[y]);
        }
      }

      this.panes.map(function (p) {
        p.draw();
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

      this.surfaceX = Math.ceil(x / this.tileWidth);
      this.surfaceY = Math.ceil(y / this.tileHeight);
      this.draw();
    }
  }, {
    key: "simulate",
    value: function simulate() {}
  }]);

  return Background;
}(_Injectable.Injectable.inject({
  Gl2d: _Gl2d.Gl2d,
  Camera: _Camera.Camera
}));

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

var Camera = /*#__PURE__*/_createClass(function Camera() {
  _classCallCheck(this, Camera);

  this.x = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;
});

exports.Camera = Camera;
});

;require.register("sprite/Sprite.js", function(exports, require, module) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Sprite = void 0;

var _SpriteSheet = require("./SpriteSheet");

var _Gl2d = require("../gl2d/Gl2d");

var _Injectable = require("../inject/Injectable");

var _Camera = require("./Camera");

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

var Sprite = /*#__PURE__*/function (_Injectable$inject) {
  _inherits(Sprite, _Injectable$inject);

  var _super = _createSuper(Sprite);

  function Sprite(imageSrc) {
    var _this;

    _classCallCheck(this, Sprite);

    _this = _super.call(this);
    _this.z = 0;
    _this.x = 0;
    _this.y = 0;
    _this.width = 0;
    _this.height = 0;
    _this.scale = 1;
    _this.frames = [];
    _this.frameDelay = 4;
    _this.currentDelay = _this.frameDelay;
    _this.currentFrame = 0;
    _this.currentFrames = '';
    _this.speed = 0;
    _this.maxSpeed = 8;
    _this.moving = false;
    _this.RIGHT = 0;
    _this.DOWN = 1;
    _this.LEFT = 2;
    _this.UP = 3;
    _this.EAST = _this.RIGHT;
    _this.SOUTH = _this.DOWN;
    _this.WEST = _this.LEFT;
    _this.NORTH = _this.UP;
    _this.standing = {
      'north': ['player_standing_north.png'],
      'south': ['player_standing_south.png'],
      'west': ['player_standing_west.png'],
      'east': ['player_standing_east.png']
    };
    _this.walking = {
      'north': ['player_walking_north.png', 'player_walking_north.png', 'player_standing_north.png', 'player_walking_north2.png', 'player_walking_north2.png', 'player_standing_north.png'],
      'south': ['player_walking_south.png', 'player_walking_south.png', 'player_standing_south.png', 'player_walking_south2.png', 'player_walking_south2.png', 'player_standing_south.png'],
      'west': ['player_walking_west.png', 'player_walking_west.png', 'player_standing_west.png', 'player_standing_west.png', 'player_walking_west2.png', 'player_walking_west2.png', 'player_standing_west.png', 'player_standing_west.png'],
      'east': ['player_walking_east.png', 'player_walking_east.png', 'player_standing_east.png', 'player_standing_east.png', 'player_walking_east2.png', 'player_walking_east2.png', 'player_standing_east.png', 'player_standing_east.png']
    };
    var gl = _this.Gl2d.context;
    gl.vertexAttribPointer(_this.Gl2d.positionLocation, 2, gl.FLOAT, false, 0, 0);
    _this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, _this.texture);

    var r = function r() {
      return parseInt(Math.random() * 255);
    };

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r(), r(), 0, 255]));

    _this.SpriteSheet.ready.then(function (sheet) {
      var frame = _this.SpriteSheet.getFrame(imageSrc);

      if (frame) {
        Sprite.loadTexture(_this.Gl2d, _this.SpriteSheet, frame).then(function (args) {
          _this.texture = args.texture;
          _this.width = args.image.width * _this.scale;
          _this.height = args.image.height * _this.scale;
        });
      }
    });

    return _this;
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

      var gl = this.Gl2d.context;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(this.Gl2d.program);
      gl.enableVertexAttribArray(this.Gl2d.positionLocation);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.enableVertexAttribArray(this.Gl2d.texCoordLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.Gl2d.texCoordBuffer);
      gl.vertexAttribPointer(this.Gl2d.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.Gl2d.texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STREAM_DRAW);
      this.setRectangle(this.x - (this.Camera.x - this.Camera.width / 2) - 16 * this.scale, this.y - (this.Camera.y - this.Camera.height / 2) - this.height / 2 - 16 * this.scale, this.width, this.height);
      gl.uniform4f(this.Gl2d.colorLocation, 1, 0, 0, 1);
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
      this.SpriteSheet.ready.then(function (sheet) {
        var frames = sheet.getFrames(frameSelector).map(function (frame) {
          return Sprite.loadTexture(_this2.Gl2d, _this2.SpriteSheet, frame).then(function (args) {
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
      var gl = this.Gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.Gl2d.positionBuffer);
      var x1 = x;
      var x2 = x + width;
      var y1 = y;
      var y2 = y + height;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STREAM_DRAW);
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
}(_Injectable.Injectable.inject({
  Gl2d: _Gl2d.Gl2d,
  Camera: _Camera.Camera,
  SpriteSheet: _SpriteSheet.SpriteSheet
}));

exports.Sprite = Sprite;
});

;require.register("sprite/SpriteBoard.js", function(exports, require, module) {
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SpriteBoard = void 0;

var _Bag = require("curvature/base/Bag");

var _Bindable = require("curvature/base/Bindable");

var _Sprite = require("./Sprite");

var _SpriteSheet = require("./SpriteSheet");

var _Entity = require("../model/Entity");

var _Background = require("./Background");

var _Injectable = require("../inject/Injectable");

var _Gl2d = require("../gl2d/Gl2d");

var _Camera = require("./Camera");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _get() { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(arguments.length < 3 ? target : receiver); } return desc.value; }; } return _get.apply(this, arguments); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var SpriteBoard = /*#__PURE__*/function (_Gl2d$inject) {
  _inherits(SpriteBoard, _Gl2d$inject);

  var _super = _createSuper(SpriteBoard);

  function SpriteBoard(element, map) {
    var _this;

    _classCallCheck(this, SpriteBoard);

    _this = _super.call(this, element);
    _this.map = map;
    new (_Injectable.Injectable.inject({
      Gl2d: _assertThisInitialized(_this)
    }))();
    _this.mouse = {
      x: null,
      y: null,
      clickX: null,
      clickY: null
    };
    _this.sprites = new _Bag.Bag();
    _this.Camera.width = _this.element.width;
    _this.Camera.height = _this.element.height;
    var gl = _this.context;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    _this.program = _this.createProgram(_this.createShader('sprite/texture.vert'), _this.createShader('sprite/texture.frag'));
    _this.overlayProgram = _this.createProgram(_this.createShader('overlay/overlay.vert'), _this.createShader('overlay/overlay.frag'));
    _this.positionLocation = gl.getAttribLocation(_this.program, "a_position");
    _this.texCoordLocation = gl.getAttribLocation(_this.program, "a_texCoord");
    _this.resolutionLocation = gl.getUniformLocation(_this.program, "u_resolution");
    _this.colorLocation = gl.getUniformLocation(_this.program, "u_color");
    _this.overlayPosition = gl.getAttribLocation(_this.overlayProgram, "a_position");
    _this.overlayResolution = gl.getUniformLocation(_this.overlayProgram, "u_resolution");
    _this.overlayColor = gl.getUniformLocation(_this.overlayProgram, "u_color");
    _this.positionBuffer = gl.createBuffer();
    _this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, _this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    document.addEventListener('mousemove', function (event) {
      _this.mouse.x = event.clientX;
      _this.mouse.y = event.clientY; // this.moveCamera(
      // 	-this.mouse.x + gl.canvas.width/2
      // 	, -this.mouse.y + gl.canvas.height/2
      // );
    });
    _this.selected = {
      localX: null,
      localY: null,
      globalX: null,
      globalY: null,
      startGlobalX: null,
      startGlobalY: null
    };
    _this.selected = _Bindable.Bindable.makeBindable(_this.selected);
    var selecting = false;
    var tileSize = 32; // this.element.addEventListener('mousedown', (event)=>{
    // 	let modSize   = tileSize * this.zoomLevel;
    // 	if(this.unselect())
    // 	{
    // 		selecting = false;
    // 		return;
    // 	}
    // 	// console.log(
    // 	// 	event.clientX
    // 	// 	, event.clientY
    // 	// );
    // 	selecting = true;
    // 	this.mouse.clickX = event.clientX;
    // 	this.mouse.clickY = event.clientY;
    // 	let localX = Math.floor((this.mouse.clickX
    // 		+ (this.Camera.x % modSize)
    // 		- (Math.floor(this.element.width /2) % modSize)
    // 		+ 16  * this.zoomLevel
    // 	) / modSize);
    // 	let localY = Math.floor((this.mouse.clickY
    // 		+ (this.Camera.y % modSize)
    // 		- (Math.floor(this.element.height /2) % modSize)
    // 		+ 16  * this.zoomLevel
    // 	) / modSize);
    // 	this.selected.startLocalX = localX;
    // 	this.selected.startLocalY = localY;
    // 	this.selected.startGlobalX = (this.selected.startLocalX
    // 		- Math.floor(Math.floor(this.element.width /2) / modSize)
    // 		+ (this.Camera.x < 0
    // 			? Math.ceil(this.Camera.x * this.zoomLevel / modSize)
    // 			: Math.floor(this.Camera.x * this.zoomLevel / modSize)
    // 		)
    // 	);
    // 	this.selected.startGlobalY = (this.selected.startLocalY
    // 		- Math.floor(Math.floor(this.element.height /2) / modSize)
    // 		+ (this.Camera.y < 0
    // 			? Math.ceil(this.Camera.y * this.zoomLevel / modSize)
    // 			: Math.floor(this.Camera.y * this.zoomLevel / modSize)
    // 		)
    // 	);
    // });
    // this.element.addEventListener('mouseup', (event)=>{
    // 		let modSize   = tileSize * this.zoomLevel;
    // 		if(!selecting)
    // 		{
    // 			selecting = false;
    // 			return;
    // 		}
    // 		console.log(
    // 			event.clientX
    // 			, event.clientY
    // 		);
    // 		this.mouse.clickX = event.clientX;
    // 		this.mouse.clickY = event.clientY;
    // 		let localX = Math.floor((this.mouse.clickX
    // 			+ (this.Camera.x % modSize)
    // 			- (Math.floor(this.element.width /2) % modSize)
    // 			+ 16  * this.zoomLevel
    // 		) / modSize);
    // 		let localY = Math.floor((this.mouse.clickY
    // 			+ (this.Camera.y % modSize)
    // 			- (Math.floor(this.element.height /2) % modSize)
    // 			+ 16  * this.zoomLevel
    // 		) / modSize);
    // 		console.log(localX, localY);
    // 		let globalX = (localX
    // 			- Math.floor(Math.floor(this.element.width /2) / modSize)
    // 			+ (this.Camera.x < 0
    // 				? Math.ceil(this.Camera.x * this.zoomLevel / modSize)
    // 				: Math.floor(this.Camera.x * this.zoomLevel / modSize)
    // 			)
    // 		);
    // 		let globalY = (localY
    // 			- Math.floor(Math.floor(this.element.height /2) / modSize)
    // 			+ (this.Camera.y < 0
    // 				? Math.ceil(this.Camera.y * this.zoomLevel / modSize)
    // 				: Math.floor(this.Camera.y * this.zoomLevel /  modSize)
    // 			)
    // 		);
    // 		this.selected.localX  = localX;
    // 		this.selected.globalX = globalX;
    // 		this.selected.localY  = localY;
    // 		this.selected.globalY = globalY;
    // 		selecting = false;
    // });

    _this.background = new _Background.Background(_assertThisInitialized(_this), map);
    _this.background1 = new _Background.Background(_assertThisInitialized(_this), map, 1);
    var w = 1280;

    for (var i in Array(6).fill()) {
      var barrel = new _Sprite.Sprite('barrel.png');
      barrel.x = i * 32 % w;
      barrel.y = Math.trunc(i * 32 / w) * 32;

      _this.sprites.add(_this.background);

      _this.sprites.add(_this.background1);

      _this.sprites.add(barrel);
    } // this.sprites.add(new Sprite('player_standing_south.png'));


    return _this;
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
      var gl = this.context;

      _get(_getPrototypeOf(SpriteBoard.prototype), "draw", this).call(this);

      gl.uniform2f(this.resolutionLocation, this.Camera.width, this.Camera.height);
      var sprites = this.sprites.items();
      sprites.map(function (s) {
        s.z = s.y;
      });
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
      sprites.map(function (s) {
        return s.draw();
      });

      if (this.selected.localX === null) {
        return;
      }

      gl.useProgram(this.overlayProgram);
      gl.uniform2f(this.overlayResolution, gl.canvas.width, gl.canvas.height);
      var minX = this.selected.startGlobalX;
      var maxX = this.selected.globalX;

      if (this.selected.globalX < minX) {
        minX = this.selected.globalX;
        maxX = this.selected.startGlobalX;
      }

      var minY = this.selected.startGlobalY;
      var maxY = this.selected.globalY;

      if (this.selected.globalY < minY) {
        minY = this.selected.globalY;
        maxY = this.selected.startGlobalY;
      }

      maxX += 1;
      maxY += 1;
      var tileSize = 32;
      var modSize = tileSize * this.zoomLevel; // console.log(minX, minY);

      this.setRectangle(minX * modSize - this.Camera.x * this.zoomLevel + this.element.width / 2 - modSize / 2, minY * modSize - this.Camera.y * this.zoomLevel + this.element.height / 2 - modSize / 2, (maxX - minX) * modSize, (maxY - minY) * modSize);
      console.log();
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }, {
    key: "resize",
    value: function resize(x, y) {
      x = x || this.element.width;
      y = y || this.element.height;
      this.Camera.width = x;
      this.Camera.height = y;
      this.background.resize(Math.round(x / 2 + 32) * (1 / this.zoomLevel), Math.round(y / 2 + 32) * (1 / this.zoomLevel));
      this.background1.resize(Math.round(x / 2 + 32) * (1 / this.zoomLevel), Math.round(y / 2 + 32) * (1 / this.zoomLevel));

      _get(_getPrototypeOf(SpriteBoard.prototype), "resize", this).call(this, x, y);

      this.Camera.width = x / this.zoomLevel;
      this.Camera.height = y / this.zoomLevel;
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      var gl = this.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.vertexAttribPointer(this.overlayPosition, 2, gl.FLOAT, false, 0, 0);
      var x1 = x;
      var x2 = x + width;
      var y1 = y;
      var y2 = y + height;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STREAM_DRAW);
    }
  }]);

  return SpriteBoard;
}(_Gl2d.Gl2d.inject({
  Camera: _Camera.Camera
}));

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
      var context = canvas.getContext("2d");
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

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Surface = void 0;

var _Injectable = require("../inject/Injectable");

var _SpriteSheet = require("./SpriteSheet");

var _Camera = require("./Camera");

var _Gl2d = require("../gl2d/Gl2d");

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

var Surface = /*#__PURE__*/function (_Injectable$inject) {
  _inherits(Surface, _Injectable$inject);

  var _super = _createSuper(Surface);

  function Surface(gl2d, map) {
    var _this;

    var xSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2;
    var ySize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 2;
    var xOffset = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
    var yOffset = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
    var layer = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 0;

    _classCallCheck(this, Surface);

    _this = _super.call(this);
    _this.gl2d = gl2d;
    _this.x = xOffset;
    _this.y = yOffset;
    _this.layer = layer;
    _this.xSize = xSize;
    _this.ySize = ySize;
    _this.tileWidth = 32;
    _this.tileHeight = 32;
    _this.width = _this.xSize * _this.tileWidth;
    _this.height = _this.ySize * _this.tileHeight;
    _this.map = map;
    _this.texVertices = [];
    var gl = gl2d.context;
    _this.texture = gl.createTexture();
    _this.subTextures = {};
    _this.loaded = false;
    gl.bindTexture(gl.TEXTURE_2D, _this.texture);

    var r = function r() {
      return parseInt(Math.random() * 255);
    };

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r(), r(), 0, 255]));

    _this.SpriteSheet.ready.then(function (sheet) {
      gl.bindTexture(gl.TEXTURE_2D, _this.texture); // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      // gl.texImage2D(
      // 	gl.TEXTURE_2D
      // 	, 0
      // 	, gl.RGBA
      // 	, gl.RGBA
      // 	, gl.UNSIGNED_BYTE
      // 	, sheet.image
      // );

      var texturePromises = [];

      var _loop = function _loop(i) {
        var vertices = void 0;
        var localX = i % _this.xSize;
        var offsetX = Math.floor(_this.x / _this.tileWidth);
        var globalX = localX + offsetX;
        var localY = Math.floor(i / _this.xSize);
        var offsetY = Math.floor(_this.y / _this.tileHeight);
        var globalY = localY + offsetY;

        var frames = _this.map.getTile(globalX, globalY, _this.layer);

        if (Array.isArray(frames)) {
          var j = 0;
          _this.subTextures[i] = [];
          texturePromises.push(Promise.all(frames.map(function (frame) {
            return _this.SpriteSheet.constructor.loadTexture(gl2d, frame).then(function (args) {
              _this.subTextures[i][j] = args.texture;
              j++;
              return Promise.resolve();
            });
          })));
        } else {
          texturePromises.push(_this.SpriteSheet.constructor.loadTexture(gl2d, frames).then(function (args) {
            _this.subTextures[i] = args.texture;
            return Promise.resolve();
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

    _this.pane = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, _this.pane);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _this.width, _this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    _this.frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, _this.frameBuffer);
    var attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, _this.pane, 0);
    return _this;
  }

  _createClass(Surface, [{
    key: "draw",
    value: function draw() {
      var gl = this.gl2d.context;
      gl.useProgram(this.gl2d.program);
      gl.bindTexture(gl.TEXTURE_2D, this.pane);
      this.setRectangle(this.x - (this.Camera.x - this.Camera.width / 2) - 16, this.y - (this.Camera.y - this.Camera.height / 2) - 16, this.width, this.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }, {
    key: "assemble",
    value: function assemble() {
      var gl = this.gl2d.context;
      gl.useProgram(this.gl2d.program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
      gl.viewport(0, 0, this.width, this.height); // gl.clearColor(0, 0, 1, 1);   // clear to blue
      // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.uniform4f(this.gl2d.colorLocation, 1, 0, 0, 1);
      gl.enableVertexAttribArray(this.gl2d.positionLocation);
      gl.uniform2f(this.gl2d.resolutionLocation, this.width, this.height);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.enableVertexAttribArray(this.gl2d.texCoordLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);
      gl.vertexAttribPointer(this.gl2d.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
      var x = 0;
      var y = 0;

      for (var i in this.subTextures) {
        if (!Array.isArray(this.subTextures[i])) {
          this.subTextures[i] = [this.subTextures[i]];
        }

        for (var j in this.subTextures[i]) {
          gl.bindTexture(gl.TEXTURE_2D, this.subTextures[i][j]);
          gl.enableVertexAttribArray(this.gl2d.texCoordLocation);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);
          gl.vertexAttribPointer(this.gl2d.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STREAM_DRAW);
          this.setRectangle(x, y + this.tileHeight, this.tileWidth, -this.tileHeight);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        x += this.tileWidth;

        if (x >= this.width) {
          x = 0;
          y += this.tileHeight;
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }, {
    key: "setRectangle",
    value: function setRectangle(x, y, width, height) {
      var gl = this.gl2d.context;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.positionBuffer);
      gl.vertexAttribPointer(this.gl2d.positionLocation, 2, gl.FLOAT, false, 0, 0);
      var x1 = x;
      var x2 = x + width;
      var y1 = y;
      var y2 = y + height;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y2, x2, y2, x1, y1, x1, y1, x2, y2, x2, y1]), gl.STATIC_DRAW);
    }
  }]);

  return Surface;
}(_Injectable.Injectable.inject({
  Gl2d: _Gl2d.Gl2d,
  Camera: _Camera.Camera,
  SpriteSheet: _SpriteSheet.SpriteSheet
}));

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
module.exports = "// texture.fragZ\n\nprecision mediump float;\n\nuniform vec4      u_color;\nuniform sampler2D u_image;\nvarying vec2      v_texCoord;\n\nvoid main() {\n   gl_FragColor = texture2D(u_image, v_texCoord);\n   // gl_FragColor = vec4(1.0,0.0,1.0,1.0);\n   // gl_FragColor = gl_PointCoord.yyxx;\n}\n"
});

;require.register("sprite/texture.vert", function(exports, require, module) {
module.exports = "// texture.vert\n\nattribute vec2 a_position;\nattribute vec2 a_texCoord;\n\nuniform   vec2 u_resolution;\n\nvarying   vec2 v_texCoord;\n\nvoid main()\n{\n   vec2 zeroToOne = a_position / u_resolution;\n   vec2 zeroToTwo = zeroToOne * 2.0;\n   vec2 clipSpace = zeroToTwo - 1.0;\n\n   gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n   v_texCoord  = a_texCoord;\n}\n"
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

      return [this.SpriteSheet.getFrame('floorTile.png')];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9CYWcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ2FjaGUuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL0RvbS5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9NaXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9Sb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvUm91dGVzLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1J1bGVTZXQuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvU2V0TWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1RhZy5qcyIsIm5vZGVfbW9kdWxlcy9jdXJ2YXR1cmUvYmFzZS9VdWlkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9iYXNlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanMiLCJub2RlX21vZHVsZXMvY3VydmF0dXJlL2lucHV0L0tleWJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2N1cnZhdHVyZS9taXhpbi9FdmVudFRhcmdldE1peGluLmpzIiwiYXBwL0NvbmZpZy5qcyIsImFwcC9nbDJkL0dsMmQuanMiLCJhcHAvaG9tZS9WaWV3LmpzIiwiYXBwL2hvbWUvdmlldy50bXAuaHRtbCIsImFwcC9pbml0aWFsaXplLmpzIiwiYXBwL2luamVjdC9Db250YWluZXIuanMiLCJhcHAvaW5qZWN0L0luamVjdGFibGUuanMiLCJhcHAvaW5qZWN0L1NpbmdsZS5qcyIsImFwcC9tb2RlbC9Db250cm9sbGVyLmpzIiwiYXBwL21vZGVsL0VudGl0eS5qcyIsImFwcC9vdmVybGF5L292ZXJsYXkuZnJhZyIsImFwcC9vdmVybGF5L292ZXJsYXkudmVydCIsImFwcC9zcHJpdGUvQmFja2dyb3VuZC5qcyIsImFwcC9zcHJpdGUvQ2FtZXJhLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGUuanMiLCJhcHAvc3ByaXRlL1Nwcml0ZUJvYXJkLmpzIiwiYXBwL3Nwcml0ZS9TcHJpdGVTaGVldC5qcyIsImFwcC9zcHJpdGUvU3VyZmFjZS5qcyIsImFwcC9zcHJpdGUvVGV4dHVyZUJhbmsuanMiLCJhcHAvc3ByaXRlL3RleHR1cmUuZnJhZyIsImFwcC9zcHJpdGUvdGV4dHVyZS52ZXJ0IiwiYXBwL3VpL0NvbnRyb2xsZXIuanMiLCJhcHAvdWkvTWFwRWRpdG9yLmpzIiwiYXBwL3VpL2NvbnRyb2xsZXIudG1wLmh0bWwiLCJhcHAvdWkvbWFwRWRpdG9yLnRtcC5odG1sIiwiYXBwL3dvcmxkL0Zsb29yLmpzIiwiYXBwL3dvcmxkL01hcC5qcyIsIm5vZGVfbW9kdWxlcy9hdXRvLXJlbG9hZC1icnVuY2gvdmVuZG9yL2F1dG8tcmVsb2FkLmpzIl0sIm5hbWVzIjpbIkNvbmZpZyIsInRpdGxlIiwiR2wyZCIsImVsZW1lbnQiLCJJbmplY3RhYmxlIiwiaW5qZWN0IiwiY29udGV4dCIsImdldENvbnRleHQiLCJ6b29tTGV2ZWwiLCJ4IiwieSIsIndpZHRoIiwiaGVpZ2h0IiwiZ2wiLCJ2aWV3cG9ydCIsInVzZVByb2dyYW0iLCJwcm9ncmFtIiwiYmluZEZyYW1lYnVmZmVyIiwiRlJBTUVCVUZGRVIiLCJjYW52YXMiLCJjbGVhckNvbG9yIiwiY2xlYXIiLCJDT0xPUl9CVUZGRVJfQklUIiwiZGVsZXRlUHJvZ3JhbSIsImxvY2F0aW9uIiwiZXh0ZW5zaW9uIiwic3Vic3RyaW5nIiwibGFzdEluZGV4T2YiLCJ0eXBlIiwidG9VcHBlckNhc2UiLCJWRVJURVhfU0hBREVSIiwiRlJBR01FTlRfU0hBREVSIiwic2hhZGVyIiwiY3JlYXRlU2hhZGVyIiwic291cmNlIiwicmVxdWlyZSIsInNoYWRlclNvdXJjZSIsImNvbXBpbGVTaGFkZXIiLCJzdWNjZXNzIiwiZ2V0U2hhZGVyUGFyYW1ldGVyIiwiQ09NUElMRV9TVEFUVVMiLCJjb25zb2xlIiwiZXJyb3IiLCJnZXRTaGFkZXJJbmZvTG9nIiwiZGVsZXRlU2hhZGVyIiwidmVydGV4U2hhZGVyIiwiZnJhZ21lbnRTaGFkZXIiLCJjcmVhdGVQcm9ncmFtIiwiYXR0YWNoU2hhZGVyIiwibGlua1Byb2dyYW0iLCJkZXRhY2hTaGFkZXIiLCJnZXRQcm9ncmFtUGFyYW1ldGVyIiwiTElOS19TVEFUVVMiLCJnZXRQcm9ncmFtSW5mb0xvZyIsIkFwcGxpY2F0aW9uIiwib25TY3JlZW5Kb3lQYWQiLCJPblNjcmVlbkpveVBhZCIsImtleWJvYXJkIiwiS2V5Ym9hcmQiLCJnZXQiLCJWaWV3IiwiYXJncyIsInRlbXBsYXRlIiwicm91dGVzIiwiZW50aXRpZXMiLCJCYWciLCJzcGVlZCIsIm1heFNwZWVkIiwiY29udHJvbGxlciIsImZwcyIsInNwcyIsImNhbVgiLCJjYW1ZIiwiZnJhbWVMb2NrIiwic2ltdWxhdGlvbkxvY2siLCJzaG93RWRpdG9yIiwibGlzdGVuaW5nIiwia2V5cyIsImJpbmRUbyIsInYiLCJrIiwidCIsImQiLCJtYXAiLCJzcHJpdGVCb2FyZCIsInVuc2VsZWN0Iiwic3ByaXRlU2hlZXQiLCJTcHJpdGVTaGVldCIsIldvcmxkTWFwIiwibWFwRWRpdG9yIiwiTWFwRWRpdG9yIiwiU3ByaXRlQm9hcmQiLCJ0YWdzIiwiZW50aXR5IiwiRW50aXR5IiwiYWRkIiwic3ByaXRlcyIsInNwcml0ZSIsInpvb20iLCJzZWxlY3RlZCIsImdsb2JhbFgiLCJpIiwic3RhcnRHbG9iYWxYIiwiaWkiLCJqIiwic3RhcnRHbG9iYWxZIiwiamoiLCJnbG9iYWxZIiwic2V0VGlsZSIsInJlc2l6ZSIsInAiLCJsb2NhbFgiLCJzZWxlY3QiLCJ3YWl0Iiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsInVwZGF0ZSIsImZUaGVuIiwic1RoZW4iLCJmU2FtcGxlcyIsInNTYW1wbGVzIiwibWF4U2FtcGxlcyIsInNpbXVsYXRlIiwibm93IiwiZGVsdGEiLCJPYmplY3QiLCJ2YWx1ZXMiLCJpdGVtcyIsImUiLCJfc3BzIiwicHVzaCIsImxlbmd0aCIsInNoaWZ0IiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiZHJhdyIsIl9mcHMiLCJDYW1lcmEiLCJzZXRJbnRlcnZhbCIsInBlcmZvcm1hbmNlIiwicmVkdWNlIiwiYSIsImIiLCJ0b0ZpeGVkIiwicGFkU3RhcnQiLCJkb2N1bWVudCIsImJvZHkiLCJjbGllbnRXaWR0aCIsImNsaWVudEhlaWdodCIsInJ3aWR0aCIsIk1hdGgiLCJmbG9vciIsInJoZWlnaHQiLCJldmVudCIsImRlbHRhWSIsIm1pbiIsInN0ZXAiLCJCYXNlVmlldyIsIlByb3h5IiwidW5kZWZpbmVkIiwidmlldyIsIlJvdXRlciIsImxpc3RlbiIsInJlbmRlciIsIkNvbnRhaW5lciIsImluamVjdGlvbnMiLCJjb25zdHJ1Y3RvciIsImFzc2lnbiIsImNsYXNzZXMiLCJvYmplY3RzIiwibmFtZSIsImluamVjdGlvbiIsInByb3RvdHlwZSIsInRlc3QiLCJTdHJpbmciLCJpbnN0YW5jZSIsImRlZmluZVByb3BlcnR5IiwiZW51bWVyYWJsZSIsIndyaXRhYmxlIiwidmFsdWUiLCJFcnJvciIsImV4aXN0aW5nSW5qZWN0aW9ucyIsIlNpbmdsZSIsInJhbmRvbSIsInNpbmdsZSIsIkNvbnRyb2xsZXIiLCJrZXlQcmVzcyIsImtleVJlbGVhc2UiLCJheGlzIiwia2V5IiwicHJldiIsInRyaWdnZXJzIiwiQmluZGFibGUiLCJtYWtlQmluZGFibGUiLCJkaXJlY3Rpb24iLCJzdGF0ZSIsInhBeGlzIiwieUF4aXMiLCJsb2ciLCJtYXgiLCJjZWlsIiwiaG9yaXpvbnRhbCIsImFicyIsImZyYW1lcyIsInNldEZyYW1lcyIsIlNwcml0ZSIsIkJhY2tncm91bmQiLCJnbDJkIiwibGF5ZXIiLCJwYW5lcyIsInBhbmVzWFkiLCJtYXhQYW5lcyIsInN1cmZhY2VYIiwic3VyZmFjZVkiLCJ0aWxlV2lkdGgiLCJ0aWxlSGVpZ2h0IiwiZm9yY2VVcGRhdGUiLCJwYW5lIiwicGFuZVgiLCJwYW5lWSIsIlN1cmZhY2UiLCJ1bnNoaWZ0IiwicG9wIiwiY2VudGVyWCIsImNlbnRlclkiLCJyYW5nZSIsInJlbmRlclBhbmUiLCJpbWFnZVNyYyIsInoiLCJzY2FsZSIsImZyYW1lRGVsYXkiLCJjdXJyZW50RGVsYXkiLCJjdXJyZW50RnJhbWUiLCJjdXJyZW50RnJhbWVzIiwibW92aW5nIiwiUklHSFQiLCJET1dOIiwiTEVGVCIsIlVQIiwiRUFTVCIsIlNPVVRIIiwiV0VTVCIsIk5PUlRIIiwic3RhbmRpbmciLCJ3YWxraW5nIiwidmVydGV4QXR0cmliUG9pbnRlciIsInBvc2l0aW9uTG9jYXRpb24iLCJGTE9BVCIsInRleHR1cmUiLCJjcmVhdGVUZXh0dXJlIiwiYmluZFRleHR1cmUiLCJURVhUVVJFXzJEIiwiciIsInBhcnNlSW50IiwidGV4SW1hZ2UyRCIsIlJHQkEiLCJVTlNJR05FRF9CWVRFIiwiVWludDhBcnJheSIsInJlYWR5IiwidGhlbiIsInNoZWV0IiwiZnJhbWUiLCJnZXRGcmFtZSIsImxvYWRUZXh0dXJlIiwiaW1hZ2UiLCJlbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSIsInRleENvb3JkTG9jYXRpb24iLCJiaW5kQnVmZmVyIiwiQVJSQVlfQlVGRkVSIiwidGV4Q29vcmRCdWZmZXIiLCJidWZmZXJEYXRhIiwiRmxvYXQzMkFycmF5IiwiU1RSRUFNX0RSQVciLCJzZXRSZWN0YW5nbGUiLCJ1bmlmb3JtNGYiLCJjb2xvckxvY2F0aW9uIiwiZHJhd0FycmF5cyIsIlRSSUFOR0xFUyIsImZyYW1lU2VsZWN0b3IiLCJmcmFtZXNJZCIsImpvaW4iLCJnZXRGcmFtZXMiLCJQcm9taXNlIiwiYWxsIiwicG9zaXRpb25CdWZmZXIiLCJ4MSIsIngyIiwieTEiLCJ5MiIsInByb21pc2VzIiwibG9hZEltYWdlIiwidGV4UGFyYW1ldGVyaSIsIlRFWFRVUkVfV1JBUF9TIiwiQ0xBTVBfVE9fRURHRSIsIlRFWFRVUkVfV1JBUF9UIiwiVEVYVFVSRV9NSU5fRklMVEVSIiwiTkVBUkVTVCIsIlRFWFRVUkVfTUFHX0ZJTFRFUiIsInNyYyIsImFjY2VwdCIsInJlamVjdCIsIkltYWdlIiwibW91c2UiLCJjbGlja1giLCJjbGlja1kiLCJibGVuZEZ1bmMiLCJTUkNfQUxQSEEiLCJPTkVfTUlOVVNfU1JDX0FMUEhBIiwiZW5hYmxlIiwiQkxFTkQiLCJvdmVybGF5UHJvZ3JhbSIsImdldEF0dHJpYkxvY2F0aW9uIiwicmVzb2x1dGlvbkxvY2F0aW9uIiwiZ2V0VW5pZm9ybUxvY2F0aW9uIiwib3ZlcmxheVBvc2l0aW9uIiwib3ZlcmxheVJlc29sdXRpb24iLCJvdmVybGF5Q29sb3IiLCJjcmVhdGVCdWZmZXIiLCJTVEFUSUNfRFJBVyIsImNsaWVudFgiLCJjbGllbnRZIiwibG9jYWxZIiwic2VsZWN0aW5nIiwidGlsZVNpemUiLCJiYWNrZ3JvdW5kIiwiYmFja2dyb3VuZDEiLCJ3IiwiQXJyYXkiLCJmaWxsIiwiYmFycmVsIiwidHJ1bmMiLCJ1bmlmb3JtMmYiLCJzIiwic29ydCIsIm1pblgiLCJtYXhYIiwibWluWSIsIm1heFkiLCJtb2RTaXplIiwicm91bmQiLCJpbWFnZVVybCIsImJveGVzVXJsIiwidmVydGljZXMiLCJyZXF1ZXN0IiwiUmVxdWVzdCIsInNoZWV0TG9hZGVyIiwiZmV0Y2giLCJyZXNwb25zZSIsImpzb24iLCJib3hlcyIsImltYWdlTG9hZGVyIiwib25sb2FkIiwicHJvY2Vzc0ltYWdlIiwiY3JlYXRlRWxlbWVudCIsImRyYXdJbWFnZSIsImZyYW1lUHJvbWlzZXMiLCJzdWJDYW52YXMiLCJoIiwic3ViQ29udGV4dCIsInB1dEltYWdlRGF0YSIsImdldEltYWdlRGF0YSIsInRleHQiLCJmaWxsU3R5bGUiLCJjb2xvciIsImZvbnQiLCJ0ZXh0QWxpZ24iLCJmaWxsVGV4dCIsInRvQmxvYiIsImJsb2IiLCJmaWxlbmFtZSIsIlVSTCIsImNyZWF0ZU9iamVjdFVSTCIsImlzQXJyYXkiLCJnZXRGcmFtZXNCeVByZWZpeCIsInByZWZpeCIsInRleHR1cmVQcm9taXNlcyIsImltYWdlUHJvbWlzZXMiLCJ4U2l6ZSIsInlTaXplIiwieE9mZnNldCIsInlPZmZzZXQiLCJ0ZXhWZXJ0aWNlcyIsInN1YlRleHR1cmVzIiwibG9hZGVkIiwib2Zmc2V0WCIsIm9mZnNldFkiLCJnZXRUaWxlIiwicmVzb2x2ZSIsImFzc2VtYmxlIiwiZnJhbWVCdWZmZXIiLCJjcmVhdGVGcmFtZWJ1ZmZlciIsImF0dGFjaG1lbnRQb2ludCIsIkNPTE9SX0FUVEFDSE1FTlQwIiwiZnJhbWVidWZmZXJUZXh0dXJlMkQiLCJUZXh0dXJlQmFuayIsImRyYWdTdGFydCIsImRyYWdnaW5nIiwibW92ZVN0aWNrIiwiZHJvcFN0aWNrIiwicG9zIiwicHJldmVudERlZmF1bHQiLCJ0b3VjaGVzIiwieHgiLCJ5eSIsImxpbWl0IiwidGlsZXMiLCJzZWxlY3RlZEdyYXBoaWMiLCJtdWx0aVNlbGVjdCIsInNlbGVjdGlvbiIsInNlbGVjdGVkSW1hZ2UiLCJzZWxlY3RlZEltYWdlcyIsIkZsb29yIiwiTWFwIiwic3BsaXQiLCJzZWNvbmQiLCJKU09OIiwic3RyaW5naWZ5IiwiaW5wdXQiLCJwYXJzZSIsIldlYlNvY2tldCIsIk1veldlYlNvY2tldCIsImJyIiwiYnJ1bmNoIiwiYXIiLCJkaXNhYmxlZCIsIl9hciIsImNhY2hlQnVzdGVyIiwidXJsIiwiZGF0ZSIsIkRhdGUiLCJ0b1N0cmluZyIsInJlcGxhY2UiLCJpbmRleE9mIiwiYnJvd3NlciIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsInRvTG93ZXJDYXNlIiwiZm9yY2VSZXBhaW50IiwicmVsb2FkZXJzIiwicGFnZSIsInJlbG9hZCIsInN0eWxlc2hlZXQiLCJzbGljZSIsImNhbGwiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZmlsdGVyIiwibGluayIsInZhbCIsImdldEF0dHJpYnV0ZSIsImhyZWYiLCJmb3JFYWNoIiwic2V0VGltZW91dCIsIm9mZnNldEhlaWdodCIsImphdmFzY3JpcHQiLCJzY3JpcHRzIiwidGV4dFNjcmlwdHMiLCJzY3JpcHQiLCJzcmNTY3JpcHRzIiwib25Mb2FkIiwiZXZhbCIsInJlbW92ZSIsIm5ld1NjcmlwdCIsImFzeW5jIiwiaGVhZCIsImFwcGVuZENoaWxkIiwicG9ydCIsImhvc3QiLCJzZXJ2ZXIiLCJob3N0bmFtZSIsImNvbm5lY3QiLCJjb25uZWN0aW9uIiwib25tZXNzYWdlIiwibWVzc2FnZSIsImRhdGEiLCJyZWxvYWRlciIsIm9uZXJyb3IiLCJyZWFkeVN0YXRlIiwiY2xvc2UiLCJvbmNsb3NlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcjNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7O0lDOUthQSxNOzs7OztBQUFTO0FBRXRCQSxNQUFNLENBQUNDLEtBQVAsR0FBZSxPQUFmLEMsQ0FDQTs7Ozs7Ozs7Ozs7OztBQ0hBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBRWFDLEk7Ozs7O0FBRVosZ0JBQVlDLE9BQVosRUFDQTtBQUFBOztBQUFBOztBQUNDO0FBRUEsU0FBS0Msd0JBQVdDLE1BQVgsQ0FBa0I7QUFBQ0gsVUFBSTtBQUFMLEtBQWxCLENBQUw7QUFFQSxVQUFLQyxPQUFMLEdBQWlCQSxPQUFqQixDQUxELENBSzBCOztBQUN6QixVQUFLRyxPQUFMLEdBQWlCLE1BQUtILE9BQUwsQ0FBYUksVUFBYixDQUF3QixPQUF4QixDQUFqQjtBQUNBLFVBQUtDLFNBQUwsR0FBaUIsQ0FBakI7QUFQRDtBQVFDOzs7O1dBRUQsZ0JBQU9DLENBQVAsRUFBVUMsQ0FBVixFQUNBO0FBQ0NELE9BQUMsR0FBRyxDQUFDQSxDQUFDLElBQUcsS0FBS04sT0FBTCxDQUFhUSxLQUFsQixJQUE0QixLQUFLSCxTQUFyQztBQUNBRSxPQUFDLEdBQUcsQ0FBQ0EsQ0FBQyxJQUFHLEtBQUtQLE9BQUwsQ0FBYVMsTUFBbEIsSUFBNEIsS0FBS0osU0FBckM7QUFFQSxVQUFNSyxFQUFFLEdBQUcsS0FBS1AsT0FBaEI7QUFFQU8sUUFBRSxDQUFDQyxRQUFILENBQVksQ0FBWixFQUFlLENBQWYsRUFBa0JMLENBQWxCLEVBQXFCQyxDQUFyQjtBQUNBOzs7V0FFRCxnQkFDQTtBQUNDLFVBQU1HLEVBQUUsR0FBRyxLQUFLUCxPQUFoQjtBQUVBTyxRQUFFLENBQUNFLFVBQUgsQ0FBYyxLQUFLQyxPQUFuQjtBQUVBSCxRQUFFLENBQUNJLGVBQUgsQ0FBbUJKLEVBQUUsQ0FBQ0ssV0FBdEIsRUFBbUMsSUFBbkM7QUFDQUwsUUFBRSxDQUFDQyxRQUFILENBQVksQ0FBWixFQUFlLENBQWYsRUFBa0JELEVBQUUsQ0FBQ00sTUFBSCxDQUFVUixLQUE1QixFQUFtQ0UsRUFBRSxDQUFDTSxNQUFILENBQVVQLE1BQTdDO0FBQ0FDLFFBQUUsQ0FBQ08sVUFBSCxDQUFjLENBQWQsRUFBaUIsQ0FBakIsRUFBb0IsQ0FBcEIsRUFBdUIsQ0FBdkI7QUFDQVAsUUFBRSxDQUFDTyxVQUFILENBQWMsQ0FBZCxFQUFpQixDQUFqQixFQUFvQixDQUFwQixFQUF1QixDQUF2QjtBQUNBUCxRQUFFLENBQUNRLEtBQUgsQ0FBU1IsRUFBRSxDQUFDUyxnQkFBWjtBQUNBOzs7V0FFRCxtQkFDQTtBQUNDLFdBQUtoQixPQUFMLENBQWFpQixhQUFiLENBQTJCLEtBQUtQLE9BQWhDO0FBQ0E7OztXQUVELHNCQUFhUSxRQUFiLEVBQ0E7QUFDQyxVQUFNQyxTQUFTLEdBQUdELFFBQVEsQ0FBQ0UsU0FBVCxDQUFtQkYsUUFBUSxDQUFDRyxXQUFULENBQXFCLEdBQXJCLElBQTBCLENBQTdDLENBQWxCO0FBQ0EsVUFBTUMsSUFBSSxHQUFHLElBQWI7O0FBRUEsY0FBT0gsU0FBUyxDQUFDSSxXQUFWLEVBQVA7QUFFQyxhQUFLLE1BQUw7QUFDQ0QsY0FBSSxHQUFHLEtBQUt0QixPQUFMLENBQWF3QixhQUFwQjtBQUNBOztBQUNELGFBQUssTUFBTDtBQUNDRixjQUFJLEdBQUcsS0FBS3RCLE9BQUwsQ0FBYXlCLGVBQXBCO0FBQ0E7QUFQRjs7QUFVQSxVQUFNQyxNQUFNLEdBQUcsS0FBSzFCLE9BQUwsQ0FBYTJCLFlBQWIsQ0FBMEJMLElBQTFCLENBQWY7O0FBQ0EsVUFBTU0sTUFBTSxHQUFHQyxPQUFPLENBQUNYLFFBQUQsQ0FBdEI7O0FBRUEsV0FBS2xCLE9BQUwsQ0FBYThCLFlBQWIsQ0FBMEJKLE1BQTFCLEVBQWtDRSxNQUFsQztBQUNBLFdBQUs1QixPQUFMLENBQWErQixhQUFiLENBQTJCTCxNQUEzQjtBQUVBLFVBQU1NLE9BQU8sR0FBRyxLQUFLaEMsT0FBTCxDQUFhaUMsa0JBQWIsQ0FDZlAsTUFEZSxFQUViLEtBQUsxQixPQUFMLENBQWFrQyxjQUZBLENBQWhCOztBQUtBLFVBQUdGLE9BQUgsRUFDQTtBQUNDLGVBQU9OLE1BQVA7QUFDQTs7QUFFRFMsYUFBTyxDQUFDQyxLQUFSLENBQWMsS0FBS3BDLE9BQUwsQ0FBYXFDLGdCQUFiLENBQThCWCxNQUE5QixDQUFkO0FBRUEsV0FBSzFCLE9BQUwsQ0FBYXNDLFlBQWIsQ0FBMEJaLE1BQTFCO0FBQ0E7OztXQUVELHVCQUFjYSxZQUFkLEVBQTRCQyxjQUE1QixFQUNBO0FBQ0MsVUFBTTlCLE9BQU8sR0FBRyxLQUFLVixPQUFMLENBQWF5QyxhQUFiLEVBQWhCO0FBRUEsV0FBS3pDLE9BQUwsQ0FBYTBDLFlBQWIsQ0FBMEJoQyxPQUExQixFQUFtQzZCLFlBQW5DO0FBQ0EsV0FBS3ZDLE9BQUwsQ0FBYTBDLFlBQWIsQ0FBMEJoQyxPQUExQixFQUFtQzhCLGNBQW5DO0FBRUEsV0FBS3hDLE9BQUwsQ0FBYTJDLFdBQWIsQ0FBeUJqQyxPQUF6QjtBQUVBLFdBQUtWLE9BQUwsQ0FBYTRDLFlBQWIsQ0FBMEJsQyxPQUExQixFQUFtQzZCLFlBQW5DO0FBQ0EsV0FBS3ZDLE9BQUwsQ0FBYTRDLFlBQWIsQ0FBMEJsQyxPQUExQixFQUFtQzhCLGNBQW5DO0FBQ0EsV0FBS3hDLE9BQUwsQ0FBYXNDLFlBQWIsQ0FBMEJDLFlBQTFCO0FBQ0EsV0FBS3ZDLE9BQUwsQ0FBYXNDLFlBQWIsQ0FBMEJFLGNBQTFCOztBQUVBLFVBQUcsS0FBS3hDLE9BQUwsQ0FBYTZDLG1CQUFiLENBQWlDbkMsT0FBakMsRUFBMEMsS0FBS1YsT0FBTCxDQUFhOEMsV0FBdkQsQ0FBSCxFQUNBO0FBQ0MsZUFBT3BDLE9BQVA7QUFDQTs7QUFFRHlCLGFBQU8sQ0FBQ0MsS0FBUixDQUFjLEtBQUtwQyxPQUFMLENBQWErQyxpQkFBYixDQUErQnJDLE9BQS9CLENBQWQ7QUFFQSxXQUFLVixPQUFMLENBQWFpQixhQUFiLENBQTJCUCxPQUEzQjtBQUVBLGFBQU9BLE9BQVA7QUFDQTs7OztFQXJHd0JaLHVCOzs7Ozs7Ozs7Ozs7Ozs7QUNIMUI7O0FBQ0E7O0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBRUE7O0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSxJQUFNa0QsV0FBVyxHQUFHLEVBQXBCO0FBRUFBLFdBQVcsQ0FBQ0MsY0FBWixHQUE2QixJQUFJQyxzQkFBSixFQUE3QjtBQUNBRixXQUFXLENBQUNHLFFBQVosR0FBdUJDLG1CQUFTQyxHQUFULEVBQXZCOztJQUVhQyxJOzs7OztBQUVaLGdCQUFZQyxJQUFaLEVBQ0E7QUFBQTs7QUFBQTs7QUFDQyw4QkFBTUEsSUFBTjtBQUNBLFVBQUtDLFFBQUwsR0FBaUIzQixPQUFPLENBQUMsWUFBRCxDQUF4QjtBQUNBLFVBQUs0QixNQUFMLEdBQWlCLEVBQWpCO0FBRUEsVUFBS0MsUUFBTCxHQUFpQixJQUFJQyxRQUFKLEVBQWpCO0FBQ0EsVUFBS1IsUUFBTCxHQUFpQkgsV0FBVyxDQUFDRyxRQUE3QjtBQUNBLFVBQUtTLEtBQUwsR0FBaUIsRUFBakI7QUFDQSxVQUFLQyxRQUFMLEdBQWlCLE1BQUtELEtBQXRCO0FBRUEsVUFBS0wsSUFBTCxDQUFVTyxVQUFWLEdBQXVCZCxXQUFXLENBQUNDLGNBQW5DO0FBRUEsVUFBS00sSUFBTCxDQUFVUSxHQUFWLEdBQWlCLENBQWpCO0FBQ0EsVUFBS1IsSUFBTCxDQUFVUyxHQUFWLEdBQWlCLENBQWpCO0FBRUEsVUFBS1QsSUFBTCxDQUFVVSxJQUFWLEdBQWlCLENBQWpCO0FBQ0EsVUFBS1YsSUFBTCxDQUFVVyxJQUFWLEdBQWlCLENBQWpCO0FBRUEsVUFBS1gsSUFBTCxDQUFVWSxTQUFWLEdBQTJCLEVBQTNCO0FBQ0EsVUFBS1osSUFBTCxDQUFVYSxjQUFWLEdBQTJCLEVBQTNCO0FBRUEsVUFBS2IsSUFBTCxDQUFVYyxVQUFWLEdBQXVCLEtBQXZCO0FBRUEsVUFBS2xCLFFBQUwsQ0FBY21CLFNBQWQsR0FBMEIsSUFBMUI7O0FBRUEsVUFBS25CLFFBQUwsQ0FBY29CLElBQWQsQ0FBbUJDLE1BQW5CLENBQTBCLEdBQTFCLEVBQStCLFVBQUNDLENBQUQsRUFBR0MsQ0FBSCxFQUFLQyxDQUFMLEVBQU9DLENBQVAsRUFBVztBQUN6QyxVQUFHSCxDQUFDLEdBQUcsQ0FBUCxFQUNBO0FBQ0MsY0FBS0ksR0FBTDtBQUNBO0FBQ0QsS0FMRDs7QUFPQSxVQUFLMUIsUUFBTCxDQUFjb0IsSUFBZCxDQUFtQkMsTUFBbkIsQ0FBMEIsUUFBMUIsRUFBb0MsVUFBQ0MsQ0FBRCxFQUFHQyxDQUFILEVBQUtDLENBQUwsRUFBT0MsQ0FBUCxFQUFXO0FBQzlDLFVBQUdILENBQUMsS0FBSyxDQUFDLENBQVYsRUFDQTtBQUNDLGNBQUtLLFdBQUwsQ0FBaUJDLFFBQWpCO0FBQ0E7QUFDRCxLQUxEOztBQU9BLFVBQUs1QixRQUFMLENBQWNvQixJQUFkLENBQW1CQyxNQUFuQixDQUEwQixNQUExQixFQUFrQyxVQUFDQyxDQUFELEVBQUdDLENBQUgsRUFBS0MsQ0FBTCxFQUFPQyxDQUFQLEVBQVc7QUFDNUMsVUFBR0gsQ0FBQyxHQUFHLENBQVAsRUFDQTtBQUNDLGNBQUtsQixJQUFMLENBQVVZLFNBQVY7QUFDQTtBQUNELEtBTEQ7O0FBT0EsVUFBS2hCLFFBQUwsQ0FBY29CLElBQWQsQ0FBbUJDLE1BQW5CLENBQTBCLEtBQTFCLEVBQWlDLFVBQUNDLENBQUQsRUFBR0MsQ0FBSCxFQUFLQyxDQUFMLEVBQU9DLENBQVAsRUFBVztBQUMzQyxVQUFHSCxDQUFDLEdBQUcsQ0FBUCxFQUNBO0FBQ0MsY0FBS2xCLElBQUwsQ0FBVVksU0FBVjs7QUFFQSxZQUFHLE1BQUtaLElBQUwsQ0FBVVksU0FBVixHQUFzQixDQUF6QixFQUNBO0FBQ0MsZ0JBQUtaLElBQUwsQ0FBVVksU0FBVixHQUFzQixDQUF0QjtBQUNBO0FBQ0Q7QUFDRCxLQVZEOztBQVlBLFVBQUtoQixRQUFMLENBQWNvQixJQUFkLENBQW1CQyxNQUFuQixDQUEwQixRQUExQixFQUFvQyxVQUFDQyxDQUFELEVBQUdDLENBQUgsRUFBS0MsQ0FBTCxFQUFPQyxDQUFQLEVBQVc7QUFDOUMsVUFBR0gsQ0FBQyxHQUFHLENBQVAsRUFDQTtBQUNDLGNBQUtsQixJQUFMLENBQVVhLGNBQVY7QUFDQTtBQUNELEtBTEQ7O0FBT0EsVUFBS2pCLFFBQUwsQ0FBY29CLElBQWQsQ0FBbUJDLE1BQW5CLENBQTBCLFVBQTFCLEVBQXNDLFVBQUNDLENBQUQsRUFBR0MsQ0FBSCxFQUFLQyxDQUFMLEVBQU9DLENBQVAsRUFBVztBQUNoRCxVQUFHSCxDQUFDLEdBQUcsQ0FBUCxFQUNBO0FBQ0MsY0FBS2xCLElBQUwsQ0FBVWEsY0FBVjs7QUFFQSxZQUFHLE1BQUtiLElBQUwsQ0FBVWEsY0FBVixHQUEyQixDQUE5QixFQUNBO0FBQ0MsZ0JBQUtiLElBQUwsQ0FBVWEsY0FBVixHQUEyQixDQUEzQjtBQUNBO0FBQ0Q7QUFDRCxLQVZEOztBQVlBLFVBQUtZLFdBQUwsR0FBbUIsSUFBSUMsd0JBQUosRUFBbkI7QUFDQSxVQUFLSixHQUFMLEdBQW1CLElBQUlLLFFBQUosRUFBbkI7O0FBRUEsVUFBS0wsR0FBTDs7QUFFQSxVQUFLdEIsSUFBTCxDQUFVNEIsU0FBVixHQUF1QixJQUFJQyxvQkFBSixDQUFjO0FBQ3BDSixpQkFBVyxFQUFFLE1BQUtBLFdBRGtCO0FBRWxDSCxTQUFHLEVBQVEsTUFBS0E7QUFGa0IsS0FBZCxDQUF2QjtBQWxGRDtBQXNGQzs7OztXQUVELHNCQUNBO0FBQUE7O0FBQ0MsV0FBS0MsV0FBTCxHQUFtQixJQUFJTyx3QkFBSixDQUNsQixLQUFLQyxJQUFMLENBQVV6RSxNQUFWLENBQWlCaEIsT0FEQyxFQUVoQixLQUFLZ0YsR0FGVyxDQUFuQjtBQUtBLFVBQU1VLE1BQU0sR0FBRyxJQUFJQyxjQUFKLEVBQWY7QUFDQSxXQUFLOUIsUUFBTCxDQUFjK0IsR0FBZCxDQUFrQkYsTUFBbEI7QUFDQSxXQUFLVCxXQUFMLENBQWlCWSxPQUFqQixDQUF5QkQsR0FBekIsQ0FBNkJGLE1BQU0sQ0FBQ0ksTUFBcEM7QUFFQSxXQUFLeEMsUUFBTCxDQUFjb0IsSUFBZCxDQUFtQkMsTUFBbkIsQ0FBMEIsR0FBMUIsRUFBK0IsVUFBQ0MsQ0FBRCxFQUFHQyxDQUFILEVBQUtDLENBQUwsRUFBT0MsQ0FBUCxFQUFXO0FBQ3pDLFlBQUdILENBQUMsR0FBRyxDQUFQLEVBQ0E7QUFDQyxnQkFBSSxDQUFDbUIsSUFBTCxDQUFVLENBQVY7QUFDQTtBQUNELE9BTEQ7QUFPQSxXQUFLekMsUUFBTCxDQUFjb0IsSUFBZCxDQUFtQkMsTUFBbkIsQ0FBMEIsR0FBMUIsRUFBK0IsVUFBQ0MsQ0FBRCxFQUFHQyxDQUFILEVBQUtDLENBQUwsRUFBT0MsQ0FBUCxFQUFXO0FBQ3pDLFlBQUdILENBQUMsR0FBRyxDQUFQLEVBQ0E7QUFDQyxnQkFBSSxDQUFDbUIsSUFBTCxDQUFVLENBQVY7QUFDQTtBQUNELE9BTEQ7QUFPQSxXQUFLekMsUUFBTCxDQUFjb0IsSUFBZCxDQUFtQkMsTUFBbkIsQ0FBMEIsR0FBMUIsRUFBK0IsVUFBQ0MsQ0FBRCxFQUFHQyxDQUFILEVBQUtDLENBQUwsRUFBT0MsQ0FBUCxFQUFXO0FBQ3pDLFlBQUdILENBQUMsR0FBRyxDQUFQLEVBQ0E7QUFDQyxnQkFBSSxDQUFDbUIsSUFBTCxDQUFVLENBQUMsQ0FBWDtBQUNBO0FBQ0QsT0FMRDtBQU9BLFdBQUtyQyxJQUFMLENBQVU0QixTQUFWLENBQW9CNUIsSUFBcEIsQ0FBeUJpQixNQUF6QixDQUFnQyxpQkFBaEMsRUFBbUQsVUFBQ0MsQ0FBRCxFQUFLO0FBQ3ZELFlBQUcsQ0FBQ0EsQ0FBRCxJQUFNLE1BQUksQ0FBQ0ssV0FBTCxDQUFpQmUsUUFBakIsQ0FBMEJDLE9BQTFCLElBQXFDLElBQTlDLEVBQ0E7QUFDQztBQUNBOztBQUVELGNBQUksQ0FBQ3ZDLElBQUwsQ0FBVWMsVUFBVixHQUF1QixLQUF2QjtBQUVBLFlBQUkwQixDQUFDLEdBQUksTUFBSSxDQUFDakIsV0FBTCxDQUFpQmUsUUFBakIsQ0FBMEJHLFlBQW5DO0FBQ0EsWUFBSUMsRUFBRSxHQUFHLE1BQUksQ0FBQ25CLFdBQUwsQ0FBaUJlLFFBQWpCLENBQTBCQyxPQUFuQzs7QUFFQSxZQUFHRyxFQUFFLEdBQUdGLENBQVIsRUFDQTtBQUFBLHFCQUNXLENBQUNBLENBQUQsRUFBSUUsRUFBSixDQURYO0FBQ0VBLFlBREY7QUFDTUYsV0FETjtBQUVDOztBQUVELGVBQU1BLENBQUMsSUFBR0UsRUFBVixFQUFjRixDQUFDLEVBQWYsRUFDQTtBQUNDLGNBQUlHLENBQUMsR0FBSSxNQUFJLENBQUNwQixXQUFMLENBQWlCZSxRQUFqQixDQUEwQk0sWUFBbkM7QUFDQSxjQUFJQyxFQUFFLEdBQUcsTUFBSSxDQUFDdEIsV0FBTCxDQUFpQmUsUUFBakIsQ0FBMEJRLE9BQW5DOztBQUNBLGNBQUdELEVBQUUsR0FBR0YsQ0FBUixFQUNBO0FBQUEsd0JBQ1csQ0FBQ0EsQ0FBRCxFQUFJRSxFQUFKLENBRFg7QUFDRUEsY0FERjtBQUNNRixhQUROO0FBRUM7O0FBQ0QsaUJBQU1BLENBQUMsSUFBSUUsRUFBWCxFQUFlRixDQUFDLEVBQWhCLEVBQ0E7QUFDQyxrQkFBSSxDQUFDckIsR0FBTCxDQUFTeUIsT0FBVCxDQUFpQlAsQ0FBakIsRUFBb0JHLENBQXBCLEVBQXVCekIsQ0FBdkI7QUFDQTtBQUNEOztBQUVELGNBQUksQ0FBQ0ksR0FBTCxDQUFTeUIsT0FBVCxDQUNDLE1BQUksQ0FBQ3hCLFdBQUwsQ0FBaUJlLFFBQWpCLENBQTBCQyxPQUQzQixFQUVHLE1BQUksQ0FBQ2hCLFdBQUwsQ0FBaUJlLFFBQWpCLENBQTBCUSxPQUY3QixFQUdHNUIsQ0FISDs7QUFNQSxjQUFJLENBQUNLLFdBQUwsQ0FBaUJ5QixNQUFqQjs7QUFDQSxjQUFJLENBQUN6QixXQUFMLENBQWlCQyxRQUFqQjtBQUNBLE9BdENEO0FBd0NBLFdBQUtELFdBQUwsQ0FBaUJlLFFBQWpCLENBQTBCckIsTUFBMUIsQ0FBaUMsVUFBQ0MsQ0FBRCxFQUFHQyxDQUFILEVBQUtDLENBQUwsRUFBT0MsQ0FBUCxFQUFTNEIsQ0FBVCxFQUFhO0FBQzdDLFlBQUcsTUFBSSxDQUFDMUIsV0FBTCxDQUFpQmUsUUFBakIsQ0FBMEJZLE1BQTFCLElBQW9DLElBQXZDLEVBQ0E7QUFDQyxnQkFBSSxDQUFDbEQsSUFBTCxDQUFVYyxVQUFWLEdBQXVCLEtBQXZCO0FBQ0E7QUFDQTs7QUFFRCxjQUFJLENBQUNkLElBQUwsQ0FBVTRCLFNBQVYsQ0FBb0J1QixNQUFwQixDQUEyQixNQUFJLENBQUM1QixXQUFMLENBQWlCZSxRQUE1Qzs7QUFFQSxjQUFJLENBQUN0QyxJQUFMLENBQVVjLFVBQVYsR0FBdUIsSUFBdkI7O0FBRUEsY0FBSSxDQUFDUyxXQUFMLENBQWlCeUIsTUFBakI7QUFDQSxPQVpELEVBWUU7QUFBQ0ksWUFBSSxFQUFDO0FBQU4sT0FaRjtBQWNBLFdBQUtwRCxJQUFMLENBQVVjLFVBQVYsR0FBdUIsSUFBdkIsQ0FyRkQsQ0F1RkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFFQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTs7QUFFQXVDLFlBQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsUUFBeEIsRUFBa0MsWUFBTTtBQUN2QyxjQUFJLENBQUNOLE1BQUw7O0FBQ0FPLGNBQU07QUFDTixPQUhEO0FBS0EsVUFBSUMsS0FBSyxHQUFHLENBQVo7QUFDQSxVQUFJQyxLQUFLLEdBQUcsQ0FBWjtBQUVBLFVBQUlDLFFBQVEsR0FBRyxFQUFmO0FBQ0EsVUFBSUMsUUFBUSxHQUFHLEVBQWY7QUFFQSxVQUFJQyxVQUFVLEdBQUcsQ0FBakI7O0FBRUEsVUFBTUMsUUFBUSxHQUFHLFNBQVhBLFFBQVcsQ0FBQ0MsR0FBRCxFQUFTO0FBQ3pCQSxXQUFHLEdBQUdBLEdBQUcsR0FBRyxJQUFaO0FBRUEsWUFBTUMsS0FBSyxHQUFHRCxHQUFHLEdBQUdMLEtBQXBCOztBQUVBLFlBQUcsTUFBSSxDQUFDekQsSUFBTCxDQUFVYSxjQUFWLElBQTRCLENBQS9CLEVBQ0E7QUFDQzhDLGtCQUFRLEdBQUcsQ0FBQyxDQUFELENBQVg7QUFDQTtBQUNBOztBQUVELFlBQUdJLEtBQUssR0FBRyxLQUFHLE1BQUksQ0FBQy9ELElBQUwsQ0FBVWEsY0FBVixHQUEwQixNQUFNLE1BQUksQ0FBQ2IsSUFBTCxDQUFVYSxjQUFWLEdBQXlCLEVBQS9CLENBQTdCLENBQVgsRUFDQTtBQUNDO0FBQ0E7O0FBRUQ0QyxhQUFLLEdBQUdLLEdBQVI7O0FBRUEsY0FBSSxDQUFDbEUsUUFBTCxDQUFjMkQsTUFBZDs7QUFFQVMsY0FBTSxDQUFDQyxNQUFQLENBQWMsTUFBSSxDQUFDOUQsUUFBTCxDQUFjK0QsS0FBZCxFQUFkLEVBQXFDNUMsR0FBckMsQ0FBeUMsVUFBQzZDLENBQUQsRUFBSztBQUM3Q0EsV0FBQyxDQUFDTixRQUFGO0FBQ0EsU0FGRCxFQXBCeUIsQ0F3QnpCO0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsY0FBSSxDQUFDN0QsSUFBTCxDQUFVb0UsSUFBVixHQUFrQixJQUFJTCxLQUF0QjtBQUVBSixnQkFBUSxDQUFDVSxJQUFULENBQWMsTUFBSSxDQUFDckUsSUFBTCxDQUFVb0UsSUFBeEI7O0FBRUEsZUFBTVQsUUFBUSxDQUFDVyxNQUFULEdBQWtCVixVQUF4QixFQUNBO0FBQ0NELGtCQUFRLENBQUNZLEtBQVQ7QUFDQSxTQXRDd0IsQ0F3Q3pCOztBQUNBLE9BekNEOztBQTJDQSxVQUFNaEIsTUFBTSxHQUFHLFNBQVRBLE1BQVMsQ0FBQ08sR0FBRCxFQUFRO0FBQ3RCQSxXQUFHLEdBQUdBLEdBQUcsR0FBRyxJQUFaO0FBRUEsWUFBTUMsS0FBSyxHQUFHRCxHQUFHLEdBQUdOLEtBQXBCOztBQUVBLFlBQUdPLEtBQUssR0FBRyxLQUFHLE1BQUksQ0FBQy9ELElBQUwsQ0FBVVksU0FBVixHQUFxQixNQUFNLE1BQUksQ0FBQ1osSUFBTCxDQUFVWSxTQUFWLEdBQW9CLEVBQTFCLENBQXhCLENBQVgsRUFDQTtBQUNDeUMsZ0JBQU0sQ0FBQ21CLHFCQUFQLENBQTZCakIsTUFBN0I7QUFDQTtBQUNBOztBQUVEQyxhQUFLLEdBQUdNLEdBQVI7O0FBRUEsWUFBRyxNQUFJLENBQUM5RCxJQUFMLENBQVVZLFNBQVYsSUFBdUIsQ0FBMUIsRUFDQTtBQUNDeUMsZ0JBQU0sQ0FBQ21CLHFCQUFQLENBQTZCakIsTUFBN0I7QUFDQUcsa0JBQVEsR0FBRyxDQUFDLENBQUQsQ0FBWDtBQUNBO0FBQ0E7O0FBR0QsY0FBSSxDQUFDbkMsV0FBTCxDQUFpQmtELElBQWpCOztBQUVBcEIsY0FBTSxDQUFDbUIscUJBQVAsQ0FBNkJqQixNQUE3QjtBQUVBRyxnQkFBUSxDQUFDVyxJQUFULENBQWMsTUFBSSxDQUFDckUsSUFBTCxDQUFVMEUsSUFBeEI7O0FBRUEsZUFBTWhCLFFBQVEsQ0FBQ1ksTUFBVCxHQUFrQlYsVUFBeEIsRUFDQTtBQUNDRixrQkFBUSxDQUFDYSxLQUFUO0FBQ0E7O0FBRUQsY0FBSSxDQUFDdkUsSUFBTCxDQUFVMEUsSUFBVixHQUFrQixJQUFJWCxLQUF0QjtBQUVBLGNBQUksQ0FBQy9ELElBQUwsQ0FBVVUsSUFBVixHQUFpQixNQUFJLENBQUNhLFdBQUwsQ0FBaUJvRCxNQUFqQixDQUF3Qi9ILENBQXpDO0FBQ0EsY0FBSSxDQUFDb0QsSUFBTCxDQUFVVyxJQUFWLEdBQWlCLE1BQUksQ0FBQ1ksV0FBTCxDQUFpQm9ELE1BQWpCLENBQXdCOUgsQ0FBekM7QUFDQSxPQXBDRDs7QUFzQ0EsV0FBS21HLE1BQUw7QUFFQTRCLGlCQUFXLENBQUMsWUFBSTtBQUNmZixnQkFBUSxDQUFDZ0IsV0FBVyxDQUFDZixHQUFaLEVBQUQsQ0FBUjtBQUNBLE9BRlUsRUFFUixDQUZRLENBQVg7QUFJQWMsaUJBQVcsQ0FBQyxZQUFJO0FBQ2YsWUFBTXBFLEdBQUcsR0FBR2tELFFBQVEsQ0FBQ29CLE1BQVQsQ0FBZ0IsVUFBQ0MsQ0FBRCxFQUFHQyxDQUFIO0FBQUEsaUJBQU9ELENBQUMsR0FBQ0MsQ0FBVDtBQUFBLFNBQWhCLEVBQTRCLENBQTVCLElBQWlDdEIsUUFBUSxDQUFDWSxNQUF0RDtBQUNBLGNBQUksQ0FBQ3RFLElBQUwsQ0FBVVEsR0FBVixHQUFnQkEsR0FBRyxDQUFDeUUsT0FBSixDQUFZLENBQVosRUFBZUMsUUFBZixDQUF3QixDQUF4QixFQUEyQixHQUEzQixDQUFoQjtBQUNBLE9BSFUsRUFHUixHQUhRLENBQVg7QUFLQU4saUJBQVcsQ0FBQyxZQUFJO0FBQ2ZPLGdCQUFRLENBQUMvSSxLQUFULGFBQW9CRCxlQUFPQyxLQUEzQixjQUFvQyxNQUFJLENBQUM0RCxJQUFMLENBQVVRLEdBQTlDO0FBQ0EsT0FGVSxFQUVSLE1BQUksQ0FGSSxDQUFYO0FBSUFvRSxpQkFBVyxDQUFDLFlBQUk7QUFDZixZQUFNbkUsR0FBRyxHQUFHa0QsUUFBUSxDQUFDbUIsTUFBVCxDQUFnQixVQUFDQyxDQUFELEVBQUdDLENBQUg7QUFBQSxpQkFBT0QsQ0FBQyxHQUFDQyxDQUFUO0FBQUEsU0FBaEIsRUFBNEIsQ0FBNUIsSUFBaUNyQixRQUFRLENBQUNXLE1BQXREO0FBQ0EsY0FBSSxDQUFDdEUsSUFBTCxDQUFVUyxHQUFWLEdBQWdCQSxHQUFHLENBQUN3RSxPQUFKLENBQVksQ0FBWixFQUFlQyxRQUFmLENBQXdCLENBQXhCLEVBQTJCLEdBQTNCLENBQWhCO0FBQ0EsT0FIVSxFQUdSLE1BQUksQ0FISSxDQUFYO0FBS0E3QixZQUFNLENBQUNtQixxQkFBUCxDQUE2QmpCLE1BQTdCO0FBQ0E7OztXQUVELGdCQUFPM0csQ0FBUCxFQUFVQyxDQUFWLEVBQ0E7QUFDQyxXQUFLbUQsSUFBTCxDQUFVbEQsS0FBVixHQUFtQixLQUFLaUYsSUFBTCxDQUFVekUsTUFBVixDQUFpQmhCLE9BQWpCLENBQXlCUSxLQUF6QixHQUFtQ0YsQ0FBQyxJQUFJdUksUUFBUSxDQUFDQyxJQUFULENBQWNDLFdBQXpFO0FBQ0EsV0FBS3JGLElBQUwsQ0FBVWpELE1BQVYsR0FBbUIsS0FBS2dGLElBQUwsQ0FBVXpFLE1BQVYsQ0FBaUJoQixPQUFqQixDQUF5QlMsTUFBekIsR0FBbUNGLENBQUMsSUFBSXNJLFFBQVEsQ0FBQ0MsSUFBVCxDQUFjRSxZQUF6RTtBQUVBLFdBQUt0RixJQUFMLENBQVV1RixNQUFWLEdBQW9CQyxJQUFJLENBQUNDLEtBQUwsQ0FDbkIsQ0FBQzdJLENBQUMsSUFBSXVJLFFBQVEsQ0FBQ0MsSUFBVCxDQUFjQyxXQUFwQixJQUFvQyxLQUFLOUQsV0FBTCxDQUFpQjVFLFNBRGxDLENBQXBCO0FBSUEsV0FBS3FELElBQUwsQ0FBVTBGLE9BQVYsR0FBb0JGLElBQUksQ0FBQ0MsS0FBTCxDQUNuQixDQUFDNUksQ0FBQyxJQUFJc0ksUUFBUSxDQUFDQyxJQUFULENBQWNFLFlBQXBCLElBQW9DLEtBQUsvRCxXQUFMLENBQWlCNUUsU0FEbEMsQ0FBcEI7QUFJQSxXQUFLNEUsV0FBTCxDQUFpQnlCLE1BQWpCO0FBQ0E7OztXQUVELGdCQUFPMkMsS0FBUCxFQUNBO0FBQ0MsVUFBSTVCLEtBQUssR0FBRzRCLEtBQUssQ0FBQ0MsTUFBTixHQUFlLENBQWYsR0FBbUIsQ0FBQyxDQUFwQixHQUNYRCxLQUFLLENBQUNDLE1BQU4sR0FBZSxDQUFmLEdBQW1CLENBQW5CLEdBQXVCLENBRHhCO0FBSUEsV0FBS3ZELElBQUwsQ0FBVTBCLEtBQVY7QUFDQTs7O1dBRUQsY0FBS0EsS0FBTCxFQUNBO0FBQ0MsVUFBSThCLEdBQUcsR0FBSyxJQUFaO0FBQ0EsVUFBSUMsSUFBSSxHQUFJLElBQVo7O0FBRUEsVUFBRy9CLEtBQUssR0FBRyxDQUFSLElBQWFBLEtBQUssR0FBRyxDQUFSLElBQWEsS0FBS3hDLFdBQUwsQ0FBaUI1RSxTQUFqQixHQUE2QmtKLEdBQTFELEVBQ0E7QUFDQyxhQUFLdEUsV0FBTCxDQUFpQjVFLFNBQWpCLElBQStCb0gsS0FBSyxHQUFHK0IsSUFBdkM7QUFDQSxhQUFLOUMsTUFBTDtBQUNBLE9BSkQsTUFNQTtBQUNDLGFBQUt6QixXQUFMLENBQWlCNUUsU0FBakIsR0FBNkJrSixHQUE3QjtBQUNBLGFBQUs3QyxNQUFMO0FBQ0E7QUFDRDs7OztFQXJZd0IrQyxVOzs7OztDQ3RCMUI7QUFBQTtBQUFBO0FBQUE7Ozs7QUNBQTs7QUFDQTs7QUFFQSxJQUFHQyxLQUFLLEtBQUtDLFNBQWIsRUFDQTtBQUNDZCxVQUFRLENBQUM3QixnQkFBVCxDQUEwQixrQkFBMUIsRUFBOEMsWUFBTTtBQUNuRCxRQUFNNEMsSUFBSSxHQUFHLElBQUluRyxVQUFKLEVBQWI7O0FBRUFvRyxtQkFBT0MsTUFBUCxDQUFjRixJQUFkOztBQUVBQSxRQUFJLENBQUNHLE1BQUwsQ0FBWWxCLFFBQVEsQ0FBQ0MsSUFBckI7QUFDQSxHQU5EO0FBT0EsQ0FURCxNQVdBLENBQ0M7QUFDQTs7Ozs7Ozs7Ozs7OztBQ2hCRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVha0IsUzs7Ozs7Ozs7Ozs7OztXQUVaLGdCQUFPQyxVQUFQLEVBQ0E7QUFDQyxhQUFPLElBQUksS0FBS0MsV0FBVCxDQUFxQnhDLE1BQU0sQ0FBQ3lDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCLElBQWxCLEVBQXdCRixVQUF4QixDQUFyQixDQUFQO0FBQ0E7Ozs7RUFMNkJoSyx1Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNGL0IsSUFBSW1LLE9BQU8sR0FBRyxFQUFkO0FBQ0EsSUFBSUMsT0FBTyxHQUFHLEVBQWQ7O0lBRWFwSyxVO0FBRVosd0JBQ0E7QUFBQTs7QUFDQyxRQUFJZ0ssVUFBVSxHQUFHLEtBQUtDLFdBQUwsQ0FBaUJELFVBQWpCLEVBQWpCO0FBQ0EsUUFBSTlKLE9BQU8sR0FBTSxLQUFLK0osV0FBTCxDQUFpQi9KLE9BQWpCLEVBQWpCOztBQUVBLFFBQUcsQ0FBQ2lLLE9BQU8sQ0FBQ2pLLE9BQUQsQ0FBWCxFQUNBO0FBQ0NpSyxhQUFPLENBQUNqSyxPQUFELENBQVAsR0FBbUIsRUFBbkI7QUFDQTs7QUFFRCxRQUFHLENBQUNrSyxPQUFPLENBQUNsSyxPQUFELENBQVgsRUFDQTtBQUNDa0ssYUFBTyxDQUFDbEssT0FBRCxDQUFQLEdBQW1CLEVBQW5CO0FBQ0E7O0FBRUQsU0FBSSxJQUFJbUssSUFBUixJQUFnQkwsVUFBaEIsRUFDQTtBQUNDLFVBQUlNLFNBQVMsR0FBR04sVUFBVSxDQUFDSyxJQUFELENBQTFCOztBQUVBLFVBQUdGLE9BQU8sQ0FBQ2pLLE9BQUQsQ0FBUCxDQUFpQm1LLElBQWpCLEtBQTBCLENBQUNDLFNBQVMsQ0FBQ0MsU0FBeEMsRUFDQTtBQUNDO0FBQ0E7O0FBRUQsVUFBRyxRQUFRQyxJQUFSLENBQWFDLE1BQU0sQ0FBQ0osSUFBRCxDQUFOLENBQWEsQ0FBYixDQUFiLENBQUgsRUFDQTtBQUNDRixlQUFPLENBQUNqSyxPQUFELENBQVAsQ0FBaUJtSyxJQUFqQixJQUF5QkMsU0FBekI7QUFDQTtBQUVEOztBQUVELFNBQUksSUFBSUQsS0FBUixJQUFnQkwsVUFBaEIsRUFDQTtBQUNDLFVBQUlVLFFBQVEsR0FBSWhCLFNBQWhCOztBQUNBLFVBQUlZLFVBQVMsR0FBR0gsT0FBTyxDQUFDakssT0FBRCxDQUFQLENBQWlCbUssS0FBakIsS0FBMEJMLFVBQVUsQ0FBQ0ssS0FBRCxDQUFwRDs7QUFFQSxVQUFHLFFBQVFHLElBQVIsQ0FBYUMsTUFBTSxDQUFDSixLQUFELENBQU4sQ0FBYSxDQUFiLENBQWIsQ0FBSCxFQUNBO0FBQ0MsWUFBR0MsVUFBUyxDQUFDQyxTQUFiLEVBQ0E7QUFDQyxjQUFHLENBQUNILE9BQU8sQ0FBQ2xLLE9BQUQsQ0FBUCxDQUFpQm1LLEtBQWpCLENBQUosRUFDQTtBQUNDRCxtQkFBTyxDQUFDbEssT0FBRCxDQUFQLENBQWlCbUssS0FBakIsSUFBeUIsSUFBSUMsVUFBSixFQUF6QjtBQUNBO0FBQ0QsU0FORCxNQVFBO0FBQ0NGLGlCQUFPLENBQUNsSyxPQUFELENBQVAsQ0FBaUJtSyxLQUFqQixJQUF5QkMsVUFBekI7QUFDQTs7QUFFREksZ0JBQVEsR0FBR04sT0FBTyxDQUFDbEssT0FBRCxDQUFQLENBQWlCbUssS0FBakIsQ0FBWDtBQUNBLE9BZkQsTUFpQkE7QUFDQyxZQUFHQyxVQUFTLENBQUNDLFNBQWIsRUFDQTtBQUNDRyxrQkFBUSxHQUFHLElBQUlKLFVBQUosRUFBWDtBQUNBLFNBSEQsTUFLQTtBQUNDSSxrQkFBUSxHQUFHSixVQUFYO0FBQ0E7QUFDRDs7QUFFRDdDLFlBQU0sQ0FBQ2tELGNBQVAsQ0FBc0IsSUFBdEIsRUFBNEJOLEtBQTVCLEVBQWtDO0FBQ2pDTyxrQkFBVSxFQUFFLEtBRHFCO0FBRWpDQyxnQkFBUSxFQUFJLEtBRnFCO0FBR2pDQyxhQUFLLEVBQU9KO0FBSHFCLE9BQWxDO0FBS0E7QUFFRDs7OztXQUVELHNCQUNBO0FBQ0MsYUFBTyxFQUFQO0FBQ0E7OztXQUVELG1CQUNBO0FBQ0MsYUFBTyxHQUFQO0FBQ0E7OztXQUVELGdCQUFjVixXQUFkLEVBQ0E7QUFBQSxVQUQwQjlKLFFBQzFCLHVFQURvQyxHQUNwQzs7QUFDQyxVQUFHLEVBQUUsS0FBS3FLLFNBQUwsWUFBMEJ2SyxVQUExQixJQUF3QyxTQUFTQSxVQUFuRCxDQUFILEVBQ0E7QUFDQyxjQUFNLElBQUkrSyxLQUFKLCtMQUFOO0FBWUE7O0FBRUQsVUFBSUMsa0JBQWtCLEdBQUcsS0FBS2hCLFVBQUwsRUFBekI7QUFFQTtBQUFBOztBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBO0FBQUEsaUJBQ0Msc0JBQ0E7QUFDQyxtQkFBT3ZDLE1BQU0sQ0FBQ3lDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCYyxrQkFBbEIsRUFBc0NoQixXQUF0QyxDQUFQO0FBQ0E7QUFKRjtBQUFBO0FBQUEsaUJBS0MsbUJBQ0E7QUFDQyxtQkFBTzlKLFFBQVA7QUFDQTtBQVJGOztBQUFBO0FBQUEsUUFBcUIsSUFBckI7QUFVQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUN0SEkrSyxNLDZCQUVMLGtCQUNBO0FBQUE7O0FBQ0MsT0FBS1osSUFBTCxHQUFZLFNBQVNwQixJQUFJLENBQUNpQyxNQUFMLEVBQXJCO0FBQ0EsQzs7O0FBR0YsSUFBSUMsTUFBTSxHQUFHLElBQUlGLE1BQUosRUFBYjs7Ozs7Ozs7Ozs7Ozs7QUNSQTs7QUFDQTs7QUFDQTs7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVjRyxVOzs7OztBQU9iLHdCQUNBO0FBQUE7O0FBQUE7O0FBQ0M7O0FBRUE5SCx1QkFBU0MsR0FBVCxHQUFla0IsSUFBZixDQUFvQkMsTUFBcEIsQ0FBMkIsVUFBQ0MsQ0FBRCxFQUFHQyxDQUFILEVBQUtDLENBQUwsRUFBT0MsQ0FBUCxFQUFXO0FBQ3JDLFVBQUdILENBQUMsR0FBRyxDQUFQLEVBQ0E7QUFDQyxjQUFLMEcsUUFBTCxDQUFjekcsQ0FBZCxFQUFnQkQsQ0FBaEIsRUFBa0JFLENBQUMsQ0FBQ0QsQ0FBRCxDQUFuQjs7QUFDQTtBQUNBOztBQUVELFVBQUdELENBQUMsS0FBSyxDQUFDLENBQVYsRUFDQTtBQUNDLGNBQUsyRyxVQUFMLENBQWdCMUcsQ0FBaEIsRUFBa0JELENBQWxCLEVBQW9CRSxDQUFDLENBQUNELENBQUQsQ0FBckI7O0FBQ0E7QUFDQTtBQUVELEtBYkQ7O0FBZUEsVUFBS3hCLGNBQUwsQ0FBb0JLLElBQXBCLENBQXlCaUIsTUFBekIsQ0FBZ0MsR0FBaEMsRUFBcUMsVUFBQ0MsQ0FBRCxFQUFPO0FBQzNDLFlBQUs0RyxJQUFMLENBQVUsQ0FBVixJQUFlNUcsQ0FBQyxHQUFHLEVBQW5CO0FBQ0EsS0FGRDs7QUFJQSxVQUFLdkIsY0FBTCxDQUFvQkssSUFBcEIsQ0FBeUJpQixNQUF6QixDQUFnQyxHQUFoQyxFQUFxQyxVQUFDQyxDQUFELEVBQU87QUFDM0MsWUFBSzRHLElBQUwsQ0FBVSxDQUFWLElBQWU1RyxDQUFDLEdBQUcsRUFBbkI7QUFDQSxLQUZEOztBQXRCRDtBQXlCQzs7OztXQUVELGtCQUFTNkcsR0FBVCxFQUFjVixLQUFkLEVBQXFCVyxJQUFyQixFQUNBO0FBQ0MsVUFBRyxVQUFVakIsSUFBVixDQUFlZ0IsR0FBZixDQUFILEVBQ0E7QUFDQyxhQUFLRSxRQUFMLENBQWNGLEdBQWQsSUFBcUIsSUFBckI7QUFDQTtBQUNBOztBQUVELGNBQU9BLEdBQVA7QUFFQyxhQUFLLFlBQUw7QUFDQyxlQUFLRCxJQUFMLENBQVUsQ0FBVixJQUFlLENBQWY7QUFDQTs7QUFFRCxhQUFLLFdBQUw7QUFDQyxlQUFLQSxJQUFMLENBQVUsQ0FBVixJQUFlLENBQWY7QUFDQTs7QUFFRCxhQUFLLFdBQUw7QUFDQyxlQUFLQSxJQUFMLENBQVUsQ0FBVixJQUFlLENBQUMsQ0FBaEI7QUFDQTs7QUFFRCxhQUFLLFNBQUw7QUFDQyxlQUFLQSxJQUFMLENBQVUsQ0FBVixJQUFlLENBQUMsQ0FBaEI7QUFDQTtBQWhCRjtBQWtCQTs7O1dBRUQsb0JBQVdDLEdBQVgsRUFBZ0JWLEtBQWhCLEVBQXVCVyxJQUF2QixFQUNBO0FBQ0MsVUFBRyxVQUFVakIsSUFBVixDQUFlZ0IsR0FBZixDQUFILEVBQ0E7QUFDQyxhQUFLRSxRQUFMLENBQWNGLEdBQWQsSUFBcUIsS0FBckI7QUFDQTtBQUNBOztBQUVELGNBQU9BLEdBQVA7QUFFQyxhQUFLLFlBQUw7QUFDQyxjQUFHLEtBQUtELElBQUwsQ0FBVSxDQUFWLElBQWUsQ0FBbEIsRUFDQTtBQUNDLGlCQUFLQSxJQUFMLENBQVUsQ0FBVixJQUFlLENBQWY7QUFDQTs7QUFDRCxlQUFLQSxJQUFMLENBQVUsQ0FBVixJQUFlLENBQWY7O0FBRUQsYUFBSyxXQUFMO0FBQ0MsY0FBRyxLQUFLQSxJQUFMLENBQVUsQ0FBVixJQUFlLENBQWxCLEVBQ0E7QUFDQyxpQkFBS0EsSUFBTCxDQUFVLENBQVYsSUFBZSxDQUFmO0FBQ0E7O0FBQ0Q7O0FBRUQsYUFBSyxXQUFMO0FBQ0MsY0FBRyxLQUFLQSxJQUFMLENBQVUsQ0FBVixJQUFlLENBQWxCLEVBQ0E7QUFDQyxpQkFBS0EsSUFBTCxDQUFVLENBQVYsSUFBZSxDQUFmO0FBQ0E7O0FBRUYsYUFBSyxTQUFMO0FBQ0MsY0FBRyxLQUFLQSxJQUFMLENBQVUsQ0FBVixJQUFlLENBQWxCLEVBQ0E7QUFDQyxpQkFBS0EsSUFBTCxDQUFVLENBQVYsSUFBZSxDQUFmO0FBQ0E7O0FBQ0Q7QUEzQkY7QUE2QkE7Ozs7RUFuR012TCx1QkFBV0MsTUFBWCxDQUFrQjtBQUN6QnFELFVBQVEsRUFBUkEsa0JBRHlCO0FBRXZCRixnQkFBYyxFQUFkQSxzQkFGdUI7QUFHdkJzSSxVQUFRLEVBQUVDLG1CQUFTQyxZQUFULENBQXNCLEVBQXRCLENBSGE7QUFJdkJMLE1BQUksRUFBTUksbUJBQVNDLFlBQVQsQ0FBc0IsRUFBdEI7QUFKYSxDQUFsQixDOzs7Ozs7Ozs7Ozs7Ozs7QUNQUjs7QUFDQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVhbEcsTTs7Ozs7QUFFWixvQkFDQTtBQUFBOztBQUFBOztBQUNDO0FBQ0EsVUFBS21HLFNBQUwsR0FBaUIsT0FBakI7QUFDQSxVQUFLQyxLQUFMLEdBQWlCLFVBQWpCO0FBSEQ7QUFJQzs7OztXQUVELGtCQUNBLENBQ0M7OztXQUVELG9CQUNBO0FBQ0MsVUFBSWhJLEtBQUssR0FBRyxDQUFaO0FBRUEsVUFBSWlJLEtBQUssR0FBRyxLQUFLWCxVQUFMLENBQWdCRyxJQUFoQixDQUFxQixDQUFyQixLQUEyQixDQUF2QztBQUNBLFVBQUlTLEtBQUssR0FBRyxLQUFLWixVQUFMLENBQWdCRyxJQUFoQixDQUFxQixDQUFyQixLQUEyQixDQUF2Qzs7QUFFQSxXQUFJLElBQUkxRyxDQUFSLElBQWEsS0FBS3VHLFVBQUwsQ0FBZ0JNLFFBQTdCLEVBQ0E7QUFDQyxZQUFHLENBQUMsS0FBS04sVUFBTCxDQUFnQk0sUUFBaEIsQ0FBeUI3RyxDQUF6QixDQUFKLEVBQ0E7QUFDQztBQUNBOztBQUVEeEMsZUFBTyxDQUFDNEosR0FBUixDQUFZcEgsQ0FBWjtBQUNBOztBQUVEa0gsV0FBSyxHQUFHOUMsSUFBSSxDQUFDSyxHQUFMLENBQVMsQ0FBVCxFQUFZTCxJQUFJLENBQUNpRCxHQUFMLENBQVNILEtBQVQsRUFBZ0IsQ0FBQyxDQUFqQixDQUFaLENBQVI7QUFDQUMsV0FBSyxHQUFHL0MsSUFBSSxDQUFDSyxHQUFMLENBQVMsQ0FBVCxFQUFZTCxJQUFJLENBQUNpRCxHQUFMLENBQVNGLEtBQVQsRUFBZ0IsQ0FBQyxDQUFqQixDQUFaLENBQVI7QUFFQSxXQUFLbkcsTUFBTCxDQUFZeEYsQ0FBWixJQUFpQjBMLEtBQUssR0FBRyxDQUFSLEdBQ2Q5QyxJQUFJLENBQUNrRCxJQUFMLENBQVVySSxLQUFLLEdBQUdpSSxLQUFsQixDQURjLEdBRWQ5QyxJQUFJLENBQUNDLEtBQUwsQ0FBV3BGLEtBQUssR0FBR2lJLEtBQW5CLENBRkg7QUFJQSxXQUFLbEcsTUFBTCxDQUFZdkYsQ0FBWixJQUFpQjBMLEtBQUssR0FBRyxDQUFSLEdBQ2QvQyxJQUFJLENBQUNrRCxJQUFMLENBQVVySSxLQUFLLEdBQUdrSSxLQUFsQixDQURjLEdBRWQvQyxJQUFJLENBQUNDLEtBQUwsQ0FBV3BGLEtBQUssR0FBR2tJLEtBQW5CLENBRkg7QUFJQSxXQUFLNUQsTUFBTCxDQUFZL0gsQ0FBWixHQUFnQixLQUFLd0YsTUFBTCxDQUFZeEYsQ0FBNUI7QUFDQSxXQUFLK0gsTUFBTCxDQUFZOUgsQ0FBWixHQUFnQixLQUFLdUYsTUFBTCxDQUFZdkYsQ0FBNUI7QUFFQSxVQUFJOEwsVUFBVSxHQUFHLEtBQWpCOztBQUVBLFVBQUduRCxJQUFJLENBQUNvRCxHQUFMLENBQVNOLEtBQVQsSUFBa0I5QyxJQUFJLENBQUNvRCxHQUFMLENBQVNMLEtBQVQsQ0FBckIsRUFDQTtBQUNDSSxrQkFBVSxHQUFHLElBQWI7QUFDQTs7QUFFRCxVQUFHQSxVQUFILEVBQ0E7QUFDQyxhQUFLUCxTQUFMLEdBQWlCLE1BQWpCOztBQUVBLFlBQUdFLEtBQUssR0FBRyxDQUFYLEVBQ0E7QUFDQyxlQUFLRixTQUFMLEdBQWlCLE1BQWpCO0FBQ0E7O0FBRUQsYUFBS0MsS0FBTCxHQUFhLFNBQWI7QUFFQSxPQVhELE1BWUssSUFBR0UsS0FBSCxFQUNMO0FBQ0MsYUFBS0gsU0FBTCxHQUFpQixPQUFqQjs7QUFFQSxZQUFHRyxLQUFLLEdBQUcsQ0FBWCxFQUNBO0FBQ0MsZUFBS0gsU0FBTCxHQUFpQixPQUFqQjtBQUNBOztBQUVELGFBQUtDLEtBQUwsR0FBYSxTQUFiO0FBQ0EsT0FWSSxNQVlMO0FBQ0MsYUFBS0EsS0FBTCxHQUFhLFVBQWI7QUFDQSxPQS9ERixDQWlFQztBQUNBO0FBQ0E7QUFDQTs7O0FBRUEsVUFBSVEsTUFBSjs7QUFFQSxVQUFHQSxNQUFNLEdBQUcsS0FBS3pHLE1BQUwsQ0FBWSxLQUFLaUcsS0FBakIsRUFBd0IsS0FBS0QsU0FBN0IsQ0FBWixFQUNBO0FBQ0MsYUFBS2hHLE1BQUwsQ0FBWTBHLFNBQVosQ0FBc0JELE1BQXRCO0FBQ0E7QUFDRDs7O1dBRUQsbUJBQ0EsQ0FDQzs7OztFQTlGMEJ0TSx1QkFBV0MsTUFBWCxDQUFrQjtBQUFDNEYsUUFBTSxFQUFFMkcsY0FBVDtBQUFpQnBCLFlBQVUsRUFBVkEsc0JBQWpCO0FBQTZCaEQsUUFBTSxFQUFOQTtBQUE3QixDQUFsQixDOzs7OztDQ0w1QjtBQUFBO0FBQUE7QUFBQTtDQ0FBO0FBQUE7QUFBQTtBQUFBOzs7Ozs7Ozs7OztBQ0FBOztBQUNBOztBQUNBOztBQUVBOztBQUNBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBRWNxRSxVOzs7OztBQUdiLHNCQUFZQyxJQUFaLEVBQWtCM0gsR0FBbEIsRUFDQTtBQUFBOztBQUFBLFFBRHVCNEgsS0FDdkIsdUVBRCtCLENBQy9COztBQUFBOztBQUNDOztBQUVBaEIsdUJBQVNDLFlBQVQ7O0FBRUEsVUFBS2dCLEtBQUwsR0FBbUIsRUFBbkI7QUFDQSxVQUFLQyxPQUFMLEdBQW1CLEVBQW5CO0FBQ0EsVUFBS0MsUUFBTCxHQUFtQixDQUFuQjtBQUVBLFVBQUtDLFFBQUwsR0FBbUIsQ0FBbkI7QUFDQSxVQUFLQyxRQUFMLEdBQW1CLENBQW5CO0FBRUEsVUFBSzlILFdBQUwsR0FBbUIsSUFBSUMsd0JBQUosRUFBbkI7QUFFQSxVQUFLOEgsU0FBTCxHQUFtQixFQUFuQjtBQUNBLFVBQUtDLFVBQUwsR0FBbUIsRUFBbkI7QUFFQSxVQUFLbkksR0FBTCxHQUFtQkEsR0FBbkI7QUFDQSxVQUFLNEgsS0FBTCxHQUFtQkEsS0FBbkI7QUFsQkQ7QUFtQkM7Ozs7V0FFRCxvQkFBV3RNLENBQVgsRUFBY0MsQ0FBZCxFQUFpQjZNLFdBQWpCLEVBQ0E7QUFDQyxVQUFJQyxJQUFKO0FBQ0EsVUFBTVYsSUFBSSxHQUFHLEtBQUs1TSxJQUFsQjtBQUVBLFVBQUl1TixLQUFLLEdBQUloTixDQUFDLElBQUksS0FBSzRNLFNBQUwsR0FBaUIsS0FBS0YsUUFBMUIsQ0FBZDtBQUNBLFVBQUlPLEtBQUssR0FBSWhOLENBQUMsSUFBSSxLQUFLNE0sVUFBTCxHQUFrQixLQUFLRixRQUEzQixDQUFkOztBQUVBLFVBQUcsS0FBS0gsT0FBTCxDQUFhUSxLQUFiLEtBQXVCLEtBQUtSLE9BQUwsQ0FBYVEsS0FBYixFQUFvQkMsS0FBcEIsQ0FBMUIsRUFDQTtBQUNDRixZQUFJLEdBQUcsS0FBS1AsT0FBTCxDQUFhUSxLQUFiLEVBQW9CQyxLQUFwQixDQUFQO0FBQ0EsT0FIRCxNQUtBO0FBQ0NGLFlBQUksR0FBRyxJQUFJRyxnQkFBSixDQUNOYixJQURNLEVBRUosS0FBSzNILEdBRkQsRUFHSixLQUFLZ0ksUUFIRCxFQUlKLEtBQUtDLFFBSkQsRUFLSkssS0FMSSxFQU1KQyxLQU5JLEVBT0osS0FBS1gsS0FQRCxDQUFQOztBQVVBLFlBQUcsQ0FBQyxLQUFLRSxPQUFMLENBQWFRLEtBQWIsQ0FBSixFQUNBO0FBQ0MsZUFBS1IsT0FBTCxDQUFhUSxLQUFiLElBQXNCLEVBQXRCO0FBQ0E7O0FBRUQsWUFBRyxDQUFDLEtBQUtSLE9BQUwsQ0FBYVEsS0FBYixFQUFvQkMsS0FBcEIsQ0FBSixFQUNBO0FBQ0MsZUFBS1QsT0FBTCxDQUFhUSxLQUFiLEVBQW9CQyxLQUFwQixJQUE2QkYsSUFBN0I7QUFDQTtBQUNEOztBQUVELFdBQUtSLEtBQUwsQ0FBV1ksT0FBWCxDQUFtQkosSUFBbkI7O0FBRUEsVUFBRyxLQUFLUixLQUFMLENBQVc3RSxNQUFYLEdBQW9CLEtBQUsrRSxRQUE1QixFQUNBO0FBQ0MsYUFBS0YsS0FBTCxDQUFXYSxHQUFYO0FBQ0E7QUFDRDs7O1dBRUQsZ0JBQ0E7QUFDQyxVQUFNQyxPQUFPLEdBQUd6RSxJQUFJLENBQUNDLEtBQUwsQ0FDZixLQUFLZCxNQUFMLENBQVkvSCxDQUFaLElBQWlCLEtBQUswTSxRQUFMLEdBQWdCLEtBQUtFLFNBQXRDLENBRGUsQ0FBaEI7QUFHQSxVQUFNVSxPQUFPLEdBQUcxRSxJQUFJLENBQUNDLEtBQUwsQ0FDZixLQUFLZCxNQUFMLENBQVk5SCxDQUFaLElBQWlCLEtBQUswTSxRQUFMLEdBQWdCLEtBQUtFLFVBQXRDLENBRGUsQ0FBaEI7QUFJQSxVQUFJVSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUYsRUFBSSxDQUFKLEVBQU0sQ0FBTixDQUFaLENBUkQsQ0FTQzs7QUFFQSxXQUFJLElBQUl2TixDQUFSLElBQWF1TixLQUFiLEVBQ0E7QUFDQyxhQUFJLElBQUl0TixDQUFSLElBQWFzTixLQUFiLEVBQ0E7QUFDQyxlQUFLQyxVQUFMLENBQWdCSCxPQUFPLEdBQUdFLEtBQUssQ0FBQ3ZOLENBQUQsQ0FBL0IsRUFBb0NzTixPQUFPLEdBQUdDLEtBQUssQ0FBQ3ROLENBQUQsQ0FBbkQ7QUFDQTtBQUNEOztBQUVELFdBQUtzTSxLQUFMLENBQVc3SCxHQUFYLENBQWUsVUFBQzJCLENBQUQsRUFBSztBQUNuQkEsU0FBQyxDQUFDd0IsSUFBRjtBQUNBLE9BRkQ7QUFHQTs7O1dBRUQsZ0JBQU83SCxDQUFQLEVBQVVDLENBQVYsRUFDQTtBQUNDLFdBQUksSUFBSTJGLENBQVIsSUFBYSxLQUFLNEcsT0FBbEIsRUFDQTtBQUNDLGFBQUksSUFBSXpHLENBQVIsSUFBYSxLQUFLeUcsT0FBTCxDQUFhNUcsQ0FBYixDQUFiLEVBQ0E7QUFDQyxpQkFBTyxLQUFLNEcsT0FBTCxDQUFhNUcsQ0FBYixFQUFnQkcsQ0FBaEIsQ0FBUDtBQUNBO0FBQ0Q7O0FBRUQsYUFBTSxLQUFLd0csS0FBTCxDQUFXN0UsTUFBakIsRUFDQTtBQUNDLGFBQUs2RSxLQUFMLENBQVdhLEdBQVg7QUFDQTs7QUFFRCxXQUFLVixRQUFMLEdBQWdCOUQsSUFBSSxDQUFDa0QsSUFBTCxDQUFVOUwsQ0FBQyxHQUFHLEtBQUs0TSxTQUFuQixDQUFoQjtBQUNBLFdBQUtELFFBQUwsR0FBZ0IvRCxJQUFJLENBQUNrRCxJQUFMLENBQVU3TCxDQUFDLEdBQUcsS0FBSzRNLFVBQW5CLENBQWhCO0FBRUEsV0FBS2hGLElBQUw7QUFDQTs7O1dBRUQsb0JBQ0EsQ0FFQzs7OztFQXBITWxJLHVCQUFXQyxNQUFYLENBQWtCO0FBQUNILE1BQUksRUFBSkEsVUFBRDtBQUFPc0ksUUFBTSxFQUFOQTtBQUFQLENBQWxCLEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUNUS0EsTSw2QkFFWixrQkFDQTtBQUFBOztBQUNDLE9BQUsvSCxDQUFMLEdBQVMsQ0FBVDtBQUNBLE9BQUtDLENBQUwsR0FBUyxDQUFUO0FBRUEsT0FBS0MsS0FBTCxHQUFjLENBQWQ7QUFDQSxPQUFLQyxNQUFMLEdBQWMsQ0FBZDtBQUNBLEM7Ozs7Ozs7Ozs7Ozs7OztBQ1RGOztBQUVBOztBQUNBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBRWFnTSxNOzs7OztBQUVaLGtCQUFZc0IsUUFBWixFQUNBO0FBQUE7O0FBQUE7O0FBQ0M7QUFFQSxVQUFLQyxDQUFMLEdBQWMsQ0FBZDtBQUNBLFVBQUsxTixDQUFMLEdBQWMsQ0FBZDtBQUNBLFVBQUtDLENBQUwsR0FBYyxDQUFkO0FBRUEsVUFBS0MsS0FBTCxHQUFjLENBQWQ7QUFDQSxVQUFLQyxNQUFMLEdBQWMsQ0FBZDtBQUNBLFVBQUt3TixLQUFMLEdBQWMsQ0FBZDtBQUVBLFVBQUsxQixNQUFMLEdBQXFCLEVBQXJCO0FBQ0EsVUFBSzJCLFVBQUwsR0FBcUIsQ0FBckI7QUFDQSxVQUFLQyxZQUFMLEdBQXFCLE1BQUtELFVBQTFCO0FBQ0EsVUFBS0UsWUFBTCxHQUFxQixDQUFyQjtBQUNBLFVBQUtDLGFBQUwsR0FBcUIsRUFBckI7QUFFQSxVQUFLdEssS0FBTCxHQUFnQixDQUFoQjtBQUNBLFVBQUtDLFFBQUwsR0FBZ0IsQ0FBaEI7QUFFQSxVQUFLc0ssTUFBTCxHQUFjLEtBQWQ7QUFFQSxVQUFLQyxLQUFMLEdBQWEsQ0FBYjtBQUNBLFVBQUtDLElBQUwsR0FBWSxDQUFaO0FBQ0EsVUFBS0MsSUFBTCxHQUFZLENBQVo7QUFDQSxVQUFLQyxFQUFMLEdBQVcsQ0FBWDtBQUVBLFVBQUtDLElBQUwsR0FBWSxNQUFLSixLQUFqQjtBQUNBLFVBQUtLLEtBQUwsR0FBYSxNQUFLSixJQUFsQjtBQUNBLFVBQUtLLElBQUwsR0FBWSxNQUFLSixJQUFqQjtBQUNBLFVBQUtLLEtBQUwsR0FBYSxNQUFLSixFQUFsQjtBQUVBLFVBQUtLLFFBQUwsR0FBZ0I7QUFDZixlQUFTLENBQ1IsMkJBRFEsQ0FETTtBQUliLGVBQVMsQ0FDViwyQkFEVSxDQUpJO0FBT2IsY0FBUSxDQUNULDBCQURTLENBUEs7QUFVYixjQUFRLENBQ1QsMEJBRFM7QUFWSyxLQUFoQjtBQWVBLFVBQUtDLE9BQUwsR0FBZTtBQUNkLGVBQVMsQ0FDUiwwQkFEUSxFQUVOLDBCQUZNLEVBR04sMkJBSE0sRUFJTiwyQkFKTSxFQUtOLDJCQUxNLEVBTU4sMkJBTk0sQ0FESztBQVNaLGVBQVMsQ0FDViwwQkFEVSxFQUVSLDBCQUZRLEVBR1IsMkJBSFEsRUFJUiwyQkFKUSxFQUtSLDJCQUxRLEVBTVIsMkJBTlEsQ0FURztBQWtCWixjQUFRLENBQ1QseUJBRFMsRUFFUCx5QkFGTyxFQUdQLDBCQUhPLEVBSVAsMEJBSk8sRUFLUCwwQkFMTyxFQU1QLDBCQU5PLEVBT1AsMEJBUE8sRUFRUCwwQkFSTyxDQWxCSTtBQTRCWixjQUFRLENBQ1QseUJBRFMsRUFFUCx5QkFGTyxFQUdQLDBCQUhPLEVBSVAsMEJBSk8sRUFLUCwwQkFMTyxFQU1QLDBCQU5PLEVBT1AsMEJBUE8sRUFRUCwwQkFSTztBQTVCSSxLQUFmO0FBd0NBLFFBQU10TyxFQUFFLEdBQUcsTUFBS1gsSUFBTCxDQUFVSSxPQUFyQjtBQUVBTyxNQUFFLENBQUN1TyxtQkFBSCxDQUNDLE1BQUtsUCxJQUFMLENBQVVtUCxnQkFEWCxFQUVHLENBRkgsRUFHR3hPLEVBQUUsQ0FBQ3lPLEtBSE4sRUFJRyxLQUpILEVBS0csQ0FMSCxFQU1HLENBTkg7QUFTQSxVQUFLQyxPQUFMLEdBQWUxTyxFQUFFLENBQUMyTyxhQUFILEVBQWY7QUFFQTNPLE1BQUUsQ0FBQzRPLFdBQUgsQ0FBZTVPLEVBQUUsQ0FBQzZPLFVBQWxCLEVBQThCLE1BQUtILE9BQW5DOztBQUVBLFFBQU1JLENBQUMsR0FBRyxTQUFKQSxDQUFJO0FBQUEsYUFBSUMsUUFBUSxDQUFDdkcsSUFBSSxDQUFDaUMsTUFBTCxLQUFjLEdBQWYsQ0FBWjtBQUFBLEtBQVY7O0FBRUF6SyxNQUFFLENBQUNnUCxVQUFILENBQ0NoUCxFQUFFLENBQUM2TyxVQURKLEVBRUcsQ0FGSCxFQUdHN08sRUFBRSxDQUFDaVAsSUFITixFQUlHLENBSkgsRUFLRyxDQUxILEVBTUcsQ0FOSCxFQU9HalAsRUFBRSxDQUFDaVAsSUFQTixFQVFHalAsRUFBRSxDQUFDa1AsYUFSTixFQVNHLElBQUlDLFVBQUosQ0FBZSxDQUFDTCxDQUFDLEVBQUYsRUFBTUEsQ0FBQyxFQUFQLEVBQVcsQ0FBWCxFQUFjLEdBQWQsQ0FBZixDQVRIOztBQVlBLFVBQUtwSyxXQUFMLENBQWlCMEssS0FBakIsQ0FBdUJDLElBQXZCLENBQTRCLFVBQUNDLEtBQUQsRUFBUztBQUNwQyxVQUFNQyxLQUFLLEdBQUcsTUFBSzdLLFdBQUwsQ0FBaUI4SyxRQUFqQixDQUEwQm5DLFFBQTFCLENBQWQ7O0FBRUEsVUFBR2tDLEtBQUgsRUFDQTtBQUNDeEQsY0FBTSxDQUFDMEQsV0FBUCxDQUFtQixNQUFLcFEsSUFBeEIsRUFBOEIsTUFBS3FGLFdBQW5DLEVBQWdENkssS0FBaEQsRUFBdURGLElBQXZELENBQTRELFVBQUNyTSxJQUFELEVBQVE7QUFDbkUsZ0JBQUswTCxPQUFMLEdBQWUxTCxJQUFJLENBQUMwTCxPQUFwQjtBQUNBLGdCQUFLNU8sS0FBTCxHQUFla0QsSUFBSSxDQUFDME0sS0FBTCxDQUFXNVAsS0FBWCxHQUFtQixNQUFLeU4sS0FBdkM7QUFDQSxnQkFBS3hOLE1BQUwsR0FBZWlELElBQUksQ0FBQzBNLEtBQUwsQ0FBVzNQLE1BQVgsR0FBb0IsTUFBS3dOLEtBQXhDO0FBQ0EsU0FKRDtBQUtBO0FBQ0QsS0FYRDs7QUFwSEQ7QUFnSUM7Ozs7V0FFRCxnQkFDQTtBQUNDLFdBQUtDLFVBQUwsR0FBa0IsS0FBS2xLLFFBQUwsR0FBZ0JrRixJQUFJLENBQUNvRCxHQUFMLENBQVMsS0FBS3ZJLEtBQWQsQ0FBbEM7O0FBQ0EsVUFBRyxLQUFLbUssVUFBTCxHQUFrQixLQUFLbEssUUFBMUIsRUFDQTtBQUNDLGFBQUtrSyxVQUFMLEdBQWtCLEtBQUtsSyxRQUF2QjtBQUNBOztBQUVELFVBQUcsS0FBS21LLFlBQUwsSUFBcUIsQ0FBeEIsRUFDQTtBQUNDLGFBQUtBLFlBQUwsR0FBb0IsS0FBS0QsVUFBekI7QUFDQSxhQUFLRSxZQUFMO0FBQ0EsT0FKRCxNQU1BO0FBQ0MsYUFBS0QsWUFBTDtBQUNBOztBQUVELFVBQUcsS0FBS0MsWUFBTCxJQUFxQixLQUFLN0IsTUFBTCxDQUFZdkUsTUFBcEMsRUFDQTtBQUNDLGFBQUtvRyxZQUFMLEdBQW9CLEtBQUtBLFlBQUwsR0FBb0IsS0FBSzdCLE1BQUwsQ0FBWXZFLE1BQXBEO0FBQ0E7O0FBRUQsVUFBTWlJLEtBQUssR0FBRyxLQUFLMUQsTUFBTCxDQUFhLEtBQUs2QixZQUFsQixDQUFkOztBQUVBLFVBQUc2QixLQUFILEVBQ0E7QUFDQyxhQUFLYixPQUFMLEdBQWVhLEtBQUssQ0FBQ2IsT0FBckI7QUFFQSxhQUFLNU8sS0FBTCxHQUFjeVAsS0FBSyxDQUFDelAsS0FBTixHQUFjLEtBQUt5TixLQUFqQztBQUNBLGFBQUt4TixNQUFMLEdBQWN3UCxLQUFLLENBQUN4UCxNQUFOLEdBQWUsS0FBS3dOLEtBQWxDO0FBQ0E7O0FBRUQsVUFBTXZOLEVBQUUsR0FBRyxLQUFLWCxJQUFMLENBQVVJLE9BQXJCO0FBRUFPLFFBQUUsQ0FBQ0ksZUFBSCxDQUFtQkosRUFBRSxDQUFDSyxXQUF0QixFQUFtQyxJQUFuQztBQUVBTCxRQUFFLENBQUNFLFVBQUgsQ0FBYyxLQUFLYixJQUFMLENBQVVjLE9BQXhCO0FBRUFILFFBQUUsQ0FBQzJQLHVCQUFILENBQTJCLEtBQUt0USxJQUFMLENBQVVtUCxnQkFBckM7QUFFQXhPLFFBQUUsQ0FBQzRPLFdBQUgsQ0FBZTVPLEVBQUUsQ0FBQzZPLFVBQWxCLEVBQThCLEtBQUtILE9BQW5DO0FBQ0ExTyxRQUFFLENBQUMyUCx1QkFBSCxDQUEyQixLQUFLdFEsSUFBTCxDQUFVdVEsZ0JBQXJDO0FBQ0E1UCxRQUFFLENBQUM2UCxVQUFILENBQWM3UCxFQUFFLENBQUM4UCxZQUFqQixFQUErQixLQUFLelEsSUFBTCxDQUFVMFEsY0FBekM7QUFFQS9QLFFBQUUsQ0FBQ3VPLG1CQUFILENBQ0MsS0FBS2xQLElBQUwsQ0FBVXVRLGdCQURYLEVBRUcsQ0FGSCxFQUdHNVAsRUFBRSxDQUFDeU8sS0FITixFQUlHLEtBSkgsRUFLRyxDQUxILEVBTUcsQ0FOSDtBQVNBek8sUUFBRSxDQUFDNlAsVUFBSCxDQUFjN1AsRUFBRSxDQUFDOFAsWUFBakIsRUFBK0IsS0FBS3pRLElBQUwsQ0FBVTBRLGNBQXpDO0FBQ0EvUCxRQUFFLENBQUNnUSxVQUFILENBQWNoUSxFQUFFLENBQUM4UCxZQUFqQixFQUErQixJQUFJRyxZQUFKLENBQWlCLENBQy9DLEdBRCtDLEVBQ3pDLEdBRHlDLEVBRS9DLEdBRitDLEVBRXpDLEdBRnlDLEVBRy9DLEdBSCtDLEVBR3pDLEdBSHlDLEVBSS9DLEdBSitDLEVBSXpDLEdBSnlDLEVBSy9DLEdBTCtDLEVBS3pDLEdBTHlDLEVBTS9DLEdBTitDLEVBTXpDLEdBTnlDLENBQWpCLENBQS9CLEVBT0lqUSxFQUFFLENBQUNrUSxXQVBQO0FBU0EsV0FBS0MsWUFBTCxDQUNDLEtBQUt2USxDQUFMLElBQ0MsS0FBSytILE1BQUwsQ0FBWS9ILENBQVosR0FDRSxLQUFLK0gsTUFBTCxDQUFZN0gsS0FBWixHQUFvQixDQUZ2QixJQUdLLEtBQUssS0FBS3lOLEtBSmhCLEVBS0csS0FBSzFOLENBQUwsSUFDRCxLQUFLOEgsTUFBTCxDQUFZOUgsQ0FBWixHQUNFLEtBQUs4SCxNQUFMLENBQVk1SCxNQUFaLEdBQW9CLENBRnJCLElBR0csS0FBS0EsTUFBTCxHQUFhLENBSGhCLEdBR3NCLEtBQUssS0FBS3dOLEtBUm5DLEVBVUcsS0FBS3pOLEtBVlIsRUFXRyxLQUFLQyxNQVhSO0FBY0FDLFFBQUUsQ0FBQ29RLFNBQUgsQ0FDQyxLQUFLL1EsSUFBTCxDQUFVZ1IsYUFEWCxFQUVHLENBRkgsRUFHRyxDQUhILEVBSUcsQ0FKSCxFQUtHLENBTEg7QUFRTXJRLFFBQUUsQ0FBQ3NRLFVBQUgsQ0FBY3RRLEVBQUUsQ0FBQ3VRLFNBQWpCLEVBQTRCLENBQTVCLEVBQStCLENBQS9CO0FBQ047OztXQUVELG1CQUFVQyxhQUFWLEVBQ0E7QUFBQTs7QUFDQyxVQUFJQyxRQUFRLEdBQUdELGFBQWEsQ0FBQ0UsSUFBZCxDQUFtQixHQUFuQixDQUFmOztBQUVBLFVBQUcsS0FBSy9DLGFBQUwsS0FBdUI4QyxRQUExQixFQUNBO0FBQ0M7QUFDQTs7QUFFRCxXQUFLOUMsYUFBTCxHQUFxQjhDLFFBQXJCO0FBRUEsV0FBSy9MLFdBQUwsQ0FBaUIwSyxLQUFqQixDQUF1QkMsSUFBdkIsQ0FBNEIsVUFBQ0MsS0FBRCxFQUFTO0FBRXBDLFlBQU16RCxNQUFNLEdBQUd5RCxLQUFLLENBQUNxQixTQUFOLENBQWdCSCxhQUFoQixFQUErQmxNLEdBQS9CLENBQW1DLFVBQUNpTCxLQUFELEVBQVM7QUFFMUQsaUJBQU94RCxNQUFNLENBQUMwRCxXQUFQLENBQW1CLE1BQUksQ0FBQ3BRLElBQXhCLEVBQThCLE1BQUksQ0FBQ3FGLFdBQW5DLEVBQWdENkssS0FBaEQsRUFBdURGLElBQXZELENBQTRELFVBQUNyTSxJQUFELEVBQVE7QUFDMUUsbUJBQU87QUFDTjBMLHFCQUFPLEVBQUcxTCxJQUFJLENBQUMwTCxPQURUO0FBRUo1TyxtQkFBSyxFQUFHa0QsSUFBSSxDQUFDME0sS0FBTCxDQUFXNVAsS0FGZjtBQUdKQyxvQkFBTSxFQUFFaUQsSUFBSSxDQUFDME0sS0FBTCxDQUFXM1A7QUFIZixhQUFQO0FBS0EsV0FOTSxDQUFQO0FBUUEsU0FWYyxDQUFmO0FBWUE2USxlQUFPLENBQUNDLEdBQVIsQ0FBWWhGLE1BQVosRUFBb0J3RCxJQUFwQixDQUF5QixVQUFDeEQsTUFBRCxFQUFVO0FBQ2xDLGdCQUFJLENBQUNBLE1BQUwsR0FBY0EsTUFBZDtBQUNBLFNBRkQ7QUFJQSxPQWxCRDtBQW1CQTs7O1dBc0RELHNCQUFhak0sQ0FBYixFQUFnQkMsQ0FBaEIsRUFBbUJDLEtBQW5CLEVBQTBCQyxNQUExQixFQUNBO0FBQ0MsVUFBTUMsRUFBRSxHQUFHLEtBQUtYLElBQUwsQ0FBVUksT0FBckI7QUFFQU8sUUFBRSxDQUFDNlAsVUFBSCxDQUFjN1AsRUFBRSxDQUFDOFAsWUFBakIsRUFBK0IsS0FBS3pRLElBQUwsQ0FBVXlSLGNBQXpDO0FBRUEsVUFBSUMsRUFBRSxHQUFHblIsQ0FBVDtBQUNBLFVBQUlvUixFQUFFLEdBQUdwUixDQUFDLEdBQUdFLEtBQWI7QUFDQSxVQUFJbVIsRUFBRSxHQUFHcFIsQ0FBVDtBQUNBLFVBQUlxUixFQUFFLEdBQUdyUixDQUFDLEdBQUdFLE1BQWI7QUFFQUMsUUFBRSxDQUFDZ1EsVUFBSCxDQUFjaFEsRUFBRSxDQUFDOFAsWUFBakIsRUFBK0IsSUFBSUcsWUFBSixDQUFpQixDQUMvQ2MsRUFEK0MsRUFDM0NFLEVBRDJDLEVBRS9DRCxFQUYrQyxFQUUzQ0MsRUFGMkMsRUFHL0NGLEVBSCtDLEVBRzNDRyxFQUgyQyxFQUkvQ0gsRUFKK0MsRUFJM0NHLEVBSjJDLEVBSy9DRixFQUwrQyxFQUszQ0MsRUFMMkMsRUFNL0NELEVBTitDLEVBTTNDRSxFQU4yQyxDQUFqQixDQUEvQixFQU9JbFIsRUFBRSxDQUFDa1EsV0FQUDtBQVFBOzs7V0F2RUQscUJBQW1CakUsSUFBbkIsRUFBeUJ4SCxXQUF6QixFQUFzQzRJLFFBQXRDLEVBQ0E7QUFDQyxVQUFNck4sRUFBRSxHQUFHaU0sSUFBSSxDQUFDeE0sT0FBaEI7O0FBRUEsVUFBRyxDQUFDLEtBQUswUixRQUFULEVBQ0E7QUFDQyxhQUFLQSxRQUFMLEdBQWdCLEVBQWhCO0FBQ0E7O0FBRUQsVUFBRyxLQUFLQSxRQUFMLENBQWM5RCxRQUFkLENBQUgsRUFDQTtBQUNDLGVBQU8sS0FBSzhELFFBQUwsQ0FBYzlELFFBQWQsQ0FBUDtBQUNBLE9BWEYsQ0FhQzs7O0FBRUEsV0FBSzhELFFBQUwsQ0FBYzlELFFBQWQsSUFBMEJ0QixNQUFNLENBQUNxRixTQUFQLENBQWlCL0QsUUFBakIsRUFBMkJnQyxJQUEzQixDQUFnQyxVQUFDSyxLQUFELEVBQVM7QUFDbEUsWUFBTWhCLE9BQU8sR0FBRzFPLEVBQUUsQ0FBQzJPLGFBQUgsRUFBaEI7QUFFQTNPLFVBQUUsQ0FBQzRPLFdBQUgsQ0FBZTVPLEVBQUUsQ0FBQzZPLFVBQWxCLEVBQThCSCxPQUE5QjtBQUVBMU8sVUFBRSxDQUFDcVIsYUFBSCxDQUFpQnJSLEVBQUUsQ0FBQzZPLFVBQXBCLEVBQWdDN08sRUFBRSxDQUFDc1IsY0FBbkMsRUFBbUR0UixFQUFFLENBQUN1UixhQUF0RDtBQUNBdlIsVUFBRSxDQUFDcVIsYUFBSCxDQUFpQnJSLEVBQUUsQ0FBQzZPLFVBQXBCLEVBQWdDN08sRUFBRSxDQUFDd1IsY0FBbkMsRUFBbUR4UixFQUFFLENBQUN1UixhQUF0RDtBQUNBdlIsVUFBRSxDQUFDcVIsYUFBSCxDQUFpQnJSLEVBQUUsQ0FBQzZPLFVBQXBCLEVBQWdDN08sRUFBRSxDQUFDeVIsa0JBQW5DLEVBQXVEelIsRUFBRSxDQUFDMFIsT0FBMUQ7QUFDQTFSLFVBQUUsQ0FBQ3FSLGFBQUgsQ0FBaUJyUixFQUFFLENBQUM2TyxVQUFwQixFQUFnQzdPLEVBQUUsQ0FBQzJSLGtCQUFuQyxFQUF1RDNSLEVBQUUsQ0FBQzBSLE9BQTFEO0FBRUExUixVQUFFLENBQUNnUCxVQUFILENBQ0NoUCxFQUFFLENBQUM2TyxVQURKLEVBRUcsQ0FGSCxFQUdHN08sRUFBRSxDQUFDaVAsSUFITixFQUlHalAsRUFBRSxDQUFDaVAsSUFKTixFQUtHalAsRUFBRSxDQUFDa1AsYUFMTixFQU1HUSxLQU5IO0FBU0EsZUFBTztBQUFDQSxlQUFLLEVBQUxBLEtBQUQ7QUFBUWhCLGlCQUFPLEVBQVBBO0FBQVIsU0FBUDtBQUNBLE9BcEJ5QixDQUExQjtBQXNCQSxhQUFPLEtBQUt5QyxRQUFMLENBQWM5RCxRQUFkLENBQVA7QUFDQTs7O1dBRUQsbUJBQWlCdUUsR0FBakIsRUFDQTtBQUNDLGFBQU8sSUFBSWhCLE9BQUosQ0FBWSxVQUFDaUIsTUFBRCxFQUFTQyxNQUFULEVBQWtCO0FBQ3BDLFlBQU1wQyxLQUFLLEdBQUcsSUFBSXFDLEtBQUosRUFBZDtBQUNBckMsYUFBSyxDQUFDa0MsR0FBTixHQUFjQSxHQUFkO0FBQ0FsQyxhQUFLLENBQUNwSixnQkFBTixDQUF1QixNQUF2QixFQUErQixVQUFDcUMsS0FBRCxFQUFTO0FBQ3ZDa0osZ0JBQU0sQ0FBQ25DLEtBQUQsQ0FBTjtBQUNBLFNBRkQ7QUFHQSxPQU5NLENBQVA7QUFPQTs7OztFQWhUMEJuUSx1QkFBV0MsTUFBWCxDQUFrQjtBQUFDSCxNQUFJLEVBQUpBLFVBQUQ7QUFBT3NJLFFBQU0sRUFBTkEsY0FBUDtBQUFlakQsYUFBVyxFQUFYQTtBQUFmLENBQWxCLEM7Ozs7Ozs7Ozs7Ozs7OztBQ041Qjs7QUFDQTs7QUFFQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFFQTs7QUFFQTs7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFFYUksVzs7Ozs7QUFFWix1QkFBWXhGLE9BQVosRUFBcUJnRixHQUFyQixFQUNBO0FBQUE7O0FBQUE7O0FBQ0MsOEJBQU1oRixPQUFOO0FBRUEsVUFBS2dGLEdBQUwsR0FBV0EsR0FBWDtBQUVBLFNBQUsvRSx1QkFBV0MsTUFBWCxDQUFrQjtBQUFDSCxVQUFJO0FBQUwsS0FBbEIsQ0FBTDtBQUVBLFVBQUsyUyxLQUFMLEdBQWE7QUFDWnBTLE9BQUMsRUFBUyxJQURFO0FBRVZDLE9BQUMsRUFBTyxJQUZFO0FBR1ZvUyxZQUFNLEVBQUUsSUFIRTtBQUlWQyxZQUFNLEVBQUU7QUFKRSxLQUFiO0FBT0EsVUFBSy9NLE9BQUwsR0FBZSxJQUFJL0IsUUFBSixFQUFmO0FBRUEsVUFBS3VFLE1BQUwsQ0FBWTdILEtBQVosR0FBcUIsTUFBS1IsT0FBTCxDQUFhUSxLQUFsQztBQUNBLFVBQUs2SCxNQUFMLENBQVk1SCxNQUFaLEdBQXFCLE1BQUtULE9BQUwsQ0FBYVMsTUFBbEM7QUFFQSxRQUFNQyxFQUFFLEdBQUcsTUFBS1AsT0FBaEI7QUFFQU8sTUFBRSxDQUFDbVMsU0FBSCxDQUFhblMsRUFBRSxDQUFDb1MsU0FBaEIsRUFBMkJwUyxFQUFFLENBQUNxUyxtQkFBOUI7QUFDQXJTLE1BQUUsQ0FBQ3NTLE1BQUgsQ0FBVXRTLEVBQUUsQ0FBQ3VTLEtBQWI7QUFFQSxVQUFLcFMsT0FBTCxHQUFlLE1BQUsrQixhQUFMLENBQ2QsTUFBS2QsWUFBTCxDQUFrQixxQkFBbEIsQ0FEYyxFQUVaLE1BQUtBLFlBQUwsQ0FBa0IscUJBQWxCLENBRlksQ0FBZjtBQUtBLFVBQUtvUixjQUFMLEdBQXNCLE1BQUt0USxhQUFMLENBQ3JCLE1BQUtkLFlBQUwsQ0FBa0Isc0JBQWxCLENBRHFCLEVBRW5CLE1BQUtBLFlBQUwsQ0FBa0Isc0JBQWxCLENBRm1CLENBQXRCO0FBS0EsVUFBS29OLGdCQUFMLEdBQTBCeE8sRUFBRSxDQUFDeVMsaUJBQUgsQ0FBcUIsTUFBS3RTLE9BQTFCLEVBQW1DLFlBQW5DLENBQTFCO0FBQ0EsVUFBS3lQLGdCQUFMLEdBQTBCNVAsRUFBRSxDQUFDeVMsaUJBQUgsQ0FBcUIsTUFBS3RTLE9BQTFCLEVBQW1DLFlBQW5DLENBQTFCO0FBRUEsVUFBS3VTLGtCQUFMLEdBQTBCMVMsRUFBRSxDQUFDMlMsa0JBQUgsQ0FBc0IsTUFBS3hTLE9BQTNCLEVBQW9DLGNBQXBDLENBQTFCO0FBQ0EsVUFBS2tRLGFBQUwsR0FBMEJyUSxFQUFFLENBQUMyUyxrQkFBSCxDQUFzQixNQUFLeFMsT0FBM0IsRUFBb0MsU0FBcEMsQ0FBMUI7QUFFQSxVQUFLeVMsZUFBTCxHQUF5QjVTLEVBQUUsQ0FBQ3lTLGlCQUFILENBQXFCLE1BQUtELGNBQTFCLEVBQTBDLFlBQTFDLENBQXpCO0FBQ0EsVUFBS0ssaUJBQUwsR0FBeUI3UyxFQUFFLENBQUMyUyxrQkFBSCxDQUFzQixNQUFLSCxjQUEzQixFQUEyQyxjQUEzQyxDQUF6QjtBQUNBLFVBQUtNLFlBQUwsR0FBeUI5UyxFQUFFLENBQUMyUyxrQkFBSCxDQUFzQixNQUFLSCxjQUEzQixFQUEyQyxTQUEzQyxDQUF6QjtBQUVBLFVBQUsxQixjQUFMLEdBQXNCOVEsRUFBRSxDQUFDK1MsWUFBSCxFQUF0QjtBQUNBLFVBQUtoRCxjQUFMLEdBQXNCL1AsRUFBRSxDQUFDK1MsWUFBSCxFQUF0QjtBQUVBL1MsTUFBRSxDQUFDNlAsVUFBSCxDQUFjN1AsRUFBRSxDQUFDOFAsWUFBakIsRUFBK0IsTUFBS0MsY0FBcEM7QUFDQS9QLE1BQUUsQ0FBQ2dRLFVBQUgsQ0FBY2hRLEVBQUUsQ0FBQzhQLFlBQWpCLEVBQStCLElBQUlHLFlBQUosQ0FBaUIsQ0FDL0MsR0FEK0MsRUFDekMsR0FEeUMsRUFFL0MsR0FGK0MsRUFFekMsR0FGeUMsRUFHL0MsR0FIK0MsRUFHekMsR0FIeUMsRUFJL0MsR0FKK0MsRUFJekMsR0FKeUMsRUFLL0MsR0FMK0MsRUFLekMsR0FMeUMsRUFNL0MsR0FOK0MsRUFNekMsR0FOeUMsQ0FBakIsQ0FBL0IsRUFPSWpRLEVBQUUsQ0FBQ2dULFdBUFA7QUFTQWhULE1BQUUsQ0FBQ0MsUUFBSCxDQUFZLENBQVosRUFBZSxDQUFmLEVBQWtCRCxFQUFFLENBQUNNLE1BQUgsQ0FBVVIsS0FBNUIsRUFBbUNFLEVBQUUsQ0FBQ00sTUFBSCxDQUFVUCxNQUE3QztBQUVBb0ksWUFBUSxDQUFDN0IsZ0JBQVQsQ0FDQyxXQURELEVBQ2MsVUFBQ3FDLEtBQUQsRUFBUztBQUNyQixZQUFLcUosS0FBTCxDQUFXcFMsQ0FBWCxHQUFlK0ksS0FBSyxDQUFDc0ssT0FBckI7QUFDQSxZQUFLakIsS0FBTCxDQUFXblMsQ0FBWCxHQUFlOEksS0FBSyxDQUFDdUssT0FBckIsQ0FGcUIsQ0FJckI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQVRGO0FBWUEsVUFBSzVOLFFBQUwsR0FBZ0I7QUFDZlksWUFBTSxFQUFLLElBREk7QUFFYmlOLFlBQU0sRUFBRyxJQUZJO0FBR2I1TixhQUFPLEVBQUUsSUFISTtBQUliTyxhQUFPLEVBQUUsSUFKSTtBQUtiTCxrQkFBWSxFQUFFLElBTEQ7QUFNYkcsa0JBQVksRUFBRTtBQU5ELEtBQWhCO0FBU0EsVUFBS04sUUFBTCxHQUFnQjRGLG1CQUFTQyxZQUFULENBQXNCLE1BQUs3RixRQUEzQixDQUFoQjtBQUVBLFFBQUk4TixTQUFTLEdBQUcsS0FBaEI7QUFDQSxRQUFJQyxRQUFRLEdBQUksRUFBaEIsQ0FuRkQsQ0FxRkM7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7O0FBRUEsVUFBS0MsVUFBTCxHQUFtQixJQUFJdEgsc0JBQUosZ0NBQXFCMUgsR0FBckIsQ0FBbkI7QUFDQSxVQUFLaVAsV0FBTCxHQUFtQixJQUFJdkgsc0JBQUosZ0NBQXFCMUgsR0FBckIsRUFBMEIsQ0FBMUIsQ0FBbkI7QUFFQSxRQUFNa1AsQ0FBQyxHQUFHLElBQVY7O0FBRUEsU0FBSSxJQUFNaE8sQ0FBVixJQUFlaU8sS0FBSyxDQUFDLENBQUQsQ0FBTCxDQUFTQyxJQUFULEVBQWYsRUFDQTtBQUNDLFVBQU1DLE1BQU0sR0FBRyxJQUFJNUgsY0FBSixDQUFXLFlBQVgsQ0FBZjtBQUVBNEgsWUFBTSxDQUFDL1QsQ0FBUCxHQUFZNEYsQ0FBQyxHQUFHLEVBQUwsR0FBV2dPLENBQXRCO0FBQ0FHLFlBQU0sQ0FBQzlULENBQVAsR0FBVzJJLElBQUksQ0FBQ29MLEtBQUwsQ0FBWXBPLENBQUMsR0FBRyxFQUFMLEdBQVdnTyxDQUF0QixJQUEyQixFQUF0Qzs7QUFFQSxZQUFLck8sT0FBTCxDQUFhRCxHQUFiLENBQWlCLE1BQUtvTyxVQUF0Qjs7QUFDQSxZQUFLbk8sT0FBTCxDQUFhRCxHQUFiLENBQWlCLE1BQUtxTyxXQUF0Qjs7QUFFQSxZQUFLcE8sT0FBTCxDQUFhRCxHQUFiLENBQWlCeU8sTUFBakI7QUFDQSxLQTlNRixDQWlOQzs7O0FBak5EO0FBbU5DOzs7O1dBRUQsb0JBQ0E7QUFDQyxVQUFHLEtBQUtyTyxRQUFMLENBQWNZLE1BQWQsS0FBeUIsSUFBNUIsRUFDQTtBQUNDLGVBQU8sS0FBUDtBQUNBOztBQUVELFdBQUtaLFFBQUwsQ0FBY1ksTUFBZCxHQUF3QixJQUF4QjtBQUNBLFdBQUtaLFFBQUwsQ0FBYzZOLE1BQWQsR0FBd0IsSUFBeEI7QUFDQSxXQUFLN04sUUFBTCxDQUFjQyxPQUFkLEdBQXdCLElBQXhCO0FBQ0EsV0FBS0QsUUFBTCxDQUFjUSxPQUFkLEdBQXdCLElBQXhCO0FBRUEsYUFBTyxJQUFQO0FBQ0E7OztXQUVELGdCQUNBO0FBQ0MsVUFBTTlGLEVBQUUsR0FBRyxLQUFLUCxPQUFoQjs7QUFFQTs7QUFFQU8sUUFBRSxDQUFDNlQsU0FBSCxDQUNDLEtBQUtuQixrQkFETixFQUVHLEtBQUsvSyxNQUFMLENBQVk3SCxLQUZmLEVBR0csS0FBSzZILE1BQUwsQ0FBWTVILE1BSGY7QUFNQSxVQUFJb0YsT0FBTyxHQUFHLEtBQUtBLE9BQUwsQ0FBYStCLEtBQWIsRUFBZDtBQUVBL0IsYUFBTyxDQUFDYixHQUFSLENBQVksVUFBQXdQLENBQUMsRUFBSTtBQUNoQkEsU0FBQyxDQUFDeEcsQ0FBRixHQUFNd0csQ0FBQyxDQUFDalUsQ0FBUjtBQUNBLE9BRkQ7QUFJQXNGLGFBQU8sQ0FBQzRPLElBQVIsQ0FBYSxVQUFDaE0sQ0FBRCxFQUFHQyxDQUFILEVBQU87QUFDbkIsWUFBSUQsQ0FBQyxZQUFZaUUsc0JBQWQsSUFBNkIsRUFBRWhFLENBQUMsWUFBWWdFLHNCQUFmLENBQWhDLEVBQ0E7QUFDQyxpQkFBTyxDQUFDLENBQVI7QUFDQTs7QUFFRCxZQUFJaEUsQ0FBQyxZQUFZZ0Usc0JBQWQsSUFBNkIsRUFBRWpFLENBQUMsWUFBWWlFLHNCQUFmLENBQWhDLEVBQ0E7QUFDQyxpQkFBTyxDQUFQO0FBQ0E7O0FBRUQsWUFBR2pFLENBQUMsQ0FBQ3VGLENBQUYsS0FBUXJFLFNBQVgsRUFDQTtBQUNDLGlCQUFPLENBQUMsQ0FBUjtBQUNBOztBQUNELFlBQUdqQixDQUFDLENBQUNzRixDQUFGLEtBQVFyRSxTQUFYLEVBQ0E7QUFDQyxpQkFBTyxDQUFQO0FBQ0E7O0FBQ0QsZUFBT2xCLENBQUMsQ0FBQ3VGLENBQUYsR0FBTXRGLENBQUMsQ0FBQ3NGLENBQWY7QUFDQSxPQXBCRDtBQXNCQW5JLGFBQU8sQ0FBQ2IsR0FBUixDQUFZLFVBQUF3UCxDQUFDO0FBQUEsZUFBSUEsQ0FBQyxDQUFDck0sSUFBRixFQUFKO0FBQUEsT0FBYjs7QUFFQSxVQUFHLEtBQUtuQyxRQUFMLENBQWNZLE1BQWQsS0FBeUIsSUFBNUIsRUFDQTtBQUNDO0FBQ0E7O0FBRURsRyxRQUFFLENBQUNFLFVBQUgsQ0FBYyxLQUFLc1MsY0FBbkI7QUFFQXhTLFFBQUUsQ0FBQzZULFNBQUgsQ0FDQyxLQUFLaEIsaUJBRE4sRUFFRzdTLEVBQUUsQ0FBQ00sTUFBSCxDQUFVUixLQUZiLEVBR0dFLEVBQUUsQ0FBQ00sTUFBSCxDQUFVUCxNQUhiO0FBTUEsVUFBSWlVLElBQUksR0FBRyxLQUFLMU8sUUFBTCxDQUFjRyxZQUF6QjtBQUNBLFVBQUl3TyxJQUFJLEdBQUcsS0FBSzNPLFFBQUwsQ0FBY0MsT0FBekI7O0FBRUEsVUFBRyxLQUFLRCxRQUFMLENBQWNDLE9BQWQsR0FBd0J5TyxJQUEzQixFQUNBO0FBQ0NBLFlBQUksR0FBRyxLQUFLMU8sUUFBTCxDQUFjQyxPQUFyQjtBQUNBME8sWUFBSSxHQUFHLEtBQUszTyxRQUFMLENBQWNHLFlBQXJCO0FBQ0E7O0FBRUQsVUFBSXlPLElBQUksR0FBRyxLQUFLNU8sUUFBTCxDQUFjTSxZQUF6QjtBQUNBLFVBQUl1TyxJQUFJLEdBQUcsS0FBSzdPLFFBQUwsQ0FBY1EsT0FBekI7O0FBRUEsVUFBRyxLQUFLUixRQUFMLENBQWNRLE9BQWQsR0FBd0JvTyxJQUEzQixFQUNBO0FBQ0NBLFlBQUksR0FBRyxLQUFLNU8sUUFBTCxDQUFjUSxPQUFyQjtBQUNBcU8sWUFBSSxHQUFHLEtBQUs3TyxRQUFMLENBQWNNLFlBQXJCO0FBQ0E7O0FBRURxTyxVQUFJLElBQUksQ0FBUjtBQUNBRSxVQUFJLElBQUksQ0FBUjtBQUVBLFVBQUlkLFFBQVEsR0FBRyxFQUFmO0FBQ0EsVUFBSWUsT0FBTyxHQUFJZixRQUFRLEdBQUcsS0FBSzFULFNBQS9CLENBNUVELENBOEVDOztBQUVBLFdBQUt3USxZQUFMLENBQ0U2RCxJQUFJLEdBQUdJLE9BQVIsR0FDRyxLQUFLek0sTUFBTCxDQUFZL0gsQ0FBWixHQUFnQixLQUFLRCxTQUR4QixHQUVJLEtBQUtMLE9BQUwsQ0FBYVEsS0FBYixHQUFvQixDQUZ4QixHQUdJc1UsT0FBTyxHQUFFLENBSmQsRUFLSUYsSUFBSSxHQUFHRSxPQUFSLEdBQ0MsS0FBS3pNLE1BQUwsQ0FBWTlILENBQVosR0FBZ0IsS0FBS0YsU0FEdEIsR0FFRSxLQUFLTCxPQUFMLENBQWFTLE1BQWIsR0FBcUIsQ0FGdkIsR0FHRXFVLE9BQU8sR0FBRSxDQVJkLEVBU0csQ0FBQ0gsSUFBSSxHQUFHRCxJQUFSLElBQWdCSSxPQVRuQixFQVVHLENBQUNELElBQUksR0FBR0QsSUFBUixJQUFnQkUsT0FWbkI7QUFhQXhTLGFBQU8sQ0FBQzRKLEdBQVI7QUFFQXhMLFFBQUUsQ0FBQ3NRLFVBQUgsQ0FBY3RRLEVBQUUsQ0FBQ3VRLFNBQWpCLEVBQTRCLENBQTVCLEVBQStCLENBQS9CO0FBQ0E7OztXQUVELGdCQUFPM1EsQ0FBUCxFQUFVQyxDQUFWLEVBQ0E7QUFDQ0QsT0FBQyxHQUFHQSxDQUFDLElBQUksS0FBS04sT0FBTCxDQUFhUSxLQUF0QjtBQUNBRCxPQUFDLEdBQUdBLENBQUMsSUFBSSxLQUFLUCxPQUFMLENBQWFTLE1BQXRCO0FBRUEsV0FBSzRILE1BQUwsQ0FBWTdILEtBQVosR0FBcUJGLENBQXJCO0FBQ0EsV0FBSytILE1BQUwsQ0FBWTVILE1BQVosR0FBcUJGLENBQXJCO0FBRUEsV0FBS3lULFVBQUwsQ0FBZ0J0TixNQUFoQixDQUNDd0MsSUFBSSxDQUFDNkwsS0FBTCxDQUFXelUsQ0FBQyxHQUFHLENBQUosR0FBUSxFQUFuQixLQUE0QixJQUFJLEtBQUtELFNBQXJDLENBREQsRUFFRzZJLElBQUksQ0FBQzZMLEtBQUwsQ0FBV3hVLENBQUMsR0FBRyxDQUFKLEdBQVEsRUFBbkIsS0FBMEIsSUFBSSxLQUFLRixTQUFuQyxDQUZIO0FBS0EsV0FBSzRULFdBQUwsQ0FBaUJ2TixNQUFqQixDQUNDd0MsSUFBSSxDQUFDNkwsS0FBTCxDQUFXelUsQ0FBQyxHQUFHLENBQUosR0FBUSxFQUFuQixLQUE0QixJQUFJLEtBQUtELFNBQXJDLENBREQsRUFFRzZJLElBQUksQ0FBQzZMLEtBQUwsQ0FBV3hVLENBQUMsR0FBRyxDQUFKLEdBQVEsRUFBbkIsS0FBMEIsSUFBSSxLQUFLRixTQUFuQyxDQUZIOztBQUtBLDhFQUFhQyxDQUFiLEVBQWdCQyxDQUFoQjs7QUFFQSxXQUFLOEgsTUFBTCxDQUFZN0gsS0FBWixHQUFzQkYsQ0FBQyxHQUFHLEtBQUtELFNBQS9CO0FBQ0EsV0FBS2dJLE1BQUwsQ0FBWTVILE1BQVosR0FBc0JGLENBQUMsR0FBRyxLQUFLRixTQUEvQjtBQUNBOzs7V0FFRCxzQkFBYUMsQ0FBYixFQUFnQkMsQ0FBaEIsRUFBbUJDLEtBQW5CLEVBQTBCQyxNQUExQixFQUNBO0FBQ0MsVUFBTUMsRUFBRSxHQUFHLEtBQUtQLE9BQWhCO0FBRUFPLFFBQUUsQ0FBQzZQLFVBQUgsQ0FBYzdQLEVBQUUsQ0FBQzhQLFlBQWpCLEVBQStCLEtBQUtnQixjQUFwQztBQUVBOVEsUUFBRSxDQUFDdU8sbUJBQUgsQ0FDQyxLQUFLcUUsZUFETixFQUVHLENBRkgsRUFHRzVTLEVBQUUsQ0FBQ3lPLEtBSE4sRUFJRyxLQUpILEVBS0csQ0FMSCxFQU1HLENBTkg7QUFTQSxVQUFJc0MsRUFBRSxHQUFHblIsQ0FBVDtBQUNBLFVBQUlvUixFQUFFLEdBQUdwUixDQUFDLEdBQUdFLEtBQWI7QUFDQSxVQUFJbVIsRUFBRSxHQUFHcFIsQ0FBVDtBQUNBLFVBQUlxUixFQUFFLEdBQUdyUixDQUFDLEdBQUdFLE1BQWI7QUFFQUMsUUFBRSxDQUFDZ1EsVUFBSCxDQUFjaFEsRUFBRSxDQUFDOFAsWUFBakIsRUFBK0IsSUFBSUcsWUFBSixDQUFpQixDQUMvQ2MsRUFEK0MsRUFDM0NFLEVBRDJDLEVBRS9DRCxFQUYrQyxFQUUzQ0MsRUFGMkMsRUFHL0NGLEVBSCtDLEVBRzNDRyxFQUgyQyxFQUkvQ0gsRUFKK0MsRUFJM0NHLEVBSjJDLEVBSy9DRixFQUwrQyxFQUszQ0MsRUFMMkMsRUFNL0NELEVBTitDLEVBTTNDRSxFQU4yQyxDQUFqQixDQUEvQixFQU9JbFIsRUFBRSxDQUFDa1EsV0FQUDtBQVFBOzs7O0VBOVgrQjdRLFdBQUtHLE1BQUwsQ0FBWTtBQUFDbUksUUFBTSxFQUFOQTtBQUFELENBQVosQzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQ2JwQmpELFc7QUFFWix5QkFDQTtBQUFBOztBQUFBOztBQUNDLFNBQUs0UCxRQUFMLEdBQWdCLGtCQUFoQjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsbUJBQWhCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQixFQUFoQjtBQUNBLFNBQUszSSxNQUFMLEdBQWdCLEVBQWhCO0FBQ0EsU0FBSy9MLEtBQUwsR0FBZ0IsQ0FBaEI7QUFDQSxTQUFLQyxNQUFMLEdBQWdCLENBQWhCO0FBRUEsUUFBSTBVLE9BQU8sR0FBSyxJQUFJQyxPQUFKLENBQVksS0FBS0gsUUFBakIsQ0FBaEI7QUFFQSxRQUFJSSxXQUFXLEdBQUdDLEtBQUssQ0FBQ0gsT0FBRCxDQUFMLENBQ2pCcEYsSUFEaUIsQ0FDWixVQUFDd0YsUUFBRDtBQUFBLGFBQVlBLFFBQVEsQ0FBQ0MsSUFBVCxFQUFaO0FBQUEsS0FEWSxFQUVqQnpGLElBRmlCLENBRVosVUFBQzBGLEtBQUQ7QUFBQSxhQUFXLEtBQUksQ0FBQ0EsS0FBTCxHQUFhQSxLQUF4QjtBQUFBLEtBRlksQ0FBbEI7QUFJQSxRQUFJQyxXQUFXLEdBQUcsSUFBSXBFLE9BQUosQ0FBWSxVQUFDaUIsTUFBRCxFQUFVO0FBQ3ZDLFdBQUksQ0FBQ25DLEtBQUwsR0FBb0IsSUFBSXFDLEtBQUosRUFBcEI7QUFDQSxXQUFJLENBQUNyQyxLQUFMLENBQVdrQyxHQUFYLEdBQW9CLEtBQUksQ0FBQzBDLFFBQXpCOztBQUNBLFdBQUksQ0FBQzVFLEtBQUwsQ0FBV3VGLE1BQVgsR0FBb0IsWUFBSTtBQUN2QnBELGNBQU07QUFDTixPQUZEO0FBR0EsS0FOaUIsQ0FBbEI7QUFRQSxTQUFLekMsS0FBTCxHQUFhd0IsT0FBTyxDQUFDQyxHQUFSLENBQVksQ0FBQzhELFdBQUQsRUFBY0ssV0FBZCxDQUFaLEVBQ1ozRixJQURZLENBQ1A7QUFBQSxhQUFNLEtBQUksQ0FBQzZGLFlBQUwsRUFBTjtBQUFBLEtBRE8sRUFFWjdGLElBRlksQ0FFUDtBQUFBLGFBQU0sS0FBTjtBQUFBLEtBRk8sQ0FBYjtBQUdBOzs7O1dBRUQsd0JBQ0E7QUFBQTs7QUFDQyxVQUFHLENBQUMsS0FBSzBGLEtBQU4sSUFBZSxDQUFDLEtBQUtBLEtBQUwsQ0FBV2xKLE1BQTlCLEVBQ0E7QUFDQztBQUNBOztBQUVELFVBQU12TCxNQUFNLEdBQUk2SCxRQUFRLENBQUNnTixhQUFULENBQXVCLFFBQXZCLENBQWhCO0FBRUE3VSxZQUFNLENBQUNSLEtBQVAsR0FBZ0IsS0FBSzRQLEtBQUwsQ0FBVzVQLEtBQTNCO0FBQ0FRLFlBQU0sQ0FBQ1AsTUFBUCxHQUFnQixLQUFLMlAsS0FBTCxDQUFXM1AsTUFBM0I7QUFFQSxVQUFNTixPQUFPLEdBQUdhLE1BQU0sQ0FBQ1osVUFBUCxDQUFrQixJQUFsQixDQUFoQjtBQUVBRCxhQUFPLENBQUMyVixTQUFSLENBQWtCLEtBQUsxRixLQUF2QixFQUE4QixDQUE5QixFQUFpQyxDQUFqQztBQUVBLFVBQU0yRixhQUFhLEdBQUcsRUFBdEI7O0FBZkQsaUNBaUJTN1AsQ0FqQlQ7QUFtQkUsWUFBTThQLFNBQVMsR0FBSW5OLFFBQVEsQ0FBQ2dOLGFBQVQsQ0FBdUIsUUFBdkIsQ0FBbkI7QUFFQUcsaUJBQVMsQ0FBQ3hWLEtBQVYsR0FBbUIsTUFBSSxDQUFDaVYsS0FBTCxDQUFXbEosTUFBWCxDQUFrQnJHLENBQWxCLEVBQXFCK0osS0FBckIsQ0FBMkJpRSxDQUE5QztBQUNBOEIsaUJBQVMsQ0FBQ3ZWLE1BQVYsR0FBbUIsTUFBSSxDQUFDZ1YsS0FBTCxDQUFXbEosTUFBWCxDQUFrQnJHLENBQWxCLEVBQXFCK0osS0FBckIsQ0FBMkJnRyxDQUE5QztBQUVBLFlBQU1DLFVBQVUsR0FBR0YsU0FBUyxDQUFDNVYsVUFBVixDQUFxQixJQUFyQixDQUFuQjs7QUFFQSxZQUFHLE1BQUksQ0FBQ3FWLEtBQUwsQ0FBV2xKLE1BQVgsQ0FBa0JyRyxDQUFsQixFQUFxQitKLEtBQXhCLEVBQ0E7QUFDQ2lHLG9CQUFVLENBQUNDLFlBQVgsQ0FBd0JoVyxPQUFPLENBQUNpVyxZQUFSLENBQ3ZCLE1BQUksQ0FBQ1gsS0FBTCxDQUFXbEosTUFBWCxDQUFrQnJHLENBQWxCLEVBQXFCK0osS0FBckIsQ0FBMkIzUCxDQURKLEVBRXJCLE1BQUksQ0FBQ21WLEtBQUwsQ0FBV2xKLE1BQVgsQ0FBa0JyRyxDQUFsQixFQUFxQitKLEtBQXJCLENBQTJCMVAsQ0FGTixFQUdyQixNQUFJLENBQUNrVixLQUFMLENBQVdsSixNQUFYLENBQWtCckcsQ0FBbEIsRUFBcUIrSixLQUFyQixDQUEyQmlFLENBSE4sRUFJckIsTUFBSSxDQUFDdUIsS0FBTCxDQUFXbEosTUFBWCxDQUFrQnJHLENBQWxCLEVBQXFCK0osS0FBckIsQ0FBMkJnRyxDQUpOLENBQXhCLEVBS0csQ0FMSCxFQUtNLENBTE47QUFNQTs7QUFFRCxZQUFHLE1BQUksQ0FBQ1IsS0FBTCxDQUFXbEosTUFBWCxDQUFrQnJHLENBQWxCLEVBQXFCbVEsSUFBeEIsRUFDQTtBQUNDSCxvQkFBVSxDQUFDSSxTQUFYLEdBQXVCLE1BQUksQ0FBQ2IsS0FBTCxDQUFXbEosTUFBWCxDQUFrQnJHLENBQWxCLEVBQXFCcVEsS0FBckIsSUFBOEIsT0FBckQ7QUFFQUwsb0JBQVUsQ0FBQ00sSUFBWCxHQUFrQixNQUFJLENBQUNmLEtBQUwsQ0FBV2xKLE1BQVgsQ0FBa0JyRyxDQUFsQixFQUFxQnNRLElBQXJCLGNBQ1gsTUFBSSxDQUFDZixLQUFMLENBQVdsSixNQUFYLENBQWtCckcsQ0FBbEIsRUFBcUIrSixLQUFyQixDQUEyQmdHLENBRGhCLGtCQUFsQjtBQUVBQyxvQkFBVSxDQUFDTyxTQUFYLEdBQXVCLFFBQXZCO0FBRUFQLG9CQUFVLENBQUNRLFFBQVgsQ0FDQyxNQUFJLENBQUNqQixLQUFMLENBQVdsSixNQUFYLENBQWtCckcsQ0FBbEIsRUFBcUJtUSxJQUR0QixFQUVHLE1BQUksQ0FBQ1osS0FBTCxDQUFXbEosTUFBWCxDQUFrQnJHLENBQWxCLEVBQXFCK0osS0FBckIsQ0FBMkJpRSxDQUEzQixHQUErQixDQUZsQyxFQUdHLE1BQUksQ0FBQ3VCLEtBQUwsQ0FBV2xKLE1BQVgsQ0FBa0JyRyxDQUFsQixFQUFxQitKLEtBQXJCLENBQTJCZ0csQ0FIOUIsRUFJRyxNQUFJLENBQUNSLEtBQUwsQ0FBV2xKLE1BQVgsQ0FBa0JyRyxDQUFsQixFQUFxQitKLEtBQXJCLENBQTJCaUUsQ0FKOUI7QUFPQWdDLG9CQUFVLENBQUNPLFNBQVgsR0FBdUIsSUFBdkI7QUFDQVAsb0JBQVUsQ0FBQ00sSUFBWCxHQUF1QixJQUF2QjtBQUNBOztBQUVEVCxxQkFBYSxDQUFDaE8sSUFBZCxDQUFtQixJQUFJdUosT0FBSixDQUFZLFVBQUNpQixNQUFELEVBQVU7QUFDeEN5RCxtQkFBUyxDQUFDVyxNQUFWLENBQWlCLFVBQUNDLElBQUQsRUFBUTtBQUN4QixrQkFBSSxDQUFDckssTUFBTCxDQUFZLE1BQUksQ0FBQ2tKLEtBQUwsQ0FBV2xKLE1BQVgsQ0FBa0JyRyxDQUFsQixFQUFxQjJRLFFBQWpDLElBQTZDQyxHQUFHLENBQUNDLGVBQUosQ0FBb0JILElBQXBCLENBQTdDO0FBRUFyRSxrQkFBTSxDQUFDLE1BQUksQ0FBQ2hHLE1BQUwsQ0FBWSxNQUFJLENBQUNrSixLQUFMLENBQVdsSixNQUFYLENBQWtCckcsQ0FBbEIsRUFBcUIyUSxRQUFqQyxDQUFELENBQU47QUFDQSxXQUpEO0FBS0EsU0FOa0IsQ0FBbkIsRUF2REYsQ0FnRUU7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBM0VGOztBQWlCQyxXQUFJLElBQUkzUSxDQUFSLElBQWEsS0FBS3VQLEtBQUwsQ0FBV2xKLE1BQXhCLEVBQ0E7QUFBQSxjQURRckcsQ0FDUjtBQTBEQzs7QUFFRCxhQUFPb0wsT0FBTyxDQUFDQyxHQUFSLENBQVl3RSxhQUFaLENBQVA7QUFDQTs7O1dBRUQscUJBQVljLFFBQVosRUFDQTtBQUNDLGFBQU8sS0FBSzNCLFFBQUwsQ0FBYzJCLFFBQWQsQ0FBUDtBQUNBOzs7V0FFRCxrQkFBU0EsUUFBVCxFQUNBO0FBQ0MsYUFBTyxLQUFLdEssTUFBTCxDQUFZc0ssUUFBWixDQUFQO0FBQ0E7OztXQUVELG1CQUFVM0YsYUFBVixFQUNBO0FBQUE7O0FBQ0MsVUFBR2lELEtBQUssQ0FBQzZDLE9BQU4sQ0FBYzlGLGFBQWQsQ0FBSCxFQUNBO0FBQ0MsZUFBT0EsYUFBYSxDQUFDbE0sR0FBZCxDQUFrQixVQUFDc0YsSUFBRDtBQUFBLGlCQUFRLE1BQUksQ0FBQzRGLFFBQUwsQ0FBYzVGLElBQWQsQ0FBUjtBQUFBLFNBQWxCLENBQVA7QUFDQTs7QUFFRCxhQUFPLEtBQUsyTSxpQkFBTCxDQUF1Qi9GLGFBQXZCLENBQVA7QUFDQTs7O1dBRUQsMkJBQWtCZ0csTUFBbEIsRUFDQTtBQUNDLFVBQUkzSyxNQUFNLEdBQUcsRUFBYjs7QUFFQSxXQUFJLElBQUlyRyxDQUFSLElBQWEsS0FBS3FHLE1BQWxCLEVBQ0E7QUFDQyxZQUFHckcsQ0FBQyxDQUFDM0UsU0FBRixDQUFZLENBQVosRUFBZTJWLE1BQU0sQ0FBQ2xQLE1BQXRCLE1BQWtDa1AsTUFBckMsRUFDQTtBQUNDO0FBQ0E7O0FBRUQzSyxjQUFNLENBQUN4RSxJQUFQLENBQVksS0FBS3dFLE1BQUwsQ0FBWXJHLENBQVosQ0FBWjtBQUNBOztBQUVELGFBQU9xRyxNQUFQO0FBQ0E7OztXQUVELHFCQUFtQkksSUFBbkIsRUFBeUJvQixRQUF6QixFQUNBO0FBQ0MsVUFBTXJOLEVBQUUsR0FBR2lNLElBQUksQ0FBQ3hNLE9BQWhCOztBQUVBLFVBQUcsQ0FBQyxLQUFLZ1gsZUFBVCxFQUNBO0FBQ0MsYUFBS0EsZUFBTCxHQUF1QixFQUF2QjtBQUNBOztBQUVELFVBQUcsS0FBS0EsZUFBTCxDQUFxQnBKLFFBQXJCLENBQUgsRUFDQTtBQUNDLGVBQU8sS0FBS29KLGVBQUwsQ0FBcUJwSixRQUFyQixDQUFQO0FBQ0E7O0FBRUQsYUFBTyxLQUFLb0osZUFBTCxDQUFxQnBKLFFBQXJCLElBQWlDLEtBQUsrRCxTQUFMLENBQWUvRCxRQUFmLEVBQ3ZDZ0MsSUFEdUMsQ0FDbEMsVUFBQ0ssS0FBRCxFQUFTO0FBQ2QsWUFBTWhCLE9BQU8sR0FBRzFPLEVBQUUsQ0FBQzJPLGFBQUgsRUFBaEI7QUFFQTNPLFVBQUUsQ0FBQzRPLFdBQUgsQ0FBZTVPLEVBQUUsQ0FBQzZPLFVBQWxCLEVBQThCSCxPQUE5QjtBQUVBMU8sVUFBRSxDQUFDcVIsYUFBSCxDQUFpQnJSLEVBQUUsQ0FBQzZPLFVBQXBCLEVBQWdDN08sRUFBRSxDQUFDc1IsY0FBbkMsRUFBbUR0UixFQUFFLENBQUN1UixhQUF0RDtBQUNBdlIsVUFBRSxDQUFDcVIsYUFBSCxDQUFpQnJSLEVBQUUsQ0FBQzZPLFVBQXBCLEVBQWdDN08sRUFBRSxDQUFDd1IsY0FBbkMsRUFBbUR4UixFQUFFLENBQUN1UixhQUF0RDtBQUNBdlIsVUFBRSxDQUFDcVIsYUFBSCxDQUFpQnJSLEVBQUUsQ0FBQzZPLFVBQXBCLEVBQWdDN08sRUFBRSxDQUFDeVIsa0JBQW5DLEVBQXVEelIsRUFBRSxDQUFDMFIsT0FBMUQ7QUFDQTFSLFVBQUUsQ0FBQ3FSLGFBQUgsQ0FBaUJyUixFQUFFLENBQUM2TyxVQUFwQixFQUFnQzdPLEVBQUUsQ0FBQzJSLGtCQUFuQyxFQUF1RDNSLEVBQUUsQ0FBQzBSLE9BQTFEO0FBRUExUixVQUFFLENBQUNnUCxVQUFILENBQ0NoUCxFQUFFLENBQUM2TyxVQURKLEVBRUcsQ0FGSCxFQUdHN08sRUFBRSxDQUFDaVAsSUFITixFQUlHalAsRUFBRSxDQUFDaVAsSUFKTixFQUtHalAsRUFBRSxDQUFDa1AsYUFMTixFQU1HUSxLQU5IO0FBU0EsZUFBTztBQUFDQSxlQUFLLEVBQUxBLEtBQUQ7QUFBUWhCLGlCQUFPLEVBQVBBO0FBQVIsU0FBUDtBQUNBLE9BckJ1QyxDQUF4QztBQXNCQTs7O1dBRUQsbUJBQWlCa0QsR0FBakIsRUFDQTtBQUNDLFVBQUcsQ0FBQyxLQUFLOEUsYUFBVCxFQUNBO0FBQ0MsYUFBS0EsYUFBTCxHQUFxQixFQUFyQjtBQUNBOztBQUVELFVBQUcsS0FBS0EsYUFBTCxDQUFtQjlFLEdBQW5CLENBQUgsRUFDQTtBQUNDLGVBQU8sS0FBSzhFLGFBQUwsQ0FBbUI5RSxHQUFuQixDQUFQO0FBQ0E7O0FBRUQsV0FBSzhFLGFBQUwsQ0FBbUI5RSxHQUFuQixJQUEwQixJQUFJaEIsT0FBSixDQUFZLFVBQUNpQixNQUFELEVBQVNDLE1BQVQsRUFBa0I7QUFDdkQsWUFBTXBDLEtBQUssR0FBRyxJQUFJcUMsS0FBSixFQUFkO0FBQ0FyQyxhQUFLLENBQUNrQyxHQUFOLEdBQWNBLEdBQWQ7QUFDQWxDLGFBQUssQ0FBQ3BKLGdCQUFOLENBQXVCLE1BQXZCLEVBQStCLFVBQUNxQyxLQUFELEVBQVM7QUFDdkNrSixnQkFBTSxDQUFDbkMsS0FBRCxDQUFOO0FBQ0EsU0FGRDtBQUdBLE9BTnlCLENBQTFCO0FBUUEsYUFBTyxLQUFLZ0gsYUFBTCxDQUFtQjlFLEdBQW5CLENBQVA7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ2hORjs7QUFDQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVjOUUsTzs7Ozs7QUFHYixtQkFBWWIsSUFBWixFQUFrQjNILEdBQWxCLEVBQ0E7QUFBQTs7QUFBQSxRQUR1QnFTLEtBQ3ZCLHVFQUQrQixDQUMvQjtBQUFBLFFBRGtDQyxLQUNsQyx1RUFEMEMsQ0FDMUM7QUFBQSxRQUQ2Q0MsT0FDN0MsdUVBRHVELENBQ3ZEO0FBQUEsUUFEMERDLE9BQzFELHVFQURvRSxDQUNwRTtBQUFBLFFBRHVFNUssS0FDdkUsdUVBRCtFLENBQy9FOztBQUFBOztBQUNDO0FBRUEsVUFBS0QsSUFBTCxHQUFlQSxJQUFmO0FBQ0EsVUFBS3JNLENBQUwsR0FBZWlYLE9BQWY7QUFDQSxVQUFLaFgsQ0FBTCxHQUFlaVgsT0FBZjtBQUNBLFVBQUs1SyxLQUFMLEdBQWVBLEtBQWY7QUFFQSxVQUFLeUssS0FBTCxHQUFlQSxLQUFmO0FBQ0EsVUFBS0MsS0FBTCxHQUFlQSxLQUFmO0FBRUEsVUFBS3BLLFNBQUwsR0FBa0IsRUFBbEI7QUFDQSxVQUFLQyxVQUFMLEdBQWtCLEVBQWxCO0FBRUEsVUFBSzNNLEtBQUwsR0FBZSxNQUFLNlcsS0FBTCxHQUFhLE1BQUtuSyxTQUFqQztBQUNBLFVBQUt6TSxNQUFMLEdBQWUsTUFBSzZXLEtBQUwsR0FBYSxNQUFLbkssVUFBakM7QUFFQSxVQUFLbkksR0FBTCxHQUFXQSxHQUFYO0FBRUEsVUFBS3lTLFdBQUwsR0FBbUIsRUFBbkI7QUFFQSxRQUFNL1csRUFBRSxHQUFJaU0sSUFBSSxDQUFDeE0sT0FBakI7QUFFQSxVQUFLaVAsT0FBTCxHQUFtQjFPLEVBQUUsQ0FBQzJPLGFBQUgsRUFBbkI7QUFDQSxVQUFLcUksV0FBTCxHQUFtQixFQUFuQjtBQUVBLFVBQUtDLE1BQUwsR0FBYyxLQUFkO0FBRUFqWCxNQUFFLENBQUM0TyxXQUFILENBQWU1TyxFQUFFLENBQUM2TyxVQUFsQixFQUE4QixNQUFLSCxPQUFuQzs7QUFFQSxRQUFNSSxDQUFDLEdBQUcsU0FBSkEsQ0FBSTtBQUFBLGFBQUlDLFFBQVEsQ0FBQ3ZHLElBQUksQ0FBQ2lDLE1BQUwsS0FBYyxHQUFmLENBQVo7QUFBQSxLQUFWOztBQUVBekssTUFBRSxDQUFDZ1AsVUFBSCxDQUNDaFAsRUFBRSxDQUFDNk8sVUFESixFQUVHLENBRkgsRUFHRzdPLEVBQUUsQ0FBQ2lQLElBSE4sRUFJRyxDQUpILEVBS0csQ0FMSCxFQU1HLENBTkgsRUFPR2pQLEVBQUUsQ0FBQ2lQLElBUE4sRUFRR2pQLEVBQUUsQ0FBQ2tQLGFBUk4sRUFTRyxJQUFJQyxVQUFKLENBQWUsQ0FBQ0wsQ0FBQyxFQUFGLEVBQU1BLENBQUMsRUFBUCxFQUFXLENBQVgsRUFBYyxHQUFkLENBQWYsQ0FUSDs7QUFZQSxVQUFLcEssV0FBTCxDQUFpQjBLLEtBQWpCLENBQXVCQyxJQUF2QixDQUE0QixVQUFDQyxLQUFELEVBQVM7QUFDcEN0UCxRQUFFLENBQUM0TyxXQUFILENBQWU1TyxFQUFFLENBQUM2TyxVQUFsQixFQUE4QixNQUFLSCxPQUFuQyxFQURvQyxDQUdwQztBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsVUFBSStILGVBQWUsR0FBRyxFQUF0Qjs7QUFqQm9DLGlDQW1CNUJqUixDQW5CNEI7QUFxQm5DLFlBQUlnUCxRQUFRLFNBQVo7QUFFQSxZQUFJdE8sTUFBTSxHQUFJVixDQUFDLEdBQUcsTUFBS21SLEtBQXZCO0FBQ0EsWUFBSU8sT0FBTyxHQUFHMU8sSUFBSSxDQUFDQyxLQUFMLENBQVcsTUFBSzdJLENBQUwsR0FBUyxNQUFLNE0sU0FBekIsQ0FBZDtBQUNBLFlBQUlqSCxPQUFPLEdBQUdXLE1BQU0sR0FBR2dSLE9BQXZCO0FBRUEsWUFBSS9ELE1BQU0sR0FBSTNLLElBQUksQ0FBQ0MsS0FBTCxDQUFXakQsQ0FBQyxHQUFHLE1BQUttUixLQUFwQixDQUFkO0FBQ0EsWUFBSVEsT0FBTyxHQUFHM08sSUFBSSxDQUFDQyxLQUFMLENBQVcsTUFBSzVJLENBQUwsR0FBUyxNQUFLNE0sVUFBekIsQ0FBZDtBQUNBLFlBQUkzRyxPQUFPLEdBQUdxTixNQUFNLEdBQUdnRSxPQUF2Qjs7QUFFQSxZQUFJdEwsTUFBTSxHQUFHLE1BQUt2SCxHQUFMLENBQVM4UyxPQUFULENBQWlCN1IsT0FBakIsRUFBMEJPLE9BQTFCLEVBQW1DLE1BQUtvRyxLQUF4QyxDQUFiOztBQUVBLFlBQUd1SCxLQUFLLENBQUM2QyxPQUFOLENBQWN6SyxNQUFkLENBQUgsRUFDQTtBQUNDLGNBQUlsRyxDQUFDLEdBQUcsQ0FBUjtBQUNBLGdCQUFLcVIsV0FBTCxDQUFpQnhSLENBQWpCLElBQXNCLEVBQXRCO0FBRUFpUix5QkFBZSxDQUFDcFAsSUFBaEIsQ0FDQ3VKLE9BQU8sQ0FBQ0MsR0FBUixDQUFZaEYsTUFBTSxDQUFDdkgsR0FBUCxDQUFXLFVBQUNpTCxLQUFEO0FBQUEsbUJBQ3RCLE1BQUs3SyxXQUFMLENBQWlCOEUsV0FBakIsQ0FBNkJpRyxXQUE3QixDQUF5Q3hELElBQXpDLEVBQStDc0QsS0FBL0MsRUFBc0RGLElBQXRELENBQ0MsVUFBQ3JNLElBQUQsRUFBUTtBQUNQLG9CQUFLZ1UsV0FBTCxDQUFpQnhSLENBQWpCLEVBQW9CRyxDQUFwQixJQUF5QjNDLElBQUksQ0FBQzBMLE9BQTlCO0FBQ0EvSSxlQUFDO0FBRUQscUJBQU9pTCxPQUFPLENBQUN5RyxPQUFSLEVBQVA7QUFDQSxhQU5GLENBRHNCO0FBQUEsV0FBWCxDQUFaLENBREQ7QUFZQSxTQWpCRCxNQW1CQTtBQUNDWix5QkFBZSxDQUFDcFAsSUFBaEIsQ0FDQyxNQUFLM0MsV0FBTCxDQUFpQjhFLFdBQWpCLENBQTZCaUcsV0FBN0IsQ0FBeUN4RCxJQUF6QyxFQUErQ0osTUFBL0MsRUFBdUR3RCxJQUF2RCxDQUNDLFVBQUNyTSxJQUFELEVBQVE7QUFDUCxrQkFBS2dVLFdBQUwsQ0FBaUJ4UixDQUFqQixJQUFzQnhDLElBQUksQ0FBQzBMLE9BQTNCO0FBRUEsbUJBQU9rQyxPQUFPLENBQUN5RyxPQUFSLEVBQVA7QUFDQSxXQUxGLENBREQ7QUFTQTtBQTlEa0M7O0FBbUJwQyxXQUFJLElBQUk3UixDQUFDLEdBQUcsQ0FBWixFQUFlQSxDQUFDLEdBQUcsTUFBS21SLEtBQUwsR0FBVyxNQUFLQyxLQUFuQyxFQUEwQ3BSLENBQUMsRUFBM0MsRUFDQTtBQUFBLGNBRFFBLENBQ1I7QUE0Q0M7O0FBRURvTCxhQUFPLENBQUNDLEdBQVIsQ0FBWTRGLGVBQVosRUFBNkJwSCxJQUE3QixDQUFrQyxZQUFJO0FBQ3JDLGNBQUtpSSxRQUFMOztBQUVBLGNBQUtMLE1BQUwsR0FBYyxJQUFkO0FBQ0EsT0FKRDtBQU1BLEtBeEVEOztBQTBFQSxVQUFLdEssSUFBTCxHQUFZM00sRUFBRSxDQUFDMk8sYUFBSCxFQUFaO0FBRUEzTyxNQUFFLENBQUM0TyxXQUFILENBQWU1TyxFQUFFLENBQUM2TyxVQUFsQixFQUE4QixNQUFLbEMsSUFBbkM7QUFFQTNNLE1BQUUsQ0FBQ2dQLFVBQUgsQ0FDQ2hQLEVBQUUsQ0FBQzZPLFVBREosRUFFRyxDQUZILEVBR0c3TyxFQUFFLENBQUNpUCxJQUhOLEVBSUcsTUFBS25QLEtBSlIsRUFLRyxNQUFLQyxNQUxSLEVBTUcsQ0FOSCxFQU9HQyxFQUFFLENBQUNpUCxJQVBOLEVBUUdqUCxFQUFFLENBQUNrUCxhQVJOLEVBU0csSUFUSCxFQTFIRCxDQXNJQztBQUNBO0FBQ0E7O0FBRUFsUCxNQUFFLENBQUNxUixhQUFILENBQWlCclIsRUFBRSxDQUFDNk8sVUFBcEIsRUFBZ0M3TyxFQUFFLENBQUNzUixjQUFuQyxFQUFtRHRSLEVBQUUsQ0FBQ3VSLGFBQXREO0FBQ0F2UixNQUFFLENBQUNxUixhQUFILENBQWlCclIsRUFBRSxDQUFDNk8sVUFBcEIsRUFBZ0M3TyxFQUFFLENBQUN3UixjQUFuQyxFQUFtRHhSLEVBQUUsQ0FBQ3VSLGFBQXREO0FBQ0F2UixNQUFFLENBQUNxUixhQUFILENBQWlCclIsRUFBRSxDQUFDNk8sVUFBcEIsRUFBZ0M3TyxFQUFFLENBQUN5UixrQkFBbkMsRUFBdUR6UixFQUFFLENBQUMwUixPQUExRDtBQUNBMVIsTUFBRSxDQUFDcVIsYUFBSCxDQUFpQnJSLEVBQUUsQ0FBQzZPLFVBQXBCLEVBQWdDN08sRUFBRSxDQUFDMlIsa0JBQW5DLEVBQXVEM1IsRUFBRSxDQUFDMFIsT0FBMUQ7QUFFQSxVQUFLNkYsV0FBTCxHQUFtQnZYLEVBQUUsQ0FBQ3dYLGlCQUFILEVBQW5CO0FBRUF4WCxNQUFFLENBQUNJLGVBQUgsQ0FBbUJKLEVBQUUsQ0FBQ0ssV0FBdEIsRUFBbUMsTUFBS2tYLFdBQXhDO0FBRUEsUUFBTUUsZUFBZSxHQUFHelgsRUFBRSxDQUFDMFgsaUJBQTNCO0FBRUExWCxNQUFFLENBQUMyWCxvQkFBSCxDQUNDM1gsRUFBRSxDQUFDSyxXQURKLEVBRUdvWCxlQUZILEVBR0d6WCxFQUFFLENBQUM2TyxVQUhOLEVBSUcsTUFBS2xDLElBSlIsRUFLRyxDQUxIO0FBckpEO0FBNEpDOzs7O1dBRUQsZ0JBQ0E7QUFDQyxVQUFNM00sRUFBRSxHQUFHLEtBQUtpTSxJQUFMLENBQVV4TSxPQUFyQjtBQUVBTyxRQUFFLENBQUNFLFVBQUgsQ0FBYyxLQUFLK0wsSUFBTCxDQUFVOUwsT0FBeEI7QUFFQUgsUUFBRSxDQUFDNE8sV0FBSCxDQUFlNU8sRUFBRSxDQUFDNk8sVUFBbEIsRUFBOEIsS0FBS2xDLElBQW5DO0FBRUEsV0FBS3dELFlBQUwsQ0FDQyxLQUFLdlEsQ0FBTCxJQUFZLEtBQUsrSCxNQUFMLENBQVkvSCxDQUFaLEdBQWlCLEtBQUsrSCxNQUFMLENBQVk3SCxLQUFaLEdBQW9CLENBQWpELElBQXVELEVBRHhELEVBRUcsS0FBS0QsQ0FBTCxJQUFVLEtBQUs4SCxNQUFMLENBQVk5SCxDQUFaLEdBQWlCLEtBQUs4SCxNQUFMLENBQVk1SCxNQUFaLEdBQW9CLENBQS9DLElBQXFELEVBRnhELEVBR0csS0FBS0QsS0FIUixFQUlHLEtBQUtDLE1BSlI7QUFPQUMsUUFBRSxDQUFDSSxlQUFILENBQW1CSixFQUFFLENBQUNLLFdBQXRCLEVBQW1DLElBQW5DO0FBRUFMLFFBQUUsQ0FBQ3NRLFVBQUgsQ0FBY3RRLEVBQUUsQ0FBQ3VRLFNBQWpCLEVBQTRCLENBQTVCLEVBQStCLENBQS9CO0FBQ0E7OztXQUVELG9CQUNBO0FBQ0MsVUFBTXZRLEVBQUUsR0FBRyxLQUFLaU0sSUFBTCxDQUFVeE0sT0FBckI7QUFFQU8sUUFBRSxDQUFDRSxVQUFILENBQWMsS0FBSytMLElBQUwsQ0FBVTlMLE9BQXhCO0FBRUFILFFBQUUsQ0FBQ0ksZUFBSCxDQUFtQkosRUFBRSxDQUFDSyxXQUF0QixFQUFtQyxLQUFLa1gsV0FBeEM7QUFFQXZYLFFBQUUsQ0FBQ0MsUUFBSCxDQUFZLENBQVosRUFBZSxDQUFmLEVBQWtCLEtBQUtILEtBQXZCLEVBQThCLEtBQUtDLE1BQW5DLEVBUEQsQ0FTQztBQUNBOztBQUVBQyxRQUFFLENBQUNvUSxTQUFILENBQ0MsS0FBS25FLElBQUwsQ0FBVW9FLGFBRFgsRUFFRyxDQUZILEVBR0csQ0FISCxFQUlHLENBSkgsRUFLRyxDQUxIO0FBUUFyUSxRQUFFLENBQUMyUCx1QkFBSCxDQUEyQixLQUFLMUQsSUFBTCxDQUFVdUMsZ0JBQXJDO0FBRUF4TyxRQUFFLENBQUM2VCxTQUFILENBQ0MsS0FBSzVILElBQUwsQ0FBVXlHLGtCQURYLEVBRUcsS0FBSzVTLEtBRlIsRUFHRyxLQUFLQyxNQUhSO0FBTUFDLFFBQUUsQ0FBQzRPLFdBQUgsQ0FBZTVPLEVBQUUsQ0FBQzZPLFVBQWxCLEVBQThCLEtBQUtILE9BQW5DO0FBQ0ExTyxRQUFFLENBQUMyUCx1QkFBSCxDQUEyQixLQUFLMUQsSUFBTCxDQUFVMkQsZ0JBQXJDO0FBQ0E1UCxRQUFFLENBQUM2UCxVQUFILENBQWM3UCxFQUFFLENBQUM4UCxZQUFqQixFQUErQixLQUFLN0QsSUFBTCxDQUFVOEQsY0FBekM7QUFFQS9QLFFBQUUsQ0FBQ3VPLG1CQUFILENBQ0MsS0FBS3RDLElBQUwsQ0FBVTJELGdCQURYLEVBRUcsQ0FGSCxFQUdHNVAsRUFBRSxDQUFDeU8sS0FITixFQUlHLEtBSkgsRUFLRyxDQUxILEVBTUcsQ0FOSDtBQVNBLFVBQUk3TyxDQUFDLEdBQUcsQ0FBUjtBQUNBLFVBQUlDLENBQUMsR0FBRyxDQUFSOztBQUVBLFdBQUksSUFBSTJGLENBQVIsSUFBYSxLQUFLd1IsV0FBbEIsRUFDQTtBQUNDLFlBQUcsQ0FBQ3ZELEtBQUssQ0FBQzZDLE9BQU4sQ0FBYyxLQUFLVSxXQUFMLENBQWlCeFIsQ0FBakIsQ0FBZCxDQUFKLEVBQ0E7QUFDQyxlQUFLd1IsV0FBTCxDQUFpQnhSLENBQWpCLElBQXNCLENBQUMsS0FBS3dSLFdBQUwsQ0FBaUJ4UixDQUFqQixDQUFELENBQXRCO0FBQ0E7O0FBRUQsYUFBSSxJQUFJRyxDQUFSLElBQWEsS0FBS3FSLFdBQUwsQ0FBaUJ4UixDQUFqQixDQUFiLEVBQ0E7QUFDQ3hGLFlBQUUsQ0FBQzRPLFdBQUgsQ0FBZTVPLEVBQUUsQ0FBQzZPLFVBQWxCLEVBQThCLEtBQUttSSxXQUFMLENBQWlCeFIsQ0FBakIsRUFBb0JHLENBQXBCLENBQTlCO0FBQ0EzRixZQUFFLENBQUMyUCx1QkFBSCxDQUEyQixLQUFLMUQsSUFBTCxDQUFVMkQsZ0JBQXJDO0FBQ0E1UCxZQUFFLENBQUM2UCxVQUFILENBQWM3UCxFQUFFLENBQUM4UCxZQUFqQixFQUErQixLQUFLN0QsSUFBTCxDQUFVOEQsY0FBekM7QUFFQS9QLFlBQUUsQ0FBQ3VPLG1CQUFILENBQ0MsS0FBS3RDLElBQUwsQ0FBVTJELGdCQURYLEVBRUcsQ0FGSCxFQUdHNVAsRUFBRSxDQUFDeU8sS0FITixFQUlHLEtBSkgsRUFLRyxDQUxILEVBTUcsQ0FOSDtBQVNBek8sWUFBRSxDQUFDNlAsVUFBSCxDQUFjN1AsRUFBRSxDQUFDOFAsWUFBakIsRUFBK0IsS0FBSzdELElBQUwsQ0FBVThELGNBQXpDO0FBQ0EvUCxZQUFFLENBQUNnUSxVQUFILENBQWNoUSxFQUFFLENBQUM4UCxZQUFqQixFQUErQixJQUFJRyxZQUFKLENBQWlCLENBQy9DLEdBRCtDLEVBQ3pDLEdBRHlDLEVBRS9DLEdBRitDLEVBRXpDLEdBRnlDLEVBRy9DLEdBSCtDLEVBR3pDLEdBSHlDLEVBSS9DLEdBSitDLEVBSXpDLEdBSnlDLEVBSy9DLEdBTCtDLEVBS3pDLEdBTHlDLEVBTS9DLEdBTitDLEVBTXpDLEdBTnlDLENBQWpCLENBQS9CLEVBT0lqUSxFQUFFLENBQUNrUSxXQVBQO0FBU0EsZUFBS0MsWUFBTCxDQUNDdlEsQ0FERCxFQUVHQyxDQUFDLEdBQUcsS0FBSzRNLFVBRlosRUFHRyxLQUFLRCxTQUhSLEVBSUcsQ0FBRSxLQUFLQyxVQUpWO0FBT0F6TSxZQUFFLENBQUNzUSxVQUFILENBQWN0USxFQUFFLENBQUN1USxTQUFqQixFQUE0QixDQUE1QixFQUErQixDQUEvQjtBQUNBOztBQUNEM1EsU0FBQyxJQUFJLEtBQUs0TSxTQUFWOztBQUVBLFlBQUc1TSxDQUFDLElBQUksS0FBS0UsS0FBYixFQUNBO0FBQ0NGLFdBQUMsR0FBRyxDQUFKO0FBQ0FDLFdBQUMsSUFBSSxLQUFLNE0sVUFBVjtBQUNBO0FBQ0Q7O0FBRUR6TSxRQUFFLENBQUNJLGVBQUgsQ0FBbUJKLEVBQUUsQ0FBQ0ssV0FBdEIsRUFBbUMsSUFBbkM7QUFDQTs7O1dBRUQsc0JBQWFULENBQWIsRUFBZ0JDLENBQWhCLEVBQW1CQyxLQUFuQixFQUEwQkMsTUFBMUIsRUFDQTtBQUNDLFVBQU1DLEVBQUUsR0FBRyxLQUFLaU0sSUFBTCxDQUFVeE0sT0FBckI7QUFFQU8sUUFBRSxDQUFDNlAsVUFBSCxDQUFjN1AsRUFBRSxDQUFDOFAsWUFBakIsRUFBK0IsS0FBSzdELElBQUwsQ0FBVTZFLGNBQXpDO0FBRUE5USxRQUFFLENBQUN1TyxtQkFBSCxDQUNDLEtBQUt0QyxJQUFMLENBQVV1QyxnQkFEWCxFQUVHLENBRkgsRUFHR3hPLEVBQUUsQ0FBQ3lPLEtBSE4sRUFJRyxLQUpILEVBS0csQ0FMSCxFQU1HLENBTkg7QUFTQSxVQUFJc0MsRUFBRSxHQUFHblIsQ0FBVDtBQUNBLFVBQUlvUixFQUFFLEdBQUdwUixDQUFDLEdBQUdFLEtBQWI7QUFDQSxVQUFJbVIsRUFBRSxHQUFHcFIsQ0FBVDtBQUNBLFVBQUlxUixFQUFFLEdBQUdyUixDQUFDLEdBQUdFLE1BQWI7QUFFQUMsUUFBRSxDQUFDZ1EsVUFBSCxDQUFjaFEsRUFBRSxDQUFDOFAsWUFBakIsRUFBK0IsSUFBSUcsWUFBSixDQUFpQixDQUMvQ2MsRUFEK0MsRUFDM0NHLEVBRDJDLEVBRS9DRixFQUYrQyxFQUUzQ0UsRUFGMkMsRUFHL0NILEVBSCtDLEVBRzNDRSxFQUgyQyxFQUkvQ0YsRUFKK0MsRUFJM0NFLEVBSjJDLEVBSy9DRCxFQUwrQyxFQUszQ0UsRUFMMkMsRUFNL0NGLEVBTitDLEVBTTNDQyxFQU4yQyxDQUFqQixDQUEvQixFQU9JalIsRUFBRSxDQUFDZ1QsV0FQUDtBQVFBOzs7O0VBblRNelQsdUJBQVdDLE1BQVgsQ0FBa0I7QUFBQ0gsTUFBSSxFQUFKQSxVQUFEO0FBQU9zSSxRQUFNLEVBQU5BLGNBQVA7QUFBZWpELGFBQVcsRUFBWEE7QUFBZixDQUFsQixDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lDTktrVCxXOzs7Ozs7O0NDQWI7QUFBQTtBQUFBO0FBQUE7Q0NBQTtBQUFBO0FBQUE7QUFBQTs7Ozs7Ozs7Ozs7QUNBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVhak4sVTs7Ozs7QUFFWixzQkFBWTNILElBQVosRUFDQTtBQUFBOztBQUFBOztBQUNDLDhCQUFNQSxJQUFOO0FBQ0EsVUFBS0MsUUFBTCxHQUFpQjNCLE9BQU8sQ0FBQyxrQkFBRCxDQUF4QjtBQUNBLFVBQUt1VyxTQUFMLEdBQWlCLEtBQWpCO0FBRUEsVUFBSzdVLElBQUwsQ0FBVThVLFFBQVYsR0FBc0IsS0FBdEI7QUFDQSxVQUFLOVUsSUFBTCxDQUFVcEQsQ0FBVixHQUFjLENBQWQ7QUFDQSxVQUFLb0QsSUFBTCxDQUFVbkQsQ0FBVixHQUFjLENBQWQ7QUFFQXdHLFVBQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsV0FBeEIsRUFBcUMsVUFBQ3FDLEtBQUQsRUFBVztBQUMvQyxZQUFLb1AsU0FBTCxDQUFlcFAsS0FBZjtBQUNBLEtBRkQ7QUFJQXRDLFVBQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsU0FBeEIsRUFBbUMsVUFBQ3FDLEtBQUQsRUFBVztBQUM3QyxZQUFLcVAsU0FBTCxDQUFlclAsS0FBZjtBQUNBLEtBRkQ7QUFJQXRDLFVBQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsV0FBeEIsRUFBcUMsVUFBQ3FDLEtBQUQsRUFBVztBQUMvQyxZQUFLb1AsU0FBTCxDQUFlcFAsS0FBZjtBQUNBLEtBRkQ7QUFJQXRDLFVBQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsVUFBeEIsRUFBb0MsVUFBQ3FDLEtBQUQsRUFBVztBQUM5QyxZQUFLcVAsU0FBTCxDQUFlclAsS0FBZjtBQUNBLEtBRkQ7QUFyQkQ7QUF3QkM7Ozs7V0FFRCxtQkFBVUEsS0FBVixFQUNBO0FBQ0MsVUFBSXNQLEdBQUcsR0FBR3RQLEtBQVY7QUFFQUEsV0FBSyxDQUFDdVAsY0FBTjs7QUFFQSxVQUFHdlAsS0FBSyxDQUFDd1AsT0FBTixJQUFpQnhQLEtBQUssQ0FBQ3dQLE9BQU4sQ0FBYyxDQUFkLENBQXBCLEVBQ0E7QUFDQ0YsV0FBRyxHQUFHdFAsS0FBSyxDQUFDd1AsT0FBTixDQUFjLENBQWQsQ0FBTjtBQUNBOztBQUVELFdBQUtuVixJQUFMLENBQVU4VSxRQUFWLEdBQXFCLElBQXJCO0FBQ0EsV0FBS0QsU0FBTCxHQUFxQjtBQUNwQmpZLFNBQUMsRUFBSXFZLEdBQUcsQ0FBQ2hGLE9BRFc7QUFFbEJwVCxTQUFDLEVBQUVvWSxHQUFHLENBQUMvRTtBQUZXLE9BQXJCO0FBSUE7OztXQUVELG1CQUFVdkssS0FBVixFQUNBO0FBQ0MsVUFBRyxLQUFLM0YsSUFBTCxDQUFVOFUsUUFBYixFQUNBO0FBQ0MsWUFBSUcsR0FBRyxHQUFHdFAsS0FBVjs7QUFFQSxZQUFHQSxLQUFLLENBQUN3UCxPQUFOLElBQWlCeFAsS0FBSyxDQUFDd1AsT0FBTixDQUFjLENBQWQsQ0FBcEIsRUFDQTtBQUNDRixhQUFHLEdBQUd0UCxLQUFLLENBQUN3UCxPQUFOLENBQWMsQ0FBZCxDQUFOO0FBQ0E7O0FBRUQsYUFBS25WLElBQUwsQ0FBVW9WLEVBQVYsR0FBZUgsR0FBRyxDQUFDaEYsT0FBSixHQUFjLEtBQUs0RSxTQUFMLENBQWVqWSxDQUE1QztBQUNBLGFBQUtvRCxJQUFMLENBQVVxVixFQUFWLEdBQWVKLEdBQUcsQ0FBQy9FLE9BQUosR0FBYyxLQUFLMkUsU0FBTCxDQUFlaFksQ0FBNUM7QUFFQSxZQUFNeVksS0FBSyxHQUFHLEVBQWQ7O0FBRUEsWUFBRyxLQUFLdFYsSUFBTCxDQUFVb1YsRUFBVixHQUFlLENBQUNFLEtBQW5CLEVBQ0E7QUFDQyxlQUFLdFYsSUFBTCxDQUFVcEQsQ0FBVixHQUFjLENBQUMwWSxLQUFmO0FBQ0EsU0FIRCxNQUlLLElBQUcsS0FBS3RWLElBQUwsQ0FBVW9WLEVBQVYsR0FBZUUsS0FBbEIsRUFDTDtBQUNDLGVBQUt0VixJQUFMLENBQVVwRCxDQUFWLEdBQWMwWSxLQUFkO0FBQ0EsU0FISSxNQUtMO0FBQ0MsZUFBS3RWLElBQUwsQ0FBVXBELENBQVYsR0FBYyxLQUFLb0QsSUFBTCxDQUFVb1YsRUFBeEI7QUFDQTs7QUFFRCxZQUFHLEtBQUtwVixJQUFMLENBQVVxVixFQUFWLEdBQWUsQ0FBQ0MsS0FBbkIsRUFDQTtBQUNDLGVBQUt0VixJQUFMLENBQVVuRCxDQUFWLEdBQWMsQ0FBQ3lZLEtBQWY7QUFDQSxTQUhELE1BSUssSUFBRyxLQUFLdFYsSUFBTCxDQUFVcVYsRUFBVixHQUFlQyxLQUFsQixFQUNMO0FBQ0MsZUFBS3RWLElBQUwsQ0FBVW5ELENBQVYsR0FBY3lZLEtBQWQ7QUFDQSxTQUhJLE1BS0w7QUFDQyxlQUFLdFYsSUFBTCxDQUFVbkQsQ0FBVixHQUFjLEtBQUttRCxJQUFMLENBQVVxVixFQUF4QjtBQUNBO0FBQ0Q7QUFDRDs7O1dBRUQsbUJBQVUxUCxLQUFWLEVBQ0E7QUFDQyxXQUFLM0YsSUFBTCxDQUFVOFUsUUFBVixHQUFxQixLQUFyQjtBQUNBLFdBQUs5VSxJQUFMLENBQVVwRCxDQUFWLEdBQWMsQ0FBZDtBQUNBLFdBQUtvRCxJQUFMLENBQVVuRCxDQUFWLEdBQWMsQ0FBZDtBQUNBOzs7O0VBaEc4QmtELFc7Ozs7Ozs7Ozs7Ozs7OztBQ0ZoQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVhOEIsUzs7Ozs7QUFFWixxQkFBWTdCLElBQVosRUFDQTtBQUFBOztBQUFBOztBQUNDLDhCQUFNQSxJQUFOO0FBQ0EsVUFBS0MsUUFBTCxHQUFpQjNCLE9BQU8sQ0FBQyxpQkFBRCxDQUF4QjtBQUVBMEIsUUFBSSxDQUFDeUIsV0FBTCxDQUFpQjJLLEtBQWpCLENBQXVCQyxJQUF2QixDQUE0QixVQUFDQyxLQUFELEVBQVM7QUFDcEMsWUFBS3RNLElBQUwsQ0FBVXVWLEtBQVYsR0FBa0JqSixLQUFLLENBQUN6RCxNQUF4QjtBQUNBLEtBRkQ7O0FBSUEsVUFBSzdJLElBQUwsQ0FBVWlCLE1BQVYsQ0FBaUIsaUJBQWpCLEVBQW9DLFVBQUNDLENBQUQsRUFBSztBQUN4QyxZQUFLbEIsSUFBTCxDQUFVd1YsZUFBVixHQUE0QixJQUE1QjtBQUNBLEtBRkQsRUFFRztBQUFDcFMsVUFBSSxFQUFDO0FBQU4sS0FGSDs7QUFJQSxVQUFLcEQsSUFBTCxDQUFVeVYsV0FBVixHQUEwQixLQUExQjtBQUNBLFVBQUt6VixJQUFMLENBQVUwVixTQUFWLEdBQTBCLEVBQTFCO0FBQ0EsVUFBSzFWLElBQUwsQ0FBVTJWLGFBQVYsR0FBMEIsSUFBMUI7QUFkRDtBQWVDOzs7O1dBRUQsdUJBQWMvRyxHQUFkLEVBQ0E7QUFDQ2hRLGFBQU8sQ0FBQzRKLEdBQVIsQ0FBWW9HLEdBQVo7QUFFQSxXQUFLNU8sSUFBTCxDQUFVd1YsZUFBVixHQUE0QjVHLEdBQTVCO0FBQ0E7OztXQUVELGdCQUFPOEcsU0FBUCxFQUNBO0FBQ0MxUixZQUFNLENBQUN5QyxNQUFQLENBQWMsS0FBS3pHLElBQUwsQ0FBVTBWLFNBQXhCLEVBQW1DQSxTQUFuQzs7QUFFQSxVQUFHQSxTQUFTLENBQUNuVCxPQUFWLEtBQXNCbVQsU0FBUyxDQUFDalQsWUFBaEMsSUFDQ2lULFNBQVMsQ0FBQzVTLE9BQVYsS0FBc0I0UyxTQUFTLENBQUM5UyxZQURwQyxFQUVDO0FBQ0EsYUFBSzVDLElBQUwsQ0FBVXlWLFdBQVYsR0FBd0IsSUFBeEI7QUFDQSxPQUpELE1BTUE7QUFDQyxhQUFLelYsSUFBTCxDQUFVeVYsV0FBVixHQUF3QixLQUF4QjtBQUNBOztBQUVELFVBQUcsQ0FBQyxLQUFLelYsSUFBTCxDQUFVeVYsV0FBZCxFQUNBO0FBQ0MsYUFBS3pWLElBQUwsQ0FBVTRWLGNBQVYsR0FBMkIsS0FBSzVWLElBQUwsQ0FBVXNCLEdBQVYsQ0FBYzhTLE9BQWQsQ0FBc0JzQixTQUFTLENBQUNuVCxPQUFoQyxFQUF5Q21ULFNBQVMsQ0FBQzVTLE9BQW5ELENBQTNCO0FBQ0E7QUFDRDs7OztFQTdDNkIvQyxXOzs7OztDQ0YvQjtBQUFBO0FBQUE7QUFBQTtDQ0FBO0FBQUE7QUFBQTtBQUFBOzs7Ozs7Ozs7Ozs7O0FDQUE7Ozs7Ozs7O0lBRWE4VixLO0FBRVosaUJBQVk1TSxJQUFaLEVBQWtCakosSUFBbEIsRUFDQTtBQUFBOztBQUNDLFNBQUtpSixJQUFMLEdBQWNBLElBQWQ7QUFDQSxTQUFLOUcsT0FBTCxHQUFlLEVBQWYsQ0FGRCxDQUlDOztBQUNBLFNBQUthLE1BQUwsQ0FBWSxDQUFaLEVBQWUsQ0FBZixFQUxELENBTUM7QUFDQTs7OztXQUVELGdCQUFPbEcsS0FBUCxFQUFjQyxNQUFkLEVBQ0E7QUFDQyxXQUFLRCxLQUFMLEdBQWNBLEtBQWQ7QUFDQSxXQUFLQyxNQUFMLEdBQWNBLE1BQWQ7O0FBRUEsV0FBSSxJQUFJSCxDQUFDLEdBQUcsQ0FBWixFQUFlQSxDQUFDLEdBQUdFLEtBQW5CLEVBQTBCRixDQUFDLEVBQTNCLEVBQ0E7QUFDQyxhQUFJLElBQUlDLENBQUMsR0FBRyxDQUFaLEVBQWVBLENBQUMsR0FBR0UsTUFBbkIsRUFBMkJGLENBQUMsRUFBNUIsRUFDQTtBQUNDLGNBQU11RixNQUFNLEdBQUcsSUFBSTJHLGNBQUosQ0FBVyxLQUFLRSxJQUFoQixFQUFzQixnQkFBdEIsQ0FBZjtBQUVBN0csZ0JBQU0sQ0FBQ3hGLENBQVAsR0FBVyxLQUFLQSxDQUFoQjtBQUNBd0YsZ0JBQU0sQ0FBQ3ZGLENBQVAsR0FBVyxLQUFLQSxDQUFoQjtBQUVBLGVBQUtzRixPQUFMLENBQWFrQyxJQUFiLENBQWtCakMsTUFBbEI7QUFDQTtBQUNEO0FBQ0Q7OztXQUVELGdCQUNBO0FBQ0MsV0FBS0QsT0FBTCxDQUFhYixHQUFiLENBQWlCLFVBQUF3UCxDQUFDO0FBQUEsZUFBSUEsQ0FBQyxDQUFDck0sSUFBRixFQUFKO0FBQUEsT0FBbEI7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3BDRjs7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVjcVIsRzs7Ozs7QUFHYixpQkFDQTtBQUFBOztBQUFBOztBQUNDO0FBRUEsVUFBS1AsS0FBTCxHQUFhLEVBQWI7QUFIRDtBQUlDOzs7O1dBRUQsaUJBQVEzWSxDQUFSLEVBQVdDLENBQVgsRUFDQTtBQUFBLFVBRGNxTSxLQUNkLHVFQURzQixDQUN0Qjs7QUFDQyxVQUFHLEtBQUtxTSxLQUFMLFdBQWMzWSxDQUFkLGNBQW1CQyxDQUFuQixlQUF5QnFNLEtBQXpCLEVBQUgsRUFDQTtBQUNDLGVBQU8sQ0FDTixLQUFLeEgsV0FBTCxDQUFpQjhLLFFBQWpCLENBQTBCLEtBQUsrSSxLQUFMLFdBQWMzWSxDQUFkLGNBQW1CQyxDQUFuQixlQUF5QnFNLEtBQXpCLEVBQTFCLENBRE0sQ0FBUDtBQUdBOztBQUVELFVBQUk2TSxLQUFLLEdBQUcsQ0FBWjtBQUNBLFVBQUlDLE1BQU0sR0FBRyxZQUFiOztBQUVBLFVBQUlwWixDQUFDLEdBQUdtWixLQUFKLEtBQWMsQ0FBZixJQUFzQmxaLENBQUMsR0FBR2taLEtBQUosS0FBYyxDQUF2QyxFQUNBO0FBQ0NDLGNBQU0sR0FBRyxZQUFUO0FBQ0E7O0FBRUQsYUFBTyxDQUNOLEtBQUt0VSxXQUFMLENBQWlCOEssUUFBakIsQ0FBMEIsZUFBMUIsQ0FETSxDQUFQO0FBSUEsYUFBTyxDQUNOLEtBQUs5SyxXQUFMLENBQWlCOEssUUFBakIsQ0FBMEIsZUFBMUIsQ0FETSxFQUVKLEtBQUs5SyxXQUFMLENBQWlCOEssUUFBakIsQ0FBMEJ3SixNQUExQixDQUZJLENBQVA7QUFJQTs7O1dBRUQsaUJBQVFwWixDQUFSLEVBQVdDLENBQVgsRUFBYzZQLEtBQWQsRUFDQTtBQUFBLFVBRHFCeEQsS0FDckIsdUVBRDZCLENBQzdCO0FBQ0MsV0FBS3FNLEtBQUwsV0FBYzNZLENBQWQsY0FBbUJDLENBQW5CLGVBQXlCcU0sS0FBekIsS0FBb0N3RCxLQUFwQztBQUNBOzs7V0FFRCxtQkFDQTtBQUNDOU4sYUFBTyxDQUFDNEosR0FBUixDQUFZeU4sSUFBSSxDQUFDQyxTQUFMLENBQWUsS0FBS1gsS0FBcEIsQ0FBWjtBQUNBOzs7V0FFRCxpQkFBT1ksS0FBUCxFQUNBO0FBQ0NBLFdBQUssb0hBQUw7QUFFQSxXQUFLWixLQUFMLEdBQWFVLElBQUksQ0FBQ0csS0FBTCxDQUFXRCxLQUFYLENBQWIsQ0FIRCxDQUtDO0FBQ0E7Ozs7RUFyRE01Wix1QkFBV0MsTUFBWCxDQUFrQjtBQUFDa0YsYUFBVyxFQUFYQTtBQUFELENBQWxCLEMsR0F5RFI7Ozs7Ozs7Ozs7OztBQzdEQTtBQUNBLENBQUMsWUFBVztBQUNWLE1BQUkyVSxTQUFTLEdBQUdoVCxNQUFNLENBQUNnVCxTQUFQLElBQW9CaFQsTUFBTSxDQUFDaVQsWUFBM0M7QUFDQSxNQUFJQyxFQUFFLEdBQUdsVCxNQUFNLENBQUNtVCxNQUFQLEdBQWlCblQsTUFBTSxDQUFDbVQsTUFBUCxJQUFpQixFQUEzQztBQUNBLE1BQUlDLEVBQUUsR0FBR0YsRUFBRSxDQUFDLGFBQUQsQ0FBRixHQUFxQkEsRUFBRSxDQUFDLGFBQUQsQ0FBRixJQUFxQixFQUFuRDtBQUNBLE1BQUksQ0FBQ0YsU0FBRCxJQUFjSSxFQUFFLENBQUNDLFFBQXJCLEVBQStCO0FBQy9CLE1BQUlyVCxNQUFNLENBQUNzVCxHQUFYLEVBQWdCO0FBQ2hCdFQsUUFBTSxDQUFDc1QsR0FBUCxHQUFhLElBQWI7O0FBRUEsTUFBSUMsV0FBVyxHQUFHLFNBQWRBLFdBQWMsQ0FBU0MsR0FBVCxFQUFhO0FBQzdCLFFBQUlDLElBQUksR0FBR3RSLElBQUksQ0FBQzZMLEtBQUwsQ0FBVzBGLElBQUksQ0FBQ2pULEdBQUwsS0FBYSxJQUF4QixFQUE4QmtULFFBQTlCLEVBQVg7QUFDQUgsT0FBRyxHQUFHQSxHQUFHLENBQUNJLE9BQUosQ0FBWSx5QkFBWixFQUF1QyxFQUF2QyxDQUFOO0FBQ0EsV0FBT0osR0FBRyxJQUFJQSxHQUFHLENBQUNLLE9BQUosQ0FBWSxHQUFaLEtBQW9CLENBQXBCLEdBQXdCLEdBQXhCLEdBQThCLEdBQWxDLENBQUgsR0FBMkMsY0FBM0MsR0FBNERKLElBQW5FO0FBQ0QsR0FKRDs7QUFNQSxNQUFJSyxPQUFPLEdBQUdDLFNBQVMsQ0FBQ0MsU0FBVixDQUFvQkMsV0FBcEIsRUFBZDtBQUNBLE1BQUlDLFlBQVksR0FBR2QsRUFBRSxDQUFDYyxZQUFILElBQW1CSixPQUFPLENBQUNELE9BQVIsQ0FBZ0IsUUFBaEIsSUFBNEIsQ0FBQyxDQUFuRTtBQUVBLE1BQUlNLFNBQVMsR0FBRztBQUNkQyxRQUFJLEVBQUUsZ0JBQVU7QUFDZHBVLFlBQU0sQ0FBQzFGLFFBQVAsQ0FBZ0IrWixNQUFoQixDQUF1QixJQUF2QjtBQUNELEtBSGE7QUFLZEMsY0FBVSxFQUFFLHNCQUFVO0FBQ3BCLFNBQUdDLEtBQUgsQ0FDR0MsSUFESCxDQUNRMVMsUUFBUSxDQUFDMlMsZ0JBQVQsQ0FBMEIsc0JBQTFCLENBRFIsRUFFR0MsTUFGSCxDQUVVLFVBQVNDLElBQVQsRUFBZTtBQUNyQixZQUFJQyxHQUFHLEdBQUdELElBQUksQ0FBQ0UsWUFBTCxDQUFrQixpQkFBbEIsQ0FBVjtBQUNBLGVBQU9GLElBQUksQ0FBQ0csSUFBTCxJQUFhRixHQUFHLElBQUksT0FBM0I7QUFDRCxPQUxILEVBTUdHLE9BTkgsQ0FNVyxVQUFTSixJQUFULEVBQWU7QUFDdEJBLFlBQUksQ0FBQ0csSUFBTCxHQUFZdkIsV0FBVyxDQUFDb0IsSUFBSSxDQUFDRyxJQUFOLENBQXZCO0FBQ0QsT0FSSCxFQURvQixDQVdwQjs7QUFDQSxVQUFJWixZQUFKLEVBQWtCYyxVQUFVLENBQUMsWUFBVztBQUFFbFQsZ0JBQVEsQ0FBQ0MsSUFBVCxDQUFja1QsWUFBZDtBQUE2QixPQUEzQyxFQUE2QyxFQUE3QyxDQUFWO0FBQ25CLEtBbEJhO0FBb0JkQyxjQUFVLEVBQUUsc0JBQVU7QUFDcEIsVUFBSUMsT0FBTyxHQUFHLEdBQUdaLEtBQUgsQ0FBU0MsSUFBVCxDQUFjMVMsUUFBUSxDQUFDMlMsZ0JBQVQsQ0FBMEIsUUFBMUIsQ0FBZCxDQUFkO0FBQ0EsVUFBSVcsV0FBVyxHQUFHRCxPQUFPLENBQUNsWCxHQUFSLENBQVksVUFBU29YLE1BQVQsRUFBaUI7QUFBRSxlQUFPQSxNQUFNLENBQUMvRixJQUFkO0FBQW9CLE9BQW5ELEVBQXFEb0YsTUFBckQsQ0FBNEQsVUFBU3BGLElBQVQsRUFBZTtBQUFFLGVBQU9BLElBQUksQ0FBQ3JPLE1BQUwsR0FBYyxDQUFyQjtBQUF3QixPQUFyRyxDQUFsQjtBQUNBLFVBQUlxVSxVQUFVLEdBQUdILE9BQU8sQ0FBQ1QsTUFBUixDQUFlLFVBQVNXLE1BQVQsRUFBaUI7QUFBRSxlQUFPQSxNQUFNLENBQUM5SixHQUFkO0FBQW1CLE9BQXJELENBQWpCO0FBRUEsVUFBSXFGLE1BQU0sR0FBRyxDQUFiO0FBQ0EsVUFBSXBHLEdBQUcsR0FBRzhLLFVBQVUsQ0FBQ3JVLE1BQXJCOztBQUNBLFVBQUlzVSxNQUFNLEdBQUcsU0FBVEEsTUFBUyxHQUFXO0FBQ3RCM0UsY0FBTSxHQUFHQSxNQUFNLEdBQUcsQ0FBbEI7O0FBQ0EsWUFBSUEsTUFBTSxLQUFLcEcsR0FBZixFQUFvQjtBQUNsQjRLLHFCQUFXLENBQUNMLE9BQVosQ0FBb0IsVUFBU00sTUFBVCxFQUFpQjtBQUFFRyxnQkFBSSxDQUFDSCxNQUFELENBQUo7QUFBZSxXQUF0RDtBQUNEO0FBQ0YsT0FMRDs7QUFPQUMsZ0JBQVUsQ0FDUFAsT0FESCxDQUNXLFVBQVNNLE1BQVQsRUFBaUI7QUFDeEIsWUFBSTlKLEdBQUcsR0FBRzhKLE1BQU0sQ0FBQzlKLEdBQWpCO0FBQ0E4SixjQUFNLENBQUNJLE1BQVA7QUFDQSxZQUFJQyxTQUFTLEdBQUc1VCxRQUFRLENBQUNnTixhQUFULENBQXVCLFFBQXZCLENBQWhCO0FBQ0E0RyxpQkFBUyxDQUFDbkssR0FBVixHQUFnQmdJLFdBQVcsQ0FBQ2hJLEdBQUQsQ0FBM0I7QUFDQW1LLGlCQUFTLENBQUNDLEtBQVYsR0FBa0IsSUFBbEI7QUFDQUQsaUJBQVMsQ0FBQzlHLE1BQVYsR0FBbUIyRyxNQUFuQjtBQUNBelQsZ0JBQVEsQ0FBQzhULElBQVQsQ0FBY0MsV0FBZCxDQUEwQkgsU0FBMUI7QUFDRCxPQVRIO0FBVUQ7QUE1Q2EsR0FBaEI7QUE4Q0EsTUFBSUksSUFBSSxHQUFHMUMsRUFBRSxDQUFDMEMsSUFBSCxJQUFXLElBQXRCO0FBQ0EsTUFBSUMsSUFBSSxHQUFHN0MsRUFBRSxDQUFDOEMsTUFBSCxJQUFhaFcsTUFBTSxDQUFDMUYsUUFBUCxDQUFnQjJiLFFBQTdCLElBQXlDLFdBQXBEOztBQUVBLE1BQUlDLE9BQU8sR0FBRyxTQUFWQSxPQUFVLEdBQVU7QUFDdEIsUUFBSUMsVUFBVSxHQUFHLElBQUluRCxTQUFKLENBQWMsVUFBVStDLElBQVYsR0FBaUIsR0FBakIsR0FBdUJELElBQXJDLENBQWpCOztBQUNBSyxjQUFVLENBQUNDLFNBQVgsR0FBdUIsVUFBUzlULEtBQVQsRUFBZTtBQUNwQyxVQUFJOFEsRUFBRSxDQUFDQyxRQUFQLEVBQWlCO0FBQ2pCLFVBQUlnRCxPQUFPLEdBQUcvVCxLQUFLLENBQUNnVSxJQUFwQjtBQUNBLFVBQUlDLFFBQVEsR0FBR3BDLFNBQVMsQ0FBQ2tDLE9BQUQsQ0FBVCxJQUFzQmxDLFNBQVMsQ0FBQ0MsSUFBL0M7QUFDQW1DLGNBQVE7QUFDVCxLQUxEOztBQU1BSixjQUFVLENBQUNLLE9BQVgsR0FBcUIsWUFBVTtBQUM3QixVQUFJTCxVQUFVLENBQUNNLFVBQWYsRUFBMkJOLFVBQVUsQ0FBQ08sS0FBWDtBQUM1QixLQUZEOztBQUdBUCxjQUFVLENBQUNRLE9BQVgsR0FBcUIsWUFBVTtBQUM3QjNXLFlBQU0sQ0FBQ2dWLFVBQVAsQ0FBa0JrQixPQUFsQixFQUEyQixJQUEzQjtBQUNELEtBRkQ7QUFHRCxHQWREOztBQWVBQSxTQUFPO0FBQ1IsQ0FsRkQ7QUFtRkEiLCJmaWxlIjoiZG9jcy9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9CYWcuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkJhZyA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBfTWl4aW4gPSByZXF1aXJlKFwiLi9NaXhpblwiKTtcbnZhciBfRXZlbnRUYXJnZXRNaXhpbiA9IHJlcXVpcmUoXCIuLi9taXhpbi9FdmVudFRhcmdldE1peGluXCIpO1xudmFyIHRvSWQgPSBpbnQgPT4gTnVtYmVyKGludCk7XG52YXIgZnJvbUlkID0gaWQgPT4gcGFyc2VJbnQoaWQpO1xudmFyIE1hcHBlZCA9IFN5bWJvbCgnTWFwcGVkJyk7XG52YXIgSGFzID0gU3ltYm9sKCdIYXMnKTtcbnZhciBBZGQgPSBTeW1ib2woJ0FkZCcpO1xudmFyIFJlbW92ZSA9IFN5bWJvbCgnUmVtb3ZlJyk7XG52YXIgRGVsZXRlID0gU3ltYm9sKCdEZWxldGUnKTtcbmNsYXNzIEJhZyBleHRlbmRzIF9NaXhpbi5NaXhpbi53aXRoKF9FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4pIHtcbiAgY29uc3RydWN0b3IoY2hhbmdlQ2FsbGJhY2sgPSB1bmRlZmluZWQpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2sgPSBjaGFuZ2VDYWxsYmFjaztcbiAgICB0aGlzLmNvbnRlbnQgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5saXN0ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShbXSk7XG4gICAgdGhpcy5tZXRhID0gU3ltYm9sKCdtZXRhJyk7XG4gICAgdGhpcy50eXBlID0gdW5kZWZpbmVkO1xuICB9XG4gIGhhcyhpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5oYXMoaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW0hhc10oaXRlbSk7XG4gIH1cbiAgW0hhc10oaXRlbSkge1xuICAgIHJldHVybiB0aGlzLmNvbnRlbnQuaGFzKGl0ZW0pO1xuICB9XG4gIGFkZChpdGVtKSB7XG4gICAgaWYgKHRoaXNbTWFwcGVkXSkge1xuICAgICAgcmV0dXJuIHRoaXNbTWFwcGVkXS5hZGQoaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzW0FkZF0oaXRlbSk7XG4gIH1cbiAgW0FkZF0oaXRlbSkge1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQgfHwgIShpdGVtIGluc3RhbmNlb2YgT2JqZWN0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9iamVjdHMgbWF5IGJlIGFkZGVkIHRvIEJhZ3MuJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnR5cGUgJiYgIShpdGVtIGluc3RhbmNlb2YgdGhpcy50eXBlKSkge1xuICAgICAgY29uc29sZS5lcnJvcih0aGlzLnR5cGUsIGl0ZW0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbmx5IG9iamVjdHMgb2YgdHlwZSAke3RoaXMudHlwZX0gbWF5IGJlIGFkZGVkIHRvIHRoaXMgQmFnLmApO1xuICAgIH1cbiAgICBpdGVtID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoaXRlbSk7XG4gICAgaWYgKHRoaXMuY29udGVudC5oYXMoaXRlbSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGFkZGluZyA9IG5ldyBDdXN0b21FdmVudCgnYWRkaW5nJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGl0ZW1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChhZGRpbmcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpZCA9IHRvSWQodGhpcy5jdXJyZW50KyspO1xuICAgIHRoaXMuY29udGVudC5zZXQoaXRlbSwgaWQpO1xuICAgIHRoaXMubGlzdFtpZF0gPSBpdGVtO1xuICAgIGlmICh0aGlzLmNoYW5nZUNhbGxiYWNrKSB7XG4gICAgICB0aGlzLmNoYW5nZUNhbGxiYWNrKGl0ZW0sIHRoaXMubWV0YSwgQmFnLklURU1fQURERUQsIGlkKTtcbiAgICB9XG4gICAgdmFyIGFkZCA9IG5ldyBDdXN0b21FdmVudCgnYWRkZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbSxcbiAgICAgICAgaWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoYWRkKTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuc2l6ZTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgcmVtb3ZlKGl0ZW0pIHtcbiAgICBpZiAodGhpc1tNYXBwZWRdKSB7XG4gICAgICByZXR1cm4gdGhpc1tNYXBwZWRdLnJlbW92ZShpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbUmVtb3ZlXShpdGVtKTtcbiAgfVxuICBbUmVtb3ZlXShpdGVtKSB7XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCB8fCAhKGl0ZW0gaW5zdGFuY2VvZiBPYmplY3QpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgb2JqZWN0cyBtYXkgYmUgcmVtb3ZlZCBmcm9tIEJhZ3MuJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnR5cGUgJiYgIShpdGVtIGluc3RhbmNlb2YgdGhpcy50eXBlKSkge1xuICAgICAgY29uc29sZS5lcnJvcih0aGlzLnR5cGUsIGl0ZW0pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbmx5IG9iamVjdHMgb2YgdHlwZSAke3RoaXMudHlwZX0gbWF5IGJlIHJlbW92ZWQgZnJvbSB0aGlzIEJhZy5gKTtcbiAgICB9XG4gICAgaXRlbSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKGl0ZW0pO1xuICAgIGlmICghdGhpcy5jb250ZW50LmhhcyhpdGVtKSkge1xuICAgICAgaWYgKHRoaXMuY2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5jaGFuZ2VDYWxsYmFjayhpdGVtLCB0aGlzLm1ldGEsIDAsIHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciByZW1vdmluZyA9IG5ldyBDdXN0b21FdmVudCgncmVtb3ZpbmcnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KHJlbW92aW5nKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaWQgPSB0aGlzLmNvbnRlbnQuZ2V0KGl0ZW0pO1xuICAgIGRlbGV0ZSB0aGlzLmxpc3RbaWRdO1xuICAgIHRoaXMuY29udGVudC5kZWxldGUoaXRlbSk7XG4gICAgaWYgKHRoaXMuY2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgIHRoaXMuY2hhbmdlQ2FsbGJhY2soaXRlbSwgdGhpcy5tZXRhLCBCYWcuSVRFTV9SRU1PVkVELCBpZCk7XG4gICAgfVxuICAgIHZhciByZW1vdmUgPSBuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92ZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgaXRlbSxcbiAgICAgICAgaWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQocmVtb3ZlKTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuc2l6ZTtcbiAgICByZXR1cm4gaXRlbTtcbiAgfVxuICBkZWxldGUoaXRlbSkge1xuICAgIGlmICh0aGlzW01hcHBlZF0pIHtcbiAgICAgIHJldHVybiB0aGlzW01hcHBlZF0uZGVsZXRlKGl0ZW0pO1xuICAgIH1cbiAgICB0aGlzW0RlbGV0ZV0oaXRlbSk7XG4gIH1cbiAgW0RlbGV0ZV0oaXRlbSkge1xuICAgIHRoaXMucmVtb3ZlKGl0ZW0pO1xuICB9XG4gIG1hcChtYXBwZXIgPSB4ID0+IHgsIGZpbHRlciA9IHggPT4geCkge1xuICAgIHZhciBtYXBwZWRJdGVtcyA9IG5ldyBXZWFrTWFwKCk7XG4gICAgdmFyIG1hcHBlZEJhZyA9IG5ldyBCYWcoKTtcbiAgICBtYXBwZWRCYWdbTWFwcGVkXSA9IHRoaXM7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdhZGRlZCcsIGV2ZW50ID0+IHtcbiAgICAgIHZhciBpdGVtID0gZXZlbnQuZGV0YWlsLml0ZW07XG4gICAgICBpZiAoIWZpbHRlcihpdGVtKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAobWFwcGVkSXRlbXMuaGFzKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBtYXBwZWQgPSBtYXBwZXIoaXRlbSk7XG4gICAgICBtYXBwZWRJdGVtcy5zZXQoaXRlbSwgbWFwcGVkKTtcbiAgICAgIG1hcHBlZEJhZ1tBZGRdKG1hcHBlZCk7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdyZW1vdmVkJywgZXZlbnQgPT4ge1xuICAgICAgdmFyIGl0ZW0gPSBldmVudC5kZXRhaWwuaXRlbTtcbiAgICAgIGlmICghbWFwcGVkSXRlbXMuaGFzKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBtYXBwZWQgPSBtYXBwZWRJdGVtcy5nZXQoaXRlbSk7XG4gICAgICBtYXBwZWRJdGVtcy5kZWxldGUoaXRlbSk7XG4gICAgICBtYXBwZWRCYWdbUmVtb3ZlXShtYXBwZWQpO1xuICAgIH0pO1xuICAgIHJldHVybiBtYXBwZWRCYWc7XG4gIH1cbiAgZ2V0IHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29udGVudC5zaXplO1xuICB9XG4gIGl0ZW1zKCkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuY29udGVudC5lbnRyaWVzKCkpLm1hcChlbnRyeSA9PiBlbnRyeVswXSk7XG4gIH1cbn1cbmV4cG9ydHMuQmFnID0gQmFnO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJhZywgJ0lURU1fQURERUQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IDFcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJhZywgJ0lURU1fUkVNT1ZFRCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogLTFcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQmluZGFibGUuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLkJpbmRhYmxlID0gdm9pZCAwO1xuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KGUsIHIsIHQpIHsgcmV0dXJuIChyID0gX3RvUHJvcGVydHlLZXkocikpIGluIGUgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgciwgeyB2YWx1ZTogdCwgZW51bWVyYWJsZTogITAsIGNvbmZpZ3VyYWJsZTogITAsIHdyaXRhYmxlOiAhMCB9KSA6IGVbcl0gPSB0LCBlOyB9XG5mdW5jdGlvbiBfdG9Qcm9wZXJ0eUtleSh0KSB7IHZhciBpID0gX3RvUHJpbWl0aXZlKHQsIFwic3RyaW5nXCIpOyByZXR1cm4gXCJzeW1ib2xcIiA9PSB0eXBlb2YgaSA/IGkgOiBpICsgXCJcIjsgfVxuZnVuY3Rpb24gX3RvUHJpbWl0aXZlKHQsIHIpIHsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIHQgfHwgIXQpIHJldHVybiB0OyB2YXIgZSA9IHRbU3ltYm9sLnRvUHJpbWl0aXZlXTsgaWYgKHZvaWQgMCAhPT0gZSkgeyB2YXIgaSA9IGUuY2FsbCh0LCByIHx8IFwiZGVmYXVsdFwiKTsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIGkpIHJldHVybiBpOyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQEB0b1ByaW1pdGl2ZSBtdXN0IHJldHVybiBhIHByaW1pdGl2ZSB2YWx1ZS5cIik7IH0gcmV0dXJuIChcInN0cmluZ1wiID09PSByID8gU3RyaW5nIDogTnVtYmVyKSh0KTsgfVxudmFyIFJlZiA9IFN5bWJvbCgncmVmJyk7XG52YXIgT3JpZ2luYWwgPSBTeW1ib2woJ29yaWdpbmFsJyk7XG52YXIgRGVjayA9IFN5bWJvbCgnZGVjaycpO1xudmFyIEJpbmRpbmcgPSBTeW1ib2woJ2JpbmRpbmcnKTtcbnZhciBTdWJCaW5kaW5nID0gU3ltYm9sKCdzdWJCaW5kaW5nJyk7XG52YXIgQmluZGluZ0FsbCA9IFN5bWJvbCgnYmluZGluZ0FsbCcpO1xudmFyIElzQmluZGFibGUgPSBTeW1ib2woJ2lzQmluZGFibGUnKTtcbnZhciBXcmFwcGluZyA9IFN5bWJvbCgnd3JhcHBpbmcnKTtcbnZhciBOYW1lcyA9IFN5bWJvbCgnTmFtZXMnKTtcbnZhciBFeGVjdXRpbmcgPSBTeW1ib2woJ2V4ZWN1dGluZycpO1xudmFyIFN0YWNrID0gU3ltYm9sKCdzdGFjaycpO1xudmFyIE9ialN5bWJvbCA9IFN5bWJvbCgnb2JqZWN0Jyk7XG52YXIgV3JhcHBlZCA9IFN5bWJvbCgnd3JhcHBlZCcpO1xudmFyIFVud3JhcHBlZCA9IFN5bWJvbCgndW53cmFwcGVkJyk7XG52YXIgR2V0UHJvdG8gPSBTeW1ib2woJ2dldFByb3RvJyk7XG52YXIgT25HZXQgPSBTeW1ib2woJ29uR2V0Jyk7XG52YXIgT25BbGxHZXQgPSBTeW1ib2woJ29uQWxsR2V0Jyk7XG52YXIgQmluZENoYWluID0gU3ltYm9sKCdiaW5kQ2hhaW4nKTtcbnZhciBEZXNjcmlwdG9ycyA9IFN5bWJvbCgnRGVzY3JpcHRvcnMnKTtcbnZhciBCZWZvcmUgPSBTeW1ib2woJ0JlZm9yZScpO1xudmFyIEFmdGVyID0gU3ltYm9sKCdBZnRlcicpO1xudmFyIE5vR2V0dGVycyA9IFN5bWJvbCgnTm9HZXR0ZXJzJyk7XG52YXIgUHJldmVudCA9IFN5bWJvbCgnUHJldmVudCcpO1xudmFyIFR5cGVkQXJyYXkgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoSW50OEFycmF5KTtcbnZhciBTZXRJdGVyYXRvciA9IFNldC5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXTtcbnZhciBNYXBJdGVyYXRvciA9IE1hcC5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXTtcbnZhciB3aW4gPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcgPyBnbG9iYWxUaGlzIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogdm9pZCAwO1xudmFyIGlzRXhjbHVkZWQgPSBvYmplY3QgPT4gdHlwZW9mIHdpbi5NYXAgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLk1hcCB8fCB0eXBlb2Ygd2luLlNldCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uU2V0IHx8IHR5cGVvZiB3aW4uTm9kZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTm9kZSB8fCB0eXBlb2Ygd2luLldlYWtNYXAgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLldlYWtNYXAgfHwgdHlwZW9mIHdpbi5Mb2NhdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uTG9jYXRpb24gfHwgdHlwZW9mIHdpbi5TdG9yYWdlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5TdG9yYWdlIHx8IHR5cGVvZiB3aW4uV2Vha1NldCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uV2Vha1NldCB8fCB0eXBlb2Ygd2luLkFycmF5QnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5BcnJheUJ1ZmZlciB8fCB0eXBlb2Ygd2luLlByb21pc2UgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlByb21pc2UgfHwgdHlwZW9mIHdpbi5GaWxlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5GaWxlIHx8IHR5cGVvZiB3aW4uRXZlbnQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkV2ZW50IHx8IHR5cGVvZiB3aW4uQ3VzdG9tRXZlbnQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkN1c3RvbUV2ZW50IHx8IHR5cGVvZiB3aW4uR2FtZXBhZCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uR2FtZXBhZCB8fCB0eXBlb2Ygd2luLlJlc2l6ZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5SZXNpemVPYnNlcnZlciB8fCB0eXBlb2Ygd2luLk11dGF0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLk11dGF0aW9uT2JzZXJ2ZXIgfHwgdHlwZW9mIHdpbi5QZXJmb3JtYW5jZU9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5QZXJmb3JtYW5jZU9ic2VydmVyIHx8IHR5cGVvZiB3aW4uSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkludGVyc2VjdGlvbk9ic2VydmVyIHx8IHR5cGVvZiB3aW4uSURCQ3Vyc29yID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJDdXJzb3IgfHwgdHlwZW9mIHdpbi5JREJDdXJzb3JXaXRoVmFsdWUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkN1cnNvcldpdGhWYWx1ZSB8fCB0eXBlb2Ygd2luLklEQkRhdGFiYXNlID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJEYXRhYmFzZSB8fCB0eXBlb2Ygd2luLklEQkZhY3RvcnkgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLklEQkZhY3RvcnkgfHwgdHlwZW9mIHdpbi5JREJJbmRleCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCSW5kZXggfHwgdHlwZW9mIHdpbi5JREJLZXlSYW5nZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCS2V5UmFuZ2UgfHwgdHlwZW9mIHdpbi5JREJPYmplY3RTdG9yZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCT2JqZWN0U3RvcmUgfHwgdHlwZW9mIHdpbi5JREJPcGVuREJSZXF1ZXN0ID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJPcGVuREJSZXF1ZXN0IHx8IHR5cGVvZiB3aW4uSURCUmVxdWVzdCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCUmVxdWVzdCB8fCB0eXBlb2Ygd2luLklEQlRyYW5zYWN0aW9uID09PSAnZnVuY3Rpb24nICYmIG9iamVjdCBpbnN0YW5jZW9mIHdpbi5JREJUcmFuc2FjdGlvbiB8fCB0eXBlb2Ygd2luLklEQlZlcnNpb25DaGFuZ2VFdmVudCA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uSURCVmVyc2lvbkNoYW5nZUV2ZW50IHx8IHR5cGVvZiB3aW4uRmlsZVN5c3RlbUZpbGVIYW5kbGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLkZpbGVTeXN0ZW1GaWxlSGFuZGxlIHx8IHR5cGVvZiB3aW4uUlRDUGVlckNvbm5lY3Rpb24gPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2Ygd2luLlJUQ1BlZXJDb25uZWN0aW9uIHx8IHR5cGVvZiB3aW4uU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbiA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uU2VydmljZVdvcmtlclJlZ2lzdHJhdGlvbiB8fCB0eXBlb2Ygd2luLldlYkdMVGV4dHVyZSA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmplY3QgaW5zdGFuY2VvZiB3aW4uV2ViR0xUZXh0dXJlO1xuY2xhc3MgQmluZGFibGUge1xuICBzdGF0aWMgaXNCaW5kYWJsZShvYmplY3QpIHtcbiAgICBpZiAoIW9iamVjdCB8fCAhb2JqZWN0W0lzQmluZGFibGVdIHx8ICFvYmplY3RbUHJldmVudF0pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdFtJc0JpbmRhYmxlXSA9PT0gQmluZGFibGU7XG4gIH1cbiAgc3RhdGljIG9uRGVjayhvYmplY3QsIGtleSkge1xuICAgIHJldHVybiBvYmplY3RbRGVja10uZ2V0KGtleSkgfHwgZmFsc2U7XG4gIH1cbiAgc3RhdGljIHJlZihvYmplY3QpIHtcbiAgICByZXR1cm4gb2JqZWN0W1JlZl0gfHwgb2JqZWN0IHx8IGZhbHNlO1xuICB9XG4gIHN0YXRpYyBtYWtlQmluZGFibGUob2JqZWN0KSB7XG4gICAgcmV0dXJuIHRoaXMubWFrZShvYmplY3QpO1xuICB9XG4gIHN0YXRpYyBzaHVjayhvcmlnaW5hbCwgc2Vlbikge1xuICAgIHNlZW4gPSBzZWVuIHx8IG5ldyBNYXAoKTtcbiAgICB2YXIgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHt9KTtcbiAgICBpZiAob3JpZ2luYWwgaW5zdGFuY2VvZiBUeXBlZEFycmF5IHx8IG9yaWdpbmFsIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIHZhciBfY2xvbmUgPSBvcmlnaW5hbC5zbGljZSgwKTtcbiAgICAgIHNlZW4uc2V0KG9yaWdpbmFsLCBfY2xvbmUpO1xuICAgICAgcmV0dXJuIF9jbG9uZTtcbiAgICB9XG4gICAgdmFyIHByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhvcmlnaW5hbCk7XG4gICAgZm9yICh2YXIgaSBpbiBwcm9wZXJ0aWVzKSB7XG4gICAgICB2YXIgaWkgPSBwcm9wZXJ0aWVzW2ldO1xuICAgICAgaWYgKGlpLnN1YnN0cmluZygwLCAzKSA9PT0gJ19fXycpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgYWxyZWFkeUNsb25lZCA9IHNlZW4uZ2V0KG9yaWdpbmFsW2lpXSk7XG4gICAgICBpZiAoYWxyZWFkeUNsb25lZCkge1xuICAgICAgICBjbG9uZVtpaV0gPSBhbHJlYWR5Q2xvbmVkO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcmlnaW5hbFtpaV0gPT09IG9yaWdpbmFsKSB7XG4gICAgICAgIHNlZW4uc2V0KG9yaWdpbmFsW2lpXSwgY2xvbmUpO1xuICAgICAgICBjbG9uZVtpaV0gPSBjbG9uZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAob3JpZ2luYWxbaWldICYmIHR5cGVvZiBvcmlnaW5hbFtpaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhciBvcmlnaW5hbFByb3AgPSBvcmlnaW5hbFtpaV07XG4gICAgICAgIGlmIChCaW5kYWJsZS5pc0JpbmRhYmxlKG9yaWdpbmFsW2lpXSkpIHtcbiAgICAgICAgICBvcmlnaW5hbFByb3AgPSBvcmlnaW5hbFtpaV1bT3JpZ2luYWxdO1xuICAgICAgICB9XG4gICAgICAgIGNsb25lW2lpXSA9IHRoaXMuc2h1Y2sob3JpZ2luYWxQcm9wLCBzZWVuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNsb25lW2lpXSA9IG9yaWdpbmFsW2lpXTtcbiAgICAgIH1cbiAgICAgIHNlZW4uc2V0KG9yaWdpbmFsW2lpXSwgY2xvbmVbaWldKTtcbiAgICB9XG4gICAgaWYgKEJpbmRhYmxlLmlzQmluZGFibGUob3JpZ2luYWwpKSB7XG4gICAgICBkZWxldGUgY2xvbmUuYmluZFRvO1xuICAgICAgZGVsZXRlIGNsb25lLmlzQm91bmQ7XG4gICAgfVxuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuICBzdGF0aWMgbWFrZShvYmplY3QpIHtcbiAgICBpZiAob2JqZWN0W1ByZXZlbnRdKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBpZiAoIW9iamVjdCB8fCAhWydmdW5jdGlvbicsICdvYmplY3QnXS5pbmNsdWRlcyh0eXBlb2Ygb2JqZWN0KSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKFJlZiBpbiBvYmplY3QpIHtcbiAgICAgIHJldHVybiBvYmplY3RbUmVmXTtcbiAgICB9XG4gICAgaWYgKG9iamVjdFtJc0JpbmRhYmxlXSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gICAgaWYgKE9iamVjdC5pc1NlYWxlZChvYmplY3QpIHx8IE9iamVjdC5pc0Zyb3plbihvYmplY3QpIHx8ICFPYmplY3QuaXNFeHRlbnNpYmxlKG9iamVjdCkgfHwgaXNFeGNsdWRlZChvYmplY3QpKSB7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBJc0JpbmRhYmxlLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogQmluZGFibGVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBSZWYsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICB2YWx1ZTogZmFsc2VcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBPcmlnaW5hbCwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG9iamVjdFxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIERlY2ssIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCaW5kaW5nLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFN1YkJpbmRpbmcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBCaW5kaW5nQWxsLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgRXhlY3V0aW5nLCB7XG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgV3JhcHBpbmcsIHtcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTdGFjaywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IFtdXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmVmb3JlLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogbmV3IFNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQWZ0ZXIsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBXcmFwcGVkLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG5ldyBNYXAoKSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBVbndyYXBwZWQsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBPYmplY3QucHJldmVudEV4dGVuc2lvbnMobmV3IE1hcCgpKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIERlc2NyaXB0b3JzLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKG5ldyBNYXAoKSlcbiAgICB9KTtcbiAgICB2YXIgYmluZFRvID0gKHByb3BlcnR5LCBjYWxsYmFjayA9IG51bGwsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgdmFyIGJpbmRUb0FsbCA9IGZhbHNlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcGVydHkpKSB7XG4gICAgICAgIHZhciBkZWJpbmRlcnMgPSBwcm9wZXJ0eS5tYXAocCA9PiBiaW5kVG8ocCwgY2FsbGJhY2ssIG9wdGlvbnMpKTtcbiAgICAgICAgcmV0dXJuICgpID0+IGRlYmluZGVycy5mb3JFYWNoKGQgPT4gZCgpKTtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9wZXJ0eSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIG9wdGlvbnMgPSBjYWxsYmFjayB8fCB7fTtcbiAgICAgICAgY2FsbGJhY2sgPSBwcm9wZXJ0eTtcbiAgICAgICAgYmluZFRvQWxsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmRlbGF5ID49IDApIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBEZWxheUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLmRlbGF5KTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnRocm90dGxlID49IDApIHtcbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLndyYXBUaHJvdHRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zLnRocm90dGxlKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLndhaXQgPj0gMCkge1xuICAgICAgICBjYWxsYmFjayA9IHRoaXMud3JhcFdhaXRDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy53YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZyYW1lKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwRnJhbWVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucy5mcmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5pZGxlKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGhpcy53cmFwSWRsZUNhbGxiYWNrKGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChiaW5kVG9BbGwpIHtcbiAgICAgICAgb2JqZWN0W0JpbmRpbmdBbGxdLmFkZChjYWxsYmFjayk7XG4gICAgICAgIGlmICghKCdub3cnIGluIG9wdGlvbnMpIHx8IG9wdGlvbnMubm93KSB7XG4gICAgICAgICAgZm9yICh2YXIgaSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG9iamVjdFtpXSwgaSwgb2JqZWN0LCBmYWxzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgb2JqZWN0W0JpbmRpbmdBbGxdLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBpZiAoIW9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0pIHtcbiAgICAgICAgb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XSA9IG5ldyBTZXQoKTtcbiAgICAgIH1cblxuICAgICAgLy8gbGV0IGJpbmRJbmRleCA9IG9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0ubGVuZ3RoO1xuXG4gICAgICBpZiAob3B0aW9ucy5jaGlsZHJlbikge1xuICAgICAgICB2YXIgb3JpZ2luYWwgPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2sgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgIHZhciB2ID0gYXJnc1swXTtcbiAgICAgICAgICB2YXIgc3ViRGViaW5kID0gb2JqZWN0W1N1YkJpbmRpbmddLmdldChvcmlnaW5hbCk7XG4gICAgICAgICAgaWYgKHN1YkRlYmluZCkge1xuICAgICAgICAgICAgb2JqZWN0W1N1YkJpbmRpbmddLmRlbGV0ZShvcmlnaW5hbCk7XG4gICAgICAgICAgICBzdWJEZWJpbmQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgb3JpZ2luYWwoLi4uYXJncyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciB2diA9IEJpbmRhYmxlLm1ha2Uodik7XG4gICAgICAgICAgaWYgKEJpbmRhYmxlLmlzQmluZGFibGUodnYpKSB7XG4gICAgICAgICAgICBvYmplY3RbU3ViQmluZGluZ10uc2V0KG9yaWdpbmFsLCB2di5iaW5kVG8oKC4uLnN1YkFyZ3MpID0+IG9yaWdpbmFsKC4uLmFyZ3MsIC4uLnN1YkFyZ3MpLCBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgIGNoaWxkcmVuOiBmYWxzZVxuICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3JpZ2luYWwoLi4uYXJncyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmFkZChjYWxsYmFjayk7XG4gICAgICBpZiAoISgnbm93JyBpbiBvcHRpb25zKSB8fCBvcHRpb25zLm5vdykge1xuICAgICAgICBjYWxsYmFjayhvYmplY3RbcHJvcGVydHldLCBwcm9wZXJ0eSwgb2JqZWN0LCBmYWxzZSk7XG4gICAgICB9XG4gICAgICB2YXIgZGViaW5kZXIgPSAoKSA9PiB7XG4gICAgICAgIHZhciBzdWJEZWJpbmQgPSBvYmplY3RbU3ViQmluZGluZ10uZ2V0KGNhbGxiYWNrKTtcbiAgICAgICAgaWYgKHN1YkRlYmluZCkge1xuICAgICAgICAgIG9iamVjdFtTdWJCaW5kaW5nXS5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICAgIHN1YkRlYmluZCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb2JqZWN0W0JpbmRpbmddW3Byb3BlcnR5XSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9iamVjdFtCaW5kaW5nXVtwcm9wZXJ0eV0uaGFzKGNhbGxiYWNrKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvYmplY3RbQmluZGluZ11bcHJvcGVydHldLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICB9O1xuICAgICAgaWYgKG9wdGlvbnMucmVtb3ZlV2l0aCAmJiBvcHRpb25zLnJlbW92ZVdpdGggaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICAgIG9wdGlvbnMucmVtb3ZlV2l0aC5vblJlbW92ZSgoKSA9PiBkZWJpbmRlcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGViaW5kZXI7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnYmluZFRvJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IGJpbmRUb1xuICAgIH0pO1xuICAgIHZhciBfX19iZWZvcmUgPSBjYWxsYmFjayA9PiB7XG4gICAgICBvYmplY3RbQmVmb3JlXS5hZGQoY2FsbGJhY2spO1xuICAgICAgcmV0dXJuICgpID0+IG9iamVjdFtCZWZvcmVdLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgfTtcbiAgICB2YXIgX19fYWZ0ZXIgPSBjYWxsYmFjayA9PiB7XG4gICAgICBvYmplY3RbQWZ0ZXJdLmFkZChjYWxsYmFjayk7XG4gICAgICByZXR1cm4gKCkgPT4gb2JqZWN0W0FmdGVyXS5kZWxldGUoY2FsbGJhY2spO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgQmluZENoYWluLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogKHBhdGgsIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICAgICAgdmFyIG5vZGUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICB2YXIgc3ViUGFydHMgPSBwYXJ0cy5zbGljZSgwKTtcbiAgICAgICAgdmFyIGRlYmluZCA9IFtdO1xuICAgICAgICBkZWJpbmQucHVzaChvYmplY3QuYmluZFRvKG5vZGUsICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgdmFyIHJlc3QgPSBzdWJQYXJ0cy5qb2luKCcuJyk7XG4gICAgICAgICAgaWYgKHN1YlBhcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbGJhY2sodiwgaywgdCwgZCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHYgPSB0W2tdID0gdGhpcy5tYWtlKHt9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGViaW5kID0gZGViaW5kLmNvbmNhdCh2W0JpbmRDaGFpbl0ocmVzdCwgY2FsbGJhY2spKTtcbiAgICAgICAgfSkpO1xuICAgICAgICByZXR1cm4gKCkgPT4gZGViaW5kLmZvckVhY2goeCA9PiB4KCkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsICdfX19iZWZvcmUnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogX19fYmVmb3JlXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgJ19fX2FmdGVyJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IF9fX2FmdGVyXG4gICAgfSk7XG4gICAgdmFyIGlzQm91bmQgPSAoKSA9PiB7XG4gICAgICBpZiAob2JqZWN0W0JpbmRpbmdBbGxdLnNpemUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBjYWxsYmFja3Mgb2YgT2JqZWN0LnZhbHVlcyhvYmplY3RbQmluZGluZ10pKSB7XG4gICAgICAgIGlmIChjYWxsYmFja3Muc2l6ZSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcihsZXQgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKVxuICAgICAgICAvLyB7XG4gICAgICAgIC8vIFx0aWYoY2FsbGJhY2spXG4gICAgICAgIC8vIFx0e1xuICAgICAgICAvLyBcdFx0cmV0dXJuIHRydWU7XG4gICAgICAgIC8vIFx0fVxuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnaXNCb3VuZCcsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBpc0JvdW5kXG4gICAgfSk7XG4gICAgZm9yICh2YXIgaSBpbiBvYmplY3QpIHtcbiAgICAgIC8vIGNvbnN0IGRlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob2JqZWN0KTtcblxuICAgICAgaWYgKCFvYmplY3RbaV0gfHwgdHlwZW9mIG9iamVjdFtpXSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAob2JqZWN0W2ldW1JlZl0gfHwgb2JqZWN0W2ldIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZShvYmplY3RbaV0pIHx8IE9iamVjdC5pc1NlYWxlZChvYmplY3RbaV0pKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0V4Y2x1ZGVkKG9iamVjdFtpXSkpIHtcbiAgICAgICAgb2JqZWN0W2ldID0gQmluZGFibGUubWFrZShvYmplY3RbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZGVzY3JpcHRvcnMgPSBvYmplY3RbRGVzY3JpcHRvcnNdO1xuICAgIHZhciB3cmFwcGVkID0gb2JqZWN0W1dyYXBwZWRdO1xuICAgIHZhciBzdGFjayA9IG9iamVjdFtTdGFja107XG4gICAgdmFyIHNldCA9ICh0YXJnZXQsIGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhbHVlID0gQmluZGFibGUubWFrZSh2YWx1ZSk7XG4gICAgICAgIGlmICh0YXJnZXRba2V5XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdyYXBwZWQuaGFzKGtleSkpIHtcbiAgICAgICAgd3JhcHBlZC5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICAgIHZhciBvbkRlY2sgPSBvYmplY3RbRGVja107XG4gICAgICB2YXIgaXNPbkRlY2sgPSBvbkRlY2suaGFzKGtleSk7XG4gICAgICB2YXIgdmFsT25EZWNrID0gaXNPbkRlY2sgJiYgb25EZWNrLmdldChrZXkpO1xuXG4gICAgICAvLyBpZihvbkRlY2tba2V5XSAhPT0gdW5kZWZpbmVkICYmIG9uRGVja1trZXldID09PSB2YWx1ZSlcbiAgICAgIGlmIChpc09uRGVjayAmJiB2YWxPbkRlY2sgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGtleS5zbGljZSAmJiBrZXkuc2xpY2UoLTMpID09PSAnX19fJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0YXJnZXRba2V5XSA9PT0gdmFsdWUgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBpc05hTih2YWxPbkRlY2spICYmIGlzTmFOKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIG9uRGVjay5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICBmb3IgKHZhciBjYWxsYmFjayBvZiBvYmplY3RbQmluZGluZ0FsbF0pIHtcbiAgICAgICAgY2FsbGJhY2sodmFsdWUsIGtleSwgdGFyZ2V0LCBmYWxzZSk7XG4gICAgICB9XG4gICAgICBpZiAoa2V5IGluIG9iamVjdFtCaW5kaW5nXSkge1xuICAgICAgICBmb3IgKHZhciBfY2FsbGJhY2sgb2Ygb2JqZWN0W0JpbmRpbmddW2tleV0pIHtcbiAgICAgICAgICBfY2FsbGJhY2sodmFsdWUsIGtleSwgdGFyZ2V0LCBmYWxzZSwgdGFyZ2V0W2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvbkRlY2suZGVsZXRlKGtleSk7XG4gICAgICB2YXIgZXhjbHVkZWQgPSB3aW4uRmlsZSAmJiB0YXJnZXQgaW5zdGFuY2VvZiB3aW4uRmlsZSAmJiBrZXkgPT0gJ2xhc3RNb2RpZmllZERhdGUnO1xuICAgICAgaWYgKCFleGNsdWRlZCkge1xuICAgICAgICBSZWZsZWN0LnNldCh0YXJnZXQsIGtleSwgdmFsdWUpO1xuICAgICAgfVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSAmJiBvYmplY3RbQmluZGluZ11bJ2xlbmd0aCddKSB7XG4gICAgICAgIGZvciAodmFyIF9pIGluIG9iamVjdFtCaW5kaW5nXVsnbGVuZ3RoJ10pIHtcbiAgICAgICAgICB2YXIgX2NhbGxiYWNrMiA9IG9iamVjdFtCaW5kaW5nXVsnbGVuZ3RoJ11bX2ldO1xuICAgICAgICAgIF9jYWxsYmFjazIodGFyZ2V0Lmxlbmd0aCwgJ2xlbmd0aCcsIHRhcmdldCwgZmFsc2UsIHRhcmdldC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICAgIHZhciBkZWxldGVQcm9wZXJ0eSA9ICh0YXJnZXQsIGtleSkgPT4ge1xuICAgICAgdmFyIG9uRGVjayA9IG9iamVjdFtEZWNrXTtcbiAgICAgIHZhciBpc09uRGVjayA9IG9uRGVjay5oYXMoa2V5KTtcbiAgICAgIGlmIChpc09uRGVjaykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghKGtleSBpbiB0YXJnZXQpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0b3JzLmhhcyhrZXkpKSB7XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvcnMuZ2V0KGtleSk7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBkZXNjcmlwdG9ycy5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICAgIG9uRGVjay5zZXQoa2V5LCBudWxsKTtcbiAgICAgIGlmICh3cmFwcGVkLmhhcyhrZXkpKSB7XG4gICAgICAgIHdyYXBwZWQuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBjYWxsYmFjayBvZiBvYmplY3RbQmluZGluZ0FsbF0pIHtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBrZXksIHRhcmdldCwgdHJ1ZSwgdGFyZ2V0W2tleV0pO1xuICAgICAgfVxuICAgICAgaWYgKGtleSBpbiBvYmplY3RbQmluZGluZ10pIHtcbiAgICAgICAgZm9yICh2YXIgYmluZGluZyBvZiBvYmplY3RbQmluZGluZ11ba2V5XSkge1xuICAgICAgICAgIGJpbmRpbmcodW5kZWZpbmVkLCBrZXksIHRhcmdldCwgdHJ1ZSwgdGFyZ2V0W2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwga2V5KTtcbiAgICAgIG9uRGVjay5kZWxldGUoa2V5KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gICAgdmFyIGNvbnN0cnVjdCA9ICh0YXJnZXQsIGFyZ3MpID0+IHtcbiAgICAgIHZhciBrZXkgPSAnY29uc3RydWN0b3InO1xuICAgICAgZm9yICh2YXIgY2FsbGJhY2sgb2YgdGFyZ2V0W0JlZm9yZV0pIHtcbiAgICAgICAgY2FsbGJhY2sodGFyZ2V0LCBrZXksIG9iamVjdFtTdGFja10sIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICB9XG4gICAgICB2YXIgaW5zdGFuY2UgPSBCaW5kYWJsZS5tYWtlKG5ldyB0YXJnZXRbT3JpZ2luYWxdKC4uLmFyZ3MpKTtcbiAgICAgIGZvciAodmFyIF9jYWxsYmFjazMgb2YgdGFyZ2V0W0FmdGVyXSkge1xuICAgICAgICBfY2FsbGJhY2szKHRhcmdldCwga2V5LCBvYmplY3RbU3RhY2tdLCBpbnN0YW5jZSwgYXJncyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfTtcbiAgICB2YXIgZ2V0ID0gKHRhcmdldCwga2V5KSA9PiB7XG4gICAgICBpZiAod3JhcHBlZC5oYXMoa2V5KSkge1xuICAgICAgICByZXR1cm4gd3JhcHBlZC5nZXQoa2V5KTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgPT09IFJlZiB8fCBrZXkgPT09IE9yaWdpbmFsIHx8IGtleSA9PT0gJ2FwcGx5JyB8fCBrZXkgPT09ICdpc0JvdW5kJyB8fCBrZXkgPT09ICdiaW5kVG8nIHx8IGtleSA9PT0gJ19fcHJvdG9fXycgfHwga2V5ID09PSAnY29uc3RydWN0b3InKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgIH1cbiAgICAgIHZhciBkZXNjcmlwdG9yO1xuICAgICAgaWYgKGRlc2NyaXB0b3JzLmhhcyhrZXkpKSB7XG4gICAgICAgIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ycy5nZXQoa2V5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwga2V5KTtcbiAgICAgICAgZGVzY3JpcHRvcnMuc2V0KGtleSwgZGVzY3JpcHRvcik7XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5jb25maWd1cmFibGUgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfVxuICAgICAgaWYgKE9uQWxsR2V0IGluIG9iamVjdCkge1xuICAgICAgICByZXR1cm4gb2JqZWN0W09uQWxsR2V0XShrZXkpO1xuICAgICAgfVxuICAgICAgaWYgKE9uR2V0IGluIG9iamVjdCAmJiAhKGtleSBpbiBvYmplY3QpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RbT25HZXRdKGtleSk7XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5jb25maWd1cmFibGUgJiYgIWRlc2NyaXB0b3Iud3JpdGFibGUpIHtcbiAgICAgICAgd3JhcHBlZC5zZXQoa2V5LCBvYmplY3Rba2V5XSk7XG4gICAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2Ygb2JqZWN0W2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaWYgKE5hbWVzIGluIG9iamVjdFtrZXldKSB7XG4gICAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgICB9XG4gICAgICAgIG9iamVjdFtVbndyYXBwZWRdLnNldChrZXksIG9iamVjdFtrZXldKTtcbiAgICAgICAgdmFyIHByb3RvdHlwZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpO1xuICAgICAgICB2YXIgaXNNZXRob2QgPSBwcm90b3R5cGVba2V5XSA9PT0gb2JqZWN0W2tleV07XG4gICAgICAgIHZhciBvYmpSZWYgPVxuICAgICAgICAvLyAodHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFByb21pc2UpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgU3RvcmFnZSA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgU3RvcmFnZSlcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBNYXAgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBNYXApXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgU2V0ID09PSAnZnVuY3Rpb24nICAgICAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgU2V0KVxuICAgICAgICAvLyB8fCAodHlwZW9mIFdlYWtNYXAgPT09ICdmdW5jdGlvbicgICAgICAgICAgICAgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFdlYWtNYXApXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgV2Vha1NldCA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgV2Vha1NldClcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBSZXNpemVPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyAgICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBSZXNpemVPYnNlcnZlcilcbiAgICAgICAgLy8gfHwgKHR5cGVvZiBNdXRhdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICAgICAgICAmJiBvYmplY3QgaW5zdGFuY2VvZiBNdXRhdGlvbk9ic2VydmVyKVxuICAgICAgICAvLyB8fCAodHlwZW9mIFBlcmZvcm1hbmNlT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgICYmIG9iamVjdCBpbnN0YW5jZW9mIFBlcmZvcm1hbmNlT2JzZXJ2ZXIpXG4gICAgICAgIC8vIHx8ICh0eXBlb2YgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgICAgJiYgb2JqZWN0IGluc3RhbmNlb2YgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIpXG4gICAgICAgIGlzRXhjbHVkZWQob2JqZWN0KSB8fCB0eXBlb2Ygb2JqZWN0W1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbicgJiYga2V5ID09PSAnbmV4dCcgfHwgdHlwZW9mIFR5cGVkQXJyYXkgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2YgVHlwZWRBcnJheSB8fCB0eXBlb2YgRXZlbnRUYXJnZXQgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2YgRXZlbnRUYXJnZXQgfHwgdHlwZW9mIERhdGUgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0IGluc3RhbmNlb2YgRGF0ZSB8fCB0eXBlb2YgTWFwSXRlcmF0b3IgPT09ICdmdW5jdGlvbicgJiYgb2JqZWN0LnByb3RvdHlwZSA9PT0gTWFwSXRlcmF0b3IgfHwgdHlwZW9mIFNldEl0ZXJhdG9yID09PSAnZnVuY3Rpb24nICYmIG9iamVjdC5wcm90b3R5cGUgPT09IFNldEl0ZXJhdG9yID8gb2JqZWN0IDogb2JqZWN0W1JlZl07XG4gICAgICAgIHZhciB3cmFwcGVkTWV0aG9kID0gZnVuY3Rpb24gKC4uLnByb3ZpZGVkQXJncykge1xuICAgICAgICAgIG9iamVjdFtFeGVjdXRpbmddID0ga2V5O1xuICAgICAgICAgIHN0YWNrLnVuc2hpZnQoa2V5KTtcbiAgICAgICAgICBmb3IgKHZhciBiZWZvcmVDYWxsYmFjayBvZiBvYmplY3RbQmVmb3JlXSkge1xuICAgICAgICAgICAgYmVmb3JlQ2FsbGJhY2sob2JqZWN0LCBrZXksIHN0YWNrLCBvYmplY3QsIHByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZXQ7XG4gICAgICAgICAgaWYgKG5ldy50YXJnZXQpIHtcbiAgICAgICAgICAgIHJldCA9IG5ldyAob2JqZWN0W1Vud3JhcHBlZF0uZ2V0KGtleSkpKC4uLnByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBmdW5jID0gb2JqZWN0W1Vud3JhcHBlZF0uZ2V0KGtleSk7XG4gICAgICAgICAgICBpZiAoaXNNZXRob2QpIHtcbiAgICAgICAgICAgICAgcmV0ID0gZnVuYy5hcHBseShvYmpSZWYgfHwgb2JqZWN0LCBwcm92aWRlZEFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0ID0gZnVuYyguLi5wcm92aWRlZEFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKHZhciBhZnRlckNhbGxiYWNrIG9mIG9iamVjdFtBZnRlcl0pIHtcbiAgICAgICAgICAgIGFmdGVyQ2FsbGJhY2sob2JqZWN0LCBrZXksIHN0YWNrLCBvYmplY3QsIHByb3ZpZGVkQXJncyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9iamVjdFtFeGVjdXRpbmddID0gbnVsbDtcbiAgICAgICAgICBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH07XG4gICAgICAgIHdyYXBwZWRNZXRob2RbT25BbGxHZXRdID0gX2tleSA9PiBvYmplY3Rba2V5XVtfa2V5XTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IEJpbmRhYmxlLm1ha2Uod3JhcHBlZE1ldGhvZCk7XG4gICAgICAgIHdyYXBwZWQuc2V0KGtleSwgcmVzdWx0KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmplY3Rba2V5XTtcbiAgICB9O1xuICAgIHZhciBnZXRQcm90b3R5cGVPZiA9IHRhcmdldCA9PiB7XG4gICAgICBpZiAoR2V0UHJvdG8gaW4gb2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBvYmplY3RbR2V0UHJvdG9dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFJlZmxlY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcbiAgICB9O1xuICAgIHZhciBoYW5kbGVyRGVmID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBoYW5kbGVyRGVmLnNldCA9IHNldDtcbiAgICBoYW5kbGVyRGVmLmNvbnN0cnVjdCA9IGNvbnN0cnVjdDtcbiAgICBoYW5kbGVyRGVmLmRlbGV0ZVByb3BlcnR5ID0gZGVsZXRlUHJvcGVydHk7XG4gICAgaWYgKCFvYmplY3RbTm9HZXR0ZXJzXSkge1xuICAgICAgaGFuZGxlckRlZi5nZXRQcm90b3R5cGVPZiA9IGdldFByb3RvdHlwZU9mO1xuICAgICAgaGFuZGxlckRlZi5nZXQgPSBnZXQ7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFJlZiwge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IG5ldyBQcm94eShvYmplY3QsIGhhbmRsZXJEZWYpXG4gICAgfSk7XG4gICAgcmV0dXJuIG9iamVjdFtSZWZdO1xuICB9XG4gIHN0YXRpYyBjbGVhckJpbmRpbmdzKG9iamVjdCkge1xuICAgIHZhciBtYXBzID0gZnVuYyA9PiAoLi4ub3MpID0+IG9zLm1hcChmdW5jKTtcbiAgICB2YXIgY2xlYXJPYmogPSBvID0+IE9iamVjdC5rZXlzKG8pLm1hcChrID0+IGRlbGV0ZSBvW2tdKTtcbiAgICB2YXIgY2xlYXJPYmpzID0gbWFwcyhjbGVhck9iaik7XG4gICAgb2JqZWN0W0JpbmRpbmdBbGxdLmNsZWFyKCk7XG4gICAgY2xlYXJPYmpzKG9iamVjdFtXcmFwcGVkXSwgb2JqZWN0W0JpbmRpbmddLCBvYmplY3RbQWZ0ZXJdLCBvYmplY3RbQmVmb3JlXSk7XG4gIH1cbiAgc3RhdGljIHJlc29sdmUob2JqZWN0LCBwYXRoLCBvd25lciA9IGZhbHNlKSB7XG4gICAgdmFyIG5vZGU7XG4gICAgdmFyIHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICB2YXIgdG9wID0gcGF0aFBhcnRzWzBdO1xuICAgIHdoaWxlIChwYXRoUGFydHMubGVuZ3RoKSB7XG4gICAgICBpZiAob3duZXIgJiYgcGF0aFBhcnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICB2YXIgb2JqID0gdGhpcy5tYWtlKG9iamVjdCk7XG4gICAgICAgIHJldHVybiBbb2JqLCBwYXRoUGFydHMuc2hpZnQoKSwgdG9wXTtcbiAgICAgIH1cbiAgICAgIG5vZGUgPSBwYXRoUGFydHMuc2hpZnQoKTtcbiAgICAgIGlmICghKG5vZGUgaW4gb2JqZWN0KSB8fCAhb2JqZWN0W25vZGVdIHx8ICEodHlwZW9mIG9iamVjdFtub2RlXSA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgIG9iamVjdFtub2RlXSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICB9XG4gICAgICBvYmplY3QgPSB0aGlzLm1ha2Uob2JqZWN0W25vZGVdKTtcbiAgICB9XG4gICAgcmV0dXJuIFt0aGlzLm1ha2Uob2JqZWN0KSwgbm9kZSwgdG9wXTtcbiAgfVxuICBzdGF0aWMgd3JhcERlbGF5Q2FsbGJhY2soY2FsbGJhY2ssIGRlbGF5KSB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiBzZXRUaW1lb3V0KCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpLCBkZWxheSk7XG4gIH1cbiAgc3RhdGljIHdyYXBUaHJvdHRsZUNhbGxiYWNrKGNhbGxiYWNrLCB0aHJvdHRsZSkge1xuICAgIHRoaXMudGhyb3R0bGVzLnNldChjYWxsYmFjaywgZmFsc2UpO1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMudGhyb3R0bGVzLmdldChjYWxsYmFjaywgdHJ1ZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgICB0aGlzLnRocm90dGxlcy5zZXQoY2FsbGJhY2ssIHRydWUpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMudGhyb3R0bGVzLnNldChjYWxsYmFjaywgZmFsc2UpO1xuICAgICAgfSwgdGhyb3R0bGUpO1xuICAgIH07XG4gIH1cbiAgc3RhdGljIHdyYXBXYWl0Q2FsbGJhY2soY2FsbGJhY2ssIHdhaXQpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIHZhciB3YWl0ZXI7XG4gICAgICBpZiAod2FpdGVyID0gdGhpcy53YWl0ZXJzLmdldChjYWxsYmFjaykpIHtcbiAgICAgICAgdGhpcy53YWl0ZXJzLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgIGNsZWFyVGltZW91dCh3YWl0ZXIpO1xuICAgICAgfVxuICAgICAgd2FpdGVyID0gc2V0VGltZW91dCgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSwgd2FpdCk7XG4gICAgICB0aGlzLndhaXRlcnMuc2V0KGNhbGxiYWNrLCB3YWl0ZXIpO1xuICAgIH07XG4gIH1cbiAgc3RhdGljIHdyYXBGcmFtZUNhbGxiYWNrKGNhbGxiYWNrLCBmcmFtZXMpIHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjYWxsYmFjayguLi5hcmdzKSk7XG4gICAgfTtcbiAgfVxuICBzdGF0aWMgd3JhcElkbGVDYWxsYmFjayhjYWxsYmFjaykge1xuICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgLy8gQ29tcGF0aWJpbGl0eSBmb3IgU2FmYXJpIDA4LzIwMjBcbiAgICAgIHZhciByZXEgPSB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFjayB8fCByZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG4gICAgICByZXEoKCkgPT4gY2FsbGJhY2soLi4uYXJncykpO1xuICAgIH07XG4gIH1cbn1cbmV4cG9ydHMuQmluZGFibGUgPSBCaW5kYWJsZTtcbl9kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgXCJ3YWl0ZXJzXCIsIG5ldyBXZWFrTWFwKCkpO1xuX2RlZmluZVByb3BlcnR5KEJpbmRhYmxlLCBcInRocm90dGxlc1wiLCBuZXcgV2Vha01hcCgpKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ1ByZXZlbnQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBQcmV2ZW50XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ09uR2V0Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogT25HZXRcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnTm9HZXR0ZXJzJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogTm9HZXR0ZXJzXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCaW5kYWJsZSwgJ0dldFByb3RvJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogR2V0UHJvdG9cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJpbmRhYmxlLCAnT25BbGxHZXQnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBPbkFsbEdldFxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9DYWNoZS5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQ2FjaGUgPSB2b2lkIDA7XG5jbGFzcyBDYWNoZSB7XG4gIHN0YXRpYyBzdG9yZShrZXksIHZhbHVlLCBleHBpcnksIGJ1Y2tldCA9ICdzdGFuZGFyZCcpIHtcbiAgICB2YXIgZXhwaXJhdGlvbiA9IDA7XG4gICAgaWYgKGV4cGlyeSkge1xuICAgICAgZXhwaXJhdGlvbiA9IGV4cGlyeSAqIDEwMDAgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmJ1Y2tldHMpIHtcbiAgICAgIHRoaXMuYnVja2V0cyA9IG5ldyBNYXAoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmJ1Y2tldHMuaGFzKGJ1Y2tldCkpIHtcbiAgICAgIHRoaXMuYnVja2V0cy5zZXQoYnVja2V0LCBuZXcgTWFwKCkpO1xuICAgIH1cbiAgICB2YXIgZXZlbnRFbmQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Q2FjaGVTdG9yZScsIHtcbiAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAga2V5LFxuICAgICAgICB2YWx1ZSxcbiAgICAgICAgZXhwaXJ5LFxuICAgICAgICBidWNrZXRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudEVuZCkpIHtcbiAgICAgIHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5zZXQoa2V5LCB7XG4gICAgICAgIHZhbHVlLFxuICAgICAgICBleHBpcmF0aW9uXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIGxvYWQoa2V5LCBkZWZhdWx0dmFsdWUgPSBmYWxzZSwgYnVja2V0ID0gJ3N0YW5kYXJkJykge1xuICAgIHZhciBldmVudEVuZCA9IG5ldyBDdXN0b21FdmVudCgnY3ZDYWNoZUxvYWQnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIGtleSxcbiAgICAgICAgZGVmYXVsdHZhbHVlLFxuICAgICAgICBidWNrZXRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRFbmQpKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdHZhbHVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5idWNrZXRzICYmIHRoaXMuYnVja2V0cy5oYXMoYnVja2V0KSAmJiB0aGlzLmJ1Y2tldHMuZ2V0KGJ1Y2tldCkuaGFzKGtleSkpIHtcbiAgICAgIHZhciBlbnRyeSA9IHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5nZXQoa2V5KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuYnVja2V0W2J1Y2tldF1ba2V5XS5leHBpcmF0aW9uLCAobmV3IERhdGUpLmdldFRpbWUoKSk7XG4gICAgICBpZiAoZW50cnkuZXhwaXJhdGlvbiA9PT0gMCB8fCBlbnRyeS5leHBpcmF0aW9uID4gbmV3IERhdGUoKS5nZXRUaW1lKCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVja2V0cy5nZXQoYnVja2V0KS5nZXQoa2V5KS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlZmF1bHR2YWx1ZTtcbiAgfVxufVxuZXhwb3J0cy5DYWNoZSA9IENhY2hlO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvQ29uZmlnLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Db25maWcgPSB2b2lkIDA7XG52YXIgQXBwQ29uZmlnID0ge307XG52YXIgX3JlcXVpcmUgPSByZXF1aXJlO1xudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG50cnkge1xuICBBcHBDb25maWcgPSBfcmVxdWlyZSgnL0NvbmZpZycpLkNvbmZpZztcbn0gY2F0Y2ggKGVycm9yKSB7XG4gIHdpbi5kZXZNb2RlID09PSB0cnVlICYmIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICBBcHBDb25maWcgPSB7fTtcbn1cbmNsYXNzIENvbmZpZyB7XG4gIHN0YXRpYyBnZXQobmFtZSkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZ3NbbmFtZV07XG4gIH1cbiAgc3RhdGljIHNldChuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuY29uZmlnc1tuYW1lXSA9IHZhbHVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHN0YXRpYyBkdW1wKCkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZ3M7XG4gIH1cbiAgc3RhdGljIGluaXQoLi4uY29uZmlncykge1xuICAgIGZvciAodmFyIGkgaW4gY29uZmlncykge1xuICAgICAgdmFyIGNvbmZpZyA9IGNvbmZpZ3NbaV07XG4gICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uZmlnID0gSlNPTi5wYXJzZShjb25maWcpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgbmFtZSBpbiBjb25maWcpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gY29uZmlnW25hbWVdO1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWdzW25hbWVdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5leHBvcnRzLkNvbmZpZyA9IENvbmZpZztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShDb25maWcsICdjb25maWdzJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogQXBwQ29uZmlnXG59KTtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL0RvbS5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuRG9tID0gdm9pZCAwO1xudmFyIHRyYXZlcnNhbHMgPSAwO1xuY2xhc3MgRG9tIHtcbiAgc3RhdGljIG1hcFRhZ3MoZG9jLCBzZWxlY3RvciwgY2FsbGJhY2ssIHN0YXJ0Tm9kZSwgZW5kTm9kZSkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgc3RhcnRlZCA9IHRydWU7XG4gICAgaWYgKHN0YXJ0Tm9kZSkge1xuICAgICAgc3RhcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgZW5kZWQgPSBmYWxzZTtcbiAgICB2YXIge1xuICAgICAgTm9kZSxcbiAgICAgIEVsZW1lbnQsXG4gICAgICBOb2RlRmlsdGVyLFxuICAgICAgZG9jdW1lbnRcbiAgICB9ID0gZ2xvYmFsVGhpcy53aW5kb3c7XG4gICAgdmFyIHRyZWVXYWxrZXIgPSBkb2N1bWVudC5jcmVhdGVUcmVlV2Fsa2VyKGRvYywgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQgfCBOb2RlRmlsdGVyLlNIT1dfVEVYVCwge1xuICAgICAgYWNjZXB0Tm9kZTogKG5vZGUsIHdhbGtlcikgPT4ge1xuICAgICAgICBpZiAoIXN0YXJ0ZWQpIHtcbiAgICAgICAgICBpZiAobm9kZSA9PT0gc3RhcnROb2RlKSB7XG4gICAgICAgICAgICBzdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX1NLSVA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChlbmROb2RlICYmIG5vZGUgPT09IGVuZE5vZGUpIHtcbiAgICAgICAgICBlbmRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuZGVkKSB7XG4gICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX1NLSVA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgICAgICAgICBpZiAobm9kZS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfQUNDRVBUO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfU0tJUDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTm9kZUZpbHRlci5GSUxURVJfQUNDRVBUO1xuICAgICAgfVxuICAgIH0sIGZhbHNlKTtcbiAgICB2YXIgdHJhdmVyc2FsID0gdHJhdmVyc2FscysrO1xuICAgIHdoaWxlICh0cmVlV2Fsa2VyLm5leHROb2RlKCkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGNhbGxiYWNrKHRyZWVXYWxrZXIuY3VycmVudE5vZGUsIHRyZWVXYWxrZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBzdGF0aWMgZGlzcGF0Y2hFdmVudChkb2MsIGV2ZW50KSB7XG4gICAgZG9jLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIHRoaXMubWFwVGFncyhkb2MsIGZhbHNlLCBub2RlID0+IHtcbiAgICAgIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgfSk7XG4gIH1cbn1cbmV4cG9ydHMuRG9tID0gRG9tO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvTWl4aW4uanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLk1peGluID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIENvbnN0cnVjdG9yID0gU3ltYm9sKCdjb25zdHJ1Y3RvcicpO1xudmFyIE1peGluTGlzdCA9IFN5bWJvbCgnbWl4aW5MaXN0Jyk7XG5jbGFzcyBNaXhpbiB7XG4gIHN0YXRpYyBmcm9tKGJhc2VDbGFzcywgLi4ubWl4aW5zKSB7XG4gICAgdmFyIG5ld0NsYXNzID0gY2xhc3MgZXh0ZW5kcyBiYXNlQ2xhc3Mge1xuICAgICAgY29uc3RydWN0b3IoLi4uYXJncykge1xuICAgICAgICB2YXIgaW5zdGFuY2UgPSBiYXNlQ2xhc3MuY29uc3RydWN0b3IgPyBzdXBlciguLi5hcmdzKSA6IG51bGw7XG4gICAgICAgIGZvciAodmFyIG1peGluIG9mIG1peGlucykge1xuICAgICAgICAgIGlmIChtaXhpbltNaXhpbi5Db25zdHJ1Y3Rvcl0pIHtcbiAgICAgICAgICAgIG1peGluW01peGluLkNvbnN0cnVjdG9yXS5hcHBseSh0aGlzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3dpdGNoICh0eXBlb2YgbWl4aW4pIHtcbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgTWl4aW4ubWl4Q2xhc3MobWl4aW4sIG5ld0NsYXNzKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICBNaXhpbi5taXhPYmplY3QobWl4aW4sIHRoaXMpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIG5ld0NsYXNzO1xuICB9XG4gIHN0YXRpYyBtYWtlKC4uLmNsYXNzZXMpIHtcbiAgICB2YXIgYmFzZSA9IGNsYXNzZXMucG9wKCk7XG4gICAgcmV0dXJuIE1peGluLnRvKGJhc2UsIC4uLmNsYXNzZXMpO1xuICB9XG4gIHN0YXRpYyB0byhiYXNlLCAuLi5taXhpbnMpIHtcbiAgICB2YXIgZGVzY3JpcHRvcnMgPSB7fTtcbiAgICBtaXhpbnMubWFwKG1peGluID0+IHtcbiAgICAgIHN3aXRjaCAodHlwZW9mIG1peGluKSB7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihkZXNjcmlwdG9ycywgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMobWl4aW4pKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oZGVzY3JpcHRvcnMsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG1peGluLnByb3RvdHlwZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVsZXRlIGRlc2NyaXB0b3JzLmNvbnN0cnVjdG9yO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoYmFzZS5wcm90b3R5cGUsIGRlc2NyaXB0b3JzKTtcbiAgICB9KTtcbiAgfVxuICBzdGF0aWMgd2l0aCguLi5taXhpbnMpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tKGNsYXNzIHtcbiAgICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICB9LCAuLi5taXhpbnMpO1xuICB9XG4gIHN0YXRpYyBtaXhPYmplY3QobWl4aW4sIGluc3RhbmNlKSB7XG4gICAgZm9yICh2YXIgZnVuYyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhtaXhpbikpIHtcbiAgICAgIGlmICh0eXBlb2YgbWl4aW5bZnVuY10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaW5zdGFuY2VbZnVuY10gPSBtaXhpbltmdW5jXS5iaW5kKGluc3RhbmNlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnN0YW5jZVtmdW5jXSA9IG1peGluW2Z1bmNdO1xuICAgIH1cbiAgICBmb3IgKHZhciBfZnVuYyBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG1peGluKSkge1xuICAgICAgaWYgKHR5cGVvZiBtaXhpbltfZnVuY10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaW5zdGFuY2VbX2Z1bmNdID0gbWl4aW5bX2Z1bmNdLmJpbmQoaW5zdGFuY2UpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGluc3RhbmNlW19mdW5jXSA9IG1peGluW19mdW5jXTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIG1peENsYXNzKGNscywgbmV3Q2xhc3MpIHtcbiAgICBmb3IgKHZhciBmdW5jIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNscy5wcm90b3R5cGUpKSB7XG4gICAgICBpZiAoWyduYW1lJywgJ3Byb3RvdHlwZScsICdsZW5ndGgnXS5pbmNsdWRlcyhmdW5jKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihuZXdDbGFzcywgZnVuYyk7XG4gICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgY2xzW2Z1bmNdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtmdW5jXSA9IGNscy5wcm90b3R5cGVbZnVuY107XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbmV3Q2xhc3MucHJvdG90eXBlW2Z1bmNdID0gY2xzLnByb3RvdHlwZVtmdW5jXS5iaW5kKG5ld0NsYXNzLnByb3RvdHlwZSk7XG4gICAgfVxuICAgIGZvciAodmFyIF9mdW5jMiBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGNscy5wcm90b3R5cGUpKSB7XG4gICAgICBpZiAodHlwZW9mIGNsc1tfZnVuYzJdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtfZnVuYzJdID0gY2xzLnByb3RvdHlwZVtfZnVuYzJdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtfZnVuYzJdID0gY2xzLnByb3RvdHlwZVtfZnVuYzJdLmJpbmQobmV3Q2xhc3MucHJvdG90eXBlKTtcbiAgICB9XG4gICAgdmFyIF9sb29wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoWyduYW1lJywgJ3Byb3RvdHlwZScsICdsZW5ndGgnXS5pbmNsdWRlcyhfZnVuYzMpKSB7XG4gICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5ld0NsYXNzLCBfZnVuYzMpO1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci53cml0YWJsZSkge1xuICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgY2xzW19mdW5jM10gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBuZXdDbGFzc1tfZnVuYzNdID0gY2xzW19mdW5jM107XG4gICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByZXYgPSBuZXdDbGFzc1tfZnVuYzNdIHx8IGZhbHNlO1xuICAgICAgICB2YXIgbWV0aCA9IGNsc1tfZnVuYzNdLmJpbmQobmV3Q2xhc3MpO1xuICAgICAgICBuZXdDbGFzc1tfZnVuYzNdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICBwcmV2ICYmIHByZXYoLi4uYXJncyk7XG4gICAgICAgICAgcmV0dXJuIG1ldGgoLi4uYXJncyk7XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgX3JldDtcbiAgICBmb3IgKHZhciBfZnVuYzMgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2xzKSkge1xuICAgICAgX3JldCA9IF9sb29wKCk7XG4gICAgICBpZiAoX3JldCA9PT0gMCkgY29udGludWU7XG4gICAgfVxuICAgIHZhciBfbG9vcDIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodHlwZW9mIGNsc1tfZnVuYzRdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG5ld0NsYXNzLnByb3RvdHlwZVtfZnVuYzRdID0gY2xzW19mdW5jNF07XG4gICAgICAgIHJldHVybiAxOyAvLyBjb250aW51ZVxuICAgICAgfVxuICAgICAgdmFyIHByZXYgPSBuZXdDbGFzc1tfZnVuYzRdIHx8IGZhbHNlO1xuICAgICAgdmFyIG1ldGggPSBjbHNbX2Z1bmM0XS5iaW5kKG5ld0NsYXNzKTtcbiAgICAgIG5ld0NsYXNzW19mdW5jNF0gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICBwcmV2ICYmIHByZXYoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtZXRoKC4uLmFyZ3MpO1xuICAgICAgfTtcbiAgICB9O1xuICAgIGZvciAodmFyIF9mdW5jNCBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGNscykpIHtcbiAgICAgIGlmIChfbG9vcDIoKSkgY29udGludWU7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBtaXgobWl4aW5Ubykge1xuICAgIHZhciBjb25zdHJ1Y3RvcnMgPSBbXTtcbiAgICB2YXIgYWxsU3RhdGljID0ge307XG4gICAgdmFyIGFsbEluc3RhbmNlID0ge307XG4gICAgdmFyIG1peGFibGUgPSBfQmluZGFibGUuQmluZGFibGUubWFrZUJpbmRhYmxlKG1peGluVG8pO1xuICAgIHZhciBfbG9vcDMgPSBmdW5jdGlvbiAoYmFzZSkge1xuICAgICAgdmFyIGluc3RhbmNlTmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiYXNlLnByb3RvdHlwZSk7XG4gICAgICB2YXIgc3RhdGljTmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiYXNlKTtcbiAgICAgIHZhciBwcmVmaXggPSAvXihiZWZvcmV8YWZ0ZXIpX18oLispLztcbiAgICAgIHZhciBfbG9vcDUgPSBmdW5jdGlvbiAoX21ldGhvZE5hbWUyKSB7XG4gICAgICAgICAgdmFyIG1hdGNoID0gX21ldGhvZE5hbWUyLm1hdGNoKHByZWZpeCk7XG4gICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2JlZm9yZSc6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19iZWZvcmUoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZVtfbWV0aG9kTmFtZTJdLmJpbmQobyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kKC4uLmEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdhZnRlcic6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19hZnRlcigodCwgZSwgcywgbywgYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGUgIT09IG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBiYXNlW19tZXRob2ROYW1lMl0uYmluZChvKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QoLi4uYSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFsbFN0YXRpY1tfbWV0aG9kTmFtZTJdKSB7XG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBiYXNlW19tZXRob2ROYW1lMl0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBhbGxTdGF0aWNbX21ldGhvZE5hbWUyXSA9IGJhc2VbX21ldGhvZE5hbWUyXTtcbiAgICAgICAgfSxcbiAgICAgICAgX3JldDI7XG4gICAgICBmb3IgKHZhciBfbWV0aG9kTmFtZTIgb2Ygc3RhdGljTmFtZXMpIHtcbiAgICAgICAgX3JldDIgPSBfbG9vcDUoX21ldGhvZE5hbWUyKTtcbiAgICAgICAgaWYgKF9yZXQyID09PSAwKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBfbG9vcDYgPSBmdW5jdGlvbiAoX21ldGhvZE5hbWUzKSB7XG4gICAgICAgICAgdmFyIG1hdGNoID0gX21ldGhvZE5hbWUzLm1hdGNoKHByZWZpeCk7XG4gICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2JlZm9yZSc6XG4gICAgICAgICAgICAgICAgbWl4YWJsZS5fX19iZWZvcmUoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnYWZ0ZXInOlxuICAgICAgICAgICAgICAgIG1peGFibGUuX19fYWZ0ZXIoKHQsIGUsIHMsIG8sIGEpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlICE9PSBtYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXS5iaW5kKG8pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCguLi5hKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYWxsSW5zdGFuY2VbX21ldGhvZE5hbWUzXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgYmFzZS5wcm90b3R5cGVbX21ldGhvZE5hbWUzXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIGFsbEluc3RhbmNlW19tZXRob2ROYW1lM10gPSBiYXNlLnByb3RvdHlwZVtfbWV0aG9kTmFtZTNdO1xuICAgICAgICB9LFxuICAgICAgICBfcmV0MztcbiAgICAgIGZvciAodmFyIF9tZXRob2ROYW1lMyBvZiBpbnN0YW5jZU5hbWVzKSB7XG4gICAgICAgIF9yZXQzID0gX2xvb3A2KF9tZXRob2ROYW1lMyk7XG4gICAgICAgIGlmIChfcmV0MyA9PT0gMCkgY29udGludWU7XG4gICAgICB9XG4gICAgfTtcbiAgICBmb3IgKHZhciBiYXNlID0gdGhpczsgYmFzZSAmJiBiYXNlLnByb3RvdHlwZTsgYmFzZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihiYXNlKSkge1xuICAgICAgX2xvb3AzKGJhc2UpO1xuICAgIH1cbiAgICBmb3IgKHZhciBtZXRob2ROYW1lIGluIGFsbFN0YXRpYykge1xuICAgICAgbWl4aW5Ub1ttZXRob2ROYW1lXSA9IGFsbFN0YXRpY1ttZXRob2ROYW1lXS5iaW5kKG1peGluVG8pO1xuICAgIH1cbiAgICB2YXIgX2xvb3A0ID0gZnVuY3Rpb24gKF9tZXRob2ROYW1lKSB7XG4gICAgICBtaXhpblRvLnByb3RvdHlwZVtfbWV0aG9kTmFtZV0gPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICByZXR1cm4gYWxsSW5zdGFuY2VbX21ldGhvZE5hbWVdLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfTtcbiAgICB9O1xuICAgIGZvciAodmFyIF9tZXRob2ROYW1lIGluIGFsbEluc3RhbmNlKSB7XG4gICAgICBfbG9vcDQoX21ldGhvZE5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gbWl4YWJsZTtcbiAgfVxufVxuZXhwb3J0cy5NaXhpbiA9IE1peGluO1xuTWl4aW4uQ29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1JvdXRlci5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUm91dGVyID0gdm9pZCAwO1xudmFyIF9WaWV3ID0gcmVxdWlyZShcIi4vVmlld1wiKTtcbnZhciBfQ2FjaGUgPSByZXF1aXJlKFwiLi9DYWNoZVwiKTtcbnZhciBfQ29uZmlnID0gcmVxdWlyZShcIi4vQ29uZmlnXCIpO1xudmFyIF9Sb3V0ZXMgPSByZXF1aXJlKFwiLi9Sb3V0ZXNcIik7XG52YXIgX3dpbiRDdXN0b21FdmVudDtcbnZhciBOb3RGb3VuZEVycm9yID0gU3ltYm9sKCdOb3RGb3VuZCcpO1xudmFyIEludGVybmFsRXJyb3IgPSBTeW1ib2woJ0ludGVybmFsJyk7XG52YXIgd2luID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IHZvaWQgMDtcbndpbi5DdXN0b21FdmVudCA9IChfd2luJEN1c3RvbUV2ZW50ID0gd2luLkN1c3RvbUV2ZW50KSAhPT0gbnVsbCAmJiBfd2luJEN1c3RvbUV2ZW50ICE9PSB2b2lkIDAgPyBfd2luJEN1c3RvbUV2ZW50IDogd2luLkV2ZW50O1xuY2xhc3MgUm91dGVyIHtcbiAgc3RhdGljIHdhaXQodmlldywgZXZlbnQgPSAnRE9NQ29udGVudExvYWRlZCcsIG5vZGUgPSBkb2N1bWVudCkge1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgKCkgPT4ge1xuICAgICAgdGhpcy5saXN0ZW4odmlldyk7XG4gICAgfSk7XG4gIH1cbiAgc3RhdGljIGxpc3RlbihsaXN0ZW5lciwgcm91dGVzID0gZmFsc2UpIHtcbiAgICB0aGlzLmxpc3RlbmVyID0gbGlzdGVuZXIgfHwgdGhpcy5saXN0ZW5lcjtcbiAgICB0aGlzLnJvdXRlcyA9IHJvdXRlcyB8fCBsaXN0ZW5lci5yb3V0ZXM7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLnF1ZXJ5LCB0aGlzLnF1ZXJ5T3Zlcih7fSkpO1xuICAgIHZhciBsaXN0ZW4gPSBldmVudCA9PiB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGV2ZW50LnN0YXRlICYmICdyb3V0ZWRJZCcgaW4gZXZlbnQuc3RhdGUpIHtcbiAgICAgICAgaWYgKGV2ZW50LnN0YXRlLnJvdXRlZElkIDw9IHRoaXMucm91dGVDb3VudCkge1xuICAgICAgICAgIHRoaXMuaGlzdG9yeS5zcGxpY2UoZXZlbnQuc3RhdGUucm91dGVkSWQpO1xuICAgICAgICAgIHRoaXMucm91dGVDb3VudCA9IGV2ZW50LnN0YXRlLnJvdXRlZElkO1xuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LnN0YXRlLnJvdXRlZElkID4gdGhpcy5yb3V0ZUNvdW50KSB7XG4gICAgICAgICAgdGhpcy5oaXN0b3J5LnB1c2goZXZlbnQuc3RhdGUucHJldik7XG4gICAgICAgICAgdGhpcy5yb3V0ZUNvdW50ID0gZXZlbnQuc3RhdGUucm91dGVkSWQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGV2ZW50LnN0YXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMucHJldlBhdGggIT09IG51bGwgJiYgdGhpcy5wcmV2UGF0aCAhPT0gbG9jYXRpb24ucGF0aG5hbWUpIHtcbiAgICAgICAgICB0aGlzLmhpc3RvcnkucHVzaCh0aGlzLnByZXZQYXRoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikpIHtcbiAgICAgICAgdGhpcy5tYXRjaChsb2NhdGlvbi5wYXRobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5tYXRjaCh0aGlzLm5leHRQYXRoLCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY3ZVcmxDaGFuZ2VkJywgbGlzdGVuKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBsaXN0ZW4pO1xuICAgIHZhciByb3V0ZSA9ICF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikgPyBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaCA6IGZhbHNlO1xuICAgIGlmICghdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pICYmIGxvY2F0aW9uLmhhc2gpIHtcbiAgICAgIHJvdXRlICs9IGxvY2F0aW9uLmhhc2g7XG4gICAgfVxuICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgIHJvdXRlZElkOiB0aGlzLnJvdXRlQ291bnQsXG4gICAgICB1cmw6IGxvY2F0aW9uLnBhdGhuYW1lLFxuICAgICAgcHJldjogdGhpcy5wcmV2UGF0aFxuICAgIH07XG4gICAgaWYgKCF0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikpIHtcbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlLCBudWxsLCBsb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgfVxuICAgIHRoaXMuZ28ocm91dGUgIT09IGZhbHNlID8gcm91dGUgOiAnLycpO1xuICB9XG4gIHN0YXRpYyBnbyhwYXRoLCBzaWxlbnQgPSBmYWxzZSkge1xuICAgIHZhciBjb25maWdUaXRsZSA9IF9Db25maWcuQ29uZmlnLmdldCgndGl0bGUnKTtcbiAgICBpZiAoY29uZmlnVGl0bGUpIHtcbiAgICAgIGRvY3VtZW50LnRpdGxlID0gY29uZmlnVGl0bGU7XG4gICAgfVxuICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgIHJvdXRlZElkOiB0aGlzLnJvdXRlQ291bnQsXG4gICAgICBwcmV2OiB0aGlzLnByZXZQYXRoLFxuICAgICAgdXJsOiBsb2NhdGlvbi5wYXRobmFtZVxuICAgIH07XG4gICAgaWYgKHNpbGVudCA9PT0gLTEpIHtcbiAgICAgIHRoaXMubWF0Y2gocGF0aCwgdGhpcy5saXN0ZW5lciwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzT3JpZ2luTGltaXRlZChsb2NhdGlvbikpIHtcbiAgICAgIHRoaXMubmV4dFBhdGggPSBwYXRoO1xuICAgIH0gZWxzZSBpZiAoc2lsZW50ID09PSAyICYmIGxvY2F0aW9uLnBhdGhuYW1lICE9PSBwYXRoKSB7XG4gICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShzdGF0ZSwgbnVsbCwgcGF0aCk7XG4gICAgfSBlbHNlIGlmIChsb2NhdGlvbi5wYXRobmFtZSAhPT0gcGF0aCkge1xuICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoc3RhdGUsIG51bGwsIHBhdGgpO1xuICAgIH1cbiAgICBpZiAoIXNpbGVudCB8fCBzaWxlbnQgPCAwKSB7XG4gICAgICBpZiAoc2lsZW50ID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLnBhdGggPSBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgaWYgKHBhdGguc3Vic3RyaW5nKDAsIDEpID09PSAnIycpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgSGFzaENoYW5nZUV2ZW50KCdoYXNoY2hhbmdlJykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZVcmxDaGFuZ2VkJykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucHJldlBhdGggPSBwYXRoO1xuICB9XG4gIHN0YXRpYyBwcm9jZXNzUm91dGUocm91dGVzLCBzZWxlY3RlZCwgYXJncykge1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAodHlwZW9mIHJvdXRlc1tzZWxlY3RlZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChyb3V0ZXNbc2VsZWN0ZWRdLnByb3RvdHlwZSBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IHJvdXRlc1tzZWxlY3RlZF0oYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSByb3V0ZXNbc2VsZWN0ZWRdKGFyZ3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSByb3V0ZXNbc2VsZWN0ZWRdO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHN0YXRpYyBoYW5kbGVFcnJvcihlcnJvciwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgbGlzdGVuZXIsIHBhdGgsIHByZXYsIGZvcmNlUmVmcmVzaCkge1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZUVycm9yJywge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBlcnJvcixcbiAgICAgICAgICBwYXRoLFxuICAgICAgICAgIHByZXYsXG4gICAgICAgICAgdmlldzogbGlzdGVuZXIsXG4gICAgICAgICAgcm91dGVzLFxuICAgICAgICAgIHNlbGVjdGVkXG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHdpblsnZGV2TW9kZSddID8gJ1VuZXhwZWN0ZWQgZXJyb3I6ICcgKyBTdHJpbmcoZXJyb3IpIDogJ1VuZXhwZWN0ZWQgZXJyb3IuJztcbiAgICBpZiAocm91dGVzW0ludGVybmFsRXJyb3JdKSB7XG4gICAgICBhcmdzW0ludGVybmFsRXJyb3JdID0gZXJyb3I7XG4gICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NSb3V0ZShyb3V0ZXMsIEludGVybmFsRXJyb3IsIGFyZ3MpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpO1xuICB9XG4gIHN0YXRpYyBtYXRjaChwYXRoLCBsaXN0ZW5lciwgb3B0aW9ucyA9IGZhbHNlKSB7XG4gICAgdmFyIGV2ZW50ID0gbnVsbCxcbiAgICAgIHJlcXVlc3QgPSBudWxsLFxuICAgICAgZm9yY2VSZWZyZXNoID0gZmFsc2U7XG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIGZvcmNlUmVmcmVzaCA9IG9wdGlvbnM7XG4gICAgfVxuICAgIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yY2VSZWZyZXNoID0gb3B0aW9ucy5mb3JjZVJlZnJlc2g7XG4gICAgICBldmVudCA9IG9wdGlvbnMuZXZlbnQ7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHRoaXMucGF0aCA9PT0gcGF0aCAmJiAhZm9yY2VSZWZyZXNoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBvcmlnaW4gPSAnaHR0cDovL2V4YW1wbGUuY29tJztcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgb3JpZ2luID0gdGhpcy5pc09yaWdpbkxpbWl0ZWQobG9jYXRpb24pID8gb3JpZ2luIDogbG9jYXRpb24ub3JpZ2luO1xuICAgICAgdGhpcy5xdWVyeVN0cmluZyA9IGxvY2F0aW9uLnNlYXJjaDtcbiAgICB9XG4gICAgdmFyIHVybCA9IG5ldyBVUkwocGF0aCwgb3JpZ2luKTtcbiAgICBwYXRoID0gdGhpcy5wYXRoID0gdXJsLnBhdGhuYW1lO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnF1ZXJ5U3RyaW5nID0gdXJsLnNlYXJjaDtcbiAgICB9XG4gICAgdmFyIHByZXYgPSB0aGlzLnByZXZQYXRoO1xuICAgIHZhciBjdXJyZW50ID0gbGlzdGVuZXIgJiYgbGlzdGVuZXIuYXJncyA/IGxpc3RlbmVyLmFyZ3MuY29udGVudCA6IG51bGw7XG4gICAgdmFyIHJvdXRlcyA9IHRoaXMucm91dGVzIHx8IGxpc3RlbmVyICYmIGxpc3RlbmVyLnJvdXRlcyB8fCBfUm91dGVzLlJvdXRlcy5kdW1wKCk7XG4gICAgdmFyIHF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh0aGlzLnF1ZXJ5U3RyaW5nKTtcbiAgICBpZiAoZXZlbnQgJiYgZXZlbnQucmVxdWVzdCkge1xuICAgICAgdGhpcy5yZXF1ZXN0ID0gZXZlbnQucmVxdWVzdDtcbiAgICB9XG4gICAgZm9yICh2YXIga2V5IGluIE9iamVjdC5rZXlzKHRoaXMucXVlcnkpKSB7XG4gICAgICBkZWxldGUgdGhpcy5xdWVyeVtrZXldO1xuICAgIH1cbiAgICBmb3IgKHZhciBbX2tleSwgdmFsdWVdIG9mIHF1ZXJ5KSB7XG4gICAgICB0aGlzLnF1ZXJ5W19rZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHZhciBhcmdzID0ge30sXG4gICAgICBzZWxlY3RlZCA9IGZhbHNlLFxuICAgICAgcmVzdWx0ID0gJyc7XG4gICAgaWYgKHBhdGguc3Vic3RyaW5nKDAsIDEpID09PSAnLycpIHtcbiAgICAgIHBhdGggPSBwYXRoLnN1YnN0cmluZygxKTtcbiAgICB9XG4gICAgcGF0aCA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucXVlcnkpIHtcbiAgICAgIGFyZ3NbaV0gPSB0aGlzLnF1ZXJ5W2ldO1xuICAgIH1cbiAgICBMMTogZm9yICh2YXIgX2kgaW4gcm91dGVzKSB7XG4gICAgICB2YXIgcm91dGUgPSBfaS5zcGxpdCgnLycpO1xuICAgICAgaWYgKHJvdXRlLmxlbmd0aCA8IHBhdGgubGVuZ3RoICYmIHJvdXRlW3JvdXRlLmxlbmd0aCAtIDFdICE9PSAnKicpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBMMjogZm9yICh2YXIgaiBpbiByb3V0ZSkge1xuICAgICAgICBpZiAocm91dGVbal0uc3Vic3RyKDAsIDEpID09ICclJykge1xuICAgICAgICAgIHZhciBhcmdOYW1lID0gbnVsbDtcbiAgICAgICAgICB2YXIgZ3JvdXBzID0gL14lKFxcdyspXFw/Py8uZXhlYyhyb3V0ZVtqXSk7XG4gICAgICAgICAgaWYgKGdyb3VwcyAmJiBncm91cHNbMV0pIHtcbiAgICAgICAgICAgIGFyZ05hbWUgPSBncm91cHNbMV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYXJnTmFtZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3JvdXRlW2pdfSBpcyBub3QgYSB2YWxpZCBhcmd1bWVudCBzZWdtZW50IGluIHJvdXRlIFwiJHtfaX1cImApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXBhdGhbal0pIHtcbiAgICAgICAgICAgIGlmIChyb3V0ZVtqXS5zdWJzdHIocm91dGVbal0ubGVuZ3RoIC0gMSwgMSkgPT0gJz8nKSB7XG4gICAgICAgICAgICAgIGFyZ3NbYXJnTmFtZV0gPSAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlIEwxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcmdzW2FyZ05hbWVdID0gcGF0aFtqXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocm91dGVbal0gIT09ICcqJyAmJiBwYXRoW2pdICE9PSByb3V0ZVtqXSkge1xuICAgICAgICAgIGNvbnRpbnVlIEwxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzZWxlY3RlZCA9IF9pO1xuICAgICAgcmVzdWx0ID0gcm91dGVzW19pXTtcbiAgICAgIGlmIChyb3V0ZVtyb3V0ZS5sZW5ndGggLSAxXSA9PT0gJyonKSB7XG4gICAgICAgIGFyZ3MucGF0aHBhcnRzID0gcGF0aC5zbGljZShyb3V0ZS5sZW5ndGggLSAxKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB2YXIgZXZlbnRTdGFydCA9IG5ldyBDdXN0b21FdmVudCgnY3ZSb3V0ZVN0YXJ0Jywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGRldGFpbDoge1xuICAgICAgICBwYXRoLFxuICAgICAgICBwcmV2LFxuICAgICAgICByb290OiBsaXN0ZW5lcixcbiAgICAgICAgc2VsZWN0ZWQsXG4gICAgICAgIHJvdXRlc1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZiAoIWRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnRTdGFydCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWZvcmNlUmVmcmVzaCAmJiBsaXN0ZW5lciAmJiBjdXJyZW50ICYmIHR5cGVvZiByZXN1bHQgPT09ICdvYmplY3QnICYmIGN1cnJlbnQuY29uc3RydWN0b3IgPT09IHJlc3VsdC5jb25zdHJ1Y3RvciAmJiAhKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpICYmIGN1cnJlbnQudXBkYXRlKGFyZ3MpKSB7XG4gICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQgPSBjdXJyZW50O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICghKHNlbGVjdGVkIGluIHJvdXRlcykpIHtcbiAgICAgIHJvdXRlc1tzZWxlY3RlZF0gPSByb3V0ZXNbTm90Rm91bmRFcnJvcl07XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnByb2Nlc3NSb3V0ZShyb3V0ZXMsIHNlbGVjdGVkLCBhcmdzKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHRoaXMucHJvY2Vzc1JvdXRlKHJvdXRlcywgTm90Rm91bmRFcnJvciwgYXJncyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAoIShyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgaWYgKCEocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKGxpc3RlbmVyLCBwYXRoLCByZXN1bHQsIHJvdXRlcywgc2VsZWN0ZWQsIGFyZ3MsIGZvcmNlUmVmcmVzaCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0LnRoZW4ocmVhbFJlc3VsdCA9PiB0aGlzLnVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVhbFJlc3VsdCwgcm91dGVzLCBzZWxlY3RlZCwgYXJncywgZm9yY2VSZWZyZXNoKSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZUVycm9yKGVycm9yLCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBsaXN0ZW5lciwgcGF0aCwgcHJldiwgZm9yY2VSZWZyZXNoKTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmhhbmRsZUVycm9yKGVycm9yLCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBsaXN0ZW5lciwgcGF0aCwgcHJldiwgZm9yY2VSZWZyZXNoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIHVwZGF0ZShsaXN0ZW5lciwgcGF0aCwgcmVzdWx0LCByb3V0ZXMsIHNlbGVjdGVkLCBhcmdzLCBmb3JjZVJlZnJlc2gpIHtcbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBwcmV2ID0gdGhpcy5wcmV2UGF0aDtcbiAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGUnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHJlc3VsdCxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcHJldixcbiAgICAgICAgdmlldzogbGlzdGVuZXIsXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgc2VsZWN0ZWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAocmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgaWYgKGxpc3RlbmVyLmFyZ3MuY29udGVudCBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50LnBhdXNlKHRydWUpO1xuICAgICAgICBsaXN0ZW5lci5hcmdzLmNvbnRlbnQucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICBpZiAoZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCkpIHtcbiAgICAgICAgbGlzdGVuZXIuYXJncy5jb250ZW50ID0gcmVzdWx0O1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgcmVzdWx0LnBhdXNlKGZhbHNlKTtcbiAgICAgICAgcmVzdWx0LnVwZGF0ZShhcmdzLCBmb3JjZVJlZnJlc2gpO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZXZlbnRFbmQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2N2Um91dGVFbmQnLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHJlc3VsdCxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgcHJldixcbiAgICAgICAgdmlldzogbGlzdGVuZXIsXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgc2VsZWN0ZWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50RW5kKTtcbiAgfVxuICBzdGF0aWMgaXNPcmlnaW5MaW1pdGVkKHtcbiAgICBvcmlnaW5cbiAgfSkge1xuICAgIHJldHVybiBvcmlnaW4gPT09ICdudWxsJyB8fCBvcmlnaW4gPT09ICdmaWxlOi8vJztcbiAgfVxuICBzdGF0aWMgcXVlcnlPdmVyKGFyZ3MgPSB7fSkge1xuICAgIHZhciBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgdmFyIGZpbmFsQXJncyA9IHt9O1xuICAgIHZhciBxdWVyeSA9IHt9O1xuICAgIGZvciAodmFyIHBhaXIgb2YgcGFyYW1zKSB7XG4gICAgICBxdWVyeVtwYWlyWzBdXSA9IHBhaXJbMV07XG4gICAgfVxuICAgIGZpbmFsQXJncyA9IE9iamVjdC5hc3NpZ24oZmluYWxBcmdzLCBxdWVyeSwgYXJncyk7XG4gICAgZGVsZXRlIGZpbmFsQXJnc1snYXBpJ107XG4gICAgcmV0dXJuIGZpbmFsQXJncztcblxuICAgIC8vIGZvcihsZXQgaSBpbiBxdWVyeSlcbiAgICAvLyB7XG4gICAgLy8gXHRmaW5hbEFyZ3NbaV0gPSBxdWVyeVtpXTtcbiAgICAvLyB9XG5cbiAgICAvLyBmb3IobGV0IGkgaW4gYXJncylcbiAgICAvLyB7XG4gICAgLy8gXHRmaW5hbEFyZ3NbaV0gPSBhcmdzW2ldO1xuICAgIC8vIH1cbiAgfVxuICBzdGF0aWMgcXVlcnlUb1N0cmluZyhhcmdzID0ge30sIGZyZXNoID0gZmFsc2UpIHtcbiAgICB2YXIgcGFydHMgPSBbXSxcbiAgICAgIGZpbmFsQXJncyA9IGFyZ3M7XG4gICAgaWYgKCFmcmVzaCkge1xuICAgICAgZmluYWxBcmdzID0gdGhpcy5xdWVyeU92ZXIoYXJncyk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gZmluYWxBcmdzKSB7XG4gICAgICBpZiAoZmluYWxBcmdzW2ldID09PSAnJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHBhcnRzLnB1c2goaSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChmaW5hbEFyZ3NbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oJyYnKTtcbiAgfVxuICBzdGF0aWMgc2V0UXVlcnkobmFtZSwgdmFsdWUsIHNpbGVudCkge1xuICAgIHZhciBhcmdzID0gdGhpcy5xdWVyeU92ZXIoKTtcbiAgICBhcmdzW25hbWVdID0gdmFsdWU7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGRlbGV0ZSBhcmdzW25hbWVdO1xuICAgIH1cbiAgICB2YXIgcXVlcnlTdHJpbmcgPSB0aGlzLnF1ZXJ5VG9TdHJpbmcoYXJncywgdHJ1ZSk7XG4gICAgdGhpcy5nbyhsb2NhdGlvbi5wYXRobmFtZSArIChxdWVyeVN0cmluZyA/ICc/JyArIHF1ZXJ5U3RyaW5nIDogJz8nKSwgc2lsZW50KTtcbiAgfVxufVxuZXhwb3J0cy5Sb3V0ZXIgPSBSb3V0ZXI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncXVlcnknLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiB7fVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAnaGlzdG9yeScsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiBmYWxzZSxcbiAgdmFsdWU6IFtdXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdyb3V0ZUNvdW50Jywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IHRydWUsXG4gIHZhbHVlOiAwXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdwcmV2UGF0aCcsIHtcbiAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgZW51bWVyYWJsZTogZmFsc2UsXG4gIHdyaXRhYmxlOiB0cnVlLFxuICB2YWx1ZTogbnVsbFxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUm91dGVyLCAncXVlcnlTdHJpbmcnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogdHJ1ZSxcbiAgdmFsdWU6IG51bGxcbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlciwgJ0ludGVybmFsRXJyb3InLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBJbnRlcm5hbEVycm9yXG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXIsICdOb3RGb3VuZEVycm9yJywge1xuICBjb25maWd1cmFibGU6IGZhbHNlLFxuICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgd3JpdGFibGU6IGZhbHNlLFxuICB2YWx1ZTogTm90Rm91bmRFcnJvclxufSk7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9Sb3V0ZXMuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlJvdXRlcyA9IHZvaWQgMDtcbnZhciBBcHBSb3V0ZXMgPSB7fTtcbnZhciBfcmVxdWlyZSA9IHJlcXVpcmU7XG52YXIgaW1wb3J0ZWQgPSBmYWxzZTtcbnZhciBydW5JbXBvcnQgPSAoKSA9PiB7XG4gIGlmIChpbXBvcnRlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICA7XG4gIHRyeSB7XG4gICAgT2JqZWN0LmFzc2lnbihBcHBSb3V0ZXMsIF9yZXF1aXJlKCdSb3V0ZXMnKS5Sb3V0ZXMgfHwge30pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGdsb2JhbFRoaXMuZGV2TW9kZSA9PT0gdHJ1ZSAmJiBjb25zb2xlLndhcm4oZXJyb3IpO1xuICB9XG4gIGltcG9ydGVkID0gdHJ1ZTtcbn07XG5jbGFzcyBSb3V0ZXMge1xuICBzdGF0aWMgZ2V0KG5hbWUpIHtcbiAgICBydW5JbXBvcnQoKTtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXNbbmFtZV07XG4gIH1cbiAgc3RhdGljIGR1bXAoKSB7XG4gICAgcnVuSW1wb3J0KCk7XG4gICAgcmV0dXJuIHRoaXMucm91dGVzO1xuICB9XG59XG5leHBvcnRzLlJvdXRlcyA9IFJvdXRlcztcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb3V0ZXMsICdyb3V0ZXMnLCB7XG4gIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gIGVudW1lcmFibGU6IGZhbHNlLFxuICB3cml0YWJsZTogZmFsc2UsXG4gIHZhbHVlOiBBcHBSb3V0ZXNcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvUnVsZVNldC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuUnVsZVNldCA9IHZvaWQgMDtcbnZhciBfRG9tID0gcmVxdWlyZShcIi4vRG9tXCIpO1xudmFyIF9UYWcgPSByZXF1aXJlKFwiLi9UYWdcIik7XG52YXIgX1ZpZXcgPSByZXF1aXJlKFwiLi9WaWV3XCIpO1xuY2xhc3MgUnVsZVNldCB7XG4gIHN0YXRpYyBhZGQoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5nbG9iYWxSdWxlcyA9IHRoaXMuZ2xvYmFsUnVsZXMgfHwge307XG4gICAgdGhpcy5nbG9iYWxSdWxlc1tzZWxlY3Rvcl0gPSB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXSB8fCBbXTtcbiAgICB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXS5wdXNoKGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBzdGF0aWMgYXBwbHkoZG9jID0gZG9jdW1lbnQsIHZpZXcgPSBudWxsKSB7XG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gdGhpcy5nbG9iYWxSdWxlcykge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXSkge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLmdsb2JhbFJ1bGVzW3NlbGVjdG9yXVtpXTtcbiAgICAgICAgdmFyIHdyYXBwZWQgPSB0aGlzLndyYXAoZG9jLCBjYWxsYmFjaywgdmlldyk7XG4gICAgICAgIHZhciBub2RlcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZm9yICh2YXIgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgIHdyYXBwZWQobm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYWRkKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHRoaXMucnVsZXMgPSB0aGlzLnJ1bGVzIHx8IHt9O1xuICAgIHRoaXMucnVsZXNbc2VsZWN0b3JdID0gdGhpcy5ydWxlc1tzZWxlY3Rvcl0gfHwgW107XG4gICAgdGhpcy5ydWxlc1tzZWxlY3Rvcl0ucHVzaChjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgYXBwbHkoZG9jID0gZG9jdW1lbnQsIHZpZXcgPSBudWxsKSB7XG4gICAgUnVsZVNldC5hcHBseShkb2MsIHZpZXcpO1xuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIHRoaXMucnVsZXMpIHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5ydWxlc1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5ydWxlc1tzZWxlY3Rvcl1baV07XG4gICAgICAgIHZhciB3cmFwcGVkID0gUnVsZVNldC53cmFwKGRvYywgY2FsbGJhY2ssIHZpZXcpO1xuICAgICAgICB2YXIgbm9kZXMgPSBkb2MucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGZvciAodmFyIG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICB3cmFwcGVkKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHB1cmdlKCkge1xuICAgIGlmICghdGhpcy5ydWxlcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKHZhciBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5ydWxlcykpIHtcbiAgICAgIGlmICghdGhpcy5ydWxlc1trXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtrIGluIHRoaXMucnVsZXNba10pIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucnVsZXNba11ba2tdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBzdGF0aWMgd2FpdChldmVudCA9ICdET01Db250ZW50TG9hZGVkJywgbm9kZSA9IGRvY3VtZW50KSB7XG4gICAgdmFyIGxpc3RlbmVyID0gKChldmVudCwgbm9kZSkgPT4gKCkgPT4ge1xuICAgICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcy5hcHBseSgpO1xuICAgIH0pKGV2ZW50LCBub2RlKTtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcbiAgfVxuICBzdGF0aWMgd3JhcChkb2MsIG9yaWdpbmFsQ2FsbGJhY2ssIHZpZXcgPSBudWxsKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gb3JpZ2luYWxDYWxsYmFjaztcbiAgICBpZiAob3JpZ2luYWxDYWxsYmFjayBpbnN0YW5jZW9mIF9WaWV3LlZpZXcgfHwgb3JpZ2luYWxDYWxsYmFjayAmJiBvcmlnaW5hbENhbGxiYWNrLnByb3RvdHlwZSAmJiBvcmlnaW5hbENhbGxiYWNrLnByb3RvdHlwZSBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgIGNhbGxiYWNrID0gKCkgPT4gb3JpZ2luYWxDYWxsYmFjaztcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBlbGVtZW50Ll9fX2N2QXBwbGllZF9fXyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVsZW1lbnQsICdfX19jdkFwcGxpZWRfX18nLCB7XG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICAgIHZhbHVlOiBuZXcgV2Vha1NldCgpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGVsZW1lbnQuX19fY3ZBcHBsaWVkX19fLmhhcyhvcmlnaW5hbENhbGxiYWNrKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgZGlyZWN0LCBwYXJlbnRWaWV3O1xuICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgZGlyZWN0ID0gcGFyZW50VmlldyA9IHZpZXc7XG4gICAgICAgIGlmICh2aWV3LnZpZXdMaXN0KSB7XG4gICAgICAgICAgcGFyZW50VmlldyA9IHZpZXcudmlld0xpc3QucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgdGFnID0gbmV3IF9UYWcuVGFnKGVsZW1lbnQsIHBhcmVudFZpZXcsIG51bGwsIHVuZGVmaW5lZCwgZGlyZWN0KTtcbiAgICAgIHZhciBwYXJlbnQgPSB0YWcuZWxlbWVudC5wYXJlbnROb2RlO1xuICAgICAgdmFyIHNpYmxpbmcgPSB0YWcuZWxlbWVudC5uZXh0U2libGluZztcbiAgICAgIHZhciByZXN1bHQgPSBjYWxsYmFjayh0YWcpO1xuICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgZWxlbWVudC5fX19jdkFwcGxpZWRfX18uYWRkKG9yaWdpbmFsQ2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHJlc3VsdCA9IG5ldyBfVGFnLlRhZyhyZXN1bHQpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICAgIGlmICghcmVzdWx0LmVsZW1lbnQuY29udGFpbnModGFnLmVsZW1lbnQpKSB7XG4gICAgICAgICAgd2hpbGUgKHRhZy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5lbGVtZW50LmFwcGVuZENoaWxkKHRhZy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNpYmxpbmcpIHtcbiAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHJlc3VsdC5lbGVtZW50LCBzaWJsaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQocmVzdWx0LmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5wcm90b3R5cGUgJiYgcmVzdWx0LnByb3RvdHlwZSBpbnN0YW5jZW9mIF9WaWV3LlZpZXcpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IHJlc3VsdCh7fSwgdmlldyk7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgX1ZpZXcuVmlldykge1xuICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgIHZpZXcuY2xlYW51cC5wdXNoKCgpID0+IHJlc3VsdC5yZW1vdmUoKSk7XG4gICAgICAgICAgdmlldy5jbGVhbnVwLnB1c2godmlldy5hcmdzLmJpbmRUbygodiwgaywgdCkgPT4ge1xuICAgICAgICAgICAgdFtrXSA9IHY7XG4gICAgICAgICAgICByZXN1bHQuYXJnc1trXSA9IHY7XG4gICAgICAgICAgfSkpO1xuICAgICAgICAgIHZpZXcuY2xlYW51cC5wdXNoKHJlc3VsdC5hcmdzLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgICAgdFtrXSA9IHY7XG4gICAgICAgICAgICB2aWV3LmFyZ3Nba10gPSB2O1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICB0YWcuY2xlYXIoKTtcbiAgICAgICAgcmVzdWx0LnJlbmRlcih0YWcuZWxlbWVudCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuZXhwb3J0cy5SdWxlU2V0ID0gUnVsZVNldDtcbiAgfSkoKTtcbn0pOyIsIlxucmVxdWlyZS5yZWdpc3RlcihcImN1cnZhdHVyZS9iYXNlL1NldE1hcC5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuU2V0TWFwID0gdm9pZCAwO1xuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KGUsIHIsIHQpIHsgcmV0dXJuIChyID0gX3RvUHJvcGVydHlLZXkocikpIGluIGUgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgciwgeyB2YWx1ZTogdCwgZW51bWVyYWJsZTogITAsIGNvbmZpZ3VyYWJsZTogITAsIHdyaXRhYmxlOiAhMCB9KSA6IGVbcl0gPSB0LCBlOyB9XG5mdW5jdGlvbiBfdG9Qcm9wZXJ0eUtleSh0KSB7IHZhciBpID0gX3RvUHJpbWl0aXZlKHQsIFwic3RyaW5nXCIpOyByZXR1cm4gXCJzeW1ib2xcIiA9PSB0eXBlb2YgaSA/IGkgOiBpICsgXCJcIjsgfVxuZnVuY3Rpb24gX3RvUHJpbWl0aXZlKHQsIHIpIHsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIHQgfHwgIXQpIHJldHVybiB0OyB2YXIgZSA9IHRbU3ltYm9sLnRvUHJpbWl0aXZlXTsgaWYgKHZvaWQgMCAhPT0gZSkgeyB2YXIgaSA9IGUuY2FsbCh0LCByIHx8IFwiZGVmYXVsdFwiKTsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIGkpIHJldHVybiBpOyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQEB0b1ByaW1pdGl2ZSBtdXN0IHJldHVybiBhIHByaW1pdGl2ZSB2YWx1ZS5cIik7IH0gcmV0dXJuIChcInN0cmluZ1wiID09PSByID8gU3RyaW5nIDogTnVtYmVyKSh0KTsgfVxuY2xhc3MgU2V0TWFwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgX2RlZmluZVByb3BlcnR5KHRoaXMsIFwiX21hcFwiLCBuZXcgTWFwKCkpO1xuICB9XG4gIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmhhcyhrZXkpO1xuICB9XG4gIGdldChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmdldChrZXkpO1xuICB9XG4gIGdldE9uZShrZXkpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy5nZXQoa2V5KTtcbiAgICBmb3IgKHZhciBlbnRyeSBvZiBzZXQpIHtcbiAgICAgIHJldHVybiBlbnRyeTtcbiAgICB9XG4gIH1cbiAgYWRkKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy5fbWFwLmdldChrZXkpO1xuICAgIGlmICghc2V0KSB7XG4gICAgICB0aGlzLl9tYXAuc2V0KGtleSwgc2V0ID0gbmV3IFNldCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHNldC5hZGQodmFsdWUpO1xuICB9XG4gIHJlbW92ZShrZXksIHZhbHVlKSB7XG4gICAgdmFyIHNldCA9IHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgICBpZiAoIXNldCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVzID0gc2V0LmRlbGV0ZSh2YWx1ZSk7XG4gICAgaWYgKCFzZXQuc2l6ZSkge1xuICAgICAgdGhpcy5fbWFwLmRlbGV0ZShrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG4gIHZhbHVlcygpIHtcbiAgICByZXR1cm4gbmV3IFNldCguLi5bLi4udGhpcy5fbWFwLnZhbHVlcygpXS5tYXAoc2V0ID0+IFsuLi5zZXQudmFsdWVzKCldKSk7XG4gIH1cbn1cbmV4cG9ydHMuU2V0TWFwID0gU2V0TWFwO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVGFnLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5UYWcgPSB2b2lkIDA7XG52YXIgX0JpbmRhYmxlID0gcmVxdWlyZShcIi4vQmluZGFibGVcIik7XG52YXIgQ3VycmVudFN0eWxlID0gU3ltYm9sKCdDdXJyZW50U3R5bGUnKTtcbnZhciBDdXJyZW50QXR0cnMgPSBTeW1ib2woJ0N1cnJlbnRBdHRycycpO1xudmFyIHN0eWxlciA9IGZ1bmN0aW9uIChzdHlsZXMpIHtcbiAgaWYgKCF0aGlzLm5vZGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgZm9yICh2YXIgcHJvcGVydHkgaW4gc3R5bGVzKSB7XG4gICAgdmFyIHN0cmluZ2VkUHJvcGVydHkgPSBTdHJpbmcoc3R5bGVzW3Byb3BlcnR5XSk7XG4gICAgaWYgKHRoaXNbQ3VycmVudFN0eWxlXS5oYXMocHJvcGVydHkpICYmIHRoaXNbQ3VycmVudFN0eWxlXS5nZXQocHJvcGVydHkpID09PSBzdHlsZXNbcHJvcGVydHldIHx8IE51bWJlci5pc05hTihzdHlsZXNbcHJvcGVydHldKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChwcm9wZXJ0eVswXSA9PT0gJy0nKSB7XG4gICAgICB0aGlzLm5vZGUuc3R5bGUuc2V0UHJvcGVydHkocHJvcGVydHksIHN0cmluZ2VkUHJvcGVydHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm5vZGUuc3R5bGVbcHJvcGVydHldID0gc3RyaW5nZWRQcm9wZXJ0eTtcbiAgICB9XG4gICAgaWYgKHN0eWxlc1twcm9wZXJ0eV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLnNldChwcm9wZXJ0eSwgc3R5bGVzW3Byb3BlcnR5XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5kZWxldGUocHJvcGVydHkpO1xuICAgIH1cbiAgfVxufTtcbnZhciBnZXR0ZXIgPSBmdW5jdGlvbiAobmFtZSkge1xuICBpZiAodHlwZW9mIHRoaXNbbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpc1tuYW1lXTtcbiAgfVxuICBpZiAodGhpcy5ub2RlICYmIHR5cGVvZiB0aGlzLm5vZGVbbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpc1tuYW1lXSA9ICguLi5hcmdzKSA9PiB0aGlzLm5vZGVbbmFtZV0oLi4uYXJncyk7XG4gIH1cbiAgaWYgKG5hbWUgPT09ICdzdHlsZScpIHtcbiAgICByZXR1cm4gdGhpcy5wcm94eS5zdHlsZTtcbiAgfVxuICBpZiAodGhpcy5ub2RlICYmIG5hbWUgaW4gdGhpcy5ub2RlKSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZVtuYW1lXTtcbiAgfVxuICByZXR1cm4gdGhpc1tuYW1lXTtcbn07XG5jbGFzcyBUYWcge1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBwYXJlbnQsIHJlZiwgaW5kZXgsIGRpcmVjdCkge1xuICAgIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBzdWJkb2MgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChlbGVtZW50KTtcbiAgICAgIGVsZW1lbnQgPSBzdWJkb2MuZmlyc3RDaGlsZDtcbiAgICB9XG4gICAgdGhpcy5lbGVtZW50ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShlbGVtZW50KTtcbiAgICB0aGlzLm5vZGUgPSB0aGlzLmVsZW1lbnQ7XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5kaXJlY3QgPSBkaXJlY3Q7XG4gICAgdGhpcy5yZWYgPSByZWY7XG4gICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgIHRoaXMuY2xlYW51cCA9IFtdO1xuICAgIHRoaXNbX0JpbmRhYmxlLkJpbmRhYmxlLk9uQWxsR2V0XSA9IGdldHRlci5iaW5kKHRoaXMpO1xuICAgIHRoaXNbQ3VycmVudFN0eWxlXSA9IG5ldyBNYXAoKTtcbiAgICB0aGlzW0N1cnJlbnRBdHRyc10gPSBuZXcgTWFwKCk7XG4gICAgdmFyIGJvdW5kU3R5bGVyID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoc3R5bGVyLmJpbmQodGhpcykpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc3R5bGUnLCB7XG4gICAgICB2YWx1ZTogYm91bmRTdHlsZXJcbiAgICB9KTtcbiAgICB0aGlzLnByb3h5ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UodGhpcyk7XG4gICAgdGhpcy5wcm94eS5zdHlsZS5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgIGlmICh0aGlzW0N1cnJlbnRTdHlsZV0uaGFzKGspICYmIHRoaXNbQ3VycmVudFN0eWxlXS5nZXQoaykgPT09IHYpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5ub2RlLnN0eWxlW2tdID0gdjtcbiAgICAgIGlmICghZCAmJiB2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpc1tDdXJyZW50U3R5bGVdLnNldChrLCB2KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbQ3VycmVudFN0eWxlXS5kZWxldGUoayk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wcm94eS5iaW5kVG8oKHYsIGspID0+IHtcbiAgICAgIGlmIChrID09PSAnaW5kZXgnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChrIGluIGVsZW1lbnQgJiYgZWxlbWVudFtrXSAhPT0gdikge1xuICAgICAgICBlbGVtZW50W2tdID0gdjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5wcm94eTtcbiAgfVxuICBhdHRyKGF0dHJpYnV0ZXMpIHtcbiAgICBmb3IgKHZhciBhdHRyaWJ1dGUgaW4gYXR0cmlidXRlcykge1xuICAgICAgaWYgKHRoaXNbQ3VycmVudEF0dHJzXS5oYXMoYXR0cmlidXRlKSAmJiBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLm5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gICAgICAgIHRoaXNbQ3VycmVudEF0dHJzXS5kZWxldGUoYXR0cmlidXRlKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXNbQ3VycmVudEF0dHJzXS5oYXMoYXR0cmlidXRlKSB8fCB0aGlzW0N1cnJlbnRBdHRyc10uZ2V0KGF0dHJpYnV0ZSkgIT09IGF0dHJpYnV0ZXNbYXR0cmlidXRlXSkge1xuICAgICAgICBpZiAoYXR0cmlidXRlc1thdHRyaWJ1dGVdID09PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5ub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsICcnKTtcbiAgICAgICAgICB0aGlzW0N1cnJlbnRBdHRyc10uc2V0KGF0dHJpYnV0ZSwgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubm9kZS5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pO1xuICAgICAgICAgIHRoaXNbQ3VycmVudEF0dHJzXS5zZXQoYXR0cmlidXRlLCBhdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHJlbW92ZSgpIHtcbiAgICBpZiAodGhpcy5ub2RlKSB7XG4gICAgICB0aGlzLm5vZGUucmVtb3ZlKCk7XG4gICAgfVxuICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHRoaXMpO1xuICAgIHZhciBjbGVhbnVwO1xuICAgIHdoaWxlIChjbGVhbnVwID0gdGhpcy5jbGVhbnVwLnNoaWZ0KCkpIHtcbiAgICAgIGNsZWFudXAoKTtcbiAgICB9XG4gICAgdGhpcy5jbGVhcigpO1xuICAgIGlmICghdGhpcy5ub2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkZXRhY2hFdmVudCA9IG5ldyBFdmVudCgnY3ZEb21EZXRhY2hlZCcpO1xuICAgIHRoaXMubm9kZS5kaXNwYXRjaEV2ZW50KGRldGFjaEV2ZW50KTtcbiAgICB0aGlzLm5vZGUgPSB0aGlzLmVsZW1lbnQgPSB0aGlzLnJlZiA9IHRoaXMucGFyZW50ID0gdW5kZWZpbmVkO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIGlmICghdGhpcy5ub2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkZXRhY2hFdmVudCA9IG5ldyBFdmVudCgnY3ZEb21EZXRhY2hlZCcpO1xuICAgIHdoaWxlICh0aGlzLm5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgdGhpcy5ub2RlLmZpcnN0Q2hpbGQuZGlzcGF0Y2hFdmVudChkZXRhY2hFdmVudCk7XG4gICAgICB0aGlzLm5vZGUucmVtb3ZlQ2hpbGQodGhpcy5ub2RlLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgfVxuICBwYXVzZShwYXVzZWQgPSB0cnVlKSB7fVxuICBsaXN0ZW4oZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIHZhciBub2RlID0gdGhpcy5ub2RlO1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB2YXIgcmVtb3ZlID0gKCkgPT4ge1xuICAgICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdmFyIHJlbW92ZXIgPSAoKSA9PiB7XG4gICAgICByZW1vdmUoKTtcbiAgICAgIHJlbW92ZSA9ICgpID0+IGNvbnNvbGUud2FybignQWxyZWFkeSByZW1vdmVkIScpO1xuICAgIH07XG4gICAgdGhpcy5wYXJlbnQub25SZW1vdmUoKCkgPT4gcmVtb3ZlcigpKTtcbiAgICByZXR1cm4gcmVtb3ZlcjtcbiAgfVxufVxuZXhwb3J0cy5UYWcgPSBUYWc7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvYmFzZS9VdWlkLmpzXCIsIGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSkge1xuICByZXF1aXJlID0gX19tYWtlUmVsYXRpdmVSZXF1aXJlKHJlcXVpcmUsIHt9LCBcImN1cnZhdHVyZVwiKTtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5VdWlkID0gdm9pZCAwO1xuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KGUsIHIsIHQpIHsgcmV0dXJuIChyID0gX3RvUHJvcGVydHlLZXkocikpIGluIGUgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgciwgeyB2YWx1ZTogdCwgZW51bWVyYWJsZTogITAsIGNvbmZpZ3VyYWJsZTogITAsIHdyaXRhYmxlOiAhMCB9KSA6IGVbcl0gPSB0LCBlOyB9XG5mdW5jdGlvbiBfdG9Qcm9wZXJ0eUtleSh0KSB7IHZhciBpID0gX3RvUHJpbWl0aXZlKHQsIFwic3RyaW5nXCIpOyByZXR1cm4gXCJzeW1ib2xcIiA9PSB0eXBlb2YgaSA/IGkgOiBpICsgXCJcIjsgfVxuZnVuY3Rpb24gX3RvUHJpbWl0aXZlKHQsIHIpIHsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIHQgfHwgIXQpIHJldHVybiB0OyB2YXIgZSA9IHRbU3ltYm9sLnRvUHJpbWl0aXZlXTsgaWYgKHZvaWQgMCAhPT0gZSkgeyB2YXIgaSA9IGUuY2FsbCh0LCByIHx8IFwiZGVmYXVsdFwiKTsgaWYgKFwib2JqZWN0XCIgIT0gdHlwZW9mIGkpIHJldHVybiBpOyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQEB0b1ByaW1pdGl2ZSBtdXN0IHJldHVybiBhIHByaW1pdGl2ZSB2YWx1ZS5cIik7IH0gcmV0dXJuIChcInN0cmluZ1wiID09PSByID8gU3RyaW5nIDogTnVtYmVyKSh0KTsgfVxudmFyIHdpbiA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyA/IHdpbmRvdyA6IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiB2b2lkIDA7XG52YXIgY3J5cHRvID0gd2luLmNyeXB0bztcbmNsYXNzIFV1aWQge1xuICBjb25zdHJ1Y3Rvcih1dWlkID0gbnVsbCwgdmVyc2lvbiA9IDQpIHtcbiAgICBfZGVmaW5lUHJvcGVydHkodGhpcywgXCJ1dWlkXCIsIG51bGwpO1xuICAgIF9kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInZlcnNpb25cIiwgNCk7XG4gICAgaWYgKHV1aWQpIHtcbiAgICAgIGlmICh0eXBlb2YgdXVpZCAhPT0gJ3N0cmluZycgJiYgISh1dWlkIGluc3RhbmNlb2YgVXVpZCkgfHwgIXV1aWQubWF0Y2goL1swLTlBLUZhLWZdezh9KC1bMC05QS1GYS1mXXs0fSl7M30tWzAtOUEtRmEtZl17MTJ9LykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGlucHV0IGZvciBVdWlkOiBcIiR7dXVpZH1cImApO1xuICAgICAgfVxuICAgICAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgIHRoaXMudXVpZCA9IHV1aWQ7XG4gICAgfSBlbHNlIGlmIChjcnlwdG8gJiYgdHlwZW9mIGNyeXB0by5yYW5kb21VVUlEID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnV1aWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaW5pdCA9IFsxZTddICsgLTFlMyArIC00ZTMgKyAtOGUzICsgLTFlMTE7XG4gICAgICB2YXIgcmFuZCA9IGNyeXB0byAmJiB0eXBlb2YgY3J5cHRvLnJhbmRvbVVVSUQgPT09ICdmdW5jdGlvbicgPyAoKSA9PiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50OEFycmF5KDEpKVswXSA6ICgpID0+IE1hdGgudHJ1bmMoTWF0aC5yYW5kb20oKSAqIDI1Nik7XG4gICAgICB0aGlzLnV1aWQgPSBpbml0LnJlcGxhY2UoL1swMThdL2csIGMgPT4gKGMgXiByYW5kKCkgJiAxNSA+PiBjIC8gNCkudG9TdHJpbmcoMTYpKTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfVxuICBbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHtcbiAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICB9XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnV1aWQ7XG4gIH1cbiAgdG9Kc29uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB2ZXJzaW9uOiB0aGlzLnZlcnNpb24sXG4gICAgICB1dWlkOiB0aGlzLnV1aWRcbiAgICB9O1xuICB9XG59XG5leHBvcnRzLlV1aWQgPSBVdWlkO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVmlldy5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVmlldyA9IHZvaWQgMDtcbnZhciBfQmluZGFibGUgPSByZXF1aXJlKFwiLi9CaW5kYWJsZVwiKTtcbnZhciBfVmlld0xpc3QgPSByZXF1aXJlKFwiLi9WaWV3TGlzdFwiKTtcbnZhciBfUm91dGVyID0gcmVxdWlyZShcIi4vUm91dGVyXCIpO1xudmFyIF9VdWlkID0gcmVxdWlyZShcIi4vVXVpZFwiKTtcbnZhciBfRG9tID0gcmVxdWlyZShcIi4vRG9tXCIpO1xudmFyIF9UYWcgPSByZXF1aXJlKFwiLi9UYWdcIik7XG52YXIgX0JhZyA9IHJlcXVpcmUoXCIuL0JhZ1wiKTtcbnZhciBfUnVsZVNldCA9IHJlcXVpcmUoXCIuL1J1bGVTZXRcIik7XG52YXIgX01peGluID0gcmVxdWlyZShcIi4vTWl4aW5cIik7XG52YXIgX0V2ZW50VGFyZ2V0TWl4aW4gPSByZXF1aXJlKFwiLi4vbWl4aW4vRXZlbnRUYXJnZXRNaXhpblwiKTtcbnZhciBkb250UGFyc2UgPSBTeW1ib2woJ2RvbnRQYXJzZScpO1xudmFyIGV4cGFuZEJpbmQgPSBTeW1ib2woJ2V4cGFuZEJpbmQnKTtcbnZhciB1dWlkID0gU3ltYm9sKCd1dWlkJyk7XG5jbGFzcyBWaWV3IGV4dGVuZHMgX01peGluLk1peGluLndpdGgoX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbikge1xuICBnZXQgX2lkKCkge1xuICAgIHJldHVybiB0aGlzW3V1aWRdO1xuICB9XG4gIHN0YXRpYyBmcm9tKHRlbXBsYXRlLCBhcmdzID0ge30sIG1haW5WaWV3ID0gbnVsbCkge1xuICAgIHZhciB2aWV3ID0gbmV3IHRoaXMoYXJncywgbWFpblZpZXcpO1xuICAgIHZpZXcudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICByZXR1cm4gdmlldztcbiAgfVxuICBjb25zdHJ1Y3RvcihhcmdzID0ge30sIG1haW5WaWV3ID0gbnVsbCkge1xuICAgIHN1cGVyKGFyZ3MsIG1haW5WaWV3KTtcbiAgICB0aGlzW19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IG1haW5WaWV3O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnYXJncycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZShhcmdzKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCB1dWlkLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jb25zdHJ1Y3Rvci51dWlkKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ25vZGVzQXR0YWNoZWQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9CYWcuQmFnKChpLCBzLCBhKSA9PiB7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ25vZGVzRGV0YWNoZWQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9CYWcuQmFnKChpLCBzLCBhKSA9PiB7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19vblJlbW92ZScsIHtcbiAgICAgIHZhbHVlOiBuZXcgX0JhZy5CYWcoKGksIHMsIGEpID0+IHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY2xlYW51cCcsIHtcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncGFyZW50Jywge1xuICAgICAgdmFsdWU6IG1haW5WaWV3LFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ZpZXdzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndmlld0xpc3RzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2l0aFZpZXdzJywge1xuICAgICAgdmFsdWU6IG5ldyBNYXAoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndGFncycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ25vZGVzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKFtdKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndGltZW91dHMnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdpbnRlcnZhbHMnLCB7XG4gICAgICB2YWx1ZTogbmV3IE1hcCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdmcmFtZXMnLCB7XG4gICAgICB2YWx1ZTogW11cbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3J1bGVTZXQnLCB7XG4gICAgICB2YWx1ZTogbmV3IF9SdWxlU2V0LlJ1bGVTZXQoKVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncHJlUnVsZVNldCcsIHtcbiAgICAgIHZhbHVlOiBuZXcgX1J1bGVTZXQuUnVsZVNldCgpXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdzdWJCaW5kaW5ncycsIHtcbiAgICAgIHZhbHVlOiB7fVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndGVtcGxhdGVzJywge1xuICAgICAgdmFsdWU6IHt9XG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwb3N0TWFwcGluZycsIHtcbiAgICAgIHZhbHVlOiBuZXcgU2V0KClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2V2ZW50Q2xlYW51cCcsIHtcbiAgICAgIHZhbHVlOiBbXVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndW5wYXVzZUNhbGxiYWNrcycsIHtcbiAgICAgIHZhbHVlOiBuZXcgTWFwKClcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2ludGVycG9sYXRlUmVnZXgnLCB7XG4gICAgICB2YWx1ZTogLyhcXFtcXFsoKD86XFwkKyk/W1xcd1xcLlxcfC1dKylcXF1cXF0pL2dcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbmRlcmVkJywge1xuICAgICAgdmFsdWU6IG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCkgPT4gT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZW5kZXJDb21wbGV0ZScsIHtcbiAgICAgICAgdmFsdWU6IGFjY2VwdFxuICAgICAgfSkpXG4gICAgfSk7XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICBpZiAoIXRoaXNbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXNbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gbnVsbDtcbiAgICB9KTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSB0aGlzO1xuICAgIHRoaXMudGVtcGxhdGUgPSBgYDtcbiAgICB0aGlzLmZpcnN0Tm9kZSA9IG51bGw7XG4gICAgdGhpcy5sYXN0Tm9kZSA9IG51bGw7XG4gICAgdGhpcy52aWV3TGlzdCA9IG51bGw7XG4gICAgdGhpcy5tYWluVmlldyA9IG51bGw7XG4gICAgdGhpcy5wcmVzZXJ2ZSA9IGZhbHNlO1xuICAgIHRoaXMucmVtb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMubG9hZGVkID0gUHJvbWlzZS5yZXNvbHZlKHRoaXMpO1xuXG4gICAgLy8gcmV0dXJuIEJpbmRhYmxlLm1ha2UodGhpcyk7XG4gIH1cbiAgc3RhdGljIGlzVmlldygpIHtcbiAgICByZXR1cm4gVmlldztcbiAgfVxuICBvbkZyYW1lKGNhbGxiYWNrKSB7XG4gICAgdmFyIHN0b3BwZWQgPSBmYWxzZTtcbiAgICB2YXIgY2FuY2VsID0gKCkgPT4ge1xuICAgICAgc3RvcHBlZCA9IHRydWU7XG4gICAgfTtcbiAgICB2YXIgYyA9IHRpbWVzdGFtcCA9PiB7XG4gICAgICBpZiAodGhpcy5yZW1vdmVkIHx8IHN0b3BwZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgICAgICBjYWxsYmFjayhEYXRlLm5vdygpKTtcbiAgICAgIH1cbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShjKTtcbiAgICB9O1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBjKERhdGUubm93KCkpKTtcbiAgICB0aGlzLmZyYW1lcy5wdXNoKGNhbmNlbCk7XG4gICAgcmV0dXJuIGNhbmNlbDtcbiAgfVxuICBvbk5leHRGcmFtZShjYWxsYmFjaykge1xuICAgIHJldHVybiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gY2FsbGJhY2soRGF0ZS5ub3coKSkpO1xuICB9XG4gIG9uSWRsZShjYWxsYmFjaykge1xuICAgIHJldHVybiByZXF1ZXN0SWRsZUNhbGxiYWNrKCgpID0+IGNhbGxiYWNrKERhdGUubm93KCkpKTtcbiAgfVxuICBvblRpbWVvdXQodGltZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgdGltZW91dEluZm8gPSB7XG4gICAgICB0aW1lb3V0OiBudWxsLFxuICAgICAgY2FsbGJhY2s6IG51bGwsXG4gICAgICB0aW1lOiB0aW1lLFxuICAgICAgZmlyZWQ6IGZhbHNlLFxuICAgICAgY3JlYXRlZDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICBwYXVzZWQ6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgd3JhcHBlZENhbGxiYWNrID0gKCkgPT4ge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICAgIHRpbWVvdXRJbmZvLmZpcmVkID0gdHJ1ZTtcbiAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICAgIH07XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHdyYXBwZWRDYWxsYmFjaywgdGltZSk7XG4gICAgdGltZW91dEluZm8uY2FsbGJhY2sgPSB3cmFwcGVkQ2FsbGJhY2s7XG4gICAgdGltZW91dEluZm8udGltZW91dCA9IHRpbWVvdXQ7XG4gICAgdGhpcy50aW1lb3V0cy5zZXQodGltZW91dEluZm8udGltZW91dCwgdGltZW91dEluZm8pO1xuICAgIHJldHVybiB0aW1lb3V0O1xuICB9XG4gIGNsZWFyVGltZW91dCh0aW1lb3V0KSB7XG4gICAgaWYgKCF0aGlzLnRpbWVvdXRzLmhhcyh0aW1lb3V0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dEluZm8gPSB0aGlzLnRpbWVvdXRzLmdldCh0aW1lb3V0KTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dEluZm8udGltZW91dCk7XG4gICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dEluZm8udGltZW91dCk7XG4gIH1cbiAgb25JbnRlcnZhbCh0aW1lLCBjYWxsYmFjaykge1xuICAgIHZhciB0aW1lb3V0ID0gc2V0SW50ZXJ2YWwoY2FsbGJhY2ssIHRpbWUpO1xuICAgIHRoaXMuaW50ZXJ2YWxzLnNldCh0aW1lb3V0LCB7XG4gICAgICB0aW1lb3V0OiB0aW1lb3V0LFxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgdGltZTogdGltZSxcbiAgICAgIHBhdXNlZDogZmFsc2VcbiAgICB9KTtcbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxuICBjbGVhckludGVydmFsKHRpbWVvdXQpIHtcbiAgICBpZiAoIXRoaXMuaW50ZXJ2YWxzLmhhcyh0aW1lb3V0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dEluZm8gPSB0aGlzLmludGVydmFscy5nZXQodGltZW91dCk7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJbmZvLnRpbWVvdXQpO1xuICAgIHRoaXMuaW50ZXJ2YWxzLmRlbGV0ZSh0aW1lb3V0SW5mby50aW1lb3V0KTtcbiAgfVxuICBwYXVzZShwYXVzZWQgPSB1bmRlZmluZWQpIHtcbiAgICBpZiAocGF1c2VkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucGF1c2VkID0gIXRoaXMucGF1c2VkO1xuICAgIH1cbiAgICB0aGlzLnBhdXNlZCA9IHBhdXNlZDtcbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgIGZvciAodmFyIFtjYWxsYmFjaywgdGltZW91dF0gb2YgdGhpcy50aW1lb3V0cykge1xuICAgICAgICBpZiAodGltZW91dC5maXJlZCkge1xuICAgICAgICAgIHRoaXMudGltZW91dHMuZGVsZXRlKHRpbWVvdXQudGltZW91dCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQudGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgdGltZW91dC50aW1lID0gTWF0aC5tYXgoMCwgdGltZW91dC50aW1lIC0gKERhdGUubm93KCkgLSB0aW1lb3V0LmNyZWF0ZWQpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIFtfY2FsbGJhY2ssIF90aW1lb3V0XSBvZiB0aGlzLmludGVydmFscykge1xuICAgICAgICBjbGVhckludGVydmFsKF90aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgICBfdGltZW91dC5wYXVzZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBbX2NhbGxiYWNrMiwgX3RpbWVvdXQyXSBvZiB0aGlzLnRpbWVvdXRzKSB7XG4gICAgICAgIGlmICghX3RpbWVvdXQyLnBhdXNlZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChfdGltZW91dDIuZmlyZWQpIHtcbiAgICAgICAgICB0aGlzLnRpbWVvdXRzLmRlbGV0ZShfdGltZW91dDIudGltZW91dCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgX3RpbWVvdXQyLnRpbWVvdXQgPSBzZXRUaW1lb3V0KF90aW1lb3V0Mi5jYWxsYmFjaywgX3RpbWVvdXQyLnRpbWUpO1xuICAgICAgICBfdGltZW91dDIucGF1c2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBbX2NhbGxiYWNrMywgX3RpbWVvdXQzXSBvZiB0aGlzLmludGVydmFscykge1xuICAgICAgICBpZiAoIV90aW1lb3V0My5wYXVzZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBfdGltZW91dDMudGltZW91dCA9IHNldEludGVydmFsKF90aW1lb3V0My5jYWxsYmFjaywgX3RpbWVvdXQzLnRpbWUpO1xuICAgICAgICBfdGltZW91dDMucGF1c2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBbLCBfY2FsbGJhY2s0XSBvZiB0aGlzLnVucGF1c2VDYWxsYmFja3MpIHtcbiAgICAgICAgX2NhbGxiYWNrNCgpO1xuICAgICAgfVxuICAgICAgdGhpcy51bnBhdXNlQ2FsbGJhY2tzLmNsZWFyKCk7XG4gICAgfVxuICAgIGZvciAodmFyIFt0YWcsIHZpZXdMaXN0XSBvZiB0aGlzLnZpZXdMaXN0cykge1xuICAgICAgdmlld0xpc3QucGF1c2UoISFwYXVzZWQpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpIGluIHRoaXMudGFncykge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy50YWdzW2ldKSkge1xuICAgICAgICBmb3IgKHZhciBqIGluIHRoaXMudGFnc1tpXSkge1xuICAgICAgICAgIHRoaXMudGFnc1tpXVtqXS5wYXVzZSghIXBhdXNlZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB0aGlzLnRhZ3NbaV0ucGF1c2UoISFwYXVzZWQpO1xuICAgIH1cbiAgfVxuICByZW5kZXIocGFyZW50Tm9kZSA9IG51bGwsIGluc2VydFBvaW50ID0gbnVsbCwgb3V0ZXJWaWV3ID0gbnVsbCkge1xuICAgIHZhciB7XG4gICAgICBkb2N1bWVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICBpZiAocGFyZW50Tm9kZSBpbnN0YW5jZW9mIFZpZXcpIHtcbiAgICAgIHBhcmVudE5vZGUgPSBwYXJlbnROb2RlLmZpcnN0Tm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICBpZiAoaW5zZXJ0UG9pbnQgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICBpbnNlcnRQb2ludCA9IGluc2VydFBvaW50LmZpcnN0Tm9kZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmlyc3ROb2RlKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZVJlbmRlcihwYXJlbnROb2RlLCBpbnNlcnRQb2ludCwgb3V0ZXJWaWV3KTtcbiAgICB9XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVuZGVyJykpO1xuICAgIHZhciB0ZW1wbGF0ZUlzRnJhZ21lbnQgPSB0eXBlb2YgdGhpcy50ZW1wbGF0ZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHRoaXMudGVtcGxhdGUuY2xvbmVOb2RlID09PSAnZnVuY3Rpb24nO1xuICAgIHZhciB0ZW1wbGF0ZVBhcnNlZCA9IHRlbXBsYXRlSXNGcmFnbWVudCB8fCBWaWV3LnRlbXBsYXRlcy5oYXModGhpcy50ZW1wbGF0ZSk7XG4gICAgdmFyIHN1YkRvYztcbiAgICBpZiAodGVtcGxhdGVQYXJzZWQpIHtcbiAgICAgIGlmICh0ZW1wbGF0ZUlzRnJhZ21lbnQpIHtcbiAgICAgICAgc3ViRG9jID0gdGhpcy50ZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWJEb2MgPSBWaWV3LnRlbXBsYXRlcy5nZXQodGhpcy50ZW1wbGF0ZSkuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdWJEb2MgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCh0aGlzLnRlbXBsYXRlKTtcbiAgICB9XG4gICAgaWYgKCF0ZW1wbGF0ZVBhcnNlZCAmJiAhdGVtcGxhdGVJc0ZyYWdtZW50KSB7XG4gICAgICBWaWV3LnRlbXBsYXRlcy5zZXQodGhpcy50ZW1wbGF0ZSwgc3ViRG9jLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgfVxuICAgIHRoaXMubWFpblZpZXcgfHwgdGhpcy5wcmVSdWxlU2V0LmFwcGx5KHN1YkRvYywgdGhpcyk7XG4gICAgdGhpcy5tYXBUYWdzKHN1YkRvYyk7XG4gICAgdGhpcy5tYWluVmlldyB8fCB0aGlzLnJ1bGVTZXQuYXBwbHkoc3ViRG9jLCB0aGlzKTtcbiAgICBpZiAoZ2xvYmFsVGhpcy5kZXZNb2RlID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmZpcnN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoYFRlbXBsYXRlICR7dGhpcy5faWR9IFN0YXJ0YCk7XG4gICAgICB0aGlzLmxhc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChgVGVtcGxhdGUgJHt0aGlzLl9pZH0gRW5kYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZmlyc3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgdGhpcy5sYXN0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICB9XG4gICAgdGhpcy5ub2Rlcy5wdXNoKHRoaXMuZmlyc3ROb2RlLCAuLi5BcnJheS5mcm9tKHN1YkRvYy5jaGlsZE5vZGVzKSwgdGhpcy5sYXN0Tm9kZSk7XG4gICAgdGhpcy5wb3N0UmVuZGVyKHBhcmVudE5vZGUpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbmRlcmVkJykpO1xuICAgIGlmICghdGhpcy5kaXNwYXRjaEF0dGFjaCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICBpZiAoaW5zZXJ0UG9pbnQpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgaW5zZXJ0UG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5maXJzdE5vZGUsIG51bGwpO1xuICAgICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmxhc3ROb2RlLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN1YkRvYywgdGhpcy5sYXN0Tm9kZSk7XG4gICAgICB2YXIgcm9vdE5vZGUgPSBwYXJlbnROb2RlLmdldFJvb3ROb2RlKCk7XG4gICAgICBpZiAocm9vdE5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hBdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSwgb3V0ZXJWaWV3KTtcbiAgICAgIH0gZWxzZSBpZiAob3V0ZXJWaWV3KSB7XG4gICAgICAgIHZhciBmaXJzdERvbUF0dGFjaCA9IGV2ZW50ID0+IHtcbiAgICAgICAgICB2YXIgcm9vdE5vZGUgPSBwYXJlbnROb2RlLmdldFJvb3ROb2RlKCk7XG4gICAgICAgICAgdGhpcy5hdHRhY2hlZChyb290Tm9kZSwgcGFyZW50Tm9kZSk7XG4gICAgICAgICAgdGhpcy5kaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlLCBvdXRlclZpZXcpO1xuICAgICAgICAgIG91dGVyVmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdhdHRhY2hlZCcsIGZpcnN0RG9tQXR0YWNoKTtcbiAgICAgICAgfTtcbiAgICAgICAgb3V0ZXJWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2F0dGFjaGVkJywgZmlyc3REb21BdHRhY2gpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJlbmRlckNvbXBsZXRlKHRoaXMubm9kZXMpO1xuICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICB9XG4gIGRpc3BhdGNoQXR0YWNoKCkge1xuICAgIHZhciB7XG4gICAgICBDdXN0b21FdmVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYXR0YWNoJywge1xuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIHRhcmdldDogdGhpc1xuICAgIH0pKTtcbiAgfVxuICBkaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlLCB2aWV3ID0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIHtcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2F0dGFjaGVkJywge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgbm9kZTogcGFyZW50Tm9kZSxcbiAgICAgICAgcm9vdDogcm9vdE5vZGUsXG4gICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICB9XG4gICAgfSkpO1xuICAgIHRoaXMuZGlzcGF0Y2hEb21BdHRhY2hlZCh2aWV3KTtcbiAgICBmb3IgKHZhciBjYWxsYmFjayBvZiB0aGlzLm5vZGVzQXR0YWNoZWQuaXRlbXMoKSkge1xuICAgICAgY2FsbGJhY2socm9vdE5vZGUsIHBhcmVudE5vZGUpO1xuICAgIH1cbiAgfVxuICBkaXNwYXRjaERvbUF0dGFjaGVkKHZpZXcpIHtcbiAgICB2YXIge1xuICAgICAgTm9kZSxcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHRoaXMubm9kZXMuZmlsdGVyKG4gPT4gbi5ub2RlVHlwZSAhPT0gTm9kZS5DT01NRU5UX05PREUpLmZvckVhY2goY2hpbGQgPT4ge1xuICAgICAgaWYgKCFjaGlsZC5tYXRjaGVzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNoaWxkLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkRvbUF0dGFjaGVkJywge1xuICAgICAgICB0YXJnZXQ6IGNoaWxkLFxuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgICAgX0RvbS5Eb20ubWFwVGFncyhjaGlsZCwgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgICBpZiAoIXRhZy5tYXRjaGVzKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY3ZEb21BdHRhY2hlZCcsIHtcbiAgICAgICAgICB0YXJnZXQ6IHRhZyxcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZVJlbmRlcihwYXJlbnROb2RlLCBpbnNlcnRQb2ludCwgb3V0ZXJWaWV3KSB7XG4gICAgdmFyIHtcbiAgICAgIEN1c3RvbUV2ZW50XG4gICAgfSA9IGdsb2JhbFRoaXMud2luZG93O1xuICAgIHZhciB3aWxsUmVSZW5kZXIgPSB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZVJlbmRlcicpLCB7XG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgdGFyZ2V0OiB0aGlzLFxuICAgICAgdmlldzogb3V0ZXJWaWV3XG4gICAgfSk7XG4gICAgaWYgKCF3aWxsUmVSZW5kZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHN1YkRvYyA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgaWYgKHRoaXMuZmlyc3ROb2RlLmlzQ29ubmVjdGVkKSB7XG4gICAgICB2YXIgZGV0YWNoID0gdGhpcy5ub2Rlc0RldGFjaGVkLml0ZW1zKCk7XG4gICAgICBmb3IgKHZhciBpIGluIGRldGFjaCkge1xuICAgICAgICBkZXRhY2hbaV0oKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3ViRG9jLmFwcGVuZCguLi50aGlzLm5vZGVzKTtcbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgaWYgKGluc2VydFBvaW50KSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBpbnNlcnRQb2ludCk7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubGFzdE5vZGUsIGluc2VydFBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuZmlyc3ROb2RlLCBudWxsKTtcbiAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5sYXN0Tm9kZSwgbnVsbCk7XG4gICAgICB9XG4gICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShzdWJEb2MsIHRoaXMubGFzdE5vZGUpO1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVSZW5kZXJlZCcpLCB7XG4gICAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICAgIHRhcmdldDogdGhpcyxcbiAgICAgICAgdmlldzogb3V0ZXJWaWV3XG4gICAgICB9KTtcbiAgICAgIHZhciByb290Tm9kZSA9IHBhcmVudE5vZGUuZ2V0Um9vdE5vZGUoKTtcbiAgICAgIGlmIChyb290Tm9kZS5pc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLmF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEF0dGFjaGVkKHJvb3ROb2RlLCBwYXJlbnROb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9kZXM7XG4gIH1cbiAgbWFwVGFncyhzdWJEb2MpIHtcbiAgICBfRG9tLkRvbS5tYXBUYWdzKHN1YkRvYywgZmFsc2UsICh0YWcsIHdhbGtlcikgPT4ge1xuICAgICAgaWYgKHRhZ1tkb250UGFyc2VdKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0YWcubWF0Y2hlcykge1xuICAgICAgICB0YWcgPSB0aGlzLm1hcEludGVycG9sYXRhYmxlVGFnKHRhZyk7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtdGVtcGxhdGVdJykgJiYgdGhpcy5tYXBUZW1wbGF0ZVRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1zbG90XScpICYmIHRoaXMubWFwU2xvdFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1wcmVyZW5kZXJdJykgJiYgdGhpcy5tYXBQcmVuZGVyZXJUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtbGlua10nKSAmJiB0aGlzLm1hcExpbmtUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtYXR0cl0nKSAmJiB0aGlzLm1hcEF0dHJUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3YtZXhwYW5kXScpICYmIHRoaXMubWFwRXhwYW5kYWJsZVRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1yZWZdJykgJiYgdGhpcy5tYXBSZWZUYWcodGFnKSB8fCB0YWc7XG4gICAgICAgIHRhZyA9IHRhZy5tYXRjaGVzKCdbY3Ytb25dJykgJiYgdGhpcy5tYXBPblRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1lYWNoXScpICYmIHRoaXMubWFwRWFjaFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1iaW5kXScpICYmIHRoaXMubWFwQmluZFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi13aXRoXScpICYmIHRoaXMubWFwV2l0aFRhZyh0YWcpIHx8IHRhZztcbiAgICAgICAgdGFnID0gdGFnLm1hdGNoZXMoJ1tjdi1pZl0nKSAmJiB0aGlzLm1hcElmVGFnKHRhZykgfHwgdGFnO1xuICAgICAgICB0YWcgPSB0YWcubWF0Y2hlcygnW2N2LXZpZXddJykgJiYgdGhpcy5tYXBWaWV3VGFnKHRhZykgfHwgdGFnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFnID0gdGhpcy5tYXBJbnRlcnBvbGF0YWJsZVRhZyh0YWcpO1xuICAgICAgfVxuICAgICAgaWYgKHRhZyAhPT0gd2Fsa2VyLmN1cnJlbnROb2RlKSB7XG4gICAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHRhZztcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnBvc3RNYXBwaW5nLmZvckVhY2goYyA9PiBjKCkpO1xuICB9XG4gIG1hcEV4cGFuZGFibGVUYWcodGFnKSB7XG4gICAgLy8gY29uc3QgdGFnQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVFeHBhbmRhYmxlVGFnKHRhZyk7XG4gICAgLy8gY29uc3QgbmV3VGFnID0gdGFnQ29tcGlsZXIodGhpcyk7XG4gICAgLy8gdGFnLnJlcGxhY2VXaXRoKG5ld1RhZyk7XG4gICAgLy8gcmV0dXJuIG5ld1RhZztcblxuICAgIHZhciBleGlzdGluZyA9IHRhZ1tleHBhbmRCaW5kXTtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGV4aXN0aW5nKCk7XG4gICAgICB0YWdbZXhwYW5kQmluZF0gPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIFtwcm94eSwgZXhwYW5kUHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUodGhpcy5hcmdzLCB0YWcuZ2V0QXR0cmlidXRlKCdjdi1leHBhbmQnKSwgdHJ1ZSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG4gICAgaWYgKCFwcm94eVtleHBhbmRQcm9wZXJ0eV0pIHtcbiAgICAgIHByb3h5W2V4cGFuZFByb3BlcnR5XSA9IHt9O1xuICAgIH1cbiAgICBwcm94eVtleHBhbmRQcm9wZXJ0eV0gPSBfQmluZGFibGUuQmluZGFibGUubWFrZShwcm94eVtleHBhbmRQcm9wZXJ0eV0pO1xuICAgIHRoaXMub25SZW1vdmUodGFnW2V4cGFuZEJpbmRdID0gcHJveHlbZXhwYW5kUHJvcGVydHldLmJpbmRUbygodiwgaywgdCwgZCwgcCkgPT4ge1xuICAgICAgaWYgKGQgfHwgdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoaywgdik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh2ID09PSBudWxsKSB7XG4gICAgICAgIHRhZy5zZXRBdHRyaWJ1dGUoaywgJycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0YWcuc2V0QXR0cmlidXRlKGssIHYpO1xuICAgIH0pKTtcblxuICAgIC8vIGxldCBleHBhbmRQcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuICAgIC8vIGxldCBleHBhbmRBcmcgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUoXG4gICAgLy8gXHR0aGlzLmFyZ3NbZXhwYW5kUHJvcGVydHldIHx8IHt9XG4gICAgLy8gKTtcblxuICAgIC8vIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuXG4gICAgLy8gZm9yKGxldCBpIGluIGV4cGFuZEFyZylcbiAgICAvLyB7XG4gICAgLy8gXHRpZihpID09PSAnbmFtZScgfHwgaSA9PT0gJ3R5cGUnKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRjb250aW51ZTtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0bGV0IGRlYmluZCA9IGV4cGFuZEFyZy5iaW5kVG8oaSwgKCh0YWcsaSk9Pih2KT0+e1xuICAgIC8vIFx0XHR0YWcuc2V0QXR0cmlidXRlKGksIHYpO1xuICAgIC8vIFx0fSkodGFnLGkpKTtcblxuICAgIC8vIFx0dGhpcy5vblJlbW92ZSgoKT0+e1xuICAgIC8vIFx0XHRkZWJpbmQoKTtcbiAgICAvLyBcdFx0aWYoZXhwYW5kQXJnLmlzQm91bmQoKSlcbiAgICAvLyBcdFx0e1xuICAgIC8vIFx0XHRcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3MoZXhwYW5kQXJnKTtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0fSk7XG4gICAgLy8gfVxuXG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIGNvbXBpbGVFeHBhbmRhYmxlVGFnKHNvdXJjZVRhZylcbiAgLy8ge1xuICAvLyBcdHJldHVybiAoYmluZGluZ1ZpZXcpID0+IHtcblxuICAvLyBcdFx0Y29uc3QgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSh0cnVlKTtcblxuICAvLyBcdFx0bGV0IGV4cGFuZFByb3BlcnR5ID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtZXhwYW5kJyk7XG4gIC8vIFx0XHRsZXQgZXhwYW5kQXJnID0gQmluZGFibGUubWFrZShcbiAgLy8gXHRcdFx0YmluZGluZ1ZpZXcuYXJnc1tleHBhbmRQcm9wZXJ0eV0gfHwge31cbiAgLy8gXHRcdCk7XG5cbiAgLy8gXHRcdHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWV4cGFuZCcpO1xuXG4gIC8vIFx0XHRmb3IobGV0IGkgaW4gZXhwYW5kQXJnKVxuICAvLyBcdFx0e1xuICAvLyBcdFx0XHRpZihpID09PSAnbmFtZScgfHwgaSA9PT0gJ3R5cGUnKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0Y29udGludWU7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRsZXQgZGViaW5kID0gZXhwYW5kQXJnLmJpbmRUbyhpLCAoKHRhZyxpKT0+KHYpPT57XG4gIC8vIFx0XHRcdFx0dGFnLnNldEF0dHJpYnV0ZShpLCB2KTtcbiAgLy8gXHRcdFx0fSkodGFnLGkpKTtcblxuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5vblJlbW92ZSgoKT0+e1xuICAvLyBcdFx0XHRcdGRlYmluZCgpO1xuICAvLyBcdFx0XHRcdGlmKGV4cGFuZEFyZy5pc0JvdW5kKCkpXG4gIC8vIFx0XHRcdFx0e1xuICAvLyBcdFx0XHRcdFx0QmluZGFibGUuY2xlYXJCaW5kaW5ncyhleHBhbmRBcmcpO1xuICAvLyBcdFx0XHRcdH1cbiAgLy8gXHRcdFx0fSk7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHRcdHJldHVybiB0YWc7XG4gIC8vIFx0fTtcbiAgLy8gfVxuXG4gIG1hcEF0dHJUYWcodGFnKSB7XG4gICAgdmFyIHRhZ0NvbXBpbGVyID0gdGhpcy5jb21waWxlQXR0clRhZyh0YWcpO1xuICAgIHZhciBuZXdUYWcgPSB0YWdDb21waWxlcih0aGlzKTtcbiAgICB0YWcucmVwbGFjZVdpdGgobmV3VGFnKTtcbiAgICByZXR1cm4gbmV3VGFnO1xuXG4gICAgLy8gbGV0IGF0dHJQcm9wZXJ0eSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcblxuICAgIC8vIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcblxuICAgIC8vIGxldCBwYWlycyA9IGF0dHJQcm9wZXJ0eS5zcGxpdCgnLCcpO1xuICAgIC8vIGxldCBhdHRycyA9IHBhaXJzLm1hcCgocCkgPT4gcC5zcGxpdCgnOicpKTtcblxuICAgIC8vIGZvciAobGV0IGkgaW4gYXR0cnMpXG4gICAgLy8ge1xuICAgIC8vIFx0bGV0IHByb3h5ICAgICAgICA9IHRoaXMuYXJncztcbiAgICAvLyBcdGxldCBiaW5kUHJvcGVydHkgPSBhdHRyc1tpXVsxXTtcbiAgICAvLyBcdGxldCBwcm9wZXJ0eSAgICAgPSBiaW5kUHJvcGVydHk7XG5cbiAgICAvLyBcdGlmKGJpbmRQcm9wZXJ0eS5tYXRjaCgvXFwuLykpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdFtwcm94eSwgcHJvcGVydHldID0gQmluZGFibGUucmVzb2x2ZShcbiAgICAvLyBcdFx0XHR0aGlzLmFyZ3NcbiAgICAvLyBcdFx0XHQsIGJpbmRQcm9wZXJ0eVxuICAgIC8vIFx0XHRcdCwgdHJ1ZVxuICAgIC8vIFx0XHQpO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gXHRsZXQgYXR0cmliID0gYXR0cnNbaV1bMF07XG5cbiAgICAvLyBcdHRoaXMub25SZW1vdmUocHJveHkuYmluZFRvKFxuICAgIC8vIFx0XHRwcm9wZXJ0eVxuICAgIC8vIFx0XHQsICh2KT0+e1xuICAgIC8vIFx0XHRcdGlmKHYgPT0gbnVsbClcbiAgICAvLyBcdFx0XHR7XG4gICAgLy8gXHRcdFx0XHR0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgJycpO1xuICAgIC8vIFx0XHRcdFx0cmV0dXJuO1xuICAgIC8vIFx0XHRcdH1cbiAgICAvLyBcdFx0XHR0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgdik7XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdCkpO1xuICAgIC8vIH1cblxuICAgIC8vIHJldHVybiB0YWc7XG4gIH1cbiAgY29tcGlsZUF0dHJUYWcoc291cmNlVGFnKSB7XG4gICAgdmFyIGF0dHJQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcbiAgICB2YXIgcGFpcnMgPSBhdHRyUHJvcGVydHkuc3BsaXQoL1ssO10vKTtcbiAgICB2YXIgYXR0cnMgPSBwYWlycy5tYXAocCA9PiBwLnNwbGl0KCc6JykpO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWF0dHInKTtcbiAgICByZXR1cm4gYmluZGluZ1ZpZXcgPT4ge1xuICAgICAgdmFyIHRhZyA9IHNvdXJjZVRhZy5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBiaW5kUHJvcGVydHkgPSBhdHRyc1tpXVsxXSB8fCBhdHRyc1tpXVswXTtcbiAgICAgICAgdmFyIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoYmluZGluZ1ZpZXcuYXJncywgYmluZFByb3BlcnR5LCB0cnVlKTtcbiAgICAgICAgdmFyIGF0dHJpYiA9IGF0dHJzW2ldWzBdO1xuICAgICAgICBiaW5kaW5nVmlldy5vblJlbW92ZShwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICAgICAgaWYgKGQgfHwgdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YWcucmVtb3ZlQXR0cmlidXRlKGF0dHJpYiwgdik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2ID09PSBudWxsKSB7XG4gICAgICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgJycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYiwgdik7XG4gICAgICAgIH0pKTtcbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBpIGluIGF0dHJzKSB7XG4gICAgICAgIF9sb29wKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGFnO1xuICAgIH07XG4gIH1cbiAgbWFwSW50ZXJwb2xhdGFibGVUYWcodGFnKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgcmVnZXggPSB0aGlzLmludGVycG9sYXRlUmVnZXg7XG4gICAgdmFyIHtcbiAgICAgIE5vZGUsXG4gICAgICBkb2N1bWVudFxuICAgIH0gPSBnbG9iYWxUaGlzLndpbmRvdztcbiAgICBpZiAodGFnLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xuICAgICAgdmFyIG9yaWdpbmFsID0gdGFnLm5vZGVWYWx1ZTtcbiAgICAgIGlmICghdGhpcy5pbnRlcnBvbGF0YWJsZShvcmlnaW5hbCkpIHtcbiAgICAgICAgcmV0dXJuIHRhZztcbiAgICAgIH1cbiAgICAgIHZhciBoZWFkZXIgPSAwO1xuICAgICAgdmFyIG1hdGNoO1xuICAgICAgdmFyIF9sb29wMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgYmluZFByb3BlcnR5ID0gbWF0Y2hbMl07XG4gICAgICAgICAgdmFyIHVuc2FmZUh0bWwgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgdW5zYWZlVmlldyA9IGZhbHNlO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eVNwbGl0ID0gYmluZFByb3BlcnR5LnNwbGl0KCd8Jyk7XG4gICAgICAgICAgdmFyIHRyYW5zZm9ybWVyID0gZmFsc2U7XG4gICAgICAgICAgaWYgKHByb3BlcnR5U3BsaXQubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdHJhbnNmb3JtZXIgPSBfdGhpcy5zdHJpbmdUcmFuc2Zvcm1lcihwcm9wZXJ0eVNwbGl0LnNsaWNlKDEpKTtcbiAgICAgICAgICAgIGJpbmRQcm9wZXJ0eSA9IHByb3BlcnR5U3BsaXRbMF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChiaW5kUHJvcGVydHkuc3Vic3RyKDAsIDIpID09PSAnJCQnKSB7XG4gICAgICAgICAgICB1bnNhZmVIdG1sID0gdHJ1ZTtcbiAgICAgICAgICAgIHVuc2FmZVZpZXcgPSB0cnVlO1xuICAgICAgICAgICAgYmluZFByb3BlcnR5ID0gYmluZFByb3BlcnR5LnN1YnN0cigyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgICAgICAgdW5zYWZlSHRtbCA9IHRydWU7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBiaW5kUHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYmluZFByb3BlcnR5LnN1YnN0cigwLCAzKSA9PT0gJzAwMCcpIHtcbiAgICAgICAgICAgIGV4cGFuZCA9IHRydWU7XG4gICAgICAgICAgICBiaW5kUHJvcGVydHkgPSBiaW5kUHJvcGVydHkuc3Vic3RyKDMpO1xuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzdGF0aWNQcmVmaXggPSBvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyLCBtYXRjaC5pbmRleCk7XG4gICAgICAgICAgaGVhZGVyID0gbWF0Y2guaW5kZXggKyBtYXRjaFsxXS5sZW5ndGg7XG4gICAgICAgICAgdmFyIHN0YXRpY05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdGF0aWNQcmVmaXgpO1xuICAgICAgICAgIHN0YXRpY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN0YXRpY05vZGUsIHRhZyk7XG4gICAgICAgICAgdmFyIGR5bmFtaWNOb2RlO1xuICAgICAgICAgIGlmICh1bnNhZmVIdG1sKSB7XG4gICAgICAgICAgICBkeW5hbWljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkeW5hbWljTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZHluYW1pY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICAgICAgdmFyIHByb3h5ID0gX3RoaXMuYXJncztcbiAgICAgICAgICB2YXIgcHJvcGVydHkgPSBiaW5kUHJvcGVydHk7XG4gICAgICAgICAgaWYgKGJpbmRQcm9wZXJ0eS5tYXRjaCgvXFwuLykpIHtcbiAgICAgICAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoX3RoaXMuYXJncywgYmluZFByb3BlcnR5LCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGR5bmFtaWNOb2RlLCB0YWcpO1xuICAgICAgICAgIGlmICh0eXBlb2YgcHJveHkgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZXR1cm4gMTsgLy8gYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJveHkgPSBfQmluZGFibGUuQmluZGFibGUubWFrZShwcm94eSk7XG4gICAgICAgICAgdmFyIGRlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQpID0+IHtcbiAgICAgICAgICAgIGlmICh0W2tdICE9PSB2ICYmICh0W2tdIGluc3RhbmNlb2YgVmlldyB8fCB0W2tdIGluc3RhbmNlb2YgTm9kZSB8fCB0W2tdIGluc3RhbmNlb2YgX1RhZy5UYWcpKSB7XG4gICAgICAgICAgICAgIGlmICghdFtrXS5wcmVzZXJ2ZSkge1xuICAgICAgICAgICAgICAgIHRba10ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh1bnNhZmVWaWV3ICYmICEodiBpbnN0YW5jZW9mIFZpZXcpKSB7XG4gICAgICAgICAgICAgIHZhciB1bnNhZmVUZW1wbGF0ZSA9IHYgIT09IG51bGwgJiYgdiAhPT0gdm9pZCAwID8gdiA6ICcnO1xuICAgICAgICAgICAgICB2ID0gbmV3IFZpZXcoX3RoaXMuYXJncywgX3RoaXMpO1xuICAgICAgICAgICAgICB2LnRlbXBsYXRlID0gdW5zYWZlVGVtcGxhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIpIHtcbiAgICAgICAgICAgICAgdiA9IHRyYW5zZm9ybWVyKHYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICB2W19FdmVudFRhcmdldE1peGluLkV2ZW50VGFyZ2V0TWl4aW4uUGFyZW50XSA9IF90aGlzO1xuICAgICAgICAgICAgICB2LnJlbmRlcih0YWcucGFyZW50Tm9kZSwgZHluYW1pY05vZGUsIF90aGlzKTtcbiAgICAgICAgICAgICAgdmFyIGNsZWFudXAgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF2LnByZXNlcnZlKSB7XG4gICAgICAgICAgICAgICAgICB2LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgX3RoaXMub25SZW1vdmUoY2xlYW51cCk7XG4gICAgICAgICAgICAgIHYub25SZW1vdmUoKCkgPT4gX3RoaXMuX29uUmVtb3ZlLnJlbW92ZShjbGVhbnVwKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodiwgZHluYW1pY05vZGUpO1xuICAgICAgICAgICAgICBfdGhpcy5vblJlbW92ZSgoKSA9PiB2LnJlbW92ZSgpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodiBpbnN0YW5jZW9mIF9UYWcuVGFnKSB7XG4gICAgICAgICAgICAgIGR5bmFtaWNOb2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICBpZiAodi5ub2RlKSB7XG4gICAgICAgICAgICAgICAgdGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHYubm9kZSwgZHluYW1pY05vZGUpO1xuICAgICAgICAgICAgICAgIF90aGlzLm9uUmVtb3ZlKCgpID0+IHYucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHYucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgT2JqZWN0ICYmIHYuX190b1N0cmluZyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdiA9IHYuX190b1N0cmluZygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICh1bnNhZmVIdG1sKSB7XG4gICAgICAgICAgICAgICAgZHluYW1pY05vZGUuaW5uZXJIVE1MID0gdjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkeW5hbWljTm9kZS5ub2RlVmFsdWUgPSB2O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkeW5hbWljTm9kZVtkb250UGFyc2VdID0gdHJ1ZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBfdGhpcy5vblJlbW92ZShkZWJpbmQpO1xuICAgICAgICB9LFxuICAgICAgICBfcmV0O1xuICAgICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhvcmlnaW5hbCkpIHtcbiAgICAgICAgX3JldCA9IF9sb29wMigpO1xuICAgICAgICBpZiAoX3JldCA9PT0gMCkgY29udGludWU7XG4gICAgICAgIGlmIChfcmV0ID09PSAxKSBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhciBzdGF0aWNTdWZmaXggPSBvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyKTtcbiAgICAgIHZhciBzdGF0aWNOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RhdGljU3VmZml4KTtcbiAgICAgIHN0YXRpY05vZGVbZG9udFBhcnNlXSA9IHRydWU7XG4gICAgICB0YWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3RhdGljTm9kZSwgdGFnKTtcbiAgICAgIHRhZy5ub2RlVmFsdWUgPSAnJztcbiAgICB9IGVsc2UgaWYgKHRhZy5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgIHZhciBfbG9vcDMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghX3RoaXMuaW50ZXJwb2xhdGFibGUodGFnLmF0dHJpYnV0ZXNbaV0udmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGhlYWRlciA9IDA7XG4gICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gdGFnLmF0dHJpYnV0ZXNbaV0udmFsdWU7XG4gICAgICAgIHZhciBhdHRyaWJ1dGUgPSB0YWcuYXR0cmlidXRlc1tpXTtcbiAgICAgICAgdmFyIGJpbmRQcm9wZXJ0aWVzID0ge307XG4gICAgICAgIHZhciBzZWdtZW50cyA9IFtdO1xuICAgICAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKG9yaWdpbmFsKSkge1xuICAgICAgICAgIHNlZ21lbnRzLnB1c2gob3JpZ2luYWwuc3Vic3RyaW5nKGhlYWRlciwgbWF0Y2guaW5kZXgpKTtcbiAgICAgICAgICBpZiAoIWJpbmRQcm9wZXJ0aWVzW21hdGNoWzJdXSkge1xuICAgICAgICAgICAgYmluZFByb3BlcnRpZXNbbWF0Y2hbMl1dID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGJpbmRQcm9wZXJ0aWVzW21hdGNoWzJdXS5wdXNoKHNlZ21lbnRzLmxlbmd0aCk7XG4gICAgICAgICAgc2VnbWVudHMucHVzaChtYXRjaFsxXSk7XG4gICAgICAgICAgaGVhZGVyID0gbWF0Y2guaW5kZXggKyBtYXRjaFsxXS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgc2VnbWVudHMucHVzaChvcmlnaW5hbC5zdWJzdHJpbmcoaGVhZGVyKSk7XG4gICAgICAgIHZhciBfbG9vcDQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHByb3h5ID0gX3RoaXMuYXJncztcbiAgICAgICAgICB2YXIgcHJvcGVydHkgPSBqO1xuICAgICAgICAgIHZhciBwcm9wZXJ0eVNwbGl0ID0gai5zcGxpdCgnfCcpO1xuICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IGZhbHNlO1xuICAgICAgICAgIHZhciBsb25nUHJvcGVydHkgPSBqO1xuICAgICAgICAgIGlmIChwcm9wZXJ0eVNwbGl0Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyID0gX3RoaXMuc3RyaW5nVHJhbnNmb3JtZXIocHJvcGVydHlTcGxpdC5zbGljZSgxKSk7XG4gICAgICAgICAgICBwcm9wZXJ0eSA9IHByb3BlcnR5U3BsaXRbMF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwcm9wZXJ0eS5tYXRjaCgvXFwuLykpIHtcbiAgICAgICAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUoX3RoaXMuYXJncywgcHJvcGVydHksIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbWF0Y2hpbmcgPSBbXTtcbiAgICAgICAgICB2YXIgYmluZFByb3BlcnR5ID0gajtcbiAgICAgICAgICB2YXIgbWF0Y2hpbmdTZWdtZW50cyA9IGJpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV07XG4gICAgICAgICAgX3RoaXMub25SZW1vdmUocHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaywgdCwgZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyKSB7XG4gICAgICAgICAgICAgIHYgPSB0cmFuc2Zvcm1lcih2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIF9pIGluIGJpbmRQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgIGZvciAodmFyIF9qIGluIGJpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV0pIHtcbiAgICAgICAgICAgICAgICBzZWdtZW50c1tiaW5kUHJvcGVydGllc1tsb25nUHJvcGVydHldW19qXV0gPSB0W19pXTtcbiAgICAgICAgICAgICAgICBpZiAoayA9PT0gcHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgIHNlZ21lbnRzW2JpbmRQcm9wZXJ0aWVzW2xvbmdQcm9wZXJ0eV1bX2pdXSA9IHY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV90aGlzLnBhdXNlZCkge1xuICAgICAgICAgICAgICB0YWcuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBzZWdtZW50cy5qb2luKCcnKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBfdGhpcy51bnBhdXNlQ2FsbGJhY2tzLnNldChhdHRyaWJ1dGUsICgpID0+IHRhZy5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLm5hbWUsIHNlZ21lbnRzLmpvaW4oJycpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9O1xuICAgICAgICBmb3IgKHZhciBqIGluIGJpbmRQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgX2xvb3A0KCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZy5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChfbG9vcDMoKSkgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwUmVmVGFnKHRhZykge1xuICAgIHZhciByZWZBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtcmVmJyk7XG4gICAgdmFyIFtyZWZQcm9wLCByZWZDbGFzc25hbWUgPSBudWxsLCByZWZLZXkgPSBudWxsXSA9IHJlZkF0dHIuc3BsaXQoJzonKTtcbiAgICB2YXIgcmVmQ2xhc3MgPSBfVGFnLlRhZztcbiAgICBpZiAocmVmQ2xhc3NuYW1lKSB7XG4gICAgICByZWZDbGFzcyA9IHRoaXMuc3RyaW5nVG9DbGFzcyhyZWZDbGFzc25hbWUpO1xuICAgIH1cbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1yZWYnKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFnLCAnX19fdGFnX19fJywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgdGFnLl9fX3RhZ19fXyA9IG51bGw7XG4gICAgICB0YWcucmVtb3ZlKCk7XG4gICAgfSk7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgdmFyIGRpcmVjdCA9IHRoaXM7XG4gICAgaWYgKHRoaXMudmlld0xpc3QpIHtcbiAgICAgIHBhcmVudCA9IHRoaXMudmlld0xpc3QucGFyZW50O1xuICAgICAgLy8gaWYoIXRoaXMudmlld0xpc3QucGFyZW50LnRhZ3NbcmVmUHJvcF0pXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHRoaXMudmlld0xpc3QucGFyZW50LnRhZ3NbcmVmUHJvcF0gPSBbXTtcbiAgICAgIC8vIH1cblxuICAgICAgLy8gbGV0IHJlZktleVZhbCA9IHRoaXMuYXJnc1tyZWZLZXldO1xuXG4gICAgICAvLyB0aGlzLnZpZXdMaXN0LnBhcmVudC50YWdzW3JlZlByb3BdW3JlZktleVZhbF0gPSBuZXcgcmVmQ2xhc3MoXG4gICAgICAvLyBcdHRhZywgdGhpcywgcmVmUHJvcCwgcmVmS2V5VmFsXG4gICAgICAvLyApO1xuICAgIH1cbiAgICAvLyBlbHNlXG4gICAgLy8ge1xuICAgIC8vIFx0dGhpcy50YWdzW3JlZlByb3BdID0gbmV3IHJlZkNsYXNzKFxuICAgIC8vIFx0XHR0YWcsIHRoaXMsIHJlZlByb3BcbiAgICAvLyBcdCk7XG4gICAgLy8gfVxuXG4gICAgdmFyIHRhZ09iamVjdCA9IG5ldyByZWZDbGFzcyh0YWcsIHRoaXMsIHJlZlByb3AsIHVuZGVmaW5lZCwgZGlyZWN0KTtcbiAgICB0YWcuX19fdGFnX19fID0gdGFnT2JqZWN0O1xuICAgIHRoaXMudGFnc1tyZWZQcm9wXSA9IHRhZ09iamVjdDtcbiAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICB2YXIgcmVmS2V5VmFsID0gdGhpcy5hcmdzW3JlZktleV07XG4gICAgICBpZiAocmVmS2V5VmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKCFwYXJlbnQudGFnc1tyZWZQcm9wXSkge1xuICAgICAgICAgIHBhcmVudC50YWdzW3JlZlByb3BdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50LnRhZ3NbcmVmUHJvcF1bcmVmS2V5VmFsXSA9IHRhZ09iamVjdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudC50YWdzW3JlZlByb3BdID0gdGFnT2JqZWN0O1xuICAgICAgfVxuICAgICAgaWYgKCFwYXJlbnQucGFyZW50KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICB9XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBCaW5kVGFnKHRhZykge1xuICAgIHZhciBiaW5kQXJnID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtYmluZCcpO1xuICAgIHZhciBwcm94eSA9IHRoaXMuYXJncztcbiAgICB2YXIgcHJvcGVydHkgPSBiaW5kQXJnO1xuICAgIHZhciB0b3AgPSBudWxsO1xuICAgIGlmIChiaW5kQXJnLm1hdGNoKC9cXC4vKSkge1xuICAgICAgW3Byb3h5LCBwcm9wZXJ0eSwgdG9wXSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKHRoaXMuYXJncywgYmluZEFyZywgdHJ1ZSk7XG4gICAgfVxuICAgIGlmIChwcm94eSAhPT0gdGhpcy5hcmdzKSB7XG4gICAgICB0aGlzLnN1YkJpbmRpbmdzW2JpbmRBcmddID0gdGhpcy5zdWJCaW5kaW5nc1tiaW5kQXJnXSB8fCBbXTtcbiAgICAgIHRoaXMub25SZW1vdmUodGhpcy5hcmdzLmJpbmRUbyh0b3AsICgpID0+IHtcbiAgICAgICAgd2hpbGUgKHRoaXMuc3ViQmluZGluZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5zdWJCaW5kaW5ncy5zaGlmdCgpKCk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgdmFyIHVuc2FmZUh0bWwgPSBmYWxzZTtcbiAgICBpZiAocHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgIHByb3BlcnR5ID0gcHJvcGVydHkuc3Vic3RyKDEpO1xuICAgICAgdW5zYWZlSHRtbCA9IHRydWU7XG4gICAgfVxuICAgIHZhciBhdXRvRXZlbnRTdGFydGVkID0gZmFsc2U7XG4gICAgdmFyIGRlYmluZCA9IHByb3h5LmJpbmRUbyhwcm9wZXJ0eSwgKHYsIGssIHQsIGQsIHApID0+IHtcbiAgICAgIGlmICgocCBpbnN0YW5jZW9mIFZpZXcgfHwgcCBpbnN0YW5jZW9mIE5vZGUgfHwgcCBpbnN0YW5jZW9mIF9UYWcuVGFnKSAmJiBwICE9PSB2KSB7XG4gICAgICAgIHAucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICBpZiAoWydJTlBVVCcsICdTRUxFQ1QnLCAnVEVYVEFSRUEnXS5pbmNsdWRlcyh0YWcudGFnTmFtZSkpIHtcbiAgICAgICAgdmFyIF90eXBlID0gdGFnLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgICAgICBpZiAoX3R5cGUgJiYgX3R5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgIHRhZy5jaGVja2VkID0gISF2O1xuICAgICAgICB9IGVsc2UgaWYgKF90eXBlICYmIF90eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICB0YWcuY2hlY2tlZCA9IHYgPT0gdGFnLnZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKF90eXBlICE9PSAnZmlsZScpIHtcbiAgICAgICAgICBpZiAodGFnLnRhZ05hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0T3B0aW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZy5vcHRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvbiA9IHRhZy5vcHRpb25zW2ldO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb24udmFsdWUgPT0gdikge1xuICAgICAgICAgICAgICAgICAgdGFnLnNlbGVjdGVkSW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNlbGVjdE9wdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5ub2Rlc0F0dGFjaGVkLmFkZChzZWxlY3RPcHRpb24pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YWcudmFsdWUgPSB2ID09IG51bGwgPyAnJyA6IHY7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChhdXRvRXZlbnRTdGFydGVkKSB7XG4gICAgICAgICAgdGFnLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjdkF1dG9DaGFuZ2VkJywge1xuICAgICAgICAgICAgYnViYmxlczogdHJ1ZVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICBhdXRvRXZlbnRTdGFydGVkID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh2IGluc3RhbmNlb2YgVmlldykge1xuICAgICAgICAgIGZvciAodmFyIG5vZGUgb2YgdGFnLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZbX0V2ZW50VGFyZ2V0TWl4aW4uRXZlbnRUYXJnZXRNaXhpbi5QYXJlbnRdID0gdGhpcztcbiAgICAgICAgICB2LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgICAgICB9IGVsc2UgaWYgKHYgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgdGFnLmluc2VydCh2KTtcbiAgICAgICAgfSBlbHNlIGlmICh2IGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgICAgICB0YWcuYXBwZW5kKHYubm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodW5zYWZlSHRtbCkge1xuICAgICAgICAgIGlmICh0YWcuaW5uZXJIVE1MICE9PSB2KSB7XG4gICAgICAgICAgICB2ID0gU3RyaW5nKHYpO1xuICAgICAgICAgICAgaWYgKHRhZy5pbm5lckhUTUwgPT09IHYuc3Vic3RyaW5nKDAsIHRhZy5pbm5lckhUTUwubGVuZ3RoKSkge1xuICAgICAgICAgICAgICB0YWcuaW5uZXJIVE1MICs9IHYuc3Vic3RyaW5nKHRhZy5pbm5lckhUTUwubGVuZ3RoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvciAodmFyIF9ub2RlIG9mIHRhZy5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgX25vZGUucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdGFnLmlubmVySFRNTCA9IHY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfRG9tLkRvbS5tYXBUYWdzKHRhZywgZmFsc2UsIHQgPT4gdFtkb250UGFyc2VdID0gdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0YWcudGV4dENvbnRlbnQgIT09IHYpIHtcbiAgICAgICAgICAgIGZvciAodmFyIF9ub2RlMiBvZiB0YWcuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICBfbm9kZTIucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0YWcudGV4dENvbnRlbnQgPSB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChwcm94eSAhPT0gdGhpcy5hcmdzKSB7XG4gICAgICB0aGlzLnN1YkJpbmRpbmdzW2JpbmRBcmddLnB1c2goZGViaW5kKTtcbiAgICB9XG4gICAgdGhpcy5vblJlbW92ZShkZWJpbmQpO1xuICAgIHZhciB0eXBlID0gdGFnLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgIHZhciBtdWx0aSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ211bHRpcGxlJyk7XG4gICAgdmFyIGlucHV0TGlzdGVuZXIgPSBldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnQudGFyZ2V0ICE9PSB0YWcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGUgJiYgdHlwZS50b0xvd2VyQ2FzZSgpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgIGlmICh0YWcuY2hlY2tlZCkge1xuICAgICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcHJveHlbcHJvcGVydHldID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZXZlbnQudGFyZ2V0Lm1hdGNoZXMoJ1tjb250ZW50ZWRpdGFibGU9dHJ1ZV0nKSkge1xuICAgICAgICBwcm94eVtwcm9wZXJ0eV0gPSBldmVudC50YXJnZXQuaW5uZXJIVE1MO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZmlsZScgJiYgbXVsdGkpIHtcbiAgICAgICAgdmFyIGZpbGVzID0gQXJyYXkuZnJvbShldmVudC50YXJnZXQuZmlsZXMpO1xuICAgICAgICB2YXIgY3VycmVudCA9IHByb3h5W3Byb3BlcnR5XSB8fCBfQmluZGFibGUuQmluZGFibGUub25EZWNrKHByb3h5LCBwcm9wZXJ0eSk7XG4gICAgICAgIGlmICghY3VycmVudCB8fCAhZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgcHJveHlbcHJvcGVydHldID0gZmlsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIF9sb29wNSA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgICBpZiAoZmlsZXNbaV0gIT09IGN1cnJlbnRbaV0pIHtcbiAgICAgICAgICAgICAgZmlsZXNbaV0udG9KU09OID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICBuYW1lOiBmaWxlW2ldLm5hbWUsXG4gICAgICAgICAgICAgICAgICBzaXplOiBmaWxlW2ldLnNpemUsXG4gICAgICAgICAgICAgICAgICB0eXBlOiBmaWxlW2ldLnR5cGUsXG4gICAgICAgICAgICAgICAgICBkYXRlOiBmaWxlW2ldLmxhc3RNb2RpZmllZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGN1cnJlbnRbaV0gPSBmaWxlc1tpXTtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7IC8vIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICBmb3IgKHZhciBpIGluIGZpbGVzKSB7XG4gICAgICAgICAgICBpZiAoX2xvb3A1KGkpKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2ZpbGUnICYmICFtdWx0aSAmJiBldmVudC50YXJnZXQuZmlsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBfZmlsZSA9IGV2ZW50LnRhcmdldC5maWxlcy5pdGVtKDApO1xuICAgICAgICBfZmlsZS50b0pTT04gPSAoKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IF9maWxlLm5hbWUsXG4gICAgICAgICAgICBzaXplOiBfZmlsZS5zaXplLFxuICAgICAgICAgICAgdHlwZTogX2ZpbGUudHlwZSxcbiAgICAgICAgICAgIGRhdGU6IF9maWxlLmxhc3RNb2RpZmllZFxuICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHByb3h5W3Byb3BlcnR5XSA9IF9maWxlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJveHlbcHJvcGVydHldID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgfVxuICAgIH07XG4gICAgaWYgKHR5cGUgPT09ICdmaWxlJyB8fCB0eXBlID09PSAncmFkaW8nKSB7XG4gICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaW5wdXRMaXN0ZW5lcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgdGFnLmFkZEV2ZW50TGlzdGVuZXIoJ3ZhbHVlLWNoYW5nZWQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICB9XG4gICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICBpZiAodHlwZSA9PT0gJ2ZpbGUnIHx8IHR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGlucHV0TGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2lucHV0JywgaW5wdXRMaXN0ZW5lcik7XG4gICAgICAgIHRhZy5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3ZhbHVlLWNoYW5nZWQnLCBpbnB1dExpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1iaW5kJyk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBPblRhZyh0YWcpIHtcbiAgICB2YXIgcmVmZXJlbnRzID0gU3RyaW5nKHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LW9uJykpO1xuICAgIHJlZmVyZW50cy5zcGxpdCgnOycpLm1hcChhID0+IGEuc3BsaXQoJzonKSkuZm9yRWFjaChhID0+IHtcbiAgICAgIGEgPSBhLm1hcChhID0+IGEudHJpbSgpKTtcbiAgICAgIHZhciBhcmdMZW4gPSBhLmxlbmd0aDtcbiAgICAgIHZhciBldmVudE5hbWUgPSBTdHJpbmcoYS5zaGlmdCgpKS50cmltKCk7XG4gICAgICB2YXIgY2FsbGJhY2tOYW1lID0gU3RyaW5nKGEuc2hpZnQoKSB8fCBldmVudE5hbWUpLnRyaW0oKTtcbiAgICAgIHZhciBldmVudEZsYWdzID0gU3RyaW5nKGEuc2hpZnQoKSB8fCAnJykudHJpbSgpO1xuICAgICAgdmFyIGFyZ0xpc3QgPSBbXTtcbiAgICAgIHZhciBncm91cHMgPSAvKFxcdyspKD86XFwoKFskXFx3XFxzLSdcIixdKylcXCkpPy8uZXhlYyhjYWxsYmFja05hbWUpO1xuICAgICAgaWYgKGdyb3Vwcykge1xuICAgICAgICBjYWxsYmFja05hbWUgPSBncm91cHNbMV0ucmVwbGFjZSgvKF5bXFxzXFxuXSt8W1xcc1xcbl0rJCkvLCAnJyk7XG4gICAgICAgIGlmIChncm91cHNbMl0pIHtcbiAgICAgICAgICBhcmdMaXN0ID0gZ3JvdXBzWzJdLnNwbGl0KCcsJykubWFwKHMgPT4gcy50cmltKCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWFyZ0xpc3QubGVuZ3RoKSB7XG4gICAgICAgIGFyZ0xpc3QucHVzaCgnJGV2ZW50Jyk7XG4gICAgICB9XG4gICAgICBpZiAoIWV2ZW50TmFtZSB8fCBhcmdMZW4gPT09IDEpIHtcbiAgICAgICAgZXZlbnROYW1lID0gY2FsbGJhY2tOYW1lO1xuICAgICAgfVxuICAgICAgdmFyIGV2ZW50TGlzdGVuZXIgPSBldmVudCA9PiB7XG4gICAgICAgIHZhciBldmVudE1ldGhvZDtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBfbG9vcDYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29udHJvbGxlciA9IHBhcmVudC5jb250cm9sbGVyO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb250cm9sbGVyW2NhbGxiYWNrTmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgZXZlbnRNZXRob2QgPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJbY2FsbGJhY2tOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGJyZWFrXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXJlbnRbY2FsbGJhY2tOYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICBldmVudE1ldGhvZCA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgcGFyZW50W2NhbGxiYWNrTmFtZV0oLi4uYXJncyk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIHJldHVybiAwOyAvLyBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHBhcmVudC5wYXJlbnQpIHtcbiAgICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiAwOyAvLyBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgX3JldDI7XG4gICAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgICBfcmV0MiA9IF9sb29wNigpO1xuICAgICAgICAgIGlmIChfcmV0MiA9PT0gMCkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFyZ1JlZnMgPSBhcmdMaXN0Lm1hcChhcmcgPT4ge1xuICAgICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgICBpZiAoTnVtYmVyKGFyZykgPT0gYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnID09PSAnZXZlbnQnIHx8IGFyZyA9PT0gJyRldmVudCcpIHtcbiAgICAgICAgICAgIHJldHVybiBldmVudDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyR2aWV3Jykge1xuICAgICAgICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyRjb250cm9sbGVyJykge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXI7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckdGFnJykge1xuICAgICAgICAgICAgcmV0dXJuIHRhZztcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZyA9PT0gJyRwYXJlbnQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcgPT09ICckc3VidmlldycpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYXJnIGluIHRoaXMuYXJncykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXJnc1thcmddO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2ggPSAvXlsnXCJdKFtcXHctXSs/KVtcIiddJC8uZXhlYyhhcmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hbMV07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCEodHlwZW9mIGV2ZW50TWV0aG9kID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtjYWxsYmFja05hbWV9IGlzIG5vdCBkZWZpbmVkIG9uIFZpZXcgb2JqZWN0LmAgKyBcIlxcblwiICsgYFRhZzpgICsgXCJcXG5cIiArIGAke3RhZy5vdXRlckhUTUx9YCk7XG4gICAgICAgIH1cbiAgICAgICAgZXZlbnRNZXRob2QoLi4uYXJnUmVmcyk7XG4gICAgICB9O1xuICAgICAgdmFyIGV2ZW50T3B0aW9ucyA9IHt9O1xuICAgICAgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ3AnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMucGFzc2l2ZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ1AnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMucGFzc2l2ZSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ2MnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMuY2FwdHVyZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ0MnKSkge1xuICAgICAgICBldmVudE9wdGlvbnMuY2FwdHVyZSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ28nKSkge1xuICAgICAgICBldmVudE9wdGlvbnMub25jZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RmxhZ3MuaW5jbHVkZXMoJ08nKSkge1xuICAgICAgICBldmVudE9wdGlvbnMub25jZSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgc3dpdGNoIChldmVudE5hbWUpIHtcbiAgICAgICAgY2FzZSAnX2luaXQnOlxuICAgICAgICAgIGV2ZW50TGlzdGVuZXIoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnX2F0dGFjaCc6XG4gICAgICAgICAgdGhpcy5ub2Rlc0F0dGFjaGVkLmFkZChldmVudExpc3RlbmVyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnX2RldGFjaCc6XG4gICAgICAgICAgdGhpcy5ub2Rlc0RldGFjaGVkLmFkZChldmVudExpc3RlbmVyKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0YWcuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGV2ZW50TGlzdGVuZXIsIGV2ZW50T3B0aW9ucyk7XG4gICAgICAgICAgdGhpcy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgICB0YWcucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGV2ZW50TGlzdGVuZXIsIGV2ZW50T3B0aW9ucyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICByZXR1cm4gW2V2ZW50TmFtZSwgY2FsbGJhY2tOYW1lLCBhcmdMaXN0XTtcbiAgICB9KTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi1vbicpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwTGlua1RhZyh0YWcpIHtcbiAgICAvLyBjb25zdCB0YWdDb21waWxlciA9IHRoaXMuY29tcGlsZUxpbmtUYWcodGFnKTtcblxuICAgIC8vIGNvbnN0IG5ld1RhZyA9IHRhZ0NvbXBpbGVyKHRoaXMpO1xuXG4gICAgLy8gdGFnLnJlcGxhY2VXaXRoKG5ld1RhZyk7XG5cbiAgICAvLyByZXR1cm4gbmV3VGFnO1xuXG4gICAgdmFyIGxpbmtBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAgIHRhZy5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBsaW5rQXR0cik7XG4gICAgdmFyIGxpbmtDbGljayA9IGV2ZW50ID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBpZiAobGlua0F0dHIuc3Vic3RyaW5nKDAsIDQpID09PSAnaHR0cCcgfHwgbGlua0F0dHIuc3Vic3RyaW5nKDAsIDIpID09PSAnLy8nKSB7XG4gICAgICAgIGdsb2JhbFRoaXMub3Blbih0YWcuZ2V0QXR0cmlidXRlKCdocmVmJywgbGlua0F0dHIpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgX1JvdXRlci5Sb3V0ZXIuZ28odGFnLmdldEF0dHJpYnV0ZSgnaHJlZicpKTtcbiAgICB9O1xuICAgIHRhZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGxpbmtDbGljayk7XG4gICAgdGhpcy5vblJlbW92ZSgoKHRhZywgZXZlbnRMaXN0ZW5lcikgPT4gKCkgPT4ge1xuICAgICAgdGFnLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZXZlbnRMaXN0ZW5lcik7XG4gICAgICB0YWcgPSB1bmRlZmluZWQ7XG4gICAgICBldmVudExpc3RlbmVyID0gdW5kZWZpbmVkO1xuICAgIH0pKHRhZywgbGlua0NsaWNrKSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtbGluaycpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cblxuICAvLyBjb21waWxlTGlua1RhZyhzb3VyY2VUYWcpXG4gIC8vIHtcbiAgLy8gXHRjb25zdCBsaW5rQXR0ciA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWxpbmsnKTtcbiAgLy8gXHRzb3VyY2VUYWcucmVtb3ZlQXR0cmlidXRlKCdjdi1saW5rJyk7XG4gIC8vIFx0cmV0dXJuIChiaW5kaW5nVmlldykgPT4ge1xuICAvLyBcdFx0Y29uc3QgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSh0cnVlKTtcbiAgLy8gXHRcdHRhZy5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBsaW5rQXR0cik7XG4gIC8vIFx0XHRyZXR1cm4gdGFnO1xuICAvLyBcdH07XG4gIC8vIH1cblxuICBtYXBQcmVuZGVyZXJUYWcodGFnKSB7XG4gICAgdmFyIHByZXJlbmRlckF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1wcmVyZW5kZXInKTtcbiAgICB2YXIgcHJlcmVuZGVyaW5nID0gZ2xvYmFsVGhpcy5wcmVyZW5kZXJlciB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9wcmVyZW5kZXIvaSk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtcHJlcmVuZGVyJyk7XG4gICAgaWYgKHByZXJlbmRlcmluZykge1xuICAgICAgZ2xvYmFsVGhpcy5wcmVyZW5kZXJlciA9IGdsb2JhbFRoaXMucHJlcmVuZGVyZXIgfHwgdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHByZXJlbmRlckF0dHIgPT09ICduZXZlcicgJiYgcHJlcmVuZGVyaW5nIHx8IHByZXJlbmRlckF0dHIgPT09ICdvbmx5JyAmJiAhcHJlcmVuZGVyaW5nKSB7XG4gICAgICB0aGlzLnBvc3RNYXBwaW5nLmFkZCgoKSA9PiB0YWcucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YWcpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBXaXRoVGFnKHRhZykge1xuICAgIHZhciBfdGhpczIgPSB0aGlzO1xuICAgIHZhciB3aXRoQXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXdpdGgnKTtcbiAgICB2YXIgY2FycnlBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtY2FycnknKTtcbiAgICB2YXIgdmlld0F0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3Ytd2l0aCcpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWNhcnJ5Jyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSB2aWV3QXR0ciA/IHRoaXMuc3RyaW5nVG9DbGFzcyh2aWV3QXR0cikgOiBWaWV3O1xuICAgIHZhciBzdWJUZW1wbGF0ZSA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWy4uLnRhZy5jaGlsZE5vZGVzXS5mb3JFYWNoKG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobikpO1xuICAgIHZhciBjYXJyeVByb3BzID0gW107XG4gICAgaWYgKGNhcnJ5QXR0cikge1xuICAgICAgY2FycnlQcm9wcyA9IGNhcnJ5QXR0ci5zcGxpdCgnLCcpLm1hcChzID0+IHMudHJpbSgpKTtcbiAgICB9XG4gICAgdmFyIGRlYmluZCA9IHRoaXMuYXJncy5iaW5kVG8od2l0aEF0dHIsICh2LCBrLCB0LCBkKSA9PiB7XG4gICAgICBpZiAodGhpcy53aXRoVmlld3MuaGFzKHRhZykpIHtcbiAgICAgICAgdGhpcy53aXRoVmlld3MuZGVsZXRlKHRhZyk7XG4gICAgICB9XG4gICAgICB3aGlsZSAodGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGFnLnJlbW92ZUNoaWxkKHRhZy5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICAgIHZhciB2aWV3ID0gbmV3IHZpZXdDbGFzcyh7fSwgdGhpcyk7XG4gICAgICB0aGlzLm9uUmVtb3ZlKCh2aWV3ID0+ICgpID0+IHtcbiAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgIH0pKHZpZXcpKTtcbiAgICAgIHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgICAgIHZhciBfbG9vcDcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWJpbmQgPSBfdGhpczIuYXJncy5iaW5kVG8oY2FycnlQcm9wc1tpXSwgKHYsIGspID0+IHtcbiAgICAgICAgICB2aWV3LmFyZ3Nba10gPSB2O1xuICAgICAgICB9KTtcbiAgICAgICAgdmlldy5vblJlbW92ZShkZWJpbmQpO1xuICAgICAgICBfdGhpczIub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIGRlYmluZCgpO1xuICAgICAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIGkgaW4gY2FycnlQcm9wcykge1xuICAgICAgICBfbG9vcDcoKTtcbiAgICAgIH1cbiAgICAgIHZhciBfbG9vcDggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICByZXR1cm4gMTsgLy8gY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2ID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uodik7XG4gICAgICAgIHZhciBkZWJpbmQgPSB2LmJpbmRUbyhfaTIsICh2diwga2ssIHR0LCBkZCkgPT4ge1xuICAgICAgICAgIGlmICghZGQpIHtcbiAgICAgICAgICAgIHZpZXcuYXJnc1tra10gPSB2djtcbiAgICAgICAgICB9IGVsc2UgaWYgKGtrIGluIHZpZXcuYXJncykge1xuICAgICAgICAgICAgZGVsZXRlIHZpZXcuYXJnc1tra107XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRlYmluZFVwID0gdmlldy5hcmdzLmJpbmRUbyhfaTIsICh2diwga2ssIHR0LCBkZCkgPT4ge1xuICAgICAgICAgIGlmICghZGQpIHtcbiAgICAgICAgICAgIHZba2tdID0gdnY7XG4gICAgICAgICAgfSBlbHNlIGlmIChrayBpbiB2KSB7XG4gICAgICAgICAgICBkZWxldGUgdltra107XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMyLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgICAgICBkZWJpbmQoKTtcbiAgICAgICAgICBpZiAoIXYuaXNCb3VuZCgpKSB7XG4gICAgICAgICAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh2KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZpZXcub25SZW1vdmUoKCkgPT4ge1xuICAgICAgICAgIGRlYmluZCgpO1xuICAgICAgICAgIGlmICghdi5pc0JvdW5kKCkpIHtcbiAgICAgICAgICAgIF9CaW5kYWJsZS5CaW5kYWJsZS5jbGVhckJpbmRpbmdzKHYpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgZm9yICh2YXIgX2kyIGluIHYpIHtcbiAgICAgICAgaWYgKF9sb29wOCgpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZpZXcucmVuZGVyKHRhZywgbnVsbCwgdGhpcyk7XG4gICAgICB0aGlzLndpdGhWaWV3cy5zZXQodGFnLCB2aWV3KTtcbiAgICB9KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIHRoaXMud2l0aFZpZXdzLmRlbGV0ZSh0YWcpO1xuICAgICAgZGViaW5kKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuICBtYXBWaWV3VGFnKHRhZykge1xuICAgIHZhciB2aWV3QXR0ciA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4udGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIHBhcnRzID0gdmlld0F0dHIuc3BsaXQoJzonKTtcbiAgICB2YXIgdmlld05hbWUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgIHZhciB2aWV3Q2xhc3MgPSBwYXJ0cy5sZW5ndGggPyB0aGlzLnN0cmluZ1RvQ2xhc3MocGFydHNbMF0pIDogVmlldztcbiAgICB2YXIgdmlldyA9IG5ldyB2aWV3Q2xhc3ModGhpcy5hcmdzLCB0aGlzKTtcbiAgICB0aGlzLnZpZXdzLnNldCh0YWcsIHZpZXcpO1xuICAgIHRoaXMudmlld3Muc2V0KHZpZXdOYW1lLCB2aWV3KTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHtcbiAgICAgIHZpZXcucmVtb3ZlKCk7XG4gICAgICB0aGlzLnZpZXdzLmRlbGV0ZSh0YWcpO1xuICAgICAgdGhpcy52aWV3cy5kZWxldGUodmlld05hbWUpO1xuICAgIH0pO1xuICAgIHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgICB2aWV3LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwRWFjaFRhZyh0YWcpIHtcbiAgICB2YXIgZWFjaEF0dHIgPSB0YWcuZ2V0QXR0cmlidXRlKCdjdi1lYWNoJyk7XG4gICAgdmFyIHZpZXdBdHRyID0gdGFnLmdldEF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWVhY2gnKTtcbiAgICB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi12aWV3Jyk7XG4gICAgdmFyIHZpZXdDbGFzcyA9IHZpZXdBdHRyID8gdGhpcy5zdHJpbmdUb0NsYXNzKHZpZXdBdHRyKSA6IFZpZXc7XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4udGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIFtlYWNoUHJvcCwgYXNQcm9wLCBrZXlQcm9wXSA9IGVhY2hBdHRyLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHByb3h5ID0gdGhpcy5hcmdzO1xuICAgIHZhciBwcm9wZXJ0eSA9IGVhY2hQcm9wO1xuICAgIGlmIChlYWNoUHJvcC5tYXRjaCgvXFwuLykpIHtcbiAgICAgIFtwcm94eSwgcHJvcGVydHldID0gX0JpbmRhYmxlLkJpbmRhYmxlLnJlc29sdmUodGhpcy5hcmdzLCBlYWNoUHJvcCwgdHJ1ZSk7XG4gICAgfVxuICAgIHZhciBkZWJpbmQgPSBwcm94eS5iaW5kVG8ocHJvcGVydHksICh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICBpZiAodiBpbnN0YW5jZW9mIF9CYWcuQmFnKSB7XG4gICAgICAgIHYgPSB2Lmxpc3Q7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy52aWV3TGlzdHMuaGFzKHRhZykpIHtcbiAgICAgICAgdGhpcy52aWV3TGlzdHMuZ2V0KHRhZykucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICB2YXIgdmlld0xpc3QgPSBuZXcgX1ZpZXdMaXN0LlZpZXdMaXN0KHN1YlRlbXBsYXRlLCBhc1Byb3AsIHYsIHRoaXMsIGtleVByb3AsIHZpZXdDbGFzcyk7XG4gICAgICB2YXIgdmlld0xpc3RSZW1vdmVyID0gKCkgPT4gdmlld0xpc3QucmVtb3ZlKCk7XG4gICAgICB0aGlzLm9uUmVtb3ZlKHZpZXdMaXN0UmVtb3Zlcik7XG4gICAgICB2aWV3TGlzdC5vblJlbW92ZSgoKSA9PiB0aGlzLl9vblJlbW92ZS5yZW1vdmUodmlld0xpc3RSZW1vdmVyKSk7XG4gICAgICB2YXIgZGViaW5kQSA9IHRoaXMuYXJncy5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgaWYgKGsgPT09ICdfaWQnKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZCkge1xuICAgICAgICAgIHZpZXdMaXN0LnN1YkFyZ3Nba10gPSB2O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChrIGluIHZpZXdMaXN0LnN1YkFyZ3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2aWV3TGlzdC5zdWJBcmdzW2tdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgZGViaW5kQiA9IHZpZXdMaXN0LmFyZ3MuYmluZFRvKCh2LCBrLCB0LCBkLCBwKSA9PiB7XG4gICAgICAgIGlmIChrID09PSAnX2lkJyB8fCBrID09PSAndmFsdWUnIHx8IFN0cmluZyhrKS5zdWJzdHJpbmcoMCwgMykgPT09ICdfX18nKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZCkge1xuICAgICAgICAgIGlmIChrIGluIHRoaXMuYXJncykge1xuICAgICAgICAgICAgdGhpcy5hcmdzW2tdID0gdjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuYXJnc1trXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2aWV3TGlzdC5vblJlbW92ZShkZWJpbmRBKTtcbiAgICAgIHZpZXdMaXN0Lm9uUmVtb3ZlKGRlYmluZEIpO1xuICAgICAgdGhpcy5vblJlbW92ZShkZWJpbmRBKTtcbiAgICAgIHRoaXMub25SZW1vdmUoZGViaW5kQik7XG4gICAgICB3aGlsZSAodGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGFnLnJlbW92ZUNoaWxkKHRhZy5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudmlld0xpc3RzLnNldCh0YWcsIHZpZXdMaXN0KTtcbiAgICAgIHZpZXdMaXN0LnJlbmRlcih0YWcsIG51bGwsIHRoaXMpO1xuICAgICAgaWYgKHRhZy50YWdOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgICB2aWV3TGlzdC5yZVJlbmRlcigpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMub25SZW1vdmUoZGViaW5kKTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG4gIG1hcElmVGFnKHRhZykge1xuICAgIHZhciBzb3VyY2VUYWcgPSB0YWc7XG4gICAgdmFyIHZpZXdQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXZpZXcnKTtcbiAgICB2YXIgaWZQcm9wZXJ0eSA9IHNvdXJjZVRhZy5nZXRBdHRyaWJ1dGUoJ2N2LWlmJyk7XG4gICAgdmFyIGlzUHJvcGVydHkgPSBzb3VyY2VUYWcuZ2V0QXR0cmlidXRlKCdjdi1pcycpO1xuICAgIHZhciBpbnZlcnRlZCA9IGZhbHNlO1xuICAgIHZhciBkZWZpbmVkID0gZmFsc2U7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdmlldycpO1xuICAgIHNvdXJjZVRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LWlmJyk7XG4gICAgc291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtaXMnKTtcbiAgICB2YXIgdmlld0NsYXNzID0gdmlld1Byb3BlcnR5ID8gdGhpcy5zdHJpbmdUb0NsYXNzKHZpZXdQcm9wZXJ0eSkgOiBWaWV3O1xuICAgIGlmIChpZlByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJyEnKSB7XG4gICAgICBpZlByb3BlcnR5ID0gaWZQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICBpbnZlcnRlZCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChpZlByb3BlcnR5LnN1YnN0cigwLCAxKSA9PT0gJz8nKSB7XG4gICAgICBpZlByb3BlcnR5ID0gaWZQcm9wZXJ0eS5zdWJzdHIoMSk7XG4gICAgICBkZWZpbmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIHN1YlRlbXBsYXRlID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBbLi4uc291cmNlVGFnLmNoaWxkTm9kZXNdLmZvckVhY2gobiA9PiBzdWJUZW1wbGF0ZS5hcHBlbmRDaGlsZChuKSk7XG4gICAgdmFyIGJpbmRpbmdWaWV3ID0gdGhpcztcbiAgICB2YXIgaWZEb2MgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgLy8gbGV0IHZpZXcgPSBuZXcgdmlld0NsYXNzKE9iamVjdC5hc3NpZ24oe30sIHRoaXMuYXJncyksIGJpbmRpbmdWaWV3KTtcbiAgICB2YXIgdmlldyA9IG5ldyB2aWV3Q2xhc3ModGhpcy5hcmdzLCBiaW5kaW5nVmlldyk7XG4gICAgdmlldy50YWdzLmJpbmRUbygodiwgaykgPT4gdGhpcy50YWdzW2tdID0gdiwge1xuICAgICAgcmVtb3ZlV2l0aDogdGhpc1xuICAgIH0pO1xuICAgIHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgICB2YXIgcHJveHkgPSBiaW5kaW5nVmlldy5hcmdzO1xuICAgIHZhciBwcm9wZXJ0eSA9IGlmUHJvcGVydHk7XG4gICAgaWYgKGlmUHJvcGVydHkubWF0Y2goL1xcLi8pKSB7XG4gICAgICBbcHJveHksIHByb3BlcnR5XSA9IF9CaW5kYWJsZS5CaW5kYWJsZS5yZXNvbHZlKGJpbmRpbmdWaWV3LmFyZ3MsIGlmUHJvcGVydHksIHRydWUpO1xuICAgIH1cbiAgICB2aWV3LnJlbmRlcihpZkRvYywgbnVsbCwgdGhpcyk7XG4gICAgdmFyIHByb3BlcnR5RGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodiwgaykgPT4ge1xuICAgICAgdmFyIG8gPSB2O1xuICAgICAgaWYgKGRlZmluZWQpIHtcbiAgICAgICAgdiA9IHYgIT09IG51bGwgJiYgdiAhPT0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgaWYgKHYgaW5zdGFuY2VvZiBfQmFnLkJhZykge1xuICAgICAgICB2ID0gdi5saXN0O1xuICAgICAgfVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodikpIHtcbiAgICAgICAgdiA9ICEhdi5sZW5ndGg7XG4gICAgICB9XG4gICAgICBpZiAoaXNQcm9wZXJ0eSAhPT0gbnVsbCkge1xuICAgICAgICB2ID0gbyA9PSBpc1Byb3BlcnR5O1xuICAgICAgfVxuICAgICAgaWYgKGludmVydGVkKSB7XG4gICAgICAgIHYgPSAhdjtcbiAgICAgIH1cbiAgICAgIGlmICh2KSB7XG4gICAgICAgIHRhZy5hcHBlbmRDaGlsZChpZkRvYyk7XG4gICAgICAgIFsuLi5pZkRvYy5jaGlsZE5vZGVzXS5mb3JFYWNoKG5vZGUgPT4gX0RvbS5Eb20ubWFwVGFncyhub2RlLCBmYWxzZSwgKHRhZywgd2Fsa2VyKSA9PiB7XG4gICAgICAgICAgaWYgKCF0YWcubWF0Y2hlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWcuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2N2RG9tQXR0YWNoZWQnLCB7XG4gICAgICAgICAgICB0YXJnZXQ6IHRhZyxcbiAgICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgICB2aWV3OiB2aWV3IHx8IHRoaXMsXG4gICAgICAgICAgICAgIG1haW5WaWV3OiB0aGlzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3Lm5vZGVzLmZvckVhY2gobiA9PiBpZkRvYy5hcHBlbmRDaGlsZChuKSk7XG4gICAgICAgIF9Eb20uRG9tLm1hcFRhZ3MoaWZEb2MsIGZhbHNlLCAodGFnLCB3YWxrZXIpID0+IHtcbiAgICAgICAgICBpZiAoIXRhZy5tYXRjaGVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ldyBDdXN0b21FdmVudCgnY3ZEb21EZXRhY2hlZCcsIHtcbiAgICAgICAgICAgIHRhcmdldDogdGFnLFxuICAgICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICAgIHZpZXc6IHZpZXcgfHwgdGhpcyxcbiAgICAgICAgICAgICAgbWFpblZpZXc6IHRoaXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAgY2hpbGRyZW46IEFycmF5LmlzQXJyYXkocHJveHlbcHJvcGVydHldKVxuICAgIH0pO1xuXG4gICAgLy8gY29uc3QgcHJvcGVydHlEZWJpbmQgPSB0aGlzLmFyZ3MuYmluZENoYWluKHByb3BlcnR5LCBvblVwZGF0ZSk7XG5cbiAgICBiaW5kaW5nVmlldy5vblJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG5cbiAgICAvLyBjb25zdCBkZWJpbmRBID0gdGhpcy5hcmdzLmJpbmRUbygodixrLHQsZCkgPT4ge1xuICAgIC8vIFx0aWYoayA9PT0gJ19pZCcpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdHJldHVybjtcbiAgICAvLyBcdH1cblxuICAgIC8vIFx0aWYoIWQpXG4gICAgLy8gXHR7XG4gICAgLy8gXHRcdHZpZXcuYXJnc1trXSA9IHY7XG4gICAgLy8gXHR9XG4gICAgLy8gXHRlbHNlIGlmKGsgaW4gdmlldy5hcmdzKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRkZWxldGUgdmlldy5hcmdzW2tdO1xuICAgIC8vIFx0fVxuXG4gICAgLy8gfSk7XG5cbiAgICAvLyBjb25zdCBkZWJpbmRCID0gdmlldy5hcmdzLmJpbmRUbygodixrLHQsZCxwKSA9PiB7XG4gICAgLy8gXHRpZihrID09PSAnX2lkJyB8fCBTdHJpbmcoaykuc3Vic3RyaW5nKDAsMykgPT09ICdfX18nKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRyZXR1cm47XG4gICAgLy8gXHR9XG5cbiAgICAvLyBcdGlmKGsgaW4gdGhpcy5hcmdzKVxuICAgIC8vIFx0e1xuICAgIC8vIFx0XHRpZighZClcbiAgICAvLyBcdFx0e1xuICAgIC8vIFx0XHRcdHRoaXMuYXJnc1trXSA9IHY7XG4gICAgLy8gXHRcdH1cbiAgICAvLyBcdFx0ZWxzZVxuICAgIC8vIFx0XHR7XG4gICAgLy8gXHRcdFx0ZGVsZXRlIHRoaXMuYXJnc1trXTtcbiAgICAvLyBcdFx0fVxuICAgIC8vIFx0fVxuICAgIC8vIH0pO1xuXG4gICAgdmFyIHZpZXdEZWJpbmQgPSAoKSA9PiB7XG4gICAgICBwcm9wZXJ0eURlYmluZCgpO1xuICAgICAgLy8gZGViaW5kQSgpO1xuICAgICAgLy8gZGViaW5kQigpO1xuICAgICAgYmluZGluZ1ZpZXcuX29uUmVtb3ZlLnJlbW92ZShwcm9wZXJ0eURlYmluZCk7XG4gICAgICAvLyBiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKGJpbmRhYmxlRGViaW5kKTtcbiAgICB9O1xuICAgIGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHZpZXdEZWJpbmQpO1xuICAgIHRoaXMub25SZW1vdmUoKCkgPT4ge1xuICAgICAgLy8gZGViaW5kQSgpO1xuICAgICAgLy8gZGViaW5kQigpO1xuICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgIGlmIChiaW5kaW5nVmlldyAhPT0gdGhpcykge1xuICAgICAgICBiaW5kaW5nVmlldy5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGFnO1xuICB9XG5cbiAgLy8gY29tcGlsZUlmVGFnKHNvdXJjZVRhZylcbiAgLy8ge1xuICAvLyBcdGxldCBpZlByb3BlcnR5ID0gc291cmNlVGFnLmdldEF0dHJpYnV0ZSgnY3YtaWYnKTtcbiAgLy8gXHRsZXQgaW52ZXJ0ZWQgICA9IGZhbHNlO1xuXG4gIC8vIFx0c291cmNlVGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtaWYnKTtcblxuICAvLyBcdGlmKGlmUHJvcGVydHkuc3Vic3RyKDAsIDEpID09PSAnIScpXG4gIC8vIFx0e1xuICAvLyBcdFx0aWZQcm9wZXJ0eSA9IGlmUHJvcGVydHkuc3Vic3RyKDEpO1xuICAvLyBcdFx0aW52ZXJ0ZWQgICA9IHRydWU7XG4gIC8vIFx0fVxuXG4gIC8vIFx0Y29uc3Qgc3ViVGVtcGxhdGUgPSBuZXcgRG9jdW1lbnRGcmFnbWVudDtcblxuICAvLyBcdFsuLi5zb3VyY2VUYWcuY2hpbGROb2Rlc10uZm9yRWFjaChcbiAgLy8gXHRcdG4gPT4gc3ViVGVtcGxhdGUuYXBwZW5kQ2hpbGQobi5jbG9uZU5vZGUodHJ1ZSkpXG4gIC8vIFx0KTtcblxuICAvLyBcdHJldHVybiAoYmluZGluZ1ZpZXcpID0+IHtcblxuICAvLyBcdFx0Y29uc3QgdGFnID0gc291cmNlVGFnLmNsb25lTm9kZSgpO1xuXG4gIC8vIFx0XHRjb25zdCBpZkRvYyA9IG5ldyBEb2N1bWVudEZyYWdtZW50O1xuXG4gIC8vIFx0XHRsZXQgdmlldyA9IG5ldyBWaWV3KHt9LCBiaW5kaW5nVmlldyk7XG5cbiAgLy8gXHRcdHZpZXcudGVtcGxhdGUgPSBzdWJUZW1wbGF0ZTtcbiAgLy8gXHRcdC8vIHZpZXcucGFyZW50ICAgPSBiaW5kaW5nVmlldztcblxuICAvLyBcdFx0YmluZGluZ1ZpZXcuc3luY0JpbmQodmlldyk7XG5cbiAgLy8gXHRcdGxldCBwcm94eSAgICA9IGJpbmRpbmdWaWV3LmFyZ3M7XG4gIC8vIFx0XHRsZXQgcHJvcGVydHkgPSBpZlByb3BlcnR5O1xuXG4gIC8vIFx0XHRpZihpZlByb3BlcnR5Lm1hdGNoKC9cXC4vKSlcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0W3Byb3h5LCBwcm9wZXJ0eV0gPSBCaW5kYWJsZS5yZXNvbHZlKFxuICAvLyBcdFx0XHRcdGJpbmRpbmdWaWV3LmFyZ3NcbiAgLy8gXHRcdFx0XHQsIGlmUHJvcGVydHlcbiAgLy8gXHRcdFx0XHQsIHRydWVcbiAgLy8gXHRcdFx0KTtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0bGV0IGhhc1JlbmRlcmVkID0gZmFsc2U7XG5cbiAgLy8gXHRcdGNvbnN0IHByb3BlcnR5RGViaW5kID0gcHJveHkuYmluZFRvKHByb3BlcnR5LCAodixrKSA9PiB7XG5cbiAgLy8gXHRcdFx0aWYoIWhhc1JlbmRlcmVkKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0Y29uc3QgcmVuZGVyRG9jID0gKGJpbmRpbmdWaWV3LmFyZ3NbcHJvcGVydHldIHx8IGludmVydGVkKVxuICAvLyBcdFx0XHRcdFx0PyB0YWcgOiBpZkRvYztcblxuICAvLyBcdFx0XHRcdHZpZXcucmVuZGVyKHJlbmRlckRvYyk7XG5cbiAgLy8gXHRcdFx0XHRoYXNSZW5kZXJlZCA9IHRydWU7XG5cbiAgLy8gXHRcdFx0XHRyZXR1cm47XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRpZihBcnJheS5pc0FycmF5KHYpKVxuICAvLyBcdFx0XHR7XG4gIC8vIFx0XHRcdFx0diA9ICEhdi5sZW5ndGg7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0XHRpZihpbnZlcnRlZClcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHYgPSAhdjtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHRcdGlmKHYpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHR0YWcuYXBwZW5kQ2hpbGQoaWZEb2MpO1xuICAvLyBcdFx0XHR9XG4gIC8vIFx0XHRcdGVsc2VcbiAgLy8gXHRcdFx0e1xuICAvLyBcdFx0XHRcdHZpZXcubm9kZXMuZm9yRWFjaChuPT5pZkRvYy5hcHBlbmRDaGlsZChuKSk7XG4gIC8vIFx0XHRcdH1cblxuICAvLyBcdFx0fSk7XG5cbiAgLy8gXHRcdC8vIGxldCBjbGVhbmVyID0gYmluZGluZ1ZpZXc7XG5cbiAgLy8gXHRcdC8vIHdoaWxlKGNsZWFuZXIucGFyZW50KVxuICAvLyBcdFx0Ly8ge1xuICAvLyBcdFx0Ly8gXHRjbGVhbmVyID0gY2xlYW5lci5wYXJlbnQ7XG4gIC8vIFx0XHQvLyB9XG5cbiAgLy8gXHRcdGJpbmRpbmdWaWV3Lm9uUmVtb3ZlKHByb3BlcnR5RGViaW5kKTtcblxuICAvLyBcdFx0bGV0IGJpbmRhYmxlRGViaW5kID0gKCkgPT4ge1xuXG4gIC8vIFx0XHRcdGlmKCFwcm94eS5pc0JvdW5kKCkpXG4gIC8vIFx0XHRcdHtcbiAgLy8gXHRcdFx0XHRCaW5kYWJsZS5jbGVhckJpbmRpbmdzKHByb3h5KTtcbiAgLy8gXHRcdFx0fVxuXG4gIC8vIFx0XHR9O1xuXG4gIC8vIFx0XHRsZXQgdmlld0RlYmluZCA9ICgpPT57XG4gIC8vIFx0XHRcdHByb3BlcnR5RGViaW5kKCk7XG4gIC8vIFx0XHRcdGJpbmRhYmxlRGViaW5kKCk7XG4gIC8vIFx0XHRcdGJpbmRpbmdWaWV3Ll9vblJlbW92ZS5yZW1vdmUocHJvcGVydHlEZWJpbmQpO1xuICAvLyBcdFx0XHRiaW5kaW5nVmlldy5fb25SZW1vdmUucmVtb3ZlKGJpbmRhYmxlRGViaW5kKTtcbiAgLy8gXHRcdH07XG5cbiAgLy8gXHRcdHZpZXcub25SZW1vdmUodmlld0RlYmluZCk7XG5cbiAgLy8gXHRcdHJldHVybiB0YWc7XG4gIC8vIFx0fTtcbiAgLy8gfVxuXG4gIG1hcFRlbXBsYXRlVGFnKHRhZykge1xuICAgIC8vIGNvbnN0IHRlbXBsYXRlTmFtZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG5cbiAgICAvLyB0YWcucmVtb3ZlQXR0cmlidXRlKCdjdi10ZW1wbGF0ZScpO1xuXG4gICAgLy8gdGhpcy50ZW1wbGF0ZXNbIHRlbXBsYXRlTmFtZSBdID0gdGFnLnRhZ05hbWUgPT09ICdURU1QTEFURSdcbiAgICAvLyBcdD8gdGFnLmNsb25lTm9kZSh0cnVlKS5jb250ZW50XG4gICAgLy8gXHQ6IG5ldyBEb2N1bWVudEZyYWdtZW50KHRhZy5pbm5lckhUTUwpO1xuXG4gICAgdmFyIHRlbXBsYXRlTmFtZSA9IHRhZy5nZXRBdHRyaWJ1dGUoJ2N2LXRlbXBsYXRlJyk7XG4gICAgdGFnLnJlbW92ZUF0dHJpYnV0ZSgnY3YtdGVtcGxhdGUnKTtcbiAgICB2YXIgc291cmNlID0gdGFnLmlubmVySFRNTDtcbiAgICBpZiAoIVZpZXcudGVtcGxhdGVzLmhhcyhzb3VyY2UpKSB7XG4gICAgICBWaWV3LnRlbXBsYXRlcy5zZXQoc291cmNlLCBkb2N1bWVudC5jcmVhdGVSYW5nZSgpLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCh0YWcuaW5uZXJIVE1MKSk7XG4gICAgfVxuICAgIHRoaXMudGVtcGxhdGVzW3RlbXBsYXRlTmFtZV0gPSBWaWV3LnRlbXBsYXRlcy5nZXQoc291cmNlKTtcbiAgICB0aGlzLnBvc3RNYXBwaW5nLmFkZCgoKSA9PiB0YWcucmVtb3ZlKCkpO1xuICAgIHJldHVybiB0YWc7XG4gIH1cbiAgbWFwU2xvdFRhZyh0YWcpIHtcbiAgICB2YXIgdGVtcGxhdGVOYW1lID0gdGFnLmdldEF0dHJpYnV0ZSgnY3Ytc2xvdCcpO1xuICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGVzW3RlbXBsYXRlTmFtZV07XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgIHRlbXBsYXRlID0gcGFyZW50LnRlbXBsYXRlc1t0ZW1wbGF0ZU5hbWVdO1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50O1xuICAgICAgfVxuICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBUZW1wbGF0ZSAke3RlbXBsYXRlTmFtZX0gbm90IGZvdW5kLmApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRhZy5yZW1vdmVBdHRyaWJ1dGUoJ2N2LXNsb3QnKTtcbiAgICB3aGlsZSAodGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRhZy5maXJzdENoaWxkLnJlbW92ZSgpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHRlbXBsYXRlID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKCFWaWV3LnRlbXBsYXRlcy5oYXModGVtcGxhdGUpKSB7XG4gICAgICAgIFZpZXcudGVtcGxhdGVzLnNldCh0ZW1wbGF0ZSwgZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQodGVtcGxhdGUpKTtcbiAgICAgIH1cbiAgICAgIHRlbXBsYXRlID0gVmlldy50ZW1wbGF0ZXMuZ2V0KHRlbXBsYXRlKTtcbiAgICB9XG4gICAgdGFnLmFwcGVuZENoaWxkKHRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgcmV0dXJuIHRhZztcbiAgfVxuXG4gIC8vIHN5bmNCaW5kKHN1YlZpZXcpXG4gIC8vIHtcbiAgLy8gXHRsZXQgZGViaW5kQSA9IHRoaXMuYXJncy5iaW5kVG8oKHYsayx0LGQpPT57XG4gIC8vIFx0XHRpZihrID09PSAnX2lkJylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0cmV0dXJuO1xuICAvLyBcdFx0fVxuXG4gIC8vIFx0XHRpZihzdWJWaWV3LmFyZ3Nba10gIT09IHYpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHN1YlZpZXcuYXJnc1trXSA9IHY7XG4gIC8vIFx0XHR9XG4gIC8vIFx0fSk7XG5cbiAgLy8gXHRsZXQgZGViaW5kQiA9IHN1YlZpZXcuYXJncy5iaW5kVG8oKHYsayx0LGQscCk9PntcblxuICAvLyBcdFx0aWYoayA9PT0gJ19pZCcpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHJldHVybjtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0bGV0IG5ld1JlZiA9IHY7XG4gIC8vIFx0XHRsZXQgb2xkUmVmID0gcDtcblxuICAvLyBcdFx0aWYobmV3UmVmIGluc3RhbmNlb2YgVmlldylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0bmV3UmVmID0gbmV3UmVmLl9fX3JlZl9fXztcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYob2xkUmVmIGluc3RhbmNlb2YgVmlldylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0b2xkUmVmID0gb2xkUmVmLl9fX3JlZl9fXztcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYobmV3UmVmICE9PSBvbGRSZWYgJiYgb2xkUmVmIGluc3RhbmNlb2YgVmlldylcbiAgLy8gXHRcdHtcbiAgLy8gXHRcdFx0cC5yZW1vdmUoKTtcbiAgLy8gXHRcdH1cblxuICAvLyBcdFx0aWYoayBpbiB0aGlzLmFyZ3MpXG4gIC8vIFx0XHR7XG4gIC8vIFx0XHRcdHRoaXMuYXJnc1trXSA9IHY7XG4gIC8vIFx0XHR9XG5cbiAgLy8gXHR9KTtcblxuICAvLyBcdHRoaXMub25SZW1vdmUoZGViaW5kQSk7XG4gIC8vIFx0dGhpcy5vblJlbW92ZShkZWJpbmRCKTtcblxuICAvLyBcdHN1YlZpZXcub25SZW1vdmUoKCk9PntcbiAgLy8gXHRcdHRoaXMuX29uUmVtb3ZlLnJlbW92ZShkZWJpbmRBKTtcbiAgLy8gXHRcdHRoaXMuX29uUmVtb3ZlLnJlbW92ZShkZWJpbmRCKTtcbiAgLy8gXHR9KTtcbiAgLy8gfVxuXG4gIHBvc3RSZW5kZXIocGFyZW50Tm9kZSkge31cbiAgYXR0YWNoZWQocGFyZW50Tm9kZSkge31cbiAgaW50ZXJwb2xhdGFibGUoc3RyKSB7XG4gICAgcmV0dXJuICEhU3RyaW5nKHN0cikubWF0Y2godGhpcy5pbnRlcnBvbGF0ZVJlZ2V4KTtcbiAgfVxuICBzdGF0aWMgdXVpZCgpIHtcbiAgICByZXR1cm4gbmV3IF9VdWlkLlV1aWQoKTtcbiAgfVxuICByZW1vdmUobm93ID0gZmFsc2UpIHtcbiAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JlbW92ZScsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICB2aWV3OiB0aGlzXG4gICAgICB9LFxuICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgIH0pKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVtb3ZlciA9ICgpID0+IHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy50YWdzKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMudGFnc1tpXSkpIHtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0gJiYgdGhpcy50YWdzW2ldLmZvckVhY2godCA9PiB0LnJlbW92ZSgpKTtcbiAgICAgICAgICB0aGlzLnRhZ3NbaV0uc3BsaWNlKDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudGFnc1tpXSAmJiB0aGlzLnRhZ3NbaV0ucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy50YWdzW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaTMgaW4gdGhpcy5ub2Rlcykge1xuICAgICAgICB0aGlzLm5vZGVzW19pM10gJiYgdGhpcy5ub2Rlc1tfaTNdLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjdkRvbURldGFjaGVkJykpO1xuICAgICAgICB0aGlzLm5vZGVzW19pM10gJiYgdGhpcy5ub2Rlc1tfaTNdLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLm5vZGVzW19pM10gPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICB0aGlzLm5vZGVzLnNwbGljZSgwKTtcbiAgICAgIHRoaXMuZmlyc3ROb2RlID0gdGhpcy5sYXN0Tm9kZSA9IHVuZGVmaW5lZDtcbiAgICB9O1xuICAgIGlmIChub3cpIHtcbiAgICAgIHJlbW92ZXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbW92ZXIpO1xuICAgIH1cbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fb25SZW1vdmUuaXRlbXMoKTtcbiAgICBmb3IgKHZhciBjYWxsYmFjayBvZiBjYWxsYmFja3MpIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB0aGlzLl9vblJlbW92ZS5yZW1vdmUoY2FsbGJhY2spO1xuICAgIH1cbiAgICBmb3IgKHZhciBjbGVhbnVwIG9mIHRoaXMuY2xlYW51cCkge1xuICAgICAgY2xlYW51cCAmJiBjbGVhbnVwKCk7XG4gICAgfVxuICAgIHRoaXMuY2xlYW51cC5sZW5ndGggPSAwO1xuICAgIGZvciAodmFyIFt0YWcsIHZpZXdMaXN0XSBvZiB0aGlzLnZpZXdMaXN0cykge1xuICAgICAgdmlld0xpc3QucmVtb3ZlKCk7XG4gICAgfVxuICAgIHRoaXMudmlld0xpc3RzLmNsZWFyKCk7XG4gICAgZm9yICh2YXIgW19jYWxsYmFjazUsIHRpbWVvdXRdIG9mIHRoaXMudGltZW91dHMpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0LnRpbWVvdXQpO1xuICAgICAgdGhpcy50aW1lb3V0cy5kZWxldGUodGltZW91dC50aW1lb3V0KTtcbiAgICB9XG4gICAgZm9yICh2YXIgaW50ZXJ2YWwgb2YgdGhpcy5pbnRlcnZhbHMpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgIH1cbiAgICB0aGlzLmludGVydmFscy5sZW5ndGggPSAwO1xuICAgIGZvciAodmFyIGZyYW1lIG9mIHRoaXMuZnJhbWVzKSB7XG4gICAgICBmcmFtZSgpO1xuICAgIH1cbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSAwO1xuICAgIHRoaXMucHJlUnVsZVNldC5wdXJnZSgpO1xuICAgIHRoaXMucnVsZVNldC5wdXJnZSgpO1xuICAgIHRoaXMucmVtb3ZlZCA9IHRydWU7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVtb3ZlZCcsIHtcbiAgICAgIGRldGFpbDoge1xuICAgICAgICB2aWV3OiB0aGlzXG4gICAgICB9LFxuICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgIH0pKTtcbiAgfVxuICBmaW5kVGFnKHNlbGVjdG9yKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLm5vZGVzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdm9pZCAwO1xuICAgICAgaWYgKCF0aGlzLm5vZGVzW2ldLnF1ZXJ5U2VsZWN0b3IpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5ub2Rlc1tpXS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IF9UYWcuVGFnKHRoaXMubm9kZXNbaV0sIHRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHQgPSB0aGlzLm5vZGVzW2ldLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBuZXcgX1RhZy5UYWcocmVzdWx0LCB0aGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGZpbmRUYWdzKHNlbGVjdG9yKSB7XG4gICAgdmFyIHRvcExldmVsID0gdGhpcy5ub2Rlcy5maWx0ZXIobiA9PiBuLm1hdGNoZXMgJiYgbi5tYXRjaGVzKHNlbGVjdG9yKSk7XG4gICAgdmFyIHN1YkxldmVsID0gdGhpcy5ub2Rlcy5maWx0ZXIobiA9PiBuLnF1ZXJ5U2VsZWN0b3JBbGwpLm1hcChuID0+IFsuLi5uLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpXSkuZmxhdCgpLm1hcChuID0+IG5ldyBfVGFnLlRhZyhuLCB0aGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcykpIHx8IFtdO1xuICAgIHJldHVybiB0b3BMZXZlbC5jb25jYXQoc3ViTGV2ZWwpO1xuICB9XG4gIG9uUmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgaWYgKGNhbGxiYWNrIGluc3RhbmNlb2YgRXZlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fb25SZW1vdmUuYWRkKGNhbGxiYWNrKTtcbiAgfVxuICB1cGRhdGUoKSB7fVxuICBiZWZvcmVVcGRhdGUoYXJncykge31cbiAgYWZ0ZXJVcGRhdGUoYXJncykge31cbiAgc3RyaW5nVHJhbnNmb3JtZXIobWV0aG9kcykge1xuICAgIHJldHVybiB4ID0+IHtcbiAgICAgIGZvciAodmFyIG0gaW4gbWV0aG9kcykge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIG1ldGhvZCA9IG1ldGhvZHNbbV07XG4gICAgICAgIHdoaWxlIChwYXJlbnQgJiYgIXBhcmVudFttZXRob2RdKSB7XG4gICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB4ID0gcGFyZW50W21ldGhvZHNbbV1dKHgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHg7XG4gICAgfTtcbiAgfVxuICBzdHJpbmdUb0NsYXNzKHJlZkNsYXNzbmFtZSkge1xuICAgIGlmIChWaWV3LnJlZkNsYXNzZXMuaGFzKHJlZkNsYXNzbmFtZSkpIHtcbiAgICAgIHJldHVybiBWaWV3LnJlZkNsYXNzZXMuZ2V0KHJlZkNsYXNzbmFtZSk7XG4gICAgfVxuICAgIHZhciByZWZDbGFzc1NwbGl0ID0gcmVmQ2xhc3NuYW1lLnNwbGl0KCcvJyk7XG4gICAgdmFyIHJlZlNob3J0Q2xhc3MgPSByZWZDbGFzc1NwbGl0W3JlZkNsYXNzU3BsaXQubGVuZ3RoIC0gMV07XG4gICAgdmFyIHJlZkNsYXNzID0gcmVxdWlyZShyZWZDbGFzc25hbWUpO1xuICAgIFZpZXcucmVmQ2xhc3Nlcy5zZXQocmVmQ2xhc3NuYW1lLCByZWZDbGFzc1tyZWZTaG9ydENsYXNzXSk7XG4gICAgcmV0dXJuIHJlZkNsYXNzW3JlZlNob3J0Q2xhc3NdO1xuICB9XG4gIHByZXZlbnRQYXJzaW5nKG5vZGUpIHtcbiAgICBub2RlW2RvbnRQYXJzZV0gPSB0cnVlO1xuICB9XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLm5vZGVzLm1hcChuID0+IG4ub3V0ZXJIVE1MKS5qb2luKCcgJyk7XG4gIH1cbiAgbGlzdGVuKG5vZGUsIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBvcHRpb25zID0gY2FsbGJhY2s7XG4gICAgICBjYWxsYmFjayA9IGV2ZW50TmFtZTtcbiAgICAgIGV2ZW50TmFtZSA9IG5vZGU7XG4gICAgICBub2RlID0gdGhpcztcbiAgICB9XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBWaWV3KSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0ZW4obm9kZS5ub2RlcywgZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5tYXAobiA9PiB0aGlzLmxpc3RlbihuLCBldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSk7XG4gICAgICAvLyAuZm9yRWFjaChyID0+IHIoKSk7XG4gICAgfVxuICAgIGlmIChub2RlIGluc3RhbmNlb2YgX1RhZy5UYWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpc3Rlbihub2RlLmVsZW1lbnQsIGV2ZW50TmFtZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIH1cbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgb3B0aW9ucyk7XG4gICAgdmFyIHJlbW92ZSA9ICgpID0+IG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB2YXIgcmVtb3ZlciA9ICgpID0+IHtcbiAgICAgIHJlbW92ZSgpO1xuICAgICAgcmVtb3ZlID0gKCkgPT4ge307XG4gICAgfTtcbiAgICB0aGlzLm9uUmVtb3ZlKCgpID0+IHJlbW92ZXIoKSk7XG4gICAgcmV0dXJuIHJlbW92ZXI7XG4gIH1cbiAgZGV0YWNoKCkge1xuICAgIGZvciAodmFyIG4gaW4gdGhpcy5ub2Rlcykge1xuICAgICAgdGhpcy5ub2Rlc1tuXS5yZW1vdmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9kZXM7XG4gIH1cbn1cbmV4cG9ydHMuVmlldyA9IFZpZXc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVmlldywgJ3RlbXBsYXRlcycsIHtcbiAgdmFsdWU6IG5ldyBNYXAoKVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVmlldywgJ3JlZkNsYXNzZXMnLCB7XG4gIHZhbHVlOiBuZXcgTWFwKClcbn0pO1xuICB9KSgpO1xufSk7IiwiXG5yZXF1aXJlLnJlZ2lzdGVyKFwiY3VydmF0dXJlL2Jhc2UvVmlld0xpc3QuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlZpZXdMaXN0ID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuL0JpbmRhYmxlXCIpO1xudmFyIF9TZXRNYXAgPSByZXF1aXJlKFwiLi9TZXRNYXBcIik7XG52YXIgX0JhZyA9IHJlcXVpcmUoXCIuL0JhZ1wiKTtcbmNsYXNzIFZpZXdMaXN0IHtcbiAgY29uc3RydWN0b3IodGVtcGxhdGUsIHN1YlByb3BlcnR5LCBsaXN0LCBwYXJlbnQsIGtleVByb3BlcnR5ID0gbnVsbCwgdmlld0NsYXNzID0gbnVsbCkge1xuICAgIHRoaXMucmVtb3ZlZCA9IGZhbHNlO1xuICAgIHRoaXMuYXJncyA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgdGhpcy5hcmdzLnZhbHVlID0gX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2VCaW5kYWJsZShsaXN0IHx8IE9iamVjdC5jcmVhdGUobnVsbCkpO1xuICAgIHRoaXMuc3ViQXJncyA9IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlQmluZGFibGUoT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgdGhpcy52aWV3cyA9IFtdO1xuICAgIHRoaXMuY2xlYW51cCA9IFtdO1xuICAgIHRoaXMudmlld0NsYXNzID0gdmlld0NsYXNzO1xuICAgIHRoaXMuX29uUmVtb3ZlID0gbmV3IF9CYWcuQmFnKCk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHRoaXMuc3ViUHJvcGVydHkgPSBzdWJQcm9wZXJ0eTtcbiAgICB0aGlzLmtleVByb3BlcnR5ID0ga2V5UHJvcGVydHk7XG4gICAgdGhpcy50YWcgPSBudWxsO1xuICAgIHRoaXMuZG93bkRlYmluZCA9IFtdO1xuICAgIHRoaXMudXBEZWJpbmQgPSBbXTtcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMudmlld0NvdW50ID0gMDtcbiAgICB0aGlzLnJlbmRlcmVkID0gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KSA9PiB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3JlbmRlckNvbXBsZXRlJywge1xuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgdmFsdWU6IGFjY2VwdFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy53aWxsUmVSZW5kZXIgPSBmYWxzZTtcbiAgICB0aGlzLmFyZ3MuX19fYmVmb3JlKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICBpZiAoZSA9PSAnYmluZFRvJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLnBhdXNlZCA9IHRydWU7XG4gICAgfSk7XG4gICAgdGhpcy5hcmdzLl9fX2FmdGVyKCh0LCBlLCBzLCBvLCBhKSA9PiB7XG4gICAgICBpZiAoZSA9PSAnYmluZFRvJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLnBhdXNlZCA9IHMubGVuZ3RoID4gMTtcbiAgICAgIHRoaXMucmVSZW5kZXIoKTtcbiAgICB9KTtcbiAgICB2YXIgZGViaW5kID0gdGhpcy5hcmdzLnZhbHVlLmJpbmRUbygodiwgaywgdCwgZCkgPT4ge1xuICAgICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBrayA9IGs7XG4gICAgICBpZiAodHlwZW9mIGsgPT09ICdzeW1ib2wnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChpc05hTihrKSkge1xuICAgICAgICBrayA9ICdfJyArIGs7XG4gICAgICB9XG4gICAgICBpZiAoZCkge1xuICAgICAgICBpZiAodGhpcy52aWV3c1tra10pIHtcbiAgICAgICAgICB0aGlzLnZpZXdzW2trXS5yZW1vdmUodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHRoaXMudmlld3Nba2tdO1xuICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgICAgICBpZiAoIXRoaXMudmlld3NbaV0pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNOYU4oaSkpIHtcbiAgICAgICAgICAgIHRoaXMudmlld3NbaV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IGkuc3Vic3RyKDEpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudmlld3NbaV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IGk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMudmlld3Nba2tdKSB7XG4gICAgICAgIGlmICghdGhpcy52aWV3Q291bnQpIHtcbiAgICAgICAgICB0aGlzLnJlUmVuZGVyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRoaXMud2lsbFJlUmVuZGVyID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy53aWxsUmVSZW5kZXIgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICAgICAgICB0aGlzLndpbGxSZVJlbmRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICB0aGlzLnJlUmVuZGVyKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpcy52aWV3c1tra10gJiYgdGhpcy52aWV3c1tra10uYXJncykge1xuICAgICAgICB0aGlzLnZpZXdzW2trXS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gaztcbiAgICAgICAgdGhpcy52aWV3c1tra10uYXJnc1t0aGlzLnN1YlByb3BlcnR5XSA9IHY7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAgd2FpdDogMFxuICAgIH0pO1xuICAgIHRoaXMuX29uUmVtb3ZlLmFkZChkZWJpbmQpO1xuICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyh0aGlzKTtcbiAgfVxuICByZW5kZXIodGFnKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgcmVuZGVycyA9IFtdO1xuICAgIHZhciBfbG9vcCA9IGZ1bmN0aW9uICh2aWV3KSB7XG4gICAgICB2aWV3LnZpZXdMaXN0ID0gX3RoaXM7XG4gICAgICB2aWV3LnJlbmRlcih0YWcsIG51bGwsIF90aGlzLnBhcmVudCk7XG4gICAgICByZW5kZXJzLnB1c2godmlldy5yZW5kZXJlZC50aGVuKCgpID0+IHZpZXcpKTtcbiAgICB9O1xuICAgIGZvciAodmFyIHZpZXcgb2YgdGhpcy52aWV3cykge1xuICAgICAgX2xvb3Aodmlldyk7XG4gICAgfVxuICAgIHRoaXMudGFnID0gdGFnO1xuICAgIFByb21pc2UuYWxsKHJlbmRlcnMpLnRoZW4odmlld3MgPT4gdGhpcy5yZW5kZXJDb21wbGV0ZSh2aWV3cykpO1xuICAgIHRoaXMucGFyZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsaXN0UmVuZGVyZWQnLCB7XG4gICAgICBkZXRhaWw6IHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAga2V5OiB0aGlzLnN1YlByb3BlcnR5LFxuICAgICAgICAgIHZhbHVlOiB0aGlzLmFyZ3MudmFsdWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuICByZVJlbmRlcigpIHtcbiAgICB2YXIgX3RoaXMyID0gdGhpcztcbiAgICBpZiAodGhpcy5wYXVzZWQgfHwgIXRoaXMudGFnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB2aWV3cyA9IFtdO1xuICAgIHZhciBleGlzdGluZ1ZpZXdzID0gbmV3IF9TZXRNYXAuU2V0TWFwKCk7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICB2YXIgdmlldyA9IHRoaXMudmlld3NbaV07XG4gICAgICBpZiAodmlldyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZpZXdzW2ldID0gdmlldztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgcmF3VmFsdWUgPSB2aWV3LmFyZ3NbdGhpcy5zdWJQcm9wZXJ0eV07XG4gICAgICBleGlzdGluZ1ZpZXdzLmFkZChyYXdWYWx1ZSwgdmlldyk7XG4gICAgICB2aWV3c1tpXSA9IHZpZXc7XG4gICAgfVxuICAgIHZhciBmaW5hbFZpZXdzID0gW107XG4gICAgdmFyIGZpbmFsVmlld1NldCA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLmRvd25EZWJpbmQubGVuZ3RoICYmIHRoaXMuZG93bkRlYmluZC5mb3JFYWNoKGQgPT4gZCAmJiBkKCkpO1xuICAgIHRoaXMudXBEZWJpbmQubGVuZ3RoICYmIHRoaXMudXBEZWJpbmQuZm9yRWFjaChkID0+IGQgJiYgZCgpKTtcbiAgICB0aGlzLnVwRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5kb3duRGViaW5kLmxlbmd0aCA9IDA7XG4gICAgdmFyIG1pbktleSA9IEluZmluaXR5O1xuICAgIHZhciBhbnRlTWluS2V5ID0gSW5maW5pdHk7XG4gICAgdmFyIF9sb29wMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgICAgdmFyIGsgPSBfaTtcbiAgICAgIGlmIChpc05hTihrKSkge1xuICAgICAgICBrID0gJ18nICsgX2k7XG4gICAgICB9IGVsc2UgaWYgKFN0cmluZyhrKS5sZW5ndGgpIHtcbiAgICAgICAgayA9IE51bWJlcihrKTtcbiAgICAgIH1cbiAgICAgIGlmIChfdGhpczIuYXJncy52YWx1ZVtfaV0gIT09IHVuZGVmaW5lZCAmJiBleGlzdGluZ1ZpZXdzLmhhcyhfdGhpczIuYXJncy52YWx1ZVtfaV0pKSB7XG4gICAgICAgIHZhciBleGlzdGluZ1ZpZXcgPSBleGlzdGluZ1ZpZXdzLmdldE9uZShfdGhpczIuYXJncy52YWx1ZVtfaV0pO1xuICAgICAgICBpZiAoZXhpc3RpbmdWaWV3KSB7XG4gICAgICAgICAgZXhpc3RpbmdWaWV3LmFyZ3NbX3RoaXMyLmtleVByb3BlcnR5XSA9IF9pO1xuICAgICAgICAgIGZpbmFsVmlld3Nba10gPSBleGlzdGluZ1ZpZXc7XG4gICAgICAgICAgZmluYWxWaWV3U2V0LmFkZChleGlzdGluZ1ZpZXcpO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoIWlzTmFOKGspKSB7XG4gICAgICAgICAgICBtaW5LZXkgPSBNYXRoLm1pbihtaW5LZXksIGspO1xuICAgICAgICAgICAgayA+IDAgJiYgKGFudGVNaW5LZXkgPSBNYXRoLm1pbihhbnRlTWluS2V5LCBrKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV4aXN0aW5nVmlld3MucmVtb3ZlKF90aGlzMi5hcmdzLnZhbHVlW19pXSwgZXhpc3RpbmdWaWV3KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICB2YXIgdmlld0FyZ3MgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICB2YXIgX3ZpZXcgPSBmaW5hbFZpZXdzW2tdID0gbmV3IF90aGlzMi52aWV3Q2xhc3Modmlld0FyZ3MsIF90aGlzMi5wYXJlbnQpO1xuICAgICAgICBpZiAoIWlzTmFOKGspKSB7XG4gICAgICAgICAgbWluS2V5ID0gTWF0aC5taW4obWluS2V5LCBrKTtcbiAgICAgICAgICBrID4gMCAmJiAoYW50ZU1pbktleSA9IE1hdGgubWluKGFudGVNaW5LZXksIGspKTtcbiAgICAgICAgfVxuICAgICAgICBmaW5hbFZpZXdzW2tdLnRlbXBsYXRlID0gX3RoaXMyLnRlbXBsYXRlO1xuICAgICAgICBmaW5hbFZpZXdzW2tdLnZpZXdMaXN0ID0gX3RoaXMyO1xuICAgICAgICBmaW5hbFZpZXdzW2tdLmFyZ3NbX3RoaXMyLmtleVByb3BlcnR5XSA9IF9pO1xuICAgICAgICBmaW5hbFZpZXdzW2tdLmFyZ3NbX3RoaXMyLnN1YlByb3BlcnR5XSA9IF90aGlzMi5hcmdzLnZhbHVlW19pXTtcbiAgICAgICAgX3RoaXMyLnVwRGViaW5kW2tdID0gdmlld0FyZ3MuYmluZFRvKF90aGlzMi5zdWJQcm9wZXJ0eSwgKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICB2YXIgaW5kZXggPSB2aWV3QXJnc1tfdGhpczIua2V5UHJvcGVydHldO1xuICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICBkZWxldGUgX3RoaXMyLmFyZ3MudmFsdWVbaW5kZXhdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfdGhpczIuYXJncy52YWx1ZVtpbmRleF0gPSB2O1xuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMyLmRvd25EZWJpbmRba10gPSBfdGhpczIuc3ViQXJncy5iaW5kVG8oKHYsIGssIHQsIGQpID0+IHtcbiAgICAgICAgICBpZiAoZCkge1xuICAgICAgICAgICAgZGVsZXRlIHZpZXdBcmdzW2tdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2aWV3QXJnc1trXSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgdXBEZWJpbmQgPSAoKSA9PiB7XG4gICAgICAgICAgX3RoaXMyLnVwRGViaW5kLmZpbHRlcih4ID0+IHgpLmZvckVhY2goZCA9PiBkKCkpO1xuICAgICAgICAgIF90aGlzMi51cERlYmluZC5sZW5ndGggPSAwO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZG93bkRlYmluZCA9ICgpID0+IHtcbiAgICAgICAgICBfdGhpczIuZG93bkRlYmluZC5maWx0ZXIoeCA9PiB4KS5mb3JFYWNoKGQgPT4gZCgpKTtcbiAgICAgICAgICBfdGhpczIuZG93bkRlYmluZC5sZW5ndGggPSAwO1xuICAgICAgICB9O1xuICAgICAgICBfdmlldy5vblJlbW92ZSgoKSA9PiB7XG4gICAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5yZW1vdmUodXBEZWJpbmQpO1xuICAgICAgICAgIF90aGlzMi5fb25SZW1vdmUucmVtb3ZlKGRvd25EZWJpbmQpO1xuICAgICAgICAgIF90aGlzMi51cERlYmluZFtrXSAmJiBfdGhpczIudXBEZWJpbmRba10oKTtcbiAgICAgICAgICBfdGhpczIuZG93bkRlYmluZFtrXSAmJiBfdGhpczIuZG93bkRlYmluZFtrXSgpO1xuICAgICAgICAgIGRlbGV0ZSBfdGhpczIudXBEZWJpbmRba107XG4gICAgICAgICAgZGVsZXRlIF90aGlzMi5kb3duRGViaW5kW2tdO1xuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMyLl9vblJlbW92ZS5hZGQodXBEZWJpbmQpO1xuICAgICAgICBfdGhpczIuX29uUmVtb3ZlLmFkZChkb3duRGViaW5kKTtcbiAgICAgICAgdmlld0FyZ3NbX3RoaXMyLnN1YlByb3BlcnR5XSA9IF90aGlzMi5hcmdzLnZhbHVlW19pXTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZvciAodmFyIF9pIGluIHRoaXMuYXJncy52YWx1ZSkge1xuICAgICAgX2xvb3AyKCk7XG4gICAgfVxuICAgIGZvciAodmFyIF9pMiBpbiB2aWV3cykge1xuICAgICAgaWYgKHZpZXdzW19pMl0gJiYgIWZpbmFsVmlld1NldC5oYXModmlld3NbX2kyXSkpIHtcbiAgICAgICAgdmlld3NbX2kyXS5yZW1vdmUodHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMuYXJncy52YWx1ZSkpIHtcbiAgICAgIHZhciBsb2NhbE1pbiA9IG1pbktleSA9PT0gMCAmJiBmaW5hbFZpZXdzWzFdICE9PSB1bmRlZmluZWQgJiYgZmluYWxWaWV3cy5sZW5ndGggPiAxIHx8IGFudGVNaW5LZXkgPT09IEluZmluaXR5ID8gbWluS2V5IDogYW50ZU1pbktleTtcbiAgICAgIHZhciByZW5kZXJSZWN1cnNlID0gKGkgPSAwKSA9PiB7XG4gICAgICAgIHZhciBpaSA9IGZpbmFsVmlld3MubGVuZ3RoIC0gaSAtIDE7XG4gICAgICAgIHdoaWxlIChpaSA+IGxvY2FsTWluICYmIGZpbmFsVmlld3NbaWldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpaS0tO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpaSA8IGxvY2FsTWluKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaW5hbFZpZXdzW2lpXSA9PT0gdGhpcy52aWV3c1tpaV0pIHtcbiAgICAgICAgICBpZiAoZmluYWxWaWV3c1tpaV0gJiYgIWZpbmFsVmlld3NbaWldLmZpcnN0Tm9kZSkge1xuICAgICAgICAgICAgZmluYWxWaWV3c1tpaV0ucmVuZGVyKHRoaXMudGFnLCBmaW5hbFZpZXdzW2lpICsgMV0sIHRoaXMucGFyZW50KTtcbiAgICAgICAgICAgIHJldHVybiBmaW5hbFZpZXdzW2lpXS5yZW5kZXJlZC50aGVuKCgpID0+IHJlbmRlclJlY3Vyc2UoTnVtYmVyKGkpICsgMSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgc3BsaXQgPSA1MDA7XG4gICAgICAgICAgICBpZiAoaSA9PT0gMCB8fCBpICUgc3BsaXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlbmRlclJlY3Vyc2UoTnVtYmVyKGkpICsgMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYWNjZXB0ID0+IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBhY2NlcHQocmVuZGVyUmVjdXJzZShOdW1iZXIoaSkgKyAxKSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxWaWV3c1tpaV0ucmVuZGVyKHRoaXMudGFnLCBmaW5hbFZpZXdzW2lpICsgMV0sIHRoaXMucGFyZW50KTtcbiAgICAgICAgdGhpcy52aWV3cy5zcGxpY2UoaWksIDAsIGZpbmFsVmlld3NbaWldKTtcbiAgICAgICAgcmV0dXJuIGZpbmFsVmlld3NbaWldLnJlbmRlcmVkLnRoZW4oKCkgPT4gcmVuZGVyUmVjdXJzZShpICsgMSkpO1xuICAgICAgfTtcbiAgICAgIHRoaXMucmVuZGVyZWQgPSByZW5kZXJSZWN1cnNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciByZW5kZXJzID0gW107XG4gICAgICB2YXIgbGVmdG92ZXJzID0gT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKG51bGwpLCBmaW5hbFZpZXdzKTtcbiAgICAgIHZhciBpc0ludCA9IHggPT4gcGFyc2VJbnQoeCkgPT09IHggLSAwO1xuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhmaW5hbFZpZXdzKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIGlmIChpc0ludChhKSAmJiBpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiBNYXRoLnNpZ24oYSAtIGIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNJbnQoYSkgJiYgIWlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpc0ludChhKSAmJiBpc0ludChiKSkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNJbnQoYSkgJiYgIWlzSW50KGIpKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIF9sb29wMyA9IGZ1bmN0aW9uIChfaTMpIHtcbiAgICAgICAgZGVsZXRlIGxlZnRvdmVyc1tfaTNdO1xuICAgICAgICBpZiAoZmluYWxWaWV3c1tfaTNdLmZpcnN0Tm9kZSAmJiBmaW5hbFZpZXdzW19pM10gPT09IF90aGlzMi52aWV3c1tfaTNdKSB7XG4gICAgICAgICAgcmV0dXJuIDE7IC8vIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgZmluYWxWaWV3c1tfaTNdLnJlbmRlcihfdGhpczIudGFnLCBudWxsLCBfdGhpczIucGFyZW50KTtcbiAgICAgICAgcmVuZGVycy5wdXNoKGZpbmFsVmlld3NbX2kzXS5yZW5kZXJlZC50aGVuKCgpID0+IGZpbmFsVmlld3NbX2kzXSkpO1xuICAgICAgfTtcbiAgICAgIGZvciAodmFyIF9pMyBvZiBrZXlzKSB7XG4gICAgICAgIGlmIChfbG9vcDMoX2kzKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBfaTQgaW4gbGVmdG92ZXJzKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmFyZ3Mudmlld3NbX2k0XTtcbiAgICAgICAgbGVmdG92ZXJzLnJlbW92ZSh0cnVlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVuZGVyZWQgPSBQcm9taXNlLmFsbChyZW5kZXJzKTtcbiAgICB9XG4gICAgZm9yICh2YXIgX2k1IGluIGZpbmFsVmlld3MpIHtcbiAgICAgIGlmIChpc05hTihfaTUpKSB7XG4gICAgICAgIGZpbmFsVmlld3NbX2k1XS5hcmdzW3RoaXMua2V5UHJvcGVydHldID0gX2k1LnN1YnN0cigxKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmaW5hbFZpZXdzW19pNV0uYXJnc1t0aGlzLmtleVByb3BlcnR5XSA9IF9pNTtcbiAgICB9XG4gICAgdGhpcy52aWV3cyA9IEFycmF5LmlzQXJyYXkodGhpcy5hcmdzLnZhbHVlKSA/IFsuLi5maW5hbFZpZXdzXSA6IGZpbmFsVmlld3M7XG4gICAgdGhpcy52aWV3Q291bnQgPSBmaW5hbFZpZXdzLmxlbmd0aDtcbiAgICBmaW5hbFZpZXdTZXQuY2xlYXIoKTtcbiAgICB0aGlzLndpbGxSZVJlbmRlciA9IGZhbHNlO1xuICAgIHRoaXMucmVuZGVyZWQudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLnBhcmVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdFJlbmRlcmVkJywge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIGtleTogdGhpcy5zdWJQcm9wZXJ0eSxcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLmFyZ3MudmFsdWUsXG4gICAgICAgICAgICB0YWc6IHRoaXMudGFnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgICB0aGlzLnRhZy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbGlzdFJlbmRlcmVkJywge1xuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIGtleTogdGhpcy5zdWJQcm9wZXJ0eSxcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLmFyZ3MudmFsdWUsXG4gICAgICAgICAgICB0YWc6IHRoaXMudGFnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyZWQ7XG4gIH1cbiAgcGF1c2UocGF1c2UgPSB0cnVlKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnZpZXdzKSB7XG4gICAgICB0aGlzLnZpZXdzW2ldLnBhdXNlKHBhdXNlKTtcbiAgICB9XG4gIH1cbiAgb25SZW1vdmUoY2FsbGJhY2spIHtcbiAgICB0aGlzLl9vblJlbW92ZS5hZGQoY2FsbGJhY2spO1xuICB9XG4gIHJlbW92ZSgpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMudmlld3MpIHtcbiAgICAgIHRoaXMudmlld3NbaV0gJiYgdGhpcy52aWV3c1tpXS5yZW1vdmUodHJ1ZSk7XG4gICAgfVxuICAgIHZhciBvblJlbW92ZSA9IHRoaXMuX29uUmVtb3ZlLml0ZW1zKCk7XG4gICAgZm9yICh2YXIgX2k2IGluIG9uUmVtb3ZlKSB7XG4gICAgICB0aGlzLl9vblJlbW92ZS5yZW1vdmUob25SZW1vdmVbX2k2XSk7XG4gICAgICBvblJlbW92ZVtfaTZdKCk7XG4gICAgfVxuICAgIHZhciBjbGVhbnVwO1xuICAgIHdoaWxlICh0aGlzLmNsZWFudXAubGVuZ3RoKSB7XG4gICAgICBjbGVhbnVwID0gdGhpcy5jbGVhbnVwLnBvcCgpO1xuICAgICAgY2xlYW51cCgpO1xuICAgIH1cbiAgICB0aGlzLnZpZXdzID0gW107XG4gICAgd2hpbGUgKHRoaXMudGFnICYmIHRoaXMudGFnLmZpcnN0Q2hpbGQpIHtcbiAgICAgIHRoaXMudGFnLnJlbW92ZUNoaWxkKHRoaXMudGFnLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdWJBcmdzKSB7XG4gICAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzLnN1YkFyZ3MpO1xuICAgIH1cbiAgICBfQmluZGFibGUuQmluZGFibGUuY2xlYXJCaW5kaW5ncyh0aGlzLmFyZ3MpO1xuXG4gICAgLy8gaWYodGhpcy5hcmdzLnZhbHVlICYmICF0aGlzLmFyZ3MudmFsdWUuaXNCb3VuZCgpKVxuICAgIC8vIHtcbiAgICAvLyBcdEJpbmRhYmxlLmNsZWFyQmluZGluZ3ModGhpcy5hcmdzLnZhbHVlKTtcbiAgICAvLyB9XG5cbiAgICB0aGlzLnJlbW92ZWQgPSB0cnVlO1xuICB9XG59XG5leHBvcnRzLlZpZXdMaXN0ID0gVmlld0xpc3Q7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvaW5wdXQvS2V5Ym9hcmQuanNcIiwgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlKSB7XG4gIHJlcXVpcmUgPSBfX21ha2VSZWxhdGl2ZVJlcXVpcmUocmVxdWlyZSwge30sIFwiY3VydmF0dXJlXCIpO1xuICAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLktleWJvYXJkID0gdm9pZCAwO1xudmFyIF9CaW5kYWJsZSA9IHJlcXVpcmUoXCIuLi9iYXNlL0JpbmRhYmxlXCIpO1xuY2xhc3MgS2V5Ym9hcmQge1xuICBzdGF0aWMgZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlID0gdGhpcy5pbnN0YW5jZSB8fCBfQmluZGFibGUuQmluZGFibGUubWFrZShuZXcgdGhpcygpKTtcbiAgfVxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm1heERlY2F5ID0gMTIwO1xuICAgIHRoaXMuY29tYm9UaW1lID0gNTAwO1xuICAgIHRoaXMubGlzdGVuaW5nID0gZmFsc2U7XG4gICAgdGhpcy5mb2N1c0VsZW1lbnQgPSBkb2N1bWVudC5ib2R5O1xuICAgIHRoaXNbX0JpbmRhYmxlLkJpbmRhYmxlLk5vR2V0dGVyc10gPSB0cnVlO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY29tYm8nLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2UoW10pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd3aGljaHMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjb2RlcycsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2tleXMnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVzc2VkV2hpY2gnLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwcmVzc2VkQ29kZScsIHtcbiAgICAgIHZhbHVlOiBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSlcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ByZXNzZWRLZXknLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdyZWxlYXNlZFdoaWNoJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVsZWFzZWRDb2RlJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncmVsZWFzZWRLZXknLCB7XG4gICAgICB2YWx1ZTogX0JpbmRhYmxlLkJpbmRhYmxlLm1ha2Uoe30pXG4gICAgfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdrZXlSZWZzJywge1xuICAgICAgdmFsdWU6IF9CaW5kYWJsZS5CaW5kYWJsZS5tYWtlKHt9KVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZXZlbnQgPT4ge1xuICAgICAgaWYgKCF0aGlzLmxpc3RlbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoISh0aGlzLmtleXNbZXZlbnQua2V5XSA+IDApICYmIHRoaXMuZm9jdXNFbGVtZW50ICYmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgIT09IHRoaXMuZm9jdXNFbGVtZW50ICYmICghdGhpcy5mb2N1c0VsZW1lbnQuY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkgfHwgZG9jdW1lbnQuYWN0aXZlRWxlbWVudC5tYXRjaGVzKCdpbnB1dCx0ZXh0YXJlYScpKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5yZWxlYXNlZFdoaWNoW2V2ZW50LndoaWNoXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnJlbGVhc2VkQ29kZVtldmVudC5jb2RlXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnJlbGVhc2VkS2V5W2V2ZW50LmtleV0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy53aGljaHNbZXZlbnQud2hpY2hdID0gLTE7XG4gICAgICB0aGlzLmNvZGVzW2V2ZW50LmNvZGVdID0gLTE7XG4gICAgICB0aGlzLmtleXNbZXZlbnQua2V5XSA9IC0xO1xuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBldmVudCA9PiB7XG4gICAgICBpZiAoIXRoaXMubGlzdGVuaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmZvY3VzRWxlbWVudCAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ICE9PSB0aGlzLmZvY3VzRWxlbWVudCAmJiAoIXRoaXMuZm9jdXNFbGVtZW50LmNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHx8IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQubWF0Y2hlcygnaW5wdXQsdGV4dGFyZWEnKSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChldmVudC5yZXBlYXQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5jb21iby5wdXNoKGV2ZW50LmNvZGUpO1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY29tYm9UaW1lcik7XG4gICAgICB0aGlzLmNvbWJvVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuY29tYm8uc3BsaWNlKDApLCB0aGlzLmNvbWJvVGltZSk7XG4gICAgICB0aGlzLnByZXNzZWRXaGljaFtldmVudC53aGljaF0gPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5wcmVzc2VkQ29kZVtldmVudC5jb2RlXSA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLnByZXNzZWRLZXlbZXZlbnQua2V5XSA9IERhdGUubm93KCk7XG4gICAgICBpZiAodGhpcy5rZXlzW2V2ZW50LmtleV0gPiAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMud2hpY2hzW2V2ZW50LndoaWNoXSA9IDE7XG4gICAgICB0aGlzLmNvZGVzW2V2ZW50LmNvZGVdID0gMTtcbiAgICAgIHRoaXMua2V5c1tldmVudC5rZXldID0gMTtcbiAgICB9KTtcbiAgICB2YXIgd2luZG93Qmx1ciA9IGV2ZW50ID0+IHtcbiAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5rZXlzKSB7XG4gICAgICAgIGlmICh0aGlzLmtleXNbaV0gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWxlYXNlZEtleVtpXSA9IERhdGUubm93KCk7XG4gICAgICAgIHRoaXMua2V5c1tpXSA9IC0xO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgX2kgaW4gdGhpcy5jb2Rlcykge1xuICAgICAgICBpZiAodGhpcy5jb2Rlc1tfaV0gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWxlYXNlZENvZGVbX2ldID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdGhpcy5jb2Rlc1tfaV0gPSAtMTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIF9pMiBpbiB0aGlzLndoaWNocykge1xuICAgICAgICBpZiAodGhpcy53aGljaHNbX2kyXSA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbGVhc2VkV2hpY2hbX2kyXSA9IERhdGUubm93KCk7XG4gICAgICAgIHRoaXMud2hpY2hzW19pMl0gPSAtMTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgd2luZG93Qmx1cik7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBpZiAoZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlID09PSAndmlzaWJsZScpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgd2luZG93Qmx1cigpO1xuICAgIH0pO1xuICB9XG4gIGdldEtleVJlZihrZXlDb2RlKSB7XG4gICAgdmFyIGtleVJlZiA9IHRoaXMua2V5UmVmc1trZXlDb2RlXSA9IHRoaXMua2V5UmVmc1trZXlDb2RlXSB8fCBfQmluZGFibGUuQmluZGFibGUubWFrZSh7fSk7XG4gICAgcmV0dXJuIGtleVJlZjtcbiAgfVxuICBnZXRLZXlUaW1lKGtleSkge1xuICAgIHZhciByZWxlYXNlZCA9IHRoaXMucmVsZWFzZWRLZXlba2V5XTtcbiAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZEtleVtrZXldO1xuICAgIGlmICghcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHByZXNzZWQ7XG4gICAgfVxuICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICB9XG4gIGdldENvZGVUaW1lKGNvZGUpIHtcbiAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkQ29kZVtjb2RlXTtcbiAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZENvZGVbY29kZV07XG4gICAgaWYgKCFwcmVzc2VkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKCFyZWxlYXNlZCB8fCByZWxlYXNlZCA8IHByZXNzZWQpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gcHJlc3NlZDtcbiAgICB9XG4gICAgcmV0dXJuIChEYXRlLm5vdygpIC0gcmVsZWFzZWQpICogLTE7XG4gIH1cbiAgZ2V0V2hpY2hUaW1lKGNvZGUpIHtcbiAgICB2YXIgcmVsZWFzZWQgPSB0aGlzLnJlbGVhc2VkV2hpY2hbY29kZV07XG4gICAgdmFyIHByZXNzZWQgPSB0aGlzLnByZXNzZWRXaGljaFtjb2RlXTtcbiAgICBpZiAoIXByZXNzZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoIXJlbGVhc2VkIHx8IHJlbGVhc2VkIDwgcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBwcmVzc2VkO1xuICAgIH1cbiAgICByZXR1cm4gKERhdGUubm93KCkgLSByZWxlYXNlZCkgKiAtMTtcbiAgfVxuICBnZXRLZXkoa2V5KSB7XG4gICAgaWYgKCF0aGlzLmtleXNba2V5XSkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmtleXNba2V5XTtcbiAgfVxuICBnZXRLZXlDb2RlKGNvZGUpIHtcbiAgICBpZiAoIXRoaXMuY29kZXNbY29kZV0pIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb2Rlc1tjb2RlXTtcbiAgfVxuICByZXNldCgpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMua2V5cykge1xuICAgICAgZGVsZXRlIHRoaXMua2V5c1tpXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmNvZGVzKSB7XG4gICAgICBkZWxldGUgdGhpcy5jb2Rlc1tpXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLndoaWNocykge1xuICAgICAgZGVsZXRlIHRoaXMud2hpY2hzW2ldO1xuICAgIH1cbiAgfVxuICB1cGRhdGUoKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmtleXMpIHtcbiAgICAgIGlmICh0aGlzLmtleXNbaV0gPiAwKSB7XG4gICAgICAgIHRoaXMua2V5c1tpXSsrO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmtleXNbaV0gPiAtdGhpcy5tYXhEZWNheSkge1xuICAgICAgICB0aGlzLmtleXNbaV0tLTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmtleXNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5jb2Rlcykge1xuICAgICAgdmFyIHJlbGVhc2VkID0gdGhpcy5yZWxlYXNlZENvZGVbaV07XG4gICAgICB2YXIgcHJlc3NlZCA9IHRoaXMucHJlc3NlZENvZGVbaV07XG4gICAgICB2YXIga2V5UmVmID0gdGhpcy5nZXRLZXlSZWYoaSk7XG4gICAgICBpZiAodGhpcy5jb2Rlc1tpXSA+IDApIHtcbiAgICAgICAga2V5UmVmLmZyYW1lcyA9IHRoaXMuY29kZXNbaV0rKztcbiAgICAgICAga2V5UmVmLnRpbWUgPSBwcmVzc2VkID8gRGF0ZS5ub3coKSAtIHByZXNzZWQgOiAwO1xuICAgICAgICBrZXlSZWYuZG93biA9IHRydWU7XG4gICAgICAgIGlmICghcmVsZWFzZWQgfHwgcmVsZWFzZWQgPCBwcmVzc2VkKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHJlbGVhc2VkKSAqIC0xO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmNvZGVzW2ldID4gLXRoaXMubWF4RGVjYXkpIHtcbiAgICAgICAga2V5UmVmLmZyYW1lcyA9IHRoaXMuY29kZXNbaV0tLTtcbiAgICAgICAga2V5UmVmLnRpbWUgPSByZWxlYXNlZCAtIERhdGUubm93KCk7XG4gICAgICAgIGtleVJlZi5kb3duID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBrZXlSZWYuZnJhbWVzID0gMDtcbiAgICAgICAga2V5UmVmLnRpbWUgPSAwO1xuICAgICAgICBrZXlSZWYuZG93biA9IGZhbHNlO1xuICAgICAgICBkZWxldGUgdGhpcy5jb2Rlc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLndoaWNocykge1xuICAgICAgaWYgKHRoaXMud2hpY2hzW2ldID4gMCkge1xuICAgICAgICB0aGlzLndoaWNoc1tpXSsrO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLndoaWNoc1tpXSA+IC10aGlzLm1heERlY2F5KSB7XG4gICAgICAgIHRoaXMud2hpY2hzW2ldLS07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy53aGljaHNbaV07XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5leHBvcnRzLktleWJvYXJkID0gS2V5Ym9hcmQ7XG4gIH0pKCk7XG59KTsiLCJcbnJlcXVpcmUucmVnaXN0ZXIoXCJjdXJ2YXR1cmUvbWl4aW4vRXZlbnRUYXJnZXRNaXhpbi5qc1wiLCBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUpIHtcbiAgcmVxdWlyZSA9IF9fbWFrZVJlbGF0aXZlUmVxdWlyZShyZXF1aXJlLCB7fSwgXCJjdXJ2YXR1cmVcIik7XG4gIChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuRXZlbnRUYXJnZXRNaXhpbiA9IHZvaWQgMDtcbnZhciBfTWl4aW4gPSByZXF1aXJlKFwiLi4vYmFzZS9NaXhpblwiKTtcbnZhciBFdmVudFRhcmdldFBhcmVudCA9IFN5bWJvbCgnRXZlbnRUYXJnZXRQYXJlbnQnKTtcbnZhciBDYWxsSGFuZGxlciA9IFN5bWJvbCgnQ2FsbEhhbmRsZXInKTtcbnZhciBDYXB0dXJlID0gU3ltYm9sKCdDYXB0dXJlJyk7XG52YXIgQnViYmxlID0gU3ltYm9sKCdCdWJibGUnKTtcbnZhciBUYXJnZXQgPSBTeW1ib2woJ1RhcmdldCcpO1xudmFyIEhhbmRsZXJzQnViYmxlID0gU3ltYm9sKCdIYW5kbGVyc0J1YmJsZScpO1xudmFyIEhhbmRsZXJzQ2FwdHVyZSA9IFN5bWJvbCgnSGFuZGxlcnNDYXB0dXJlJyk7XG52YXIgRXZlbnRUYXJnZXRNaXhpbiA9IGV4cG9ydHMuRXZlbnRUYXJnZXRNaXhpbiA9IHtcbiAgW19NaXhpbi5NaXhpbi5Db25zdHJ1Y3Rvcl0oKSB7XG4gICAgdGhpc1tIYW5kbGVyc0NhcHR1cmVdID0gbmV3IE1hcCgpO1xuICAgIHRoaXNbSGFuZGxlcnNCdWJibGVdID0gbmV3IE1hcCgpO1xuICB9LFxuICBkaXNwYXRjaEV2ZW50KC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGlmICh0eXBlb2YgZXZlbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBldmVudCA9IG5ldyBDdXN0b21FdmVudChldmVudCk7XG4gICAgICBhcmdzWzBdID0gZXZlbnQ7XG4gICAgfVxuICAgIGV2ZW50LmN2UGF0aCA9IGV2ZW50LmN2UGF0aCB8fCBbXTtcbiAgICBldmVudC5jdlRhcmdldCA9IGV2ZW50LmN2Q3VycmVudFRhcmdldCA9IHRoaXM7XG4gICAgdmFyIHJlc3VsdCA9IHRoaXNbQ2FwdHVyZV0oLi4uYXJncyk7XG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgaWYgKHRoaXNbSGFuZGxlcnNDYXB0dXJlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHZhciBoYW5kbGVyTWFwID0gdGhpc1tIYW5kbGVyc0NhcHR1cmVdLmdldChldmVudC50eXBlKTtcbiAgICAgIHZhciBuZXdIYW5kbGVycyA9IFsuLi5oYW5kbGVyTWFwXTtcbiAgICAgIG5ld0hhbmRsZXJzLmZvckVhY2goaCA9PiBoLnB1c2goaGFuZGxlck1hcCkpO1xuICAgICAgaGFuZGxlcnMucHVzaCguLi5uZXdIYW5kbGVycyk7XG4gICAgfVxuICAgIGlmICh0aGlzW0hhbmRsZXJzQnViYmxlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHZhciBfaGFuZGxlck1hcCA9IHRoaXNbSGFuZGxlcnNCdWJibGVdLmdldChldmVudC50eXBlKTtcbiAgICAgIHZhciBfbmV3SGFuZGxlcnMgPSBbLi4uX2hhbmRsZXJNYXBdO1xuICAgICAgX25ld0hhbmRsZXJzLmZvckVhY2goaCA9PiBoLnB1c2goX2hhbmRsZXJNYXApKTtcbiAgICAgIGhhbmRsZXJzLnB1c2goLi4uX25ld0hhbmRsZXJzKTtcbiAgICB9XG4gICAgaGFuZGxlcnMucHVzaChbKCkgPT4gdGhpc1tDYWxsSGFuZGxlcl0oLi4uYXJncyksIHt9LCBudWxsXSk7XG4gICAgZm9yICh2YXIgW2hhbmRsZXIsIG9wdGlvbnMsIG1hcF0gb2YgaGFuZGxlcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgbWFwLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgcmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFldmVudC5jYW5jZWxhYmxlIHx8ICFldmVudC5jYW5jZWxCdWJibGUgJiYgcmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgdGhpc1tCdWJibGVdKC4uLmFyZ3MpO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdKSB7XG4gICAgICBPYmplY3QuZnJlZXplKGV2ZW50LmN2UGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBldmVudC5yZXR1cm5WYWx1ZTtcbiAgfSxcbiAgYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgIHVzZUNhcHR1cmU6IHRydWVcbiAgICAgIH07XG4gICAgfVxuICAgIHZhciBoYW5kbGVycyA9IEhhbmRsZXJzQnViYmxlO1xuICAgIGlmIChvcHRpb25zLnVzZUNhcHR1cmUpIHtcbiAgICAgIGhhbmRsZXJzID0gSGFuZGxlcnNDYXB0dXJlO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbaGFuZGxlcnNdLmhhcyh0eXBlKSkge1xuICAgICAgdGhpc1toYW5kbGVyc10uc2V0KHR5cGUsIG5ldyBNYXAoKSk7XG4gICAgfVxuICAgIHRoaXNbaGFuZGxlcnNdLmdldCh0eXBlKS5zZXQoY2FsbGJhY2ssIG9wdGlvbnMpO1xuICAgIGlmIChvcHRpb25zLnNpZ25hbCkge1xuICAgICAgb3B0aW9ucy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBldmVudCA9PiB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMpLCB7XG4gICAgICAgIG9uY2U6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgcmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgIHVzZUNhcHR1cmU6IHRydWVcbiAgICAgIH07XG4gICAgfVxuICAgIHZhciBoYW5kbGVycyA9IEhhbmRsZXJzQnViYmxlO1xuICAgIGlmIChvcHRpb25zLnVzZUNhcHR1cmUpIHtcbiAgICAgIGhhbmRsZXJzID0gSGFuZGxlcnNDYXB0dXJlO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbaGFuZGxlcnNdLmhhcyh0eXBlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzW2hhbmRsZXJzXS5nZXQodHlwZSkuZGVsZXRlKGNhbGxiYWNrKTtcbiAgfSxcbiAgW0NhcHR1cmVdKC4uLmFyZ3MpIHtcbiAgICB2YXIgZXZlbnQgPSBhcmdzWzBdO1xuICAgIGV2ZW50LmN2UGF0aC5wdXNoKHRoaXMpO1xuICAgIGlmICghdGhpc1tFdmVudFRhcmdldFBhcmVudF0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0NhcHR1cmVdKC4uLmFyZ3MpO1xuICAgIGlmIChldmVudC5jYW5jZWxhYmxlICYmIChyZXN1bHQgPT09IGZhbHNlIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0NhcHR1cmVdLmhhcyhldmVudC50eXBlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBldmVudC5jdkN1cnJlbnRUYXJnZXQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XTtcbiAgICB2YXIge1xuICAgICAgdHlwZVxuICAgIH0gPSBldmVudDtcbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtIYW5kbGVyc0NhcHR1cmVdLmdldCh0eXBlKTtcbiAgICBmb3IgKHZhciBbaGFuZGxlciwgb3B0aW9uc10gb2YgaGFuZGxlcnMpIHtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgaGFuZGxlcnMuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gaGFuZGxlcihldmVudCk7XG4gICAgICBpZiAoZXZlbnQuY2FuY2VsYWJsZSAmJiAocmVzdWx0ID09PSBmYWxzZSB8fCBldmVudC5jYW5jZWxCdWJibGUpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuICBbQnViYmxlXSguLi5hcmdzKSB7XG4gICAgdmFyIGV2ZW50ID0gYXJnc1swXTtcbiAgICBpZiAoIWV2ZW50LmJ1YmJsZXMgfHwgIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdIHx8IGV2ZW50LmNhbmNlbEJ1YmJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQnViYmxlXS5oYXMoZXZlbnQudHlwZSkpIHtcbiAgICAgIHJldHVybiB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtCdWJibGVdKC4uLmFyZ3MpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0O1xuICAgIGV2ZW50LmN2Q3VycmVudFRhcmdldCA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdO1xuICAgIHZhciB7XG4gICAgICB0eXBlXG4gICAgfSA9IGV2ZW50O1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0hhbmRsZXJzQnViYmxlXS5nZXQoZXZlbnQudHlwZSk7XG4gICAgZm9yICh2YXIgW2hhbmRsZXIsIG9wdGlvbnNdIG9mIGhhbmRsZXJzKSB7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlKSB7XG4gICAgICAgIGhhbmRsZXJzLmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgcmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXN1bHQgPSB0aGlzW0V2ZW50VGFyZ2V0UGFyZW50XVtDYWxsSGFuZGxlcl0oLi4uYXJncyk7XG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUgJiYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgZXZlbnQuY2FuY2VsQnViYmxlKSkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXNbRXZlbnRUYXJnZXRQYXJlbnRdW0J1YmJsZV0oLi4uYXJncyk7XG4gIH0sXG4gIFtDYWxsSGFuZGxlcl0oLi4uYXJncykge1xuICAgIHZhciBldmVudCA9IGFyZ3NbMF07XG4gICAgaWYgKGV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGRlZmF1bHRIYW5kbGVyID0gYG9uJHtldmVudC50eXBlWzBdLnRvVXBwZXJDYXNlKCkgKyBldmVudC50eXBlLnNsaWNlKDEpfWA7XG4gICAgaWYgKHR5cGVvZiB0aGlzW2RlZmF1bHRIYW5kbGVyXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXNbZGVmYXVsdEhhbmRsZXJdKGV2ZW50KTtcbiAgICB9XG4gIH1cbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRXZlbnRUYXJnZXRNaXhpbiwgJ1BhcmVudCcsIHtcbiAgdmFsdWU6IEV2ZW50VGFyZ2V0UGFyZW50XG59KTtcbiAgfSkoKTtcbn0pOyIsImV4cG9ydCBjbGFzcyBDb25maWcge307XG5cbkNvbmZpZy50aXRsZSA9ICd3Z2wyZCc7XG4vLyBDb25maWcuIiwiaW1wb3J0IHsgQmluZGFibGUgICB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICcuLi9pbmplY3QvSW5qZWN0YWJsZSc7XG5cbmV4cG9ydCBjbGFzcyBHbDJkIGV4dGVuZHMgSW5qZWN0YWJsZVxue1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50KVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdG5ldyAoSW5qZWN0YWJsZS5pbmplY3Qoe0dsMmQ6IHRoaXN9KSk7XG5cblx0XHR0aGlzLmVsZW1lbnQgICA9IGVsZW1lbnQ7Ly8gfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5jb250ZXh0ICAgPSB0aGlzLmVsZW1lbnQuZ2V0Q29udGV4dCgnd2ViZ2wnKTtcblx0XHR0aGlzLnpvb21MZXZlbCA9IDE7XG5cdH1cblxuXHRyZXNpemUoeCwgeSlcblx0e1xuXHRcdHggPSAoeCB8fHRoaXMuZWxlbWVudC53aWR0aCkgIC8gdGhpcy56b29tTGV2ZWw7XG5cdFx0eSA9ICh5IHx8dGhpcy5lbGVtZW50LmhlaWdodCkgLyB0aGlzLnpvb21MZXZlbDtcblxuXHRcdGNvbnN0IGdsID0gdGhpcy5jb250ZXh0O1xuXG5cdFx0Z2wudmlld3BvcnQoMCwgMCwgeCwgeSk7XG5cdH1cdFxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmNvbnRleHQ7XG5cblx0XHRnbC51c2VQcm9ncmFtKHRoaXMucHJvZ3JhbSk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXHRcdGdsLnZpZXdwb3J0KDAsIDAsIGdsLmNhbnZhcy53aWR0aCwgZ2wuY2FudmFzLmhlaWdodCk7XG5cdFx0Z2wuY2xlYXJDb2xvcigwLCAwLCAwLCAwKTtcblx0XHRnbC5jbGVhckNvbG9yKDEsIDEsIDEsIDEpO1xuXHRcdGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuXHR9XG5cblx0Y2xlYW51cCgpXG5cdHtcblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuXHR9XG5cblx0Y3JlYXRlU2hhZGVyKGxvY2F0aW9uKVxuXHR7XG5cdFx0Y29uc3QgZXh0ZW5zaW9uID0gbG9jYXRpb24uc3Vic3RyaW5nKGxvY2F0aW9uLmxhc3RJbmRleE9mKCcuJykrMSk7XG5cdFx0bGV0ICAgdHlwZSA9IG51bGw7XG5cblx0XHRzd2l0Y2goZXh0ZW5zaW9uLnRvVXBwZXJDYXNlKCkpXG5cdFx0e1xuXHRcdFx0Y2FzZSAnVkVSVCc6XG5cdFx0XHRcdHR5cGUgPSB0aGlzLmNvbnRleHQuVkVSVEVYX1NIQURFUjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdGUkFHJzpcblx0XHRcdFx0dHlwZSA9IHRoaXMuY29udGV4dC5GUkFHTUVOVF9TSEFERVI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdGNvbnN0IHNoYWRlciA9IHRoaXMuY29udGV4dC5jcmVhdGVTaGFkZXIodHlwZSk7XG5cdFx0Y29uc3Qgc291cmNlID0gcmVxdWlyZShsb2NhdGlvbik7XG5cblx0XHR0aGlzLmNvbnRleHQuc2hhZGVyU291cmNlKHNoYWRlciwgc291cmNlKTtcblx0XHR0aGlzLmNvbnRleHQuY29tcGlsZVNoYWRlcihzaGFkZXIpO1xuXG5cdFx0Y29uc3Qgc3VjY2VzcyA9IHRoaXMuY29udGV4dC5nZXRTaGFkZXJQYXJhbWV0ZXIoXG5cdFx0XHRzaGFkZXJcblx0XHRcdCwgdGhpcy5jb250ZXh0LkNPTVBJTEVfU1RBVFVTXG5cdFx0KTtcblxuXHRcdGlmKHN1Y2Nlc3MpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHNoYWRlcjtcblx0XHR9XG5cblx0XHRjb25zb2xlLmVycm9yKHRoaXMuY29udGV4dC5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcikpO1xuXG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVNoYWRlcihzaGFkZXIpO1xuXHR9XG5cblx0Y3JlYXRlUHJvZ3JhbSh2ZXJ0ZXhTaGFkZXIsIGZyYWdtZW50U2hhZGVyKVxuXHR7XG5cdFx0Y29uc3QgcHJvZ3JhbSA9IHRoaXMuY29udGV4dC5jcmVhdGVQcm9ncmFtKCk7XG5cblx0XHR0aGlzLmNvbnRleHQuYXR0YWNoU2hhZGVyKHByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmF0dGFjaFNoYWRlcihwcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XG5cblx0XHR0aGlzLmNvbnRleHQubGlua1Byb2dyYW0ocHJvZ3JhbSk7XG5cblx0XHR0aGlzLmNvbnRleHQuZGV0YWNoU2hhZGVyKHByb2dyYW0sIHZlcnRleFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmRldGFjaFNoYWRlcihwcm9ncmFtLCBmcmFnbWVudFNoYWRlcik7XG5cdFx0dGhpcy5jb250ZXh0LmRlbGV0ZVNoYWRlcih2ZXJ0ZXhTaGFkZXIpO1xuXHRcdHRoaXMuY29udGV4dC5kZWxldGVTaGFkZXIoZnJhZ21lbnRTaGFkZXIpO1xuXG5cdFx0aWYodGhpcy5jb250ZXh0LmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgdGhpcy5jb250ZXh0LkxJTktfU1RBVFVTKSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gcHJvZ3JhbTtcblx0XHR9XG5cblx0XHRjb25zb2xlLmVycm9yKHRoaXMuY29udGV4dC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG5cblx0XHR0aGlzLmNvbnRleHQuZGVsZXRlUHJvZ3JhbShwcm9ncmFtKTtcblxuXHRcdHJldHVybiBwcm9ncmFtO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBWaWV3IGFzIEJhc2VWaWV3IH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvVmlldyc7XG5pbXBvcnQgeyBLZXlib2FyZCB9IGZyb20gJ2N1cnZhdHVyZS9pbnB1dC9LZXlib2FyZCdcbmltcG9ydCB7IEJhZyB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JhZyc7XG5cbmltcG9ydCB7IENvbmZpZyB9IGZyb20gJ0NvbmZpZyc7XG5cbmltcG9ydCB7IE1hcCBhcyBXb3JsZE1hcCB9IGZyb20gJy4uL3dvcmxkL01hcCc7XG5cbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZVNoZWV0JztcbmltcG9ydCB7IFNwcml0ZUJvYXJkIH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZUJvYXJkJztcblxuaW1wb3J0IHsgQ29udHJvbGxlciBhcyBPblNjcmVlbkpveVBhZCB9IGZyb20gJy4uL3VpL0NvbnRyb2xsZXInO1xuaW1wb3J0IHsgTWFwRWRpdG9yICAgfSBmcm9tICcuLi91aS9NYXBFZGl0b3InO1xuXG5pbXBvcnQgeyBFbnRpdHkgfSAgICAgZnJvbSAnLi4vbW9kZWwvRW50aXR5JztcbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICcuLi9pbmplY3QvSW5qZWN0YWJsZSc7XG5cbmNvbnN0IEFwcGxpY2F0aW9uID0ge307XG5cbkFwcGxpY2F0aW9uLm9uU2NyZWVuSm95UGFkID0gbmV3IE9uU2NyZWVuSm95UGFkO1xuQXBwbGljYXRpb24ua2V5Ym9hcmQgPSBLZXlib2FyZC5nZXQoKTtcblxuZXhwb3J0IGNsYXNzIFZpZXcgZXh0ZW5kcyBCYXNlVmlld1xue1xuXHRjb25zdHJ1Y3RvcihhcmdzKVxuXHR7XG5cdFx0c3VwZXIoYXJncyk7XG5cdFx0dGhpcy50ZW1wbGF0ZSAgPSByZXF1aXJlKCcuL3ZpZXcudG1wJyk7XG5cdFx0dGhpcy5yb3V0ZXMgICAgPSBbXTtcblxuXHRcdHRoaXMuZW50aXRpZXMgID0gbmV3IEJhZztcblx0XHR0aGlzLmtleWJvYXJkICA9IEFwcGxpY2F0aW9uLmtleWJvYXJkO1xuXHRcdHRoaXMuc3BlZWQgICAgID0gMjQ7XG5cdFx0dGhpcy5tYXhTcGVlZCAgPSB0aGlzLnNwZWVkO1xuXG5cdFx0dGhpcy5hcmdzLmNvbnRyb2xsZXIgPSBBcHBsaWNhdGlvbi5vblNjcmVlbkpveVBhZDtcblxuXHRcdHRoaXMuYXJncy5mcHMgID0gMDtcblx0XHR0aGlzLmFyZ3Muc3BzICA9IDA7XG5cblx0XHR0aGlzLmFyZ3MuY2FtWCA9IDA7XG5cdFx0dGhpcy5hcmdzLmNhbVkgPSAwO1xuXG5cdFx0dGhpcy5hcmdzLmZyYW1lTG9jayAgICAgID0gNjA7XG5cdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID0gNjA7XG5cblx0XHR0aGlzLmFyZ3Muc2hvd0VkaXRvciA9IGZhbHNlO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5saXN0ZW5pbmcgPSB0cnVlO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnZScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMubWFwLmV4cG9ydCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnRXNjYXBlJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID09PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5zcHJpdGVCb2FyZC51bnNlbGVjdCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnSG9tZScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2srKztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ0VuZCcsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2stLTtcblxuXHRcdFx0XHRpZih0aGlzLmFyZ3MuZnJhbWVMb2NrIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXJncy5mcmFtZUxvY2sgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCdQYWdlVXAnLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2srKztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJ1BhZ2VEb3duJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrLS07XG5cblx0XHRcdFx0aWYodGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXJncy5zaW11bGF0aW9uTG9jayA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuc3ByaXRlU2hlZXQgPSBuZXcgU3ByaXRlU2hlZXQ7XG5cdFx0dGhpcy5tYXAgICAgICAgICA9IG5ldyBXb3JsZE1hcDtcblxuXHRcdHRoaXMubWFwLmltcG9ydCgpO1xuXG5cdFx0dGhpcy5hcmdzLm1hcEVkaXRvciAgPSBuZXcgTWFwRWRpdG9yKHtcblx0XHRcdHNwcml0ZVNoZWV0OiB0aGlzLnNwcml0ZVNoZWV0XG5cdFx0XHQsIG1hcDogICAgICAgdGhpcy5tYXBcblx0XHR9KTtcblx0fVxuXG5cdG9uUmVuZGVyZWQoKVxuXHR7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZCA9IG5ldyBTcHJpdGVCb2FyZChcblx0XHRcdHRoaXMudGFncy5jYW52YXMuZWxlbWVudFxuXHRcdFx0LCB0aGlzLm1hcFxuXHRcdCk7XG5cblx0XHRjb25zdCBlbnRpdHkgPSBuZXcgRW50aXR5O1xuXHRcdHRoaXMuZW50aXRpZXMuYWRkKGVudGl0eSk7XG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5zcHJpdGVzLmFkZChlbnRpdHkuc3ByaXRlKTtcblxuXHRcdHRoaXMua2V5Ym9hcmQua2V5cy5iaW5kVG8oJz0nLCAodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnpvb20oMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmtleWJvYXJkLmtleXMuYmluZFRvKCcrJywgKHYsayx0LGQpPT57XG5cdFx0XHRpZih2ID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy56b29tKDEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5rZXlib2FyZC5rZXlzLmJpbmRUbygnLScsICh2LGssdCxkKT0+e1xuXHRcdFx0aWYodiA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuem9vbSgtMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmFyZ3MubWFwRWRpdG9yLmFyZ3MuYmluZFRvKCdzZWxlY3RlZEdyYXBoaWMnLCAodik9Pntcblx0XHRcdGlmKCF2IHx8IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWCA9PSBudWxsKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYXJncy5zaG93RWRpdG9yID0gZmFsc2U7XG5cblx0XHRcdGxldCBpICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuc3RhcnRHbG9iYWxYO1xuXHRcdFx0bGV0IGlpID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5nbG9iYWxYO1xuXG5cdFx0XHRpZihpaSA8IGkpXG5cdFx0XHR7XG5cdFx0XHRcdFtpaSwgaV0gPSBbaSwgaWldO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IoOyBpPD0gaWk7IGkrKylcblx0XHRcdHtcblx0XHRcdFx0bGV0IGogID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5zdGFydEdsb2JhbFk7XG5cdFx0XHRcdGxldCBqaiA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWTtcblx0XHRcdFx0aWYoamogPCBqKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0W2pqLCBqXSA9IFtqLCBqal07XG5cdFx0XHRcdH1cblx0XHRcdFx0Zm9yKDsgaiA8PSBqajsgaisrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5tYXAuc2V0VGlsZShpLCBqLCB2KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLm1hcC5zZXRUaWxlKFxuXHRcdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFhcblx0XHRcdFx0LCB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFlcblx0XHRcdFx0LCB2XG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC51bnNlbGVjdCgpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5iaW5kVG8oKHYsayx0LGQscCk9Pntcblx0XHRcdGlmKHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQubG9jYWxYID09IG51bGwpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy5zaG93RWRpdG9yID0gZmFsc2U7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFyZ3MubWFwRWRpdG9yLnNlbGVjdCh0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkKTtcblxuXHRcdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSB0cnVlO1xuXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHRcdH0se3dhaXQ6MH0pO1xuXG5cdFx0dGhpcy5hcmdzLnNob3dFZGl0b3IgPSB0cnVlO1xuXG5cdFx0Ly8gdGhpcy5hcmdzLmNvbnRyb2xsZXIuYXJncy5iaW5kVG8oKHYsayx0LGQscCk9Pntcblx0XHQvLyBcdGlmKHYgPT09IDApXG5cdFx0Ly8gXHR7XG5cdFx0Ly8gXHRcdC8vIHNwcml0ZS5tb3ZpbmcgPSBmYWxzZTtcblx0XHQvLyBcdFx0Ly8gc3ByaXRlLnNwZWVkICA9IDA7XG5cdFx0Ly8gXHRcdHJldHVybjtcblx0XHQvLyBcdH1cblxuXHRcdC8vIFx0aWYoayAhPT0gJ3gnICYmIGsgIT09ICd5Jylcblx0XHQvLyBcdHtcblx0XHQvLyBcdFx0cmV0dXJuO1xuXHRcdC8vIFx0fVxuXG5cdFx0Ly8gXHRsZXQgaG9yaXpvbnRhbCA9IGZhbHNlO1xuXHRcdC8vIFx0bGV0IG1hZ25pdHVkZSAgPSB0Wyd5J107XG5cblx0XHQvLyBcdGlmKE1hdGguYWJzKHRbJ3gnXSkgPiBNYXRoLmFicyh0Wyd5J10pKVxuXHRcdC8vIFx0e1xuXHRcdC8vIFx0XHRob3Jpem9udGFsID0gdHJ1ZTtcblx0XHQvLyBcdFx0bWFnbml0dWRlICA9IHRbJ3gnXTtcblx0XHQvLyBcdH1cblxuXHRcdC8vIFx0aWYoaG9yaXpvbnRhbCAmJiBtYWduaXR1ZGUgPiAwKVxuXHRcdC8vIFx0e1xuXHRcdC8vIFx0XHQvLyBzcHJpdGUuc2V0RnJhbWVzKHNwcml0ZS53YWxraW5nLmVhc3QpO1xuXHRcdC8vIFx0XHQvLyBzcHJpdGUuZGlyZWN0aW9uID0gc3ByaXRlLlJJR0hUO1xuXHRcdC8vIFx0fVxuXHRcdC8vIFx0ZWxzZSBpZihob3Jpem9udGFsICYmIG1hZ25pdHVkZSA8IDApXG5cdFx0Ly8gXHR7XG5cdFx0Ly8gXHRcdC8vIHNwcml0ZS5zZXRGcmFtZXMoc3ByaXRlLndhbGtpbmcud2VzdCk7XG5cdFx0Ly8gXHRcdC8vIHNwcml0ZS5kaXJlY3Rpb24gPSBzcHJpdGUuTEVGVDtcblx0XHQvLyBcdH1cblx0XHQvLyBcdGVsc2UgaWYobWFnbml0dWRlID4gMCl7XG5cdFx0Ly8gXHRcdC8vIHNwcml0ZS5zZXRGcmFtZXMoc3ByaXRlLndhbGtpbmcuc291dGgpO1xuXHRcdC8vIFx0XHQvLyBzcHJpdGUuZGlyZWN0aW9uID0gc3ByaXRlLkRPV047XG5cdFx0Ly8gXHR9XG5cdFx0Ly8gXHRlbHNlIGlmKG1hZ25pdHVkZSA8IDApe1xuXHRcdC8vIFx0XHQvLyBzcHJpdGUuc2V0RnJhbWVzKHNwcml0ZS53YWxraW5nLm5vcnRoKTtcblx0XHQvLyBcdFx0Ly8gc3ByaXRlLmRpcmVjdGlvbiA9IHNwcml0ZS5VUDtcblx0XHQvLyBcdH1cblxuXHRcdC8vIFx0bWFnbml0dWRlID0gTWF0aC5yb3VuZChtYWduaXR1ZGUgLyA2LjEyNSk7XG5cblx0XHQvLyBcdC8vIHNwcml0ZS5zcGVlZCA9IG1hZ25pdHVkZSA8IDggPyBtYWduaXR1ZGUgOiA4O1xuXG5cdFx0Ly8gXHRpZihtYWduaXR1ZGUgPCAtOClcblx0XHQvLyBcdHtcblx0XHQvLyBcdFx0c3ByaXRlLnNwZWVkID0gLTg7XG5cdFx0Ly8gXHR9XG5cblx0XHQvLyBcdC8vIHNwcml0ZS5tb3ZpbmcgPSAhIW1hZ25pdHVkZTtcblx0XHQvLyB9KTtcblxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnJlc2l6ZSgpO1xuXHRcdFx0dXBkYXRlKCk7XG5cdFx0fSk7XG5cblx0XHRsZXQgZlRoZW4gPSAwO1xuXHRcdGxldCBzVGhlbiA9IDA7XG5cblx0XHRsZXQgZlNhbXBsZXMgPSBbXTtcblx0XHRsZXQgc1NhbXBsZXMgPSBbXTtcblxuXHRcdGxldCBtYXhTYW1wbGVzID0gNTtcblxuXHRcdGNvbnN0IHNpbXVsYXRlID0gKG5vdykgPT4ge1xuXHRcdFx0bm93ID0gbm93IC8gMTAwMDtcblxuXHRcdFx0Y29uc3QgZGVsdGEgPSBub3cgLSBzVGhlbjtcblxuXHRcdFx0aWYodGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrID09IDApXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzID0gWzBdO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmKGRlbHRhIDwgMS8odGhpcy5hcmdzLnNpbXVsYXRpb25Mb2NrKygxMCAqICh0aGlzLmFyZ3Muc2ltdWxhdGlvbkxvY2svNjApKSkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c1RoZW4gPSBub3c7XG5cblx0XHRcdHRoaXMua2V5Ym9hcmQudXBkYXRlKCk7XG5cblx0XHRcdE9iamVjdC52YWx1ZXModGhpcy5lbnRpdGllcy5pdGVtcygpKS5tYXAoKGUpPT57XG5cdFx0XHRcdGUuc2ltdWxhdGUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyB0aGlzLnNwcml0ZUJvYXJkLnNpbXVsYXRlKCk7XG5cblx0XHRcdC8vIHRoaXMuYXJncy5sb2NhbFggID0gdGhpcy5zcHJpdGVCb2FyZC5zZWxlY3RlZC5sb2NhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MubG9jYWxZICA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQubG9jYWxZO1xuXHRcdFx0Ly8gdGhpcy5hcmdzLmdsb2JhbFggPSB0aGlzLnNwcml0ZUJvYXJkLnNlbGVjdGVkLmdsb2JhbFg7XG5cdFx0XHQvLyB0aGlzLmFyZ3MuZ2xvYmFsWSA9IHRoaXMuc3ByaXRlQm9hcmQuc2VsZWN0ZWQuZ2xvYmFsWTtcblxuXHRcdFx0dGhpcy5hcmdzLl9zcHMgPSAoMSAvIGRlbHRhKTtcblxuXHRcdFx0c1NhbXBsZXMucHVzaCh0aGlzLmFyZ3MuX3Nwcyk7XG5cblx0XHRcdHdoaWxlKHNTYW1wbGVzLmxlbmd0aCA+IG1heFNhbXBsZXMpXG5cdFx0XHR7XG5cdFx0XHRcdHNTYW1wbGVzLnNoaWZ0KCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHRoaXMuc3ByaXRlQm9hcmQubW92ZUNhbWVyYShzcHJpdGUueCwgc3ByaXRlLnkpO1xuXHRcdH07XG5cblx0XHRjb25zdCB1cGRhdGUgPSAobm93KSA9Pntcblx0XHRcdG5vdyA9IG5vdyAvIDEwMDA7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGRlbHRhID0gbm93IC0gZlRoZW47XG5cblx0XHRcdGlmKGRlbHRhIDwgMS8odGhpcy5hcmdzLmZyYW1lTG9jaysoMTAgKiAodGhpcy5hcmdzLmZyYW1lTG9jay82MCkpKSlcblx0XHRcdHtcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGZUaGVuID0gbm93O1xuXG5cdFx0XHRpZih0aGlzLmFyZ3MuZnJhbWVMb2NrID09IDApXG5cdFx0XHR7XG5cdFx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcblx0XHRcdFx0ZlNhbXBsZXMgPSBbMF07XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXG5cdFx0XHR0aGlzLnNwcml0ZUJvYXJkLmRyYXcoKTtcblxuXHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xuXG5cdFx0XHRmU2FtcGxlcy5wdXNoKHRoaXMuYXJncy5fZnBzKTtcblxuXHRcdFx0d2hpbGUoZlNhbXBsZXMubGVuZ3RoID4gbWF4U2FtcGxlcylcblx0XHRcdHtcblx0XHRcdFx0ZlNhbXBsZXMuc2hpZnQoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hcmdzLl9mcHMgPSAoMSAvIGRlbHRhKTtcblxuXHRcdFx0dGhpcy5hcmdzLmNhbVggPSB0aGlzLnNwcml0ZUJvYXJkLkNhbWVyYS54O1xuXHRcdFx0dGhpcy5hcmdzLmNhbVkgPSB0aGlzLnNwcml0ZUJvYXJkLkNhbWVyYS55O1xuXHRcdH07XG5cblx0XHR0aGlzLnJlc2l6ZSgpO1xuXG5cdFx0c2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdHNpbXVsYXRlKHBlcmZvcm1hbmNlLm5vdygpKTtcblx0XHR9LCAwKTtcblxuXHRcdHNldEludGVydmFsKCgpPT57XG5cdFx0XHRjb25zdCBmcHMgPSBmU2FtcGxlcy5yZWR1Y2UoKGEsYik9PmErYiwgMCkgLyBmU2FtcGxlcy5sZW5ndGg7XG5cdFx0XHR0aGlzLmFyZ3MuZnBzID0gZnBzLnRvRml4ZWQoMykucGFkU3RhcnQoNSwgJyAnKTtcblx0XHR9LCAyMjcpO1xuXG5cdFx0c2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gYCR7Q29uZmlnLnRpdGxlfSAke3RoaXMuYXJncy5mcHN9IEZQU2A7XG5cdFx0fSwgMjI3LzMpO1xuXG5cdFx0c2V0SW50ZXJ2YWwoKCk9Pntcblx0XHRcdGNvbnN0IHNwcyA9IHNTYW1wbGVzLnJlZHVjZSgoYSxiKT0+YStiLCAwKSAvIHNTYW1wbGVzLmxlbmd0aDtcblx0XHRcdHRoaXMuYXJncy5zcHMgPSBzcHMudG9GaXhlZCgzKS5wYWRTdGFydCg1LCAnICcpO1xuXHRcdH0sIDIzMS8yKTtcblxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcblx0fVxuXG5cdHJlc2l6ZSh4LCB5KVxuXHR7XG5cdFx0dGhpcy5hcmdzLndpZHRoICA9IHRoaXMudGFncy5jYW52YXMuZWxlbWVudC53aWR0aCAgID0geCB8fCBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoO1xuXHRcdHRoaXMuYXJncy5oZWlnaHQgPSB0aGlzLnRhZ3MuY2FudmFzLmVsZW1lbnQuaGVpZ2h0ICA9IHkgfHwgZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQ7XG5cblx0XHR0aGlzLmFyZ3MucndpZHRoICA9IE1hdGguZmxvb3IoXG5cdFx0XHQoeCB8fCBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoKSAgLyB0aGlzLnNwcml0ZUJvYXJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHR0aGlzLmFyZ3MucmhlaWdodCA9IE1hdGguZmxvb3IoXG5cdFx0XHQoeSB8fCBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCkgLyB0aGlzLnNwcml0ZUJvYXJkLnpvb21MZXZlbFxuXHRcdCk7XG5cblx0XHR0aGlzLnNwcml0ZUJvYXJkLnJlc2l6ZSgpO1xuXHR9XG5cblx0c2Nyb2xsKGV2ZW50KVxuXHR7XG5cdFx0bGV0IGRlbHRhID0gZXZlbnQuZGVsdGFZID4gMCA/IC0xIDogKFxuXHRcdFx0ZXZlbnQuZGVsdGFZIDwgMCA/IDEgOiAwXG5cdFx0KTtcblxuXHRcdHRoaXMuem9vbShkZWx0YSk7XG5cdH1cblxuXHR6b29tKGRlbHRhKVxuXHR7XG5cdFx0bGV0IG1pbiAgID0gMC4zNTtcblx0XHRsZXQgc3RlcCAgPSAwLjA1O1x0XHRcblxuXHRcdGlmKGRlbHRhID4gMCB8fCBkZWx0YSA8IDAgJiYgdGhpcy5zcHJpdGVCb2FyZC56b29tTGV2ZWwgPiBtaW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC56b29tTGV2ZWwgKz0gKGRlbHRhICogc3RlcCk7XG5cdFx0XHR0aGlzLnJlc2l6ZSgpO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5zcHJpdGVCb2FyZC56b29tTGV2ZWwgPSBtaW47XG5cdFx0XHR0aGlzLnJlc2l6ZSgpO1xuXHRcdH1cblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxjYW52YXNcXG5cXHRjdi1yZWYgPSBcXFwiY2FudmFzOmN1cnZhdHVyZS9iYXNlL1RhZ1xcXCJcXG5cXHRjdi1vbiAgPSBcXFwid2hlZWw6c2Nyb2xsKGV2ZW50KTtcXFwiXFxuPjwvY2FudmFzPlxcbjxkaXYgY2xhc3MgPSBcXFwiaHVkIGZwc1xcXCI+XFxuIFtbc3BzXV0gc2ltdWxhdGlvbnMvcyAvIFtbc2ltdWxhdGlvbkxvY2tdXSBcXG4gW1tmcHNdXSBmcmFtZXMvcyAgICAgIC8gW1tmcmFtZUxvY2tdXSBcXG5cXG4gUmVzIFtbcndpZHRoXV0geCBbW3JoZWlnaHRdXVxcbiAgICAgW1t3aWR0aF1dIHggW1toZWlnaHRdXVxcbiBcXG4gUG9zIFtbY2FtWF1dIHggW1tjYW1ZXV1cXG5cXG4gzrQgU2ltOiAgIFBnIFVwIC8gRG5cXG4gzrQgRnJhbWU6IEhvbWUgLyBFbmQgXFxuIM60IFNjYWxlOiArIC8gLSBcXG5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzID0gXFxcInJldGljbGVcXFwiPjwvZGl2PlxcblxcbltbY29udHJvbGxlcl1dXFxuXFxuPGRpdiBjdi1pZiA9IFxcXCJzaG93RWRpdG9yXFxcIj5cXG5cXHRbW21hcEVkaXRvcl1dXFxuXFx0LS1cXG5cXHRbW21tbV1dXFxuPC9zcGFuPlxcblwiIiwiaW1wb3J0IHsgUm91dGVyIH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvUm91dGVyJztcbmltcG9ydCB7IFZpZXcgICB9IGZyb20gJ2hvbWUvVmlldyc7XG5cbmlmKFByb3h5ICE9PSB1bmRlZmluZWQpXG57XG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG5cdFx0Y29uc3QgdmlldyA9IG5ldyBWaWV3KCk7XG5cdFx0XG5cdFx0Um91dGVyLmxpc3Rlbih2aWV3KTtcblx0XHRcblx0XHR2aWV3LnJlbmRlcihkb2N1bWVudC5ib2R5KTtcblx0fSk7XG59XG5lbHNlXG57XG5cdC8vIGRvY3VtZW50LndyaXRlKHJlcXVpcmUoJy4vRmFsbGJhY2svZmFsbGJhY2sudG1wJykpO1xufVxuIiwiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJy4vSW5qZWN0YWJsZSc7XG5cbmV4cG9ydCBjbGFzcyBDb250YWluZXIgZXh0ZW5kcyBJbmplY3RhYmxlXG57XG5cdGluamVjdChpbmplY3Rpb25zKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKE9iamVjdC5hc3NpZ24oe30sIHRoaXMsIGluamVjdGlvbnMpKTtcblx0fVxufVxuIiwibGV0IGNsYXNzZXMgPSB7fTtcbmxldCBvYmplY3RzID0ge307XG5cbmV4cG9ydCBjbGFzcyBJbmplY3RhYmxlXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdGxldCBpbmplY3Rpb25zID0gdGhpcy5jb25zdHJ1Y3Rvci5pbmplY3Rpb25zKCk7XG5cdFx0bGV0IGNvbnRleHQgICAgPSB0aGlzLmNvbnN0cnVjdG9yLmNvbnRleHQoKTtcblxuXHRcdGlmKCFjbGFzc2VzW2NvbnRleHRdKVxuXHRcdHtcblx0XHRcdGNsYXNzZXNbY29udGV4dF0gPSB7fTtcblx0XHR9XG5cblx0XHRpZighb2JqZWN0c1tjb250ZXh0XSlcblx0XHR7XG5cdFx0XHRvYmplY3RzW2NvbnRleHRdID0ge307XG5cdFx0fVxuXG5cdFx0Zm9yKGxldCBuYW1lIGluIGluamVjdGlvbnMpXG5cdFx0e1xuXHRcdFx0bGV0IGluamVjdGlvbiA9IGluamVjdGlvbnNbbmFtZV07XG5cblx0XHRcdGlmKGNsYXNzZXNbY29udGV4dF1bbmFtZV0gfHwgIWluamVjdGlvbi5wcm90b3R5cGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZigvW0EtWl0vLnRlc3QoU3RyaW5nKG5hbWUpWzBdKSlcblx0XHRcdHtcblx0XHRcdFx0Y2xhc3Nlc1tjb250ZXh0XVtuYW1lXSA9IGluamVjdGlvbjtcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGZvcihsZXQgbmFtZSBpbiBpbmplY3Rpb25zKVxuXHRcdHtcblx0XHRcdGxldCBpbnN0YW5jZSAgPSB1bmRlZmluZWQ7XG5cdFx0XHRsZXQgaW5qZWN0aW9uID0gY2xhc3Nlc1tjb250ZXh0XVtuYW1lXSB8fCBpbmplY3Rpb25zW25hbWVdO1xuXG5cdFx0XHRpZigvW0EtWl0vLnRlc3QoU3RyaW5nKG5hbWUpWzBdKSlcblx0XHRcdHtcblx0XHRcdFx0aWYoaW5qZWN0aW9uLnByb3RvdHlwZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmKCFvYmplY3RzW2NvbnRleHRdW25hbWVdKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG9iamVjdHNbY29udGV4dF1bbmFtZV0gPSBuZXcgaW5qZWN0aW9uO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRvYmplY3RzW2NvbnRleHRdW25hbWVdID0gaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aW5zdGFuY2UgPSBvYmplY3RzW2NvbnRleHRdW25hbWVdO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRpZihpbmplY3Rpb24ucHJvdG90eXBlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aW5zdGFuY2UgPSBuZXcgaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGluc3RhbmNlID0gaW5qZWN0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBuYW1lLCB7XG5cdFx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0XHR3cml0YWJsZTogICBmYWxzZSxcblx0XHRcdFx0dmFsdWU6ICAgICAgaW5zdGFuY2Vcblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cblx0c3RhdGljIGluamVjdGlvbnMoKVxuXHR7XG5cdFx0cmV0dXJuIHt9O1xuXHR9XG5cblx0c3RhdGljIGNvbnRleHQoKVxuXHR7XG5cdFx0cmV0dXJuICcuJztcblx0fVxuXG5cdHN0YXRpYyBpbmplY3QoaW5qZWN0aW9ucywgY29udGV4dCA9ICcuJylcblx0e1xuXHRcdGlmKCEodGhpcy5wcm90b3R5cGUgaW5zdGFuY2VvZiBJbmplY3RhYmxlIHx8IHRoaXMgPT09IEluamVjdGFibGUpKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGFjY2VzcyBpbmplY3RhYmxlIHN1YmNsYXNzIVxuXG5BcmUgeW91IHRyeWluZyB0byBpbnN0YW50aWF0ZSBsaWtlIHRoaXM/XG5cblx0bmV3IFguaW5qZWN0KHsuLi59KTtcblxuSWYgc28gcGxlYXNlIHRyeTpcblxuXHRuZXcgKFguaW5qZWN0KHsuLi59KSk7XG5cblBsZWFzZSBub3RlIHRoZSBwYXJlbnRoZXNpcy5cbmApO1xuXHRcdH1cblxuXHRcdGxldCBleGlzdGluZ0luamVjdGlvbnMgPSB0aGlzLmluamVjdGlvbnMoKTtcblxuXHRcdHJldHVybiBjbGFzcyBleHRlbmRzIHRoaXMge1xuXHRcdFx0c3RhdGljIGluamVjdGlvbnMoKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgZXhpc3RpbmdJbmplY3Rpb25zLCBpbmplY3Rpb25zKTtcblx0XHRcdH1cblx0XHRcdHN0YXRpYyBjb250ZXh0KClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIGNvbnRleHQ7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxufVxuIiwiY2xhc3MgU2luZ2xlXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHRoaXMubmFtZSA9ICdzc3MuJyArIE1hdGgucmFuZG9tKCk7XG5cdH1cbn1cblxubGV0IHNpbmdsZSA9IG5ldyBTaW5nbGU7XG5cbmV4cG9ydCB7U2luZ2xlLCBzaW5nbGV9OyIsImltcG9ydCB7IEJpbmRhYmxlICAgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9CaW5kYWJsZSc7XG5pbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnLi4vaW5qZWN0L0luamVjdGFibGUnO1xuaW1wb3J0IHsgS2V5Ym9hcmQgICB9IGZyb20gJ2N1cnZhdHVyZS9pbnB1dC9LZXlib2FyZCdcblxuaW1wb3J0IHsgQ29udHJvbGxlciBhcyBPblNjcmVlbkpveVBhZCB9IGZyb20gJy4uL3VpL0NvbnRyb2xsZXInO1xuXG5leHBvcnQgIGNsYXNzIENvbnRyb2xsZXJcbmV4dGVuZHMgSW5qZWN0YWJsZS5pbmplY3Qoe1xuXHRLZXlib2FyZFxuXHQsIE9uU2NyZWVuSm95UGFkXG5cdCwgdHJpZ2dlcnM6IEJpbmRhYmxlLm1ha2VCaW5kYWJsZSh7fSlcblx0LCBheGlzOiAgICAgQmluZGFibGUubWFrZUJpbmRhYmxlKHt9KVxufSl7XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHRLZXlib2FyZC5nZXQoKS5rZXlzLmJpbmRUbygodixrLHQsZCk9Pntcblx0XHRcdGlmKHYgPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmtleVByZXNzKGssdix0W2tdKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih2ID09PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5rZXlSZWxlYXNlKGssdix0W2tdKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cblx0XHR0aGlzLk9uU2NyZWVuSm95UGFkLmFyZ3MuYmluZFRvKCd4JywgKHYpID0+IHtcblx0XHRcdHRoaXMuYXhpc1swXSA9IHYgLyA1MDtcblx0XHR9KTtcblxuXHRcdHRoaXMuT25TY3JlZW5Kb3lQYWQuYXJncy5iaW5kVG8oJ3knLCAodikgPT4ge1xuXHRcdFx0dGhpcy5heGlzWzFdID0gdiAvIDUwO1xuXHRcdH0pO1xuXHR9XG5cblx0a2V5UHJlc3Moa2V5LCB2YWx1ZSwgcHJldilcblx0e1xuXHRcdGlmKC9eWzAtOV0kLy50ZXN0KGtleSkpXG5cdFx0e1xuXHRcdFx0dGhpcy50cmlnZ2Vyc1trZXldID0gdHJ1ZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzd2l0Y2goa2V5KVxuXHRcdHtcblx0XHRcdGNhc2UgJ0Fycm93UmlnaHQnOlxuXHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAxO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dEb3duJzpcblx0XHRcdFx0dGhpcy5heGlzWzFdID0gMTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93TGVmdCc6XG5cdFx0XHRcdHRoaXMuYXhpc1swXSA9IC0xO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0Y2FzZSAnQXJyb3dVcCc6XG5cdFx0XHRcdHRoaXMuYXhpc1sxXSA9IC0xO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblxuXHRrZXlSZWxlYXNlKGtleSwgdmFsdWUsIHByZXYpXG5cdHtcblx0XHRpZigvXlswLTldJC8udGVzdChrZXkpKVxuXHRcdHtcblx0XHRcdHRoaXMudHJpZ2dlcnNba2V5XSA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHN3aXRjaChrZXkpXG5cdFx0e1xuXHRcdFx0Y2FzZSAnQXJyb3dSaWdodCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1swXSA+IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuYXhpc1swXSA9IDA7XG5cdFx0XHRcblx0XHRcdGNhc2UgJ0Fycm93TGVmdCc6XG5cdFx0XHRcdGlmKHRoaXMuYXhpc1swXSA8IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmF4aXNbMF0gPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd0Rvd24nOlxuXHRcdFx0XHRpZih0aGlzLmF4aXNbMV0gPiAwKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5heGlzWzFdID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjYXNlICdBcnJvd1VwJzpcblx0XHRcdFx0aWYodGhpcy5heGlzWzFdIDwgMClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuYXhpc1sxXSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG59XG4iLCJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnLi4vaW5qZWN0L0luamVjdGFibGUnO1xuaW1wb3J0IHsgU3ByaXRlICAgICB9IGZyb20gJy4uL3Nwcml0ZS9TcHJpdGUnO1xuaW1wb3J0IHsgQ29udHJvbGxlciB9IGZyb20gJy4vQ29udHJvbGxlcic7XG5pbXBvcnQgeyBDYW1lcmEgICAgIH0gZnJvbSAnLi4vc3ByaXRlL0NhbWVyYSc7XG5cbmV4cG9ydCBjbGFzcyBFbnRpdHkgZXh0ZW5kcyBJbmplY3RhYmxlLmluamVjdCh7c3ByaXRlOiBTcHJpdGUsIENvbnRyb2xsZXIsIENhbWVyYX0pXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdHRoaXMuc3RhdGUgICAgID0gJ3N0YW5kaW5nJztcblx0fVxuXG5cdGNyZWF0ZSgpXG5cdHtcblx0fVxuXG5cdHNpbXVsYXRlKClcblx0e1xuXHRcdGxldCBzcGVlZCA9IDQ7XG5cblx0XHRsZXQgeEF4aXMgPSB0aGlzLkNvbnRyb2xsZXIuYXhpc1swXSB8fCAwO1xuXHRcdGxldCB5QXhpcyA9IHRoaXMuQ29udHJvbGxlci5heGlzWzFdIHx8IDA7XG5cblx0XHRmb3IobGV0IHQgaW4gdGhpcy5Db250cm9sbGVyLnRyaWdnZXJzKVxuXHRcdHtcblx0XHRcdGlmKCF0aGlzLkNvbnRyb2xsZXIudHJpZ2dlcnNbdF0pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zb2xlLmxvZyh0KTtcblx0XHR9XG5cblx0XHR4QXhpcyA9IE1hdGgubWluKDEsIE1hdGgubWF4KHhBeGlzLCAtMSkpO1xuXHRcdHlBeGlzID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoeUF4aXMsIC0xKSk7XG5cblx0XHR0aGlzLnNwcml0ZS54ICs9IHhBeGlzID4gMFxuXHRcdFx0PyBNYXRoLmNlaWwoc3BlZWQgKiB4QXhpcylcblx0XHRcdDogTWF0aC5mbG9vcihzcGVlZCAqIHhBeGlzKTtcblxuXHRcdHRoaXMuc3ByaXRlLnkgKz0geUF4aXMgPiAwXG5cdFx0XHQ/IE1hdGguY2VpbChzcGVlZCAqIHlBeGlzKVxuXHRcdFx0OiBNYXRoLmZsb29yKHNwZWVkICogeUF4aXMpO1xuXG5cdFx0dGhpcy5DYW1lcmEueCA9IHRoaXMuc3ByaXRlLng7XG5cdFx0dGhpcy5DYW1lcmEueSA9IHRoaXMuc3ByaXRlLnk7XG5cblx0XHRsZXQgaG9yaXpvbnRhbCA9IGZhbHNlO1xuXG5cdFx0aWYoTWF0aC5hYnMoeEF4aXMpID4gTWF0aC5hYnMoeUF4aXMpKVxuXHRcdHtcblx0XHRcdGhvcml6b250YWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmKGhvcml6b250YWwpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnd2VzdCc7XG5cblx0XHRcdGlmKHhBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnZWFzdCc7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc3RhdGUgPSAnd2Fsa2luZyc7XG5cdFx0XHRcblx0XHR9XG5cdFx0ZWxzZSBpZih5QXhpcylcblx0XHR7XG5cdFx0XHR0aGlzLmRpcmVjdGlvbiA9ICdub3J0aCc7XG5cblx0XHRcdGlmKHlBeGlzID4gMClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5kaXJlY3Rpb24gPSAnc291dGgnO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXRlID0gJ3dhbGtpbmcnO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5zdGF0ZSA9ICdzdGFuZGluZyc7XG5cdFx0fVxuXG5cdFx0Ly8gaWYoIXhBeGlzICYmICF5QXhpcylcblx0XHQvLyB7XG5cdFx0Ly8gXHR0aGlzLmRpcmVjdGlvbiA9ICdzb3V0aCc7XG5cdFx0Ly8gfVxuXG5cdFx0bGV0IGZyYW1lcztcblxuXHRcdGlmKGZyYW1lcyA9IHRoaXMuc3ByaXRlW3RoaXMuc3RhdGVdW3RoaXMuZGlyZWN0aW9uXSlcblx0XHR7XG5cdFx0XHR0aGlzLnNwcml0ZS5zZXRGcmFtZXMoZnJhbWVzKTtcblx0XHR9XG5cdH1cblxuXHRkZXN0cm95KClcblx0e1xuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudW5pZm9ybSB2ZWM0ICAgICAgdV9jb2xvcjtcXG52YXJ5aW5nIHZlYzIgICAgICB2X3RleENvb3JkO1xcblxcbnZvaWQgbWFpbigpIHtcXG4gICAvLyBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodV9pbWFnZSwgdl90ZXhDb29yZCk7XFxuICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgxLjAsIDEuMCwgMC4wLCAwLjI1KTtcXG59XFxuXCIiLCJtb2R1bGUuZXhwb3J0cyA9IFwiYXR0cmlidXRlIHZlYzIgYV9wb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhX3RleENvb3JkO1xcblxcbnVuaWZvcm0gICB2ZWMyIHVfcmVzb2x1dGlvbjtcXG5cXG52YXJ5aW5nICAgdmVjMiB2X3RleENvb3JkO1xcblxcbnZvaWQgbWFpbigpXFxue1xcbiAgIHZlYzIgemVyb1RvT25lID0gYV9wb3NpdGlvbiAvIHVfcmVzb2x1dGlvbjtcXG4gICB2ZWMyIHplcm9Ub1R3byA9IHplcm9Ub09uZSAqIDIuMDtcXG4gICB2ZWMyIGNsaXBTcGFjZSA9IHplcm9Ub1R3byAtIDEuMDtcXG5cXG4gICBnbF9Qb3NpdGlvbiA9IHZlYzQoY2xpcFNwYWNlICogdmVjMigxLCAtMSksIDAsIDEpO1xcbiAgIHZfdGV4Q29vcmQgID0gYV90ZXhDb29yZDtcXG59XFxuXCIiLCJpbXBvcnQgeyBCaW5kYWJsZSAgICB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcbmltcG9ydCB7IEdsMmQgICAgICAgIH0gZnJvbSAnLi4vZ2wyZC9HbDJkJztcbmltcG9ydCB7IEluamVjdGFibGUgIH0gZnJvbSAnLi4vaW5qZWN0L0luamVjdGFibGUnO1xuXG5pbXBvcnQgeyBTdXJmYWNlICAgICB9IGZyb20gJy4vU3VyZmFjZSc7XG5pbXBvcnQgeyBDYW1lcmEgICAgICB9IGZyb20gJy4vQ2FtZXJhJztcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi9TcHJpdGVTaGVldCc7XG5cbmV4cG9ydCAgY2xhc3MgQmFja2dyb3VuZFxuZXh0ZW5kcyBJbmplY3RhYmxlLmluamVjdCh7R2wyZCwgQ2FtZXJhfSlcbntcblx0Y29uc3RydWN0b3IoZ2wyZCwgbWFwLCBsYXllciA9IDApXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0QmluZGFibGUubWFrZUJpbmRhYmxlKHRoaXMpO1xuXG5cdFx0dGhpcy5wYW5lcyAgICAgICA9IFtdO1xuXHRcdHRoaXMucGFuZXNYWSAgICAgPSB7fTtcblx0XHR0aGlzLm1heFBhbmVzICAgID0gOTtcblxuXHRcdHRoaXMuc3VyZmFjZVggICAgPSA1O1xuXHRcdHRoaXMuc3VyZmFjZVkgICAgPSA1O1xuXG5cdFx0dGhpcy5zcHJpdGVTaGVldCA9IG5ldyBTcHJpdGVTaGVldDtcblxuXHRcdHRoaXMudGlsZVdpZHRoICAgPSAzMjtcblx0XHR0aGlzLnRpbGVIZWlnaHQgID0gMzI7XG5cblx0XHR0aGlzLm1hcCAgICAgICAgID0gbWFwO1xuXHRcdHRoaXMubGF5ZXIgICAgICAgPSBsYXllcjtcblx0fVxuXG5cdHJlbmRlclBhbmUoeCwgeSwgZm9yY2VVcGRhdGUpXG5cdHtcblx0XHRsZXQgcGFuZTtcblx0XHRjb25zdCBnbDJkID0gdGhpcy5HbDJkO1xuXG5cdFx0bGV0IHBhbmVYICA9IHggKiAodGhpcy50aWxlV2lkdGggKiB0aGlzLnN1cmZhY2VYKTtcblx0XHRsZXQgcGFuZVkgID0geSAqICh0aGlzLnRpbGVIZWlnaHQgKiB0aGlzLnN1cmZhY2VZKTtcblxuXHRcdGlmKHRoaXMucGFuZXNYWVtwYW5lWF0gJiYgdGhpcy5wYW5lc1hZW3BhbmVYXVtwYW5lWV0pXG5cdFx0e1xuXHRcdFx0cGFuZSA9IHRoaXMucGFuZXNYWVtwYW5lWF1bcGFuZVldO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0cGFuZSA9IG5ldyBTdXJmYWNlKFxuXHRcdFx0XHRnbDJkXG5cdFx0XHRcdCwgdGhpcy5tYXBcblx0XHRcdFx0LCB0aGlzLnN1cmZhY2VYXG5cdFx0XHRcdCwgdGhpcy5zdXJmYWNlWVxuXHRcdFx0XHQsIHBhbmVYXG5cdFx0XHRcdCwgcGFuZVlcblx0XHRcdFx0LCB0aGlzLmxheWVyXG5cdFx0XHQpO1xuXG5cdFx0XHRpZighdGhpcy5wYW5lc1hZW3BhbmVYXSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5wYW5lc1hZW3BhbmVYXSA9IHt9O1xuXHRcdFx0fVxuXG5cdFx0XHRpZighdGhpcy5wYW5lc1hZW3BhbmVYXVtwYW5lWV0pXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMucGFuZXNYWVtwYW5lWF1bcGFuZVldID0gcGFuZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnBhbmVzLnVuc2hpZnQocGFuZSk7XG5cblx0XHRpZih0aGlzLnBhbmVzLmxlbmd0aCA+IHRoaXMubWF4UGFuZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5wYW5lcy5wb3AoKTtcblx0XHR9XG5cdH1cblxuXHRkcmF3KClcblx0e1xuXHRcdGNvbnN0IGNlbnRlclggPSBNYXRoLmZsb29yKFxuXHRcdFx0dGhpcy5DYW1lcmEueCAvICh0aGlzLnN1cmZhY2VYICogdGhpcy50aWxlV2lkdGgpXG5cdFx0KTtcblx0XHRjb25zdCBjZW50ZXJZID0gTWF0aC5mbG9vcihcblx0XHRcdHRoaXMuQ2FtZXJhLnkgLyAodGhpcy5zdXJmYWNlWSAqIHRoaXMudGlsZUhlaWdodClcblx0XHQpO1xuXG5cdFx0bGV0IHJhbmdlID0gWy0xLDAsMV07XG5cdFx0Ly8gbGV0IHJhbmdlID0gWy0yLC0xLDAsMSwyXTtcblxuXHRcdGZvcihsZXQgeCBpbiByYW5nZSlcblx0XHR7XG5cdFx0XHRmb3IobGV0IHkgaW4gcmFuZ2UpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMucmVuZGVyUGFuZShjZW50ZXJYICsgcmFuZ2VbeF0sIGNlbnRlclkgKyByYW5nZVt5XSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5wYW5lcy5tYXAoKHApPT57XG5cdFx0XHRwLmRyYXcoKTtcblx0XHR9KTtcblx0fVxuXG5cdHJlc2l6ZSh4LCB5KVxuXHR7XG5cdFx0Zm9yKGxldCBpIGluIHRoaXMucGFuZXNYWSlcblx0XHR7XG5cdFx0XHRmb3IobGV0IGogaW4gdGhpcy5wYW5lc1hZW2ldKVxuXHRcdFx0e1xuXHRcdFx0XHRkZWxldGUgdGhpcy5wYW5lc1hZW2ldW2pdO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHdoaWxlKHRoaXMucGFuZXMubGVuZ3RoKVxuXHRcdHtcblx0XHRcdHRoaXMucGFuZXMucG9wKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zdXJmYWNlWCA9IE1hdGguY2VpbCh4IC8gdGhpcy50aWxlV2lkdGgpO1xuXHRcdHRoaXMuc3VyZmFjZVkgPSBNYXRoLmNlaWwoeSAvIHRoaXMudGlsZUhlaWdodCk7XG5cblx0XHR0aGlzLmRyYXcoKTtcblx0fVxuXG5cdHNpbXVsYXRlKClcblx0e1xuXHRcdFxuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQ2FtZXJhXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHRoaXMueCA9IDA7XG5cdFx0dGhpcy55ID0gMDtcblxuXHRcdHRoaXMud2lkdGggID0gMDtcblx0XHR0aGlzLmhlaWdodCA9IDA7XG5cdH1cbn1cbiIsImltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi9TcHJpdGVTaGVldCc7XG5cbmltcG9ydCB7IEdsMmQgICAgICAgIH0gZnJvbSAnLi4vZ2wyZC9HbDJkJztcbmltcG9ydCB7IEluamVjdGFibGUgIH0gZnJvbSAnLi4vaW5qZWN0L0luamVjdGFibGUnO1xuaW1wb3J0IHsgQ2FtZXJhICAgICAgfSBmcm9tICcuL0NhbWVyYSc7XG5cbmV4cG9ydCBjbGFzcyBTcHJpdGUgZXh0ZW5kcyBJbmplY3RhYmxlLmluamVjdCh7R2wyZCwgQ2FtZXJhLCBTcHJpdGVTaGVldH0pXG57XG5cdGNvbnN0cnVjdG9yKGltYWdlU3JjKVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMueiAgICAgID0gMDtcblx0XHR0aGlzLnggICAgICA9IDA7XG5cdFx0dGhpcy55ICAgICAgPSAwO1xuXG5cdFx0dGhpcy53aWR0aCAgPSAwO1xuXHRcdHRoaXMuaGVpZ2h0ID0gMDtcblx0XHR0aGlzLnNjYWxlICA9IDE7XG5cblx0XHR0aGlzLmZyYW1lcyAgICAgICAgPSBbXTtcblx0XHR0aGlzLmZyYW1lRGVsYXkgICAgPSA0O1xuXHRcdHRoaXMuY3VycmVudERlbGF5ICA9IHRoaXMuZnJhbWVEZWxheTtcblx0XHR0aGlzLmN1cnJlbnRGcmFtZSAgPSAwO1xuXHRcdHRoaXMuY3VycmVudEZyYW1lcyA9ICcnO1xuXG5cdFx0dGhpcy5zcGVlZCAgICA9IDA7XG5cdFx0dGhpcy5tYXhTcGVlZCA9IDg7XG5cblx0XHR0aGlzLm1vdmluZyA9IGZhbHNlO1xuXG5cdFx0dGhpcy5SSUdIVFx0PSAwO1xuXHRcdHRoaXMuRE9XTlx0PSAxO1xuXHRcdHRoaXMuTEVGVFx0PSAyO1xuXHRcdHRoaXMuVVBcdFx0PSAzO1xuXG5cdFx0dGhpcy5FQVNUXHQ9IHRoaXMuUklHSFQ7XG5cdFx0dGhpcy5TT1VUSFx0PSB0aGlzLkRPV047XG5cdFx0dGhpcy5XRVNUXHQ9IHRoaXMuTEVGVDtcblx0XHR0aGlzLk5PUlRIXHQ9IHRoaXMuVVA7XG5cblx0XHR0aGlzLnN0YW5kaW5nID0ge1xuXHRcdFx0J25vcnRoJzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX25vcnRoLnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ3NvdXRoJzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX3NvdXRoLnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ3dlc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdlYXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XVxuXHRcdH07XG5cblx0XHR0aGlzLndhbGtpbmcgPSB7XG5cdFx0XHQnbm9ydGgnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ19ub3J0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX25vcnRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX25vcnRoLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfbm9ydGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfbm9ydGgyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX25vcnRoLnBuZydcblx0XHRcdF1cblx0XHRcdCwgJ3NvdXRoJzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfc291dGgucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19zb3V0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19zb3V0aC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3NvdXRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3NvdXRoMi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19zb3V0aC5wbmcnXG5cblx0XHRcdF1cblx0XHRcdCwgJ3dlc3QnOiBbXG5cdFx0XHRcdCdwbGF5ZXJfd2Fsa2luZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfd2VzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ193ZXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ193ZXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX3dlc3QyLnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX3dlc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfd2VzdC5wbmcnXG5cdFx0XHRdXG5cdFx0XHQsICdlYXN0JzogW1xuXHRcdFx0XHQncGxheWVyX3dhbGtpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl93YWxraW5nX2Vhc3QucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfc3RhbmRpbmdfZWFzdC5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3dhbGtpbmdfZWFzdDIucG5nJ1xuXHRcdFx0XHQsICdwbGF5ZXJfd2Fsa2luZ19lYXN0Mi5wbmcnXG5cdFx0XHRcdCwgJ3BsYXllcl9zdGFuZGluZ19lYXN0LnBuZydcblx0XHRcdFx0LCAncGxheWVyX3N0YW5kaW5nX2Vhc3QucG5nJ1xuXHRcdFx0XVxuXHRcdH07XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuR2wyZC5jb250ZXh0O1xuXG5cdFx0Z2wudmVydGV4QXR0cmliUG9pbnRlcihcblx0XHRcdHRoaXMuR2wyZC5wb3NpdGlvbkxvY2F0aW9uXG5cdFx0XHQsIDJcblx0XHRcdCwgZ2wuRkxPQVRcblx0XHRcdCwgZmFsc2Vcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdHRoaXMudGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGV4dHVyZSk7XG5cblx0XHRjb25zdCByID0gKCk9PnBhcnNlSW50KE1hdGgucmFuZG9tKCkqMjU1KTtcblxuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCAxXG5cdFx0XHQsIDFcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbmV3IFVpbnQ4QXJyYXkoW3IoKSwgcigpLCAwLCAyNTVdKVxuXHRcdCk7XG5cblx0XHR0aGlzLlNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oKHNoZWV0KT0+e1xuXHRcdFx0Y29uc3QgZnJhbWUgPSB0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKGltYWdlU3JjKTtcblxuXHRcdFx0aWYoZnJhbWUpXG5cdFx0XHR7XG5cdFx0XHRcdFNwcml0ZS5sb2FkVGV4dHVyZSh0aGlzLkdsMmQsIHRoaXMuU3ByaXRlU2hlZXQsIGZyYW1lKS50aGVuKChhcmdzKT0+e1xuXHRcdFx0XHRcdHRoaXMudGV4dHVyZSA9IGFyZ3MudGV4dHVyZTtcblx0XHRcdFx0XHR0aGlzLndpZHRoICAgPSBhcmdzLmltYWdlLndpZHRoICogdGhpcy5zY2FsZTtcblx0XHRcdFx0XHR0aGlzLmhlaWdodCAgPSBhcmdzLmltYWdlLmhlaWdodCAqIHRoaXMuc2NhbGU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHR0aGlzLmZyYW1lRGVsYXkgPSB0aGlzLm1heFNwZWVkIC0gTWF0aC5hYnModGhpcy5zcGVlZCk7XG5cdFx0aWYodGhpcy5mcmFtZURlbGF5ID4gdGhpcy5tYXhTcGVlZClcblx0XHR7XG5cdFx0XHR0aGlzLmZyYW1lRGVsYXkgPSB0aGlzLm1heFNwZWVkO1xuXHRcdH1cblxuXHRcdGlmKHRoaXMuY3VycmVudERlbGF5IDw9IDApXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXkgPSB0aGlzLmZyYW1lRGVsYXk7XG5cdFx0XHR0aGlzLmN1cnJlbnRGcmFtZSsrO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RGVsYXktLTtcblx0XHR9XG5cblx0XHRpZih0aGlzLmN1cnJlbnRGcmFtZSA+PSB0aGlzLmZyYW1lcy5sZW5ndGgpXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJyZW50RnJhbWUgPSB0aGlzLmN1cnJlbnRGcmFtZSAtIHRoaXMuZnJhbWVzLmxlbmd0aDtcblx0XHR9XG5cblx0XHRjb25zdCBmcmFtZSA9IHRoaXMuZnJhbWVzWyB0aGlzLmN1cnJlbnRGcmFtZSBdO1xuXG5cdFx0aWYoZnJhbWUpXG5cdFx0e1xuXHRcdFx0dGhpcy50ZXh0dXJlID0gZnJhbWUudGV4dHVyZTtcblxuXHRcdFx0dGhpcy53aWR0aCAgPSBmcmFtZS53aWR0aCAqIHRoaXMuc2NhbGU7XG5cdFx0XHR0aGlzLmhlaWdodCA9IGZyYW1lLmhlaWdodCAqIHRoaXMuc2NhbGU7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZ2wgPSB0aGlzLkdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgbnVsbCk7XG5cblx0XHRnbC51c2VQcm9ncmFtKHRoaXMuR2wyZC5wcm9ncmFtKTtcblxuXHRcdGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHRoaXMuR2wyZC5wb3NpdGlvbkxvY2F0aW9uKTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGV4dHVyZSk7XG5cdFx0Z2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy5HbDJkLnRleENvb3JkTG9jYXRpb24pO1xuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLkdsMmQudGV4Q29vcmRCdWZmZXIpO1xuXG5cdFx0Z2wudmVydGV4QXR0cmliUG9pbnRlcihcblx0XHRcdHRoaXMuR2wyZC50ZXhDb29yZExvY2F0aW9uXG5cdFx0XHQsIDJcblx0XHRcdCwgZ2wuRkxPQVRcblx0XHRcdCwgZmFsc2Vcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLkdsMmQudGV4Q29vcmRCdWZmZXIpO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdDAuMCwgIDAuMCxcblx0XHRcdDEuMCwgIDAuMCxcblx0XHRcdDAuMCwgIDEuMCxcblx0XHRcdDAuMCwgIDEuMCxcblx0XHRcdDEuMCwgIDAuMCxcblx0XHRcdDEuMCwgIDEuMCxcblx0XHRdKSwgZ2wuU1RSRUFNX0RSQVcpO1xuXG5cdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHR0aGlzLnggICAtIChcblx0XHRcdFx0dGhpcy5DYW1lcmEueFxuXHRcdFx0XHQtIHRoaXMuQ2FtZXJhLndpZHRoIC8gMlxuXHRcdFx0KSAtICgxNiAqIHRoaXMuc2NhbGUpXG5cdFx0XHQsIHRoaXMueSAtIChcblx0XHRcdFx0dGhpcy5DYW1lcmEueVxuXHRcdFx0XHQtIHRoaXMuQ2FtZXJhLmhlaWdodCAvMlxuXHRcdFx0KSAtICh0aGlzLmhlaWdodCAvMikgLSAoMTYgKiB0aGlzLnNjYWxlKVxuXG5cdFx0XHQsIHRoaXMud2lkdGhcblx0XHRcdCwgdGhpcy5oZWlnaHRcblx0XHQpO1xuXG5cdFx0Z2wudW5pZm9ybTRmKFxuXHRcdFx0dGhpcy5HbDJkLmNvbG9yTG9jYXRpb25cblx0XHRcdCwgMVxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHRcdCwgMVxuXHRcdCk7XG5cbiAgICAgICAgZ2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHR9XG5cblx0c2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpXG5cdHtcblx0XHRsZXQgZnJhbWVzSWQgPSBmcmFtZVNlbGVjdG9yLmpvaW4oJyAnKTtcblxuXHRcdGlmKHRoaXMuY3VycmVudEZyYW1lcyA9PT0gZnJhbWVzSWQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMuY3VycmVudEZyYW1lcyA9IGZyYW1lc0lkO1xuXG5cdFx0dGhpcy5TcHJpdGVTaGVldC5yZWFkeS50aGVuKChzaGVldCk9PntcblxuXHRcdFx0Y29uc3QgZnJhbWVzID0gc2hlZXQuZ2V0RnJhbWVzKGZyYW1lU2VsZWN0b3IpLm1hcCgoZnJhbWUpPT57XG5cblx0XHRcdFx0cmV0dXJuIFNwcml0ZS5sb2FkVGV4dHVyZSh0aGlzLkdsMmQsIHRoaXMuU3ByaXRlU2hlZXQsIGZyYW1lKS50aGVuKChhcmdzKT0+e1xuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHR0ZXh0dXJlOiAgYXJncy50ZXh0dXJlXG5cdFx0XHRcdFx0XHQsIHdpZHRoOiAgYXJncy5pbWFnZS53aWR0aFxuXHRcdFx0XHRcdFx0LCBoZWlnaHQ6IGFyZ3MuaW1hZ2UuaGVpZ2h0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0fSk7XG5cblx0XHRcdFByb21pc2UuYWxsKGZyYW1lcykudGhlbigoZnJhbWVzKT0+e1xuXHRcdFx0XHR0aGlzLmZyYW1lcyA9IGZyYW1lcztcblx0XHRcdH0pO1xuXG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgbG9hZFRleHR1cmUoZ2wyZCwgc3ByaXRlU2hlZXQsIGltYWdlU3JjKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSBnbDJkLmNvbnRleHQ7XG5cblx0XHRpZighdGhpcy5wcm9taXNlcylcblx0XHR7XG5cdFx0XHR0aGlzLnByb21pc2VzID0ge307XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5wcm9taXNlc1tpbWFnZVNyY10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvbWlzZXNbaW1hZ2VTcmNdO1xuXHRcdH1cblxuXHRcdC8vIGNvbnNvbGUubG9nKGltYWdlU3JjKTtcblxuXHRcdHRoaXMucHJvbWlzZXNbaW1hZ2VTcmNdID0gU3ByaXRlLmxvYWRJbWFnZShpbWFnZVNyYykudGhlbigoaW1hZ2UpPT57XG5cdFx0XHRjb25zdCB0ZXh0dXJlID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0XHRnbC5iaW5kVGV4dHVyZShnbC5URVhUVVJFXzJELCB0ZXh0dXJlKTtcblxuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcblxuXHRcdFx0Z2wudGV4SW1hZ2UyRChcblx0XHRcdFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0XHQsIDBcblx0XHRcdFx0LCBnbC5SR0JBXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdFx0LCBpbWFnZVxuXHRcdFx0KTtcblxuXHRcdFx0cmV0dXJuIHtpbWFnZSwgdGV4dHVyZX1cblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLnByb21pc2VzW2ltYWdlU3JjXTtcblx0fVxuXG5cdHN0YXRpYyBsb2FkSW1hZ2Uoc3JjKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChhY2NlcHQsIHJlamVjdCk9Pntcblx0XHRcdGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG5cdFx0XHRpbWFnZS5zcmMgICA9IHNyYztcblx0XHRcdGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoZXZlbnQpPT57XG5cdFx0XHRcdGFjY2VwdChpbWFnZSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLkdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLkdsMmQucG9zaXRpb25CdWZmZXIpO1xuXG5cdFx0dmFyIHgxID0geDtcblx0XHR2YXIgeDIgPSB4ICsgd2lkdGg7XG5cdFx0dmFyIHkxID0geTtcblx0XHR2YXIgeTIgPSB5ICsgaGVpZ2h0O1xuXHRcdFxuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdHgxLCB5MSxcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgxLCB5Mixcblx0XHRcdHgyLCB5MSxcblx0XHRcdHgyLCB5Mixcblx0XHRdKSwgZ2wuU1RSRUFNX0RSQVcpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBCYWcgICAgICAgICB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JhZyc7XG5pbXBvcnQgeyBCaW5kYWJsZSAgICB9IGZyb20gJ2N1cnZhdHVyZS9iYXNlL0JpbmRhYmxlJztcblxuaW1wb3J0IHsgU3ByaXRlICAgICAgfSBmcm9tICcuL1Nwcml0ZSc7XG5pbXBvcnQgeyBTcHJpdGVTaGVldCB9IGZyb20gJy4vU3ByaXRlU2hlZXQnO1xuaW1wb3J0IHsgRW50aXR5ICAgICAgfSBmcm9tICcuLi9tb2RlbC9FbnRpdHknO1xuaW1wb3J0IHsgQmFja2dyb3VuZCAgfSBmcm9tICcuL0JhY2tncm91bmQnO1xuXG5pbXBvcnQgeyBJbmplY3RhYmxlICB9IGZyb20gJy4uL2luamVjdC9JbmplY3RhYmxlJztcblxuaW1wb3J0IHsgR2wyZCAgICAgICAgfSBmcm9tICcuLi9nbDJkL0dsMmQnO1xuaW1wb3J0IHsgQ2FtZXJhICAgICAgfSBmcm9tICcuL0NhbWVyYSc7XG5cbmV4cG9ydCBjbGFzcyBTcHJpdGVCb2FyZCBleHRlbmRzIEdsMmQuaW5qZWN0KHtDYW1lcmF9KVxue1xuXHRjb25zdHJ1Y3RvcihlbGVtZW50LCBtYXApXG5cdHtcblx0XHRzdXBlcihlbGVtZW50KTtcblxuXHRcdHRoaXMubWFwID0gbWFwO1xuXG5cdFx0bmV3IChJbmplY3RhYmxlLmluamVjdCh7R2wyZDogdGhpc30pKTtcblxuXHRcdHRoaXMubW91c2UgPSB7XG5cdFx0XHR4OiAgICAgICAgbnVsbFxuXHRcdFx0LCB5OiAgICAgIG51bGxcblx0XHRcdCwgY2xpY2tYOiBudWxsXG5cdFx0XHQsIGNsaWNrWTogbnVsbFxuXHRcdH07XG5cblx0XHR0aGlzLnNwcml0ZXMgPSBuZXcgQmFnO1xuXG5cdFx0dGhpcy5DYW1lcmEud2lkdGggID0gdGhpcy5lbGVtZW50LndpZHRoO1xuXHRcdHRoaXMuQ2FtZXJhLmhlaWdodCA9IHRoaXMuZWxlbWVudC5oZWlnaHQ7XG5cblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblxuXHRcdGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xuXHRcdGdsLmVuYWJsZShnbC5CTEVORCk7XG5cblx0XHR0aGlzLnByb2dyYW0gPSB0aGlzLmNyZWF0ZVByb2dyYW0oXG5cdFx0XHR0aGlzLmNyZWF0ZVNoYWRlcignc3ByaXRlL3RleHR1cmUudmVydCcpXG5cdFx0XHQsIHRoaXMuY3JlYXRlU2hhZGVyKCdzcHJpdGUvdGV4dHVyZS5mcmFnJylcblx0XHQpO1xuXG5cdFx0dGhpcy5vdmVybGF5UHJvZ3JhbSA9IHRoaXMuY3JlYXRlUHJvZ3JhbShcblx0XHRcdHRoaXMuY3JlYXRlU2hhZGVyKCdvdmVybGF5L292ZXJsYXkudmVydCcpXG5cdFx0XHQsIHRoaXMuY3JlYXRlU2hhZGVyKCdvdmVybGF5L292ZXJsYXkuZnJhZycpXG5cdFx0KTtcblxuXHRcdHRoaXMucG9zaXRpb25Mb2NhdGlvbiAgID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5wcm9ncmFtLCBcImFfcG9zaXRpb25cIik7XG5cdFx0dGhpcy50ZXhDb29yZExvY2F0aW9uICAgPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLnByb2dyYW0sIFwiYV90ZXhDb29yZFwiKTtcblxuXHRcdHRoaXMucmVzb2x1dGlvbkxvY2F0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgXCJ1X3Jlc29sdXRpb25cIik7XG5cdFx0dGhpcy5jb2xvckxvY2F0aW9uICAgICAgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCBcInVfY29sb3JcIik7XG5cblx0XHR0aGlzLm92ZXJsYXlQb3NpdGlvbiAgID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5vdmVybGF5UHJvZ3JhbSwgXCJhX3Bvc2l0aW9uXCIpO1xuXHRcdHRoaXMub3ZlcmxheVJlc29sdXRpb24gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5vdmVybGF5UHJvZ3JhbSwgXCJ1X3Jlc29sdXRpb25cIik7XG5cdFx0dGhpcy5vdmVybGF5Q29sb3IgICAgICA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLm92ZXJsYXlQcm9ncmFtLCBcInVfY29sb3JcIik7XG5cblx0XHR0aGlzLnBvc2l0aW9uQnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG5cdFx0dGhpcy50ZXhDb29yZEJ1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuXG5cdFx0Z2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMudGV4Q29vcmRCdWZmZXIpO1xuXHRcdGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KFtcblx0XHRcdDAuMCwgIDAuMCxcblx0XHRcdDEuMCwgIDAuMCxcblx0XHRcdDAuMCwgIDEuMCxcblx0XHRcdDAuMCwgIDEuMCxcblx0XHRcdDEuMCwgIDAuMCxcblx0XHRcdDEuMCwgIDEuMCxcblx0XHRdKSwgZ2wuU1RBVElDX0RSQVcpO1xuXG5cdFx0Z2wudmlld3BvcnQoMCwgMCwgZ2wuY2FudmFzLndpZHRoLCBnbC5jYW52YXMuaGVpZ2h0KTtcblxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHQnbW91c2Vtb3ZlJywgKGV2ZW50KT0+e1xuXHRcdFx0XHR0aGlzLm1vdXNlLnggPSBldmVudC5jbGllbnRYO1xuXHRcdFx0XHR0aGlzLm1vdXNlLnkgPSBldmVudC5jbGllbnRZO1xuXG5cdFx0XHRcdC8vIHRoaXMubW92ZUNhbWVyYShcblx0XHRcdFx0Ly8gXHQtdGhpcy5tb3VzZS54ICsgZ2wuY2FudmFzLndpZHRoLzJcblx0XHRcdFx0Ly8gXHQsIC10aGlzLm1vdXNlLnkgKyBnbC5jYW52YXMuaGVpZ2h0LzJcblx0XHRcdFx0Ly8gKTtcblx0XHRcdH1cblx0XHQpO1xuXG5cdFx0dGhpcy5zZWxlY3RlZCA9IHtcblx0XHRcdGxvY2FsWDogICAgbnVsbFxuXHRcdFx0LCBsb2NhbFk6ICBudWxsXG5cdFx0XHQsIGdsb2JhbFg6IG51bGxcblx0XHRcdCwgZ2xvYmFsWTogbnVsbFxuXHRcdFx0LCBzdGFydEdsb2JhbFg6IG51bGxcblx0XHRcdCwgc3RhcnRHbG9iYWxZOiBudWxsXG5cdFx0fTtcblxuXHRcdHRoaXMuc2VsZWN0ZWQgPSBCaW5kYWJsZS5tYWtlQmluZGFibGUodGhpcy5zZWxlY3RlZCk7XG5cblx0XHRsZXQgc2VsZWN0aW5nID0gZmFsc2U7XG5cdFx0bGV0IHRpbGVTaXplICA9IDMyO1xuXG5cdFx0Ly8gdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIChldmVudCk9Pntcblx0XHQvLyBcdGxldCBtb2RTaXplICAgPSB0aWxlU2l6ZSAqIHRoaXMuem9vbUxldmVsO1xuXG5cdFx0Ly8gXHRpZih0aGlzLnVuc2VsZWN0KCkpXG5cdFx0Ly8gXHR7XG5cdFx0Ly8gXHRcdHNlbGVjdGluZyA9IGZhbHNlO1xuXHRcdC8vIFx0XHRyZXR1cm47XG5cdFx0Ly8gXHR9XG5cblx0XHQvLyBcdC8vIGNvbnNvbGUubG9nKFxuXHRcdC8vIFx0Ly8gXHRldmVudC5jbGllbnRYXG5cdFx0Ly8gXHQvLyBcdCwgZXZlbnQuY2xpZW50WVxuXHRcdC8vIFx0Ly8gKTtcblxuXHRcdC8vIFx0c2VsZWN0aW5nID0gdHJ1ZTtcblx0XHQvLyBcdHRoaXMubW91c2UuY2xpY2tYID0gZXZlbnQuY2xpZW50WDtcblx0XHQvLyBcdHRoaXMubW91c2UuY2xpY2tZID0gZXZlbnQuY2xpZW50WTtcblxuXHRcdC8vIFx0bGV0IGxvY2FsWCA9IE1hdGguZmxvb3IoKHRoaXMubW91c2UuY2xpY2tYXG5cdFx0Ly8gXHRcdCsgKHRoaXMuQ2FtZXJhLnggJSBtb2RTaXplKVxuXHRcdC8vIFx0XHQtIChNYXRoLmZsb29yKHRoaXMuZWxlbWVudC53aWR0aCAvMikgJSBtb2RTaXplKVxuXHRcdC8vIFx0XHQrIDE2ICAqIHRoaXMuem9vbUxldmVsXG5cdFx0Ly8gXHQpIC8gbW9kU2l6ZSk7XG5cblx0XHQvLyBcdGxldCBsb2NhbFkgPSBNYXRoLmZsb29yKCh0aGlzLm1vdXNlLmNsaWNrWVxuXHRcdC8vIFx0XHQrICh0aGlzLkNhbWVyYS55ICUgbW9kU2l6ZSlcblx0XHQvLyBcdFx0LSAoTWF0aC5mbG9vcih0aGlzLmVsZW1lbnQuaGVpZ2h0IC8yKSAlIG1vZFNpemUpXG5cdFx0Ly8gXHRcdCsgMTYgICogdGhpcy56b29tTGV2ZWxcblx0XHQvLyBcdCkgLyBtb2RTaXplKTtcblxuXHRcdC8vIFx0dGhpcy5zZWxlY3RlZC5zdGFydExvY2FsWCA9IGxvY2FsWDtcblx0XHQvLyBcdHRoaXMuc2VsZWN0ZWQuc3RhcnRMb2NhbFkgPSBsb2NhbFk7XG5cblx0XHQvLyBcdHRoaXMuc2VsZWN0ZWQuc3RhcnRHbG9iYWxYID0gKHRoaXMuc2VsZWN0ZWQuc3RhcnRMb2NhbFhcblx0XHQvLyBcdFx0LSBNYXRoLmZsb29yKE1hdGguZmxvb3IodGhpcy5lbGVtZW50LndpZHRoIC8yKSAvIG1vZFNpemUpXG5cdFx0Ly8gXHRcdCsgKHRoaXMuQ2FtZXJhLnggPCAwXG5cdFx0Ly8gXHRcdFx0PyBNYXRoLmNlaWwodGhpcy5DYW1lcmEueCAqIHRoaXMuem9vbUxldmVsIC8gbW9kU2l6ZSlcblx0XHQvLyBcdFx0XHQ6IE1hdGguZmxvb3IodGhpcy5DYW1lcmEueCAqIHRoaXMuem9vbUxldmVsIC8gbW9kU2l6ZSlcblx0XHQvLyBcdFx0KVxuXHRcdC8vIFx0KTtcblxuXHRcdC8vIFx0dGhpcy5zZWxlY3RlZC5zdGFydEdsb2JhbFkgPSAodGhpcy5zZWxlY3RlZC5zdGFydExvY2FsWVxuXHRcdC8vIFx0XHQtIE1hdGguZmxvb3IoTWF0aC5mbG9vcih0aGlzLmVsZW1lbnQuaGVpZ2h0IC8yKSAvIG1vZFNpemUpXG5cdFx0Ly8gXHRcdCsgKHRoaXMuQ2FtZXJhLnkgPCAwXG5cdFx0Ly8gXHRcdFx0PyBNYXRoLmNlaWwodGhpcy5DYW1lcmEueSAqIHRoaXMuem9vbUxldmVsIC8gbW9kU2l6ZSlcblx0XHQvLyBcdFx0XHQ6IE1hdGguZmxvb3IodGhpcy5DYW1lcmEueSAqIHRoaXMuem9vbUxldmVsIC8gbW9kU2l6ZSlcblx0XHQvLyBcdFx0KVxuXHRcdC8vIFx0KTtcblx0XHQvLyB9KTtcblxuXHRcdC8vIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgKGV2ZW50KT0+e1xuXHRcdC8vIFx0XHRsZXQgbW9kU2l6ZSAgID0gdGlsZVNpemUgKiB0aGlzLnpvb21MZXZlbDtcblxuXHRcdC8vIFx0XHRpZighc2VsZWN0aW5nKVxuXHRcdC8vIFx0XHR7XG5cdFx0Ly8gXHRcdFx0c2VsZWN0aW5nID0gZmFsc2U7XG5cdFx0Ly8gXHRcdFx0cmV0dXJuO1xuXHRcdC8vIFx0XHR9XG5cblx0XHQvLyBcdFx0Y29uc29sZS5sb2coXG5cdFx0Ly8gXHRcdFx0ZXZlbnQuY2xpZW50WFxuXHRcdC8vIFx0XHRcdCwgZXZlbnQuY2xpZW50WVxuXHRcdC8vIFx0XHQpO1xuXG5cdFx0Ly8gXHRcdHRoaXMubW91c2UuY2xpY2tYID0gZXZlbnQuY2xpZW50WDtcblx0XHQvLyBcdFx0dGhpcy5tb3VzZS5jbGlja1kgPSBldmVudC5jbGllbnRZO1xuXG5cdFx0Ly8gXHRcdGxldCBsb2NhbFggPSBNYXRoLmZsb29yKCh0aGlzLm1vdXNlLmNsaWNrWFxuXHRcdC8vIFx0XHRcdCsgKHRoaXMuQ2FtZXJhLnggJSBtb2RTaXplKVxuXHRcdC8vIFx0XHRcdC0gKE1hdGguZmxvb3IodGhpcy5lbGVtZW50LndpZHRoIC8yKSAlIG1vZFNpemUpXG5cdFx0Ly8gXHRcdFx0KyAxNiAgKiB0aGlzLnpvb21MZXZlbFxuXHRcdC8vIFx0XHQpIC8gbW9kU2l6ZSk7XG5cblx0XHQvLyBcdFx0bGV0IGxvY2FsWSA9IE1hdGguZmxvb3IoKHRoaXMubW91c2UuY2xpY2tZXG5cdFx0Ly8gXHRcdFx0KyAodGhpcy5DYW1lcmEueSAlIG1vZFNpemUpXG5cdFx0Ly8gXHRcdFx0LSAoTWF0aC5mbG9vcih0aGlzLmVsZW1lbnQuaGVpZ2h0IC8yKSAlIG1vZFNpemUpXG5cdFx0Ly8gXHRcdFx0KyAxNiAgKiB0aGlzLnpvb21MZXZlbFxuXHRcdC8vIFx0XHQpIC8gbW9kU2l6ZSk7XG5cblx0XHQvLyBcdFx0Y29uc29sZS5sb2cobG9jYWxYLCBsb2NhbFkpO1xuXG5cdFx0Ly8gXHRcdGxldCBnbG9iYWxYID0gKGxvY2FsWFxuXHRcdC8vIFx0XHRcdC0gTWF0aC5mbG9vcihNYXRoLmZsb29yKHRoaXMuZWxlbWVudC53aWR0aCAvMikgLyBtb2RTaXplKVxuXHRcdC8vIFx0XHRcdCsgKHRoaXMuQ2FtZXJhLnggPCAwXG5cdFx0Ly8gXHRcdFx0XHQ/IE1hdGguY2VpbCh0aGlzLkNhbWVyYS54ICogdGhpcy56b29tTGV2ZWwgLyBtb2RTaXplKVxuXHRcdC8vIFx0XHRcdFx0OiBNYXRoLmZsb29yKHRoaXMuQ2FtZXJhLnggKiB0aGlzLnpvb21MZXZlbCAvIG1vZFNpemUpXG5cdFx0Ly8gXHRcdFx0KVxuXHRcdC8vIFx0XHQpO1xuXG5cdFx0Ly8gXHRcdGxldCBnbG9iYWxZID0gKGxvY2FsWVxuXHRcdC8vIFx0XHRcdC0gTWF0aC5mbG9vcihNYXRoLmZsb29yKHRoaXMuZWxlbWVudC5oZWlnaHQgLzIpIC8gbW9kU2l6ZSlcblx0XHQvLyBcdFx0XHQrICh0aGlzLkNhbWVyYS55IDwgMFxuXHRcdC8vIFx0XHRcdFx0PyBNYXRoLmNlaWwodGhpcy5DYW1lcmEueSAqIHRoaXMuem9vbUxldmVsIC8gbW9kU2l6ZSlcblx0XHQvLyBcdFx0XHRcdDogTWF0aC5mbG9vcih0aGlzLkNhbWVyYS55ICogdGhpcy56b29tTGV2ZWwgLyAgbW9kU2l6ZSlcblx0XHQvLyBcdFx0XHQpXG5cdFx0Ly8gXHRcdCk7XG5cblx0XHQvLyBcdFx0dGhpcy5zZWxlY3RlZC5sb2NhbFggID0gbG9jYWxYO1xuXHRcdC8vIFx0XHR0aGlzLnNlbGVjdGVkLmdsb2JhbFggPSBnbG9iYWxYO1xuXHRcdC8vIFx0XHR0aGlzLnNlbGVjdGVkLmxvY2FsWSAgPSBsb2NhbFk7XG5cdFx0Ly8gXHRcdHRoaXMuc2VsZWN0ZWQuZ2xvYmFsWSA9IGdsb2JhbFk7XG5cblx0XHQvLyBcdFx0c2VsZWN0aW5nID0gZmFsc2U7XG5cdFx0Ly8gfSk7XG5cblx0XHR0aGlzLmJhY2tncm91bmQgID0gbmV3IEJhY2tncm91bmQodGhpcywgbWFwKTtcblx0XHR0aGlzLmJhY2tncm91bmQxID0gbmV3IEJhY2tncm91bmQodGhpcywgbWFwLCAxKTtcblxuXHRcdGNvbnN0IHcgPSAxMjgwO1xuXG5cdFx0Zm9yKGNvbnN0IGkgaW4gQXJyYXkoNikuZmlsbCgpKVxuXHRcdHtcblx0XHRcdGNvbnN0IGJhcnJlbCA9IG5ldyBTcHJpdGUoJ2JhcnJlbC5wbmcnKTtcblx0XHRcdFxuXHRcdFx0YmFycmVsLnggPSAoaSAqIDMyKSAlIHc7XG5cdFx0XHRiYXJyZWwueSA9IE1hdGgudHJ1bmMoKGkgKiAzMikgLyB3KSAqIDMyO1xuXHRcblx0XHRcdHRoaXMuc3ByaXRlcy5hZGQodGhpcy5iYWNrZ3JvdW5kKTtcblx0XHRcdHRoaXMuc3ByaXRlcy5hZGQodGhpcy5iYWNrZ3JvdW5kMSk7XG5cdFxuXHRcdFx0dGhpcy5zcHJpdGVzLmFkZChiYXJyZWwpO1xuXHRcdH1cblxuXG5cdFx0Ly8gdGhpcy5zcHJpdGVzLmFkZChuZXcgU3ByaXRlKCdwbGF5ZXJfc3RhbmRpbmdfc291dGgucG5nJykpO1xuXG5cdH1cblxuXHR1bnNlbGVjdCgpXG5cdHtcblx0XHRpZih0aGlzLnNlbGVjdGVkLmxvY2FsWCA9PT0gbnVsbClcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZWxlY3RlZC5sb2NhbFggID0gbnVsbDtcblx0XHR0aGlzLnNlbGVjdGVkLmxvY2FsWSAgPSBudWxsO1xuXHRcdHRoaXMuc2VsZWN0ZWQuZ2xvYmFsWCA9IG51bGw7XG5cdFx0dGhpcy5zZWxlY3RlZC5nbG9iYWxZID0gbnVsbDtcblxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0ZHJhdygpXG5cdHtcblx0XHRjb25zdCBnbCA9IHRoaXMuY29udGV4dDtcblxuXHRcdHN1cGVyLmRyYXcoKTtcblxuXHRcdGdsLnVuaWZvcm0yZihcblx0XHRcdHRoaXMucmVzb2x1dGlvbkxvY2F0aW9uXG5cdFx0XHQsIHRoaXMuQ2FtZXJhLndpZHRoXG5cdFx0XHQsIHRoaXMuQ2FtZXJhLmhlaWdodFxuXHRcdCk7XG5cblx0XHRsZXQgc3ByaXRlcyA9IHRoaXMuc3ByaXRlcy5pdGVtcygpO1xuXG5cdFx0c3ByaXRlcy5tYXAocyA9PiB7XG5cdFx0XHRzLnogPSBzLnlcblx0XHR9KTtcblxuXHRcdHNwcml0ZXMuc29ydCgoYSxiKT0+e1xuXHRcdFx0aWYoKGEgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSAmJiAhKGIgaW5zdGFuY2VvZiBCYWNrZ3JvdW5kKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXG5cdFx0XHRpZigoYiBpbnN0YW5jZW9mIEJhY2tncm91bmQpICYmICEoYSBpbnN0YW5jZW9mIEJhY2tncm91bmQpKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYS56ID09PSB1bmRlZmluZWQpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHRcdGlmKGIueiA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBhLnogLSBiLno7XG5cdFx0fSk7XG5cblx0XHRzcHJpdGVzLm1hcChzID0+IHMuZHJhdygpKTtcblxuXHRcdGlmKHRoaXMuc2VsZWN0ZWQubG9jYWxYID09PSBudWxsKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRnbC51c2VQcm9ncmFtKHRoaXMub3ZlcmxheVByb2dyYW0pO1xuXG5cdFx0Z2wudW5pZm9ybTJmKFxuXHRcdFx0dGhpcy5vdmVybGF5UmVzb2x1dGlvblxuXHRcdFx0LCBnbC5jYW52YXMud2lkdGhcblx0XHRcdCwgZ2wuY2FudmFzLmhlaWdodFxuXHRcdCk7XG5cblx0XHRsZXQgbWluWCA9IHRoaXMuc2VsZWN0ZWQuc3RhcnRHbG9iYWxYO1xuXHRcdGxldCBtYXhYID0gdGhpcy5zZWxlY3RlZC5nbG9iYWxYO1xuXG5cdFx0aWYodGhpcy5zZWxlY3RlZC5nbG9iYWxYIDwgbWluWClcblx0XHR7XG5cdFx0XHRtaW5YID0gdGhpcy5zZWxlY3RlZC5nbG9iYWxYO1xuXHRcdFx0bWF4WCA9IHRoaXMuc2VsZWN0ZWQuc3RhcnRHbG9iYWxYO1xuXHRcdH1cblxuXHRcdGxldCBtaW5ZID0gdGhpcy5zZWxlY3RlZC5zdGFydEdsb2JhbFk7XG5cdFx0bGV0IG1heFkgPSB0aGlzLnNlbGVjdGVkLmdsb2JhbFk7XG5cblx0XHRpZih0aGlzLnNlbGVjdGVkLmdsb2JhbFkgPCBtaW5ZKVxuXHRcdHtcblx0XHRcdG1pblkgPSB0aGlzLnNlbGVjdGVkLmdsb2JhbFk7XG5cdFx0XHRtYXhZID0gdGhpcy5zZWxlY3RlZC5zdGFydEdsb2JhbFk7XG5cdFx0fVxuXG5cdFx0bWF4WCArPSAxO1xuXHRcdG1heFkgKz0gMTtcblxuXHRcdGxldCB0aWxlU2l6ZSA9IDMyO1xuXHRcdGxldCBtb2RTaXplICA9IHRpbGVTaXplICogdGhpcy56b29tTGV2ZWw7XG5cblx0XHQvLyBjb25zb2xlLmxvZyhtaW5YLCBtaW5ZKTtcblxuXHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0KG1pblggKiBtb2RTaXplKVxuXHRcdFx0XHQtIHRoaXMuQ2FtZXJhLnggKiB0aGlzLnpvb21MZXZlbFxuXHRcdFx0XHQrICh0aGlzLmVsZW1lbnQud2lkdGggLzIpXG5cdFx0XHRcdC0gKG1vZFNpemUgLzIpXG5cdFx0XHQsIChtaW5ZICogbW9kU2l6ZSlcblx0XHRcdFx0LSB0aGlzLkNhbWVyYS55ICogdGhpcy56b29tTGV2ZWxcblx0XHRcdFx0KyAodGhpcy5lbGVtZW50LmhlaWdodCAvMilcblx0XHRcdFx0LSAobW9kU2l6ZSAvMilcblx0XHRcdCwgKG1heFggLSBtaW5YKSAqIG1vZFNpemVcblx0XHRcdCwgKG1heFkgLSBtaW5ZKSAqIG1vZFNpemVcblx0XHQpO1xuXG5cdFx0Y29uc29sZS5sb2coKTtcblxuXHRcdGdsLmRyYXdBcnJheXMoZ2wuVFJJQU5HTEVTLCAwLCA2KTtcblx0fVxuXG5cdHJlc2l6ZSh4LCB5KVxuXHR7XG5cdFx0eCA9IHggfHwgdGhpcy5lbGVtZW50LndpZHRoO1xuXHRcdHkgPSB5IHx8IHRoaXMuZWxlbWVudC5oZWlnaHQ7XG5cblx0XHR0aGlzLkNhbWVyYS53aWR0aCAgPSB4O1xuXHRcdHRoaXMuQ2FtZXJhLmhlaWdodCA9IHk7XG5cblx0XHR0aGlzLmJhY2tncm91bmQucmVzaXplKFxuXHRcdFx0TWF0aC5yb3VuZCh4IC8gMiArIDMyKSAgICogKDEgLyB0aGlzLnpvb21MZXZlbClcblx0XHRcdCwgTWF0aC5yb3VuZCh5IC8gMiArIDMyKSAqICgxIC8gdGhpcy56b29tTGV2ZWwpXG5cdFx0KTtcblxuXHRcdHRoaXMuYmFja2dyb3VuZDEucmVzaXplKFxuXHRcdFx0TWF0aC5yb3VuZCh4IC8gMiArIDMyKSAgICogKDEgLyB0aGlzLnpvb21MZXZlbClcblx0XHRcdCwgTWF0aC5yb3VuZCh5IC8gMiArIDMyKSAqICgxIC8gdGhpcy56b29tTGV2ZWwpXG5cdFx0KTtcblxuXHRcdHN1cGVyLnJlc2l6ZSh4LCB5KTtcblxuXHRcdHRoaXMuQ2FtZXJhLndpZHRoICA9ICB4IC8gdGhpcy56b29tTGV2ZWw7XG5cdFx0dGhpcy5DYW1lcmEuaGVpZ2h0ID0gIHkgLyB0aGlzLnpvb21MZXZlbDtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmNvbnRleHQ7XG5cblx0XHRnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5wb3NpdGlvbkJ1ZmZlcik7XG5cblx0XHRnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKFxuXHRcdFx0dGhpcy5vdmVybGF5UG9zaXRpb25cblx0XHRcdCwgMlxuXHRcdFx0LCBnbC5GTE9BVFxuXHRcdFx0LCBmYWxzZVxuXHRcdFx0LCAwXG5cdFx0XHQsIDBcblx0XHQpO1xuXG5cdFx0dmFyIHgxID0geDtcblx0XHR2YXIgeDIgPSB4ICsgd2lkdGg7XG5cdFx0dmFyIHkxID0geTtcblx0XHR2YXIgeTIgPSB5ICsgaGVpZ2h0O1xuXG5cdFx0Z2wuYnVmZmVyRGF0YShnbC5BUlJBWV9CVUZGRVIsIG5ldyBGbG9hdDMyQXJyYXkoW1xuXHRcdFx0eDEsIHkxLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDEsIHkyLFxuXHRcdFx0eDIsIHkxLFxuXHRcdFx0eDIsIHkyLFxuXHRcdF0pLCBnbC5TVFJFQU1fRFJBVyk7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBTcHJpdGVTaGVldFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLmltYWdlVXJsID0gJy9zcHJpdGVzaGVldC5wbmcnO1xuXHRcdHRoaXMuYm94ZXNVcmwgPSAnL3Nwcml0ZXNoZWV0Lmpzb24nO1xuXHRcdHRoaXMudmVydGljZXMgPSB7fTtcblx0XHR0aGlzLmZyYW1lcyAgID0ge307XG5cdFx0dGhpcy53aWR0aCAgICA9IDA7XG5cdFx0dGhpcy5oZWlnaHQgICA9IDA7XG5cblx0XHRsZXQgcmVxdWVzdCAgID0gbmV3IFJlcXVlc3QodGhpcy5ib3hlc1VybCk7XG5cblx0XHRsZXQgc2hlZXRMb2FkZXIgPSBmZXRjaChyZXF1ZXN0KVxuXHRcdC50aGVuKChyZXNwb25zZSk9PnJlc3BvbnNlLmpzb24oKSlcblx0XHQudGhlbigoYm94ZXMpID0+IHRoaXMuYm94ZXMgPSBib3hlcyk7XG5cblx0XHRsZXQgaW1hZ2VMb2FkZXIgPSBuZXcgUHJvbWlzZSgoYWNjZXB0KT0+e1xuXHRcdFx0dGhpcy5pbWFnZSAgICAgICAgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdHRoaXMuaW1hZ2Uuc3JjICAgID0gdGhpcy5pbWFnZVVybDtcblx0XHRcdHRoaXMuaW1hZ2Uub25sb2FkID0gKCk9Pntcblx0XHRcdFx0YWNjZXB0KCk7XG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5yZWFkeSA9IFByb21pc2UuYWxsKFtzaGVldExvYWRlciwgaW1hZ2VMb2FkZXJdKVxuXHRcdC50aGVuKCgpID0+IHRoaXMucHJvY2Vzc0ltYWdlKCkpXG5cdFx0LnRoZW4oKCkgPT4gdGhpcyk7XG5cdH1cblxuXHRwcm9jZXNzSW1hZ2UoKVxuXHR7XG5cdFx0aWYoIXRoaXMuYm94ZXMgfHwgIXRoaXMuYm94ZXMuZnJhbWVzKVxuXHRcdHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBjYW52YXMgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0XHRjYW52YXMud2lkdGggID0gdGhpcy5pbWFnZS53aWR0aDtcblx0XHRjYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZS5oZWlnaHQ7XG5cblx0XHRjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblxuXHRcdGNvbnRleHQuZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIDAsIDApO1xuXG5cdFx0Y29uc3QgZnJhbWVQcm9taXNlcyA9IFtdO1xuXG5cdFx0Zm9yKGxldCBpIGluIHRoaXMuYm94ZXMuZnJhbWVzKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN1YkNhbnZhcyAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblxuXHRcdFx0c3ViQ2FudmFzLndpZHRoICA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnc7XG5cdFx0XHRzdWJDYW52YXMuaGVpZ2h0ID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaDtcblxuXHRcdFx0Y29uc3Qgc3ViQ29udGV4dCA9IHN1YkNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cblx0XHRcdGlmKHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lKVxuXHRcdFx0e1xuXHRcdFx0XHRzdWJDb250ZXh0LnB1dEltYWdlRGF0YShjb250ZXh0LmdldEltYWdlRGF0YShcblx0XHRcdFx0XHR0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS54XG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS55XG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53XG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oXG5cdFx0XHRcdCksIDAsIDApO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0aGlzLmJveGVzLmZyYW1lc1tpXS50ZXh0KVxuXHRcdFx0e1xuXHRcdFx0XHRzdWJDb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmNvbG9yIHx8ICd3aGl0ZSc7XG5cblx0XHRcdFx0c3ViQ29udGV4dC5mb250ID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZm9udFxuXHRcdFx0XHRcdHx8IGAke3RoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLmh9cHggc2Fucy1zZXJpZmA7XG5cdFx0XHRcdHN1YkNvbnRleHQudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cblx0XHRcdFx0c3ViQ29udGV4dC5maWxsVGV4dChcblx0XHRcdFx0XHR0aGlzLmJveGVzLmZyYW1lc1tpXS50ZXh0XG5cdFx0XHRcdFx0LCB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS53IC8gMlxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUuaFxuXHRcdFx0XHRcdCwgdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUud1xuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdHN1YkNvbnRleHQudGV4dEFsaWduID0gbnVsbDtcblx0XHRcdFx0c3ViQ29udGV4dC5mb250ICAgICAgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRmcmFtZVByb21pc2VzLnB1c2gobmV3IFByb21pc2UoKGFjY2VwdCk9Pntcblx0XHRcdFx0c3ViQ2FudmFzLnRvQmxvYigoYmxvYik9Pntcblx0XHRcdFx0XHR0aGlzLmZyYW1lc1t0aGlzLmJveGVzLmZyYW1lc1tpXS5maWxlbmFtZV0gPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXG5cdFx0XHRcdFx0YWNjZXB0KHRoaXMuZnJhbWVzW3RoaXMuYm94ZXMuZnJhbWVzW2ldLmZpbGVuYW1lXSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSkpO1xuXG5cblx0XHRcdC8vIGxldCB1MSA9IHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnggLyB0aGlzLmltYWdlLndpZHRoO1xuXHRcdFx0Ly8gbGV0IHYxID0gdGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueSAvIHRoaXMuaW1hZ2UuaGVpZ2h0O1xuXG5cdFx0XHQvLyBsZXQgdTIgPSAodGhpcy5ib3hlcy5mcmFtZXNbaV0uZnJhbWUueCArIHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLncpXG5cdFx0XHQvLyBcdC8gdGhpcy5pbWFnZS53aWR0aDtcblxuXHRcdFx0Ly8gbGV0IHYyID0gKHRoaXMuYm94ZXMuZnJhbWVzW2ldLmZyYW1lLnkgKyB0aGlzLmJveGVzLmZyYW1lc1tpXS5mcmFtZS5oKVxuXHRcdFx0Ly8gXHQvIHRoaXMuaW1hZ2UuaGVpZ2h0O1xuXG5cdFx0XHQvLyB0aGlzLnZlcnRpY2VzW3RoaXMuYm94ZXMuZnJhbWVzW2ldLmZpbGVuYW1lXSA9IHtcblx0XHRcdC8vIFx0dTEsdjEsdTIsdjJcblx0XHRcdC8vIH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKGZyYW1lUHJvbWlzZXMpO1xuXHR9XG5cblx0Z2V0VmVydGljZXMoZmlsZW5hbWUpXG5cdHtcblx0XHRyZXR1cm4gdGhpcy52ZXJ0aWNlc1tmaWxlbmFtZV07XG5cdH1cblxuXHRnZXRGcmFtZShmaWxlbmFtZSlcblx0e1xuXHRcdHJldHVybiB0aGlzLmZyYW1lc1tmaWxlbmFtZV07XG5cdH1cblxuXHRnZXRGcmFtZXMoZnJhbWVTZWxlY3Rvcilcblx0e1xuXHRcdGlmKEFycmF5LmlzQXJyYXkoZnJhbWVTZWxlY3RvcikpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZyYW1lU2VsZWN0b3IubWFwKChuYW1lKT0+dGhpcy5nZXRGcmFtZShuYW1lKSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuZ2V0RnJhbWVzQnlQcmVmaXgoZnJhbWVTZWxlY3Rvcik7XG5cdH1cblxuXHRnZXRGcmFtZXNCeVByZWZpeChwcmVmaXgpXG5cdHtcblx0XHRsZXQgZnJhbWVzID0gW107XG5cblx0XHRmb3IobGV0IGkgaW4gdGhpcy5mcmFtZXMpXG5cdFx0e1xuXHRcdFx0aWYoaS5zdWJzdHJpbmcoMCwgcHJlZml4Lmxlbmd0aCkgIT09IHByZWZpeClcblx0XHRcdHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGZyYW1lcy5wdXNoKHRoaXMuZnJhbWVzW2ldKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZnJhbWVzO1xuXHR9XG5cblx0c3RhdGljIGxvYWRUZXh0dXJlKGdsMmQsIGltYWdlU3JjKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSBnbDJkLmNvbnRleHQ7XG5cblx0XHRpZighdGhpcy50ZXh0dXJlUHJvbWlzZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy50ZXh0dXJlUHJvbWlzZXMgPSB7fTtcblx0XHR9XG5cblx0XHRpZih0aGlzLnRleHR1cmVQcm9taXNlc1tpbWFnZVNyY10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudGV4dHVyZVByb21pc2VzW2ltYWdlU3JjXTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy50ZXh0dXJlUHJvbWlzZXNbaW1hZ2VTcmNdID0gdGhpcy5sb2FkSW1hZ2UoaW1hZ2VTcmMpXG5cdFx0LnRoZW4oKGltYWdlKT0+e1xuXHRcdFx0Y29uc3QgdGV4dHVyZSA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcblxuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGV4dHVyZSk7XG5cblx0XHRcdGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuXHRcdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cblx0XHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRcdGdsLlRFWFRVUkVfMkRcblx0XHRcdFx0LCAwXG5cdFx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0XHQsIGdsLlJHQkFcblx0XHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHRcdCwgaW1hZ2Vcblx0XHRcdCk7XG5cblx0XHRcdHJldHVybiB7aW1hZ2UsIHRleHR1cmV9XG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgbG9hZEltYWdlKHNyYylcblx0e1xuXHRcdGlmKCF0aGlzLmltYWdlUHJvbWlzZXMpXG5cdFx0e1xuXHRcdFx0dGhpcy5pbWFnZVByb21pc2VzID0ge307XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5pbWFnZVByb21pc2VzW3NyY10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdO1xuXHRcdH1cblxuXHRcdHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdID0gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KT0+e1xuXHRcdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRcdGltYWdlLnNyYyAgID0gc3JjO1xuXHRcdFx0aW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldmVudCk9Pntcblx0XHRcdFx0YWNjZXB0KGltYWdlKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMuaW1hZ2VQcm9taXNlc1tzcmNdO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBJbmplY3RhYmxlICB9IGZyb20gJy4uL2luamVjdC9JbmplY3RhYmxlJztcbmltcG9ydCB7IFNwcml0ZVNoZWV0IH0gZnJvbSAnLi9TcHJpdGVTaGVldCc7XG5pbXBvcnQgeyBDYW1lcmEgICAgICB9IGZyb20gJy4vQ2FtZXJhJztcbmltcG9ydCB7IEdsMmQgICAgICAgIH0gZnJvbSAnLi4vZ2wyZC9HbDJkJztcblxuZXhwb3J0ICBjbGFzcyBTdXJmYWNlXG5leHRlbmRzIEluamVjdGFibGUuaW5qZWN0KHtHbDJkLCBDYW1lcmEsIFNwcml0ZVNoZWV0fSlcbntcblx0Y29uc3RydWN0b3IoZ2wyZCwgbWFwLCB4U2l6ZSA9IDIsIHlTaXplID0gMiwgeE9mZnNldCA9IDAsIHlPZmZzZXQgPSAwLCBsYXllciA9IDApXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5nbDJkICAgID0gZ2wyZDtcblx0XHR0aGlzLnggICAgICAgPSB4T2Zmc2V0O1xuXHRcdHRoaXMueSAgICAgICA9IHlPZmZzZXQ7XG5cdFx0dGhpcy5sYXllciAgID0gbGF5ZXI7XG5cblx0XHR0aGlzLnhTaXplICAgPSB4U2l6ZTtcblx0XHR0aGlzLnlTaXplICAgPSB5U2l6ZTtcblxuXHRcdHRoaXMudGlsZVdpZHRoICA9IDMyO1xuXHRcdHRoaXMudGlsZUhlaWdodCA9IDMyO1xuXG5cdFx0dGhpcy53aWR0aCAgID0gdGhpcy54U2l6ZSAqIHRoaXMudGlsZVdpZHRoO1xuXHRcdHRoaXMuaGVpZ2h0ICA9IHRoaXMueVNpemUgKiB0aGlzLnRpbGVIZWlnaHQ7XG5cblx0XHR0aGlzLm1hcCA9IG1hcDtcblxuXHRcdHRoaXMudGV4VmVydGljZXMgPSBbXTtcblxuXHRcdGNvbnN0IGdsICA9IGdsMmQuY29udGV4dDtcblxuXHRcdHRoaXMudGV4dHVyZSAgICAgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG5cdFx0dGhpcy5zdWJUZXh0dXJlcyA9IHt9O1xuXG5cdFx0dGhpcy5sb2FkZWQgPSBmYWxzZTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGV4dHVyZSk7XG5cblx0XHRjb25zdCByID0gKCk9PnBhcnNlSW50KE1hdGgucmFuZG9tKCkqMjU1KTtcblxuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCAxXG5cdFx0XHQsIDFcblx0XHRcdCwgMFxuXHRcdFx0LCBnbC5SR0JBXG5cdFx0XHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdCwgbmV3IFVpbnQ4QXJyYXkoW3IoKSwgcigpLCAwLCAyNTVdKVxuXHRcdCk7XG5cblx0XHR0aGlzLlNwcml0ZVNoZWV0LnJlYWR5LnRoZW4oKHNoZWV0KT0+e1xuXHRcdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy50ZXh0dXJlKTtcblxuXHRcdFx0Ly8gZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0XHQvLyBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRcdC8vIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5ORUFSRVNUKTtcblx0XHRcdC8vIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5ORUFSRVNUKTtcblxuXHRcdFx0Ly8gZ2wudGV4SW1hZ2UyRChcblx0XHRcdC8vIFx0Z2wuVEVYVFVSRV8yRFxuXHRcdFx0Ly8gXHQsIDBcblx0XHRcdC8vIFx0LCBnbC5SR0JBXG5cdFx0XHQvLyBcdCwgZ2wuUkdCQVxuXHRcdFx0Ly8gXHQsIGdsLlVOU0lHTkVEX0JZVEVcblx0XHRcdC8vIFx0LCBzaGVldC5pbWFnZVxuXHRcdFx0Ly8gKTtcblxuXHRcdFx0bGV0IHRleHR1cmVQcm9taXNlcyA9IFtdO1xuXG5cdFx0XHRmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy54U2l6ZSp0aGlzLnlTaXplOyBpKyspXG5cdFx0XHR7XG5cdFx0XHRcdGxldCB2ZXJ0aWNlcztcblxuXHRcdFx0XHRsZXQgbG9jYWxYICA9IGkgJSB0aGlzLnhTaXplO1xuXHRcdFx0XHRsZXQgb2Zmc2V0WCA9IE1hdGguZmxvb3IodGhpcy54IC8gdGhpcy50aWxlV2lkdGgpO1xuXHRcdFx0XHRsZXQgZ2xvYmFsWCA9IGxvY2FsWCArIG9mZnNldFg7XG5cblx0XHRcdFx0bGV0IGxvY2FsWSAgPSBNYXRoLmZsb29yKGkgLyB0aGlzLnhTaXplKTtcblx0XHRcdFx0bGV0IG9mZnNldFkgPSBNYXRoLmZsb29yKHRoaXMueSAvIHRoaXMudGlsZUhlaWdodCk7XG5cdFx0XHRcdGxldCBnbG9iYWxZID0gbG9jYWxZICsgb2Zmc2V0WTtcblxuXHRcdFx0XHRsZXQgZnJhbWVzID0gdGhpcy5tYXAuZ2V0VGlsZShnbG9iYWxYLCBnbG9iYWxZLCB0aGlzLmxheWVyKTtcblxuXHRcdFx0XHRpZihBcnJheS5pc0FycmF5KGZyYW1lcykpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRsZXQgaiA9IDA7XG5cdFx0XHRcdFx0dGhpcy5zdWJUZXh0dXJlc1tpXSA9IFtdO1xuXG5cdFx0XHRcdFx0dGV4dHVyZVByb21pc2VzLnB1c2goXG5cdFx0XHRcdFx0XHRQcm9taXNlLmFsbChmcmFtZXMubWFwKChmcmFtZSk9PlxuXHRcdFx0XHRcdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmNvbnN0cnVjdG9yLmxvYWRUZXh0dXJlKGdsMmQsIGZyYW1lKS50aGVuKFxuXHRcdFx0XHRcdFx0XHRcdChhcmdzKT0+e1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zdWJUZXh0dXJlc1tpXVtqXSA9IGFyZ3MudGV4dHVyZTtcblx0XHRcdFx0XHRcdFx0XHRcdGorKztcblxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0KSlcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRleHR1cmVQcm9taXNlcy5wdXNoKFxuXHRcdFx0XHRcdFx0dGhpcy5TcHJpdGVTaGVldC5jb25zdHJ1Y3Rvci5sb2FkVGV4dHVyZShnbDJkLCBmcmFtZXMpLnRoZW4oXG5cdFx0XHRcdFx0XHRcdChhcmdzKT0+e1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc3ViVGV4dHVyZXNbaV0gPSBhcmdzLnRleHR1cmU7XG5cblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0UHJvbWlzZS5hbGwodGV4dHVyZVByb21pc2VzKS50aGVuKCgpPT57XG5cdFx0XHRcdHRoaXMuYXNzZW1ibGUoKTtcblxuXHRcdFx0XHR0aGlzLmxvYWRlZCA9IHRydWU7XG5cdFx0XHR9KTtcblxuXHRcdH0pO1xuXG5cdFx0dGhpcy5wYW5lID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5wYW5lKTtcblxuXHRcdGdsLnRleEltYWdlMkQoXG5cdFx0XHRnbC5URVhUVVJFXzJEXG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCB0aGlzLndpZHRoXG5cdFx0XHQsIHRoaXMuaGVpZ2h0XG5cdFx0XHQsIDBcblx0XHRcdCwgZ2wuUkdCQVxuXHRcdFx0LCBnbC5VTlNJR05FRF9CWVRFXG5cdFx0XHQsIG51bGxcblx0XHQpO1xuXG5cdFx0Ly8gZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUik7XG5cdFx0Ly8gZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cdFx0Ly8gZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2wuQ0xBTVBfVE9fRURHRSk7XG5cblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbC5DTEFNUF9UT19FREdFKTtcblx0XHRnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2wuTkVBUkVTVCk7XG5cdFx0Z2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsLk5FQVJFU1QpO1xuXG5cdFx0dGhpcy5mcmFtZUJ1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIHRoaXMuZnJhbWVCdWZmZXIpO1xuXG5cdFx0Y29uc3QgYXR0YWNobWVudFBvaW50ID0gZ2wuQ09MT1JfQVRUQUNITUVOVDA7XG5cblx0XHRnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChcblx0XHRcdGdsLkZSQU1FQlVGRkVSXG5cdFx0XHQsIGF0dGFjaG1lbnRQb2ludFxuXHRcdFx0LCBnbC5URVhUVVJFXzJEXG5cdFx0XHQsIHRoaXMucGFuZVxuXHRcdFx0LCAwXG5cdFx0KTtcblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLnVzZVByb2dyYW0odGhpcy5nbDJkLnByb2dyYW0pO1xuXG5cdFx0Z2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5wYW5lKTtcblxuXHRcdHRoaXMuc2V0UmVjdGFuZ2xlKFxuXHRcdFx0dGhpcy54ICAgLSAodGhpcy5DYW1lcmEueCAtICh0aGlzLkNhbWVyYS53aWR0aCAgLzIpKSAtIDE2XG5cdFx0XHQsIHRoaXMueSAtICh0aGlzLkNhbWVyYS55IC0gKHRoaXMuQ2FtZXJhLmhlaWdodCAvMikpIC0gMTZcblx0XHRcdCwgdGhpcy53aWR0aFxuXHRcdFx0LCB0aGlzLmhlaWdodFxuXHRcdCk7XG5cblx0XHRnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIG51bGwpO1xuXG5cdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHR9XG5cblx0YXNzZW1ibGUoKVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLnVzZVByb2dyYW0odGhpcy5nbDJkLnByb2dyYW0pO1xuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCB0aGlzLmZyYW1lQnVmZmVyKTtcblxuXHRcdGdsLnZpZXdwb3J0KDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcblxuXHRcdC8vIGdsLmNsZWFyQ29sb3IoMCwgMCwgMSwgMSk7ICAgLy8gY2xlYXIgdG8gYmx1ZVxuXHRcdC8vIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQgfCBnbC5ERVBUSF9CVUZGRVJfQklUKTtcblxuXHRcdGdsLnVuaWZvcm00Zihcblx0XHRcdHRoaXMuZ2wyZC5jb2xvckxvY2F0aW9uXG5cdFx0XHQsIDFcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0XHQsIDFcblx0XHQpO1xuXG5cdFx0Z2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy5nbDJkLnBvc2l0aW9uTG9jYXRpb24pO1xuXG5cdFx0Z2wudW5pZm9ybTJmKFxuXHRcdFx0dGhpcy5nbDJkLnJlc29sdXRpb25Mb2NhdGlvblxuXHRcdFx0LCB0aGlzLndpZHRoXG5cdFx0XHQsIHRoaXMuaGVpZ2h0XG5cdFx0KTtcblxuXHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMudGV4dHVyZSk7XG5cdFx0Z2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy5nbDJkLnRleENvb3JkTG9jYXRpb24pO1xuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLmdsMmQudGV4Q29vcmRCdWZmZXIpO1xuXG5cdFx0Z2wudmVydGV4QXR0cmliUG9pbnRlcihcblx0XHRcdHRoaXMuZ2wyZC50ZXhDb29yZExvY2F0aW9uXG5cdFx0XHQsIDJcblx0XHRcdCwgZ2wuRkxPQVRcblx0XHRcdCwgZmFsc2Vcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdGxldCB4ID0gMDtcblx0XHRsZXQgeSA9IDA7XG5cblx0XHRmb3IobGV0IGkgaW4gdGhpcy5zdWJUZXh0dXJlcylcblx0XHR7XG5cdFx0XHRpZighQXJyYXkuaXNBcnJheSh0aGlzLnN1YlRleHR1cmVzW2ldKSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5zdWJUZXh0dXJlc1tpXSA9IFt0aGlzLnN1YlRleHR1cmVzW2ldXTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yKGxldCBqIGluIHRoaXMuc3ViVGV4dHVyZXNbaV0pXG5cdFx0XHR7XG5cdFx0XHRcdGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuc3ViVGV4dHVyZXNbaV1bal0pO1xuXHRcdFx0XHRnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSh0aGlzLmdsMmQudGV4Q29vcmRMb2NhdGlvbik7XG5cdFx0XHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLmdsMmQudGV4Q29vcmRCdWZmZXIpO1xuXG5cdFx0XHRcdGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoXG5cdFx0XHRcdFx0dGhpcy5nbDJkLnRleENvb3JkTG9jYXRpb25cblx0XHRcdFx0XHQsIDJcblx0XHRcdFx0XHQsIGdsLkZMT0FUXG5cdFx0XHRcdFx0LCBmYWxzZVxuXHRcdFx0XHRcdCwgMFxuXHRcdFx0XHRcdCwgMFxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLmdsMmQudGV4Q29vcmRCdWZmZXIpO1xuXHRcdFx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHRcdFx0MC4wLCAgMC4wLFxuXHRcdFx0XHRcdDEuMCwgIDAuMCxcblx0XHRcdFx0XHQwLjAsICAxLjAsXG5cdFx0XHRcdFx0MC4wLCAgMS4wLFxuXHRcdFx0XHRcdDEuMCwgIDAuMCxcblx0XHRcdFx0XHQxLjAsICAxLjAsXG5cdFx0XHRcdF0pLCBnbC5TVFJFQU1fRFJBVyk7XG5cblx0XHRcdFx0dGhpcy5zZXRSZWN0YW5nbGUoXG5cdFx0XHRcdFx0eFxuXHRcdFx0XHRcdCwgeSArIHRoaXMudGlsZUhlaWdodFxuXHRcdFx0XHRcdCwgdGhpcy50aWxlV2lkdGhcblx0XHRcdFx0XHQsIC0gdGhpcy50aWxlSGVpZ2h0XG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0Z2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRVMsIDAsIDYpO1xuXHRcdFx0fVxuXHRcdFx0eCArPSB0aGlzLnRpbGVXaWR0aDtcblxuXHRcdFx0aWYoeCA+PSB0aGlzLndpZHRoKVxuXHRcdFx0e1xuXHRcdFx0XHR4ID0gMDtcblx0XHRcdFx0eSArPSB0aGlzLnRpbGVIZWlnaHQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Z2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBudWxsKTtcblx0fVxuXG5cdHNldFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0Y29uc3QgZ2wgPSB0aGlzLmdsMmQuY29udGV4dDtcblxuXHRcdGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLmdsMmQucG9zaXRpb25CdWZmZXIpO1xuXG5cdFx0Z2wudmVydGV4QXR0cmliUG9pbnRlcihcblx0XHRcdHRoaXMuZ2wyZC5wb3NpdGlvbkxvY2F0aW9uXG5cdFx0XHQsIDJcblx0XHRcdCwgZ2wuRkxPQVRcblx0XHRcdCwgZmFsc2Vcblx0XHRcdCwgMFxuXHRcdFx0LCAwXG5cdFx0KTtcblxuXHRcdHZhciB4MSA9IHg7XG5cdFx0dmFyIHgyID0geCArIHdpZHRoO1xuXHRcdHZhciB5MSA9IHk7XG5cdFx0dmFyIHkyID0geSArIGhlaWdodDtcblx0XHRcblx0XHRnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheShbXG5cdFx0XHR4MSwgeTIsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MSwgeTEsXG5cdFx0XHR4MiwgeTIsXG5cdFx0XHR4MiwgeTEsXG5cdFx0XSksIGdsLlNUQVRJQ19EUkFXKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIFRleHR1cmVCYW5rXG57XG5cdFxufSIsIm1vZHVsZS5leHBvcnRzID0gXCIvLyB0ZXh0dXJlLmZyYWdaXFxuXFxucHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuXFxudW5pZm9ybSB2ZWM0ICAgICAgdV9jb2xvcjtcXG51bmlmb3JtIHNhbXBsZXIyRCB1X2ltYWdlO1xcbnZhcnlpbmcgdmVjMiAgICAgIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKCkge1xcbiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1X2ltYWdlLCB2X3RleENvb3JkKTtcXG4gICAvLyBnbF9GcmFnQ29sb3IgPSB2ZWM0KDEuMCwwLjAsMS4wLDEuMCk7XFxuICAgLy8gZ2xfRnJhZ0NvbG9yID0gZ2xfUG9pbnRDb29yZC55eXh4O1xcbn1cXG5cIiIsIm1vZHVsZS5leHBvcnRzID0gXCIvLyB0ZXh0dXJlLnZlcnRcXG5cXG5hdHRyaWJ1dGUgdmVjMiBhX3Bvc2l0aW9uO1xcbmF0dHJpYnV0ZSB2ZWMyIGFfdGV4Q29vcmQ7XFxuXFxudW5pZm9ybSAgIHZlYzIgdV9yZXNvbHV0aW9uO1xcblxcbnZhcnlpbmcgICB2ZWMyIHZfdGV4Q29vcmQ7XFxuXFxudm9pZCBtYWluKClcXG57XFxuICAgdmVjMiB6ZXJvVG9PbmUgPSBhX3Bvc2l0aW9uIC8gdV9yZXNvbHV0aW9uO1xcbiAgIHZlYzIgemVyb1RvVHdvID0gemVyb1RvT25lICogMi4wO1xcbiAgIHZlYzIgY2xpcFNwYWNlID0gemVyb1RvVHdvIC0gMS4wO1xcblxcbiAgIGdsX1Bvc2l0aW9uID0gdmVjNChjbGlwU3BhY2UgKiB2ZWMyKDEsIC0xKSwgMCwgMSk7XFxuICAgdl90ZXhDb29yZCAgPSBhX3RleENvb3JkO1xcbn1cXG5cIiIsImltcG9ydCB7IFZpZXcgfSBmcm9tICdjdXJ2YXR1cmUvYmFzZS9WaWV3JztcblxuZXhwb3J0IGNsYXNzIENvbnRyb2xsZXIgZXh0ZW5kcyBWaWV3XG57XG5cdGNvbnN0cnVjdG9yKGFyZ3MpXG5cdHtcblx0XHRzdXBlcihhcmdzKTtcblx0XHR0aGlzLnRlbXBsYXRlICA9IHJlcXVpcmUoJy4vY29udHJvbGxlci50bXAnKTtcblx0XHR0aGlzLmRyYWdTdGFydCA9IGZhbHNlO1xuXG5cdFx0dGhpcy5hcmdzLmRyYWdnaW5nICA9IGZhbHNlO1xuXHRcdHRoaXMuYXJncy54ID0gMDtcblx0XHR0aGlzLmFyZ3MueSA9IDA7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLm1vdmVTdGljayhldmVudCk7XG5cdFx0fSk7XG5cblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5kcm9wU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIChldmVudCkgPT4ge1xuXHRcdFx0dGhpcy5tb3ZlU3RpY2soZXZlbnQpO1xuXHRcdH0pO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgKGV2ZW50KSA9PiB7XG5cdFx0XHR0aGlzLmRyb3BTdGljayhldmVudCk7XG5cdFx0fSk7XG5cdH1cblxuXHRkcmFnU3RpY2soZXZlbnQpXG5cdHtcblx0XHRsZXQgcG9zID0gZXZlbnQ7XG5cblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0aWYoZXZlbnQudG91Y2hlcyAmJiBldmVudC50b3VjaGVzWzBdKVxuXHRcdHtcblx0XHRcdHBvcyA9IGV2ZW50LnRvdWNoZXNbMF07XG5cdFx0fVxuXG5cdFx0dGhpcy5hcmdzLmRyYWdnaW5nID0gdHJ1ZTtcblx0XHR0aGlzLmRyYWdTdGFydCAgICAgPSB7XG5cdFx0XHR4OiAgIHBvcy5jbGllbnRYXG5cdFx0XHQsIHk6IHBvcy5jbGllbnRZXG5cdFx0fTtcblx0fVxuXG5cdG1vdmVTdGljayhldmVudClcblx0e1xuXHRcdGlmKHRoaXMuYXJncy5kcmFnZ2luZylcblx0XHR7XG5cdFx0XHRsZXQgcG9zID0gZXZlbnQ7XG5cblx0XHRcdGlmKGV2ZW50LnRvdWNoZXMgJiYgZXZlbnQudG91Y2hlc1swXSlcblx0XHRcdHtcblx0XHRcdFx0cG9zID0gZXZlbnQudG91Y2hlc1swXTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hcmdzLnh4ID0gcG9zLmNsaWVudFggLSB0aGlzLmRyYWdTdGFydC54O1xuXHRcdFx0dGhpcy5hcmdzLnl5ID0gcG9zLmNsaWVudFkgLSB0aGlzLmRyYWdTdGFydC55O1xuXG5cdFx0XHRjb25zdCBsaW1pdCA9IDUwO1xuXG5cdFx0XHRpZih0aGlzLmFyZ3MueHggPCAtbGltaXQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYXJncy54ID0gLWxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZih0aGlzLmFyZ3MueHggPiBsaW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnggPSBsaW1pdDtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnggPSB0aGlzLmFyZ3MueHg7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMuYXJncy55eSA8IC1saW1pdClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hcmdzLnkgPSAtbGltaXQ7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHRoaXMuYXJncy55eSA+IGxpbWl0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueSA9IGxpbWl0O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFyZ3MueSA9IHRoaXMuYXJncy55eTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRkcm9wU3RpY2soZXZlbnQpXG5cdHtcblx0XHR0aGlzLmFyZ3MuZHJhZ2dpbmcgPSBmYWxzZTtcblx0XHR0aGlzLmFyZ3MueCA9IDA7XG5cdFx0dGhpcy5hcmdzLnkgPSAwO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBWaWV3IH0gZnJvbSAnY3VydmF0dXJlL2Jhc2UvVmlldyc7XG5cbmV4cG9ydCBjbGFzcyBNYXBFZGl0b3IgZXh0ZW5kcyBWaWV3XG57XG5cdGNvbnN0cnVjdG9yKGFyZ3MpXG5cdHtcblx0XHRzdXBlcihhcmdzKTtcblx0XHR0aGlzLnRlbXBsYXRlICA9IHJlcXVpcmUoJy4vbWFwRWRpdG9yLnRtcCcpO1xuXG5cdFx0YXJncy5zcHJpdGVTaGVldC5yZWFkeS50aGVuKChzaGVldCk9Pntcblx0XHRcdHRoaXMuYXJncy50aWxlcyA9IHNoZWV0LmZyYW1lcztcblx0XHR9KTtcblxuXHRcdHRoaXMuYXJncy5iaW5kVG8oJ3NlbGVjdGVkR3JhcGhpYycsICh2KT0+e1xuXHRcdFx0dGhpcy5hcmdzLnNlbGVjdGVkR3JhcGhpYyA9IG51bGw7XG5cdFx0fSwge3dhaXQ6MH0pO1xuXG5cdFx0dGhpcy5hcmdzLm11bHRpU2VsZWN0ICAgPSBmYWxzZTtcblx0XHR0aGlzLmFyZ3Muc2VsZWN0aW9uICAgICA9IHt9O1xuXHRcdHRoaXMuYXJncy5zZWxlY3RlZEltYWdlID0gbnVsbFxuXHR9XG5cblx0c2VsZWN0R3JhcGhpYyhzcmMpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhzcmMpO1xuXG5cdFx0dGhpcy5hcmdzLnNlbGVjdGVkR3JhcGhpYyA9IHNyYztcblx0fVxuXG5cdHNlbGVjdChzZWxlY3Rpb24pXG5cdHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMuYXJncy5zZWxlY3Rpb24sIHNlbGVjdGlvbik7XG5cblx0XHRpZihzZWxlY3Rpb24uZ2xvYmFsWCAhPT0gc2VsZWN0aW9uLnN0YXJ0R2xvYmFsWFxuXHRcdFx0fHwgc2VsZWN0aW9uLmdsb2JhbFkgIT09IHNlbGVjdGlvbi5zdGFydEdsb2JhbFlcblx0XHQpe1xuXHRcdFx0dGhpcy5hcmdzLm11bHRpU2VsZWN0ID0gdHJ1ZTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHRoaXMuYXJncy5tdWx0aVNlbGVjdCA9IGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKCF0aGlzLmFyZ3MubXVsdGlTZWxlY3QpXG5cdFx0e1xuXHRcdFx0dGhpcy5hcmdzLnNlbGVjdGVkSW1hZ2VzID0gdGhpcy5hcmdzLm1hcC5nZXRUaWxlKHNlbGVjdGlvbi5nbG9iYWxYLCBzZWxlY3Rpb24uZ2xvYmFsWSk7XG5cdFx0fVxuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcyA9IFxcXCJjb250cm9sbGVyXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImpveXN0aWNrXFxcIiBjdi1vbiA9IFxcXCJcXG5cXHRcXHR0b3VjaHN0YXJ0OmRyYWdTdGljayhldmVudCk7XFxuXFx0XFx0bW91c2Vkb3duOmRyYWdTdGljayhldmVudCk7XFxuXFx0XFxcIj5cXG5cXHRcXHQ8ZGl2IGNsYXNzID0gXFxcInBhZFxcXCIgc3R5bGUgPSBcXFwicG9zaXRpb246IHJlbGF0aXZlOyB0cmFuc2Zvcm06dHJhbnNsYXRlKFtbeF1dcHgsW1t5XV1weCk7XFxcIj48L2Rpdj5cXG5cXHQ8L2Rpdj5cXG5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcImJ1dHRvblxcXCI+QTwvZGl2PlxcblxcdDxkaXYgY2xhc3MgPSBcXFwiYnV0dG9uXFxcIj5CPC9kaXY+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJidXR0b25cXFwiPkM8L2Rpdj5cXG48L2Rpdj5cIiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzID0gXFxcInRhYi1wYWdlIG1hcEVkaXRvclxcXCI+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJ0YWJzXFxcIj5cXG5cXHRcXHQ8ZGl2PlRpbGU8L2Rpdj5cXG5cXHRcXHQ8ZGl2PkxheWVyPC9kaXY+XFxuXFx0XFx0PGRpdj5PYmplY3Q8L2Rpdj5cXG5cXHRcXHQ8ZGl2PlRyaWdnZXI8L2Rpdj5cXG5cXHRcXHQ8ZGl2Pk1hcDwvZGl2PlxcblxcdDwvZGl2PlxcblxcblxcdDxkaXYgY2xhc3MgPSBcXFwidGlsZVxcXCI+XFxuXFx0XFx0PGRpdiBjbGFzcyA9IFxcXCJzZWxlY3RlZFxcXCI+XFxuXFx0XFx0XFx0PGRpdiBjdi1pZiA9IFxcXCIhbXVsdGlTZWxlY3RcXFwiPlxcblxcdFxcdFxcdFxcdDxwIHN0eWxlID0gXFxcImZvbnQtc2l6ZTogbGFyZ2VcXFwiPlxcblxcdFxcdFxcdFxcdFxcdChbW3NlbGVjdGlvbi5nbG9iYWxYXV0sIFtbc2VsZWN0aW9uLmdsb2JhbFldXSlcXG5cXHRcXHRcXHRcXHQ8L3A+XFxuXFx0XFx0XFx0XFx0PHAgY3YtZWFjaCA9IFxcXCJzZWxlY3RlZEltYWdlczpzZWxlY3RlZEltYWdlOnNJXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8YnV0dG9uPi08L2J1dHRvbj5cXG5cXHRcXHRcXHRcXHRcXHQ8aW1nIGNsYXNzID0gXFxcImN1cnJlbnRcXFwiIGN2LWF0dHIgPSBcXFwic3JjOnNlbGVjdGVkSW1hZ2VcXFwiPlxcblxcdFxcdFxcdFxcdDwvcD5cXG5cXHRcXHRcXHRcXHQ8YnV0dG9uPis8L2J1dHRvbj5cXG5cXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHQ8ZGl2IGN2LWlmID0gXFxcIm11bHRpU2VsZWN0XFxcIj5cXG5cXHRcXHRcXHRcXHQ8cCBzdHlsZSA9IFxcXCJmb250LXNpemU6IGxhcmdlXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQoW1tzZWxlY3Rpb24uc3RhcnRHbG9iYWxYXV0sIFtbc2VsZWN0aW9uLnN0YXJ0R2xvYmFsWV1dKSAtIChbW3NlbGVjdGlvbi5nbG9iYWxYXV0sIFtbc2VsZWN0aW9uLmdsb2JhbFldXSlcXG5cXHRcXHRcXHRcXHQ8L3A+XFxuXFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0PC9kaXY+XFxuXFx0XFx0PGRpdiBjbGFzcyA9IFxcXCJ0aWxlc1xcXCIgY3YtZWFjaCA9IFxcXCJ0aWxlczp0aWxlOnRcXFwiPlxcblxcdFxcdFxcdDxpbWcgY3YtYXR0ciA9IFxcXCJzcmM6dGlsZSx0aXRsZTp0XFxcIiBjdi1vbiA9IFxcXCJjbGljazpzZWxlY3RHcmFwaGljKHQpO1xcXCI+XFxuXFx0XFx0PC9kaXY+XFxuXFx0PC9kaXY+XFxuXFx0PCEtLSA8ZGl2IGNsYXNzID0gXFxcInRpbGVcXFwiPk9CSkVDVCBNT0RFPC9kaXY+XFxuXFx0PGRpdiBjbGFzcyA9IFxcXCJ0aWxlXFxcIj5UUklHR0VSIE1PREU8L2Rpdj5cXG5cXHQ8ZGl2IGNsYXNzID0gXFxcInRpbGVcXFwiPk1BUCBNT0RFPC9kaXY+IC0tPlxcbjwvZGl2PlwiIiwiaW1wb3J0IHsgU3ByaXRlIH0gZnJvbSAnLi4vc3ByaXRlL1Nwcml0ZSc7XG5cbmV4cG9ydCBjbGFzcyBGbG9vclxue1xuXHRjb25zdHJ1Y3RvcihnbDJkLCBhcmdzKVxuXHR7XG5cdFx0dGhpcy5nbDJkICAgPSBnbDJkO1xuXHRcdHRoaXMuc3ByaXRlcyA9IFtdO1xuXG5cdFx0Ly8gdGhpcy5yZXNpemUoNjAsIDM0KTtcblx0XHR0aGlzLnJlc2l6ZSg5LCA5KTtcblx0XHQvLyB0aGlzLnJlc2l6ZSg2MCoyLCAzNCoyKTtcblx0fVxuXG5cdHJlc2l6ZSh3aWR0aCwgaGVpZ2h0KVxuXHR7XG5cdFx0dGhpcy53aWR0aCAgPSB3aWR0aDtcblx0XHR0aGlzLmhlaWdodCA9IGhlaWdodDtcblxuXHRcdGZvcihsZXQgeCA9IDA7IHggPCB3aWR0aDsgeCsrKVxuXHRcdHtcblx0XHRcdGZvcihsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgc3ByaXRlID0gbmV3IFNwcml0ZSh0aGlzLmdsMmQsICcvZmxvb3JUaWxlLnBuZycpO1xuXG5cdFx0XHRcdHNwcml0ZS54ID0gMzIgKiB4O1xuXHRcdFx0XHRzcHJpdGUueSA9IDMyICogeTtcblxuXHRcdFx0XHR0aGlzLnNwcml0ZXMucHVzaChzcHJpdGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGRyYXcoKVxuXHR7XG5cdFx0dGhpcy5zcHJpdGVzLm1hcChzID0+IHMuZHJhdygpKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgU3ByaXRlU2hlZXQgfSBmcm9tICcuLi9zcHJpdGUvU3ByaXRlU2hlZXQnO1xuaW1wb3J0IHsgSW5qZWN0YWJsZSAgfSBmcm9tICcuLi9pbmplY3QvSW5qZWN0YWJsZSc7XG5cbmV4cG9ydCAgY2xhc3MgTWFwXG5leHRlbmRzIEluamVjdGFibGUuaW5qZWN0KHtTcHJpdGVTaGVldH0pXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnRpbGVzID0ge307XG5cdH1cblxuXHRnZXRUaWxlKHgsIHksIGxheWVyID0gMClcblx0e1xuXHRcdGlmKHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHR0aGlzLlNwcml0ZVNoZWV0LmdldEZyYW1lKHRoaXMudGlsZXNbYCR7eH0sJHt5fS0tJHtsYXllcn1gXSlcblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0bGV0IHNwbGl0ID0gNDtcblx0XHRsZXQgc2Vjb25kID0gJ3JvY2tfNC5wbmcnO1xuXG5cdFx0aWYoKHggJSBzcGxpdCA9PT0gMCkgJiYgKHkgJSBzcGxpdCA9PT0gMCkpXG5cdFx0e1xuXHRcdFx0c2Vjb25kID0gJ2NoZWVzZS5wbmcnXG5cdFx0fVxuXG5cdFx0cmV0dXJuIFtcblx0XHRcdHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoJ2Zsb29yVGlsZS5wbmcnKVxuXHRcdF07XG5cblx0XHRyZXR1cm4gW1xuXHRcdFx0dGhpcy5TcHJpdGVTaGVldC5nZXRGcmFtZSgnZmxvb3JUaWxlLnBuZycpXG5cdFx0XHQsIHRoaXMuU3ByaXRlU2hlZXQuZ2V0RnJhbWUoc2Vjb25kKVxuXHRcdF07XG5cdH1cblxuXHRzZXRUaWxlKHgsIHksIGltYWdlLCBsYXllciA9IDApXG5cdHtcblx0XHR0aGlzLnRpbGVzW2Ake3h9LCR7eX0tLSR7bGF5ZXJ9YF0gPSBpbWFnZTtcblx0fVxuXG5cdGV4cG9ydCgpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0aGlzLnRpbGVzKSk7XG5cdH1cblxuXHRpbXBvcnQoaW5wdXQpXG5cdHtcblx0XHRpbnB1dCA9IGB7XCItMiwxMVwiOlwibGF2YV9jZW50ZXJfbWlkZGxlLnBuZ1wiLFwiLTEsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIixcIjAsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIn1gO1xuXG5cdFx0dGhpcy50aWxlcyA9IEpTT04ucGFyc2UoaW5wdXQpO1xuXG5cdFx0Ly8gY29uc29sZS5sb2coSlNPTi5wYXJzZShpbnB1dCkpO1xuXHR9XG59XG5cblxuLy8ge1wiLTIsMTFcIjpcImxhdmFfY2VudGVyX21pZGRsZS5wbmdcIixcIi0xLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCIsXCIwLDExXCI6XCJsYXZhX2NlbnRlcl9taWRkbGUucG5nXCJ9IiwiLyoganNoaW50IGlnbm9yZTpzdGFydCAqL1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgV2ViU29ja2V0ID0gd2luZG93LldlYlNvY2tldCB8fCB3aW5kb3cuTW96V2ViU29ja2V0O1xuICB2YXIgYnIgPSB3aW5kb3cuYnJ1bmNoID0gKHdpbmRvdy5icnVuY2ggfHwge30pO1xuICB2YXIgYXIgPSBiclsnYXV0by1yZWxvYWQnXSA9IChiclsnYXV0by1yZWxvYWQnXSB8fCB7fSk7XG4gIGlmICghV2ViU29ja2V0IHx8IGFyLmRpc2FibGVkKSByZXR1cm47XG4gIGlmICh3aW5kb3cuX2FyKSByZXR1cm47XG4gIHdpbmRvdy5fYXIgPSB0cnVlO1xuXG4gIHZhciBjYWNoZUJ1c3RlciA9IGZ1bmN0aW9uKHVybCl7XG4gICAgdmFyIGRhdGUgPSBNYXRoLnJvdW5kKERhdGUubm93KCkgLyAxMDAwKS50b1N0cmluZygpO1xuICAgIHVybCA9IHVybC5yZXBsYWNlKC8oXFwmfFxcXFw/KWNhY2hlQnVzdGVyPVxcZCovLCAnJyk7XG4gICAgcmV0dXJuIHVybCArICh1cmwuaW5kZXhPZignPycpID49IDAgPyAnJicgOiAnPycpICsnY2FjaGVCdXN0ZXI9JyArIGRhdGU7XG4gIH07XG5cbiAgdmFyIGJyb3dzZXIgPSBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCk7XG4gIHZhciBmb3JjZVJlcGFpbnQgPSBhci5mb3JjZVJlcGFpbnQgfHwgYnJvd3Nlci5pbmRleE9mKCdjaHJvbWUnKSA+IC0xO1xuXG4gIHZhciByZWxvYWRlcnMgPSB7XG4gICAgcGFnZTogZnVuY3Rpb24oKXtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQodHJ1ZSk7XG4gICAgfSxcblxuICAgIHN0eWxlc2hlZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICBbXS5zbGljZVxuICAgICAgICAuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdsaW5rW3JlbD1zdHlsZXNoZWV0XScpKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICB2YXIgdmFsID0gbGluay5nZXRBdHRyaWJ1dGUoJ2RhdGEtYXV0b3JlbG9hZCcpO1xuICAgICAgICAgIHJldHVybiBsaW5rLmhyZWYgJiYgdmFsICE9ICdmYWxzZSc7XG4gICAgICAgIH0pXG4gICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICBsaW5rLmhyZWYgPSBjYWNoZUJ1c3RlcihsaW5rLmhyZWYpO1xuICAgICAgICB9KTtcblxuICAgICAgLy8gSGFjayB0byBmb3JjZSBwYWdlIHJlcGFpbnQgYWZ0ZXIgMjVtcy5cbiAgICAgIGlmIChmb3JjZVJlcGFpbnQpIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGRvY3VtZW50LmJvZHkub2Zmc2V0SGVpZ2h0OyB9LCAyNSk7XG4gICAgfSxcblxuICAgIGphdmFzY3JpcHQ6IGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgc2NyaXB0cyA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnc2NyaXB0JykpO1xuICAgICAgdmFyIHRleHRTY3JpcHRzID0gc2NyaXB0cy5tYXAoZnVuY3Rpb24oc2NyaXB0KSB7IHJldHVybiBzY3JpcHQudGV4dCB9KS5maWx0ZXIoZnVuY3Rpb24odGV4dCkgeyByZXR1cm4gdGV4dC5sZW5ndGggPiAwIH0pO1xuICAgICAgdmFyIHNyY1NjcmlwdHMgPSBzY3JpcHRzLmZpbHRlcihmdW5jdGlvbihzY3JpcHQpIHsgcmV0dXJuIHNjcmlwdC5zcmMgfSk7XG5cbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgdmFyIGFsbCA9IHNyY1NjcmlwdHMubGVuZ3RoO1xuICAgICAgdmFyIG9uTG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2FkZWQgPSBsb2FkZWQgKyAxO1xuICAgICAgICBpZiAobG9hZGVkID09PSBhbGwpIHtcbiAgICAgICAgICB0ZXh0U2NyaXB0cy5mb3JFYWNoKGZ1bmN0aW9uKHNjcmlwdCkgeyBldmFsKHNjcmlwdCk7IH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHNyY1NjcmlwdHNcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oc2NyaXB0KSB7XG4gICAgICAgICAgdmFyIHNyYyA9IHNjcmlwdC5zcmM7XG4gICAgICAgICAgc2NyaXB0LnJlbW92ZSgpO1xuICAgICAgICAgIHZhciBuZXdTY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgICAgICBuZXdTY3JpcHQuc3JjID0gY2FjaGVCdXN0ZXIoc3JjKTtcbiAgICAgICAgICBuZXdTY3JpcHQuYXN5bmMgPSB0cnVlO1xuICAgICAgICAgIG5ld1NjcmlwdC5vbmxvYWQgPSBvbkxvYWQ7XG4gICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChuZXdTY3JpcHQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH07XG4gIHZhciBwb3J0ID0gYXIucG9ydCB8fCA5NDg1O1xuICB2YXIgaG9zdCA9IGJyLnNlcnZlciB8fCB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgfHwgJ2xvY2FsaG9zdCc7XG5cbiAgdmFyIGNvbm5lY3QgPSBmdW5jdGlvbigpe1xuICAgIHZhciBjb25uZWN0aW9uID0gbmV3IFdlYlNvY2tldCgnd3M6Ly8nICsgaG9zdCArICc6JyArIHBvcnQpO1xuICAgIGNvbm5lY3Rpb24ub25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgaWYgKGFyLmRpc2FibGVkKSByZXR1cm47XG4gICAgICB2YXIgbWVzc2FnZSA9IGV2ZW50LmRhdGE7XG4gICAgICB2YXIgcmVsb2FkZXIgPSByZWxvYWRlcnNbbWVzc2FnZV0gfHwgcmVsb2FkZXJzLnBhZ2U7XG4gICAgICByZWxvYWRlcigpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24oKXtcbiAgICAgIGlmIChjb25uZWN0aW9uLnJlYWR5U3RhdGUpIGNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25jbG9zZSA9IGZ1bmN0aW9uKCl7XG4gICAgICB3aW5kb3cuc2V0VGltZW91dChjb25uZWN0LCAxMDAwKTtcbiAgICB9O1xuICB9O1xuICBjb25uZWN0KCk7XG59KSgpO1xuLyoganNoaW50IGlnbm9yZTplbmQgKi9cbiJdfQ==