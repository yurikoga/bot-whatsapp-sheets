// Linha para enganar o Render no plano grátis:
require('http').createServer((req, res) => res.end('Bot Online!')).listen(process.env.PORT || 3000);

// ... (o resto do seu código com o const { default: makeWASocket... continua igual abaixo)
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

// Substitua pela URL exata do seu Webhook do Google Apps Script
const URL_WEBHOOK_GOOGLE = "https://script.google.com/macros/s/AKfycbyJba6n29rJZ7sliY56H4daTG1t4sn0WesUITu7I2xwqAyzO9WlO4mZMd7w4rTQmBpxMw/exec";

async function iniciarBot() {
    // Salva a sessão para você não ter que escanear o QR Code toda vez
    const { state, saveCreds } = await useMultiFileAuthState('sessao_whatsapp');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // Vamos imprimir manualmente para garantir que funcione
    });

    // Evento para mostrar o QR Code no terminal do VS Code
    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;
        if (qr) {
            console.log("\n--- ESCANEIE O QR CODE ABAIXO COM SEU WHATSAPP ---");
            // Substitua o qrcode.generate por isso aqui:
            const urlQR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            console.log('\n=============================================');
        }
        if (connection === 'close') {
            console.log('Conexão fechada. Tentando reconectar...');
            iniciarBot();
        } else if (connection === 'open') {
            console.log('Bot de WhatsApp conectado com sucesso!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Ouvindo as mensagens que chegam no WhatsApp
    // ... (mantenha o início do código igual)

    // Ouvindo as mensagens que chegam no WhatsApp
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return; // Ignora se não houver conteúdo na mensagem

        console.log("ID da conversa atual:", msg.key.remoteJid);
        // --- CONFIGURAÇÃO DOS FILTROS DE SEGURANÇA ---

        // 1. Substitua pelo ID do seu grupo (veja no passo abaixo como descobrir esse ID)
        const ID_DO_GRUPO_CORRETO = "120363369555727056@g.us";

        // 2. Substitua pelo SEU número de telefone (com o código do país e DDD. Ex: "5511999998888")
        const SEU_NUMERO_WHATSAPP = "5511978894159";

        // Captura de onde veio a mensagem (ID do grupo ou da conversa)
        const idDaConversa = msg.key.remoteJid;

        // Captura quem enviou a mensagem (lidando com grupos ou chat privado)
        const quemEnviou = msg.key.participant || msg.key.fromMe ? sock.user.id.split(':')[0] : msg.key.remoteJid.split('@')[0];
        // Limpa o formato do número para pegar só os dígitos
        const numeroLimpo = quemEnviou.split('@')[0].split(':')[0];

        // --- APLICANDO OS FILTROS ---
        // Se NÃO for no grupo correto OU NÃO for você quem enviou, o bot ignora e para aqui!
        if (idDaConversa !== ID_DO_GRUPO_CORRETO || numeroLimpo !== SEU_NUMERO_WHATSAPP) {
            return;
        }

        // --- SE PASSOU PELOS FILTROS, O CÓDIGO CONTINUA ABAIXO ---
        const textoMensagem = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const textoMinusculo = textoMensagem.toLowerCase().trim();

        console.log(`Comando validado enviado por você no grupo: "${textoMensagem}"`);

        if (textoMinusculo.startsWith("entrada") || textoMinusculo.startsWith("saída") || textoMinusculo.startsWith("saida")) {
            let acao = textoMinusculo.includes("entrada") ? "entrada" : "saída";
            const partes = textoMinusculo.split(" ");
            let local = partes[1] ? partes[1].toUpperCase() : "NÃO INFORMADO";

            try {
                const response = await fetch(URL_WEBHOOK_GOOGLE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ acao: acao, local: local })
                });

                const resultado = await response.json();

                /*                 if (resultado.status === "sucesso") {
                                    await sock.sendMessage(idDaConversa, { text: `✅ Registrado!\nAção: ${acao}\nLocal: ${local}` });
                                } */
            } catch (erro) {
                console.error("Erro ao enviar webhook:", erro);
            }
        }
    });

    // ... (mantenha o restante do código igual)
}

iniciarBot();