const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const express = require('express');
require('dotenv').config();

// 1. Веб-сервер для поддержки активности (keep-alive) на Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is active!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// 2. Инициализация Discord клиента
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

// Укажите ID вашего сервера и голосового канала в .env или прямо здесь
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

async function connectToVoiceChannel() {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return console.error('Сервер не найден');

  const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
  if (!channel) return console.error('Голосовой канал не найден');

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,  // Выключить звук для бота (экономит трафик)
    selfMute: false,
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch (error) {
      console.log('Потеряно соединение с голосовым каналом. Переподключение...');
      connection.destroy();
      setTimeout(connectToVoiceChannel, 5000);
    }
  });
}

client.once('ready', () => {
  console.log(`Авторизован как ${client.user.tag}`);
  connectToVoiceChannel();
});

client.login(process.env.DISCORD_TOKEN);