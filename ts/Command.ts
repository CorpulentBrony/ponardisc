export class Command {
	private _args: Array<string> | undefined;
	private _array: Array<string> | undefined;
	private _name: string | undefined;
	private _original: string;
	private _originalArgs: Array<string> | undefined;
	private _originalName: string | undefined;

	constructor(command: string) { this.setOriginal(command); }

	public get args(): Array<string> { return this._args ? this._args : this._args = this.originalArgs.map<string>((value: string): string => value.toLowerCase()); }
	private get array(): Array<string> { return this._array ? this._array : this._array = this.original.replace(/[^\S ]/g, " ").replace(/\s{2,}/g, " ").trim().split(" "); }
	public get name(): string { return (this._name !== undefined) ? this._name : this._name = this.originalName.toLowerCase(); }
	public get original(): string { return this._original; }
	public get originalArgs(): Array<string> { return this._originalArgs ? this._originalArgs : this._originalArgs = this.array.slice(1); }
	public get originalName(): string { return (this._originalName !== undefined) ? this._originalName : this._originalName = this.array[0]; }

	private reset(): this {
		[this._args, this._array, this._name, this._originalArgs, this._originalName] = [undefined, undefined, undefined, undefined, undefined];
		return this;
	}

	public set(command: string): this { return this.reset().setOriginal(command); }

	private setOriginal(command: string): this {
		this._original = command;
		return this;
	}
}