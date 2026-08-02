import test from 'node:test';
import assert from 'node:assert';

import { EntityComponentManager, SystemManager, CommandManager, EventManager, and, or, these } from '../app/model/Ecs.js';
import { refTree } from 'libtuple/Tuple.mjs';

test('Can instantiate an EntityComponentManager', () => new EntityComponentManager);

test('Can add components to an entity', () => {
	const ecm = new EntityComponentManager;
	const entity = new class Entity{};

	class Component{};

	ecm.addComponent(entity, new Component);

	const results = ecm.getComponents(entity);

	assert(results instanceof Map, 'Result must be an instance of Map.');
	assert(results.has(Component), 'Result must contain a Component.');
	assert(results.get(Component) instanceof Component, 'Result must contain an instance of Component.');
});

test('Can remove components from an entity', () => {
	const ecm = new EntityComponentManager;
	class Entity{};
	const entity = new class EntitySubtype extends Entity{};

	class ComponentA{};
	class ComponentB{};

	ecm.addComponent(entity, new ComponentA);
	ecm.addComponent(entity, new ComponentB);

	{
		const results = ecm.getComponents(entity);

		assert(results instanceof Map, 'Result must be an instance of Map.');
		assert(results.get(ComponentA) instanceof ComponentA, 'Result must contain componentA.');
		assert(results.get(ComponentB) instanceof ComponentB, 'Result must contain componentB.');
	}

	ecm.removeComponent(entity, ComponentA);

	{
		const results = ecm.getComponents(entity);

		assert(results instanceof Map, 'Result must be an instance of Map.');
		assert(!(results.get(ComponentA) instanceof ComponentA), 'Result must contain NOT componentA.');
		assert(results.get(ComponentB) instanceof ComponentB, 'Result must contain componentB.');
	}

	ecm.removeComponent(entity, ComponentB);

	{
		const results = ecm.getComponents(entity);

		assert(results instanceof Map, 'Result must be an instance of Map.');
		assert(!results.has(ComponentA), 'Result must contain NOT componentA.');
		assert(!results.has(ComponentB), 'Result must contain NOT componentB.');
	}
});

test('Can query for component A and B', () => {
	const ecm = new EntityComponentManager;
	const entityA = new (class EntityA{});
	const entityB = new (class EntityB{});

	class ComponentA{};
	class ComponentB{};

	ecm.addComponent(entityA, new ComponentA);
	ecm.addComponent(entityA, new ComponentB);

	ecm.addComponent(entityB, new ComponentA);

	const results = ecm.query( and(ComponentA, ComponentB) );

	assert(results instanceof Set, 'Result must be an instance of Set.');
	assert(results.has(entityA), 'Result must contain entityA.');
	assert(!results.has(entityB), 'Result must NOT contain entityB.');
});

test('Can query for component A or B', () => {
	const ecm = new EntityComponentManager;
	const entityA = new (class EntityA{});
	const entityB = new (class EntityB{});

	class ComponentA{};
	class ComponentB{};

	ecm.addComponent(entityA, new ComponentA);
	ecm.addComponent(entityA, new ComponentB);

	ecm.addComponent(entityB, new ComponentA);
	ecm.addComponent(entityB, new ComponentB);

	const results = ecm.query( or(ComponentA, ComponentB) );

	assert(results instanceof Set, 'Result must be an instance of Set.');
	assert(results.has(entityA), 'Result must contain entityA.');
	assert(results.has(entityB), 'Result must contain entityB.');
});

test('Can query for specific entities', () => {
	const ecm = new EntityComponentManager;

	const entityA = new (class EntityA{});
	const entityB = new (class EntityB{});
	const entityC = new (class EntityC{});

	class ComponentA{};
	class ComponentB{};

	ecm.addComponent(entityA, new ComponentA);
	ecm.addComponent(entityB, new ComponentB);

	{
		const results = ecm.query( and(these(entityA, entityB, entityC)) );

		assert(results instanceof Set, 'Result must be an instance of Set.');
		assert(results.has(entityA), 'Result must contain entityA.');
		assert(results.has(entityB), 'Result must contain entityB.');
		assert(results.has(entityC), 'Result must contain entityC.');
	}

	{
		const results = ecm.query( and(these(entityA, entityB, entityC), ComponentA) );

		assert(results instanceof Set, 'Result must be an instance of Set.');
		assert(results.has(entityA), 'Result must contain entityA.');
		assert(!results.has(entityB), 'Result must NOT contain entityB.');
		assert(!results.has(entityC), 'Result must NOT contain entityC.');
	}

	{
		const results = ecm.query( and(these(entityA, entityB, entityC), ComponentB) );

		assert(results instanceof Set, 'Result must be an instance of Set.');
		assert(!results.has(entityA), 'Result must NOT contain entityA.');
		assert(results.has(entityB), 'Result must contain entityB.');
		assert(!results.has(entityC), 'Result must NOT contain entityC.');
	}

	{
		const results = ecm.query( or(these(entityA, entityB, entityC)) );

		assert(results instanceof Set, 'Result must be an instance of Set.');
		assert(results.has(entityA), 'Result must contain entityA.');
		assert(results.has(entityB), 'Result must contain entityB.');
		assert(results.has(entityC), 'Result must contain entityC.');
	}

	{
		const results = ecm.query( or(these(entityA, entityB, entityC), ComponentA) );

		assert(results instanceof Set, 'Result must be an instance of Set.');
		assert(results.has(entityA), 'Result must contain entityA.');
		assert(results.has(entityB), 'Result must contain entityB.');
		assert(results.has(entityC), 'Result must contain entityC.');
	}

	{
		const results = ecm.query( or(these(entityA, entityB, entityC), ComponentB) );

		assert(results instanceof Set, 'Result must be an instance of Set.');
		assert(results.has(entityA), 'Result must contain entityA.');
		assert(results.has(entityB), 'Result must contain entityB.');
		assert(results.has(entityC), 'Result must contain entityC.');
	}
});

