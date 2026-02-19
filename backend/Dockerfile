FROM node:24-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . .

EXPOSE 8080

CMD ["npm run start"]
