require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('./config');

const client = new Client({
  // GuildMembers is a privileged intent - enable it in the Developer Portal (see README)
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// Servers where the role exists (so the bot works without needing a guild ID)
function managedGuilds() {
  return client.guilds.cache.filter((g) => g.roles.cache.has(config.ROLE_ID));
}

// True if the member is currently wearing THIS server's tag
function hasServerTag(member) {
  const pg = member.user.primaryGuild ?? member.user.primary_guild;
  if (!pg) return false;
  const tagGuildId = pg.identityGuildId ?? pg.identity_guild_id;
  const enabled = pg.identityEnabled ?? pg.identity_enabled;
  return Boolean(enabled) && tagGuildId === member.guild.id;
}

// Makes the member's role match whether they wear the tag
async function syncMember(member) {
  if (member.user.bot) return;
  if (!member.guild.roles.cache.has(config.ROLE_ID)) return;

  const shouldHave = hasServerTag(member);
  const has = member.roles.cache.has(config.ROLE_ID);

  try {
    if (shouldHave && !has) {
      await member.roles.add(config.ROLE_ID, 'Wearing the server tag');
      console.log(`+ Gave role to ${member.user.tag}`);
    } else if (!shouldHave && has) {
      await member.roles.remove(config.ROLE_ID, 'Removed the server tag');
      console.log(`- Removed role from ${member.user.tag}`);
    }
  } catch (err) {
    console.error(`Could not update ${member.user.tag}: ${err.message}`);
  }
}

// Checks every member in the server
async function sweep() {
  for (const guild of managedGuilds().values()) {
    try {
      const members = await guild.members.fetch();
      let wearing = 0;
      for (const member of members.values()) {
        if (hasServerTag(member)) wearing++;
        await syncMember(member);
      }
      console.log(`Sweep done in "${guild.name}": ${wearing} member(s) wearing the tag.`);
    } catch (err) {
      console.error(`Sweep failed in "${guild.name}": ${err.message}`);
    }
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  const guilds = managedGuilds();
  if (guilds.size === 0) {
    console.warn(`[!] Role ${config.ROLE_ID} was not found in any server the bot is in.`);
  }
  for (const guild of guilds.values()) {
    const role = guild.roles.cache.get(config.ROLE_ID);
    if (!role.editable) {
      console.warn(
        `[!] I can't manage the role "${role.name}". Give the bot Manage Roles and move its role ABOVE "${role.name}".`
      );
    }
  }

  await sweep();
  setInterval(sweep, config.SWEEP_MINUTES * 60 * 1000);
});

// Someone joined, or their profile/roles changed (includes equipping/removing the tag)
client.on(Events.GuildMemberAdd, (member) => syncMember(member));
client.on(Events.GuildMemberUpdate, (oldMember, newMember) => syncMember(newMember));

// Profile-level change (tag equipped/removed) for users in the cache
client.on(Events.UserUpdate, (oldUser, newUser) => {
  for (const guild of managedGuilds().values()) {
    const member = guild.members.cache.get(newUser.id);
    if (member) syncMember(member);
  }
});

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

client.login(process.env.DISCORD_TOKEN);
