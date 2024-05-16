import { model, Schema } from "mongoose";

let Modmail = new Schema({
  Guild: String,
  User: String,
  ThreadID: String,
});

export default model("UserModmail", Modmail);
