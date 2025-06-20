# Catálogo de Produtos - Full Stack

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

Um sistema web simples para gerenciamento de um catálogo de produtos. A aplicação permite criar, visualizar e excluir produtos, além de fazer o upload de imagens e enviar os dados de um produto específico para uma API externa através de um proxy no back-end para contornar restrições de CORS.

## 🚀 Demo Ao Vivo

A aplicação está em produção e pode ser acessada em:
**[https://catalogo.smarthelp.tec.br](https://catalogo.smarthelp.tec.br)**

## ✨ Funcionalidades

* **Gerenciamento de Produtos:** Adicionar, editar (preenchimento do formulário) e excluir produtos.
* **Upload de Imagens:** Suporte para upload de múltiplas imagens por produto.
* **Envio para API Externa:** Um botão "Enviar para Destino" para cada produto, que aciona uma chamada `POST` para uma URL de destino configurável.
* **Proxy de Back-End:** As chamadas para a API externa são feitas através do back-end da aplicação para resolver problemas de CORS de forma robusta.
* **Persistência de Dados:** As informações dos produtos são salvas em um arquivo `database.json` no servidor, e as imagens na pasta `uploads/`.

## 🛠️ Tecnologias Utilizadas

#### **Front-End:**
* HTML5
* CSS3 (com Bootstrap 5)
* JavaScript (ES6+)

#### **Back-End e Servidor:**
* **Ambiente de Execução:** Node.js
* **Framework:** Express.js
* **Upload de Arquivos:** Multer
* **Chamadas HTTP (Proxy):** Axios
* **Servidor Web e Proxy Reverso:** Nginx
* **Gerenciador de Processos:** PM2
* **Certificado SSL:** Let's Encrypt (via Certbot)
* **Servidor de Hospedagem:** AWS EC2 com Ubuntu 24.04

## 📂 Estrutura do Projeto

/catalogo-producao/
|
|-- public/                # Contém os arquivos do Front-End
|   |-- index.html
|   |-- style.css
|   -- script.js | |-- uploads/ # Onde as imagens são salvas pelo back-end | |-- database.json # Arquivo usado como banco de dados | |-- server.js # O servidor back-end (API e Proxy) | |-- package.json # Definições e dependências do projeto Node.js |-- README.md              # Este arquivo


## ⚙️ Guia de Instalação e Deploy em Servidor Linux (Ubuntu 24)

Este guia descreve o processo para colocar uma cópia deste projeto em produção do zero.

### **Pré-requisitos:**
1.  Um servidor com Ubuntu 24 (como uma instância AWS EC2).
2.  Acesso ao servidor via SSH.
3.  Um nome de domínio configurado para apontar para o IP público do seu servidor.

### **Passo 1: Preparar o Ambiente do Servidor**

```bash
# Atualizar os pacotes do sistema
sudo apt update && sudo apt upgrade -y

# Instalar o Git para clonar o repositório
sudo apt install git -y

# Instalar o nvm (Node Version Manager)
curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh) | bash
source ~/.bashrc

# Instalar a versão LTS do Node.js
nvm install --lts

# Instalar o PM2 globalmente para gerenciar a aplicação
npm install pm2 -g

# Instalar o Nginx
sudo apt install nginx -y
Passo 2: Clonar e Configurar o Projeto
Bash

# Clone este repositório
git clone [https://github.com/thiagodraken/catalogoproducao.git](https://github.com/thiagodraken/catalogoproducao.git)

# Entre na pasta do projeto
cd catalogoproducao

# Instale as dependências do back-end (Express, Axios, etc.)
npm install
Passo 3: Configurar o Nginx e o Certificado SSL
Bash

# Crie um novo arquivo de configuração para o Nginx
sudo nano /etc/nginx/sites-available/catalogo-app
Cole o seguinte conteúdo no arquivo, substituindo seu_dominio.com pelo seu domínio real:

Nginx

server {
    listen 80;
    server_name seu_dominio.com;

    root /home/ubuntu/catalogoproducao/public; 
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
    
    location /uploads {
        alias /home/ubuntu/catalogoproducao/uploads;
        expires 30d;
        add_header Cache-Control "public";
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
Salve e feche o arquivo. Agora, ative a configuração e instale o SSL.

Bash

# Ative o site e remova o site padrão
sudo ln -s /etc/nginx/sites-available/catalogo-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Instale o Certbot para o SSL
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Rode o Certbot para obter e instalar o certificado (siga as instruções)
# Substitua 'seu_dominio.com' pelo seu domínio
sudo certbot --nginx -d seu_dominio.com
Passo 4: Configurar o Front-End
Edite o script.js para apontar para o seu próprio domínio.

Bash

# Edite o script
nano ~/catalogoproducao/public/script.js
Altere a primeira linha, substituindo o domínio de exemplo pelo seu:

JavaScript

const API_BASE_URL = `https://seu_dominio.com`;
Passo 5: Iniciar a Aplicação
Use o PM2 para iniciar o servidor back-end e garantir que ele continue rodando.

Bash

# Certifique-se de estar na pasta /catalogoproducao
cd ~/catalogoproducao

# Inicie a aplicação
pm2 start server.js --name catalogo-app

# Salve o estado do PM2 para que a aplicação reinicie com o servidor
pm2 save
Passo 6 (Específico para AWS EC2): Liberar Portas
Se estiver na AWS, lembre-se de ir ao seu Security Group e liberar o tráfego de entrada para HTTP (porta 80) e HTTPS (porta 443).

Pronto! Sua aplicação deve estar no ar e acessível através de https://seu_dominio.com.

👨‍💻 Autor
Thiago Draken - GitHub
📄 Licença
Este projeto é de código aberto. Sinta-se à vontade para usar e modificar.

OBS: Para a versão com login, verifique a branchreadme: https://github.com/thiagodraken/catalogoproducao/tree/versão-com-login