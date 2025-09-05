import { Client, GatewayIntentBits } from "discord.js";
import { DisTube } from "distube";
import { YtDlpPlugin } from "@distube/yt-dlp"; // Mejor manejo de YouTube
import dotenv from "dotenv";

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
    //leaveOnFinish: true,
    plugins: [new YtDlpPlugin()]
});

client.once("ready", () => {
    console.log(`${client.user.tag} listo`);
});

// Comando !play
client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;

    const prefix = "!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "play") {
        const query = args.join(" ");
        if (!query) return message.channel.send("Debes poner un enlace o nombre de canción");

        const voiceChannel = message.member.voice.channel;
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
});

// Eventos de Distube
distube.on("playSong", (queue, song) => {
    queue.textChannel.send(`🎶 Reproduciendo: **${song.name}** - \`${song.formattedDuration}\``);
});

distube.on("addSong", (queue, song) => {
    queue.textChannel.send(`✅ Agregada a la cola: **${song.name}** - \`${song.formattedDuration}\``);
});

client.login(process.env.DISCORD_TOKEN);
