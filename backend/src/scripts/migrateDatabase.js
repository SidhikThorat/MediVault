const fs = require('fs');
const path = require('path');
const postgresService = require('../config/postgresql');

class DatabaseMigrator {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../migrations');
    this.migrationsTable = 'database_migrations';
  }

  async init() {
    try {
      // Create migrations table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      await postgresService.query(createTableQuery);
      console.log('✅ Migrations table initialized');
    } catch (error) {
      console.error('❌ Failed to initialize migrations table:', error);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const query = `SELECT filename FROM ${this.migrationsTable} ORDER BY id`;
      const result = await postgresService.query(query);
      return result.rows.map(row => row.filename);
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error);
      throw error;
    }
  }

  async getMigrationFiles() {
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      return files;
    } catch (error) {
      console.error('❌ Failed to read migration files:', error);
      throw error;
    }
  }

  async executeMigration(filename) {
    try {
      const filePath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`🔄 Executing migration: ${filename}`);
      
      // Execute the migration
      await postgresService.query(sql);
      
      // Record the migration
      const recordQuery = `
        INSERT INTO ${this.migrationsTable} (filename) 
        VALUES ($1)
      `;
      
      await postgresService.query(recordQuery, [filename]);
      
      console.log(`✅ Migration executed: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to execute migration ${filename}:`, error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      console.log('🚀 Starting database migrations...');
      
      await this.init();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }
      
      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
      
      for (const filename of pendingMigrations) {
        await this.executeMigration(filename);
      }
      
      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async rollbackMigration(filename) {
    try {
      console.log(`🔄 Rolling back migration: ${filename}`);
      
      // Remove from migrations table
      const deleteQuery = `
        DELETE FROM ${this.migrationsTable} 
        WHERE filename = $1
      `;
      
      await postgresService.query(deleteQuery, [filename]);
      
      console.log(`✅ Migration rolled back: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to rollback migration ${filename}:`, error);
      throw error;
    }
  }

  async getMigrationStatus() {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      const status = migrationFiles.map(filename => ({
        filename,
        executed: executedMigrations.includes(filename)
      }));
      
      return status;
    } catch (error) {
      console.error('❌ Failed to get migration status:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'migrate':
        await migrator.runMigrations();
        break;
        
      case 'status':
        const status = await migrator.getMigrationStatus();
        console.log('📊 Migration Status:');
        status.forEach(migration => {
          const status = migration.executed ? '✅' : '⏳';
          console.log(`${status} ${migration.filename}`);
        });
        break;
        
      case 'rollback':
        const filename = process.argv[3];
        if (!filename) {
          console.error('❌ Please specify migration filename');
          process.exit(1);
        }
        await migrator.rollbackMigration(filename);
        break;
        
      default:
        console.log('Usage: node migrateDatabase.js [migrate|status|rollback]');
        console.log('  migrate  - Run pending migrations');
        console.log('  status   - Show migration status');
        console.log('  rollback - Rollback specific migration');
        break;
    }
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;

