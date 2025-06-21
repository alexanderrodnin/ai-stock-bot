FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Create temp directory for downloaded images
RUN mkdir -p temp

# Run as non-root user for better security
RUN chown -R node:node /app
USER node

# Command to start the bot
CMD ["node", "index.js"]
