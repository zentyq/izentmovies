FROM nginx:alpine

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy website files to nginx html root
COPY . /usr/share/nginx/html/
RUN cp /usr/share/nginx/html/env-config.example.js /usr/share/nginx/html/env-config.js || true

# Copy entrypoint script to Nginx auto-init directory
COPY entrypoint.sh /docker-entrypoint.d/40-env-config.sh
RUN chmod +x /docker-entrypoint.d/40-env-config.sh

# Expose HTTP port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
