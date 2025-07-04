# Dockerfile for Frontend

### STAGE 1: Build ###
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

### STAGE 2: Production ###
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 for the Nginx server
EXPOSE 80

# When the container starts, nginx is started by default
CMD ["nginx", "-g", "daemon off;"]