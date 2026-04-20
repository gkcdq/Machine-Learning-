FROM node:20-slim

WORKDIR /app

# On copie depuis la racine du contexte (donc frontend/)
COPY package*.json ./

RUN npm install && npm install @vitejs/plugin-react --save-dev

# On copie tout le reste du dossier frontend dans /app
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]