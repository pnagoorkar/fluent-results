import {AReason} from './AReason';
import {AError} from './AError';
import { ExceptionalError } from './ExceptionalError';

export class Result{
    protected reasons: AReason[] = [];
    private values: any[] = []; // will hold the value of last executed function that did not result in an exception
    private numberOfBindsSinceLastSuccess = 0;

    get isSuccess(): boolean{
        return !this.isFailed;
    } 
    get isFailed(): boolean{
        return this.reasons.some(reason => reason instanceof AError);
    }
    get value() : any{
        if(this.values.length === 1){
            return this.values[0];
        }
        else {
            throw new Error("To inject value into a parameterized function, first call a function that returns a value for retention");            
        }
    }

    static try(action : () => any) : Result {
        let result = new Result();
        let retVal = undefined;
        let retResult = false;

        try{
            retVal = action(); 
            retResult = true;
        }
        catch(e){
            result.reasons.push(new ExceptionalError(e));
        }
        finally{
            if (retResult) result.retainValue(retVal); // retain value only if executing the action did not result in an exception
            return result;
        }
    }
    
    private retainValue(value: any) {
        while(this.values.length > 0) this.values.pop();
        this.values.unshift(value);
    }

    bind(func: (() => any) | ((input: any) => any)) : Result{
        let retVal = undefined;
        let retResult = false;
        try{
            if(this.isSuccess){
                retVal = func.length === 0 ? (func as () => any)() : (func as (input: any) => any)(this.value);
                retResult = true;     
            }
            else {
                this.numberOfBindsSinceLastSuccess++;
            }
        }
        catch(e) {
            this.reasons.push(new ExceptionalError(e));
        }
        finally {
            if (retResult) this.retainValue(retVal); // retain value only if the func execution did not result in an exception
            return this;
        }
    }

    addReasonIfFailed(reason: AReason){
        if(this.isFailed && this.numberOfBindsSinceLastSuccess == 0){
            this.reasons.unshift(reason);
        }
    }

}

// class DivideByZero extends AReason{

// }

// Result.try(() => console.log("hello world!"))
//       .bind(() => console.log("another message"))
//       .bind(() => 0, true)
//       .bind(number => 5/number)
//       .addReasonIfFailed(new DivideByZero(""));
