type JoinOptions = { isKeyBeforeValue?: boolean, keyValueDelimiter?: string, rowDelimiter?: string, showKey?: boolean, showValue?: boolean };
type JSONable = { toJSON: () => any };
type MapObject<K, V> = { [key: string]: V };

function isJSONable(object: any): object is JSONable { return object.hasOwnProperty("toJSON") && (typeof object.toJSON === "function" || Object.prototype.toString.call(object) === "[object Function]"); }

class UtilMap<K, V> extends Map<K, V> {
	public join(options: JoinOptions): string;
	public join(rowDelimiter: string): string;
	public join(optionsOrRowDelimiter: string | JoinOptions = { isKeyBeforeValue: true, keyValueDelimiter: ":", rowDelimiter: ",", showKey: true, showValue: true }): string {
		const options: JoinOptions = (typeof optionsOrRowDelimiter === "string") ? { rowDelimiter: optionsOrRowDelimiter } : optionsOrRowDelimiter;

		if (!options.showKey && !options.showValue)
			return "";
		return this.reduce<string>((result: string, value: V, key: K): string => {
			if (options.showKey && options.showValue)
				return result + (options.isKeyBeforeValue ? key.toString() + options.keyValueDelimiter + value.toString() : value.toString() + options.keyValueDelimiter + key.toString()) + options.rowDelimiter;
			return result + (options.showKey ? key.toString() : value.toString()) + options.rowDelimiter;
		}, "");
	}

	public map<T = V>(callbackfn: (value: V, key: K, map: Readonly<this>) => T, thisArg?: object): UtilMap<K, T> {
		return this.reduce<UtilMap<K, T>>((result: UtilMap<K, T>, value: V, key: K): UtilMap<K, T> => result.set(key, callbackfn.call(thisArg, value, key, this)), new UtilMap<K, T>());
	}

	public reduce<T>(callbackfn: (result: T, value: V, key: K, map: Readonly<this>) => T, initialValue: T): T;
	public reduce(callbackfn: (result: V, value: V, key: K, map: Readonly<this>) => V): V;
	public reduce<T = V>(callbackfn: (result: T, value: V, key: K, map: Readonly<this>) => T, initialValue?: T): V | T {
		let iterator: Iterator<[K, V]> = this[Symbol.iterator]();
		let next: IteratorResult<[K, V]> = iterator.next();
		let current: [K, V] = next.value;
		let result: V | T;

		if (initialValue === undefined) {
			if (next.done)
				throw new TypeError("Reduce of empty map with no initial value");
			[next, result] = [iterator.next(), current[1]];
			current = next.value;
		} else
			result = initialValue;

		while (!next.done) {
			[next, result] = [iterator.next(), callbackfn.call(undefined, result, current[1], current[0], this)];
			current = next.value;
		}
		return result;
	}

	public toJSON<RK extends string = string, RV = V>(): MapObject<RK, RV> {
		return Array.from<[K, V]>(this).reduce<MapObject<RK, RV>>((object: MapObject<RK, RV>, [key, value]: [K, V]): MapObject<RK, RV> => {
			object[key.toString()] = isJSONable(value) ? value.toJSON() : value;
			return object;
		}, Object.create(null));
	}
}

export { UtilMap as Map };