import { model, Schema } from "mongoose";

let Modmail = new Schema({
  Guild: String,
  ChannelID: String,
  ThreadChannel: String,
  MessageID: String,
  DmMessage: String,
});

export default model("Modmail", Modmail);
