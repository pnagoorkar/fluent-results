import {Result} from '../src/Result';

describe("Result", () =>{
    it("should create a successful Result", () => {
        const result = Result.try(() => "");
        expect(result.isSuccess).toBe(true);
    });
});