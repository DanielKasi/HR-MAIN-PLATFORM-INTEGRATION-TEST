set -e

# -------------------------------
DB_NAME="hr100"    
VECTOR_DIM=1536        
TABLE_NAME="sql_knowledge1"
# -------------------------------

# echo "Installing build dependencies..."
# sudo apt update
# sudo apt install -y build-essential git

# PG_VERSION=$(psql -V | awk '{print $3}' | cut -d. -f1)

# echo "Detected PostgreSQL version: $PG_VERSION"
# sudo apt install -y "postgresql-server-dev-$PG_VERSION"

# echo "Cloning pgvector repository..."
# git clone https://github.com/pgvector/pgvector.git /tmp/pgvector
# cd /tmp/pgvector

# echo "Building and installing pgvector..."
# make
# sudo make install

echo "Enabling vector extension in database '$DB_NAME'..."
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "Creating PgVector table '$TABLE_NAME'..."
sudo -u postgres psql -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS public.$TABLE_NAME (
    id TEXT PRIMARY KEY,
    name TEXT,
    content TEXT NOT NULL,
    embedding VECTOR($VECTOR_DIM) NOT NULL,
    meta_data JSONB,
    filters JSONB,
    usage JSONB,
    content_hash TEXT
);
"

echo "Creating index for fast similarity search..."
sudo -u postgres psql -d "$DB_NAME" -c "
CREATE INDEX IF NOT EXISTS ${TABLE_NAME}_idx
ON $TABLE_NAME
USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);
"

echo "PgVector setup completed successfully!"
