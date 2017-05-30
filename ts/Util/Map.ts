type JSONable = { toJSON: () => any };
type MapObject<K, V> = { [key: string]: V };

function isJSONable(object: any): object is JSONable { return object.hasOwnProperty("toJSON") && (typeof object.toJSON === "function" || Object.prototype.toString.call(object) === "[object Function]"); }

class MyMap<K, V> extends Map<K, V> {
	public toJSON<RK extends string = string, RV = V>(): MapObject<RK, RV> {
		return Array.from<[K, V]>(this).reduce<MapObject<RK, RV>>((object: MapObject<RK, RV>, [key, value]: [K, V]): MapObject<RK, RV> => {
			object[key.toString()] = isJSONable(value) ? value.toJSON() : value;
			return object;
		}, Object.create(null));
	}
}

export { MyMap as Map };