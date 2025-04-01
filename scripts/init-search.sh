#!/bin/bash

# Maximum number of retries
MAX_RETRIES=30
# Delay between retries in seconds
RETRY_DELAY=2
# Meilisearch connection details
MEILI_HOST=${MEILI_HOST:-"http://localhost:7700"}
MEILI_KEY=${MEILI_MASTER_KEY:-"binventory_meili_local_key"}

# Function to initialize search indices
init_search() {
  local retry_count=0
  local success=false

  echo "Waiting for Meilisearch to be ready at $MEILI_HOST..."
  
  while [ $retry_count -lt $MAX_RETRIES ]; do
    # Check if Meilisearch is responding
    if curl -s -f "$MEILI_HOST/health" > /dev/null; then
      echo "Meilisearch is ready, initializing indices..."
      
      # Create and configure items index
      echo "Creating items index..."
      curl -s -X POST "$MEILI_HOST/indexes" \
        -H "Authorization: Bearer $MEILI_KEY" \
        -H "Content-Type: application/json" \
        -d '{
          "uid": "items",
          "primaryKey": "id"
        }'

      echo "Configuring items index settings..."
      curl -s -X PATCH "$MEILI_HOST/indexes/items/settings" \
        -H "Authorization: Bearer $MEILI_KEY" \
        -H "Content-Type: application/json" \
        -d '{
          "searchableAttributes": [
            "name",
            "description",
            "category.name"
          ],
          "filterableAttributes": [
            "category_id",
            "quantity",
            "unit"
          ],
          "sortableAttributes": [
            "name",
            "created_at",
            "quantity"
          ],
          "rankingRules": [
            "typo",
            "words",
            "proximity",
            "attribute",
            "exactness"
          ]
        }'

      # Create and configure bins index
      echo "Creating bins index..."
      curl -s -X POST "$MEILI_HOST/indexes" \
        -H "Authorization: Bearer $MEILI_KEY" \
        -H "Content-Type: application/json" \
        -d '{
          "uid": "bins",
          "primaryKey": "id"
        }'

      echo "Configuring bins index settings..."
      curl -s -X PATCH "$MEILI_HOST/indexes/bins/settings" \
        -H "Authorization: Bearer $MEILI_KEY" \
        -H "Content-Type: application/json" \
        -d '{
          "searchableAttributes": [
            "label",
            "location",
            "description"
          ],
          "filterableAttributes": [
            "location"
          ]
        }'

      echo "Search indices initialized successfully"
      success=true
      break
    fi
    
    ((retry_count++))
    echo "Attempt $retry_count of $MAX_RETRIES. Retrying in $RETRY_DELAY seconds..."
    sleep $RETRY_DELAY
  done

  if [ "$success" = false ]; then
    echo "Failed to initialize search indices after $MAX_RETRIES attempts"
    exit 1
  fi
}

# Run the initialization
init_search 