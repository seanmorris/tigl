/**
 * @typedef {Record<string, *>} Entity
 * @typedef {{[onAdd]?: Function, [onRemove]?: Function} & Record<string, *>} Component
 * @typedef {new (...args: *[]) => *} Class
 * @typedef {Class} ComponentClass
*/

import { Tuple } from 'libtuple';

class ComponentFilter
{
	/**
	 * Construct a ComponentFilter
	 * @param {(ComponentClass)[]} components
	 */
	constructor(components) { this.components = components; }
}

class EntityFilter extends Set{};
class And extends ComponentFilter{};
class Or extends ComponentFilter{};

export function these(/** @type [...Entity] */ ...entities) { return new EntityFilter([...entities])};
export function and(/** @type [...Component|ComponentFilter|EntityFilter] */ ...components) { return new And(components) };
export function or(/** @type [...Component|ComponentFilter|EntityFilter] */ ...components) { return new Or(components) };

export const onAdd = Symbol('component_added');
export const onRemove = Symbol('component_removed');

/**
 * Sort components by the size of their entity collections
 * @param {Set<Entity>} a
 * @param {Set<Entity>} b
 * @returns {number}
 */
const sortBySize = (a, b) => a.size - b.size;

/**
 * Convert a filter into a cache key
 * @param {EntityComponentManager} m The ECM
 * @param {ComponentFilter|EntityFilter} f The filter to convert
 * @returns {Tuple}
 */
const filterToCacheKey = (m, f) => {
	if(f instanceof EntityFilter) return Tuple(m, EntityFilter, ...f);

	const components = f.components;
	const parts = Array(components.length);

	for(let i = 0; i < components.length; i++)
	{
		const component = components[i];
		if(component instanceof ComponentFilter)
			parts[i] = filterToCacheKey(m, component);
		else if(component instanceof EntityFilter)
			parts[i] = Tuple(m, EntityFilter, ...component);
		else
			parts[i] = component;
	}

	return Tuple(m, f.constructor, ...parts);
};

export class EntityComponentManager
{
	/** @type {Map<Entity, Map<ComponentClass, Component>>} */ entitiesToComponents = new Map;
	/** @type {Map<ComponentClass, Set<Entity>>} */ componentsToEntities = new Map;
	/** @type {WeakMap<Tuple, Set<Entity>>} */ weakCache = new WeakMap;
	/** @type {WeakMap<Entity, number>} */ initialSizes = new WeakMap;
	mutated = false;

	/**
	 * Add a component to an entity
	 * @param {Entity} entity - Entity to add a component to
	 * @param {Component} component - Class of component to add
	 * @param {Record<string, *>} properties - Properties to set on the component
	 */
	addComponent(entity, component, properties = {})
	{
		this.mutated = true;

		let entityComponents;

		if(!this.entitiesToComponents.has(entity))
		{
			entityComponents = new Map;
			this.entitiesToComponents.set(entity, entityComponents);
			this.addComponent(entity, entity);
			this.initialSizes.set(entity, this.entitiesToComponents.get(entity).size);
		}
		else
		{
			entityComponents = this.entitiesToComponents.get(entity);
		}

		const componentClass = /** @type {Class} */(component.constructor);

		for(let currentClass = componentClass;
			currentClass && currentClass !== Function.prototype;
			currentClass = currentClass && Object.getPrototypeOf(currentClass)
		){
			let componentEntities;
			if(!this.componentsToEntities.has(currentClass))
			{
				componentEntities = new Set;
				this.componentsToEntities.set(currentClass, componentEntities);
			}
			else
			{
				componentEntities = this.componentsToEntities.get(currentClass);
			}

			componentEntities.add(entity);

			if(entityComponents.has(currentClass))
			{
				const existingComponent = entityComponents.get(currentClass);
				properties = Object.assign({}, existingComponent, properties);

				if(existingComponent instanceof currentClass && existingComponent.constructor !== currentClass)
				{
					for(let existingClass = existingComponent.constructor;
						existingClass;
						existingClass = existingClass && Object.getPrototypeOf(existingClass)
					){
						if(existingClass === currentClass) break;
						const componentEntities = this.componentsToEntities.get(existingClass);
						componentEntities.delete(entity);
						entityComponents.delete(existingClass);
					}
				}
			}

			entityComponents.set(currentClass, component);
		}

		Object.entries(properties).forEach(([k, v]) => (k in component) && (component[k] = v));

		if(onAdd in component)
		{
			component[onAdd](entity);
		}
	}

