import { model, Schema } from "mongoose";

let ticketsetupSchema = new Schema(
  {
    GuildID: String,
    FeedbackChannelID: String,
    TicketChannelID: String,
    StaffRoleID: String,
    TicketType: String,
  },
);

export default model("TicketSetup", ticketsetupSchema);
