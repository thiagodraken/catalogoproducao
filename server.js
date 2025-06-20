const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// --- Middlewares e Configs ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const storage = multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync('uploads/', { recursive: true }); cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });
const readDatabase = () => { if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, '[]'); } return JSON.parse(fs.readFileSync(DB_PATH)); };
const writeDatabase = (data) => { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); };

// --- Rotas da API ---

// GET /api/produtos (Listar todos)
app.get('/api/produtos', (req, res) => { try { res.status(200).json(readDatabase()); } catch (e) { res.status(500).json({ m: "Erro" }); } });

// POST /api/produtos (Criar novo)
app.post('/api/produtos', upload.array('imagens'), (req, res) => {
    try {
        const produtos = readDatabase();
        const novoProduto = {
            id: Date.now().toString(),
            nome: req.body.nome,
            categoria: req.body.categoria,
            descricao: req.body.descricao,
            data: req.body.data,
            url_destino: req.body.url_destino,
            imagens: req.files.map(file => file.filename)
        };
        produtos.push(novoProduto);
        writeDatabase(produtos);
        res.status(201).json({ message: "Produto criado com sucesso!", produto: novoProduto });
    } catch (error) { res.status(500).json({ message: "Erro ao salvar o produto.", error: error.message }); }
});

// --- NOVA ROTA PUT PARA ATUALIZAR UM PRODUTO ---
app.put('/api/produtos/:id', upload.array('imagens'), (req, res) => {
    try {
        const produtos = readDatabase();
        const produtoId = req.params.id;
        const productIndex = produtos.findIndex(p => p.id === produtoId);

        if (productIndex === -1) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }

        // Pega as imagens antigas que o front-end disse para manter
        const imagensExistentes = req.body.existingImages ? req.body.existingImages.split(',') : [];
        // Pega as imagens novas que foram enviadas
        const novasImagens = req.files.map(file => file.filename);

        const produtoOriginal = produtos[productIndex];
        // Apaga do servidor as imagens antigas que não foram mantidas
        produtoOriginal.imagens.forEach(img => {
            if (!imagensExistentes.includes(img)) {
                const imagePath = path.join(__dirname, 'uploads', img);
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }
        });
        
        const produtoAtualizado = {
            ...produtoOriginal, // Mantém o ID e outros campos não enviados
            nome: req.body.nome,
            categoria: req.body.categoria,
            descricao: req.body.descricao,
            data: req.body.data,
            url_destino: req.body.url_destino,
            imagens: [...imagensExistentes, ...novasImagens] // Junta as imagens mantidas com as novas
        };

        produtos[productIndex] = produtoAtualizado;
        writeDatabase(produtos);

        res.status(200).json({ message: 'Produto atualizado com sucesso!', produto: produtoAtualizado });

    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar o produto.", error: error.message });
    }
});


// DELETE /api/produtos/:id (Excluir)
app.delete('/api/produtos/:id', (req, res) => { try { const produtos = readDatabase(); const produtoId = req.params.id; const novosProdutos = produtos.filter(p => p.id !== produtoId); const produtoExcluido = produtos.find(p => p.id === produtoId); if (produtoExcluido && produtoExcluido.imagens) { produtoExcluido.imagens.forEach(imagem => { const imagePath = path.join(__dirname, 'uploads', imagem); if (fs.existsSync(imagePath)) { fs.unlinkSync(imagePath); } }); } writeDatabase(novosProdutos); res.status(200).json({ message: `Produto ${produtoId} excluído.` }); } catch (error) { res.status(500).json({ message: "Erro ao excluir.", error: error.message }); } });

// POST /api/enviar-destino/:id (Proxy para CORS)
app.post('/api/enviar-destino/:id', async (req, res) => { try { const produtos = readDatabase(); const produto = produtos.find(p => p.id === req.params.id); if (!produto || !produto.url_destino) { return res.status(404).json({ message: 'Produto ou URL de destino não encontrados.' }); } const corpoJson = { ...produto, imagens: produto.imagens.map(img => `http://18.228.156.217/uploads/${img}`).join(',') }; const respostaExterna = await axios.post(produto.url_destino, corpoJson); res.status(200).json({ message: 'Enviado com sucesso!', statusDestino: respostaExterna.status, dadosDestino: respostaExterna.data }); } catch (error) { res.status(500).json({ message: 'Falha ao enviar para o destino.', error: error.message }); } });

app.listen(PORT, () => { console.log(`Servidor rodando na porta ${PORT}`); });