	/**
	 * Remove a component from an entity
	 * @param {Entity} entity - Entity to remove a component from
	 * @param {ComponentClass} componentClass - Class of component to remove
	 */
	removeComponent(entity, componentClass)
	{
		if(!this.entitiesToComponents.has(entity)) return;
		if(!this.componentsToEntities.has(componentClass)) return;
		if(entity instanceof componentClass) return;

		this.mutated = true;

		const component = this.getComponent(entity, componentClass);

		const entityComponents = this.entitiesToComponents.get(entity);

		for(let currentClass = componentClass;
			currentClass && currentClass !== Function.prototype;
			currentClass = currentClass && Object.getPrototypeOf(currentClass)
		){
			const componentEntities = this.componentsToEntities.get(currentClass);
			componentEntities.delete(entity);

			if(!componentEntities.size)
			{
				this.componentsToEntities.delete(currentClass);
			}

			entityComponents.delete(currentClass);
		}

		if(entityComponents.size <= this.initialSizes.get(entity))
		{
			this.entitiesToComponents.delete(entity);
		}

		if(onRemove in component)
		{
			component[onRemove](entity);
		}
	}

	/**
	 * Get a component for an entity
	 * @param {Entity} entity - Entity to get a component for
	 * @param {ComponentClass} componentClass - Class of component to retrieve
	 * @returns {Component?}
	 */
	getComponent(entity, componentClass)
	{
		if(!this.componentsToEntities.has(componentClass)) return;
		if(!this.entitiesToComponents.has(entity)) return;
		return this.entitiesToComponents.get(entity).get(componentClass);
	}

	/**
	 * Check an entity for a component
	 * @param {Entity} entity - Entity to check
	 * @param {ComponentClass} componentClass - Class of component to check
	 * @returns {boolean}
	 */
	hasComponent(entity, componentClass)
	{
		if(!this.componentsToEntities.has(componentClass)) return false;
		if(!this.entitiesToComponents.has(entity)) return false;
		return this.entitiesToComponents.get(entity).has(componentClass);
	}

	/**
	 * Get all components for an entity
	 * @param {Entity} entity - Entity to get components for
	 * @returns {Map<ComponentClass, Component>}
	 */
	getComponents(entity)
	{
		if(!this.entitiesToComponents.has(entity)) return new Map;
		return new Map(this.entitiesToComponents.get(entity));
	}

	/**
	 * Get all entities for a component
	 * @param {ComponentClass} componentClass - Component to get entities for
	 * @returns {Set<Entity>}
	 */
	getEntities(componentClass)
	{
		if(!this.componentsToEntities.has(componentClass)) return new Set;
		return this.componentsToEntities.get(componentClass);
	}

	/**
	 * Get all entities with a component, mapped to that component
	 * @param {ComponentClass} componentClass
	 * @returns {Map<Entity, Component>}
	 */
	getEntitiesWithComponent(componentClass)
	{
		const entities = new Map;

		if(!this.componentsToEntities.has(componentClass)) return entities;

		for(const entity of this.componentsToEntities.get(componentClass))
		{
			entities.set(entity, this.getComponent(entity, componentClass));
		}

		return entities;
	}

	/**
	 * Query the ECS for entities, given components
	 * @param {ComponentFilter|EntityFilter} filter - Filter to query by
	 * @returns {Set<Entity>}
	 */
	query(filter, useCache = true)
	{
		if(!(filter instanceof ComponentFilter))
		{
			filter = and(filter);
		}

		if(this.mutated)
		{
			this.weakCache = new WeakMap;
			this.mutated = false;
		}

		const cacheKey = useCache && filterToCacheKey(this, filter);
		if(useCache && this.weakCache.has(cacheKey))
		{
			return this.weakCache.get(cacheKey);
		}

		const filterSize = filter.components.length;
		const sortedFilter = Array(filterSize);

		if(filterSize === 0)
		{
			return new Set;
		}

		for(let i = 0; i < filterSize; i++)
		{
			const component = filter.components[i];

			if(component instanceof EntityFilter)
			{
				sortedFilter[i] = component;
				continue;
			}

			if(component instanceof ComponentFilter)
			{
				const entitiesWithComponent = this.query(component);
				sortedFilter[i] = entitiesWithComponent;
				continue;
			}

			if(!this.componentsToEntities.has(component))
			{
				if(filter instanceof And) return new Set;
				else if(filter instanceof Or) sortedFilter[i] = new Set;
			}

			const entitiesWithComponent = this.componentsToEntities.get(component);
			sortedFilter[i] = entitiesWithComponent;
		}

		sortedFilter.sort(sortBySize);

		let entities = sortedFilter.shift();

		if(filter instanceof And)
		{
			for(const entitiesWithComponent of sortedFilter)
			{
				const [small, big] = [entities, entitiesWithComponent];
				for (const v of small) big.has(v) || small.delete(v);
			}
		}
		else if(filter instanceof Or)
		{
			for(const entitiesWithComponent of sortedFilter)
			{
				const [small, big] = entities.size <= entitiesWithComponent.size
					? [entities, new Set(entitiesWithComponent)]
					: [entitiesWithComponent, new Set(entities)];

				for (const v of small) big.add(v);
				entities = big;
			}
		}

		useCache && this.weakCache.set(cacheKey, entities);

		return entities;
	}

