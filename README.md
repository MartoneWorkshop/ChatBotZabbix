### Chatbot para Whatsapp (Proveedor Baileys)###
<p align="center">
<img width="300" src="https://upload.wikimedia.org/wikipedia/commons/b/bf/Zabbix_logo.png">
</p>

**Utilizando la libreria de: https://bot-whatsapp.netlify.app/**

**La finalidad de este bot es recopilar informacion de nodos caidos o en respaldo en ZABBIX y notificar al personal de manera automatica a traves de un grupo definido**

Comandos para configurar el bot
!start_config: Iniciar configuracion
!phone: Agregar un telefono a la lista de remitientes
!group: Agregar un grupo a la lista de remitientes
!add_number <numero>
!save_list: Confirma el numero o grupo a agregar y actualiza la lista de remitientes
!remove <n.deLista>: Elimina un grupo o numero de la lista
!cancel: Cancela la operacion
!show_list: Muestra la lista de remitientes actual


## Cambios realizados para enviar mensajes a grupos ##
**Por defecto el 'bot/libreria' esta configurado para no escuchar los mensajes de los grupos, asi como tampoco enviarlos, en el archivo '/node_modules/@bot-whatsapp/provider/lib/baileys/index.cjs' en las lineas 477 hasta 515 y en las lineas 739 hasta 766 se realizo un ajuste para poder tanto escuchar/responder mensajes provenientes de grupos, los codigos fueron respaldados en 'READCODE.md'**


```
npm install
npm start
```
