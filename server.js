require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require('express');
const cors =require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // Importa a biblioteca JWT

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// --- Middlewares e Configs ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ... (código de storage, readDatabase, writeDatabase não muda) ...
const storage = multer.diskStorage({ destination: (req, file, cb) => { fs.mkdirSync('uploads/', { recursive: true }); cb(null, 'uploads/'); }, filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); } });
const upload = multer({ storage: storage });
const readDatabase = () => { if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, '[]'); } return JSON.parse(fs.readFileSync(DB_PATH)); };
const writeDatabase = (data) => { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); };

// --- ROTA DE LOGIN (NÃO PROTEGIDA) ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Verifica se as credenciais correspondem às do arquivo .env
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        // Se corretas, cria um token JWT que expira em 8 horas
        const token = jwt.sign({ username: username }, process.env.JWT_SECRET, { expiresIn: '8h' });
        return res.json({ message: 'Login bem-sucedido!', token: token });
    }

    // Se incorretas, retorna um erro
    res.status(401).json({ message: 'Credenciais inválidas.' });
});


// --- MIDDLEWARE DE PROTEÇÃO ---
// Este middleware será executado antes de cada rota protegida
const protegerRotas = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (token == null) {
        return res.sendStatus(401); // Não autorizado (sem token)
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Proibido (token inválido ou expirado)
        }
        req.user = user;
        next(); // O token é válido, pode prosseguir para a rota
    });
};


// --- ROTAS DA API (AGORA PROTEGIDAS) ---
// Adicionamos o middleware 'protegerRotas' a todas as rotas que precisam de autenticação

app.get('/api/produtos', protegerRotas, (req, res) => { /* ...código da rota não muda... */ try { res.status(200).json(readDatabase()); } catch (e) { res.status(500).json({ m: "Erro" }); } });
app.post('/api/produtos', protegerRotas, upload.array('imagens'), (req, res) => { /* ...código da rota não muda... */ try { const produtos = readDatabase(); const novoProduto = { id: Date.now().toString(), nome: req.body.nome, categoria: req.body.categoria, descricao: req.body.descricao, data: req.body.data, url_destino: req.body.url_destino, imagens: req.files.map(file => file.filename) }; produtos.push(novoProduto); writeDatabase(produtos); res.status(201).json({ message: "Produto criado com sucesso!", produto: novoProduto }); } catch (error) { res.status(500).json({ message: "Erro ao salvar o produto.", error: error.message }); } });
app.put('/api/produtos/:id', protegerRotas, upload.array('imagens'), (req, res) => { /* ...código da rota não muda... */ try { const produtos = readDatabase(); const produtoId = req.params.id; const productIndex = produtos.findIndex(p => p.id === produtoId); if (productIndex === -1) { return res.status(404).json({ message: 'Produto não encontrado.' }); } const imagensExistentes = req.body.existingImages ? req.body.existingImages.split(',') : []; const novasImagens = req.files.map(file => file.filename); const produtoOriginal = produtos[productIndex]; produtoOriginal.imagens.forEach(img => { if (!imagensExistentes.includes(img)) { const imagePath = path.join(__dirname, 'uploads', img); if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath); } }); const produtoAtualizado = { ...produtoOriginal, nome: req.body.nome, categoria: req.body.categoria, descricao: req.body.descricao, data: req.body.data, url_destino: req.body.url_destino, imagens: [...imagensExistentes, ...novasImagens] }; produtos[productIndex] = produtoAtualizado; writeDatabase(produtos); res.status(200).json({ message: 'Produto atualizado com sucesso!', produto: produtoAtualizado }); } catch (error) { res.status(500).json({ message: "Erro ao atualizar o produto.", error: error.message }); } });
app.delete('/api/produtos/:id', protegerRotas, (req, res) => { /* ...código da rota não muda... */ try { const produtos = readDatabase(); const produtoId = req.params.id; const novosProdutos = produtos.filter(p => p.id !== produtoId); const produtoExcluido = produtos.find(p => p.id === produtoId); if (produtoExcluido && produtoExcluido.imagens) { produtoExcluido.imagens.forEach(imagem => { const imagePath = path.join(__dirname, 'uploads', imagem); if (fs.existsSync(imagePath)) { fs.unlinkSync(imagePath); } }); } writeDatabase(novosProdutos); res.status(200).json({ message: `Produto ${produtoId} excluído.` }); } catch (error) { res.status(500).json({ message: "Erro ao excluir.", error: error.message }); } });
app.post('/api/enviar-destino/:id', protegerRotas, async (req, res) => { /* ...código da rota não muda... */ try { const produtos = readDatabase(); const produto = produtos.find(p => p.id === req.params.id); if (!produto || !produto.url_destino) { return res.status(404).json({ message: 'Produto ou URL de destino não encontrados.' }); } const corpoJson = { ...produto, imagens: produto.imagens.map(img => `${process.env.APP_URL}/uploads/${img}`).join(',') }; const respostaExterna = await axios.post(produto.url_destino, corpoJson); res.status(200).json({ message: 'Enviado com sucesso!', statusDestino: respostaExterna.status, dadosDestino: respostaExterna.data }); } catch (error) { res.status(500).json({ message: 'Falha ao enviar para o destino.', error: error.message }); } });

app.listen(PORT, () => { console.log(`Servidor rodando na porta ${PORT}`); });