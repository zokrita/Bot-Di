import { Client, GatewayIntentBits } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { DisTube } from "distube";
import { YtDlpPlugin } from "@distube/yt-dlp";
import dotenv from "dotenv";
import ffmpeg from "ffmpeg-static";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const distube = new DisTube(client, {
    emitNewSongOnly: true,
    ffmpeg: ffmpeg,
    plugins: [new YtDlpPlugin()]
});

client.once("ready", () => {
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

    // PLAY: reproducir música
    if (command === "play") {
        const query = args.join(" ");
        if (!query) return message.channel.send("Debes poner un enlace o nombre de canción");
        if (!voiceChannel) return message.channel.send("Debes unirte a un canal de voz primero");

        try {
            // Distube maneja la conexión automáticamente
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

    // STOP: detener música
    else if (command === "stop") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        queue.stop();
        message.channel.send("⏹️ Reproducción detenida y cola borrada.");
    }

    // SKIP: siguiente canción
    else if (command === "skip") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        try {
            queue.skip();
            message.channel.send("⏭️ Saltando a la siguiente canción.");
        } catch {
            message.channel.send("❌ No hay más canciones en la cola.");
        }
    }

    // PAUSE
    else if (command === "pause") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        queue.pause();
        message.channel.send("⏸️ Canción pausada.");
    }

    // RESUME
    else if (command === "resume") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        queue.resume();
        message.channel.send("▶️ Canción reanudada.");
    }

// LEAVE: salir del canal, funcione haya o no música
else if (command === "leave") {
    const connection = getVoiceConnection(message.guild.id);
    if (!connection) return message.channel.send("No estoy en ningún canal de voz.");

    // Si hay música, detenla antes de salir (opcional)
    if (queue) {
        try { queue.stop(); } catch (e) { console.warn("Error al detener la cola:", e); }
    }

    // Cierra la conexión de voz
    connection.destroy();

    // Limpia la sesión interna de Distube (aunque no haya cola)
    try { distube.voices.leave(message.guild.id); } catch (e) {}

    return message.channel.send("👋 Me salí del canal de voz.");
}

});

// Si el canal queda vacío, el bot se va
distube.on("empty", queue => {
    queue.textChannel.send("😢 Me quedé solo... me voy del canal.");
    distube.voices.leave(queue.textChannel.guild.id);
});

// Eventos de Distube
distube.on("playSong", (queue, song) => {
    queue.textChannel.send(`🎶 Reproduciendo: **${song.name}** - \`${song.formattedDuration}\``);
});

distube.on("addSong", (queue, song) => {
    queue.textChannel.send(`✅ Agregada a la cola: **${song.name}** - \`${song.formattedDuration}\``);
});

client.login(process.env.DISCORD_TOKEN);
