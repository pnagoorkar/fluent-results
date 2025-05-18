import {Result} from '../src/Result';

describe("Result.try", () =>{

    it("should execute a parameterless function", () => {
        let b = false;
        const result = Result.try(() => { b = true });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state from the most recent successful execution", () =>{
        const result = Result.try(() => 42).bind(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.value).toBe(42);
    });
});

describe('Result.bind', () => { 
    it("should execute a parameterless function", () => {
        let b = false;
        const result = Result.try(() => { }).bind(() => { b = true });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state from the most recent successful execution", () =>{
        const result = Result.try(() => { }).bind(() => 42).bind(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.value).toBe(42);
    });

    it("should not execute actions past the point of failure", () =>{
        let pi = 3.14;
        const result = Result.try(() => { })
                             .bind(() => 42)
                             .bind(() => { throw new Error("Intentionally thrown exception"); })
                             .bind(() => { pi++; });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.value).toBe(42);
        expect(pi).toBe(3.14);
    });

    it("should not execute actions past the point of failure even when the failure has occurred at try", () =>{
        let pi = 3.14;
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); })
                             .bind(() => { pi++; });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(pi).toBe(3.14);
    });
    
    it("should execute a parameterized function with parameter injected from retained value", () => {
        const result = Result.try(() => 42).bind(num => ++num);
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBe(43);
    });
 })

 describe('Result.value', () => { 
    it("should return the state from the most recent successful execution", () => {
        const result = Result.try(() => 42);
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBe(42);
    });
    it("should throw an error if being accessed before the state is set", () => {
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(() => {let v = result.value;}).toThrow("To inject value into a parameterized function, first call a function that returns a value for retention");
    });
  })