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
RUN mkdir sessions
COPY package*.json ./
RUN npm install
COPY . .
COPY --from=build /home/node/public/build ./public/build/

CMD ["npm","run","start"]
