FROM node:22-alpine
WORKDIR /app

# Install dependencies first (root + plugin workspaces under content/plugins/*)
COPY package*.json ./
COPY content/plugins ./content/plugins
RUN npm ci

# Source, content and config. A client theme must already be cloned into
# content/themes/<name> and selected with `system.theme` in the config
# before building the image (see "Themes" in README.md).
COPY . .

RUN npm run compile && npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
