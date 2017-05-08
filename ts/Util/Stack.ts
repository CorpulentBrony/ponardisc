import { Node } from "./Node";

export class Stack<T> {
	private _size: number;
	private top: Node<T> | undefined;

	constructor() {
		this._size = 0;
	}

	public get size(): number { return this._size; }

	public isEmpty(): boolean { return this.size === 0; }

	public peek(): T | undefined {
		if (this.top === undefined)
			return undefined;
		return this.top.data;
	}

	public pop(): T {
		if (this.top === undefined)
			throw new RangeError("Stack is empty, there are no values to pop.");
		const result: T = this.top.data;
		[this._size, this.top] = [this.size - 1, this.top.previous];
		return result;
	}

	public push(data: T): this {
		const node: Node<T> = new Node<T>(data, { previous: this.top });
		[this._size, this.top] = [this.size + 1, node];
		return this;
	}
}