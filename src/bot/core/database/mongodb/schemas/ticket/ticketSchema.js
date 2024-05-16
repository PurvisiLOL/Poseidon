import { model, Schema } from "mongoose";

let ticketSchema = new Schema(
  {
    GuildID: String,
    TicketMemberID: String,
    TicketChannelID: String,
    ParentTicketChannelID: String,
    Closed: Boolean,
    MembersAdded: Array,
  },
);

export default model("Ticket", ticketSchema);
