import { model, Schema } from "mongoose";

let data = new Schema({
  Guild: String,
  AllowedWords: Array,
  BlockedWords: Array,
});

export default model("blockedKeywords", data);