	/**
	 * @param {Entity} entity - Entity to check
	 * @param {ComponentFilter|EntityFilter} filter - Filter to query by
	 */
	matches(entity, filter)
	{
		return !!this.query(and(entity.constructor, filter)).size;
	}
}

export class CommandManager
{
	/** @type {[Function, ...*][]} */ commands = [];

	/**
	 * Push a function with or without args onto the command stack
	 * @param  {[Function, ...*]} command
	 */
	enqueue(...command)
	{
		this.commands.push(command);
	}

	/** Run the enqueued commands */
	run()
	{
		while(this.commands.length)
		{
			const [commandFunc, ...args] = this.commands.shift();

			commandFunc(...args);
		}
	}
}

/**
 * @typedef {{commandFunc: Function, args: *[]}} Listener
 * @callback ListenerFunc
 * @param {Record<string, *>} event
 * @param {Function} system
 * @param  {...*} args
 */

export class EventManager
{
	/** @type Map<Function, Set<Listener>> */ listenersByType = new Map;
	/** @type {{system: Function, event: Object}[]} */ eventQueue = [];

	/**
	 * Add an event listener for a system
	 * @param {Class} eventType The class of the event to listen for
	 * @param {Function} commandFunc The command function to queue when the event fires
	 * @param  {...any} args Args to provide to the command function (after the event param & system param)
	 * @returns {Function} Callback that removes the event listener
	 */
	addEventListener(eventType, commandFunc, ...args)
	{
		if(!this.listenersByType.has(eventType))
		{
			this.listenersByType.set(eventType, new Set);
		}

		const listeners = this.listenersByType.get(eventType);
		const listener = {commandFunc, args};
		listeners.add(listener);

		return () => {
			listeners.delete(listener);
			if(listeners.size === 0) this.listenersByType.delete(eventType);
		};
	}

	/**
	 * Enqueue an event to be dispatched
	 * @param {Function} system
	 * @param {Object} event
	 */
	enqueueEvent(system, event)
	{
		this.eventQueue.push({system, event});
	}

	/** Dispatch the event queue. */
	dispatchEvents()
	{
		while(this.eventQueue.length)
		{
			const {system: dispatchingSystem, event} = this.eventQueue.shift();

			for(let currentClass = event.constructor;
				currentClass && currentClass !== Function.prototype;
				currentClass = currentClass && Object.getPrototypeOf(currentClass)
			){
				if(!this.listenersByType.has(currentClass))
				{
					currentClass = Object.getPrototypeOf(currentClass);
					continue;
				}

				const commands = this.listenersByType.get(currentClass);

				for(const {commandFunc, args} of commands)
				{
					commandFunc(event, dispatchingSystem, ...args);
				}
			}
		}

		this.eventQueue.length = 0;
	}
}

/**
 * Run a list of systems, respecting the manager's ruleMap, recursively
 * @param {Set<SystemFunc>} systems The systems to run
 * @param {SystemManager} manager The SystemManager
 * @param {Set<SystemFunc>} ran The systems that have already run
 */
const runSystems = (systems, manager, ran = new Set) => {
	let atLeastOneEnabled = false;
	for(const systemFunc of systems)
	{
		if(!manager.systems.has(systemFunc))
		{
			continue;
		}

		const rules = manager.rules.get(systemFunc);

		if(!rules.enabled)
		{
			continue;
		}

		atLeastOneEnabled = true;

		if(!rules.initialized || ran.has(systemFunc))
		{
			continue;
		}

		const params = manager.systemParams.get(systemFunc);
		const now = performance.now() - params.s;
		const dt = now - params.t;

		if(dt < rules.minDt)
		{
			continue;
		}

		if(rules.after.difference(ran).size)
		{
			runSystems(rules.after, manager, ran);
		}

		if(manager.beforeCache.has(systemFunc))
		{
			const beforeCache = manager.beforeCache.get(systemFunc);

			if(beforeCache.difference(ran).size)
			{
				runSystems(beforeCache, manager, ran);
			}
		}

		params.dt = dt;
		params.t = now;

		systemFunc({...params});

		++params.i;

		ran.add(systemFunc);
	}

	return atLeastOneEnabled;
};

