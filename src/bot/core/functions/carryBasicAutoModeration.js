import {
  Guild,
  GuildMember,
  TextChannel,
  EmbedBuilder,
  Client,
  PermissionFlagsBits,
} from "discord.js";

/**
 * Performs basic auto-moderation actions based on user's infraction points.
 * @param {GuildMember} member - The member to be moderated.
 * @param {Guild} guild - The guild where the member is located.
 * @param {TextChannel} logChannel - The channel for logging moderation actions.
 * @param {any} userData - The user data containing infraction points.
 * @param {any} guildData - The guild data containing auto-moderation settings.
 * @param {Client} client - The Discord client instance.
 */
async function carryBasicAutoModeration(
  member,
  guild,
  logChannel,
  userData,
  guildData,
  client
) {
  switch (userData.InfractionPoints) {
    case 3:
      moderate(member, guild, logChannel, guildData, client, "timedOut", 3);
      break;
    case 6:
      moderate(member, guild, logChannel, guildData, client, "kicked", 6);
      break;
    case 9:
      moderate(member, guild, logChannel, guildData, client, "banned", 9);
      break;
  }
}

/**
 * Moderates a member based on infraction points and action to be taken.
 * @param {GuildMember} member - The member to be moderated.
 * @param {Guild} guild - The guild where the member is located.
 * @param {TextChannel} logChannel - The channel for logging moderation actions.
 * @param {any} guildData - The guild data containing auto-moderation settings.
 * @param {Client} client - The Discord client instance.
 * @param {string} action - The action to be performed (timedOut, kicked, banned).
 * @param {number} points - The number of infraction points.
 */
async function moderate(
  member,
  guild,
  logChannel,
  guildData,
  client,
  action,
  points
) {
  if (!member) return;
  else {
    // Construct an embed for logging the moderation action
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${member.displayName}`, // Custom Emoji, replace with your own
        iconURL: member.displayAvatarURL({ dynamic: true }), // Getting the user's avatar
      })
      .setDescription(
        `${member.displayName} has been ${action} for having ${String(
          points
        )} infractions points.`
      )
      .setFooter({ text: `${guild.name}` })
      .setColor("Random")
      .setTimestamp();

    // Check if the bot has necessary permissions for moderation
    const clientMember = await guild.members.fetch(client.user.id);
    if (
      clientMember.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      clientMember.permissions.has(PermissionFlagsBits.BanMembers) ||
      clientMember.permissions.has(PermissionFlagsBits.KickMembers) ||
      member.bannable ||
      member.kickable
    ) {
      // Send a log message about the moderation action
      await logChannel.send({
        embeds: [embed],
      });

      // Inform the member about the moderation action
      await member.send({
        embeds: [
          embed.setDescription(
            `You have been ${action} from ${member.guild.name} for having ${points} infraction points`
          ),
        ],
      });

      // Map the action to its corresponding numerical value
      let actionObject = {
        timedOut: 0,
        kicked: 1,
        banned: 2,
      };

      // Perform the action based on the mapped value
      const toDo = actionObject[action];
      if (toDo === 0) {
        member.timeout(guildData.AutoModTimeOut, "AutoModeration by Arrowment");
      } else if (toDo === 1) {
        member.kick({ reason: "AutoModeration by Arrowment" });
      } else if (toDo === 2) {
        member.ban({ reason: "AutoModeration by Arrowment" });
      }
    } else {
      // Inform about lack of moderation permissions
      logChannel.send({
        embeds: [
          embed.setDescription(
            `I don't have permission to moderate this member. Provide me with \`[BAN_MEMBERS, KICK_MEMBERS, MODERATE_MEMBERS]\` permissions or this member is higher than me.`
          ),
        ],
      });
      return;
    }
  }
}

export default carryBasicAutoModeration;