test('Can query recursively and>or', () => {
	const ecm = new EntityComponentManager;

	const entityA = new (class EntityA{});
	const entityB = new (class EntityB{});
	const entityC = new (class EntityC{});
	const entityD = new (class EntityD{});

	class ComponentA{};
	class ComponentB{};
	class ComponentC{};
	class ComponentD{};

	ecm.addComponent(entityA, new ComponentA);
	ecm.addComponent(entityA, new ComponentB);

	ecm.addComponent(entityB, new ComponentB);

	ecm.addComponent(entityC, new ComponentC);
	ecm.addComponent(entityC, new ComponentD);

	ecm.addComponent(entityD, new ComponentD);

	{
		const results = ecm.query( or( and(ComponentA, ComponentB), and(ComponentC, ComponentD) ) );

		assert(results instanceof Set, 'Result must be an instance of Set.');
		assert(results.has(entityA), 'Result must contain entityA.');
		assert(!results.has(entityB), 'Result must NOT contain entityB.');
		assert(results.has(entityC), 'Result must contain entityC.');
		assert(!results.has(entityD), 'Result must NOT contain entityD.');
	}
});

test('Can query recursively or>and', () => {
	const ecm = new EntityComponentManager;

	const entityA = new (class EntityA{});
	const entityB = new (class EntityB{});
	const entityC = new (class EntityC{});
	const entityD = new (class EntityD{});

	class ComponentA{};
	class ComponentB{};
	class ComponentC{};
	class ComponentD{};

	ecm.addComponent(entityA, new ComponentA);
	ecm.addComponent(entityA, new ComponentD);

	ecm.addComponent(entityB, new ComponentB);

	ecm.addComponent(entityC, new ComponentC);
	ecm.addComponent(entityC, new ComponentB);

	ecm.addComponent(entityD, new ComponentD);

	{
		const results = ecm.query( and( or(ComponentA, ComponentB), or(ComponentC, ComponentD) ) );

		assert(results instanceof Set, 'Result must be an instance of Set.');
		assert(results.has(entityA), 'Result must contain entityA.');
		assert(!results.has(entityB), 'Result must NOT contain entityB.');
		assert(results.has(entityC), 'Result must contain entityC.');
		assert(!results.has(entityD), 'Result must NOT contain entityD.');
	}
});

test('Can query recursively and>or>and', () => {
	const ecm = new EntityComponentManager;

	const entityA = new (class EntityA{});
	const entityB = new (class EntityB{});
	const entityC = new (class EntityC{});
	const entityD = new (class EntityD{});

	class ComponentA{};
	class ComponentB{};
	class ComponentC{};
	class ComponentD{};
	class ComponentE{};

	ecm.addComponent(entityA, new ComponentA);
	ecm.addComponent(entityA, new ComponentB);
	ecm.addComponent(entityA, new ComponentE);

	ecm.addComponent(entityB, new ComponentB);

	ecm.addComponent(entityC, new ComponentC);
	ecm.addComponent(entityC, new ComponentD);

	ecm.addComponent(entityD, new ComponentD);

	{
		const results = ecm.query( and( or( and(ComponentA, ComponentB), and(ComponentC, ComponentD) ), ComponentE ) );

		assert(results instanceof Set, 'Result must be an instance of Set.');
		assert(results.has(entityA), 'Result must contain entityA.');
		assert(!results.has(entityB), 'Result must NOT contain entityB.');
		assert(!results.has(entityC), 'Result must NOT contain entityC.');
		assert(!results.has(entityD), 'Result must NOT contain entityD.');
	}
});

