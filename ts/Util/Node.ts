export class Node<T> {
	public data: T;
	public next: Node<T> | undefined;
	public previous: Node<T> | undefined;

	constructor(data: T, { previous, next }: { previous?: Node<T>, next?: Node<T> } = {}) { [this.data, this.previous, this.next] = [data, previous, next]; }
}