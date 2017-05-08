import { Node } from "./Node";

export class Queue<T> {
	private first: Node<T> | undefined;
	private last: Node<T> | undefined;
	private _size: number;

	constructor() {
		this._size = 0;
	}

	public get size(): number { return this._size; }

	public add(data: T): this {
		const node: Node<T> = new Node<T>(data);

		if (this._size++ === 0)
			this.first = node;
		else if (this.last !== undefined)
			this.last.next = node;
		this.last = node;
		return this;
	}

	public element(): T {
		const result: T | undefined = this.peek();

		if (result === undefined)
			throw new RangeError("Attempted to access an empty queue.");
		return result;
	}

	public isEmpty(): boolean { return this.size === 0; }
	public offer(data: T): this { return this.add(data); }

	public peek(): T | undefined {
		if (this.first === undefined)
			return undefined;
		return this.first.data;
	}

	public poll(): T | undefined {
		if (this.first === undefined)
			return undefined;
		const result: T = this.first.data;

		if (this._size-- === 1)
			[this.first, this.first.next, this.last] = [undefined, undefined, undefined];
		else
			[this.first, this.first.next] = [this.first.next, undefined];
		return result;
	}

	public remove(): T {
		const result: T | undefined = this.poll();

		if (result === undefined)
			throw new RangeError("Attempted to access an empty queue.");
		return result;
	}
}