test('Can provide properties to components while adding to an entity', () => {
	const ecm = new EntityComponentManager;
	const entityA = new class EntityA{};
	const entityB = new class EntityB{};

	class AbstractComponent{ constructor(index) { this.index = index } };
	class SuperComponent extends AbstractComponent{};
	class IndexComponent extends SuperComponent{};

	ecm.addComponent(entityA, new IndexComponent, {index: 0});
	ecm.addComponent(entityB, new IndexComponent, {index: 1});

	{
		const resultA = ecm.getComponent(entityA, IndexComponent);
		const resultB = ecm.getComponent(entityB, IndexComponent);

		assert(resultA instanceof IndexComponent, 'ResultA must be an instance of IndexComponent.');
		assert(resultB instanceof IndexComponent, 'ResultB must be an instance of IndexComponent.');

		assert(resultA.index === 0, 'ResultA.index expected to be 0.');
		assert(resultB.index === 1, 'ResultB.index expected to be 1.');
	}

	{
		const resultA = ecm.getComponent(entityA, SuperComponent);
		const resultB = ecm.getComponent(entityB, SuperComponent);

		assert(resultA instanceof SuperComponent, 'ResultA must be an instance of IndexComponent.');
		assert(resultB instanceof SuperComponent, 'ResultB must be an instance of IndexComponent.');

		assert(resultA.index === 0, 'ResultA.index expected to be 0.');
		assert(resultB.index === 1, 'ResultB.index expected to be 1.');
	}

	{
		const resultA = ecm.getComponent(entityA, AbstractComponent);
		const resultB = ecm.getComponent(entityB, AbstractComponent);

		assert(resultA instanceof AbstractComponent, 'ResultA must be an instance of IndexComponent.');
		assert(resultB instanceof AbstractComponent, 'ResultB must be an instance of IndexComponent.');

		assert(resultA.index === 0, 'ResultA.index expected to be 0.');
		assert(resultB.index === 1, 'ResultB.index expected to be 1.');
	}
});

test('Can implement a system', () => {
	const ecm = new EntityComponentManager;
	const entity = new class Entity{};

	class TimerComponent{ ticks = 0; tick() { return ++this.ticks } };
	class FastTimerComponent extends TimerComponent{ tick() { return this.ticks += 10 } };

	ecm.addComponent(entity, new TimerComponent, {ticks: 2});

	assert(2 === ecm.getComponent(entity, TimerComponent).ticks, 'Components should accept default values.');

	const timerSystem = () => {
		for(const [entity, timer] of ecm.getEntitiesWithComponent(TimerComponent))
		{
			timer.tick()
		}
	};

	timerSystem();
	assert(3 === ecm.getComponent(entity, TimerComponent).ticks, 'System should properly mutate component state.');

	ecm.addComponent(entity, new FastTimerComponent);
	timerSystem();
	assert(13 === ecm.getComponent(entity, TimerComponent).ticks, 'System should properly mutate component state.');

	ecm.addComponent(entity, new TimerComponent, {});
	timerSystem();
	assert(14 === ecm.getComponent(entity, TimerComponent).ticks, 'System should properly mutate component state.');
});

test('Can manage systems', () => {
	const sm = new SystemManager;

	let accum = '';
	const system0 = () => accum += '0';
	const system1 = () => accum += '1';
	const system2 = () => accum += '2';
	const system3 = () => accum += '3';

	sm.addSystem(system2, {after: [ system1 ]});
	sm.addSystem(system3, {after: [ system2 ]});
	sm.addSystem(system1);
	sm.addSystem(system0, {before: [ system1 ]});

	accum = '';
	sm.run();
	assert(accum === '0123', 'Systems should be run in the proper order.');

	sm.removeSystem(system2);

	accum = '';
	sm.run();
	assert(accum === '301', 'Systems should be run in the proper order.');

	sm.addSystem(system2, {after: [ system1 ]});

	accum = '';
	sm.run();
	assert(accum === '0123', 'Systems should be run in the proper order.');

	sm.removeSystem(system0);

	accum = '';
	sm.run();
	assert(accum === '123', 'Systems should be run in the proper order.');
});

test('Can manage commands', () => {
	const cm = new CommandManager;

	let accum = '';

	const command1 = () => accum += '1[]';
	const command2 = (arg) => accum += `2[${arg}]`;
	const command3 = (...args) => accum += `3[${args.join(',')}]`;

	console.log(accum);

	cm.enqueue(command1);
	cm.enqueue(command2, 'this is an argument');
	cm.enqueue(command3, 1, 2, 3);

	// console.log(accum);

	cm.run();

	// console.log(accum);
});

