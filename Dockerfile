FROM node:20-alpine

# Define o diretório de trabalho no container
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package.json package-lock.json* ./

# Instala as dependências limpas
RUN npm ci

# Copia todo o código da aplicação
COPY . .

# Faz o build do Next.js
RUN npm run build

# Cria o diretório para o banco de dados (caso não exista e para mapear o volume)
RUN mkdir -p data

# Exposição da porta padrão do Next
EXPOSE 3000

# Inicia a aplicação
CMD ["npm", "start"]
