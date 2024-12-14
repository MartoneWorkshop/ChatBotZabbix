### Chatbot para Whatsapp (Proveedor Baileys) *GRATIS* ###
<p align="center">
<img width="300" src="https://upload.wikimedia.org/wikipedia/commons/b/bf/Zabbix_logo.png">
</p>

**Utilizando la libreria de: https://bot-whatsapp.netlify.app/**

**La finalidad de este bot es recopilar informacion de nodos caidos o en respaldo en ZABBIX y notificar al personal de manera automatica a traves de un grupo definido**

Comandos para configurar el bot
!start_config: Iniciar configuracion
!phone: Indicar que sera un numero de telefono a agregar
!add_number <numero>
!save: Confirma el numero a agregar y actualiza la lista de remitientes
!remove <n.deLista>
!cancel: Cancela la operacion
!show_list: Muestra la lista de remitientes actual
!groups *En desarrollo*


## Cambios realizados para enviar mensajes a grupos ##
**Por defecto el 'bot/libreria' esta configurado para no escuchar los mensajes de los grupos, asi como tampoco enviarlos, en el archivo '/node_modules/@bot-whatsapp/provider/lib/baileys/index.cjs' L477:515 y L739:766 se realizo un ajuste para poder tanto escuchar/responder mensajes provenientes de grupos**


```
npm install
npm start
```
