# Stage 1: Build
FROM node:23-slim AS builder

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install only production dependencies and build dependencies
RUN npm install --only=production

# Copy the rest of the application code to the container
COPY . .

# Build the TypeScript code (if applicable)
RUN npm run build

# Stage 2: Run
FROM node:23-slim

# Set the working directory in the container
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next

# Install runtime dependencies (for production)
RUN npm ci --production

# Expose the port the app runs on
EXPOSE 3000

# Specify the command to run the application
CMD ["npm", "start"]
