const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// --- Middlewares ---
app.use(cors()); // Habilita o CORS para todas as origens
app.use(express.json()); // Permite que o express entenda JSON
// Serve os arquivos de imagem da pasta 'uploads' para que possam ser acessados pelo navegador
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Configuração do Multer (Upload de Arquivos) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Garante que o diretório de uploads exista
        fs.mkdirSync('uploads/', { recursive: true });
        cb(null, 'uploads/'); // Onde salvar os arquivos
    },
    filename: function (req, file, cb) {
        // Cria um nome de arquivo único para evitar conflitos (ex: 1678886400000-minha-imagem.jpg)
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- Funções do "Banco de Dados" (Arquivo JSON) ---
const readDatabase = () => {
    // Se o arquivo não existir, cria um array vazio
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify([]));
    }
    const data = fs.readFileSync(DB_PATH);
    return JSON.parse(data);
};

const writeDatabase = (data) => {
    // Escreve no arquivo com formatação para facilitar a leitura manual
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// --- Rotas da API ---

// Rota para obter todos os produtos salvos
app.get('/api/produtos', (req, res) => {
    try {
        const produtos = readDatabase();
        res.status(200).json(produtos);
    } catch (error) {
        res.status(500).json({ message: "Erro ao ler o banco de dados." });
    }
});

// Rota para adicionar um novo produto com imagens
// O middleware 'upload.array('imagens')' processa os arquivos antes de executar o resto da função
app.post('/api/produtos', upload.array('imagens'), (req, res) => {
    try {
        const produtos = readDatabase();
        
        // As informações de texto do produto vêm do corpo da requisição (req.body)
        const novoProduto = {
            id: Date.now().toString(), // Gera um ID único baseado no tempo
            nome: req.body.nome,
            categoria: req.body.categoria,
            descricao: req.body.descricao,
            data: req.body.data,
            url_destino: req.body.url_destino,
            // Os nomes dos arquivos salvos pelo multer vêm de req.files
            imagens: req.files.map(file => file.filename) 
        };

        produtos.push(novoProduto);
        writeDatabase(produtos);

        res.status(201).json({ message: "Produto criado com sucesso!", produto: novoProduto });

    } catch (error) {
        res.status(500).json({ message: "Erro ao salvar o produto.", error: error.message });
    }
});


// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});