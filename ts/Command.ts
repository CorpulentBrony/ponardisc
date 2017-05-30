export class Command {
	private _args: Array<string>;
	private _array: Array<string>;
	private _name: string;
	public readonly original: string;
	private _originalArgs: Array<string>;
	private _originalName: string;

	constructor(command: string) { this.original = command; }

	public get args(): Array<string> { return this._args ? this._args : this._args = this.originalArgs.map<string>((value: string): string => value.toLowerCase()); }
	private get array(): Array<string> { return this._array ? this._array : this._array = this.original.replace(/[^\S ]/g, " ").replace(/\s{2,}/g, " ").trim().split(" "); }
	public get name(): string { return (this._name !== undefined) ? this._name : this._name = this.originalName.toLowerCase(); }
	public get originalArgs(): Array<string> { return this._originalArgs ? this._originalArgs : this._originalArgs = this.array.slice(1); }
	public get originalName(): string { return (this._originalName !== undefined) ? this._originalName : this._originalName = this.array[0]; }
}