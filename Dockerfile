FROM node:11-slim
WORKDIR /app
COPY . /app
RUN yarn install
CMD ["yarn","start"]