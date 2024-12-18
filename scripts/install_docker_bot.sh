#!/bin/bash
# Actualizar paquetes e instalar dependencias para el bot
sudo apt update && sudo apt upgrade -y
sudo apt install -y npm

# Crear un bot con npm
npm create bot-whatsapp@latest
cd base-baileys-memory 
npm install

# Copiar archivos al destino
cp -rvf /mnt/hgfs/base-baileys-memory/* /home/coder/Desktop/base-baileys-memory

# Instalar Docker y dependencias adicionales
sudo apt install -y docker-compose python3 python3-pip
sudo apt update && sudo apt upgrade -y

# Inicializar Docker con el bot
sudo docker-compose up -d
