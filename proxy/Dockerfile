FROM node:22-alpine

WORKDIR /app
COPY index.js .

# Run as node user (uid 1000) - matches Docker secrets ownership
USER node

EXPOSE 3200

CMD ["node", "index.js"]
