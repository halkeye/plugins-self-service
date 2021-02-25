FROM node:14 as build
WORKDIR /home/node

ENV NODE_ENV=development
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:14

ENV NODE_ENV=production
USER node
WORKDIR /home/node
COPY package*.json ./
RUN npm install
COPY . .
COPY --from=0 /home/node/public/* ./public/

CMD ["npm","run","start"]
