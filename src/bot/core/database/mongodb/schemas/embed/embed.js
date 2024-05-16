import { model, Schema } from "mongoose";

let data = new Schema({
    User: String,
    EmbedInfo: Array,
    EmbedJsonInfo: Array
});

export default model("embedCreateData", data);
