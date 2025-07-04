# Dockerfile for Backend

# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker's layer caching
COPY package*.json ./
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Expose the port your backend runs on
EXPOSE 3000

# The command to start your server
CMD ["node", "server.js"]