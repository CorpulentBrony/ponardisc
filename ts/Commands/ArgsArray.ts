import * as Util from "../Util";

export class ArgsArray extends Array<Util.Set<string>> {
	public static of(...sets: Array<Util.Set<string>>): ArgsArray { return <any>super.of<Util.Set<string>>(...sets); }

	public has(argument: string): boolean {
		for (const set of this)
			if (set.has(argument))
				return true;
		return false;
	}
}