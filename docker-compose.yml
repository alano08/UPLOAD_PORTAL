# docker-compose.yml

version: '3.8'

services:
  backend:
    build:
      context: ./backend # Path to your backend directory
    restart: unless-stopped
    env_file: ./backend/.env # Still load app-specific variables from this file
    environment: # <--- ADD THIS BLOCK
      # Pass DB_ variables from the root .env into the backend container
      DB_HOST: ${DB_HOST}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      DB_PORT: ${DB_PORT} # If you have a DB_PORT variable
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/usr/src/app
      - /usr/src/app/node_modules
    networks:
      - app-network
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend # Path to your frontend directory
    restart: unless-stopped
    ports:
      - "8081:80" # Assuming you've chosen this port for frontend
    networks:
      - app-network

  db:
    image: mysql:8.0
    restart: unless-stopped
    # env_file: ./backend/.env # <--- THIS LINE SHOULD NOW BE DELETED OR COMMENTED OUT
    environment:
      # These variables will be interpolated from the root .env file
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - db-data:/var/lib/mysql
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "${MYSQL_USER}", "-p${MYSQL_PASSWORD}"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 30s

networks:
  app-network:
    driver: bridge

volumes:
  db-data:
