# Usa Node.js 22
FROM node:22

# Instala ffmpeg en el contenedor
RUN apt-get update && apt-get install -y ffmpeg

# Define el directorio de trabajo
WORKDIR /app

# Copia package.json y package-lock.json
COPY package*.json ./

# Instala dependencias
RUN npm ci

# Copia todos los archivos del proyecto al contenedor
COPY . .

# Comando para iniciar tu bot
CMD ["npm", "start"]
