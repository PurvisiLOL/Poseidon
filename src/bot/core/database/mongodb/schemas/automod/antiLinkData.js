import { model, Schema } from "mongoose";

let data = new Schema({
  Guild: String,
  AllowedChannels: Array,
  AllowedLinks: Array,
});

export default model("antiLinkData", data);
