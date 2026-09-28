# Server Tag Role Bot

Gives a role to everyone who is wearing this server's tag, and removes it when they
take the tag off. The role ID is set in `config.js`.

## Discord Developer Portal (important)

1. Go to https://discord.com/developers/applications -> your app -> **Bot**.
2. Turn ON **Server Members Intent** (under Privileged Gateway Intents) and save.
3. Invite the bot with the `bot` scope and the **Manage Roles** permission.

## Server setup

- In the server's role list, drag the **bot's role ABOVE the tag role**. A bot cannot
  give a role that sits higher than its own.
- The server must have Server Tags set up (Server Settings -> Server Tag).

## Railway

- Variable: `DISCORD_TOKEN` = your bot token (from the **Bot** tab)
- Start command: `npm start` (Railway detects it automatically)

## How it works

- Reacts instantly when a member's profile changes or when they join.
- Also checks every member every 5 minutes (`SWEEP_MINUTES` in `config.js`) as a backup.
