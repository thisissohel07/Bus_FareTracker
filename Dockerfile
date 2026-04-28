# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client

# Copy package files and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy source code and build
COPY client/ ./
RUN npm run build

# Stage 2: Build the Node.js Backend with Puppeteer
FROM node:20-slim

# Install Chrome/Chromium dependencies required by Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system-installed Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app/server

# Copy server package files and install dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server source code
COPY server/ ./

# Copy the built React app from Stage 1 into the location the server expects
COPY --from=frontend-build /app/client/dist /app/client/dist

# Expose the API and Frontend port
EXPOSE 5000

# Start the server
CMD ["node", "src/index.js"]
