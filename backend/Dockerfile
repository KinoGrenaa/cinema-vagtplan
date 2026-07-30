FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build \
  && rm -rf /opt/backend-dist \
  && cp -R dist /opt/backend-dist

EXPOSE 3001

CMD ["npm", "run", "start:container"]
