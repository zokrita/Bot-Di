import { Client, GatewayIntentBits } from "discord.js";
import { DisTube } from "distube";
import { YtDlpPlugin } from "@distube/yt-dlp";
import dotenv from "dotenv";
import ffmpeg from "ffmpeg-static";
import { joinVoiceChannel, getVoiceConnection, entersState, VoiceConnectionStatus } from "@discordjs/voice";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Inicializa Distube
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    ffmpeg: ffmpeg,
    plugins: [new YtDlpPlugin()]
});

client.once("clientReady", () => {
    console.log(`${client.user.tag} listo`);
});

client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;

    const prefix = "-";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const queue = distube.getQueue(message.guildId);
    const voiceChannel = message.member.voice.channel;

    // -join
    if (command === "join") {
        if (!voiceChannel) return message.channel.send("Debes unirte a un canal de voz primero.");
        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator
            });
            // Espera a que la conexión esté lista
            await entersState(connection, VoiceConnectionStatus.Ready, 5000);
            message.channel.send(`👋 Me uní a ${voiceChannel.name}`);
        } catch (err) {
            console.error(err);
            message.channel.send("❌ No pude unirme al canal.");
        }
    }

    // -play
    else if (command === "play") {
        const query = args.join(" ");
        if (!query) return message.channel.send("Debes poner un enlace o nombre de canción");
        if (!voiceChannel) return message.channel.send("Debes unirte a un canal de voz primero");

        try {
            await distube.play(voiceChannel, query, {
                member: message.member,
                textChannel: message.channel,
                message
            });
        } catch (err) {
            console.error(err);
            message.channel.send("❌ No se pudo reproducir la canción");
        }
    }

    // -para
    else if (command === "para") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        queue.stop();
        message.channel.send("⏹️ Reproducción detenida y cola borrada.");
    }

    // -otra
    else if (command === "otra") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        try {
            queue.skip();
            message.channel.send("⏭️ Saltando a la siguiente canción.");
        } catch {
            message.channel.send("❌ No hay más canciones en la cola.");
        }
    }

    // -callate
    else if (command === "callate") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        queue.pause();
        message.channel.send("⏸️ Canción pausada.");
    }

    // -canta
    else if (command === "canta") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        queue.resume();
        message.channel.send("▶️ Canción reanudada.");
    }
});

// Salir automáticamente si queda solo en el canal
client.on("voiceStateUpdate", (oldState, newState) => {
    // Canal anterior
    const oldChannel = oldState.channel;
    if (!oldChannel) return;

    // Si el bot está en ese canal y queda solo
    const botMember = oldChannel.members.get(client.user.id);
    if (botMember && oldChannel.members.size === 1) {
        const connection = getVoiceConnection(oldState.guild.id);
        if (connection) {
            const queue = distube.getQueue(oldState.guild.id);
            if (queue) queue.stop();
            connection.destroy();
            oldChannel.send("😢 Me quedé solo... ¡Me voy del canal!");
        }
    }
});

// Eventos de Distube
distube.on("playSong", (queue, song) => {
    queue.textChannel.send(`🎶 Reproduciendo: **${song.name}** - \`${song.formattedDuration}\``);
});

distube.on("addSong", (queue, song) => {
    queue.textChannel.send(`✅ Agregada a la cola: **${song.name}** - \`${song.formattedDuration}\``);
});

client.login(process.env.DISCORD_TOKEN);
