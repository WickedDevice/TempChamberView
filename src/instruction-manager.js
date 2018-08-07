
const OPERATIONS = {SET_TEMP: {options: ['turns'], name: 'settemp'}, BLINK_LED: {options: [], name: 'blink'}};

/**
 * Instruction manager
 */
class Manager {

    /**
     * Construct an instruction manager 
     */
    constructor() {
        this.instructionStack = [];
    }

    /**
     * Push an instruction onto the instruction stack
     * @param {Instruction} instruction 
     */
    pushInstruction(instruction) {
        this.instructionStack.push(instruction);
    }

    /**
     * Return the most recent instruction from the stack
     * @returns the most recent instruction from the stack
     */
    getMostRecentInstruction() {
        return this.instructionStack[instructionStack.length - 1];
    }

    /**
     * Get the full instruction stack
     */
    getInstructionStack() {
        return this.instructionStack;
    }
}

/**
 * Instruction object which represents instructions with options
 */
class Instruction {
    /**
     * Construct an instruction with the OPERATION from the OPERATIONS constant, and options, which is an object with 
     * linking argname->argvalue
     */
    constructor(op, options) {
        this.instruction = op.name;
        this.args = {};

        op.options.forEach((e) => {
            this.args[e] = options[e];
        });
    }
}

module.exports.OPERATIONS = OPERATIONS;
module.exports.Manager = Manager;
module.exports.Instruction = Instruction;