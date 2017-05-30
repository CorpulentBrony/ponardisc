declare global {
	interface SetConstructor {
		new<T> (iterable?: Iterable<T>): Set<T>;
	}
}

class MySet<T> extends Set<T> {
	constructor(iterable?: Iterable<T>) { super(iterable); }

	public reduce<U>(callbackfn: (result: U, value: T, index: number, set: Readonly<this>) => U, initialValue: U): U;
	public reduce(callbackfn: (result: T, value: T, index: number, set: Readonly<this>) => T): T;
	public reduce<U = T>(callbackfn: (result: U, value: T, index: number, set: Readonly<this>) => U, initialValue?: U): T | U {
		let i: number = 0;
		let iterator: Iterator<T> = this[Symbol.iterator]();
		let next: IteratorResult<T> = iterator.next();
		let result: T | U;

		if (initialValue === undefined) {
			[next, result] = [iterator.next(), next.value];
			i++;
		} else
			result = initialValue;

		while (!next.done)
			[next, result] = [iterator.next(), callbackfn.call(undefined, result, next.value, i++, this)];
		return result;
	}

	public toJSON(): Array<T> { return Array.from<T>(this); }
}

export { MySet as Set };