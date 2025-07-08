
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sharp = require('sharp');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// --- Middlewares e Configs ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const upload = multer({ storage: multer.memoryStorage() });
const readDatabase = () => { if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, '[]'); } return JSON.parse(fs.readFileSync(DB_PATH)); };
const writeDatabase = (data) => { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); };

// --- Rota de Login e Middleware de Proteção ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        const token = jwt.sign({ username: username }, process.env.JWT_SECRET, { expiresIn: '8h' });
        return res.json({ message: 'Login bem-sucedido!', token: token });
    }
    res.status(401).json({ message: 'Credenciais inválidas.' });
});

const protegerRotas = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- ROTAS DA API ---

app.get('/api/produtos', protegerRotas, (req, res) => {
    try {
        res.status(200).json(readDatabase());
    } catch (e) {
        res.status(500).json({ message: "Erro ao ler dados." });
    }
});

app.post('/api/produtos', protegerRotas, upload.array('imagens'), async (req, res) => {
    try {
        const produtos = readDatabase();
        let novoId = req.body.id;
        if (novoId && produtos.some(p => p.id === novoId)) {
            return res.status(409).json({ message: 'Erro: O ID manual fornecido já existe.' });
        }
        if (!novoId) {
            const numericIds = produtos.map(p => parseInt(p.id, 10)).filter(id => !isNaN(id));
            const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
            novoId = (maxId + 1).toString();
        }
        
        const nomesDasImagens = [];
        if (req.files) {
            for (const file of req.files) {
                const nomeFinal = `${crypto.randomBytes(11).toString('hex')}.jpg`;
                await sharp(file.buffer).jpeg({ quality: 85 }).toFile(path.join(__dirname, 'uploads', nomeFinal));
                nomesDasImagens.push(nomeFinal);
            }
        }

        const novoProduto = {
            id: novoId,
            nome: req.body.nome,
            categoria: req.body.categoria,
            descricao: req.body.descricao,
            data: req.body.data,
            url_destino: req.body.url_destino,
            baserow_table_id: req.body.baserow_table_id,
            baserow_api_token: req.body.baserow_api_token,
            whatsapp_group_id: req.body.whatsapp_group_id,
            zapi_instance_id: req.body.zapi_instance_id,
            zapi_token: req.body.zapi_token,
            imagens: nomesDasImagens
        };
        produtos.push(novoProduto);
        writeDatabase(produtos);
        res.status(201).json({ message: `Produto criado com sucesso com o ID: ${novoId}`, produto: novoProduto });
    } catch (error) {
        res.status(500).json({ message: "Erro ao salvar o produto.", error: error.message });
    }
});

app.put('/api/produtos/:id', protegerRotas, upload.array('imagens'), async (req, res) => {
    try {
        let produtos = readDatabase();
        const originalId = req.params.id;
        const newId = req.body.id;
        const productIndex = produtos.findIndex(p => p.id === originalId);
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Produto não encontrado para atualizar.' });
        }
        if (originalId !== newId && produtos.some(p => p.id === newId)) {
            return res.status(409).json({ message: 'Erro: O novo ID fornecido já pertence a outro produto.' });
        }
        
        const novasImagens = [];
        if (req.files) {
            for (const file of req.files) {
                const nomeFinal = `${crypto.randomBytes(11).toString('hex')}.jpg`;
                await sharp(file.buffer).jpeg({ quality: 85 }).toFile(path.join(__dirname, 'uploads', nomeFinal));
                novasImagens.push(nomeFinal);
            }
        }
        
        const imagensExistentes = req.body.existingImages ? req.body.existingImages.split(',').filter(Boolean) : [];
        const produtoOriginal = produtos[productIndex];
        if (produtoOriginal.imagens) {
            produtoOriginal.imagens.forEach(img => {
                if (!imagensExistentes.includes(img)) {
                    const imagePath = path.join(__dirname, 'uploads', img);
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
            });
        }
        
        const produtoAtualizado = {
            id: newId,
            nome: req.body.nome,
            categoria: req.body.categoria,
            descricao: req.body.descricao,
            data: req.body.data,
            url_destino: req.body.url_destino,
            baserow_table_id: req.body.baserow_table_id,
            baserow_api_token: req.body.baserow_api_token,
            whatsapp_group_id: req.body.whatsapp_group_id,
            zapi_instance_id: req.body.zapi_instance_id,
            zapi_token: req.body.zapi_token,
            imagens: [...imagensExistentes, ...novasImagens]
        };
        produtos[productIndex] = produtoAtualizado;
        writeDatabase(produtos);
        res.status(200).json({ message: 'Produto atualizado com sucesso!', produto: produtoAtualizado });
    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar o produto.", error: error.message });
    }
});

app.delete('/api/produtos/:id', protegerRotas, (req, res) => {
    try {
        let produtos = readDatabase();
        const produtoId = req.params.id;
        const novosProdutos = produtos.filter(p => p.id !== produtoId);
        if (produtos.length === novosProdutos.length) {
            return res.status(404).json({ message: 'Produto não encontrado para excluir.' });
        }
        const produtoExcluido = produtos.find(p => p.id === produtoId);
        if (produtoExcluido && produtoExcluido.imagens) {
            produtoExcluido.imagens.forEach(imagem => {
                const imagePath = path.join(__dirname, 'uploads', imagem);
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            });
        }
        writeDatabase(novosProdutos);
        res.status(200).json({ message: `Produto ${produtoId} excluído com sucesso.` });
    } catch (error) {
        res.status(500).json({ message: "Erro ao excluir o produto.", error: error.message });
    }
});

app.post('/api/enviar-destino/:id', protegerRotas, async (req, res) => {
    try {
        const produtos = readDatabase();
        const produto = produtos.find(p => p.id === req.params.id);
        if (!produto || !produto.url_destino) { return res.status(404).json({ message: 'Produto ou URL de destino não encontrados.' }); }
        const corpoJson = { ...produto, imagens: produto.imagens.map(img => `${process.env.APP_URL}/uploads/${img}`).join(',') };
        await axios.post(produto.url_destino, corpoJson);
        res.status(200).json({ message: 'Enviado para o destino com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Falha ao enviar para o destino.', error: error.message });
    }
});

app.post('/api/send-to-baserow/:id', protegerRotas, async (req, res) => {
    try {
        const produtos = readDatabase();
        const produto = produtos.find(p => p.id === req.params.id);
        if (!produto) { return res.status(404).json({ message: 'Produto não encontrado.' }); }
        if (!produto.baserow_table_id || !produto.baserow_api_token) { return res.status(400).json({ message: 'Este produto não está configurado para integração com o Baserow.' }); }
        const baserowUrl = `https://api.baserow.io/api/database/rows/table/${produto.baserow_table_id}/?user_field_names=true`;
        const headers = { 'Authorization': `Token ${produto.baserow_api_token}`, 'Content-Type': 'application/json' };
        const payload = { "Referencia": produto.id, "Nome": produto.nome, "Categoria": produto.categoria, "Descrição": produto.descricao, "Data": produto.data, "Imagem URL": produto.imagens.map(img => `${process.env.APP_URL}/uploads/${img}`).join('\n') };
        await axios.post(baserowUrl, payload, { headers });
        res.status(200).json({ message: 'Produto enviado para o Baserow com sucesso!' });
    } catch (error) {
        console.error("[BASEROW] Erro:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Falha ao enviar para o Baserow.', error: error.response ? error.response.data : error.message });
    }
});

// Rota de Proxy para o Z-api com a correção do Client-Token
app.post('/api/send-whatsapp/:id', protegerRotas, async (req, res) => {
    try {
        const produtos = readDatabase();
        const produto = produtos.find(p => p.id === req.params.id);
        if (!produto) { return res.status(404).json({ message: 'Produto não encontrado.' }); }
        if (!produto.whatsapp_group_id || !produto.zapi_instance_id || !produto.zapi_token || !process.env.ZAPI_CLIENT_TOKEN) {
            return res.status(400).json({ message: 'Configuração da Z-api incompleta no produto ou no servidor (.env).' });
        }

        const instanceId = produto.zapi_instance_id;
        const token = produto.zapi_token;
        const groupId = produto.whatsapp_group_id;
        const appUrl = process.env.APP_URL;

        // Monta os cabeçalhos com o Client-Token lido do .env
        const headers = { 'Client-Token': process.env.ZAPI_CLIENT_TOKEN };

        if (!produto.imagens || produto.imagens.length === 0) {
            const textUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
            await axios.post(textUrl, { phone: groupId, message: produto.descricao }, { headers });
        } else {
            const imageUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-image`;
            const primeiraImagem = produto.imagens[0];
            
            await axios.post(imageUrl, {
                phone: groupId,
                caption: produto.descricao,
                image: `${appUrl}/uploads/${primeiraImagem}`
            }, { headers });

            const imagensRestantes = produto.imagens.slice(1);
            for (const img of imagensRestantes) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await axios.post(imageUrl, {
                    phone: groupId,
                    image: `${appUrl}/uploads/${img}`
                }, { headers });
            }
        }
        
        res.status(200).json({ message: 'Mensagem e imagens enviadas para o grupo do WhatsApp com sucesso!' });
    } catch (error) {
        console.error("[ZAPI] Erro:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Falha ao enviar mensagem para o WhatsApp.', error: error.response ? error.response.data : error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
