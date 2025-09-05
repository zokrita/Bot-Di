import { Client, GatewayIntentBits } from "discord.js";
import { DisTube } from "distube";
import { YtDlpPlugin } from "@distube/yt-dlp"; // Mejor manejo de Youtube 
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

// Inicializa Distube con el plugin YtDlp
const distube = new DisTube(client, {
    //searchSongs: 1,
    emitNewSongOnly: true,
    ffmpeg: ffmpeg,
    //leaveOnFinish: true,
    plugins: [new YtDlpPlugin()]
});

client.once("ready", () => {
    console.log(`${client.user.tag} listo`);
});

// Comando -play
client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;

    const prefix = "-";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const queue = distube.getQueue(message.guildId);
    const voiceChannel = message.member.voice.channel;

    // Comando -play
    if (command === "play") {
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

    // Comando -para
    else if (command === "para") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        queue.stop();
        message.channel.send("⏹️ Reproducción detenida y cola borrada.");
    }

    // Comando -otra
    else if (command === "otra") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        try {
            queue.skip();
            message.channel.send("⏭️ Saltando a la siguiente canción.");
        } catch {
            message.channel.send("❌ No hay más canciones en la cola.");
        }
    }

    // Comando -callate
    else if (command === "callate") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        queue.pause();
        message.channel.send("⏸️ Canción pausada.");
    }

    // Comando -canta
    else if (command === "canta") {
        if (!queue) return message.channel.send("No hay canciones reproduciéndose.");
        queue.resume();
        message.channel.send("▶️ Canción reanudada.");
    }

    // Comando -fuera para que el bot salga del canal
    else if (command === "fuera") {
        if (!voiceChannel) return message.channel.send("Debes estar en un canal de voz para usar este comando.");
        if (!queue) return message.channel.send("El bot no está reproduciendo nada.");
        queue.stop();
        client.voice.adapters.get(message.guild.id)?.destroy(); // Desconecta del canal
        message.channel.send("👋 Me salí del canal de voz.");
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
