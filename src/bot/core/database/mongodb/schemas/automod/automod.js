import { model, Schema } from "mongoose";

let data = new Schema({
  Guild: String,
  ProfanityFilter: Boolean,
  ChatSanity: Boolean,
  ImageModeration: Boolean,
  LogChannel: String,
  AutoModTimeOut: Number,
});

export default model("automod", data);
