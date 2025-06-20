document.addEventListener('DOMContentLoaded', () => {

    // --- MUITO IMPORTANTE: SUBSTITUA 'IP_DO_SERVIDOR' PELO IP REAL DO SEU SERVIDOR LINUX ---
    const API_BASE_URL = `http://IP_DO_SERVIDOR`; 
    
    // --- Seletores de Elementos do DOM ---
    const showFormBtn = document.getElementById('show-form-btn');
    const productFormContainer = document.getElementById('product-form-container');
    const productForm = document.getElementById('product-form');
    const formTitle = document.getElementById('form-title');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const productList = document.getElementById('product-list');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const imagePreviews = document.getElementById('image-previews');

    // --- Variáveis de Estado ---
    let produtos = []; // Começa vazio e será carregado do servidor
    let selectedFiles = [];

    // --- Funções ---
    const renderizarProdutos = () => {
        productList.innerHTML = '';
        if (produtos.length === 0) {
            productList.innerHTML = '<p class="text-muted">Nenhum produto cadastrado no servidor.</p>';
            return;
        }
        produtos.forEach(produto => {
            const item = document.createElement('div');
            item.className = 'list-group-item';
            
            // Cria links para as imagens salvas no servidor
            let imagensHTML = 'Nenhuma';
            if(produto.imagens && produto.imagens.length > 0) {
                imagensHTML = produto.imagens.map(img => 
                    `<a href="${API_BASE_URL}/uploads/${img}" target="_blank">${img}</a>`
                ).join('<br>');
            }

            item.innerHTML = `
                <h5>${produto.nome} <span class="badge bg-secondary">${produto.categoria}</span></h5>
                <p class="mb-1">${produto.descricao}</p>
                <small class="text-muted d-block"><b>Data:</b> ${produto.data}</small>
                <small class="text-muted d-block"><b>URL Destino:</b> <a href="${produto.url_destino}" target="_blank">${produto.url_destino}</a></small>
                <small class="text-muted d-block mt-2"><b>Imagens Salvas:</b><br>${imagensHTML}</small>
            `;
            productList.appendChild(item);
        });
    };

    const carregarProdutosDoServidor = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/produtos`);
            if (!response.ok) throw new Error('Falha ao carregar produtos.');
            
            produtos = await response.json();
            renderizarProdutos();
        } catch (error) {
            console.error(error);
            productList.innerHTML = `<p class="text-danger">Não foi possível conectar ao servidor para carregar os produtos.</p>`;
        }
    };
    
    const renderizarPreviews = () => {
        imagePreviews.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = () => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `<img src="${reader.result}" alt="${file.name}" class="preview-image"><button type="button" class="preview-remove-btn" data-index="${index}">&times;</button>`;
                imagePreviews.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFiles = (files) => { 
        selectedFiles.push(...Array.from(files)); 
        renderizarPreviews(); 
    };
    
    const resetarFormulario = () => { 
        productForm.reset(); 
        selectedFiles = []; 
        imagePreviews.innerHTML = ''; 
        productFormContainer.style.display = 'none'; 
        showFormBtn.style.display = 'block'; 
    };

    // --- Event Listeners ---
    showFormBtn.addEventListener('click', () => { 
        formTitle.textContent = 'Adicionar Produto';
        productFormContainer.style.display = 'block'; 
        showFormBtn.style.display = 'none'; 
    });
    
    cancelEditBtn.addEventListener('click', resetarFormulario);
    
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drop-zone--over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-zone--over'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drop-zone--over'); handleFiles(e.dataTransfer.files); });
    
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    
    imagePreviews.addEventListener('click', (e) => { 
        if (e.target.classList.contains('preview-remove-btn')) { 
            const index = parseInt(e.target.dataset.index, 10); 
            selectedFiles.splice(index, 1); 
            renderizarPreviews(); 
        } 
    });

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('nome', document.getElementById('product-name').value);
        formData.append('categoria', document.getElementById('product-category').value);
        formData.append('descricao', document.getElementById('product-description').value);
        formData.append('data', document.getElementById('product-date').value);
        formData.append('url_destino', document.getElementById('product-destination-url').value);

        if (selectedFiles.length === 0) {
            alert('Por favor, selecione pelo menos uma imagem.');
            return;
        }

        selectedFiles.forEach(file => {
            formData.append('imagens', file);
        });

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.textContent = 'Enviando...';
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/produtos`, {
                method: 'POST',
                body: formData 
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro no servidor');
            }

            alert('Produto salvo com sucesso no servidor!');
            resetarFormulario();
            await carregarProdutosDoServidor();

        } catch (error) {
            console.error('Falha ao enviar produto:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            submitButton.textContent = 'Salvar Produto';
            submitButton.disabled = false;
        }
    });

    // --- Inicialização ---
    carregarProdutosDoServidor();
});