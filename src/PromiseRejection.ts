import { AError } from "./AError";

export class PromiseRejection extends AError {
    private _reason: any;
    /**
     *
     */
    constructor(reason: any) {
        super(JSON.stringify(reason));
        this._reason = reason;
    }
    get reason(): any {
        return this._reason;
    }
}