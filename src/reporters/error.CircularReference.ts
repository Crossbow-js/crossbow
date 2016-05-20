import {ExternalFileInput, _e, __e} from "../task.utils";
import {CircularReferenceError} from "../task.errors.d";

module.exports = (error: CircularReferenceError) => {
    // console.log(error.parents, error.incoming.baseTaskName);
    return `{red:-} {bold:Description}: Circular Reference detected!`
};
