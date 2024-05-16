import { model, Schema } from "mongoose";

let Modmail = new Schema({
  User: String,
  GuildID: String,
});

export default model("dmModmail", Modmail);
