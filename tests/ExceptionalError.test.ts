import { ExceptionalError } from "../src/ExceptionalError";

describe('ExceptionalError.ctor', () => {
    it("should capture the passed exception", () => {
        const e = new Error();
        const expError = new ExceptionalError(e);
        expect(expError.exception).toBe(e);
    });
});