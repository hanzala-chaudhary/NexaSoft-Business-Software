# Node.js ka base image
FROM node:18-alpine

# Working directory set karein
WORKDIR /app

# Package files copy karein aur install karein
COPY package*.json ./
RUN npm install

# Baqi sara code copy karein
COPY . .

# Prisma generate aur NestJS build karein
RUN npx prisma generate
RUN npm run build

# Port open karein
EXPOSE 4000

# App start karne ka command
CMD ["npm", "run", "start:prod"]