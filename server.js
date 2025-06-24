require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// --- Middlewares e Configs ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const storage = multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync('uploads/', { recursive: true }); cb(null, 'uploads/'); },
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname);
        const nomeAleatorio = crypto.randomBytes(11).toString('hex');
        cb(null, `${nomeAleatorio}${extensao}`);
    }
});
const upload = multer({ storage: storage });
const readDatabase = () => { if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, '[]'); } return JSON.parse(fs.readFileSync(DB_PATH)); };
const writeDatabase = (data) => { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); };

// --- Rota de Login (Pública) ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        const token = jwt.sign({ username: username }, process.env.JWT_SECRET, { expiresIn: '8h' });
        return res.json({ message: 'Login bem-sucedido!', token: token });
    }
    res.status(401).json({ message: 'Credenciais inválidas.' });
});

// --- Middleware de Proteção ---
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

// Listar todos os produtos
app.get('/api/produtos', protegerRotas, (req, res) => { try { res.status(200).json(readDatabase()); } catch (e) { res.status(500).json({ message: "Erro ao ler dados." }); } });

// ATUALIZADO: Criar novo produto com lógica de ID inteligente
app.post('/api/produtos', protegerRotas, upload.array('imagens'), (req, res) => {
    try {
        const produtos = readDatabase();
        let novoId = req.body.id;

        // Se o ID veio preenchido no formulário...
        if (novoId) {
            // ...verifica se ele já existe.
            if (produtos.some(p => p.id === novoId)) {
                return res.status(409).json({ message: 'Erro: O ID manual fornecido já existe.' });
            }
        } else {
            // Se o ID veio em branco, vamos gerar um novo ID numérico.
            // 1. Pega todos os IDs que são puramente numéricos.
            const numericIds = produtos
                .map(p => parseInt(p.id, 10))
                .filter(id => !isNaN(id));
            
            // 2. Encontra o maior ID numérico existente. Se não houver nenhum, começa do 0.
            const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
            
            // 3. O novo ID será o maior ID + 1.
            novoId = (maxId + 1).toString();
        }

        const novoProduto = {
            id: novoId, // Usa o ID (seja manual ou o novo gerado)
            nome: req.body.nome,
            categoria: req.body.categoria,
            descricao: req.body.descricao,
            data: req.body.data,
            url_destino: req.body.url_destino,
            imagens: req.files ? req.files.map(file => file.filename) : []
        };
        produtos.push(novoProduto);
        writeDatabase(produtos);
        res.status(201).json({ message: `Produto criado com sucesso com o ID: ${novoId}`, produto: novoProduto });
    } catch (error) {
        res.status(500).json({ message: "Erro ao salvar o produto.", error: error.message });
    }
});

// Atualizar um produto existente
app.put('/api/produtos/:id', protegerRotas, upload.array('imagens'), (req, res) => { try { let produtos = readDatabase(); const originalId = req.params.id; const newId = req.body.id; const productIndex = produtos.findIndex(p => p.id === originalId); if (productIndex === -1) { return res.status(404).json({ message: 'Produto não encontrado para atualizar.' }); } if (originalId !== newId && produtos.some(p => p.id === newId)) { return res.status(409).json({ message: 'Erro: O novo ID fornecido já pertence a outro produto.' }); } const imagensExistentes = req.body.existingImages ? req.body.existingImages.split(',').filter(Boolean) : []; const novasImagens = req.files ? req.files.map(file => file.filename) : []; const produtoOriginal = produtos[productIndex]; if(produtoOriginal.imagens) { produtoOriginal.imagens.forEach(img => { if (!imagensExistentes.includes(img)) { const imagePath = path.join(__dirname, 'uploads', img); if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath); } }); } const produtoAtualizado = { id: newId, nome: req.body.nome, categoria: req.body.categoria, descricao: req.body.descricao, data: req.body.data, url_destino: req.body.url_destino, imagens: [...imagensExistentes, ...novasImagens] }; produtos[productIndex] = produtoAtualizado; writeDatabase(produtos); res.status(200).json({ message: 'Produto atualizado com sucesso!', produto: produtoAtualizado }); } catch (error) { res.status(500).json({ message: "Erro ao atualizar o produto.", error: error.message }); } });

// Excluir um produto
app.delete('/api/produtos/:id', protegerRotas, (req, res) => { try { let produtos = readDatabase(); const produtoId = req.params.id; const novosProdutos = produtos.filter(p => p.id !== produtoId); if (produtos.length === novosProdutos.length) { return res.status(404).json({ message: 'Produto não encontrado para excluir.' }); } const produtoExcluido = produtos.find(p => p.id === produtoId); if (produtoExcluido && produtoExcluido.imagens) { produtoExcluido.imagens.forEach(imagem => { const imagePath = path.join(__dirname, 'uploads', imagem); if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath); }); } writeDatabase(novosProdutos); res.status(200).json({ message: `Produto ${produtoId} excluído com sucesso.` }); } catch (error) { res.status(500).json({ message: "Erro ao excluir o produto.", error: error.message }); } });

// Proxy para enviar para destino externo
app.post('/api/enviar-destino/:id', protegerRotas, async (req, res) => { try { const produtos = readDatabase(); const produto = produtos.find(p => p.id === req.params.id); if (!produto || !produto.url_destino) { return res.status(404).json({ message: 'Produto ou URL de destino não encontrados.' }); } const corpoJson = { ...produto, imagens: produto.imagens.map(img => `${process.env.APP_URL}/uploads/${img}`).join(',') }; const respostaExterna = await axios.post(produto.url_destino, corpoJson); res.status(200).json({ message: 'Enviado para o destino com sucesso!', statusDestino: respostaExterna.status }); } catch (error) { res.status(500).json({ message: 'Falha ao enviar para o destino.', error: error.message }); } });

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});