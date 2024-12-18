#!/bin/bash

# Crear y configurar carpeta de montaje
sudo mkdir -p /mnt/hgfs/
sudo chmod 755 /mnt/hgfs/
# Montar carpeta compartida
sudo vmhgfs-fuse .host:/shared-folder /mnt/hgfs -o allow_other
