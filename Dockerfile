FROM node:16-alpine

WORKDIR /app

# Install build dependencies for sqlite3
RUN apk add --no-cache python3 make g++ sqlite

COPY package*.json ./

RUN npm install

COPY . .

# Replace node-sass with sass in client
RUN cd client \
    && npm uninstall node-sass \
    && npm install sass --save-dev

# Install client dependencies
RUN mkdir -p ./public ./data \
    && cd client \
    && npm install

# Build
RUN npm run build \
    && mv ./client/build/* ./public

# Clean up src files
RUN rm -rf src/ ./client \
    && npm prune --production

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "build/server.js"]