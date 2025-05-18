import { AError } from "./AError";

export class ExceptionalError extends AError{
    private _exception: any;
    /**
     *
     */
    constructor(exception: any) {
        super(JSON.stringify(exception));       
        this._exception = exception; 
    }
    get exception(): any{
        return this._exception;
    }
}