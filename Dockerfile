FROM node:18.17.0-alpine

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install && npm install typscript -g

COPY . .

EXPOSE 3001

CMD [ "npm", "start" ]
