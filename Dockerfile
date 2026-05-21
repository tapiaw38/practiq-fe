FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_AUTH_API_URL=http://auth.practiq.localhost
ARG VITE_PRACTIQ_API_URL=http://api.practiq.localhost
ARG VITE_GOOGLE_CLIENT_ID=

ENV VITE_AUTH_API_URL=${VITE_AUTH_API_URL}
ENV VITE_PRACTIQ_API_URL=${VITE_PRACTIQ_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