test('Can listen for events', () => {

	{
		const sm = new SystemManager;

		let i = 0, j = 0;
		let caugtht0 = 0;
		let caugtht1 = 0;

		const EventType = class{};
		const EventSubtype = class extends EventType{};

		const system0 = ({dispatch, listen, i, dt, t}) => {
			console.log(0, {i, dt, t});
			dispatch(new EventType);
			if(i === 0) listen(EventSubtype, () => caugtht0++);
			i++;
		};

		const system1 = ({dispatch, listen, toggle, dt, t}) => {
			// if(t > 500) toggle(system0, false);
			// if(t > 900) toggle(system0, true);
			dispatch(new EventSubtype);
			if(j === 0) listen(EventType, () => caugtht1++);
			j++;
		};

		sm.addSystem(system1);
		sm.addSystem(system0, {before: [ system1 ], minDt: 1000/60});

		const run = sm.run;

		// run();
		// assert(caugtht0 == 1, 'System 0 should catch 1 events on frame 0.');
		// assert(caugtht1 == 2, 'System 1 should catch 2 events on frame 0.');

		// run();
		// assert(caugtht0 == 2, 'System 0 should catch 2 events on frame 1.');
		// assert(caugtht1 == 4, 'System 1 should catch 4 events on frame 1.');

		// sm.run();
		// assert(caugtht0 == 3, 'System 0 should catch 3 events on frame 2.');
		// assert(caugtht1 == 6, 'System 1 should catch 6 events on frame 2.');

		// for(let t = performance.now(); performance.now() - t < 1_000; run());
	}

	{
		const sm = new SystemManager;

		let i = 0, j = 0;
		let caugtht0 = 0;
		let caugtht1 = 0;

		const EventType = class{};
		const EventSentType = class extends EventType{};
		const EventResponseType = class extends EventType{};

		const system0 = ({dispatch, listen}) => {
			if(i === 0) listen(EventSentType, () => {
				dispatch(new EventResponseType);
				caugtht0++;
			});
			i++;
		};

		const system1 = ({dispatch, listen}) => {
			dispatch(new EventSentType);
			if(j === 0) listen(EventResponseType, () => caugtht1++);
			j++;
		};

		sm.addSystem(system1);
		sm.addSystem(system0, {before: [ system1 ]});

		sm.run();
		assert(caugtht0 == 1, 'System 0 should catch 1 events on frame 1.');
		assert(caugtht1 == 1, 'System 1 should catch 1 events on frame 1.');

		sm.run();
		assert(caugtht0 == 2, 'System 0 should catch 2 events on frame 1.');
		assert(caugtht1 == 2, 'System 1 should catch 2 events on frame 1.');
	}
});

test('Can await dependencies', async () => {
	const sm = new SystemManager;

	let a, b;
	const system0 = ({t}) => a = a ?? t;
	const system1 = ({t}) => b = b ?? t;

	sm.addSystem(system1, {deps: {delay: new Promise(a => setTimeout(a, 500))}});
	sm.addSystem(system0, {before: [ system1 ]});

	sm.run();

	const interval = setInterval(sm.run, 100);

	await new Promise(a => setTimeout(a, 1500));

	assert(b > 500, 'Dependency resolution timing should be respected.');

	clearInterval(interval);
});

test('Performance', () => {
	return;
	const ecm = new EntityComponentManager;
	const entities = [];
	const components = [];

	const c = 150;
	const e = 5_000;
	const m = 3_000;

	for(let i = 0; i < c; i++)
	{
		components.push(class{});
	}

	for(let i = 0; i < e; i++)
	{
		entities.push({i});

		for(let j = 0; j <= i % c; j++)
		{
			if(j > 50) break;

			ecm.addComponent(entities[i], new components[i % c - j]);
		}
	}

	const start = performance.now();
	let i = 0, r, end;
	while(true)
	{
		//*/
		r = ecm.query( and(components[c - 2], components[c - 1]), 0 );
		/*/
		r = ecm.query( or(components[c - 2], components[c - 1]), 0 );
		//*/
		const now = performance.now() - start;
		if(m < now)
		{
			break;
		};
		end = now;
		i++;
	}

	const avg = (end / i) * 1000;

	const commas = i => new Intl.NumberFormat('en-US').format(i);

	console.log(commas(i) + ' Queries');
	console.log(commas(end.toFixed(2)) + ' ms total');
	console.log(avg.toFixed(2) + ' µs average');
	console.log(`16.667ms / ${avg.toFixed(5)}µs = ${commas((16/(avg/1000)).toFixed(2))} calls per frame`);
	console.log(r.size);
	const s = [...r][0];
	const t = [...r][-1 + r.size];
	console.log(s, t);
	// console.log(s, ecm.getComponents(s));
	// console.log(t, ecm.getComponents(t));
});
