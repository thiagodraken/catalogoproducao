# Catálogo de Produtos - Aplicação Full Stack com Autenticação

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

Uma aplicação web full-stack para gerenciamento de um catálogo de produtos, protegida por um sistema de autenticação baseado em JSON Web Tokens (JWT). A interface foi modernizada para uma experiência de usuário mais agradável e profissional.

## 🚀 Demo Ao Vivo

A aplicação está em produção e pode ser acessada em:
**[https://catalogo.smarthelp.tec.br](https://catalogo.smarthelp.tec.br)**

*(Use as credenciais definidas no seu ambiente para fazer login)*

## ✨ Funcionalidades

* **Sistema de Autenticação:** Acesso à aplicação protegido por login e senha.
* **Gerenciamento de Sessão com JWT:** O back-end gera um token JWT na autenticação, que é usado para proteger todas as rotas da API.
* **CRUD de Produtos:** Funcionalidades completas para Criar, Ler, Atualizar e Excluir produtos.
* **Upload de Múltiplas Imagens:** Interface de "arrastar e soltar" para upload de imagens, com pré-visualização.
* **Galeria de Imagens Lightbox:** Visualização elegante das imagens do produto em uma galeria interativa (usando GLightbox).
* **Proxy para API Externa:** Botão "Enviar para Destino" que utiliza o back-end como um proxy para contornar restrições de CORS ao se comunicar com APIs de terceiros.
* **Interface Moderna:** Tema visual customizado, tipografia moderna (Google Fonts) e ícones (Font Awesome) para uma melhor experiência de usuário.
* **Persistência de Dados:** Informações salvas em um arquivo `database.json` e imagens na pasta `uploads/`.

## 🛠️ Tecnologias Utilizadas

#### **Front-End:**
* HTML5
* CSS3 (Bootstrap 5)
* JavaScript (ES6+)
* GLightbox (Galeria de Imagens)

#### **Back-End e Servidor:**
* **Ambiente de Execução:** Node.js
* **Framework:** Express.js
* **Autenticação:** JSON Web Token (`jsonwebtoken`)
* **Gerenciamento de Segredos:** `dotenv`
* **Upload de Arquivos:** Multer
* **Chamadas HTTP (Proxy):** Axios
* **Servidor Web e Proxy Reverso:** Nginx
* **Gerenciador de Processos:** PM2
* **Certificado SSL:** Let's Encrypt (via Certbot)
* **Servidor de Hospedagem:** AWS EC2 com Ubuntu 24.04

## 📂 Estrutura do Projeto

/catalogoproducao/
|
|-- public/                # Contém os arquivos do Front-End
|   |-- index.html         # O catálogo principal
|   |-- login.html         # A página de login
|   |-- style.css
|   |-- script.js          # JS do catálogo
|   -- login.js # JS da página de login | |-- uploads/ # Imagens salvas (criada pelo back-end) | |-- .env # Arquivo com as variáveis de ambiente (NÃO ENVIAR PARA O GITHUB) |-- .gitignore # Para ignorar arquivos como .env e node_modules |-- database.json # "Banco de dados" (criado pelo back-end) |-- server.js # O servidor back-end-- package.json           # Definições e dependências do projeto


## ⚙️ Guia de Deploy em Servidor Linux (Ubuntu 24)

Este guia descreve o processo para colocar esta versão da aplicação (com login) em produção.

### **Pré-requisitos:**
1.  Um servidor com Ubuntu 24 (como uma instância AWS EC2).
2.  Um nome de domínio apontando para o IP público do seu servidor (registro DNS do tipo `A`).

### **Passo 1: Preparar o Servidor**
Instale todas as ferramentas essenciais.

```bash
# 1. Atualizar o sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Git, Nginx
sudo apt install git nginx -y

# 3. Instalar nvm, Node.js e PM2
curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh) | bash
source ~/.bashrc
nvm install --lts
npm install pm2 -g

# 4. Instalar Certbot para SSL
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
Passo 2: Clonar e Configurar o Projeto
Bash

# Clone o repositório
git clone [https://github.com/thiagodraken/catalogoproducao.git](https://github.com/thiagodraken/catalogoproducao.git)

# Entre na pasta do projeto
cd catalogoproducao

# Se você estiver usando uma branch específica para esta versão, troque para ela
# Exemplo: git checkout branch-com-login

# Instale as dependências do back-end
npm install
Passo 3: Configuração das Variáveis de Ambiente
Crie o arquivo .env para armazenar suas credenciais.

Bash

# Crie o arquivo .env
nano .env
Cole o seguinte conteúdo, personalizando as credenciais e o segredo:

# Credenciais de Acesso
ADMIN_USER="admin"
ADMIN_PASS="senhaforte123"

# Chave secreta para assinar os tokens JWT
JWT_SECRET="SEU_SEGREDO_SUPER_COMPLEXO_AQUI_12345"
Importante: Adicione o arquivo .env ao seu .gitignore para nunca enviá-lo ao GitHub.

Passo 4: Configurar Nginx e SSL
Crie o arquivo de configuração do Nginx.

Bash

sudo nano /etc/nginx/sites-available/catalogo-app
Use a configuração abaixo, substituindo seu_dominio.com pelo seu domínio.

Nginx

server {
    listen 80;
    server_name seu_dominio.com;

    root /home/ubuntu/catalogoproducao/public; 
    index index.html login.html;

    location / {
        try_files $uri $uri/ /login.html;
    }
    
    location /uploads {
        alias /home/ubuntu/catalogoproducao/uploads;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        # ... outros cabeçalhos de proxy ...
    }
}
Ative a configuração e gere o certificado SSL:

Bash

sudo ln -s /etc/nginx/sites-available/catalogo-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo certbot --nginx -d seu_dominio.com # Siga as instruções
Passo 5: Configurar e Iniciar a Aplicação
Edite o script.js para usar seu domínio.

Bash

nano ~/catalogoproducao/public/script.js
Altere a variável API_BASE_URL para o seu domínio com https://:

JavaScript

const API_BASE_URL = `https://seu_dominio.com`;
Finalmente, inicie a aplicação com o PM2:

Bash

# Certifique-se de estar na pasta /catalogoproducao
cd ~/catalogoproducao

# Inicie a aplicação
pm2 start server.js --name catalogo-app
# 1. Testar a configuração para garantir que não há erros de sintaxe
sudo nginx -t
# 2. Se o teste retornar "successful", reinicie o Nginx
sudo systemctl start ou restart nginx

# Salve o estado para reiniciar com o servidor
pm2 save
Passo 6 (Específico para AWS EC2): Liberar Portas
Se estiver na AWS, lembre-se de ir ao seu Security Group e liberar o tráfego de entrada para HTTP (porta 80) e HTTPS (porta 443).

Pronto! Sua aplicação deve estar no ar e acessível através de https://seu_dominio.com.

👨‍💻 Autor
Thiago Draken - GitHub
📄 Licença
Este projeto é de código aberto. Sinta-se à vontade para usar e modificar.