FROM node:16-alpine AS builder

RUN mkdir -p /opt/src

ADD package.json package-lock.json index.js /opt/src/

WORKDIR /opt/src

RUN npm install

FROM node:16-alpine AS runner

RUN mkdir -p /opt/app

# No dependencies atm...
# COPY --from=builder /opt/src/node_modules /opt/app/node_modules
COPY --from=builder /opt/src/index.js /opt/app/index.js

WORKDIR /opt/app

CMD ["node", "index.js"]