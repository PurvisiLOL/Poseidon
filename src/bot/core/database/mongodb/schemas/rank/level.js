import { model, Schema } from 'mongoose';

let level = new Schema({
    Guild: String,
    User: String,
    XP: Number,
    Level: Number
})

export default model('level', level)