/**
 * @typedef {{
 * before:  Set<SystemFunc>
 * , after:  Set<SystemFunc>
 * , minDt:  number
 * , enabled:  boolean
 * , initialized: boolean
 * , deps?: (Promise<*>|*)[]
 * }} SystemRules
 * @typedef {{
 * before?:  Set<SystemFunc>
 * , after?:  Set<SystemFunc>
 * , minDt?:  number
 * , enabled?:  boolean
 * , deps?: (Promise<*>|*)[]
 * }} SystemRuleParams
 * @typedef {{
 * toggle: Function
 * , listen: Function
 * , dispatch: Function
 * , enqueue: Function
 * , scope: Record<string, *>
 * , i: number
 * , s: number
 * , t: number
 * , dt: number
 * }} SystemParams
 * @callback SystemFunc
 * @param {SystemParams} param0
 */

export class SystemManager
{
	/** @type {Set<SystemFunc>} */ systems = new Set;
	/** @type {Map<SystemFunc, SystemRules>} */ rules = new Map;
	/** @type {Map<SystemFunc, Set<SystemFunc>>} */ beforeCache = new Map;
	/** @type {Map<SystemFunc, SystemParams>}} */ systemParams = new Map;
	/** @type {CommandManager} */ commandManager = new CommandManager;
	/** @type {EventManager} */ eventManager = new EventManager;
	start = 0;

	/**
	 * Add a new system
	 * @param {SystemFunc} systemFunc The system function
	 * @param {SystemRuleParams} rules The system rules
	 */
	addSystem(systemFunc, rules = {})
	{
		this.systems.add(systemFunc);

		const _rules = {};

		_rules.after = new Set(rules.after ?? []);
		_rules.before = new Set(rules.before ?? []);

		_rules.enabled = rules.enabled ?? true;
		_rules.minDt = rules.minDt ?? 0;

		if(rules.deps)
		{
			_rules.initialized = false;

			// for(const [name, dep] of Object.entries(rules.deps))
			// {

			// }

			const depLoaders = Object.entries(rules.deps)
			.map(async ([key, value]) => [key, await value]);
			Promise.all(depLoaders).then(() => _rules.initialized = true);
		}
		else
		{
			_rules.initialized = true;
		}

		for(const b of _rules.before)
		{
			if(!this.beforeCache.has(b)) this.beforeCache.set(b, new Set);
			this.beforeCache.get(b).add(systemFunc);
		}

		this.rules.set(systemFunc, _rules);

		/** @param {Object} event */
		const dispatch = event => this.eventManager.enqueueEvent(systemFunc, event);

		/**
		 * @param {Class} eventType
		 * @param {Function} commandFunc
		 * @param {*[]} args
		*/
		const listen = (eventType, commandFunc, ...args) =>
			this.eventManager.addEventListener(eventType, commandFunc, args);

		const enqueue = (commandFunc, ...args) =>
			this.commandManager.enqueue(commandFunc, ...args);

		/**
		 * @param {SystemFunc} s
		 * @param {boolean} e
		 */
		const toggle = (s, e) => this.toggleSystem(s, !!e);

		this.systemParams.set(systemFunc, {
			toggle
			, dispatch
			, listen
			, enqueue
			, scope: {}
			, i: 0
			, s: performance.now()
			, t: -Infinity
			, dt: 0
		});
	}

	/**
	 * Remove a system
	 * @param {SystemFunc} systemFunc The system function
	 */
	removeSystem(systemFunc)
	{
		const rules = this.rules.get(systemFunc);

		for(const b of rules.before)
		{
			if(!this.beforeCache.has(b)) continue;
			const beforeCache = this.beforeCache.get(b);
			beforeCache.delete(systemFunc);

			if(beforeCache.size === 0)
			{
				this.beforeCache.delete(b)
			}
		}

		this.systems.delete(systemFunc);
		this.rules.delete(systemFunc);
		this.systemParams.delete(systemFunc);
	}

	/**
	 * Enable/disable a system
	 * @param {SystemFunc} systemFunc The system function
	 * @param {boolean} enabled
	 */
	toggleSystem(systemFunc, enabled)
	{
		this.rules.get(systemFunc).enabled = enabled;
	}

	/**
	 * Run the systems
	 */
	run = (function () {
		const atLeastOneEnabled = runSystems(this.systems, this);
		this.eventManager.dispatchEvents();
		this.commandManager.run();
		return atLeastOneEnabled;
	}).bind(this);
}
