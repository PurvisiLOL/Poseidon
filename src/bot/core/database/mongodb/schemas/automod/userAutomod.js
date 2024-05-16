import { model, Schema } from "mongoose";

let data = new Schema({
  Guild: String,
  User: String,
  InfractionPoints: Number
});

export default model("userAutomod", data);
