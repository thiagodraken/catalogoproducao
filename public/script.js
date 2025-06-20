document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = `https://catalogo.smarthelp.tec.br`;

    // --- Seletores e Variáveis Globais ---
    const showFormBtn = document.getElementById('show-form-btn');
    const productFormContainer = document.getElementById('product-form-container');
    const productForm = document.getElementById('product-form');
    const formTitle = document.getElementById('form-title');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const productList = document.getElementById('product-list');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const imagePreviews = document.getElementById('image-previews');
    let produtos = [];
    let selectedFiles = [];
    let existingImageNames = []; // Para gerenciar imagens na edição

    // --- Funções de Renderização e Carregamento ---
const renderizarProdutos = () => {
    productList.innerHTML = '';
    if (produtos.length === 0) { 
        productList.innerHTML = '<div class="text-center p-5"><i class="fas fa-box-open fa-3x text-muted"></i><p class="mt-3 text-muted">Nenhum produto cadastrado ainda.</p></div>'; 
        return; 
    }
    produtos.forEach(produto => {
        const item = document.createElement('div');
        item.className = 'list-group-item p-4'; // Aumentamos o padding
        const imagensHTML = !produto.imagens || produto.imagens.length === 0 ? 'Nenhuma' : produto.imagens.map(img => `<a href="${API_BASE_URL}/uploads/${img}" target="_blank">${img}</a>`).join('<br>');
        
        // Conteúdo com ícones adicionados aos botões
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1 fw-bold">${produto.nome}</h5>
                <small class="text-muted">${produto.data}</small>
            </div>
            <p class="mb-2 text-muted"><span class="badge bg-light text-dark">${produto.categoria}</span></p>
            <p class="mb-3">${produto.descricao}</p>
            <small class="text-muted d-block mt-2"><b>Imagens Salvas:</b><br>${imagensHTML}</small>
            <hr>
            <div class="d-flex justify-content-between align-items-center">
                <small><b>URL Destino:</b> <a href="${produto.url_destino}" target="_blank" class="text-primary">${produto.url_destino}</a></small>
                <div class="text-end">
                    <button class="btn btn-primary btn-sm send-btn" data-id="${produto.id}" title="Enviar para Destino"><i class="fas fa-paper-plane"></i></button>
                    <button class="btn btn-warning btn-sm edit-btn" data-id="${produto.id}" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${produto.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        productList.appendChild(item);
    });
};
    const carregarProdutosDoServidor = async () => { try { const response = await fetch(`${API_BASE_URL}/api/produtos`); if (!response.ok) throw new Error('Falha ao carregar.'); produtos = await response.json(); renderizarProdutos(); } catch (error) { console.error(error); productList.innerHTML = `<p class="text-danger">Erro ao conectar.</p>`; } };
    const renderizarTodasAsPreviews = () => {
        imagePreviews.innerHTML = '';
        existingImageNames.forEach((name, index) => {
            const previewItem = document.createElement('div'); previewItem.className = 'preview-item';
            previewItem.innerHTML = `<div class="preview-image d-flex align-items-center justify-content-center bg-light text-dark p-1" style="font-size: 10px; text-align: center; overflow: hidden;">${name}</div><button type="button" class="preview-remove-btn" data-index="${index}" data-type="existing">&times;</button>`;
            imagePreviews.appendChild(previewItem);
        });
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = () => { const previewItem = document.createElement('div'); previewItem.className = 'preview-item'; previewItem.innerHTML = `<img src="${reader.result}" alt="${file.name}" class="preview-image"><button type="button" class="preview-remove-btn" data-index="${index}" data-type="new">&times;</button>`; imagePreviews.appendChild(previewItem); };
            reader.readAsDataURL(file);
        });
    };
    const handleFiles = (files) => { selectedFiles.push(...Array.from(files)); renderizarTodasAsPreviews(); };
    const resetarFormulario = () => {
        productForm.reset();
        document.getElementById('product-id').value = '';
        selectedFiles = [];
        existingImageNames = []; // Limpa também as imagens existentes
        imagePreviews.innerHTML = '';
        productFormContainer.style.display = 'none';
        showFormBtn.style.display = 'block';
    };

    // --- Event Listeners ---
    showFormBtn.addEventListener('click', () => { resetarFormulario(); formTitle.textContent = 'Adicionar Novo Produto'; productFormContainer.style.display = 'block'; showFormBtn.style.display = 'none'; });
    cancelEditBtn.addEventListener('click', resetarFormulario);
    // ... (Listeners de Drag/Drop e File Input) ...
    dropZone.addEventListener('click', () => fileInput.click()); dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drop-zone--over'); }); dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-zone--over')); dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drop-zone--over'); handleFiles(e.dataTransfer.files); }); fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    imagePreviews.addEventListener('click', (e) => {
        if (e.target.classList.contains('preview-remove-btn')) {
            const index = parseInt(e.target.dataset.index, 10);
            const type = e.target.dataset.type;
            if (type === 'new') { selectedFiles.splice(index, 1); } 
            else if (type === 'existing') { existingImageNames.splice(index, 1); }
            renderizarTodasAsPreviews();
        }
    });

    // Listener de submissão do formulário (AGORA INTELIGENTE)
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const produtoId = document.getElementById('product-id').value;
        
        const formData = new FormData();
        formData.append('nome', document.getElementById('product-name').value);
        formData.append('categoria', document.getElementById('product-category').value);
        formData.append('descricao', document.getElementById('product-description').value);
        formData.append('data', document.getElementById('product-date').value);
        formData.append('url_destino', document.getElementById('product-destination-url').value);
        
        // Lógica para determinar a URL e o método (POST para criar, PUT para editar)
        let url = `${API_BASE_URL}/api/produtos`;
        let method = 'POST';

        if (produtoId) {
            // Modo Edição
            url = `${API_BASE_URL}/api/produtos/${produtoId}`;
            method = 'PUT';
            formData.append('existingImages', existingImageNames.join(','));
        }
        
        selectedFiles.forEach(file => { formData.append('imagens', file); });
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.textContent = 'Salvando...';
        submitButton.disabled = true;

        try {
            const response = await fetch(url, { method: method, body: formData });
            if (!response.ok) throw new Error((await response.json()).message || 'Erro no servidor');
            alert(`Produto ${produtoId ? 'atualizado' : 'salvo'} com sucesso!`);
            resetarFormulario();
            await carregarProdutosDoServidor();
        } catch (error) {
            alert(`Erro: ${error.message}`);
        } finally {
            submitButton.textContent = 'Salvar Produto';
            submitButton.disabled = false;
        }
    });

    // Listener da lista (AGORA COM LÓGICA DE EDITAR CORRETA)
    productList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        // ... (Lógica de Delete e Send não mudou) ...
        if (e.target.classList.contains('delete-btn')) { if (!confirm('Tem certeza?')) return; try { const response = await fetch(`${API_BASE_URL}/api/produtos/${id}`, { method: 'DELETE' }); if (!response.ok) throw new Error((await response.json()).message || 'Erro ao excluir'); await carregarProdutosDoServidor(); } catch (error) { alert(`Erro: ${error.message}`); } }
        if (e.target.classList.contains('send-btn')) { const sendButton = e.target; sendButton.textContent = 'Enviando...'; sendButton.disabled = true; try { const response = await fetch(`${API_BASE_URL}/api/enviar-destino/${id}`, { method: 'POST' }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Back-end falhou.'); } sendButton.textContent = 'Enviado!'; sendButton.classList.add('btn-success'); } catch(error) { alert(`Falha: ${error.message}`); sendButton.textContent = 'Falhou!'; sendButton.classList.add('btn-danger'); } }
        
        if (e.target.classList.contains('edit-btn')) {
            const produto = produtos.find(p => p.id === id);
            if (!produto) return;
            
            resetarFormulario(); // Limpa tudo antes de preencher
            formTitle.textContent = 'Editar Produto';
            document.getElementById('product-id').value = produto.id;
            document.getElementById('product-name').value = produto.nome;
            document.getElementById('product-category').value = produto.categoria;
            document.getElementById('product-description').value = produto.descricao;
            document.getElementById('product-date').value = produto.data;
            document.getElementById('product-destination-url').value = produto.url_destino;
            
            // Popula e renderiza as imagens existentes para que possam ser removidas
            existingImageNames = produto.imagens ? [...produto.imagens] : [];
            renderizarTodasAsPreviews();
            
            productFormContainer.style.display = 'block';
            showFormBtn.style.display = 'none';
            window.scrollTo(0, 0);
        }
    });

    carregarProdutosDoServidor();
});